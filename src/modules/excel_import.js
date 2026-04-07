/**
 * src/modules/excel_import.js — v5.1.0
 * Import Docs — 4 adım: Dosya Seç → Eşleştir → Kontrol → Aktar
 * AI otomatik eşleştirme, şablon kaydet/yükle, hızlı mod
 * @module ExcelImportV5
 */
(function ExcelImportV5() {
'use strict';

var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };

/* ── Zorunlu Alan Sistemi ───────────────────────────────────── */
var IHR_ZORUNLU_KEY = 'ak_ihr_zorunlu_v1';
var DEFAULT_ZORUNLU = [
  { k:'urun_kodu', l:'\u00dcr\u00fcn Kodu', seviye:'zorunlu' },
  { k:'aciklama', l:'\u00dcr\u00fcn Ad\u0131', seviye:'zorunlu' },
  { k:'birim_fiyat', l:'Birim Fiyat', seviye:'zorunlu' },
  { k:'miktar', l:'Miktar', seviye:'zorunlu' },
  { k:'birim', l:'Birim', seviye:'zorunlu' },
  { k:'tedarikciAd', l:'Tedarik\u00e7i', seviye:'zorunlu' },
  { k:'koli_adet', l:'Koli Adeti', seviye:'zorunlu' },
  { k:'hs_kodu', l:'HS Kodu', seviye:'onerilen' },
  { k:'brut_kg', l:'Br\u00fct KG', seviye:'onerilen' },
  { k:'net_kg', l:'Net KG', seviye:'onerilen' }
];
function _loadZorunlu() { try { var d = JSON.parse(localStorage.getItem(IHR_ZORUNLU_KEY)); if (Array.isArray(d) && d.length) return d; } catch(e) {} return DEFAULT_ZORUNLU.slice(); }
function _saveZorunlu(d) { try { localStorage.setItem(IHR_ZORUNLU_KEY, JSON.stringify(d)); } catch(e) {} }

/* ── AI Eşleştirme Haritası ─────────────────────────────────── */
var AI_MAP = {
  aciklama:['aciklama','a\u00e7\u0131klama','description','product','urun adi','\u00fcr\u00fcn ad\u0131','mal adi','item name','goods'],
  urun_kodu:['kod','code','sku','urun kodu','\u00fcr\u00fcn kodu','product code','item code','part','article'],
  birim_fiyat:['fiyat','price','unit price','birim fiyat','tutar','amount','cost'],
  miktar:['miktar','qty','quantity','adet','piece','pcs'],
  birim:['birim','unit','\u00f6l\u00e7\u00fc','olcu','uom'],
  hs_kodu:['hs','gtip','tarife','g\u00fcmr\u00fck kodu','hs code','tariff','customs'],
  brut_kg:['br\u00fct','brut','gross','br\u00fct kg','gross kg','gross weight','gw'],
  net_kg:['net','net kg','net weight','nw'],
  koli_adet:['koli','carton','ctn','package','paket','box','ctns'],
  tedarikciAd:['tedarik\u00e7i','tedarikci','supplier','vendor','firma','factory'],
  alis_fatura_no:['fatura no','invoice no','inv no','fatura numaras\u0131'],
  alis_fatura_tarihi:['fatura tarihi','invoice date','tarih','date'],
  doviz:['doviz','d\u00f6viz','currency','para birimi','cur'],
  ambalaj_tipi:['ambalaj','package type','paket tipi','box type'],
  mense_ulke:['mense','origin','country','coo','men\u015fei'],
  etiket_rengi:['etiket','renk','color','label'],
  konteyner_sira:['s\u0131ra','loading order','sira','order'],
  kdv_orani:['kdv','vat','tax','vergi']
};

/* ── Duay Alanları ──────────────────────────────────────────── */
var DUAY_ALANLARI = [
  { v:'atla', l:'\u2014 E\u015fle\u015ftirme (atla) \u2014' },
  { v:'aciklama', l:'\u00dcr\u00fcn A\u00e7\u0131klamas\u0131' }, { v:'urun_kodu', l:'\u00dcr\u00fcn Kodu' },
  { v:'birim_fiyat', l:'Birim Fiyat' }, { v:'miktar', l:'Miktar' }, { v:'birim', l:'Birim' },
  { v:'doviz', l:'D\u00f6viz' }, { v:'hs_kodu', l:'HS / GTIP' },
  { v:'brut_kg', l:'Br\u00fct KG' }, { v:'net_kg', l:'Net KG' },
  { v:'koli_adet', l:'Koli Adedi' }, { v:'ambalaj_tipi', l:'Ambalaj Tipi' },
  { v:'tedarikciAd', l:'Tedarik\u00e7i' }, { v:'mense_ulke', l:'Men\u015fei \u00dclke' },
  { v:'etiket_rengi', l:'Etiket Rengi' }, { v:'konteyner_sira', l:'Y\u00fckleme S\u0131ras\u0131' },
  { v:'standart_urun_adi', l:'\u0130ngilizce Ad\u0131 (CI/PL)' }, { v:'satici_urun_kodu', l:'Sat\u0131c\u0131 Kodu' },
  { v:'alis_fatura_no', l:'Al\u0131\u015f Fatura No' }, { v:'alis_fatura_tarihi', l:'Fatura Tarihi' },
  { v:'fatura_turu', l:'Fatura T\u00fcr\u00fc' }, { v:'kdv_orani', l:'KDV %' },
  { v:'fatura_urun_adi', l:'Fatura \u00dcr\u00fcn Ad\u0131' }, { v:'anahtar_kelime', l:'Anahtar Kelime' }
];

/* ── State ───────────────────────────────────────────────────── */
var _adim = 1, _workbook = null, _sheetNames = [], _selectedSheet = '';
var _excelData = [], _kolonlar = [], _eslestirme = {};
var _ihrDosyaId = '', _dosyaAdi = '', _dosyaBoyut = 0, _dosyaSatir = 0, _dosyaKolon = 0;
var _gecerliSatirlar = [], _hataliSatirlar = [];
var _eklenen = 0, _guncellenen = 0, _atlandi = 0;
var _cakismaMod = 'guncelle';

/* ── Şablon Sistemi ─────────────────────────────────────────── */
var _SABLON_KEY = 'ak_excel_sablonlar';
function _loadSablonlar() { try { return JSON.parse(localStorage.getItem(_SABLON_KEY) || '[]'); } catch(e) { return []; } }

/* ── AI Otomatik Eşleştirme ─────────────────────────────────── */
function _aiEslestir() {
  _eslestirme = {};
  _kolonlar.forEach(function(excKol) {
    var kucuk = excKol.toLowerCase().replace(/[^a-z0-9\u00e7\u011f\u0131\u00f6\u015f\u00fc]/g, '');
    var enIyi = null, enIyiSkor = 0;
    Object.keys(AI_MAP).forEach(function(alan) {
      AI_MAP[alan].forEach(function(anahtar) {
        var ak = anahtar.toLowerCase().replace(/[^a-z0-9\u00e7\u011f\u0131\u00f6\u015f\u00fc]/g, '');
        var skor = 0;
        if (kucuk === ak) skor = 100;
        else if (kucuk.indexOf(ak) !== -1 || ak.indexOf(kucuk) !== -1) skor = 75;
        else if (kucuk.slice(0, 4) === ak.slice(0, 4) && kucuk.length > 3) skor = 50;
        if (skor > enIyiSkor) { enIyiSkor = skor; enIyi = alan; }
      });
    });
    _eslestirme[excKol] = (enIyi && enIyiSkor >= 50) ? enIyi : 'atla';
  });
}

/* ── Dosya İşleme ───────────────────────────────────────────── */
function _dosyaIsle(file) {
  _dosyaAdi = file.name; _dosyaBoyut = file.size;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (!window.XLSX) { window.toast?.('SheetJS y\u00fcklenmedi', 'err'); return; }
      var wb = window.XLSX.read(e.target.result, { type: 'array', cellText: false, cellDates: true });
      _workbook = wb; _sheetNames = wb.SheetNames; _selectedSheet = wb.SheetNames[0];
      _processSheet(wb, _selectedSheet);
      _aiEslestir();
      _adim = 2; _renderAll();
    } catch (err) { window.toast?.('Dosya okunamad\u0131: ' + err.message, 'err'); }
  };
  reader.readAsArrayBuffer(file);
}

