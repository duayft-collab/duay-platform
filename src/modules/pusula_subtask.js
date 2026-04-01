/**
 * src/modules/pusula_subtask.js — v3.0.0
 * Pusula — Alt görev yönetimi
 * Bağımlı: pusula_core.js, pusula_render.js, database.js
 * Anayasa: K01 ≤800 satır | K06 soft delete
 */

'use strict';

// ── Alt Görev Ekle Modal ─────────────────────────────────────────
function addSubTask(parentId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const users  = loadUsers();

  g('mo-subadd')?.remove();
  const mo     = document.createElement('div');
  mo.className = 'mo';
  mo.id        = 'mo-subadd';

  const userOpts = users.map(u =>
    `<option value="${u.id}"${u.id === _getCU()?.id ? ' selected' : ''}>${u.name}</option>`
  ).join('');

  const deptList = [...new Set(loadTasks().map(t => t.department).filter(Boolean))].sort()
    .map(d => `<option value="${d}">`).join('');

  mo.innerHTML = `<div class="modal" style="max-width:440px">
    <div class="mt">➕ Alt Görev Ekle</div>
    <div class="fr">
      <div class="fl">BAŞLIK <span style="color:var(--rd)">*</span></div>
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
    <div class="fr" style="margin-top:2px">
      <div class="fl">🏷 DEPARTMAN</div>
      <input class="fi" id="subadd-dept" placeholder="Departman" list="subadd-dept-list">
      <datalist id="subadd-dept-list">${deptList}</datalist>
    </div>
    <div class="mf">
      <button class="btn" onclick="g('mo-subadd')?.remove()">İptal</button>
      <button class="btn btnp" onclick="_saveSubTask(${parentId})">Ekle</button>
    </div>
  </div>`;

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); g('subadd-title')?.focus(); }, 10);
}
window.addSubTask = addSubTask;

// ── Alt Görev Kaydet ─────────────────────────────────────────────
function _saveSubTask(parentId) {
  const title = (g('subadd-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }

  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  if (!parent.subTasks) parent.subTasks = [];

  const sub = {
    id:         generateNumericId(),
    title,
    uid:        parseInt(g('subadd-user')?.value) || _getCU()?.id,
    pri:        parseInt(g('subadd-pri')?.value)  || 2,
    department: g('subadd-dept')?.value  || '',
    start:      g('subadd-start')?.value || null,
    due:        g('subadd-due')?.value   || null,
    done:       false,
    createdAt:  nowTs(),
  };

  // Atanan farklıysa bildirim
  if (sub.uid && sub.uid !== _getCU()?.id) {
    window.addNotif?.('📋', `"${parent.title}" alt görev atandı: ${title}`, 'info', 'pusula', sub.uid, parent.id);
  }

  parent.subTasks.push(sub);
  saveTasks(d);
  g('mo-subadd')?.remove();
  renderPusula();
  window.toast?.('Alt görev eklendi ✓', 'ok');
}

// ── Alt Görev Tamamla/Aç ────────────────────────────────────────
function toggleSubTask(parentId, subId, done) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const sub = (parent.subTasks || []).find(s => s.id === subId);
  if (!sub) return;
  sub.done       = done;
  sub.status     = done ? 'done' : 'todo';
  if (done) sub.completedAt = new Date().toISOString();
  saveTasks(d);

  // Detay paneli açıksa güncelle
  if (_PDP_TASK_ID === parentId) {
    window.pdpRenderInfo?.();
  }
  renderPusula();
  window.toast?.(done ? '✓ Alt görev tamamlandı' : 'Yeniden açıldı', 'ok');
}
window.toggleSubTask = toggleSubTask;

// ── Alt Görev Sil ────────────────────────────────────────────────
function delSubTask(parentId, subId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  parent.subTasks = (parent.subTasks || []).filter(s => s.id !== subId);
  saveTasks(d);
  if (_PDP_TASK_ID === parentId) window.pdpRenderInfo?.();
  renderPusula();
  window.toast?.('Alt görev silindi', 'ok');
}
window.delSubTask = delSubTask;

// ── Alt Görev Düzenle ────────────────────────────────────────────
function openSubTaskEdit(parentId, subId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const sub  = (parent.subTasks || []).find(s => s.id === subId);
  if (!sub)  return;
  const users= loadUsers();

  g('mo-subedit')?.remove();
  const mo     = document.createElement('div');
  mo.className = 'mo';
  mo.id        = 'mo-subedit';

  const userOpts = users.map(u =>
    `<option value="${u.id}"${u.id === sub.uid ? ' selected' : ''}>${u.name}</option>`
  ).join('');

  mo.innerHTML = `<div class="modal" style="max-width:420px">
    <div class="mt">✏️ Alt Görev Düzenle</div>
    <input type="hidden" id="subedit-pid" value="${parentId}">
    <input type="hidden" id="subedit-sid" value="${subId}">
    <div class="fr"><div class="fl">BAŞLIK *</div>
      <input class="fi" id="subedit-title" value="${sub.title || ''}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">ÖNCELİK</div>
        <select class="fi" id="subedit-pri">
          <option value="1"${sub.pri===1?' selected':''}>🔴 Kritik</option>
          <option value="2"${sub.pri===2?' selected':''}>🟠 Önemli</option>
          <option value="3"${sub.pri===3?' selected':''}>🔵 Normal</option>
          <option value="4"${sub.pri===4?' selected':''}>⚪ Düşük</option>
        </select>
      </div>
      <div class="fr"><div class="fl">PERSONEL</div>
        <select class="fi" id="subedit-user">${userOpts}</select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fr"><div class="fl">BAŞLANGIÇ</div><input type="date" class="fi" id="subedit-start" value="${sub.start||''}"></div>
      <div class="fr"><div class="fl">BİTİŞ</div><input type="date" class="fi" id="subedit-due" value="${sub.due||''}"></div>
    </div>
    <div class="mf">
      <button class="btn" onclick="g('mo-subedit')?.remove()">İptal</button>
      <button class="btn btnp" onclick="_updateSubTask(${parentId},${subId})">Kaydet</button>
    </div>
  </div>`;

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); g('subedit-title')?.focus(); }, 10);
}
window.openSubTaskEdit = openSubTaskEdit;

