/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/satis_teklif.js  —  v1.0.0
 * Satış Teklif Modülü — Proforma Invoice
 * localStorage: ak_satis_teklif1
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

var ST_KEY = 'ak_satis_teklif1';
var ST_CURRENCIES = ['TRY','USD','EUR','GBP','JPY','CNY','AED','XAU','BTC'];
var ST_INCOTERMS = ['EXW','FOB','CFR','CIF','DDP','FCA','CPT','CIP','DAP','DPU'];

function _loadST() { try { return JSON.parse(localStorage.getItem(ST_KEY) || '[]'); } catch(e) { return []; } }
function _storeST(d) { localStorage.setItem(ST_KEY, JSON.stringify(d)); }

function _generateTeklifNo() {
  var year = new Date().getFullYear();
  var prefix = 'TKF-' + year + '-';
  var existing = _loadST();
  var maxNum = 0;
  existing.forEach(function(t) { var n = parseInt((t.teklifNo || '').replace(prefix, '')) || 0; if (n > maxNum) maxNum = n; });
  return prefix + String(maxNum + 1).padStart(6, '0');
}

/**
 * Teklif listesi render.
 */
function renderSatisTeklif() {
  var panel = document.getElementById('panel-satis-teklif');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);position:sticky;top:0;z-index:200">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">📤 Satış Teklifleri</div><div style="font-size:10px;color:var(--t3)">Proforma Invoice yönetimi</div></div>'
      + '<div style="display:flex;gap:6px"><button id="stek-toplu-sil-btn" onclick="event.stopPropagation();window._stekTopluSil()" class="btn btns btnd" style="font-size:11px;display:none">Seçilenleri Sil</button><button class="btn btns" onclick="window._exportSTXlsx?.()" style="font-size:11px">⬇ Excel</button><button class="btn btnp" onclick="window._openSTModal?.(null)" style="font-size:12px;font-weight:600">+ Yeni Teklif</button></div>'
    + '</div>'
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;background:var(--s2)">'
      + '<input class="fi" id="st-search" placeholder="🔍 Teklif no, müşteri ara..." oninput="renderSatisTeklif()" style="font-size:11px;flex:1">'
    + '</div>'
    + '<div id="st-list"></div>';
  }

  var data = _loadST();
  var search = (document.getElementById('st-search')?.value || '').toLowerCase();
  var fl = data.filter(function(t) {
    if (!search) return true;
    return (t.teklifNo || '').toLowerCase().includes(search) || (t.customerName || '').toLowerCase().includes(search) || (t.jobId || '').toLowerCase().includes(search) || (t.currency || '').toLowerCase().includes(search) || (t.incoterm || '').toLowerCase().includes(search);
  }).sort(function(a, b) { return (b.id || 0) - (a.id || 0); });

  var cont = document.getElementById('st-list');
  if (!cont) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  /* Sayfalama */
  if (!window._stekSayfa) window._stekSayfa = 1;
  if (search) window._stekSayfa = 1;
  var STEK_SAYFA_BOYUT = 50;
  var stToplamSayfa = Math.max(1, Math.ceil(fl.length / STEK_SAYFA_BOYUT));
  if (window._stekSayfa > stToplamSayfa) window._stekSayfa = stToplamSayfa;
  var stBaslangic = (window._stekSayfa - 1) * STEK_SAYFA_BOYUT;
  var sayfaListe = fl.slice(stBaslangic, stBaslangic + STEK_SAYFA_BOYUT);

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px">📤</div><div style="margin-top:8px">Teklif bulunamadı</div><button class="btn btnp" onclick="window._openSTModal?.(null)" style="margin-top:12px;font-size:12px">+ İlk Teklifi Oluştur</button></div>';
    return;
  }

  var html = '<div style="display:grid;grid-template-columns:28px 120px 1fr 100px 80px 90px 120px;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;position:sticky;top:0;z-index:2">'
    + '<div><input type="checkbox" onchange="event.stopPropagation();window._stekTopluChk(this.checked)"></div><div>Teklif No</div><div>Müşteri</div><div>Toplam</div><div>Döviz</div><div>Tarih</div><div>İşlem</div></div>';

  sayfaListe.forEach(function(t) {
    var total = (t.items || []).reduce(function(a, i) { return a + (parseFloat(i.total) || 0); }, 0);
    html += '<div style="display:grid;grid-template-columns:28px 120px 1fr 100px 80px 90px 120px;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'">'
      + '<div onclick="event.stopPropagation()"><input type="checkbox" class="stek-row-chk" data-id="' + t.id + '" onchange="event.stopPropagation();window._stekChkGuncelle()"></div>'
      + '<div style="font-family:monospace;font-weight:600;color:var(--ac)">' + esc(t.teklifNo || '—') + '</div>'
      + '<div style="font-weight:500">' + esc(t.customerName || '—') + '</div>'
      + '<div style="font-weight:700">' + total.toLocaleString('tr-TR') + '</div>'
      + '<div>' + (t.currency || 'USD') + '</div>'
      + '<div style="color:var(--t3)">' + (t.date || '—') + '</div>'
      + '<div style="display:flex;gap:3px">'
        + '<button onclick="event.stopPropagation();window._stPreview?.(' + t.id + ',1)" class="btn btns" style="font-size:10px;padding:2px 6px" title="Standard PDF">📄</button>'
        + '<button onclick="event.stopPropagation();window._openSTModal?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">✏️</button>'
        + '<button onclick="event.stopPropagation();window._copyST?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">📋</button>'
        + '<button onclick="event.stopPropagation();window._deleteST?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">🗑</button>'
      + '</div>'
    + '</div>';
  });
  /* Sayfalama footer */
  if (fl.length > STEK_SAYFA_BOYUT) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:11px;border-top:1px solid var(--b);background:var(--s2)">';
    html += '<span style="color:var(--t2)">' + (stBaslangic + 1) + '–' + Math.min(stBaslangic + STEK_SAYFA_BOYUT, fl.length) + ' / ' + fl.length + ' teklif</span>';
    html += '<div style="margin-left:auto;display:flex;gap:4px">';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._stekSayfa=Math.max(1,window._stekSayfa-1);renderSatisTeklif()" style="font-size:10px;padding:3px 8px"' + (window._stekSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    for (var spi = 1; spi <= Math.min(stToplamSayfa, 7); spi++) { html += '<button class="btn ' + (spi === window._stekSayfa ? 'btnp' : 'btns') + '" onclick="event.stopPropagation();window._stekSayfa=' + spi + ';renderSatisTeklif()" style="font-size:10px;padding:3px 8px">' + spi + '</button>'; }
    if (stToplamSayfa > 7) html += '<span style="color:var(--t3)">... ' + stToplamSayfa + '</span>';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._stekSayfa=Math.min(' + stToplamSayfa + ',window._stekSayfa+1);renderSatisTeklif()" style="font-size:10px;padding:3px 8px"' + (window._stekSayfa >= stToplamSayfa ? ' disabled' : '') + '>\u2192</button>';
    html += '</div></div>';
  }

  cont.innerHTML = html;
}

