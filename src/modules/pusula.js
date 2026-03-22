/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/pusula.js  —  v1.0
 * Görev Yönetimi (Pusula) Modülü
 *
 * Kapsam:
 *   • Görev CRUD  (openAddTask / editTask / saveTask / delTask)
 *   • toggleTask  (tamamlandı / yeniden aç)
 *   • Board görünümü  (renderPusulaBoard)
 *   • List görünümü   (renderPusulaList)   — DocumentFragment
 *   • Detay paneli    (openPusDetail / closePusDetail)
 *   • Alt Görevler    (addSubTask / toggleSubTask / delSubTask / openSubTaskEdit / renderSubTasks)
 *   • Görev Yazışma   (openTaskChat / renderTaskChatMsgs / sendTaskChatMsg)
 *   • Katılımcı / İzleyici yönetimi (populateTaskParticipants)
 *   • Filtre & sıralama (visTasks / clearPusFilters)
 *   • Excel export   (exportTasksXlsx)
 *   • Badge güncelle  (updatePusBadge)
 *
 * Veri yapısı (değiştirilmez):
 *   localStorage key: 'ak_tk2'           → Görev dizisi
 *   localStorage key: 'ak_task_chat1'    → { [taskId]: Message[] }
 *
 * Global bağımlılıklar:
 *   window.Auth      → getCU(), isAdmin()
 *   window.DB        → loadTasks(), saveTasks(), loadUsers(),
 *                       loadTaskChats(), storeTaskChats(), logActivity()
 *   window.toast()   → bildirim
 *   window.openMo()  / window.closeMo()
 *   window.addNotif()
 *   XLSX             → CDN'den yüklenmiş olmalı
 *
 * Anayasa Kural 3 (Performans):
 *   renderPusulaList → DocumentFragment ile tek DOM işlemi
 *   renderPusulaBoard→ DocumentFragment per-kolon
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ── Global shortcut'lar ─────────────────────────────────────────


'use strict';

// ── Modül düzeyinde durum ────────────────────────────────────────
let PUS_VIEW         = localStorage.getItem('ak_pus_view') || 'list';
let PUS_QUICK_FILTER = 'all';
let PUS_DETAIL_ID    = null;

// ── Kısayol yardımcıları ─────────────────────────────────────────

// Çekirdek bağlantıları (runtime'da çözülür)

// ── Avatar renk paleti ───────────────────────────────────────────

// ── Öncelik haritası ─────────────────────────────────────────────
const PRI_MAP = {
  1: { color: '#DC2626', glow: 'rgba(220,38,38,.25)',  badge: 'tk-pri-badge-1', label: 'KRİTİK'  },
  2: { color: '#D97706', glow: 'rgba(217,119,6,.2)',   badge: 'tk-pri-badge-2', label: 'ÖNEMLİ'  },
  3: { color: '#4F46E5', glow: 'rgba(79,70,229,.2)',   badge: 'tk-pri-badge-3', label: 'NORMAL'  },
  4: { color: '#64748B', glow: 'rgba(100,116,139,.15)',badge: 'tk-pri-badge-4', label: 'DÜŞÜK'   },
};

const PRI_COLOR = { 1:'#FF3B30', 2:'#FF9500', 3:'#007AFF', 4:'#C7C7CC' };

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — VERİ / GÖRÜNÜRLÜK
// ════════════════════════════════════════════════════════════════

/**
 * Aktif kullanıcının görebileceği görevleri döndürür.
 * Admin → filtre seçimine göre; Personel → sadece kendi/katılımcı/izleyici
 */
function visTasks() {
  const d = loadTasks();
  if (isAdmin()) {
    const uid = parseInt(g('pus-usel')?.value || '0');
    return uid ? d.filter(t => t.uid === uid) : d;
  }
  const myId = CU()?.id;
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
  return '';
}

