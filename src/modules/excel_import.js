/**
 * src/modules/excel_import.js — v2.0.0
 * Excel Import V2 — 6 adim: Yukle → Sablon → Eslestir → Sabit Deger → Onizleme → Sonuc
 * Renk kodlu eslestirme, musteri sablonu, duplicate tespiti, hatali satir indirme
 */
(function ExcelImportModule() {
'use strict';

var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || ''); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };

var _loadTpl = function() { try { return JSON.parse(localStorage.getItem('ak_excel_tpl1') || '[]'); } catch (e) { return []; } };
var _storeTpl = function(d) { try { localStorage.setItem('ak_excel_tpl1', JSON.stringify(d.slice(0, 30))); } catch (e) {} };

// State
var _excelData = [], _kolonlar = [], _eslestirme = {}, _gecerliSatirlar = [], _hataliSatirlar = [];
var _sabitDegerler = {};
var _duplikaDavranis = 'tut';
var _guncellenenSayisi = 0, _eklenenSayisi = 0, _atlandiSayisi = 0;
var _musteriAd = '', _sablon_no = '';
var _dosyaAdi = '', _dosyaSatir = 0, _dosyaKolon = 0;

var DUAY_ALANLARI = [
  { v:'aciklama',          l:'Product Description / Urun Aciklamasi',   zorunlu:true },
  { v:'urun_kodu',         l:'Item Code / Urun Kodu',                   zorunlu:false },
  { v:'hs_kodu',           l:'HS Code / GTIP Kodu',                     zorunlu:false, uyari:true },
  { v:'miktar',            l:'Quantity / Miktar',                        zorunlu:false },
  { v:'miktar_koli',       l:'Qty per Carton / Koli Basi Adet',         zorunlu:false },
  { v:'birim',             l:'Unit / Birim',                             zorunlu:false },
  { v:'birim_fiyat',       l:'Unit Price / Birim Fiyat',                zorunlu:false, uyari:true },
  { v:'toplam_fiyat',      l:'Total Amount / Toplam Tutar',             zorunlu:false },
  { v:'doviz',             l:'Currency / Para Birimi',                   zorunlu:false },
  { v:'tedarikci',         l:'Supplier / Tedarikci',                    zorunlu:false },
  { v:'brut_kg_koli',      l:'Gross KG per Carton',                     zorunlu:false },
  { v:'net_kg_koli',       l:'Net KG per Carton',                       zorunlu:false },
  { v:'brut_kg',           l:'Total Gross KG',                          zorunlu:false },
  { v:'net_kg',            l:'Total Net KG',                            zorunlu:false },
  { v:'hacim_m3_koli',     l:'CBM per Carton',                          zorunlu:false },
  { v:'hacim_m3',          l:'Total CBM / m3',                          zorunlu:false },
  { v:'koli_adet',         l:'Carton Qty / Koli Adedi',                 zorunlu:false },
  { v:'mense_ulke',        l:'Country of Origin / Mense',               zorunlu:false },
  { v:'etiket_rengi',      l:'Label Color / Etiket',                    zorunlu:false },
  { v:'konteyner_sira',    l:'Loading Order / Konteyner Sirasi',        zorunlu:false },
  { v:'siparis_no',        l:'Order No / Siparis No',                   zorunlu:false },
  { v:'marka',             l:'Brand / Marka',                           zorunlu:false },
  { v:'standart_urun_adi', l:'Standard Name (EN) / CI-PL Adi',         zorunlu:false },
  { v:'fatura_urun_adi',   l:'Invoice Name / Fatura Adi',               zorunlu:false },
  { v:'gumrukcu_tanim',    l:'Customs Description / Gumrukcu Tanim',    zorunlu:false },
  { v:'teknik_aciklama',   l:'Technical Description',                   zorunlu:false },
  { v:'satici_urun_adi',   l:'Supplier Product Name',                   zorunlu:false },
  { v:'satici_urun_kodu',  l:'Supplier Product Code',                   zorunlu:false },
  { v:'benzer_urun_kodu',  l:'Similar Product Code',                    zorunlu:false },
  { v:'alis_fatura_no',    l:'Purchase Invoice No',                     zorunlu:false },
  { v:'dib',               l:'DIB (H/E)',                               zorunlu:false },
  { v:'dilli_urun',        l:'Multi-lang Product (H/E)',                zorunlu:false },
  { v:'imo_urun',          l:'IMO Product (H/E)',                       zorunlu:false },
  { v:'kdv_orani',         l:'KDV% / VAT Rate',                        zorunlu:false },
  { v:'atla',              l:'— Atla / Skip —',                         zorunlu:false },
];

