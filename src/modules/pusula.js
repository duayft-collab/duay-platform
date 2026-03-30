/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/pusula.js  —  v2.1.0 / 2026-03-24
 * Görev Yönetimi (Pusula) Modülü
 *
 * Kapsam (v1 + v2 yeni özellikler):
 *   • Görev CRUD  (openAddTask / editTask / saveTask / delTask)
 *   • toggleTask  (tamamlandı / yeniden aç)
 *   • Board görünümü  (renderPusulaBoard)
 *   • List görünümü   (renderPusulaList)   — DocumentFragment
 *   • Detay paneli    (openPusDetail / closePusDetail)
 *   • Alt Görevler    (addSubTask / toggleSubTask / delSubTask)
 *   • Görev Yazışma   (openTaskChat / renderTaskChatMsgs / sendTaskChatMsg)
 *   • Katılımcı / İzleyici yönetimi (populateTaskParticipants)
 *   • Filtre & sıralama (visTasks / clearPusFilters)
 *   • Excel export   (exportTasksXlsx)
 *   • Badge güncelle  (updatePusBadge)
 *
 * YENİ — v2.0:
 *   1.  Akıllı Görev Şablonları     (openTaskTemplates / applyTaskTemplate)
 *   2.  Görev Bağımlılık Zinciri    (addTaskDep / taskIsBlocked)
 *   3.  Zaman Takipçisi             (ttStart / ttStop / renderTimeTracker)
 *   4.  Görev Puanı & Skor Tablosu  (openScoreBoard — XP sistemi)
 *   5.  Sesli Görev Notu            (vnStart / vnStop / renderVoiceNotes)
 *   6.  Akıllı Tarih Önerisi        (smartDateParse — "yarın", "cuma", "2 hafta")
 *   7.  Görev Yorumu & Güncelleme   (addTaskLogEntry / renderTaskLog)
 *   8.  Odak Modu (Pomodoro)        (pomoStart / pomoStop — widget + ses)
 *   9.  Görev Tekrarlama Kuralları  (setTaskRecurring / processRecurringTasks)
 *  10.  Görev Haritası (Gantt)      (setPusView('gantt') — timeline görünümü)
 *
 * Veri yapısı:
 *   localStorage key: 'ak_tk2'           → Görev dizisi
 *   localStorage key: 'ak_task_chat1'    → { [taskId]: Message[] }
 *   localStorage key: 'ak_tk_templates1' → Şablon kütüphanesi
 *   localStorage key: 'ak_tk_deps1'      → Bağımlılık zinciri
 *   localStorage key: 'ak_tk_timelog1'   → Zaman takip kayıtları
 *   localStorage key: 'ak_tk_scores1'    → XP skorları
 *   localStorage key: 'ak_tk_tasklog1'   → Güncelleme notları
 *
 * Global bağımlılıklar:
 *   window.Auth      → getCU(), window.isAdmin?.()
 *   window.DB        → loadTasks(), saveTasks(), loadUsers(),
 *                       loadTaskChats(), storeTaskChats(), logActivity()
 *   window.toast()   → bildirim
 *   window.openMo()  / window.closeMo()
 *   window.addNotif()
 *   XLSX             → CDN'den yüklenmiş olmalı
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ── Stripe Design Tokens ─────────────────────────────────────────
const _PUS_B  = 'border:1px solid var(--b)';
const _PUS_Bh = 'border-bottom:1px solid var(--b)';
const _PUS_Br = 'border-right:1px solid var(--b)';
const _PUS_t2 = 'color:var(--t2)';
const _PUS_t3 = 'color:var(--t3)';
const _PUS_mono = "font-family:'DM Mono',monospace";


// ── Dosya seçim handler — HTML attribute'ta güvenli ──────────────
function tkFileChange(input) {
  var fp = document.getElementById('tk-fp');
  if (!fp) return;
  var files = Array.from(input.files || []);
  if (!files.length) { fp.innerHTML = ''; return; }
  fp.innerHTML = files.map(function(f) {
    return '<span style="background:var(--al);color:var(--ac);border-radius:4px;padding:1px 7px;font-size:10px;display:inline-flex;align-items:center;gap:3px">📎 ' + f.name + '</span>';
  }).join('');
}

// ── Güvenli CU erişimi — app.js yükleme sırasından bağımsız ──────
// _isAdmin kaldırıldı — window.isAdmin kullanılıyor (ik.js ile çakışma önlendi)
function _getCU() {
  if (typeof window.Auth === 'object' && typeof window.Auth.getCU === 'function') {
    return window.Auth.getCU();
  }
  if (typeof window.CU === 'function') return window.CU();
  if (typeof window.CU === 'object' && window.CU !== null) return window.CU;
  return null;
}

// ── Görev Yetki Yardımcıları ──────────────────────────────────────
/** Kullanıcı görevin sahibi mi? (uid eşleşmesi) */
function _isTaskOwner(task) {
  const cu = _getCU();
  return cu && task && (task.uid === cu.id || task.uid === parseInt(cu.id));
}
/** Kullanıcı görevde yönetici yetkisi mi? (owner, admin, veya managers listesinde) */
function _canEditTask(task) {
  if (window.isAdmin?.()) return true;
  if (_isTaskOwner(task)) return true;
  const cu = _getCU();
  return cu && Array.isArray(task.managers) && task.managers.includes(cu.id);
}
/** Kullanıcı görevde katılımcı mı? (participants veya viewers) */
function _isParticipant(task) {
  const cu = _getCU();
  if (!cu || !task) return false;
  return (task.participants || []).includes(cu.id) || (task.viewers || []).includes(cu.id);
}


// ── Global shortcut'lar ─────────────────────────────────────────


'use strict';

// ── Güvenli global erişim — app.js henüz yüklenmemişse fallback ─
// AVC: app.js'den önce yüklendiğimiz için window.AVC hazır olmayabilir
// _getAVC() her çağrıda güncel değeri okur
function _getAVC() {
  return window.AVC || [
    ['#EEEDFE','#26215C'], ['#E1F5EE','#085041'],
    ['#E6F1FB','#0C447C'], ['#FAECE7','#993C1D'],
    ['#EAF3DE','#27500A'], ['#FAEEDA','#854F0B'],
    ['#FBEAF0','#72243E'], ['#F1EFE8','#2C2C2A'],
  ];
}

// ── Eksik fonksiyon stub'ları ────────────────────────────────────
// Bu fonksiyonlar kargo.js / extra_panels.js'den gelir.
// Henüz yüklenmemişse crash'i önlemek için safe stub tanımlanır.

/** Kargo/lojistik alarm bildirimi — kargo.js tarafından override edilir */
function showKargoAlert(title, body, type) {
  // kargo.js yüklendikten sonra bu stub override edilir
  if (typeof window._showKargoAlertReal === 'function') {
    window._showKargoAlertReal(title, body, type);
    return;
  }
  // Fallback: toast bildirimi
  const icon = type === 'bekle' ? '⏳' : '📦';
  window.toast?.(`${icon} ${title} ${body}`, 'warn');
}
window.showKargoAlert = showKargoAlert;

/** Fuar/Etkinlik kart render — etkinlik modülü yüklenince override edilir */
function renderEtkinlikKart(e) {
  if (typeof window._renderEtkinlikKartReal === 'function') {
    return window._renderEtkinlikKartReal(e);
  }
  return `<div style="padding:12px;border:1px solid var(--b);border-radius:8px;background:var(--sf)">
    <div style="font-weight:600;font-size:13px">${e.name || '—'}</div>
    <div style="font-size:11px;color:var(--t3)">${e.date || ''} · ${e.city || ''}</div>
  </div>`;
}
window.renderEtkinlikKart = renderEtkinlikKart;

/** Fuar tarama — etkinlik modülü yüklenince override edilir */
function fetchFuarlarWithCriteria() {
  if (typeof window._fetchFuarlarReal === 'function') {
    return window._fetchFuarlarReal();
  }
  window.toast?.('Fuar tarama modülü yükleniyor…', 'warn');
}
window.fetchFuarlarWithCriteria = fetchFuarlarWithCriteria;

/** Fuar son güncelleme key */
const FUAR_LAST_UPDATE_KEY = 'ak_fuar_last_update';


let PUS_VIEW         = localStorage.getItem('ak_pus_view') || 'list';
// Focus listesi — kullanıcı başına izole
function _focusKey(type) {
  const uid = _getCU()?.id || 'anon';
  return 'ak_pus_' + type + '_focus_' + uid;
}
function _loadFocus(type) {
  try { return JSON.parse(localStorage.getItem(_focusKey(type)) || '[]'); } catch(e) { return []; }
}
function _saveFocusList(type, list) {
  localStorage.setItem(_focusKey(type), JSON.stringify(list));
}
// Getter'lar — her erişimde güncel veriyi okur
Object.defineProperty(window, 'PUS_WEEK_FOCUS',    { get: () => _loadFocus('week'),    set: v => _saveFocusList('week', v) });
Object.defineProperty(window, 'PUS_DAY_FOCUS',     { get: () => _loadFocus('day'),     set: v => _saveFocusList('day', v) });
Object.defineProperty(window, 'PUS_MONTH_FOCUS',   { get: () => _loadFocus('month'),   set: v => _saveFocusList('month', v) });
Object.defineProperty(window, 'PUS_QUARTER_FOCUS', { get: () => _loadFocus('quarter'), set: v => _saveFocusList('quarter', v) });
Object.defineProperty(window, 'PUS_YEAR_FOCUS',    { get: () => _loadFocus('year'),    set: v => _saveFocusList('year', v) });

function _saveFocus() {
  // Artık kullanılmıyor — setter otomatik kaydediyor
}

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
  renderPusula();
  renderFocusPanel();
}

function renderFocusPanel() {
  const cont = g('pus-focus-panel');
  if (!cont) return;
  const tasks    = loadTasks();
  const users    = loadUsers();
  const today    = new Date().toISOString().slice(0,10);
  const isAdmin2 = window.isAdmin?.();
  // Admin: tüm kullanıcıların focus listelerini göster
  // User: sadece kendi listesi
  const _getIds  = (type) => isAdmin2
    ? users.flatMap(u => { try { return JSON.parse(localStorage.getItem('ak_pus_' + type + '_focus_' + u.id) || '[]'); } catch(e) { return []; } }).filter((v,i,a)=>a.indexOf(v)===i)
    : _loadFocus(type);

  function _focusCard(taskId, type) {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return '';
    const u   = users.find(x => x.id === t.uid);
    const avc = _getAVC();
    const idx = users.indexOf(u);
    const c   = avc[Math.max(idx,0) % avc.length];
    const ini = (u?.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const isLate = !t.done && t.due && t.due < today;
    const priColors = ['','#EF4444','#F97316','#EAB308','#22C55E'];
    const priC = priColors[t.pri||2]||'#EAB308';
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--sf);border:1px solid var(--b);border-radius:6px;margin-bottom:5px;cursor:pointer" onclick="openPusDetail(' + taskId + ')">'
      + '<div style="width:4px;height:36px;border-radius:2px;background:' + priC + ';flex-shrink:0"></div>'
      + (u ? '<div style="width:26px;height:26px;border-radius:7px;background:' + c[0] + ';color:' + c[1] + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex-shrink:0">' + ini + '</div>' : '')
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;font-weight:600;color:' + (t.done?'var(--t3)':'var(--t)') + ';text-decoration:' + (t.done?'line-through':'none') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + t.title + '</div>'
        + '<div style="font-size:10px;color:var(--t3);display:flex;gap:8px">'
        + (t.due ? '<span style="color:' + (isLate?'var(--rdt)':'var(--t3)') + '">' + (isLate?'⚠️ ':'') + t.due + '</span>' : '')
        + (t.duration ? '<span style="color:var(--ac)">⏱ ' + (t.duration >= 60 ? Math.floor(t.duration/60) + 's ' + (t.duration%60||'') + (t.duration%60?'dk':'') : t.duration + 'dk') + '</span>' : '')
        + '</div>'
      + '</div>'
      + '<button data-tid="' + taskId + '" data-type="' + type + '" class="pus-focus-rm" style="background:none;border:none;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;color:var(--t2);border-radius:4px">×</button>'
    + '</div>';
  }

  // Toplam süre hesapla
  const _calcTotal = (ids) => {
    const mins = ids.reduce((sum, id) => {
      const t2 = tasks.find(x => x.id === id);
      return sum + (t2?.duration || 0);
    }, 0);
    if (!mins) return '';
    return mins >= 60
      ? Math.floor(mins/60) + ' saat' + (mins%60 ? ' ' + mins%60 + ' dk' : '')
      : mins + ' dk';
  };
  const _wIds    = _getIds('week');
  const _dIds    = _getIds('day');
  const weekTotal = _calcTotal(_wIds);
  const dayTotal  = _calcTotal(_dIds);
  const weekCards = _wIds.map(id => _focusCard(id, 'week')).join('');
  const dayCards  = _dIds.map(id => _focusCard(id, 'day')).join('');

  // Yeni focus listeleri
  const _mIds = _getIds('month');
  const _qIds = _getIds('quarter');
  const _yIds = _getIds('year');
  const monthCards   = _mIds.map(id => _focusCard(id, 'month')).join('');
  const quarterCards = _qIds.map(id => _focusCard(id, 'quarter')).join('');
  const yearCards    = _yIds.map(id => _focusCard(id, 'year')).join('');
  const monthTotal   = _calcTotal(_mIds);
  const quarterTotal = _calcTotal(_qIds);
  const yearTotal    = _calcTotal(_yIds);

  const FOCUS_WIDGETS = [
    { type:'day',     label:"Günün En Önemlileri",      icon:'🔥', color:'#F97316', bg:'rgba(249,115,22,.1)',  ids:_dIds,  cards:dayCards,     total:dayTotal,     hint:'listeden 🔥 basın' },
    { type:'week',    label:"Haftanın En Önemlileri",   icon:'⭐', color:'#6366F1', bg:'rgba(99,102,241,.1)',  ids:_wIds,  cards:weekCards,    total:weekTotal,    hint:'listeden ⭐ basın' },
    { type:'month',   label:"Ayın En Önemlileri",       icon:'📅', color:'#10B981', bg:'rgba(16,185,129,.1)', ids:_mIds,  cards:monthCards,   total:monthTotal,   hint:'listeden 📅 basın' },
    { type:'quarter', label:"Çeyreğin En Önemlileri",   icon:'🎯', color:'#8B5CF6', bg:'rgba(139,92,246,.1)', ids:_qIds,  cards:quarterCards, total:quarterTotal, hint:'listeden 🎯 basın' },
    { type:'year',    label:"Yılın En Önemlileri",      icon:'🏆', color:'#DC2626', bg:'rgba(220,38,38,.1)',  ids:_yIds,  cards:yearCards,    total:yearTotal,    hint:'listeden 🏆 basın' },
  ];

  cont.innerHTML = '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;width:100%">'
    + FOCUS_WIDGETS.map(w =>
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:10px 12px;min-width:0;overflow:hidden">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          + '<div style="display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden">'
            + '<span style="font-size:14px;flex-shrink:0">' + w.icon + '</span>'
            + '<span style="font-size:10px;font-weight:700;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + w.label + '</span>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">'
            + (w.total ? '<span style="font-size:9px;background:' + w.bg + ';color:' + w.color + ';padding:1px 5px;border-radius:4px;font-weight:600">' + w.total + '</span>' : '')
            + '<span style="font-size:10px;color:var(--t3);font-family:monospace">' + w.ids.length + '/3</span>'
          + '</div>'
        + '</div>'
        + (w.cards || '<div style="font-size:11px;color:var(--t2);text-align:center;padding:12px 0;opacity:.7">' + w.hint + '</div>')
      + '</div>'
    ).join('')
  + '</div>';

  // Event delegation — remove button
  cont.querySelectorAll('.pus-focus-rm').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleFocus(parseInt(this.dataset.tid), this.dataset.type);
    });
  });
}
let PUS_QUICK_FILTER = 'all';
let PUS_DETAIL_ID    = null;

// ── Kısayol yardımcıları ─────────────────────────────────────────

// Çekirdek bağlantıları (runtime'da çözülür)

// ── Avatar renk paleti ───────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
// DEPARTMAN RENK SİSTEMİ  [v2.1.0]
// Her departman benzersiz bir renk alır
// Kullanıcı localStorage'dan özel renk atayabilir
// ════════════════════════════════════════════════════════════════
const DEPT_DEFAULT_COLORS = [
  '#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4',
  '#84CC16','#A855F7','#FB7185','#34D399','#FBBF24',
];

function getDeptColor(deptName) {
  if (!deptName) return '#6B7280';
  // Önce kullanıcı özel rengi
  try {
    const custom = JSON.parse(localStorage.getItem('ak_dept_colors') || '{}');
    if (custom[deptName]) return custom[deptName];
  } catch(e) {}
  // Departman adından deterministik renk
  let hash = 0;
  for (let i = 0; i < deptName.length; i++) hash = deptName.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_DEFAULT_COLORS[Math.abs(hash) % DEPT_DEFAULT_COLORS.length];
}

function setDeptColor(deptName, color) {
  try {
    const custom = JSON.parse(localStorage.getItem('ak_dept_colors') || '{}');
    if (color) custom[deptName] = color;
    else delete custom[deptName];
    localStorage.setItem('ak_dept_colors', JSON.stringify(custom));
    renderPusula();
  } catch(e) {}
}

window.getDeptColor = getDeptColor;
window.setDeptColor = setDeptColor;

// ── Öncelik haritası ─────────────────────────────────────────────
const PRI_MAP = {
  1: { color: '#DC2626', glow: 'rgba(220,38,38,.3)',   badge: 'tk-pri-badge-1', label: '🔴 KRİTİK' },
  2: { color: '#D97706', glow: 'rgba(217,119,6,.25)',  badge: 'tk-pri-badge-2', label: '🟠 ÖNEMLİ' },
  3: { color: '#4F46E5', glow: 'rgba(79,70,229,.2)',   badge: 'tk-pri-badge-3', label: '🔵 NORMAL' },
  4: { color: '#64748B', glow: 'rgba(100,116,139,.15)',badge: 'tk-pri-badge-4', label: '⚪ DÜŞÜK'  },
};

const PRI_COLOR = { 1:'#FF3B30', 2:'#FF9500', 3:'#007AFF', 4:'#C7C7CC' };

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — VERİ / GÖRÜNÜRLÜK
// ════════════════════════════════════════════════════════════════

/**
 * Aktif kullanıcının görebileceği görevleri döndürür.
 * Admin → filtre seçimine göre; Personel → sadece kendi/katılımcı/izleyici
 */
function _populateDeptFilter() {
  const sel = document.getElementById('pf-dept');
  if (!sel) return;
  const tasks = loadTasks();
  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))].sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Tüm Departmanlar</option>' +
    depts.map(d => `<option value="${d}"${d===cur?' selected':''}>${d}</option>`).join('');
}

function visTasks() {
  const d = loadTasks().filter(function(t) { return !t.isDeleted; });
  if (window.isAdmin?.()) {
    const uid = parseInt(g('pus-usel')?.value || '0');
    return uid ? d.filter(t => t.uid === uid) : d;
  }
  const myId = _getCU()?.id;
  return d.filter(t =>
    t.uid === myId ||
    (t.participants || []).includes(myId) ||
    (t.viewers     || []).includes(myId)
  );
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — YARDIMCı RENDER FONKSİYONLARI
// ════════════════════════════════════════════════════════════════

/** Due tarihine göre renk-chip HTML döndürür */
function getDueChip(due, done, todayS) {
  if (!due) return '';
  const dl = Math.ceil((new Date(due) - new Date(todayS)) / 86400000);
  if (done || (due > todayS && dl > 7)) return `<span class="tk-due-chip ok">${due.slice(5)}</span>`;
  if (dl < 0)  return `<span class="tk-due-chip overdue">⚠ ${Math.abs(dl)}g gecikmiş</span>`;
  if (dl === 0) return `<span class="tk-due-chip today">⏰ Bugün</span>`;
  if (dl <= 3)  return `<span class="tk-due-chip today">${dl}g kaldı</span>`;
  return `<span class="tk-due-chip soon">${due.slice(5)}</span>`;
}

/** Görev durumuna göre pill HTML döndürür */
function getStatusPill(t) {
  if (t.done || t.status === 'done')        return `<span class="tk-status-pill done">✅ Tamam</span>`;
  if (t.status === 'inprogress')            return `<span class="tk-status-pill inprogress">🔄 Devam</span>`;
  if (t.status === 'review')               return `<span class="tk-status-pill review">👀 İnceleme</span>`;
  if (t.status === 'waiting')              return `<span class="tk-status-pill" style="background:#D9770618;color:#D97706;font-weight:600;font-size:10px;padding:2px 8px;border-radius:99px">⏳ Beklemede</span>`;
  if (isTaskBlocked(t))                    return `<span class="tk-status-pill" style="background:#DC262618;color:#DC2626;font-weight:600;font-size:10px;padding:2px 8px;border-radius:99px">🚫 Engellendi</span>`;
  return '';
}

/** Kullanıcı avatarı span HTML döndürür */
function getAvatar(uid, users, size = 22) {
  const u = users.find(x => x.id === uid);
  if (!u) return '';
  const idx = users.indexOf(u);
  const c   = _getAVC()[idx % _getAVC().length];
  return `<span class="tk-av-sm" style="background:${c[0]};color:${c[1]};width:${size}px;height:${size}px" title="${u.name}">${_pusInitials(u.name)}</span>`;
}

/** İsimden baş harfler (window.initials'a fallback) */
function _pusInitials(name = '') {
  if (typeof window.initials === 'function') return window.initials(name);
  return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — ANA RENDER
// ════════════════════════════════════════════════════════════════

/** İş yükü hesapla — FIX 9 akıllı atama asistanı */
function _calcWorkload(userId) {
  var tasks = loadTasks().filter(function(t) { return !t.isDeleted; });
  var todayS = new Date().toISOString().slice(0, 10);
  var acik = tasks.filter(function(t) { return t.uid === userId && !t.done && t.status !== 'done'; }).length;
  var gecikmi = tasks.filter(function(t) { return t.uid === userId && !t.done && t.status !== 'done' && t.due && t.due < todayS; }).length;
  // Ortalama tamamlama süresi (gün)
  var tamamlanan = tasks.filter(function(t) { return t.uid === userId && t.done && t.created_at && t.completedAt; });
  var ortSure = 0;
  if (tamamlanan.length) {
    var topSure = tamamlanan.reduce(function(s, t) { return s + Math.ceil((new Date(t.completedAt) - new Date(t.created_at)) / 86400000); }, 0);
    ortSure = Math.round(topSure / tamamlanan.length * 10) / 10;
  }
  // Skor: acik*1 + gecikmi*3 + ortSure*0.5
  var skor = acik + gecikmi * 3 + ortSure * 0.5;
  var seviye = skor <= 5 ? 'low' : skor <= 12 ? 'mid' : 'high';
  return { acik: acik, gecikmi: gecikmi, ortSure: ortSure, skor: Math.round(skor * 10) / 10, seviye: seviye };
}
window._calcWorkload = _calcWorkload;

/** Kullanıcı seçici dropdown'larını doldurur — akıllı atama ile */
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
      // FIX 9: İş yükü bilgisi ile
      var wlColors = { low: '🟢', mid: '🟡', high: '🔴' };
      var wlLabels = { low: 'Uygun', mid: 'Orta', high: 'Yüksek' };
      var uOpts = users.map(function(u) {
        var wl = _calcWorkload(u.id);
        return '<option value="' + u.id + '">' + u.name + ' · ' + wlColors[wl.seviye] + ' ' + wl.acik + ' açık' + (wl.gecikmi ? ' · ' + wl.gecikmi + ' gecikmiş' : '') + '</option>';
      });
      tsel.innerHTML = uOpts.join('');
      // Öneri paneli
      var recEl = g('tk-atama-oneri');
      if (recEl) {
        var sorted = users.map(function(u) { return { id: u.id, name: u.name, wl: _calcWorkload(u.id) }; }).sort(function(a, b) { return a.wl.skor - b.wl.skor; });
        var best = sorted[0];
        var worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;
        var html = '';
        if (best && best.wl.seviye === 'low') {
          html += '<div style="font-size:10px;color:#16A34A;margin-top:4px">⭐ Önerilen: <b>' + best.name + '</b> — en düşük iş yükü' + (best.wl.gecikmi === 0 ? ', 0 gecikmiş' : '') + '</div>';
        }
        if (worst && worst.wl.gecikmi > 0) {
          html += '<div style="font-size:10px;color:#D97706;margin-top:2px">⚠ Dikkat: <b>' + worst.name + '</b> — ' + worst.wl.gecikmi + ' gecikmiş görevi var</div>';
        }
        recEl.innerHTML = html;
      }
    } else {
      const uid = _getCU()?.id || 0;
      tsel.innerHTML = `<option value="${uid}">${escapeHtml(_getCU()?.name || 'Ben')}</option>`;
      tsel.value = String(uid);
    }
  }
}

/** Kritik görev sayısını sidebar badge'ine yazar */

// ════════════════════════════════════════════════════════════════
// GECİKMİŞ GÖREV BİLDİRİMİ  [v2.1.0]
// Login sonrası + panel açılışında gecikmiş görevleri uyar
// ════════════════════════════════════════════════════════════════
function checkOverdueTasks() {
  const CU = _getCU();
  if (!CU) return;
  const todayS = new Date().toISOString().slice(0, 10);
  const tasks  = loadTasks();
  const overdue = tasks.filter(t =>
    !t.done && t.status !== 'done' && t.due && t.due < todayS &&
    (t.uid === CU.id || (t.managers||[]).includes(CU.id) || window.isAdmin?.())
  );
  if (!overdue.length) return;
  // Toast bildirimi
  const msg = overdue.length === 1
    ? `⚠️ "${overdue[0].title}" görevi gecikmiş!`
    : `⚠️ ${overdue.length} gecikmiş göreviniz var`;
  window.toast?.(msg, 'warn');
  // Bildirim paneline ekle
  overdue.slice(0, 3).forEach(t => {
    window.addNotif?.('⚠️', `"${t.title}" görevi gecikmiş (${t.due})`, 'warn', 'pusula', null, t.id);
  });
}
window.checkOverdueTasks = checkOverdueTasks;


// ════════════════════════════════════════════════════════════════
// SOL SIDEBAR DEPARTMAN NAVİGASYONU  [v2.3.0 Tasarım]
// ════════════════════════════════════════════════════════════════
function _renderDeptSidebar() {
  const nav = document.getElementById('pus-dept-nav');
  if (!nav) return;
  const tasks = loadTasks();
  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))].sort();
  const currentDept = document.getElementById('pf-dept')?.value || '';

  const allItem = `<div class="pus-sb-item ${currentDept===''?'active':''}" onclick="window._filterDept?.('')">
    <span class="pus-sb-dot" style="background:var(--ac)"></span>
    Tümü
    <span class="pus-sb-count">${tasks.length}</span>
  </div>`;

  const deptItems = depts.map(d => {
    const c = getDeptColor(d);
    const count = tasks.filter(t => t.department === d).length;
    return `<div class="pus-sb-item ${currentDept===d?'active':''}" onclick="window._filterDept?.('${d}')">
      <span class="pus-sb-dot" style="background:${c}"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d}</span>
      <span class="pus-sb-count">${count}</span>
    </div>`;
  }).join('');

  nav.innerHTML = allItem + deptItems;
}

window._filterDept = function(dept) {
  const sel = document.getElementById('pf-dept');
  if (sel) sel.value = dept;
  renderPusula();
};

window._renderDeptSidebar = _renderDeptSidebar;

function updatePusBadge() {
  const tasks  = window.isAdmin?.() ? loadTasks() : loadTasks().filter(t => t.uid === _getCU()?.id);
  // v8.5 fix: sadece status !== 'done' VE !t.done olanları say
  const undone = tasks.filter(t => !t.done && t.status !== 'done' && t.pri === 1).length;
  const b      = g('nb-pus-b');
  if (b) { b.textContent = undone; b.style.display = undone > 0 ? 'inline' : 'none'; }
  st('sv-c', undone);
}

/**
 * Ana render fonksiyonu.
 * Hero istatistikleri, progress strip, filtreler ve list/board görünümü.
 */

// Günlük söz
let _pusQuoteData = null;

window.setPusQuote = function(q) {
  _pusQuoteData = q;
  _renderPusQuoteBanner();
};

function _renderPusQuoteBanner() {
  // Hero banner kaldırıldı — özlü söz footer motivasyon şeridine yönlendirildi
  if (!_pusQuoteData) {
    const today = new Date().toISOString().slice(0,10);
    const cached = localStorage.getItem('ak_pus_quote_' + today);
    if (cached) { try { _pusQuoteData = JSON.parse(cached); } catch(e) {} }
  }
  if (!_pusQuoteData) return;
  // Footer bar'ı güncelle
  const bar = document.getElementById('pusula-v85-motivebar');
  if (bar) {
    bar.style.opacity = '0';
    bar.style.transition = 'opacity .6s ease';
    setTimeout(() => {
      bar.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t3);font-style:italic">"${_pusQuoteData.text||''}"</span><span style="font-size:10px;color:var(--t3);opacity:.5;margin-left:8px">— ${_pusQuoteData.author||''}</span>`;
      bar.style.opacity = '1';
    }, 300);
  }
}

// ── Motivasyon Sözleri (günde bir, deterministik) ───────────────
const _MOTIVATION_QUOTES = [
  { text:'Yapilacak en onemli is, her zaman bir sonraki adimdir.', author:'Herbert Simon' },
  { text:'Zamaninizi yonetmek, hayatinizi yonetmek demektir.', author:'Alan Lakein' },
  { text:'Kusursuzluk erisilemez. Ama onu kovalarsaniz mukemmellige ulasirsiniz.', author:'Vince Lombardi' },
  { text:'Basarinin sirri, her gun baslamaktir.', author:'Mark Twain' },
  { text:'Bugunku isini yarina birakma.', author:'Benjamin Franklin' },
  { text:'Odaklanma, bir seye evet demek degil; diger yuz seye hayir demektir.', author:'Steve Jobs' },
  { text:'Planlama yaparken uzun dusun, uygularken hizli hareket et.', author:'Sun Tzu' },
  { text:'Basari, kucuk cabalarin her gun tekrar edilmesidir.', author:'Robert Collier' },
  { text:'En iyi zaman yonetimi araci hayir demeyi ogrenmektir.', author:'Peter Drucker' },
  { text:'Vakit nakittir.', author:'Benjamin Franklin' },
  { text:'Mukemmel plan yarin degil, iyi plan bugundur.', author:'George Patton' },
  { text:'Disiplin, basarinin anasıdır.', author:'Harry S. Truman' },
  { text:'Bir isi yapmak icin en iyi zaman, elindeki zamandır.', author:'Napoleon Hill' },
  { text:'Hedef koymak, gorunmeyeni gorunur kilmaktir.', author:'Tony Robbins' },
  { text:'Buyuk isler kucuk adimlarla baslar.', author:'Lao Tzu' },
  { text:'Zamanin degeri, kaybedildiginde anlasilir.', author:'Theophrastus' },
  { text:'Her sabah iki seciminiz var: uyumaya devam veya kalkip hayallerinizin pesinden kosmak.', author:'Carmelo Anthony' },
  { text:'Verimlilik, dogru isi yapmaktir. Etkililik, isi dogru yapmaktir.', author:'Peter Drucker' },
  { text:'Gelecegi tahmin etmenin en iyi yolu, onu yaratmaktir.', author:'Abraham Lincoln' },
  { text:'Az is yapan cok dusunur, cok is yapan az konusur.', author:'Mevlana' },
];
function _getDailyQuote() {
  const d = new Date();
  const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % _MOTIVATION_QUOTES.length;
  return _MOTIVATION_QUOTES[idx];
}

function renderPusula() {
  populatePusUsers();
  setTimeout(_renderDeptSidebar, 50);
  // Motivasyon sözü güncelle
  const _q = _getDailyQuote();
  const _qEl = g('pus-motivation');
  if (_qEl) _qEl.innerHTML = `<span style="font-style:italic;color:var(--t2)">"${escapeHtml(_q.text)}"</span> <span style="color:var(--t3);font-size:10px">— ${escapeHtml(_q.author)}</span>`;
  // Gecikmiş görev kontrolü (her renderda değil, 5 dakikada bir)
  const _ovKey = '_pus_ov_check';
  if (!window[_ovKey] || Date.now() - window[_ovKey] > 300000) {
    window[_ovKey] = Date.now();
    setTimeout(checkOverdueTasks, 500);
  }
  const todayS  = new Date().toISOString().slice(0, 10);
  const allVis  = visTasks();
  const users   = loadUsers();

  // ── İstatistikler ─────────────────────────────────────────────
  const ipCount   = allVis.filter(t => t.status === 'inprogress').length;
  const rvCount   = allVis.filter(t => t.status === 'review').length;
  const doneCount = allVis.filter(t => t.done || t.status === 'done').length;
  const todoCount = allVis.filter(t => !t.done && (!t.status || t.status === 'todo')).length;
  const ovCount   = allVis.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS).length;

  // Hero pill sayaçları
  const el = id => g(id);
  if (el('pv-tot'))      el('pv-tot').textContent    = allVis.length;
  if (el('psf-todo-n'))  el('psf-todo-n').textContent = todoCount;
  if (el('psf-ip-n'))    el('psf-ip-n').textContent   = ipCount;
  if (el('psf-rv-n'))    el('psf-rv-n').textContent   = rvCount;
  if (el('psf-done-n'))  el('psf-done-n').textContent = doneCount;
  if (el('pv-ov'))       el('pv-ov').textContent      = ovCount;
  updatePusBadge();

  // ── Progress strip ─────────────────────────────────────────────
  const progFill = g('pus-prog-fill');
  const progPct  = g('pus-prog-pct');
  if (progFill && progPct && allVis.length) {
    const pct = Math.round(doneCount / allVis.length * 100);
    progFill.style.width = pct + '%';
    progPct.textContent  = pct + '%';
    progPct.style.color  = pct >= 80 ? 'var(--gr)' : pct >= 50 ? 'var(--am)' : 'var(--ac)';
  }
  const progStats = g('pus-prog-stats');
  if (progStats && allVis.length) {
    const overdue = allVis.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS).length;
    progStats.innerHTML = `
      <span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--gr)"></span>${doneCount} tamam</span>
      <span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--bl)"></span>${ipCount} devam</span>
      ${overdue ? `<span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--rd)"></span>${overdue} gecikmiş</span>` : ''}
    `;
  }

  // ── Motivasyon mesajı ──────────────────────────────────────────
  const subEl = g('ph-pus-s');
  if (subEl && allVis.length) {
    const pct  = Math.round(doneCount / allVis.length * 100);
    const msgs = [
      [100, 'Tum gorevler tamamlandi! Harika is!'],
      [80,  'Neredeyse bitti, son duzluktesiniz!'],
      [60,  'Iyi gidiyorsunuz, devam edin!'],
      [40,  'Orta noktayi gectiniz, devam!'],
      [20,  'Basladiniz! Her adim onemli.'],
      [0,   'Gorevler sizi bekliyor.'],
    ];
    const msg = msgs.find(([t]) => pct >= t);
    subEl.textContent = msg ? msg[1] : 'Gorev yonetim merkezi';
  }

  // ── Gunluk söz banner (ph-pus-quote) ──────────────────────────
  _renderPusQuoteBanner();

  // ── Filtreler ──────────────────────────────────────────────────
  let fl = [...allVis];

  // Hızlı filtre (hero pills)
  if (PUS_QUICK_FILTER === 'todo')       fl = fl.filter(t => !t.done && (!t.status || t.status === 'todo'));
  else if (PUS_QUICK_FILTER === 'inprogress') fl = fl.filter(t => t.status === 'inprogress');
  else if (PUS_QUICK_FILTER === 'review')     fl = fl.filter(t => t.status === 'review');
  else if (PUS_QUICK_FILTER === 'done')       fl = fl.filter(t => t.done || t.status === 'done');
  else if (PUS_QUICK_FILTER === 'waiting')     fl = fl.filter(t => t.status === 'waiting');
  else if (PUS_QUICK_FILTER === 'overdue')    fl = fl.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS);

  // "Yalnızca benimkiler" görünümü
  if (PUS_VIEW === 'me') fl = fl.filter(t => t.uid === _getCU()?.id);

  // Panel filtreleri
  const fPri    = parseInt(g('pf-pri')?.value   || '0');
  const fSearch = (g('pf-search')?.value        || '').toLowerCase();
  const fFrom   = g('pf-dfrom')?.value          || '';
  const fTo     = g('pf-dto')?.value            || '';
  const fSort   = g('pf-sort')?.value           || 'pri';
  const fDept   = g('pf-dept')?.value           || '';
  _populateDeptFilter();

  if (fPri > 0)  fl = fl.filter(t => t.pri === fPri);
  if (fSearch)   fl = fl.filter(t =>
    t.title.toLowerCase().includes(fSearch) ||
    (t.desc || '').toLowerCase().includes(fSearch) ||
    (t.tags || []).some(tg => tg.toLowerCase().includes(fSearch))
  );
  if (fFrom) fl = fl.filter(t => t.due && t.due >= fFrom);
  if (fTo)   fl = fl.filter(t => t.due && t.due <= fTo);

  // Sıralama
  if (fSort === 'pri')    fl.sort((a, b) => a.pri - b.pri || (a.done ? 1 : -1));
  else if (fSort === 'due')    fl.sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due.localeCompare(b.due); });
  else if (fSort === 'newest') fl.sort((a, b) => b.id - a.id);
  else if (fSort === 'oldest') fl.sort((a, b) => a.id - b.id);
  else if (fSort === 'az')     fl.sort((a, b) => a.title.localeCompare(b.title, 'tr'));

  // Özet satırı
  const sum = g('pf-summary');
  if (sum) sum.textContent = fl.length === allVis.length
    ? `${fl.length} görev`
    : `${fl.length} / ${allVis.length} görev gösteriliyor`;

  // Focus panel güncelle
  renderFocusPanel();

  const main = g('pus-main-view');
  if (!main) return;

  if (PUS_VIEW === 'board') {
    renderPusulaBoard(fl, users, todayS, main);
  } else {
    renderPusulaList(fl, users, todayS, main);
  }

  // Alt görevleri her satır için render et
  fl.forEach(t => {
    const stEl = g('st-' + t.id);
    if (stEl) renderSubTasks(t.id, t.subTasks || [], stEl);
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — LIST GÖRÜNÜMÜ  (DocumentFragment)
// ════════════════════════════════════════════════════════════════

/**
 * Liste görünümünü DocumentFragment ile tek seferde DOM'a yazar.
 * Anayasa Kural 3: innerHTML = '' ile tekrar yazmak yerine
 * Fragment oluşturulur, tüm satırlar eklenir, sonra tek replaceChildren().
 */
function renderPusulaList(fl, users, todayS, cont) {
  const chatCounts = loadTaskChats();

  if (!fl.length) {
    cont.innerHTML = `<div class="pus-empty">
      <div class="pus-empty-icon">🎯</div>
      <div class="pus-empty-title">Görev bulunamadı</div>
      <div class="pus-empty-sub">Filtreleri değiştirin veya yeni bir görev ekleyin.</div>
      <button class="pus-add-btn" onclick="Pusula.openAdd()" style="margin:0 auto">
        <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        Görev Ekle
      </button>
    </div>`;
    return;
  }

  // ── DocumentFragment ────────────────────────────────────────
  const frag    = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.className = 'pus-list-wrap';

  fl.forEach((t, idx) => {
    const p         = PRI_MAP[t.pri] || PRI_MAP[4];
    const dueChip   = getDueChip(t.due, t.done, todayS);
    const statusPill= getStatusPill(t);
    const av        = getAvatar(t.uid, users, 28);
    const chatCount = (chatCounts[t.id] || []).length;
    const subTasks  = t.subTasks || [];
    const subDone   = subTasks.filter(s => s.done).length;
    const tags      = (t.tags || []).slice(0, 2).map(tg =>
      `<span style="background:var(--al);color:var(--ac);padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${tg}</span>`
    ).join('');
    const isDone = t.done || t.status === 'done';
    const cu     = _getCU();

    // Ana satır
    const row = document.createElement('div');
    row.className  = `tk-row${isDone ? ' done-row' : ''}`;
    row.dataset.taskId = t.id;
    row.style.animation = `pus-row-in ${.04 + idx * .025}s ease both`;
    row.addEventListener('click', () => openPusDetail(t.id));

    row.innerHTML = `
      <div class="tk-pri-bar" style="background:${isDone ? 'var(--b)' : p.color}"></div>
      <div class="tk-check" onclick="event.stopPropagation()">
        <input type="checkbox" ${isDone ? 'checked' : ''}
          onchange="Pusula.toggle(${t.id},this.checked)"
          style="${isDone ? 'background:' + p.color + ';border-color:' + p.color : 'border-color:' + p.color}">
      </div>
      <div class="tk-body">
        <div class="tk-name" style="${isDone ? '' : 'font-weight:600'}">
          ${t.jobId ? `<span style="font-size:9px;font-family:monospace;color:var(--t3);background:var(--s2);padding:1px 5px;border-radius:3px;margin-right:4px">${t.jobId}</span>` : ''}${t.title}
          ${!isDone && (t.participants || []).includes(cu?.id) ? ` <span style="font-size:9px;background:var(--al);color:var(--ac);padding:1px 6px;border-radius:4px;font-weight:600">✅ Katılımcı</span>` : ''}
          ${!isDone && (t.viewers || []).includes(cu?.id) ? ` <span style="font-size:9px;background:rgba(139,92,246,.1);color:#8B5CF6;padding:1px 6px;border-radius:4px;font-weight:600">👁 İzleyici</span>` : ''}
        </div>
        <div class="tk-meta">
          <span class="tk-pri-badge ${p.badge}">${p.label}</span>
          ${statusPill}${dueChip}
          ${t.department ? (() => { const dc = getDeptColor(t.department); return `<span class="pusula-v85-dept-badge" style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${dc}22;color:${dc}">● ${t.department}</span>`; })() : ''}
          ${t.cost ? `<span style="font-size:10px;background:rgba(16,185,129,.1);color:#059669;padding:2px 8px;border-radius:6px;font-weight:700">₺${Number(t.cost).toLocaleString('tr-TR')}</span>` : ''}
          ${subTasks.length ? `<span style="font-size:12px;color:var(--t3);background:var(--s2);padding:2px 8px;border-radius:6px;font-weight:700">⬜ ${subDone}/${subTasks.length}</span>` : ''}
          ${(() => { const ct = t.createdAt||t.ts; if(!ct) return ''; const days=Math.floor((Date.now()-new Date(ct.replace(' ','T')).getTime())/86400000); if(days<1) return ''; const color = days>14 ? 'var(--rd)' : 'var(--t3)'; return `<span style="font-size:10px;color:${color};padding:2px 6px;border-radius:6px;background:var(--s2)">${days}g</span>`; })()}
          ${tags}
          ${t.link ? `<a href="${t.link}" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;color:#6366F1;text-decoration:none;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.1);font-weight:700">🔗</a>` : ''}
          ${t.duration ? `<span style="font-size:10px;background:var(--al);color:var(--ac);padding:2px 7px;border-radius:5px;font-weight:600">⏱ ${t.duration>=60?Math.floor(t.duration/60)+'s'+(t.duration%60?' '+t.duration%60+'dk':''):t.duration+'dk'}</span>` : ''}
          ${t.file ? `<span style="font-size:10px;background:var(--s2);color:var(--t3);padding:2px 7px;border-radius:5px;font-weight:600">📎</span>` : ''}
          ${(t.dependsOn||[]).length ? `<span style="font-size:10px;color:${isTaskBlocked(t)?'var(--rdt)':'var(--grt)'};padding:1px 6px;border-radius:4px;background:${isTaskBlocked(t)?'rgba(239,68,68,.08)':'rgba(34,197,94,.08)'};font-weight:600">${isTaskBlocked(t)?'🔒 Engelli':'🔗 Bagli'}</span>` : ''}
          ${(t.participants || []).length ? `<span style="font-size:10px;color:var(--ac);padding:1px 6px;border-radius:4px;background:var(--al);font-weight:600">+${(t.participants || []).length} katılımcı</span>` : ''}
          ${(t.viewers || []).length ? `<span style="font-size:10px;color:#8B5CF6;padding:1px 6px;border-radius:4px;background:rgba(139,92,246,.08);font-weight:600">👁${(t.viewers || []).length}</span>` : ''}
          ${(!isDone && t.deadline_full) ? `<span class="pusula-v85-countdown" id="cd-${t.id}" data-deadline="${t.deadline_full}" style="font-size:10px;font-family:monospace;padding:2px 8px;border-radius:6px;background:var(--s2);color:var(--t3);font-weight:700"></span>` : ''}
        </div>
      </div>
      <div class="tk-right">
        ${av}
        <div class="tk-row-actions">
          ${chatCount
            ? `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" class="tk-chat-btn-active">💬 ${chatCount}</button>`
            : `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" class="tk-chat-btn-empty">💬</button>`
          }
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'day')"     class="tk-action-btn" title="Günün en önemlisi"      style="opacity:${PUS_DAY_FOCUS.includes(t.id)?1:.25}">🔥</button>
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'week')"    class="tk-action-btn" title="Haftanın en önemlisi"    style="opacity:${PUS_WEEK_FOCUS.includes(t.id)?1:.25}">⭐</button>
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'month')"   class="tk-action-btn" title="Ayın en önemlisi"        style="opacity:${(_loadFocus('month')).includes(t.id)?1:.25}">📅</button>
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'quarter')" class="tk-action-btn" title="Çeyreğin en önemlisi"    style="opacity:${(_loadFocus('quarter')).includes(t.id)?1:.25}">🎯</button>
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'year')"    class="tk-action-btn" title="Yılın en önemlisi"       style="opacity:${(_loadFocus('year')).includes(t.id)?1:.25}">🏆</button>
          ${t.uid === cu?.id || window.isAdmin?.() ? `<button onclick="event.stopPropagation();Pusula.edit(${t.id})" class="tk-action-btn">✏️</button>` : ''}
          ${t.uid === cu?.id || window.isAdmin?.() ? `<button onclick="event.stopPropagation();Pusula.del(${t.id})"  class="tk-action-btn" style="color:#EF4444;font-size:14px">✕</button>` : ''}
        </div>
      </div>`;

    wrapper.appendChild(row);

    // Alt görev placeholder
    const stPlaceholder = document.createElement('div');
    stPlaceholder.id = 'st-' + t.id;
    wrapper.appendChild(stPlaceholder);
  });

  frag.appendChild(wrapper);
  // Tek DOM operasyonu — mevcut içeriği temizle ve yeni fragment ekle
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — BOARD GÖRÜNÜMÜ  (DocumentFragment per kolon)
// ════════════════════════════════════════════════════════════════

function renderPusulaBoard(fl, users, todayS, cont) {
  const cu = _getCU();
  const PRI_B = {
    1: { color: '#DC2626', glow: 'rgba(220,38,38,.3)'  },
    2: { color: '#D97706', glow: 'rgba(217,119,6,.25)' },
    3: { color: '#4F46E5', glow: 'rgba(79,70,229,.25)' },
    4: { color: '#64748B', glow: 'rgba(100,116,139,.15)' },
  };
  const cols = [
    { key: 'todo',       label: 'Yapılacak',       cls: 'pus-col-todo',       titleColor: '#475569', filter: t => !t.done && (!t.status || t.status === 'todo') },
    { key: 'inprogress', label: '🔄 Devam',         cls: 'pus-col-inprogress', titleColor: '#1D4ED8', filter: t => t.status === 'inprogress' },
    { key: 'waiting',    label: '⏳ Beklemede',     cls: 'pus-col-waiting',    titleColor: '#D97706', filter: t => t.status === 'waiting' },
    { key: 'review',     label: '👀 İnceleme',      cls: 'pus-col-review',     titleColor: '#B45309', filter: t => t.status === 'review' },
    { key: 'done',       label: '✅ Tamamlandı',    cls: 'pus-col-done',       titleColor: '#15803D', filter: t => t.done || t.status === 'done' },
  ];

  const board = document.createElement('div');
  board.className = 'pus-board';

  cols.forEach(col => {
    const items = fl.filter(col.filter);
    const colEl = document.createElement('div');
    colEl.className = `pus-col ${col.cls}`;

    // Kolon başlığı
    const headerEl = document.createElement('div');
    headerEl.className = 'pus-col-header';
    headerEl.innerHTML = `
      <div class="pus-col-title" style="color:${col.titleColor}">${col.label}</div>
      <span class="pus-col-count">${items.length}</span>`;
    colEl.appendChild(headerEl);

    // Kartlar — DocumentFragment per-kolon
    const colFrag = document.createDocumentFragment();
    items.forEach((t, i) => {
      const p         = PRI_B[t.pri] || PRI_B[4];
      const dueChip   = getDueChip(t.due, t.done, todayS);
      const av        = getAvatar(t.uid, users, 22);
      const chatCount = (loadTaskChats()[t.id] || []).length;
      const subTasks  = t.subTasks || [];
      const subDone   = subTasks.filter(s => s.done).length;
      const tags      = (t.tags || []).slice(0, 1).map(tg =>
        `<span style="background:rgba(99,102,241,.1);color:#6366F1;padding:1px 7px;border-radius:5px;font-size:9px;font-weight:700">${tg}</span>`
      ).join('');

      const card = document.createElement('div');
      card.className = `tk-card${t.done ? ' done-card' : ''}`;
      card.style.animationDelay = `${i * .04}s`;
      card.addEventListener('click', () => openPusDetail(t.id));
      card.innerHTML = `
        <style>.tk-card:hover .tk-card-edit{opacity:1!important}</style>
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:9px">
          <div style="width:4px;min-height:36px;border-radius:3px;flex-shrink:0;margin-top:1px;background:${p.color}"></div>
          <div class="tk-card-title" style="flex:1">${t.jobId ? `<span style="font-size:8px;font-family:monospace;color:var(--t3);background:var(--s2);padding:1px 4px;border-radius:3px;margin-right:3px;cursor:pointer" onclick="event.stopPropagation();window.openJobIdHub?.('${t.jobId}')">${t.jobId}</span>` : ''}${t.title}</div>
          ${t.uid === cu?.id || window.isAdmin?.() ? `<button onclick="event.stopPropagation();Pusula.edit(${t.id})"
            style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:18px;padding:0;min-width:28px;min-height:28px;flex-shrink:0;opacity:0;transition:.14s;display:inline-flex;align-items:center;justify-content:center" class="tk-card-edit">✏️</button>` : ''}
        </div>
        <div class="tk-card-meta">
          ${dueChip}${tags}
          ${subTasks.length ? `<span style="font-size:12px;color:var(--t3);background:var(--s2);padding:2px 8px;border-radius:5px;font-weight:700">⬜${subDone}/${subTasks.length}</span>` : ''}
          ${chatCount ? `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" class="tk-chat-btn-active" style="font-size:12px">💬${chatCount}</button>` : ''}
          <span style="margin-left:auto">${av}</span>
        </div>`;
      colFrag.appendChild(card);
    });

    colEl.appendChild(colFrag);

    // "Yapılacak" kolonuna görev ekle butonu
    if (col.key === 'todo') {
      const addBtn = document.createElement('button');
      addBtn.className = 'pus-board-add';
      addBtn.textContent = '＋ Görev Ekle';
      addBtn.addEventListener('click', openAddTask);
      colEl.appendChild(addBtn);
    }

    board.appendChild(colEl);
  });

  cont.replaceChildren(board);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — DETAY PANELİ
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — DETAY PANELİ  (4 Sekmeli)
// ════════════════════════════════════════════════════════════════

// Aktif detay görev ID'si — sekme fonksiyonları bu değişkeni kullanır
let _PDP_TASK_ID = null;

const _PRI_NAMES  = { 1:'🔴 Kritik', 2:'🟠 Önemli', 3:'🔵 Normal', 4:'⚪ Düşük' };
const _PRI_COLORS = { 1:'#ef4444', 2:'#f97316', 3:'#3b82f6', 4:'#9ca3af' };
const _ST_CFG = {
  todo:       { l:'📋 Yapılacak', bg:'var(--s2)',  c:'var(--t2)'  },
  inprogress: { l:'🔄 Devam',     bg:'var(--blb)', c:'var(--blt)' },
  review:     { l:'👀 İnceleme',  bg:'var(--amb)', c:'var(--amt)' },
  done:       { l:'✅ Tamam',     bg:'var(--grb)', c:'var(--grt)' },
};

/** Kullanıcı avatar HTML üretir */
function _pusAv(uid, users, size) {
  size = size || 26;
  const u = users.find(function(x){ return x.id === uid; }) || { name: '?' };
  const idx = users.indexOf(u);
  const c = _getAVC()[Math.max(idx, 0) % _getAVC().length];
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + c[0] + ';color:' + c[1] + ';display:flex;align-items:center;justify-content:center;font-size:' + Math.floor(size * 0.38) + 'px;font-weight:700;flex-shrink:0">' + _pusInitials(u.name) + '</div>';
}

/** Kişi chip HTML üretir */
function _pusPeopleChip(uid, users, badge, color) {
  color = color || 'var(--b)';
  const u = users.find(function(x){ return x.id === uid; }) || { name: '?' };
  return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:9px;background:var(--sf);border:1px solid ' + color + '20">'
    + _pusAv(uid, users, 24)
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:12px;font-weight:500;color:var(--t)">' + u.name + '</div>'
    + '<div style="font-size:10px;color:var(--t3)">' + (u.role || '—') + '</div>'
    + '</div>'
    + (badge ? '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:' + color + '18;color:' + color + '">' + badge + '</span>' : '')
    + '</div>';
}

function openPusDetail(taskId) {
  const task = loadTasks().find(function(t){ return t.id === taskId; });
  if (!task) return;

  _PDP_TASK_ID = taskId;
  PUS_DETAIL_ID = taskId;

  const users  = loadUsers();
  const panel  = g('pus-detail-panel');
  if (!panel) return;

  const todayS = new Date().toISOString().slice(0, 10);
  const stKey  = task.done ? 'done' : (task.status || 'todo');
  const sc     = _ST_CFG[stKey] || _ST_CFG.todo;

  // Başlık
  const titleEl = g('pdp-title');
  if (titleEl) titleEl.textContent = task.title;

  // Meta satırı
  const metaEl = g('pdp-meta');
  if (metaEl) {
    const dl = task.due ? Math.ceil((new Date(task.due) - new Date(todayS)) / 86400000) : null;
    const dueStr = task.due
      ? (dl < 0
          ? '<span style="color:var(--rd);font-size:11px">⚠ ' + Math.abs(dl) + 'g gecikmiş</span>'
          : '<span style="color:var(--t2);font-size:11px">' + task.due + '</span>')
      : '';
    metaEl.innerHTML =
      '<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:' + sc.bg + ';color:' + sc.c + '">' + sc.l + '</span> '
      + '<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:' + (_PRI_COLORS[task.pri] || '#9ca3af') + '22;color:' + (_PRI_COLORS[task.pri] || '#9ca3af') + '">' + (_PRI_NAMES[task.pri] || '—') + '</span>'
      + (dueStr ? ' ' + dueStr : '');
  }

  // Body — tab bar + pane'ler
  const body = g('pus-detail-body');
  if (!body) { panel.classList.add('open'); panel.style.display = 'flex'; return; }

  const files    = task.files || (task.file ? [task.file] : []);
  const chats    = (loadTaskChats()[taskId] || []).length;
  const managers = task.managers || [task.uid];

  body.innerHTML =
    // ── TAB BAR ──────────────────────────────────────────────
    '<div id="pdp-tabbar" style="display:flex;background:var(--s2);border-bottom:1px solid var(--b);flex-shrink:0">'
    + '<button id="pdp-tab-info"  class="pdp-t active" onclick="pdpSwitch(\'info\')"  style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--ac);border-bottom:2px solid var(--ac);font-family:inherit">👤 Atananlar</button>'
    + '<button id="pdp-tab-chat"  class="pdp-t"        onclick="pdpSwitch(\'chat\')"  style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">💬 Mesajlar' + (chats ? '<span style="background:var(--rd);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">' + chats + '</span>' : '') + '</button>'
    + '<button id="pdp-tab-files" class="pdp-t"        onclick="pdpSwitch(\'files\')" style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">📎 Dosyalar' + (files.length ? '<span style="background:var(--ac);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">' + files.length + '</span>' : '') + '</button>'
    + '<button id="pdp-tab-perms" class="pdp-t"        onclick="pdpSwitch(\'perms\')" style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">🔒 İzinler</button>'
    + '</div>'
    // ── PANE'LER ─────────────────────────────────────────────
    + '<div style="flex:1;overflow-y:auto">'
    + '<div id="pdp-pane-info"  style="padding:16px"></div>'
    + '<div id="pdp-pane-chat"  style="display:none;height:100%;flex-direction:column"></div>'
    + '<div id="pdp-pane-files" style="display:none;padding:16px"></div>'
    + '<div id="pdp-pane-perms" style="display:none;padding:16px"></div>'
    + '</div>';

  pdpRenderInfo();

  // Açılma zaman mührü
  const _openTs = new Date().toLocaleString('tr-TR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
  const _openEl = g('pdp-opened-at');
  if (_openEl) _openEl.textContent = '👁 ' + _openTs + ' tarihinde açıldı';

  panel.classList.add('open');
  panel.style.display = 'flex';
}

/** Sekme geçişi — global fonksiyon, onclick'te güvenli */
function pdpSwitch(tab) {
  // Buton stillerini sıfırla
  var btns = document.querySelectorAll('.pdp-t');
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.color       = 'var(--t2)';
    btns[i].style.fontWeight  = '500';
    btns[i].style.borderBottom = '2px solid transparent';
  }
  var active = g('pdp-tab-' + tab);
  if (active) {
    active.style.color        = 'var(--ac)';
    active.style.fontWeight   = '600';
    active.style.borderBottom = '2px solid var(--ac)';
  }

  var panes = ['info','chat','files','perms'];
  // Yeni özellikler pane'ini de gizle
  var extraPane = g('pdp-pane-extra');
  if (extraPane) extraPane.style.display = 'none';
  for (var j = 0; j < panes.length; j++) {
    var el = g('pdp-pane-' + panes[j]);
    if (!el) continue;
    if (panes[j] === tab) {
      el.style.display = (tab === 'chat') ? 'flex' : 'block';
    } else {
      el.style.display = 'none';
    }
  }

  if (tab === 'info')  pdpRenderInfo();
  if (tab === 'chat')  pdpRenderChat();
  if (tab === 'files') pdpRenderFiles();
  if (tab === 'perms') pdpRenderPerms();
}

// ── SEKME 1: Atananlar ────────────────────────────────────────────
function pdpRenderInfo() {
  var pane = g('pdp-pane-info');
  if (!pane || !_PDP_TASK_ID) return;
  var task  = loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  var users   = loadUsers();
  var todayS  = new Date().toISOString().slice(0, 10);
  var stKey   = task.done ? 'done' : (task.status || 'todo');
  var managers = task.managers || [task.uid];

  var html = '<div style="display:flex;flex-direction:column;gap:14px">';

  // Durum seçici
  html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">DURUM</div><div style="display:flex;gap:5px;flex-wrap:wrap">';
  var statuses = ['todo','inprogress','review','done'];
  for (var si = 0; si < statuses.length; si++) {
    var s   = statuses[si];
    var sc  = _ST_CFG[s];
    var isA = s === stKey;
    html += '<button onclick="pdpQuickStatus(\'' + s + '\')" style="padding:5px 11px;border-radius:7px;border:1px solid ' + (isA ? sc.c : 'var(--b)') + ';background:' + (isA ? sc.bg : 'var(--sf)') + ';color:' + (isA ? sc.c : 'var(--t2)') + ';font-size:12px;cursor:pointer;font-family:inherit;font-weight:' + (isA ? '600' : '400') + '">' + sc.l + '</button>';
  }
  html += '</div></div>';

  // Meta kartlar
  var dueStr = task.due
    ? getDueChip(task.due, task.done, todayS) + ' <span style="font-size:11px;color:var(--t2)">' + task.due + '</span>'
    : '<span style="color:var(--t3);font-size:12px">Belirtilmemiş</span>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SON TARİH</div><div>' + dueStr + '</div></div>'
    + '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">ÖNCELİK</div><div style="font-size:13px;font-weight:600;color:' + (_PRI_COLORS[task.pri] || 'var(--t2)') + '">' + (_PRI_NAMES[task.pri] || '—') + '</div></div>'
    + '</div>';

  // Açıklama
  if (task.desc) {
    html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">AÇIKLAMA</div>'
      + '<div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--t2);background:var(--s2);border-radius:8px;padding:10px 12px">' + task.desc + '</div></div>';
  }

  // Etiketler
  if ((task.tags || []).length) {
    html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">ETİKETLER</div><div style="display:flex;gap:5px;flex-wrap:wrap">';
    for (var ti = 0; ti < task.tags.length; ti++) {
      html += '<span style="background:var(--al);color:var(--at);padding:3px 10px;border-radius:6px;font-size:11px">' + task.tags[ti] + '</span>';
    }
    html += '</div></div>';
  }

  // Yöneticiler
  html += '<div><div style="font-size:10px;font-weight:700;color:#007AFF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">👑 YÖNETİCİLER</div><div style="display:flex;flex-direction:column;gap:5px">';
  for (var mi = 0; mi < managers.length; mi++) {
    html += _pusPeopleChip(managers[mi], users, 'Yönetici', '#007AFF');
  }
  html += '</div></div>';

  // Katılımcılar
  if ((task.participants || []).length) {
    html += '<div><div style="font-size:10px;font-weight:600;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">✅ KATILIMCILAR</div><div style="display:flex;flex-direction:column;gap:5px">';
    for (var pi = 0; pi < task.participants.length; pi++) {
      html += _pusPeopleChip(task.participants[pi], users, 'Katılımcı', 'var(--ac)');
    }
    html += '</div></div>';
  }

  // İzleyiciler
  if ((task.viewers || []).length) {
    html += '<div><div style="font-size:10px;font-weight:700;color:#8B5CF6;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">👁 İZLEYİCİLER</div><div style="display:flex;flex-direction:column;gap:5px">';
    for (var vi = 0; vi < task.viewers.length; vi++) {
      html += _pusPeopleChip(task.viewers[vi], users, 'İzleyici', '#8B5CF6');
    }
    html += '</div></div>';
  }

  // Ekler (link / dosya)
  var files = task.files || (task.file ? [task.file] : []);
  if (task.link || files.length) {
    html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">EKLER</div><div style="display:flex;flex-direction:column;gap:6px">';
    if (task.link) {
      html += '<a href="' + task.link + '" target="_blank" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--blb);color:var(--blt);border-radius:8px;text-decoration:none;font-size:12px">🔗 <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + task.link + '</span></a>';
    }
    if (files.length === 1) {
      html += '<a href="' + files[0].data + '" download="' + files[0].name + '" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--s2);color:var(--t);border-radius:8px;text-decoration:none;font-size:12px">📎 ' + files[0].name + '</a>';
    } else if (files.length > 1) {
      html += '<div style="font-size:12px;color:var(--t2);cursor:pointer" onclick="pdpSwitch(\'files\')">📎 ' + files.length + ' dosya — Dosyalar sekmesine git →</div>';
    }
    html += '</div></div>';
  }

  // Alt görevler
  html += '<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">ALT GÖREVLER (' + (task.subTasks || []).length + ')</div>'
    + '<button onclick="addSubTask(' + _PDP_TASK_ID + ')" class="tk-action-btn" style="font-size:13px;padding:6px 12px;border-style:dashed;min-height:36px">+ Ekle</button>'
    + '</div><div id="pdp-subtasks"></div></div>';

  // Zaman bilgileri
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:4px;border-top:1px solid var(--b)">'
    + '<div style="background:var(--s2);border-radius:9px;padding:9px 12px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">OLUŞTURULMA</div>'
      + '<div style="font-size:11px;color:var(--t2);font-family:monospace">' + (task.createdAt || task.ts || '—') + '</div>'
    + '</div>'
    + '<div style="background:var(--s2);border-radius:9px;padding:9px 12px" id="pdp-opened-at-card">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SON AÇILMA</div>'
      + '<div id="pdp-opened-at" style="font-size:11px;color:var(--t2);font-family:monospace">—</div>'
    + '</div>'
  + '</div>';

  html += '</div>';
  pane.innerHTML = html;

  var stEl = g('pdp-subtasks');
  if (stEl) renderSubTasks(_PDP_TASK_ID, task.subTasks || [], stEl);
}

/** Durum hızlı güncelleme — onclick'ten güvenle çağrılır */
function pdpQuickStatus(status) {
  if (!_PDP_TASK_ID) return;
  quickUpdateTask(_PDP_TASK_ID, 'status', status);
  pdpRenderInfo();
  // Meta satırını güncelle
  var task = loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  var todayS = new Date().toISOString().slice(0, 10);
  var stKey  = task.done ? 'done' : (task.status || 'todo');
  var sc     = _ST_CFG[stKey] || _ST_CFG.todo;
  var metaEl = g('pdp-meta');
  if (metaEl) {
    var dl = task.due ? Math.ceil((new Date(task.due) - new Date(todayS)) / 86400000) : null;
    var dueStr = task.due
      ? (dl < 0 ? '<span style="color:var(--rd);font-size:11px">⚠ ' + Math.abs(dl) + 'g gecikmiş</span>' : '<span style="color:var(--t2);font-size:11px">' + task.due + '</span>')
      : '';
    metaEl.innerHTML =
      '<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:' + sc.bg + ';color:' + sc.c + '">' + sc.l + '</span> '
      + '<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:' + (_PRI_COLORS[task.pri] || '#9ca3af') + '22;color:' + (_PRI_COLORS[task.pri] || '#9ca3af') + '">' + (_PRI_NAMES[task.pri] || '—') + '</span>'
      + (dueStr ? ' ' + dueStr : '');
  }
}

// ── SEKME 2: Mesajlar ─────────────────────────────────────────────
function pdpRenderChat() {
  var pane = g('pdp-pane-chat');
  if (!pane || !_PDP_TASK_ID) return;
  pane.style.flexDirection = 'column';
  pane.style.height = '100%';

  if (!g('pdp-chat-msgs')) {
    pane.innerHTML =
      '<div style="padding:8px 14px;border-bottom:1px solid var(--b);flex-shrink:0"><input type="search" id="pdp-chat-search" class="fi" placeholder="Mesajlarda ara..." style="font-size:12px;padding:6px 10px" oninput="pdpRefreshChatMsgs()"></div>'
      + '<div id="pdp-chat-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0"></div>'
      + '<div style="padding:10px 14px;border-top:1px solid var(--b);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:var(--sf)">'
      + '<textarea id="pdp-chat-inp" class="fi" rows="2" style="resize:none;flex:1;font-size:13px;min-height:42px" placeholder="Mesaj yaz..."></textarea>'
      + '<div style="display:flex;flex-direction:column;gap:5px">'
      + '<input type="file" id="pdp-chat-file" style="display:none" onchange="pdpSendChat()">'
      + '<button class="btn btns" onclick="document.getElementById(\'pdp-chat-file\').click()" style="font-size:12px;padding:6px 10px" title="Dosya ekle">📎</button>'
      + '<button class="btn btnp" onclick="pdpSendChat()" style="font-size:14px;padding:6px 12px">➤</button>'
      + '</div></div>';

    var inp = g('pdp-chat-inp');
    if (inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pdpSendChat(); }
      });
    }
  }
  pdpRefreshChatMsgs();
}

function pdpRefreshChatMsgs() {
  var allMsgs = loadTaskChats()[_PDP_TASK_ID] || [];
  var searchQ = (g('pdp-chat-search')?.value || '').toLowerCase();
  var msgs = searchQ ? allMsgs.filter(m => (m.text||'').toLowerCase().includes(searchQ) || (m.name||'').toLowerCase().includes(searchQ)) : allMsgs;
  var users = loadUsers();
  var cont  = g('pdp-chat-msgs');
  if (!cont) return;
  var todayS  = new Date().toISOString().slice(0, 10);
  var lastDate = '';
  var frag    = document.createDocumentFragment();

  if (!msgs.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--t2);font-size:13px;padding:32px 16px;margin:auto';
    empty.innerHTML = '<div style="font-size:32px;margin-bottom:8px">💬</div><div>Henüz mesaj yok.</div>';
    frag.appendChild(empty);
  } else {
    for (var i = 0; i < msgs.length; i++) {
      var m   = msgs[i];
      var cu  = _getCU();
      var isMe = m.uid === (cu && cu.id);
      var u   = users.find(function(x){ return x.id === m.uid; }) || { name: m.name || '?' };
      var msgDate = (m.ts || '').slice(0, 10);

      if (msgDate && msgDate !== lastDate) {
        lastDate = msgDate;
        var sep = document.createElement('div');
        sep.style.cssText = 'text-align:center;font-size:10px;color:var(--t3);margin:4px 0;display:flex;align-items:center;gap:6px';
        sep.innerHTML = '<div style="flex:1;height:1px;background:var(--b)"></div>' + (msgDate === todayS ? 'Bugün' : msgDate) + '<div style="flex:1;height:1px;background:var(--b)"></div>';
        frag.appendChild(sep);
      }

      var idx2 = users.indexOf(u);
      var c2   = _getAVC()[Math.max(idx2, 0) % _getAVC().length];
      var row  = document.createElement('div');
      row.style.cssText = 'display:flex;flex-direction:' + (isMe ? 'row-reverse' : 'row') + ';align-items:flex-end;gap:6px';

      var avHtml = '<div style="width:24px;height:24px;border-radius:50%;background:' + c2[0] + ';color:' + c2[1] + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">' + _pusInitials(u.name) + '</div>';
      var nameHtml = !isMe ? '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">' + u.name + '</div>' : '';
      var fileHtml = m.file ? '<div style="margin-top:4px"><a href="' + m.file.data + '" download="' + m.file.name + '" style="font-size:11px;color:' + (isMe ? 'rgba(255,255,255,.85)' : 'var(--ac)') + ';display:inline-flex;align-items:center;gap:4px">📎 ' + m.file.name + '</a></div>' : '';

      // Arama highlight
      var displayText = m.text || '';
      if (searchQ && displayText) {
        var re = new RegExp('(' + searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        displayText = displayText.replace(re, '<mark style="background:#FBBF24;color:#000;padding:0 2px;border-radius:2px">$1</mark>');
      }

      row.innerHTML = avHtml
        + '<div style="max-width:74%">'
        + nameHtml
        + '<div style="background:' + (isMe ? 'var(--ac)' : 'var(--sf)') + ';color:' + (isMe ? '#fff' : 'var(--t)') + ';border:' + (isMe ? 'none' : '1px solid var(--b)') + ';border-radius:' + (isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';padding:7px 11px;font-size:13px;line-height:1.5;word-break:break-word">'
        + (displayText ? '<div>' + displayText + '</div>' : '')
        + fileHtml
        + '</div>'
        + '<div style="font-size:9px;color:var(--t3);margin-top:2px;' + (isMe ? 'text-align:right' : '') + '">' + (m.ts || '').slice(11, 16) + '</div>'
        + '</div>';

      frag.appendChild(row);
    }
  }

  cont.replaceChildren(frag);
  cont.scrollTop = cont.scrollHeight;

  // Tab badge güncelle
  var tabBtn = g('pdp-tab-chat');
  if (tabBtn) {
    var cnt = msgs.length;
    tabBtn.innerHTML = '💬 Mesajlar' + (cnt ? '<span style="background:var(--rd);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">' + cnt + '</span>' : '');
  }
}

function pdpSendChat() {
  if (!_PDP_TASK_ID) return;
  var text   = (g('pdp-chat-inp') ? g('pdp-chat-inp').value.trim() : '');
  var fileEl = g('pdp-chat-file');
  if (!text && !(fileEl && fileEl.files && fileEl.files.length)) {
    window.toast && window.toast('Mesaj yazın veya dosya seçin', 'err');
    return;
  }

  function doSend(fd) {
    var chats = loadTaskChats();
    if (!chats[_PDP_TASK_ID]) chats[_PDP_TASK_ID] = [];
    var cu  = _getCU();
    var msg = { id: generateNumericId(), uid: cu && cu.id, name: cu && cu.name, text: text, ts: nowTs() };
    if (fd) msg.file = fd;
    chats[_PDP_TASK_ID].push(msg);
    storeTaskChats(chats);
    if (g('pdp-chat-inp'))  g('pdp-chat-inp').value = '';
    if (fileEl)             fileEl.value = '';
    pdpRefreshChatMsgs();
    // S3: Görev sahibi + katılımcılara bildirim gönder
    var task = loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; });
    var cu2  = _getCU();
    if (task && cu2) {
      var _targets = new Set([task.uid].concat(task.participants || []).concat(task.viewers || []));
      _targets.delete(cu2.id);
      if (_targets.size > 0) {
        window.addNotif?.('💬', '"' + escapeHtml(task.title) + '" görevinde yeni mesaj — ' + escapeHtml(cu2.name || ''), 'info', 'pusula', null, task.id);
      }
    }
  }

  if (fileEl && fileEl.files && fileEl.files[0]) {
    var r = new FileReader();
    r.onload = function(ev) { doSend({ name: fileEl.files[0].name, data: ev.target.result }); };
    r.readAsDataURL(fileEl.files[0]);
  } else {
    doSend(null);
  }
}

// ── SEKME 3: Dosyalar ─────────────────────────────────────────────
function pdpRenderFiles() {
  var pane = g('pdp-pane-files');
  if (!pane || !_PDP_TASK_ID) return;
  var task    = loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  var files   = task.files || (task.file ? [task.file] : []);
  var managers= task.managers || [task.uid];
  var cu      = _getCU();
  var canEdit = window.isAdmin?.() || managers.indexOf(cu && cu.id) > -1 || task.uid === (cu && cu.id)
                || (task.participants || []).indexOf(cu && cu.id) > -1;

  function extIcon(name) {
    var ext = (name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf')                                return '📄';
    if (['jpg','jpeg','png','gif','webp'].indexOf(ext) > -1) return '🖼';
    if (['xlsx','xls','csv'].indexOf(ext) > -1)       return '📊';
    if (['docx','doc'].indexOf(ext) > -1)             return '📝';
    if (['zip','rar'].indexOf(ext) > -1)              return '🗜';
    return '📎';
  }
  function fmtSize(b) {
    if (!b) return '';
    return b > 1048576 ? (b/1048576).toFixed(1) + ' MB' : Math.round(b/1024) + ' KB';
  }

  var html = '<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">';

  if (!files.length) {
    html += '<div style="text-align:center;padding:28px 16px;color:var(--t3);font-size:13px"><div style="font-size:32px;margin-bottom:8px">📂</div>Henüz dosya eklenmemiş.</div>';
  } else {
    for (var fi = 0; fi < files.length; fi++) {
      var f = files[fi];
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--s2);border-radius:10px;border:1px solid var(--b)">'
        + '<span style="font-size:22px;flex-shrink:0">' + extIcon(f.name) + '</span>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t)">' + f.name + '</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + (f.size ? fmtSize(f.size) : '') + '</div></div>'
        + '<a href="' + f.data + '" download="' + f.name + '" class="btn btns" style="font-size:11px;padding:5px 10px;flex-shrink:0;text-decoration:none">⬇ İndir</a>'
        + (canEdit ? '<button onclick="pdpDelFile(' + fi + ')" class="btn btns" style="font-size:12px;padding:5px 8px;color:var(--rd);flex-shrink:0" title="Sil">✕</button>' : '')
        + '</div>';
    }
  }

  html += '</div>';

  if (canEdit) {
    html += '<div id="pdp-upload-zone" style="border:1.5px dashed var(--b);border-radius:8px;padding:18px;text-align:center;cursor:pointer;transition:border-color .2s"'
      + ' onclick="document.getElementById(\'pdp-upload-inp\').click()"'
      + ' onmouseover="this.style.borderColor=\'var(--ac)\'"'
      + ' onmouseout="this.style.borderColor=\'var(--b)\'"'
      + ' ondragover="event.preventDefault();this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'"'
      + ' ondragleave="this.style.borderColor=\'var(--b)\';this.style.background=\'\'"'
      + ' ondrop="pdpHandleDrop(event)">'
      + '<div style="font-size:28px;margin-bottom:6px">📤</div>'
      + '<div style="font-size:13px;font-weight:500;color:var(--t2)">Dosya yükle veya sürükle bırak</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-top:3px">PDF, resim, Word, Excel — birden fazla seçilebilir</div>'
      + '<input type="file" id="pdp-upload-inp" multiple accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv,.zip" style="display:none" onchange="pdpUploadFiles(this)">'
      + '</div>';
  }

  pane.innerHTML = html;
}

function pdpHandleDrop(e) {
  e.preventDefault();
  var zone = g('pdp-upload-zone');
  if (zone) { zone.style.borderColor = 'var(--b)'; zone.style.background = ''; }
  var inp = g('pdp-upload-inp');
  if (!inp) return;
  var dt = new DataTransfer();
  var dfiles = e.dataTransfer.files;
  for (var i = 0; i < dfiles.length; i++) dt.items.add(dfiles[i]);
  inp.files = dt.files;
  pdpUploadFiles(inp);
}

function pdpUploadFiles(input) {
  if (!_PDP_TASK_ID) return;
  var selected = Array.from(input.files || []);
  if (!selected.length) return;
  var d    = loadTasks();
  var task = d.find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  if (!task.files) task.files = task.file ? [task.file] : [];

  var done2 = 0;
  selected.forEach(function(file) {
    if (file.size > 10 * 1024 * 1024) {
      window.toast && window.toast(file.name + ' çok büyük (maks 10 MB)', 'err');
      done2++;
      if (done2 === selected.length) { saveTasks(d); pdpRenderFiles(); pdpUpdateFileBadge(); }
      return;
    }
    var r = new FileReader();
    r.onload = function(ev) {
      task.files.push({ name: file.name, data: ev.target.result, size: file.size, type: file.type, ts: nowTs() });
      task.file = task.files[0];
      done2++;
      if (done2 === selected.length) {
        saveTasks(d);
        pdpRenderFiles();
        pdpUpdateFileBadge();
        window.toast && window.toast(done2 + ' dosya yüklendi ✓', 'ok');
        logActivity('task', '"' + task.title + '" görevine ' + done2 + ' dosya eklendi');
      }
    };
    r.readAsDataURL(file);
  });
  input.value = '';
}

function pdpUpdateFileBadge() {
  var task = _PDP_TASK_ID ? loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; }) : null;
  var btn  = g('pdp-tab-files');
  if (!btn || !task) return;
  var cnt = (task.files || []).length;
  btn.innerHTML = '📎 Dosyalar' + (cnt ? '<span style="background:var(--ac);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">' + cnt + '</span>' : '');
}

function pdpDelFile(idx) {
  if (!_PDP_TASK_ID) return;
  var d    = loadTasks();
  var task = d.find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  if (!task.files) task.files = task.file ? [task.file] : [];
  task.files.splice(idx, 1);
  task.file = task.files[0] || null;
  saveTasks(d);
  pdpRenderFiles();
  pdpUpdateFileBadge();
  window.toast && window.toast('Dosya silindi', 'ok');
}

// ── SEKME 4: İzinler ─────────────────────────────────────────────
function pdpRenderPerms() {
  var pane = g('pdp-pane-perms');
  if (!pane || !_PDP_TASK_ID) return;
  var task     = loadTasks().find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  var users    = loadUsers();
  var managers = task.managers || [task.uid];
  var cu       = _getCU();
  var canEdit  = window.isAdmin?.() || managers.indexOf(cu && cu.id) > -1;

  function getRole(uid) {
    if (managers.indexOf(uid) > -1)                        return 'Yönetici';
    if ((task.participants || []).indexOf(uid) > -1)        return 'Düzenleyebilir';
    return 'Görüntüleyebilir';
  }
  function roleColor(r) {
    return r === 'Yönetici' ? '#007AFF' : r === 'Düzenleyebilir' ? 'var(--ac)' : '#8B5CF6';
  }

  var seen = {};
  var allPeople = [];
  var lists = [managers, task.participants || [], task.viewers || []];
  for (var li = 0; li < lists.length; li++) {
    for (var lj = 0; lj < lists[li].length; lj++) {
      if (!seen[lists[li][lj]]) { seen[lists[li][lj]] = true; allPeople.push(lists[li][lj]); }
    }
  }

  var html = '<div style="font-size:12px;color:var(--t2);margin-bottom:12px;line-height:1.5">Bu görevde kimin hangi yetkiye sahip olduğunu buradan yönetin.</div>';
  html += '<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:16px">';

  for (var ai = 0; ai < allPeople.length; ai++) {
    var uid    = allPeople[ai];
    var u2     = users.find(function(x){ return x.id === uid; }) || { name: '?' };
    var role   = getRole(uid);
    var isOwner = uid === task.uid;
    var avH    = _pusAv(uid, users, 26);

    html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--s2);border-radius:10px">'
      + avH
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--t);display:flex;align-items:center;gap:5px">' + u2.name + (isOwner ? '<span style="font-size:9px;background:rgba(0,122,255,.12);color:#007AFF;padding:1px 6px;border-radius:4px;font-weight:700">Sorumlu</span>' : '') + '</div><div style="font-size:10px;color:var(--t3)">' + (u2.role || '—') + '</div></div>';

    if (canEdit && !isOwner) {
      html += '<select class="fi" style="width:150px;padding:5px 8px;font-size:12px" onchange="pdpUpdatePerm(' + uid + ',this.value)">'
        + '<option' + (role === 'Yönetici' ? ' selected' : '') + '>Yönetici</option>'
        + '<option' + (role === 'Düzenleyebilir' ? ' selected' : '') + '>Düzenleyebilir</option>'
        + '<option' + (role === 'Görüntüleyebilir' ? ' selected' : '') + '>Görüntüleyebilir</option>'
        + '</select>';
    } else {
      html += '<span style="font-size:11px;font-weight:600;color:' + roleColor(role) + ';white-space:nowrap">' + role + '</span>';
    }
    html += '</div>';
  }

  html += '</div>';

  if (canEdit) {
    var remaining = users.filter(function(u3) { return !seen[u3.id]; });
    html += '<div style="border-top:1px solid var(--b);padding-top:14px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px">KULLANICI EKLE</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + '<select class="fi" id="pdp-perm-user" style="flex:1;min-width:130px;padding:7px 10px;font-size:13px">'
      + '<option value="">Kullanıcı seç...</option>'
      + remaining.map(function(u4){ return '<option value="' + u4.id + '">' + u4.name + '</option>'; }).join('')
      + '</select>'
      + '<select class="fi" id="pdp-perm-role" style="width:152px;padding:7px 10px;font-size:13px">'
      + '<option>Görüntüleyebilir</option><option>Düzenleyebilir</option><option>Yönetici</option>'
      + '</select>'
      + '<button class="btn btnp" onclick="pdpAddPerm()" style="white-space:nowrap;padding:7px 14px">+ Ekle</button>'
      + '</div></div>';
  }

  pane.innerHTML = html;
}

function pdpUpdatePerm(uid, newRole) {
  if (!_PDP_TASK_ID) return;
  var d    = loadTasks();
  var task = d.find(function(t){ return t.id === _PDP_TASK_ID; });
  if (!task) return;
  task.managers     = (task.managers    || [task.uid]).filter(function(x){ return x !== uid; });
  task.participants = (task.participants || []).filter(function(x){ return x !== uid; });
  task.viewers      = (task.viewers     || []).filter(function(x){ return x !== uid; });
  if (newRole === 'Yönetici')            task.managers.push(uid);
  else if (newRole === 'Düzenleyebilir') task.participants.push(uid);
  else                                   task.viewers.push(uid);
  if (task.managers.indexOf(task.uid) === -1) task.managers.unshift(task.uid);
  saveTasks(d);
  window.toast && window.toast('Yetki güncellendi ✓', 'ok');
  pdpRenderPerms();
}

function pdpAddPerm() {
  var uid  = parseInt((g('pdp-perm-user') || {}).value || '0');
  var role = (g('pdp-perm-role') || {}).value || 'Görüntüleyebilir';
  if (!uid) { window.toast && window.toast('Kullanıcı seçin', 'err'); return; }
  pdpUpdatePerm(uid, role);
}

function closePusDetail() {
  var p = g('pus-detail-panel');
  if (p) { p.classList.remove('open'); setTimeout(function(){ p.style.display = 'none'; }, 200); }
  PUS_DETAIL_ID = null;
  _PDP_TASK_ID  = null;
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — CRUD
// ════════════════════════════════════════════════════════════════

/** Modal öncelik çubuğunu günceller */
function updateTkPriBar() {
  const pri    = g('tk-pri')?.value || '2';
  const colors = { 1: '#FF3B30', 2: '#FF9500', 3: '#007AFF', 4: '#C7C7CC' };
  const bar    = g('tk-pri-bar');
  if (bar) bar.style.background = colors[pri] || colors[2];
}

/** Hızlı durum/öncelik güncelleme */
function quickUpdateTask(id, field, val) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  if (!_canEditTask(t)) { window.toast?.('Bu görevi güncelleme yetkiniz yok', 'err'); return; }
  // FIX 7D: Gecikmiş görev durum değişikliğinde sebep zorunlu
  var todayS = new Date().toISOString().slice(0, 10);
  if (field === 'status' && t.due && t.due < todayS && !t.done && val !== 'done' && !t.gecikmeSebebi) {
    var sebep = prompt('Bu görev gecikmiş. Lütfen gecikme sebebini girin:');
    if (!sebep || !sebep.trim()) { window.toast?.('Gecikme sebebi zorunlu', 'err'); return; }
    t.gecikmeSebebi = sebep.trim();
    t.gecikmeTs = new Date().toISOString();
  }
  t[field] = val;
  if (field === 'status') {
    t.done = val === 'done';
    if (val === 'done') t.completedAt = new Date().toISOString();
  }
  saveTasks(d);
  renderPusula();
  window.toast?.(field === 'status' ? 'Durum güncellendi' : 'Öncelik güncellendi', 'ok');
}

/** Yeni görev modalını açar */
function _populateDeptSelect() {
  const sel = g('tk-dept'); if (!sel) return;
  const current = sel.value;
  let depts = [];
  try { const saved = JSON.parse(localStorage.getItem('ak_departments')||'[]'); if (saved.length) depts = saved; } catch(e) {}
  if (!depts.length) depts = ['Finans','Lojistik','IK','IT','Satis','Operasyon','Diger'];
  try { const tasks = loadTasks(); tasks.forEach(t => { if (t.department && !depts.includes(t.department)) depts.push(t.department); }); } catch(e) {}
  sel.innerHTML = '<option value="">— Seciniz —</option>' + depts.map(d => '<option value="'+escapeHtml(d)+'">'+escapeHtml(d)+'</option>').join('');
  if (current) sel.value = current;
}

function openAddTask() {
  populatePusUsers();
  _populateDeptSelect();
  ['tk-title','tk-tags','tk-link'].forEach(id => { const el = g(id); if (el) el.value = ''; });
  const _descRich = g('tk-desc-rich'); if (_descRich) _descRich.innerHTML = '';
  if (g('tk-desc')) g('tk-desc').value = '';
  if (g('tk-pri'))    g('tk-pri').value    = '2';
  if (g('tk-due'))    g('tk-due').value    = '';
  if (g('tk-start'))  g('tk-start').value  = '';
  if (g('tk-status')) g('tk-status').value = 'todo';
  if (g('tk-eid'))    g('tk-eid').value    = '';
  if (g('tk-file'))   g('tk-file').value   = '';
  if (g('tk-fp'))     g('tk-fp').textContent = '';
  const s = g('tk-user');
  if (s) {
    if (!window.isAdmin?.()) {
      s.innerHTML = `<option value="${_getCU()?.id}">${escapeHtml(_getCU()?.name || 'Ben')}</option>`;
      s.value = String(_getCU()?.id);
    } else {
      const uid = parseInt(g('pus-usel')?.value || '0');
      if (uid > 0) s.value = String(uid);
    }
  }
  // Job ID alanı temizle
  var jobIdEl = g('tk-jobid-display');
  if (jobIdEl) jobIdEl.textContent = 'Otomatik atanacak';
  st('mo-tk-t', '➕ Görev Ekle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(null), 50);
}

/** Mevcut görevi düzenleme modalında açar */
function editTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  const _editCu = _getCU();
  // createdBy yoksa (eski görevler) → uid sahibi düzenleyebilir
  if (!window.isAdmin?.() && t.createdBy && t.createdBy !== _editCu?.id && t.uid === _editCu?.id) {
    window.toast?.('Atanan gorevler duzenlenemez — sadece olusturan duzenleyebilir', 'err'); return;
  }
  if (!_canEditTask(t)) { window.toast?.('Bu gorevi duzenleme yetkiniz yok', 'err'); return; }
  populatePusUsers();
  _populateDeptSelect();
  if (g('tk-title'))  g('tk-title').value  = t.title;
  const _editRich = g('tk-desc-rich');
  if (_editRich) _editRich.innerHTML = t.desc || '';
  if (g('tk-desc')) g('tk-desc').value = t.desc || '';
  if (g('tk-pri'))    g('tk-pri').value    = t.pri || 2;
  if (g('tk-due'))    g('tk-due').value    = t.due || '';
  if (g('tk-start'))  g('tk-start').value  = t.start || '';
  if (g('tk-status')) g('tk-status').value = t.status || (t.done ? 'done' : 'todo');
  if (g('tk-eid'))    g('tk-eid').value    = t.id;
  if (g('tk-tags'))     g('tk-tags').value     = (t.tags || []).join(', ');
  if (g('tk-link'))     g('tk-link').value     = t.link || '';
  if (g('tk-duration')) g('tk-duration').value = t.duration || '';
  if (g('tk-fp') && t.file) g('tk-fp').textContent = '📎 ' + t.file.name + ' (kayıtlı)';
  const sel = g('tk-user');
  if (sel) sel.value = t.uid;
  // Job ID göster
  var jobIdEl2 = g('tk-jobid-display');
  if (jobIdEl2) jobIdEl2.textContent = t.jobId || '—';
  st('mo-tk-t', '✏️ Görevi Düzenle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(t), 50);
}

/** Görevi kaydeder (yeni veya güncelleme) */
function saveTask() {
  const title = (g('tk-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const uid = parseInt(g('tk-user')?.value || '0') || parseInt(_getCU()?.id || '0');
  if (!window.isAdmin?.() && uid !== parseInt(_getCU()?.id || '0')) { window.toast?.('Yetki yok', 'err'); return; }
  if (!uid) { window.toast?.('Kullanıcı belirlenemedi — tekrar giriş yapın', 'err'); return; }

  const d    = loadTasks();
  const eid  = parseInt(g('tk-eid')?.value || '0');
  const participants = [];
  const viewers      = [];
  document.querySelectorAll('[id^="tk-part-"]:checked').forEach(cb => participants.push(parseInt(cb.value)));
  document.querySelectorAll('[id^="tk-view-"]:checked').forEach(cb => viewers.push(parseInt(cb.value)));

  // Katılımcı onay mekanizması — user yeni katılımcı eklerse onaya düşer
  // Admin ayarla devre dışı bırakabilir: window._pusParticipantApprovalOff
  if (!window.isAdmin?.() && eid && !window._pusParticipantApprovalOff) {
    const oldTask = d.find(x => x.id === eid);
    if (oldTask) {
      const oldParts = new Set([...(oldTask.participants || []), ...(oldTask.viewers || [])]);
      const newParts = [...participants, ...viewers].filter(id => !oldParts.has(id));
      if (newParts.length > 0) {
        const pending = oldTask.pendingParticipants || [];
        newParts.forEach(pid => { if (!pending.find(p => p.uid === pid)) pending.push({ uid: pid, requestedBy: _getCU()?.id, requestedAt: nowTs() }); });
        oldTask.pendingParticipants = pending;
        // Yeni eklenenler onaya düştü — eski listeyi koru
        participants.length = 0; viewers.length = 0;
        (oldTask.participants || []).forEach(p => participants.push(p));
        (oldTask.viewers || []).forEach(v => viewers.push(v));
        saveTasks(d);
        window.addNotif?.('👥', `"${oldTask.title}" görevine katılımcı ekleme onay bekliyor`, 'warn', 'pusula', null, oldTask.id);
        window.toast?.('Katılımcı ekleme talebi yöneticiye gönderildi', 'ok');
      }
    }
  }

  const dueDate = g('tk-due')?.value || null;
  const dueTime = g('tk-due-time')?.value || '';
  const fields = {
    title,
    desc:       g('tk-desc-rich')?.innerHTML?.trim() || g('tk-desc')?.value || '',
    pri:        parseInt(g('tk-pri')?.value  || '2'),
    due:        dueDate,
    due_time:   dueTime,
    deadline_full: dueDate ? (dueDate + (dueTime ? ' ' + dueTime : ' 23:59')) : null,
    start:      g('tk-start')?.value  || null,
    status:     g('tk-status')?.value || 'todo',
    department: g('tk-dept')?.value   || '',
    cost:       parseFloat(g('tk-cost')?.value || '0') || null,
    tags:       (g('tk-tags')?.value  || '').split(',').map(t => t.trim()).filter(Boolean),
    link:       g('tk-link')?.value     || '',
    duration:   parseInt(g('tk-duration')?.value || '0') || null,
    uid,
    done:       g('tk-status')?.value === 'done',
    participants,
    viewers,
    created_at: nowTs(),
  };

  const doSave = fileData => {
    if (fileData) fields.file = fileData;
    else if (eid) { const old = d.find(x => x.id === eid); if (old?.file) fields.file = old.file; }
    if (eid) {
      const t = d.find(x => x.id === eid);
      if (t) {
        const _oldUid = t.uid;
        Object.assign(t, fields);
        if (_oldUid !== fields.uid) {
          try {
            const _cu3 = _getCU();
            const _n2  = (typeof loadNotifs==='function' ? loadNotifs() : (window.loadNotifs?.() || []));
            _n2.unshift({ id:generateNumericId(), icon:'📋',
              msg:'"'+title+'" görevi size atandı — '+(_cu3?.name||''),
              type:'info', link:'pusula', ts:nowTs(), read:false,
              targetUid:fields.uid, taskId:eid, taskTitle:title,
              priority:fields.pri, due:fields.due, assigner:_cu3?.name||'',
              needsAck:true, acked:false });
            if (typeof storeNotifs==='function') storeNotifs(_n2);
            else window.storeNotifs?.(_n2);
            window.updateNotifBadge?.();
            if (window._showInstantTaskNotif) window._showInstantTaskNotif(fields.uid, eid, title, fields.pri, fields.due, _cu3?.name || '');
          } catch(e) { console.error('[Pusula] Güncelleme bildirim hatası:', e); }
        }
      }
      logActivity('task', `"${title}" güncelledi`);
      window.toast?.('Güncellendi ✓', 'ok');
    } else {
      const _nid = generateNumericId();
      // Şablon alt görevleri varsa uygula
      const _initSubs = (window._pendingSubTasks && window._pendingSubTasks.length)
        ? window._pendingSubTasks.map((s, i) => ({ ...s, id: _nid + i + 1 }))
        : [];
      window._pendingSubTasks = null; // temizle
      // Otomatik Job ID üretimi
      var _yr = new Date().getFullYear();
      var _jobSeq = String(d.filter(function(t) { return t.jobId && t.jobId.indexOf('JOB-' + _yr) === 0; }).length + 1).padStart(4, '0');
      fields.jobId = 'JOB-' + _yr + '-' + _jobSeq;
      d.push({ id: _nid, subTasks: _initSubs, ...fields });
      logActivity('task', `"${title}" ekledi`);
      window.toast?.('Görev eklendi ✓', 'ok');
      try {
        const _cu2 = _getCU();
        if (uid && _cu2 && uid !== _cu2.id) {
          const _n = (typeof loadNotifs==='function' ? loadNotifs() : (window.loadNotifs?.() || []));
          const _assignee = loadUsers().find(u => u.id === uid);
          _n.unshift({ id: _nid+1, icon:'📋',
            msg: '"'+title+'" görevi size atandı — '+(_cu2.name||''),
            type:'info', link:'pusula', ts: nowTs(), read:false,
            targetUid:uid, taskId:_nid, taskTitle:title,
            priority:fields.pri, due:fields.due, assigner:_cu2.name||'',
            needsAck:true, acked:false });
          if (typeof storeNotifs==='function') storeNotifs(_n);
          else window.storeNotifs?.(_n);
          window.updateNotifBadge?.();
          console.log('[Pusula] Bildirim →', _assignee?.name);
          // Kullanıcı şu an açıksa anlık popup göster
          if (window._showInstantTaskNotif) window._showInstantTaskNotif(uid, _nid, title, fields.pri, fields.due, _cu2?.name || '');
        }
      } catch(e) { console.error('[Pusula] Bildirim hatası:', e); }
    }
    saveTasks(d);
    window.closeMo?.('mo-task');
    renderPusula();
    updatePusBadge();
  };

  const fi = g('tk-file');
  if (fi?.files?.[0]) {
    const r = new FileReader();
    r.onload = ev => doSave({ name: fi.files[0].name, data: ev.target.result });
    r.readAsDataURL(fi.files[0]);
  } else {
    doSave(null);
  }
}

/** Görevi tamamlandı / yeniden aç */
function toggleTask(id, done) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  if (!_canEditTask(t)) { window.toast?.('Bu görevin durumunu değiştirme yetkiniz yok', 'err'); return; }
  t.done   = done;
  if (done) {
    t.status = 'done';
    t.completedAt = new Date().toISOString();
    // FIX 7B: Tekrarlayan görev — tamamlanınca yeni oluştur
    if (t.repeat && t.repeat !== 'none') {
      var newDue = null;
      if (t.due) {
        var base = new Date(t.due);
        if (t.repeat === 'daily') base.setDate(base.getDate() + 1);
        else if (t.repeat === 'weekly') base.setDate(base.getDate() + 7);
        else if (t.repeat === 'monthly') base.setMonth(base.getMonth() + 1);
        newDue = base.toISOString().slice(0, 10);
      }
      var newId = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
      d.push({ id: newId, title: t.title, desc: t.desc, pri: t.pri, due: newDue, uid: t.uid, status: 'todo', done: false, department: t.department, repeat: t.repeat, jobId: t.jobId, created_at: new Date().toISOString(), createdBy: t.createdBy, subTasks: [], source: 'repeat' });
      window.toast?.('Tekrarlayan görev oluşturuldu: ' + (newDue || '') + ' ✓', 'info');
    }
  }
  else if (t.status === 'done') t.status = 'todo';
  saveTasks(d);
  renderPusula();
  updatePusBadge();
  logActivity('task', `"${t.title}" görevini ${done ? 'tamamladı' : 'yeniden açtı'}`);
  window.toast?.(done ? '✓ Tamamlandı' : 'Yeniden açıldı', 'ok');
  // S2: Görev sahibi/atayan farklıysa bildirim gönder
  const _cuToggle = _getCU();
  if (t.uid && _cuToggle && t.uid !== _cuToggle.id) {
    window.addNotif?.( done ? '✅' : '🔄',
      `"${t.title}" görevi ${done ? 'tamamlandı' : 'yeniden açıldı'} — ${_cuToggle.name || ''}`,
      'info', 'pusula', null, t.id);
  }
}

/** Görevi siler — sadece oluşturan silebilir */
function delTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id); if (!t) return;
  const cu = _getCU();
  const cuId = cu?.id;
  const isOwner = t.createdBy ? t.createdBy === cuId : t.uid === cuId;
  // Admin her şeyi silebilir, user sadece kendi oluşturduğunu
  if (!isOwner && !window.isAdmin?.()) {
    window.toast?.('Bu görevi silme yetkiniz yok — sadece oluşturan veya admin silebilir', 'err');
    return;
  }
  window.confirmModal('"' + (t.title||'Görev') + '" silinsin mi?', {
    title: 'Görev Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: () => {
      // Çöp kutusuna ekle
      if (typeof addToTrash === 'function') addToTrash(t, 'Görev', 'tasks');
      // Soft delete — K06 Anayasa kuralı
      t.isDeleted = true;
      t.deletedAt = nowTs();
      t.deletedBy = cuId;
      saveTasks(d);
      renderPusula();
      window.logActivity?.('task', '"' + t.title + '" görevini sildi (soft)');
      window.toast?.('Silindi — geri alınabilir', 'ok');
    }
  });
}

/** Katılımcı / İzleyici listelerini doldurur (mutex) */
function populateTaskParticipants(task) {
  const users     = loadUsers().filter(u => u.status === 'active');
  const ownerUid  = parseInt(g('tk-user')?.value || '0') || task?.uid || 0;
  const others    = users.filter(u => u.id !== ownerUid);
  const existingP = task?.participants || [];
  const existingV = task?.viewers      || [];
  const existingM = (task?.managers    || []).filter(id => id !== ownerUid); // sorumlu hariç

  // ── Yöneticiler (sorumlu hariç, o zaten yönetici) ────────────
  const mgrEl = g('tk-managers-list');
  if (mgrEl) {
    if (!others.length) {
      mgrEl.innerHTML = '<div style="font-size:11px;color:var(--t3);padding:4px">Başka kullanıcı yok.</div>';
    } else {
      mgrEl.innerHTML = others.map(u =>
        '<label style="display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1px solid var(--b)">'
        + '<input type="checkbox" id="tk-mgr-' + u.id + '" value="' + u.id + '" ' + (existingM.includes(u.id) ? 'checked' : '') + ' style="accent-color:#007AFF">'
        + '<span style="font-weight:500">' + u.name + '</span>'
        + '<span style="font-size:10px;color:var(--t3);margin-left:auto">' + u.role + '</span>'
        + '</label>'
      ).join('');
    }
  }

  // ── Katılımcılar ──────────────────────────────────────────────
  const partEl = g('tk-participants-list');
  const viewEl = g('tk-viewers-list');
  if (!partEl || !viewEl) return;

  partEl.innerHTML = others.map(u =>
    '<label style="display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1px solid var(--b)">'
    + '<input type="checkbox" id="tk-part-' + u.id + '" value="' + u.id + '" ' + (existingP.includes(u.id) ? 'checked' : '') + ' style="accent-color:var(--ac)">'
    + '<span style="font-weight:500">' + u.name + '</span>'
    + '<span style="font-size:10px;color:var(--t3);margin-left:auto">' + u.role + '</span>'
    + '</label>'
  ).join('');

  viewEl.innerHTML = others.map(u =>
    '<label style="display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1px solid var(--b)">'
    + '<input type="checkbox" id="tk-view-' + u.id + '" value="' + u.id + '" ' + (existingV.includes(u.id) ? 'checked' : '') + ' style="accent-color:#8B5CF6">'
    + '<span style="font-weight:500">' + u.name + '</span>'
    + '<span style="font-size:10px;color:var(--t3);margin-left:auto">' + u.role + '</span>'
    + '</label>'
  ).join('');

  // Mutex: katılımcı ↔ izleyici birbirini dışlar
  others.forEach(u => {
    const pCb = g('tk-part-' + u.id);
    const vCb = g('tk-view-' + u.id);
    const mCb = g('tk-mgr-'  + u.id);
    if (pCb && vCb) {
      pCb.onchange = () => { if (pCb.checked && vCb.checked) vCb.checked = false; };
      vCb.onchange = () => { if (vCb.checked && pCb.checked) pCb.checked = false; };
    }
    // Yönetici seçilince diğer kutular temizlenmez — birisi hem yönetici hem katılımcı olabilir
  });
}

/** Filtreleri sıfırlar */
function clearPusFilters() {
  ['pf-status','pf-pri','pf-sort','pf-search','pf-dfrom','pf-dto'].forEach(id => {
    const el = g(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  renderPusula();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — GÖRÜNÜM KONTROL
// ════════════════════════════════════════════════════════════════

function setPusView(v, btn) {
  PUS_VIEW = v;
  localStorage.setItem('ak_pus_view', v);
  document.querySelectorAll('.pvt-btn,.cvb').forEach(b => b.classList.remove('on', 'active'));
  if (btn) { btn.classList.add('on', 'active'); }
  else { const b = g('pus-v-' + v); if (b) b.classList.add('on', 'active'); }
  renderPusula();
}

function setPusQuickFilter(f, btn) {
  PUS_QUICK_FILTER = f;
  document.querySelectorAll('.pus-stat-pill,.psb-tab,.pus-stat-chip').forEach(b => b.classList.remove('active'));
  if (btn) { btn.classList.add('active'); }
  else {
    const idMap = { all:'psf-all', todo:'psf-todo', inprogress:'psf-ip', review:'psf-rv', done:'psf-done', overdue:'psf-ov' };
    const el    = g(idMap[f]);
    if (el) el.classList.add('active');
  }
  renderPusula();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — ALT GÖREVLER
// ════════════════════════════════════════════════════════════════

/** Alt görev ekleme modalını açar */
function addSubTask(parentId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const users  = loadUsers();

  const existing = g('mo-subadd');
  if (existing) existing.remove();

  const mo        = document.createElement('div');
  mo.className    = 'mo';
  mo.id           = 'mo-subadd';
  

  const userOpts = users.map(u =>
    `<option value="${u.id}"${u.id === _getCU()?.id ? ' selected' : ''}>${u.name}</option>`
  ).join('');

  mo.innerHTML = `<div class="modal" style="max-width:440px">
    <div class="mt">➕ Alt Görev Ekle</div>
    <div class="fr"><div class="fl">BAŞLIK <span style="color:var(--rd)">*</span></div>
      <input class="fi" id="subadd-title" placeholder="Alt görev ne?">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">ÖNCELİK</div>
        <select class="fi" id="subadd-pri">
          <option value="1">🔴 Kritik</option>
          <option value="2" selected>🟠 Önemli</option>
          <option value="3">🔵 Normal</option>
          <option value="4">⚪ Düşük</option>
        </select>
      </div>
      <div class="fr"><div class="fl">PERSONEL</div>
        <select class="fi" id="subadd-user">${userOpts}</select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">BAŞLANGIÇ</div><input type="date" class="fi" id="subadd-start"></div>
      <div class="fr"><div class="fl">BİTİŞ TARİHİ</div><input type="date" class="fi" id="subadd-due"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">⏰ SAAT</div><input type="time" class="fi" id="subadd-time" placeholder="09:00"></div>
      <div class="fr"><div class="fl">🔔 ALARM</div>
        <select class="fi" id="subadd-alarm">
          <option value="">Alarm yok</option>
          <option value="5">5 dakika önce</option>
          <option value="15">15 dakika önce</option>
          <option value="30">30 dakika önce</option>
          <option value="60">1 saat önce</option>
          <option value="1440">1 gün önce</option>
        </select>
      </div>
    </div>
    <div class="fr" style="margin-top:2px">
      <div class="fl">🏷 DEPARTMAN</div>
      <input class="fi" id="subadd-dept" placeholder="Departman yazın veya seçin..." list="subadd-dept-list">
      <datalist id="subadd-dept-list">
        ${[...new Set(loadTasks().map(t=>t.department).filter(Boolean))].sort().map(d=>`<option value="${d}">`).join('')}
      </datalist>
    </div>
    <div class="fr" style="margin-top:2px">
      <div class="fl">🚢 KONTEYNER</div>
      <select class="fi" id="subadd-konteyn">
        <option value="">— Konteyner seçin —</option>
        ${(typeof loadKonteyn === 'function' ? loadKonteyn().filter(k => !k.closed) : []).map(k => `<option value="${k.id}">${k.no || '?'} — ${k.hat || ''}</option>`).join('')}
      </select>
    </div>
    <div class="fr" style="margin-top:2px">
      <div class="fl">📎 DOKÜMAN</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="file" id="subadd-file" style="flex:1;font-size:12px" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip">
        <span id="subadd-file-name" style="font-size:11px;color:var(--t3)"></span>
      </div>
      <input class="fi" id="subadd-link" placeholder="veya doküman linki yapıştır..." style="margin-top:6px">
    </div>
    <div class="mf">
      <button class="btn" onclick="document.getElementById('mo-subadd').remove()">İptal</button>
      <button class="btn btnp" onclick="_saveSubTask(${parentId})">Ekle</button>
    </div>
  </div>`;

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); g('subadd-title')?.focus(); }, 10);
}

/** addSubTask modalındaki kaydet butonu tarafından çağrılır */
function _saveSubTask(parentId) {
  const title = (g('subadd-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }

  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  if (!parent.subTasks) parent.subTasks = [];

  const link    = (g('subadd-link')?.value || '').trim();
  const fileEl  = g('subadd-file');

  const doSave = (fileData) => {
    const sub = {
      id:         generateNumericId(),
      title,
      uid:        parseInt(g('subadd-user')?.value) || _getCU()?.id,
      pri:        parseInt(g('subadd-pri')?.value)  || 2,
      department: g('subadd-dept')?.value  || '',
      start:      g('subadd-start')?.value || null,
      due:        g('subadd-due')?.value   || null,
      time:       g('subadd-time')?.value  || null,
      alarm:      g('subadd-alarm')?.value || null,
      doc:        fileData || null,
      docLink:    link || null,
      konteynId:  parseInt(g('subadd-konteyn')?.value || '0') || null,
      done:       false,
      createdAt:  nowTs(),
    };

    // Atanan kişi farklıysa bildirim gönder (delege)
    if (sub.uid && sub.uid !== _getCU()?.id) {
      window.addNotif?.('📋', '"' + parent.title + '" alt görev atandı: ' + title, 'info', 'pusula', sub.uid, parent.id);
    }

    parent.subTasks.push(sub);
    saveTasks(d);

    // Alarm bildirim kaydı — due + alarm varsa zamanlayıcıya ekle
    if (sub.due && sub.alarm) {
      _scheduleSubTaskAlarm(parent, sub);
    }

    g('mo-subadd')?.remove();
    renderPusula();
    window.toast?.('Alt görev eklendi ✓', 'ok');
  };

  // Dosya varsa oku, yoksa direkt kaydet
  if (fileEl?.files?.[0]) {
    const reader = new FileReader();
    reader.onload = ev => doSave({ name: fileEl.files[0].name, data: ev.target.result });
    reader.readAsDataURL(fileEl.files[0]);
  } else {
    doSave(null);
  }
}

/**
 * Alt görev alarmını zamanlayıcıya ekler.
 * due + time + alarm (dakika) hesaplanarak setTimeout ile bildirim planlar.
 * Sayfa kapanırsa alarm kaybolur — checkSubTaskAlarms() ile yeniden kurulur.
 */
function _scheduleSubTaskAlarm(parent, sub) {
  if (!sub.due || !sub.alarm) return;
  const alarmMin  = parseInt(sub.alarm) || 0;
  if (!alarmMin) return;
  const dueStr    = sub.due + (sub.time ? 'T' + sub.time : 'T09:00');
  const dueMs     = new Date(dueStr).getTime();
  const alarmMs   = dueMs - alarmMin * 60000;
  const delay     = alarmMs - Date.now();
  if (delay <= 0) return; // geçmiş — bildirim gerekmiyor
  if (delay > 86400000 * 7) return; // 7 günden fazla — sayfa açık kalmaz

  setTimeout(() => {
    const cu = _getCU();
    // Alarm hâlâ geçerli mi kontrol et (silinmiş/tamamlanmış olabilir)
    const tasks  = loadTasks();
    const pTask  = tasks.find(t => t.id === parent.id);
    const subNow = pTask?.subTasks?.find(s => s.id === sub.id);
    if (!subNow || subNow.done) return;
    window.addNotif?.('🔔', `"${escapeHtml(subNow.title)}" — ${alarmMin < 60 ? alarmMin + ' dk' : Math.floor(alarmMin/60) + ' saat'} sonra bitiş`, 'warn', 'pusula');
    window.toast?.(`🔔 "${subNow.title}" hatırlatıcısı`, 'warn');
  }, delay);
}

/**
 * Sayfa yüklendiğinde mevcut alt görev alarmlarını tarar ve kurar.
 * startRealtimeSync sonrasında veya init'te çağrılmalı.
 */
function checkSubTaskAlarms() {
  const tasks = loadTasks();
  tasks.forEach(parent => {
    (parent.subTasks || []).forEach(sub => {
      if (!sub.done && sub.due && sub.alarm) {
        _scheduleSubTaskAlarm(parent, sub);
      }
    });
  });
}

/** Alt görevi tamamlandı olarak işaretler */
function toggleSubTask(parentId, subId, done) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const sub = (parent.subTasks || []).find(s => s.id === subId);
  if (sub) sub.done = done;
  saveTasks(d);
  renderPusula();
}

/** Alt görevi siler — sadece görev sahibi/admin */
function delSubTask(parentId, subId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  if (!_canEditTask(parent)) { window.toast?.('Alt görev silme yetkiniz yok', 'err'); return; }
  parent.subTasks = (parent.subTasks || []).filter(s => s.id !== subId);
  saveTasks(d);
  renderPusula();
}

/** Alt görevi düzenleme modalını açar */
function openSubTaskEdit(parentId, subId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const sub = (parent.subTasks || []).find(s => s.id === subId);
  if (!sub) return;
  const users    = loadUsers();
  const userOpts = users.map(u =>
    `<option value="${u.id}"${u.id === sub.uid ? ' selected' : ''}>${u.name}</option>`
  ).join('');
  const priOpts = [
    { v:1, l:'🔴 Kritik' }, { v:2, l:'🟠 Önemli' }, { v:3, l:'🔵 Normal' }, { v:4, l:'⚪ Düşük' }
  ].map(p => `<option value="${p.v}"${p.v === sub.pri ? ' selected' : ''}>${p.l}</option>`).join('');

  const mo = document.createElement('div');
  mo.className    = 'mo';
  
  mo.innerHTML = `<div class="modal" style="max-width:400px">
    <div class="mt">✏️ Alt Görev Düzenle</div>
    <div class="fr"><div class="fl">BAŞLIK</div><input class="fi" id="sub-title-inp" value="${sub.title}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">ÖNCELİK</div><select class="fi" id="sub-pri-inp">${priOpts}</select></div>
      <div class="fr"><div class="fl">PERSONEL</div><select class="fi" id="sub-user-inp">${userOpts}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">BAŞLANGIÇ</div><input type="date" class="fi" id="sub-start-inp" value="${sub.start || ''}"></div>
      <div class="fr"><div class="fl">BİTİŞ</div><input type="date" class="fi" id="sub-due-inp" value="${sub.due || ''}"></div>
    </div>
    <div class="mf">
      <button class="btn" onclick="this.closest('.mo').remove()">İptal</button>
      <button class="btn btnp" onclick="_updateSubTask(${parentId},${subId},this)">Kaydet</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _updateSubTask(parentId, subId, btn) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  const sub    = (parent?.subTasks || []).find(s => s.id === subId);
  if (sub) {
    sub.title = g('sub-title-inp')?.value.trim() || sub.title;
    sub.pri   = parseInt(g('sub-pri-inp')?.value);
    sub.uid   = parseInt(g('sub-user-inp')?.value);
    sub.start = g('sub-start-inp')?.value || null;
    sub.due   = g('sub-due-inp')?.value   || null;
  }
  saveTasks(d);
  renderPusula();
  btn.closest('.mo').remove();
  window.toast?.('Kaydedildi ✓', 'ok');
}

/**
 * Alt görev listesini belirtilen container'a render eder.
 * DocumentFragment kullanır.
 */
function renderSubTasks(parentId, subTasks, container) {
  if (!container) return;
  const users  = loadUsers();
  const todayS = new Date().toISOString().slice(0, 10);
  const done   = subTasks.filter(s => s.done).length;
  const total  = subTasks.length;

  const frag = document.createDocumentFragment();

  // Collapse toggle başlığı
  const collapseKey = 'pus_sub_collapsed_' + parentId;
  const isCollapsed = localStorage.getItem(collapseKey) === '1';
  const collapseWrap = document.createElement('div');
  collapseWrap.className = '_sub_collapse_btn';
  collapseWrap.onclick = () => {
    const collapsed = localStorage.getItem(collapseKey) === '1';
    localStorage.setItem(collapseKey, collapsed ? '0' : '1');
    const body = container.querySelector('._sub_body');
    if (body) body.style.display = collapsed ? '' : 'none';
    const arrow = collapseWrap.querySelector('._sub_arrow_icon');
    if (arrow) arrow.classList.toggle('collapsed', !collapsed);
  };
  collapseWrap.innerHTML = `
    <svg width="16" height="16" fill="none" viewBox="0 0 16 16" style="flex-shrink:0;color:var(--ac)">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="rgba(99,102,241,.1)" stroke="rgba(99,102,241,.3)" stroke-width="1"/>
      <path d="${isCollapsed?'M5 8h6M8 5v6':'M5 8h6'}" stroke="var(--ac)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="_sub_collapse_label">Alt Görevler</span>
    <span class="_sub_collapse_count">${done} / ${total}</span>
    <span style="margin-left:auto;font-size:10px;color:var(--t3)">${isCollapsed?'göster':'gizle'}</span>`;
  frag.appendChild(collapseWrap);

  // Alt görev body — gizlenebilir
  const subBody = document.createElement('div');
  subBody.className = '_sub_body';
  if (isCollapsed) subBody.style.display = 'none';

  // Progress bar
  if (total > 0) {
    const pbWrap = document.createElement('div');
    pbWrap.style.cssText = 'height:3px;background:var(--s2);border-radius:99px;margin:2px 0 8px;overflow:hidden';
    const pbFill = document.createElement('div');
    pbFill.style.cssText = `height:100%;width:${Math.round(done / total * 100)}%;background:var(--gr);border-radius:99px;transition:width .3s`;
    pbWrap.appendChild(pbFill);
    subBody.appendChild(pbWrap);
  }

  subTasks.forEach(s => {
    const u      = users.find(x => x.id === s.uid) || { name: '?' };
    const od     = s.due && s.due < todayS && !s.done;
    const row    = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px 4px 32px;border-radius:5px;margin-bottom:2px;background:var(--s2)';
    const dueColor = od ? 'var(--rd)' : (s.due && Math.ceil((new Date(s.due)-new Date(todayS))/86400000) <= 1 ? 'var(--am)' : 'var(--t3)');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;margin-bottom:2px;background:var(--s2)';
    row.innerHTML = `
      <input type="checkbox" ${s.done ? 'checked' : ''} onchange="Pusula.toggleSub(${parentId},${s.id},this.checked)" style="flex-shrink:0;accent-color:var(--ac)">
      <span style="flex:1;font-size:12px;${s.done ? 'text-decoration:line-through;opacity:.5' : ''}">${s.title}</span>
      <span style="font-size:10px;color:var(--t3)">${u.name.split(' ')[0]}</span>
      ${s.due ? `<span style="font-size:10px;color:${dueColor}">📅 ${s.due.slice(5)}</span>` : ''}
      ${s.time ? `<span style="font-size:10px;color:var(--t3)">⏰ ${s.time}</span>` : ''}
      ${s.alarm ? `<span style="font-size:10px;color:var(--am)" title="${s.alarm} dk önce hatırlatıcı">🔔</span>` : ''}
      ${s.doc || s.docLink ? `<a ${s.docLink ? 'href="'+escapeHtml(s.docLink)+'" target="_blank"' : 'href="#" onclick="event.preventDefault()"'} style="font-size:10px;color:var(--ac);text-decoration:none" title="${s.doc ? escapeHtml(s.doc.name) : 'Doküman linki'}">📎</a>` : ''}
      <button onclick="Pusula.editSub(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✏️</button>
      <button onclick="Pusula.delSub(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✕</button>`;
    subBody.appendChild(row);
  });

  // "Alt Görev Ekle" butonu
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'font-size:11px;color:var(--ac);background:none;border:1px dashed var(--bm);border-radius:5px;cursor:pointer;padding:3px 10px;margin:3px 0 0;width:100%';
  addBtn.textContent = '+ Alt Görev Ekle';
  addBtn.addEventListener('click', () => addSubTask(parentId));
  subBody.appendChild(addBtn);
  frag.appendChild(subBody);

  container.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — GÖREV YAZIŞMA (Task Chat)
// ════════════════════════════════════════════════════════════════

function openTaskChat(taskId) {
  const task = loadTasks().find(t => t.id === taskId);
  if (!task) return;
  const users = loadUsers();
  const PL2   = { 1:{e:'🔴',l:'Kritik'}, 2:{e:'🟠',l:'Önemli'}, 3:{e:'🔵',l:'Normal'}, 4:{e:'⚪',l:'Düşük'} };
  const p     = PL2[task.pri] || PL2[2];
  const owner = users.find(u => u.id === task.uid) || { name: '?' };

  const el = g('mo-taskchat');
  if (!el) return;

  st('taskchat-title', task.title);
  st('taskchat-meta', `${p.e} ${p.l} · ${owner.name}${task.due ? ' · Bitiş: ' + task.due : ''}`);

  const info = g('taskchat-info');
  if (info) {
    let h = '';
    if (task.link) h += `<a href="${task.link}" target="_blank" style="font-size:12px;color:var(--ac);margin-right:10px">🔗 Link</a>`;
    if (task.file) h += `<a href="${task.file.data}" download="${task.file.name}" style="font-size:12px;color:var(--ac)">📎 ${task.file.name}</a>`;
    if ((task.tags || []).length) h += `<div style="margin-top:4px">${(task.tags || []).map(t => `<span style="background:var(--s2);padding:1px 6px;border-radius:99px;font-size:10px;color:var(--t2)">${t}</span>`).join(' ')}</div>`;
    info.innerHTML = h || '<span style="font-size:11px;color:var(--t3)">—</span>';
  }

  if (g('taskchat-tid'))   g('taskchat-tid').value   = taskId;
  if (g('taskchat-input')) g('taskchat-input').value = '';

  renderTaskChatMsgs(taskId);
  window.openMo?.('mo-taskchat');
  setTimeout(() => { const mb = g('taskchat-msgs'); if (mb) mb.scrollTop = mb.scrollHeight; }, 150);
}

function renderTaskChatMsgs(taskId) {
  const chats  = loadTaskChats();
  const msgs   = chats[taskId] || [];
  const users  = loadUsers();
  const cont   = g('taskchat-msgs');
  if (!cont) return;

  if (!msgs.length) {
    cont.innerHTML = `<div style="text-align:center;color:var(--t2);font-size:13px;padding:40px 20px">💬 Henüz mesaj yok.</div>`;
    return;
  }

  const todayS  = new Date().toISOString().slice(0, 10);
  let lastDate  = '';

  const frag = document.createDocumentFragment();
  msgs.forEach(m => {
    const cu   = _getCU();
    const isMe = m.uid === cu?.id;
    const u    = users.find(x => x.id === m.uid) || { name: m.name || '?' };
    const msgDate = (m.ts || '').slice(0, 10);

    // Tarih ayracı
    if (msgDate && msgDate !== lastDate) {
      lastDate = msgDate;
      const sep = document.createElement('div');
      sep.style.cssText = 'text-align:center;font-size:10px;color:var(--t3);margin:10px 0;display:flex;align-items:center;gap:6px';
      sep.innerHTML = `<div style="flex:1;height:1px;background:var(--b)"></div>${msgDate === todayS ? 'Bugün' : msgDate}<div style="flex:1;height:1px;background:var(--b)"></div>`;
      frag.appendChild(sep);
    }

    const row = document.createElement('div');
    row.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px;margin-bottom:8px`;
    row.innerHTML = `
      <div style="width:26px;height:26px;border-radius:50%;background:${isMe ? 'var(--ac)' : 'var(--s2)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${isMe ? '#fff' : 'var(--t2)'};flex-shrink:0">${_pusInitials(u.name)}</div>
      <div style="max-width:70%">
        ${!isMe ? `<div style="font-size:10px;color:var(--t3);margin-bottom:1px">${u.name}</div>` : ''}
        <div style="background:${isMe ? 'var(--ac)' : 'var(--sf)'};color:${isMe ? '#fff' : 'var(--t)'};border:${isMe ? 'none' : '1px solid var(--b)'};border-radius:${isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};padding:7px 11px;font-size:13px;word-break:break-word">
          ${m.text ? `<div>${m.text}</div>` : ''}
          ${m.file  ? `<div style="margin-top:4px"><a href="${m.file.data}" download="${m.file.name}" style="font-size:11px;color:${isMe ? 'rgba(255,255,255,.85)' : 'var(--ac)'};display:inline-flex;align-items:center;gap:4px">📎 ${m.file.name}</a></div>` : ''}
        </div>
        <div style="font-size:9px;color:var(--t3);margin-top:2px;${isMe ? 'text-align:right' : ''}">${(m.ts || '').slice(11, 16)}</div>
      </div>`;
    frag.appendChild(row);
  });

  cont.replaceChildren(frag);
  cont.scrollTop = cont.scrollHeight;
}

function sendTaskChatMsg() {
  const taskId = parseInt(g('taskchat-tid')?.value || '0');
  const text   = (g('taskchat-input')?.value || '').trim();
  const fileEl = g('taskchat-file');
  if (!text && !fileEl?.files?.length) { window.toast?.('Mesaj yazın veya dosya seçin', 'err'); return; }

  const doSend = fd => {
    const chats = loadTaskChats();
    if (!chats[taskId]) chats[taskId] = [];
    const msg = { id: generateNumericId(), uid: _getCU()?.id, name: _getCU()?.name, text, ts: nowTs() };
    if (fd) msg.file = fd;
    chats[taskId].push(msg);
    storeTaskChats(chats);
    if (g('taskchat-input'))  g('taskchat-input').value  = '';
    if (fileEl)               fileEl.value = '';
    if (g('chat-fp'))         g('chat-fp').textContent   = '';
    renderTaskChatMsgs(taskId);
    // S3: Görev sahibi + katılımcılara KİŞİYE ÖZEL bildirim gönder
    const task = loadTasks().find(t => t.id === taskId);
    const _cuChat = _getCU();
    if (task && _cuChat) {
      const _targets = new Set([task.uid, ...(task.participants || []), ...(task.viewers || [])]);
      _targets.delete(_cuChat.id);
      _targets.forEach(function(targetUid) {
        window.addNotif?.('💬', '"' + escapeHtml(task.title) + '" görevinde yeni mesaj — ' + escapeHtml(_cuChat.name || ''), 'info', 'pusula', targetUid, task.id);
      });
    }
  };

  if (fileEl?.files?.[0]) {
    const r = new FileReader();
    r.onload = ev => doSend({ name: fileEl.files[0].name, data: ev.target.result });
    r.readAsDataURL(fileEl.files[0]);
  } else {
    doSend(null);
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — EXCEL EXPORT
// ════════════════════════════════════════════════════════════════

// ── Excel Export ─────────────────────────────────────────────────
function exportTasksXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const tasks = visTasks();

  // Ana görevler sayfası
  const rows = tasks.map(t => {
    const u    = users.find(x => x.id === t.uid) || { name: '?' };
    const subs = (t.subTasks || []);
    return {
      'ID':             t.id,
      'Görev':          t.title,
      'Açıklama':       t.desc || '',
      'Personel':       u.name,
      'Öncelik':        { 1:'Kritik', 2:'Önemli', 3:'Normal', 4:'Düşük' }[t.pri] || '?',
      'Durum':          t.done ? 'Tamamlandı' : ({ todo:'Yapılacak', inprogress:'Devam', review:'İnceleme', done:'Tamamlandı' }[t.status] || 'Yapılacak'),
      'Departman':      t.department || '',
      'Başlangıç':      t.start || '',
      'Son Tarih':      t.due || '',
      'Son Tarih Saat': t.due_time || '',
      'İşlem Tutarı':   t.cost ? Number(t.cost).toLocaleString('tr-TR') : '',
      'Etiketler':      (t.tags || []).join(', '),
      'Alt Görev Sayısı': subs.length,
      'Tamamlanan Alt': subs.filter(s => s.done || s.status === 'done').length,
      'Oluşturulma':    t.created_at || '',
      'Link':           t.link || '',
    };
  });

  // Alt görevler sayfası
  const subRows = [];
  tasks.forEach(t => {
    const u = users.find(x => x.id === t.uid) || { name: '?' };
    (t.subTasks || []).forEach(s => {
      const su = users.find(x => x.id === s.uid) || { name: '?' };
      subRows.push({
        'Ana Görev ID':  t.id,
        'Ana Görev':     t.title,
        'Alt Görev':     s.title,
        'Sorumlu':       su.name,
        'Durum':         s.done ? 'Tamamlandı' : ({ todo:'Yapılacak', inprogress:'Devam', done:'Tamamlandı' }[s.status] || 'Yapılacak'),
      });
    });
  });

  // 3. sayfa: görev + hemen altında alt görevleri (madde 9)
  const combinedRows = [];
  tasks.forEach(t => {
    const u = users.find(x => x.id === t.uid) || { name: '?' };
    combinedRows.push({
      'Tür':       'ANA GÖREV',
      'ID':        t.id,
      'Başlık':    t.title,
      'Personel':  u.name,
      'Öncelik':   { 1:'Kritik', 2:'Önemli', 3:'Normal', 4:'Düşük' }[t.pri] || '?',
      'Durum':     t.done ? 'Tamamlandı' : (t.status || 'todo'),
      'Departman': t.department || '',
      'Son Tarih': t.due || '',
      'Saat':      '',
      'Açıklama':  t.desc || '',
    });
    (t.subTasks || []).forEach((s, si) => {
      const su = users.find(x => x.id === s.uid) || { name: '?' };
      combinedRows.push({
        'Tür':       `  └ Alt Görev ${si+1}`,
        'ID':        `${t.id}.${si+1}`,
        'Başlık':    s.title,
        'Personel':  su.name,
        'Öncelik':   { 1:'Kritik', 2:'Önemli', 3:'Normal', 4:'Düşük' }[s.pri] || '',
        'Durum':     s.done ? '✓ Tamamlandı' : 'Devam',
        'Departman': '',
        'Son Tarih': s.due || '',
        'Saat':      s.time || '',
        'Açıklama':  '',
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);
  const ws2 = XLSX.utils.json_to_sheet(subRows.length ? subRows : [{ Bilgi: 'Alt görev yok' }]);
  const ws3 = XLSX.utils.json_to_sheet(combinedRows);

  ws1['!cols'] = [
    {wch:10},{wch:35},{wch:30},{wch:18},{wch:10},{wch:14},
    {wch:14},{wch:12},{wch:12},{wch:12},{wch:14},{wch:20},
    {wch:14},{wch:14},{wch:18},{wch:30}
  ];
  ws2['!cols'] = [{wch:12},{wch:35},{wch:35},{wch:18},{wch:14}];
  ws3['!cols'] = [{wch:14},{wch:10},{wch:35},{wch:18},{wch:10},{wch:14},{wch:14},{wch:12},{wch:8},{wch:30}];

  XLSX.utils.book_append_sheet(wb, ws1, 'Görevler');
  XLSX.utils.book_append_sheet(wb, ws2, 'Alt Görevler');
  XLSX.utils.book_append_sheet(wb, ws3, 'Görev + Alt Görev');

  const fname = `Gorevler_${nowTs().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fname);
  logActivity('task', `Görev listesi Excel olarak indirildi (${tasks.length} görev)`);
  window.toast?.(`✅ ${tasks.length} görev Excel'e aktarıldı`, 'ok');
}

// ── Excel Import ─────────────────────────────────────────────────
function importTasksXlsx() {
  // Gizli input oluştur
  let inp = document.getElementById('_tk-xlsx-import-inp');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file';
    inp.id   = '_tk-xlsx-import-inp';
    inp.accept = '.xlsx,.xls,.csv';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.onchange = function() {
    const file = inp.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows.length) { window.toast?.('Dosya boş', 'err'); return; }

        const users    = loadUsers();
        const existing = loadTasks();
        const cu       = _getCU();
        let added = 0, skipped = 0;

        rows.forEach(row => {
          const title = (row['Görev'] || row['gorev'] || row['title'] || '').toString().trim();
          if (!title) { skipped++; return; }

          // Personel eşleştir — isim veya e-posta
          const personelStr = (row['Personel'] || row['personel'] || '').toString().trim();
          const assignee = users.find(u =>
            u.name?.toLowerCase() === personelStr.toLowerCase() ||
            u.email?.toLowerCase() === personelStr.toLowerCase()
          ) || cu;

          // Öncelik parse
          const priStr = (row['Öncelik'] || row['oncelik'] || '').toString().toLowerCase();
          const pri = priStr.includes('kritik') ? 1 : priStr.includes('önemli') || priStr.includes('onemli') ? 2 : priStr.includes('düşük') || priStr.includes('dusuk') ? 4 : 3;

          // Durum parse
          const statusStr = (row['Durum'] || row['durum'] || '').toString().toLowerCase();
          const status = statusStr.includes('devam') ? 'inprogress' : statusStr.includes('inceleme') ? 'review' : statusStr.includes('tamam') ? 'done' : 'todo';

          const newTask = {
            id:         generateNumericId(),
            title,
            desc:       (row['Açıklama'] || row['aciklama'] || '').toString(),
            uid:        assignee?.id || cu?.id || 1,
            pri,
            status,
            done:       status === 'done',
            due:        (row['Son Tarih'] || row['son_tarih'] || '').toString().slice(0,10) || null,
            due_time:   (row['Son Tarih Saat'] || '').toString().trim() || '',
            start:      (row['Başlangıç'] || '').toString().slice(0,10) || null,
            department: (row['Departman'] || '').toString().trim(),
            cost:       parseFloat((row['İşlem Tutarı'] || '').toString().replace(/[^0-9.]/g,'')) || null,
            tags:       (row['Etiketler'] || '').toString().split(',').map(t=>t.trim()).filter(Boolean),
            link:       (row['Link'] || '').toString().trim(),
            subTasks:   [],
            created_at: nowTs(),
            importedAt: nowTs(),
          };

          // Aynı başlıklı görev var mı? (duplicate check)
          const dup = existing.find(t => t.title.trim().toLowerCase() === title.toLowerCase() && t.uid === newTask.uid);
          if (dup) { skipped++; return; }

          existing.push(newTask);
          added++;
        });

        saveTasks(existing);
        renderPusula();
        logActivity('task', `Excel'den ${added} görev içe aktarıldı`);
        window.toast?.(`✅ ${added} görev eklendi${skipped ? `, ${skipped} atlandı` : ''}`, 'ok');
      } catch(err) {
        console.error('[importTasksXlsx]', err);
        window.toast?.('Dosya okunamadı: ' + err.message, 'err');
      }
    };
    reader.readAsBinaryString(file);
  };
  inp.click();
}

// Import şablonu indir
function downloadTaskTemplate() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const template = [
    {
      'Görev':          'Örnek Görev 1',
      'Açıklama':       'Görevin detaylı açıklaması',
      'Personel':       'Ad Soyad (kullanıcı listesindeki isim)',
      'Öncelik':        'Kritik / Önemli / Normal / Düşük',
      'Durum':          'Yapılacak / Devam / İnceleme / Tamamlandı',
      'Departman':      'Finans / Lojistik / İK / IT / Satış / Operasyon',
      'Başlangıç':      '2026-03-24',
      'Son Tarih':      '2026-03-31',
      'Son Tarih Saat': '17:00',
      'İşlem Tutarı':   '1500',
      'Etiketler':      'etiket1, etiket2',
      'Link':           'https://...',
    },
    {
      'Görev':          'Örnek Görev 2',
      'Açıklama':       '',
      'Personel':       '',
      'Öncelik':        'Normal',
      'Durum':          'Yapılacak',
      'Departman':      'IT',
      'Başlangıç':      '',
      'Son Tarih':      '',
      'Son Tarih Saat': '',
      'İşlem Tutarı':   '',
      'Etiketler':      '',
      'Link':           '',
    }
  ];
  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = Array(12).fill({wch: 22});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Görev Şablonu');
  XLSX.writeFile(wb, 'Gorev_Import_Sablonu.xlsx');
  window.toast?.('📥 Şablon indirildi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 12 — INIT
// ════════════════════════════════════════════════════════════════

function _pusInit() {
  // Kaydedilmiş görünüm modunu uygula
  PUS_VIEW = localStorage.getItem('ak_pus_view') || 'list';
  const vBtn = g('pus-v-' + PUS_VIEW);
  if (vBtn) vBtn.classList.add('on', 'active');
  // Alt görev alarmlarını tara ve zamanlayıcıları kur
  setTimeout(checkSubTaskAlarms, 1000);
}

// ════════════════════════════════════════════════════════════════
// ANLIK GÖREV ATAMA BİLDİRİMİ
// ════════════════════════════════════════════════════════════════

/**
 * Görev atanınca/devredilince ekranda dikkat çekici banner gösterir.
 * CU atanan kişiyse hemen gösterir; değilse atlanır.
 * Banner 8 saniye kalır, tıklanınca görev detayına gider.
 *
 * @param {number} targetUid  Atanan kullanıcı ID
 * @param {number} taskId     Görev ID
 * @param {string} title      Görev başlığı
 * @param {number} pri        Öncelik (1-4)
 * @param {string} due        Bitiş tarihi
 * @param {string} assigner   Atayan kişi adı
 */
function _showInstantTaskNotif(targetUid, taskId, title, pri, due, assigner) {
  // Sadece atanan kişinin ekranında göster
  const cu = _getCU();
  if (!cu || cu.id !== targetUid) return;

  // Mevcut banner varsa kaldır
  const old = document.getElementById('pus-instant-notif');
  if (old) old.remove();

  const PRI_MAP = { 1: { l:'Kritik', c:'#EF4444', bg:'#FEF2F2' }, 2: { l:'Yuksek', c:'#F59E0B', bg:'#FFFBEB' }, 3: { l:'Normal', c:'#3B82F6', bg:'#EFF6FF' }, 4: { l:'Dusuk', c:'#6B7280', bg:'#F9FAFB' } };
  const p = PRI_MAP[pri] || PRI_MAP[3];
  const dueTxt = due ? due : 'Tarih yok';

  const banner = document.createElement('div');
  banner.id = 'pus-instant-notif';
  banner.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:400px;min-width:320px;' +
    'background:var(--s,#fff);border:2px solid ' + p.c + ';border-radius:14px;padding:0;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.04);' +
    'cursor:pointer;animation:_pusNotifSlide .35s ease-out;overflow:hidden;font-family:inherit';

  banner.innerHTML = `
    <div style="background:${p.c};padding:10px 16px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">📋</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:#fff">Yeni Gorev Atandi</div>
        <div style="font-size:11px;color:rgba(255,255,255,.8)">${escapeHtml(assigner)} tarafindan</div>
      </div>
      <button onclick="event.stopPropagation();document.getElementById('pus-instant-notif')?.remove()"
        style="background:none;border:none;color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;padding:0 2px;line-height:1">&times;</button>
    </div>
    <div style="padding:14px 16px">
      <div style="font-size:15px;font-weight:700;color:var(--t,#1a1a2e);margin-bottom:8px;line-height:1.3">${escapeHtml(title)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;background:${p.bg};color:${p.c};border:1px solid ${p.c}30">${p.l}</span>
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;background:var(--s2,#f1f5f9);color:var(--t2,#475569)">📅 ${escapeHtml(dueTxt)}</span>
      </div>
    </div>
    <div style="padding:0 16px 12px;display:flex;gap:8px">
      <span style="flex:1;font-size:10px;color:var(--t3,#94a3b8);align-self:center">Gorevi gormek icin tiklayin</span>
      <div style="width:100%;height:3px;background:var(--s2,#e2e8f0);border-radius:2px;position:absolute;bottom:0;left:0">
        <div id="pus-notif-progress" style="height:100%;background:${p.c};border-radius:2px;width:100%;transition:width linear"></div>
      </div>
    </div>`;

  // CSS animasyonu ekle (yoksa)
  if (!document.getElementById('pus-notif-style')) {
    const style = document.createElement('style');
    style.id = 'pus-notif-style';
    style.textContent = '@keyframes _pusNotifSlide{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Progress bar — 8 saniyede daralır
  const prog = document.getElementById('pus-notif-progress');
  if (prog) requestAnimationFrame(() => { prog.style.width = '0%'; prog.style.transitionDuration = '8s'; });

  // Tıklanınca göreve git
  banner.addEventListener('click', () => {
    banner.remove();
    // Pusula paneline geç
    if (window.nav) window.nav('pusula');
    // Görev detayını aç
    setTimeout(() => {
      if (typeof openPusDetail === 'function') openPusDetail(taskId);
      else window.Pusula?.openDetail?.(taskId);
    }, 300);
  });

  // 8 saniye sonra kaldır (slide-out)
  setTimeout(() => {
    if (!document.getElementById('pus-instant-notif')) return;
    banner.style.transition = 'transform .3s ease-in, opacity .3s ease-in';
    banner.style.transform = 'translateX(120%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 350);
  }, 8000);
}

// Global'e at — saveTask'tan erişilebilsin
window._showInstantTaskNotif = _showInstantTaskNotif;

// ════════════════════════════════════════════════════════════════
// GÖREV BAĞIMLILIKLARI
// ════════════════════════════════════════════════════════════════

function setTaskDependency(taskId, dependsOnId) {
  const d = loadTasks();
  const t = d.find(x => x.id === taskId); if (!t) return;
  if (!t.dependsOn) t.dependsOn = [];
  if (taskId === dependsOnId) { window.toast?.('Gorev kendisine bagli olamaz', 'err'); return; }
  if (t.dependsOn.includes(dependsOnId)) { window.toast?.('Bagimlilik zaten var', 'err'); return; }
  // Dairesel bagimlilik kontrolu
  const dep = d.find(x => x.id === dependsOnId);
  if (dep?.dependsOn?.includes(taskId)) { window.toast?.('Dairesel bagimlilik olusur', 'err'); return; }
  t.dependsOn.push(dependsOnId);
  saveTasks(d);
  window.toast?.('Bagimlilik eklendi', 'ok');
  renderPusula();
}
function removeTaskDependency(taskId, depId) {
  const d = loadTasks();
  const t = d.find(x => x.id === taskId); if (!t) return;
  t.dependsOn = (t.dependsOn || []).filter(id => id !== depId);
  saveTasks(d);
  renderPusula();
}
function isTaskBlocked(task) {
  if (!task.dependsOn?.length) return false;
  const tasks = loadTasks();
  return task.dependsOn.some(depId => {
    const dep = tasks.find(x => x.id === depId);
    return dep && !dep.done && dep.status !== 'done';
  });
}
window.setTaskDependency = setTaskDependency;
window.removeTaskDependency = removeTaskDependency;

// ════════════════════════════════════════════════════════════════
// TOPLU GÖREV ATAMA
// ════════════════════════════════════════════════════════════════

function openBulkAssign() {
  if (!window.isAdmin?.()) { window.toast?.('Yetki gerekli', 'err'); return; }
  const users = loadUsers();
  const tasks = loadTasks().filter(t => !t.done && t.status !== 'done');

  const old = document.getElementById('mo-bulk-assign'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-bulk-assign'; 
  mo.innerHTML = `<div class="moc" style="max-width:500px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">Toplu Gorev Atama</div>
    </div>
    <div style="padding:16px 20px">
      <div class="fg"><div class="fl">HEDEF KİSİ</div>
        <select class="fi" id="ba-user">${users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}</select>
      </div>
      <div class="fg" style="margin-top:8px"><div class="fl">GOREVLER (${tasks.length} acik gorev)</div>
        <div style="max-height:250px;overflow-y:auto;border:1px solid var(--b);border-radius:8px">
          ${tasks.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--b);cursor:pointer;font-size:12px">
            <input type="checkbox" class="ba-cb" value="${t.id}" style="accent-color:var(--ac)">
            <span style="flex:1">${escapeHtml(t.title)}</span>
            <span style="font-size:10px;color:var(--t3)">${t.department||''}</span>
          </label>`).join('')}
        </div>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-bulk-assign').remove()">Iptal</button>
      <button class="btn btnp" onclick="_doBulkAssign()">Ata</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

function _doBulkAssign() {
  const uid = parseInt(document.getElementById('ba-user')?.value || '0');
  if (!uid) { window.toast?.('Kullanici secin', 'err'); return; }
  const ids = [...document.querySelectorAll('.ba-cb:checked')].map(cb => parseInt(cb.value));
  if (!ids.length) { window.toast?.('Gorev secin', 'err'); return; }
  const d = loadTasks();
  const u = loadUsers().find(x => x.id === uid);
  ids.forEach(id => { const t = d.find(x => x.id === id); if (t) t.uid = uid; });
  saveTasks(d);
  document.getElementById('mo-bulk-assign')?.remove();
  window.toast?.(ids.length + ' gorev ' + (u?.name||'') + ' kullanicisina atandi', 'ok');
  logActivity('task', 'Toplu atama: ' + ids.length + ' gorev → ' + (u?.name||''));
  renderPusula();
}
window.openBulkAssign = openBulkAssign;
window._doBulkAssign = _doBulkAssign;

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════
// ── V18 eklenti uyumluluk ─────────────────────────────────────
const openApprovalModal = (...a) => window.openApprovalModal?.(...a);

// V18 EKSİK FONKSİYONLAR — PUSULA
// ════════════════════════════════════════════════════════════════

function checkYaklasanEtkinlikler(){
  const events=loadCal().filter(e=>e.status==='approved');
  const today=new Date();const todayS=today.toISOString().slice(0,10);
  const sorulduPrefix='etkinlik_soruldu_';
  events.forEach(ev=>{
    const evDate=new Date(ev.date);
    const daysLeft=Math.ceil((evDate-today)/86400000);
    if(daysLeft<0||daysLeft>7)return;
    const key=sorulduPrefix+ev.id+'_'+ev.date;
    if(localStorage.getItem(key))return;
    localStorage.setItem(key,'1');
    const forMe=ev.own===0||ev.own===CU?.id||(ev.participants||[]).includes(CU?.id);
    if(!forMe&&!window.isAdmin?.())return;
    const icon=daysLeft===0?'🔔':daysLeft<=2?'⏰':'📅';
    const msg=daysLeft===0
      ?`Bugün etkinlik var: "${ev.title}" (${ev.time})`
      :`"${ev.title}" etkinliğine ${daysLeft} gün kaldı — ${ev.date} ${ev.time}`;
    addNotif(icon,msg,daysLeft<=2?'warn':'info','takvim');
    // Dashboard'da göster
    if(daysLeft<=3)showKargoAlert(daysLeft===0?'Bugün etkinlik!':daysLeft+' gün sonra:',ev.title+' — '+ev.time,'bekle');
  });
}

function renderEtkinlik(){
  // Kriterleri yükle ve son güncellemeyi göster
  const lastUpd=localStorage.getItem(FUAR_LAST_UPDATE_KEY)||'';
  const updEl=g('etk-last-update');
  if(updEl)updEl.textContent=lastUpd?'Son güncelleme: '+lastUpd.slice(0,16):'Henüz güncellenmedi';

  let d=loadEtkinlik();
  const nb=g('nb-etk-b');
  if(nb){const n=d.filter(e=>e.status==='onay').length;nb.textContent=n;nb.style.display=n>0?'inline':'none';}
  const cont=g('etkinlik-list');if(!cont)return;
  if(!d.length){
    cont.innerHTML=`<div style="padding:32px;text-align:center;color:var(--t2)">
      <div style="font-size:28px;margin-bottom:12px">🎪</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:8px">Henüz etkinlik yok</div>
      <div style="font-size:13px;margin-bottom:20px;color:var(--t3)">Kriter girerek dünya fuarlarını tarayın veya manuel ekleyin.</div>
      <button class="btn btnp" onclick="fetchFuarlarWithCriteria()">↻ Şimdi Tara</button>
    </div>`;
    return;
  }
  // Otomatik getirilen ve manuel eklenenler ayrı grupla
  const auto=d.filter(e=>e.autoFetched);
  const manual=d.filter(e=>!e.autoFetched);
  let html='';
  if(auto.length){
    html+=`<div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">
      🌍 Kriter Sonuçları — ${auto.length} etkinlik
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:24px">
      ${auto.map(e=>renderEtkinlikKart(e)).join('')}
    </div>`;
  }
  if(manual.length){
    html+=`<div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">
      📌 Manuel Eklenenler — ${manual.length} etkinlik
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      ${manual.map(e=>renderEtkinlikKart(e)).join('')}
    </div>`;
  }
  if(!auto.length&&!manual.length){
    html=`<div style="padding:32px;text-align:center;color:var(--t2)">Etkinlik bulunamadı.</div>`;
  }
  cont.innerHTML=html;
}

function openEtkinlikModal(id){
  var old = document.getElementById('mo-etkinlik'); if (old) old.remove();
  var e = id ? loadEtkinlik().find(function(x){ return x.id === id; }) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s){ return s; };

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-etkinlik'; 
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)" id="mo-etk-t">' + (e ? '✏️ Etkinlik Düzenle' : '+ Etkinlik Ekle') + '</div>'
      + '<button onclick="document.getElementById(\'mo-etkinlik\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px">'
      + '<div><div class="fl">ETKİNLİK ADI *</div><input class="fi" id="etk-name" placeholder="Etkinlik / Fuar adı" value="' + esc(e?.name || '') + '"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><div class="fl">TÜR</div><select class="fi" id="etk-type-inp">'
          + '<option value="fuar"' + (e?.type === 'fuar' ? ' selected' : '') + '>🎪 Fuar</option>'
          + '<option value="seminer"' + (e?.type === 'seminer' ? ' selected' : '') + '>🎤 Seminer</option>'
          + '<option value="toplanti"' + (e?.type === 'toplanti' ? ' selected' : '') + '>🤝 Toplantı</option>'
          + '<option value="diger"' + (e?.type === 'diger' ? ' selected' : '') + '>📌 Diğer</option>'
        + '</select></div>'
        + '<div><div class="fl">SEKTÖR</div><input class="fi" id="etk-sektor-inp" placeholder="Tekstil, Gıda..." value="' + esc(e?.sektor || '') + '"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><div class="fl">BAŞLANGIÇ TARİHİ</div><input type="date" class="fi" id="etk-date" value="' + (e?.date || '') + '"></div>'
        + '<div><div class="fl">BİTİŞ TARİHİ</div><input type="date" class="fi" id="etk-end" value="' + (e?.end || '') + '"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><div class="fl">LOKASYON / ŞEHİR</div><input class="fi" id="etk-city" placeholder="İstanbul, Mersin..." value="' + esc(e?.city || '') + '"></div>'
        + '<div><div class="fl">MEKAN</div><input class="fi" id="etk-venue" placeholder="Fuar merkezi, otel..." value="' + esc(e?.venue || '') + '"></div>'
      + '</div>'
      + '<div><div class="fl">WEB LİNK</div><input class="fi" id="etk-url" placeholder="https://..." value="' + esc(e?.url || '') + '"></div>'
      + '<div><div class="fl">DURUM</div><select class="fi" id="etk-status">'
        + '<option value="ilgi"' + (e?.status === 'ilgi' ? ' selected' : '') + '>🔍 İlgileniliyor</option>'
        + '<option value="basvuru"' + (e?.status === 'basvuru' ? ' selected' : '') + '>📝 Başvuruldu</option>'
        + '<option value="onay"' + (e?.status === 'onay' ? ' selected' : '') + '>✅ Onaylandı</option>'
        + '<option value="tamamlandi"' + (e?.status === 'tamamlandi' ? ' selected' : '') + '>🏁 Tamamlandı</option>'
        + '<option value="iptal"' + (e?.status === 'iptal' ? ' selected' : '') + '>❌ İptal</option>'
      + '</select></div>'
      + '<div><div class="fl">AÇIKLAMA / NOTLAR</div><textarea class="fi" id="etk-desc" rows="3" style="resize:none" placeholder="Katılımcılar, bütçe, notlar...">' + esc(e?.desc || '') + '</textarea></div>'
      + '<input type="hidden" id="etk-eid" value="' + (e?.id || '') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-etkinlik\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="saveEtkinlik()">Kaydet</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(ev) { if (ev.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); document.getElementById('etk-name')?.focus(); }, 10);
}

function saveEtkinlik(){
  var nameEl = document.getElementById('etk-name');
  var name = nameEl ? nameEl.value.trim() : '';
  if(!name){window.toast?.('Etkinlik adı zorunludur','err');return;}
  var d=loadEtkinlik();
  var eid=parseInt((document.getElementById('etk-eid')?.value)||'0');
  var entry={
    name: name,
    type: document.getElementById('etk-type-inp')?.value || 'diger',
    sektor: document.getElementById('etk-sektor-inp')?.value || '',
    city: document.getElementById('etk-city')?.value || '',
    date: document.getElementById('etk-date')?.value || '',
    end: document.getElementById('etk-end')?.value || '',
    venue: document.getElementById('etk-venue')?.value || '',
    url: document.getElementById('etk-url')?.value || '',
    desc: document.getElementById('etk-desc')?.value || '',
    status: document.getElementById('etk-status')?.value || 'ilgi',
  };
  if(eid){var e=d.find(function(x){return x.id===eid;});if(e)Object.assign(e,entry);}
  else d.push({id:generateNumericId(),...entry});
  storeEtkinlik(d);
  document.getElementById('mo-etkinlik')?.remove();
  renderEtkinlik();
  window.logActivity?.('view','"'+name+'" etkinliği kaydedildi');
  window.toast?.(name+' kaydedildi ✓','ok');
  // Yöneticilere bildirim
  if (!eid) {
    var cu = _getCU();
    var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active' && u.id !== cu?.id; });
    mgrs.forEach(function(m) { window.addNotif?.('🎪', 'Yeni etkinlik: ' + name + ' (' + (cu?.name || '') + ')', 'info', 'etkinlik', m.id); });
  }
}

function delEtkinlik(id){if(!window.isAdmin?.())return;storeEtkinlik(loadEtkinlik().filter(x=>x.id!==id));renderEtkinlik();}



// ════════════════════════════════════════════════════════════════
// ═════ YENİ ÖZELLİKLER BLOĞU — v2.0 ══════════════════════════
// 1. Akıllı Görev Şablonları
// 2. Görev Bağımlılık Zinciri
// 3. Zaman Takipçisi (Time Tracker)
// 4. Görev Puanı & Skor Tablosu
// 5. Sesli Görev Notu
// 6. Akıllı Tarih Önerisi
// 7. Görev Yorumu & Güncelleme Akışı
// 8. Odak Modu (Pomodoro)
// 9. Görev Tekrarlama Kuralları
// 10. Görev Haritası (Gantt Toggle)
// ════════════════════════════════════════════════════════════════

// ── Yeni localStorage anahtarları ────────────────────────────────
const _PF = {
  templates  : 'ak_tk_templates1',
  deps       : 'ak_tk_deps1',
  timeLog    : 'ak_tk_timelog1',
  scores     : 'ak_tk_scores1',
  taskLog    : 'ak_tk_tasklog1',
  recurring  : 'ak_tk_recurring1',
  ttRunning  : 'ak_tt_running',
};
const _pfR = (k,fb) => { try{ const r=localStorage.getItem(k); return r===null?fb:JSON.parse(r); }catch{ return fb; } };
const _pfW = (k,v)  => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ console.warn('[PF]',e); } };

// ════════════════════════════════════════════════════════════════
// 1. AKILLI GÖREV ŞABLONLARI
// ════════════════════════════════════════════════════════════════
const _PF_TPL_DEFAULT = [
  { id:'tpl_tedarikci', name:'Yeni Tedarikçi Onboarding', icon:'🤝', subTasks:['Tedarikçi belgelerini talep et (vergi levhası, imza sirküleri)','Fiyat teklifi ve numune al','Kalite kontrol değerlendirmesi yap','Sözleşme taslağı hazırla','Hukuki onay al','Sisteme tedarikçi kaydını gir','İlk sipariş test sürecini planla'] },
  { id:'tpl_ihracat',   name:'İhracat Dosyası Açma',       icon:'📦', subTasks:['Müşteri sipariş onayını al','Pro forma fatura hazırla','Gümrük tarife kodu tespit et','Ambalajlama ve etiketlemeyi tamamla','Gümrük beyannamesi hazırla','Navlun ve sigorta düzenle','Sevk belgelerini (konşimento/CMR) al','Müşteriye belge gönder ve takibe al'] },
  { id:'tpl_kapani',    name:'Aylık Kapanış',              icon:'📊', subTasks:['Banka mutabakatını tamamla','Açık faturaları kontrol et','KDV beyannamesi için verileri hazırla','SGK bildirimini kontrol et','Gider tahakkuklarını gir','P&L özeti hazırla','Yönetim raporunu paylaş'] },
  { id:'tpl_isealim',   name:'İşe Alım Süreci',           icon:'👥', subTasks:['İş ilanı hazırla ve yayınla','CV ön eleme yap','Telefon görüşmesi gerçekleştir','Yüz yüze mülakat düzenle','Referans kontrolü yap','Teklif mektubunu hazırla ve gönder','İşe başlama evraklarını hazırla'] },
  { id:'tpl_sprint',    name:'Sprint Hazırlığı',           icon:'🚀', subTasks:['Backlog önceliklendirmesini güncelle','Ekip kapasitesini belirle','Sprint hedefini yaz','Görevleri tahmin et (story points)','Sprint board\'unu hazırla','Kickoff toplantısını yönet'] },
];

function _pfLoadTemplates() {
  const d = _pfR(_PF.templates, null);
  if (!d) { _pfW(_PF.templates, _PF_TPL_DEFAULT); return _PF_TPL_DEFAULT; }
  return d;
}
function _pfSaveTemplates(d) { _pfW(_PF.templates, d); }

window.openTaskTemplates = function() {
  _ensurePfModals();
  _pfRenderTplList();
  window.openMo?.('mo-pf-templates');
};
window.applyTaskTemplate = function(tplId) {
  const tpl = _pfLoadTemplates().find(t => t.id === tplId);
  if (!tpl) return;
  window.closeMo?.('mo-pf-templates');
  window.Pusula?.openAdd?.() || window.openAddTask?.();
  setTimeout(() => {
    const titleEl = g('tk-title');
    if (titleEl && !titleEl.value) titleEl.value = tpl.name;
    window._pendingSubTasks = tpl.subTasks.map((s,i) => ({ id: generateNumericId(), title:s, done:false }));
    _pfRenderPendingSubTasks();
  }, 120);
};
window.saveCurrentAsTemplate = function() {
  const title = (g('tk-title')?.value||'').trim();
  if (!title) { toast('Önce görev başlığı girin','warn'); return; }
  const subEls = document.querySelectorAll('#tk-subtask-preview .pf-st-lbl');
  const subs   = Array.from(subEls).map(e=>e.textContent.trim()).filter(Boolean);
  const tpls   = _pfLoadTemplates();
  tpls.push({ id:'tpl_custom_'+generateNumericId(), name:title+' Şablonu', icon:'⭐', subTasks:subs, custom:true });
  _pfSaveTemplates(tpls);
  toast('Şablon kaydedildi ✓');
};
window.deleteTaskTemplate = function(id) {
  _pfSaveTemplates(_pfLoadTemplates().filter(t=>t.id!==id));
  _pfRenderTplList();
  toast('Şablon silindi');
};
function _pfRenderTplList() {
  const cont = g('pf-tpl-cont');
  if (!cont) return;
  const tpls = _pfLoadTemplates();
  if (!tpls.length) { cont.innerHTML='<p style="color:var(--t3);text-align:center;padding:24px">Henüz şablon yok.</p>'; return; }
  cont.innerHTML = tpls.map(t=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--b);border-radius:10px;background:var(--sf);cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor='var(--ac)'" onmouseout="this.style.borderColor='var(--b)'">
      <div style="font-size:24px;flex-shrink:0">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--t)">${t.name}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">${t.subTasks.length} alt görev</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btnp" style="font-size:11px;padding:5px 12px" onclick="applyTaskTemplate('${t.id}')">Uygula</button>
        ${t.custom?`<button class="btn btns" style="font-size:11px;padding:5px 10px;color:var(--rd)" onclick="deleteTaskTemplate('${t.id}');event.stopPropagation()">✕</button>`:''}
      </div>
    </div>`).join('');
}
function _pfRenderPendingSubTasks() {
  const cont = g('tk-subtask-preview');
  if (!cont || !window._pendingSubTasks?.length) return;
  cont.style.display='block';
  cont.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📋 Şablondan Alt Görevler (${window._pendingSubTasks.length})</div>`
    + window._pendingSubTasks.map((s,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;background:var(--s2);margin-bottom:4px"><span style="font-size:11px;color:var(--t3)">${i+1}</span><span class="pf-st-lbl" style="font-size:12px;color:var(--t);flex:1">${s.title}</span></div>`).join('');
}

// ════════════════════════════════════════════════════════════════
// 2. GÖREV BAĞIMLILIK ZİNCİRİ
// ════════════════════════════════════════════════════════════════
function _pfLoadDeps()  { return _pfR(_PF.deps,{}); }
function _pfSaveDeps(d) { _pfW(_PF.deps,d); }

window.taskIsBlocked = function(taskId) {
  const deps = _pfLoadDeps();
  const blockers = deps[taskId] || [];
  if (!blockers.length) return false;
  return blockers.some(bid => { const bt=loadTasks().find(t=>t.id===bid); return bt&&!bt.done; });
};
window.addTaskDep = function(taskId, blockerId) {
  blockerId = parseInt(blockerId);
  if (!blockerId || taskId===blockerId) return;
  const deps = _pfLoadDeps();
  if (!deps[taskId]) deps[taskId]=[];
  if (!deps[taskId].includes(blockerId)) deps[taskId].push(blockerId);
  _pfSaveDeps(deps);
  window.renderTaskDepChain?.(taskId);
};
window.removeTaskDep = function(taskId, blockerId) {
  const deps = _pfLoadDeps();
  deps[taskId] = (deps[taskId]||[]).filter(b=>b!==blockerId);
  _pfSaveDeps(deps);
  window.renderTaskDepChain?.(taskId);
};
window.renderTaskDepChain = function(taskId) {
  const cont = g('pdp-dep-chain');
  if (!cont) return;
  const deps  = _pfLoadDeps();
  const tasks = loadTasks();
  const blockers = (deps[taskId]||[]).map(bid=>tasks.find(t=>t.id===bid)).filter(Boolean);
  const blocked  = Object.entries(deps).filter(([tid,bids])=>bids.includes(taskId)).map(([tid])=>tasks.find(t=>t.id===parseInt(tid))).filter(Boolean);
  const chip = (t,role) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:var(--s2);border:1px solid ${t.done?'#22C55E':'var(--b)'};margin-bottom:5px">
    <span style="font-size:14px">${t.done?'✅':(role==='blocker'?'🔒':'⏳')}</span>
    <span style="flex:1;font-size:12px;font-weight:500;color:${t.done?'var(--t3)':'var(--t)'};text-decoration:${t.done?'line-through':'none'}">${t.title}</span>
    ${role==='blocker'?`<button onclick="removeTaskDep(${taskId},${t.id})" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--rd)">✕</button>`:''}
  </div>`;
  const available = tasks.filter(t=>t.id!==taskId&&!(deps[taskId]||[]).includes(t.id)&&!t.done);
  cont.innerHTML=`
    <div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--rd);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">🔒 Bu görev başlamadan önce şunlar bitmeli</div>
      ${blockers.length?blockers.map(t=>chip(t,'blocker')).join(''):'<div style="font-size:12px;color:var(--t3);padding:4px">Bağımlılık yok.</div>'}
    </div>
    ${blocked.length?`<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">⏳ Bu görev bitince şunlar açılacak</div>${blocked.map(t=>chip(t,'blocked')).join('')}</div>`:''}
    ${available.length?`<div style="display:flex;gap:6px;margin-top:6px"><select id="dep-add-sel" class="fi" style="flex:1;padding:6px 8px;font-size:12px"><option value="">— Blocker görev seç —</option>${available.map(t=>`<option value="${t.id}">${t.title}</option>`).join('')}</select><button class="btn btnp" style="font-size:11px;padding:6px 12px" onclick="addTaskDep(${taskId},parseInt(g('dep-add-sel').value)||0)">+ Ekle</button></div>`:''}`;
};

// ════════════════════════════════════════════════════════════════
// 3. ZAMAN TAKİPÇİSİ (Time Tracker)
// ════════════════════════════════════════════════════════════════
function _pfLoadTimeLog()  { return _pfR(_PF.timeLog,{}); }
function _pfSaveTimeLog(d) { _pfW(_PF.timeLog,d); }
function _pfGetRunning()   { return _pfR(_PF.ttRunning,null); }
function _pfSetRunning(v)  { v?_pfW(_PF.ttRunning,v):localStorage.removeItem(_PF.ttRunning); }

let _ttInterval = null;
window.ttStart = function(taskId) {
  const running = _pfGetRunning();
  if (running && running.taskId!==taskId) window.ttStop(running.taskId);
  if (running?.taskId===taskId) { toast('Zaten sayılıyor ⏱','warn'); return; }
  _pfSetRunning({ taskId, startMs:Date.now() });
  _ttTickAll();
  toast('⏱ Süre sayacı başlatıldı');
};
window.ttStop = function(taskId) {
  const running = _pfGetRunning();
  if (!running||running.taskId!==taskId) return;
  const elapsed = Math.floor((Date.now()-running.startMs)/60000);
  _pfSetRunning(null);
  if (elapsed<1) { toast('1 dakikadan kısa — kaydedilmedi','warn'); return; }
  const log = _pfLoadTimeLog();
  if (!log[taskId]) log[taskId]=[];
  log[taskId].push({ ms:running.startMs, min:elapsed, date:new Date().toISOString().slice(0,10), by:_getCU()?.id });
  _pfSaveTimeLog(log);
  const tasks=loadTasks(); const t=tasks.find(x=>x.id===taskId);
  if (t) { t.trackedMin=(t.trackedMin||0)+elapsed; saveTasks(tasks); }
  window.renderTimeTracker?.(taskId);
  toast(`⏱ ${elapsed} dk kaydedildi ✓`);
  renderPusula();
};
function _ttTickAll() {
  clearInterval(_ttInterval);
  _ttInterval = setInterval(()=>{
    const running=_pfGetRunning(); if (!running){clearInterval(_ttInterval);return;}
    const elMin=Math.floor((Date.now()-running.startMs)/60000);
    const elSec=Math.floor(((Date.now()-running.startMs)%60000)/1000);
    const label=`${String(elMin).padStart(2,'0')}:${String(elSec).padStart(2,'0')}`;
    document.querySelectorAll('.pf-tt-display').forEach(el=>{ if(parseInt(el.dataset.tid)===running.taskId) el.textContent=label; });
  },1000);
}
window.renderTimeTracker = function(taskId) {
  const cont = g('pdp-tt-cont'); if (!cont) return;
  const log=_pfLoadTimeLog(); const entries=(log[taskId]||[]).slice(-10).reverse();
  const running=_pfGetRunning(); const isRunning=running?.taskId===taskId;
  const totalMin=(log[taskId]||[]).reduce((s,e)=>s+e.min,0);
  const tasks=loadTasks(); const t=tasks.find(x=>x.id===taskId);
  const estimMin=t?.duration||0;
  cont.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="flex:1">
        <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">TOPLAM SÜRE</div>
        <div style="font-size:20px;font-weight:700;color:var(--t);font-family:'DM Mono',monospace">${totalMin>=60?Math.floor(totalMin/60)+' sa '+totalMin%60+' dk':totalMin+' dk'}</div>
        ${estimMin?`<div style="font-size:11px;color:${totalMin>estimMin?'var(--rd)':'var(--ac)'}">Tahmini: ${estimMin}dk — ${totalMin>estimMin?'⚠️ Aşıldı':'✓'}</div>`:''}
      </div>
      <div style="text-align:center">
        ${isRunning
          ?`<div class="pf-tt-display" data-tid="${taskId}" style="font-family:'DM Mono',monospace;font-size:22px;color:#EF4444;font-weight:700">00:00</div><button onclick="ttStop(${taskId})" class="btn" style="background:#EF4444;color:#fff;border-color:#EF4444;margin-top:4px;font-size:12px;padding:6px 14px">⏹ Durdur</button>`
          :`<button onclick="ttStart(${taskId})" class="btn btnp" style="font-size:13px;padding:8px 18px">▶ Başlat</button>`}
      </div>
    </div>
    ${entries.length?`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">SON OTURUMLAR</div>`+''+entries.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--b);font-size:12px"><span style="color:var(--t2)">${e.date}</span><span style="font-weight:600;color:var(--t)">${e.min} dk</span></div>`).join(''):'<div style="font-size:12px;color:var(--t3);text-align:center;padding:12px 0">Henüz oturum yok.</div>'}`;
  if (isRunning) _ttTickAll();
};

// ════════════════════════════════════════════════════════════════
// 4. GÖREV PUANI & SKOR TABLOSU
// ════════════════════════════════════════════════════════════════
function _pfLoadScores()  { return _pfR(_PF.scores,{}); }
function _pfSaveScores(d) { _pfW(_PF.scores,d); }

function _pfAwardXP(taskId) {
  const t=loadTasks().find(x=>x.id===taskId); if (!t) return;
  const priXP={1:50,2:30,3:15,4:5}; let xp=priXP[t.pri]||15;
  const label=[]; const now=new Date().toISOString().slice(0,10);
  if (t.due&&now<=t.due) { xp+=20; label.push('⚡ Zamanında +20'); }
  if (t.createdAt&&Math.floor((new Date()-new Date(t.createdAt))/86400000)>=7) { xp+=10; label.push('🏋️ Uzun iş +10'); }
  const scores=_pfLoadScores(); const month=now.slice(0,7); const uid=t.uid;
  if (!scores[uid]) scores[uid]={};
  if (!scores[uid][month]) scores[uid][month]=0;
  scores[uid][month]+=xp;
  _pfSaveScores(scores);
  const user=loadUsers().find(u=>u.id===uid);
  toast(`🏆 ${user?.name||'Kullanıcı'} +${xp} XP!${label.length?' ('+label.join(', ')+')':''}`, 'ok');
}

// toggleTask hook — XP ödülü
const _origToggleTask = toggleTask;
function toggleTask(id, done) {
  _origToggleTask(id, done);
  if (done) _pfAwardXP(id);
}

window.openScoreBoard = function() {
  _ensurePfModals();
  _pfRenderScoreBoard();
  window.openMo?.('mo-pf-scores');
};
function _pfRenderScoreBoard() {
  const cont=g('pf-sb-cont'); if (!cont) return;
  const scores=_pfLoadScores(); const users=loadUsers();
  const month=new Date().toISOString().slice(0,7);
  const rows=users.map(u=>({ user:u, monthly:scores[u.id]?.[month]||0, total:Object.values(scores[u.id]||{}).reduce((a,b)=>a+b,0) })).sort((a,b)=>b.monthly-a.monthly);
  const medals=['🥇','🥈','🥉'];
  cont.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">${month} Ayı Sıralaması</div>`
    +rows.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;background:${i===0?'linear-gradient(135deg,rgba(234,179,8,.12),var(--sf))':'var(--sf)'};border:1px solid ${i===0?'rgba(234,179,8,.35)':'var(--b)'};margin-bottom:8px">
      <div style="font-size:22px;width:30px;text-align:center">${medals[i]||'🎯'}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--t)">${r.user.name}</div><div style="font-size:11px;color:var(--t3)">${r.user.role}</div></div>
      <div style="text-align:right"><div style="font-size:18px;font-weight:700;color:${i===0?'#EAB308':'var(--t)'}">${r.monthly} <span style="font-size:11px;font-weight:400">XP</span></div><div style="font-size:10px;color:var(--t3)">Toplam: ${r.total} XP</div></div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════════════
// 5. SESLİ GÖREV NOTU
// ════════════════════════════════════════════════════════════════
let _vn_rec=null, _vn_chunks=[], _vn_taskId=null;

window.vnStart = function(taskId) {
  if (!navigator.mediaDevices?.getUserMedia) { toast('Mikrofon desteklenmiyor','err'); return; }
  _vn_taskId=taskId;
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    _vn_chunks=[]; _vn_rec=new MediaRecorder(stream);
    _vn_rec.ondataavailable=e=>_vn_chunks.push(e.data);
    _vn_rec.onstop=_vnSave;
    _vn_rec.start();
    const btn=g('pdp-vn-btn');
    if (btn) { btn.textContent='⏹ Durdur'; btn.style.background='#EF4444'; btn.style.borderColor='#EF4444'; btn.onclick=()=>vnStop(); }
    let s=0;
    const timer=g('pdp-vn-timer');
    if (timer) { timer._int=setInterval(()=>{ s++; timer.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; if(s>=120) window.vnStop(); },1000); }
    toast('🎙️ Kayıt başladı…');
  }).catch(()=>toast('Mikrofon izni verilmedi','err'));
};
window.vnStop = function() {
  if (_vn_rec?.state==='recording') _vn_rec.stop();
  const timer=g('pdp-vn-timer'); if (timer?._int) clearInterval(timer._int);
  const btn=g('pdp-vn-btn'); if (btn) { btn.textContent='🎙️ Sesli Not Ekle'; btn.style.background=''; btn.style.borderColor=''; btn.onclick=()=>window.vnStart(_vn_taskId); }
};
function _vnSave() {
  const blob=new Blob(_vn_chunks,{type:'audio/webm'}); const r=new FileReader();
  r.onload=ev=>{
    const tasks=loadTasks(); const t=tasks.find(x=>x.id===_vn_taskId); if(!t) return;
    if (!t.voiceNotes) t.voiceNotes=[];
    t.voiceNotes.push({ts:nowTs(),data:ev.target.result,by:_getCU()?.id});
    saveTasks(tasks); window.renderVoiceNotes?.(_vn_taskId); toast('🎙️ Sesli not kaydedildi ✓');
  };
  r.readAsDataURL(blob);
}
window.renderVoiceNotes = function(taskId) {
  const cont=g('pdp-vn-list'); if (!cont) return;
  const t=loadTasks().find(x=>x.id===taskId); const notes=t?.voiceNotes||[]; const users=loadUsers();
  cont.innerHTML=notes.slice().reverse().map(n=>{
    const u=users.find(x=>x.id===n.by);
    return `<div style="padding:8px 10px;border:1px solid var(--b);border-radius:8px;background:var(--sf);margin-bottom:6px"><div style="font-size:10px;color:var(--t3);margin-bottom:5px">${u?.name||'?'} — ${n.ts.slice(0,16)}</div><audio controls src="${n.data}" style="width:100%;height:32px"></audio></div>`;
  }).join('')||'<div style="font-size:12px;color:var(--t3);text-align:center;padding:10px">Henüz sesli not yok.</div>';
};

// ════════════════════════════════════════════════════════════════
// 6. AKILLI TARİH ÖNERİSİ
// ════════════════════════════════════════════════════════════════
window.smartDateParse = function(input) {
  const s=(input||'').trim().toLowerCase(); const d=new Date(); const iso=()=>d.toISOString().slice(0,10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s==='bugün'||s==='today') return iso();
  if (s==='yarın'||s==='tomorrow') { d.setDate(d.getDate()+1); return iso(); }
  if (s==='öbür gün'||s==='öbürsü gün') { d.setDate(d.getDate()+2); return iso(); }
  const days={pazartesi:1,salı:2,çarşamba:3,perşembe:4,cuma:5,cumartesi:6,pazar:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0};
  for (const [k,v] of Object.entries(days)) { if(s===k){const diff=(v-d.getDay()+7)%7||7; d.setDate(d.getDate()+diff); return iso();} }
  const m1=s.match(/(\d+)\s*(gün|day)/); if (m1) { d.setDate(d.getDate()+parseInt(m1[1])); return iso(); }
  const m2=s.match(/(\d+)\s*(hafta|week)/); if (m2) { d.setDate(d.getDate()+parseInt(m2[1])*7); return iso(); }
  const m3=s.match(/(\d+)\s*(ay|month)/); if (m3) { d.setMonth(d.getMonth()+parseInt(m3[1])); return iso(); }
  if (s.includes('ay sonu')||s.includes('month end')) { d.setMonth(d.getMonth()+1); d.setDate(0); return iso(); }
  if (s.includes('ay başı')) { d.setDate(1); return iso(); }
  return null;
};

function _pfAttachSmartDate() {
  const inp=g('tk-due'); if (!inp||inp.dataset.sdReady) return;
  inp.dataset.sdReady='1'; inp.type='text';
  inp.placeholder='YYYY-AA-GG veya "yarın", "cuma", "2 hafta"…';
  let hint=g('tk-due-hint');
  if (!hint) { hint=document.createElement('div'); hint.id='tk-due-hint'; hint.style.cssText='font-size:11px;color:var(--ac);margin-top:2px;min-height:14px'; inp.parentNode.appendChild(hint); }
  inp.addEventListener('input',()=>{ const p=window.smartDateParse(inp.value); hint.textContent=p?'→ '+p:''; });
  inp.addEventListener('blur',()=>{ const p=window.smartDateParse(inp.value); if(p){inp.value=p;hint.textContent='';inp.style.borderColor='#22C55E';setTimeout(()=>inp.style.borderColor='',1200);} });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key==='Tab'){const p=window.smartDateParse(inp.value);if(p)inp.value=p;} });
}
// openAddTask / editTask hook — smart date attach
// NOT: function hoisting sorununu önlemek için arrow function kullan
const _pfSmartOpenAdd = function() {
  // Orijinal openAddTask'ı çağır (window üzerinden, override'dan önce kaydedilmiş)
  if (window._pfRealOpenAdd) { window._pfRealOpenAdd(); }
  setTimeout(_pfAttachSmartDate, 200);
};
const _pfSmartEditTask = function(id) {
  if (window._pfRealEditTask) { window._pfRealEditTask(id); }
  setTimeout(_pfAttachSmartDate, 200);
};

// ════════════════════════════════════════════════════════════════
// 7. GÖREV YORUMU & GÜNCELLEME AKIŞI (Task Log)
// ════════════════════════════════════════════════════════════════
function _pfLoadTaskLog()  { return _pfR(_PF.taskLog,{}); }
function _pfSaveTaskLog(d) { _pfW(_PF.taskLog,d); }

window.addTaskLogEntry = function(taskId, text) {
  text=(text||'').trim(); if(!text){toast('Yorum boş olamaz','warn');return;}
  const log=_pfLoadTaskLog(); if(!log[taskId]) log[taskId]=[];
  log[taskId].push({id:generateNumericId(),ts:nowTs(),by:_getCU()?.id,text});
  _pfSaveTaskLog(log); window.renderTaskLog?.(taskId);
  const inp=g('pdp-log-inp'); if(inp) inp.value=''; toast('Not eklendi ✓');
};
window.delTaskLogEntry = function(taskId, entryId) {
  const log=_pfLoadTaskLog(); if(!log[taskId]) return;
  log[taskId]=log[taskId].filter(e=>e.id!==entryId); _pfSaveTaskLog(log); window.renderTaskLog?.(taskId);
};
window.renderTaskLog = function(taskId) {
  const cont=g('pdp-log-cont'); if (!cont) return;
  const log=_pfLoadTaskLog(); const entries=(log[taskId]||[]).slice().reverse();
  const users=loadUsers(); const cu=_getCU();
  cont.innerHTML=entries.length?entries.map(e=>{
    const u=users.find(x=>x.id===e.by); const canDel=window.isAdmin?.()||e.by===cu?.id;
    return `<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--b)">
      <div style="flex-shrink:0;width:28px;height:28px;border-radius:7px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ac)">${(u?.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:var(--t2);margin-bottom:3px"><span style="font-weight:600;color:var(--t)">${u?.name||'?'}</span><span style="margin-left:6px;color:var(--t3)">${e.ts.slice(0,16)}</span></div>
        <div style="font-size:13px;color:var(--t);line-height:1.6;white-space:pre-wrap">${e.text}</div>
      </div>
      ${canDel?`<button onclick="delTaskLogEntry(${taskId},${e.id})" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--t3);align-self:flex-start;padding:2px">✕</button>`:''}
    </div>`;
  }).join(''):'<div style="font-size:12px;color:var(--t3);text-align:center;padding:16px">Henüz güncelleme notu yok.</div>';
};

// ════════════════════════════════════════════════════════════════
// 8. ODAK MODU — POMODORO
// ════════════════════════════════════════════════════════════════
let _pomo = null;

window.pomoStart = function(taskId, workMin) {
  workMin = workMin||25; _pfPomoStop();
  const endMs=Date.now()+workMin*60000;
  _pomo={taskId,endMs,mode:'work'};
  _pfEnsurePomoWidget(); _pfPomoTick();
  _pomo.int=setInterval(_pfPomoTick,1000);
  toast(`🍅 ${workMin} dk odak modu başladı!`);
  document.title=`🍅 Odak — ${_pfPomoTitle(taskId)}`;
};
function _pfPomoStop() {
  if (!_pomo) return; clearInterval(_pomo.int); _pomo=null;
  const w=g('pf-pomo-widget'); if(w) w.style.display='none';
  document.title=document.title.replace(/^🍅.*?— /,'');
}
window.pomoStop=_pfPomoStop;
function _pfPomoTitle(taskId) { const t=loadTasks().find(x=>x.id===taskId); return t?.title?.slice(0,30)||'Görev'; }
function _pfPomoTick() {
  if (!_pomo) return;
  const rem=Math.max(0,_pomo.endMs-Date.now());
  const m=String(Math.floor(rem/60000)).padStart(2,'0'); const s=String(Math.floor((rem%60000)/1000)).padStart(2,'0');
  const label=`${m}:${s}`; const el=g('pf-pomo-time'); if(el) el.textContent=label;
  document.title=`🍅 ${label} — ${_pfPomoTitle(_pomo.taskId)}`;
  if (rem<=0) { clearInterval(_pomo.int); _pfPomoComplete(); }
}
function _pfPomoComplete() {
  const taskId=_pomo?.taskId; const mode=_pomo?.mode; _pomo=null; document.title='';
  try { const ctx=new(window.AudioContext||window.webkitAudioContext)(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=880; gain.gain.setValueAtTime(0.4,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1); osc.start(); osc.stop(ctx.currentTime+1); }catch(e){}
  if (mode==='work') {
    const log=_pfLoadTimeLog(); if(!log[taskId]) log[taskId]=[]; log[taskId].push({ms:Date.now()-25*60000,min:25,date:new Date().toISOString().slice(0,10),by:_getCU()?.id,pomo:true}); _pfSaveTimeLog(log);
    const tasks=loadTasks(); const t=tasks.find(x=>x.id===taskId); if(t){t.trackedMin=(t.trackedMin||0)+25;saveTasks(tasks);}
    const w=g('pf-pomo-widget');
    if (w) { w.innerHTML=`<span style="font-size:18px">🍅</span><span style="font-weight:700;font-size:14px">Pomodoro bitti!</span><button onclick="pomoStart(${taskId},5)" class="btn btnp" style="font-size:11px;padding:4px 10px">5 dk Mola</button><button onclick="pomoStart(${taskId},25)" class="btn btns" style="font-size:11px;padding:4px 10px">Yeniden</button><button onclick="pomoStop()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3)">×</button>`; }
    toast('🍅 Pomodoro tamamlandı! Kısa mola ver.');
  } else { _pfPomoStop(); toast('☕ Mola bitti, hazır olduğunda başlat.'); }
}
function _pfEnsurePomoWidget() {
  let w=g('pf-pomo-widget');
  if (!w) { w=document.createElement('div'); w.id='pf-pomo-widget'; w.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-family:inherit'; document.body.appendChild(w); }
  w.style.display='flex'; const taskId=_pomo?.taskId;
  w.innerHTML=`<span style="font-size:20px">🍅</span><div><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">ODAK MODU</div><div style="font-size:12px;font-weight:600;color:var(--t);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_pfPomoTitle(taskId)}</div></div><div id="pf-pomo-time" style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:var(--t);min-width:52px;text-align:center">25:00</div><button onclick="pomoStop()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1" title="İptal">×</button>`;
}

// ════════════════════════════════════════════════════════════════
// 9. GÖREV TEKRARLAMA KURALLARI
// ════════════════════════════════════════════════════════════════
window.setTaskRecurring = function(taskId, rule) {
  const tasks=loadTasks(); const t=tasks.find(x=>x.id===taskId); if(!t) return;
  t.recurring=rule; saveTasks(tasks); toast('Tekrarlama kuralı kaydedildi ✓');
};
window.removeTaskRecurring = function(taskId) {
  const tasks=loadTasks(); const t=tasks.find(x=>x.id===taskId); if(!t) return;
  delete t.recurring; saveTasks(tasks); toast('Tekrarlama kaldırıldı');
};
window.processRecurringTasks = function() {
  const tasks=loadTasks(); const todayS=new Date().toISOString().slice(0,10); let changed=false;
  tasks.filter(t=>t.done&&t.recurring).forEach(t=>{
    const nextDue=_pfCalcNextDue(t.due||todayS,t.recurring); if(!nextDue||nextDue>todayS) return;
    const exists=tasks.find(x=>x.recurringOrigin===t.id&&x.due===nextDue&&!x.done); if(exists) return;
    tasks.push({...t,id:generateNumericId(),done:false,status:'todo',due:nextDue,createdAt:nowTs(),recurringOrigin:t.id,subTasks:(t.subTasks||[]).map(s=>({...s,done:false}))});
    changed=true;
  });
  if (changed) { saveTasks(tasks); renderPusula(); console.info('[PF] Recurring görevler oluşturuldu'); }
};
function _pfCalcNextDue(fromDate, rule) {
  if (!rule||!fromDate) return null;
  const d=new Date(fromDate);
  if (rule.type==='weekly') d.setDate(d.getDate()+7);
  else if (rule.type==='monthly') { d.setMonth(d.getMonth()+1); if(rule.dayOfMonth) d.setDate(Math.min(rule.dayOfMonth,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); }
  else if (rule.type==='interval') { const n=rule.interval||1; if(rule.unit==='day') d.setDate(d.getDate()+n); else if(rule.unit==='week') d.setDate(d.getDate()+n*7); else if(rule.unit==='month') d.setMonth(d.getMonth()+n); }
  else return null;
  return d.toISOString().slice(0,10);
}
window.renderRecurringUI = function(taskId) {
  const cont=g('pdp-recurring-cont'); if(!cont) return;
  const t=loadTasks().find(x=>x.id===taskId); const r=t?.recurring;
  const lbl=()=>{ if(!r) return 'Yok'; if(r.type==='weekly') return 'Her Hafta'; if(r.type==='monthly') return `Her Ay${r.dayOfMonth?' '+r.dayOfMonth+'. gün':''}`; if(r.type==='interval') return `Her ${r.interval} ${r.unit==='day'?'Gün':r.unit==='week'?'Hafta':'Ay'}`; return 'Özel'; };
  cont.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">TEKRARLAMA</div><div style="font-size:13px;font-weight:600;color:var(--t);margin-top:2px">${lbl()}</div></div><button onclick="openRecurringEditor(${taskId})" class="btn btns" style="font-size:11px;padding:5px 11px">✏️ Kural Belirle</button></div>${r?`<button onclick="removeTaskRecurring(${taskId});renderRecurringUI(${taskId})" class="btn" style="font-size:11px;padding:4px 10px;color:var(--rd)">Tekrarlamayı Kaldır</button>`:''}`;
};
window.openRecurringEditor = function(taskId) {
  _ensurePfModals();
  const saveBtn=g('pf-rec-save-btn'); if(saveBtn) saveBtn.onclick=()=>_pfSaveRecurringRule(taskId);
  window.updateRecurringForm?.();
  window.openMo?.('mo-pf-recurring');
};
window.updateRecurringForm = function() {
  const type=g('pf-rec-type')?.value;
  if(g('pf-rec-day-row'))      g('pf-rec-day-row').style.display      =type==='monthly' ?'block':'none';
  if(g('pf-rec-interval-row')) g('pf-rec-interval-row').style.display =type==='interval'?'block':'none';
};
function _pfSaveRecurringRule(taskId) {
  const type=g('pf-rec-type')?.value||'weekly'; const rule={type};
  if(type==='monthly') rule.dayOfMonth=parseInt(g('pf-rec-day')?.value||'1');
  if(type==='interval') { rule.interval=parseInt(g('pf-rec-interval')?.value||'1'); rule.unit=g('pf-rec-unit')?.value||'day'; }
  window.setTaskRecurring(taskId,rule);
  window.closeMo?.('mo-pf-recurring');
  window.renderRecurringUI?.(taskId);
}

// ════════════════════════════════════════════════════════════════
// 10. GANTT TOGGLE (Görev Haritası)
// ════════════════════════════════════════════════════════════════
// renderPusula Gantt hook — hoisting sorununu önlemek için export bloğunda wrap edilir
// burada sadece Gantt flag'ini kontrol eden helper tanımlanır
function _pfGanttCheck() {
  if (localStorage.getItem('ak_pus_view')==='gantt') _pfRenderGantt();
}

function _pfRenderGantt() {
  const main=g('pus-main-view'); if (!main) return;
  const tasks=visTasks(); const users=loadUsers(); const todayS=new Date().toISOString().slice(0,10);
  const withDates=tasks.filter(t=>t.due||t.start);
  if (!withDates.length) { main.innerHTML=`<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:36px;margin-bottom:12px">📅</div><div style="font-size:15px;font-weight:600">Gantt görünümü için görevlere tarih ekleyin</div></div>`; return; }
  const dates=withDates.flatMap(t=>[t.start,t.due].filter(Boolean)).sort();
  const startD=new Date(dates[0]); const endD=new Date(dates[dates.length-1]);
  startD.setDate(startD.getDate()-2); endD.setDate(endD.getDate()+4);
  const totalDays=Math.ceil((endD-startD)/86400000);
  const dayW=Math.max(28,Math.floor((main.clientWidth-220)/totalDays)); const colW=220;
  const PRI_COLOR={1:'#EF4444',2:'#F97316',3:'#6366F1',4:'#94A3B8'};
  const headerCells=[];
  for (let i=0;i<totalDays;i++) { const d=new Date(startD); d.setDate(d.getDate()+i); const ds=d.toISOString().slice(0,10); const isT=ds===todayS; const isW=d.getDay()===0||d.getDay()===6; headerCells.push(`<div style="width:${dayW}px;min-width:${dayW}px;flex-shrink:0;text-align:center;font-size:9px;font-weight:${isT?'700':'400'};color:${isT?'var(--ac)':isW?'var(--t3)':'var(--t2)'};border-right:1px solid var(--b);padding:5px 0;background:${isT?'rgba(99,102,241,.06)':''}">${d.getDate()}<br><span style="font-size:8px">${['Pa','Pt','Sa','Ça','Pe','Cu','Ct'][d.getDay()]}</span></div>`); }
  const rows=withDates.map(t=>{
    const u=users.find(x=>x.id===t.uid); const ini=(u?.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const tS=new Date(t.start||t.due); const tE=new Date(t.due||t.start);
    const offL=Math.max(0,Math.floor((tS-startD)/86400000)); const barW=Math.max(1,Math.ceil((tE-tS)/86400000)+1);
    const color=PRI_COLOR[t.pri]||'#6366F1'; const isDone=t.done||t.status==='done';
    const barCells=[];
    for (let i=0;i<totalDays;i++) {
      if (i<offL||i>=offL+barW) { const d2=new Date(startD); d2.setDate(d2.getDate()+i); barCells.push(`<div style="width:${dayW}px;min-width:${dayW}px;flex-shrink:0;border-right:1px solid var(--b);height:36px;background:${d2.getDay()===0||d2.getDay()===6?'rgba(0,0,0,.02)':''}"></div>`); }
      else if (i===offL) { barCells.push(`<div style="width:${dayW*barW}px;min-width:${dayW*barW}px;flex-shrink:0;height:36px;padding:6px 4px;box-sizing:border-box;cursor:pointer" onclick="openPusDetail(${t.id})"><div style="height:100%;border-radius:4px;background:${isDone?'#22C55E':color}22;border:1.5px solid ${isDone?'#22C55E':color};display:flex;align-items:center;padding:0 7px;overflow:hidden"><span style="font-size:10px;font-weight:600;color:${isDone?'#22C55E':color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isDone?'✓ ':''} ${t.title}</span></div></div>`); i+=barW-1; }
    }
    return `<div style="display:flex;align-items:stretch;border-bottom:1px solid var(--b);min-height:44px"><div style="width:${colW}px;min-width:${colW}px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 12px;border-right:1px solid var(--b);cursor:pointer" onclick="openPusDetail(${t.id})"><div style="width:4px;height:28px;border-radius:2px;background:${color};flex-shrink:0"></div><div style="width:22px;height:22px;border-radius:6px;background:var(--al);color:var(--ac);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${ini}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:${isDone?'var(--t3)':'var(--t)'};text-decoration:${isDone?'line-through':'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div><div style="font-size:10px;color:var(--t3)">${t.due||'—'}</div></div></div><div style="display:flex;flex:1">${barCells.join('')}</div></div>`;
  });
  main.innerHTML=`<div style="overflow-x:auto;border:1px solid var(--b);border-radius:10px"><div style="display:flex;position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)"><div style="width:${colW}px;min-width:${colW}px;padding:10px 12px;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-right:1px solid var(--b)">GÖREV</div><div style="display:flex">${headerCells.join('')}</div></div>${rows.join('')}</div>`;
}

// ════════════════════════════════════════════════════════════════
// DETAY PANELİ — YENİ SEKMELER (⏱ Süre, 📝 Notlar, 🎙 Ses, 🔗 Bağımlılık, 🔁 Tekrar)
// ════════════════════════════════════════════════════════════════
// openPusDetail hook — export bloğunda wrap edilir
function _pfOpenDetailHook(taskId) {
  setTimeout(()=>{ _pfInjectExtraTabs(taskId); _pfCheckBlockerWarn(taskId); }, 150);
}

function _pfInjectExtraTabs(taskId) {
  const tabbar=g('pdp-tabbar'); if (!tabbar||tabbar.dataset.pfExtended) return;
  tabbar.dataset.pfExtended='1';
  const extraTabs=[
    {key:'timelog',icon:'⏱',label:'Süre'},
    {key:'tasklog',icon:'📝',label:'Notlar'},
    {key:'voice',  icon:'🎙️',label:'Ses'},
    {key:'deps',   icon:'🔗',label:'Bağımlılık'},
    {key:'recur',  icon:'🔁',label:'Tekrar'},
  ];
  extraTabs.forEach(tab=>{
    if (g('pdp-tab-'+tab.key)) return;
    const btn=document.createElement('button');
    btn.id='pdp-tab-'+tab.key; btn.className='pdp-t';
    btn.style.cssText='flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:11px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit';
    btn.innerHTML=`${tab.icon} ${tab.label}`;
    btn.onclick=()=>_pfSwitchExtra(taskId,tab.key,btn);
    tabbar.appendChild(btn);
  });
  // Extra pane konteyneri
  const bodyScroll=tabbar.nextElementSibling; if(!bodyScroll) return;
  if (!g('pdp-pane-extra')) {
    const pane=document.createElement('div'); pane.id='pdp-pane-extra';
    pane.style.cssText='display:none;padding:16px;overflow-y:auto';
    bodyScroll.appendChild(pane);
  }
}

function _pfSwitchExtra(taskId, key, activeBtn) {
  // Tüm tab butonlarını sıfırla
  document.querySelectorAll('.pdp-t').forEach(b=>{ b.style.color='var(--t2)'; b.style.fontWeight='500'; b.style.borderBottom='2px solid transparent'; });
  activeBtn.style.color='var(--ac)'; activeBtn.style.fontWeight='600'; activeBtn.style.borderBottom='2px solid var(--ac)';
  // Orijinal panellerı gizle
  ['info','chat','files','perms'].forEach(k=>{ const el=g('pdp-pane-'+k); if(el) el.style.display='none'; });
  const extra=g('pdp-pane-extra'); if (!extra) return;
  extra.style.display='block';

  if (key==='timelog') {
    extra.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">⏱ ZAMAN TAKİPÇİSİ</div><div id="pdp-tt-cont"></div>`;
    window.renderTimeTracker?.(taskId);
  } else if (key==='tasklog') {
    extra.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">📝 GÜNCELLEME NOTLARI</div><div id="pdp-log-cont" style="margin-bottom:14px"></div><div style="display:flex;gap:8px"><textarea class="fi" id="pdp-log-inp" rows="2" style="flex:1;resize:none;font-size:13px" placeholder="Kısa güncelleme notu… (tedarikçiden geri dönüş bekleniyor, vs.)"></textarea><button class="btn btnp" onclick="addTaskLogEntry(${taskId},document.getElementById('pdp-log-inp')?.value)" style="align-self:flex-end;padding:9px 14px;font-size:13px">➤</button></div>`;
    window.renderTaskLog?.(taskId);
  } else if (key==='voice') {
    extra.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">🎙️ SESLİ NOTLAR</div><div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px;background:var(--s2);border-radius:10px"><button id="pdp-vn-btn" class="btn btnp" onclick="vnStart(${taskId})" style="font-size:13px;padding:9px 16px">🎙️ Sesli Not Ekle</button><div id="pdp-vn-timer" style="font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:var(--t2)">00:00</div></div><div id="pdp-vn-list" style="display:flex;flex-direction:column;gap:8px"></div>`;
    window.renderVoiceNotes?.(taskId);
  } else if (key==='deps') {
    extra.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">🔗 BAĞIMLILIK ZİNCİRİ</div><div id="pdp-dep-chain"></div>`;
    window.renderTaskDepChain?.(taskId);
  } else if (key==='recur') {
    extra.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">🔁 TEKRARLAMA KURALI</div><div id="pdp-recurring-cont"></div>`;
    window.renderRecurringUI?.(taskId);
  }
}

function _pfCheckBlockerWarn(taskId) {
  if (!window.taskIsBlocked?.(taskId)) return;
  const metaEl=g('pdp-meta'); if(!metaEl||metaEl.querySelector('.pf-dep-warn')) return;
  const warn=document.createElement('span'); warn.className='pf-dep-warn';
  warn.style.cssText='padding:3px 9px;border-radius:6px;font-size:11px;background:rgba(239,68,68,.1);color:#EF4444;margin-left:6px';
  warn.textContent='🔒 Bekleyen bağımlılık var'; metaEl.appendChild(warn);
}

// ════════════════════════════════════════════════════════════════
// GÖREV MODAL — ŞABLON + SMART DATE PATCH
// ════════════════════════════════════════════════════════════════
function _pfPatchTaskModal() {
  const footer=document.querySelector('#mo-task .moc > div:last-of-type');
  if (!footer||footer.dataset.pfPatched) return;
  footer.dataset.pfPatched='1';
  // Şablon butonu — footer başına ekle
  const tplBtn=document.createElement('button');
  tplBtn.className='btn btns'; tplBtn.style.fontSize='12px'; tplBtn.textContent='📋 Şablon';
  tplBtn.onclick=()=>window.openTaskTemplates?.();
  const firstBtn=footer.querySelector('button'); if(firstBtn) footer.insertBefore(tplBtn,firstBtn);
  // Alt görev önizleme konteyneri
  const body=document.querySelector('#mo-task .moc > div:not(:first-child):not(:last-child)');
  if (body&&!g('tk-subtask-preview')) {
    const prev=document.createElement('div'); prev.id='tk-subtask-preview';
    prev.style.cssText='display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--b)';
    body.appendChild(prev);
  }
}

// setPusView Gantt toggle eklentisi — hoisting sorununu önlemek için export'ta wrap edilir
// _pfSmartSetPusView export bloğunda tanımlanır
function _pfSetPusViewGanttHook(v, btn) {
  if (window._pfRealSetPusView) window._pfRealSetPusView(v, btn);
  // Gantt özeldir — ayrıca handle et
  if (v==='gantt') { setTimeout(_pfRenderGantt, 50); }
}

// ════════════════════════════════════════════════════════════════
// MODALLER — ensurePfModals()
// ════════════════════════════════════════════════════════════════
function _ensurePfModals() {
  if (g('mo-pf-templates')) return;
  const wrap=document.createElement('div'); wrap.id='pf-modals-root';
  wrap.innerHTML=`
<!-- Şablonlar -->
<div class="mo" id="mo-pf-templates">
  <div class="moc" style="max-width:520px;max-height:85vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
    <div style="padding:18px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <div><div style="font-size:15px;font-weight:700;color:var(--t)">📋 Görev Şablonları</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Tek tıkla alt görevli iş paketi oluştur</div></div>
      <button onclick="closeMo('mo-pf-templates')" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>
    </div>
    <div id="pf-tpl-cont" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"></div>
  </div>
</div>
<!-- Skor Tablosu -->
<div class="mo" id="mo-pf-scores">
  <div class="moc" style="max-width:440px;padding:0;overflow:hidden;max-height:85vh;display:flex;flex-direction:column">
    <div style="padding:18px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <div><div style="font-size:15px;font-weight:700;color:var(--t)">🏆 Skor Tablosu</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Aylık XP sıralaması</div></div>
      <button onclick="closeMo('mo-pf-scores')" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>
    </div>
    <div id="pf-sb-cont" style="flex:1;overflow-y:auto;padding:18px 16px"></div>
  </div>
</div>
<!-- Tekrarlama Kural Editörü -->
<div class="mo" id="mo-pf-recurring">
  <div class="moc" style="max-width:400px;padding:0;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:14px;font-weight:700;color:var(--t)">🔁 Tekrarlama Kuralı</div>
      <button onclick="closeMo('mo-pf-recurring')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
      <div><div class="fl" style="margin-bottom:6px">TİP</div>
        <select class="fi" id="pf-rec-type" onchange="updateRecurringForm()">
          <option value="weekly">Her Hafta</option>
          <option value="monthly">Her Ay (belirli gün)</option>
          <option value="interval">Özel Aralık</option>
        </select>
      </div>
      <div id="pf-rec-day-row" style="display:none"><div class="fl" style="margin-bottom:6px">AY'IN GÜNÜ</div><input type="number" class="fi" id="pf-rec-day" min="1" max="31" value="1"></div>
      <div id="pf-rec-interval-row" style="display:none"><div class="fl" style="margin-bottom:6px">ARALIK</div><div style="display:flex;gap:8px"><input type="number" class="fi" id="pf-rec-interval" min="1" value="1" style="width:90px"><select class="fi" id="pf-rec-unit"><option value="day">Gün</option><option value="week">Hafta</option><option value="month">Ay</option></select></div></div>
      <div style="background:var(--al);border-radius:8px;padding:10px 12px;font-size:11px;color:var(--ac)">💡 Görev tamamlandığında bir sonraki otomatik oluşturulur.</div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btns" onclick="closeMo('mo-pf-recurring')">İptal</button>
      <button class="btn btnp" id="pf-rec-save-btn">Kaydet</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(wrap);
}

// ════════════════════════════════════════════════════════════════
// PUSULA ARAÇ ÇUBUĞU — Gantt + Skor + Şablon butonları
// ════════════════════════════════════════════════════════════════
function _pfInjectToolbarBtns() {
  // index.html'de pus-view-toggle class'ı ile id="pus-view-row" var
  const vRow = document.getElementById('pus-view-row')
    || document.querySelector('.pus-view-toggle')
    || document.querySelector('.pus-view-tabs, .pvt-row, [id^="pus-v-"]')?.parentElement;
  if (!vRow||vRow.dataset.pfBtns) return;
  vRow.dataset.pfBtns='1';
  const btns=[
    {id:'pus-v-gantt', cls:'pvt-btn cvb', text:'📅 Gantt', onclick:()=>{ document.querySelectorAll('.pvt-btn,.cvb').forEach(b=>b.classList.remove('on','active')); const b=g('pus-v-gantt'); b?.classList.add('on','active'); setPusView('gantt',b); } },
    {cls:'pvt-btn', text:'⬜', title:'Alt görevleri gizle/aç', onclick:()=>{ window._pusToggleAllSubTasks?.(); } },
    {cls:'pvt-btn', text:'🏆', title:'Skor Tablosu', onclick:()=>window.openScoreBoard?.() },
    {cls:'pvt-btn', text:'📋', title:'Görev Şablonları', onclick:()=>window.openTaskTemplates?.() },
  ];
  btns.forEach(cfg=>{ const b=document.createElement('button'); b.className=cfg.cls; if(cfg.id)b.id=cfg.id; if(cfg.title)b.title=cfg.title; b.style.fontSize='12px'; b.innerHTML=cfg.text; b.onclick=cfg.onclick; vRow.appendChild(b); });
}

// ════════════════════════════════════════════════════════════════
// BAŞLANGIÇ
// ════════════════════════════════════════════════════════════════
(function _pfInit() {
  // Recurring görevleri kontrol (günde bir)
  const lastCheck=localStorage.getItem('ak_pf_rec_check');
  const todayStr=new Date().toISOString().slice(0,10);
  if (lastCheck!==todayStr) { localStorage.setItem('ak_pf_rec_check',todayStr); window.processRecurringTasks?.(); }

  // Çalışan zamanlayıcı varsa devam et
  if (_pfGetRunning()) _ttTickAll();

  // DOM hazır olduğunda araç çubuğu butonlarını inject et
  const _setup=()=>{ setTimeout(()=>{ _pfInjectToolbarBtns(); _pfPatchTaskModal(); _ensurePfModals(); },800); };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',_setup); else _setup();

  // openMo hook — her modal açılışında şablon patch kontrol
  const _origOpenMo2=window.openMo;
  window.openMo=function(id,...args){
    _origOpenMo2?.(id,...args);
    if (id==='mo-task') setTimeout(_pfPatchTaskModal,80);
  };

  console.info('[Pusula v2.0] 10 yeni özellik aktif ✓');
})();

// ════════════════════════════════════════════════════════════════
// AYLIK OTOMATİK EXCEL İNDİRME  [v2.1.0]
// Her ayın son günü saat 00:00'da tüm görevleri Excel'e indirir
// ════════════════════════════════════════════════════════════════
function _checkMonthlyExport() {
  try {
    const now      = new Date();
    const lastKey  = 'ak_pus_monthly_export';
    const lastDone = localStorage.getItem(lastKey);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if (lastDone === monthKey) return; // Bu ay zaten yapıldı

    // Son gün mü?
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isLastDay = tomorrow.getMonth() !== now.getMonth();
    if (!isLastDay) return;

    // Saat 00:00-01:00 arası mı?
    if (now.getHours() > 1) return;

    // Export yap
    if (typeof exportTasksXlsx === 'function') {
      exportTasksXlsx();
      localStorage.setItem(lastKey, monthKey);
      window.toast?.('📊 Aylık görev raporu otomatik indirildi', 'ok');
      logActivity('system', `Aylık otomatik Excel export: ${monthKey}`);
    }
  } catch(e) {
    console.warn('[Pusula] Aylık export hatası:', e);
  }
}

// Uygulama açılışında ve her saat kontrol et
window._monthlyExportTimer = setInterval(_checkMonthlyExport, 60 * 60 * 1000);
setTimeout(_checkMonthlyExport, 5000); // İlk açılışta 5sn sonra kontrol


// ════════════════════════════════════════════════════════════
// EISENHOWer MATRIX DRAG & DROP  [fix v2.3.1]
// ════════════════════════════════════════════════════════════
window._eisDrop = function(event, quadId) {
  event.preventDefault();
  const taskId = parseInt(event.dataTransfer.getData('taskId'));
  if (!taskId || !quadId) return;
  const tasks = loadTasks();
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  // Kadrana göre öncelik + durum haritası
  const Q_MAP = {
    q1: { pri: 1, status: 'inprogress', label: 'Hemen Yap'   },
    q2: { pri: 1, status: 'todo',       label: 'Planla'       },
    q3: { pri: 3, status: 'inprogress', label: 'Devret'       },
    q4: { pri: 4, status: 'todo',       label: 'Ele'          },
  };
  const map = Q_MAP[quadId];
  if (!map) return;
  t.pri      = map.pri;
  t.status   = map.status;
  t.quadrant = quadId;
  saveTasks(tasks);
  window.toast?.('Kadran: ' + map.label + ' ✓', 'ok');
  const re = window._renderEisenhower;
  if (re) setTimeout(re, 80);
};


// ════════════════════════════════════════════════════════════════
// ALT GÖREV GELİŞTİRME ÖNERİLERİ  [v2.3.1]
//
// 1. AKILLI DELEGE — Alt görevi başka kullanıcıya devret
//    Davet gönder → Karşı taraf kabul/ret etsin
//    Admin: direkt ata, Staff: davet gönder
//
// 2. BAĞIMLILIK ZİNCİRİ — Alt görevler sıralı tamamlansın
//    "Bu alt görevi tamamlamadan şunu başlatamazsın"
//    Bloklanmış alt görev gri + kilit ikonu ile gösterilsin
//
// 3. TEKRARLAYAN ALT GÖREV — Her hafta/ay otomatik oluşsun
//    "Her Pazartesi kontrol listesi" gibi rutin alt görevler
//    Ana görev şablonuna bağlı tekrarlama kuralı
//
// ════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════
// DEPARTMAN YÖNETİMİ  [v2.3.2]
// Ayarlar üzerinden departman ekle / sil / renklendir
// ════════════════════════════════════════════════════════════════
function openDeptManager() {
  const existing = document.getElementById('mo-dept-mgr');
  if (existing) existing.remove();

  const tasks = loadTasks();
  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))].sort();

  const mo = document.createElement('div');
  mo.className = 'mo';
  mo.id = 'mo-dept-mgr';
  

  const listHTML = depts.length
    ? depts.map(d => {
        const c = getDeptColor(d);
        const count = tasks.filter(t => t.department === d).length;
        return `<div class="dept-mgr-item">
          <div class="dept-mgr-dot" style="background:${c}"></div>
          <span class="dept-mgr-name">${d}</span>
          <span style="font-size:10px;color:var(--t3);margin-right:8px">${count} görev</span>
          <input type="color" value="${c}" onchange="setDeptColor('${d}',this.value)"
            style="width:24px;height:24px;border:none;border-radius:4px;cursor:pointer;padding:0"
            title="Rengi değiştir">
        </div>`;
      }).join('')
    : '<div style="font-size:12px;color:var(--t3);padding:8px">Henüz departman yok</div>';

  mo.innerHTML = `<div class="modal" style="max-width:420px">
    <div class="mt">🏷 Departman Yönetimi</div>
    <div style="font-size:12px;color:var(--t3);margin-bottom:12px">
      Görev eklerken <strong>Departman</strong> alanına yazarak yeni departman oluşturabilirsiniz.
      Burada mevcut departmanları görebilir ve renklerini değiştirebilirsiniz.
    </div>

    <div class="fr">
      <div class="fl">YENİ DEPARTMAN EKLE</div>
      <div style="display:flex;gap:6px">
        <input class="fi" id="new-dept-inp" placeholder="Örn: IT, Satınalma, Üretim…" style="flex:1">
        <button class="btn btnp" onclick="
          const v=document.getElementById('new-dept-inp').value.trim();
          if(!v){window.toast?.('Departman adı girin','err');return;}
          const tasks=loadTasks();
          const exists=tasks.some(t=>t.department===v);
          if(exists){window.toast?.('Bu departman zaten var','warn');return;}
          const dummy={id:generateNumericId(),title:'__dept_init__',department:v,status:'done',done:true,uid:window.Auth?.getCU?.()?.id||0,pri:4,createdAt:nowTs()};
          tasks.push(dummy);
          saveTasks(tasks);
          window.toast?.(v+' departmanı eklendi ✓','ok');
          document.getElementById('mo-dept-mgr').remove();
          setTimeout(openDeptManager,100);
        ">Ekle</button>
      </div>
    </div>

    <div style="margin-top:12px">
      <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">MEVCUT DEPARTMANLAR</div>
      <div id="dept-mgr-list">${listHTML}</div>
    </div>

    <div class="mf">
      <button class="btn" onclick="document.getElementById('mo-dept-mgr').remove()">Kapat</button>
    </div>
  </div>`;

  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openDeptManager = openDeptManager;

/** FIX 7E: Görev performans skoru — kişi bazlı rapor */
window._openGorevPerformans = function() {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var users = loadUsers().filter(function(u) { return u.status === 'active'; });
  var tasks = loadTasks().filter(function(t) { return !t.isDeleted; });
  var todayS = new Date().toISOString().slice(0, 10);
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var data = users.map(function(u) {
    var my = tasks.filter(function(t) { return t.uid === u.id; });
    var tamamlanan = my.filter(function(t) { return t.done; }).length;
    var toplam = my.length;
    var gecikmi = my.filter(function(t) { return !t.done && t.due && t.due < todayS; }).length;
    // Ortalama gecikme
    var gecikGun = 0;
    var gecikSayisi = 0;
    my.forEach(function(t) {
      if (t.done && t.completedAt && t.due) {
        var fark = Math.ceil((new Date(t.completedAt) - new Date(t.due)) / 86400000);
        if (fark > 0) { gecikGun += fark; gecikSayisi++; }
      }
    });
    var ortGecikme = gecikSayisi ? Math.round(gecikGun / gecikSayisi * 10) / 10 : 0;
    var oran = toplam ? Math.round(tamamlanan / toplam * 100) : 0;
    var skor = Math.min(100, Math.round(oran - gecikmi * 5 - ortGecikme * 2));
    skor = Math.max(0, skor);
    return { id: u.id, ad: u.name, dept: u.dept || u.access?.[0] || '—', toplam: toplam, tamamlanan: tamamlanan, gecikmi: gecikmi, oran: oran, ortGecikme: ortGecikme, skor: skor };
  }).sort(function(a, b) { return b.skor - a.skor; });
  var ex = document.getElementById('mo-gorev-perf'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-gorev-perf'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:15px;font-weight:700">Görev Performans Skoru</div>'
    + '<div style="padding:16px 20px;max-height:55vh;overflow-y:auto">'
    + data.map(function(p) {
        var sc = p.skor >= 70 ? '#16A34A' : p.skor >= 40 ? '#D97706' : '#DC2626';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--b)">'
          + '<div style="width:32px;height:32px;border-radius:50%;background:' + sc + '18;color:' + sc + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">' + p.skor + '</div>'
          + '<div style="flex:1"><div style="font-size:12px;font-weight:600">' + esc(p.ad) + '</div><div style="font-size:9px;color:var(--t3)">' + esc(p.dept) + '</div></div>'
          + '<div style="font-size:10px;text-align:right;color:var(--t3)">' + p.tamamlanan + '/' + p.toplam + ' (%' + p.oran + ')</div>'
          + '<div style="font-size:10px;text-align:right;color:' + (p.gecikmi ? '#DC2626' : '#16A34A') + '">' + p.gecikmi + ' gecikmiş</div>'
          + '<div style="font-size:10px;text-align:right;color:var(--t3)">Ort: ' + p.ortGecikme + 'g</div></div>';
      }).join('')
    + '</div><div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px"><button onclick="window._exportGorevPerfXlsx?.()" style="padding:5px 12px;border:0.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);font-size:11px;cursor:pointer;font-family:inherit">Excel</button><button class="btn" onclick="document.getElementById(\'mo-gorev-perf\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** FIX 3: Görev performans Excel export */
window._exportGorevPerfXlsx = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  var users = loadUsers().filter(function(u) { return u.status === 'active'; });
  var tasks = loadTasks().filter(function(t) { return !t.isDeleted; });
  var todayS = new Date().toISOString().slice(0, 10);
  var rows = [['Personel', 'Departman', 'Toplam Görev', 'Tamamlanan', 'Tamamlanma %', 'Gecikmiş', 'Ort. Gecikme (gün)', 'Performans Skoru']];
  users.forEach(function(u) {
    var my = tasks.filter(function(t) { return t.uid === u.id; });
    var tamamlanan = my.filter(function(t) { return t.done; }).length;
    var toplam = my.length;
    var gecikmi = my.filter(function(t) { return !t.done && t.due && t.due < todayS; }).length;
    var gecikGun = 0, gecikSayisi = 0;
    my.forEach(function(t) { if (t.done && t.completedAt && t.due) { var fark = Math.ceil((new Date(t.completedAt) - new Date(t.due)) / 86400000); if (fark > 0) { gecikGun += fark; gecikSayisi++; } } });
    var ortGecikme = gecikSayisi ? Math.round(gecikGun / gecikSayisi * 10) / 10 : 0;
    var oran = toplam ? Math.round(tamamlanan / toplam * 100) : 0;
    var skor = Math.max(0, Math.min(100, Math.round(oran - gecikmi * 5 - ortGecikme * 2)));
    rows.push([u.name, u.dept || '—', toplam, tamamlanan, oran, gecikmi, ortGecikme, skor]);
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Görev Performans');
  XLSX.writeFile(wb, 'gorev-performans-' + todayS + '.xlsx');
  window.toast?.('Görev performans raporu indirildi ✓', 'ok');
};

const Pusula = {
  init: _pusInit,
  render:       renderPusula,
  openAdd:      openAddTask,
  edit:         editTask,
  save:         saveTask,
  del:          delTask,
  toggle:       toggleTask,
  openDetail:   openPusDetail,
  closeDetail:  closePusDetail,
  quickUpdate:  quickUpdateTask,
  setView:      setPusView,
  setFilter:    setPusQuickFilter,
  clearFilters: clearPusFilters,
  exportXlsx:   exportTasksXlsx,
  updateBadge:  updatePusBadge,
  // Alt görev
  addSub:       addSubTask,
  toggleSub:    toggleSubTask,
  delSub:       delSubTask,
  editSub:      openSubTaskEdit,
  renderSubs:   renderSubTasks,
  checkAlarms:  checkSubTaskAlarms,
  showInstantNotif: _showInstantTaskNotif,
  // Chat
  openChat:     openTaskChat,
  renderChat:   renderTaskChatMsgs,
  sendChat:     sendTaskChatMsg,
  // Yetki yardımcıları
  canEdit:      _canEditTask,
  isOwner:      _isTaskOwner,
  // İç yardımcılar (gerektiğinde dışarıdan çağrılabilir)
  populateUsers:        populatePusUsers,
  populateParticipants: populateTaskParticipants,
  visTasks,
  getDueChip,
  getStatusPill,
  getAvatar,
  // ── Yeni Özellikler v2.0 ────────────────────────────────────
  openTemplates:    openTaskTemplates,
  applyTemplate:    applyTaskTemplate,
  openScoreBoard:   openScoreBoard,
  ttStart, ttStop,
  vnStart, vnStop,
  pomoStart, pomoStop,
  smartDateParse,
  taskIsBlocked:  isTaskBlocked,
  addTaskDep:     setTaskDependency,
  removeTaskDep:  removeTaskDependency,
  openBulkAssign,
  addTaskLogEntry,
  setTaskRecurring, removeTaskRecurring,
  processRecurringTasks,
};

// Tarayıcı global nesnesi
if (typeof window !== 'undefined') {
  window.Pusula = Pusula;
  // V18 eklenen fonksiyonlar
  window.checkYaklasanEtkinlikler = checkYaklasanEtkinlikler;
  window.renderEtkinlik      = renderEtkinlik;
  window.openEtkinlikModal   = openEtkinlikModal;
  window.saveEtkinlik        = saveEtkinlik;
  window.delEtkinlik         = delEtkinlik;

  // ── Geriye uyumluluk: eski HTML inline onclick'ler çalışmaya devam eder ──
  // renderPusula — Gantt destekli wrapper (hoisting sorunu olmadan)
  const _realRenderPusula = renderPusula;
  window.renderPusula = function() {
    _realRenderPusula();
    _pfGanttCheck();
  };
window.toggleFocus     = toggleFocus;

window.getPusDayTotal  = function() {
  const tasks = loadTasks();
  const mins  = PUS_DAY_FOCUS.reduce((s,id) => {
    const t = tasks.find(x=>x.id===id); return s+(t?.duration||0);
  }, 0);
  if (!mins) return null;
  return mins>=60 ? Math.floor(mins/60)+' saat'+(mins%60?' '+mins%60+' dk':'') : mins+' dk';
};
window.renderFocusPanel = renderFocusPanel;
  // Orijinal fonksiyonları _pfReal* olarak kaydet (hoisting öncesi)
  window._pfRealOpenAdd        = openAddTask;   // satır 1405'teki orijinal
  window._pfRealEditTask       = editTask;      // satır 1431'deki orijinal
  // Smart date wrapper'ları global yap
  window.openAddTask           = _pfSmartOpenAdd;
  window.editTask              = _pfSmartEditTask;
  window.saveTask              = saveTask;
  window.delTask               = delTask;
  window.toggleTask            = toggleTask;
  // openPusDetail — extra tab hook ile birlikte
  window._pfRealOpenDetail = openPusDetail;  // satır 766'daki orijinal
  window.openPusDetail = function(taskId) {
    window._pfRealOpenDetail(taskId);
    _pfOpenDetailHook(taskId);
  };
  window.closePusDetail        = closePusDetail;
  window.pdpSwitch             = pdpSwitch;
  window.pdpRenderInfo         = pdpRenderInfo;
  window.pdpQuickStatus        = pdpQuickStatus;
  window.pdpRenderChat         = pdpRenderChat;
  window.pdpRefreshChatMsgs    = pdpRefreshChatMsgs;
  window.pdpSendChat           = pdpSendChat;
  window.pdpRenderFiles        = pdpRenderFiles;
  window.pdpUploadFiles        = pdpUploadFiles;
  window.pdpHandleDrop         = pdpHandleDrop;
  window.pdpDelFile            = pdpDelFile;
  window.pdpUpdateFileBadge    = pdpUpdateFileBadge;
  window.pdpRenderPerms        = pdpRenderPerms;
  window.pdpUpdatePerm         = pdpUpdatePerm;
  window.pdpAddPerm            = pdpAddPerm;
  window.closePusDetail        = closePusDetail;
  window.quickUpdateTask       = quickUpdateTask;
  // setPusView — Gantt destekli wrapper (hoisting sorunu olmadan)
  window._pfRealSetPusView = setPusView;  // satır 1658'deki orijinal
  window.setPusView = function(v, btn) {
    window._pfRealSetPusView(v, btn);
    _pfSetPusViewGanttHook(v, btn);
  };
  window.setPusQuickFilter     = setPusQuickFilter;
  window.clearPusFilters       = clearPusFilters;
  window.updatePusBadge        = updatePusBadge;
  window.updateTkPriBar        = updateTkPriBar;
  window.exportTasksXlsx       = exportTasksXlsx;
  window.importTasksXlsx       = importTasksXlsx;
  window.downloadTaskTemplate  = downloadTaskTemplate;
  window.visTasks              = visTasks;
  window.populatePusUsers      = populatePusUsers;
  window.populateTaskParticipants = populateTaskParticipants;
  window.addSubTask            = addSubTask;
  window._saveSubTask          = _saveSubTask;
  window.toggleSubTask         = toggleSubTask;
  window.delSubTask            = delSubTask;
  window.openSubTaskEdit       = openSubTaskEdit;
  window._updateSubTask        = _updateSubTask;
  window.renderSubTasks        = renderSubTasks;

  /** Tüm alt görevleri toplu gizle/aç */
  window._pusToggleAllSubTasks = function() {
    var tasks = loadTasks().filter(function(t) { return !t.isDeleted && (t.subTasks || []).length > 0; });
    // Çoğunluk açıksa kapat, kapalıysa aç
    var closedCount = tasks.filter(function(t) { return localStorage.getItem('pus_sub_collapsed_' + t.id) === '1'; }).length;
    var shouldCollapse = closedCount < tasks.length / 2;
    tasks.forEach(function(t) {
      localStorage.setItem('pus_sub_collapsed_' + t.id, shouldCollapse ? '1' : '0');
    });
    renderPusula();
    window.toast?.(shouldCollapse ? 'Alt görevler gizlendi' : 'Alt görevler açıldı', 'ok');
  };
  window.openTaskChat          = openTaskChat;
  window.renderTaskChatMsgs    = renderTaskChatMsgs;
  window.sendTaskChatMsg       = sendTaskChatMsg;
  window.getDueChip            = getDueChip;
  window.getStatusPill         = getStatusPill;
  window.getAvatar             = getAvatar;
  // ── Yeni Özellikler (v2.0) ──────────────────────────────────
  window.openTaskTemplates     = openTaskTemplates;
  window.applyTaskTemplate     = applyTaskTemplate;
  window.saveCurrentAsTemplate = saveCurrentAsTemplate;
  window.deleteTaskTemplate    = deleteTaskTemplate;
  window.taskIsBlocked         = taskIsBlocked;
  window.addTaskDep            = addTaskDep;
  window.removeTaskDep         = removeTaskDep;
  window.renderTaskDepChain    = renderTaskDepChain;
  window.ttStart               = ttStart;
  window.ttStop                = ttStop;
  window.renderTimeTracker     = renderTimeTracker;
  window.openScoreBoard        = openScoreBoard;
  window.vnStart               = vnStart;
  window.vnStop                = vnStop;
  window.renderVoiceNotes      = renderVoiceNotes;
  window.smartDateParse        = smartDateParse;
  window.addTaskLogEntry       = addTaskLogEntry;
  window.delTaskLogEntry       = delTaskLogEntry;
  window.renderTaskLog         = renderTaskLog;
  window.pomoStart             = pomoStart;
  window.pomoStop              = pomoStop;
  window.setTaskRecurring      = setTaskRecurring;
  window.removeTaskRecurring   = removeTaskRecurring;
  window.processRecurringTasks = processRecurringTasks;
  window.renderRecurringUI     = renderRecurringUI;
  window.openRecurringEditor   = openRecurringEditor;
  window.updateRecurringForm   = updateRecurringForm;
}


// ════════════════════════════════════════════════════════════════
// PUSULA v8.5 — YENİ ÖZELLİKLER
// ════════════════════════════════════════════════════════════════

// ── 1. COUNTDOWN (Canlı Geri Sayım) ─────────────────────────────
let _v85CountdownInterval = null;

function _v85StartCountdown() {
  if (_v85CountdownInterval) clearInterval(_v85CountdownInterval);
  _v85UpdateCountdowns();
  _v85CountdownInterval = setInterval(_v85UpdateCountdowns, 1000);
}

function _v85UpdateCountdowns() {
  const now = Date.now();
  document.querySelectorAll('.pusula-v85-countdown[data-deadline]').forEach(el => {
    const deadline = new Date(el.dataset.deadline.replace(' ', 'T')).getTime();
    if (isNaN(deadline)) return;
    const diff = deadline - now;
    if (diff <= 0) {
      el.textContent = '⚠️ Süre doldu!';
      el.style.background = 'rgba(239,68,68,.15)';
      el.style.color = '#EF4444';
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const d = Math.floor(h / 24);

    let txt, bg, color, anim = '';
    if (h < 1) {
      // < 1 saat — kırmızı + titreme
      txt = `${m}d ${s}s`;
      bg = 'rgba(239,68,68,.15)';
      color = '#EF4444';
      anim = 'pusula-v85-shake 0.5s infinite';
    } else if (h < 5) {
      // < 5 saat — turuncu
      txt = `${h}s ${m}d`;
      bg = 'rgba(245,158,11,.12)';
      color = '#D97706';
      anim = '';
    } else if (d > 0) {
      txt = `${d}g ${h % 24}s`;
      bg = 'var(--s2)';
      color = 'var(--t3)';
    } else {
      txt = `${h}s ${m}d`;
      bg = 'var(--s2)';
      color = 'var(--t3)';
    }
    el.textContent = '⏱ ' + txt;
    el.style.background = bg;
    el.style.color = color;
    el.style.animation = anim;
  });
}

// ── 2. DEPARTMAN İŞ YÜKÜ HEATMAP ────────────────────────────────
function _v85RenderHeatmap() {
  const tasks = loadTasks().filter(t => !t.done && t.status !== 'done');
  const total = tasks.length || 1;
  const depts = {};
  tasks.forEach(t => {
    const d = t.department || 'Diğer';
    depts[d] = (depts[d] || 0) + 1;
  });

  const sorted = Object.entries(depts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return '';

  const colors = {
    'Finans':    '#6366F1', 'Lojistik': '#3B82F6', 'İK':    '#10B981',
    'IT':        '#8B5CF6', 'Satış':    '#F59E0B', 'Operasyon': '#EF4444', 'Diğer': '#6B7280'
  };

  const items = sorted.map(([dept, count]) => {
    const pct = Math.round(count / total * 100);
    const col = colors[dept] || '#6B7280';
    return `<div class="pusula-v85-hm-item">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700;color:var(--t)">${dept}</span>
        <span style="font-size:11px;font-family:monospace;color:var(--t3)">${count} iş · ${pct}%</span>
      </div>
      <div style="height:6px;background:var(--b);border-radius:4px;overflow:hidden">
        <div style="height:100%;background:${col};border-radius:4px;width:${pct}%;transition:width .5s ease"></div>
      </div>
    </div>`;
  }).join('');

  return `<div class="pusula-v85-heatmap">
    <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">🌡️ Departman İş Yükü</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
      ${items}
    </div>
  </div>`;
}

function _v85InjectHeatmap() {
  const toolbar = document.querySelector('.pus-toolbar');
  if (!toolbar) return;
  let hm = document.getElementById('pusula-v85-heatmap-wrap');
  if (!hm) {
    hm = document.createElement('div');
    hm.id = 'pusula-v85-heatmap-wrap';
    hm.style.cssText = 'margin-bottom:12px';
    toolbar.insertAdjacentElement('beforebegin', hm);
  }
  hm.innerHTML = _v85RenderHeatmap();
}

// ── 3. MODALDAKİ DEPARTMAN İŞ YÜKÜ ─────────────────────────────
window._tkUpdateDeptWorkload = function() {
  const dept = g('tk-dept')?.value;
  const wrap = g('tk-dept-workload');
  const bar  = g('tk-dept-wl-bar');
  const pct  = g('tk-dept-wl-pct');
  const lbl  = g('tk-dept-wl-label');
  if (!dept || !wrap) { if (wrap) wrap.style.display = 'none'; return; }

  const tasks = loadTasks().filter(t => !t.done && t.status !== 'done');
  const total = tasks.length || 1;
  const deptCount = tasks.filter(t => t.department === dept).length;
  const p = Math.round(deptCount / total * 100);

  wrap.style.display = 'block';
  if (lbl) lbl.textContent = `${dept} departmanı iş yükü`;
  if (pct) pct.textContent = p + '%';
  if (bar) {
    bar.style.width = p + '%';
    bar.style.background = p > 60 ? '#EF4444' : p > 30 ? '#F59E0B' : 'var(--ac)';
  }
};

// ── 4. MODAL ACCORDION KONTROLLERI ──────────────────────────────
window._tkToggleSubtasks = function() {
  const wrap  = g('tk-subtasks-wrap');
  const arrow = g('tk-st-arrow');
  if (!wrap) return;
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
};

window._tkToggleAdvanced = function() {
  const wrap  = g('tk-advanced-wrap');
  const arrow = g('tk-adv-arrow');
  if (!wrap) return;
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(90deg)';
};

// ── 5. MODAL ALT GÖREV EKLEME ────────────────────────────────────
let _v85TempSubtasks = [];

window._tkAddSubtask = function() {
  const list = g('tk-subtasks-list');
  if (!list) return;
  const idx = _v85TempSubtasks.length;
  _v85TempSubtasks.push({ title: '', status: 'todo', uid: 0, done: false, pri: 3 });

  const users = loadUsers();
  const userOpts = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

  const row = document.createElement('div');
  row.className = 'tk-st-row';
  row.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;flex-direction:column;gap:8px';
  row.innerHTML = `
    <!-- Başlık satırı -->
    <div style="display:flex;align-items:center;gap:8px">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--b);flex-shrink:0;margin-top:1px" id="st-dot-${idx}"></div>
      <input class="fi" placeholder="Alt görev başlığı…" style="flex:1;padding:7px 10px;font-size:13px;border-radius:8px;font-weight:500"
        oninput="_v85TempSubtasks[${idx}].title=this.value;window._updateStDot?.(${idx},this.value)">
      <button type="button" onclick="this.closest('.tk-st-row').remove();_v85TempSubtasks[${idx}]=null;window._updateStCount?.()"
        style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:15px;padding:2px 4px;border-radius:5px;flex-shrink:0;transition:color .15s"
        onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='var(--t3)'">✕</button>
    </div>
    <!-- Detay satırı -->
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:7px;padding-left:14px">
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">SORUMLU</div>
        <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].uid=parseInt(this.value)">
          <option value="0">— Seçiniz —</option>
          ${userOpts}
        </select>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">DURUM</div>
        <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].status=this.value;window._updateStDotStatus?.(${idx},this.value)">
          <option value="todo">📋 Yapılacak</option>
          <option value="inprogress">🔄 Devam</option>
          <option value="review">👀 İnceleme</option>
          <option value="done">✅ Bitti</option>
        </select>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">ÖNCELİK</div>
        <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].pri=parseInt(this.value)">
          <option value="1">🔴</option>
          <option value="2">🟠</option>
          <option value="3" selected>🔵</option>
          <option value="4">⚪</option>
        </select>
      </div>
    </div>`;

  list.appendChild(row);
  window._updateStCount?.();

  // Focus input
  const inp = row.querySelector('input');
  if (inp) setTimeout(() => inp.focus(), 50);
};

// Dot rengi — durum takip
window._updateStDot = function(idx, val) {
  const dot = document.getElementById('st-dot-' + idx);
  if (dot) dot.style.background = val.trim() ? 'var(--ac)' : 'var(--b)';
};
window._updateStDotStatus = function(idx, status) {
  const dot = document.getElementById('st-dot-' + idx);
  if (!dot) return;
  const colors = { todo:'var(--b)', inprogress:'#3B82F6', review:'#F59E0B', done:'#10B981' };
  dot.style.background = colors[status] || 'var(--b)';
};
window._updateStCount = function() {
  const list = document.getElementById('tk-subtasks-list');
  const cnt  = document.getElementById('tk-st-count');
  if (!list || !cnt) return;
  const n = list.querySelectorAll('.tk-st-row').length;
  cnt.textContent = n ? n + ' alt görev' : '';
};

function _v85GetTempSubtasks() {
  return _v85TempSubtasks.filter(Boolean).filter(s => s.title.trim());
}

function _v85ResetSubtasks(existing) {
  _v85TempSubtasks = [];
  const list = g('tk-subtasks-list');
  const cnt  = g('tk-st-count');
  if (!list) return;
  list.innerHTML = '';
  if (existing && existing.length) {
    existing.forEach((s, idx) => {
      _v85TempSubtasks.push({ ...s });
      const users   = loadUsers();
      const userOpts = users.map(u => `<option value="${u.id}" ${u.id===s.uid?'selected':''}>${u.name}</option>`).join('');
      const dotColors = { todo:'var(--b)', inprogress:'#3B82F6', review:'#F59E0B', done:'#10B981' };
      const dotColor  = dotColors[s.status] || 'var(--b)';
      const row = document.createElement('div');
      row.className = 'tk-st-row';
      row.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;flex-direction:column;gap:8px';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:6px;height:6px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:1px" id="st-dot-${idx}"></div>
          <input class="fi" value="${(s.title||'').replace(/"/g,'&quot;')}" placeholder="Alt görev başlığı…"
            style="flex:1;padding:7px 10px;font-size:13px;border-radius:8px;font-weight:500"
            oninput="_v85TempSubtasks[${idx}].title=this.value;window._updateStDot?.(${idx},this.value)">
          <button type="button" onclick="this.closest('.tk-st-row').remove();_v85TempSubtasks[${idx}]=null;window._updateStCount?.()"
            style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:15px;padding:2px 4px;border-radius:5px;flex-shrink:0;transition:color .15s"
            onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='var(--t3)'">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:7px;padding-left:14px">
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">SORUMLU</div>
            <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].uid=parseInt(this.value)">
              <option value="0">— Seçiniz —</option>
              ${userOpts}
            </select>
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">DURUM</div>
            <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].status=this.value;window._updateStDotStatus?.(${idx},this.value)">
              <option value="todo" ${s.status==='todo'?'selected':''}>📋 Yapılacak</option>
              <option value="inprogress" ${s.status==='inprogress'?'selected':''}>🔄 Devam</option>
              <option value="review" ${s.status==='review'?'selected':''}>👀 İnceleme</option>
              <option value="done" ${s.status==='done'?'selected':''}>✅ Bitti</option>
            </select>
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">ÖNCELİK</div>
            <select class="fi" style="padding:5px 8px;font-size:11px;border-radius:7px" onchange="_v85TempSubtasks[${idx}].pri=parseInt(this.value)">
              <option value="1" ${s.pri===1?'selected':''}>🔴</option>
              <option value="2" ${s.pri===2?'selected':''}>🟠</option>
              <option value="3" ${(!s.pri||s.pri===3)?'selected':''}>🔵</option>
              <option value="4" ${s.pri===4?'selected':''}>⚪</option>
            </select>
          </div>
        </div>`;
      list.appendChild(row);
    });
  }
  if (cnt) cnt.textContent = list.children.length ? list.children.length + ' alt görev' : '';
}

// ── 6. openAddTask / editTask HOOK — dept + time alanlarını doldur
const _v85OrigOpenAdd = window.openAddTask;
const _v85OrigEditTask = window.editTask;

window.openAddTask = function() {
  _v85ResetSubtasks([]);
  if (g('tk-dept')) g('tk-dept').value = '';
  if (g('tk-due-time')) g('tk-due-time').value = '';
  if (g('tk-cost')) g('tk-cost').value = '';
  if (g('tk-dept-workload')) g('tk-dept-workload').style.display = 'none';
  window._pfRealOpenAdd?.();
};

window.editTask = function(id) {
  const t = loadTasks().find(x => x.id === id);
  if (t) {
    _v85ResetSubtasks(t.subTasks || []);
    setTimeout(() => {
      if (g('tk-dept') && t.department) { g('tk-dept').value = t.department; window._tkUpdateDeptWorkload?.(); }
      if (g('tk-due-time') && t.due_time) g('tk-due-time').value = t.due_time;
      if (g('tk-cost') && t.cost) g('tk-cost').value = t.cost;
    }, 100);
  }
  window._pfRealEditTask?.(id);
};

// ── 7. saveTask HOOK — v85 subtask'ları ekle ────────────────────
const _v85OrigSave = window.saveTask;
window.saveTask = function() {
  // v85 temp subtask'larını window._pendingSubTasks'a enjekte et
  const subs = _v85GetTempSubtasks();
  if (subs.length) {
    window._pendingSubTasks = subs.map((s, i) => ({
      id: generateNumericId(),
      title: s.title,
      done: s.status === 'done',
      status: s.status || 'todo',
      uid: s.uid || 0
    }));
  }
  _v85OrigSave?.();
};

// ── 8. MOTİVASYON ŞERİDİ ───────────────────────────────────────
const _v85Quotes = [
  { text: 'Zamanı yönetemeyen hiçbir şeyi yönetemez.', author: 'Peter Drucker' },
  { text: 'Başarı tesadüf değil; hazırlık, sıkı çalışma ve hatalardan öğrenmektir.', author: 'Colin Powell' },
  { text: 'Fırsatlar çalışkan insanların zihninde parlar.', author: 'Thomas Edison' },
  { text: 'Zorluklar içinde fırsatlar yatar.', author: 'Albert Einstein' },
  { text: 'Disiplin, motivasyonun bittiği yerde devreye girer.', author: 'Elbert Hubbard' },
  { text: 'Planlama yaparken uzun düşün, uygularken hızlı hareket et.', author: 'Sun Tzu' },
  { text: 'Bir takımın gücü her üyesinden, her üyenin gücü takımdan gelir.', author: 'Phil Jackson' },
  { text: 'Verimliliğin sırrı önceliklendirmedir.', author: 'Stephen Covey' },
  { text: 'Hiçbir rüzgar, nereye gittiğini bilmeyen gemiye yardım edemez.', author: 'Seneca' },
  { text: 'Mükemmellik bir eylem değil, bir alışkanlıktır.', author: 'Aristoteles' },
  { text: 'Her büyük başarı bir zamanlar imkansız görünüyordu.', author: 'Nelson Mandela' },
  { text: 'Önce anlamaya çalış, sonra anlaşılmaya.', author: 'Stephen Covey' },
  { text: 'En büyük risk, hiç risk almamaktır.', author: 'Mark Zuckerberg' },
];

function _v85InjectMotivationBar() {
  const panel = document.getElementById('panel-pusula');
  if (!panel) return;
  if (document.getElementById('pusula-v85-motivebar')) return;

  const bar = document.createElement('div');
  bar.id = 'pusula-v85-motivebar';
  bar.style.cssText = [
    'margin-top:20px',
    'padding:10px 24px',
    'border-top:1px solid var(--b)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:10px',
    'opacity:0',
    'transition:opacity .6s ease',
    'overflow:hidden',
    'white-space:nowrap',
  ].join(';');
  panel.appendChild(bar);

  function _showQuote() {
    const q = _v85Quotes[Math.floor(Math.random() * _v85Quotes.length)];
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.innerHTML = [
        '<span style="font-size:13px;color:var(--t3);opacity:.4;flex-shrink:0">❝</span>',
        `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t2);letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis">${q.text}</span>`,
        `<span style="font-size:10px;color:var(--t3);opacity:.55;flex-shrink:0;font-weight:600">— ${q.author}</span>`,
      ].join('');
      bar.style.opacity = '1';
    }, 400);
  }

  _showQuote();
  setInterval(_showQuote, 12000);
}

// ── 9. CSS EKLEMELERİ ───────────────────────────────────────────
(function _v85InjectCSS() {
  if (document.getElementById('pusula-v85-css')) return;
  const s = document.createElement('style');
  s.id = 'pusula-v85-css';
  s.textContent = `
    @keyframes pusula-v85-shake {
      0%,100% { transform: translateX(0); }
      25%      { transform: translateX(-2px); }
      75%      { transform: translateX(2px); }
    }
    .pusula-v85-modal {
      box-shadow: 0 25px 60px rgba(0,0,0,.18);
    }
    .pusula-v85-heatmap {
      background: var(--sf);
      border: 1px solid var(--b);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    .pusula-v85-hm-item {
      padding: 6px 0;
    }
    .pusula-v85-dept-badge {
      display: inline-block;
    }
    /* Focus widget Apple Card stili */
    #db-day-focus .card, #db-pusula-stats .card {
      border-radius: 16px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,.06) !important;
    }
  `;
  document.head.appendChild(s);
})();

// ── 10. renderPusula SONRASI HOOK ────────────────────────────────
const _v85OrigRenderPusula = window.renderPusula;
window.renderPusula = function() {
  _v85OrigRenderPusula?.();
  setTimeout(() => {
    _v85StartCountdown();
    _v85InjectHeatmap();
    _v85InjectMotivationBar();
  }, 50);
};

// ── 11. TASK DEPENDENCİ — alt görevler bitmeden tamamlanmasın ───
const _v85OrigToggle = window.Pusula?.toggle;
if (window.Pusula) {
  const _origToggle = window.Pusula.toggle;
  window.Pusula.toggle = function(id, done) {
    if (done) {
      const task = loadTasks().find(t => t.id === id);
      if (task && task.subTasks && task.subTasks.length > 0) {
        const unfinished = task.subTasks.filter(s => !s.done && s.status !== 'done');
        if (unfinished.length > 0) {
          window.toast?.(`⚠️ ${unfinished.length} alt görev henüz tamamlanmadı!`, 'warn');
          return;
        }
      }
    }
    _origToggle?.call(window.Pusula, id, done);
  };
}

console.info('[Pusula v8.5] Modernizasyon aktif ✓');



// ════════════════════════════════════════════════════════════════
// PUSULA v8.5 — PERSONELİŞ YÜKÜ & PERFORMANS MODÜLü
// ════════════════════════════════════════════════════════════════

let _wlPanelOpen = false;
let _wlTab = 'workload'; // 'workload' | 'perf' | 'trends'

/**
 * Ana render — panel-pusula içindeki #pus-workload-panel'e yazar
 */
function renderWorkloadPanel() {
  const cont = g('pus-workload-panel');
  if (!cont) return;

  const users   = loadUsers().filter(u => u.status === 'active');
  const tasks   = loadTasks();
  const todayS  = new Date().toISOString().slice(0, 10);

  // ── Veri hesapla ────────────────────────────────────────────
  const userData = users.map(u => {
    const myTasks    = tasks.filter(t => t.uid === u.id);
    const active     = myTasks.filter(t => !t.done && t.status !== 'done');
    const done       = myTasks.filter(t => t.done || t.status === 'done');
    const overdue    = active.filter(t => t.due && t.due < todayS);
    const critical   = active.filter(t => t.pri === 1);
    const inprogress = active.filter(t => t.status === 'inprogress');
    const review     = active.filter(t => t.status === 'review');

    // Bu ay tamamlanan
    const thisMonth = new Date().toISOString().slice(0, 7);
    const doneThisMonth = done.filter(t => (t.created_at || t.due || '').slice(0, 7) === thisMonth);

    // Ortalama tamamlama süresi (gün)
    const avgDays = done.filter(t => t.created_at && t.due).reduce((acc, t, _, arr) => {
      const diff = (new Date(t.due) - new Date(t.created_at.slice(0,10))) / 86400000;
      return acc + (isNaN(diff) ? 0 : Math.abs(diff)) / arr.length;
    }, 0);

    // Tamamlama oranı
    const completionRate = myTasks.length > 0
      ? Math.round(done.length / myTasks.length * 100) : 0;

    // İş yükü skoru (daha yüksek = daha yüklü)
    const workloadScore = active.length + (critical.length * 2) + (overdue.length * 3);

    // Verimlilik skoru (tamamlama oranı - gecikme oranı)
    const efficiencyScore = Math.max(0, Math.min(100,
      completionRate - (myTasks.length > 0 ? Math.round(overdue.length / myTasks.length * 30) : 0)
    ));

    // Trend: son 7 günde tamamlanan
    const week7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const recentDone = done.filter(t => (t.created_at || '') > week7).length;

    return {
      user: u, myTasks, active, done, overdue, critical,
      inprogress, review, doneThisMonth, avgDays,
      completionRate, workloadScore, efficiencyScore, recentDone
    };
  }).sort((a, b) => b.workloadScore - a.workloadScore);

  const maxWorkload = Math.max(...userData.map(d => d.workloadScore), 1);
  const maxTasks    = Math.max(...userData.map(d => d.active.length), 1);

  cont.innerHTML = _buildWorkloadHTML(userData, maxWorkload, maxTasks, todayS);

  // Event: tab switch
  cont.querySelectorAll('[data-wl-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _wlTab = btn.dataset.wlTab;
      cont.querySelectorAll('[data-wl-tab]').forEach(b => {
        b.style.background = b === btn ? 'var(--ac)' : 'var(--s2)';
        b.style.color = b === btn ? '#fff' : 'var(--t3)';
      });
      cont.querySelector('#pus-wl-content').innerHTML =
        _wlTab === 'workload' ? _buildWorkloadRows(userData, maxWorkload, maxTasks, todayS)
        : _wlTab === 'perf'    ? _buildPerfRows(userData)
        : _buildTrendsRows(userData);
    });
  });
}

function _buildWorkloadHTML(userData, maxWorkload, maxTasks, todayS) {
  const cu = _getCU();
  const isAdm = window.isAdmin?.();

  return `
  <div class="pusula-v85-wl-panel">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:15px;font-weight:700;color:var(--t)">👥 Personel Analizi</div>
        <div style="font-size:11px;color:var(--t3)">${userData.length} aktif personel</div>
      </div>
      <!-- Tab bar -->
      <div style="display:flex;background:var(--s2);border-radius:10px;padding:3px;gap:2px">
        <button data-wl-tab="workload" style="background:var(--ac);color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s">⚖️ İş Yükü</button>
        <button data-wl-tab="perf" style="background:var(--s2);color:var(--t3);border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s">📊 Performans</button>
        <button data-wl-tab="trends" style="background:var(--s2);color:var(--t3);border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s">📈 Trend</button>
      </div>
    </div>

    <!-- Özet kartlar -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      ${_buildSummaryCards(userData)}
    </div>

    <!-- İçerik alanı -->
    <div id="pus-wl-content">
      ${_buildWorkloadRows(userData, maxWorkload, maxTasks, todayS)}
    </div>
  </div>`;
}

function _buildSummaryCards(userData) {
  const totalActive   = userData.reduce((a, d) => a + d.active.length, 0);
  const totalOverdue  = userData.reduce((a, d) => a + d.overdue.length, 0);
  const avgCompletion = userData.length
    ? Math.round(userData.reduce((a, d) => a + d.completionRate, 0) / userData.length) : 0;
  const topPerf = userData.sort((a,b) => b.efficiencyScore - a.efficiencyScore)[0];

  return `
    <div class="pusula-v85-wl-summary-card">
      <div class="pusula-v85-wl-sc-val" style="color:var(--ac)">${totalActive}</div>
      <div class="pusula-v85-wl-sc-lbl">Aktif Görev</div>
    </div>
    <div class="pusula-v85-wl-summary-card">
      <div class="pusula-v85-wl-sc-val" style="color:${totalOverdue > 0 ? 'var(--rd)' : 'var(--gr)'}">${totalOverdue}</div>
      <div class="pusula-v85-wl-sc-lbl">Gecikmiş</div>
    </div>
    <div class="pusula-v85-wl-summary-card">
      <div class="pusula-v85-wl-sc-val" style="color:${avgCompletion >= 70 ? 'var(--gr)' : avgCompletion >= 40 ? 'var(--am)' : 'var(--rd)'}">${avgCompletion}%</div>
      <div class="pusula-v85-wl-sc-lbl">Ort. Tamamlama</div>
    </div>
    <div class="pusula-v85-wl-summary-card">
      <div class="pusula-v85-wl-sc-val" style="color:var(--gr);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${topPerf?.user?.name || '—'}">${topPerf?.user?.name?.split(' ')[0] || '—'}</div>
      <div class="pusula-v85-wl-sc-lbl">🏆 En Verimli</div>
    </div>`;
}

function _buildWorkloadRows(userData, maxWorkload, maxTasks, todayS) {
  if (!userData.length) return '<div style="padding:24px;text-align:center;color:var(--t3)">Personel bulunamadı</div>';

  const rows = userData.map(d => {
    const { user: u, active, done, overdue, critical, inprogress, review, workloadScore } = d;
    const idx   = loadUsers().indexOf(loadUsers().find(x => x.id === u.id));
    const avc   = window.AVC || window._getAVC?.() || [['#EEEDFE','#26215C']];
    const c     = avc[Math.max(idx,0) % avc.length];
    const av    = `<div style="width:32px;height:32px;border-radius:10px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0">${window.initials?.(u.name) || u.name.slice(0,2).toUpperCase()}</div>`;
    const barW  = Math.round((workloadScore / maxWorkload) * 100);
    const barColor = barW > 70 ? '#EF4444' : barW > 40 ? '#F59E0B' : '#10B981';
    const load  = barW > 70 ? '🔴 Yüksek' : barW > 40 ? '🟡 Orta' : '🟢 Düşük';

    return `
    <div class="pusula-v85-wl-row" onclick="window._wlFilterByUser?.(${u.id}, '${u.name}')" title="${u.name} için görevleri filtrele">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">
        ${av}
        <div style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t)">${u.name}</span>
            <span style="font-size:10px;padding:1px 7px;border-radius:5px;background:var(--s2);color:var(--t3);font-weight:600">${u.role === 'admin' ? '👑' : u.role === 'manager' ? '👔' : u.role === 'lead' ? '⭐' : '👤'} ${u.role}</span>
            <span style="font-size:10px;padding:1px 7px;border-radius:5px;font-weight:700;background:${barW>70?'rgba(239,68,68,.1)':barW>40?'rgba(245,158,11,.1)':'rgba(16,185,129,.1)'};color:${barColor}">${load}</span>
          </div>
          <!-- Yük barı -->
          <div style="height:5px;background:var(--b);border-radius:4px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;background:${barColor};border-radius:4px;width:${barW}%;transition:width .5s ease"></div>
          </div>
          <!-- Chip'ler -->
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${active.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-blue">${active.length} aktif</span>` : ''}
            ${inprogress.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-purple">${inprogress.length} devam</span>` : ''}
            ${review.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-orange">${review.length} inceleme</span>` : ''}
            ${critical.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-red">⚠️ ${critical.length} kritik</span>` : ''}
            ${overdue.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-red">🕐 ${overdue.length} gecikmiş</span>` : ''}
            ${done.length ? `<span class="pusula-v85-wl-chip pusula-v85-wl-chip-green">✅ ${done.length} bitti</span>` : ''}
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;padding-left:12px">
        <div style="font-size:22px;font-weight:800;color:var(--t);font-family:monospace">${active.length}</div>
        <div style="font-size:10px;color:var(--t3)">aktif iş</div>
      </div>
    </div>`;
  }).join('');

  return `<div style="display:flex;flex-direction:column;gap:8px">${rows}</div>`;
}

function _buildPerfRows(userData) {
  if (!userData.length) return '<div style="padding:24px;text-align:center;color:var(--t3)">Personel bulunamadı</div>';

  // Sıralama: verimlilik skoruna göre
  const sorted = [...userData].sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  const rows = sorted.map((d, rank) => {
    const { user: u, active, done, overdue, completionRate, efficiencyScore, avgDays, doneThisMonth, recentDone } = d;
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank+1}.`;
    const perf  = efficiencyScore >= 80 ? { label:'Mükemmel', color:'#10B981', bg:'rgba(16,185,129,.1)' }
                : efficiencyScore >= 60 ? { label:'İyi',       color:'#3B82F6', bg:'rgba(59,130,246,.1)' }
                : efficiencyScore >= 40 ? { label:'Orta',      color:'#F59E0B', bg:'rgba(245,158,11,.1)' }
                : { label:'Gelişmeli',   color:'#EF4444', bg:'rgba(239,68,68,.1)' };

    const avc = window.AVC || window._getAVC?.() || [['#EEEDFE','#26215C']];
    const idx = loadUsers().indexOf(loadUsers().find(x => x.id === u.id));
    const c   = avc[Math.max(idx,0) % avc.length];

    return `
    <div class="pusula-v85-wl-row" style="cursor:default">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <!-- Sıra -->
        <div style="font-size:18px;width:28px;text-align:center;flex-shrink:0">${medal}</div>
        <!-- Avatar -->
        <div style="width:36px;height:36px;border-radius:11px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0">${window.initials?.(u.name)||u.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t)">${u.name}</span>
            <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${perf.bg};color:${perf.color}">${perf.label}</span>
          </div>
          <!-- Metrik grid -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            <div class="pusula-v85-perf-metric">
              <div class="pusula-v85-perf-metric-val" style="color:${completionRate>=70?'#10B981':completionRate>=40?'#F59E0B':'#EF4444'}">${completionRate}%</div>
              <div class="pusula-v85-perf-metric-lbl">Tamamlama</div>
            </div>
            <div class="pusula-v85-perf-metric">
              <div class="pusula-v85-perf-metric-val">${doneThisMonth.length}</div>
              <div class="pusula-v85-perf-metric-lbl">Bu ay</div>
            </div>
            <div class="pusula-v85-perf-metric">
              <div class="pusula-v85-perf-metric-val" style="color:${overdue.length>0?'#EF4444':'#10B981'}">${overdue.length}</div>
              <div class="pusula-v85-perf-metric-lbl">Gecikmiş</div>
            </div>
            <div class="pusula-v85-perf-metric">
              <div class="pusula-v85-perf-metric-val">${avgDays > 0 ? avgDays.toFixed(1) : '—'}</div>
              <div class="pusula-v85-perf-metric-lbl">Ort. Gün</div>
            </div>
          </div>
          <!-- Verimlilik barı -->
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-bottom:3px">
              <span>Verimlilik Skoru</span>
              <span style="font-weight:700;color:${perf.color}">${efficiencyScore}/100</span>
            </div>
            <div style="height:5px;background:var(--b);border-radius:4px;overflow:hidden">
              <div style="height:100%;background:${perf.color};width:${efficiencyScore}%;border-radius:4px;transition:width .6s ease"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div style="display:flex;flex-direction:column;gap:8px">${rows}</div>`;
}

function _buildTrendsRows(userData) {
  // Son 7 gün günlük tamamlama trendi
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(Date.now() - (6-i)*86400000);
    return {
      label: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][d.getDay()],
      date:  d.toISOString().slice(0,10)
    };
  });

  const tasks = loadTasks();
  const users = loadUsers().filter(u => u.status === 'active');

  // Her gün kaç görev tamamlandı
  const dailyCounts = days.map(day => {
    const count = tasks.filter(t =>
      (t.done || t.status === 'done') &&
      (t.created_at || '').slice(0,10) === day.date
    ).length;
    return { ...day, count };
  });
  const maxDay = Math.max(...dailyCounts.map(d => d.count), 1);

  // Mini bar chart
  const barChart = `
  <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:12px">
    <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:12px">📆 Son 7 Gün — Tamamlanan Görevler</div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:60px">
      ${dailyCounts.map(d => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:10px;color:${d.count>0?'var(--ac)':'var(--t3)'};font-weight:700">${d.count||''}</div>
          <div style="width:100%;background:${d.count>0?'var(--ac)':'var(--b)'};border-radius:4px 4px 0 0;min-height:4px;height:${Math.max(4, Math.round(d.count/maxDay*48))}px;transition:height .4s ease"></div>
          <div style="font-size:10px;color:var(--t3)">${d.label}</div>
        </div>`).join('')}
    </div>
  </div>`;

  // Personel bazlı trend
  const userTrends = [...userData]
    .sort((a,b) => b.recentDone - a.recentDone)
    .slice(0, 5)
    .map(d => {
      const { user: u, recentDone, done, active } = d;
      const momentum = recentDone >= 3 ? '🚀' : recentDone >= 1 ? '📈' : '📉';
      const avc = window.AVC || window._getAVC?.() || [['#EEEDFE','#26215C']];
      const idx = users.indexOf(users.find(x => x.id === u.id));
      const c   = avc[Math.max(idx,0) % avc.length];
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
        <div style="width:30px;height:30px;border-radius:9px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${window.initials?.(u.name)||u.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--t)">${u.name}</div>
          <div style="font-size:11px;color:var(--t3)">Son 7 gün: <strong style="color:var(--t)">${recentDone}</strong> tamamlandı · Toplam: ${done.length} · Aktif: ${active.length}</div>
        </div>
        <div style="font-size:20px">${momentum}</div>
      </div>`;
    }).join('');

  return barChart + `
  <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px">
    <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:8px">🏃 Personel Momentum (Son 7 Gün)</div>
    ${userTrends || '<div style="color:var(--t3);font-size:12px">Veri yok</div>'}
  </div>`;
}

// ── Personele göre filtreleme ──────────────────────────────────
window._wlFilterByUser = function(uid, name) {
  const sel = g('pus-usel');
  if (sel) {
    sel.value = uid;
    sel.style.display = '';
    window.renderPusula?.();
    window.toast?.(`👤 ${name} filtresi aktif`, 'ok');
  }
};

// ── CSS ─────────────────────────────────────────────────────────
(function _wlInjectCSS() {
  if (document.getElementById('pusula-wl-css')) return;
  const s = document.createElement('style');
  s.id = 'pusula-wl-css';
  s.textContent = `
    .pusula-v85-wl-panel {
      background: var(--sf);
      border: 1px solid var(--b);
      border-radius: 16px;
      padding: 18px 20px;
    }
    .pusula-v85-wl-row {
      background: var(--s2);
      border: 1px solid var(--b);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all .15s;
    }
    .pusula-v85-wl-row:hover {
      border-color: var(--ac);
      box-shadow: 0 2px 12px rgba(99,102,241,.08);
      transform: translateY(-1px);
    }
    .pusula-v85-wl-summary-card {
      background: var(--s2);
      border: 1px solid var(--b);
      border-radius: 12px;
      padding: 12px 14px;
      text-align: center;
    }
    .pusula-v85-wl-sc-val {
      font-size: 26px;
      font-weight: 800;
      font-family: monospace;
      color: var(--t);
      line-height: 1.1;
    }
    .pusula-v85-wl-sc-lbl {
      font-size: 10px;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-top: 3px;
    }
    .pusula-v85-wl-chip {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
    }
    .pusula-v85-wl-chip-blue   { background:rgba(59,130,246,.1);  color:#3B82F6; }
    .pusula-v85-wl-chip-purple { background:rgba(139,92,246,.1);  color:#8B5CF6; }
    .pusula-v85-wl-chip-orange { background:rgba(245,158,11,.1);  color:#D97706; }
    .pusula-v85-wl-chip-red    { background:rgba(239,68,68,.1);   color:#EF4444; }
    .pusula-v85-wl-chip-green  { background:rgba(16,185,129,.1);  color:#059669; }
    .pusula-v85-perf-metric {
      background: var(--sf);
      border-radius: 8px;
      padding: 6px 10px;
      text-align: center;
    }
    .pusula-v85-perf-metric-val {
      font-size: 16px;
      font-weight: 800;
      font-family: monospace;
      color: var(--t);
    }
    .pusula-v85-perf-metric-lbl {
      font-size: 9px;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-top: 2px;
    }
  `;
  document.head.appendChild(s);
})();

// ── renderPusula hook'una bağla ─────────────────────────────────
// Workload paneli artık toggle ile açılıyor — renderPusula hook'u kaldırıldı
// Buton: hero alanındaki "👥 Personel Analizi" butonu

// Export

// ── Workload Panel Toggle ────────────────────────────────────────
window._toggleWorkloadPanel = function(btn) {
  const panel = g('pus-workload-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    panel.style.display = 'none';
    if (btn) { btn.style.background = 'rgba(255,255,255,.12)'; btn.style.color = 'rgba(255,255,255,.85)'; }
  } else {
    panel.style.display = 'block';
    renderWorkloadPanel();
    if (btn) { btn.style.background = 'rgba(255,255,255,.25)'; btn.style.color = '#fff'; }
  }
};
window.renderWorkloadPanel = renderWorkloadPanel;
console.info('[Pusula] İş Yükü & Performans paneli aktif ✓');



// ════════════════════════════════════════════════════════════════
// PUSULA v9 — 5 YENİ ÖZELLİK + PERSONEL ANALİZİ GELİŞTİRMESİ
// ════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────
// 1. ⚡ HIZLI GÖREV (QUICK ADD)
// ────────────────────────────────────────────────────────────────
(function _initQuickAdd() {
  // Akıllı tarih ipucu — "yarın finans raporu" → bitiş tarihi atar
  window._qaHint = function(val) {
    const hint = g('pus-qa-hint');
    if (!hint) return;
    const parsed = window.smartDateParse?.(val);
    hint.textContent = parsed ? `📅 → ${parsed}` : '';
    hint.style.color = 'rgba(255,255,255,.6)';
  };

  window._qaSubmit = function() {
    const inp = g('pus-qa-inp');
    if (!inp) return;
    let val = inp.value.trim();
    if (!val) return;

    // Akıllı tarih parse
    const due = window.smartDateParse?.(val) || null;

    // Başlıktan tarih ifadesini temizle
    const title = val
      .replace(/\b(yarın|bugün|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|\d+\s*gün\s*sonra|gelecek\s+hafta)\b/gi, '')
      .trim();

    if (!title) { window.toast?.('Görev başlığı boş', 'err'); return; }

    const cu = _getCU();
    if (!cu) { window.toast?.('Giriş yapmanız gerekiyor', 'err'); return; }

    const tasks = loadTasks();
    const newTask = {
      id:         generateNumericId(),
      title,
      desc:       '',
      pri:        3,
      due,
      due_time:   '',
      deadline_full: due ? due + ' 23:59' : null,
      start:      null,
      status:     'todo',
      department: '',
      cost:       null,
      tags:       [],
      link:       '',
      duration:   null,
      uid:        cu.id,
      done:       false,
      subTasks:   [],
      created_at: nowTs(),
    };
    tasks.push(newTask);
    saveTasks(tasks);

    // Animasyonlu geri bildirim
    inp.value = '';
    inp.placeholder = '✅ Eklendi!';
    setTimeout(() => { inp.placeholder = 'Hızlı görev ekle… (Enter)'; }, 1200);
    if (g('pus-qa-hint')) g('pus-qa-hint').textContent = '';

    window.renderPusula?.();
    window.toast?.(`⚡ "${title}" eklendi`, 'ok');
    logActivity('task', `Hızlı görev: "${title}"`);
  };
})();

// ────────────────────────────────────────────────────────────────
// 2. 🎯 ODAK MODU — Gelişmiş Focus Timer (Pomodoro+)
// ────────────────────────────────────────────────────────────────
(function _initFocusMode() {
  let _fmTask   = null;
  let _fmTimer  = null;
  let _fmEnd    = null;
  let _fmPhase  = 'work'; // 'work' | 'break'
  let _fmCycles = 0;

  function _fmRender() {
    let el = document.getElementById('pus-focus-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pus-focus-overlay';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9000',
        'background:rgba(10,10,20,.92)', 'backdrop-filter:blur(16px)',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'color:#fff', 'font-family:inherit',
      ].join(';');
      document.body.appendChild(el);
    }

    const task = _fmTask;
    const remaining = Math.max(0, Math.ceil((_fmEnd - Date.now()) / 1000));
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    const isWork  = _fmPhase === 'work';
    const accent  = isWork ? '#6366F1' : '#10B981';
    const emoji   = isWork ? '🎯' : '☕';
    const phLabel = isWork ? 'Odak Süresi' : 'Mola';

    el.innerHTML = `
      <div style="text-align:center;max-width:480px;padding:32px">
        <!-- Kapatma -->
        <button onclick="window._fmStop?.()" style="position:absolute;top:24px;right:28px;background:rgba(255,255,255,.08);border:none;border-radius:8px;color:rgba(255,255,255,.6);width:36px;height:36px;font-size:18px;cursor:pointer">×</button>

        <!-- Phase badge -->
        <div style="background:${accent}22;border:1px solid ${accent}55;border-radius:20px;padding:5px 16px;font-size:12px;font-weight:700;color:${accent};display:inline-block;margin-bottom:24px;letter-spacing:.08em;text-transform:uppercase">${emoji} ${phLabel} · Tur ${_fmCycles + 1}</div>

        <!-- Görev adı -->
        <div style="font-size:15px;color:rgba(255,255,255,.6);margin-bottom:8px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${task?.title || 'Serbest Odak'}</div>

        <!-- Timer ring -->
        <div style="position:relative;width:200px;height:200px;margin:0 auto 28px">
          <svg viewBox="0 0 200 200" style="transform:rotate(-90deg);width:200px;height:200px">
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
            <circle id="pus-fm-ring" cx="100" cy="100" r="88" fill="none" stroke="${accent}" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0"
              style="transition:stroke-dashoffset 1s linear"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div id="pus-fm-time" style="font-size:52px;font-weight:800;font-family:monospace;letter-spacing:-.02em;color:#fff">${m}:${s}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em">kalan</div>
          </div>
        </div>

        <!-- Kontroller -->
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button onclick="window._fmSkip?.()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;color:#fff;padding:11px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">⏭ Atla</button>
          <button onclick="window._fmStop?.()" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:12px;color:#EF4444;padding:11px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">⏹ Bitir</button>
          ${task ? `<button onclick="window._fmComplete?.()" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:12px;color:#10B981;padding:11px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">✅ Görevi Tamamla</button>` : ''}
        </div>
      </div>`;

    // Ring animasyonu
    const totalSec = isWork ? 25 * 60 : (_fmCycles % 4 === 3 ? 15 * 60 : 5 * 60);
    const pct = remaining / totalSec;
    const ring = document.getElementById('pus-fm-ring');
    if (ring) ring.style.strokeDashoffset = String(Math.round(553 * (1 - pct)));
  }

  function _fmTick() {
    const remaining = Math.max(0, Math.ceil((_fmEnd - Date.now()) / 1000));
    const el = document.getElementById('pus-focus-overlay');
    if (!el) { clearInterval(_fmTimer); return; }

    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    const timeEl = document.getElementById('pus-fm-time');
    if (timeEl) timeEl.textContent = `${m}:${s}`;

    const isWork   = _fmPhase === 'work';
    const totalSec = isWork ? 25 * 60 : (_fmCycles % 4 === 3 ? 15 * 60 : 5 * 60);
    const pct      = remaining / totalSec;
    const ring = document.getElementById('pus-fm-ring');
    if (ring) ring.style.strokeDashoffset = String(Math.round(553 * (1 - pct)));

    // Dönem bitti
    if (remaining <= 0) {
      clearInterval(_fmTimer);
      if (_fmPhase === 'work') {
        _fmCycles++;
        const breakMin = _fmCycles % 4 === 0 ? 15 : 5;
        _fmPhase = 'break';
        _fmEnd   = Date.now() + breakMin * 60 * 1000;
        window.toast?.(`☕ ${breakMin} dakika mola!`, 'ok');
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==').play().catch(()=>{}); } catch(e) {}
      } else {
        _fmPhase = 'work';
        _fmEnd   = Date.now() + 25 * 60 * 1000;
        window.toast?.('🎯 Odak süresi başlıyor!', 'ok');
      }
      _fmRender();
      _fmTimer = setInterval(_fmTick, 1000);
    }
  }

  window.openFocusMode = function(taskId) {
    _fmTask   = taskId ? loadTasks().find(t => t.id === taskId) : null;
    _fmPhase  = 'work';
    _fmCycles = 0;
    _fmEnd    = Date.now() + 25 * 60 * 1000;
    clearInterval(_fmTimer);
    _fmRender();
    _fmTimer = setInterval(_fmTick, 1000);
    logActivity('task', `Odak modu başlatıldı${_fmTask ? ': ' + _fmTask.title : ''}`);
  };

  window._fmStop = function() {
    clearInterval(_fmTimer);
    const el = document.getElementById('pus-focus-overlay');
    if (el) el.remove();
    window.renderPusula?.();
  };

  window._fmSkip = function() {
    clearInterval(_fmTimer);
    if (_fmPhase === 'work') {
      _fmCycles++;
      _fmPhase = 'break';
      _fmEnd   = Date.now() + 5 * 60 * 1000;
    } else {
      _fmPhase = 'work';
      _fmEnd   = Date.now() + 25 * 60 * 1000;
    }
    _fmRender();
    _fmTimer = setInterval(_fmTick, 1000);
  };

  window._fmComplete = function() {
    if (_fmTask) {
      const tasks = loadTasks();
      const t = tasks.find(x => x.id === _fmTask.id);
      if (t) { t.done = true; t.status = 'done'; saveTasks(tasks); }
      window.toast?.(`✅ "${_fmTask.title}" tamamlandı!`, 'ok');
    }
    window._fmStop?.();
  };
})();

// ────────────────────────────────────────────────────────────────
// 3. 📌 YAPIŞKAN NOTLAR (STICKY BOARD)
// ────────────────────────────────────────────────────────────────
(function _initStickyBoard() {
  const STICKY_KEY = 'ak_pus_sticky_notes';
  const COLORS = ['#FEF9C3','#DCFCE7','#E0F2FE','#FEE2E2','#F3E8FF','#FFEDD5'];

  function _loadStickies() {
    try { return JSON.parse(localStorage.getItem(STICKY_KEY) || '[]'); } catch(e) { return []; }
  }
  function _saveStickies(d) {
    localStorage.setItem(STICKY_KEY, JSON.stringify(d));
  }

  function _renderStickyBoard() {
    const cont = g('pus-sticky-board');
    if (!cont || cont.style.display === 'none') return;
    const notes = _loadStickies();

    const cards = notes.map((n, i) => `
      <div class="pus-sticky-card" style="background:${n.color || COLORS[0]};border-radius:14px;padding:14px;position:relative;min-height:100px;display:flex;flex-direction:column;gap:8px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <button onclick="window._deleteSticky?.(${i})" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:rgba(0,0,0,.3);font-size:14px;padding:2px 5px;border-radius:4px" onmouseover="this.style.color='rgba(0,0,0,.7)'" onmouseout="this.style.color='rgba(0,0,0,.3)'">×</button>
        <textarea style="background:none;border:none;outline:none;resize:none;font-size:13px;color:#1a1a1a;font-family:inherit;flex:1;width:100%;line-height:1.5;padding-right:16px"
          rows="3" placeholder="Not yaz…"
          onblur="window._updateSticky?.(${i}, this.value)">${n.text || ''}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
          <button onclick="window._convertToTask?.(${i})" style="background:rgba(0,0,0,.08);border:none;border-radius:7px;padding:4px 10px;font-size:11px;color:#333;cursor:pointer;font-family:inherit;font-weight:600">⚡ Göreve Dönüştür</button>
          <div style="display:flex;gap:4px">
            ${COLORS.map(c => `<div onclick="window._colorSticky?.(${i},'${c}')" style="width:14px;height:14px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${n.color===c?'#333':'transparent'};transition:border .15s"></div>`).join('')}
          </div>
        </div>
      </div>`).join('');

    cont.innerHTML = `
      <div style="background:var(--sf);border:1px solid var(--b);border-radius:16px;padding:16px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:var(--t)">📌 Yapışkan Notlar</div>
          <button onclick="window._addSticky?.()" style="background:var(--ac);color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">+ Not Ekle</button>
        </div>
        ${notes.length
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">${cards}</div>`
          : `<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">📌 Henüz not yok — ekle butona bas</div>`}
      </div>`;
  }

  window._addSticky = function() {
    const notes = _loadStickies();
    notes.push({ text: '', color: COLORS[notes.length % COLORS.length], created: nowTs() });
    _saveStickies(notes);
    _renderStickyBoard();
  };

  window._updateSticky = function(idx, text) {
    const notes = _loadStickies();
    if (notes[idx]) { notes[idx].text = text; _saveStickies(notes); }
  };

  window._deleteSticky = function(idx) {
    const notes = _loadStickies();
    notes.splice(idx, 1);
    _saveStickies(notes);
    _renderStickyBoard();
  };

  window._colorSticky = function(idx, color) {
    const notes = _loadStickies();
    if (notes[idx]) { notes[idx].color = color; _saveStickies(notes); }
    _renderStickyBoard();
  };

  window._convertToTask = function(idx) {
    const notes = _loadStickies();
    const n = notes[idx];
    if (!n || !n.text.trim()) { window.toast?.('Not boş', 'err'); return; }
    const cu = _getCU();
    const tasks = loadTasks();
    tasks.push({
      id: generateNumericId(), title: n.text.trim().slice(0, 80),
      desc: n.text.length > 80 ? n.text : '',
      pri: 3, due: null, status: 'todo', done: false,
      uid: cu?.id || 1, subTasks: [], created_at: nowTs(),
      tags: ['sticky-not'],
    });
    saveTasks(tasks);
    notes.splice(idx, 1);
    _saveStickies(notes);
    _renderStickyBoard();
    window.renderPusula?.();
    window.toast?.('⚡ Göreve dönüştürüldü ✓', 'ok');
  };

  window._toggleStickyBoard = function(btn) {
    const panel = g('pus-sticky-board');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (btn) {
      btn.style.background = isOpen ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.25)';
      btn.style.color = isOpen ? 'rgba(255,255,255,.85)' : '#fff';
    }
    if (!isOpen) _renderStickyBoard();
  };
})();

// ────────────────────────────────────────────────────────────────
// 4. 🔁 TEKRARLAYAN GÖREV ŞABLONLARI — Kütüphane
// ────────────────────────────────────────────────────────────────
const _PUS_BUILT_IN_TEMPLATES = [
  {
    name: 'Haftalık Rapor', icon: '📊', dept: 'Finans', pri: 2,
    desc: 'Haftalık performans ve durum raporu hazırla',
    subTasks: [
      { title: 'Verileri topla', status: 'todo' },
      { title: 'Raporu yaz', status: 'todo' },
      { title: 'Yönetime sun', status: 'todo' },
    ],
  },
  {
    name: 'Konteyner Takibi', icon: '🚢', dept: 'Lojistik', pri: 1,
    desc: 'Aktif konteynerlerin durumunu kontrol et',
    subTasks: [
      { title: 'Tracking sistemini kontrol et', status: 'todo' },
      { title: 'Gecikmeli konteynerleri bildir', status: 'todo' },
      { title: 'ETA güncellemelerini kaydet', status: 'todo' },
    ],
  },
  {
    name: 'Fatura Kontrolü', icon: '💰', dept: 'Finans', pri: 2,
    desc: 'Aylık faturaları kontrol et ve onayla',
    subTasks: [
      { title: 'Gelen faturaları listele', status: 'todo' },
      { title: 'Tutarları doğrula', status: 'todo' },
      { title: 'Ödeme talimatı ver', status: 'todo' },
    ],
  },
  {
    name: 'Yeni Personel Onboard', icon: '👤', dept: 'İK', pri: 2,
    desc: 'Yeni personel işe alım süreci',
    subTasks: [
      { title: 'Hesapları oluştur', status: 'todo' },
      { title: 'Oryantasyon planla', status: 'todo' },
      { title: 'Evrakları tamamla', status: 'todo' },
      { title: 'Sisteme tanıt', status: 'todo' },
    ],
  },
  {
    name: 'Tedarikçi Değerlendirmesi', icon: '🤝', dept: 'Operasyon', pri: 3,
    desc: 'Mevcut tedarikçileri değerlendir',
    subTasks: [
      { title: 'Performans verilerini topla', status: 'todo' },
      { title: 'Fiyat karşılaştırması yap', status: 'todo' },
      { title: 'Rapor hazırla', status: 'todo' },
    ],
  },
  {
    name: 'IT Güvenlik Taraması', icon: '🔒', dept: 'IT', pri: 1,
    desc: 'Aylık güvenlik kontrolü',
    subTasks: [
      { title: 'Şifre politikasını kontrol et', status: 'todo' },
      { title: 'Yedeklemeleri doğrula', status: 'todo' },
      { title: 'Erişim yetkilerini gözden geçir', status: 'todo' },
    ],
  },
];

function openTaskTemplateLibrary() {
  let overlay = document.getElementById('pus-tpl-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pus-tpl-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  const cards = _PUS_BUILT_IN_TEMPLATES.map((tpl, i) => `
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:14px 16px;cursor:pointer;transition:all .15s"
      onmouseover="this.style.borderColor='var(--ac)';this.style.transform='translateY(-2px)'"
      onmouseout="this.style.borderColor='var(--b)';this.style.transform=''"
      onclick="window._applyBuiltInTemplate?.(${i});document.getElementById('pus-tpl-overlay')?.remove()">
      <div style="font-size:22px;margin-bottom:6px">${tpl.icon}</div>
      <div style="font-size:13px;font-weight:700;color:var(--t);margin-bottom:3px">${tpl.name}</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:8px">${tpl.desc}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:rgba(99,102,241,.1);color:#6366F1;font-weight:600">${tpl.dept}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:var(--s2);color:var(--t3)">${tpl.subTasks.length} alt görev</span>
      </div>
    </div>`).join('');

  overlay.innerHTML = `
    <div style="background:var(--sf);border-radius:20px;padding:24px;max-width:720px;width:100%;max-height:80vh;overflow-y:auto;position:relative">
      <button onclick="document.getElementById('pus-tpl-overlay')?.remove()" style="position:absolute;top:16px;right:16px;background:var(--s2);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:var(--t3)">×</button>
      <div style="font-size:16px;font-weight:700;color:var(--t);margin-bottom:4px">🔁 Görev Şablonları</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:18px">Hazır şablonla tek tıkla görev oluştur</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">${cards}</div>
    </div>`;
}

window._applyBuiltInTemplate = function(idx) {
  const tpl = _PUS_BUILT_IN_TEMPLATES[idx];
  if (!tpl) return;
  const cu = _getCU();
  const tasks = loadTasks();
  const nid = generateNumericId();
  tasks.push({
    id: nid,
    title: tpl.name,
    desc: tpl.desc,
    pri: tpl.pri,
    due: null,
    status: 'todo',
    done: false,
    department: tpl.dept,
    uid: cu?.id || 1,
    subTasks: tpl.subTasks.map((s, i) => ({ id: nid + i + 1, title: s.title, done: false, status: s.status })),
    created_at: nowTs(),
    tags: [tpl.dept.toLowerCase()],
  });
  saveTasks(tasks);
  window.renderPusula?.();
  window.toast?.(`✅ "${tpl.name}" şablonu eklendi`, 'ok');
};
window.openTaskTemplateLibrary = openTaskTemplateLibrary;

// ────────────────────────────────────────────────────────────────
// 5. 📱 MOBİL SWIPE AKSİYONLARI
// ────────────────────────────────────────────────────────────────
(function _initSwipeActions() {
  let _swStartX = 0, _swStartY = 0, _swEl = null, _swTaskId = null;
  const THRESHOLD = 80; // px

  function _onTouchStart(e) {
    const row = e.target.closest('.tk-row');
    if (!row) return;
    _swStartX  = e.touches[0].clientX;
    _swStartY  = e.touches[0].clientY;
    _swEl      = row;
    // taskId'yi data attribute'dan al — tk-row üzerinde
    _swTaskId  = row.dataset.taskId ? parseInt(row.dataset.taskId) : null;
    row.style.transition = '';
  }

  function _onTouchMove(e) {
    if (!_swEl) return;
    const dx = e.touches[0].clientX - _swStartX;
    const dy = Math.abs(e.touches[0].clientY - _swStartY);
    if (dy > 30) { _swEl = null; return; } // dikey scroll
    if (Math.abs(dx) < 10) return;
    e.preventDefault();
    _swEl.style.transform = `translateX(${dx}px)`;
    // Renk ipucu
    if (dx > 40) {
      _swEl.style.background = 'rgba(16,185,129,.08)'; // yeşil — tamamla
    } else if (dx < -40) {
      _swEl.style.background = 'rgba(239,68,68,.08)';  // kırmızı — sil
    } else {
      _swEl.style.background = '';
    }
  }

  function _onTouchEnd(e) {
    if (!_swEl) return;
    const dx = e.changedTouches[0].clientX - _swStartX;
    _swEl.style.transition = 'transform .25s ease, background .25s';
    _swEl.style.transform = '';
    _swEl.style.background = '';

    if (dx > THRESHOLD && _swTaskId) {
      // Sağa — tamamla
      const tasks = loadTasks();
      const t = tasks.find(x => x.id === _swTaskId);
      if (t && !t.done) {
        t.done = true; t.status = 'done';
        saveTasks(tasks);
        window.renderPusula?.();
        window.toast?.('✅ Tamamlandı', 'ok');
      }
    } else if (dx < -THRESHOLD && _swTaskId) {
      // Sola — sil onayı
      window.confirmModal?.(`Görevi silmek istediğinizden emin misiniz?`, {
        danger: true,
        confirmText: 'Evet, Sil',
        onConfirm: () => {
          const tasks = loadTasks();
          saveTasks(tasks.filter(x => x.id !== _swTaskId));
          window.renderPusula?.();
          window.toast?.('🗑 Silindi', 'ok');
        }
      });
    }
    _swEl = null; _swTaskId = null;
  }

  // Görev listesi container'ına touch listener ekle
  function _attachSwipeListeners() {
    const cont = g('pus-main-view');
    if (!cont || cont._swipeAttached) return;
    cont._swipeAttached = true;
    cont.addEventListener('touchstart', _onTouchStart, { passive: true });
    cont.addEventListener('touchmove', _onTouchMove, { passive: false });
    cont.addEventListener('touchend', _onTouchEnd, { passive: true });
  }

  // renderPusula sonrası attach et
  const _swOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _swOrigRender?.();
    setTimeout(_attachSwipeListeners, 100);
  };
})();

// ── renderPusulaList'e swipe için data-task-id ekle ──────────────
// (tk-row'lara data attribute eklenmeli)

// ────────────────────────────────────────────────────────────────
// 6. CSS — Tüm yeni özellikler için
// ────────────────────────────────────────────────────────────────
(function _injectV9CSS() {
  if (document.getElementById('pusula-v9-css')) return;
  const s = document.createElement('style');
  s.id = 'pusula-v9-css';
  s.textContent = `
    /* Quick Add */
    .pus-quick-add-wrap {
      margin-top: 14px;
      max-width: 480px;
    }
    .pus-qa-inner {
      display: flex;
      align-items: center;
      gap: 0;
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 12px;
      overflow: hidden;
      transition: border-color .2s, box-shadow .2s;
    }
    .pus-qa-inner:focus-within {
      border-color: rgba(255,255,255,.5);
      box-shadow: 0 0 0 3px rgba(255,255,255,.08);
    }
    .pus-qa-icon {
      padding: 0 10px 0 14px;
      font-size: 18px;
      opacity: .7;
    }
    .pus-qa-inp {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      padding: 10px 4px;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      font-family: inherit;
    }
    .pus-qa-inp::placeholder { color: rgba(255,255,255,.45); }
    .pus-qa-btn {
      background: rgba(255,255,255,.15);
      border: none;
      border-left: 1px solid rgba(255,255,255,.15);
      color: #fff;
      width: 42px;
      height: 100%;
      font-size: 20px;
      cursor: pointer;
      font-family: inherit;
      transition: background .15s;
      padding: 0;
    }
    .pus-qa-btn:hover { background: rgba(255,255,255,.25); }
    .pus-qa-hint {
      font-size: 11px;
      margin-top: 5px;
      padding-left: 4px;
      min-height: 16px;
      transition: opacity .2s;
    }

    /* Swipe göstergesi */
    .tk-row { touch-action: pan-y; }

    /* Şablon kartı hover */
    @media (max-width: 768px) {
      .pus-qa-wrap { max-width: 100%; }
    }
  `;
  document.head.appendChild(s);
})();

// ── Şablon butonunu hero actions'a ekle (JS ile) ─────────────────
(function _addTemplateBtn() {
  function _inject() {
    if (document.getElementById('btn-pus-tpl')) return;
    const analiz = document.getElementById('btn-pus-analiz');
    if (!analiz) return;
    const btn = document.createElement('button');
    btn.id = 'btn-pus-tpl';
    btn.title = 'Görev şablonları';
    btn.style.cssText = 'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:10px;color:rgba(255,255,255,.85);padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s';
    btn.textContent = '🔁 Şablonlar';
    btn.onclick = () => openTaskTemplateLibrary();
    analiz.parentElement.insertBefore(btn, analiz);

    // Odak Modu butonu
    const focusBtn = document.createElement('button');
    focusBtn.id = 'btn-pus-focus';
    focusBtn.title = 'Odak modu — Pomodoro';
    focusBtn.style.cssText = btn.style.cssText;
    focusBtn.textContent = '🎯 Odak';
    focusBtn.onclick = () => openFocusMode(null);
    analiz.parentElement.insertBefore(focusBtn, btn);
  }

  // DOM hazır olunca ekle
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _inject);
  } else {
    setTimeout(_inject, 500);
  }
  // App.init sonrası da dene
  const _origNav = window.nav;
  window.nav = function(id, el) {
    _origNav?.(id, el);
    if (id === 'pusula') setTimeout(_inject, 200);
  };
})();

// ── Swipe için tk-row'a taskId data attribute ekle ──────────────
// renderPusulaList sonrası çağrılır
const _v9OrigRenderList = window.renderPusulaList;
if (typeof renderPusulaList !== 'undefined') {
  // renderPusulaList global değil — pusula.js içinde tanımlı
  // Swipe için pus-main-view'daki checkbox'lardan taskId çekilecek
}

console.info('[Pusula v9] 5 yeni özellik + Personel Analizi aktif ✓');



// ════════════════════════════════════════════════════════════════
// PUSULA — 4 YENİ ÖZELLİK
// 1. Akıllı Bildirim  2. Kişisel Dashboard  3. Takvim Entegrasyon  4. AI Asistan
// ════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────
// 1. 🔔 AKILLI BİLDİRİM SİSTEMİ
// ────────────────────────────────────────────────────────────────
(function _initSmartNotif() {
  const NOTIF_KEY = 'ak_pus_notif_sent';

  function _getSentLog() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); } catch(e) { return {}; }
  }
  function _markSent(key) {
    const log = _getSentLog();
    log[key] = Date.now();
    localStorage.setItem(NOTIF_KEY, JSON.stringify(log));
  }
  function _alreadySent(key) {
    const log = _getSentLog();
    return !!log[key];
  }

  function _requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function _sendNotif(title, body, icon) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body, icon: icon || '/assets/icons/icon.svg',
        badge: '/assets/icons/icon.svg',
        tag: title,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {}
  }

  function _checkTaskNotifications() {
    const cu = _getCU();
    if (!cu) return;
    const tasks = loadTasks().filter(t =>
      t.uid === cu.id && !t.done && t.status !== 'done' && t.deadline_full
    );
    const now = Date.now();

    tasks.forEach(t => {
      const deadline = new Date(t.deadline_full.replace(' ', 'T')).getTime();
      if (isNaN(deadline)) return;
      const diff = deadline - now;
      const diffH = diff / 3600000;

      // 24 saat kala
      if (diffH > 0 && diffH <= 24) {
        const key = `24h_${t.id}`;
        if (!_alreadySent(key)) {
          _sendNotif(
            '⏰ Görev Yaklaşıyor',
            `"${t.title}" — 24 saat içinde bitmesi gerekiyor`,
          );
          _markSent(key);
          window.addNotif?.('⏰', `"${t.title}" — 24 saat kaldı`, 'warn', 'pusula', null, t.id);
        }
      }

      // 1 saat kala
      if (diffH > 0 && diffH <= 1) {
        const key = `1h_${t.id}`;
        if (!_alreadySent(key)) {
          _sendNotif(
            '🚨 Son 1 Saat!',
            `"${t.title}" — 1 saat içinde bitirilmeli!`,
          );
          _markSent(key);
          window.addNotif?.('🚨', `"${t.title}" — 1 saat kaldı!`, 'err', 'pusula', null, t.id);
        }
      }

      // Süre doldu
      if (diff <= 0 && diffH > -2) {
        const key = `expired_${t.id}`;
        if (!_alreadySent(key)) {
          _sendNotif(
            '❗ Süre Doldu',
            `"${t.title}" tamamlanmadı!`,
          );
          _markSent(key);
          window.addNotif?.('❗', `"${t.title}" süresi doldu!`, 'err', 'pusula', null, t.id);
        }
      }
    });
  }

  // İzin iste ve başlat
  window._initTaskNotifications = function() {
    _requestPermission();
    _checkTaskNotifications();
    setInterval(_checkTaskNotifications, 5 * 60 * 1000); // 5 dk'da bir
  };

  // Login sonrası başlat
  const _origInitApp = window._applyRoleUI;
  const _notifCheckOnRender = window.renderPusula;
  window.renderPusula = function() {
    _notifCheckOnRender?.();
    // İlk render'da izin iste
    if (!window._notifInited) {
      window._notifInited = true;
      setTimeout(window._initTaskNotifications, 2000);
    }
  };
})();

// ────────────────────────────────────────────────────────────────
// 2. 📊 KİŞİSEL PERFORMANS DASHBOARD
// ────────────────────────────────────────────────────────────────
function openPersonalDashboard() {
  const cu = _getCU();
  if (!cu) return;

  const tasks    = loadTasks();
  const myTasks  = tasks.filter(t => t.uid === cu.id);
  const todayS   = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

  const active    = myTasks.filter(t => !t.done && t.status !== 'done');
  const done      = myTasks.filter(t => t.done || t.status === 'done');
  const overdue   = active.filter(t => t.due && t.due < todayS);
  const doneThisM = done.filter(t => (t.created_at || t.due || '').slice(0, 7) === thisMonth);
  const doneLastM = done.filter(t => (t.created_at || t.due || '').slice(0, 7) === lastMonth);
  const compRate  = myTasks.length > 0 ? Math.round(done.length / myTasks.length * 100) : 0;

  // Departman dağılımı
  const deptMap = {};
  myTasks.forEach(t => {
    const d = t.department || 'Diğer';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptSorted = Object.entries(deptMap).sort((a,b) => b[1]-a[1]);

  // Son 8 hafta trendi
  const weekData = Array.from({length:8}, (_,i) => {
    const weekStart = new Date(Date.now() - (7-i)*7*86400000);
    const weekEnd   = new Date(weekStart.getTime() + 7*86400000);
    const ws = weekStart.toISOString().slice(0,10);
    const we = weekEnd.toISOString().slice(0,10);
    const count = done.filter(t => {
      const d = (t.created_at || '').slice(0,10);
      return d >= ws && d < we;
    }).length;
    return { label: `H${i+1}`, count };
  });
  const maxWeek = Math.max(...weekData.map(w => w.count), 1);

  // Son 30 gün — günlük aktivite ısı haritası
  const heatDays = Array.from({length:30}, (_,i) => {
    const d = new Date(Date.now() - (29-i)*86400000).toISOString().slice(0,10);
    const cnt = done.filter(t => (t.created_at||'').slice(0,10) === d).length;
    return { d, cnt };
  });
  const maxHeat = Math.max(...heatDays.map(h => h.cnt), 1);

  let overlay = document.getElementById('pus-perf-overlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'pus-perf-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:8500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  const perf = compRate >= 80 ? {l:'Mükemmel 🚀',c:'#10B981'} : compRate >= 60 ? {l:'İyi 👍',c:'#3B82F6'} : compRate >= 40 ? {l:'Orta ⚡',c:'#F59E0B'} : {l:'Gelişiyor 📈',c:'#EF4444'};

  overlay.innerHTML = `
  <div style="background:var(--sf);border-radius:24px;padding:28px;max-width:680px;width:100%;max-height:88vh;overflow-y:auto;position:relative">
    <button onclick="document.getElementById('pus-perf-overlay').remove()" style="position:absolute;top:18px;right:20px;background:var(--s2);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:var(--t3)">×</button>

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <div style="width:52px;height:52px;border-radius:16px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:22px">📊</div>
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--t)">${cu.name} — Performans</div>
        <div style="font-size:12px;color:var(--t3)">${cu.role} · ${new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:28px;font-weight:800;color:${perf.c}">${compRate}%</div>
        <div style="font-size:11px;color:var(--t3)">${perf.l}</div>
      </div>
    </div>

    <!-- Özet grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      ${[
        ['Toplam Görev', myTasks.length, 'var(--ac)'],
        ['Tamamlanan', done.length, '#10B981'],
        ['Aktif', active.length, '#3B82F6'],
        ['Gecikmiş', overdue.length, overdue.length > 0 ? '#EF4444' : '#10B981'],
      ].map(([l,v,c]) => `
        <div style="background:var(--s2);border-radius:14px;padding:14px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:${c};font-family:monospace">${v}</div>
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:4px">${l}</div>
        </div>`).join('')}
    </div>

    <!-- Bu ay vs geçen ay -->
    <div style="background:var(--s2);border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:10px">📅 Aylık Karşılaştırma</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--ac)">${doneThisM.length}</div>
          <div style="font-size:11px;color:var(--t3)">Bu ay tamamlanan</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--t3)">${doneLastM.length}</div>
          <div style="font-size:11px;color:var(--t3)">Geçen ay</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:${doneThisM.length>=doneLastM.length?'#10B981':'#EF4444'};text-align:center;font-weight:700">
        ${doneThisM.length > doneLastM.length ? '📈 Geçen aya göre daha verimli!' : doneThisM.length === doneLastM.length ? '➡️ Geçen ayla aynı seviye' : '📉 Geçen aydan daha az tamamlandı'}
      </div>
    </div>

    <!-- 8 haftalık trend bar -->
    <div style="background:var(--s2);border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:12px">📈 Son 8 Hafta Trendi</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:64px">
        ${weekData.map(w => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="font-size:9px;color:${w.count>0?'var(--ac)':'var(--t3)'};font-weight:700">${w.count||''}</div>
            <div style="width:100%;background:${w.count>0?'var(--ac)':'var(--b)'};border-radius:4px 4px 0 0;min-height:4px;height:${Math.max(4,Math.round(w.count/maxWeek*52))}px;transition:height .5s"></div>
            <div style="font-size:9px;color:var(--t3)">${w.label}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Departman dağılımı -->
    ${deptSorted.length ? `
    <div style="background:var(--s2);border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:10px">🏷️ Departman Dağılımı</div>
      ${deptSorted.map(([dept,cnt]) => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
          <div style="font-size:12px;color:var(--t);min-width:90px">${dept}</div>
          <div style="flex:1;height:8px;background:var(--b);border-radius:4px;overflow:hidden">
            <div style="height:100%;background:var(--ac);border-radius:4px;width:${Math.round(cnt/myTasks.length*100)}%;transition:width .5s"></div>
          </div>
          <div style="font-size:11px;color:var(--t3);font-weight:700;min-width:28px;text-align:right">${cnt}</div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Son 30 gün ısı haritası -->
    <div style="background:var(--s2);border-radius:14px;padding:16px">
      <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:10px">🌡️ Son 30 Gün Aktivitesi</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap">
        ${heatDays.map(h => {
          const intensity = h.cnt / maxHeat;
          const bg = h.cnt === 0 ? 'var(--b)' : `rgba(99,102,241,${0.2 + intensity * 0.8})`;
          return `<div title="${h.d}: ${h.cnt} görev" style="width:18px;height:18px;border-radius:4px;background:${bg};cursor:default"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:var(--t3)">
        <div style="width:12px;height:12px;border-radius:3px;background:var(--b)"></div> Az
        <div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,.5)"></div> Orta
        <div style="width:12px;height:12px;border-radius:3px;background:rgba(99,102,241,1)"></div> Çok
      </div>
    </div>
  </div>`;
}
window.openPersonalDashboard = openPersonalDashboard;

// ────────────────────────────────────────────────────────────────
// 3. 📅 TAKVİM ENTEGRASYONU
// ────────────────────────────────────────────────────────────────
function _syncTasksToCalendar() {
  const cal   = (typeof loadCal === 'function' ? loadCal() : window.loadCal?.()) || [];
  const tasks = loadTasks();
  const today = new Date().toISOString().slice(0, 10);
  const cu    = _getCU();

  let changed = false;

  tasks.forEach(t => {
    if (!t.due || t.done || t.status === 'done') return;
    // Sadece CU'nun görevleri veya admin
    if (cu && !window.isAdmin?.() && t.uid !== cu.id) return;
    // Geçmiş görevleri ekleme
    if (t.due < today) return;

    const calId = 'task_' + t.id;
    const exists = cal.find(e => e.id === calId);
    if (!exists) {
      cal.push({
        id:     calId,
        own:    t.uid,
        title:  '📋 ' + t.title,
        date:   t.due,
        time:   t.due_time || '09:00',
        type:   'task',
        desc:   t.desc || '',
        status: 'approved',
        taskId: t.id,
        fromPusula: true,
      });
      changed = true;
    } else {
      // Güncelle
      if (exists.title !== '📋 ' + t.title || exists.date !== t.due) {
        exists.title = '📋 ' + t.title;
        exists.date  = t.due;
        exists.time  = t.due_time || '09:00';
        changed = true;
      }
    }
  });

  // Silinmiş görevlerin takvim etkinliklerini kaldır
  const taskIds = new Set(tasks.map(t => 'task_' + t.id));
  const before  = cal.length;
  const filtered = cal.filter(e => !e.fromPusula || taskIds.has(String(e.id)));
  if (filtered.length !== before) changed = true;

  if (changed) {
    if (typeof saveCal === 'function') saveCal(filtered);
    else window.saveCal?.(filtered);
    console.info('[Pusula] Takvim senkronize edildi');
  }
}

function _checkCalendarConflicts(taskDue) {
  if (!taskDue) return [];
  const cal   = (typeof loadCal === 'function' ? loadCal() : window.loadCal?.()) || [];
  const izin  = (typeof loadIzin === 'function' ? loadIzin() : window.loadIzin?.()) || [];
  const cu    = _getCU();

  const conflicts = [];

  // Resmi tatil çakışması
  const holiday = cal.find(e => e.type === 'holiday' && e.date === taskDue);
  if (holiday) conflicts.push({ type: 'holiday', msg: `⚠️ ${taskDue} — ${holiday.title.replace('🇹🇷 ', '')} (Resmi Tatil)` });

  // İzin çakışması
  if (cu) {
    const myIzin = izin.find(i =>
      i.uid === cu.id && i.status === 'approved' &&
      taskDue >= i.start && taskDue <= (i.end || i.start)
    );
    if (myIzin) conflicts.push({ type: 'izin', msg: `🏖️ ${taskDue} — İzin gününüz` });
  }

  return conflicts;
}

// saveTask'a takvim sync hook ekle
const _calOrigSave = window.saveTask;
window.saveTask = function() {
  // Önce kaydet
  _calOrigSave?.();
  // Sonra takvim sync
  setTimeout(_syncTasksToCalendar, 200);
};

// Görev tarih seçilince çakışma uyar
window._checkTaskDateConflict = function(due) {
  if (!due) return;
  const conflicts = _checkCalendarConflicts(due);
  if (conflicts.length) {
    const hint = document.getElementById('tk-date-conflict');
    if (hint) {
      hint.innerHTML = conflicts.map(c => `<div>${c.msg}</div>`).join('');
      hint.style.display = 'block';
    } else {
      window.toast?.(conflicts[0].msg, 'warn');
    }
  } else {
    const hint = document.getElementById('tk-date-conflict');
    if (hint) hint.style.display = 'none';
  }
};

window._syncTasksToCalendar = _syncTasksToCalendar;

// ────────────────────────────────────────────────────────────────
// 4. 💬 GÖREV İÇİ AI ASISTAN (Sadece atanan kişi)
// ────────────────────────────────────────────────────────────────
function _openAiAssistant(taskId) {
  const task = loadTasks().find(t => t.id === taskId);
  if (!task) return;
  const cu = _getCU();
  if (!cu) return;

  // Sadece atanan kişi veya admin görebilir
  const canUse = (task.uid === cu.id) || window.isAdmin?.() ||
    (task.participants || []).includes(cu.id) ||
    (task.managers || []).includes(cu.id);
  if (!canUse) { window.toast?.('Bu göreve erişim yetkiniz yok', 'err'); return; }

  let el = document.getElementById('pus-ai-panel');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pus-ai-panel';
    el.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'width:380px',
      'max-height:520px', 'z-index:7500',
      'background:var(--sf)', 'border:1px solid var(--b)',
      'border-radius:20px', 'box-shadow:0 20px 60px rgba(0,0,0,.15)',
      'display:flex', 'flex-direction:column', 'overflow:hidden',
    ].join(';');
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:20px 20px 0 0">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:18px">🤖</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#fff">AI Asistan</div>
          <div style="font-size:10px;color:rgba(255,255,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${task.title}</div>
        </div>
      </div>
      <button onclick="document.getElementById('pus-ai-panel').remove()" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;color:#fff;width:28px;height:28px;cursor:pointer;font-size:14px">×</button>
    </div>

    <!-- Hızlı aksiyonlar -->
    <div style="padding:12px 14px;border-bottom:1px solid var(--b);display:flex;gap:6px;flex-wrap:wrap">
      <button onclick="window._aiAsk?.(${taskId},'summarize')" class="pus-ai-chip">📝 Özetle</button>
      <button onclick="window._aiAsk?.(${taskId},'subtasks')" class="pus-ai-chip">⬜ Alt görev öner</button>
      <button onclick="window._aiAsk?.(${taskId},'similar')" class="pus-ai-chip">🔍 Benzer görevler</button>
      <button onclick="window._aiAsk?.(${taskId},'priority')" class="pus-ai-chip">⚡ Öncelik analizi</button>
    </div>

    <!-- Mesaj listesi -->
    <div id="pus-ai-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:150px">
      <div style="text-align:center;color:var(--t3);font-size:12px;padding:16px 0">Bir aksiyon seçin veya soru sorun 👆</div>
    </div>

    <!-- Input -->
    <div style="padding:12px 14px;border-top:1px solid var(--b);display:flex;gap:8px">
      <input id="pus-ai-inp" class="fi" placeholder="Soru sor…" style="flex:1;padding:8px 12px;font-size:12px;border-radius:10px"
        onkeydown="if(event.key==='Enter')window._aiSend?.(${taskId})">
      <button onclick="window._aiSend?.(${taskId})" style="background:var(--ac);color:#fff;border:none;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit">Sor</button>
    </div>`;

  // CSS
  if (!document.getElementById('pus-ai-css')) {
    const s = document.createElement('style');
    s.id = 'pus-ai-css';
    s.textContent = `
      .pus-ai-chip {
        background:var(--s2);border:1px solid var(--b);border-radius:8px;
        padding:5px 10px;font-size:11px;font-weight:600;color:var(--t2);
        cursor:pointer;font-family:inherit;transition:all .15s;
      }
      .pus-ai-chip:hover { background:var(--al);color:var(--ac);border-color:var(--ac); }
      .pus-ai-msg-user { background:var(--ac);color:#fff;border-radius:12px 12px 4px 12px;padding:8px 12px;font-size:12px;align-self:flex-end;max-width:85%; }
      .pus-ai-msg-ai   { background:var(--s2);color:var(--t);border-radius:12px 12px 12px 4px;padding:8px 12px;font-size:12px;align-self:flex-start;max-width:90%;line-height:1.6; }
      .pus-ai-loading  { color:var(--t3);font-size:12px;align-self:flex-start;padding:8px 0;font-style:italic; }
    `;
    document.head.appendChild(s);
  }
}

function _aiAddMsg(type, text) {
  const msgs = document.getElementById('pus-ai-msgs');
  if (!msgs) return;
  // İlk mesajsa temizle
  if (msgs.querySelector('div[style*="text-align:center"]')) msgs.innerHTML = '';
  const div = document.createElement('div');
  div.className = type === 'user' ? 'pus-ai-msg-user' : type === 'ai' ? 'pus-ai-msg-ai' : 'pus-ai-loading';
  div.innerHTML = text.replace(/\n/g, '<br>');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function _aiCallClaude(prompt) {
  const loadingEl = _aiAddMsg('loading', '⏳ Düşünüyor…');
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    if (loadingEl) loadingEl.remove();
    const text = data.content?.[0]?.text || 'Yanıt alınamadı.';
    _aiAddMsg('ai', text);
    return text;
  } catch(e) {
    if (loadingEl) loadingEl.remove();
    _aiAddMsg('ai', '❌ Bağlantı hatası: ' + e.message);
    return null;
  }
}

window._aiAsk = async function(taskId, action) {
  const task  = loadTasks().find(t => t.id === taskId);
  const tasks = loadTasks();
  if (!task) return;

  let prompt = '';
  const ctx = `Görev: "${task.title}"\nAçıklama: ${task.desc || '(yok)'}\nDepartman: ${task.department || '?'}\nÖncelik: ${{1:'Kritik',2:'Önemli',3:'Normal',4:'Düşük'}[task.pri]}\nDurum: ${task.status}\nAlt görevler: ${(task.subTasks||[]).map(s=>s.title).join(', ')||'(yok)'}`;

  if (action === 'summarize') {
    _aiAddMsg('user', '📝 Bu görevi özetle');
    prompt = `${ctx}\n\nBu görevi 2-3 cümleyle Türkçe özetle. Net ve pratik ol.`;
  } else if (action === 'subtasks') {
    _aiAddMsg('user', '⬜ Alt görev öner');
    prompt = `${ctx}\n\nBu görev için 4-6 tane pratik alt görev öner. Her satırda sadece bir alt görev olsun, numarasız, madde işaretsiz, Türkçe.`;
  } else if (action === 'similar') {
    const similar = tasks
      .filter(t => t.id !== taskId && t.department === task.department && !t.done)
      .slice(0, 5)
      .map(t => `- ${t.title} (${t.status})`)
      .join('\n');
    _aiAddMsg('user', '🔍 Benzer görevler');
    _aiAddMsg('ai', similar ? `Aynı departmanda açık görevler:\n${similar}` : 'Aynı departmanda başka görev bulunamadı.');
    return;
  } else if (action === 'priority') {
    _aiAddMsg('user', '⚡ Öncelik analizi');
    const overdue = task.due && task.due < new Date().toISOString().slice(0,10);
    prompt = `${ctx}\nGecikmiş: ${overdue ? 'Evet' : 'Hayır'}\n\nBu görevin önceliğini analiz et. Neden bu öncelikte olmalı? Kısaca Türkçe açıkla.`;
  }

  if (prompt) await _aiCallClaude(prompt);
};

window._aiSend = async function(taskId) {
  const inp  = document.getElementById('pus-ai-inp');
  const task = loadTasks().find(t => t.id === taskId);
  if (!inp || !task) return;
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  _aiAddMsg('user', q);
  const ctx = `Görev: "${task.title}" | Departman: ${task.department||'?'} | Durum: ${task.status}`;
  await _aiCallClaude(`${ctx}\n\nKullanıcı sorusu: ${q}\n\nTürkçe, kısa ve pratik yanıt ver.`);
};

window._openAiAssistant = _openAiAssistant;

// ── Detail panel'e AI butonu ekle ────────────────────────────────
const _aiOrigOpenDetail = window._pfRealOpenDetail;
window._pfRealOpenDetail = function(taskId) {
  _aiOrigOpenDetail?.(taskId);
  setTimeout(() => {
    const task = loadTasks().find(t => t.id === taskId);
    const cu   = _getCU();
    if (!task || !cu) return;

    // Sadece atanan kişi veya katılımcı görebilir
    const canUse = task.uid === cu.id || window.isAdmin?.() ||
      (task.participants||[]).includes(cu.id) ||
      (task.managers||[]).includes(cu.id);
    if (!canUse) return;

    // pdp-tabbar'a AI sekmesi ekle
    const tabbar = document.getElementById('pdp-tabbar');
    if (!tabbar || tabbar.querySelector('#pdp-tab-ai')) return;
    const aiTab = document.createElement('button');
    aiTab.id = 'pdp-tab-ai';
    aiTab.style.cssText = 'flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit';
    aiTab.innerHTML = '🤖 AI';
    aiTab.onclick = () => _openAiAssistant(taskId);
    tabbar.appendChild(aiTab);
  }, 200);
};

// ── Takvim sync başlangıcı ────────────────────────────────────────
const _calSyncOnRender = window.renderPusula;
window.renderPusula = function() {
  _calSyncOnRender?.();
  setTimeout(_syncTasksToCalendar, 1000);
};

// ── Görev modalına takvim çakışma uyarısı ekle ────────────────────
const _calOrigModal = window._pfRealOpenAdd;
window._pfRealOpenAdd = function() {
  _calOrigModal?.();
  setTimeout(() => {
    const dueInp = document.getElementById('tk-due');
    if (dueInp) {
      dueInp.onchange = e => window._checkTaskDateConflict?.(e.target.value);
      // Çakışma uyarı alanı ekle
      if (!document.getElementById('tk-date-conflict')) {
        const warn = document.createElement('div');
        warn.id = 'tk-date-conflict';
        warn.style.cssText = 'display:none;margin-top:5px;padding:6px 10px;background:rgba(245,158,11,.1);border-radius:8px;font-size:11px;color:#D97706;font-weight:600';
        dueInp.parentElement?.appendChild(warn);
      }
    }
  }, 150);
};

console.info('[Pusula] Bildirim + Dashboard + Takvim + AI aktif ✓');



// ── Araçlar Dropdown Menüsü ──────────────────────────────────────
(function _initToolsMenu() {
  // CSS
  const s = document.createElement('style');
  s.id = 'pus-tools-css';
  s.textContent = `
    .pus-tools-group {
      position: relative;
    }
    .pus-tools-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 10px;
      color: rgba(255,255,255,.9);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
      white-space: nowrap;
    }
    .pus-tools-trigger:hover,
    .pus-tools-trigger.open {
      background: rgba(255,255,255,.22);
      border-color: rgba(255,255,255,.45);
      color: #fff;
    }
    .pus-tools-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 210px;
      background: var(--sf);
      border: 1px solid var(--b);
      border-radius: 14px;
      box-shadow: 0 16px 48px rgba(0,0,0,.18);
      padding: 8px;
      z-index: 6000;
      animation: ptm-in .15s ease;
    }
    @keyframes ptm-in {
      from { opacity:0; transform:translateY(-6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .ptm-section-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 6px 10px 3px;
    }
    .ptm-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      background: none;
      border: none;
      border-radius: 9px;
      padding: 8px 10px;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: background .12s;
    }
    .ptm-item:hover { background: var(--s2); }
    .ptm-item:hover .ptm-title { color: var(--ac); }
    .ptm-icon {
      font-size: 18px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--s2);
      border-radius: 8px;
      flex-shrink: 0;
    }
    .ptm-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--t);
      transition: color .12s;
    }
    .ptm-desc {
      font-size: 10px;
      color: var(--t3);
      margin-top: 1px;
    }
    .ptm-divider {
      height: 1px;
      background: var(--b);
      margin: 5px 6px;
    }
    .pus-tools-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 240px;
      background: var(--sf);
      border: 1px solid var(--b);
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.2);
      padding: 8px;
      z-index: 6000;
      animation: ptm-in .15s ease;
    }
  `;
  if (!document.getElementById('pus-tools-css')) document.head.appendChild(s);

  // Toggle
  window._toggleToolsMenu = function(btn) {
    const menu = document.getElementById('pus-tools-menu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    if (isOpen) {
      menu.style.display = 'none';
      btn?.classList.remove('open');
    } else {
      menu.style.display = 'block';
      btn?.classList.add('open');
      // Dışarı tıklanınca kapat
      setTimeout(() => {
        const closer = (e) => {
          if (!menu.contains(e.target) && e.target !== btn) {
            menu.style.display = 'none';
            btn?.classList.remove('open');
          }
          document.removeEventListener('click', closer);
        };
        document.addEventListener('click', closer);
      }, 0);
    }
  };

  window._closeToolsMenu = function() {
    const menu = document.getElementById('pus-tools-menu');
    const btn  = document.querySelector('.pus-tools-trigger');
    if (menu) menu.style.display = 'none';
    if (btn)  btn.classList.remove('open');
  };
})();


// ════════════════════════════════════════════════════════════════
// PUSULA — 3 GELİŞTİRME
// 1. Yorum & Aktivite Akışı  2. Eisenhower Matrix  3. Gamification
// ════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────
// 1. 📬 GELİŞMİŞ YORUM & AKTİVİTE AKIŞI
// ────────────────────────────────────────────────────────────────
(function _initActivityFeed() {
  const ACT_KEY = 'ak_task_activity';

  function _loadActivity(taskId) {
    try {
      const all = JSON.parse(localStorage.getItem(ACT_KEY) || '{}');
      return all[taskId] || [];
    } catch(e) { return []; }
  }

  function _saveActivity(taskId, entries) {
    try {
      const all = JSON.parse(localStorage.getItem(ACT_KEY) || '{}');
      all[taskId] = entries;
      localStorage.setItem(ACT_KEY, JSON.stringify(all));
    } catch(e) {}
  }

  function _addActivity(taskId, type, data) {
    const cu      = _getCU();
    const entries = _loadActivity(taskId);
    entries.push({
      id:   generateNumericId(),
      ts:   nowTs(),
      uid:  cu?.id,
      name: cu?.name || '?',
      type, // 'comment' | 'status' | 'assign' | 'create' | 'edit' | 'complete'
      data,
    });
    _saveActivity(taskId, entries);
    _renderActivityFeed(taskId);
  }

  function _renderActivityFeed(taskId) {
    const cont = document.getElementById('pus-act-feed');
    if (!cont) return;
    const entries = _loadActivity(taskId).slice().reverse();
    const users   = loadUsers();

    if (!entries.length) {
      cont.innerHTML = '<div style="text-align:center;padding:32px;color:var(--t3);font-size:13px"><div style="font-size:28px;margin-bottom:8px">📬</div>Henüz aktivite yok</div>';
      return;
    }

    const avc = _getAVC?.() || window.AVC || [['#EEEDFE','#26215C']];

    cont.innerHTML = entries.map(e => {
      const u    = users.find(x => x.id === e.uid);
      const idx  = users.indexOf(u);
      const c    = avc[Math.max(idx,0) % avc.length];
      const av   = `<div style="width:30px;height:30px;border-radius:9px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${_pusInitials(u?.name||e.name||'?')}</div>`;
      const time = e.ts ? `<span style="font-size:10px;color:var(--t3)">${e.ts.slice(5,16).replace('T',' ')}</span>` : '';

      // Yorum tipi
      if (e.type === 'comment') {
        const canDel = window.isAdmin?.() || e.uid === _getCU()?.id;
        return `
          <div class="pus-act-item" data-id="${e.id}">
            ${av}
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:700;color:var(--t)">${u?.name||e.name||'?'}</span>
                <span style="font-size:10px;padding:1px 7px;border-radius:4px;background:var(--s2);color:var(--t3)">yorum yaptı</span>
                ${time}
                ${canDel ? `<button onclick="window._delActivity?.(${taskId},${e.id})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--t3);font-size:11px;padding:2px 5px;border-radius:4px;transition:color .15s" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='var(--t3)'">✕</button>` : ''}
              </div>
              <div style="background:var(--s2);border-radius:0 10px 10px 10px;padding:10px 14px;font-size:13px;color:var(--t);line-height:1.6;border:1px solid var(--b);white-space:pre-wrap">${e.data?.text||''}</div>
              ${e.data?.reactions ? _renderReactions(taskId, e.id, e.data.reactions) : _renderReactions(taskId, e.id, {})}
            </div>
          </div>`;
      }

      // Sistem olayları
      const icons = { status:'🔄', assign:'👤', create:'✅', edit:'✏️', complete:'🎉', file:'📎' };
      const icon  = icons[e.type] || '📝';
      const desc  = e.data?.text || e.type;
      return `
        <div class="pus-act-item pus-act-system">
          <div style="width:30px;display:flex;justify-content:center;color:var(--t3);font-size:14px;flex-shrink:0">${icon}</div>
          <div style="flex:1;min-width:0">
            <span style="font-size:12px;color:var(--t2)"><strong>${u?.name||e.name||'Sistem'}</strong> ${desc}</span>
            <span style="font-size:10px;color:var(--t3);margin-left:6px">${e.ts?.slice(5,16)||''}</span>
          </div>
        </div>`;
    }).join('');
  }

  function _renderReactions(taskId, entryId, reactions) {
    const EMOJIS = ['👍','❤️','🎉','🔥','👀'];
    const cu = _getCU();
    return `<div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
      ${EMOJIS.map(em => {
        const users = (reactions[em] || []);
        const hasMe = users.includes(cu?.id);
        return `<button onclick="window._toggleReaction?.(${taskId},${entryId},'${em}')"
          style="background:${hasMe?'var(--al)':'var(--s2)'};border:1px solid ${hasMe?'var(--ac)':'var(--b)'};border-radius:20px;padding:2px 8px;font-size:12px;cursor:pointer;transition:all .15s;color:${hasMe?'var(--ac)':'var(--t3)'}">${em}${users.length > 0 ? ` <span style="font-size:10px">${users.length}</span>` : ''}</button>`;
      }).join('')}
    </div>`;
  }

  function _renderCommentBox(taskId) {
    return `
      <div style="border-top:1px solid var(--b);padding:12px 14px;background:var(--sf);flex-shrink:0">
        <div style="display:flex;gap:8px;align-items:flex-end">
          <textarea id="pus-act-inp" class="fi" rows="2"
            style="flex:1;resize:none;font-size:13px;border-radius:10px;padding:8px 12px;line-height:1.5"
            placeholder="Yorum yaz… (@mention için @ kullan)"></textarea>
          <div style="display:flex;flex-direction:column;gap:5px">
            <button onclick="window._sendComment?.(${taskId})"
              style="background:var(--ac);color:#fff;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:700;transition:all .15s">
              ➤
            </button>
          </div>
        </div>
        <div style="font-size:10px;color:var(--t3);margin-top:5px;padding-left:2px">Enter → gönder · Shift+Enter → yeni satır · @isim → mention</div>
      </div>`;
  }

  // Görev detay pane'ine aktivite sekmesi ekle
  window._injectActivityTab = function(taskId) {
    // Mevcut chat pane'ini aktivite akışıyla güçlendir
    const chatPane = document.getElementById('pdp-pane-chat');
    if (!chatPane) return;

    // Zaten enjekte edildiyse skip
    if (chatPane.dataset.activityInjected) {
      _renderActivityFeed(taskId);
      return;
    }
    chatPane.dataset.activityInjected = '1';
    chatPane.style.cssText = 'flex:1;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden';

    chatPane.innerHTML = `
      <!-- Tab switcher: Yorumlar / Aktivite -->
      <div style="display:flex;border-bottom:1px solid var(--b);background:var(--s2);flex-shrink:0">
        <button id="pus-act-tab-comments" onclick="window._switchActivityTab?.('comments')"
          style="flex:1;padding:8px;border:none;background:none;cursor:pointer;font-size:11px;font-weight:700;color:var(--ac);border-bottom:2px solid var(--ac);font-family:inherit">💬 Yorumlar</button>
        <button id="pus-act-tab-activity" onclick="window._switchActivityTab?.('activity')"
          style="flex:1;padding:8px;border:none;background:none;cursor:pointer;font-size:11px;font-weight:500;color:var(--t3);border-bottom:2px solid transparent;font-family:inherit">📋 Aktivite</button>
      </div>
      <!-- Feed -->
      <div id="pus-act-feed" style="flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px"></div>
      <!-- Yorum kutusu (sadece yorum sekmesinde) -->
      <div id="pus-act-comment-box">${_renderCommentBox(taskId)}</div>`;

    // Activity CSS
    if (!document.getElementById('pus-act-css')) {
      const s = document.createElement('style');
      s.id = 'pus-act-css';
      s.textContent = `
        .pus-act-item { display:flex; gap:10px; align-items:flex-start; }
        .pus-act-system { opacity:.75; }
        #pus-act-feed { scroll-behavior:smooth; }
        #pus-act-inp:focus { border-color:var(--ac); }
      `;
      document.head.appendChild(s);
    }

    // Enter gönder
    setTimeout(() => {
      const inp = document.getElementById('pus-act-inp');
      if (inp) inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window._sendComment?.(taskId); }
      });
    }, 100);

    _renderActivityFeed(taskId);
    // Önceki mesajları aktivite olarak al
    const oldChats = (loadTaskChats()[taskId] || []);
    if (oldChats.length && !_loadActivity(taskId).length) {
      // Eski chat mesajlarını aktiviteye geçir
      const entries = _loadActivity(taskId);
      oldChats.forEach(m => {
        if (!entries.find(e => e.id === m.id)) {
          entries.push({ id: m.id, ts: m.ts, uid: m.uid, name: m.name, type: 'comment', data: { text: m.text } });
        }
      });
      _saveActivity(taskId, entries);
      _renderActivityFeed(taskId);
    }
  };

  window._switchActivityTab = function(tab) {
    const commentBtn = document.getElementById('pus-act-tab-comments');
    const activityBtn = document.getElementById('pus-act-tab-activity');
    const box = document.getElementById('pus-act-comment-box');
    const feed = document.getElementById('pus-act-feed');
    if (!commentBtn || !activityBtn) return;

    if (tab === 'comments') {
      commentBtn.style.color = 'var(--ac)'; commentBtn.style.borderBottomColor = 'var(--ac)'; commentBtn.style.fontWeight = '700';
      activityBtn.style.color = 'var(--t3)'; activityBtn.style.borderBottomColor = 'transparent'; activityBtn.style.fontWeight = '500';
      if (box) box.style.display = '';
    } else {
      activityBtn.style.color = 'var(--ac)'; activityBtn.style.borderBottomColor = 'var(--ac)'; activityBtn.style.fontWeight = '700';
      commentBtn.style.color = 'var(--t3)'; commentBtn.style.borderBottomColor = 'transparent'; commentBtn.style.fontWeight = '500';
      if (box) box.style.display = 'none';
    }
    if (feed && _PDP_TASK_ID) _renderActivityFeed(_PDP_TASK_ID);
  };

  window._sendComment = function(taskId) {
    const inp = document.getElementById('pus-act-inp');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) { window.toast?.('Yorum boş olamaz', 'warn'); return; }
    _addActivity(taskId, 'comment', { text });
    inp.value = '';
    // Scroll en alta
    setTimeout(() => {
      const feed = document.getElementById('pus-act-feed');
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, 100);
    window.toast?.('Yorum eklendi ✓', 'ok');
  };

  window._delActivity = function(taskId, entryId) {
    const entries = _loadActivity(taskId).filter(e => e.id !== entryId);
    _saveActivity(taskId, entries);
    _renderActivityFeed(taskId);
  };

  window._toggleReaction = function(taskId, entryId, emoji) {
    const entries = _loadActivity(taskId);
    const e = entries.find(x => x.id === entryId);
    if (!e) return;
    if (!e.data) e.data = {};
    if (!e.data.reactions) e.data.reactions = {};
    const cu = _getCU();
    if (!cu) return;
    const users = e.data.reactions[emoji] || [];
    const idx   = users.indexOf(cu.id);
    if (idx > -1) users.splice(idx, 1);
    else users.push(cu.id);
    e.data.reactions[emoji] = users;
    _saveActivity(taskId, entries);
    _renderActivityFeed(taskId);
  };

  // openPusDetail'e aktivite enjeksiyonunu bağla
  const _actOrigDetail = window._pfRealOpenDetail || window.openPusDetail;
  function _actHook(taskId) {
    _actOrigDetail?.(taskId);
    setTimeout(() => {
      window._injectActivityTab?.(taskId);
      // Görev açılmasını logla
      const entries = _loadActivity(taskId);
      if (!entries.find(e => e.type === 'create')) {
        const task = loadTasks().find(t => t.id === taskId);
        if (task) _addActivity(taskId, 'create', { text: `"${task.title}" görevi oluşturuldu` });
      }
    }, 250);
  }
  if (window._pfRealOpenDetail) window._pfRealOpenDetail = _actHook;
  else window.openPusDetail = _actHook;

  // toggleTask'a aktivite logu ekle
  const _actOrigToggle = window.Pusula?.toggle;
  if (window.Pusula && _actOrigToggle) {
    window.Pusula.toggle = function(id, done) {
      _actOrigToggle.call(window.Pusula, id, done);
      _addActivity(id, done ? 'complete' : 'edit', { text: done ? 'görevi tamamladı' : 'görevi yeniden açtı' });
    };
  }

  // Global export
  window._loadActivity = _loadActivity;
  window._addActivity  = _addActivity;
  console.info('[Pusula] Aktivite akışı aktif ✓');
})();

// ────────────────────────────────────────────────────────────────
// 2. 📐 EİSENHOWER MATRİX — 4 Kadran Önceliklendirme
// ────────────────────────────────────────────────────────────────
(function _initEisenhower() {

  function _calcTaskQuadrant(t, todayS) {
    const isUrgent    = t.pri <= 2 || (t.due && t.due <= new Date(Date.now() + 3*86400000).toISOString().slice(0,10));
    const isImportant = t.pri <= 2 || (t.due && t.due <= new Date(Date.now() + 7*86400000).toISOString().slice(0,10));
    if (isUrgent && isImportant) return 'q1'; // Kritik — Hemen Yap
    if (!isUrgent && isImportant) return 'q2'; // Planla
    if (isUrgent && !isImportant) return 'q3'; // Devret
    return 'q4'; // Elemek
  }

  function _renderEisenhower() {
    const main  = document.getElementById('pus-main-view');
    if (!main) return;

    const tasks  = window.visTasks?.() || loadTasks();
    const active = tasks.filter(t => !t.done && t.status !== 'done');
    const todayS = new Date().toISOString().slice(0,10);
    const users  = loadUsers();

    const Q = { q1:[], q2:[], q3:[], q4:[] };
    active.forEach(t => Q[_calcTaskQuadrant(t, todayS)].push(t));

    const QUADS = [
      { id:'q1', label:'🔴 Hemen Yap',   sub:'Önemli & Acil',         bg:'rgba(239,68,68,.06)',   border:'rgba(239,68,68,.2)',   color:'#EF4444' },
      { id:'q2', label:'🟡 Planla',       sub:'Önemli & Acil Değil',   bg:'rgba(245,158,11,.06)',  border:'rgba(245,158,11,.2)',  color:'#D97706' },
      { id:'q3', label:'🔵 Devret',       sub:'Acil & Önemli Değil',   bg:'rgba(59,130,246,.06)',  border:'rgba(59,130,246,.2)',  color:'#3B82F6' },
      { id:'q4', label:'⚪ Ele',          sub:'Ne Acil Ne Önemli',      bg:'rgba(100,116,139,.06)', border:'rgba(100,116,139,.2)', color:'#6B7280' },
    ];

    main.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:4px 0">
        ${QUADS.map(q => `
          <div ondragover="event.preventDefault()" ondrop="window._eisDrop?.(event,'${q.id}')" style="background:${q.bg};border:1px solid ${q.border};border-radius:14px;padding:14px;min-height:180px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div>
                <div style="font-size:13px;font-weight:700;color:${q.color}">${q.label}</div>
                <div style="font-size:10px;color:var(--t3);margin-top:1px">${q.sub}</div>
              </div>
              <div style="font-size:18px;font-weight:800;color:${q.color};font-family:monospace">${Q[q.id].length}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px">
              ${Q[q.id].slice(0,6).map(t => {
                const u = users.find(x => x.id === t.uid);
                return `
                  <div onclick="openPusDetail(${t.id})" draggable="true" ondragstart="event.dataTransfer.setData('taskId',${t.id})" style="background:var(--sf);border:1px solid var(--b);border-radius:9px;padding:8px 10px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:8px"
                    onmouseover="this.style.borderColor='${q.color}';this.style.transform='translateX(2px)'"
                    onmouseout="this.style.borderColor='var(--b)';this.style.transform=''">
                    <div style="width:4px;height:32px;border-radius:2px;background:${q.color};flex-shrink:0"></div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:12px;font-weight:600;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
                      <div style="font-size:10px;color:var(--t3);margin-top:2px">${u?.name||'—'} ${t.due?'· '+t.due:''}</div>
                    </div>
                  </div>`;
              }).join('')}
              ${Q[q.id].length > 6 ? `<div style="font-size:11px;color:var(--t3);text-align:center;padding:4px">+${Q[q.id].length-6} daha…</div>` : ''}
              ${Q[q.id].length === 0 ? `<div style="font-size:12px;color:var(--t3);text-align:center;padding:16px;opacity:.6">Görev yok ✓</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:10px;text-align:center;font-size:11px;color:var(--t3)">
        Öncelik + bitiş tarihine göre otomatik sınıflandırma · <button onclick="setPusView('list',null)" style="background:none;border:none;cursor:pointer;color:var(--ac);font-size:11px;text-decoration:underline;font-family:inherit">Listeye dön</button>
      </div>`;
  }

  // View sistemine matrix görünümü ekle
  const _emOrigSetView = window._pfRealSetPusView || window.setPusView;
  window._pfRealSetPusView = function(v, btn) {
    _emOrigSetView?.(v, btn);
    if (v === 'matrix') {
      setTimeout(_renderEisenhower, 50);
    }
  };

  // index.html'e matrix butonu ekle (JS ile)
  function _addMatrixBtn() {
    const viewRow = document.getElementById('pus-view-row');
    if (!viewRow || viewRow.querySelector('#pus-v-matrix')) return;
    const btn = document.createElement('button');
    btn.id = 'pus-v-matrix';
    btn.className = 'pvt-btn';
    btn.title = 'Eisenhower Matrix';
    btn.innerHTML = `<svg width="13" height="13" fill="none" viewBox="0 0 13 13">
      <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.4"/>
      <line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.4"/>
      <rect x="1.5" y="1.5" width="4" height="4" rx=".5" fill="currentColor" opacity=".7"/>
    </svg> Matrix`;
    btn.onclick = () => {
      document.querySelectorAll('.pvt-btn,.cvb').forEach(b => b.classList.remove('on','active'));
      btn.classList.add('on','active');
      window._pfRealSetPusView?.('matrix', btn);
      window.PUS_VIEW = 'matrix';
      localStorage.setItem('ak_pus_view','matrix');
    };
    viewRow.appendChild(btn);
  }

  const _emOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _emOrigRender?.();
    setTimeout(_addMatrixBtn, 200);
    if (localStorage.getItem('ak_pus_view') === 'matrix') {
      setTimeout(_renderEisenhower, 100);
    }
  };

  window._renderEisenhower = _renderEisenhower;
  console.info('[Pusula] Eisenhower Matrix aktif ✓');
})();

// ────────────────────────────────────────────────────────────────
// 3. 🏆 GAMİFİCATİON — Puan, Rozet & Streak Sistemi
// ────────────────────────────────────────────────────────────────
(function _initGamification() {
  const GF_KEY   = 'ak_pus_gamif';
  const BADGES   = [
    { id:'first_task',   icon:'🎯', name:'İlk Adım',      desc:'İlk görevini tamamladın',          req: s => s.totalDone >= 1 },
    { id:'speed5',       icon:'⚡', name:'Hız Ustası',     desc:'5 görevi zamanında bitir',          req: s => s.onTime >= 5 },
    { id:'streak3',      icon:'🔥', name:'3 Gün Serisi',   desc:'3 gün art arda görev tamamla',     req: s => s.streak >= 3 },
    { id:'streak7',      icon:'🚀', name:'Haftalık Kahraman',desc:'7 gün art arda görev tamamla',   req: s => s.streak >= 7 },
    { id:'done10',       icon:'💎', name:'10 Görev',       desc:'Toplam 10 görev tamamla',           req: s => s.totalDone >= 10 },
    { id:'done50',       icon:'👑', name:'50 Görev',       desc:'Toplam 50 görev tamamla',           req: s => s.totalDone >= 50 },
    { id:'early_bird',   icon:'🌅', name:'Erken Kuş',      desc:'Görev süresinden önce bitir',       req: s => s.earlyDone >= 3 },
    { id:'team_player',  icon:'🤝', name:'Takım Oyuncusu', desc:'5 farklı kişiyle çalış',           req: s => s.uniqueCollab >= 5 },
    { id:'multi_dept',   icon:'🌐', name:'Çok Yönlü',      desc:'3 farklı departmanda görev tamamla', req: s => s.depts >= 3 },
    { id:'no_overdue',   icon:'⏰', name:'Dakik',          desc:'10 görevi gecikme olmadan bitir',   req: s => s.noOverdue >= 10 },
  ];

  function _loadGF() {
    try { return JSON.parse(localStorage.getItem(GF_KEY) || '{}'); } catch(e) { return {}; }
  }
  function _saveGF(d) { localStorage.setItem(GF_KEY, JSON.stringify(d)); }

  function _getUserGF(uid) {
    const all = _loadGF();
    if (!all[uid]) all[uid] = { xp:0, level:1, totalDone:0, onTime:0, earlyDone:0, streak:0, lastDoneDate:'', noOverdue:0, uniqueCollab:[], depts:[], badges:[] };
    return all[uid];
  }
  function _saveUserGF(uid, data) {
    const all = _loadGF();
    all[uid] = data;
    _saveGF(all);
  }

  function _levelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 50)) + 1;
  }
  function _xpForLevel(lvl) {
    return Math.pow(lvl - 1, 2) * 50;
  }

  function _awardXP(uid, amount, reason) {
    const gf   = _getUserGF(uid);
    gf.xp     += amount;
    const newLvl = _levelFromXP(gf.xp);
    const levelUp = newLvl > gf.level;
    gf.level = newLvl;
    _saveUserGF(uid, gf);

    // Toast
    window.toast?.(`+${amount} XP — ${reason}`, 'ok');
    if (levelUp) {
      setTimeout(() => {
        _showLevelUpCelebration(newLvl);
      }, 500);
    }
    return gf;
  }

  function _checkBadges(uid) {
    const gf = _getUserGF(uid);
    const newBadges = [];
    BADGES.forEach(b => {
      if (!gf.badges.includes(b.id)) {
        const stats = {
          totalDone: gf.totalDone, onTime: gf.onTime, streak: gf.streak,
          earlyDone: gf.earlyDone, noOverdue: gf.noOverdue,
          uniqueCollab: (gf.uniqueCollab||[]).length, depts: (gf.depts||[]).length,
        };
        if (b.req(stats)) {
          gf.badges.push(b.id);
          newBadges.push(b);
        }
      }
    });
    if (newBadges.length) {
      _saveUserGF(uid, gf);
      newBadges.forEach(b => _showBadgeNotif(b));
    }
  }

  function _showBadgeNotif(badge) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:24px', 'z-index:9999',
      'background:linear-gradient(135deg,#6366F1,#8B5CF6)',
      'color:#fff', 'border-radius:16px', 'padding:14px 18px',
      'display:flex', 'align-items:center', 'gap:12px',
      'box-shadow:0 8px 32px rgba(99,102,241,.4)',
      'animation:badge-in .4s ease', 'max-width:300px',
    ].join(';');
    el.innerHTML = `
      <div style="font-size:28px">${badge.icon}</div>
      <div>
        <div style="font-size:11px;opacity:.8;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Yeni Rozet!</div>
        <div style="font-size:14px;font-weight:800">${badge.name}</div>
        <div style="font-size:11px;opacity:.75;margin-top:2px">${badge.desc}</div>
      </div>`;
    document.body.appendChild(el);
    if (!document.getElementById('badge-anim-css')) {
      const s = document.createElement('style');
      s.id = 'badge-anim-css';
      s.textContent = `@keyframes badge-in{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}`;
      document.head.appendChild(s);
    }
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(60px)'; el.style.transition='all .4s'; setTimeout(()=>el.remove(), 400); }, 3500);
  }

  function _showLevelUpCelebration(level) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;pointer-events:none';
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border-radius:24px;padding:28px 40px;text-align:center;box-shadow:0 20px 60px rgba(99,102,241,.5);animation:badge-in .4s ease">
        <div style="font-size:48px;margin-bottom:8px">🎊</div>
        <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.1em;font-weight:700">Seviye Atladın!</div>
        <div style="font-size:48px;font-weight:900;font-family:monospace">LVL ${level}</div>
        <div style="font-size:13px;opacity:.8;margin-top:4px">Harika iş çıkardın!</div>
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // Görev tamamlandığında XP ver
  function _onTaskComplete(taskId) {
    const cu   = _getCU();
    if (!cu) return;
    const task = loadTasks().find(t => t.id === taskId);
    if (!task) return;
    const gf   = _getUserGF(cu.id);
    const todayS = new Date().toISOString().slice(0,10);

    // Temel XP
    const baseXP = { 1:50, 2:30, 3:20, 4:10 }[task.pri] || 20;
    let totalXP  = baseXP;
    let reasons  = [];

    // Zamanında mı?
    const isOnTime = !task.due || task.due >= todayS;
    if (isOnTime) { gf.onTime++; totalXP += 10; reasons.push('zamanında'); }

    // Erken mi?
    if (task.due && task.due > todayS) { gf.earlyDone++; totalXP += 15; reasons.push('erken +15'); }
    if (isOnTime) gf.noOverdue++;

    // Streak
    if (gf.lastDoneDate === new Date(Date.now()-86400000).toISOString().slice(0,10)) {
      gf.streak++;
      if (gf.streak >= 3) { totalXP += gf.streak * 5; reasons.push(`${gf.streak} seri +${gf.streak*5}`); }
    } else if (gf.lastDoneDate !== todayS) {
      gf.streak = 1;
    }
    gf.lastDoneDate = todayS;
    gf.totalDone++;

    // Departman
    if (task.department && !(gf.depts||[]).includes(task.department)) {
      (gf.depts = gf.depts||[]).push(task.department);
    }
    // Kolab
    if (task.uid !== cu.id && !(gf.uniqueCollab||[]).includes(task.uid)) {
      (gf.uniqueCollab = gf.uniqueCollab||[]).push(task.uid);
    }

    _saveUserGF(cu.id, gf);
    _awardXP(cu.id, totalXP, reasons.join(', ') || 'görev tamamlandı');
    _checkBadges(cu.id);
  }

  // toggleTask hook
  const _gfOrigToggle = window.Pusula?.toggle;
  if (window.Pusula && _gfOrigToggle) {
    const _gfWrapped = window.Pusula.toggle;
    window.Pusula.toggle = function(id, done) {
      _gfWrapped.call(window.Pusula, id, done);
      if (done) setTimeout(() => _onTaskComplete(id), 300);
    };
  }

  // XP bar — hero'ya enjekte et
  function _injectXPBar() {
    if (document.getElementById('pus-xp-bar-wrap')) return;
    const heroInner = document.querySelector('.pus-hero-inner');
    if (!heroInner) return;
    const cu = _getCU();
    if (!cu) return;
    const gf     = _getUserGF(cu.id);
    const lvl    = _levelFromXP(gf.xp);
    const xpCur  = gf.xp - _xpForLevel(lvl);
    const xpNext = _xpForLevel(lvl+1) - _xpForLevel(lvl);
    const pct    = Math.min(100, Math.round(xpCur / xpNext * 100));
    const earnedBadges = BADGES.filter(b => gf.badges.includes(b.id));

    const wrap = document.createElement('div');
    wrap.id = 'pus-xp-bar-wrap';
    wrap.style.cssText = 'padding:0 0 12px;cursor:pointer';
    wrap.title = 'Performans rozetlerim';
    wrap.onclick = () => window._openGamifDashboard?.();
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
        <div style="background:rgba(255,255,255,.15);border-radius:8px;padding:3px 10px;font-size:11px;font-weight:800;color:#fff">LVL ${lvl}</div>
        <div style="flex:1;height:5px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden">
          <div style="height:100%;background:#FACC15;width:${pct}%;border-radius:4px;transition:width .6s ease"></div>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,.65)">${gf.xp} XP</div>
        ${earnedBadges.slice(0,4).map(b=>`<span title="${b.name}" style="font-size:14px">${b.icon}</span>`).join('')}
      </div>`;
    heroInner.appendChild(wrap);
  }

  // Gamification Dashboard
  window._openGamifDashboard = function() {
    const cu = _getCU();
    if (!cu) return;
    const gf = _getUserGF(cu.id);
    const lvl = _levelFromXP(gf.xp);
    const xpCur = gf.xp - _xpForLevel(lvl);
    const xpNext = _xpForLevel(lvl+1) - _xpForLevel(lvl);
    const pct = Math.min(100, Math.round(xpCur / xpNext * 100));
    const earnedBadges = BADGES.filter(b => gf.badges.includes(b.id));
    const lockedBadges = BADGES.filter(b => !gf.badges.includes(b.id));

    let overlay = document.getElementById('pus-gamif-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'pus-gamif-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8800;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
    document.body.appendChild(overlay);

    overlay.innerHTML = `
      <div style="background:var(--sf);border-radius:24px;padding:28px;max-width:560px;width:100%;max-height:88vh;overflow-y:auto;position:relative">
        <button onclick="document.getElementById('pus-gamif-overlay').remove()" style="position:absolute;top:18px;right:20px;background:var(--s2);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;color:var(--t3)">×</button>

        <!-- Profil -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <div style="width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff">${lvl}</div>
          <div style="flex:1">
            <div style="font-size:17px;font-weight:800;color:var(--t)">${cu.name}</div>
            <div style="font-size:12px;color:var(--t3);margin-bottom:6px">Seviye ${lvl} · ${gf.xp} XP toplam</div>
            <div style="height:8px;background:var(--b);border-radius:6px;overflow:hidden">
              <div style="height:100%;background:linear-gradient(90deg,#6366F1,#FACC15);width:${pct}%;border-radius:6px;transition:width .8s ease"></div>
            </div>
            <div style="font-size:10px;color:var(--t3);margin-top:3px">${xpCur}/${xpNext} XP → Seviye ${lvl+1}</div>
          </div>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
          ${[
            ['🎯', gf.totalDone||0, 'Tamamlanan'],
            ['🔥', gf.streak||0, 'Günlük Seri'],
            ['⚡', gf.onTime||0, 'Zamanında'],
            ['🏅', earnedBadges.length, 'Rozet'],
          ].map(([ic,v,l]) => `
            <div style="background:var(--s2);border-radius:12px;padding:12px;text-align:center">
              <div style="font-size:18px;margin-bottom:4px">${ic}</div>
              <div style="font-size:22px;font-weight:800;color:var(--t);font-family:monospace">${v}</div>
              <div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">${l}</div>
            </div>`).join('')}
        </div>

        <!-- Kazanılan rozetler -->
        ${earnedBadges.length ? `
          <div style="margin-bottom:16px">
            <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:10px">🏆 Rozetlerim (${earnedBadges.length})</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
              ${earnedBadges.map(b => `
                <div style="background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.1));border:1px solid rgba(99,102,241,.25);border-radius:12px;padding:12px;text-align:center">
                  <div style="font-size:24px;margin-bottom:5px">${b.icon}</div>
                  <div style="font-size:11px;font-weight:700;color:var(--ac)">${b.name}</div>
                  <div style="font-size:10px;color:var(--t3);margin-top:2px">${b.desc}</div>
                </div>`).join('')}
            </div>
          </div>` : ''}

        <!-- Kilitli rozetler -->
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--t3);margin-bottom:10px">🔒 Kilitli (${lockedBadges.length})</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
            ${lockedBadges.map(b => `
              <div style="background:var(--s2);border:1px solid var(--b);border-radius:12px;padding:12px;text-align:center;opacity:.5">
                <div style="font-size:24px;margin-bottom:5px;filter:grayscale(1)">${b.icon}</div>
                <div style="font-size:11px;font-weight:600;color:var(--t2)">${b.name}</div>
                <div style="font-size:10px;color:var(--t3);margin-top:2px">${b.desc}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  };

  const _gfOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _gfOrigRender?.();
    setTimeout(_injectXPBar, 300);
  };

  console.info('[Pusula] Gamification aktif ✓');
})();



// ────────────────────────────────────────────────────────────────
// PUSULA v2.4.0 — Hızlı Görev Modal + Alt Görev Toggle + Durum Yönetimi + Matrix DnD
// ────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// 1. ⚡ HIZLI GÖREV MODAL — Mini modal ile hızlı görev oluşturma
// ══════════════════════════════════════════════════════════════════
(function _initQuickTaskModal() {

  /**
   * @description Topbar'a ⚡ hızlı görev butonu ekler.
   * Tıklayınca mini modal açılır: başlık + öncelik + atanan kişi.
   */
  function _injectQuickTaskBtn() {
    const topbarRight = document.querySelector('.pus-topbar-right');
    if (!topbarRight || topbarRight.querySelector('#pus-quick-modal-btn')) return;
    const addBtn = topbarRight.querySelector('.pus-add-btn');
    if (!addBtn) return;

    const btn = document.createElement('button');
    btn.id = 'pus-quick-modal-btn';
    btn.className = 'pus-add-btn';
    btn.style.cssText = 'background:var(--al);color:var(--ac);border:1px solid var(--ac);margin-right:6px';
    btn.innerHTML = '⚡ Hızlı';
    btn.title = 'Hızlı görev ekle (mini modal)';
    btn.onclick = _openQuickTaskModal;
    topbarRight.insertBefore(btn, addBtn);
  }

  /**
   * @description Hızlı görev mini modalını açar.
   */
  function _openQuickTaskModal() {
    let mo = document.getElementById('mo-quick-task');
    if (!mo) {
      mo = document.createElement('div');
      mo.id = 'mo-quick-task';
      mo.className = 'mo';
      mo.innerHTML = `
        <div class="moc" style="max-width:380px;padding:0;border-radius:16px;overflow:hidden;background:var(--sf)">
          <div style="padding:16px 20px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
            <div style="font-size:14px;font-weight:700;color:var(--t)">⚡ Hızlı Görev</div>
            <button onclick="closeMo('mo-quick-task')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
          </div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
            <div>
              <div class="fl" style="margin-bottom:4px">BAŞLIK</div>
              <input class="fi" id="qt-title" placeholder="Görev başlığı…" style="font-size:14px;padding:10px 12px" onkeydown="if(event.key==='Enter')window._saveQuickTask?.()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div class="fl" style="margin-bottom:4px">ÖNCELİK</div>
                <select class="fi" id="qt-pri" style="padding:8px 10px">
                  <option value="1">🔴 Kritik</option>
                  <option value="2">🟠 Önemli</option>
                  <option value="3" selected>🔵 Normal</option>
                  <option value="4">⚪ Düşük</option>
                </select>
              </div>
              <div>
                <div class="fl" style="margin-bottom:4px">PERSONEL</div>
                <select class="fi" id="qt-user" style="padding:8px 10px"></select>
              </div>
            </div>
          </div>
          <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btns" onclick="closeMo('mo-quick-task')">İptal</button>
            <button class="btn btnp" onclick="window._saveQuickTask?.()">Kaydet</button>
          </div>
        </div>`;
      document.body.appendChild(mo);
    }

    // Personel dropdown doldur
    const users = loadUsers();
    const cu = _getCU();
    const sel = document.getElementById('qt-user');
    if (sel) {
      if (window.isAdmin?.()) {
        sel.innerHTML = users.map(u =>
          `<option value="${u.id}"${u.id === cu?.id ? ' selected' : ''}>${escapeHtml(u.name)}</option>`
        ).join('');
      } else {
        sel.innerHTML = `<option value="${cu?.id}">${escapeHtml(cu?.name || 'Ben')}</option>`;
      }
    }

    // Formu sıfırla
    const titleInp = document.getElementById('qt-title');
    if (titleInp) titleInp.value = '';
    const priSel = document.getElementById('qt-pri');
    if (priSel) priSel.value = '3';

    window.openMo?.('mo-quick-task');
    setTimeout(() => titleInp?.focus(), 100);
  }

  /**
   * @description Hızlı görev modalından görev kaydeder.
   */
  window._saveQuickTask = function() {
    const title = (document.getElementById('qt-title')?.value || '').trim();
    if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }

    const cu = _getCU();
    if (!cu) { window.toast?.('Giriş yapmanız gerekiyor', 'err'); return; }

    const pri = parseInt(document.getElementById('qt-pri')?.value || '3');
    const uid = parseInt(document.getElementById('qt-user')?.value || cu.id);

    if (!window.isAdmin?.() && uid !== parseInt(cu.id)) {
      window.toast?.('Yetki yok', 'err');
      return;
    }

    const tasks = loadTasks();
    const newTask = {
      id:            generateNumericId(),
      title:         title,
      desc:          '',
      pri:           pri,
      due:           null,
      due_time:      '',
      deadline_full: null,
      start:         null,
      status:        'todo',
      department:    '',
      cost:          null,
      tags:          [],
      link:          '',
      duration:      null,
      uid:           uid,
      done:          false,
      subTasks:      [],
      participants:  [],
      viewers:       [],
      created_at:    nowTs(),
    };
    tasks.push(newTask);
    saveTasks(tasks);

    window.closeMo?.('mo-quick-task');
    window.toast?.('⚡ Görev eklendi: ' + title, 'ok');
    window.logActivity?.({ action: 'task_quick_add', details: { taskId: newTask.id, title } });
    renderPusula();
  };

  // renderPusula hook — butonu inject et
  const _qtOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _qtOrigRender?.();
    setTimeout(_injectQuickTaskBtn, 200);
  };

  window._openQuickTaskModal = _openQuickTaskModal;
  console.info('[Pusula] Hızlı görev modal aktif ✓');
})();


// ══════════════════════════════════════════════════════════════════
// 2. ▶/▼ ALT GÖREV TOPLU GİZLE/GÖSTER
// ══════════════════════════════════════════════════════════════════
(function _initSubtaskGlobalToggle() {

  const _GLOBAL_KEY = 'pus_sub_all_collapsed';

  /**
   * @description Topbar'a "Alt Görevler" toggle butonu ekler.
   */
  function _injectSubToggleBtn() {
    const topbarRight = document.querySelector('.pus-topbar-right');
    if (!topbarRight || topbarRight.querySelector('#pus-sub-toggle-all')) return;
    const sep = topbarRight.querySelector('.pus-topbar-sep');

    const btn = document.createElement('button');
    btn.id = 'pus-sub-toggle-all';
    btn.className = 'pvt-btn';
    btn.style.cssText = 'font-size:11px;padding:4px 8px;margin-right:4px;cursor:pointer';
    const collapsed = localStorage.getItem(_GLOBAL_KEY) === '1';
    btn.innerHTML = collapsed ? '▶ Alt Görevler' : '▼ Alt Görevler';
    btn.title = 'Tüm alt görevleri gizle/göster';
    btn.onclick = function() {
      const isCollapsed = localStorage.getItem(_GLOBAL_KEY) === '1';
      const newState = isCollapsed ? '0' : '1';
      localStorage.setItem(_GLOBAL_KEY, newState);

      // Tüm görevlerin alt görev durumunu güncelle
      const tasks = loadTasks();
      tasks.forEach(t => {
        localStorage.setItem('pus_sub_collapsed_' + t.id, newState);
      });

      // Mevcut DOM'daki alt görev body'lerini gizle/göster
      document.querySelectorAll('._sub_body').forEach(el => {
        el.style.display = newState === '1' ? 'none' : '';
      });
      document.querySelectorAll('._sub_collapse_btn').forEach(el => {
        const hintSpan = el.querySelector('span:last-child');
        if (hintSpan) hintSpan.textContent = newState === '1' ? 'göster' : 'gizle';
      });

      btn.innerHTML = newState === '1' ? '▶ Alt Görevler' : '▼ Alt Görevler';
      window.toast?.(newState === '1' ? 'Alt görevler gizlendi' : 'Alt görevler gösterildi', 'ok');
    };

    if (sep) {
      topbarRight.insertBefore(btn, sep);
    } else {
      topbarRight.insertBefore(btn, topbarRight.firstChild);
    }
  }

  // renderPusula hook
  const _stOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _stOrigRender?.();
    setTimeout(_injectSubToggleBtn, 250);
  };

  console.info('[Pusula] Alt görev global toggle aktif ✓');
})();


// ══════════════════════════════════════════════════════════════════
// 3. 📊 DURUM ALANI YÖNETİMİ — Özel durum ekleme/silme/sıralama
// ══════════════════════════════════════════════════════════════════
(function _initStatusManager() {

  const _STATUS_KEY = 'ak_pus_statuses';

  /** Varsayılan durumlar */
  const _DEFAULT_STATUSES = [
    { value: 'todo',       label: '📋 Yapılacak',   emoji: '📋', color: 'var(--s2)',  textColor: 'var(--t2)' },
    { value: 'inprogress', label: '🔄 Devam',       emoji: '🔄', color: 'var(--blb)', textColor: 'var(--blt)' },
    { value: 'review',     label: '👀 İnceleme',    emoji: '👀', color: 'var(--amb)', textColor: 'var(--amt)' },
    { value: 'done',       label: '✅ Tamam',       emoji: '✅', color: 'var(--grb)', textColor: 'var(--grt)' },
  ];

  /**
   * @description Kaydedilmiş durum listesini döndürür (varsayılanlar + özel).
   * @returns {Array} Durum nesneleri dizisi
   */
  function _getStatuses() {
    try {
      const saved = JSON.parse(localStorage.getItem(_STATUS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length >= 4) return saved;
    } catch (e) { /* ignore */ }
    return [..._DEFAULT_STATUSES];
  }

  /**
   * @description Durum listesini localStorage'a kaydeder.
   * @param {Array} statuses
   */
  function _saveStatuses(statuses) {
    localStorage.setItem(_STATUS_KEY, JSON.stringify(statuses));
  }

  /**
   * @description tk-status dropdown'ını güncel durum listesiyle doldurur.
   */
  function _populateStatusDropdown() {
    const sel = document.getElementById('tk-status');
    if (!sel) return;
    const current = sel.value;
    const statuses = _getStatuses();
    sel.innerHTML = statuses.map(s =>
      `<option value="${escapeHtml(s.value)}">${s.label}</option>`
    ).join('');
    if (current) sel.value = current;
  }

  /**
   * @description Durum yönetimi modalını açar (admin/manager).
   */
  function _openStatusManager() {
    if (!window.isAdmin?.() && !(_getCU()?.role === 'manager')) {
      window.toast?.('Bu özellik yalnızca admin/manager için', 'err');
      return;
    }

    let mo = document.getElementById('mo-status-mgr');
    if (mo) mo.remove();

    mo = document.createElement('div');
    mo.id = 'mo-status-mgr';
    mo.className = 'mo';
    mo.style.display = 'flex';
    mo.innerHTML = `
      <div class="moc" style="max-width:440px;padding:0;border-radius:16px;overflow:hidden;background:var(--sf);max-height:85vh;display:flex;flex-direction:column">
        <div style="padding:16px 20px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--t)">📊 Durum Yönetimi</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Görev durumlarını özelleştirin</div>
          </div>
          <button onclick="this.closest('.mo').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
        </div>
        <div id="sm-list" style="flex:1;overflow-y:auto;padding:16px 20px"></div>
        <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2)">
          <div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:8px">YENİ DURUM EKLE</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="fi" id="sm-new-emoji" placeholder="😊" style="width:50px;text-align:center;font-size:16px;padding:6px" maxlength="4">
            <input class="fi" id="sm-new-label" placeholder="Durum adı…" style="flex:1;padding:6px 10px" onkeydown="if(event.key==='Enter')window._addCustomStatus?.()">
            <button class="btn btnp" onclick="window._addCustomStatus?.()" style="padding:6px 14px;font-size:12px">Ekle</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(mo);
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    _renderStatusList();
  }

  /**
   * @description Durum listesini modal içine render eder.
   */
  function _renderStatusList() {
    const cont = document.getElementById('sm-list');
    if (!cont) return;
    const statuses = _getStatuses();
    const isDefault = v => ['todo','inprogress','review','done'].includes(v);

    cont.innerHTML = statuses.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--s2);margin-bottom:6px" data-idx="${i}">
        <span style="font-size:16px;cursor:grab" draggable="true"
          ondragstart="event.dataTransfer.setData('smIdx','${i}')"
          ondragover="event.preventDefault();this.parentElement.style.borderTop='2px solid var(--ac)'"
          ondragleave="this.parentElement.style.borderTop=''"
          ondrop="event.preventDefault();this.parentElement.style.borderTop='';window._reorderStatus?.(${i},event)">☰</span>
        <span style="font-size:14px">${s.emoji || '•'}</span>
        <span style="flex:1;font-size:13px;font-weight:500;color:var(--t)">${escapeHtml(s.label.replace(/^[^\s]+\s/, ''))}</span>
        <span style="font-size:10px;color:var(--t3);font-family:monospace;background:var(--sf);padding:2px 6px;border-radius:4px">${s.value}</span>
        ${isDefault(s.value)
          ? '<span style="font-size:10px;color:var(--t3);padding:2px 6px">🔒</span>'
          : `<button onclick="window._delCustomStatus?.('${escapeHtml(s.value)}')" style="background:none;border:none;cursor:pointer;font-size:12px;color:#EF4444;padding:2px 6px" title="Sil">✕</button>`
        }
      </div>
    `).join('');
  }

  /**
   * @description Yeni özel durum ekler.
   */
  window._addCustomStatus = function() {
    const emojiInp = document.getElementById('sm-new-emoji');
    const labelInp = document.getElementById('sm-new-label');
    const emoji = (emojiInp?.value || '').trim() || '•';
    const label = (labelInp?.value || '').trim();
    if (!label) { window.toast?.('Durum adı zorunlu', 'err'); return; }

    const value = label.toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const statuses = _getStatuses();
    if (statuses.find(s => s.value === value)) {
      window.toast?.('Bu durum zaten var: ' + value, 'err');
      return;
    }

    statuses.push({
      value,
      label: emoji + ' ' + label,
      emoji,
      color: 'var(--s2)',
      textColor: 'var(--t2)',
      custom: true,
    });
    _saveStatuses(statuses);
    if (emojiInp) emojiInp.value = '';
    if (labelInp) labelInp.value = '';
    _renderStatusList();
    window.toast?.('Durum eklendi: ' + label, 'ok');
  };

  /**
   * @description Özel durumu siler.
   * @param {string} value
   */
  window._delCustomStatus = function(value) {
    if (['todo','inprogress','review','done'].includes(value)) {
      window.toast?.('Varsayılan durumlar silinemez', 'err');
      return;
    }
    const statuses = _getStatuses().filter(s => s.value !== value);
    _saveStatuses(statuses);
    _renderStatusList();
    window.toast?.('Durum silindi ✓', 'ok');
  };

  /**
   * @description Durum sırasını drag & drop ile değiştirir.
   * @param {number} targetIdx
   * @param {DragEvent} event
   */
  window._reorderStatus = function(targetIdx, event) {
    const srcIdx = parseInt(event.dataTransfer.getData('smIdx'));
    if (isNaN(srcIdx) || srcIdx === targetIdx) return;
    const statuses = _getStatuses();
    const moved = statuses.splice(srcIdx, 1)[0];
    statuses.splice(targetIdx, 0, moved);
    _saveStatuses(statuses);
    _renderStatusList();
  };

  // getStatusPill'i custom durumları destekleyecek şekilde genişlet
  const _origGetStatusPill = window.getStatusPill;
  window.getStatusPill = function(t) {
    const orig = _origGetStatusPill?.(t);
    if (orig) return orig;
    // Özel durum kontrolü
    if (!t.status || t.status === 'todo') return '';
    const statuses = _getStatuses();
    const custom = statuses.find(s => s.value === t.status && s.custom);
    if (custom) {
      return `<span class="tk-status-pill" style="background:${custom.color};color:${custom.textColor}">${custom.emoji || '•'} ${custom.label.replace(/^[^\s]+\s/, '')}</span>`;
    }
    return '';
  };

  // openMo hook — tk-status dropdown'ını doldur
  const _smOrigOpenMo = window.openMo;
  window.openMo = function(id) {
    _smOrigOpenMo?.(...arguments);
    if (id === 'mo-task') {
      setTimeout(_populateStatusDropdown, 30);
    }
  };

  // Araçlar menüsüne durum yönetimi ekle
  function _injectStatusMgrBtn() {
    const menu = document.getElementById('pus-tools-menu');
    if (!menu || menu.querySelector('#ptm-status-mgr')) return;
    const divider = menu.querySelector('.ptm-divider');
    const btn = document.createElement('button');
    btn.id = 'ptm-status-mgr';
    btn.className = 'ptm-item admin-only';
    btn.innerHTML = '<span class="ptm-icon">📊</span><div><div class="ptm-title">Durum Yönetimi</div><div class="ptm-desc">Görev durumlarını özelleştir</div></div>';
    btn.onclick = function() { _openStatusManager(); window._closeToolsMenu?.(); };
    if (divider) {
      menu.insertBefore(btn, divider);
    } else {
      menu.appendChild(btn);
    }
  }

  // renderPusula hook
  const _smOrigRender = window.renderPusula;
  window.renderPusula = function() {
    _smOrigRender?.();
    setTimeout(_injectStatusMgrBtn, 250);
  };

  window._openStatusManager = _openStatusManager;
  window._getCustomStatuses = _getStatuses;
  console.info('[Pusula] Durum yönetimi aktif ✓');
})();


// ══════════════════════════════════════════════════════════════════
// 4. 📐 MATRİX SÜRÜKLE BIRAK — Gelişmiş drag & drop
// ══════════════════════════════════════════════════════════════════
(function _initMatrixDragEnhance() {

  // Mevcut _eisDrop'u genişlet — kadrana göre urgent+important güncelle
  const _origEisDrop = window._eisDrop;
  window._eisDrop = function(event, quadId) {
    event.preventDefault();
    const taskId = parseInt(event.dataTransfer.getData('taskId'));
    if (!taskId || !quadId) return;

    const tasks = loadTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;

    // Kadrana göre urgent + important + pri + status haritası
    const Q_MAP = {
      q1: { pri: 1, status: 'inprogress', urgent: true,  important: true,  label: 'Hemen Yap'  },
      q2: { pri: 2, status: 'todo',       urgent: false, important: true,  label: 'Planla'      },
      q3: { pri: 3, status: 'inprogress', urgent: true,  important: false, label: 'Devret'      },
      q4: { pri: 4, status: 'todo',       urgent: false, important: false, label: 'Ele'         },
    };
    const map = Q_MAP[quadId];
    if (!map) return;

    t.pri       = map.pri;
    t.status    = map.status;
    t.quadrant  = quadId;
    t.urgent    = map.urgent;
    t.important = map.important;
    saveTasks(tasks);

    window.toast?.('📐 Kadran: ' + map.label + ' ✓', 'ok');
    window.logActivity?.({ action: 'task_matrix_move', details: { taskId, quadrant: quadId, label: map.label } });

    // Bırakma animasyonu
    const dropTarget = event.currentTarget || event.target.closest('[ondrop]');
    if (dropTarget) {
      dropTarget.style.transition = 'box-shadow .3s, transform .2s';
      dropTarget.style.boxShadow = '0 0 0 3px var(--ac)';
      dropTarget.style.transform = 'scale(1.01)';
      setTimeout(() => {
        dropTarget.style.boxShadow = '';
        dropTarget.style.transform = '';
      }, 400);
    }

    const re = window._renderEisenhower;
    if (re) setTimeout(re, 80);
  };

  // Sürükleme sırasında kadran vurgulama (dragover/dragleave görsel feedback)
  const _origRenderEis = window._renderEisenhower;
  window._renderEisenhower = function() {
    _origRenderEis?.();

    // Kadran dropzone'larına gelişmiş görsel feedback ekle
    setTimeout(() => {
      document.querySelectorAll('[ondrop*="_eisDrop"]').forEach(zone => {
        zone.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          this.style.boxShadow = 'inset 0 0 0 2px var(--ac)';
          this.style.transition = 'box-shadow .15s';
        });
        zone.addEventListener('dragleave', function() {
          this.style.boxShadow = '';
        });
        zone.addEventListener('drop', function() {
          this.style.boxShadow = '';
        });
      });

      // Kart sürükleme başladığında görsel feedback
      document.querySelectorAll('[draggable="true"][ondragstart*="taskId"]').forEach(card => {
        card.addEventListener('dragstart', function(e) {
          this.style.opacity = '0.5';
          this.style.transform = 'rotate(2deg)';
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function() {
          this.style.opacity = '';
          this.style.transform = '';
        });
      });
    }, 100);
  };

  console.info('[Pusula] Matrix drag & drop gelişmiş ✓');
})();


// ════════════════════════════════════════════════════════════════
// AYLIK OTOMATİK EXCEL EXPORT
// ════════════════════════════════════════════════════════════════
(function _initMonthlyExport() {
  // Her gün kontrol — ayın son günü saat 00:00 civarında export
  var _monthlyCheckKey = '_pus_monthly_export';
  function _checkMonthlyExport() {
    var now = new Date();
    var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var today = now.getDate();
    var month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var lastExport = localStorage.getItem(_monthlyCheckKey) || '';
    if (today === lastDay && lastExport !== month) {
      localStorage.setItem(_monthlyCheckKey, month);
      console.info('[Pusula] Aylık otomatik Excel export — ' + month);
      if (typeof exportTasksXlsx === 'function') {
        try { exportTasksXlsx(); } catch(e) { console.warn('[Pusula] Export hatası:', e); }
      }
    }
  }
  // İlk kontrol 5s sonra, sonra her saat
  setTimeout(_checkMonthlyExport, 5000);
  setInterval(_checkMonthlyExport, 3600000);
})();

// Node.js (test ortamı)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pusula;
}
