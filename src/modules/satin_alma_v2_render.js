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
  h += '<button onclick="event.stopPropagation();window._saV2CSVImport()" style="font-size:10px;padding:5px 10px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';white-space:nowrap;flex-shrink:0;font-family:inherit">↑ CSV Import</button>';
  h += '<button onclick="event.stopPropagation()" style="font-size:10px;padding:5px 10px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">↓ Dışa Aktar</button>';
  h += '</div></div>';

  if ((window.SAV2_MOD||'teklifler') === 'raporlar') {
    var tumListe = _saV2Load().filter(function(t){return !t.isDeleted;});
    var onaylilar = tumListe.filter(function(t){return t.durum==='onaylandi';});
    var bekleyenler = tumListe.filter(function(t){return t.durum==='bekleyen';});
    var toplamAlis = onaylilar.reduce(function(a,t){var kur=(window._saKur||{})[t.para]||44.55;return a+(parseFloat(t.alisF)||0)*kur*(parseFloat(t.miktar)||1);},0);
    var urunMap = {}; onaylilar.forEach(function(t){var k=t.duayKodu||t.urunAdi||'—';if(!urunMap[k])urunMap[k]={ad:t.urunAdi||k,kod:t.duayKodu||'',adet:0,toplamAlis:0,marjToplam:0,say:0};urunMap[k].adet+=(parseFloat(t.miktar)||1);var kur=(window._saKur||{})[t.para]||44.55;urunMap[k].toplamAlis+=(parseFloat(t.alisF)||0)*kur*(parseFloat(t.miktar)||1);urunMap[k].marjToplam+=(parseFloat(t.karMarji)||33);urunMap[k].say++;});
    var tedMap = {}; onaylilar.forEach(function(t){var k=t.tedarikci||'—';if(!tedMap[k])tedMap[k]={ad:k,say:0,toplamAlis:0};tedMap[k].say++;var kur=(window._saKur||{})[t.para]||44.55;tedMap[k].toplamAlis+=(parseFloat(t.alisF)||0)*kur*(parseFloat(t.miktar)||1);});
    var ayMap = {}; tumListe.forEach(function(t){var ay=(t.createdAt||'').slice(0,7);if(!ay)return;if(!ayMap[ay])ayMap[ay]={ay:ay,say:0,alis:0};ayMap[ay].say++;var kur=(window._saKur||{})[t.para]||44.55;ayMap[ay].alis+=(parseFloat(t.alisF)||0)*kur*(parseFloat(t.miktar)||1);});
    h += '<div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px">';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:12px"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.06em;margin-bottom:4px">TOPLAM ALİŞ (ONAYLI)</div><div style="font-size:22px;font-weight:500;color:var(--t)">₺'+Math.round(toplamAlis/1000)+'K</div></div>';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:12px"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.06em;margin-bottom:4px">ONAYLI TEKLİF</div><div style="font-size:22px;font-weight:500;color:#0F6E56">'+onaylilar.length+'</div></div>';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:12px"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.06em;margin-bottom:4px">BEKLEYEN</div><div style="font-size:22px;font-weight:500;color:#854F0B">'+bekleyenler.length+'</div></div>';
    h += '</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;overflow:hidden">';
    h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);font-size:11px;font-weight:500;color:var(--t)">Ürün Bazlı Alış</div>';
    Object.values(urunMap).sort(function(a,b){return b.toplamAlis-a.toplamAlis;}).slice(0,8).forEach(function(u){
      var ortMarj = u.say>0?(u.marjToplam/u.say).toFixed(0):0;
      h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
      h += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">'+_saEsc(u.ad)+'</div><div style="font-size:9px;color:var(--t3);margin-top:1px">'+_saEsc(u.kod)+' · '+u.adet+' adet · Ort. marj %'+ortMarj+'</div></div>';
      h += '<div style="font-size:12px;font-weight:500;color:#0C447C">₺'+Math.round(u.toplamAlis/1000)+'K</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;overflow:hidden">';
    h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);font-size:11px;font-weight:500;color:var(--t)">Tedarikçi Bazlı</div>';
    Object.values(tedMap).sort(function(a,b){return b.toplamAlis-a.toplamAlis;}).forEach(function(td){
      var pct = toplamAlis>0?((td.toplamAlis/toplamAlis)*100).toFixed(0):0;
      h += '<div style="padding:8px 14px;border-bottom:0.5px solid var(--b)">';
      h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;font-weight:500;color:var(--t)">'+_saEsc(td.ad)+'</span><span style="font-size:11px;color:#0C447C;font-weight:500">₺'+Math.round(td.toplamAlis/1000)+'K</span></div>';
      h += '<div style="height:4px;background:var(--s2);border-radius:2px"><div style="height:4px;border-radius:2px;background:#185FA5;width:'+pct+'%"></div></div>';
      h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">'+td.say+' teklif · %'+pct+' pay</div>';
      h += '</div>';
    });
    h += '</div></div>';
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;overflow:hidden">';
    h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);font-size:11px;font-weight:500;color:var(--t)">Aylık Trend</div>';
    Object.values(ayMap).sort(function(a,b){return a.ay.localeCompare(b.ay);}).forEach(function(ay){
      var maxAlis = Math.max.apply(null,Object.values(ayMap).map(function(a){return a.alis;}));
      var pct = maxAlis>0?((ay.alis/maxAlis)*100).toFixed(0):0;
      h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:0.5px solid var(--b)">';
      h += '<div style="font-size:10px;color:var(--t2);width:60px;flex-shrink:0">'+ay.ay+'</div>';
      h += '<div style="flex:1;height:6px;background:var(--s2);border-radius:3px"><div style="height:6px;border-radius:3px;background:#1D9E75;width:'+pct+'%"></div></div>';
      h += '<div style="font-size:10px;font-weight:500;color:var(--t);min-width:50px;text-align:right">₺'+Math.round(ay.alis/1000)+'K</div>';
      h += '<div style="font-size:9px;color:var(--t3);min-width:40px;text-align:right">'+ay.say+' teklif</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
    h += '</div>';
    /* SA-V2-SICAKLIK-001: Müşteri Sıcaklık Skoru */
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;overflow:hidden;margin-top:14px">';
    h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);font-size:11px;font-weight:500;color:var(--t)">Müşteri Sıcaklık Skoru</div>';
    var musteriMap = {};
    tumListe.forEach(function(t) {
      var mk = t.musteriKod || t.musteriAd || '—';
      if (!musteriMap[mk]) musteriMap[mk] = { ad: t.musteriAd || mk, kod: mk, teklifSay: 0, kabulSay: 0, sonTeklif: null };
      musteriMap[mk].teklifSay++;
      if (t.durum === 'onaylandi') musteriMap[mk].kabulSay++;
      if (!musteriMap[mk].sonTeklif || (t.createdAt || '') > musteriMap[mk].sonTeklif) musteriMap[mk].sonTeklif = t.createdAt || '';
    });
    var bugunDt = new Date();
    Object.values(musteriMap).forEach(function(m) {
      var gunFark = m.sonTeklif ? Math.floor((bugunDt - new Date(m.sonTeklif)) / (1000 * 60 * 60 * 24)) : 999;
      var kabulOran = m.teklifSay > 0 ? Math.round(m.kabulSay / m.teklifSay * 100) : 0;
      var skorRenk = '#A32D2D', skorBg = '#FCEBEB', skorLbl = 'Soğuk';
      if (gunFark <= 7 && kabulOran >= 50) { skorRenk = '#0F6E56'; skorBg = '#E1F5EE'; skorLbl = 'Sıcak'; }
      else if (gunFark <= 14 || kabulOran >= 30) { skorRenk = '#854F0B'; skorBg = '#FAEEDA'; skorLbl = 'Ilık'; }
      m.skorRenk = skorRenk; m.skorBg = skorBg; m.skorLbl = skorLbl; m.gunFark = gunFark; m.kabulOran = kabulOran;
    });
    var takipListe = Object.values(musteriMap).filter(function(m) { return m.gunFark >= 2 && m.gunFark <= 7; });
    if (takipListe.length) {
      h += '<div style="padding:8px 14px;background:#FAEEDA;border-bottom:0.5px solid var(--b);font-size:10px;color:#633806;font-weight:500">Bu hafta takip edilmesi gerekenler: ' + takipListe.length + ' müşteri</div>';
    }
    if (!Object.keys(musteriMap).length) {
      h += '<div style="padding:20px;text-align:center;font-size:11px;color:var(--t3)">Henüz müşteri verisi yok</div>';
    }
    Object.values(musteriMap).sort(function(a, b) { return a.gunFark - b.gunFark; }).forEach(function(m) {
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
      h += '<div style="width:8px;height:8px;border-radius:50%;background:' + m.skorRenk + ';flex-shrink:0"></div>';
      h += '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _saEsc(m.ad) + '</div>';
      h += '<div style="font-size:9px;color:var(--t3)">Kod: ' + _saEsc(m.kod) + ' · ' + m.teklifSay + ' teklif · %' + m.kabulOran + ' kabul · Son: ' + (m.gunFark >= 999 ? '—' : m.gunFark + ' gün önce') + '</div></div>';
      h += '<span style="font-size:9px;padding:3px 8px;border-radius:10px;background:' + m.skorBg + ';color:' + m.skorRenk + ';font-weight:500">' + m.skorLbl + '</span>';
      h += '</div>';
    });
    h += '</div>';
    panel.innerHTML = h;
    return;
  }

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
  var h = '<div style="position:fixed;top:40px;right:0;width:320px;height:calc(100vh - 40px);background:'+window._s2+';border-left:0.5px solid '+window._b+';overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;z-index:8888;box-shadow:-4px 0 16px rgba(0,0,0,.08)">';
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
  if (typeof window._steklifDurumPanelHTML === 'function') h += window._steklifDurumPanelHTML(t);
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
  ic += '<div style="display:flex;align-items:center;gap:6px;padding:8px 20px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  ic += '<span style="font-size:9px;color:var(--t3);font-weight:500">PI TASARIM:</span>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'A\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'var(--t)\';this.style.color=\'var(--sf)\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">A — Corporate</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'B\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'#185FA5\';this.style.color=\'#fff\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit">B — Modern</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'C\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'#1D9E75\';this.style.color=\'#fff\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit">C — Premium</button>';
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
  ic += '<input id="st-musteri-kod" value="0000" placeholder="3230" oninput="event.stopPropagation();var sid=window._saTeklifId?.(this.value)||(this.value+\'-\'+Date.now());document.getElementById(\'st-id-goster\').textContent=sid;document.getElementById(\'st-id\').value=sid;window._saV2MusteriKodAra(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:monospace"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ ADI</div>';
  ic += '<input id="st-musteri-ad" placeholder="Müşteri adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GEÇERLİLİK TARİHİ</div>';
  ic += '<input type="date" id="st-gecerlilik" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '</div>';
  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden;margin-bottom:12px">';
  ic += '<table style="width:100%;border-collapse:collapse">';
  ic += '<thead><tr style="background:var(--s2);font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em">';
  ic += '<th style="padding:6px 8px;text-align:left">GRS</th><th style="padding:6px 8px;text-align:left">DUAY KODU</th><th style="padding:6px 8px;text-align:left">ÜRÜN ADI</th><th style="padding:6px 8px;text-align:left">MİKTAR</th><th style="padding:6px 8px;text-align:left">ALİŞ TL</th><th style="padding:6px 8px;text-align:left">MARJ %</th><th style="padding:6px 8px;text-align:left">BİRİM SATIŞ</th><th style="padding:6px 8px;text-align:left">TOPLAM</th><th style="padding:6px 8px"></th>';
  ic += '</tr></thead>';
  ic += '<tbody id="st-urun-tbody"></tbody>';
  ic += '</table>';
  ic += '<div style="padding:8px;border-top:0.5px solid var(--b)">';
  ic += '<button onclick="event.stopPropagation();window._saV2UrunSecModal()" style="font-size:10px;padding:4px 12px;border:0.5px dashed var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">+ Ürün Ekle</button>';
  ic += '</div></div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESLİM KOŞULU (INCOTERMS)</div>';
  ic += '<select id="st-teslim" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<option value="FOB Istanbul">FOB Istanbul</option>';
  ic += '<option value="CIF Destination">CIF Destination</option>';
  ic += '<option value="EXW Istanbul">EXW Istanbul</option>';
  ic += '<option value="CFR Destination">CFR Destination</option>';
  ic += '<option value="DDP Destination">DDP Destination</option>';
  ic += '<option value="DAP Destination">DAP Destination</option>';
  ic += '<option value="FCA Istanbul">FCA Istanbul</option>';
  ic += '<option value="CPT Destination">CPT Destination</option>';
  ic += '<option value="CIP Destination">CIP Destination</option>';
  ic += '<option value="DPU Destination">DPU Destination</option>';
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">ÖDEME KOŞULU</div>';
  ic += '<select id="st-odeme" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<option>30% Advance, 70% L/C at sight</option>';
  ic += '<option>50% Advance, 50% L/C at sight</option>';
  ic += '<option>100% Advance before shipment</option>';
  ic += '<option>L/C at sight</option>';
  ic += '<option>T/T 30 days after B/L</option>';
  ic += '<option>T/T 60 days after B/L</option>';
  ic += '<option>D/P at sight</option>';
  ic += '<option>Open Account 30 days</option>';
  ic += '</select></div>';
  ic += '</div>';
  ic += '<div style="background:var(--s2);border-radius:6px;padding:12px 14px;border:0.5px solid var(--b);margin-bottom:12px">';
  ic += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:8px" id="st-ozet-urun-say">0 ürün</div>';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="color:var(--t3)">Toplam satış tutarı</span><span style="font-weight:500" id="st-ozet-toplam-satis">₺0.00</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px"><span style="color:var(--t3)">EUR alternatif</span><span style="color:#185FA5" id="st-ozet-eur">—</span></div>';
  ic += '<div style="height:0.5px;background:var(--b);margin:6px 0"></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--t3)">Toplam kâr</span><span style="font-weight:500;color:#0F6E56" id="st-ozet-toplam-kar">₺0.00</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px"><span style="color:var(--t3)">Ort. marj</span><span style="color:#0F6E56" id="st-ozet-ort-marj">%0</span></div>';
  ic += '</div>';
  ic += '<div style="font-size:9px;font-family:monospace;background:var(--s2);padding:7px 10px;border-radius:4px;border:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  ic += '<span style="color:var(--t3)">TEKLİF ID:</span><span style="color:#0C447C;font-weight:500" id="st-id-goster">'+satisId+'</span>';
  ic += '<input id="st-id" type="hidden" value="'+satisId+'"></div>';
  ic += '<div style="display:flex;gap:8px">';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisPDF()" style="flex:1;font-size:12px;padding:9px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">PDF Oluştur → Gönder</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydet(\''+t.id+'\')" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Taslak Kaydet</button>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">İptal</button>';
  ic += '</div>';
  ic += '<input type="hidden" id="st-urun-adi-hidden" value="'+_saEsc(t.urunAdi||'')+'"><input type="hidden" id="st-duay-kodu-hidden" value="'+_saEsc(t.duayKodu||'')+'"><input type="hidden" id="st-alis-tl-hidden" value="'+alisTl+'">';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  window._saV2SatisUrunler = [];
  window._saV2SatisUrunEkle(t);
};

