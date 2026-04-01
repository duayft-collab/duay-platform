/**
 * src/modules/pusula_core.js — v3.0.0
 * Pusula — Çekirdek: yardımcılar, focus sistemi, departman, badge
 * Bağımlı: database.js, auth.js
 * Anayasa: K01 ≤800 satır | K04 try-catch | K06 soft delete
 */

'use strict';

// ── Sabitler ────────────────────────────────────────────────────

const PRI_MAP = {
  1: { color:'#DC2626', glow:'rgba(220,38,38,.3)',   badge:'tk-pri-badge-1', label:'🔴 KRİTİK' },
  2: { color:'#D97706', glow:'rgba(217,119,6,.25)',  badge:'tk-pri-badge-2', label:'🟠 ÖNEMLİ' },
  3: { color:'#4F46E5', glow:'rgba(79,70,229,.2)',   badge:'tk-pri-badge-3', label:'🔵 NORMAL' },
  4: { color:'#64748B', glow:'rgba(100,116,139,.15)',badge:'tk-pri-badge-4', label:'⚪ DÜŞÜK'  },
};
const PRI_COLOR = { 1:'#DC2626', 2:'#D97706', 3:'#4F46E5', 4:'#64748B' };

const DEPT_DEFAULT_COLORS = [
  '#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4',
  '#84CC16','#A855F7','#FB7185','#34D399','#FBBF24',
];

// Görünüm state'i — modüller arası paylaşım
let PUS_VIEW         = localStorage.getItem('ak_pus_view') || 'list';
let PUS_QUICK_FILTER = 'all';
let PUS_DETAIL_ID    = null;
let _PDP_TASK_ID     = null;
var _PUS_FULL_VIEWS  = ['kadran', 'odak'];

// ── Kısayol yardımcılar ─────────────────────────────────────────
const g  = id => document.getElementById(id);
const st = (id, v) => { const e = g(id); if (e) e.textContent = v; };

// ── CU erişimi ─────────────────────────────────────────────────
function _getCU() {
  if (typeof window.Auth === 'object' && typeof window.Auth.getCU === 'function')
    return window.Auth.getCU();
  if (typeof window.CU === 'function') return window.CU();
  if (typeof window.CU === 'object' && window.CU !== null) return window.CU;
  return null;
}

// ── Avatar renk paleti ──────────────────────────────────────────
function _getAVC() {
  return window.AVC || [
    ['#EEEDFE','#26215C'], ['#E1F5EE','#085041'],
    ['#E6F1FB','#0C447C'], ['#FAECE7','#993C1D'],
    ['#EAF3DE','#27500A'], ['#FAEEDA','#854F0B'],
    ['#FBEAF0','#72243E'], ['#F1EFE8','#2C2C2A'],
  ];
}

// ── Yetki yardımcıları ──────────────────────────────────────────
function _isTaskOwner(task) {
  const cu = _getCU();
  return cu && task && (task.uid === cu.id || task.uid === parseInt(cu.id));
}
function _canEditTask(task) {
  if (window.isAdmin?.()) return true;
  if (_isTaskOwner(task)) return true;
  const cu = _getCU();
  return cu && Array.isArray(task.managers) && task.managers.includes(cu.id);
}
function _isParticipant(task) {
  const cu = _getCU();
  if (!cu || !task) return false;
  return (task.participants || []).includes(cu.id) ||
         (task.viewers || []).includes(cu.id);
}

// ── Stub'lar — diğer modüller override eder ────────────────────
function showKargoAlert(title, body, type) {
  if (typeof window._showKargoAlertReal === 'function') {
    window._showKargoAlertReal(title, body, type); return;
  }
  const icon = type === 'bekle' ? '⏳' : '📦';
  window.toast?.(`${icon} ${title} ${body}`, 'warn');
}
window.showKargoAlert = showKargoAlert;

function renderEtkinlikKart(e) {
  if (typeof window._renderEtkinlikKartReal === 'function')
    return window._renderEtkinlikKartReal(e);
  return `<div style="padding:12px;border:1px solid var(--b);border-radius:8px">
    <div style="font-weight:600;font-size:13px">${e.name || '—'}</div>
    <div style="font-size:11px;color:var(--t3)">${e.date || ''} · ${e.city || ''}</div>
  </div>`;
}
window.renderEtkinlikKart = renderEtkinlikKart;