/**
 * Teklif formu modalı.
 */
window._openSTModal = function(id) {
  var old = document.getElementById('mo-satis-teklif'); if (old) old.remove();
  var data = _loadST();
  var t = id ? data.find(function(x) { return x.id === id; }) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  // Müşteri listesi (sadece müşteri tipindeki cariler)
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c) { return c.type === 'musteri' || !c.type; }) : [];
  var custOpts = '<option value="">— Müşteri Seçin —</option>' + cariList.map(function(c) { return '<option value="' + esc(c.name) + '"' + (t?.customerName === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
  var curOpts = ST_CURRENCIES.map(function(c) { return '<option value="' + c + '"' + (t?.currency === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  var incoOpts = ST_INCOTERMS.map(function(i) { return '<option value="' + i + '"' + (t?.incoterm === i ? ' selected' : '') + '>' + i + '</option>'; }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-satis-teklif'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:850px;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">' + (t ? '✏️ Teklif Düzenle' : '+ Yeni Satış Teklifi') + '</div>'
      + '<button onclick="document.getElementById(\'mo-satis-teklif\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px">'
      // Satır 1: Müşteri + Teklif No + Tarih
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">MÜŞTERİ *</div><select class="fi" id="st-customer">' + custOpts + '</select></div>'
        + '<div><div class="fl">TEKLİF NO</div><input class="fi" id="st-no" value="' + (t?.teklifNo || _generateTeklifNo()) + '" readonly style="background:var(--s2);font-family:monospace"></div>'
        + '<div><div class="fl">TARİH</div><input type="date" class="fi" id="st-date" value="' + (t?.date || new Date().toISOString().slice(0, 10)) + '"></div>'
      + '</div>'
      // Satır 2: Geçerlilik + Teslim + İncoterm + Döviz
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">GEÇERLİLİK</div><input type="date" class="fi" id="st-validity" value="' + (t?.validity || '') + '"></div>'
        + '<div><div class="fl">TESLİM SÜRESİ</div><input class="fi" id="st-delivery" value="' + (t?.deliveryTime || '') + '" placeholder="30 gün"></div>'
        + '<div><div class="fl">TESLİM ŞEKLİ</div><select class="fi" id="st-incoterm">' + incoOpts + '</select></div>'
        + '<div><div class="fl">PARA BİRİMİ</div><select class="fi" id="st-currency">' + curOpts + '</select></div>'
      + '</div>'
      // Ürün satırları
      + '<div style="border:1px solid var(--b);border-radius:10px;padding:14px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase">ÜRÜN SATIRLARI</div>'
          + '<button onclick="window._stAddItem?.()" class="btn btns" style="font-size:10px;padding:3px 10px">+ Ürün Ekle</button>'
        + '</div>'
        + '<div id="st-items">' + (function() {
            var items = t?.items || [{ no: 1, code: '', desc: '', qty: 1, unit: 'Adet', price: 0, total: 0 }];
            return items.map(function(item, idx) { return window._stItemRow ? window._stItemRow(item, idx) : ''; }).join('') || '<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px">Ürün ekleyin</div>';
          })()
        + '</div>'
        + '<div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:14px;font-weight:700;color:var(--t)">Toplam: <span id="st-total" style="margin-left:8px;color:var(--ac)">0</span></div>'
      + '</div>'
      // Şartlar + Banka + Not
      + '<div><div class="fl">ŞARTLAR & KOŞULLAR</div><textarea class="fi" id="st-terms" rows="3" style="resize:none">' + (t?.terms || 'Payment: 30% advance, 70% before shipment\nDelivery: Within 30 days after order confirmation\nValidity: 15 days') + '</textarea></div>'
      + '<div><div class="fl">BANKA BİLGİLERİ</div><textarea class="fi" id="st-bank" rows="2" style="resize:none">' + (t?.bankInfo || 'Bank: ...\nIBAN: ...\nSWIFT: ...') + '</textarea></div>'
      + '<div><div class="fl">NOTLAR</div><textarea class="fi" id="st-notes" rows="2" style="resize:none">' + (t?.notes || '') + '</textarea></div>'
      + '<input type="hidden" id="st-eid" value="' + (t?.id || '') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-satis-teklif\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveST?.()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });

  // Ürün satırlarını render et
  setTimeout(function() {
    var items = t?.items || [{ no: 1, code: '', desc: '', qty: 1, unit: 'Adet', price: 0, total: 0 }];
    var cont = document.getElementById('st-items');
    if (cont) cont.innerHTML = items.map(function(item, idx) { return _stItemRowHTML(item, idx); }).join('');
    _stCalcTotal();
  }, 50);
};

function _stItemRowHTML(item, idx) {
  // Ürün dropdown from urun_db
  var urunList = typeof loadUrunDB === 'function' ? loadUrunDB() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var urunOpts = '<option value="">— Ürün Seçin —</option>' + urunList.map(function(u) { return '<option value="' + esc(u.duayCode) + '">' + esc(u.duayCode + ' — ' + u.duayName) + '</option>'; }).join('');

  return '<div class="st-item-row" style="display:grid;grid-template-columns:30px 1fr 1fr 70px 60px 80px 80px 30px;gap:6px;margin-bottom:6px;align-items:center;font-size:11px">'
    + '<div style="color:var(--t3);text-align:center">' + (idx + 1) + '</div>'
    + '<select class="fi st-item-code" style="font-size:11px;padding:4px 6px" onchange="window._stItemSelected?.(this)">' + urunOpts + '</select>'
    + '<input class="fi st-item-desc" placeholder="Açıklama" value="' + (item.desc || '') + '" style="font-size:11px;padding:4px 6px">'
    + '<input type="number" class="fi st-item-qty" placeholder="Adet" value="' + (item.qty || 1) + '" style="font-size:11px;padding:4px 6px" oninput="window._stCalcRow?.(this)">'
    + '<input class="fi st-item-unit" placeholder="Birim" value="' + (item.unit || 'Adet') + '" style="font-size:11px;padding:4px 6px">'
    + '<input type="number" class="fi st-item-price" placeholder="Fiyat" value="' + (item.price || '') + '" style="font-size:11px;padding:4px 6px" oninput="window._stCalcRow?.(this)">'
    + '<div class="st-item-total" style="font-weight:600;text-align:right">' + ((item.qty || 0) * (item.price || 0)).toLocaleString('tr-TR') + '</div>'
    + '<button onclick="this.closest(\'.st-item-row\').remove();_stCalcTotal()" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
  + '</div>';
}

window._stAddItem = function() {
  var cont = document.getElementById('st-items');
  if (!cont) return;
  var count = cont.querySelectorAll('.st-item-row').length;
  cont.insertAdjacentHTML('beforeend', _stItemRowHTML({ no: count + 1, qty: 1, unit: 'Adet' }, count));
};

window._stItemSelected = function(sel) {
  var code = sel.value;
  if (!code) return;
  var urunList = typeof loadUrunDB === 'function' ? loadUrunDB() : [];
  var u = urunList.find(function(x) { return x.duayCode === code; });
  if (!u) return;
  var row = sel.closest('.st-item-row');
  if (!row) return;
  var desc = row.querySelector('.st-item-desc');
  var unit = row.querySelector('.st-item-unit');
  if (desc && !desc.value) desc.value = u.duayName || u.origName || '';
  if (unit) unit.value = u.unit || 'Adet';
};

window._stCalcRow = function(inp) {
  var row = inp.closest('.st-item-row');
  if (!row) return;
  var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
  var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
  var totalEl = row.querySelector('.st-item-total');
  if (totalEl) totalEl.textContent = (qty * price).toLocaleString('tr-TR');
  _stCalcTotal();
};

function _stCalcTotal() {
  var total = 0;
  document.querySelectorAll('.st-item-row').forEach(function(row) {
    var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
    var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
    total += qty * price;
  });
  var el = document.getElementById('st-total');
  if (el) el.textContent = total.toLocaleString('tr-TR');
}

/**
 * Teklif kaydet.
 */
window._saveST = function() {
  var customer = document.getElementById('st-customer')?.value || '';
  if (!customer) { window.toast?.('Müşteri seçin', 'err'); return; }

  var items = [];
  document.querySelectorAll('.st-item-row').forEach(function(row, idx) {
    var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
    var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
    items.push({
      no: idx + 1,
      code: row.querySelector('.st-item-code')?.value || '',
      desc: row.querySelector('.st-item-desc')?.value || '',
      qty: qty, unit: row.querySelector('.st-item-unit')?.value || 'Adet',
      price: price, total: qty * price,
    });
  });

  var eid = parseInt(document.getElementById('st-eid')?.value || '0');
  var entry = {
    teklifNo: document.getElementById('st-no')?.value || _generateTeklifNo(),
    customerName: customer,
    date: document.getElementById('st-date')?.value || '',
    validity: document.getElementById('st-validity')?.value || '',
    deliveryTime: document.getElementById('st-delivery')?.value || '',
    incoterm: document.getElementById('st-incoterm')?.value || 'FOB',
    currency: document.getElementById('st-currency')?.value || 'USD',
    items: items,
    terms: document.getElementById('st-terms')?.value || '',
    bankInfo: document.getElementById('st-bank')?.value || '',
    notes: document.getElementById('st-notes')?.value || '',
    updatedAt: new Date().toISOString(),
  };

  var data = _loadST();
  if (eid) {
    var existing = data.find(function(x) { return x.id === eid; });
    if (existing) Object.assign(existing, entry);
  } else {
    entry.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
    entry.createdAt = new Date().toISOString();
    entry.createdBy = window.Auth?.getCU?.()?.id;
    data.unshift(entry);
  }
  _storeST(data);
  document.getElementById('mo-satis-teklif')?.remove();
  renderSatisTeklif();
  window.toast?.('Teklif kaydedildi ✓', 'ok');
};

/**
 * PDF preview — Duay Standard Format.
 */
window._stPreview = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var total = (t.items || []).reduce(function(a, i) { return a + (i.total || 0); }, 0);

  var w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write('<!DOCTYPE html><html><head><title>Proforma Invoice — ' + esc(t.teklifNo) + '</title>'
    + '<style>body{font-family:"Segoe UI",sans-serif;padding:40px;color:#1a1a2e;max-width:750px;margin:0 auto}'
    + '.hdr{border-bottom:3px solid #1e1b4b;padding-bottom:16px;margin-bottom:20px}'
    + 'table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#1e1b4b;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase}'
    + 'td{border-bottom:1px solid #eee;padding:8px 10px;font-size:12px}'
    + '.total-row{background:#f5f3ff;font-weight:700}'
    + '.section{margin-top:24px;font-size:12px;line-height:1.6}'
    + '.section-title{font-size:11px;font-weight:700;color:#1e1b4b;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}'
    + '@media print{button{display:none!important}}</style></head><body>'
    + '<div class="hdr"><div style="display:flex;justify-content:space-between;align-items:flex-start">'
      + '<div><div style="font-size:22px;font-weight:800;color:#1e1b4b">DUAY GLOBAL LLC</div><div style="font-size:11px;color:#6b7280;margin-top:4px">International Trade & Consulting</div></div>'
      + '<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:#1e1b4b">PROFORMA INVOICE</div><div style="font-size:12px;color:#6b7280;margin-top:4px">REF: ' + esc(t.teklifNo) + '</div><div style="font-size:11px;color:#6b7280">Date: ' + (t.date || '—') + '</div></div>'
    + '</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">'
      + '<div><div class="section-title">TO</div><div style="font-size:13px;font-weight:600">' + esc(t.customerName) + '</div></div>'
      + '<div><div class="section-title">DETAILS</div><div style="font-size:11px">Incoterm: <b>' + (t.incoterm || 'FOB') + '</b><br>Currency: <b>' + (t.currency || 'USD') + '</b><br>Delivery: ' + esc(t.deliveryTime || '—') + '<br>Validity: ' + (t.validity || '—') + '</div></div>'
    + '</div>'
    + '<table><tr><th>NO</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>UNIT PRICE</th><th>TOTAL</th></tr>'
    + (t.items || []).map(function(i) { return '<tr><td>' + i.no + '</td><td>' + esc(i.desc || i.code) + '</td><td>' + (i.qty || 0) + '</td><td>' + (i.unit || '') + '</td><td>' + (i.price || 0).toLocaleString('tr-TR') + '</td><td>' + (i.total || 0).toLocaleString('tr-TR') + '</td></tr>'; }).join('')
    + '<tr class="total-row"><td colspan="5" style="text-align:right">TOTAL</td><td>' + (t.currency || '$') + ' ' + total.toLocaleString('tr-TR') + '</td></tr></table>'
    + (t.terms ? '<div class="section"><div class="section-title">TERMS & CONDITIONS</div><pre style="white-space:pre-wrap;font-family:inherit">' + esc(t.terms) + '</pre></div>' : '')
    + (t.bankInfo ? '<div class="section"><div class="section-title">BANKING DETAILS</div><pre style="white-space:pre-wrap;font-family:inherit">' + esc(t.bankInfo) + '</pre></div>' : '')
    + '<div style="margin-top:30px;text-align:center;font-size:10px;color:#9ca3af">This proforma invoice is for informational purposes only. · Duay Global LLC · ' + new Date().toLocaleDateString('tr-TR') + '</div>'
    + '<div style="margin-top:20px;text-align:center"><button onclick="window.print()" style="padding:10px 24px;background:#1e1b4b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px">🖨 Yazdır / PDF</button></div>'
    + '</body></html>');
  w.document.close();
};

window._copyST = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var copy = JSON.parse(JSON.stringify(t));
  copy.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
  copy.teklifNo = _generateTeklifNo();
  copy.date = new Date().toISOString().slice(0, 10);
  copy.createdAt = new Date().toISOString();
  data.unshift(copy);
  _storeST(data);
  renderSatisTeklif();
  window.toast?.('Teklif kopyalandı: ' + copy.teklifNo, 'ok');
};

window._deleteST = function(id) {
  window.confirmModal?.('Bu teklifi silmek istediğinizden emin misiniz?', {
    title: 'Teklif Sil', danger: true, confirmText: 'Evet',
    onConfirm: function() {
      var liste = _loadST();
      var x = liste.find(function(s) { return String(s.id) === String(id); });
      if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); }
      _storeST(liste);
      renderSatisTeklif();
      window.toast?.('Silindi', 'ok');
    }
  });
};

