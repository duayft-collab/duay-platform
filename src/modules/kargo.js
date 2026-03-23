/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/kargo.js  —  v9.0.0
 * Kargo & Konteyner Yönetimi
 * Onay 1: Kart görünümü  Onay 2: Excel Import  Onay 3: PDF Rapor
 * Onay 5: Konteyner detay  Onay 6: Gelişmiş filtre
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const KARGO_STATUS = {
  bekle:  { l: 'Beklemede', ic: '⏳', c: 'ba', color: '#F59E0B' },
  yolda:  { l: 'Yolda',    ic: '🚛', c: 'bb', color: '#3B82F6' },
  teslim: { l: 'Teslim',   ic: '✅', c: 'bg', color: '#22C55E' },
  iade:   { l: 'İade',     ic: '↩️', c: 'br', color: '#EF4444' },
};

const KTN_TRACKING_URLS = {
  'MSC':         'https://www.msc.com/en/track-a-shipment?trackingNumber=',
  'Maersk':      'https://www.maersk.com/tracking/',
  'CMA CGM':     'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=',
  'COSCO':       'https://elines.coscoshipping.com/ebtracking/visible?trNo=',
  'Hapag-Lloyd': 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=',
  'ONE':         'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?cntrNo=',
  'Evergreen':   'https://www.evergreen-line.com/eservice/cargotracking/ct_input.do?searchType=CT&cntrNum=',
  'Yang Ming':   'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?SearchType=3&CNTNO=',
  'ZIM':         'https://www.zim.com/tools/track-a-shipment?container=',
};

let KRG_KONTEYN_TIMER = null;
let KARGO_VIEW = localStorage.getItem('ak_kargo_view') || 'card';
if (typeof KARGO_FILTER === 'undefined') var KARGO_FILTER = 'all';

// ── Yardımcılar ───────────────────────────────────────────────────
function _isAdminK() { return window.isAdmin?.() || window.Auth?.getCU?.()?.role === 'admin' || window.Auth?.getCU?.()?.role === 'manager'; }
function _getCUK()   { return window.Auth?.getCU?.(); }
function _nowTsK()   { return typeof nowTs === 'function' ? nowTs() : new Date().toLocaleString('tr-TR'); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL INJECTION
// ════════════════════════════════════════════════════════════════

function _injectKargoPanel() {
  const panel = g('panel-kargo');
  if (!panel || panel.dataset.v9) return;
  panel.dataset.v9 = '1';

  // Header
  const ph = panel.querySelector('.ph');
  if (ph) {
    ph.innerHTML = [
      '<div>',
        '<div class="pht">📦 Kargo Yönetimi</div>',
        '<div class="phs">Gelen/giden kargo, konteyner ve lojistik operasyonları</div>',
      '</div>',
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">',
        // Görünüm toggle
        '<div style="display:flex;background:var(--s2);border-radius:8px;padding:2px;gap:1px">',
          '<button id="krg-v-card"  class="cvb on" data-kview="card"  style="font-size:11px;padding:5px 10px">⊞ Kart</button>',
          '<button id="krg-v-table" class="cvb"    data-kview="table" style="font-size:11px;padding:5px 10px">≡ Tablo</button>',
        '</div>',
        '<button class="btn btns" onclick="importKargoFile()" style="border-radius:9px;font-size:12px">',
          '↑ Excel Yükle',
        '</button>',
        '<button class="btn btns" onclick="exportKargoXlsx()" style="border-radius:9px;font-size:12px">',
          '⬇ Excel İndir',
        '</button>',
        '<button class="btn btns" onclick="printKargoRapor()" style="border-radius:9px;font-size:12px">',
          '🖨 PDF Rapor',
        '</button>',
        '<button class="btn btns" onclick="openKargoFirmaModal()" style="border-radius:9px;font-size:12px">⚙️ Firmalar</button>',
        '<button class="btn btns" onclick="openKargoModal(\'gelen\')" style="border-radius:9px;font-size:12px">📥 Gelen</button>',
        '<button class="btn btnp" onclick="openKargoModal(\'giden\')" style="border-radius:9px;font-size:12px">📤 Giden</button>',
        '<input type="file" id="krg-import-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="processKargoImport(this)">',
      '</div>',
    ].join('');
  }

  // Filtre bar güncelle — tarih aralığı + sıralama ekle
  const filterBar = panel.querySelector('[id^="krg-search"]')?.closest('div[style]');
  if (filterBar) {
    filterBar.innerHTML = [
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">',
        '<button class="chip on" data-kf="all"    onclick="setKargoFilter(\'all\',this)">Tümü</button>',
        '<button class="chip"    data-kf="gelen"  onclick="setKargoFilter(\'gelen\',this)">📥 Gelen</button>',
        '<button class="chip"    data-kf="giden"  onclick="setKargoFilter(\'giden\',this)">📤 Giden</button>',
        '<button class="chip"    data-kf="bekle"  onclick="setKargoFilter(\'bekle\',this)">⏳ Beklemede</button>',
        '<button class="chip"    data-kf="yolda"  onclick="setKargoFilter(\'yolda\',this)">🚛 Yolda</button>',
        '<button class="chip"    data-kf="teslim" onclick="setKargoFilter(\'teslim\',this)">✅ Teslim</button>',
      '</div>',
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">',
        '<div style="position:relative;flex:1;min-width:160px">',
          '<svg style="position:absolute;left:8px;top:50%;transform:translateY(-50%)" width="12" height="12" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="4.5" stroke="var(--t3)" stroke-width="1.3"/><path d="M10 10l2 2" stroke="var(--t3)" stroke-width="1.3" stroke-linecap="round"/></svg>',
          '<input class="fi" id="krg-search" placeholder="Firma, gönderici, alıcı…" oninput="renderKargo()" style="padding-left:26px;border-radius:8px">',
        '</div>',
        '<input type="date" class="fi" id="krg-date-from" onchange="renderKargo()" style="border-radius:8px;min-width:130px">',
        '<span style="font-size:11px;color:var(--t3)">—</span>',
        '<input type="date" class="fi" id="krg-date-to"   onchange="renderKargo()" style="border-radius:8px;min-width:130px">',
        '<select class="fi" id="krg-sort" onchange="renderKargo()" style="border-radius:8px;min-width:120px">',
          '<option value="date-desc">↓ Tarih (Yeni)</option>',
          '<option value="date-asc">↑ Tarih (Eski)</option>',
          '<option value="firm">A→Z Firma</option>',
          '<option value="status">Durum</option>',
        '</select>',
        '<button class="btn btns" onclick="_clearKargoFilters()" style="font-size:11px;border-radius:8px">✕ Temizle</button>',
      '</div>',
    ].join('');
  }

  // View toggle event delegation
  panel.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-kview]');
    if (!btn) return;
    KARGO_VIEW = btn.dataset.kview;
    localStorage.setItem('ak_kargo_view', KARGO_VIEW);
    panel.querySelectorAll('.cvb[data-kview]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    renderKargo();
  });
}

