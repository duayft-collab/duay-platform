/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/crm.js  —  v8.0.0
 * CRM · Müşteri Yönetimi · Kanban Görünümü · Numune Arşivi
 *
 * Anayasa Kural 3 : DocumentFragment ile tek DOM işlemi
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _stcLegacy = (id, v) => { const el = _gc(id); if (el) el.textContent = v; };
const _nowTsc = window.nowTs;
const _isAdminCLegacy = window.isAdmin;
const _CUcLegacy      = window.CU;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — CRM SABİTLERİ
// ════════════════════════════════════════════════════════════════
const CRM_ST = {
  lead:      {l:'🎯 Aday',      c:'bb'},
  teklif:    {l:'📄 Teklif',    c:'ba'},
  muzakere:  {l:'🤝 Müzakere',  c:'bp'},
  aktif:     {l:'✅ Aktif',     c:'bg'},
  pasif:     {l:'😴 Pasif',     c:'bgr'},
  kayip:     {l:'❌ Kayıp',     c:'br'},
};

let CRM_VIEW = 'list';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — CRM CRUD
// ════════════════════════════════════════════════════════════════

function openCrmModal(id){
  const users=loadUsers();
  const osel=_gc('crm-owner');
  if(osel)osel.innerHTML=users.map(u=>`<option value="${u.id}">${window._esc(u.name)}</option>`).join('');
  if(id){
    const e=loadCrmData().find(x=>x.id===id);if(!e)return;
    if(_gc('crm-name'))   _gc('crm-name').value   =e.name;
    if(_gc('crm-contact'))_gc('crm-contact').value =e.contact||'';
    if(_gc('crm-phone'))  _gc('crm-phone').value   =e.phone||'';
    if(_gc('crm-email'))  _gc('crm-email').value   =e.email||'';
    if(_gc('crm-city'))   _gc('crm-city').value    =e.city||'';
    if(_gc('crm-status')) _gc('crm-status').value  =e.status;
    if(_gc('crm-value'))  _gc('crm-value').value   =e.value||0;
    if(_gc('crm-note'))   _gc('crm-note').value    =e.note||'';
    if(osel)              osel.value               =e.owner;
    if(_gc('crm-eid'))    _gc('crm-eid').value     =id;
    _stcLegacy('mo-crm-t','✏️ Müşteri Düzenle');
  }else{
    ['crm-name','crm-contact','crm-phone','crm-email','crm-city','crm-note'].forEach(i=>{const el=_gc(i);if(el)el.value='';});
    if(_gc('crm-value')) _gc('crm-value').value='0';
    if(_gc('crm-status'))_gc('crm-status').value='lead';
    if(_gc('crm-eid'))   _gc('crm-eid').value='';
    _stcLegacy('mo-crm-t','+ Müşteri Ekle');
  }
  window.openMo?.('mo-crm');
}

function saveCrm(){
  const name=(_gc('crm-name')?.value||'').trim();
  if(!name){window.toast?.('Firma adı zorunludur','err');return;}
  const d=loadCrmData();
  const eid=parseInt(_gc('crm-eid')?.value||'0');
  const entry={
    name,
    contact:_gc('crm-contact')?.value||'',
    phone:  _gc('crm-phone')?.value||'',
    email:  _gc('crm-email')?.value||'',
    city:   _gc('crm-city')?.value||'',
    status: _gc('crm-status')?.value||'lead',
    value:  parseFloat(_gc('crm-value')?.value)||0,
    note:   _gc('crm-note')?.value||'',
    owner:  parseInt(_gc('crm-owner')?.value||_CUcLegacy()?.id),
    ts:     _nowTsc(),
    updatedAt: new Date().toISOString(),
  };
  if(eid){const e=d.find(x=>x.id===eid);if(e)Object.assign(e,entry);}
  else d.push({id:generateNumericId(),...entry});
  storeCrmData(d);
  window.closeMo?.('mo-crm');
  renderCrm();
  window.logActivity?.('view',`"${name}" CRM kaydı güncellendi`);
  window.toast?.(name+' kaydedildi ✓','ok');
}

