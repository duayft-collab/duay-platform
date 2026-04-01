/**
 * src/modules/pusula_detail.js — v3.0.0
 * Pusula — Görev detay paneli (slide-in)
 * Bağımlı: pusula_core.js, pusula_task.js, database.js
 * Anayasa: K01 ≤800 satır
 */

'use strict';

// Durum ve öncelik config
const _ST_CFG = {
  todo:       { l:'Yapılacak', bg:'rgba(100,116,139,.1)', c:'#475569' },
  inprogress: { l:'Devam',     bg:'rgba(29,78,216,.1)',   c:'#1D4ED8' },
  review:     { l:'İnceleme',  bg:'rgba(180,83,9,.1)',    c:'#B45309' },
  done:       { l:'Tamamlandı',bg:'rgba(21,128,61,.1)',   c:'#15803D' },
  waiting:    { l:'Beklemede', bg:'rgba(217,119,6,.1)',   c:'#D97706' },
};
const _PRI_COLORS = { 1:'#DC2626', 2:'#D97706', 3:'#4F46E5', 4:'#64748B' };
const _PRI_NAMES  = { 1:'🔴 KRİTİK', 2:'🟠 ÖNEMLİ', 3:'🔵 NORMAL', 4:'⚪ DÜŞÜK' };

// Avatar + isim chip
function _pusPeopleChip(uid, users, badge, color) {
  const u = users.find(x => x.id === uid);
  if (!u) return '';
  const idx = users.indexOf(u);
  const c   = _getAVC()[idx % _getAVC().length];
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s2);border-radius:8px">
    <div style="width:28px;height:28px;border-radius:7px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${_pusInitials(u.name)}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600;color:var(--t)">${u.name}</div>
      <div style="font-size:10px;color:var(--t3)">${u.role || badge}</div>
    </div>
    <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:${color}22;color:${color};font-weight:600">${badge}</span>
  </div>`;
}
function _pusAv(uid, users, size) {
  const u = users.find(x => x.id === uid);
  if (!u) return '';
  const idx = users.indexOf(u);
  const c   = _getAVC()[idx % _getAVC().length];
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${c[0]};color:${c[1]};font-size:${Math.round(size * 0.38)}px;font-weight:700;flex-shrink:0" title="${u.name}">${_pusInitials(u.name)}</span>`;
}

// ── Panel aç ────────────────────────────────────────────────────
function openPusDetail(taskId) {
  const task = loadTasks().find(t => t.id === taskId);
  if (!task) return;

  _PDP_TASK_ID  = taskId;
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

  // Meta
  const metaEl = g('pdp-meta');
  if (metaEl) {
    const dl     = task.due ? Math.ceil((new Date(task.due) - new Date(todayS)) / 86400000) : null;
    const dueStr = task.due
      ? (dl < 0
          ? `<span style="color:var(--rd);font-size:11px">⚠ ${Math.abs(dl)}g gecikmiş</span>`
          : `<span style="color:var(--t2);font-size:11px">${task.due}</span>`)
      : '';
    metaEl.innerHTML =
      `<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:${sc.bg};color:${sc.c}">${sc.l}</span> `
      + `<span style="padding:3px 9px;border-radius:6px;font-size:11px;background:${(_PRI_COLORS[task.pri] || '#9ca3af')}22;color:${_PRI_COLORS[task.pri] || '#9ca3af'}">${_PRI_NAMES[task.pri] || '—'}</span>`
      + (dueStr ? ' ' + dueStr : '');
  }

  const body  = g('pus-detail-body');
  if (!body) { panel.classList.add('open'); panel.style.display = 'flex'; return; }

  const files  = task.files || (task.file ? [task.file] : []);
  const chats  = (loadTaskChats()[taskId] || []).length;

  body.innerHTML =
    `<div id="pdp-tabbar" style="display:flex;background:var(--s2);border-bottom:1px solid var(--b);flex-shrink:0">
      <button id="pdp-tab-info"  class="pdp-t active" onclick="pdpSwitch('info')"  style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--ac);border-bottom:2px solid var(--ac);font-family:inherit">👤 Bilgi</button>
      <button id="pdp-tab-chat"  class="pdp-t"        onclick="pdpSwitch('chat')"  style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">💬 Mesaj${chats ? `<span style="background:var(--rd);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">${chats}</span>` : ''}</button>
      <button id="pdp-tab-files" class="pdp-t"        onclick="pdpSwitch('files')" style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">📎 Dosya${files.length ? `<span style="background:var(--ac);color:#fff;border-radius:99px;padding:0 5px;font-size:9px;margin-left:3px;vertical-align:middle">${files.length}</span>` : ''}</button>
      <button id="pdp-tab-perms" class="pdp-t"        onclick="pdpSwitch('perms')" style="flex:1;padding:10px 4px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;font-family:inherit">🔒 İzin</button>
    </div>
    <div style="flex:1;overflow-y:auto">
      <div id="pdp-pane-info"  style="padding:16px"></div>
      <div id="pdp-pane-chat"  style="display:none;height:100%;flex-direction:column"></div>
      <div id="pdp-pane-files" style="display:none;padding:16px"></div>
      <div id="pdp-pane-perms" style="display:none;padding:16px"></div>
    </div>`;

  pdpRenderInfo();

  const _openTs = new Date().toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const _openEl = g('pdp-opened-at');
  if (_openEl) _openEl.textContent = '👁 ' + _openTs;

  panel.classList.add('open');
  panel.style.display = 'flex';
}
window.openPusDetail = openPusDetail;

