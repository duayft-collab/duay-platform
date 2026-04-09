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

/* ── Çok Dilli PI Etiketleri ────────────────────────────────── */
var PI_DILLER = {
  EN: { sirket:'DUAY GLOBAL LLC', piNo:'PI No', tarih:'Date', gecerli:'Valid until', revNo:'Rev', alici:'Bill To', kosullar:'Terms', incoterms:'Incoterms', odeme:'Payment', teslimat:'Delivery', urun:'Item Description', miktar:'Qty', birim:'Unit', birimFiyat:'Unit Price', tutar:'Amount', toplam:'TOTAL', imza:'Authorized Signature', not:'This is a Proforma Invoice only.', eskiKod:'Old Code' },
  CN: { sirket:'DUAY GLOBAL LLC', piNo:'形式发票号', tarih:'日期', gecerli:'有效期至', revNo:'版本', alici:'买方', kosullar:'条款', incoterms:'国际贸易术语', odeme:'付款方式', teslimat:'交货期', urun:'商品描述', miktar:'数量', birim:'单位', birimFiyat:'单价', tutar:'金额', toplam:'合计', imza:'授权签名', not:'本文件仅为形式发票。', eskiKod:'旧产品编码' },
  AR: { sirket:'DUAY GLOBAL LLC', piNo:'رقم الفاتورة المبدئية', tarih:'التاريخ', gecerli:'صالح حتى', revNo:'النسخة', alici:'المشتري', kosullar:'الشروط', incoterms:'شروط التسليم', odeme:'شروط الدفع', teslimat:'موعد التسليم', urun:'وصف البضاعة', miktar:'الكمية', birim:'الوحدة', birimFiyat:'سعر الوحدة', tutar:'المبلغ', toplam:'المجموع', imza:'التوقيع المعتمد', not:'هذه الوثيقة فاتورة مبدئية فقط.', eskiKod:'الرمز القديم' },
  RU: { sirket:'DUAY GLOBAL LLC', piNo:'№ проформы', tarih:'Дата', gecerli:'Действительно до', revNo:'Ред.', alici:'Покупатель', kosullar:'Условия', incoterms:'Инкотермс', odeme:'Условия оплаты', teslimat:'Поставка', urun:'Описание товара', miktar:'Кол-во', birim:'Ед.', birimFiyat:'Цена за ед.', tutar:'Сумма', toplam:'ИТОГО', imza:'Уполномоченная подпись', not:'Настоящий документ является только проформой.', eskiKod:'Старый код' }
};

