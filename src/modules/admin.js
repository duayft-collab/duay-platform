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
  } catch(e) { console.warn('[Admin]', e); }
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
  asistan:{label:'Yönetici Asistanı',icon:'🤝',color:'#0891B2',bg:'rgba(8,145,178,.1)',border:'rgba(8,145,178,.2)'},
};
let USERS_VIEW='table'; // 'card' | 'table' | 'org'
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

/**
 * ADMIN-ONAY-LISTESI-001: "Bekleyen Onaylar" bölümü.
 * loadAlisTeklifleri() içinden durum==='onay-hazir' olan kayıtları çeker
 * ve admin panelinin en üstüne (adm-split öncesine) bir banner olarak basar.
 * Hiç bekleyen yoksa container temizlenir (görünmez).
 */
function _renderBekleyenOnaylar() {
  var panel = document.getElementById('panel-admin');
  if (!panel) return;
  // Container lazy inject — adm-split'in hemen öncesi
  var cont = document.getElementById('admin-bekleyen-onay');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'admin-bekleyen-onay';
    var split = panel.querySelector('.adm-split');
    if (split) panel.insertBefore(cont, split);
    else panel.insertBefore(cont, panel.firstChild);
  }
  var alis = (typeof loadAlisTeklifleri === 'function') ? loadAlisTeklifleri() : [];
  var bekleyen = alis.filter(function(t) { return t.durum === 'onay-hazir'; });
  if (!bekleyen.length) { cont.innerHTML = ''; return; }
  var esc = window._esc;
  cont.innerHTML = '<div style="padding:14px 20px;background:linear-gradient(135deg,#FAEEDA,#FCEBEB);border-bottom:1px solid var(--b)">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">⏳</span><span style="font-size:14px;font-weight:700;color:#854F0B">Bekleyen Onaylar — ' + bekleyen.length + ' alış teklifi yöneticilik onayı bekliyor</span></div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
    + bekleyen.map(function(t) {
        var urunAdi = (t.urunler && t.urunler[0] && (t.urunler[0].urunAdi || t.urunler[0].turkceAdi)) || t.urunAdi || '—';
        var urunCount = (t.urunler || []).length;
        var tedarikci = t.tedarikci || '—';
        var tutar = parseFloat(t.toplamTutar || t.genelToplam || t.toplam) || 0;
        var para = t.toplamPara || t.paraBirimi || t.para || 'USD';
        var sunmaTarih = t.onayaSunmaTarihi || t.updatedAt || t.createdAt || '';
        var sunmaStr = sunmaTarih ? new Date(sunmaTarih).toLocaleString('tr-TR', {dateStyle:'short', timeStyle:'short'}) : '—';
        var kaynakSatisNo = t.kaynakSatisTeklifNo || t.kaynakSatisNo || t.satisTeklifNo || t.kaynakTeklifNo || '—';
        return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
          + '<div style="flex:1;min-width:200px"><div style="font-size:13px;font-weight:600;color:var(--t)">' + esc(urunAdi) + (urunCount > 1 ? ' <span style="font-size:9px;color:var(--t3);font-weight:400">+' + (urunCount - 1) + ' ürün</span>' : '') + '</div>'
          + '<div style="font-size:10px;color:var(--t3);margin-top:3px">🏭 ' + esc(tedarikci) + ' · 📅 Sunma: <span style="font-family:monospace">' + esc(sunmaStr) + '</span> · 🔗 Satış teklif: <span style="color:var(--ac);font-family:monospace">' + esc(kaynakSatisNo) + '</span></div></div>'
          + '<div style="font-size:14px;font-weight:700;color:var(--t);white-space:nowrap">' + tutar.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' <span style="font-size:10px;color:var(--t3);font-weight:400">' + esc(para) + '</span></div>'
          + '<div style="display:flex;gap:6px;flex-shrink:0">'
          + '<button onclick="event.stopPropagation();window._adminOnayla?.(\'' + t.id + '\')" style="font-size:11px;padding:6px 14px;border:none;border-radius:6px;background:#16A34A;color:#fff;font-weight:600;cursor:pointer;font-family:inherit">✓ Onayla</button>'
          + '<button onclick="event.stopPropagation();window._adminReddet?.(\'' + t.id + '\')" style="font-size:11px;padding:6px 14px;border:none;border-radius:6px;background:#DC2626;color:#fff;font-weight:600;cursor:pointer;font-family:inherit">✗ Reddet</button>'
          + '</div></div>';
      }).join('')
    + '</div></div>';
}

/**
 * ADMIN-ONAY-LISTESI-001: Alış teklifini onayla.
 * Durum 'onaylandi', onaylayanId ve onayTarihi set edilir, kaydedilir,
 * orijinal satınalmacıya (createdById) addNotif ile bildirim gönderilir.
 */
window._adminOnayla = function(id) {
  if (!isAdmin()) { window.toast?.('Yetkiniz yok','err'); return; }
  var alis = (typeof loadAlisTeklifleri === 'function') ? loadAlisTeklifleri() : [];
  var t = alis.find(function(x) { return String(x.id) === String(id); });
  if (!t) { window.toast?.('Teklif bulunamadı','err'); return; }
  var now = new Date().toISOString();
  t.durum = 'onaylandi';
  t.onaylayanId = window.CU?.()?.id || '';
  t.onayTarihi = now;
  t.updatedAt = now;
  if (typeof storeAlisTeklifleri === 'function') storeAlisTeklifleri(alis);
  var hedef = t.createdById || t.uid;
  if (window.addNotif && hedef) {
    var urunAdi = (t.urunler && t.urunler[0] && (t.urunler[0].urunAdi || t.urunler[0].turkceAdi)) || t.urunAdi || '—';
    window.addNotif('✅', 'Alış teklifin onaylandı: ' + urunAdi + ' (' + (t.tedarikci || '—') + ')', 'ok', 'satinalma', hedef);
  }
  window.logActivity?.('admin', 'Alis teklif onaylandi: ' + id);
  window.toast?.('Onaylandı ✓','ok');
  renderAdmin();
};

/**
 * ADMIN-ONAY-LISTESI-001: Alış teklifini reddet.
 * Confirm modal sonrası durum 'reddedildi', reddedenId/redTarihi set edilir.
 */
window._adminReddet = function(id) {
  if (!isAdmin()) { window.toast?.('Yetkiniz yok','err'); return; }
  var doIt = function() {
    var alis = (typeof loadAlisTeklifleri === 'function') ? loadAlisTeklifleri() : [];
    var t = alis.find(function(x) { return String(x.id) === String(id); });
    if (!t) { window.toast?.('Teklif bulunamadı','err'); return; }
    var now = new Date().toISOString();
    t.durum = 'reddedildi';
    t.reddedenId = window.CU?.()?.id || '';
    t.redTarihi = now;
    t.updatedAt = now;
    if (typeof storeAlisTeklifleri === 'function') storeAlisTeklifleri(alis);
    var hedef = t.createdById || t.uid;
    if (window.addNotif && hedef) {
      var urunAdi = (t.urunler && t.urunler[0] && (t.urunler[0].urunAdi || t.urunler[0].turkceAdi)) || t.urunAdi || '—';
      window.addNotif('❌', 'Alış teklifin reddedildi: ' + urunAdi, 'err', 'satinalma', hedef);
    }
    window.logActivity?.('admin', 'Alis teklif reddedildi: ' + id);
    window.toast?.('Reddedildi','warn');
    renderAdmin();
  };
  /* ADMIN-FIX-001: native confirm kaldırıldı — her zaman confirmModal */
  window.confirmModal('Bu alış teklifini reddetmek istediğinizden emin misiniz?', { title:'Reddet', danger:true, confirmText:'Evet, Reddet', onConfirm: doIt });
};

