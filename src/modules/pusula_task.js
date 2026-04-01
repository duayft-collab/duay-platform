/**
 * src/modules/pusula_task.js — v3.0.0
 * Pusula — Görev CRUD: ekle, düzenle, kaydet, tamamla, sil
 * Bağımlı: pusula_core.js, pusula_render.js, database.js
 * Anayasa: K01 ≤800 satır | K06 soft delete
 */

'use strict';

// ── Görev Ekle ──────────────────────────────────────────────────
function openAddTask() {
  populatePusUsers();
  _populateDeptSelect();
  ['tk-title','tk-tags','tk-link','tk-jobid'].forEach(id => {
    const el = g(id); if (el) el.value = '';
  });
  const _descRich = g('tk-desc-rich'); if (_descRich) _descRich.innerHTML = '';
  if (g('tk-desc'))   g('tk-desc').value   = '';
  if (g('tk-pri'))    g('tk-pri').value    = '2';
  if (g('tk-due'))    g('tk-due').value    = '';
  if (g('tk-start'))  g('tk-start').value  = '';
  if (g('tk-status')) g('tk-status').value = 'todo';
  if (g('tk-eid'))    g('tk-eid').value    = '';
  if (g('tk-file'))   g('tk-file').value   = '';
  if (g('tk-cost'))   g('tk-cost').value   = '';
  if (g('tk-fp'))     g('tk-fp').textContent = '';
  const s = g('tk-user');
  if (s) {
    if (!window.isAdmin?.()) {
      s.innerHTML = `<option value="${_getCU()?.id}">${_getCU()?.name || 'Ben'}</option>`;
      s.value = String(_getCU()?.id);
    } else {
      const uid = parseInt(g('pus-usel')?.value || '0');
      if (uid > 0) s.value = String(uid);
    }
  }
  st('mo-tk-t', 'Görev Ekle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(null), 50);
}
window.openAddTask = openAddTask;

// ── Görev Düzenle ───────────────────────────────────────────────
function editTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  const cu = _getCU();
  if (!_canEditTask(t)) {
    window.toast?.('Bu görevi düzenleme yetkiniz yok', 'err'); return;
  }
  populatePusUsers();
  _populateDeptSelect();
  if (g('tk-eid'))    g('tk-eid').value    = t.id;
  if (g('tk-title'))  g('tk-title').value  = t.title || '';
  const _descRich = g('tk-desc-rich');
  if (_descRich) _descRich.innerHTML = t.desc || '';
  else if (g('tk-desc')) g('tk-desc').value = t.desc || '';
  if (g('tk-pri'))    g('tk-pri').value    = t.pri    || '2';
  if (g('tk-due'))    g('tk-due').value    = t.due    || '';
  if (g('tk-start'))  g('tk-start').value  = t.start  || '';
  if (g('tk-status')) g('tk-status').value = t.done ? 'done' : (t.status || 'todo');
  if (g('tk-dept'))   g('tk-dept').value   = t.department || '';
  if (g('tk-tags'))   g('tk-tags').value   = (t.tags || []).join(', ');
  if (g('tk-link'))   g('tk-link').value   = t.link   || '';
  if (g('tk-cost'))   g('tk-cost').value   = t.cost   || '';
  if (g('tk-jobid'))  g('tk-jobid').value  = t.jobId  || '';
  const userEl = g('tk-user');
  if (userEl) userEl.value = String(t.uid || cu?.id || '');
  st('mo-tk-t', 'Görevi Düzenle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(t), 50);
}
window.editTask = editTask;

// ── Görev Kaydet ────────────────────────────────────────────────
function saveTask() {
  const title = (g('tk-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const uid = parseInt(g('tk-user')?.value || '0') || parseInt(_getCU()?.id || '0');
  if (!window.isAdmin?.() && uid !== parseInt(_getCU()?.id || '0')) {
    window.toast?.('Yetki yok', 'err'); return;
  }
  if (!uid) { window.toast?.('Kullanıcı belirlenemedi', 'err'); return; }

  const d    = loadTasks();
  const eid  = parseInt(g('tk-eid')?.value || '0');
  const participants = [];
  const viewers      = [];
  document.querySelectorAll('[id^="tk-part-"]:checked').forEach(cb => participants.push(parseInt(cb.value)));
  document.querySelectorAll('[id^="tk-view-"]:checked').forEach(cb => viewers.push(parseInt(cb.value)));

  // Katılımcı onay mekanizması
  if (!window.isAdmin?.() && eid && !window._pusParticipantApprovalOff) {
    const oldTask = d.find(x => x.id === eid);
    if (oldTask) {
      const oldParts = new Set([...(oldTask.participants || []), ...(oldTask.viewers || [])]);
      const newParts = [...participants, ...viewers].filter(id => !oldParts.has(id));
      if (newParts.length > 0) {
        const pending = oldTask.pendingParticipants || [];
        newParts.forEach(pid => {
          if (!pending.find(p => p.uid === pid))
            pending.push({ uid: pid, requestedBy: _getCU()?.id, requestedAt: nowTs() });
        });
        oldTask.pendingParticipants = pending;
        participants.length = 0; viewers.length = 0;
        (oldTask.participants || []).forEach(p => participants.push(p));
        (oldTask.viewers     || []).forEach(v => viewers.push(v));
        saveTasks(d);
        window.addNotif?.('👥', `"${oldTask.title}" görevine katılımcı ekleme onay bekliyor`, 'warn', 'pusula', null, oldTask.id);
        window.toast?.('Katılımcı ekleme talebi yöneticiye gönderildi', 'ok');
      }
    }
  }

  const dueDate = g('tk-due')?.value || null;
  const dueTime = g('tk-due-time')?.value || '';
  const fields  = {
    title,
    desc:         g('tk-desc-rich')?.innerHTML?.trim() || g('tk-desc')?.value || '',
    pri:          parseInt(g('tk-pri')?.value || '2'),
    due:          dueDate,
    due_time:     dueTime,
    deadline_full:dueDate ? (dueDate + (dueTime ? ' ' + dueTime : ' 23:59')) : null,
    start:        g('tk-start')?.value  || null,
    status:       g('tk-status')?.value || 'todo',
    department:   g('tk-dept')?.value   || '',
    cost:         parseFloat(g('tk-cost')?.value || '0') || null,
    tags:         (g('tk-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean),
    link:         g('tk-link')?.value   || '',
    duration:     parseInt(g('tk-duration')?.value || '0') || null,
    jobId:        (g('tk-jobid')?.value || '').trim() || null,
    uid,
    done:         g('tk-status')?.value === 'done',
    participants,
    viewers,
    created_at:   nowTs(),
  };

  const doSave = fileData => {
    if (fileData) fields.file = fileData;
    else if (eid) {
      const old = d.find(x => x.id === eid);
      if (old?.file) fields.file = old.file;
    }

    if (eid) {
      const t = d.find(x => x.id === eid);
      if (t) {
        const _oldUid = t.uid;
        fields.created_at = t.created_at || t.createdAt || fields.created_at;
        fields.updated_at = nowTs();
        Object.assign(t, fields);
        if (_oldUid !== fields.uid) {
          try {
            const _cu3 = _getCU();
            const _n2  = (typeof loadNotifs === 'function' ? loadNotifs() : (window.loadNotifs?.() || []));
            _n2.unshift({
              id: generateNumericId(), icon:'📋',
              msg: `"${title}" görevi size atandı — ${_cu3?.name || ''}`,
              type:'info', link:'pusula', ts: nowTs(), read: false,
              targetUid: fields.uid, taskId: eid, taskTitle: title,
              priority: fields.pri, due: fields.due, assigner: _cu3?.name || '',
              needsAck: true, acked: false
            });
            if (typeof storeNotifs === 'function') storeNotifs(_n2);
            else window.storeNotifs?.(_n2);
            window.updateNotifBadge?.();
            window._showInstantTaskNotif?.(fields.uid, eid, title, fields.pri, fields.due, _cu3?.name || '');
          } catch(e) { console.error('[pusula_task] bildirim:', e); }
        }
      }
      logActivity('task', `"${title}" güncelledi`);
      window.toast?.('Güncellendi ✓', 'ok');
    } else {
      // Yeni görev
      const _nid = generateNumericId();
      const _initSubs = (window._pendingSubTasks?.length)
        ? window._pendingSubTasks.map((s, i) => ({ ...s, id: _nid + i + 1 }))
        : [];
      window._pendingSubTasks = null;

      if (!fields.jobId) {
        const _yr     = new Date().getFullYear();
        const _jobSeq = String(d.filter(t => t.jobId && t.jobId.indexOf('JOB-' + _yr) === 0).length + 1).padStart(4, '0');
        fields.jobId  = 'JOB-' + _yr + '-' + _jobSeq;
      }

      d.push({ id: _nid, subTasks: _initSubs, ...fields });
      logActivity('task', `"${title}" ekledi`);
      window.toast?.('Görev eklendi ✓', 'ok');

      try {
        const _cu2 = _getCU();
        if (uid && _cu2 && uid !== _cu2.id) {
          const _n = (typeof loadNotifs === 'function' ? loadNotifs() : (window.loadNotifs?.() || []));
          _n.unshift({
            id: _nid + 1, icon:'📋',
            msg: `"${title}" görevi size atandı — ${_cu2.name || ''}`,
            type:'info', link:'pusula', ts: nowTs(), read: false,
            targetUid: uid, taskId: _nid, taskTitle: title,
            priority: fields.pri, due: fields.due, assigner: _cu2.name || '',
            needsAck: true, acked: false
          });
          if (typeof storeNotifs === 'function') storeNotifs(_n);
          else window.storeNotifs?.(_n);
          window.updateNotifBadge?.();
          window._showInstantTaskNotif?.(uid, _nid, title, fields.pri, fields.due, _cu2?.name || '');
        }
      } catch(e) { console.error('[pusula_task] yeni bildirim:', e); }
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
window.saveTask = saveTask;

// ── Tamamla / Yeniden aç ────────────────────────────────────────
function toggleTask(id, done) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  if (!_canEditTask(t)) {
    window.toast?.('Bu görevin durumunu değiştirme yetkiniz yok', 'err'); return;
  }
  t.done = done;
  if (done) {
    t.status      = 'done';
    t.completedAt = new Date().toISOString();
    // Tekrarlayan görev — yeni oluştur
    if (t.repeat && t.repeat !== 'none' && t.due) {
      const base = new Date(t.due);
      if (t.repeat === 'daily')   base.setDate(base.getDate() + 1);
      if (t.repeat === 'weekly')  base.setDate(base.getDate() + 7);
      if (t.repeat === 'monthly') base.setMonth(base.getMonth() + 1);
      const newDue = base.toISOString().slice(0, 10);
      const newId  = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
      d.push({ id: newId, title: t.title, desc: t.desc, pri: t.pri, due: newDue,
        uid: t.uid, status:'todo', done:false, department: t.department,
        repeat: t.repeat, jobId: t.jobId, created_at: new Date().toISOString(),
        createdBy: t.createdBy, subTasks:[], source:'repeat' });
      window.toast?.(`Tekrarlayan görev: ${newDue} ✓`, 'info');
    }
  } else if (t.status === 'done') {
    t.status = 'todo';
  }
  saveTasks(d);
  renderPusula();
  updatePusBadge();
  logActivity('task', `"${t.title}" görevini ${done ? 'tamamladı' : 'yeniden açtı'}`);
  window.toast?.(done ? '✓ Tamamlandı' : 'Yeniden açıldı', 'ok');

  const cu = _getCU();
  if (t.uid && cu && t.uid !== cu.id) {
    window.addNotif?.(
      done ? '✅' : '🔄',
      `"${t.title}" görevi ${done ? 'tamamlandı' : 'yeniden açıldı'} — ${cu.name || ''}`,
      'info', 'pusula', null, t.id
    );
  }
}
window.toggleTask = toggleTask;

// ── Görev Sil (soft) ────────────────────────────────────────────
function delTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  const cu     = _getCU();
  const isOwner= t.createdBy ? t.createdBy === cu?.id : t.uid === cu?.id;
  if (!isOwner && !window.isAdmin?.()) {
    window.toast?.('Bu görevi silme yetkiniz yok', 'err'); return;
  }
  window.confirmModal?.(`"${t.title || 'Görev'}" silinsin mi?`, {
    title: 'Görev Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof addToTrash === 'function') addToTrash(t, 'Görev', 'tasks');
      t.isDeleted = true;
      t.deletedAt = nowTs();
      t.deletedBy = cu?.id;
      saveTasks(d);
      renderPusula();
      window.logActivity?.('task', `"${t.title}" görevini sildi`);
      window.toast?.('Silindi — geri alınabilir', 'ok');
    }
  });
}
window.delTask = delTask;

// ── Hızlı güncelleme ────────────────────────────────────────────
function quickUpdateTask(id, field, val) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  t[field]     = val;
  t.updated_at = nowTs();
  if (field === 'status') t.done = val === 'done';
  saveTasks(d);
  renderPusula();
  window.toast?.('Güncellendi', 'ok');
}
window.quickUpdateTask = quickUpdateTask;

// ── Dept select ─────────────────────────────────────────────────
function _populateDeptSelect() {
  const sel = g('tk-dept');
  if (!sel) return;
  let depts = [];
  try {
    const tasks  = loadTasks();
    tasks.forEach(t => { if (t.department && !depts.includes(t.department)) depts.push(t.department); });
    const saved  = JSON.parse(localStorage.getItem('ak_departments') || '[]');
    if (saved.length) depts = saved;
  } catch(e) {}
  depts.sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Departman Seç —</option>' +
    depts.map(d => `<option value="${d}"${d === cur ? ' selected' : ''}>${d}</option>`).join('');
}

// ── Katılımcı listesi ───────────────────────────────────────────
function populateTaskParticipants(task) {
  const users    = loadUsers().filter(u => u.status === 'active');
  const ownerUid = parseInt(g('tk-user')?.value || '0') || task?.uid || 0;
  const others   = users.filter(u => u.id !== ownerUid);
  const existP   = task?.participants || [];
  const existV   = task?.viewers      || [];
  const existM   = (task?.managers    || []).filter(id => id !== ownerUid);

  const partCont = g('tk-participants-list');
  const viewCont = g('tk-viewers-list');

  if (partCont) {
    partCont.innerHTML = others.map(u =>
      `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;font-size:12px">
        <input type="checkbox" id="tk-part-${u.id}" value="${u.id}" ${existP.includes(u.id) ? 'checked' : ''}>
        ${u.name}
      </label>`
    ).join('');
  }
  if (viewCont) {
    viewCont.innerHTML = others.map(u =>
      `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;font-size:12px">
        <input type="checkbox" id="tk-view-${u.id}" value="${u.id}" ${existV.includes(u.id) ? 'checked' : ''}>
        ${u.name}
      </label>`
    ).join('');
  }
}
window.populateTaskParticipants = populateTaskParticipants;

// ── Anlık bildirim ──────────────────────────────────────────────
function _showInstantTaskNotif(targetUid, taskId, title, pri, due, assigner) {
  if (!targetUid) return;
  const cu = _getCU();
  if (!cu || cu.id !== targetUid) return;
  const priLabel = { 1:'🔴 KRİTİK', 2:'🟠 ÖNEMLİ', 3:'🔵 NORMAL', 4:'⚪ DÜŞÜK' }[pri] || '';
  const n = document.createElement('div');
  n.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:var(--sf);border:1.5px solid var(--ac);border-radius:12px;padding:14px 18px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.15);animation:pus-row-in .3s ease';
  n.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--ac);margin-bottom:4px">📋 Yeni Görev Atandı</div>
    <div style="font-size:13px;font-weight:600;margin-bottom:6px">${title}</div>
    <div style="font-size:11px;color:var(--t2)">${priLabel}${due ? ' · ' + due : ''}${assigner ? ' · ' + assigner : ''}</div>
    <button onclick="this.parentElement.remove()" style="position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3)">×</button>`;
  document.body.appendChild(n);
  setTimeout(() => n.remove?.(), 6000);
}
window._showInstantTaskNotif = _showInstantTaskNotif;

// ── Toplu silme (admin only) ──────────────────────────────────
window._pusBulkCheck = function() {
  var checked = document.querySelectorAll('.pus-bulk-chk:checked');
  var bar = document.getElementById('pus-bulk-bar');
  var cnt = document.getElementById('pus-bulk-cnt');
  if (bar) bar.style.display = checked.length ? 'flex' : 'none';
  if (cnt) cnt.textContent = checked.length;
};

window._pusBulkClear = function() {
  document.querySelectorAll('.pus-bulk-chk').forEach(function(cb) { cb.checked = false; });
  var bar = document.getElementById('pus-bulk-bar');
  if (bar) bar.style.display = 'none';
};

window._pusBulkDelete = function() {
  var checked = document.querySelectorAll('.pus-bulk-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return parseInt(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal(ids.length + ' görev çöp kutusuna taşınacak. Emin misiniz?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var tasks = window.loadTasks ? loadTasks() : [];
      var trash = typeof loadTrash === 'function' ? loadTrash() : [];
      var now = new Date().toISOString();
      var exp = new Date(Date.now() + 30 * 86400000).toISOString();
      tasks.forEach(function(t) {
        if (ids.indexOf(t.id) === -1) return;
        trash.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(), name: t.title || '—', moduleName: 'Görev', originalCollection: 'tasks', originalData: Object.assign({}, t, { isDeleted: true, deletedAt: now }), deletedAt: now, deletedByName: window.CU?.()?.name || 'Admin', expiresAt: exp });
        t.isDeleted = true; t.deletedAt = now;
      });
      if (typeof window.saveTasks === 'function') saveTasks(tasks);
      if (typeof storeTrash === 'function') storeTrash(trash);
      window._pusBulkClear();
      window.renderPusula?.();
      window.toast?.(ids.length + ' görev silindi', 'ok');
      window.logActivity?.('task', 'Toplu silme: ' + ids.length + ' görev');
    }
  });
};
