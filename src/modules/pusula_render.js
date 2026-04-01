/**
 * src/modules/pusula_render.js — v3.0.0
 * Pusula — Ana render, liste görünümü, görünüm kontrolü
 * Bağımlı: pusula_core.js, database.js
 * Anayasa: K01 ≤800 satır
 */

'use strict';

// ── Ana render ──────────────────────────────────────────────────
function renderPusula() {
  populatePusUsers();
  setTimeout(_renderDeptSidebar, 50);

  // Günlük söz
  const _q   = _getDailyQuote();
  const _qEl = g('pus-motivation');
  if (_qEl) _qEl.innerHTML =
    `<span style="font-style:italic;color:var(--t2)">"${escapeHtml(_q.text)}"</span> `
    + `<span style="color:var(--t3);font-size:10px">— ${escapeHtml(_q.author)}</span>`;

  // Gecikmiş görev kontrolü (5 dakikada bir)
  const _ovKey = '_pus_ov_check';
  if (!window[_ovKey] || Date.now() - window[_ovKey] > 300000) {
    window[_ovKey] = Date.now();
    setTimeout(checkOverdueTasks, 500);
  }

  const todayS = new Date().toISOString().slice(0, 10);
  const allVis = visTasks();
  const users  = loadUsers();

  // ── Sayaçlar ─────────────────────────────────────────────────
  const ipCount   = allVis.filter(t => t.status === 'inprogress').length;
  const rvCount   = allVis.filter(t => t.status === 'review').length;
  const doneCount = allVis.filter(t => t.done || t.status === 'done').length;
  const todoCount = allVis.filter(t => !t.done && (!t.status || t.status === 'todo')).length;
  const ovCount   = allVis.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS).length;

  const el = id => g(id);
  if (el('pv-tot'))     el('pv-tot').textContent     = allVis.length;
  if (el('psf-todo-n')) el('psf-todo-n').textContent = todoCount;
  if (el('psf-ip-n'))   el('psf-ip-n').textContent   = ipCount;
  if (el('psf-rv-n'))   el('psf-rv-n').textContent   = rvCount;
  if (el('psf-done-n')) el('psf-done-n').textContent = doneCount;
  if (el('pv-ov'))      el('pv-ov').textContent      = ovCount;
  updatePusBadge();

  // ── Progress bar ─────────────────────────────────────────────
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
    progStats.innerHTML =
      `<span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--gr)"></span>${doneCount} tamam</span>`
      + `<span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--bl)"></span>${ipCount} devam</span>`
      + (overdue ? `<span class="pus-prog-stat"><span class="pus-prog-stat-dot" style="background:var(--rd)"></span>${overdue} gecikmiş</span>` : '');
  }

  // ── Filtreler ─────────────────────────────────────────────────
  let fl = [...allVis];
  if (PUS_QUICK_FILTER === 'todo')       fl = fl.filter(t => !t.done && (!t.status || t.status === 'todo'));
  else if (PUS_QUICK_FILTER === 'inprogress') fl = fl.filter(t => t.status === 'inprogress');
  else if (PUS_QUICK_FILTER === 'review')     fl = fl.filter(t => t.status === 'review');
  else if (PUS_QUICK_FILTER === 'done')       fl = fl.filter(t => t.done || t.status === 'done');
  else if (PUS_QUICK_FILTER === 'waiting')    fl = fl.filter(t => t.status === 'waiting');
  else if (PUS_QUICK_FILTER === 'overdue')    fl = fl.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS);

  if (PUS_VIEW === 'me') fl = fl.filter(t => t.uid === _getCU()?.id);

  const fPri    = parseInt(g('pf-pri')?.value  || '0');
  const fSearch = (g('pf-search')?.value       || '').toLowerCase();
  const fFrom   = g('pf-dfrom')?.value         || '';
  const fTo     = g('pf-dto')?.value           || '';
  const fSort   = g('pf-sort')?.value          || 'pri';
  const fDept   = g('pf-dept')?.value          || '';
  _populateDeptFilter();

  if (fPri > 0)  fl = fl.filter(t => t.pri === fPri);
  if (fDept)     fl = fl.filter(t => t.department === fDept);
  if (fSearch)   fl = fl.filter(t =>
    t.title.toLowerCase().includes(fSearch) ||
    (t.desc || '').toLowerCase().includes(fSearch) ||
    (t.tags || []).some(tg => tg.toLowerCase().includes(fSearch)) ||
    (t.jobId || '').toLowerCase().includes(fSearch)
  );
  if (fFrom) fl = fl.filter(t => t.due && t.due >= fFrom);
  if (fTo)   fl = fl.filter(t => t.due && t.due <= fTo);

  if (fSort === 'pri')    fl.sort((a, b) => (a.pri || 4) - (b.pri || 4) || (a.done ? 1 : -1));
  else if (fSort === 'due')    fl.sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due.localeCompare(b.due); });
  else if (fSort === 'newest') fl.sort((a, b) => b.id - a.id);
  else if (fSort === 'oldest') fl.sort((a, b) => a.id - b.id);
  else if (fSort === 'az')     fl.sort((a, b) => a.title.localeCompare(b.title, 'tr'));

  const sum = g('pf-summary');
  if (sum) sum.textContent = fl.length === allVis.length
    ? `${fl.length} görev`
    : `${fl.length} / ${allVis.length} görev gösteriliyor`;

  renderFocusPanel();

  const main = g('pus-main-view');
  if (!main) return;

  if (_PUS_FULL_VIEWS.indexOf(PUS_VIEW) !== -1) return;

  renderPusulaList(fl, users, todayS, main);

  fl.forEach(t => {
    const stEl = g('st-' + t.id);
    if (stEl) renderSubTasks(t.id, t.subTasks || [], stEl);
  });
}
window.renderPusula = renderPusula;

