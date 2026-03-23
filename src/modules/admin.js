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
let USERS_VIEW='card'; // 'card' | 'table';
function initials(n){return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);}


// ── Sabitler ─────────────────────────────────────────────────────

// ── Yardımcılar ──────────────────────────────────────────────────

// ── Render: Kullanıcı Listesi ─────────────────────────────────────
function renderAdmin() {
  if (!isAdmin()) {
    const cont = g('admin-list');
    if (cont) cont.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)">
      ${window.t ? t('err.permission') : 'Bu panele erişim yetkiniz yok.'}</div>`;
    return;
  }

  const users  = loadUsers();
  const search = (g('admin-search')?.value || '').toLowerCase();
  const roleF  = g('admin-role-f')?.value  || '';
  const statF  = g('admin-status-f')?.value || '';

  let fl = users;
  if (search) fl = fl.filter(u =>
    u.name.toLowerCase().includes(search) ||
    (u.email || '').toLowerCase().includes(search)
  );
  if (roleF)  fl = fl.filter(u => u.role   === roleF);
  if (statF)  fl = fl.filter(u => u.status === statF);

  // İstatistikler
  st('admin-total',     users.length);
  st('admin-active',    users.filter(u => u.status === 'active').length);
  st('admin-suspended', users.filter(u => u.status === 'suspended').length);
  st('admin-admins',    users.filter(u => u.role   === 'admin').length);

  const cont = g('admin-list');
  if (!cont) return;
  if (!fl.length) {
    cont.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)">
      <div style="font-size:28px;margin-bottom:8px">👤</div>
      ${window.t ? t('lbl.noData') : 'Kullanıcı bulunamadı.'}</div>`;
    return;
  }

  cont.innerHTML = `<table class="tbl"><thead><tr>
    <th>${window.t ? t('admin.col.name')    : 'Ad Soyad'}</th>
    <th>${window.t ? t('admin.col.email')   : 'E-posta'}</th>
    <th>${window.t ? t('admin.col.role')    : 'Rol'}</th>
    <th>${window.t ? t('admin.col.status')  : 'Durum'}</th>
    <th>${window.t ? t('admin.col.modules') : 'Modüller'}</th>
    <th>${window.t ? t('admin.col.action')  : 'İşlem'}</th>
  </tr></thead><tbody>
  ${fl.map(u => _userRow(u)).join('')}
  </tbody></table>`;
}

