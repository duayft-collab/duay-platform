/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/satin_alma.js  —  v1.0.0
 * Satın Alma Merkezi — PI Takip + Otomatik Hesaplama + Onay + Ödeme Entegrasyonu
 *
 * localStorage key: ak_satinalma1
 * Firestore sync:   duay_tenant_default/satinalma
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const SA_KEY = 'ak_satinalma1';
const SA_CURRENCIES = { USD: '$', EUR: '€', TRY: '₺' };
const SA_STATUS = {
  draft:           { l: 'Taslak',           c: '#6B7280', bg: 'rgba(107,114,128,.08)' },
  pending:         { l: 'Onay Bekliyor',    c: '#D97706', bg: 'rgba(245,158,11,.08)' },
  approved:        { l: 'Onaylandı',        c: '#16A34A', bg: 'rgba(34,197,94,.08)'  },
  rejected:        { l: 'Reddedildi',       c: '#DC2626', bg: 'rgba(239,68,68,.08)'  },
  revize_gerekli:  { l: 'Revize Gerekli',   c: '#EA580C', bg: 'rgba(234,88,12,.08)' },
  paid:            { l: 'Ödendi',           c: '#6366F1', bg: 'rgba(99,102,241,.08)' },
};

// ── Yardımcılar ─────────────────────────────────────────────────
const _gSA    = window.g;
const _isAdmSA = () => ['admin', 'manager'].includes(window.Auth?.getCU?.()?.role);
const _cuSA    = () => window.Auth?.getCU?.();
const _nowSA   = () => typeof nowTs === 'function' ? nowTs() : new Date().toISOString();
const _fmtSA   = (n, cur) => (SA_CURRENCIES[cur] || '') + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Veri ─────────────────────────────────────────────────────────
function _loadSA() { try { return JSON.parse(localStorage.getItem(SA_KEY) || '[]'); } catch (e) { return []; } }
function _storeSA(d) {
  localStorage.setItem(SA_KEY, JSON.stringify(d));
  // Firestore sync
  try {
    var FB_DB = window.Auth?.getFBDB?.();
    if (FB_DB) {
      var tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
      FB_DB.collection('duay_' + tid).doc('satinalma').set({ data: d, syncedAt: new Date().toISOString() }, { merge: true }).catch(function() {});
    }
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════
// PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectSAPanel() {
  var panel = document.getElementById('panel-satinalma');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = ''
    // TOPBAR
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">'
      + '<div>'
        + '<div style="font-size:14px;font-weight:700;color:var(--t)">🛒 Satın Alma Merkezi</div>'
        + '<div style="font-size:10px;color:var(--t3)" id="sa-sub">PI & Sipariş Takip</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;align-items:center">'
        + '<button class="btn btns" onclick="window._openSAImport?.()" style="font-size:11px">📥 İçe Aktar</button>'
        + '<button class="btn btns" onclick="window._exportSAXlsx?.()" style="font-size:11px">⬇ Excel</button>'
        + '<button class="btn btns" onclick="window._saAddInlineRow?.()" style="font-size:11px">📊 Tabloya Ekle</button>'
        + '<button class="btn btnp" onclick="window._openSAModal?.(null)" style="font-size:12px;font-weight:600">+ Yeni Sipariş</button>'
      + '</div>'
    + '</div>'

    // BENTO METRİKLER
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b)">'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Sipariş</div>'
        + '<div style="font-size:22px;font-weight:600;color:var(--t)" id="sa-stat-total">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">⏳ Onay Bekliyor</div>'
        + '<div style="font-size:22px;font-weight:600;color:#D97706" id="sa-stat-pending">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">✅ Onaylanan</div>'
        + '<div style="font-size:22px;font-weight:600;color:#16A34A" id="sa-stat-approved">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Tutar</div>'
        + '<div style="font-size:22px;font-weight:600;color:var(--ac)" id="sa-stat-amount">$0</div>'
      + '</div>'
    + '</div>'

    // FİLTRE SATIRI
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--s2)">'
      + '<input class="fi" id="sa-search" placeholder="🔍 PI No, İş ID ara..." oninput="window.renderSatinAlma?.()" style="font-size:11px;flex:1;min-width:140px">'
      + '<select class="fi" id="sa-cur-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:90px">'
        + '<option value="">Tüm Döviz</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="TRY">₺ TRY</option>'
      + '</select>'
      + '<select class="fi" id="sa-status-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:120px">'
        + '<option value="">Tüm Durum</option>'
        + '<option value="pending">⏳ Bekliyor</option><option value="approved">✅ Onaylı</option><option value="rejected">❌ Red</option><option value="paid">💸 Ödendi</option>'
      + '</select>'
    + '</div>'

    // TABLO BAŞLIK
    + '<div style="display:grid;grid-template-columns:80px 90px 90px 90px 100px 80px 90px 80px 80px 100px;gap:0;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b);overflow-x:auto">'
      + ['İş ID','PI No','PI Tarihi','Toplam','Avans','Avans %','Kalan','Döviz','Durum','İşlem'].map(function(h) {
          return '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">' + h + '</div>';
        }).join('')
    + '</div>'

    // LİSTE
    + '<div id="sa-list" style="overflow-x:auto"></div>';
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

function renderSatinAlma() {
  _injectSAPanel();
  var all   = _loadSA();
  var search = (document.getElementById('sa-search')?.value || '').toLowerCase();
  var curF   = document.getElementById('sa-cur-f')?.value || '';
  var statF  = document.getElementById('sa-status-f')?.value || '';

  // İstatistikler
  var el = function(id) { var e = document.getElementById(id); return e; };
  var totalAmt = all.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).reduce(function(a, s) { return a + (parseFloat(s.totalAmount) || 0); }, 0);
  if (el('sa-stat-total'))    el('sa-stat-total').textContent    = all.length;
  if (el('sa-stat-pending'))  el('sa-stat-pending').textContent  = all.filter(function(s) { return s.status === 'pending'; }).length;
  if (el('sa-stat-approved')) el('sa-stat-approved').textContent = all.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).length;
  if (el('sa-stat-amount'))   el('sa-stat-amount').textContent   = '$' + Math.round(totalAmt).toLocaleString('tr-TR');

  // Filtrele
  var fl = all.filter(function(s) {
    if (curF && s.currency !== curF) return false;
    if (statF && s.status !== statF) return false;
    if (search && !((s.jobId || '').toLowerCase().includes(search) || (s.piNo || '').toLowerCase().includes(search) || (s.exportId || '').toLowerCase().includes(search))) return false;
    return true;
  }).sort(function(a, b) { return (b.id || 0) - (a.id || 0); });

  var cont = document.getElementById('sa-list');
  if (!cont) return;

  var _inpSt = 'font-size:11px;padding:3px 6px;border:1px solid var(--b);border-radius:4px;background:var(--s);color:var(--t);font-family:inherit;width:100%;box-sizing:border-box';
  var _inpEr = 'border-color:#EF4444;background:rgba(239,68,68,.04)';
  var _GRID  = 'display:grid;grid-template-columns:80px 90px 90px 90px 100px 80px 90px 80px 80px 100px;gap:0;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px';

  if (!fl.length && !document.getElementById('sa-inline-new')) {
    cont.innerHTML = '<div style="padding:48px;text-align:center;color:var(--t3)">'
      + '<div style="font-size:32px;margin-bottom:8px">🛒</div>'
      + '<div style="font-size:13px;margin-bottom:12px">Sipariş bulunamadı</div>'
      + '<button class="btn btnp" onclick="window._openSAModal?.(null)" style="font-size:12px">+ Yeni Sipariş</button>'
      + ' <button class="btn btns" onclick="window._saAddInlineRow?.()" style="font-size:12px">📊 Tabloya Ekle</button>'
    + '</div>';
    return;
  }

  var html = '';
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  fl.forEach(function(s) {
    var st = SA_STATUS[s.status] || SA_STATUS.draft;
    var advAmt = (parseFloat(s.totalAmount) || 0) * (parseFloat(s.advanceRate) || 0) / 100;
    var remaining = (parseFloat(s.totalAmount) || 0) - advAmt;
    var sym = SA_CURRENCIES[s.currency] || '$';

    // Her hücre tıklanınca inline edit
    html += '<div data-said="' + s.id + '" style="' + _GRID + ';cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'">'
      + '<div class="sa-cell" data-field="jobId" onclick="window._saInlineEdit?.(event,' + s.id + ',\'jobId\')" style="font-weight:600;font-family:\'DM Mono\',monospace;color:var(--ac)">' + esc(s.jobId || '—') + '</div>'
      + '<div class="sa-cell" data-field="piNo" onclick="window._saInlineEdit?.(event,' + s.id + ',\'piNo\')" style="font-family:monospace">' + esc(s.piNo || '—') + '</div>'
      + '<div class="sa-cell" data-field="piDate" onclick="window._saInlineEdit?.(event,' + s.id + ',\'piDate\')" style="color:var(--t3)">' + (s.piDate || '—') + '</div>'
      + '<div class="sa-cell" data-field="totalAmount" onclick="window._saInlineEdit?.(event,' + s.id + ',\'totalAmount\')" style="font-weight:700;color:var(--t)">' + sym + Number(s.totalAmount || 0).toLocaleString('tr-TR') + '</div>'
      + '<div style="color:#D97706;font-weight:600">' + sym + Math.round(advAmt).toLocaleString('tr-TR') + '</div>'
      + '<div class="sa-cell" data-field="advanceRate" onclick="window._saInlineEdit?.(event,' + s.id + ',\'advanceRate\')" style="color:var(--t3)">%' + (s.advanceRate || 0) + '</div>'
      + '<div style="color:#6366F1;font-weight:600">' + sym + Math.round(remaining).toLocaleString('tr-TR') + '</div>'
      + '<div>' + (s.currency || 'USD') + '</div>'
      + '<div><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span></div>'
      + '<div style="display:flex;gap:3px" onclick="event.stopPropagation()">'
        + (_isAdmSA() && s.status === 'pending' ? '<button onclick="window._approveSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#16A34A">✓</button>' : '')
        + (_isAdmSA() && s.status === 'pending' ? '<button onclick="window._rejectSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">✗</button>' : '')
        + '<button onclick="window._openSADetail?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">👁</button>'
        + '<button onclick="window._saInlineEditRow?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px" title="Inline düzenle">✏️</button>'
        + '<button onclick="window._saInlineFiles?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">📎</button>'
        + '<button onclick="window._deleteSA?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626" title="Sil">🗑</button>'
      + '</div>'
    + '</div>';
  });

  // Inline yeni satır varsa koru
  var inlineEl = document.getElementById('sa-inline-new');
  cont.innerHTML = html;
  if (inlineEl) cont.appendChild(inlineEl);
}

// ════════════════════════════════════════════════════════════════
// INLINE TABLO GİRİŞİ
// ════════════════════════════════════════════════════════════════

