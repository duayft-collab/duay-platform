/* ── PLATFORM STANDARTLARI MODÜLÜ ─────────────────────────── */
/* PLATFORM-STANDARTLARI-001 */
(function() {
  'use strict';

/* V194d-1d: DEFAULT'lar — Firestore boş ise / offline ise fallback değerler */
var DEFAULT_IBAN_DATA = [
  { banka:'Garanti Bankası', sube:'Yeşilpınar/1181', swift:'TGBATRIS',
    TL:'TR24 0006 2001 1810 0006 2960 86',
    USD:'TR39 0006 2001 1810 0009 0812 68',
    EUR:'TR66 0006 2001 1810 0009 0812 67' },
  { banka:'Albaraka Türk', sube:'Alibeyköy/117', swift:'BTFHTRIS',
    TL:'TR54 0020 3000 0889 5310 0000 05',
    USD:'TR27 0020 3000 0889 5310 0000 06',
    EUR:'TR97 0020 3000 0889 5310 0000 07' },
  { banka:'Kuveyt Türk', sube:'Yeşilpınar/267', swift:'KTEFTRIS',
    TL:'TR06 0020 5000 0956 8147 5000 01',
    USD:'TR22 0020 5000 0956 8147 5000 01',
    EUR:'TR92 0020 5000 0956 8147 5000 02' }
];

var DEFAULT_SIRKET_DATA = {
  unvan_tr:      'DUAY ULUSLARARASI TICARET LTD. STI.',
  unvan_en:      'DUAY GLOBAL LLC',
  hesapSahibi:   'Duay Uluslararası Ticaret Ltd. Şti.',
  adres_tr:      'Karadolap Mh. Neşeli Sk. 1/5 Eyüpsultan İstanbul',
  adres_kisa:    'Istanbul, Turkey',
  tel:           '+90 212 625 5 444',
  whatsapp:      '+90 532 270 5 113',
  web:           'www.duaycor.com',
  email:         'brn.simsek@gmail.com',
  vergi_dairesi: null,
  vergi_no:      null,
  mersis:        null,
  ticaret_sicil: null
};

var DEFAULT_SARTLAR = [
  'Payment: 30% deposit, 70% before dispatch/shipment.',
  'Tax Note: 20% VAT applicable for domestic shipments only.',
  'Bank Charges: All transfer fees outside Türkiye belong to buyer.',
  'Disputes: Istanbul Courts shall have jurisdiction.',
  "Insurance: Buyer's responsibility unless CIF terms.",
  'Attention: Goods must be inspected within 14 days from delivery.',
  'Validity: This offer is valid for the period stated above only.',
  'Packaging: Standard export packaging unless otherwise agreed.',
  'Force Majeure: Seller not liable for delays due to force majeure.',
  'Governing Law: Republic of Türkiye law applies to this contract.'
];

/* Org-scoped Firestore path — mevcut _fsPath user-scoped, bu ayri */
function _fsPathOrg(masterKey) {
  return 'duay_company/master/' + masterKey;
}

/* Firestore tek-seferlik fetch */
function _fsRead(path) {
  return new Promise(function(resolve, reject) {
    if (!window.firebase || !window.firebase.firestore) { resolve(null); return; }
    try {
      var parts = path.split('/');
      var ref = window.firebase.firestore();
      for (var i = 0; i < parts.length; i += 2) {
        ref = ref.collection(parts[i]).doc(parts[i+1]);
      }
      ref.get().then(function(snap) {
        resolve(snap.exists ? snap.data() : null);
      }).catch(reject);
    } catch(e) { reject(e); }
  });
}

/* onSnapshot listener wrapper */
function _fsListen(path, callback) {
  if (!window.firebase || !window.firebase.firestore) return null;
  try {
    var parts = path.split('/');
    var ref = window.firebase.firestore();
    for (var i = 0; i < parts.length; i += 2) {
      ref = ref.collection(parts[i]).doc(parts[i+1]);
    }
    return ref.onSnapshot(function(snap) {
      if (snap.exists) callback(snap.data());
    }, function(err) {
      console.warn('[PS] _fsListen error', path, err.message);
    });
  } catch(e) { console.warn('[PS] _fsListen setup error:', e); return null; }
}

/* Cache loader: LS oku, yoksa DEFAULT */
function _psLoadFromCache() {
  var sirket, iban, sartlar;
  try { var s = localStorage.getItem('ak_sirket_data'); if (s) sirket = JSON.parse(s); } catch(e){}
  try { var i = localStorage.getItem('ak_iban_data');   if (i) iban   = JSON.parse(i); } catch(e){}
  try { var t = localStorage.getItem('ak_pi_sartlar');  if (t) sartlar = JSON.parse(t); } catch(e){}
  return {
    sirket:  (sirket && typeof sirket === 'object') ? Object.assign({}, DEFAULT_SIRKET_DATA, sirket) : DEFAULT_SIRKET_DATA,
    iban:    (Array.isArray(iban) && iban.length) ? iban : DEFAULT_IBAN_DATA,
    sartlar: (Array.isArray(sartlar) && sartlar.length) ? sartlar : DEFAULT_SARTLAR
  };
}

/* Faz A — Cache hizli boot */
var _initial = _psLoadFromCache();
var IBAN_DATA = _initial.iban;
var SIRKET_DATA = _initial.sirket;
window.IBAN_DATA = IBAN_DATA;
window.SIRKET_DATA = SIRKET_DATA;
window.DEFAULT_IBAN_DATA = DEFAULT_IBAN_DATA;
window.DEFAULT_SIRKET_DATA = DEFAULT_SIRKET_DATA;
window.DEFAULT_SARTLAR = DEFAULT_SARTLAR;

/* Faz B — Firestore fresh fetch + ilk-kullanim migrate (async) */
(function _psFsBootstrap() {
  setTimeout(function() {
    if (!window.firebase || !window.firebase.firestore) {
      console.info('[PS] Firebase yok, sadece cache modu');
      return;
    }

    /* SIRKET */
    _fsRead(_fsPathOrg('sirket_data')).then(function(data) {
      if (data && typeof data === 'object' && data.unvan_tr) {
        var merged = Object.assign({}, DEFAULT_SIRKET_DATA, data);
        delete merged._meta;
        window.SIRKET_DATA = merged;
        try { localStorage.setItem('ak_sirket_data', JSON.stringify(merged)); } catch(e){}
        if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
      } else {
        var cur = window.SIRKET_DATA || DEFAULT_SIRKET_DATA;
        var payload = Object.assign({}, cur, { _meta: { version:1, updatedAt:new Date().toISOString(), updatedBy:{uid:'init',displayName:'init',role:'system'}, schema:'sirket_data_v1' } });
        if (typeof window._syncFirestore === 'function') {
          window._syncFirestore(_fsPathOrg('sirket_data'), payload);
        }
      }
    }).catch(function(e){ console.warn('[PS] sirket bootstrap fail:', e.message); });

    /* IBAN */
    _fsRead(_fsPathOrg('iban_data')).then(function(data) {
      if (data && Array.isArray(data.banks) && data.banks.length) {
        window.IBAN_DATA = data.banks;
        try { localStorage.setItem('ak_iban_data', JSON.stringify(data.banks)); } catch(e){}
        if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
      } else {
        var cur = window.IBAN_DATA || DEFAULT_IBAN_DATA;
        var payload = { banks: cur, _meta: { version:1, updatedAt:new Date().toISOString(), updatedBy:{uid:'init',displayName:'init',role:'system'}, schema:'iban_data_v1' } };
        if (typeof window._syncFirestore === 'function') {
          window._syncFirestore(_fsPathOrg('iban_data'), payload);
        }
      }
    }).catch(function(e){ console.warn('[PS] iban bootstrap fail:', e.message); });

    /* SARTLAR */
    _fsRead(_fsPathOrg('sartlar')).then(function(data) {
      if (data && Array.isArray(data.items) && data.items.length) {
        try { localStorage.setItem('ak_pi_sartlar', JSON.stringify(data.items)); } catch(e){}
      } else {
        var cur;
        try { var t = localStorage.getItem('ak_pi_sartlar'); if (t) cur = JSON.parse(t); } catch(e){}
        if (!Array.isArray(cur) || !cur.length) cur = DEFAULT_SARTLAR;
        var payload = { items: cur, _meta: { version:1, updatedAt:new Date().toISOString(), updatedBy:{uid:'init',displayName:'init',role:'system'}, schema:'sartlar_v1' } };
        if (typeof window._syncFirestore === 'function') {
          window._syncFirestore(_fsPathOrg('sartlar'), payload);
        }
      }
    }).catch(function(e){ console.warn('[PS] sartlar bootstrap fail:', e.message); });
  }, 1500);
})();

/* Faz C — Surekli onSnapshot listener (multi-cihaz sync) */
setTimeout(function() {
  if (!window.firebase || !window.firebase.firestore) return;
  _fsListen(_fsPathOrg('sirket_data'), function(data) {
    if (!data || !data.unvan_tr) return;
    var merged = Object.assign({}, DEFAULT_SIRKET_DATA, data);
    delete merged._meta;
    window.SIRKET_DATA = merged;
    try { localStorage.setItem('ak_sirket_data', JSON.stringify(merged)); } catch(e){}
    if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
  });
  _fsListen(_fsPathOrg('iban_data'), function(data) {
    if (!data || !Array.isArray(data.banks)) return;
    window.IBAN_DATA = data.banks;
    try { localStorage.setItem('ak_iban_data', JSON.stringify(data.banks)); } catch(e){}
    if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
  });
  _fsListen(_fsPathOrg('sartlar'), function(data) {
    if (!data || !Array.isArray(data.items)) return;
    try { localStorage.setItem('ak_pi_sartlar', JSON.stringify(data.items)); } catch(e){}
  });
}, 2000);

window.renderPlatformStandartlari = function() {
  var p = document.getElementById('panel-platform-standartlari'); if(!p) return;

  var ibanHTML = IBAN_DATA.map(function(b) {
    return '<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px 16px;margin-bottom:10px;background:var(--sf)">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      +'<div><div style="font-size:13px;font-weight:500;color:var(--t)">'+window._esc(b.banka)+'</div>'
      +'<div style="font-size:10px;color:var(--t3)">'+window._esc(b.sube)+'</div></div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px">'
      +['TL','USD','EUR'].map(function(cur){
        return '<div style="display:flex;align-items:center;gap:10px">'
          +'<span style="font-size:9px;font-weight:500;color:var(--t3);min-width:28px">'+cur+'</span>'
          +'<code style="font-size:11px;font-family:monospace;color:var(--t);flex:1;background:var(--s2);padding:4px 8px;border-radius:4px;letter-spacing:.04em">'+window._esc(b[cur])+'</code>'
          +'<button onclick="event.stopPropagation();navigator.clipboard.writeText(\''+b[cur].replace(/\s/g,'')+'\').then(function(){window.toast?.(\'IBAN kopyalandı ✓\',\'ok\')})" style="font-size:9px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Kopyala</button>'
          +'</div>';
      }).join('')
      +'</div></div>';
  }).join('');

  var SARTLAR = [
    'Payment: 30% deposit, 70% before dispatch/shipment.',
    'Tax Note: 20% VAT applicable for domestic shipments only.',
    'Bank Charges: All transfer fees outside Türkiye belong to buyer.',
    'Disputes: Istanbul Courts shall have jurisdiction.',
    'Insurance: Buyer\'s responsibility unless CIF terms.',
  ];

  var sartlarHTML = SARTLAR.map(function(s,i){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px">'
      +'<span style="color:var(--t3);min-width:16px">'+(i+1)+'.</span>'
      +'<span style="color:var(--t)">'+window._esc(s)+'</span>'
      +'</div>';
  }).join('');

  p.innerHTML = '<div style="max-width:700px;margin:0 auto;padding:24px">'
    +'<div style="font-size:16px;font-weight:600;color:var(--t);margin-bottom:4px">Platform Standartları</div>'
    +'<div style="font-size:11px;color:var(--t3);margin-bottom:24px">IBAN bilgileri, varsayılan şartlar, kodlama standartları</div>'

    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)"><span style="font-size:12px;font-weight:500;color:var(--t)">Şirket Bilgileri</span>'+(function(){var r=window.CU?.()?.role;if(r!=='admin'&&r!=='super_admin')return '';return '<div style="display:flex;gap:6px"><button onclick="window._psEditSirket()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Düzenle</button><button onclick="window._psResetSirket()" style="font-size:10px;padding:4px 10px;border:0.5px solid #d97706;border-radius:4px;background:transparent;cursor:pointer;color:#d97706;font-family:inherit">Sıfırla</button></div>';})()+'</div>'
    +(function(){
        var s = window.SIRKET_DATA || {};
        var fmt = function(v){ return v ? window._esc(String(v)) : '<span style="color:var(--t3)">—</span>'; };
        var row = function(lbl, val){
          return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:6px 0;border-bottom:0.5px solid var(--b)">'
            +'<span style="color:var(--t3);min-width:140px">'+lbl+'</span>'
            +'<span style="color:var(--t);text-align:right;font-family:'+(['Vergi No','Mersis No','Ticaret Sicil'].indexOf(lbl)>-1?'monospace':'inherit')+'">'+fmt(val)+'</span>'
            +'</div>';
        };
        return '<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px 16px;margin-bottom:14px;background:var(--sf)">'
          +row('Resmi Unvan (TR)', s.unvan_tr)
          +row('Ticari Unvan (EN)', s.unvan_en)
          +row('Hesap Sahibi', s.hesapSahibi)
          +row('Adres', s.adres_tr)
          +row('Telefon', s.tel)
          +row('WhatsApp', s.whatsapp)
          +row('Web', s.web)
          +row('E-posta', s.email)
          +row('Vergi Dairesi', s.vergi_dairesi)
          +row('Vergi No', s.vergi_no)
          +row('Mersis No', s.mersis)
          +row('Ticaret Sicil', s.ticaret_sicil)
          +'</div>';
    })()

    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)"><span style="font-size:12px;font-weight:500;color:var(--t)">Banka IBAN Bilgileri</span>'+(function(){var r=window.CU?.()?.role;if(r!=='admin'&&r!=='super_admin')return '';return '<div style="display:flex;gap:6px"><button onclick="window._psEditIban()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Düzenle</button><button onclick="window._psResetIban()" style="font-size:10px;padding:4px 10px;border:0.5px solid #d97706;border-radius:4px;background:transparent;cursor:pointer;color:#d97706;font-family:inherit">Sıfırla</button></div>';})()+'</div>'
    +ibanHTML

    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)"><span style="font-size:12px;font-weight:500;color:var(--t)">Varsayılan Teklif Şartları</span>'+(function(){var r=window.CU?.()?.role;if(r!=='admin'&&r!=='super_admin')return '';return '<div style="display:flex;gap:6px"><button onclick="window._psEditSartlar()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Düzenle</button><button onclick="window._psResetSartlar()" style="font-size:10px;padding:4px 10px;border:0.5px solid #d97706;border-radius:4px;background:transparent;cursor:pointer;color:#d97706;font-family:inherit">Sıfırla</button></div>';})()+'</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;background:var(--sf)">'
    +'<div style="padding:10px 14px">'+sartlarHTML+'</div>'
    +'</div>'

    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Kodlama Standartları</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px 16px;background:var(--sf)">'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--b)"><span style="color:var(--t3)">Proforma No Formatı</span><code style="font-family:monospace;color:var(--t)">XXXX-YYMMDDHHMI</code></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--b)"><span style="color:var(--t3)">Müşteri Kodu</span><code style="font-family:monospace;color:var(--t)">C-YYYY-ABC-NNNN</code></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0"><span style="color:var(--t3)">Duay Kodu</span><code style="font-family:monospace;color:var(--t)">DUAY-XXX-NNN</code></div>'
    +'</div>'
    /* [VERI-PROTOKOL-EKLE-001] Veri Protokolu bolumu (iskelet) */
    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Veri Protokolu</div>'
    +'<div id="veri-protokol-container" style="border:0.5px solid var(--b);border-radius:8px;padding:12px 16px;background:var(--sf)">'
      +(function(){
        /* [VERI-PROTOKOL-EKLE-002] Runtime canli veri + 2 hardcode */
        /* [VERI-PROTOKOL-EKLE-002-HARDCODE] CRITICAL_COLS.length=19, _noMergeCols.length=6 — manuel guncel */
        var totalKeys = (typeof window.KEYS==='object') ? Object.keys(window.KEYS).length : 0;
        var keyValues = (typeof window.KEYS==='object') ? Object.values(window.KEYS) : [];
        var activeLS = keyValues.filter(function(k){ var v=localStorage.getItem(k); return v!==null && v.length>2; }).length;
        var totalBytes = keyValues.reduce(function(sum,k){ return sum + (localStorage.getItem(k)||'').length; }, 0);
        var ls_kb = Math.round(totalBytes/1024);
        var cacheMatch = Array.from(document.scripts).map(function(sc){return sc.src;}).join(' ').match(/\?v=(\d{8}[A-Z]{2})/);
        var cache = cacheMatch ? cacheMatch[1] : '—';
        var realtimeCount = 19;
        var noMergeCount = 6;
        var cards = [
          {lbl:'Toplam Key', val:totalKeys, sub:'logical keys', c:'var(--t)'},
          {lbl:'Aktif LS', val:activeLS, sub:'localStorage', c:'var(--t)'},
          {lbl:'Realtime', val:realtimeCount, sub:'CRITICAL_COLS', c:'#1A8D6F'},
          {lbl:'No-Merge', val:noMergeCount, sub:'_noMergeCols', c:'#B4730F'},
          {lbl:'LS Boyut', val:ls_kb+' KB', sub:'~5000 KB limit', c:'var(--t)'},
          {lbl:'Cache', val:cache, sub:'active version', c:'var(--t3)'}
        ];
        return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">'
          + cards.map(function(k){
              return '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:10px 12px">'
                + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:500;letter-spacing:0.05em">' + k.lbl + '</div>'
                + '<div style="font-size:16px;font-weight:600;color:' + k.c + ';margin-top:3px;font-variant-numeric:tabular-nums">' + k.val + '</div>'
                + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + k.sub + '</div>'
                + '</div>';
            }).join('')
          + '</div>'
          /* [VERI-PROTOKOL-EKLE-003] Ana tablo 26 aktif key */
          + (function(){
              var CRITICAL = ['kur','users','tasks','cari','activity','updateLog','trash','pusula','notifications','urunler','bankalar','announcements','satisTeklifleri','alisTeklifleri','teklifSartlar','ihracatDosyalar','crm','kargo','stok'];
              var NOMERGE = ['trash','activity','cari','satinalma','alisTeklifleri','urunler'];
              var rows = keyValues.map(function(phys){
                var logical = Object.keys(window.KEYS||{}).find(function(k){ return window.KEYS[k]===phys; }) || phys;
                var v = localStorage.getItem(phys);
                var size = v ? v.length : 0;
                var lz = v && v.indexOf('_LZ_')===0;
                var count = 'N/A';
                if (v && !lz) { try{ var p=JSON.parse(v); count=Array.isArray(p)?p.length:(p?1:0); }catch(e){} }
                else if (lz && window.LZString) { try{ var d=window.LZString.decompressFromUTF16(v.slice(4)); var p=JSON.parse(d); count=Array.isArray(p)?p.length:(p?1:0); }catch(e){} }
                return { logical:logical, phys:phys, size:size, lz:lz, count:count, rt:CRITICAL.indexOf(logical)>-1, nm:NOMERGE.indexOf(logical)>-1, active:(v!==null && size>2) };
              }).filter(function(r){ return r.active; }).sort(function(a,b){ return b.size - a.size; });
              var tblHtml = '<div style="margin-top:14px;margin-bottom:8px;font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500">Aktif Key Listesi (' + rows.length + ')</div>'
                + '<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;background:var(--sf)">'
                + '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 40px 40px 40px;gap:6px;padding:8px 12px;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;border-bottom:0.5px solid var(--b);background:rgba(0,0,0,0.02)">'
                + '<div>Key</div><div style="text-align:right">Kayit</div><div style="text-align:right">Boyut</div><div style="text-align:center">LZ</div><div style="text-align:center">RT</div><div style="text-align:center">NM</div>'
                + '</div>'
                + rows.map(function(r,i){
                    var sizeDisp = r.size<1024 ? r.size+' B' : Math.round(r.size/1024)+' KB';
                    var bg = i%2 ? 'rgba(0,0,0,0.015)' : 'transparent';
                    return '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 40px 40px 40px;gap:6px;padding:6px 12px;font-size:11px;border-bottom:0.5px solid var(--b);background:' + bg + '">'
                      + '<div style="font-weight:500;color:var(--t)">' + r.logical + '</div>'
                      + '<div style="text-align:right;font-variant-numeric:tabular-nums;color:var(--t2)">' + r.count + '</div>'
                      + '<div style="text-align:right;font-variant-numeric:tabular-nums;color:var(--t2)">' + sizeDisp + '</div>'
                      + '<div style="text-align:center;color:' + (r.lz?'#1A8D6F':'var(--t3)') + '">' + (r.lz?'✓':'−') + '</div>'
                      + '<div style="text-align:center;color:' + (r.rt?'#1A8D6F':'var(--t3)') + '">' + (r.rt?'✓':'−') + '</div>'
                      + '<div style="text-align:center;color:' + (r.nm?'#B4730F':'var(--t3)') + '">' + (r.nm?'✓':'−') + '</div>'
                      + '</div>';
                  }).join('')
                + '</div>';
              return tblHtml;
            })();
      })()
    /* [VERI-PROTOKOL-EKLE-004] Koruma + Sync + Terimler */
    +'<div style="margin-top:16px;font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500;margin-bottom:8px">Koruma Mekanizmalari</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;background:var(--sf);padding:12px 14px;margin-bottom:12px">'
      +'<div style="display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:11px">'
        +'<div style="font-weight:500;color:var(--t)">No-Merge</div>'
        +'<div style="color:var(--t2)">Firestore merge bypass — silme F5 sonra kalici (6 key)</div>'
        +'<div style="font-weight:500;color:var(--t)">Echo Guard</div>'
        +'<div style="color:var(--t2)">Kendi yazimi 30s TTL ile skip — loop onler (tum realtime)</div>'
        +'<div style="font-weight:500;color:var(--t)">Tombstone Preserve</div>'
        +'<div style="color:var(--t2)">Silinen kayit LS yazimi sirasinda korunur (satinalma, teklifler)</div>'
        +'<div style="font-weight:500;color:var(--t)">Admin Saving</div>'
        +'<div style="color:var(--t2)">Admin yazim sirasinda onSnapshot skip (users kayitlari)</div>'
      +'</div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500;margin-bottom:8px">Sync Protokolu</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;background:var(--sf);padding:12px 14px;margin-bottom:12px">'
      +'<div style="display:flex;flex-direction:column;gap:6px;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'
        +'<div><span style="color:#B4730F;font-weight:500">YAZMA&nbsp;&nbsp;:</span> <span style="color:var(--t2)">UI -> storeX() -> _lsRetention -> _write(LS) -> _syncFirestore(FS)</span></div>'
        +'<div><span style="color:#1A8D6F;font-weight:500">OKUMA&nbsp;&nbsp;:</span> <span style="color:var(--t2)">loadX() -> _read(LS) -> migrate -> filter -> return</span></div>'
        +'<div><span style="color:#3478F6;font-weight:500">REALTIME:</span> <span style="color:var(--t2)">Firestore onSnapshot -> LS guncelle -> re-render</span></div>'
      +'</div>'
      +'<div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--b);font-size:10px;color:var(--t3)">Online: Firestore master, LS cache. Offline: LS + offline queue (auth gelince flush). Conflict: last-write-wins.</div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500;margin-bottom:8px">Terimler Aciklamasi</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;background:var(--sf);padding:12px 14px">'
      +'<div style="display:flex;flex-direction:column;gap:10px;font-size:11px">'
        +'<div><div style="font-weight:500;color:var(--t);margin-bottom:2px">LZ Compress</div><div style="color:var(--t2);line-height:1.5">500+ byte JSON verileri LZString.compressToUTF16 ile sikistirilir. %60-80 tasarruf. _LZ_ prefix ile isaretlenir.</div></div>'
        +'<div><div style="font-weight:500;color:var(--t);margin-bottom:2px">No-Merge</div><div style="color:var(--t2);line-height:1.5">Firestore yazarken eski veri okunmaz, direkt .set() uygulanir. Silme isleminin F5 sonra geri gelmesini engeller. Risk: iki cihaz ayni anda yazarsa last-write-wins.</div></div>'
        +'<div><div style="font-weight:500;color:var(--t);margin-bottom:2px">Realtime</div><div style="color:var(--t2);line-height:1.5">Firestore onSnapshot listener ile surekli dinleme. Baska cihaz degistirdiginde F5 yapmadan anlik yansir. 19 key aktif.</div></div>'
        +'<div><div style="font-weight:500;color:var(--t);margin-bottom:2px">Master / Slave</div><div style="color:var(--t2);line-height:1.5">Online: Firestore master, LS slave/cache. Offline: LS + offline queue. Auth gelince queue Firestore\'a flush edilir.</div></div>'
      +'</div>'
    +'</div>'
    +'</div>'
    +'</div>';
};

