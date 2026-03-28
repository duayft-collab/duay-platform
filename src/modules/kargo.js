/**
 * src/modules/kargo.js  v10.0.0
 * 3 Sekmeli: Navlun & Konteyner | Lokasyon Kargo | Kurye
 */
'use strict';
console.log('[kargo] v10.0.0 — ' + new Date().toLocaleString('tr-TR'));

const KRG_TAB_KEY     = 'ak_kargo_tab';
const KRG_LOK_KEY     = 'ak_kargo_lokasyonlar';
const KRG_KURYE_KEY   = 'ak_kargo_kurye';
const KRG_LOK_KRG_KEY = 'ak_lok_kargo';

const KRG_TASIMA = {
  deniz:{l:'Deniz',ic:'🚢'}, hava:{l:'Hava',ic:'✈️'},
  tren:{l:'Tren',ic:'🚂'}, kara:{l:'Kara',ic:'🚛'}
};

const KARGO_STATUS = {
  bekle:{l:'Beklemede',c:'#854F0B',bg:'rgba(133,79,11,.09)'},
  yolda:{l:'Yolda',c:'#185FA5',bg:'rgba(24,95,165,.09)'},
  teslim:{l:'Teslim',c:'#3B6D11',bg:'rgba(59,109,17,.09)'},
  iade:{l:'İade',c:'#A32D2D',bg:'rgba(163,45,45,.09)'}
};

const KURYE_TRACKING = {
  'MNG Kargo':'https://www.mngkargo.com.tr/irsaliye-sorgulama?takipNo=',
  'Yurtiçi Kargo':'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=',
  'PTT Kargo':'https://www.ptt.gov.tr/tr/anasayfa/gonderitakip.html?barcode=',
  'Aras Kargo':'https://www.araskargo.com.tr/gonderi-sorgulama?barcode=',
  'DHL':'https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=',
  'FedEx':'https://www.fedex.com/fedextrack/?trknbr=',
  'UPS':'https://www.ups.com/track?tracknum='
};

const KTN_TRACKING_URLS = {
  'MSC':'https://www.msc.com/en/track-a-shipment?trackingNumber=',
  'Maersk':'https://www.maersk.com/tracking/',
  'CMA CGM':'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=',
  'COSCO':'https://elines.coscoshipping.com/ebtracking/visible?trNo=',
  'Hapag-Lloyd':'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=',
  'Arkas':'https://www.arkas.com.tr/tr/konteyner-takip?ContainerNumber='
};


// Yardımcılar
const _gK   = window.g;
const _isAK = () => ['admin','manager'].includes(window.Auth?.getCU?.()?.role);
const _nowK = () => typeof nowTs==='function' ? nowTs() : new Date().toLocaleString('tr-TR');
const _toastK = (m,t) => window.toast?.(m,t);
const _logK   = m => window.logActivity?.('view',m);

function _bdg(text,c,bg){return '<span style="font-size:11px;padding:2px 8px;border-radius:5px;background:'+bg+';color:'+c+';font-weight:500;white-space:nowrap">'+text+'</span>';}

// Veri
function _loadLoks(){try{return JSON.parse(localStorage.getItem(KRG_LOK_KEY)||'[]');}catch{return[];}}
function _saveLoks(d){localStorage.setItem(KRG_LOK_KEY,JSON.stringify(d));}
function _loadLokKrg(){try{return JSON.parse(localStorage.getItem(KRG_LOK_KRG_KEY)||'[]');}catch{return[];}}
function _saveLokKrg(d){localStorage.setItem(KRG_LOK_KRG_KEY,JSON.stringify(d));}
function _loadKurye(){try{return JSON.parse(localStorage.getItem(KRG_KURYE_KEY)||'[]');}catch{return[];}}
function _saveKurye2(d){localStorage.setItem(KRG_KURYE_KEY,JSON.stringify(d));}

function _getLoks(){
  var l=_loadLoks();
  if(!l.length){l=[{id:'ofis1',ad:'Ofis 1',tip:'ofis',aktif:true},{id:'ofis2',ad:'Ofis 2',tip:'ofis',aktif:true},{id:'depo1',ad:'Depo 1',tip:'depo',aktif:true}];_saveLoks(l);}
  return l.filter(function(x){return x.aktif!==false;});
}

// Tab state
var _kTab = localStorage.getItem(KRG_TAB_KEY)||'navlun';
var _navF = 'all';
var _lokF = 'all';
var _lokSel = '';


// ── PANEL INJECT ──────────────────────────────────────────────────
function _injectKargoPanel(){
  var panel=document.getElementById('panel-kargo');
  if(!panel||panel.dataset.v10)return;
  panel.dataset.v10='1';

  var loks=_getLoks();
  var lokOpts=loks.map(function(l){return '<option value="'+l.id+'">'+(l.tip==='ofis'?'🏢':'🏭')+' '+l.ad+'</option>';}).join('');
  var kurFs=['MNG Kargo','Yurtiçi Kargo','PTT Kargo','Aras Kargo','DHL','FedEx','UPS','Diğer'];

  var KRG_CATS = [
    { id:'navlun',   icon:'🚢', label:'Navlun & Konteyner' },
    { id:'lokasyon', icon:'🏭', label:'Lokasyon Kargo' },
    { id:'kurye',    icon:'📬', label:'Kurye / Yurt İçi' },
  ];

  panel.innerHTML=[
    // TOPBAR — flat modern
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">',
      '<div><div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">Kargo Merkezi</div>',
      '<div style="font-size:10px;color:var(--t3);margin-top:2px">Navlun, konteyner, lokasyon ve kurye</div></div>',
    '</div>',
    // TAB NAVİGASYON — sidebar yerine üstte
    '<div style="display:flex;border-bottom:0.5px solid var(--b);background:var(--sf);padding:0 16px">',
      KRG_CATS.map(function(c){
        return '<div class="krg-cat-btn" data-kc="'+c.id+'" onclick="KargoV10.setTab(\''+c.id+'\')" style="padding:11px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s;white-space:nowrap">'
          +c.icon+' '+c.label+'</div>';
      }).join(''),
    '</div>',
    // İçerik
    '<div style="overflow-y:auto">',
      '<div id="krg-content-navlun" style="display:none"></div>',
      '<div id="krg-content-lokasyon" style="display:none"></div>',
      '<div id="krg-content-kurye" style="display:none"></div>',
    '</div>',
    _modalNavlun(),
    _modalLokKrg(lokOpts),
    _modalKurye(kurFs),
    _modalLokYon(),
  ].join('');

  _setTab(_kTab);
}

function _setTab(tab){
  _kTab=tab;
  localStorage.setItem(KRG_TAB_KEY,tab);
  ['navlun','lokasyon','kurye'].forEach(function(t){
    var el=document.getElementById('krg-content-'+t);
    if(el)el.style.display=t===tab?'block':'none';
  });
  // Kategori butonları highlight
  document.querySelectorAll('.krg-cat-btn').forEach(function(b) {
    var active = b.dataset.kc === tab;
    b.classList.toggle('krg-cat-active', active);
    b.style.borderBottomColor = active ? 'var(--ac)' : 'transparent';
    b.style.color = active ? 'var(--ac)' : 'var(--t2)';
    b.style.fontWeight = active ? '600' : '400';
  });
  if(tab==='navlun')   _renderNavlunTab();
  if(tab==='lokasyon') _renderLokTab();
  if(tab==='kurye')    _renderKuryeTab();
}