var _SA_INLINE_STYLE = 'font-size:11px;padding:3px 5px;border:1px solid var(--b);border-radius:4px;background:var(--s);color:var(--t);font-family:inherit;width:100%;box-sizing:border-box';
var _SA_GRID_COLS = 'display:grid;grid-template-columns:80px 90px 90px 90px 100px 80px 90px 80px 80px 100px;gap:0;padding:6px 16px;align-items:center';

/**
 * Listenin altına boş inline satır ekler.
 */
window._saAddInlineRow = function() {
  if (document.getElementById('sa-inline-new')) {
    document.getElementById('sa-inline-new')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  var cont = document.getElementById('sa-list');
  if (!cont) { renderSatinAlma(); cont = document.getElementById('sa-list'); }
  if (!cont) return;

  var IS = _SA_INLINE_STYLE;
  var row = document.createElement('div');
  row.id = 'sa-inline-new';
  row.style.cssText = 'overflow-x:auto;border:2px solid rgba(99,102,241,.2);background:rgba(99,102,241,.04);border-radius:0 0 8px 8px';

  row.innerHTML = ''
    + '<div style="display:flex;gap:0;min-width:1700px;align-items:center">'
      // İş ID
      + '<div style="width:90px;padding:6px 4px"><input id="sai-jobId" style="' + IS + '" placeholder="JOB-001" tabindex="1"></div>'
      // Satıcı
      + '<div style="width:110px;padding:6px 4px"><input id="sai-supplier" style="' + IS + '" placeholder="Satıcı" tabindex="2"></div>'
      // İş Başlama
      + '<div style="width:110px;padding:6px 4px"><input type="date" id="sai-jobDate" style="' + IS + '" tabindex="3"></div>'
      // PI Tarihi
      + '<div style="width:110px;padding:6px 4px"><input type="date" id="sai-piDate" style="' + IS + '" tabindex="4"></div>'
      // KDV
      + '<div style="width:80px;padding:6px 4px"><input type="number" id="sai-kdv" style="' + IS + '" placeholder="KDV" tabindex="5"></div>'
      // Toplam
      + '<div style="width:100px;padding:6px 4px"><input type="number" id="sai-total" style="' + IS + '" placeholder="Toplam" oninput="window._saInlineCalc?.()" tabindex="6"></div>'
      // Döviz
      + '<div style="width:70px;padding:6px 4px"><select id="sai-currency" style="' + IS + '" tabindex="7"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option></select></div>'
      // Teslimat
      + '<div style="width:110px;padding:6px 4px"><input type="date" id="sai-delivery" style="' + IS + '" tabindex="8"></div>'
      // Avans %
      + '<div style="width:70px;padding:6px 4px"><input type="number" id="sai-advRate" style="' + IS + '" placeholder="%" min="0" max="100" oninput="window._saInlineCalc?.()" tabindex="9"></div>'
      // Avans Tutarı (hesaplanan)
      + '<div id="sai-advAmt" style="width:90px;padding:6px 4px;font-size:10px;color:#D97706;font-weight:600">—</div>'
      // Kalan (hesaplanan)
      + '<div id="sai-remaining" style="width:90px;padding:6px 4px;font-size:10px;color:#6366F1;font-weight:600">—</div>'
      // Vade
      + '<div style="width:110px;padding:6px 4px"><input type="date" id="sai-vade" style="' + IS + '" tabindex="10"></div>'
      // Müşteri Sipariş No
      + '<div style="width:100px;padding:6px 4px"><input id="sai-custOrder" style="' + IS + '" placeholder="CST-001" tabindex="11"></div>'
      // Sipariş Onay Tarihi
      + '<div style="width:110px;padding:6px 4px"><input type="date" id="sai-orderDate" style="' + IS + '" tabindex="12"></div>'
      // Teslimat Yeri
      + '<div style="width:110px;padding:6px 4px"><input id="sai-delPlace" style="' + IS + '" placeholder="Liman..." tabindex="13"></div>'
      // Açıklama
      + '<div style="width:120px;padding:6px 4px"><input id="sai-notes" style="' + IS + '" placeholder="Not..." tabindex="14"></div>'
      // Butonlar
      + '<div style="width:90px;padding:6px 4px;display:flex;gap:3px;flex-shrink:0">'
        + '<button onclick="window._saInlineSave?.()" class="btn btnp" style="font-size:10px;padding:3px 8px" title="Kaydet">✓</button>'
        + '<button onclick="document.getElementById(\'sa-inline-new\')?.remove()" class="btn btns" style="font-size:10px;padding:3px 6px" title="İptal">✗</button>'
      + '</div>'
    + '</div>';

  // Enter/Escape
  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._saInlineSave?.(); }
    if (e.key === 'Escape') { row.remove(); }
  });

  cont.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth' });
  setTimeout(function() { document.getElementById('sai-jobId')?.focus(); }, 100);
};

/**
 * Inline satır hesaplama — avans tutarı + kalan.
 */
window._saInlineCalc = function() {
  var total = parseFloat(document.getElementById('sai-total')?.value || '0') || 0;
  var rate  = parseFloat(document.getElementById('sai-advRate')?.value || '0') || 0;
  var adv   = Math.round(total * rate / 100 * 100) / 100;
  var rem   = Math.round((total - adv) * 100) / 100;
  var cur   = document.getElementById('sai-currency')?.value || 'USD';
  var sym   = SA_CURRENCIES[cur] || '$';
  var advEl = document.getElementById('sai-advAmt');
  var remEl = document.getElementById('sai-remaining');
  if (advEl) advEl.textContent = sym + adv.toLocaleString('tr-TR');
  if (remEl) remEl.textContent = sym + rem.toLocaleString('tr-TR');
};

/**
 * Inline satırdan kaydet — tüm form alanları.
 */
window._saInlineSave = function() {
  var jobId     = (document.getElementById('sai-jobId')?.value || '').trim();
  var supplier  = (document.getElementById('sai-supplier')?.value || '').trim();
  var piDate    = document.getElementById('sai-piDate')?.value || '';
  var total     = parseFloat(document.getElementById('sai-total')?.value || '0') || 0;
  var advRate   = parseFloat(document.getElementById('sai-advRate')?.value || '0') || 0;
  var currency  = document.getElementById('sai-currency')?.value || 'USD';
  var kdv       = parseFloat(document.getElementById('sai-kdv')?.value || '0') || 0;
  var delivery  = document.getElementById('sai-delivery')?.value || '';
  var vade      = document.getElementById('sai-vade')?.value || '';
  var jobDate   = document.getElementById('sai-jobDate')?.value || '';

  // Doğrulama — hatalı hücreleri kırmızı yap
  var errs = [];
  var _markErr = function(id, bad) {
    var el = document.getElementById(id);
    if (el) el.style.cssText = _SA_INLINE_STYLE + (bad ? ';border-color:#EF4444;background:rgba(239,68,68,.04)' : '');
  };
  _markErr('sai-jobId',    !jobId);    if (!jobId)    errs.push('İş ID');
  _markErr('sai-supplier', !supplier); if (!supplier) errs.push('Satıcı');
  _markErr('sai-piDate',   !piDate);   if (!piDate)   errs.push('PI Tarihi');
  _markErr('sai-total',    !total);    if (!total)     errs.push('Toplam');

  if (errs.length) { window.toast?.('Zorunlu: ' + errs.join(', '), 'err'); return; }

  var advAmt = Math.round(total * advRate / 100 * 100) / 100;
  var d = _loadSA();
  var entry = {
    id: generateNumericId(),
    jobId: jobId, supplier: supplier, piNo: supplier,
    jobDate: jobDate || piDate, piDate: piDate,
    kdv: kdv, totalAmount: total,
    currency: currency, advanceRate: advRate,
    advanceAmount: advAmt,
    remainingAmount: Math.round((total - advAmt) * 100) / 100,
    deliveryDate: delivery, vadeDate: vade,
    customerOrderNo: (document.getElementById('sai-custOrder')?.value || '').trim(),
    orderDate: document.getElementById('sai-orderDate')?.value || '',
    deliveryPlace: (document.getElementById('sai-delPlace')?.value || '').trim(),
    deliveryOwner: 'alici',
    notes: (document.getElementById('sai-notes')?.value || '').trim(),
    status: _isAdmSA() ? 'approved' : 'pending',
    createdAt: _nowSA(), createdBy: _cuSA()?.id,
    vendor: { name: '', country: '', contact: '', phone: '', email: '', address: '', tax: '' },
  };
  d.unshift(entry);
  _storeSA(d);
  document.getElementById('sa-inline-new')?.remove();
  renderSatinAlma();
  window.toast?.('Satır eklendi ✓ — Dosya eklemek için 📎 butonunu kullanın', 'ok');
  window.logActivity?.('view', 'Satınalma inline eklendi: ' + supplier);
  _saCreatePayments(entry);

  if (!_isAdmSA()) {
    var cuName = _cuSA()?.name || '';
    var managers = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
      return (u.role === 'admin' || u.role === 'manager') && u.status === 'active';
    });
    managers.forEach(function(m) {
      window.addNotif?.('🛒', 'Yeni satınalma: ' + piNo + ' — ' + (SA_CURRENCIES[currency] || '') + total + ' (' + cuName + ')', 'warn', 'satinalma', m.id);
    });
  }
};

/**
 * Mevcut hücreyi inline edit'e çevirir.
 */
window._saInlineEdit = function(event, id, field) {
  event.stopPropagation();
  var cell = event.currentTarget;
  if (cell.querySelector('input,select')) return; // zaten edit modda

  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;

  var val = s[field] || '';
  var isNum  = (field === 'totalAmount' || field === 'advanceRate' || field === 'kdv');
  var isDate = (field === 'piDate' || field === 'vadeDate' || field === 'deliveryDate' || field === 'jobDate');
  var origText = cell.textContent;

  var inp = document.createElement('input');
  inp.type  = isNum ? 'number' : (isDate ? 'date' : 'text');
  inp.value = val;
  inp.style.cssText = _SA_INLINE_STYLE;
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { _commitEdit(); }
    if (e.key === 'Escape') { _cancelEdit(); }
  });
  inp.addEventListener('blur', function() { setTimeout(_commitEdit, 150); });

  cell.textContent = '';
  cell.appendChild(inp);
  inp.focus();
  inp.select();

  function _commitEdit() {
    var newVal = inp.value;
    if (isNum) newVal = parseFloat(newVal) || 0;
    if (newVal === val) { _cancelEdit(); return; }
    s[field] = newVal;
    // Avans/kalan yeniden hesapla
    if (field === 'totalAmount' || field === 'advanceRate') {
      s.advanceAmount = Math.round((parseFloat(s.totalAmount) || 0) * (parseFloat(s.advanceRate) || 0) / 100 * 100) / 100;
      s.remainingAmount = Math.round(((parseFloat(s.totalAmount) || 0) - s.advanceAmount) * 100) / 100;
    }
    s.updatedAt = _nowSA();
    s.updatedBy = _cuSA()?.id;
    _storeSA(d);
    renderSatinAlma();
    window.toast?.('Güncellendi ✓', 'ok');
  }
  function _cancelEdit() {
    if (cell.contains(inp)) { cell.textContent = origText; }
  }
};

