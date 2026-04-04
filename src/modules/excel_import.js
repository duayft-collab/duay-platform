/**
 * src/modules/excel_import.js — v4.0.0
 * Excel Import V4 — 4 adim wizard: Dosya Yukle → Sayfa Sec → Kolon Eslestir → Aktar
 * Hata engelleyici sistem, zorunlu alan kontrolu, veri tipi etiketi, cakisma yonetimi,
 * canli onizleme, chunk import, rapor ekrani, sablon indirme
 * @module ExcelImportV4
 */
(function ExcelImportV4() {
'use strict';

/* ── Helpers ─────────────────────────────────────────────────── */
var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };

var _loadTpl = function() { try { return JSON.parse(localStorage.getItem('ak_excel_tpl1') || '[]'); } catch (e) { return []; } };
var _storeTpl = function(d) { try { localStorage.setItem('ak_excel_tpl1', JSON.stringify(d.slice(0, 30))); } catch (e) {} };

/* ── State ───────────────────────────────────────────────────── */
var _workbook = null;
var _sheetNames = [];
var _selectedSheet = '';
var _excelData = [];
var _kolonlar = [];
var _eslestirme = {};
var _gecerliSatirlar = [];
var _hataliSatirlar = [];
var _cakismaMod = 'guncelle'; // guncelle | atla | yeni
var _guncellenenSayisi = 0;
var _eklenenSayisi = 0;
var _atlandiSayisi = 0;
var _dosyaAdi = '';
var _dosyaBoyut = 0;
var _dosyaSatir = 0;
var _dosyaKolon = 0;
var _musteriAd = '';
var _sablon_no = '';
var _ihrDosyaId = '';
var _tedarikciId = '';

/* ── Zorunlu Kolonlar ────────────────────────────────────────── */
var ZORUNLU_KOLONLAR = ['urun_kodu', 'aciklama', 'birim_fiyat', 'doviz', 'koli_adet'];

/* ── Kolon Tipleri ───────────────────────────────────────────── */
var KOLON_TIPLER = {
  urun_kodu:        'Metin (Text)',
  aciklama:         'Metin (Text)',
  standart_urun_adi:'Metin (Text)',
  fatura_urun_adi:  'Metin (Text)',
  gumrukcu_tanim:   'Metin (Text)',
  satici_urun_adi:  'Metin (Text)',
  satici_urun_kodu: 'Metin (Text)',
  teknik_aciklama:  'Metin (Text)',
  marka:            'Metin (Text)',
  siparis_no:       'Metin (Text)',
  alis_fatura_no:   'Metin (Text)',
  tedarikci:        'Metin (Text)',
  mense_ulke:       'Metin (Text)',
  etiket_rengi:     'Metin (Text)',
  birim:            'Metin (Text)',
  birim_fiyat:      'Sayi \u00b7 Para (USD/EUR/TRY)',
  toplam_fiyat:     'Sayi \u00b7 Para (USD/EUR/TRY)',
  doviz:            'Metin (USD/EUR/TRY)',
  miktar:           'Tam sayi',
  koli_adet:        'Tam sayi',
  miktar_koli:      'Tam sayi',
  konteyner_sira:   'Tam sayi',
  kdv_orani:        'Ondalik sayi (%)',
  brut_kg:          'Ondalik sayi (kg)',
  net_kg:           'Ondalik sayi (kg)',
  brut_kg_koli:     'Ondalik sayi (kg)',
  net_kg_koli:      'Ondalik sayi (kg)',
  hacim_m3:         'Ondalik sayi (m\u00b3)',
  hacim_m3_koli:    'Ondalik sayi (m\u00b3)',
  hs_kodu:          'Metin (8-12 hane)',
  dib:              'Metin (H/E)',
  dilli_urun:       'Metin (H/E)',
  imo_urun:         'Metin (H/E)'
};

/* ── Alan Tanimlari ──────────────────────────────────────────── */
var DUAY_ALANLARI = [
  { v:'aciklama',          l:'Urun Aciklamasi / Description',         zorunlu:true },
  { v:'urun_kodu',         l:'Urun Kodu / Item Code',                 zorunlu:true },
  { v:'birim_fiyat',       l:'Birim Fiyat / Unit Price',              zorunlu:true },
  { v:'doviz',             l:'Para Birimi / Currency',                 zorunlu:true },
  { v:'koli_adet',         l:'Koli Adedi / Carton Qty',               zorunlu:true },
  { v:'hs_kodu',           l:'HS Kodu / GTIP',                        zorunlu:false },
  { v:'miktar',            l:'Miktar / Quantity',                      zorunlu:false },
  { v:'miktar_koli',       l:'Koli Basi Adet / Qty per Carton',       zorunlu:false },
  { v:'birim',             l:'Birim / Unit',                           zorunlu:false },
  { v:'toplam_fiyat',      l:'Toplam Tutar / Total Amount',           zorunlu:false },
  { v:'tedarikci',         l:'Tedarikci / Supplier',                  zorunlu:false },
  { v:'brut_kg',           l:'Toplam Brut KG / Gross Weight',         zorunlu:false },
  { v:'net_kg',            l:'Toplam Net KG / Net Weight',            zorunlu:false },
  { v:'brut_kg_koli',      l:'Koli Brut KG / Gross KG per Ctn',      zorunlu:false },
  { v:'net_kg_koli',       l:'Koli Net KG / Net KG per Ctn',         zorunlu:false },
  { v:'hacim_m3',          l:'Toplam CBM / Total m\u00b3',            zorunlu:false },
  { v:'hacim_m3_koli',     l:'Koli CBM / CBM per Ctn',               zorunlu:false },
  { v:'mense_ulke',        l:'Mense Ulke / Country of Origin',        zorunlu:false },
  { v:'etiket_rengi',      l:'Etiket Rengi / Label Color',            zorunlu:false },
  { v:'konteyner_sira',    l:'Konteyner Sirasi / Loading Order',      zorunlu:false },
  { v:'siparis_no',        l:'Siparis No / Order No',                  zorunlu:false },
  { v:'marka',             l:'Marka / Brand',                          zorunlu:false },
  { v:'standart_urun_adi', l:'Standart Adi (EN) / CI-PL Name',        zorunlu:false },
  { v:'fatura_urun_adi',   l:'Fatura Adi / Invoice Name',              zorunlu:false },
  { v:'gumrukcu_tanim',    l:'Gumrukcu Tanim / Customs Desc',         zorunlu:false },
  { v:'teknik_aciklama',   l:'Teknik Aciklama / Technical Desc',      zorunlu:false },
  { v:'satici_urun_adi',   l:'Satici Urun Adi / Supplier Name',       zorunlu:false },
  { v:'satici_urun_kodu',  l:'Satici Kodu / Supplier Code',            zorunlu:false },
  { v:'benzer_urun_kodu',  l:'Benzer Urun Kodu / Similar Code',        zorunlu:false },
  { v:'alis_fatura_no',    l:'Alis Fatura No / Purchase Invoice',     zorunlu:false },
  { v:'dib',               l:'DIB (H/E)',                               zorunlu:false },
  { v:'dilli_urun',        l:'Dilli Urun (H/E)',                       zorunlu:false },
  { v:'imo_urun',          l:'IMO Urun (H/E)',                         zorunlu:false },
  { v:'kdv_orani',         l:'KDV% / VAT Rate',                       zorunlu:false },
  { v:'atla',              l:'\u2014 Atla / Skip \u2014',              zorunlu:false }
];

/* ── Anahtar Kelime Eslestirme ───────────────────────────────── */
var ANAHTAR = {
  aciklama:['description','descriptionofgoods','productdescription','productname','goodsdescription','urun','aciklama','tanim','goods','itemname','product','name'],
  urun_kodu:['itemcode','itemno','productcode','articleno','article','sku','ref','partnumber','kod','urunkodu','part','code','no','itemcodeno'],
  hs_kodu:['hs','hscode','hstariff','tariff','tariffcode','gtip','gumruk','customscode','harmonized','commodity'],
  miktar:['totalqty','totalquantity','totalpieces','totalpcs','qty','quantity','miktar','adet','pcs','pieces'],
  miktar_koli:['qtypercarton','pcspercarton','pcsinctn','pcsinone','pcsperbox','kolibasi','quantitypercarton'],
  birim:['unit','unitofmeasure','uom','birim'],
  birim_fiyat:['unitprice','pricepcs','priceper','price','fiyat','birimfiyat','cost','unitcost','rate'],
  toplam_fiyat:['totalamount','totalvalue','totalprice','toplamtutar','toplamfiyat','amount'],
  doviz:['currency','cur','doviz','curr'],
  tedarikci:['supplier','vendor','manufacturer','tedarikci','uretici','factory','maker'],
  brut_kg:['totalgrosskg','totalgrossweight','grossweighttotal','totalbrut','brutkg','grossweight','gw'],
  net_kg:['totalnetkg','totalnetweight','netweighttotal','totalnet','netkg','netweight','nw'],
  hacim_m3:['totalcbm','totalvolume','cbmtotal','cbm','volume','hacim','m3'],
  koli_adet:['cartonqty','totalcartons','numberofcartons','ctn','ctns','cartons','boxes','koliadet','carton','package'],
  mense_ulke:['countryoforigin','origin','coo','mense','country'],
  etiket_rengi:['color','colour','labelcolor','etiket','renk'],
  konteyner_sira:['loadingorder','loadingsequence','containerorder','sira'],
  siparis_no:['orderno','ordernum','po','ponumber','purchaseorder','siparis'],
  marka:['brand','trademark','marka'],
  standart_urun_adi:['standardname','ciname','plname','englishname','stdname'],
  fatura_urun_adi:['invoicename','invoicedesc','faturaurun'],
  gumrukcu_tanim:['customsdesc','customsname','gumrukcutanim'],
  satici_urun_kodu:['supplierprodcode','vendorcode','saticiurunkodu'],
  kdv_orani:['vatrate','kdv','vat','taxrate']
};

/* ── Hata Aciklamalari ───────────────────────────────────────── */
var HATA_ACIKLAMALARI = {
  'sayi_bekleniyor':  'Sayi bekleniyor ama metin geldi. Excel hucresini sayiya cevir.',
  'zorunlu_bos':      'Bu alan bos birakilamaz. Excel\'de doldur ve tekrar import et.',
  'gecersiz_format':  'Format hatali. Ornek dogru format: "5208.11.00"',
  'cok_uzun':         'Deger cok uzun. Maximum 255 karakter olmali.',
  'duplicate_atlandi':'Ayni urun kodu mevcut. Cakisma moduna gore atlandi.'
};

/* ══════════════════════════════════════════════════════════════
   STEP BAR
   ══════════════════════════════════════════════════════════════ */
function _stepBar(aktif) {
  var adimlar = ['Dosya Yukle', 'Sayfa Sec', 'Kolonlari Eslestir', 'Aktar'];
  return '<div style="display:flex;align-items:center;gap:6px;padding:12px 20px;border-bottom:0.5px solid var(--b);background:var(--s2)">' + adimlar.map(function(a, i) {
    var n = i + 1;
    var ok = n < aktif;
    var on = n === aktif;
    return '<div style="display:flex;align-items:center;gap:5px">'
      + '<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;background:' + (ok ? '#16A34A' : on ? '#185FA5' : 'var(--s2)') + ';color:' + (ok ? '#fff' : on ? '#fff' : 'var(--t3)') + ';border:' + (on ? 'none' : ok ? 'none' : '1.5px solid var(--b)') + '">' + (ok ? '\u2713' : n) + '</div>'
      + '<span style="font-size:12px;color:' + (on ? '#185FA5' : ok ? '#16A34A' : 'var(--t3)') + ';font-weight:' + (on ? '600' : '400') + '">' + a + '</span>'
      + (i < 3 ? '<span style="color:var(--t3);margin:0 4px;font-size:10px">\u2192</span>' : '')
      + '</div>';
  }).join('') + '</div>';
}

/* ══════════════════════════════════════════════════════════════
   MODAL ACILIS
   ══════════════════════════════════════════════════════════════ */
/**
 * Excel Import V4 wizard'ini acar.
 * @param {string} [dosyaId] - Ihracat dosya ID
 * @param {string} [tedarikciId] - Tedarikci ID
 */
window.excelImportAc = function(dosyaId, tedarikciId) {
  _ihrDosyaId = dosyaId || '';
  _tedarikciId = tedarikciId || '';
  _workbook = null; _sheetNames = []; _selectedSheet = '';
  _excelData = []; _kolonlar = []; _eslestirme = {};
  _gecerliSatirlar = []; _hataliSatirlar = [];
  _guncellenenSayisi = 0; _eklenenSayisi = 0; _atlandiSayisi = 0;
  _dosyaAdi = ''; _dosyaBoyut = 0; _dosyaSatir = 0; _dosyaKolon = 0;
  _cakismaMod = 'guncelle';
  var old = _g('mo-excel-import'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-excel-import';
  mo.innerHTML = '<div class="moc" style="max-width:1020px;width:96vw;padding:0;border-radius:14px;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;background:var(--sf)">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--sf)">'
      + '<div style="font-size:15px;font-weight:600;color:var(--t)">Excel Import V4</div>'
      + '<div style="display:flex;align-items:center;gap:10px">'
        + '<button onclick="event.stopPropagation();window._ihrExcelSablonIndir()" class="btn btns" style="font-size:11px;padding:5px 12px">\u2b07 Hazir Sablon Indir</button>'
        + '<button onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);line-height:1">\u00d7</button>'
      + '</div>'
    + '</div>'
    + '<div id="excel-import-body" style="flex:1;overflow-y:auto;min-height:320px"></div>'
    + '<div id="excel-import-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;background:var(--sf)"></div>'
  + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
  _renderAdim1();
};

/* ══════════════════════════════════════════════════════════════
   ADIM 1 — DOSYA YUKLE (drag&drop)
   ══════════════════════════════════════════════════════════════ */
function _renderAdim1() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  body.innerHTML = _stepBar(1)
    + '<div style="padding:28px 24px;text-align:center">'
      + '<div id="ei-dropzone" style="min-height:180px;border:2px dashed var(--b);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:28px;cursor:pointer;transition:border-color .2s,background .2s" onclick="event.stopPropagation();document.getElementById(\'excel-file-input\')?.click()">'
        + '<div style="font-size:42px;line-height:1">\ud83d\udcc1</div>'
        + '<div style="font-size:14px;font-weight:500;color:var(--t)">Dosyani buraya surukle birak</div>'
        + '<div style="font-size:12px;color:var(--t3)">veya tikla ve dosya sec</div>'
        + '<div style="font-size:11px;color:var(--t3);margin-top:4px;background:var(--s2);padding:4px 14px;border-radius:6px">.xlsx \u00b7 .xls \u00b7 .csv</div>'
      + '</div>'
      + '<input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="event.stopPropagation();window._excelDosyaSecildi(this)">'
      + '<div id="ei-file-info" style="margin-top:16px"></div>'
    + '</div>';

  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove()">Iptal</button>';

  /* Drag & Drop */
  var dz = _g('ei-dropzone');
  if (dz) {
    dz.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); dz.style.borderColor = '#185FA5'; dz.style.background = '#E6F1FB'; });
    dz.addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); dz.style.borderColor = ''; dz.style.background = ''; });
    dz.addEventListener('drop', function(e) {
      e.preventDefault(); e.stopPropagation();
      dz.style.borderColor = ''; dz.style.background = '';
      var files = e.dataTransfer?.files;
      if (files && files[0]) {
        var inp = _g('excel-file-input');
        /* DataTransfer trick for setting files */
        var dt = new DataTransfer();
        dt.items.add(files[0]);
        if (inp) { inp.files = dt.files; }
        window._excelDosyaSecildi({ files: [files[0]] });
      }
    });
  }
}

