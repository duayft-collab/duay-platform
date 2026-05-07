'use strict';
/* ════════════════════════════════════════════════════════════
   src/core/duay_teklif_id.js — Teklif ID Üretici
   V194d-master.1: satin_alma_v2.js:30-37'den taşındı.

   SAHİPLİK: Nötr utility — şu an purchase modülleri kullanıyor
            (form ×2, satis ×2, render ×1) ama format kavramsal
            olarak nötr (kod-tarih). Gelecekte satış teklifi,
            gümrük teklifi vb için de kullanılabilir.

   Format: [MüşteriKod 4 hane]-[YY+AA+GG+SS+DD]
   Örnek:  3230-202604081423
════════════════════════════════════════════════════════════ */

window._saTeklifId = function(musteriKod) {
  var d = new Date();
  var pad = function(n,l){ return String(n).padStart(l||2,'0'); };
  var yy = String(d.getFullYear()).slice(-2);
  var tarih = yy + pad(d.getMonth()+1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
  var kod = String(musteriKod||'0000').slice(-4).padStart(4,'0');
  return kod + '-' + tarih;
};

console.log('[DUAY_TEKLIF_ID] v1.0 yüklendi');
