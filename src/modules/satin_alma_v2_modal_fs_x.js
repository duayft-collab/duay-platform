/**
 * SATIN-ALMA-MODAL-FS-NUM-001 (V161.1)
 *
 * AMAC: Alis Teklif modal'ina (sav2-form-modal) fullscreen + yeni sekme + urun satir sira no.
 *
 * V161 fail: MutationObserver subtree:true infinite loop (badge inject -> mutation -> observer -> tekrar).
 * V161.1 fix: Observer YOK. setInterval(500ms) idempotent renumber. Modal kapaninca timer auto-clear.
 *
 * KX9: form.js DOKUNULMAZ.
 * KX8: Mevcut HTML kopyalanmadi, DOM injection.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v161Applied) return;
  window._v161Applied = true;

  /* ============= FULLSCREEN TOGGLE ============= */
  function _toggleFs(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var isFs = modal.dataset.v161Fs === '1';
    if (isFs) {
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
    if (btn) btn.textContent = modal.dataset.v161Fs === '1' ? '⛷' : '⛶';
  }

  /* ============= YENI SEKME ============= */
  function _openInNewTab(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var modalHtml = inner.outerHTML;
    var headStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      headStyles += el.outerHTML;
    });
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Alis Teklifi - Yeni Sekme</title>' + headStyles +
               '<style>body{margin:0;padding:48px 20px 20px;background:#F7F9FC;font-family:Geist,sans-serif} .v161-warn{position:fixed;top:0;left:0;right:0;background:#FEF3C7;color:#92400E;padding:8px 16px;font-size:12px;text-align:center;z-index:9999;border-bottom:1px solid #F4E4BC}</style>' +
               '</head><body><div class="v161-warn">Bu yeni sekmede acilan kopyadir. Kayit/duzenleme yapilamaz, ana sayfaya donun.</div>' +
               modalHtml + '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { if (window.toast) window.toast('Popup engellendi', 'warn'); return; }
    try { w.document.open(); w.document.write(html); w.document.close(); }
    catch (e) { console.error('[V161] yeni sekme yazma hata:', e); }
  }

  /* ============= HEADER BUTONLARI INJECT ============= */
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

  /* ============= SIRA NO — idempotent, observer YOK ============= */
  function _renumberRows(modal) {
    var rows = modal.querySelectorAll('.sav2f-urun-satir');
    rows.forEach(function (row, idx) {
      var badge = row.querySelector('.v161-sira-no');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'v161-sira-no';
        badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-right:8px;background:#F0F3F8;border:0.5px solid #E2E8F0;border-radius:4px;font-size:10px;font-weight:600;color:#475569;font-variant-numeric:tabular-nums;flex-shrink:0';
        row.insertBefore(badge, row.firstElementChild);
      }
      var expected = String(idx + 1);
      if (badge.textContent !== expected) {
        badge.textContent = expected;
      }
    });
  }

  /* ============= MODAL TIMER — auto-cleanup ============= */
  var _activeTimers = new WeakMap();

  function _onModalAppear(modal) {
    if (!modal || _activeTimers.has(modal)) return;
    _injectHeaderBtns(modal);
    _renumberRows(modal);
    var timer = setInterval(function () {
      if (!document.body.contains(modal)) {
        clearInterval(timer);
        _activeTimers.delete(modal);
        return;
      }
      _renumberRows(modal);
    }, 500);
    _activeTimers.set(modal, timer);
  }

  /* ============= SCAN — observer YOK, sadece interval ============= */
  function _scan() {
    var m = document.getElementById('sav2-form-modal');
    if (m) _onModalAppear(m);
  }

  function _apply() {
    _scan();
    setInterval(_scan, 800);
    window._v161Status = { applied: true };
    console.log('[V161.1 alis modal fs + sira no] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
