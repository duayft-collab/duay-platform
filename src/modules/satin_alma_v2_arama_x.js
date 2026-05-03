/**
 * SATIN-ALMA-URUN-ARAMA-X-001 (V160)
 *
 * AMAC: Alis Teklif modal urun arama 3 alan yerine 10 alan + multi-token AND.
 * STRATEJI: window._saV2UrunListHTML override + cache + DOM filter (KX8).
 * KX9: form.js DOKUNULMAZ.
 * EK KRITIK KURAL: kopya YOK, master fn'lere delegate.
 */
(function () {
  'use strict';
  if (window._v160Applied) return;
  window._v160Applied = true;

  function _normalize(s) {
    if (s == null) return '';
    return String(s).toLowerCase()
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
      .replace(/\s+/g, ' ').trim();
  }

  var _masterMap = null, _masterTime = 0;
  function _getMasterMap() {
    var now = Date.now();
    if (_masterMap && (now - _masterTime) < 5000) return _masterMap;
    var map = {};
    try {
      if (typeof window.loadUrunler === 'function') {
        var list = window.loadUrunler({ tumKullanicilar: true }) || [];
        list.forEach(function (u) {
          if (!u) return;
          if (u.duayKodu) map['k:' + u.duayKodu] = u;
          if (u.id) map['i:' + u.id] = u;
          if (u._id) map['i:' + u._id] = u;
        });
      }
    } catch (e) {}
    _masterMap = map; _masterTime = now;
    return map;
  }

  var _fullCache = null, _fullTime = 0;
  function _getFullHTML() {
    var now = Date.now();
    if (_fullCache && (now - _fullTime) < 5000) return _fullCache;
    if (typeof window._origSaV2UrunListHTML !== 'function') return '';
    try { _fullCache = window._origSaV2UrunListHTML(''); _fullTime = now; return _fullCache; }
    catch (e) { return ''; }
  }

  function _enrich(div) {
    var payload = {};
    try { var raw = div.getAttribute('data-p'); if (raw) payload = JSON.parse(raw); } catch (e) {}
    var master = _getMasterMap();
    var fromMaster = master['k:' + payload.duayKodu] || master['i:' + payload.id] || master['i:' + payload._id] || null;
    var merged = Object.assign({}, payload, fromMaster || {});
    if (!merged._domText) merged._domText = (div.textContent || '').trim();
    return merged;
  }

  function _matchItem(div, tokens) {
    var u = _enrich(div);
    var hay = _normalize([u.urunAdi, u.turkceAdi, u.duayKodu, u.saticiKodu, u.tedarikci,
      u.marka, u.mensei, u.birim, u.gtip, u.urunTeslimat, u._domText].filter(Boolean).join(' '));
    return tokens.every(function (t) { return hay.indexOf(t) >= 0; });
  }

  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function _expandedListHTML(deger) {
    if (!deger || !String(deger).trim()) return _getFullHTML();
    var tokens = _normalize(deger).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return _getFullHTML();
    var fullHTML = _getFullHTML();
    if (!fullHTML) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = fullHTML;
    var items = tmp.querySelectorAll('[data-p]');
    var keptHTML = '', matchCount = 0;
    items.forEach(function (item) {
      if (_matchItem(item, tokens)) { keptHTML += item.outerHTML; matchCount++; }
    });
    if (matchCount === 0) {
      return '<div style="padding:24px 16px;text-align:center;color:#94A3B8;font-size:11px;font-style:italic">Eslesme bulunamadi - "' + _esc(deger) + '"</div>';
    }
    return keptHTML;
  }

  function _injectStyles() {
    if (document.getElementById('v160-arama-styles')) return;
    var css = '#sav2-urun-liste{transition:opacity .15s ease}'
            + '#sav2-urun-ara:focus{outline:1px solid var(--t,#0F172A);outline-offset:1px}'
            + '#sav2-urun-liste::-webkit-scrollbar{width:6px}'
            + '#sav2-urun-liste::-webkit-scrollbar-thumb{background:var(--bm,#CBD5E1);border-radius:3px}'
            + '#sav2-urun-liste::-webkit-scrollbar-track{background:transparent}';
    var s = document.createElement('style');
    s.id = 'v160-arama-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function _wrap() {
    var origList = window._saV2UrunListHTML;
    if (typeof origList !== 'function') {
      console.warn('[V160] _saV2UrunListHTML yok, wrap atlandi');
      return false;
    }
    if (window._origSaV2UrunListHTML) return true;
    window._origSaV2UrunListHTML = origList;
    window._saV2UrunListHTML = function (deger) {
      try { return _expandedListHTML(deger); }
      catch (e) { console.warn('[V160] fallback:', e); return origList.call(this, deger); }
    };
    var _t = null;
    window._origSaV2UrunAra = window._saV2UrunAra;
    window._saV2UrunAra = function (deger) {
      clearTimeout(_t);
      _t = setTimeout(function () {
        try {
          var liste = document.getElementById('sav2-urun-liste');
          if (liste) liste.innerHTML = window._saV2UrunListHTML(deger);
        } catch (e) { console.warn('[V160] arama hata:', e); }
      }, 150);
    };
    return true;
  }

  function _apply() {
    _injectStyles();
    var ok = _wrap();
    window._v160Status = { wrap: ok, applied: true };
    console.log('[V160 urun arama-x] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 400); });
  } else {
    setTimeout(_apply, 400);
  }
})();