// ── NAVLUN TAB ────────────────────────────────────────────────────
function _renderNavlunTab(){
  var cont=document.getElementById('krg-content-navlun');
  if(!cont)return;
  var kargo=typeof loadKargo==='function'?loadKargo():[];
  var konts=typeof loadKonteyn==='function'?loadKonteyn():[];
  var today=new Date().toISOString().slice(0,10);
  var aktif=kargo.filter(function(k){return k.status!=='teslim';});
  var aktifKt=konts.filter(function(k){return !k.closed;});
  var alarm=konts.filter(function(k){
    if(k.closed||!k.eta)return false;
    return Math.ceil((new Date(k.eta)-new Date())/86400000)<=7;
  });

  cont.innerHTML=[
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:8px">',
      '<div style="display:flex;gap:6px;flex-wrap:wrap">',
        '<button class="chip on" data-nf="all" onclick="KargoV10.setNavF(\'all\',this)" style="font-size:11px">Tümü</button>',
        '<button class="chip" data-nf="deniz" onclick="KargoV10.setNavF(\'deniz\',this)" style="font-size:11px">🚢 Deniz</button>',
        '<button class="chip" data-nf="hava" onclick="KargoV10.setNavF(\'hava\',this)" style="font-size:11px">✈️ Hava</button>',
        '<button class="chip" data-nf="tren" onclick="KargoV10.setNavF(\'tren\',this)" style="font-size:11px">🚂 Tren</button>',
        '<button class="chip" data-nf="kara" onclick="KargoV10.setNavF(\'kara\',this)" style="font-size:11px">🚛 Kara</button>',
        '<input class="fi" id="navlun-search" placeholder="Firma, liman..." oninput="KargoV10.renderNavlunList()" style="font-size:12px;width:160px">',
      '</div>',
      '<div style="display:flex;gap:6px;flex-wrap:wrap">',
        '<button class="btn btns" onclick="exportKargoXlsx()" style="font-size:12px">⬇ Excel</button>',
        '<button class="btn btns" onclick="openKargoFirmaModal()" style="font-size:12px">⚙️ Firmalar</button>',
        '<button class="btn btns" onclick="KargoV10.openNavMo(null,\'gelen\')" style="font-size:12px">📥 Gelen</button>',
        '<button class="btn btnp" onclick="KargoV10.openNavMo(null,\'giden\')" style="font-size:12px">📤 Giden</button>',
      '</div>',
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b)">',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600">'+kargo.length+'</div><div style="font-size:11px;color:var(--t3)">Toplam Kargo</div></div>',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600;color:#185FA5">'+aktif.length+'</div><div style="font-size:11px;color:var(--t3)">Aktif Sevkiyat</div></div>',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600">'+aktifKt.length+'</div><div style="font-size:11px;color:var(--t3)">Aktif Konteyner</div></div>',
      '<div style="padding:12px 18px"><div style="font-size:22px;font-weight:600;color:'+(alarm.length?'#A32D2D':'var(--t)')+'">'+alarm.length+'</div><div style="font-size:11px;color:var(--t3)">ETA Alarm (7g)</div></div>',
    '</div>',
    '<div id="navlun-kargo-list"></div>',
    '<div style="border-top:2px solid var(--b);margin-top:8px">',
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b)">',
        '<span style="font-size:13px;font-weight:600">🚢 Konteyner Takibi</span>',
        '<div style="display:flex;gap:6px">',
          '<button class="btn btns" onclick="checkAllKonteyn()" style="font-size:12px">↻ Kontrol</button>',
          '<button class="btn btnp" onclick="window.openKonteynModal(null)" style="font-size:12px">+ Konteyner</button>',
        '</div>',
      '</div>',
      '<div id="navlun-konteyn-list"></div>',
    '</div>',
    '<div style="border-top:2px solid var(--b);margin-top:8px">',
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b)">',
        '<span style="font-size:13px;font-weight:600">📋 Navlun Teklifleri</span>',
        '<div style="display:flex;gap:6px">',
          '<button class="btn btns" onclick="exportNavlunXlsx()" style="font-size:12px">⬇ Excel</button>',
          '<button class="btn btnp" onclick="openNavlunModal(null)" style="font-size:12px">+ Teklif</button>',
        '</div>',
      '</div>',
      '<div id="navlun-list" style="padding:16px"></div>',
    '</div>',
  ].join('');

  KargoV10.renderNavlunList();
  _renderKtnList();
  // Navlun inject — retry + event listener
  if (typeof window.renderNavlun === 'function') {
    window.renderNavlun();
  } else {
    var nl2 = document.getElementById('navlun-list');
    if (nl2) nl2.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t3)">Navlun modülü yükleniyor...</div>';
    window.addEventListener('navlun-ready', function() {
      if (typeof window.renderNavlun === 'function') window.renderNavlun();
    }, { once: true });
    // Fallback: 5 saniye sonra hâlâ yüklenmediyse
    setTimeout(function() {
      if (typeof window.renderNavlun === 'function') { window.renderNavlun(); return; }
      var nl3 = document.getElementById('navlun-list');
      if (nl3 && nl3.innerHTML.includes('yükleniyor')) nl3.innerHTML = '<div style="padding:32px;text-align:center;color:var(--rdt)">Navlun modülü yüklenemedi — sayfayı yenileyin</div>';
    }, 5000);
  }
}

