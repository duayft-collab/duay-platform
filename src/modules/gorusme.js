/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/gorusme.js  —  v8.1.0
 * Görüşme Talepleri Sistemi — V18'den adapte edildi
 * Yönetici randevu, onay/ret, admin notu paylaşımı
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

const _ggr  = id => document.getElementById(id);
const _stgr = (id,v) => { const el = _ggr(id); if (el) el.textContent = v; };
const _isAdminGr = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUgr      = () => window.Auth?.getCU?.();
const _nowTsGr   = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`; };

const GRT_T  = { manager:'👔 Yönetici', hr:'📋 İK', suggest:'💡 Öneri', other:'📌 Diğer' };
const GRT_ST = {
  pending:  { l:'⏳ Bekliyor',    c:'ba' },
  approved: { l:'✅ Onaylandı',   c:'bg' },
  rejected: { l:'❌ Reddedildi',  c:'br' },
  done:     { l:'✔ Tamamlandı',  c:'bb' },
};

function _loadGrt()   { try { const d=JSON.parse((typeof loadGrt==='function'?JSON.stringify(loadGrt()):localStorage.getItem('ak_grt1'))); if(Array.isArray(d)) return d; } catch(e) {} return []; }
function _storeGrt(d) { localStorage.setItem('ak_grt1', JSON.stringify(d)); if(typeof storeGrt==='function') try{ storeGrt(d); }catch(e){} }

function _addBusinessDays(date, days) {
  let d = new Date(date); let added = 0;
  while (added < days) { d.setDate(d.getDate()+1); if (d.getDay()!==0 && d.getDay()!==6) added++; }
  return d;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL INJECT
// ════════════════════════════════════════════════════════════════

function _injectGorusmePanel() {
  const p = _ggr('panel-gorusme');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">🗣️ Görüşme Talepleri</div>
        <div class="phs">Yönetici görüşme talepleri ve raporlar</div>
      </div>
      <button class="btn btnp" onclick="openGrtModal()">+ Talep Oluştur</button>
    </div>

    <!-- Admin kartı -->
    <div class="card" id="grt-admin-card" style="display:none;margin-bottom:14px">
      <div class="ch"><span class="ct">📋 Tüm Talepler (Admin)</span></div>
      <div id="grt-admin-list"></div>
    </div>

    <!-- Kendi talepleri -->
    <div class="card">
      <div class="ch"><span class="ct">📝 Taleplerim</span></div>
      <div id="grt-my-list"></div>
    </div>

    <!-- ── MODAL: Talep Oluştur ── -->
    <div class="mo" id="mo-grt" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:480px">
        <div class="moh">
          <span class="mot">🗣️ Görüşme Talebi</span>
          <button class="mcl" onclick="closeMo('mo-grt')">✕</button>
        </div>
        <div class="mob">
          <div style="background:var(--blb);border-radius:var(--rs);padding:10px 14px;font-size:12px;color:var(--blt);margin-bottom:14px">
            💡 Randevu en az <strong>3 iş günü</strong> öncesinden talep edilmelidir.
          </div>
          <div class="fg">
            <label class="fl">Görüşme Türü</label>
            <select class="fi" id="grt-type">
              <option value="manager">👔 Yönetici Görüşmesi</option>
              <option value="hr">📋 İK Görüşmesi</option>
              <option value="suggest">💡 Öneri/Geri Bildirim</option>
              <option value="other">📌 Diğer</option>
            </select>
          </div>
          <div class="fg">
            <label class="fl">Konu Başlığı *</label>
            <input class="fi" id="grt-title" placeholder="Görüşme konusu..." maxlength="100">
          </div>
          <div class="fg">
            <label class="fl">Açıklama * <span style="font-size:10px;color:var(--t3);font-weight:400">(min 20 karakter)</span></label>
            <textarea class="fi" id="grt-desc" rows="4" style="resize:vertical" placeholder="Görüşmek istediğiniz konuyu detaylandırın..."></textarea>
            <div id="grt-desc-count" style="font-size:10px;color:var(--t3);margin-top:3px;text-align:right">0 karakter</div>
          </div>
          <div class="fg">
            <label class="fl">Tercih Edilen Tarih *</label>
            <input class="fi" type="date" id="grt-date">
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-grt')">İptal</button>
          <button class="btn btnp" onclick="saveGrt()">Gönder</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Admin Onay/Ret ── -->
    <div class="mo" id="mo-grt-approval" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:500px">
        <div class="moh">
          <span class="mot">🔐 Talep İncele</span>
          <button class="mcl" onclick="closeMo('mo-grt-approval')">✕</button>
        </div>
        <div class="mob" id="grt-approval-body"></div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-grt-approval')">Kapat</button>
          <button class="btn btnd" onclick="_grtReject()" id="btn-grt-reject">❌ Reddet</button>
          <button class="btn btnp" onclick="_grtApprove()" id="btn-grt-approve">✅ Onayla</button>
        </div>
      </div>
    </div>`;

  // Karakter sayacı
  const desc = _ggr('grt-desc');
  if (desc) {
    desc.addEventListener('input', () => {
      const cnt = _ggr('grt-desc-count');
      if (cnt) cnt.textContent = desc.value.length + ' karakter';
    });
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════

let _grtApprovalId = null;

function renderGorusme() {
  _injectGorusmePanel();
  updateGrtBadge();

  const grtList = _loadGrt();
  const users   = (typeof loadUsers === 'function') ? loadUsers() : [];
  const cu      = _CUgr();

  // Admin kartı
  const ac = _ggr('grt-admin-card');
  if (ac) ac.style.display = _isAdminGr() ? 'block' : 'none';

  const renderItem = (e, showAdmin) => {
    const u    = users.find(x => x.id === e.uid) || { name: '?' };
    const st2  = GRT_ST[e.status] || GRT_ST.pending;
    const visibleNotes = (e.adminNotes||[]).filter(n => _isAdminGr() || (n.sharedWith||[]).includes(cu?.id));

    return `<div style="border-radius:14px;border:1.5px solid var(--b);overflow:hidden;margin-bottom:10px">
      <div style="padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${GRT_T[e.type]||e.type}: ${e.title}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:3px">
            ${showAdmin ? `<strong>${u.name}</strong> · ` : ''}${e.ts}${e.date ? ` · 📅 <strong>${e.date}</strong>` : ''}
          </div>
          ${e.desc ? `<div style="font-size:12px;color:var(--t2);margin-top:6px">${e.desc}</div>` : ''}
          ${e.rejectReason ? `<div style="font-size:11px;color:var(--rdt);background:var(--rdb);padding:5px 10px;border-radius:6px;margin-top:6px">❌ Red: ${e.rejectReason}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span class="badge ${st2.c}">${st2.l}</span>
          ${showAdmin ? `
            <button class="btn btns" onclick="openGrtApproval(${e.id})" style="font-size:11px;white-space:nowrap">🔐 İncele</button>
            <button class="btn btns btng" onclick="_updGrt(${e.id},'done')" style="font-size:11px">✔ Tamamla</button>` : ''}
        </div>
      </div>
      ${visibleNotes.length ? `
        <div style="border-top:1px solid var(--b);padding:10px 16px;background:rgba(251,191,36,.05)">
          <div style="font-size:10px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">
            🔒 ${_isAdminGr() ? 'Yönetici Notları' : 'Paylaşılan Notlar'}
          </div>
          ${visibleNotes.map(n => `
            <div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;padding:9px 12px;margin-bottom:6px">
              <div style="font-size:12px;line-height:1.5">${n.text}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px">
                <span style="font-size:10px;color:var(--t3)">— ${n.byName} · ${n.ts.slice(0,16)}</span>
                ${(n.sharedWith||[]).length ? `<span style="font-size:10px;background:var(--grb);color:var(--grt);padding:1px 7px;border-radius:4px">👁 ${n.sharedWith.length} kişi</span>` : `<span style="font-size:10px;background:var(--rdb);color:var(--rdt);padding:1px 7px;border-radius:4px">🔒 Gizli</span>`}
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
  };

  if (_isAdminGr()) {
    const al = _ggr('grt-admin-list');
    if (al) al.innerHTML = !grtList.length
      ? `<div style="padding:22px;text-align:center;color:var(--t2)">Görüşme talebi yok.</div>`
      : grtList.map(e => renderItem(e, true)).join('');
  }

  const ml = _ggr('grt-my-list');
  if (ml) {
    const my = grtList.filter(e => e.uid === cu?.id);
    ml.innerHTML = !my.length
      ? `<div style="padding:22px;text-align:center;color:var(--t2)">Henüz görüşme talebiniz yok.<br><button class="btn btnp" style="margin-top:12px" onclick="openGrtModal()">+ Talep Oluştur</button></div>`
      : my.map(e => renderItem(e, false)).join('');
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — CRUD
// ════════════════════════════════════════════════════════════════

function updateGrtBadge() {
  const n = _loadGrt().filter(g2 => g2.status === 'pending').length;
  const b = _ggr('nb-grt-b');
  if (b) { b.textContent = n; b.style.display = n > 0 ? 'inline' : 'none'; }
}

function openGrtModal() {
  _injectGorusmePanel();
  if (_ggr('grt-title'))  _ggr('grt-title').value  = '';
  if (_ggr('grt-desc'))   _ggr('grt-desc').value   = '';
  if (_ggr('grt-type'))   _ggr('grt-type').value   = 'manager';
  if (_ggr('grt-desc-count')) _ggr('grt-desc-count').textContent = '0 karakter';
  const minDate = _addBusinessDays(new Date(), 3);
  const dateEl  = _ggr('grt-date');
  if (dateEl) { dateEl.min = minDate.toISOString().slice(0,10); dateEl.value = ''; }
  window.openMo?.('mo-grt');
}

function saveGrt() {
  const title = (_ggr('grt-title')?.value || '').trim();
  const desc  = (_ggr('grt-desc')?.value  || '').trim();
  const date  = _ggr('grt-date')?.value   || '';
  if (!title) { window.toast?.('Konu başlığı zorunludur', 'err'); return; }
  if (!desc || desc.length < 20) { window.toast?.('Açıklama zorunludur (min 20 karakter)', 'err'); return; }
  if (!date) { window.toast?.('Tercih edilen tarih zorunludur', 'err'); return; }
  const minDate = _addBusinessDays(new Date(), 3);
  if (new Date(date) < minDate) { window.toast?.('Randevu en az 3 iş günü öncesinden talep edilmelidir', 'err'); return; }
  const cu = _CUgr();
  const d  = _loadGrt();
  d.push({ id: generateNumericId(), uid: cu?.id, uname: cu?.name, title, type: _ggr('grt-type')?.value, desc, date, status: 'pending', ts: _nowTsGr(), adminNotes: [] });
  _storeGrt(d);
  window.closeMo?.('mo-grt');
  renderGorusme();
  updateGrtBadge();
  window.logActivity?.('view', `"${title}" görüşme talebi oluşturdu (${date})`);
  window.toast?.('Talep gönderildi ✓', 'ok');
}

function openGrtApproval(id) {
  _grtApprovalId = id;
  const e = _loadGrt().find(x => x.id === id); if (!e) return;
  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  const u = users.find(x => x.id === e.uid) || { name: '?' };
  const body = _ggr('grt-approval-body'); if (!body) return;
  body.innerHTML = `
    <div class="dr"><span class="dl">Kişi</span><strong>${u.name}</strong></div>
    <div class="dr"><span class="dl">Tür</span>${GRT_T[e.type]||e.type}</div>
    <div class="dr"><span class="dl">Konu</span>${e.title}</div>
    <div class="dr"><span class="dl">Talep Tarihi</span>${e.ts}</div>
    <div class="dr"><span class="dl">Tercih Tarih</span><strong>${e.date||'—'}</strong></div>
    <div style="margin:12px 0;padding:12px;background:var(--s2);border-radius:var(--rs);font-size:13px;color:var(--t2)">${e.desc}</div>
    <div class="fg" style="margin-top:12px">
      <label class="fl">Yönetici Notu</label>
      <textarea class="fi" id="grt-admin-note" rows="3" style="resize:vertical" placeholder="Gizli not (isteğe bağlı)..."></textarea>
    </div>
    <div class="fg">
      <label class="fl">Notları Paylaş</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${users.filter(x=>x.status==='active'&&x.id!==(_CUgr()?.id)).map(x=>`
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;background:var(--sf);padding:4px 10px;border-radius:8px;border:1px solid var(--b)">
            <input type="checkbox" id="grt-share-${x.id}" value="${x.id}" style="accent-color:var(--ac)">${x.name}
          </label>`).join('')}
      </div>
    </div>`;
  window.openMo?.('mo-grt-approval');
}

function _grtApprove() {
  _updGrt(_grtApprovalId, 'approved');
  _saveAdminNote(_grtApprovalId);
  window.closeMo?.('mo-grt-approval');
}

function _grtReject() {
  const reason = prompt('Red sebebi (isteğe bağlı):');
  if (reason === null) return;
  _updGrt(_grtApprovalId, 'rejected', reason);
  window.closeMo?.('mo-grt-approval');
}

function _saveAdminNote(id) {
  const noteEl = _ggr('grt-admin-note');
  const text   = (noteEl?.value || '').trim();
  if (!text) return;
  const cu    = _CUgr();
  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  const sharedWith = users.filter(u => _ggr(`grt-share-${u.id}`)?.checked).map(u => u.id);
  const d = _loadGrt();
  const e = d.find(x => x.id === id); if (!e) return;
  if (!Array.isArray(e.adminNotes)) e.adminNotes = [];
  e.adminNotes.push({ id: generateNumericId(), text, byName: cu?.name, ts: _nowTsGr(), sharedWith });
  _storeGrt(d);
}

function _updGrt(id, status, rejectReason) {
  const d = _loadGrt();
  const e = d.find(x => x.id === id); if (!e) return;
  e.status = status;
  if (rejectReason !== undefined) e.rejectReason = rejectReason;
  _storeGrt(d);
  renderGorusme();
  updateGrtBadge();
  window.toast?.(status === 'approved' ? 'Onaylandı ✓' : status === 'rejected' ? 'Reddedildi' : 'Güncellendi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Gorusme = { render: renderGorusme, openModal: openGrtModal, save: saveGrt, openApproval: openGrtApproval, update: _updGrt, updateBadge: updateGrtBadge, GRT_T, GRT_ST };

if (typeof module !== 'undefined' && module.exports) { module.exports = Gorusme; }
else {
  window.Gorusme       = Gorusme;
  window.renderGorusme = renderGorusme;
  window.openGrtModal  = openGrtModal;
  window.saveGrt       = saveGrt;
  window.openGrtApproval = openGrtApproval;
  window.updateGrtBadge  = updateGrtBadge;
  window._updGrt         = _updGrt;
  window._grtApprove     = _grtApprove;
  window._grtReject      = _grtReject;
  window.GRT_T           = GRT_T;
  window.GRT_ST          = GRT_ST;
}
