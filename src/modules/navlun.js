/**
 * src/modules/navlun.js  —  v2.0.0  Stripe tarzı
 * Deniz / Hava / Kara / Demiryolu navlun teklif yönetimi
 */
'use strict';

// ── Port veritabanı korunuyor (navlun.js v1'den) ──────────────────
const WORLD_PORTS = [
  {n:'Mersin',c:'TR',r:'Akdeniz',code:'MRS'},{n:'İstanbul (Ambarlı)',c:'TR',r:'Marmara',code:'AMB'},
  {n:'İzmir',c:'TR',r:'Ege',code:'IZM'},{n:'Samsun',c:'TR',r:'Karadeniz',code:'SXX'},
  {n:'İskenderun',c:'TR',r:'Akdeniz',code:'ISK'},{n:'Gemlik',c:'TR',r:'Marmara',code:'GEM'},
  {n:'Shanghai',c:'CN',r:'Doğu Çin',code:'SHA'},{n:'Ningbo-Zhoushan',c:'CN',r:'Doğu Çin',code:'NGB'},
  {n:'Shenzhen',c:'CN',r:'Güney Çin',code:'SZX'},{n:'Guangzhou',c:'CN',r:'Güney Çin',code:'CAN'},
  {n:'Qingdao',c:'CN',r:'Kuzey Çin',code:'TAO'},{n:'Tianjin',c:'CN',r:'Kuzey Çin',code:'TSN'},
  {n:'Rotterdam',c:'NL',r:'Kuzey Avrupa',code:'RTM'},{n:'Antwerp',c:'BE',r:'Kuzey Avrupa',code:'ANR'},
  {n:'Hamburg',c:'DE',r:'Kuzey Avrupa',code:'HAM'},{n:'Felixstowe',c:'GB',r:'Kuzey Avrupa',code:'FXT'},
  {n:'Le Havre',c:'FR',r:'Kuzey Avrupa',code:'LEH'},{n:'Barcelona',c:'ES',r:'Akdeniz',code:'BCN'},
  {n:'Valencia',c:'ES',r:'Akdeniz',code:'VLC'},{n:'Algeciras',c:'ES',r:'Akdeniz',code:'AEI'},
  {n:'Piraeus',c:'GR',r:'Akdeniz',code:'PIR'},{n:'Jebel Ali',c:'AE',r:'Körfez',code:'DXB'},
  {n:'Singapore',c:'SG',r:'G.D. Asya',code:'SIN'},{n:'Port Klang',c:'MY',r:'G.D. Asya',code:'PKL'},
  {n:'Busan',c:'KR',r:'Doğu Asya',code:'PUS'},{n:'Tokyo',c:'JP',r:'Doğu Asya',code:'TYO'},
  {n:'Hong Kong',c:'HK',r:'Doğu Asya',code:'HKG'},{n:'Kaohsiung',c:'TW',r:'Doğu Asya',code:'KHH'},
  {n:'Los Angeles',c:'US',r:'K. Amerika',code:'LAX'},{n:'New York',c:'US',r:'K. Amerika',code:'NYC'},
  {n:'Santos',c:'BR',r:'G. Amerika',code:'SSZ'},{n:'Durban',c:'ZA',r:'Afrika',code:'DUR'},
  {n:'Jeddah',c:'SA',r:'Kızıldeniz',code:'JED'},{n:'Port Said',c:'EG',r:'Akdeniz',code:'PSD'},
  {n:'Nhava Sheva',c:'IN',r:'Güney Asya',code:'NHV'},{n:'Colombo',c:'LK',r:'Güney Asya',code:'CMB'},
  // Havalimanları
  {n:'İstanbul Havalimanı (IST)',c:'TR',r:'Hava',code:'IST'},
  {n:'İstanbul SAW',c:'TR',r:'Hava',code:'SAW'},
  {n:'Ankara ESB',c:'TR',r:'Hava',code:'ESB'},
  {n:'İzmir ADB',c:'TR',r:'Hava',code:'ADB'},
  {n:'Antalya AYT',c:'TR',r:'Hava',code:'AYT'},
  {n:'Frankfurt FRA',c:'DE',r:'Hava',code:'FRA'},
  {n:'Amsterdam AMS',c:'NL',r:'Hava',code:'AMS'},
  {n:'Dubai DXB',c:'AE',r:'Hava',code:'DXB'},
  {n:'Hong Kong HKG',c:'HK',r:'Hava',code:'HKG'},
  {n:'Singapore SIN',c:'SG',r:'Hava',code:'SIN'},
  {n:'Shanghai PVG',c:'CN',r:'Hava',code:'PVG'},
  {n:'Chicago ORD',c:'US',r:'Hava',code:'ORD'},
  {n:'JFK New York',c:'US',r:'Hava',code:'JFK'},
  {n:'London Heathrow',c:'GB',r:'Hava',code:'LHR'},
  // Kara sınır kapıları
  {n:'Kapıkule',c:'TR',r:'Kara',code:'KPK'},
  {n:'Hamzabeyli',c:'TR',r:'Kara',code:'HMZ'},
  {n:'İpsala',c:'TR',r:'Kara',code:'IPS'},
  {n:'Habur',c:'TR',r:'Kara',code:'HBR'},
  {n:'Gürbulak',c:'TR',r:'Kara',code:'GRB'},
  {n:'Sarp',c:'TR',r:'Kara',code:'SRP'},
  {n:'Bülgaristan Kapısı (Sofia)',c:'BG',r:'Kara',code:'SOF'},
  {n:'Yunanistan (Selanik)',c:'GR',r:'Kara',code:'SKG'},
  {n:'İran (Bazargan)',c:'IR',r:'Kara',code:'BZG'},
];