function renderAdmin() {
  var _up = document.getElementById('panel-admin');
  if (_up) delete _up.dataset.injected;
  if (!isAdmin()) {
    const cont = g('admin-list');
    if (cont) cont.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)">Bu panele erisim yetkiniz yok.</div>`;
    return;
  }
  checkInactiveUsers();
  checkPermExpiry();
  registerSession();
  // ADMIN-ONAY-LISTESI-001: Bekleyen alış teklif onaylarını panel üstüne bas
  _renderBekleyenOnaylar();

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
  el.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-left:2px solid ${isSelected?'#0f3460':'transparent'};background:${isSelected?'rgba(15,52,96,.06)':'transparent'};transition:all .1s`;
  el.onmouseenter = () => { if(!isSelected) el.style.background='var(--s2)'; };
  el.onmouseleave = () => { if(!isSelected) el.style.background=''; };
  el.onclick = () => { _selectedUserId = u.id; renderAdmin(); };

  el.innerHTML = `
    <div style="position:relative;flex-shrink:0">
      <div style="width:36px;height:36px;border-radius:10px;background:${rm.bg};border:1.5px solid ${rm.border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${rm.color}">${window._esc(av)}</div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;border:2px solid var(--sf);background:${online?'#22C55E':u.status==='active'?'#9CA3AF':'#EF4444'}"></div>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:${isSelected?'700':'500'};color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window._esc(u.name)}</div>
      <div style="font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window._esc(u.email||'—')}</div>
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
      conflictHTML = '<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#D97706;font-weight:500">⚠️ Bu kullanıcı şu an <b>' + window._esc(window._editingUser.editorName) + '</b> tarafından düzenleniyor (' + elapsed + ' dk önce açıldı)</div>';
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
        <div style="width:72px;height:72px;border-radius:18px;background:${rm.bg};border:2px solid ${rm.border};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:${rm.color};flex-shrink:0">${window._esc(av)}</div>
        <div style="flex:1">
          <div style="font-size:20px;font-weight:700;color:var(--t);margin-bottom:4px">${window._esc(u.name)}</div>
          <div style="font-size:13px;color:var(--t2);margin-bottom:6px">${window._esc(u.email||'—')}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;padding:3px 10px;border-radius:6px;background:${rm.bg};color:${rm.color};border:1px solid ${rm.border};font-weight:600">${rm.icon} ${rm.label}</span>
            ${u.status==='active'
              ?'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(34,197,94,.08);color:#16A34A;font-weight:600">Aktif</span>'
              :'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(239,68,68,.08);color:#DC2626;font-weight:600">Pasif</span>'}
            ${u.autoLocked?'<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(239,68,68,.05);color:#DC2626">Oto-kilitli</span>':''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btnp" onclick="window._openUserManageModal?.(${Number(u.id)||0})" style="font-size:12px">⚙️ Yönet</button>
          <button onclick="window._rolKopyala(${u.id})" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İzinleri Kopyala</button>
        </div>
      </div>

      <!-- Bilgi Grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--b)">
        <div style="padding:14px;border-right:1px solid var(--b)">
          <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;margin-bottom:4px">Departman</div>
          <div style="font-size:13px;color:var(--t);font-weight:500">${window._esc(u.dept||'Belirtilmedi')}</div>
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

    <!-- Üst Butonlar -->
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btns" onclick="Admin.resetPassword(${u.id})" style="font-size:11px;padding:6px 12px;border-radius:8px">Sifre Sifirla</button>
      <button class="btn btns" onclick="Admin.openAuditLog()" style="font-size:11px;padding:6px 12px;border-radius:8px">Audit Log</button>
      ${u.status==='active'&&!isSelf?`<button class="btn btns" onclick="Admin.suspend(${u.id})" style="font-size:11px;padding:6px 12px;border-radius:8px;color:#DC2626;border-color:#DC2626">Askiya Al</button>`:''}
      ${u.status!=='active'?`<button class="btn btns" onclick="Admin.activate(${u.id})" style="font-size:11px;padding:6px 12px;border-radius:8px;color:#16A34A;border-color:#16A34A">Aktif Et</button>`:''}
      <button class="btn btnp" onclick="window._openUserManageModal?.(${Number(u.id)||0})" style="font-size:11px;padding:6px 14px;border-radius:8px;margin-left:auto">Yönet</button>
    </div>

    <!-- Sekmeler -->
    <div style="display:flex;border-bottom:1px solid var(--b);margin-bottom:16px">
      <div class="adm-tab on" onclick="window._admSwitchTab('yetkiler',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);font-weight:600">Yetkiler</div>
      <div class="adm-tab" onclick="window._admSwitchTab('oturumlar',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Oturumlar</div>
      <div class="adm-tab" onclick="window._admSwitchTab('aktivite',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Aktivite</div>
      <div class="adm-tab" onclick="window._admSwitchTab('performans',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Performans</div>
      <div class="adm-tab" onclick="window._admSwitchTab('ayarlar',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Ayarlar</div>
    </div>
    <div id="adm-tab-content">
    <!-- Yetkiler sekmesi: Modüller butonu -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btnp" onclick="Admin.openPermModal(${u.id})" style="font-size:12px;padding:8px 16px;border-radius:8px">Modul Yetkileri</button>
      ${!isSelf?`<button class="btn btns" onclick="window._cloneUserPerms(${u.id})" style="font-size:11px;padding:6px 12px;border-radius:8px">Yetki Klonla</button>`:''}
      <button class="btn btns" onclick="Admin.openDeptModal()" style="font-size:11px;padding:6px 12px;border-radius:8px">Departmanlar</button>
      <button class="btn btns" onclick="Admin.openBulkRoleChange()" style="font-size:11px;padding:6px 12px;border-radius:8px">Toplu Rol</button>
    </div>
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
            '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + (r.changedAt || '—') + (changer ? ' · ' + window._esc(changer.name) : '') + '</div>' +
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
        ${Object.entries(PERM_TEMPLATES).map(([k,v]) => `<button class="btn btns" onclick="applyPermTemplate(${u.id},'${k}')" style="font-size:11px">${window._esc(v.label)}</button>`).join('')}
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
            + '<span style="font-size:11px;color:'+(hasAccess?'var(--t)':'var(--t3)')+';flex:1">' + window._esc(m.label) + '</span>'
            + (expiry ? '<span style="font-size:9px;color:#F59E0B" title="Suresi: '+expiry+'">⏰</span>' : '')
            + '</div>';
        }).join('')}
      </div>
    </div>`;

  // Puantaj yetki kartını kullanıcı profiline ekle
  setTimeout(function() {
    var oldKart = document.getElementById('puantaj-yetki-kart');
    if (oldKart) oldKart.remove();
    if (typeof window.renderPuantajYetkiKart === 'function') window.renderPuantajYetkiKart(uid);
  }, 50);
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
  /* DB-USERS-PROTECT-001: Firestore propagasyon + echo window için 8 saniye */
  setTimeout(function() { window._adminSaving = false; }, 8000);
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
// ADMIN-PWD-RESET-MODAL-001: prompt() → inline modal (Safari uyumlu)
function resetPassword(id) {
  if (!isAdmin()) return;
  const users = loadUsers();
  const u     = users.find(x => x.id === id);
  if (!u) return;

  var existMo = document.getElementById('mo-pwd-reset');
  if (existMo) existMo.remove();
  var mo = document.createElement('div');
  mo.id = 'mo-pwd-reset';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  mo.innerHTML = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:360px;padding:20px">'
    + '<div style="font-size:14px;font-weight:600;color:var(--t);margin-bottom:4px">Şifre Sıfırla</div>'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">' + window._esc(u.name) + ' için yeni şifre</div>'
    + '<input id="mo-pwd-input" type="password" placeholder="En az 6 karakter" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;padding:8px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:12px">'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="document.getElementById(\'mo-pwd-reset\').remove()" style="padding:7px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;color:var(--t2)">İptal</button>'
    + '<button id="mo-pwd-kaydet" style="padding:7px 16px;border:none;border-radius:6px;background:#DC2626;color:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500">Sıfırla</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  document.getElementById('mo-pwd-input').focus();
  document.getElementById('mo-pwd-kaydet').onclick = function(e) {
    e.stopPropagation();
    var newPwd = document.getElementById('mo-pwd-input').value.trim();
    if (!newPwd) { window.toast?.('Şifre boş olamaz', 'err'); return; }
    if (newPwd.length < 6) { window.toast?.('En az 6 karakter', 'err'); return; }
    mo.remove();
    u.password = newPwd;
    u.pw = newPwd;
    u.pwdResetBy = _getCU()?.id;
    u.pwdResetAt = nowTs();
    saveUsers(users);
    logActivity('user', 'Şifre sıfırlandı: "' + u.name + '"');
    window.toast?.(u.name + ' şifresi sıfırlandı ✓', 'ok');
    var fbAuth = window.Auth?.getFBAuth?.();
    if (fbAuth && u.email) {
      fbAuth.sendPasswordResetEmail(u.email)
        .then(function() { window.toast?.('Firebase reset e-postası gönderildi ✓', 'ok'); })
        .catch(function(err) { console.warn('[admin] Firebase pwd reset:', err.message); });
    }
  };
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
      } catch(e) { console.warn('[Admin]', e); }

      renderAdmin();
      logActivity('user', `Kullanıcı silindi: "${u.name}" (${u.email})`);
      window.toast?.(`${u.name} pasifleştirildi (çöp kutusundan geri alınabilir)`, 'ok');
    }
  });
}

// ── RBAC: Modül Yetki Modalı ──────────────────────────────────────
// Modül kategorileri
/* ADMIN-PERM-CAT-001: tüm modüller nav menüsüyle eşleşen kategorilerde */
var _PERM_CATEGORIES = {
  satis: {
    label: 'Satış',
    icon: '📈',
    mods: ['crm','satis-teklifleri','satis-rapor','siparisler','etkinlik','rehber']
  },
  satinalma: {
    label: 'Satınalma',
    icon: '🛒',
    mods: ['satinalma','urunler','alis-teklifleri','numune','numune-arsivi','fason','stok']
  },
  lojistik: {
    label: 'Lojistik',
    icon: '🚚',
    mods: ['kargo','lojistik','teslimat-takip','navlun']
  },
  finans: {
    label: 'Muhasebe & Finans',
    icon: '💰',
    mods: ['finans','odemeler','nakit-akisi','cari','cari-karsilastirma','donem-ozeti','pirim','kpi','kpi-panel']
  },
  ihracat: {
    label: 'İhracat',
    icon: '🌍',
    mods: ['ihracat','ihracat-ops','ihracat-listesi','ihracat-formlar','ihracat-belgeler']
  },
  ik: {
    label: 'İnsan Kaynakları',
    icon: '👥',
    mods: ['ik','ik-hub','izin','puantaj','evrak','temizlik']
  },
  operasyon: {
    label: 'Operasyon & Araçlar',
    icon: '⚙️',
    mods: ['pusula-pro','hedefler','hesap','gorusme','docs','formlar','links','announce','tebligat']
  },
  yonetim: {
    label: 'Sistem & Yönetim',
    icon: '🔐',
    mods: ['admin','settings','arsiv','arsiv-hub','resmi','users','activity','trash']
  },
};

var _PERM_LEVELS = [
  { value: 'none',   label: '⛔', full: '⛔ Yok',     desc: 'Bu modülü göremez',             color: '#A32D2D', bg: '#FCEBEB' },
  { value: 'view',   label: '👁', full: '👁 Görür',    desc: 'Sadece okuyabilir',             color: '#0C447C', bg: '#E6F1FB' },
  { value: 'edit',   label: '✏️', full: '✏️ Yönetir',  desc: 'Ekleyip güncelleyebilir',       color: '#633806', bg: '#FAEEDA' },
  { value: 'manage', label: '👑', full: '👑 Tam',      desc: 'Tüm işlemler, silme dahil',     color: '#27500A', bg: '#EAF3DE' },
];

var _PERM_PRESETS = {
  intern:     { label: '🎓 Stajyer',     level: 'view',   desc: 'Sadece görüntüleme' },
  staff:      { label: '👤 Personel',     level: 'view',   desc: 'Temel erişim' },
  expert:     { label: '⭐ Uzman',        level: 'edit',   desc: 'Düzenleme yetkisi' },
  manager:    { label: '👔 Yönetici',     level: 'manage', desc: 'Tam yetki' },
  muhasebe:   { label: '🧮 Muhasebe',     level: 'edit',   desc: 'Finans odaklı', mods: { odemeler:'manage', pirim:'manage', hedefler:'edit', kargo:'view' } },
  satis:      { label: '📊 Satış',        level: 'view',   desc: 'CRM + teklif odaklı', mods: { crm:'manage', etkinlik:'edit', rehber:'edit', odemeler:'view' } },
  lojistik:   { label: '🚛 Lojistik',     level: 'view',   desc: 'Kargo + stok odaklı', mods: { kargo:'manage', stok:'manage', satinalma:'edit', numune:'edit' } },
  ik_preset:  { label: '👥 İK',           level: 'view',   desc: 'İK + izin odaklı', mods: { ik:'manage', izin:'manage', puantaj:'manage', evrak:'edit', kpi:'edit' } },
};

var MOD_ICONS = {
  dashboard:'📊', announce:'📢', pusula:'🎯', takvim:'📅', notes:'📝', links:'🔗', rehber:'🆘',
  satinalma:'🛒', odemeler:'💳', pirim:'⭐', hedefler:'🏆', kargo:'📦', stok:'📋', numune:'🧪', temizlik:'🧹',
  ik:'👥', izin:'🏖', puantaj:'⏱', evrak:'📄', crm:'📈', etkinlik:'🎪',
  arsiv:'🗄', tebligat:'📮', resmi:'📑', kpi:'📊', settings:'⚙️', admin:'🔐',
  'satis-teklifleri':'📊', 'alis-teklifleri':'🛒', lojistik:'🚛'
};

// Apple-style CSS inject (bir kez)
(function _injectPermCSS() {
  if (document.getElementById('perm-responsive-css')) return;
  var style = document.createElement('style');
  style.id = 'perm-responsive-css';
  style.textContent = ''
    + '.perm-grid{display:flex;flex-direction:column;gap:0}'
    + '.perm-row{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:0.5px solid var(--b);transition:background .1s}'
    + '.perm-row:hover{background:var(--s2)}'
    + '.perm-row.changed{outline:2px solid #EF9F27;outline-offset:-2px;border-radius:6px}'
    + '.perm-lvl-btn{border:1.5px solid var(--b);border-radius:6px;padding:4px 10px;font-size:10px;cursor:pointer;background:var(--sf);color:var(--t3);font-family:inherit;transition:all .12s;white-space:nowrap}'
    + '.perm-lvl-btn:hover{border-color:var(--ac);color:var(--ac)}'
    + '.perm-lvl-btn.active{font-weight:600;color:#fff;border-color:transparent}'
    + '.perm-lvl-btn.active[data-level="none"]{background:#FCEBEB;color:#A32D2D;border-color:#A32D2D33}'
    + '.perm-lvl-btn.active[data-level="view"]{background:#E6F1FB;color:#0C447C;border-color:#0C447C33}'
    + '.perm-lvl-btn.active[data-level="edit"]{background:#FAEEDA;color:#633806;border-color:#63380633}'
    + '.perm-lvl-btn.active[data-level="manage"]{background:#EAF3DE;color:#27500A;border-color:#27500A33}'
    + '.perm-preset-chip{padding:4px 12px;border-radius:99px;border:1px solid var(--b);font-size:11px;cursor:pointer;background:var(--sf);color:var(--t2);font-family:inherit;transition:all .12s;white-space:nowrap}'
    + '.perm-preset-chip:hover{border-color:var(--ac);color:var(--ac)}'
    + '.perm-preset-chip.active{background:var(--ac);color:#fff;border-color:var(--ac)}'
    + '.perm-cat-header{padding:10px 14px;background:var(--s2);font-size:11px;font-weight:700;color:var(--t2);display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--b);cursor:pointer}'
    + '.perm-cat-bulk{display:flex;gap:3px}'
    + '.perm-cat-bulk button{font-size:9px;padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t3);cursor:pointer;font-family:inherit}'
    + '.perm-cat-bulk button:hover{border-color:var(--ac);color:var(--ac)}'
    + '.perm-change-card{padding:8px 10px;border-left:2px solid #EF9F27;background:rgba(239,159,39,.04);border-radius:0 6px 6px 0;margin-bottom:6px;font-size:11px}';
  document.head.appendChild(style);
})();

// Yetki değişiklik takibi — orijinal ve güncel ayrı saklanır
var _permOriginal = {};  // { modId: level }
var _permCurrent  = {};  // { modId: level }
/* ADMIN-PERM-ONAYLA-FIX-001: onaya bekleyen kayıt snapshot'ı */
var _pendingPermSave = null;

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
  /* ADMIN-MOD-COMPLETE-001: app_patch tüm modülleri window.ALL_MODULES'a push ediyor — manual fallback gereksiz */
  (window.ALL_MODULES || ALL_MODULES).forEach(function(m) { modMap[m.id] = m; });

  // Orijinal yetkileri kaydet (değişiklik takibi için)
  _permOriginal = {};
  _permCurrent = {};
  Object.keys(modMap).forEach(function(mid) {
    var lvl = perms[mid] || (isUserAdmin ? 'manage' : (!allowed || (allowed && allowed.includes(mid)) ? 'view' : 'none'));
    _permOriginal[mid] = lvl;
    _permCurrent[mid] = lvl;
  });

  var _permChanges = function() {
    var changes = [];
    Object.keys(_permCurrent).forEach(function(mid) {
      if (_permCurrent[mid] !== _permOriginal[mid]) {
        var m = modMap[mid] || { label: mid };
        var oldL = _PERM_LEVELS.find(function(l) { return l.value === _permOriginal[mid]; }) || _PERM_LEVELS[0];
        var newL = _PERM_LEVELS.find(function(l) { return l.value === _permCurrent[mid]; }) || _PERM_LEVELS[0];
        changes.push({ mid: mid, label: m.label, oldLevel: oldL, newLevel: newL });
      }
    });
    return changes;
  };

  var _updateSidebar = function() {
    var ch = _permChanges();
    var el = document.getElementById('perm-changes-list');
    if (!el) return;
    if (!ch.length) {
      el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t3);font-size:11px">Henüz değişiklik yok</div>';
    } else {
      el.innerHTML = ch.map(function(c) {
        return '<div class="perm-change-card"><b>' + window._esc(c.label) + '</b><br>'
          + '<span style="color:' + c.oldLevel.color + '">' + c.oldLevel.full + '</span> → ' /* XSS-SAFE: _PERM_LEVELS statik */
          + '<span style="color:' + c.newLevel.color + '">' + c.newLevel.full + '</span></div>'; /* XSS-SAFE: _PERM_LEVELS statik */
      }).join('');
    }
    var badge = document.getElementById('perm-change-count');
    if (badge) badge.textContent = ch.length > 0 ? ch.length + ' değişiklik' : '';
    // Satır outline
    document.querySelectorAll('.perm-row').forEach(function(r) {
      var mid = r.dataset.modid;
      r.classList.toggle('changed', _permCurrent[mid] !== _permOriginal[mid]);
    });
  };

  // Seviye değiştirme — global hook
  window._permSetLevel2 = function(mid, level) {
    _permCurrent[mid] = level;
    // Buton active güncelle
    var row = document.querySelector('.perm-row[data-modid="' + mid + '"]');
    if (row) {
      row.querySelectorAll('.perm-lvl-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.level === level);
      });
    }
    // Hidden select güncelle (savePermissions uyumluluğu)
    var sel = document.querySelector('select.perm-level[data-mod="' + mid + '"]');
    if (sel) sel.value = level;
    // Checkbox güncelle
    var cb = row?.querySelector('.perm-cb');
    if (cb) cb.checked = (level !== 'none');
    _updateSidebar();
  };

  // Toplu kategori güncelleme
  window._permBulkCat = function(catKey, level) {
    var cat = _PERM_CATEGORIES[catKey];
    if (!cat) return;
    cat.mods.forEach(function(mid) { if (modMap[mid]) window._permSetLevel2(mid, level); });
  };

  // Şablon uygulama
  window._permApplyPreset2 = function(presetKey) {
    var preset = _PERM_PRESETS[presetKey];
    if (!preset) return;
    document.querySelectorAll('.perm-preset-chip').forEach(function(c) { c.classList.remove('active'); });
    var active = document.querySelector('.perm-preset-chip[data-preset="' + presetKey + '"]');
    if (active) active.classList.add('active');
    if (preset.mods) {
      // Özel şablon — önce tümünü varsayılan seviyeye çek
      Object.keys(modMap).forEach(function(mid) { window._permSetLevel2(mid, preset.level || 'view'); });
      Object.entries(preset.mods).forEach(function(e) { window._permSetLevel2(e[0], e[1]); });
    } else {
      Object.keys(modMap).forEach(function(mid) { window._permSetLevel2(mid, preset.level); });
    }
  };

  // Geri al
  window._permRevertAll = function() {
    Object.keys(_permOriginal).forEach(function(mid) { window._permSetLevel2(mid, _permOriginal[mid]); });
  };

  // Arama
  window._permSearch2 = function(q) {
    q = (q || '').toLowerCase();
    document.querySelectorAll('.perm-row').forEach(function(r) {
      var label = (r.dataset.label || '').toLowerCase();
      r.style.opacity = (!q || label.includes(q)) ? '1' : '.3';
    });
  };

  var rm = ROLE_META[u.role] || ROLE_META.staff;

  /* ADMIN-PERM-SADE-UI-001: Sade 3-buton (Erişemez/Görebilir/Tam Yetki) + kategorili + şablon */
  /* ADMIN-KATMAN-001: nav menüsüyle birebir 8 kategori, tüm modüller */
  var KATMAN = [
    { lbl: 'Muhasebe & Finans',    mods: ['finans','odemeler','nakit-akisi','cari','cari-karsilastirma','donem-ozeti','pirim','kpi','kpi-panel'] },
    { lbl: 'Satış',                mods: ['crm','satis-teklifleri','satis-rapor','siparisler','etkinlik','rehber'] },
    { lbl: 'Satınalma',            mods: ['satinalma','urunler','alis-teklifleri','numune','numune-arsivi','fason','stok'] },
    { lbl: 'Lojistik',             mods: ['kargo','lojistik','teslimat-takip','navlun'] },
    { lbl: 'İhracat',              mods: ['ihracat','ihracat-ops','ihracat-listesi','ihracat-formlar','ihracat-belgeler'] },
    { lbl: 'İnsan Kaynakları',     mods: ['ik','ik-hub','izin','puantaj','evrak','temizlik'] },
    { lbl: 'Operasyon & Araçlar',  mods: ['pusula-pro','hedefler','hesap','gorusme','docs','formlar','links','announce','tebligat'] },
    { lbl: 'Sistem & Yönetim',     mods: ['dashboard','admin','settings','arsiv','arsiv-hub','resmi','users','activity','trash'] },
  ];
  var MODUL_LABEL = {
    'finans':'Finans Paneli','odemeler':'Ödemeler','nakit-akisi':'Nakit Akışı',
    'cari':'Cari Yönetimi','cari-karsilastirma':'Cari Karşılaştırma','donem-ozeti':'Dönem Özeti',
    'pirim':'Prim Yönetimi','kpi':'KPI & Performans','kpi-panel':'KPI Özet',
    'crm':'CRM / Müşteriler','satis-teklifleri':'Satış Teklifleri','satis-rapor':'Satış Raporu',
    'siparisler':'Siparişler','etkinlik':'Etkinlik / Fuar','rehber':'Acil Rehber',
    'satinalma':'Satın Alma','urunler':'Ürün Kataloğu','alis-teklifleri':'Alış Teklifleri',
    'numune':'Numune Arşivi','numune-arsivi':'Numune Arşivi (Detay)','fason':'Fason Üretim','stok':'Stok',
    'kargo':'Kargo','lojistik':'Lojistik Merkezi','teslimat-takip':'Teslimat Takibi','navlun':'Navlun',
    'ihracat':'İhracat Operasyonları','ihracat-ops':'İhracat Ops','ihracat-listesi':'İhracat Listesi',
    'ihracat-formlar':'İhracat Formları','ihracat-belgeler':'İhracat Belgeleri',
    'ik':'İK Yönetimi','ik-hub':'İK Merkezi','izin':'İzin Yönetimi','puantaj':'Puantaj','evrak':'Personel Evrak','temizlik':'Temizlik Kontrol',
    'pusula-pro':'Pusula Pro','hedefler':'Hedefler','hesap':'Hesap Makinesi',
    'gorusme':'Görüşme / Randevu','docs':'Döküman Yönetimi','formlar':'Kurumsal Formlar',
    'links':'Hızlı Linkler','announce':'Duyurular','tebligat':'Tebligat Takibi',
    'dashboard':'Dashboard','admin':'Kullanıcı Yönetimi','settings':'Ayarlar',
    'arsiv':'Şirket Arşivi','arsiv-hub':'Arşiv & Belgeler','resmi':'Resmi Evrak',
    'users':'Kullanıcılar','activity':'Aktivite Logu','trash':'Çöp Kutusu',
  };
  /* Mevcut _PERM_PRESETS key'lerine görsel label map */
  var PRESET_BTN = [
    {lbl:'🎓 Stajyer',    key:'intern'},
    {lbl:'👤 Personel',   key:'staff'},
    {lbl:'🧮 Muhasebe',   key:'muhasebe'},
    {lbl:'📊 Satış',      key:'satis'},
    {lbl:'🚛 Lojistik',   key:'lojistik'},
    {lbl:'👥 İK',         key:'ik_preset'},
    {lbl:'👔 Yönetici',   key:'manager'},
    {lbl:'⭐ Tam Erişim', key:'manager'},
  ];
  var LVL_BTN = [
    {v:'none',   lbl:'Erişemez'},
    {v:'view',   lbl:'Görebilir'},
    {v:'manage', lbl:'Tam Yetki'},
  ];

  cont.innerHTML = ''
    // Header
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
      + '<div style="width:40px;height:40px;border-radius:50%;background:' + rm.bg + ';color:' + rm.color + ';display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500">' + window._esc(initials(u.name)) + '</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:var(--t)">' + window._esc(u.name||u.email||'?') + '</div><div style="font-size:11px;color:var(--t3)">' + window._esc(u.email||'') + '</div></div>'
      + '<span id="perm-change-count" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(217,119,6,.1);color:#D97706;font-weight:600"></span>'
    + '</div>'

    // Hazır şablon barı
    + '<div style="margin-bottom:14px">'
    + '<div style="font-size:10px;color:var(--t3);margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:.04em">Hazır Şablon — tek tıkla tüm izinleri ayarla</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + PRESET_BTN.map(function(p){
        return '<button class="perm-preset-chip" data-preset="' + p.key + '" onclick="event.stopPropagation();window._permApplyPreset2(\'' + p.key + '\')" style="padding:5px 14px;border-radius:99px;border:0.5px solid var(--b);font-size:11px;cursor:pointer;background:transparent;color:var(--t2);font-family:inherit">' + p.lbl + '</button>';
      }).join('')
    + '</div></div>'

    // Kategoriler + modül satırları
    + '<div style="border:0.5px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:16px">'
    + KATMAN.map(function(k){
        var katMods = k.mods.filter(function(mid){ return modMap[mid]; });
        if (!katMods.length) return '';
        var h = '<div style="padding:8px 14px 4px;font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;background:var(--s2)">' + window._esc(k.lbl) + '</div>';
        h += katMods.map(function(mid){
          var lbl = MODUL_LABEL[mid] || (modMap[mid] && modMap[mid].label) || mid;
          var curLevel = _permCurrent[mid] || 'none';
          /* edit → manage görsel eşleme (3-buton UI'da edit yok) */
          var visLevel = curLevel === 'edit' ? 'manage' : curLevel;
          return '<div class="perm-row" data-modid="' + mid + '" data-label="' + window._esc(lbl) + '" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid var(--b)">'
            + '<div><div style="font-size:13px;color:var(--t);font-weight:500">' + window._esc(lbl) + '</div></div>'
            + '<div style="display:flex;gap:4px">'
            + LVL_BTN.map(function(L){
                var isAktif = visLevel === L.v;
                return '<button class="perm-lvl-btn' + (isAktif?' active':'') + '" data-level="' + L.v + '" data-mod="' + mid + '" onclick="event.stopPropagation();window._permSetLevel2(\'' + mid + '\',\'' + L.v + '\')"' + (isUserAdmin?' disabled':'') + '>' + L.lbl + '</button>';
              }).join('')
            + '</div>'
            + '<select class="perm-level" data-mod="' + mid + '" style="display:none"><option value="' + curLevel + '" selected></option></select>'
            + '</div>';
        }).join('');
        return h;
      }).join('')
    + '</div>'

    // Footer: değişiklik listesi + butonlar
    + '<div id="perm-changes-list" style="font-size:11px;color:var(--t3);padding:4px 0;min-height:20px"></div>'
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">'
    + '<button onclick="event.stopPropagation();document.getElementById(\'mo-perm\')?.classList.remove(\'open\');" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;font-size:12px;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    + '<button onclick="event.stopPropagation();window.savePermissions?.();" style="padding:8px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    + '</div>';

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
  /* ADMIN-PERM-SAVE-FIX-001: _permCurrent state'inden oku (hidden select tek option bug fix)
     Eski: .perm-level select'lerden oku — ama select tek <option> içeriyor, sel.value
     set edildiğinde match etmediği için sel.value '' olur, savePermissions boş kaydeder.
     Yeni: _permCurrent (modül-local state) _permSetLevel2 her tıklamada doğru güncelleniyor,
     DOM yerine state oku. */
  const _newPermissions = {};
  Object.keys(_permCurrent).forEach(function(mid) {
    if (_permCurrent[mid]) _newPermissions[mid] = _permCurrent[mid];
  });
  /* ADMIN-PERM-SYNC-FIX-001: permissions seviyesi 'none' olmayan modüller
     otomatik olarak modules listesine eklenir — iki sistem senkronize */
  if (!allChecked && _newModules) {
    Object.keys(_newPermissions).forEach(function(mid) {
      if (_newPermissions[mid] && _newPermissions[mid] !== 'none') {
        if (!_newModules.includes(mid)) _newModules.push(mid);
      } else if (_newPermissions[mid] === 'none') {
        _newModules = _newModules.filter(function(m){ return m !== mid; });
      }
    });
  }
  var _newRule12h = !!g('perm-rule12h')?.checked;

  // Değişiklik var mı kontrol et
  var oldPerms = JSON.stringify(u.permissions || {});
  var oldModules = JSON.stringify(u.modules);
  var newPerms = JSON.stringify(_newPermissions);
  var newModulesStr = JSON.stringify(_newModules);
  var hasChange = oldPerms !== newPerms || oldModules !== newModulesStr || u.rule12h !== _newRule12h;

  // Onay modalı — değişiklik varsa sor
  if (hasChange) {
    /* ADMIN-PERM-ONAYLA-FIX-001: snapshot'ı sakla, Onayla butonu _applyPermSave ile direkt uygular */
    _pendingPermSave = { users: users, u: u, _newModules: _newModules, _newPermissions: _newPermissions, _newRule12h: _newRule12h, hasChange: hasChange, oldPerms: oldPerms, oldModules: oldModules };
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
          + '<b>' + window._esc(u.name) + '</b> kullanıcısının '
          + '<b>' + _changeDesc.join(', ') + '</b> değiştiriliyor.'
        + '</div>'
      + '</div>'
      /* ADMIN-SAFARI-PERMMODAL-001: addEventListener → inline onclick (Safari DOM timing fix) */
      + '<div style="padding:12px 24px 20px;display:flex;gap:8px;justify-content:center">'
        + '<button id="perm-confirm-cancel" onclick="document.getElementById(\'perm-confirm-modal\')?.remove()" class="btn btns" style="padding:10px 24px;border-radius:10px;font-size:13px">İptal</button>'
        /* ADMIN-ONAYLA-FIX-001: inline onclick scope — savePermissions → window.savePermissions?.() */
        /* ADMIN-PERM-ONAYLA-FIX-001: Onayla → _applyPermSave (ikinci savePermissions çağrısı atlanır) */
        + '<button id="perm-confirm-ok" onclick="event.stopPropagation();window._applyPermSave?.();document.getElementById(\'perm-confirm-modal\')?.remove()" class="btn btnp" style="padding:10px 24px;border-radius:10px;font-size:13px;background:#dc2626">Onayla</button>'
      + '</div>'
    + '</div>';
    document.body.appendChild(_confirmEl);
    setTimeout(function() { _confirmEl.classList.add('open'); }, 10);
    _confirmEl.addEventListener('click', function(e) { if (e.target === _confirmEl) _confirmEl.remove(); });
    return;
  }
  /* ADMIN-PERM-ONAYLA-FIX-001: _permConfirmed bayrağı artık kullanılmıyor (Onayla _applyPermSave çağırıyor) */

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
    // Kullanıcıya bildirim + oturum yenileme sinyali
    if (_getCU()?.id !== u.id) {
      window.addNotif?.('🔐', 'Yetkiniz güncellendi — sayfa yenilenecek', 'warn', 'admin', u.id);
      // forceRefresh: user'ın tarayıcısında CU güncellemesini zorla
      u.permUpdatedAt = nowTs();
    }
  }

  /* ADMIN-PERM-ADMINSAVING-001: Firebase ezilmesini önle — _adminSaving aktifken DB-USERS-PROTECT-001 guard devreye girer */
  /* PERM-MERGE-PROTECT-001: her kullanıcıya permUpdatedAt timestamp yaz — merge koruması */
  users = users.map(function(u) {
    if (_newModules !== undefined || Object.keys(_newPermissions).length) {
      u.permUpdatedAt = new Date().toISOString();
    }
    return u;
  });
  window._adminSaving = true;
  saveUsers(users);
  setTimeout(function(){ window._adminSaving = false; }, 8000);
  /* ADMIN-MOD-COMPLETE-001: aktif kullanıcı kendisiyse CU'yu anlık güncelle — sayfa yenilemesi gerekmez */
  var _cu = (typeof _getCU === 'function' ? _getCU() : null) || window.Auth?.getCU?.();
  if (_cu && _cu.id === u.id) {
    Object.assign(_cu, {
      modules:     u.modules,
      permissions: u.permissions,
      rule12h:     u.rule12h,
    });
  }
  window.closeMo?.('mo-perm');
  renderAdmin();
  logActivity('user', 'Yetki seviyeleri güncellendi: "' + u.name + '" (12h kuralı: ' + (u.rule12h ? 'aktif' : 'kapalı') + ')');
  window.toast?.(u.name + ' yetkileri güncellendi ✓', 'ok');
}

/* ADMIN-PERM-ONAYLA-FIX-001: snapshot'tan direkt kaydet (ikinci DOM okuma yok) */
window._applyPermSave = function() {
  if (!_pendingPermSave) return;
  var save = _pendingPermSave;
  _pendingPermSave = null;
  save.u.modules = save._newModules;
  save.u.permissions = save._newPermissions;
  save.u.rule12h = save._newRule12h;
  if (save.hasChange) {
    if (!Array.isArray(save.u.permissionLog)) save.u.permissionLog = [];
    save.u.permissionLog.push({ ts: nowTs(), changedBy: _getCU?.()?.id, changedByName: _getCU?.()?.name || '', oldModules: JSON.parse(save.oldModules), newModules: save.u.modules, oldPermissions: JSON.parse(save.oldPerms), newPermissions: save._newPermissions });
    if (_getCU?.()?.id !== save.u.id) { window.addNotif?.('🔐', 'Yetkiniz güncellendi', 'warn', 'admin', save.u.id); save.u.permUpdatedAt = nowTs(); }
  }
  window._adminSaving = true;
  saveUsers(save.users);
  setTimeout(function(){ window._adminSaving = false; }, 8000);
  window.closeMo?.('mo-perm');
  renderAdmin();
  window.toast?.(save.u.name + ' yetkileri güncellendi ✓', 'ok');
};

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

  // ADMIN-ACTLOG-RELTIME-001: göreli zaman helper ("X dakika önce")
  const _relTime = function(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 0) return d.toLocaleString('tr-TR');
    if (diffSec < 60) return 'Az önce';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + ' dakika önce';
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return diffHour + ' saat önce';
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return diffDay + ' gün önce';
    return d.toLocaleDateString('tr-TR');
  };
  const _absTime = function(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toLocaleString('tr-TR');
  };

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
      <td style="font-weight:500">${window._esc(u.name)}</td>
      <td style="font-size:12px">${window._esc(l.message || '—')}</td>
      <td style="font-size:11px;color:var(--t2)" title="${window._esc(_absTime(l.ts))}">${window._esc(_relTime(l.ts))}</td>
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
          <span style="font-weight:600;font-size:13px">${window._esc(u.name)}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${st.c}">${st.l}</span>
            ${isAdmin() ? `
              <select class="si" style="font-size:11px;padding:2px 6px" onchange="Admin.updateSuggStatus(${Number(s.id)||0}, this.value)">
                ${Object.entries(STATUS).map(([k, v]) =>
                  `<option value="${k}" ${s.status === k ? 'selected' : ''}>${v.l}</option>`
                ).join('')}
              </select>
              <button class="btn btns btnd" onclick="Admin.deleteSugg(${Number(s.id)||0})">🗑</button>` : ''}
          </div>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--t)">${window._esc(s.text)}</div>
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
        <span style="font-size:13px;color:var(--blt)">${window._esc(update.msg)}</span>
        <span style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace">${window._esc(update.ver)}</span>
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
            ${COLS.map(c=>/* XSS-SAFE: COLS statik */`<th title="${c.id}">${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${users.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.staff;
            const isAdm = u.role === 'admin';
            return `<tr>
              <td class="u-col">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:8px;background:${AV_COLORS[users.indexOf(u)%AV_COLORS.length]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${window._esc(initials(u.name))}</div>
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
          '<button class="cvb" id="u-v-card" data-uview="card" style="font-size:11px;padding:5px 11px">⊞ Kart</button>',
          '<button class="cvb on" id="u-v-table" data-uview="table" style="font-size:11px;padding:5px 11px">≡ Tablo</button>',
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
        '<option value="asistan">🤝 Yönetici Asistanı</option>',
      '</select>',
      '<select class="fi" id="u-status-filter" onchange="renderUsers()" style="border-radius:8px;min-width:110px">',
        '<option value="">Tüm Durumlar</option>',
        '<option value="active">✅ Aktif</option>',
        '<option value="suspended">⏸ Askıda</option>',
      '</select>',
      '<span id="u-count-label" style="font-size:11px;color:var(--t3)"></span>',
    '</div>',
    /* ADMIN-USERS-SPLIT-001: sol u-grid + sağ u-detail */
    '<div class="adm-users-split" style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start">',
      '<div id="u-grid" style="min-width:0"></div>',
      '<div id="u-detail" style="position:sticky;top:12px;background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:22px 18px;font-size:12px;color:var(--t3);text-align:center">',
        '<div style="font-size:36px;margin-bottom:10px">👤</div>',
        '<div style="font-size:13px;font-weight:600;color:var(--t2);margin-bottom:4px">Bir kullanıcı seçin</div>',
        '<div style="font-size:10px;color:var(--t3)">Tablodan bir satıra tıklayın</div>',
      '</div>',
    '</div>',
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
  /* ADMIN-USERS-VIEW-INIT-FIX-001: init check taşındı (_adminRenderUsers atamadan önce) */
  _injectUsersPanel();
  if(!window.isAdmin?.())return;
  // ADMIN-USER-DEDUP-001: soft-delete edilmis kullanicilari listede gosterme
  const users=loadUsers().filter(u=>!u.isDeleted);
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
  sv('u-stat-managers',users.filter(x=>['admin','manager','asistan'].includes(x.role)).length);
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
                <div style="width:52px;height:52px;border-radius:16px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;letter-spacing:-.5px">${window._esc(initials(u.name))}</div>
                ${loginRecently?`<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#22C55E;border:2.5px solid var(--sf);border-radius:50%"></div>`:!isActive?`<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;background:#EF4444;border:2.5px solid var(--sf);border-radius:50%"></div>`:''}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                  <span style="font-size:15px;font-weight:700;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${window._esc(u.name)}</span>
                  ${isSelf?`<span style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;flex-shrink:0;letter-spacing:.03em">SİZ</span>`:''}
                </div>
                <div style="font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window._esc(u.email)}</div>
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
                <div style="display:flex;flex-wrap:wrap;gap:3px">${(u.access||[]).map(a=>`<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;background:var(--al);color:var(--ac)">${window._esc(a)}</span>`).join('')}</div>
              </div>`:''}
            </div>

            <!-- Action row -->
            <div style="display:flex;gap:6px">
              <button onclick="event.stopPropagation();editUser(${Number(u.id)||0})" class="btn btnp" style="flex:1;font-size:12px;justify-content:center;padding:8px">✏️ Düzenle</button>
              <button onclick="event.stopPropagation();toggleUser(${Number(u.id)||0})" class="btn btns" style="font-size:12px;padding:8px 12px;${isActive?'color:#D97706':'color:#16A34A'}" title="${isActive?'Pasife al':'Aktif et'}">${isActive?'⏸':'▶'}</button>
              ${!isSelf?`<button onclick="deleteUser(${Number(u.id)||0})" class="btn btns" style="font-size:12px;padding:8px 12px;color:#EF4444" title="Kullanıcıyı sil">🗑</button>`:''}
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
                onclick="event.stopPropagation();editUser(${Number(u.id)||0})"
                onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.1)'"
                onmouseleave="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'">
                <div style="position:relative;display:inline-block;margin-bottom:8px">
                  <div style="width:44px;height:44px;border-radius:50%;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin:0 auto">${window._esc(initials(u.name))}</div>
                  <div style="position:absolute;bottom:0;right:-1px;width:12px;height:12px;border-radius:50%;background:${isActive?'#22C55E':'#EF4444'};border:2px solid var(--sf)"></div>
                </div>
                <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window._esc(u.name.split(' ')[0])}</div>
                <div style="font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window._esc(u.email?.split('@')[0]||'—')}</div>
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
      <button class="btn btns" style="font-size:11px" onclick="_bulkRoleChange()">Toplu Rol</button>
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
            <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">2FA</th>
            ${_th('Son Giriş','lastLogin')}
            <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Hatalı Giriş</th>
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
            const _rowSel = _selectedUserId === u.id;
            const _rowBg = _rowSel ? 'var(--al)' : (rowIdx%2===0?'var(--sf)':'var(--s2)');
            return`<tr onclick="if(!event.target.closest('button,input')){window._selectUserForDetail(${u.id})}" style="border-bottom:1px solid var(--b);background:${_rowBg};opacity:${isActive?1:.6};transition:background .1s;cursor:pointer${_rowSel?';box-shadow:inset 3px 0 0 var(--ac)':''}" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background='${_rowBg}'">
              <td style="padding:12px 16px;width:36px">
                ${!isSelf?`<input type="checkbox" class="u-bulk-cb" data-uid="${u.id}" onchange="_onBulkCb()" style="accent-color:var(--ac);cursor:pointer">`:
                  `<span style="font-size:10px;color:var(--t3)">—</span>`}
              </td>
              <td style="padding:12px 16px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:10px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${window._esc(initials(u.name))}</div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--t);display:flex;align-items:center;gap:5px">
                      ${window._esc(u.name)}
                      ${isSelf?`<span style="background:#6366F1;color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">SİZ</span>`:''}
                    </div>
                    <div style="font-size:11px;color:var(--t3)">${window._esc(u.email)}</div>
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
              <td style="padding:12px 16px;text-align:center">
                <span style="font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;background:${u.twoFactor?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)'};color:${u.twoFactor?'#16A34A':'#DC2626'}">${u.twoFactor?'Aktif':'Pasif'}</span>
              </td>
              <td style="padding:12px 16px;font-family:'DM Mono',monospace;font-size:11px;color:var(--t3);white-space:nowrap">${u.lastLogin?.slice(0,16)||'—'}</td>
              <td style="padding:12px 16px;text-align:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:${(u.failedLogins||0)>=3?'#DC2626':'var(--t3)'}">${(u.failedLogins||0)||'—'}</td>
              <td style="padding:12px 16px">
                <div style="display:flex;gap:4px;justify-content:flex-end">
                  <button onclick="event.stopPropagation();editUser(${Number(u.id)||0})" class="btn btns" style="font-size:11px;padding:5px 10px">✏️</button>
                  <button onclick="event.stopPropagation();toggleUser(${Number(u.id)||0})" class="btn btns" style="font-size:11px;padding:5px 10px;${isActive?'color:#D97706':'color:#16A34A'}" title="${isActive?'Pasife al':'Aktif et'}">${isActive?'⏸':'▶'}</button>
                  ${!isSelf?`<button onclick="deleteUser(${Number(u.id)||0})" class="btn btns" style="font-size:11px;padding:5px 10px;color:#EF4444">🗑</button>`:''}
                  <button onclick="_toggleUserDetail.call(this,${u.id})" class="btn btns" style="font-size:11px;padding:5px 8px;color:var(--t3)">▾</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }
  /* ADMIN-USERS-SPLIT-001: seçili kullanıcı varsa detay panelini güncelle */
  if (_selectedUserId && typeof window._renderUserDetail === 'function') {
    window._renderUserDetail(_selectedUserId);
  }
}

