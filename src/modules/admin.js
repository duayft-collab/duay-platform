/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/admin.js
 * Admin Paneli — Kullanıcı Yönetimi + RBAC
 * Anayasa Kural 2: Admin Panel tam fonksiyonel
 * ═══════════════════════════════════════════════════════════════
 *
 * Özellikler:
 *   • Kullanıcı ekleme / düzenleme / silme
 *   • Kullanıcı askıya alma / aktifleştirme
 *   • Şifre sıfırlama (Firebase Auth + localStorage fallback)
 *   • Modüler RBAC yetki yönetimi (modül bazlı erişim kontrolü)
 *   • Her işlem Aktivite Logu'na kaydedilir
 */
(function(){
'use strict';

// Güvenli CU erişimi
function _getCU() {
  try {
    if (typeof window.Auth?.getCU === 'function') return window.Auth.getCU();
    if (typeof CU === 'function') return CU();
    if (CU && typeof CU === 'object') return CU;
  } catch(e) {}
  return null;
}

// isAdmin → window.isAdmin (auth.js)
// CU → window.CU (auth.js)
// loadUsers → window.loadUsers (database.js)
// toast → window.toast (app.js)
const logActivity= (...a) => window.logActivity?.(...a);
// openMo → window.openMo (app.js)

// ── V18 uyumluluk shim'leri ──────────────────────────────────────
const ROLE_META={
  admin:{label:'Admin',icon:'🔑',color:'#7C3AED',bg:'rgba(124,58,237,.1)',border:'rgba(124,58,237,.2)'},
  manager:{label:'Yönetici',icon:'👔',color:'#0369A1',bg:'rgba(3,105,161,.1)',border:'rgba(3,105,161,.2)'},
  lead:{label:'Takım Lideri',icon:'⭐',color:'#D97706',bg:'rgba(217,119,6,.1)',border:'rgba(217,119,6,.2)'},
  staff:{label:'Personel',icon:'👤',color:'#475569',bg:'rgba(71,85,105,.08)',border:'rgba(71,85,105,.15)'},
};
let USERS_VIEW='card'; // 'card' | 'table' | 'org'
let USERS_SORT = { col: '', dir: 1 }; // G7: sıralama state
let _usersSearchTimer = null; // G6: debounce timer
const initials = window.initials;

// G6: Debounce ile arama
function _debouncedSearch(val) {
  clearTimeout(_usersSearchTimer);
  _usersSearchTimer = setTimeout(() => renderUsers(val), 180);
}


// ── Sabitler ─────────────────────────────────────────────────────

// ── Yardımcılar ──────────────────────────────────────────────────

// ── Render: Split Layout ─────────────────────────────────────────
let _selectedUserId = null;

function renderAdmin() {
  if (!isAdmin()) {
    const cont = g('admin-list');
    if (cont) cont.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)">Bu panele erisim yetkiniz yok.</div>`;
    return;
  }
  checkInactiveUsers();
  checkPermExpiry();
  registerSession();

  const users  = loadUsers();
  const search = (g('admin-search')?.value || '').toLowerCase();
  const roleF  = g('admin-role-f')?.value  || '';
  const statF  = g('admin-status-f')?.value || '';

  let fl = users;
  if (search) fl = fl.filter(u => (u.name||'').toLowerCase().includes(search) || (u.email||'').toLowerCase().includes(search));
  if (roleF)  fl = fl.filter(u => u.role === roleF);
  if (statF)  fl = fl.filter(u => u.status === statF);

  // Istatistikler
  const _s = (id,v) => { const el = g(id); if(el) el.textContent = v; };
  _s('admin-total',     users.length);
  _s('admin-active',    users.filter(u => u.status === 'active').length);
  _s('admin-suspended', users.filter(u => u.status !== 'active').length);
  _s('admin-admins',    users.filter(u => u.role   === 'admin').length);

  const cont = g('admin-list');
  if (!cont) return;

  // Bos state
  if (!fl.length) {
    cont.innerHTML = `<div style="padding:48px 20px;text-align:center">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 12px">👥</div>
      <div style="font-size:14px;font-weight:600;color:var(--t);margin-bottom:4px">Kullanici bulunamadi</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:16px">${search ? 'Arama kriterlerini degistirin' : 'Ilk kullaniciyi ekleyin'}</div>
      <button class="btn btnp" onclick="Admin.openModal()" style="font-size:12px">+ Kullanici Ekle</button>
    </div>`;
    return;
  }

  // Sidebar liste
  const frag = document.createDocumentFragment();
  fl.forEach(u => frag.appendChild(_sidebarItem(u)));
  cont.replaceChildren(frag);

  // Ilk kullanici veya secili kullaniciyi goster
  if (!_selectedUserId || !fl.find(x => x.id === _selectedUserId)) {
    _selectedUserId = fl[0].id;
  }
  _renderDetail(_selectedUserId);
}

function _sidebarItem(u) {
  const rm = ROLE_META[u.role] || ROLE_META.staff;
  const av = initials(u.name);
  const isSelected = u.id === _selectedUserId;
  const daysSince = u.lastLogin ? Math.floor((Date.now() - new Date(u.lastLogin.replace(' ','T')).getTime()) / 86400000) : null;
  const online = daysSince !== null && daysSince < 1;

  const el = document.createElement('div');
  el.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-left:3px solid ${isSelected?'var(--ac)':'transparent'};background:${isSelected?'var(--al)':'transparent'};transition:all .1s`;
  el.onmouseenter = () => { if(!isSelected) el.style.background='var(--s2)'; };
  el.onmouseleave = () => { if(!isSelected) el.style.background=''; };
  el.onclick = () => { _selectedUserId = u.id; renderAdmin(); };

  el.innerHTML = `
    <div style="position:relative;flex-shrink:0">
      <div style="width:36px;height:36px;border-radius:10px;background:${rm.bg};border:1.5px solid ${rm.border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${rm.color}">${escapeHtml(av)}</div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;border:2px solid var(--sf);background:${online?'#22C55E':u.status==='active'?'#9CA3AF':'#EF4444'}"></div>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:${isSelected?'700':'500'};color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.name)}</div>
      <div style="font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.email||'—')}</div>
    </div>
    <span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${rm.bg};color:${rm.color};flex-shrink:0">${rm.label}</span>`;
  return el;
}

function _renderDetail(uid) {
  if (window._adminSaving) return;
  const cont = g('adm-detail');
  if (!cont) return;
  const users = loadUsers();
  const u = users.find(x => x.id === uid);
  if (!u) { cont.innerHTML = ''; return; }

  // Çakışma uyarısı — başka admin aynı kullanıcıyı düzenliyorsa
  var conflictHTML = '';
  if (window._editingUser && window._editingUser.uid === uid && window._editingUser.editorId !== _getCU()?.id) {
    var elapsed = Math.round((Date.now() - window._editingUser.ts) / 60000);
    if (elapsed < 5) {
      conflictHTML = '<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#D97706;font-weight:500">⚠️ Bu kullanıcı şu an <b>' + escapeHtml(window._editingUser.editorName) + '</b> tarafından düzenleniyor (' + elapsed + ' dk önce açıldı)</div>';
    }
  }
  // Bu admin bu kullanıcıyı görüntülüyor olarak işaretle
  window._editingUser = { uid: uid, editorId: _getCU()?.id, editorName: _getCU()?.name || '?', ts: Date.now() };

  const rm = ROLE_META[u.role] || ROLE_META.staff;
  const av = initials(u.name);
  const isSelf = u.id === _getCU()?.id;
  const moduleCount = (u.modules && u.role !== 'admin') ? u.modules.length : 'Tumu';
  const daysSince = u.lastLogin ? Math.floor((Date.now() - new Date(u.lastLogin.replace(' ','T')).getTime()) / 86400000) : null;
  const permLevel = u.permissions ? Object.values(u.permissions).filter(Boolean).length + ' ozel' : 'Varsayilan';

  cont.innerHTML = conflictHTML + `
    <!-- Profil Basligi -->
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;overflow:hidden;margin-bottom:16px">
      <div style="padding:24px;display:flex;align-items:center;gap:20px">
        <div style="width:72px;height:72px;border-radius:18px;background:${rm.bg};border:2px solid ${rm.border};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:${rm.color};flex-shrink:0">${escapeHtml(av)}</div>
        <div style="flex:1">
          <div style="font-size:20px;font-weight:700;color:var(--t);margin-bottom:4px">${escapeHtml(u.name)}</div>
          <div style="font-size:13px;color:var(--t2);margin-bottom:6px">${escapeHtml(u.email||'—')}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;padding:3px 10px;border-radius:6px;background:${rm.bg};color:${rm.color};border:1px solid ${rm.border};font-weight:600">${rm.icon} ${rm.label}</span>
            ${u.status==='active'
              ?'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(34,197,94,.08);color:#16A34A;font-weight:600">Aktif</span>'
              :'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(239,68,68,.08);color:#DC2626;font-weight:600">Pasif</span>'}
            ${u.autoLocked?'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(239,68,68,.05);color:#DC2626">Oto-kilitli</span>':''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btnp" onclick="window._openUserManageModal?.(${u.id})" style="font-size:12px">⚙️ Yönet</button>
        </div>
      </div>

      <!-- Bilgi Grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--b)">
        <div style="padding:14px;border-right:1px solid var(--b)">
          <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:4px">Departman</div>
          <div style="font-size:13px;color:var(--t);font-weight:500">${escapeHtml(u.dept||'Belirtilmedi')}</div>
        </div>
        <div style="padding:14px;border-right:1px solid var(--b)">
          <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:4px">Moduller</div>
          <div style="font-size:13px;color:var(--t);font-weight:500">${moduleCount}</div>
        </div>
        <div style="padding:14px;border-right:1px solid var(--b)">
          <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:4px">Son Giris</div>
          <div style="font-size:13px;color:${daysSince!==null&&daysSince>14?'var(--rdt)':'var(--t)'};font-weight:500">${u.lastLogin?u.lastLogin.slice(0,10):'Hic'}</div>
        </div>
        <div style="padding:14px">
          <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:4px">Yetki</div>
          <div style="font-size:13px;color:var(--t);font-weight:500">${permLevel}</div>
        </div>
      </div>
    </div>

    <!-- Hizli Aksiyonlar -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btns" onclick="Admin.showUserActivity(${u.id})" style="font-size:12px">Aktivite Gecmisi</button>
      <button class="btn btns" onclick="Admin.resetPassword(${u.id})" style="font-size:12px">Sifre Sifirla</button>
      <button class="btn btns" onclick="Admin.openNotifPrefs()" style="font-size:12px">Bildirim Tercihleri</button>
      ${u.status==='active'&&!isSelf?`<button class="btn btns" onclick="Admin.suspend(${u.id})" style="font-size:12px;color:#DC2626">Askiya Al</button>`:''}
      ${u.status!=='active'?`<button class="btn btns" onclick="Admin.activate(${u.id})" style="font-size:12px;color:#16A34A">Aktif Et</button>`:''}
      ${!isSelf?`<button class="btn btns" onclick="Admin.deleteUser(${u.id})" style="font-size:12px;color:#DC2626">Sil</button>`:''}
      <button class="btn btns" onclick="Admin.openAuditLog()" style="font-size:12px">Audit Log</button>
      <button class="btn btns" onclick="Admin.openDeptModal()" style="font-size:12px">Departmanlar</button>
      <button class="btn btns" onclick="Admin.openBulkRoleChange()" style="font-size:12px">Toplu Rol</button>
      ${!isSelf?'<button class="btn btns" onclick="Admin.startImpersonation('+u.id+')" style="font-size:12px">Goruntulenme</button>':''}
      <button class="btn btns" onclick="window.Auth?.openIpWhitelist?.()" style="font-size:12px">IP Kisitlama</button>
      ${!isSelf?`<button class="btn btns" onclick="window._cloneUserPerms(${u.id})" style="font-size:12px">📋 Yetki Klonla</button>`:''}
    </div>

    <!-- Yetki Skor Kartı -->
    ${(() => {
      const ts = _calcTrustScore(u);
      const tsColor = ts.score >= 70 ? '#22C55E' : ts.score >= 40 ? '#F59E0B' : '#EF4444';
      const tsLabel = ts.score >= 70 ? 'Güvenilir' : ts.score >= 40 ? 'Normal' : 'Dikkat';
      return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:14px 16px;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-size:13px;font-weight:600;color:var(--t)">🛡 Yetki Güven Skoru</span>' +
          '<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:700;background:' + tsColor + '22;color:' + tsColor + '">' + ts.score + '/100 · ' + tsLabel + '</span>' +
        '</div>' +
        '<div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:' + ts.score + '%;background:' + tsColor + ';border-radius:3px;transition:width .3s"></div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;color:var(--t3)">' +
          '<div>Onaylı işlem: <b style="color:var(--t)">' + ts.approvedOps + '</b></div>' +
          '<div>Giriş sıklığı: <b style="color:var(--t)">' + ts.loginFreq + '</b></div>' +
          '<div>Aşım denemesi: <b style="color:' + (ts.violations > 0 ? '#EF4444' : 'var(--t)') + '">' + ts.violations + '</b></div>' +
        '</div>' +
        (ts.score >= 80 && u.role === 'staff' ? '<div style="margin-top:8px;padding:6px 10px;background:rgba(34,197,94,.08);border-radius:6px;font-size:10px;color:#16A34A;font-weight:600">💡 Öneri: Bu kullanıcı yüksek güven skoruna sahip — rol yükseltme düşünülebilir</div>' : '') +
      '</div>';
    })()}

    <!-- Oturum Politikası -->
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t)">🔐 Oturum Politikası</span>
        ${!isSelf ? '<button class="btn btns" onclick="window._saveMaxSessions(' + u.id + ')" style="font-size:11px;padding:3px 10px">Kaydet</button>' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:12px;color:var(--t2)">Eş zamanlı oturum limiti:</span>
        <select id="adm-max-sessions-${u.id}" style="font-size:12px;padding:4px 8px;border:1px solid var(--b);border-radius:6px;background:var(--s);color:var(--t)" ${isSelf ? 'disabled' : ''}>
          <option value="0" ${(u.maxSessions||0)===0?'selected':''}>Sınırsız</option>
          <option value="1" ${u.maxSessions===1?'selected':''}>1 Oturum</option>
          <option value="2" ${u.maxSessions===2?'selected':''}>2 Oturum</option>
          <option value="3" ${u.maxSessions===3?'selected':''}>3 Oturum</option>
        </select>
      </div>
      ${(() => {
        var sessions = typeof window._getUserSessions === 'function' ? window._getUserSessions(u.id) : [];
        var currentSession = localStorage.getItem('ak_current_session') || '';
        return '<div style="font-size:11px;color:var(--t3);margin-bottom:6px">Aktif oturumlar: <b style="color:var(--t)">' + sessions.length + '</b></div>'
          + (sessions.length ? sessions.map(function(s) {
              var isCurrent = s.sessionId === currentSession;
              var ago = Math.round((Date.now() - s.ts) / 60000);
              var agoTxt = ago < 60 ? ago + ' dk önce' : Math.round(ago / 60) + ' saat önce';
              return '<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--s2);border-radius:6px;margin-bottom:3px;font-size:10px">'
                + '<span style="color:' + (isCurrent ? '#16A34A' : 'var(--t3)') + '">' + (isCurrent ? '🟢' : '⚪') + '</span>'
                + '<span style="flex:1;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s.device || '?').slice(0,40) + '</span>'
                + '<span style="color:var(--t3)">' + agoTxt + '</span>'
                + (!isCurrent ? '<button onclick="window._endSession?.(\'' + s.sessionId + '\');Admin.render()" style="background:none;border:none;cursor:pointer;font-size:10px;color:#DC2626;padding:1px 4px">✕</button>' : '<span style="font-size:9px;color:#16A34A">Bu cihaz</span>')
              + '</div>';
            }).join('') : '<div style="font-size:10px;color:var(--t3);padding:4px">Aktif oturum yok</div>');
      })()}
    </div>

    <!-- Rol Geçmişi Timeline -->
    ${(() => {
      const rh = u.roleHistory || [];
      if (!rh.length) return '';
      const usersAll = loadUsers();
      return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:14px 16px;margin-bottom:16px">' +
        '<div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:10px">🔄 Rol Geçmişi</div>' +
        '<div style="position:relative;padding-left:20px;border-left:2px solid var(--b)">' +
        rh.slice().reverse().map(function(r) {
          var changer = usersAll.find(function(x) { return x.id === r.changedBy; });
          var prevMeta = ROLE_META[r.previousRole] || ROLE_META.staff;
          var newMeta  = ROLE_META[r.role] || ROLE_META.staff;
          return '<div style="position:relative;margin-bottom:12px">' +
            '<div style="position:absolute;left:-25px;top:2px;width:10px;height:10px;border-radius:50%;background:var(--ac);border:2px solid var(--sf)"></div>' +
            '<div style="font-size:11px;font-weight:600;color:var(--t)">' +
              '<span style="padding:1px 6px;border-radius:4px;background:' + prevMeta.bg + ';color:' + prevMeta.color + '">' + prevMeta.label + '</span>' +
              ' → <span style="padding:1px 6px;border-radius:4px;background:' + newMeta.bg + ';color:' + newMeta.color + '">' + newMeta.label + '</span>' +
            '</div>' +
            '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + (r.changedAt || '—') + (changer ? ' · ' + escapeHtml(changer.name) : '') + '</div>' +
          '</div>';
        }).join('') +
        '</div></div>';
    })()}

    <!-- Performans Skoru -->
    ${(() => {
      const s = calcUserScore(u.id);
      const color = s.overall >= 80 ? '#22C55E' : s.overall >= 50 ? '#F59E0B' : '#EF4444';
      return `<div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:13px;font-weight:600;color:var(--t)">Performans Skoru</span>
          <span style="font-size:24px;font-weight:800;color:${color}">${s.overall}%</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div style="text-align:center;padding:8px;background:var(--s2);border-radius:8px">
            <div style="font-size:16px;font-weight:700;color:var(--t)">${s.taskRate}%</div>
            <div style="font-size:10px;color:var(--t3)">Gorev (${s.tasksDone}/${s.tasksTotal})</div>
          </div>
          <div style="text-align:center;padding:8px;background:var(--s2);border-radius:8px">
            <div style="font-size:16px;font-weight:700;color:var(--t)">${s.timeRate}%</div>
            <div style="font-size:10px;color:var(--t3)">Zamaninda</div>
          </div>
          <div style="text-align:center;padding:8px;background:var(--s2);border-radius:8px">
            <div style="font-size:16px;font-weight:700;color:var(--t)">${s.primTotal.toLocaleString('tr-TR')} TL</div>
            <div style="font-size:10px;color:var(--t3)">Toplam Prim</div>
          </div>
        </div>
      </div>`;
    })()}

    <!-- Yetki Sablonu Uygula -->
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t)">Hizli Yetki Sablonu</span>
        <button class="btn btns" onclick="window._openTempPerm(${u.id})" style="font-size:10px">Gecici Yetki</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.entries(PERM_TEMPLATES).map(([k,v]) => `<button class="btn btns" onclick="applyPermTemplate(${u.id},'${k}')" style="font-size:11px">${escapeHtml(v.label)}</button>`).join('')}
      </div>
    </div>

    <!-- Modul Erisim Dashboard -->
    <div style="background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:10px">Modul Erisimleri</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px">
        ${ALL_MODULES.filter(m=>m.id!=='dashboard'&&m.id!=='settings').map(m => {
          const hasAccess = u.role==='admin' || !u.modules || (u.modules||[]).includes(m.id);
          const expiry = u.permExpiry?.[m.id];
          return '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:'+(hasAccess?'rgba(34,197,94,.06)':'var(--s2)')+';border:1px solid '+(hasAccess?'rgba(34,197,94,.2)':'var(--b)')+'">'
            + '<div style="width:8px;height:8px;border-radius:50%;background:'+(hasAccess?'#22C55E':'#D1D5DB')+';flex-shrink:0"></div>'
            + '<span style="font-size:11px;color:'+(hasAccess?'var(--t)':'var(--t3)')+';flex:1">' + escapeHtml(m.label) + '</span>'
            + (expiry ? '<span style="font-size:9px;color:#F59E0B" title="Suresi: '+expiry+'">⏰</span>' : '')
            + '</div>';
        }).join('')}
      </div>
    </div>`;
}

// ── Modal: Kullanıcı Ekleme / Düzenleme ──────────────────────────
function openAdminModal(id) {
  if (!isAdmin()) return;

  // Modülleri temizle
  document.querySelectorAll('[id^="pm-"],[id^="pa-"]').forEach(cb => { if (cb.type==='checkbox') cb.checked = false; });

  if (id) {
    const u = loadUsers().find(x => x.id === id);
    if (!u) return;
    if (g('f-name'))    g('f-name').value    = u.name  || '';
    if (g('f-email'))   g('f-email').value   = u.email || '';
    if (g('f-role'))    g('f-role').value    = u.role  || 'staff';
    if (g('f-st'))      g('f-st').value      = u.status || 'active';
    if (g('f-pw'))      g('f-pw').value      = '';
    if (g('f-edit-id')) g('f-edit-id').value = id;
    if (g('mo-u-title')) g('mo-u-title').textContent = '✏️ Kullanıcı Düzenle';
    // Modül checkboxları
    const mods = u.modules || window.ROLE_DEFAULT_MODULES?.[u.role] || [];
    mods.forEach(m => { const cb = g('pm-' + m); if (cb) cb.checked = true; });
    // Döküman erişim checkboxları
    (u.access || []).forEach(a => {
      const map = { 'İK':'ik', 'Finans':'fn', 'Operasyon':'op', 'Teknik':'tk', 'Maaş':'ms', 'Sistem':'ss' };
      const cbId = 'pa-' + (map[a] || a.toLowerCase());
      const cb = g(cbId); if (cb) cb.checked = true;
    });
  } else {
    ['f-name','f-email','f-pw'].forEach(x => { const el = g(x); if (el) el.value = ''; });
    if (g('f-role'))    g('f-role').value    = 'staff';
    if (g('f-st'))      g('f-st').value      = 'active';
    if (g('f-edit-id')) g('f-edit-id').value = '';
    if (g('mo-u-title')) g('mo-u-title').textContent = '+ Yeni Kullanıcı';
  }
  window.openMo?.('mo-admin-user');
}

function saveAdminUser() {
  if (!isAdmin()) { window.toast?.(t('err.permission'), 'err'); return; }
  window._adminSaving = true;

  const name  = (g('f-name')?.value    || '').trim();
  const email = (g('f-email')?.value   || '').trim().toLowerCase();
  const role  = g('f-role')?.value     || 'staff';
  const status= g('f-st')?.value       || 'active';
  const pwd   = (g('f-pw')?.value      || '').trim();
  const eid   = parseInt(g('f-edit-id')?.value || '0');

  if (!name)  { window.toast?.('İsim zorunludur', 'err');    return; }
  if (!email) { window.toast?.('E-posta zorunludur', 'err'); return; }

  // Seçili modüller
  const modules = [];
  document.querySelectorAll('[id^="pm-"]').forEach(cb => { if (cb.checked) modules.push(cb.id.replace('pm-','')); });

  // Döküman erişim
  const accessMap = { 'ik':'İK', 'fn':'Finans', 'op':'Operasyon', 'tk':'Teknik', 'ms':'Maaş', 'ss':'Sistem' };
  const access = [];
  document.querySelectorAll('[id^="pa-"]').forEach(cb => { if (cb.checked) { const k=cb.id.replace('pa-',''); if(accessMap[k]) access.push(accessMap[k]); } });

  const users = loadUsers();
  const duplicate = users.find(u => u.email === email && u.id !== eid);
  if (duplicate) { window.toast?.('Bu e-posta zaten kayıtlı', 'err'); return; }

  if (eid) {
    // Mevcut kullanıcı güncelle
    const u = users.find(x => x.id === eid);
    if (!u) return;
    const oldRole = u.role;
    Object.assign(u, { name, email, role, status, modules: modules.length ? modules : null, access });
    if (pwd) u.pw = pwd;
    logActivity('user', `Kullanıcı güncellendi: "${name}" (${email})`);
    _auditLog('user_update', eid, 'Guncellendi: ' + name + (oldRole !== role ? ' (rol: ' + oldRole + ' → ' + role + ')' : ''));
    // Rol değiştiyse: bildirim + roleHistory kaydet
    if (oldRole !== role) {
      window.addNotif?.('🔑', 'Rolunuz degistirildi: ' + (ROLE_META[role]?.label || role), 'warn', 'admin', eid);
      if (!Array.isArray(u.roleHistory)) u.roleHistory = [];
      u.roleHistory.push({ previousRole: oldRole, role: role, changedBy: _getCU()?.id, changedAt: nowTs() });
    }
    window.toast?.(`${name} güncellendi ✓`, 'ok');
  } else {
    // Yeni kullanıcı ekle
    const newUser = {
      id:       generateNumericId(),
      name, email, role, status,
      modules:  modules.length ? modules : null,
      access,
      createdBy: _getCU()?.id,
      createdAt: nowTs(),
    };
    if (pwd) newUser.pw = pwd;
    users.push(newUser);
    logActivity('user', `Yeni kullanıcı oluşturuldu: "${name}" (${email})`);
    window.toast?.(`${name} eklendi ✓ — Firebase Console'dan şifre belirleyin`, 'ok');

    // G3/G11: announce.js ile otomatik duyuru (admin hariç sessiz bildirim)
    if (typeof window.Announce?.autoNotify === 'function') {
      window.Announce.autoNotify(`👤 Yeni ekip üyesi: ${name} (${ROLE_META[role]?.label || role})`);
    } else {
      // addNotif ile bildirim kuyruğuna ekle
      window.addNotif?.('👤', `Yeni ekip üyesi: ${name}`, 'user', null);
    }
  }

  saveUsers(users);
  window.closeMo?.('mo-admin-user');
  renderUsers();
  // 5s pencere — Firestore yavaşsa onSnapshot 3s sonra gelebilir
  setTimeout(function() { window._adminSaving = false; }, 5000);
}

/** Role göre modül checkboxlarını otomatik seç */
function autoSetRolePerms() {
  const role = g('f-role')?.value || 'staff';
  const defaults = window.ROLE_DEFAULT_MODULES?.[role] || [];
  document.querySelectorAll('[id^="pm-"]').forEach(cb => {
    cb.checked = defaults.includes(cb.id.replace('pm-',''));
  });
}

/** Tüm modül checkboxlarını aç/kapat */
function setAllPerms(checked) {
  document.querySelectorAll('[id^="pm-"],[id^="pa-"]').forEach(cb => { cb.checked = checked; });
}



// ── Askıya Alma / Aktifleştirme ───────────────────────────────────
function suspendUser(id) {
  if (!isAdmin()) return;
  if (id === _getCU()?.id) { window.toast?.('Kendinizi askıya alamazsınız', 'err'); return; }
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  const msg = window.t ? t('confirm.suspend', undefined, { name: u.name }) : `"${u.name}" askıya alınsın mı?`;
  window.confirmModal(msg, {
    title: 'Kullanıcı Askıya Al',
    danger: true,
    confirmText: 'Evet, Askıya Al',
    onConfirm: () => {
      u.status        = 'suspended';
      u.suspendedBy   = _getCU()?.id;
      u.suspendedAt   = nowTs();
      saveUsers(users);
      renderAdmin();
      logActivity('user', `Kullanıcı askıya alındı: "${u.name}"`);
      window.toast?.(`${u.name} askıya alındı`, 'ok');
    }
  });
}

function activateUser(id) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  u.status      = 'active';
  u.activatedBy = _getCU()?.id;
  u.activatedAt = nowTs();
  saveUsers(users);
  renderAdmin();
  logActivity('user', `Kullanıcı aktifleştirildi: "${u.name}"`);
  window.toast?.(`${u.name} aktifleştirildi ✓`, 'ok');
}