function _renderNavlunList(){
  var cont=document.getElementById('navlun-kargo-list');
  if(!cont)return;
  var kargo=typeof loadKargo==='function'?loadKargo():[];
  var users=typeof loadUsers==='function'?loadUsers():[];
  var today=new Date().toISOString().slice(0,10);
  var search=(document.getElementById('navlun-search')?.value||'').toLowerCase();

  var fl=kargo.filter(function(k){
    if(_navF!=='all'&&k.tasimaTipi!==_navF)return false;
    if(search&&!((k.firm||'').toLowerCase().includes(search)||(k.from||'').toLowerCase().includes(search)||(k.to||'').toLowerCase().includes(search)))return false;
    return true;
  });

  if(!fl.length){
    cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:32px;margin-bottom:10px">🚢</div><div style="font-size:14px;font-weight:500;color:var(--t);margin-bottom:4px">Kargo kaydı yok</div><div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button class="btn" onclick="KargoV10.openNavMo(null,\'gelen\')">📥 Gelen</button><button class="btn btnp" onclick="KargoV10.openNavMo(null,\'giden\')">📤 Giden</button></div></div>';
    return;
  }

  // Taşıma tipine göre grupla
  var grouped={};
  fl.forEach(function(k){var t=k.tasimaTipi||'deniz';if(!grouped[t])grouped[t]=[];grouped[t].push(k);});

  var html='';
  Object.keys(grouped).forEach(function(tip){
    var list=grouped[tip];
    var tc=KRG_TASIMA[tip]||{l:tip,ic:'📦'};
    html+='<div style="border-bottom:1px solid var(--b)"><div style="padding:8px 20px;background:var(--s2);font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">'+tc.ic+' '+tc.l+' — '+list.length+' sevkiyat</div>';
    list.forEach(function(k){
      var isL=k.status!=='teslim'&&k.date&&k.date<today;
      var st=KARGO_STATUS[k.status]||KARGO_STATUS.bekle;
      var dl=k.date?Math.ceil((new Date(k.date)-new Date())/86400000):null;
      // timeline
      var steps=['Giriş','Yükleme','Yolda','Varış','Teslim'];
      var ai={bekle:1,yolda:2,teslim:4,iade:0}[k.status]??1;
      var tl='<div style="display:flex;align-items:center;flex:1;padding:0 4px">'+steps.map(function(s,i){
        var done=i<ai,active=i===ai,warn=active&&isL;
        var db=done?'#22C55E':active?(warn?'#F59E0B':'#3B82F6'):'var(--s3,#ddd)';
        var lb=done?'#22C55E':'var(--b)';
        var lc=done?'#22C55E':active?(warn?'#854F0B':'#185FA5'):'var(--t3)';
        return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative">'+(i>0?'<div style="position:absolute;top:6px;left:-50%;width:100%;height:1.5px;background:'+lb+';z-index:0"></div>':'')+'<div style="width:12px;height:12px;border-radius:50%;background:'+db+';z-index:1"></div><div style="font-size:9px;margin-top:2px;color:'+lc+';white-space:nowrap">'+s+'</div></div>';
      }).join('')+'</div>';
      // eta badge
      var eta='';
      if(dl!==null){
        if(k.status==='teslim')eta=_bdg('Teslim','#3B6D11','rgba(59,109,17,.09)');
        else if(isL)eta=_bdg('Gecikti','#A32D2D','rgba(163,45,45,.09)');
        else if(dl<=2)eta=_bdg(dl+' gün','#854F0B','rgba(133,79,11,.09)');
        else eta=_bdg(dl+' gün','#185FA5','rgba(24,95,165,.09)');
      }
      var dc=k.dir==='gelen'?'rgba(24,95,165,.09)':'rgba(139,92,246,.09)';
      var dcc=k.dir==='gelen'?'#185FA5':'#6D28D9';
      var isOnayBekle=k.status==='onay_bekle';
      var rowBg=isOnayBekle?';background:rgba(133,79,11,.03)':isL?';background:rgba(163,45,45,.02)':'';
      var onayBadge=isOnayBekle?'<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(133,79,11,.1);color:#854F0B;margin-left:4px">Onay bekliyor</span>':'';
      html+='<div style="display:grid;grid-template-columns:70px 200px 1fr 80px 140px;align-items:center;gap:10px;padding:11px 20px;border-bottom:1px solid var(--b)'+rowBg+'">'+
        '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:'+dc+';color:'+dcc+'">'+(k.dir==='gelen'?'Gelen':'Giden')+'</span>'+
        '<div>'+
          '<div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(k.firm||'-')+onayBadge+'</div>'+
          '<div style="font-size:11px;color:var(--t3)">'+(k.from||'-')+' → '+(k.to||'-')+'</div>'+
          (k.teslimEden||k.teslimAlan?'<div style="font-size:10px;color:var(--t3);margin-top:1px">'+(k.teslimEden||'-')+' → '+(k.teslimAlan||'-')+'</div>':'')+
          (k.imgdata?'<img src="'+k.imgdata+'" style="height:20px;border-radius:3px;margin-top:2px;vertical-align:middle">':'')+
        '</div>'+
        tl+
        '<div>'+eta+'</div>'+
        '<div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">'+
          (isOnayBekle&&_isAK()?'<button class="btn btns btng" onclick="KargoV10.onayKargo('+k.id+')" style="font-size:11px;padding:3px 7px">✓ Onayla</button>':'')+
          (k.status!=='teslim'&&!isOnayBekle?'<button class="btn btns" onclick="KargoV10.markT('+k.id+')" style="font-size:11px;padding:3px 7px">Teslim</button>':'')+
          '<button class="btn btns" onclick="KargoV10.openNavMo('+k.id+')" style="font-size:11px;padding:3px 7px">Düzenle</button>'+
          (_isAK()?'<button class="btn btns" onclick="KargoV10.delKrg('+k.id+')" style="font-size:11px;padding:3px 7px;color:var(--rdt)">Sil</button>':'')+
        '</div>'+
      '</div>';
    });
    html+='</div>';
  });
  cont.innerHTML=html;
}

function _renderKtnList(){
  var cont=document.getElementById('navlun-konteyn-list');
  if(!cont)return;
  var konts=typeof loadKonteyn==='function'?loadKonteyn():[];
  var users=typeof loadUsers==='function'?loadUsers():[];
  var today=new Date();
  var cu=window.Auth?.getCU?.();
  // İzolasyon: admin tümünü, diğerleri kendi + izin verilenleri görür
  var aktif=konts.filter(function(k){
    if(k.closed) return false;
    if(window.isAdmin?.()) return true;
    if(cu && k.uid===cu.id) return true;
    if(cu && Array.isArray(k.viewers) && k.viewers.includes(cu.id)) return true;
    return false;
  });
  if(!aktif.length){
    cont.innerHTML='<div style="padding:28px;text-align:center;color:var(--t3)"><div style="font-size:24px;margin-bottom:8px">🚢</div><div style="font-size:12px;margin-bottom:10px">Aktif konteyner yok</div><button class="btn btnp" onclick="window.openKonteynModal(null)" style="font-size:12px">+ Konteyner Ekle</button></div>';
    return;
  }
  var html='<div style="display:grid;grid-template-columns:120px 1fr 60px 80px 70px 90px;padding:8px 20px;background:var(--s2);border-bottom:1px solid var(--b)">'+
    ['No','Hat / Sorumlu','%','ETA','Takip',''].map(function(h){return '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase">'+h+'</div>';}).join('')+'</div>';
  aktif.forEach(function(k){
    var u=users.find(function(x){return x.id===k.uid;})||{name:'-'};
    var etaD=k.eta?new Date(k.eta):null;
    var dl=etaD?Math.ceil((etaD-today)/86400000):null;
    var isU=dl!==null&&dl<=0,isA=dl!==null&&dl>0&&dl<=5;
    var steps=[k.evrakGon,k.evrakUlasti,k.inspectionBitti,k.malTeslim].filter(Boolean).length;
    var pct=Math.round(steps/4*100);
    var turl=k.hat&&KTN_TRACKING_URLS[k.hat]?KTN_TRACKING_URLS[k.hat]+(k.no||''):null;
    html+='<div style="display:grid;grid-template-columns:120px 1fr 60px 80px 70px 90px;align-items:center;gap:10px;padding:10px 20px;border-bottom:1px solid var(--b)">'+
      '<div style="font-size:12px;font-weight:600;font-family:\'DM Mono\',monospace">'+(k.no||'-')+'</div>'+
      '<div><div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(pct===100?'#3B6D11':'#185FA5')+';border-radius:2px"></div></div><div style="font-size:10px;color:var(--t3);margin-top:3px">'+(k.hat||'-')+' · '+u.name+'</div></div>'+
      '<div style="font-size:11px;font-weight:600;text-align:center">'+pct+'%</div>'+
      '<div style="font-size:11px;font-weight:500;color:'+(isU?'#A32D2D':isA?'#854F0B':'var(--t2)')+'">'+( dl===null?'—':isU?'Geçti':dl+' gün')+'</div>'+
      '<div>'+(turl?'<a href="'+turl+'" target="_blank" style="font-size:11px;color:var(--ac);text-decoration:none">↗ Takip</a>':'-')+'</div>'+
      '<div style="display:flex;gap:4px"><button class="btn btns" onclick="window.openKonteynDetail('+k.id+')" style="font-size:11px;padding:3px 7px">Detay</button><button class="btn btns" onclick="window.openKonteynModal('+k.id+')" style="font-size:11px;padding:3px 7px">Düzenle</button></div>'+
    '</div>';
  });
  cont.innerHTML=html;
}

// ── LOKASYON TAB ─────────────────────────────────────────────────
function _renderLokTab(){
  var cont=document.getElementById('krg-content-lokasyon');
  if(!cont)return;
  var loks=_getLoks();
  var kayit=_loadLokKrg();
  var giris=kayit.filter(function(k){return k.dir==='giris';}).length;
  var cikis=kayit.filter(function(k){return k.dir==='cikis';}).length;
  var bekle=kayit.filter(function(k){return k.durum==='bekle';}).length;

  var lokOpts=loks.map(function(l){return '<option value="'+l.id+'">'+(l.tip==='ofis'?'🏢':'🏭')+' '+l.ad+'</option>';}).join('');
  var lokSelOpts='<option value="">Tüm Lokasyonlar</option>'+lokOpts;

  cont.innerHTML=[
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:8px">',
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">',
        '<button class="chip on" data-lf="all" onclick="KargoV10.setLokF(\'all\',this)" style="font-size:11px">Tümü</button>',
        '<button class="chip" data-lf="giris" onclick="KargoV10.setLokF(\'giris\',this)" style="font-size:11px">📥 Giriş</button>',
        '<button class="chip" data-lf="cikis" onclick="KargoV10.setLokF(\'cikis\',this)" style="font-size:11px">📤 Çıkış</button>',
        '<button class="chip" data-lf="bekle" onclick="KargoV10.setLokF(\'bekle\',this)" style="font-size:11px">⏳ Bekleyen</button>',
        '<select class="fi" id="lok-sel" onchange="KargoV10.setLokSel(this.value)" style="font-size:12px;padding:5px 10px;border-radius:8px;width:150px">'+lokSelOpts+'</select>',
      '</div>',
      '<div style="display:flex;gap:6px">',
        '<button class="btn btns" onclick="KargoV10.openLokYon()" style="font-size:12px">⚙️ Lokasyonlar</button>',
        '<button class="btn btns" onclick="KargoV10.openLokMo(null,\'giris\')" style="font-size:12px">📥 Giriş</button>',
        '<button class="btn btnp" onclick="KargoV10.openLokMo(null,\'cikis\')" style="font-size:12px">📤 Çıkış</button>',
      '</div>',
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b)">',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600">'+kayit.length+'</div><div style="font-size:11px;color:var(--t3)">Toplam</div></div>',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600;color:#3B6D11">'+giris+'</div><div style="font-size:11px;color:var(--t3)">Giriş</div></div>',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600;color:#185FA5">'+cikis+'</div><div style="font-size:11px;color:var(--t3)">Çıkış</div></div>',
      '<div style="padding:12px 18px"><div style="font-size:22px;font-weight:600;color:'+(bekle?'#854F0B':'var(--t)')+'">'+bekle+'</div><div style="font-size:11px;color:var(--t3)">Bekleyen</div></div>',
    '</div>',
    '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">',
      '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Lokasyonlar</div>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap">',
        loks.map(function(l){
          var g2=kayit.filter(function(k){return k.lokasyon===l.id&&k.dir==='giris';}).length;
          var c2=kayit.filter(function(k){return k.lokasyon===l.id&&k.dir==='cikis';}).length;
          return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px 16px;min-width:130px;cursor:pointer" onclick="KargoV10.setLokSel(\''+l.id+'\')" onmouseenter="this.style.borderColor=\'var(--ac)\'" onmouseleave="this.style.borderColor=\'var(--b)\'">'+(l.tip==='ofis'?'🏢':'🏭')+'<div style="font-size:13px;font-weight:600;margin-top:6px">'+l.ad+'</div><div style="font-size:11px;color:var(--t3);margin-top:3px">'+g2+' giriş · '+c2+' çıkış</div></div>';
        }).join('')+
        '<div style="border:1.5px dashed var(--bm);border-radius:10px;padding:12px 16px;min-width:130px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:12px" onclick="KargoV10.openLokYon()" onmouseenter="this.style.color=\'var(--ac)\'">+ Lokasyon Ekle</div>',
      '</div>',
    '</div>',
    '<div id="lok-list"></div>',
  ].join('');

  _renderLokList();
}

function _renderLokList(){
  var cont=document.getElementById('lok-list');
  if(!cont)return;
  var kayit=_loadLokKrg();
  var loks=_getLoks();
  var fl=kayit.filter(function(k){
    if(_lokF==='giris'&&k.dir!=='giris')return false;
    if(_lokF==='cikis'&&k.dir!=='cikis')return false;
    if(_lokF==='bekle'&&k.durum!=='bekle')return false;
    if(_lokSel&&k.lokasyon!==_lokSel)return false;
    return true;
  }).sort(function(a,b){return (b.id||0)-(a.id||0);});

  if(!fl.length){
    cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:32px;margin-bottom:10px">🏭</div><div style="font-size:14px;font-weight:500;color:var(--t);margin-bottom:4px">Kayıt bulunamadı</div></div>';
    return;
  }
  var hdr='<div style="display:grid;grid-template-columns:60px 1fr 120px 100px 80px 120px;padding:8px 20px;background:var(--s2);border-bottom:1px solid var(--b)">'+
    ['Yön','Ürün','Lokasyon','Miktar','Tarih',''].map(function(h){return '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase">'+h+'</div>';}).join('')+'</div>';
  var rows=fl.map(function(k){
    var lok=loks.find(function(l){return l.id===k.lokasyon;});
    var dc=k.dir==='giris'?'rgba(59,109,17,.09)':'rgba(24,95,165,.09)';
    var dcc=k.dir==='giris'?'#3B6D11':'#185FA5';
    return '<div style="display:grid;grid-template-columns:60px 1fr 120px 100px 80px 120px;align-items:center;padding:10px 20px;border-bottom:1px solid var(--b)">'+
      '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:'+dc+';color:'+dcc+'">'+(k.dir==='giris'?'Giriş':'Çıkış')+'</span>'+
      '<div><div style="font-size:12px;font-weight:500">'+(k.urun||'-')+'</div><div style="font-size:11px;color:var(--t3)">'+(k.aciklama||'')+'</div></div>'+
      '<div style="font-size:12px;color:var(--t2)">'+(lok?lok.ad:k.lokasyon||'-')+'</div>'+
      '<div style="font-size:12px;font-family:\'DM Mono\',monospace">'+(k.miktar||'-')+' '+(k.birim||'')+'</div>'+
      '<div style="font-size:11px;color:var(--t3)">'+(k.tarih||'').slice(0,10)+'</div>'+
      '<div style="display:flex;gap:4px;justify-content:flex-end">'+
        (k.durum==='bekle'&&_isAK()?'<button class="btn btns btng" onclick="KargoV10.onayLok('+k.id+')" style="font-size:11px;padding:3px 7px">✓</button>':'')+
        '<button class="btn btns" onclick="KargoV10.openLokMo('+k.id+')" style="font-size:11px;padding:3px 7px">Düzenle</button>'+
        (_isAK()?'<button class="btn btns" onclick="KargoV10.delLok('+k.id+')" style="font-size:11px;padding:3px 7px;color:var(--rdt)">Sil</button>':'')+
      '</div>'+
    '</div>';
  }).join('');
  cont.innerHTML=hdr+rows;
}

// ── KURYE TAB ─────────────────────────────────────────────────────
function _renderKuryeTab(){
  var cont=document.getElementById('krg-content-kurye');
  if(!cont)return;
  var kayit=_loadKurye();
  var bekle=kayit.filter(function(k){return k.durum==='bekle';}).length;
  var yolda=kayit.filter(function(k){return k.durum==='yolda';}).length;
  var teslim=kayit.filter(function(k){return k.durum==='teslim';}).length;
  cont.innerHTML=[
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:8px">',
      '<input class="fi" id="kurye-search" placeholder="Takip no, gönderici, alıcı..." oninput="KargoV10.renderKuryeList()" style="font-size:12px;width:220px">',
      '<div style="display:flex;gap:6px">',
        '<button class="btn btnp" onclick="KargoV10.openKurMo(null)" style="font-size:12px">+ Gönderi Ekle</button>',
      '</div>',
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--b)">',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600;color:#854F0B">'+bekle+'</div><div style="font-size:11px;color:var(--t3)">Beklemede</div></div>',
      '<div style="padding:12px 18px;border-right:1px solid var(--b)"><div style="font-size:22px;font-weight:600;color:#185FA5">'+yolda+'</div><div style="font-size:11px;color:var(--t3)">Yolda</div></div>',
      '<div style="padding:12px 18px"><div style="font-size:22px;font-weight:600;color:#3B6D11">'+teslim+'</div><div style="font-size:11px;color:var(--t3)">Teslim</div></div>',
    '</div>',
    '<div id="kurye-list"></div>',
  ].join('');
  _renderKuryeList2();
}