function _processSheet(wb, name) {
  var ws = wb.Sheets[name];
  var json = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (!json.length) { _excelData = []; _kolonlar = []; _dosyaSatir = 0; _dosyaKolon = 0; return; }
  var baslik = json[0].map(function(b) { return String(b || '').trim(); }).filter(Boolean);
  _kolonlar = baslik; _dosyaKolon = baslik.length;
  _excelData = json.slice(1).filter(function(r) { return r.some(function(c) { return c !== ''; }); }).map(function(r) {
    var obj = {};
    baslik.forEach(function(b, i) { obj[b] = r[i] !== undefined ? String(r[i] || '').trim() : ''; });
    return obj;
  });
  _dosyaSatir = _excelData.length;
}

/* ══════════════════════════════════════════════════════════════
   ANA MODAL
   ══════════════════════════════════════════════════════════════ */
window.excelImportAc = function(dosyaId) {
  _adim = 1; _workbook = null; _sheetNames = []; _selectedSheet = '';
  _excelData = []; _kolonlar = []; _eslestirme = {};
  var _ilkDosya = (typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted && d.durum !== 'kapandi'; }) : [])[0];
  _ihrDosyaId = dosyaId || window._ihrAktifDosyaId || (_ilkDosya ? _ilkDosya.id : '') || '';
  _dosyaAdi = ''; _dosyaBoyut = 0; _dosyaSatir = 0; _dosyaKolon = 0;
  _gecerliSatirlar = []; _hataliSatirlar = [];
  _eklenen = 0; _guncellenen = 0; _atlandi = 0; _cakismaMod = 'guncelle';

  var old = _g('mo-excel-import'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-excel-import';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:1020px;width:96vw;padding:0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;max-height:92vh">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-bottom:0.5px solid var(--b);background:var(--sf);flex-shrink:0"><div><div style="font-size:15px;font-weight:600">Import Docs</div><div style="font-size:10px;color:var(--t3)">Excel / CSV \u2192 \u0130hracat \u00dcr\u00fcn Aktar</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center"><button onclick="event.stopPropagation();window._ihrExcelSablonIndir?.()" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 Haz\u0131r \u015eablon</button><button onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()" style="font-size:16px;border:none;background:transparent;cursor:pointer;color:var(--t3)">\u2715</button></div></div>'
    + '<div id="ei-steps" style="flex-shrink:0"></div>'
    + '<div style="display:grid;grid-template-columns:260px 1fr;flex:1;overflow:hidden">'
    + '<div id="ei-sol" style="display:block;border-right:0.5px solid var(--b);background:var(--sf);overflow-y:auto;padding:12px"></div>'
    + '<div id="ei-sag" style="display:flex;flex-direction:column;overflow-y:auto"></div>'
    + '</div>'
    + '<div id="ei-footer" style="display:flex;justify-content:space-between;align-items:center;padding:10px 18px;border-top:0.5px solid var(--b);background:var(--sf);flex-shrink:0"></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
  _renderAll();
};

