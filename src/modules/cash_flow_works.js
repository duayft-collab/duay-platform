/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_works.js — v1.0.0 (V190 MUHASEBAT-001)
 * CASH-FLOW-WORKS-MODULE-001 — Çalışma yönetimi + Firestore katmanı
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.Auth.{getCU, getFBDB, getFBAuth, getTenantId}
 *   • window.confirmModal, window.toast, window._auditLog
 *   • cash_flow.js (window.CashFlow) — sadece EDIT 2 sonrası UI tarafında
 *
 * Sorumluluk:
 *   • Firestore CRUD: cashFlowManualWorks/items/<workId>
 *   • Migration: ak_cash_flow1 (eski) → Firestore (data-loss-zero)
 *   • Aktif çalışma: localStorage UX preference (son açılan hatırlama)
 *   • Dirty-state guard (3 seçenekli custom modal — Kaydet/At/Vazgeç)
 *   • Audit log (cf_work_create, _update, _copy, _archive, _unarchive,
 *               cf_row_add, cf_row_delete, cf_migration_v190)
 *
 * Source of truth: Firestore. localStorage YALNIZCA:
 *   • aktif çalışma id (UX preference)
 *   • migration backup (geri dönüş güvencesi, eski veri silinmez)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  // ── 0. SABİTLER ──────────────────────────────────────────────────
  var COLL_WORKS         = 'cashFlowManualWorks';
  var SUB_ITEMS          = 'items';
  var LS_ACTIVE_KEY      = 'ak_cf_active_work_id';
  var LS_LEGACY_KEY      = 'ak_cash_flow1';
  var LS_LEGACY_BACKUP   = 'ak_cash_flow1_backup_v190';
  var LS_MIGRATED_FLAG   = 'ak_cf_migrated_v190';
  var SIZE_SAFETY_BYTES  = 950 * 1024;   // Firestore 1MB - safety margin
  var LIST_LIMIT         = 100;     // V190 için yeterli; V19x'ta pagination/infinite scroll

  /** Banka/Kaynak öneri listesi — KX10 borcu (V19x'da shared/config/banks.js'e taşınacak) */
  var KAYNAK_ONERILER = Object.freeze([
    'Ziraat Bankası', 'VakıfBank', 'Kuveyt Türk', 'İş Bankası',
    'Kasa', 'Wise', 'Western Union', 'Diğer'
  ]);

  // ── 1. HELPER'LAR ─────────────────────────────────────────────────
  function _cfwId(prefix) {
    return (prefix || 'cfw') + '_' + Date.now() + '_' +
           Math.random().toString(36).slice(2, 7);
  }

  function _cfwIso() { return new Date().toISOString(); }

  function _cfwTid() {
    var t = (window.Auth && window.Auth.getTenantId && window.Auth.getTenantId())
            || 'tenant_default';
    return String(t).replace(/[^a-zA-Z0-9_]/g, '_');
  }

  function _cfwBase() { return 'duay_' + _cfwTid(); }

  function _cfwUid() {
    try {
      return (window.Auth && window.Auth.getCU && window.Auth.getCU() &&
              window.Auth.getCU().id) || null;
    } catch (e) { return null; }
  }

  function _cfwFBDB() {
    try {
      return (window.Auth && window.Auth.getFBDB && window.Auth.getFBDB()) || null;
    } catch (e) { return null; }
  }

  function _cfwIsAuthReady() {
    try {
      var fbAuth = window.Auth && window.Auth.getFBAuth && window.Auth.getFBAuth();
      return !!(_cfwFBDB() && fbAuth && fbAuth.currentUser);
    } catch (e) { return false; }
  }

  function _cfwToast(msg, level) {
    if (typeof window.toast === 'function') {
      window.toast(msg, level || 'ok');
    } else {
      console.log('[CF-WORKS]', level || 'ok', msg);
    }
  }

  function _cfwAudit(action, targetId, detail) {
    try {
      if (typeof window._auditLog === 'function') {
        window._auditLog(action, targetId, detail || '');
      }
    } catch (e) { /* audit failure non-fatal */ }
  }

  /** undefined → null (Firestore reject güvencesi, _writeRemote pattern'i ile aynı) */
  function _cfwSanitize(obj) {
    return JSON.parse(JSON.stringify(obj || null, function(k, v) {
      return v === undefined ? null : v;
    }));
  }

  // ── 2. ŞEMA KURUCU + ÖZET HESAPLA ─────────────────────────────────
  function _cfwBuildWork(title, baseCurrency) {
    var now = _cfwIso();
    var uid = _cfwUid();
    return {
      id: _cfwId('cfw'),
      title: String(title || '').trim(),
      description: '',
      status: 'active',
      baseCurrency: baseCurrency || 'TRY',
      rowCount: 0,
      totals: { income: {}, expense: {}, netTRY: 0 },
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
      satirlar: []   // TR alan adı korunuyor — cash_flow.js uyumluluğu (hibrit şema)
    };
  }

  /** Denormalized totals + rowCount — kart listesinde tek read'le özet için */
  function _cfwComputeTotals(work) {
    var rows = (work && work.satirlar) || [];
    var income = {}, expense = {}, netTRY = 0;
    // TODO[KX10]: Hardcoded fallback — geçici. V19x'ta window._saKur veya
    // shared/config/rates.js merkezi kaynağına bağlanacak. Bu değerler
    // SADECE satırın kurSnapshot'u eksikse devreye girer.
    var FALLBACK = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };
    rows.forEach(function(s) {
      var cur = s.paraBirimi || 'TRY';
      var amt = Number(s.tutar) || 0;
      if (s.kategori === 'gelir') {
        income[cur] = (income[cur] || 0) + amt;
      } else if (s.kategori === 'gider') {
        expense[cur] = (expense[cur] || 0) + amt;
      }
      if (s.kategori !== 'transfer') {
        var rates = (s.kurSnapshot && s.kurSnapshot[cur]) ? s.kurSnapshot : FALLBACK;
        var tryEq = amt * (rates[cur] || 1);
        netTRY += (s.kategori === 'gelir' ? tryEq : -tryEq);
      }
    });
    return {
      rowCount: rows.length,
      totals: { income: income, expense: expense, netTRY: netTRY }
    };
  }

  // ── 3. FIRESTORE PATH HELPER ──────────────────────────────────────
  function _cfwWorksRef() {
    var FB_DB = _cfwFBDB();
    if (!FB_DB) return null;
    return FB_DB.collection(_cfwBase()).doc(COLL_WORKS).collection(SUB_ITEMS);
  }

  // ── 4. CRUD ───────────────────────────────────────────────────────
  async function saveWork(work) {
    if (!work || !work.id) {
      return { ok: false, error: 'invalid_work' };
    }
    if (!String(work.title || '').trim()) {
      _cfwToast('Çalışma adı zorunludur.', 'warn');
      return { ok: false, error: 'title_required' };
    }
    if (!_cfwIsAuthReady()) {
      _cfwToast('Bağlantı hazır değil. Birkaç saniye sonra tekrar dene.', 'err');
      return { ok: false, error: 'auth_not_ready' };
    }
    var ref = _cfwWorksRef();
    if (!ref) return { ok: false, error: 'fb_not_ready' };

    var clean = _cfwSanitize(work);
    delete clean._fsKnown;   // istemci-tarafı bayrak, Firestore'a yazılmaz

    // Denormalized özet — kart listesi için
    var info = _cfwComputeTotals(clean);
    clean.rowCount = info.rowCount;
    clean.totals = info.totals;
    clean.updatedAt = _cfwIso();
    clean.updatedBy = _cfwUid();

    // 1MB pre-check.
    // NOT: JSON.stringify().length char sayısıdır, gerçek UTF-8 byte size
    // değil. Türkçe karakterler 2 byte → fiili byte ~1.0–1.3× length.
    // SIZE_SAFETY_BYTES 950KB → Firestore 1MB sınırına ~50KB güvenlik payı.
    var size = 0;
    try { size = JSON.stringify(clean).length; } catch (_) {}
    if (size > SIZE_SAFETY_BYTES) {
      _cfwToast('Çalışma çok büyük (' + Math.round(size / 1024) +
                ' KB). Eski satırları arşivlemeyi düşün.', 'err');
      return { ok: false, error: 'size_exceeded', size: size };
    }

    try {
      await ref.doc(clean.id).set(clean, { merge: true });
      var isNew = !work._fsKnown;
      _cfwAudit(isNew ? 'cf_work_create' : 'cf_work_update', clean.id,
                'title=' + clean.title + ' rows=' + clean.rowCount);
      clearDirty();
      return { ok: true, work: clean };
    } catch (e) {
      console.error('[CF-WORKS] saveWork error:', e);
      _cfwToast('Kayıt başarısız: ' + (e && e.message ? e.message : 'bilinmeyen hata'),
                'err');
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  async function loadWork(workId) {
    if (!workId) return null;
    if (!_cfwIsAuthReady()) return null;
    var ref = _cfwWorksRef();
    if (!ref) return null;
    try {
      var snap = await ref.doc(workId).get();
      if (!snap || !snap.exists) return null;
      var w = snap.data();
      w._fsKnown = true;
      return w;
    } catch (e) {
      console.warn('[CF-WORKS] loadWork error:', e && e.message);
      return null;
    }
  }

  async function listWorks(status) {
    if (!_cfwIsAuthReady()) return [];
    var ref = _cfwWorksRef();
    if (!ref) return [];
    var st = status === 'archived' ? 'archived' : 'active';
    try {
      var qs = await ref.where('status', '==', st)
                        .orderBy('updatedAt', 'desc')
                        .limit(LIST_LIMIT)
                        .get();
      var out = [];
      qs.forEach(function(d) {
        var w = d.data();
        w._fsKnown = true;
        out.push(w);
      });
      return out;
    } catch (e) {
      // Composite index gerekiyor olabilir — fallback: where olmadan oku, client-side filtrele
      console.warn('[CF-WORKS] listWorks index/query error:', e && e.message);
      try {
        var all = await ref.orderBy('updatedAt', 'desc').limit(LIST_LIMIT).get();
        var out2 = [];
        all.forEach(function(d) {
          var w = d.data();
          if (w && w.status === st) {
            w._fsKnown = true;
            out2.push(w);
          }
        });
        return out2;
      } catch (e2) {
        console.error('[CF-WORKS] listWorks fallback fail:', e2 && e2.message);
        return [];
      }
    }
  }

  async function copyWork(workId, newTitle) {
    var src = await loadWork(workId);
    if (!src) {
      _cfwToast('Kopyalanacak çalışma bulunamadı.', 'err');
      return { ok: false, error: 'not_found' };
    }
    var now = _cfwIso();
    var copy = _cfwSanitize(src);
    delete copy._fsKnown;
    copy.id = _cfwId('cfw');
    copy.title = String(newTitle || (src.title + ' (kopya)')).trim();
    copy.status = 'active';
    copy.createdAt = now;
    copy.updatedAt = now;
    copy.createdBy = _cfwUid();
    copy.updatedBy = _cfwUid();
    copy.satirlar = (copy.satirlar || []).map(function(s) {
      return Object.assign({}, s, { id: _cfwId('cfr'), createdAt: now, updatedAt: now });
    });
    var res = await saveWork(copy);
    if (res.ok) {
      _cfwAudit('cf_work_copy', copy.id, 'sourceWorkId=' + workId);
      _cfwToast('Kopyalandı: ' + copy.title, 'ok');
    }
    return res;
  }

  async function archiveWork(workId) {
    var w = await loadWork(workId);
    if (!w) return { ok: false, error: 'not_found' };
    var ref = _cfwWorksRef();
    if (!ref) return { ok: false, error: 'fb_not_ready' };
    var patch = { status: 'archived', updatedAt: _cfwIso(), updatedBy: _cfwUid() };
    try {
      await ref.doc(workId).set(_cfwSanitize(patch), { merge: true });
      _cfwAudit('cf_work_archive', workId, 'title=' + (w.title || ''));
      _cfwToast('Arşivlendi.', 'ok');
      return { ok: true };
    } catch (e) {
      _cfwToast('Arşivleme başarısız: ' + (e && e.message ? e.message : ''), 'err');
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  async function unarchiveWork(workId) {
    var w = await loadWork(workId);
    if (!w) return { ok: false, error: 'not_found' };
    var ref = _cfwWorksRef();
    if (!ref) return { ok: false, error: 'fb_not_ready' };
    var patch = { status: 'active', updatedAt: _cfwIso(), updatedBy: _cfwUid() };
    try {
      await ref.doc(workId).set(_cfwSanitize(patch), { merge: true });
      _cfwAudit('cf_work_unarchive', workId, 'title=' + (w.title || ''));
      _cfwToast('Aktife alındı.', 'ok');
      return { ok: true };
    } catch (e) {
      _cfwToast('Geri alma başarısız: ' + (e && e.message ? e.message : ''), 'err');
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  async function renameWork(workId, newTitle) {
    var t = String(newTitle || '').trim();
    if (!t) {
      _cfwToast('Çalışma adı zorunludur.', 'warn');
      return { ok: false, error: 'title_required' };
    }
    var ref = _cfwWorksRef();
    if (!ref) return { ok: false, error: 'fb_not_ready' };
    var patch = { title: t, updatedAt: _cfwIso(), updatedBy: _cfwUid() };
    try {
      await ref.doc(workId).set(_cfwSanitize(patch), { merge: true });
      _cfwAudit('cf_work_update', workId, 'rename=' + t);
      _cfwToast('Adı güncellendi.', 'ok');
      return { ok: true };
    } catch (e) {
      _cfwToast('Adı güncellenemedi: ' + (e && e.message ? e.message : ''), 'err');
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  // ── 5. AKTİF ÇALIŞMA (son açılan hatırlama) ───────────────────────
  function getActiveWorkId() {
    try { return localStorage.getItem(LS_ACTIVE_KEY) || null; }
    catch (_) { return null; }
  }

  function setActiveWorkId(id) {
    try {
      if (id) localStorage.setItem(LS_ACTIVE_KEY, String(id));
      else localStorage.removeItem(LS_ACTIVE_KEY);
    } catch (_) {}
  }

  async function getActiveWork() {
    var id = getActiveWorkId();
    if (!id) return null;
    return await loadWork(id);
  }

  // ── 6. DIRTY-STATE GUARD ──────────────────────────────────────────
  var _cfwDirty = false;

  function markDirty()  { _cfwDirty = true; }
  function clearDirty() { _cfwDirty = false; }
  function isDirty()    { return _cfwDirty; }

  /**
   * 3 seçenekli custom modal: Kaydet / Atla / Vazgeç.
   * confirmModal 2-button mantığı kullanılarak 2 aşamada zincirlenir.
   * Native confirm() ASLA kullanılmaz (Belge 3 §6).
   */
  function confirmIfDirty(onSave, onSkip, onCancel) {
    if (!_cfwDirty) { onSkip && onSkip(); return; }
    var modalFn = window.confirmModal;
    if (typeof modalFn !== 'function') {
      // Modal yüklenemedi. Muhasebe modülünde otomatik karar vermek riskli —
      // kullanıcıyı bilgilendirip işlemi iptal ediyoruz.
      _cfwToast('Onay penceresi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      onCancel && onCancel();
      return;
    }
    modalFn('Kaydedilmemiş değişiklik var. Önce mevcut çalışmayı kaydedeyim mi?', {
      title: 'Kaydet?',
      danger: false,
      confirmText: 'Evet, kaydet ve devam et',
      cancelText: 'Hayır',
      onConfirm: function() { onSave && onSave(); },
      onCancel: function() {
        modalFn('Kaydetmeden devam edilsin mi? Yapılan değişiklikler kaybolur.', {
          title: 'Emin misin?',
          danger: true,
          confirmText: 'Evet, devam et',
          cancelText: 'Vazgeç',
          onConfirm: function() { onSkip && onSkip(); },
          onCancel:  function() { onCancel && onCancel(); }
        });
      }
    });
  }

  // ── 7. MIGRATION (Data Migration Safety — veri kaybı sıfır) ──────
  /**
   * ak_cash_flow1 (eski tek-cihaz yapı) → Firestore cashFlowManualWorks.
   * Kurallar:
   *   • Eski localStorage key'ine DOKUNULMAZ (silinmez, üzerine yazılmaz).
   *   • İlk migration'da eski raw veri ak_cash_flow1_backup_v190'a kopyalanır.
   *   • Bayrak ak_cf_migrated_v190 set edilmezse bir sonraki açılışta retry.
   *   • Idempotent: bayrak '1' ise atlanır.
   *   • Auth hazır değilse retry için bayrak set edilmez.
   */
  async function _cfwMigrateIfNeeded() {
    var migrated;
    try { migrated = localStorage.getItem(LS_MIGRATED_FLAG); } catch (_) {}
    if (migrated === '1') return { ok: true, skipped: true, reason: 'already_migrated' };

    var raw;
    try { raw = localStorage.getItem(LS_LEGACY_KEY); } catch (_) {}
    if (!raw) {
      try { localStorage.setItem(LS_MIGRATED_FLAG, '1'); } catch (_) {}
      return { ok: true, skipped: true, reason: 'no_legacy_data' };
    }

    var legacy;
    try { legacy = JSON.parse(raw); } catch (_) { legacy = null; }
    if (!legacy || !Array.isArray(legacy.tablolar) || legacy.tablolar.length === 0) {
      try { localStorage.setItem(LS_MIGRATED_FLAG, '1'); } catch (_) {}
      return { ok: true, skipped: true, reason: 'empty_legacy' };
    }

    if (!_cfwIsAuthReady()) {
      // Bayrak set ETME — bir sonraki çağrıda retry
      return { ok: false, error: 'auth_not_ready', willRetry: true };
    }

    // Eski veriyi backup'a kopyala (üzerine yazma — ilk başarılı migration korunur)
    try {
      var existingBackup = localStorage.getItem(LS_LEGACY_BACKUP);
      if (!existingBackup) localStorage.setItem(LS_LEGACY_BACKUP, raw);
    } catch (_) {}

    var ref = _cfwWorksRef();
    if (!ref) return { ok: false, error: 'fb_not_ready', willRetry: true };

    var migratedCount = 0;
    var failed = [];

    for (var i = 0; i < legacy.tablolar.length; i++) {
      var t = legacy.tablolar[i];
      var work = _cfwBuildWork(t.ad || ('Çalışma ' + (i + 1)), t.paraBirimiBaz || 'TRY');
      if (t.id) work.id = t.id;   // referans bütünlüğü
      if (t.olusturulduTarih) work.createdAt = t.olusturulduTarih;
      if (t.guncellemeTarih)  work.updatedAt = t.guncellemeTarih;
      // Satırlar TR alanlarıyla aynen taşınır; sadece kaynak alanı boş eklenir
      work.satirlar = (t.satirlar || []).map(function(s) {
        return Object.assign({ kaynak: '' }, s);
      });
      var info = _cfwComputeTotals(work);
      work.rowCount = info.rowCount;
      work.totals = info.totals;

      try {
        await ref.doc(work.id).set(_cfwSanitize(work), { merge: true });
        migratedCount++;
        if (legacy.aktifTabloId === t.id) setActiveWorkId(work.id);
      } catch (e) {
        failed.push({ id: t.id, ad: t.ad, error: (e && e.message) || 'unknown' });
        console.error('[CF-WORKS] migrate fail:', t.ad, e);
      }
    }

    if (failed.length === 0) {
      try { localStorage.setItem(LS_MIGRATED_FLAG, '1'); } catch (_) {}
      _cfwAudit('cf_migration_v190', 'all', 'works=' + migratedCount);
      _cfwToast(migratedCount + ' çalışma güvenle aktarıldı. ' +
                'Eski veri yedek olarak korunuyor.', 'ok');
      return { ok: true, count: migratedCount };
    }

    // Kısmi başarısızlık — bayrak set edilmez, retry mümkün
    _cfwToast('Aktarım kısmen başarısız (' + failed.length + ' çalışma). ' +
              'Eski veri korunuyor; tekrar denenebilir.', 'err');
    return { ok: false, partial: true, count: migratedCount, failed: failed };
  }

  async function retryMigration() {
    return await _cfwMigrateIfNeeded();
  }

  // ── 8. PUBLIC API ─────────────────────────────────────────────────
  window.CashFlowWorks = {
    // CRUD
    saveWork:        saveWork,
    loadWork:        loadWork,
    listWorks:       listWorks,
    copyWork:        copyWork,
    archiveWork:     archiveWork,
    unarchiveWork:   unarchiveWork,
    renameWork:      renameWork,
    // Aktif çalışma
    getActiveWorkId: getActiveWorkId,
    setActiveWorkId: setActiveWorkId,
    getActiveWork:   getActiveWork,
    // Dirty-state
    markDirty:       markDirty,
    clearDirty:      clearDirty,
    isDirty:         isDirty,
    confirmIfDirty:  confirmIfDirty,
    // Util
    buildWork:       _cfwBuildWork,
    computeTotals:   _cfwComputeTotals,
    KAYNAK_ONERILER: KAYNAK_ONERILER,
    // Migration
    migrate:         _cfwMigrateIfNeeded,
    retryMigration:  retryMigration
  };

  // ── 9. INIT (Auth-ready bekleyerek migration tetikle) ─────────────
  /**
   * Exponential backoff: 1s, 2s, 4s, 8s, 16s — toplam ~31sn, 5 deneme.
   * Auth hala hazır değilse sessizce vazgeçilir; kullanıcı muhasebe
   * modülüne girdiğinde manuel retry (CashFlowWorks.retryMigration)
   * tetiklenir. setInterval yerine setTimeout zinciri — sonsuz retry hissi yok.
   */
  function _cfwInit() {
    var attempts = 0;
    var MAX_ATTEMPTS = 5;
    var BASE_DELAY = 1000;
    function tryOnce() {
      if (_cfwIsAuthReady()) {
        _cfwMigrateIfNeeded().catch(function(e) {
          console.error('[CF-WORKS] init migration uncaught:', e);
        });
        return;
      }
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        console.warn('[CF-WORKS] auth-ready timeout — migration ertelendi');
        return;
      }
      setTimeout(tryOnce, BASE_DELAY * Math.pow(2, attempts - 1));
    }
    tryOnce();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _cfwInit);
  } else {
    setTimeout(_cfwInit, 500);
  }

})();