var ANAHTAR = {
  aciklama:['description','descriptionofgoods','productdescription','productname','goodsdescription','urun','aciklama','tanim','goods','itemname','product','name'],
  urun_kodu:['itemcode','itemno','productcode','articleno','article','sku','ref','partnumber','kod','urunkodu','part','code','no'],
  hs_kodu:['hs','hscode','hstariff','tariff','tariffcode','gtip','gumruk','customscode','harmonized','commodity'],
  miktar:['totalqty','totalquantity','totalpieces','totalpcs','qty','quantity','miktar','adet','pcs','pieces'],
  miktar_koli:['qtypercarton','pcspercarton','pcsinctn','pcsinone','pcsperbox','kolibasi','quantitypercarton'],
  birim:['unit','unitofmeasure','uom','birim'],
  birim_fiyat:['unitprice','pricepcs','priceper','price','fiyat','birimfiyat','cost','unitcost','rate'],
  toplam_fiyat:['totalamount','totalvalue','totalprice','toplamtutar','toplamfiyat'],
  doviz:['currency','cur','doviz','curr'],
  tedarikci:['supplier','vendor','manufacturer','tedarikci','uretici','factory','maker'],
  brut_kg:['totalgrosskg','totalgrossweight','grossweighttotal','totalbrut','brutkg'],
  net_kg:['totalnetkg','totalnetweight','netweighttotal','totalnet','netkg'],
  hacim_m3:['totalcbm','totalvolume','cbmtotal','cbm','volume','hacim','m3'],
  koli_adet:['cartonqty','totalcartons','numberofcartons','ctn','ctns','cartons','boxes','koliadet'],
  mense_ulke:['countryoforigin','origin','coo','mense','country'],
  etiket_rengi:['color','colour','labelcolor','etiket','renk'],
  konteyner_sira:['loadingorder','loadingsequence','containerorder','sira'],
  siparis_no:['orderno','ordernum','po','ponumber','purchaseorder','siparis'],
  marka:['brand','trademark','marka'],
  standart_urun_adi:['standardname','ciname','plname','englishname','stdname'],
  fatura_urun_adi:['invoicename','invoicedesc','faturaurun'],
  gumrukcu_tanim:['customsdesc','customsname','gumrukcutanim'],
  satici_urun_kodu:['supplierprodcode','vendorcode','saticiurunkodu'],
  hs_kodu:['hs','hscode','hstariff','gtip','gumruk','customscode','harmonized'],
  kdv_orani:['vatrate','kdv','vat','taxrate'],
};

// ══ STEP BAR ══════════════════════════════════════════════════
function _stepBar(aktif) {
  var adimlar = ['Yukle','Sablon','Eslestir','Sabit Deger','Onizleme','Sonuc'];
  return '<div style="display:flex;align-items:center;gap:4px;padding:10px 20px;border-bottom:0.5px solid var(--b);background:var(--s2)">' + adimlar.map(function(a, i) {
    var n=i+1; var ok=n<aktif; var on=n===aktif;
    return '<div style="display:flex;align-items:center;gap:4px"><div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;background:'+(ok?'#EAF3DE':on?'#185FA5':'var(--s2)')+';color:'+(ok?'#27500A':on?'#fff':'var(--t3)')+'">'+(ok?'✓':n)+'</div><span style="font-size:11px;color:'+(on?'#185FA5':'var(--t3)')+';font-weight:'+(on?'500':'400')+'">'+a+'</span>'+(i<5?'<span style="color:var(--t3);margin:0 2px;font-size:9px">→</span>':'')+'</div>';
  }).join('') + '</div>';
}

// ══ ADIM 1 — YUKLE ═══════════════════════════════════════════
window.excelImportAc = function() {
  var old = _g('mo-excel-import'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-excel-import';
  mo.innerHTML = '<div class="moc" style="max-width:960px;width:95vw;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column"><div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><div style="font-size:14px;font-weight:600">Excel Import V2</div><button onclick="document.getElementById(\'mo-excel-import\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div><div id="excel-import-body" style="flex:1;overflow-y:auto;min-height:300px"></div><div id="excel-import-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0"></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
  _renderAdim1();
};

function _renderAdim1() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  body.innerHTML = _stepBar(1) + '<div style="padding:32px 24px;text-align:center"><div style="width:56px;height:56px;border:1.5px dashed var(--bm);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px" onclick="document.getElementById(\'excel-file-input\')?.click()">📥</div><div style="font-size:14px;font-weight:500;margin-bottom:6px">Dosya Sec</div><div style="font-size:12px;color:var(--t3);margin-bottom:8px">.xlsx · .csv · .jpg · .png · .pdf · .tiff</div><div style="font-size:10px;color:var(--t3);margin-bottom:16px;background:var(--s2);display:inline-block;padding:4px 12px;border-radius:6px">Gorsel/PDF yuklerseniz icerik otomatik okunur (Claude Vision)</div><input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png,.tiff,.tif,.pdf" style="display:none" onchange="window._excelDosyaSecildi(this)"><button class="btn btnp" onclick="document.getElementById(\'excel-file-input\')?.click()">Dosya Sec</button></div>';
  footer.innerHTML = '<button class="btn btns" onclick="document.getElementById(\'mo-excel-import\')?.remove()">Iptal</button>';
}