/* ── PI ana fonksiyon ───────────────────────────────────────── */
window._piOlustur = function(teklif, tasarim, katman) {
  var gizliKod = window._piGizliKodUret();
  var dil = teklif.dil || 'EN';
  var L = PI_DILLER[dil] || PI_DILLER.EN;
  var bugun = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  var win = window.open('', '_blank', 'width=960,height=800');
  if (!win) { window.toast?.('Popup engellendi', 'warn'); return; }
  var satirlar = window._piUrunSatirlari(teklif, katman);
  var css = window._piCSS(tasarim);
  var icerikFn = window['_piTasarim' + (tasarim || 'A')];
  var icerik = typeof icerikFn === 'function' ? icerikFn(teklif, bugun, satirlar, katman, gizliKod, L) : '<div style="padding:40px;text-align:center">Tasarım bulunamadı: ' + (tasarim || 'A') + '</div>';
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
    return { no: i+1, kod: u.duayKodu||u.kod||'', eskiKod: u.eskiKod||'', ad: u.urunAdi||u.ad||'', miktar: u.miktar||1, birim: u.birim||'PCS', satisF: satisF, toplam: toplam, gorsel: u.gorsel||'' };
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

/* ── Tasarım A — Corporate (siyah-beyaz klasik) ────────────── */
window._piTasarimA = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var toplamSatis = satirlar.reduce(function(a, s) { return a + parseFloat(s.toplam); }, 0).toFixed(2);
  var h = '<div style="padding:28px 32px 20px;border-bottom:2px solid #111">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
  h += '<div><div style="font-size:22px;font-weight:700;letter-spacing:.5px">' + PI_ADRES.sirket + '</div>';
  h += '<div style="font-size:9px;color:#666;margin-top:3px">International Trade</div>';
  h += '<div style="font-size:9px;color:#666;margin-top:8px;line-height:1.8">' + PI_ADRES.adres1 + '<br>' + PI_ADRES.adres2 + '<br>Tel: ' + PI_ADRES.tel + '<br>' + PI_ADRES.mail + '</div></div>';
  h += '<div style="text-align:right">';
  h += '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em">Proforma Invoice</div>';
  h += '<div style="font-size:18px;font-weight:700;font-family:monospace;margin-top:2px">' + (t.teklifId || '') + '</div>';
  h += '<div style="font-size:9px;color:#888;margin-top:4px;line-height:1.8">Date: ' + bugun + '<br>Valid: 30 days<br>Rev: ' + (t.revNo || '01') + '</div>';
  h += '</div></div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:0.5px solid #eee">';
  h += '<div style="padding:14px 32px;border-right:0.5px solid #eee">';
  h += '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">' + L.alici + '</div>';
  h += '<div style="font-size:13px;font-weight:500">' + (t.musteriAd || '—') + '</div>';
  h += '<div style="font-size:10px;color:#555;margin-top:2px">Code: ' + (t.musteriKod || '—') + '</div></div>';
  h += '<div style="padding:14px 32px">';
  h += '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">' + L.kosullar + '</div>';
  h += '<div style="font-size:10px;color:#333;line-height:1.8">' + (t.teslim || 'FOB Istanbul') + '<br>' + (t.odeme || '30% Advance, 70% L/C') + '</div></div></div>';
  h += '<div style="padding:0 32px"><table><thead><tr>';
  h += '<th style="width:32px">#</th><th>' + L.urun + '</th><th style="width:55px">' + L.miktar + '</th><th style="width:55px">' + L.birim + '</th><th style="width:90px;text-align:right">' + L.birimFiyat + '</th><th style="width:100px;text-align:right">' + L.tutar + '</th>';
  h += '</tr></thead><tbody>';
  satirlar.forEach(function(s) { h += '<tr><td style="color:#aaa">' + s.no + '</td><td><div style="font-weight:500">' + s.ad + '</div><div style="font-size:9px;color:#888">' + s.kod + '</div>' + (s.eskiKod?'<div style="font-size:9px;color:#888">'+(L.eskiKod||'Old Code')+': '+s.eskiKod+'</div>':'') + '</td><td>' + s.miktar + '</td><td>' + s.birim + '</td><td style="text-align:right">$' + s.satisF + '</td><td style="text-align:right;font-weight:500">$' + s.toplam + '</td></tr>'; });
  h += '</tbody></table></div>';
  h += '<div style="display:flex;justify-content:flex-end;padding:14px 32px;border-top:0.5px solid #eee">';
  h += '<div style="text-align:right"><div style="font-size:14px;font-weight:700;border-top:1px solid #111;padding-top:8px;margin-top:4px">' + L.toplam + ' USD ' + toplamSatis + '</div></div></div>';
  h += '<div style="padding:10px 32px 24px;border-top:0.5px solid #eee">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-end">';
  h += '<div style="border-top:0.5px solid #aaa;width:160px;text-align:center;padding-top:5px;font-size:9px;color:#666">' + L.imza + '</div>';
  h += '<div style="font-size:8px;color:#bbb">' + L.not + '</div>';
  h += '</div></div>';
  h += '<div class="gizli-kod">' + gizliKod + '</div>';
  return h;
};

