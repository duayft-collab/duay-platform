'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2_pi.js — Proforma Invoice (PI) Modülü
   4 tasarım: A (Corporate) / B (Modern Blue) / D1 (Apple Görselli) / D2 (Apple Görselsiz)
   3 katman: müşteriye giden / şirket içi / yönetici
   Gizli kod: 6 karakter, PI'da gri/küçük
   Adres: K. Dolap Mh. Neşeli Sk. 1/5 Eyüpsultan İSTANBUL
════════════════════════════════════════════════════════════════ */

/* CLAUDE-KURAL-PI-001 madde 5: Kurumsal bilgi tek truth source
   PI'da görünen alanlar: sirket, adres, tel, mail, web */
var PI_ADRES = {
  /* PI'da görünen alanlar */
  sirket: 'Duay Global LLC',
  adres: 'Karadolap District, Neseli St. 1/5, Eyupsultan, Istanbul, TÜRKİYE',
  tel: '+90 212 625 5 444',
  mobil: '+90 532 270 5113',
  mail: 'brn.simsek@gmail.com',
  web: 'www.duaycor.com',
  /* PI'da görünmeyen — gelecek raporlar/dokümanlar için */
  unvanTR: 'Duay Uluslararası Ticaret Ltd. Şti.',
  vergiDairesi: 'GOP',
  vergiNo: '3131095135',
  mersisNo: '0313 1095 1350 0001',
  ticaretSicilNo: '189629-1',
  /* Geriye uyumlu fallback (eski kullananlar için) */
  adres1: 'Karadolap District, Neseli St. 1/5',
  adres2: 'Eyupsultan, Istanbul, TÜRKİYE',
  wp: '+90 532 270 5113'
};

// [PI-STANDART-001] Standart musteri header/footer/banka/sartlar bloku
window._piStandartCariBilgi = function(t) {
  if (!window.loadCari || !window._cariNormalize) return null;
  try {
    var list = window.loadCari({tumKullanicilar: true}) || [];
    var c = list.find(function(c) {
      return String(c['id']) === String(t['musteriId']) || c['kod'] === t['musteriKod'];
    });
    return c ? window._cariNormalize(c) : null;
  } catch (e) { return null; }
};

window._piStandartBillTo = function(t) {
  var n = window._piStandartCariBilgi(t);
  var lines = [];
  lines.push('<div style="font-weight:700;font-size:13px;margin-bottom:4px">' + (t['musteriAd'] || (n && n['name']) || '—') + '</div>');
  if (n) {
    if (n['adres']) lines.push('<div>' + n['adres'] + '</div>');
    var loc = [n['city'], n['country']].filter(function(x){return x;}).join(' / ');
    if (loc) lines.push('<div>' + loc + '</div>');
    if (n['tel']) lines.push('<div>Tel: ' + n['tel'] + '</div>');
    if (n['contact']) lines.push('<div>Attn: ' + n['contact'] + '</div>');
  }
  return lines.join('');
};

window._piStandartSartlar = function(t) {
  if (!Array.isArray(t['sartlar']) || !t['sartlar'].length) return '';
  var html = '<div style="margin-top:14px"><div style="font-weight:700;font-size:11px;margin-bottom:6px">TERMS &amp; CONDITIONS</div>';
  html += '<ol style="margin:0;padding-left:18px;font-size:9.5px;line-height:1.45">';
  t['sartlar'].forEach(function(line) {
    html += '<li style="margin-bottom:2px">' + line + '</li>';
  });
  html += '</ol></div>';
  return html;
};

window._piStandartBanka = function(t) {
  if (typeof window._pdfBankaTekSatir === 'function') {
    return window._pdfBankaTekSatir(t['paraBirimi']);
  }
  return '';
};
window.PI_ADRES = PI_ADRES;

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

/* CLAUDE-KURAL-PI-001 madde 3+4: PI %100 İngilizce — AR/TR kaldırıldı, EN tamamlandı */
var PI_DILLER = {
  EN: {
    sirket: 'DUAY GLOBAL LLC',
    piNo: 'PI No',
    tarih: 'Date',
    gecerli: 'Valid until',
    revNo: 'Rev',
    alici: 'Bill To',
    kosullar: 'Terms',
    incoterms: 'Incoterms',
    odeme: 'Payment',
    teslimat: 'Delivery',
    urun: 'Item Description',
    miktar: 'Qty',
    birim: 'Unit',
    birimFiyat: 'Unit Price',
    tutar: 'Amount',
    toplam: 'TOTAL',
    imza: 'Authorized Signature',
    not: 'This is a Proforma Invoice only.',
    eskiKod: 'Old Code',
    /* PI_DILLER.EN tamamlama (önceden fallback ile basılan label'lar) */
    proforma: 'Proforma Invoice',
    araToplam: 'Subtotal',
      freight: 'Freight',
      insurance: 'Insurance',
    banking: 'Banking Details',
    tradeTerms: 'Trade Terms',
    sartlar: 'Terms & Conditions',
    delivery: 'Delivery',
    payment: 'Payment',
    validity: 'Validity',
    notes: 'Notes',
    total: 'Total',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    description: 'Description',
    amount: 'Amount',
    baslik: 'PROFORMA INVOICE',
    teslim: 'Delivery Terms',
    gecerlilik: 'Valid Until',
    para: 'Currency',
    no: '#',
    gorselNot: 'Product images for illustrative purposes only.',
    tarihMuhur: 'DATE / STAMP'
  }
};
window.PI_DILLER = PI_DILLER;

/* ── PI ana fonksiyon ───────────────────────────────────────── */
/* PI-FIX-005: Originator helper — sadece teklif.originator dolu ise bastırır */
window._piOriginator = function(t) {
  if (!t || !t.originator) return '';
  var name = t.originator;
  var esc = window._esc || function(s){ return String(s||''); };
  return '<div style="font-size:9px;color:#444;margin-bottom:2px">Originator: ' + esc(name) + '</div>';
};