function _clearKargoFilters() {
  const ids = ['krg-search','krg-date-from','krg-date-to'];
  ids.forEach(id => { const el = g(id); if (el) el.value = ''; });
  const sort = g('krg-sort'); if (sort) sort.value = 'date-desc';
  KARGO_FILTER = 'all';
  document.querySelectorAll('#panel-kargo .chip[data-kf]').forEach(b => {
    b.classList.toggle('on', b.dataset.kf === 'all');
  });
  renderKargo();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — KARGO RENDER (Onay 1 + Onay 6)
// ════════════════════════════════════════════════════════════════

function renderKargo() {
  _injectKargoPanel();
  const kargo   = typeof loadKargo === 'function' ? loadKargo() : [];
  const users   = typeof loadUsers === 'function' ? loadUsers() : [];
  const today   = new Date().toISOString().slice(0,10);

  // Filtrele
  const search   = (g('krg-search')?.value || '').toLowerCase();
  const dateFrom = g('krg-date-from')?.value || '';
  const dateTo   = g('krg-date-to')?.value   || '';
  const sortBy   = g('krg-sort')?.value       || 'date-desc';

  let fl = kargo.filter(k => {
    if (KARGO_FILTER === 'gelen'  && k.dir    !== 'gelen')  return false;
    if (KARGO_FILTER === 'giden'  && k.dir    !== 'giden')  return false;
    if (KARGO_FILTER === 'bekle'  && k.status !== 'bekle')  return false;
    if (KARGO_FILTER === 'yolda'  && k.status !== 'yolda')  return false;
    if (KARGO_FILTER === 'teslim' && k.status !== 'teslim') return false;
    if (search && !(
      (k.firm||'').toLowerCase().includes(search) ||
      (k.from||'').toLowerCase().includes(search) ||
      (k.to  ||'').toLowerCase().includes(search) ||
      (k.note||'').toLowerCase().includes(search)
    )) return false;
    if (dateFrom && k.date && k.date < dateFrom) return false;
    if (dateTo   && k.date && k.date > dateTo)   return false;
    return true;
  });

  // Sırala
  if (sortBy === 'date-asc')  fl.sort((a,b) => (a.date||'').localeCompare(b.date||''));
  if (sortBy === 'date-desc') fl.sort((a,b) => (b.date||'').localeCompare(a.date||''));
  if (sortBy === 'firm')      fl.sort((a,b) => (a.firm||'').localeCompare(b.firm||'', 'tr'));
  if (sortBy === 'status')    fl.sort((a,b) => (a.status||'').localeCompare(b.status||''));

  // İstatistikler
  if (typeof st === 'function') {
    st('krg-total',  kargo.length);
    st('krg-bekle',  kargo.filter(k => k.status === 'bekle').length);
    st('krg-teslim', kargo.filter(k => k.status === 'teslim').length);
    st('krg-gelen',  kargo.filter(k => k.dir    === 'gelen').length);
    st('krg-giden',  kargo.filter(k => k.dir    === 'giden').length);
  }

  const nb = g('nb-krg-b');
  if (nb) {
    const n = kargo.filter(k => k.status === 'bekle').length;
    nb.textContent   = n;
    nb.style.display = n > 0 ? 'inline' : 'none';
  }

  const cont = g('kargo-list');
  if (!cont) return;

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:48px;text-align:center;color:var(--t2)">'
      + '<div style="font-size:40px;margin-bottom:12px">📦</div>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:4px">Kargo kaydı bulunamadı</div>'
      + '<div style="font-size:12px;color:var(--t3)">Filtreleri değiştirin veya yeni kayıt ekleyin</div>'
      + '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center">'
        + '<button class="btn" onclick="openKargoModal(\'gelen\')">📥 Gelen Ekle</button>'
        + '<button class="btn btnp" onclick="openKargoModal(\'giden\')">📤 Giden Ekle</button>'
      + '</div></div>';
    return;
  }

  if (KARGO_VIEW === 'table') {
    _renderKargoTable(fl, users, today, cont);
  } else {
    _renderKargoCards(fl, users, today, cont);
  }
}

// ── Kart Görünümü ────────────────────────────────────────────────
function _renderKargoCards(fl, users, today, cont) {
  const avc = typeof AVC !== 'undefined' ? AVC : [['#EEEDFE','#26215C']];
  const frag = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px';

  fl.forEach(k => {
    const u    = users.find(x => x.id === k.uid) || { name: '—' };
    const st2  = KARGO_STATUS[k.status] || KARGO_STATUS.bekle;
    const isL  = k.status !== 'teslim' && k.date && k.date < today;
    const idx  = users.indexOf(u);
    const c    = avc[Math.max(idx,0) % avc.length];
    const ini  = (u.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1.5px solid ' + (isL ? 'var(--rd)' : 'var(--b)') + ';border-radius:14px;overflow:hidden;transition:box-shadow .15s';
    card.onmouseenter = () => card.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)';
    card.onmouseleave = () => card.style.boxShadow = '';

    card.innerHTML = [
      // Renk şeridi + yön
      '<div style="height:3px;background:' + (k.dir === 'gelen' ? '#3B82F6' : '#8B5CF6') + '"></div>',
      '<div style="padding:14px 16px">',
        // Üst satır
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">',
          '<div style="display:flex;align-items:center;gap:8px">',
            '<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:' + (k.dir==='gelen'?'rgba(59,130,246,.1)':'rgba(139,92,246,.1)') + ';color:' + (k.dir==='gelen'?'#3B82F6':'#8B5CF6') + '">' + (k.dir==='gelen'?'📥 Gelen':'📤 Giden') + '</span>',
            '<span class="badge ' + st2.c + '" style="font-size:10px">' + st2.ic + ' ' + st2.l + '</span>',
            (isL ? '<span style="font-size:10px;font-weight:700;color:var(--rdt);background:var(--rdb);padding:2px 7px;border-radius:5px">⚠️ Gecikmiş</span>' : ''),
          '</div>',
          '<div style="width:28px;height:28px;border-radius:8px;background:' + c[0] + ';color:' + c[1] + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">' + ini + '</div>',
        '</div>',
        // Güzergah
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">',
          '<div style="flex:1;min-width:0">',
            '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">GÖNDERİCİ</div>',
            '<div style="font-size:13px;font-weight:600;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (k.from||'—') + '</div>',
          '</div>',
          '<div style="font-size:18px;color:var(--t3)">→</div>',
          '<div style="flex:1;min-width:0;text-align:right">',
            '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">ALICI</div>',
            '<div style="font-size:13px;font-weight:600;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (k.to||'—') + '</div>',
          '</div>',
        '</div>',
        // Alt bilgi
        '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--b)">',
          '<div>',
            '<div style="font-size:11px;font-weight:600;color:var(--t)">' + (k.firm||'—') + '</div>',
            '<div style="font-size:10px;color:var(--t3);font-family:monospace">' + (k.date||'') + '</div>',
          '</div>',
          '<div style="display:flex;gap:5px">',
            (k.status !== 'teslim' ? '<button class="btn btns" onclick="Kargo.markTeslim(' + k.id + ')" style="font-size:11px;border-radius:7px;padding:5px 10px;background:rgba(34,197,94,.1);color:#16A34A;border-color:rgba(34,197,94,.2)">✓ Teslim</button>' : ''),
            '<button class="btn btns" onclick="Kargo.openModal(' + k.id + ')" style="font-size:11px;border-radius:7px;padding:5px 9px">✏️</button>',
            (_isAdminK() ? '<button class="btn btns" onclick="Kargo.del(' + k.id + ')" style="font-size:11px;border-radius:7px;padding:5px 9px;color:var(--rdt)">🗑</button>' : ''),
          '</div>',
        '</div>',
      '</div>',
    ].join('');

    grid.appendChild(card);
  });

  frag.appendChild(grid);
  cont.replaceChildren(frag);
}