// ── Panel kapat ──────────────────────────────────────────────────
function closePusDetail() {
  const panel = g('pus-detail-panel');
  if (panel) { panel.classList.remove('open'); panel.style.display = 'none'; }
  _PDP_TASK_ID = null;
}
window.closePusDetail = closePusDetail;

// ── Sekme geçişi ─────────────────────────────────────────────────
function pdpSwitch(tab) {
  document.querySelectorAll('.pdp-t').forEach(b => {
    b.style.color       = 'var(--t2)';
    b.style.fontWeight  = '500';
    b.style.borderBottom= '2px solid transparent';
  });
  const active = g('pdp-tab-' + tab);
  if (active) { active.style.color = 'var(--ac)'; active.style.fontWeight = '600'; active.style.borderBottom = '2px solid var(--ac)'; }

  ['info','chat','files','perms'].forEach(p => {
    const el = g('pdp-pane-' + p);
    if (!el) return;
    el.style.display = p === tab ? (tab === 'chat' ? 'flex' : 'block') : 'none';
  });

  if (tab === 'info')  pdpRenderInfo();
  if (tab === 'chat')  pdpRenderChat();
  if (tab === 'files') pdpRenderFiles();
  if (tab === 'perms') pdpRenderPerms();
}
window.pdpSwitch = pdpSwitch;

