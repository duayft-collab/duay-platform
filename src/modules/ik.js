/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/ik.js  —  v8.1.0
 * İK Yönetimi · İzin Takibi · Puantaj / Mesai
 *
 * Anayasa Kural 3 : DocumentFragment ile tek DOM işlemi
 * Anayasa Kural 4 : window.* geriye uyumluluk
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

// ── Kısayollar ───────────────────────────────────────────────────
const _gi = window.g;
// ── V18 eklenti alias ─────────────────────────────────────────
const _sti = window.st;
const _isAdmin  = window.isAdmin;
const _CU       = window.CU;
const _initials = window.initials;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — İK SABİTLERİ
// ════════════════════════════════════════════════════════════════
const IK_STAGES = ['1. Teklif Gönderildi','2. Belgeler Tamamlandı','3. SGK Kaydı','4. Oryantasyon','5. Deneme Süreci','6. Tam Kadro'];
const IK_DEPT   = {it:'💻 Yazılım/IT',muhasebe:'📊 Muhasebe',ik:'👥 İK',satis:'🛒 Satış',operasyon:'⚙️ Operasyon',yonetim:'🏛️ Yönetim'};
const IK_ST     = {active:{l:'✅ Aktif',c:'bg'},probation:{l:'🔄 Deneme',c:'ba'},left:{l:'🚪 Ayrılan',c:'br'},pending:{l:'📋 Bekleyen',c:'bb'}};
const IK_ROADMAP = [
  {title:'Teklif & Kabul',  icon:'📋', docs:['İş Teklifi','Maaş Formu'],                   color:'var(--blb)', tc:'var(--blt)'},
  {title:'Belgeler',         icon:'📄', docs:['Kimlik Fotokopisi','İkametgah','Diploma','SGK Evrakı'], color:'var(--amb)', tc:'var(--amt)'},
  {title:'SGK & Sigorta',    icon:'🏛️', docs:['SGK Girişi','Sağlık Sigortası'],              color:'var(--al)',  tc:'var(--at)' },
  {title:'Oryantasyon',      icon:'🎓', docs:['Şirket El Kitabı','KVKK','IT Erişim'],        color:'var(--grb)', tc:'var(--grt)'},
  {title:'Deneme Süreci',    icon:'🔄', docs:['Performans Formu','Mentor Atama'],             color:'var(--amb)', tc:'var(--amt)'},
  {title:'Tam Kadro',        icon:'✅', docs:['Onay Tutanağı','Zam Görüşmesi'],              color:'var(--grb)', tc:'var(--grt)'},
];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — İZİN TÜRLERİ (4857 sayılı İş Kanunu)
// ════════════════════════════════════════════════════════════════
const IZIN_TYPES = {
  yillik:    { l:'📆 Yıllık İzin',        min:14,  max:365, minUnit:'iş günü',      paid:true,  legal:'4857 md.53',    requireDoc:false },
  mazeret:   { l:'🙏 Mazeret İzni',        min:1,   max:5,   minUnit:'iş günü',      paid:true,  legal:'4857 md.46',    requireDoc:false },
  hastalik:  { l:'🏥 Hastalık İzni',       min:1,   max:540, minUnit:'takvim günü',  paid:true,  legal:'5510 md.18',    requireDoc:true  },
  ucretsiz:  { l:'💸 Ücretsiz İzin',       min:1,   max:180, minUnit:'iş günü',      paid:false, legal:'4857 md.56',    requireDoc:false },
  dogum:     { l:'👶 Doğum/Ebeveyn',       min:5,   max:112, minUnit:'iş günü',      paid:true,  legal:'4857 md.74',    requireDoc:true  },
  olum:      { l:'🕊️ Ölüm İzni',           min:3,   max:7,   minUnit:'iş günü',      paid:true,  legal:'4857 md.46',    requireDoc:false },
  evlilik:   { l:'💍 Evlilik İzni',        min:3,   max:7,   minUnit:'iş günü',      paid:true,  legal:'4857 md.46',    requireDoc:true  },
  mazeretsiz:{ l:'❌ Mazeretsiz Devamsızlık', min:0, max:999, minUnit:'iş günü',     paid:false, legal:'4857 md.25/II', requireDoc:false },
  egitim:    { l:'📚 Eğitim İzni',         min:1,   max:30,  minUnit:'iş günü',      paid:false, legal:'ILO C.140',     requireDoc:true  },
  refakat:   { l:'🤒 Refakat İzni',        min:1,   max:10,  minUnit:'iş günü',      paid:true,  legal:'4857 md.46',    requireDoc:true  },
  tasinma:   { l:'🏠 Taşınma İzni',        min:1,   max:2,   minUnit:'iş günü',      paid:false, legal:'4857 md.56',    requireDoc:false },
  diger:     { l:'📌 Diğer',              min:1,   max:365, minUnit:'iş günü',      paid:false, legal:'TİS/İş Sözleşmesi', requireDoc:false },
};

const IZIN_YILLIK_HAK_TABLO = [{maxYil:5,gun:14},{maxYil:15,gun:20},{maxYil:999,gun:26}];
function getYillikIzinHak(kidemYil){
  if(kidemYil<1)return 0;
  for(const b of IZIN_YILLIK_HAK_TABLO){if(kidemYil<=b.maxYil)return b.gun;}
  return 26;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — İK PERSONEL YÖNETİMİ
// ════════════════════════════════════════════════════════════════

function openIkModal(id){
  if(id){
    const e=loadIk().find(x=>x.id===id);if(!e)return;
    if(_gi('ik-name'))  _gi('ik-name').value =e.name;
    if(_gi('ik-pos'))   _gi('ik-pos').value  =e.pos;
    if(_gi('ik-dept'))  _gi('ik-dept').value =e.dept;
    if(_gi('ik-start')) _gi('ik-start').value=e.start;
    if(_gi('ik-status'))_gi('ik-status').value=e.status;
    if(_gi('ik-stage')) _gi('ik-stage').value=e.stage;
    if(_gi('ik-email')) _gi('ik-email').value=e.email;
    if(_gi('ik-phone')) _gi('ik-phone').value=e.phone||'';
    if(_gi('ik-note'))  _gi('ik-note').value =e.note||'';
    if(_gi('ik-eid'))   _gi('ik-eid').value  =id;
    _sti('mo-ik-t','✏️ Personel Düzenle');
  } else {
    ['ik-name','ik-pos','ik-email','ik-phone','ik-note'].forEach(i=>{const el=_gi(i);if(el)el.value='';});
    if(_gi('ik-dept'))  _gi('ik-dept').value ='it';
    if(_gi('ik-status'))_gi('ik-status').value='pending';
    if(_gi('ik-stage')) _gi('ik-stage').value ='0';
    if(_gi('ik-start')) _gi('ik-start').valueAsDate=new Date();
    if(_gi('ik-eid'))   _gi('ik-eid').value  ='';
    _sti('mo-ik-t','+ Yeni Personel');
  }
  window.openMo?.('mo-ik');
}

function saveIk(){
  const name=(_gi('ik-name')?.value||'').trim();
  if(!name){window.toast?.('Ad zorunludur','err');return;}
  const d=loadIk();
  const eid=parseInt(_gi('ik-eid')?.value||'0');
  const entry={
    name,
    pos:   _gi('ik-pos')?.value||'',
    dept:  _gi('ik-dept')?.value||'it',
    start: _gi('ik-start')?.value||'',
    status:_gi('ik-status')?.value||'pending',
    stage: parseInt(_gi('ik-stage')?.value||'0'),
    email: _gi('ik-email')?.value||'',
    phone: _gi('ik-phone')?.value||'',
    note:  _gi('ik-note')?.value||'',
  };
  if(eid){const e=d.find(x=>x.id===eid);if(e)Object.assign(e,entry);}
  else d.push({id:generateNumericId(),...entry});
  storeIk(d);
  window.closeMo?.('mo-ik');
  renderIk();
  window.logActivity?.('view',`"${name}" İK kaydı güncellendi`);
  window.toast?.(name+' kaydedildi ✓','ok');
}

function delIk(id){
  if(!_isAdmin()){window.toast?.('Yetki yok','err');return;}
  window.confirmModal('Bu kaydı silmek istediğinizden emin misiniz?', {
    title: 'İK Kaydı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeIk(loadIk().filter(x=>x.id!==id));
      renderIk();
      window.toast?.('Silindi','ok');
    }
  });
}