// ── Tablo Görünümü ───────────────────────────────────────────────
function _renderKargoTable(fl, users, today, cont) {
  const rows = fl.map(k => {
    const u   = users.find(x => x.id === k.uid) || { name: '—' };
    const st2 = KARGO_STATUS[k.status] || KARGO_STATUS.bekle;
    const isL = k.status !== 'teslim' && k.date && k.date < today;
    return '<tr' + (isL ? ' style="background:rgba(239,68,68,.03)"' : '') + '>'
      + '<td><span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;background:' + (k.dir==='gelen'?'rgba(59,130,246,.1)':'rgba(139,92,246,.1)') + ';color:' + (k.dir==='gelen'?'#3B82F6':'#8B5CF6') + '">' + (k.dir==='gelen'?'📥 Gelen':'📤 Giden') + '</span></td>'
      + '<td style="font-weight:500">' + (k.from||'—') + '</td>'
      + '<td>' + (k.to||'—') + '</td>'
      + '<td style="font-weight:600">' + (k.firm||'—') + '</td>'
      + '<td style="font-family:monospace;font-size:12px;color:' + (isL?'var(--rdt)':'var(--t2)') + '">' + (k.date||'—') + (isL?' ⚠️':'') + '</td>'
      + '<td><span class="badge ' + st2.c + '" style="font-size:10px">' + st2.ic + ' ' + st2.l + '</span></td>'
      + '<td style="font-size:12px">' + u.name + '</td>'
      + '<td><div style="display:flex;gap:4px">'
        + (k.status !== 'teslim' ? '<button class="btn btns btng" onclick="Kargo.markTeslim(' + k.id + ')" style="font-size:11px">✓</button>' : '')
        + '<button class="btn btns" onclick="Kargo.openModal(' + k.id + ')" style="font-size:11px">✏️</button>'
        + (_isAdminK() ? '<button class="btn btns btnd" onclick="Kargo.del(' + k.id + ')" style="font-size:11px">🗑</button>' : '')
      + '</div></td>'
    + '</tr>';
  }).join('');

  cont.innerHTML = '<div style="border:1px solid var(--b);border-radius:12px;overflow:hidden">'
    + '<table class="tbl" style="margin:0"><thead><tr>'
    + '<th>Yön</th><th>Gönderici</th><th>Alıcı</th><th>Firma</th><th>Tarih</th><th>Durum</th><th>Sorumlu</th><th></th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — CRUD
// ════════════════════════════════════════════════════════════════

function markKargoTeslim(id) {
  const d = loadKargo();
  const k = d.find(x => x.id === id);
  if (!k) return;
  k.status   = 'teslim';
  k.teslimAt = _nowTsK();
  storeKargo(d);
  renderKargo();
  window.toast?.('📦 Kargo teslim alındı ✓', 'ok');
  window.logActivity?.('kargo', 'Kargo teslim: ' + k.firm + ' — ' + k.to);
}

function openKargoModal(idOrDir) {
  window.openMo?.('mo-kargo');
  if (typeof idOrDir === 'string') {
    const dir = g('krg-dir');
    if (dir) dir.value = idOrDir;
  } else if (typeof idOrDir === 'number') {
    const k = loadKargo().find(x => x.id === idOrDir);
    if (!k) return;
    ['krg-dir','krg-from','krg-to','krg-firm','krg-date','krg-status'].forEach(id => {
      const el = g(id); if (!el) return;
      const key = id.replace('krg-','');
      if (k[key] !== undefined) el.value = k[key];
    });
    const eid = g('krg-eid'); if (eid) eid.value = idOrDir;
  }
}

function saveKargo() {
  const dir    = g('krg-dir')?.value    || 'gelen';
  const from   = (g('krg-from')?.value  || '').trim();
  const to     = (g('krg-to')?.value    || '').trim();
  const firm   = (g('krg-firm')?.value  || '').trim();
  const date   = g('krg-date')?.value   || '';
  const status = g('krg-status')?.value || 'bekle';
  const eid    = parseInt(g('krg-eid')?.value || '0');

  if (!from || !to) { window.toast?.('Gönderici ve alıcı zorunludur', 'err'); return; }

  const d     = loadKargo();
  const entry = { dir, from, to, firm, date, status, uid: _getCUK()?.id };

  if (eid) {
    const item = d.find(x => x.id === eid);
    if (item) Object.assign(item, entry);
  } else {
    d.push({ id: Date.now(), createdAt: _nowTsK(), ...entry });
  }

  storeKargo(d);
  window.closeMo?.('mo-kargo');
  renderKargo();
  window.logActivity?.('kargo', 'Kargo kaydedildi: ' + firm + ' — ' + from + ' → ' + to);
  window.toast?.('Kargo kaydedildi ✓', 'ok');
}

function delKargo(id) {
  if (!_isAdminK()) { window.toast?.('Yetki yok', 'err'); return; }
  if (!confirm('Bu kargo kaydını silmek istediğinizden emin misiniz?')) return;
  storeKargo(loadKargo().filter(x => x.id !== id));
  renderKargo();
  window.toast?.('Silindi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — EXCEL IMPORT (Onay 2)
// ════════════════════════════════════════════════════════════════

function importKargoFile() { g('krg-import-file')?.click(); }

function processKargoImport(inp) {
  const file = inp?.files?.[0]; if (!file) return;
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  const r = new FileReader();
  r.onload = function(e) {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { window.toast?.('Dosyada veri bulunamadı', 'err'); return; }

      const header = rows[0].map(h => String(h||'').toLowerCase().trim());
      const col    = key => header.findIndex(h => h.includes(key));

      const colMap = {
        dir:    col('yön') > -1 ? col('yön') : col('yon') > -1 ? col('yon') : col('dir'),
        from:   col('gönder') > -1 ? col('gönder') : col('gondr') > -1 ? col('gondr') : col('from'),
        to:     col('alıcı') > -1 ? col('alıcı') : col('alici') > -1 ? col('alici') : col('to'),
        firm:   col('firma') > -1 ? col('firma') : col('kargo firm') > -1 ? col('kargo firm') : col('firm'),
        date:   col('tarih') > -1 ? col('tarih') : col('date'),
        status: col('durum') > -1 ? col('durum') : col('status'),
      };

      // Önizleme modal
      const preview = rows.slice(1, 6).filter(r => r.length).map(row => {
        const dir = String(row[colMap.dir]||'').toLowerCase().includes('gid') ? 'giden' : 'gelen';
        const from = String(row[colMap.from]||'').trim();
        const to   = String(row[colMap.to]  ||'').trim();
        const firm = String(row[colMap.firm] ||'').trim();
        const date = _parseExcelDate(row[colMap.date]);
        return { dir, from, to, firm, date };
      }).filter(r => r.from || r.to);

      if (!preview.length) { window.toast?.('Eşleştirilecek veri bulunamadı', 'err'); return; }

      // Onay modalı
      _showImportPreview(preview, rows, colMap);
    } catch(err) {
      window.toast?.('Import hatası: ' + err.message, 'err');
    }
    inp.value = '';
  };
  r.readAsBinaryString(file);
}

function _parseExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0,10);
  }
  const d = new Date(String(val));
  return isNaN(d) ? '' : d.toISOString().slice(0,10);
}

