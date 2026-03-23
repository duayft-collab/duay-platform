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
  if (!isAdmin()) return;
  const users   = loadUsers();
  const search  = (g('admin-search')?.value || '').toLowerCase();
  const roleF   = g('admin-role-f')?.value  || '';
  const statF   = g('admin-status-f')?.value || '';
  let fl = users;
  if (search) fl = fl.filter(u => u.name.toLowerCase().includes(search) || (u.email||'').toLowerCase().includes(search));
  if (roleF)  fl = fl.filter(u => u.role   === roleF);
  if (statF)  fl = fl.filter(u => u.status === statF);

  st('admin-total',     users.length);
  st('admin-active',    users.filter(u => u.status === 'active').length);
  st('admin-suspended', users.filter(u => u.status === 'suspended').length);
  st('admin-admins',    users.filter(u => u.role === 'admin').length);

  const cont = g('admin-list'); if (!cont) return;
  if (!fl.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:10px">🔍</div>
      <div style="font-weight:600;margin-bottom:4px">Kullanıcı bulunamadı</div>
      <div style="font-size:12px">Filtreleri sıfırlayın veya yeni kullanıcı ekleyin.</div>
    </div>`;
    return;
  }

  if (USERS_VIEW === 'table') {
    _renderAdminTable(fl, users, cont);
  } else {
    _renderAdminCards(fl, users, cont);
  }
}

function _avStyle(u, users, size) {
  size = size || 40;
  const avc = (typeof AVC !== 'undefined') ? AVC : [['#EEEDFE','#26215C']];
  const idx = users.indexOf(u);
  const c   = avc[Math.max(idx,0) % avc.length];
  const ini = (u.name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
  const fs  = Math.floor(size * 0.38);
  return `<div style="width:${size}px;height:${size}px;border-radius:${Math.floor(size*.35)}px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;flex-shrink:0;position:relative">${ini}</div>`;
}

function _renderAdminCards(fl, users, cont) {
  const cu = CU ? (typeof CU === 'function' ? CU() : CU) : null;
  cont.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:16px;padding:4px 0">
    ${fl.map(u => {
      const rm       = ROLE_META[u.role] || ROLE_META.staff;
      const isSelf   = u.id === cu?.id;
      const isActive = u.status === 'active';
      const idx      = users.indexOf(u);
      const avc      = (typeof AVC !== 'undefined') ? AVC : [['#EEEDFE','#26215C']];
      const c        = avc[Math.max(idx,0) % avc.length];
      const ini      = (u.name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
      const modCount = (u.modules && u.role !== 'admin') ? u.modules.length + ' modül' : 'Tümü';
      const lastSeen = u.lastLogin ? u.lastLogin.slice(0,16) : '—';
      const recentLogin = u.lastLogin && (Date.now()-new Date(u.lastLogin.replace(' ','T')).getTime()) < 7*86400000;
      return `<div style="background:var(--sf);border:1.5px solid ${isSelf?'var(--ac)':'var(--b)'};border-radius:16px;overflow:hidden;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'" onmouseleave="this.style.boxShadow='none'">
        <div style="height:3px;background:${c[0]};"></div>
        <div style="padding:16px">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
            <div style="position:relative;flex-shrink:0">
              ${u.avatar ? `<img src="${u.avatar}" style="width:46px;height:46px;border-radius:14px;object-fit:cover;" alt="${u.name}">` : `<div style="width:46px;height:46px;border-radius:14px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800">${ini}</div>`}
              <div style="position:absolute;bottom:-3px;right:-3px;width:13px;height:13px;background:${recentLogin&&isActive?'#22C55E':isActive?'#94A3B8':'#EF4444'};border:2.5px solid var(--sf);border-radius:50%"></div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                <span style="font-size:14px;font-weight:700;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</span>
                ${isSelf?`<span style="background:var(--ac);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;flex-shrink:0">SİZ</span>`:''}
              </div>
              <div style="font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.email||'—'}</div>
              ${u.dept?`<div style="font-size:11px;color:var(--t2);margin-top:2px">📍 ${u.dept}</div>`:''}
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
            <span style="display:inline-flex;align-items:center;gap:4px;background:${rm.bg};color:${rm.color};padding:3px 10px;border-radius:7px;font-size:11px;font-weight:700;border:1px solid ${rm.border}">${rm.icon} ${rm.label}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;background:${isActive?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'};color:${isActive?'#16A34A':'#DC2626'};padding:3px 10px;border-radius:7px;font-size:11px;font-weight:600;border:1px solid ${isActive?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}">
              <div style="width:6px;height:6px;border-radius:50%;background:currentColor"></div>${isActive?'Aktif':'Pasif'}
            </span>
          </div>
          <div style="background:var(--s2);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Son Giriş</div>
              <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--t2)">${lastSeen}</div>
            </div>
            <div>
              <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Modül Erişimi</div>
              <div style="font-size:11px;font-weight:600;color:var(--t)">${modCount}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="Admin.openModal(${u.id})" class="btn btnp" style="flex:1;font-size:12px;justify-content:center;border-radius:9px;padding:7px">✏️ Düzenle</button>
            <button onclick="Admin.openPermModal(${u.id})" class="btn btns" style="font-size:12px;padding:7px 10px;border-radius:9px" title="Modül Yetkileri">🔑</button>
            ${u.status==='active'
              ? `<button onclick="Admin.suspend(${u.id})" class="btn btns" style="font-size:12px;padding:7px 10px;border-radius:9px;color:#D97706" title="Askıya Al" ${isSelf?'disabled':''}>⏸</button>`
              : `<button onclick="Admin.activate(${u.id})" class="btn btns" style="font-size:12px;padding:7px 10px;border-radius:9px;color:#16A34A" title="Aktif Et">▶</button>`
            }
            <button onclick="Admin.deleteUser(${u.id})" class="btn btns" style="font-size:12px;padding:7px 10px;border-radius:9px;color:#EF4444" title="Sil" ${isSelf?'disabled':''}>🗑</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function _renderAdminTable(fl, users, cont) {
  const cu = CU ? (typeof CU === 'function' ? CU() : CU) : null;
  cont.innerHTML = `<div style="border:1px solid var(--b);border-radius:12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--s2);border-bottom:2px solid var(--b)">
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Kullanıcı</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Rol</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Modüller</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Son Giriş</th>
          <th style="padding:11px 16px;text-align:right;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlemler</th>
        </tr>
      </thead>
      <tbody>
      ${fl.map((u,i) => {
        const rm       = ROLE_META[u.role] || ROLE_META.staff;
        const isSelf   = u.id === cu?.id;
        const isActive = u.status === 'active';
        const idx      = users.indexOf(u);
        const avc      = (typeof AVC !== 'undefined') ? AVC : [['#EEEDFE','#26215C']];
        const c        = avc[Math.max(idx,0) % avc.length];
        const ini      = (u.name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
        const modCount = (u.modules && u.role !== 'admin') ? u.modules.length : '∞';
        return `<tr style="border-bottom:1px solid var(--b);background:${i%2===0?'var(--sf)':'var(--s2)'};transition:background .1s" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background='${i%2===0?'var(--sf)':'var(--s2)'}'">
          <td style="padding:10px 16px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:34px;height:34px;border-radius:10px;background:${c[0]};color:${c[1]};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0">${ini}</div>
              <div>
                <div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px">${u.name}${isSelf?'<span style="background:var(--ac);color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">SİZ</span>':''}</div>
                <div style="font-size:11px;color:var(--t3)">${u.email||'—'}</div>
              </div>
            </div>
          </td>
          <td style="padding:10px 16px">
            <span style="display:inline-flex;align-items:center;gap:4px;background:${rm.bg};color:${rm.color};padding:3px 10px;border-radius:7px;font-size:11px;font-weight:700">${rm.icon} ${rm.label}</span>
          </td>
          <td style="padding:10px 16px">
            <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${isActive?'#16A34A':'#DC2626'}">
              <div style="width:7px;height:7px;border-radius:50%;background:currentColor"></div>${isActive?'Aktif':'Pasif'}
            </span>
          </td>
          <td style="padding:10px 16px;font-size:12px;color:var(--t2)">${modCount}</td>
          <td style="padding:10px 16px;font-family:'DM Mono',monospace;font-size:11px;color:var(--t3)">${(u.lastLogin||'—').slice(0,16)}</td>
          <td style="padding:10px 16px">
            <div style="display:flex;gap:4px;justify-content:flex-end">
              <button onclick="Admin.openModal(${u.id})" class="btn btns" style="font-size:11px;padding:4px 10px">✏️</button>
              <button onclick="Admin.openPermModal(${u.id})" class="btn btns" style="font-size:11px;padding:4px 10px">🔑</button>
              ${u.status==='active'
                ? `<button onclick="Admin.suspend(${u.id})" class="btn btns" style="font-size:11px;padding:4px 10px;color:#D97706" ${isSelf?'disabled':''}>⏸</button>`
                : `<button onclick="Admin.activate(${u.id})" class="btn btns" style="font-size:11px;padding:4px 10px;color:#16A34A">▶</button>`
              }
              <button onclick="Admin.deleteUser(${u.id})" class="btn btns" style="font-size:11px;padding:4px 10px;color:#EF4444" ${isSelf?'disabled':''}>🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}




// ── Davet Linki ile Kullanıcı Ekleme ────────────────────────────
function generateInviteLink() {
  const base    = window.location.origin + window.location.pathname;
  const token   = btoa(Date.now() + ':' + Math.random().toString(36).slice(2));
  const expiry  = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 gün
  const invites = JSON.parse(localStorage.getItem('ak_invites') || '[]');
  invites.push({ token, expiry, createdBy: (typeof CU==='function'?CU():CU)?.id, createdAt: nowTs() });
  localStorage.setItem('ak_invites', JSON.stringify(invites));
  const link = base + '?invite=' + token;
  const el = document.getElementById('invite-link-output');
  if (el) { el.value = link; el.select(); }
  window.toast?.('Davet linki oluşturuldu — 7 gün geçerli ✓', 'ok');
  logActivity('user', 'Davet linki oluşturuldu');
}

function copyInviteLink() {
  const el = document.getElementById('invite-link-output');
  if (!el || !el.value) { generateInviteLink(); return; }
  navigator.clipboard?.writeText(el.value)
    .then(() => window.toast?.('Link kopyalandı ✓', 'ok'))
    .catch(() => { el.select(); document.execCommand('copy'); window.toast?.('Link kopyalandı ✓', 'ok'); });
}

// ── Departman Yönetimi ───────────────────────────────────────────
function loadDepts() {
  return JSON.parse(localStorage.getItem('ak_depts') || '[]');
}
function saveDepts(d) { localStorage.setItem('ak_depts', JSON.stringify(d)); }

function renderDeptManager() {
  const cont = document.getElementById('dept-list'); if (!cont) return;
  const depts = loadDepts();
  if (!depts.length) {
    cont.innerHTML = '<div style="padding:12px;text-align:center;color:var(--t3);font-size:12px">Henüz departman eklenmemiş.</div>';
    return;
  }
  const users = loadUsers();
  cont.innerHTML = depts.map((d, i) => {
    const count = users.filter(u => u.dept === d.name).length;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;background:var(--s2);margin-bottom:6px">
      <div style="width:8px;height:8px;border-radius:50%;background:${d.color||'var(--ac)'};flex-shrink:0"></div>
      <span style="flex:1;font-size:13px;font-weight:500">${d.name}</span>
      <span style="font-size:11px;color:var(--t3)">${count} kişi</span>
      <button onclick="_delDept(${i})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0 4px">✕</button>
    </div>`;
  }).join('');
}

function addDept() {
  const nameEl  = document.getElementById('dept-name-inp');
  const colorEl = document.getElementById('dept-color-inp');
  const name    = (nameEl?.value || '').trim();
  if (!name) { window.toast?.('Departman adı zorunludur', 'err'); return; }
  const depts = loadDepts();
  if (depts.find(d => d.name === name)) { window.toast?.('Bu departman zaten var', 'err'); return; }
  depts.push({ name, color: colorEl?.value || '#3C3489' });
  saveDepts(depts);
  if (nameEl) nameEl.value = '';
  renderDeptManager();
  // Kullanıcı formu departman seçeneğini güncelle
  _updateDeptSelect();
  window.toast?.(name + ' departmanı eklendi ✓', 'ok');
}

function _delDept(idx) {
  const depts = loadDepts();
  depts.splice(idx, 1);
  saveDepts(depts);
  renderDeptManager();
  _updateDeptSelect();
}

function _updateDeptSelect() {
  const sel = document.getElementById('adm-dept');
  if (!sel) return;
  const depts  = loadDepts();
  const current = sel.value;
  sel.innerHTML = '<option value="">— Seç —</option>'
    + depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  if (current) sel.value = current;
}

// ── Şifre Politikası ─────────────────────────────────────────────
function loadPwdPolicy() {
  return JSON.parse(localStorage.getItem('ak_pwd_policy') || 'null') || {
    minLen: 8, requireUpper: true, requireNumber: true, requireSpecial: false
  };
}
function savePwdPolicy(p) { localStorage.setItem('ak_pwd_policy', JSON.stringify(p)); }

function savePwdPolicyForm() {
  const p = {
    minLen:         parseInt(document.getElementById('pwd-minlen')?.value   || '8'),
    requireUpper:   document.getElementById('pwd-upper')?.checked   || false,
    requireNumber:  document.getElementById('pwd-number')?.checked  || false,
    requireSpecial: document.getElementById('pwd-special')?.checked || false,
  };
  savePwdPolicy(p);
  window.toast?.('Şifre politikası kaydedildi ✓', 'ok');
  logActivity('user', 'Şifre politikası güncellendi');
}

function validatePassword(pwd) {
  const p = loadPwdPolicy();
  if (pwd.length < p.minLen)     return `Şifre en az ${p.minLen} karakter olmalı`;
  if (p.requireUpper  && !/[A-Z]/.test(pwd)) return 'En az bir büyük harf gerekli';
  if (p.requireNumber && !/[0-9]/.test(pwd)) return 'En az bir rakam gerekli';
  if (p.requireSpecial && !/[^A-Za-z0-9]/.test(pwd)) return 'En az bir özel karakter gerekli (!@#$...)';
  return null; // geçerli
}

// renderSettingsAdmin içinde şifre politikası formunu doldur
function _fillPwdPolicyForm() {
  const p = loadPwdPolicy();
  const el = (id) => document.getElementById(id);
  if (el('pwd-minlen'))  el('pwd-minlen').value    = p.minLen;
  if (el('pwd-upper'))   el('pwd-upper').checked   = p.requireUpper;
  if (el('pwd-number'))  el('pwd-number').checked  = p.requireNumber;
  if (el('pwd-special')) el('pwd-special').checked = p.requireSpecial;
}

// ── Modal: Kullanıcı Ekleme / Düzenleme ──────────────────────────
function openAdminModal(id) {
  if (!isAdmin()) return;
  _updateDeptSelect();

  const avatarPreview = g('adm-avatar-preview');
  const avatarWrap    = g('adm-avatar-wrap');

  if (id) {
    const u = loadUsers().find(x => x.id === id);
    if (!u) return;
    if (g('adm-name'))   g('adm-name').value   = u.name  || '';
    if (g('adm-email'))  g('adm-email').value  = u.email || '';
    if (g('adm-role'))   g('adm-role').value   = u.role  || 'staff';
    if (g('adm-dept'))   g('adm-dept').value   = u.dept  || '';
    if (g('adm-pwd'))    g('adm-pwd').value    = '';
    if (g('adm-eid'))    g('adm-eid').value    = id;
    if (g('mo-adm-t'))   g('mo-adm-t').textContent = '✏️ ' + u.name + ' Düzenle';
    // Avatar
    if (avatarPreview) {
      if (u.avatar) {
        avatarPreview.src = u.avatar; avatarPreview.style.display = '';
      } else {
        avatarPreview.style.display = 'none';
      }
    }
    if (avatarWrap) {
      const ini = (u.name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
      avatarWrap.dataset.initials = ini;
    }
  } else {
    ['adm-name', 'adm-email', 'adm-dept', 'adm-pwd'].forEach(x => {
      const el = g(x); if (el) el.value = '';
    });
    if (g('adm-role'))  g('adm-role').value  = 'staff';
    if (g('adm-eid'))   g('adm-eid').value   = '';
    if (g('mo-adm-t'))  g('mo-adm-t').textContent = '+ Kullanıcı Ekle';
    if (avatarPreview) avatarPreview.style.display = 'none';
    if (avatarWrap)    avatarWrap.dataset.initials = '?';
    if (g('adm-avatar-file')) g('adm-avatar-file').value = '';
  }
  window.openMo?.('mo-admin-user');
}

function saveAdminUser() {
  if (!isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }

  const name  = (g('adm-name')?.value  || '').trim();
  const email = (g('adm-email')?.value || '').trim().toLowerCase();
  const role  = g('adm-role')?.value   || 'staff';
  const dept  = (g('adm-dept')?.value  || '').trim();
  const pwd   = (g('adm-pwd')?.value   || '').trim();
  const eid   = parseInt(g('adm-eid')?.value || '0');

  if (!name)  { window.toast?.('Ad Soyad zorunludur', 'err'); return; }
  if (!email) { window.toast?.('E-posta zorunludur', 'err');  return; }

  const users = loadUsers();
  const duplicate = users.find(u => u.email === email && u.id !== eid);
  if (duplicate) { window.toast?.('Bu e-posta zaten kayıtlı', 'err'); return; }

  // Şifre politikası kontrolü
  if (pwd) {
    const pwdErr = validatePassword(pwd);
    if (pwdErr) { window.toast?.(pwdErr, 'err'); return; }
  }

  const doSave = (avatarData) => {
    if (eid) {
      const u = users.find(x => x.id === eid);
      if (!u) return;
      Object.assign(u, { name, email, role, dept });
      if (pwd)        u.password = pwd;
      if (avatarData) u.avatar   = avatarData;
      logActivity('user', `Kullanıcı güncellendi: "${name}" (${email})`);
      window.toast?.(`${name} güncellendi ✓`, 'ok');
    } else {
      if (!pwd) { window.toast?.('Yeni kullanıcı için şifre zorunludur', 'err'); return; }
      const cu = typeof CU === 'function' ? CU() : CU;
      users.push({
        id:        Date.now(),
        name, email, role, dept,
        password:  pwd,
        status:    'active',
        modules:   null,
        avatar:    avatarData || null,
        createdBy: cu?.id,
        createdAt: nowTs(),
      });
      logActivity('user', `Yeni kullanıcı oluşturuldu: "${name}" (${email})`);
      window.toast?.(`${name} eklendi ✓`, 'ok');
    }
    saveUsers(users);
    window.closeMo?.('mo-admin-user');
    renderAdmin();
  };

  // Profil fotoğrafı
  const avatarFile = g('adm-avatar-file')?.files?.[0];
  if (avatarFile) {
    const r = new FileReader();
    r.onload = ev => doSave(ev.target.result);
    r.readAsDataURL(avatarFile);
  } else {
    doSave(null);
  }
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

function renderSettingsAdmin() {
  if (!isAdmin()) return;
  updateVersionUI?.();

  // ── Şirket Bilgileri ───────────────────────────────────────────
  const ci = (typeof loadCompanyInfo === 'function') ? loadCompanyInfo() : {};
  _fillSetting('set-company-name',    ci.name     || '');
  _fillSetting('set-company-email',   ci.email    || '');
  _fillSetting('set-company-phone',   ci.phone    || '');
  _fillSetting('set-company-address', ci.address  || '');
  _fillSetting('set-company-taxno',   ci.taxNo    || '');
  _fillSetting('set-company-taxoff',  ci.taxOffice|| '');
  _fillSetting('set-company-website', ci.website  || '');

  // ── Bildirim Tercihleri ────────────────────────────────────────
  const np = (typeof loadNotifPrefs === 'function') ? loadNotifPrefs() : {};
  _fillToggle('notif-task',     np.taskAssigned !== false);
  _fillToggle('notif-due',      np.taskDue      !== false);
  _fillToggle('notif-holiday',  np.holidayAlert !== false);
  _fillToggle('notif-newuser',  np.newUser      !== false);
  _fillToggle('notif-system',   np.systemUpdates === true);
  _fillToggle('notif-chat',     np.chatMessages !== false);
  _fillToggle('notif-calendar', np.calendarReminder !== false);

  // ── Oturum & Güvenlik ──────────────────────────────────────────
  const sp = (typeof loadSessionPrefs === 'function') ? loadSessionPrefs() : {};
  _fillSetting('set-session-timeout', sp.timeout || 30);

  // ── Tema rengi ─────────────────────────────────────────────────
  const accentEl = g('set-accent-color');
  if (accentEl) accentEl.value = localStorage.getItem('ak_accent_color') || '#3C3489';

  // ── Sürüm geçmişi ──────────────────────────────────────────────
  const vh = g('ver-hist');
  if (vh && !vh.innerHTML.trim() && typeof CHANGELOG !== 'undefined') {
    vh.innerHTML = CHANGELOG.slice(0, 8).map(c =>
      `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--b)">
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ac);flex-shrink:0;min-width:48px">${c.v}</span>
        <span style="font-size:11px;color:var(--t2);flex:1">${c.note}</span>
        <span style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace;flex-shrink:0">${c.ts.slice(0,10)}</span>
      </div>`
    ).join('');
  }

  // Şifre politikası formu
  _fillPwdPolicyForm();
  // Departman listesi
  renderDeptManager();
  _updateDeptSelect();
  // Puantaj Yetki Kartı — dinamik render
  window.renderPuantajYetkiKart?.();
}

function _fillSetting(id, val) {
  const el = g(id); if (el) el.value = val;
}
function _fillToggle(id, val) {
  const el = g(id); if (el) el.checked = val;
}

function saveCompanySettings() {
  const ci = {
    name:      g('set-company-name')?.value    || '',
    email:     g('set-company-email')?.value   || '',
    phone:     g('set-company-phone')?.value   || '',
    address:   g('set-company-address')?.value || '',
    taxNo:     g('set-company-taxno')?.value   || '',
    taxOffice: g('set-company-taxoff')?.value  || '',
    website:   g('set-company-website')?.value || '',
  };
  // Logo
  const logoFile = g('set-company-logo')?.files?.[0];
  if (logoFile) {
    const r = new FileReader();
    r.onload = ev => {
      ci.logo = ev.target.result;
      if (typeof saveCompanyInfo === 'function') saveCompanyInfo(ci);
      _applyCompanyLogo(ci.logo);
      window.toast?.('Şirket bilgileri kaydedildi ✓', 'ok');
      logActivity('user', 'Şirket bilgileri güncellendi');
    };
    r.readAsDataURL(logoFile);
  } else {
    const existing = (typeof loadCompanyInfo === 'function') ? loadCompanyInfo() : {};
    ci.logo = existing.logo || null;
    if (typeof saveCompanyInfo === 'function') saveCompanyInfo(ci);
    window.toast?.('Şirket bilgileri kaydedildi ✓', 'ok');
    logActivity('user', 'Şirket bilgileri güncellendi');
  }
}

function saveNotifSettings() {
  const np = {
    taskAssigned:    g('notif-task')?.checked     || false,
    taskDue:         g('notif-due')?.checked      || false,
    holidayAlert:    g('notif-holiday')?.checked  || false,
    newUser:         g('notif-newuser')?.checked  || false,
    systemUpdates:   g('notif-system')?.checked   || false,
    chatMessages:    g('notif-chat')?.checked     || false,
    calendarReminder:g('notif-calendar')?.checked || false,
  };
  if (typeof saveNotifPrefs === 'function') saveNotifPrefs(np);
  window.toast?.('Bildirim tercihleri kaydedildi ✓', 'ok');
}

function saveSessionSettings() {
  const sp = {
    timeout:        parseInt(g('set-session-timeout')?.value || '30'),
    requireConfirm: true,
    showLastLogin:  true,
  };
  if (typeof saveSessionPrefs === 'function') saveSessionPrefs(sp);
  window.toast?.('Oturum ayarları kaydedildi ✓', 'ok');
}

function applyAccentColor(color) {
  if (!color) return;
  localStorage.setItem('ak_accent_color', color);
  const root = document.documentElement;
  root.style.setProperty('--ac', color);
  // Açık renk türet (alpha ile)
  root.style.setProperty('--al', color + '18');
  window.toast?.('Tema rengi uygulandı ✓', 'ok');
}

function _applyCompanyLogo(dataUrl) {
  const navLogo = g('nav-logo-img');
  if (navLogo && dataUrl) { navLogo.src = dataUrl; navLogo.style.display = ''; }
}

// CSV/Excel toplu kullanıcı import
function importUsersCSV() {
  const fileEl = g('import-users-file');
  const file   = fileEl?.files?.[0];
  if (!file) { window.toast?.('Dosya seçin', 'err'); return; }

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const r = new FileReader();
    r.onload = ev => _parseAndImportCSV(ev.target.result);
    r.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    const r = new FileReader();
    r.onload = ev => {
      if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
      const wb   = XLSX.read(ev.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_csv(ws);
      _parseAndImportCSV(data);
    };
    r.readAsBinaryString(file);
  } else {
    window.toast?.('CSV veya Excel dosyası seçin', 'err');
  }
}

function _parseAndImportCSV(csvText) {
  var nlChar = String.fromCharCode(10);
  const lines  = csvText.trim().split(nlChar);
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
  // Kolon haritası: ad, email, rol, departman, şifre
  const nameIdx  = header.findIndex(h => h.includes('ad') || h.includes('name') || h.includes('isim'));
  const emailIdx = header.findIndex(h => h.includes('email') || h.includes('mail'));
  const roleIdx  = header.findIndex(h => h.includes('rol')  || h.includes('role'));
  const deptIdx  = header.findIndex(h => h.includes('dept') || h.includes('departman') || h.includes('bolum'));
  const pwdIdx   = header.findIndex(h => h.includes('sifre') || h.includes('pwd') || h.includes('pass'));

  if (nameIdx < 0 || emailIdx < 0) {
    window.toast?.('CSV başlığında "ad" ve "email" kolonu olmalı', 'err');
    return;
  }

  const users = loadUsers();
  let added = 0, skipped = 0;

  lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    const cols  = line.split(',').map(c => c.trim().replace(/^"|"$/g,''));
    const name  = cols[nameIdx]  || '';
    const email = cols[emailIdx] || '';
    const role  = cols[roleIdx]  || 'staff';
    const dept  = deptIdx > -1 ? (cols[deptIdx] || '') : '';
    const pwd   = pwdIdx  > -1 ? (cols[pwdIdx]  || 'Duay2026!') : 'Duay2026!';

    if (!name || !email) { skipped++; return; }
    if (users.find(u => u.email === email.toLowerCase())) { skipped++; return; }

    users.push({
      id:        Date.now() + added,
      name,
      email:     email.toLowerCase(),
      role:      ['admin','manager','lead','staff'].includes(role.toLowerCase()) ? role.toLowerCase() : 'staff',
      dept,
      password:  pwd,
      status:    'active',
      modules:   null,
      createdBy: (CU ? (typeof CU==='function'?CU():CU) : null)?.id,
      createdAt: nowTs(),
    });
    added++;
  });

  saveUsers(users);
  renderAdmin();
  window.toast?.(`${added} kullanıcı eklendi${skipped ? ', ' + skipped + ' atlandı' : ''} ✓`, 'ok');
  logActivity('user', `Toplu kullanıcı import: ${added} eklendi, ${skipped} atlandı`);
  if (g('import-users-file')) g('import-users-file').value = '';
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
  setView:           v => { USERS_VIEW = v; renderAdmin(); },
  importCSV:         importUsersCSV,
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
  window.saveCompanySettings  = saveCompanySettings;
  window.saveNotifSettings    = saveNotifSettings;
  window.saveSessionSettings  = saveSessionSettings;
  window.applyAccentColor     = applyAccentColor;
  window.importUsersCSV       = importUsersCSV;
  window.USERS_VIEW_SET         = (v) => { USERS_VIEW = v; renderAdmin(); };
  window.generateInviteLink     = generateInviteLink;
  window.copyInviteLink         = copyInviteLink;
  window.addDept                = addDept;
  window.renderDeptManager      = renderDeptManager;
  window.savePwdPolicyForm      = savePwdPolicyForm;
  window.validatePassword       = validatePassword;
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