function _userRow(u) {
  const isSelf    = u.id === CU()?.id;
  const roleLabel = u.role === 'admin'
    ? `<span class="badge bp">${window.t ? t('admin.role.admin') : '👑 Yönetici'}</span>`
    : `<span class="badge bgr">${window.t ? t('admin.role.user')  : '👤 Kullanıcı'}</span>`;
  const statusLabel = u.status === 'active'
    ? `<span class="badge bg">${window.t ? t('admin.status.active') : '✅ Aktif'}</span>`
    : `<span class="badge br">${window.t ? t('admin.status.suspended') : '⏸ Askıda'}</span>`;

  const moduleCount = (u.modules && u.role !== 'admin')
    ? `<span style="font-size:11px;color:var(--t2)">${u.modules.length} modül</span>`
    : `<span style="font-size:11px;color:var(--gr)">Tümü</span>`;

  const av = (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:${u.color || '#3C3489'};
             display:flex;align-items:center;justify-content:center;font-size:11px;
             font-weight:700;color:#fff;flex-shrink:0">${av}</div>
        <div>
          <div style="font-weight:600">${u.name}</div>
          ${u.dept ? `<div style="font-size:11px;color:var(--t3)">${u.dept}</div>` : ''}
        </div>
      </div>
    </td>
    <td style="font-size:12px;color:var(--t2)">${u.email || '—'}</td>
    <td>${roleLabel}</td>
    <td>${statusLabel}</td>
    <td>${moduleCount}</td>
    <td>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btns" onclick="Admin.openModal(${u.id})" title="Düzenle">✏️</button>
        <button class="btn btns" onclick="Admin.openPermModal(${u.id})" title="Modül Yetkileri">🔑</button>
        ${u.status === 'active'
          ? `<button class="btn btns ba" onclick="Admin.suspend(${u.id})" title="${window.t ? t('admin.suspend') : 'Askıya Al'}"
               ${isSelf ? 'disabled style="opacity:.4"' : ''}>⏸</button>`
          : `<button class="btn btns btng" onclick="Admin.activate(${u.id})" title="${window.t ? t('admin.activate') : 'Aktif Et'}">▶</button>`
        }
        <button class="btn btns" onclick="Admin.resetPassword(${u.id})" title="${window.t ? t('admin.resetPwd') : 'Şifre Sıfırla'}">🔒</button>
        <button class="btn btns btnd" onclick="Admin.deleteUser(${u.id})"
          title="${window.t ? t('admin.deleteUser') : 'Sil'}"
          ${isSelf ? 'disabled style="opacity:.4"' : ''}>🗑</button>
      </div>
    </td>
  </tr>`;
}

// ── Modal: Kullanıcı Ekleme / Düzenleme ──────────────────────────

// ── saveUser — modaldaki Kaydet butonunun çağırdığı fonksiyon ────
function saveUser() {
  if (!isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }

  const name  = (g('adm-name')?.value  || '').trim();
  const email = (g('adm-email')?.value || '').trim().toLowerCase();
  const role  = g('adm-role')?.value   || 'staff';
  const dept  = (g('adm-dept')?.value  || '').trim();
  const status= g('adm-st')?.value     || 'active';
  const pwd   = (g('adm-pwd')?.value   || '').trim();
  const eid   = parseInt(g('adm-eid')?.value || '0');

  if (!name)  { window.toast?.('Ad Soyad zorunludur', 'err'); return; }
  if (!email) { window.toast?.('E-posta zorunludur', 'err');  return; }
  if (!eid && !pwd) { window.toast?.('Yeni kullanıcı için şifre zorunludur', 'err'); return; }
  if (pwd && pwd.length < 6) { window.toast?.('Şifre en az 6 karakter olmalı', 'err'); return; }

  const users = loadUsers();
  const dup   = users.find(u => u.email === email && u.id !== eid);
  if (dup) { window.toast?.('Bu e-posta zaten kayıtlı', 'err'); return; }

  // Modül yetkileri
  const modules = [];
  document.querySelectorAll('.perm-cb:checked').forEach(cb => modules.push(cb.id.replace('pm-', '')));

  // Döküman erişimi
  const accessMap = { 'pa-ik':'İK', 'pa-fn':'Finans', 'pa-op':'Operasyon', 'pa-tk':'Teknik', 'pa-ms':'Maaş', 'pa-ss':'Sistem' };
  const access = Object.entries(accessMap).filter(([id]) => g(id)?.checked).map(([,v]) => v);

  const doSave = (avatarData) => {
    const cu = typeof CU === 'function' ? CU() : (window.Auth?.getCU?.() || null);
    if (eid) {
      const u = users.find(x => x.id === eid);
      if (!u) return;
      Object.assign(u, { name, email, role, dept, status, modules, access });
      if (pwd)        u.password = pwd;
      if (avatarData) u.avatar   = avatarData;
      window.toast?.(`${name} güncellendi ✓`, 'ok');
      logActivity('user', `Kullanıcı güncellendi: "${name}" (${email})`);
    } else {
      users.push({
        id:        Date.now(),
        name, email, role, dept, status,
        password:  pwd,
        modules:   role === 'admin' ? null : modules,
        access,
        avatar:    avatarData || null,
        status:    status,
        createdBy: cu?.id,
        createdAt: nowTs(),
      });
      window.toast?.(`${name} eklendi ✓`, 'ok');
      logActivity('user', `Yeni kullanıcı: "${name}" (${email})`);
    }
    saveUsers(users);
    window.closeMo?.('mo-admin-user');
    renderAdmin();
    // renderUsers varsa onu da güncelle
    if (typeof renderUsers === 'function') renderUsers();
  };

  const avatarFile = g('adm-avatar-file')?.files?.[0];
  if (avatarFile) {
    const r = new FileReader();
    r.onload = ev => doSave(ev.target.result);
    r.readAsDataURL(avatarFile);
  } else {
    // Düzenlemede mevcut avatarı koru
    if (eid) {
      const existing = users.find(x => x.id === eid);
      doSave(existing?.avatar || null);
    } else {
      doSave(null);
    }
  }
}

// ── autoSetRolePerms — role göre modül checkboxlarını ayarla ─────
function autoSetRolePerms() {
  const role = g('adm-role')?.value || 'staff';
  const defaults = (typeof ROLE_DEFAULT_MODULES !== 'undefined')
    ? ROLE_DEFAULT_MODULES[role] || ROLE_DEFAULT_MODULES.staff
    : [];
  const isAdmin2 = role === 'admin';
  document.querySelectorAll('.perm-cb').forEach(cb => {
    const modId = cb.id.replace('pm-', '');
    cb.checked  = isAdmin2 || defaults.includes(modId);
  });
}

// ── setAllPerms — tümünü aç/kapat ───────────────────────────────
function setAllPerms(checked) {
  document.querySelectorAll('.perm-cb').forEach(cb => { cb.checked = checked; });
}

// ── Departman yönetimi ─────────────────────────────────────────
function loadDepts() {
  return JSON.parse(localStorage.getItem('ak_depts') || '[]');
}
function saveDepts(d) { localStorage.setItem('ak_depts', JSON.stringify(d)); }

function renderDeptList() {
  const cont = g('dept-list'); if (!cont) return;
  const depts = loadDepts();
  if (!depts.length) {
    cont.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--t3)">Henüz departman yok.</div>';
    return;
  }
  const users = loadUsers();
  cont.innerHTML = depts.map((d, i) => {
    const cnt = users.filter(u => u.dept === d.name).length;
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;background:var(--s2);margin-bottom:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${d.color||'var(--ac)'}"></div>
      <span style="flex:1;font-size:13px;font-weight:500">${d.name}</span>
      <span style="font-size:11px;color:var(--t3)">${cnt} kişi</span>
      <button onclick="deleteDept(${i})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0 2px">✕</button>
    </div>`;
  }).join('');
}