function _showImportPreview(preview, allRows, colMap) {
  const existing = g('krg-import-modal'); if (existing) existing.remove();
  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'krg-import-modal'; mo.style.zIndex = '2200';

  const previewRows = preview.map(r =>
    '<tr><td style="font-size:12px;padding:8px 12px">'
    + '<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:' + (r.dir==='gelen'?'rgba(59,130,246,.1)':'rgba(139,92,246,.1)') + ';color:' + (r.dir==='gelen'?'#3B82F6':'#8B5CF6') + '">' + (r.dir==='gelen'?'📥 Gelen':'📤 Giden') + '</span>'
    + '</td><td style="font-size:12px;padding:8px 12px">' + (r.from||'—') + '</td>'
    + '<td style="font-size:12px;padding:8px 12px">' + (r.to||'—') + '</td>'
    + '<td style="font-size:12px;padding:8px 12px">' + (r.firm||'—') + '</td>'
    + '<td style="font-size:12px;padding:8px 12px;font-family:monospace">' + (r.date||'—') + '</td></tr>'
  ).join('');

  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 20px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">'
      + '<div class="mt" style="margin:0">📂 Excel Import Önizleme</div>'
      + '<button onclick="document.getElementById(\'krg-import-modal\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<div style="font-size:13px;color:var(--t2);margin-bottom:12px">Toplam <strong>' + (allRows.length-1) + '</strong> kayıt bulundu. İlk 5 satır:</div>'
      + '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:16px">'
        + '<table style="width:100%;border-collapse:collapse"><thead>'
        + '<tr style="background:var(--s2)"><th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--t3);font-weight:700">YÖN</th>'
        + '<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--t3);font-weight:700">GÖNDERİCİ</th>'
        + '<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--t3);font-weight:700">ALICI</th>'
        + '<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--t3);font-weight:700">FİRMA</th>'
        + '<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--t3);font-weight:700">TARİH</th>'
        + '</tr></thead><tbody>' + previewRows + '</tbody></table>'
      + '</div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end">'
        + '<button class="btn" onclick="document.getElementById(\'krg-import-modal\').remove()">İptal</button>'
        + '<button class="btn btnp" id="krg-import-confirm" style="border-radius:9px">Tümünü Aktar (' + (allRows.length-1) + ' kayıt)</button>'
      + '</div>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);

  g('krg-import-confirm').addEventListener('click', function() {
    const existing2 = loadKargo();
    let added = 0;
    allRows.slice(1).forEach(row => {
      if (!row || !row.length) return;
      const from = String(row[colMap.from]||'').trim();
      const to   = String(row[colMap.to]  ||'').trim();
      if (!from && !to) return;
      const dir   = String(row[colMap.dir]||'').toLowerCase().includes('gid') ? 'giden' : 'gelen';
      const firm  = String(row[colMap.firm]||'').trim();
      const date  = _parseExcelDate(row[colMap.date]);
      const rawSt = String(row[colMap.status]||'').toLowerCase();
      const status = rawSt.includes('teslim') ? 'teslim' : rawSt.includes('yolda') ? 'yolda' : rawSt.includes('iade') ? 'iade' : 'bekle';
      existing2.push({ id: Date.now() + added, dir, from, to, firm, date, status, uid: _getCUK()?.id, createdAt: _nowTsK() });
      added++;
    });
    storeKargo(existing2);
    mo.remove();
    renderKargo();
    window.toast?.(added + ' kargo aktarıldı ✓', 'ok');
    window.logActivity?.('kargo', 'Excel\'den ' + added + ' kargo aktarıldı');
  });

  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — PDF RAPOR (Onay 3)
// ════════════════════════════════════════════════════════════════

function printKargoRapor() {
  const kargo = loadKargo();
  const users = loadUsers();
  const today = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
  const cu    = _getCUK();

  // Aktif filtre uygula
  let fl = kargo;
  if (KARGO_FILTER === 'gelen')  fl = fl.filter(k => k.dir    === 'gelen');
  if (KARGO_FILTER === 'giden')  fl = fl.filter(k => k.dir    === 'giden');
  if (KARGO_FILTER === 'bekle')  fl = fl.filter(k => k.status === 'bekle');
  if (KARGO_FILTER === 'yolda')  fl = fl.filter(k => k.status === 'yolda');
  if (KARGO_FILTER === 'teslim') fl = fl.filter(k => k.status === 'teslim');

  const rows = fl.map(k => {
    const u   = users.find(x => x.id === k.uid) || { name: '—' };
    const st2 = KARGO_STATUS[k.status] || KARGO_STATUS.bekle;
    return '<tr>'
      + '<td>' + (k.dir==='gelen'?'📥 Gelen':'📤 Giden') + '</td>'
      + '<td>' + (k.from||'—') + '</td>'
      + '<td>' + (k.to||'—') + '</td>'
      + '<td>' + (k.firm||'—') + '</td>'
      + '<td>' + (k.date||'—') + '</td>'
      + '<td>' + st2.ic + ' ' + st2.l + '</td>'
      + '<td>' + u.name + '</td>'
    + '</tr>';
  }).join('');

  const stats = [
    { l: 'Toplam', v: fl.length },
    { l: 'Gelen',  v: fl.filter(k=>k.dir==='gelen').length },
    { l: 'Giden',  v: fl.filter(k=>k.dir==='giden').length },
    { l: 'Beklemede', v: fl.filter(k=>k.status==='bekle').length },
    { l: 'Yolda',  v: fl.filter(k=>k.status==='yolda').length },
    { l: 'Teslim', v: fl.filter(k=>k.status==='teslim').length },
  ];

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="tr"><head>
<meta charset="utf-8">
<title>Kargo Raporu — ${today}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter',sans-serif; color:#1E293B; background:#fff; padding:32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #E2E8F0; }
  .brand { font-size:22px; font-weight:800; color:#1E293B; }
  .brand span { color:#6366F1; }
  .meta { text-align:right; font-size:12px; color:#64748B; line-height:1.8; }
  .stats { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; margin-bottom:24px; }
  .stat { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px; text-align:center; }
  .stat-v { font-size:22px; font-weight:700; color:#1E293B; }
  .stat-l { font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:.06em; margin-top:3px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  thead tr { background:#F1F5F9; }
  th { padding:10px 12px; text-align:left; font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.06em; }
  td { padding:9px 12px; border-bottom:1px solid #F1F5F9; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#F8FAFC; }
  .footer { margin-top:24px; padding-top:16px; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; font-size:11px; color:#94A3B8; }
  @media print {
    body { padding:16px; }
    @page { margin:15mm; }
  }
</style>
</head><body>
<div class="header">
  <div>
    <div class="brand">Duay <span>Operasyon</span></div>
    <div style="font-size:13px;color:#64748B;margin-top:4px">Kargo Yönetim Raporu</div>
  </div>
  <div class="meta">
    <div><strong>Rapor Tarihi:</strong> ${today}</div>
    <div><strong>Hazırlayan:</strong> ${cu?.name || '—'}</div>
    <div><strong>Filtre:</strong> ${KARGO_FILTER === 'all' ? 'Tümü' : KARGO_FILTER}</div>
    <div><strong>Toplam:</strong> ${fl.length} kayıt</div>
  </div>
</div>
<div class="stats">
  ${stats.map(s => '<div class="stat"><div class="stat-v">' + s.v + '</div><div class="stat-l">' + s.l + '</div></div>').join('')}
</div>
<table>
  <thead><tr><th>Yön</th><th>Gönderici</th><th>Alıcı</th><th>Firma</th><th>Tarih</th><th>Durum</th><th>Sorumlu</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <span>Duay Global Trade — Operasyon Platformu</span>
  <span>Bu rapor ${today} tarihinde oluşturulmuştur.</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  win.document.close();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — KONTEYNER (Onay 5: Detay Modal)
// ════════════════════════════════════════════════════════════════

function renderKonteyn() {
  const konts   = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const users   = typeof loadUsers   === 'function' ? loadUsers()   : [];
  const cont    = g('konteyn-list');
  if (!cont) return;

  const today   = new Date();
  const todayS  = today.toISOString().slice(0, 10);
  let changed   = false;

  konts.forEach(k => {
    if (!k.closed && k.evrakGon && k.evrakUlasti && k.inspectionBitti && k.malTeslim) {
      k.closed   = true; k.closedAt = _nowTsK(); changed = true;
    }
  });
  if (changed) storeKonteyn(konts);

  const active   = konts.filter(k => !k.closed);
  const archived = konts.filter(k => k.closed);

  _renderKonteynAlarms(active, today, g('konteyn-alarm-bar'));

  if (!active.length && !archived.length) {
    cont.innerHTML = '<div style="padding:48px;text-align:center;color:var(--t2)">'
      + '<div style="font-size:40px;margin-bottom:12px">🚢</div>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:6px">Aktif konteyner yok</div>'
      + '<div style="font-size:12px;color:var(--t3);margin-bottom:14px">Takip etmek istediğiniz konteyneri ekleyin</div>'
      + '<button class="btn btnp" onclick="openKonteynModal(null)">+ Konteyner Ekle</button>'
      + '</div>';
    return;
  }

  const buildTrackUrl = (hat, no) => (KTN_TRACKING_URLS[hat] || '') + encodeURIComponent(no);

  const renderStep = (id, key, label, icon, ts) => {
    const done = !!ts;
    return '<div onclick="Kargo.toggleKonteynStep(' + id + ',\'' + key + '\')"'
      + ' style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;cursor:pointer;border:1.5px solid ' + (done?'rgba(34,197,94,.4)':'var(--b)') + ';background:' + (done?'rgba(34,197,94,.07)':'var(--sf)') + ';transition:all .18s;flex:1;min-width:140px">'
      + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (done?'#22C55E':'#CBD5E1') + ';background:' + (done?'#22C55E':'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:#fff;font-weight:900">' + (done?'✓':'') + '</div>'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:11px;font-weight:700;color:' + (done?'#16A34A':'var(--t2)') + '">' + icon + ' ' + label + '</div>'
        + (ts ? '<div style="font-size:9px;color:#22C55E;font-family:monospace">' + ts.slice(0,10) + '</div>'
              : '<div style="font-size:9px;color:var(--t3)">Bekliyor</div>')
      + '</div>'
    + '</div>';
  };

  const renderCard = (k, isArchived) => {
    const u        = users.find(x => x.id === k.uid) || { name: '?' };
    const etaDate  = k.eta ? new Date(k.eta) : null;
    const daysLeft = etaDate ? Math.ceil((etaDate - today) / 86400000) : null;
    const urgent   = !isArchived && daysLeft !== null && daysLeft <= 5  && daysLeft > 0;
    const near     = !isArchived && daysLeft !== null && daysLeft <= 10 && daysLeft > 0;
    const overdue  = !isArchived && daysLeft !== null && daysLeft <= 0;
    const trackUrl = k.url || buildTrackUrl(k.hat, k.no);
    const stepsDone = [k.evrakGon, k.evrakUlasti, k.inspectionBitti, k.malTeslim, k.closed].filter(Boolean).length;
    const pct       = Math.round(stepsDone / 5 * 100);
    const borderColor = isArchived ? 'var(--b)' : urgent||overdue ? '#EF4444' : near ? '#F59E0B' : 'var(--b)';

    return '<div style="border:2px solid ' + borderColor + ';border-radius:16px;padding:18px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:12px">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">'
        + '<div>'
          + '<div style="font-size:16px;font-weight:800;font-family:monospace">🚢 ' + k.no + '</div>'
          + (k.hat ? '<span style="font-size:10px;font-weight:700;background:rgba(99,102,241,.1);color:#6366F1;padding:2px 9px;border-radius:6px">' + k.hat + '</span>' : '')
          + (urgent  ? ' <span style="font-size:10px;font-weight:700;background:rgba(239,68,68,.12);color:#DC2626;padding:2px 9px;border-radius:6px">🚨 ' + daysLeft + ' Gün!</span>' : '')
          + (near && !urgent ? ' <span style="font-size:10px;font-weight:700;background:rgba(245,158,11,.12);color:#D97706;padding:2px 9px;border-radius:6px">⏰ ' + daysLeft + ' Gün</span>' : '')
          + (overdue ? ' <span style="font-size:10px;font-weight:700;background:rgba(239,68,68,.12);color:#DC2626;padding:2px 9px;border-radius:6px">⚠️ ETA Geçti</span>' : '')
          + '<div style="font-size:11px;color:var(--t3);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">'
            + (k.musteri ? '<span>🏢 ' + k.musteri + '</span>' : '')
            + (k.etd ? '<span>ETD: <strong>' + k.etd + '</strong></span>' : '')
            + (k.eta ? '<span>ETA: <strong style="color:' + (overdue||urgent?'#DC2626':'var(--t)') + '">' + k.eta + '</strong></span>' : '')
            + '<span>👤 ' + u.name + '</span>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">'
          + '<div style="font-size:18px;font-weight:800;color:' + (pct===100?'#22C55E':'var(--ac)') + '">'
            + pct + '% <span style="font-size:10px;color:var(--t3)">' + stepsDone + '/5</span>'
          + '</div>'
          + '<div style="display:flex;gap:5px">'
            + (trackUrl ? '<a href="' + trackUrl + '" target="_blank" class="btn btns" style="text-decoration:none;font-size:11px;background:rgba(99,102,241,.1);color:#6366F1;border-color:rgba(99,102,241,.2);border-radius:8px">🔗 Takip</a>' : '')
            + '<button class="btn btns" onclick="openKonteynDetail(' + k.id + ')" style="font-size:11px;border-radius:8px">📋 Detay</button>'
            + (!isArchived ? '<button class="btn btns" onclick="openKonteynModal(' + k.id + ')" style="font-size:11px;border-radius:8px">✏️</button>' : '')
            + (_isAdminK() && !isArchived ? '<button class="btn btns" onclick="Kargo.delKonteyn(' + k.id + ')" style="font-size:11px;border-radius:8px;color:var(--rdt)">🗑</button>' : '')
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div style="height:5px;background:var(--s2);border-radius:99px;margin-bottom:14px;overflow:hidden">'
        + '<div style="height:100%;background:' + (pct===100?'#22C55E':'linear-gradient(90deg,#6366F1,#8B5CF6)') + ';width:' + pct + '%;border-radius:99px;transition:width .5s"></div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + renderStep(k.id, 'evrakGon',       'Evrak Gönderildi',           '📄', k.evrakTarih)
        + renderStep(k.id, 'evrakUlasti',    'Müşteri Evrak Teslim Aldı',  '📬', k.evrakUlastiTarih)
        + renderStep(k.id, 'inspectionBitti','Inspection Bitti',            '🔍', k.inspectionTarih)
        + renderStep(k.id, 'malTeslim',      'Müşteri Malları Teslim Aldı','📦', k.malTeslimTarih)
      + '</div>'
    + '</div>';
  };

  let html = '';
  if (active.length) {
    html += '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">🚢 Aktif — ' + active.length + ' konteyner</div>';
    html += active.map(k => renderCard(k, false)).join('');
  }
  if (archived.length) {
    html += '<details style="margin-top:16px"><summary style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;cursor:pointer;padding:8px 0">✅ Tamamlananlar — ' + archived.length + ' konteyner</summary>'
      + '<div style="margin-top:8px;opacity:.7">' + archived.map(k => renderCard(k, true)).join('') + '</div></details>';
  }
  cont.innerHTML = html;
}

// ── Konteyner Detay Modal (Onay 5) ───────────────────────────────
function openKonteynDetail(id) {
  const konts = loadKonteyn();
  const k     = konts.find(x => x.id === id);
  if (!k) return;
  const users   = loadUsers();
  const u       = users.find(x => x.id === k.uid) || { name: '?' };
  const today   = new Date();
  const etaDate = k.eta ? new Date(k.eta) : null;
  const daysLeft = etaDate ? Math.ceil((etaDate - today) / 86400000) : null;

  const existing = g('mo-konteyn-detail'); if (existing) existing.remove();
  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-konteyn-detail'; mo.style.zIndex = '2200';

  const steps = [
    { key: 'evrakGon',       ts: k.evrakTarih,        label: 'Evrak Gönderildi',            icon: '📄' },
    { key: 'evrakUlasti',    ts: k.evrakUlastiTarih,  label: 'Müşteri Evrak Teslim Aldı',   icon: '📬' },
    { key: 'inspectionBitti',ts: k.inspectionTarih,   label: 'Inspection Tamamlandı',        icon: '🔍' },
    { key: 'malTeslim',      ts: k.malTeslimTarih,    label: 'Müşteri Malları Teslim Aldı',  icon: '📦' },
    { key: 'closed',         ts: k.closedAt,          label: 'Konteyner Kapatıldı',          icon: '✅' },
  ];

  const stepsDone = steps.filter(s => k[s.key]).length;
  const pct = Math.round(stepsDone / steps.length * 100);

  const timeline = steps.map((s, i) => {
    const done = !!k[s.key];
    return '<div style="display:flex;gap:14px;align-items:flex-start;padding-bottom:' + (i<steps.length-1?'16':'0') + 'px;position:relative">'
      + (i<steps.length-1 ? '<div style="position:absolute;left:11px;top:24px;bottom:0;width:2px;background:' + (done?'rgba(34,197,94,.3)':'var(--b)') + '"></div>' : '')
      + '<div style="width:24px;height:24px;border-radius:50%;border:2px solid ' + (done?'#22C55E':'var(--b)') + ';background:' + (done?'#22C55E':'var(--sf)') + ';display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:900;flex-shrink:0;z-index:1">' + (done?'✓':'') + '</div>'
      + '<div style="flex:1;padding-top:2px">'
        + '<div style="font-size:13px;font-weight:600;color:' + (done?'var(--t)':'var(--t3)') + '">' + s.icon + ' ' + s.label + '</div>'
        + (s.ts ? '<div style="font-size:11px;color:#22C55E;font-family:monospace;margin-top:2px">' + s.ts.slice(0,10) + '</div>'
                : '<div style="font-size:11px;color:var(--t3);margin-top:2px">Henüz tamamlanmadı</div>')
      + '</div>'
    + '</div>';
  }).join('');

  const trackUrl = k.url || (KTN_TRACKING_URLS[k.hat] || '') + encodeURIComponent(k.no);

  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:18px;overflow:hidden">'
    + '<div style="padding:18px 22px 16px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">'
      + '<div>'
        + '<div style="font-size:18px;font-weight:800;font-family:monospace">🚢 ' + k.no + '</div>'
        + (k.hat ? '<span style="font-size:11px;background:rgba(99,102,241,.1);color:#6366F1;padding:2px 9px;border-radius:6px;font-weight:600">' + k.hat + '</span>' : '')
        + (k.musteri ? ' <span style="font-size:11px;color:var(--t3)">' + k.musteri + '</span>' : '')
      + '</div>'
      + '<button onclick="document.getElementById(\'mo-konteyn-detail\').remove()" style="background:none;border:none;cursor:pointer;font-size:22px;color:var(--t3)">×</button>'
    + '</div>'

    + '<div style="padding:18px 22px;max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px">'

      // İlerleme
      + '<div>'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
          + '<span style="font-size:12px;color:var(--t2);font-weight:600">İlerleme</span>'
          + '<span style="font-size:14px;font-weight:700;color:' + (pct===100?'#22C55E':'var(--ac)') + '">' + pct + '%</span>'
        + '</div>'
        + '<div style="height:8px;background:var(--s2);border-radius:99px;overflow:hidden">'
          + '<div style="height:100%;background:' + (pct===100?'#22C55E':'linear-gradient(90deg,#6366F1,#8B5CF6)') + ';width:' + pct + '%;border-radius:99px;transition:width .5s"></div>'
        + '</div>'
      + '</div>'

      // Bilgiler
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Yükleme Limanı</div><div style="font-size:13px;font-weight:600">' + (k.fromPort||'—') + '</div></div>'
        + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Varış Limanı</div><div style="font-size:13px;font-weight:600">' + (k.toPort||'—') + '</div></div>'
        + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">ETD</div><div style="font-size:13px;font-weight:600;font-family:monospace">' + (k.etd||'—') + '</div></div>'
        + '<div style="background:' + (daysLeft !== null && daysLeft <= 5 ? 'rgba(239,68,68,.07)' : 'var(--s2)') + ';border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">ETA ' + (daysLeft !== null ? ('(' + (daysLeft<0?'Gecikmiş':''+daysLeft+' gün kaldı)')) : '') + '</div><div style="font-size:13px;font-weight:700;color:' + (daysLeft!==null&&daysLeft<=5?'#DC2626':'var(--t)') + ';font-family:monospace">' + (k.eta||'—') + '</div></div>'
        + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Sorumlu</div><div style="font-size:13px;font-weight:600">👤 ' + u.name + '</div></div>'
        + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Oluşturulma</div><div style="font-size:12px;font-family:monospace;color:var(--t2)">' + (k.createdAt||'—').slice(0,16) + '</div></div>'
      + '</div>'

      // Açıklama
      + (k.desc ? '<div style="background:var(--s2);border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;margin-bottom:5px">NOT</div><div style="font-size:13px;color:var(--t2);line-height:1.6">' + k.desc + '</div></div>' : '')

      // Timeline
      + '<div>'
        + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">SÜRECİ</div>'
        + '<div style="padding-left:4px">' + timeline + '</div>'
      + '</div>'

    + '</div>'

    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;gap:8px;background:var(--s2)">'
      + (trackUrl ? '<a href="' + trackUrl + '" target="_blank" class="btn btns" style="text-decoration:none;font-size:12px;flex:1;justify-content:center;background:rgba(99,102,241,.1);color:#6366F1;border-color:rgba(99,102,241,.2);border-radius:9px">🔗 Canlı Takip</a>' : '')
      + '<button class="btn btns" onclick="document.getElementById(\'mo-konteyn-detail\').remove();openKonteynModal(' + k.id + ')" style="font-size:12px;border-radius:9px">✏️ Düzenle</button>'
      + '<button class="btn" onclick="document.getElementById(\'mo-konteyn-detail\').remove()" style="font-size:12px;border-radius:9px">Kapat</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — Mevcut fonksiyonlar korunuyor
// ════════════════════════════════════════════════════════════════

function _renderKonteynAlarms(active, today, alarmEl) {
  if (!alarmEl) return;
  const alarmlar = [];
  active.forEach(k => {
    const etaDate  = k.eta ? new Date(k.eta) : null;
    const daysLeft = etaDate ? Math.ceil((etaDate - today) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 10 && daysLeft > 0) {
      if (!k.evrakGon) alarmlar.push('📄 <strong>' + k.no + '</strong>: Orijinal evrak gönderilmedi — <strong>' + daysLeft + ' gün</strong> kaldı');
    }
    if (daysLeft !== null && daysLeft <= 0) alarmlar.push('⚠️ <strong>' + k.no + '</strong>: ETA geçti! Durumu güncelleyin');
  });
  alarmEl.innerHTML = alarmlar.length
    ? '<div style="background:var(--rdb);border-left:4px solid var(--rd);border-radius:10px;padding:10px 16px;margin-bottom:12px">'
      + '<div style="font-size:12px;font-weight:700;color:var(--rdt);margin-bottom:6px">🚨 ' + alarmlar.length + ' Dikkat Gerektiren Konteyner</div>'
      + alarmlar.map(a => '<div style="font-size:11px;color:var(--rdt);margin-top:3px">• ' + a + '</div>').join('')
      + '</div>'
    : '';
}

function toggleKonteynStep(id, key) {
  const d    = loadKonteyn();
  const k    = d.find(x => x.id === id);
  if (!k) return;
  const tsKey = { evrakGon:'evrakTarih', evrakUlasti:'evrakUlastiTarih', inspectionBitti:'inspectionTarih', malTeslim:'malTeslimTarih' };
  const today = new Date().toISOString().slice(0, 10);
  if (k[key]) { k[key] = false; k[tsKey[key]] = ''; if (k.closed) { k.closed = false; k.closedAt = ''; } }
  else {
    k[key] = true;
    if (tsKey[key]) k[tsKey[key]] = today;
    if (k.evrakGon && k.evrakUlasti && k.inspectionBitti && k.malTeslim) {
      k.closed = true; k.closedAt = today;
      window.toast?.('✅ ' + k.no + ' — tüm adımlar tamamlandı', 'ok');
    }
  }
  storeKonteyn(d);
  renderKonteyn();
  window.logActivity?.('kargo', 'Konteyner ' + k.no + ': ' + key + ' güncellendi');
}

function delKonteyn(id) {
  if (!_isAdminK()) return;
  if (!confirm('Konteyner silinsin mi?')) return;
  storeKonteyn(loadKonteyn().filter(x => x.id !== id));
  renderKonteyn();
}

function checkAllKonteyn() {
  const konts = loadKonteyn().filter(k => !k.closed);
  if (!konts.length) { window.toast?.('Aktif konteyner yok', 'ok'); return; }
  const now = _nowTsK(); const today = new Date(); let alertCount = 0;
  konts.forEach(k => {
    k.lastCheck = now;
    if (!k.eta) return;
    const daysLeft = Math.ceil((new Date(k.eta) - today) / 86400000);
    const prev = k.lastAlert || 999;
    if (daysLeft === 10 && prev > 10) { k.lastAlert = 10; window.addNotif?.('🚢', k.no + ': 10 gün kaldı', 'warn', 'kargo'); alertCount++; }
    if (daysLeft <= 0 && prev > 0)   { k.lastAlert = 0;  window.addNotif?.('✅', k.no + ': ETA geçti!', 'ok', 'kargo'); alertCount++; }
  });
  storeKonteyn(konts);
  renderKonteyn();
  if (alertCount) window.toast?.(alertCount + ' konteyner uyarısı!', 'warn');
  else window.toast?.('Konteynerler kontrol edildi ✓', 'ok');
}

function startKonteynPolling() {
  clearInterval(KRG_KONTEYN_TIMER);
  KRG_KONTEYN_TIMER = setInterval(checkAllKonteyn, 3 * 60 * 60 * 1000);
}

function exportKargoXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const rows  = loadKargo().map(k => ({
    'Yön':      k.dir === 'gelen' ? 'Gelen' : 'Giden',
    'Gönderici': k.from, 'Alıcı': k.to, 'Firma': k.firm,
    'Tarih':    k.date,  'Durum': KARGO_STATUS[k.status]?.l || k.status,
    'Sorumlu':  (users.find(x => x.id === k.uid) || { name: '?' }).name,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [8,20,20,16,12,12,16].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kargo');
  XLSX.writeFile(wb, 'Kargo_' + _nowTsK().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
}

function setKargoFilter(f, btn) {
  KARGO_FILTER = f;
  document.querySelectorAll('#panel-kargo .chip[data-kf]').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderKargo();
}

function openKargoFirmaModal() {
  renderKargoFirmaList();
  g('krg-firma-add-row') && (g('krg-firma-add-row').style.display = 'none');
  g('krg-firma-new-name') && (g('krg-firma-new-name').value = '');
  window.openMo?.('mo-krg-firma');
}

function renderKargoFirmaList() {
  const firms = loadKargoFirmalar();
  const cont  = g('krg-firma-list');
  if (!cont) return;
  cont.innerHTML = firms.map(f =>
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--b)">'
    + '<span style="font-size:13px">🚚 ' + f + '</span>'
    + (_isAdminK() ? '<button class="btn btns btnd" onclick="delKargoFirma(\'' + f + '\')">🗑</button>' : '')
    + '</div>'
  ).join('');
  const sel = g('krg-firm');
  if (sel) sel.innerHTML = firms.map(f => '<option>' + f + '</option>').join('');
}

function addKargoFirma() {
  const name = (g('krg-firma-new-name')?.value || '').trim();
  if (!name) { window.toast?.('Firma adı zorunludur', 'err'); return; }
  const firms = loadKargoFirmalar();
  if (firms.includes(name)) { window.toast?.('Bu firma zaten mevcut', 'err'); return; }
  if (!_isAdminK()) { window.toast?.('Ekleme talebi yöneticiye iletildi', 'ok'); window.closeMo?.('mo-krg-firma'); return; }
  firms.push(name); storeKargoFirmalar(firms); renderKargoFirmaList();
  g('krg-firma-add-row') && (g('krg-firma-add-row').style.display = 'none');
  window.toast?.(name + ' eklendi ✓', 'ok');
}

function delKargoFirma(name) {
  if (!_isAdminK()) { window.toast?.('Yetki yok', 'err'); return; }
  if (!confirm('"' + name + '" kargo firmasını silmek istediğinizden emin misiniz?')) return;
  storeKargoFirmalar(loadKargoFirmalar().filter(f => f !== name));
  renderKargoFirmaList();
  window.toast?.(name + ' silindi', 'ok');
}

function printKargoLabel() {
  const from  = g('krg-from')?.value || '—';
  const to    = g('krg-to')?.value   || '—';
  const firm  = g('krg-firm')?.value || '';
  const note  = g('krg-note')?.value || '';
  const win   = window.open('', '_blank', 'width=420,height=420');
  win.document.write('<!DOCTYPE html><html><head><title>Kargo Etiketi</title>'
    + '<style>body{font-family:sans-serif;padding:20px;border:2px solid #000;max-width:380px}h2{text-align:center;margin-bottom:16px;font-size:16px}.row{margin-bottom:10px;font-size:13px}.lbl{font-weight:700;font-size:10px;text-transform:uppercase;color:#666}hr{margin:12px 0;border-color:#000}</style>'
    + '</head><body><h2>📦 ' + firm + ' KARGO ETİKETİ</h2><hr>'
    + '<div class="row"><div class="lbl">GÖNDERİCİ</div>' + from + '</div><hr>'
    + '<div class="row"><div class="lbl">ALICI</div>' + to + '</div><hr>'
    + '<div class="row" style="font-size:11px;color:#666">Tarih: ' + _nowTsK().slice(0,10) + ' · ' + (note||'') + '</div>'
    + '<script>window.print();<\/script></body></html>');
}

function openKargoTeslimModal(id) {
  const users = loadUsers();
  const sel   = g('krg-teslim-user');
  if (sel) sel.innerHTML = users.map(u => '<option value="' + u.id + '">' + u.name + '</option>').join('');
  if (g('krg-teslim-id'))   g('krg-teslim-id').value   = id;
  if (g('krg-teslim-date')) g('krg-teslim-date').valueAsDate = new Date();
  if (g('krg-teslim-note')) g('krg-teslim-note').value  = '';
  window.openMo?.('mo-krg-teslim');
}

function saveKargoTeslim() {
  const id   = parseInt(g('krg-teslim-id')?.value || '0');
  if (!id) return;
  const date = g('krg-teslim-date')?.value;
  if (!date) { window.toast?.('Teslim tarihi zorunludur', 'err'); return; }
  const d = loadKargo(); const k = d.find(x => x.id === id); if (!k) return;
  const uid  = parseInt(g('krg-teslim-user')?.value || '0');
  const note = g('krg-teslim-note')?.value?.trim() || '';
  const fileInput = g('krg-teslim-file');
  const processUpdate = fileData => {
    k.status = 'teslim'; k.teslimDate = date; k.teslimUid = uid; k.teslimNote = note;
    if (fileData) k.teslimFile = fileData;
    storeKargo(d); window.closeMo?.('mo-krg-teslim'); renderKargo();
    window.toast?.('Teslim kaydı tamamlandı ✓', 'ok');
  };
  if (fileInput?.files?.[0]) {
    const file = fileInput.files[0];
    if (file.size > 2097152) { window.toast?.('Dosya 2MB\'dan küçük olmalıdır', 'err'); return; }
    const reader = new FileReader();
    reader.onload = e => processUpdate({ name: file.name, type: file.type, data: e.target.result });
    reader.readAsDataURL(file);
  } else { processUpdate(null); }
}

function saveKonteyn() {
  const no  = g('ktn-no')?.value?.trim();
  if (!no) { window.toast?.('Konteyner no zorunludur', 'err'); return; }
  const d   = loadKonteyn();
  const eid = parseInt(g('ktn-eid')?.value || '0');
  const hat = g('ktn-hat')?.value || '';
  const noEnc = encodeURIComponent(no);
  const deepLinks = {
    'MSC':'https://www.msc.com/en/track-a-shipment?trackingNumber='+noEnc,
    'Maersk':'https://www.maersk.com/tracking/'+noEnc,
    'CMA CGM':'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference='+noEnc,
    'COSCO':'https://elines.coscoshipping.com/ebtracking/visible?trNo='+noEnc,
    'Hapag-Lloyd':'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container='+noEnc,
    'ONE':'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?cntrNo='+noEnc,
    'Evergreen':'https://www.evergreen-line.com/eservice/cargotracking/ct_input.do?searchType=CT&cntrNum='+noEnc,
    'Yang Ming':'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?SearchType=3&CNTNO='+noEnc,
    'ZIM':'https://www.zim.com/tools/track-a-shipment?container='+noEnc,
  };
  const today = new Date().toISOString().slice(0,10);
  const evrakGon       = g('ktn-evrak-gon')?.checked       || false;
  const evrakUlasti    = g('ktn-evrak-ulasti')?.checked     || false;
  const inspectionBitti= g('ktn-inspection')?.checked       || false;
  const malTeslim      = g('ktn-mal-teslim')?.checked       || false;
  const userUrl        = g('ktn-url')?.value?.trim()        || '';
  const finalUrl       = userUrl || deepLinks[hat] || KTN_TRACKING_URLS[hat] || '';

  const entry = {
    no, hat,
    fromPort: g('ktn-from-port')?.value || '',
    toPort:   g('ktn-to-port')?.value   || '',
    etd:      g('ktn-etd')?.value       || '',
    eta:      g('ktn-eta')?.value       || '',
    desc:     g('ktn-desc')?.value      || '',
    url: finalUrl,
    uid: parseInt(g('ktn-user')?.value || _getCUK()?.id || '0'),
    ihracatId: g('ktn-ihracat-id')?.value || '',
    musteri:   g('ktn-musteri')?.value    || '',
    evrakGon,    evrakTarih:       evrakGon       ? (g('ktn-evrak-tarih')?.value || today) : '',
    evrakUlasti, evrakUlastiTarih: evrakUlasti    ? today : '',
    inspectionBitti, inspectionTarih: inspectionBitti ? today : '',
    malTeslim,   malTeslimTarih:   malTeslim      ? today : '',
    status: 'Aktif', lastCheck: '', createdAt: _nowTsK(),
  };

  if (evrakGon && evrakUlasti && inspectionBitti && malTeslim) {
    entry.closed = true; entry.closedAt = today;
    window.toast?.('Tüm adımlar tamamlandı — konteyner kapatıldı ✓', 'ok');
  } else { entry.closed = false; entry.closedAt = ''; }

  if (eid) {
    const e = d.find(x => x.id === eid);
    if (e) {
      if (!entry.evrakTarih       && e.evrakTarih)       entry.evrakTarih       = e.evrakTarih;
      if (!entry.evrakUlastiTarih && e.evrakUlastiTarih) entry.evrakUlastiTarih = e.evrakUlastiTarih;
      if (!entry.inspectionTarih  && e.inspectionTarih)  entry.inspectionTarih  = e.inspectionTarih;
      if (!entry.malTeslimTarih   && e.malTeslimTarih)   entry.malTeslimTarih   = e.malTeslimTarih;
      Object.assign(e, entry);
    }
  } else { d.push({ id: Date.now(), ...entry }); }

  storeKonteyn(d);
  window.closeMo?.('mo-konteyn');
  renderKonteyn();
  window.logActivity?.('kargo', 'Konteyner kaydedildi: ' + no);
  if (!entry.closed) window.toast?.('Konteyner kaydedildi ✓', 'ok');
}

function closeKonteyn(id) {
  const d = loadKonteyn(); const k = d.find(x => x.id === id);
  if (!k) return; k.closed = true; k.closedAt = _nowTsK();
  storeKonteyn(d); renderKonteyn(); window.toast?.('Konteyner kapatıldı', 'ok');
}

function updKargoSt(id) {
  const d = loadKargo(); const k = d.find(x => x.id === id); if (!k) return;
  const cycle = ['bekle','yolda','teslim'];
  k.status = cycle[(cycle.indexOf(k.status) + 1) % cycle.length];
  storeKargo(d); renderKargo(); window.toast?.('Durum güncellendi ✓', 'ok');
}

function permDeleteKonteyn(id) {
  if (!_isAdminK()) return;
  if (!confirm('Arşivlenen konteyner kalıcı silinsin mi?')) return;
  storeKonteyn(loadKonteyn().filter(x => x.id !== id));
  renderKonteyn(); window.toast?.('Silindi', 'ok');
}

function checkAllKargoStatus() {
  const kargos = loadKargo().filter(k => k.status !== 'teslim' && k.note);
  if (!kargos.length) return;
  const now = _nowTsK(); const checks = loadKargoChecks();
  kargos.forEach(k => {
    if (k.note && k.note.length > 5) {
      checks[k.id] = checks[k.id] || {};
      checks[k.id].lastCheck = now;
      const daysSince = Math.floor((Date.now() - k.id) / 86400000);
      if (daysSince >= 7 && k.status !== 'teslim') {
        k.status = 'teslim'; checks[k.id].status = 'teslim';
        window.addNotif?.('📦', 'Kargo TESLIM EDİLDİ: ' + k.from + ' > ' + k.to, 'ok', 'kargo');
      } else if (daysSince >= 3 && k.status === 'bekle') {
        k.status = 'yolda'; checks[k.id].status = 'yolda';
        window.addNotif?.('🚚', 'Kargo yola çıktı: ' + (k.firm||'') + ' — Yolda', 'info', 'kargo');
      }
    }
  });
  storeKargoChecks(checks);
  storeKargo(loadKargo().map(k => { const upd = checks[k.id]; return upd?.status ? {...k, status:upd.status, lastCheck:upd.lastCheck} : k; }));
  renderKargo();
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

const Kargo = {
  render:           renderKargo,
  renderKonteyn,
  openModal:        openKargoModal,
  save:             saveKargo,
  del:              delKargo,
  markTeslim:       markKargoTeslim,
  toggleKonteynStep,
  delKonteyn,
  openKonteynModal: () => window.openMo?.('mo-konteyn'),
  checkAll:         checkAllKonteyn,
  startPolling:     startKonteynPolling,
  exportXlsx:       exportKargoXlsx,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Kargo;
} else {
  window.Kargo = Kargo;
  window.setKargoFilter       = setKargoFilter;
  window.openKargoFirmaModal  = openKargoFirmaModal;
  window.renderKargoFirmaList = renderKargoFirmaList;
  window.addKargoFirma        = addKargoFirma;
  window.delKargoFirma        = delKargoFirma;
  window.printKargoLabel      = printKargoLabel;
  window.openKargoTeslimModal = openKargoTeslimModal;
  window.saveKargoTeslim      = saveKargoTeslim;
  window.checkAllKargoStatus  = checkAllKargoStatus;
  window.saveKonteyn          = saveKonteyn;
  window.closeKonteyn         = closeKonteyn;
  window.updKargoSt           = updKargoSt;
  window.permDeleteKonteyn    = permDeleteKonteyn;
  window.openKonteynDetail    = openKonteynDetail;
  window.openKonteynModal     = function(id) {
    if (id) {
      var konts = loadKonteyn();
      var k = konts.find(function(x){ return x.id===id; });
      if (k) {
        ['ktn-no','ktn-hat','ktn-from-port','ktn-to-port','ktn-etd','ktn-eta','ktn-desc','ktn-url','ktn-musteri','ktn-ihracat-id'].forEach(function(fid) {
          var el = g(fid); if (!el) return;
          var key = fid.replace('ktn-','').replace(/-([a-z])/g, function(m,c){ return c.toUpperCase(); });
          if (k[key] !== undefined) el.value = k[key];
        });
        var eid = g('ktn-eid'); if (eid) eid.value = id;
        ['ktn-evrak-gon','ktn-evrak-ulasti','ktn-inspection','ktn-mal-teslim'].forEach(function(fid) {
          var el = g(fid); if (el) el.checked = !!k[fid.replace('ktn-','').replace(/-([a-z])/g,function(m,c){return c.toUpperCase();})];
        });
      }
    } else {
      var eid2 = g('ktn-eid'); if (eid2) eid2.value = '';
      ['ktn-no','ktn-hat','ktn-from-port','ktn-to-port','ktn-etd','ktn-eta','ktn-desc','ktn-url','ktn-musteri','ktn-ihracat-id'].forEach(function(fid){ var el=g(fid);if(el)el.value=''; });
      ['ktn-evrak-gon','ktn-evrak-ulasti','ktn-inspection','ktn-mal-teslim'].forEach(function(fid){ var el=g(fid);if(el)el.checked=false; });
    }
    window.openMo?.('mo-konteyn');
  };
  window.importKargoFile      = importKargoFile;
  window.processKargoImport   = processKargoImport;
  window.printKargoRapor      = printKargoRapor;
  window.exportKargoXlsx      = exportKargoXlsx;
  window.checkAllKonteyn      = checkAllKonteyn;
  window.toggleKonteynStep    = toggleKonteynStep;

  window.renderKargo = function(...args) {
    try { return renderKargo(...args); }
    catch(err) {
      console.error('[renderKargo]', err);
      const el = document.getElementById('kargo-list');
      if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
      window.toast?.('Panel yüklenemedi', 'err');
    }
  };
  window.renderKonteyn = function(...args) {
    try { return renderKonteyn(...args); }
    catch(err) {
      console.error('[renderKonteyn]', err);
      const el = document.getElementById('konteyn-list');
      if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
      window.toast?.('Panel yüklenemedi', 'err');
    }
  };
}