/* ADMIN-USERS-SPLIT-001: tablodan kullanıcı seç → sağ detay panelinde aç */
window._selectUserForDetail = function(uid) {
  _selectedUserId = uid;
  window._renderUserDetail(uid);
  renderUsers(g('u-search')?.value || '');
};

/* ADMIN-USERS-SPLIT-001: sağ panel render — avatar, rol select, modül badge, aksiyon */
window._renderUserDetail = function(uid) {
  var cont = g('u-detail');
  if (!cont) return;
  var users = loadUsers().filter(function(x){ return !x.isDeleted; });
  var u = users.find(function(x){ return x.id === uid; });
  if (!u) {
    cont.style.textAlign = 'center';
    cont.innerHTML = '<div style="font-size:36px;margin-bottom:10px">👤</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--t2);margin-bottom:4px">Bir kullanıcı seçin</div>'
      + '<div style="font-size:10px;color:var(--t3)">Tablodan bir satıra tıklayın</div>';
    return;
  }
  var rm = (typeof ROLE_META !== 'undefined' && ROLE_META[u.role]) || { bg:'var(--al)', border:'var(--ac)', color:'var(--ac)', icon:'👤', label:u.role||'—' };
  var av = initials(u.name);
  var isActive = u.status === 'active';
  var esc = window._esc || function(s){ return String(s||''); };
  var modCount = (u.modules && u.role !== 'admin') ? u.modules.length : 'Tümü';
  var modText = (typeof modCount === 'number') ? (modCount + ' modül') : modCount;
  var isSelf = u.id === _getCU()?.id;
  cont.style.textAlign = 'left';
  cont.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
    + '<div style="width:52px;height:52px;border-radius:14px;background:' + rm.bg + ';border:1.5px solid ' + rm.border + ';display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:' + rm.color + ';flex-shrink:0">' + esc(av) + '</div>'
    + '<div style="flex:1;min-width:0">'
    +   '<div style="font-size:14px;font-weight:700;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.name) + (isSelf?' <span style="font-size:9px;background:#6366F1;color:#fff;padding:1px 6px;border-radius:4px;vertical-align:middle">SİZ</span>':'') + '</div>'
    +   '<div style="font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.email || '—') + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="margin-bottom:12px">'
    +   '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:4px;letter-spacing:.05em">Rol</div>'
    +   '<select onchange="event.stopPropagation();window._usersRolDegistir(' + u.id + ',this.value)" style="width:100%;padding:7px 10px;border:0.5px solid var(--b);border-radius:7px;background:var(--s2);color:var(--t);font-size:12px;font-family:inherit">'
    +     '<option value="admin"' + (u.role==='admin'?' selected':'') + '>👑 Admin</option>'
    +     '<option value="manager"' + (u.role==='manager'?' selected':'') + '>👔 Yönetici</option>'
    +     '<option value="lead"' + (u.role==='lead'?' selected':'') + '>⭐ Takım Lideri</option>'
    +     '<option value="staff"' + (u.role==='staff'?' selected':'') + '>👤 Personel</option>'
    +     '<option value="asistan"' + (u.role==='asistan'?' selected':'') + '>🤝 Yönetici Asistanı</option>'
    +   '</select>'
    + '</div>'
    + '<div style="margin-bottom:12px">'
    +   '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:6px;letter-spacing:.05em">Erişim</div>'
    +   '<div style="display:flex;flex-wrap:wrap;gap:4px">'
    +     '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:var(--al);color:var(--ac);font-weight:600">' + esc(modText) + '</span>'
    +     '<span style="font-size:10px;padding:3px 8px;border-radius:5px;background:' + (isActive?'rgba(22,163,74,.1)':'rgba(220,38,38,.1)') + ';color:' + (isActive?'#16A34A':'#DC2626') + ';font-weight:600">' + (isActive?'Aktif':'Pasif') + '</span>'
    +   '</div>'
    + '</div>'
    + '<div style="margin-bottom:14px">'
    +   '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:4px;letter-spacing:.05em">Son Giriş</div>'
    +   '<div style="font-size:11px;font-family:\'DM Mono\',monospace;color:var(--t2)">' + (u.lastLogin ? esc(String(u.lastLogin).slice(0,16)) : '—') + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px">'
    +   '<button class="btn btnp" onclick="event.stopPropagation();editUser(' + u.id + ')" style="font-size:12px;justify-content:center">✏️ Düzenle</button>'
    +   '<button class="btn btns" onclick="event.stopPropagation();Admin.resetPassword(' + u.id + ')" style="font-size:11px;justify-content:center">🔑 Şifre Sıfırla</button>'
    +   (isSelf ? '' : '<button class="btn btns" onclick="event.stopPropagation();toggleUser(' + u.id + ')" style="font-size:11px;justify-content:center;color:' + (isActive?'#D97706':'#16A34A') + '">' + (isActive ? '⏸ Askıya Al' : '▶ Aktifleştir') + '</button>')
    + '</div>';
};