/* ── Dosya secildi ───────────────────────────────────────────── */
window._excelDosyaSecildi = function(input) {
  var file = input.files ? input.files[0] : null;
  if (!file) return;
  _dosyaAdi = file.name;
  _dosyaBoyut = file.size;
  var ext = file.name.split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].indexOf(ext) === -1) {
    window.toast?.('Desteklenmeyen format. .xlsx, .xls veya .csv yukle.', 'err');
    return;
  }

  var body = _g('excel-import-body');
  if (!body) return;
  body.innerHTML = _stepBar(1) + '<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:28px;margin-bottom:12px">\u23f3</div>Dosya okunuyor...</div>';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (ext === 'csv') {
        _parseCSV(e.target.result);
      } else if (typeof XLSX !== 'undefined') {
        _workbook = XLSX.read(e.target.result, { type: 'array' });
        _sheetNames = _workbook.SheetNames || [];
        if (_sheetNames.length === 1) {
          /* Tek sayfa — direkt devam */
          _selectedSheet = _sheetNames[0];
          _processSheet(_selectedSheet);
        } else if (_sheetNames.length > 1) {
          _renderAdim2_SayfaSec();
        } else {
          window.toast?.('Dosyada sayfa bulunamadi', 'err');
          _renderAdim1();
        }
      } else {
        _parseCSV(new TextDecoder().decode(e.target.result));
      }
    } catch (err) {
      window.toast?.('Dosya okunamadi: ' + err.message, 'err');
      _renderAdim1();
    }
  };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
};