function _portSearch(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().replace(/[ığüşöç]/g,c=>({ı:'i',ğ:'g',ü:'u',ş:'s',ö:'o',ç:'c'}[c]||c));
  return WORLD_PORTS.filter(p => {
    const n = p.n.toLowerCase().replace(/[ığüşöç]/g,c=>({ı:'i',ğ:'g',ü:'u',ş:'s',ö:'o',ç:'c'}[c]||c));
    return n.includes(q)||p.code.toLowerCase().includes(q)||p.c.toLowerCase().includes(q);
  }).slice(0,8);
}

const _FLAGS = {TR:'🇹🇷',CN:'🇨🇳',NL:'🇳🇱',BE:'🇧🇪',DE:'🇩🇪',GB:'🇬🇧',FR:'🇫🇷',ES:'🇪🇸',
  IT:'🇮🇹',GR:'🇬🇷',AE:'🇦🇪',SA:'🇸🇦',SG:'🇸🇬',JP:'🇯🇵',KR:'🇰🇷',US:'🇺🇸',
  IN:'🇮🇳',AU:'🇦🇺',BR:'🇧🇷',EG:'🇪🇬',ZA:'🇿🇦',HK:'🇭🇰',TW:'🇹🇼',MY:'🇲🇾',
  TH:'🇹🇭',IR:'🇮🇷',BG:'🇧🇬',LK:'🇱🇰'};

function _initPortAutocomplete(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp || inp.dataset.portAc) return;
  inp.dataset.portAc = '1';
  inp.setAttribute('autocomplete','off');
  const wrap = inp.closest('[style*="position:relative"]') || inp.parentElement;
  if (wrap && !wrap.style.position) wrap.style.position = 'relative';
  let dd = null;
  const _close = () => { if (dd) { dd.remove(); dd=null; } };
  inp.addEventListener('input', function() {
    _close();
    const results = _portSearch(this.value.trim());
    if (!results.length) return;
    dd = document.createElement('div');
    dd.style.cssText = 'position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--sf);border:1px solid var(--b);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:9990;max-height:200px;overflow-y:auto';
    results.forEach(p => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--b);font-size:12px';
      item.onmouseenter = () => item.style.background='var(--s2)';
      item.onmouseleave = () => item.style.background='';
      item.innerHTML = '<span style="font-size:16px">'+((_FLAGS[p.c])||'🏳️')+'</span>'
        +'<div><div style="font-weight:500;color:var(--t)">'+p.n+'</div>'
        +'<div style="font-size:10px;color:var(--t3)">'+p.c+' · '+p.r+' · '+p.code+'</div></div>';
      item.addEventListener('mousedown', e => { e.preventDefault(); inp.value=p.n; inp.dispatchEvent(new Event('change')); _close(); });
      dd.appendChild(item);
    });
    const parent = inp.parentElement;
    if (parent) { parent.style.position='relative'; parent.appendChild(dd); }
  });
  inp.addEventListener('blur', () => setTimeout(_close,150));
  inp.addEventListener('keydown', e => { if(e.key==='Escape') _close(); });
}

function initAllPortInputs() {
  ['ktn-from-port','ktn-to-port','nvl-from','nvl-to'].forEach(_initPortAutocomplete);
}

