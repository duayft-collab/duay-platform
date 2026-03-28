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
// _loadSA / _storeSA — database.js loadSatinalma/storeSatinalma kullan (KEYS + Firestore sync + realtime)
function _loadSA() { return typeof loadSatinalma === 'function' ? loadSatinalma() : (function() { try { return JSON.parse(localStorage.getItem(SA_KEY) || '[]'); } catch(e) { return []; } })(); }
function _storeSA(d) { if (typeof storeSatinalma === 'function') { storeSatinalma(d); } else { localStorage.setItem(SA_KEY, JSON.stringify(d)); } }

// ════════════════════════════════════════════════════════════════
// PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectSAPanel() {
  var panel = document.getElementById('panel-satinalma');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = ''
    // TOPBAR — flat modern
    + '<div style="position:sticky;top:0;z-index:100;background:var(--sf)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">Satın Alma</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px" id="sa-sub">PI & Sipariş Takip</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;align-items:center">'
        + (_isAdmSA() ? '<button onclick="window._saBulkApprove?.()" style="padding:6px 12px;border:0.5px solid #16A34A;border-radius:7px;background:rgba(22,163,74,.06);color:#16A34A;font-size:11px;cursor:pointer;font-family:inherit">✅ Toplu Onayla</button>' : '')
        + '<button onclick="window._exportSAXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">Excel</button>'
        + '<button onclick="window._openSAImport?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">📥 İçe Aktar</button>'
        + '<button onclick="window._openSAModal?.(null)" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .12s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">+ Yeni Sipariş</button>'
      + '</div>'
    + '</div>'

    // BÜTÇE PROGRESS BAR
    + '<div id="sa-budget-bar" style="display:none;padding:6px 20px;border-bottom:0.5px solid var(--b);background:var(--s2)"></div>'

    // METRİK KARTLARI
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-bottom:0.5px solid var(--b)">'
      + '<div style="padding:16px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Toplam Sipariş</div><div style="font-size:24px;font-weight:600;color:var(--t)" id="sa-stat-total">0</div></div>'
      + '<div style="padding:16px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Bekleyen Onay</div><div style="font-size:24px;font-weight:600;color:#D97706" id="sa-stat-pending">0</div></div>'
      + '<div style="padding:16px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Bu Ay Harcama</div><div style="font-size:24px;font-weight:600;color:var(--ac)" id="sa-stat-amount">$0</div></div>'
      + '<div style="padding:16px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Tamamlanan</div><div style="font-size:24px;font-weight:600;color:#16A34A" id="sa-stat-approved">0</div></div>'
      + '<div style="padding:16px 20px"><div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Revize</div><div style="font-size:24px;font-weight:600;color:#EA580C" id="sa-stat-revize">0</div></div>'
    + '</div>'

    // TAB NAVİGASYON
    + '<div id="sa-tabs-row" style="display:flex;border-bottom:0.5px solid var(--b);background:var(--sf);overflow-x:auto;padding:0 16px">'
      + '<div id="sa-tab-all" class="sa-tab active" onclick="window._saSetTab(\'all\')" style="padding:11px 18px;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);transition:all .12s">Tümü</div>'
      + '<div id="sa-tab-pending" class="sa-tab" onclick="window._saSetTab(\'pending\')" style="padding:11px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Bekleyen</div>'
      + '<div id="sa-tab-approved" class="sa-tab" onclick="window._saSetTab(\'approved\')" style="padding:11px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Onaylanan</div>'
      + '<div id="sa-tab-paid" class="sa-tab" onclick="window._saSetTab(\'paid\')" style="padding:11px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Tamamlanan</div>'
      + '<div id="sa-tab-revize_gerekli" class="sa-tab" onclick="window._saSetTab(\'revize_gerekli\')" style="padding:11px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Revize</div>'
    + '</div>'

    // FİLTRE — flat
    + '<div style="padding:10px 20px;border-bottom:0.5px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<input class="fi" id="sa-search" placeholder="İş ID, satıcı, tedarikçi ara..." oninput="window.renderSatinAlma?.()" style="font-size:11px;flex:1;min-width:160px;border:0.5px solid var(--b);border-radius:7px">'
      + '<select class="fi" id="sa-cur-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:90px;border:0.5px solid var(--b);border-radius:7px"><option value="">Tüm Döviz</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option></select>'
      + '<input type="date" class="fi" id="sa-from-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:125px;border:0.5px solid var(--b);border-radius:7px">'
      + '<input type="date" class="fi" id="sa-to-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:125px;border:0.5px solid var(--b);border-radius:7px">'
      + '<select class="fi" id="sa-status-f" style="display:none"><option value=""></option></select>'
    + '</div>'
    + '</div>' // sticky wrapper close

    // TABLO — beyaz kart
    + '<div style="margin:12px 20px 0;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden">'
    + '<style>#sa-list>div{transition:background .1s}#sa-list>div:hover{background:var(--s2)!important}</style>'
    + '<div style="overflow-x:auto">'
      + '<div id="sa-thead" style="display:grid;grid-template-columns:120px 150px 90px 100px 100px 90px 75px 90px 80px 100px 90px 100px 120px;gap:0;padding:8px 16px;background:var(--s2);border-bottom:0.5px solid var(--b);min-width:1400px">'
        + [['jobId','İş ID'],['supplier','Satıcı'],['faturaType','Fatura Tipi'],['piDate','PI Tarihi'],['totalAmount','Toplam'],['advanceAmount','Avans'],['advanceRate','Avans%'],['remaining','Kalan'],['currency','Döviz'],['deliveryDate','Teslimat'],['lockedRate','Kur'],['status','Durum'],['_actions','İşlem']].map(function(h) {
            return '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;cursor:pointer" onclick="window._saSortBy?.(\'' + h[0] + '\')">' + h[1] + ' <span style="opacity:.3">⇅</span></div>';
          }).join('')
      + '</div>'
    + '</div>'

    // LİSTE
    + '<div id="sa-list" style="overflow-x:auto"></div>'
    + '</div>';
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

