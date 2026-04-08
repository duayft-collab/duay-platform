'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2_render.js — Satın Alma V2 Render
════════════════════════════════════════════════════════════════ */

/* ── Ana render ─────────────────────────────────────────────── */
window.renderSatinAlmaV2 = function() {
  var panel = document.getElementById('panel-satin-alma');
  if (!panel) return;
  var kpi  = window._saV2Kpi?.() || {buAy:0,bekleyen:0,ortMarj:0,toplam:0};
  var liste = _saV2Load().filter(function(t){ return !t.isDeleted; });
  var filtre  = _saV2FiltreLi(liste);
  var sayfa   = window.SAV2_SAYFA||1;
  var boyut   = 20;
  var bas     = (sayfa-1)*boyut;
  var goster  = filtre.slice(bas, bas+boyut);
  var topSayfa= Math.ceil(filtre.length/boyut)||1;

  var h = '<div style="display:flex;flex-direction:column;height:100%;background:'+window._sf+'">';

  /* --- BAŞLIK --- */
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:40px;border-bottom:0.5px solid '+window._b+';flex-shrink:0">';
  h += '<div style="font-size:13px;font-weight:500;color:'+window._t+'">Satın Alma</div>';
  h += '<div style="display:flex;gap:2px">';
  ['teklifler','urun-listesi','tedarikci','raporlar'].forEach(function(m){
    var lbl = {teklifler:'Teklifler','urun-listesi':'Ürün Listesi',tedarikci:'Tedarikçiler',raporlar:'Raporlar'}[m];
    var on  = (window.SAV2_MOD||'teklifler')===m;
    h += '<button onclick="event.stopPropagation();window.SAV2_MOD=\''+m+'\';window.renderSatinAlmaV2()" style="font-size:10px;padding:4px 12px;border:0.5px solid '+(on?window._t:window._b)+';border-radius:20px;cursor:pointer;background:'+(on?window._t:window._sf)+';color:'+(on?window._sf:window._t3)+';font-family:inherit">'+lbl+'</button>';
  });
  h += '</div></div>';

  /* --- KPI --- */
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:0.5px solid '+window._b+';flex-shrink:0">';
  var kpiItems = [
    {l:'BU AY TEKLİF',v:kpi.buAy,s:'Geçen ay ile karşılaştır',renk:window._t,bar:'#185FA5',pct:80},
    {l:'BEKLEYEN ONAY',v:kpi.bekleyen,s:kpi.bekleyen>0?'Onay bekliyor':'Bekleyen yok',renk:'#854F0B',bar:'#854F0B',pct:Math.min(kpi.bekleyen*10,100)},
    {l:'ORT. KAR MARJI',v:'%'+kpi.ortMarj,s:'Hedef %28',renk:'#0F6E56',bar:'#1D9E75',pct:parseFloat(kpi.ortMarj)/60*100},
    {l:'AYLIK ALİŞ',v:'₺'+Math.round(kpi.toplam/1000)+'K',s:'TL karşılığı',renk:window._t,bar:'#185FA5',pct:72}
  ];
  kpiItems.forEach(function(k,i){
    h += '<div style="padding:10px 14px;border-right:'+(i<3?'0.5px solid '+window._b:'none')+'">';
    h += '<div style="font-size:8px;color:'+window._t3+';font-weight:500;letter-spacing:.07em;margin-bottom:3px">'+k.l+'</div>';
    h += '<div style="font-size:20px;font-weight:500;color:'+k.renk+'">'+k.v+'</div>';
    h += '<div style="font-size:9px;color:'+window._t3+';margin-top:1px">'+k.s+'</div>';
    h += '<div style="height:3px;border-radius:2px;margin-top:5px;background:'+window._b+'"><div style="height:3px;border-radius:2px;width:'+k.pct+'%;background:'+k.bar+'"></div></div>';
    h += '</div>';
  });
  h += '</div>';

  /* --- FİLTRELER YAN YANA --- */
  var seciliSay = window.SAV2_SECILI ? Object.keys(window.SAV2_SECILI).filter(function(k){return window.SAV2_SECILI[k];}).length : 0;
  h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:0.5px solid '+window._b+';flex-shrink:0;overflow-x:auto">';
  h += '<button onclick="event.stopPropagation();window._saV2YeniTeklif()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:'+window._t+';color:'+window._sf+';cursor:pointer;font-weight:500;white-space:nowrap;flex-shrink:0;font-family:inherit">+ Yeni Teklif</button>';
  h += '<div style="width:0.5px;height:18px;background:'+window._b+';flex-shrink:0"></div>';
  h += '<input id="sav2-srch" placeholder="Duay kodu, ürün adı, tedarikçi..." oninput="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:10px;padding:5px 9px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t+';min-width:180px;font-family:inherit">';
  h += '<select id="sav2-durum" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Tüm durumlar</option><option value="bekleyen">Bekleyen</option><option value="onaylandi">Onaylı</option><option value="reddedildi">Reddedildi</option></select>';
  h += '<select id="sav2-ted" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Tüm tedarikçiler</option></select>';
  h += '<select id="sav2-tarih" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Bu ay</option><option value="hafta">Bu hafta</option><option value="3ay">Son 3 ay</option><option value="hepsi">Tümü</option></select>';
  h += '<div style="margin-left:auto;display:flex;gap:5px;flex-shrink:0">';
  if (seciliSay>0) h += '<button onclick="event.stopPropagation();window._saV2OnayaGonder()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#854F0B;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">Onaya Gönder ('+seciliSay+')</button>';
  h += '<button onclick="event.stopPropagation()" style="font-size:10px;padding:5px 10px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">↓ Dışa Aktar</button>';
  h += '</div></div>';

  /* --- LISTE + PEEK --- */
  h += '<div style="flex:1;overflow:hidden;position:relative">';

  /* Liste */
  h += '<div style="display:flex;flex-direction:column;overflow:hidden;height:100%">';
  h += '<div style="display:flex;align-items:center;padding:5px 10px;background:'+window._s2+';border-bottom:0.5px solid '+window._b+';font-size:8px;font-weight:500;color:'+window._t3+';letter-spacing:.06em;flex-shrink:0">';
  h += '<div style="width:22px"><input type="checkbox" id="sav2-all-cb" onchange="event.stopPropagation();window._saV2TumSec(this.checked)" style="width:11px;height:11px;cursor:pointer"></div>';
  h += '<div style="width:34px">GRS</div>';
  h += '<div style="width:86px">DUAY KODU</div>';
  h += '<div style="width:130px">İNG. ÜRÜN ADI</div>';
  h += '<div style="width:100px">TÜRKÇE ADI</div>';
  h += '<div style="width:50px">MARKA</div>';
  h += '<div style="width:38px">BİRİM</div>';
  h += '<div style="width:38px">MENŞEİ</div>';
  h += '<div style="width:52px">GTİP</div>';
  h += '<div style="width:65px">ALİŞ FİYATI</div>';
  h += '<div style="width:50px">JOB ID</div>';
  h += '<div style="width:52px">DURUM</div>';
  h += '</div>';
  h += '<div style="flex:1;overflow-y:auto">';

  if (!goster.length) {
    h += '<div style="padding:40px;text-align:center;color:'+window._t3+';font-size:13px">Teklif bulunamadı<br><br><button onclick="event.stopPropagation();window._saV2YeniTeklif()" style="font-size:11px;padding:6px 16px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">+ İlk Teklifi Ekle</button></div>';
  }

  goster.forEach(function(t) {
    var on = window.SAV2_AKT_ID===t.id;
    var kenar = t.durum==='bekleyen'?'#854F0B':t.durum==='onaylandi'?'#0F6E56':t.durum==='reddedildi'?'#A32D2D':'#888780';
    var secili = window.SAV2_SECILI&&window.SAV2_SECILI[t.id];
    h += '<div onclick="event.stopPropagation();window.SAV2_AKT_ID=\''+t.id+'\';window.renderSatinAlmaV2()" style="display:flex;align-items:center;padding:7px 10px;border-bottom:0.5px solid '+window._b+';border-left:3px solid '+kenar+';cursor:pointer;background:'+(on?'#F0FBF6':secili?'#FFFCF5':window._sf)+'" onmouseover="if(!'+on+')this.style.background=\''+window._s2+'\'" onmouseout="if(!'+on+')this.style.background=\''+(secili?'#FFFCF5':window._sf)+'\'">';
    h += '<div style="width:22px" onclick="event.stopPropagation()"><input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2Sec(\''+t.id+'\',this.checked)" style="width:11px;height:11px;cursor:pointer"></div>';
    var gorselSrc = t.gorsel || '';
    h += '<div style="width:34px"><div style="width:28px;height:28px;border-radius:4px;background:'+(gorselSrc?'#E6F1FB':window._s2)+';border:0.5px solid '+window._b+';display:flex;align-items:center;justify-content:center;overflow:hidden">';
    if (gorselSrc) h += '<img src="'+gorselSrc+'" style="width:100%;height:100%;object-fit:cover">';
    else h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="'+(gorselSrc?'#185FA5':'currentColor')+'" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
    h += '</div></div>';
    h += '<div style="width:86px"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500">'+_saEsc(t.duayKodu||'—')+'</span></div>';
    h += '<div style="width:130px;font-size:11px;font-weight:500;color:'+window._t+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_saEsc(t.urunAdi||t.standartAdi||'—')+'</div>';
    h += '<div style="width:100px;font-size:10px;color:'+window._t2+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_saEsc(t.turkceAdi||t.duayAdi||'—')+'</div>';
    h += '<div style="width:50px;font-size:10px;color:'+window._t2+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_saEsc(t.marka||'—')+'</div>';
    h += '<div style="width:38px;font-size:10px;color:'+window._t3+'">'+_saEsc(t.birim||'—')+'</div>';
    h += '<div style="width:38px;font-size:10px;color:'+window._t3+'">'+_saEsc(t.mensei||'—')+'</div>';
    h += '<div style="width:52px;font-size:9px;font-family:monospace;color:'+window._t3+'">'+_saEsc(t.gtip||'—')+'</div>';
    h += '<div style="width:65px;font-size:11px;font-weight:500;color:'+kenar+'">'+_saEsc(t.alisF||'—')+' '+_saEsc(t.para||'')+'</div>';
    h += '<div style="width:50px;font-size:9px;color:#0C447C;font-family:monospace">'+_saEsc(t.jobId||'—')+'</div>';
    var stRenk = {bekleyen:'background:#FAEEDA;color:#854F0B',onaylandi:'background:#E1F5EE;color:#0F6E56',reddedildi:'background:#FCEBEB;color:#A32D2D'}[t.durum]||'background:'+window._s2+';color:'+window._t3;
    var stLbl  = {bekleyen:'Bekliyor',onaylandi:'Onaylı',reddedildi:'Reddedildi'}[t.durum]||t.durum||'Taslak';
    h += '<div style="width:52px"><span style="font-size:8px;padding:2px 5px;border-radius:3px;font-weight:500;'+stRenk+'">'+stLbl+'</span></div>';
    h += '</div>';
  });

  h += '</div>';

  /* Sayfalama */
  if (topSayfa>1) {
    h += '<div style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-top:0.5px solid '+window._b+';flex-shrink:0">';
    h += '<span style="font-size:9px;color:'+window._t3+'">'+filtre.length+' sonuç</span><div style="margin-left:auto;display:flex;gap:3px">';
    h += '<button onclick="event.stopPropagation();window.SAV2_SAYFA=Math.max(1,window.SAV2_SAYFA-1);window.renderSatinAlmaV2()" style="font-size:10px;padding:3px 8px;border:0.5px solid '+window._b+';border-radius:4px;background:transparent;cursor:pointer;color:'+window._t2+'">←</button>';
    for (var pi=Math.max(1,sayfa-2);pi<=Math.min(topSayfa,sayfa+2);pi++) {
      h += '<button onclick="event.stopPropagation();window.SAV2_SAYFA='+pi+';window.renderSatinAlmaV2()" style="font-size:10px;padding:3px 8px;border:0.5px solid '+(pi===sayfa?window._t:window._b)+';border-radius:4px;background:'+(pi===sayfa?window._t:window._sf)+';color:'+(pi===sayfa?window._sf:window._t2)+';cursor:pointer">'+pi+'</button>';
    }
    h += '<button onclick="event.stopPropagation();window.SAV2_SAYFA=Math.min('+topSayfa+',window.SAV2_SAYFA+1);window.renderSatinAlmaV2()" style="font-size:10px;padding:3px 8px;border:0.5px solid '+window._b+';border-radius:4px;background:transparent;cursor:pointer;color:'+window._t2+'">→</button>';
    h += '</div></div>';
  }
  h += '</div>';

  h += '</div></div>';
  panel.innerHTML = h;

  /* Peek panel overlay — liste dışında, body'ye sabit */
  var eskiPeek = document.getElementById('sav2-peek-overlay');
  if (eskiPeek) eskiPeek.remove();
  if (window.SAV2_AKT_ID) {
    var aktif = liste.find(function(t){return t.id===window.SAV2_AKT_ID;});
    var peekDiv = document.createElement('div');
    peekDiv.id = 'sav2-peek-overlay';
    peekDiv.innerHTML = window._saV2PeekHTML(aktif);
    document.body.appendChild(peekDiv);
  }
};