// ═══════════════════════════════════════════════════════════════
// NAVLUN VERİ
// ═══════════════════════════════════════════════════════════════

const TASIMA_TIPLERI = {
  deniz: {
    l:'Deniz', icon:'🚢',
    aracTipleri:['FCL 20\'', 'FCL 40\'', 'FCL 40\' HC', 'LCL/Parsiyel', 'RoRo', 'Breakbulk'],
    tasiyancilar:['MSC','Maersk','CMA CGM','COSCO','Hapag-Lloyd','ONE','Evergreen','Yang Ming','HMM','ZIM'],
    zorunlu:['from','to','aracTipi','birimFiyat','transitSure','tasiyan'],
  },
  hava: {
    l:'Hava', icon:'✈️',
    aracTipleri:['Genel Kargo','Express/Kuryeli','Soğuk Zincir','Tehlikeli Madde (IATA)','Canlı Hayvan'],
    tasiyancilar:['Turkish Cargo','Lufthansa Cargo','Emirates SkyCargo','Qatar Airways Cargo','FedEx','DHL','UPS','Cainiao','Amazon Air'],
    zorunlu:['from','to','birimFiyat','transitSure','tasiyan'],
  },
  kara: {
    l:'Kara', icon:'🚛',
    aracTipleri:['Tır / Frigorifik','Tenteli TIR','Kapalı Kasa','Lowbed','Tanker','Parsiyel / LTL'],
    tasiyancilar:['Ekol Lojistik','UND Romörkçülük','Gefco','DB Schenker','DHL Road','Kühne+Nagel','Diğer'],
    zorunlu:['from','to','birimFiyat','transitSure','tasiyan'],
  },
  demir: {
    l:'Demiryolu', icon:'🚂',
    aracTipleri:['Konteyner (ISO)','Vagon','Ro-La (Tır)','Parsiyel Vagon'],
    tasiyancilar:['TCDD Taşımacılık','DB Cargo','PKP Cargo','ÖBB Rail Cargo','Diğer'],
    zorunlu:['from','to','birimFiyat','transitSure','tasiyan'],
  },
};

const NAVLUN_STATUS = {
  bekliyor:  {l:'Bekliyor',    c:'rgba(133,79,11,.09)',  t:'#854F0B'},
  onaylandi: {l:'Onaylandı',   c:'rgba(59,109,17,.09)',  t:'#3B6D11'},
  reddedildi:{l:'Reddedildi',  c:'rgba(163,45,45,.09)',  t:'#A32D2D'},
  suresi_gec:{l:'Süresi Geçti',c:'rgba(163,45,45,.06)',  t:'#A32D2D'},
};
const PARA_BIRIMLERI = ['USD','EUR','TRY','GBP','CNY'];

function loadNavlun()   { try { const d=JSON.parse(localStorage.getItem('ak_navlun1')||'[]'); return Array.isArray(d)?d:[]; } catch(e){ return []; } }
function storeNavlun(d) { localStorage.setItem('ak_navlun1',JSON.stringify(d.slice(0,500))); }

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

