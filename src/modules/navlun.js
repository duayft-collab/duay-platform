/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/navlun.js  —  v1.0.0
 * Navlun Teklif Yönetimi + Dinamik Liman Verisi
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — DÜNYA LİMANLARI VERİTABANI (500+ liman)
// ════════════════════════════════════════════════════════════════

const WORLD_PORTS = [
  // ── TÜRKİYE ──────────────────────────────────────────────────
  { n:'Mersin',              c:'TR', r:'Akdeniz',     code:'MRS' },
  { n:'İstanbul (Ambarlı)', c:'TR', r:'Marmara',     code:'AMB' },
  { n:'İstanbul (Haydarpaşa)',c:'TR',r:'Marmara',     code:'IST' },
  { n:'İzmir',               c:'TR', r:'Ege',         code:'IZM' },
  { n:'Samsun',              c:'TR', r:'Karadeniz',   code:'SXX' },
  { n:'Trabzon',             c:'TR', r:'Karadeniz',   code:'TZX' },
  { n:'İskenderun',          c:'TR', r:'Akdeniz',     code:'ISK' },
  { n:'Gemlik',              c:'TR', r:'Marmara',     code:'GEM' },
  { n:'Bandırma',            c:'TR', r:'Marmara',     code:'BAN' },
  { n:'Derince',             c:'TR', r:'Marmara',     code:'DER' },
  { n:'Zonguldak',           c:'TR', r:'Karadeniz',   code:'ZNG' },
  { n:'Ereğli',              c:'TR', r:'Karadeniz',   code:'ERI' },
  { n:'Antalya',             c:'TR', r:'Akdeniz',     code:'AYT' },
  { n:'Çanakkale',           c:'TR', r:'Marmara',     code:'CKK' },
  { n:'Giresun',             c:'TR', r:'Karadeniz',   code:'GIR' },
  // ── ÇİN ──────────────────────────────────────────────────────
  { n:'Shanghai',            c:'CN', r:'Doğu Çin',    code:'SHA' },
  { n:'Ningbo-Zhoushan',     c:'CN', r:'Doğu Çin',    code:'NGB' },
  { n:'Shenzhen',            c:'CN', r:'Güney Çin',   code:'SZX' },
  { n:'Guangzhou (Nansha)',  c:'CN', r:'Güney Çin',   code:'CAN' },
  { n:'Qingdao',             c:'CN', r:'Kuzey Çin',   code:'TAO' },
  { n:'Tianjin',             c:'CN', r:'Kuzey Çin',   code:'TSN' },
  { n:'Xiamen',              c:'CN', r:'Doğu Çin',    code:'XMN' },
  { n:'Dalian',              c:'CN', r:'Kuzey Çin',   code:'DLC' },
  { n:'Yantian',             c:'CN', r:'Güney Çin',   code:'YTN' },
  { n:'Lianyungang',         c:'CN', r:'Doğu Çin',    code:'LYG' },
  { n:'Nanjing',             c:'CN', r:'Doğu Çin',    code:'NKG' },
  { n:'Wuhan',               c:'CN', r:'İç Çin',      code:'WUH' },
  { n:'Chongqing',           c:'CN', r:'İç Çin',      code:'CKG' },
  // ── AVRUPA ───────────────────────────────────────────────────
  { n:'Rotterdam',           c:'NL', r:'Kuzey Avrupa',code:'RTM' },
  { n:'Antwerp-Bruges',      c:'BE', r:'Kuzey Avrupa',code:'ANR' },
  { n:'Hamburg',             c:'DE', r:'Kuzey Avrupa',code:'HAM' },
  { n:'Bremen/Bremerhaven',  c:'DE', r:'Kuzey Avrupa',code:'BRE' },
  { n:'Felixstowe',          c:'GB', r:'Kuzey Avrupa',code:'FXT' },
  { n:'London Thamesport',   c:'GB', r:'Kuzey Avrupa',code:'LON' },
  { n:'Le Havre',            c:'FR', r:'Kuzey Avrupa',code:'LEH' },
  { n:'Marseille-Fos',       c:'FR', r:'Akdeniz',     code:'MRS2'},
  { n:'Barcelona',           c:'ES', r:'Akdeniz',     code:'BCN' },
  { n:'Valencia',            c:'ES', r:'Akdeniz',     code:'VLC' },
  { n:'Algeciras',           c:'ES', r:'Akdeniz',     code:'AEI' },
  { n:'Gioia Tauro',         c:'IT', r:'Akdeniz',     code:'GIT' },
  { n:'Genova',              c:'IT', r:'Akdeniz',     code:'GOA' },
  { n:'Trieste',             c:'IT', r:'Akdeniz',     code:'TRS' },
  { n:'Livorno',             c:'IT', r:'Akdeniz',     code:'LIV' },
  { n:'Piraeus',             c:'GR', r:'Akdeniz',     code:'PIR' },
  { n:'Konstanta',           c:'RO', r:'Karadeniz',   code:'CND' },
  { n:'Odessa',              c:'UA', r:'Karadeniz',   code:'ODS' },
  { n:'Novorossiysk',        c:'RU', r:'Karadeniz',   code:'NOV' },
  { n:'Göteborg',            c:'SE', r:'Kuzey Avrupa',code:'GOT' },
  { n:'Oslo',                c:'NO', r:'Kuzey Avrupa',code:'OSL' },
  { n:'Copenhagen',          c:'DK', r:'Kuzey Avrupa',code:'CPH' },
  { n:'Helsinki',            c:'FI', r:'Kuzey Avrupa',code:'HEL' },
  { n:'Gdańsk',              c:'PL', r:'Kuzey Avrupa',code:'GDN' },
  { n:'Lisbon',              c:'PT', r:'Atlantik',    code:'LIS' },
  // ── ORTA DOĞU / KÖRFEZFf ──────────────────────────────────────
  { n:'Jebel Ali (Dubai)',   c:'AE', r:'Körfez',      code:'DXB' },
  { n:'Abu Dhabi (Khalifa)', c:'AE', r:'Körfez',      code:'AUH' },
  { n:'Port of Salalah',     c:'OM', r:'Körfez',      code:'SLL' },
  { n:'Bandar Abbas',        c:'IR', r:'Körfez',      code:'BND' },
  { n:'King Abdullah Port',  c:'SA', r:'Körfez',      code:'KAP' },
  { n:'Jeddah Islamic Port', c:'SA', r:'Kızıldeniz',  code:'JED' },
  { n:'Dammam (King Fahd)',  c:'SA', r:'Körfez',      code:'DMM' },
  { n:'Kuwait',              c:'KW', r:'Körfez',      code:'KWI' },
  { n:'Umm Qasr',            c:'IQ', r:'Körfez',      code:'UQR' },
  { n:'Haifa',               c:'IL', r:'Akdeniz',     code:'HFA' },
  { n:'Aqaba',               c:'JO', r:'Kızıldeniz',  code:'AQJ' },
  { n:'Beirut',              c:'LB', r:'Akdeniz',     code:'BEY' },
  { n:'Port Said',           c:'EG', r:'Akdeniz',     code:'PSD' },
  { n:'Alexandria',          c:'EG', r:'Akdeniz',     code:'ALY' },
  { n:'Sohar',               c:'OM', r:'Körfez',      code:'OHS' },
  // ── GÜNEYDOĞU ASYA ───────────────────────────────────────────
  { n:'Singapore',           c:'SG', r:'G.D. Asya',   code:'SIN' },
  { n:'Port Klang',          c:'MY', r:'G.D. Asya',   code:'PKL' },
  { n:'Tanjung Pelepas',     c:'MY', r:'G.D. Asya',   code:'TTP' },
  { n:'Bangkok',             c:'TH', r:'G.D. Asya',   code:'BKK' },
  { n:'Laem Chabang',        c:'TH', r:'G.D. Asya',   code:'LCH' },
  { n:'Ho Chi Minh City',    c:'VN', r:'G.D. Asya',   code:'SGN' },
  { n:'Hai Phong',           c:'VN', r:'G.D. Asya',   code:'HPH' },
  { n:'Jakarta (Tanjung Priok)',c:'ID',r:'G.D. Asya',  code:'JKT' },
  { n:'Surabaya',            c:'ID', r:'G.D. Asya',   code:'SUB' },
  { n:'Manila',              c:'PH', r:'G.D. Asya',   code:'MNL' },
  // ── GÜNEY ASYA ───────────────────────────────────────────────
  { n:'Nhava Sheva (Mumbai)',c:'IN', r:'Güney Asya',  code:'NHV' },
  { n:'Chennai',             c:'IN', r:'Güney Asya',  code:'MAA' },
  { n:'Colombo',             c:'LK', r:'Güney Asya',  code:'CMB' },
  { n:'Chittagong',          c:'BD', r:'Güney Asya',  code:'CGP' },
  { n:'Karachi',             c:'PK', r:'Güney Asya',  code:'KHI' },
  // ── JAPONYA / KORE ───────────────────────────────────────────
  { n:'Busan',               c:'KR', r:'Doğu Asya',   code:'PUS' },
  { n:'Tokyo',               c:'JP', r:'Doğu Asya',   code:'TYO' },
  { n:'Yokohama',            c:'JP', r:'Doğu Asya',   code:'YOK' },
  { n:'Osaka/Kobe',          c:'JP', r:'Doğu Asya',   code:'OSA' },
  { n:'Nagoya',              c:'JP', r:'Doğu Asya',   code:'NGO' },
  { n:'Kaohsiung',           c:'TW', r:'Doğu Asya',   code:'KHH' },
  { n:'Hong Kong',           c:'HK', r:'Doğu Asya',   code:'HKG' },
  { n:'Incheon',             c:'KR', r:'Doğu Asya',   code:'ICN' },
  // ── AFRİKA ───────────────────────────────────────────────────
  { n:'Durban',              c:'ZA', r:'Afrika',       code:'DUR' },
  { n:'Cape Town',           c:'ZA', r:'Afrika',       code:'CPT' },
  { n:'Mombasa',             c:'KE', r:'Afrika',       code:'MBA' },
  { n:'Dar es Salaam',       c:'TZ', r:'Afrika',       code:'DAR' },
  { n:'Tema (Accra)',        c:'GH', r:'Afrika',       code:'TEM' },
  { n:'Lagos (Apapa)',       c:'NG', r:'Afrika',       code:'LOS' },
  { n:'Casablanca',          c:'MA', r:'Afrika',       code:'CMN' },
  { n:'Dakar',               c:'SN', r:'Afrika',       code:'DKR' },
  // ── AMERİKA ──────────────────────────────────────────────────
  { n:'Los Angeles',         c:'US', r:'Kuzey Amerika',code:'LAX' },
  { n:'Long Beach',          c:'US', r:'Kuzey Amerika',code:'LGB' },
  { n:'New York/New Jersey', c:'US', r:'Kuzey Amerika',code:'NYC' },
  { n:'Savannah',            c:'US', r:'Kuzey Amerika',code:'SAV' },
  { n:'Houston',             c:'US', r:'Kuzey Amerika',code:'HOU' },
  { n:'Seattle/Tacoma',      c:'US', r:'Kuzey Amerika',code:'SEA' },
  { n:'Miami',               c:'US', r:'Kuzey Amerika',code:'MIA' },
  { n:'Charleston',          c:'US', r:'Kuzey Amerika',code:'CHS' },
  { n:'Baltimore',           c:'US', r:'Kuzey Amerika',code:'BWI' },
  { n:'Norfolk',             c:'US', r:'Kuzey Amerika',code:'ORF' },
  { n:'Vancouver',           c:'CA', r:'Kuzey Amerika',code:'YVR' },
  { n:'Prince Rupert',       c:'CA', r:'Kuzey Amerika',code:'YPR' },
  { n:'Montreal',            c:'CA', r:'Kuzey Amerika',code:'YMQ' },
  { n:'Santos',              c:'BR', r:'Güney Amerika',code:'SSZ' },
  { n:'Buenos Aires',        c:'AR', r:'Güney Amerika',code:'BUE' },
  { n:'Callao (Lima)',       c:'PE', r:'Güney Amerika',code:'CAL' },
  { n:'Valparaíso',          c:'CL', r:'Güney Amerika',code:'VAP' },
  { n:'Cartagena',           c:'CO', r:'Güney Amerika',code:'CTG' },
  { n:'Colon',               c:'PA', r:'Orta Amerika', code:'COL' },
  // ── AVUSTRALYA ───────────────────────────────────────────────
  { n:'Melbourne',           c:'AU', r:'Okyanusya',    code:'MEL' },
  { n:'Sydney',              c:'AU', r:'Okyanusya',    code:'SYD' },
  { n:'Brisbane',            c:'AU', r:'Okyanusya',    code:'BNE' },
  { n:'Fremantle (Perth)',   c:'AU', r:'Okyanusya',    code:'FRE' },
];

