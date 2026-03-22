/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/finans.js  —  v8.1.0
 * Finans Paneli · Döviz Kurları · Banka Karşılaştırma
 * Hesap Makinesi · Yasal Göstergeler
 *
 * Anayasa Kural 3 : DocumentFragment ile tek DOM işlemi
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';

const _gf  = id  => document.getElementById(id);
const _stf = (id, v) => { const el = _gf(id); if (el) el.textContent = v; };
const _p2f = n   => String(n).padStart(2, '0');
const _nowTsf = () => { const n = new Date(); return `${n.getFullYear()}-${_p2f(n.getMonth()+1)}-${_p2f(n.getDate())} ${_p2f(n.getHours())}:${_p2f(n.getMinutes())}:${_p2f(n.getSeconds())}`; };
const _isAdminF = () => window.Auth?.getCU?.()?.role === 'admin';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — CANLI KUR DURUMU
// ════════════════════════════════════════════════════════════════

let LIVE_RATES      = {};
let FINANS_LAST_TS  = null;
let BANK_FILTER     = 'all';
let _DARK_F         = () => (typeof getTheme==='function'?getTheme():(typeof getTheme==='function'?getTheme():localStorage.getItem('ak_theme')||'light')||'light') === 'dark';

const CUR_FLAGS = {
  USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', CHF:'🇨🇭', JPY:'🇯🇵',
  CNY:'🇨🇳', SAR:'🇸🇦', AED:'🇦🇪', ALTIN:'🥇', PETROL:'🛢️',
};

const FALLBACK_RATES = {USD:32.45,EUR:35.12,GBP:41.08,ALTIN:2140,PETROL:78.3,CHF:36.5,JPY:0.215,CNY:4.48,SAR:8.65,AED:8.84};
const CHANGE_MAP     = {USD:+0.23,EUR:-0.15,GBP:+0.08,ALTIN:+12.5,PETROL:-0.9,CHF:+0.05,JPY:-0.001,CNY:+0.02};

const BANK_DATA = [
  {key:'ziraat', name:'Ziraat Bankası',  logo:'🏛️', url:'https://www.ziraatbank.com.tr/tr/bireysel/doviz-kurlari'},
  {key:'is',     name:'İş Bankası',      logo:'💼', url:'https://www.isbank.com.tr/doviz/doviz-kurlari'},
  {key:'akbank', name:'Akbank',          logo:'🔴', url:'https://www.akbank.com/tr-tr/doviz-kurlari'},
  {key:'garanti',name:'Garanti BBVA',    logo:'🟢', url:'https://www.garantibbva.com.tr/tr/doviz-kurlari'},
  {key:'yapi',   name:'Yapı Kredi',      logo:'💳', url:'https://www.yapikredi.com.tr/bireysel-bankacilik/doviz-kurlari'},
  {key:'halk',   name:'Halkbank',        logo:'🏪', url:'https://www.halkbank.com.tr/doviz-kurlari'},
  {key:'vakif',  name:'VakıfBank',       logo:'🏦', url:'https://www.vakifbank.com.tr/doviz-kurlari.aspx'},
];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — CANLI KUR ÇEKİMİ
// ════════════════════════════════════════════════════════════════

/**
 * TCMB veya açık kur API'sinden canlı veri çeker.
 * Başarısız olursa fallback değerler kullanılır.
 * @returns {Promise<Object>} { USD, EUR, ... }
 */
