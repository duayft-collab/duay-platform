/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/urun_db.js  —  v1.0.0
 * Ürün Veritabanı — Tam CRUD + Excel Import/Export
 * localStorage: ak_urun_db1
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

var URUN_DB_KEY = 'ak_urun_db1';

function loadUrunDB() { try { return JSON.parse(localStorage.getItem(URUN_DB_KEY) || '[]'); } catch(e) { return []; } }
function storeUrunDB(d) { localStorage.setItem(URUN_DB_KEY, JSON.stringify(d)); }

/**
 * Duay Ürün Kodu otomatik üretir: SatıcıKodu-ÜrünKodu
 */
function _generateDuayCode(vendorName, vendorCode) {
  var prefix = (vendorName || 'XX').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  var code = (vendorCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return 'DY-' + prefix + '-' + (code || String(Date.now()).slice(-6));
}

var URUN_COUNTRIES = ['Türkiye','Çin','Almanya','ABD','İtalya','Fransa','İngiltere','Japonya','Güney Kore','Hindistan','Brezilya','Rusya','İspanya','Hollanda','Belçika','İsviçre','Avusturya','Polonya','Çekya','Macaristan','Romanya','Bulgaristan','Yunanistan','Mısır','BAE','Suudi Arabistan','İran','Tayland','Vietnam','Endonezya','Malezya','Singapur','Tayvan','Pakistan','Bangladeş','Sri Lanka','Arjantin','Kolombiya','Peru','Şili','Meksika','Kanada','Avustralya','Güney Afrika','Nijerya','Kenya','Fas','Cezayir','Tunus'];

/**
 * Ürün ekleme/düzenleme modalı.
 */
function openUrunModal(id) {
  var old = document.getElementById('mo-urun-db'); if (old) old.remove();
  var data = loadUrunDB();
  var u = id ? data.find(function(x) { return x.id === id; }) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  // Cari listesi (satıcılar)
  var cariList = typeof loadCari === 'function' ? loadCari() : [];
  var cariOpts = '<option value="">— Satıcı Seçin —</option>' + cariList.map(function(c) { return '<option value="' + esc(c.name) + '"' + (u?.vendorName === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
  var countryOpts = '<option value="">—</option>' + URUN_COUNTRIES.map(function(c) { return '<option value="' + c + '"' + (u?.origin === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-urun-db'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:800px;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">' + (u ? '✏️ Ürün Düzenle' : '+ Yeni Ürün') + '</div>'
      + '<button onclick="document.getElementById(\'mo-urun-db\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px">'
      // Satır 1: Satıcı + Sınıf + Ürün Kodu
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">SATICI FİRMA *</div><select class="fi" id="ud-vendor">' + cariOpts + '</select></div>'
        + '<div><div class="fl">SATICI SINIFI</div><input class="fi" id="ud-vendorClass" value="' + (u?.vendorClass || '') + '" placeholder="A/B/C"></div>'
        + '<div><div class="fl">SATICI ÜRÜN KODU *</div><input class="fi" id="ud-vendorCode" value="' + (u?.vendorCode || '') + '" placeholder="ABC-123"></div>'
      + '</div>'
      // Satır 2: Duay Kodu + Duay Adı + Orijinal Adı
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">DUAY ÜRÜN KODU</div><input class="fi" id="ud-duayCode" value="' + (u?.duayCode || '') + '" readonly style="background:var(--s2);color:var(--t3)" placeholder="Otomatik"></div>'
        + '<div><div class="fl">DUAY ÜRÜN ADI *</div><input class="fi" id="ud-duayName" value="' + (u?.duayName || '') + '" placeholder="Ürün adı"></div>'
        + '<div><div class="fl">ORİJİNAL ÜRN ADI</div><input class="fi" id="ud-origName" value="' + (u?.origName || '') + '"></div>'
      + '</div>'
      // Satır 3: Standart Ad + Fatura Adı + Teknik Açıklama
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">STANDART AD (CI/PL/BL)</div><input class="fi" id="ud-stdName" value="' + (u?.stdName || '') + '"></div>'
        + '<div><div class="fl">FATURA ÜRÜN ADI</div><input class="fi" id="ud-invoiceName" value="' + (u?.invoiceName || '') + '"></div>'
        + '<div><div class="fl">GÜMRÜKÇÜ TANIMI</div><input class="fi" id="ud-customsDesc" value="' + (u?.customsDesc || '') + '"></div>'
      + '</div>'
      // Satır 4: Kategori + Marka + Renk + Menşei
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">KATEGORİ</div><input class="fi" id="ud-category" value="' + (u?.category || '') + '"></div>'
        + '<div><div class="fl">MARKA</div><input class="fi" id="ud-brand" value="' + (u?.brand || '') + '"></div>'
        + '<div><div class="fl">RENK</div><input class="fi" id="ud-color" value="' + (u?.color || '') + '"></div>'
        + '<div><div class="fl">MENŞEİ ÜLKE</div><select class="fi" id="ud-origin">' + countryOpts + '</select></div>'
      + '</div>'
      // Satır 5: GTİP + Vergi + Birim + DİB + IMO
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">GTİP</div><input class="fi" id="ud-gtip" value="' + (u?.gtip || '') + '" placeholder="8501.10.00"></div>'
        + '<div><div class="fl">VERGİ %</div><input class="fi" type="number" id="ud-taxRate" value="' + (u?.taxRate || '') + '"></div>'
        + '<div><div class="fl">BİRİM</div><input class="fi" id="ud-unit" value="' + (u?.unit || 'Adet') + '"></div>'
        + '<div><div class="fl">DİB</div><select class="fi" id="ud-dib"><option value="H"' + (u?.dib !== 'E' ? ' selected' : '') + '>Hayır</option><option value="E"' + (u?.dib === 'E' ? ' selected' : '') + '>Evet</option></select></div>'
        + '<div><div class="fl">IMO</div><select class="fi" id="ud-imo"><option value="H"' + (u?.imo !== 'E' ? ' selected' : '') + '>Hayır</option><option value="E"' + (u?.imo === 'E' ? ' selected' : '') + '>Evet</option></select></div>'
      + '</div>'
      // Satır 6: Ağırlık + Paket
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">NET AĞIRLIK (kg)</div><input class="fi" type="number" id="ud-netW" value="' + (u?.netWeight || '') + '"></div>'
        + '<div><div class="fl">BRÜT AĞIRLIK (kg)</div><input class="fi" type="number" id="ud-grossW" value="' + (u?.grossWeight || '') + '"></div>'
        + '<div><div class="fl">EN (cm)</div><input class="fi" type="number" id="ud-pkgW" value="' + (u?.pkgWidth || '') + '"></div>'
        + '<div><div class="fl">BOY (cm)</div><input class="fi" type="number" id="ud-pkgL" value="' + (u?.pkgLength || '') + '"></div>'
        + '<div><div class="fl">YÜKSEKLİK (cm)</div><input class="fi" type="number" id="ud-pkgH" value="' + (u?.pkgHeight || '') + '"></div>'
      + '</div>'
      // Teknik açıklama + Not
      + '<div><div class="fl">TEKNİK AÇIKLAMA</div><textarea class="fi" id="ud-techDesc" rows="2" style="resize:none">' + (u?.techDesc || '') + '</textarea></div>'
      + '<div><div class="fl">DUAY ÖZEL NOT</div><textarea class="fi" id="ud-note" rows="2" style="resize:none">' + (u?.note || '') + '</textarea></div>'
      // Görsel
      + '<div><div class="fl">ÜRÜN GÖRSELİ</div><input type="file" id="ud-img" accept=".jpg,.jpeg,.png,.webp" style="font-size:11px">' + (u?.image ? '<div style="margin-top:4px;font-size:10px;color:var(--ac)">📎 Görsel mevcut</div>' : '') + '</div>'
      + '<input type="hidden" id="ud-eid" value="' + (u?.id || '') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-urun-db\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveUrunDB?.()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });

  // Duay kodu otomatik üret
  if (!u) {
    var _autoCode = function() {
      var v = document.getElementById('ud-vendor')?.value || '';
      var c = document.getElementById('ud-vendorCode')?.value || '';
      var el = document.getElementById('ud-duayCode');
      if (el) el.value = _generateDuayCode(v, c);
    };
    document.getElementById('ud-vendor')?.addEventListener('change', _autoCode);
    document.getElementById('ud-vendorCode')?.addEventListener('input', _autoCode);
  }
}

/**
 * Ürün kaydet.
 */
window._saveUrunDB = function() {
  var duayName = (document.getElementById('ud-duayName')?.value || '').trim();
  var vendorCode = (document.getElementById('ud-vendorCode')?.value || '').trim();
  var vendor = document.getElementById('ud-vendor')?.value || '';
  if (!duayName) { window.toast?.('Ürün adı zorunlu', 'err'); return; }
  if (!vendorCode) { window.toast?.('Satıcı ürün kodu zorunlu', 'err'); return; }

  var eid = parseInt(document.getElementById('ud-eid')?.value || '0');
  var duayCode = document.getElementById('ud-duayCode')?.value || _generateDuayCode(vendor, vendorCode);

  // Unique kontrol
  var data = loadUrunDB();
  var dup = data.find(function(x) { return x.duayCode === duayCode && x.id !== eid; });
  if (dup) { window.toast?.('Bu Duay kodu zaten var: ' + duayCode, 'err'); return; }

  var entry = {
    vendorName: vendor, vendorClass: document.getElementById('ud-vendorClass')?.value || '',
    vendorCode: vendorCode, duayCode: duayCode,
    duayName: duayName, origName: document.getElementById('ud-origName')?.value || '',
    stdName: document.getElementById('ud-stdName')?.value || '',
    invoiceName: document.getElementById('ud-invoiceName')?.value || '',
    customsDesc: document.getElementById('ud-customsDesc')?.value || '',
    techDesc: document.getElementById('ud-techDesc')?.value || '',
    category: document.getElementById('ud-category')?.value || '',
    brand: document.getElementById('ud-brand')?.value || '',
    color: document.getElementById('ud-color')?.value || '',
    origin: document.getElementById('ud-origin')?.value || '',
    gtip: document.getElementById('ud-gtip')?.value || '',
    taxRate: parseFloat(document.getElementById('ud-taxRate')?.value || '0') || 0,
    unit: document.getElementById('ud-unit')?.value || 'Adet',
    dib: document.getElementById('ud-dib')?.value || 'H',
    imo: document.getElementById('ud-imo')?.value || 'H',
    netWeight: parseFloat(document.getElementById('ud-netW')?.value || '0') || 0,
    grossWeight: parseFloat(document.getElementById('ud-grossW')?.value || '0') || 0,
    pkgWidth: parseFloat(document.getElementById('ud-pkgW')?.value || '0') || 0,
    pkgLength: parseFloat(document.getElementById('ud-pkgL')?.value || '0') || 0,
    pkgHeight: parseFloat(document.getElementById('ud-pkgH')?.value || '0') || 0,
    note: document.getElementById('ud-note')?.value || '',
    updatedAt: new Date().toISOString(),
  };

  if (eid) {
    var existing = data.find(function(x) { return x.id === eid; });
    if (existing) { entry.changeLog = (existing.changeLog || []).concat([{ ts: new Date().toISOString(), by: window.Auth?.getCU?.()?.name }]); Object.assign(existing, entry); }
  } else {
    entry.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
    entry.createdAt = new Date().toISOString();
    entry.createdBy = window.Auth?.getCU?.()?.id;
    entry.changeLog = [];
    data.unshift(entry);
  }

  // Görsel
  var imgFile = document.getElementById('ud-img');
  if (imgFile?.files?.[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var item = data.find(function(x) { return x.duayCode === duayCode; });
      if (item) item.image = e.target.result;
      storeUrunDB(data);
      document.getElementById('mo-urun-db')?.remove();
      window.renderUrunDB?.();
      window.toast?.('Ürün kaydedildi ✓', 'ok');
    };
    reader.readAsDataURL(imgFile.files[0]);
  } else {
    storeUrunDB(data);
    document.getElementById('mo-urun-db')?.remove();
    window.renderUrunDB?.();
    window.toast?.('Ürün kaydedildi ✓', 'ok');
  }
};

/**
 * Ürün listesi render.
 */
function renderUrunDB() {
  var panel = document.getElementById('panel-urun-db');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">🗃️ Ürün Veritabanı</div><div style="font-size:10px;color:var(--t3)">Ürün tanımları, kodlar, teknik bilgiler</div></div>'
      + '<div style="display:flex;gap:6px"><button class="btn btns" onclick="window._exportUrunXlsx?.()" style="font-size:11px">⬇ Excel</button><button class="btn btns" onclick="window._importUrunXlsx?.()" style="font-size:11px">📥 İçe Aktar</button><button class="btn btnp" onclick="openUrunModal(null)" style="font-size:12px">+ Ürün Ekle</button></div>'
    + '</div>'
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;background:var(--s2)">'
      + '<input class="fi" id="udb-search" placeholder="🔍 Ürün adı, kod, kategori..." oninput="renderUrunDB()" style="font-size:11px;flex:1">'
    + '</div>'
    + '<div id="udb-list" style="overflow-x:auto"></div>';
  }

  var data = loadUrunDB();
  var search = (document.getElementById('udb-search')?.value || '').toLowerCase();
  var fl = data.filter(function(u) {
    if (!search) return true;
    return (u.duayName || '').toLowerCase().includes(search) || (u.duayCode || '').toLowerCase().includes(search) || (u.vendorCode || '').toLowerCase().includes(search) || (u.category || '').toLowerCase().includes(search) || (u.vendorName || '').toLowerCase().includes(search);
  });

  var cont = document.getElementById('udb-list');
  if (!cont) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px">🗃️</div><div style="margin-top:8px">Ürün bulunamadı</div></div>';
    return;
  }

  var html = '<div style="display:grid;grid-template-columns:60px 100px 120px 1fr 80px 80px 80px 90px;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;min-width:800px">'
    + '<div>Görsel</div><div>Duay Kodu</div><div>Satıcı Kodu</div><div>Ürün Adı</div><div>Kategori</div><div>Menşei</div><div>GTİP</div><div>İşlem</div></div>';

  fl.forEach(function(u) {
    html += '<div style="display:grid;grid-template-columns:60px 100px 120px 1fr 80px 80px 80px 90px;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px;min-width:800px;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'">'
      + '<div>' + (u.image ? '<img src="' + u.image + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px">' : '<div style="width:40px;height:40px;background:var(--s2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px">📦</div>') + '</div>'
      + '<div style="font-family:monospace;font-weight:600;color:var(--ac)">' + esc(u.duayCode || '—') + '</div>'
      + '<div style="font-family:monospace;color:var(--t3)">' + esc(u.vendorCode || '—') + '</div>'
      + '<div style="font-weight:500">' + esc(u.duayName || '—') + '<div style="font-size:9px;color:var(--t3)">' + esc(u.vendorName || '') + '</div></div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.category || '—') + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.origin || '—') + '</div>'
      + '<div style="font-size:10px;font-family:monospace;color:var(--t3)">' + esc(u.gtip || '—') + '</div>'
      + '<div style="display:flex;gap:3px"><button onclick="openUrunModal(' + u.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">✏️</button><button onclick="window._deleteUrun?.(' + u.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">🗑</button></div>'
    + '</div>';
  });
  cont.innerHTML = html;
}

window._deleteUrun = function(id) {
  window.confirmModal?.('Bu ürünü silmek istediğinizden emin misiniz?', {
    title: 'Ürün Sil', danger: true, confirmText: 'Evet',
    onConfirm: function() { storeUrunDB(loadUrunDB().filter(function(x) { return x.id !== id; })); renderUrunDB(); window.toast?.('Silindi', 'ok'); }
  });
};

window._exportUrunXlsx = function() {
  var data = loadUrunDB();
  if (!data.length || typeof XLSX === 'undefined') { window.toast?.('Veri veya XLSX yok', 'err'); return; }
  var ws = XLSX.utils.json_to_sheet(data.map(function(u) { var o = Object.assign({}, u); delete o.image; delete o.changeLog; return o; }));
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Urunler');
  XLSX.writeFile(wb, 'UrunDB_' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

window._importUrunXlsx = function() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
  inp.onchange = function() {
    var file = inp.files[0]; if (!file || typeof XLSX === 'undefined') return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var wb = XLSX.read(e.target.result, { type: 'binary' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      var data = loadUrunDB(); var added = 0;
      rows.forEach(function(r) {
        if (!r.duayName && !r['Duay Ürün Adı']) return;
        data.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now() + added,
          duayName: r.duayName || r['Duay Ürün Adı'] || '', duayCode: r.duayCode || r['Duay Kodu'] || _generateDuayCode(r.vendorName || '', r.vendorCode || ''),
          vendorName: r.vendorName || r['Satıcı'] || '', vendorCode: r.vendorCode || r['Satıcı Kodu'] || '',
          category: r.category || r['Kategori'] || '', origin: r.origin || r['Menşei'] || '',
          gtip: r.gtip || r['GTİP'] || '', unit: r.unit || 'Adet',
          createdAt: new Date().toISOString(), changeLog: [],
        }); added++;
      });
      storeUrunDB(data); renderUrunDB();
      window.toast?.('📥 ' + added + ' ürün içe aktarıldı', 'ok');
    };
    reader.readAsBinaryString(file);
  };
  inp.click();
};

// Exports
window.loadUrunDB    = loadUrunDB;
window.storeUrunDB   = storeUrunDB;
window.openUrunModal = openUrunModal;
window.renderUrunDB  = renderUrunDB;