/** @type {string} Aktif sekme */
var _saCurrentTab = 'all';

window._saSetTab = function(tab) {
  _saCurrentTab = tab;
  document.querySelectorAll('.sa-tab').forEach(function(t) {
    var isActive = t.id === 'sa-tab-' + tab;
    t.style.borderBottomColor = isActive ? 'var(--ac)' : 'transparent';
    t.style.color = isActive ? 'var(--ac)' : 'var(--t3)';
    t.style.fontWeight = isActive ? '600' : '400';
  });
  renderSatinAlma();
};

window._saNavClick = function(cat) {
  window._saActiveCat = cat;
  var tabMap = { siparisler:'all', bekleyen:'pending', onaylanan:'approved', odeme_plani:'all' };
  if (tabMap[cat]) { window._saSetTab(tabMap[cat]); }
  else if (cat === 'butce') { window._openSABudget?.(); }
  else if (cat === 'tedarikciler') { window.nav?.('cari'); return; }
  document.querySelectorAll('.sa-nav-btn').forEach(function(b) {
    var active = b.dataset.nav === cat;
    b.style.background = active ? '#EBF2FF' : 'transparent';
    b.style.color = active ? '#007AFF' : '#333';
    b.style.fontWeight = active ? '600' : '400';
  });
};

function renderSatinAlma() {
  _injectSAPanel();
  var all    = _loadSA();
  var search = (document.getElementById('sa-search')?.value || '').toLowerCase();
  var curF   = document.getElementById('sa-cur-f')?.value || '';
  var fromF  = document.getElementById('sa-from-f')?.value || '';
  var toF    = document.getElementById('sa-to-f')?.value || '';

  // İstatistikler
  var el = function(id) { return document.getElementById(id); };
  var totalAmt = all.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).reduce(function(a, s) { return a + (parseFloat(s.totalAmount) || 0); }, 0);
  if (el('sa-stat-total'))    el('sa-stat-total').textContent    = all.length;
  if (el('sa-stat-pending'))  el('sa-stat-pending').textContent  = all.filter(function(s) { return s.status === 'pending'; }).length;
  if (el('sa-stat-approved')) el('sa-stat-approved').textContent = all.filter(function(s) { return s.status === 'approved'; }).length;
  if (el('sa-stat-revize'))   el('sa-stat-revize').textContent   = all.filter(function(s) { return s.status === 'revize_gerekli'; }).length;
  if (el('sa-stat-amount'))   el('sa-stat-amount').textContent   = '$' + Math.round(totalAmt).toLocaleString('tr-TR');

  // Bütçe progress bar
  _saRenderBudgetBar(all);

  // Sekme + filtre
  var fl = all.filter(function(s) {
    if (_saCurrentTab === 'pending' && s.status !== 'pending') return false;
    if (_saCurrentTab === 'approved' && s.status !== 'approved') return false;
    if (_saCurrentTab === 'revize_gerekli' && s.status !== 'revize_gerekli') return false;
    if (_saCurrentTab === 'paid' && s.status !== 'paid') return false;
    if (curF && s.currency !== curF) return false;
    if (fromF && (s.piDate || '') < fromF) return false;
    if (toF && (s.piDate || '') > toF) return false;
    if (search && !((s.jobId || '').toLowerCase().includes(search) || (s.supplier || s.piNo || '').toLowerCase().includes(search) || (s.exportId || '').toLowerCase().includes(search) || (s.vendor?.name || '').toLowerCase().includes(search))) return false;
    return true;
  }).sort(function(a, b) {
    if (_saSortField) {
      var va = a[_saSortField] || '', vb = b[_saSortField] || '';
      if (typeof va === 'number' || _saSortField === 'totalAmount' || _saSortField === 'advanceRate') {
        va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
      }
      var cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return _saSortAsc ? cmp : -cmp;
    }
    return (b.id || 0) - (a.id || 0);
  });

  var cont = document.getElementById('sa-list');
  if (!cont) return;

  var _inpSt = 'font-size:11px;padding:3px 6px;border:1px solid var(--b);border-radius:4px;background:var(--s);color:var(--t);font-family:inherit;width:100%;box-sizing:border-box';
  var _inpEr = 'border-color:#EF4444;background:rgba(239,68,68,.04)';
  var _GRID  = 'display:grid;grid-template-columns:120px 150px 90px 100px 100px 90px 75px 90px 80px 100px 90px 100px 120px;gap:0;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px;min-width:1400px';

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
    var supplierName = s.supplier || s.piNo || '—';

    // Tedarikçi skor badge
    var vendorBadge = '';
    if (s.vendor?.name) {
      var vs = _saCalcVendorScore(s.vendor.name);
      var vColor = vs >= 70 ? '#22C55E' : vs >= 40 ? '#F59E0B' : '#EF4444';
      var vDot = vs >= 70 ? '🟢' : vs >= 40 ? '🟡' : '🔴';
      vendorBadge = '<span style="font-size:9px;margin-left:3px" title="Tedarikçi Skor: ' + vs + '">' + vDot + '</span>';
    }

    // Onay bekleme süresi
    var waitBadge = '';
    if (s.status === 'pending' && s.createdAt) {
      var waitH = Math.round((Date.now() - new Date(s.createdAt.replace(' ', 'T')).getTime()) / 3600000);
      if (waitH >= 48) waitBadge = '<span style="font-size:9px;padding:1px 5px;border-radius:99px;background:rgba(239,68,68,.1);color:#EF4444;margin-left:3px">' + waitH + 'h</span>';
      else if (waitH >= 24) waitBadge = '<span style="font-size:9px;padding:1px 5px;border-radius:99px;background:rgba(245,158,11,.1);color:#D97706;margin-left:3px">' + waitH + 'h</span>';
    }

    // Kilitli kur gösterimi
    var kurInfo = '';
    if (s.lockedRate && s.currency !== 'TRY') {
      kurInfo = '<div style="font-size:9px;color:var(--t3)">🔒' + s.lockedRate + '</div>';
    }

    // Fatura tipi kısa adı
    var ftypes = _saGetFaturaTypes();
    var ft = ftypes.find(function(t) { return t.value === s.faturaType; });
    var ftLabel = ft ? ft.label.split('(')[0].trim().slice(0, 10) : '—';

    html += '<div data-said="' + s.id + '" style="' + _GRID + ';cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'">'
      + '<div class="sa-cell" data-field="jobId" onclick="window._saInlineEdit?.(event,' + s.id + ',\'jobId\')" style="font-weight:600;font-family:\'DM Mono\',monospace;color:var(--ac)">' + esc(s.jobId || '—') + '</div>'
      + '<div class="sa-cell" data-field="supplier" onclick="window._saInlineEdit?.(event,' + s.id + ',\'supplier\')" style="font-weight:500">' + esc(supplierName) + vendorBadge + '</div>'
      + '<div style="font-size:10px;color:var(--t2)">' + ftLabel + '</div>'
      + '<div class="sa-cell" data-field="piDate" onclick="window._saInlineEdit?.(event,' + s.id + ',\'piDate\')" style="color:var(--t3)">' + (s.piDate || '—') + '</div>'
      + '<div class="sa-cell" data-field="totalAmount" onclick="window._saInlineEdit?.(event,' + s.id + ',\'totalAmount\')" style="font-weight:700;color:var(--t)">' + sym + Number(s.totalAmount || 0).toLocaleString('tr-TR') + '</div>'
      + '<div style="color:#D97706;font-weight:600">' + sym + Math.round(advAmt).toLocaleString('tr-TR') + '</div>'
      + '<div class="sa-cell" data-field="advanceRate" onclick="window._saInlineEdit?.(event,' + s.id + ',\'advanceRate\')" style="color:var(--t3)">%' + (s.advanceRate || 0) + '</div>'
      + '<div style="color:#6366F1;font-weight:600">' + sym + Math.round(remaining).toLocaleString('tr-TR') + '</div>'
      + '<div>' + (s.currency || 'USD') + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + (s.deliveryDate || '—') + '</div>'
      + '<div style="font-size:9px;color:var(--t3)">' + (s.lockedRate && s.currency !== 'TRY' ? '🔒' + s.lockedRate : '—') + '</div>'
      + '<div><span style="font-size:10px;padding:2px 6px;border-radius:5px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span>' + waitBadge + '</div>'
      + '<div style="display:flex;gap:3px" onclick="event.stopPropagation()">'
        + '<input type="checkbox" class="sa-bulk-chk" data-said="' + s.id + '" style="display:' + (_isAdmSA() && s.status === 'pending' ? 'block' : 'none') + ';width:14px;height:14px;accent-color:var(--ac)">'
        + (_isAdmSA() && s.status === 'pending' ? '<button onclick="window._approveSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#16A34A">✓</button>' : '')
        + (_isAdmSA() && (s.status === 'pending' || s.status === 'revize_gerekli') ? '<button onclick="window._rejectSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">✗</button>' : '')
        + '<button onclick="window._saToggleQuickView?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px" title="Hızlı Bakış">👁</button>'
        + '<button onclick="window._openSAModal?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px" title="Düzenle">✏️</button>'
        + '<button onclick="window._deleteSA?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">🗑</button>'
      + '</div>'
    + '</div>';
  });

  // Inline yeni satır varsa koru
  var inlineEl = document.getElementById('sa-inline-new');
  cont.innerHTML = html;
  if (inlineEl) cont.appendChild(inlineEl);
}

