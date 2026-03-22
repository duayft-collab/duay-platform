/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/crm_hub.js  —  v8.1.0
 * CRM Merkezi — 5 Alt Modül
 *
 * Sekmeler:
 *   1. 🤝 Müşteriler    — müşteri kartları, pipeline, kanban
 *   2. 📞 Görüşmeler    — görüşme notları, takip, randevu
 *   3. 💼 Teklifler     — teklif yönetimi, aşama takibi
 *   4. 🧪 Numune        — gelen/çıkan numune takibi
 *   5. 🎪 Etkinlik/Fuar — fuar katılım, kriter değerlendirme
 *
 * Firebase: tenants/{tid}/data/crm/records
 * Anayasa : Soft delete, logActivity, DocumentFragment, error boundary
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

const _stc = (id,v) => { const e=_gc(id); if(e) e.textContent=v; };
const _p2c = n   => String(n).padStart(2,'0');
const _tsC = ()  => { const n=new Date(); return `${n.getFullYear()}-${_p2c(n.getMonth()+1)}-${_p2c(n.getDate())} ${_p2c(n.getHours())}:${_p2c(n.getMinutes())}:${_p2c(n.getSeconds())}`; };
const _CUc      = () => window.Auth?.getCU?.();
const _isAdminC = () => window.Auth?.getCU?.()?.role === 'admin';
const _toastC   = (m,t) => window.toast?.(m,t);
const _logC     = (t,d) => window.logActivity?.(t,d);
const _openMoC  = id => window.openMo?.(id);
const _closeMoC = id => window.closeMo?.(id);

let _CRM_TAB = 'musteriler';

const CRM_MUSTERI_STATUS = {
  aktif:   { l:'✅ Aktif',      c:'bg' },
  teklif:  { l:'💼 Teklifte',   c:'bb' },
  lead:    { l:'🎯 Lead',       c:'bp' },
  pasif:   { l:'💤 Pasif',      c:'ba' },
  kayip:   { l:'❌ Kayıp',      c:'br' },
};

const CRM_GORUSME_TIPLER = [
  'Telefon','Video Toplantı','Yüz Yüze','E-posta','WhatsApp','Saha Ziyareti'
];

const CRM_TEKLIF_ASAMALAR = [
  { id:'hazirlik',  l:'📝 Hazırlık',    c:'ba' },
  { id:'gonderildi',l:'📤 Gönderildi',  c:'bb' },
  { id:'musteri',   l:'💭 Müşteride',   c:'bp' },
  { id:'revizyon',  l:'🔄 Revizyon',    c:'ba' },
  { id:'kabul',     l:'✅ Kabul',       c:'bg' },
  { id:'red',       l:'❌ Reddedildi',  c:'br' },
];