function renderNavlun() {
  const cont = document.getElementById('navlun-list');
  if (!cont) return;

  const items  = loadNavlun();
  const today  = new Date().toISOString().slice(0,10);
  const users  = typeof loadUsers==='function'?loadUsers():[];
  const search = (document.getElementById('nvl-search')?.value||'').toLowerCase();
  const statF  = document.getElementById('nvl-status-f')?.value||'';
  const tipF   = document.getElementById('nvl-tip-f')?.value||'';

  items.forEach(n => {
    if (n.durum==='onaylandi'||n.durum==='reddedildi') return;
    if (n.gecerlilikBitis && n.gecerlilikBitis < today) n.durum='suresi_gec';
  });

  let fl = items.filter(n => {
    if (statF && n.durum!==statF) return false;
    if (tipF  && n.tasimaTipi!==tipF) return false;
    if (search && !((n.from||'').toLowerCase().includes(search)||(n.to||'').toLowerCase().includes(search)||(n.tasiyan||'').toLowerCase().includes(search))) return false;
    return true;
  }).sort((a,b)=>(b.id||0)-(a.id||0));

  const sv = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  sv('nvl-stat-total', items.length);
  sv('nvl-stat-bekliyor', items.filter(n=>n.durum==='bekliyor').length);
  sv('nvl-stat-onay', items.filter(n=>n.durum==='onaylandi').length);
  sv('nvl-stat-gecen', items.filter(n=>n.durum==='suresi_gec').length);

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:40px;text-align:center">'
      +'<div style="font-size:14px;font-weight:500;color:var(--t);margin-bottom:4px">Teklif bulunamadı</div>'
      +'<div style="font-size:12px;color:var(--t3);margin-bottom:16px">İlk navlun teklifinizi ekleyin</div>'
      +'<button class="btn btnp" onclick="openNavlunModal(null)" style="font-size:12px">+ Teklif Ekle</button>'
      +'</div>';
    return;
  }

  // Güzergah bazlı grupla
  const grouped = {};
  fl.forEach(n => {
    const key = (n.tasimaTipi||'deniz')+'|'+(n.from||'?')+'→'+(n.to||'?');
    if (!grouped[key]) grouped[key]=[];
    grouped[key].push(n);
  });

  let html = '';
  Object.entries(grouped).forEach(([key, teklifler]) => {
    const [tip,...rest] = key.split('|');
    const route = rest.join('|');
    const tipCfg = TASIMA_TIPLERI[tip]||TASIMA_TIPLERI.deniz;
    html += '<div style="margin-bottom:20px">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<div style="height:1px;background:var(--b);flex:1"></div>'
        + '<span style="font-size:11px;font-weight:600;color:var(--t3);background:var(--s2);padding:3px 10px;border-radius:99px;white-space:nowrap">'
          + tipCfg.icon + ' ' + route + (teklifler.length>1?' ('+teklifler.length+' teklif)':'')
        + '</span>'
        + '<div style="height:1px;background:var(--b);flex:1"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">';

    teklifler.forEach(n => {
      const st = NAVLUN_STATUS[n.durum]||NAVLUN_STATUS.bekliyor;
      const u  = users.find(x=>x.id===n.createdBy)||{name:'—'};
      const dl = n.gecerlilikBitis ? Math.ceil((new Date(n.gecerlilikBitis)-new Date())/86400000) : null;
      const isGec = n.gecerlilikBitis && n.gecerlilikBitis < today;
      const isEn = teklifler.length>1 && n.durum!=='reddedildi'
        && n.birimFiyat===Math.min(...teklifler.filter(x=>x.durum!=='reddedildi').map(x=>+x.birimFiyat));

      html += '<div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;overflow:hidden'+(isEn?';border-top:2px solid #3B6D11':'')+'">'
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--b)">'
          + '<div>'
            + '<div style="font-size:13px;font-weight:600">'+(n.tasiyan||'—')+'</div>'
            + '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+(n.aracTipi||tipCfg.l)+'</div>'
          + '</div>'
          + '<div style="text-align:right">'
            + '<div style="font-size:16px;font-weight:600;color:'+(isEn?'#3B6D11':'var(--t)')+'">'+( n.para||'USD')+' '+Number(n.birimFiyat||0).toLocaleString('tr-TR')+'</div>'
            + (isEn?'<div style="font-size:10px;font-weight:600;color:#3B6D11">En düşük</div>':'')
          + '</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--b)">'
          + '<div style="padding:8px 14px;border-right:1px solid var(--b)">'
            + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">TRANSİT SÜRE</div>'
            + '<div style="font-size:12px;font-weight:500;color:var(--t)">'+(n.transitSure?n.transitSure+' gün':'—')+'</div>'
          + '</div>'
          + '<div style="padding:8px 14px">'
            + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">GEÇERLİLİK</div>'
            + '<div style="font-size:12px;color:'+(isGec?'#A32D2D':'var(--t2)')+'">'+( n.gecerlilikBitis||'—')+(dl!==null&&!isGec?' ('+dl+'g)':'')+'</div>'
          + '</div>'
        + '</div>'
        + (n.satici ? '<div style="padding:7px 14px;border-bottom:1px solid var(--b);font-size:11px;color:var(--t3)">Satıcı: <span style="color:var(--t2)">'+n.satici+'</span></div>' : '')
        + (n.teklifVeren ? '<div style="padding:7px 14px;border-bottom:1px solid var(--b);font-size:11px;color:var(--t3)">Teklif veren: <span style="color:var(--t2)">'+n.teklifVeren+'</span></div>' : '')
        + (n.notlar ? '<div style="padding:7px 14px;border-bottom:1px solid var(--b);font-size:11px;color:var(--t3)">' + n.notlar + '</div>' : '')
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px">'
          + '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:'+st.c+';color:'+st.t+'">'+st.l+'</span>'
          + '<div style="display:flex;gap:4px">'
            + (n.durum==='onaylandi'?'<button onclick="navlunToKonteyn('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">→ Konteyner</button>':'')
            + (n.durum==='bekliyor'?'<button onclick="navlunOnayla('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">Onayla</button>':'')
            + (n.durum==='bekliyor'?'<button onclick="navlunReddet('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px;color:var(--rdt)">Reddet</button>':'')
            + '<button onclick="openNavlunModal('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">Düzenle</button>'
          + '</div>'
        + '</div>'
      + '</div>';
    });

    html += '</div></div>';
  });
  cont.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// MODAL — dinamik form
// ═══════════════════════════════════════════════════════════════

function openNavlunModal(id) {
  document.getElementById('mo-navlun')?.remove();
  const n    = id ? loadNavlun().find(x=>x.id===id) : null;
  const tip  = n?.tasimaTipi || 'deniz';
  const users = typeof loadUsers==='function' ? loadUsers().filter(u=>u.status==='active') : [];

  const mo = document.createElement('div');
  mo.className='mo open'; mo.id='mo-navlun'; mo.style.zIndex='2100';

  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:10px;overflow:hidden;max-height:92vh;display:flex;flex-direction:column">'

    // Header
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      + '<span style="font-size:15px;font-weight:500">'+(n?'Teklif Düzenle':'Navlun Teklifi Ekle')+'</span>'
      + '<button onclick="document.getElementById(\'mo-navlun\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">×</button>'
    + '</div>'

    // Taşıma tipi seçici
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b);flex-shrink:0">'
      + Object.entries(TASIMA_TIPLERI).map(([k,v]) =>
          '<button onclick="switchNavlunTip(\''+k+'\')" id="nvl-tip-btn-'+k+'" style="padding:10px 4px;border:none;cursor:pointer;font-size:12px;font-family:inherit;border-bottom:2px solid '+(tip===k?'var(--ac)':'transparent')+';background:'+(tip===k?'var(--al)':'var(--sf)')+';color:'+(tip===k?'var(--ac)':'var(--t2)')+'">'+v.icon+' '+v.l+'</button>'
        ).join('')
    + '</div>'

    // Form içeriği — dinamik
    + '<div id="nvl-form-body" style="padding:18px 20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px"></div>'

    // Footer
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">'
      + '<button class="btn" onclick="document.getElementById(\'mo-navlun\').remove()" style="font-size:13px">İptal</button>'
      + '<button class="btn btnp" onclick="saveNavlun()" style="font-size:13px">Kaydet</button>'
    + '</div>'

  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });

  _renderNavlunForm(tip, n);
}