// ════════════════════════════════════════════════════════════════
// HIZLI BAKIŞ (Quick View Accordion)
// ════════════════════════════════════════════════════════════════

/**
 * Satırın altında accordion tarzı hızlı bakış aç/kapat.
 */
window._saToggleQuickView = function(id) {
  var existing = document.getElementById('sa-qv-' + id);
  if (existing) { existing.remove(); return; }

  // Diğer açık quick view'ları kapat
  document.querySelectorAll('[id^="sa-qv-"]').forEach(function(el) { el.remove(); });

  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var sym = SA_CURRENCIES[s.currency] || '$';
  var st = SA_STATUS[s.status] || SA_STATUS.draft;
  var ftypes = _saGetFaturaTypes();
  var ft = ftypes.find(function(t) { return t.value === s.faturaType; });

  var qv = document.createElement('div');
  qv.id = 'sa-qv-' + id;
  qv.style.cssText = 'padding:14px 20px;background:var(--s2);border-bottom:2px solid var(--ac);animation:pus-row-in .15s ease';

  qv.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:11px">'
    // Sol: Satıcı + Fatura
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Satıcı & Fatura</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Satıcı:</span> <b>' + esc(s.supplier || s.piNo || '—') + '</b></div>'
      + (s.vendor?.name ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Firma:</span> ' + esc(s.vendor.name) + (s.vendor.country ? ' (' + esc(s.vendor.country) + ')' : '') + '</div>' : '')
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Fatura:</span> ' + (ft ? ft.label : '—') + '</div>'
      + (s.lockedRate ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Kur:</span> 🔒 ' + s.lockedRate + ' ₺/' + s.currency + ' <span style="font-size:9px;color:var(--t3)">(' + (_saKurSource === 'tcmb' ? 'TCMB' : 'API') + ')</span></div>' : '')
      + (s.notes ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Not:</span> ' + esc(s.notes) + '</div>' : '')
    + '</div>'
    // Orta: Ödeme Dilimleri
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Ödeme Planı</div>'
      + (s.installments && s.installments.length ? s.installments.map(function(inst) {
          return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--b)">'
            + '<span>' + esc(inst.name) + '</span><span style="font-weight:600">' + sym + Number(inst.amount || 0).toLocaleString('tr-TR') + '</span>'
          + '</div>';
        }).join('') : '<div style="color:var(--t3)">Avans: ' + sym + Math.round(s.advanceAmount || 0).toLocaleString('tr-TR') + '<br>Kalan: ' + sym + Math.round(s.remainingAmount || 0).toLocaleString('tr-TR') + '</div>')
    + '</div>'
    // Sağ: Belgeler + Onay
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Belgeler & Onay</div>'
      + '<div style="margin-bottom:4px">' + (s.piFileName ? '📎 PI: ' + esc(s.piFileName) : '⚠️ PI dosyası yok') + '</div>'
      + '<div style="margin-bottom:4px">' + (s.sozFileName ? '📎 Sözleşme: ' + esc(s.sozFileName) : '⚠️ Sözleşme yok') + '</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Durum:</span> <span style="color:' + st.c + ';font-weight:600">' + st.l + '</span></div>'
      + (s.approvedAt ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Onay:</span> ' + s.approvedAt + '</div>' : '')
      + (s.rejectReason ? '<div style="margin-bottom:4px;color:#DC2626"><span style="color:var(--t3)">Red:</span> ' + esc(s.rejectReason) + '</div>' : '')
    + '</div>'
  + '</div>';

  // Satırın hemen altına ekle
  var row = document.querySelector('[data-said="' + id + '"]');
  if (row && row.nextSibling) row.parentNode.insertBefore(qv, row.nextSibling);
  else if (row) row.parentNode.appendChild(qv);
};

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
    status: 'pending',
    createdAt: _nowSA(), createdBy: _cuSA()?.id,
    vendor: { name: '', country: '', contact: '', phone: '', email: '', address: '', tax: '' },
  };
  d.unshift(entry);
  _storeSA(d);
  document.getElementById('sa-inline-new')?.remove();
  renderSatinAlma();
  window.toast?.('Satır eklendi ✓ — Dosya eklemek için 📎 butonunu kullanın', 'ok');
  window.logActivity?.('view', 'Satınalma inline eklendi: ' + supplier);
  // Ödeme onay sonrası yansır — burada çağırılmaz

  if (true) { // Her kayıt pending — bildirim gönder
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
  mo.className = 'mo'; mo.id = 'mo-sa-files'; 
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

/** @type {{ USD: number, EUR: number, GBP: number }} Canlı kurlar */
var _saLiveRates = { USD: 38.50, EUR: 41.20, GBP: 48.90 };
var _saKurSource = 'fallback'; // 'tcmb' | 'fallback'

/**
 * TCMB XML kurlarını çeker. CORS sorunu varsa exchangerate-api fallback.
 */
function _fetchTCMBRates() {
  fetch('https://www.tcmb.gov.tr/kurlar/today.xml')
    .then(function(r) { return r.text(); })
    .then(function(xml) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(xml, 'text/xml');
      var currencies = doc.querySelectorAll('Currency');
      currencies.forEach(function(c) {
        var code = c.getAttribute('CurrencyCode');
        var buying = c.querySelector('ForexBuying');
        if (buying && buying.textContent) {
          var rate = parseFloat(buying.textContent.replace(',', '.'));
          if (rate > 0) {
            if (code === 'USD') _saLiveRates.USD = rate;
            if (code === 'EUR') _saLiveRates.EUR = rate;
            if (code === 'GBP') _saLiveRates.GBP = rate;
          }
        }
      });
      _saKurSource = 'tcmb';
      localStorage.setItem('ak_tcmb_cache', JSON.stringify({ ts: Date.now(), rates: _saLiveRates }));
    })
    .catch(function() {
      // CORS fallback: exchangerate-api
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d?.rates?.TRY) {
            _saLiveRates.USD = Math.round(d.rates.TRY * 100) / 100;
            _saLiveRates.EUR = Math.round(d.rates.TRY / (d.rates.EUR || 1) * 100) / 100;
            _saLiveRates.GBP = Math.round(d.rates.TRY / (d.rates.GBP || 1) * 100) / 100;
            _saKurSource = 'fallback';
          }
        }).catch(function() {
          // LocalStorage cache
          try { var c = JSON.parse(localStorage.getItem('ak_tcmb_cache') || '{}'); if (c.rates) Object.assign(_saLiveRates, c.rates); } catch(e) {}
        });
    });
}
_fetchTCMBRates();
window._fetchTCMBRates = _fetchTCMBRates;

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
  mo.className = 'mo'; mo.id = 'mo-satinalma'; 

  // Dikey form HTML
  var verticalHTML = ''
    // Satır 1
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">İHRACAT ID</div><input class="fi" id="sa-export-id" placeholder="EXP-2026-..." value="' + (s?.exportId || '') + '"></div>'
      + '<div><div class="fl">İŞ ID (Görev) <span style="color:var(--rd)">*</span></div><select class="fi" id="sa-job-id" onchange="window._saTaskSelected?.()"><option value="">— Görev seçin —</option>'
        + (function() { var tasks = typeof loadTasks === 'function' ? loadTasks().filter(function(t) { return !t.done; }).slice(0, 50) : []; var esc2 = typeof escapeHtml === 'function' ? escapeHtml : function(v){return v;}; return tasks.map(function(t) { return '<option value="' + esc2(String(t.id)) + '"' + (String(s?.jobId) === String(t.id) ? ' selected' : '') + '>' + esc2(t.title.slice(0,40)) + '</option>'; }).join(''); })()
        + '<option value="_manual">✏️ Manuel giriş...</option></select></div>'
      + '<div><div class="fl">İŞ BAŞLAMA <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-job-date" value="' + (s?.jobDate || '') + '"></div>'
    + '</div>'
    // Satır 2
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">SATICI (Cari) <span style="color:var(--rd)">*</span></div><div style="display:flex;gap:4px"><select class="fi" id="sa-pi-no" style="flex:1">'
        + '<option value="">— Cari seçin —</option>'
        + (function() { var cari = typeof loadCari === 'function' ? loadCari() : []; var esc2 = typeof escapeHtml === 'function' ? escapeHtml : function(v){return v;}; return cari.map(function(c) { return '<option value="' + esc2(c.name) + '"' + ((s?.supplier || s?.piNo || '') === c.name ? ' selected' : '') + '>' + esc2(c.name) + ' (' + (c.type || '') + ')</option>'; }).join(''); })()
        + '</select><button type="button" onclick="window._openQuickCari?.()" class="btn btns" style="font-size:12px;padding:3px 8px;flex-shrink:0">+</button></div></div>'
      + '<div><div class="fl">PI NO <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-pi-number" placeholder="PI-2026-001" value="' + (s?.piNumber || s?.piNo || '') + '"></div>'
      + '<div><div class="fl">PI TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-pi-date" value="' + (s?.piDate || '') + '"></div>'
    + '</div>'
    // Satır 3: Fatura Tipi + KDV + Toplam + Para Birimi
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
      + '<div><div class="fl">FATURA TİPİ</div><select class="fi" id="sa-fatura-type" onchange="window._saFaturaTypeChanged?.()">'
        + (function() {
            var types = _saGetFaturaTypes();
            return types.map(function(t) { return '<option value="' + t.value + '"' + (s?.faturaType === t.value ? ' selected' : '') + '>' + t.label + '</option>'; }).join('');
          })()
      + '</select></div>'
      + '<div><div class="fl">KDV TUTARI</div><input class="fi" type="number" id="sa-kdv" placeholder="0" min="0" step="0.01" value="' + (s?.kdv || '') + '"></div>'
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
    // Satıcı bilgileri — cari dropdown'dan gelir, gizli input'lar uyumluluk için
    + '<input type="hidden" id="sa-vendor-name" value="' + (s?.vendor?.name || s?.supplier || '') + '">'
    + '<input type="hidden" id="sa-vendor-country" value="' + (s?.vendor?.country || '') + '">'
    + '<input type="hidden" id="sa-vendor-contact" value="' + (s?.vendor?.contact || '') + '">'
    + '<input type="hidden" id="sa-vendor-phone" value="' + (s?.vendor?.phone || '') + '">'
    + '<input type="hidden" id="sa-vendor-email" value="' + (s?.vendor?.email || '') + '">'
    + '<input type="hidden" id="sa-vendor-address" value="' + (s?.vendor?.address || '') + '">'
    + '<input type="hidden" id="sa-vendor-tax" value="' + (s?.vendor?.tax || '') + '">'
    // Açıklama / Not
    + '<div><div class="fl">AÇIKLAMA / NOT</div><textarea class="fi" id="sa-notes" rows="2" style="resize:none" placeholder="Ek bilgi, özel şartlar...">' + (s?.notes || '') + '</textarea></div>'
    // Döküman ekleme
    + '<div><div class="fl">DÖKÜMAN EKLE</div>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    + (s?.docs && s.docs.length ? s.docs.map(function(doc, i) { return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5">📎 ' + esc(doc.name) + '</span>'; }).join('') : '')
    + '<button type="button" onclick="window._saUploadDoc?.()" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 10px">📎 Dosya Yükle</button>'
    + '<span id="sa-doc-count" style="font-size:10px;color:var(--t3)">' + (s?.docs ? s.docs.length + ' dosya' : '') + '</span>'
    + '</div>'
    + '<input type="hidden" id="sa-f-docs" value="' + (s?.docs ? JSON.stringify(s.docs).replace(/"/g, '&quot;') : '[]') + '">'
    + '</div>'
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
              return '<div class="sa-installment-row" style="display:grid;grid-template-columns:1fr 1fr 80px 1fr auto 30px;gap:6px;margin-bottom:6px;align-items:center">'
                + '<input class="fi sa-inst-name" placeholder="Ödeme adı" value="' + (inst.name || '') + '" style="font-size:11px;padding:5px 8px">'
                + '<input type="number" class="fi sa-inst-amount" placeholder="Tutar" value="' + (inst.amount || '') + '" style="font-size:11px;padding:5px 8px" oninput="window._saInstCalc?.()">'
                + '<input type="number" class="fi sa-inst-rate" placeholder="%" value="' + (inst.rate || '') + '" style="font-size:11px;padding:5px 8px" min="0" max="100" oninput="window._saInstRateCalc?.(this)">'
                + '<input type="date" class="fi sa-inst-due" value="' + (inst.due || '') + '" style="font-size:11px;padding:5px 8px">'
                + (idx >= 1 ? '<label style="display:flex;align-items:center;gap:3px;font-size:9px;color:var(--t3);white-space:nowrap;cursor:pointer" title="Teslimat yapılmadan ödeme yapılamaz"><input type="checkbox" class="sa-inst-delivery-req" ' + (inst.deliveryRequired ? 'checked' : '') + ' style="accent-color:var(--ac)">Teslimat şartı</label>' : '<div></div>')
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

/** Satınalma döküman yükleme */
window._saUploadDoc = function() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png,.xlsx,.docx'; inp.multiple = true;
  inp.onchange = function() {
    var ex = []; try { ex = JSON.parse(document.getElementById('sa-f-docs')?.value || '[]'); } catch(e) {}
    Array.from(this.files).forEach(function(file) {
      if (file.size > 8*1024*1024) { window.toast?.('Dosya çok büyük (max 8MB)', 'warn'); return; }
      var r = new FileReader();
      r.onload = function(e) {
        ex.push({ name: file.name, data: e.target.result, ts: new Date().toISOString() });
        var el = document.getElementById('sa-f-docs'); if (el) el.value = JSON.stringify(ex);
        var cnt = document.getElementById('sa-doc-count'); if (cnt) cnt.textContent = ex.length + ' dosya';
      };
      r.readAsDataURL(file);
    });
    window.toast?.('Dosyalar eklendi ✓', 'ok');
  };
  inp.click();
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
    var iDelReq = row.querySelector('.sa-inst-delivery-req')?.checked || false;
    if (iAmount > 0 || iRate > 0) {
      installments.push({ name: iName, amount: iAmount, rate: iRate, due: iDue, deliveryRequired: iDelReq });
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
    faturaType:      document.getElementById('sa-fatura-type')?.value || 'kdvli',
    lockedRate:      (currency !== 'TRY') ? (_saLiveRates[currency] || 1) : null,
    piNumber:        (document.getElementById('sa-pi-number')?.value || '').trim(),
    notes:           (document.getElementById('sa-notes')?.value || '').trim(),
    docs:            (function() { try { return JSON.parse(document.getElementById('sa-f-docs')?.value || '[]'); } catch(e) { return []; } })(),
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
        // Onaylanan kayıt düzenlenemez (admin hariç)
        if (item.status === 'approved' && !_isAdmSA()) {
          window.toast?.('Onaylanmış kayıt düzenlenemez', 'err'); return;
        }
        // Revize durumundaysa tekrar pending yap
        if (item.status === 'revize_gerekli') {
          entry.status = 'pending';
          delete entry.rejectedBy;
          delete entry.rejectReason;
        }
        // Mevcut dosyaları koru
        if (!entry.piFileData && item.piFileData) { entry.piFileData = item.piFileData; entry.piFileName = item.piFileName; }
        Object.assign(item, entry);
      }
    } else {
      entry.id        = generateNumericId();
      entry.status    = 'pending'; // Onay olmadan asla approved olmamalı
      entry.createdAt = _nowSA();
      entry.createdBy = _cuSA()?.id;
      d.unshift(entry);
    }

    _storeSA(d);
    document.getElementById('mo-satinalma')?.remove();
    renderSatinAlma();
    window.logActivity?.('view', 'Satınalma ' + (isNew ? 'eklendi' : 'güncellendi') + ': ' + supplier);
    window.toast?.((isNew ? 'Sipariş eklendi' : 'Güncellendi') + ' ✓', 'ok');

    // Yeni kayıt — pending olarak oluşturulur, onay sonrası nakit akışına yansır
    if (isNew) {
      // Yöneticilere bildirim gönder
      if (true) { // her zaman bildirim — artık her kayıt pending
        var cuName = _cuSA()?.name || '';
        var managers = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
          return (u.role === 'admin' || u.role === 'manager') && u.status === 'active';
        });
        console.log('[SA] bildirim gönderildi:', managers.length, 'yönetici');
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
  // KURAL: Onaysız kayıt nakit akışına ASLA düşmez
  if (sa.status !== 'approved' && sa.status !== 'paid' && sa.approvalStatus !== 'kesinlesti') {
    console.info('[SA] Onaysız kayıt — nakit akışına yansımıyor:', sa.id);
    return;
  }
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
        approvalStatus: inst.deliveryRequired ? 'delivery_pending' : 'pending',
        deliveryRequired: inst.deliveryRequired || false,
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
  mo.className = 'mo'; mo.id = 'mo-sa-reject'; mo.style.display = 'flex'; 
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
  mo.className = 'mo'; mo.id = 'mo-sa-detail'; 
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
  mo.className = 'mo'; mo.id = 'mo-sa-import'; 
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
      status: 'pending',
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
// AKILLI TARİH GİRİŞİ — tüm date input'larda çalışır
// ════════════════════════════════════════════════════════════════

/**
 * Türkçe doğal dil tarih ifadesini YYYY-MM-DD'ye çevirir.
 * Desteklenen: "yarın", "bugün", "dün", "5 gün sonra", "2 hafta sonra",
 * "1 ay sonra", "3 gün önce", "2 hafta önce", "1 yıl sonra"
 * @param {string} str
 * @returns {string|null} YYYY-MM-DD veya null
 */
function _parseSmartDate(str) {
  if (!str) return null;
  str = str.trim().toLowerCase();

  // Sabit kelimeler
  if (str === 'bugün' || str === 'bugun') return new Date().toISOString().slice(0, 10);
  if (str === 'yarın' || str === 'yarin') { var d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  if (str === 'dün' || str === 'dun') { var d2 = new Date(); d2.setDate(d2.getDate() - 1); return d2.toISOString().slice(0, 10); }

  // "X gün/hafta/ay/yıl sonra/önce" pattern
  var match = str.match(/^(\d+)\s*(gün|gun|hafta|ay|yıl|yil)\s*(sonra|önce|once)$/i);
  if (match) {
    var n    = parseInt(match[1]);
    var unit = match[2].replace('ü', 'u').replace('ı', 'i');
    var dir  = match[3].replace('ö', 'o');
    var mult = dir === 'once' ? -1 : 1;
    var now  = new Date();

    if (unit === 'gun') now.setDate(now.getDate() + n * mult);
    else if (unit === 'hafta') now.setDate(now.getDate() + n * 7 * mult);
    else if (unit === 'ay') now.setMonth(now.getMonth() + n * mult);
    else if (unit === 'yil') now.setFullYear(now.getFullYear() + n * mult);

    return now.toISOString().slice(0, 10);
  }

  return null;
}
window._parseSmartDate = _parseSmartDate;

/**
 * Tüm date input'lara akıllı tarih parse ekler.
 * blur event'inde metin girişini tarihe çevirir.
 */
function _initSmartDateInputs() {
  document.addEventListener('blur', function(e) {
    if (e.target?.type !== 'date') return;
    // Date input'ta metin girişi olduğunda browser bazen boş bırakır
    // Biz input'un title/placeholder'ına yazılmış metni kontrol ediyoruz
  }, true);

  // Alternatif: date input'ların yanına text input overlay
  document.addEventListener('focusin', function(e) {
    var inp = e.target;
    if (!inp || inp.type !== 'date' || inp.dataset.smartDate) return;
    inp.dataset.smartDate = '1';

    // date input'un üstüne text input ekle
    var wrap = inp.parentElement;
    if (!wrap) return;
    if (wrap.style.position !== 'relative' && wrap.style.position !== 'absolute') {
      wrap.style.position = 'relative';
    }

    var hint = document.createElement('input');
    hint.type = 'text';
    hint.placeholder = 'ör: yarın, 5 gün sonra...';
    hint.style.cssText = 'position:absolute;right:2px;top:2px;width:130px;font-size:9px;padding:2px 6px;border:1px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t3);z-index:1;display:none';
    hint.onfocus = function() { hint.style.display = 'block'; };
    hint.onblur = function() {
      var parsed = _parseSmartDate(hint.value);
      if (parsed) { inp.value = parsed; hint.value = ''; }
      hint.style.display = 'none';
    };
    hint.onkeydown = function(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); hint.blur(); }
      if (ev.key === 'Escape') { hint.value = ''; hint.style.display = 'none'; }
    };
    wrap.appendChild(hint);

    // Date input'a çift tıklayınca hint göster
    inp.addEventListener('dblclick', function() { hint.style.display = 'block'; hint.focus(); });
  }, true);
}
setTimeout(_initSmartDateInputs, 1000);

