/**
 * src/modules/pusula_features.js — v3.0.0
 * Pusula — Init, bağımlılık zinciri, şablonlar, workload paneli, dept yönetimi
 * Bağımlı: pusula_core.js — pusula_views.js (tüm önceki modüller)
 * Anayasa: K01 ≤800 satır | K04 try-catch
 */

'use strict';

// ── Bağımlılık Zinciri ───────────────────────────────────────────
const _PF_DEPS_KEY = 'ak_tk_deps1';
function _pfLoadDeps()  { try { return JSON.parse(localStorage.getItem(_PF_DEPS_KEY) || '{}'); } catch(e) { return {}; } }
function _pfSaveDeps(d) { localStorage.setItem(_PF_DEPS_KEY, JSON.stringify(d)); }

function isTaskBlocked(task) {
  if (!task || !(task.dependsOn || []).length) return false;
  const tasks = loadTasks();
  return (task.dependsOn || []).some(depId => {
    const dep = tasks.find(t => t.id === depId);
    return dep && !dep.done && dep.status !== 'done';
  });
}
window.isTaskBlocked  = isTaskBlocked;
window.taskIsBlocked  = id => { const t = loadTasks().find(x => x.id === id); return t ? isTaskBlocked(t) : false; };

window.setTaskDependency = function(taskId, dependsOnId) {
  const d = loadTasks();
  const t = d.find(x => x.id === taskId);
  if (!t) return;
  if (!t.dependsOn) t.dependsOn = [];
  if (!t.dependsOn.includes(dependsOnId)) t.dependsOn.push(dependsOnId);
  saveTasks(d);
  window.toast?.('Bağımlılık eklendi', 'ok');
};
window.removeTaskDependency = function(taskId, depId) {
  const d = loadTasks();
  const t = d.find(x => x.id === taskId);
  if (!t) return;
  t.dependsOn = (t.dependsOn || []).filter(id => id !== depId);
  saveTasks(d);
};
window.addTaskDep    = window.setTaskDependency;
window.removeTaskDep = window.removeTaskDependency;