// ── Şifre Sıfırlama ───────────────────────────────────────────────
function resetPassword(id) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;

  const newPwd = prompt(`"${u.name}" için yeni şifre girin (en az 6 karakter):`);
  if (!newPwd) return;
  if (newPwd.length < 6) { window.toast?.('Şifre en az 6 karakter olmalıdır', 'err'); return; }

  u.password      = newPwd;
  u.pwdResetBy    = _getCU()?.id;
  u.pwdResetAt    = nowTs();
  saveUsers(users);
  logActivity('user', `Şifre sıfırlandı: "${u.name}"`);
  window.toast?.(`${u.name} şifresi sıfırlandı ✓`, 'ok');

  // Firebase Auth üzerinde de sıfırla (opsiyonel)
  const fbAuth = window.Auth?.getFBAuth?.();
  if (fbAuth && u.email) {
    fbAuth.sendPasswordResetEmail(u.email)
      .then(() => window.toast?.('Firebase şifre sıfırlama e-postası gönderildi ✓', 'ok'))
      .catch(e  => console.warn('[admin] Firebase pwd reset:', e.message));
  }
}

// ── Kullanıcı Silme ───────────────────────────────────────────────
function deleteUser(id) {
  if (!isAdmin()) return;
  if (id === _getCU()?.id) { window.toast?.('Kendinizi silemezsiniz', 'err'); return; }
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  const msg = window.t
    ? t('confirm.delete', undefined, { label: u.name })
    : `"${u.name}" silinecek. Emin misiniz?`;
  window.confirmModal(msg, {
    title: 'Kullanıcı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      // G10: Soft-delete — çöp kutusuna gönder
      const trash = JSON.parse(localStorage.getItem('ak_trash') || '[]');
      trash.unshift({ ...u, _trashType: 'user', _deletedAt: nowTs(), _deletedBy: _getCU()?.id });
      localStorage.setItem('ak_trash', JSON.stringify(trash));

      // Soft-delete: status inactive olarak işaretle
      u.status = 'inactive';
      u.deletedAt = nowTs();
      u.deletedBy = _getCU()?.id;
      u.isDeleted = true;
      saveUsers(users);

      // Firebase Auth'tan da sil (client-side: sadece mevcut kullanıcı kendini silebilir,
      // başkasını silmek Admin SDK gerektirir — burada status:inactive ile pasifleştiriyoruz)
      try {
        var fbAuth = window.Auth?.getFBAuth?.();
        if (fbAuth && u.email) {
          // Firebase client SDK'da başka kullanıcıyı silme imkanı yok
          // Ama sign-in methods'u kontrol edip log bırakabiliriz
          console.info('[Admin] Kullanıcı pasifleştirildi:', u.email, '— Firebase Auth silme Admin SDK gerektirir');
        }
      } catch(e) {}

      renderAdmin();
      logActivity('user', `Kullanıcı silindi: "${u.name}" (${u.email})`);
      window.toast?.(`${u.name} pasifleştirildi (çöp kutusundan geri alınabilir)`, 'ok');
    }
  });
}

// ── RBAC: Modül Yetki Modalı ──────────────────────────────────────
// Modül kategorileri
var _PERM_CATEGORIES = {
  genel:      { label: 'Genel',              icon: '📋', mods: ['dashboard','announce','pusula','takvim','notes','links','rehber'] },
  satinalma:  { label: 'Satın Alma',         icon: '🛒', mods: ['satinalma'] },
  finans:     { label: 'Finans & Muhasebe',  icon: '💰', mods: ['odemeler','pirim','hedefler'] },
  operasyon:  { label: 'Operasyon',          icon: '📦', mods: ['kargo','stok','numune','temizlik'] },
  ik:         { label: 'İnsan Kaynakları',   icon: '👥', mods: ['ik','izin','puantaj','evrak'] },
  satis:      { label: 'Satış & Müşteri',    icon: '📈', mods: ['crm','etkinlik'] },
  dokuman:    { label: 'Döküman & Bilgi',    icon: '📂', mods: ['arsiv','tebligat','resmi','kpi'] },
  yonetim:    { label: 'Yönetim',            icon: '⚙️', mods: ['settings','admin'] },
};

var _PERM_LEVELS = [
  { value: 'none',   label: '⛔', full: '⛔ Yok',     desc: 'Bu modülü göremez',             color: '#6B7280', bg: 'rgba(107,114,128,.08)' },
  { value: 'view',   label: '👁', full: '👁 Görür',    desc: 'Sadece okuyabilir',             color: '#3B82F6', bg: 'rgba(59,130,246,.08)' },
  { value: 'edit',   label: '✏️', full: '✏️ Yönetir',  desc: 'Ekleyip güncelleyebilir',       color: '#D97706', bg: 'rgba(245,158,11,.08)' },
  { value: 'manage', label: '👑', full: '👑 Tam',      desc: 'Tüm işlemler, silme dahil',     color: '#16A34A', bg: 'rgba(34,197,94,.08)' },
];

var _PERM_PRESETS = {
  intern:   { label: '🎓 Stajyer',   level: 'view',   desc: 'Sadece görüntüleme' },
  staff:    { label: '👤 Personel',   level: 'view',   desc: 'Temel erişim' },
  expert:   { label: '⭐ Uzman',      level: 'edit',   desc: 'Düzenleme yetkisi' },
  manager:  { label: '👔 Yönetici',   level: 'manage', desc: 'Tam yetki' },
};

var MOD_ICONS = {
  dashboard:'📊', announce:'📢', pusula:'🎯', takvim:'📅', notes:'📝', links:'🔗', rehber:'🆘',
  satinalma:'🛒', odemeler:'💳', pirim:'⭐', hedefler:'🏆', kargo:'📦', stok:'📋', numune:'🧪', temizlik:'🧹',
  ik:'👥', izin:'🏖', puantaj:'⏱', evrak:'📄', crm:'📈', etkinlik:'🎪',
  arsiv:'🗄', tebligat:'📮', resmi:'📑', kpi:'📊', settings:'⚙️', admin:'🔐'
};

// Apple-style CSS inject (bir kez)
(function _injectPermCSS() {
  if (document.getElementById('perm-responsive-css')) return;
  var style = document.createElement('style');
  style.id = 'perm-responsive-css';
  style.textContent = ''
    + '.perm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}'
    + '@media(max-width:600px){.perm-grid{grid-template-columns:1fr}}'
    + '.perm-card{background:#FFFFFF;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #F0F0F0;border-radius:14px;padding:16px;transition:all .15s;min-width:180px}'
    + '.perm-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1)}'
    + '.perm-lvl-btn{border:1.5px solid #E5E5EA;border-radius:20px;padding:0;height:28px;font-size:10px;cursor:pointer;background:transparent;color:#8E8E93;font-family:inherit;transition:all .15s;flex:1;text-align:center;line-height:28px}'
    + '.perm-lvl-btn:hover{border-color:#C7C7CC;color:#636366}'
    + '.perm-lvl-btn.active{font-weight:600;border-color:transparent}'
    + '.perm-preset-btn{border:1.5px solid #E5E5EA;border-radius:12px;padding:12px;background:transparent;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:3px}'
    + '.perm-preset-btn:hover{border-color:#007AFF;background:rgba(0,122,255,.04);color:#007AFF}';
  document.head.appendChild(style);
})();