/* ── Filtre uygulayıcı ──────────────────────────────────────── */
window._saV2FiltreLi = function(liste) {
  var q    = document.getElementById('sav2-srch')?.value?.toLowerCase?.() || '';
  var dur  = document.getElementById('sav2-durum')?.value || '';
  var ted  = document.getElementById('sav2-ted')?.value || '';
  var tar  = document.getElementById('sav2-tarih')?.value || '';
  var bugAy= _saToday().slice(0,7);
  return liste.filter(function(t) {
    if (q && !(
      (t.duayKodu||'').toLowerCase().includes(q) ||
      (t.urunAdi||'').toLowerCase().includes(q) ||
      (t.tedarikci||'').toLowerCase().includes(q) ||
      (t.jobId||'').toLowerCase().includes(q)
    )) return false;
    if (dur && t.durum!==dur) return false;
    if (ted && t.tedarikci!==ted) return false;
    if (tar==='hafta') {
      var hafBas = new Date(); hafBas.setDate(hafBas.getDate()-7);
      if (new Date(t.createdAt||'') < hafBas) return false;
    } else if (tar==='3ay') {
      var ucAy = new Date(); ucAy.setMonth(ucAy.getMonth()-3);
      if (new Date(t.createdAt||'') < ucAy) return false;
    } else if (tar!=='hepsi') {
      if (!(t.createdAt||'').startsWith(bugAy)) return false;
    }
    return true;
  });
};