async function fetchLiveRates(){
  const btn=_gf('btn-refresh-rates');
  if(btn){btn.disabled=true;btn.textContent='⏳ Güncelleniyor…';}
  try{
    // Ücretsiz kur API'si — CORS destekli
    const res=await fetch('https://api.exchangerate-api.com/v4/latest/TRY',{signal:AbortSignal.timeout(5000)});
    if(res.ok){
      const json=await res.json();
      // API TRY bazlıdır → TRY/Döviz = 1/oran
      const rates=json.rates||{};
      if(rates.USD)LIVE_RATES.USD=+(1/rates.USD).toFixed(4);
      if(rates.EUR)LIVE_RATES.EUR=+(1/rates.EUR).toFixed(4);
      if(rates.GBP)LIVE_RATES.GBP=+(1/rates.GBP).toFixed(4);
      if(rates.CHF)LIVE_RATES.CHF=+(1/rates.CHF).toFixed(4);
      if(rates.JPY)LIVE_RATES.JPY=+(1/rates.JPY).toFixed(6);
      if(rates.CNY)LIVE_RATES.CNY=+(1/rates.CNY).toFixed(4);
      if(rates.SAR)LIVE_RATES.SAR=+(1/rates.SAR).toFixed(4);
      if(rates.AED)LIVE_RATES.AED=+(1/rates.AED).toFixed(4);
    }
  }catch(e){
    // Sessizce fallback'e düş
    console.warn('[finans] Kur çekimi başarısız, fallback kullanılıyor.');
  }
  // Altın & Petrol için fallback
  if(!LIVE_RATES.ALTIN) LIVE_RATES.ALTIN = FALLBACK_RATES.ALTIN;
  if(!LIVE_RATES.PETROL)LIVE_RATES.PETROL= FALLBACK_RATES.PETROL;
  FINANS_LAST_TS=_nowTsf();
  _stf('finans-last-update', FINANS_LAST_TS.slice(11,16)+' son güncelleme');
  if(btn){btn.disabled=false;btn.textContent='🔄 Güncelle';}
  renderFinans();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — RENDER: DÖVİZ KARTLARI
// ════════════════════════════════════════════════════════════════

function renderFinans(){
  const curs=loadCurrencies();
  // Para birimi toggle butonları
  const toggleCont=_gf('currency-toggles');
  if(toggleCont){
    const frag=document.createDocumentFragment();
    curs.forEach(c=>{
      const pill=document.createElement('div');
      pill.style.cssText='display:inline-flex;align-items:center;gap:4px;background:var(--s2);border-radius:99px;padding:3px 10px;font-size:12px;font-weight:500';
      pill.innerHTML=`<span>${CUR_FLAGS[c]||'🌐'} ${c}</span>
        ${!['USD','EUR'].includes(c)?`<span onclick="removeCurrency('${c}')" style="cursor:pointer;color:var(--t3);font-size:10px;margin-left:2px" title="Kaldır">✕</span>`:''}`;
      frag.appendChild(pill);
    });
    toggleCont.replaceChildren(frag);
  }
  // Kur kartları
  const rc=_gf('finans-rates');if(!rc)return;
  const frag=document.createDocumentFragment();
  curs.forEach(c=>{
    const val=LIVE_RATES[c]||FALLBACK_RATES[c]||'—';
    const chg=CHANGE_MAP[c]||0;const pos=chg>=0;
    const flag=CUR_FLAGS[c]||'🌐';
    const label=c==='ALTIN'?`${flag} Altın/g`:c==='PETROL'?`🛢 Petrol/$`:`${flag} ${c}/TRY`;
    const valFmt=typeof val==='number'?val.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:4}):'—';
    const card=document.createElement('div');
    card.className='ms';card.style.cursor='default';
    card.innerHTML=`
      <div class="msv" style="font-size:18px">${valFmt}</div>
      <div class="msl">${label}</div>
      <div style="font-size:11px;margin-top:4px;color:${pos?'var(--gr)':'var(--rd)'};font-weight:600">${pos?'+':''}${chg} (${pos?'↑':'↓'})</div>`;
    frag.appendChild(card);
  });
  rc.replaceChildren(frag);
  renderBankRates();
  renderFinansChart();
}

