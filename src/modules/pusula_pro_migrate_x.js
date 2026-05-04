/**
 * PUSULA-PRO-MIGRATE-001 (V169)
 *
 * Eski format gorevleri yeni format'a migrate eder (idempotent).
 *
 * PROBLEM: PusulaPro'nun onceki surumunden kalma 29 gorev eski field yapisinda:
 *   title / desc / due / pri / done / isDeleted (eski)
 *   vs
 *   baslik / aciklama / bitTarih / oncelik / durum / silindi (yeni)
 * UI yeni format ariyor → eski gorevler "bos baslik" gorunup filtreleniyor.
 *
 * COZUM: _ppLoad sonrasi gorevleri tara, eski formatta olanlara yeni field'lari ekle.
 *   - Eski field'lar SILINMEZ (geri donus icin)
 *   - Yeni format gorevlere DOKUNULMAZ (baslik varsa atla)
 *   - Idempotent: tekrar calistir → degisiklik yok
 *   - Migrate edilen ID'ler console.log
 *
 * V169.1 KURALLARI (kullanici onay):
 *   - Gorev silme yok
 *   - Mevcut yeni format gorevlere dokunma yok
 *   - Sadece eksik yeni field'lari doldur
 *   - Eski field'lari simdilik silme
 *   - Migration idempotent
 *   - Migrate edilen ID'ler loglanacak
 *
 * KX9: pusula_pro.js DOKUNULMAZ
 * V167+V168 ile catismaz: V169 V168'den sonra calisir, _ppStore tetikler.
 */
(function () {
  'use strict';
  if (window._v169Applied) return;
  window._v169Applied = true;

  /* ============= CONFIG ============= */
  var PRI_MAP = { 1: 'kritik', 2: 'yuksek', 3: 'normal', 4: 'dusuk' };

  /* ============= ESKI FORMAT TESPIT ============= */
  function _isOldFormat(t) {
    if (!t || typeof t !== 'object') return false;
    if (t.baslik !== undefined && t.baslik !== '') return false;
    return (
      t.title !== undefined ||
      t.desc !== undefined ||
      t.due !== undefined ||
      t.pri !== undefined ||
      t.done !== undefined ||
      t.isDeleted !== undefined
    );
  }

  /* ============= TEK GOREV MIGRATE ============= */
  function _migrateOne(t) {
    var changed = false;

    if (t.title !== undefined && (t.baslik === undefined || t.baslik === '')) {
      t.baslik = t.title;
      changed = true;
    }
    if (t.desc !== undefined && (t.aciklama === undefined || t.aciklama === '')) {
      t.aciklama = t.desc;
      changed = true;
    }
    if (t.due !== undefined && (t.bitTarih === undefined || t.bitTarih === '')) {
      t.bitTarih = t.due;
      changed = true;
    }
    if (t.pri !== undefined && (t.oncelik === undefined || t.oncelik === '')) {
      t.oncelik = PRI_MAP[t.pri] || 'normal';
      changed = true;
    }
    if (t.done !== undefined && (t.durum === undefined || t.durum === '')) {
      t.durum = (t.done === true || t.done === 1) ? 'tamamlandi' : 'plan';
      changed = true;
    }
    if (t.isDeleted !== undefined && t.silindi === undefined) {
      t.silindi = (t.isDeleted === true || t.isDeleted === 1);
      changed = true;
    }

    return changed;
  }

  /* ============= TUM TASK'LARI MIGRATE ============= */
  function _migrateAll(tasks) {
    if (!Array.isArray(tasks)) return { migrated: 0, ids: [] };
    var migratedIds = [];
    var aktifIds = [];

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (!_isOldFormat(t)) continue;
      var changed = _migrateOne(t);
      if (changed) {
        migratedIds.push(t.id);
        if (!(t.silindi === true || t.silindi === 1)) {
          aktifIds.push({ id: t.id, baslik: t.baslik, oncelik: t.oncelik });
        }
      }
    }

    return { migrated: migratedIds.length, ids: migratedIds, aktif: aktifIds };
  }

  /* ============= UI RE-RENDER HOOK ============= */
  function _triggerRender() {
    if (typeof window._ppRender === 'function') {
      try { window._ppRender(); console.log('[V169] _ppRender tetiklendi'); return; } catch (e) {}
    }
    if (typeof window.renderPusulaPro === 'function') {
      try { window.renderPusulaPro(); console.log('[V169] renderPusulaPro tetiklendi'); return; } catch (e) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('v169:migrated', { detail: { restored: true } }));
    } catch (e) {}
  }

  /* ============= APPLY ============= */
  function _apply() {
    if (typeof window._ppLoad !== 'function') {
      console.warn('[V169] _ppLoad yok — migration atlandi');
      return true;
    }
    if (typeof window._ppStore !== 'function') {
      console.warn('[V169] _ppStore yok — migration atlandi');
      return true;
    }

    var tasks = window._ppLoad();
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return false;
    }

    var result = _migrateAll(tasks);

    if (result.migrated === 0) {
      console.log('[V169] Migration gerekli gorev yok (idempotent) — toplam ' + tasks.length + ' gorev');
      window._v169Status = {
        applied: true,
        totalTasks: tasks.length,
        migrated: 0,
        idempotent: true
      };
      return true;
    }

    console.log('[V169] ' + result.migrated + ' gorev migrate edildi (toplam ' + tasks.length + '). IDs:', result.ids);
    if (result.aktif.length > 0) {
      console.log('[V169] AKTIF migrate edilenler (UI\'da gorunur olacak):', result.aktif);
    }

    try {
      window._ppStore(tasks);
      console.log('[V169] _ppStore cagrildi — localStorage + Firestore senkronize edildi');
    } catch (e) {
      console.error('[V169] _ppStore hata:', e.message || e);
      window._v169Status = { applied: false, error: e.message };
      return true;
    }

    _triggerRender();

    window._v169Status = {
      applied: true,
      totalTasks: tasks.length,
      migrated: result.migrated,
      migratedIds: result.ids,
      aktifMigrated: result.aktif,
      idempotent: false
    };
    return true;
  }

  /* ============= RETRY MEKANIZMASI =============
   * V168 1500ms+ sonra Firestore'dan veri ceker. V169 bunu beklemeli.
   * 5x1500ms retry, _ppLoad veri donduruyorsa apply, yoksa tekrar dene.
   */
  function _retryApply(maxAttempts, intervalMs) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var done = _apply();
      if (done || attempts >= maxAttempts) {
        clearInterval(iv);
        if (!done) {
          console.warn('[V169] ' + attempts + ' deneme sonra _ppLoad hala bos — migration ertelenebilir');
          window._v169Status = { applied: false, retried: attempts, reason: 'no_tasks' };
        }
      }
    }, intervalMs);
  }

  /* ============= KICK OFF =============
   * V168 _apply 1000ms + V168 restore 100ms + FS get ~500-1500ms = ~2.5-3 sn
   * V169 3000ms sonra baslar, 5 deneme ile 7.5 sn'ye kadar bekler
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { _retryApply(5, 1500); }, 3000);
    });
  } else {
    setTimeout(function () { _retryApply(5, 1500); }, 3000);
  }
})();