function addDept() {
  const nameEl  = g('dept-name-inp');
  const colorEl = g('dept-color-inp');
  const name    = (nameEl?.value || '').trim();
  if (!name) { window.toast?.('Departman adı zorunludur', 'err'); return; }
  const depts = loadDepts();
  if (depts.find(d => d.name === name)) { window.toast?.('Bu departman zaten var', 'err'); return; }
  depts.push({ name, color: colorEl?.value || '#3C3489' });
  saveDepts(depts);
  if (nameEl) nameEl.value = '';
  renderDeptList();
  updateDeptSelect();
  window.toast?.(`"${name}" eklendi ✓`, 'ok');
}

function deleteDept(idx) {
  const depts = loadDepts();
  const name  = depts[idx]?.name;
  depts.splice(idx, 1);
  saveDepts(depts);
  renderDeptList();
  updateDeptSelect();
  window.toast?.(`"${name}" silindi`, 'ok');
}

function updateDeptSelect() {
  const sel = g('adm-dept'); if (!sel) return;
  const cur   = sel.value;
  const depts = loadDepts();
  sel.innerHTML = '<option value="">-- Seç --</option>'
    + depts.map(d => `<option value="${d.name}"${cur===d.name?' selected':''}>${d.name}</option>`).join('');
}

function openAdminModal(id) {
  if (!isAdmin()) return;
  updateDeptSelect();

  // Avatar sıfırla
  const avatarPreview  = g('adm-avatar-preview');
  const avatarInitials = g('adm-avatar-initials');
  const avatarFile     = g('adm-avatar-file');
  if (avatarFile) avatarFile.value = '';

  if (id) {
    const u = loadUsers().find(x => x.id === id);
    if (!u) return;
    if (g('adm-name'))  g('adm-name').value  = u.name  || '';
    if (g('adm-email')) g('adm-email').value = u.email || '';
    if (g('adm-role'))  g('adm-role').value  = u.role  || 'staff';
    if (g('adm-dept'))  g('adm-dept').value  = u.dept  || '';
    if (g('adm-st'))    g('adm-st').value    = u.status || 'active';
    if (g('adm-pwd'))   g('adm-pwd').value   = '';
    if (g('adm-eid'))   g('adm-eid').value   = id;
    if (g('mo-u-title')) g('mo-u-title').textContent = u.name + ' Duzenle';
    // Avatar
    if (u.avatar && avatarPreview) {
      avatarPreview.src = u.avatar; avatarPreview.style.display = 'block';
      if (avatarInitials) avatarInitials.style.display = 'none';
    } else {
      if (avatarPreview) avatarPreview.style.display = 'none';
      if (avatarInitials) { avatarInitials.style.display = ''; avatarInitials.textContent = '?'; }
    }
    // Modül checkboxları
    const userMods = u.modules || (typeof ROLE_DEFAULT_MODULES !== 'undefined' ? ROLE_DEFAULT_MODULES[u.role] || [] : []);
    const isAdminRole = u.role === 'admin';
    document.querySelectorAll('.perm-cb').forEach(cb => {
      const modId = cb.id.replace('pm-', '');
      cb.checked  = isAdminRole || (Array.isArray(userMods) && userMods.includes(modId));
    });
    // Döküman erişimi
    const accMap = { 'pa-ik':'İK', 'pa-fn':'Finans', 'pa-op':'Operasyon', 'pa-tk':'Teknik', 'pa-ms':'Maaş', 'pa-ss':'Sistem' };
    Object.entries(accMap).forEach(([eid2, v]) => { const el = g(eid2); if (el) el.checked = (u.access||[]).includes(v); });
  } else {
    ['adm-name','adm-email','adm-pwd'].forEach(x => { const el = g(x); if (el) el.value = ''; });
    if (g('adm-role'))   g('adm-role').value   = 'staff';
    if (g('adm-dept'))   g('adm-dept').value   = '';
    if (g('adm-st'))     g('adm-st').value     = 'active';
    if (g('adm-eid'))    g('adm-eid').value    = '';
    if (g('mo-u-title')) g('mo-u-title').textContent = '+ Kullanici Ekle';
    if (avatarPreview)  avatarPreview.style.display = 'none';
    if (avatarInitials) { avatarInitials.style.display = ''; avatarInitials.textContent = '?'; }
    // Rol varsayılan modüller
    autoSetRolePerms();
    ['pa-ik','pa-fn','pa-op','pa-tk','pa-ms','pa-ss'].forEach((id2,i) => { const el = g(id2); if(el) el.checked = [true,false,true,false,false,false][i]; });
  }
  window.openMo?.('mo-admin-user');
}