window._excelDosyaSecildi = function(input) {
  var file = input.files[0]; if (!file) return;
  _dosyaAdi = file.name;
  var body = _g('excel-import-body'); if (!body) return;
  var ext = file.name.split('.').pop().toLowerCase();
  var imageExts = ['jpg','jpeg','png','tiff','tif','pdf'];
  if (imageExts.indexOf(ext) !== -1) {
    body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:12px">🔍</div>Gorsel okunuyor, urun verileri cikariliyor...<div style="font-size:10px;color:var(--t3);margin-top:8px">Claude Vision API kullaniliyor</div></div>';
    _processImageFile(file);
    return;
  }
  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t2)">Dosya okunuyor...</div>';
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (ext === 'csv') { _parseCSV(e.target.result); }
      else if (typeof XLSX !== 'undefined') { var wb = XLSX.read(e.target.result, { type:'array' }); var ws = wb.Sheets[wb.SheetNames[0]]; _processRawData(XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })); }
      else { _parseCSV(new TextDecoder().decode(e.target.result)); }
    } catch (err) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626">' + _esc(err.message) + '</div>'; }
  };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8'); else reader.readAsArrayBuffer(file);
};

// ══ OCR — Gorsel/PDF'den urun verisi cikarma ═════════════════
function _processImageFile(file) {
  var body = _g('excel-import-body');
  var reader = new FileReader();
  reader.onload = function(ev) {
    var b64Full = ev.target.result;
    var b64Data = b64Full.split(',')[1] || b64Full;
    var mediaType = file.type || 'image/jpeg';
    // API key — btoa ile sifreli saklanir
    var _storedKey = localStorage.getItem('ak_anthropic_key');
    var apiKey = _storedKey ? (function() { try { return atob(_storedKey); } catch(e) { return _storedKey; } })() : '';
    if (!apiKey) apiKey = window.__ANTHROPIC_KEY || '';
    if (!apiKey) {
      // API key yoksa kullanicidan iste
      if (body) body.innerHTML = '<div style="padding:24px;text-align:center">'
        + '<div style="font-size:13px;font-weight:500;margin-bottom:12px">Anthropic API Key Gerekli</div>'
        + '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">Gorsel okuma icin Claude Vision API kullanilir. API key\'inizi girin:</div>'
        + '<input class="fi" id="ei-api-key" placeholder="sk-ant-..." style="width:100%;max-width:400px;margin-bottom:12px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()">'
        + '<div style="display:flex;gap:8px;justify-content:center">'
        + '<button class="btn btns" onclick="window._excelImportGeri()">Iptal</button>'
        + '<button class="btn btnp" onclick="event.stopPropagation();var k=document.getElementById(\'ei-api-key\')?.value;if(k){localStorage.setItem(\'ak_anthropic_key\',k);window._excelDosyaSecildi(document.getElementById(\'excel-file-input\'));}">Kaydet ve Devam</button>'
        + '</div></div>';
      return;
    }

    var prompt = 'Bu belgeden urun listesini cikar. Her urun icin su alanlari bul: urun adi/aciklamasi, urun kodu, miktar, birim, birim fiyat, para birimi, HS kodu, brut kg, koli adedi. JSON array formatinda ver: [{"aciklama":"...","urun_kodu":"...","miktar":0,"birim":"PCS","birim_fiyat":0,"doviz":"USD","hs_kodu":"...","brut_kg":0,"koli_adet":0}]. Bulamazsan bos birak. Sadece JSON ver, baska bir sey yazma.';

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      try {
        var text = data.content && data.content[0] ? data.content[0].text : '';
        // JSON parse — bazen markdown code block icinde olabilir
        var jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        var urunler = JSON.parse(jsonStr);
        if (!Array.isArray(urunler) || !urunler.length) { throw new Error('Urun bulunamadi'); }
        // _excelData ve _kolonlar'i doldur
        _kolonlar = Object.keys(urunler[0]);
        _excelData = urunler.map(function(u) {
          var obj = {};
          _kolonlar.forEach(function(k) { obj[k] = String(u[k] || ''); });
          return obj;
        });
        _dosyaSatir = _excelData.length;
        _dosyaKolon = _kolonlar.length;
        // Otomatik eslestirme — alan adlari zaten Duay formati
        _eslestirme = {};
        _kolonlar.forEach(function(k) {
          var duayAlan = DUAY_ALANLARI.find(function(a) { return a.v === k; });
          _eslestirme[k] = duayAlan ? k : 'atla';
        });
        window.toast?.(_excelData.length + ' urun okundu (Vision)', 'ok');
        _renderAdim1B();
      } catch(parseErr) {
        if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:#DC2626">'
          + '<div style="font-size:13px;font-weight:500;margin-bottom:8px">Gorsel okunamadi</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">' + _esc(parseErr.message) + '</div>'
          + '<div style="font-size:10px;color:var(--t3);background:var(--s2);padding:8px;border-radius:6px;text-align:left;max-height:150px;overflow-y:auto">' + _esc(text || JSON.stringify(data)) + '</div>'
          + '<button class="btn btns" onclick="window._excelImportGeri()" style="margin-top:12px">← Geri</button></div>';
      }
    })
    .catch(function(err) {
      if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:#DC2626">'
        + '<div style="font-size:13px;font-weight:500;margin-bottom:8px">API Hatasi</div>'
        + '<div style="font-size:11px;margin-bottom:12px">' + _esc(err.message) + '</div>'
        + '<button class="btn btns" onclick="window._excelImportGeri()" style="margin-top:8px">← Geri</button></div>';
    });
  };
  reader.readAsDataURL(file);
}

function _parseCSV(text) { var lines = text.split('\n').filter(function(l) { return l.trim(); }); _processRawData(lines.map(function(l) { return l.split(/[,;\t]/).map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); })); }

