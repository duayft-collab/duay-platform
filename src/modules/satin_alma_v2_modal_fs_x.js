/**
 * SATIN-ALMA-MODAL-FS-NUM-001 (V164 / Talep 4)
 *
 * sav2-form-modal: Tam ekran (⛶) + Yeni sekme (↗) + Urun satir sira no.
 *
 * STRATEJI: V163 deseni — event hook (timer YOK, observer YOK).
 *
 * V164.1 EKLER:
 *   - Fullscreen acilinca body scroll kilit (overflow:hidden)
 *   - window.open('about:blank') — bos sayfaya yaz, daha guvenli
 *   - retry erken cikis (dataset.v164Setup === '1' ise dur)
 *
 * KX9: form.js DOKUNULMAZ — sadece wrap.
 * KX8: Mevcut HTML kopyalanmadi — DOM injection.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v164Applied) return;
  window._v164Applied = true;

  /* ============= FULLSCREEN TOGGLE (body scroll kilit dahil) ============= */
  function _toggleFs(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var isFs = modal.dataset.v164Fs === '1';
    if (isFs) {
      modal.dataset.v164Fs = '0';
      inner.style.width = inner.dataset.v164OrigW || '';
      inner.style.maxHeight = inner.dataset.v164OrigMH || '';
      inner.style.height = inner.dataset.v164OrigH || '';
      inner.style.borderRadius = inner.dataset.v164OrigBR || '';
      /* Body scroll kilidi kaldir */
      document.body.style.overflow = document.body.dataset.v164BodyOrigOverflow || '';
      delete document.body.dataset.v164BodyOrigOverflow;
    } else {
      if (inner.dataset.v164OrigW == null) {
        inner.dataset.v164OrigW = inner.style.width || '';
        inner.dataset.v164OrigMH = inner.style.maxHeight || '';
        inner.dataset.v164OrigH = inner.style.height || '';
        inner.dataset.v164OrigBR = inner.style.borderRadius || '';
      }
      modal.dataset.v164Fs = '1';
      inner.style.width = '100vw';
      inner.style.maxHeight = '100vh';
      inner.style.height = '100vh';
      inner.style.borderRadius = '0';
      /* Body scroll kilit (DUZELTME 1) */
      document.body.dataset.v164BodyOrigOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    var btn = modal.querySelector('.v164-fs-btn');
    if (btn) btn.textContent = modal.dataset.v164Fs === '1' ? '⛷' : '⛶';
  }

  /* ============= YENI SEKME (about:blank) ============= */
  function _openInNewTab(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var modalHtml = inner.outerHTML;
    var headStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      headStyles += el.outerHTML;
    });
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Alis Teklifi - Yeni Sekme</title>' + headStyles +
               '<style>body{margin:0;padding:48px 20px 20px;background:#F7F9FC;font-family:Geist,sans-serif} .v164-warn{position:fixed;top:0;left:0;right:0;background:#FEF3C7;color:#92400E;padding:8px 16px;font-size:12px;text-align:center;z-index:9999;border-bottom:1px solid #F4E4BC}</style>' +
               '</head><body><div class="v164-warn">Bu yeni sekmede acilan kopyadir. Kayit/duzenleme yapilamaz, ana sayfaya donun.</div>' +
               modalHtml + '</body></html>';
    /* DUZELTME 2: about:blank ile ac */
    var w = window.open('about:blank', '_blank');
    if (!w) { if (window.toast) window.toast('Popup engellendi', 'warn'); return; }
    try { w.document.open(); w.document.write(html); w.document.close(); }
    catch (e) { console.error('[V164] yeni sekme yazma hata:', e); }
  }

  /* ============= HEADER BUTONLARI INJECT ============= */
  function _injectHeaderBtns(modal) {
    if (modal.querySelector('.v164-fs-btn')) return;
    var closeBtn = null;
    modal.querySelectorAll('button').forEach(function (b) {
      if (!closeBtn && b.textContent && b.textContent.trim() === '×') closeBtn = b;
    });
    if (!closeBtn || !closeBtn.parentElement) return;

    var common = 'font-size:14px;border:none;background:none;cursor:pointer;color:#94A3B8;line-height:1;padding:0 4px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;transition:background-color .12s ease,color .12s ease';

    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'v164-fs-btn';
    fsBtn.title = 'Tam ekran';
    fsBtn.textContent = '⛶';
    fsBtn.style.cssText = common;
    fsBtn.onmouseover = function () { fsBtn.style.background = '#F0F3F8'; fsBtn.style.color = '#0F172A'; };
    fsBtn.onmouseout = function () { fsBtn.style.background = 'none'; fsBtn.style.color = '#94A3B8'; };
    fsBtn.onclick = function (e) { e.stopPropagation(); _toggleFs(modal); };

    var ntBtn = document.createElement('button');
    ntBtn.type = 'button';
    ntBtn.className = 'v164-nt-btn';
    ntBtn.title = 'Yeni sekmede ac';
    ntBtn.textContent = '↗';
    ntBtn.style.cssText = common;
    ntBtn.onmouseover = function () { ntBtn.style.background = '#F0F3F8'; ntBtn.style.color = '#0F172A'; };
    ntBtn.onmouseout = function () { ntBtn.style.background = 'none'; ntBtn.style.color = '#94A3B8'; };
    ntBtn.onclick = function (e) { e.stopPropagation(); _openInNewTab(modal); };

    closeBtn.parentElement.insertBefore(fsBtn, closeBtn);
    closeBtn.parentElement.insertBefore(ntBtn, closeBtn);
  }

  /* ============= SIRA NO BADGE ([1] [☑] formati) ============= */
  function _injectRowSiraNo(row, idx) {
    if (row.querySelector('.v164-sira-no')) return;
    var firstCell = row.firstElementChild;
    if (!firstCell) return;
    var badge = document.createElement('span');
    badge.className = 'v164-sira-no';
    badge.textContent = String(idx + 1);
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px;padding:0 3px;margin-right:3px;background:#F0F3F8;border:0.5px solid #E2E8F0;border-radius:3px;font-size:9px;font-weight:600;color:#475569;font-variant-numeric:tabular-nums;flex-shrink:0;line-height:1';
    var existingCb = firstCell.querySelector('.v163-row-cb');
    if (existingCb) {
      firstCell.insertBefore(badge, existingCb);
    } else {
      firstCell.insertBefore(badge, firstCell.firstChild);
    }
    if (firstCell.style.display !== 'flex') {
      firstCell.style.display = 'flex';
      firstCell.style.alignItems = 'center';
      firstCell.style.gap = '3px';
    }
  }

  function _renumberRows(modal) {
    var rows = modal.querySelectorAll('.sav2f-urun-satir');
    rows.forEach(function (row, idx) {
      var badge = row.querySelector('.v164-sira-no');
      if (!badge) {
        _injectRowSiraNo(row, idx);
      } else {
        var expected = String(idx + 1);
        if (badge.textContent !== expected) {
          badge.textContent = expected;
        }
      }
    });
  }

  /* ============= MODAL SETUP ============= */
  function _setupModal(modal) {
    if (modal.dataset.v164Setup === '1') return;
    modal.dataset.v164Setup = '1';
    _injectHeaderBtns(modal);
    _renumberRows(modal);
    /* V163 toplu sil sonrasi renumber — modal'a delegated click listener */
    modal.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.classList) return;
      /* V163'un Sil butonu — confirmModal acilir, onConfirm sonrasi DOM degisir */
      if (t.tagName === 'BUTTON' && t.classList.contains('v163-sil-btn')) {
        /* confirmModal async + DOM remove suresi — 350ms bekle, sonra renumber */
        setTimeout(function () { _renumberRows(modal); }, 350);
        /* Ekstra retry — confirm gec onaylanirsa */
        setTimeout(function () { _renumberRows(modal); }, 800);
      }
    });
  }

  /* ============= RETRY (DUZELTME 3 — dataset kontrolu) ============= */
  function _retrySetup(maxAttempts, intervalMs) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var modal = document.getElementById('sav2-form-modal');
      /* Erken cikis: modal var ve V164 setup edildiyse hicbir is yok */
      if (modal && modal.dataset.v164Setup === '1') {
        clearInterval(iv);
        return;
      }
      if (modal) {
        clearInterval(iv);
        _setupModal(modal);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(iv);
      }
    }, intervalMs);
  }

  /* ============= WRAP'LAR ============= */
  function _wrapYeniTeklif() {
    if (typeof window._saV2YeniTeklif !== 'function') {
      console.warn('[V164] _saV2YeniTeklif yok — wrap atlandi');
      return false;
    }
    if (window._origSaV2YeniTeklif_V164) return true;
    var orig = window._saV2YeniTeklif;
    window._origSaV2YeniTeklif_V164 = orig;
    window._saV2YeniTeklif = function () {
      var r = orig.apply(this, arguments);
      _retrySetup(5, 100);
      return r;
    };
    return true;
  }

  function _wrapSatirEkle() {
    if (typeof window._saV2UrunSatirEkle !== 'function') {
      console.warn('[V164] _saV2UrunSatirEkle yok — wrap atlandi');
      return false;
    }
    if (window._origSaV2UrunSatirEkle_V164) return true;
    var orig = window._saV2UrunSatirEkle;
    window._origSaV2UrunSatirEkle_V164 = orig;
    window._saV2UrunSatirEkle = function () {
      var r = orig.apply(this, arguments);
      var modal = document.getElementById('sav2-form-modal');
      if (modal) {
        Promise.resolve().then(function () {
          _renumberRows(modal);
        });
      }
      return r;
    };
    return true;
  }

  function _apply() {
    var w1 = _wrapYeniTeklif();
    var w2 = _wrapSatirEkle();
    var modal = document.getElementById('sav2-form-modal');
    if (modal) _setupModal(modal);
    window._v164Status = { wrapYeniTeklif: w1, wrapSatirEkle: w2, applied: true };
    console.log('[V164 alis modal fs+sekme+sira] aktif', window._v164Status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