function switchNavlunTip(tip) {
  document.querySelectorAll('[id^="nvl-tip-btn-"]').forEach(b => {
    const k = b.id.replace('nvl-tip-btn-','');
    const active = k===tip;
    b.style.borderBottomColor = active ? 'var(--ac)' : 'transparent';
    b.style.background        = active ? 'var(--al)' : 'var(--sf)';
    b.style.color             = active ? 'var(--ac)' : 'var(--t2)';
  });
  _renderNavlunForm(tip, null);
}

function _renderNavlunForm(tip, existing) {
  const body = document.getElementById('nvl-form-body');
  if (!body) return;
  const cfg   = TASIMA_TIPLERI[tip] || TASIMA_TIPLERI.deniz;
  const n     = existing;

  const tasiyanOptions = ['<option value="">Seçin…</option>',
    ...cfg.tasiyancilar.map(t => '<option value="'+t+'"'+(n?.tasiyan===t?' selected':'')+'>'+t+'</option>'),
    '<option value="Diğer">Diğer</option>'
  ].join('');

  const aracOptions = ['<option value="">Seçin…</option>',
    ...cfg.aracTipleri.map(t => '<option value="'+t+'"'+(n?.aracTipi===t?' selected':'')+'>'+t+'</option>')
  ].join('');

  const paraOptions = PARA_BIRIMLERI.map(p=>'<option value="'+p+'"'+(n?.para===p?' selected':'')+'>'+p+'</option>').join('');

  body.innerHTML = [
    // Taşıyıcı + Araç tipi
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
      '<div><div class="fl">TAŞIYICI / ARMATÖR <span style="color:var(--rd)">*</span></div>',
        '<select class="fi" id="nvl-tasiyan">'+tasiyanOptions+'</select></div>',
      '<div><div class="fl">ARAÇ TİPİ / SERVİS</div>',
        '<select class="fi" id="nvl-arac">'+aracOptions+'</select></div>',
    '</div>',
    // Satıcı + Teklif veren
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
      '<div><div class="fl">SATICI <span style="color:var(--rd)">*</span></div>',
        '<input class="fi" id="nvl-satici" placeholder="Satıcı firma/şahıs…" value="'+(n?.satici||'')+'"></div>',
      '<div><div class="fl">TEKLİF VEREN <span style="color:var(--rd)">*</span></div>',
        '<input class="fi" id="nvl-teklifveren" placeholder="Acente, taşıyıcı temsilcisi…" value="'+(n?.teklifVeren||'')+'"></div>',
    '</div>',
    // Yükleme + Varış
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
      '<div><div class="fl">YÜKLEME '+(tip==='hava'?'HAVALİMANI':tip==='kara'?'SINIR KAPISI':tip==='demir'?'İSTASYON':'LİMANI')+' <span style="color:var(--rd)">*</span></div>',
        '<div style="position:relative"><input class="fi" id="nvl-from" placeholder="'+(tip==='hava'?'Frankfurt, IST…':tip==='kara'?'Kapıkule, Habur…':'Shanghai, Hamburg…')+'" value="'+(n?.from||'')+'" autocomplete="off"></div></div>',
      '<div><div class="fl">VARIŞ '+(tip==='hava'?'HAVALİMANI':tip==='kara'?'SINIR KAPISI':tip==='demir'?'İSTASYON':'LİMANI')+' <span style="color:var(--rd)">*</span></div>',
        '<div style="position:relative"><input class="fi" id="nvl-to" placeholder="'+(tip==='hava'?'İstanbul, IST…':tip==='kara'?'İstanbul, İzmir…':'Mersin, Rotterdam…')+'" value="'+(n?.to||'')+'" autocomplete="off"></div></div>',
    '</div>',
    // Fiyat + Para + Transit süre
    '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px">',
      '<div><div class="fl">BİRİM FİYAT <span style="color:var(--rd)">*</span></div>',
        '<input class="fi" type="number" id="nvl-fiyat" min="0" step="1" placeholder="1500" value="'+(n?.birimFiyat||'')+'"></div>',
      '<div><div class="fl">PARA</div>',
        '<select class="fi" id="nvl-para">'+paraOptions+'</select></div>',
      '<div><div class="fl">TRANSİT SÜRE (gün) <span style="color:var(--rd)">*</span></div>',
        '<input class="fi" type="number" id="nvl-transit" min="1" step="1" placeholder="25" value="'+(n?.transitSure||'')+'"></div>',
    '</div>',
    // Geçerlilik
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
      '<div><div class="fl">GEÇERLİLİK BAŞLANGIÇ</div>',
        '<input type="date" class="fi" id="nvl-bas" value="'+(n?.gecerlilikBaslangic||'')+'"></div>',
      '<div><div class="fl">GEÇERLİLİK BİTİŞ</div>',
        '<input type="date" class="fi" id="nvl-bit" value="'+(n?.gecerlilikBitis||'')+'"></div>',
    '</div>',
    // Notlar
    '<div><div class="fl">NOTLAR</div>',
      '<textarea class="fi" id="nvl-notlar" rows="2" style="resize:none" placeholder="Özel şartlar, ek ücretler…">'+(n?.notlar||'')+'</textarea></div>',
    '<input type="hidden" id="nvl-tip-val" value="'+tip+'">',
    '<input type="hidden" id="nvl-eid" value="'+(n?.id||'')+'">',
  ].join('');

  // Autocomplete
  setTimeout(() => {
    _initPortAutocomplete('nvl-from');
    _initPortAutocomplete('nvl-to');
  }, 50);
}

