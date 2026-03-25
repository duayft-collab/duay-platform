/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/announce.js  —  v8.1.0
 * Duyurular & Öneri Sistemi
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// closeMo → window.closeMo (app.js)

const _ga  = id  => document.getElementById(id);
const _sta = (id,v) => { const el = _ga(id); if (el) el.textContent = v; };
const _p2a = n   => String(n).padStart(2,'0');
const _nowTsa = () => { const n=new Date(); return `${n.getFullYear()}-${_p2a(n.getMonth()+1)}-${_p2a(n.getDate())} ${_p2a(n.getHours())}:${_p2a(n.getMinutes())}:${_p2a(n.getSeconds())}`; };
const _isAdminA = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUa      = () => window.Auth?.getCU?.();

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML INJECT
// ════════════════════════════════════════════════════════════════

function _injectAnnouncePanel() {
  const panel = _ga('panel-announce');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
      <div><div class="pht">📢 Duyurular</div><div class="phs">Şirket geneli duyurular ve iletişim</div></div>
      <div class="ur">
        ${_isAdminA() ? `<button class="btn btnp" onclick="openAnnModal()">+ Yeni Duyuru</button>` : ''}
      </div>
    </div>

    <!-- Filtre Chipsleri -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <button class="chip on" onclick="setAnnFilter('all',this)">Tümü</button>
      <button class="chip"    onclick="setAnnFilter('info',this)">ℹ️ Bilgi</button>
      <button class="chip"    onclick="setAnnFilter('warn',this)">⚠️ Önemli</button>
      <button class="chip"    onclick="setAnnFilter('ok',this)">✅ Duyuru</button>
    </div>

    <!-- Duyuru Listesi -->
    <div id="ann-list"></div>

    <!-- ── MODAL: Duyuru Ekle/Düzenle ── -->
    <div class="mo" id="mo-ann" role="dialog" aria-modal="true" aria-labelledby="mo-ann-t">
      <div class="moc" style="max-width:520px">
        <div class="moh">
          <span class="mot" id="mo-ann-t">+ Yeni Duyuru</span>
          <button class="mcl" onclick="closeMo('mo-ann')" aria-label="Kapat">✕</button>
        </div>
        <div class="mob">
          <input type="hidden" id="ann-eid">
          <div class="fg">
            <label class="fl">Başlık</label>
            <input class="fi" id="ann-title" placeholder="Duyuru başlığı..." maxlength="120">
          </div>
          <div class="fg">
            <label class="fl">İçerik</label>
            <textarea class="fi" id="ann-body" rows="4" style="resize:vertical" placeholder="Duyuru detayı..."></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Tür</label>
              <select class="fi" id="ann-type">
                <option value="info">ℹ️ Bilgi</option>
                <option value="warn">⚠️ Önemli</option>
                <option value="ok">✅ Duyuru</option>
                <option value="err">🚨 Acil</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">Hedef Kitle</label>
              <select class="fi" id="ann-audience">
                <option value="all">Tüm Personel</option>
                <option value="admin">Sadece Yöneticiler</option>
                <option value="staff">Personel</option>
              </select>
            </div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-ann')">İptal</button>
          <button class="btn btnp" onclick="saveAnn()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — FİLTRE DURUMU
// ════════════════════════════════════════════════════════════════
let ANN_FILTER = 'all';

function setAnnFilter(f, btn) {
  ANN_FILTER = f;
  document.querySelectorAll('#panel-announce .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderAnnouncements();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — RENDER
// ════════════════════════════════════════════════════════════════

function renderAnnouncements() {
  _injectAnnouncePanel();
  const cu  = _CUa();
  if (!cu) return;
  let anns = loadAnn();
  if (ANN_FILTER !== 'all') anns = anns.filter(a => a.type === ANN_FILTER);

  updateAnnBadge();

  const TYPE_MAP = {
    info: { ic:'ℹ️', bg:'var(--blb)', tx:'var(--blt)', label:'Bilgi' },
    warn: { ic:'⚠️', bg:'var(--amb)', tx:'var(--amt)', label:'Önemli' },
    ok:   { ic:'✅', bg:'var(--grb)', tx:'var(--grt)', label:'Duyuru' },
    err:  { ic:'🚨', bg:'var(--rdb)', tx:'var(--rdt)', label:'Acil'   },
  };

  const cont = _ga('ann-list');
  if (!cont) return;

  if (!anns.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">📢</div>
      <div style="font-size:15px;font-weight:500">Henüz duyuru yok</div>
      <div style="font-size:13px;margin-top:6px">Yeni bir duyuru eklemek için "+ Yeni Duyuru" butonunu kullanın.</div>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  anns.forEach(ann => {
    const t   = TYPE_MAP[ann.type] || TYPE_MAP.info;
    const isRead = Array.isArray(ann.read) && ann.read.includes(cu.id);
    const card  = document.createElement('div');
    card.style.cssText = `background:var(--sf);border:1.5px solid ${isRead ? 'var(--b)' : t.bg};border-radius:var(--r);padding:16px 18px;margin-bottom:10px;transition:border .2s;cursor:pointer`;
    card.onclick = () => markAnnRead(ann.id);
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="font-size:22px;flex-shrink:0;margin-top:2px">${t.ic}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:14px;color:var(--t)">${ann.title}</span>
            <span class="badge" style="background:${t.bg};color:${t.tx};font-size:10px">${t.label}</span>
            ${!isRead ? `<span class="badge ba" style="font-size:10px">🔵 Yeni</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--t2);line-height:1.6;white-space:pre-line">${ann.body || ''}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
            <span style="font-size:11px;color:var(--t3)">🕐 ${ann.ts || ''} · ${ann.addedByName || 'Yönetim'}</span>
            <div style="display:flex;gap:6px">
              ${_isAdminA() ? `<button class="btn btns" onclick="event.stopPropagation();openAnnModal(${ann.id})">✏️</button>` : ''}
              ${_isAdminA() ? `<button class="btn btns btnd" onclick="event.stopPropagation();delAnn(${ann.id})">🗑</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — CRUD
// ════════════════════════════════════════════════════════════════

function markAnnRead(id) {
  const cu = _CUa(); if (!cu) return;
  const anns = loadAnn();
  const ann  = anns.find(a => a.id === id); if (!ann) return;
  if (!Array.isArray(ann.read)) ann.read = [];
  if (!ann.read.includes(cu.id)) {
    ann.read.push(cu.id);
    storeAnn(anns);
    updateAnnBadge();
  }
}

function openAnnModal(id) {
  _injectAnnouncePanel();
  if (id) {
    const ann = loadAnn().find(a => a.id === id); if (!ann) return;
    if (_ga('ann-title'))    _ga('ann-title').value    = ann.title;
    if (_ga('ann-body'))     _ga('ann-body').value     = ann.body || '';
    if (_ga('ann-type'))     _ga('ann-type').value     = ann.type || 'info';
    if (_ga('ann-audience')) _ga('ann-audience').value = ann.audience || 'all';
    if (_ga('ann-eid'))      _ga('ann-eid').value      = id;
    _sta('mo-ann-t', '✏️ Duyuru Düzenle');
  } else {
    ['ann-title','ann-body'].forEach(i => { const el = _ga(i); if (el) el.value = ''; });
    if (_ga('ann-type'))     _ga('ann-type').value     = 'info';
    if (_ga('ann-audience')) _ga('ann-audience').value = 'all';
    if (_ga('ann-eid'))      _ga('ann-eid').value      = '';
    _sta('mo-ann-t', '+ Yeni Duyuru');
  }
  window.openMo?.('mo-ann');
}

function saveAnn() {
  const title = (_ga('ann-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const cu   = _CUa();
  const anns = loadAnn();
  const eid  = parseInt(_ga('ann-eid')?.value || '0');
  const entry = {
    title,
    body:     _ga('ann-body')?.value     || '',
    type:     _ga('ann-type')?.value     || 'info',
    audience: _ga('ann-audience')?.value || 'all',
    ts:       _nowTsa(),
    read:     [],
    addedBy:  cu?.id,
    addedByName: cu?.name || 'Yönetim',
  };
  if (eid) { const a = anns.find(x => x.id === eid); if (a) Object.assign(a, entry); }
  else anns.unshift({ id: Date.now(), ...entry });
  storeAnn(anns);
  window.closeMo?.('mo-ann');
  renderAnnouncements();
  window.logActivity?.('view', `"${title}" duyurusu eklendi`);
  window.toast?.(eid ? 'Duyuru güncellendi ✓' : 'Duyuru yayınlandı ✓', 'ok');
}

function delAnn(id) {
  if (!_isAdminA()) return;
  if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) return;
  storeAnn(loadAnn().filter(a => a.id !== id));
  renderAnnouncements();
  window.toast?.('Duyuru silindi', 'ok');
}

function updateAnnBadge() {
  const cu   = _CUa(); if (!cu) return;
  const anns = loadAnn();
  const unread = anns.filter(a => !Array.isArray(a.read) || !a.read.includes(cu.id)).length;
  const badge  = _ga('nb-ann-b');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline' : 'none'; }
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Announce = { render: renderAnnouncements, openModal: openAnnModal, save: saveAnn, del: delAnn, markRead: markAnnRead, updateBadge: updateAnnBadge, setFilter: setAnnFilter };

if (typeof module !== 'undefined' && module.exports) { module.exports = Announce; }
else {
  window.Announce = Announce;
  // Diğer modüllerin duyuru oluşturabilmesi için
  window.loadAnn  = window.loadAnn  || function() { try { return JSON.parse(localStorage.getItem('ak_ann') || '[]'); } catch { return []; } };
  window.storeAnn = window.storeAnn || function(d) { localStorage.setItem('ak_ann', JSON.stringify(d)); };
  window.renderAnnouncements = renderAnnouncements;
  window.openAnnModal        = openAnnModal;
  window.saveAnn             = saveAnn;
  window.delAnn              = delAnn;
  window.updateAnnBadge      = updateAnnBadge;
  window.setAnnFilter        = setAnnFilter;
}