/**
 * Satırın tamamını inline düzenlemeye çevirir (kalem ikonu).
 */
window._saInlineEditRow = function(id) {
  var row = document.querySelector('[data-said="' + id + '"]');
  if (!row || row.dataset.editing) return;
  row.dataset.editing = '1';
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var IS = _SA_INLINE_STYLE;
  var sym = SA_CURRENCIES[s.currency] || '$';

  row.style.background = 'rgba(99,102,241,.04)';
  row.style.borderColor = 'rgba(99,102,241,.2)';
  row.innerHTML = ''
    + '<div><input id="sae-jobId-' + id + '" value="' + (s.jobId || '') + '" style="' + IS + '" tabindex="1"></div>'
    + '<div><input id="sae-piNo-' + id + '" value="' + (s.piNo || '') + '" style="' + IS + '" tabindex="2"></div>'
    + '<div><input type="date" id="sae-piDate-' + id + '" value="' + (s.piDate || '') + '" style="' + IS + '" tabindex="3"></div>'
    + '<div><input type="number" id="sae-total-' + id + '" value="' + (s.totalAmount || '') + '" style="' + IS + '" tabindex="4" oninput="window._saRowCalc?.(' + id + ')"></div>'
    + '<div id="sae-adv-' + id + '" style="font-size:11px;color:#D97706;font-weight:600;padding:0 4px">' + sym + Math.round(s.advanceAmount || 0).toLocaleString('tr-TR') + '</div>'
    + '<div><input type="number" id="sae-advRate-' + id + '" value="' + (s.advanceRate || '') + '" style="' + IS + '" tabindex="5" oninput="window._saRowCalc?.(' + id + ')"></div>'
    + '<div id="sae-rem-' + id + '" style="font-size:11px;color:#6366F1;font-weight:600;padding:0 4px">' + sym + Math.round(s.remainingAmount || 0).toLocaleString('tr-TR') + '</div>'
    + '<div><select id="sae-cur-' + id + '" style="' + IS + '" tabindex="6"><option value="USD"' + (s.currency === 'USD' ? ' selected' : '') + '>USD</option><option value="EUR"' + (s.currency === 'EUR' ? ' selected' : '') + '>EUR</option><option value="TRY"' + (s.currency === 'TRY' ? ' selected' : '') + '>TRY</option></select></div>'
    + '<div style="font-size:10px;color:var(--t3)">Düzenleniyor</div>'
    + '<div style="display:flex;gap:3px">'
      + '<button onclick="window._saRowSave?.(' + id + ')" class="btn btnp" style="font-size:10px;padding:2px 8px">✓</button>'
      + '<button onclick="renderSatinAlma()" class="btn btns" style="font-size:10px;padding:2px 6px">✗</button>'
      + '<button onclick="window._deleteSA?.(' + id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">🗑</button>'
    + '</div>';

  // Enter/Escape yakalamak için
  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._saRowSave?.(id); }
    if (e.key === 'Escape') { renderSatinAlma(); }
  });
  setTimeout(function() { document.getElementById('sae-jobId-' + id)?.focus(); }, 50);
};

/** Inline düzenleme satır hesaplama. */
window._saRowCalc = function(id) {
  var total = parseFloat(document.getElementById('sae-total-' + id)?.value || '0') || 0;
  var rate  = parseFloat(document.getElementById('sae-advRate-' + id)?.value || '0') || 0;
  var adv   = Math.round(total * rate / 100 * 100) / 100;
  var rem   = Math.round((total - adv) * 100) / 100;
  var cur   = document.getElementById('sae-cur-' + id)?.value || 'USD';
  var sym   = SA_CURRENCIES[cur] || '$';
  var advEl = document.getElementById('sae-adv-' + id);
  var remEl = document.getElementById('sae-rem-' + id);
  if (advEl) advEl.textContent = sym + adv.toLocaleString('tr-TR');
  if (remEl) remEl.textContent = sym + rem.toLocaleString('tr-TR');
};

/** Inline düzenleme satır kaydet. */
window._saRowSave = function(id) {
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var jobId = (document.getElementById('sae-jobId-' + id)?.value || '').trim();
  var piNo  = (document.getElementById('sae-piNo-' + id)?.value || '').trim();
  if (!jobId || !piNo) { window.toast?.('İş ID ve PI No zorunlu', 'err'); return; }
  s.jobId       = jobId;
  s.piNo        = piNo;
  s.piDate      = document.getElementById('sae-piDate-' + id)?.value || '';
  s.totalAmount = parseFloat(document.getElementById('sae-total-' + id)?.value || '0') || 0;
  s.advanceRate = parseFloat(document.getElementById('sae-advRate-' + id)?.value || '0') || 0;
  s.currency    = document.getElementById('sae-cur-' + id)?.value || 'USD';
  s.advanceAmount   = Math.round(s.totalAmount * s.advanceRate / 100 * 100) / 100;
  s.remainingAmount = Math.round((s.totalAmount - s.advanceAmount) * 100) / 100;
  s.updatedAt = _nowSA(); s.updatedBy = _cuSA()?.id;
  _storeSA(d);
  renderSatinAlma();
  window.toast?.('Güncellendi ✓', 'ok');
};

/**
 * Dosya yükleme mini popup — inline satırlar için.
 */
window._saInlineFiles = function(id) {
  var old = document.getElementById('mo-sa-files'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-files'; mo.style.zIndex = '2200';
  mo.style.display = 'flex';
  mo.innerHTML = '<div class="moc" style="max-width:360px;padding:0;border-radius:12px;overflow:hidden">'
    + '<div style="padding:12px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:13px;font-weight:700;color:var(--t)">📎 Dosya Yükle</div>'
      + '<button onclick="document.getElementById(\'mo-sa-files\').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">'
      + '<div><div class="fl" style="font-size:10px">PI DOSYASI</div><input type="file" id="saf-pi" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:11px"></div>'
      + '<div><div class="fl" style="font-size:10px">DİĞER DOKÜMANLAR</div><input type="file" id="saf-doc" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" multiple style="font-size:11px"></div>'
      + '<div><div class="fl" style="font-size:10px">ÜRÜN GÖRSELLERİ</div><input type="file" id="saf-img" accept=".jpg,.jpeg,.png,.webp" multiple style="font-size:11px"></div>'
    + '</div>'
    + '<div style="padding:10px 16px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn btnp" onclick="window._saInlineFileSave?.(' + id + ')" style="font-size:11px">Kaydet</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
};

/**
 * Mini popup dosya kaydet.
 */
window._saInlineFileSave = function(id) {
  if (!id) { document.getElementById('mo-sa-files')?.remove(); window.toast?.('Önce satırı kaydedin', 'err'); return; }
  var piInp = document.getElementById('saf-pi');
  if (piInp?.files?.[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var d = _loadSA();
      var s = d.find(function(x) { return x.id === id; });
      if (s) { s.piFileData = e.target.result; s.piFileName = piInp.files[0].name; _storeSA(d); }
      document.getElementById('mo-sa-files')?.remove();
      window.toast?.('Dosya yüklendi ✓', 'ok');
    };
    reader.readAsDataURL(piInp.files[0]);
  } else {
    document.getElementById('mo-sa-files')?.remove();
  }
};

// ════════════════════════════════════════════════════════════════
// FORM MODAL
// ════════════════════════════════════════════════════════════════

/** @type {string} Mevcut form layout: 'vertical' | 'horizontal' */
var _saFormLayout = 'vertical';

/** @type {{ USD: number, EUR: number }} Canlı kurlar */
var _saLiveRates = { USD: 38.50, EUR: 41.20 };

// Kur çek (sayfa açılışında)
(function _saFetchRates() {
  fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.rates && d.rates.TRY) {
        _saLiveRates.USD = Math.round(d.rates.TRY * 100) / 100;
        _saLiveRates.EUR = Math.round(d.rates.TRY / (d.rates.EUR || 1) * 100) / 100;
      }
    }).catch(function() {});
})();

