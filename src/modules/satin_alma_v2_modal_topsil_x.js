/**
 * SATIN-ALMA-MODAL-TOPSIL-001 (V163 / Talep 1)
 *
 * Alis Teklifi modal'da urun satirlarini secip toplu silme.
 *
 * STRATEJI: Event hook (timer YOK).
 *   - _saV2UrunSatirEkle wrap → yeni satira checkbox cell ekler
 *   - _saV2YeniTeklif wrap → modal acilinca toolbar + mevcut satir checkbox'lari (5x100ms retry)
 *   - Modal'a ayri delegated change/click listener'lar (cakisma yok)
 *
 * confirmModal kullanilir (native confirm/alert YOK).
 * Global state YOK — DOM checkbox source of truth.
 *
 * KX9: form.js DOKUNULMAZ — sadece wrap.
 * KX8: Mevcut HTML kopyalanmadi — DOM injection.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v163Applied) return;
  window._v163Applied = true;

  function _injectRowCheckbox(row) {
    if (row.querySelector('.v163-row-cb')) return;
    var firstCell = row.firstElementChild;
    if (!firstCell) return;
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'v163-row-cb';
    cb.setAttribute('data-row-idx', row.getAttribute('data-urun-satir') || '');
    cb.style.cssText = 'margin:0;cursor:pointer;width:14px;height:14px;accent-color:#0F172A';
    cb.addEventListener('click', function (e) { e.stopPropagation(); });
    firstCell.appendChild(cb);
  }

  function _injectAllRows(modal) {
    modal.querySelectorAll('.sav2f-urun-satir').forEach(_injectRowCheckbox);
  }

  function _toolbarHTML() {
    return '<div class="v163-toolbar" style="display:inline-flex;align-items:center;gap:10px;margin-left:14px">'
         +   '<label style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#475569;cursor:pointer">'
         +     '<input type="checkbox" class="v163-tum-sec" style="margin:0;cursor:pointer;width:13px;height:13px;accent-color:#0F172A">'
         +     '<span>Tümünü seç</span>'
         +   '</label>'
         +   '<button type="button" class="v163-sil-btn" '
         +     'style="display:none;padding:5px 11px;border:0.5px solid #A32D2D;background:#A32D2D;color:#fff;border-radius:5px;font-size:11px;font-weight:500;cursor:pointer;transition:opacity .12s ease">'
         +     'Seçilenleri Sil <span class="v163-sayac">0 adet</span>'
         +   '</button>'
         + '</div>';
  }

  /* MINI DÜZELTME 2: toleransli */
  function _findUrunKalemleriHeader(modal) {
    var nodes = modal.querySelectorAll('div, h3, h4, span, label, p');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = (el.textContent || '').trim().toLowerCase();
      if (t.length < 40 && t.indexOf('ürün') >= 0 && t.indexOf('kalem') >= 0 && el.children.length <= 2) {
        return el;
      }
    }
    return null;
  }

  function _injectToolbar(modal) {
    if (modal.querySelector('.v163-toolbar')) return;
    var header = _findUrunKalemleriHeader(modal);
    if (!header) {
      console.warn('[V163] "Ürün Kalemleri" header bulunamadi');
      return;
    }
    header.insertAdjacentHTML('afterend', _toolbarHTML());
  }

  function _refreshToolbar(modal) {
    var checkedCount = modal.querySelectorAll('.v163-row-cb:checked').length;
    var totalRows = modal.querySelectorAll('.sav2f-urun-satir').length;
    var silBtn = modal.querySelector('.v163-sil-btn');
    var sayac = modal.querySelector('.v163-sayac');
    var tumSec = modal.querySelector('.v163-tum-sec');
    if (silBtn) silBtn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
    if (sayac) sayac.textContent = checkedCount + ' adet';
    if (tumSec) {
      tumSec.checked = totalRows > 0 && checkedCount === totalRows;
      tumSec.indeterminate = checkedCount > 0 && checkedCount < totalRows;
    }
  }

  function _onChange(e, modal) {
    var t = e.target;
    if (!t || !t.classList) return;
    if (t.classList.contains('v163-tum-sec')) {
      var checked = t.checked;
      modal.querySelectorAll('.v163-row-cb').forEach(function (cb) { cb.checked = checked; });
      _refreshToolbar(modal);
    } else if (t.classList.contains('v163-row-cb')) {
      _refreshToolbar(modal);
    }
  }

  function _onClick(e, modal) {
    var t = e.target;
    if (!t || !t.classList) return;
    if (t.tagName === 'BUTTON' && t.classList.contains('v163-sil-btn')) {
      _silSecilenler(modal);
    }
  }

  function _silSecilenler(modal) {
    var checkedRows = [];
    modal.querySelectorAll('.v163-row-cb:checked').forEach(function (cb) {
      var row = cb.closest('.sav2f-urun-satir');
      if (row) checkedRows.push(row);
    });
    var n = checkedRows.length;
    if (n === 0) return;

    var fn = window.confirmModal;
    if (typeof fn !== 'function') {
      console.warn('[V163] confirmModal yok — abort (kural 4)');
      return;
    }
    fn(n + ' ürün satırı silinecek. Emin misin?', {
      danger: true,
      confirmText: 'Sil',
      onConfirm: function () {
        var snapshot = [];
        modal.querySelectorAll('.v163-row-cb:checked').forEach(function (cb) {
          var row = cb.closest('.sav2f-urun-satir');
          if (row) snapshot.push(row);
        });
        snapshot.forEach(function (row) {
          var idx = row.getAttribute('data-urun-satir');
          var pre = 'sav2u-' + idx + '-';
          ['not-panel-mus', 'not-panel-sirket', 'not-panel-sozlesme'].forEach(function (suf) {
            var np = document.getElementById(pre + suf);
            if (np) np.remove();
          });
          row.remove();
        });
        _refreshToolbar(modal);
        /* MINI DÜZELTME 1: sadelestirilmis selector */
        var firstRemainingRow = modal.querySelector('.sav2f-urun-satir');
        if (firstRemainingRow) {
          var firstInput = firstRemainingRow.querySelector('input:not(.v163-row-cb)');
          if (firstInput) {
            try { firstInput.focus(); } catch (e) {}
          }
        }
      }
    });
  }

  function _setupModal(modal) {
    if (modal.dataset.v163Setup === '1') return;
    modal.dataset.v163Setup = '1';
    _injectToolbar(modal);
    _injectAllRows(modal);
    modal.addEventListener('change', function (e) { _onChange(e, modal); });
    modal.addEventListener('click', function (e) { _onClick(e, modal); });
    _refreshToolbar(modal);
  }

  function _retrySetup(maxAttempts, intervalMs) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var modal = document.getElementById('sav2-form-modal');
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

  function _wrapSatirEkle() {
    if (typeof window._saV2UrunSatirEkle !== 'function') {
      console.warn('[V163] _saV2UrunSatirEkle yok — wrap atlandi');
      return false;
    }
    if (window._origSaV2UrunSatirEkle_V163) return true;
    var orig = window._saV2UrunSatirEkle;
    window._origSaV2UrunSatirEkle_V163 = orig;
    window._saV2UrunSatirEkle = function () {
      var r = orig.apply(this, arguments);
      var modal = document.getElementById('sav2-form-modal');
      if (modal) {
        Promise.resolve().then(function () {
          _injectAllRows(modal);
          _refreshToolbar(modal);
        });
      }
      return r;
    };
    return true;
  }

  function _wrapYeniTeklif() {
    if (typeof window._saV2YeniTeklif !== 'function') {
      console.warn('[V163] _saV2YeniTeklif yok — wrap atlandi');
      return false;
    }
    if (window._origSaV2YeniTeklif_V163) return true;
    var orig = window._saV2YeniTeklif;
    window._origSaV2YeniTeklif_V163 = orig;
    window._saV2YeniTeklif = function () {
      var r = orig.apply(this, arguments);
      _retrySetup(5, 100);
      return r;
    };
    return true;
  }

  function _apply() {
    var w1 = _wrapSatirEkle();
    var w2 = _wrapYeniTeklif();
    var modal = document.getElementById('sav2-form-modal');
    if (modal) _setupModal(modal);
    window._v163Status = { wrapSatirEkle: w1, wrapYeniTeklif: w2, applied: true };
    console.log('[V163 alis modal toplu sil] aktif', window._v163Status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
