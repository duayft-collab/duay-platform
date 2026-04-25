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
  AR: { sirket:'DUAY GLOBAL LLC', piNo:'رقم الفاتورة المبدئية', tarih:'التاريخ', gecerli:'صالح حتى', revNo:'النسخة', alici:'المشتري', kosullar:'الشروط', incoterms:'شروط التسليم', odeme:'شروط الدفع', teslimat:'موعد التسليم', urun:'وصف البضاعة', miktar:'الكمية', birim:'الوحدة', birimFiyat:'سعر الوحدة', tutar:'المبلغ', toplam:'المجموع', imza:'التوقيع المعتمد', not:'هذه الوثيقة فاتورة مبدئية فقط.', eskiKod:'الرمز القديم', baslik:'عرض السعر المبدئي', teslim:'شروط التسليم', gecerlilik:'صالح حتى', para:'العملة', no:'#', sartlar:'الشروط والأحكام', gorselNot:'صور المنتجات للتوضيح فقط.', tarihMuhur:'التاريخ والختم' }
};

/* ── PI ana fonksiyon ───────────────────────────────────────── */
window._piOlustur = function(teklif, tasarim, katman) {
  /* PDF-HARMONIZE-001: V2 form (gecerlilik/teslim/odeme) ↔ inline (gecerlilikTarihi/teslimSekli/odemeKosulu)
     şema fallback + cari lookup. _piTasarimA/B/C/I/L/O fonksiyonları teklif.* okuyor —
     üst seviyede tek truth source ile zenginleştir. */
  if (typeof window._pdfTeklifNormalize === 'function') {
    var n = window._pdfTeklifNormalize(teklif);
    if (n) {
      teklif.gecerlilik     = n.gecerlilik;
      teklif.teslim         = n.teslim;
      teklif.odeme          = n.odeme;
      teklif.sartlar        = n.sartlar;
      teklif.musteriKod     = n.musteriKod || teklif.musteriKod;
      teklif.musteriAdres   = n.musteriAdres || teklif.musteriAdres;
      teklif.musteriVergiNo = n.musteriVergiNo || teklif.musteriVergiNo;
      teklif.revNo          = n.revNo;
    }
  }
  var gizliKod = window._piGizliKodUret();
  var dil = teklif.dil || 'EN';
  var L = PI_DILLER[dil] || PI_DILLER.EN;
  var bugun = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  var win = window.open('', '_blank', 'width=960,height=800') || (function(){ var f=document.getElementById('_piFrame'); if(!f){f=document.createElement('iframe');f.id='_piFrame';f.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:none;z-index:9999;background:#fff';document.body.appendChild(f);} return f.contentWindow; })();
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
  if(teklif && teklif.id) {
    var mevcutDurum = teklif.durum||'taslak';
    if(mevcutDurum==='taslak'||mevcutDurum==='revizyon') {
      window._steklifDurumGuncelle?.(teklif.id, 'gonderildi');
      var teklifler = window._saTeklifLoad?.() || [];
      var idx = teklifler.findIndex(function(t){return String(t.id)===String(teklif.id);});
      if(idx>-1){
        teklifler[idx].gonderimTarih = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'});
        teklifler[idx].gonderenAd = window.CU?.()?.displayName||window.CU?.()?.email||'';
        teklifler[idx].gonderenId = window.CU?.()?.uid||'';
        teklifler[idx].pdfTasarim = tasarim||'A';
        window._saTeklifStore?.(teklifler);
        window.toast?.('Teklif "Gönderildi" olarak işaretlendi','ok');
        // SATIS-NOTIF-001: gönderildi durumuna geçiş bildirimi
        var _teklifNo = teklif.teklifId || ('#' + teklif.id);
        var _musteri = teklif.musteriAd || teklifler[idx].musteriAd || '';
        window.addNotif?.('📤', 'Satış teklifi müşteriye iletildi: ' + _musteri, 'ok', 'satis');
        window.logActivity?.('satis', 'Satış teklifi gönderildi: ' + _teklifNo);
      }
    }
  }
};

/* ── Ürün satırları (PI-FIYAT-001: form-set fiyat önceliği + number safety) ── */
window._piUrunSatirlari = function(teklif, katman) {
  var urunler = teklif.urunler || [];
  if (!urunler.length && teklif.urunAdi) {
    urunler = [{ duayKodu: teklif.duayKodu || '', urunAdi: teklif.urunAdi || '', miktar: teklif.miktar || 1, alisTl: parseFloat(teklif.alisF) || 0, marj: 33, gorsel: teklif.gorsel || '' }];
  }
  return urunler.map(function(u, i) {
    var miktar = parseFloat(u.miktar) || 1;
    /* Alış öncelik: alisHedef (form'da kur çevrilmiş) > alisTl > alisF */
    var alis = parseFloat(u.alisHedef != null ? u.alisHedef : (u.alisTl != null ? u.alisTl : u.alisF)) || 0;
    var marj = parseFloat(u.marj);
    if (isNaN(marj)) marj = 33;
    /* Satış öncelik: satisFiyat (form'da set edilen) > alisHedef × marj */
    var satisNum = (u.satisFiyat != null && !isNaN(parseFloat(u.satisFiyat)))
      ? parseFloat(u.satisFiyat)
      : alis * (1 + marj / 100);
    /* Toplam öncelik: u.toplam (form'dan) > satisNum × miktar */
    var toplamNum = (u.toplam != null && !isNaN(parseFloat(u.toplam)))
      ? parseFloat(u.toplam)
      : satisNum * miktar;
    var satisF = satisNum.toFixed(2);
    var toplam = toplamNum.toFixed(2);
    return { no: i+1, kod: u.duayKodu||u.kod||'', eskiKod: u.eskiKod||'', ad: u.urunAdi||u.ad||'', miktar: miktar, birim: u.birim||'PCS', satisF: satisF, toplam: toplam, gorsel: u.gorsel||'' };
  });
};

/* ── Ortak CSS ──────────────────────────────────────────────── */
window._piCSS = function(tasarim) {
  /* FEAT-07d: tarayıcı native header/footer gizle — 6 tasarım (A/B/C/I/L/O) için ortak @page */
  return '@page { size: A4; margin: 0 }'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:32px}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:8px;text-align:left;border-bottom:1px solid #111}'
    + 'td{font-size:11px;padding:8px;border-bottom:0.5px solid #f0f0f0}'
    + '.gizli-kod{position:fixed;bottom:12px;right:16px;font-size:8px;color:#ccc;font-family:monospace;letter-spacing:.1em}'
    + '@media print{.np{display:none}.gizli-kod{position:fixed;bottom:8px;right:12px}}'
    + (tasarim === 'B' ? '.accent{color:#185FA5}.total-box{background:#185FA5;color:#fff;padding:8px 16px;border-radius:4px}' : '')
    + (tasarim === 'C' ? '.accent{color:#1D9E75}.top-bar{height:6px;background:#1D9E75;margin:-32px -32px 24px}' : '')
    + (tasarim === 'I' ? '.accent{color:#7C3AED}.top-bar{height:4px;background:#7C3AED;margin:-32px -32px 24px}.total-box{background:#7C3AED;color:#fff;padding:8px 16px}' : '')
    + (tasarim === 'L' ? '.accent{color:#DC2626}.header-line{border-bottom:3px double #DC2626!important}.total-box{border:2px solid #DC2626;padding:8px 16px}' : '')
    + (tasarim === 'O' ? 'body{background:#FFFBEB}.accent{color:#D97706}.top-bar{height:8px;background:#D97706;margin:-32px -32px 24px}.total-box{background:#D97706;color:#fff;padding:8px 16px}' : '');
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
  var t = teklifler.find(function(x){return String(x.id)===String(id);});
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

window._steklifOzetHTML = function(t) {
  var RENKLER = {taslak:'#888',gonderildi:'#185FA5',inceliyor:'#854F0B',kabul:'#0F6E56',reddedildi:'#A32D2D',revizyon:'#854F0B'};
  var ETIKET = {taslak:'Taslak',gonderildi:'Gönderildi',inceliyor:'İnceliyor',kabul:'Kabul',reddedildi:'Reddedildi',revizyon:'Revizyon'};
  var durum = t.durum||'taslak';
  var renk = RENKLER[durum]||'#888';
  var h = '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px">';
  h += '<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:'+renk+';color:#fff">'+(ETIKET[durum]||durum)+'</span>';
  if(t.gonderimTarih) h += '<span style="font-size:9px;color:var(--t3)">📤 '+t.gonderimTarih+(t.gonderenAd?' · '+t.gonderenAd:'')+'</span>';
  if(t.takipTarih) {
    var takipGec = new Date(t.takipTarih)<new Date();
    h += '<span style="font-size:9px;color:'+(takipGec?'#A32D2D':'var(--t3)')+'">📅 Takip: '+t.takipTarih+(takipGec?' ⚠':'')+'</span>';
  }
  h += '</div>';
  return h;
};

/* ── SA-V2-REVIZYON-001: Rev Numarası Increment + Geçmiş ──── */
window._steklifRevNo = function(id) {
  var teklifler = window._saTeklifLoad?.() || [];
  var t = teklifler.find(function(x) { return String(x.id) === String(id); });
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

/* ── Tasarım I — Çift Şerit (Mavi accent + üst/alt şerit) ──── */
window._piTasarimI = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var banka = window._saV2BankaMetni?.(t.paraBirimi||'USD')||'';
  /* SARTLAR-PI: öncelik zinciri — kayıt → modal session → global default */
  var sartlar = (t && t.sartlar && t.sartlar.length)
    ? t.sartlar
    : ((window._stSartlar && window._stSartlar.length)
        ? window._stSartlar
        : (window._saV2Sartlar?.() || []));
  var h = '<div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto;color:#111;font-size:10px">';
  h += '<div style="height:5px;background:#185FA5"></div>';
  h += '<div style="padding:16px 24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:0.5px solid #eee">';
  h += '<div><div style="font-size:18px;font-weight:700">Duay Global LLC</div>';
  h += '<div style="font-size:9px;color:#888;margin-top:4px">www.duaycor.com · +90 212 625 5 444 · WA: +90 532 270 5 113</div></div>';
  h += '<div style="text-align:right"><div style="font-size:8px;letter-spacing:.15em;color:#185FA5;font-weight:600">'+(L.baslik||'PROFORMA INVOICE')+'</div>';
  h += '<div style="font-size:14px;font-weight:700;font-family:monospace;margin-top:2px">'+(t.piNo||t.teklifNo||t.teklifId||t.id||'—')+'</div>';
  h += '<div style="font-size:9px;color:#888;margin-top:2px">'+bugun+'</div></div>';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:0.5px solid #eee">';
  h += '<div style="padding:10px 24px;border-right:0.5px solid #eee"><div style="font-size:8px;letter-spacing:.1em;color:#185FA5;font-weight:600;margin-bottom:3px">'+L.alici+'</div>';
  h += '<div style="font-size:11px;font-weight:600">'+(t.musteri||t.musteriAd||'—')+'</div></div>';
  h += '<div style="padding:10px 24px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px">';
  h += '<div><div style="color:#888">'+(L.teslim||'Delivery')+'</div><div style="font-weight:600">'+(t.teslimYeri||t.teslim||t.teslimMasraf||'—')+'</div></div>';
  h += '<div><div style="color:#888">'+(L.gecerlilik||'Valid')+'</div><div style="font-weight:600">'+(t.gecerlilikTarihi||t.gecerlilik||'—')+'</div></div>';
  h += '<div><div style="color:#888">'+(L.odeme||'Payment')+'</div><div>'+(t.odemeKosulu||t.odeme||'—')+'</div></div>';
  h += '<div><div style="color:#888">'+(L.para||'Currency')+'</div><div style="font-weight:600">'+(t.paraBirimi||'USD')+'</div></div>';
  h += '</div></div>';
  h += '<div style="padding:0 24px"><table style="width:100%;border-collapse:collapse;margin:12px 0">';
  h += '<thead><tr style="border-bottom:1px solid #185FA5"><th style="color:#185FA5;font-size:8px;padding:5px 4px;text-align:left">'+(L.no||'#')+'</th><th style="color:#185FA5;font-size:8px;padding:5px 4px;text-align:left">'+L.urun+'</th><th style="color:#185FA5;font-size:8px;padding:5px 4px;text-align:right">'+L.miktar+'</th><th style="color:#185FA5;font-size:8px;padding:5px 4px;text-align:right">'+L.birimFiyat+'</th><th style="color:#185FA5;font-size:8px;padding:5px 4px;text-align:right">'+L.tutar+'</th></tr></thead>';
  var satirHTML = (typeof satirlar === 'string') ? satirlar : (Array.isArray(satirlar) ? satirlar.map(function(s){return '<tr><td style="font-size:9px;padding:4px;color:#aaa">'+s.no+'</td><td style="font-size:9px;padding:4px"><div style="font-weight:600">'+s.ad+'</div><div style="font-size:8px;color:#888">'+s.kod+'</div></td><td style="font-size:9px;padding:4px;text-align:right">'+s.miktar+' '+s.birim+'</td><td style="font-size:9px;padding:4px;text-align:right">$'+s.satisF+'</td><td style="font-size:9px;padding:4px;text-align:right;font-weight:600">$'+s.toplam+'</td></tr>';}).join('') : '');
  h += '<tbody>'+satirHTML+'</tbody></table>';
  var toplamGoster = t.genelToplam || (Array.isArray(satirlar) ? satirlar.reduce(function(a,s){return a+parseFloat(s.toplam||0);},0).toFixed(2) : '0');
  h += '<div style="text-align:right;border-top:1px solid #185FA5;padding-top:8px;margin-bottom:16px"><span style="font-size:10px;color:#888;margin-right:8px">'+L.toplam+'</span><span style="font-size:16px;font-weight:700;color:#185FA5">'+toplamGoster+' '+(t.paraBirimi||'USD')+'</span></div>';
  if(sartlar.length){h+='<div style="margin-bottom:12px"><div style="font-size:8px;font-weight:600;color:#185FA5;margin-bottom:4px">'+(L.sartlar||'Terms')+'</div>';sartlar.slice(0,10).forEach(function(s,i){h+='<div style="font-size:8px;color:#555;margin-bottom:2px">'+(i+1)+'. '+s+'</div>';});h+='</div>';}
  h += '<div style="font-size:8px;color:#aaa;font-style:italic;margin-bottom:3px">'+(L.gorselNot||'Product images shown are for illustrative purposes only.')+'</div>';
  h += '<div style="font-size:8px;color:#555;margin-bottom:16px">'+banka+'</div>';
  h += '<div style="display:flex;justify-content:space-between"><div style="width:180px;text-align:center"><div style="border-top:0.5px solid #111;padding-top:4px;font-size:7px;letter-spacing:.1em;color:#888">'+L.imza+'</div></div>';
  h += '<div style="width:180px;text-align:center"><div style="border-top:0.5px solid #111;padding-top:4px;font-size:7px;letter-spacing:.1em;color:#888">'+(L.tarihMuhur||'DATE / STAMP')+'</div></div></div>';
  if(gizliKod) h+='<div style="text-align:center;margin-top:12px;font-size:7px;color:#ccc;font-family:monospace">'+gizliKod+'</div>';
  h += '</div>';
  h += '<div style="height:3px;background:#185FA5;margin-top:16px"></div>';
  h += '</div>';
  return h;
};

/* ── Tasarım L — Zarf/Klasik (Çerçeveli, ince serif) ──────── */
window._piTasarimL = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var banka = window._saV2BankaMetni?.(t.paraBirimi||'USD')||'';
  /* SARTLAR-PI: öncelik zinciri — kayıt → modal session → global default */
  var sartlar = (t && t.sartlar && t.sartlar.length)
    ? t.sartlar
    : ((window._stSartlar && window._stSartlar.length)
        ? window._stSartlar
        : (window._saV2Sartlar?.() || []));
  var h = '<div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto;color:#111;font-size:10px;padding:28px 32px;border:0.5px solid #ddd">';
  h += '<div style="text-align:center;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:16px">';
  h += '<div style="font-size:20px;font-weight:300;letter-spacing:.06em">DUAY GLOBAL LLC</div>';
  h += '<div style="font-size:8px;color:#aaa;letter-spacing:.06em;margin-top:4px">www.duaycor.com · +90 212 625 5 444 · WA: +90 532 270 5 113</div>';
  h += '</div>';
  h += '<div style="text-align:center;margin-bottom:18px">';
  h += '<div style="font-size:8px;letter-spacing:.2em;color:#aaa;margin-bottom:3px">'+(L.baslik||'PROFORMA INVOICE').toUpperCase()+'</div>';
  h += '<div style="font-size:13px;font-family:monospace;font-weight:600">'+(t.piNo||t.teklifNo||t.teklifId||t.id||'—')+'</div>';
  h += '<div style="font-size:8px;color:#aaa;margin-top:2px">'+bugun+'</div>';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
  h += '<div style="border:0.5px solid #ddd;padding:10px 12px;border-radius:3px"><div style="font-size:7px;letter-spacing:.1em;color:#aaa;margin-bottom:4px">'+L.alici.toUpperCase()+'</div><div style="font-weight:600;font-size:11px">'+(t.musteri||t.musteriAd||'—')+'</div></div>';
  h += '<div style="border:0.5px solid #ddd;padding:10px 12px;border-radius:3px"><div style="font-size:7px;letter-spacing:.1em;color:#aaa;margin-bottom:4px">SHIPMENT DETAILS</div>';
  h += '<div style="font-size:9px"><span style="color:#aaa">'+(L.teslim||'Delivery')+': </span><strong>'+(t.teslimYeri||t.teslim||'—')+'</strong></div>';
  h += '<div style="font-size:9px"><span style="color:#aaa">'+(L.gecerlilik||'Valid')+': </span><strong>'+(t.gecerlilikTarihi||t.gecerlilik||'—')+'</strong></div>';
  h += '<div style="font-size:9px"><span style="color:#aaa">'+(L.odeme||'Payment')+': </span>'+(t.odemeKosulu||t.odeme||'—')+'</div></div>';
  h += '</div>';
  h += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">';
  h += '<thead><tr style="border-top:0.5px solid #ddd;border-bottom:0.5px solid #ddd"><th style="color:#aaa;font-size:8px;padding:5px 4px">'+(L.no||'#')+'</th><th style="color:#aaa;font-size:8px;padding:5px 4px">'+L.urun+'</th><th style="color:#aaa;font-size:8px;text-align:right;padding:5px 4px">'+L.miktar+'</th><th style="color:#aaa;font-size:8px;text-align:right;padding:5px 4px">'+L.birimFiyat+'</th><th style="color:#aaa;font-size:8px;text-align:right;padding:5px 4px">'+L.tutar+'</th></tr></thead>';
  var satirHTML2 = (typeof satirlar === 'string') ? satirlar : (Array.isArray(satirlar) ? satirlar.map(function(s){return '<tr><td style="font-size:9px;padding:4px;color:#aaa">'+s.no+'</td><td style="font-size:9px;padding:4px"><div style="font-weight:600">'+s.ad+'</div><div style="font-size:8px;color:#888">'+s.kod+'</div></td><td style="font-size:9px;padding:4px;text-align:right">'+s.miktar+' '+s.birim+'</td><td style="font-size:9px;padding:4px;text-align:right">$'+s.satisF+'</td><td style="font-size:9px;padding:4px;text-align:right;font-weight:600">$'+s.toplam+'</td></tr>';}).join('') : '');
  h += '<tbody>'+satirHTML2+'</tbody></table>';
  var toplamGoster2 = t.genelToplam || (Array.isArray(satirlar) ? satirlar.reduce(function(a,s){return a+parseFloat(s.toplam||0);},0).toFixed(2) : '0');
  h += '<div style="border-top:2px solid #111;padding-top:8px;text-align:right;margin-bottom:16px"><span style="font-size:8px;color:#aaa;letter-spacing:.1em;margin-right:8px">'+L.toplam.toUpperCase()+' · '+(t.paraBirimi||'USD')+'</span><span style="font-size:18px;font-weight:300">'+toplamGoster2+'</span></div>';
  if(sartlar.length){h+='<div style="margin-bottom:12px"><div style="font-size:8px;font-weight:600;color:#555;margin-bottom:4px">'+(L.sartlar||'Terms')+'</div>';sartlar.slice(0,10).forEach(function(s,i){h+='<div style="font-size:8px;color:#555;margin-bottom:2px">'+(i+1)+'. '+s+'</div>';});h+='</div>';}
  h += '<div style="font-size:8px;color:#aaa;font-style:italic;margin-bottom:3px">'+(L.gorselNot||'Product images shown are for illustrative purposes only.')+'</div>';
  h += '<div style="font-size:8px;color:#555;margin-bottom:20px">'+banka+'</div>';
  h += '<div style="display:flex;justify-content:space-between"><div style="width:180px;text-align:center"><div style="border-top:0.5px solid #111;padding-top:4px;font-size:7px;letter-spacing:.1em;color:#aaa">'+L.imza.toUpperCase()+'</div></div>';
  h += '<div style="width:180px;text-align:center"><div style="border-top:0.5px solid #111;padding-top:4px;font-size:7px;letter-spacing:.1em;color:#aaa">'+(L.tarihMuhur||'DATE / STAMP').toUpperCase()+'</div></div></div>';
  if(gizliKod) h+='<div style="text-align:center;margin-top:12px;font-size:7px;color:#ccc;font-family:monospace">'+gizliKod+'</div>';
  h += '</div>';
  return h;
};

/* ── Tasarım O — Tek Nokta Renk (Siyah çerçeve, sol border) ── */
window._piTasarimO = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var banka = window._saV2BankaMetni?.(t.paraBirimi||'USD')||'';
  /* SARTLAR-PI: öncelik zinciri — kayıt → modal session → global default */
  var sartlar = (t && t.sartlar && t.sartlar.length)
    ? t.sartlar
    : ((window._stSartlar && window._stSartlar.length)
        ? window._stSartlar
        : (window._saV2Sartlar?.() || []));
  var h = '<div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto;color:#111;font-size:10px;padding:24px 28px;border:0.5px solid #e5e5e5">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">';
  h += '<div><div style="font-size:16px;font-weight:600">Duay Global LLC</div><div style="font-size:8px;color:#aaa;margin-top:3px">www.duaycor.com · +90 212 625 5 444 · WA: +90 532 270 5 113</div></div>';
  h += '<div style="text-align:right"><div style="font-size:7px;letter-spacing:.15em;color:#aaa;margin-bottom:3px">'+(L.baslik||'PROFORMA INVOICE').toUpperCase()+'</div><div style="font-size:13px;font-weight:600;font-family:monospace">'+(t.piNo||t.teklifNo||t.teklifId||t.id||'—')+'</div><div style="font-size:8px;color:#aaa;margin-top:2px">'+bugun+'</div></div>';
  h += '</div>';
  h += '<div style="height:2px;background:#111;margin-bottom:14px"></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;font-size:8px">';
  h += '<div><div style="color:#aaa;margin-bottom:2px">'+L.alici+'</div><div style="font-weight:600;font-size:9px">'+(t.musteri||t.musteriAd||'—')+'</div></div>';
  h += '<div><div style="color:#aaa;margin-bottom:2px">'+(L.teslim||'Delivery')+'</div><div style="font-weight:600;font-size:9px">'+(t.teslimYeri||t.teslim||'—')+'</div></div>';
  h += '<div><div style="color:#aaa;margin-bottom:2px">'+(L.gecerlilik||'Valid')+'</div><div style="font-weight:600;font-size:9px">'+(t.gecerlilikTarihi||t.gecerlilik||'—')+'</div></div>';
  h += '<div><div style="color:#aaa;margin-bottom:2px">'+(L.odeme||'Payment')+'</div><div style="font-size:9px">'+(t.odemeKosulu||t.odeme||'—').slice(0,20)+'</div></div>';
  h += '</div>';
  h += '<table style="width:100%;border-collapse:collapse;margin-bottom:12px">';
  h += '<thead><tr style="border-bottom:1px solid #111"><th style="color:#111;font-size:8px;padding:5px 4px">'+(L.no||'#')+'</th><th style="color:#111;font-size:8px;padding:5px 4px">'+L.urun+'</th><th style="color:#111;font-size:8px;text-align:right;padding:5px 4px">'+L.miktar+'</th><th style="color:#111;font-size:8px;text-align:right;padding:5px 4px">'+L.birimFiyat+'</th><th style="color:#111;font-size:8px;text-align:right;padding:5px 4px">'+L.tutar+'</th></tr></thead>';
  var satirHTML3 = (typeof satirlar === 'string') ? satirlar : (Array.isArray(satirlar) ? satirlar.map(function(s){return '<tr><td style="font-size:9px;padding:4px;color:#aaa">'+s.no+'</td><td style="font-size:9px;padding:4px"><div style="font-weight:600">'+s.ad+'</div><div style="font-size:8px;color:#888">'+s.kod+'</div></td><td style="font-size:9px;padding:4px;text-align:right">'+s.miktar+' '+s.birim+'</td><td style="font-size:9px;padding:4px;text-align:right">$'+s.satisF+'</td><td style="font-size:9px;padding:4px;text-align:right;font-weight:600">$'+s.toplam+'</td></tr>';}).join('') : '');
  h += '<tbody>'+satirHTML3+'</tbody></table>';
  var toplamGoster3 = t.genelToplam || (Array.isArray(satirlar) ? satirlar.reduce(function(a,s){return a+parseFloat(s.toplam||0);},0).toFixed(2) : '0');
  h += '<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><div style="border-left:3px solid #111;padding-left:10px"><div style="font-size:7px;color:#aaa;letter-spacing:.12em">'+L.toplam.toUpperCase()+'</div><div style="font-size:20px;font-weight:300">'+toplamGoster3+' <span style="font-size:11px">'+(t.paraBirimi||'USD')+'</span></div></div></div>';
  if(sartlar.length){h+='<div style="margin-bottom:12px"><div style="font-size:8px;font-weight:600;color:#555;margin-bottom:4px">'+(L.sartlar||'Terms')+'</div>';sartlar.slice(0,10).forEach(function(s,i){h+='<div style="font-size:8px;color:#555;margin-bottom:2px">'+(i+1)+'. '+s+'</div>';});h+='</div>';}
  h += '<div style="font-size:8px;color:#ccc;font-style:italic;margin-bottom:2px">'+(L.gorselNot||'Product images shown are for illustrative purposes only.')+'</div>';
  h += '<div style="font-size:8px;color:#aaa;margin-bottom:18px">'+banka+'</div>';
  h += '<div style="display:flex;justify-content:space-between"><div style="width:180px;text-align:center"><div style="border-top:2px solid #111;padding-top:4px;font-size:7px;letter-spacing:.12em;color:#aaa">'+L.imza.toUpperCase()+'</div></div>';
  h += '<div style="width:180px;text-align:center"><div style="border-top:2px solid #111;padding-top:4px;font-size:7px;letter-spacing:.12em;color:#aaa">'+(L.tarihMuhur||'DATE / STAMP').toUpperCase()+'</div></div></div>';
  if(gizliKod) h+='<div style="text-align:center;margin-top:12px;font-size:7px;color:#ccc;font-family:monospace">'+gizliKod+'</div>';
  h += '</div>';
  return h;
};

console.log('[PI] v1.1 yüklendi — 6 tasarim hazir (A B C I L O)');
