/**
 * src/modules/excel_import.js — v5.0.0
 * Excel Import V5 — 2 adım sihirbazı: Dosya Yükle + Hedef Seç → Kontrol & Aktar
 * Safari fix, zorunlu alan kontrolü, katalog routing, fatura bilgileri
 * @module ExcelImportV5
 */
(function ExcelImportV5() {
'use strict';

/* ── Helpers ─────────────────────────────────────────────────── */
var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };

/* ── Zorunlu Alan Sistemi ───────────────────────────────────── */
var IHR_ZORUNLU_ALANLAR_KEY = 'ak_ihr_zorunlu_v1';

var DEFAULT_ZORUNLU = [
  { k:'urun_kodu', l:'Ürün Kodu + İngilizce Adı', seviye:'zorunlu', kosul:null },
  { k:'aciklama', l:'Türkçe Ürün Adı', seviye:'zorunlu', kosul:null },
  { k:'birim_fiyat', l:'Birim Fiyat', seviye:'zorunlu', kosul:null },
  { k:'miktar', l:'Miktar', seviye:'zorunlu', kosul:null },
  { k:'birim', l:'Miktar Türü', seviye:'zorunlu', kosul:null },
  { k:'tedarikciAd', l:'Tedarikçi / Satıcı Ünvanı', seviye:'zorunlu', kosul:null },
  { k:'koli_adet', l:'Paket Adeti', seviye:'zorunlu', kosul:null },
  { k:'ambalaj_tipi', l:'Paket Türü', seviye:'zorunlu', kosul:null },
  { k:'alis_fatura_no', l:'Alış Fatura No', seviye:'onerilen', kosul:null },
  { k:'alis_fatura_tarihi', l:'Alış Fatura Tarihi', seviye:'onerilen', kosul:null },
  { k:'fatura_turu', l:'Alış Fatura Türü', seviye:'onerilen', kosul:null },
  { k:'hs_kodu', l:'GTIP / HS Kodu', seviye:'onerilen', kosul:null },
  { k:'imo_gerekli', l:'IMO\'lu mu?', seviye:'onerilen', kosul:null },
  { k:'imo_no', l:'IMO No', seviye:'onerilen', kosul:'imo_gerekli=Evet' },
  { k:'imo_msds', l:'MSDS Belgesi', seviye:'onerilen', kosul:'imo_gerekli=Evet' },
  { k:'birim_brut_kg', l:'Birim Brüt KG', seviye:'onerilen', kosul:null },
  { k:'birim_net_kg', l:'Birim Net KG', seviye:'onerilen', kosul:null },
  { k:'etiket_rengi', l:'Etiket Rengi', seviye:'opsiyonel', kosul:null }
];

function _loadZorunlu() {
  try { var d = JSON.parse(localStorage.getItem(IHR_ZORUNLU_ALANLAR_KEY)); if (Array.isArray(d) && d.length) return d; } catch(e) {}
  return DEFAULT_ZORUNLU.slice();
}
function _saveZorunlu(liste) {
  try { localStorage.setItem(IHR_ZORUNLU_ALANLAR_KEY, JSON.stringify(liste)); } catch(e) {}
}

/* ── Eşleştirme Anahtar Kelimeleri ──────────────────────────── */
var ANAHTAR = {
  aciklama:['description','descriptionofgoods','productdescription','productname','urun','aciklama','tanim','goods','itemname','product','name'],
  urun_kodu:['itemcode','itemno','productcode','articleno','article','sku','ref','partnumber','kod','urunkodu','part','code'],
  hs_kodu:['hs','hscode','hstariff','tariff','gtip','gumruk','customscode','harmonized'],
  miktar:['totalqty','totalquantity','qty','quantity','miktar','adet','pcs','pieces'],
  birim:['unit','unitofmeasure','uom','birim'],
  birim_fiyat:['unitprice','price','fiyat','birimfiyat','cost','unitcost','rate'],
  doviz:['currency','cur','doviz','curr'],
  tedarikciAd:['supplier','vendor','manufacturer','tedarikci','uretici','factory'],
  brut_kg:['totalgrosskg','grossweight','brutkg','gw'],
  net_kg:['totalnetkg','netweight','netkg','nw'],
  hacim_m3:['totalcbm','cbm','volume','hacim','m3'],
  koli_adet:['cartonqty','totalcartons','ctn','ctns','cartons','koliadet','carton','package'],
  mense_ulke:['countryoforigin','origin','coo','mense'],
  etiket_rengi:['color','colour','labelcolor','etiket','renk'],
  konteyner_sira:['loadingorder','loadingsequence','sira'],
  standart_urun_adi:['standardname','ciname','plname','englishname'],
  satici_urun_kodu:['supplierprodcode','vendorcode','saticiurunkodu'],
  kdv_orani:['vatrate','kdv','vat','taxrate'],
  alis_fatura_no:['alisfaturano','purchaseinvoice','alisfatura','faturano','invoiceno'],
  alis_fatura_tarihi:['alisfaturatarihi','purchaseinvoicedate','invoicedate','faturatarihi'],
  proforma_id:['proforma','proformaid','pino','pi'],
  ambalaj_tipi:['packagetype','boxtype','ambalaj','pakettipi'],
  birim_brut_kg:['brutkg1','grosskg1','birimbrut','unitgross'],
  birim_net_kg:['netkg1','birimnet','unitnet'],
  anahtar_kelime:['anahtarkelime','keyword','keywords','tag'],
  fatura_turu:['faturaturu','invoicetype','faturatipi']
};

/* ── Hedef Kolon Listesi ────────────────────────────────────── */
var IHR_KOLONLAR = [
  { k:'atla', l:'— Bu sütunu atla —', g:0 },
  { k:'urun_kodu', l:'Ürün Kodu', g:1 }, { k:'aciklama', l:'Türkçe Ürün Adı', g:1 },
  { k:'standart_urun_adi', l:'İngilizce Ürün Adı (CI/PL)', g:1 }, { k:'tedarikciAd', l:'Tedarikçi Adı', g:1 },
  { k:'anahtar_kelime', l:'Anahtar Kelime', g:1 }, { k:'satici_urun_kodu', l:'Satıcı Ürün Kodu', g:1 },
  { k:'fatura_urun_adi', l:'Fatura Ürün Adı', g:1 }, { k:'musteri_notu', l:'Müşteri Notu', g:1 },
  { k:'miktar', l:'Miktar', g:2 }, { k:'birim', l:'Birim (PCS/KG/MT)', g:2 },
  { k:'birim_fiyat', l:'Birim Fiyat', g:2 }, { k:'doviz', l:'Döviz (USD/EUR/TRY)', g:2 },
  { k:'kdv_orani', l:'KDV Oranı %', g:2 }, { k:'fatura_turu', l:'Fatura Türü', g:2 },
  { k:'alis_fatura_no', l:'Alış Fatura No', g:2 }, { k:'alis_fatura_tarihi', l:'Alış Fatura Tarihi', g:2 },
  { k:'proforma_id', l:'Proforma No', g:2 },
  { k:'koli_adet', l:'Koli Adedi', g:3 }, { k:'ambalaj_tipi', l:'Ambalaj Tipi', g:3 },
  { k:'birim_brut_kg', l:'1 Ürün Brüt KG', g:3 }, { k:'brut_kg', l:'Toplam Brüt KG', g:3 },
  { k:'birim_net_kg', l:'1 Ürün Net KG', g:3 }, { k:'net_kg', l:'Toplam Net KG', g:3 },
  { k:'hacim_m3', l:'Hacim m³', g:3 },
  { k:'hs_kodu', l:'GTIP / HS Kodu', g:5 }, { k:'mense_ulke', l:'Menşei Ülke', g:5 },
  { k:'imo_gerekli', l:'IMO Gerekli Mi?', g:5 }, { k:'imo_no', l:'IMO No', g:5 },
  { k:'etiket_rengi', l:'Etiket Rengi', g:6 }, { k:'konteyner_sira', l:'Yükleme Sırası', g:6 },
  { k:'konteyner_no', l:'Konteyner No', g:6 }, { k:'muhur_no', l:'Mühür No', g:6 }
];

var GRUP_ADI = { 1:'Ürün Kimliği', 2:'Fiyat & Teklif', 3:'Ambalaj & Ağırlık', 5:'Gümrük', 6:'Lojistik' };

/* ── State ───────────────────────────────────────────────────── */
var _workbook = null, _sheetNames = [], _selectedSheet = '', _excelData = [], _kolonlar = [];
var _eslestirme = {}, _ihrDosyaId = '', _tedarikciId = '', _hedef = 'ihracat';
var _dosyaAdi = '', _dosyaBoyut = 0, _dosyaSatir = 0, _dosyaKolon = 0;
var _manuelProformaId = '', _manuelAlisFaturaNo = '', _manuelAlisFaturaTarihi = '', _manuelFaturaTuru = '';
var _gecerliSatirlar = [], _hataliSatirlar = [];
var _eklenenSayisi = 0, _guncellenenSayisi = 0, _atlandiSayisi = 0;
var _exportIdMap = {}, _cakismaMod = 'guncelle';

/* ── Otomatik Eşleştirme ────────────────────────────────────── */
function _autoEslestir() {
  _eslestirme = {};
  _kolonlar.forEach(function(excKol) {
    var kucuk = excKol.toLowerCase().replace(/[^a-z0-9]/g, '');
    var enIyi = null, enIyiSkor = 0;
    Object.keys(ANAHTAR).forEach(function(alan) {
      ANAHTAR[alan].forEach(function(anahtar) {
        var skor = 0;
        if (kucuk === anahtar) skor = 100;
        else if (kucuk.indexOf(anahtar) !== -1 || anahtar.indexOf(kucuk) !== -1) skor = 75;
        else if (kucuk.slice(0, 4) === anahtar.slice(0, 4) && kucuk.length > 3) skor = 50;
        if (skor > enIyiSkor) { enIyiSkor = skor; enIyi = alan; }
      });
    });
    _eslestirme[excKol] = (enIyi && enIyiSkor >= 50) ? enIyi : 'atla';
  });
}

/* ── Export ID Haritası ──────────────────────────────────────── */
function _hesaplaExportIdMap() {
  _exportIdMap = {};
  var exportKol = null;
  _kolonlar.forEach(function(k) { var kk = k.toLowerCase().replace(/[^a-z0-9]/g, ''); if (kk === 'exportid' || kk === 'ihracatid') exportKol = k; });
  if (!exportKol) return;
  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted; }) : [];
  var benzersiz = {};
  _excelData.forEach(function(r) { var v = r[exportKol]; if (v && !benzersiz[v]) benzersiz[v] = true; });
  Object.keys(benzersiz).forEach(function(eid) {
    var d = dosyalar.find(function(d2) { return d2.dosyaNo === eid || d2.exportId === eid || String(d2.id) === String(eid); });
    if (d) _exportIdMap[eid] = d.id;
  });
}