/* ── Render All ─────────────────────────────────────────────── */
function _renderAll() { _renderSteps(); _renderSol(); _renderSag(); _renderFooter(); }

/* ── Steps ──────────────────────────────────────────────────── */
function _renderSteps() {
  var el = _g('ei-steps'); if (!el) return;
  var adimlar = [{n:1,l:'Dosya Se\u00e7'},{n:2,l:'E\u015fle\u015ftir'},{n:3,l:'Kontrol'},{n:4,l:'Aktar'}];
  var h = '<div style="display:flex;align-items:center;gap:4px;padding:8px 18px;border-bottom:0.5px solid var(--b);background:var(--s2)">';
  adimlar.forEach(function(a, i) {
    var ok = a.n < _adim, on = a.n === _adim;
    h += '<div style="display:flex;align-items:center;gap:5px"><div style="width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;background:' + (ok ? '#16A34A' : on ? '#185FA5' : 'var(--s2)') + ';color:' + (ok || on ? '#fff' : 'var(--t3)') + ';border:' + (ok || on ? 'none' : '0.5px solid var(--b)') + '">' + (ok ? '\u2713' : a.n) + '</div>';
    h += '<span style="font-size:10px;color:' + (on ? '#185FA5' : 'var(--t3)') + ';font-weight:' + (on ? '600' : '400') + '">' + a.l + '</span></div>';
    if (i < 3) h += '<div style="width:24px;height:1px;background:' + (ok ? '#16A34A' : 'var(--b)') + '"></div>';
  });
  h += '</div>';
  el.innerHTML = h;
}

/* ── Sol Panel ──────────────────────────────────────────────── */
function _renderSol() {
  var el = _g('ei-sol'); if (!el) return;
  var h = '';
  /* Dosya bilgisi */
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:6px">Y\u00dcKLENEN DOSYA</div>';
  if (_dosyaAdi) {
    h += '<div style="background:#EAF3DE;border-radius:8px;padding:8px 10px;margin-bottom:10px"><div style="font-size:11px;font-weight:500;color:#16A34A">\u2705 ' + _esc(_dosyaAdi) + '</div>';
    h += '<div style="font-size:9px;color:#27500A;margin-top:3px">' + _dosyaSatir + ' sat\u0131r \u00b7 ' + _dosyaKolon + ' s\u00fctun</div></div>';
    var eslesti = Object.values(_eslestirme).filter(function(v) { return v && v !== 'atla'; }).length;
    h += '<div style="display:flex;gap:4px;margin-bottom:10px">';
    h += '<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#EAF3DE;color:#27500A">' + eslesti + ' e\u015fle\u015fti</span>';
    var uyariS = _kolonlar.length - eslesti;
    if (uyariS > 0) h += '<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#FAEEDA;color:#633806">' + uyariS + ' atland\u0131</span>';
    h += '</div>';
  } else {
    h += '<div style="background:var(--s2);border-radius:8px;padding:12px;text-align:center;margin-bottom:10px;font-size:10px;color:var(--t3)">Hen\u00fcz dosya y\u00fcklenmedi</div>';
  }

  /* İhracat dosyası seçimi */
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin:10px 0 6px">\u0130HRACAT DOSYASI</div>';
  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted && d.durum !== 'kapandi' && d.durum !== 'iptal'; }) : [];
  dosyalar.slice(0, 6).forEach(function(d) {
    var secili = String(_ihrDosyaId) === String(d.id);
    h += '<div onclick="event.stopPropagation();window._eiDosyaSec(\'' + d.id + '\')" style="padding:5px 8px;border-radius:5px;margin-bottom:3px;cursor:pointer;border:0.5px solid ' + (secili ? '#185FA5' : 'var(--b)') + ';background:' + (secili ? '#E6F1FB' : 'transparent') + ';display:flex;align-items:center;gap:6px">';
    h += '<span style="font-family:monospace;font-size:9px;color:#185FA5">' + _esc(d.dosyaNo || '') + '</span>';
    h += '<span style="font-size:10px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(d.musteriAd || '') + '</span>';
    if (secili) h += '<span style="font-size:8px;color:#185FA5">\u2713</span>';
    h += '</div>';
  });

  /* Dosya yoksa mesaj */
  if (!dosyalar.length) h += '<div style="font-size:9px;color:var(--t3);padding:6px 0">Aktif ihracat dosyas\u0131 bulunamad\u0131</div>';
  if (dosyalar.length > 6) h += '<div style="font-size:9px;color:var(--t3);padding:4px 0">+ ' + (dosyalar.length - 6) + ' dosya daha</div>';

  /* Hızlı Mod — Şablon Listesi */
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin:14px 0 6px">HIZLI MOD</div>';
  var sablonlar = _loadSablonlar();
  if (sablonlar.length) {
    sablonlar.slice(0, 4).forEach(function(s, i) {
      h += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:0.5px solid var(--b);font-size:9px">';
      h += '<span style="flex:1;color:var(--t)">' + _esc(s.ad) + '</span>';
      h += '<button onclick="event.stopPropagation();window._eiSablonYukle(' + i + ')" style="font-size:8px;padding:1px 6px;border:0.5px solid #185FA5;border-radius:3px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">Uygula</button>';
      h += '</div>';
    });
  } else {
    h += '<div style="font-size:9px;color:var(--t3)">Hen\u00fcz kay\u0131tl\u0131 \u015fablon yok</div>';
  }

  /* Özellikler */
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin:14px 0 6px">\u00d6ZELL\u0130KLER</div>';
  h += '<div style="font-size:9px;color:var(--t2);line-height:1.6">';
  h += '\ud83e\udd16 Ak\u0131ll\u0131 s\u00fctun e\u015fle\u015ftirme<br>';
  h += '\u267b\ufe0f \u015eablon kaydet & y\u00fckle<br>';
  h += '\u26a1 H\u0131zl\u0131 mod — \u00f6nceki e\u015fle\u015ftirmeyi uygula';
  h += '</div>';

  el.innerHTML = h;
}