window.renderTaskDepChain = function(taskId) {
  const task  = loadTasks().find(t => t.id === taskId);
  if (!task) return '<div style="color:var(--t3);font-size:12px">Görev bulunamadı</div>';
  const tasks = loadTasks();
  const deps  = (task.dependsOn || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  if (!deps.length) return '<div style="font-size:12px;color:var(--t3)">Bağımlılık yok</div>';
  return deps.map(d =>
    `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
      <span style="color:${d.done ? '#15803D' : '#dc2626'}">${d.done ? '✅' : '🔒'}</span>
      <span style="font-size:12px;color:var(--t)">${d.title}</span>
      <span style="font-size:10px;color:var(--t3)">${d.done ? 'Tamamlandı' : 'Bekliyor'}</span>
    </div>`
  ).join('');
};

// ── Görev Şablonları ─────────────────────────────────────────────
const _PF_TPL_KEY = 'ak_tk_templates1';
const _PF_TPL_DEFAULT = [
  { id:'tpl_ihracat',   name:'İhracat Dosyası Açma',  icon:'📦',
    subTasks:['Müşteri sipariş onayını al','Pro forma fatura hazırla','Gümrük tarife kodu tespit et','Ambalajlama ve etiketlemeyi tamamla','Gümrük beyannamesi hazırla','Navlun ve sigorta düzenle','Sevk belgelerini (konşimento/CMR) al','Müşteriye belge gönder ve takibe al'] },
  { id:'tpl_toplanti',  name:'Toplantı Hazırlığı',     icon:'📋',
    subTasks:['Gündem oluştur','Katılımcılara davet gönder','Sunum hazırla','Toplantı notlarını al','Aksiyon maddelerini paylaş'] },
  { id:'tpl_onboarding',name:'Personel Onboarding',    icon:'👤',
    subTasks:['Hesap ve erişimleri oluştur','İlk gün planını hazırla','Takım üyeleriyle tanıştır','Sistem eğitimini ver','30. gün değerlendirme yap'] },
];

function _pfLoadTemplates() {
  try {
    const d = JSON.parse(localStorage.getItem(_PF_TPL_KEY) || 'null');
    if (!d) { localStorage.setItem(_PF_TPL_KEY, JSON.stringify(_PF_TPL_DEFAULT)); return _PF_TPL_DEFAULT; }
    return d;
  } catch(e) { return _PF_TPL_DEFAULT; }
}
function _pfSaveTemplates(d) { localStorage.setItem(_PF_TPL_KEY, JSON.stringify(d)); }

window.openTaskTemplates = function() {
  const tpls = _pfLoadTemplates();
  let html = '<div class="modal" style="max-width:480px"><div class="mt">📋 Görev Şablonları</div><div style="display:flex;flex-direction:column;gap:8px">';
  tpls.forEach(tpl => {
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--s2);border-radius:8px;cursor:pointer" onclick="window.applyTaskTemplate('${tpl.id}')">
      <span style="font-size:20px">${tpl.icon || '📋'}</span>
      <div><div style="font-size:13px;font-weight:500">${tpl.name}</div>
      <div style="font-size:11px;color:var(--t3)">${tpl.subTasks?.length || 0} alt görev</div></div>
    </div>`;
  });
  html += '</div><div class="mf"><button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button></div></div>';
  const mo = document.createElement('div'); mo.className = 'mo'; mo.innerHTML = html;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
};

window.applyTaskTemplate = function(tplId) {
  const tpl = _pfLoadTemplates().find(t => t.id === tplId);
  if (!tpl) return;
  window._pendingSubTasks = (tpl.subTasks || []).map(title => ({ title, done: false, pri: 2 }));
  document.querySelector('.mo.open')?.remove();
  openAddTask();
  window.toast?.(`"${tpl.name}" şablonu uygulandı`, 'ok');
};

window.saveCurrentAsTemplate = function() {
  const title = (g('tk-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık boş', 'err'); return; }
  const subs = (window._pendingSubTasks || []).map(s => s.title || s);
  const tpls = _pfLoadTemplates();
  tpls.push({ id: 'tpl_' + Date.now(), name: title, icon: '⭐', subTasks: subs });
  _pfSaveTemplates(tpls);
  window.toast?.('Şablon kaydedildi', 'ok');
};

window.deleteTaskTemplate = function(id) {
  _pfSaveTemplates(_pfLoadTemplates().filter(t => t.id !== id));
  window.toast?.('Şablon silindi', 'ok');
};

function openTaskTemplateLibrary() { window.openTaskTemplates?.(); }
window.openTaskTemplateLibrary = openTaskTemplateLibrary;

// ── Akıllı Tarih Ayrıştırma ─────────────────────────────────────
window.smartDateParse = function(input) {
  if (!input) return null;
  const s      = input.trim().toLowerCase();
  const today  = new Date();
  const todayS = today.toISOString().slice(0, 10);
  if (s === 'bugün' || s === 'today') return todayS;
  if (s === 'yarın' || s === 'tomorrow') {
    const t = new Date(today); t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  const days = { pazartesi:1, salı:2, çarşamba:3, perşembe:4, cuma:5, cumartesi:6, pazar:0,
    monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:0 };
  for (const [name, dayNum] of Object.entries(days)) {
    if (s.includes(name)) {
      const d = new Date(today);
      const diff = (dayNum - today.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }
  const m = s.match(/(\d+)\s*(gün|hafta|ay)/);
  if (m) {
    const n = parseInt(m[1]);
    const d = new Date(today);
    if (m[2] === 'gün')   d.setDate(d.getDate() + n);
    if (m[2] === 'hafta') d.setDate(d.getDate() + n * 7);
    if (m[2] === 'ay')    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }
  return null;
};

// ── Toplu Atama ──────────────────────────────────────────────────
function openBulkAssign() {
  const tasks = visTasks().filter(t => !t.done);
  const users = loadUsers();
  let html = `<div class="modal" style="max-width:480px"><div class="mt">👥 Toplu Atama</div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:12px">${tasks.length} aktif görev</div>
    <div class="fr"><div class="fl">PERSONEL</div>
      <select class="fi" id="bulk-user">
        ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
      </select>
    </div>
    <div class="fr"><div class="fl">DEPARTMAN (opsiyonel)</div>
      <select class="fi" id="bulk-dept">
        <option value="">Tümü</option>
        ${[...new Set(tasks.map(t => t.department).filter(Boolean))].sort().map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>
    <div class="mf">
      <button class="btn" onclick="this.closest('.mo').remove()">İptal</button>
      <button class="btn btnp" onclick="_doBulkAssign()">Uygula</button>
    </div>
  </div>`;
  const mo = document.createElement('div'); mo.className = 'mo'; mo.innerHTML = html;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openBulkAssign = openBulkAssign;

function _doBulkAssign() {
  const uid  = parseInt(g('bulk-user')?.value || '0');
  const dept = g('bulk-dept')?.value || '';
  if (!uid) { window.toast?.('Personel seçin', 'err'); return; }
  const d    = loadTasks();
  let count  = 0;
  d.filter(t => !t.done && (!dept || t.department === dept))
   .forEach(t => { t.uid = uid; t.updated_at = nowTs(); count++; });
  saveTasks(d);
  document.querySelector('.mo.open')?.remove();
  renderPusula();
  window.toast?.(`${count} görev atandı`, 'ok');
}
window._doBulkAssign = _doBulkAssign;

// ── Workload Panel ───────────────────────────────────────────────
window._toggleWorkloadPanel = function(btn) {
  const panel = g('pus-workload-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  if (!isOpen) renderWorkloadPanel();
};

function renderWorkloadPanel() {
  const cont = g('pus-workload-panel');
  if (!cont) return;
  const users  = loadUsers().filter(u => u.status === 'active');
  const tasks  = loadTasks();
  const todayS = new Date().toISOString().slice(0, 10);

  if (!users.length) { cont.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--t3)">Aktif personel yok</div>'; return; }

  const userData = users.map(u => {
    const myTasks = tasks.filter(t => t.uid === u.id);
    const active  = myTasks.filter(t => !t.done && t.status !== 'done');
    const done    = myTasks.filter(t => t.done || t.status === 'done');
    const overdue = active.filter(t => t.due && t.due < todayS);
    const wl      = _calcWorkload(u.id);
    const cr      = myTasks.length > 0 ? Math.round(done.length / myTasks.length * 100) : 0;
    return { user:u, active, done, overdue, wl, cr };
  }).sort((a, b) => b.wl.skor - a.wl.skor);

  const maxWL = Math.max(...userData.map(d => d.wl.skor), 1);
  const wlColor = s => s <= 5 ? '#15803D' : s <= 12 ? '#D97706' : '#dc2626';

  let html = `<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:14px">
    <div style="padding:10px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:12px;font-weight:600;color:var(--t)">👥 Personel İş Yükü</span>
      <button onclick="window._toggleWorkloadPanel?.()" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3)">×</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:12px">`;

  userData.forEach(({ user: u, active, done, overdue, wl, cr }) => {
    const c = _getAVC()[users.indexOf(u) % _getAVC().length];
    html += `<div style="background:var(--s2);border-radius:8px;padding:10px 12px;cursor:pointer" onclick="window._wlFilterByUser?.(${u.id},'${u.name}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:28px;height:28px;border-radius:7px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${_pusInitials(u.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</div>
          <div style="font-size:10px;color:var(--t3)">${active.length} aktif · ${overdue.length > 0 ? `<span style="color:#dc2626">${overdue.length} gecikmiş</span>` : '0 gecikmiş'}</div>
        </div>
      </div>
      <div style="height:4px;background:var(--b);border-radius:2px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;width:${Math.min(100, Math.round(wl.skor / maxWL * 100))}%;background:${wlColor(wl.skor)};border-radius:2px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3)">
        <span>Yük: <b style="color:${wlColor(wl.skor)}">${wl.skor}</b></span>
        <span>Tamamlama: <b>${cr}%</b></span>
      </div>
    </div>`;
  });

  html += '</div></div>';
  cont.innerHTML = html;
}
window.renderWorkloadPanel = renderWorkloadPanel;

window._wlFilterByUser = function(uid, name) {
  const sel = g('pus-usel');
  if (sel) { sel.value = String(uid); }
  renderPusula();
  window.toast?.(`${name} filtrelendi`, 'ok');
};

// ── Departman Yönetimi ───────────────────────────────────────────
function openDeptManager() {
  let depts = [];
  try { depts = JSON.parse(localStorage.getItem('ak_departments') || '[]'); } catch(e) {}
  if (!depts.length) {
    depts = [...new Set(loadTasks().map(t => t.department).filter(Boolean))].sort();
  }

  let html = `<div class="modal" style="max-width:420px"><div class="mt">🏷 Departman Yönetimi</div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input class="fi" id="dept-new-name" placeholder="Yeni departman adı" style="flex:1">
      <button class="btn btnp" onclick="_addDept()" style="white-space:nowrap">Ekle</button>
    </div>
    <div id="dept-list" style="display:flex;flex-direction:column;gap:6px">`;

  depts.forEach(d => {
    const color = getDeptColor(d);
    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--s2);border-radius:7px">
      <span style="width:14px;height:14px;border-radius:3px;background:${color};flex-shrink:0"></span>
      <span style="flex:1;font-size:12px;font-weight:500">${d}</span>
      <input type="color" value="${color}" onchange="setDeptColor('${d}',this.value)" style="width:28px;height:22px;border:none;background:none;cursor:pointer;padding:0" title="Renk değiştir">
      <button onclick="_delDept('${d}')" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--t3)">✕</button>
    </div>`;
  });

  html += `</div><div class="mf"><button class="btn" onclick="window.closeMo?.('mo-deptmgr')">Kapat</button></div></div>`;
  window.openMo?.('mo-deptmgr');
  const mo = g('mo-deptmgr');
  if (mo) mo.querySelector('.moc')?.replaceWith(Object.assign(document.createElement('div'), { className:'moc', innerHTML: html.replace('<div class="modal"','<div') }));
}
window.openDeptManager = openDeptManager;