function _renderKuryeList2(){
  var cont=document.getElementById('kurye-list');
  if(!cont)return;
  var kayit=_loadKurye();
  var search=(document.getElementById('kurye-search')?.value||'').toLowerCase();
  var fl=kayit.filter(function(k){
    if(!search)return true;
    return (k.takipNo||'').toLowerCase().includes(search)||(k.gonderen||'').toLowerCase().includes(search)||(k.alici||'').toLowerCase().includes(search)||(k.kurye||'').toLowerCase().includes(search);
  }).sort(function(a,b){return(b.id||0)-(a.id||0);});

  if(!fl.length){
    cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:32px;margin-bottom:10px">📬</div><div style="font-size:14px;font-weight:500;color:var(--t);margin-bottom:4px">Kurye kaydı yok</div><button class="btn btnp" onclick="KargoV10.openKurMo(null)" style="font-size:12px;margin-top:8px">+ Gönderi Ekle</button></div>';
    return;
  }
  var hdr='<div style="display:grid;grid-template-columns:130px 1fr 1fr 80px 90px 110px;padding:8px 20px;background:var(--s2);border-bottom:1px solid var(--b)">'+
    ['Firma/Takip','Gönderici','Alıcı','Tarih','Durum',''].map(function(h){return '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase">'+h+'</div>';}).join('')+'</div>';
  var rows=fl.map(function(k){
    var st=KARGO_STATUS[k.durum]||KARGO_STATUS.bekle;
    var turl=k.takipNo&&KURYE_TRACKING[k.kurye]?KURYE_TRACKING[k.kurye]+k.takipNo:null;
    return '<div style="display:grid;grid-template-columns:130px 1fr 1fr 80px 90px 110px;align-items:center;padding:10px 20px;border-bottom:1px solid var(--b)">'+
      '<div><div style="font-size:12px;font-weight:500">'+(k.kurye||'-')+'</div>'+(k.takipNo?'<div style="font-size:10px;font-family:\'DM Mono\',monospace;color:var(--t3)">'+k.takipNo+'</div>':'')+' </div>'+
      '<div style="font-size:12px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(k.gonderen||'-')+'</div>'+
      '<div style="font-size:12px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(k.alici||'-')+'</div>'+
      '<div style="font-size:11px;color:var(--t3)">'+(k.tarih||'').slice(0,10)+'</div>'+
      '<div>'+_bdg(st.l,st.c,st.bg)+'</div>'+
      '<div style="display:flex;gap:4px;justify-content:flex-end">'+
        (turl?'<a href="'+turl+'" target="_blank" class="btn btns" style="font-size:11px;padding:3px 7px;text-decoration:none">↗</a>':'')+
        '<button class="btn btns" onclick="KargoV10.openKurMo('+k.id+')" style="font-size:11px;padding:3px 7px">Düzenle</button>'+
        (_isAK()?'<button class="btn btns" onclick="KargoV10.delKur('+k.id+')" style="font-size:11px;padding:3px 7px;color:var(--rdt)">Sil</button>':'')+
      '</div>'+
    '</div>';
  }).join('');
  cont.innerHTML=hdr+rows;
}

// ── MODAL HTML ────────────────────────────────────────────────────
function _modalNavlun(){return [
  '<div class="mo" id="mo-kv10-nav"><div class="moc" style="max-width:540px">',
    '<div class="moh"><span class="mot" id="mo-kv10-nav-t">+ Kargo</span><button class="mcl" onclick="closeMo(\'mo-kv10-nav\')">✕</button></div>',
    '<div class="mob">',
      '<input type="hidden" id="kv10-nav-eid">',
      '<input type="hidden" id="kv10-nav-imgdata">',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Taşıma Tipi</label><select class="fi" id="kv10-nav-tip"><option value="deniz">🚢 Deniz</option><option value="hava">✈️ Hava</option><option value="tren">🚂 Tren</option><option value="kara">🚛 Kara</option></select></div>',
        '<div><label class="fl">Yön</label><select class="fi" id="kv10-nav-dir"><option value="gelen">📥 Gelen</option><option value="giden">📤 Giden</option></select></div>',
      '</div>',
      '<div class="fg"><label class="fl">Firma / Taşıyıcı *</label><input class="fi" id="kv10-nav-firm" placeholder="Taşıyıcı firma adı"></div>',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Kalkış Limanı</label><input class="fi" id="kv10-nav-from" placeholder="Liman / Şehir"></div>',
        '<div><label class="fl">Varış Limanı</label><input class="fi" id="kv10-nav-to" placeholder="Liman / Şehir"></div>',
      '</div>',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Teslim Eden *</label><input class="fi" id="kv10-nav-teden" placeholder="Gönderici / Tedarikçi"></div>',
        '<div><label class="fl">Teslim Alan *</label><input class="fi" id="kv10-nav-talan" placeholder="Alıcı / Müşteri"></div>',
      '</div>',
      '<div class="fg"><label class="fl">Tarih / ETD</label><input class="fi" type="date" id="kv10-nav-date"></div>',
      '<div class="fg">',
        '<label class="fl">Ürün Görseli <span style="font-size:10px;color:var(--t3)">(opsiyonel)</span></label>',
        '<input type="file" id="kv10-nav-img" accept="image/*" style="font-size:12px;width:100%" onchange="KargoV10.previewNavImg(this)">',
        '<div id="kv10-nav-img-prev" style="margin-top:6px"></div>',
      '</div>',
      '<div class="fg"><label class="fl">Not <span style="font-size:10px;color:var(--t3)">(kullanıcı notu)</span></label><textarea class="fi" id="kv10-nav-note" rows="2" placeholder="Sevkiyata dair notunuzu ekleyin..."></textarea></div>',
      '<div style="background:var(--al);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--ac)">🔐 Yönetici olmayan kayıtlar onaya gönderilir.</div>',
    '</div>',
    '<div class="mof"><button class="btn" onclick="closeMo(\'mo-kv10-nav\')">İptal</button><button class="btn btnp" onclick="KargoV10.saveNav()">Onaya Gönder</button></div>',
  '</div></div>'
].join('');}


function _modalLokKrg(lokOpts){return [
  '<div class="mo" id="mo-kv10-lok"><div class="moc" style="max-width:480px">',
    '<div class="moh"><span class="mot" id="mo-kv10-lok-t">Lokasyon Kargo</span><button class="mcl" onclick="closeMo(\'mo-kv10-lok\')">✕</button></div>',
    '<div class="mob">',
      '<input type="hidden" id="kv10-lok-eid">',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Yön</label><select class="fi" id="kv10-lok-dir"><option value="giris">📥 Giriş</option><option value="cikis">📤 Çıkış</option></select></div>',
        '<div><label class="fl">Lokasyon</label><select class="fi" id="kv10-lok-lok">'+lokOpts+'</select></div>',
      '</div>',
      '<div class="fg"><label class="fl">Ürün / Malzeme *</label><input class="fi" id="kv10-lok-urun" placeholder="Ürün adı"></div>',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Miktar</label><input class="fi" type="number" id="kv10-lok-miktar" placeholder="0" min="0"></div>',
        '<div><label class="fl">Birim</label><select class="fi" id="kv10-lok-birim"><option>Adet</option><option>Kg</option><option>Ton</option><option>m²</option><option>Kutu</option><option>Palet</option></select></div>',
      '</div>',
      '<div class="fg"><label class="fl">Tarih</label><input class="fi" type="date" id="kv10-lok-tarih"></div>',
      '<div class="fg"><label class="fl">Açıklama</label><textarea class="fi" id="kv10-lok-aciklama" rows="2" placeholder="Opsiyonel"></textarea></div>',
      '<div class="fg" style="background:var(--al);border-radius:8px;padding:10px 14px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="kv10-lok-stok" style="accent-color:var(--ac)"><span>Stok kaydına bağla (otomatik güncelle)</span></label></div>',
    '</div>',
    '<div class="mof"><button class="btn" onclick="closeMo(\'mo-kv10-lok\')">İptal</button><button class="btn btnp" onclick="KargoV10.saveLok()">Kaydet</button></div>',
  '</div></div>'
].join('');}

