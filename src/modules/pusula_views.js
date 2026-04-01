/**
 * src/modules/pusula_views.js — v3.0.0
 * Pusula — Tam ekran görünümler: Kanban, Odak, Kadran, Gantt
 * Bağımlı: pusula_core.js, pusula_render.js, database.js
 * Anayasa: K01 ≤800 satır
 */

'use strict';

// ════════════════════════════════════════════════════════════════
// KANBAN — Taiichi Ohno / Toyota Production System
// ════════════════════════════════════════════════════════════════
function _renderKanbanView(fl, users, todayS, cont) {
  const WIP_LIMIT = 5;
  const cols = [
    { key:'todo',       label:'Yapılacak',  color:'#475569', filter: t => !t.done && (!t.status || t.status === 'todo') },
    { key:'inprogress', label:'Devam',      color:'#1D4ED8', filter: t => t.status === 'inprogress' },
    { key:'waiting',    label:'Beklemede',  color:'#D97706', filter: t => t.status === 'waiting' },
    { key:'review',     label:'İnceleme',   color:'#B45309', filter: t => t.status === 'review' },
    { key:'done',       label:'Tamamlandı', color:'#15803D', filter: t => t.done || t.status === 'done' },
  ];
  const priColors = { 1:'#dc2626', 2:'#D97706', 3:'#3B82F6', 4:'#9CA3AF' };

  const colCounts    = {};
  cols.forEach(c => { colCounts[c.key] = fl.filter(c.filter).length; });
  const totalActive  = fl.filter(t => !t.done).length;
  const doneThisWeek = fl.filter(t => t.done && t.due && t.due >= todayS).length;
  const bottleneck   = cols.filter(c => c.key !== 'done')
    .sort((a, b) => colCounts[b.key] - colCounts[a.key])[0];
  const efficiency   = totalActive > 0 ? Math.round((colCounts.inprogress || 0) / totalActive * 100) : 0;

  let html = `<div style="display:flex;align-items:center;gap:16px;padding:10px 16px;border-bottom:0.5px solid var(--b);font-size:11px;color:var(--t3);background:var(--sf)">
    <span>Darboğaz: <b style="color:${bottleneck.color}">${bottleneck.label}</b> (${colCounts[bottleneck.key]})</span>
    <span>Bu hafta: <b style="color:#15803D">${doneThisWeek}</b> tamamlandı</span>
    <span>Akış verimliliği: <b>${efficiency}%</b></span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:12px;align-items:start">`;

  cols.forEach(col => {
    const items  = fl.filter(col.filter);
    const wipWarn= col.key === 'inprogress' && items.length > WIP_LIMIT;
    const wipPct = col.key === 'inprogress' ? Math.min(100, Math.round(items.length / WIP_LIMIT * 100)) : 0;
    const wipCol = wipPct <= 60 ? '#639922' : wipPct <= 90 ? '#BA7517' : '#E24B4A';

    html += `<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden;min-height:200px">
      <div style="padding:8px 12px;border-bottom:1px solid var(--b);background:${wipWarn ? 'rgba(226,75,74,.08)' : 'var(--s2)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${col.key === 'inprogress' ? '6' : '0'}px">
          <span style="font-size:11px;font-weight:700;color:${col.color}">${col.label}</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:var(--s2);color:var(--t3)">${items.length}</span>
          ${wipWarn ? `<span style="font-size:9px;color:#E24B4A;font-weight:600">${items.length}/${WIP_LIMIT} ⚠</span>` : ''}
        </div>
        ${col.key === 'inprogress' ? `<div style="height:3px;background:var(--b);border-radius:2px;overflow:hidden"><div style="height:100%;width:${wipPct}%;background:${wipCol};border-radius:2px"></div></div>` : ''}
      </div>
      <div style="padding:6px" ondragover="event.preventDefault()" ondrop="window._kanbanDrop?.(event,'${col.key}')">`;

    items.forEach(t => {
      const u    = users.find(x => x.id === t.uid);
      const ini  = u ? (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
      const late = !t.done && t.due && t.due < todayS;
      html += `<div draggable="true" ondragstart="event.dataTransfer.setData('taskId',${t.id})"
        style="background:var(--sf);border:1px solid var(--b);border-left:3px solid ${priColors[t.pri] || '#9CA3AF'};border-radius:8px;padding:8px 10px;margin-bottom:6px;cursor:grab"
        onclick="openPusDetail(${t.id})">
        <div style="font-size:11px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:6px">${t.title}</div>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="width:6px;height:6px;border-radius:50%;background:${priColors[t.pri] || '#9CA3AF'};flex-shrink:0"></span>
          <span style="width:18px;height:18px;border-radius:5px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;flex-shrink:0">${ini}</span>
          ${t.due ? `<span style="font-size:9px;color:${late ? '#dc2626' : 'var(--t3)'};margin-left:auto">${t.due.slice(5)}</span>` : ''}
          ${t.jobId ? `<span style="font-size:8px;font-family:monospace;color:var(--t3);background:var(--s2);padding:1px 4px;border-radius:3px">${t.jobId}</span>` : ''}
        </div>
      </div>`;
    });

    html += `<button onclick="openAddTask()" style="width:100%;padding:5px;border:1px dashed var(--bm);background:none;border-radius:5px;font-size:10px;color:var(--t3);cursor:pointer;font-family:inherit;margin-top:2px">+ Ekle</button>
      </div></div>`;
  });

  html += '</div>';
  cont.innerHTML = html;
}

window._kanbanDrop = function(e, newStatus) {
  e.preventDefault();
  const taskId = parseInt(e.dataTransfer.getData('taskId'));
  if (!taskId) return;
  const d = loadTasks();
  const t = d.find(x => x.id === taskId);
  if (!t) return;
  if (newStatus === 'done') { t.done = true; t.status = 'done'; }
  else { t.done = false; t.status = newStatus; }
  t.updated_at = nowTs();
  saveTasks(d);
  renderPusula();
  window.toast?.('Durum güncellendi', 'ok');
};

// ════════════════════════════════════════════════════════════════
// ODAK — Gary Keller (The ONE Thing)
// ════════════════════════════════════════════════════════════════
function _renderOdakView(fl, users, todayS, cont) {
  const active = fl.filter(t => !t.done && t.status !== 'done');
  const done   = fl.filter(t => t.done || t.status === 'done');
  const priColors2 = { 1:'#dc2626', 2:'#D97706', 3:'#3B82F6', 4:'#9CA3AF' };

  active.sort((a, b) => {
    if (a.pri !== b.pri) return (a.pri || 4) - (b.pri || 4);
    const aLate = a.due && a.due < todayS ? 1 : 0;
    const bLate = b.due && b.due < todayS ? 1 : 0;
    if (aLate !== bLate) return bLate - aLate;
    return (a.due || '9999').localeCompare(b.due || '9999');
  });

  const focus  = active[0];
  const next5  = active.slice(1, 6);
  const total  = fl.length;
  const doneN  = done.length;
  const pct    = total > 0 ? Math.round(doneN / total * 100) : 0;

  let html = '<div style="padding:16px;display:flex;flex-direction:column;gap:14px">';

  // Haftalık takvim (Pzt–Cum)
  const now       = new Date(todayS);
  const dayOfWeek = now.getDay() || 7;
  const monday    = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const TR_DAYS   = ['Pzt','Sal','Çar','Per','Cum'];

  html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">';
  for (let di = 0; di < 5; di++) {
    const dayDate  = new Date(monday);
    dayDate.setDate(monday.getDate() + di);
    const dayStr   = dayDate.toISOString().slice(0, 10);
    const isToday  = dayStr === todayS;
    const isPast   = dayStr < todayS;
    const dayTasks = active.filter(t => t.due === dayStr).length;
    const late     = isPast && dayTasks > 0;
    html += `<div style="padding:8px;border-radius:8px;text-align:center;background:${isToday ? 'var(--ac)' : 'var(--sf)'};border:1px solid ${isToday ? 'var(--ac)' : 'var(--b)'}">
      <div style="font-size:10px;font-weight:600;color:${isToday ? '#fff' : 'var(--t3)'}">${TR_DAYS[di]}</div>
      <div style="font-size:14px;font-weight:700;color:${isToday ? '#fff' : (late ? '#dc2626' : 'var(--t)')};margin-top:2px">${dayDate.getDate()}</div>
      ${dayTasks > 0 ? `<div style="font-size:9px;color:${isToday ? 'rgba(255,255,255,.8)' : 'var(--t3)'};margin-top:2px">${dayTasks} görev</div>` : ''}
    </div>`;
  }
  html += '</div>';

  // Ana odak kartı
  if (focus) {
    const fu       = users.find(x => x.id === focus.uid);
    const fLate    = focus.due && focus.due < todayS;
    const fDays    = focus.due ? Math.ceil((new Date(todayS) - new Date(focus.due)) / 86400000) : 0;
    const subCount = (focus.subTasks || []).length;
    const subDone  = (focus.subTasks || []).filter(s => s.done).length;
    const focusPct = subCount > 0 ? Math.round(subDone / subCount * 100) : 0;

    html += `<div style="background:var(--sf);border:2px solid ${priColors2[focus.pri] || 'var(--b)'};border-radius:14px;padding:24px;text-align:center;cursor:pointer" onclick="openPusDetail(${focus.id})">
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:#dc2626"></span>
        <span style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Bu haftanın tek odağı</span>
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--t);margin-bottom:10px">${focus.title}</div>
      ${focusPct > 0 ? `<div style="height:4px;background:var(--s2);border-radius:2px;margin-bottom:10px;max-width:300px;margin-left:auto;margin-right:auto"><div style="height:100%;width:${focusPct}%;background:${priColors2[focus.pri] || 'var(--ac)'};border-radius:2px"></div></div>` : ''}
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:var(--t2);flex-wrap:wrap">
        <span style="padding:3px 10px;border-radius:6px;background:${(priColors2[focus.pri] || 'var(--s2)')}22;color:${priColors2[focus.pri] || 'var(--t3)'};font-weight:600">${{1:'Kritik',2:'Önemli',3:'Normal',4:'Düşük'}[focus.pri] || 'Normal'}</span>
        ${fu ? `<span>${fu.name}</span>` : ''}
        ${subCount > 0 ? `<span style="font-size:10px;color:var(--t3)">${subDone}/${subCount} alt görev</span>` : ''}
        ${fLate ? `<span style="color:#dc2626;font-weight:600">${fDays} gün gecikmiş</span>` : (focus.due ? `<span>${focus.due}</span>` : '')}
      </div>
    </div>`;
  } else {
    html += '<div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:32px;text-align:center;color:var(--t3)">Aktif görev yok</div>';
  }

  // Sıradaki görevler
  if (next5.length) {
    html += `<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--b);background:var(--s2);font-size:11px;font-weight:700;color:var(--t2)">Sıradaki ${next5.length} Görev</div>`;
    next5.forEach((t, i) => {
      const late = t.due && t.due < todayS;
      html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:0.5px solid var(--b);cursor:pointer" onclick="openPusDetail(${t.id})">
        <span style="width:20px;height:20px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--t3);flex-shrink:0">${i + 2}</span>
        <span style="flex:1;font-size:12px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span>
        ${t.due ? `<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${late ? '#FEE2E2' : 'var(--s2)'};color:${late ? '#dc2626' : 'var(--t3)'}">${t.due.slice(5)}</span>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  // İlerleme özeti
  html += `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--s2);border-radius:10px;font-size:12px;color:var(--t2)">
    <div style="flex:1;height:5px;background:var(--b);border-radius:99px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct>=80?'var(--gr)':pct>=50?'var(--am)':'var(--ac)'};border-radius:99px"></div></div>
    <span style="font-weight:700;white-space:nowrap;color:${pct>=80?'var(--gr)':pct>=50?'var(--am)':'var(--ac)'}">${pct}% tamamlandı</span>
    <span style="color:var(--t3)">${doneN}/${total}</span>
  </div>`;

  html += '</div>';
  cont.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// KADRAN — Stephen Covey (7 Habits)
// ════════════════════════════════════════════════════════════════
function _renderKadranView(fl, users, todayS, cont) {
  const important = t => t.pri === 1 || t.pri === 2;
  const urgent    = t => t.due && t.due <= todayS;
  const allActive = fl.filter(t => !t.done);

  const q1 = allActive.filter(t =>  important(t) &&  urgent(t));
  const q2 = allActive.filter(t =>  important(t) && !urgent(t));
  const q3 = allActive.filter(t => !important(t) &&  urgent(t));
  const q4 = allActive.filter(t => !important(t) && !urgent(t));

  const priDot = { 1:'#dc2626', 2:'#D97706', 3:'#3B82F6', 4:'#9CA3AF' };
  const SHOW_MAX = 8;

  const _kCard = t => {
    const u   = users.find(x => x.id === t.uid);
    const ini = u ? (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
    const late = t.due && t.due < todayS;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:0.5px solid var(--b);cursor:pointer" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''" onclick="openPusDetail(${t.id})">
      <span style="width:5px;height:5px;border-radius:50%;background:${priDot[t.pri] || '#9CA3AF'};flex-shrink:0"></span>
      <span style="flex:1;font-size:11px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span>
      <span style="width:20px;height:20px;border-radius:5px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;flex-shrink:0">${ini}</span>
      ${t.due ? `<span style="font-size:9px;color:${late ? '#dc2626' : 'var(--t3)'}">${t.due.slice(5)}</span>` : ''}
    </div>`;
  };

  const _kQuad = (title, borderC, titleC, bgC, opacity, items) => {
    const pct   = Math.round(items.length / (allActive.length || 1) * 100);
    const shown = items.slice(0, SHOW_MAX);
    const more  = items.length - SHOW_MAX;
    return `<div style="background:var(--sf);border:1px solid ${borderC};border-radius:10px;overflow:hidden;opacity:${opacity}">
      <div style="padding:10px 14px;background:${bgC};border-bottom:1px solid ${borderC};display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:12px;font-weight:700;color:${titleC}">${title}</span>
        <span style="font-size:10px;color:var(--t3)">${items.length} (${pct}%)</span>
      </div>
      <div style="max-height:300px;overflow-y:auto">
        ${shown.length ? shown.map(_kCard).join('') : '<div style="padding:16px;text-align:center;font-size:11px;color:var(--t3)">Görev yok</div>'}
        ${more > 0 ? `<div style="padding:6px 14px;font-size:10px;color:var(--ac);cursor:pointer;text-align:center" onclick="this.parentElement.style.maxHeight='none';this.remove()">+ ${more} görev daha</div>` : ''}
      </div>
      <div style="height:3px;background:var(--s2)"><div style="height:100%;width:${Math.round((items.filter(t=>t.done).length||0)/(items.length||1)*100)}%;background:${titleC};border-radius:0 2px 2px 0"></div></div>
    </div>`;
  };

  cont.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">`
    + _kQuad('Hemen Yap',    '#F09595', '#A32D2D', '#FCEBEB15', '1',    q1)
    + _kQuad('Planla',       '#85B7EB', '#0C447C', '#E6F1FB15', '1',    q2)
    + _kQuad('Devret',       'var(--b)','#633806', '#FAEEDA15', '1',    q3)
    + _kQuad('Elemine Et',   'var(--b)','#6B7280', 'var(--s2)', '0.65', q4)
    + '</div>';
}

// ── Gantt — basit zaman çizelgesi ───────────────────────────────
function _pfRenderGantt() {
  let cont = g('pus-fullview-cont') || g('pus-main-view');
  if (!cont) return;

  const tasks  = visTasks().filter(t => !t.done && t.due);
  const todayS = new Date().toISOString().slice(0, 10);

  // Tarih aralığı: bugünden 3 hafta
  const start  = new Date(todayS);
  const end    = new Date(todayS);
  end.setDate(end.getDate() + 21);

  const days = [];
  const cur  = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  let html = `<div style="overflow-x:auto;padding:12px">
    <div style="min-width:${150 + days.length * 30}px">
      <div style="display:flex;border-bottom:1px solid var(--b);margin-bottom:4px">
        <div style="width:150px;flex-shrink:0;font-size:10px;font-weight:600;color:var(--t3);padding:4px 8px">GÖREV</div>`;

  days.forEach(d => {
    const isToday = d === todayS;
    const dayNum  = parseInt(d.slice(8));
    html += `<div style="width:30px;flex-shrink:0;text-align:center;font-size:9px;color:${isToday ? 'var(--ac)' : 'var(--t3)'};font-weight:${isToday ? '700' : '400'};padding:4px 0;border-left:${isToday ? '1px solid var(--ac)' : '0'}">${dayNum}</div>`;
  });
  html += '</div>';

  if (!tasks.length) {
    html += '<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">Son tarihi olan aktif görev yok</div>';
  } else {
    tasks.slice(0, 30).forEach(t => {
      const p     = PRI_MAP[t.pri] || PRI_MAP[4];
      const u     = loadUsers().find(x => x.id === t.uid);
      const tStart= t.start || todayS;
      const tEnd  = t.due;

      html += `<div style="display:flex;align-items:center;border-bottom:0.5px solid var(--b);min-height:32px">
        <div style="width:150px;flex-shrink:0;font-size:11px;font-weight:500;padding:4px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--t)" onclick="openPusDetail(${t.id})" title="${t.title}">${t.title}</div>`;

      days.forEach(d => {
        const inRange = d >= tStart && d <= tEnd;
        const isStart = d === tStart;
        const isEnd   = d === tEnd;
        const isLate  = d <= todayS && d >= tStart && !t.done;
        const bg      = inRange ? (isLate ? '#FEE2E2' : p.color + '22') : 'transparent';
        const bLeft   = isStart ? `border-left:2px solid ${p.color}` : '';
        const bRight  = isEnd ? `border-right:2px solid ${p.color}` : '';
        html += `<div style="width:30px;flex-shrink:0;height:28px;background:${bg};${bLeft};${bRight}"></div>`;
      });

      html += '</div>';
    });
  }

  html += '</div></div>';
  cont.innerHTML = html;
}
window._pfRenderGantt = _pfRenderGantt;

// Window exports
window._renderKanbanView = _renderKanbanView;
window._renderOdakView   = _renderOdakView;
window._renderKadranView = _renderKadranView;