window._piOlustur = function(teklif, tasarim, katman, skipKontrol) {
  /* CLAUDE-KURAL-PI-001 madde 7: PI üretiminden önce 4 kontrol — hata önleme */
  /* SATIS-V3-PI-TR-WARN-001 */
  if (!skipKontrol && typeof window._piOnKontrol === 'function') {
    var _onHata = window._piOnKontrol(teklif);
    if (_onHata) {
      if (typeof window.confirmModal === 'function') {
        window.confirmModal(_onHata + '\n\nYine de PI olusturmak istiyor musunuz?', {
          title: 'PI Uyarisi',
          danger: false,
          confirmText: 'Devam Et',
          cancelText: 'Iptal',
          onConfirm: function() {
            window._piOlustur(teklif, tasarim, katman, true);
          }
        });
      } else {
        window.toast?.(_onHata, 'err');
      }
      return;
    }
  }
  /* PI-FIX-005: Originator opsiyonel — kullanıcıya sor */
  if (!skipKontrol && !teklif.originator && !teklif._originatorAsked) {
    var __cu = (window.Auth && window.Auth.getCU && window.Auth.getCU()) || {};
    var __cuName = __cu.name || '';
    if (__cuName) {
      teklif._originatorAsked = true;
      var __msg = 'Footer kısmına originator olarak adınız eklensin mi? (' + __cuName + ')';
      if (typeof window.confirmModal === 'function') {
        window.confirmModal(__msg, {
          title: 'Originator',
          danger: false,
          confirmText: 'Adımı Ekle',
          cancelText: 'Eklemeden Devam',
          onConfirm: function() { teklif.originator = __cuName; window._piOlustur(teklif, tasarim, katman, true); },
          onCancel:  function() { window._piOlustur(teklif, tasarim, katman, true); }
        });
        return;
      }
      /* K06-NATIVE-CONFIRM-CLEAN-001: confirmModal yüklü değilse originator eklenmeden devam (güvenli default) */
      console.warn('[K06] confirmModal yüklenmedi — originator eklenmeden devam ediliyor');
      window._piOlustur(teklif, tasarim, katman, true);
      return;
    }
  }

  /* PI-FIX-004: D1 tasarımı görselli — eksik görsel uyarısı */
  if (!skipKontrol && tasarim === 'D1' && typeof window._piUrunSatirlari === 'function') {
    var __d1Satirlar = window._piUrunSatirlari(teklif, katman) || [];
    var __d1Eksik = __d1Satirlar.filter(function(s){ return !s.gorsel; }).length;
    if (__d1Eksik > 0) {
      var __d1Msg = __d1Eksik + ' / ' + __d1Satirlar.length + ' ürün görselsiz. D1 görselli tasarım — boş görüneceklerdir. Devam edilsin mi? (D2 görselsiz tasarımdır)';
      if (typeof window.confirmModal === 'function') {
        window.confirmModal(__d1Msg, {
          title: 'D1 Görsel Uyarısı',
          danger: false,
          confirmText: 'Devam Et',
          cancelText: 'İptal',
          onConfirm: function() { window._piOlustur(teklif, tasarim, katman, true); }
        });
        return;
      }
      /* K06-NATIVE-CONFIRM-CLEAN-001: confirmModal yüklü değilse iptal (güvenli default — onay alınmadı) */
      console.warn('[K06] confirmModal yüklenmedi — D1 görsel uyarısı onayı alınamadı, iptal');
      return;
    }
  }

  /* PDF-HARMONIZE-001: V2 form (gecerlilik/teslim/odeme) ↔ inline (gecerlilikTarihi/teslimSekli/odemeKosulu)
     şema fallback + cari lookup. _piTasarimA/B/D1/D2 fonksiyonları teklif.* okuyor —
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
      teklif.musteriTelefon = n.musteriTelefon || teklif.musteriTelefon;
      teklif.revNo          = n.revNo;
    }
  }
  var gizliKod = window._piGizliKodUret();
  /* CLAUDE-KURAL-PI-001 madde 3: PI zorla %100 İngilizce — t.dil yoksay */
  var dil = 'EN';
  var L = PI_DILLER[dil] || PI_DILLER.EN;
  /* CLAUDE-KURAL-PI-001 madde 1: tarih DD MMM YYYY (en short) — tek nokta düzeltme, tüm V2 PI tasarımlarını kapsar */
  var bugun = window._pdfTarihFormat ? window._pdfTarihFormat(new Date()) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
window._piFreightInsuranceHTML = function(t, L, paraSimge) {
  if (!t || !t.freightToggle) return { preTotalHTML: '', grandTotal: null };
  var freight = parseFloat(t.freightAmount) || 0;
  var teslim = String(t.teslim || '');
  var isCifCip = (teslim.indexOf('CIF') === 0 || teslim.indexOf('CIP') === 0);
  var insurance = isCifCip ? (parseFloat(t.insuranceAmount) || 0) : 0;
  var subtotal = parseFloat(t.toplamSatis) || 0;
  var grandTotal = subtotal + freight + insurance;
  var para = paraSimge || t.paraBirimi || 'USD';
  var fmt = function(n) { return n.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}); };
  var html = '';
  var rowCss = 'display:flex;justify-content:space-between;font-size:10px;color:#666;padding:2px 0';
  var lblSub = L && L['araToplam'] ? L['araToplam'] : 'Subtotal';
  var lblFr = L && L['freight'] ? L['freight'] : 'Freight';
  var lblIns = L && L['insurance'] ? L['insurance'] : 'Insurance';
  html += '<div style="' + rowCss + '"><span>' + lblSub + '</span><span>' + para + ' ' + fmt(subtotal) + '</span></div>';
  html += '<div style="' + rowCss + '"><span>' + lblFr + '</span><span>' + para + ' ' + fmt(freight) + '</span></div>';
  if (isCifCip) {
    html += '<div style="' + rowCss + '"><span>' + lblIns + '</span><span>' + para + ' ' + fmt(insurance) + '</span></div>';
  }
  return { preTotalHTML: html, grandTotal: grandTotal };
};

