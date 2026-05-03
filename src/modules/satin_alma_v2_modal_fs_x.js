/**
 * SATIN-ALMA-MODAL-FS-NUM-001 (V161)
 *
 * AMAC: 2 modal'a fullscreen + yeni sekme + urun satirlarina sira no.
 *   1. sav2-form-modal (Yeni Alis Teklifi)
 *   2. mo-urun-db (Urun Katalogu Toplu Kayit)
 *
 * STRATEJI: V155 deseni — modal acilim event'lerini wrap, header'a buton inject.
 *           MutationObserver fallback (modal disardan acilirsa).
 *           Sira no — .sav2f-urun-satir ve mo-urun-db ic satirlari icin DOM mutate.
 *
 * KX9: form.js + urun_db.js DOKUNULMAZ — DOM injection.
 * KX8: Mevcut HTML kopyalanmadi.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v161Applied) return;
  window._v161Applied = true;

  /* ============= FULLSCREEN + NEW TAB BUTONLARI ============= */
  function _isFs(modal) { return modal.dataset.v161Fs === '1'; }

  function _toggleFs(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    if (_isFs(modal)) {
      modal.dataset.v161Fs = '0';
      inner.style.width = inner.dataset.v161OrigW || '';
      inner.style.maxHeight = inner.dataset.v161OrigMH || '';
      inner.style.height = inner.dataset.v161OrigH || '';
      inner.style.borderRadius = inner.dataset.v161OrigBR || '';
    } else {
      if (inner.dataset.v161OrigW == null) {
        inner.dataset.v161OrigW = inner.style.width || '';
        inner.dataset.v161OrigMH = inner.style.maxHeight || '';
        inner.dataset.v161OrigH = inner.style.height || '';
        inner.dataset.v161OrigBR = inner.style.borderRadius || '';
      }
      modal.dataset.v161Fs = '1';
      inner.style.width = '100vw';
      inner.style.maxHeight = '100vh';
      inner.style.height = '100vh';
      inner.style.borderRadius = '0';
    }
    var btn = modal.querySelector('.v161-fs-btn');
    if (btn) btn.textContent = _isFs(modal) ? '⛷' : '⛶';
  }

  function _openInNewTab(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var modalHtml = inner.outerHTML;
    var headStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      headStyles += el.outerHTML;
    });
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
               (modal.id || 'Modal') + ' — Yeni Sekme</title>' + headStyles +
               '<style>body{margin:0;padding:20px;background:#F7F9FC;font-family:Geist,sans-serif} .v161-warn{position:fixed;top:0;left:0;right:0;background:#FEF3C7;color:#92400E;padding:8px 16px;font-size:12px;text-align:center;z-index:9999;border-bottom:1px solid #F4E4BC}body{padding-top:48px}</style>' +
               '</head><body><div class="v161-warn">Bu yeni sekmede acilan kopyadir. Kayit/duzenleme yapilamaz, ana sayfaya donun.</div>' +
               modalHtml + '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { if (window.toast) window.toast('Popup engellendi', 'warn'); return; }
    try { w.document.open(); w.document.write(html); w.document.close(); }
    catch (e) { console.error('[V161] yeni sekme yazma hata:', e); }
  }

  function _injectHeaderBtns(modal) {
    if (!modal || modal.querySelector('.v161-fs-btn')) return;
    var closeBtn = null;
    modal.querySelectorAll('button').forEach(function (b) {
      if (!closeBtn && b.textContent && b.textContent.trim() === '×') closeBtn = b;
    });
    if (!closeBtn || !closeBtn.parentElement) return;

    var common = 'font-size:14px;border:none;background:none;cursor:pointer;color:#94A3B8;line-height:1;padding:0 4px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;transition:background-color .12s ease,color .12s ease';

    var fsBtn = document.createElement('button');
    fsBtn.className = 'v161-fs-btn';
    fsBtn.title = 'Tam ekran';
    fsBtn.textContent = '⛶';
    fsBtn.style.cssText = common;
    fsBtn.onmouseover = function () { fsBtn.style.background = '#F0F3F8'; fsBtn.style.color = '#0F172A'; };
    fsBtn.onmouseout = function () { fsBtn.style.background = 'none'; fsBtn.style.color = '#94A3B8'; };
    fsBtn.onclick = function (e) { e.stopPropagation(); _toggleFs(modal); };

    var ntBtn = document.createElement('button');
    ntBtn.className = 'v161-nt-btn';
    ntBtn.title = 'Yeni sekmede ac';
    ntBtn.textContent = '↗';
    ntBtn.style.cssText = common;
    ntBtn.onmouseover = function () { ntBtn.style.background = '#F0F3F8'; ntBtn.style.color = '#0F172A'; };
    ntBtn.onmouseout = function () { ntBtn.style.background = 'none'; ntBtn.style.color = '#94A3B8'; };
    ntBtn.onclick = function (e) { e.stopPropagation(); _openInNewTab(modal); };

    closeBtn.parentElement.insertBefore(fsBtn, closeBtn);
    closeBtn.parentElement.insertBefore(ntBtn, closeBtn);
  }

  /* ============= SIRA NO BADGE — .sav2f-urun-satir ============= */
  function _renumberUrunRows(modal) {
    var rows = modal.querySelectorAll('.sav2f-urun-satir');
    rows.forEach(function (row, idx) {
      var badge = row.querySelector('.v161-sira-no');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'v161-sira-no';
        badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-right:8px;background:#F0F3F8;border:0.5px solid #E2E8F0;border-radius:4px;font-size:10px;font-weight:600;color:#475569;font-variant-numeric:tabular-nums;flex-shrink:0';
        row.insertBefore(badge, row.firstElementChild);
      }
      badge.textContent = (idx + 1);
    });
  }

  /* mo-urun-db ic satirlari — toplu kayit modal'inda */
  function _renumberUrunDbRows(modal) {
    /* Toplu kayit satirlari farkli pattern olabilir, conservative: tablo TR */
    var rows = modal.querySelectorAll('tbody tr[data-row], tbody tr.urun-row');
    rows.forEach(function (row, idx) {
      var badge = row.querySelector('.v161-sira-no');
      if (!badge) {
        var td = document.createElement('td');
        td.className = 'v161-sira-no';
        td.style.cssText = 'font-size:10px;font-weight:600;color:#475569;font-variant-numeric:tabular-nums;text-align:center;width:24px;padding:0 4px';
        row.insertBefore(td, row.firstElementChild);
        td.textContent = (idx + 1);
      } else {
        badge.textContent = (idx + 1);
      }
    });
  }

  /* ============= APPLY — modal acildiginda ============= */
  function _onModalAppear(modal) {
    if (!modal || !modal.id) return;
    setTimeout(function () { _injectHeaderBtns(modal); }, 30);
    if (modal.id === 'sav2-form-modal') {
      setTimeout(function () { _renumberUrunRows(modal); }, 50);
      /* Ürün eklenince yeniden sırala */
      var obs = new MutationObserver(function () { _renumberUrunRows(modal); });
      try { obs.observe(modal, { childList: true, subtree: true }); }
      catch (e) {}
      modal.dataset.v161Obs = '1';
    } else if (modal.id === 'mo-urun-db') {
      setTimeout(function () { _renumberUrunDbRows(modal); }, 50);
      var obs2 = new MutationObserver(function () { _renumberUrunDbRows(modal); });
      try { obs2.observe(modal, { childList: true, subtree: true }); }
      catch (e) {}
    }
  }

  function _scanExisting() {
    ['sav2-form-modal', 'mo-urun-db'].forEach(function (id) {
      var m = document.getElementById(id);
      if (m) _onModalAppear(m);
    });
  }

  /* ============= STARTUP ============= */
  function _apply() {
    /* MutationObserver — body'de modal eklendiginde yakala */
    try {
      var obs = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.id === 'sav2-form-modal' || n.id === 'mo-urun-db') {
              _onModalAppear(n);
            }
          });
        });
      });
      obs.observe(document.body, { childList: true });
    } catch (e) { console.warn('[V161] body observer hata:', e); }

    _scanExisting();
    window._v161Status = { applied: true };
    console.log('[V161 modal fs + sira no] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