function delCrm(id){
  if(!_isAdminCLegacy()){window.toast?.('Yetki yok','err');return;}
  window.confirmModal('Müşteri kaydını silmek istediğinizden emin misiniz?', {
    title: 'Müşteri Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeCrmData(loadCrmData().filter(x=>x.id!==id));
      renderCrm();
      window.toast?.('Silindi','ok');
    }
  });
}

function setCrmStatus(id,status){
  const d=loadCrmData();const c=d.find(x=>x.id===id);
  if(!c||!_isAdminCLegacy())return;
  c.status=status;storeCrmData(d);renderCrm();
  window.toast?.(`${c.name} → ${CRM_ST[status]?.l||status} ✓`,'ok');
}

function setCrmView(v){
  CRM_VIEW=v;
  document.querySelectorAll('.crm-view-btn').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  renderCrm();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — CRM RENDER (Liste + Kanban) — DocumentFragment
// ════════════════════════════════════════════════════════════════

function renderCrm(){
  const crm=loadCrmData();const users=loadUsers();
  const statusF=_gc('crm-status-f')?.value||'';
  const sehirF=_gc('crm-sehir-f')?.value||'';
  const search=(_gc('crm-search')?.value||'').toLowerCase();
  const sehirSel=_gc('crm-sehir-f');
  if(sehirSel&&sehirSel.options.length<=1){
    const cities=[...new Set(crm.map(c=>c.city).filter(Boolean))];
    cities.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sehirSel.appendChild(o);});
  }
  let fl=_isAdminCLegacy()?crm:crm.filter(c=>c.owner===_CUcLegacy()?.id);
  if(statusF)fl=fl.filter(c=>c.status===statusF);
  if(sehirF) fl=fl.filter(c=>c.city===sehirF);
  if(search) fl=fl.filter(c=>c.name.toLowerCase().includes(search)||(c.contact||'').toLowerCase().includes(search)||(c.city||'').toLowerCase().includes(search));
  const _crmStats = _isAdminCLegacy() ? crm : crm.filter(c=>c.owner===_CUcLegacy()?.id);
  _stcLegacy('crm-total',   _crmStats.length);
  _stcLegacy('crm-active',  _crmStats.filter(c=>c.status==='aktif').length);
  _stcLegacy('crm-lead',    _crmStats.filter(c=>c.status==='lead').length);
  _stcLegacy('crm-pipeline',_crmStats.filter(c=>['teklif','muzakere'].includes(c.status)).length);
  var totalVal=_crmStats.reduce((a,c)=>a+(c.value||0),0);
  _stcLegacy('crm-value',totalVal.toLocaleString('tr-TR'));
  // Dönüşüm oranı: aktif / (lead + teklif + muzakere + aktif)
  var donusumBase = _crmStats.filter(c=>['lead','teklif','muzakere','aktif'].includes(c.status)).length;
  var donusumOk = _crmStats.filter(c=>c.status==='aktif').length;
  var donusumOran = donusumBase > 0 ? Math.round(donusumOk / donusumBase * 100) : 0;
  _stcLegacy('crm-donusum', '%' + donusumOran);
  // Bu ay görüşme
  var thisMonth = new Date().toISOString().slice(0,7);
  var gorusmeSayisi = (typeof loadGrt === 'function' ? loadGrt() : []).filter(function(g2) { return (g2.ts||'').startsWith(thisMonth); }).length;
  _stcLegacy('crm-gorusme', gorusmeSayisi);
  const nb=_gc('nb-crm-b');
  if(nb){const n=_crmStats.filter(c=>c.status==='lead').length;nb.textContent=n;nb.style.display=n>0?'inline':'none';}
  const cont=_gc('crm-view-cont');if(!cont)return;
  if(!fl.length){
    cont.innerHTML=`<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">🤝</div>Müşteri bulunamadı.</div>`;
    return;
  }
  if(CRM_VIEW==='kanban'){
    _renderCrmKanban(fl,cont);
  }else{
    _renderCrmList(fl,users,cont);
  }
}