function saveNavlun() {
  const tip      = document.getElementById('nvl-tip-val')?.value || 'deniz';
  const tasiyan  = document.getElementById('nvl-tasiyan')?.value?.trim();
  const satici   = document.getElementById('nvl-satici')?.value?.trim();
  const tveren   = document.getElementById('nvl-teklifveren')?.value?.trim();
  const from     = document.getElementById('nvl-from')?.value?.trim();
  const to       = document.getElementById('nvl-to')?.value?.trim();
  const fiyat    = parseFloat(document.getElementById('nvl-fiyat')?.value||'0');
  const transit  = parseInt(document.getElementById('nvl-transit')?.value||'0');
  const eid      = parseInt(document.getElementById('nvl-eid')?.value||'0');

  const errs = [];
  if (!tasiyan) errs.push('Taşıyıcı');
  if (!satici)  errs.push('Satıcı');
  if (!tveren)  errs.push('Teklif veren');
  if (!from)    errs.push('Yükleme noktası');
  if (!to)      errs.push('Varış noktası');
  if (!fiyat)   errs.push('Birim fiyat');
  if (!transit) errs.push('Transit süre');

  if (errs.length) {
    window.toast?.('Zorunlu: ' + errs.join(', '), 'err');
    return;
  }

  const cu = window.Auth?.getCU?.();
  const ts = typeof nowTs==='function' ? nowTs() : new Date().toLocaleString('tr-TR');

  const entry = {
    tasimaTipi: tip,
    tasiyan, aracTipi: document.getElementById('nvl-arac')?.value||'',
    satici, teklifVeren: tveren,
    from, to, birimFiyat: fiyat,
    para: document.getElementById('nvl-para')?.value||'USD',
    transitSure: transit,
    gecerlilikBaslangic: document.getElementById('nvl-bas')?.value||'',
    gecerlilikBitis:     document.getElementById('nvl-bit')?.value||'',
    notlar: document.getElementById('nvl-notlar')?.value?.trim()||'',
    durum: 'bekliyor', createdBy: cu?.id, updatedAt: ts,
  };

  const d = loadNavlun();
  if (eid) {
    const item = d.find(x=>x.id===eid);
    if (item) Object.assign(item, entry);
  } else {
    d.unshift({id:Date.now(), createdAt:ts, ...entry});
  }

  storeNavlun(d);
  document.getElementById('mo-navlun')?.remove();
  renderNavlun();
  window.logActivity?.('view','Navlun kaydedildi: '+tip+' '+from+'→'+to);
  window.toast?.(eid?'Güncellendi ✓':'Teklif eklendi ✓','ok');
}