/** Kullanıcı avatarı span HTML döndürür */
function getAvatar(uid, users, size = 22) {
  const u = users.find(x => x.id === uid);
  if (!u) return '';
  const idx = users.indexOf(u);
  const c   = AVC[idx % AVC.length];
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

/** Kullanıcı seçici dropdown'larını doldurur */
function populatePusUsers() {
  const users = loadUsers();
  const sel   = g('pus-usel');
  const tsel  = g('tk-user');

  if (sel && isAdmin()) {
    sel.innerHTML = `<option value="0">👥 Tüm Personel</option>` +
      users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  }
  if (tsel) {
    if (isAdmin()) {
      tsel.innerHTML = users.map(u =>
        `<option value="${u.id}">${u.name} (${u.role})</option>`
      ).join('');
    } else {
      const uid = CU()?.id || 0;
      tsel.innerHTML = `<option value="${uid}">${CU()?.name || 'Ben'}</option>`;
      tsel.value = String(uid);
    }
  }
}

/** Kritik görev sayısını sidebar badge'ine yazar */
function updatePusBadge() {
  const tasks  = isAdmin() ? loadTasks() : loadTasks().filter(t => t.uid === CU()?.id);
  const undone = tasks.filter(t => !t.done && t.pri === 1).length;
  const b      = g('nb-pus-b');
  if (b) { b.textContent = undone; b.style.display = undone > 0 ? 'inline' : 'none'; }
  st('sv-c', undone);
}

/**
 * Ana render fonksiyonu.
 * Hero istatistikleri, progress strip, filtreler ve list/board görünümü.
 */
function renderPusula() {
  populatePusUsers();
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
      [100, '🎉 Tüm görevler tamamlandı! Harika iş!'],
      [80,  '🚀 Neredeyse bitti, son düzlüktesiniz!'],
      [60,  '💪 İyi gidiyorsunuz, devam edin!'],
      [40,  '⚡ Orta noktayı geçtiniz, devam!'],
      [20,  '🎯 Başladınız! Her adım önemli.'],
      [0,   '📋 Görevler sizi bekliyor.'],
    ];
    const msg = msgs.find(([t]) => pct >= t);
    subEl.textContent = msg ? msg[1] : 'Görev yönetim merkezi';
  }

  // ── Filtreler ──────────────────────────────────────────────────
  let fl = [...allVis];

  // Hızlı filtre (hero pills)
  if (PUS_QUICK_FILTER === 'todo')       fl = fl.filter(t => !t.done && (!t.status || t.status === 'todo'));
  else if (PUS_QUICK_FILTER === 'inprogress') fl = fl.filter(t => t.status === 'inprogress');
  else if (PUS_QUICK_FILTER === 'review')     fl = fl.filter(t => t.status === 'review');
  else if (PUS_QUICK_FILTER === 'done')       fl = fl.filter(t => t.done || t.status === 'done');
  else if (PUS_QUICK_FILTER === 'overdue')    fl = fl.filter(t => !t.done && t.status !== 'done' && t.due && t.due < todayS);

  // "Yalnızca benimkiler" görünümü
  if (PUS_VIEW === 'me') fl = fl.filter(t => t.uid === CU()?.id);

  // Panel filtreleri
  const fPri    = parseInt(g('pf-pri')?.value   || '0');
  const fSearch = (g('pf-search')?.value        || '').toLowerCase();
  const fFrom   = g('pf-dfrom')?.value          || '';
  const fTo     = g('pf-dto')?.value            || '';
  const fSort   = g('pf-sort')?.value           || 'pri';

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
      `<span style="background:rgba(99,102,241,.1);color:#6366F1;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${tg}</span>`
    ).join('');
    const isDone = t.done || t.status === 'done';
    const cu     = CU();

    // Ana satır
    const row = document.createElement('div');
    row.className  = `tk-row${isDone ? ' done-row' : ''}`;
    row.style.animation = `pus-row-in ${.04 + idx * .025}s ease both`;
    row.addEventListener('click', () => openPusDetail(t.id));

    row.innerHTML = `
      <div class="tk-pri-bar" style="background:${isDone ? '#CBD5E1' : p.color};${isDone ? '' : 'box-shadow:0 0 10px ' + p.glow}"></div>
      <div class="tk-check" onclick="event.stopPropagation()">
        <input type="checkbox" ${isDone ? 'checked' : ''}
          onchange="Pusula.toggle(${t.id},this.checked)"
          style="${isDone ? 'background:' + p.color + ';border-color:' + p.color : 'border-color:' + p.color}">
      </div>
      <div class="tk-body">
        <div class="tk-name" style="${isDone ? '' : 'font-weight:600'}">
          ${t.title}
          ${!isDone && (t.participants || []).includes(cu?.id) ? ` <span style="font-size:9px;background:rgba(99,102,241,.12);color:#6366F1;padding:1px 6px;border-radius:4px;font-weight:700">✅ Katılımcı</span>` : ''}
          ${!isDone && (t.viewers || []).includes(cu?.id) ? ` <span style="font-size:9px;background:rgba(139,92,246,.12);color:#8B5CF6;padding:1px 6px;border-radius:4px;font-weight:700">👁 İzleyici</span>` : ''}
        </div>
        <div class="tk-meta">
          <span class="tk-pri-badge ${p.badge}">${p.label}</span>
          ${statusPill}${dueChip}
          ${subTasks.length ? `<span style="font-size:10px;color:var(--t3);background:var(--s2);padding:2px 8px;border-radius:6px;font-weight:700">⬜ ${subDone}/${subTasks.length}</span>` : ''}
          ${tags}
          ${t.link ? `<a href="${t.link}" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;color:#6366F1;text-decoration:none;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.1);font-weight:700">🔗</a>` : ''}
          ${t.file ? `<span style="font-size:10px;background:var(--s2);color:var(--t3);padding:2px 7px;border-radius:5px;font-weight:600">📎</span>` : ''}
          ${(t.participants || []).length ? `<span style="font-size:10px;color:var(--ac);padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.08);font-weight:600">+${(t.participants || []).length} katılımcı</span>` : ''}
          ${(t.viewers || []).length ? `<span style="font-size:10px;color:#8B5CF6;padding:2px 7px;border-radius:5px;background:rgba(139,92,246,.08);font-weight:600">👁${(t.viewers || []).length}</span>` : ''}
        </div>
      </div>
      <div class="tk-right">
        ${av}
        <div class="tk-row-actions">
          ${chatCount
            ? `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" class="tk-chat-btn-active">💬 ${chatCount}</button>`
            : `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" class="tk-chat-btn-empty">💬</button>`
          }
          ${t.uid === cu?.id || isAdmin() ? `<button onclick="event.stopPropagation();Pusula.edit(${t.id})" class="tk-action-btn">✏️</button>` : ''}
          ${t.uid === cu?.id || isAdmin() ? `<button onclick="event.stopPropagation();Pusula.del(${t.id})" class="tk-action-btn" style="color:#EF4444">✕</button>` : ''}
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
  const PRI_B = {
    1: { color: '#DC2626', glow: 'rgba(220,38,38,.3)'  },
    2: { color: '#D97706', glow: 'rgba(217,119,6,.25)' },
    3: { color: '#4F46E5', glow: 'rgba(79,70,229,.25)' },
    4: { color: '#64748B', glow: 'rgba(100,116,139,.15)' },
  };
  const cols = [
    { key: 'todo',       label: 'Yapılacak',      cls: 'pus-col-todo',       titleColor: '#475569', filter: t => !t.done && (!t.status || t.status === 'todo') },
    { key: 'inprogress', label: '🔄 Devam',        cls: 'pus-col-inprogress', titleColor: '#1D4ED8', filter: t => t.status === 'inprogress' },
    { key: 'review',     label: '👀 İnceleme',     cls: 'pus-col-review',     titleColor: '#B45309', filter: t => t.status === 'review' },
    { key: 'done',       label: '✅ Tamamlandı',   cls: 'pus-col-done',       titleColor: '#15803D', filter: t => t.done || t.status === 'done' },
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
          <div style="width:4px;min-height:36px;border-radius:3px;flex-shrink:0;margin-top:1px;background:${p.color};box-shadow:0 0 8px ${p.glow}"></div>
          <div class="tk-card-title" style="flex:1">${t.title}</div>
          <button onclick="event.stopPropagation();Pusula.edit(${t.id})"
            style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:12px;padding:0;flex-shrink:0;opacity:0;transition:.14s" class="tk-card-edit">✏️</button>
        </div>
        <div class="tk-card-meta">
          ${dueChip}${tags}
          ${subTasks.length ? `<span style="font-size:9px;color:var(--t3);background:var(--s2);padding:1px 6px;border-radius:5px;font-weight:700">⬜${subDone}/${subTasks.length}</span>` : ''}
          ${chatCount ? `<button onclick="event.stopPropagation();Pusula.openChat(${t.id})" style="background:linear-gradient(135deg,#6366F1,#8B5CF6);border:none;border-radius:99px;padding:2px 8px;font-size:9px;color:#fff;font-weight:700;cursor:pointer">💬${chatCount}</button>` : ''}
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

function openPusDetail(taskId) {
  const task = loadTasks().find(t => t.id === taskId);
  if (!task) return;
  const users   = loadUsers();
  const owner   = users.find(u => u.id === task.uid) || { name: '?' };
  const todayS  = new Date().toISOString().slice(0, 10);
  PUS_DETAIL_ID = taskId;

  const panel = g('pus-detail-panel');
  if (!panel) return;

  const priNames  = { 1: '🔴 Kritik', 2: '🟠 Önemli', 3: '🔵 Normal', 4: '⚪ Düşük' };
  const priColors = { 1: '#ef4444',   2: '#f97316',   3: '#3b82f6',   4: '#9ca3af' };
  const stKey     = task.done ? 'done' : (task.status || 'todo');
  const statusCfg = {
    todo:       { l: '📋 Yapılacak', bg: 'var(--s2)',  c: 'var(--t2)'  },
    inprogress: { l: '🔄 Devam',     bg: 'var(--blb)', c: 'var(--blt)' },
    review:     { l: '👀 İnceleme',  bg: 'var(--amb)', c: 'var(--amt)' },
    done:       { l: '✅ Tamam',     bg: 'var(--grb)', c: 'var(--grt)' },
  };

  // Başlık ve meta
  const titleEl = g('pdp-title');
  if (titleEl) titleEl.textContent = task.title;

  const metaEl = g('pdp-meta');
  if (metaEl) {
    const sc = statusCfg[stKey] || statusCfg.todo;
    const dl = task.due ? Math.ceil((new Date(task.due) - new Date(todayS)) / 86400000) : null;
    const dueStr = task.due
      ? (dl < 0
          ? `<span style="color:var(--rd);font-size:11px">⚠ ${Math.abs(dl)}g gecikmiş</span>`
          : `<span style="color:var(--t2);font-size:11px">${task.due}</span>`)
      : '';
    metaEl.innerHTML = `
      <span style="padding:3px 9px;border-radius:6px;font-size:11px;background:${sc.bg};color:${sc.c}">${sc.l}</span>
      <span style="padding:3px 9px;border-radius:6px;font-size:11px;background:${priColors[task.pri]}22;color:${priColors[task.pri]}">${priNames[task.pri] || '—'}</span>
      ${dueStr}`;
  }

  // Gövde
  const idx  = users.indexOf(owner);
  const avc  = AVC[Math.max(idx, 0) % AVC.length];
  const body = g('pus-detail-body');
  if (body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- Durum hızlı değiştir -->
        <div>
          <div class="pdp-section-label">DURUM</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['todo','inprogress','review','done'].map(s => {
              const sc      = statusCfg[s];
              const isActive = s === stKey;
              return `<button onclick="Pusula.quickUpdate(${taskId},'status','${s}');Pusula.openDetail(${taskId})"
                style="padding:6px 12px;border-radius:7px;border:1px solid ${isActive ? sc.c : 'var(--b)'};background:${isActive ? sc.bg : 'var(--sf)'};color:${isActive ? sc.c : 'var(--t2)'};font-size:12px;cursor:pointer;font-family:inherit;font-weight:${isActive ? '600' : '400'};transition:all .12s">${sc.l}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Meta kartlar -->
        <div class="pdp-meta-grid">
          <div class="pdp-meta-card">
            <div class="pdp-meta-card-label">SORUMLU</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
              <div style="width:28px;height:28px;border-radius:50%;background:${avc[0]};color:${avc[1]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${_pusInitials(owner.name)}</div>
              <span style="font-size:13px;font-weight:500">${owner.name}</span>
            </div>
          </div>
          <div class="pdp-meta-card">
            <div class="pdp-meta-card-label">SON TARİH</div>
            <div style="margin-top:4px">${task.due
              ? getDueChip(task.due, task.done, todayS) + ` <span style="font-size:11px;color:var(--t2);margin-left:4px">${task.due}</span>`
              : '<span style="color:var(--t3);font-size:13px">Belirtilmemiş</span>'
            }</div>
          </div>
          ${task.start ? `<div class="pdp-meta-card"><div class="pdp-meta-card-label">BAŞLANGIÇ</div><div style="font-size:13px;color:var(--t2);margin-top:4px">${task.start}</div></div>` : ''}
          <div class="pdp-meta-card">
            <div class="pdp-meta-card-label">ÖNCELİK</div>
            <div style="margin-top:4px;display:flex;gap:5px;flex-wrap:wrap">
              ${[1,2,3,4].map(p => `<button onclick="Pusula.quickUpdate(${taskId},'pri',${p});Pusula.openDetail(${taskId})"
                style="padding:2px 8px;border-radius:5px;border:1px solid ${p === task.pri ? priColors[p] : 'var(--b)'};background:${p === task.pri ? priColors[p] + '22' : 'var(--sf)'};color:${p === task.pri ? priColors[p] : 'var(--t2)'};font-size:10px;cursor:pointer;font-family:inherit">${priNames[p]}</button>`).join('')}
            </div>
          </div>
        </div>

        ${task.desc ? `<div class="pdp-section">
          <div class="pdp-section-label">AÇIKLAMA</div>
          <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--t2);background:var(--s2);border-radius:8px;padding:12px 14px">${task.desc}</div>
        </div>` : ''}

        ${(task.tags || []).length ? `<div class="pdp-section">
          <div class="pdp-section-label">ETİKETLER</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            ${(task.tags || []).map(tg => `<span style="background:var(--al);color:var(--at);padding:3px 10px;border-radius:6px;font-size:12px">${tg}</span>`).join('')}
          </div>
        </div>` : ''}

        ${(task.link || task.file) ? `<div class="pdp-section">
          <div class="pdp-section-label">EKLER</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
            ${task.link ? `<a href="${task.link}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--blb);color:var(--blt);border-radius:8px;text-decoration:none;font-size:12px">🔗 <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${task.link}</span></a>` : ''}
            ${task.file ? `<a href="${task.file.data}" download="${task.file.name}" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--s2);color:var(--t);border-radius:8px;text-decoration:none;font-size:12px">📎 ${task.file.name}</a>` : ''}
          </div>
        </div>` : ''}

        <!-- Alt Görevler -->
        <div class="pdp-section">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div class="pdp-section-label" style="margin-bottom:0">ALT GÖREVLER <span style="color:var(--t3);font-weight:400">(${(task.subTasks || []).length})</span></div>
            <button onclick="addSubTask(${taskId})" class="tk-action-btn" style="font-size:11px;padding:4px 10px;border-style:dashed">+ Alt Görev</button>
          </div>
          <div id="pdp-subtasks"></div>
        </div>

        ${(task.participants || []).length || (task.viewers || []).length ? `
        <div class="pdp-section" style="background:var(--s2);border-radius:12px;padding:12px 14px">
          ${(task.participants || []).length ? `
          <div style="margin-bottom:${(task.viewers || []).length ? '12px' : '0'}">
            <div style="font-size:10px;font-weight:700;color:var(--ac);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">✅ Katılımcılar — göreve müdahil</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${(task.participants || []).map(uid => { const u = users.find(x => x.id === uid) || { name: '?' }; const i2 = users.indexOf(u); const av2 = AVC[Math.max(i2, 0) % AVC.length]; return `<div style="display:flex;align-items:center;gap:5px;background:var(--sf);border:1px solid var(--b);border-radius:8px;padding:4px 9px"><div style="width:22px;height:22px;border-radius:50%;background:${av2[0]};color:${av2[1]};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${_pusInitials(u.name)}</div><span style="font-size:12px;font-weight:500">${u.name}</span></div>`; }).join('')}
            </div>
          </div>` : ''}
          ${(task.viewers || []).length ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:#8B5CF6;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">👁 İzleyiciler — sadece görüntüler</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${(task.viewers || []).map(uid => { const u = users.find(x => x.id === uid) || { name: '?' }; const i2 = users.indexOf(u); const av2 = AVC[Math.max(i2, 0) % AVC.length]; return `<div style="display:flex;align-items:center;gap:5px;background:var(--sf);border:1px solid rgba(139,92,246,.2);border-radius:8px;padding:4px 9px;opacity:.8"><div style="width:22px;height:22px;border-radius:50%;background:${av2[0]};color:${av2[1]};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">${_pusInitials(u.name)}</div><span style="font-size:12px;font-weight:500">${u.name}</span><span style="font-size:9px;color:#8B5CF6;font-weight:700">👁</span></div>`; }).join('')}
            </div>
          </div>` : ''}
        </div>` : ''}

        <!-- Yazışma butonu -->
        <button onclick="Pusula.openChat(${taskId})" class="btn btns" style="width:100%;justify-content:center;border-radius:8px;padding:10px">
          💬 Yazışmalar
          ${(loadTaskChats()[taskId] || []).length ? `<span style="background:var(--rd);color:#fff;border-radius:99px;padding:1px 7px;font-size:10px;margin-left:4px">${(loadTaskChats()[taskId] || []).length}</span>` : ''}
        </button>
      </div>`;
  }

  // Alt görevler
  const stEl = g('pdp-subtasks');
  if (stEl) renderSubTasks(taskId, task.subTasks || [], stEl);

  panel.classList.add('open');
  panel.style.display = 'flex';
}

function closePusDetail() {
  const p = g('pus-detail-panel');
  if (p) { p.classList.remove('open'); setTimeout(() => { p.style.display = 'none'; }, 200); }
  PUS_DETAIL_ID = null;
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
  t[field] = val;
  if (field === 'status') t.done = val === 'done';
  saveTasks(d);
  renderPusula();
  window.toast?.(field === 'status' ? 'Durum güncellendi' : 'Öncelik güncellendi', 'ok');
}

/** Yeni görev modalını açar */
function openAddTask() {
  populatePusUsers();
  ['tk-title','tk-desc','tk-tags','tk-link'].forEach(id => { const el = g(id); if (el) el.value = ''; });
  if (g('tk-pri'))    g('tk-pri').value    = '2';
  if (g('tk-due'))    g('tk-due').value    = '';
  if (g('tk-start'))  g('tk-start').value  = '';
  if (g('tk-status')) g('tk-status').value = 'todo';
  if (g('tk-eid'))    g('tk-eid').value    = '';
  if (g('tk-file'))   g('tk-file').value   = '';
  if (g('tk-fp'))     g('tk-fp').textContent = '';
  const s = g('tk-user');
  if (s) {
    if (!isAdmin()) {
      s.innerHTML = `<option value="${CU()?.id}">${CU()?.name || 'Ben'}</option>`;
      s.value = String(CU()?.id);
    } else {
      const uid = parseInt(g('pus-usel')?.value || '0');
      if (uid > 0) s.value = String(uid);
    }
  }
  st('mo-tk-t', '➕ Görev Ekle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(null), 50);
}

/** Mevcut görevi düzenleme modalında açar */
function editTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t) return;
  populatePusUsers();
  if (g('tk-title'))  g('tk-title').value  = t.title;
  if (g('tk-desc'))   g('tk-desc').value   = t.desc || '';
  if (g('tk-pri'))    g('tk-pri').value    = t.pri || 2;
  if (g('tk-due'))    g('tk-due').value    = t.due || '';
  if (g('tk-start'))  g('tk-start').value  = t.start || '';
  if (g('tk-status')) g('tk-status').value = t.status || (t.done ? 'done' : 'todo');
  if (g('tk-eid'))    g('tk-eid').value    = t.id;
  if (g('tk-tags'))   g('tk-tags').value   = (t.tags || []).join(', ');
  if (g('tk-link'))   g('tk-link').value   = t.link || '';
  if (g('tk-fp') && t.file) g('tk-fp').textContent = '📎 ' + t.file.name + ' (kayıtlı)';
  const sel = g('tk-user');
  if (sel) sel.value = t.uid;
  st('mo-tk-t', '✏️ Görevi Düzenle');
  window.openMo?.('mo-task');
  setTimeout(() => populateTaskParticipants(t), 50);
}

/** Görevi kaydeder (yeni veya güncelleme) */
function saveTask() {
  const title = (g('tk-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const uid = parseInt(g('tk-user')?.value || '0') || parseInt(CU()?.id || '0');
  if (!isAdmin() && uid !== parseInt(CU()?.id || '0')) { window.toast?.('Yetki yok', 'err'); return; }
  if (!uid) { window.toast?.('Kullanıcı belirlenemedi — tekrar giriş yapın', 'err'); return; }

  const d    = loadTasks();
  const eid  = parseInt(g('tk-eid')?.value || '0');
  const participants = [];
  const viewers      = [];
  document.querySelectorAll('[id^="tk-part-"]:checked').forEach(cb => participants.push(parseInt(cb.value)));
  document.querySelectorAll('[id^="tk-view-"]:checked').forEach(cb => viewers.push(parseInt(cb.value)));

  const fields = {
    title,
    desc:   g('tk-desc')?.value   || '',
    pri:    parseInt(g('tk-pri')?.value  || '2'),
    due:    g('tk-due')?.value    || null,
    start:  g('tk-start')?.value  || null,
    status: g('tk-status')?.value || 'todo',
    tags:   (g('tk-tags')?.value  || '').split(',').map(t => t.trim()).filter(Boolean),
    link:   g('tk-link')?.value   || '',
    uid,
    done:   g('tk-status')?.value === 'done',
    participants,
    viewers,
  };

  const doSave = fileData => {
    if (fileData) fields.file = fileData;
    else if (eid) { const old = d.find(x => x.id === eid); if (old?.file) fields.file = old.file; }
    if (eid) {
      const t = d.find(x => x.id === eid);
      if (t) Object.assign(t, fields);
      logActivity('task', `"${title}" güncelledi`);
      window.toast?.('Güncellendi ✓', 'ok');
    } else {
      d.push({ id: Date.now(), subTasks: [], ...fields });
      logActivity('task', `"${title}" ekledi`);
      window.toast?.('Görev eklendi ✓', 'ok');
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
  t.done   = done;
  if (done) t.status = 'done';
  else if (t.status === 'done') t.status = 'todo';
  saveTasks(d);
  renderPusula();
  updatePusBadge();
  logActivity('task', `"${t.title}" görevini ${done ? 'tamamladı' : 'yeniden açtı'}`);
  window.toast?.(done ? '✓ Tamamlandı' : 'Yeniden açıldı', 'ok');
}

/** Görevi siler */
function delTask(id) {
  const d = loadTasks();
  const t = d.find(x => x.id === id);
  if (!t || (t.uid !== CU()?.id && !isAdmin())) { window.toast?.('Yetki yok', 'err'); return; }
  saveTasks(d.filter(x => x.id !== id));
  renderPusula();
  logActivity('task', `"${t.title}" görevini sildi`);
  window.toast?.('Silindi', 'ok');
}

/** Katılımcı / İzleyici listelerini doldurur (mutex) */
function populateTaskParticipants(task) {
  const users     = loadUsers().filter(u => u.status === 'active');
  const ownerUid  = parseInt(g('tk-user')?.value || '0') || task?.uid || 0;
  const others    = users.filter(u => u.id !== ownerUid);
  const existingP = task?.participants || [];
  const existingV = task?.viewers      || [];

  const partEl = g('tk-participants-list');
  const viewEl = g('tk-viewers-list');
  if (!partEl || !viewEl) return;

  partEl.innerHTML = others.map(u => `
    <label style="display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1px solid var(--b);transition:all .12s" onmouseenter="this.style.borderColor='var(--ac)'" onmouseleave="this.style.borderColor='var(--b)'">
      <input type="checkbox" id="tk-part-${u.id}" value="${u.id}" ${existingP.includes(u.id) ? 'checked' : ''} style="accent-color:var(--ac)">
      <span style="font-weight:500">${u.name}</span>
      <span style="font-size:10px;color:var(--t3);margin-left:auto">${u.role}</span>
    </label>`).join('');

  viewEl.innerHTML = others.map(u => `
    <label style="display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1px solid var(--b);transition:all .12s" onmouseenter="this.style.borderColor='#8B5CF6'" onmouseleave="this.style.borderColor='var(--b)'">
      <input type="checkbox" id="tk-view-${u.id}" value="${u.id}" ${existingV.includes(u.id) ? 'checked' : ''} style="accent-color:#8B5CF6">
      <span style="font-weight:500">${u.name}</span>
      <span style="font-size:10px;color:var(--t3);margin-left:auto">${u.role}</span>
    </label>`).join('');

  // Mutex: katılımcı seçilince izleyiciden çıkar ve tersi
  others.forEach(u => {
    const pCb = g('tk-part-' + u.id);
    const vCb = g('tk-view-' + u.id);
    if (pCb && vCb) {
      pCb.onchange = () => { if (pCb.checked && vCb.checked) vCb.checked = false; };
      vCb.onchange = () => { if (vCb.checked && pCb.checked) pCb.checked = false; };
    }
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
  mo.style.zIndex = '2100';

  const userOpts = users.map(u =>
    `<option value="${u.id}"${u.id === CU()?.id ? ' selected' : ''}>${u.name}</option>`
  ).join('');

  mo.innerHTML = `<div class="modal" style="max-width:420px">
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
      <div class="fr"><div class="fl">BİTİŞ</div><input type="date" class="fi" id="subadd-due"></div>
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

  parent.subTasks.push({
    id:        Date.now(),
    title,
    uid:       parseInt(g('subadd-user')?.value) || CU()?.id,
    pri:       parseInt(g('subadd-pri')?.value)  || 2,
    start:     g('subadd-start')?.value  || null,
    due:       g('subadd-due')?.value    || null,
    done:      false,
    createdAt: nowTs(),
  });

  saveTasks(d);
  g('mo-subadd')?.remove();
  renderPusula();
  window.toast?.('Alt görev eklendi ✓', 'ok');
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

/** Alt görevi siler */
function delSubTask(parentId, subId) {
  const d      = loadTasks();
  const parent = d.find(t => t.id === parentId);
  if (!parent) return;
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
  mo.style.zIndex = '2100';
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

  // Progress bar
  if (total > 0) {
    const pbWrap = document.createElement('div');
    pbWrap.style.cssText = 'height:3px;background:var(--s2);border-radius:99px;margin:6px 8px 8px 32px;overflow:hidden';
    const pbFill = document.createElement('div');
    pbFill.style.cssText = `height:100%;width:${Math.round(done / total * 100)}%;background:var(--gr);border-radius:99px;transition:width .3s`;
    pbWrap.appendChild(pbFill);
    frag.appendChild(pbWrap);
  }

  subTasks.forEach(s => {
    const u      = users.find(x => x.id === s.uid) || { name: '?' };
    const od     = s.due && s.due < todayS && !s.done;
    const row    = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px 4px 32px;border-radius:5px;margin-bottom:2px;background:var(--s2)';
    row.innerHTML = `
      <input type="checkbox" ${s.done ? 'checked' : ''} onchange="Pusula.toggleSub(${parentId},${s.id},this.checked)" style="flex-shrink:0;accent-color:var(--ac)">
      <span style="flex:1;font-size:12px;${s.done ? 'text-decoration:line-through;opacity:.5' : ''}">${s.title}</span>
      <span style="font-size:10px;color:var(--t3)">${u.name.split(' ')[0]}</span>
      ${s.due ? `<span style="font-size:10px;color:${od ? 'var(--rd)' : 'var(--t3)'}">${s.due.slice(5)}</span>` : ''}
      <button onclick="Pusula.editSub(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✏️</button>
      <button onclick="Pusula.delSub(${parentId},${s.id})" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3);padding:1px 3px">✕</button>`;
    frag.appendChild(row);
  });

  // "Alt Görev Ekle" butonu
  const addBtn = document.createElement('button');
  addBtn.style.cssText = 'font-size:11px;color:var(--ac);background:none;border:1px dashed var(--bm);border-radius:5px;cursor:pointer;padding:3px 10px;margin:3px 8px 0 32px;width:calc(100% - 40px)';
  addBtn.textContent = '+ Alt Görev Ekle';
  addBtn.addEventListener('click', () => addSubTask(parentId));
  frag.appendChild(addBtn);

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
    const cu   = CU();
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
    const msg = { id: Date.now(), uid: CU()?.id, name: CU()?.name, text, ts: nowTs() };
    if (fd) msg.file = fd;
    chats[taskId].push(msg);
    storeTaskChats(chats);
    if (g('taskchat-input'))  g('taskchat-input').value  = '';
    if (fileEl)               fileEl.value = '';
    if (g('chat-fp'))         g('chat-fp').textContent   = '';
    renderTaskChatMsgs(taskId);
    // Görev sahibine bildirim
    const task = loadTasks().find(t => t.id === taskId);
    if (task && task.uid !== CU()?.id) {
      window.addNotif?.('💬', `"${task.title}" görevinde yeni mesaj`, 'info', 'pusula');
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

function exportTasksXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const rows  = visTasks().map(t => {
    const u = users.find(x => x.id === t.uid) || { name: '?' };
    return {
      Personel:    u.name,
      Görev:       t.title,
      Açıklama:    t.desc || '',
      Öncelik:     { 1:'Kritik', 2:'Önemli', 3:'Normal', 4:'Düşük' }[t.pri] || '?',
      'Son Tarih': t.due  || '—',
      Durum:       t.done ? 'Tamamlandı' : (t.status || 'Yapılacak'),
      Etiketler:   (t.tags || []).join(', '),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Görevler');
  XLSX.writeFile(wb, `Gorevler_${nowTs().slice(0, 10)}.xlsx`);
  logActivity('task', 'Görev listesini Excel olarak indirdi');
  window.toast?.('Excel ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 12 — INIT
// ════════════════════════════════════════════════════════════════

function _pusInit() {
  // Kaydedilmiş görünüm modunu uygula
  PUS_VIEW = localStorage.getItem('ak_pus_view') || 'list';
  const vBtn = g('pus-v-' + PUS_VIEW);
  if (vBtn) vBtn.classList.add('on', 'active');
}

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
    if(!forMe&&!isAdmin())return;
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
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">🎪</div>
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
  if(id){const e=loadEtkinlik().find(x=>x.id===id);if(!e)return;g('etk-name').value=e.name;g('etk-type-inp').value=e.type;g('etk-sektor-inp').value=e.sektor;g('etk-city').value=e.city;g('etk-date').value=e.date;g('etk-end').value=e.end||'';g('etk-venue').value=e.venue||'';g('etk-url').value=e.url||'';g('etk-desc').value=e.desc||'';g('etk-status').value=e.status;g('etk-eid').value=id;st('mo-etk-t','✏️ Etkinlik Düzenle');}
  else{['etk-name','etk-city','etk-venue','etk-url','etk-desc'].forEach(i=>g(i).value='');g('etk-status').value='ilgi';g('etk-eid').value='';st('mo-etk-t','+ Etkinlik Ekle');}
  openMo('mo-etkinlik');
}

function saveEtkinlik(){
  const name=g('etk-name').value.trim();if(!name){toast('Etkinlik adı zorunludur','err');return;}
  const d=loadEtkinlik();const eid=parseInt(g('etk-eid').value||'0');
  const entry={name,type:g('etk-type-inp').value,sektor:g('etk-sektor-inp').value,city:g('etk-city').value,date:g('etk-date').value,end:g('etk-end').value,venue:g('etk-venue').value,url:g('etk-url').value,desc:g('etk-desc').value,status:g('etk-status').value};
  if(eid){const e=d.find(x=>x.id===eid);if(e)Object.assign(e,entry);}else d.push({id:Date.now(),...entry});
  storeEtkinlik(d);closeMo('mo-etkinlik');renderEtkinlik();logActivity('view',`"${name}" etkinliği kaydedildi`);toast(name+' kaydedildi ✓','ok');
}

function delEtkinlik(id){if(!isAdmin())return;storeEtkinlik(loadEtkinlik().filter(x=>x.id!==id));renderEtkinlik();}


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
  // Chat
  openChat:     openTaskChat,
  renderChat:   renderTaskChatMsgs,
  sendChat:     sendTaskChatMsg,
  // İç yardımcılar (gerektiğinde dışarıdan çağrılabilir)
  populateUsers:        populatePusUsers,
  populateParticipants: populateTaskParticipants,
  visTasks,
  getDueChip,
  getStatusPill,
  getAvatar,
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
  window.renderPusula = function(...args) {
  try {
    return renderPusula(...args);
  } catch(err) {
    console.error('[renderPusula]', err);
    const el = document.getElementById('pusula-list') ||
               document.querySelector('[id*="pusula"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.openAddTask           = openAddTask;
  window.editTask              = editTask;
  window.saveTask              = saveTask;
  window.delTask               = delTask;
  window.toggleTask            = toggleTask;
  window.openPusDetail         = openPusDetail;
  window.closePusDetail        = closePusDetail;
  window.quickUpdateTask       = quickUpdateTask;
  window.setPusView            = setPusView;
  window.setPusQuickFilter     = setPusQuickFilter;
  window.clearPusFilters       = clearPusFilters;
  window.updatePusBadge        = updatePusBadge;
  window.updateTkPriBar        = updateTkPriBar;
  window.exportTasksXlsx       = exportTasksXlsx;
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
  window.openTaskChat          = openTaskChat;
  window.renderTaskChatMsgs    = renderTaskChatMsgs;
  window.sendTaskChatMsg       = sendTaskChatMsg;
  window.getDueChip            = getDueChip;
  window.getStatusPill         = getStatusPill;
  window.getAvatar             = getAvatar;
}

// Node.js (test ortamı)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pusula;
}