/* ════════════════════════════════════════════════════════════
   V194d-1d HANDLERS — Edit + Save + Reset + Audit
   admin/super_admin only. Frontend defense-in-depth.
   ════════════════════════════════════════════════════════════ */

function _psIsAdmin() {
  var r = window.CU && window.CU() && window.CU().role;
  return r === 'admin' || r === 'super_admin';
}

function _psAuditAppend(action, diff) {
  try {
    var cu = (window.CU && window.CU()) || {};
    var entry = {
      ts: new Date().toISOString(),
      uid: cu.id || cu.uid || 'unknown',
      displayName: cu.name || cu.displayName || 'unknown',
      role: cu.role || 'unknown',
      action: action,
      diff: diff || {}
    };
    var raw = localStorage.getItem('ak_master_audit');
    var arr = [];
    try { arr = raw ? JSON.parse(raw) : []; } catch(e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.unshift(entry);
    if (arr.length > 100) arr = arr.slice(0, 100);
    localStorage.setItem('ak_master_audit', JSON.stringify(arr));
    if (typeof window._syncFirestore === 'function') {
      window._syncFirestore(_fsPathOrg('_audit_log'), { entries: arr, _meta: { updatedAt: entry.ts, maxEntries: 100, rotation: 'FIFO' } });
    }
  } catch(e) { console.warn('[PS] audit append fail:', e); }
}

function _psDiff(oldObj, newObj) {
  var d = {};
  var keys = {};
  Object.keys(oldObj || {}).forEach(function(k){ keys[k]=1; });
  Object.keys(newObj || {}).forEach(function(k){ keys[k]=1; });
  Object.keys(keys).forEach(function(k) {
    if (k === '_meta') return;
    var ov = oldObj ? oldObj[k] : undefined;
    var nv = newObj ? newObj[k] : undefined;
    if (JSON.stringify(ov) !== JSON.stringify(nv)) {
      d[k] = { old: ov, new: nv };
    }
  });
  return d;
}

/* SAVE FN'LERİ — Firestore primary, fresh fetch + merge + LS + audit + render */
window._psSaveSirket = function(updates) {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  var cur = window.SIRKET_DATA || DEFAULT_SIRKET_DATA;
  var diff = _psDiff(cur, updates);
  var merged = Object.assign({}, DEFAULT_SIRKET_DATA, cur, updates);
  var version = (cur._meta && cur._meta.version) || 0;
  var cu = (window.CU && window.CU()) || {};
  merged._meta = {
    version: version + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: { uid: cu.id || cu.uid || 'unknown', displayName: cu.name || cu.displayName || 'unknown', role: cu.role || 'unknown' },
    schema: 'sirket_data_v1'
  };
  try { localStorage.setItem('ak_sirket_data', JSON.stringify(merged)); } catch(e){}
  window.SIRKET_DATA = merged;
  if (typeof window._syncFirestore === 'function') {
    window._syncFirestore(_fsPathOrg('sirket_data'), merged);
  }
  _psAuditAppend('edit_sirket', diff);
  if (typeof window.toast === 'function') window.toast('Şirket bilgileri kaydedildi','ok');
  if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
};

window._psSaveIban = function(arr) {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  if (!Array.isArray(arr)) { if (window.toast) window.toast('Geçersiz veri','err'); return; }
  var cur = window.IBAN_DATA || DEFAULT_IBAN_DATA;
  var diff = _psDiff({banks:cur}, {banks:arr});
  var cu = (window.CU && window.CU()) || {};
  var payload = {
    banks: arr,
    _meta: {
      version: ((cur._meta && cur._meta.version) || 0) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: { uid: cu.id || cu.uid || 'unknown', displayName: cu.name || cu.displayName || 'unknown', role: cu.role || 'unknown' },
      schema: 'iban_data_v1'
    }
  };
  try { localStorage.setItem('ak_iban_data', JSON.stringify(arr)); } catch(e){}
  window.IBAN_DATA = arr;
  if (typeof window._syncFirestore === 'function') {
    window._syncFirestore(_fsPathOrg('iban_data'), payload);
  }
  _psAuditAppend('edit_iban', diff);
  if (typeof window.toast === 'function') window.toast('Banka bilgileri kaydedildi','ok');
  if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
};

window._psSaveSartlar = function(list) {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  if (!Array.isArray(list)) { if (window.toast) window.toast('Geçersiz veri','err'); return; }
  var cur = [];
  try { var t = localStorage.getItem('ak_pi_sartlar'); if (t) cur = JSON.parse(t); } catch(e){}
  if (!Array.isArray(cur)) cur = DEFAULT_SARTLAR;
  var diff = _psDiff({items:cur}, {items:list});
  var cu = (window.CU && window.CU()) || {};
  var payload = {
    items: list,
    _meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: { uid: cu.id || cu.uid || 'unknown', displayName: cu.name || cu.displayName || 'unknown', role: cu.role || 'unknown' },
      schema: 'sartlar_v1'
    }
  };
  try { localStorage.setItem('ak_pi_sartlar', JSON.stringify(list)); } catch(e){}
  if (typeof window._syncFirestore === 'function') {
    window._syncFirestore(_fsPathOrg('sartlar'), payload);
  }
  _psAuditAppend('edit_sartlar', diff);
  if (typeof window.toast === 'function') window.toast('Şartlar kaydedildi','ok');
  if (typeof window.renderPlatformStandartlari === 'function') window.renderPlatformStandartlari();
};