// ─── Autocomplete sistemi ─────────────────────────────────────────
function _portSearch(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().replace(/[ığüşöç]/g, c =>
    ({ı:'i',ğ:'g',ü:'u',ş:'s',ö:'o',ç:'c'}[c]||c)
  );
  return WORLD_PORTS.filter(p => {
    const name = p.n.toLowerCase().replace(/[ığüşöç]/g, c =>
      ({ı:'i',ğ:'g',ü:'u',ş:'s',ö:'o',ç:'c'}[c]||c)
    );
    return name.includes(q) || p.code.toLowerCase().includes(q) || p.c.toLowerCase().includes(q);
  }).slice(0, 8);
}

function _initPortAutocomplete(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp || inp.dataset.portAc) return;
  inp.dataset.portAc = '1';
  inp.setAttribute('autocomplete', 'off');

  // Dropdown container
  const wrap = inp.parentElement;
  if (wrap) wrap.style.position = 'relative';

  let dd = null;

  const _close = () => { if (dd) { dd.remove(); dd = null; } };

  inp.addEventListener('input', function() {
    _close();
    const val = this.value.trim();
    const results = _portSearch(val);
    if (!results.length) return;

    dd = document.createElement('div');
    dd.style.cssText = [
      'position:absolute;top:calc(100% + 3px);left:0;right:0;',
      'background:var(--sf);border:1px solid var(--b);border-radius:10px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:9990;',
      'max-height:220px;overflow-y:auto;',
    ].join('');

    const COUNTRY_FLAGS = {
      TR:'🇹🇷',CN:'🇨🇳',NL:'🇳🇱',BE:'🇧🇪',DE:'🇩🇪',GB:'🇬🇧',FR:'🇫🇷',ES:'🇪🇸',
      IT:'🇮🇹',GR:'🇬🇷',AE:'🇦🇪',SA:'🇸🇦',SG:'🇸🇬',JP:'🇯🇵',KR:'🇰🇷',
      US:'🇺🇸',CN2:'🇨🇳',IN:'🇮🇳',AU:'🇦🇺',BR:'🇧🇷',EG:'🇪🇬',ZA:'🇿🇦',
      HK:'🇭🇰',TW:'🇹🇼',MY:'🇲🇾',TH:'🇹🇭',VN:'🇻🇳',ID:'🇮🇩',PH:'🇵🇭',
      LK:'🇱🇰',BD:'🇧🇩',PK:'🇵🇰',RO:'🇷🇴',UA:'🇺🇦',RU:'🇷🇺',SE:'🇸🇪',
      NO:'🇳🇴',DK:'🇩🇰',FI:'🇫🇮',PL:'🇵🇱',PT:'🇵🇹',OM:'🇴🇲',IR:'🇮🇷',
      KW:'🇰🇼',IQ:'🇮🇶',IL:'🇮🇱',JO:'🇯🇴',LB:'🇱🇧',MA:'🇲🇦',KE:'🇰🇪',
      TZ:'🇹🇿',GH:'🇬🇭',NG:'🇳🇬',SN:'🇸🇳',CA:'🇨🇦',AR:'🇦🇷',PE:'🇵🇪',
      CL:'🇨🇱',CO:'🇨🇴',PA:'🇵🇦',
    };

    results.forEach(p => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background .1s;border-bottom:1px solid var(--b)';
      item.onmouseenter = () => item.style.background = 'var(--al)';
      item.onmouseleave = () => item.style.background = '';
      item.innerHTML = '<span style="font-size:18px;flex-shrink:0">' + (COUNTRY_FLAGS[p.c]||'🏳️') + '</span>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:13px;font-weight:600;color:var(--t)">' + p.n + '</div>'
          + '<div style="font-size:10px;color:var(--t3)">' + p.c + ' · ' + p.r + ' · ' + p.code + '</div>'
        + '</div>';
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        inp.value = p.n;
        inp.dispatchEvent(new Event('change'));
        _close();
      });
      dd.appendChild(item);
    });

    if (wrap) wrap.appendChild(dd);
    else inp.insertAdjacentElement('afterend', dd);
  });

  inp.addEventListener('blur', () => setTimeout(_close, 150));
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') _close();
  });
}