/* ── Peek panel HTML ────────────────────────────────────────── */
window._saV2PeekHTML = function(t) {
  if (!t) return '<div style="padding:20px;color:'+window._t3+';font-size:12px">Seçili teklif bulunamadı</div>';
  var kur = (window._saKur||{})[t.para] || 44.55;
  var alisF = parseFloat(t.alisF)||0;
  var tl    = (alisF*kur).toFixed(2);
  var marj  = parseFloat(t.karMarji)||33;
  var satis = (alisF*kur*(1+marj/100)).toFixed(2);
  var h = '<div style="position:fixed;top:0;right:0;width:320px;height:100vh;background:'+window._s2+';border-left:0.5px solid '+window._b+';overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;z-index:8888;box-shadow:-4px 0 16px rgba(0,0,0,.08)">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:10px;font-weight:500;color:'+window._t+'">Teklif Detayı</span><button onclick="event.stopPropagation();window.SAV2_AKT_ID=null;window.renderSatinAlmaV2()" style="font-size:14px;border:none;background:none;cursor:pointer;color:'+window._t3+';line-height:1">×</button></div>';
  h += '<div style="display:flex;gap:8px;align-items:flex-start">';
  if (t.gorsel) h += '<img src="'+t.gorsel+'" style="width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0">';
  else h += '<div style="width:56px;height:56px;border-radius:6px;background:#E6F1FB;border:0.5px solid #B5D4F4;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>';
  h += '<div><div style="font-size:12px;font-weight:500;color:'+window._t+'">'+_saEsc(t.urunAdi||'Ürün')+'</div>';
  h += '<div style="font-size:9px;color:'+window._t3+';margin-top:1px">'+_saEsc(t.tedarikci||'—')+' · '+_saEsc(t.mensei||'')+'</div>';
  h += '<div style="display:flex;gap:3px;margin-top:4px"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500">'+_saEsc(t.duayKodu||'—')+'</span><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:'+window._s2+';color:'+window._t3+';font-weight:500">'+_saEsc(t.gtip||'—')+'</span></div>';
  h += '</div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">';
  h += '<div style="background:'+window._sf+';border-radius:5px;padding:7px;border:0.5px solid '+window._b+'"><div style="font-size:8px;color:'+window._t3+'">ALİŞ FİYATI</div><div style="font-size:13px;font-weight:500;color:#0F6E56">'+_saEsc(t.alisF||'—')+' '+_saEsc(t.para||'')+'</div><div style="font-size:8px;color:'+window._t3+'">= ₺'+tl+' (kur: '+kur.toFixed(2)+')</div></div>';
  h += '<div style="background:'+window._sf+';border-radius:5px;padding:7px;border:0.5px solid '+window._b+'"><div style="font-size:8px;color:'+window._t3+'">JOB ID</div><div style="font-size:13px;font-weight:500;color:#0C447C">'+_saEsc(t.jobId||'—')+'</div><div style="font-size:8px;color:'+window._t3+'">'+_saEsc(t.miktar||'')+'</div></div>';
  h += '</div>';
  h += '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:5px;padding:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:#0C447C;margin-bottom:4px">SATIŞ TEKLİFİ HESABI → TEKLİFE İŞLENİR</div>';
  h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:9px;color:#185FA5;white-space:nowrap">Marj %</span>';
  h += '<input type="range" min="5" max="60" value="'+marj+'" id="sav2-marj-slider" oninput="event.stopPropagation();document.getElementById(\'sav2-marj-val\').textContent=\'%\'+this.value+\' → ₺\'+('+tl+'*(1+this.value/100)).toFixed(2)" style="flex:1">';
  h += '<span id="sav2-marj-val" style="font-size:11px;font-weight:500;color:#0C447C;white-space:nowrap">%'+marj+' → ₺'+satis+'</span></div>';
  h += '</div>';
  h += '<div style="display:flex;flex-direction:column;gap:5px">';
  if (t.durum==='bekleyen') {
    h += '<button onclick="event.stopPropagation();window._saV2OnayaGonderTek(\''+t.id+'\')" style="font-size:10px;padding:7px;border:none;border-radius:5px;background:#854F0B;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">Onaya Gönder</button>';
    h += '<button onclick="event.stopPropagation();window._saV2TeklifOlustur(\''+t.id+'\')" style="font-size:10px;padding:6px;border:none;border-radius:5px;background:'+window._t+';color:'+window._sf+';cursor:pointer;font-weight:500;font-family:inherit">Satış Teklifi Oluştur</button>';
  } else if (t.durum==='onaylandi') {
    h += '<button onclick="event.stopPropagation();window._saV2TeklifOlustur(\''+t.id+'\')" style="font-size:10px;padding:7px;border:none;border-radius:5px;background:'+window._t+';color:'+window._sf+';cursor:pointer;font-weight:500;font-family:inherit">Satış Teklifi Oluştur</button>';
  }
  h += '<button onclick="event.stopPropagation();window._saV2GoselYukle(\''+t.id+'\')" style="font-size:10px;padding:5px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">Görsel Yükle</button>';
  h += '<button onclick="event.stopPropagation();window._saV2Duzenle(\''+t.id+'\')" style="font-size:10px;padding:5px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">Düzenle</button>';
  h += '</div></div>';
  return h;
};