window._piUrunSatirlari = function(teklif, katman) {
  /* SATIS-PI-URUNLOOKUP-001: master ürün lookup map (gorsel/image fallback) */
  var urunMap = {};
  try {
    var allUrunler = (typeof window.loadUrunler === 'function') ? window.loadUrunler() : [];
    allUrunler.forEach(function(uu) { if (uu && uu.id != null) urunMap[uu.id] = uu; });
  } catch(e) {}

  var urunler = teklif.urunler || [];
  if (!urunler.length && teklif.urunAdi) {
    urunler = [{ duayKodu: teklif.duayKodu || '', urunAdi: teklif.urunAdi || '', miktar: teklif.miktar || 1, alisTl: parseFloat(teklif.alisF) || 0, marj: 33, gorsel: teklif.gorsel || '' }];
  }
  return urunler.filter(function(u){var qty=parseFloat(u.miktar)||0;var desc=String((u.urunAdi||u.duayAdi||u.ingAd||"")).trim();var kod=String((u.kod||u.duayKodu||"")).trim();return qty>0||desc!==""||kod!=="";}).map(function(u, i) {
    var master = urunMap[u.id] || urunMap[u.urunId] || {};
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
    return { no: i+1, kod: u.duayKodu||u.kod||master.duayKodu||master.kod||'', eskiKod: u.eskiKod||master.eskiKod||'', ad: u.urunAdi||u.ad||master.urunAdi||master.ad||master.name||'', miktar: miktar, birim: u.birim||master.birim||'PCS', satisF: satisF, toplam: toplam, gorsel: u.gorsel||master.gorsel||master.image||'', image: u.image||master.image||master.gorsel||'' };
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
    + (tasarim === 'O' ? 'body{background:#FFFBEB}.accent{color:#D97706}.top-bar{height:8px;background:#D97706;margin:-32px -32px 24px}.total-box{background:#D97706;color:#fff;padding:8px 16px}' : '')
    + (tasarim === 'D1' || tasarim === 'D2' ? `
    /* PI-D-001: alt2-v3 Apple/Corporate stili */
    body {
      font-family: 'Inter', -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
      font-feature-settings: 'tnum' 1, 'cv11' 1;
      color: #1d1d1f;
      padding: 0;
    }
    .pi-d-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 56px 48px 40px;
    }
    .pi-d-banner {
      height: 4px;
      background: #1d1d1f;
      margin: -56px -48px 40px;
    }
    .pi-d-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #d2d2d7;
    }
    .pi-d-brand {
      font-size: 13px;
      font-weight: 600;
      color: #1d1d1f;
      letter-spacing: 0.5px;
    }
    .pi-d-brand-sub {
      font-size: 10px;
      font-weight: 500;
      color: #6e6e73;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .pi-d-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #6e6e73;
      text-align: right;
    }
    .pi-d-pino {
      font-size: 17px;
      font-weight: 600;
      color: #1d1d1f;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.3px;
      margin-top: 4px;
      text-align: right;
    }
    .pi-d-pino-meta {
      font-size: 10px;
      color: #86868b;
      margin-top: 4px;
      text-align: right;
    }
    .pi-d-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 32px;
    }
    .pi-d-party-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #86868b;
      margin-bottom: 10px;
    }
    .pi-d-party-name {
      font-size: 13px;
      font-weight: 600;
      color: #1d1d1f;
      margin-bottom: 4px;
    }
    .pi-d-party-line {
      font-size: 10.5px;
      color: #4a4a4f;
      line-height: 1.6;
    }
    .pi-d-products {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .pi-d-products thead th {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #86868b;
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #d2d2d7;
    }
    .pi-d-products thead th.num { text-align: right; }
    .pi-d-products tbody td {
      font-size: 10.5px;
      color: #1d1d1f;
      padding: 14px 8px;
      border-bottom: 0.5px solid #e5e5e7;
      vertical-align: top;
    }
    .pi-d-products tbody td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .pi-d-prod-name { font-weight: 600; margin-bottom: 3px; }
    .pi-d-prod-sub {
      font-size: 9.5px;
      color: #6e6e73;
      line-height: 1.5;
    }
    .pi-d-prod-image {
      width: 56px;
      height: 56px;
      border-radius: 4px;
      background: #f5f5f7;
      object-fit: cover;
      border: 0.5px solid #e5e5e7;
    }
    .pi-d-totals {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 2px solid #1d1d1f;
      display: flex;
      justify-content: flex-end;
    }
    .pi-d-totals-block { min-width: 240px; }
    .pi-d-totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
      color: #4a4a4f;
    }
    .pi-d-totals-row.grand {
      border-top: 1px solid #d2d2d7;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 14px;
      font-weight: 700;
      color: #1d1d1f;
    }
    .pi-d-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #d2d2d7;
    }
    .pi-d-info-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #86868b;
      margin-bottom: 8px;
    }
    .pi-d-info-line {
      font-size: 10px;
      color: #4a4a4f;
      line-height: 1.7;
    }
    .pi-d-terms {
      margin-top: 24px;
      padding: 16px 18px;
      background: #fafafa;
      border-left: 3px solid #1d1d1f;
      border-radius: 2px;
    }
    .pi-d-terms-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #86868b;
      margin-bottom: 8px;
    }
    .pi-d-terms-list {
      margin: 0;
      padding-left: 20px;
      font-size: 10px;
      color: #4a4a4f;
      line-height: 1.7;
    }
    .pi-d-terms-list li { padding: 2px 0; }
    .pi-d-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e7;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .pi-d-sign {
      width: 180px;
      border-top: 0.5px solid #4a4a4f;
      padding-top: 6px;
      font-size: 9px;
      color: #6e6e73;
      letter-spacing: 0.3px;
    }
    .pi-d-page-no {
      font-size: 9px;
      color: #86868b;
      letter-spacing: 0.3px;
    }
  ` : '');
};

/* ── Tasarım A — Corporate (siyah-beyaz klasik) ────────────── */
window._piTasarimA = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var toplamSatis = satirlar.reduce(function(a, s) { return a + parseFloat(s.toplam); }, 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  var h = '<div style="padding:28px 32px 20px;border-bottom:2px solid #111">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
  h += '<div><div style="font-size:22px;font-weight:700;letter-spacing:.5px">' + PI_ADRES.sirket + '</div>';
  h += '<div style="font-size:9px;color:#666;margin-top:3px">International Trade</div>';
  h += '<div style="font-size:9px;color:#666;margin-top:8px;line-height:1.8">' + PI_ADRES.adres1 + '<br>' + PI_ADRES.adres2 + '<br>Tel: ' + PI_ADRES.tel + '<br>WA: ' + PI_ADRES.mobil + '<br>' + PI_ADRES.mail + '<br>' + PI_ADRES.web + '</div></div>';
  h += '<div style="text-align:right">';
  h += '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em">Proforma Invoice</div>';
  h += '<div style="font-size:18px;font-weight:700;font-family:monospace;margin-top:2px">' + (t.teklifId || '') + '</div>';
  h += '<div style="font-size:9px;color:#888;margin-top:4px;line-height:1.8">Date: ' + bugun + '<br>Valid: 30 days<br>Rev: ' + (t.revNo || '01') + '</div>';
  h += '</div></div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:0.5px solid #eee">';
  h += '<div style="padding:14px 32px;border-right:0.5px solid #eee">';
  h += '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">' + L.alici + '</div>';
  h += '<div style="font-size:13px;font-weight:500">' + (t.musteriAd || '—') + '</div>';
  h += '</div>';
  if (t.musteriAdres) h += '<div style="font-size:10px;color:#555;margin-top:2px">' + esc(t.musteriAdres) + '</div>';
  if (t.musteriTelefon) h += '<div style="font-size:10px;color:#555;margin-top:1px">Tel: ' + esc(t.musteriTelefon) + '</div>';
  h += '</div>';
  h += '<div style="padding:14px 32px">';
  h += '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">' + L.kosullar + '</div>';
  h += '<div style="font-size:10px;color:#333;line-height:1.8">' + (t.teslim || 'FOB Istanbul') + '<br>' + (t.odeme || '30% Advance, 70% L/C') + '</div></div></div>';
  h += '<div style="padding:0 32px"><table><thead><tr>';
  h += '<th style="width:32px">#</th><th>' + L.urun + '</th><th style="width:55px">' + L.miktar + '</th><th style="width:55px">' + L.birim + '</th><th style="width:90px;text-align:right">' + L.birimFiyat + '</th><th style="width:100px;text-align:right">' + L.tutar + '</th>';
  h += '</tr></thead><tbody>';
  satirlar.forEach(function(s) { h += '<tr><td style="color:#aaa">' + s.no + '</td><td><div style="font-weight:500">' + s.ad + '</div><div style="font-size:9px;color:#888">' + s.kod + '</div>' + (s.eskiKod?'<div style="font-size:9px;color:#888">'+(L.eskiKod||'Old Code')+': '+s.eskiKod+'</div>':'') + '</td><td>' + s.miktar + '</td><td>' + esc(window._unitToEN ? window._unitToEN(s.birim) : (s.birim || '')) + '</td><td style="text-align:right">$' + Number(s.satisF || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td><td style="text-align:right;font-weight:500">$' + Number(s.toplam || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td></tr>'; });
  h += '</tbody></table></div>';
  h += '<div style="display:flex;justify-content:flex-end;padding:14px 32px;border-top:0.5px solid #eee">';
  h += (function(){var fi = window._piFreightInsuranceHTML(t, L, t.paraBirimi || 'USD'); var totalVal = (fi.grandTotal !== null ? fi.grandTotal.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) : toplamSatis); return '<div style="text-align:right">' + (fi.preTotalHTML || '') + '<div style="font-size:14px;font-weight:700;border-top:1px solid #111;padding-top:8px;margin-top:4px">' + L.toplam + ' USD ' + totalVal + '</div></div></div>';})();
  h += '<div style="padding:10px 32px 24px;border-top:0.5px solid #eee">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-end">';
  h += '<div style="border-top:0.5px solid #aaa;width:160px;text-align:center;padding-top:5px;font-size:9px;color:#666">' + (window._piOriginator?window._piOriginator(t):'') + L.imza + '</div>';
  h += '<div style="font-size:8px;color:#bbb">' + L.not + '</div>';
  h += '</div></div>';
  h += '<div class="gizli-kod">' + gizliKod + '</div>';
  // [PI-STANDART-001] Standart sartlar + banka (L/O'da banka var, typeof guard)
  if (typeof window._piStandartSartlar === 'function') h += window._piStandartSartlar(t);
  if (typeof banka === 'undefined' && typeof window._piStandartBanka === 'function') {
    var __std_banka = window._piStandartBanka(t);
    if (__std_banka) h += '<div style="margin-top:10px;font-size:9.5px;color:#444">' + __std_banka + '</div>';
  }
  return h;
};

/* ── Tasarım B — Modern Blue (Duay mavisi accent) ──────────── */
window._piTasarimB = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var toplamSatis = satirlar.reduce(function(a, s) { return a + parseFloat(s.toplam); }, 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  var h = '<div style="background:#185FA5;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start">';
  h += '<div><div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.3px">' + PI_ADRES.sirket + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:3px">' + PI_ADRES.adres1 + ' · ' + PI_ADRES.adres2 + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:2px">' + PI_ADRES.tel + ' · WA: ' + PI_ADRES.mobil + ' · ' + PI_ADRES.mail + ' · ' + PI_ADRES.web + '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#B5D4F4;text-transform:uppercase;letter-spacing:.08em">Proforma Invoice</div>';
  h += '<div style="font-size:16px;font-weight:700;color:#fff;font-family:monospace;margin-top:2px">' + (t.teklifId || '') + '</div>';
  h += '<div style="font-size:9px;color:#B5D4F4;margin-top:3px">' + bugun + ' · Rev ' + (t.revNo || '01') + '</div></div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;padding:14px 28px;gap:20px;border-bottom:0.5px solid #eee">';
  h += '<div style="border-left:3px solid #185FA5;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.alici + '</div>';
  h += '<div style="font-size:12px;font-weight:500">' + (t.musteriAd || '—') + '</div>';
  h += '</div>';
  if (t.musteriAdres) h += '<div style="font-size:10px;color:#555;margin-top:1px">' + esc(t.musteriAdres) + '</div>';
  if (t.musteriTelefon) h += '<div style="font-size:10px;color:#555;margin-top:1px">Tel: ' + esc(t.musteriTelefon) + '</div>';
  h += '</div>';
  h += '<div style="border-left:3px solid #185FA5;padding-left:12px">';
  h += '<div style="font-size:8px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">' + L.kosullar + '</div>';
  h += '<div style="font-size:10px;color:#333;line-height:1.8">' + (t.teslim || 'FOB Istanbul') + '<br>' + (t.odeme || '30% Advance, 70% L/C') + '</div></div></div>';
  h += '<div style="padding:0 28px"><table><thead><tr style="background:#E6F1FB">';
  h += '<th style="color:#0C447C;width:32px">#</th><th style="color:#0C447C">' + L.urun + '</th><th style="color:#0C447C;width:55px">' + L.miktar + '</th><th style="color:#0C447C;width:55px">' + L.birim + '</th><th style="color:#0C447C;width:90px;text-align:right">' + L.birimFiyat + '</th><th style="color:#0C447C;width:100px;text-align:right">' + L.tutar + '</th>';
  h += '</tr></thead><tbody>';
  satirlar.forEach(function(s) { h += '<tr><td style="color:#aaa">' + s.no + '</td><td><div style="font-weight:500">' + s.ad + '</div><div style="font-size:9px;color:#888">' + s.kod + '</div>' + (s.eskiKod?'<div style="font-size:9px;color:#888">'+(L.eskiKod||'Old Code')+': '+s.eskiKod+'</div>':'') + '</td><td>' + s.miktar + '</td><td>' + esc(window._unitToEN ? window._unitToEN(s.birim) : (s.birim || '')) + '</td><td style="text-align:right">$' + Number(s.satisF || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td><td style="text-align:right;font-weight:500;color:#185FA5">$' + Number(s.toplam || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td></tr>'; });
  h += '</tbody></table></div>';
  h += '<div style="display:flex;justify-content:flex-end;align-items:center;padding:12px 28px;border-top:0.5px solid #eee;gap:24px">';
  h += (function(){var fi = window._piFreightInsuranceHTML(t, L, t.paraBirimi || 'USD'); var totalVal = (fi.grandTotal !== null ? fi.grandTotal.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) : toplamSatis); var pre = fi.preTotalHTML ? '<div style="font-size:10px;color:#666;text-align:right;margin-bottom:4px">' + fi.preTotalHTML + '</div>' : ''; return pre + '<div style="background:#185FA5;color:#fff;padding:8px 20px;border-radius:4px;font-size:14px;font-weight:700">' + L.toplam + ': USD ' + totalVal + '</div></div>';})();
  h += '<div style="padding:10px 28px 20px;display:flex;justify-content:space-between;align-items:flex-end">';
  h += '<div style="border-top:0.5px solid #aaa;width:160px;text-align:center;padding-top:5px;font-size:9px;color:#666">' + (window._piOriginator?window._piOriginator(t):'') + L.imza + '</div>';
  h += '<div style="font-size:8px;color:#bbb">' + L.not + '</div>';
  h += '</div>';
  h += '<div class="gizli-kod">' + gizliKod + '</div>';
  // [PI-STANDART-001] Standart sartlar + banka (L/O'da banka var, typeof guard)
  if (typeof window._piStandartSartlar === 'function') h += window._piStandartSartlar(t);
  if (typeof banka === 'undefined' && typeof window._piStandartBanka === 'function') {
    var __std_banka = window._piStandartBanka(t);
    if (__std_banka) h += '<div style="margin-top:10px;font-size:9.5px;color:#444">' + __std_banka + '</div>';
  }
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
  // [PI-STANDART-001] Standart sartlar + banka (L/O'da banka var, typeof guard)
  if (typeof window._piStandartSartlar === 'function') h += window._piStandartSartlar(t);
  if (typeof banka === 'undefined' && typeof window._piStandartBanka === 'function') {
    var __std_banka = window._piStandartBanka(t);
    if (__std_banka) h += '<div style="margin-top:10px;font-size:9.5px;color:#444">' + __std_banka + '</div>';
  }
  return h;
};

window._steklifRevGoster = function(encodedSnap) {
  try {
    var snap = JSON.parse(decodeURIComponent(encodedSnap));
    window.toast?.('Rev snapshot: ' + JSON.stringify(snap).slice(0, 80) + '...', 'info');
  } catch(e) { window.toast?.('Snapshot okunamadı', 'warn'); }
};

/* ── Tasarım D1 — alt2-v3 Apple/Corporate (GÖRSELLİ) ─────────── PI-D-001 */
window._piTasarimD1 = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var sirket = (window.PI_ADRES && window.PI_ADRES.sirket) || 'DUAY GLOBAL';
  var adres1 = (window.PI_ADRES && window.PI_ADRES.adres1) || '';
  var adres2 = (window.PI_ADRES && window.PI_ADRES.adres2) || '';
  var tel    = (window.PI_ADRES && window.PI_ADRES.tel) || '';
  var mail   = (window.PI_ADRES && window.PI_ADRES.mail) || '';
  var mobil  = (window.PI_ADRES && window.PI_ADRES.mobil) || '';
  var web    = (window.PI_ADRES && window.PI_ADRES.web) || '';
  var esc = window._esc || function(s){return String(s||'');};

  var html = '<div class="pi-d-page">';
  html += '<div class="pi-d-banner"></div>';

  /* Meta header */
  html += '<div class="pi-d-meta">';
  html += '<div>';
  html += '<div class="pi-d-brand">' + esc(sirket) + '</div>';
  html += '<div class="pi-d-brand-sub">' + esc(adres1) + (adres2 ? ' · ' + esc(adres2) : '') + '</div>';
  if (tel || mobil || mail || web) html += '<div class="pi-d-brand-sub">' + esc(tel) + (mobil ? ' · WA: ' + esc(mobil) : '') + (mail ? ' · ' + esc(mail) : '') + (web ? ' · ' + esc(web) : '') + '</div>';
  html += '</div>';
  html += '<div>';
  html += '<div class="pi-d-title">' + esc(L.proforma || 'Proforma Invoice') + '</div>';
  html += '<div class="pi-d-pino">' + esc(t.teklifId || t.teklifNo || '') + '</div>';
  html += '<div class="pi-d-pino-meta">' + esc(L.tarih || 'Date') + ': ' + esc(bugun) + ' · Rev ' + esc(t.revNo || '01') + '</div>';
  html += '<div class="pi-d-pino-meta">' + esc(L.gecerli || 'Valid') + ': ' + esc(t.gecerlilik || '30 days') + '</div>';
  html += '</div></div>';

  /* Parties */
  html += '<div class="pi-d-parties">';
  html += '<div>';
  html += '<div class="pi-d-party-label">' + esc(L.alici || 'Bill To') + '</div>';
  html += '<div class="pi-d-party-name">' + esc(t.musteriAd || t.musteri || '') + '</div>';
  if (t.musteriAdres) html += '<div class="pi-d-party-line">' + esc(t.musteriAdres) + '</div>';
  if (t.musteriTelefon) html += '<div class="pi-d-party-line">Tel: ' + esc(t.musteriTelefon) + '</div>';
  html += '</div>';
  html += '<div>';
  html += '<div class="pi-d-party-label">' + esc(L.kosullar || 'Terms') + '</div>';
  html += '<div class="pi-d-party-line"><strong>' + esc(L.teslim || 'Delivery') + ':</strong> ' + esc(t.teslim || '') + '</div>';
  html += '<div class="pi-d-party-line"><strong>' + esc(L.odeme || 'Payment') + ':</strong> ' + esc(t.odeme || '') + '</div>';
  /* PI-BANKA-001: paraBirimi bug fix — t.dil yerine t.paraBirimi (5 para birimi: USD/EUR/GBP/TRY/CNY) */
  html += '<div class="pi-d-party-line"><strong>Currency:</strong> ' + esc(t.paraBirimi || 'USD') + '</div>';
  html += '</div></div>';

  /* Products — GÖRSELLİ */
  html += '<table class="pi-d-products">';
  html += '<thead><tr><th style="width:40px;">#</th><th>' + esc(L.urun || 'Product') + '</th><th class="num">' + esc(L.miktar || 'Qty') + '</th><th class="num">' + esc(L.birimFiyat || 'Unit') + '</th><th class="num">' + esc(L.tutar || 'Total') + '</th></tr></thead><tbody>';

  var araToplam = 0;
  satirlar.forEach(function(s) {
    araToplam += Number(s.toplam || 0);
    html += '<tr>';
    html += '<td>' + esc(String(s.no || '')) + '</td>';
    html += '<td><div style="display:flex;gap:14px;align-items:flex-start;">';
    if (s.gorsel || s.image) html += '<img class="pi-d-prod-image" src="' + esc(s.gorsel || s.image) + '" alt="" />';
    else html += '<div class="pi-d-prod-image"></div>';
    html += '<div style="flex:1;">';
    html += '<div class="pi-d-prod-name">' + esc(s.ad || '') + '</div>';
    var subParts = [];
    if (s.kod) subParts.push('Code: ' + s.kod);
    if (s.eskiKod && s.eskiKod !== s.kod) subParts.push('Old: ' + s.eskiKod);
    if (s.gtipNo) subParts.push('HS: ' + s.gtipNo);
    if (s.mensei) subParts.push('Origin: ' + s.mensei);
    if (subParts.length) html += '<div class="pi-d-prod-sub">' + esc(subParts.join(' · ')) + '</div>';
    if (s.aciklama) html += '<div class="pi-d-prod-sub">' + esc(s.aciklama) + '</div>';
    html += '</div></div></td>';
    html += '<td class="num">' + esc(String(s.miktar || 0)) + ' ' + esc((window._unitToEN ? window._unitToEN(s.birim) : (s.birim || ''))) + '</td>';
    html += '<td class="num">' + Number(s.satisF || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
    html += '<td class="num">' + Number(s.toplam || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  /* Totals */
  /* PI-BANKA-001: paraBirimi bug fix — t.dil yerine t.paraBirimi */
  var birim = t.paraBirimi || 'USD';
  html += '<div class="pi-d-totals"><div class="pi-d-totals-block">';
  /* SATIS-PI-CONTENT-UNIFY-001: CIF/CFR Insurance + Freight (Strateji C) */
  var __fi = (typeof window._piFreightInsuranceHTML === 'function') ? window._piFreightInsuranceHTML(t, L, t.paraBirimi || 'USD') : { preTotalHTML: '', grandTotal: null };
  if (__fi.preTotalHTML) {
    html += __fi.preTotalHTML;
  } else {
    html += '<div class="pi-d-totals-row"><span>' + esc(L.araToplam || 'Subtotal') + '</span><span>' + birim + ' ' + araToplam.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span></div>';
  }
  var __grandTot = (__fi.grandTotal !== null && __fi.grandTotal !== undefined) ? __fi.grandTotal : araToplam;
  html += '<div class="pi-d-totals-row grand"><span>' + esc(L.toplam || 'Total') + '</span><span>' + birim + ' ' + __grandTot.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span></div>';
  html += '</div></div>';

  /* Info grid */
  html += '<div class="pi-d-info-grid">';
  /* PI-BANKA-001: Banking — placeholder yerine helper'dan kompakt liste (3 banka × paraBirimi) */
  html += '<div><div class="pi-d-info-label">' + esc(L.banking || 'Banking') + '</div>'
    + (window._pdfBankaHtmlListe ? window._pdfBankaHtmlListe(t.paraBirimi || 'USD') : '<div class="pi-d-info-line">Banking details unavailable</div>')
    + '</div>';
  html += '<div><div class="pi-d-info-label">' + esc(L.tradeTerms || 'Trade Terms') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.teslim || 'Delivery') + ':</strong> ' + esc(t.teslim || '') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.odeme || 'Payment') + ':</strong> ' + esc(t.odeme || '') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.gecerli || 'Valid') + ':</strong> ' + esc(t.gecerlilik || '30 days') + '</div>';
  html += '</div></div>';

  /* Şartlar */
  if (Array.isArray(t.sartlar) && t.sartlar.length) {
    html += '<div class="pi-d-terms">';
    html += '<div class="pi-d-terms-label">' + esc(L.sartlar || 'Terms & Conditions') + '</div>';
    html += '<ol class="pi-d-terms-list">';
    t.sartlar.forEach(function(s) { html += '<li>' + esc(String(s)) + '</li>'; });
    html += '</ol></div>';
  }

  /* Footer */
  /* CLAUDE-KURAL-PI-001 madde 5: footer'a kurumsal bilgi (PI_ADRES) */
  html += '<div class="pi-d-footer">';
  html += (window._piOriginator?window._piOriginator(t):'') + '<div class="pi-d-sign">' + esc(L.imza || 'Authorized Signature') + '</div>';
  html += '<div style="font-size:9px;color:#86868b;text-align:right;line-height:1.5">'
    + esc(sirket) + '<br/>' + esc(((window.PI_ADRES || {}).web) || 'www.duaycor.com') + '</div>';
  html += '<div class="pi-d-page-no">Page 1 / 1</div>';
  html += '</div></div>';

  if (gizliKod) html += '<div class="gizli-kod">' + esc(gizliKod) + '</div>';
  return html;
};

/* ── Tasarım D2 — alt2-v3 Apple/Corporate (GÖRSELSİZ) ────────── PI-D-001 */
window._piTasarimD2 = function(t, bugun, satirlar, katman, gizliKod, L) {
  L = L || PI_DILLER.EN;
  var sirket = (window.PI_ADRES && window.PI_ADRES.sirket) || 'DUAY GLOBAL';
  var adres1 = (window.PI_ADRES && window.PI_ADRES.adres1) || '';
  var adres2 = (window.PI_ADRES && window.PI_ADRES.adres2) || '';
  var tel    = (window.PI_ADRES && window.PI_ADRES.tel) || '';
  var mail   = (window.PI_ADRES && window.PI_ADRES.mail) || '';
  var mobil  = (window.PI_ADRES && window.PI_ADRES.mobil) || '';
  var web    = (window.PI_ADRES && window.PI_ADRES.web) || '';
  var esc = window._esc || function(s){return String(s||'');};

  var html = '<div class="pi-d-page">';
  html += '<div class="pi-d-banner"></div>';

  html += '<div class="pi-d-meta">';
  html += '<div>';
  html += '<div class="pi-d-brand">' + esc(sirket) + '</div>';
  html += '<div class="pi-d-brand-sub">' + esc(adres1) + (adres2 ? ' · ' + esc(adres2) : '') + '</div>';
  if (tel || mobil || mail || web) html += '<div class="pi-d-brand-sub">' + esc(tel) + (mobil ? ' · WA: ' + esc(mobil) : '') + (mail ? ' · ' + esc(mail) : '') + (web ? ' · ' + esc(web) : '') + '</div>';
  html += '</div>';
  html += '<div>';
  html += '<div class="pi-d-title">' + esc(L.proforma || 'Proforma Invoice') + '</div>';
  html += '<div class="pi-d-pino">' + esc(t.teklifId || t.teklifNo || '') + '</div>';
  html += '<div class="pi-d-pino-meta">' + esc(L.tarih || 'Date') + ': ' + esc(bugun) + ' · Rev ' + esc(t.revNo || '01') + '</div>';
  html += '<div class="pi-d-pino-meta">' + esc(L.gecerli || 'Valid') + ': ' + esc(t.gecerlilik || '30 days') + '</div>';
  html += '</div></div>';

  html += '<div class="pi-d-parties">';
  html += '<div>';
  html += '<div class="pi-d-party-label">' + esc(L.alici || 'Bill To') + '</div>';
  html += '<div class="pi-d-party-name">' + esc(t.musteriAd || t.musteri || '') + '</div>';
  if (t.musteriAdres) html += '<div class="pi-d-party-line">' + esc(t.musteriAdres) + '</div>';
  if (t.musteriTelefon) html += '<div class="pi-d-party-line">Tel: ' + esc(t.musteriTelefon) + '</div>';
  html += '</div>';
  html += '<div>';
  html += '<div class="pi-d-party-label">' + esc(L.kosullar || 'Terms') + '</div>';
  html += '<div class="pi-d-party-line"><strong>' + esc(L.teslim || 'Delivery') + ':</strong> ' + esc(t.teslim || '') + '</div>';
  html += '<div class="pi-d-party-line"><strong>' + esc(L.odeme || 'Payment') + ':</strong> ' + esc(t.odeme || '') + '</div>';
  /* PI-BANKA-001: paraBirimi bug fix — t.dil yerine t.paraBirimi (5 para birimi: USD/EUR/GBP/TRY/CNY) */
  html += '<div class="pi-d-party-line"><strong>Currency:</strong> ' + esc(t.paraBirimi || 'USD') + '</div>';
  html += '</div></div>';

  /* Products — GÖRSELSİZ */
  html += '<table class="pi-d-products">';
  html += '<thead><tr><th style="width:40px;">#</th><th>' + esc(L.urun || 'Product') + '</th><th class="num">' + esc(L.miktar || 'Qty') + '</th><th class="num">' + esc(L.birimFiyat || 'Unit') + '</th><th class="num">' + esc(L.tutar || 'Total') + '</th></tr></thead><tbody>';

  var araToplam = 0;
  satirlar.forEach(function(s) {
    araToplam += Number(s.toplam || 0);
    html += '<tr>';
    html += '<td>' + esc(String(s.no || '')) + '</td>';
    html += '<td>';
    html += '<div class="pi-d-prod-name">' + esc(s.ad || '') + '</div>';
    var subParts = [];
    if (s.kod) subParts.push('Code: ' + s.kod);
    if (s.eskiKod && s.eskiKod !== s.kod) subParts.push('Old: ' + s.eskiKod);
    if (s.gtipNo) subParts.push('HS: ' + s.gtipNo);
    if (s.mensei) subParts.push('Origin: ' + s.mensei);
    if (subParts.length) html += '<div class="pi-d-prod-sub">' + esc(subParts.join(' · ')) + '</div>';
    if (s.aciklama) html += '<div class="pi-d-prod-sub">' + esc(s.aciklama) + '</div>';
    html += '</td>';
    html += '<td class="num">' + esc(String(s.miktar || 0)) + ' ' + esc((window._unitToEN ? window._unitToEN(s.birim) : (s.birim || ''))) + '</td>';
    html += '<td class="num">' + Number(s.satisF || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
    html += '<td class="num">' + Number(s.toplam || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  /* PI-BANKA-001: paraBirimi bug fix — t.dil yerine t.paraBirimi */
  var birim = t.paraBirimi || 'USD';
  html += '<div class="pi-d-totals"><div class="pi-d-totals-block">';
  /* SATIS-PI-CONTENT-UNIFY-001: CIF/CFR Insurance + Freight (Strateji C) */
  var __fi = (typeof window._piFreightInsuranceHTML === 'function') ? window._piFreightInsuranceHTML(t, L, t.paraBirimi || 'USD') : { preTotalHTML: '', grandTotal: null };
  if (__fi.preTotalHTML) {
    html += __fi.preTotalHTML;
  } else {
    html += '<div class="pi-d-totals-row"><span>' + esc(L.araToplam || 'Subtotal') + '</span><span>' + birim + ' ' + araToplam.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span></div>';
  }
  var __grandTot = (__fi.grandTotal !== null && __fi.grandTotal !== undefined) ? __fi.grandTotal : araToplam;
  html += '<div class="pi-d-totals-row grand"><span>' + esc(L.toplam || 'Total') + '</span><span>' + birim + ' ' + __grandTot.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span></div>';
  html += '</div></div>';

  html += '<div class="pi-d-info-grid">';
  /* PI-BANKA-001: Banking — placeholder yerine helper'dan kompakt liste (3 banka × paraBirimi) */
  html += '<div><div class="pi-d-info-label">' + esc(L.banking || 'Banking') + '</div>'
    + (window._pdfBankaHtmlListe ? window._pdfBankaHtmlListe(t.paraBirimi || 'USD') : '<div class="pi-d-info-line">Banking details unavailable</div>')
    + '</div>';
  html += '<div><div class="pi-d-info-label">' + esc(L.tradeTerms || 'Trade Terms') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.teslim || 'Delivery') + ':</strong> ' + esc(t.teslim || '') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.odeme || 'Payment') + ':</strong> ' + esc(t.odeme || '') + '</div>';
  html += '<div class="pi-d-info-line"><strong>' + esc(L.gecerli || 'Valid') + ':</strong> ' + esc(t.gecerlilik || '30 days') + '</div>';
  html += '</div></div>';

  if (Array.isArray(t.sartlar) && t.sartlar.length) {
    html += '<div class="pi-d-terms">';
    html += '<div class="pi-d-terms-label">' + esc(L.sartlar || 'Terms & Conditions') + '</div>';
    html += '<ol class="pi-d-terms-list">';
    t.sartlar.forEach(function(s) { html += '<li>' + esc(String(s)) + '</li>'; });
    html += '</ol></div>';
  }

  /* CLAUDE-KURAL-PI-001 madde 5: footer'a kurumsal bilgi (PI_ADRES) */
  html += '<div class="pi-d-footer">';
  html += (window._piOriginator?window._piOriginator(t):'') + '<div class="pi-d-sign">' + esc(L.imza || 'Authorized Signature') + '</div>';
  html += '<div style="font-size:9px;color:#86868b;text-align:right;line-height:1.5">'
    + esc(sirket) + '<br/>' + esc(((window.PI_ADRES || {}).web) || 'www.duaycor.com') + '</div>';
  html += '<div class="pi-d-page-no">Page 1 / 1</div>';
  html += '</div></div>';

  if (gizliKod) html += '<div class="gizli-kod">' + esc(gizliKod) + '</div>';
  return html;
};

/* SATIS-009: production console.log temizliği — load mesajı kaldırıldı */