function fetchFuarlarWithCriteria() {
  if (typeof window._fetchFuarlarReal === 'function')
    return window._fetchFuarlarReal();
  window.toast?.('Fuar tarama modülü yükleniyor…', 'warn');
}
window.fetchFuarlarWithCriteria = fetchFuarlarWithCriteria;

// ── Dosya seçim handler ─────────────────────────────────────────
function tkFileChange(input) {
  const fp = g('tk-fp');
  if (!fp) return;
  const files = Array.from(input.files || []);
  if (!files.length) { fp.innerHTML = ''; return; }
  fp.innerHTML = files.map(f =>
    `<span style="background:var(--al);color:var(--ac);border-radius:4px;padding:1px 7px;font-size:10px;display:inline-flex;align-items:center;gap:3px">📎 ${f.name}</span>`
  ).join('');
}

// ── Focus sistemi ───────────────────────────────────────────────
function _focusKey(type) {
  const uid = _getCU()?.id || 'anon';
  return 'ak_pus_' + type + '_focus_' + uid;
}
function _loadFocus(type) {
  try { return JSON.parse(localStorage.getItem(_focusKey(type)) || '[]'); }
  catch(e) { return []; }
}
function _saveFocusList(type, list) {
  localStorage.setItem(_focusKey(type), JSON.stringify(list));
}

// Getter/setter — diğer modüller doğrudan okuyabilir
Object.defineProperty(window, 'PUS_WEEK_FOCUS',    { get: () => _loadFocus('week'),    set: v => _saveFocusList('week',    v) });
Object.defineProperty(window, 'PUS_DAY_FOCUS',     { get: () => _loadFocus('day'),     set: v => _saveFocusList('day',     v) });
Object.defineProperty(window, 'PUS_MONTH_FOCUS',   { get: () => _loadFocus('month'),   set: v => _saveFocusList('month',   v) });
Object.defineProperty(window, 'PUS_QUARTER_FOCUS', { get: () => _loadFocus('quarter'), set: v => _saveFocusList('quarter', v) });
Object.defineProperty(window, 'PUS_YEAR_FOCUS',    { get: () => _loadFocus('year'),    set: v => _saveFocusList('year',    v) });

function toggleFocus(taskId, type) {
  const list = _loadFocus(type);
  const idx  = list.indexOf(taskId);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    if (list.length >= 3) { window.toast?.('En fazla 3 görev seçebilirsiniz', 'warn'); return; }
    list.push(taskId);
  }
  _saveFocusList(type, list);
  window.renderPusula?.();
}
window.toggleFocus = toggleFocus;

window.getPusDayTotal = function() {
  const ids   = _loadFocus('day');
  const tasks = loadTasks();
  return ids.reduce((s, id) => s + (tasks.find(t => t.id === id)?.duration || 0), 0);
};

// ── Focus panel — sidebar odak kutusu ──────────────────────────
function renderFocusPanel() {
  const cont = g('pus-focus-panel');
  if (!cont) return;

  const tasks  = loadTasks();
  const today  = new Date().toISOString().slice(0, 10);
  const isAdm  = window.isAdmin?.();
  const users  = loadUsers();

  const _getIds = type => isAdm
    ? users.flatMap(u => { try { return JSON.parse(localStorage.getItem('ak_pus_' + type + '_focus_' + u.id) || '[]'); } catch(e) { return []; } })
            .filter((v, i, a) => a.indexOf(v) === i)
    : _loadFocus(type);

  const _card = (taskId, isLast) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return '';
    const isLate = !t.done && t.due && t.due < today;
    const dl     = t.due ? Math.ceil((new Date(t.due) - new Date(today)) / 86400000) : null;
    const dot    = isLate ? '#dc2626' : (dl !== null && dl <= 3) ? '#f59e0b' : '#16a34a';
    return `<div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;cursor:pointer;min-width:0${isLast ? '' : ';border-bottom:0.5px solid var(--b)'}" onclick="window.openPusDetail?.(${taskId})">
      <div style="width:5px;height:5px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:5px"></div>
      <div style="flex:1;min-width:0;overflow:hidden">
        <div style="font-size:11px;font-weight:500;color:${t.done ? 'var(--t3)' : 'var(--t)'};text-decoration:${t.done ? 'line-through' : 'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
        ${t.due ? `<div style="font-size:10px;color:${isLate ? '#dc2626' : 'var(--t3)'}">${t.due.slice(5)}</div>` : ''}
      </div>
    </div>`;
  };

  const WIDGETS = [
    { type:'day',     label:'Günün Odağı',      icon:'🔥', color:'#F97316' },
    { type:'week',    label:'Haftanın Odağı',   icon:'⭐', color:'#6366F1' },
    { type:'month',   label:'Ayın Odağı',       icon:'📅', color:'#10B981' },
    { type:'quarter', label:'Çeyreğin Odağı',   icon:'🎯', color:'#8B5CF6' },
    { type:'year',    label:'Yılın Odağı',      icon:'🏆', color:'#DC2626' },
  ];

  cont.innerHTML = '<div class="pus-focus-grid">'
    + WIDGETS.map(w => {
        const ids   = _getIds(w.type);
        const cnt   = Math.min(ids.length, 3);
        const cards = ids.slice(0, 3).map((id, i, a) => _card(id, i === a.length - 1)).join('');
        return `<div class="pus-focus-card">
          <div style="display:flex;align-items:center;gap:5px;padding-bottom:6px;border-bottom:0.5px solid var(--b);margin-bottom:8px;min-width:0">
            <span style="font-size:13px;flex-shrink:0">${w.icon}</span>
            <span style="font-size:10px;font-weight:500;color:var(--t);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.label}</span>
            <span style="font-size:10px;color:var(--t3);background:var(--s2);padding:1px 6px;border-radius:8px;flex-shrink:0">${cnt}/3</span>
          </div>
          ${cards || `<div style="font-size:10px;color:var(--t3);padding:6px 0;text-align:center">listeden ${w.icon} basın</div>`}
        </div>`;
      }).join('')
  + '</div>';
}
window.renderFocusPanel = renderFocusPanel;