// ── Sekme 1: Bilgi ───────────────────────────────────────────────
function pdpRenderInfo() {
  const pane = g('pdp-pane-info');
  if (!pane || !_PDP_TASK_ID) return;
  const task    = loadTasks().find(t => t.id === _PDP_TASK_ID);
  if (!task) return;
  const users   = loadUsers();
  const todayS  = new Date().toISOString().slice(0, 10);
  const stKey   = task.done ? 'done' : (task.status || 'todo');
  const managers= task.managers || [task.uid];

  let html = '<div style="display:flex;flex-direction:column;gap:14px">';

  // Durum seçici
  html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">DURUM</div><div style="display:flex;gap:5px;flex-wrap:wrap">';
  ['todo','inprogress','review','done'].forEach(s => {
    const sc  = _ST_CFG[s];
    const isA = s === stKey;
    html += `<button onclick="pdpQuickStatus('${s}')" style="padding:5px 11px;border-radius:7px;border:1px solid ${isA ? sc.c : 'var(--b)'};background:${isA ? sc.bg : 'var(--sf)'};color:${isA ? sc.c : 'var(--t2)'};font-size:12px;cursor:pointer;font-family:inherit;font-weight:${isA ? 600 : 400}">${sc.l}</button>`;
  });
  html += '</div></div>';

  // Meta kartlar
  const dl     = task.due ? Math.ceil((new Date(task.due) - new Date(todayS)) / 86400000) : null;
  const dueStr = task.due
    ? getDueChip(task.due, task.done, todayS) + ` <span style="font-size:11px;color:var(--t2)">${task.due}</span>`
    : '<span style="color:var(--t3);font-size:12px">Belirtilmemiş</span>';
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SON TARİH</div><div>${dueStr}</div></div>
    <div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">ÖNCELİK</div><div style="font-size:13px;font-weight:600;color:${_PRI_COLORS[task.pri] || 'var(--t2)'}">${_PRI_NAMES[task.pri] || '—'}</div></div>
  </div>`;

  // Açıklama
  if (task.desc) {
    html += `<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">AÇIKLAMA</div>
    <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--t2);background:var(--s2);border-radius:8px;padding:10px 12px">${task.desc}</div></div>`;
  }

  // JOB ID + Departman
  if (task.jobId || task.department) {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap">
      ${task.jobId ? `<span style="font-size:10px;font-family:monospace;background:var(--s2);padding:3px 9px;border-radius:5px;cursor:pointer" onclick="window.openJobIdHub?.('${task.jobId}')">${task.jobId}</span>` : ''}
      ${task.department ? `<span style="font-size:10px;padding:3px 9px;border-radius:5px;background:${getDeptColor(task.department)}22;color:${getDeptColor(task.department)};font-weight:600">● ${task.department}</span>` : ''}
    </div>`;
  }

  // Etiketler
  if ((task.tags || []).length) {
    html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">ETİKETLER</div><div style="display:flex;gap:5px;flex-wrap:wrap">'
      + task.tags.map(t => `<span style="background:var(--al);color:var(--at);padding:3px 10px;border-radius:6px;font-size:11px">${t}</span>`).join('')
      + '</div></div>';
  }

  // Yöneticiler
  html += `<div><div style="font-size:10px;font-weight:700;color:#007AFF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">👑 YÖNETİCİLER</div><div style="display:flex;flex-direction:column;gap:5px">`;
  managers.forEach(id => { html += _pusPeopleChip(id, users, 'Yönetici', '#007AFF'); });
  html += '</div></div>';

  if ((task.participants || []).length) {
    html += `<div><div style="font-size:10px;font-weight:600;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">✅ KATILIMCILAR</div><div style="display:flex;flex-direction:column;gap:5px">`;
    task.participants.forEach(id => { html += _pusPeopleChip(id, users, 'Katılımcı', 'var(--ac)'); });
    html += '</div></div>';
  }

  if ((task.viewers || []).length) {
    html += `<div><div style="font-size:10px;font-weight:700;color:#8B5CF6;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">👁 İZLEYİCİLER</div><div style="display:flex;flex-direction:column;gap:5px">`;
    task.viewers.forEach(id => { html += _pusPeopleChip(id, users, 'İzleyici', '#8B5CF6'); });
    html += '</div></div>';
  }

  // Alt görevler
  html += `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">ALT GÖREVLER (${(task.subTasks || []).length})</div>
      <button onclick="addSubTask(${_PDP_TASK_ID})" style="font-size:11px;color:var(--ac);background:none;border:1px dashed var(--bm);border-radius:5px;cursor:pointer;padding:3px 10px;font-family:inherit">+ Ekle</button>
    </div>
    <div id="pdp-subtasks"></div>
  </div>`;

  // Ekler
  const files = task.files || (task.file ? [task.file] : []);
  if (task.link || files.length) {
    html += '<div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">EKLER</div><div style="display:flex;flex-direction:column;gap:6px">';
    if (task.link) html += `<a href="${task.link}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--s2);color:var(--ac);border-radius:8px;text-decoration:none;font-size:12px">🔗 ${task.link}</a>`;
    if (files.length) html += `<a href="${files[0].data}" download="${files[0].name}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--s2);color:var(--t);border-radius:8px;text-decoration:none;font-size:12px">📎 ${files[0].name}</a>`;
    html += '</div></div>';
  }

  // Zaman bilgileri
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:4px;border-top:1px solid var(--b)">
    <div style="background:var(--s2);border-radius:9px;padding:9px 12px">
      <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">OLUŞTURULMA</div>
      <div style="font-size:11px;color:var(--t2);font-family:monospace">${task.createdAt || task.created_at || '—'}</div>
    </div>
    <div style="background:var(--s2);border-radius:9px;padding:9px 12px">
      <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SON AÇILMA</div>
      <div id="pdp-opened-at" style="font-size:11px;color:var(--t2);font-family:monospace">—</div>
    </div>
  </div>`;

  html += '</div>';
  pane.innerHTML = html;

  const stEl = g('pdp-subtasks');
  if (stEl) renderSubTasks(_PDP_TASK_ID, task.subTasks || [], stEl);
}
window.pdpRenderInfo = pdpRenderInfo;