function _processRawData(rows) {
  if (!rows || rows.length < 2) { window.toast?.('Dosyada veri bulunamadi', 'err'); return; }
  var headerRowIdx = 0, maxDolu = 0;
  for (var ri = 0; ri < Math.min(10, rows.length); ri++) { var dolu = 0; for (var ci = 0; ci < rows[ri].length; ci++) { if (String(rows[ri][ci]).trim()) dolu++; } if (dolu > maxDolu) { maxDolu = dolu; headerRowIdx = ri; } }
  if (maxDolu < 2) { window.toast?.('Baslik satiri bulunamadi', 'err'); return; }
  _kolonlar = rows[headerRowIdx].map(function(k, i) { return String(k || '').trim() || ('Sutun_' + (i + 1)); });
  _excelData = rows.slice(headerRowIdx + 1).filter(function(r) { return r.some(function(c) { return String(c || '').trim(); }); }).map(function(r) { var obj = {}; _kolonlar.forEach(function(k, i) { obj[k] = String(r[i] || '').trim(); }); return obj; });
  if (!_excelData.length) { window.toast?.('Veri satirlari bulunamadi', 'err'); return; }
  _dosyaSatir = _excelData.length; _dosyaKolon = _kolonlar.length;
  _autoEslestir();
  _renderAdim1B(); // Sablon adimi
}

function _autoEslestir() {
  _eslestirme = {}; var kullanilan = {};
  _kolonlar.forEach(function(k) {
    var kl = k.toLowerCase().replace(/[\s\/\(\)]/g, '');
    for (var alan in ANAHTAR) { if (kullanilan[alan]) continue; for (var ai = 0; ai < ANAHTAR[alan].length; ai++) { if (kl.indexOf(ANAHTAR[alan][ai].replace(/\s/g, '')) !== -1) { _eslestirme[k] = alan; kullanilan[alan] = true; break; } } if (_eslestirme[k]) break; }
    if (!_eslestirme[k]) _eslestirme[k] = 'atla';
  });
}

// ══ ADIM 1B — SABLON ═════════════════════════════════════════
function _renderAdim1B() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var templates = _loadTpl();
  var h = _stepBar(2);
  h += '<div style="padding:12px 20px;background:#E6F1FB;border-bottom:1px solid var(--b);font-size:11px;color:#0C447C">' + _esc(_dosyaAdi) + ' · ' + _dosyaSatir + ' satir · ' + _dosyaKolon + ' kolon</div>';
  h += '<div style="padding:16px 20px">';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px">Kayitli Sablon Sec</div>';
  h += '<select class="fi" id="ei-tpl-sec" onchange="event.stopPropagation();window._eiTplSec(this.value)" onclick="event.stopPropagation()" style="width:100%;margin-bottom:12px"><option value="">— Sablon kullanma, elle eslestir —</option>';
  templates.forEach(function(t, i) { h += '<option value="' + i + '">' + _esc(t.ad || '?') + (t.musteriAd ? ' — ' + _esc(t.musteriAd) : '') + (t.sablon_no ? ' (' + _esc(t.sablon_no) + ')' : '') + (t.createdAt ? ' · ' + t.createdAt.slice(0, 10) : '') + '</option>'; });
  h += '</select>';
  h += '<div id="ei-tpl-info"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">';
  h += '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">Musteri Adi</div><input class="fi" id="ei-musteri" value="' + _esc(_musteriAd) + '" placeholder="Firma adi" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '<div><div style="font-size:11px;color:var(--t3);margin-bottom:4px">Sablon No</div><input class="fi" id="ei-sablon-no" value="' + _esc(_sablon_no) + '" placeholder="STD-001" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '</div></div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._excelImportGeri()">← Geri</button><button class="btn btnp" onclick="window._eiAdim1BDevam()">Devam →</button>';
}

window._eiTplSec = function(idx) {
  var info = _g('ei-tpl-info'); if (!info) return;
  if (idx === '') { info.innerHTML = ''; return; }
  var t = _loadTpl()[parseInt(idx)]; if (!t) return;
  if (t.eslestirme) { for (var ek in t.eslestirme) _eslestirme[ek] = t.eslestirme[ek]; }
  if (t.sabit_degerler) _sabitDegerler = Object.assign({}, t.sabit_degerler);
  if (t.musteriAd) { var mi = _g('ei-musteri'); if (mi) mi.value = t.musteriAd; }
  if (t.sablon_no) { var si = _g('ei-sablon-no'); if (si) si.value = t.sablon_no; }
  info.innerHTML = '<div style="background:#EAF3DE;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:11px;color:#085041">"' + _esc(t.ad) + '" sablonu uygulandi — eslestirme ve sabit degerler yuklendi</div>';
};

window._eiAdim1BDevam = function() {
  _musteriAd = (_g('ei-musteri')?.value || '').trim();
  _sablon_no = (_g('ei-sablon-no')?.value || '').trim();
  _renderAdim2();
};