// ════════════════════════════════════════════════════════════════
// GÖREV SEÇİMİ — İş ID dropdown'ından görev seçilince otomatik doldur

window._saTaskSelected = function() {
  var sel = document.getElementById('sa-job-id');
  if (!sel) return;
  var taskId = sel.value;
  if (taskId === '_manual') {
    // Manuel giriş — select'i input'a çevir
    var parent = sel.parentElement;
    var inp = document.createElement('input');
    inp.className = 'fi'; inp.id = 'sa-job-id'; inp.placeholder = 'İş ID girin...';
    inp.style.cssText = sel.style.cssText;
    parent.replaceChild(inp, sel);
    inp.focus();
    return;
  }
  if (!taskId) return;
  var tasks = typeof loadTasks === 'function' ? loadTasks() : [];
  var task = tasks.find(function(t) { return String(t.id) === String(taskId); });
  if (!task) return;
  // Otomatik doldur
  var dateEl = document.getElementById('sa-job-date');
  if (dateEl && !dateEl.value) dateEl.value = task.start || task.due || '';
  var deptEl = document.getElementById('sa-vendor-country'); // departman alanı olarak kullan
  if (deptEl && !deptEl.value && task.department) deptEl.value = task.department;
};

// SIRALAMA
// ════════════════════════════════════════════════════════════════