function openPermModal(id) {
  if (!isAdmin()) return;
  var u = loadUsers().find(function(x) { return x.id === id; });
  if (!u) return;

  var cont = g('perm-modules-cont');
  if (!cont) return;

  if (g('perm-uid'))    g('perm-uid').value    = id;
  if (g('perm-uname'))  g('perm-uname').textContent = u.name;

  var isUserAdmin = u.role === 'admin';
  var allowed     = u.modules;
  var perms       = u.permissions || {};
  var modMap      = {};
  ALL_MODULES.forEach(function(m) { modMap[m.id] = m; });

  // satinalma modülünü modMap'e ekle (ALL_MODULES'da yoksa)
  if (!modMap['satinalma']) modMap['satinalma'] = { id: 'satinalma', label: 'Satın Alma' };

  cont.innerHTML = ''
    // 12 Saat Kuralı — Apple minimal
    + '<div style="background:#F2F2F7;border-radius:14px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between">'
      + '<div><div style="font-size:14px;font-weight:600;color:#1C1C1E">⏰ 12 Saat Kuralı</div>'
        + '<div style="font-size:12px;color:#8E8E93;margin-top:3px">Kayıt oluşturulduktan 12 saat sonra güncelleme yönetici onayı gerektirir</div></div>'
      + '<label style="position:relative;width:51px;height:31px;flex-shrink:0">'
        + '<input type="checkbox" id="perm-rule12h" ' + (u.rule12h ? 'checked' : '') + ' ' + (isUserAdmin ? 'disabled' : '') + ' style="opacity:0;width:0;height:0" onchange="var s=this.parentElement;s.querySelector(\'._track\').style.background=this.checked?\'#34C759\':\'#E5E5EA\';s.querySelector(\'._thumb\').style.left=this.checked?\'22px\':\'2px\'">'
        + '<span class="_track" style="position:absolute;inset:0;background:' + (u.rule12h ? '#34C759' : '#E5E5EA') + ';border-radius:16px;cursor:pointer;transition:background .25s"></span>'
        + '<span class="_thumb" style="position:absolute;left:' + (u.rule12h ? '22px' : '2px') + ';top:2px;width:27px;height:27px;background:#fff;border-radius:50%;transition:left .25s;box-shadow:0 2px 4px rgba(0,0,0,.15)"></span>'
      + '</label>'
    + '</div>'

    + (isUserAdmin ? '<div style="background:#F2F2F7;border-radius:14px;padding:14px 18px;font-size:13px;color:#8E8E93;margin-bottom:24px">👑 Admin kullanıcılar tüm modüllere otomatik erişir.</div>' : '')

    // Legend — minimal, sadece ikon + kısa metin, border yok
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px">'
      + _PERM_LEVELS.map(function(l) {
          return '<div style="background:' + l.bg + ';border-radius:12px;padding:14px;text-align:center">'
            + '<div style="font-size:24px;margin-bottom:6px">' + l.label + '</div>'
            + '<div style="font-size:13px;font-weight:600;color:' + l.color + '">' + l.full.split(' ').slice(1).join(' ') + '</div>'
          + '</div>';
        }).join('')
    + '</div>'

    // Hızlı şablon butonları — outline, hover dolgu
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">'
      + Object.entries(_PERM_PRESETS).map(function(e) {
          return '<button class="perm-preset-btn" onclick="window._permApplyPreset(\'' + e[0] + '\')">'
            + '<span style="font-size:14px;font-weight:600;color:#1C1C1E">' + e[1].label + '</span>'
            + '<span style="font-size:11px;color:#8E8E93">' + e[1].desc + '</span>'
          + '</button>';
        }).join('')
    + '</div>'

    // Arama + Tümü toggle
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">'
      + '<input class="fi" id="perm-search" placeholder="Modül ara..." oninput="window._permFilterModules?.()" style="font-size:13px;padding:10px 14px;flex:1;max-width:320px;border-radius:10px;border:1px solid #E5E5EA;background:#F2F2F7">'
      + '<label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer;margin-left:auto;color:#1C1C1E">'
        + '<input type="checkbox" id="perm-all" ' + (!allowed ? 'checked' : '') + ' onchange="Admin._toggleAllPerms(this.checked)" style="accent-color:#007AFF;width:18px;height:18px">'
        + 'Tüm Modüller'
      + '</label>'
    + '</div>'

    // Kategorili kart grid — Apple nefes alan tasarım
    + Object.entries(_PERM_CATEGORIES).map(function(catEntry) {
        var catKey = catEntry[0];
        var cat    = catEntry[1];
        var catMods = cat.mods.filter(function(mid) { return modMap[mid]; });
        if (!catMods.length) return '';

        return '<div class="perm-cat-group" data-cat="' + catKey + '" style="margin-bottom:28px">'
          + '<div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-left:4px">' + cat.icon + '  ' + cat.label + '</div>'
          + '<div class="perm-grid">'
            + catMods.map(function(mid) {
                var m = modMap[mid];
                var curLevel = perms[mid] || 'view';
                var isChecked = isUserAdmin || !allowed || (allowed && allowed.includes(mid));
                var icon = MOD_ICONS[mid] || '📋';
                var activeLvl = _PERM_LEVELS.find(function(l) { return l.value === curLevel; }) || _PERM_LEVELS[1];

                return '<div class="perm-card" data-modid="' + mid + '" style="' + (isChecked ? 'border-color:' + activeLvl.color + '33' : '') + '">'
                  // Üst: checkbox + ikon + ad
                  + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
                    + '<input type="checkbox" class="perm-cb" value="' + mid + '" ' + (isChecked ? 'checked' : '') + ' ' + (isUserAdmin ? 'disabled' : '') + ' onchange="window._permCardToggle?.(this)" style="accent-color:#007AFF;width:18px;height:18px;flex-shrink:0">'
                    + '<span style="font-size:32px;line-height:1">' + icon + '</span>'
                    + '<span style="font-size:14px;font-weight:600;color:#1C1C1E">' + escapeHtml(m.label) + '</span>'
                  + '</div>'
                  // Alt: 4 pill buton
                  + '<div style="display:flex;gap:4px" data-mod="' + mid + '">'
                    + _PERM_LEVELS.map(function(l) {
                        var isActive = l.value === curLevel;
                        var activeStyle = isActive ? 'background:' + l.color + ';color:#fff;border-color:' + l.color : '';
                        return '<button class="perm-lvl-btn' + (isActive ? ' active' : '') + '" data-level="' + l.value + '" onclick="window._permSetLevel?.(this,\'' + mid + '\',\'' + l.value + '\')" style="' + activeStyle + '"' + (isUserAdmin ? ' disabled' : '') + ' title="' + l.desc + '">' + l.label + '</button>';
                      }).join('')
                  + '</div>'
                  // Gizli select
                  + '<select class="perm-level" data-mod="' + mid + '" style="display:none" ' + (isUserAdmin ? 'disabled' : '') + '>'
                    + _PERM_LEVELS.map(function(l) { return '<option value="' + l.value + '"' + (curLevel === l.value ? ' selected' : '') + '>' + l.full + '</option>'; }).join('')
                  + '</select>'
                + '</div>';
              }).join('')
          + '</div>'
        + '</div>';
      }).join('');

  window.openMo?.('mo-perm');
}

/**
 * Buton grubuyla seviye seçimi.
 */
window._permSetLevel = function(btn, modId, level) {
  // Aynı mod'un tüm butonlarını sıfırla
  var group = btn.parentElement;
  group.querySelectorAll('.perm-lvl-btn').forEach(function(b) {
    b.classList.remove('active');
    b.style.background = '';
    b.style.color = '';
    b.style.borderColor = '';
  });
  // Seçileni aktif yap
  var lvl = _PERM_LEVELS.find(function(l) { return l.value === level; });
  btn.classList.add('active');
  if (lvl) {
    btn.style.background  = lvl.color;
    btn.style.color       = '#fff';
    btn.style.borderColor = lvl.color;
  }
  // Gizli select'i güncelle (savePermissions uyumluluğu)
  var sel = btn.closest('.perm-card')?.querySelector('select.perm-level');
  if (sel) sel.value = level;
  // Checkbox'u güncelle
  var cb = btn.closest('.perm-card')?.querySelector('.perm-cb');
  if (cb && !cb.disabled) {
    cb.checked = level !== 'none';
    window._permCardToggle?.(cb);
  }
  // Kart border rengini güncelle
  var card = btn.closest('.perm-card');
  if (card && lvl && cb?.checked) {
    card.style.borderColor = lvl.color + '44';
  }
};

/**
 * Hızlı paket uygula.
 */
window._permApplyPreset = function(presetKey) {
  var preset = _PERM_PRESETS[presetKey];
  if (!preset) return;
  document.querySelectorAll('.perm-card').forEach(function(card) {
    var cb = card.querySelector('.perm-cb');
    if (cb && !cb.disabled) {
      cb.checked = preset.level !== 'none';
      window._permCardToggle?.(cb);
    }
    // Buton grubunu güncelle
    var targetBtn = card.querySelector('.perm-lvl-btn[data-level="' + preset.level + '"]');
    if (targetBtn && !targetBtn.disabled) {
      window._permSetLevel?.(targetBtn, card.dataset.modid, preset.level);
    }
  });
  window.toast?.('Şablon uygulandı: ' + preset.label, 'ok');
};

/**
 * Kart checkbox toggle — görsel güncelle.
 */
window._permCardToggle = function(cb) {
  var card = cb.closest('.perm-card');
  if (!card) return;
  if (cb.checked) {
    var activeLvl = card.querySelector('.perm-lvl-btn.active');
    var level = activeLvl?.dataset?.level || 'view';
    var lvl = _PERM_LEVELS.find(function(l) { return l.value === level; });
    card.style.borderColor = lvl ? lvl.color + '33' : '#F0F0F0';
  } else {
    card.style.borderColor = '#F0F0F0';
    var noneBtn = card.querySelector('.perm-lvl-btn[data-level="none"]');
    if (noneBtn) window._permSetLevel?.(noneBtn, card.dataset.modid, 'none');
  }
};

/**
 * Modül arama filtresi.
 */
window._permFilterModules = function() {
  var q = (document.getElementById('perm-search')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.perm-card').forEach(function(card) {
    var labelEl = card.querySelectorAll('span');
    var label = '';
    labelEl.forEach(function(s) { label += ' ' + (s.textContent || ''); });
    label = label.toLowerCase();
    var modId = card.dataset.modid || '';
    card.style.display = (!q || label.includes(q) || modId.includes(q)) ? '' : 'none';
  });
  document.querySelectorAll('.perm-cat-group').forEach(function(grp) {
    var hidden = grp.querySelectorAll('.perm-card[style*="display: none"]').length;
    var total  = grp.querySelectorAll('.perm-card').length;
    grp.style.display = (hidden === total && q) ? 'none' : '';
  });
};

function _toggleAllPerms(checked) {
  document.querySelectorAll('.perm-cb:not(:disabled)').forEach(function(cb) {
    cb.checked = checked;
    window._permCardToggle?.(cb);
  });
}

function savePermissions() {
  if (!isAdmin()) return;
  const uid     = parseInt(g('perm-uid')?.value || '0');
  const users   = loadUsers();
  const u       = users.find(x => x.id === uid);
  if (!u) return;

  // Yeni yetki değerlerini topla
  var _newModules;
  const allChecked = g('perm-all')?.checked;
  if (allChecked) {
    _newModules = null; // tümü
  } else {
    _newModules = [...document.querySelectorAll('.perm-cb:checked')].map(cb => cb.value);
  }
  const _newPermissions = {};
  document.querySelectorAll('.perm-level').forEach(sel => {
    const mod = sel.dataset.mod;
    const val = sel.value;
    if (mod && val) _newPermissions[mod] = val;
  });
  var _newRule12h = !!g('perm-rule12h')?.checked;

  // Değişiklik var mı kontrol et
  var oldPerms = JSON.stringify(u.permissions || {});
  var oldModules = JSON.stringify(u.modules);
  var newPerms = JSON.stringify(_newPermissions);
  var newModulesStr = JSON.stringify(_newModules);
  var hasChange = oldPerms !== newPerms || oldModules !== newModulesStr || u.rule12h !== _newRule12h;

  // Onay modalı — değişiklik varsa sor
  if (hasChange && !window._permConfirmed) {
    var _changeDesc = [];
    if (oldModules !== newModulesStr) _changeDesc.push('modül erişimi');
    if (oldPerms !== newPerms) _changeDesc.push('yetki seviyeleri');
    if (u.rule12h !== _newRule12h) _changeDesc.push('12 saat kuralı');

    var _confirmEl = document.getElementById('perm-confirm-modal');
    if (_confirmEl) _confirmEl.remove();
    _confirmEl = document.createElement('div');
    _confirmEl.id = 'perm-confirm-modal';
    _confirmEl.className = 'mo';
    _confirmEl.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
      + '<div style="padding:20px 24px;text-align:center">'
        + '<div style="font-size:40px;margin-bottom:12px">🔐</div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--t);margin-bottom:8px">Yetki Değişikliği Onayı</div>'
        + '<div style="font-size:13px;color:var(--t2);line-height:1.5">'
          + '<b>' + escapeHtml(u.name) + '</b> kullanıcısının '
          + '<b>' + _changeDesc.join(', ') + '</b> değiştiriliyor.'
        + '</div>'
      + '</div>'
      + '<div style="padding:12px 24px 20px;display:flex;gap:8px;justify-content:center">'
        + '<button class="btn btns" onclick="document.getElementById(\'perm-confirm-modal\')?.remove()" style="padding:10px 24px;border-radius:10px;font-size:13px">İptal</button>'
        + '<button class="btn btnp" onclick="window._permConfirmed=true;savePermissions();document.getElementById(\'perm-confirm-modal\')?.remove()" style="padding:10px 24px;border-radius:10px;font-size:13px;background:#dc2626">Onayla</button>'
      + '</div>'
    + '</div>';
    document.body.appendChild(_confirmEl);
    setTimeout(function() { _confirmEl.classList.add('open'); }, 10);
    _confirmEl.addEventListener('click', function(e) { if (e.target === _confirmEl) _confirmEl.remove(); });
    return;
  }
  window._permConfirmed = false;

  // Yetkileri uygula
  u.modules = _newModules;
  u.permissions = _newPermissions;
  u.rule12h = _newRule12h;

  // Değişiklik logunu kaydet
  if (hasChange) {
    if (!Array.isArray(u.permissionLog)) u.permissionLog = [];
    u.permissionLog.push({
      ts: nowTs(),
      changedBy: _getCU()?.id,
      changedByName: _getCU()?.name || '',
      oldModules: JSON.parse(oldModules),
      newModules: u.modules,
      oldPermissions: JSON.parse(oldPerms),
      newPermissions: _newPermissions,
    });
    // Admin'e bildirim (kendi değişikliği değilse)
    if (_getCU()?.id !== u.id) {
      window.addNotif?.('🔐', 'Yetki güncellendi: ' + u.name, 'info', 'admin', u.id);
    }
  }

  saveUsers(users);
  window.closeMo?.('mo-perm');
  renderAdmin();
  logActivity('user', 'Yetki seviyeleri güncellendi: "' + u.name + '" (12h kuralı: ' + (u.rule12h ? 'aktif' : 'kapalı') + ')');
  window.toast?.(u.name + ' yetkileri güncellendi ✓', 'ok');
}

// ── Aktivite Log Render ───────────────────────────────────────────
function renderActivityLog() {
  const cont = g('activity-log-list');
  if (!cont) return;
  if (!isAdmin()) {
    cont.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t2)">${t('err.permission')}</div>`;
    return;
  }

  const log    = loadAct();
  const users  = loadUsers();
  const search = (g('log-search')?.value || '').toLowerCase();
  const typeF  = g('log-type-f')?.value  || '';

  let fl = log;
  if (search) fl = fl.filter(l =>
    (l.message || '').toLowerCase().includes(search) ||
    (l.uname   || '').toLowerCase().includes(search)
  );
  if (typeF) fl = fl.filter(l => l.type === typeF);

  st('log-total', log.length);

  if (!fl.length) {
    cont.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t2)">
      ${window.t ? t('log.empty') : 'Log kaydı yok.'}</div>`;
    return;
  }

  const typeIcons = { user: '👤', kargo: '📦', view: '👁', system: '⚙️', login: '🟢', logout: '🔴' };

  cont.innerHTML = `<table class="tbl"><thead><tr>
    <th>${window.t ? t('log.col.user')   : 'Kullanıcı'}</th>
    <th>${window.t ? t('log.col.action') : 'İşlem'}</th>
    <th>${window.t ? t('log.col.ts')     : 'Tarih & Saat'}</th>
    <th>${window.t ? t('log.col.module') : 'Tür'}</th>
  </tr></thead><tbody>
  ${fl.slice(0, 200).map(l => {
    const u = users.find(x => x.id === l.uid) || { name: l.uname || 'Sistem' };
    const icon = typeIcons[l.type] || '•';
    return `<tr>
      <td style="font-weight:500">${u.name}</td>
      <td style="font-size:12px">${l.message || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${l.ts || '—'}</td>
      <td><span style="font-size:14px">${icon}</span></td>
    </tr>`;
  }).join('')}
  </tbody></table>
  ${fl.length > 200
    ? `<div style="padding:10px 16px;font-size:11px;color:var(--t3)">Son 200 kayıt gösteriliyor (toplam: ${fl.length})</div>`
    : ''
  }`;
}

// ── Öneri Kutusu ─────────────────────────────────────────────────
function renderSuggestions() {
  const cont = g('suggestions-list');
  if (!cont) return;

  const suggs = loadSugg();
  const cu    = CU();

  // Admin hepsini görür; kullanıcı yalnızca kendi önerilerini
  const visible = isAdmin() ? suggs : suggs.filter(s => s.uid === cu?.id);

  if (!visible.length) {
    cont.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t2)">
      <div style="font-size:28px;margin-bottom:8px">💡</div>Henüz öneri yok.</div>`;
    return;
  }

  const users = loadUsers();
  const STATUS = {
    pending:    { l: '⏳ Bekliyor',  c: 'ba' },
    reviewing:  { l: '🔍 İnceleniyor', c: 'bb' },
    accepted:   { l: '✅ Kabul Edildi', c: 'bg' },
    rejected:   { l: '❌ Reddedildi',  c: 'br' },
  };

  cont.innerHTML = visible.map(s => {
    const u  = users.find(x => x.id === s.uid) || { name: s.uname || '?' };
    const st = STATUS[s.status] || STATUS.pending;
    return `<div class="ai" style="border-radius:var(--rs);margin-bottom:8px;background:var(--sf);border:1px solid var(--b)">
      <div class="adot" style="background:var(--ac);margin-top:6px"></div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:4px">
          <span style="font-weight:600;font-size:13px">${u.name}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${st.c}">${st.l}</span>
            ${isAdmin() ? `
              <select class="si" style="font-size:11px;padding:2px 6px" onchange="Admin.updateSuggStatus(${s.id}, this.value)">
                ${Object.entries(STATUS).map(([k, v]) =>
                  `<option value="${k}" ${s.status === k ? 'selected' : ''}>${v.l}</option>`
                ).join('')}
              </select>
              <button class="btn btns btnd" onclick="Admin.deleteSugg(${s.id})">🗑</button>` : ''}
          </div>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--t)">${s.text}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:4px;font-family:'DM Mono',monospace">${s.ts}</div>
      </div>
    </div>`;
  }).join('');
}

function submitSuggestion() {
  const cu  = CU();
  if (!cu) { window.toast?.(t('err.permission'), 'err'); return; }
  const el  = g('suggest-input');
  const text = (el?.value || '').trim();
  if (!text) { window.toast?.(t('err.required'), 'err'); return; }

  const suggs = loadSugg();
  suggs.unshift({
    id:     generateNumericId(),
    uid:    cu.id,
    uname:  cu.name,
    text,
    status: 'pending',
    ts:     nowTs(),
  });
  storeSugg(suggs);
  if (el) el.value = '';
  renderSuggestions();
  logActivity('view', `Yeni öneri gönderildi: "${text.slice(0, 40)}…"`);
  window.toast?.(window.t ? t('suggest.sent') : 'Öneriniz iletildi, teşekkürler! ✓', 'ok');
}

function updateSuggStatus(id, status) {
  if (!isAdmin()) return;
  const suggs = loadSugg();
  const s     = suggs.find(x => x.id === id);
  if (!s) return;
  s.status     = status;
  s.reviewedBy = _getCU()?.id;
  s.reviewedAt = nowTs();
  storeSugg(suggs);
  renderSuggestions();
}

function deleteSugg(id) {
  if (!isAdmin()) return;
  storeSugg(loadSugg().filter(x => x.id !== id));
  renderSuggestions();
}