/* ── Tasarım B — Modern Blue (Duay mavisi accent) ──────────── */
window._piTasarimB = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var toplamSatis = satirlar.reduce(function(a, s) { return a + parseFloat(s.toplam); }, 0).toFixed(2);
  var h = '<div style="background:#185FA5;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start">';
  h += '<div><div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.3px">' + PI_ADRES.sirket + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:3px">' + PI_ADRES.adres1 + ' · ' + PI_ADRES.adres2 + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:2px">' + PI_ADRES.tel + ' · ' + PI_ADRES.mail + '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#B5D4F4;text-transform:uppercase;letter-spacing:.08em">Proforma Invoice</div>';
  h += '<div style="font-size:16px;font-weight:700;color:#fff;font-family:monospace;margin-top:2px">' + (t.teklifId || '') + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:3px">' + bugun + ' · Rev ' + (t.revNo || '01') + '</div></div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;padding:14px 28px;gap:20px;border-bottom:0.5px solid #eee">';
  h += '<div style="border-left:3px solid #185FA5;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.alici + '</div>';
  h += '<div style="font-size:12px;font-weight:500">' + (t.musteriAd || '—') + '</div>';
  h += '<div style="font-size:10px;color:#555;margin-top:1px">Code: ' + (t.musteriKod || '—') + '</div></div>';
  h += '<div style="border-left:3px solid #185FA5;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.kosullar + '</div>';
  h += '<div style="font-size:10px;color:#333;line-height:1.8">' + (t.teslim || 'FOB Istanbul') + '<br>' + (t.odeme || '30% Advance, 70% L/C') + '</div></div></div>';
  h += '<div style="padding:0 28px"><table><thead><tr style="background:#E6F1FB">';
  h += '<th style="color:#0C447C;width:32px">#</th><th style="color:#0C447C">' + L.urun + '</th><th style="color:#0C447C;width:55px">' + L.miktar + '</th><th style="color:#0C447C;width:55px">' + L.birim + '</th><th style="color:#0C447C;width:90px;text-align:right">' + L.birimFiyat + '</th><th style="color:#0C447C;width:100px;text-align:right">' + L.tutar + '</th>';
  h += '</tr></thead><tbody>';
  satirlar.forEach(function(s) { h += '<tr><td style="color:#aaa">' + s.no + '</td><td><div style="font-weight:500">' + s.ad + '</div><div style="font-size:9px;color:#888">' + s.kod + '</div>' + (s.eskiKod?'<div style="font-size:9px;color:#888">'+(L.eskiKod||'Old Code')+': '+s.eskiKod+'</div>':'') + '</td><td>' + s.miktar + '</td><td>' + s.birim + '</td><td style="text-align:right">$' + s.satisF + '</td><td style="text-align:right;font-weight:500;color:#185FA5">$' + s.toplam + '</td></tr>'; });
  h += '</tbody></table></div>';
  h += '<div style="display:flex;justify-content:flex-end;align-items:center;padding:12px 28px;border-top:0.5px solid #eee;gap:24px">';
  h += '<div style="background:#185FA5;color:#fff;padding:8px 20px;border-radius:4px;font-size:14px;font-weight:700">' + L.toplam + ': USD ' + toplamSatis + '</div></div>';
  h += '<div style="padding:10px 28px 20px;display:flex;justify-content:space-between;align-items:flex-end">';
  h += '<div style="border-top:0.5px solid #aaa;width:160px;text-align:center;padding-top:5px;font-size:9px;color:#666">' + L.imza + '</div>';
  h += '<div style="font-size:8px;color:#bbb">' + L.not + '</div>';
  h += '</div>';
  h += '<div class="gizli-kod">' + gizliKod + '</div>';
  return h;
};