function renderIk(){
  // ── Virtual scroll: 100+ kayıt için otomatik devreye girer ──────
  // VirtualList window.VirtualList olarak utils.js'den gelir

    // skeleton-renderIk
  const _skCont = document.getElementById('ik-tbody');
  if (_skCont && typeof showSkeleton === 'function') showSkeleton(_skCont, 3);

  const d=loadIk();
  const sf=_gi('ik-status-f')?.value||'';
  const sr=(_gi('ik-search')?.value||'').toLowerCase();
  let fl=d;
  if(sf)fl=fl.filter(x=>x.status===sf);
  if(sr)fl=fl.filter(x=>x.name.toLowerCase().includes(sr)||(x.pos||'').toLowerCase().includes(sr));

  _sti('ik-total',    d.length);
  _sti('ik-active',   d.filter(x=>x.status==='active').length);
  _sti('ik-probation',d.filter(x=>x.status==='probation').length);
  _sti('ik-left',     d.filter(x=>x.status==='left').length);
  _sti('ik-pending',  d.filter(x=>x.status==='pending').length);

  const nbEl=_gi('nb-ik-b');
  if(nbEl){const n=d.filter(x=>x.status==='pending').length;nbEl.textContent=n;nbEl.style.display=n>0?'inline':'none';}

  // Roadmap
  const rm=_gi('ik-roadmap');
  if(rm){
    rm.innerHTML=`<div style="display:flex;gap:0;align-items:center;flex-wrap:nowrap">
      ${IK_ROADMAP.map((r,i)=>`
        <div style="display:flex;align-items:center">
          <div style="background:${r.color};border:1px solid rgba(0,0,0,.1);border-radius:var(--rs);padding:10px 14px;min-width:130px">
            <div style="font-size:16px;margin-bottom:4px">${r.icon}</div>
            <div style="font-size:12px;font-weight:600;color:${r.tc}">${r.title}</div>
            <div style="font-size:10px;color:${r.tc};opacity:.8;margin-top:3px">${r.docs.slice(0,2).join(' · ')}${r.docs.length>2?' …':''}</div>
          </div>
          ${i<IK_ROADMAP.length-1?`<div style="width:20px;height:2px;background:var(--bm);flex-shrink:0"></div>`:''}
        </div>`).join('')}
    </div>`;
  }

  const tb=_gi('ik-tbody');if(!tb)return;

  // DocumentFragment — Anayasa Kural 3
  if(!fl.length){
    tb.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--t2)">Kayıt bulunamadı.</td></tr>`;
    return;
  }

  const frag=document.createDocumentFragment();
  fl.forEach(p=>{
    const st2=IK_ST[p.status]||IK_ST.pending;
    const stg=IK_STAGES[p.stage]||'—';
    const pct=Math.round((p.stage/5)*100);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <div style="font-weight:500;font-size:13px">${p.name}</div>
        <div style="font-size:10px;color:var(--t2)">${p.email||''}</div>
      </td>
      <td>
        <div style="font-size:12px">${p.pos||'—'}</div>
        <div style="font-size:10px;color:var(--t2)">${IK_DEPT[p.dept]||p.dept}</div>
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${p.start||'—'}</td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td>
        <div style="font-size:11px;margin-bottom:4px">${stg}</div>
        <div style="height:4px;background:var(--s2);border-radius:99px;width:80px">
          <div style="height:100%;background:var(--ac);width:${pct}%;border-radius:99px"></div>
        </div>
      </td>
      <td style="font-size:11px;color:var(--t2)">${p.note||''}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btns" onclick="openIkModal(${p.id})">✏️</button>
          ${_isAdmin()?`<button class="btn btns btnd" onclick="delIk(${p.id})">🗑</button>`:''}
        </div>
      </td>`;
    frag.appendChild(tr);
  });
  tb.replaceChildren(frag);
}

function exportIkXlsx(){
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const rows=loadIk().map(p=>({
    Ad:p.name, Pozisyon:p.pos,
    Departman:IK_DEPT[p.dept]||p.dept,
    Başlangıç:p.start,
    Durum:IK_ST[p.status]?.l||p.status,
    Aşama:IK_STAGES[p.stage]||'—',
    Not:p.note||'',
  }));
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'İK');
  XLSX.writeFile(wb,`IK_${_nowTs().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// ── Zimmet Takibi (İK içinde) ─────────────────────────────────
function renderIkZimmet(){
  const users=loadUsers();
  const uSel=_gi('ik-zimmet-user-f');
  if(uSel&&uSel.options.length<=1)
    uSel.innerHTML='<option value="0">Tüm Personel</option>'+users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  const filterUid=parseInt(uSel?.value||'0');
  let stok=loadStok().filter(s=>s.tür==='zimmet'||s.tür==='demirbaş');
  if(filterUid)stok=stok.filter(s=>s.zimmetUid===filterUid||s.uid===filterUid);
  const cont=_gi('ik-zimmet-list');if(!cont)return;
  if(!stok.length){
    cont.innerHTML=`<div style="padding:28px;text-align:center;color:var(--t2);font-size:13px">
      <div style="font-size:28px;margin-bottom:8px">🔑</div>Zimmet kaydı bulunamadı.
      <div style="margin-top:12px"><button class="btn btnp" onclick="openStokModal('giris')">+ Zimmet Ver</button></div>
    </div>`;return;
  }
  const TUR={zimmet:'🔑 Zimmet',demirbaş:'🖥️ Demirbaş'};
  const ST2={giris:{l:'✅ Aktif',c:'bg'},bekle:{l:'⏳ Onay Bekliyor',c:'ba'},cikis:{l:'📤 İade',c:'ba'},demirbaş:{l:'🖥️ Demirbaş',c:'bp'}};

  const frag=document.createDocumentFragment();
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr>
    <th>Tür</th><th>Cihaz / Ürün</th><th>IMEI / Kod</th><th>Zimmetli Personel</th>
    <th>Teslim Tarihi</th><th>İade Tarihi</th><th>Fotoğraf</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  stok.forEach(s=>{
    const u=users.find(x=>x.id===(s.zimmetUid||s.uid))||{name:'?'};
    const turIcon=TUR[s.tür]||'📦';
    const st2=ST2[s.status]||ST2.bekle;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span style="font-size:14px">${turIcon}</span></td>
      <td>
        <div style="font-weight:500;font-size:13px">${s.name}</div>
        ${s.note?`<div style="font-size:10px;color:var(--t2)">${s.note}</div>`:''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${s.imei||s.kod||'—'}</td>
      <td>
        <div style="font-weight:500;font-size:13px">${u.name}</div>
        ${s.bilgiNotu?`<div style="font-size:10px;color:var(--t2)">${s.bilgiNotu.slice(0,30)}</div>`:''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${s.zimmetDate||s.date||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t3)">${s.iadeDate||'—'}</td>
      <td>
        ${s.img?`<a href="${s.img.data}" target="_blank"><img src="${s.img.data}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--b)"></a>`
               :'<span style="color:var(--t3);font-size:11px">—</span>'}
      </td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btns" onclick="openStokModal('giris',${s.id})">✏️</button>
          ${_isAdmin()?`<button class="btn btns btnd" onclick="delStok(${s.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — İZİN YÖNETİMİ
// ════════════════════════════════════════════════════════════════

function calcIzinGun(){
  const start=_gi('izin-start')?.value;
  const end=_gi('izin-end')?.value;
  if(!start||!end)return;
  let d1=new Date(start),d2=new Date(end);
  if(d2<d1){window.toast?.('Bitiş tarihi başlangıçtan önce olamaz','err');if(_gi('izin-end'))_gi('izin-end').value='';return;}
  let isGun=0;const cur=new Date(d1);
  while(cur<=d2){const day=cur.getDay();if(day!==0&&day!==6)isGun++;cur.setDate(cur.getDate()+1);}
  if(_gi('izin-days'))_gi('izin-days').value=isGun;
  const type=_gi('izin-type-inp')?.value||'yillik';
  const ti=IZIN_TYPES[type];
  const minEl=_gi('izin-min-warn');
  if(ti&&minEl){
    if(ti.min>0&&isGun<ti.min)
      minEl.innerHTML=`<div style="background:var(--rdb);color:var(--rdt);border-radius:var(--rs);padding:7px 12px;font-size:11px;margin-top:6px">⚠️ Min ${ti.min} ${ti.minUnit}. Girilen: ${isGun}. <span style="font-size:10px;opacity:.8">${ti.legal}</span></div>`;
    else if(ti.max<999&&isGun>ti.max)
      minEl.innerHTML=`<div style="background:var(--rdb);color:var(--rdt);border-radius:var(--rs);padding:7px 12px;font-size:11px;margin-top:6px">⚠️ Maks ${ti.max} ${ti.minUnit} aşıldı.</div>`;
    else
      minEl.innerHTML=`<div style="background:var(--grb);color:var(--grt);border-radius:var(--rs);padding:7px 12px;font-size:11px;margin-top:6px">✅ Geçerli: ${isGun} iş günü.</div>`;
  }
  updateIzinDilekce();
}

function updateIzinDilekce(){
  const type=_gi('izin-type-inp')?.value||'yillik';
  const ti=IZIN_TYPES[type];
  const yiEl=_gi('izin-yasal-info');const ytEl=_gi('izin-yasal-text');
  const docReq=_gi('izin-doc-required');const docOpt=_gi('izin-doc-opt');
  if(ti&&yiEl){
    yiEl.style.display='block';
    if(ytEl)ytEl.textContent=`${ti.legal}`;
    if(docReq)docReq.style.display=ti.requireDoc?'inline':'none';
    if(docOpt)docOpt.style.display=ti.requireDoc?'none':'inline';
  }
  const start=_gi('izin-start')?.value||'';const end=_gi('izin-end')?.value||'';
  const days=_gi('izin-days')?.value||'';
  const uid=parseInt(_gi('izin-user-inp')?.value||_CU()?.id);
  const users=loadUsers();const u=users.find(x=>x.id===uid)||{name:_CU()?.name||'...'};
  const prev=_gi('izin-dilekce-preview');const text=_gi('izin-dilekce-text');
  if(!start||!days){if(prev)prev.style.display='none';return;}
  if(prev)prev.style.display='block';
  const dilekce=`Sayın Yetkililer,\n\n${u.name} tarafından sunulan bu dilekçede; ${start} ile ${end} tarihleri arasında toplam ${days} iş günü ${ti?.l||'izin'} kullanmak istediğimi bildiririm.\n\nGereğini saygılarımla arz ederim.\n\n${new Date().toLocaleDateString('tr-TR')} — ${u.name}`;
  if(text)text.textContent=dilekce;
}

function printIzinDilekce(){
  updateIzinDilekce();
  const text=_gi('izin-dilekce-text')?.textContent||'';
  if(!text){window.toast?.('Önce tarih ve tür seçin','err');return;}
  const type=_gi('izin-type-inp')?.value||'yillik';
  const ti=IZIN_TYPES[type]||IZIN_TYPES.diger;
  const win=window.open('','_blank','width=600,height=700');
  if(!win){window.toast?.('Popup engellendi','err');return;}
  win.document.write(`<!DOCTYPE html><html><head><title>İzin Dilekçesi</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:560px;margin:0 auto;font-size:13px;line-height:1.7}h2{text-align:center;font-size:16px}.body{white-space:pre-wrap;margin-top:20px}.sign{margin-top:60px;display:flex;justify-content:flex-end}.sign div{text-align:center;width:200px;border-top:1px solid #333;padding-top:8px;font-size:11px}</style></head><body><h2>İzin Dilekçesi — ${ti.l}</h2><div class="body">${text}</div><div class="sign"><div>İmza<br><br></div></div><script>window.print();<\/script></body></html>`);
}

function openIzinModal(id){
  const users=loadUsers();
  const sel=_gi('izin-user-inp');
  if(sel){
    if(_isAdmin()){sel.innerHTML=users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');sel.disabled=false;}
    else{sel.innerHTML=`<option value="${_CU()?.id}">${_CU()?.name||'Ben'}</option>`;sel.disabled=true;}
  }
  if(id){
    const e=loadIzin().find(x=>x.id===id);if(!e)return;
    if(sel){sel.value=String(e.uid);sel.disabled=!_isAdmin();}
    if(_gi('izin-type-inp'))_gi('izin-type-inp').value=e.type;
    if(_gi('izin-start'))   _gi('izin-start').value  =e.start;
    if(_gi('izin-end'))     _gi('izin-end').value    =e.end;
    if(_gi('izin-days'))    _gi('izin-days').value   =e.days;
    if(_gi('izin-reason'))  _gi('izin-reason').value =e.reason||'';
    if(_gi('izin-eid'))     _gi('izin-eid').value    =id;
    _sti('mo-izin-t','✏️ İzin Düzenle');
  }else{
    if(_gi('izin-type-inp'))_gi('izin-type-inp').value='yillik';
    ['izin-start','izin-end','izin-reason','izin-days'].forEach(i=>{const el=_gi(i);if(el)el.value='';});
    if(_gi('izin-eid'))     _gi('izin-eid').value='';
    if(_gi('izin-min-warn'))_gi('izin-min-warn').innerHTML='';
    _sti('mo-izin-t','+ İzin Talebi');
  }
  const prev=_gi('izin-dilekce-preview');if(prev)prev.style.display='none';
  updateIzinDilekce();
  window.openMo?.('mo-izin');
}

function saveIzin(){
  const cu=_CU();if(!cu){window.toast?.('Oturum bulunamadı.','err');return;}
  const selEl=_gi('izin-user-inp');
  const uid=selEl?parseInt(selEl.value||cu.id):cu.id;
  if(!uid){window.toast?.('Personel seçiniz','err');return;}
  const type=_gi('izin-type-inp')?.value||'yillik';
  const start=_gi('izin-start')?.value||'';
  const end=_gi('izin-end')?.value||'';
  if(!start||!end){window.toast?.('Başlangıç ve bitiş tarihleri zorunludur.','err');return;}
  let days=parseInt(_gi('izin-days')?.value||'0')||0;
  if(!days){
    let d1=new Date(start),d2=new Date(end);const cur=new Date(d1);
    while(cur<=d2){const day=cur.getDay();if(day!==0&&day!==6)days++;cur.setDate(cur.getDate()+1);}
  }
  if(!days||days<1){window.toast?.('İzin süresi hesaplanamadı.','err');return;}
  const ti=IZIN_TYPES[type];
  if(ti){
    if(ti.min>0&&days<ti.min){window.toast?.(`Min ${ti.min} ${ti.minUnit} gereklidir.`,'err');return;}
    if(ti.max<999&&days>ti.max){window.toast?.(`Maks ${ti.max} ${ti.minUnit} aşıldı.`,'err');return;}
    const fi2=_gi('izin-file');
    const editId=parseInt(_gi('izin-eid')?.value||'0');
    if(ti.requireDoc&&!editId&&(!fi2?.files?.length)){window.toast?.(`${ti.l} için belge yüklemesi zorunludur.`,'err');return;}
  }
  const d=loadIzin();
  const editId=parseInt(_gi('izin-eid')?.value||'0');
  const entry={
    uid,type,start,end,days,
    reason:_gi('izin-reason')?.value||'',
    status:_isAdmin()?'approved':'pending',
    reqBy:cu.id,reqByName:cu.name,ts:_nowTs(),
  };
  const fi=_gi('izin-file');
  const doSave=fd=>{
    if(fd)entry.file=fd;
    if(editId){const existing=d.find(x=>x.id===editId);if(existing)Object.assign(existing,entry);}
    else d.push({id:generateNumericId(),...entry});
    storeIzin(d);
    window.closeMo?.('mo-izin');
    renderIzin();
    const users=loadUsers();
    const targetUser=users.find(x=>x.id===uid)||{name:'?'};
    const tiLabel=(IZIN_TYPES[type]||IZIN_TYPES.diger).l;
    if(!_isAdmin())window.addNotif?.('📅',`İzin talebi bekliyor: ${targetUser.name} — ${days} gün ${tiLabel}`,'warn','izin');
    const nb=_gi('nb-izin-b');
    if(nb){const n=loadIzin().filter(x=>x.status==='pending').length;nb.textContent=n;nb.style.display=n>0?'inline':'none';}
    window.logActivity?.('view',`${targetUser.name} — ${days} gün ${tiLabel} ${_isAdmin()?'eklendi':'onaya gönderildi'}`);
    window.toast?.(_isAdmin()?'İzin kaydedildi ✓':'İzin talebiniz gönderildi ✓','ok');
  };
  if(fi?.files?.[0]){const r=new FileReader();r.onload=ev=>doSave({name:fi.files[0].name,data:ev.target.result});r.readAsDataURL(fi.files[0]);}
  else doSave(null);
}

function approveIzin(id){
  if(!_isAdmin())return;
  const d=loadIzin();const iz=d.find(x=>x.id===id);if(!iz)return;
  iz.status='approved';iz.approvedBy=_CU()?.id;iz.approveTs=_nowTs();
  storeIzin(d);renderIzin();
  const users=loadUsers();const u=users.find(x=>x.id===iz.uid)||{name:'?'};
  const ti=IZIN_TYPES[iz.type]||IZIN_TYPES.diger;
  window.addNotif?.('✅',`İzin onaylandı: ${u.name} — ${iz.days} gün ${ti.l}`,'ok','izin');
  window.toast?.('İzin onaylandı ✓','ok');
  window.logActivity?.('view',`${u.name} izni onaylandı (${iz.days} gün)`);
}

function rejectIzin(id){
  if(!_isAdmin())return;
  const d=loadIzin();const iz=d.find(x=>x.id===id);if(!iz)return;
  const reason=prompt('Red sebebi (opsiyonel):');
  iz.status='rejected';iz.rejectReason=reason||'';iz.rejectTs=_nowTs();
  storeIzin(d);renderIzin();window.toast?.('Ret kaydedildi','ok');
}

function delIzin(id){
  if(!_isAdmin())return;
  const d=loadIzin();
  storeIzin(d.filter(x=>x.id!==id));
  renderIzin();
}

function renderIzin(){
  const d=loadIzin();const users=loadUsers();
  const uf=parseInt(_gi('izin-user-f')?.value||'0');
  const tf=_gi('izin-type-f')?.value||'';
  const sf=_gi('izin-status-f')?.value||'';
  const uSel=_gi('izin-user-f');
  if(uSel&&uSel.options.length<=1)
    uSel.innerHTML='<option value="0">Tüm Personel</option>'+users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  const thisYear=new Date().getFullYear().toString();
  let myD=_isAdmin()?d:d.filter(x=>x.uid===_CU()?.id);
  let fl=myD;
  if(uf)fl=fl.filter(x=>x.uid===uf);
  if(tf)fl=fl.filter(x=>x.type===tf);
  if(sf)fl=fl.filter(x=>x.status===sf);
  const usedYillik=myD.filter(x=>x.status==='approved'&&x.start?.startsWith(thisYear)&&x.type==='yillik').reduce((a,x)=>a+x.days,0);
  const currentUid=uf||_CU()?.id;
  const currentUser=users.find(x=>x.id===currentUid);
  const kidemYil=currentUser?.kidem||(currentUser?.start?Math.floor((Date.now()-new Date(currentUser.start))/31536000000):1);
  const yillikHak=getYillikIzinHak(Math.max(1,kidemYil));
  _sti('izin-total',    myD.length);
  _sti('izin-approved', myD.filter(x=>x.status==='approved').length);
  _sti('izin-pending',  myD.filter(x=>x.status==='pending').length);
  _sti('izin-used',     usedYillik);
  _sti('izin-remaining',Math.max(0,yillikHak-usedYillik));
  const nb=_gi('nb-izin-b');
  if(nb){const n=d.filter(x=>x.status==='pending').length;nb.textContent=n;nb.style.display=n>0?'inline':'none';}

  // Personel özet kartları (admin)
  const cards=_gi('izin-summary-cards');
  if(cards&&_isAdmin()){
    const personelStats={};
    d.filter(x=>x.status==='approved'&&x.start?.startsWith(thisYear)).forEach(x=>{
      if(!personelStats[x.uid])personelStats[x.uid]={yillik:0,mazeret:0,hastalik:0,mazeretsiz:0,toplam:0};
      personelStats[x.uid][x.type]=(personelStats[x.uid][x.type]||0)+x.days;
      personelStats[x.uid].toplam+=x.days;
    });
    cards.innerHTML=users.map(u=>{
      const s=personelStats[u.id]||{yillik:0,mazeret:0,hastalik:0,mazeretsiz:0,toplam:0};
      const kalan=Math.max(0,14-s.yillik);
      return`<div style="background:var(--sf);border:1px solid var(--b);border-radius:var(--r);padding:12px 14px">
        <div style="font-weight:600;font-size:13px;margin-bottom:8px">${u.name}</div>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--t2)">
          <div class="dr"><span>Yıllık kullanılan</span><span style="font-weight:600;color:var(--ac)">${s.yillik}/14 gün</span></div>
          <div style="height:3px;background:var(--s2);border-radius:99px;margin:2px 0"><div style="height:100%;background:var(--ac);width:${Math.min(100,s.yillik/14*100)}%;border-radius:99px"></div></div>
          ${s.mazeret?`<div class="dr"><span>Mazeret</span><span>${s.mazeret} gün</span></div>`:''}
          ${s.hastalik?`<div class="dr"><span>Hastalık</span><span>${s.hastalik} gün</span></div>`:''}
          ${s.mazeretsiz?`<div class="dr" style="color:var(--rd)"><span>Mazeretsiz</span><span style="font-weight:700">${s.mazeretsiz} gün</span></div>`:''}
        </div>
      </div>`;
    }).join('');
  }else if(cards){cards.innerHTML='';}

  const list=_gi('izin-list');if(!list)return;
  if(!fl.length){
    list.innerHTML=`<div style="padding:32px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:8px">📅</div>İzin kaydı bulunamadı.</div>`;
    return;
  }
  const ST2={pending:{l:'⏳ Onay Bekliyor',c:'ba'},approved:{l:'✅ Onaylı',c:'bg'},rejected:{l:'❌ Reddedildi',c:'br'}};

  // DocumentFragment
  const frag=document.createDocumentFragment();
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr>
    <th>Personel</th><th>Tür</th><th>Başlangıç</th><th>Bitiş</th>
    <th>Süre</th><th>Gerekçe</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody=document.createElement('tbody');
  fl.forEach(iz=>{
    const u=users.find(x=>x.id===iz.uid)||{name:'?'};
    const st2=ST2[iz.status]||ST2.pending;
    const ti=IZIN_TYPES[iz.type]||IZIN_TYPES.diger;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:500;font-size:13px">${u.name}</td>
      <td>${ti.l}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${iz.start||'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${iz.end||'—'}</td>
      <td style="font-weight:600;text-align:center">${iz.days} gün</td>
      <td style="font-size:11px;color:var(--t2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${iz.reason||''}">${iz.reason||'—'}</td>
      <td>
        <span class="badge ${st2.c}">${st2.l}</span>
        ${iz.rejectReason?`<div style="font-size:10px;color:var(--rdt)">${iz.rejectReason}</div>`:''}
      </td>
      <td>
        <div style="display:flex;gap:4px">
          ${iz.file?`<a href="${iz.file.data}" download="${iz.file.name}" class="btn btns" style="text-decoration:none" title="${iz.file.name}">⬇</a>`:''}
          ${_isAdmin()&&iz.status==='pending'?`<button class="btn btns btng" onclick="approveIzin(${iz.id})" style="font-size:11px">✓ Onayla</button>`:''}
          ${_isAdmin()&&iz.status==='pending'?`<button class="btn btns btnd" onclick="rejectIzin(${iz.id})" style="font-size:11px">✕ Ret</button>`:''}
          <button class="btn btns" onclick="openIzinModal(${iz.id})">✏️</button>
          ${_isAdmin()?`<button class="btn btns btnd" onclick="delIzin(${iz.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  list.replaceChildren(frag);
}

function exportIzinXlsx(){
  if(typeof XLSX==='undefined')return;
  const users=loadUsers();
  const rows=loadIzin().map(iz=>{
    const u=users.find(x=>x.id===iz.uid)||{name:'?'};
    const ti=IZIN_TYPES[iz.type]||IZIN_TYPES.diger;
    return{Personel:u.name,'İzin Türü':ti.l,'Başlangıç':iz.start,'Bitiş':iz.end,'Süre (gün)':iz.days,'Gerekçe':iz.reason||'','Durum':{pending:'Bekliyor',approved:'Onaylı',rejected:'Reddedildi'}[iz.status]||iz.status};
  });
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Izin');
  XLSX.writeFile(wb,`Izin_${_nowTs().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — PUANTAJ
// ════════════════════════════════════════════════════════════════

function tm(t){if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+(m||0);}
function calcPuan(r){
  if(!r.aI||!r.aO)return{late:0,ot:0,ut:0,total:0,abs:true};
  const pI=tm(r.pI),pO=tm(r.pO),aI=tm(r.aI),aO=tm(r.aO);
  const late=aI>pI+10?aI-pI:0,dur=aO<aI?(aO+1440)-aI:aO-aI,work=dur-60;
  const planned=(pO<pI?(pO+1440)-pI:pO-pI)-60;
  return{late,ot:Math.max(0,work-planned),ut:Math.max(0,planned-work),total:Math.max(0,work),abs:false};
}
function fmMin(m){return m?`${Math.floor(m/60)}s${m%60}dk`:'-';}
function getDayName(dateStr){try{const d=new Date(dateStr);return['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][d.getDay()];}catch(e){return '';}}
function hasPuantajYetki(){return !_isAdmin()&&(_CU()?.puantajYetki?.length>0);}
function getPuantajSorumluIds(){return _CU()?.puantajYetki||[];}

function visPuan(){
  const d=loadPuan();if(!d)return[];
  if(_isAdmin())return d;
  if(hasPuantajYetki()){const allowed=[_CU().id,...getPuantajSorumluIds()];return d.filter(r=>allowed.includes(r.uid));}
  return d.filter(r=>r.uid===_CU()?.id);
}

function updatePuanBadge(){
  const allPuan=visPuan();
  const p=allPuan.filter(r=>!r.ok&&r.aI).length;
  const b=_gi('nb-pt-b');if(b){b.textContent=p;b.style.display=p>0?'inline':'none';}
  _sti('sv-p',p);
  _sti('pp-tot',allPuan.length);
  _sti('pp-pd',p);
  _sti('pp-ok',allPuan.filter(r=>r.ok).length);
  _sti('pp-ab',allPuan.filter(r=>!r.aI).length);
}

function renderPuantaj(){
  const cu=_CU();if(!cu)return;
  const users=loadUsers();
  const fu=_gi('pf-puser');
  if(fu){
    if(_isAdmin()){fu.innerHTML='<option value="">Tüm Personel</option>'+users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');fu.style.display='inline-block';}
    else if(hasPuantajYetki()){const allowed=[cu,...getPuantajSorumluIds().map(uid=>users.find(x=>x.id===uid)).filter(Boolean)];fu.innerHTML='<option value="">Sorumlu Personelim</option>'+allowed.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');fu.style.display='inline-block';}
    else fu.style.display='none';
  }
  const mu=_gi('mp-user');
  if(mu){
    if(_isAdmin())mu.innerHTML=users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
    else if(hasPuantajYetki()){const allowed=[cu,...getPuantajSorumluIds().map(uid=>users.find(x=>x.id===uid)).filter(Boolean)];mu.innerHTML=allowed.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');}
    else mu.innerHTML=`<option value="${cu.id}">${escapeHtml(cu.name)}</option>`;
    mu.disabled=(!_isAdmin()&&!hasPuantajYetki());
  }
  const mn=_gi('pf-month');
  if(mn&&!mn.value){const n=new Date();mn.value=`${n.getFullYear()}-${_p2(n.getMonth()+1)}`;}
  updatePuanBadge();
  const fuid=fu?.value||'';const fmon=mn?.value||'';
  const sot=_gi('p-ot')?.checked??true;const sut=_gi('p-ut')?.checked??true;
  let data=visPuan();
  if(fuid)data=data.filter(r=>String(r.uid)===fuid);
  if(fmon)data=data.filter(r=>r.date.startsWith(fmon));
  data=data.slice().sort((a,b)=>b.date.localeCompare(a.date));
  _sti('pp-tot',data.length);
  _sti('pp-pd',data.filter(r=>!r.ok&&r.aI).length);
  _sti('pp-ok',data.filter(r=>r.ok).length);
  _sti('pp-ab',data.filter(r=>!r.aI).length);
  const hd=_gi('pt-head');
  if(hd)hd.innerHTML=`
    <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;white-space:nowrap">Personel</th>
    <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Tarih</th>
    <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Plan / Gerçek</th>
    <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Gecikme</th>
    ${sot?`<th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Fazla</th>`:''}
    ${sut?`<th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Eksik</th>`:''}
    <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Net Çalışma</th>
    <th style="padding:11px 14px;text-align:right;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</th>`;
  const bd=_gi('pt-body');if(!bd)return;
  if(!data.length){
    bd.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">📋</div><div style="font-size:14px;font-weight:500">Bu dönemde kayıt bulunamadı</div></td></tr>`;
    renderPuantajSummary(data,users);return;
  }
  const avColors=['#6366F1','#8B5CF6','#EC4899','#0EA5E9','#10B981','#F59E0B','#EF4444','#14B8A6'];
  // DocumentFragment
  const frag=document.createDocumentFragment();
  data.forEach((r,rowIdx)=>{
    const u=users.find(x=>x.id===r.uid)||{name:'?',id:0};
    const idx=users.indexOf(u);const s=calcPuan(r);
    const avBg=avColors[idx%avColors.length];
    const isAbs=s.abs;const isLate=s.late>0;
    const ioHtml=isAbs
      ?`<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,.1);color:#DC2626;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700">🔴 Devamsız</div>`
      :`<div style="font-size:12px"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="font-size:9px;color:var(--t3);font-weight:600">PLAN</span><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2)">${r.pI||'—'}→${r.pO||'—'}</span></div><div style="display:flex;align-items:center;gap:4px"><span style="font-size:9px;color:var(--t3);font-weight:600">GERÇEK</span><span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;color:${isLate?'#DC2626':'var(--t)'}">${r.aI||'—'}→${r.aO||'—'}</span></div></div>`;
    const apHtml=_isAdmin()
      ?(r.ok?`<button onclick="puanToggle(${r.id})" style="display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,.1);color:#16A34A;border:1.5px solid rgba(34,197,94,.3);padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">✓ Onaylı</button>`
              :`<button onclick="puanToggle(${r.id})" style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,.1);color:#D97706;border:1.5px solid rgba(245,158,11,.3);padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">🔐 Onayla</button>`)
      :(r.ok?`<span style="font-size:11px;color:#16A34A;font-weight:700">✓ Onaylı</span>`:`<span style="font-size:11px;color:var(--t3)">Bekliyor</span>`);
    const tr=document.createElement('tr');
    tr.style.cssText=`border-bottom:1px solid var(--b);background:${rowIdx%2===0?'var(--sf)':'var(--s2)'};transition:background .1s`;
    tr.addEventListener('mouseenter',()=>tr.style.background='var(--al)');
    tr.addEventListener('mouseleave',()=>tr.style.background=rowIdx%2===0?'var(--sf)':'var(--s2)');
    tr.innerHTML=`
      <td style="padding:10px 14px"><div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:8px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${_initials(u.name)}</div>
        <div><div style="font-size:12px;font-weight:600;color:var(--t);white-space:nowrap">${u.name}</div>
        ${_isAdmin()?`<div style="display:flex;gap:4px;margin-top:3px"><button onclick="openPuanModal(${r.id})" style="font-size:10px;color:var(--ac);background:none;border:none;cursor:pointer;padding:0;font-family:inherit">✏️ Düzenle</button><span style="color:var(--t3)">·</span><button onclick="delPuan(${r.id})" style="font-size:10px;color:#EF4444;background:none;border:none;cursor:pointer;padding:0;font-family:inherit">🗑</button></div>`:''}</div>
      </div></td>
      <td style="padding:10px 14px"><div style="font-size:12px;font-weight:500;color:var(--t)">${r.date}</div><div style="font-size:10px;color:var(--t3);margin-top:1px">${getDayName(r.date)}</div></td>
      <td style="padding:10px 14px">${ioHtml}</td>
      <td style="padding:10px 14px;text-align:center">${s.late>0?`<span style="background:rgba(239,68,68,.1);color:#DC2626;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap">+${s.late}dk</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>
      ${sot?`<td style="padding:10px 14px;text-align:center">${s.ot>0?`<span style="background:rgba(99,102,241,.1);color:#6366F1;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap">+${s.ot}dk</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>`:''}
      ${sut?`<td style="padding:10px 14px;text-align:center">${s.ut>0?`<span style="background:rgba(245,158,11,.1);color:#D97706;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap">-${s.ut}dk</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>`:''}
      <td style="padding:10px 14px;text-align:center">${isAbs?`<span style="color:#DC2626;font-size:12px;font-weight:600">—</span>`:`<span style="font-size:12px;font-weight:700;color:var(--t);font-family:'DM Mono',monospace">${fmMin(s.total)}</span>`}</td>
      <td style="padding:10px 14px;text-align:right">${apHtml}</td>`;
    frag.appendChild(tr);
  });
  bd.replaceChildren(frag);
  renderPuantajSummary(data,users);
}

function puanToggle(id){
  const d=loadPuan();const r=d.find(x=>x.id===id);if(!r||!_isAdmin())return;
  r.ok=!r.ok;r.approvedBy=_CU()?.id;r.approveTs=_nowTs();
  savePuan(d);renderPuantaj();
  window.toast?.(r.ok?'Onaylandı ✓':'Onay geri alındı','ok');
}

function delPuan(id){
  if(!_isAdmin())return;
  const d=loadPuan();const r=d.find(x=>x.id===id);if(!r)return;
  window.confirmModal('Bu puantaj kaydını silmek istediğinizden emin misiniz?', {
    title: 'Puantaj Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      savePuan(d.filter(x=>x.id!==id));renderPuantaj();window.toast?.('Kayıt silindi','ok');
    }
  });
}

function renderPuantajSummary(data,users){
  const summEl=_gi('puan-summary-cont');if(!summEl)return;
  if(!data.length){summEl.innerHTML='';return;}
  const byUser={};
  data.forEach(r=>{
    if(!byUser[r.uid])byUser[r.uid]={uid:r.uid,total:0,late:0,ot:0,ut:0,abs:0,ok:0,days:0};
    const s=calcPuan(r);
    byUser[r.uid].days++;byUser[r.uid].total+=s.total;byUser[r.uid].late+=s.late;byUser[r.uid].ot+=s.ot;byUser[r.uid].ut+=s.ut;
    if(s.abs)byUser[r.uid].abs++;if(r.ok)byUser[r.uid].ok++;
  });
  const rows=Object.values(byUser).sort((a,b)=>b.days-a.days);
  const avColors=['#6366F1','#8B5CF6','#EC4899','#0EA5E9','#10B981','#F59E0B'];
  const month=_gi('pf-month')?.value||'Seçili Dönem';

  const frag=document.createDocumentFragment();
  const wrap=document.createElement('div');
  wrap.style.cssText='border:1.5px solid var(--b);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)';
  wrap.innerHTML=`<div style="padding:14px 18px;background:var(--s2);border-bottom:1.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">
    <div><div style="font-size:14px;font-weight:700;color:var(--t)">📊 Personel Özet</div><div style="font-size:11px;color:var(--t3);margin-top:1px">${month} · ${rows.length} personel</div></div>
    <button class="btn btns" onclick="puanExportSummary()" style="font-size:11px">⬇ Özet Excel</button>
  </div>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--s2)">
      <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Personel</th>
      <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Gün</th>
      <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Onaylı</th>
      <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Devamsız</th>
      <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Toplam Gecikme</th>
      <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Fazla Mesai</th>
      <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Net Çalışma</th>
    </tr></thead>
    <tbody id="puan-summary-tbody"></tbody>
  </table>`;
  frag.appendChild(wrap);
  summEl.replaceChildren(frag);
  const stbody=_gi('puan-summary-tbody');if(!stbody)return;
  const sfrag=document.createDocumentFragment();
  rows.forEach((r,i)=>{
    const u=users.find(x=>x.id===r.uid)||{name:'?'};
    const avBg=avColors[i%avColors.length];
    const attendRate=r.days>0?Math.round((r.days-r.abs)/r.days*100):0;
    const tr=document.createElement('tr');
    tr.style.cssText=`border-top:1px solid var(--b);background:${i%2===0?'var(--sf)':'var(--s2)'}`;
    tr.addEventListener('mouseenter',()=>tr.style.background='var(--al)');
    tr.addEventListener('mouseleave',()=>tr.style.background=i%2===0?'var(--sf)':'var(--s2)');
    tr.innerHTML=`<td style="padding:11px 14px"><div style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;border-radius:9px;background:${avBg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${_initials(u.name)}</div><div><div style="font-size:13px;font-weight:600;color:var(--t)">${escapeHtml(u.name)}</div><div style="display:flex;align-items:center;gap:4px;margin-top:2px"><div style="height:4px;width:48px;background:var(--b);border-radius:2px;overflow:hidden"><div style="height:100%;background:${attendRate>=90?'#22C55E':attendRate>=70?'#F59E0B':'#EF4444'};width:${attendRate}%"></div></div><span style="font-size:10px;color:var(--t3)">%${attendRate} devam</span></div></div></div></td>
    <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:700;color:var(--t)">${r.days}</td>
    <td style="padding:11px 14px;text-align:center"><span style="font-size:12px;font-weight:700;color:#16A34A">${r.ok}</span><span style="font-size:10px;color:var(--t3)">/${r.days}</span></td>
    <td style="padding:11px 14px;text-align:center">${r.abs>0?`<span style="background:rgba(239,68,68,.1);color:#DC2626;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">${r.abs}</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>
    <td style="padding:11px 14px;text-align:center">${r.late>0?`<span style="background:rgba(239,68,68,.1);color:#DC2626;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">+${r.late}dk</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>
    <td style="padding:11px 14px;text-align:center">${r.ot>0?`<span style="background:rgba(99,102,241,.1);color:#6366F1;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">+${r.ot}dk</span>`:`<span style="color:var(--t3);font-size:12px">—</span>`}</td>
    <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--t)">${fmMin(r.total)}</td>`;
    sfrag.appendChild(tr);
  });
  stbody.replaceChildren(sfrag);
}

function puanExportSummary(){
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const users=loadUsers();const data=visPuan();
  const byUser={};
  data.forEach(r=>{
    if(!byUser[r.uid])byUser[r.uid]={uid:r.uid,total:0,late:0,ot:0,abs:0,ok:0,days:0};
    const s=calcPuan(r);byUser[r.uid].days++;byUser[r.uid].total+=s.total;byUser[r.uid].late+=s.late;byUser[r.uid].ot+=s.ot;
    if(s.abs)byUser[r.uid].abs++;if(r.ok)byUser[r.uid].ok++;
  });
  const rows=Object.values(byUser).map(r=>{const u=users.find(x=>x.id===r.uid)||{name:'?'};return{Personel:u.name,'Kayıt Sayısı':r.days,'Onaylı':r.ok,'Devamsız':r.abs,'Toplam Gecikme (dk)':r.late,'Fazla Mesai (dk)':r.ot,'Net Çalışma':fmMin(r.total)};});
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Puantaj Özet');
  XLSX.writeFile(wb,`Puantaj_Ozet_${_nowTs().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

function openPuanModal(id){
  const users=loadUsers();
  const mu=_gi('mp-user');if(mu)mu.innerHTML=users.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  if(id){
    const r=loadPuan().find(x=>x.id===id);if(!r)return;
    if(mu)mu.value=r.uid;
    if(_gi('mp-date'))  _gi('mp-date').value =r.date;
    if(_gi('mp-in'))    _gi('mp-in').value   =r.aI||'';
    if(_gi('mp-out'))   _gi('mp-out').value  =r.aO||'';
    if(_gi('mp-pin'))   _gi('mp-pin').value  =r.pI||'09:00';
    if(_gi('mp-pout'))  _gi('mp-pout').value =r.pO||'18:00';
    if(_gi('mp-eid'))   _gi('mp-eid').value  =id;
  }else{
    const n=new Date();
    if(_gi('mp-date'))  _gi('mp-date').valueAsDate=n;
    if(_gi('mp-in'))    _gi('mp-in').value  ='';
    if(_gi('mp-out'))   _gi('mp-out').value ='';
    if(_gi('mp-pin'))   _gi('mp-pin').value ='09:00';
    if(_gi('mp-pout'))  _gi('mp-pout').value='18:00';
    if(_gi('mp-eid'))   _gi('mp-eid').value ='';
    if(mu&&_CU())      mu.value=_CU().id;
  }
  window.openMo?.('mo-puan');
}

function savePuanRecord(){
  const uid=parseInt(_gi('mp-user')?.value||'0');
  const date=_gi('mp-date')?.value||'';
  if(!uid||!date){window.toast?.('Personel ve tarih zorunludur','err');return;}
  const d=loadPuan();
  const eid=parseInt(_gi('mp-eid')?.value||'0');
  const entry={uid,date,pI:_gi('mp-pin')?.value||'09:00',pO:_gi('mp-pout')?.value||'18:00',aI:_gi('mp-in')?.value||null,aO:_gi('mp-out')?.value||null,ok:false};
  if(eid){const r=d.find(x=>x.id===eid);if(r)Object.assign(r,entry);}
  else d.push({id:generateNumericId(),...entry});
  savePuan(d);window.closeMo?.('mo-puan');renderPuantaj();window.toast?.('Kaydedildi ✓','ok');
  window.logActivity?.('view',`Puantaj kaydı ${eid?'güncellendi':'eklendi'}`);
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — IK/PUANTAJ/İZİN
// ════════════════════════════════════════════════════════════════

function renderPuantajYetkiKart(){
  const panel=g('panel-settings');if(!panel)return;
  let kart=g('puantaj-yetki-kart');
  if(!kart){
    kart=document.createElement('div');
    kart.id='puantaj-yetki-kart';
    kart.className='card';
    kart.style.maxWidth='560px';
    panel.appendChild(kart);
  }
  const users=loadUsers().filter(u=>u.status==='active');
  kart.innerHTML=`
    <div class="ch">
      <span class="ct">🗓 Puantaj Giriş Yetkileri</span>
      <span style="font-size:11px;color:var(--t2)">Hangi personel, kimlerin saatini girebilir?</span>
    </div>
    <div style="padding:16px 18px">
      <div style="font-size:12px;color:var(--t2);margin-bottom:14px;background:var(--blb);color:var(--blt);padding:8px 12px;border-radius:var(--rs)">
        ℹ️ Sorumlu personel atanan kullanıcılar, sadece atanan kişilerin puantajını girebilir. Kendi puantajlarını her zaman girebilirler.
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${users.filter(u=>u.role!=='admin').map(u=>{
          const sorumluIds=(u.puantajYetki||[]);
          const sorumluNames=sorumluIds.map(id=>{const x=users.find(y=>y.id===id);return x?x.name:null;}).filter(Boolean);
          return`<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--s2);border-radius:var(--rs)">
            <div style="flex:1">
              <div style="font-weight:500;font-size:12px">${u.name}</div>
              <div style="font-size:11px;color:var(--t2)">${u.role} · ${sorumluNames.length?'Sorumlu: '+sorumluNames.join(', '):'Yalnızca kendi puantajı'}</div>
            </div>
            <button class="btn btns" onclick="openPuantajYetkiModal(${u.id})" style="font-size:11px">⚙️ Düzenle</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function openPuantajYetkiModal(uid){
  const users=loadUsers().filter(u=>u.status==='active'&&u.id!==uid);
  const target=loadUsers().find(u=>u.id===uid);if(!target)return;
  const current=target.puantajYetki||[];
  // Dinamik modal
  let mo=g('mo-puantaj-yetki');
  if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='mo-puantaj-yetki';document.body.appendChild(mo);}
  mo.innerHTML=`<div class="modal" style="max-width:440px">
    <div class="mt">🗓 Puantaj Yetkisi — ${target.name}</div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:14px">Bu kullanıcının puantajını girebileceği personeli seçin:</div>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;margin-bottom:16px">
      ${users.map(u=>`<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--s2);border-radius:var(--rs);cursor:pointer">
        <input type="checkbox" value="${u.id}" ${current.includes(u.id)?'checked':''} style="accent-color:var(--ac);width:15px;height:15px">
        <span style="font-size:13px">${u.name}</span>
        <span style="font-size:11px;color:var(--t3);margin-left:auto">${u.role}</span>
      </label>`).join('')}
    </div>
    <div class="mf">
      <button class="btn" onclick="closeMo('mo-puantaj-yetki')">İptal</button>
      <button class="btn btnp" onclick="savePuantajYetki(${uid})">Kaydet</button>
    </div>
  </div>`;
  openMo('mo-puantaj-yetki');
}

function savePuantajYetki(uid){
  const checked=[...document.querySelectorAll('#mo-puantaj-yetki input[type=checkbox]:checked')].map(cb=>parseInt(cb.value));
  const users=loadUsers();
  const u=users.find(x=>x.id===uid);if(!u)return;
  u.puantajYetki=checked;
  saveUsers(users);
  closeMo('mo-puantaj-yetki');
  renderPuantajYetkiKart();
  toast('Puantaj yetkileri güncellendi ✓','ok');
  logActivity('user',`"${u.name}" için puantaj yetkileri güncellendi`);
}

function puanExportPdf(){
  const users=loadUsers();const d=visPuan();
  const win=window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><title>Puantaj Raporu</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px}th{background:#f5f5f5;font-size:10px}h2{font-size:16px;margin-bottom:4px}.ok{color:green}.nd{color:red}</style></head><body><h2>Duay Global LLC — Puantaj Raporu</h2><p>Oluşturulma: ${nowTs()} · ${CU?.name}</p><table><thead><tr><th>Personel</th><th>Tarih</th><th>Plan.Giriş</th><th>Giriş</th><th>Çıkış</th><th>Gecikme</th><th>Net</th><th>Onay</th></tr></thead><tbody>${d.map(r=>{const u=users.find(x=>x.id===r.uid)||{name:'?'};const s=calcPuan(r);return`<tr><td>${u.name}</td><td>${r.date}</td><td>${r.pI}</td><td>${r.aI||'—'}</td><td>${r.aO||'—'}</td><td class="${s.late>0?'nd':''}">${s.late?'+'+s.late+'dk':'—'}</td><td>${s.abs?'Devamsız':fmMin(s.total)}</td><td class="${r.ok?'ok':'nd'}">${r.ok?'✓ Onaylı':'Bekliyor'}</td></tr>`;}).join('')}</tbody></table><script>window.print();<\/script></body></html>`);
}

function openMyPuantajEntry(){
  const mu=g('mp-user');if(mu)mu.value=CU?.id;mu&&(mu.disabled=!isAdmin());
  g('mp-date').valueAsDate=new Date();g('mp-in').value='09:00';g('mp-out').value='';openMo('mo-puan');
}

function openIzinApproval(id){
  const d=loadIzin();const iz=d.find(x=>x.id===id);if(!iz)return;
  const users=loadUsers();const u=users.find(x=>x.id===iz.uid)||{name:'?'};
  const ti=IZIN_TYPES?.[iz.type]||{l:iz.type||'İzin'};
  openApprovalModal('izin',id,'İzin Talebi Onayı',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Personel</span><div style="font-weight:700">${u.name}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">İzin Türü</span><div style="font-weight:700">${ti.l}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Başlangıç</span><div>${iz.start||'—'}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Bitiş / Gün</span><div>${iz.end||'—'} · <strong>${iz.days||'?'} gün</strong></div></div>
      ${iz.note?`<div style="grid-column:1/-1"><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Not</span><div style="color:var(--t2)">${iz.note}</div></div>`:''}
    </div>`
  );
}

function printIzinReport(){
  const users=loadUsers();const d=loadIzin();
  const win=window.open('','_blank','width=900,height=700');
  const rows=d.map(iz=>{const u=users.find(x=>x.id===iz.uid)||{name:'?'};const ti=IZIN_TYPES[iz.type]||IZIN_TYPES.diger;return`<tr><td>${u.name}</td><td>${ti.l}</td><td>${iz.start}</td><td>${iz.end}</td><td>${iz.days}</td><td>${{pending:'Bekliyor',approved:'Onaylı',rejected:'Reddedildi'}[iz.status]||iz.status}</td></tr>`;}).join('');
  win.document.write(`<!DOCTYPE html><html><head><title>İzin Raporu</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px}th{background:#f5f5f5}</style></head><body><h2>İzin Raporu — ${new Date().toLocaleDateString('tr-TR')}</h2><table><thead><tr><th>Personel</th><th>Tür</th><th>Başlangıç</th><th>Bitiş</th><th>Gün</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table><script>window.print();<\/script></body></html>`);
}


const Ik = {
  render:          renderIk,
  openModal:       openIkModal,
  save:            saveIk,
  del:             delIk,
  exportXlsx:      exportIkXlsx,
  renderZimmet:    renderIkZimmet,
  STAGES:          IK_STAGES,
  DEPT:            IK_DEPT,
  ST:              IK_ST,
  // İzin
  renderIzin,    openIzinModal, saveIzin,
  approveIzin,   rejectIzin,   delIzin,
  calcIzinGun,   updateIzinDilekce, printIzinDilekce,
  exportIzinXlsx,
  IZIN_TYPES,    getYillikIzinHak,
  // Puantaj
  renderPuantaj, openPuanModal, savePuanRecord,
  puanToggle,    delPuan,      updatePuanBadge,
  visPuan,       calcPuan,     renderPuantajSummary, puanExportSummary,
  getDayName,    fmMin,
};

if(typeof module!=='undefined'&&module.exports){module.exports=Ik;}
else{
  window.Ik=Ik;
  // V18 eklenen fonksiyonlar
  window.renderPuantajYetkiKart = renderPuantajYetkiKart;
  window.openPuantajYetkiModal  = openPuantajYetkiModal;
  window.savePuantajYetki       = savePuantajYetki;
  window.puanExportPdf          = puanExportPdf;
  window.openMyPuantajEntry     = openMyPuantajEntry;
  window.openIzinApproval       = openIzinApproval;
  window.printIzinReport        = printIzinReport;
  // Geriye uyumluluk
  const fns=['renderIk','openIkModal','saveIk','delIk','exportIkXlsx','renderIkZimmet',
    'renderIzin','openIzinModal','saveIzin','approveIzin','rejectIzin','delIzin',
    'calcIzinGun','updateIzinDilekce','printIzinDilekce','exportIzinXlsx',
    'renderPuantaj','openPuanModal','savePuanRecord','puanToggle','delPuan',
    'updatePuanBadge','visPuan','calcPuan','renderPuantajSummary','puanExportSummary',
    'getDayName','fmMin','hasPuantajYetki','getPuantajSorumluIds',
  ];
  fns.forEach(n=>{if(Ik[n])window[n]=Ik[n];});
  window.IK_STAGES=IK_STAGES;window.IK_ST=IK_ST;window.IK_DEPT=IK_DEPT;
  window.IZIN_TYPES=IZIN_TYPES;window.getYillikIzinHak=getYillikIzinHak;
}

// ── Error boundary wrappers ─────────────────────────────────────
// error-boundary-wrap

(function() {
  const _orig_renderIk = window.renderIk || (typeof renderIk === 'function' ? renderIk : null);
  if (_orig_renderIk) {
    window.renderIk = function(...args) {
      try { return _orig_renderIk(...args); }
      catch(err) {
        console.error('[renderIk]', err);
        window.toast?.('Panel yüklenemedi: renderIk', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderIzin = window.renderIzin || (typeof renderIzin === 'function' ? renderIzin : null);
  if (_orig_renderIzin) {
    window.renderIzin = function(...args) {
      try { return _orig_renderIzin(...args); }
      catch(err) {
        console.error('[renderIzin]', err);
        window.toast?.('Panel yüklenemedi: renderIzin', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderPuantaj = window.renderPuantaj || (typeof renderPuantaj === 'function' ? renderPuantaj : null);
  if (_orig_renderPuantaj) {
    window.renderPuantaj = function(...args) {
      try { return _orig_renderPuantaj(...args); }
      catch(err) {
        console.error('[renderPuantaj]', err);
        window.toast?.('Panel yüklenemedi: renderPuantaj', 'err');
      }
    };
  }
})();