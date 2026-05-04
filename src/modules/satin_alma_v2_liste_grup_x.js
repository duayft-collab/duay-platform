/**
 * SATIN-ALMA-LISTE-GRUP-001 (V166 / Talep 2)
 *
 * Alis Teklifleri Listesi — Ana teklif kartlari altinda alt urun satirlari
 * default kapali, ana karta tikla → expand/collapse.
 *
 * STRATEJI: V164 deseni — _saV2RenderMain wrap (window expose VAR) + 5x150ms retry.
 *
 * V166.1 DUZELTMELER (kullanici onay):
 *   - container bazli v166Done flag KALDIRILDI — row bazli idempotent
 *   - ANA tespiti SADELESTIRILDI — sadece +N badge (status text fragile)
 *   - HEADER tespiti DARALTILDI — includes('ÜRÜN /') (slash ile, false-positive yok)
 *   - Click handler basina e.defaultPrevented kontrol (event bubble defansi)
 *
 * STATE PERSISTENCE YOK — her render default kapali.
 *
 * KX9: render.js DOKUNULMAZ — sadece wrap.
 * KX8: Mevcut HTML kopyalanmadi — DOM injection.
 * EK KRITIK KURAL: kopya YOK.
 */
(function () {
  'use strict';
  if (window._v166Applied) return;
  window._v166Applied = true;

  function _findListeContainer() {
    var panel = document.getElementById('panel-satin-alma');
    if (!panel) return null;
    var divs = panel.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var d = divs[i];
      var style = d.getAttribute('style') || '';
      if (d.children.length >= 5 && style.indexOf('overflow-y:auto') >= 0) {
        return d;
      }
    }
    return null;
  }

  var PLUS_RX = /\+\d+/;
  var IDX_RX = /^\d+[\.\)]/;

  function _classifyRow(row) {
    var txt = (row.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt.toUpperCase().indexOf('ÜRÜN /') >= 0) {
      return 'HEADER';
    }
    if (PLUS_RX.test(txt)) return 'ANA';
    if (IDX_RX.test(txt)) return 'ALT';
    return 'OTHER';
  }

  function _toggleGroup(anaRow) {
    var expanded = anaRow.dataset.v166Expanded === '1';
    var newState = !expanded;
    anaRow.dataset.v166Expanded = newState ? '1' : '0';

    var sibling = anaRow.nextElementSibling;
    while (sibling) {
      var k = _classifyRow(sibling);
      if (k === 'ANA') break;
      if (k === 'ALT') {
        sibling.style.display = newState ? '' : 'none';
      }
      sibling = sibling.nextElementSibling;
    }

    var icon = anaRow.querySelector('.v166-toggle-icon');
    if (icon) icon.textContent = newState ? '▼' : '▶';
  }

  function _setupAnaRow(row) {
    if (row.dataset.v166Setup === '1') return;
    row.dataset.v166Setup = '1';
    row.dataset.v166Expanded = '0';

    if (row.style.cursor !== 'pointer') row.style.cursor = 'pointer';

    var icon = document.createElement('span');
    icon.className = 'v166-toggle-icon';
    icon.textContent = '▶';
    icon.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;font-size:9px;color:#94A3B8;margin-right:6px;flex-shrink:0;transition:color .12s ease;pointer-events:none;font-variant-numeric:tabular-nums';

    var firstCell = row.firstElementChild;
    if (firstCell) {
      if (firstCell.style.display !== 'flex') {
        firstCell.style.display = 'flex';
        firstCell.style.alignItems = 'center';
      }
      firstCell.insertBefore(icon, firstCell.firstChild);
    }

    row.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      var t = e.target;
      while (t && t !== row) {
        if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') {
          return;
        }
        t = t.parentElement;
      }
      _toggleGroup(row);
    });
  }

  function _setupAltRow(row) {
    if (row.dataset.v166Setup === '1') return;
    row.dataset.v166Setup = '1';
    row.style.display = 'none';
  }

  function _processListe() {
    var lc = _findListeContainer();
    if (!lc) return false;

    var rows = Array.from(lc.children);
    var anaCount = 0;
    var altCount = 0;
    var skipCount = 0;
    rows.forEach(function (row) {
      if (row.dataset.v166Setup === '1') {
        skipCount++;
        return;
      }
      var k = _classifyRow(row);
      if (k === 'ANA') {
        _setupAnaRow(row);
        anaCount++;
      } else if (k === 'ALT') {
        _setupAltRow(row);
        altCount++;
      }
    });

    if (anaCount > 0 || altCount > 0) {
      console.log('[V166] processed: ana=' + anaCount + ' alt=' + altCount + ' skip=' + skipCount);
    }
    return true;
  }

  function _retrySetup(maxAttempts, intervalMs) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var lc = _findListeContainer();
      if (lc) {
        _processListe();
        clearInterval(iv);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(iv);
      }
    }, intervalMs);
  }

  function _wrapRenderMain() {
    if (typeof window._saV2RenderMain !== 'function') {
      console.warn('[V166] _saV2RenderMain yok — wrap atlandi');
      return false;
    }
    if (window._origSaV2RenderMain_V166) return true;
    var orig = window._saV2RenderMain;
    window._origSaV2RenderMain_V166 = orig;
    window._saV2RenderMain = function () {
      var r = orig.apply(this, arguments);
      _retrySetup(5, 150);
      return r;
    };
    return true;
  }

  function _wrapRenderSatinAlmaV2() {
    if (typeof window.renderSatinAlmaV2 !== 'function') return false;
    if (window._origRenderSatinAlmaV2_V166) return true;
    var orig = window.renderSatinAlmaV2;
    window._origRenderSatinAlmaV2_V166 = orig;
    window.renderSatinAlmaV2 = function () {
      var r = orig.apply(this, arguments);
      _retrySetup(5, 150);
      return r;
    };
    return true;
  }

  function _apply() {
    var w1 = _wrapRenderMain();
    var w2 = _wrapRenderSatinAlmaV2();
    _retrySetup(5, 150);
    window._v166Status = { wrapRenderMain: w1, wrapRenderSatinAlmaV2: w2, applied: true };
    console.log('[V166 alis liste grup kart] aktif', window._v166Status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 600); });
  } else {
    setTimeout(_apply, 600);
  }
})();
