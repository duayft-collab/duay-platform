'use strict';
/* ════════════════════════════════════════════════════════════
   src/core/duay_kur_master.js — Kur Master
   V194d-master.1: satin_alma_v2.js:109-138'den taşındı.

   SAHİPLİK: Globally shared (purchase + finance + odemeler +
            nakit_akis + cash_flow + hesap_makinesi + muavin_parse
            + satis_teklif — 11 modül). Hiçbir tek modül sahipleyemez.

   - window._saKur initial declaration (geriye uyumlu global)
   - window._saKurCek() — Frankfurter API
   - window.DUAY_KUR write + Firestore sync (database.js bağımlılığı)

   KX10: Ortak veri tek kaynak.
   KX11: Modül globally shared veri sahipleyemez.
════════════════════════════════════════════════════════════ */

window._saKur = window._saKur || { USD:44.55, EUR:51.70, GBP:59.30, CNY:6.20, TRY:1, _son:null };
window._saKurCek = function() {
  var simdi = Date.now();
  if(window._saKur._son && simdi - window._saKur._son < 3600000) return;
  fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP')
    .then(function(r){return r.json();})
    .then(function(d){
      if(d&&d.rates){
        window._saKur.USD = d.rates.TRY||44.55;
        window._saKur.EUR = d.rates.TRY/d.rates.EUR||51.70;
        window._saKur.GBP = d.rates.TRY/d.rates.GBP||59.30;
        window._saKur.CNY = d.rates.TRY/7.2||6.20;
        window._saKur.TRY = 1;
        window._saKur._son = Date.now();
        console.log('[KUR] Güncellendi:', {USD:window._saKur.USD.toFixed(2), EUR:window._saKur.EUR.toFixed(2), GBP:window._saKur.GBP.toFixed(2)});
        // KUR-MERKEZI-001: merkezi kur objesi + Firestore sync
        window.DUAY_KUR = { USD: window._saKur.USD, EUR: window._saKur.EUR, GBP: window._saKur.GBP, CNY: window._saKur.CNY, TRY: 1, _ts: new Date().toISOString() };
        if (typeof _write === 'function') _write('ak_doviz_kur', window.DUAY_KUR);
        var _kurFp = typeof _fsPath === 'function' ? _fsPath('kur') : null;
        if (_kurFp && typeof _syncFirestore === 'function') _syncFirestore(_kurFp, window.DUAY_KUR);
      }
    })
    .catch(function(e){
      console.warn('[KUR] API hatası, fallback kullanılıyor:', e.message);
    });
};
window._saKurCek();
console.log('[DUAY_KUR_MASTER] v1.0 yüklendi');
