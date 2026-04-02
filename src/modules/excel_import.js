/**
 * src/modules/excel_import.js — v1.0.0
 * Excel Import Sistemi — 4 Adım: Yükle → Eşleştir → Doğrula → Dağıt
 */
(function ExcelImportModule() {
'use strict';

var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || ''); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };

var _loadTpl = function() { try { return JSON.parse(localStorage.getItem('ak_excel_tpl1') || '[]'); } catch (e) { return []; } };
var _storeTpl = function(d) { try { localStorage.setItem('ak_excel_tpl1', JSON.stringify(d.slice(0, 20))); } catch (e) {} };

var DUAY_ALANLARI = [
  { v: 'aciklama', l: 'Ürün Açıklaması', zorunlu: true }, { v: 'urun_kodu', l: 'Ürün Kodu', zorunlu: false },
  { v: 'hs_kodu', l: 'HS Kodu', zorunlu: false }, { v: 'miktar', l: 'Miktar', zorunlu: true },
  { v: 'birim', l: 'Birim', zorunlu: false }, { v: 'birim_fiyat', l: 'Birim Fiyat', zorunlu: false },
  { v: 'doviz', l: 'Döviz', zorunlu: false }, { v: 'tedarikci', l: 'Tedarikçi', zorunlu: false },
  { v: 'brut_kg', l: 'Brüt kg', zorunlu: false }, { v: 'net_kg', l: 'Net kg', zorunlu: false },
  { v: 'hacim_m3', l: 'Hacim m³', zorunlu: false }, { v: 'koli_adet', l: 'Koli', zorunlu: false },
  { v: 'mense_ulke', l: 'Menşe', zorunlu: false }, { v: 'atla', l: '— Atla —', zorunlu: false },
];

var ANAHTAR = {
  aciklama:    ['product','description','descriptionofgoods','urun','aciklama','item','goods','tanim','desc'],
  urun_kodu:   ['code','kod','sku','ref','part','article','item'],
  hs_kodu:     ['hs','hscode','tariff','gtip','customs','gumruk'],
  miktar:      ['qty','quantity','miktar','adet','pcs','pcsone','amount','pcsinone'],
  birim:       ['unit','birim','uom'],
  birim_fiyat: ['price','fiyat','unitprice','birimfiyat','cost','pricepcs'],
  doviz:       ['currency','doviz','cur'],
  tedarikci:   ['supplier','tedarikci','vendor','manufacturer'],
  brut_kg:     ['grosskg','grossweight','brutkg','totalgrosskg'],
  net_kg:      ['netkg','netweight','totalnetkg'],
  hacim_m3:    ['volume','hacim','cbm','totalcbm'],
  koli_adet:   ['carton','cartonqty','koli','box','ctn','cartqty'],
  mense_ulke:  ['origin','mense','countryoforigin','coo']
};

var _excelData = [], _kolonlar = [], _eslestirme = {}, _gecerliSatirlar = [], _hataliSatirlar = [];

function _stepBar(aktif) {
  var adimlar = ['Yükle', 'Eşleştir', 'Doğrula', 'Dağıt', 'Tamam'];
  return '<div style="display:flex;align-items:center;gap:4px;padding:10px 20px;border-bottom:0.5px solid var(--b);background:var(--s2)">' + adimlar.map(function(a, i) { var n = i + 1; var ok = n < aktif; var on = n === aktif; return '<div style="display:flex;align-items:center;gap:4px"><div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;background:' + (ok ? '#EAF3DE' : on ? '#185FA5' : 'var(--s2)') + ';color:' + (ok ? '#27500A' : on ? '#fff' : 'var(--t3)') + '">' + (ok ? '✓' : n) + '</div><span style="font-size:11px;color:' + (on ? '#185FA5' : 'var(--t3)') + ';font-weight:' + (on ? '500' : '400') + '">' + a + '</span>' + (i < 4 ? '<span style="color:var(--t3);margin:0 4px;font-size:10px">→</span>' : '') + '</div>'; }).join('') + '</div>';
}