function _modalKurye(firmalar){return [
  '<div class="mo" id="mo-kv10-kur"><div class="moc" style="max-width:460px">',
    '<div class="moh"><span class="mot" id="mo-kv10-kur-t">Kurye Kaydı</span><button class="mcl" onclick="closeMo(\'mo-kv10-kur\')">✕</button></div>',
    '<div class="mob">',
      '<input type="hidden" id="kv10-kur-eid">',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Kurye Firması *</label><select class="fi" id="kv10-kur-firma">'+firmalar.map(function(f){return '<option>'+f+'</option>';}).join('')+'<option value="diger">Diğer</option></select></div>',
        '<div><label class="fl">Takip No</label><input class="fi" id="kv10-kur-takip" placeholder="Barkod" style="font-family:\'DM Mono\',monospace"></div>',
      '</div>',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Gönderici</label><input class="fi" id="kv10-kur-gon" placeholder="Ad / Ofis"></div>',
        '<div><label class="fl">Alıcı</label><input class="fi" id="kv10-kur-ali" placeholder="Ad / Ofis"></div>',
      '</div>',
      '<div class="fg" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
        '<div><label class="fl">Durum</label><select class="fi" id="kv10-kur-durum"><option value="bekle">Beklemede</option><option value="yolda">Yolda</option><option value="teslim">Teslim</option><option value="iade">İade</option></select></div>',
        '<div><label class="fl">Tarih</label><input class="fi" type="date" id="kv10-kur-tarih"></div>',
      '</div>',
      '<div class="fg"><label class="fl">Not</label><textarea class="fi" id="kv10-kur-not" rows="2" placeholder="Opsiyonel"></textarea></div>',
    '</div>',
    '<div class="mof"><button class="btn" onclick="closeMo(\'mo-kv10-kur\')">İptal</button><button class="btn btnp" onclick="KargoV10.saveKur()">Kaydet</button></div>',
  '</div></div>'
].join('');}

function _modalLokYon(){return [
  '<div class="mo" id="mo-kv10-lokyon"><div class="moc" style="max-width:440px">',
    '<div class="moh"><span class="mot">⚙️ Lokasyon Yönetimi</span><button class="mcl" onclick="closeMo(\'mo-kv10-lokyon\')">✕</button></div>',
    '<div class="mob">',
      '<div id="lokyon-liste"></div>',
      '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--b)">',
        '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:8px">Yeni Lokasyon</div>',
        '<div style="display:grid;grid-template-columns:1fr 100px;gap:8px">',
          '<input class="fi" id="kv10-ylon-ad" placeholder="Lokasyon adı (Ofis 3, Depo 2...)">',
          '<select class="fi" id="kv10-ylon-tip"><option value="ofis">🏢 Ofis</option><option value="depo">🏭 Depo</option></select>',
        '</div>',
        '<button class="btn btnp" onclick="KargoV10.addLok()" style="margin-top:8px;width:100%">+ Ekle</button>',
      '</div>',
    '</div>',
  '</div></div>'
].join('');}

// ── CRUD İŞLEMLERİ ────────────────────────────────────────────────
function _openNavMo(id,dir){
  var today=new Date().toISOString().slice(0,10);
  // Görsel önizlemeyi temizle
  var prev=document.getElementById('kv10-nav-img-prev');
  if(prev)prev.innerHTML='';
  var imgd=document.getElementById('kv10-nav-imgdata');
  if(imgd)imgd.value='';
  if(id){
    var k=(typeof loadKargo==='function'?loadKargo():[]).find(function(x){return x.id===id;});
    if(!k)return;
    document.getElementById('kv10-nav-eid').value=id;
    document.getElementById('kv10-nav-tip').value=k.tasimaTipi||'deniz';
    document.getElementById('kv10-nav-dir').value=k.dir||'gelen';
    document.getElementById('kv10-nav-firm').value=k.firm||'';
    document.getElementById('kv10-nav-from').value=k.from||'';
    document.getElementById('kv10-nav-to').value=k.to||'';
    document.getElementById('kv10-nav-teden').value=k.teslimEden||'';
    document.getElementById('kv10-nav-talan').value=k.teslimAlan||'';
    document.getElementById('kv10-nav-date').value=k.date||'';
    document.getElementById('kv10-nav-note').value=k.note||'';
    // Mevcut görsel varsa göster
    if(k.imgdata&&prev){
      prev.innerHTML='<img src="'+k.imgdata+'" style="max-width:100%;max-height:100px;border-radius:6px;border:1px solid var(--b);margin-top:4px">';
      if(imgd)imgd.value=k.imgdata;
    }
    document.getElementById('mo-kv10-nav-t').textContent='✏️ Kargo Düzenle';
  }else{
    document.getElementById('kv10-nav-eid').value='';
    ['kv10-nav-firm','kv10-nav-from','kv10-nav-to','kv10-nav-note','kv10-nav-teden','kv10-nav-talan'].forEach(function(i){var e=document.getElementById(i);if(e)e.value='';});
    document.getElementById('kv10-nav-tip').value='deniz';
    document.getElementById('kv10-nav-dir').value=dir||'gelen';
    document.getElementById('kv10-nav-date').value=today;
    document.getElementById('mo-kv10-nav-t').textContent='+ Kargo Kaydı';
  }
  window.openMo?.('mo-kv10-nav');
}

function _saveNav(){
  var eid=parseInt(document.getElementById('kv10-nav-eid')?.value||'0');
  var firm=(document.getElementById('kv10-nav-firm')?.value||'').trim();
  var from=(document.getElementById('kv10-nav-from')?.value||'').trim();
  var to=(document.getElementById('kv10-nav-to')?.value||'').trim();
  var teden=(document.getElementById('kv10-nav-teden')?.value||'').trim();
  var talan=(document.getElementById('kv10-nav-talan')?.value||'').trim();
  var tip=document.getElementById('kv10-nav-tip')?.value||'deniz';
  var dir=document.getElementById('kv10-nav-dir')?.value||'gelen';
  var date=document.getElementById('kv10-nav-date')?.value||'';
  var note=document.getElementById('kv10-nav-note')?.value||'';
  var imgdata=document.getElementById('kv10-nav-imgdata')?.value||'';
  if(!firm){_toastK('Firma adı zorunludur','err');return;}
  if(!teden){_toastK('Teslim eden zorunludur','err');return;}
  if(!talan){_toastK('Teslim alan zorunludur','err');return;}
  // Madde 3: Onay sistemi
  var isAdmin=_isAK();
  var status=isAdmin?'bekle':'onay_bekle';
  var cu=window.Auth?.getCU?.();
  var kargo=typeof loadKargo==='function'?loadKargo():[];
  if(eid){
    var k=kargo.find(function(x){return x.id===eid;});
    if(k)Object.assign(k,{firm,from,to,teslimEden:teden,teslimAlan:talan,tasimaTipi:tip,dir,status:isAdmin?k.status:'onay_bekle',date,note,imgdata});
  } else {
    var yeni={id:generateNumericId(),firm,from,to,teslimEden:teden,teslimAlan:talan,tasimaTipi:tip,dir,status:status,date,note,imgdata,uid:cu?.id,createdAt:_nowK()};
    kargo.push(yeni);
    // Bildirim: admin değilse yöneticiye bildir
    if(!isAdmin){
      window.addNotif?.('📦','Yeni kargo onay bekliyor: '+firm+' ('+teden+' → '+talan+')','warn','kargo');
    }
  }
  if(typeof saveKargo==='function')saveKargo(kargo);
  else localStorage.setItem('ak_krg1',JSON.stringify(kargo));
  window.closeMo?.('mo-kv10-nav');
  _logK('Kargo '+(eid?'güncellendi':'eklendi')+': '+firm+' '+teden+'→'+talan);
  _toastK(isAdmin?(eid?'Güncellendi':'Eklendi')+' ✓':'Onaya gönderildi ✓','ok');
  _renderNavlunList();
}

function _previewNavImg(inp){
  var prev=document.getElementById('kv10-nav-img-prev');
  var imgd=document.getElementById('kv10-nav-imgdata');
  if(!prev||!inp.files||!inp.files[0])return;
  var r=new FileReader();
  r.onload=function(e){
    prev.innerHTML='<img src="'+e.target.result+'" style="max-width:100%;max-height:100px;border-radius:6px;border:1px solid var(--b)">';
    if(imgd)imgd.value=e.target.result;
  };
  r.readAsDataURL(inp.files[0]);
}

function _onayKargo(id){
  var kargo=typeof loadKargo==='function'?loadKargo():[];
  var k=kargo.find(function(x){return x.id===id;});
  if(!k)return;
  k.status='bekle';
  k.onayAt=_nowK();
  k.onayBy=window.Auth?.getCU?.()?.id;
  if(typeof saveKargo==='function')saveKargo(kargo);
  _logK('Kargo onaylandı: '+k.firm);
  _toastK(k.firm+' onaylandı ✓','ok');
  _renderNavlunList();
}

function _markT(id){
  var kargo=typeof loadKargo==='function'?loadKargo():[];
  var k=kargo.find(function(x){return x.id===id;});
  if(!k)return;
  k.status='teslim';k.teslimAt=_nowK();
  if(typeof saveKargo==='function')saveKargo(kargo);
  _logK('Kargo teslim: '+k.firm);
  _toastK(k.firm+' teslim ✓','ok');
  _renderNavlunList();
}

function _delKrg(id){
  window.confirmModal('Bu kargo silinsin mi?', {
    title: 'Kargo Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function(){
      var kargo=(typeof loadKargo==='function'?loadKargo():[]).filter(function(x){return x.id!==id;});
      if(typeof saveKargo==='function')saveKargo(kargo);
      _renderNavlunList();_toastK('Silindi','ok');
    }
  });
}

