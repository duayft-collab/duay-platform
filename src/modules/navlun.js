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
  // Afrika & Ek Limanlar
  {n:'Abidjan',c:'CI',r:'Batı Afrika',code:'ABJ'},{n:'Dakar',c:'SN',r:'Batı Afrika',code:'DKR'},
  {n:'Lagos (Apapa)',c:'NG',r:'Batı Afrika',code:'LOS'},{n:'Tema',c:'GH',r:'Batı Afrika',code:'TEM'},
  {n:'Mombasa',c:'KE',r:'Doğu Afrika',code:'MBA'},{n:'Dar es Salaam',c:'TZ',r:'Doğu Afrika',code:'DAR'},
  {n:'Alexandria',c:'EG',r:'Kuzey Afrika',code:'ALY'},{n:'Casablanca',c:'MA',r:'Kuzey Afrika',code:'CAS'},
  {n:'Tanger Med',c:'MA',r:'Kuzey Afrika',code:'TNG'},{n:'Djibouti',c:'DJ',r:'Doğu Afrika',code:'DJI'},
  {n:'Maputo',c:'MZ',r:'Güney Afrika',code:'MPM'},{n:'Luanda',c:'AO',r:'Batı Afrika',code:'LAD'},
  // Ek Asya & Ortadoğu
  {n:'Chittagong',c:'BD',r:'Güney Asya',code:'CGP'},{n:'Karachi',c:'PK',r:'Güney Asya',code:'KHI'},
  {n:'Mundra',c:'IN',r:'Güney Asya',code:'MUN'},{n:'Laem Chabang',c:'TH',r:'G.D. Asya',code:'LCB'},
  {n:'Ho Chi Minh',c:'VN',r:'G.D. Asya',code:'SGN'},{n:'Haiphong',c:'VN',r:'G.D. Asya',code:'HPH'},
  {n:'Jakarta (Tanjung Priok)',c:'ID',r:'G.D. Asya',code:'JKT'},{n:'Manila',c:'PH',r:'G.D. Asya',code:'MNL'},
  {n:'Muscat',c:'OM',r:'Körfez',code:'MCT'},{n:'Kuwait',c:'KW',r:'Körfez',code:'KWI'},
  {n:'Bandar Abbas',c:'IR',r:'Körfez',code:'BND'},{n:'Aqaba',c:'JO',r:'Kızıldeniz',code:'AQJ'},
  // Ek Avrupa & Amerika
  {n:'Genova',c:'IT',r:'Akdeniz',code:'GOA'},{n:'Marsilya',c:'FR',r:'Akdeniz',code:'MRS2'},
  {n:'Gdansk',c:'PL',r:'Baltık',code:'GDN'},{n:'Gothenburg',c:'SE',r:'Kuzey Avrupa',code:'GOT'},
  {n:'Savannah',c:'US',r:'K. Amerika',code:'SAV'},{n:'Houston',c:'US',r:'K. Amerika',code:'HOU'},
  {n:'Vancouver',c:'CA',r:'K. Amerika',code:'VAN'},{n:'Callao',c:'PE',r:'G. Amerika',code:'CLL'},
  {n:'Cartagena',c:'CO',r:'G. Amerika',code:'CTG'},{n:'Buenos Aires',c:'AR',r:'G. Amerika',code:'BUE'},
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