/* ── Tasarım C — Premium Green (yeşil top bar + grid layout) ─ */
window._piTasarimC = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var toplamSatis = satirlar.reduce(function(a, s) { return a + parseFloat(s.toplam); }, 0).toFixed(2);
  var h = '<div style="height:6px;background:#1D9E75;margin:-32px -32px 24px"></div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:0.5px solid #eee;padding-bottom:16px;margin-bottom:16px">';
  h += '<div><div style="font-size:9px;font-weight:700;color:#1D9E75;text-transform:uppercase;letter-spacing:.12em;margin-bottom:5px">Proforma Invoice</div>';
  h += '<div style="font-size:10px;color:#555;line-height:1.8">No: <strong style="font-family:monospace">' + (t.teklifId || '') + '</strong><br>Date: ' + bugun + '<br>Valid: 30 days · Rev: ' + (t.revNo || '01') + '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:18px;font-weight:700;letter-spacing:.3px">' + PI_ADRES.sirket + '</div>';
  h += '<div style="font-size:9px;color:#888;margin-top:3px">' + PI_ADRES.adres1 + ' · ' + PI_ADRES.adres2 + '</div>';
  h += '<div style="font-size:9px;color:#888">' + PI_ADRES.tel + ' · ' + PI_ADRES.mail + '</div></div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">';
  h += '<div style="border-left:3px solid #1D9E75;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#1D9E75;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.alici + '</div>';
  h += '<div style="font-size:12px;font-weight:500">' + (t.musteriAd || '—') + '</div>';
  h += '<div style="font-size:10px;color:#666;margin-top:1px">Code: ' + (t.musteriKod || '—') + '</div></div>';
  h += '<div style="border-left:3px solid #1D9E75;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#1D9E75;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.kosullar + '</div>';
  h += '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:10px">';
  h += '<span style="color:#888">' + L.incoterms + '</span><span>' + (t.teslim || 'FOB Istanbul') + '</span>';
  h += '<span style="color:#888">' + L.odeme + '</span><span>' + (t.odeme || '30% Advance, 70% L/C') + '</span>';
  h += '</div></div></div>';
  h += '<table><thead><tr style="border-bottom:1px solid #1D9E75">';
  h += '<th style="color:#1D9E75;width:32px">#</th><th style="color:#1D9E75">' + L.urun + '</th><th style="color:#1D9E75;width:55px">' + L.miktar + '</th><th style="color:#1D9E75;width:55px">' + L.birim + '</th><th style="color:#1D9E75;width:90px;text-align:right">' + L.birimFiyat + '</th><th style="color:#1D9E75;width:100px;text-align:right">' + L.tutar + '</th>';
  h += '</tr></thead><tbody>';
  satirlar.forEach(function(s) { h += '<tr><td style="color:#aaa">' + s.no + '</td><td><div style="font-weight:500">' + s.ad + '</div><div style="font-size:9px;color:#888">' + s.kod + '</div>' + (s.eskiKod?'<div style="font-size:9px;color:#888">'+(L.eskiKod||'Old Code')+': '+s.eskiKod+'</div>':'') + '</td><td>' + s.miktar + '</td><td>' + s.birim + '</td><td style="text-align:right">USD ' + s.satisF + '</td><td style="text-align:right;font-weight:500">' + s.toplam + '</td></tr>'; });
  h += '</tbody></table>';
  h += '<div style="border-top:1px solid #1D9E75;padding-top:12px;margin-top:0;display:flex;justify-content:space-between;align-items:baseline">';
  h += '<div style="font-size:8px;color:#aaa">All amounts in USD</div>';
  h += '<div style="font-size:15px;font-weight:700">' + L.toplam + ': USD ' + toplamSatis + '</div></div>';
  h += '<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end">';
  h += '<div style="border-top:0.5px solid #aaa;width:160px;text-align:center;padding-top:5px;font-size:9px;color:#666">' + L.imza + '</div>';
  h += '<div style="font-size:8px;color:#bbb">' + L.not + '</div>';
  h += '</div>';
  h += '<div class="gizli-kod">' + gizliKod + '</div>';
  return h;
};

/* ── SA-V2-PIPELINE-001: Teklif Durum Pipeline ─────────────── */
var ST_DURUMLAR = ['taslak','gonderildi','inceliyor','kabul','reddedildi','revizyon'];
var ST_DURUM_LBL = {taslak:'Taslak',gonderildi:'Gönderildi',inceliyor:'İnceliyor',kabul:'Kabul',reddedildi:'Reddedildi',revizyon:'Revizyon İstedi'};
var ST_DURUM_RENK = {taslak:'#888780',gonderildi:'#185FA5',inceliyor:'#854F0B',kabul:'#0F6E56',reddedildi:'#A32D2D',revizyon:'#534AB7'};

window._steklifDurumGuncelle = function(id, yeniDurum) {
  var teklifler = window._saTeklifLoad?.() || [];
  var t = teklifler.find(function(x){return x.id===id;});
  if (!t) { window.toast?.('Teklif bulunamadı','warn'); return; }
  var eskiDurum = t.durum;
  t.durum = yeniDurum;
  t.updatedAt = window._saNow?.();
  if (yeniDurum === 'gonderildi' && !t.gonderimTarih) t.gonderimTarih = window._saNow?.();
  if (yeniDurum === 'kabul') t.kabulTarih = window._saNow?.();
  if (yeniDurum === 'reddedildi') t.redTarih = window._saNow?.();
  window._saTeklifStore?.(teklifler);
  if (typeof window.logActivity === 'function') window.logActivity('TEKLIF_DURUM',{id:id,eski:eskiDurum,yeni:yeniDurum});
  window.toast?.('Durum güncellendi: '+ST_DURUM_LBL[yeniDurum],'ok');
};