/* ── Dosya Okuma ────────────────────────────────────────────── */
function _processFile(file) {
  _dosyaAdi = file.name;
  _dosyaBoyut = file.size;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (!window.XLSX) { window.toast?.('SheetJS yüklenmedi', 'err'); return; }
      var wb = window.XLSX.read(e.target.result, { type: 'array', cellText: false, cellDates: true });
      _workbook = wb;
      _sheetNames = wb.SheetNames;
      if (_sheetNames.length === 1) {
        _selectedSheet = _sheetNames[0];
        _processSheet(wb, _sheetNames[0]);
        _autoEslestir();
        _hesaplaExportIdMap();
        _renderAdim2();
      } else {
        _renderSheetSec(wb);
      }
    } catch (err) { window.toast?.('Dosya okunamadı: ' + err.message, 'err'); }
  };
  reader.readAsArrayBuffer(file);
}

function _processSheet(wb, sheetName) {
  var ws = wb.Sheets[sheetName];
  var json = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (!json.length) { _excelData = []; _kolonlar = []; _dosyaSatir = 0; _dosyaKolon = 0; return; }
  var basliklar = json[0].map(function(b) { return String(b || '').trim(); }).filter(Boolean);
  _kolonlar = basliklar;
  _dosyaKolon = basliklar.length;
  _excelData = json.slice(1).filter(function(r) { return r.some(function(c) { return c !== ''; }); }).map(function(r) {
    var obj = {};
    basliklar.forEach(function(b, i) { obj[b] = r[i] !== undefined ? String(r[i] || '').trim() : ''; });
    return obj;
  });
  _dosyaSatir = _excelData.length;
}

