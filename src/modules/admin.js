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
  const isSelf    = u.id === _getCU()?.id;
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
    Object.assign(u, { name, email, role, status, modules: modules.length ? modules : null, access });
    if (pwd) u.pw = pwd;
    logActivity('user', `Kullanıcı güncellendi: "${name}" (${email})`);
    window.toast?.(`${name} güncellendi ✓`, 'ok');
  } else {
    // Yeni kullanıcı ekle
    // Firebase Auth kullanan sistemde şifre zorunlu değil
    // Kullanıcı Firebase Console'dan eklenmişse oradan giriş yapar
    const newUser = {
      id:       Date.now(),
      name, email, role, status,
      modules:  modules.length ? modules : null,
      access,
      createdBy: _getCU()?.id,
      createdAt: nowTs(),
    };
    // Şifre girilmişse kaydet, girilmemişse Firebase Auth ile giriş yapacak
    if (pwd) newUser.pw = pwd;
    users.push(newUser);
    logActivity('user', `Yeni kullanıcı oluşturuldu: "${name}" (${email})`);
    window.toast?.(`${name} eklendi ✓ — Firebase Console'dan şifre belirleyin`, 'ok');
  }

  saveUsers(users);
  window.closeMo?.('mo-admin-user');
  renderUsers();
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
  if (!confirm(window.t ? t('confirm.suspend', undefined, { name: u.name }) : `"${u.name}" askıya alınsın mı?`)) return;
  u.status        = 'suspended';
  u.suspendedBy   = _getCU()?.id;
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
        '</div>',
        '<button class="btn btnp" onclick="openNewUser()" style="border-radius:9px">+ Kullanıcı Ekle</button>',
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
      '<input class="fi" type="search" id="u-search" placeholder="İsim veya e-posta ara…" oninput="renderUsers(this.value)" style="flex:1;min-width:160px;border-radius:8px">',
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

  // Stats
  const sv=(id,v)=>{const el=g(id);if(el)el.textContent=v;};
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
    const _cuSelf2 = _getCU();
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
            const isSelf=u.id===_cuSelf2?.id;
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
  // Puantaj Yetki Kartı — dinamik render
  renderPuantajYetkiKart();
}

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
  window.saveUser            = saveAdminUser;   // modals.js onclick="saveUser()" için
  window.autoSetRolePerms    = autoSetRolePerms; // modals.js onclick="autoSetRolePerms()" için
  window.setAllPerms         = setAllPerms;      // modals.js onclick="setAllPerms()" için
  window.toggleUser          = toggleUser;
  window.renderSettingsAdmin = renderSettingsAdmin;
  window._injectUsersPanel   = _injectUsersPanel;
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