function _renderCrmKanban(fl,cont){
  const cols=['lead','teklif','muzakere','aktif'];
  const colNext={lead:'teklif',teklif:'muzakere',muzakere:'aktif',aktif:'aktif'};
  const colPrev={lead:'lead',teklif:'lead',muzakere:'teklif',aktif:'muzakere'};

  const frag=document.createDocumentFragment();
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:14px';

  cols.forEach(s=>{
    const col=fl.filter(c=>c.status===s);
    const st2=CRM_ST[s]||CRM_ST.lead;
    const colEl=document.createElement('div');
    colEl.style.cssText='background:var(--s2);border-radius:var(--r);padding:12px;min-height:200px';
    const headerEl=document.createElement('div');
    headerEl.style.cssText='font-weight:600;font-size:13px;margin-bottom:10px;display:flex;align-items:center;gap:6px';
    headerEl.innerHTML=`<span class="badge ${st2.c}">${st2.l}</span><span style="font-size:11px;color:var(--t2)">(${col.length})</span>`;
    colEl.appendChild(headerEl);

    // Kartlar — DocumentFragment
    const cardFrag=document.createDocumentFragment();
    col.forEach(c=>{
      const card=document.createElement('div');
      card.style.cssText='background:var(--sf);border:1px solid var(--b);border-radius:var(--rs);padding:10px;margin-bottom:8px;cursor:pointer';
      card.addEventListener('click',()=>openCrmModal(c.id));
      card.innerHTML=`
        <div style="font-size:12px;font-weight:500">${window._esc(c.name)}</div>
        <div style="font-size:10px;color:var(--t2);margin-top:2px">${window._esc(c.contact||'')}</div>
        <div style="font-size:11px;color:var(--ac);margin-top:4px;font-weight:600">${(c.value||0).toLocaleString('tr-TR')} ₺</div>
        ${_isAdminCLegacy()?`<div style="display:flex;gap:4px;margin-top:8px">
          ${s!=='lead'?`<button onclick="event.stopPropagation();setCrmStatus(${c.id},'${colPrev[s]}')" style="flex:1;padding:3px;background:var(--s2);border:1px solid var(--b);border-radius:4px;font-size:9px;cursor:pointer;color:var(--t2)">◀ Geri</button>`:''}
          ${s!=='aktif'?`<button onclick="event.stopPropagation();setCrmStatus(${c.id},'${colNext[s]}')" style="flex:1;padding:3px;background:var(--al);border:1px solid var(--ac);border-radius:4px;font-size:9px;cursor:pointer;color:var(--ac);font-weight:600">İlerlet ▶</button>`:''}
        </div>`:''}`;
      cardFrag.appendChild(card);
    });
    colEl.appendChild(cardFrag);

    if(_isAdminCLegacy()){
      const addBtn=document.createElement('button');
      addBtn.style.cssText='width:100%;padding:8px;background:rgba(99,102,241,.06);border:2px dashed rgba(99,102,241,.25);border-radius:8px;cursor:pointer;color:var(--ac);font-size:11px;font-weight:600;margin-top:4px';
      addBtn.textContent='+ Ekle';
      addBtn.addEventListener('click',()=>openCrmModal(null));
      colEl.appendChild(addBtn);
    }
    grid.appendChild(colEl);
  });
  frag.appendChild(grid);
  cont.replaceChildren(frag);
}