// ══ ADIM 2 — ESLESTIRME (renk kodlu) ════════════════════════
function _renderAdim2() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var eslesti = 0, zorunluEksik = 0, uyariSay = 0;
  _kolonlar.forEach(function(k) { var a = _eslestirme[k]; if (a && a !== 'atla') eslesti++; });
  DUAY_ALANLARI.filter(function(a) { return a.zorunlu; }).forEach(function(a) { var found = false; for (var k in _eslestirme) { if (_eslestirme[k] === a.v) found = true; } if (!found) zorunluEksik++; });
  DUAY_ALANLARI.filter(function(a) { return a.uyari; }).forEach(function(a) { var found = false; for (var k in _eslestirme) { if (_eslestirme[k] === a.v) found = true; } if (!found) uyariSay++; });

  var h = _stepBar(3);
  h += '<div style="padding:8px 20px;background:var(--s2);border-bottom:0.5px solid var(--b);font-size:10px;display:flex;gap:12px">';
  h += '<span style="color:#085041">' + eslesti + '/' + _kolonlar.length + ' eslesti</span>';
  if (zorunluEksik) h += '<span style="color:#DC2626">' + zorunluEksik + ' zorunlu eksik</span>';
  if (uyariSay) h += '<span style="color:#D97706">' + uyariSay + ' uyari</span>';
  h += '</div>';

  _kolonlar.forEach(function(k) {
    if (k.indexOf('Sutun_') === 0) { var sutunDolu = false; for (var si = 0; si < Math.min(5, _excelData.length); si++) { if (_excelData[si][k]) { sutunDolu = true; break; } } if (!sutunDolu) return; }
    var secili = _eslestirme[k] || 'atla';
    var alanDef = DUAY_ALANLARI.find(function(a) { return a.v === secili; });
    var eslesmis = secili !== 'atla';
    var zorExk = alanDef && alanDef.zorunlu && !eslesmis;
    var uyarExk = alanDef && alanDef.uyari && !eslesmis;
    var bg = eslesmis ? '#EAF3DE' : zorExk ? '#FFE0E0' : uyarExk ? '#FEF9C3' : '#FAEEDA';
    var fg = eslesmis ? '#085041' : zorExk ? '#A32D2D' : uyarExk ? '#854F0B' : '#633806';
    var ornekler = []; for (var oi = 0; oi < Math.min(3, _excelData.length); oi++) { var ov = _excelData[oi][k]; if (ov) ornekler.push(String(ov).slice(0, 20)); }
    h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 20px;border-bottom:0.5px solid var(--b);font-size:11px">';
    h += '<span style="flex:0 0 180px;font-family:monospace;font-size:10px;padding:3px 6px;border-radius:4px;background:' + bg + ';color:' + fg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(k) + '</span>';
    h += '<span style="color:var(--t3)">→</span>';
    h += '<select class="fi" style="font-size:11px;min-width:200px;padding:5px 8px;' + (eslesmis ? 'border-color:#97C459;background:#EAF3DE' : '') + '" onchange="window._eslGuncelle(\'' + _esc(k).replace(/'/g, "\\'") + '\',this.value);window._eiYenidenRender()">';
    DUAY_ALANLARI.forEach(function(a) { h += '<option value="' + a.v + '"' + (secili === a.v ? ' selected' : '') + '>' + _esc(a.l) + '</option>'; });
    h += '</select>';
    h += '<span style="flex:1;font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(ornekler.join(' · ')) + '</span>';
    h += '</div>';
  });

  // Duplicate davranisi
  h += '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2)">';
  h += '<div style="font-size:11px;font-weight:500;margin-bottom:6px">Duplicate kayit bulunursa:</div>';
  h += '<div style="display:flex;gap:8px">';
  ['tut','guncelle','atla'].forEach(function(d) {
    var lbl = { tut:'Ikisini de Tut', guncelle:'Guncelle', atla:'Atla' }[d];
    var aktif = _duplikaDavranis === d;
    h += '<button onclick="event.stopPropagation();window._eiDupSec(\'' + d + '\')" class="btn ' + (aktif ? 'btnp' : 'btns') + '" style="font-size:10px;padding:4px 12px">' + lbl + '</button>';
  });
  h += '</div></div>';

  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._eiGeriSablon()">← Geri</button><button class="btn btnp" onclick="window._eiAdim2Devam()">Devam →</button>';
}

window._eslGuncelle = function(k, v) { _eslestirme[k] = v; };
window._eiYenidenRender = function() { _renderAdim2(); };
window._eiDupSec = function(d) { _duplikaDavranis = d; _renderAdim2(); };
window._eiGeriSablon = function() { _renderAdim1B(); };

// ══ ADIM 3 — SABIT DEGERLER ═════════════════════════════════
window._eiAdim2Devam = function() { _renderAdim3(); };

function _renderAdim3() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var h = _stepBar(4);
  h += '<div style="padding:16px 20px">';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px">Sabit Degerler <span style="font-size:10px;color:var(--t3)">(opsiyonel — tum satirlara uygulanir)</span></div>';
  h += '<div id="ei-sabit-list">';
  var keys = Object.keys(_sabitDegerler);
  keys.forEach(function(k) { h += _sabitSatirHTML(k, _sabitDegerler[k]); });
  h += '</div>';
  h += '<button onclick="event.stopPropagation();window._eiSabitEkle()" class="btn btns" style="font-size:10px;margin-top:8px">+ Alan Ekle</button>';
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._eiGeriEslestir()">← Geri</button><button class="btn btns" onclick="window._eiAdim3Atla()">Atla →</button><button class="btn btnp" onclick="window._eiAdim3Devam()">Devam →</button>';
}