/* ── Sağ Panel ──────────────────────────────────────────────── */
function _renderSag() {
  var el = _g('ei-sag'); if (!el) return;
  if (_adim === 1) _sagAdim1(el);
  else if (_adim === 2) _sagAdim2(el);
  else if (_adim === 3) _sagAdim3(el);
  else if (_adim === 4) _sagAdim4(el);
}

/* ── Adım 1 — Dosya Seç ────────────────────────────────────── */
function _sagAdim1(el) {
  var h = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px">';
  h += '<label for="excel-file-input" id="excel-drop-zone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed var(--b);border-radius:12px;padding:40px 24px;cursor:pointer;width:100%;max-width:420px;text-align:center;background:var(--sf);transition:all .2s">';
  h += '<input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="event.stopPropagation();window._excelDosyaSecildi(this)">';
  h += '<div style="font-size:36px;margin-bottom:12px">\ud83d\udcc2</div>';
  h += '<div style="font-size:14px;font-weight:500;color:var(--t);margin-bottom:6px">Excel veya CSV dosyas\u0131n\u0131 buraya s\u00fcr\u00fckleyin</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">veya</div>';
  h += '<div style="padding:8px 20px;background:#185FA5;color:#fff;border-radius:8px;font-size:13px;font-weight:500">Dosya Se\u00e7</div>';
  h += '<div style="margin-top:12px;font-size:9px;color:var(--t3)">.xlsx \u00b7 .xls \u00b7 .csv \u00b7 max 10MB</div>';
  h += '</label></div>';
  el.innerHTML = h;
  /* Drag & drop */
  var zone = _g('excel-drop-zone');
  if (zone) {
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = '#185FA5'; zone.style.background = '#E6F1FB'; }, { capture: true });
    zone.addEventListener('dragleave', function() { zone.style.borderColor = 'var(--b)'; zone.style.background = 'var(--sf)'; }, { capture: true });
    zone.addEventListener('drop', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--b)'; zone.style.background = 'var(--sf)'; var f = e.dataTransfer.files[0]; if (f) _dosyaIsle(f); }, { capture: true });
  }
}

/* ── Adım 2 — Eşleştir (IMPORT-DOCS-UX-002) ──────────────── */
var ZORUNLU_KOLONLAR = ['aciklama', 'urun_kodu', 'birim_fiyat', 'miktar', 'birim'];

