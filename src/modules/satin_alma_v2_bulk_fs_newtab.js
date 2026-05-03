/**
 * SATIS-MODAL-BULK-FS-NEWTAB-001 (V155)
 *
 * 3 ozellik:
 *   1. Liste sayfasinda toplu silme: her satira checkbox + ust toolbar'da "X Sil" butonu
 *   2. Modal fullscreen: sag ust ⛶ ikon, toggle ile max-width:100vw + max-height:100vh
 *   3. Modal yeni sekme: sag ust ↗ ikon, modal icerigini yeni window.open'da render
 *
 * KX9: app_patch.js + satin_alma_v2_satis.js DOKUNULMAZ — DOM observer ile
 * (a) liste'ye checkbox+toolbar inject
 * (b) modal header'a ⛶/↗ butonu inject
 * Override pattern: window.renderSatisTeklifleri ve _saV2YeniTeklif/_saV2DuzenleTeklif
 * sonrasi DOM mutate edilir.
 *
 * V152 _saV2RevToggle, V153 helpers, V154 _saV2OpenPdfV2 — etkilenmez.
 *
 * Anayasa uyumu:
 *   K01 ≤800 satir · KX3 yeni feature = yeni dosya · KX5 saha test prod (V152-V154 deseni)
 *   KX9 mevcut dosyalar dokunulmaz (override + observer pattern)
 */