function _openLokMo(id,dir){
  var loks=_getLoks();
  var sel=document.getElementById('kv10-lok-lok');
  if(sel){sel.innerHTML=loks.map(function(l){return '<option value="'+l.id+'">'+(l.tip==='ofis'?'🏢':'🏭')+' '+l.ad+'</option>';}).join('');}
  var today=new Date().toISOString().slice(0,10);
  if(id){
    var k=_loadLokKrg().find(function(x){return x.id===id;});
    if(!k)return;
    document.getElementById('kv10-lok-eid').value=id;
    document.getElementById('kv10-lok-dir').value=k.dir||'giris';
    if(sel)sel.value=k.lokasyon||'';
    document.getElementById('kv10-lok-urun').value=k.urun||'';
    document.getElementById('kv10-lok-miktar').value=k.miktar||'';
    document.getElementById('kv10-lok-birim').value=k.birim||'Adet';
    document.getElementById('kv10-lok-tarih').value=k.tarih||'';
    document.getElementById('kv10-lok-aciklama').value=k.aciklama||'';
    document.getElementById('mo-kv10-lok-t').textContent='✏️ Düzenle';
  }else{
    document.getElementById('kv10-lok-eid').value='';
    document.getElementById('kv10-lok-dir').value=dir||'giris';
    ['kv10-lok-urun','kv10-lok-aciklama'].forEach(function(i){var e=document.getElementById(i);if(e)e.value='';});
    document.getElementById('kv10-lok-miktar').value='';
    document.getElementById('kv10-lok-birim').value='Adet';
    document.getElementById('kv10-lok-tarih').value=today;
    document.getElementById('mo-kv10-lok-t').textContent=dir==='giris'?'📥 Giriş Kaydı':'📤 Çıkış Kaydı';
  }
  window.openMo?.('mo-kv10-lok');
}

function _saveLok(){
  var eid=parseInt(document.getElementById('kv10-lok-eid')?.value||'0');
  var dir=document.getElementById('kv10-lok-dir')?.value||'giris';
  var lok=document.getElementById('kv10-lok-lok')?.value||'';
  var urun=(document.getElementById('kv10-lok-urun')?.value||'').trim();
  var miktar=parseFloat(document.getElementById('kv10-lok-miktar')?.value||'0');
  var birim=document.getElementById('kv10-lok-birim')?.value||'Adet';
  var tarih=document.getElementById('kv10-lok-tarih')?.value||'';
  var aciklama=document.getElementById('kv10-lok-aciklama')?.value||'';
  var stokBagla=document.getElementById('kv10-lok-stok')?.checked||false;
  var durum=_isAK()?(dir==='giris'?'giris':'cikis'):'bekle';
  if(!urun){_toastK('Ürün adı zorunludur','err');return;}
  if(!lok){_toastK('Lokasyon seçiniz','err');return;}
  var kayit=_loadLokKrg();
  var cu=window.Auth?.getCU?.();
  if(eid){var k=kayit.find(function(x){return x.id===eid;});if(k)Object.assign(k,{dir,lokasyon:lok,urun,miktar,birim,tarih,aciklama});}
  else{
    var yeni={id:generateNumericId(),dir,lokasyon:lok,urun,miktar,birim,tarih,aciklama,durum,uid:cu?.id,createdAt:_nowK()};
    kayit.push(yeni);
    if(stokBagla&&typeof window.storeStok==='function'){
      try{
        var stoklar=typeof window.loadStok==='function'?window.loadStok():[];
        stoklar.push({id:generateNumericId(),name:urun,tur:'stok',status:dir==='giris'?'giris':'cikis',quantity:miktar,unit:birim,note:'[Lokasyon] '+lok+' '+dir,uid:cu?.id,approved:_isAK(),ts:_nowK(),lokKargoId:yeni.id});
        window.storeStok(stoklar);
      }catch(e){console.warn('[kargo] stok',e);}
    }
  }
  _saveLokKrg(kayit);
  window.closeMo?.('mo-kv10-lok');
  _logK('Lokasyon kargo '+(eid?'güncellendi':'eklendi')+': '+urun);
  _toastK((eid?'Güncellendi':'Eklendi')+' ✓','ok');
  _renderLokList();
}

function _onayLok(id){
  var kayit=_loadLokKrg();var k=kayit.find(function(x){return x.id===id;});
  if(!k)return;k.durum=k.dir==='giris'?'giris':'cikis';k.onayAt=_nowK();
  _saveLokKrg(kayit);_renderLokList();_toastK('Onaylandı ✓','ok');
}

function _delLok(id){
  window.confirmModal('Silinsin mi?', {
    title: 'Lokasyon Kaydı Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function(){
      _saveLokKrg(_loadLokKrg().filter(function(x){return x.id!==id;}));
      _renderLokList();_toastK('Silindi','ok');
    }
  });
}

function _openKurMo(id){
  var today=new Date().toISOString().slice(0,10);
  if(id){
    var k=_loadKurye().find(function(x){return x.id===id;});
    if(!k)return;
    document.getElementById('kv10-kur-eid').value=id;
    document.getElementById('kv10-kur-firma').value=k.kurye||'';
    document.getElementById('kv10-kur-takip').value=k.takipNo||'';
    document.getElementById('kv10-kur-gon').value=k.gonderen||'';
    document.getElementById('kv10-kur-ali').value=k.alici||'';
    document.getElementById('kv10-kur-durum').value=k.durum||'bekle';
    document.getElementById('kv10-kur-tarih').value=k.tarih||'';
    document.getElementById('kv10-kur-not').value=k.not||'';
    document.getElementById('mo-kv10-kur-t').textContent='✏️ Düzenle';
  }else{
    document.getElementById('kv10-kur-eid').value='';
    ['kv10-kur-takip','kv10-kur-gon','kv10-kur-ali','kv10-kur-not'].forEach(function(i){var e=document.getElementById(i);if(e)e.value='';});
    document.getElementById('kv10-kur-durum').value='bekle';
    document.getElementById('kv10-kur-tarih').value=today;
    document.getElementById('mo-kv10-kur-t').textContent='+ Kurye Kaydı';
  }
  window.openMo?.('mo-kv10-kur');
}

function _saveKur(){
  var eid=parseInt(document.getElementById('kv10-kur-eid')?.value||'0');
  var kurye=document.getElementById('kv10-kur-firma')?.value||'';
  var takipNo=(document.getElementById('kv10-kur-takip')?.value||'').trim();
  var gonderen=(document.getElementById('kv10-kur-gon')?.value||'').trim();
  var alici=(document.getElementById('kv10-kur-ali')?.value||'').trim();
  var durum=document.getElementById('kv10-kur-durum')?.value||'bekle';
  var tarih=document.getElementById('kv10-kur-tarih')?.value||'';
  var not=document.getElementById('kv10-kur-not')?.value||'';
  if(!kurye){_toastK('Kurye firması seçiniz','err');return;}
  var kayit=_loadKurye();
  if(eid){var k=kayit.find(function(x){return x.id===eid;});if(k)Object.assign(k,{kurye,takipNo,gonderen,alici,durum,tarih,not});}
  else{kayit.push({id:generateNumericId(),kurye,takipNo,gonderen,alici,durum,tarih,not,uid:window.Auth?.getCU?.()?.id,createdAt:_nowK()});}
  _saveKurye2(kayit);
  window.closeMo?.('mo-kv10-kur');
  _logK('Kurye '+(eid?'güncellendi':'eklendi')+': '+kurye+' '+takipNo);
  _toastK((eid?'Güncellendi':'Eklendi')+' ✓','ok');
  _renderKuryeList2();
}

function _delKur(id){
  window.confirmModal('Silinsin mi?', {
    title: 'Kurye Kaydı Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function(){
      _saveKurye2(_loadKurye().filter(function(x){return x.id!==id;}));
      _renderKuryeList2();_toastK('Silindi','ok');
    }
  });
}