/* ── Seçim yönetimi ─────────────────────────────────────────── */
window.SAV2_SECILI = {};
window._saV2Sec = function(id, durum) {
  if (!window.SAV2_SECILI) window.SAV2_SECILI = {};
  window.SAV2_SECILI[id] = durum;
  window.renderSatinAlmaV2();
};
window._saV2TumSec = function(durum) {
  window.SAV2_SECILI = {};
  if (durum) {
    _saV2Load().forEach(function(t){ window.SAV2_SECILI[t.id] = true; });
  }
  window.renderSatinAlmaV2();
};

/* ── Onaya gönder ───────────────────────────────────────────── */
window._saV2OnayaGonder = function() {
  var secili = Object.keys(window.SAV2_SECILI||{}).filter(function(k){return window.SAV2_SECILI[k];});
  if (!secili.length) { window.toast?.('Önce seçim yapın','warn'); return; }
  var liste = _saV2Load();
  secili.forEach(function(id){
    var t = liste.find(function(x){return x.id===id;});
    if (t) { t.durum='onay_bekliyor'; t.updatedAt=_saNow(); }
  });
  _saV2Store(liste);
  window.SAV2_SECILI = {};
  window.toast?.('Onaya gönderildi — yönetici bildirildi','ok');
  window.renderSatinAlmaV2();
};
window._saV2OnayaGonderTek = function(id) {
  var liste = _saV2Load();
  var t = liste.find(function(x){return x.id===id;});
  if (t) { t.durum='onay_bekliyor'; t.updatedAt=_saNow(); _saV2Store(liste); }
  window.toast?.('Onaya gönderildi','ok');
  window.renderSatinAlmaV2();
};