(function () {
  'use strict';

  if (window._saV2_bulkFsNewtabApplied) return;
  window._saV2_bulkFsNewtabApplied = true;

  var SELECTED = new Set();

  /* ════════════════════════════════════════════════════════════
   * BOLUM 1 — TOPLU SILME (LISTE SAYFASI)
   * ════════════════════════════════════════════════════════════ */

  /* Toolbar butonu container (header sag tarafa eklenecek) */
  function _injectToolbarBulkBtn() {
    /* Header'i bul — "+ Satis Teklifi" butonu bulunan div */
    var addBtn = document.querySelector('button[onclick*="_saV2YeniTeklif"]') ||
                 document.querySelector('button[onclick*="_openSTModal"]');
    if (!addBtn) return;

    var toolbar = addBtn.parentElement;
    if (!toolbar) return;

    /* Zaten varsa skip */
    if (toolbar.querySelector('#st-bulk-sil-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'st-bulk-sil-btn';
    btn.style.cssText = 'padding:6px 12px;border:0.5px solid #DC2626;border-radius:7px;background:rgba(220,38,38,.06);color:#DC2626;font-size:11px;cursor:pointer;font-family:inherit;display:none;margin-right:8px';
    btn.textContent = 'Sec ve Sil';
    btn.onclick = function (e) {
      e.stopPropagation();
      _bulkSilOnay();
    };
    /* "+ Satis Teklifi"den onceki konuma ekle */
    toolbar.insertBefore(btn, addBtn);
  }

  function _updateBulkBtn() {
    var btn = document.getElementById('st-bulk-sil-btn');
    if (!btn) return;
    var n = SELECTED.size;
    btn.style.display = n > 0 ? 'inline-flex' : 'none';
    btn.textContent = n + ' Teklif Sil';
  }

  /* Liste satirlarina checkbox inject */
  function _injectRowCheckboxes() {
    var rows = document.querySelectorAll('#satis-list > div[style*="border-bottom"]');
    rows.forEach(function (row) {
      /* Zaten var mi? */
      if (row.querySelector('.st-bulk-chk')) return;

      /* Click handler'i olan inner div */
      var innerClick = row.querySelector('div[onclick*="_stToggleExpand"]');
      if (!innerClick) return;

      /* Teklif ID'sini onclick'ten cek */
      var onclickStr = innerClick.getAttribute('onclick') || '';
      var match = onclickStr.match(/_stToggleExpand\s*&&\s*window\._stToggleExpand\s*\(\s*['"]([^'"]+)['"]/);
      var teklifId = match ? match[1] : null;
      if (!teklifId) return;

      /* Checkbox olustur */
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'st-bulk-chk';
      chk.dataset.id = teklifId;
      chk.style.cssText = 'margin-right:8px;cursor:pointer;flex-shrink:0;accent-color:#185FA5';
      chk.onclick = function (e) {
        e.stopPropagation();
        if (chk.checked) SELECTED.add(teklifId);
        else SELECTED.delete(teklifId);
        _updateBulkBtn();
      };

      /* En basa ekle (prefix'ten once) */
      innerClick.insertBefore(chk, innerClick.firstChild);
    });
  }

  /* Toplu silme onay + execute */
  function _bulkSilOnay() {
    var ids = Array.from(SELECTED);
    if (!ids.length) return;
    var msg = ids.length + ' teklif silinecek. Emin misin?';
    var doDelete = function () {
      try {
        var liste = window.loadSatisTeklifleri ? window.loadSatisTeklifleri() : [];
        var now = new Date().toISOString();
        var changed = 0;
        ids.forEach(function (id) {
          var t = liste.find(function (x) { return String(x.id) === String(id); });
          if (t && !t.isDeleted) {
            t.isDeleted = true;
            t.deletedAt = now;
            changed++;
          }
        });
        if (window.storeSatisTeklifleri) {
          window.storeSatisTeklifleri(liste);
        }
        if (window.toast) window.toast(changed + ' teklif silindi', 'ok');
        SELECTED.clear();
        _updateBulkBtn();
        /* Listeyi yenile */
        if (window.renderSatisTeklifleri) {
          setTimeout(function () { window.renderSatisTeklifleri(); }, 50);
        }
      } catch (e) {
        console.error('[V155] Toplu silme hata:', e);
        if (window.toast) window.toast('Silme hata: ' + e.message, 'error');
      }
    };

    if (typeof window.confirmModal === 'function') {
      window.confirmModal(msg, { onConfirm: doDelete, danger: true });
    } else {
      if (confirm(msg)) doDelete();
    }
  }

  /* renderSatisTeklifleri override — list re-render sonrasi checkbox + toolbar inject */
  function _wrapListRender() {
    var orig = window.renderSatisTeklifleri;
    if (typeof orig !== 'function') return false;

    if (window._origRenderSatisTeklifleri_V155) return true; /* zaten wrap'li */
    window._origRenderSatisTeklifleri_V155 = orig;

    window.renderSatisTeklifleri = function () {
      var result = orig.apply(this, arguments);
      /* V152 setTimeout(50) sonrasi DOM hazir — biz 100ms beklesek garanti */
      setTimeout(function () {
        try {
          _injectToolbarBulkBtn();
          _injectRowCheckboxes();
          _updateBulkBtn();
        } catch (e) { console.warn('[V155] inject hata:', e); }
      }, 120);
      return result;
    };
    return true;
  }

  /* ════════════════════════════════════════════════════════════
   * BOLUM 2 — MODAL FULLSCREEN + YENI SEKME
   * ════════════════════════════════════════════════════════════ */

  function _isModalFullscreen() {
    var m = document.getElementById('sav2-satis-modal');
    return m && m.dataset.fsMode === '1';
  }

  function _toggleFullscreen() {
    var modal = document.getElementById('sav2-satis-modal');
    if (!modal) return;
    var inner = modal.firstElementChild;
    if (!inner) return;

    var isFs = modal.dataset.fsMode === '1';
    if (isFs) {
      /* Geri kucult */
      modal.dataset.fsMode = '0';
      inner.style.width = '';
      inner.style.maxHeight = '';
      inner.style.height = '';
      inner.style.borderRadius = '';
    } else {
      /* Tam ekran */
      modal.dataset.fsMode = '1';
      inner.style.width = '100vw';
      inner.style.maxHeight = '100vh';
      inner.style.height = '100vh';
      inner.style.borderRadius = '0';
    }
    /* Icon update */
    var btn = document.getElementById('st-modal-fs-btn');
    if (btn) btn.textContent = isFs ? '⛶' : '⛷';
  }

  function _openInNewTab() {
    var modal = document.getElementById('sav2-satis-modal');
    if (!modal) return;
    var inner = modal.firstElementChild;
    if (!inner) return;

    /* Modal HTML kopyasi */
    var modalHtml = inner.outerHTML;

    /* Mevcut sayfa <head> stillerini kopyala */
    var headStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      headStyles += el.outerHTML;
    });

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    fullHtml += '<title>Satis Teklifi — Yeni Sekme</title>';
    fullHtml += headStyles;
    fullHtml += '<style>body{margin:0;padding:20px;background:var(--bg,#F7F9FC);font-family:Geist,sans-serif} .v155-newtab-warn{position:fixed;top:0;left:0;right:0;background:#FEF3C7;color:#92400E;padding:8px 16px;font-size:12px;text-align:center;z-index:9999;border-bottom:1px solid #F4E4BC} body{padding-top:48px}</style>';
    fullHtml += '</head><body>';
    fullHtml += '<div class="v155-newtab-warn">Bu yeni sekmede acilan kopyadir. Kayit/duzenleme buradan yapilamaz, ana sayfaya donun.</div>';
    fullHtml += modalHtml;
    fullHtml += '</body></html>';

    var w = window.open('', '_blank');
    if (!w) {
      if (window.toast) window.toast('Popup engellendi', 'warn');
      return;
    }
    try {
      w.document.open();
      w.document.write(fullHtml);
      w.document.close();
    } catch (e) {
      console.error('[V155] yeni sekme yazma hata:', e);
    }
  }

  /* Modal header'a ⛶ ve ↗ butonlarini inject et */
  function _injectModalHeaderBtns() {
    var modal = document.getElementById('sav2-satis-modal');
    if (!modal) return;
    /* Zaten varsa skip */
    if (modal.querySelector('#st-modal-fs-btn')) return;

    /* × kapat butonu — onun oncesine ekleyecegiz */
    var closeBtn = null;
    modal.querySelectorAll('button').forEach(function (b) {
      if (b.textContent && b.textContent.trim() === '×') closeBtn = b;
    });
    if (!closeBtn || !closeBtn.parentElement) return;

    var commonStyle = 'font-size:14px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;padding:0 4px;font-family:inherit;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px';

    /* ⛶ Fullscreen */
    var fsBtn = document.createElement('button');
    fsBtn.id = 'st-modal-fs-btn';
    fsBtn.title = 'Tam ekran';
    fsBtn.textContent = '⛶';
    fsBtn.style.cssText = commonStyle;
    fsBtn.onmouseover = function () { fsBtn.style.background = 'var(--s2)'; };
    fsBtn.onmouseout = function () { fsBtn.style.background = 'none'; };
    fsBtn.onclick = function (e) {
      e.stopPropagation();
      _toggleFullscreen();
    };

    /* ↗ Yeni sekme */
    var newTabBtn = document.createElement('button');
    newTabBtn.id = 'st-modal-newtab-btn';
    newTabBtn.title = 'Yeni sekmede ac';
    newTabBtn.textContent = '↗';
    newTabBtn.style.cssText = commonStyle;
    newTabBtn.onmouseover = function () { newTabBtn.style.background = 'var(--s2)'; };
    newTabBtn.onmouseout = function () { newTabBtn.style.background = 'none'; };
    newTabBtn.onclick = function (e) {
      e.stopPropagation();
      _openInNewTab();
    };

    /* x'in oncesine sirayla ekle: ⛶ ↗ × */
    closeBtn.parentElement.insertBefore(fsBtn, closeBtn);
    closeBtn.parentElement.insertBefore(newTabBtn, closeBtn);
  }

  /* Modal acilis fn'lerini wrap et: _saV2YeniTeklif + _saV2DuzenleTeklif */
  function _wrapModalOpeners() {
    ['_saV2YeniTeklif', '_saV2DuzenleTeklif', '_saV2YeniRevize'].forEach(function (fnName) {
      var orig = window[fnName];
      if (typeof orig !== 'function') return;
      if (window['_origModalOpener_V155_' + fnName]) return;
      window['_origModalOpener_V155_' + fnName] = orig;

      window[fnName] = function () {
        var result = orig.apply(this, arguments);
        /* Modal DOM olustur, ardindan butonlari inject et */
        setTimeout(function () {
          try { _injectModalHeaderBtns(); }
          catch (e) { console.warn('[V155] modal btn inject hata:', e); }
        }, 100);
        return result;
      };
    });
  }

  /* MutationObserver fallback — modal disardan acilirsa da yakala */
  function _startModalObserver() {
    var observer = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.id === 'sav2-satis-modal') {
            setTimeout(_injectModalHeaderBtns, 50);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true });
  }

  /* ════════════════════════════════════════════════════════════
   * APPLY
   * ════════════════════════════════════════════════════════════ */
  function _apply() {
    var status = {
      listRenderWrap: _wrapListRender(),
      modalOpenersWrap: false
    };
    _wrapModalOpeners();
    status.modalOpenersWrap = true;
    _startModalObserver();

    /* Eger liste sayfasi zaten acik ise, hemen inject et */
    if (document.getElementById('satis-list')) {
      setTimeout(function () {
        _injectToolbarBulkBtn();
        _injectRowCheckboxes();
        _updateBulkBtn();
      }, 200);
    }

    window._saV2_bulkFsNewtabStatus = status;
    console.log('[V155 bulk + fs + newtab] aktif:', status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_apply, 300);
    });
  } else {
    setTimeout(_apply, 300);
  }

  /* SATIS-MODAL-BULK-FS-NEWTAB-001 — V155 sonu */
})();
