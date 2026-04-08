'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2_pi.js — Proforma Invoice (PI) Modülü
   3 tasarım: A (Corporate) / B (Modern Blue) / C (Premium Green)
   3 katman: müşteriye giden / şirket içi / yönetici
   Gizli kod: 6 karakter, PI'da gri/küçük
   Adres: K. Dolap Mh. Neşeli Sk. 1/5 Eyüpsultan İSTANBUL
════════════════════════════════════════════════════════════════ */

var PI_ADRES = {
  sirket: 'DUAY GLOBAL LLC',
  adres1: 'K. Dolap Mh. Neşeli Sk. 1/5',
  adres2: 'Eyüpsultan İSTANBUL TÜRKİYE',
  tel: '+90 212 625 5 444',
  wp: '+90 532 270 5113',
  mail: 'brn.simsek@gmail.com'
};

var PI_KOSULLAR = [
  'FOB Istanbul','CIF Destination','EXW Istanbul','CFR Destination',
  'DDP Destination','DAP Destination','FCA Istanbul','CPT Destination',
  'CIP Destination','DPU Destination'
];

var PI_ODEME = [
  '30% Advance, 70% L/C at sight',
  '50% Advance, 50% L/C at sight',
  '100% Advance before shipment',
  'L/C at sight',
  'T/T 30 days after B/L',
  'T/T 60 days after B/L',
  'D/P at sight',
  'Open Account 30 days'
];

/* ── Gizli kod üretici ──────────────────────────────────────── */
window._piGizliKodUret = function() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var kod = '';
  for (var i = 0; i < 6; i++) kod += chars[Math.floor(Math.random() * chars.length)];
  return kod;
};

/* ── PI ana fonksiyon ───────────────────────────────────────── */
window._piOlustur = function(teklif, tasarim, katman) {
  var gizliKod = window._piGizliKodUret();
  var bugun = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  var win = window.open('', '_blank', 'width=960,height=800');
  if (!win) { window.toast?.('Popup engellendi', 'warn'); return; }
  var satirlar = window._piUrunSatirlari(teklif, katman);
  var css = window._piCSS(tasarim);
  var icerikFn = window['_piTasarim' + (tasarim || 'A')];
  var icerik = typeof icerikFn === 'function' ? icerikFn(teklif, bugun, satirlar, katman, gizliKod) : '<div style="padding:40px;text-align:center">Tasarım bulunamadı: ' + (tasarim || 'A') + '</div>';
  win.document.write('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">');
  win.document.write('<title>PI-' + (teklif.teklifId || '') + '</title>');
  win.document.write('<style>' + css + '</style></head><body>');
  win.document.write(icerik);
  win.document.write('<div class="np" style="text-align:center;margin:20px"><button onclick="window.print()" style="font-size:13px;padding:10px 28px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500">Print / Save PDF</button></div>');
  win.document.write('</body></html>');
  win.document.close();
};

/* ── Ürün satırları ─────────────────────────────────────────── */
window._piUrunSatirlari = function(teklif, katman) {
  var urunler = teklif.urunler || [];
  if (!urunler.length && teklif.urunAdi) {
    urunler = [{ duayKodu: teklif.duayKodu || '', urunAdi: teklif.urunAdi || '', miktar: teklif.miktar || 1, alisTl: parseFloat(teklif.alisF) || 0, marj: 33, gorsel: teklif.gorsel || '' }];
  }
  return urunler.map(function(u, i) {
    var satisF = (u.alisTl * (1 + (u.marj || 33) / 100)).toFixed(2);
    var toplam = (satisF * (u.miktar || 1)).toFixed(2);
    return { no: i + 1, kod: u.duayKodu || '', ad: u.urunAdi || '', miktar: u.miktar || 1, birim: 'PCS', satisF: satisF, toplam: toplam, gorsel: u.gorsel || '' };
  });
};

/* ── Ortak CSS ──────────────────────────────────────────────── */
window._piCSS = function(tasarim) {
  return '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:32px}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:8px;text-align:left;border-bottom:1px solid #111}'
    + 'td{font-size:11px;padding:8px;border-bottom:0.5px solid #f0f0f0}'
    + '.gizli-kod{position:fixed;bottom:12px;right:16px;font-size:8px;color:#ccc;font-family:monospace;letter-spacing:.1em}'
    + '@media print{.np{display:none}.gizli-kod{position:fixed;bottom:8px;right:12px}}'
    + (tasarim === 'B' ? '.accent{color:#185FA5}.total-box{background:#185FA5;color:#fff;padding:8px 16px;border-radius:4px}' : '')
    + (tasarim === 'C' ? '.accent{color:#1D9E75}.top-bar{height:6px;background:#1D9E75;margin:-32px -32px 24px}' : '');
};

console.log('[PI] v1.0 yüklendi — 3 tasarim hazir');