/* RESET FN'LERİ */
window._psResetSirket = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  _psResetConfirm('Şirket Bilgileri', function() {
    var diff = _psDiff(window.SIRKET_DATA, DEFAULT_SIRKET_DATA);
    try { localStorage.removeItem('ak_sirket_data'); } catch(e){}
    window.SIRKET_DATA = Object.assign({}, DEFAULT_SIRKET_DATA);
    var cu = (window.CU && window.CU()) || {};
    var payload = Object.assign({}, DEFAULT_SIRKET_DATA, { _meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: { uid: cu.id || 'unknown', displayName: cu.name || 'unknown', role: cu.role }, schema: 'sirket_data_v1' } });
    if (typeof window._syncFirestore === 'function') window._syncFirestore(_fsPathOrg('sirket_data'), payload);
    _psAuditAppend('reset_sirket', diff);
    if (window.toast) window.toast('Şirket bilgileri varsayılana sıfırlandı','ok');
    if (window.renderPlatformStandartlari) window.renderPlatformStandartlari();
  });
};

window._psResetIban = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  _psResetConfirm('Banka IBAN Bilgileri', function() {
    var diff = _psDiff({banks:window.IBAN_DATA}, {banks:DEFAULT_IBAN_DATA});
    try { localStorage.removeItem('ak_iban_data'); } catch(e){}
    window.IBAN_DATA = DEFAULT_IBAN_DATA.slice();
    var cu = (window.CU && window.CU()) || {};
    var payload = { banks: DEFAULT_IBAN_DATA, _meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: { uid: cu.id || 'unknown', displayName: cu.name || 'unknown', role: cu.role }, schema: 'iban_data_v1' } };
    if (typeof window._syncFirestore === 'function') window._syncFirestore(_fsPathOrg('iban_data'), payload);
    _psAuditAppend('reset_iban', diff);
    if (window.toast) window.toast('Banka bilgileri varsayılana sıfırlandı','ok');
    if (window.renderPlatformStandartlari) window.renderPlatformStandartlari();
  });
};