// ── Liste görünümü ───────────────────────────────────────────────
function renderPusulaList(fl, users, todayS, cont) {
  if (!fl.length) {
    cont.innerHTML = `<div class="pus-empty">
      <div class="pus-empty-icon">🎯</div>
      <div class="pus-empty-title">Görev bulunamadı</div>
      <div class="pus-empty-sub">Filtreleri değiştirin veya yeni bir görev ekleyin.</div>
      <button class="pus-add-btn" onclick="openAddTask()" style="margin:0 auto">
        <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        Görev Ekle
      </button>
    </div>`;
    return;
  }

  const chatCounts = loadTaskChats();
  const frag       = document.createDocumentFragment();
  const wrapper    = document.createElement('div');
  wrapper.className = 'pus-list-wrap';
  const cu = _getCU();

  fl.forEach((t, idx) => {
    const p          = PRI_MAP[t.pri] || PRI_MAP[4];
    const dueChip    = getDueChip(t.due, t.done, todayS);
    const statusPill = getStatusPill(t);
    const av         = getAvatar(t.uid, users, 26);
    const chatCount  = (chatCounts[t.id] || []).length;
    const subTasks   = t.subTasks || [];
    const subDone    = subTasks.filter(s => s.done).length;
    const isDone     = t.done || t.status === 'done';
    const dc         = t.department ? getDeptColor(t.department) : null;

    const tags = (t.tags || []).slice(0, 2).map(tg =>
      `<span style="background:var(--al);color:var(--ac);padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${tg}</span>`
    ).join('');

    const row = document.createElement('div');
    row.className   = `tk-row${isDone ? ' done-row' : ''}`;
    row.dataset.taskId = t.id;
    row.style.animation = `pus-row-in ${0.04 + idx * 0.025}s ease both`;
    row.addEventListener('click', () => openPusDetail(t.id));

    row.innerHTML = `
      <div class="tk-pri-bar" style="background:${isDone ? 'var(--b)' : p.color}"></div>
      <div class="tk-check" onclick="event.stopPropagation()">
        <input type="checkbox" ${isDone ? 'checked' : ''}
          onchange="toggleTask(${t.id},this.checked)"
          style="${isDone ? 'background:' + p.color + ';border-color:' + p.color : 'border-color:' + p.color}">
      </div>
      <div class="tk-body">
        <div class="tk-name" style="${isDone ? '' : 'font-weight:600'}">
          ${t.jobId ? `<span style="font-size:9px;font-family:monospace;color:var(--t3);background:var(--s2);padding:1px 5px;border-radius:3px;margin-right:4px;cursor:pointer" onclick="event.stopPropagation();window.openJobIdHub?.('${t.jobId}')">${t.jobId}</span>` : ''}${t.title}
        </div>
        <div class="tk-meta">
          <span class="tk-pri-badge ${p.badge}">${p.label}</span>
          ${statusPill}${dueChip}
          ${dc ? `<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${dc}22;color:${dc}">● ${t.department}</span>` : ''}
          ${t.cost ? `<span style="font-size:10px;background:rgba(16,185,129,.1);color:#059669;padding:2px 8px;border-radius:6px;font-weight:700">₺${Number(t.cost).toLocaleString('tr-TR')}</span>` : ''}
          ${subTasks.length ? `<span style="font-size:11px;color:var(--t3);background:var(--s2);padding:2px 8px;border-radius:6px;font-weight:700">⬜ ${subDone}/${subTasks.length}</span>` : ''}
          ${tags}
          ${t.link ? `<a href="${t.link}" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;color:#6366F1;text-decoration:none;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.1);font-weight:700">🔗</a>` : ''}
        </div>
      </div>
      <div class="tk-right">
        ${av}
        <div class="tk-row-actions">
          ${chatCount
            ? `<button onclick="event.stopPropagation();openPusDetail(${t.id})" class="tk-chat-btn-active">💬 ${chatCount}</button>`
            : `<button onclick="event.stopPropagation();openPusDetail(${t.id})" class="tk-chat-btn-empty">💬</button>`
          }
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'day')"  class="tk-action-btn" title="Günün odağı" style="opacity:${PUS_DAY_FOCUS.includes(t.id) ? 1 : .25}">🔥</button>
          <button onclick="event.stopPropagation();toggleFocus(${t.id},'week')" class="tk-action-btn" title="Haftanın odağı" style="opacity:${PUS_WEEK_FOCUS.includes(t.id) ? 1 : .25}">⭐</button>
          ${t.uid === cu?.id || window.isAdmin?.() ? `<button onclick="event.stopPropagation();editTask(${t.id})" class="tk-action-btn">✏️</button>` : ''}
          ${t.uid === cu?.id || window.isAdmin?.() ? `<button onclick="event.stopPropagation();delTask(${t.id})" class="tk-action-btn" style="color:#EF4444">✕</button>` : ''}
        </div>
      </div>`;

    wrapper.appendChild(row);

    const stPlaceholder = document.createElement('div');
    stPlaceholder.id = 'st-' + t.id;
    wrapper.appendChild(stPlaceholder);
  });

  frag.appendChild(wrapper);
  cont.replaceChildren(frag);
}

// ── Görünüm kontrolü ────────────────────────────────────────────
function setPusView(v, btn) {
  PUS_VIEW = v;
  localStorage.setItem('ak_pus_view', v);

  // Segment butonları
  document.querySelectorAll('.pvt-btn,.pus-seg-btn,.cvb')
    .forEach(b => b.classList.remove('on', 'active'));
  if (btn) btn.classList.add('on', 'active');
  else { const b = g('pus-v-' + v); if (b) b.classList.add('on', 'active'); }

  // Tam ekran modlar: UI gizle
  const isFullView = _PUS_FULL_VIEWS.indexOf(v) !== -1;
  const _motivation  = g('pus-motivation');
  const _tabsRow     = document.querySelector('.pus-tabs-row');
  const _layout      = document.querySelector('.pus-layout');
  const _focusPanel  = g('pus-focus-panel');
  if (_motivation) _motivation.style.display = isFullView ? 'none' : '';
  if (_tabsRow)    _tabsRow.style.display    = isFullView ? 'none' : '';
  if (_layout)     _layout.style.display    = isFullView ? 'none' : '';
  if (_focusPanel) _focusPanel.style.display = isFullView ? 'none' : '';

  if (isFullView) {
    let _fullCont = g('pus-fullview-cont');
    if (!_fullCont) {
      _fullCont    = document.createElement('div');
      _fullCont.id = 'pus-fullview-cont';
      const _panel = g('panel-pusula');
      if (_panel) _panel.appendChild(_fullCont);
    }
    _fullCont.style.display = '';
    _fullCont.innerHTML     = '';
    const _tasks = visTasks();
    const _users = loadUsers();
    const _today = new Date().toISOString().slice(0, 10);
    if (v === 'kadran')      _renderKadranView(_tasks, _users, _today, _fullCont);
    else if (v === 'kanban') _renderKanbanView(_tasks, _users, _today, _fullCont);
    else if (v === 'odak')   _renderOdakView(_tasks, _users, _today, _fullCont);
    else if (v === 'gantt')  { setTimeout(() => _pfRenderGantt?.(), 50); }
  } else {
    const _fc = g('pus-fullview-cont');
    if (_fc) { _fc.style.display = 'none'; _fc.innerHTML = ''; }
    renderPusula();
  }
}

window._toggleMeFilter = function(checked) {
  PUS_VIEW = checked ? 'me' : (localStorage.getItem('ak_pus_view') === 'me' ? 'list' : localStorage.getItem('ak_pus_view') || 'list');
  renderPusula();
};

function setPusQuickFilter(f, btn) {
  PUS_QUICK_FILTER = f;
  document.querySelectorAll('.pus-stat-pill,.psb-tab,.pus-tab,.pus-stat-chip')
    .forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const idMap = { all:'psf-all', todo:'psf-todo', inprogress:'psf-ip', review:'psf-rv', done:'psf-done', overdue:'psf-ov' };
    const el    = g(idMap[f]);
    if (el) el.classList.add('active');
  }
  renderPusula();
}

function clearPusFilters() {
  ['pf-search','pf-pri','pf-dept','pf-dfrom','pf-dto'].forEach(id => {
    const el = g(id);
    if (el) el.value = el.tagName === 'SELECT' ? (id === 'pf-pri' ? '0' : '') : '';
  });
  PUS_QUICK_FILTER = 'all';
  const allBtn = g('psf-all');
  if (allBtn) {
    document.querySelectorAll('.pus-tab,.pus-stat-pill').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
  }
  renderPusula();
}

function updateTkPriBar() {
  const pri = parseInt(g('tk-pri')?.value || '2');
  const bar = g('tk-pri-indicator');
  if (bar) bar.style.background = PRI_MAP[pri]?.color || '#64748B';
}

// Window exports
window.setPusView        = setPusView;
window.setPusQuickFilter = setPusQuickFilter;
window.clearPusFilters   = clearPusFilters;
window.updateTkPriBar    = updateTkPriBar;