function _parseCSV(text) {
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var rows = lines.map(function(l) { return l.split(/[,;\t]/).map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); });
  _sheetNames = ['CSV'];
  _selectedSheet = 'CSV';
  _processRawData(rows);
}

function _processSheet(sheetName) {
  if (!_workbook) return;
  var ws = _workbook.Sheets[sheetName];
  if (!ws) { window.toast?.('Sayfa bulunamadi: ' + sheetName, 'err'); return; }
  var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  _processRawData(rows);
}

function _processRawData(rows) {
  if (!rows || rows.length < 2) { window.toast?.('Dosyada yeterli veri bulunamadi', 'err'); _renderAdim1(); return; }
  /* Baslik satiri bul — en fazla dolu hucre iceren satir */
  var headerRowIdx = 0;
  var maxDolu = 0;
  for (var ri = 0; ri < Math.min(10, rows.length); ri++) {
    var dolu = 0;
    for (var ci = 0; ci < rows[ri].length; ci++) { if (String(rows[ri][ci]).trim()) dolu++; }
    if (dolu > maxDolu) { maxDolu = dolu; headerRowIdx = ri; }
  }
  if (maxDolu < 2) { window.toast?.('Baslik satiri bulunamadi', 'err'); _renderAdim1(); return; }
  _kolonlar = rows[headerRowIdx].map(function(k, i) { return String(k || '').trim() || ('Sutun_' + (i + 1)); });
  _excelData = rows.slice(headerRowIdx + 1).filter(function(r) { return r.some(function(c) { return String(c || '').trim(); }); }).map(function(r) {
    var obj = {};
    _kolonlar.forEach(function(k, i) { obj[k] = String(r[i] !== undefined ? r[i] : '').trim(); });
    return obj;
  });
  if (!_excelData.length) { window.toast?.('Veri satirlari bulunamadi', 'err'); _renderAdim1(); return; }
  _dosyaSatir = _excelData.length;
  _dosyaKolon = _kolonlar.length;
  _autoEslestir();
  /* Tek sayfa veya CSV ise dogrudan 3. adima, coklu sayfa ise zaten 2. adimda */
  _renderAdim3_Eslestir();
}

/* ══════════════════════════════════════════════════════════════
   ADIM 2 — SAYFA SEC
   ══════════════════════════════════════════════════════════════ */
function _renderAdim2_SayfaSec() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  var h = _stepBar(2);
  /* Dosya onay karti */
  h += '<div style="padding:12px 20px;background:#EAF3DE;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px">'
    + '<div style="font-size:18px">\u2705</div>'
    + '<div><div style="font-size:12px;font-weight:500;color:#085041">' + _esc(_dosyaAdi) + '</div>'
    + '<div style="font-size:10px;color:#085041">' + _formatBoyut(_dosyaBoyut) + ' \u00b7 ' + _sheetNames.length + ' sayfa</div></div>'
  + '</div>';

  h += '<div style="padding:20px 24px">';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><div style="font-size:16px">\ud83d\udccb</div><div style="font-size:13px;font-weight:500;color:var(--t)">Hangi sayfada urun listesi var? Sec ve devam et</div></div>';

  /* Sayfa secimi dropdown + arama */
  h += '<div style="position:relative;margin-bottom:16px">';
  h += '<select class="fi" id="ei-sheet-sel" onchange="event.stopPropagation();window._eiSayfaOnizle(this.value)" onclick="event.stopPropagation()" style="width:100%;font-size:13px;padding:10px 12px">';
  h += '<option value="">\u2014 Sayfa sec \u2014</option>';
  _sheetNames.forEach(function(s) {
    h += '<option value="' + _esc(s) + '">' + _esc(s) + '</option>';
  });
  h += '</select></div>';

  /* Onizleme alani */
  h += '<div id="ei-sheet-preview" style="min-height:100px"></div>';
  h += '</div>';

  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._excelImportGeri()">← Geri</button>'
    + '<button class="btn btnp" id="ei-sayfa-devam" onclick="event.stopPropagation();window._eiSayfaDevam()" disabled style="opacity:0.5">Devam \u2192</button>';
}