// ── Hızlı durum güncelle ────────────────────────────────────────
function pdpQuickStatus(status) {
  if (!_PDP_TASK_ID) return;
  quickUpdateTask(_PDP_TASK_ID, 'status', status);
  pdpRenderInfo();
}
window.pdpQuickStatus = pdpQuickStatus;

// ── Sekme 2: Mesajlar ────────────────────────────────────────────
function pdpRenderChat() {
  const pane = g('pdp-pane-chat');
  if (!pane || !_PDP_TASK_ID) return;
  pane.style.flexDirection = 'column';
  pane.style.height = '100%';

  if (!g('pdp-chat-msgs')) {
    pane.innerHTML =
      '<div style="padding:8px 14px;border-bottom:1px solid var(--b);flex-shrink:0"><input type="search" id="pdp-chat-search" class="fi" placeholder="Mesajlarda ara..." style="font-size:12px;padding:6px 10px" oninput="pdpRefreshChatMsgs()"></div>'
      + '<div id="pdp-chat-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0"></div>'
      + '<div style="padding:10px 14px;border-top:1px solid var(--b);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:var(--sf)">'
      + '<textarea id="pdp-chat-inp" class="fi" rows="2" style="resize:none;flex:1;font-size:13px;min-height:42px" placeholder="Mesaj yaz..."></textarea>'
      + '<button class="btn btnp" onclick="pdpSendChat()" style="font-size:14px;padding:6px 12px">➤</button>'
      + '</div>';
    const inp = g('pdp-chat-inp');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pdpSendChat(); } });
  }
  pdpRefreshChatMsgs();
}
window.pdpRenderChat = pdpRenderChat;