// loadNavlun / storeNavlun → database.js'te tanımlı (Firestore sync dahil)
// Fallback: database.js yüklenmemişse
var loadNavlun = window.loadNavlun || function() { try { var d=JSON.parse(localStorage.getItem('ak_navlun1')||'[]'); return Array.isArray(d)?d:[]; } catch(e){ return []; } };
var storeNavlun = window.storeNavlun || function(d) { localStorage.setItem('ak_navlun1',JSON.stringify(d.slice(0,500))); };

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

      // T2: Karşılaştırma skoru hesapla
      const fiyatlar = teklifler.filter(x=>x.durum!=='reddedildi').map(x=>+x.birimFiyat).filter(Boolean);
      const sureler  = teklifler.filter(x=>x.durum!=='reddedildi').map(x=>+x.transitSure).filter(Boolean);
      const minFiyat = fiyatlar.length ? Math.min(...fiyatlar) : null;
      const minSure  = sureler.length  ? Math.min(...sureler)  : null;
      const isEnFiyat = minFiyat && +n.birimFiyat === minFiyat;
      const isEnSure  = minSure  && +n.transitSure === minSure;

      html += '<div style="background:var(--sf);border:1.5px solid '+(isEn?'#3B6D11':'var(--b)')+';border-radius:10px;overflow:hidden;position:relative">'
        + '<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--b)">'
          + '<div>'
            + '<div style="font-size:13px;font-weight:600">'+(n.tasiyan||'—')+'</div>'
            + '<div style="font-size:11px;color:var(--t3);margin-top:2px">'+(n.aracTipi||tipCfg.l)+'</div>'
          + '</div>'
          + '<div style="text-align:right">'
            + '<div style="font-size:16px;font-weight:600;color:'+(isEn?'#3B6D11':'var(--t)')+'">'+( n.para||'USD')+' '+Number(n.birimFiyat||0).toLocaleString('tr-TR')+'</div>'
            + (isEn?'<div style="font-size:10px;font-weight:700;color:#3B6D11;background:rgba(59,109,17,.12);padding:1px 7px;border-radius:4px;display:inline-block">En iyi teklif</div>':'')
            + (isEnFiyat&&!isEn?'<div style="font-size:10px;color:#3B6D11">En ucuz</div>':'')
            + (isEnSure&&!isEn?'<div style="font-size:10px;color:#185FA5">En hizli</div>':'')
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
            + '<button onclick="openSatisTeklif('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px;color:var(--ac)">📤 Satış</button>'
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
  if (!from)    errs.push('Yükleme noktası');
  if (!to)      errs.push('Varış noktası');
  if (!fiyat)   errs.push('Birim fiyat');

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
    d.unshift({id:generateNumericId(), createdAt:ts, ...entry});
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
  const items = loadNavlun();
  if(!items.length){window.toast?.('Dışa aktarılacak teklif yok','err');return;}

  // XLSX kütüphanesi varsa kullan, yoksa CSV fallback
  if(typeof XLSX !== 'undefined') {
    // Yatay format: her güzergah bir grup, forwarderlar yan yana sütunlarda
    const grouped = {};
    items.forEach(function(n){
      var key = (n.tasimaTipi||'deniz')+'|'+(n.from||'?')+'→'+(n.to||'?');
      if(!grouped[key]) grouped[key]=[];
      grouped[key].push(n);
    });

    const allRows = [];
    // Başlık satırı (yatay)
    const maxTeklif = Math.max(...Object.values(grouped).map(function(g){return g.length;}));
    const baseHeaders = ['Güzergah','Taşıma Tipi'];
    const teklifHeaders = [];
    for(var i=1; i<=maxTeklif; i++){
      teklifHeaders.push('Forwarder '+i,'Taşıyıcı '+i,'Fiyat '+i,'Para '+i,'Transit '+i,'Free Time '+i,'ETD '+i,'Geçerlilik '+i,'Durum '+i);
    }
    allRows.push(baseHeaders.concat(teklifHeaders));

    Object.keys(grouped).forEach(function(key){
      var parts = key.split('|');
      var tip = parts[0];
      var route = parts[1]||key;
      var teklifler = grouped[key];
      var row = [route, tip];
      teklifler.forEach(function(n){
        row.push(
          n.teklifVeren||n.satici||'-',
          n.tasiyan||'-',
          n.birimFiyat||'-',
          n.para||'USD',
          n.transitSure ? n.transitSure+' gün' : '-',
          n.freetime ? n.freetime+' gün' : '-',
          n.etd||'-',
          n.gecerlilikBitis||'-',
          (NAVLUN_STATUS[n.durum]||{l:n.durum||'-'}).l
        );
      });
      allRows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(allRows);
    // Sütun genişlikleri
    ws['!cols'] = allRows[0].map(function(){ return {wch:18}; });
    // İlk satır kalın
    var range = XLSX.utils.decode_range(ws['!ref']||'A1');
    for(var c=range.s.c; c<=range.e.c; c++){
      var cell = ws[XLSX.utils.encode_cell({r:0,c:c})];
      if(cell) cell.s = {font:{bold:true}};
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Navlun Fiyat Listesi');
    XLSX.writeFile(wb, 'Navlun_Fiyat_'+new Date().toISOString().slice(0,10)+'.xlsx');
    window.toast?.('Excel indirildi ✓','ok');
  } else {
    // CSV fallback
    var csv = 'Guzergah,Tasima,Forwarder,Tasiyi,Fiyat,Para,Transit,ETD,Gecerlilik,Durum\n';
    items.forEach(function(n){
      csv += [
        (n.from||'-')+' → '+(n.to||'-'),
        n.tasimaTipi||'-', n.teklifVeren||n.satici||'-', n.tasiyan||'-',
        n.birimFiyat||'-', n.para||'USD',
        n.transitSure ? n.transitSure+' gün' : '-',
        n.etd||'-', n.gecerlilikBitis||'-',
        (NAVLUN_STATUS[n.durum]||{l:'-'}).l
      ].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',')+'\n';
    });
    var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Navlun_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    window.toast?.('CSV indirildi ✓','ok');
  }
}

// ── Panel inject ──────────────────────────────────────────────────
function _injectNavlunSection() {
  // Kargo v10 varsa inject etme — navlun-list zaten v10 panelinde mevcut
  if(document.getElementById('krg-tab-navlun')) return;
  const panel=document.getElementById('panel-kargo');
  if(!panel||document.getElementById('navlun-section')) return;

  const sec=document.createElement('div');
  sec.id='navlun-section'; sec.style.marginTop='20px';
  sec.innerHTML='<div style="background:var(--sf);border:1px solid var(--b);border-radius:8px;overflow:hidden">'

    // Header
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--b)">'
      +'<span style="font-size:13px;font-weight:500">Navlun Teklifleri</span>'
      +'<div style="display:flex;gap:6px">'
        +'<button class="btn btns" onclick="openNavlunCompare()" style="font-size:11px">⚖️ Karşılaştır</button>'
        +'<button class="btn btns" onclick="openNavlunTrend()" style="font-size:11px">📈 Trend</button>'
        +'<button class="btn btns" onclick="openNavlunPerformans()" style="font-size:11px">🏆 Skor</button>'
        +'<button class="btn btns" onclick="exportNavlunXlsx()" style="font-size:11px">Excel</button>'
        +'<button class="btn btnp" onclick="openNavlunModal(null)" style="font-size:12px">+ Teklif Ekle</button>'
      +'</div>'
    +'</div>'

    // SOL PANEL WRAPPER
    +'<div style="display:flex;min-height:500px">'
      +'<div style="width:180px;flex-shrink:0;background:#fff;border-right:1px solid #e5e5e5;padding:12px 8px">'
        +[['alis','📥 Alış Teklifleri'],['satis','📤 Satış Teklifleri'],['karsilastir','⚖️ Karşılaştır'],['trend','📈 Trend'],['limanlar','🗺️ Limanlar']].map(function(c){return '<button onclick="window._navNavClick?.(\''+c[0]+'\')" class="nvl-nav-btn" data-nav="'+c[0]+'" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;border-radius:8px;background:transparent;color:#333;font-weight:400;cursor:pointer;margin-bottom:4px;font-family:inherit;font-size:12px">'+c[1]+'</button>';}).join('')
      +'</div>'
      +'<div style="flex:1;overflow-y:auto">'

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
    +'</div></div>' // flex wrapper close
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

// ════════════════════════════════════════════════════════════════
// 1. NAVLUN SATIŞ TEKLİFİ
// ════════════════════════════════════════════════════════════════

const SATIS_KEY = 'ak_navlun_satis1';
function _loadSatis() { try { return JSON.parse(localStorage.getItem(SATIS_KEY)||'[]'); } catch { return []; } }
function _storeSatis(d) { localStorage.setItem(SATIS_KEY, JSON.stringify(d.slice(0,300))); }

function openSatisTeklif(alisId) {
  const alis = loadNavlun().find(x=>x.id===alisId);
  if (!alis) { window.toast?.('Alış teklifi bulunamadı','err'); return; }
  const old = document.getElementById('mo-nvl-satis'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-nvl-satis'; mo.style.zIndex='2100';
  mo.innerHTML = `<div class="moc" style="max-width:500px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">📤 Satış Teklifi Oluştur</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">Kaynak: ${escapeHtml(alis.from)} → ${escapeHtml(alis.to)} · ${alis.birimFiyat} ${alis.para}</div>
    </div>
    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="fg"><div class="fl">ALIŞ FİYATI</div>
          <div style="font-size:16px;font-weight:700;color:var(--t);font-family:'DM Mono',monospace">${alis.birimFiyat} ${alis.para}</div>
        </div>
        <div class="fg"><div class="fl">KAR MARJI</div>
          <div style="display:flex;gap:4px">
            <input type="number" class="fi" id="nvs-marj" value="15" min="0" step="0.1" style="flex:1" oninput="_nvsSatisCalc(${alis.birimFiyat})">
            <select class="fi" id="nvs-marj-tip" style="width:60px" onchange="_nvsSatisCalc(${alis.birimFiyat})">
              <option value="pct" selected>%</option>
              <option value="tl">${alis.para}</option>
            </select>
          </div>
        </div>
      </div>
      <div style="background:var(--al);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:10px;color:var(--ac);font-weight:600">SATIŞ FİYATI</div>
        <div style="font-size:24px;font-weight:800;color:var(--ac);font-family:'DM Mono',monospace" id="nvs-satis-fiyat">—</div>
        <div style="font-size:10px;color:var(--t3)" id="nvs-kar-tutar">—</div>
      </div>
      <div class="fg"><div class="fl">MÜŞTERİ ADI <span style="color:var(--rd)">*</span></div>
        <input class="fi" id="nvs-musteri" placeholder="Alıcı firma adı...">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="fg"><div class="fl">GEÇERLİLİK BAŞLANGIÇ</div><input type="date" class="fi" id="nvs-bas"></div>
        <div class="fg"><div class="fl">GEÇERLİLİK BİTİŞ</div><input type="date" class="fi" id="nvs-bit"></div>
      </div>
      <div class="fg"><div class="fl">NOT</div>
        <textarea class="fi" id="nvs-not" rows="2" style="resize:none" placeholder="Ek şartlar..."></textarea>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-nvl-satis').remove()">İptal</button>
      <button class="btn btns" onclick="_nvsSatisPreview(${alisId})">👁 Önizle</button>
      <button class="btn btnp" onclick="_nvsSatisSave(${alisId})">Kaydet</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _nvsSatisCalc(alis.birimFiyat); }, 10);
}

function _nvsSatisCalc(alisFiyat) {
  const marj = parseFloat(document.getElementById('nvs-marj')?.value||'0');
  const tip  = document.getElementById('nvs-marj-tip')?.value||'pct';
  const el   = document.getElementById('nvs-satis-fiyat');
  const kar  = document.getElementById('nvs-kar-tutar');
  if (!el) return;
  let satis, karTL;
  if (tip==='pct') { karTL = alisFiyat * marj / 100; satis = alisFiyat + karTL; }
  else { karTL = marj; satis = alisFiyat + marj; }
  el.textContent = satis.toFixed(2);
  if (kar) kar.textContent = 'Kar: ' + karTL.toFixed(2) + ' (' + (karTL/alisFiyat*100).toFixed(1) + '%)';
}

/**
 * Otomatik teklif ID üretir: TKF-2026-001 formatı.
 * Yıl + sıra numarası.
 * @returns {string}
 */
function _generateTeklifId() {
  const year = new Date().getFullYear();
  const prefix = 'TKF-' + year + '-';
  const existing = _loadSatis();
  const yearItems = existing.filter(function(s) { return (s.teklifId || '').startsWith(prefix); });
  var maxNum = 0;
  yearItems.forEach(function(s) {
    var num = parseInt((s.teklifId || '').replace(prefix, '')) || 0;
    if (num > maxNum) maxNum = num;
  });
  return prefix + String(maxNum + 1).padStart(3, '0');
}

function _nvsSatisSave(alisId) {
  const musteri = (document.getElementById('nvs-musteri')?.value||'').trim();
  if (!musteri) { window.toast?.('Müşteri adı zorunludur','err'); return; }
  const alis = loadNavlun().find(x=>x.id===alisId); if (!alis) return;
  const marj = parseFloat(document.getElementById('nvs-marj')?.value||'0');
  const tip  = document.getElementById('nvs-marj-tip')?.value||'pct';
  const satis = tip==='pct' ? alis.birimFiyat*(1+marj/100) : alis.birimFiyat+marj;
  const teklifId = _generateTeklifId();
  const d = _loadSatis();
  d.unshift({
    id: generateNumericId(), teklifId, alisId, musteri, satisFiyat: Math.round(satis*100)/100,
    alisFiyat: alis.birimFiyat, para: alis.para, marj, marjTip: tip,
    from: alis.from, to: alis.to, tasiyan: alis.tasiyan, tasimaTipi: alis.tasimaTipi,
    aracTipi: alis.aracTipi,
    gecBaslangic: document.getElementById('nvs-bas')?.value||'',
    gecBitis: document.getElementById('nvs-bit')?.value||'',
    not: (document.getElementById('nvs-not')?.value||'').trim(),
    createdBy: window.CU?.()?.id, createdAt: window.nowTs?.() || new Date().toISOString(),
  });
  _storeSatis(d);
  document.getElementById('mo-nvl-satis')?.remove();
  window.toast?.('Satış teklifi kaydedildi: ' + teklifId,'ok');
  window.logActivity?.('view','Navlun satış teklifi: '+teklifId+' '+musteri+' '+alis.from+'→'+alis.to);
}

function _nvsSatisPreview(alisId) {
  const alis = loadNavlun().find(x=>x.id===alisId); if (!alis) return;
  const musteri = (document.getElementById('nvs-musteri')?.value||'').trim() || '—';
  const satisFiyat = document.getElementById('nvs-satis-fiyat')?.textContent || '—';
  const bas = document.getElementById('nvs-bas')?.value||'';
  const bit = document.getElementById('nvs-bit')?.value||'';
  const not = (document.getElementById('nvs-not')?.value||'').trim();
  const teklifId = _generateTeklifId();
  const w = window.open('','_blank','width=700,height=800');
  w.document.write(`<!DOCTYPE html><html><head><title>Navlun Teklifi — ${teklifId}</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1a2e;max-width:650px;margin:0 auto}
    .hdr{border-bottom:3px solid #6366F1;padding-bottom:16px;margin-bottom:24px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
    .lbl{color:#6b7280;font-size:13px}.val{font-weight:600;font-size:13px}
    .price{font-size:28px;font-weight:800;color:#6366F1;text-align:center;padding:20px;background:#f5f3ff;border-radius:12px;margin:20px 0}
    .ft{margin-top:40px;border-top:2px solid #eee;padding-top:16px;font-size:11px;color:#9ca3af}
    @media print{button{display:none!important}}</style></head>
    <body>
    <div class="hdr">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div style="font-size:20px;font-weight:700">Duay Global LLC</div>
        <div style="font-size:12px;color:#6b7280">Navlun Fiyat Teklifi</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:700;color:#6366F1;font-family:monospace">${teklifId}</div>
        <div style="font-size:11px;color:#9ca3af">${new Date().toLocaleDateString('tr-TR')}</div></div>
      </div>
    </div>
    <div class="row"><span class="lbl">Müşteri</span><span class="val">${escapeHtml(musteri)}</span></div>
    <div class="row"><span class="lbl">Güzergah</span><span class="val">${escapeHtml(alis.from)} → ${escapeHtml(alis.to)}</span></div>
    <div class="row"><span class="lbl">Taşıma Tipi</span><span class="val">${(TASIMA_TIPLERI[alis.tasimaTipi]||{}).l||alis.tasimaTipi}</span></div>
    <div class="row"><span class="lbl">Konteyner / Araç</span><span class="val">${escapeHtml(alis.aracTipi||'—')}</span></div>
    <div class="row"><span class="lbl">Taşıyıcı / Armatör</span><span class="val">${escapeHtml(alis.tasiyan||'—')}</span></div>
    <div class="row"><span class="lbl">Transit Süre</span><span class="val">${alis.transitSure||'—'} gün</span></div>
    <div class="price">${satisFiyat} ${alis.para}</div>
    ${bas||bit ? `<div class="row"><span class="lbl">Geçerlilik</span><span class="val">${bas||'—'} — ${bit||'—'}</span></div>` : ''}
    ${not ? `<div class="row"><span class="lbl">Şartlar / Notlar</span><span class="val">${escapeHtml(not)}</span></div>` : ''}
    <div class="ft">
      <div>Teklif No: <b>${teklifId}</b> · Bu teklif bilgilendirme amaçlıdır.</div>
      <div style="margin-top:4px">Duay Global LLC · ${new Date().toLocaleDateString('tr-TR')}</div>
    </div>
    <div style="margin-top:20px"><button onclick="window.print()" style="padding:8px 20px;background:#6366F1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit">🖨 Yazdır / PDF</button></div>
    </body></html>`);
  w.document.close();
}
window.openSatisTeklif    = openSatisTeklif;
window._nvsSatisCalc      = _nvsSatisCalc;
window._nvsSatisSave      = _nvsSatisSave;
window._nvsSatisPreview   = _nvsSatisPreview;

// ════════════════════════════════════════════════════════════════
// 2. TEKLİF KARŞILAŞTIRMA
// ════════════════════════════════════════════════════════════════

function openNavlunCompare() {
  const items = loadNavlun().filter(n=>n.durum==='bekliyor'||n.durum==='onaylandi');
  if (items.length < 2) { window.toast?.('Karşılaştırma için en az 2 teklif gerekli','err'); return; }
  const old = document.getElementById('mo-nvl-compare'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-nvl-compare'; mo.style.zIndex='2100';

  // Aynı güzergah grupları
  const groups = {};
  items.forEach(n => {
    const key = (n.from||'')+'→'+(n.to||'');
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  // Sadece 2+ teklifli güzergahlar
  const compGroups = Object.entries(groups).filter(([,v])=>v.length>=2);

  const groupHTML = compGroups.length ? compGroups.map(([route, teklifler]) => {
    const minFiyat = Math.min(...teklifler.map(t=>t.birimFiyat||Infinity));
    const minTransit = Math.min(...teklifler.map(t=>t.transitSure||Infinity));
    return `<div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:8px">📍 ${escapeHtml(route)}</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr style="background:var(--s2)">
          <th style="padding:6px 10px;text-align:left;border:1px solid var(--b)">Taşıyıcı</th>
          <th style="padding:6px 10px;text-align:left;border:1px solid var(--b)">Forwarder</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid var(--b)">Fiyat</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid var(--b)">Para</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid var(--b)">Transit</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid var(--b)">Araç</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid var(--b)">Geçerlilik</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid var(--b)">İşlem</th>
        </tr>
        ${teklifler.map(t => {
          const isCheapest = t.birimFiyat === minFiyat;
          const isFastest  = t.transitSure === minTransit;
          const bg = isCheapest ? 'rgba(34,197,94,.08)' : (isFastest ? 'rgba(59,130,246,.06)' : '');
          return `<tr style="background:${bg}">
            <td style="padding:6px 10px;border:1px solid var(--b);font-weight:500">${escapeHtml(t.tasiyan||'—')}${isCheapest?' <span style="color:#22C55E;font-size:9px">★ En ucuz</span>':''}${isFastest&&!isCheapest?' <span style="color:#3B82F6;font-size:9px">⚡ En hızlı</span>':''}</td>
            <td style="padding:6px 10px;border:1px solid var(--b)">${escapeHtml(t.teklifVeren||t.satici||'—')}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:right;font-weight:700;font-family:'DM Mono',monospace;color:${isCheapest?'#22C55E':'var(--t)'}">${(t.birimFiyat||0).toLocaleString('tr-TR')}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:center">${t.para||'USD'}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:center;color:${isFastest?'#3B82F6':'var(--t)'};font-weight:${isFastest?'700':'400'}">${t.transitSure||'—'} gün${isFastest?' ⚡':''}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:center;font-size:10px">${t.aracTipi||'—'}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:center;font-size:10px;color:var(--t3)">${t.gecerlilikBitis||'—'}</td>
            <td style="padding:6px 10px;border:1px solid var(--b);text-align:center">
              <button onclick="openSatisTeklif(${t.id})" class="btn btns" style="font-size:10px;padding:2px 6px">📤 Satış</button>
            </td>
          </tr>`;
        }).join('')}
      </table></div>
    </div>`;
  }).join('') : '<div style="padding:24px;text-align:center;color:var(--t3)">Aynı güzergahta 2+ teklif yok — karşılaştırma yapılamıyor</div>';

  mo.innerHTML = `<div class="moc" style="max-width:700px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:700;color:var(--t)">⚖️ Teklif Karşılaştırma</span>
      <button onclick="document.getElementById('mo-nvl-compare').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:16px 20px;max-height:70vh;overflow-y:auto">${groupHTML}</div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-nvl-compare').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openNavlunCompare = openNavlunCompare;

// ════════════════════════════════════════════════════════════════
// 3. ADMIN/MANAGER ÖNERİLERİ (Kur Çevirisi + Trend + Skor)
// ════════════════════════════════════════════════════════════════

// 3a. Otomatik Kur Çevirisi
const NVL_RATES = { USD:1, EUR:0.92, TRY:32.5, GBP:0.79, CNY:7.25 }; // fallback oranlar

function nvlConvertCurrency(amount, fromCur, toCur) {
  const rates = window._liveRates || NVL_RATES;
  const inUsd = amount / (rates[fromCur]||1);
  return Math.round(inUsd * (rates[toCur]||1) * 100) / 100;
}
window.nvlConvertCurrency = nvlConvertCurrency;

// 3b. Navlun Trend Grafiği — konteyner tipine göre filtreli çizgi grafik
function openNavlunTrend() {
  const items = loadNavlun();
  // Konteyner/araç tiplerini topla
  const aracTipleri = [];
  items.forEach(function(n) { if (n.aracTipi && aracTipleri.indexOf(n.aracTipi) === -1) aracTipleri.push(n.aracTipi); });

  const old = document.getElementById('mo-nvl-trend'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-nvl-trend'; mo.style.zIndex='2100';
  mo.innerHTML = `<div class="moc" style="max-width:600px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:15px;font-weight:700;color:var(--t)">📈 Navlun Fiyat Trendi</div>
      <button onclick="document.getElementById('mo-nvl-trend').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid var(--b);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--t3)">Konteyner/Araç:</span>
      <select id="nvl-trend-arac" onchange="window._nvlRenderTrend?.()" class="fi" style="font-size:11px;padding:4px 8px;min-width:160px">
        <option value="">Tümü</option>
        ${aracTipleri.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('')}
      </select>
    </div>
    <div id="nvl-trend-chart" style="padding:20px"></div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-nvl-trend').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); window._nvlRenderTrend?.(); }, 10);
}

/**
 * Trend çizgi grafiğini render eder (CSS ile).
 */
window._nvlRenderTrend = function() {
  const cont = document.getElementById('nvl-trend-chart');
  if (!cont) return;
  const aracF = document.getElementById('nvl-trend-arac')?.value || '';
  const items = loadNavlun();
  const now   = new Date();
  const months = [];

  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var label = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()];
    var monthItems = items.filter(function(n) {
      if (!(n.createdAt || '').startsWith(key)) return false;
      if (aracF && n.aracTipi !== aracF) return false;
      return true;
    });
    var avg = monthItems.length ? Math.round(monthItems.reduce(function(a, n) { return a + (n.birimFiyat || 0); }, 0) / monthItems.length) : 0;
    var min = monthItems.length ? Math.min.apply(null, monthItems.map(function(n) { return n.birimFiyat || Infinity; })) : 0;
    var max = monthItems.length ? Math.max.apply(null, monthItems.map(function(n) { return n.birimFiyat || 0; })) : 0;
    months.push({ key: key, label: label, count: monthItems.length, avg: avg, min: min === Infinity ? 0 : min, max: max });
  }

  var maxVal = Math.max.apply(null, months.map(function(m) { return m.max || m.avg; }).concat([1]));
  var chartH = 160;

  // Çizgi grafik — SVG polyline ile
  var points = [];
  var dotHTML = '';
  var w = 100; // SVG viewBox genişliği (%)
  months.forEach(function(m, idx) {
    if (m.avg > 0) {
      var x = (idx / (months.length - 1)) * 100;
      var y = chartH - (m.avg / maxVal * (chartH - 20)) - 10;
      points.push(x + ',' + y);
      dotHTML += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#6366F1" stroke="#fff" stroke-width="2"/>';
      dotHTML += '<text x="' + x + '" y="' + (y - 10) + '" text-anchor="middle" font-size="9" font-weight="700" fill="var(--t)">$' + m.avg + '</text>';
    }
  });

  var svgLine = points.length >= 2
    ? '<polyline points="' + points.join(' ') + '" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    : '';

  // Min-max aralık (gölgeli alan)
  var areaUp = [];
  var areaDn = [];
  months.forEach(function(m, idx) {
    var x = (idx / (months.length - 1)) * 100;
    if (m.max > 0) {
      areaUp.push(x + ',' + (chartH - (m.max / maxVal * (chartH - 20)) - 10));
      areaDn.unshift(x + ',' + (chartH - ((m.min || m.avg) / maxVal * (chartH - 20)) - 10));
    }
  });
  var areaSVG = areaUp.length >= 2
    ? '<polygon points="' + areaUp.concat(areaDn).join(' ') + '" fill="rgba(99,102,241,.08)" stroke="none"/>'
    : '';

  cont.innerHTML = ''
    + '<div style="position:relative;height:' + chartH + 'px;margin-bottom:8px">'
      + '<svg viewBox="0 0 100 ' + chartH + '" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">'
        + areaSVG + svgLine + dotHTML
      + '</svg>'
    + '</div>'
    // X ekseni etiketleri
    + '<div style="display:flex;justify-content:space-between;margin-bottom:16px">'
      + months.map(function(m) {
          return '<div style="text-align:center;font-size:10px">'
            + '<div style="color:var(--t3)">' + m.label + '</div>'
            + '<div style="font-size:9px;color:var(--t3)">' + m.count + ' teklif</div>'
          + '</div>';
        }).join('')
    + '</div>'
    // Detay tablosu
    + '<div style="border:1px solid var(--b);border-radius:8px;overflow:hidden">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;padding:6px 10px;background:var(--s2);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--b)">'
        + '<div>Ay</div><div style="text-align:right">Ort.</div><div style="text-align:right">Min</div><div style="text-align:right">Maks</div><div style="text-align:right">Adet</div>'
      + '</div>'
      + months.map(function(m, idx) {
          var bg = idx % 2 === 0 ? 'var(--sf)' : 'var(--s2)';
          return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;padding:5px 10px;font-size:11px;background:' + bg + ';border-bottom:1px solid var(--b)">'
            + '<div style="color:var(--t)">' + m.label + '</div>'
            + '<div style="text-align:right;font-weight:600;color:var(--t);font-family:monospace">' + (m.avg ? '$' + m.avg : '—') + '</div>'
            + '<div style="text-align:right;color:#22C55E;font-family:monospace">' + (m.min ? '$' + m.min : '—') + '</div>'
            + '<div style="text-align:right;color:#EF4444;font-family:monospace">' + (m.max ? '$' + m.max : '—') + '</div>'
            + '<div style="text-align:right;color:var(--t3)">' + m.count + '</div>'
          + '</div>';
        }).join('')
    + '</div>';
};

window.openNavlunTrend = openNavlunTrend;

// 3c. Tedarikçi Performans Skoru
function openNavlunPerformans() {
  const items = loadNavlun();
  const byCarrier = {};
  items.forEach(n => {
    const key = n.tasiyan || 'Bilinmeyen';
    if (!byCarrier[key]) byCarrier[key] = { total:0, approved:0, rejected:0, expired:0, avgTransit:0, transitSum:0, transitCount:0 };
    byCarrier[key].total++;
    if (n.durum==='onaylandi') byCarrier[key].approved++;
    if (n.durum==='reddedildi') byCarrier[key].rejected++;
    if (n.durum==='suresi_gec') byCarrier[key].expired++;
    if (n.transitSure) { byCarrier[key].transitSum += n.transitSure; byCarrier[key].transitCount++; }
  });
  const sorted = Object.entries(byCarrier).map(([name, s]) => {
    s.avgTransit = s.transitCount ? Math.round(s.transitSum / s.transitCount) : 0;
    s.score = s.total ? Math.round((s.approved / s.total) * 100) : 0;
    return { name, ...s };
  }).sort((a,b) => b.score - a.score);

  const old = document.getElementById('mo-nvl-perf'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-nvl-perf'; mo.style.zIndex='2100';
  mo.innerHTML = `<div class="moc" style="max-width:520px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">🏆 Tedarikçi Performans Skoru</div>
    </div>
    <div style="padding:8px 20px;max-height:60vh;overflow-y:auto">
      ${sorted.length ? sorted.map((s,i) => {
        const color = s.score >= 80 ? '#22C55E' : s.score >= 50 ? '#F59E0B' : '#EF4444';
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
          <div style="width:24px;font-size:12px;font-weight:700;color:var(--t3);text-align:center">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--t)">${escapeHtml(s.name)}</div>
            <div style="font-size:10px;color:var(--t3)">${s.total} teklif · Ort. ${s.avgTransit} gün transit</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:${color}">${s.score}%</div>
            <div style="font-size:9px;color:var(--t3)">${s.approved}✓ ${s.rejected}✗ ${s.expired}⏰</div>
          </div>
        </div>`;
      }).join('') : '<div style="padding:24px;text-align:center;color:var(--t3)">Henüz veri yok</div>'}
    </div>
    <div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">
      <button class="btn" onclick="document.getElementById('mo-nvl-perf').remove()">Kapat</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openNavlunPerformans = openNavlunPerformans;

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
  window.openSatisTeklif         = openSatisTeklif;
  window.openNavlunCompare       = openNavlunCompare;
  window.openNavlunTrend         = openNavlunTrend;
  window.openNavlunPerformans    = openNavlunPerformans;
  window.nvlConvertCurrency      = nvlConvertCurrency;
  // Navlun hazır — bekleyen modülleri bilgilendir
  window._navNavClick = function(cat) {
    window._navActiveCat = cat;
    if (cat === 'karsilastir') openNavlunCompare();
    else if (cat === 'trend') openNavlunTrend();
    document.querySelectorAll('.nvl-nav-btn').forEach(function(b) {
      var active = b.dataset.nav === cat;
      b.style.background = active ? '#EBF2FF' : 'transparent';
      b.style.color = active ? '#007AFF' : '#333';
      b.style.fontWeight = active ? '600' : '400';
    });
  };
  try { window.dispatchEvent(new CustomEvent('navlun-ready')); } catch(e) {}
}