function _eiSkorHesapla(excelKolon, sistemAlan) {
  if (!sistemAlan || sistemAlan === 'atla') return 0;
  var kl = excelKolon.toLowerCase().replace(/[\s\/_\-().#]/g, '');
  var keys = AI_MAP[sistemAlan] || [];
  var max = 0;
  keys.forEach(function(key) {
    var k2 = key.toLowerCase().replace(/[\s\/_\-().#]/g, '');
    if (kl === k2) max = Math.max(max, 95);
    else if (kl.indexOf(k2) !== -1 || k2.indexOf(kl) !== -1) max = Math.max(max, 78);
    else if (kl.length > 3 && kl.slice(0, 4) === k2.slice(0, 4)) max = Math.max(max, 58);
  });
  return max;
}

function _sagAdim2(el) {
  var h = '';
  var eslesmisAdet = Object.values(_eslestirme).filter(function(v) { return v && v !== 'atla'; }).length;

  /* Araç çubuğu */
  h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  h += '<span style="font-size:11px;font-weight:500;color:var(--t)">S\u00dcTUN E\u015eLe\u015eT\u0130RME</span>';
  h += '<div style="margin-left:auto;display:flex;gap:6px;align-items:center">';
  h += '<button onclick="event.stopPropagation();window._eiOtomatikEslestir()" style="font-size:10px;padding:4px 12px;border:0.5px solid #B5D4F4;border-radius:6px;background:#E6F1FB;color:#185FA5;cursor:pointer;font-family:inherit;font-weight:500">\ud83e\udd16 Otomatik</button>';
  var sablonlar = _loadSablonlar();
  if (sablonlar.length) {
    h += '<select onchange="event.stopPropagation();window._eiSablonYukle(this.value)" onclick="event.stopPropagation()" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t2);font-family:inherit"><option value="">\u015eablon...</option>';
    sablonlar.forEach(function(s, i) { h += '<option value="' + i + '">' + _esc(s.ad) + '</option>'; });
    h += '</select>';
  }
  h += '</div></div>';

  /* Başlıklar */
  h += '<div style="display:grid;grid-template-columns:1fr 24px 1fr;gap:6px;padding:4px 16px"><span style="font-size:8px;font-weight:700;letter-spacing:.6px;color:var(--t3);text-transform:uppercase">EXCEL S\u00dcTUNU</span><span></span><span style="font-size:8px;font-weight:700;letter-spacing:.6px;color:var(--t3);text-transform:uppercase">DUAY ALANI</span></div>';

  /* Satırlar — SELECT-TO-BADGE (UX-004) */
  _kolonlar.forEach(function(excKol) {
    var secili = _eslestirme[excKol] || 'atla';
    var skor = _eiSkorHesapla(excKol, secili);
    var eslesmis = secili !== 'atla' && skor >= 80;
    var onayGer = secili !== 'atla' && skor >= 50 && skor < 80;
    var zorunluMu = ZORUNLU_KOLONLAR.indexOf(secili) !== -1;
    var ornekler = _excelData.slice(0, 3).map(function(r) { return String(r[excKol] || '').slice(0, 20); }).filter(Boolean).join(' \u00b7 ');
    var rowBg = eslesmis ? '#F0FFF4' : onayGer ? '#FFFBEB' : '';
    var okClr = eslesmis ? '#16A34A' : onayGer ? '#D97706' : 'var(--t3)';
    var okTxt = eslesmis ? '\u2192' : onayGer ? '?' : '\u2192';
    var escK = excKol.replace(/[^a-zA-Z0-9]/g, '_');

    h += '<div style="display:grid;grid-template-columns:1fr 24px 1fr;gap:6px;align-items:center;padding:6px 16px;border-bottom:0.5px solid var(--b);' + (rowBg ? 'background:' + rowBg : '') + '">';

    /* Sol — Excel kolon (kutu içinde) */
    h += '<div style="min-width:0"><div style="display:flex;align-items:center;gap:4px">';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:5px;padding:3px 8px;font-size:10px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">' + _esc(excKol) + '</div>';
    if (zorunluMu) h += '<span style="font-size:8px;color:#DC2626;flex-shrink:0">Zorunlu</span>';
    h += '</div>';
    if (ornekler) h += '<div style="font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">' + _esc(ornekler) + '</div>';
    h += '</div>';

    /* Ok */
    h += '<span style="text-align:center;font-size:14px;font-weight:600;color:' + okClr + '">' + okTxt + '</span>';

    /* Sağ — Badge only (select yok) */
    h += '<div style="min-width:0">';
    if (eslesmis || onayGer) {
      var alanAd = ''; DUAY_ALANLARI.forEach(function(a) { if (a.v === secili) alanAd = a.l; });
      var badgeBg = eslesmis ? '#EAF3DE' : '#FAEEDA';
      var badgeBorder = eslesmis ? '#C0DD97' : '#FAC775';
      var badgeClr = eslesmis ? '#27500A' : '#854F0B';
      var aiBg = eslesmis ? '#185FA5' : '#D97706';
      var aiTxt = eslesmis ? 'AI' : '? kontrol';
      h += '<div id="bm-badge-' + escK + '" onclick="event.stopPropagation();window._eiPopupSec(\'' + escK + '\',\'' + _esc(excKol).replace(/'/g, "\\'") + '\')" style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 8px;border-radius:5px;cursor:pointer;background:' + badgeBg + ';border:0.5px solid ' + badgeBorder + '">';
      h += '<span style="font-size:10px;font-weight:500;color:' + badgeClr + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(alanAd) + '</span>';
      h += '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:' + aiBg + ';color:#fff;font-weight:500;flex-shrink:0">' + aiTxt + '</span>';
      h += '</div>';
    } else {
      h += '<div id="bm-badge-' + escK + '" onclick="event.stopPropagation();window._eiPopupSec(\'' + escK + '\',\'' + _esc(excKol).replace(/'/g, "\\'") + '\')" style="border:1.5px dashed var(--b);border-radius:5px;padding:4px 8px;font-size:9px;color:var(--t3);cursor:pointer">+ E\u015fle\u015ftir...</div>';
    }
    h += '</div></div>';
  });

  /* Veri Önizleme */
  var eslesmisAlanlar = _kolonlar.filter(function(k) { return _eslestirme[k] && _eslestirme[k] !== 'atla'; });
  if (eslesmisAlanlar.length > 0 && _excelData.length > 0) {
    var onizKols = eslesmisAlanlar.slice(0, 4);
    h += '<div style="padding:10px 16px;border-top:0.5px solid var(--b);background:var(--sf);flex-shrink:0">';
    h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);text-transform:uppercase;margin-bottom:7px">VER\u0130 \u00d6N\u0130ZLEME (\u0130LK ' + Math.min(3, _excelData.length) + ' SATIR)</div>';
    h += '<div style="overflow-x:auto;border-radius:6px;border:0.5px solid var(--b)"><table style="width:100%;border-collapse:collapse;font-size:9px"><thead><tr style="background:var(--s2)">';
    onizKols.forEach(function(k) { var alanAd2 = ''; DUAY_ALANLARI.forEach(function(a) { if (a.v === _eslestirme[k]) alanAd2 = a.l; }); h += '<th style="padding:5px 8px;border-bottom:0.5px solid var(--b);font-weight:600;text-align:left;white-space:nowrap;color:var(--t2)">' + _esc(alanAd2 || _eslestirme[k]) + '</th>'; });
    h += '</tr></thead><tbody>';
    _excelData.slice(0, 3).forEach(function(row, ri) {
      h += '<tr style="background:' + (ri % 2 === 0 ? 'var(--sf)' : 'var(--s2)') + '">';
      onizKols.forEach(function(k) {
        var val = String(row[k] || '').slice(0, 25);
        var isZorunluBos = !val && ZORUNLU_KOLONLAR.indexOf(_eslestirme[k]) !== -1;
        h += '<td style="padding:4px 8px;border-bottom:0.5px solid var(--b);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (isZorunluBos ? 'background:#FEF2F2' : '') + '">' + _esc(val || '\u2014') + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div></div>';
  }

  /* Uyarı bandı */
  var uyarilar = [];
  _kolonlar.forEach(function(k) {
    var ornekler2 = _excelData.slice(0, 5).map(function(r) { return r[k]; }).filter(Boolean);
    var hasDot = ornekler2.some(function(v) { return String(v).indexOf('.') !== -1; });
    var hasComma = ornekler2.some(function(v) { return String(v).indexOf(',') !== -1; });
    if (hasDot && hasComma && _eslestirme[k] && ['birim_fiyat', 'brut_kg', 'net_kg'].indexOf(_eslestirme[k]) !== -1) {
      uyarilar.push('"' + k + '" ondal\u0131k format TR/EN kar\u0131\u015f\u0131k');
    }
  });
  if (uyarilar.length) {
    h += '<div style="padding:7px 16px;background:#FFFBEB;border-top:0.5px solid #FDE68A;font-size:9px;color:#92400E;flex-shrink:0;display:flex;align-items:center;gap:6px">';
    h += '<span>\u26a0</span><span><strong>' + uyarilar.length + ' uyar\u0131:</strong> ' + _esc(uyarilar[0]) + '</span></div>';
  }

  el.innerHTML = h;
}

/* ── Adım 3 — Kontrol ──────────────────────────────────────── */
function _sagAdim3(el) {
  /* Veri hazırla */
  var mappedRows = _excelData.map(function(satir) {
    var mapped = {};
    _kolonlar.forEach(function(k) { var alan = _eslestirme[k]; if (alan && alan !== 'atla') mapped[alan] = satir[k]; });
    return mapped;
  }).filter(function(m) { return Object.keys(m).length > 0; });
  _hataliSatirlar = [];
  mappedRows.forEach(function(m, idx) {
    var h2 = [];
    if (!m.aciklama && !m.urun_kodu) h2.push('\u00dcr\u00fcn ad\u0131/kodu bo\u015f');
    if (m.miktar && isNaN(parseFloat(m.miktar))) h2.push('Miktar say\u0131 de\u011fil');
    if (m.birim_fiyat && isNaN(parseFloat(m.birim_fiyat))) h2.push('Fiyat say\u0131 de\u011fil');
    if (h2.length) _hataliSatirlar.push({ satir: idx + 1, hatalar: h2 });
  });
  _gecerliSatirlar = mappedRows;
  var hazir = mappedRows.length - _hataliSatirlar.length;
  var eslesti = Object.values(_eslestirme).filter(function(v) { return v && v !== 'atla'; }).length;

  var h = '';
  /* Özet kartları */
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">';
  h += '<div style="background:#EAF3DE;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#27500A">Toplam</div><div style="font-size:18px;font-weight:500;color:#16A34A">' + mappedRows.length + '</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#0C447C">E\u015fle\u015fen</div><div style="font-size:18px;font-weight:500;color:#185FA5">' + eslesti + '</div></div>';
  h += '<div style="background:' + (_hataliSatirlar.length ? '#FCEBEB' : '#EAF3DE') + ';border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:' + (_hataliSatirlar.length ? '#791F1F' : '#27500A') + '">Hatal\u0131</div><div style="font-size:18px;font-weight:500;color:' + (_hataliSatirlar.length ? '#DC2626' : '#16A34A') + '">' + _hataliSatirlar.length + '</div></div>';
  h += '<div style="background:#EAF3DE;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#27500A">Haz\u0131r</div><div style="font-size:18px;font-weight:500;color:#16A34A">' + hazir + '</div></div>';
  h += '</div>';

  /* Zorunlu alan kontrol */
  var zorunlu = _loadZorunlu();
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:6px">ZORUNLU ALAN KONTROL\u00dc</div>';
  zorunlu.forEach(function(z) {
    var eslestiMi = Object.values(_eslestirme).indexOf(z.k) !== -1;
    var dot = eslestiMi ? '#16A34A' : '#DC2626';
    h += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:10px"><span style="width:7px;height:7px;border-radius:50%;background:' + dot + ';flex-shrink:0"></span><span style="color:var(--t)">' + _esc(z.l) + '</span><span style="font-size:8px;color:var(--t3);margin-left:auto">' + z.seviye + '</span></div>';
  });

  /* Hatalı satırlar */
  if (_hataliSatirlar.length) {
    h += '<div style="margin-top:10px;padding:8px;background:#FEF2F2;border-radius:6px;font-size:10px;color:#991B1B"><strong>' + _hataliSatirlar.length + ' hatal\u0131 sat\u0131r:</strong><br>';
    _hataliSatirlar.slice(0, 5).forEach(function(hs) { h += 'Sat\u0131r ' + hs.satir + ': ' + hs.hatalar.join(', ') + '<br>'; });
    h += '</div>';
  }

  el.innerHTML = h;
}

/* ── Adım 4 — Aktar ────────────────────────────────────────── */
function _sagAdim4(el) {
  var h = '<div style="text-align:center;padding:24px">';
  h += '<div style="font-size:36px;margin-bottom:8px">\ud83c\udf89</div>';
  h += '<div style="font-size:16px;font-weight:600;margin-bottom:16px">Import Tamamland\u0131!</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:360px;margin:0 auto">';
  h += '<div style="background:#EAF3DE;border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:#27500A">Eklendi</div><div style="font-size:20px;font-weight:500;color:#16A34A">' + _eklenen + '</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:#0C447C">G\u00fcncellendi</div><div style="font-size:20px;font-weight:500;color:#185FA5">' + _guncellenen + '</div></div>';
  h += '<div style="background:' + (_atlandi ? '#FCEBEB' : '#EAF3DE') + ';border-radius:8px;padding:10px;text-align:center"><div style="font-size:9px;color:' + (_atlandi ? '#791F1F' : '#27500A') + '">Atland\u0131</div><div style="font-size:20px;font-weight:500;color:' + (_atlandi ? '#DC2626' : '#16A34A') + '">' + _atlandi + '</div></div>';
  h += '</div></div>';
  el.innerHTML = h;
}

/* ── Footer ─────────────────────────────────────────────────── */
function _renderFooter() {
  var el = _g('ei-footer'); if (!el) return;
  var eslesti = Object.values(_eslestirme).filter(function(v) { return v && v !== 'atla'; }).length;
  var sol = '<span style="font-size:10px;color:var(--t3)">' + eslesti + '/' + _kolonlar.length + ' e\u015fle\u015fti \u00b7 ' + _dosyaSatir + ' sat\u0131r</span>';
  var sag = '';
  if (_adim === 1) {
    sag = '<button onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u0130ptal</button>';
  } else if (_adim === 2) {
    var zorunluEksik = ZORUNLU_KOLONLAR.filter(function(z) { return Object.values(_eslestirme).indexOf(z) === -1; }).length;
    sol = '<span style="font-size:10px;color:' + (zorunluEksik > 0 ? '#DC2626' : 'var(--t3)') + '">' + _dosyaSatir + ' sat\u0131r \u00b7 ' + eslesti + '/' + _kolonlar.length + ' e\u015fle\u015fti \u00b7 ' + zorunluEksik + ' zorunlu eksik</span>';
    sag = '<button onclick="event.stopPropagation();window._eiGeri()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2190 Geri</button>'
      + '<button onclick="event.stopPropagation();window._eiSablonKaydet?.()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;margin-left:6px">\u015eablon Kaydet</button>'
      + '<button onclick="event.stopPropagation();window._eiIleri()" style="font-size:11px;padding:6px 14px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500;font-family:inherit;margin-left:6px">Kontrol Et \u2192</button>';
  } else if (_adim === 3) {
    var hazir = _gecerliSatirlar.length - _hataliSatirlar.length;
    sag = '<button onclick="event.stopPropagation();window._eiGeri()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2190 Geri</button>'
      + '<button onclick="event.stopPropagation();window._eiAktar()" style="font-size:11px;padding:6px 18px;border:none;border-radius:6px;background:#16A34A;color:#fff;cursor:pointer;font-weight:500;font-family:inherit;margin-left:8px">\u2705 ' + hazir + ' \u00dcr\u00fcn Aktar</button>';
  } else {
    sag = '<button onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove();window.renderIhracatOps?.()" style="font-size:11px;padding:6px 18px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">\u00dcr\u00fcnlere Git \u2192</button>';
  }
  el.innerHTML = '<div>' + sol + '</div><div style="display:flex;gap:6px">' + sag + '</div>';
}

/* ── Navigasyon ─────────────────────────────────────────────── */
window._excelDosyaSecildi = function(input) { var f = input.files && input.files[0]; if (f) _dosyaIsle(f); };
window._eiDosyaSec = function(id) { _ihrDosyaId = String(id); _renderSol(); };
window._eiGeri = function() { if (_adim > 1) { _adim--; _renderAll(); } };
window._eiIleri = function() { if (_adim < 4) { _adim++; _renderAll(); } };
window._eiEslestirGuncelle = function(kolAdi, deger) { _eslestirme[kolAdi] = deger; _renderSol(); };
window._eiOtomatikEslestir = function() { _aiEslestir(); _renderAll(); window.toast?.('Otomatik e\u015fle\u015ftirme tamamland\u0131', 'ok'); };

window._eiSablonKaydet = function() {
  var ad = prompt('\u015eablon ad\u0131 (\u00f6rn: Tedarik\u00e7i A):');
  if (!ad) return;
  var sablonlar = _loadSablonlar();
  sablonlar.unshift({ id: _genId(), ad: ad, eslestirme: Object.assign({}, _eslestirme), tarih: new Date().toISOString() });
  try { localStorage.setItem(_SABLON_KEY, JSON.stringify(sablonlar.slice(0, 20))); } catch(e) {}
  window.toast?.('\u015eablon kaydedildi: ' + ad, 'ok');
  _renderAll();
};

window._eiSablonYukle = function(idx) {
  var sablonlar = _loadSablonlar();
  var s = sablonlar[parseInt(idx)];
  if (!s || !s.eslestirme) return;
  _eslestirme = Object.assign({}, s.eslestirme);
  window.toast?.('\u015eablon y\u00fcklendi: ' + s.ad, 'ok');
  _renderAll();
};

/* ── Import Çalıştır ────────────────────────────────────────── */
window._eiAktar = function() {
  var cu = _cu();
  var mevcutU = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var dosyaId = _ihrDosyaId;
  var nowStr = _now();
  _eklenen = 0; _guncellenen = 0; _atlandi = 0;

  _gecerliSatirlar.forEach(function(mapped, idx) {
    if (_hataliSatirlar.find(function(h2) { return h2.satir === idx + 1; })) { _atlandi++; return; }
    /* Veri düzeltici */
    ['birim_fiyat', 'miktar', 'koli_adet', 'brut_kg', 'net_kg', 'kdv_orani'].forEach(function(f) {
      if (mapped[f]) mapped[f] = String(mapped[f]).replace(/,/g, '.').replace(/[^\d.\-]/g, '');
    });
    if (mapped.doviz) { var dv = String(mapped.doviz).trim().toUpperCase(); if (dv === 'TL') mapped.doviz = 'TRY'; else if (dv === '$') mapped.doviz = 'USD'; else if (dv === '\u20ac') mapped.doviz = 'EUR'; }
    /* Eksik kod üretimi */
    if (!mapped.urun_kodu && mapped.aciklama) {
      mapped.urun_kodu = mapped.aciklama.split(/\s+/).map(function(w) { return (w[0] || '').toUpperCase(); }).join('').slice(0, 4) + '-' + String(idx + 1).padStart(3, '0');
    }
    /* Çakışma */
    var dup = null;
    if (mapped.urun_kodu && dosyaId) {
      dup = mevcutU.find(function(u) { return !u.isDeleted && u.urun_kodu === mapped.urun_kodu && String(u.dosya_id) === String(dosyaId); });
    }
    if (dup && _cakismaMod === 'guncelle') {
      Object.keys(mapped).forEach(function(mk) { if (mapped[mk] && String(mapped[mk]).trim()) dup[mk] = mapped[mk]; });
      dup.updatedAt = nowStr; _guncellenen++;
    } else if (dup && _cakismaMod === 'atla') { _atlandi++; }
    else {
      mevcutU.unshift({
        id: _genId(), dosya_id: dosyaId || '',
        aciklama: mapped.aciklama || '', standart_urun_adi: mapped.standart_urun_adi || mapped.aciklama || '',
        urun_kodu: mapped.urun_kodu || '', hs_kodu: mapped.hs_kodu || '',
        miktar: parseFloat(mapped.miktar || 0), birim: mapped.birim || 'PCS',
        birim_fiyat: parseFloat(mapped.birim_fiyat || 0), doviz: mapped.doviz || 'USD',
        kdv_orani: mapped.kdv_orani || '',
        brut_kg: parseFloat(mapped.brut_kg || 0), net_kg: parseFloat(mapped.net_kg || 0),
        koli_adet: parseInt(mapped.koli_adet || 0), ambalaj_tipi: mapped.ambalaj_tipi || '',
        tedarikciAd: mapped.tedarikciAd || '', mense_ulke: mapped.mense_ulke || '',
        etiket_rengi: mapped.etiket_rengi || '', konteyner_sira: mapped.konteyner_sira || '',
        alis_fatura_no: mapped.alis_fatura_no || '', alis_fatura_tarihi: mapped.alis_fatura_tarihi || '',
        fatura_turu: mapped.fatura_turu || '', fatura_urun_adi: mapped.fatura_urun_adi || '',
        satici_urun_kodu: mapped.satici_urun_kodu || '', anahtar_kelime: mapped.anahtar_kelime || '',
        kaynak: 'excel_v5', createdAt: nowStr, createdBy: cu?.id
      });
      _eklenen++;
    }
  });
  if (typeof window.storeIhracatUrunler === 'function') window.storeIhracatUrunler(mevcutU);
  window.logActivity?.('import', 'Excel V5: ' + _eklenen + ' eklendi, ' + _guncellenen + ' g\u00fcncellendi, ' + _atlandi + ' atland\u0131');
  _adim = 4; _renderAll();
};

/* ── Popup Select (UX-004) ──────────────────────────────────── */
window._eiPopupSec = function(escK, kolonAdi) {
  document.getElementById('ei-popup-sel')?.remove();
  var badge = document.getElementById('bm-badge-' + escK);
  if (!badge) return;
  var rect = badge.getBoundingClientRect();
  var sel = document.createElement('select');
  sel.id = 'ei-popup-sel';
  sel.size = Math.min(DUAY_ALANLARI.length, 10);
  sel.setAttribute('style', 'position:fixed;top:' + rect.bottom + 'px;left:' + rect.left + 'px;width:' + Math.max(rect.width, 180) + 'px;z-index:9999;font-size:11px;border:1px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);box-shadow:0 4px 16px rgba(0,0,0,.12);padding:4px 0;font-family:inherit');
  DUAY_ALANLARI.forEach(function(a) {
    var opt = document.createElement('option');
    opt.value = a.v; opt.textContent = a.l;
    if (_eslestirme[kolonAdi] === a.v) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = function() {
    window._eiEslestirGuncelle?.(kolonAdi, sel.value);
    sel.remove();
    _renderAll();
  };
  sel.onblur = function() { setTimeout(function() { sel.remove(); }, 150); };
  document.body.appendChild(sel);
  sel.focus();
};

/* ── Window Exports ─────────────────────────────────────────── */
window._loadZorunlu = _loadZorunlu;
window._saveZorunlu = _saveZorunlu;
window._eiSkorHesapla = _eiSkorHesapla;

})();