// ── Departman renk sistemi ──────────────────────────────────────
function getDeptColor(deptName) {
  if (!deptName) return '#6B7280';
  try {
    const custom = JSON.parse(localStorage.getItem('ak_dept_colors') || '{}');
    if (custom[deptName]) return custom[deptName];
  } catch(e) {}
  let hash = 0;
  for (let i = 0; i < deptName.length; i++)
    hash = deptName.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_DEFAULT_COLORS[Math.abs(hash) % DEPT_DEFAULT_COLORS.length];
}
function setDeptColor(deptName, color) {
  try {
    const custom = JSON.parse(localStorage.getItem('ak_dept_colors') || '{}');
    if (color) custom[deptName] = color; else delete custom[deptName];
    localStorage.setItem('ak_dept_colors', JSON.stringify(custom));
    window.renderPusula?.();
  } catch(e) {}
}
window.getDeptColor = getDeptColor;
window.setDeptColor = setDeptColor;

// ── Sidebar departman navigasyonu ───────────────────────────────
function _renderDeptSidebar() {
  const nav = g('pus-dept-nav');
  if (!nav) return;
  const tasks = loadTasks();
  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))].sort();
  const cur   = g('pf-dept')?.value || '';

  const all = `<div class="pus-sb-item ${cur === '' ? 'active' : ''}" onclick="window._filterDept?.('')">
    <span class="pus-sb-dot" style="background:var(--ac)"></span>
    Tümü
    <span class="pus-sb-count">${tasks.length}</span>
  </div>`;

  const items = depts.map(d => {
    const c     = getDeptColor(d);
    const count = tasks.filter(t => t.department === d).length;
    return `<div class="pus-sb-item ${cur === d ? 'active' : ''}" onclick="window._filterDept?.('${d}')">
      <span class="pus-sb-dot" style="background:${c}"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d}</span>
      <span class="pus-sb-count">${count}</span>
    </div>`;
  }).join('');

  nav.innerHTML = all + items;
}
window._filterDept = function(dept) {
  const sel = g('pf-dept');
  if (sel) sel.value = dept;
  window.renderPusula?.();
};
window._renderDeptSidebar = _renderDeptSidebar;

// ── Görev görünürlük filtresi ───────────────────────────────────
function _populateDeptFilter() {
  const sel = g('pf-dept');
  if (!sel) return;
  const tasks = loadTasks();
  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))].sort();
  const cur   = sel.value;
  sel.innerHTML = '<option value="">Tüm Departmanlar</option>' +
    depts.map(d => `<option value="${d}"${d === cur ? ' selected' : ''}>${d}</option>`).join('');
}