window._eiSayfaOnizle = function(sheetName) {
  var prev = _g('ei-sheet-preview');
  var btn = _g('ei-sayfa-devam');
  if (!prev || !sheetName || !_workbook) {
    if (prev) prev.innerHTML = '';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    return;
  }
  _selectedSheet = sheetName;
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  var ws = _workbook.Sheets[sheetName];
  var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  var previewRows = rows.slice(0, 5);
  if (!previewRows.length) { prev.innerHTML = '<div style="font-size:12px;color:var(--t3);padding:12px">Bos sayfa</div>'; return; }
  var maxCol = 0;
  previewRows.forEach(function(r) { if (r.length > maxCol) maxCol = r.length; });
  maxCol = Math.min(maxCol, 12);
  var t = '<div style="overflow-x:auto;border:1px solid var(--b);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:11px">';
  previewRows.forEach(function(r, ri) {
    t += '<tr>';
    for (var ci = 0; ci < maxCol; ci++) {
      var cell = r[ci] !== undefined ? String(r[ci]) : '';
      var bg = ri === 0 ? 'background:#E6F1FB;font-weight:600' : ri % 2 === 0 ? 'background:var(--s2)' : '';
      t += '<td style="padding:6px 10px;border:0.5px solid var(--b);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;' + bg + '">' + _esc(cell.slice(0, 40)) + '</td>';
    }
    t += '</tr>';
  });
  t += '</table></div>';
  t += '<div style="font-size:10px;color:var(--t3);margin-top:6px">' + rows.length + ' satir \u00b7 ' + maxCol + ' kolon</div>';
  prev.innerHTML = t;
};

window._eiSayfaDevam = function() {
  if (!_selectedSheet) return;
  _processSheet(_selectedSheet);
};

/* ══════════════════════════════════════════════════════════════
   OTOMATIK ESLESTIRME
   ══════════════════════════════════════════════════════════════ */