function _renderSheetSec(wb) {
  var body = _g('excel-import-body');
  if (!body) return;
  var h = '<div style="padding:24px 20px;text-align:center">';
  h += '<div style="font-size:16px;font-weight:500;margin-bottom:16px">Hangi sayfayı aktarmak istiyorsun?</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;max-width:500px;margin:0 auto">';
  _sheetNames.forEach(function(sh, idx) {
    h += '<div onclick="event.stopPropagation();window._eiSheetSec(' + idx + ')" style="border:2px solid var(--b);border-radius:10px;padding:14px;cursor:pointer;background:var(--sf);text-align:center">';
    h += '<div style="font-size:24px;margin-bottom:6px">\ud83d\udcc4</div>';
    h += '<div style="font-size:12px;font-weight:500">' + _esc(sh) + '</div></div>';
  });
  h += '</div></div>';
  body.innerHTML = h;
}

window._eiSheetSec = function(idx) {
  _selectedSheet = _sheetNames[idx];
  _processSheet(_workbook, _sheetNames[idx]);
  _autoEslestir();
  _hesaplaExportIdMap();
  _renderAdim2();
};

/* ══════════════════════════════════════════════════════════════
   ANA MODAL
   ══════════════════════════════════════════════════════════════ */
window.excelImportAc = function(dosyaId, tedarikciId) {
  _workbook = null; _sheetNames = []; _selectedSheet = ''; _excelData = []; _kolonlar = [];
  _eslestirme = {}; _ihrDosyaId = dosyaId || ''; _tedarikciId = tedarikciId || ''; _hedef = 'ihracat';
  _dosyaAdi = ''; _dosyaBoyut = 0; _dosyaSatir = 0; _dosyaKolon = 0;
  _manuelProformaId = ''; _manuelAlisFaturaNo = ''; _manuelAlisFaturaTarihi = ''; _manuelFaturaTuru = '';
  _gecerliSatirlar = []; _hataliSatirlar = [];
  _eklenenSayisi = 0; _guncellenenSayisi = 0; _atlandiSayisi = 0;
  _exportIdMap = {}; _cakismaMod = 'guncelle';

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-excel-import';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:1100px;padding:0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;max-height:90vh">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:0.5px solid var(--b);background:var(--sf);flex-shrink:0">'
    + '<div style="font-size:15px;font-weight:600">Excel Import</div>'
    + '<div style="display:flex;gap:8px;align-items:center">'
    + '<button onclick="event.stopPropagation();window._ihrExcelSablonIndir?.()" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 Şablon İndir</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()" style="font-size:16px;border:none;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">\u2715</button>'
    + '</div></div>'
    + '<div id="excel-import-body" style="flex:1;overflow-y:auto"></div>'
    + '<div id="excel-import-footer" style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-top:0.5px solid var(--b);background:var(--sf);flex-shrink:0"></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
  _renderAdim1();
};

/* ══════════════════════════════════════════════════════════════
   ADIM 1 — DOSYA YUKLE + HEDEF SEC
   ══════════════════════════════════════════════════════════════ */
