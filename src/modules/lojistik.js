/**
 * src/modules/lojistik.js  —  v4.0  Stripe tarzı
 */
'use strict';

function renderLojistik() {
  const panel = document.getElementById('panel-lojistik');
  if (!panel) return;

  const kargo  = typeof loadKargo   === 'function' ? loadKargo()   : [];
  const konts  = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const users  = typeof loadUsers   === 'function' ? loadUsers()   : [];
  const today  = new Date();
  const todayS = today.toISOString().slice(0, 10);

  const B = 'border:1px solid var(--b)';
  const Bh = 'border-bottom:1px solid var(--b)';
  const Br = 'border-right:1px solid var(--b)';
  const card = `background:var(--sf);${B};border-radius:8px;overflow:hidden`;
  const mono = "font-family:'DM Mono',monospace";
  const t2 = 'color:var(--t2)';
  const t3 = 'color:var(--t3)';

  const ST = {
    bekle:  { l:'Beklemede', bg:'rgba(133,79,11,.09)',  c:'#854F0B' },
    yolda:  { l:'Yolda',     bg:'rgba(24,95,165,.09)',  c:'#185FA5' },
    teslim: { l:'Teslim',    bg:'rgba(59,109,17,.09)',  c:'#3B6D11' },
    iade:   { l:'İade',      bg:'rgba(163,45,45,.09)',  c:'#A32D2D' },
  };
  const badge = s => { const x=ST[s]||ST.bekle; return `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${x.bg};color:${x.c}">${x.l}</span>`; };
  const row = (a,b) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;${Bh}">${a}${b}</div>`;

  const stats = [
    { v:kargo.length, l:'Toplam kargo', c:'var(--t)' },
    { v:kargo.filter(k=>k.status==='yolda').length,  l:'Yolda',      c:'#185FA5' },
    { v:kargo.filter(k=>k.status==='teslim').length, l:'Teslim',     c:'#3B6D11' },
    { v:kargo.filter(k=>k.status==='bekle').length,  l:'Beklemede',  c:'#854F0B' },
    { v:konts.filter(k=>!k.closed).length,           l:'Konteyner',  c:'var(--t)' },
    { v:konts.filter(k=>{ if(k.closed||!k.eta)return false; return Math.ceil((new Date(k.eta)-today)/86400000)<=7; }).length, l:'ETA alarm', c:'#A32D2D' },
  ];

  const etaList = konts.filter(k=>!k.closed&&k.eta)
    .map(k=>({...k,dl:Math.ceil((new Date(k.eta)-today)/86400000)}))
    .filter(k=>k.dl<=14).sort((a,b)=>a.dl-b.dl).slice(0,5);

  const recentK = [...kargo].sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,5);

  const alarms = konts.filter(k=>{
    if(k.closed||!k.eta)return false;
    const dl=Math.ceil((new Date(k.eta)-today)/86400000);
    return dl<=10&&(!k.evrakGon||!k.evrakUlasti||!k.inspectionBitti||!k.malTeslim);
  }).slice(0,3);

  panel.innerHTML = [

    // Header
    `<div class="ph" style="${Bh};margin-bottom:0">
      <div>
        <div class="pht">Lojistik Merkezi</div>
        <div class="phs">Kargo ve konteyner operasyonlarına genel bakış</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btns" onclick="nav('kargo',document.querySelector('.nb[onclick*=kargo]'))" style="font-size:12px">Kargo Yönetimi</button>
        <button class="btn btnp" onclick="window.openKonteynModal(null)" style="font-size:12px">+ Konteyner Ekle</button>
      </div>
    </div>`,

    // Stat şeridi — Stripe'ın üst metrik barı
    `<div style="background:var(--sf);${B};border-top:none;border-radius:0 0 8px 8px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(6,1fr)">
        ${stats.map((s,i)=>`<div style="padding:14px 18px;${i<5?Br:''}">
          <div style="font-size:22px;font-weight:600;color:${s.c};line-height:1">${s.v}</div>
          <div style="font-size:11px;${t3};margin-top:3px">${s.l}</div>
        </div>`).join('')}
      </div>
    </div>`,

    // Alarm
    // #8 Demuraj banner
    (typeof renderDemurajBanner === 'function' ? (() => { renderDemurajBanner('konteyn-demuraj-bar'); return ''; })() : ''),

    // #10 Performans linki lojistik hub header'a
    alarms.length ? `<div style="border:1px solid rgba(163,45,45,.2);border-left:3px solid #A32D2D;border-radius:0 6px 6px 0;padding:11px 14px;margin-bottom:16px;background:rgba(163,45,45,.03)">
      <div style="font-size:12px;font-weight:600;color:#A32D2D;margin-bottom:7px">${alarms.length} konteyner işlem bekliyor</div>
      ${alarms.map(k=>{
        const dl=Math.ceil((new Date(k.eta)-today)/86400000);
        const eksik=!k.evrakGon?'Evrak gönderilmedi':!k.evrakUlasti?'Müşteri evrak almadı':!k.inspectionBitti?'Inspection bekleniyor':'Mal teslimi bekleniyor';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-top:1px solid rgba(163,45,45,.08)">
          <div style="font-size:12px"><span style="${mono};font-weight:600">${k.no}</span> <span style="${t2}">— ${eksik}</span></div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:600;color:${dl<=3?'#A32D2D':'#854F0B'}">${dl<=0?'ETA geçti':dl+' gün'}</span>
            <button onclick="window.openKonteynDetail(${k.id})" class="btn btns" style="font-size:11px;padding:2px 9px">Detay</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : '',

    // İki kolon
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">

      <div style="${card}">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;${Bh}">
          <span style="font-size:13px;font-weight:500">Yaklaşan ETA</span>
          <button class="btn btns" onclick="nav('kargo',null)" style="font-size:11px">Tümü</button>
        </div>
        ${etaList.length ? etaList.map(k=>{
          const u=users.find(x=>x.id===k.uid)||{name:'?'};
          const isU=k.dl<=0,isA=!isU&&k.dl<=5;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;${Bh}">
            <div>
              <div style="font-size:13px;font-weight:500;${mono}">${k.no}</div>
              <div style="font-size:11px;${t3};margin-top:2px">${k.hat||'—'} · ${u.name}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:500;color:${isU?'#A32D2D':isA?'#854F0B':'#185FA5'}">${isU?'Geçti':k.dl+' gün'}</div>
              <div style="font-size:11px;${t3};${mono}">${k.eta||''}</div>
            </div>
          </div>`;
        }).join('') : `<div style="padding:20px;text-align:center;font-size:12px;${t3}">Yaklaşan ETA yok</div>`}
      </div>

      <div style="${card}">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;${Bh}">
          <span style="font-size:13px;font-weight:500">Son Hareketler</span>
          <button class="btn btns" onclick="nav('kargo',null)" style="font-size:11px">Tümü</button>
        </div>
        ${recentK.length ? recentK.map(k=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;${Bh}">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k.from||'—'} → ${k.to||'—'}</div>
              <div style="font-size:11px;${t3};margin-top:2px">${k.firm||'—'} · ${k.date||''}</div>
            </div>
            <div style="margin-left:10px">${badge(k.status)}</div>
          </div>`).join('')
        : `<div style="padding:20px;text-align:center;font-size:12px;${t3}">Kargo yok</div>`}
      </div>
    </div>`,

    // Aktif konteynerler
    konts.filter(k=>!k.closed).length ? `
    <div style="${card};margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;${Bh}">
        <span style="font-size:13px;font-weight:500">Aktif Konteynerler</span>
        <button class="btn btns" onclick="nav('kargo',null)" style="font-size:11px">Tümü</button>
      </div>
      ${konts.filter(k=>!k.closed).slice(0,4).map(k=>{
        const etaD=k.eta?new Date(k.eta):null;
        const dl=etaD?Math.ceil((etaD-today)/86400000):null;
        const isU=dl!==null&&dl<=0,isA=dl!==null&&dl>0&&dl<=5;
        const steps=[k.evrakGon,k.evrakUlasti,k.inspectionBitti,k.malTeslim].filter(Boolean).length;
        const pct=Math.round(steps/4*100);
        return `<div style="display:grid;grid-template-columns:140px 1fr 40px 80px 70px;align-items:center;gap:12px;padding:11px 16px;${Bh}">
          <div style="font-size:12px;font-weight:500;${mono}">${k.no}</div>
          <div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct===100?'#3B6D11':'#185FA5'};border-radius:2px"></div>
          </div>
          <div style="font-size:11px;font-weight:500;text-align:right">${pct}%</div>
          <div style="font-size:11px;font-weight:500;text-align:right;color:${isU?'#A32D2D':isA?'#854F0B':'var(--t2)'}">${dl===null?'—':isU?'ETA geçti':dl+' gün'}</div>
          <button onclick="window.openKonteynDetail(${k.id})" class="btn btns" style="font-size:11px;padding:3px 8px">Detay</button>
        </div>`;
      }).join('')}
    </div>` : '',

    // Hızlı işlemler
    `<div style="${card}">
      <div style="padding:11px 16px;${Bh}"><span style="font-size:13px;font-weight:500">Hızlı İşlemler</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr)">
        ${[
          {l:'+ Yeni Teslimat Takibi', fn:'window._edWizardAc()'},
          {l:'Gelen Kargo Ekle', fn:"openKargoModal('gelen')"},
          {l:'Giden Kargo Ekle', fn:"openKargoModal('giden')"},
          {l:'Konteyner Ekle',   fn:'window.openKonteynModal(null)'},
          {l:'Tümünü Kontrol',   fn:'checkAllKonteyn()'},
          {l:'Excel İndir',      fn:'exportKargoXlsx()'},
          {l:'Excel Yükle',      fn:'importKargoFile()'},
          {l:'PDF Rapor',        fn:'printKargoRapor()'},
          {l:'Navlun Karşılaştır',fn:'showNavlunKarsilastir()'},
          {l:'Performans Raporu', fn:'showLojPerformansRaporu()'},
          {l:'Tüm Kargolar',     fn:"nav('kargo',null)"},
        ].map((b,i)=>`<button onclick="${b.fn}" style="padding:13px 12px;border:none;${i%4!==3?Br:''};${i<4?Bh:''};background:var(--sf);cursor:pointer;font-size:12px;${t2};font-family:inherit;text-align:left;transition:background .1s" onmouseenter="this.style.background='var(--s2)'" onmouseleave="this.style.background='var(--sf)'">${b.l}</button>`).join('')}
      </div>
    </div>`,

    (typeof window.renderEdList === 'function' ? window.renderEdList() : ''),

  ].join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLojistik };
} else {
  window.renderLojistik = renderLojistik;
}