window._saV2SatisKaydet = function(alisId) {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value?.trim()||'';
  var urunler = window._saV2SatisUrunler||[];
  var toplamSatis = 0; var toplamAlis = 0;
  urunler.forEach(function(u){ toplamSatis+=u.alisTl*(1+u.marj/100)*u.miktar; toplamAlis+=u.alisTl*u.miktar; });
  var toplamKar = (toplamSatis-toplamAlis).toFixed(2);
  var ortMarj = toplamAlis>0?((toplamSatis-toplamAlis)/toplamAlis*100).toFixed(1):0;
  var kayit = {
    id:window._saId?.(),
    teklifId:teklifId,
    revNo: '01',
    alisId:alisId,
    musteriAd:musteriAd,
    musteriKod:document.getElementById('st-musteri-kod')?.value||'',
    urunler:urunler,
    toplamSatis:toplamSatis.toFixed(2),
    toplamEUR: (parseFloat(toplamSatis) / ((window._saKur||{}).EUR||51.70) * ((window._saKur||{}).USD||44.55)).toFixed(2),
    toplamKar:toplamKar,
    ortMarj:ortMarj,
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
  window._saV2TakipGorevOlustur(kayit);
  window.toast?.('Satış teklifi kaydedildi: '+teklifId,'ok');
};

window._saV2SatisPDF = function() {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value||'';
  var musteriKod = document.getElementById('st-musteri-kod')?.value||'';
  var gecerlilik = document.getElementById('st-gecerlilik')?.value||'';
  var teslim = document.getElementById('st-teslim')?.value||'FOB Istanbul';
  var odeme = document.getElementById('st-odeme')?.value||'';
  var tasarim = window._saV2AktifPITasarim || 'A';
  var teklif = {
    teklifId: teklifId,
    musteriAd: musteriAd,
    musteriKod: musteriKod,
    gecerlilik: gecerlilik,
    teslim: teslim,
    odeme: odeme,
    urunler: window._saV2SatisUrunler || [],
    revNo: '01'
  };
  if (typeof window._piOlustur !== 'function') {
    window.toast?.('PI modülü yüklenmedi','warn'); return;
  }
  window._piOlustur(teklif, tasarim, 'musteri');
};
window._saV2Duzenle = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  if (t.durum === 'onaylandi') {
    window._saV2GuncellemeTalep(id);
    return;
  }
  window._saV2DuzenleForm(id);
};
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
  if (!kod || kod.length < 5) { var be=document.getElementById('sav2f-katalog-bilgi'); if(be) be.textContent=''; return; }
  var urunler = typeof window.loadUrunler==='function' ? window.loadUrunler() : [];
  var ihrUrunler = typeof window.loadIhracatUrunler==='function' ? window.loadIhracatUrunler() : [];
  var tumUrunler = urunler.concat(ihrUrunler);
  var u = tumUrunler.find(function(x){ return (x.duayKodu||'').toLowerCase()===kod.toLowerCase(); });
  var bilgiEl = document.getElementById('sav2f-katalog-bilgi');
  if (!u) { if(bilgiEl) bilgiEl.innerHTML='<span style="color:#A32D2D">Katalogda bulunamadı</span>'; return; }
  if (bilgiEl) bilgiEl.innerHTML='<span style="color:#0F6E56">✓ '+_saEsc(u.duayAdi||u.urunAdi||'')+'</span>';
  var alanlar = {urunAdi:u.standartAdi||u.urunAdi,turkceAdi:u.duayAdi||u.urunAdi,marka:u.marka,gtip:u.gtip||u.hscKodu,saticiKodu:u.saticiKodu||u.urunKodu,netAg:u.netAgirlik,brutAg:u.brutAgirlik};
  Object.keys(alanlar).forEach(function(k){ var el=document.getElementById('sav2f-'+k); if(el&&alanlar[k]) el.value=alanlar[k]; });
  var birimEl=document.getElementById('sav2f-birim'); if(birimEl&&u.birim){ Array.from(birimEl.options).forEach(function(o){if(o.value===u.birim)o.selected=true;}); }
  var menEl=document.getElementById('sav2f-mensei'); if(menEl&&u.mensei){ Array.from(menEl.options).forEach(function(o){if(o.value===u.mensei)o.selected=true;}); }
  if (u.gorsel) {
    window._saV2FormGorselData = u.gorsel;
    var oniz=document.getElementById('sav2f-gorsel-oniz');
    if(oniz) oniz.innerHTML='<img src="'+u.gorsel+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px">';
    var ad=document.getElementById('sav2f-gorsel-ad');
    if(ad) ad.textContent='Katalogdan otomatik';
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

/* ── SA-V2-COKLU-001: Çoklu ürün ekleme ────────────────────── */
window._saV2SatisUrunler = [];

window._saV2SatisUrunEkle = function(t) {
  var kur = (window._saKur||{})[t.para]||44.55;
  var alisF = parseFloat(t.alisF)||0;
  var alisTl = parseFloat((alisF*kur).toFixed(2));
  window._saV2SatisUrunler.push({ id:t.id, duayKodu:t.duayKodu||'', urunAdi:t.urunAdi||'', gorsel:t.gorsel||'', alisTl:alisTl, miktar:1, marj:33 });
  window._saV2SatisTabloyuGuncelle();
};

window._saV2SatisTabloyuGuncelle = function() {
  var tbody = document.getElementById('st-urun-tbody');
  if (!tbody) return;
  var html = '';
  window._saV2SatisUrunler.forEach(function(u, i) {
    var satisFiyat = (u.alisTl*(1+u.marj/100)).toFixed(2);
    var toplam = (satisFiyat*u.miktar).toFixed(2);
    html += '<tr>';
    html += '<td style="padding:8px">'+(u.gorsel?'<img src="'+u.gorsel+'" style="width:30px;height:30px;border-radius:4px;object-fit:cover">':'<div style="width:30px;height:30px;border-radius:4px;background:var(--s2);border:0.5px solid var(--b)"></div>')+'</td>';
    html += '<td style="padding:8px;font-size:9px;color:#0C447C;font-weight:500">'+_saEsc(u.duayKodu)+'</td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500">'+_saEsc(u.urunAdi)+'</td>';
    html += '<td style="padding:8px"><input type="number" value="'+u.miktar+'" min="1" style="width:55px;font-size:11px;padding:4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit" onchange="event.stopPropagation();window._saV2SatisUrunler['+i+'].miktar=parseFloat(this.value)||1;window._saV2SatisOzetGuncelle()"></td>';
    html += '<td style="padding:8px;font-size:11px;color:var(--t2)">₺'+u.alisTl.toFixed(2)+'</td>';
    html += '<td style="padding:8px"><input type="number" value="'+u.marj+'" min="1" max="90" style="width:55px;font-size:11px;padding:4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit" onchange="event.stopPropagation();window._saV2SatisUrunler['+i+'].marj=parseFloat(this.value)||33;window._saV2SatisOzetGuncelle()"></td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500;color:#0F6E56">₺'+satisFiyat+'</td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500">₺'+toplam+'</td>';
    html += '<td style="padding:8px"><button onclick="event.stopPropagation();window._saV2SatisUrunler.splice('+i+',1);window._saV2SatisTabloyuGuncelle();window._saV2SatisOzetGuncelle()" style="font-size:10px;padding:2px 6px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:#A32D2D">Kaldır</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
  window._saV2SatisOzetGuncelle();
};

window._saV2SatisOzetGuncelle = function() {
  var toplamSatis = 0; var toplamAlis = 0; var toplamMiktar = 0;
  window._saV2SatisUrunler.forEach(function(u) {
    var satisFiyat = u.alisTl*(1+u.marj/100);
    toplamSatis += satisFiyat*u.miktar;
    toplamAlis  += u.alisTl*u.miktar;
    toplamMiktar += u.miktar;
  });
  var toplamKar = toplamSatis - toplamAlis;
  var ortMarj = toplamAlis>0 ? ((toplamKar/toplamAlis)*100).toFixed(1) : 0;
  var eurKur = (window._saKur||{}).EUR || 51.70;
  var usdKur = (window._saKur||{}).USD || 44.55;
  var toplamEUR = (toplamSatis / eurKur * usdKur).toFixed(2);
  var el1 = document.getElementById('st-ozet-toplam-satis'); if(el1) el1.textContent = '₺'+toplamSatis.toFixed(2);
  var el2 = document.getElementById('st-ozet-toplam-kar'); if(el2) el2.textContent = '₺'+toplamKar.toFixed(2);
  var el3 = document.getElementById('st-ozet-ort-marj'); if(el3) el3.textContent = '%'+ortMarj;
  var el4 = document.getElementById('st-ozet-urun-say'); if(el4) el4.textContent = window._saV2SatisUrunler.length+' ürün · '+toplamMiktar+' adet';
  var el5 = document.getElementById('st-ozet-eur'); if(el5) el5.textContent = '€'+toplamEUR;
};

window._saV2UrunSecModal = function() {
  var liste = window._saV2Load?.() || [];
  if (!liste.length) { window.toast?.('Önce alış teklifi ekleyin','warn'); return; }
  var mevcut = document.getElementById('sav2-urun-sec-modal'); if(mevcut) mevcut.remove();
  var m = document.createElement('div');
  m.id = 'sav2-urun-sec-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  m.onclick = function(e){ if(e.target===m) m.remove(); };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:600px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--b)"><span style="font-size:13px;font-weight:500">Ürün Seç</span><button onclick="event.stopPropagation();document.getElementById(\'sav2-urun-sec-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3)">×</button></div>';
  ic += '<div style="flex:1;overflow-y:auto">';
  liste.filter(function(t){return !t.isDeleted;}).forEach(function(t) {
    var payload = JSON.stringify({id:t.id,duayKodu:t.duayKodu||'',urunAdi:t.urunAdi||'',gorsel:t.gorsel||'',alisF:t.alisF||0,para:t.para||'USD'}).replace(/"/g,'&quot;');
    ic += '<div onclick="event.stopPropagation();window._saV2SatisUrunEkle('+payload+');document.getElementById(\'sav2-urun-sec-modal\')?.remove()" style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--b);cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    ic += (t.gorsel?'<img src="'+t.gorsel+'" style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0">':'<div style="width:36px;height:36px;border-radius:4px;background:var(--s2);flex-shrink:0"></div>');
    ic += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">'+_saEsc(t.urunAdi||'—')+'</div>';
    ic += '<div style="font-size:9px;color:var(--t3);margin-top:1px">'+_saEsc(t.duayKodu||'—')+' · '+_saEsc(t.alisF||'—')+' '+_saEsc(t.para||'')+'</div></div>';
    ic += '</div>';
  });
  ic += '</div></div>';
  m.innerHTML = ic;
  document.body.appendChild(m);
};

/* ── SA-V2-CSV-001: Toplu CSV Import ───────────────────────── */
window._saV2CSVImport = function() {
  var mevcut = document.getElementById('sav2-csv-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'sav2-csv-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:640px;max-height:90vh;overflow-y:auto">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div><div style="font-size:14px;font-weight:500;color:var(--t)">CSV / Excel Import</div>'
    + '<div style="font-size:9px;color:var(--t3);margin-top:2px">Excel\'den kopyala yapıştır veya CSV dosyası seç</div></div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-csv-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>'
    + '</div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:6px;padding:10px 14px">'
    + '<div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:6px">Beklenen kolon sırası (ilk satır başlık):</div>'
    + '<div style="font-size:10px;font-family:monospace;color:#185FA5">DUAY_KODU | URUN_ADI | TURKCE_ADI | MARKA | BIRIM | MENSEI | GTIP | ALIS_FIYATI | PARA | MIKTAR | TEDARIKCI | JOB_ID</div>'
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DOSYA SEÇ (.csv, .txt)</div>'
    + '<input type="file" accept=".csv,.txt" onchange="event.stopPropagation();window._saV2CSVDosyaOku(this)" style="font-size:11px;color:var(--t)">'
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">VEYA EXCEL\'DEN KOPYALA YAPIŞIR</div>'
    + '<textarea id="sav2-csv-text" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Excel\'den seç → Kopyala → Buraya yapıştır (Cmd+V)" style="width:100%;height:140px;font-size:11px;font-family:monospace;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>'
    + '</div>'
    + '<div id="sav2-csv-oniz" style="display:none;background:var(--s2);border-radius:6px;padding:10px;border:0.5px solid var(--b)">'
    + '<div style="font-size:9px;font-weight:500;color:var(--t3);margin-bottom:6px" id="sav2-csv-oniz-say"></div>'
    + '<div id="sav2-csv-oniz-liste" style="font-size:10px;color:var(--t2);max-height:120px;overflow-y:auto"></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="event.stopPropagation();window._saV2CSVOnizle()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Önizle</button>'
    + '<button onclick="event.stopPropagation();window._saV2CSVKaydet()" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">İçe Aktar</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-csv-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">İptal</button>'
    + '</div></div></div>';
  document.body.appendChild(modal);
};

window._saV2CSVDosyaOku = function(inp) {
  var f = inp.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) { var ta = document.getElementById('sav2-csv-text'); if (ta) ta.value = e.target.result; };
  r.readAsText(f, 'UTF-8');
};

window._saV2CSVParse = function(text) {
  var satirlar = text.split(/\r?\n/).filter(function(s) { return s.trim(); });
  if (satirlar.length < 2) return [];
  var ayrac = ',';
  var sayC = (text.match(/,/g) || []).length;
  var sayN = (text.match(/;/g) || []).length;
  var sayT = (text.match(/\t/g) || []).length;
  if (sayT > sayC && sayT > sayN) ayrac = '\t';
  else if (sayN > sayC) ayrac = ';';
  var basliklar = satirlar[0].split(ayrac).map(function(s) { return s.trim().toUpperCase().replace(/\s+/g, '_'); });
  var kolonMap = { DUAY_KODU: 'duayKodu', URUN_ADI: 'urunAdi', TURKCE_ADI: 'turkceAdi', MARKA: 'marka', BIRIM: 'birim', MENSEI: 'mensei', GTIP: 'gtip', ALIS_FIYATI: 'alisF', PARA: 'para', MIKTAR: 'miktar', TEDARIKCI: 'tedarikci', JOB_ID: 'jobId' };
  var kayitlar = [];
  for (var i = 1; i < satirlar.length; i++) {
    var hucre = satirlar[i].split(ayrac).map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
    var obj = {};
    basliklar.forEach(function(b, idx) { var k = kolonMap[b]; if (k) obj[k] = hucre[idx] || ''; });
    if (!obj.urunAdi && !obj.duayKodu) continue;
    kayitlar.push({
      id: window._saId?.() || (Date.now() + i + Math.random().toString(36).slice(2, 6)),
      duayKodu: obj.duayKodu || '',
      urunAdi: obj.urunAdi || '',
      turkceAdi: obj.turkceAdi || '',
      marka: obj.marka || '',
      birim: obj.birim || 'Adet',
      mensei: obj.mensei || 'TR',
      gtip: obj.gtip || '',
      alisF: obj.alisF || '',
      para: obj.para || 'USD',
      miktar: obj.miktar || '1',
      tedarikci: obj.tedarikci || '',
      jobId: obj.jobId || '',
      durum: 'bekleyen',
      karMarji: 33,
      createdAt: window._saNow?.(),
      updatedAt: window._saNow?.()
    });
  }
  return kayitlar;
};

window._saV2CSVOnizle = function() {
  var text = document.getElementById('sav2-csv-text')?.value || '';
  if (!text.trim()) { window.toast?.('Önce veri girin', 'warn'); return; }
  var kayitlar = window._saV2CSVParse(text);
  var oniz = document.getElementById('sav2-csv-oniz');
  var say = document.getElementById('sav2-csv-oniz-say');
  var liste = document.getElementById('sav2-csv-oniz-liste');
  if (!oniz) return;
  if (!kayitlar.length) { window.toast?.('Geçerli satır bulunamadı', 'warn'); return; }
  oniz.style.display = 'block';
  if (say) say.textContent = kayitlar.length + ' satır okundu — ilk 5 önizleme:';
  if (liste) liste.innerHTML = kayitlar.slice(0, 5).map(function(k) {
    return '<div style="padding:3px 0;border-bottom:0.5px solid var(--b)">' + _saEsc(k.duayKodu || '—') + ' · ' + _saEsc(k.urunAdi) + ' · ' + _saEsc(k.alisF) + ' ' + _saEsc(k.para) + '</div>';
  }).join('');
};

window._saV2CSVKaydet = function() {
  var text = document.getElementById('sav2-csv-text')?.value || '';
  if (!text.trim()) { window.toast?.('Önce veri girin', 'warn'); return; }
  var kayitlar = window._saV2CSVParse(text);
  if (!kayitlar.length) { window.toast?.('Geçerli satır bulunamadı', 'warn'); return; }
  var liste = window._saV2Load?.() || [];
  kayitlar.forEach(function(k) { liste.unshift(k); });
  window._saV2Store?.(liste);
  document.getElementById('sav2-csv-modal')?.remove();
  window.toast?.(kayitlar.length + ' teklif içe aktarıldı', 'ok');
  window.renderSatinAlmaV2?.();
};

/* ── SA-V2-GUNCELLEME-001: Düzenleme + Kilit + Güncelleme Talebi ── */
window._saV2DuzenleForm = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  var mevcut = document.getElementById('sav2-duzenle-modal'); if (mevcut) mevcut.remove();
  var modal = document.createElement('div');
  modal.id = 'sav2-duzenle-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var _f = function(fid, lbl, val) { return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><input id="sav2dz-' + fid + '" value="' + _saEsc(val || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:600px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  ic += '<div style="font-size:14px;font-weight:500;color:var(--t)">Teklif Düzenle</div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-duzenle-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>';
  ic += '</div><div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('urunAdi', 'İNG. ÜRÜN ADI', t.urunAdi);
  ic += _f('duayKodu', 'DUAY KODU', t.duayKodu);
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += _f('alisF', 'ALİŞ FİYATI', t.alisF);
  ic += _f('miktar', 'MİKTAR', t.miktar);
  ic += _f('tedarikci', 'TEDARİKÇİ', t.tedarikci);
  ic += '</div>';
  ic += _f('jobId', 'JOB ID', t.jobId);
  ic += '</div>';
  ic += '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-duzenle-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2DuzenleKaydet(\'' + id + '\')" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
};

window._saV2DuzenleKaydet = function(id) {
  var _v = function(fid) { return document.getElementById('sav2dz-' + fid)?.value?.trim() || ''; };
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.urunAdi = _v('urunAdi');
  t.duayKodu = _v('duayKodu');
  t.alisF = _v('alisF');
  t.miktar = _v('miktar');
  t.tedarikci = _v('tedarikci');
  t.jobId = _v('jobId');
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  document.getElementById('sav2-duzenle-modal')?.remove();
  window.toast?.('Teklif güncellendi', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2GuncellemeTalep = function(id) {
  var mevcut = document.getElementById('sav2-guncelleme-modal'); if (mevcut) mevcut.remove();
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  var modal = document.createElement('div');
  modal.id = 'sav2-guncelleme-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:540px">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Güncelleme Talebi</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Onaylı teklif — değişiklik yönetici onayına gidecek</div></div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-guncelleme-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>';
  ic += '</div><div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += '<div style="background:#FAEEDA;border:0.5px solid #FAC775;border-radius:6px;padding:10px 14px;font-size:11px;color:#633806">Bu teklif onaylanmış durumda. Değişiklik talebiniz yöneticiye iletilecek, onaylanana kadar mevcut veriler korunacak.</div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DEĞİŞİKLİK NEDENİ *</div>';
  ic += '<textarea id="sav2-gun-neden" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Neden güncelleme yapılmak isteniyor?" style="width:100%;height:80px;font-size:12px;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:none;font-family:inherit;box-sizing:border-box"></textarea>';
  ic += '</div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">YENİ ALİŞ FİYATI (opsiyonel)</div>';
  ic += '<input id="sav2-gun-fiyat" placeholder="Yeni fiyat" value="' + _saEsc(t.alisF || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">';
  ic += '</div>';
  ic += '<div style="display:flex;gap:8px;justify-content:flex-end">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-guncelleme-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2GuncellemeGonder(\'' + id + '\')" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:#854F0B;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Yöneticiye Gönder</button>';
  ic += '</div></div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
};

window._saV2GuncellemeGonder = function(id) {
  var neden = document.getElementById('sav2-gun-neden')?.value?.trim() || '';
  var yeniFiyat = document.getElementById('sav2-gun-fiyat')?.value?.trim() || '';
  if (!neden) { window.toast?.('Neden alanı zorunlu', 'warn'); return; }
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.guncellemeTalep = {
    neden: neden,
    yeniFiyat: yeniFiyat,
    eskiFiyat: t.alisF,
    tarih: window._saNow?.(),
    talipAd: window._saCu?.()?.displayName || 'Kullanıcı',
    durum: 'bekliyor'
  };
  t.durum = 'guncelleme_bekliyor';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  document.getElementById('sav2-guncelleme-modal')?.remove();
  window.toast?.('Güncelleme talebi yöneticiye gönderildi', 'ok');
  if (typeof window.logActivity === 'function') window.logActivity('TEKLIF_GUNCELLEME_TALEP', { id: id, neden: neden });
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiGuncellemeOnayla = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t || !t.guncellemeTalep) return;
  var yf = t.guncellemeTalep.yeniFiyat;
  if (yf) t.alisF = yf;
  t.durum = 'onaylandi';
  t.guncellemeTalep.durum = 'onaylandi';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Güncelleme onaylandı', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiGuncellemeReddet = function(id, aciklama) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t || !t.guncellemeTalep) return;
  t.durum = 'onaylandi';
  t.guncellemeTalep.durum = 'reddedildi';
  t.guncellemeTalep.aciklama = aciklama || '';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Güncelleme talebi reddedildi', 'warn');
  window.renderSatinAlmaV2?.();
};

/* ── SA-V2-TAKIP-001: Satış takip görev otomasyonu ─────────── */
window._saV2TakipGorevOlustur = function(teklif) {
  try {
    if (typeof window._ppLoad !== 'function' || typeof window._ppStore !== 'function') return;
    var takipTarih = new Date();
    takipTarih.setDate(takipTarih.getDate() + 2);
    var takipStr = takipTarih.toISOString().slice(0,10);
    var gorev = {
      id: window._saId?.() || Date.now()+Math.random().toString(36).slice(2,6),
      baslik: 'Takip: '+_saEsc(teklif.musteriAd||'Müşteri')+' — '+_saEsc(teklif.teklifId||''),
      aciklama: 'Satış teklifi gönderildi. Müşteri yanıtı takip edilmeli. Teklif ID: '+(teklif.teklifId||''),
      departman: 'Satış',
      oncelik: 'yuksek',
      durum: 'plan',
      bitTarih: takipStr,
      basT: takipStr,
      job_id: teklif.teklifId||'',
      _ppSource: 'pro',
      _kaynak: 'satis_takip',
      _teklifId: teklif.teklifId||'',
      _musteriAd: teklif.musteriAd||'',
      _tekrarGun: 3,
      createdAt: window._saNow?.(),
      updatedAt: window._saNow?.()
    };
    var tasks = window._ppLoad();
    tasks.unshift(gorev);
    window._ppStore(tasks);
    console.log('[SA-V2] Takip görevi oluşturuldu:', gorev.baslik);
  } catch(e) { console.error('[SA-V2] Takip görevi hatası:', e); }
};

window._saV2TakipKontrol = function() {
  try {
    if (typeof window._ppLoad !== 'function') return;
    var tasks = window._ppLoad();
    var bugun = new Date().toISOString().slice(0,10);
    var guncellendi = false;
    tasks.forEach(function(t) {
      if (t._kaynak !== 'satis_takip' || t.durum === 'tamamlandi') return;
      if (t.bitTarih && t.bitTarih <= bugun) {
        var yeniTarih = new Date();
        yeniTarih.setDate(yeniTarih.getDate() + (t._tekrarGun||3));
        t.bitTarih = yeniTarih.toISOString().slice(0,10);
        t.baslik = 'Takip ('+(parseInt(t._tekrarSay||0)+1)+'. hatırlatma): '+(t._musteriAd||'Müşteri');
        t._tekrarSay = (parseInt(t._tekrarSay||0)+1);
        t.updatedAt = window._saNow?.();
        guncellendi = true;
        window.toast?.('Takip hatırlatması: '+(t._musteriAd||'Müşteri'),'info');
      }
    });
    if (guncellendi) window._ppStore(tasks);
  } catch(e) { console.error('[SA-V2] Takip kontrol hatası:', e); }
};

setTimeout(function(){ window._saV2TakipKontrol?.(); }, 3000);

/* ── SA-V2-PI-004: Müşteri kodu otomatik doldurma ─────────── */
window._saV2MusteriKodAra = function(kod) {
  if (!kod || kod.length < 2) return;
  var cariler = typeof window.loadCari === 'function' ? window.loadCari() : [];
  var musteri = cariler.find(function(c) {
    return (c.musteriKod || c.kod || c.id || '').toString() === kod.toString();
  });
  var adEl = document.getElementById('st-musteri-ad');
  if (musteri && adEl && !adEl.value) {
    adEl.value = musteri.ad || musteri.unvan || musteri.name || '';
  }
};

console.log('[SAV2-RENDER] v2.0 yüklendi');
