/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/stok.js  —  v8.1.0
 * Stok Yönetimi · Demirbaş Takibi · Zimmet Tutanağı
 *
 * Anayasa Kural 3 : DocumentFragment ile tek DOM işlemi
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _gs  = id  => document.getElementById(id);
// ── V18 eklenti alias ─────────────────────────────────────────
const _sts = (id, v) => { const el = _gs(id); if (el) el.textContent = v; };
const _p2s = n   => String(n).padStart(2, '0');
const _nowTss = () => { const n = new Date(); return `${n.getFullYear()}-${_p2s(n.getMonth()+1)}-${_p2s(n.getDate())} ${_p2s(n.getHours())}:${_p2s(n.getMinutes())}:${_p2s(n.getSeconds())}`; };
const _isAdminS = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUs      = () => window.Auth?.getCU?.();
const _initsS   = n  => (n||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'?';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — SABİTLER
// ════════════════════════════════════════════════════════════════
const STK_ST = {
  giris:    {l:'📥 Giriş',          c:'bg'},
  cikis:    {l:'📤 Çıkış',          c:'ba'},
  bekle:    {l:'⏳ Onay Bekliyor',  c:'bb'},
  demirbaş: {l:'🖥️ Demirbaş',       c:'bp'},
};

const TUR_ICONS = {stok:'📦', zimmet:'🔑', demirbaş:'🖥️'};

let STOK_FILTER = 'all';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — STOK MODAL & FORM
// ════════════════════════════════════════════════════════════════

function openStokModalTur(tur){
  openStokModal('giris');
  setTimeout(()=>{
    const sel=_gs('stk-tür');
    if(sel){sel.value=tur;updateStokForm();}
    const title=_gs('mo-stk-t');
    if(title){
      const labels={stok:'📦 Ürün Girişi',zimmet:'🔑 Zimmet Ver',demirbaş:'🖥️ Demirbaş Kaydı'};
      title.textContent=labels[tur]||'📦 Kayıt Ekle';
    }
  },50);
}

function updateStokForm(){
  const tür=_gs('stk-tür')?.value||'stok';
  const isZimmet=tür==='zimmet'||tür==='demirbaş';
  const imeiRow=_gs('stk-imei-row');if(imeiRow)imeiRow.style.display=isZimmet?'block':'none';
  const zimmetRow=_gs('stk-zimmet-row');if(zimmetRow)zimmetRow.style.display=tür==='zimmet'?'block':'none';
  const reqEl=_gs('stk-foto-required');if(reqEl)reqEl.style.display=isZimmet?'inline':'none';
  const optEl=_gs('stk-foto-opt');if(optEl)optEl.style.display=isZimmet?'none':'inline';
  const tutBtn=_gs('btn-stk-tutanak');if(tutBtn)tutBtn.style.display='none';
}

function previewStokImg(input){
  const prev=_gs('stk-img-preview');if(!prev)return;
  if(input.files&&input.files[0]){
    const r=new FileReader();
    r.onload=e=>{prev.style.display='block';prev.innerHTML=`<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:6px;border:1px solid var(--b)">`};
    r.readAsDataURL(input.files[0]);
  }else{prev.style.display='none';prev.innerHTML='';}
}

function openStokModal(dir,editId){
  const users=loadUsers();
  const su=_gs('stk-user');if(su)su.innerHTML=users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  const zu=_gs('stk-zimmet-user');if(zu)zu.innerHTML=users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  if(_gs('stk-eid'))_gs('stk-eid').value=editId||'';
  if(editId){
    const e=loadStok().find(x=>x.id===editId);if(!e)return;
    if(_gs('stk-name'))      _gs('stk-name').value      =e.name||'';
    if(_gs('stk-qty'))       _gs('stk-qty').value       =e.qty||1;
    if(_gs('stk-date'))      _gs('stk-date').value      =e.date||'';
    if(_gs('stk-note'))      _gs('stk-note').value      =e.note||'';
    if(_gs('stk-dir'))       _gs('stk-dir').value       =e.dir||dir||'giris';
    if(_gs('stk-tür'))       _gs('stk-tür').value       =e.tür||'stok';
    if(_gs('stk-imei'))      _gs('stk-imei').value      =e.imei||'';
    if(_gs('stk-kod'))       _gs('stk-kod').value       =e.kod||'';
    if(_gs('stk-bilgi-notu'))_gs('stk-bilgi-notu').value=e.bilgiNotu||'';
    if(su)su.value=e.uid;
    if(zu&&e.zimmetUid)zu.value=e.zimmetUid;
    if(_gs('stk-zimmet-date'))_gs('stk-zimmet-date').value=e.zimmetDate||'';
    if(_gs('stk-iade-date')) _gs('stk-iade-date').value =e.iadeDate||'';
    _sts('mo-stk-t','✏️ Kayıt Düzenle');
    const tutBtn=_gs('btn-stk-tutanak');
    if(tutBtn&&(e.tür==='zimmet'||e.tür==='demirbaş'))tutBtn.style.display='inline-flex';
  }else{
    ['stk-name','stk-note','stk-imei','stk-kod','stk-bilgi-notu'].forEach(i=>{const el=_gs(i);if(el)el.value='';});
    if(_gs('stk-qty'))        _gs('stk-qty').value='1';
    if(_gs('stk-dir'))        _gs('stk-dir').value=dir||'giris';
    if(_gs('stk-date'))       _gs('stk-date').valueAsDate=new Date();
    if(_gs('stk-zimmet-date'))_gs('stk-zimmet-date').valueAsDate=new Date();
    if(_gs('stk-iade-date'))  _gs('stk-iade-date').value='';
    if(_gs('stk-tür'))        _gs('stk-tür').value=dir==='giris'?'zimmet':'stok';
    if(su)su.value=_CUs()?.id;
    if(zu)zu.value=_CUs()?.id;
    _sts('mo-stk-t',dir==='giris'?'📥 Zimmet / Giriş':'📤 İade / Çıkış');
    const prev=_gs('stk-img-preview');if(prev){prev.style.display='none';prev.innerHTML='';}
    const tutBtn=_gs('btn-stk-tutanak');if(tutBtn)tutBtn.style.display='none';
  }
  updateStokForm();
  window.openMo?.('mo-stok');
}

function saveStok(){
  const name=(_gs('stk-name')?.value||'').trim();
  if(!name){window.toast?.('Ürün/cihaz adı zorunludur','err');return;}
  const tür=_gs('stk-tür')?.value||'stok';
  const isZimmet=tür==='zimmet'||tür==='demirbaş';
  const imgInput=_gs('stk-img');
  const eid=parseInt(_gs('stk-eid')?.value||'0');
  const existingEntry=eid?loadStok().find(x=>x.id===eid):null;
  if(isZimmet&&!eid&&(!imgInput?.files?.length)){
    window.toast?.('Zimmet ve demirbaş kayıtlarında fotoğraf zorunludur 📸','err');return;
  }
  const d=loadStok();
  const newStatus=_isAdminS()?'giris':'bekle';
  const entry={
    dir:      _gs('stk-dir')?.value||'giris',
    tür,name,
    qty:      parseInt(_gs('stk-qty')?.value)||1,
    date:     _gs('stk-date')?.value||'',
    uid:      parseInt(_gs('stk-user')?.value||_CUs()?.id),
    note:     _gs('stk-note')?.value||'',
    imei:     _gs('stk-imei')?.value||'',
    kod:      _gs('stk-kod')?.value||'',
    zimmetUid:parseInt(_gs('stk-zimmet-user')?.value||'0')||null,
    zimmetDate:_gs('stk-zimmet-date')?.value||'',
    iadeDate: _gs('stk-iade-date')?.value||'',
    bilgiNotu:_gs('stk-bilgi-notu')?.value||'',
    status:   newStatus,
    approved: _isAdminS(),
  };
  const readFile=(input,cb)=>{
    if(input?.files?.[0]){const r=new FileReader();r.onload=e=>cb({name:input.files[0].name,data:e.target.result});r.readAsDataURL(input.files[0]);}
    else cb(null);
  };
  const doSave=(imgData,docData)=>{
    if(imgData)entry.img=imgData;
    if(docData)entry.doc=docData;
    if(eid){
      const e=d.find(x=>x.id===eid);
      if(e){Object.assign(e,entry);if(!imgData&&existingEntry?.img)e.img=existingEntry.img;}
    }else{entry.id=Date.now();d.unshift(entry);}
    storeStok(d);
    window.closeMo?.('mo-stok');
    renderStok();
    setTimeout(()=>{try{renderDemirbaslar();}catch(ex){}},80);
    if(!_isAdminS()){
      const users=loadUsers();const u=users.find(x=>x.id===(entry.zimmetUid||entry.uid))||{name:'?'};
      window.addNotif?.('🔑',`Zimmet kaydı onay bekliyor: ${name} — ${u.name}`,'warn','stok');
    }
    window.logActivity?.('view',`"${name}" ${tür} kaydı ${eid?'güncellendi':'oluşturuldu'}`);
    window.toast?.(_isAdminS()?'Kayıt eklendi ✓':'Onay için gönderildi ✓','ok');
    if(isZimmet&&!eid){
      const newEntry=d[0];
      const tutBtn=_gs('btn-stk-tutanak');
      if(tutBtn){tutBtn.style.display='inline-flex';tutBtn.onclick=()=>printZimmetTutanak(newEntry.id);}
    }
  };
  readFile(_gs('stk-img'),(imgData)=>readFile(_gs('stk-doc'),(docData)=>doSave(imgData,docData)));
}

function approveStok(id){
  const d=loadStok();const e=d.find(x=>x.id===id);
  if(!e||!_isAdminS())return;
  e.status=e.dir==='cikis'?'cikis':(e.tür==='demirbaş'?'demirbaş':'giris');
  e.approved=true;e.approvedBy=_CUs()?.id;e.approveTs=_nowTss();
  storeStok(d);renderStok();
  window.toast?.('Onaylandı ✓','ok');
  window.logActivity?.('view',`"${e.name}" zimmet/demirbaş kaydı onaylandı`);
}

function delStok(id){
  if(!_isAdminS())return;
  const d=loadStok();const e=d.find(x=>x.id===id);if(!e)return;
  if(!confirm(`"${e.name}" kaydı silinsin mi?`))return;
  storeStok(d.filter(x=>x.id!==id));
  renderStok();
  window.toast?.('Silindi','ok');
}

function setStokFilter(f,btn){
  STOK_FILTER=f;
  document.querySelectorAll('#panel-stok .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderStok();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — STOK RENDER — DocumentFragment
// ════════════════════════════════════════════════════════════════

function renderStok(){
    // skeleton-renderStok
  const _skCont = document.getElementById('stok-list');
  if (_skCont && typeof showSkeleton === 'function') showSkeleton(_skCont, 3);

  const users=loadUsers();
  let items=_isAdminS()?loadStok():loadStok().filter(s=>s.uid===_CUs()?.id||s.zimmetUid===_CUs()?.id);
  const all=_isAdminS()?loadStok():loadStok().filter(s=>s.uid===_CUs()?.id||s.zimmetUid===_CUs()?.id);
  _sts('stk-total',   all.length);
  _sts('stk-giris',   all.filter(s=>s.status==='giris').length);
  _sts('stk-cikis',   all.filter(s=>s.status==='cikis').length);
  _sts('stk-bekle',   all.filter(s=>s.status==='bekle').length);
  _sts('stk-demirbaş',all.filter(s=>s.tür==='demirbaş'&&s.status!=='bekle').length);
  if(STOK_FILTER!=='all')items=items.filter(s=>s.status===STOK_FILTER||s.tür===STOK_FILTER);
  const cont=_gs('stok-list');if(!cont)return;
  if(!items.length){
    cont.innerHTML=`<div style="padding:32px;text-align:center;color:var(--t2)"><div style="font-size:32px">🔑</div><div style="margin-top:10px">Kayıt bulunamadı.</div></div>`;
    return;
  }
  const ST2={giris:{l:'✅ Aktif',c:'bg'},cikis:{l:'📤 İade',c:'ba'},bekle:{l:'⏳ Onay Bekliyor',c:'bb'},demirbaş:{l:'🖥️ Demirbaş',c:'bp'}};

  // DocumentFragment
  const frag=document.createDocumentFragment();
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr>
    <th>Tür</th><th>Ürün / Cihaz</th><th>IMEI / Kod</th>
    <th>Zimmet Eden</th><th>Tarih</th><th>Fotoğraf</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  items.forEach(s=>{
    const u=users.find(x=>x.id===s.uid)||{name:'?'};
    const zu=s.zimmetUid?users.find(x=>x.id===s.zimmetUid):null;
    const st2=ST2[s.status]||ST2.bekle;
    const turIcon=TUR_ICONS[s.tür||'stok'];
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span style="font-size:16px">${turIcon}</span></td>
      <td>
        <div style="font-weight:500;font-size:13px">${s.name}${s.qty>1?` <span style="color:var(--t2);font-weight:400">×${s.qty}</span>`:''}</div>
        ${s.bilgiNotu?`<div style="font-size:10px;color:var(--t3);margin-top:1px">📝 ${s.bilgiNotu.slice(0,40)}${s.bilgiNotu.length>40?'…':''}</div>`:''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">
        ${s.imei?`<div>IMEI: ${s.imei}</div>`:''}
        ${s.kod?`<div>Kod: ${s.kod}</div>`:''}
        ${!s.imei&&!s.kod?'—':''}
      </td>
      <td style="font-size:12px">
        <div>${zu?zu.name:u.name}</div>
        ${s.zimmetDate?`<div style="font-size:10px;color:var(--t3)">${s.zimmetDate}</div>`:''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${s.date||'—'}</td>
      <td>
        ${s.img?`<a href="${s.img.data}" target="_blank"><img src="${s.img.data}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--b)"></a>`
               :`<span style="color:var(--t3);font-size:11px">${(s.tür==='zimmet'||s.tür==='demirbaş')?'⚠ Yok':'—'}</span>`}
      </td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          ${s.status==='bekle'&&_isAdminS()?`<button class="btn btns btng" onclick="approveStok(${s.id})">✓</button>`:''}
          ${(s.tür==='zimmet'||s.tür==='demirbaş')?`<button class="btn btns" onclick="printZimmetTutanak(${s.id})" title="Tutanak">🖨</button>`:''}
          ${s.doc?`<a href="${s.doc.data}" download="${s.doc.name}" class="btn btns" style="text-decoration:none" title="Belge">📄</a>`:''}
          <button class="btn btns" onclick="openStokModal('${s.dir||'giris'}',${s.id})">✏️</button>
          ${_isAdminS()?`<button class="btn btns btnd" onclick="delStok(${s.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — DEMİRBAŞLAR — DocumentFragment
// ════════════════════════════════════════════════════════════════

function renderDemirbaslar(){
  const users=loadUsers();
  const uSel=_gs('db-filter-user');
  if(uSel&&uSel.options.length<=1)
    uSel.innerHTML='<option value="0">Tüm Personel</option>'+users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  const filterUid=parseInt(_gs('db-filter-user')?.value||'0');
  const filterStatus=_gs('db-filter-status')?.value||'';
  let items=loadStok().filter(s=>s.tür==='demirbaş');
  if(!_isAdminS())items=items.filter(s=>s.uid===_CUs()?.id||s.zimmetUid===_CUs()?.id);
  const allDb=_isAdminS()?loadStok().filter(s=>s.tür==='demirbaş'):loadStok().filter(s=>s.tür==='demirbaş'&&(s.uid===_CUs()?.id||s.zimmetUid===_CUs()?.id));
  _sts('db-total', allDb.length);
  _sts('db-active',allDb.filter(s=>s.status==='giris').length);
  _sts('db-bekle', allDb.filter(s=>s.status==='bekle').length);
  _sts('db-iade',  allDb.filter(s=>s.status==='cikis').length);
  if(filterUid)   items=items.filter(s=>s.zimmetUid===filterUid||s.uid===filterUid);
  if(filterStatus)items=items.filter(s=>s.status===filterStatus);
  const cont=_gs('demirbaslar-list');if(!cont)return;
  if(!items.length){
    cont.innerHTML=`<div style="padding:28px;text-align:center;color:var(--t2);font-size:13px"><div style="font-size:32px;margin-bottom:8px">🖥️</div>Demirbaş kaydı bulunamadı.<div style="margin-top:12px"><button class="btn btnp" onclick="openStokModalTur('demirbaş')">+ İlk Demirbaşı Ekle</button></div></div>`;
    return;
  }
  const ST2={giris:{l:'✅ Zimmetli',c:'bg'},cikis:{l:'📤 İade',c:'ba'},bekle:{l:'⏳ Onay Bekliyor',c:'bb'}};

  // DocumentFragment
  const frag=document.createDocumentFragment();
  const table=document.createElement('table');
  table.className='tbl';
  table.style.fontSize='12px';
  table.innerHTML=`<thead><tr>
    <th>Cihaz / Demirbaş</th><th>IMEI / Seri / Kod</th>
    <th>Zimmet Alan</th><th>Teslim Tarihi</th>
    <th>İade Tarihi</th><th>Fotoğraf</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  items.forEach(s=>{
    const u=users.find(x=>x.id===s.uid)||{name:'?'};
    const zu=s.zimmetUid?users.find(x=>x.id===s.zimmetUid):null;
    const st2=ST2[s.status]||ST2.bekle;
    const tr=document.createElement('tr');
    tr.style.background=s.status==='bekle'&&_isAdminS()?'rgba(245,158,11,.04)':'';
    tr.innerHTML=`
      <td>
        <div style="font-weight:600;font-size:13px">${s.name}${s.qty>1?` ×${s.qty}`:''}</div>
        ${s.bilgiNotu?`<div style="font-size:10px;color:var(--t3)">${s.bilgiNotu.slice(0,40)}</div>`:''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">
        ${s.imei?`<div style="margin-bottom:2px"><span style="color:var(--t3)">IMEI</span> ${s.imei}</div>`:''}
        ${s.kod?`<div><span style="color:var(--t3)">Kod</span> ${s.kod}</div>`:''}
        ${!s.imei&&!s.kod?'—':''}
      </td>
      <td style="font-size:13px">
        <div style="font-weight:500">${zu?zu.name:u.name}</div>
        <div style="font-size:10px;color:var(--t3)">${(zu?zu:u).email||''}</div>
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${s.zimmetDate||s.date||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t3)">${s.iadeDate||'—'}</td>
      <td>
        ${s.img?`<a href="${s.img.data}" target="_blank"><img src="${s.img.data}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--b)"></a>`
               :`<span style="color:var(--rd);font-size:11px;font-weight:600">⚠ Fotoğraf yok</span>`}
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:5px">
          <div style="width:7px;height:7px;border-radius:50%;background:${st2.c==='bg'?'#22C55E':st2.c==='bb'?'#F59E0B':'#64748B'};flex-shrink:0"></div>
          <span class="badge ${st2.c}">${st2.l}</span>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:4px">
          ${s.status==='bekle'&&_isAdminS()?`<button class="btn btns btng" onclick="approveStok(${s.id})">✓ Onayla</button>`:''}
          <button class="btn btns" onclick="printZimmetTutanak(${s.id})" title="Tutanak">🖨</button>
          ${s.doc?`<a href="${s.doc.data}" download="${s.doc.name}" class="btn btns" style="text-decoration:none" title="${s.doc.name}">📄</a>`:''}
          <button class="btn btns" onclick="openStokModal('giris',${s.id})">✏️</button>
          ${_isAdminS()?`<button class="btn btns btnd" onclick="delStok(${s.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ZİMMET TUTANAKI (Yazdırma)
// ════════════════════════════════════════════════════════════════

function printZimmetTutanak(id){
  const stok=loadStok();const s=stok.find(x=>x.id===id);if(!s)return;
  const users=loadUsers();
  const u=users.find(x=>x.id===s.uid)||{name:'?'};
  const zu=s.zimmetUid?users.find(x=>x.id===s.zimmetUid):null;
  const zimmetAlan=zu?zu.name:u.name;
  const win=window.open('','_blank','width=700,height=800');
  if(!win){window.toast?.('Popup engellendi','err');return;}
  win.document.write(`<!DOCTYPE html><html><head><title>Zimmet Tutanağı</title><style>
    body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;font-size:13px;line-height:1.6}
    h2{text-align:center;font-size:16px;margin-bottom:4px}
    .meta{text-align:center;font-size:11px;color:#666;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .sign-row{display:flex;justify-content:space-between;margin-top:40px;gap:20px}
    .sign-box{flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:11px}
    .photo-box{text-align:center;margin:12px 0}
    .photo-box img{max-width:120px;max-height:120px;object-fit:cover;border:1px solid #ddd;border-radius:4px}
    footer{margin-top:30px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px;text-align:center}
  </style></head><body>
    <h2>ZİMMET TUTANAĞI</h2>
    <div class="meta">${new Date().toLocaleDateString('tr-TR')} · AkademiHub v8.0.0</div>
    <table><tbody>
      <tr><th>Zimmet Türü</th><td>${s.tür==='demirbaş'?'🖥️ Demirbaş':'🔑 Zimmet'}</td></tr>
      <tr><th>Ürün / Cihaz Adı</th><td>${s.name}${s.qty>1?` (×${s.qty})`:''}</td></tr>
      ${s.imei?`<tr><th>IMEI / Seri No</th><td style="font-family:monospace">${s.imei}</td></tr>`:''}
      ${s.kod?`<tr><th>Kod / Barkod</th><td style="font-family:monospace">${s.kod}</td></tr>`:''}
      <tr><th>Zimmet Alan Personel</th><td><strong>${zimmetAlan}</strong></td></tr>
      <tr><th>Teslim Tarihi</th><td>${s.zimmetDate||s.date||'—'}</td></tr>
      ${s.iadeDate?`<tr><th>İade Tarihi</th><td>${s.iadeDate}</td></tr>`:''}
      ${s.bilgiNotu?`<tr><th>Bilgi Notu</th><td>${s.bilgiNotu}</td></tr>`:''}
      ${s.note?`<tr><th>Açıklama</th><td>${s.note}</td></tr>`:''}
    </tbody></table>
    ${s.img?`<div class="photo-box"><p style="font-size:11px;color:#666;margin-bottom:6px">Cihaz Fotoğrafı</p><img src="${s.img.data}" alt="Cihaz Fotoğrafı"></div>`:''}
    <div style="font-size:12px;background:#fafafa;border:1px solid #eee;border-radius:4px;padding:12px;margin-bottom:20px">
      <strong>Teslim Alan Beyanı:</strong> Yukarıda belirtilen cihaz/ekipmanı eksiksiz ve çalışır durumda teslim aldım. Kullanım süresince yaşanacak hasar veya kayıplardan sorumlu olduğumu kabul ederim.
    </div>
    <div class="sign-row">
      <div class="sign-box">Teslim Eden<br><br><span style="font-weight:600">${u.name}</span></div>
      <div class="sign-box">Teslim Alan<br><br><span style="font-weight:600">${zimmetAlan}</span></div>
      ${_isAdminS()?`<div class="sign-box">Yönetici Onayı<br><br><span style="font-weight:600">${_CUs()?.name||''}</span></div>`:''}
    </div>
    <footer>AkademiHub Zimmet Sistemi · Belge No: ZMT-${id} · ${new Date().toLocaleDateString('tr-TR')}</footer>
    <script>window.print();<\/script>
  </body></html>`);
}

function exportStokXlsx(){
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const users=loadUsers();
  const rows=loadStok().map(s=>{
    const u=users.find(x=>x.id===s.uid)||{name:'?'};
    const zu=s.zimmetUid?users.find(x=>x.id===s.zimmetUid):null;
    return{Tür:s.tür||'stok','Ürün/Cihaz':s.name,Miktar:s.qty,IMEI:s.imei||'',Kod:s.kod||'','Zimmet Alan':zu?zu.name:u.name,Tarih:s.date||'',Durum:STK_ST[s.status]?.l||s.status,Not:s.note||''};
  });
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Stok');
  XLSX.writeFile(wb,`Stok_${_nowTss().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — STOK
// ════════════════════════════════════════════════════════════════

function importStokXlsx(){g('stok-import-file').click();}

function processStokImport(input){
  if(!input.files||!input.files[0])return;
  if(typeof XLSX==='undefined'){toast('XLSX yüklenmedi','err');return;}
  const file=input.files[0];const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws);
      const d=loadStok();let added=0;
      rows.forEach(r=>{if(r['Ürün']){d.push({id:Date.now()+added,dir:(r['Yön']||'').includes('Çıkış')?'cikis':'giris',name:r['Ürün'],qty:parseInt(r['Miktar'])||1,date:r['Tarih']||nowTs().slice(0,10),uid:CU.id,note:r['Not']||'',status:isAdmin()?'giris':'bekle',approved:isAdmin()});added++;}});
      storeStok(d);renderStok();input.value='';toast(`${added} kayıt içe aktarıldı ✓`,'ok');
    }catch(err){toast('Dosya okunamadı: '+err.message,'err');}
  };reader.readAsBinaryString(file);
}


const Stok={
  render:           renderStok,
  renderDemirbaslar,
  openModal:        openStokModal,
  openModalTur:     openStokModalTur,
  save:             saveStok,
  del:              delStok,
  approve:          approveStok,
  setFilter:        setStokFilter,
  updateForm:       updateStokForm,
  previewImg:       previewStokImg,
  printTutanak:     printZimmetTutanak,
  exportXlsx:       exportStokXlsx,
  ST:               STK_ST,
};
if(typeof module!=='undefined'&&module.exports){module.exports=Stok;}
else{
  window.Stok=Stok;
  // V18 eklenen fonksiyonlar
  window.importStokXlsx     = importStokXlsx;
  window.processStokImport  = processStokImport;
  const fns=['renderStok','renderDemirbaslar','openStokModal','openStokModalTur','saveStok','delStok',
    'approveStok','setStokFilter','updateStokForm','previewStokImg','printZimmetTutanak','exportStokXlsx'];
  fns.forEach(n=>{if(Stok[n])window[n]=Stok[n];});
  window.STK_ST=STK_ST;
}