window._psResetSartlar = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  _psResetConfirm('Varsayılan Teklif Şartları', function() {
    var cur = []; try { var t = localStorage.getItem('ak_pi_sartlar'); if (t) cur = JSON.parse(t); } catch(e){}
    var diff = _psDiff({items:cur}, {items:DEFAULT_SARTLAR});
    try { localStorage.removeItem('ak_pi_sartlar'); } catch(e){}
    var cu = (window.CU && window.CU()) || {};
    var payload = { items: DEFAULT_SARTLAR, _meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: { uid: cu.id || 'unknown', displayName: cu.name || 'unknown', role: cu.role }, schema: 'sartlar_v1' } };
    if (typeof window._syncFirestore === 'function') window._syncFirestore(_fsPathOrg('sartlar'), payload);
    _psAuditAppend('reset_sartlar', diff);
    if (window.toast) window.toast('Şartlar varsayılana sıfırlandı','ok');
    if (window.renderPlatformStandartlari) window.renderPlatformStandartlari();
  });
};

/* RESET CONFIRM MODAL */
function _psResetConfirm(masterAdi, fn) {
  var modal = document.createElement('div');
  modal.id = 'ps-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:var(--s);border-radius:12px;padding:24px;width:420px;max-width:90vw">'
    + '<div style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--t)">Sıfırlama Onayı</div>'
    + '<div style="font-size:12px;color:var(--t2);margin-bottom:18px;line-height:1.6"><strong>' + masterAdi + '</strong> varsayılan değerlere döndürülecek. Mevcut değişiklikler kaybolacak. <span style="color:#d97706">Bu işlem geri alınamaz.</span></div>'
    + '<div style="display:flex;justify-content:flex-end;gap:8px"><button id="ps-confirm-cancel" style="padding:8px 16px;font-size:11px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">İptal</button><button id="ps-confirm-ok" style="padding:8px 16px;font-size:11px;border:0;border-radius:6px;background:#d97706;cursor:pointer;color:#fff;font-weight:500">Sıfırla</button></div>'
    + '</div>';
  document.body.appendChild(modal);
  document.getElementById('ps-confirm-cancel').onclick = function(){ modal.remove(); };
  document.getElementById('ps-confirm-ok').onclick = function(){ modal.remove(); fn(); };
}