function saveAdminUser() {
  if (!isAdmin()) { window.toast?.(t('err.permission'), 'err'); return; }

  const name  = (g('adm-name')?.value  || '').trim();
  const email = (g('adm-email')?.value || '').trim().toLowerCase();
  const role  = g('adm-role')?.value   || 'user';
  const dept  = (g('adm-dept')?.value  || '').trim();
  const color = g('adm-color')?.value  || '#3C3489';
  const pwd   = (g('adm-pwd')?.value   || '').trim();
  const eid   = parseInt(g('adm-eid')?.value || '0');

  if (!name)  { window.toast?.('İsim zorunludur', 'err');    return; }
  if (!email) { window.toast?.('E-posta zorunludur', 'err'); return; }

  const users = loadUsers();

  // E-posta benzersizlik kontrolü
  const duplicate = users.find(u => u.email === email && u.id !== eid);
  if (duplicate) { window.toast?.('Bu e-posta zaten kayıtlı', 'err'); return; }

  if (eid) {
    const u = users.find(x => x.id === eid);
    if (!u) return;
    Object.assign(u, { name, email, role, dept, color });
    if (pwd) u.password = pwd;
    logActivity('user', `Kullanıcı güncellendi: "${name}" (${email})`);
    window.toast?.(`${name} güncellendi ✓`, 'ok');
  } else {
    if (!pwd) { window.toast?.('Yeni kullanıcı için şifre zorunludur', 'err'); return; }
    users.push({
      id:       Date.now(),
      name, email, role, dept, color,
      password: pwd,
      status:   'active',
      modules:  null,  // null = tüm modüllere erişim
      createdBy: CU()?.id,
      createdAt: nowTs(),
    });
    logActivity('user', `Yeni kullanıcı oluşturuldu: "${name}" (${email})`);
    window.toast?.(`${name} eklendi ✓`, 'ok');
  }

  saveUsers(users);
  window.closeMo?.('mo-admin-user');
  renderAdmin();
}

// ── Askıya Alma / Aktifleştirme ───────────────────────────────────
function suspendUser(id) {
  if (!isAdmin()) return;
  if (id === CU()?.id) { window.toast?.('Kendinizi askıya alamazsınız', 'err'); return; }
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  if (!confirm(window.t ? t('confirm.suspend', undefined, { name: u.name }) : `"${u.name}" askıya alınsın mı?`)) return;
  u.status        = 'suspended';
  u.suspendedBy   = CU()?.id;
  u.suspendedAt   = nowTs();
  saveUsers(users);
  renderAdmin();
  logActivity('user', `Kullanıcı askıya alındı: "${u.name}"`);
  window.toast?.(`${u.name} askıya alındı`, 'ok');
}