var _saSortField = '';
var _saSortAsc = true;

window._saSortBy = function(field) {
  if (field === '_actions') return;
  if (_saSortField === field) { _saSortAsc = !_saSortAsc; }
  else { _saSortField = field; _saSortAsc = true; }
  renderSatinAlma();
};

// ════════════════════════════════════════════════════════════════
// FATURA TİPLERİ CRUD
// ════════════════════════════════════════════════════════════════

var SA_FATURA_KEY = 'ak_sa_fatura_tipleri';
var SA_DEFAULT_FATURA_TYPES = [
  { value: 'kdvli',         label: 'KDV\'li',                kdv: true  },
  { value: 'ihrac_kayitli', label: 'İhraç Kayıtlı (KDV\'siz)', kdv: false },
  { value: 'transit',       label: 'Transit Ticaret (KDV\'siz)', kdv: false },
  { value: 'muhasebe',      label: 'Muhasebe (KDV\'li)',      kdv: true  },
  { value: 'serbest_bolge', label: 'Serbest Bölge',           kdv: false },
  { value: 'dahilde',       label: 'Dahilde İşleme',          kdv: false },
];

function _saGetFaturaTypes() {
  try { var d = JSON.parse(localStorage.getItem(SA_FATURA_KEY)); if (Array.isArray(d) && d.length) return d; } catch(e) {}
  return SA_DEFAULT_FATURA_TYPES;
}
function _saStoreFaturaTypes(d) { localStorage.setItem(SA_FATURA_KEY, JSON.stringify(d)); }