/* EDIT MODAL FN'LERİ */
window._psEditSirket = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  var s = window.SIRKET_DATA || DEFAULT_SIRKET_DATA;
  var fields = [
    ['unvan_tr','Resmi Unvan (TR)'],['unvan_en','Ticari Unvan (EN)'],['hesapSahibi','Hesap Sahibi'],
    ['adres_tr','Adres'],['adres_kisa','Kısa Adres'],['tel','Telefon'],['whatsapp','WhatsApp'],
    ['web','Web'],['email','E-posta'],
    ['vergi_dairesi','Vergi Dairesi'],['vergi_no','Vergi No'],['mersis','Mersis No'],['ticaret_sicil','Ticaret Sicil']
  ];
  var html = '<div style="max-height:65vh;overflow-y:auto;padding-right:8px">';
  fields.forEach(function(f) {
    html += '<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--t3);margin-bottom:4px">' + f[1] + '</div>'
      + '<input id="ed-sirket-' + f[0] + '" value="' + window._esc(s[f[0]] || '') + '" style="width:100%;padding:8px 10px;font-size:12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  });
  html += '</div>';
  var modal = document.createElement('div');
  modal.id = 'ps-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:var(--s);border-radius:12px;padding:20px;width:560px;max-width:90vw"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--t)">Şirket Bilgilerini Düzenle</div>'
    + html
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="ps-edit-cancel" style="padding:8px 16px;font-size:11px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">İptal</button><button id="ps-edit-save" style="padding:8px 16px;font-size:11px;border:0;border-radius:6px;background:var(--p);cursor:pointer;color:#fff;font-weight:500">Kaydet</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('ps-edit-cancel').onclick = function(){ modal.remove(); };
  document.getElementById('ps-edit-save').onclick = function(){
    var obj = {};
    fields.forEach(function(f) {
      var el = document.getElementById('ed-sirket-' + f[0]);
      var v = el ? el.value.trim() : '';
      obj[f[0]] = v || null;
    });
    modal.remove();
    window._psSaveSirket(obj);
  };
};

window._psEditIban = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  var arr = window.IBAN_DATA || DEFAULT_IBAN_DATA;
  var html = '<div style="max-height:65vh;overflow-y:auto;padding-right:8px">';
  arr.forEach(function(b, i) {
    html += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;margin-bottom:10px">'
      + '<div style="font-size:11px;font-weight:500;margin-bottom:8px;color:var(--t)">Banka #' + (i+1) + '</div>'
      + ['banka','sube','swift','TL','USD','EUR'].map(function(f) {
          var monoFamily = (f==='TL'||f==='USD'||f==='EUR'||f==='swift') ? 'monospace' : 'inherit';
          return '<div style="margin-bottom:6px"><div style="font-size:9px;color:var(--t3);margin-bottom:2px">' + f.toUpperCase() + '</div>'
            + '<input id="ed-iban-' + i + '-' + f + '" value="' + window._esc(b[f] || '') + '" style="width:100%;padding:6px 8px;font-size:11px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:' + monoFamily + ';box-sizing:border-box"></div>';
        }).join('')
      + '</div>';
  });
  html += '</div>';
  var modal = document.createElement('div');
  modal.id = 'ps-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:var(--s);border-radius:12px;padding:20px;width:560px;max-width:90vw"><div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--t)">Banka IBAN Bilgilerini Düzenle</div>'
    + html
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="ps-edit-cancel" style="padding:8px 16px;font-size:11px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">İptal</button><button id="ps-edit-save" style="padding:8px 16px;font-size:11px;border:0;border-radius:6px;background:var(--p);cursor:pointer;color:#fff;font-weight:500">Kaydet</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('ps-edit-cancel').onclick = function(){ modal.remove(); };
  document.getElementById('ps-edit-save').onclick = function(){
    var newArr = arr.map(function(b, i) {
      var o = {};
      ['banka','sube','swift','TL','USD','EUR'].forEach(function(f) {
        var el = document.getElementById('ed-iban-' + i + '-' + f);
        o[f] = el ? el.value.trim() : (b[f] || '');
      });
      return o;
    });
    modal.remove();
    window._psSaveIban(newArr);
  };
};

