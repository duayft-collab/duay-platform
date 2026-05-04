/**
 * URUN-DB-MODAL-FS-NUM-001 (V164.b / Talep 4 ek)
 *
 * mo-urun-db: Tam ekran (⛶) + Yeni sekme (↗) + .udb-card sira no badge.
 *
 * STRATEJI: V164 deseninin selektor-degisik kopyasi.
 *   - openUrunModal wrap (window.openUrunModal expose VAR) → 5x100ms retry
 *   - _udbSatirEkle wrap (sync) → renumber direkt cagri
 *   - Header'a × kapat ONUNDE ⛶ + ↗ inject
 *   - .udb-card sol ust kose absolute sira no badge (kart layout, slot YOK)
 *
 * V164 ile cakisma YOK: farkli modal id (sav2-form-modal vs mo-urun-db).
 * V163 ile cakisma YOK: V163 sadece Alis modal'da, Katalog modal'da V163 yok.
 *
 * KX9: urun_db.js DOKUNULMAZ — sadece wrap.
 * KX8: Mevcut HTML kopyalanmadi — DOM injection.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v164bApplied) return;
  window._v164bApplied = true;

  function _toggleFs(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var isFs = modal.dataset.v164bFs === '1';
    if (isFs) {
      modal.dataset.v164bFs = '0';
      inner.style.width = inner.dataset.v164bOrigW || '';
      inner.style.maxHeight = inner.dataset.v164bOrigMH || '';
      inner.style.height = inner.dataset.v164bOrigH || '';
      inner.style.borderRadius = inner.dataset.v164bOrigBR || '';
      document.body.style.overflow = document.body.dataset.v164bBodyOrigOverflow || '';
      delete document.body.dataset.v164bBodyOrigOverflow;
    } else {
      if (inner.dataset.v164bOrigW == null) {
        inner.dataset.v164bOrigW = inner.style.width || '';
        inner.dataset.v164bOrigMH = inner.style.maxHeight || '';
        inner.dataset.v164bOrigH = inner.style.height || '';
        inner.dataset.v164bOrigBR = inner.style.borderRadius || '';
      }
      modal.dataset.v164bFs = '1';
      inner.style.width = '100vw';
      inner.style.maxHeight = '100vh';
      inner.style.height = '100vh';
      inner.style.borderRadius = '0';
      document.body.dataset.v164bBodyOrigOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    var btn = modal.querySelector('.v164b-fs-btn');
    if (btn) btn.textContent = modal.dataset.v164bFs === '1' ? '⛷' : '⛶';
  }

  function _openInNewTab(modal) {
    var inner = modal.firstElementChild;
    if (!inner) return;
    var modalHtml = inner.outerHTML;
    var headStyles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      headStyles += el.outerHTML;
    });
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Urun Katalogu - Yeni Sekme</title>' + headStyles +
               '<style>body{margin:0;padding:48px 20px 20px;background:#F7F9FC;font-family:Geist,sans-serif} .v164b-warn{position:fixed;top:0;left:0;right:0;background:#FEF3C7;color:#92400E;padding:8px 16px;font-size:12px;text-align:center;z-index:9999;border-bottom:1px solid #F4E4BC}</style>' +
               '</head><body><div class="v164b-warn">Bu yeni sekmede acilan kopyadir. Kayit/duzenleme yapilamaz, ana sayfaya donun.</div>' +
               modalHtml + '</body></html>';
    var w = window.open('about:blank', '_blank');
    if (!w) { if (window.toast) window.toast('Popup engellendi', 'warn'); return; }
    try { w.document.open(); w.document.write(html); w.document.close(); }
    catch (e) { console.error('[V164.b] yeni sekme yazma hata:', e); }
  }

  function _injectHeaderBtns(modal) {
    if (modal.querySelector('.v164b-fs-btn')) return;
    var closeBtn = null;
    modal.querySelectorAll('button').forEach(function (b) {
      if (!closeBtn && b.textContent && b.textContent.trim() === '×') closeBtn = b;
    });
    if (!closeBtn || !closeBtn.parentElement) return;

    var common = 'font-size:14px;border:none;background:none;cursor:pointer;color:#94A3B8;line-height:1;padding:0 4px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;transition:background-color .12s ease,color .12s ease';

    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'v164b-fs-btn';
    fsBtn.title = 'Tam ekran';
    fsBtn.textContent = '⛶';
    fsBtn.style.cssText = common;
    fsBtn.onmouseover = function () { fsBtn.style.background = '#F0F3F8'; fsBtn.style.color = '#0F172A'; };
    fsBtn.onmouseout = function () { fsBtn.style.background = 'none'; fsBtn.style.color = '#94A3B8'; };
    fsBtn.onclick = function (e) { e.stopPropagation(); _toggleFs(modal); };

    var ntBtn = document.createElement('button');
    ntBtn.type = 'button';
    ntBtn.className = 'v164b-nt-btn';
    ntBtn.title = 'Yeni sekmede ac';
    ntBtn.textContent = '↗';
    ntBtn.style.cssText = common;
    ntBtn.onmouseover = function () { ntBtn.style.background = '#F0F3F8'; ntBtn.style.color = '#0F172A'; };
    ntBtn.onmouseout = function () { ntBtn.style.background = 'none'; ntBtn.style.color = '#94A3B8'; };
    ntBtn.onclick = function (e) { e.stopPropagation(); _openInNewTab(modal); };

    closeBtn.parentElement.insertBefore(fsBtn, closeBtn);
    closeBtn.parentElement.insertBefore(ntBtn, closeBtn);
  }

  function _injectCardSiraNo(card, idx) {
    if (card.querySelector('.v164b-sira-no')) return;
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    var badge = document.createElement('span');
    badge.className = 'v164b-sira-no';
    badge.textContent = String(idx + 1);
    badge.style.cssText = 'position:absolute;top:8px;left:8px;z-index:5;display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;background:#0F172A;color:#fff;border-radius:11px;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1;pointer-events:none';
    card.appendChild(badge);
  }

  function _renumberCards(modal) {
    var cards = modal.querySelectorAll('.udb-card');
    cards.forEach(function (card, idx) {
      var badge = card.querySelector('.v164b-sira-no');
      if (!badge) {
        _injectCardSiraNo(card, idx);
      } else {
        var expected = String(idx + 1);
        if (badge.textContent !== expected) {
          badge.textContent = expected;
        }
      }
    });
  }

  function _setupModal(modal) {
    if (modal.dataset.v164bSetup === '1') return;
    modal.dataset.v164bSetup = '1';
    _injectHeaderBtns(modal);
    _renumberCards(modal);
  }

  function _retrySetup(maxAttempts, intervalMs) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var modal = document.getElementById('mo-urun-db');
      if (modal && modal.dataset.v164bSetup === '1') {
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

  function _wrapOpenModal() {
    if (typeof window.openUrunModal !== 'function') {
      console.warn('[V164.b] openUrunModal yok — wrap atlandi');
      return false;
    }
    if (window._origOpenUrunModal_V164b) return true;
    var orig = window.openUrunModal;
    window._origOpenUrunModal_V164b = orig;
    window.openUrunModal = function () {
      var r = orig.apply(this, arguments);
      _retrySetup(5, 100);
      /* LAZY RETRY HER ACILISTA: openUrunModal _udbSatirEkle'yi yeniden tanimladigi icin
         her acilista wrap'i kontrol et ve gerekirse yeniden uygula */
      setTimeout(function () {
        var fn = window._udbSatirEkle;
        if (typeof fn !== 'function') return;
        /* Wrap'in bizim oldugunu kontrol et — fn body'sinde V164b marker var mi? */
        var isOurs = fn.toString().indexOf('_origUdbSatirEkle_V164b') >= 0
                     || fn === window._v164bWrappedSatirEkle;
        if (isOurs) return; /* zaten wrap'liyiz */
        /* Wrap kaybolmus veya hic yapilmamis — yeniden wrap'le */
        var orig2 = fn;
        window._origUdbSatirEkle_V164b = orig2;
        var wrapped = function () {
          var rr = orig2.apply(this, arguments);
          var modal = document.getElementById('mo-urun-db');
          if (modal) _renumberCards(modal);
          return rr;
        };
        window._udbSatirEkle = wrapped;
        window._v164bWrappedSatirEkle = wrapped; /* identity check icin */
        if (window._v164bStatus) window._v164bStatus.wrapSatirEkle = true;
      }, 50);
      return r;
    };
    return true;
  }

  function _wrapSatirEkle() {
    if (typeof window._udbSatirEkle !== 'function') {
      console.warn('[V164.b] _udbSatirEkle yok — wrap atlandi');
      return false;
    }
    if (window._origUdbSatirEkle_V164b) return true;
    var orig = window._udbSatirEkle;
    window._origUdbSatirEkle_V164b = orig;
    window._udbSatirEkle = function () {
      var r = orig.apply(this, arguments);
      var modal = document.getElementById('mo-urun-db');
      if (modal) _renumberCards(modal);
      return r;
    };
    return true;
  }

  function _apply() {
    var w1 = _wrapOpenModal();
    var w2 = _wrapSatirEkle();
    var modal = document.getElementById('mo-urun-db');
    if (modal) _setupModal(modal);
    window._v164bStatus = { wrapOpenModal: w1, wrapSatirEkle: w2, applied: true };
    console.log('[V164.b urun katalogu modal fs+sekme+sira] aktif', window._v164bStatus);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