window._exportSTXlsx = function() {
  var data = _loadST();
  if (!data.length || typeof XLSX === 'undefined') return;
  var rows = [['Teklif No','Müşteri','Tarih','Döviz','İncoterm','Toplam']];
  data.forEach(function(t) { var total = (t.items||[]).reduce(function(a,i){return a+(i.total||0);},0); rows.push([t.teklifNo,t.customerName,t.date,t.currency,t.incoterm,total]); });
  var ws = XLSX.utils.aoa_to_sheet(rows); var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
  XLSX.writeFile(wb, 'SatisTeklif_' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

// Exports
window.renderSatisTeklif = renderSatisTeklif;
window._stekTopluChk = function(c) { document.querySelectorAll('.stek-row-chk').forEach(function(x) { x.checked = c; }); window._stekChkGuncelle(); };
window._stekChkGuncelle = function() { var n = document.querySelectorAll('.stek-row-chk:checked').length; var btn = document.getElementById('stek-toplu-sil-btn'); if (btn) { btn.style.display = n ? 'inline-flex' : 'none'; btn.textContent = n + ' Teklif Sil'; } };
window._stekTopluSil = function() { if (!window._yetkiKontrol?.('toplu_sil')) return; var ids = []; document.querySelectorAll('.stek-row-chk:checked').forEach(function(c) { ids.push(c.dataset.id); }); if (!ids.length) return; window.confirmModal?.(ids.length + ' teklif silinecek?', { danger: true, confirmText: 'Evet Sil', onConfirm: function() { var list = _loadST(); ids.forEach(function(id) { var x = list.find(function(s) { return String(s.id) === String(id); }); if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); } }); _storeST(list); window.toast?.(ids.length + ' teklif silindi', 'ok'); renderSatisTeklif(); } }); };
window._openSTModal = window._openSTModal;
window._stItemRow = _stItemRowHTML;