function _autoEslestir() {
  _eslestirme = {};
  var kullanilan = {};
  _kolonlar.forEach(function(k) {
    var kl = k.toLowerCase().replace(/[\s\/\(\)\-_.#]/g, '');
    for (var alan in ANAHTAR) {
      if (kullanilan[alan]) continue;
      for (var ai = 0; ai < ANAHTAR[alan].length; ai++) {
        if (kl.indexOf(ANAHTAR[alan][ai].replace(/\s/g, '')) !== -1) {
          _eslestirme[k] = alan;
          kullanilan[alan] = true;
          break;
        }
      }
      if (_eslestirme[k]) break;
    }
    if (!_eslestirme[k]) _eslestirme[k] = 'atla';
  });
}

function _eslestirmeSkor(kolonAd, sistemAlan) {
  if (sistemAlan === 'atla') return 0;
  var kl = kolonAd.toLowerCase().replace(/[\s\/\(\)\-_.#]/g, '');
  var keys = ANAHTAR[sistemAlan];
  if (!keys) return 50;
  for (var i = 0; i < keys.length; i++) {
    if (kl === keys[i]) return 100;
    if (kl.indexOf(keys[i]) !== -1) return 85 + Math.max(0, 10 - i);
  }
  return 50;
}

/* ══════════════════════════════════════════════════════════════
   ADIM 3 — KOLON ESLESTIR (core)
   ══════════════════════════════════════════════════════════════ */
function _renderAdim3_Eslestir() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  /* Eslestirme istatistikleri */
  var eslesti = 0;
  var onayBekleyen = 0;
  var eslesmedi = 0;
  _kolonlar.forEach(function(k) {
    if (k.indexOf('Sutun_') === 0) {
      var dolu = false;
      for (var si = 0; si < Math.min(5, _excelData.length); si++) { if (_excelData[si][k]) { dolu = true; break; } }
      if (!dolu) return;
    }
    var a = _eslestirme[k];
    if (a && a !== 'atla') {
      var skor = _eslestirmeSkor(k, a);
      if (skor >= 80) eslesti++;
      else onayBekleyen++;
    } else {
      eslesmedi++;
    }
  });

  /* Zorunlu alan kontrolu */
  var zorunluDurum = {};
  ZORUNLU_KOLONLAR.forEach(function(z) {
    var found = false;
    for (var kk in _eslestirme) { if (_eslestirme[kk] === z) { found = true; break; } }
    zorunluDurum[z] = found;
  });
  var zorunluEksik = ZORUNLU_KOLONLAR.filter(function(z) { return !zorunluDurum[z]; });
  var toplam = eslesti + onayBekleyen + eslesmedi;
  var skorPct = toplam > 0 ? Math.round(eslesti / toplam * 100) : 0;

  var h = _stepBar(3);

  /* Dosya bilgi bari */
  h += '<div style="padding:10px 20px;background:#E6F1FB;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;font-size:11px">';
  h += '<span style="color:#0C447C">' + _esc(_dosyaAdi) + ' \u00b7 ' + _dosyaSatir + ' satir \u00b7 ' + _dosyaKolon + ' kolon</span>';
  h += '<span style="color:#0C447C;font-weight:500">' + _esc(_selectedSheet || '') + '</span>';
  h += '</div>';

  /* Ust toolbar — skor ring + ozet */
  h += '<div style="padding:14px 20px;display:flex;align-items:center;gap:16px;border-bottom:0.5px solid var(--b)">';
  /* Skor ring */
  var ringColor = skorPct >= 80 ? '#16A34A' : skorPct >= 50 ? '#D97706' : '#DC2626';
  h += '<div style="position:relative;width:48px;height:48px;flex-shrink:0">';
  h += '<svg viewBox="0 0 36 36" style="width:48px;height:48px;transform:rotate(-90deg)">';
  h += '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--s2)" stroke-width="3"></circle>';
  h += '<circle cx="18" cy="18" r="15" fill="none" stroke="' + ringColor + '" stroke-width="3" stroke-dasharray="' + (skorPct * 0.942) + ' 94.2" stroke-linecap="round"></circle>';
  h += '</svg>';
  h += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:' + ringColor + '">%' + skorPct + '</div>';
  h += '</div>';
  /* Ozet text */
  h += '<div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">'
    + '<span style="color:#16A34A">' + eslesti + ' hazir</span> \u00b7 '
    + '<span style="color:#D97706">' + onayBekleyen + ' onay</span> \u00b7 '
    + '<span style="color:#DC2626">' + eslesmedi + ' bos</span></div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + _dosyaSatir + ' satir aktarilacak</div></div>';
  /* Butonlar */
  h += '<button class="btn btns" onclick="event.stopPropagation();window._eiSifirla()" style="font-size:10px;padding:4px 10px">\u21ba Sifirla</button>';
  h += '</div>';

  /* Rehber kutusu */
  if (onayBekleyen > 0 || zorunluEksik.length > 0) {
    var rehberBg = zorunluEksik.length > 0 ? '#FEF2F2' : '#E6F1FB';
    var rehberFg = zorunluEksik.length > 0 ? '#791F1F' : '#0C447C';
    var rehberMsg = zorunluEksik.length > 0
      ? '\u26a0 ' + zorunluEksik.length + ' zorunlu kolon eslesmedi \u2014 eslestirmeden ilerleyemezsin'
      : '\ud83d\udc46 Sadece sari satira bak ve dogru alani sec. Yesil olanlar hazir!';
    h += '<div style="padding:10px 20px;background:' + rehberBg + ';border-bottom:0.5px solid var(--b);font-size:11px;color:' + rehberFg + '">' + rehberMsg + '</div>';
  }

  /* Legend */
  h += '<div style="padding:8px 20px;border-bottom:0.5px solid var(--b);display:flex;gap:16px;font-size:10px;color:var(--t3)">';
  h += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16A34A;margin-right:4px"></span>Otomatik eslesti</span>';
  h += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#D97706;margin-right:4px"></span>Onay gerekiyor</span>';
  h += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#DC2626;margin-right:4px"></span>Eslesmedi</span>';
  h += '</div>';

  /* Her satir — 4 kolon grid */
  _kolonlar.forEach(function(k) {
    /* Bos sutunlari atla */
    if (k.indexOf('Sutun_') === 0) {
      var sutunDolu = false;
      for (var si = 0; si < Math.min(5, _excelData.length); si++) { if (_excelData[si][k]) { sutunDolu = true; break; } }
      if (!sutunDolu) return;
    }
    var secili = _eslestirme[k] || 'atla';
    var skor = secili !== 'atla' ? _eslestirmeSkor(k, secili) : 0;
    var eslesmis = secili !== 'atla' && skor >= 80;
    var onayGer = secili !== 'atla' && skor < 80;
    var bosKaldi = secili === 'atla';
    var zorunluMu = secili !== 'atla' && ZORUNLU_KOLONLAR.indexOf(secili) !== -1;
    var zorunluBosKolonMu = false;
    ZORUNLU_KOLONLAR.forEach(function(z) {
      if (!zorunluDurum[z]) {
        /* Bu kolon ismi zorunlu alanla eslesiyor olabilir */
        var kl = k.toLowerCase().replace(/[\s\/\(\)\-_.#]/g, '');
        var keys = ANAHTAR[z];
        if (keys) { for (var ki = 0; ki < keys.length; ki++) { if (kl.indexOf(keys[ki]) !== -1) zorunluBosKolonMu = true; } }
      }
    });

    /* Ornek veriler */
    var ornekler = [];
    for (var oi = 0; oi < Math.min(3, _excelData.length); oi++) {
      var ov = _excelData[oi][k];
      if (ov) ornekler.push(String(ov).slice(0, 24));
    }

    /* Satir renkleri */
    var satirBg = eslesmis ? '#F0FFF4' : onayGer ? '#FFFBEB' : zorunluBosKolonMu ? '#FEF2F2' : '';
    var skorRenk = skor >= 80 ? '#16A34A' : skor >= 50 ? '#D97706' : '#DC2626';
    var okIcon = eslesmis ? '\u2192' : onayGer ? '?' : '\u2717';
    var okColor = eslesmis ? '#16A34A' : onayGer ? '#D97706' : '#DC2626';
    var zorunluTag = zorunluMu ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FEF2F2;color:#DC2626;font-weight:500">\ud83d\udd34 Zorunlu</span>'
      : '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--s2);color:var(--t3)">\u26aa Opsiyonel</span>';

    /* Eslesmis alan icin veri tipi etiketi */
    var veriTipi = secili !== 'atla' && KOLON_TIPLER[secili] ? KOLON_TIPLER[secili] : '';

    h += '<div style="display:grid;grid-template-columns:1fr 70px 22px 1fr;gap:8px;align-items:center;padding:8px 20px;border-bottom:0.5px solid var(--b);background:' + satirBg + '">';

    /* Sol: Excel kolon adi */
    h += '<div style="min-width:0">';
    h += '<div style="font-size:12px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(k) + '</div>';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' + zorunluTag + '</div>';
    if (ornekler.length) {
      h += '<div style="font-size:10px;color:var(--t3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Ornek: ' + _esc(ornekler.join(', ')) + '</div>';
    }
    h += '</div>';

    /* Skor */
    h += '<div style="text-align:center">';
    if (secili !== 'atla') {
      h += '<div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden;margin-bottom:3px"><div style="height:100%;width:' + Math.min(skor, 100) + '%;background:' + skorRenk + ';border-radius:2px"></div></div>';
      h += '<div style="font-size:9px;color:' + skorRenk + ';font-weight:500">%' + skor + (skor >= 80 ? ' \u2713' : '') + '</div>';
    }
    h += '</div>';

    /* Ok */
    h += '<div style="text-align:center;font-size:14px;font-weight:600;color:' + okColor + '">' + okIcon + '</div>';

    /* Sag: Sistem alani dropdown + veri tipi */
    h += '<div style="min-width:0">';
    h += '<select class="fi" style="width:100%;font-size:11px;padding:6px 8px;' + (eslesmis ? 'border-color:#97C459;background:#EAF3DE' : onayGer ? 'border-color:#D97706;background:#FFFBEB' : '') + '" onchange="event.stopPropagation();window._eslGuncelle(\'' + _esc(k).replace(/'/g, "\\'") + '\',this.value);window._eiYenidenRender()" onclick="event.stopPropagation()">';
    DUAY_ALANLARI.forEach(function(a) {
      h += '<option value="' + a.v + '"' + (secili === a.v ? ' selected' : '') + '>' + _esc(a.l) + '</option>';
    });
    h += '</select>';
    if (veriTipi) {
      h += '<div style="font-size:9px;color:var(--t3);margin-top:3px">\u2192 ' + _esc(veriTipi) + '</div>';
    }
    h += '</div>';

    h += '</div>';
  });

  /* Cakisma Yonetimi kutusu */
  h += '<div style="padding:14px 20px;border-top:1px solid var(--b);background:var(--s2)">';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px;color:var(--t)">\u2699 Ayni urun kodu zaten varsa ne yapilsin?</div>';
  h += '<div style="display:flex;gap:8px">';
  [{ v: 'guncelle', l: '\u270f\ufe0f Guncelle', d: 'Mevcut kaydi yeni veri ile gunceller' },
   { v: 'atla', l: '\u23ed\ufe0f Atla', d: 'Mevcut kaydi korur, yenisini eklemez' },
   { v: 'yeni', l: '\u2795 Yeni Kayit Ac', d: 'Ikiside kalir, yeni satir olarak ekler' }
  ].forEach(function(o) {
    var aktif = _cakismaMod === o.v;
    h += '<button onclick="event.stopPropagation();window._eiCakismaSec(\'' + o.v + '\')" class="btn ' + (aktif ? 'btnp' : 'btns') + '" style="font-size:11px;padding:6px 14px" title="' + _esc(o.d) + '">' + o.l + '</button>';
  });
  h += '</div></div>';

  /* Canli onizleme — ilk 5 satir eslesmis kolonlarla */
  var eslesmisAlanlar = [];
  _kolonlar.forEach(function(k) {
    var a = _eslestirme[k];
    if (a && a !== 'atla') eslesmisAlanlar.push({ excelKol: k, sistemAlan: a });
  });
  if (eslesmisAlanlar.length > 0) {
    h += '<div style="padding:12px 20px;border-top:0.5px solid var(--b)">';
    h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:8px">Canli Onizleme (ilk 5 satir)</div>';
    h += '<div style="overflow-x:auto;border:1px solid var(--b);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:10px">';
    h += '<thead><tr>';
    eslesmisAlanlar.forEach(function(ea) {
      var alan = DUAY_ALANLARI.find(function(a) { return a.v === ea.sistemAlan; });
      var isZorunlu = ZORUNLU_KOLONLAR.indexOf(ea.sistemAlan) !== -1;
      h += '<th style="padding:6px 10px;border:0.5px solid var(--b);background:#E6F1FB;font-weight:600;white-space:nowrap;font-size:10px">' + _esc(alan ? alan.l.split('/')[0].trim() : ea.sistemAlan) + (isZorunlu ? ' *' : '') + '</th>';
    });
    h += '</tr></thead><tbody>';
    _excelData.slice(0, 5).forEach(function(row, ri) {
      h += '<tr>';
      eslesmisAlanlar.forEach(function(ea) {
        var v = row[ea.excelKol] || '';
        var bg = !v && ZORUNLU_KOLONLAR.indexOf(ea.sistemAlan) !== -1 ? 'background:#FEF2F2' : ri % 2 === 0 ? 'background:var(--s2)' : '';
        h += '<td style="padding:5px 10px;border:0.5px solid var(--b);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + bg + '">' + _esc(String(v).slice(0, 30)) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    h += '<div style="font-size:10px;color:var(--t3);margin-top:6px">' + _dosyaSatir + ' satir aktarilacak</div>';
    h += '</div>';
  }

  body.innerHTML = h;

  /* Footer — zorunlu kontrol */
  var tumZorunluEslesti = ZORUNLU_KOLONLAR.every(function(z) { return zorunluDurum[z]; });
  var devamBtn = tumZorunluEslesti
    ? '<button class="btn btnp" onclick="event.stopPropagation();window._eiAdim3Devam()">Devam \u2192</button>'
    : '<button class="btn btnp" disabled style="opacity:0.5;cursor:not-allowed" title="Zorunlu kolonlari eslestir">' + zorunluEksik.length + ' zorunlu eksik</button>';
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();' + (_sheetNames.length > 1 ? 'window._eiGeriSayfa()' : 'window._excelImportGeri()') + '">← Geri</button>' + devamBtn;
}

window._eslGuncelle = function(k, v) { _eslestirme[k] = v; };
window._eiYenidenRender = function() { _renderAdim3_Eslestir(); };
window._eiCakismaSec = function(m) { _cakismaMod = m; _renderAdim3_Eslestir(); };
window._eiSifirla = function() { _autoEslestir(); _renderAdim3_Eslestir(); };
window._eiGeriSayfa = function() { _renderAdim2_SayfaSec(); };

/* ══════════════════════════════════════════════════════════════
   ADIM 4 — AKTAR (chunk import + progress)
   ══════════════════════════════════════════════════════════════ */
window._eiAdim3Devam = function() {
  /* Dagitim secimi */
  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted; }) : [];
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];

  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  var h = _stepBar(4);
  h += '<div style="padding:20px 24px">';
  h += '<div style="font-size:14px;font-weight:600;color:var(--t);margin-bottom:16px">' + _dosyaSatir + ' satir nereye aktarilacak?</div>';

  /* Tedarikci secimi */
  h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:500;margin-bottom:6px;color:var(--t)">Tedarikci</div>'
    + '<select class="fi" id="dag-tedarikci" style="width:100%;font-size:12px;padding:8px 12px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">'
    + '<option value="">\u2014 Tedarikci Sec \u2014</option>'
    + cariList.map(function(c) { return '<option value="' + c.id + '"' + (String(c.id) === String(_tedarikciId) ? ' selected' : '') + '>' + _esc(c.name) + '</option>'; }).join('')
    + '</select></div>';

  /* Ihracat dosyasi */
  h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:500;margin-bottom:6px;color:var(--t)">Ihracat Dosyasi</div>'
    + '<select class="fi" id="dag-ihracat-dosya" style="width:100%;font-size:12px;padding:8px 12px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">'
    + '<option value="">\u2014 Dosya Sec \u2014</option>'
    + dosyalar.map(function(d) { return '<option value="' + d.id + '"' + (String(d.id) === String(_ihrDosyaId) ? ' selected' : '') + '>' + _esc(d.dosyaNo + ' \u2014 ' + (d.musteriAd || '')) + '</option>'; }).join('')
    + '</select></div>';

  /* Sablon kayit */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;padding-top:14px;border-top:1px solid var(--b)">';
  h += '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">Musteri Adi (sablon kayit)</div><input class="fi" id="ei-musteri" value="' + _esc(_musteriAd) + '" placeholder="Firma adi" style="font-size:12px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">Sablon No</div><input class="fi" id="ei-sablon-no" value="' + _esc(_sablon_no) + '" placeholder="STD-001" style="font-size:12px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '</div>';

  /* Progress alani (gizli baslangicta) */
  h += '<div id="ei-import-progress" style="display:none;margin-top:16px">';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px;color:var(--t)" id="ei-prog-text">Import ediliyor...</div>';
  h += '<div style="height:8px;background:var(--s2);border-radius:4px;overflow:hidden"><div id="ei-prog-bar" style="height:100%;width:0%;background:#185FA5;border-radius:4px;transition:width .2s"></div></div>';
  h += '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="ei-prog-detail">0 / ' + _dosyaSatir + '</div>';
  h += '</div>';

  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._eiGeriEslestir()">← Geri</button>'
    + '<button class="btn btnp" id="ei-import-btn" onclick="event.stopPropagation();window._excelImport()">Import Et (' + _dosyaSatir + ' satir) \u2192</button>';
};

window._eiGeriEslestir = function() { _renderAdim3_Eslestir(); };

/* ── IMPORT CALISTIR ─────────────────────────────────────────── */
window._excelImport = function() {
  var tedarikciId = (_g('dag-tedarikci') || {}).value;
  var ihrDosyaId = (_g('dag-ihracat-dosya') || {}).value;
  _musteriAd = (_g('ei-musteri')?.value || '').trim();
  _sablon_no = (_g('ei-sablon-no')?.value || '').trim();

  if (!ihrDosyaId) { window.toast?.('Ihracat dosyasi secmeden import yapilamaz', 'err'); return; }

  /* Disable button */
  var btn = _g('ei-import-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = 'Import ediliyor...'; }
  var progDiv = _g('ei-import-progress');
  if (progDiv) progDiv.style.display = 'block';

  /* Validate ve map */
  _gecerliSatirlar = [];
  _hataliSatirlar = [];
  _guncellenenSayisi = 0;
  _eklenenSayisi = 0;
  _atlandiSayisi = 0;
  var cu = _cu();

  _excelData.forEach(function(satir, i) {
    var mapped = {};
    var hata = null;
    var hataKolon = '';
    _kolonlar.forEach(function(k) {
      var alan = _eslestirme[k];
      if (alan && alan !== 'atla') mapped[alan] = satir[k];
    });

    /* Zorunlu kontrol */
    ZORUNLU_KOLONLAR.forEach(function(z) {
      if (!hata && (!mapped[z] || !String(mapped[z]).trim())) {
        hata = 'zorunlu_bos';
        hataKolon = z;
      }
    });

    /* Sayi kontrolleri */
    if (!hata && mapped.birim_fiyat && isNaN(parseFloat(mapped.birim_fiyat))) { hata = 'sayi_bekleniyor'; hataKolon = 'birim_fiyat'; }
    if (!hata && mapped.miktar && isNaN(parseFloat(mapped.miktar))) { hata = 'sayi_bekleniyor'; hataKolon = 'miktar'; }
    if (!hata && mapped.koli_adet && isNaN(parseInt(mapped.koli_adet))) { hata = 'sayi_bekleniyor'; hataKolon = 'koli_adet'; }

    /* Uzunluk kontrol */
    if (!hata && mapped.aciklama && String(mapped.aciklama).length > 500) { hata = 'cok_uzun'; hataKolon = 'aciklama'; }

    if (hata) {
      _hataliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir, hata: hata, hataKolon: hataKolon });
    } else {
      _gecerliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir });
    }
  });

  /* Chunk import */
  var mevcutU = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var tedCari = typeof window.loadCari === 'function' ? window.loadCari() : [];
  var tedarikci = null;
  tedCari.forEach(function(c) { if (String(c.id) === String(tedarikciId)) tedarikci = c; });

  function importChunk(offset) {
    var chunk = _gecerliSatirlar.slice(offset, offset + 200);
    chunk.forEach(function(s) {
      var m = s.mapped;
      if (!m.tedarikci && tedarikci) m.tedarikci = tedarikci.name;

      var dup = m.urun_kodu ? mevcutU.find(function(x) { return !x.isDeleted && x.urun_kodu === m.urun_kodu && String(x.dosya_id) === String(ihrDosyaId); }) : null;

      if (dup && _cakismaMod === 'guncelle') {
        Object.keys(m).forEach(function(k) { if (m[k]) dup[k] = m[k]; });
        dup.updatedAt = _now();
        _guncellenenSayisi++;
      } else if (dup && _cakismaMod === 'atla') {
        _atlandiSayisi++;
      } else {
        mevcutU.unshift({
          id: _genId(),
          dosya_id: ihrDosyaId,
          aciklama: m.aciklama || '',
          standart_urun_adi: m.standart_urun_adi || m.aciklama || '',
          urun_kodu: m.urun_kodu || '',
          hs_kodu: m.hs_kodu || '',
          kdv_orani: m.kdv_orani || '',
          miktar: parseFloat(m.miktar || 0),
          birim: m.birim || 'PCS',
          birim_fiyat: parseFloat(m.birim_fiyat || 0),
          doviz: m.doviz || 'USD',
          brut_kg: parseFloat(m.brut_kg || 0),
          net_kg: parseFloat(m.net_kg || 0),
          hacim_m3: parseFloat(m.hacim_m3 || 0),
          koli_adet: parseInt(m.koli_adet || 0),
          mense_ulke: m.mense_ulke || '',
          tedarikci_id: tedarikciId || '',
          tedarikciAd: m.tedarikci || '',
          gumrukcu_tanim: m.gumrukcu_tanim || '',
          fatura_urun_adi: m.fatura_urun_adi || '',
          satici_urun_adi: m.satici_urun_adi || '',
          satici_urun_kodu: m.satici_urun_kodu || '',
          marka: m.marka || '',
          konteyner_sira: m.konteyner_sira || '',
          etiket_rengi: m.etiket_rengi || '',
          siparis_no: m.siparis_no || '',
          kaynak: 'excel_import_v4',
          createdAt: _now(),
          createdBy: cu?.id
        });
        _eklenenSayisi++;
      }
    });

    var processed = Math.min(offset + 200, _gecerliSatirlar.length);
    var pct = Math.round(processed / _gecerliSatirlar.length * 100);
    var bar = _g('ei-prog-bar');
    var detail = _g('ei-prog-detail');
    var text = _g('ei-prog-text');
    if (bar) bar.style.width = pct + '%';
    if (detail) detail.textContent = processed + ' / ' + _gecerliSatirlar.length;
    if (text) text.textContent = 'Import ediliyor... %' + pct;

    if (offset + 200 < _gecerliSatirlar.length) {
      setTimeout(function() { importChunk(offset + 200); }, 0);
    } else {
      /* Bitir */
      window.storeIhracatUrunler?.(mevcutU);
      _renderRapor();
    }
  }

  if (_gecerliSatirlar.length > 0) {
    importChunk(0);
  } else {
    _renderRapor();
  }
};

/* ══════════════════════════════════════════════════════════════
   IMPORT RAPORU
   ══════════════════════════════════════════════════════════════ */
function _renderRapor() {
  var body = _g('excel-import-body');
  var footer = _g('excel-import-footer');
  if (!body) return;

  var h = '<div style="padding:24px">';

  /* Baslik */
  h += '<div style="text-align:center;margin-bottom:20px">';
  h += '<div style="font-size:36px;margin-bottom:8px">\u2705</div>';
  h += '<div style="font-size:16px;font-weight:600;color:var(--t)">Import Tamamlandi</div>';
  h += '</div>';

  /* 4 kart */
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">';
  h += _raporKart(_eklenenSayisi, 'Eklendi', '#16A34A', '#EAF3DE');
  h += _raporKart(_guncellenenSayisi, 'Guncellendi', '#D97706', '#FFFBEB');
  h += _raporKart(_hataliSatirlar.length, 'Hatali', '#DC2626', '#FEF2F2');
  h += _raporKart(_atlandiSayisi, 'Atlandi', '#6B7280', '#F3F4F6');
  h += '</div>';

  /* Hatali satirlar listesi */
  if (_hataliSatirlar.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:10px">Hatali Satirlar</div>';
    _hataliSatirlar.slice(0, 20).forEach(function(s) {
      var aciklama = HATA_ACIKLAMALARI[s.hata] || s.hata;
      var alanDef = DUAY_ALANLARI.find(function(a) { return a.v === s.hataKolon; });
      var alanAd = alanDef ? alanDef.l.split('/')[0].trim() : (s.hataKolon || '');
      h += '<div style="display:flex;gap:10px;padding:10px 14px;border:1px solid #FECACA;border-radius:8px;margin-bottom:6px;background:#FEF2F2">';
      h += '<div style="flex-shrink:0;font-size:11px;font-weight:600;color:#DC2626;min-width:50px">Satir ' + s.satir + '</div>';
      h += '<div style="flex:1;min-width:0">';
      if (alanAd) h += '<div style="font-size:11px;font-weight:500;color:#991B1B">' + _esc(alanAd) + '</div>';
      h += '<div style="font-size:11px;color:#7F1D1D">' + _esc(aciklama) + '</div>';
      h += '</div></div>';
    });
    if (_hataliSatirlar.length > 20) {
      h += '<div style="font-size:10px;color:var(--t3);margin-top:4px">... ve ' + (_hataliSatirlar.length - 20) + ' hatali satir daha</div>';
    }
    h += '</div>';
  }

  /* Sablon kaydet */
  if (_musteriAd || _sablon_no) {
    h += '<div style="padding:12px 16px;background:var(--s2);border-radius:8px;margin-bottom:16px">';
    h += '<div style="font-size:12px;font-weight:500;margin-bottom:6px;color:var(--t)">Sablonu Kaydet</div>';
    h += '<div style="font-size:11px;color:var(--t3);margin-bottom:8px">' + _esc(_musteriAd) + (_sablon_no ? ' \u2014 ' + _esc(_sablon_no) : '') + '</div>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._eiSablonKaydet()" style="font-size:11px">Bu Sablonu Kaydet</button>';
    h += '</div>';
  }

  h += '</div>';

  body.innerHTML = h;

  var footerBtns = '';
  if (_hataliSatirlar.length > 0) {
    footerBtns += '<button class="btn btns" onclick="event.stopPropagation();window._excelHataliIndir()" style="font-size:11px;color:#DC2626">\u2b07 Hatalilari Excel\'e Aktar</button>';
  }
  footerBtns += '<button class="btn btnp" onclick="event.stopPropagation();document.getElementById(\'mo-excel-import\')?.remove();window.App?.nav?.(\'ihracat-ops\')">Urunlere Git \u2192</button>';
  footer.innerHTML = footerBtns;

  window.toast?.('Import: ' + _eklenenSayisi + ' eklendi, ' + _guncellenenSayisi + ' guncellendi', 'ok');
  window.logActivity?.('import', 'Excel import V4: ' + _eklenenSayisi + ' eklendi, ' + _guncellenenSayisi + ' guncellendi, ' + _atlandiSayisi + ' atlandi, ' + _hataliSatirlar.length + ' hata');
}

function _raporKart(sayi, label, renk, bg) {
  return '<div style="background:' + bg + ';border-radius:10px;padding:16px;text-align:center">'
    + '<div style="font-size:28px;font-weight:700;color:' + renk + '">' + sayi + '</div>'
    + '<div style="font-size:11px;color:' + renk + ';margin-top:4px">' + label + '</div>'
  + '</div>';
}

/* ══════════════════════════════════════════════════════════════
   HATALI SATIR INDIR
   ══════════════════════════════════════════════════════════════ */
window._excelHataliIndir = function() {
  if (!_hataliSatirlar.length || typeof XLSX === 'undefined') return;
  var headers = Object.keys(_hataliSatirlar[0].mapped).concat(['SATIR_NO', 'HATA_KOLON', 'HATA', 'COZUM']);
  var rows = _hataliSatirlar.map(function(s) {
    var r = [];
    headers.forEach(function(h2) {
      if (h2 === 'SATIR_NO') r.push(s.satir);
      else if (h2 === 'HATA_KOLON') r.push(s.hataKolon || '');
      else if (h2 === 'HATA') r.push(s.hata || '');
      else if (h2 === 'COZUM') r.push(HATA_ACIKLAMALARI[s.hata] || '');
      else r.push(s.mapped[h2] || '');
    });
    return r;
  });
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hatali');
  XLSX.writeFile(wb, 'hatali_satirlar_' + _today() + '.xlsx');
  window.toast?.('Hatali satirlar indirildi', 'ok');
};

/* ══════════════════════════════════════════════════════════════
   SABLON INDIR
   ══════════════════════════════════════════════════════════════ */
/**
 * Hazir bos Excel sablonu indirir.
 * Zorunlu kolonlar kirmizi baslik, opsiyoneller gri.
 * 2. satir: ornek veri, 3. satir: aciklama
 */
window._ihrExcelSablonIndir = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kutuphanesi yuklu degil', 'err'); return; }

  var kolonlar = DUAY_ALANLARI.filter(function(a) { return a.v !== 'atla'; });
  var basliklar = kolonlar.map(function(a) { return a.l; });
  var ornekVeri = {
    aciklama: 'LED Downlight 20W',
    urun_kodu: 'LV-TRA367F',
    birim_fiyat: '12.50',
    doviz: 'USD',
    koli_adet: '200',
    hs_kodu: '9405.42.00',
    miktar: '4000',
    birim: 'PCS',
    toplam_fiyat: '50000',
    brut_kg: '3600',
    net_kg: '3200',
    hacim_m3: '18.5',
    mense_ulke: 'TR',
    marka: 'Ledvance'
  };
  var ornekSatir = kolonlar.map(function(a) { return ornekVeri[a.v] || ''; });
  var aciklamaSatir = kolonlar.map(function(a) {
    var zor = a.zorunlu ? 'ZORUNLU' : 'Opsiyonel';
    var tip = KOLON_TIPLER[a.v] || 'Metin';
    return zor + ' \u2014 ' + tip;
  });

  var ws = XLSX.utils.aoa_to_sheet([basliklar, ornekSatir, aciklamaSatir]);

  /* Kolon genislikleri */
  ws['!cols'] = kolonlar.map(function() { return { wch: 22 }; });

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Sablonu');
  XLSX.writeFile(wb, 'duay_import_sablonu_' + _today() + '.xlsx');
  window.toast?.('Sablon indirildi', 'ok');
};

/* ══════════════════════════════════════════════════════════════
   SABLON KAYDET
   ══════════════════════════════════════════════════════════════ */
window._eiSablonKaydet = function() {
  var tpl = _loadTpl();
  tpl.unshift({
    ad: _musteriAd || _dosyaAdi,
    musteriAd: _musteriAd,
    sablon_no: _sablon_no,
    kolonlar: _kolonlar.slice(),
    eslestirme: Object.assign({}, _eslestirme),
    cakismaMod: _cakismaMod,
    createdAt: _now()
  });
  _storeTpl(tpl);
  window.toast?.('Sablon kaydedildi', 'ok');
};

/* ══════════════════════════════════════════════════════════════
   YARDIMCI
   ══════════════════════════════════════════════════════════════ */
window._excelImportGeri = function() { _renderAdim1(); };

function _formatBoyut(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ── Window Exports ──────────────────────────────────────────── */
window.excelImportAc = window.excelImportAc;
window._excelDosyaSecildi = window._excelDosyaSecildi;
window._eslGuncelle = window._eslGuncelle;
window._eiYenidenRender = window._eiYenidenRender;
window._eiCakismaSec = window._eiCakismaSec;
window._eiSifirla = window._eiSifirla;
window._eiSayfaOnizle = window._eiSayfaOnizle;
window._eiSayfaDevam = window._eiSayfaDevam;
window._eiAdim3Devam = window._eiAdim3Devam;
window._eiGeriEslestir = window._eiGeriEslestir;
window._eiGeriSayfa = window._eiGeriSayfa;
window._excelImport = window._excelImport;
window._excelHataliIndir = window._excelHataliIndir;
window._excelImportGeri = window._excelImportGeri;
window._ihrExcelSablonIndir = window._ihrExcelSablonIndir;
window._eiSablonKaydet = window._eiSablonKaydet;

})();