function _openSAModal(id) {
  var old = document.getElementById('mo-satinalma'); if (old) old.remove();
  var s = id ? _loadSA().find(function(x) { return x.id === id; }) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };

  // Kullanıcı listesi
  var users = typeof loadUsers === 'function' ? loadUsers().filter(function(u) { return u.status === 'active'; }) : [];
  var userOpts = '<option value="">— Seçin —</option>' + users.map(function(u) { return '<option value="' + u.id + '"' + (s?.responsibleId === u.id ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('');

  // Konteyner listesi
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn().filter(function(k) { return !k.closed; }) : [];
  var ktnOpts = '<option value="">— Seçin —</option>' + konts.map(function(k) { return '<option value="' + esc(k.no || '') + '" data-export="' + esc(k.ihracatId || '') + '"' + (s?.containerNo === k.no ? ' selected' : '') + '>' + esc(k.no || '?') + ' — ' + esc(k.hat || '') + '</option>'; }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-satinalma'; mo.style.zIndex = '2100';

  // Dikey form HTML
  var verticalHTML = ''
    // Satır 1
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">İHRACAT ID</div><input class="fi" id="sa-export-id" placeholder="EXP-2026-..." value="' + (s?.exportId || '') + '"></div>'
      + '<div><div class="fl">İŞ ID <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-job-id" placeholder="JOB-001" value="' + (s?.jobId || '') + '"></div>'
      + '<div><div class="fl">İŞ BAŞLAMA <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-job-date" value="' + (s?.jobDate || '') + '"></div>'
    + '</div>'
    // Satır 2
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">SATICI <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-pi-no" placeholder="Satıcı firma adı" value="' + (s?.supplier || s?.piNo || '') + '"></div>'
      + '<div><div class="fl">PI TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-pi-date" value="' + (s?.piDate || '') + '"></div>'
      + '<div><div class="fl">SİPARİŞ ONAY TARİHİ</div><input type="date" class="fi" id="sa-order-date" value="' + (s?.orderDate || '') + '"></div>'
    + '</div>'
    // Satır 3
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">KDV TUTARI <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-kdv" placeholder="0" min="0" step="0.01" value="' + (s?.kdv || '') + '"></div>'
      + '<div><div class="fl">TOPLAM TUTAR <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-total" placeholder="0" min="0" step="0.01" value="' + (s?.totalAmount || '') + '" oninput="window._saCalcAuto?.()"></div>'
      + '<div><div class="fl">PARA BİRİMİ <span style="color:var(--rd)">*</span></div><select class="fi" id="sa-currency" onchange="window._saCalcAuto?.()"><option value="USD"' + (s?.currency === 'USD' || !s ? ' selected' : '') + '>$ USD</option><option value="EUR"' + (s?.currency === 'EUR' ? ' selected' : '') + '>€ EUR</option><option value="TRY"' + (s?.currency === 'TRY' ? ' selected' : '') + '>₺ TRY</option></select></div>'
    + '</div>'
    // Satır 4
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">TESLİMAT ZAMANI <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-delivery" value="' + (s?.deliveryDate || '') + '"></div>'
      + '<div><div class="fl">AVANS % <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-advance" placeholder="30" min="0" max="100" value="' + (s?.advanceRate || '') + '" oninput="window._saCalcAuto?.()"></div>'
      + '<div><div class="fl">VADE TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-vade" value="' + (s?.vadeDate || '') + '"></div>'
    + '</div>'
    // Hesaplama + Kur
    + '<div style="background:linear-gradient(135deg,rgba(99,102,241,.05),rgba(99,102,241,.02));border:1px solid rgba(99,102,241,.15);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">AVANS TUTARI</div><div style="font-size:18px;font-weight:700;color:#D97706" id="sa-calc-advance">—</div></div>'
      + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">KALAN ÖDEME</div><div style="font-size:18px;font-weight:700;color:#6366F1" id="sa-calc-remaining">—</div></div>'
      + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">TL KARŞILIĞI</div><div style="font-size:14px;font-weight:700;color:var(--t)" id="sa-calc-tl">—</div><div style="font-size:9px;color:var(--t3)" id="sa-calc-rate"></div></div>'
    + '</div>'
    // Yeni alanlar
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">MÜŞTERİ SİPARİŞ NO</div><input class="fi" id="sa-customer-order" placeholder="CST-001" value="' + (s?.customerOrderNo || '') + '"></div>'
      + '<div><div class="fl">SİPARİŞ SORUMLUSU</div><select class="fi" id="sa-responsible">' + userOpts + '</select></div>'
      + '<div><div class="fl">KONTEYNER NO</div><select class="fi" id="sa-container" onchange="window._saContainerChanged?.()">' + ktnOpts + '</select></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + '<div><div class="fl">TESLİMAT YERİ</div><input class="fi" id="sa-delivery-place" placeholder="Mersin Limanı, Depo..." value="' + (s?.deliveryPlace || '') + '"></div>'
      + '<div><div class="fl">TESLİMAT KİME AİT</div><select class="fi" id="sa-delivery-owner"><option value="alici"' + (s?.deliveryOwner === 'alici' ? ' selected' : '') + '>Alıcı</option><option value="satici"' + (s?.deliveryOwner === 'satici' ? ' selected' : '') + '>Satıcı</option><option value="paylasimli"' + (s?.deliveryOwner === 'paylasimli' ? ' selected' : '') + '>Paylaşımlı</option></select></div>'
    + '</div>'
    // Satıcı Firma Bilgileri
    + '<div style="border:1px solid var(--b);border-radius:10px;padding:14px;margin-top:4px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">🏢 Satıcı Firma Bilgileri</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">'
        + '<div><div class="fl">FİRMA ADI <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-vendor-name" placeholder="Tedarikçi firma" value="' + (s?.vendor?.name || '') + '"></div>'
        + '<div><div class="fl">ÜLKE</div><input class="fi" id="sa-vendor-country" placeholder="Çin, Almanya..." value="' + (s?.vendor?.country || '') + '"></div>'
        + '<div><div class="fl">VERGİ / KAYIT NO</div><input class="fi" id="sa-vendor-tax" placeholder="Tax ID" value="' + (s?.vendor?.tax || '') + '"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">'
        + '<div><div class="fl">İLETİŞİM KİŞİSİ</div><input class="fi" id="sa-vendor-contact" placeholder="Ad Soyad" value="' + (s?.vendor?.contact || '') + '"></div>'
        + '<div><div class="fl">TELEFON</div><input class="fi" id="sa-vendor-phone" placeholder="+86 ..." value="' + (s?.vendor?.phone || '') + '"></div>'
        + '<div><div class="fl">E-POSTA</div><input class="fi" type="email" id="sa-vendor-email" placeholder="info@firma.com" value="' + (s?.vendor?.email || '') + '"></div>'
      + '</div>'
      + '<div><div class="fl">ADRES</div><textarea class="fi" id="sa-vendor-address" rows="2" style="resize:none" placeholder="Firma adresi...">' + (s?.vendor?.address || '') + '</textarea></div>'
    + '</div>'
    // Açıklama / Not
    + '<div><div class="fl">AÇIKLAMA / NOT</div><textarea class="fi" id="sa-notes" rows="2" style="resize:none" placeholder="Ek bilgi, özel şartlar...">' + (s?.notes || '') + '</textarea></div>'
    // Ödeme Dilimleri
    + '<div style="border:1px solid var(--b);border-radius:10px;padding:14px;margin-top:4px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">💳 Ödeme Dilimleri</div>'
        + '<button type="button" onclick="window._saAddInstallment?.()" class="btn btns" style="font-size:10px;padding:3px 10px">+ Ödeme Ekle</button>'
      + '</div>'
      + '<div id="sa-installments">'
        + (function() {
            var insts = s?.installments || [{ name:'Avans', amount:'', rate:'', due:'' }, { name:'1. Ödeme', amount:'', rate:'', due:'' }];
            return insts.map(function(inst, idx) {
              return '<div class="sa-installment-row" style="display:grid;grid-template-columns:1fr 1fr 80px 1fr 30px;gap:6px;margin-bottom:6px;align-items:center">'
                + '<input class="fi sa-inst-name" placeholder="Ödeme adı" value="' + (inst.name || '') + '" style="font-size:11px;padding:5px 8px">'
                + '<input type="number" class="fi sa-inst-amount" placeholder="Tutar" value="' + (inst.amount || '') + '" style="font-size:11px;padding:5px 8px" oninput="window._saInstCalc?.()">'
                + '<input type="number" class="fi sa-inst-rate" placeholder="%" value="' + (inst.rate || '') + '" style="font-size:11px;padding:5px 8px" min="0" max="100" oninput="window._saInstRateCalc?.(this)">'
                + '<input type="date" class="fi sa-inst-due" value="' + (inst.due || '') + '" style="font-size:11px;padding:5px 8px">'
                + (idx >= 2 ? '<button onclick="this.closest(\'.sa-installment-row\').remove();window._saInstCalc?.()" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3)">✕</button>' : '<div></div>')
              + '</div>';
            }).join('');
          })()
      + '</div>'
      + '<div id="sa-inst-total" style="font-size:11px;color:var(--t3);margin-top:6px"></div>'
    + '</div>'
    // Dosyalar
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">PI DOSYASI <span style="color:var(--rd)">*</span></div><input type="file" id="sa-pi-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:11px">'
        + (s?.piFileName ? '<div style="font-size:10px;color:var(--ac);margin-top:3px">📎 ' + esc(s.piFileName) + '</div>' : '') + '</div>'
      + '<div><div class="fl">DUAY SÖZLEŞMESİ <span style="color:var(--rd)">*</span></div><input type="file" id="sa-soz-file" accept=".pdf,.jpg,.jpeg,.png,.docx" style="font-size:11px">'
        + (s?.sozFileName ? '<div style="font-size:10px;color:var(--ac);margin-top:3px">📎 ' + esc(s.sozFileName) + '</div>' : '') + '</div>'
      + '<div><div class="fl">DİĞER DOKÜMANLAR</div><input type="file" id="sa-doc-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" multiple style="font-size:11px"></div>'
      + '<div><div class="fl">ÜRÜN GÖRSELLERİ</div><input type="file" id="sa-img-file" accept=".jpg,.jpeg,.png,.webp" multiple style="font-size:11px"></div>'
    + '</div>'
    + '<input type="hidden" id="sa-eid" value="' + (s?.id || '') + '">';

  // Yatay form HTML (Excel tarzı)
  var hLabels = ['İş ID*','PI No*','PI Tarihi*','Toplam*','KDV*','Döviz*','Avans%*','Vade*','Teslimat*','Müşt.Sip.No','Sorumlu','Konteyner','Tesl.Yeri'];
  var horizontalHTML = ''
    + '<div style="overflow-x:auto">'
      + '<div style="display:flex;gap:0;min-width:1400px">'
        + hLabels.map(function(l) { return '<div style="flex:1;min-width:100px;padding:4px 6px;font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;border-right:1px solid var(--b);background:var(--s2)">' + l + '</div>'; }).join('')
      + '</div>'
      + '<div style="display:flex;gap:0;min-width:1400px;border-bottom:1px solid var(--b)">'
        + '<div style="flex:1;min-width:100px;padding:2px"><input class="fi" id="sa-job-id" placeholder="JOB-001" value="' + (s?.jobId || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="1"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input class="fi" id="sa-pi-no" placeholder="PI-001" value="' + (s?.piNo || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="2"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="date" class="fi" id="sa-pi-date" value="' + (s?.piDate || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="3"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="number" class="fi" id="sa-total" placeholder="0" value="' + (s?.totalAmount || '') + '" oninput="window._saCalcAuto?.()" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="4"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="number" class="fi" id="sa-kdv" placeholder="0" value="' + (s?.kdv || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="5"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><select class="fi" id="sa-currency" onchange="window._saCalcAuto?.()" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="6"><option value="USD"' + (s?.currency === 'USD' || !s ? ' selected' : '') + '>USD</option><option value="EUR"' + (s?.currency === 'EUR' ? ' selected' : '') + '>EUR</option><option value="TRY"' + (s?.currency === 'TRY' ? ' selected' : '') + '>TRY</option></select></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="number" class="fi" id="sa-advance" placeholder="30" value="' + (s?.advanceRate || '') + '" oninput="window._saCalcAuto?.()" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="7"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="date" class="fi" id="sa-vade" value="' + (s?.vadeDate || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="8"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input type="date" class="fi" id="sa-delivery" value="' + (s?.deliveryDate || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="9"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input class="fi" id="sa-customer-order" placeholder="CST-001" value="' + (s?.customerOrderNo || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="10"></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><select class="fi" id="sa-responsible" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="11">' + userOpts + '</select></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><select class="fi" id="sa-container" onchange="window._saContainerChanged?.()" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="12">' + ktnOpts + '</select></div>'
        + '<div style="flex:1;min-width:100px;padding:2px"><input class="fi" id="sa-delivery-place" placeholder="Liman..." value="' + (s?.deliveryPlace || '') + '" style="font-size:11px;padding:4px 6px;border-radius:0;border:none;border-bottom:1px solid var(--b)" tabindex="13"></div>'
      + '</div>'
    + '</div>'
    // Hesaplama
    + '<div style="display:flex;gap:12px;padding:10px 0;font-size:12px;color:var(--t3)">'
      + '<span>Avans: <b id="sa-calc-advance" style="color:#D97706">—</b></span>'
      + '<span>Kalan: <b id="sa-calc-remaining" style="color:#6366F1">—</b></span>'
      + '<span>TL: <b id="sa-calc-tl" style="color:var(--t)">—</b></span>'
      + '<span id="sa-calc-rate" style="font-size:10px"></span>'
    + '</div>'
    // Satıcı firma (yatay formda kompakt)
    + '<div style="border:1px solid var(--b);border-radius:8px;padding:10px;margin-top:6px">'
      + '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">🏢 Satıcı Firma</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + '<input class="fi" id="sa-vendor-name" placeholder="Firma adı *" value="' + (s?.vendor?.name || '') + '" style="font-size:11px;padding:4px 6px;flex:2;min-width:120px">'
        + '<input class="fi" id="sa-vendor-country" placeholder="Ülke" value="' + (s?.vendor?.country || '') + '" style="font-size:11px;padding:4px 6px;flex:1;min-width:80px">'
        + '<input class="fi" id="sa-vendor-contact" placeholder="Kişi" value="' + (s?.vendor?.contact || '') + '" style="font-size:11px;padding:4px 6px;flex:1;min-width:80px">'
        + '<input class="fi" id="sa-vendor-phone" placeholder="Tel" value="' + (s?.vendor?.phone || '') + '" style="font-size:11px;padding:4px 6px;flex:1;min-width:80px">'
        + '<input class="fi" type="email" id="sa-vendor-email" placeholder="E-posta" value="' + (s?.vendor?.email || '') + '" style="font-size:11px;padding:4px 6px;flex:1;min-width:100px">'
        + '<input class="fi" id="sa-vendor-tax" placeholder="Vergi No" value="' + (s?.vendor?.tax || '') + '" style="font-size:11px;padding:4px 6px;flex:1;min-width:80px">'
      + '</div>'
      + '<textarea class="fi" id="sa-vendor-address" rows="1" placeholder="Adres..." style="font-size:11px;padding:4px 6px;margin-top:4px;resize:none">' + (s?.vendor?.address || '') + '</textarea>'
    + '</div>'
    // Açıklama
    + '<div style="margin-top:4px"><textarea class="fi" id="sa-notes" rows="1" placeholder="Açıklama / not..." style="font-size:11px;padding:4px 6px;resize:none">' + (s?.notes || '') + '</textarea></div>'
    // Gizli alanlar (yatay formda eksik olanlar)
    + '<input type="hidden" id="sa-export-id" value="' + (s?.exportId || '') + '">'
    + '<input type="hidden" id="sa-job-date" value="' + (s?.jobDate || new Date().toISOString().slice(0, 10)) + '">'
    + '<input type="hidden" id="sa-order-date" value="' + (s?.orderDate || '') + '">'
    + '<input type="hidden" id="sa-delivery-owner" value="' + (s?.deliveryOwner || 'alici') + '">'
    + '<input type="hidden" id="sa-eid" value="' + (s?.id || '') + '">'
    // Dosya alanları
    + '<div style="display:flex;gap:10px;margin-top:4px">'
      + '<div style="flex:1"><div class="fl" style="font-size:9px">PI DOSYASI *</div><input type="file" id="sa-pi-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:10px">' + (s?.piFileName ? '<span style="font-size:9px;color:var(--ac)">📎 ' + esc(s.piFileName) + '</span>' : '') + '</div>'
      + '<div style="flex:1"><div class="fl" style="font-size:9px">DİĞER DOK.</div><input type="file" id="sa-doc-file" multiple style="font-size:10px"></div>'
      + '<div style="flex:1"><div class="fl" style="font-size:9px">GÖRSELLER</div><input type="file" id="sa-img-file" multiple style="font-size:10px"></div>'
    + '</div>';

  var activeLayout = _saFormLayout;
  mo.innerHTML = '<div class="moc" style="max-width:' + (activeLayout === 'horizontal' ? '95vw' : '720px') + ';padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    // Header + layout toggle
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">' + (s ? '✏️ Sipariş Düzenle' : '+ Yeni Sipariş') + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + '<div style="display:flex;background:var(--s2);border-radius:6px;padding:2px;gap:1px">'
          + '<button onclick="window._saToggleLayout(\'vertical\')" id="sa-layout-v" style="background:' + (activeLayout === 'vertical' ? 'var(--ac)' : 'none') + ';color:' + (activeLayout === 'vertical' ? '#fff' : 'var(--t2)') + ';border:none;cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;font-family:inherit">📋 Dikey</button>'
          + '<button onclick="window._saToggleLayout(\'horizontal\')" id="sa-layout-h" style="background:' + (activeLayout === 'horizontal' ? 'var(--ac)' : 'none') + ';color:' + (activeLayout === 'horizontal' ? '#fff' : 'var(--t2)') + ';border:none;cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;font-family:inherit">📊 Yatay</button>'
        + '</div>'
        + '<button onclick="document.getElementById(\'mo-satinalma\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
      + '</div>'
    + '</div>'
    // Form body
    + '<div id="sa-form-body" style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px">'
      + (activeLayout === 'horizontal' ? horizontalHTML : verticalHTML)
    + '</div>'
    // Footer
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-satinalma\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveSA?.()">Kaydet</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); window._saCalcAuto?.(); }, 10);
}

/**
 * Dikey/yatay form toggle — mevcut formu kapatıp yeniden açar.
 */
window._saToggleLayout = function(layout) {
  _saFormLayout = layout;
  var eid = document.getElementById('sa-eid')?.value || '';
  document.getElementById('mo-satinalma')?.remove();
  _openSAModal(eid ? parseInt(eid) : null);
};

/**
 * Konteyner seçilince ihracat ID otomatik doldur.
 */
window._saContainerChanged = function() {
  var sel = document.getElementById('sa-container');
  if (!sel) return;
  var opt = sel.options[sel.selectedIndex];
  var exportId = opt?.dataset?.export || '';
  var expEl = document.getElementById('sa-export-id');
  if (expEl && exportId && !expEl.value) expEl.value = exportId;
};

/**
 * Avans ve kalan tutarı otomatik hesapla.
 */
window._saCalcAuto = function() {
  var total   = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var advRate = parseFloat(document.getElementById('sa-advance')?.value || '0') || 0;
  var advAmt  = Math.round(total * advRate / 100 * 100) / 100;
  var remaining = Math.round((total - advAmt) * 100) / 100;
  var cur = document.getElementById('sa-currency')?.value || 'USD';
  var sym = SA_CURRENCIES[cur] || '$';

  var advEl = document.getElementById('sa-calc-advance');
  var remEl = document.getElementById('sa-calc-remaining');
  if (advEl) advEl.textContent = sym + advAmt.toLocaleString('tr-TR');
  if (remEl) remEl.textContent = sym + remaining.toLocaleString('tr-TR');

  // Canlı TL karşılığı
  var tlEl   = document.getElementById('sa-calc-tl');
  var rateEl = document.getElementById('sa-calc-rate');
  if (tlEl) {
    if (cur === 'TRY') {
      tlEl.textContent = '₺' + total.toLocaleString('tr-TR');
      if (rateEl) rateEl.textContent = '';
    } else {
      var rate = _saLiveRates[cur] || 1;
      var tlVal = Math.round(total * rate * 100) / 100;
      tlEl.textContent = '₺' + tlVal.toLocaleString('tr-TR');
      if (rateEl) rateEl.textContent = '1 ' + cur + ' = ₺' + rate.toLocaleString('tr-TR');
    }
  }
};

// ── Ödeme Dilimleri Yardımcıları ──────────────────────────────────

/**
 * Yeni ödeme dilimi satırı ekler (max 4).
 */
window._saAddInstallment = function() {
  var cont = document.getElementById('sa-installments');
  if (!cont) return;
  var count = cont.querySelectorAll('.sa-installment-row').length;
  if (count >= 4) { window.toast?.('Maksimum 4 ödeme dilimi', 'err'); return; }
  var names = ['Avans', '1. Ödeme', '2. Ödeme', '3. Ödeme'];
  var row = document.createElement('div');
  row.className = 'sa-installment-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 80px 1fr 30px;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML = '<input class="fi sa-inst-name" placeholder="Ödeme adı" value="' + (names[count] || '') + '" style="font-size:11px;padding:5px 8px">'
    + '<input type="number" class="fi sa-inst-amount" placeholder="Tutar" style="font-size:11px;padding:5px 8px" oninput="window._saInstCalc?.()">'
    + '<input type="number" class="fi sa-inst-rate" placeholder="%" style="font-size:11px;padding:5px 8px" min="0" max="100" oninput="window._saInstRateCalc?.(this)">'
    + '<input type="date" class="fi sa-inst-due" style="font-size:11px;padding:5px 8px">'
    + '<button onclick="this.closest(\'.sa-installment-row\').remove();window._saInstCalc?.()" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3)">✕</button>';
  cont.appendChild(row);
};

/**
 * Dilim toplamını kontrol eder.
 */
window._saInstCalc = function() {
  var total = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var sum = 0;
  document.querySelectorAll('.sa-inst-amount').forEach(function(inp) { sum += parseFloat(inp.value || '0') || 0; });
  var el = document.getElementById('sa-inst-total');
  if (!el) return;
  var diff = Math.abs(sum - total);
  if (total > 0 && sum > 0) {
    el.innerHTML = 'Dilim toplamı: <b style="color:' + (diff < 1 ? '#16A34A' : '#EF4444') + '">' + sum.toLocaleString('tr-TR') + '</b>'
      + (diff >= 1 ? ' <span style="color:#EF4444">(fark: ' + diff.toLocaleString('tr-TR') + ')</span>' : ' ✓');
  } else {
    el.innerHTML = '';
  }
};

/**
 * Oran girilince tutarı otomatik hesaplar.
 */
window._saInstRateCalc = function(inp) {
  var total = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var rate  = parseFloat(inp.value || '0') || 0;
  var row   = inp.closest('.sa-installment-row');
  if (!row) return;
  var amtInp = row.querySelector('.sa-inst-amount');
  if (amtInp && total > 0) amtInp.value = Math.round(total * rate / 100 * 100) / 100;
  window._saInstCalc?.();
};

// ════════════════════════════════════════════════════════════════
// KAYDET
// ════════════════════════════════════════════════════════════════

window._saveSA = function() {
  var jobId    = (document.getElementById('sa-job-id')?.value || '').trim();
  var supplier = (document.getElementById('sa-pi-no')?.value || '').trim();
  var piDate   = document.getElementById('sa-pi-date')?.value || '';
  var kdv      = parseFloat(document.getElementById('sa-kdv')?.value || '0') || 0;
  var total    = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var delivery = document.getElementById('sa-delivery')?.value || '';
  var advRate  = parseFloat(document.getElementById('sa-advance')?.value || '0') || 0;
  var vade     = document.getElementById('sa-vade')?.value || '';
  var eid      = parseInt(document.getElementById('sa-eid')?.value || '0');
  var jobDate  = document.getElementById('sa-job-date')?.value || '';

  // Doğrulama
  var errs = [];
  if (!jobId)    errs.push('İş ID');
  if (!supplier) errs.push('Satıcı');
  if (!piDate)   errs.push('PI Tarihi');
  if (!kdv)      errs.push('KDV Tutarı');
  if (!total)    errs.push('Toplam Tutar');
  if (!delivery) errs.push('Teslimat Zamanı');
  if (!advRate)  errs.push('Avans Oranı');
  if (!vade)     errs.push('Vade Tarihi');
  if (!jobDate)  errs.push('İş Başlama Tarihi');
  var vendorName = (document.getElementById('sa-vendor-name')?.value || '').trim();
  if (!vendorName) errs.push('Firma Adı');

  // PI Dosyası kontrolü (yeni kayıtta zorunlu)
  var piFile = document.getElementById('sa-pi-file');
  if (!eid && (!piFile || !piFile.files || !piFile.files.length)) {
    errs.push('PI Dosyası');
  }
  // Duay Sözleşmesi kontrolü (yeni kayıtta zorunlu)
  var sozFile = document.getElementById('sa-soz-file');
  if (!eid && (!sozFile || !sozFile.files || !sozFile.files.length)) {
    errs.push('Duay Sözleşmesi');
  }

  if (errs.length) {
    window.toast?.('Zorunlu alanlar eksik: ' + errs.join(', '), 'err');
    return;
  }

  // Ödeme dilimleri topla
  var installments = [];
  document.querySelectorAll('.sa-installment-row').forEach(function(row, idx) {
    var iName   = row.querySelector('.sa-inst-name')?.value || ('Ödeme ' + (idx + 1));
    var iAmount = parseFloat(row.querySelector('.sa-inst-amount')?.value || '0') || 0;
    var iRate   = parseFloat(row.querySelector('.sa-inst-rate')?.value || '0') || 0;
    var iDue    = row.querySelector('.sa-inst-due')?.value || '';
    if (iAmount > 0 || iRate > 0) {
      installments.push({ name: iName, amount: iAmount, rate: iRate, due: iDue });
    }
  });

  // Dilim toplamı kontrol
  if (installments.length > 0) {
    var instTotal = installments.reduce(function(a, i) { return a + i.amount; }, 0);
    if (Math.abs(instTotal - total) > 1) {
      window.toast?.('Ödeme dilimleri toplamı (' + instTotal.toLocaleString('tr-TR') + ') toplam tutarla (' + total.toLocaleString('tr-TR') + ') eşleşmiyor!', 'err');
      return;
    }
  }

  var advAmt    = Math.round(total * advRate / 100 * 100) / 100;
  var remaining = Math.round((total - advAmt) * 100) / 100;
  var currency  = document.getElementById('sa-currency')?.value || 'USD';

  var entry = {
    exportId:        (document.getElementById('sa-export-id')?.value || '').trim(),
    jobId:           jobId,
    jobDate:         jobDate,
    supplier:        supplier,
    piNo:            supplier, // geriye uyumluluk
    piDate:          piDate,
    kdv:             kdv,
    totalAmount:     total,
    currency:        currency,
    deliveryDate:    delivery,
    advanceRate:     advRate,
    advanceAmount:   advAmt,
    remainingAmount: remaining,
    vadeDate:        vade,
    installments:    installments.length > 0 ? installments : null,
    customerOrderNo: (document.getElementById('sa-customer-order')?.value || '').trim(),
    orderDate:       document.getElementById('sa-order-date')?.value || '',
    responsibleId:   parseInt(document.getElementById('sa-responsible')?.value || '0') || null,
    deliveryPlace:   (document.getElementById('sa-delivery-place')?.value || '').trim(),
    deliveryOwner:   document.getElementById('sa-delivery-owner')?.value || 'alici',
    containerNo:     (document.getElementById('sa-container')?.value || '').trim(),
    notes:           (document.getElementById('sa-notes')?.value || '').trim(),
    vendor: {
      name:    vendorName,
      country: (document.getElementById('sa-vendor-country')?.value || '').trim(),
      contact: (document.getElementById('sa-vendor-contact')?.value || '').trim(),
      phone:   (document.getElementById('sa-vendor-phone')?.value || '').trim(),
      email:   (document.getElementById('sa-vendor-email')?.value || '').trim(),
      address: (document.getElementById('sa-vendor-address')?.value || '').trim(),
      tax:     (document.getElementById('sa-vendor-tax')?.value || '').trim(),
    },
    updatedAt:       _nowSA(),
    updatedBy:       _cuSA()?.id,
  };

  // Dosya okuma (base64)
  var _afterFiles = function(piData, piName) {
    if (piData) { entry.piFileData = piData; entry.piFileName = piName; }

    var d = _loadSA();
    var isNew = !eid;

    if (eid) {
      var item = d.find(function(x) { return x.id === eid; });
      if (item) {
        // Mevcut dosyaları koru
        if (!entry.piFileData && item.piFileData) { entry.piFileData = item.piFileData; entry.piFileName = item.piFileName; }
        Object.assign(item, entry);
      }
    } else {
      entry.id        = generateNumericId();
      entry.status    = _isAdmSA() ? 'approved' : 'pending';
      entry.createdAt = _nowSA();
      entry.createdBy = _cuSA()?.id;
      d.unshift(entry);
    }

    _storeSA(d);
    document.getElementById('mo-satinalma')?.remove();
    renderSatinAlma();
    window.logActivity?.('view', 'Satınalma ' + (isNew ? 'eklendi' : 'güncellendi') + ': ' + supplier);
    window.toast?.((isNew ? 'Sipariş eklendi' : 'Güncellendi') + ' ✓', 'ok');

    // Yeni kayıt — Ödemeler listesine otomatik düşür
    if (isNew) {
      var saEntry = eid ? d.find(function(x) { return x.id === eid; }) : d[0];
      _saCreatePayments(saEntry);

      // Admin değilse tüm admin/manager'lara bildirim gönder
      if (!_isAdmSA()) {
        var cuName = _cuSA()?.name || '';
        var managers = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
          return (u.role === 'admin' || u.role === 'manager') && u.status === 'active';
        });
        managers.forEach(function(m) {
          window.addNotif?.('🛒', 'Yeni satınalma onay bekliyor: ' + supplier + ' — ' + _fmtSA(total, currency) + ' (' + cuName + ')', 'warn', 'satinalma', m.id);
        });
      }
    }
  };

  // Sözleşme dosyası varsa oku
  var _readSoz = function(cb) {
    if (sozFile?.files?.[0]) {
      var r2 = new FileReader();
      r2.onload = function(e2) { entry.sozFileData = e2.target.result; entry.sozFileName = sozFile.files[0].name; cb(); };
      r2.readAsDataURL(sozFile.files[0]);
    } else { cb(); }
  };

  // PI dosyası varsa oku, sonra sözleşme
  if (piFile?.files?.[0]) {
    var reader = new FileReader();
    reader.onload = function(e) { _readSoz(function() { _afterFiles(e.target.result, piFile.files[0].name); }); };
    reader.readAsDataURL(piFile.files[0]);
  } else {
    _readSoz(function() { _afterFiles(null, null); });
  }
};

/**
 * Satınalma kaydından ödemelere avans + kalan ödeme oluşturur.
 */
function _saCreatePayments(sa) {
  if (!sa) return;
  var label = 'Satınalma: ' + (sa.supplier || sa.piNo || sa.jobId);

  // Dilimler varsa her dilim ayrı ödeme olarak düşsün
  if (sa.installments && sa.installments.length > 0) {
    var d = window.loadOdm ? loadOdm() : [];
    var now = typeof nowTs === 'function' ? nowTs() : new Date().toISOString();
    var rates = typeof _odmGetRates === 'function' ? _odmGetRates() : {};
    var cur = sa.currency || 'USD';
    var kurRate = rates[cur] || 1;

    sa.installments.forEach(function(inst) {
      var tlAmt = cur === 'TRY' ? inst.amount : Math.round(inst.amount * kurRate * 100) / 100;
      d.unshift({
        id: generateNumericId(),
        name: label + ' — ' + inst.name,
        source: 'satinalma', cat: 'diger', freq: 'teksefer',
        amount: inst.amount, currency: cur,
        originalAmount: inst.amount, originalCurrency: cur,
        tlAmount: tlAmt, kurRate: kurRate,
        due: inst.due || sa.vadeDate || '',
        note: 'Satınalma #' + sa.id + ' — ' + inst.name,
        paid: false, alarmDays: 3,
        assignedTo: sa.createdBy, purchaseId: sa.id,
        ts: now, createdBy: _cuSA()?.id,
        approvalStatus: _isAdmSA() ? 'approved' : 'pending',
      });
    });
    if (typeof storeOdm === 'function') storeOdm(d);
    window.toast?.('Ödeme planı oluşturuldu ✓ (' + sa.installments.length + ' dilim)', 'ok');
    if (typeof renderOdemeler === 'function') renderOdemeler();
    return;
  }

  // Dilim yoksa eski yöntem: avans + bakiye
  if (!window.createOdmFromPurchase) return;
  window.createOdmFromPurchase({
    id:            sa.id,
    name:          label,
    totalAmount:   sa.totalAmount,
    advanceAmount: sa.advanceAmount,
    advanceDate:   sa.piDate,
    balanceDate:   sa.vadeDate,
    assignedTo:    sa.createdBy,
    currency:      sa.currency || 'USD',
  });
}

// ════════════════════════════════════════════════════════════════
// ONAY / RED
// ════════════════════════════════════════════════════════════════

window._approveSA = function(id) {
  if (!_isAdmSA()) { window.toast?.('Yetki yok', 'err'); return; }
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  s.status     = 'approved';
  s.approvedBy = _cuSA()?.id;
  s.approvedAt = _nowSA();
  _storeSA(d);
  renderSatinAlma();
  window.toast?.('Sipariş onaylandı ✓', 'ok');
  window.logActivity?.('view', 'Satınalma onaylandı: ' + (s.piNo || s.jobId));
  window.addNotif?.('✅', 'Satınalma onaylandı: ' + (s.piNo || '') + ' — ' + _fmtSA(s.totalAmount, s.currency), 'ok', 'satinalma', s.createdBy);
  // Onay sonrası ödeme oluştur
  _saCreatePayments(s);
};

window._rejectSA = function(id) {
  if (!_isAdmSA()) { window.toast?.('Yetki yok', 'err'); return; }

  // Red açıklaması zorunlu — mini modal
  var old = document.getElementById('mo-sa-reject'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-reject'; mo.style.display = 'flex'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:14px;font-weight:700;color:#DC2626">❌ Sipariş Red / Revize</div>'
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fl">RED / REVİZE GEREKÇESİ <span style="color:var(--rd)">*</span></div>'
      + '<textarea class="fi" id="sa-reject-reason" rows="3" style="resize:none" placeholder="Neden reddedildi veya neyin düzeltilmesi gerekiyor..."></textarea>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-sa-reject\').remove()">İptal</button>'
      + '<button class="btn btnp" style="background:#DC2626;border-color:#DC2626" onclick="window._execRejectSA?.(' + id + ')">Reddet & Revize İste</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
};

window._execRejectSA = function(id) {
  var reason = (document.getElementById('sa-reject-reason')?.value || '').trim();
  if (!reason) { window.toast?.('Gerekçe zorunludur', 'err'); return; }
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  s.status       = 'revize_gerekli';
  s.rejectedBy   = _cuSA()?.id;
  s.rejectedAt   = _nowSA();
  s.rejectReason = reason;
  _storeSA(d);
  document.getElementById('mo-sa-reject')?.remove();
  renderSatinAlma();
  window.toast?.('Revize talebi gönderildi', 'ok');
  window.logActivity?.('view', 'Satınalma revize istendi: ' + (s.supplier || s.piNo || s.jobId) + ' — ' + reason);
  window.addNotif?.('🔄', 'Satınalma revize gerekli: ' + (s.supplier || s.piNo || '') + ' — ' + reason, 'warn', 'satinalma', s.createdBy);
};

// ════════════════════════════════════════════════════════════════
// DETAY MODAL
// ════════════════════════════════════════════════════════════════

window._openSADetail = function(id) {
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var st = SA_STATUS[s.status] || SA_STATUS.draft;
  var sym = SA_CURRENCIES[s.currency] || '$';
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var creator = users.find(function(u) { return u.id === s.createdBy; });
  var approver = users.find(function(u) { return u.id === s.approvedBy; });

  var old = document.getElementById('mo-sa-detail'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-detail'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--t)">🛒 ' + esc(s.piNo || s.jobId) + '</div>'
        + '<div style="font-size:11px;color:var(--t3)">İş ID: ' + esc(s.jobId || '—') + (s.exportId ? ' · İhracat: ' + esc(s.exportId) : '') + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span>'
        + '<button onclick="document.getElementById(\'mo-sa-detail\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
      + '</div>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px">'
      // Finansal özet
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">'
        + '<div style="background:var(--s2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Toplam</div><div style="font-size:18px;font-weight:700;color:var(--t)">' + sym + Number(s.totalAmount || 0).toLocaleString('tr-TR') + '</div></div>'
        + '<div style="background:rgba(217,119,6,.06);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Avans (%' + (s.advanceRate || 0) + ')</div><div style="font-size:18px;font-weight:700;color:#D97706">' + sym + Math.round(s.advanceAmount || 0).toLocaleString('tr-TR') + '</div></div>'
        + '<div style="background:rgba(99,102,241,.06);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Kalan</div><div style="font-size:18px;font-weight:700;color:#6366F1">' + sym + Math.round(s.remainingAmount || 0).toLocaleString('tr-TR') + '</div></div>'
      + '</div>'
      // Detaylar
      + '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:12px">'
        + [
            ['PI Tarihi', s.piDate || '—'],
            ['İş Başlama', s.jobDate || '—'],
            ['Teslimat', s.deliveryDate || '—'],
            ['Vade Tarihi', s.vadeDate || '—'],
            ['KDV', sym + Number(s.kdv || 0).toLocaleString('tr-TR')],
            ['Para Birimi', s.currency || 'USD'],
            ['Oluşturan', creator ? esc(creator.name) : '—'],
            ['Onaylayan', approver ? esc(approver.name) : '—'],
            ['Oluşturma', s.createdAt || '—'],
          ].map(function(r, i) {
            return '<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--b);background:' + (i % 2 === 0 ? 'var(--sf)' : 'var(--s2)') + '">'
              + '<span style="font-size:11px;color:var(--t3)">' + r[0] + '</span>'
              + '<span style="font-size:11px;font-weight:600;color:var(--t)">' + r[1] + '</span>'
            + '</div>';
          }).join('')
      + '</div>'
      // Satıcı Firma Kartı
      + (s.vendor && s.vendor.name ? '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:12px">'
        + '<div style="padding:8px 14px;background:var(--s2);border-bottom:1px solid var(--b);font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase">🏢 Satıcı Firma</div>'
        + '<div style="padding:10px 14px;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:6px">'
          + '<div><span style="color:var(--t3)">Firma:</span> <b style="color:var(--t)">' + esc(s.vendor.name) + '</b></div>'
          + (s.vendor.country ? '<div><span style="color:var(--t3)">Ülke:</span> ' + esc(s.vendor.country) + '</div>' : '')
          + (s.vendor.contact ? '<div><span style="color:var(--t3)">Kişi:</span> ' + esc(s.vendor.contact) + '</div>' : '')
          + (s.vendor.phone ? '<div><span style="color:var(--t3)">Tel:</span> ' + esc(s.vendor.phone) + '</div>' : '')
          + (s.vendor.email ? '<div><span style="color:var(--t3)">E-posta:</span> ' + esc(s.vendor.email) + '</div>' : '')
          + (s.vendor.tax ? '<div><span style="color:var(--t3)">Vergi No:</span> ' + esc(s.vendor.tax) + '</div>' : '')
          + (s.vendor.address ? '<div style="grid-column:1/-1"><span style="color:var(--t3)">Adres:</span> ' + esc(s.vendor.address) + '</div>' : '')
        + '</div></div>' : '')
      // Açıklama
      + (s.notes ? '<div style="padding:8px 14px;background:var(--s2);border-radius:8px;margin-bottom:12px;font-size:11px"><span style="color:var(--t3)">📝 Not:</span> ' + esc(s.notes) + '</div>' : '')
      // PI Dosyası
      + (s.piFileName ? '<div style="padding:8px 14px;background:var(--s2);border-radius:8px;margin-bottom:12px;font-size:11px"><span style="color:var(--t3)">📎 PI Dosyası:</span> <span style="color:var(--ac);font-weight:600">' + esc(s.piFileName) + '</span></div>' : '')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn btns" onclick="window._openSAModal?.(' + s.id + ');document.getElementById(\'mo-sa-detail\')?.remove()" style="font-size:12px">✏️ Düzenle</button>'
      + '<button class="btn" onclick="document.getElementById(\'mo-sa-detail\').remove()">Kapat</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

// ════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ════════════════════════════════════════════════════════════════

window._exportSAXlsx = function() {
  var items = _loadSA();
  if (!items.length) { window.toast?.('Dışa aktarılacak kayıt yok', 'err'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  var rows = [['İhracat ID', 'İş ID', 'İş Başlama', 'PI No', 'PI Tarihi', 'KDV', 'Toplam Tutar', 'Döviz', 'Avans %', 'Avans Tutarı', 'Kalan', 'Teslimat', 'Vade', 'Durum']];
  items.forEach(function(s) {
    var st = SA_STATUS[s.status] || SA_STATUS.draft;
    rows.push([
      s.exportId || '', s.jobId || '', s.jobDate || '',
      s.piNo || '', s.piDate || '', s.kdv || 0,
      s.totalAmount || 0, s.currency || 'USD',
      s.advanceRate || 0, s.advanceAmount || 0, s.remainingAmount || 0,
      s.deliveryDate || '', s.vadeDate || '', st.l,
    ]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map(function() { return { wch: 16 }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Satin Alma');
  XLSX.writeFile(wb, 'SatinAlma_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// SİLME
// ════════════════════════════════════════════════════════════════

/**
 * Satın alma kaydını siler. Yetki kontrolü + cascade ödeme silme.
 * pending/revize_gerekli → giren kişi silebilir
 * approved/kesinlesti → sadece admin silebilir
 */
window._deleteSA = function(id) {
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var cu = _cuSA();

  // Yetki kontrolü
  var canDelete = false;
  if (_isAdmSA()) {
    canDelete = true;
  } else if ((s.status === 'pending' || s.status === 'revize_gerekli' || s.status === 'draft') && s.createdBy === cu?.id) {
    canDelete = true;
  }

  if (!canDelete) {
    window.toast?.('Onaylanmış kayıtlar yönetici izni olmadan silinemez', 'err');
    return;
  }

  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  window.confirmModal('Bu kayıt silinsin mi?\n\n"' + esc(s.supplier || s.piNo || s.jobId || '') + '"\n\nOnaylanmış kayıtlar yönetici izni olmadan silinemez.', {
    title: 'Satın Alma Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: function() {
      // Nakit akışından ilgili ödemeleri de kaldır
      if (typeof loadOdm === 'function' && typeof storeOdm === 'function') {
        var odm = loadOdm();
        var before = odm.length;
        odm = odm.filter(function(o) { return !(o.source === 'satinalma' && o.purchaseId === id); });
        if (odm.length < before) {
          storeOdm(odm);
          window.toast?.((before - odm.length) + ' ilgili ödeme de kaldırıldı', 'ok');
        }
      }

      _storeSA(d.filter(function(x) { return x.id !== id; }));
      renderSatinAlma();
      window.toast?.('Kayıt silindi ✓', 'ok');
      window.logActivity?.('view', 'Satınalma silindi: ' + (s.supplier || s.piNo || s.jobId));
    }
  });
};

// ════════════════════════════════════════════════════════════════
// EXCEL / CSV İÇE AKTARMA
// ════════════════════════════════════════════════════════════════

/** @type {Array|null} */
var _saImportRows = null;

/**
 * İçe aktarma şablonu indirir.
 */
window._saDownloadTemplate = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  var header = ['İş ID', 'PI No', 'PI Tarihi', 'Toplam Tutar', 'KDV', 'Para Birimi', 'Avans %', 'Vade Tarihi', 'Teslimat Tarihi', 'İhracat ID', 'Müşteri Sipariş No', 'Teslimat Yeri'];
  var sample = [
    ['JOB-001', 'PI-2026-001', '2026-04-01', 50000, 9000, 'USD', 30, '2026-06-01', '2026-05-15', 'EXP-001', 'CST-100', 'Mersin Limanı'],
  ];
  var ws = XLSX.utils.aoa_to_sheet([header].concat(sample));
  ws['!cols'] = header.map(function() { return { wch: 18 }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  XLSX.writeFile(wb, 'satinalma-import-sablon.xlsx');
  window.toast?.('Şablon indirildi ✓', 'ok');
};

/**
 * İçe aktarma modalını açar.
 */
window._openSAImport = function() {
  var old = document.getElementById('mo-sa-import'); if (old) old.remove();
  _saImportRows = null;

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-import'; mo.style.zIndex = '2200';
  mo.style.display = 'flex';
  mo.innerHTML = '<div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">📥 Satın Alma İçe Aktar</div>'
        + '<div style="font-size:11px;color:var(--t3)">Excel / CSV dosyasından sipariş yükleyin</div></div>'
      + '<button onclick="document.getElementById(\'mo-sa-import\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div id="sa-import-body" style="flex:1;overflow-y:auto;padding:20px">'
      + '<div style="border:2px dashed var(--b);border-radius:12px;padding:32px;text-align:center;cursor:pointer" onclick="document.getElementById(\'sa-import-finp\').click()">'
        + '<div style="font-size:28px;margin-bottom:8px">📂</div>'
        + '<div style="font-size:13px;font-weight:600;color:var(--t)">Dosya seçin veya sürükleyin</div>'
        + '<div style="font-size:11px;color:var(--t3);margin-top:4px">.xlsx, .xls veya .csv</div>'
        + '<input type="file" id="sa-import-finp" accept=".xlsx,.xls,.csv" style="display:none" onchange="window._saImportParse?.(this)">'
      + '</div>'
      + '<div style="margin-top:10px;text-align:center"><button onclick="window._saDownloadTemplate?.()" style="background:none;border:none;cursor:pointer;color:var(--ac);font-size:12px;font-family:inherit;text-decoration:underline">📋 Boş şablon indir</button></div>'
      + '<div id="sa-import-preview" style="display:none;margin-top:16px"></div>'
    + '</div>'
    + '<div id="sa-import-footer" style="display:none;padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-sa-import\').remove()">İptal</button>'
      + '<button class="btn btnp" id="sa-import-confirm" onclick="window._saImportConfirm?.()">📥 İçe Aktar</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
};

/**
 * Dosya parse et ve önizleme göster.
 */
window._saImportParse = function(inp) {
  var file = inp?.files?.[0]; if (!file) return;
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb   = XLSX.read(e.target.result, { type: 'binary' });
      var ws   = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { window.toast?.('Veri yok', 'err'); return; }

      var header = rows[0].map(function(h) { return String(h || '').toLowerCase().trim(); });
      var col = function(key) { return header.findIndex(function(h) { return h.includes(key); }); };

      var cJobId = col('iş') > -1 ? col('iş') : col('job');
      var cPiNo  = col('pi n') > -1 ? col('pi n') : col('pi_no');
      var cPiDt  = col('pi t') > -1 ? col('pi t') : col('pi_tar');
      var cTotal = col('toplam') > -1 ? col('toplam') : col('total');
      var cKdv   = col('kdv');
      var cCur   = col('para') > -1 ? col('para') : col('döviz');
      var cAdv   = col('avans');
      var cVade  = col('vade');
      var cDel   = col('teslimat') > -1 ? col('teslimat') : col('delivery');
      var cExp   = col('ihracat') > -1 ? col('ihracat') : col('export');
      var cCust  = col('müşteri') > -1 ? col('müşteri') : col('customer');
      var cPlace = col('yer') > -1 ? col('yer') : col('place');

      var parsed = [];
      var errors = [];
      var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

      rows.slice(1).forEach(function(row, idx) {
        if (!row || row.every(function(c) { return !c && c !== 0; })) return;
        var jobId = cJobId > -1 ? String(row[cJobId] || '').trim() : '';
        var piNo  = cPiNo > -1 ? String(row[cPiNo] || '').trim() : '';
        var total = cTotal > -1 ? (parseFloat(row[cTotal]) || 0) : 0;
        var piDate = '';
        if (cPiDt > -1 && row[cPiDt]) {
          var dv = row[cPiDt];
          if (typeof dv === 'number') { var dd = new Date(Math.round((dv - 25569) * 86400000)); piDate = dd.toISOString().slice(0, 10); }
          else { var pp = new Date(String(dv)); if (!isNaN(pp.getTime())) piDate = pp.toISOString().slice(0, 10); }
        }
        var vade = '';
        if (cVade > -1 && row[cVade]) {
          var vv = row[cVade];
          if (typeof vv === 'number') { var dd2 = new Date(Math.round((vv - 25569) * 86400000)); vade = dd2.toISOString().slice(0, 10); }
          else { var pp2 = new Date(String(vv)); if (!isNaN(pp2.getTime())) vade = pp2.toISOString().slice(0, 10); }
        }
        var delivery = '';
        if (cDel > -1 && row[cDel]) {
          var dv3 = row[cDel];
          if (typeof dv3 === 'number') { var dd3 = new Date(Math.round((dv3 - 25569) * 86400000)); delivery = dd3.toISOString().slice(0, 10); }
          else { var pp3 = new Date(String(dv3)); if (!isNaN(pp3.getTime())) delivery = pp3.toISOString().slice(0, 10); }
        }

        var rowErrs = [];
        if (!jobId) rowErrs.push('İş ID');
        if (!piNo) rowErrs.push('PI No');
        if (!total) rowErrs.push('Toplam');
        if (rowErrs.length) errors.push({ idx: parsed.length, msgs: rowErrs });

        parsed.push({
          jobId: jobId, piNo: piNo, piDate: piDate, totalAmount: total,
          kdv: cKdv > -1 ? (parseFloat(row[cKdv]) || 0) : 0,
          currency: cCur > -1 ? (String(row[cCur] || 'USD').toUpperCase().trim()) : 'USD',
          advanceRate: cAdv > -1 ? (parseFloat(row[cAdv]) || 0) : 0,
          vadeDate: vade, deliveryDate: delivery,
          exportId: cExp > -1 ? String(row[cExp] || '').trim() : '',
          customerOrderNo: cCust > -1 ? String(row[cCust] || '').trim() : '',
          deliveryPlace: cPlace > -1 ? String(row[cPlace] || '').trim() : '',
          _rowIdx: idx + 1, _errors: rowErrs,
        });
      });

      _saImportRows = parsed;
      var validCount = parsed.length - errors.length;

      // Önizleme
      var preview = document.getElementById('sa-import-preview');
      if (!preview) return;

      var html = '<div style="display:flex;gap:10px;margin-bottom:12px">'
        + '<div style="flex:1;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#16A34A">' + validCount + '</div><div style="font-size:10px;color:var(--t3)">Geçerli</div></div>'
        + (errors.length ? '<div style="flex:1;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:#EF4444">' + errors.length + '</div><div style="font-size:10px;color:var(--t3)">Hatalı</div></div>' : '')
      + '</div>';

      if (errors.length) {
        html += '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:#DC2626">⚠️ ' + errors.length + ' satırda zorunlu alan eksik — hatalılar aktarılmayacak</div>';
      }

      // İlk 5 satır tablo
      html += '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:6px">Önizleme' + (parsed.length > 5 ? ' (ilk 5/' + parsed.length + ')' : '') + '</div>';
      html += '<div style="border:1px solid var(--b);border-radius:8px;overflow:hidden;overflow-x:auto">';
      html += '<div style="display:grid;grid-template-columns:30px 80px 80px 80px 80px 60px 60px;padding:4px 8px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);min-width:480px">';
      html += '<div>#</div><div>İş ID</div><div>PI No</div><div>PI Tarihi</div><div>Toplam</div><div>Döviz</div><div>Avans%</div></div>';

      parsed.slice(0, 5).forEach(function(r) {
        var hasErr = r._errors && r._errors.length > 0;
        var bg = hasErr ? 'background:rgba(239,68,68,.06)' : '';
        html += '<div style="display:grid;grid-template-columns:30px 80px 80px 80px 80px 60px 60px;padding:4px 8px;border-bottom:1px solid var(--b);font-size:11px;' + bg + ';min-width:480px">'
          + '<div style="color:var(--t3)">' + r._rowIdx + '</div>'
          + '<div style="font-weight:600;color:' + (hasErr && !r.jobId ? '#EF4444' : 'var(--t)') + '">' + esc(r.jobId || '—') + '</div>'
          + '<div>' + esc(r.piNo || '—') + '</div>'
          + '<div style="color:var(--t3)">' + (r.piDate || '—') + '</div>'
          + '<div style="font-weight:600">' + (r.totalAmount || '—') + '</div>'
          + '<div>' + (r.currency || '—') + '</div>'
          + '<div>' + (r.advanceRate || '—') + '</div>'
        + '</div>';
        if (hasErr) html += '<div style="padding:2px 8px 4px 38px;font-size:10px;color:#EF4444;min-width:480px">⚠ ' + r._errors.join(', ') + '</div>';
      });
      if (parsed.length > 5) html += '<div style="padding:6px 8px;text-align:center;font-size:11px;color:var(--t3)">… +' + (parsed.length - 5) + ' satır</div>';
      html += '</div>';

      preview.innerHTML = html;
      preview.style.display = 'block';
      var footer = document.getElementById('sa-import-footer');
      if (footer) {
        footer.style.display = 'flex';
        var btn = document.getElementById('sa-import-confirm');
        if (btn) { btn.textContent = '📥 ' + validCount + ' Satır İçe Aktar'; btn.disabled = validCount === 0; }
      }
    } catch (err) {
      window.toast?.('Parse hatası: ' + err.message, 'err');
    }
  };
  reader.readAsBinaryString(file);
};

/**
 * Onaylanmış satırları kaydet.
 */
window._saImportConfirm = function() {
  if (!_saImportRows || !_saImportRows.length) return;
  var d = _loadSA();
  var added = 0;
  var cu = _cuSA();

  _saImportRows.forEach(function(r) {
    if (r._errors && r._errors.length) return;
    var advAmt = Math.round((r.totalAmount || 0) * (r.advanceRate || 0) / 100 * 100) / 100;
    d.unshift({
      id: generateNumericId(),
      jobId: r.jobId, piNo: r.piNo, piDate: r.piDate,
      totalAmount: r.totalAmount, kdv: r.kdv,
      currency: SA_CURRENCIES[r.currency] ? r.currency : 'USD',
      advanceRate: r.advanceRate, advanceAmount: advAmt,
      remainingAmount: Math.round(((r.totalAmount || 0) - advAmt) * 100) / 100,
      vadeDate: r.vadeDate, deliveryDate: r.deliveryDate,
      exportId: r.exportId, customerOrderNo: r.customerOrderNo,
      deliveryPlace: r.deliveryPlace, deliveryOwner: 'alici',
      jobDate: r.piDate || new Date().toISOString().slice(0, 10),
      status: _isAdmSA() ? 'approved' : 'pending',
      source: 'import', createdAt: _nowSA(), createdBy: cu?.id,
    });
    added++;
  });

  _storeSA(d);
  document.getElementById('mo-sa-import')?.remove();
  renderSatinAlma();
  window.toast?.('📥 ' + added + ' sipariş içe aktarıldı ✓', 'ok');
  window.logActivity?.('view', 'Satınalma import: ' + added + ' kayıt');
  _saImportRows = null;
};


// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

var SatinAlma = {
  render:     renderSatinAlma,
  openModal:  _openSAModal,
  loadData:   _loadSA,
  storeData:  _storeSA,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SatinAlma;
} else {
  window.SatinAlma      = SatinAlma;
  window.renderSatinAlma = renderSatinAlma;
  window._openSAModal    = _openSAModal;
  window._loadSA         = _loadSA;
  window._storeSA        = _storeSA;
}