window._psEditSartlar = function() {
  if (!_psIsAdmin()) { if (window.toast) window.toast('Yetki yok','err'); return; }
  var list = [];
  try { var t = localStorage.getItem('ak_pi_sartlar'); if (t) list = JSON.parse(t); } catch(e){}
  if (!Array.isArray(list) || !list.length) list = DEFAULT_SARTLAR;
  var modal = document.createElement('div');
  modal.id = 'ps-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:var(--s);border-radius:12px;padding:20px;width:600px;max-width:90vw"><div style="font-size:14px;font-weight:600;margin-bottom:6px;color:var(--t)">Varsayılan Teklif Şartlarını Düzenle</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-bottom:12px">Her satırda 1 madde. Boş satırlar atlanır.</div>'
    + '<textarea id="ed-sartlar-text" style="width:100%;min-height:280px;padding:10px;font-size:11px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);font-family:monospace;line-height:1.5;box-sizing:border-box;resize:vertical">' + window._esc(list.join('\n')) + '</textarea>'
    + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="ps-edit-cancel" style="padding:8px 16px;font-size:11px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">İptal</button><button id="ps-edit-save" style="padding:8px 16px;font-size:11px;border:0;border-radius:6px;background:var(--p);cursor:pointer;color:#fff;font-weight:500">Kaydet</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('ps-edit-cancel').onclick = function(){ modal.remove(); };
  document.getElementById('ps-edit-save').onclick = function(){
    var raw = document.getElementById('ed-sartlar-text').value;
    var newList = raw.split(/\r?\n/).map(function(s){return s.trim();}).filter(function(s){return s.length;});
    modal.remove();
    window._psSaveSartlar(newList);
  };
};

})();
