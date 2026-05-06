/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_works_ui.js — v1.0.0 (V193 MUHASEBAT-001)
 * CASH-FLOW-WORKS-UI-MODULE-001 — Çalışma yönetimi UI katmanı
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.CashFlowWorks (cash_flow_works.js — V193 EDIT 1)
 *   • window.CashFlow (cash_flow.js — V193 EDIT 2 sonrası)
 *   • window.confirmModal, window.toast
 *
 * Sorumluluk:
 *   • Toolbar: "+ Yeni" + "Kayıtlı Çalışmalar" butonları + aktif çalışma adı + dirty *
 *   • Kayıtlı Çalışmalar modal: Aktif/Arşiv tab + kart listesi
 *   • Kart aksiyonları: Aç (primary) + Yeniden adlandır · Kopyala · Arşivle/Aktife al
 *   • Mini input modal: Yeni Çalışma + Yeniden Adlandır
 *   • Dirty-state guard entegrasyonu (CashFlowWorks.confirmIfDirty zincirleme)
 *
 * UI ilkesi: Apple sade, ekstra border/shadow yok, mobilde taşma yok
 * (max-width 92vw, max-height 90vh, scroll iç tarafta).
 *
 * Inline onclick: 0 (saf event delegation, data-cfu-action attribute).
 * Memory leak: modal her açılışta DOM'dan eski instance kaldırılır + listener
 *   modal kapanışında temizlenir (modal mo.remove() — closure scope GC'ye gider).
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  // ── 0. SABİTLER ──────────────────────────────────────────────────
  var TOOLBAR_ID    = 'cf-toolbar';
  var WORKS_MODAL   = 'cfu-works-modal';
  var INPUT_MODAL   = 'cfu-input-modal';

  // ── 1. HELPER'LAR ─────────────────────────────────────────────────
  function _cfuEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _cfuFmt(n) {
    var v = Number(n) || 0;
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _cfuFmtDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) { return '—'; }
  }

  function _cfuToast(msg, level) {
    if (typeof window.toast === 'function') window.toast(msg, level || 'ok');
  }

  /** CashFlowWorks API hazır mı? Hazır değilse fail-safe — UI çağrılırsa toast döner. */
  function _cfuApiReady() {
    return !!(window.CashFlowWorks && typeof window.CashFlowWorks.listWorks === 'function');
  }

  function _cfuRequireApi() {
    if (_cfuApiReady()) return true;
    _cfuToast('Çalışma yönetimi modülü hazır değil. Sayfayı yenileyip tekrar dene.', 'err');
    return false;
  }

  /** Aktif çalışma değiştikten sonra cash_flow.js paneli yenile. */
  function _cfuRerender() {
    try {
      if (typeof window._cfRenderPanel === 'function') window._cfRenderPanel();
    } catch (e) {
      console.warn('[CFU] rerender error:', e && e.message);
    }
  }

  // ── 2. TOOLBAR ────────────────────────────────────────────────────
  /**
   * cash_flow.js _cfRenderPanel'in çağırdığı entry point.
   * Selector "#cf-toolbar" (default) — placeholder div'i içine toolbar HTML enjekte eder.
   * UI sade: aktif çalışma adı + dirty * + 2 buton (sağda).
   */
  function renderToolbar(selector) {
    var sel = selector || ('#' + TOOLBAR_ID);
    var el = document.querySelector(sel);
    if (!el) return;

    var ready = _cfuApiReady();
    var w = ready && typeof window.CashFlowWorks.getActiveWorkId === 'function'
              ? window.CashFlowWorks.getActiveWorkId() : null;
    var dirty = ready && typeof window.CashFlowWorks.isDirty === 'function'
                  && window.CashFlowWorks.isDirty();

    /* Aktif çalışma başlığı: cash_flow.js _cfLoad eski LS'i okur, ad oradan gelir.
     * V193'te Firestore çalışma sistemine geçiş kademeli — bu cycle'da görsel adı
     * cash_flow.js workTitle bloğu zaten gösteriyor. Toolbar'da SADECE buton var. */
    el.innerHTML = '<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">'
      + (dirty ? '<span style="color:#E0574F;font-size:12px;margin-right:4px" title="Kaydedilmemiş değişiklik">●</span>' : '')
      + '<button data-cfu-action="open-works" style="padding:7px 14px;background:transparent;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444;font-family:inherit">Kayıtlı Çalışmalar</button>'
      + '<button data-cfu-action="new-work" style="padding:7px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500;font-family:inherit">+ Yeni</button>'
      + '</div>';

    /* Toolbar'ın kendi click delegasyonu — sadece bir kere bind, panel her render'da
     * el.innerHTML rewrite edildiği için eski listener GC'ye gider; ama
     * yeni instance yaratıldığı için her seferinde yeniden bağlanır. Idempotent. */
    el.removeEventListener('click', _cfuToolbarClick);
    el.addEventListener('click', _cfuToolbarClick);
  }

  function _cfuToolbarClick(e) {
    var btn = e.target.closest('[data-cfu-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-cfu-action');
    if (action === 'open-works') openWorksModal();
    else if (action === 'new-work') openInputModal('new');
  }

  // ── 3. KAYITLI ÇALIŞMALAR MODAL ───────────────────────────────────
  var _cfuWorksTab = 'active';   // modal-içi tab state

  async function openWorksModal() {
    if (!_cfuRequireApi()) return;
    _removeIfExists(WORKS_MODAL);
    var mo = document.createElement('div');
    mo.id = WORKS_MODAL;
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    /* Outside click → close (cleanup tetikler — listener kalmaz) */
    mo.addEventListener('click', function(e) { if (e.target === mo) closeWorksModal(); });

    mo.innerHTML = '<div data-cfu-stop="1" style="background:#fff;color:#222;width:680px;max-width:92vw;max-height:90vh;display:flex;flex-direction:column;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="padding:16px 20px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-size:14px;font-weight:600;color:#222">Kayıtlı Çalışmalar</div>'
        + '<button data-cfu-action="close-works" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:#bbb;padding:0;line-height:1;font-family:inherit">✕</button>'
      + '</div>'
      + '<div style="padding:0 20px;display:flex;gap:18px;border-bottom:0.5px solid #eee">'
        + _renderTabBtn('active', 'Aktif')
        + _renderTabBtn('archived', 'Arşiv')
      + '</div>'
      + '<div id="cfu-works-list" style="padding:18px 20px;overflow-y:auto;flex:1;background:#fafafa">'
        + '<div style="text-align:center;color:#888;font-size:13px;padding:40px">Yükleniyor…</div>'
      + '</div>'
    + '</div>';
    document.body.appendChild(mo);

    /* Modal içi click delegation — TEK listener; modal mo.remove() ile birlikte gider. */
    mo.addEventListener('click', _cfuWorksModalClick);

    await _cfuWorksLoadAndRender();
  }

  function _renderTabBtn(tab, label) {
    var active = (_cfuWorksTab === tab);
    var border = active ? '2px solid #1A8D6F' : '2px solid transparent';
    var color  = active ? '#1A8D6F' : '#888';
    var weight = active ? '600' : '400';
    return '<button data-cfu-action="switch-tab" data-cfu-tab="' + tab
      + '" style="padding:10px 0;background:transparent;border:none;border-bottom:' + border
      + ';cursor:pointer;font-size:13px;color:' + color + ';font-weight:' + weight
      + ';font-family:inherit">' + label + '</button>';
  }

  async function _cfuWorksLoadAndRender() {
    var listEl = document.getElementById('cfu-works-list');
    if (!listEl) return;
    var works;
    try {
      works = await window.CashFlowWorks.listWorks(_cfuWorksTab);
    } catch (e) {
      listEl.innerHTML = '<div style="text-align:center;color:#E0574F;font-size:13px;padding:40px">Yüklenemedi: '
        + _cfuEsc((e && e.message) || 'bilinmeyen hata') + '</div>';
      return;
    }

    if (!works || works.length === 0) {
      var msg = _cfuWorksTab === 'archived' ? 'Arşivde çalışma yok.' : 'Henüz çalışma yok.';
      listEl.innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:40px">' + msg + '</div>';
      return;
    }

    var activeId = window.CashFlowWorks.getActiveWorkId();
    var cards = works.map(function(w) { return _renderCard(w, activeId === w.id); }).join('');
    listEl.innerHTML = '<div style="display:grid;grid-template-columns:1fr;gap:10px">' + cards + '</div>';
  }

  function _renderCard(w, isActive) {
    var income = (w.totals && w.totals.income) || {};
    var expense = (w.totals && w.totals.expense) || {};
    var rowCount = w.rowCount || 0;
    var net = (w.totals && w.totals.netTRY) || 0;
    var netRenk = net > 0 ? '#1A8D6F' : (net < 0 ? '#E0574F' : '#666');

    /* En yüksek hacimli para birimini göster — sade özet (kullanıcı tüm para birimlerini
     * yığmak yerine kart'ta tek satıra anlamlı bilgi). */
    var paraOzet = _renderParaOzet(income, expense);

    var ringStyle = isActive ? 'border:1px solid #1A8D6F;background:#F5FBF8' : 'border:0.5px solid #e8e8e8;background:#fff';
    var activeBadge = isActive ? '<span style="display:inline-block;padding:1px 7px;background:#1A8D6F;color:#fff;border-radius:8px;font-size:10px;font-weight:500;margin-left:6px;vertical-align:middle">aktif</span>' : '';

    var aksiyonAlt = _cfuWorksTab === 'archived'
      ? '<button data-cfu-action="unarchive" data-cfu-id="' + _cfuEsc(w.id) + '" style="background:transparent;border:none;cursor:pointer;font-size:11px;color:#666;padding:4px 0;font-family:inherit">Aktife al</button>'
      : '<button data-cfu-action="rename" data-cfu-id="' + _cfuEsc(w.id) + '" style="background:transparent;border:none;cursor:pointer;font-size:11px;color:#666;padding:4px 0;font-family:inherit">Yeniden adlandır</button>'
        + ' · <button data-cfu-action="copy" data-cfu-id="' + _cfuEsc(w.id) + '" style="background:transparent;border:none;cursor:pointer;font-size:11px;color:#666;padding:4px 0;font-family:inherit">Kopyala</button>'
        + ' · <button data-cfu-action="archive" data-cfu-id="' + _cfuEsc(w.id) + '" style="background:transparent;border:none;cursor:pointer;font-size:11px;color:#666;padding:4px 0;font-family:inherit">Arşivle</button>';

    return '<div style="' + ringStyle + ';border-radius:10px;padding:14px 16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">'
        + '<div style="min-width:0;flex:1">'
          + '<div style="font-size:14px;font-weight:600;color:#222">' + _cfuEsc(w.title || 'Adsız') + activeBadge + '</div>'
          + '<div style="font-size:11px;color:#888;margin-top:2px">Güncelleme: ' + _cfuFmtDate(w.updatedAt) + ' · ' + rowCount + ' satır</div>'
        + '</div>'
        + '<div style="text-align:right;flex-shrink:0">'
          + '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Net (TRY)</div>'
          + '<div style="font-size:15px;font-weight:600;color:' + netRenk + ';font-variant-numeric:tabular-nums">' + _cfuFmt(net) + '</div>'
        + '</div>'
      + '</div>'
      + (paraOzet ? '<div style="margin-top:8px;font-size:11px;color:#666">' + paraOzet + '</div>' : '')
      + '<div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
        + '<div style="font-size:11px;color:#888">' + aksiyonAlt + '</div>'
        + (isActive
            ? '<span style="font-size:11px;color:#1A8D6F;font-weight:500">— Şu an açık</span>'
            : '<button data-cfu-action="open" data-cfu-id="' + _cfuEsc(w.id) + '" style="padding:6px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500;font-family:inherit">Aç</button>')
      + '</div>'
    + '</div>';
  }

  function _renderParaOzet(income, expense) {
    var parts = [];
    var cur, gel, gid;
    var allKeys = {};
    Object.keys(income || {}).forEach(function(k) { allKeys[k] = true; });
    Object.keys(expense || {}).forEach(function(k) { allKeys[k] = true; });
    Object.keys(allKeys).forEach(function(c) {
      gel = income[c] || 0;
      gid = expense[c] || 0;
      if (gel === 0 && gid === 0) return;
      parts.push(_cfuEsc(c) + ': +' + _cfuFmt(gel) + ' / −' + _cfuFmt(gid));
    });
    return parts.join('  ·  ');
  }

  function closeWorksModal() {
    _removeIfExists(WORKS_MODAL);
  }

  function _cfuWorksModalClick(e) {
    var btn = e.target.closest('[data-cfu-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-cfu-action');
    var id = btn.getAttribute('data-cfu-id');

    if (action === 'close-works')   return closeWorksModal();
    if (action === 'switch-tab') {
      var tab = btn.getAttribute('data-cfu-tab');
      if (tab && tab !== _cfuWorksTab) {
        _cfuWorksTab = tab;
        var modal = document.getElementById(WORKS_MODAL);
        if (!modal) return;
        // Re-render tab strip + list
        var tabStrip = modal.querySelector('div[style*="border-bottom"]');
        // Daha güvenli yeniden çağırma — modal'i kapat-aç yerine sadece içeriği güncelle
        _refreshTabsAndList();
      }
      return;
    }
    if (action === 'open')       return _handleOpen(id);
    if (action === 'rename')     return openInputModal('rename', id);
    if (action === 'copy')       return _handleCopy(id);
    if (action === 'archive')    return _handleArchive(id);
    if (action === 'unarchive')  return _handleUnarchive(id);
  }

  function _refreshTabsAndList() {
    var modal = document.getElementById(WORKS_MODAL);
    if (!modal) return;
    /* Tab strip'i bul ve yeniden render et — modal yapısı değişmediği için sadece tab+list. */
    var inner = modal.firstElementChild;
    if (!inner) return;
    var children = inner.children;
    // children[0] header, children[1] tab strip, children[2] list
    if (children.length >= 3) {
      children[1].innerHTML = _renderTabBtn('active', 'Aktif') + _renderTabBtn('archived', 'Arşiv');
      children[2].innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:40px">Yükleniyor…</div>';
    }
    _cfuWorksLoadAndRender();
  }

  // ── 4. KART AKSİYONLARI ───────────────────────────────────────────
  function _handleOpen(workId) {
    if (!workId || !_cfuRequireApi()) return;
    /* Dirty-state: aktif çalışmada kaydedilmemiş değişiklik varsa 3 seçenekli modal.
     * onSkip → değişiklikleri at, yeni çalışmaya geç (CashFlowWorks.confirmIfDirty zinciri). */
    var doOpen = function() {
      window.CashFlowWorks.setActiveWorkId(workId);
      window.CashFlowWorks.clearDirty && window.CashFlowWorks.clearDirty();
      _cfuToast('Çalışma açıldı.', 'ok');
      closeWorksModal();
      _cfuRerender();
    };
    if (typeof window.CashFlowWorks.confirmIfDirty === 'function') {
      window.CashFlowWorks.confirmIfDirty(
        /* onSave */ function() { _cfuToast('Otomatik kaydedildi.', 'ok'); doOpen(); },
        /* onSkip */ doOpen,
        /* onCancel */ function() { /* iptal — hiçbir şey yapma */ }
      );
    } else {
      doOpen();
    }
  }

  async function _handleCopy(workId) {
    if (!workId || !_cfuRequireApi()) return;
    var res = await window.CashFlowWorks.copyWork(workId);
    if (res && res.ok) await _cfuWorksLoadAndRender();
  }

  async function _handleArchive(workId) {
    if (!workId || !_cfuRequireApi()) return;
    var modalFn = window.confirmModal;
    if (typeof modalFn !== 'function') {
      _cfuToast('Onay penceresi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    modalFn('Bu çalışma arşivlensin mi? Aktif listeden kalkar, gerektiğinde geri alınabilir.', {
      title: 'Arşivle?',
      danger: false,
      confirmText: 'Arşivle',
      cancelText: 'Vazgeç',
      onConfirm: async function() {
        var res = await window.CashFlowWorks.archiveWork(workId);
        if (res && res.ok) {
          /* Aktif çalışma arşivlendiyse aktif id temizle + paneli yenile */
          if (window.CashFlowWorks.getActiveWorkId() === workId) {
            window.CashFlowWorks.setActiveWorkId(null);
            _cfuRerender();
          }
          await _cfuWorksLoadAndRender();
        }
      }
    });
  }

  async function _handleUnarchive(workId) {
    if (!workId || !_cfuRequireApi()) return;
    var res = await window.CashFlowWorks.unarchiveWork(workId);
    if (res && res.ok) await _cfuWorksLoadAndRender();
  }

  // ── 5. INPUT MODAL (Yeni / Yeniden Adlandır) ──────────────────────
  /**
   * mode = 'new' | 'rename'
   * 'new' → boş input + Kaydet → buildWork + saveWork → setActiveWorkId → rerender
   * 'rename' → mevcut title input'a doldur + Kaydet → renameWork
   */
  function openInputModal(mode, workId) {
    if (!_cfuRequireApi()) return;
    _removeIfExists(INPUT_MODAL);

    var existingTitle = '';
    if (mode === 'rename' && workId) {
      /* Mevcut ad'i kart listesinden alabiliriz; yoksa boş bırak. */
      var btn = document.querySelector('[data-cfu-action="rename"][data-cfu-id="' + CSS.escape(workId) + '"]');
      if (btn) {
        var card = btn.closest('div[style*="border-radius:10px"]');
        if (card) {
          var titleEl = card.querySelector('div[style*="font-weight:600"]');
          if (titleEl) existingTitle = (titleEl.textContent || '').replace(/aktif/i, '').trim();
        }
      }
    }

    var headerLabel = mode === 'new' ? 'Yeni Çalışma' : 'Yeniden Adlandır';
    var btnLabel    = mode === 'new' ? 'Oluştur' : 'Kaydet';
    var placeholder = mode === 'new' ? 'Örn: Şubat 2026 Plan' : 'Yeni ad…';

    var mo = document.createElement('div');
    mo.id = INPUT_MODAL;
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
    mo.addEventListener('click', function(e) { if (e.target === mo) closeInputModal(); });

    mo.innerHTML = '<div style="background:#fff;width:380px;max-width:92vw;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="padding:16px 20px;border-bottom:0.5px solid #eee;font-size:14px;font-weight:600;color:#222">' + headerLabel + '</div>'
      + '<div style="padding:18px 20px">'
        + '<label style="font-size:11px;color:#666;display:block;margin-bottom:6px">Çalışma adı</label>'
        + '<input id="cfu-input-title" type="text" maxlength="80" value="' + _cfuEsc(existingTitle) + '" placeholder="' + placeholder + '" style="width:100%;padding:9px 11px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box" />'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:0.5px solid #eee;display:flex;justify-content:flex-end;gap:8px;background:#fafafa;border-radius:0 0 12px 12px">'
        + '<button data-cfu-action="cancel-input" style="padding:7px 14px;background:transparent;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#666;font-family:inherit">Vazgeç</button>'
        + '<button data-cfu-action="submit-input" data-cfu-mode="' + _cfuEsc(mode) + '" data-cfu-id="' + _cfuEsc(workId || '') + '" style="padding:7px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500;font-family:inherit">' + btnLabel + '</button>'
      + '</div>'
    + '</div>';

    document.body.appendChild(mo);
    mo.addEventListener('click', _cfuInputModalClick);

    /* Auto-focus + Enter to submit */
    setTimeout(function() {
      var inp = document.getElementById('cfu-input-title');
      if (inp) {
        inp.focus();
        if (existingTitle) inp.select();
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            _submitInput(mode, workId);
          } else if (e.key === 'Escape') {
            closeInputModal();
          }
        });
      }
    }, 50);
  }

  function closeInputModal() {
    _removeIfExists(INPUT_MODAL);
  }

  function _cfuInputModalClick(e) {
    var btn = e.target.closest('[data-cfu-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-cfu-action');
    if (action === 'cancel-input') return closeInputModal();
    if (action === 'submit-input') {
      var mode = btn.getAttribute('data-cfu-mode');
      var id   = btn.getAttribute('data-cfu-id') || null;
      _submitInput(mode, id);
    }
  }

  async function _submitInput(mode, workId) {
    var inp = document.getElementById('cfu-input-title');
    if (!inp) return;
    var t = String(inp.value || '').trim();
    if (!t) {
      _cfuToast('Çalışma adı zorunludur.', 'warn');
      inp.focus();
      return;
    }

    if (mode === 'new') {
      var work = window.CashFlowWorks.buildWork(t, 'TRY');
      var res = await window.CashFlowWorks.saveWork(work);
      if (res && res.ok) {
        window.CashFlowWorks.setActiveWorkId(work.id);
        closeInputModal();
        closeWorksModal();
        _cfuToast('Çalışma oluşturuldu.', 'ok');
        _cfuRerender();
      }
    } else if (mode === 'rename' && workId) {
      var rres = await window.CashFlowWorks.renameWork(workId, t);
      if (rres && rres.ok) {
        closeInputModal();
        await _cfuWorksLoadAndRender();
        /* Aktif çalışma yeniden adlandırıldıysa paneli yenile */
        if (window.CashFlowWorks.getActiveWorkId() === workId) _cfuRerender();
      }
    }
  }

  // ── 6. UTIL ──────────────────────────────────────────────────────
  function _removeIfExists(id) {
    var ex = document.getElementById(id);
    if (ex) ex.remove();   // closure-bound listener'lar GC'ye gider
  }

  // ── 7. PUBLIC API ─────────────────────────────────────────────────
  window.CashFlowWorksUI = {
    renderToolbar:     renderToolbar,
    openWorksModal:    openWorksModal,
    closeWorksModal:   closeWorksModal,
    openInputModal:    openInputModal,
    closeInputModal:   closeInputModal
  };

})();