/* ── Görsel yükleme ─────────────────────────────────────────── */
window._saV2GoselYukle = function(id) {
  var inp = document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange = function(e) {
    var f = e.target.files[0]; if(!f) return;
    if (f.size>5*1024*1024) { window.toast?.('5MB sınırı aşıldı','warn'); return; }
    var r = new FileReader();
    r.onload = function(ev) {
      var liste = _saV2Load();
      var t = liste.find(function(x){return x.id===id;});
      if (t) { t.gorsel=ev.target.result; t.updatedAt=_saNow(); _saV2Store(liste); }
      window.toast?.('Görsel yüklendi','ok');
      window.renderSatinAlmaV2();
    };
    r.readAsDataURL(f);
  };
  inp.click();
};

/* ── Placeholder fonksiyonlar ───────────────────────────────── */
window._saV2TeklifOlustur = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x){return x.id===id;});
  if(!t){ window.toast?.('Teklif bulunamadı','warn'); return; }
  var mevcut = document.getElementById('sav2-satis-modal'); if(mevcut) mevcut.remove();
  var modal = document.createElement('div');
  modal.id = 'sav2-satis-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  var kur = (window._saKur||{})[t.para]||44.55;
  var alisF = parseFloat(t.alisF)||0;
  var alisTl = (alisF*kur).toFixed(2);
  var marj = 33;
  var satisFiyat = (alisF*kur*(1+marj/100)).toFixed(2);
  var miktar = parseFloat(t.miktar)||1;
  var toplamKar = ((alisF*kur*marj/100)*miktar).toFixed(2);
  var musteriKod = '0000';
  var satisId = window._saTeklifId?.(musteriKod)||(musteriKod+'-'+Date.now());
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:700px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b);position:sticky;top:0;background:var(--sf);z-index:1">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Satış Teklifi Oluştur</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Alış fiyatından hesaplanır — satış fiyatı teklife işlenir, kataloğa değil</div></div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;padding:0 4px">×</button>';
  ic += '</div>';
  ic += '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">';
  ic += '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:6px;padding:10px 14px;display:flex;align-items:center;gap:12px">';
  if(t.gorsel) ic += '<img src="'+t.gorsel+'" style="width:44px;height:44px;border-radius:5px;object-fit:cover;flex-shrink:0">';
  else ic += '<div style="width:44px;height:44px;border-radius:5px;background:#B5D4F4;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>';
  ic += '<div><div style="font-size:13px;font-weight:500;color:#0C447C">'+_saEsc(t.urunAdi||'Ürün')+'</div>';
  ic += '<div style="font-size:10px;color:#185FA5;margin-top:2px">'+_saEsc(t.duayKodu||'—')+' · '+_saEsc(t.tedarikci||'—')+' · Alış: '+_saEsc(t.alisF||'—')+' '+_saEsc(t.para||'')+'</div></div>';
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ KODU</div>';
  ic += '<input id="st-musteri-kod" value="0000" placeholder="3230" oninput="event.stopPropagation();var sid=window._saTeklifId?.(this.value)||(this.value+\'-\'+Date.now());document.getElementById(\'st-id-goster\').textContent=sid;document.getElementById(\'st-id\').value=sid" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:monospace"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ ADI</div>';
  ic += '<input id="st-musteri-ad" placeholder="Müşteri adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GEÇERLİLİK TARİHİ</div>';
  ic += '<input type="date" id="st-gecerlilik" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '</div>';
  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden">';
  ic += '<div style="display:grid;grid-template-columns:44px 90px 1fr 70px 90px 80px 90px;align-items:center;padding:6px 10px;background:var(--s2);border-bottom:0.5px solid var(--b);font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em">';
  ic += '<div></div><div>DUAY KODU</div><div>ÜRÜN ADI</div><div>MİKTAR</div><div>ALİŞ TL</div><div>MARJ %</div><div>SATIŞ FİYATI</div></div>';
  ic += '<div style="display:grid;grid-template-columns:44px 90px 1fr 70px 90px 80px 90px;align-items:center;padding:8px 10px">';
  if(t.gorsel) ic += '<img src="'+t.gorsel+'" style="width:34px;height:34px;border-radius:4px;object-fit:cover">';
  else ic += '<div style="width:34px;height:34px;border-radius:4px;background:var(--s2);border:0.5px solid var(--b)"></div>';
  ic += '<div style="font-size:9px;padding:2px 6px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500;display:inline-block">'+_saEsc(t.duayKodu||'—')+'</div>';
  ic += '<div style="font-size:11px;font-weight:500;color:var(--t)">'+_saEsc(t.urunAdi||'—')+'</div>';
  ic += '<div><input id="st-miktar" type="number" value="'+miktar+'" min="1" onclick="event.stopPropagation()" oninput="event.stopPropagation();window._stHesapla(\''+alisTl+'\')" style="width:60px;font-size:11px;padding:5px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div style="font-size:11px;color:var(--t2)">₺'+alisTl+'</div>';
  ic += '<div><input id="st-marj" type="number" value="33" min="1" max="90" onclick="event.stopPropagation()" oninput="event.stopPropagation();window._stHesapla(\''+alisTl+'\')" style="width:60px;font-size:11px;padding:5px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div style="font-size:12px;font-weight:500;color:#0F6E56" id="st-satis-f">₺'+satisFiyat+'</div>';
  ic += '</div></div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESLİM KOŞULU</div>';
  ic += '<input id="st-teslim" value="FOB İstanbul" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">ÖDEME KOŞULU</div>';
  ic += '<input id="st-odeme" value="30% Avans, 70% Akreditif" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '</div>';
  ic += '<div style="background:var(--s2);border-radius:6px;padding:12px 14px;border:0.5px solid var(--b)">';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="color:var(--t3)">Birim alış maliyeti</span><span>₺'+alisTl+'</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="color:var(--t3)">Birim satış fiyatı</span><span style="font-weight:500" id="st-ozet-satis">₺'+satisFiyat+'</span></div>';
  ic += '<div style="height:0.5px;background:var(--b);margin:8px 0"></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--t3)">Toplam kâr tahmini</span><span style="font-weight:500;color:#0F6E56" id="st-ozet-kar">₺'+toplamKar+'</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px"><span style="color:var(--t3)">Ort. marj</span><span style="color:#0F6E56" id="st-ozet-marj">%'+marj+'</span></div>';
  ic += '</div>';
  ic += '<div style="font-size:9px;font-family:monospace;background:var(--s2);padding:7px 10px;border-radius:4px;border:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  ic += '<span style="color:var(--t3)">TEKLİF ID:</span><span style="color:#0C447C;font-weight:500" id="st-id-goster">'+satisId+'</span>';
  ic += '<input id="st-id" type="hidden" value="'+satisId+'"></div>';
  ic += '<div style="display:flex;gap:8px">';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisPDF()" style="flex:1;font-size:12px;padding:9px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">PDF Oluştur → Gönder</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydet(\''+t.id+'\')" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Taslak Kaydet</button>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">İptal</button>';
  ic += '</div>';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
};