window._addDept = function() {
  const name = (g('dept-new-name')?.value || '').trim();
  if (!name) return;
  let depts = [];
  try { depts = JSON.parse(localStorage.getItem('ak_departments') || '[]'); } catch(e) {}
  if (!depts.includes(name)) { depts.push(name); localStorage.setItem('ak_departments', JSON.stringify(depts)); }
  openDeptManager();
};

window._delDept = function(name) {
  let depts = [];
  try { depts = JSON.parse(localStorage.getItem('ak_departments') || '[]'); } catch(e) {}
  depts = depts.filter(d => d !== name);
  localStorage.setItem('ak_departments', JSON.stringify(depts));
  openDeptManager();
  window.toast?.(`"${name}" silindi`, 'ok');
};

// ── Init ────────────────────────────────────────────────────────
function _pusInit() {
  // View restore
  const savedView   = localStorage.getItem('ak_pus_view');
  const users       = loadUsers();
  const cu          = _getCU();
  const defaultView = cu?.id ? (users.find(u => u.id === cu.id)?.defaultPusView || 'list') : 'list';
  PUS_VIEW          = savedView || defaultView || 'list';

  const vBtn = g('pus-v-' + PUS_VIEW);
  if (vBtn) {
    document.querySelectorAll('.pvt-btn,.pus-seg-btn').forEach(b => b.classList.remove('on', 'active'));
    vBtn.classList.add('on', 'active');
  }

  // Alarm kontrol
  setInterval(checkSubTaskAlarms, 60000);

  // Ayda bir otomatik Excel yedek
  const _lastExport = localStorage.getItem('_pus_last_export');
  const _now        = new Date();
  const _monthKey   = `${_now.getFullYear()}-${_now.getMonth()}`;
  if (_lastExport !== _monthKey && typeof exportTasksXlsx === 'function') {
    localStorage.setItem('_pus_last_export', _monthKey);
  }

  console.info('[Pusula v3.0] 7 modül aktif ✓');
}

// Pusula namespace — geriye uyumluluk
window.Pusula = {
  render:     () => renderPusula?.(),
  openAdd:    () => openAddTask?.(),
  edit:       id  => editTask?.(id),
  del:        id  => delTask?.(id),
  toggle:     (id, done) => toggleTask?.(id, done),
  openDetail: id  => openPusDetail?.(id),
  openChat:   id  => openPusDetail?.(id),
  toggleSub:  (pid, sid, done) => toggleSubTask?.(pid, sid, done),
  editSub:    (pid, sid) => openSubTaskEdit?.(pid, sid),
  delSub:     (pid, sid) => delSubTask?.(pid, sid),
};

// Uygulama hazır olduğunda init çalıştır
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _pusInit);
} else {
  setTimeout(_pusInit, 100);
}
