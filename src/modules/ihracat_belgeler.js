/**
 * src/modules/ihracat_belgeler.js — v1.0.0
 * 24 belge tipi, C Sistemi tasarim, TR/EN dil destegi, Parasut Excel
 * @module IhracatBelgeler
 */
(function IhracatBelgeler() {
'use strict';

/* ── Helpers ─────────────────────────────────────────────────── */
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
var _g = function(id) { return document.getElementById(id); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };
var _loadD = function() { return typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar() : []; };
var _loadU = function() { return typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : []; };
var _loadC = function() { return typeof window.loadCari === 'function' ? window.loadCari() : []; };
var _loadGCB = function() { return typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb() : []; };
var _loadBL = function() { return typeof window.loadIhracatBl === 'function' ? window.loadIhracatBl() : []; };
var _loadE = function() { return typeof window.loadIhracatEvraklar === 'function' ? window.loadIhracatEvraklar() : []; };
var _fmt = function(n) { return (parseFloat(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var _fmtI = function(n) { return (parseInt(n) || 0).toLocaleString('tr-TR'); };

/* ── DUAY Sabit Bilgileri ───────────────────────────────────── */
var DUAY = {
  ad: 'DUAY GLOBAL TRADE LTD. \u015eTİ.',
  adres: 'Maslak Mah. Ao\u00e7 2 Cad. No:7/1 Sar\u0131yer / \u0130stanbul',
  tel: '+90 212 XXX XX XX', fax: '+90 212 XXX XX XX',
  vkn: 'XXXXXXXXXX', eori: 'TR-XXXXXXXXXX',
  banka: 'T\u00fcrkiye \u0130\u015f Bankas\u0131', sube: 'Maslak \u015eubesi',
  iban_usd: 'TR00 0000 0000 0000 0000 0000 00', iban_eur: 'TR00 0000 0000 0000 0000 0000 01',
  swift: 'XXXXTRXX'
};

/* ── Dil S\u00f6zl\u00fc\u011f\u00fc ──────────────────────────────────────── */
var LANG = {
  PI:{tr:'Proforma Fatura',en:'Proforma Invoice'}, CI:{tr:'Ticari Fatura',en:'Commercial Invoice'},
  PL:{tr:'Ambalaj Listesi',en:'Packing List'}, FI:{tr:'Navlun Faturas\u0131',en:'Freight Invoice'},
  SI:{tr:'Numune Faturas\u0131',en:'Sample Invoice'}, GCI:{tr:'G\u00fcmr\u00fck Faturas\u0131',en:'Customs Invoice'},
  KT:{tr:'Kon\u015fimento Talimat\u0131',en:'Bill of Lading Instruction'}, SE:{tr:'Sevk Emri',en:'Shipping Order'},
  ST:{tr:'Sevk Talimat\u0131',en:'Shipping Instruction'}, NTF:{tr:'Navlun Teklif Talep',en:'Freight Quote Request'},
  NFO:{tr:'Navlun Fiyat Onay',en:'Freight Price Approval'}, SIG:{tr:'Sigorta Talep Formu',en:'Insurance Request Form'},
  PO:{tr:'Sat\u0131n Alma Sipari\u015fi',en:'Purchase Order'}, MTF:{tr:'Mal Teslim Formu',en:'Goods Receipt Form'},
  MTET:{tr:'Mal Teslim Etme',en:'Goods Handover Record'}, IRK:{tr:'\u0130rsaliye',en:'Delivery Note'},
  QC:{tr:'Kalite Kontrol Raporu',en:'Quality Control Report'}, KYT:{tr:'Kont. Y\u00fckleme Tutana\u011f\u0131',en:'Container Stuffing Record'},
  HOS:{tr:'Hesap \u00d6zeti',en:'Account Statement'}, TD:{tr:'Tahsilat Dekontu',en:'Collection Receipt'},
  OD:{tr:'\u00d6deme Dekontu',en:'Payment Receipt'},
  musteri:{tr:'M\u00fc\u015fteri',en:'Customer'}, ihracatci:{tr:'\u0130hracat\u00e7\u0131',en:'Exporter'},
  tarih:{tr:'Tarih',en:'Date'}, referans:{tr:'Referans',en:'Reference'},
  urunAdi:{tr:'\u00dcr\u00fcn Ad\u0131',en:'Product Description'}, urunKodu:{tr:'\u00dcr\u00fcn Kodu',en:'Product Code'},
  miktar:{tr:'Miktar',en:'Quantity'}, birim:{tr:'Birim',en:'Unit'}, birimFiyat:{tr:'Birim Fiyat',en:'Unit Price'},
  toplamTutar:{tr:'Toplam',en:'Total Amount'}, navlun:{tr:'Navlun',en:'Freight'}, sigorta:{tr:'Sigorta',en:'Insurance'},
  genelToplam:{tr:'Genel Toplam',en:'Grand Total'}, teslimSekli:{tr:'Teslim \u015eekli',en:'Incoterms'},
  odemeKosulu:{tr:'\u00d6deme Ko\u015fulu',en:'Payment Terms'}, yuklemeLimani:{tr:'Y\u00fckleme Liman\u0131',en:'Port of Loading'},
  varisLimani:{tr:'Var\u0131\u015f Liman\u0131',en:'Port of Discharge'}, brut:{tr:'Br\u00fct KG',en:'Gross Weight (KG)'},
  net:{tr:'Net KG',en:'Net Weight (KG)'}, kap:{tr:'Kap Adedi',en:'Number of Packages'},
  ambalaj:{tr:'Ambalaj',en:'Package Type'}, hsKodu:{tr:'HS Kodu',en:'HS Code'}, mensei:{tr:'Men\u015fei \u00dclke',en:'Country of Origin'},
  konteynerNo:{tr:'Konteyner No',en:'Container No'}, muhurNo:{tr:'M\u00fch\u00fcr No',en:'Seal No'},
  imza:{tr:'\u0130mza',en:'Signature'}, toplam:{tr:'Toplam',en:'Total'}, kdv:{tr:'KDV',en:'VAT'},
  alici:{tr:'Al\u0131c\u0131',en:'Buyer/Consignee'}, gonderen:{tr:'G\u00f6nderen',en:'Shipper'},
  banka:{tr:'Banka',en:'Bank'}, iban:{tr:'IBAN',en:'IBAN'}, swift:{tr:'SWIFT',en:'SWIFT'},
  borc:{tr:'Bor\u00e7',en:'Debit'}, alacak:{tr:'Alacak',en:'Credit'}, bakiye:{tr:'Bakiye',en:'Balance'},
  teslimEden:{tr:'Teslim Eden',en:'Delivered By'}, teslimAlan:{tr:'Teslim Alan',en:'Received By'},
  notlar:{tr:'Notlar',en:'Notes'}, gecerlilik:{tr:'Ge\u00e7erlilik',en:'Validity'}
};
var _t = function(key, lang) { return (LANG[key] && LANG[key][lang]) || (LANG[key] && LANG[key].tr) || key; };

/* ── C Sistemi CSS ──────────────────────────────────────────── */
function _C_CSS() {
  return '<style>'
  + '*{box-sizing:border-box;margin:0;padding:0}'
  + 'body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}'
  + '.c-page{max-width:210mm;margin:0 auto;padding:20px 24px}'
  + '.c-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 24px}'
  + '.c-logo-mark{width:36px;height:36px;background:#1a1a1a;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;flex-shrink:0}'
  + '.c-company{font-size:8px;color:#666;line-height:1.5;margin-left:10px}'
  + '.c-dtype{font-size:20px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.1;text-align:right}'
  + '.c-dno{font-size:11px;font-weight:600;text-align:right;margin-top:5px}'
  + '.c-ddate{font-size:9px;color:#888;text-align:right}'
  + '.c-divider{height:1px;background:#1a1a1a;margin:0 24px}'
  + '.c-strip{background:#1a1a1a;padding:8px 24px;font-size:8px;color:rgba(255,255,255,0.65);display:flex;gap:16px;flex-wrap:wrap}'
  + '.c-strip .bt{color:#fff;font-weight:700}'
  + '.c-table{width:100%;border-collapse:collapse}'
  + '.c-table thead th{padding:7px 12px;font-size:8px;font-weight:700;letter-spacing:0.6px;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;background:#f8f8f8;text-align:left}'
  + '.c-table th.r,.c-table td.r{text-align:right}'
  + '.c-table tbody td{padding:6px 12px;font-size:10px;border-bottom:0.5px solid #eee;vertical-align:top}'
  + '.c-table tbody tr:last-child td{border-bottom:1px solid #1a1a1a}'
  + '.c-code{font-size:8px;color:#888;font-family:monospace;display:block;margin-top:1px}'
  + '.c-info{display:flex;padding:11px 24px;border-bottom:1px solid #1a1a1a;gap:0}'
  + '.c-info-left{flex:2}'
  + '.c-info-right{flex:1.2;border-left:1px solid #eee;padding-left:18px;display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}'
  + '.c-meta-item .ml{font-size:7.5px;letter-spacing:0.5px;color:#888;margin-bottom:1px}'
  + '.c-meta-item .mv{font-size:10px;font-weight:600;color:#1a1a1a}'
  + '.kv{display:flex;gap:8px;padding:3px 0;border-bottom:0.5px solid #f0f0f0;font-size:9px}'
  + '.kl{color:#888;min-width:110px;flex-shrink:0}'
  + '.kv2{font-weight:600;color:#1a1a1a}'
  + '.sl{font-size:8px;font-weight:700;letter-spacing:0.8px;color:#888;margin-bottom:6px}'
  + '.sign-box{border:0.5px solid #ccc;border-radius:4px;min-height:48px;display:flex;align-items:flex-end;padding:5px 10px;background:#fafafa}'
  + '.sign-label{font-size:8px;color:#aaa;border-top:0.5px solid #ccc;width:100%;padding-top:4px;margin-top:20px}'
  + '.ib-band{padding:10px 24px;background:#f8f8f8;border-bottom:1px solid #1a1a1a}'
  + '.ib-item .ibl{font-size:7.5px;color:#888;margin-bottom:1px}'
  + '.ib-item .ibv{font-size:10px;font-weight:700;color:#1a1a1a}'
  + '.fill-box{border:1.5px dashed #ccc;border-radius:4px;padding:8px 10px;min-height:48px;background:#fafafa}'
  + '.fill-label{font-size:8px;color:#aaa;font-style:italic}'
  + '.badge-ok{background:#EAF3DE;color:#27500A;font-size:9px;padding:1px 7px;border-radius:3px;font-weight:600}'
  + '.badge-warn{background:#FAEEDA;color:#854F0B;font-size:9px;padding:1px 7px;border-radius:3px;font-weight:600}'
  + '.badge-bad{background:#FCEBEB;color:#791F1F;font-size:9px;padding:1px 7px;border-radius:3px;font-weight:600}'
  + '.chk-on{background:#1a1a1a;color:#fff;width:13px;height:13px;border-radius:2px;display:inline-flex;align-items:center;justify-content:center;font-size:9px}'
  + '.chk-off{border:1.5px solid #ccc;background:#fafafa;width:13px;height:13px;border-radius:2px;display:inline-block}'
  + '.chk-pend{border:1.5px solid #D97706;background:#FAEEDA;width:13px;height:13px;border-radius:2px;display:inline-block}'
  + '@media print{body{margin:0}.c-strip{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
  + '</style>';
}

/* ── C Header ───────────────────────────────────────────────── */
function _cHeader(docType, docNo, issueDate, extraDate) {
  var h = '<div class="c-hdr">';
  h += '<div style="display:flex;align-items:flex-start;gap:10px">';
  h += '<div class="c-logo-mark">D</div>';
  h += '<div class="c-company"><strong>' + DUAY.ad + '</strong><br>' + DUAY.adres + '<br>Tel: ' + DUAY.tel + ' \u00b7 VKN: ' + DUAY.vkn + '</div>';
  h += '</div>';
  h += '<div><div class="c-dtype">' + _esc(docType) + '</div>';
  h += '<div class="c-dno">' + _esc(docNo) + '</div>';
  h += '<div class="c-ddate">' + _esc(issueDate || _today()) + '</div>';
  if (extraDate) h += '<div class="c-ddate">' + _esc(extraDate) + '</div>';
  h += '</div></div>';
  h += '<div class="c-divider"></div>';
  return h;
}

/* ── Ürün Tablosu Yardımcısı ────────────────────────────────── */
function _urunTablosu(urunler, kolonlar, lang) {
  var h = '<table class="c-table"><thead><tr>';
  h += '<th>#</th>';
  kolonlar.forEach(function(k) { h += '<th' + (k.r ? ' class="r"' : '') + '>' + _esc(k.l) + '</th>'; });
  h += '</tr></thead><tbody>';
  var toplam = 0;
  urunler.forEach(function(u, i) {
    h += '<tr>';
    h += '<td>' + (i + 1) + '</td>';
    kolonlar.forEach(function(k) {
      var val = '';
      if (k.k === 'urunAdi') val = _esc(u.standart_urun_adi || u.aciklama || '') + '<span class="c-code">' + _esc(u.urun_kodu || '') + '</span>';
      else if (k.k === 'miktar') val = _fmtI(u.miktar);
      else if (k.k === 'birim') val = _esc(u.birim || 'PCS');
      else if (k.k === 'birimFiyat') val = _esc(u.doviz || 'USD') + ' ' + _fmt(u.birim_fiyat);
      else if (k.k === 'toplam') { var t = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); toplam += t; val = _fmt(t); }
      else if (k.k === 'brut') val = _fmt(u.brut_kg);
      else if (k.k === 'net') val = _fmt(u.net_kg);
      else if (k.k === 'koli') val = _fmtI(u.koli_adet);
      else if (k.k === 'ambalaj') val = _esc(u.ambalaj_tipi || '');
      else if (k.k === 'hs') val = _esc(u.hs_kodu || '');
      else val = _esc(u[k.k] || '');
      h += '<td' + (k.r ? ' class="r"' : '') + '>' + val + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  return { html: h, toplam: toplam };
}

/* ── İmza Bloğu ─────────────────────────────────────────────── */
function _imzaBlok(labels) {
  var h = '<div style="display:flex;gap:16px;padding:16px 24px;margin-top:12px">';
  labels.forEach(function(l) {
    h += '<div style="flex:1"><div class="sign-box"></div><div class="sign-label">' + _esc(l) + '</div></div>';
  });
  h += '</div>';
  return h;
}

/* ── Banka Strip ────────────────────────────────────────────── */
function _bankaStrip(doviz) {
  var iban = doviz === 'EUR' ? DUAY.iban_eur : DUAY.iban_usd;
  return '<div class="c-strip"><span><span class="bt">BANK:</span> ' + DUAY.banka + '</span><span><span class="bt">BRANCH:</span> ' + DUAY.sube + '</span><span><span class="bt">IBAN:</span> ' + iban + '</span><span><span class="bt">SWIFT:</span> ' + DUAY.swift + '</span></div>';
}

/* ══════════════════════════════════════════════════════════════
   BELGE FONKSİYONLARI
   ══════════════════════════════════════════════════════════════ */

/* ── PI ─────────────────────────────────────────────────────── */
function _belgePI(d, urunler, opts, lang) {
  opts = opts || {};
  var gecGun = opts.gecerlilikGun || 3;
  var validDate = new Date(); validDate.setDate(validDate.getDate() + gecGun);
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PI</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('PI', lang).replace(' ', '\n'), 'PI-' + (d.dosyaNo || ''), d.teklif_tarihi || _today(), _t('gecerlilik', lang) + ': ' + validDate.toISOString().slice(0, 10));
  h += '<div class="c-info"><div class="c-info-left">';
  h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('gonderen', lang) + '</span><span class="kv2">' + DUAY.ad + '</span></div>';
  h += '</div><div class="c-info-right">';
  h += '<div class="c-meta-item"><div class="ml">' + _t('teslimSekli', lang) + '</div><div class="mv">' + _esc(d.teslim_sekli || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('odemeKosulu', lang) + '</div><div class="mv">' + _esc(d.odeme_sarti || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('yuklemeLimani', lang) + '</div><div class="mv">' + _esc(d.yukleme_limani || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('varisLimani', lang) + '</div><div class="mv">' + _esc(d.varis_limani || '') + '</div></div>';
  h += '</div></div>';
  var tbl = _urunTablosu(urunler, [
    { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
    { k:'birim', l:_t('birim',lang) }, { k:'birimFiyat', l:_t('birimFiyat',lang), r:true },
    { k:'toplam', l:_t('toplamTutar',lang), r:true }
  ], lang);
  h += '<div style="padding:0 24px">' + tbl.html + '</div>';
  h += '<div style="display:flex;padding:10px 24px;gap:24px"><div style="flex:1;font-size:9px;color:#888"></div>';
  h += '<div style="min-width:200px"><div class="kv"><span class="kl">' + _t('toplam', lang) + '</span><span class="kv2">' + _fmt(tbl.toplam) + '</span></div>';
  if (opts.navlunGoster && d.navlun_tutar) h += '<div class="kv"><span class="kl">' + _t('navlun', lang) + '</span><span class="kv2">' + _fmt(d.navlun_tutar) + '</span></div>';
  var genel = tbl.toplam + (opts.navlunGoster ? (parseFloat(d.navlun_tutar) || 0) : 0);
  h += '<div class="kv" style="border-bottom:2px solid #1a1a1a"><span class="kl" style="font-weight:700">' + _t('genelToplam', lang) + '</span><span class="kv2" style="font-size:12px">' + _fmt(genel) + '</span></div>';
  h += '</div></div>';
  h += _bankaStrip(urunler[0]?.doviz || 'USD');
  h += '<div style="padding:8px 24px;background:#FAEEDA;font-size:10px;color:#854F0B">\u23f0 ' + (lang === 'en' ? 'This proforma is valid for ' + gecGun + ' days.' : 'Bu proforma ' + gecGun + ' g\u00fcn ge\u00e7erlidir.') + '</div>';
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── CI ─────────────────────────────────────────────────────── */
function _belgeCI(d, urunler, opts, lang) {
  opts = opts || {};
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CI</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('CI', lang).replace(' ', '\n'), d.ihracat_fatura_id || d.dosyaNo || '', d.ihracat_fatura_tarihi || _today());
  h += '<div class="c-info"><div class="c-info-left">';
  h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('gonderen', lang) + '</span><span class="kv2">' + DUAY.ad + '</span></div>';
  h += '</div><div class="c-info-right">';
  h += '<div class="c-meta-item"><div class="ml">' + _t('teslimSekli', lang) + '</div><div class="mv">' + _esc(d.teslim_sekli || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('odemeKosulu', lang) + '</div><div class="mv">' + _esc(d.odeme_sarti || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('yuklemeLimani', lang) + '</div><div class="mv">' + _esc(d.yukleme_limani || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('varisLimani', lang) + '</div><div class="mv">' + _esc(d.varis_limani || '') + '</div></div>';
  h += '</div></div>';
  var tbl = _urunTablosu(urunler, [
    { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
    { k:'birim', l:_t('birim',lang) }, { k:'birimFiyat', l:_t('birimFiyat',lang), r:true },
    { k:'toplam', l:_t('toplamTutar',lang), r:true }
  ], lang);
  h += '<div style="padding:0 24px">' + tbl.html + '</div>';
  h += '<div style="display:flex;padding:10px 24px"><div style="flex:1"></div>';
  h += '<div style="min-width:200px"><div class="kv" style="border-bottom:2px solid #1a1a1a"><span class="kl" style="font-weight:700">' + _t('genelToplam', lang) + '</span><span class="kv2" style="font-size:12px">' + _fmt(tbl.toplam) + '</span></div></div></div>';
  h += _bankaStrip(urunler[0]?.doviz || 'USD');
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── PL ─────────────────────────────────────────────────────── */
function _belgePL(d, urunler, opts, lang) {
  opts = opts || {};
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PL</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('PL', lang).replace(' ', '\n'), d.dosyaNo || '', _today());
  var topKoli = 0, topBrut = 0, topNet = 0;
  urunler.forEach(function(u) { topKoli += parseInt(u.koli_adet) || 0; topBrut += parseFloat(u.brut_kg) || 0; topNet += parseFloat(u.net_kg) || 0; });
  h += '<div class="c-strip"><span><span class="bt">' + _t('konteynerNo', lang) + ':</span> ' + _esc(d.konteyner_no || '—') + '</span>';
  h += '<span><span class="bt">' + _t('muhurNo', lang) + ':</span> ' + _esc(d.muhur_no || '—') + '</span>';
  h += '<span><span class="bt">' + _t('kap', lang) + ':</span> ' + topKoli + '</span>';
  h += '<span><span class="bt">' + _t('brut', lang) + ':</span> ' + _fmt(topBrut) + '</span>';
  h += '<span><span class="bt">' + _t('net', lang) + ':</span> ' + _fmt(topNet) + '</span></div>';
  var tbl = _urunTablosu(urunler, [
    { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
    { k:'birim', l:_t('birim',lang) }, { k:'koli', l:_t('kap',lang), r:true },
    { k:'ambalaj', l:_t('ambalaj',lang) }, { k:'brut', l:_t('brut',lang), r:true },
    { k:'net', l:_t('net',lang), r:true }
  ], lang);
  h += '<div style="padding:0 24px">' + tbl.html + '</div>';
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── FI — Freight Invoice ───────────────────────────────────── */
function _belgeFI(d, urunler, opts, lang) {
  opts = opts || {};
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>FI</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('FI', lang).replace(' ', '\n'), 'FI-' + (d.dosyaNo || ''), _today());
  h += '<div class="c-info"><div class="c-info-left">';
  h += '<div class="kv"><span class="kl">' + _t('referans', lang) + '</span><span class="kv2">' + _esc(d.ihracat_fatura_id || d.dosyaNo || '') + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
  h += '</div><div class="c-info-right">';
  h += '<div class="c-meta-item"><div class="ml">Route</div><div class="mv">' + _esc(d.yukleme_limani || '') + ' \u2192 ' + _esc(d.varis_limani || '') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">Container</div><div class="mv">' + _esc(d.konteyner_tipi || '') + '</div></div>';
  h += '</div></div>';
  h += '<table class="c-table" style="margin:0 24px;width:calc(100% - 48px)"><thead><tr><th>#</th><th>DESCRIPTION</th><th class="r">AMOUNT</th></tr></thead><tbody>';
  var navlun = parseFloat(d.navlun_tutar) || 0;
  h += '<tr><td>1</td><td>Ocean Freight \u2014 ' + _esc(d.yukleme_limani || '') + ' to ' + _esc(d.varis_limani || '') + '</td><td class="r">' + _fmt(navlun) + '</td></tr>';
  if (opts.sigortaDagitim === 'dahil' && d.sigorta_tutar) h += '<tr><td>2</td><td>Marine Insurance</td><td class="r">' + _fmt(d.sigorta_tutar) + '</td></tr>';
  h += '</tbody></table>';
  h += '<div style="padding:10px 24px;text-align:right"><strong>' + _t('genelToplam', lang) + ': ' + _fmt(navlun + (opts.sigortaDagitim === 'dahil' ? (parseFloat(d.sigorta_tutar) || 0) : 0)) + '</strong></div>';
  h += _bankaStrip('USD');
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── SI — Sample Invoice ───────────────────────────────────── */
function _belgeSI(d, urunler, opts, lang) {
  opts = opts || {};
  var numUrunler = opts.numuneUrunler ? urunler.filter(function(u) { return opts.numuneUrunler.indexOf(u.id) !== -1; }) : urunler;
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>SI</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('SI', lang).replace(' ', '\n'), 'SI-' + (d.dosyaNo || '') + '-' + (opts.siNo || '01'), _today());
  h += '<div style="padding:8px 24px;background:#FAEEDA;font-size:10px;color:#854F0B;font-weight:600;text-align:center">SAMPLE INVOICE \u2014 No Commercial Value / Numune \u2014 Ticari De\u011feri Yoktur</div>';
  h += '<div class="c-info"><div class="c-info-left">';
  h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
  h += '</div><div class="c-info-right"></div></div>';
  numUrunler.forEach(function(u, i) { u._siPrice = 0.01; });
  var tbl = _urunTablosu(numUrunler, [
    { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
    { k:'birim', l:_t('birim',lang) }, { k:'birimFiyat', l:'VALUE', r:true }
  ], lang);
  h += '<div style="padding:0 24px">' + tbl.html + '</div>';
  h += '<div style="padding:10px 24px;font-size:9px;color:#888;font-style:italic">' + (lang === 'en' ? 'These goods are sent as commercial samples of no commercial value.' : 'Numune olup sat\u0131\u015fa konu de\u011fildir.') + '</div>';
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── GCI — Gümrük CI ────────────────────────────────────────── */
function _belgeGCI(d, urunler, opts, lang) {
  opts = opts || {};
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>GCI</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t('GCI', lang).replace(' ', '\n'), (d.dosyaNo || '') + '-GCI', _today());
  h += '<div style="padding:6px 24px;background:#1a1a1a;color:#fff;font-size:10px;font-weight:600;text-align:center">' + (lang === 'en' ? 'FOR CUSTOMS DECLARATION' : 'G\u00dcMR\u00dcK BEYANNAMES\u0130 \u0130\u00c7\u0130N') + '</div>';
  h += '<div class="c-info"><div class="c-info-left">';
  h += '<div class="kv"><span class="kl">VKN / EORI</span><span class="kv2">' + DUAY.vkn + ' \u00b7 ' + DUAY.eori + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
  h += '</div><div class="c-info-right">';
  h += '<div class="c-meta-item"><div class="ml">' + _t('mensei', lang) + '</div><div class="mv">' + _esc(d.mense_ulke || 'T\u00fcrkiye') + '</div></div>';
  h += '<div class="c-meta-item"><div class="ml">' + _t('teslimSekli', lang) + '</div><div class="mv">' + _esc(d.teslim_sekli || '') + '</div></div>';
  h += '</div></div>';
  var tbl = _urunTablosu(urunler, [
    { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'hs', l:_t('hsKodu',lang) },
    { k:'miktar', l:_t('miktar',lang), r:true }, { k:'birimFiyat', l:_t('birimFiyat',lang), r:true },
    { k:'toplam', l:'FOB', r:true }, { k:'brut', l:_t('brut',lang), r:true }, { k:'net', l:_t('net',lang), r:true }
  ], lang);
  h += '<div style="padding:0 24px">' + tbl.html + '</div>';
  var navlun = parseFloat(d.navlun_tutar) || 0;
  var sigorta = parseFloat(d.sigorta_tutar) || 0;
  h += '<div style="padding:10px 24px"><div class="kv"><span class="kl">FOB</span><span class="kv2">' + _fmt(tbl.toplam) + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('navlun', lang) + '</span><span class="kv2">' + _fmt(navlun) + '</span></div>';
  h += '<div class="kv"><span class="kl">' + _t('sigorta', lang) + '</span><span class="kv2">' + _fmt(sigorta) + '</span></div>';
  h += '<div class="kv" style="border-bottom:2px solid #1a1a1a"><span class="kl" style="font-weight:700">CIF</span><span class="kv2" style="font-size:12px">' + _fmt(tbl.toplam + navlun + sigorta) + '</span></div></div>';
  h += _imzaBlok([DUAY.ad]);
  h += '</div></body></html>';
  return h;
}

/* ── Basit belge fabrikası (KT, SE, ST, NTF, NFO, SIG, PO, MTF, MTET, IRK, QC, KYT, HOS, TD, OD, KAPAK) ── */
function _basitBelge(tur, d, urunler, opts, lang) {
  opts = opts || {};
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + tur + '</title>' + _C_CSS() + '</head><body><div class="c-page">';
  h += _cHeader(_t(tur, lang) || tur, (d.dosyaNo || '') + '-' + tur, _today());

  if (tur === 'KT') {
    h += '<div class="c-info"><div class="c-info-left">';
    h += '<div class="kv"><span class="kl">' + _t('gonderen', lang) + '</span><span class="kv2">' + DUAY.ad + '</span></div>';
    h += '<div class="kv"><span class="kl">Booking</span><span class="kv2">' + _esc(d.booking_no || '') + '</span></div>';
    h += '</div><div class="c-info-right">';
    h += '<div class="c-meta-item"><div class="ml">' + _t('yuklemeLimani', lang) + '</div><div class="mv">' + _esc(d.yukleme_limani || '') + '</div></div>';
    h += '<div class="c-meta-item"><div class="ml">' + _t('varisLimani', lang) + '</div><div class="mv">' + _esc(d.varis_limani || '') + '</div></div>';
    h += '</div></div>';
    if (urunler.length) {
      var tbl = _urunTablosu(urunler, [{ k:'urunAdi', l:_t('urunAdi',lang) }, { k:'hs', l:_t('hsKodu',lang) }], lang);
      h += '<div style="padding:0 24px">' + tbl.html + '</div>';
    }
    h += _imzaBlok([DUAY.ad, _t('alici', lang)]);
  }
  else if (tur === 'PO') {
    h += '<div class="c-info"><div class="c-info-left">';
    h += '<div class="kv"><span class="kl">' + (lang === 'en' ? 'Supplier' : 'Tedarik\u00e7i') + '</span><span class="kv2">' + _esc(opts.tedarikci || '') + '</span></div>';
    h += '</div><div class="c-info-right">';
    h += '<div class="c-meta-item"><div class="ml">' + _t('odemeKosulu', lang) + '</div><div class="mv">' + _esc(d.odeme_sarti || '') + '</div></div>';
    h += '</div></div>';
    if (urunler.length) {
      var tblPO = _urunTablosu(urunler, [
        { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
        { k:'birim', l:_t('birim',lang) }, { k:'birimFiyat', l:_t('birimFiyat',lang), r:true },
        { k:'toplam', l:_t('toplamTutar',lang), r:true }
      ], lang);
      h += '<div style="padding:0 24px">' + tblPO.html + '</div>';
    }
    h += _imzaBlok([DUAY.ad, (lang === 'en' ? 'Supplier' : 'Tedarik\u00e7i')]);
  }
  else if (tur === 'HOS') {
    h += '<div class="c-info"><div class="c-info-left">';
    h += '<div class="kv"><span class="kl">' + _t('musteri', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
    h += '</div><div class="c-info-right">';
    h += '<div class="c-meta-item"><div class="ml">' + (lang === 'en' ? 'Period' : 'D\u00f6nem') + '</div><div class="mv">' + _esc(opts.donem || _today()) + '</div></div>';
    h += '</div></div>';
    var faturalar = opts.faturalar || [];
    var tahsilatlar = opts.tahsilatlar || [];
    h += '<table class="c-table" style="margin:0 24px;width:calc(100% - 48px)"><thead><tr><th>' + _t('tarih', lang) + '</th><th>' + _t('referans', lang) + '</th><th>' + (lang === 'en' ? 'Description' : 'A\u00e7\u0131klama') + '</th><th class="r">' + _t('borc', lang) + '</th><th class="r">' + _t('alacak', lang) + '</th><th class="r">' + _t('bakiye', lang) + '</th></tr></thead><tbody>';
    var bakiye = 0;
    faturalar.concat(tahsilatlar).sort(function(a, b) { return (a.tarih || '').localeCompare(b.tarih || ''); }).forEach(function(item) {
      var isBorc = item.tip === 'fatura';
      if (isBorc) bakiye += parseFloat(item.tutar) || 0; else bakiye -= parseFloat(item.tutar) || 0;
      h += '<tr><td>' + _esc(item.tarih || '') + '</td><td>' + _esc(item.ref || '') + '</td><td>' + _esc(item.aciklama || '') + '</td>';
      h += '<td class="r">' + (isBorc ? _fmt(item.tutar) : '') + '</td><td class="r"' + (!isBorc ? ' style="color:#16A34A"' : '') + '>' + (!isBorc ? _fmt(item.tutar) : '') + '</td>';
      h += '<td class="r"' + (bakiye > 0 ? ' style="color:#DC2626"' : '') + '>' + _fmt(bakiye) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += _imzaBlok([DUAY.ad]);
  }
  else if (tur === 'TD' || tur === 'OD') {
    var label = tur === 'TD' ? _t('TD', lang) : _t('OD', lang);
    h += '<div style="padding:24px;text-align:center"><div style="font-size:10px;color:#888;margin-bottom:4px">' + label + '</div>';
    h += '<div style="font-size:28px;font-weight:700">' + _esc(opts.doviz || 'USD') + ' ' + _fmt(opts.miktar || 0) + '</div></div>';
    h += '<div style="padding:0 24px">';
    h += '<div class="kv"><span class="kl">' + (tur === 'TD' ? (lang === 'en' ? 'Payer' : '\u00d6deyen') : (lang === 'en' ? 'Payee' : 'Alacakl\u0131')) + '</span><span class="kv2">' + _esc(opts.firma || '') + '</span></div>';
    h += '<div class="kv"><span class="kl">' + _t('referans', lang) + '</span><span class="kv2">' + _esc(opts.faturaRef || '') + '</span></div>';
    h += '<div class="kv"><span class="kl">' + _t('banka', lang) + '</span><span class="kv2">' + _esc(opts.banka || '') + '</span></div>';
    h += '</div>';
    h += _imzaBlok([DUAY.ad]);
  }
  else if (tur === 'KAPAK') {
    h += '<div style="padding:24px;text-align:center">';
    h += '<div style="font-size:28px;font-weight:700;margin-bottom:8px">' + _esc(d.dosyaNo || '') + '</div>';
    h += '<div style="font-size:14px;color:#888">' + _esc(d.musteriAd || '') + '</div>';
    h += '</div>';
    h += '<div style="padding:0 24px"><div class="sl">' + (lang === 'en' ? 'DOCUMENT CHECKLIST' : 'BELGE KONTROL L\u0130STES\u0130') + '</div>';
    var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
    var belgeListesi = ['PI','CI','PL','FI','GCI','KT','SE','BL','GCB','MENSEI','EUR1','INSP','SIG','PO','MTF','IRK'];
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">';
    belgeListesi.forEach(function(b) {
      var mevcut = evraklar.find(function(e) { return e.tur === b; });
      var cls = mevcut ? (mevcut.durum === 'gonderildi' || mevcut.durum === 'tamamlandi' ? 'chk-on' : 'chk-pend') : 'chk-off';
      var icon = cls === 'chk-on' ? '\u2713' : cls === 'chk-pend' ? '!' : '';
      h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px"><span class="' + cls + '">' + icon + '</span>' + b + '</div>';
    });
    h += '</div></div>';
    h += _imzaBlok([lang === 'en' ? 'Opened By' : 'Dosyay\u0131 A\u00e7an', lang === 'en' ? 'Operations' : 'Operasyon', lang === 'en' ? 'Manager Approval' : 'Y\u00f6netici Onay\u0131']);
  }
  else {
    /* Genel fallback — SE, ST, NTF, NFO, SIG, MTF, MTET, IRK, QC, KYT */
    h += '<div class="c-info"><div class="c-info-left">';
    h += '<div class="kv"><span class="kl">' + _t('gonderen', lang) + '</span><span class="kv2">' + DUAY.ad + '</span></div>';
    h += '<div class="kv"><span class="kl">' + _t('alici', lang) + '</span><span class="kv2">' + _esc(d.musteriAd || '') + '</span></div>';
    h += '</div><div class="c-info-right">';
    h += '<div class="c-meta-item"><div class="ml">' + _t('teslimSekli', lang) + '</div><div class="mv">' + _esc(d.teslim_sekli || '') + '</div></div>';
    h += '<div class="c-meta-item"><div class="ml">' + _t('konteynerNo', lang) + '</div><div class="mv">' + _esc(d.konteyner_no || '') + '</div></div>';
    h += '</div></div>';
    if (urunler.length) {
      var tblG = _urunTablosu(urunler, [
        { k:'urunAdi', l:_t('urunAdi',lang) }, { k:'miktar', l:_t('miktar',lang), r:true },
        { k:'koli', l:_t('kap',lang), r:true }, { k:'brut', l:_t('brut',lang), r:true }
      ], lang);
      h += '<div style="padding:0 24px">' + tblG.html + '</div>';
    }
    h += _imzaBlok([DUAY.ad, _t('alici', lang)]);
  }

  h += '</div></body></html>';
  return h;
}

/* ══════════════════════════════════════════════════════════════
   ANA DISPATCH
   ══════════════════════════════════════════════════════════════ */
var BELGE_MAP = {
  PI: _belgePI, CI: _belgeCI, PL: _belgePL, FI: _belgeFI, SI: _belgeSI, GCI: _belgeGCI,
  KT: function(d,u,o,l){ return _basitBelge('KT',d,u,o,l); },
  SE: function(d,u,o,l){ return _basitBelge('SE',d,u,o,l); },
  ST: function(d,u,o,l){ return _basitBelge('ST',d,u,o,l); },
  NTF: function(d,u,o,l){ return _basitBelge('NTF',d,u,o,l); },
  NFO: function(d,u,o,l){ return _basitBelge('NFO',d,u,o,l); },
  SIG: function(d,u,o,l){ return _basitBelge('SIG',d,u,o,l); },
  PO: function(d,u,o,l){ return _basitBelge('PO',d,u,o,l); },
  MTF: function(d,u,o,l){ return _basitBelge('MTF',d,u,o,l); },
  MTET: function(d,u,o,l){ return _basitBelge('MTET',d,u,o,l); },
  IRK: function(d,u,o,l){ return _basitBelge('IRK',d,u,o,l); },
  QC: function(d,u,o,l){ return _basitBelge('QC',d,u,o,l); },
  KYT: function(d,u,o,l){ return _basitBelge('KYT',d,u,o,l); },
  HOS: function(d,u,o,l){ return _basitBelge('HOS',d,u,o,l); },
  TD: function(d,u,o,l){ return _basitBelge('TD',d,u,o,l); },
  OD: function(d,u,o,l){ return _basitBelge('OD',d,u,o,l); },
  KAPAK: function(d,u,o,l){ return _basitBelge('KAPAK',d,u,o,l); }
};

window._ihrBelgeDil = 'en';

/** Dil zorlama tablosu — bu belge tipleri kesinlikle EN */
var EN_ZORUNLU = ['PI','CI','PL','FI','SI','GCI','KT','SE','ST','NTF','NFO','KAPAK'];

window._ihrBelgeHtml = function(d, tur, seviye, urunler, opts) {
  opts = opts || {};
  var lang = opts.lang || (seviye === 'dis' ? 'en' : 'tr');
  if (EN_ZORUNLU.indexOf(tur) !== -1) lang = 'en';
  var orientation = opts.orientation || 'portrait';
  if (!urunler) {
    urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; });
  }
  var fn = BELGE_MAP[tur];
  if (!fn) return '<html><body><p>Belge t\u00fcr\u00fc bulunamad\u0131: ' + _esc(tur) + '</p></body></html>';

  /* Çok sayfalı yapı — PI, CI, PL için */
  var COK_SAYFALI = ['PI','CI','PL','GCI'];
  var SAYFA_BASINA = opts.sayfaBasina || 15;

  if (COK_SAYFALI.indexOf(tur) !== -1 && urunler.length > SAYFA_BASINA) {
    var toplamSayfa = Math.ceil(urunler.length / SAYFA_BASINA);
    var belgeNo = (tur === 'PI' ? 'PI-' : tur === 'GCI' ? '' : '') + (d.dosyaNo || d.id || '');
    var sayfalar = [];
    for (var si = 0; si < toplamSayfa; si++) {
      var sayfaUrunler = urunler.slice(si * SAYFA_BASINA, (si + 1) * SAYFA_BASINA);
      var sayfaOpts = Object.assign({}, opts, { _sayfaNo: si + 1, _toplamSayfa: toplamSayfa, _sayfaUrunler: sayfaUrunler, _ilkSayfa: si === 0, _sonSayfa: si === toplamSayfa - 1, _belgeNo: belgeNo, lang: lang, orientation: orientation });
      sayfalar.push(fn(d, sayfaUrunler, sayfaOpts, lang));
    }
    /* Sayfaları birleştir — tek HTML dökümanı */
    var pageCSS = '@page{size:A4 ' + orientation + ';margin:15mm}';
    var combined = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + tur + '</title>' + _C_CSS()
      + '<style>' + pageCSS + ' .page{page-break-after:always;max-width:210mm;margin:0 auto;padding:20px 24px} .page:last-child{page-break-after:auto} .no-print-area{display:none} @media print{.no-print{display:none!important}}</style>'
      + '</head><body>';
    sayfalar.forEach(function(s, idx) {
      /* Sayfa HTML'inden DOCTYPE/html/head/body taglarını çıkar */
      var inner = s.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<head>[\s\S]*?<\/head>/i, '').replace(/<\/?body[^>]*>/gi, '');
      combined += '<div class="page">' + inner;
      /* Sayfa alt toplamı */
      var sayfaTop = 0; urunler.slice(idx * SAYFA_BASINA, (idx + 1) * SAYFA_BASINA).forEach(function(u) { sayfaTop += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); });
      var sayfaAdet = Math.min(SAYFA_BASINA, urunler.length - idx * SAYFA_BASINA);
      combined += '<div style="display:flex;justify-content:flex-end;margin-top:8px;padding-top:6px;border-top:1px solid #e5e7eb"><div style="min-width:220px"><div style="display:flex;justify-content:space-between;padding:4px 10px;font-size:10px;background:#f9fafb"><span style="color:#6b7280">Page Subtotal (' + sayfaAdet + ' items)</span><span style="font-weight:600">' + _fmt(sayfaTop) + '</span></div></div></div>';
      /* Sayfa numarası */
      combined += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb"><div style="font-size:9px;color:#9ca3af">' + _esc(belgeNo) + ' \u2014 ' + _esc(d.dosyaNo || '') + '</div><div style="font-size:9px;color:#9ca3af;font-weight:600">Page ' + (idx + 1) + ' of ' + toplamSayfa + '</div></div>';
      combined += '</div>'; /* page bitti */
    });
    combined += '</body></html>';
    return combined;
  }

  /* Tek sayfalı — standart üretim */
  var html = fn(d, urunler, opts, lang);
  /* Orientation CSS ekle */
  if (orientation === 'landscape') {
    html = html.replace('</style>', '@page{size:A4 landscape;margin:15mm}</style>');
  }
  return html;
};

/* ══════════════════════════════════════════════════════════════
   PARASUT EXCEL EXPORT
   ══════════════════════════════════════════════════════════════ */
window._ihrParasutExcel = function(dosyaId) {
  if (!window.XLSX) { window.toast?.('SheetJS y\u00fcklenmedi', 'err'); return; }
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var gcbList = _loadGCB().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
  var gcb = gcbList[0];

  var headers = ['M\u00dc\u015eTER\u0130 \u00dcNVANI','FATURA A\u00c7IKLAMASI','FATURA TAR\u0130H\u0130','D\u00d6V\u0130Z C\u0130NS\u0130','D\u00d6V\u0130Z KURU','VADE TAR\u0130H\u0130','TAHS\u0130LAT TL KAR\u015eILI\u011eI','FATURA T\u00dcR\u00dc','FATURA SER\u0130','FATURA SIRA NO','ALICI \u015eEH\u0130R','ALICI \u00dcLKE','KATEGOR\u0130','H\u0130ZMET/\u00dcR\u00dcN','H\u0130ZMET/\u00dcR\u00dcN A\u00c7IKLAMASI','H\u0130ZMET/\u00dcR\u00dcN GT\u0130P KODU','H\u0130ZMET/\u00dcR\u00dcN G\u00d6NDER\u0130M \u015eEKL\u0130','H\u0130ZMET/\u00dcR\u00dcN TESL\u0130M \u015eARTI','\u00c7IKI\u015e DEPOSU','B\u0130R\u0130M','M\u0130KTAR','B\u0130R\u0130M F\u0130YATI','\u0130ND\u0130R\u0130M TUTARI'];

  var rows = [headers];
  var eksikSayi = 0;
  var ftrTarih = d.ihracat_fatura_tarihi ? new Date(d.ihracat_fatura_tarihi).toLocaleDateString('tr-TR') : '';

  urunler.forEach(function(u, idx) {
    var ilk = idx === 0;
    var kur = (gcb && gcb.gcb_kur) ? gcb.gcb_kur : (u.doviz_kur || '');
    if (!u.hs_kodu) eksikSayi++;
    if (!u.miktar) eksikSayi++;

    rows.push([
      ilk ? (d.musteriAd || '') : '',
      ilk ? ((d.dosyaNo || '') + ' \u0130hracat') : '',
      ilk ? ftrTarih : '',
      u.doviz || 'USD',
      kur,
      d.vade_tarihi || '',
      d.tahsilat_tl || '',
      '\u0130hracat',
      'IHR',
      d.ihracat_fatura_sira_no || '',
      d.musteriSehir || '',
      d.musteriUlke || '',
      '',
      u.standart_urun_adi || u.aciklama || '',
      u.urun_kodu || '',
      u.hs_kodu || '',
      d.gonderi_sekli || 'Denizyolu',
      d.teslim_sarti || d.teslim_sekli || '',
      '',
      u.birim || 'Adet',
      u.miktar || 0,
      u.birim_fiyat || 0,
      ''
    ]);
  });

  var ws = window.XLSX.utils.aoa_to_sheet(rows);
  var wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, 'ParasutFatura');
  window.XLSX.writeFile(wb, 'parasut_ihracat_' + (d.dosyaNo || 'dosya') + '_' + _today() + '.xlsx');

  if (eksikSayi > 0) window.toast?.(eksikSayi + ' alanda eksik veri var \u2014 Para\u015f\u00fct\u2019e y\u00fcklemeden \u00f6nce kontrol et', 'warn');
  else window.toast?.('Para\u015f\u00fct Excel olu\u015fturuldu', 'ok');
};

/* ── Window Exports ─────────────────────────────────────────── */
window._ihrTumBelgeleriUret = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var turler = ['PI','CI','PL','FI','GCI','KT','SE','PO','KAPAK'];
  turler.forEach(function(tur) {
    var html = window._ihrBelgeHtml(d, tur, 'dis', urunler, { lang: tur === 'KAPAK' ? 'tr' : 'en' });
    var w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  });
  window.toast?.(turler.length + ' belge olu\u015fturuldu', 'ok');
};

})();