function _sabitSatirHTML(alan, deger) {
  return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px" data-sabit="1"><select class="fi" style="font-size:10px;width:200px" onchange="event.stopPropagation()" onclick="event.stopPropagation()">' + DUAY_ALANLARI.filter(function(a) { return a.v !== 'atla'; }).map(function(a) { return '<option value="' + a.v + '"' + (a.v === alan ? ' selected' : '') + '>' + _esc(a.l) + '</option>'; }).join('') + '</select><span style="color:var(--t3)">→</span><input class="fi" value="' + _esc(deger || '') + '" style="font-size:10px;flex:1" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"><button onclick="event.stopPropagation();this.closest(\'[data-sabit]\').remove()" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:14px">✕</button></div>';
}

window._eiSabitEkle = function() {
  var list = _g('ei-sabit-list'); if (!list) return;
  list.insertAdjacentHTML('beforeend', _sabitSatirHTML('mense_ulke', 'Turkiye'));
};
window._eiGeriEslestir = function() { _renderAdim2(); };
window._eiAdim3Atla = function() { _sabitDegerler = {}; _doValidation(); };
window._eiAdim3Devam = function() {
  _sabitDegerler = {};
  document.querySelectorAll('[data-sabit]').forEach(function(row) {
    var sel = row.querySelector('select'); var inp = row.querySelector('input');
    if (sel && inp && inp.value.trim()) _sabitDegerler[sel.value] = inp.value.trim();
  });
  _doValidation();
};

// ══ ADIM 4 — ONIZLEME ═══════════════════════════════════════
function _doValidation() {
  _gecerliSatirlar = []; _hataliSatirlar = []; _guncellenenSayisi = 0; _eklenenSayisi = 0; _atlandiSayisi = 0;
  var mevcutUrunler = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  _excelData.forEach(function(satir, i) {
    var mapped = {}; var hata = null;
    _kolonlar.forEach(function(k) { var alan = _eslestirme[k]; if (alan && alan !== 'atla') mapped[alan] = satir[k]; });
    for (var sk in _sabitDegerler) { if (!mapped[sk] || !mapped[sk].trim()) mapped[sk] = _sabitDegerler[sk]; }
    DUAY_ALANLARI.filter(function(a) { return a.zorunlu; }).forEach(function(a) { if (!mapped[a.v] || !String(mapped[a.v]).trim()) hata = a.l + ' bos'; });
    if (mapped.miktar && isNaN(parseFloat(mapped.miktar))) hata = 'Miktar sayisal degil';
    // Duplicate tespiti
    if (!hata && mapped.urun_kodu && _duplikaDavranis !== 'tut') {
      var dup = mevcutUrunler.find(function(u) { return !u.isDeleted && u.urun_kodu === mapped.urun_kodu; });
      if (dup) {
        if (_duplikaDavranis === 'atla') { _hataliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir, hata: 'duplicate — atlandi (' + mapped.urun_kodu + ')' }); _atlandiSayisi++; return; }
      }
    }
    if (hata) _hataliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir, hata: hata });
    else _gecerliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir });
  });
  _renderAdim4();
}