function renderBankRates(){
  const list=_gf('bank-rates-list');if(!list)return;
  const usd=LIVE_RATES.USD||FALLBACK_RATES.USD;
  const eur=LIVE_RATES.EUR||FALLBACK_RATES.EUR;
  const banks=BANK_FILTER==='all'?BANK_DATA:BANK_DATA.filter(b=>b.key===BANK_FILTER);
  if(!banks.length){list.innerHTML=`<div style="color:var(--t2);text-align:center;padding:20px">—</div>`;return;}
  const variation=[0,-0.02,+0.02,-0.05,+0.03,-0.03,0];

  const frag=document.createDocumentFragment();
  const wrap=document.createElement('div');
  const table=document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr><th>Banka</th><th>USD Alış</th><th>USD Satış</th><th>EUR Alış</th><th>EUR Satış</th><th>Kaynak</th></tr></thead>`;
  const tbody=document.createElement('tbody');
  banks.forEach((b,i)=>{
    const v=variation[i%variation.length];
    const uB=(usd-0.05+v).toFixed(4),uS=(usd+0.05+v).toFixed(4);
    const eB=(eur-0.07+v).toFixed(4),eS=(eur+0.07+v).toFixed(4);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><strong>${b.logo} ${b.name}</strong></td>
      <td style="font-family:'DM Mono',monospace;color:var(--gr)">${uB}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--rd)">${uS}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gr)">${eB}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--rd)">${eS}</td>
      <td><a href="${b.url}" target="_blank" rel="noopener" style="color:var(--ac);font-size:11px">↗ Resmi Site</a></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  const note=document.createElement('div');
  note.style.cssText='font-size:10px;color:var(--t3);padding:8px 0 0';
  note.textContent='* Banka kurları resmi sitelerden anlık çekilememektedir. Canlı kur butonundan veri alınır, banka farkları yaklaşık gösterilmektedir.';
  wrap.appendChild(note);
  frag.appendChild(wrap);
  list.replaceChildren(frag);
}

function setBankFilter(f,btn){
  BANK_FILTER=f;
  document.querySelectorAll('#bank-chips .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderBankRates();
}

function renderFinansChart(){
  const canvas=_gf('finans-chart');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const sel=_gf('chart-currency-sel')?.value||'USD';
  const base=LIVE_RATES[sel]||FALLBACK_RATES[sel]||32;
  const days=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const data=days.map((_,i)=>+(base*(0.985+Math.random()*0.03)).toFixed(4));
  data[data.length-1]=+base.toFixed(4);
  canvas.width=canvas.parentElement?.offsetWidth-32||600;
  canvas.height=180;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const w=canvas.width,h=canvas.height,pad=50;
  const isDark=_DARK_F();
  const textColor=isDark?'#9A9991':'#6B6B67';
  const gridColor=isDark?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';
  ctx.font='11px system-ui,sans-serif';
  const min=Math.min(...data)*0.998,max=Math.max(...data)*1.002,range=max-min;
  const pts=data.map((v,i)=>({x:pad+(i/(data.length-1))*(w-pad*2),y:h-pad-((v-min)/range)*(h-pad*2)}));
  for(let i=0;i<=4;i++){const y=pad+i*(h-pad*2)/4;ctx.strokeStyle=gridColor;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();ctx.fillStyle=textColor;ctx.textAlign='right';ctx.fillText((max-(i/4)*range).toFixed(2),pad-4,y+4);}
  days.forEach((d,i)=>{const x=pad+i/(days.length-1)*(w-pad*2);ctx.fillStyle=textColor;ctx.textAlign='center';ctx.fillText(d,x,h-8);});
  const grad=ctx.createLinearGradient(0,pad,0,h-pad);grad.addColorStop(0,'rgba(60,52,137,.2)');grad.addColorStop(1,'rgba(60,52,137,.0)');
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,h-pad);ctx.lineTo(pts[0].x,h-pad);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle='#3C3489';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle='#3C3489';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke();});
  ctx.fillStyle=textColor;ctx.textAlign='left';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText(sel+'/TRY — Son 7 Gün (simülasyon)',pad,22);
}

function exportFinansXlsx(){
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const curs=loadCurrencies();
  const rows=curs.map(c=>({Döviz:c,'TRY Değeri':LIVE_RATES[c]||FALLBACK_RATES[c]||'—',Tarih:FINANS_LAST_TS||_nowTsf()}));
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Döviz');
  XLSX.writeFile(wb,`Doviz_${_nowTsf().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓','ok');
}

// Para birimi ekle/kaldır
function addCurrency(code){
  if(!code)return;
  const curs=loadCurrencies();
  if(curs.includes(code)){window.toast?.(`${code} zaten ekli`,'err');return;}
  curs.push(code.toUpperCase());
  saveCurrencies(curs);
  renderFinans();
  window.toast?.(`${code} eklendi ✓`,'ok');
}

function removeCurrency(code){
  if(['USD','EUR'].includes(code)){window.toast?.('USD ve EUR kaldırılamaz','err');return;}
  saveCurrencies(loadCurrencies().filter(c=>c!==code));
  renderFinans();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — HESAP MAKİNESİ
// ════════════════════════════════════════════════════════════════

let HSP_COMPARE = [];

function loadCalcRecord(id){
  const r=loadHesapHistory().find(x=>x.id===id);if(!r)return;
  if(_gf('hsp-miktar'))_gf('hsp-miktar').value=r.miktar;
  if(_gf('hsp-alis'))  _gf('hsp-alis').value  =r.alis;
  if(_gf('hsp-satis')) _gf('hsp-satis').value  =r.satis||'';
  if(_gf('hsp-kom'))   _gf('hsp-kom').value    =r.kom||0;
  if(_gf('hsp-kdv'))   _gf('hsp-kdv').value    =r.kdv||0;
  calcHesap();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — YASAL GÖSTERGELER (2026)
// ════════════════════════════════════════════════════════════════

const YASAL_GOSTERGELER = {
  minUcret:       { label:'Asgari Ücret (brüt)',        value:'26.005,50 ₺',  aciklama:'2025 yılı için geçerli' },
  minUcretNet:    { label:'Asgari Ücret (net)',          value:'22.104,77 ₺',  aciklama:'SGK+damga vergisi sonrası' },
  sgkIsci:        { label:'SGK İşçi Primi',              value:'%14',          aciklama:'Sigortalı payı (14%)' },
  sgkIsveren:     { label:'SGK İşveren Primi',           value:'%20,5',        aciklama:'İşveren payı (15.5%+5%)' },
  isSizlik:       { label:'İşsizlik Sig. İşçi',          value:'%1',           aciklama:'İşçi işsizlik payı' },
  isSizlikIsv:    { label:'İşsizlik Sig. İşveren',       value:'%2',           aciklama:'İşveren işsizlik payı' },
  gelirVergisi:   { label:'Gelir Vergisi (min dilim)',    value:'%15',          aciklama:'0 – 70.000 ₺ arası' },
  kdv:            { label:'KDV (genel)',                  value:'%20',          aciklama:'Standart KDV oranı' },
  kdvIndirimli1:  { label:'KDV (indirimli-1)',            value:'%10',          aciklama:'Temel gıda bazı ürünler' },
  kdvIndirimli2:  { label:'KDV (indirimli-2)',            value:'%1',           aciklama:'Bazı tarımsal ürünler' },
  kurumlarVergisi:{ label:'Kurumlar Vergisi',             value:'%25',          aciklama:'2024+ için geçerli' },
  damgaVergisi:   { label:'Damga Vergisi (ücret)',        value:'%0,759',       aciklama:'Maaş ödemelerinde' },
  kvkk:           { label:'KVKK Veri İhlal Cezası',      value:'1.509.648 ₺',  aciklama:'2025 yılı üst sınır' },
};

function renderYasalGostergeler(){
  const cont=_gf('yasal-gostergeler-list');if(!cont)return;

  // DocumentFragment
  const frag=document.createDocumentFragment();
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px';
  Object.values(YASAL_GOSTERGELER).forEach(g=>{
    const card=document.createElement('div');
    card.style.cssText='background:var(--sf);border:1px solid var(--b);border-radius:var(--rs);padding:12px 14px';
    card.innerHTML=`
      <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${g.label}</div>
      <div style="font-size:16px;font-weight:700;color:var(--ac);font-family:'DM Mono',monospace">${g.value}</div>
      <div style="font-size:10px;color:var(--t3);margin-top:3px">${g.aciklama}</div>`;
    grid.appendChild(card);
  });
  frag.appendChild(grid);
  const note=document.createElement('div');
  note.style.cssText='margin-top:10px;font-size:10px;color:var(--t3);padding:8px';
  note.textContent='⚠ Yasal göstergeler bilgi amaçlıdır. Güncel oranlar için Gelir İdaresi Başkanlığı ve SGK kaynaklarını kontrol ediniz.';
  frag.appendChild(note);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — KARGO FİRMA YÖNETİMİ (Finans panelinden erişilebilir)
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════
const Finans={
  render:          renderFinans,
  fetchRates:      fetchLiveRates,
  renderBankRates,
  renderChart:     renderFinansChart,
  setBankFilter,
  addCurrency,     removeCurrency,
  exportXlsx:      exportFinansXlsx,
  // Hesap Makinesi
  // Yasal
  renderYasalGostergeler,
  YASAL_GOSTERGELER,
  // Kargo firmaları
  openKargoFirmaModal, renderKargoFirmaList, addKargoFirma, delKargoFirma,
  // Durum
  LIVE_RATES,
  FALLBACK_RATES,
};
if(typeof module!=='undefined'&&module.exports){module.exports=Finans;}
else{
  window.Finans=Finans;
  const fns=['renderFinans','fetchLiveRates','renderBankRates','renderFinansChart','setBankFilter',
    'addCurrency','removeCurrency','exportFinansXlsx','calcHesap','renderHesapHistory',
    'renderYasalGostergeler','openKargoFirmaModal','renderKargoFirmaList','addKargoFirma','delKargoFirma'];
  fns.forEach(n=>{if(Finans[n])window[n]=Finans[n];});
  window.LIVE_RATES=LIVE_RATES;window.FINANS_LAST_TS=FINANS_LAST_TS;window.BANK_DATA=BANK_DATA;
  window.YASAL_GOSTERGELER=YASAL_GOSTERGELER;
}

})();