function _renderAdim1() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted; }) : [];
  var aktifDosyalar = dosyalar.filter(function(d) { return d.durum !== 'kapandi' && d.durum !== 'iptal'; });
  var kapaliDosyalar = dosyalar.filter(function(d) { return d.durum === 'kapandi' || d.durum === 'iptal'; });

  var h = '<div style="display:grid;grid-template-columns:1fr 28px 1fr 28px 1fr;gap:0;padding:20px;align-items:start">';

  /* Sütun 1 — Drop Zone */
  h += '<div>';
  h += '<label for="excel-file-input" style="display:block;border:3px dashed var(--b);border-radius:16px;padding:28px 16px;cursor:pointer;background:var(--s2);text-align:center;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all .2s" id="ei-drop-zone">';
  h += '<input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="event.stopPropagation();window._excelDosyaSecildi(this)">';
  if (_dosyaAdi) {
    h += '<div style="font-size:28px;margin-bottom:6px">\u2705</div>';
    h += '<div style="font-size:13px;font-weight:500;color:#16A34A">' + _esc(_dosyaAdi) + '</div>';
    h += '<div style="font-size:10px;color:var(--t3);margin-top:3px">' + _dosyaSatir + ' satır \u00b7 ' + _dosyaKolon + ' sütun</div>';
    h += '<div style="font-size:10px;color:#185FA5;margin-top:6px;text-decoration:underline">Farklı dosya seç</div>';
  } else {
    h += '<div style="font-size:36px;margin-bottom:8px">\ud83d\udcc2</div>';
    h += '<div style="font-size:13px;color:var(--t2);margin-bottom:6px">Dosyayı buraya bırak</div>';
    h += '<div style="font-size:11px;color:var(--t3)">ya da tıkla ve seç</div>';
    h += '<div style="margin-top:10px;display:flex;gap:4px;justify-content:center">';
    h += '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:var(--sf);color:var(--t3)">.xlsx</span>';
    h += '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:var(--sf);color:var(--t3)">.xls</span>';
    h += '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:var(--sf);color:var(--t3)">.csv</span>';
    h += '</div>';
  }
  h += '</label></div>';

  /* Ok 1 */
  h += '<div style="display:flex;align-items:center;justify-content:center;height:180px;font-size:18px;color:var(--t3)">\u203a</div>';

  /* Sütun 2 — İhracat Dosyası */
  h += '<div>';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px;color:var(--t)">Hangi ihracat dosyasına?</div>';
  h += '<div style="max-height:180px;overflow-y:auto;border:0.5px solid var(--b);border-radius:8px">';
  var gosterilen = aktifDosyalar.slice(0, 5);
  gosterilen.forEach(function(d) {
    var secili = String(_ihrDosyaId) === String(d.id);
    h += '<div onclick="event.stopPropagation();window._eiDosyaSec(\'' + d.id + '\')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--b);background:' + (secili ? '#E6F1FB' : 'var(--sf)') + ';border-left:2px solid ' + (secili ? '#185FA5' : 'transparent') + '">';
    h += '<span style="font-family:monospace;font-size:10px;color:#185FA5">' + _esc(d.dosyaNo || '—') + '</span>';
    h += '<span style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(d.musteriAd || '—') + '</span>';
    h += '</div>';
  });
  if (aktifDosyalar.length > 5) h += '<div style="padding:6px 12px;font-size:10px;color:var(--t3);text-align:center">+ ' + (aktifDosyalar.length - 5) + ' dosya daha</div>';
  if (!aktifDosyalar.length) h += '<div style="padding:12px;font-size:11px;color:var(--t3);text-align:center">Aktif dosya yok</div>';
  h += '</div></div>';

  /* Ok 2 */
  h += '<div style="display:flex;align-items:center;justify-content:center;height:180px;font-size:18px;color:var(--t3)">\u203a</div>';

  /* Sütun 3 — Hedef */
  h += '<div>';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px;color:var(--t)">Ürünler nereye gitsin?</div>';
  var hedefler = [
    { k: 'ihracat', ikon: '\ud83d\udce6', l: 'İhracat Ürünleri', alt: 'Seçili dosyaya bağlı' },
    { k: 'katalog', ikon: '\ud83d\udcda', l: 'Ürün Kataloğu', alt: 'Tüm dosyalardan erişilir' },
    { k: 'ikisi', ikon: '\u2728', l: 'İkisine de', alt: 'Hem dosya hem katalog' }
  ];
  hedefler.forEach(function(hd) {
    var secili = _hedef === hd.k;
    h += '<div onclick="event.stopPropagation();window._eiHedefSec(\'' + hd.k + '\')" style="border:2px solid ' + (secili ? '#185FA5' : 'var(--b)') + ';border-radius:8px;padding:10px 12px;cursor:pointer;background:' + (secili ? '#E6F1FB' : 'var(--sf)') + ';margin-bottom:6px;display:flex;align-items:center;gap:10px">';
    h += '<span style="font-size:20px">' + hd.ikon + '</span>';
    h += '<div><div style="font-size:12px;font-weight:500;color:' + (secili ? '#185FA5' : 'var(--t)') + '">' + hd.l + '</div>';
    h += '<div style="font-size:10px;color:var(--t3)">' + hd.alt + '</div></div>';
    if (secili) h += '<span style="margin-left:auto;color:#185FA5;font-size:14px">\u2713</span>';
    h += '</div>';
  });
  h += '</div>';
  h += '</div>'; /* grid bitti */

  /* Fatura Bilgileri */
  h += '<div style="border-top:0.5px solid var(--b);padding:12px 20px">';
  h += '<div style="font-size:11px;color:var(--t2);margin-bottom:8px">Fatura Bilgileri — Tüm satırlara uygulanır</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
  h += '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">Proforma No</div><input class="fi" id="ei-proforma-id" placeholder="PI-2026-001" value="' + _esc(_manuelProformaId) + '" onclick="event.stopPropagation()" oninput="event.stopPropagation()" style="font-size:11px;width:100%"></div>';
  h += '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">Alış Fatura No</div><input class="fi" id="ei-alis-fatura-no" placeholder="KFF2024-094" value="' + _esc(_manuelAlisFaturaNo) + '" onclick="event.stopPropagation()" oninput="event.stopPropagation()" style="font-size:11px;width:100%"></div>';
  h += '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">Alış Fatura Tarihi</div><input type="date" class="fi" id="ei-alis-fatura-tarihi" value="' + _esc(_manuelAlisFaturaTarihi) + '" onclick="event.stopPropagation()" oninput="event.stopPropagation()" style="font-size:11px;width:100%"></div>';
  h += '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">Alış Fatura Türü</div><select class="fi" id="ei-fatura-turu" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="font-size:11px;width:100%"><option value="">—</option><option' + (_manuelFaturaTuru === 'Yurtiçi KDV\'li' ? ' selected' : '') + '>Yurtiçi KDV\'li</option><option' + (_manuelFaturaTuru === 'İhraç Kayıtlı KDV\'siz' ? ' selected' : '') + '>İhraç Kayıtlı KDV\'siz</option><option' + (_manuelFaturaTuru === 'KDV\'li' ? ' selected' : '') + '>KDV\'li</option><option' + (_manuelFaturaTuru === 'Transit Ticaret' ? ' selected' : '') + '>Transit Ticaret</option><option' + (_manuelFaturaTuru === 'KDV Muaf' ? ' selected' : '') + '>KDV Muaf</option></select></div>';
  h += '</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:6px">Boş bırakılabilir — Excel\'de sütun varsa Excel değeri öncelikli kullanılır</div>';
  h += '</div>';

  body.innerHTML = h;
  _setupDragDrop();

  var devamDisabled = !_dosyaAdi;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._adim1Devam()" style="' + (devamDisabled ? 'opacity:.4;pointer-events:none' : '') + '">' + (_dosyaAdi ? 'Devam \u2192' : 'Dosya Seçilmedi') + '</button>';
}