function _renderAdim4() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var h = _stepBar(5);
  // Ozet
  var hsEksik = _gecerliSatirlar.filter(function(s) { return !s.mapped.hs_kodu; }).length;
  var fiyatSifir = _gecerliSatirlar.filter(function(s) { return !parseFloat(s.mapped.birim_fiyat); }).length;
  h += '<div style="padding:8px 20px;background:var(--s2);border-bottom:1px solid var(--b);font-size:10px;display:flex;gap:12px">';
  h += '<span style="color:#085041">' + _gecerliSatirlar.length + ' gecerli</span>';
  if (_hataliSatirlar.length) h += '<span style="color:#DC2626">' + _hataliSatirlar.length + ' hata</span>';
  if (hsEksik) h += '<span style="color:#D97706">' + hsEksik + ' HS bos</span>';
  if (fiyatSifir) h += '<span style="color:#D97706">' + fiyatSifir + ' fiyat 0</span>';
  h += '</div>';
  // Ilk 5 satir onizleme
  var onizKolonlar = Object.keys(_gecerliSatirlar[0]?.mapped || {}).filter(function(k) { return k !== 'atla'; }).slice(0, 8);
  h += '<div style="overflow-x:auto;padding:0 20px"><table class="tbl" style="font-size:10px;margin-top:8px"><thead><tr>';
  onizKolonlar.forEach(function(k) { h += '<th>' + _esc(k) + '</th>'; });
  h += '</tr></thead><tbody>';
  _gecerliSatirlar.slice(0, 5).forEach(function(s, ri) {
    h += '<tr>';
    onizKolonlar.forEach(function(k) {
      var v = s.mapped[k] || '';
      var zorDef = DUAY_ALANLARI.find(function(a) { return a.v === k; });
      var bg = (zorDef && zorDef.zorunlu && !v) ? '#FFE0E0' : (zorDef && zorDef.uyari && !v) ? '#FEF9C3' : (ri % 2 ? 'var(--s2)' : '');
      h += '<td style="background:' + bg + '">' + _esc(String(v).slice(0, 25)) + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  // Hatalar
  if (_hataliSatirlar.length) {
    h += '<div style="padding:8px 20px;margin-top:8px">';
    _hataliSatirlar.slice(0, 5).forEach(function(s) { h += '<div style="background:#FCEBEB;border-left:3px solid #DC2626;padding:6px 10px;margin-bottom:4px;font-size:10px;color:#791F1F;border-radius:0 4px 4px 0">Satir ' + s.satir + ' — ' + _esc(s.hata) + '</div>'; });
    if (_hataliSatirlar.length > 5) h += '<div style="font-size:10px;color:var(--t3)">... ve ' + (_hataliSatirlar.length - 5) + ' daha</div>';
    h += '</div>';
  }
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._eiGeriEslestir()">← Geri</button>' + (_hataliSatirlar.length ? '<button class="btn btns" onclick="event.stopPropagation();window._excelHataliIndir()" style="color:#DC2626">Hatali Satirlari Indir</button>' : '') + '<button class="btn btnp" onclick="window._renderAdim5()">Import Et (' + _gecerliSatirlar.length + ' satir) →</button>';
}

// ══ HATALI SATIR INDIR ═══════════════════════════════════════
window._excelHataliIndir = function() {
  if (!_hataliSatirlar.length || typeof XLSX === 'undefined') return;
  var headers = Object.keys(_hataliSatirlar[0].mapped).concat(['HATA']);
  var rows = _hataliSatirlar.map(function(s) { var r = []; headers.forEach(function(h2) { r.push(h2 === 'HATA' ? s.hata : (s.mapped[h2] || '')); }); return r; });
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Hatali');
  XLSX.writeFile(wb, 'hatali_satirlar_' + _today() + '.xlsx');
  window.toast?.('Hatali satirlar indirildi', 'ok');
};

// ══ ADIM 5 — IMPORT + SONUC ═════════════════════════════════
window._renderAdim5 = function() {
  var tedarikciId = '', ihrDosyaId = '';
  // Onceki adimlardan secim yoksa — basit dagitim icin dogrudan import
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  // Dagitim secimi
  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted; }) : [];
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];
  var h = _stepBar(5);
  h += '<div style="padding:16px 20px">';
  h += '<div style="font-size:12px;font-weight:500;margin-bottom:12px">' + _gecerliSatirlar.length + ' satir nereye aktarilacak?</div>';
  h += '<div style="background:#FAEEDA;border:0.5px solid #D97706;border-radius:8px;padding:12px 16px;margin-bottom:12px"><div style="font-size:11px;font-weight:500;margin-bottom:6px">Tedarikci (Zorunlu)</div><select class="fi" id="dag-tedarikci" style="width:100%" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">— Tedarikci Sec —</option>' + cariList.map(function(c) { return '<option value="' + c.id + '">' + _esc(c.name) + '</option>'; }).join('') + '</select></div>';
  h += '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:12px"><input type="checkbox" id="dag-ihracat" checked> Ihracat Ops</label>';
  h += '<select class="fi" id="dag-ihracat-dosya" style="margin-left:28px;max-width:300px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">— Dosya Sec —</option>' + dosyalar.map(function(d) { return '<option value="' + d.id + '">' + _esc(d.dosyaNo + ' — ' + (d.musteriAd || '')) + '</option>'; }).join('') + '</select>';
  h += '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:12px;margin-top:4px"><input type="checkbox" id="dag-katalog" checked> Urun Katalogu</label>';
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._eiGeriOnizleme()">← Geri</button><button class="btn btnp" onclick="window._excelImport()">Import Et →</button>';
};
window._eiGeriOnizleme = function() { _doValidation(); };