/**
 * Fatura tipi değişince KDV alanını otomatik kontrol eder.
 */
window._saFaturaTypeChanged = function() {
  var sel = document.getElementById('sa-fatura-type');
  var kdvEl = document.getElementById('sa-kdv');
  if (!sel || !kdvEl) return;
  var types = _saGetFaturaTypes();
  var ft = types.find(function(t) { return t.value === sel.value; });
  if (ft && !ft.kdv) {
    kdvEl.value = '0'; kdvEl.disabled = true; kdvEl.style.background = 'var(--s2)';
  } else {
    kdvEl.disabled = false; kdvEl.style.background = '';
  }
};

// ════════════════════════════════════════════════════════════════
// TEDARİKÇİ PERFORMANS SKORU
// ════════════════════════════════════════════════════════════════

/**
 * Tedarikçi adına göre basit skor hesaplar (0-100).
 * Onaylanan sipariş oranı temel kriter.
 */
function _saCalcVendorScore(vendorName) {
  if (!vendorName) return 50;
  var all = _loadSA();
  var vendorOrders = all.filter(function(s) {
    return (s.vendor?.name || '').toLowerCase() === vendorName.toLowerCase() || (s.supplier || '').toLowerCase() === vendorName.toLowerCase();
  });
  if (vendorOrders.length < 2) return 50; // yetersiz veri
  var approved = vendorOrders.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).length;
  var rejected = vendorOrders.filter(function(s) { return s.status === 'rejected' || s.status === 'revize_gerekli'; }).length;
  var total = vendorOrders.length;
  var score = Math.round((approved / total * 70) + (Math.max(0, 30 - rejected * 10)));
  return Math.max(0, Math.min(100, score));
}