function _openLokYon(){
  var loks=_getLoks();
  var cont=document.getElementById('lokyon-liste');
  if(cont){
    cont.innerHTML=loks.map(function(l){
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">'+(l.tip==='ofis'?'🏢':'🏭')+'<span style="flex:1;font-size:13px;font-weight:500">'+l.ad+'</span><span style="font-size:11px;color:var(--t3)">'+l.tip+'</span><button onclick="KargoV10.delLokItem(\''+l.id+'\')" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:0 4px">✕</button></div>';
    }).join('')||'<div style="color:var(--t3);font-size:12px;padding:8px 0">Henüz lokasyon yok</div>';
  }
  window.openMo?.('mo-kv10-lokyon');
}

function _addLok(){
  var ad=(document.getElementById('kv10-ylon-ad')?.value||'').trim();
  var tip=document.getElementById('kv10-ylon-tip')?.value||'ofis';
  if(!ad){_toastK('Lokasyon adı zorunludur','err');return;}
  var loks=_loadLoks();
  loks.push({id:ad.toLowerCase().replace(/\s+/g,'')+'_'+generateNumericId(),ad,tip,aktif:true});
  _saveLoks(loks);
  var e=document.getElementById('kv10-ylon-ad');if(e)e.value='';
  _toastK(ad+' eklendi ✓','ok');
  _openLokYon();
  _renderLokTab();
}

function _delLokItem(id){
  var loks=_loadLoks();var l=loks.find(function(x){return x.id===id;});
  if(!l)return;
  window.confirmModal('"'+l.ad+'" kaldırılsın mı?', {
    title: 'Lokasyon Kaldır', danger: true, confirmText: 'Evet, Kaldır',
    onConfirm: function(){
      l.aktif=false;_saveLoks(loks);_openLokYon();_renderLokTab();
    }
  });
}

// ════════════════════════════════════════════════════════════════
// KONTEYNER GELİŞMELERİ — Alarm + Evrak + Müşteri Bildirimi + Kullanıcı İzni
// ════════════════════════════════════════════════════════════════

// ── 1. KONTEYNER ALARM SİSTEMİ ──────────────────────────────────
var _ktnAlarmInterval = null;

/**
 * Tüm konteynerlerin ETA tarihine göre alarm kontrolü yapar.
 * 10g, 7g, 3g kala bildirim. Çıkış/varış bildirimi.
 * @returns {void}
 */
function checkKargoAlarms() {
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var today = new Date();
  var todayS = today.toISOString().slice(0, 10);
  var alarmKey = 'ak_ktn_alarm_sent';
  var sent = {};
  try { sent = JSON.parse(localStorage.getItem(alarmKey) || '{}'); } catch (e) { sent = {}; }
  var changed = false;

  konts.forEach(function(k) {
    if (k.closed || !k.eta) return;
    var etaD = new Date(k.eta);
    var dl = Math.ceil((etaD - today) / 86400000);
    var label = (k.no || '?') + ' (' + (k['from-port'] || '?') + ' → ' + (k['to-port'] || '?') + ')';

    // 10 gün kala
    if (dl <= 10 && dl > 7 && !sent[k.id + '_10']) {
      window.addNotif?.('📦', 'Konteyner ' + label + ' — varışa ' + dl + ' gün kaldı', 'info', 'kargo');
      sent[k.id + '_10'] = todayS; changed = true;
    }
    // 7 gün kala
    if (dl <= 7 && dl > 3 && !sent[k.id + '_7']) {
      window.addNotif?.('⚠️', 'Konteyner ' + label + ' — varışa ' + dl + ' gün kaldı', 'warn', 'kargo');
      sent[k.id + '_7'] = todayS; changed = true;
    }
    // 3 gün kala — kırmızı uyarı
    if (dl <= 3 && dl > 0 && !sent[k.id + '_3']) {
      window.addNotif?.('🚨', 'Konteyner ' + label + ' — varışa ' + dl + ' gün! Hazırlıkları tamamlayın', 'err', 'kargo');
      sent[k.id + '_3'] = todayS; changed = true;
    }
    // Varış günü
    if (dl <= 0 && !sent[k.id + '_arrived']) {
      window.addNotif?.('🏁', 'Konteyner ' + label + ' — tahmini varış tarihi geldi!', 'ok', 'kargo');
      sent[k.id + '_arrived'] = todayS; changed = true;
    }
    // Çıkış limanından ayrılma (ETD bugün veya geçmişte ve henüz bildirilmemişse)
    if (k.etd && k.etd <= todayS && !sent[k.id + '_departed']) {
      window.addNotif?.('🚢', 'Konteyner ' + label + ' — çıkış limanından ayrıldı (ETD: ' + k.etd + ')', 'info', 'kargo');
      sent[k.id + '_departed'] = todayS; changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(alarmKey, JSON.stringify(sent));
  }
}

/**
 * Konteyner alarm interval'ını başlatır (her saat).
 */
function _startKtnAlarms() {
  if (_ktnAlarmInterval) return;
  checkKargoAlarms();
  _ktnAlarmInterval = setInterval(checkKargoAlarms, 3600000); // 1 saat
}


// ── 2. EVRAK TAKİBİ ──────────────────────────────────────────────

var KTN_EVRAK_KEY = 'ak_ktn_evrak1';
var KTN_ZORUNLU_EVRAK = [
  { key: 'commercial_invoice', l: 'Commercial Invoice' },
  { key: 'packing_list',       l: 'Packing List' },
  { key: 'certificate_origin', l: 'Certificate of Origin' },
  { key: 'bill_of_lading',     l: 'Bill of Lading' },
  { key: 'diger',              l: 'Diğer' },
];

/**
 * Konteyner evrak verilerini yükler.
 * @returns {Object} { konteynerId: { evrakKey: { done, date, note } } }
 */
function _loadKtnEvrak() {
  try { return JSON.parse(localStorage.getItem(KTN_EVRAK_KEY) || '{}'); } catch (e) { return {}; }
}
function _saveKtnEvrak(d) { localStorage.setItem(KTN_EVRAK_KEY, JSON.stringify(d)); }

/**
 * Konteyner detay modalında evrak bölümünü render eder.
 * @param {number} ktnId
 * @returns {string} HTML
 */
function _renderKtnEvrakHTML(ktnId) {
  var evrakData = _loadKtnEvrak();
  var ktnEvrak  = evrakData[ktnId] || {};
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === ktnId; });
  var todayS = new Date().toISOString().slice(0, 10);

  // ETD + 7 gün sonrası
  var warnDate = '';
  if (k && k.etd) {
    var etdD = new Date(k.etd);
    etdD.setDate(etdD.getDate() + 7);
    warnDate = etdD.toISOString().slice(0, 10);
  }

  var done = 0;
  var total = KTN_ZORUNLU_EVRAK.length;
  KTN_ZORUNLU_EVRAK.forEach(function(e) { if (ktnEvrak[e.key]?.done) done++; });

  var html = '<div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Evraklar (' + done + '/' + total + ')</div>';
  html += '<div style="height:4px;background:var(--s2);border-radius:2px;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:' + Math.round(done / total * 100) + '%;background:' + (done === total ? '#22C55E' : 'var(--ac)') + ';border-radius:2px"></div></div>';

  KTN_ZORUNLU_EVRAK.forEach(function(e) {
    var ev = ktnEvrak[e.key] || { done: false, date: '', note: '' };
    var isLate = !ev.done && warnDate && todayS > warnDate;
    var bg = isLate ? 'rgba(239,68,68,.06)' : 'var(--sf)';
    var border = isLate ? 'border:1px solid rgba(239,68,68,.2)' : 'border:1px solid var(--b)';

    html += '<div style="' + border + ';border-radius:8px;padding:8px 12px;margin-bottom:6px;background:' + bg + '">'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + '<input type="checkbox" ' + (ev.done ? 'checked' : '') + ' onchange="window._toggleKtnEvrak(' + ktnId + ',\'' + e.key + '\',this.checked)" style="accent-color:var(--ac);flex-shrink:0">'
        + '<span style="flex:1;font-size:12px;font-weight:500;color:' + (ev.done ? '#22C55E' : isLate ? '#EF4444' : 'var(--t)') + '">' + e.l + '</span>'
        + (isLate ? '<span style="font-size:9px;color:#EF4444;font-weight:700">⚠ GECİKMİŞ</span>' : '')
        + (ev.date ? '<span style="font-size:10px;color:var(--t3)">' + ev.date + '</span>' : '')
      + '</div>'
      + (ev.note ? '<div style="font-size:10px;color:var(--t3);margin:4px 0 0 26px">' + ev.note + '</div>' : '')
    + '</div>';
  });

  // Not ekleme
  html += '<div style="margin-top:6px"><input class="fi" id="ktn-evrak-note-' + ktnId + '" placeholder="Evrak notu ekle…" style="font-size:11px;padding:6px 10px">'
    + '<div style="display:flex;gap:6px;margin-top:4px">'
      + '<select class="fi" id="ktn-evrak-sel-' + ktnId + '" style="font-size:11px;flex:1">'
        + KTN_ZORUNLU_EVRAK.map(function(e) { return '<option value="' + e.key + '">' + e.l + '</option>'; }).join('')
      + '</select>'
      + '<button class="btn btns" onclick="window._addKtnEvrakNote(' + ktnId + ')" style="font-size:11px;padding:4px 10px">Not Ekle</button>'
    + '</div></div>';

  return html;
}

/**
 * Evrak checkbox toggle.
 */
window._toggleKtnEvrak = function(ktnId, evrakKey, checked) {
  var data = _loadKtnEvrak();
  if (!data[ktnId]) data[ktnId] = {};
  if (!data[ktnId][evrakKey]) data[ktnId][evrakKey] = { done: false, date: '', note: '' };
  data[ktnId][evrakKey].done = checked;
  if (checked) data[ktnId][evrakKey].date = new Date().toISOString().slice(0, 10);
  _saveKtnEvrak(data);
  // Detay modalı açıksa yenile
  var detailMo = document.getElementById('mo-ktn-detail');
  if (detailMo) { var evCont = document.getElementById('ktn-evrak-cont-' + ktnId); if (evCont) evCont.innerHTML = _renderKtnEvrakHTML(ktnId); }
  _toastK(checked ? 'Evrak tamamlandı ✓' : 'Evrak kaldırıldı', 'ok');
};

/**
 * Evrak notu ekle.
 */
window._addKtnEvrakNote = function(ktnId) {
  var note = (document.getElementById('ktn-evrak-note-' + ktnId)?.value || '').trim();
  var evrakKey = document.getElementById('ktn-evrak-sel-' + ktnId)?.value || 'diger';
  if (!note) { _toastK('Not boş', 'err'); return; }
  var data = _loadKtnEvrak();
  if (!data[ktnId]) data[ktnId] = {};
  if (!data[ktnId][evrakKey]) data[ktnId][evrakKey] = { done: false, date: '', note: '' };
  data[ktnId][evrakKey].note = note;
  _saveKtnEvrak(data);
  var inp = document.getElementById('ktn-evrak-note-' + ktnId); if (inp) inp.value = '';
  var evCont = document.getElementById('ktn-evrak-cont-' + ktnId); if (evCont) evCont.innerHTML = _renderKtnEvrakHTML(ktnId);
  _toastK('Not eklendi ✓', 'ok');
};


// ── 3. MÜŞTERİ BİLDİRİMİ — Hazır mesaj şablonları ──────────────

/**
 * Müşteri bildirim şablonlarını gösterir (EN + FR).
 * @param {number} ktnId
 */
function openKtnMusteriBildirim(ktnId) {
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === ktnId; });
  if (!k) { _toastK('Konteyner bulunamadı', 'err'); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var musteri = k.musteri || 'Customer';
  var no = k.no || 'N/A';
  var eta = k.eta || 'TBD';
  var from = k['from-port'] || '';
  var to = k['to-port'] || '';
  var hat = k.hat || '';

  var msgEN = 'Dear ' + musteri + ',\n\n'
    + 'We would like to inform you that your shipment is scheduled to arrive within the next 7 days.\n\n'
    + 'Container No: ' + no + '\n'
    + 'Route: ' + from + ' → ' + to + '\n'
    + 'Carrier: ' + hat + '\n'
    + 'ETA: ' + eta + '\n\n'
    + 'Please ensure all necessary arrangements are in place for customs clearance and delivery.\n\n'
    + 'Best regards,\nDuay Global LLC';

  var msgFR = 'Cher(e) ' + musteri + ',\n\n'
    + 'Nous avons le plaisir de vous informer que votre expédition est prévue dans les 7 prochains jours.\n\n'
    + 'N° Conteneur: ' + no + '\n'
    + 'Itinéraire: ' + from + ' → ' + to + '\n'
    + 'Transporteur: ' + hat + '\n'
    + 'ETA: ' + eta + '\n\n'
    + 'Veuillez vous assurer que toutes les dispositions nécessaires sont prises pour le dédouanement et la livraison.\n\n'
    + 'Cordialement,\nDuay Global LLC';

  var old = document.getElementById('mo-ktn-msg'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-ktn-msg'; 
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:12px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">📧 Müşteri Bildirimi — ' + esc(no) + '</div>'
      + '<button onclick="document.getElementById(\'mo-ktn-msg\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px">'
      // English
      + '<div style="margin-bottom:16px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
          + '<span style="font-size:12px;font-weight:700;color:var(--t)">🇬🇧 English</span>'
          + '<button class="btn btns" onclick="navigator.clipboard.writeText(document.getElementById(\'ktn-msg-en\').value);window.toast?.(\'Kopyalandı ✓\',\'ok\')" style="font-size:11px;padding:3px 10px">📋 Kopyala</button>'
        + '</div>'
        + '<textarea id="ktn-msg-en" class="fi" rows="10" style="font-size:12px;line-height:1.5;resize:vertical">' + esc(msgEN) + '</textarea>'
      + '</div>'
      // French
      + '<div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
          + '<span style="font-size:12px;font-weight:700;color:var(--t)">🇫🇷 Français</span>'
          + '<button class="btn btns" onclick="navigator.clipboard.writeText(document.getElementById(\'ktn-msg-fr\').value);window.toast?.(\'Kopyalandı ✓\',\'ok\')" style="font-size:11px;padding:3px 10px">📋 Kopyala</button>'
        + '</div>'
        + '<textarea id="ktn-msg-fr" class="fi" rows="10" style="font-size:12px;line-height:1.5;resize:vertical">' + esc(msgFR) + '</textarea>'
      + '</div>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn" onclick="document.getElementById(\'mo-ktn-msg\').remove()">Kapat</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}


// ── 4. KULLANICI TAKİP İZNİ ──────────────────────────────────────

/**
 * Konteyner detay modalında kullanıcı takip izni ekleme.
 * @param {number} ktnId
 */
window._addKtnViewer = window._addKtnViewer || function(ktnId) {
  var sel = document.getElementById('ktn-add-viewer-' + ktnId);
  var uid = parseInt(sel?.value || '0');
  if (!uid) { _toastK('Kullanıcı seçin', 'err'); return; }
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === ktnId; });
  if (!k) return;
  if (!Array.isArray(k.viewers)) k.viewers = [];
  if (k.viewers.includes(uid)) { _toastK('Bu kullanıcı zaten izinli', 'err'); return; }
  k.viewers.push(uid);
  if (typeof storeKonteyn === 'function') storeKonteyn(konts);
  _toastK('Takip izni verildi ✓', 'ok');
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var u = users.find(function(x) { return x.id === uid; });
  window.addNotif?.('👁', 'Konteyner ' + (k.no || '?') + ' takip izni verildi', 'info', 'kargo', uid);
  _logK('Konteyner ' + (k.no || '?') + ' takip izni: ' + (u?.name || uid));
  // Detay modalı yenile
  if (window.openKonteynDetail) window.openKonteynDetail(ktnId);
};