window._stHesapla = function(alisTlStr) {
  var marj = parseFloat(document.getElementById('st-marj')?.value)||33;
  var miktar = parseFloat(document.getElementById('st-miktar')?.value)||1;
  var alisTl = parseFloat(alisTlStr)||0;
  var satisF = (alisTl*(1+marj/100)).toFixed(2);
  var kar = ((alisTl*marj/100)*miktar).toFixed(2);
  var el1=document.getElementById('st-satis-f'); if(el1) el1.textContent='₺'+satisF;
  var el2=document.getElementById('st-ozet-satis'); if(el2) el2.textContent='₺'+satisF;
  var el3=document.getElementById('st-ozet-kar'); if(el3) el3.textContent='₺'+kar;
  var el4=document.getElementById('st-ozet-marj'); if(el4) el4.textContent='%'+marj;
};

window._saV2SatisKaydet = function(alisId) {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value?.trim()||'';
  var satisFiyat = document.getElementById('st-satis-f')?.textContent?.replace('₺','')||'0';
  var marj = document.getElementById('st-marj')?.value||'33';
  var miktar = document.getElementById('st-miktar')?.value||'1';
  var kayit = {
    id:window._saId?.(),
    teklifId:teklifId,
    alisId:alisId,
    musteriAd:musteriAd,
    satisFiyat:satisFiyat,
    karMarji:marj,
    miktar:miktar,
    teslim:document.getElementById('st-teslim')?.value||'',
    odeme:document.getElementById('st-odeme')?.value||'',
    gecerlilik:document.getElementById('st-gecerlilik')?.value||'',
    durum:'taslak',
    createdAt:window._saNow?.(),
    updatedAt:window._saNow?.()
  };
  var teklifler = window._saTeklifLoad?.() || [];
  teklifler.unshift(kayit);
  window._saTeklifStore?.(teklifler);
  document.getElementById('sav2-satis-modal')?.remove();
  window.toast?.('Satış teklifi kaydedildi: '+teklifId,'ok');
};