function visTasks() {
  const d = loadTasks().filter(t => !t.isDeleted);
  if (window.isAdmin?.()) {
    const uid = parseInt(g('pus-usel')?.value || '0');
    return uid ? d.filter(t => t.uid === uid) : d;
  }
  const myId   = _getCU()?.id;
  const myRole = _getCU()?.role;
  if (myRole === 'manager' || myRole === 'lead') return d;
  return d.filter(t =>
    t.uid === myId ||
    t.createdBy === myId ||
    (t.participants || []).includes(myId) ||
    (t.viewers     || []).includes(myId)
  );
}

// ── Render yardımcıları ─────────────────────────────────────────
function getDueChip(due, done, todayS) {
  if (!due || typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(due)) return '';
  const dl = Math.ceil((new Date(due) - new Date(todayS)) / 86400000);
  if (done || (due > todayS && dl > 7))
    return `<span class="tk-due-chip ok">${due.slice(5)}</span>`;
  if (dl < 0)  return `<span class="tk-due-chip overdue">⚠ ${Math.abs(dl)}g gecikmiş</span>`;
  if (dl === 0) return `<span class="tk-due-chip today">⏰ Bugün</span>`;
  if (dl <= 3)  return `<span class="tk-due-chip today">${dl}g kaldı</span>`;
  return `<span class="tk-due-chip soon">${due.slice(5)}</span>`;
}

function getStatusPill(t) {
  if (t.done || t.status === 'done')
    return `<span class="tk-status-pill done">✅ Tamam</span>`;
  if (t.status === 'inprogress')
    return `<span class="tk-status-pill inprogress">🔄 Devam</span>`;
  if (t.status === 'review')
    return `<span class="tk-status-pill review">👀 İnceleme</span>`;
  if (t.status === 'waiting')
    return `<span class="tk-status-pill" style="background:#D9770618;color:#D97706;font-weight:600;font-size:10px;padding:2px 8px;border-radius:99px">⏳ Beklemede</span>`;
  if (typeof isTaskBlocked === 'function' && isTaskBlocked(t))
    return `<span class="tk-status-pill" style="background:#DC262618;color:#DC2626;font-weight:600;font-size:10px;padding:2px 8px;border-radius:99px">🚫 Engellendi</span>`;
  return '';
}

function getAvatar(uid, users, size = 22) {
  const u = users.find(x => x.id === uid);
  if (!u) return '';
  const idx = users.indexOf(u);
  const c   = _getAVC()[idx % _getAVC().length];
  return `<span class="tk-av-sm" style="background:${c[0]};color:${c[1]};width:${size}px;height:${size}px" title="${u.name}">${_pusInitials(u.name)}</span>`;
}