// ── Güncelleme Duyurusu Banner (24 saat) ─────────────────────────
/**
 * Admin bir panel için güncelleme duyurusu girer.
 * 24 saat sonra otomatik sona erer.
 * @param {string} panelId  'kargo' | 'pirim' | ...
 * @param {string} msg      Kısa güncelleme metni
 * @param {string} ver      Versiyon kodu (örn: '7.6.1')
 */
function addUpdateBanner(panelId, msg, ver) {
  if (!isAdmin()) return;
  const banners = JSON.parse((window.DB?._read?.('ak_panel_updates') ?? localStorage.getItem('ak_panel_updates')) || '{}');
  banners[panelId] = {
    msg,
    ver,
    ts:      nowTs(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 saat
    addedBy:   _getCU()?.id,
  };
  localStorage.setItem('ak_panel_updates', JSON.stringify(banners));
  showPanelUpdateBanner(panelId);
  logActivity('view', `Güncelleme duyurusu eklendi: [${panelId}] ${msg}`);
  window.toast?.('Güncelleme duyurusu eklendi ✓', 'ok');
}

function showPanelUpdateBanner(panelId) {
  try {
    const banners = JSON.parse((window.DB?._read?.('ak_panel_updates') ?? localStorage.getItem('ak_panel_updates')) || '{}');
    const update  = banners[panelId];
    if (!update) return;

    // 24 saat doldu mu?
    if (Date.now() > update.expiresAt) {
      delete banners[panelId];
      localStorage.setItem('ak_panel_updates', JSON.stringify(banners));
      return;
    }

    const panel = g('panel-' + panelId);
    if (!panel) return;

    // Zaten var mı?
    const existing = panel.querySelector('.update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.style.cssText = 'background:var(--blb);border:1px solid var(--bl);border-radius:var(--rs);padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;animation:fadeIn .3s';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🆕</span>
        <span style="font-size:13px;color:var(--blt)">${update.msg}</span>
        <span style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace">${update.ver}</span>
      </div>
      <button onclick="this.parentElement.remove()"
        style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:18px;padding:0 4px">×</button>`;

    const ph = panel.querySelector('.ph');
    if (ph?.nextSibling) ph.parentNode.insertBefore(banner, ph.nextSibling);
    else panel.prepend(banner);
  } catch (e) { /* ignore */ }
}

// Tüm aktif bannerleri göster (panel geçişlerinde çağrılır)
function showAllUpdateBanners() {
  try {
    const banners = JSON.parse((window.DB?._read?.('ak_panel_updates') ?? localStorage.getItem('ak_panel_updates')) || '{}');
    Object.keys(banners).forEach(showPanelUpdateBanner);
  } catch (e) { /* ignore */ }
}

// ── Dışa Aktarım ─────────────────────────────────────────────────

// ── T2: YETKİ MATRİSİ ────────────────────────────────────────────
function _renderMatrix(users) {
  const grid = g('u-grid'); if (!grid) return;

  // Gösterilecek modüller (en önemli 10)
  const COLS = [
    {id:'finans',   label:'Finans'},
    {id:'lojistik', label:'Lojistik'},
    {id:'crm',      label:'CRM'},
    {id:'ik',       label:'İK'},
    {id:'pirim',    label:'Pirim'},
    {id:'pusula',   label:'Görevler'},
    {id:'kargo',    label:'Kargo'},
    {id:'docs',     label:'Döküman'},
    {id:'odemeler', label:'Ödemeler'},
    {id:'ceo',      label:'CEO'},
  ];

  let changed = {}; // {uid: {modId: bool}} — değişiklikleri takip et

  function _hasMod(u, modId) {
    if (u.role === 'admin') return true;
    if (!u.modules) return true; // tümü
    return u.modules.includes(modId);
  }

  function _toggleMx(uid, modId, el) {
    if (!changed[uid]) changed[uid] = {};
    const cur = el.classList.contains('on');
    el.classList.toggle('on', !cur);
    el.textContent = !cur ? '✓' : '';
    changed[uid][modId] = !cur;
    const saveBtn = document.getElementById('mx-save-btn');
    if (saveBtn) saveBtn.disabled = Object.keys(changed).length === 0;
    const chCount = document.getElementById('mx-change-count');
    const total = Object.values(changed).reduce((a,o)=>a+Object.keys(o).length,0);
    if (chCount) chCount.textContent = total ? total + ' değişiklik bekliyor' : '';
  }

  function _saveMx() {
    const allUsers = loadUsers();
    Object.entries(changed).forEach(([uid, mods]) => {
      const u = allUsers.find(x => x.id === parseInt(uid));
      if (!u || u.role === 'admin') return;
      if (!u.modules) u.modules = COLS.map(c => c.id); // tümü → listeye al
      Object.entries(mods).forEach(([modId, val]) => {
        if (val && !u.modules.includes(modId)) u.modules.push(modId);
        if (!val) u.modules = u.modules.filter(m => m !== modId);
      });
      if (u.modules.length === COLS.length) u.modules = null; // tümü
    });
    saveUsers(allUsers);
    changed = {};
    logActivity('user', 'Yetki matrisi güncellendi');
    window.toast?.('Yetki matrisi kaydedildi ✓', 'ok');
    renderUsers();
  }

  window._toggleMx = _toggleMx;
  window._saveMx   = _saveMx;

  grid.innerHTML = `
    <div class="perm-matrix-wrap">
      <table class="perm-matrix">
        <thead>
          <tr>
            <th class="u-col">Kullanıcı</th>
            ${COLS.map(c=>`<th title="${c.id}">${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${users.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.staff;
            const isAdm = u.role === 'admin';
            return `<tr>
              <td class="u-col">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:8px;background:${AV_COLORS[users.indexOf(u)%AV_COLORS.length]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${initials(u.name)}</div>
                  <div>
                    <div style="font-size:12px;font-weight:600">${u.name}</div>
                    <div style="font-size:10px;color:var(--t3)">${rm.icon} ${rm.label}</div>
                  </div>
                </div>
              </td>
              ${COLS.map(c => {
                const has = _hasMod(u, c.id);
                return `<td>
                  <span class="mx-cb ${has?'on':''}"
                    onclick="${isAdm?'':"_toggleMx("+u.id+",'"+c.id+"',this)"}"
                    title="${isAdm?'Admin — tüm erişim':''}"
                    style="${isAdm?'opacity:.4;cursor:default':''}"
                  >${has?'✓':''}</span>
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="mx-save-row">
        <span id="mx-change-count" style="color:var(--ac);font-weight:600"></span>
        <button id="mx-save-btn" class="btn btnp" onclick="_saveMx()" style="font-size:12px;padding:6px 16px">Değişiklikleri Kaydet</button>
      </div>
    </div>`;
}

// G4: Kullanıcıları Excel'e aktar
function exportUsersXlsx() {
  if (!isAdmin()) return;
  const users = loadUsers();
  const rows = [['Ad Soyad','E-posta','Rol','Durum','Modül Sayısı','Son Giriş','Oluşturma']];
  users.forEach(u => rows.push([
    u.name, u.email||'',
    ROLE_META[u.role]?.label||u.role||'',
    u.status==='active'?'Aktif':'Pasif',
    u.modules?.length||'Tümü',
    u.lastLogin||'—',
    u.createdAt||'—',
  ]));
  // CSV fallback (SheetJS yoksa)
  if (typeof window.XLSX !== 'undefined') {
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
    window.XLSX.writeFile(wb, `kullaniciler_${nowTs().slice(0,10)}.xlsx`);
  } else {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `kullaniciler_${nowTs().slice(0,10)}.csv`;
    a.click();
  }
  logActivity('view','Kullanıcı listesi dışa aktarıldı');
  window.toast?.('Kullanıcı listesi indirildi ✓','ok');
}

// G5: Bulk actions
function _onBulkCb() {
  const cbs = document.querySelectorAll('.u-bulk-cb:checked');
  const bar = document.getElementById('u-bulk-bar');
  const countEl = document.getElementById('u-bulk-count');
  if (bar) bar.style.display = cbs.length ? 'flex' : 'none';
  if (countEl) countEl.textContent = cbs.length + ' seçili';
}
function _bulkSelectAll(checked) {
  document.querySelectorAll('.u-bulk-cb').forEach(cb => { cb.checked = checked; });
  _onBulkCb();
}
function _clearBulk() {
  document.querySelectorAll('.u-bulk-cb').forEach(cb => { cb.checked = false; });
  const saEl = document.getElementById('u-select-all'); if(saEl) saEl.checked = false;
  const bar = document.getElementById('u-bulk-bar'); if(bar) bar.style.display='none';
}
function _getSelectedIds() {
  return [...document.querySelectorAll('.u-bulk-cb:checked')].map(cb => parseInt(cb.dataset.uid));
}
function _bulkToggle(newStatus) {
  const ids = _getSelectedIds();
  if (!ids.length) return;
  const label = newStatus==='suspended'?'askıya alındı':'aktifleştirildi';
  window.confirmModal(`${ids.length} kullanıcı ${label} olarak işaretlensin mi?`, {
    title: 'Toplu Durum Güncelle',
    danger: newStatus==='suspended',
    confirmText: 'Evet, Uygula',
    onConfirm: () => {
      const users = loadUsers();
      ids.forEach(id => {
        const u = users.find(x=>x.id===id);
        if (u) { u.status=newStatus; }
      });
      saveUsers(users);
      logActivity('user', `Toplu durum güncelleme: ${ids.length} kullanıcı → ${newStatus}`);
      window.toast?.(`${ids.length} kullanıcı ${label} ✓`, 'ok');
      _clearBulk(); renderUsers();
    }
  });
}
function _bulkDelete() {
  const ids = _getSelectedIds();
  if (!ids.length) return;
  window.confirmModal(`${ids.length} kullanıcı silinecek. Emin misiniz?`, {
    title: 'Toplu Kullanıcı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      const users = loadUsers();
      const trash = JSON.parse(localStorage.getItem('ak_trash')||'[]');
      ids.forEach(id => {
        const u = users.find(x=>x.id===id);
        if (u) trash.unshift({...u,_trashType:'user',_deletedAt:nowTs(),_deletedBy:_getCU()?.id});
      });
      localStorage.setItem('ak_trash', JSON.stringify(trash));
      saveUsers(users.filter(u => !ids.includes(u.id)));
      logActivity('user', `Toplu silme: ${ids.length} kullanıcı`);
      window.toast?.(`${ids.length} kullanıcı silindi ✓`, 'ok');
      _clearBulk(); renderUsers();
    }
  });
}

// G7: Sıralama fonksiyonu
function _sortUsers(col) {
  if (USERS_SORT.col===col) USERS_SORT.dir *= -1;
  else { USERS_SORT.col=col; USERS_SORT.dir=1; }
  renderUsers(document.getElementById('u-search')?.value||'');
}

// G8: Şifre güç seviyesi göstergesi
function _pwStrength(pw) {
  if (!pw) return { score:0, label:'', color:'' };
  let score = 0;
  if (pw.length>=6)  score++;
  if (pw.length>=10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    {label:'',color:''},
    {label:'Zayıf',color:'#EF4444'},
    {label:'Orta',color:'#F59E0B'},
    {label:'İyi',color:'#3B82F6'},
    {label:'Güçlü',color:'#22C55E'},
    {label:'Mükemmel',color:'#10B981'},
  ];
  return { score, ...levels[Math.min(score, levels.length-1)] };
}
function _onPwInput(val) {
  const s = _pwStrength(val);
  const el = document.getElementById('f-pw-strength');
  if (!el) return;
  if (!val) { el.innerHTML=''; return; }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
    ${[1,2,3,4,5].map(i=>`<div style="height:3px;flex:1;border-radius:2px;background:${i<=s.score?s.color:'var(--b)'}"></div>`).join('')}
    <span style="font-size:10px;font-weight:600;color:${s.color};min-width:56px">${s.label}</span>
  </div>`;
}


// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — ADMIN
// ════════════════════════════════════════════════════════════════

function _injectUsersPanel() {
  var panel = document.getElementById('panel-users');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = [
    '<div class="ph">',
      '<div><div class="pht">👥 Kullanıcı Yönetimi</div>',
      '<div class="phs">Ekip, roller ve erişim yönetimi</div></div>',
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">',
        '<div style="display:flex;background:var(--s2);border-radius:8px;padding:2px;gap:1px">',
          '<button class="cvb on" id="u-v-card" data-uview="card" style="font-size:11px;padding:5px 11px">⊞ Kart</button>',
          '<button class="cvb" id="u-v-table" data-uview="table" style="font-size:11px;padding:5px 11px">≡ Tablo</button>',
          '<button class="cvb" id="u-v-org" data-uview="org" style="font-size:11px;padding:5px 11px">🏢 Org</button>',
        '<button class="cvb" id="u-v-matrix" data-uview="matrix" style="font-size:11px;padding:5px 11px">⊞ Matris</button>',
        '</div>',
        '<button class="btn btnp" onclick="openNewUser()" style="border-radius:9px">+ Kullanıcı Ekle</button>',
        '<button class="btn btns" onclick="exportUsersXlsx()" title="Excel İndir" style="border-radius:9px">⬇️ Excel</button>',
      '</div>',
    '</div>',
    '<div style="background:var(--al);border:1px solid var(--ac)33;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--t2);line-height:1.7">',
      '🔐 <strong style="color:var(--t)">Şifre:</strong> SHA-256 hash olarak saklanır. ',
      'Firebase Console → Authentication → kullanıcı → Reset Password ile sıfırlanabilir.',
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">',
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:10px">',
        '<div style="width:34px;height:34px;border-radius:9px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:17px">👥</div>',
        '<div><div style="font-size:20px;font-weight:700;color:var(--t)" id="u-stat-total">0</div><div style="font-size:11px;color:var(--t3)">Toplam</div></div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:10px">',
        '<div style="width:34px;height:34px;border-radius:9px;background:var(--grb);display:flex;align-items:center;justify-content:center;font-size:17px">✅</div>',
        '<div><div style="font-size:20px;font-weight:700;color:var(--t)" id="u-stat-active">0</div><div style="font-size:11px;color:var(--t3)">Aktif</div></div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:10px">',
        '<div style="width:34px;height:34px;border-radius:9px;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;font-size:17px">👑</div>',
        '<div><div style="font-size:20px;font-weight:700;color:var(--t)" id="u-stat-managers">0</div><div style="font-size:11px;color:var(--t3)">Yönetici</div></div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:10px">',
        '<div style="width:34px;height:34px;border-radius:9px;background:var(--rdb);display:flex;align-items:center;justify-content:center;font-size:17px">⏸</div>',
        '<div><div style="font-size:20px;font-weight:700;color:var(--t)" id="u-stat-inactive">0</div><div style="font-size:11px;color:var(--t3)">Pasif</div></div>',
      '</div>',
    '</div>',
    '<div style="background:var(--sf);border:1px solid var(--b);border-radius:11px;padding:10px 13px;margin-bottom:13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">',
      '<input class="fi" type="search" id="u-search" placeholder="İsim veya e-posta ara…" oninput="_debouncedSearch(this.value)" style="flex:1;min-width:160px;border-radius:8px">',
      '<select class="fi" id="u-role-filter" onchange="renderUsers()" style="border-radius:8px;min-width:120px">',
        '<option value="">Tüm Roller</option>',
        '<option value="admin">👑 Admin</option>',
        '<option value="manager">👔 Yönetici</option>',
        '<option value="lead">⭐ Takım Lideri</option>',
        '<option value="staff">👤 Personel</option>',
      '</select>',
      '<select class="fi" id="u-status-filter" onchange="renderUsers()" style="border-radius:8px;min-width:110px">',
        '<option value="">Tüm Durumlar</option>',
        '<option value="active">✅ Aktif</option>',
        '<option value="suspended">⏸ Askıda</option>',
      '</select>',
      '<span id="u-count-label" style="font-size:11px;color:var(--t3)"></span>',
    '</div>',
    '<div id="u-grid"></div>',
  ].join('');
  // View buton event delegation
  var panel2 = document.getElementById('panel-users');
  if (panel2) panel2.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-uview]');
    if (!btn) return;
    USERS_VIEW = btn.dataset.uview;
    panel2.querySelectorAll('.cvb[id^="u-v"]').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
    renderUsers();
  }, {once: false});
}

function renderUsers(filter=''){
  _injectUsersPanel();
  if(!window.isAdmin?.())return;
  const users=loadUsers();
  const roleF=g('u-role-filter')?.value||'';
  const statusF=g('u-status-filter')?.value||'';
  let list=users.filter(u=>{
    const q=filter.toLowerCase();
    const matchQ=!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)||(u.role||'').toLowerCase().includes(q);
    const matchRole=!roleF||u.role===roleF;
    const matchStatus=!statusF||u.status===statusF;
    return matchQ&&matchRole&&matchStatus;
  });

  // G7: Sıralama uygula
  if (USERS_SORT.col) {
    const col = USERS_SORT.col;
    list.sort((a, b) => {
      let va = a[col] || ''; let vb = b[col] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return va < vb ? -USERS_SORT.dir : va > vb ? USERS_SORT.dir : 0;
    });
  }

  // Stats — T2: sayaç animasyonu
  const sv=(id,v)=>{
    const el=g(id);
    if(el){
      const prev=el.textContent;
      el.textContent=v;
      if(String(prev)!==String(v)){ // değişti → pop animasyonu
        el.classList.remove('u-stat-updated');
        void el.offsetWidth; // reflow
        el.classList.add('u-stat-updated');
      }
    }
  };
  sv('u-stat-total',   users.length);
  sv('u-stat-active',  users.filter(x=>x.status==='active').length);
  sv('u-stat-managers',users.filter(x=>x.role==='admin'||x.role==='manager').length);
  sv('u-stat-inactive',users.filter(x=>x.status!=='active').length);
  st('sv-u',users.filter(x=>x.status==='active').length);
  const countEl=g('u-count-label');
  if(countEl)countEl.textContent=list.length+' kullanıcı gösteriliyor';

  const grid=g('u-grid');if(!grid)return;

  if(!list.length){
    grid.innerHTML=`<div style="padding:56px;text-align:center;color:var(--t2)">
      <div style="font-size:48px;margin-bottom:12px">🔍</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">Kullanıcı bulunamadı</div>
      <div style="font-size:12px">Filtreleri değiştirin veya yeni kullanıcı ekleyin.</div>
    </div>`;
    return;
  }

  if(USERS_VIEW==='matrix'){
    _renderMatrix(list);
    return;
  }

  if(USERS_VIEW==='card'){
    const _cuSelf = _getCU();
    grid.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      ${list.map((u)=>{
        const rm=ROLE_META[u.role]||ROLE_META.staff;
        const isSelf=u.id===_cuSelf?.id;
        const isActive=u.status==='active';
        const idx=users.indexOf(u);
        const avBg=AV_COLORS[idx%AV_COLORS.length];
        const lastSeen=u.lastLogin?u.lastLogin.slice(0,16):'—';
        const modCount=(u.modules||[]).length;
        const loginRecently=u.lastLogin&&(Date.now()-new Date(u.lastLogin.replace(' ','T')).getTime())<7*86400000;
        // T3: Durum şeridi — yeşil=aktif+son7gün, sarı=aktif+uzun süre yok, kırmızı=askıda
        const daysSince = u.lastLogin ? (Date.now()-new Date(u.lastLogin.replace(' ','T')).getTime())/86400000 : 999;
        const stripeClass = u.status==='suspended' ? 'suspended'
          : !isActive ? 'inactive'
          : daysSince > 7 ? 'warning'
          : 'active';
        return`<div style="position:relative;background:var(--sf);border:2px solid ${isSelf?'#6366F1':'var(--b)'};border-radius:18px;overflow:hidden;transition:all .2s;box-shadow:0 2px 12px rgba(0,0,0,.06)" onmouseenter="this.style.boxShadow='0 8px 28px rgba(0,0,0,.12)'" onmouseleave="this.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'">

          <!-- T3: Durum renk şeridi -->
          <div class="u-status-stripe ${stripeClass}"></div>

          <!-- Card header strip -->
          <div style="height:4px;background:${avBg}"></div>

          <div style="padding:18px">
            <!-- Top row: avatar + name + self badge -->
            <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
              <div style="position:relative;flex-shrink:0">
                <div style="width:52px;height:52px;border-radius:16px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;letter-spacing:-.5px">${initials(u.name)}</div>
                ${loginRecently?`<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#22C55E;border:2.5px solid var(--sf);border-radius:50%"></div>`:!isActive?`<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#EF4444;border:2.5px solid var(--sf);border-radius:50%"></div>`:''}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                  <span style="font-size:15px;font-weight:700;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${u.name}</span>
                  ${isSelf?`<span style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;flex-shrink:0;letter-spacing:.03em">SİZ</span>`:''}
                </div>
                <div style="font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.email}</div>
              </div>
            </div>

            <!-- Role + Status -->
            <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
              <span style="display:inline-flex;align-items:center;gap:4px;background:${rm.bg};color:${rm.color};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid ${rm.border}">${rm.icon} ${rm.label}</span>
              <span style="display:inline-flex;align-items:center;gap:4px;background:${isActive?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'};color:${isActive?'#16A34A':'#DC2626'};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid ${isActive?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}">
                <div style="width:6px;height:6px;border-radius:50%;background:currentColor"></div>${isActive?'Aktif':'Pasif'}
              </span>
            </div>

            <!-- Info grid -->
            <div style="background:var(--s2);border-radius:10px;padding:10px 12px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px">Son Giriş</div>
                <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--t2)">${lastSeen}</div>
              </div>
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px">Modül Erişimi</div>
                <div style="font-size:11px;font-weight:600;color:var(--t)">${modCount>0?modCount+' modül':'Tümü'}</div>
              </div>
              ${u.access?.length?`<div style="grid-column:1/-1">
                <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Döküman Erişimi</div>
                <div style="display:flex;flex-wrap:wrap;gap:3px">${(u.access||[]).map(a=>`<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;background:var(--al);color:var(--ac)">${a}</span>`).join('')}</div>
              </div>`:''}
            </div>

            <!-- Action row -->
            <div style="display:flex;gap:6px">
              <button onclick="editUser(${u.id})" class="btn btnp" style="flex:1;font-size:12px;justify-content:center;padding:8px">✏️ Düzenle</button>
              <button onclick="toggleUser(${u.id})" class="btn btns" style="font-size:12px;padding:8px 12px;${isActive?'color:#D97706':'color:#16A34A'}" title="${isActive?'Pasife al':'Aktif et'}">${isActive?'⏸':'▶'}</button>
              ${!isSelf?`<button onclick="deleteUser(${u.id})" class="btn btns" style="font-size:12px;padding:8px 12px;color:#EF4444" title="Kullanıcıyı sil">🗑</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  }else if(USERS_VIEW==='org'){
    // G2: Org Chart view
    const byRole = {};
    list.forEach(u => { (byRole[u.role] = byRole[u.role]||[]).push(u); });
    const roleOrder = ['admin','manager','lead','staff'];
    grid.innerHTML = `<div style="padding:8px 0">
      <div style="text-align:center;margin-bottom:20px">
        <div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--al);border:1.5px solid var(--ac);border-radius:12px;padding:10px 22px">
          <span style="font-size:18px">🏢</span>
          <span style="font-size:13px;font-weight:700;color:var(--t)">Duay Organizasyon Şeması</span>
          <span style="font-size:11px;color:var(--t3)">${list.length} kişi</span>
        </div>
      </div>
      ${roleOrder.filter(r=>byRole[r]?.length).map(role=>{
        const rm = ROLE_META[role]||ROLE_META.staff;
        const members = byRole[role];
        return `<div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:0 4px">
            <div style="height:1px;flex:1;background:var(--b)"></div>
            <span style="background:${rm.bg};color:${rm.color};border:1px solid ${rm.border};padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">${rm.icon} ${rm.label} · ${members.length} kişi</span>
            <div style="height:1px;flex:1;background:var(--b)"></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
            ${members.map((u,idx)=>{
              const avBg = AV_COLORS[users.indexOf(u)%AV_COLORS.length];
              const isActive = u.status==='active';
              const isSelf = u.id===_getCU()?.id;
              return `<div style="background:var(--sf);border:1.5px solid ${isSelf?'#6366F1':'var(--b)'};border-radius:14px;padding:14px 16px;text-align:center;width:140px;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(0,0,0,.05)"
                onclick="editUser(${u.id})"
                onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.1)'"
                onmouseleave="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'">
                <div style="position:relative;display:inline-block;margin-bottom:8px">
                  <div style="width:44px;height:44px;border-radius:50%;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin:0 auto">${initials(u.name)}</div>
                  <div style="position:absolute;bottom:0;right:-1px;width:12px;height:12px;border-radius:50%;background:${isActive?'#22C55E':'#EF4444'};border:2px solid var(--sf)"></div>
                </div>
                <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name.split(' ')[0]}</div>
                <div style="font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.email?.split('@')[0]||'—'}</div>
                ${isSelf?`<div style="margin-top:5px"><span style="background:#6366F1;color:#fff;font-size:8px;font-weight:700;padding:1px 6px;border-radius:4px">SİZ</span></div>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  }else{
    // Professional table view — G7: sortable columns, G5: bulk select
    const _cuSelf2 = _getCU();
    const _th = (label, col) => {
      const isActive = USERS_SORT.col === col;
      const arrow = isActive ? (USERS_SORT.dir===1 ? ' ↑' : ' ↓') : '';
      return `<th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:${isActive?'var(--ac)':'var(--t3)'};text-transform:uppercase;letter-spacing:.07em;cursor:pointer;user-select:none" onclick="_sortUsers('${col}')">${label}${arrow}</th>`;
    };
    grid.innerHTML=`
    <!-- G5: Bulk action toolbar (gizli) -->
    <div id="u-bulk-bar" style="display:none;background:var(--al);border:1px solid var(--ac);border-radius:10px;padding:8px 14px;margin-bottom:10px;display:none;align-items:center;gap:10px;flex-wrap:wrap">
      <span id="u-bulk-count" style="font-size:12px;font-weight:600;color:var(--t)">0 seçili</span>
      <button class="btn btns" style="font-size:11px;color:#D97706" onclick="_bulkToggle('suspended')">⏸ Askıya Al</button>
      <button class="btn btns" style="font-size:11px;color:#16A34A" onclick="_bulkToggle('active')">▶ Aktifleştir</button>
      <button class="btn btns" style="font-size:11px;color:#EF4444" onclick="_bulkDelete()">🗑 Sil</button>
      <button class="btn btns" style="font-size:11px;margin-left:auto" onclick="_clearBulk()">✕ İptal</button>
    </div>
    <div style="border:1.5px solid var(--b);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--s2);border-bottom:2px solid var(--b)">
            <th style="padding:12px 16px;width:36px">
              <input type="checkbox" id="u-select-all" onchange="_bulkSelectAll(this.checked)" style="accent-color:var(--ac);cursor:pointer" title="Tümünü seç">
            </th>
            ${_th('Kullanıcı','name')}
            ${_th('Rol','role')}
            ${_th('Durum','status')}
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Erişim</th>
            ${_th('Son Giriş','lastLogin')}
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((u,rowIdx)=>{
            const rm=ROLE_META[u.role]||ROLE_META.staff;
            const isSelf=u.id===_cuSelf2?.id;
            const isActive=u.status==='active';
            const idx=users.indexOf(u);
            const avBg=AV_COLORS[idx%AV_COLORS.length];
            return`<tr style="border-bottom:1px solid var(--b);background:${rowIdx%2===0?'var(--sf)':'var(--s2)'};opacity:${isActive?1:.6};transition:background .1s" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background='${rowIdx%2===0?'var(--sf)':'var(--s2)'}'">
              <td style="padding:12px 16px;width:36px">
                ${!isSelf?`<input type="checkbox" class="u-bulk-cb" data-uid="${u.id}" onchange="_onBulkCb()" style="accent-color:var(--ac);cursor:pointer">`:
                  `<span style="font-size:10px;color:var(--t3)">—</span>`}
              </td>
              <td style="padding:12px 16px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:10px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${initials(u.name)}</div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--t);display:flex;align-items:center;gap:5px">
                      ${u.name}
                      ${isSelf?`<span style="background:#6366F1;color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">SİZ</span>`:''}
                    </div>
                    <div style="font-size:11px;color:var(--t3)">${u.email}</div>
                  </div>
                </div>
              </td>
              <td style="padding:12px 16px">
                <span style="display:inline-flex;align-items:center;gap:4px;background:${rm.bg};color:${rm.color};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700">${rm.icon} ${rm.label}</span>
              </td>
              <td style="padding:12px 16px">
                <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${isActive?'#16A34A':'#DC2626'}">
                  <div style="width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0"></div>
                  ${isActive?'Aktif':'Pasif'}
                </span>
              </td>
              <td style="padding:12px 16px">
                <div style="display:flex;flex-wrap:wrap;gap:3px">
                  ${(u.access||[]).map(a=>`<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;background:var(--al);color:var(--ac)">${a}</span>`).join('')||`<span style="font-size:11px;color:var(--t3)">—</span>`}
                </div>
              </td>
              <td style="padding:12px 16px;font-family:'DM Mono',monospace;font-size:11px;color:var(--t3);white-space:nowrap">${u.lastLogin?.slice(0,16)||'—'}</td>
              <td style="padding:12px 16px">
                <div style="display:flex;gap:4px;justify-content:flex-end">
                  <button onclick="editUser(${u.id})" class="btn btns" style="font-size:11px;padding:5px 10px">✏️ Düzenle</button>
                  <button onclick="toggleUser(${u.id})" class="btn btns" style="font-size:11px;padding:5px 10px;${isActive?'color:#D97706':'color:#16A34A'}" title="${isActive?'Pasife al':'Aktif et'}">${isActive?'⏸':'▶'}</button>
                  ${!isSelf?`<button onclick="deleteUser(${u.id})" class="btn btns" style="font-size:11px;padding:5px 10px;color:#EF4444" title="Sil">🗑</button>`:''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }
}

function editUser(id){
  const users=loadUsers();const u=users.find(x=>x.id===id);if(!u)return;
  st('mo-u-title','✏️ '+u.name);
  g('f-name').value=u.name;g('f-email').value=u.email;g('f-pw').value='';g('f-pw').placeholder='(değiştirmek için doldurun)';
  g('f-role').value=u.role;g('f-st').value=u.status;g('f-edit-id').value=id;
  const M={ik:'İK',fn:'Finans',op:'Operasyon',tk:'Teknik',ms:'Maaş',ss:'Sistem'};
  Object.keys(M).forEach(k=>g('pa-'+k).checked=(u.access||[]).includes(M[k]));
  // Load module permissions
  const userMods=u.modules||ROLE_DEFAULT_MODULES[u.role]||ROLE_DEFAULT_MODULES.staff;
  ALL_MODULES.forEach(m=>{const cb=g('pm-'+m.id);if(cb)cb.checked=userMods.includes(m.id);});
  openMo('mo-admin-user');
}

function openNewUser(){
  st('mo-u-title','+ Yeni Kullanıcı');
  ['f-name','f-email','f-pw'].forEach(id=>g(id).value='');
  g('f-pw').placeholder='Min 6 karakter';g('f-role').value='staff';g('f-st').value='active';g('f-edit-id').value='';
  ['pa-ik','pa-fn','pa-op','pa-tk','pa-ms','pa-ss'].forEach((id,i)=>g(id).checked=[true,false,true,false,false,false][i]);
  // Default staff modules
  ALL_MODULES.forEach(m=>{const cb=g('pm-'+m.id);if(cb)cb.checked=ROLE_DEFAULT_MODULES.staff.includes(m.id);});
  openMo('mo-admin-user');
}

function filterUsers(v){renderUsers(v);}

function toggleUser(id){
  // G9 fix: 'inactive' → 'suspended' (sistem 'suspended' bekliyor)
  const users=loadUsers();const u=users.find(x=>x.id===id);if(!u)return;
  const wasActive = u.status==='active';
  u.status = wasActive ? 'suspended' : 'active';
  if (wasActive) { u.suspendedBy=_getCU()?.id; u.suspendedAt=nowTs(); }
  else           { u.activatedBy=_getCU()?.id; u.activatedAt=nowTs(); }
  saveUsers(users);
  logActivity('user',`"${u.name}" kullanıcısını ${u.status==='active'?'aktif etti':'askıya aldı'}`);
  window.toast?.(u.name+' '+(u.status==='active'?'aktifleştirildi ✓':'askıya alındı'),'ok');
  renderUsers();
}

function renderSettingsAdmin(){
  if(!isAdmin())return;
  updateVersionUI();
  // Sürüm geçmişi
  const vh=g('ver-hist');
  if(vh&&!vh.innerHTML.trim()){
    vh.innerHTML=CHANGELOG.slice(0,8).map(c=>`<div class="dr"><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ac)">${c.v}</span><span style="font-size:11px;color:var(--t2)">${escapeHtml(c.note)}</span><span style="font-size:10px;color:var(--t3)">${c.ts.slice(0,10)}</span></div>`).join('');
  }
  // Puantaj Yetki Kartı — dinamik render (G1: undefined guard)
  if (typeof renderPuantajYetkiKart === 'function') renderPuantajYetkiKart();
  else if (typeof window.renderPuantajYetkiKart === 'function') window.renderPuantajYetkiKart();
}



// ════════════════════════════════════════════════════════════════
// ÖZELLİK 2: KULLANICI AKTİVİTE GEÇMİŞİ
// ════════════════════════════════════════════════════════════════

function showUserActivity(uid) {
  const users = loadUsers();
  const u = users.find(x => x.id === uid); if (!u) return;
  const acts = (typeof loadAct === 'function' ? loadAct() : []).filter(a => a.uid === uid).slice(0, 20);
  const daysSince = u.lastLogin ? Math.floor((Date.now() - new Date(u.lastLogin.replace(' ','T')).getTime()) / 86400000) : null;
  const isOnline = daysSince !== null && daysSince < 1;

  const old = document.getElementById('mo-user-activity'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-user-activity'; 
  mo.innerHTML = `<div class="moc" style="max-width:480px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px">
      <div style="width:10px;height:10px;border-radius:50%;background:${isOnline?'#22C55E':'#9CA3AF'};flex-shrink:0"></div>
      <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--t)">${escapeHtml(u.name)}</div>
      <div style="font-size:11px;color:var(--t3)">${u.lastLogin ? 'Son giriş: '+u.lastLogin : 'Hiç giriş yapmadı'}${daysSince!==null?' · '+daysSince+' gün önce':''}</div></div>
      <button onclick="document.getElementById('mo-user-activity').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:8px 20px;max-height:50vh;overflow-y:auto">
      ${acts.length ? acts.map(a => `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--b)">
        <div style="font-size:10px;color:var(--t3);white-space:nowrap;min-width:70px">${(a.ts||'').slice(5,16)}</div>
        <div style="font-size:12px;color:var(--t)">${escapeHtml(a.detail||a.message||'')}</div>
      </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Aktivite kaydı yok</div>'}
    </div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-user-activity').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 4: OTURUM YÖNETİMİ
// ════════════════════════════════════════════════════════════════

const SESSIONS_KEY = 'ak_active_sessions';

function _loadSessions() { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)||'{}'); } catch { return {}; } }
function _storeSessions(d) { localStorage.setItem(SESSIONS_KEY, JSON.stringify(d)); }

function registerSession() {
  const cu = _getCU(); if (!cu) return;
  const sessions = _loadSessions();
  sessions[cu.id] = { uid: cu.id, name: cu.name, email: cu.email, ts: Date.now(), device: navigator.userAgent.slice(0,60) };
  // Oturum limiti kontrolü — varsayılan 5
  var maxSessions = cu.maxSessions || 5;
  var allEntries = Object.values(sessions).sort(function(a, b) { return b.ts - a.ts; });
  if (maxSessions > 0 && allEntries.length > maxSessions) {
    var toRemove = allEntries.slice(maxSessions);
    toRemove.forEach(function(s) { delete sessions[s.uid]; });
    console.info('[Admin] Oturum limiti aşıldı — ' + toRemove.length + ' eski oturum sonlandırıldı');
  }
  _storeSessions(sessions);
}

function openSessionManager() {
  if (!isAdmin()) return;
  const sessions = _loadSessions();
  const users = loadUsers();
  const entries = Object.values(sessions).sort((a,b) => b.ts - a.ts);

  const old = document.getElementById('mo-sessions'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sessions'; 
  mo.innerHTML = `<div class="moc" style="max-width:520px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">🖥 Aktif Oturumlar (${entries.length})</div>
    </div>
    <div style="padding:8px 20px;max-height:50vh;overflow-y:auto">
      ${entries.length ? entries.map(s => {
        const age = Math.floor((Date.now()-s.ts)/3600000);
        const isSelf = s.uid === _getCU()?.id;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
          <div style="width:8px;height:8px;border-radius:50%;background:${age<1?'#22C55E':age<24?'#F59E0B':'#9CA3AF'};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--t)">${escapeHtml(s.name)}${isSelf?' (sen)':''}</div>
            <div style="font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.device||'—')}</div>
          </div>
          <div style="font-size:10px;color:var(--t3);white-space:nowrap">${age<1?'Az önce':age+'s önce'}</div>
          ${!isSelf?`<button class="btn btns btnd" onclick="_terminateSession(${s.uid})" style="font-size:10px;padding:2px 8px">Sonlandır</button>`:''}
        </div>`;
      }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3)">Aktif oturum yok</div>'}
    </div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btns" onclick="window._terminateAllSessions?.()" style="font-size:11px;color:#dc2626;border-color:#dc2626">Tümünü Sonlandır</button>
      <button class="btn" onclick="document.getElementById('mo-sessions').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

function _terminateSession(uid) {
  const sessions = _loadSessions();
  delete sessions[uid];
  _storeSessions(sessions);
  // Kullanıcıyı askıya al (zorunlu çıkış)
  const users = loadUsers();
  const u = users.find(x => x.id === uid);
  if (u) { u.forceLogout = Date.now(); saveUsers(users); }
  window.toast?.('Oturum sonlandırıldı', 'ok');
  document.getElementById('mo-sessions')?.remove();
  openSessionManager();
}
window._terminateSession = _terminateSession;

window._terminateAllSessions = function() {
  var cu = _getCU();
  var sessions = _loadSessions();
  var count = Object.keys(sessions).length;
  // Kendi oturumunu koru
  var kept = {};
  if (cu && sessions[cu.id]) kept[cu.id] = sessions[cu.id];
  _storeSessions(kept);
  window.toast?.((count - Object.keys(kept).length) + ' oturum sonlandırıldı', 'ok');
  document.getElementById('mo-sessions')?.remove();
  openSessionManager();
};

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 5: BİLDİRİM TERCİHLERİ
// ════════════════════════════════════════════════════════════════

const NOTIF_PREFS_KEY = 'ak_notif_prefs';
const NOTIF_CATEGORIES = [
  { id:'task',     label:'Görev Bildirimleri',    icon:'📋', desc:'Atama, tamamlama, yorum' },
  { id:'approval', label:'Onay Bildirimleri',     icon:'✅', desc:'Prim, ödeme, izin onayları' },
  { id:'announce', label:'Duyuru Bildirimleri',    icon:'📢', desc:'Şirket duyuruları' },
  { id:'kargo',    label:'Kargo Bildirimleri',     icon:'📦', desc:'Sevkiyat, konteyner' },
  { id:'hr',       label:'İK Bildirimleri',        icon:'👥', desc:'Personel, izin, puantaj' },
  { id:'system',   label:'Sistem Bildirimleri',    icon:'⚙️', desc:'Güncelleme, bakım' },
];

function openNotifPrefs() {
  const cu = _getCU(); if (!cu) return;
  const prefs = JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY+'_'+cu.id) || '{}');

  const old = document.getElementById('mo-notif-prefs'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-notif-prefs'; 
  mo.innerHTML = `<div class="moc" style="max-width:440px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">🔔 Bildirim Tercihleri</div>
    </div>
    <div style="padding:8px 20px">
      ${NOTIF_CATEGORIES.map(c => `<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b);cursor:pointer">
        <input type="checkbox" id="npref-${c.id}" ${prefs[c.id]!==false?'checked':''} style="accent-color:var(--ac);width:18px;height:18px;flex-shrink:0">
        <div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--t)">${c.icon} ${c.label}</div>
        <div style="font-size:11px;color:var(--t3)">${c.desc}</div></div>
      </label>`).join('')}
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-notif-prefs').remove()">İptal</button>
      <button class="btn btnp" onclick="_saveNotifPrefs()">Kaydet</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

function _saveNotifPrefs() {
  const cu = _getCU(); if (!cu) return;
  const prefs = {};
  NOTIF_CATEGORIES.forEach(c => { prefs[c.id] = !!document.getElementById('npref-'+c.id)?.checked; });
  localStorage.setItem(NOTIF_PREFS_KEY+'_'+cu.id, JSON.stringify(prefs));
  document.getElementById('mo-notif-prefs')?.remove();
  window.toast?.('Bildirim tercihleri kaydedildi ✓', 'ok');
}
window._saveNotifPrefs = _saveNotifPrefs;

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 6: OTOMATİK HESAP KİLİTLEME (30 gün)
// ════════════════════════════════════════════════════════════════

function checkInactiveUsers() {
  if (!isAdmin()) return;
  var sentKey = 'ak_inactive_sent';
  var sent = {};
  try { sent = JSON.parse(localStorage.getItem(sentKey) || '{}'); } catch(e) { sent = {}; }
  var todayS = new Date().toISOString().slice(0, 10);
  var users = loadUsers();
  var now = Date.now();
  var changed = false;

  users.forEach(function(u) {
    if (u.role === 'admin' || u.status !== 'active') return;
    if (!u.lastLogin) return;
    var lastMs = new Date(u.lastLogin.replace(' ','T')).getTime();
    if (isNaN(lastMs)) return;
    var daysSince = Math.floor((now - lastMs) / 86400000);

    // 60+ gün: otomatik pasif uyarısı (pasife almaz, admin onayı gerekli)
    if (daysSince >= 60 && !sent[u.id + '_60']) {
      window.addNotif?.('🚨', escapeHtml(u.name) + ' 60+ gündür giriş yapmadı — pasife alınması öneriliyor', 'err', 'admin');
      sent[u.id + '_60'] = todayS; changed = true;
    }
    // 30+ gün: bildirim
    else if (daysSince >= 30 && !sent[u.id + '_30']) {
      window.addNotif?.('⚠️', escapeHtml(u.name) + ' 30+ gündür giriş yapmadı', 'warn', 'admin');
      sent[u.id + '_30'] = todayS; changed = true;
    }
  });

  if (changed) localStorage.setItem(sentKey, JSON.stringify(sent));
}

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 7: DAVET SİSTEMİ
// ════════════════════════════════════════════════════════════════

const INVITE_KEY = 'ak_invites';
function _loadInvites() { try { return JSON.parse(localStorage.getItem(INVITE_KEY)||'[]'); } catch { return []; } }
function _storeInvites(d) { localStorage.setItem(INVITE_KEY, JSON.stringify(d)); }

function openInviteModal() {
  if (!isAdmin()) return;
  const old = document.getElementById('mo-invite'); if (old) old.remove();
  const invites = _loadInvites();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-invite'; 
  mo.innerHTML = `<div class="moc" style="max-width:480px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">✉️ Kullanıcı Davet Et</div>
    </div>
    <div style="padding:16px 20px">
      <div class="fg"><div class="fl">E-POSTA ADRESİ <span style="color:var(--rd)">*</span></div>
        <input type="email" class="fi" id="inv-email" placeholder="ali@sirket.com" style="font-size:14px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="fg"><div class="fl">ROL</div>
          <select class="fi" id="inv-role">
            <option value="staff">👤 Personel</option>
            <option value="lead">⭐ Takım Lideri</option>
            <option value="manager">👔 Yönetici</option>
          </select></div>
        <div class="fg"><div class="fl">DEPARTMAN</div>
          <input class="fi" id="inv-dept" placeholder="İK, Finans..."></div>
      </div>
    </div>
    <div style="padding:0 20px 12px;display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-invite').remove()">İptal</button>
      <button class="btn btnp" onclick="_sendInvite()">Davet Gönder</button>
    </div>
    ${invites.length ? `<div style="border-top:1px solid var(--b);padding:10px 20px;max-height:30vh;overflow-y:auto">
      <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Bekleyen Davetler (${invites.filter(i=>!i.used).length})</div>
      ${invites.filter(i=>!i.used).map(i => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b)">
        <div style="flex:1;font-size:12px;color:var(--t)">${escapeHtml(i.email)}</div>
        <code style="font-size:10px;background:var(--s2);padding:2px 6px;border-radius:4px;color:var(--ac)">${i.code}</code>
        <button onclick="_copyInviteCode('${i.code}')" class="btn btns" style="font-size:10px;padding:2px 6px">Kopyala</button>
      </div>`).join('')}
    </div>` : ''}
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); document.getElementById('inv-email')?.focus(); }, 10);
}

function _sendInvite() {
  const email = (document.getElementById('inv-email')?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) { window.toast?.('Geçerli e-posta girin', 'err'); return; }
  const role = document.getElementById('inv-role')?.value || 'staff';
  const dept = (document.getElementById('inv-dept')?.value || '').trim();

  // Mevcut kullanıcıda var mı
  if (loadUsers().find(u => u.email === email)) { window.toast?.('Bu e-posta zaten kayıtlı', 'err'); return; }

  // 6 haneli davet kodu
  const code = 'DY-' + String(Math.floor(100000 + Math.random() * 900000));
  const invites = _loadInvites();
  invites.unshift({ id: generateNumericId(), email, role, dept, code, createdBy: _getCU()?.id, createdAt: nowTs(), used: false });
  _storeInvites(invites);
  document.getElementById('mo-invite')?.remove();
  openInviteModal(); // Listeyi yenile
  window.toast?.('Davet oluşturuldu: ' + code, 'ok');
  logActivity('user', 'Davet gönderildi: ' + email + ' (' + code + ')');
  // Clipboard'a kopyala
  navigator.clipboard?.writeText(code).catch(() => {});
}

function _copyInviteCode(code) {
  navigator.clipboard?.writeText(code).then(() => window.toast?.('Kod kopyalandı: ' + code, 'ok')).catch(() => window.toast?.(code, 'ok'));
}

function redeemInvite(code) {
  const invites = _loadInvites();
  const inv = invites.find(i => i.code === code && !i.used);
  if (!inv) return null;
  inv.used = true;
  inv.usedAt = nowTs();
  _storeInvites(invites);
  return inv; // { email, role, dept }
}
window._sendInvite = _sendInvite;
window._copyInviteCode = _copyInviteCode;

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 3: YETKİ ŞABLONLARI
// ════════════════════════════════════════════════════════════════

const PERM_TEMPLATES = {
  muhasebe: { label:'Muhasebe', modules:['dashboard','odemeler','pirim','kpi','settings'], permissions:{odemeler:'manage',pirim:'view',kpi:'view'} },
  satinalma:{ label:'Satin Alma', modules:['dashboard','pusula','kargo','stok','crm','navlun','pirim','settings'], permissions:{pusula:'manage',kargo:'manage',stok:'manage',crm:'manage',pirim:'manage'} },
  lojistik: { label:'Lojistik', modules:['dashboard','kargo','stok','navlun','lojistik','settings'], permissions:{kargo:'full',stok:'manage'} },
  satis:    { label:'Satis', modules:['dashboard','pusula','crm','pirim','settings'], permissions:{pusula:'manage',crm:'full',pirim:'view'} },
  ik:       { label:'IK', modules:['dashboard','ik','izin','puantaj','pirim','settings'], permissions:{ik:'full',izin:'manage',puantaj:'manage'} },
  stajyer:  { label:'Stajyer', modules:['dashboard','pusula','takvim','notes','announce'], permissions:{pusula:'view',takvim:'view',notes:'view',announce:'view'} },
  finans:   { label:'Finans', modules:['dashboard','odemeler','pirim','kargo','kpi','crm','settings'], permissions:{odemeler:'full',pirim:'full',kargo:'manage',kpi:'manage',crm:'view'} },
};

function applyPermTemplate(uid, templateId) {
  if (!isAdmin()) return;
  const tpl = PERM_TEMPLATES[templateId]; if (!tpl) return;
  const users = loadUsers();
  const u = users.find(x => x.id === uid); if (!u) return;
  u.modules = [...tpl.modules];
  u.permissions = { ...tpl.permissions };
  saveUsers(users);
  _auditLog('perm_template', uid, `Sablon uygulandi: ${tpl.label}`);
  window.toast?.(tpl.label + ' sablonu uygulandi', 'ok');
  renderAdmin();
}
window.applyPermTemplate = applyPermTemplate;

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 4: KULLANICI PERFORMANS SKORU
// ════════════════════════════════════════════════════════════════

function calcUserScore(uid) {
  const tasks = typeof window.loadTasks==='function' ? window.loadTasks() : [];
  const pirim = typeof window.loadPirim==='function' ? window.loadPirim() : [];
  const myTasks = tasks.filter(t => t.uid === uid);
  const done = myTasks.filter(t => t.done || t.status==='done').length;
  const total = myTasks.length || 1;
  const taskRate = Math.round(done / total * 100);

  // Zamaninda bitirme
  const onTime = myTasks.filter(t => t.done && t.due && t.completedAt && t.completedAt <= t.due).length;
  const withDue = myTasks.filter(t => t.done && t.due).length || 1;
  const timeRate = Math.round(onTime / withDue * 100);

  // Prim puani
  const myPrims = pirim.filter(p => p.uid === uid && ['approved','paid'].includes(p.status));
  const primTotal = myPrims.reduce((a,p) => a + (p.amount||0), 0);
  const primScore = Math.min(100, Math.round(primTotal / 1000));

  const overall = Math.round((taskRate * 0.4) + (timeRate * 0.3) + (primScore * 0.3));
  return { taskRate, timeRate, primScore, overall, tasksDone: done, tasksTotal: myTasks.length, primTotal };
}

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 5: DEPARTMAN YÖNETİMİ
// ════════════════════════════════════════════════════════════════

const DEPT_KEY = 'ak_departments';
function _loadDepts() { try { return JSON.parse(localStorage.getItem(DEPT_KEY)||'[]'); } catch { return []; } }
function _storeDepts(d) { localStorage.setItem(DEPT_KEY, JSON.stringify(d)); }

function openDeptModal() {
  if (!isAdmin()) return;
  let depts = _loadDepts();
  if (!depts.length) depts = ['IK','Finans','Operasyon','Satis','Lojistik','Teknik','Muhasebe'];
  const old = document.getElementById('mo-dept'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-dept'; 
  const users = loadUsers();
  mo.innerHTML = `<div class="moc" style="max-width:460px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">Departman Yonetimi</div>
    </div>
    <div style="padding:12px 20px;max-height:50vh;overflow-y:auto">
      ${depts.map(d => {
        const count = users.filter(u => u.dept === d).length;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">
          <span style="flex:1;font-size:13px;font-weight:500;color:var(--t)">${escapeHtml(d)}</span>
          <span style="font-size:11px;color:var(--t3)">${count} kisi</span>
          <button onclick="_delDept('${escapeHtml(d)}')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3);padding:2px">✕</button>
        </div>`;
      }).join('')}
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px">
      <input class="fi" id="dept-new" placeholder="Yeni departman..." style="flex:1;font-size:13px">
      <button class="btn btnp" onclick="_addDept()" style="font-size:12px">Ekle</button>
    </div>
    <div style="padding:8px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-dept').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window._addDept = function() {
  const name = (document.getElementById('dept-new')?.value||'').trim();
  if (!name) return;
  const depts = _loadDepts().length ? _loadDepts() : ['IK','Finans','Operasyon','Satis','Lojistik','Teknik','Muhasebe'];
  if (depts.includes(name)) { window.toast?.('Bu departman zaten var','err'); return; }
  depts.push(name);
  _storeDepts(depts);
  _auditLog('dept_add', 0, 'Departman eklendi: '+name);
  document.getElementById('mo-dept')?.remove();
  openDeptModal();
};
window._delDept = function(name) {
  const depts = _loadDepts().filter(d => d !== name);
  _storeDepts(depts);
  _auditLog('dept_del', 0, 'Departman silindi: '+name);
  document.getElementById('mo-dept')?.remove();
  openDeptModal();
};

// ════════════════════════════════════════════════════════════════
// ÖZELLİK 6: AUDIT LOG
// ════════════════════════════════════════════════════════════════

const AUDIT_KEY = 'ak_audit_log';
function _loadAudit() { try { return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]'); } catch { return []; } }
function _storeAudit(d) { localStorage.setItem(AUDIT_KEY, JSON.stringify(d.slice(0,2000))); }

function _auditLog(action, targetUid, detail) {
  const cu = _getCU();
  const d = _loadAudit();
  d.unshift({ id: generateNumericId(), action, targetUid, detail, by: cu?.id, byName: cu?.name||'Sistem', ts: nowTs() });
  _storeAudit(d);
}

function openAuditLog() {
  if (!isAdmin()) return;
  const logs = _loadAudit().slice(0, 50);
  const old = document.getElementById('mo-audit'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-audit'; 
  mo.innerHTML = `<div class="moc" style="max-width:560px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">Audit Log (${logs.length})</div>
    </div>
    <div style="max-height:60vh;overflow-y:auto">
      ${logs.length ? logs.map(l => `<div style="display:flex;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b);font-size:12px">
        <span style="color:var(--t3);white-space:nowrap;min-width:90px">${(l.ts||'').slice(0,16)}</span>
        <span style="color:var(--ac);font-weight:500;min-width:60px">${escapeHtml(l.byName||'?')}</span>
        <span style="color:var(--t);flex:1">${escapeHtml(l.detail||'')}</span>
      </div>`).join('') : '<div style="padding:32px;text-align:center;color:var(--t3)">Kayit yok</div>'}
    </div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-audit').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

// Mevcut fonksiyonlara audit ekleme — saveAdminUser ve deleteUser'ı wrap et
(function _patchAudit() {
  const _origSave = saveAdminUser;
  saveAdminUser = function() {
    const eid = parseInt(g('f-edit-id')?.value || '0');
    const name = (g('f-name')?.value || '').trim();
    _origSave();
    _auditLog(eid ? 'user_update' : 'user_create', eid || 0, (eid ? 'Guncellendi: ' : 'Olusturuldu: ') + name);
  };
  window.saveAdminUser = saveAdminUser;
  window.saveUser = saveAdminUser;
})();

// ════════════════════════════════════════════════════════════════
// IMPERSONATION MODU — admin başka kullanıcı olarak görüntüler
// ════════════════════════════════════════════════════════════════

let _impersonating = null;

function startImpersonation(uid) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const target = users.find(x => x.id === uid); if (!target) return;
  _impersonating = window.Auth?.getCU?.(); // gerçek admin'i sakla
  // CU'yu hedef kullanıcıya geçir
  const cu = window.Auth?.getCU?.();
  if (cu) {
    Object.assign(cu, { id: target.id, name: target.name, role: target.role, email: target.email, modules: target.modules, permissions: target.permissions, dept: target.dept });
  }
  // Impersonation banner göster
  const banner = document.createElement('div');
  banner.id = 'impersonation-bar';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#F59E0B;color:#000;padding:6px 16px;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:space-between;font-family:inherit';
  banner.innerHTML = '<span>Goruntulenme modu: ' + escapeHtml(target.name) + ' (' + (ROLE_META[target.role]?.label||target.role) + ') olarak goruntuluyorsunuz</span>'
    + '<button onclick="Admin.stopImpersonation()" style="background:#000;color:#F59E0B;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">Cikar</button>';
  document.body.prepend(banner);
  window.toast?.('Goruntulenme modu: ' + target.name, 'ok');
  _auditLog('impersonation_start', uid, 'Goruntulenme basladi: ' + target.name);
  // UI güncelle
  const navName = document.getElementById('nav-name');
  if (navName) navName.textContent = target.name + ' (goruntulenme)';
}

function stopImpersonation() {
  if (!_impersonating) return;
  const cu = window.Auth?.getCU?.();
  if (cu && _impersonating) {
    Object.assign(cu, { id: _impersonating.id, name: _impersonating.name, role: _impersonating.role, email: _impersonating.email, modules: _impersonating.modules, permissions: _impersonating.permissions, dept: _impersonating.dept });
  }
  _auditLog('impersonation_stop', 0, 'Goruntulenme bitti');
  _impersonating = null;
  document.getElementById('impersonation-bar')?.remove();
  const navName = document.getElementById('nav-name');
  if (navName && cu) navName.textContent = cu.name;
  window.toast?.('Goruntulenme modu kapatildi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// ZAMAN AYARLI YETKİ — tarih bazlı expiry
// ════════════════════════════════════════════════════════════════

function setPermExpiry(uid, moduleId, expiryDate) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const u = users.find(x => x.id === uid); if (!u) return;
  if (!u.permExpiry) u.permExpiry = {};
  u.permExpiry[moduleId] = expiryDate; // 'YYYY-MM-DD' formatında
  saveUsers(users);
  _auditLog('perm_expiry', uid, 'Yetki suresi: ' + moduleId + ' → ' + expiryDate);
  window.toast?.(moduleId + ' yetkisi ' + expiryDate + ' tarihine kadar gecerli', 'ok');
}

window._openTempPerm = function(uid) {
  if (!isAdmin()) return;
  const old = document.getElementById('mo-temp-perm'); if (old) old.remove();
  const mods = ALL_MODULES.filter(m => m.id !== 'dashboard' && m.id !== 'settings' && m.id !== 'admin');
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-temp-perm'; 
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:12px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)"><div style="font-size:15px;font-weight:700;color:var(--t)">Gecici Yetki Ver</div></div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fg"><div class="fl">MODUL</div><select class="fi" id="tp-mod">' + mods.map(m => '<option value="' + m.id + '">' + escapeHtml(m.label) + '</option>').join('') + '</select></div>'
      + '<div class="fg"><div class="fl">BITIS TARIHI</div><input type="date" class="fi" id="tp-date"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-temp-perm\').remove()">Iptal</button>'
      + '<button class="btn btnp" onclick="window._saveTempPerm(' + uid + ')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
};
window._saveTempPerm = function(uid) {
  const mod = document.getElementById('tp-mod')?.value;
  const date = document.getElementById('tp-date')?.value;
  if (!mod || !date) { window.toast?.('Modul ve tarih zorunlu', 'err'); return; }
  setPermExpiry(uid, mod, date);
  // Modülü ekle (yoksa)
  const users = loadUsers();
  const u = users.find(x => x.id === uid);
  if (u) {
    if (Array.isArray(u.modules) && !u.modules.includes(mod)) { u.modules.push(mod); saveUsers(users); }
  }
  document.getElementById('mo-temp-perm')?.remove();
  renderAdmin();
};

function checkPermExpiry() {
  var users = loadUsers();
  var today = new Date().toISOString().slice(0, 10);
  var changed = false;
  users.forEach(function(u) {
    if (!u.permExpiry) return;
    Object.entries(u.permExpiry).forEach(function(entry) {
      var mod = entry[0]; var expiry = entry[1];
      if (expiry && expiry < today) {
        var peKey = 'perm_exp_' + u.id + '_' + mod;
        if (localStorage.getItem(peKey)) return; // zaten işlendi
        localStorage.setItem(peKey, '1');
        if (Array.isArray(u.modules)) {
          u.modules = u.modules.filter(function(m) { return m !== mod; });
        }
        delete u.permExpiry[mod];
        changed = true;
        window.addNotif?.('⏰', escapeHtml(u.name) + ' — ' + mod + ' yetkisi suresi doldu', 'warn', 'admin');
        _auditLog('perm_expired', u.id, mod + ' yetkisi suresi doldu');
      }
    });
  });
  if (changed) saveUsers(users);
}

// ════════════════════════════════════════════════════════════════
// BULK ROLE CHANGE — toplu rol değiştir
// ════════════════════════════════════════════════════════════════

function openBulkRoleChange() {
  if (!isAdmin()) return;
  const users = loadUsers().filter(u => u.role !== 'admin');
  const old = document.getElementById('mo-bulk-role'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-bulk-role'; 
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:12px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)"><div style="font-size:15px;font-weight:700;color:var(--t)">Toplu Rol Degistir</div></div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fg"><div class="fl">HEDEF ROL</div><select class="fi" id="br-role"><option value="staff">Personel</option><option value="lead">Takim Lideri</option><option value="manager">Yonetici</option></select></div>'
      + '<div class="fg" style="margin-top:8px"><div class="fl">KULLANICILAR</div>'
        + '<div style="max-height:250px;overflow-y:auto;border:1px solid var(--b);border-radius:8px">'
          + users.map(u => '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--b);cursor:pointer;font-size:12px"><input type="checkbox" class="br-cb" value="' + u.id + '" style="accent-color:var(--ac)"><span style="flex:1">' + escapeHtml(u.name) + '</span><span style="font-size:10px;color:var(--t3)">' + (ROLE_META[u.role]?.label||u.role) + '</span></label>').join('')
        + '</div></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-bulk-role\').remove()">Iptal</button>'
      + '<button class="btn btnp" onclick="window._doBulkRole()">Uygula</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window._doBulkRole = function() {
  const role = document.getElementById('br-role')?.value || 'staff';
  const ids = [...document.querySelectorAll('.br-cb:checked')].map(cb => parseInt(cb.value));
  if (!ids.length) { window.toast?.('Kullanici secin', 'err'); return; }
  const users = loadUsers();
  ids.forEach(id => { const u = users.find(x => x.id === id); if (u) { u.role = role; } });
  saveUsers(users);
  document.getElementById('mo-bulk-role')?.remove();
  _auditLog('bulk_role', 0, ids.length + ' kullanicinin rolu degistirildi: ' + role);
  window.toast?.(ids.length + ' kullanici → ' + (ROLE_META[role]?.label||role), 'ok');
  renderAdmin();
};

// ════════════════════════════════════════════════════════════════
// FİREBASE KULLANICI SENKRONİZASYONU
// ════════════════════════════════════════════════════════════════

/**
 * Firebase Auth ile localStorage/Firestore kullanıcılarını karşılaştırır.
 * Fazla kullanıcıları tespit eder, admin onayıyla siler.
 * @returns {void}
 */
async function firebaseSync() {
  if (!isAdmin()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }

  const fbAuth = window.Auth?.getFBAuth?.();
  if (!fbAuth) {
    window.toast?.('Firebase Auth bağlantısı yok', 'err');
    return;
  }

  // Modal oluştur — yükleniyor durumu
  let mo = document.getElementById('mo-fb-sync');
  if (mo) mo.remove();
  mo = document.createElement('div');
  mo.id = 'mo-fb-sync';
  mo.className = 'mo';
  mo.style.display = 'flex';
  mo.innerHTML = `
    <div class="moc" style="max-width:560px;padding:0;border-radius:16px;overflow:hidden;background:var(--sf);max-height:90vh;display:flex;flex-direction:column">
      <div style="padding:16px 20px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--t)">🔄 Firebase Kullanıcı Senkronizasyonu</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Firebase Auth ↔ Platform karşılaştırması</div>
        </div>
        <button onclick="document.getElementById('mo-fb-sync')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
      </div>
      <div id="fb-sync-body" style="flex:1;overflow-y:auto;padding:20px;display:flex;align-items:center;justify-content:center;min-height:200px">
        <div style="text-align:center">
          <div style="font-size:28px;margin-bottom:8px">⏳</div>
          <div style="font-size:13px;color:var(--t2)">Kullanıcılar kontrol ediliyor…</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };

  const localUsers = loadUsers();
  const onlyInLocal = [];     // Platformda var, Firebase'de yok
  const inBoth      = [];     // İkisinde de var
  const checkErrors = [];     // Kontrol edilemeyen

  // Her lokal kullanıcıyı Firebase Auth'ta ara
  for (const u of localUsers) {
    if (!u.email) {
      onlyInLocal.push({ ...u, reason: 'E-posta adresi yok' });
      continue;
    }
    try {
      const methods = await fbAuth.fetchSignInMethodsForEmail(u.email);
      if (methods && methods.length > 0) {
        inBoth.push(u);
      } else {
        onlyInLocal.push({ ...u, reason: 'Firebase Auth\'ta kayıtlı değil' });
      }
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        onlyInLocal.push({ ...u, reason: 'Geçersiz e-posta' });
      } else if (err.code === 'auth/user-not-found') {
        onlyInLocal.push({ ...u, reason: 'Firebase Auth\'ta bulunamadı' });
      } else {
        checkErrors.push({ ...u, error: err.message || err.code });
      }
    }
  }

  // Sonuçları göster
  const body = document.getElementById('fb-sync-body');
  if (!body) return;

  const escH = typeof escapeHtml === 'function' ? escapeHtml : (s => s);

  body.innerHTML = `
    <div style="width:100%">
      <!-- Özet -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#16A34A">${inBoth.length}</div>
          <div style="font-size:10px;color:var(--t3)">Eşleşen ✓</div>
        </div>
        <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#DC2626">${onlyInLocal.length}</div>
          <div style="font-size:10px;color:var(--t3)">Sadece Platform</div>
        </div>
        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#D97706">${checkErrors.length}</div>
          <div style="font-size:10px;color:var(--t3)">Kontrol Hatası</div>
        </div>
      </div>

      <!-- Eşleşen Kullanıcılar -->
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:#16A34A;margin-bottom:6px">✅ Eşleşen Kullanıcılar (${inBoth.length})</div>
        ${inBoth.length ? inBoth.map(u => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s2);border-radius:8px;margin-bottom:4px;font-size:12px">
            <span style="font-weight:600;color:var(--t)">${escH(u.name)}</span>
            <span style="color:var(--t3)">${escH(u.email)}</span>
            <span style="margin-left:auto;font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(34,197,94,.1);color:#16A34A">${u.role}</span>
          </div>
        `).join('') : '<div style="font-size:12px;color:var(--t3);padding:6px">—</div>'}
      </div>

      <!-- Sadece Platformda (Fazla) -->
      ${onlyInLocal.length ? `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:6px">⚠️ Sadece Platformda — Firebase'de Yok (${onlyInLocal.length})</div>
          ${onlyInLocal.map(u => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px;margin-bottom:4px;font-size:12px" id="fb-sync-row-${u.id}">
              <input type="checkbox" class="fb-sync-cb" value="${u.id}" checked style="accent-color:#DC2626;flex-shrink:0">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;color:var(--t)">${escH(u.name)}</div>
                <div style="font-size:10px;color:var(--t3)">${escH(u.email || '—')} · ${u.reason || ''}</div>
              </div>
              <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,.1);color:#DC2626">${u.role}</span>
            </div>
          `).join('')}
        </div>
        <div style="padding:10px 12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;margin-bottom:14px">
          <div style="font-size:11px;color:#DC2626;font-weight:600;margin-bottom:4px">⚠️ Seçili kullanıcıları platformdan silmek istiyor musunuz?</div>
          <div style="font-size:10px;color:var(--t3)">Bu kullanıcılar Firebase Auth'ta kayıtlı değil. Çöp kutusuna gönderilecek.</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btns" onclick="document.getElementById('mo-fb-sync')?.remove()" style="font-size:12px">İptal</button>
          <button class="btn btnp" id="fb-sync-delete-btn" onclick="window._fbSyncDeleteSelected?.()" style="font-size:12px;background:#DC2626;border-color:#DC2626">🗑 Seçilenleri Sil</button>
        </div>
      ` : `
        <div style="text-align:center;padding:16px;background:rgba(34,197,94,.06);border-radius:10px">
          <div style="font-size:18px;margin-bottom:4px">✅</div>
          <div style="font-size:13px;font-weight:600;color:#16A34A">Tüm kullanıcılar senkronize</div>
          <div style="font-size:11px;color:var(--t3)">Fazla kullanıcı bulunamadı</div>
        </div>
      `}

      <!-- Kontrol Hataları -->
      ${checkErrors.length ? `
        <div style="margin-top:10px">
          <div style="font-size:12px;font-weight:700;color:#D97706;margin-bottom:6px">⚠️ Kontrol Edilemeyenler (${checkErrors.length})</div>
          ${checkErrors.map(u => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(245,158,11,.06);border-radius:8px;margin-bottom:4px;font-size:12px">
              <span style="font-weight:600;color:var(--t)">${escH(u.name)}</span>
              <span style="color:var(--t3)">${escH(u.email || '—')}</span>
              <span style="margin-left:auto;font-size:10px;color:#D97706">${escH(u.error)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
}

/**
 * @description Firebase Sync modalında seçili fazla kullanıcıları siler (soft-delete).
 */
window._fbSyncDeleteSelected = function() {
  const checkboxes = document.querySelectorAll('.fb-sync-cb:checked');
  if (!checkboxes.length) {
    window.toast?.('Silinecek kullanıcı seçilmedi', 'err');
    return;
  }

  const idsToDelete = [...checkboxes].map(cb => parseInt(cb.value));
  const cuId = _getCU()?.id;

  // Kendini silme kontrolü
  if (idsToDelete.includes(cuId)) {
    window.toast?.('Kendinizi silemezsiniz', 'err');
    return;
  }

  const users = loadUsers();
  const trash = JSON.parse(localStorage.getItem('ak_trash') || '[]');
  const deletedNames = [];

  idsToDelete.forEach(id => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    // Soft-delete → çöp kutusuna
    trash.unshift({
      ...u,
      _trashType: 'user',
      _deletedAt: nowTs(),
      _deletedBy: cuId,
      _deletedReason: 'Firebase Sync — Firebase Auth\'ta kayıtlı değil'
    });
    deletedNames.push(u.name);
  });

  localStorage.setItem('ak_trash', JSON.stringify(trash));
  saveUsers(users.filter(u => !idsToDelete.includes(u.id)));
  logActivity('user', 'Firebase Sync: ' + deletedNames.length + ' fazla kullanıcı silindi: ' + deletedNames.join(', '));

  document.getElementById('mo-fb-sync')?.remove();
  window.toast?.('🔄 ' + deletedNames.length + ' kullanıcı silindi: ' + deletedNames.join(', '), 'ok');
  renderAdmin();
};

// ════════════════════════════════════════════════════════════════
// YETKİ GÜVEN SKORU (Trust Score)
// ════════════════════════════════════════════════════════════════

/**
 * Kullanıcının güven skorunu hesaplar (0-100).
 * Onaylanan işlem sayısı, giriş sıklığı, yetki aşımı denemeleri.
 * @param {Object} u - Kullanıcı nesnesi
 * @returns {{ score, approvedOps, loginFreq, violations }}
 */
function _calcTrustScore(u) {
  var tasks = typeof window.loadTasks === 'function' ? window.loadTasks() : [];
  var pirim = typeof window.loadPirim === 'function' ? window.loadPirim() : [];
  var acts  = typeof window.loadAct  === 'function' ? window.loadAct()  : [];

  // Onaylanan işlemler
  var myTasks = tasks.filter(function(t) { return t.uid === u.id && (t.done || t.status === 'done'); });
  var myPrims = pirim.filter(function(p) { return p.uid === u.id && (p.status === 'approved' || p.status === 'paid'); });
  var approvedOps = myTasks.length + myPrims.length;
  var opsScore = Math.min(40, Math.round(approvedOps * 2)); // max 40 puan

  // Giriş sıklığı (son 30 gün)
  var loginFreq = 0;
  if (u.lastLogin) {
    var lastMs = new Date(u.lastLogin.replace(' ', 'T')).getTime();
    var daysSince = Math.floor((Date.now() - lastMs) / 86400000);
    if (daysSince <= 1) loginFreq = 30;
    else if (daysSince <= 7) loginFreq = 25;
    else if (daysSince <= 14) loginFreq = 15;
    else if (daysSince <= 30) loginFreq = 5;
  }

  // Yetki aşımı denemeleri (aktivite logunda "yetki" veya "err" içerenler)
  var violations = 0;
  acts.forEach(function(a) {
    if (a.uid === u.id && ((a.detail || '').toLowerCase().includes('yetki') && (a.detail || '').toLowerCase().includes('yok'))) {
      violations++;
    }
  });
  var violationPenalty = Math.min(30, violations * 5); // her aşım -5 puan

  var score = Math.max(0, Math.min(100, opsScore + loginFreq + 30 - violationPenalty));

  return {
    score: score,
    approvedOps: approvedOps,
    loginFreq: loginFreq <= 1 ? 'Yok' : (loginFreq >= 25 ? 'Yüksek' : loginFreq >= 15 ? 'Orta' : 'Düşük'),
    violations: violations,
  };
}

// ════════════════════════════════════════════════════════════════
// YETKİ ŞABLONU KLONLAMA
// ════════════════════════════════════════════════════════════════

/**
 * Bir kullanıcının tüm yetki/modül/rol ayarlarını başka kullanıcıdan kopyalar.
 * @param {number} targetUid - Hedef kullanıcı ID
 */
/**
 * Oturum limiti kaydeder.
 */
window._saveMaxSessions = function(uid) {
  if (!isAdmin()) return;
  var sel = document.getElementById('adm-max-sessions-' + uid);
  if (!sel) return;
  var val = parseInt(sel.value || '0');
  var users = loadUsers();
  var u = users.find(function(x) { return x.id === uid; });
  if (!u) return;
  u.maxSessions = val;
  saveUsers(users);
  window.toast?.('Oturum limiti güncellendi: ' + (val === 0 ? 'Sınırsız' : val + ' oturum'), 'ok');
  logActivity('user', 'Oturum limiti: ' + u.name + ' → ' + (val === 0 ? 'Sınırsız' : val));
};

window._cloneUserPerms = function(targetUid) {
  if (!isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  var users = loadUsers();
  var target = users.find(function(x) { return x.id === targetUid; });
  if (!target) return;

  var old = document.getElementById('mo-clone-perms'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-clone-perms'; 
  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:12px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:14px;font-weight:700;color:var(--t)">📋 Yetki Klonla</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-top:2px">Hedef: <b>' + escapeHtml(target.name) + '</b></div>'
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fl" style="margin-bottom:6px">KAYNAK KULLANICI</div>'
      + '<select class="fi" id="clone-source" style="font-size:13px">'
        + '<option value="">— Kopyalanacak kullanıcı seçin —</option>'
        + users.filter(function(u) { return u.id !== targetUid; }).map(function(u) {
            var rm = ROLE_META[u.role] || ROLE_META.staff;
            return '<option value="' + u.id + '">' + escapeHtml(u.name) + ' (' + rm.label + ')</option>';
          }).join('')
      + '</select>'
      + '<div style="margin-top:10px;padding:8px 12px;background:var(--s2);border-radius:8px;font-size:11px;color:var(--t3)">Kopyalanacaklar: Rol, modül izinleri, döküman erişimi, özel yetkiler</div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-clone-perms\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._execClonePerms(' + targetUid + ')">Klonla</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/**
 * Klonlama işlemini gerçekleştirir.
 */
window._execClonePerms = function(targetUid) {
  var sourceId = parseInt(document.getElementById('clone-source')?.value || '0');
  if (!sourceId) { window.toast?.('Kaynak kullanıcı seçin', 'err'); return; }

  var users  = loadUsers();
  var source = users.find(function(x) { return x.id === sourceId; });
  var target = users.find(function(x) { return x.id === targetUid; });
  if (!source || !target) return;

  var msg = '"' + escapeHtml(source.name) + '" kullanıcısının tüm yetkileri "' + escapeHtml(target.name) + '" kullanıcısına kopyalanacak. Emin misiniz?';

  window.confirmModal(msg, {
    title: 'Yetki Klonla',
    confirmText: 'Evet, Klonla',
    onConfirm: function() {
      var oldRole = target.role;
      target.role        = source.role;
      target.modules     = source.modules ? source.modules.slice() : null;
      target.access      = source.access  ? source.access.slice()  : [];
      target.permissions = source.permissions ? JSON.parse(JSON.stringify(source.permissions)) : null;

      // Rol değiştiyse roleHistory'ye ekle
      if (oldRole !== target.role) {
        if (!Array.isArray(target.roleHistory)) target.roleHistory = [];
        target.roleHistory.push({ previousRole: oldRole, role: target.role, changedBy: _getCU()?.id, changedAt: nowTs() });
      }

      saveUsers(users);
      document.getElementById('mo-clone-perms')?.remove();
      renderAdmin();
      window.toast?.('Yetkiler klonlandı: ' + source.name + ' → ' + target.name, 'ok');
      logActivity('user', 'Yetki klonlama: ' + source.name + ' → ' + target.name);
    }
  });
};

// ════════════════════════════════════════════════════════════════
// BİRLEŞİK KULLANICI YÖNETİM MODALI
// ════════════════════════════════════════════════════════════════

/**
 * Full-screen kullanıcı yönetim modalı — Profil + İzinler + Aktivite
 */
window._openUserManageModal = function(uid) {
  if (!isAdmin()) return;
  var users = loadUsers();
  var u = users.find(function(x) { return x.id === uid; });
  if (!u) return;
  var rm = ROLE_META[u.role] || ROLE_META.staff;
  var av = initials(u.name);
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var old = document.getElementById('mo-user-manage'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-user-manage'; 

  // Departman listesi
  var depts = [];
  try { depts = JSON.parse(localStorage.getItem('ak_departments') || '[]'); } catch(e) {}
  if (!depts.length) depts = ['IK','Finans','Operasyon','Satis','Lojistik','Teknik','Muhasebe'];
  var deptOpts = '<option value="">—</option>' + depts.map(function(d) { return '<option value="' + esc(d) + '"' + (u.dept === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('');
  var roleOpts = ['admin','manager','lead','staff'].map(function(r) { var m = ROLE_META[r]||{}; return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (m.icon||'') + ' ' + (m.label||r) + '</option>'; }).join('');

  // Aktivite log
  var acts = typeof loadAct === 'function' ? loadAct() : [];
  var userActs = acts.filter(function(a) { return a.uid === uid; }).slice(0, 20);

  mo.innerHTML = '<div class="moc" style="min-width:min(92vw,1000px);max-width:1000px;height:88vh;padding:0;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;background:#fff">'
    // Header — kullanıcı bilgisi
    + '<div style="padding:18px 24px;border-bottom:1px solid #F0F0F0;display:flex;align-items:center;gap:16px;flex-shrink:0">'
      + '<div style="width:52px;height:52px;border-radius:14px;background:' + rm.bg + ';border:2px solid ' + rm.border + ';display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:' + rm.color + '">' + esc(av) + '</div>'
      + '<div style="flex:1">'
        + '<div style="font-size:17px;font-weight:700;color:#1C1C1E">' + esc(u.name) + '</div>'
        + '<div style="font-size:12px;color:#8E8E93;margin-top:2px">' + esc(u.email || '') + '</div>'
      + '</div>'
      + '<span style="font-size:11px;padding:4px 12px;border-radius:8px;background:' + rm.bg + ';color:' + rm.color + ';font-weight:600">' + rm.icon + ' ' + rm.label + '</span>'
      + '<button onclick="document.getElementById(\'mo-user-manage\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:#8E8E93">×</button>'
    + '</div>'

    // Sekmeler
    + '<div style="display:flex;border-bottom:1px solid #F0F0F0;flex-shrink:0">'
      + '<button class="um-tab active" data-tab="profile" onclick="window._umSwitchTab(\'profile\')" style="padding:12px 24px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#007AFF;border-bottom:2px solid #007AFF;font-family:inherit">👤 Profil</button>'
      + '<button class="um-tab" data-tab="perms" onclick="window._umSwitchTab(\'perms\')" style="padding:12px 24px;border:none;background:none;cursor:pointer;font-size:13px;color:#8E8E93;border-bottom:2px solid transparent;font-family:inherit">🔑 İzinler</button>'
      + '<button class="um-tab" data-tab="activity" onclick="window._umSwitchTab(\'activity\')" style="padding:12px 24px;border:none;background:none;cursor:pointer;font-size:13px;color:#8E8E93;border-bottom:2px solid transparent;font-family:inherit">📊 Aktivite</button>'
    + '</div>'

    // İçerik
    + '<div style="flex:1;overflow-y:auto;padding:20px 24px">'
      // Profil sekmesi
      + '<div id="um-panel-profile" class="um-panel">'
        // Oturum Politikası — üstte
        + '<div style="background:#F2F2F7;border-radius:12px;padding:14px;margin-bottom:16px">'
          + '<div style="font-size:12px;font-weight:700;color:#1C1C1E;margin-bottom:8px">🔐 Oturum Politikası</div>'
          + '<div style="display:flex;gap:12px;align-items:center">'
            + '<div style="flex:1"><div class="fl">EŞ ZAMANLI OTURUM</div><select class="fi" id="um-sessions" style="font-size:13px;padding:8px 10px"><option value="0"' + ((u.maxSessions || 0) === 0 ? ' selected' : '') + '>Sınırsız</option><option value="1"' + (u.maxSessions === 1 ? ' selected' : '') + '>1</option><option value="2"' + (u.maxSessions === 2 ? ' selected' : '') + '>2</option><option value="3"' + (u.maxSessions === 3 ? ' selected' : '') + '>3</option></select></div>'
            + '<div style="flex:2">'
              + '<div class="fl">AKTİF OTURUMLAR</div>'
              + (function() {
                  var sessions = typeof window._getUserSessions === 'function' ? window._getUserSessions(u.id) : [];
                  var curSid = localStorage.getItem('ak_current_session') || '';
                  if (!sessions.length) return '<div style="font-size:11px;color:#8E8E93">Oturum yok</div>';
                  return sessions.map(function(s2) {
                    var isCur = s2.sessionId === curSid;
                    var ago = Math.round((Date.now() - s2.ts) / 60000);
                    return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px">'
                      + '<span>' + (isCur ? '🟢' : '⚪') + '</span>'
                      + '<span style="flex:1;color:#1C1C1E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s2.device || '?').slice(0, 30) + '</span>'
                      + '<span style="color:#8E8E93">' + (ago < 60 ? ago + 'dk' : Math.round(ago / 60) + 'sa') + '</span>'
                      + (!isCur ? '<button onclick="window._endSession?.(\'' + s2.sessionId + '\');window._openUserManageModal?.(' + u.id + ')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#DC2626">✕</button>' : '')
                    + '</div>';
                  }).join('');
                })()
            + '</div>'
          + '</div>'
        + '</div>'
        // Profil alanları
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
          + '<div><div class="fl">İSİM</div><input class="fi" id="um-name" value="' + esc(u.name) + '" style="font-size:14px;padding:10px 12px"></div>'
          + '<div><div class="fl">E-POSTA</div><input class="fi" id="um-email" value="' + esc(u.email || '') + '" style="font-size:14px;padding:10px 12px"></div>'
          + '<div><div class="fl">ROL</div><select class="fi" id="um-role" style="font-size:14px;padding:10px 12px">' + roleOpts + '</select></div>'
          + '<div><div class="fl">DEPARTMAN</div><select class="fi" id="um-dept" style="font-size:14px;padding:10px 12px">' + deptOpts + '</select></div>'
          + '<div><div class="fl">DURUM</div><select class="fi" id="um-status" style="font-size:14px;padding:10px 12px"><option value="active"' + (u.status === 'active' ? ' selected' : '') + '>Aktif</option><option value="suspended"' + (u.status !== 'active' ? ' selected' : '') + '>Pasif</option></select></div>'
        + '</div>'
      + '</div>'
      // İzinler sekmesi
      + '<div id="um-panel-perms" class="um-panel" style="display:none">'
        + '<div style="text-align:center;padding:20px;color:#8E8E93">Modül izinleri için <button onclick="document.getElementById(\'mo-user-manage\').remove();Admin.openPermModal(' + uid + ')" class="btn btnp" style="font-size:12px">🔑 İzin Modalını Aç</button></div>'
      + '</div>'
      // Aktivite sekmesi
      + '<div id="um-panel-activity" class="um-panel" style="display:none">'
        + '<div style="margin-bottom:14px"><span style="font-size:12px;color:#8E8E93">Son giriş:</span> <b style="color:#1C1C1E">' + (u.lastLogin || 'Hiç') + '</b></div>'
        + '<div style="font-size:12px;font-weight:600;color:#1C1C1E;margin-bottom:8px">Son 20 İşlem</div>'
        + (userActs.length ? userActs.map(function(a) {
            return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F5F5F5;font-size:11px">'
              + '<span style="color:#8E8E93;min-width:110px">' + (a.ts || '—') + '</span>'
              + '<span style="color:#1C1C1E">' + esc(a.detail || a.type || '—') + '</span>'
            + '</div>';
          }).join('') : '<div style="color:#8E8E93;font-size:12px">Aktivite kaydı yok</div>')
      + '</div>'
    + '</div>'

    // Footer
    + '<div style="padding:14px 24px;border-top:1px solid #F0F0F0;background:#F9FAFB;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">'
      + '<button class="btn" onclick="document.getElementById(\'mo-user-manage\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._umSaveAll?.(' + uid + ')">Kaydet</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/**
 * Sekme geçişi.
 */
window._umSwitchTab = function(tab) {
  document.querySelectorAll('.um-tab').forEach(function(t) {
    var active = t.dataset.tab === tab;
    t.style.color = active ? '#007AFF' : '#8E8E93';
    t.style.borderBottomColor = active ? '#007AFF' : 'transparent';
    t.style.fontWeight = active ? '600' : '400';
  });
  document.querySelectorAll('.um-panel').forEach(function(p) { p.style.display = 'none'; });
  var panel = document.getElementById('um-panel-' + tab);
  if (panel) panel.style.display = '';
};

/**
 * Tüm profil değişikliklerini tek seferde kaydeder.
 */
window._umSaveAll = function(uid) {
  var users = loadUsers();
  var u = users.find(function(x) { return x.id === uid; });
  if (!u) return;

  var name = (document.getElementById('um-name')?.value || '').trim();
  var email = (document.getElementById('um-email')?.value || '').trim().toLowerCase();
  if (!name || !email) { window.toast?.('İsim ve e-posta zorunlu', 'err'); return; }

  var oldRole = u.role;
  var newRole = document.getElementById('um-role')?.value || u.role;

  u.name = name;
  u.email = email;
  u.role = newRole;
  u.dept = document.getElementById('um-dept')?.value || '';
  u.status = document.getElementById('um-status')?.value || 'active';
  u.maxSessions = parseInt(document.getElementById('um-sessions')?.value || '0');

  // Rol değiştiyse roleHistory ekle
  if (oldRole !== newRole) {
    if (!Array.isArray(u.roleHistory)) u.roleHistory = [];
    u.roleHistory.push({ previousRole: oldRole, role: newRole, changedBy: _getCU()?.id, changedAt: nowTs() });
    window.addNotif?.('🔑', 'Rol değiştirildi: ' + (ROLE_META[newRole]?.label || newRole), 'warn', 'admin', uid);
  }

  saveUsers(users);
  document.getElementById('mo-user-manage')?.remove();
  renderAdmin();
  logActivity('user', 'Kullanıcı güncellendi: ' + name);
  window.toast?.('Kaydedildi ✓', 'ok');
};

// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════
const Admin = {
  render:            renderAdmin,
  renderLog:         renderActivityLog,
  renderSuggestions,
  openModal:         openAdminModal,
  save:              saveAdminUser,
  saveUser:          saveAdminUser,
  suspend:           suspendUser,
  activate:          activateUser,
  resetPassword,
  deleteUser,
  openPermModal,
  savePermissions,
  _toggleAllPerms,
  autoSetRolePerms,
  setAllPerms,
  updateSuggStatus,
  deleteSugg,
  submitSuggestion,
  addUpdateBanner,
  showAllUpdateBanners,
  // Yeni özellikler
  showUserActivity,
  openSessionManager,
  registerSession,
  openNotifPrefs,
  checkInactiveUsers,
  openInviteModal,
  redeemInvite,
  applyPermTemplate,
  calcUserScore,
  openDeptModal,
  openAuditLog,
  PERM_TEMPLATES,
  startImpersonation,
  stopImpersonation,
  setPermExpiry,
  checkPermExpiry,
  openBulkRoleChange,
  firebaseSync,
  calcTrustScore: _calcTrustScore,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Admin;
} else {
  window.Admin = Admin;
  // V18 eklenen fonksiyonlar
  window._adminRenderUsers = renderUsers; // panel_stubs.js tarafından çağrılır
  window.renderUsers = function(...args) {
  if (window._adminSaving) return; // Kayıt sırasında form ezilmesin
  try {
    return renderUsers(...args);
  } catch(err) {
    console.error('[renderUsers]', err);
    const el = document.getElementById('users-list') ||
               document.querySelector('[id*="users"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.filterUsers         = filterUsers;
  window.editUser            = editUser;
  window.openNewUser         = openNewUser;
  window.saveUser            = saveAdminUser;   // modals.js onclick="saveUser()" için
  window.autoSetRolePerms    = autoSetRolePerms; // modals.js onclick="autoSetRolePerms()" için
  window.setAllPerms         = setAllPerms;      // modals.js onclick="setAllPerms()" için
  window.toggleUser          = toggleUser;
  window.renderSettingsAdmin = renderSettingsAdmin;
  window._injectUsersPanel   = _injectUsersPanel;
  // G4: Excel export
  window.exportUsersXlsx     = exportUsersXlsx;
  // G5: Bulk actions
  window._onBulkCb           = _onBulkCb;
  window._bulkSelectAll      = _bulkSelectAll;
  window._clearBulk          = _clearBulk;
  window._bulkToggle         = _bulkToggle;
  window._bulkDelete         = _bulkDelete;
  // G7: Sort
  window._sortUsers          = _sortUsers;
  // G8: Password strength
  window._pwStrength         = _pwStrength;
  window._onPwInput          = _onPwInput;
  // G6: Debounce search
  window._debouncedSearch    = _debouncedSearch;
  // Geriye uyumluluk
  window.renderAdmin = function(...args) {
  try {
    return renderAdmin(...args);
  } catch(err) {
    console.error('[renderAdmin]', err);
    const el = document.getElementById('admin-list') ||
               document.querySelector('[id*="admin"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.renderActivityLog  = renderActivityLog;
  window.submitSuggestion   = submitSuggestion;
  window.showPanelUpdateBanner = showPanelUpdateBanner;
  window.showAllUpdateBanners  = showAllUpdateBanners;

  /** User kendi yetkilerini görür (salt okunur) */
  window.viewMyPermissions = function() {
    var cu = _getCU(); if (!cu) return;
    var users = loadUsers();
    var u = users.find(function(x) { return x.id === cu.id; });
    if (!u) return;
    var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
    var mods = u.modules === null ? 'Tüm modüller' : (Array.isArray(u.modules) ? u.modules.join(', ') : '—');
    var perms = u.permissions || {};
    var permLog = u.permissionLog || [];
    var ex = document.getElementById('mo-my-perms'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-my-perms'; 
    mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
      + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:14px;font-weight:700;color:var(--t)">🔐 Yetkilerim</div></div>'
      + '<div style="padding:16px 20px;max-height:60vh;overflow-y:auto">'
      + '<div style="margin-bottom:12px"><span style="font-size:11px;color:var(--t3)">Rol:</span> <b>' + esc(u.role) + '</b></div>'
      + '<div style="margin-bottom:12px"><span style="font-size:11px;color:var(--t3)">Modüller:</span> <div style="font-size:12px;color:var(--t);margin-top:4px">' + esc(mods) + '</div></div>'
      + '<div style="margin-bottom:12px"><span style="font-size:11px;color:var(--t3)">Yetki Seviyeleri:</span>'
      + '<div style="margin-top:4px">' + (Object.keys(perms).length ? Object.entries(perms).map(function(e) {
          var lvlColor = e[1] === 'full' ? '#16A34A' : e[1] === 'edit' ? '#3B82F6' : e[1] === 'view' ? '#F59E0B' : '#9CA3AF';
          return '<span style="display:inline-block;font-size:10px;padding:2px 8px;border-radius:4px;margin:2px;background:' + lvlColor + '22;color:' + lvlColor + ';font-weight:600">' + esc(e[0]) + ': ' + e[1] + '</span>';
        }).join('') : '<span style="font-size:11px;color:var(--t3)">Varsayılan</span>') + '</div></div>'
      + (permLog.length ? '<div><span style="font-size:11px;color:var(--t3)">Son Değişiklikler:</span>'
        + permLog.slice(-5).reverse().map(function(l) {
            return '<div style="font-size:10px;color:var(--t3);padding:3px 0;border-bottom:1px solid var(--b)">' + (l.ts || '').slice(0,16) + ' — ' + esc(l.changedByName || '—') + '</div>';
          }).join('') + '</div>' : '')
      + '</div>'
      + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn" onclick="document.getElementById(\'mo-my-perms\')?.remove()">Kapat</button>'
      + '</div></div>';
    document.body.appendChild(mo);
    mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
    setTimeout(function() { mo.classList.add('open'); }, 10);
  };
}

})();