window._saV2SatisPDF = function() {
  window.toast?.('PDF oluşturma — yakında aktif olacak','info');
};
window._saV2Duzenle = function(id) { window.toast?.('Düzenleme — yakında','info'); };
window._saV2YeniTeklif = function() {
  var mevcut = document.getElementById('sav2-form-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'sav2-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 0;overflow-y:auto';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var musteriKod = '0000';
  var teklifId = window._saTeklifId?.(musteriKod) || (musteriKod + '-' + Date.now());
  var _f = function(id, lbl, ph, tip) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<input id="sav2f-' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  var _s = function(id, lbl, opts) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<select id="sav2f-' + id + '" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit">' + opts + '</select></div>';
  };
  modal.innerHTML = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:660px;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div>'
    + '<div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Alış Teklifi</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px;font-family:monospace" id="sav2f-id-goster">ID: ' + teklifId + '</div>'
    + '</div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>'
    + '</div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DUAY ÜRÜN KODU</div>'
    + '<div style="display:flex;gap:5px">'
    + '<input id="sav2f-duayKodu" placeholder="11·XXXX·XXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2KatalogDoldur(this.value)" style="flex:1;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<button onclick="event.stopPropagation();window._saV2KatalogAra()" style="font-size:10px;padding:6px 10px;border:0.5px solid var(--b);border-radius:6px;background:#E6F1FB;color:#0C447C;cursor:pointer;font-family:inherit;white-space:nowrap">Katalog</button>'
    + '</div>'
    + '<div id="sav2f-katalog-bilgi" style="font-size:9px;color:var(--t3);margin-top:3px"></div>'
    + '</div>'
    + _f('urunAdi', 'İNG. ÜRÜN ADI (CI/PL/BL)', 'Standart İngilizce ad')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('turkceAdi', 'TÜRKÇE ÜRÜN ADI', 'Türkçe ad')
    + _f('marka', 'MARKA', 'Marka')
    + _s('birim', 'BİRİM', '<option>Adet</option><option>Kg</option><option>Ton</option><option>m²</option><option>Lt</option><option>Koli</option>')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _s('mensei', 'MENŞEİ', '<option value="TR">TR — Türkiye</option><option value="CN">CN — Çin</option><option value="DE">DE — Almanya</option><option value="IT">IT — İtalya</option><option value="JP">JP — Japonya</option>')
    + _f('gtip', 'GTİP KODU', '8482.10.10')
    + _f('saticiKodu', 'SATICI ÜRÜN KODU', 'MTL-0412')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('tedarikci', 'TEDARİKÇİ', 'Tedarikçi adı')
    + _f('alisF', 'ALİŞ FİYATI', '2.40')
    + _s('para', 'PARA BİRİMİ', '<option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option>')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('miktar', 'MİKTAR', '200')
    + _f('jobId', 'JOB ID', '0041')
    + _f('teslimat', 'TESLİM SÜRESİ (gün)', '14', 'number')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _f('netAg', 'NET AĞIRLIK (kg)', '', 'number')
    + _f('brutAg', 'BRÜT AĞIRLIK (kg)', '', 'number')
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GÖRSEL (maks 5MB)</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<div id="sav2f-gorsel-oniz" style="width:48px;height:48px;border-radius:6px;background:var(--s2);border:0.5px solid var(--b);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>'
    + '<label style="font-size:10px;padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;cursor:pointer;color:var(--t2);background:var(--s2)">Görsel Seç<input type="file" accept="image/*" style="display:none" onchange="event.stopPropagation();window._saV2FormGorsel(this)"></label>'
    + '<span id="sav2f-gorsel-ad" style="font-size:9px;color:var(--t3)">Seçilmedi</span>'
    + '</div></div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ KODU (Teklif ID için)</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input id="sav2f-musteriKod" placeholder="3230" oninput="event.stopPropagation();var tid=window._saTeklifId?.(this.value)||\'0000-\'+Date.now();document.getElementById(\'sav2f-id-goster\').textContent=\'ID: \'+tid;document.getElementById(\'sav2f-teklifId\').value=tid" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100px;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:monospace">'
    + '<input id="sav2f-teklifId" value="' + teklifId + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:11px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:#0C447C;font-family:monospace">'
    + '</div></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">'
    + '<div style="font-size:9px;color:var(--t3)">* Duay kodu girilince katalogdan otomatik dolar</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    + '<button onclick="event.stopPropagation();window._saV2FormKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    + '</div></div>'
    + '</div>';
  document.body.appendChild(modal);
  window._saV2FormGorselData = null;
  setTimeout(function() { document.getElementById('sav2f-duayKodu')?.focus(); }, 100);
};

window._saV2FormGorsel = function(inp) {
  var f = inp.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { window.toast?.('5MB sınırı aşıldı', 'warn'); return; }
  var r = new FileReader();
  r.onload = function(e) {
    window._saV2FormGorselData = e.target.result;
    var oniz = document.getElementById('sav2f-gorsel-oniz');
    if (oniz) oniz.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px">';
    var ad = document.getElementById('sav2f-gorsel-ad');
    if (ad) ad.textContent = f.name;
  };
  r.readAsDataURL(f);
};

window._saV2KatalogDoldur = function(kod) {
  if (!kod || kod.length < 5) return;
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
  var u = urunler.find(function(x) { return (x.duayKodu || '').toLowerCase() === kod.toLowerCase(); });
  if (!u) return;
  var bilgi = document.getElementById('sav2f-katalog-bilgi');
  if (bilgi) bilgi.innerHTML = '<span style="color:#0F6E56">✓ Katalogda bulundu: ' + _saEsc(u.duayAdi || u.urunAdi || '') + '</span>';
  var alanlar = { urunAdi: u.standartAdi || u.urunAdi, turkceAdi: u.duayAdi || u.urunAdi, marka: u.marka, gtip: u.gtip || u.hscKodu, saticiKodu: u.saticiKodu || u.urunKodu, netAg: u.netAgirlik, brutAg: u.brutAgirlik };
  Object.keys(alanlar).forEach(function(k) {
    var el = document.getElementById('sav2f-' + k);
    if (el && alanlar[k]) el.value = alanlar[k];
  });
  var birimEl = document.getElementById('sav2f-birim');
  if (birimEl && u.birim) {
    Array.from(birimEl.options).forEach(function(o) { if (o.value === u.birim) o.selected = true; });
  }
  var menEl = document.getElementById('sav2f-mensei');
  if (menEl && u.mensei) {
    Array.from(menEl.options).forEach(function(o) { if (o.value === u.mensei) o.selected = true; });
  }
};