// ════════════════════════════════════════════════════════════════
// TOPLU ONAY
// ════════════════════════════════════════════════════════════════

window._saBulkApprove = function() {
  if (!_isAdmSA()) { window.toast?.('Yetki yok', 'err'); return; }
  var checked = document.querySelectorAll('.sa-bulk-chk:checked');
  if (!checked.length) { window.toast?.('Onaylanacak kayıt seçin', 'err'); return; }
  var ids = [];
  checked.forEach(function(cb) { ids.push(parseInt(cb.dataset.said)); });
  var d = _loadSA();
  var count = 0;
  ids.forEach(function(id) {
    var s = d.find(function(x) { return x.id === id; });
    if (s && s.status === 'pending') {
      s.status = 'approved'; s.approvedBy = _cuSA()?.id; s.approvedAt = _nowSA();
      count++;
      _saCreatePayments(s);
    }
  });
  if (count) {
    _storeSA(d); renderSatinAlma();
    window.toast?.('✅ ' + count + ' sipariş onaylandı', 'ok');
    window.logActivity?.('view', 'Toplu onay: ' + count + ' satınalma');
  }
};

// ════════════════════════════════════════════════════════════════
// SATIN ALMA BÜTÇESİ
// ════════════════════════════════════════════════════════════════

var SA_BUDGET_KEY = 'ak_sa_budget';