window.excelImportAc = function() {
  var old = _g('mo-excel-import'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-excel-import';
  mo.innerHTML = '<div class="moc" style="max-width:900px;width:95vw;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">Excel Import</div><button onclick="document.getElementById(\'mo-excel-import\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div><div id="excel-import-body" style="min-height:400px"></div><div id="excel-import-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
  _renderAdim1();
};

function _renderAdim1() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  body.innerHTML = _stepBar(1) + '<div style="padding:32px 24px;text-align:center"><div style="width:56px;height:56px;border:1.5px dashed var(--bm);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px" onclick="document.getElementById(\'excel-file-input\')?.click()">📥</div><div style="font-size:14px;font-weight:500;margin-bottom:6px">Excel dosyası seç</div><div style="font-size:12px;color:var(--t3);margin-bottom:16px">.xlsx veya .csv</div><input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="window._excelDosyaSecildi(this)"><button class="btn btnp" onclick="document.getElementById(\'excel-file-input\')?.click()">Dosya Seç</button></div>';
  footer.innerHTML = '<button class="btn btns" onclick="document.getElementById(\'mo-excel-import\')?.remove()">İptal</button>';
}

window._excelDosyaSecildi = function(input) {
  var file = input.files[0]; if (!file) return;
  var body = _g('excel-import-body'); if (!body) return;
  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t2)">Dosya okunuyor...</div>';
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (file.name.endsWith('.csv')) { _parseCSV(e.target.result); }
      else if (typeof XLSX !== 'undefined') { var wb = XLSX.read(e.target.result, { type: 'array' }); var ws = wb.Sheets[wb.SheetNames[0]]; _processRawData(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })); }
      else { _parseCSV(new TextDecoder().decode(e.target.result)); }
    } catch (err) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626">' + _esc(err.message) + '<br><button class="btn btns" style="margin-top:12px" onclick="window._excelImportGeri()">← Geri</button></div>'; }
  };
  if (file.name.endsWith('.csv')) reader.readAsText(file, 'UTF-8'); else reader.readAsArrayBuffer(file);
};

function _parseCSV(text) { var lines = text.split('\n').filter(function(l) { return l.trim(); }); _processRawData(lines.map(function(l) { return l.split(/[,;\t]/).map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); })); }