function _setupDragDrop() {
  var zone = _g('ei-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = '#185FA5'; zone.style.background = '#E6F1FB'; }, { capture: true });
  zone.addEventListener('dragleave', function() { zone.style.borderColor = 'var(--b)'; zone.style.background = 'var(--s2)'; }, { capture: true });
  zone.addEventListener('drop', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--b)'; zone.style.background = 'var(--s2)'; var f = e.dataTransfer.files[0]; if (f) { _processFile(f); } }, { capture: true });
}

window._excelDosyaSecildi = function(input) {
  var f = input.files && input.files[0];
  if (f) _processFile(f);
};

window._eiDosyaSec = function(id) { _ihrDosyaId = String(id); _renderAdim1(); };
window._eiHedefSec = function(h) { _hedef = h; _renderAdim1(); };

window._adim1Devam = function() {
  _manuelProformaId = (_g('ei-proforma-id')?.value || '').trim();
  _manuelAlisFaturaNo = (_g('ei-alis-fatura-no')?.value || '').trim();
  _manuelAlisFaturaTarihi = (_g('ei-alis-fatura-tarihi')?.value || '').trim();
  _manuelFaturaTuru = (_g('ei-fatura-turu')?.value || '').trim();
  if (!_dosyaAdi) { window.toast?.('Önce dosya seç', 'warn'); return; }
  _renderAdim2();
};

/* ══════════════════════════════════════════════════════════════
   ADIM 2 — KONTROL & AKTAR
   ══════════════════════════════════════════════════════════════ */
function _renderAdim2() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  /* Zorunlu alan skoru hesapla */
  var zorunluListe = _loadZorunlu();
  var eslesti = Object.values(_eslestirme).filter(function(v) { return v && v !== 'atla'; }).length;
  var zorunluSonuc = [];
  zorunluListe.forEach(function(z) {
    var eslestiMi = Object.values(_eslestirme).indexOf(z.k) !== -1;
    var doluSayi = 0;
    if (eslestiMi) {
      _excelData.forEach(function(r) {
        var excKol = null;
        Object.keys(_eslestirme).forEach(function(ek) { if (_eslestirme[ek] === z.k) excKol = ek; });
        if (excKol && r[excKol] && String(r[excKol]).trim()) doluSayi++;
      });
    }
    var pct = _dosyaSatir > 0 ? Math.round(doluSayi / _dosyaSatir * 100) : 0;
    var dot = !eslestiMi ? '#DC2626' : pct >= 80 ? '#16A34A' : pct > 0 ? '#D97706' : '#DC2626';
    zorunluSonuc.push({ k: z.k, l: z.l, seviye: z.seviye, pct: pct, dot: dot, dolu: doluSayi, toplam: _dosyaSatir });
  });
  var zorunluSkor = zorunluListe.length > 0 ? Math.round(zorunluSonuc.filter(function(z) { return z.seviye === 'zorunlu' && z.pct >= 80; }).length / zorunluSonuc.filter(function(z) { return z.seviye === 'zorunlu'; }).length * 100) : 0;

  var h = '';
  /* Header bandı */
  h += '<div style="padding:10px 20px;background:#185FA5;color:#fff;display:flex;align-items:center;gap:12px">';
  h += '<span style="font-size:20px">\u2705</span>';
  h += '<div><div style="font-size:13px;font-weight:500">' + _esc(_dosyaAdi) + '</div>';
  h += '<div style="font-size:11px;opacity:.8">' + _dosyaSatir + ' satır \u00b7 ' + _dosyaKolon + ' sütun \u00b7 ' + eslesti + ' eşleşti</div></div>';
  h += '</div>';

  /* İki kolon */
  h += '<div style="display:flex;overflow:hidden">';

  /* Sol — Zorunlu Alan Kontrolü */
  h += '<div style="flex:1.4;border-right:0.5px solid var(--b);padding:12px 16px;overflow-y:auto;max-height:50vh">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<div style="font-size:12px;font-weight:500">İhracat Zorunlu Alan Kontrolü</div>';
  var skorRenk = zorunluSkor >= 80 ? '#16A34A' : zorunluSkor >= 50 ? '#D97706' : '#DC2626';
  h += '<div style="width:36px;height:36px;border-radius:50%;border:3px solid ' + skorRenk + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + skorRenk + '">%' + zorunluSkor + '</div>';
  h += '</div>';
  zorunluSonuc.forEach(function(z) {
    h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">';
    h += '<span style="width:8px;height:8px;border-radius:50%;background:' + z.dot + ';flex-shrink:0"></span>';
    h += '<span style="flex:1;color:var(--t)">' + _esc(z.l) + '</span>';
    h += '<div style="width:60px;height:4px;background:var(--s2);border-radius:2px;flex-shrink:0"><div style="width:' + z.pct + '%;height:4px;border-radius:2px;background:' + z.dot + '"></div></div>';
    h += '<span style="font-size:9px;color:' + z.dot + ';min-width:40px;text-align:right">' + z.dolu + '/' + z.toplam + '</span>';
    h += '</div>';
  });
  var eksikZorunlu = zorunluSonuc.filter(function(z) { return z.seviye === 'zorunlu' && z.pct < 80; });
  if (eksikZorunlu.length) {
    h += '<div style="margin-top:10px;padding:8px 10px;background:#FEF2F2;border-radius:6px;font-size:10px;color:#991B1B">';
    h += '<strong>Eksik zorunlu alanlar:</strong> Bu eksikler olmadan CI/PL oluşturulamaz, GÇB açılamaz.';
    h += '</div>';
  }
  h += '</div>';

  /* Sağ — Özet */
  h += '<div style="flex:1;padding:12px 16px;overflow-y:auto;max-height:50vh">';
  /* 4 kart */
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:12px">';
  h += '<div style="background:#EAF3DE;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#27500A">Toplam Satır</div><div style="font-size:18px;font-weight:500;color:#16A34A">' + _dosyaSatir + '</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#0C447C">Eşleşen Sütun</div><div style="font-size:18px;font-weight:500;color:#185FA5">' + eslesti + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Hedef</div><div style="font-size:12px;font-weight:500;color:var(--t)">' + ({ ihracat: 'İhracat', katalog: 'Katalog', ikisi: 'İkisi' }[_hedef] || '—') + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Dosya</div><div style="font-size:10px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (_ihrDosyaId ? _esc(_ihrDosyaId).slice(0, 12) : '—') + '</div></div>';
  h += '</div>';

  /* Export ID dağılımı */
  var exportIdKeys = Object.keys(_exportIdMap);
  if (exportIdKeys.length > 1) {
    h += '<div style="padding:8px 10px;background:#E6F1FB;border-radius:6px;margin-bottom:10px;font-size:10px;color:#0C447C">';
    h += '<strong>Bu import ' + exportIdKeys.length + ' farklı ihracat dosyasına dağılacak</strong>';
    h += '</div>';
  }

  /* Çakışma modu */
  h += '<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--t2);margin-bottom:4px">Mevcut ürün kodu çakışırsa:</div>';
  h += '<div style="display:flex;gap:4px">';
  ['guncelle', 'atla', 'yeni'].forEach(function(m) {
    var lbl = m === 'guncelle' ? 'Güncelle' : m === 'atla' ? 'Atla' : 'Yeni Ekle';
    h += '<button onclick="event.stopPropagation();window._eiCakismaSec(\'' + m + '\')" style="font-size:10px;padding:3px 10px;border-radius:4px;border:0.5px solid ' + (_cakismaMod === m ? '#185FA5' : 'var(--b)') + ';background:' + (_cakismaMod === m ? '#E6F1FB' : 'transparent') + ';cursor:pointer;color:' + (_cakismaMod === m ? '#185FA5' : 'var(--t2)') + ';font-family:inherit">' + lbl + '</button>';
  });
  h += '</div></div>';

  h += '</div>'; /* sağ bitti */
  h += '</div>'; /* iki kolon bitti */

  body.innerHTML = h;

  footer.innerHTML = '<div style="display:flex;gap:8px"><button class="btn btns" onclick="event.stopPropagation();window._renderAdim1Alt()">\u2190 Geri</button>'
    + '<button class="btn btns" onclick="event.stopPropagation();window._eiEslestirmeDuzenle()" style="color:#185FA5;border-color:#185FA5">Eşleştirmeyi Düzenle \u203a</button></div>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._excelImport()" style="font-size:14px;padding:10px 28px;background:#16A34A;border-color:#16A34A">\u2705 ' + _dosyaSatir + ' Ürünü Aktar</button>';
}