function pdpRefreshChatMsgs() {
  const allMsgs = loadTaskChats()[_PDP_TASK_ID] || [];
  const searchQ = (g('pdp-chat-search')?.value || '').toLowerCase();
  const msgs    = searchQ ? allMsgs.filter(m => (m.text || '').toLowerCase().includes(searchQ)) : allMsgs;
  const users   = loadUsers();
  const cont    = g('pdp-chat-msgs');
  if (!cont) return;
  const todayS  = new Date().toISOString().slice(0, 10);
  const frag    = document.createDocumentFragment();

  if (!msgs.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--t2);font-size:13px;padding:32px 16px;margin:auto';
    empty.innerHTML = '<div style="font-size:32px;margin-bottom:8px">💬</div><div>Henüz mesaj yok.</div>';
    frag.appendChild(empty);
  } else {
    let lastDate = '';
    msgs.forEach(m => {
      const cu   = _getCU();
      const isMe = m.uid === cu?.id;
      const u    = users.find(x => x.id === m.uid) || { name: m.name || '?' };
      const msgDate = (m.ts || '').slice(0, 10);

      if (msgDate && msgDate !== lastDate) {
        lastDate = msgDate;
        const sep = document.createElement('div');
        sep.style.cssText = 'text-align:center;font-size:10px;color:var(--t3);margin:4px 0;display:flex;align-items:center;gap:6px';
        sep.innerHTML = `<div style="flex:1;height:1px;background:var(--b)"></div>${msgDate === todayS ? 'Bugün' : msgDate}<div style="flex:1;height:1px;background:var(--b)"></div>`;
        frag.appendChild(sep);
      }

      const idx = users.indexOf(u);
      const c   = _getAVC()[Math.max(idx, 0) % _getAVC().length];
      const row = document.createElement('div');
      row.style.cssText = `display:flex;flex-direction:${isMe ? 'row-reverse' : 'row'};align-items:flex-end;gap:6px`;
      row.innerHTML =
        `<div style="width:24px;height:24px;border-radius:50%;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${_pusInitials(u.name)}</div>`
        + `<div style="max-width:74%">`
        + (!isMe ? `<div style="font-size:10px;color:var(--t3);margin-bottom:2px">${u.name}</div>` : '')
        + `<div style="background:${isMe ? 'var(--ac)' : 'var(--sf)'};color:${isMe ? '#fff' : 'var(--t)'};border:${isMe ? 'none' : '1px solid var(--b)'};border-radius:${isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};padding:7px 11px;font-size:13px;line-height:1.5;word-break:break-word">${m.text || ''}</div>`
        + `<div style="font-size:9px;color:var(--t3);margin-top:2px${isMe ? ';text-align:right' : ''}">${(m.ts || '').slice(11, 16)}</div>`
        + `</div>`;
      frag.appendChild(row);
    });
  }

  cont.replaceChildren(frag);
  cont.scrollTop = cont.scrollHeight;
}
window.pdpRefreshChatMsgs = pdpRefreshChatMsgs;

function pdpSendChat() {
  if (!_PDP_TASK_ID) return;
  const text = (g('pdp-chat-inp')?.value || '').trim();
  if (!text) { window.toast?.('Mesaj yazın', 'err'); return; }
  const chats = loadTaskChats();
  if (!chats[_PDP_TASK_ID]) chats[_PDP_TASK_ID] = [];
  const cu  = _getCU();
  chats[_PDP_TASK_ID].push({ id: generateNumericId(), uid: cu?.id, name: cu?.name, text, ts: nowTs() });
  storeTaskChats(chats);
  if (g('pdp-chat-inp')) g('pdp-chat-inp').value = '';
  pdpRefreshChatMsgs();
  const task = loadTasks().find(t => t.id === _PDP_TASK_ID);
  if (task && cu) {
    const targets = new Set([task.uid, ...(task.participants || []), ...(task.viewers || [])]);
    targets.delete(cu.id);
    if (targets.size > 0)
      window.addNotif?.('💬', `"${task.title}" görevinde yeni mesaj — ${cu.name || ''}`, 'info', 'pusula', null, task.id);
  }
}
window.pdpSendChat = pdpSendChat;

// ── Sekme 3: Dosyalar ────────────────────────────────────────────
function pdpRenderFiles() {
  const pane = g('pdp-pane-files');
  if (!pane || !_PDP_TASK_ID) return;
  const task  = loadTasks().find(t => t.id === _PDP_TASK_ID);
  if (!task) return;
  const files = task.files || (task.file ? [task.file] : []);
  const cu    = _getCU();
  const canEdit = window.isAdmin?.() || task.uid === cu?.id
    || (task.managers || []).includes(cu?.id)
    || (task.participants || []).includes(cu?.id);

  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:var(--t2)">${files.length} dosya</div>
    ${canEdit ? `<div><input type="file" id="pdp-file-inp" style="display:none" multiple onchange="pdpUploadFiles(this)"><button onclick="g('pdp-file-inp').click()" class="btn btns" style="font-size:11px;padding:4px 10px">📎 Dosya Ekle</button></div>` : ''}
  </div>`;

  if (!files.length) {
    html += '<div style="text-align:center;color:var(--t3);font-size:13px;padding:28px">Henüz dosya yok</div>';
  } else {
    files.forEach((f, i) => {
      const isImg = f.data && /^data:image/.test(f.data);
      html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--s2);border-radius:8px;margin-bottom:6px">
        <span style="font-size:20px">${isImg ? '🖼' : '📄'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</div>
          ${f.size ? `<div style="font-size:10px;color:var(--t3)">${Math.round(f.size / 1024)} KB</div>` : ''}
        </div>
        <a href="${f.data}" download="${f.name}" style="font-size:11px;color:var(--ac);text-decoration:none;padding:4px 8px;background:var(--al);border-radius:5px">İndir</a>
        ${canEdit ? `<button onclick="pdpDelFile(${i})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px">✕</button>` : ''}
      </div>`;
    });
  }
  pane.innerHTML = html;
}
window.pdpRenderFiles = pdpRenderFiles;