function _processRawData(rows) {
  if (!rows || rows.length < 2) {
    window.toast?.('Dosyada veri bulunamadi', 'err'); return;
  }

  /* Akilli baslik satiri tespiti: bos satirlari atla, en fazla dolu alan iceren satiri baslik kabul et */
  var headerRowIdx = 0;
  var maxDolu = 0;
  var scanLimit = Math.min(10, rows.length);
  for (var ri = 0; ri < scanLimit; ri++) {
    var dolu = 0;
    for (var ci = 0; ci < rows[ri].length; ci++) { if (String(rows[ri][ci]).trim()) dolu++; }
    if (dolu > maxDolu) { maxDolu = dolu; headerRowIdx = ri; }
  }

  if (maxDolu < 2) {
    window.toast?.('Baslik satiri bulunamadi — ilk 10 satirda en az 2 dolu sutun olmali', 'err'); return;
  }

  _kolonlar = rows[headerRowIdx].map(function(k) { return String(k).trim(); }).filter(Boolean);

  /* Veri satirlari: baslik sonrasindaki bos olmayan satirlar */
  _excelData = rows.slice(headerRowIdx + 1)
    .filter(function(r) { return r.some(function(c) { return String(c).trim(); }); })
    .map(function(r) {
      var obj = {};
      _kolonlar.forEach(function(k, i) { obj[k] = String(r[i] || '').trim(); });
      return obj;
    });

  if (!_excelData.length) {
    window.toast?.('Veri satirlari bulunamadi', 'err'); return;
  }

  /* Otomatik eslestirme */
  _eslestirme = {};
  var kullanilan = {};
  _kolonlar.forEach(function(k) {
    var kl = k.toLowerCase().replace(/[\s\/\(\)]/g, '');
    for (var alan in ANAHTAR) {
      if (kullanilan[alan]) continue;
      var anahtarlar = ANAHTAR[alan];
      for (var ai = 0; ai < anahtarlar.length; ai++) {
        if (kl.indexOf(anahtarlar[ai].replace(/\s/g, '')) !== -1) {
          _eslestirme[k] = alan;
          kullanilan[alan] = true;
          break;
        }
      }
      if (_eslestirme[k]) break;
    }
    if (!_eslestirme[k]) _eslestirme[k] = 'atla';
  });

  /* Bu excel'e ozel ek eslestirmeler */
  _kolonlar.forEach(function(k) {
    var kl = k.toLowerCase();
    if (_eslestirme[k] !== 'atla') return;
    if (kl.indexOf('description') !== -1 || kl.indexOf('goods') !== -1) { _eslestirme[k] = 'aciklama'; }
    else if (kl.indexOf('carton qty') !== -1 || kl.indexOf('ctn') !== -1) { _eslestirme[k] = 'koli_adet'; }
    else if (kl.indexOf('gross kg') !== -1 && kl.indexOf('total') !== -1) { _eslestirme[k] = 'brut_kg'; }
    else if (kl.indexOf('net kg') !== -1 && kl.indexOf('total') !== -1) { _eslestirme[k] = 'net_kg'; }
    else if (kl.indexOf('cbm') !== -1 && kl.indexOf('total') !== -1) { _eslestirme[k] = 'hacim_m3'; }
    else if (kl.indexOf('price') !== -1 && kl.indexOf('pcs') !== -1) { _eslestirme[k] = 'birim_fiyat'; }
    else if (kl.indexOf('item') !== -1) { _eslestirme[k] = 'urun_kodu'; }
    else if (kl.indexOf('pcs') !== -1 && kl.indexOf('one') !== -1) { _eslestirme[k] = 'miktar'; }
  });

  /* Kayitli sablon kontrolu */
  var templates = _loadTpl();
  var eslTpl = null;
  for (var ti = 0; ti < templates.length; ti++) {
    var t = templates[ti];
    if (t.kolonlar) {
      var tumEslesir = true;
      for (var ki = 0; ki < t.kolonlar.length; ki++) {
        if (_kolonlar.indexOf(t.kolonlar[ki]) === -1) { tumEslesir = false; break; }
      }
      if (tumEslesir) { eslTpl = t; break; }
    }
  }
  if (eslTpl) {
    for (var ek in eslTpl.eslestirme) { _eslestirme[ek] = eslTpl.eslestirme[ek]; }
    window.toast?.('"' + eslTpl.ad + '" sablonu otomatik uygulandi', 'ok');
  }
  _renderAdim2(eslTpl || null);
}

function _renderAdim2(tplBilgi) {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var h = _stepBar(2);
  h += '<div style="padding:8px 20px;background:var(--s2);border-bottom:0.5px solid var(--b);font-size:10px;color:var(--t3);display:flex;justify-content:space-between"><span>Excel sütunu → Duay alanı</span><span>' + _excelData.length + ' satır</span></div>';
  _kolonlar.forEach(function(k) {
    var secili = _eslestirme[k] || 'atla'; var ornek = (_excelData[0] || {})[k] || '—';
    h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 20px;border-bottom:0.5px solid var(--b);font-size:11px"><span style="flex:1;font-family:monospace;font-size:10px;color:var(--t2)">' + _esc(k) + '</span><span style="color:var(--t3)">→</span><select class="fi" style="font-size:10px;flex:1;padding:4px 6px" onchange="window._eslGuncelle(\'' + _esc(k).replace(/'/g, "\\'") + '\',this.value)">' + DUAY_ALANLARI.map(function(a) { return '<option value="' + a.v + '"' + (secili === a.v ? ' selected' : '') + '>' + _esc(a.l) + '</option>'; }).join('') + '</select><span style="flex:1;font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(String(ornek).slice(0, 30)) + '</span></div>';
  });
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._excelImportGeri()">← Geri</button><button class="btn btnp" onclick="window._adim2Devam()">Devam →</button>';
}

window._eslGuncelle = function(k, v) { _eslestirme[k] = v; };

window._adim2Devam = function() {
  _gecerliSatirlar = []; _hataliSatirlar = [];
  _excelData.forEach(function(satir, i) {
    var mapped = {}; var hata = null;
    _kolonlar.forEach(function(k) { var alan = _eslestirme[k]; if (alan && alan !== 'atla') mapped[alan] = satir[k]; });
    DUAY_ALANLARI.filter(function(a) { return a.zorunlu; }).forEach(function(a) { if (!mapped[a.v] || !String(mapped[a.v]).trim()) hata = a.l + ' boş'; });
    if (mapped.miktar && isNaN(parseFloat(mapped.miktar))) hata = 'Miktar sayısal değil';
    if (hata) _hataliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir, hata: hata });
    else _gecerliSatirlar.push({ satir: i + 2, mapped: mapped, ham: satir });
  });
  _renderAdim3();
};