/**
 * Konteyner takip iznini kaldırır.
 * @param {number} ktnId
 * @param {number} uid
 */
window._removeKtnViewer = window._removeKtnViewer || function(ktnId, uid) {
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === ktnId; });
  if (!k || !Array.isArray(k.viewers)) return;
  k.viewers = k.viewers.filter(function(v) { return v !== uid; });
  if (typeof storeKonteyn === 'function') storeKonteyn(konts);
  _toastK('Takip izni kaldırıldı', 'ok');
  if (window.openKonteynDetail) window.openKonteynDetail(ktnId);
};


// ── Detay modalına evrak + müşteri bildirimi inject ──────────────

var _origOpenKtnDetail = window.openKonteynDetail;
window.openKonteynDetail = function(id) {
  _origOpenKtnDetail?.(id);
  // Evrak ve müşteri bildirimi bölümlerini inject et
  setTimeout(function() {
    var mo = document.getElementById('mo-ktn-detail');
    if (!mo) return;
    var scrollArea = mo.querySelector('[style*="overflow-y:auto"]');
    if (!scrollArea) return;

    // Evrak bölümü — zaten varsa ekleme
    if (!document.getElementById('ktn-evrak-cont-' + id)) {
      var evrakAcc = document.createElement('div');
      evrakAcc.className = 'ktn-acc';
      evrakAcc.style.cssText = 'border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:10px';
      evrakAcc.innerHTML = '<div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\'none\';this.querySelector(\'._arr\').classList.toggle(\'_open\')" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">'
        + '<span style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase">📎 Evrak Takibi</span>'
        + '<span class="_arr" style="font-size:10px;color:var(--t3);transition:transform .2s">▼</span>'
      + '</div>'
      + '<div id="ktn-evrak-cont-' + id + '" style="padding:10px 14px">' + _renderKtnEvrakHTML(id) + '</div>';
      scrollArea.appendChild(evrakAcc);
    }

    // Müşteri bildirimi butonu
    if (!document.getElementById('ktn-msg-btn-' + id)) {
      var msgBtn = document.createElement('div');
      msgBtn.id = 'ktn-msg-btn-' + id;
      msgBtn.style.cssText = 'margin-bottom:10px';
      msgBtn.innerHTML = '<button class="btn btns" onclick="openKtnMusteriBildirim(' + id + ')" style="width:100%;font-size:12px;padding:8px;border-radius:8px">📧 Müşteri Bildirimi (EN / FR)</button>';
      scrollArea.appendChild(msgBtn);
    }
  }, 150);
};

// Alarm sistemini başlat
_startKtnAlarms();

// Export
window.checkKargoAlarms       = checkKargoAlarms;
window.openKtnMusteriBildirim = openKtnMusteriBildirim;
window._renderKtnEvrakHTML    = _renderKtnEvrakHTML;


// ── ANA RENDER & EXPORT ────────────────────────────────────────────
function renderKargo(){
  _injectKargoPanel();
  _setTab(_kTab);
}

function exportKuryeXlsx(){_toastK('Excel export hazırlanıyor...','ok');}

var KargoV10={
  render:          renderKargo,
  setTab:          _setTab,
  setNavF: function(f,btn){_navF=f;document.querySelectorAll('[data-nf]').forEach(function(b){b.classList.remove('on');});if(btn)btn.classList.add('on');_renderNavlunList();},
  setLokF: function(f,btn){_lokF=f;document.querySelectorAll('[data-lf]').forEach(function(b){b.classList.remove('on');});if(btn)btn.classList.add('on');_renderLokList();},
  setLokSel: function(v){_lokSel=v;var s=document.getElementById('lok-sel');if(s)s.value=v;_renderLokList();},
  renderNavlunList: _renderNavlunList,
  renderKuryeList:  _renderKuryeList2,
  openNavMo:        _openNavMo,
  onayKargo:        _onayKargo,
  previewNavImg:    _previewNavImg,
  saveNav:          _saveNav,
  markT:            _markT,
  delKrg:           _delKrg,
  openLokMo:        _openLokMo,
  saveLok:          _saveLok,
  onayLok:          _onayLok,
  delLok:           _delLok,
  openKurMo:        _openKurMo,
  saveKur:          _saveKur,
  delKur:           _delKur,
  openLokYon:       _openLokYon,
  addLok:           _addLok,
  delLokItem:       _delLokItem,
};

if(typeof module!=='undefined'&&module.exports){module.exports=KargoV10;}
else{
  window.KargoV10   = KargoV10;
  window.Kargo      = KargoV10;
  window.renderKargo= renderKargo;
  window.openKargoModal= function(idOrDir){
    if(typeof idOrDir==='string')_openNavMo(null,idOrDir);
    else _openNavMo(idOrDir);
  };
  window.markKargoTeslim = _markT;
  window.exportKuryeXlsx = exportKuryeXlsx;
  window.importKargoFile  = function(){document.getElementById('krg-import-file')?.click();};
  window.printKargoRapor  = function(){window.toast?.('PDF rapor hazırlanıyor...','ok');};
  window.exportKargoXlsx  = function(){window.toast?.('Excel hazırlanıyor...','ok');};
  window.showNavlunKarsilastir = function(){window.toast?.('Navlun Teklifleri sekmesinde karşılaştırın','ok');};
}