function navlunOnayla(id) {
  const d=loadNavlun(); const n=d.find(x=>x.id===id); if(!n) return;
  n.durum='onaylandi'; n.onayAt=(typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR'));
  storeNavlun(d); renderNavlun(); window.toast?.('Teklif onaylandı','ok');
}

function navlunReddet(id) {
  const d=loadNavlun(); const n=d.find(x=>x.id===id); if(!n) return;
  n.durum='reddedildi'; storeNavlun(d); renderNavlun(); window.toast?.('Teklif reddedildi','ok');
}

function delNavlun(id) {
  window.confirmModal('Bu teklifi silmek istediğinizden emin misiniz?', {
    title: 'Teklif Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeNavlun(loadNavlun().filter(x=>x.id!==id)); renderNavlun(); window.toast?.('Silindi','ok');
    }
  });
}

function navlunToKonteyn(id) {
  const n=loadNavlun().find(x=>x.id===id); if(!n) return;
  window.openKonteynModal?.(null);
  setTimeout(()=>{
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
    sv('ktn-hat',n.tasiyan);
    sv('ktn-from-port',n.from);
    sv('ktn-to-port',n.to);
    sv('ktn-desc',(n.aracTipi||'')+(n.notlar?' — '+n.notlar:''));
    window.toast?.('Navlun bilgileri aktarıldı','ok');
  },300);
}