window._renderAdim1Alt = function() { _renderAdim1(); };
window._eiCakismaSec = function(m) { _cakismaMod = m; _renderAdim2(); };

/* ══════════════════════════════════════════════════════════════
   ESLESTIRME OVERLAY
   ══════════════════════════════════════════════════════════════ */
window._eiEslestirmeDuzenle = function() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;
  var sorunlu = _kolonlar.filter(function(k) { return !_eslestirme[k] || _eslestirme[k] === 'atla'; }).length;
  var otomatik = _kolonlar.length - sorunlu;

  var h = '<div style="padding:10px 16px;background:var(--sf);border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:8px">';
  h += '<div style="font-size:13px;font-weight:500">Kolon Eşleştirme</div>';
  if (sorunlu > 0) h += '<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#FAEEDA;color:#633806">' + sorunlu + ' sorunlu</span>';
  h += '<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#EAF3DE;color:#27500A">' + otomatik + ' otomatik \u2713</span>';
  h += '</div>';

  h += '<div style="padding:0;max-height:55vh;overflow-y:auto">';
  _kolonlar.forEach(function(excKol, idx) {
    var secili = _eslestirme[excKol] || 'atla';
    var eslesti2 = secili !== 'atla';
    var bg = idx % 2 === 0 ? 'var(--sf)' : 'var(--s2)';
    var ornekler = _excelData.slice(0, 3).map(function(r) { return String(r[excKol] || '').slice(0, 20); }).filter(Boolean).join(' \u00b7 ');

    h += '<div style="display:grid;grid-template-columns:1fr 18px 1fr;align-items:center;gap:8px;padding:8px 16px;background:' + bg + ';border-bottom:0.5px solid var(--b)">';
    /* Sol — Excel kolon */
    h += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">' + _esc(excKol) + '</div>';
    if (ornekler) h += '<div style="font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(ornekler) + '</div>';
    h += '</div>';
    /* Ok */
    h += '<div style="text-align:center;font-size:12px;color:' + (eslesti2 ? '#16A34A' : '#DC2626') + '">' + (eslesti2 ? '\u2192' : '\u2717') + '</div>';
    /* Sağ — Select */
    h += '<select onchange="event.stopPropagation();window._eslGuncelle(\'' + _esc(excKol) + '\',this.value)" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:1.5px solid ' + (eslesti2 ? '#16A34A' : '#DC2626') + ';border-radius:6px;background:' + (eslesti2 ? '#EAF3DE' : '#FEF2F2') + ';color:var(--t);font-family:inherit;cursor:pointer">';
    var prevG = -1;
    IHR_KOLONLAR.forEach(function(a) {
      if (a.g !== prevG && a.g > 0) { if (prevG > 0) h += '</optgroup>'; h += '<optgroup label="' + (GRUP_ADI[a.g] || 'Grup ' + a.g) + '">'; prevG = a.g; }
      h += '<option value="' + a.k + '"' + (secili === a.k ? ' selected' : '') + '>' + _esc(a.l) + '</option>';
    });
    if (prevG > 0) h += '</optgroup>';
    h += '</select>';
    h += '</div>';
  });
  h += '</div>';

  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._eiYenidenRender()">Kapat</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._eiYenidenRender()">Uygula \u2192</button>';
};