function activateUser(id) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  u.status      = 'active';
  u.activatedBy = CU()?.id;
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
  u.pwdResetBy    = CU()?.id;
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
  if (id === CU()?.id) { window.toast?.('Kendinizi silemezsiniz', 'err'); return; }
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;
  if (!confirm(window.t
    ? t('confirm.delete', undefined, { label: u.name })
    : `"${u.name}" kalıcı olarak silinecek. Emin misiniz?`)) return;

  saveUsers(users.filter(x => x.id !== id));
  renderAdmin();
  logActivity('user', `Kullanıcı silindi: "${u.name}" (${u.email})`);
  window.toast?.(`${u.name} silindi`, 'ok');
}

// ── RBAC: Modül Yetki Modalı ──────────────────────────────────────
function openPermModal(id) {
  if (!isAdmin()) return;
  const u = loadUsers().find(x => x.id === id);
  if (!u) return;

  const cont = g('perm-modules-cont');
  if (!cont) return;

  if (g('perm-uid'))    g('perm-uid').value    = id;
  if (g('perm-uname'))  g('perm-uname').textContent = u.name;

  // Admin için tüm modüller kilitli (her şeye erişim)
  const isUserAdmin = u.role === 'admin';
  const allowed     = u.modules; // null = tümü, array = seçili modüller

  cont.innerHTML = `
    ${isUserAdmin
      ? `<div style="background:var(--al);border-radius:8px;padding:12px;font-size:13px;color:var(--ac);margin-bottom:12px">
           👑 Admin kullanıcılar tüm modüllere erişebilir.
         </div>`
      : ''
    }
    <div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:12px;color:var(--t2)">Erişim verilecek modülleri seçin:</span>
      <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="perm-all"
          ${!allowed ? 'checked' : ''}
          onchange="Admin._toggleAllPerms(this.checked)"
          style="accent-color:var(--ac)">
        Tümüne İzin Ver
      </label>
    </div>
    <div class="ckg">
      ${ALL_MODULES.map(m => `
        <label class="pm-label${isUserAdmin ? ' disabled' : ''}">
          <input type="checkbox" class="perm-cb" value="${m.id}"
            ${isUserAdmin || !allowed || allowed.includes(m.id) ? 'checked' : ''}
            ${isUserAdmin ? 'disabled' : ''}
            style="accent-color:var(--ac)">
          ${m.label}
        </label>`).join('')}
    </div>`;

  window.openMo?.('mo-perm');
}

function _toggleAllPerms(checked) {
  document.querySelectorAll('.perm-cb:not(:disabled)').forEach(cb => {
    cb.checked = checked;
  });
}