window._saV2KatalogAra = function() { window.toast?.('Katalog arama — yakında', 'info'); };

window._saV2FormKaydet = function() {
  var _v = function(id) { return document.getElementById('sav2f-' + id)?.value?.trim() || ''; };
  var duayKodu = _v('duayKodu');
  var urunAdi = _v('urunAdi');
  if (!urunAdi) { window.toast?.('Ürün adı zorunlu', 'warn'); return; }
  var yeni = {
    id: window._saId?.() || Date.now() + Math.random().toString(36).slice(2, 8),
    teklifId: _v('teklifId'),
    duayKodu: duayKodu,
    urunAdi: urunAdi,
    turkceAdi: _v('turkceAdi'),
    marka: _v('marka'),
    birim: document.getElementById('sav2f-birim')?.value || 'Adet',
    mensei: document.getElementById('sav2f-mensei')?.value || 'TR',
    gtip: _v('gtip'),
    saticiKodu: _v('saticiKodu'),
    tedarikci: _v('tedarikci'),
    alisF: _v('alisF'),
    para: document.getElementById('sav2f-para')?.value || 'USD',
    miktar: _v('miktar'),
    jobId: _v('jobId'),
    teslimat: _v('teslimat'),
    netAgirlik: _v('netAg'),
    brutAgirlik: _v('brutAg'),
    gorsel: window._saV2FormGorselData || '',
    durum: 'bekleyen',
    karMarji: 33,
    createdAt: window._saNow?.(),
    updatedAt: window._saNow?.(),
    olusturan: window._saCu?.()?.displayName || ''
  };
  var liste = window._saV2Load?.() || [];
  liste.unshift(yeni);
  window._saV2Store?.(liste);
  document.getElementById('sav2-form-modal')?.remove();
  window.toast?.('Teklif kaydedildi', 'ok');
  window.renderSatinAlmaV2?.();
};

/* ── Onay Akışı ─────────────────────────────────────────────── */
window._saV2YoneticiOnayla = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.durum = 'onaylandi';
  t.onaylayanId = window._saCu?.()?.uid || '';
  t.onaylayanAd = window._saCu?.()?.displayName || '';
  t.onayTarih = window._saNow?.();
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window._saV2ZincirEtkisi(t);
  window.toast?.('Teklif onaylandı — zincirleme etki başlatıldı', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiReddet = function(id, neden) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.durum = 'reddedildi';
  t.redNedeni = neden || '';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Teklif reddedildi', 'warn');
  window.renderSatinAlmaV2?.();
};

window._saV2ZincirEtkisi = function(t) {
  try {
    /* 1. Ürün Kataloğu — son alış fiyatı güncelle */
    if (t.duayKodu && typeof window.loadUrunler === 'function') {
      var urunler = window.loadUrunler();
      var u = urunler.find(function(x) { return (x.duayKodu || '') === (t.duayKodu || ''); });
      if (u) {
        u.sonAlisFiyati = t.alisF;
        u.sonAlisPara = t.para;
        u.sonAlisTed = t.tedarikci;
        u.sonAlisTarih = window._saNow?.();
      }
      if (typeof window.saveUrunler === 'function') window.saveUrunler(urunler);
    }
    /* 2. Aktivite logu */
    if (typeof window.logActivity === 'function') {
      window.logActivity('SATINALMA_ONAY', { teklifId: t.teklifId, urun: t.urunAdi, fiyat: t.alisF, para: t.para, tedarikci: t.tedarikci });
    }
    /* 3. Pusula Pro görev oluştur */
    if (typeof window._ppLoad === 'function' && typeof window._ppStore === 'function') {
      var ppTasks = window._ppLoad();
      ppTasks.unshift({
        id: window._saId?.(),
        baslik: 'Sevkiyat: ' + (t.urunAdi || 'Ürün') + ' (' + (t.miktar || '') + ' ' + (t.birim || '') + ')',
        departman: 'Operasyon',
        oncelik: 'yuksek',
        durum: 'plan',
        job_id: t.jobId || '',
        aciklama: 'Satın alma onaylandı. Tedarikçi: ' + (t.tedarikci || ''),
        _ppSource: 'pro',
        createdAt: window._saNow?.(),
        updatedAt: window._saNow?.(),
        _kaynak: 'satinalma_onay'
      });
      window._ppStore(ppTasks);
    }
    console.log('[SAV2] Zincirleme etki tamamlandı:', t.teklifId);
  } catch(e) { console.error('[SAV2] Zincirleme hata:', e); }
};

/* ── Eski renderSatinAlma köprüsü ──────────────────────────── */
if (typeof window.renderSatinAlma !== 'function') {
  window.renderSatinAlma = window.renderSatinAlmaV2;
}

console.log('[SAV2-RENDER] v2.0 yüklendi');