window._eslGuncelle = function(kolAdi, deger) { _eslestirme[kolAdi] = deger; };
window._eiYenidenRender = function() { _renderAdim2(); };

/* ══════════════════════════════════════════════════════════════
   IMPORT CALISTIR
   ══════════════════════════════════════════════════════════════ */
window._excelImport = function() {
  var btn = document.querySelector('#excel-import-footer .btnp');
  if (btn) { btn.disabled = true; btn.style.opacity = '.5'; btn.textContent = 'Aktarılıyor...'; }

  var cu = _cu();
  var mevcutU = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var dosyaId = _ihrDosyaId;
  var nowStr = _now();
  _eklenenSayisi = 0; _guncellenenSayisi = 0; _atlandiSayisi = 0;
  _hataliSatirlar = [];

  _excelData.forEach(function(satir, idx) {
    var mapped = {};
    _kolonlar.forEach(function(k) {
      var alan = _eslestirme[k];
      if (alan && alan !== 'atla') {
        var val = satir[k];
        /* Veri düzeltici */
        if (['birim_fiyat', 'miktar', 'koli_adet', 'brut_kg', 'net_kg', 'hacim_m3', 'birim_brut_kg', 'birim_net_kg', 'kdv_orani'].indexOf(alan) !== -1) {
          val = String(val || '').replace(/,/g, '.').replace(/[^\d.\-]/g, '');
        }
        if (alan === 'doviz') {
          var dv = String(val || '').trim().toUpperCase();
          if (dv === 'TL') val = 'TRY'; else if (dv === '$') val = 'USD'; else if (dv === '\u20ac') val = 'EUR'; else val = dv || 'USD';
        }
        mapped[alan] = String(val || '').trim();
      }
    });
    if (!Object.keys(mapped).length) return;

    /* Manuel fatura değerleri (boşsa ata) */
    if (!mapped.proforma_id && _manuelProformaId) mapped.proforma_id = _manuelProformaId;
    if (!mapped.alis_fatura_no && _manuelAlisFaturaNo) mapped.alis_fatura_no = _manuelAlisFaturaNo;
    if (!mapped.alis_fatura_tarihi && _manuelAlisFaturaTarihi) mapped.alis_fatura_tarihi = _manuelAlisFaturaTarihi;
    if (!mapped.fatura_turu && _manuelFaturaTuru) mapped.fatura_turu = _manuelFaturaTuru;

    /* Validasyon */
    var hatalar = [];
    if (!mapped.aciklama && !mapped.urun_kodu) hatalar.push('Ürün adı ve kodu boş');
    if (mapped.miktar && isNaN(parseFloat(mapped.miktar))) hatalar.push('Miktar sayı değil');
    if (mapped.birim_fiyat && isNaN(parseFloat(mapped.birim_fiyat))) hatalar.push('Fiyat sayı değil');
    if (hatalar.length) { _hataliSatirlar.push({ satir: idx + 1, hatalar: hatalar }); _atlandiSayisi++; return; }

    /* Export ID dağıtımı */
    var hedefDosyaId = dosyaId;
    var exportKol = null;
    _kolonlar.forEach(function(k2) { var kk = k2.toLowerCase().replace(/[^a-z0-9]/g, ''); if (kk === 'exportid' || kk === 'ihracatid') exportKol = k2; });
    if (exportKol && satir[exportKol] && _exportIdMap[satir[exportKol]]) hedefDosyaId = _exportIdMap[satir[exportKol]];

    /* Eksik ürün kodu üretimi */
    if (!mapped.urun_kodu && mapped.aciklama) {
      var kelimeler = mapped.aciklama.split(/\s+/).map(function(w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 4);
      mapped.urun_kodu = kelimeler + '-' + String(idx + 1).padStart(3, '0');
    }

    /* Çakışma kontrolü */
    var dup = null;
    if (mapped.urun_kodu && hedefDosyaId) {
      dup = mevcutU.find(function(u) { return !u.isDeleted && u.urun_kodu === mapped.urun_kodu && String(u.dosya_id) === String(hedefDosyaId); });
    }

    if (dup && _cakismaMod === 'guncelle') {
      Object.keys(mapped).forEach(function(mk) { if (mapped[mk] && String(mapped[mk]).trim()) dup[mk] = mapped[mk]; });
      dup.updatedAt = nowStr; _guncellenenSayisi++;
    } else if (dup && _cakismaMod === 'atla') {
      _atlandiSayisi++;
    } else {
      mevcutU.unshift({
        id: _genId(), dosya_id: hedefDosyaId || '',
        aciklama: mapped.aciklama || '', standart_urun_adi: mapped.standart_urun_adi || mapped.aciklama || '',
        urun_kodu: mapped.urun_kodu || '', hs_kodu: mapped.hs_kodu || '',
        miktar: parseFloat(mapped.miktar || 0), birim: mapped.birim || 'PCS',
        birim_fiyat: parseFloat(mapped.birim_fiyat || 0), doviz: mapped.doviz || 'USD',
        kdv_orani: mapped.kdv_orani || '',
        brut_kg: parseFloat(mapped.brut_kg || 0), net_kg: parseFloat(mapped.net_kg || 0),
        birim_brut_kg: parseFloat(mapped.birim_brut_kg || 0), birim_net_kg: parseFloat(mapped.birim_net_kg || 0),
        hacim_m3: parseFloat(mapped.hacim_m3 || 0), koli_adet: parseInt(mapped.koli_adet || 0),
        ambalaj_tipi: mapped.ambalaj_tipi || '', mense_ulke: mapped.mense_ulke || '',
        tedarikciAd: mapped.tedarikciAd || _tedarikciId || '',
        etiket_rengi: mapped.etiket_rengi || '', konteyner_sira: mapped.konteyner_sira || '',
        konteyner_no: mapped.konteyner_no || '', muhur_no: mapped.muhur_no || '',
        alis_fatura_no: mapped.alis_fatura_no || '', alis_fatura_tarihi: mapped.alis_fatura_tarihi || '',
        fatura_turu: mapped.fatura_turu || '', proforma_id: mapped.proforma_id || '',
        imo_gerekli: mapped.imo_gerekli || '', imo_no: mapped.imo_no || '',
        fatura_urun_adi: mapped.fatura_urun_adi || '', satici_urun_kodu: mapped.satici_urun_kodu || '',
        anahtar_kelime: mapped.anahtar_kelime || '', musteri_notu: mapped.musteri_notu || '',
        kaynak: 'excel_v5', createdAt: nowStr, createdBy: cu?.id
      });
      _eklenenSayisi++;
    }
  });

  /* Kaydet */
  if (_hedef === 'ihracat' || _hedef === 'ikisi') {
    if (typeof window.storeIhracatUrunler === 'function') window.storeIhracatUrunler(mevcutU);
  }
  if (_hedef === 'katalog' || _hedef === 'ikisi') {
    if (typeof window.storeUrunDB === 'function') {
      mevcutU.filter(function(u) { return u.kaynak === 'excel_v5' && u.createdAt === nowStr; }).forEach(function(u) {
        window.storeUrunDB?.({ duayCode: u.urun_kodu, duayName: u.aciklama, vendorCode: u.satici_urun_kodu || '', vendorName: u.tedarikciAd || '' });
      });
    }
  }

  window.logActivity?.('import', 'Excel V5: ' + _eklenenSayisi + ' eklendi, ' + _guncellenenSayisi + ' güncellendi, ' + _atlandiSayisi + ' atlandı');
  _renderRapor();
};

/* ══════════════════════════════════════════════════════════════
   RAPOR
   ══════════════════════════════════════════════════════════════ */
function _renderRapor() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;
  var toplam = _eklenenSayisi + _guncellenenSayisi + _atlandiSayisi;

  var h = '<div style="background:#16A34A;padding:20px;text-align:center">';
  h += '<div style="font-size:36px;margin-bottom:6px">\ud83c\udf89</div>';
  h += '<div style="font-size:16px;font-weight:600;color:#fff">Import Tamamlandı!</div>';
  h += '<div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:4px">' + toplam + ' satır işlendi</div>';
  h += '</div>';

  h += '<div style="padding:16px 20px">';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">';
  h += '<div style="background:#EAF3DE;border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:#27500A">Eklendi</div><div style="font-size:20px;font-weight:500;color:#16A34A">' + _eklenenSayisi + '</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:#0C447C">Güncellendi</div><div style="font-size:20px;font-weight:500;color:#185FA5">' + _guncellenenSayisi + '</div></div>';
  h += '<div style="background:' + (_atlandiSayisi ? '#FCEBEB' : '#EAF3DE') + ';border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:' + (_atlandiSayisi ? '#791F1F' : '#27500A') + '">Atlandı</div><div style="font-size:20px;font-weight:500;color:' + (_atlandiSayisi ? '#DC2626' : '#16A34A') + '">' + _atlandiSayisi + '</div></div>';
  h += '</div>';

  if (_hataliSatirlar.length) {
    h += '<div style="border-top:0.5px solid var(--b);padding-top:10px"><div style="font-size:11px;font-weight:500;color:#DC2626;margin-bottom:6px">Aktarılamayan Satırlar:</div>';
    _hataliSatirlar.slice(0, 10).forEach(function(hs) { h += '<div style="font-size:10px;color:#7F1D1D;padding:2px 0">Satır ' + hs.satir + ': ' + hs.hatalar.join(', ') + '</div>'; });
    h += '</div>';
  }
  h += '</div>';

  body.innerHTML = h;
  var fBtns = '';
  if (_hataliSatirlar.length) fBtns += '<button class="btn btns" onclick="event.stopPropagation();window._excelHataliIndir()">\u2b07 Hata Raporu</button>';
  if (_hedef === 'ihracat' || _hedef === 'ikisi') fBtns += '<button class="btn btnp" onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove();if(window._aktifDosyaId){window._ihrRenderDosyaDetay?.(window._aktifDosyaId);}else{window.renderIhracatOps?.();}">Ürünlere Git \u2192</button>';
  if (_hedef === 'katalog') fBtns += '<button class="btn btnp" onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove();window.App?.nav?.(\'urun-db\')">Kataloğa Git \u2192</button>';
  footer.innerHTML = fBtns;
}

/* ── Hata Raporu İndir ──────────────────────────────────────── */
window._excelHataliIndir = function() {
  var csv = 'Satır No,Hatalar\n';
  _hataliSatirlar.forEach(function(h2) { csv += h2.satir + ',"' + h2.hatalar.join('; ') + '"\n'; });
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'import_hata_raporu.csv'; a.click();
  URL.revokeObjectURL(url);
};

/* ── Window Exports ─────────────────────────────────────────── */
window._loadZorunlu = _loadZorunlu;
window._saveZorunlu = _saveZorunlu;

})();