function savePermissions() {
  if (!isAdmin()) return;
  const uid     = parseInt(g('perm-uid')?.value || '0');
  const users   = loadUsers();
  const u       = users.find(x => x.id === uid);
  if (!u) return;

  const allChecked = g('perm-all')?.checked;
  if (allChecked) {
    u.modules = null; // tümü
  } else {
    u.modules = [...document.querySelectorAll('.perm-cb:checked')].map(cb => cb.value);
  }

  saveUsers(users);
  window.closeMo?.('mo-perm');
  renderAdmin();
  logActivity('user', `Modül yetkileri güncellendi: "${u.name}" → ${u.modules ? u.modules.join(', ') : 'Tümü'}`);
  window.toast?.(`${u.name} yetkileri güncellendi ✓`, 'ok');
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
    id:     Date.now(),
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
  s.reviewedBy = CU()?.id;
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
    addedBy:   CU()?.id,
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

// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — ADMIN
// ════════════════════════════════════════════════════════════════

function renderUsers(filter=''){
  // ── Virtual scroll: 100+ kayıt için otomatik devreye girer ──────
  // VirtualList window.VirtualList olarak utils.js'den gelir

  if(!isAdmin())return;
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

  // Stats
  const sv=(id,v)=>{const el=g(id);if(el)el.textContent=v;};
  sv('u-stat-total',users.length);
  sv('u-stat-active',users.filter(x=>x.status==='active').length);
  sv('u-stat-admin',users.filter(x=>x.role==='admin'||x.role==='manager').length);
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

  if(USERS_VIEW==='card'){
    grid.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      ${list.map((u)=>{
        const rm=ROLE_META[u.role]||ROLE_META.staff;
        const isSelf=u.id===CU.id;
        const isActive=u.status==='active';
        const idx=users.indexOf(u);
        const avBg=AV_COLORS[idx%AV_COLORS.length];
        const lastSeen=u.lastLogin?u.lastLogin.slice(0,16):'—';
        const modCount=(u.modules||[]).length;
        const loginRecently=u.lastLogin&&(Date.now()-new Date(u.lastLogin.replace(' ','T')).getTime())<7*86400000;
        return`<div style="background:var(--sf);border:2px solid ${isSelf?'#6366F1':'var(--b)'};border-radius:18px;overflow:hidden;transition:all .2s;box-shadow:0 2px 12px rgba(0,0,0,.06)" onmouseenter="this.style.boxShadow='0 8px 28px rgba(0,0,0,.12)'" onmouseleave="this.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'">

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

  }else{
    // Professional table view
    grid.innerHTML=`<div style="border:1.5px solid var(--b);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--s2);border-bottom:2px solid var(--b)">
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Kullanıcı</th>
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Rol</th>
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</th>
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Erişim</th>
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Son Giriş</th>
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((u,rowIdx)=>{
            const rm=ROLE_META[u.role]||ROLE_META.staff;
            const isSelf=u.id===CU.id;
            const isActive=u.status==='active';
            const idx=users.indexOf(u);
            const avBg=AV_COLORS[idx%AV_COLORS.length];
            return`<tr style="border-bottom:1px solid var(--b);background:${rowIdx%2===0?'var(--sf)':'var(--s2)'};opacity:${isActive?1:.6};transition:background .1s" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background='${rowIdx%2===0?'var(--sf)':'var(--s2)'}'">
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
  openMo('mo-user');
}

function openNewUser(){
  st('mo-u-title','+ Yeni Kullanıcı');
  ['f-name','f-email','f-pw'].forEach(id=>g(id).value='');
  g('f-pw').placeholder='Min 6 karakter';g('f-role').value='staff';g('f-st').value='active';g('f-edit-id').value='';
  ['pa-ik','pa-fn','pa-op','pa-tk','pa-ms','pa-ss'].forEach((id,i)=>g(id).checked=[true,false,true,false,false,false][i]);
  // Default staff modules
  ALL_MODULES.forEach(m=>{const cb=g('pm-'+m.id);if(cb)cb.checked=ROLE_DEFAULT_MODULES.staff.includes(m.id);});
  openMo('mo-user');
}

function filterUsers(v){renderUsers(v);}

function toggleUser(id){
  const users=loadUsers();const u=users.find(x=>x.id===id);if(!u)return;
  u.status=u.status==='active'?'inactive':'active';saveUsers(users);
  logActivity('user',`"${u.name}" kullanıcısını ${u.status==='active'?'aktif etti':'devre dışı bıraktı'}`);
  toast(u.name+' '+(u.status==='active'?'aktif':'pasif'),'ok');renderUsers();
}

function renderSettingsAdmin(){
  if(!isAdmin())return;
  updateVersionUI();
  // Sürüm geçmişi
  const vh=g('ver-hist');
  if(vh&&!vh.innerHTML.trim()){
    vh.innerHTML=CHANGELOG.slice(0,8).map(c=>`<div class="dr"><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ac)">${c.v}</span><span style="font-size:11px;color:var(--t2)">${c.note}</span><span style="font-size:10px;color:var(--t3)">${c.ts.slice(0,10)}</span></div>`).join('');
  }
  // Departman listesi
  renderDeptList();
  updateDeptSelect();
  // Puantaj Yetki Kartı — dinamik render
  renderPuantajYetkiKart();
}

const Admin = {
  render:            renderAdmin,
  renderLog:         renderActivityLog,
  renderSuggestions,
  openModal:         openAdminModal,
  save:              saveAdminUser,
  suspend:           suspendUser,
  activate:          activateUser,
  resetPassword,
  deleteUser,
  openPermModal,
  savePermissions,
  _toggleAllPerms,
  updateSuggStatus,
  deleteSugg,
  submitSuggestion,
  addUpdateBanner,
  showAllUpdateBanners,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Admin;
} else {
  window.Admin = Admin;
  // V18 eklenen fonksiyonlar
  window.renderUsers = function(...args) {
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
  window.toggleUser          = toggleUser;
  window.renderSettingsAdmin = renderSettingsAdmin;
  window.saveUser          = saveUser;
  window.autoSetRolePerms  = autoSetRolePerms;
  window.setAllPerms       = setAllPerms;
  window.addDept           = addDept;
  window.deleteDept        = deleteDept;
  window.updateDeptSelect  = updateDeptSelect;
  window.renderDeptList    = renderDeptList;
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
}

})();