window._excelImport = function() {
  var tedarikciId = (_g('dag-tedarikci') || {}).value;
  if (!tedarikciId) { window.toast?.('Tedarikci secmeden import yapilamaz', 'err'); return; }
  var tedCari = typeof window.loadCari === 'function' ? window.loadCari() : [];
  var tedarikci = null; tedCari.forEach(function(c) { if (String(c.id) === String(tedarikciId)) tedarikci = c; });
  var dagK = _g('dag-katalog')?.checked; var dagI = _g('dag-ihracat')?.checked;
  var ihrDosyaId = _g('dag-ihracat-dosya')?.value; var cu = _cu();
  var kN = 0, iN = 0;
  _gecerliSatirlar.forEach(function(s) {
    var m = s.mapped;
    if (!m.tedarikci && tedarikci) m.tedarikci = tedarikci.name;
    for (var sk in _sabitDegerler) { if (!m[sk]) m[sk] = _sabitDegerler[sk]; }
    if (dagK && typeof window.loadUrunler === 'function') { var u = window.loadUrunler(); u.unshift({ id: _genId(), ad: m.aciklama || '', kod: m.urun_kodu || '', hsKodu: m.hs_kodu || '', birim: m.birim || 'PCS', menseUlke: m.mense_ulke || 'Turkiye', tedarikci_id: tedarikciId, tedarikci: m.tedarikci || '', createdAt: _now(), createdBy: cu?.id }); window.storeUrunler?.(u); kN++; }
    if (dagI && ihrDosyaId && typeof window.loadIhracatUrunler === 'function') {
      var mevcutU = window.loadIhracatUrunler();
      var dup = m.urun_kodu ? mevcutU.find(function(x) { return !x.isDeleted && x.urun_kodu === m.urun_kodu && String(x.dosya_id) === String(ihrDosyaId); }) : null;
      if (dup && _duplikaDavranis === 'guncelle') {
        Object.keys(m).forEach(function(k) { if (m[k]) dup[k] = m[k]; }); dup.updatedAt = _now(); _guncellenenSayisi++;
      } else if (dup && _duplikaDavranis === 'atla') { _atlandiSayisi++; }
      else {
        mevcutU.unshift({ id: _genId(), dosya_id: ihrDosyaId, aciklama: m.aciklama || '', standart_urun_adi: m.standart_urun_adi || m.aciklama || '', urun_kodu: m.urun_kodu || '', hs_kodu: m.hs_kodu || '', kdv_orani: m.kdv_orani || '', miktar: parseFloat(m.miktar || 0), birim: m.birim || 'PCS', birim_fiyat: parseFloat(m.birim_fiyat || 0), doviz: m.doviz || 'USD', brut_kg: parseFloat(m.brut_kg || 0), net_kg: parseFloat(m.net_kg || 0), hacim_m3: parseFloat(m.hacim_m3 || 0), koli_adet: parseInt(m.koli_adet || 0), mense_ulke: m.mense_ulke || '', tedarikci_id: tedarikciId, tedarikciAd: m.tedarikci || '', gumrukcu_tanim: m.gumrukcu_tanim || '', fatura_urun_adi: m.fatura_urun_adi || '', satici_urun_adi: m.satici_urun_adi || '', satici_urun_kodu: m.satici_urun_kodu || '', kaynak: 'excel_import', createdAt: _now(), createdBy: cu?.id });
        _eklenenSayisi++; iN++;
      }
      window.storeIhracatUrunler?.(mevcutU);
    }
  });
  _renderSonuc(kN, iN);
};

function _renderSonuc(kN, iN) {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var h = _stepBar(6);
  h += '<div style="padding:24px 20px;text-align:center"><div style="font-size:32px;margin-bottom:8px">✅</div>';
  h += '<div style="font-size:15px;font-weight:500;margin-bottom:16px">Import tamamlandi</div>';
  h += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
  h += '<div style="background:#EAF3DE;border-radius:10px;padding:14px 20px;text-align:center;min-width:80px"><div style="font-size:24px;font-weight:600;color:#16A34A">' + _eklenenSayisi + '</div><div style="font-size:10px;color:#085041">Eklendi</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:10px;padding:14px 20px;text-align:center;min-width:80px"><div style="font-size:24px;font-weight:600;color:#185FA5">' + _guncellenenSayisi + '</div><div style="font-size:10px;color:#0C447C">Guncellendi</div></div>';
  h += '<div style="background:#FAEEDA;border-radius:10px;padding:14px 20px;text-align:center;min-width:80px"><div style="font-size:24px;font-weight:600;color:#D97706">' + _atlandiSayisi + '</div><div style="font-size:10px;color:#633806">Atlandi</div></div>';
  h += '<div style="background:#FCEBEB;border-radius:10px;padding:14px 20px;text-align:center;min-width:80px"><div style="font-size:24px;font-weight:600;color:#DC2626">' + _hataliSatirlar.length + '</div><div style="font-size:10px;color:#791F1F">Hatali</div></div>';
  h += '</div>';
  // Sablon kaydet
  if (_musteriAd || _sablon_no) {
    h += '<div style="margin-top:16px;padding:12px;background:var(--s2);border-radius:8px">';
    h += '<div style="font-size:11px;font-weight:500;margin-bottom:6px">Sablonu Kaydet</div>';
    h += '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">' + _esc(_musteriAd) + (_sablon_no ? ' — ' + _esc(_sablon_no) : '') + '</div>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._eiSablonKaydet()" style="font-size:10px">Bu Sablonu Kaydet</button>';
    h += '</div>';
  }
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = (_hataliSatirlar.length ? '<button class="btn btns" onclick="event.stopPropagation();window._excelHataliIndir()" style="color:#DC2626">Hatali Indir</button>' : '') + '<button class="btn btnp" onclick="document.getElementById(\'mo-excel-import\')?.remove();window.App?.nav?.(\'ihracat-ops\')">Urunlere Git →</button>';
  window.toast?.('Import: ' + _gecerliSatirlar.length + ' satir', 'ok');
  window.logActivity?.('import', 'Excel import V2: ' + _eklenenSayisi + ' eklendi, ' + _guncellenenSayisi + ' guncellendi, ' + _atlandiSayisi + ' atlandi');
}

window._eiSablonKaydet = function() {
  var tpl = _loadTpl();
  tpl.unshift({ ad: _musteriAd || _dosyaAdi, musteriAd: _musteriAd, sablon_no: _sablon_no, kolonlar: _kolonlar.slice(), eslestirme: Object.assign({}, _eslestirme), sabit_degerler: Object.assign({}, _sabitDegerler), createdAt: _now() });
  _storeTpl(tpl);
  window.toast?.('Sablon kaydedildi', 'ok');
};

window._excelImportGeri = function() { _renderAdim1(); };

})();