const CRM_NUMUNE_TIPLERI = ['Gelen', 'Çıkan'];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectCrmHub() {
  const panel = _gc('panel-crm');
  if (!panel || panel.dataset.crm_hub) return;
  panel.dataset.crm_hub = '1';

  panel.innerHTML = `
<div class="ph" style="padding-bottom:0">
  <div>
    <div class="pht">🤝 CRM Merkezi</div>
    <div class="phs">Müşteriler · Görüşmeler · Teklifler · Numune · Etkinlik</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="CrmHub.exportXlsx()">⬇ Excel</button>
    <button class="btn btnp" onclick="CrmHub.openAddModal()">+ Yeni</button>
  </div>
</div>

<div style="display:flex;gap:0;border-bottom:2px solid var(--b);margin:0 0 18px 0;padding:0 18px;overflow-x:auto">
  <button class="crmh-tab on" data-tab="musteriler" onclick="CrmHub.setTab('musteriler',this)">🤝 Müşteriler</button>
  <button class="crmh-tab"   data-tab="gorusmeler"  onclick="CrmHub.setTab('gorusmeler',this)">📞 Görüşmeler</button>
  <button class="crmh-tab"   data-tab="teklifler"   onclick="CrmHub.setTab('teklifler',this)">💼 Teklifler</button>
  <button class="crmh-tab"   data-tab="numune"      onclick="CrmHub.setTab('numune',this)">🧪 Numune</button>
  <button class="crmh-tab"   data-tab="etkinlik"    onclick="CrmHub.setTab('etkinlik',this)">🎪 Etkinlik/Fuar</button>
</div>

<!-- MÜŞTERİLER -->
<div id="crmh-tab-musteriler" class="crmh-tab-content">
  <div class="sg">
    <div class="ms"><div class="msv" id="crmm-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="crmm-aktif">0</div><div class="msl">✅ Aktif</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="crmm-teklif">0</div><div class="msl">💼 Teklifte</div></div>
    <div class="ms"><div class="msv" style="color:var(--ac)" id="crmm-lead">0</div><div class="msl">🎯 Lead</div></div>
    <div class="ms"><div class="msv" style="color:var(--ac)" id="crmm-deger">0 ₺</div><div class="msl">💰 Pipeline</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <button class="chip on" onclick="CrmHub.setMusteriFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="CrmHub.setMusteriFilter('aktif',this)">✅ Aktif</button>
    <button class="chip"    onclick="CrmHub.setMusteriFilter('teklif',this)">💼 Teklifte</button>
    <button class="chip"    onclick="CrmHub.setMusteriFilter('lead',this)">🎯 Lead</button>
    <button class="chip"    onclick="CrmHub.setMusteriFilter('kayip',this)">❌ Kayıp</button>
    <input class="si" id="crmm-search" placeholder="🔍 Müşteri ara..." oninput="CrmHub.renderMusteriler()" style="margin-left:auto;width:200px">
  </div>
  <div style="display:flex;gap:8px;margin-bottom:10px">
    <button class="chip on" id="crm-view-list" onclick="CrmHub.setView('list',this)">☰ Liste</button>
    <button class="chip"    id="crm-view-kanban" onclick="CrmHub.setView('kanban',this)">🗂 Kanban</button>
  </div>
  <div id="crmh-musteri-list"></div>
</div>

<!-- GÖRÜŞMELER -->
<div id="crmh-tab-gorusmeler" class="crmh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="crmg-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="crmg-bekle">0</div><div class="msl">⏳ Takip Bekliyor</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="crmg-tamamlandi">0</div><div class="msl">✅ Tamamlandı</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="crmg-randevu">0</div><div class="msl">📅 Randevu Var</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="CrmHub.setGorusmeFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="CrmHub.setGorusmeFilter('bekle',this)">⏳ Takip Bekliyor</button>
    <button class="chip"    onclick="CrmHub.setGorusmeFilter('tamamlandi',this)">✅ Tamamlandı</button>
    <button class="btn btnp" onclick="CrmHub.openGorusmeModal(null)" style="margin-left:auto">+ Görüşme Ekle</button>
  </div>
  <div id="crmh-gorusme-list"></div>
</div>

<!-- TEKLİFLER -->
<div id="crmh-tab-teklifler" class="crmh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="crmt-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="crmt-bekle">0</div><div class="msl">💭 Bekliyor</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="crmt-kabul">0</div><div class="msl">✅ Kabul</div></div>
    <div class="ms"><div class="msv" style="color:var(--ac)" id="crmt-toplam">0 ₺</div><div class="msl">💰 Toplam Değer</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    ${CRM_TEKLIF_ASAMALAR.map(a=>
      `<button class="chip ${a.id==='hazirlik'?'on':''}" onclick="CrmHub.setTeklifFilter('${a.id}',this)">${a.l}</button>`
    ).join('')}
    <button class="chip" onclick="CrmHub.setTeklifFilter('all',this)">Tümü</button>
    <button class="btn btnp" onclick="CrmHub.openTeklifModal(null)" style="margin-left:auto">+ Teklif Ekle</button>
  </div>
  <div id="crmh-teklif-list"></div>
</div>

<!-- NUMUNE -->
<div id="crmh-tab-numune" class="crmh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="crmn-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="crmn-gelen">0</div><div class="msl">📥 Gelen</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="crmn-cikan">0</div><div class="msl">📤 Çıkan</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="crmn-iade">0</div><div class="msl">↩️ İade Bekliyor</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="CrmHub.setNumuneFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="CrmHub.setNumuneFilter('gelen',this)">📥 Gelen</button>
    <button class="chip"    onclick="CrmHub.setNumuneFilter('cikis',this)">📤 Çıkan</button>
    <button class="chip"    onclick="CrmHub.setNumuneFilter('iade',this)">↩️ İade Bekliyor</button>
    <button class="btn btnp" onclick="CrmHub.openNumuneModal(null)" style="margin-left:auto">+ Numune Ekle</button>
  </div>
  <div id="crmh-numune-list"></div>
</div>

<!-- ETKİNLİK/FUAR -->
<div id="crmh-tab-etkinlik" class="crmh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="crme-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="crme-aktif">0</div><div class="msl">🎪 Aktif</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="crme-yaklas">0</div><div class="msl">⏰ Yaklaşan</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="crme-tamamlandi">0</div><div class="msl">✅ Tamamlandı</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="CrmHub.setEtkinlikFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="CrmHub.setEtkinlikFilter('yaklas',this)">⏰ Yaklaşan</button>
    <button class="chip"    onclick="CrmHub.setEtkinlikFilter('aktif',this)">🎪 Devam Eden</button>
    <button class="btn btnp" onclick="CrmHub.openEtkinlikModal(null)" style="margin-left:auto">+ Etkinlik Ekle</button>
  </div>
  <div id="crmh-etkinlik-list"></div>
</div>

<style>
.crmh-tab {
  padding:10px 16px;font-size:12px;font-weight:600;border:none;
  background:none;cursor:pointer;color:var(--t2);
  border-bottom:2px solid transparent;margin-bottom:-2px;
  transition:all .2s;white-space:nowrap;
}
.crmh-tab.on { color:var(--ac);border-bottom-color:var(--ac); }
.crmh-tab:hover:not(.on){ color:var(--t);background:var(--s2); }
.crm-card {
  background:var(--sf);border:1px solid var(--b);border-radius:12px;
  padding:14px 16px;margin-bottom:10px;transition:box-shadow .2s;cursor:pointer;
}
.crm-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
.kanban-col {
  flex:1;min-width:200px;background:var(--s2);border-radius:12px;padding:10px;
}
.kanban-col-title {
  font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;
  letter-spacing:.05em;margin-bottom:10px;padding:0 4px;
}
.kanban-item {
  background:var(--sf);border:1px solid var(--b);border-radius:8px;
  padding:10px;margin-bottom:8px;font-size:12px;cursor:pointer;
}
.kanban-item:hover { border-color:var(--ac); }
</style>
`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — SEKME & GÖRÜNÜM YÖNETİMİ
// ════════════════════════════════════════════════════════════════

function setCrmHubTab(tab, btn) {
  _CRM_TAB = tab;
  document.querySelectorAll('#panel-crm .crmh-tab').forEach(b=>b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  ['musteriler','gorusmeler','teklifler','numune','etkinlik'].forEach(t=>{
    const el=_gc(`crmh-tab-${t}`);
    if(el) el.style.display = t===tab?'':'none';
  });
  if (tab==='musteriler') renderCrmMusteriler();
  if (tab==='gorusmeler') renderCrmGorusmeler();
  if (tab==='teklifler')  renderCrmTeklifler();
  if (tab==='numune')     renderCrmNumune();
  if (tab==='etkinlik')   renderCrmEtkinlik();
}

let _CRM_VIEW='list';
function setCrmView(view, btn) {
  _CRM_VIEW=view;
  document.querySelectorAll('#crmh-tab-musteriler .chip[id^="crm-view"]').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmMusteriler();
}

function openCrmHubAddModal() {
  if(_CRM_TAB==='musteriler') window.openCrmModal?.(null);
  if(_CRM_TAB==='gorusmeler') openCrmGorusmeModal(null);
  if(_CRM_TAB==='teklifler')  openCrmTeklifModal(null);
  if(_CRM_TAB==='numune')     window.openNumuneModal?.(null);
  if(_CRM_TAB==='etkinlik')   window.openEtkinlikModal?.(null);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — MÜŞTERİLER RENDER
// ════════════════════════════════════════════════════════════════

let _MUSTERI_FILTER='all';
function setCrmMusteriFilter(f,btn) {
  _MUSTERI_FILTER=f;
  document.querySelectorAll('#crmh-tab-musteriler .chip:not([id])').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmMusteriler();
}

function renderCrmMusteriler() {
  const cont=_gc('crmh-musteri-list');
  if(!cont) return;
  if(typeof window.showSkeleton==='function') window.showSkeleton(cont,4);

  const data  = typeof loadCrmData==='function' ? loadCrmData() : [];
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  const search= (_gc('crmm-search')?.value||'').toLowerCase();
  const cu    = _CUc();

  let items = _isAdminC() ? data : data.filter(m=>m.owner===cu?.id);
  items = items.filter(m=>!m.isDeleted);

  _stc('crmm-total',  items.length);
  _stc('crmm-aktif',  items.filter(m=>m.status==='aktif').length);
  _stc('crmm-teklif', items.filter(m=>m.status==='teklif').length);
  _stc('crmm-lead',   items.filter(m=>m.status==='lead').length);
  const pipeline=items.filter(m=>['teklif','lead'].includes(m.status)).reduce((a,m)=>a+(m.value||0),0);
  _stc('crmm-deger',  pipeline.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺');

  if(_MUSTERI_FILTER!=='all') items=items.filter(m=>m.status===_MUSTERI_FILTER);
  if(search) items=items.filter(m=>
    (m.name||'').toLowerCase().includes(search)||
    (m.contact||'').toLowerCase().includes(search)||
    (m.city||'').toLowerCase().includes(search)
  );

  if(!items.length){
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🤝</div>
      <div style="font-weight:600;margin-bottom:6px">Müşteri bulunamadı</div>
      <button class="btn btnp" onclick="CrmHub.openAddModal()">+ Müşteri Ekle</button>
    </div>`;
    return;
  }

  if(_CRM_VIEW==='kanban') {
    _renderCrmKanban(items, users, cont);
    return;
  }

  // Liste görünümü - DocumentFragment
  const frag=document.createDocumentFragment();
  items.forEach(m=>{
    const u  =users.find(x=>x.id===m.owner)||{name:'?'};
    const st =CRM_MUSTERI_STATUS[m.status]||CRM_MUSTERI_STATUS.lead;
    const card=document.createElement('div');
    card.className='crm-card';
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:14px">${m.name}</span>
            <span class="badge ${st.c}">${st.l}</span>
            ${m.city?`<span style="font-size:11px;color:var(--t3)">📍 ${m.city}</span>`:''}
          </div>
          ${m.contact?`<div style="font-size:12px;color:var(--t2);margin-bottom:2px">👤 ${m.contact}</div>`:''}
          ${m.phone?`<div style="font-size:12px;color:var(--t2);margin-bottom:2px">📞 ${m.phone}</div>`:''}
          ${m.email?`<div style="font-size:12px;color:var(--ac)">✉ ${m.email}</div>`:''}
          ${m.note?`<div style="font-size:11px;color:var(--t3);margin-top:4px">💬 ${m.note.slice(0,80)}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${m.value?`<div style="font-weight:700;font-size:15px;color:var(--ac);margin-bottom:4px">${m.value.toLocaleString('tr-TR')} ₺</div>`:''}
          <div style="font-size:11px;color:var(--t3);margin-bottom:8px">${u.name}</div>
          <div style="display:flex;gap:4px;justify-content:flex-end">
            <button class="btn btns" onclick="CrmHub.openGorusmeModal(null,'${m.id}')" title="Görüşme Ekle">📞</button>
            <button class="btn btns" onclick="CrmHub.openTeklifModal(null,'${m.id}')" title="Teklif Ekle">💼</button>
            <button class="btn btns" onclick="window.openCrmModal?.(${m.id})">✏️</button>
            ${_isAdminC()?`<button class="btn btns btnd" onclick="CrmHub.delMusteri(${m.id})">🗑</button>`:''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function _renderCrmKanban(items, users, cont) {
  const statuses = Object.entries(CRM_MUSTERI_STATUS);
  cont.innerHTML = `<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
    ${statuses.map(([key,val])=>{
      const col_items=items.filter(m=>m.status===key);
      return`<div class="kanban-col">
        <div class="kanban-col-title"><span class="badge ${val.c}">${val.l}</span> <span style="color:var(--t3)">${col_items.length}</span></div>
        ${col_items.map(m=>`
          <div class="kanban-item" onclick="window.openCrmModal?.(${m.id})">
            <div style="font-weight:600;margin-bottom:4px">${m.name}</div>
            ${m.contact?`<div style="color:var(--t2)">${m.contact}</div>`:''}
            ${m.value?`<div style="color:var(--ac);font-weight:600">${m.value.toLocaleString('tr-TR')} ₺</div>`:''}
            ${m.city?`<div style="color:var(--t3);font-size:10px">📍${m.city}</div>`:''}
          </div>`).join('')}
        <button class="btn btns" onclick="window.openCrmModal?.(null)"
          style="width:100%;margin-top:6px;font-size:11px">+ Ekle</button>
      </div>`;
    }).join('')}
  </div>`;
}

function delCrmMusteri(id) {
  if(!_isAdminC()) return;
  const d=typeof loadCrmData==='function'?loadCrmData():[];
  const m=d.find(x=>x.id===id);
  if(!m||!confirm(`"${m.name}" müşterisi silinsin mi?`)) return;
  m.isDeleted=true;m.deletedAt=_tsC();m.deletedBy=_CUc()?.id;
  if(typeof storeCrmData==='function') storeCrmData(d);
  _syncCrmFirestore('crm',d);
  renderCrmMusteriler();
  _logC('crm',`Müşteri silindi: ${m.name}`);
  _toastC('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — GÖRÜŞMELER
// ════════════════════════════════════════════════════════════════

function _loadGorusmeler() {
  try { return JSON.parse(localStorage.getItem('ak_crm_gorusme1')||'[]'); } catch { return []; }
}
function _storeGorusmeler(d) { localStorage.setItem('ak_crm_gorusme1', JSON.stringify(d)); }

let _GOR_FILTER='all';
function setCrmGorusmeFilter(f,btn) {
  _GOR_FILTER=f;
  document.querySelectorAll('#crmh-tab-gorusmeler .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmGorusmeler();
}

function renderCrmGorusmeler() {
  const cont=_gc('crmh-gorusme-list');
  if(!cont) return;
  const data =_loadGorusmeler().filter(g=>!g.isDeleted);
  const crm  =typeof loadCrmData==='function'?loadCrmData():[];
  const users=typeof loadUsers==='function'?loadUsers():[];
  const today=new Date().toISOString().slice(0,10);
  const soon =new Date(Date.now()+3*864e5).toISOString().slice(0,10);

  _stc('crmg-total',       data.length);
  _stc('crmg-bekle',       data.filter(g=>g.takipTarih&&g.takipTarih<=soon&&!g.tamamlandi).length);
  _stc('crmg-tamamlandi',  data.filter(g=>g.tamamlandi).length);
  _stc('crmg-randevu',     data.filter(g=>g.randevuTarih&&g.randevuTarih>=today).length);

  let items=data;
  if(_GOR_FILTER==='bekle')       items=items.filter(g=>!g.tamamlandi&&g.takipTarih);
  if(_GOR_FILTER==='tamamlandi')  items=items.filter(g=>g.tamamlandi);

  if(!items.length){
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">📞</div>
      <div style="font-weight:600;margin-bottom:6px">Görüşme kaydı yok</div>
      <button class="btn btnp" onclick="CrmHub.openGorusmeModal(null)">+ Görüşme Ekle</button>
    </div>`;
    return;
  }

  const frag=document.createDocumentFragment();
  items.sort((a,b)=>b.tarih?.localeCompare(a.tarih||'')||0).forEach(g=>{
    const musteri=crm.find(m=>m.id===g.musteriId);
    const u=users.find(x=>x.id===g.uid)||{name:'?'};
    const overdue=g.takipTarih&&g.takipTarih<today&&!g.tamamlandi;
    const card=document.createElement('div');
    card.className='crm-card';
    card.style.borderLeft=`3px solid ${g.tamamlandi?'var(--gr)':overdue?'var(--rd)':'var(--b)'}`;
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:20px">${g.tip==='Telefon'?'📞':g.tip==='Video Toplantı'?'💻':g.tip==='Yüz Yüze'?'🤝':g.tip==='E-posta'?'✉️':'📱'}</span>
            <span style="font-weight:700;font-size:13px">${musteri?.name||'Müşteri seçilmedi'}</span>
            <span style="font-size:11px;background:var(--s2);padding:2px 8px;border-radius:6px">${g.tip||'Görüşme'}</span>
            <span class="badge ${g.tamamlandi?'bg':'ba'}">${g.tamamlandi?'✅ Tamamlandı':'⏳ Takip Bekliyor'}</span>
          </div>
          ${g.konu?`<div style="font-size:13px;font-weight:500;margin-bottom:4px">${g.konu}</div>`:''}
          ${g.not?`<div style="font-size:12px;color:var(--t2)">💬 ${g.not.slice(0,120)}</div>`:''}
          <div style="font-size:11px;color:var(--t3);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            ${g.tarih?`<span>📅 ${g.tarih}</span>`:''}
            ${g.takipTarih?`<span style="color:${overdue?'var(--rd)':'inherit'}">🔔 Takip: ${g.takipTarih}</span>`:''}
            ${g.randevuTarih?`<span style="color:var(--ac)">📅 Randevu: ${g.randevuTarih}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${!g.tamamlandi?`<button class="btn btns btng" onclick="CrmHub.tamamlaGorusme(${g.id})">✓ Tamamla</button>`:''}
          <button class="btn btns" onclick="CrmHub.openGorusmeModal(${g.id})">✏️</button>
          ${_isAdminC()?`<button class="btn btns btnd" onclick="CrmHub.delGorusme(${g.id})">🗑</button>`:''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function openCrmGorusmeModal(id, musteriId) {
  let mo=_gc('mo-crm-gorusme');
  if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='mo-crm-gorusme';document.body.appendChild(mo);}
  const crm=typeof loadCrmData==='function'?loadCrmData():[];
  const data=_loadGorusmeler();
  const entry=id?data.find(g=>g.id===id):null;
  mo.innerHTML=`
    <div class="moc" style="max-width:520px">
      <div class="mt">${entry?'✏️ Görüşme Düzenle':'📞 Yeni Görüşme'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="grid-column:1/-1"><label class="fl">Müşteri *</label>
          <select class="fi" id="crmg-mid">
            <option value="">Seçin...</option>
            ${crm.filter(m=>!m.isDeleted).map(m=>
              `<option value="${m.id}" ${(entry?.musteriId===m.id||musteriId===String(m.id))?'selected':''}>${m.name}</option>`
            ).join('')}
          </select></div>
        <div><label class="fl">Görüşme Tipi</label>
          <select class="fi" id="crmg-tip">
            ${CRM_GORUSME_TIPLER.map(t=>`<option ${entry?.tip===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
        <div><label class="fl">Tarih</label>
          <input class="fi" type="date" id="crmg-tarih" value="${entry?.tarih||new Date().toISOString().slice(0,10)}"></div>
        <div style="grid-column:1/-1"><label class="fl">Konu</label>
          <input class="fi" id="crmg-konu" value="${entry?.konu||''}" placeholder="Görüşme konusu..."></div>
        <div style="grid-column:1/-1"><label class="fl">Görüşme Notu</label>
          <textarea class="fi" id="crmg-not" rows="3" placeholder="Görüşme özeti, konuşulan konular...">${entry?.not||''}</textarea></div>
        <div><label class="fl">Takip Tarihi</label>
          <input class="fi" type="date" id="crmg-takip" value="${entry?.takipTarih||''}"></div>
        <div><label class="fl">Randevu Tarihi</label>
          <input class="fi" type="date" id="crmg-randevu" value="${entry?.randevuTarih||''}"></div>
        <div style="grid-column:1/-1"><label class="fl">Sonuç / Aksiyon</label>
          <input class="fi" id="crmg-sonuc" value="${entry?.sonuc||''}" placeholder="Alınacak aksiyon, sonraki adım..."></div>
      </div>
      <input type="hidden" id="crmg-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-crm-gorusme')">İptal</button>
        <button class="btn btnp" onclick="CrmHub.saveGorusme()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoC('mo-crm-gorusme');
}

function saveCrmGorusme() {
  const mid=parseInt(_gc('crmg-mid')?.value||'0');
  if(!mid){_toastC('Müşteri seçiniz','err');return;}
  const data=_loadGorusmeler();
  const eid=parseInt(_gc('crmg-eid')?.value||'0');
  const entry={musteriId:mid,tip:_gc('crmg-tip')?.value||'Telefon',
    tarih:_gc('crmg-tarih')?.value||'',konu:_gc('crmg-konu')?.value||'',
    not:_gc('crmg-not')?.value||'',takipTarih:_gc('crmg-takip')?.value||'',
    randevuTarih:_gc('crmg-randevu')?.value||'',sonuc:_gc('crmg-sonuc')?.value||'',
    tamamlandi:false,uid:_CUc()?.id,ts:_tsC()};
  if(eid){const idx=data.findIndex(g=>g.id===eid);if(idx!==-1)data[idx]={...data[idx],...entry};}
  else data.unshift({id:Date.now(),...entry});
  _storeGorusmeler(data);_syncCrmFirestore('gorusme',data);
  _closeMoC('mo-crm-gorusme');renderCrmGorusmeler();
  const crm=typeof loadCrmData==='function'?loadCrmData():[];
  const m=crm.find(x=>x.id===mid);
  _logC('crm',`Görüşme ${eid?'güncellendi':'eklendi'}: ${m?.name||mid}`);
  _toastC('Görüşme kaydedildi ✓','ok');
}

function tamamlaCrmGorusme(id) {
  const data=_loadGorusmeler();const g=data.find(x=>x.id===id);if(!g)return;
  g.tamamlandi=true;g.tamamlandiAt=_tsC();
  _storeGorusmeler(data);_syncCrmFirestore('gorusme',data);
  renderCrmGorusmeler();_toastC('Görüşme tamamlandı ✓','ok');
}

function delCrmGorusme(id) {
  const data=_loadGorusmeler();const g=data.find(x=>x.id===id);
  if(!g||!confirm('Bu görüşme silinsin mi?')) return;
  g.isDeleted=true;g.deletedAt=_tsC();g.deletedBy=_CUc()?.id;
  _storeGorusmeler(data);_syncCrmFirestore('gorusme',data);
  renderCrmGorusmeler();_toastC('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — TEKLİFLER
// ════════════════════════════════════════════════════════════════

function _loadTeklifler() {
  try { return JSON.parse(localStorage.getItem('ak_crm_teklif1')||'[]'); } catch { return []; }
}
function _storeTeklifler(d) { localStorage.setItem('ak_crm_teklif1', JSON.stringify(d)); }

let _TEK_FILTER='all';
function setCrmTeklifFilter(f,btn) {
  _TEK_FILTER=f;
  document.querySelectorAll('#crmh-tab-teklifler .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmTeklifler();
}

function renderCrmTeklifler() {
  const cont=_gc('crmh-teklif-list');
  if(!cont) return;
  const data=_loadTeklifler().filter(t=>!t.isDeleted);
  const crm =typeof loadCrmData==='function'?loadCrmData():[];
  const users=typeof loadUsers==='function'?loadUsers():[];

  const bekle=data.filter(t=>['gonderildi','musteri','revizyon'].includes(t.asama));
  _stc('crmt-total', data.length);
  _stc('crmt-bekle', bekle.length);
  _stc('crmt-kabul', data.filter(t=>t.asama==='kabul').length);
  const toplam=data.filter(t=>t.asama!=='red').reduce((a,t)=>a+(t.tutar||0),0);
  _stc('crmt-toplam', toplam.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺');

  let items=data;
  if(_TEK_FILTER!=='all') items=items.filter(t=>t.asama===_TEK_FILTER);

  if(!items.length){
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">💼</div>
      <div style="font-weight:600;margin-bottom:6px">Teklif bulunamadı</div>
      <button class="btn btnp" onclick="CrmHub.openTeklifModal(null)">+ Teklif Ekle</button>
    </div>`;
    return;
  }

  const frag=document.createDocumentFragment();
  items.sort((a,b)=>b.tarih?.localeCompare(a.tarih||'')||0).forEach(t=>{
    const m=crm.find(x=>x.id===t.musteriId);
    const u=users.find(x=>x.id===t.uid)||{name:'?'};
    const asama=CRM_TEKLIF_ASAMALAR.find(a=>a.id===t.asama)||CRM_TEKLIF_ASAMALAR[0];
    const card=document.createElement('div');
    card.className='crm-card';
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:14px">${t.no||'#'+t.id}</span>
            <span class="badge ${asama.c}">${asama.l}</span>
            <span style="font-size:12px;color:var(--t2)">${m?.name||'—'}</span>
          </div>
          ${t.konu?`<div style="font-size:13px;font-weight:500;margin-bottom:4px">${t.konu}</div>`:''}
          <div style="font-size:11px;color:var(--t3);display:flex;gap:12px">
            ${t.tarih?`<span>📅 ${t.tarih}</span>`:''}
            ${t.gecerlilik?`<span>⏰ Geçerlilik: ${t.gecerlilik}</span>`:''}
            <span>${u.name}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${t.tutar?`<div style="font-weight:800;font-size:16px;color:var(--ac)">${t.tutar.toLocaleString('tr-TR')} ₺</div>`:''}
          <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:8px">
            <select class="si" style="font-size:11px;padding:3px 6px;height:28px"
              onchange="CrmHub.updateTeklifAsama(${t.id},this.value)">
              ${CRM_TEKLIF_ASAMALAR.map(a=>`<option value="${a.id}" ${t.asama===a.id?'selected':''}>${a.l}</option>`).join('')}
            </select>
            <button class="btn btns" onclick="CrmHub.openTeklifModal(${t.id})">✏️</button>
            ${_isAdminC()?`<button class="btn btns btnd" onclick="CrmHub.delTeklif(${t.id})">🗑</button>`:''}
          </div>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function openCrmTeklifModal(id, musteriId) {
  let mo=_gc('mo-crm-teklif');
  if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='mo-crm-teklif';document.body.appendChild(mo);}
  const crm=typeof loadCrmData==='function'?loadCrmData():[];
  const data=_loadTeklifler();
  const entry=id?data.find(t=>t.id===id):null;
  const no=`TKL-${new Date().getFullYear()}-${String(data.length+1).padStart(3,'0')}`;
  mo.innerHTML=`
    <div class="moc" style="max-width:520px">
      <div class="mt">${entry?'✏️ Teklif Düzenle':'💼 Yeni Teklif'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><label class="fl">Teklif No</label>
          <input class="fi" id="crkt-no" value="${entry?.no||no}" placeholder="${no}"></div>
        <div><label class="fl">Müşteri *</label>
          <select class="fi" id="crkt-mid">
            <option value="">Seçin...</option>
            ${crm.filter(m=>!m.isDeleted).map(m=>
              `<option value="${m.id}" ${(entry?.musteriId===m.id||musteriId===String(m.id))?'selected':''}>${m.name}</option>`
            ).join('')}
          </select></div>
        <div style="grid-column:1/-1"><label class="fl">Konu / Ürün</label>
          <input class="fi" id="crkt-konu" value="${entry?.konu||''}" placeholder="Teklif konusu..."></div>
        <div><label class="fl">Tutar (₺) *</label>
          <input class="fi" type="number" id="crkt-tutar" value="${entry?.tutar||''}" placeholder="0.00"></div>
        <div><label class="fl">Para Birimi</label>
          <select class="fi" id="crkt-para">
            ${['₺ TRY','$ USD','€ EUR','£ GBP'].map(p=>`<option ${entry?.para===p?'selected':''}>${p}</option>`).join('')}
          </select></div>
        <div><label class="fl">Teklif Tarihi</label>
          <input class="fi" type="date" id="crkt-tarih" value="${entry?.tarih||new Date().toISOString().slice(0,10)}"></div>
        <div><label class="fl">Geçerlilik Tarihi</label>
          <input class="fi" type="date" id="crkt-gecerlilik" value="${entry?.gecerlilik||''}"></div>
        <div style="grid-column:1/-1"><label class="fl">Aşama</label>
          <select class="fi" id="crkt-asama">
            ${CRM_TEKLIF_ASAMALAR.map(a=>`<option value="${a.id}" ${entry?.asama===a.id?'selected':''}>${a.l}</option>`).join('')}
          </select></div>
        <div style="grid-column:1/-1"><label class="fl">Not / Koşullar</label>
          <textarea class="fi" id="crkt-not" rows="2" placeholder="Ödeme koşulları, notlar...">${entry?.not||''}</textarea></div>
      </div>
      <input type="hidden" id="crkt-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-crm-teklif')">İptal</button>
        <button class="btn btnp" onclick="CrmHub.saveTeklif()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoC('mo-crm-teklif');
}

function saveCrmTeklif() {
  const mid=parseInt(_gc('crkt-mid')?.value||'0');
  const tutar=parseFloat(_gc('crkt-tutar')?.value)||0;
  if(!mid){_toastC('Müşteri seçiniz','err');return;}
  if(!tutar){_toastC('Tutar zorunludur','err');return;}
  const data=_loadTeklifler();
  const eid=parseInt(_gc('crkt-eid')?.value||'0');
  const entry={musteriId:mid,no:_gc('crkt-no')?.value||'',konu:_gc('crkt-konu')?.value||'',
    tutar,para:_gc('crkt-para')?.value||'₺ TRY',
    tarih:_gc('crkt-tarih')?.value||'',gecerlilik:_gc('crkt-gecerlilik')?.value||'',
    asama:_gc('crkt-asama')?.value||'hazirlik',not:_gc('crkt-not')?.value||'',
    uid:_CUc()?.id,ts:_tsC()};
  if(eid){const idx=data.findIndex(t=>t.id===eid);if(idx!==-1)data[idx]={...data[idx],...entry};}
  else data.unshift({id:Date.now(),...entry});
  _storeTeklifler(data);_syncCrmFirestore('teklif',data);
  _closeMoC('mo-crm-teklif');renderCrmTeklifler();
  _logC('crm',`Teklif kaydedildi: ${entry.no}, ${tutar}₺`);
  _toastC('Teklif kaydedildi ✓','ok');
}

function updateCrmTeklifAsama(id, asama) {
  const data=_loadTeklifler();const t=data.find(x=>x.id===id);if(!t)return;
  t.asama=asama;t.asamaTs=_tsC();
  _storeTeklifler(data);_syncCrmFirestore('teklif',data);
  renderCrmTeklifler();_toastC('Aşama güncellendi ✓','ok');
}

function delCrmTeklif(id) {
  const data=_loadTeklifler();const t=data.find(x=>x.id===id);
  if(!t||!confirm(`"${t.no}" teklifi silinsin mi?`)) return;
  t.isDeleted=true;t.deletedAt=_tsC();t.deletedBy=_CUc()?.id;
  _storeTeklifler(data);_syncCrmFirestore('teklif',data);
  renderCrmTeklifler();_toastC('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — NUMUNE (mevcut crm.js delegate)
// ════════════════════════════════════════════════════════════════

let _NUM_FILTER='all';
function setCrmNumuneFilter(f,btn){
  _NUM_FILTER=f;
  document.querySelectorAll('#crmh-tab-numune .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmNumune();
}

function renderCrmNumune() {
  const cont=_gc('crmh-numune-list');
  if(!cont) return;
  const data=typeof loadNumune==='function'?loadNumune().filter(n=>!n.isDeleted):[];
  const today=new Date().toISOString().slice(0,10);
  const users=typeof loadUsers==='function'?loadUsers():[];

  _stc('crmn-total', data.length);
  _stc('crmn-gelen', data.filter(n=>n.dir==='giris').length);
  _stc('crmn-cikan', data.filter(n=>n.dir==='cikis').length);
  _stc('crmn-iade',  data.filter(n=>n.dir==='cikis'&&!n.returned&&n.iadeDate&&n.iadeDate<=today).length);

  let items=data;
  if(_NUM_FILTER==='gelen')  items=items.filter(n=>n.dir==='giris');
  if(_NUM_FILTER==='cikis')  items=items.filter(n=>n.dir==='cikis');
  if(_NUM_FILTER==='iade')   items=items.filter(n=>n.dir==='cikis'&&!n.returned&&n.iadeDate<=today);

  if(!items.length){
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🧪</div>
      <div style="font-weight:600;margin-bottom:6px">Numune bulunamadı</div>
      <button class="btn btnp" onclick="window.openNumuneModal?.(null)">+ Numune Ekle</button>
    </div>`;
    return;
  }

  const frag=document.createDocumentFragment();
  items.forEach(n=>{
    const u=users.find(x=>x.id===n.uid)||{name:'?'};
    const overdue=n.dir==='cikis'&&!n.returned&&n.iadeDate&&n.iadeDate<today;
    const card=document.createElement('div');
    card.className='crm-card';
    card.style.borderLeft=`3px solid ${overdue?'var(--rd)':n.dir==='giris'?'var(--bl)':'var(--gr)'}`;
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:18px">${n.dir==='giris'?'📥':'📤'}</span>
            <span style="font-weight:700;font-size:14px">${n.name}</span>
            ${n.code?`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ac)">${n.code}</span>`:''}
            ${n.returned?`<span class="badge bg">↩️ İade Edildi</span>`:overdue?`<span class="badge br">⚠️ İade Gecikmiş</span>`:''}
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;gap:16px;flex-wrap:wrap">
            <span>📦 ${n.qty||1} adet</span>
            ${n.date?`<span>📅 ${n.date}</span>`:''}
            ${n.iadeDate&&n.dir==='cikis'?`<span style="color:${overdue?'var(--rd)':'inherit'}">↩️ İade: ${n.iadeDate}</span>`:''}
            <span>${u.name}</span>
          </div>
          ${n.note?`<div style="font-size:11px;color:var(--t3);margin-top:4px">💬 ${n.note}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${n.dir==='cikis'&&!n.returned?`<button class="btn btns btng" onclick="CrmHub.returnNumune(${n.id})">↩️ İade</button>`:''}
          <button class="btn btns" onclick="window.openNumuneModal?.(${n.id})">✏️</button>
          ${_isAdminC()?`<button class="btn btns btnd" onclick="CrmHub.delNumune(${n.id})">🗑</button>`:''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function returnCrmNumune(id) { window.returnNumune?.(id); setTimeout(renderCrmNumune,200); }
function delCrmNumune(id) {
  if(!_isAdminC()) return;
  const d=typeof loadNumune==='function'?loadNumune():[];
  const n=d.find(x=>x.id===id);
  if(!n||!confirm(`"${n.name}" numunesi silinsin mi?`)) return;
  n.isDeleted=true;n.deletedAt=_tsC();n.deletedBy=_CUc()?.id;
  if(typeof storeNumune==='function') storeNumune(d);
  _syncCrmFirestore('numune',d);
  renderCrmNumune();_toastC('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — ETKİNLİK/FUAR (mevcut pusula.js/helpers.js delegate)
// ════════════════════════════════════════════════════════════════

let _ETK_FILTER='all';
function setCrmEtkinlikFilter(f,btn){
  _ETK_FILTER=f;
  document.querySelectorAll('#crmh-tab-etkinlik .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderCrmEtkinlik();
}

function renderCrmEtkinlik() {
  const cont=_gc('crmh-etkinlik-list');
  if(!cont) return;
  const data=typeof loadEtkinlik==='function'?loadEtkinlik().filter(e=>!e.isDeleted):[];
  const today=new Date().toISOString().slice(0,10);
  const soon =new Date(Date.now()+30*864e5).toISOString().slice(0,10);

  _stc('crme-total',      data.length);
  _stc('crme-aktif',      data.filter(e=>e.bas<=today&&(!e.bitis||e.bitis>=today)).length);
  _stc('crme-yaklas',     data.filter(e=>e.bas>today&&e.bas<=soon).length);
  _stc('crme-tamamlandi', data.filter(e=>e.bitis&&e.bitis<today).length);

  let items=data;
  if(_ETK_FILTER==='yaklas')      items=items.filter(e=>e.bas>today&&e.bas<=soon);
  if(_ETK_FILTER==='aktif')       items=items.filter(e=>e.bas<=today&&(!e.bitis||e.bitis>=today));
  if(_ETK_FILTER==='tamamlandi')  items=items.filter(e=>e.bitis&&e.bitis<today);

  if(!items.length){
    cont.innerHTML=`<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🎪</div>
      <div style="font-weight:600;margin-bottom:6px">Etkinlik/Fuar bulunamadı</div>
      <button class="btn btnp" onclick="window.openEtkinlikModal?.(null)">+ Etkinlik Ekle</button>
    </div>`;
    return;
  }

  const frag=document.createDocumentFragment();
  items.sort((a,b)=>a.bas?.localeCompare(b.bas||'')||0).forEach(e=>{
    const ended=e.bitis&&e.bitis<today;
    const upcoming=e.bas>today;
    const card=document.createElement('div');
    card.className='crm-card';
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:20px">${e.tur==='fuar'?'🎪':e.tur==='konferans'?'🎤':'📅'}</span>
            <span style="font-weight:700;font-size:14px">${e.ad||e.title||'İsimsiz'}</span>
            <span class="badge ${ended?'ba':upcoming?'bb':'bg'}">${ended?'✅ Tamamlandı':upcoming?'⏰ Yaklaşıyor':'🎪 Devam Ediyor'}</span>
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;gap:16px;flex-wrap:wrap">
            ${e.bas?`<span>📅 ${e.bas}${e.bitis&&e.bitis!==e.bas?' → '+e.bitis:''}</span>`:''}
            ${e.yer?`<span>📍 ${e.yer}</span>`:''}
            ${e.katilimci?`<span>👥 ${e.katilimci} kişi</span>`:''}
          </div>
          ${e.desc||e.aciklama?`<div style="font-size:11px;color:var(--t3);margin-top:4px">💬 ${(e.desc||e.aciklama).slice(0,80)}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btns" onclick="window.openEtkinlikModal?.(${e.id})">✏️</button>
          ${_isAdminC()?`<button class="btn btns btnd" onclick="CrmHub.delEtkinlik(${e.id})">🗑</button>`:''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function delCrmEtkinlik(id) {
  if(!_isAdminC()) return;
  const d=typeof loadEtkinlik==='function'?loadEtkinlik():[];
  const e=d.find(x=>x.id===id);
  if(!e||!confirm(`"${e.ad||e.title}" silinsin mi?`)) return;
  e.isDeleted=true;e.deletedAt=_tsC();e.deletedBy=_CUc()?.id;
  if(typeof storeEtkinlik==='function') storeEtkinlik(d);
  renderCrmEtkinlik();_toastC('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — EXCEL EXPORT
// ════════════════════════════════════════════════════════════════

function exportCrmHubXlsx() {
  if(typeof XLSX==='undefined'){_toastC('XLSX yüklenmedi','err');return;}
  const tab=_CRM_TAB;
  let rows=[],title='';
  if(tab==='musteriler'){
    rows=(typeof loadCrmData==='function'?loadCrmData():[]).filter(m=>!m.isDeleted).map(m=>({
      'Müşteri':m.name,'Kişi':m.contact||'','Telefon':m.phone||'','E-posta':m.email||'',
      'Şehir':m.city||'','Durum':CRM_MUSTERI_STATUS[m.status]?.l||m.status,'Değer(₺)':m.value||0
    }));
    title='Musteriler';
  } else if(tab==='teklifler'){
    rows=_loadTeklifler().filter(t=>!t.isDeleted).map(t=>({
      'No':t.no,'Konu':t.konu||'','Tutar(₺)':t.tutar||0,'Para':t.para||'₺ TRY',
      'Tarih':t.tarih||'','Aşama':CRM_TEKLIF_ASAMALAR.find(a=>a.id===t.asama)?.l||t.asama
    }));
    title='Teklifler';
  } else if(tab==='numune'){
    rows=(typeof loadNumune==='function'?loadNumune():[]).filter(n=>!n.isDeleted).map(n=>({
      'Yön':n.dir==='giris'?'Gelen':'Çıkan','Numune':n.name,'Kod':n.code||'',
      'Adet':n.qty||1,'Tarih':n.date||'','İade Tarihi':n.iadeDate||'',
      'İade Edildi':n.returned?'Evet':'Hayır'
    }));
    title='Numune';
  }
  if(!rows.length){_toastC('Dışa aktarılacak veri yok','warn');return;}
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,title);
  XLSX.writeFile(wb,`CRM_${title}_${_tsC().slice(0,10)}.xlsx`);
  _toastC('Excel oluşturuldu ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — FIREBASE SYNC
// ════════════════════════════════════════════════════════════════

function _syncCrmFirestore(col, data) {
  try {
    const FB_DB=window.Auth?.getFBDB?.(); if(!FB_DB) return;
    const tid=window.Auth?.getTenantId?.()||'tenant_default';
    const paths=window.FirebaseConfig?.paths; if(!paths) return;
    FB_DB.collection(paths.tenant(tid)).doc(`crm_${col}`)
      .set({data,syncedAt:new Date().toISOString()},{merge:true})
      .catch(e=>console.warn(`[CrmHub] Firestore sync (${col}):`,e));
  } catch(e){console.warn('[CrmHub] sync:',e);}
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — ANA RENDER & EXPORT
// ════════════════════════════════════════════════════════════════

function renderCrmHub() {
  _injectCrmHub();
  setCrmHubTab(_CRM_TAB, document.querySelector(`#panel-crm [data-tab="${_CRM_TAB}"]`));
}

const CrmHub = {
  render:            renderCrmHub,
  setTab:            setCrmHubTab,
  setView:           setCrmView,
  openAddModal:      openCrmHubAddModal,
  setMusteriFilter:  setCrmMusteriFilter,
  renderMusteriler:  renderCrmMusteriler,
  delMusteri:        delCrmMusteri,
  setGorusmeFilter:  setCrmGorusmeFilter,
  renderGorusmeler:  renderCrmGorusmeler,
  openGorusmeModal:  openCrmGorusmeModal,
  saveGorusme:       saveCrmGorusme,
  tamamlaGorusme:    tamamlaCrmGorusme,
  delGorusme:        delCrmGorusme,
  setTeklifFilter:   setCrmTeklifFilter,
  renderTeklifler:   renderCrmTeklifler,
  openTeklifModal:   openCrmTeklifModal,
  saveTeklif:        saveCrmTeklif,
  updateTeklifAsama: updateCrmTeklifAsama,
  delTeklif:         delCrmTeklif,
  setNumuneFilter:   setCrmNumuneFilter,
  renderNumune:      renderCrmNumune,
  openNumuneModal:   id => window.openNumuneModal?.(id),
  returnNumune:      returnCrmNumune,
  delNumune:         delCrmNumune,
  setEtkinlikFilter: setCrmEtkinlikFilter,
  renderEtkinlik:    renderCrmEtkinlik,
  openEtkinlikModal: id => window.openEtkinlikModal?.(id),
  delEtkinlik:       delCrmEtkinlik,
  exportXlsx:        exportCrmHubXlsx,
  inject:            _injectCrmHub,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CrmHub;
} else {
  window.CrmHub     = CrmHub;
  window.renderCrmHub = renderCrmHub;
  // panel-crm routing'i CrmHub'a yönlendir
  window.renderCrm  = renderCrmHub;
}

})();