function _renderAdim3() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var h = _stepBar(3);
  h += '<div style="display:flex;gap:8px;padding:12px 20px;border-bottom:0.5px solid var(--b)"><span style="font-size:10px;padding:2px 8px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:500">' + _gecerliSatirlar.length + ' Geçerli</span>' + (_hataliSatirlar.length ? '<span style="font-size:10px;padding:2px 8px;border-radius:3px;background:#FCEBEB;color:#791F1F;font-weight:500">' + _hataliSatirlar.length + ' Hata</span>' : '') + '</div>';
  _hataliSatirlar.forEach(function(s) { h += '<div style="background:#FCEBEB;border-left:3px solid #DC2626;padding:8px 14px;margin:8px 16px;border-radius:0 6px 6px 0;font-size:11px;color:#791F1F">Satır ' + s.satir + ' — ' + _esc(s.hata) + '</div>'; });
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._excelImportGeri()">← Geri</button><button class="btn btnp" onclick="window._renderAdim4()">' + _gecerliSatirlar.length + ' satırı import et →</button>';
}

window._renderAdim4 = function() {
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer'); if (!body) return;
  var dosyalar = typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar().filter(function(d) { return !d.isDeleted; }) : [];
  var h = _stepBar(4);
  h += '<div style="padding:16px 20px"><div style="font-size:12px;color:var(--t2);margin-bottom:14px">' + _gecerliSatirlar.length + ' satır — nereye aktarılacak?</div>';
  h += '<div style="display:flex;flex-direction:column;gap:12px">';
  h += '<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:0.5px solid var(--b);border-radius:10px;cursor:pointer"><input type="checkbox" id="dag-katalog" checked> <div><div style="font-size:12px;font-weight:500">Ürün Kataloğu</div><div style="font-size:10px;color:var(--t3)">Ürün adı, HS kodu, birim</div></div></label>';
  h += '<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:0.5px solid var(--b);border-radius:10px;cursor:pointer"><input type="checkbox" id="dag-satinalma" checked> <div><div style="font-size:12px;font-weight:500">Alış Teklifleri</div><div style="font-size:10px;color:var(--t3)">Fiyat, miktar, tedarikçi</div></div></label>';
  h += '<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:0.5px solid var(--b);border-radius:10px;cursor:pointer"><input type="checkbox" id="dag-ihracat" checked> <div><div style="font-size:12px;font-weight:500">İhracat Ops</div><div style="font-size:10px;color:var(--t3)">İhracat dosyasına bağla</div></div></label>';
  h += '<select class="fi" id="dag-ihracat-dosya" style="margin-left:34px;max-width:300px"><option value="">— Dosya Seçin —</option>' + dosyalar.map(function(d) { return '<option value="' + d.id + '">' + _esc(d.dosyaNo + ' — ' + (d.musteriAd || '')) + '</option>'; }).join('') + '</select>';
  h += '</div></div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="window._excelImportGeri()">← Geri</button><button class="btn btnp" onclick="window._excelImport()">Import Et →</button>';
};