function _pusInitials(name = '') {
  if (typeof window.initials === 'function') return window.initials(name);
  return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── İş yükü hesabı ─────────────────────────────────────────────
function _calcWorkload(userId) {
  const tasks  = loadTasks().filter(t => !t.isDeleted);
  const todayS = new Date().toISOString().slice(0, 10);
  const acik   = tasks.filter(t => t.uid === userId && !t.done && t.status !== 'done').length;
  const gecikmi= tasks.filter(t => t.uid === userId && !t.done && t.status !== 'done' && t.due && t.due < todayS).length;
  const tamam  = tasks.filter(t => t.uid === userId && t.done && t.created_at && t.completedAt);
  let ortSure  = 0;
  if (tamam.length) {
    const top = tamam.reduce((s, t) =>
      s + Math.ceil((new Date(t.completedAt) - new Date(t.created_at)) / 86400000), 0);
    ortSure = Math.round(top / tamam.length * 10) / 10;
  }
  const skor   = acik + gecikmi * 3 + ortSure * 0.5;
  const seviye = skor <= 5 ? 'low' : skor <= 12 ? 'mid' : 'high';
  return { acik, gecikmi, ortSure, skor: Math.round(skor * 10) / 10, seviye };
}
window._calcWorkload = _calcWorkload;

// ── Gecikmiş görev bildirimi ────────────────────────────────────
function checkOverdueTasks() {
  const CU = _getCU();
  if (!CU) return;
  const todayS  = new Date().toISOString().slice(0, 10);
  const overdue = loadTasks().filter(t =>
    !t.done && t.status !== 'done' && t.due && t.due < todayS &&
    (t.uid === CU.id || (t.managers || []).includes(CU.id) || window.isAdmin?.())
  );
  if (!overdue.length) return;
  const msg = overdue.length === 1
    ? `⚠️ "${overdue[0].title}" görevi gecikmiş!`
    : `⚠️ ${overdue.length} gecikmiş göreviniz var`;
  window.toast?.(msg, 'warn');
  overdue.slice(0, 3).forEach(t =>
    window.addNotif?.('⚠️', `"${t.title}" görevi gecikmiş (${t.due})`, 'warn', 'pusula', null, t.id)
  );
}
window.checkOverdueTasks = checkOverdueTasks;

// ── Badge güncelleme ────────────────────────────────────────────
function updatePusBadge() {
  const tasks = window.isAdmin?.()
    ? loadTasks()
    : loadTasks().filter(t => t.uid === _getCU()?.id);
  const undone = tasks.filter(t => !t.done && t.status !== 'done' && t.pri === 1).length;
  const b = g('nb-pus-b');
  if (b) { b.textContent = undone; b.style.display = undone > 0 ? 'inline' : 'none'; }
  st('sv-c', undone);
}

// ── Kullanıcı seçici ────────────────────────────────────────────
function populatePusUsers() {
  const users = loadUsers();
  const sel   = g('pus-usel');
  const tsel  = g('tk-user');

  if (sel && window.isAdmin?.()) {
    sel.innerHTML = `<option value="0">👥 Tüm Personel</option>` +
      users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  }
  if (tsel) {
    if (window.isAdmin?.()) {
      const wlColors = { low:'🟢', mid:'🟡', high:'🔴' };
      tsel.innerHTML = users.map(u => {
        const wl = _calcWorkload(u.id);
        return `<option value="${u.id}">${u.name} · ${wlColors[wl.seviye]} ${wl.acik} açık${wl.gecikmi ? ' · ' + wl.gecikmi + ' gecikmiş' : ''}</option>`;
      }).join('');
      const recEl = g('tk-atama-oneri');
      if (recEl) {
        const sorted = users.map(u => ({ id:u.id, name:u.name, wl:_calcWorkload(u.id) }))
          .sort((a, b) => a.wl.skor - b.wl.skor);
        const best  = sorted[0];
        const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;
        let html = '';
        if (best && best.wl.seviye === 'low')
          html += `<div style="font-size:10px;color:#16A34A;margin-top:4px">⭐ Önerilen: <b>${best.name}</b> — en düşük iş yükü</div>`;
        if (worst && worst.wl.gecikmi > 0)
          html += `<div style="font-size:10px;color:#D97706;margin-top:2px">⚠ Dikkat: <b>${worst.name}</b> — ${worst.wl.gecikmi} gecikmiş görevi var</div>`;
        recEl.innerHTML = html;
      }
    } else {
      const uid = _getCU()?.id || 0;
      tsel.innerHTML = `<option value="${uid}">${window.escapeHtml?.(_getCU()?.name || 'Ben') || (_getCU()?.name || 'Ben')}</option>`;
      tsel.value = String(uid);
    }
  }
}

// ── Günlük söz ──────────────────────────────────────────────────
const _MOTIVATION_QUOTES = [
  { text:'Yapılacak en önemli iş, her zaman bir sonraki adımdır.', author:'Herbert Simon' },
  { text:'Zamanınızı yönetmek, hayatınızı yönetmek demektir.', author:'Alan Lakein' },
  { text:'Odaklanma, bir şeye evet demek değil; diğer yüz şeye hayır demektir.', author:'Steve Jobs' },
  { text:'Başarının sırrı, her gün başlamaktır.', author:'Mark Twain' },
  { text:'Bugünkü işini yarına bırakma.', author:'Benjamin Franklin' },
  { text:'Planlama yaparken uzun düşün, uygularken hızlı hareket et.', author:'Sun Tzu' },
  { text:'Başarı, küçük çabaların her gün tekrar edilmesidir.', author:'Robert Collier' },
  { text:'Verimlilik, doğru işi yapmaktır. Etkililik, işi doğru yapmaktır.', author:'Peter Drucker' },
  { text:'Geleceği tahmin etmenin en iyi yolu, onu yaratmaktır.', author:'Abraham Lincoln' },
  { text:'Hedef koymak, görünmeyeni görünür kılmaktır.', author:'Tony Robbins' },
];
function _getDailyQuote() {
  const d   = new Date();
  const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % _MOTIVATION_QUOTES.length;
  return _MOTIVATION_QUOTES[idx];
}

window.setPusQuote = function(q) { window._pusQuoteData = q; };