function _renderCrmList(fl,users,cont){
  const frag=document.createDocumentFragment();
  const card=document.createElement('div');
  card.className='card';
  const tblWrap=document.createElement('div');
  tblWrap.style.overflowX='auto';
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr>
    <th>Firma</th><th>Yetkili</th><th>Şehir</th>
    <th>Potansiyel</th><th>Durum</th><th>Sorumlu</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  fl.forEach(c=>{
    const u=users.find(x=>x.id===c.owner)||{name:'?'};
    const st2=CRM_ST[c.status]||CRM_ST.lead;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="width:30px;text-align:center">${window.isAdmin?.() ? '<input type="checkbox" class="crm-bulk-chk" data-id="' + c.id + '" onclick="event.stopPropagation();_crmBulkCheck()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac)">' : ''}</td>
      <td>
        <div style="font-weight:500;font-size:13px">${window._esc(c.name)}</div>
        <div style="font-size:10px;color:var(--t2)">${window._esc(c.phone||c.email||'')}</div>
      </td>
      <td style="font-size:13px">${window._esc(c.contact||'—')}</td>
      <td style="font-size:12px;color:var(--t2)">${c.city||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:var(--ac)">${(c.value||0).toLocaleString('tr-TR')} ₺</td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td style="font-size:11px;color:var(--t2)">${window._esc(u.name)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btns" onclick="openCrmModal(${c.id})">✏️</button>
          ${_isAdminCLegacy()?`<button class="btn btns btnd" onclick="delCrm(${c.id})">🗑</button>`:''}
          <div onclick="event.stopPropagation();_crmTogglePeek(${c.id})" style="cursor:pointer;color:var(--t3);font-size:12px;padding:2px 4px" id="peek-arr-crm-${c.id}">▸</div>
        </div>
      </td>`;
    tbody.appendChild(tr);
    var peekTr=document.createElement('tr');
    peekTr.id='peek-crm-'+c.id;
    peekTr.style.display='none';
    peekTr.innerHTML='<td colspan="8" style="padding:10px 16px;background:var(--s2);border-bottom:0.5px solid var(--b)"><div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:11px;margin-bottom:8px"><div><div style="color:var(--t3);font-size:9px;text-transform:uppercase;margin-bottom:2px">Firma</div><div style="font-weight:500">'+window._esc(c.name||'—')+'</div></div><div><div style="color:var(--t3);font-size:9px;text-transform:uppercase;margin-bottom:2px">İletişim</div><div style="font-weight:500">'+window._esc(c.contact||'—')+'</div></div><div><div style="color:var(--t3);font-size:9px;text-transform:uppercase;margin-bottom:2px">Telefon</div><div style="font-weight:500">'+window._esc(c.phone||'—')+'</div></div><div><div style="color:var(--t3);font-size:9px;text-transform:uppercase;margin-bottom:2px">Durum</div><div style="font-weight:500">'+st2.l+'</div></div></div><div style="display:flex;gap:6px"><button onclick="event.stopPropagation();openCrmModal('+c.id+')" style="padding:4px 10px;border-radius:5px;font-size:10px;border:0.5px solid #185FA5;background:#E6F1FB;color:#0C447C;cursor:pointer;font-family:inherit">↗ Düzenle</button><button onclick="event.stopPropagation();window._crmSatisTeklif?.('+c.id+')" style="padding:4px 10px;border-radius:5px;font-size:10px;border:0.5px solid #0F6E56;background:#E8F5F0;color:#0F6E56;cursor:pointer;font-family:inherit">Satış Teklifi</button><button onclick="event.stopPropagation();delCrm('+c.id+')" style="padding:4px 10px;border-radius:5px;font-size:10px;border:0.5px solid #E24B4A;background:#FCEBEB;color:#791F1F;cursor:pointer;font-family:inherit">Sil</button></div></td>';
    tbody.appendChild(peekTr);
  });
  table.appendChild(tbody);
  tblWrap.appendChild(table);
  card.appendChild(tblWrap);
  frag.appendChild(card);
  cont.replaceChildren(frag);
}

function exportCrmXlsx(){
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const users=loadUsers();
  const rows=loadCrmData().map(c=>{
    const u=users.find(x=>x.id===c.owner)||{name:'?'};
    return{Firma:c.name,Yetkili:c.contact||'',Telefon:c.phone||'',Email:c.email||'',Şehir:c.city||'',Durum:CRM_ST[c.status]?.l||c.status,'Potansiyel (₺)':c.value||0,Sorumlu:u.name,Not:c.note||''};
  });
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'CRM');
  XLSX.writeFile(wb,`CRM_${_nowTsc().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — NUMUNE ARŞİVİ — DocumentFragment
// ════════════════════════════════════════════════════════════════

let NM_FILTER='all';

function setNumuneFilter(f,btn){
  NM_FILTER=f;
  document.querySelectorAll('#panel-numune .chip,#panel-crm .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderNumune();
}

function openNumuneModal(dir){
  const users=loadUsers();
  const sel=_gc('nm-user');if(sel)sel.innerHTML=users.map(u=>`<option value="${u.id}">${window._esc(u.name)}</option>`).join('');
  ['nm-name','nm-code','nm-note'].forEach(i=>{const el=_gc(i);if(el)el.value='';});
  if(_gc('nm-qty'))       _gc('nm-qty').value='1';
  if(_gc('nm-dir'))       _gc('nm-dir').value=dir||'giris';
  if(_gc('nm-date'))      _gc('nm-date').valueAsDate=new Date();
  if(_gc('nm-iade-date')) _gc('nm-iade-date').value='';
  if(_gc('nm-eid'))       _gc('nm-eid').value='';
  _stcLegacy('mo-nm-t',dir==='giris'?'📥 Numune Girişi':'📤 Numune Çıkışı');
  window.openMo?.('mo-numune');
}

function editNumuneModal(id){
  const n=loadNumune().find(x=>x.id===id);if(!n)return;
  const users=loadUsers();
  const sel=_gc('nm-user');if(sel){sel.innerHTML=users.map(u=>`<option value="${u.id}">${window._esc(u.name)}</option>`).join('');sel.value=n.uid;}
  if(_gc('nm-name'))      _gc('nm-name').value      =n.name;
  if(_gc('nm-code'))      _gc('nm-code').value      =n.code||'';
  if(_gc('nm-note'))      _gc('nm-note').value      =n.note||'';
  if(_gc('nm-qty'))       _gc('nm-qty').value       =n.qty||1;
  if(_gc('nm-dir'))       _gc('nm-dir').value       =n.dir||'giris';
  if(_gc('nm-date'))      _gc('nm-date').value      =n.date||'';
  if(_gc('nm-iade-date')) _gc('nm-iade-date').value =n.iadeDate||'';
  if(_gc('nm-eid'))       _gc('nm-eid').value       =id;
  _stcLegacy('mo-nm-t','✏️ Numune Düzenle');
  window.openMo?.('mo-numune');
}

function saveNumune(){
  const name=(_gc('nm-name')?.value||'').trim();
  if(!name){window.toast?.('Ürün adı zorunludur','err');return;}
  const fi=_gc('nm-img');const d=loadNumune();
  const eid=parseInt(_gc('nm-eid')?.value||'0');
  const entry={
    dir:       _gc('nm-dir')?.value||'giris',
    name,
    code:      _gc('nm-code')?.value||'',
    qty:       parseInt(_gc('nm-qty')?.value)||1,
    date:      _gc('nm-date')?.value||'',
    uid:       parseInt(_gc('nm-user')?.value||_CUcLegacy()?.id),
    iadeDate:  _gc('nm-iade-date')?.value||null,
    returned:  false,
    note:      _gc('nm-note')?.value||'',
  };
  const save2=img=>{
    if(img)entry.img=img;
    if(eid){const e=d.find(x=>x.id===eid);if(e)Object.assign(e,entry);}
    else d.push({id:generateNumericId(),...entry});
    storeNumune(d);
    window.closeMo?.('mo-numune');
    renderNumune();
    window.logActivity?.('view',`"${name}" numune ${entry.dir==='giris'?'girişi':'çıkışı'} kaydedildi`);
    window.toast?.('Kayıt eklendi ✓','ok');
  };
  if(fi?.files?.[0]){const r=new FileReader();r.onload=e=>save2({name:fi.files[0].name,data:e.target.result});r.readAsDataURL(fi.files[0]);}
  else save2(null);
}

function returnNumune(id){
  const d=loadNumune();const n=d.find(x=>x.id===id);if(!n)return;
  n.returned=true;n.returnedDate=new Date().toISOString().slice(0,10);
  storeNumune(d);renderNumune();
  window.toast?.('İade kaydedildi ✓','ok');
}

function delNumune(id){
  if(!_isAdminCLegacy())return;
  window.confirmModal('Silinsin mi?', {
    title: 'Numune Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeNumune(loadNumune().filter(x=>x.id!==id));
      renderNumune();
      window.toast?.('Silindi','ok');
    }
  });
}

function renderNumune(){
  const users=loadUsers();
  let d=loadNumune();
  const search=(_gc('nm-search')?.value||'').toLowerCase();
  if(search)d=d.filter(n=>n.name.toLowerCase().includes(search)||(n.code||'').toLowerCase().includes(search));
  const todayS=new Date().toISOString().slice(0,10);
  if(NM_FILTER==='giris') d=d.filter(n=>n.dir==='giris'&&!n.returned);
  if(NM_FILTER==='cikis') d=d.filter(n=>n.dir==='cikis'&&!n.returned);
  if(NM_FILTER==='iade')  d=d.filter(n=>n.dir==='cikis'&&!n.returned&&n.iadeDate&&n.iadeDate<todayS);
  const all=loadNumune();
  _stcLegacy('nm-total',all.length);
  _stcLegacy('nm-giris',all.filter(n=>n.dir==='giris'&&!n.returned).length);
  _stcLegacy('nm-cikis',all.filter(n=>n.dir==='cikis'&&!n.returned).length);
  _stcLegacy('nm-iade', all.filter(n=>n.dir==='cikis'&&!n.returned&&n.iadeDate&&n.iadeDate<todayS).length);
  const nb=_gc('nb-nm-b');
  if(nb){const n=all.filter(x=>x.dir==='cikis'&&!x.returned&&x.iadeDate&&x.iadeDate<todayS).length;nb.textContent=n;nb.style.display=n>0?'inline':'none';}
  const cont=_gc('numune-list');if(!cont)return;
  if(!d.length){cont.innerHTML=`<div style="padding:32px;text-align:center;color:var(--t2)">Numune bulunamadı.</div>`;return;}

  // DocumentFragment
  const frag=document.createDocumentFragment();
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr>
    <th>Ürün</th><th>Kod</th><th>Miktar</th><th>Alan Kişi</th>
    <th>Tarih</th><th>İade Tarihi</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  d.forEach(n=>{
    const u=users.find(x=>x.id===n.uid)||{name:'?'};
    const late=n.dir==='cikis'&&!n.returned&&n.iadeDate&&n.iadeDate<todayS;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          ${n.img?`<img src="${n.img.data}" style="width:32px;height:32px;object-fit:cover;border-radius:4px" title="${window._esc(n.img.name)}">`
                 :`<div style="width:32px;height:32px;background:var(--s2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px">🧪</div>`}
          <div>
            <div style="font-weight:500;font-size:13px">${window._esc(n.name)}</div>
            <div style="font-size:10px;color:var(--t2)">${window._esc(n.note||'')}</div>
          </div>
        </div>
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${n.code||'—'}</td>
      <td style="font-size:13px;font-weight:500">${n.qty}</td>
      <td style="font-size:12px">${window._esc(u.name)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${n.date}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:${late?'var(--rd)':'var(--t2)'}">${n.iadeDate||'—'}${late?' ⚠':''}</td>
      <td>${n.returned?'<span class="badge bg">✅ İade Edildi</span>':n.dir==='giris'?'<span class="badge bb">📥 Stokta</span>':'<span class="badge ba">📤 Dışarıda</span>'}</td>
      <td>
        <div style="display:flex;gap:4px">
          ${n.dir==='cikis'&&!n.returned?`<button class="btn btns btng" onclick="returnNumune(${n.id})">↩ İade</button>`:''}
          <button class="btn btns" onclick="editNumuneModal(${n.id})">✏️</button>
          ${_isAdminCLegacy()?`<button class="btn btns btnd" onclick="delNumune(${n.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

function exportNumuneXlsx(){
  if(typeof XLSX==='undefined')return;
  const users=loadUsers();
  const rows=loadNumune().map(n=>{const u=users.find(x=>x.id===n.uid)||{name:'?'};return{Ürün:n.name,Kod:n.code||'',Miktar:n.qty,Yön:n.dir==='giris'?'Giriş':'Çıkış','Alan Kişi':u.name,Tarih:n.date,'İade Tarihi':n.iadeDate||'—',İade:n.returned?'Evet':'Hayır',Not:n.note||''};});
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Numune');
  XLSX.writeFile(wb,`Numune_${_nowTsc().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════
const Crm={
  render:         renderCrm,
  openModal:      openCrmModal,
  save:           saveCrm,
  del:            delCrm,
  setStatus:      setCrmStatus,
  setView:        setCrmView,
  exportXlsx:     exportCrmXlsx,
  ST:             CRM_ST,
  // Numune
  renderNumune, openNumuneModal, editNumuneModal, saveNumune,
  returnNumune, delNumune, setNumuneFilter, exportNumuneXlsx,
};
if(typeof module!=='undefined'&&module.exports){module.exports=Crm;}
else{
  window.Crm=Crm;
  window.CRM=Crm;
  const fns=['renderCrm','openCrmModal','saveCrm','delCrm','setCrmStatus','setCrmView','exportCrmXlsx',
    'renderNumune','openNumuneModal','editNumuneModal','saveNumune','returnNumune','delNumune','setNumuneFilter','exportNumuneXlsx'];
  fns.forEach(n=>{if(Crm[n])window[n]=Crm[n];});
  window.CRM_ST=CRM_ST;
}

// ── CRM Peek toggle ──────────────────────────
window._crmTogglePeek = function(id) {
  var peek = document.getElementById('peek-crm-' + id);
  var arr = document.getElementById('peek-arr-crm-' + id);
  if (!peek) return;
  var open = peek.style.display !== 'none';
  document.querySelectorAll('[id^="peek-crm-"]').forEach(function(el) { el.style.display = 'none'; });
  document.querySelectorAll('[id^="peek-arr-crm-"]').forEach(function(el) { el.textContent = '▸'; });
  if (!open) { peek.style.display = 'table-row'; if (arr) arr.textContent = '▾'; }
};

// ── CRM Toplu silme ──────────────────────────
window._crmBulkCheck = function() { var n = document.querySelectorAll('.crm-bulk-chk:checked').length; var bar = document.getElementById('crm-bulk-bar'); var cnt = document.getElementById('crm-bulk-cnt'); if (bar) bar.style.display = n ? 'flex' : 'none'; if (cnt) cnt.textContent = n; };
window._crmBulkClear = function() { document.querySelectorAll('.crm-bulk-chk').forEach(function(cb) { cb.checked = false; }); var bar = document.getElementById('crm-bulk-bar'); if (bar) bar.style.display = 'none'; };
window._crmBulkDelete = function() {
  var ids = Array.from(document.querySelectorAll('.crm-bulk-chk:checked')).map(function(cb) { return parseInt(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal(ids.length + ' müşteri kaydı çöp kutusuna taşınacak.', { title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil', onConfirm: function() {
    var data = typeof loadCrmData === 'function' ? loadCrmData() : []; var trash = typeof loadTrash === 'function' ? loadTrash() : []; var now = new Date().toISOString(); var exp = new Date(Date.now() + 30 * 86400000).toISOString();
    data.forEach(function(c) { if (ids.indexOf(c.id) === -1) return; trash.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(), name: c.name || '—', moduleName: 'CRM', originalCollection: 'crm', originalData: Object.assign({}, c, { isDeleted: true, deletedAt: now }), deletedAt: now, deletedByName: window.CU?.()?.name || 'Admin', expiresAt: exp }); c.isDeleted = true; c.deletedAt = now; });
    if (typeof storeCrmData === 'function') storeCrmData(data); if (typeof storeTrash === 'function') storeTrash(trash);
    window._crmBulkClear(); window.renderCrm?.(); window.toast?.(ids.length + ' kayıt silindi', 'ok');
  }});
};

/** @description CRM müşteri kaydından satış teklifi oluştur — satis-teklifleri paneline yönlendir */
window._crmSatisTeklif = function(crmId) {
  var data = typeof loadCrmData === 'function' ? loadCrmData() : [];
  var musteri = data.find(function(c) { return c.id === crmId; });
  if (!musteri) { window.toast?.('Müşteri bulunamadı', 'err'); return; }
  window._crmSatisMusteriData = musteri;
  if (typeof window.App?.nav === 'function') window.App.nav('satis-teklifleri');
  setTimeout(function() {
    window._openSatisModal?.();
    setTimeout(function() {
      var sel = document.getElementById('st-musteri');
      if (sel && musteri.name) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === musteri.name) { sel.selectedIndex = i; break; }
        }
      }
      window._crmSatisMusteriData = null;
    }, 200);
  }, 300);
};