/* ADMIN-USERS-SPLIT-001: rol inline değişiklik — saveUsers + log + toast */
window._usersRolDegistir = function(uid, yeniRol) {
  if (!isAdmin()) { window.toast?.('Yetkiniz yok','err'); return; }
  var users = loadUsers();
  var u = users.find(function(x){ return x.id === uid; });
  if (!u) return;
  var eskiRol = u.role;
  if (eskiRol === yeniRol) return;
  u.role = yeniRol;
  u.updatedAt = new Date().toISOString();
  saveUsers(users);
  window.logActivity?.('admin', 'Kullanici rol guncellendi: ' + u.name + ' ' + eskiRol + ' → ' + yeniRol);
  window.toast?.('Rol güncellendi: ' + yeniRol, 'ok');
  window._renderUserDetail(uid);
  renderUsers(g('u-search')?.value || '');
};

function editUser(id){
  const users=loadUsers();const u=users.find(x=>x.id===id);if(!u)return;
  st('mo-u-title','✏️ '+u.name);
  g('f-name').value=u.name;g('f-email').value=u.email;g('f-pw').value='';g('f-pw').placeholder='(değiştirmek için doldurun)';
  /* ADMIN-EMAIL-READONLY-001: düzenleme modunda e-posta kilitli (Firebase Auth sync) */
  const _emailEl = g('f-email');
  if (_emailEl) {
    _emailEl.readOnly = true;
    _emailEl.style.background = 'var(--s2)';
    _emailEl.style.cursor = 'not-allowed';
    if (!document.getElementById('f-email-warn')) {
      const _w = document.createElement('small');
      _w.id = 'f-email-warn';
      _w.style.cssText = 'color:#D97706;display:block;margin-top:2px;font-size:10px';
      _w.textContent = '⚠ E-posta Firebase Auth ile bağlı — değiştirilemez.';
      _emailEl.parentNode?.appendChild(_w);
    }
  }
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
  /* ADMIN-EMAIL-READONLY-001: yeni kullanıcıda e-posta düzenlenebilir — readonly reset */
  const _emailEl2 = g('f-email');
  if (_emailEl2) {
    _emailEl2.readOnly = false;
    _emailEl2.style.background = '';
    _emailEl2.style.cursor = '';
  }
  document.getElementById('f-email-warn')?.remove();
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
  if(vh){
    vh.innerHTML=CHANGELOG.slice(0,8).map(c=>`<div class="dr"><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ac)">${c.v}</span><span style="font-size:11px;color:var(--t2)">${window._esc(c.note)}</span><span style="font-size:10px;color:var(--t3)">${c.ts.slice(0,10)}</span></div>`).join('');
  }
  // Puantaj yetki kartı artık kullanıcı profilinde (adm-detail)
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
      <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--t)">${window._esc(u.name)}</div>
      <div style="font-size:11px;color:var(--t3)">${u.lastLogin ? 'Son giriş: '+u.lastLogin : 'Hiç giriş yapmadı'}${daysSince!==null?' · '+daysSince+' gün önce':''}</div></div>
      <button onclick="document.getElementById('mo-user-activity').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:8px 20px;max-height:50vh;overflow-y:auto">
      ${acts.length ? acts.map(a => `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--b)">
        <div style="font-size:10px;color:var(--t3);white-space:nowrap;min-width:70px">${(a.ts||'').slice(5,16)}</div>
        <div style="font-size:12px;color:var(--t)">${window._esc(a.detail||a.message||'')}</div>
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
            <div style="font-size:12px;font-weight:600;color:var(--t)">${window._esc(s.name)}${isSelf?' (sen)':''}</div>
            <div style="font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window._esc(s.device||'—')}</div>
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
      window.addNotif?.('🚨', window._esc(u.name) + ' 60+ gündür giriş yapmadı — pasife alınması öneriliyor', 'err', 'admin');
      sent[u.id + '_60'] = todayS; changed = true;
    }
    // 30+ gün: bildirim
    else if (daysSince >= 30 && !sent[u.id + '_30']) {
      window.addNotif?.('⚠️', window._esc(u.name) + ' 30+ gündür giriş yapmadı', 'warn', 'admin');
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
            <option value="asistan">🤝 Yönetici Asistanı</option>
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
        <div style="flex:1;font-size:12px;color:var(--t)">${window._esc(i.email)}</div>
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
  logActivity('user', 'Davet gönderildi: ' + email + ' (' + code + ')');
  /* ADMIN-DAVET-LINK-002: prompt ile link göster (Ctrl+A/Ctrl+C ile kolay kopyala)
     NOT: URL param ?davet= olarak kalıyor — auth.js:762 ADMIN-DAVET-URL-001 bu param'ı
     okuyup form'a auto-fill ediyor. Param adı değişirse reader kırılır. */
  var inviteLink = location.origin + location.pathname + '?davet=' + code;
  window.prompt('Davet linkini WhatsApp veya mail ile ilet:', inviteLink);
  window.toast?.('Davet oluşturuldu — linki kopyalayıp iletin ✓', 'ok');
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
          <span style="flex:1;font-size:13px;font-weight:500;color:var(--t)">${window._esc(d)}</span>
          <span style="font-size:11px;color:var(--t3)">${count} kisi</span>
          <button onclick="_delDept('${window._esc(d)}')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3);padding:2px">✕</button>
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
        <span style="color:var(--ac);font-weight:500;min-width:60px">${window._esc(l.byName||'?')}</span>
        <span style="color:var(--t);flex:1">${window._esc(l.detail||'')}</span>
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
  banner.innerHTML = '<span>Goruntulenme modu: ' + window._esc(target.name) + ' (' + (ROLE_META[target.role]?.label||target.role) + ') olarak goruntuluyorsunuz</span>'
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
      + '<div class="fg"><div class="fl">MODUL</div><select class="fi" id="tp-mod">' + mods.map(m => '<option value="' + m.id + '">' + window._esc(m.label) + '</option>').join('') + '</select></div>'
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
        window.addNotif?.('⏰', window._esc(u.name) + ' — ' + mod + ' yetkisi suresi doldu', 'warn', 'admin');
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
      + '<div class="fg"><div class="fl">HEDEF ROL</div><select class="fi" id="br-role"><option value="staff">Personel</option><option value="asistan">Yonetici Asistani</option><option value="lead">Takim Lideri</option><option value="manager">Yonetici</option></select></div>'
      + '<div class="fg" style="margin-top:8px"><div class="fl">KULLANICILAR</div>'
        + '<div style="max-height:250px;overflow-y:auto;border:1px solid var(--b);border-radius:8px">'
          + users.map(u => '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--b);cursor:pointer;font-size:12px"><input type="checkbox" class="br-cb" value="' + u.id + '" style="accent-color:var(--ac)"><span style="flex:1">' + window._esc(u.name) + '</span><span style="font-size:10px;color:var(--t3)">' + (ROLE_META[u.role]?.label||u.role) + '</span></label>').join('')
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

  const escH = typeof window._esc === 'function' ? window._esc : (s => s);

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
      + '<div style="font-size:11px;color:var(--t3);margin-top:2px">Hedef: <b>' + window._esc(target.name) + '</b></div>'
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fl" style="margin-bottom:6px">KAYNAK KULLANICI</div>'
      + '<select class="fi" id="clone-source" style="font-size:13px">'
        + '<option value="">— Kopyalanacak kullanıcı seçin —</option>'
        + users.filter(function(u) { return u.id !== targetUid; }).map(function(u) {
            var rm = ROLE_META[u.role] || ROLE_META.staff;
            return '<option value="' + u.id + '">' + window._esc(u.name) + ' (' + rm.label + ')</option>';
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

  var msg = '"' + window._esc(source.name) + '" kullanıcısının tüm yetkileri "' + window._esc(target.name) + '" kullanıcısına kopyalanacak. Emin misiniz?';

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
/** Kullanıcı detay sekmesi değiştirme */
window._admSwitchTab = function(tab, el) {
  // Tab styling
  document.querySelectorAll('.adm-tab').forEach(function(t) {
    t.style.borderBottomColor = 'transparent';
    t.style.color = 'var(--t3)';
    t.style.fontWeight = '400';
    t.classList.remove('on');
  });
  if (el) {
    el.style.borderBottomColor = 'var(--ac)';
    el.style.color = 'var(--ac)';
    el.style.fontWeight = '600';
    el.classList.add('on');
  }
  // İçerik
  var cont = document.getElementById('adm-tab-content');
  if (!cont) return;
  var uid = _selectedUserId;
  var u = loadUsers().find(function(x) { return x.id === uid; });
  if (!u) return;
  var isSelf = u.id === _getCU()?.id;

  if (tab === 'yetkiler') {
    cont.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + '<button class="btn btnp" onclick="Admin.openPermModal(' + u.id + ')" style="font-size:12px;padding:8px 16px;border-radius:8px">Modul Yetkileri</button>'
      + (!isSelf ? '<button class="btn btns" onclick="window._cloneUserPerms(' + u.id + ')" style="font-size:11px;padding:6px 12px;border-radius:8px">Yetki Klonla</button>' : '')
      + '<button class="btn btns" onclick="Admin.openDeptModal()" style="font-size:11px;padding:6px 12px;border-radius:8px">Departmanlar</button>'
      + '</div>';
  } else if (tab === 'oturumlar') {
    cont.innerHTML = '<div style="text-align:center;padding:16px"><button class="btn btns" onclick="Admin.openSessionManager()" style="font-size:12px">Oturum Yoneticisi</button></div>';
  } else if (tab === 'aktivite') {
    cont.innerHTML = '<div style="text-align:center;padding:16px"><button class="btn btns" onclick="Admin.showUserActivity(' + u.id + ')" style="font-size:12px">Aktivite Gecmisi</button></div>';
  } else if (tab === 'performans') {
    var ts = typeof _calcTrustScore === 'function' ? _calcTrustScore(u) : { score: 0, approvedOps: 0, loginFreq: '—', violations: 0 };
    var tsColor = ts.score >= 70 ? '#22C55E' : ts.score >= 40 ? '#F59E0B' : '#EF4444';
    cont.innerHTML = '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:14px 16px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;font-weight:600">Guven Skoru</span><span style="font-size:12px;font-weight:700;color:' + tsColor + '">' + ts.score + '/100</span></div>'
      + '<div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + ts.score + '%;background:' + tsColor + ';border-radius:3px"></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;font-size:11px;color:var(--t3)">'
        + '<div>Onayli islem: <b>' + ts.approvedOps + '</b></div>'
        + '<div>Giris sikligi: <b>' + ts.loginFreq + '</b></div>'
        + '<div>Asim: <b style="color:' + (ts.violations > 0 ? '#EF4444' : 'var(--t)') + '">' + ts.violations + '</b></div>'
      + '</div></div>';
  } else if (tab === 'ayarlar') {
    cont.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button class="btn btns" onclick="Admin.openNotifPrefs()" style="font-size:11px;padding:6px 12px;border-radius:8px">Bildirim Tercihleri</button>'
      + '<button class="btn btns" onclick="window.Auth?.openIpWhitelist?.()" style="font-size:11px;padding:6px 12px;border-radius:8px">IP Kisitlama</button>'
      + (!isSelf ? '<button class="btn btns" onclick="Admin.startImpersonation(' + u.id + ')" style="font-size:11px;padding:6px 12px;border-radius:8px">Goruntulenme</button>' : '')
      + (!isSelf ? '<button class="btn btns" onclick="Admin.deleteUser(' + u.id + ')" style="font-size:11px;padding:6px 12px;border-radius:8px;color:#DC2626;border-color:#DC2626">Kullaniciyi Sil</button>' : '')
      + '</div>';
  }
};

/* ADMIN-IZIN-KOPYALA-001: Kullanıcı modül/access izinlerini başka kullanıcıya kopyala */
// ADMIN-IZIN-KOPYA-MODAL-001: prompt() → dropdown modal
window._rolKopyala = function(fromId) {
  var users = loadUsers();
  var fromUser = users.find(function(u) { return u.id === fromId; });
  if (!fromUser) return;
  var mevcut = document.getElementById('mo-izin-kopya');
  if (mevcut) { mevcut.remove(); return; }
  var esc = window._esc || function(s) { return String(s || ''); };
  var opts = users.filter(function(u) { return !u.isDeleted && u.id !== fromId; })
    .map(function(u) { return '<option value="' + u.id + '">' + esc(u.name) + ' (' + esc(u.role || 'staff') + ')</option>'; }).join('');
  var mo = document.createElement('div');
  mo.id = 'mo-izin-kopya';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:360px;padding:20px">'
    + '<div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:4px">İzinleri Kopyala</div>'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">' + esc(fromUser.name) + ' → seçilen kullanıcıya</div>'
    + '<select id="mo-izin-hedef" onclick="event.stopPropagation()" style="width:100%;padding:8px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;font-size:12px;margin-bottom:12px"><option value="">Kullanıcı seçin...</option>' + opts + '</select>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="document.getElementById(\'mo-izin-kopya\').remove()" style="padding:7px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;font-size:12px">İptal</button>'
    + '<button onclick="window._rolKopyalaKaydet(' + fromId + ')" style="padding:7px 16px;border:none;border-radius:6px;background:var(--ac);color:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500">Kopyala</button>'
    + '</div></div>';
  document.body.appendChild(mo);
};

window._rolKopyalaKaydet = function(fromId) {
  var toId = parseInt(document.getElementById('mo-izin-hedef')?.value || '0');
  if (!toId) { window.toast?.('Kullanıcı seçin', 'warn'); return; }
  var users = loadUsers();
  var fromUser = users.find(function(u) { return u.id === fromId; });
  var toUser = users.find(function(u) { return u.id === toId; });
  if (!fromUser || !toUser) { window.toast?.('Kullanıcı bulunamadı', 'err'); return; }
  toUser.modules = fromUser.modules ? fromUser.modules.slice() : null;
  toUser.access = fromUser.access ? fromUser.access.slice() : [];
  toUser.updatedAt = new Date().toISOString();
  saveUsers(users);
  document.getElementById('mo-izin-kopya')?.remove();
  window.toast?.(fromUser.name + ' → ' + toUser.name + ' izinleri kopyalandı ✓', 'ok');
  window.renderUsers?.();
};

window._openUserManageModal = function(uid) {
  if (!isAdmin()) return;
  var users = loadUsers();
  var u = users.find(function(x) { return x.id === uid; });
  if (!u) return;
  var rm = ROLE_META[u.role] || ROLE_META.staff;
  var av = initials(u.name);
  var esc = typeof window._esc === 'function' ? window._esc : function(s) { return s; };

  var old = document.getElementById('mo-user-manage'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-user-manage'; 

  // Departman listesi
  var depts = [];
  try { depts = JSON.parse(localStorage.getItem('ak_departments') || '[]'); } catch(e) { console.warn('[Admin]', e); }
  if (!depts.length) depts = ['IK','Finans','Operasyon','Satis','Lojistik','Teknik','Muhasebe'];
  var deptOpts = '<option value="">—</option>' + depts.map(function(d) { return '<option value="' + esc(d) + '"' + (u.dept === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('');
  var roleOpts = ['admin','manager','asistan','lead','staff'].map(function(r) { var m = ROLE_META[r]||{}; return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (m.icon||'') + ' ' + (m.label||r) + '</option>'; }).join('');

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
                      + (!isCur ? '<button onclick="window._endSession?.(\'' + s2.sessionId + '\');window._openUserManageModal?.(' + (Number(u.id)||0) + ')" style="background:none;border:none;cursor:pointer;font-size:10px;color:#DC2626">✕</button>' : '')
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
  /* ADMIN-USERS-VIEW-INIT-FIX-001: Init tek seferlik — renderUsers atanmadan önce çalışsın ki her render'da reset olmasın */
  if (!window._usersViewInitialized) { USERS_VIEW = 'table'; window._usersViewInitialized = true; }
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
  /* ADMIN-SAVEPERMISSIONS-EXPOSE-001: izin kaydetme butonunun onclick'i bu globale bağlanır */
  window.savePermissions     = savePermissions;
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
    var esc = typeof window._esc === 'function' ? window._esc : function(s) { return s; };
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

// ── Satır genişleme — kullanıcı detay ────────────────────
window._toggleUserDetail = function(uid) {
  var detailId = 'u-detail-' + uid;
  var existing = document.getElementById(detailId);
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('[id^="u-detail-"]').forEach(function(el) { el.remove(); });
  var users = loadUsers(); var u = users.find(function(x) { return x.id === uid; }); if (!u) return;
  var tr2 = document.createElement('tr'); tr2.id = detailId; tr2.style.cssText = 'background:#E6F1FB18';
  tr2.innerHTML = '<td colspan="8" style="padding:0 16px 12px 52px"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding-top:10px">'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px"><div style="font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:6px;border-bottom:0.5px solid var(--b);padding-bottom:4px">Modüller</div><div style="display:flex;flex-wrap:wrap;gap:3px">' + (u.modules || []).slice(0, 8).map(function(m) { return '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:#E6F1FB;color:#0C447C">' + m + '</span>'; }).join('') + ((u.modules || []).length > 8 ? '<span style="font-size:9px;color:var(--t3)">+' + ((u.modules || []).length - 8) + '</span>' : '') + '</div></div>'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px"><div style="font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:6px;border-bottom:0.5px solid var(--b);padding-bottom:4px">Güvenlik</div><div style="font-size:11px;display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">2FA</span><span style="color:' + (u.twoFactor ? '#16a34a' : '#dc2626') + ';font-weight:500">' + (u.twoFactor ? 'Aktif' : 'Pasif') + '</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Hatalı giriş</span><span style="color:' + ((u.failedLogins || 0) >= 3 ? '#dc2626' : 'var(--t)') + ';font-weight:500">' + (u.failedLogins || 0) + '</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Kilitli</span><span style="color:' + (u.autoLocked ? '#dc2626' : '#16a34a') + '">' + (u.autoLocked ? 'Evet' : 'Hayır') + '</span></div></div></div>'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px"><div style="font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:6px;border-bottom:0.5px solid var(--b);padding-bottom:4px">Puantaj</div><div style="font-size:11px;color:var(--t2)">' + (u.puantajYetki && u.puantajYetki.length ? u.puantajYetki.length + ' kişi yetkili' : 'Yalnızca kendisi') + '</div></div>'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px"><div style="font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:6px;border-bottom:0.5px solid var(--b);padding-bottom:4px">Hızlı İşlem</div><div style="display:flex;flex-direction:column;gap:4px"><button onclick="Admin.resetPassword(' + u.id + ')" style="padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:var(--t2);text-align:left">Şifre Sıfırla</button><button onclick="_forceLogout(' + u.id + ')" style="padding:4px 8px;border:0.5px solid #F09595;border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:#791F1F;text-align:left">Oturumu Kapat</button>' + (u.autoLocked ? '<button onclick="_unlockUser(' + u.id + ')" style="padding:4px 8px;border:0.5px solid #C0DD97;border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:#27500A;text-align:left">Kilidi Kaldır</button>' : '') + '</div></div>'
    + '</div></td>';
  var row = this.closest('tr'); if (row && row.parentNode) row.parentNode.insertBefore(tr2, row.nextSibling);
};

window._forceLogout = function(uid) {
  window.confirmModal('Bu kullanıcının aktif oturumu kapatılacak.', { title: 'Oturumu Kapat', danger: true, confirmText: 'Kapat', onConfirm: function() {
    var users = loadUsers(); var u = users.find(function(x) { return x.id === uid; }); if (!u) return;
    u.lastLogout = new Date().toISOString(); u.forcedLogout = true; saveUsers(users);
    window.toast?.('Oturum kapatıldı ✓', 'ok'); window.logActivity?.('user', u.name + ' oturumu zorla kapatıldı');
  }});
};

window._unlockUser = function(uid) {
  var users = loadUsers(); var u = users.find(function(x) { return x.id === uid; }); if (!u) return;
  u.autoLocked = false; u.failedLogins = 0; saveUsers(users); renderUsers();
  window.toast?.('Hesap kilidi kaldırıldı ✓', 'ok'); window.logActivity?.('user', u.name + ' hesap kilidi kaldırıldı');
};

window._bulkRoleChange = function() {
  var ids = _getSelectedIds(); if (!ids.length) return;
  var opts = ['admin', 'manager', 'lead', 'staff'].map(function(r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
  var mo = document.createElement('div'); mo.className = 'mo';
  mo.innerHTML = '<div class="moc" style="max-width:360px;padding:20px"><div style="font-size:14px;font-weight:500;margin-bottom:14px">' + ids.length + ' kullanıcı için rol seç</div><select id="bulk-role-sel" class="fi">' + opts + '</select><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn btns" onclick="this.closest(\'.mo\').remove()">İptal</button><button class="btn btnp" onclick="_doBulkRole()">Uygula</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._doBulkRole = function() {
  var sel = document.getElementById('bulk-role-sel'); if (!sel) return;
  var role = sel.value; var ids = _getSelectedIds();
  var users = loadUsers(); users.forEach(function(u) { if (ids.includes(u.id)) u.role = role; }); saveUsers(users);
  document.querySelector('.mo')?.remove(); _clearBulk(); renderUsers();
  window.toast?.(ids.length + ' kullanıcı rolü güncellendi ✓', 'ok'); window.logActivity?.('user', 'Toplu rol: ' + ids.length + ' → ' + role);
};

/* ══════════════════════════════════════════════════════════════
   SARTLI KURAL YONETIMI (IHR-BELGE-FIX-001)
   ══════════════════════════════════════════════════════════════ */
window._ihrSartliKuralYonet = function() {
  if (!window.isAdmin?.()) return;
  var _SK = 'ak_ihr_sartli_v1';
  var _load = function() { try { return JSON.parse(localStorage.getItem(_SK) || '[]'); } catch(e) { return []; } };
  var _store = function(d) { try { localStorage.setItem(_SK, JSON.stringify(d)); } catch(e) { console.warn('[Admin]', e); } };
  var kurallar = _load();
  var old = document.getElementById('mo-sartli-kural'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-sartli-kural';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var _esc2 = function(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var _render = function() {
    kurallar = _load();
    var h = '<div class="moc" style="max-width:640px;padding:0;border-radius:14px;overflow:hidden">';
    h += '<div style="padding:12px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:13px;font-weight:600">Şartlı Belge Üretim Kuralları</div><div style="display:flex;gap:6px"><button onclick="event.stopPropagation();window._ihrSartliKuralEkle()" style="font-size:10px;padding:3px 10px;border:none;border-radius:4px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit">+ Kural Ekle</button><button onclick="event.stopPropagation();document.getElementById(\'mo-sartli-kural\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div></div>';
    h += '<div style="padding:10px 18px;max-height:50vh;overflow-y:auto">';
    if (!kurallar.length) h += '<div style="text-align:center;padding:24px;color:var(--t3);font-size:11px">Henüz kural yok</div>';
    kurallar.forEach(function(k, idx) {
      var tetOzet = k.tetikleyici ? (k.tetikleyici.tip === 'evrak_olusunca' ? (k.tetikleyici.evrak_tur || '') + ' oluşunca' : k.tetikleyici.tip === 'alan_dolunca' ? (k.tetikleyici.alan || '') + ' dolunca' : k.tetikleyici.tip === 'durum_degisince' ? 'Durum → ' + (k.tetikleyici.durum || '') : '—') : '—';
      var aksOzet = k.aksiyon ? ('→ ' + (k.aksiyon.belge_tur || '') + ' üret (' + (k.aksiyon.lang || 'en') + ')') : '—';
      h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px">';
      h += '<span onclick="event.stopPropagation();window._ihrSartliToggle(' + idx + ')" style="width:10px;height:10px;border-radius:50%;background:' + (k.aktif ? '#16A34A' : '#DC2626') + ';cursor:pointer;flex-shrink:0"></span>';
      h += '<span style="font-weight:500;min-width:80px">' + _esc2(k.ad || 'Kural') + '</span>';
      h += '<span style="flex:1;color:var(--t3);font-size:10px">' + _esc2(tetOzet) + '</span>';
      h += '<span style="color:var(--t2);font-size:10px">' + _esc2(aksOzet) + '</span>';
      h += '<button onclick="event.stopPropagation();window._ihrSartliSil(' + idx + ')" style="font-size:9px;color:#DC2626;background:none;border:none;cursor:pointer">🗑</button>';
      h += '</div>';
    });
    h += '</div></div>';
    mo.innerHTML = h;
  };
  _render();
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);

  window._ihrSartliToggle = function(idx) { var d = _load(); if (d[idx]) { d[idx].aktif = !d[idx].aktif; _store(d); } _render(); };
  window._ihrSartliSil = function(idx) {
    window.confirmModal?.('Bu kuralı silmek istediğinizden emin misiniz?', {
      title: 'Kuralı Sil', danger: true, confirmText: 'Sil',
      onConfirm: function() {
        var d = _load();
        if (d[idx]) {
          d[idx].isDeleted = true;
          d[idx].deletedAt = new Date().toISOString();
          d[idx].deletedBy = window.CU?.()?.uid || '';
        }
        _store(d);
        _render();
        window.toast?.('Kural silindi', 'ok');
      }
    });
  };
  window._ihrSartliKuralEkle = function() {
    var genId = typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now();
    var d = _load();
    d.push({ id: genId, ad: 'Yeni Kural', aktif: true, tetikleyici: { tip: 'evrak_olusunca', evrak_tur: 'PI' }, aksiyon: { tip: 'belge_uret', belge_tur: 'CI', lang: 'en', gecikme_sn: 0 }, createdAt: new Date().toISOString() });
    _store(d); _render();
    window.toast?.('Kural eklendi — düzenlemek için listeye bakın', 'ok');
    window.logActivity?.('admin', 'Şartlı kural eklendi');
  };
};

})();