window._steklifDurumPanelHTML = function(teklif) {
  if (!teklif) return '';
  var h = '<div style="background:var(--s2);border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:8px">DURUM PIPELINE</div>';
  h += '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">';
  ST_DURUMLAR.forEach(function(d) {
    var aktif = teklif.durum === d;
    var renk = ST_DURUM_RENK[d]||'#888';
    h += '<button onclick="event.stopPropagation();window._steklifDurumGuncelle(\''+teklif.id+'\',\''+d+'\')" ';
    h += 'style="font-size:9px;padding:4px 8px;border-radius:4px;cursor:pointer;font-family:inherit;font-weight:'+(aktif?'500':'400')+';';
    h += 'background:'+(aktif?renk:'transparent')+';color:'+(aktif?'#fff':renk)+';border:0.5px solid '+renk+'">'+ST_DURUM_LBL[d]+'</button>';
  });
  h += '</div></div>';
  return h;
};

/* ── SA-V2-REVIZYON-001: Rev Numarası Increment + Geçmiş ──── */
window._steklifRevNo = function(id) {
  var teklifler = window._saTeklifLoad?.() || [];
  var t = teklifler.find(function(x) { return x.id === id; });
  if (!t) return;
  var mevcutRev = parseInt(t.revNo || '01', 10);
  var yeniRev = String(mevcutRev + 1).padStart(2, '0');
  if (!t.revGecmisi) t.revGecmisi = [];
  t.revGecmisi.push({
    revNo: t.revNo || '01',
    tarih: window._saNow?.(),
    kullanici: window._saCu?.()?.displayName || '',
    snapshot: JSON.stringify({ urunler: t.urunler, teslim: t.teslim, odeme: t.odeme, musteriAd: t.musteriAd })
  });
  t.revNo = yeniRev;
  t.updatedAt = window._saNow?.();
  window._saTeklifStore?.(teklifler);
  window.toast?.('Rev ' + yeniRev + ' oluşturuldu', 'ok');
  return yeniRev;
};

window._steklifRevGecmisHTML = function(teklif) {
  if (!teklif || !teklif.revGecmisi || !teklif.revGecmisi.length) return '';
  var h = '<div style="background:var(--s2);border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:6px">REVİZYON GEÇMİŞİ — Mevcut: Rev ' + (teklif.revNo || '01') + '</div>';
  teklif.revGecmisi.slice().reverse().forEach(function(r) {
    h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5px solid var(--b)">';
    h += '<span style="font-size:9px;font-family:monospace;background:#E6F1FB;color:#0C447C;padding:1px 6px;border-radius:3px;font-weight:500">Rev ' + r.revNo + '</span>';
    h += '<span style="font-size:9px;color:var(--t3)">' + (r.tarih || '').slice(0, 16).replace('T', ' ') + '</span>';
    h += '<span style="font-size:9px;color:var(--t2)">' + (typeof _saEsc === 'function' ? _saEsc(r.kullanici || '') : (r.kullanici || '')) + '</span>';
    h += '<button onclick="event.stopPropagation();window._steklifRevGoster(\'' + encodeURIComponent(r.snapshot || '{}') + '\')" style="font-size:9px;padding:1px 6px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3);margin-left:auto">Gör</button>';
    h += '</div>';
  });
  h += '</div>';
  return h;
};

window._steklifRevGoster = function(encodedSnap) {
  try {
    var snap = JSON.parse(decodeURIComponent(encodedSnap));
    window.toast?.('Rev snapshot: ' + JSON.stringify(snap).slice(0, 80) + '...', 'info');
  } catch(e) { window.toast?.('Snapshot okunamadı', 'warn'); }
};

console.log('[PI] v1.0 yüklendi — 3 tasarim hazir');