window._excelImport = function() {
  var dagK = _g('dag-katalog')?.checked; var dagS = _g('dag-satinalma')?.checked; var dagI = _g('dag-ihracat')?.checked;
  var ihrDosyaId = _g('dag-ihracat-dosya')?.value; var cu = _cu(); var kN = 0, sN = 0, iN = 0;
  _gecerliSatirlar.forEach(function(s) {
    var m = s.mapped;
    if (dagK && typeof window.loadUrunler === 'function') { var u = window.loadUrunler(); u.unshift({ id: _genId(), ad: m.aciklama || '', kod: m.urun_kodu || '', hsKodu: m.hs_kodu || '', birim: m.birim || 'PCS', menseUlke: m.mense_ulke || 'Türkiye', createdAt: _now(), createdBy: cu?.id }); window.storeUrunler?.(u); kN++; }
    if (dagS && typeof window.loadSatinalma === 'function') { var sa = window.loadSatinalma(); sa.unshift({ id: _genId(), urun: m.aciklama || '', miktar: parseFloat(m.miktar || 0), birimFiyat: parseFloat(m.birim_fiyat || 0), doviz: m.doviz || 'USD', tedarikci: m.tedarikci || '', kaynak: 'excel_import', createdAt: _now(), createdBy: cu?.id }); window.storeSatinalma?.(sa); sN++; }
    if (dagI && ihrDosyaId && typeof window.loadIhracatUrunler === 'function') { var ihr = window.loadIhracatUrunler(); ihr.unshift({ id: _genId(), dosya_id: ihrDosyaId, aciklama: m.aciklama || '', urun_kodu: m.urun_kodu || '', hs_kodu: m.hs_kodu || '', miktar: parseFloat(m.miktar || 0), birim: m.birim || 'PCS', birim_fiyat: parseFloat(m.birim_fiyat || 0), doviz: m.doviz || 'USD', brut_kg: parseFloat(m.brut_kg || 0), koli_adet: parseInt(m.koli_adet || 0), mense_ulke: m.mense_ulke || 'Türkiye', kaynak: 'excel_import', createdAt: _now(), createdBy: cu?.id }); window.storeIhracatUrunler?.(ihr); iN++; }
  });
  var body = _g('excel-import-body'); var footer = _g('excel-import-footer');
  if (body) body.innerHTML = _stepBar(5) + '<div style="padding:24px 20px;text-align:center"><div style="font-size:32px;margin-bottom:8px">✅</div><div style="font-size:15px;font-weight:500;margin-bottom:16px">Import tamamlandı</div><div style="display:flex;gap:12px;justify-content:center"><div style="background:var(--s2);border-radius:10px;padding:14px 20px;text-align:center"><div style="font-size:24px;font-weight:500;color:#185FA5">' + kN + '</div><div style="font-size:10px;color:var(--t3)">Ürün</div></div><div style="background:var(--s2);border-radius:10px;padding:14px 20px;text-align:center"><div style="font-size:24px;font-weight:500;color:#7C3AED">' + sN + '</div><div style="font-size:10px;color:var(--t3)">Alış Teklifi</div></div><div style="background:var(--s2);border-radius:10px;padding:14px 20px;text-align:center"><div style="font-size:24px;font-weight:500;color:#16A34A">' + iN + '</div><div style="font-size:10px;color:var(--t3)">İhracat</div></div></div></div>';
  if (footer) footer.innerHTML = '<button class="btn" onclick="document.getElementById(\'mo-excel-import\')?.remove()">Kapat</button>';
  window.toast?.('Import: ' + _gecerliSatirlar.length + ' satır', 'ok');
  window.logActivity?.('import', 'Excel import: ' + _gecerliSatirlar.length + ' satır');
};

window._excelImportGeri = function() { _renderAdim1(); };

})();
