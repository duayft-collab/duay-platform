/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/lojistik.js  —  v8.1.0
 * Lojistik Merkezi — 4 Alt Modül
 *
 * Sekmeler:
 *   1. 📦 Kargo       — gelen/giden kargo, etiket, firma yönetimi
 *   2. 🚢 Konteyner   — deniz/hat takibi, adımlar, polling
 *   3. ✈️ Hava Kargo  — AWB, IATA, uçuş takibi
 *   4. 🚛 Karayolu    — plaka, şoför, rota, teslimat
 *
 * Firebase: tenants/{tid}/data/lojistik/records
 * Anayasa : Soft delete, logActivity, DocumentFragment, error boundary
 * ════════════════════════════════════════════════════════════════
 */

'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

// ── Yardımcılar ───────────────────────────────────────────────────
const _gl  = id  => document.getElementById(id);
const _stl = (id,v) => { const e=_gl(id); if(e) e.textContent=v; };
const _p2l = n   => String(n).padStart(2,'0');
const _tsL = ()  => { const n=new Date(); return `${n.getFullYear()}-${_p2l(n.getMonth()+1)}-${_p2l(n.getDate())} ${_p2l(n.getHours())}:${_p2l(n.getMinutes())}:${_p2l(n.getSeconds())}`; };
const _CUl      = () => window.Auth?.getCU?.();
const _isAdminL = () => window.Auth?.getCU?.()?.role === 'admin';
const _toastL   = (m,t) => window.toast?.(m,t);
const _logL     = (t,d) => window.logActivity?.(t,d);
const _openMoL  = id => window.openMo?.(id);
const _closeMoL = id => window.closeMo?.(id);

// ── Aktif sekme durumu ────────────────────────────────────────────
let _LOJ_TAB = 'kargo';   // 'kargo' | 'konteyn' | 'hava' | 'karayolu'
let _LOJ_FILTER = 'all';

// ── Sabitler ──────────────────────────────────────────────────────
const LOJ_KARGO_STATUS = {
  bekle:  { l:'⏳ Beklemede', c:'ba' },
  yolda:  { l:'🚛 Yolda',    c:'bb' },
  teslim: { l:'✅ Teslim',   c:'bg' },
  iade:   { l:'↩️ İade',     c:'br' },
};

const LOJ_HAVA_STATUS = {
  bekle:    { l:'⏳ Beklemede',  c:'ba' },
  check_in: { l:'📋 Check-In',  c:'bb' },
  ucakta:   { l:'✈️ Uçuşta',   c:'bp' },
  geldi:    { l:'✅ Geldi',     c:'bg' },
  gecikme:  { l:'⚠️ Gecikme',  c:'br' },
};

const LOJ_KARA_STATUS = {
  bekle:   { l:'⏳ Beklemede',   c:'ba' },
  yolda:   { l:'🚛 Yolda',      c:'bb' },
  teslim:  { l:'✅ Teslim',     c:'bg' },
  sorun:   { l:'⚠️ Sorun',     c:'br' },
};

const KARA_ARAC_TIPLERI = ['Kamyon','TIR','Kamyonet','Van','Çekici','Tanker','Frigorifik'];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML INJECT
// ════════════════════════════════════════════════════════════════