function _updateSubTask(parentId, subId) {
  const title = (g('subedit-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
  const sub = (parent.subTasks || []).find(s => s.id === subId);
  if (!sub) return;
  sub.title  = title;
  sub.pri    = parseInt(g('subedit-pri')?.value)  || 2;
  sub.uid    = parseInt(g('subedit-user')?.value) || sub.uid;
  sub.start  = g('subedit-start')?.value || null;
  sub.due    = g('subedit-due')?.value   || null;
  sub.updatedAt = nowTs();
  saveTasks(d);
  g('mo-subedit')?.remove();
  if (_PDP_TASK_ID === parentId) window.pdpRenderInfo?.();
  renderPusula();
  window.toast?.('Alt görev güncellendi ✓', 'ok');
}

// ── Alt Görev Listesi Render ────────────────────────────────────
function renderSubTasks(parentId, subTasks, container) {
  if (!container) return;
  const users  = loadUsers();
  const todayS = new Date().toISOString().slice(0, 10);
  const done   = subTasks.filter(s => s.done).length;
  const total  = subTasks.length;

  const frag = document.createDocumentFragment();

  // Başlık + collapse toggle
  const collapseKey = 'pus_sub_collapsed_' + parentId;
  const isCollapsed = localStorage.getItem(collapseKey) === '1';
  const colWrap     = document.createElement('div');
  colWrap.className = '_sub_collapse_btn';
  colWrap.onclick   = () => {
    const collapsed = localStorage.getItem(collapseKey) === '1';
    localStorage.setItem(collapseKey, collapsed ? '0' : '1');
    const body  = container.querySelector('._sub_body');
    if (body) body.style.display = collapsed ? '' : 'none';
    const arrow = colWrap.querySelector('._sub_arrow_icon');
    if (arrow) arrow.classList.toggle('collapsed', !collapsed);
  };
  colWrap.innerHTML = `
    <svg width="16" height="16" fill="none" viewBox="0 0 16 16" style="flex-shrink:0;color:var(--ac)">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="rgba(99,102,241,.1)" stroke="rgba(99,102,241,.3)" stroke-width="1"/>
      <path d="${isCollapsed ? 'M5 8h6M8 5v6' : 'M5 8h6'}" stroke="var(--ac)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="_sub_collapse_label">Alt Görevler</span>
    <span class="_sub_collapse_count">${done} / ${total}</span>
    <span style="margin-left:auto;font-size:10px;color:var(--t3)">${isCollapsed ? 'göster' : 'gizle'}</span>`;
  frag.appendChild(colWrap);

  const subBody     = document.createElement('div');
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
    const u    = users.find(x => x.id === s.uid) || { name: '?' };
    const od   = s.due && s.due < todayS && !s.done;
    const row  = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:5px;margin-bottom:2px;background:var(--s2)';
    row.innerHTML = `
      <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubTask(${parentId},${s.id},this.checked)" style="flex-shrink:0;accent-color:var(--ac)">
      <span style="flex:1;font-size:12px;${s.done ? 'text-decoration:line-through;opacity:.5' : ''}">${s.title}</span>
      <span style="font-size:10px;color:var(--t3)">${u.name.split(' ')[0]}</span>
      ${s.due ? `<span style="font-size:10px;color:${od ? '#dc2626' : 'var(--t3)'}">📅 ${s.due.slice(5)}</span>` : ''}
      <button onclick="openSubTaskEdit(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✏️</button>
      <button onclick="delSubTask(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✕</button>`;
    subBody.appendChild(row);
  });

  // Ekle butonu
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'font-size:11px;color:var(--ac);background:none;border:1px dashed var(--bm);border-radius:5px;cursor:pointer;padding:3px 10px;margin:3px 0 0;width:100%;font-family:inherit';
  addBtn.textContent = '+ Alt Görev Ekle';
  addBtn.addEventListener('click', () => addSubTask(parentId));
  subBody.appendChild(addBtn);

  frag.appendChild(subBody);
  container.replaceChildren(frag);
}
window.renderSubTasks = renderSubTasks;

// ── Alarm sistemi ───────────────────────────────────────────────
function checkSubTaskAlarms() {
  const tasks  = loadTasks();
  const todayS = new Date().toISOString().slice(0, 10);
  tasks.forEach(parent => {
    (parent.subTasks || []).forEach(s => {
      if (!s.due || s.done || !s.alarm) return;
      const alarmMs = (new Date(s.due + 'T' + (s.time || '09:00')).getTime()) - (parseInt(s.alarm) * 60000);
      if (Date.now() >= alarmMs && Date.now() < alarmMs + 300000) {
        window.addNotif?.('🔔', `Alt görev hatırlatıcı: "${s.title}"`, 'warn', 'pusula', null, parent.id);
      }
    });
  });
}
window.checkSubTaskAlarms = checkSubTaskAlarms;