function exportNavlunXlsx() {
  if(typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  const rows=loadNavlun().map(n=>({
    'Taşıma':n.tasimaTipi,'Taşıyıcı':n.tasiyan,'Araç Tipi':n.aracTipi,
    'Satıcı':n.satici,'Teklif Veren':n.teklifVeren,
    'Yükleme':n.from,'Varış':n.to,'Fiyat':n.birimFiyat,'Para':n.para,
    'Transit (gün)':n.transitSure,'Geç. Bitiş':n.gecerlilikBitis,
    'Durum':NAVLUN_STATUS[n.durum]?.l||n.durum,'Notlar':n.notlar,
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Navlun');
  XLSX.writeFile(wb,'Navlun_'+new Date().toISOString().slice(0,10)+'.xlsx');
  window.toast?.('Excel indirildi ✓','ok');
}

// ── Panel inject ──────────────────────────────────────────────────
function _injectNavlunSection() {
  const panel=document.getElementById('panel-kargo');
  if(!panel||document.getElementById('navlun-section')) return;

  const sec=document.createElement('div');
  sec.id='navlun-section'; sec.style.marginTop='20px';
  sec.innerHTML='<div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;overflow:hidden">'

    // Header
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--b)">'
      +'<span style="font-size:13px;font-weight:500">Navlun Teklifleri</span>'
      +'<div style="display:flex;gap:6px">'
        +'<button class="btn btns" onclick="exportNavlunXlsx()" style="font-size:11px">Excel</button>'
        +'<button class="btn btnp" onclick="openNavlunModal(null)" style="font-size:12px">+ Teklif Ekle</button>'
      +'</div>'
    +'</div>'

    // Stat şeridi
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b)">'
      +'<div style="padding:12px 16px;border-right:1px solid var(--b)"><div style="font-size:18px;font-weight:600" id="nvl-stat-total">0</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Toplam</div></div>'
      +'<div style="padding:12px 16px;border-right:1px solid var(--b)"><div style="font-size:18px;font-weight:600;color:#854F0B" id="nvl-stat-bekliyor">0</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Bekliyor</div></div>'
      +'<div style="padding:12px 16px;border-right:1px solid var(--b)"><div style="font-size:18px;font-weight:600;color:#3B6D11" id="nvl-stat-onay">0</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Onaylandı</div></div>'
      +'<div style="padding:12px 16px"><div style="font-size:18px;font-weight:600;color:#A32D2D" id="nvl-stat-gecen">0</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Süresi Geçmiş</div></div>'
    +'</div>'

    // Filtreler
    +'<div style="padding:10px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      +'<input class="fi" id="nvl-search" placeholder="Taşıyıcı, liman ara…" oninput="renderNavlun()" style="font-size:12px;flex:1;min-width:150px">'
      +'<select class="fi" id="nvl-tip-f" onchange="renderNavlun()" style="font-size:12px;width:130px">'
        +'<option value="">Tüm Tipler</option>'
        +'<option value="deniz">🚢 Deniz</option>'
        +'<option value="hava">✈️ Hava</option>'
        +'<option value="kara">🚛 Kara</option>'
        +'<option value="demir">🚂 Demir</option>'
      +'</select>'
      +'<select class="fi" id="nvl-status-f" onchange="renderNavlun()" style="font-size:12px;width:130px">'
        +'<option value="">Tüm Durumlar</option>'
        +'<option value="bekliyor">Bekliyor</option>'
        +'<option value="onaylandi">Onaylandı</option>'
        +'<option value="reddedildi">Reddedildi</option>'
        +'<option value="suresi_gec">Süresi Geçmiş</option>'
      +'</select>'
    +'</div>'

    +'<div id="navlun-list" style="padding:4px 0"></div>'
  +'</div>';

  panel.appendChild(sec);
}

// ── setKtnLayout (Madde 1 - yatay form) ──────────────────────────
window.setKtnLayout = function(mode) {
  const body = document.getElementById('ktn-modal-body');
  if (!body) return;
  ['ktn-layout-v','ktn-layout-h'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const active = id.endsWith(mode==='v'?'v':'h');
    btn.style.background = active ? 'var(--ac)' : 'none';
    btn.style.color      = active ? '#fff' : 'var(--t2)';
  });
  if (mode === 'h') {
    // Yatay mod: 2 kolon grid
    body.style.display = 'grid';
    body.style.gridTemplateColumns = '1fr 1fr';
    body.style.gap = '10px';
  } else {
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '14px';
    body.style.gridTemplateColumns = '';
  }
};

// ── Export ────────────────────────────────────────────────────────
if (typeof module!=='undefined'&&module.exports) {
  module.exports={WORLD_PORTS,renderNavlun,openNavlunModal,saveNavlun,initAllPortInputs};
} else {
  window.WORLD_PORTS            = WORLD_PORTS;
  window.renderNavlun           = renderNavlun;
  window.openNavlunModal        = openNavlunModal;
  window.saveNavlun             = saveNavlun;
  window.switchNavlunTip        = switchNavlunTip;
  window.navlunOnayla           = navlunOnayla;
  window.navlunReddet           = navlunReddet;
  window.delNavlun              = delNavlun;
  window.navlunToKonteyn        = navlunToKonteyn;
  window.exportNavlunXlsx       = exportNavlunXlsx;
  window.initAllPortInputs      = initAllPortInputs;
  window._initPortAutocomplete  = _initPortAutocomplete;
  window.loadNavlun             = loadNavlun;
  window.storeNavlun            = storeNavlun;
  window._injectNavlunSection   = _injectNavlunSection;
}