function _injectLojistikPanel() {
  const panel = _gl('panel-lojistik');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  // Pro modal HTML - ilk inject'te ekle
  if (!document.getElementById('loj-pro-modal')) {
    const proDiv = document.createElement('div');
    proDiv.innerHTML = `
<!-- FreightPro Pro Modal -->
<div id="loj-pro-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;backdrop-filter:blur(4px)">
  <div style="position:absolute;inset:20px;background:var(--bg);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--b);background:var(--sf)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⚓</span>
        <span style="font-weight:700;font-size:15px">Duay Lojistik Pro</span>
        <span style="font-size:11px;background:var(--al);color:var(--ac);border:1px solid var(--ac);border-radius:6px;padding:2px 8px">Konteyner & Navlun</span>
      </div>
      <button onclick="Lojistik.closePro()" style="background:var(--s2);border:1px solid var(--b);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:13px;color:var(--t)">✕ Kapat</button>
    </div>
    <iframe id="loj-pro-iframe" src="" style="flex:1;border:none;width:100%;height:100%" title="Duay Lojistik Pro"></iframe>
  </div>
</div>
<style>
#loj-pro-modal { animation: lopFadeIn .2s ease; }
@keyframes lopFadeIn { from { opacity:0 } to { opacity:1 } }
</style>
`;
    document.body.appendChild(proDiv.firstElementChild);
  }

  panel.innerHTML = `
<!-- ── HEADER ── -->
<div class="ph" style="padding-bottom:0">
  <div>
    <div class="pht">🚚 Lojistik Merkezi</div>
    <div class="phs">Kargo · Konteyner · Hava Kargo · Karayolu</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn btns" onclick="Lojistik.exportXlsx()">⬇ Excel</button>
    <button class="btn btnp" id="btn-loj-add" onclick="Lojistik.openAddModal()">+ Yeni Kayıt</button>
    <button class="btn btns" onclick="Lojistik.openPro()" style="background:var(--al);color:var(--ac);border:1px solid var(--ac)">⚓ Pro Modül</button>
  </div>
</div>

<!-- ── SEKMELER ── -->
<div style="display:flex;gap:0;border-bottom:2px solid var(--b);margin:0 0 18px 0;padding:0 18px">
  <button class="loj-tab on" data-tab="kargo"    onclick="Lojistik.setTab('kargo',this)">📦 Kargo</button>
  <button class="loj-tab"    data-tab="konteyn"   onclick="Lojistik.setTab('konteyn',this)">🚢 Konteyner</button>
  <button class="loj-tab"    data-tab="hava"      onclick="Lojistik.setTab('hava',this)">✈️ Hava Kargo</button>
  <button class="loj-tab"    data-tab="karayolu"  onclick="Lojistik.setTab('karayolu',this)">🚛 Karayolu</button>
</div>

<!-- ── KARGO SEKMESİ ── -->
<div id="loj-tab-kargo" class="loj-tab-content">
  <div class="sg">
    <div class="ms"><div class="msv" id="lkrg-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="lkrg-gelen">0</div><div class="msl">📥 Gelen</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="lkrg-giden">0</div><div class="msl">📤 Giden</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="lkrg-bekle">0</div><div class="msl">⏳ Beklemede</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="lkrg-teslim">0</div><div class="msl">✅ Teslim</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <button class="chip on" onclick="Lojistik.setFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="Lojistik.setFilter('gelen',this)">📥 Gelen</button>
    <button class="chip"    onclick="Lojistik.setFilter('giden',this)">📤 Giden</button>
    <button class="chip"    onclick="Lojistik.setFilter('bekle',this)">⏳ Beklemede</button>
    <button class="chip"    onclick="Lojistik.setFilter('teslim',this)">✅ Teslim</button>
    <input class="si" id="lkrg-search" placeholder="🔍 Kargo ara..." oninput="Lojistik.render()" style="margin-left:auto;width:180px">
  </div>
  <div id="loj-kargo-list"></div>
</div>

<!-- ── KONTEYNER SEKMESİ ── -->
<div id="loj-tab-konteyn" class="loj-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="lktn-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="lktn-aktif">0</div><div class="msl">🚢 Aktif</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="lktn-teslim">0</div><div class="msl">✅ Teslim</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="lktn-gecikme">0</div><div class="msl">⚠️ Gecikme</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="btn btns" onclick="Lojistik.checkAllKonteyn()">🔄 Tümünü Kontrol Et</button>
    <button class="btn btnp" onclick="Lojistik.openKonteynModal(null)">+ Yeni Konteyner</button>
    <input class="si" id="lktn-search" placeholder="🔍 Konteyner / hat ara..." oninput="Lojistik.renderKonteyn()" style="margin-left:auto;width:200px">
  </div>
  <div id="loj-konteyn-list"></div>
</div>

<!-- ── HAVA KARGO SEKMESİ ── -->
<div id="loj-tab-hava" class="loj-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="lhv-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="lhv-ucakta">0</div><div class="msl">✈️ Uçuşta</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="lhv-geldi">0</div><div class="msl">✅ Geldi</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="lhv-gecikme">0</div><div class="msl">⚠️ Gecikme</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="Lojistik.setHavaFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="Lojistik.setHavaFilter('ucakta',this)">✈️ Uçuşta</button>
    <button class="chip"    onclick="Lojistik.setHavaFilter('gecikme',this)">⚠️ Gecikme</button>
    <button class="btn btnp" onclick="Lojistik.openHavaModal(null)" style="margin-left:auto">+ AWB Ekle</button>
  </div>
  <div id="loj-hava-list"></div>
</div>

<!-- ── KARAYOLU SEKMESİ ── -->
<div id="loj-tab-karayolu" class="loj-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="lkr-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="lkr-yolda">0</div><div class="msl">🚛 Yolda</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="lkr-teslim">0</div><div class="msl">✅ Teslim</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="lkr-sorun">0</div><div class="msl">⚠️ Sorun</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="Lojistik.setKaraFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="Lojistik.setKaraFilter('yolda',this)">🚛 Yolda</button>
    <button class="chip"    onclick="Lojistik.setKaraFilter('teslim',this)">✅ Teslim</button>
    <button class="btn btnp" onclick="Lojistik.openKarayoluModal(null)" style="margin-left:auto">+ Sefer Ekle</button>
  </div>
  <div id="loj-karayolu-list"></div>
</div>

<!-- ── CSS ── -->
<style>
.loj-tab {
  padding:10px 18px;font-size:13px;font-weight:600;border:none;
  background:none;cursor:pointer;color:var(--t2);border-bottom:2px solid transparent;
  margin-bottom:-2px;transition:all .2s;white-space:nowrap;
}
.loj-tab.on { color:var(--ac);border-bottom-color:var(--ac); }
.loj-tab:hover:not(.on) { color:var(--t);background:var(--s2); }
.loj-card {
  background:var(--sf);border:1px solid var(--b);border-radius:12px;
  padding:14px 16px;margin-bottom:10px;transition:box-shadow .2s;
}
.loj-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
.konteyn-step { display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b); }
.konteyn-step:last-child { border:none; }
.konteyn-step input[type=checkbox] { accent-color:var(--ac);width:16px;height:16px;flex-shrink:0; }
</style>
`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — SEKME YÖNETİMİ
// ════════════════════════════════════════════════════════════════

function setLojTab(tab, btn) {
  _LOJ_TAB = tab;
  document.querySelectorAll('#panel-lojistik .loj-tab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  ['kargo','konteyn','hava','karayolu'].forEach(t => {
    const el = _gl(`loj-tab-${t}`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  // Aktif sekmeyi render et
  if (tab === 'kargo')     renderLojKargo();
  if (tab === 'konteyn')   renderLojKonteyn();
  if (tab === 'hava')      renderLojHava();
  if (tab === 'karayolu')  renderLojKarayolu();
}

function setLojFilter(f, btn) {
  _LOJ_FILTER = f;
  document.querySelectorAll('#loj-tab-kargo .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderLojKargo();
}

let _HAVA_FILTER = 'all';
function setLojHavaFilter(f, btn) {
  _HAVA_FILTER = f;
  document.querySelectorAll('#loj-tab-hava .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderLojHava();
}

let _KARA_FILTER = 'all';
function setLojKaraFilter(f, btn) {
  _KARA_FILTER = f;
  document.querySelectorAll('#loj-tab-karayolu .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderLojKarayolu();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — KARGO RENDER (DocumentFragment)
// ════════════════════════════════════════════════════════════════

function renderLojKargo() {
  const cont = _gl('loj-kargo-list');
  if (!cont) return;
  if (typeof window.showSkeleton === 'function') window.showSkeleton(cont, 3);

  const data  = typeof loadKargo === 'function' ? loadKargo() : [];
  const users = typeof loadUsers === 'function' ? loadUsers() : [];
  const search = (_gl('lkrg-search')?.value || '').toLowerCase();
  const cu    = _CUl();

  let items = _isAdminL() ? data : data.filter(k => k.uid === cu?.id);
  // Soft delete filtresi
  items = items.filter(k => !k.isDeleted);
  if (_LOJ_FILTER !== 'all')  items = items.filter(k => k.dir === _LOJ_FILTER || k.status === _LOJ_FILTER);
  if (search) items = items.filter(k =>
    (k.alici || k.gonderen || k.takipNo || k.firma || '').toLowerCase().includes(search)
  );

  _stl('lkrg-total',  data.filter(k=>!k.isDeleted).length);
  _stl('lkrg-gelen',  data.filter(k=>k.dir==='gelen'&&!k.isDeleted).length);
  _stl('lkrg-giden',  data.filter(k=>k.dir==='giden'&&!k.isDeleted).length);
  _stl('lkrg-bekle',  data.filter(k=>k.status==='bekle'&&!k.isDeleted).length);
  _stl('lkrg-teslim', data.filter(k=>k.status==='teslim'&&!k.isDeleted).length);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">📦</div>
      <div style="font-weight:600;margin-bottom:6px">Kargo kaydı bulunamadı</div>
      <button class="btn btnp" onclick="Lojistik.openAddModal()">+ İlk Kaydı Ekle</button>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(k => {
    const u   = users.find(x => x.id === k.uid) || { name:'?' };
    const st  = LOJ_KARGO_STATUS[k.status] || LOJ_KARGO_STATUS.bekle;
    const dir = k.dir === 'gelen' ? '📥 Gelen' : '📤 Giden';
    const card = document.createElement('div');
    card.className = 'loj-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--s2)">${dir}</span>
            <span class="badge ${st.c}">${st.l}</span>
            ${k.firma ? `<span style="font-size:11px;color:var(--t3)">${k.firma}</span>` : ''}
          </div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">
            ${k.alici || k.gonderen || 'İsimsiz'}
            ${k.agirlik ? `<span style="font-size:11px;color:var(--t2);font-weight:400;margin-left:6px">${k.agirlik} kg</span>` : ''}
          </div>
          ${k.takipNo ? `<div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--ac);margin-bottom:4px">📮 ${k.takipNo}</div>` : ''}
          ${k.adres   ? `<div style="font-size:12px;color:var(--t2)">📍 ${k.adres}</div>` : ''}
          ${k.not     ? `<div style="font-size:11px;color:var(--t3);margin-top:4px">💬 ${k.not.slice(0,80)}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:var(--t3)">${k.tarih || ''}</div>
          <div style="font-size:11px;color:var(--t3);margin-bottom:8px">${u.name}</div>
          <div style="display:flex;gap:4px;justify-content:flex-end">
            ${k.takipUrl ? `<a href="${k.takipUrl}" target="_blank" class="btn btns" style="text-decoration:none;font-size:11px">🔗 Takip</a>` : ''}
            <button class="btn btns" onclick="Lojistik.printLabel(${k.id})" title="Etiket">🖨</button>
            <button class="btn btns" onclick="Lojistik.openEditKargo(${k.id})">✏️</button>
            ${_isAdminL() ? `<button class="btn btns btnd" onclick="Lojistik.delKargo(${k.id})">🗑</button>` : ''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — KONTEYNER RENDER
// ════════════════════════════════════════════════════════════════

function renderLojKonteyn() {
  const cont = _gl('loj-konteyn-list');
  if (!cont) return;

  const data   = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const active = data.filter(k => k.status !== 'teslim' && !k.isDeleted);
  const search = (_gl('lktn-search')?.value || '').toLowerCase();

  _stl('lktn-total',   data.filter(k=>!k.isDeleted).length);
  _stl('lktn-aktif',   data.filter(k=>!k.kapandi&&!k.isDeleted).length);
  _stl('lktn-teslim',  data.filter(k=>k.kapandi&&!k.isDeleted).length);
  _stl('lktn-gecikme', data.filter(k=>k.gecikme&&!k.isDeleted).length);

  let items = data.filter(k => !k.isDeleted);
  if (search) items = items.filter(k =>
    (k.no || k.hat || k.liman || '').toLowerCase().includes(search)
  );

  if (!items.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🚢</div>
      <div style="font-weight:600;margin-bottom:6px">Konteyner kaydı yok</div>
      <button class="btn btnp" onclick="Lojistik.openKonteynModal(null)">+ Konteyner Ekle</button>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(k => {
    const steps      = k.adimlar || [];
    const doneCount  = steps.filter(s => s.done).length;
    const pct        = steps.length ? Math.round(doneCount / steps.length * 100) : 0;
    const card = document.createElement('div');
    card.className = 'loj-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:22px">🚢</span>
            <div>
              <div style="font-weight:700;font-size:14px">${k.no || 'Konteyner No Yok'}</div>
              ${k.hat ? `<div style="font-size:11px;color:var(--t2)">${k.hat} ${k.liman?'→ '+k.liman:''}</div>` : ''}
            </div>
            <span class="badge ${k.kapandi?'bg':'bb'}" style="margin-left:auto">${k.kapandi?'✅ Teslim':'🚢 Yolda'}</span>
          </div>
          ${steps.length ? `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t2);margin-bottom:4px">
              <span>İlerleme</span><span>${doneCount}/${steps.length} adım</span>
            </div>
            <div style="height:6px;background:var(--s2);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--ac);border-radius:99px;transition:width .4s"></div>
            </div>
          </div>
          <div style="max-height:120px;overflow-y:auto">
            ${steps.map((s,i) => `
              <div class="konteyn-step">
                <input type="checkbox" ${s.done?'checked':''} onchange="Lojistik.toggleKonteynStep(${k.id},${i},this.checked)">
                <span style="font-size:12px;${s.done?'text-decoration:line-through;color:var(--t3)':''}">${s.ad || s.label || 'Adım '+(i+1)}</span>
                ${s.ts ? `<span style="font-size:10px;color:var(--t3);margin-left:auto">${s.ts.slice(0,16)}</span>` : ''}
              </div>`).join('')}
          </div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:var(--t3);margin-bottom:4px">${k.varTarih?'🗓 '+k.varTarih:''}</div>
          ${k.takipUrl ? `<a href="${k.takipUrl}" target="_blank" class="btn btns" style="text-decoration:none;font-size:11px;display:block;margin-bottom:4px">🔗 Canlı Takip</a>` : ''}
          <div style="display:flex;gap:4px;justify-content:flex-end">
            <button class="btn btns" onclick="Lojistik.openKonteynModal(${k.id})">✏️</button>
            ${!k.kapandi ? `<button class="btn btns btng" onclick="Lojistik.closeKonteyn(${k.id})">✅ Teslim</button>` : ''}
            ${_isAdminL() ? `<button class="btn btns btnd" onclick="Lojistik.delKonteyn(${k.id})">🗑</button>` : ''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — HAVA KARGO RENDER
// ════════════════════════════════════════════════════════════════

function _loadHava() {
  try { return JSON.parse(localStorage.getItem('ak_loj_hava1') || '[]'); } catch { return []; }
}
function _storeHava(d) { localStorage.setItem('ak_loj_hava1', JSON.stringify(d)); }

function renderLojHava() {
  const cont = _gl('loj-hava-list');
  if (!cont) return;

  const data = _loadHava().filter(h => !h.isDeleted);
  _stl('lhv-total',   data.length);
  _stl('lhv-ucakta',  data.filter(h=>h.status==='ucakta').length);
  _stl('lhv-geldi',   data.filter(h=>h.status==='geldi').length);
  _stl('lhv-gecikme', data.filter(h=>h.status==='gecikme').length);

  let items = data;
  if (_HAVA_FILTER !== 'all') items = items.filter(h => h.status === _HAVA_FILTER);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">✈️</div>
      <div style="font-weight:600;margin-bottom:6px">Hava kargo kaydı yok</div>
      <button class="btn btnp" onclick="Lojistik.openHavaModal(null)">+ AWB Ekle</button>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(h => {
    const st = LOJ_HAVA_STATUS[h.status] || LOJ_HAVA_STATUS.bekle;
    const card = document.createElement('div');
    card.className = 'loj-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:20px">✈️</span>
            <span class="badge ${st.c}">${st.l}</span>
            ${h.havayolu ? `<span style="font-size:11px;font-weight:700;color:var(--ac)">${h.havayolu}</span>` : ''}
          </div>
          <div style="font-weight:700;font-size:14px;font-family:'DM Mono',monospace;margin-bottom:4px">
            AWB: ${h.awb || '—'}
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;gap:16px;flex-wrap:wrap">
            ${h.kalkis   ? `<span>🛫 ${h.kalkis}</span>` : ''}
            ${h.varis    ? `<span>🛬 ${h.varis}</span>` : ''}
            ${h.ucusSayi ? `<span>✈️ ${h.ucusSayi}</span>` : ''}
            ${h.agirlik  ? `<span>⚖️ ${h.agirlik} kg</span>` : ''}
            ${h.hacim    ? `<span>📦 ${h.hacim} m³</span>` : ''}
          </div>
          ${h.icerik ? `<div style="font-size:11px;color:var(--t3);margin-top:4px">📋 ${h.icerik}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:var(--t3)">${h.tarih || ''}</div>
          <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:8px">
            ${h.takipUrl ? `<a href="${h.takipUrl}" target="_blank" class="btn btns" style="text-decoration:none">🔗</a>` : ''}
            <button class="btn btns" onclick="Lojistik.openHavaModal(${h.id})">✏️</button>
            ${_isAdminL() ? `<button class="btn btns btnd" onclick="Lojistik.delHava(${h.id})">🗑</button>` : ''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — KARAYOLU RENDER
// ════════════════════════════════════════════════════════════════

function _loadKarayolu() {
  try { return JSON.parse(localStorage.getItem('ak_loj_kara1') || '[]'); } catch { return []; }
}
function _storeKarayolu(d) { localStorage.setItem('ak_loj_kara1', JSON.stringify(d)); }

function renderLojKarayolu() {
  const cont = _gl('loj-karayolu-list');
  if (!cont) return;

  const data = _loadKarayolu().filter(k => !k.isDeleted);
  _stl('lkr-total',  data.length);
  _stl('lkr-yolda',  data.filter(k=>k.status==='yolda').length);
  _stl('lkr-teslim', data.filter(k=>k.status==='teslim').length);
  _stl('lkr-sorun',  data.filter(k=>k.status==='sorun').length);

  let items = data;
  if (_KARA_FILTER !== 'all') items = items.filter(k => k.status === _KARA_FILTER);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🚛</div>
      <div style="font-weight:600;margin-bottom:6px">Karayolu seferi yok</div>
      <button class="btn btnp" onclick="Lojistik.openKarayoluModal(null)">+ Sefer Ekle</button>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(k => {
    const st = LOJ_KARA_STATUS[k.status] || LOJ_KARA_STATUS.bekle;
    const card = document.createElement('div');
    card.className = 'loj-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:20px">🚛</span>
            <span class="badge ${st.c}">${st.l}</span>
            <span style="font-size:11px;font-weight:700;background:var(--s2);padding:2px 8px;border-radius:6px">${k.aracTipi || 'Araç'}</span>
          </div>
          <div style="font-weight:700;font-size:14px;font-family:'DM Mono',monospace;margin-bottom:4px">
            🚘 ${k.plaka || '—'}
            ${k.sofor ? `<span style="font-size:12px;font-weight:500;font-family:inherit;color:var(--t2)"> · ${k.sofor}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;gap:16px;flex-wrap:wrap">
            ${k.kalkis  ? `<span>📍 ${k.kalkis}</span>` : ''}
            ${k.varis   ? `<span>🏁 ${k.varis}</span>` : ''}
            ${k.km      ? `<span>📏 ${k.km} km</span>` : ''}
            ${k.agirlik ? `<span>⚖️ ${k.agirlik} ton</span>` : ''}
          </div>
          ${k.yuk    ? `<div style="font-size:11px;color:var(--t3);margin-top:4px">📦 ${k.yuk}</div>` : ''}
          ${k.telefon? `<div style="font-size:11px;color:var(--ac);margin-top:2px">📞 ${k.telefon}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:var(--t3)">${k.tarih || ''}</div>
          <div style="font-size:11px;color:var(--t3)">${k.beklenenTarih?'→ '+k.beklenenTarih:''}</div>
          <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:8px">
            <button class="btn btns" onclick="Lojistik.openKarayoluModal(${k.id})">✏️</button>
            ${_isAdminL() ? `<button class="btn btns btnd" onclick="Lojistik.delKarayolu(${k.id})">🗑</button>` : ''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — MODAL: HAVA KARGO
// ════════════════════════════════════════════════════════════════

function openLojHavaModal(id) {
  let mo = _gl('mo-loj-hava');
  if (!mo) {
    mo = document.createElement('div');
    mo.className = 'mo';
    mo.id = 'mo-loj-hava';
    document.body.appendChild(mo);
  }
  const data  = _loadHava();
  const entry = id ? data.find(h => h.id === id) : null;

  mo.innerHTML = `
    <div class="moc" style="max-width:540px">
      <div class="mt">${entry ? '✏️ Hava Kargo Düzenle' : '✈️ Yeni AWB / Hava Kargo'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><label class="fl">AWB No *</label>
          <input class="fi" id="lhv-awb" value="${entry?.awb||''}" placeholder="123-12345678"></div>
        <div><label class="fl">Havayolu / Taşıyıcı</label>
          <input class="fi" id="lhv-havayolu" value="${entry?.havayolu||''}" placeholder="THY, Qatar, Lufthansa..."></div>
        <div><label class="fl">Kalkış Havalimanı</label>
          <input class="fi" id="lhv-kalkis" value="${entry?.kalkis||''}" placeholder="IST, SAW, ESB..."></div>
        <div><label class="fl">Varış Havalimanı</label>
          <input class="fi" id="lhv-varis" value="${entry?.varis||''}" placeholder="DXB, FRA, JFK..."></div>
        <div><label class="fl">Uçuş No / Seferi</label>
          <input class="fi" id="lhv-ucus" value="${entry?.ucusSayi||''}" placeholder="TK 2121"></div>
        <div><label class="fl">Tarih</label>
          <input class="fi" type="date" id="lhv-tarih" value="${entry?.tarih||new Date().toISOString().slice(0,10)}"></div>
        <div><label class="fl">Ağırlık (kg)</label>
          <input class="fi" type="number" id="lhv-agirlik" value="${entry?.agirlik||''}" placeholder="0.0"></div>
        <div><label class="fl">Hacim (m³)</label>
          <input class="fi" type="number" id="lhv-hacim" value="${entry?.hacim||''}" placeholder="0.0"></div>
        <div style="grid-column:1/-1"><label class="fl">İçerik / Ürün Tanımı</label>
          <input class="fi" id="lhv-icerik" value="${entry?.icerik||''}" placeholder="Tekstil ürünleri, elektronik..."></div>
        <div style="grid-column:1/-1"><label class="fl">Takip Linki (opsiyonel)</label>
          <input class="fi" id="lhv-url" value="${entry?.takipUrl||''}" placeholder="https://..."></div>
        <div><label class="fl">Durum</label>
          <select class="fi" id="lhv-status">
            ${Object.entries(LOJ_HAVA_STATUS).map(([k,v])=>
              `<option value="${k}" ${entry?.status===k?'selected':''}>${v.l}</option>`
            ).join('')}
          </select></div>
        <div><label class="fl">Not</label>
          <input class="fi" id="lhv-not" value="${entry?.not||''}" placeholder="Ek bilgi..."></div>
      </div>
      <input type="hidden" id="lhv-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-loj-hava')">İptal</button>
        <button class="btn btnp" onclick="Lojistik.saveHava()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoL('mo-loj-hava');
}

function saveLojHava() {
  const awb = _gl('lhv-awb')?.value.trim();
  if (!awb) { _toastL('AWB numarası zorunludur','err'); return; }
  const data  = _loadHava();
  const eid   = parseInt(_gl('lhv-eid')?.value || '0');
  const entry = {
    awb, havayolu:_gl('lhv-havayolu')?.value||'',
    kalkis:_gl('lhv-kalkis')?.value||'', varis:_gl('lhv-varis')?.value||'',
    ucusSayi:_gl('lhv-ucus')?.value||'', tarih:_gl('lhv-tarih')?.value||'',
    agirlik:parseFloat(_gl('lhv-agirlik')?.value)||0,
    hacim:parseFloat(_gl('lhv-hacim')?.value)||0,
    icerik:_gl('lhv-icerik')?.value||'',
    takipUrl:_gl('lhv-url')?.value||'',
    status:_gl('lhv-status')?.value||'bekle',
    not:_gl('lhv-not')?.value||'',
    uid:_CUl()?.id, ts:_tsL(),
  };
  if (eid) {
    const idx = data.findIndex(h => h.id === eid);
    if (idx !== -1) data[idx] = { ...data[idx], ...entry };
  } else {
    data.unshift({ id:Date.now(), ...entry });
  }
  _storeHava(data);
  _syncLojFirestore('hava', data);
  _closeMoL('mo-loj-hava');
  renderLojHava();
  _logL('lojistik', `Hava kargo ${eid?'güncellendi':'eklendi'}: AWB ${awb}`);
  _toastL('Hava kargo kaydedildi ✓','ok');
}

function delLojHava(id) {
  if (!_isAdminL()) return;
  const data = _loadHava();
  const item = data.find(h => h.id === id);
  if (!item || !confirm(`AWB ${item.awb} silinsin mi?`)) return;
  // Soft delete
  item.isDeleted  = true;
  item.deletedAt  = _tsL();
  item.deletedBy  = _CUl()?.id;
  _storeHava(data);
  _syncLojFirestore('hava', data);
  renderLojHava();
  _logL('lojistik', `Hava kargo silindi: AWB ${item.awb}`);
  _toastL('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — MODAL: KARAYOLU
// ════════════════════════════════════════════════════════════════

function openLojKarayoluModal(id) {
  let mo = _gl('mo-loj-kara');
  if (!mo) {
    mo = document.createElement('div');
    mo.className = 'mo';
    mo.id = 'mo-loj-kara';
    document.body.appendChild(mo);
  }
  const data  = _loadKarayolu();
  const entry = id ? data.find(k => k.id === id) : null;

  mo.innerHTML = `
    <div class="moc" style="max-width:540px">
      <div class="mt">${entry ? '✏️ Sefer Düzenle' : '🚛 Yeni Karayolu Seferi'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><label class="fl">Plaka *</label>
          <input class="fi" id="lkr-plaka" value="${entry?.plaka||''}" placeholder="34 XX 1234"></div>
        <div><label class="fl">Araç Tipi</label>
          <select class="fi" id="lkr-arac">
            ${KARA_ARAC_TIPLERI.map(t=>`<option ${entry?.aracTipi===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
        <div><label class="fl">Şoför Adı</label>
          <input class="fi" id="lkr-sofor" value="${entry?.sofor||''}" placeholder="Ad Soyad"></div>
        <div><label class="fl">Şoför Telefon</label>
          <input class="fi" id="lkr-tel" value="${entry?.telefon||''}" placeholder="05xx xxx xx xx"></div>
        <div><label class="fl">Kalkış Noktası</label>
          <input class="fi" id="lkr-kalkis" value="${entry?.kalkis||''}" placeholder="İstanbul, Türkiye"></div>
        <div><label class="fl">Varış Noktası</label>
          <input class="fi" id="lkr-varis" value="${entry?.varis||''}" placeholder="Köln, Almanya"></div>
        <div><label class="fl">Kalkış Tarihi</label>
          <input class="fi" type="date" id="lkr-tarih" value="${entry?.tarih||new Date().toISOString().slice(0,10)}"></div>
        <div><label class="fl">Tahmini Varış</label>
          <input class="fi" type="date" id="lkr-beklenen" value="${entry?.beklenenTarih||''}"></div>
        <div><label class="fl">Mesafe (km)</label>
          <input class="fi" type="number" id="lkr-km" value="${entry?.km||''}" placeholder="0"></div>
        <div><label class="fl">Yük (ton)</label>
          <input class="fi" type="number" id="lkr-agirlik" value="${entry?.agirlik||''}" placeholder="0.0"></div>
        <div style="grid-column:1/-1"><label class="fl">Yük Tanımı</label>
          <input class="fi" id="lkr-yuk" value="${entry?.yuk||''}" placeholder="Tekstil, ambalaj malzemeleri..."></div>
        <div><label class="fl">Durum</label>
          <select class="fi" id="lkr-status">
            ${Object.entries(LOJ_KARA_STATUS).map(([k,v])=>
              `<option value="${k}" ${entry?.status===k?'selected':''}>${v.l}</option>`
            ).join('')}
          </select></div>
        <div><label class="fl">Not</label>
          <input class="fi" id="lkr-not" value="${entry?.not||''}" placeholder="Ek bilgi..."></div>
      </div>
      <input type="hidden" id="lkr-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-loj-kara')">İptal</button>
        <button class="btn btnp" onclick="Lojistik.saveKarayolu()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoL('mo-loj-kara');
}

function saveLojKarayolu() {
  const plaka = _gl('lkr-plaka')?.value.trim().toUpperCase();
  if (!plaka) { _toastL('Plaka zorunludur','err'); return; }
  const data  = _loadKarayolu();
  const eid   = parseInt(_gl('lkr-eid')?.value || '0');
  const entry = {
    plaka, aracTipi:_gl('lkr-arac')?.value||'Kamyon',
    sofor:_gl('lkr-sofor')?.value||'', telefon:_gl('lkr-tel')?.value||'',
    kalkis:_gl('lkr-kalkis')?.value||'', varis:_gl('lkr-varis')?.value||'',
    tarih:_gl('lkr-tarih')?.value||'', beklenenTarih:_gl('lkr-beklenen')?.value||'',
    km:parseFloat(_gl('lkr-km')?.value)||0, agirlik:parseFloat(_gl('lkr-agirlik')?.value)||0,
    yuk:_gl('lkr-yuk')?.value||'', status:_gl('lkr-status')?.value||'bekle',
    not:_gl('lkr-not')?.value||'', uid:_CUl()?.id, ts:_tsL(),
  };
  if (eid) {
    const idx = data.findIndex(k => k.id === eid);
    if (idx !== -1) data[idx] = { ...data[idx], ...entry };
  } else {
    data.unshift({ id:Date.now(), ...entry });
  }
  _storeKarayolu(data);
  _syncLojFirestore('karayolu', data);
  _closeMoL('mo-loj-kara');
  renderLojKarayolu();
  _logL('lojistik', `Karayolu seferi ${eid?'güncellendi':'eklendi'}: ${plaka}`);
  _toastL('Sefer kaydedildi ✓','ok');
}

function delLojKarayolu(id) {
  if (!_isAdminL()) return;
  const data = _loadKarayolu();
  const item = data.find(k => k.id === id);
  if (!item || !confirm(`${item.plaka} seferi silinsin mi?`)) return;
  item.isDeleted = true; item.deletedAt = _tsL(); item.deletedBy = _CUl()?.id;
  _storeKarayolu(data);
  _syncLojFirestore('karayolu', data);
  renderLojKarayolu();
  _logL('lojistik', `Karayolu seferi silindi: ${item.plaka}`);
  _toastL('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — KARGO CRUD (mevcut kargo.js'i wrap eder)
// ════════════════════════════════════════════════════════════════

function openLojAddModal() {
  // Aktif sekmeye göre doğru modal aç
  if (_LOJ_TAB === 'kargo')    window.openKargoModal?.('gelen') || _toastL('Kargo modülü hazır değil','err');
  if (_LOJ_TAB === 'konteyn')  openLojKonteynModal(null);
  if (_LOJ_TAB === 'hava')     openLojHavaModal(null);
  if (_LOJ_TAB === 'karayolu') openLojKarayoluModal(null);
}

function openLojEditKargo(id) { window.openKargoModal?.('gelen', id); }
function printLojLabel(id)    { window.printKargoLabel?.(id); }
function delLojKargo(id)      {
  const d = typeof loadKargo==='function' ? loadKargo() : [];
  const item = d.find(k=>k.id===id);
  if (!item || !confirm(`"${item.alici||item.takipNo}" silinsin mi?`)) return;
  item.isDeleted=true; item.deletedAt=_tsL(); item.deletedBy=_CUl()?.id;
  if (typeof storeKargo==='function') storeKargo(d);
  renderLojKargo();
  _logL('lojistik',`Kargo silindi: ${item.alici||item.takipNo}`);
  _toastL('Silindi','ok');
}

// Konteyner hub işlemleri
function openLojKonteynModal(id) { window.openKonteynModal?.(id); }
function closeLojKonteyn(id)     { window.closeKonteyn?.(id); setTimeout(renderLojKonteyn,200); }
function delLojKonteyn(id)       { window.delKonteyn?.(id); setTimeout(renderLojKonteyn,200); }
function toggleLojKonteynStep(konteynId, stepIdx, done) {
  window.toggleKonteynStep?.(konteynId, stepIdx, done);
  setTimeout(renderLojKonteyn, 200);
}
function checkAllLojKonteyn()    { window.checkAllKonteyn?.(); setTimeout(renderLojKonteyn,3000); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — FIREBASE SYNC
// ════════════════════════════════════════════════════════════════

function _syncLojFirestore(col, data) {
  try {
    const FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) return;
    const tid   = window.Auth?.getTenantId?.() || 'tenant_default';
    const paths = window.FirebaseConfig?.paths;
    if (!paths) return;
    const ref = FB_DB.collection(paths.tenant(tid)).doc(`loj_${col}`);
    ref.set({ data, syncedAt: new Date().toISOString() }, { merge: true })
       .catch(e => console.warn(`[Lojistik] Firestore sync hatası (${col}):`, e));
  } catch (e) { console.warn('[Lojistik] sync:', e); }
}

function exportLojXlsx() {
  if (typeof XLSX === 'undefined') { _toastL('XLSX yüklenmedi','err'); return; }
  const tab = _LOJ_TAB;
  let rows = [], title = '';
  if (tab === 'kargo') {
    rows = (typeof loadKargo==='function'?loadKargo():[]).filter(k=>!k.isDeleted).map(k=>({
      Yön:k.dir==='gelen'?'Gelen':'Giden', Alıcı:k.alici||'', Gönderen:k.gonderen||'',
      'Takip No':k.takipNo||'', Firma:k.firma||'', Tarih:k.tarih||'',
      Durum:LOJ_KARGO_STATUS[k.status]?.l||k.status, Not:k.not||''
    }));
    title = 'Kargo';
  } else if (tab === 'hava') {
    rows = _loadHava().filter(h=>!h.isDeleted).map(h=>({
      AWB:h.awb||'', Havayolu:h.havayolu||'', Kalkış:h.kalkis||'', Varış:h.varis||'',
      'Uçuş No':h.ucusSayi||'', 'Ağırlık(kg)':h.agirlik||0, Tarih:h.tarih||'',
      Durum:LOJ_HAVA_STATUS[h.status]?.l||h.status
    }));
    title = 'Hava_Kargo';
  } else if (tab === 'karayolu') {
    rows = _loadKarayolu().filter(k=>!k.isDeleted).map(k=>({
      Plaka:k.plaka||'', 'Araç Tipi':k.aracTipi||'', Şoför:k.sofor||'',
      Telefon:k.telefon||'', Kalkış:k.kalkis||'', Varış:k.varis||'',
      'Kalkış Tarihi':k.tarih||'', 'Beklenen Varış':k.beklenenTarih||'',
      'km':k.km||0, 'Yük(ton)':k.agirlik||0, Yük:k.yuk||'',
      Durum:LOJ_KARA_STATUS[k.status]?.l||k.status
    }));
    title = 'Karayolu';
  }
  if (!rows.length) { _toastL('Dışa aktarılacak veri yok','warn'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title);
  XLSX.writeFile(wb, `Lojistik_${title}_${_tsL().slice(0,10)}.xlsx`);
  _toastL('Excel oluşturuldu ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — ANA RENDER & EXPORT
// ════════════════════════════════════════════════════════════════

function renderLojistik() {
  _injectLojistikPanel();
  setLojTab(_LOJ_TAB, document.querySelector(`#panel-lojistik [data-tab="${_LOJ_TAB}"]`));
}

// ── FreightPro Pro Modül ──────────────────────────────────────────
function openLojPro() {
  const modal = document.getElementById('loj-pro-modal');
  const iframe = document.getElementById('loj-pro-iframe');
  if (!modal || !iframe) return;
  if (!iframe.src || iframe.src === window.location.href || iframe.src === 'about:blank') {
    iframe.src = 'src/modules/lojistik_pro.html';
  }
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeLojPro() {
  const modal = document.getElementById('loj-pro-modal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

const Lojistik = {
  render:          renderLojistik,
  setTab:          setLojTab,
  setFilter:       setLojFilter,
  setHavaFilter:   setLojHavaFilter,
  setKaraFilter:   setLojKaraFilter,
  renderKargo:     renderLojKargo,
  renderKonteyn:   renderLojKonteyn,
  renderHava:      renderLojHava,
  renderKarayolu:  renderLojKarayolu,
  openAddModal:    openLojAddModal,
  openEditKargo:   openLojEditKargo,
  openKonteynModal:openLojKonteynModal,
  openHavaModal:   openLojHavaModal,
  openKarayoluModal:openLojKarayoluModal,
  saveHava:        saveLojHava,
  saveKarayolu:    saveLojKarayolu,
  delKargo:        delLojKargo,
  delKonteyn:      delLojKonteyn,
  delHava:         delLojHava,
  delKarayolu:     delLojKarayolu,
  closeKonteyn:    closeLojKonteyn,
  toggleKonteynStep:toggleLojKonteynStep,
  checkAllKonteyn: checkAllLojKonteyn,
  printLabel:      printLojLabel,
  exportXlsx:      exportLojXlsx,
  inject:          _injectLojistikPanel,
  openPro:         openLojPro,
  closePro:        closeLojPro,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Lojistik;
} else {
  window.Lojistik     = Lojistik;
  window.renderLojistik = renderLojistik;
}