function pdpUploadFiles(input) {
  const task = loadTasks().find(t => t.id === _PDP_TASK_ID);
  if (!task) return;
  const files = Array.from(input.files || []);
  if (!files.length) return;
  if (!task.files) task.files = task.file ? [task.file] : [];
  let processed = 0;
  files.forEach(file => {
    const r = new FileReader();
    r.onload = ev => {
      task.files.push({ name: file.name, data: ev.target.result, size: file.size, type: file.type, ts: nowTs() });
      processed++;
      if (processed === files.length) {
        const d = loadTasks();
        const t = d.find(x => x.id === _PDP_TASK_ID);
        if (t) t.files = task.files;
        saveTasks(d);
        pdpRenderFiles();
        window.toast?.(`${files.length} dosya eklendi`, 'ok');
      }
    };
    r.readAsDataURL(file);
  });
}
window.pdpUploadFiles = pdpUploadFiles;

function pdpDelFile(idx) {
  const d = loadTasks();
  const t = d.find(x => x.id === _PDP_TASK_ID);
  if (!t) return;
  const files = t.files || (t.file ? [t.file] : []);
  files.splice(idx, 1);
  t.files = files;
  if (files.length === 0) delete t.file;
  saveTasks(d);
  pdpRenderFiles();
  window.toast?.('Dosya silindi', 'ok');
}
window.pdpDelFile = pdpDelFile;

// ── Sekme 4: İzinler ─────────────────────────────────────────────
function pdpRenderPerms() {
  const pane = g('pdp-pane-perms');
  if (!pane || !_PDP_TASK_ID) return;
  const task  = loadTasks().find(t => t.id === _PDP_TASK_ID);
  if (!task) return;
  const users = loadUsers();
  const cu    = _getCU();
  const isManager = window.isAdmin?.() || task.uid === cu?.id || (task.managers || []).includes(cu?.id);

  const allPeople = [...new Set([...(task.managers || [task.uid]), ...(task.participants || []), ...(task.viewers || [])])];

  let html = '<div style="display:flex;flex-direction:column;gap:8px">';
  allPeople.forEach(uid => {
    const u    = users.find(x => x.id === uid);
    if (!u) return;
    const role = (task.managers || [task.uid]).includes(uid) ? 'Yönetici'
      : (task.participants || []).includes(uid) ? 'Katılımcı' : 'İzleyici';
    const c    = { 'Yönetici':'#007AFF', 'Katılımcı':'var(--ac)', 'İzleyici':'#8B5CF6' };
    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--s2);border-radius:8px">
      ${_pusAv(uid, users, 28)}
      <span style="flex:1;font-size:12px;font-weight:500">${u.name}</span>
      <span style="font-size:10px;color:${c[role] || 'var(--t3)'};font-weight:600">${role}</span>
    </div>`;
  });
  if (!allPeople.length) html += '<div style="text-align:center;color:var(--t3);font-size:12px;padding:16px">Atanan kişi yok</div>';
  html += '</div>';

  if (isManager) {
    html += `<div style="margin-top:12px"><button onclick="editTask(${_PDP_TASK_ID});closePusDetail()" class="btn btns" style="width:100%;font-size:12px">✏️ İzinleri Düzenle (Görev Formu)</button></div>`;
  }
  pane.innerHTML = html;
}
window.pdpRenderPerms = pdpRenderPerms;