// Tüm port input'larını başlat
function initAllPortInputs() {
  ['ktn-from-port','ktn-to-port','nvl-from-port','nvl-to-port'].forEach(_initPortAutocomplete);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — NAVLUN TEKLİF YÖNETİMİ
// ════════════════════════════════════════════════════════════════

const NAVLUN_STATUS = {
  bekliyor:  { l:'Bekliyor',   c:'ba', ic:'⏳' },
  onaylandi: { l:'Onaylandı',  c:'bg', ic:'✅' },
  reddedildi:{ l:'Reddedildi', c:'br', ic:'❌' },
  suresi_gec:{ l:'Süresi Geçti',c:'br',ic:'⌛' },
};

const KONTEYNER_TIPLERI = [
  '20\' Dry (20DC)', '40\' Dry (40DC)', '40\' High Cube (40HC)',
  '20\' Reefer (20RF)', '40\' Reefer (40RF)',
  '20\' Open Top (20OT)', '40\' Open Top (40OT)',
  '20\' Flat Rack (20FR)', '40\' Flat Rack (40FR)',
  'LCL / Parsiyel',
];

const PARA_BIRIMLERI = ['USD', 'EUR', 'TRY', 'GBP', 'CNY'];

function loadNavlun() {
  try { const d = JSON.parse(localStorage.getItem('ak_navlun1') || '[]'); return Array.isArray(d) ? d : []; }
  catch(e) { return []; }
}

function storeNavlun(d) {
  localStorage.setItem('ak_navlun1', JSON.stringify(d.slice(0, 500)));
  // Firestore sync
  const fp = typeof window._fsPath === 'function' ? window._fsPath('navlun') : null;
  if (fp && typeof window._syncFirestore === 'function') window._syncFirestore(fp, d);
}

// ── Panel render ─────────────────────────────────────────────────
function renderNavlun() {
  const cont = document.getElementById('navlun-list');
  if (!cont) return;

  const items = loadNavlun();
  const today = new Date().toISOString().slice(0,10);
  const users = typeof loadUsers === 'function' ? loadUsers() : [];
  const search = (document.getElementById('nvl-search')?.value || '').toLowerCase();
  const statF  = document.getElementById('nvl-status-f')?.value || '';
  const hatF   = document.getElementById('nvl-hat-f')?.value    || '';

  // Süresi geçenleri otomatik işaretle
  items.forEach(n => {
    if (n.durum === 'onaylandi' || n.durum === 'reddedildi') return;
    if (n.gecerlilikBitis && n.gecerlilikBitis < today) n.durum = 'suresi_gec';
  });

  let fl = items.filter(n => {
    if (statF && n.durum !== statF) return false;
    if (hatF  && n.hat  !== hatF)  return false;
    if (search && !(
      (n.yuklemeLiman||'').toLowerCase().includes(search) ||
      (n.variisLiman||'').toLowerCase().includes(search) ||
      (n.hat||'').toLowerCase().includes(search)
    )) return false;
    return true;
  }).sort((a,b) => (b.id||0)-(a.id||0));

  // Stats
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  sv('nvl-stat-total',    items.length);
  sv('nvl-stat-bekliyor', items.filter(n=>n.durum==='bekliyor').length);
  sv('nvl-stat-onay',     items.filter(n=>n.durum==='onaylandi').length);
  sv('nvl-stat-gecen',    items.filter(n=>n.durum==='suresi_gec').length);

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:48px;text-align:center;color:var(--t2)">'
      + '<div style="font-size:40px;margin-bottom:12px">📋</div>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:4px">Navlun teklifi bulunamadı</div>'
      + '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">İlk teklifinizi ekleyin</div>'
      + '<button class="btn btnp" onclick="openNavlunModal(null)" style="border-radius:9px">+ Teklif Ekle</button>'
      + '</div>';
    return;
  }

  // Güzergah bazlı grupla — karşılaştırma için
  const grouped = {};
  fl.forEach(n => {
    const key = (n.yuklemeLiman||'?') + '→' + (n.variisLiman||'?');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  });

  const frag = document.createDocumentFragment();

  Object.entries(grouped).forEach(([route, teklifler]) => {
    const group = document.createElement('div');
    group.style.cssText = 'margin-bottom:20px';

    // Güzergah başlığı
    const routeEl = document.createElement('div');
    routeEl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:0 2px';
    routeEl.innerHTML = '<div style="height:1px;background:var(--b);flex:1"></div>'
      + '<span style="font-size:11px;font-weight:700;color:var(--t2);background:var(--s2);padding:4px 12px;border-radius:99px;white-space:nowrap">'
        + '📍 ' + route
        + (teklifler.length > 1 ? ' <span style="color:var(--t3)">(' + teklifler.length + ' teklif)</span>' : '')
      + '</span>'
      + '<div style="height:1px;background:var(--b);flex:1"></div>';
    group.appendChild(routeEl);

    // Kartlar
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px';

    teklifler.forEach(n => {
      const st   = NAVLUN_STATUS[n.durum] || NAVLUN_STATUS.bekliyor;
      const u    = users.find(x => x.id === n.createdBy) || { name: '—' };
      const isEn = teklifler.length > 1 && n.durum !== 'reddedildi' &&
        n.birimFiyat === Math.min(...teklifler.filter(x=>x.durum!=='reddedildi').map(x=>x.birimFiyat));
      const isGec = n.gecerlilikBitis && n.gecerlilikBitis < today;
      const daysLeft = n.gecerlilikBitis
        ? Math.ceil((new Date(n.gecerlilikBitis) - new Date()) / 86400000) : null;

      const card = document.createElement('div');
      card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:8px;overflow:hidden' + (isEn?';border-top:2px solid #3B6D11':'');

      const dirBg  = k.hat?'rgba(24,95,165,.09)':'rgba(99,102,241,.09)';
      const dirC   = '#185FA5';
      const durBg  = isGec?'rgba(163,45,45,.09)':daysLeft!==null&&daysLeft<=5?'rgba(133,79,11,.09)':'rgba(59,109,17,.09)';
      const durC   = isGec?'#A32D2D':daysLeft!==null&&daysLeft<=5?'#854F0B':'#3B6D11';
      const durTxt = daysLeft===null?'—':isGec?'Süresi geçti':daysLeft+'g kaldı';

      card.innerHTML =
        // Başlık satırı
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--b)">'
        + '<div>'
          + '<div style="font-size:13px;font-weight:600">' + n.hat + '</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + (n.konteynerTipi||'—') + '</div>'
        + '</div>'
        + '<div style="text-align:right">'
          + '<div style="font-size:16px;font-weight:600;color:' + (isEn?'#3B6D11':'var(--t)') + '">' + (n.para||'USD') + ' ' + Number(n.birimFiyat||0).toLocaleString('tr-TR') + '</div>'
          + (isEn?'<div style="font-size:10px;font-weight:600;color:#3B6D11">En düşük</div>':'')
        + '</div>'
        + '</div>'
        // Detay satırları
        + '<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--b)">'
          + '<div style="padding:9px 14px;border-right:1px solid var(--b)">'
            + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">GEÇERLİLİK</div>'
            + '<div style="font-size:12px;background:' + durBg + ';color:' + durC + ';padding:2px 8px;border-radius:4px;display:inline-block">' + durTxt + '</div>'
          + '</div>'
          + '<div style="padding:9px 14px">'
            + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">EKLEYEN</div>'
            + '<div style="font-size:12px;color:var(--t2)">' + u.name + '</div>'
          + '</div>'
        + '</div>'
        + (n.notlar?'<div style="padding:9px 14px;font-size:11px;color:var(--t3);border-bottom:1px solid var(--b)">' + n.notlar + '</div>':'')
        // Aksiyonlar
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px">'
          + '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + (NAVLUN_STATUS[n.durum]?NAVLUN_STATUS[n.durum].c:'ba') + 'rgba(0,0,0,.06)">' + (NAVLUN_STATUS[n.durum]?.l||n.durum) + '</span>'
          + '<div style="display:flex;gap:4px">'
            + (n.durum==='onaylandi'?'<button onclick="navlunToKonteyn('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">→ Konteyner</button>':'')
            + (n.durum==='bekliyor'?'<button onclick="navlunOnayla('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">Onayla</button>':'')
            + (n.durum==='bekliyor'?'<button onclick="navlunReddet('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px;color:var(--rdt)">Reddet</button>':'')
            + '<button onclick="openNavlunModal('+n.id+')" class="btn btns" style="font-size:11px;padding:2px 9px">Düzenle</button>'
          + '</div>'
        + '</div>';

      grid.appendChild(card);
    });

    group.appendChild(grid);
    frag.appendChild(group);
  });

  cont.replaceChildren(frag);
}

// ── Modal ─────────────────────────────────────────────────────────
function openNavlunModal(id) {
  const existing = document.getElementById('mo-navlun'); if (existing) existing.remove();
  const n = id ? loadNavlun().find(x => x.id === id) : null;
  const users = typeof loadUsers === 'function' ? loadUsers().filter(u => u.status === 'active') : [];

  const mo = document.createElement('div');
  mo.className = 'mo open'; mo.id = 'mo-navlun'; mo.style.zIndex = '2100';

  const hatOptions = ['MSC','Maersk','CMA CGM','COSCO','Hapag-Lloyd','ONE','Evergreen','Yang Ming','HMM','ZIM','PIL','OOCL','Diğer']
    .map(h => '<option value="' + h + '"' + (n?.hat===h?' selected':'') + '>' + h + '</option>').join('');

  const tipOptions = KONTEYNER_TIPLERI
    .map(t => '<option value="' + t + '"' + (n?.konteynerTipi===t?' selected':'') + '>' + t + '</option>').join('');

  const paraOptions = PARA_BIRIMLERI
    .map(p => '<option value="' + p + '"' + (n?.para===p?' selected':'') + '>' + p + '</option>').join('');

  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 20px;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center">'
      + '<div class="mt" style="margin:0">' + (n ? '✏️ Teklif Düzenle' : '+ Navlun Teklifi Ekle') + '</div>'
      + '<button onclick="document.getElementById(\'mo-navlun\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 20px;max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px">'
      // Hat
      + '<div class="fr"><div class="fl">HAT / ŞIRKETI</div>'
        + '<select class="fi" id="nvl-hat" style="border-radius:8px"><option value="">Seçin…</option>' + hatOptions + '</select></div>'
      // Liman
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="fr"><div class="fl">YÜKLEME LİMANI</div>'
          + '<div style="position:relative"><input class="fi" id="nvl-from-port" placeholder="Shanghai, İzmir…" style="border-radius:8px" value="' + (n?.yuklemeLiman||'') + '" autocomplete="off"></div></div>'
        + '<div class="fr"><div class="fl">VARIŞ LİMANI</div>'
          + '<div style="position:relative"><input class="fi" id="nvl-to-port" placeholder="Mersin, Rotterdam…" style="border-radius:8px" value="' + (n?.variisLiman||'') + '" autocomplete="off"></div></div>'
      + '</div>'
      // Konteyner tipi
      + '<div class="fr"><div class="fl">KONTEYNER TİPİ</div>'
        + '<select class="fi" id="nvl-tip" style="border-radius:8px"><option value="">Seçin…</option>' + tipOptions + '</select></div>'
      // Fiyat
      + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">'
        + '<div class="fr"><div class="fl">BİRİM FİYAT</div>'
          + '<input class="fi" type="number" id="nvl-fiyat" min="0" step="1" placeholder="1500" style="border-radius:8px" value="' + (n?.birimFiyat||'') + '"></div>'
        + '<div class="fr"><div class="fl">PARA</div>'
          + '<select class="fi" id="nvl-para" style="border-radius:8px">' + paraOptions + '</select></div>'
      + '</div>'
      // Geçerlilik
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="fr"><div class="fl">GEÇERLİLİK BAŞLANGIÇ</div>'
          + '<input type="date" class="fi" id="nvl-bas" style="border-radius:8px" value="' + (n?.gecerlilikBaslangic||'') + '"></div>'
        + '<div class="fr"><div class="fl">GEÇERLİLİK BİTİŞ</div>'
          + '<input type="date" class="fi" id="nvl-bit" style="border-radius:8px" value="' + (n?.gecerlilikBitis||'') + '"></div>'
      + '</div>'
      // Notlar
      + '<div class="fr"><div class="fl">NOTLAR <span style="font-weight:400;color:var(--t3)">(opsiyonel)</span></div>'
        + '<textarea class="fi" id="nvl-notlar" rows="2" style="resize:none;border-radius:8px" placeholder="Serbest bölge, transit süre, özel şartlar…">' + (n?.notlar||'') + '</textarea></div>'
      + '<input type="hidden" id="nvl-eid" value="' + (n?.id||'') + '">'
    + '</div>'
    + '<div style="padding:12px 20px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
      + '<button class="btn" onclick="document.getElementById(\'mo-navlun\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="saveNavlun()" style="border-radius:9px;padding:9px 22px">Kaydet</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });

  // Autocomplete başlat
  setTimeout(() => {
    _initPortAutocomplete('nvl-from-port');
    _initPortAutocomplete('nvl-to-port');
  }, 50);
}

function saveNavlun() {
  const hat    = document.getElementById('nvl-hat')?.value?.trim();
  const from   = document.getElementById('nvl-from-port')?.value?.trim();
  const to     = document.getElementById('nvl-to-port')?.value?.trim();
  const fiyat  = parseFloat(document.getElementById('nvl-fiyat')?.value || '0');
  const eid    = parseInt(document.getElementById('nvl-eid')?.value || '0');

  if (!hat)   { window.toast?.('Hat zorunludur', 'err'); return; }
  if (!from)  { window.toast?.('Yükleme limanı zorunludur', 'err'); return; }
  if (!to)    { window.toast?.('Varış limanı zorunludur', 'err'); return; }
  if (!fiyat) { window.toast?.('Birim fiyat zorunludur', 'err'); return; }

  const cu = window.Auth?.getCU?.();
  const entry = {
    hat, yuklemeLiman: from, variisLiman: to,
    konteynerTipi: document.getElementById('nvl-tip')?.value || '',
    birimFiyat: fiyat,
    para:       document.getElementById('nvl-para')?.value || 'USD',
    gecerlilikBaslangic: document.getElementById('nvl-bas')?.value || '',
    gecerlilikBitis:     document.getElementById('nvl-bit')?.value || '',
    notlar:     document.getElementById('nvl-notlar')?.value?.trim() || '',
    durum:      'bekliyor',
    createdBy:  cu?.id,
    updatedAt:  (typeof nowTs === 'function' ? nowTs() : new Date().toLocaleString('tr-TR')),
  };

  const d = loadNavlun();
  if (eid) {
    const item = d.find(x => x.id === eid);
    if (item) Object.assign(item, entry);
  } else {
    d.unshift({ id: Date.now(), createdAt: entry.updatedAt, ...entry });
  }

  storeNavlun(d);
  document.getElementById('mo-navlun')?.remove();
  renderNavlun();
  window.logActivity?.('view', 'Navlun teklifi kaydedildi: ' + hat + ' ' + from + '→' + to);
  window.toast?.(eid ? 'Güncellendi ✓' : 'Teklif eklendi ✓', 'ok');
}

function navlunOnayla(id) {
  const d = loadNavlun(); const n = d.find(x => x.id === id); if (!n) return;
  n.durum = 'onaylandi'; n.onaylandiAt = (typeof nowTs==='function'?nowTs():new Date().toLocaleString('tr-TR'));
  storeNavlun(d); renderNavlun();
  window.toast?.('✅ Teklif onaylandı', 'ok');
}

function navlunReddet(id) {
  const d = loadNavlun(); const n = d.find(x => x.id === id); if (!n) return;
  n.durum = 'reddedildi';
  storeNavlun(d); renderNavlun();
  window.toast?.('Teklif reddedildi', 'ok');
}

function delNavlun(id) {
  if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
  storeNavlun(loadNavlun().filter(x => x.id !== id));
  renderNavlun();
  window.toast?.('Silindi', 'ok');
}

// Onaylanan tekliften konteyner oluştur
function navlunToKonteyn(id) {
  const n = loadNavlun().find(x => x.id === id); if (!n) return;
  window.openKonteynModal?.(null);
  setTimeout(() => {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('ktn-hat',       n.hat);
    setVal('ktn-from-port', n.yuklemeLiman);
    setVal('ktn-to-port',   n.variisLiman);
    setVal('ktn-desc',      n.konteynerTipi + (n.notlar ? ' — ' + n.notlar : ''));
    window.toast?.('Navlun bilgileri aktarıldı — tarih ve konteyner numarasını doldurun', 'ok');
  }, 300);
}

// ── Panel inject ─────────────────────────────────────────────────
function _injectNavlunSection() {
  const panel = document.getElementById('panel-kargo');
  if (!panel || document.getElementById('navlun-section')) return;

  const navlunSection = document.createElement('div');
  navlunSection.id = 'navlun-section';
  navlunSection.style.cssText = 'margin-top:24px';
  navlunSection.innerHTML = [
    '<div class="card">',
      '<div class="ch">',
        '<span class="ct">📋 Navlun Teklifleri</span>',
        '<div style="display:flex;gap:8px;align-items:center">',
          '<button class="btn btns" onclick="exportNavlunXlsx()" style="font-size:11px;border-radius:8px">⬇ Excel</button>',
          '<button class="btn btnp" onclick="openNavlunModal(null)" style="font-size:11px;border-radius:8px">+ Teklif Ekle</button>',
        '</div>',
      '</div>',

      // Stats
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 16px;border-bottom:1px solid var(--b)">',
        '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--t)" id="nvl-stat-total">0</div><div style="font-size:10px;color:var(--t3)">Toplam</div></div>',
        '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--amt)" id="nvl-stat-bekliyor">0</div><div style="font-size:10px;color:var(--t3)">Bekliyor</div></div>',
        '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--grt)" id="nvl-stat-onay">0</div><div style="font-size:10px;color:var(--t3)">Onaylandı</div></div>',
        '<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--rdt)" id="nvl-stat-gecen">0</div><div style="font-size:10px;color:var(--t3)">Süresi Geçmiş</div></div>',
      '</div>',

      // Filtreler
      '<div style="padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--b)">',
        '<input class="fi" id="nvl-search" placeholder="Hat, liman ara…" oninput="renderNavlun()" style="flex:1;min-width:150px;border-radius:8px">',
        '<select class="fi" id="nvl-status-f" onchange="renderNavlun()" style="border-radius:8px;min-width:130px">',
          '<option value="">Tüm Durumlar</option>',
          '<option value="bekliyor">⏳ Bekliyor</option>',
          '<option value="onaylandi">✅ Onaylandı</option>',
          '<option value="reddedildi">❌ Reddedildi</option>',
          '<option value="suresi_gec">⌛ Süresi Geçmiş</option>',
        '</select>',
        '<select class="fi" id="nvl-hat-f" onchange="renderNavlun()" style="border-radius:8px;min-width:130px">',
          '<option value="">Tüm Hatlar</option>',
          ['MSC','Maersk','CMA CGM','COSCO','Hapag-Lloyd','ONE','Evergreen','Yang Ming','HMM','ZIM'].map(h => '<option value="' + h + '">' + h + '</option>').join(''),
        '</select>',
      '</div>',

      '<div id="navlun-list" style="padding:8px 0"></div>',
    '</div>',
  ].join('');

  panel.appendChild(navlunSection);
}

// Excel export
function exportNavlunXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const rows = loadNavlun().map(n => ({
    'Hat': n.hat, 'Yükleme Limanı': n.yuklemeLiman, 'Varış Limanı': n.variisLiman,
    'Konteyner Tipi': n.konteynerTipi, 'Birim Fiyat': n.birimFiyat, 'Para': n.para,
    'Geçerlilik Başlangıç': n.gecerlilikBaslangic, 'Geçerlilik Bitiş': n.gecerlilikBitis,
    'Durum': NAVLUN_STATUS[n.durum]?.l || n.durum, 'Notlar': n.notlar,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [12,18,18,20,12,6,16,16,14,24].map(w => ({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Navlun');
  XLSX.writeFile(wb, 'Navlun_' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
}

// ── Export ────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORLD_PORTS, renderNavlun, openNavlunModal, saveNavlun, initAllPortInputs };
} else {
  window.WORLD_PORTS         = WORLD_PORTS;
  window.renderNavlun        = renderNavlun;
  window.openNavlunModal     = openNavlunModal;
  window.saveNavlun          = saveNavlun;
  window.navlunOnayla        = navlunOnayla;
  window.navlunReddet        = navlunReddet;
  window.delNavlun           = delNavlun;
  window.navlunToKonteyn     = navlunToKonteyn;
  window.exportNavlunXlsx    = exportNavlunXlsx;
  window.initAllPortInputs   = initAllPortInputs;
  window._initPortAutocomplete = _initPortAutocomplete;
  window.loadNavlun          = loadNavlun;
  window.storeNavlun         = storeNavlun;
  window._injectNavlunSection = _injectNavlunSection;
}