window._openSABudget = function() {
  if (!_isAdmSA()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var budget = 0;
  try { budget = parseFloat(localStorage.getItem(SA_BUDGET_KEY) || '0') || 0; } catch(e) {}
  var old = document.getElementById('mo-sa-budget'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-budget'; mo.style.display = 'flex'; 
  mo.innerHTML = '<div class="moc" style="max-width:360px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 18px;border-bottom:1px solid var(--b)"><div style="font-size:14px;font-weight:700;color:var(--t)">📊 Aylık Satın Alma Bütçesi</div></div>'
    + '<div style="padding:16px 18px">'
      + '<div class="fl">AYLIK LİMİT ($)</div>'
      + '<input type="number" class="fi" id="sa-budget-inp" value="' + budget + '" placeholder="0" style="font-size:16px;padding:10px">'
    + '</div>'
    + '<div style="padding:10px 18px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-sa-budget\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="localStorage.setItem(\'' + SA_BUDGET_KEY + '\',document.getElementById(\'sa-budget-inp\').value||\'0\');document.getElementById(\'mo-sa-budget\').remove();renderSatinAlma();window.toast?.(\'Bütçe kaydedildi ✓\',\'ok\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
};

/**
 * Bütçe progress bar render.
 */
function _saRenderBudgetBar(all) {
  var bar = document.getElementById('sa-budget-bar');
  if (!bar) return;
  var budget = 0;
  try { budget = parseFloat(localStorage.getItem(SA_BUDGET_KEY) || '0') || 0; } catch(e) {}
  if (!budget) { bar.style.display = 'none'; return; }

  var thisMonth = new Date().toISOString().slice(0, 7);
  var spent = all.filter(function(s) {
    return (s.status === 'approved' || s.status === 'paid') && (s.piDate || '').startsWith(thisMonth);
  }).reduce(function(a, s) { return a + (parseFloat(s.totalAmount) || 0); }, 0);

  var pct = Math.min(100, Math.round(spent / budget * 100));
  var color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#16A34A';

  bar.style.display = 'block';
  bar.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-size:10px;color:var(--t3);white-space:nowrap">Bütçe: $' + Math.round(spent).toLocaleString('tr-TR') + ' / $' + Math.round(budget).toLocaleString('tr-TR') + '</span>'
    + '<div style="flex:1;height:6px;background:var(--b);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>'
    + '<span style="font-size:10px;font-weight:700;color:' + color + '">' + pct + '%</span>'
  + '</div>';

  if (pct >= 90) {
    window.addNotif?.('🚨', 'Satınalma bütçesi %' + pct + ' kullanıldı!', 'err', 'satinalma');
  }
}

// Onay SLA — 48h+ bekleyen kayıtlar için admin'e bildirim
function _saCheckApprovalSLA() {
  var all = _loadSA();
  var sentKey = 'ak_sa_sla_sent';
  var sent = {};
  try { sent = JSON.parse(localStorage.getItem(sentKey) || '{}'); } catch(e) { sent = {}; }
  var changed = false;
  var todayS = new Date().toISOString().slice(0, 10);

  all.forEach(function(s) {
    if (s.status !== 'pending' || !s.createdAt) return;
    var waitH = Math.round((Date.now() - new Date(s.createdAt.replace(' ', 'T')).getTime()) / 3600000);
    if (waitH >= 48 && !sent[s.id + '_48']) {
      window.addNotif?.('⏰', 'Satınalma 48+ saat onay bekliyor: ' + (s.supplier || s.jobId), 'warn', 'satinalma');
      sent[s.id + '_48'] = todayS; changed = true;
    }
  });
  if (changed) localStorage.setItem(sentKey, JSON.stringify(sent));
}
setTimeout(_saCheckApprovalSLA, 4000);

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
