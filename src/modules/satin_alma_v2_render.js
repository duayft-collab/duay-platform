'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2_render.js — Satın Alma V2 Render
════════════════════════════════════════════════════════════════ */

/* ── Çoklu ürün uyum yardımcıları ───────────────────────────── */
function _saV2IlkUrun(t) { return (t.urunler && t.urunler.length) ? t.urunler[0] : t; }
function _saV2UrunAdi(t) { var u = _saV2IlkUrun(t); return u.urunAdi || u.turkceAdi || t.urunAdi || '\u2014'; }
function _saV2DuayKodu(t) { var u = _saV2IlkUrun(t); return u.duayKodu || t.duayKodu || '\u2014'; }
function _saV2AlisF(t) { if (t.toplamTutar) return parseFloat(t.toplamTutar) || 0; var u = _saV2IlkUrun(t); return parseFloat(u.alisF || t.alisF) || 0; }
function _saV2Para(t) { if (t.toplamPara) return t.toplamPara; var u = _saV2IlkUrun(t); return u.para || t.para || 'USD'; }
function _saV2Miktar(t) { if (t.urunler && t.urunler.length) return t.urunler.reduce(function(s, u) { return s + (parseFloat(u.miktar) || 0); }, 0); return parseFloat(t.miktar) || 0; }
function _saV2UrunSayisi(t) { return (t.urunler && t.urunler.length) ? t.urunler.length : 1; }

/* ── Ana render ─────────────────────────────────────────────── */
/* SAV2-RENDER-MERGE-001: gelişmiş render yüklendi bayrağı + _saV2RenderMain alias */
/* SATINALMA-C-DESIGN-ACTIVE-001: render.js devre dışı — liste.js C tasarımı (KPI + filtreli) aktif */
window._saV2RenderLoaded = false;
window._saV2RenderMain = function() {
  window._saV2HatirlatmaKontrol?.();
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
  /* SATINALMA-V2-KPI-TEDARIKCI-001: ORT. KAR MARJI anlamsız → TEDARİKÇİ SAYISI */
  var _tedSay = new Set(liste.filter(function(t){ return t.tedarikci; }).map(function(t){ return t.tedarikci; })).size;
  var kpiItems = [
    {l:'BU AY TEKLİF',v:kpi.buAy,s:'Geçen ay ile karşılaştır',renk:window._t,bar:'#185FA5',pct:80},
    {l:'BEKLEYEN ONAY',v:kpi.bekleyen,s:kpi.bekleyen>0?'Onay bekliyor':'Bekleyen yok',renk:'#854F0B',bar:'#854F0B',pct:Math.min(kpi.bekleyen*10,100)},
    {l:'TEDARİKÇİ',v:_tedSay+' firma',s:'aktif tedarikçi',renk:'#185FA5',bar:'#378ADD',pct:Math.min(_tedSay*10,100)},
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
  var seciliSay = window._saV2ListeSecili ? Object.keys(window._saV2ListeSecili).filter(function(k){return window._saV2ListeSecili[k];}).length : 0;
  h += '<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:0.5px solid '+window._b+';flex-shrink:0;overflow-x:auto">';
  h += '<button onclick="event.stopPropagation();window._saV2YeniTeklif()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:'+window._t+';color:'+window._sf+';cursor:pointer;font-weight:500;white-space:nowrap;flex-shrink:0;font-family:inherit">+ Yeni Teklif</button>';
  window._canSatisTeklif = window.isAdmin?.() || ['manager','lead'].indexOf(window.CU?.()?.role||window.CU?.()?.rol||'')!==-1;
  h += '<div style="width:0.5px;height:18px;background:'+window._b+';flex-shrink:0"></div>';
  h += '<input id="sav2-srch" value="'+(window._sav2SrchVal||'')+'" placeholder="Duay kodu, ürün adı, tedarikçi..." oninput="event.stopPropagation();window._sav2SrchVal=this.value;window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:10px;padding:5px 9px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t+';min-width:180px;font-family:inherit">';
  h += '<select id="sav2-durum" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Tüm durumlar</option><option value="bekleyen">Bekleyen</option><option value="onaylandi">Onaylı</option><option value="reddedildi">Reddedildi</option></select>';
  h += '<select id="sav2-ted" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Tüm tedarikçiler</option></select>';
  h += '<select id="sav2-tarih" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;color:'+window._t2+';flex-shrink:0;font-family:inherit"><option value="">Bu ay</option><option value="hafta">Bu hafta</option><option value="3ay">Son 3 ay</option><option value="hepsi">Tümü</option></select>';
  h += '<div style="margin-left:auto;display:flex;gap:5px;flex-shrink:0">';
  if (seciliSay>0) {
    h += '<button onclick="event.stopPropagation();window._saV2OnayaGonder()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#854F0B;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">Onaya Gönder ('+seciliSay+')</button>';
    h += '<button onclick="event.stopPropagation();window._saV2TopluSil()" style="font-size:10px;padding:5px 12px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;color:#A32D2D;cursor:pointer;font-weight:500;font-family:inherit">Sil ('+seciliSay+')</button>';
    h += '<button onclick="event.stopPropagation();window._saV2TopluOnayla()" style="font-size:10px;padding:5px 10px;border:none;border-radius:5px;background:#0F6E56;color:#fff;cursor:pointer;font-family:inherit;flex-shrink:0">✓ Toplu Onayla ('+seciliSay+')</button>';
    h += '<button onclick="event.stopPropagation();window._saV2TopluReddet()" style="font-size:10px;padding:5px 10px;border:none;border-radius:5px;background:#A32D2D;color:#fff;cursor:pointer;font-family:inherit;flex-shrink:0">✗ Toplu Reddet ('+seciliSay+')</button>';
  }
  h += '<button onclick="event.stopPropagation();window._saV2CSVImport()" style="font-size:10px;padding:5px 10px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';white-space:nowrap;flex-shrink:0;font-family:inherit">↑ CSV Import</button>';
  h += '<button onclick="event.stopPropagation();window._saV2ExportCSV()" style="font-size:10px;padding:5px 10px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit;flex-shrink:0">↓ CSV Export</button>';
  h += '</div></div>';

  if ((window.SAV2_MOD||'teklifler') === 'raporlar') {
    var tumListe = _saV2Load().filter(function(t){return !t.isDeleted;});
    var onaylilar = tumListe.filter(function(t){return t.durum==='onaylandi';});
    var bekleyenler = tumListe.filter(function(t){return t.durum==='bekleyen';});
    var toplamAlis = onaylilar.reduce(function(a,t){var kur=(window._saKur||{})[_saV2Para(t)]||(window.DUAY_KUR?.USD||44.55);return a+_saV2AlisF(t)*kur*(_saV2Miktar(t)||1);},0);
    var urunMap = {}; onaylilar.forEach(function(t){var k=_saV2DuayKodu(t)||_saV2UrunAdi(t)||'\u2014';if(!urunMap[k])urunMap[k]={ad:_saV2UrunAdi(t)||k,kod:_saV2DuayKodu(t)||'',adet:0,toplamAlis:0,marjToplam:0,say:0};urunMap[k].adet+=(_saV2Miktar(t)||1);var kur=(window._saKur||{})[_saV2Para(t)]||(window.DUAY_KUR?.USD||44.55);urunMap[k].toplamAlis+=_saV2AlisF(t)*kur*(_saV2Miktar(t)||1);urunMap[k].marjToplam+=(parseFloat(t.karMarji)||33);urunMap[k].say++;});
    var tedMap = {}; onaylilar.forEach(function(t){var k=t.tedarikci||'\u2014';if(!tedMap[k])tedMap[k]={ad:k,say:0,toplamAlis:0};tedMap[k].say++;var kur=(window._saKur||{})[_saV2Para(t)]||(window.DUAY_KUR?.USD||44.55);tedMap[k].toplamAlis+=_saV2AlisF(t)*kur*(_saV2Miktar(t)||1);});
    var ayMap = {}; tumListe.forEach(function(t){var ay=(t.createdAt||'').slice(0,7);if(!ay)return;if(!ayMap[ay])ayMap[ay]={ay:ay,say:0,alis:0};ayMap[ay].say++;var kur=(window._saKur||{})[_saV2Para(t)]||(window.DUAY_KUR?.USD||44.55);ayMap[ay].alis+=_saV2AlisF(t)*kur*(_saV2Miktar(t)||1);});
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
    var secili = window._saV2ListeSecili&&window._saV2ListeSecili[t.id];
    h += '<div onclick="event.stopPropagation();window.SAV2_AKT_ID=\''+t.id+'\';window.renderSatinAlmaV2()" ondblclick="event.stopPropagation();window._saV2DuzenleForm?.(\''+t.id+'\')" style="display:flex;align-items:center;padding:7px 10px;border-bottom:0.5px solid '+window._b+';border-left:3px solid '+kenar+';cursor:pointer;background:'+(on?'#F0FBF6':secili?'#FFFCF5':window._sf)+'" onmouseover="if(!'+on+')this.style.background=\''+window._s2+'\'" onmouseout="if(!'+on+')this.style.background=\''+(secili?'#FFFCF5':window._sf)+'\'">';
    h += '<div style="width:22px" onclick="event.stopPropagation()"><input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2Sec(\''+t.id+'\',this.checked)" style="width:11px;height:11px;cursor:pointer"></div>';
    var gorselSrc = t.gorsel || '';
    h += '<div style="width:34px"><div style="width:28px;height:28px;border-radius:4px;background:'+(gorselSrc?'#E6F1FB':window._s2)+';border:0.5px solid '+window._b+';display:flex;align-items:center;justify-content:center;overflow:hidden">';
    if (gorselSrc) h += '<img src="'+gorselSrc+'" style="width:100%;height:100%;object-fit:cover">';
    else h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="'+(gorselSrc?'#185FA5':'currentColor')+'" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
    h += '</div></div>';
    /* SAV2-ESC-UPGRADE-001: window._esc (attribute-safe) öncelikli, _saEsc fallback */
    h += '<div style="width:86px"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500">'+(window._esc?.(_saV2DuayKodu(t))||_saV2DuayKodu(t)||'—')+'</span></div>';
    h += '<div style="width:130px;font-size:11px;font-weight:500;color:'+window._t+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(window._esc?.(_saV2UrunAdi(t))||_saV2UrunAdi(t)||'—')+(_saV2UrunSayisi(t)>1?'<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#E6F1FB;color:#0C447C;margin-left:4px">+'+(_saV2UrunSayisi(t)-1)+'</span>':'')+'</div>';
    var _u0 = _saV2IlkUrun(t);
    h += '<div style="width:100px;font-size:10px;color:'+window._t2+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_saEsc(_u0.turkceAdi||t.turkceAdi||t.duayAdi||'\u2014')+'</div>';
    h += '<div style="width:50px;font-size:10px;color:'+window._t2+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_saEsc(_u0.marka||t.marka||'\u2014')+'</div>';
    h += '<div style="width:38px;font-size:10px;color:'+window._t3+'">'+_saEsc(_u0.birim||t.birim||'\u2014')+'</div>';
    h += '<div style="width:38px;font-size:10px;color:'+window._t3+'">'+_saEsc(_u0.mensei||t.mensei||'\u2014')+'</div>';
    h += '<div style="width:52px;font-size:9px;font-family:monospace;color:'+window._t3+'">'+_saEsc(_u0.gtip||t.gtip||'\u2014')+'</div>';
    h += '<div style="width:65px;font-size:11px;font-weight:500;color:'+kenar+'">'+_saEsc(_saV2AlisF(t)||'\u2014')+' '+_saEsc(_saV2Para(t))+'</div>';
    h += '<div style="width:50px;font-size:9px;color:#0C447C;font-family:monospace">'+_saEsc(t.jobId||'—')+'</div>';
    /* SA-PIPELINE-001c: badge SA_PIPELINE_STAGES'tan, fallback eski ternary */
    var _stageInfo = window.SA_PIPELINE_STAGES?.[t.durum] || null;
    var stRenk = _stageInfo ? 'background:'+_stageInfo.renk+'22;color:'+_stageInfo.renk
      : ({bekleyen:'background:#FAEEDA;color:#854F0B',onaylandi:'background:#E1F5EE;color:#0F6E56',reddedildi:'background:#FCEBEB;color:#A32D2D'}[t.durum]||'background:'+window._s2+';color:'+window._t3);
    var stLbl  = _stageInfo ? _stageInfo.label
      : ({bekleyen:'Bekliyor',onaylandi:'Onaylı',reddedildi:'Reddedildi'}[t.durum]||t.durum||'Taslak');
    h += '<div style="width:52px"><span style="font-size:8px;padding:2px 5px;border-radius:3px;font-weight:500;'+stRenk+'">'+stLbl+'</span>';
    if(typeof window._steklifOzetHTML==='function') h += window._steklifOzetHTML(t);
    h += '</div>';
    if(t.createdBy||t.createdAt) h += '<div style="font-size:8px;color:'+window._t3+';padding:0 4px;white-space:nowrap">'+(t.createdBy?_saEsc(t.createdBy):'')+(t.createdAt?' · '+_saEsc(String(t.createdAt).slice(0,10)):'')+'</div>';
    /* SAV2-LISTE-BUTON-001: Görüntüle + PI butonları */
    h += '<button onclick="event.stopPropagation();window._saV2DetayAc?.(\''+String(t.id)+'\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2);margin-left:4px">👁 Gör</button>';
    h += '<button onclick="event.stopPropagation();window._piOlustur?.(window._saV2Load?.().find(function(x){return String(x.id)===\''+String(t.id)+'\';}),\'A\',1)" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--ac);margin-left:2px">📄 PI</button>';
    h += '</div>';
    if (t.urunler && t.urunler.length > 1) {
      t.urunler.forEach(function(u, i) {
        h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 12px 4px 32px;border-bottom:0.5px solid '+window._b+';background:'+window._s2+'">';
        h += '<span style="font-size:9px;color:'+window._t3+';min-width:16px">'+(i+1)+'.</span>';
        h += '<span style="font-size:10px;font-family:monospace;color:'+window._t3+';min-width:80px">'+_saEsc(u.duayKodu||'\u2014')+'</span>';
        h += '<span style="font-size:10px;color:'+window._t+';flex:1">'+_saEsc(u.urunAdi||u.turkceAdi||'\u2014')+'</span>';
        h += '<span style="font-size:10px;color:'+window._t3+'">'+(u.miktar||0)+' '+_saEsc(u.birim||'')+'</span>';
        h += '<span style="font-size:10px;color:#0F6E56;min-width:80px;text-align:right">'+_saEsc(u.toplam||'')+' '+_saEsc(u.para||'')+'</span>';
        h += '</div>';
      });
    }
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

  /* SAV2-FIX: Arama focus koruması */
  if(window._sav2SrchVal) {
    var _srchEl = document.getElementById('sav2-srch');
    if(_srchEl) { _srchEl.focus(); _srchEl.setSelectionRange(_srchEl.value.length, _srchEl.value.length); }
  }

  /* SAV2-UI-001: Tedarikçi select dinamik doldur */
  var tedSel = document.getElementById('sav2-ted');
  if(tedSel && tedSel.options.length <= 1) {
    var _tedArr = []; var _tedS = {};
    liste.forEach(function(t){ var td=t.tedarikci||''; if(td&&!_tedS[td]){_tedS[td]=true;_tedArr.push(td);} });
    _tedArr.sort();
    _tedArr.forEach(function(ted){
      var opt = document.createElement('option');
      opt.value = ted; opt.textContent = ted;
      tedSel.appendChild(opt);
    });
  }

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
/* SAV2-RENDER-MERGE-001: render.js yüklendiğinde renderSatinAlmaV2 direkt _saV2RenderMain'e bağlanır */
window.renderSatinAlmaV2 = window._saV2RenderMain;

/* ── Filtre uygulayıcı ──────────────────────────────────────── */
window._saV2FiltreLi = function(liste) {
  var q    = (window._sav2SrchVal || document.getElementById('sav2-srch')?.value || '').toLowerCase();
  var dur  = document.getElementById('sav2-durum')?.value || '';
  var ted  = document.getElementById('sav2-ted')?.value || '';
  var tar  = document.getElementById('sav2-tarih')?.value || '';
  var bugAy= _saToday().slice(0,7);
  return liste.filter(function(t) {
    if (q && !(
      (_saV2DuayKodu(t)||'').toLowerCase().includes(q) ||
      (_saV2UrunAdi(t)||'').toLowerCase().includes(q) ||
      (t.tedarikci||'').toLowerCase().includes(q) ||
      (t.jobId||'').toLowerCase().includes(q) ||
      (t.piNo||'').toLowerCase().includes(q)
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
  var kur = (window._saKur||{})[_saV2Para(t)] || 44.55;
  var alisF = _saV2AlisF(t);
  var tl    = (alisF*kur).toFixed(2);
  var marj  = parseFloat(t.karMarji)||33;
  var satis = (alisF*kur*(1+marj/100)).toFixed(2);
  var h = '<div style="position:fixed;top:40px;right:0;width:320px;height:calc(100vh - 40px);background:'+window._s2+';border-left:0.5px solid '+window._b+';overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;z-index:8888;box-shadow:-4px 0 16px rgba(0,0,0,.08)">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:10px;font-weight:500;color:'+window._t+'">Teklif Detayı</span><button onclick="event.stopPropagation();window.SAV2_AKT_ID=null;window.renderSatinAlmaV2()" style="font-size:14px;border:none;background:none;cursor:pointer;color:'+window._t3+';line-height:1">×</button></div>';
  h += '<div style="display:flex;gap:8px;align-items:flex-start">';
  if (t.gorsel) h += '<img src="'+t.gorsel+'" style="width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0">';
  else h += '<div style="width:56px;height:56px;border-radius:6px;background:#E6F1FB;border:0.5px solid #B5D4F4;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>';
  h += '<div><div style="font-size:12px;font-weight:500;color:'+window._t+'">'+_saEsc(_saV2UrunAdi(t))+(_saV2UrunSayisi(t)>1?' <span style="font-size:9px;color:#0C447C">('+_saV2UrunSayisi(t)+' \u00fcr\u00fcn)</span>':'')+'</div>';
  h += '<div style="font-size:9px;color:'+window._t3+';margin-top:1px">'+_saEsc(t.tedarikci||'\u2014')+(t.piNo?' \u00b7 PI: '+_saEsc(t.piNo):'')+'</div>';
  h += '<div style="display:flex;gap:3px;margin-top:4px"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500">'+_saEsc(_saV2DuayKodu(t))+'</span></div>';
  h += '</div></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">';
  h += '<div style="background:'+window._sf+';border-radius:5px;padding:7px;border:0.5px solid '+window._b+'"><div style="font-size:8px;color:'+window._t3+'">TOPLAM TUTAR</div><div style="font-size:13px;font-weight:500;color:#0F6E56">'+_saEsc(alisF||'\u2014')+' '+_saEsc(_saV2Para(t))+'</div><div style="font-size:8px;color:'+window._t3+'">= \u20ba'+tl+' (kur: '+kur.toFixed(2)+')</div></div>';
  h += '<div style="background:'+window._sf+';border-radius:5px;padding:7px;border:0.5px solid '+window._b+'"><div style="font-size:8px;color:'+window._t3+'">JOB ID</div><div style="font-size:13px;font-weight:500;color:#0C447C">'+_saEsc(t.jobId||'\u2014')+'</div><div style="font-size:8px;color:'+window._t3+'">'+(t.piNo?'PI: '+_saEsc(t.piNo):'\u2014')+'</div></div>';
  if (t.urunler && t.urunler.length > 1) {
    h += '</div><div style="margin-top:8px;border-top:0.5px solid '+window._b+';padding-top:8px"><div style="font-size:9px;color:'+window._t3+';font-weight:500;margin-bottom:4px">T\u00dcM \u00dcR\u00dcNLER ('+t.urunler.length+')</div>';
    t.urunler.forEach(function(u, i) {
      h += '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;border-bottom:0.5px solid '+window._b+'"><span style="color:'+window._t+'">'+(i+1)+'. '+_saEsc(u.urunAdi||u.duayKodu||'\u2014')+'</span><span style="color:'+window._t3+'">'+_saEsc(u.miktar||'')+' '+_saEsc(u.birim||'')+' \u00b7 '+_saEsc(u.toplam||'')+' '+_saEsc(u.para||'')+'</span></div>';
    });
    h += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:10px;font-weight:500"><span style="color:'+window._t+'">Toplam</span><span style="color:#0F6E56">'+_saEsc(t.toplamTutar||'')+' '+_saEsc(t.toplamPara||'')+'</span></div>';
  }
  h += '</div>';
  h += '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:5px;padding:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:#0C447C;margin-bottom:4px">SATIŞ TEKLİFİ HESABI → TEKLİFE İŞLENİR</div>';
  h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:9px;color:#185FA5;white-space:nowrap">Marj %</span>';
  h += '<input type="range" min="5" max="60" value="'+marj+'" id="sav2-marj-slider" oninput="event.stopPropagation();document.getElementById(\'sav2-marj-val\').textContent=\'%\'+this.value+\' → ₺\'+('+tl+'*(1+this.value/100)).toFixed(2)" style="flex:1">';
  h += '<span id="sav2-marj-val" style="font-size:11px;font-weight:500;color:#0C447C;white-space:nowrap">%'+marj+' → ₺'+satis+'</span></div>';
  h += '</div>';
  if (typeof window._steklifDurumPanelHTML === 'function') h += window._steklifDurumPanelHTML(t);
  if (typeof window._steklifOzetHTML === 'function') h += window._steklifOzetHTML(t);
  if (typeof window._steklifRevGecmisHTML === 'function') h += window._steklifRevGecmisHTML(t);
  var tumListe = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var _pkDuayKodu = (_saV2IlkUrun(t).duayKodu || t.duayKodu || '').trim();
  if (_pkDuayKodu) {
    var gecmis = tumListe.filter(function(x) {
      return !x.isDeleted && String(x.id) !== String(t.id) &&
        x.urunler && x.urunler.some(function(u) { return (u.duayKodu || '').trim() === _pkDuayKodu; });
    }).sort(function(a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; }).slice(0, 5);
    if (gecmis.length) {
      h += '<div style="padding:10px 14px;border-top:0.5px solid '+window._b+'">';
      h += '<div style="font-size:9px;font-weight:500;color:'+window._t3+';letter-spacing:.05em;margin-bottom:8px">F\u0130YAT GE\u00c7M\u0130\u015e\u0130 \u2014 '+_saEsc(_pkDuayKodu)+'</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:10px">';
      h += '<thead><tr style="background:'+window._s2+'"><th style="padding:4px 6px;text-align:left">Tarih</th><th style="padding:4px 6px;text-align:left">Tedarik\u00e7i</th><th style="padding:4px 6px;text-align:right">Fiyat</th><th style="padding:4px 6px;text-align:center">Durum</th></tr></thead><tbody>';
      gecmis.forEach(function(g) {
        var gu = g.urunler.find(function(u) { return (u.duayKodu || '').trim() === _pkDuayKodu; }) || {};
        var fiyat = gu.alisF || gu.birimFiyat || '\u2014';
        var para = gu.para || g.toplamPara || 'USD';
        var durum = g.durum || 'bekleyen';
        var durumRenk = durum === 'kabul' ? '#0F6E56' : durum === 'reddedildi' ? '#A32D2D' : '#854F0B';
        h += '<tr style="border-bottom:0.5px solid '+window._b+'">';
        h += '<td style="padding:4px 6px;color:'+window._t3+'">' + _saEsc((g.teklifTarih || g.createdAt || '\u2014').slice(0, 10)) + '</td>';
        h += '<td style="padding:4px 6px;color:'+window._t2+'">' + _saEsc(g.tedarikci || '\u2014') + '</td>';
        h += '<td style="padding:4px 6px;text-align:right;font-weight:500;color:'+window._t+'">' + _saEsc(fiyat) + ' ' + _saEsc(para) + '</td>';
        h += '<td style="padding:4px 6px;text-align:center"><span style="font-size:9px;padding:1px 6px;border-radius:8px;background:' + durumRenk + '22;color:' + durumRenk + '">' + _saEsc(durum) + '</span></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
  }
  h += '<div style="display:flex;flex-direction:column;gap:5px">';
  /* SA-PIPELINE-001c: sonraki aşamaya ilerle butonu */
  var _sonraki = window.SA_PIPELINE_STAGES?.[t.durum]?.sonraki;
  var _ilerleBtn = _sonraki ? '<button onclick="event.stopPropagation();window._saPipelineIlerle(\''+t.id+'\')" style="font-size:10px;padding:5px 12px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:'+window._t2+'">→ '+window.SA_PIPELINE_STAGES[_sonraki].label+'</button>' : '';
  if (_ilerleBtn) h += _ilerleBtn;
  if (t.durum==='bekleyen' || t.durum==='onaylandi') {
    if(_canSatisTeklif) h += '<button onclick="event.stopPropagation();window._saV2TeklifOlustur(\''+t.id+'\')" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit">Sat\u0131\u015f Teklifi Olu\u015ftur</button>';
  }
  h += '<button onclick="event.stopPropagation();window._saV2GoselYukle(\''+t.id+'\')" style="font-size:10px;padding:5px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">Görsel Yükle</button>';
  h += '<button onclick="event.stopPropagation();window._saV2Duzenle(\''+t.id+'\')" style="font-size:10px;padding:5px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">Düzenle</button>';
  h += '<button onclick="event.stopPropagation();window._saV2Kopyala(\''+t.id+'\')" style="font-size:10px;padding:5px;border:0.5px solid '+window._b+';border-radius:5px;background:transparent;cursor:pointer;color:'+window._t2+';font-family:inherit">Kopyala</button>';
  h += '<button onclick="event.stopPropagation();window._saV2Karsilastir(\''+_saEsc(_saV2DuayKodu(t))+'\')" style="font-size:10px;padding:5px;border:0.5px solid #185FA5;border-radius:5px;background:#E6F1FB;cursor:pointer;color:#185FA5;font-family:inherit">\u2194 Kar\u015f\u0131la\u015ft\u0131r</button>';
  h += '<button onclick="event.stopPropagation();window._saV2TekSil(\''+t.id+'\')" style="font-size:10px;padding:3px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>';
  h += '</div></div>';
  return h;
};

/* ── Seçim yönetimi ─────────────────────────────────────────── */
window._saV2ListeSecili = {};
window._saV2Sec = function(id, durum) {
  if (!window._saV2ListeSecili) window._saV2ListeSecili = {};
  window._saV2ListeSecili[id] = durum;
  window.renderSatinAlmaV2();
};
window._saV2TumSec = function(durum) {
  window._saV2ListeSecili = {};
  if (durum) {
    _saV2Load().forEach(function(t){ window._saV2ListeSecili[t.id] = true; });
  }
  window.renderSatinAlmaV2();
};

/* ── Onaya gönder ───────────────────────────────────────────── */
window._saV2OnayaGonder = function() {
  var secili = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  if (!secili.length) { window.toast?.('Önce seçim yapın','warn'); return; }
  var liste = _saV2Load();
  secili.forEach(function(id){
    var t = liste.find(function(x){return x.id===id;});
    if (t) { t.durum='onay_bekliyor'; t.updatedAt=_saNow(); }
  });
  _saV2Store(liste);
  window._saV2ListeSecili = {};
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

/* ── SA-V2-KOPYA-001: Teklif Kopyala ────────────────────────── */
window._saV2Kopyala = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) { window.toast?.('Teklif bulunamadı', 'warn'); return; }
  var yeni = JSON.parse(JSON.stringify(t));
  yeni.id = typeof window.generateId === 'function' ? window.generateId() : ('SA' + Date.now());
  yeni.teklifId = window._saTeklifId?.(t.musteriKod || '0000') || yeni.id;
  yeni.durum = 'bekleyen';
  yeni.revNo = '01';
  yeni.revGecmisi = [];
  yeni.guncellemeTalep = null;
  yeni.piNo = '';
  yeni.piTarih = '';
  yeni.createdAt = new Date().toISOString();
  yeni.updatedAt = new Date().toISOString();
  yeni.gonderimTarih = null;
  yeni.kabulTarih = null;
  yeni.redTarih = null;
  liste.unshift(yeni);
  window._saV2Store?.(liste);
  window.SAV2_AKT_ID = yeni.id;
  window.toast?.('Teklif kopyalandı — yeni ID: ' + yeni.teklifId, 'ok');
  window.renderSatinAlmaV2?.();
};

/* ── SAV2-LIST-002: Tek Sil + Toplu Sil ────────────────────── */
window._saV2TekSil = function(id) {
  if(!window.confirmModal) { if(!confirm('Bu teklif silinecek. Emin misin?')) return; }
  else { window.confirmModal('Teklif Sil', 'Bu teklif silinecek. Emin misin?', function(){ window._saV2TekSilYap(id); }); return; }
  window._saV2TekSilYap(id);
};

window._saV2TekSilYap = function(id) {
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var idx = liste.findIndex(function(t){return String(t.id)===String(id);});
  if(idx===-1){window.toast?.('Kayıt bulunamadı','err');return;}
  liste[idx].isDeleted = true;
  liste[idx].deletedAt = new Date().toISOString();
  liste[idx].deletedBy = window.CU?.()?.displayName||'';
  if(typeof window._saV2Store==='function') window._saV2Store(liste);
  window.toast?.('Teklif silindi','ok');
  window.renderSatinAlmaV2?.();
};

window._saV2TopluSil = function() {
  var secili = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  if(!secili.length){window.toast?.('Hiç teklif seçilmedi','warn');return;}
  var msg = secili.length+' teklif silinecek. Emin misin?';
  if(!window.confirmModal) { if(!confirm(msg)) return; window._saV2TopluSilYap(secili); }
  else { window.confirmModal('Toplu Sil', msg, function(){ window._saV2TopluSilYap(secili); }); }
};

window._saV2TopluSilYap = function(secili) {
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var now = new Date().toISOString();
  var kim = window.CU?.()?.displayName||'';
  liste.forEach(function(t){
    if(secili.indexOf(String(t.id))!==-1){
      t.isDeleted=true; t.deletedAt=now; t.deletedBy=kim;
    }
  });
  if(typeof window._saV2Store==='function') window._saV2Store(liste);
  window._saV2ListeSecili={};
  window.toast?.(secili.length+' teklif silindi','ok');
  window.renderSatinAlmaV2?.();
};

/**
 * SAV2-BULK-SATIS-REDESIGN-001: "Satış Teklifi Oluştur" butonu için akıllı handler.
 * Eğer hiç seçili teklif yoksa veya sadece tıklanan teklif seçiliyse, normal
 * tek-teklif akışı (_saV2TeklifOlustur) çalışır. Eğer 1+ seçili öğe varsa,
 * confirmModal ile "Seçili X teklifi forma eklemek istiyor musunuz?" sorulur.
 *   - Evet → window._saV2TopluFormAc(seciliIds) ile birleşmiş ürünlerle aç
 *   - Hayır → fallback: window._saV2TeklifOlustur(clickedId) tek-teklif akışı
 */
window._saV2TeklifOlusturAkilli = function(clickedId) {
  var seciliIds = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  // Seçim yok veya sadece tıklananın kendisi seçili → direkt tek-teklif
  if (!seciliIds.length || (seciliIds.length === 1 && String(seciliIds[0]) === String(clickedId))) {
    window._saV2TeklifOlustur?.(clickedId);
    return;
  }
  var msg = 'Seçili ' + seciliIds.length + ' teklifi forma eklemek istiyor musunuz?';
  var topluAc = function() { window._saV2TopluFormAc?.(seciliIds); };
  var tekAc = function() { window._saV2TeklifOlustur?.(clickedId); };
  if (typeof window.confirmModal === 'function') {
    window.confirmModal(msg, {
      title: 'Toplu Form',
      confirmText: 'Evet, Topluca',
      cancelText: 'Hayır, Sadece Bunu',
      onConfirm: topluAc,
      onCancel: tekAc
    });
  } else {
    if (confirm(msg)) topluAc(); else tekAc();
  }
};

/**
 * SAV2-BULK-SATIS-REDESIGN-001: Seçili satin alma teklifleri için
 * birleşmiş ürünlerle satış teklifi formunu aç. _saV2Load()'tan id'leri
 * bul, ürünleri birleştir, _saV2TeklifOlustur'a temp teklif id'si vererek
 * çağır (mevcut monkey-patch deseniyle: _saV2Load'u geçici override et,
 * temp teklif'i listenin başına ekle, _saV2TeklifOlustur(tempId), 5 sn
 * sonra restore).
 */
window._saV2TopluFormAc = function(ids) {
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var idStr = ids.map(String);
  var secili = liste.filter(function(t) { return idStr.indexOf(String(t.id)) !== -1 && !t.isDeleted; });
  if (!secili.length) { window.toast?.('Seçili teklif bulunamadı', 'err'); return; }
  // Tüm ürünleri birleştir — her biri kaynak teklif id + tedarikçi audit ile
  var birlesmisUrunler = [];
  secili.forEach(function(t) {
    var us = (t.urunler && t.urunler.length) ? t.urunler : [t];
    us.forEach(function(u) {
      birlesmisUrunler.push({
        urunAdi: u.urunAdi || u.turkceAdi || t.urunAdi || '',
        turkceAdi: u.turkceAdi || u.urunAdi || '',
        duayKodu: u.duayKodu || t.duayKodu || '',
        miktar: parseFloat(u.miktar) || 0,
        birim: u.birim || 'Adet',
        alisF: parseFloat(u.alisF || t.alisF) || 0,
        para: t.toplamPara || t.para || 'USD',
        kaynakTeklifId: t.id,
        kaynakTedarikci: t.tedarikci || ''
      });
    });
  });
  // Tüm seçililer aynı tedarikçideyse onu kullan, değilse boş
  var tedarikciler = secili.map(function(t){return t.tedarikci||'';}).filter(Boolean);
  var tekTedarikci = tedarikciler.length && tedarikciler.every(function(x){return x===tedarikciler[0];}) ? tedarikciler[0] : '';
  var tempId = 'tmp-bulk-' + Date.now();
  var tempTeklif = {
    id: tempId,
    urunler: birlesmisUrunler,
    tedarikci: tekTedarikci,
    jobId: '',
    teslimYeri: '',
    teslimMasraf: '',
    toplamPara: secili[0].toplamPara || secili[0].para || 'USD',
    toplamTutar: birlesmisUrunler.reduce(function(s,u){return s + ((u.miktar||0)*(u.alisF||0));}, 0),
    durum: 'taslak'
  };
  // _saV2Load monkey-patch — temp teklif'i listenin başına yerleştir
  var _eskiLoad = window._saV2Load;
  window._saV2Load = function() {
    var orig = (typeof _eskiLoad === 'function') ? _eskiLoad() : [];
    return [tempTeklif].concat(orig);
  };
  // Form'u aç
  if (typeof window._saV2TeklifOlustur === 'function') {
    window._saV2TeklifOlustur(tempId);
  } else {
    window.toast?.('_saV2TeklifOlustur tanımlı değil', 'err');
  }
  // Restore (modal render etmesine yetecek süre)
  setTimeout(function() { window._saV2Load = _eskiLoad; }, 5000);
};

/**
 * @deprecated SAV2-BULK-SATIS-REDESIGN-001 ile değiştirildi —
 * artık _saV2TeklifOlusturAkilli + _saV2TopluFormAc kullanılıyor.
 * Bu fonksiyon artık çağrılmıyor (button kaldırıldı), backward compat
 * için bırakıldı. Konsoldan veya başka modülden çağrılırsa hala çalışır.
 */
window._saV2BulkSatisEkle = function() {
  var seciliIds = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  if(!seciliIds.length){window.toast?.('Hiç teklif seçilmedi','warn');return;}
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var secili = liste.filter(function(t){return seciliIds.indexOf(String(t.id))!==-1 && !t.isDeleted;});
  if(!secili.length){window.toast?.('Seçili teklif bulunamadı','err');return;}
  var msg = 'Seçili '+secili.length+' teklifi satış teklifine eklemek istiyor musunuz?';
  var doIt = function(){
    var satisListe = typeof window.loadSatisTeklifleri === 'function' ? window.loadSatisTeklifleri() : [];
    var year = new Date().getFullYear();
    var sayac = satisListe.length;
    var nowIso = new Date().toISOString();
    var creator = (window.Auth && window.Auth.getCU && window.Auth.getCU()) || {};
    secili.forEach(function(alis){
      sayac++;
      var urunler = (alis.urunler && alis.urunler.length ? alis.urunler : [alis]).map(function(u){
        return {
          urunAdi: u.urunAdi || u.turkceAdi || alis.urunAdi || '',
          duayKodu: u.duayKodu || alis.duayKodu || '',
          miktar: parseFloat(u.miktar) || 0,
          birim: u.birim || 'Adet',
          alisF: parseFloat(u.alisF || alis.alisF) || 0,
          satisFiyat: parseFloat(u.alisF || alis.alisF) || 0,
          toplam: (parseFloat(u.miktar)||0) * (parseFloat(u.alisF || alis.alisF)||0),
          para: alis.toplamPara || alis.para || 'USD'
        };
      });
      var newEntry = {
        id: typeof generateNumericId === 'function' ? generateNumericId() : (Date.now() + sayac),
        teklifNo: 'STK-' + year + '-' + String(sayac).padStart(6, '0'),
        musteri: '— BELİRTİLECEK —',
        jobId: alis.jobId || '',
        urunler: urunler,
        paraBirimi: alis.toplamPara || alis.para || 'USD',
        toplamPara: alis.toplamPara || alis.para || 'USD',
        genelToplam: parseFloat(alis.toplamTutar) || urunler.reduce(function(s,u){return s+(u.toplam||0);},0),
        durum: 'taslak',
        createdAt: nowIso,
        createdBy: creator.name || '',
        createdById: creator.id,
        kaynakAlisV2Id: alis.id,
        kaynakTedarikci: alis.tedarikci || '',
        notlar: 'Satin Alma V2 teklifi #' + (alis.id || '?') + ' (tedarikçi: ' + (alis.tedarikci || '?') + ') üzerinden SAV2-LISTE-FIX-001 ile otomatik oluşturuldu'
      };
      satisListe.unshift(newEntry);
    });
    if(typeof window.storeSatisTeklifleri === 'function'){
      try { window.storeSatisTeklifleri(satisListe); } catch(e){ console.warn('[sav2-bulk] storeSatisTeklifleri hata:', e); }
    }
    window.toast?.(secili.length+' satış teklifi oluşturuldu — müşteri ataması bekleniyor','ok');
    window._saV2ListeSecili={};
    window.renderSatinAlmaV2?.();
    if(typeof window.renderSatisTeklifleri === 'function'){
      try { window.renderSatisTeklifleri(); } catch(e){}
    }
  };
  if(!window.confirmModal) { if(!confirm(msg)) return; doIt(); }
  else { window.confirmModal('Satış Teklifine Ekle', msg, doIt); }
};

/* ── SAV2-KARSILASTIR-001: Tedarikçi Karşılaştırma ─────────── */
window._saV2Karsilastir = function(duayKodu) {
  if (!duayKodu || duayKodu === '\u2014') { window.toast?.('\u00dcr\u00fcn kodu bulunamad\u0131', 'warn'); return; }
  var mevcut = document.getElementById('sav2-karsilastir-modal');
  if (mevcut) mevcut.remove();
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var eslesen = liste.filter(function(t) {
    if (t.isDeleted) return false;
    if (t.urunler && t.urunler.length) return t.urunler.some(function(u) { return (u.duayKodu || '').trim() === duayKodu; });
    return (t.duayKodu || '').trim() === duayKodu;
  }).sort(function(a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; });
  if (eslesen.length < 1) { window.toast?.('Bu \u00fcr\u00fcn i\u00e7in ba\u015fka teklif yok', 'info'); return; }
  var modal = document.createElement('div');
  modal.id = 'sav2-karsilastir-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:32px 0;overflow-y:auto';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var h = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:720px;max-height:80vh;overflow-y:auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  h += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Tedarik\u00e7i Kar\u015f\u0131la\u015ft\u0131rma</div>';
  h += '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + _saEsc(duayKodu) + ' \u2014 ' + eslesen.length + ' teklif</div></div>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-karsilastir-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">\u00d7</button></div>';
  h += '<div style="padding:16px 20px">';
  h += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
  h += '<thead><tr style="background:var(--s2);font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.05em">';
  h += '<th style="padding:6px 8px;text-align:left">TEDAR\u0130K\u00c7\u0130</th>';
  h += '<th style="padding:6px 8px;text-align:left">PI NO</th>';
  h += '<th style="padding:6px 8px;text-align:left">TAR\u0130H</th>';
  h += '<th style="padding:6px 8px;text-align:right">B\u0130R\u0130M F\u0130YAT</th>';
  h += '<th style="padding:6px 8px;text-align:right">M\u0130KTAR</th>';
  h += '<th style="padding:6px 8px;text-align:right">TOPLAM</th>';
  h += '<th style="padding:6px 8px;text-align:center">DURUM</th>';
  h += '</tr></thead><tbody>';
  var enDusuk = Infinity;
  eslesen.forEach(function(t) {
    var u = (t.urunler && t.urunler.length) ? t.urunler.find(function(x) { return (x.duayKodu || '').trim() === duayKodu; }) || t.urunler[0] : t;
    var fiyat = parseFloat(u.alisF || t.alisF) || 0;
    if (fiyat > 0 && fiyat < enDusuk) enDusuk = fiyat;
  });
  eslesen.forEach(function(t) {
    var u = (t.urunler && t.urunler.length) ? t.urunler.find(function(x) { return (x.duayKodu || '').trim() === duayKodu; }) || t.urunler[0] : t;
    var fiyat = parseFloat(u.alisF || t.alisF) || 0;
    var para = u.para || t.toplamPara || 'USD';
    var miktar = parseFloat(u.miktar || t.miktar) || 0;
    var toplam = (fiyat * miktar).toFixed(2);
    var enIyi = fiyat > 0 && fiyat === enDusuk;
    var durum = t.durum || 'bekleyen';
    var durumRenk = durum === 'onaylandi' ? '#0F6E56' : durum === 'reddedildi' ? '#A32D2D' : '#854F0B';
    h += '<tr style="border-bottom:0.5px solid var(--b);background:' + (enIyi ? '#F0FBF6' : 'transparent') + '">';
    h += '<td style="padding:8px;font-weight:500;color:var(--t)">' + _saEsc(t.tedarikci || '\u2014') + (enIyi ? ' <span style="font-size:8px;padding:1px 5px;border-radius:8px;background:#E1F5EE;color:#0F6E56">\u2605 En iyi</span>' : '') + '</td>';
    h += '<td style="padding:8px;color:var(--t3)">' + _saEsc(t.piNo || '\u2014') + '</td>';
    h += '<td style="padding:8px;color:var(--t3)">' + _saEsc((t.piTarih || t.createdAt || '\u2014').slice(0, 10)) + '</td>';
    h += '<td style="padding:8px;text-align:right;font-weight:500;color:' + (enIyi ? '#0F6E56' : 'var(--t)') + '">' + fiyat.toFixed(2) + ' ' + _saEsc(para) + '</td>';
    h += '<td style="padding:8px;text-align:right;color:var(--t3)">' + miktar + ' ' + _saEsc(u.birim || t.birim || '') + '</td>';
    h += '<td style="padding:8px;text-align:right;color:var(--t)">' + toplam + ' ' + _saEsc(para) + '</td>';
    h += '<td style="padding:8px;text-align:center"><span style="font-size:9px;padding:1px 6px;border-radius:8px;background:' + durumRenk + '22;color:' + durumRenk + '">' + _saEsc(durum) + '</span></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';
  modal.innerHTML = h;
  document.body.appendChild(modal);
};

/* ── SAV2-TOPLU-001: Toplu Onayla + Toplu Reddet ───────────── */
window._saV2TopluOnayla = function() {
  var secili = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  if(!secili.length){window.toast?.('Hiç teklif seçilmedi','warn');return;}
  window.confirmModal(secili.length+' teklif onaylanacak. Emin misin?',{confirmText:'Onayla',danger:false,onConfirm:function(){
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var now = new Date().toISOString();
  liste.forEach(function(t){
    if(secili.indexOf(String(t.id))!==-1){
      t.durum='kabul'; t.updatedAt=now; t.onayTarih=now;
      t.onayKisi=window.CU?.()?.displayName||'';
    }
  });
  if(typeof window._saV2Store==='function') window._saV2Store(liste);
  window._saV2ListeSecili={};
  window.toast?.(secili.length+' teklif onaylandı','ok');
  window.renderSatinAlmaV2?.();
  }});
};

window._saV2TopluReddet = function() {
  var secili = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  if(!secili.length){window.toast?.('Hiç teklif seçilmedi','warn');return;}
  window.confirmModal(secili.length+' teklif reddedilecek. Emin misin?',{confirmText:'Reddet',danger:true,onConfirm:function(){
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var now = new Date().toISOString();
  liste.forEach(function(t){
    if(secili.indexOf(String(t.id))!==-1){
      t.durum='reddedildi'; t.updatedAt=now; t.redTarih=now;
      t.redKisi=window.CU?.()?.displayName||'';
    }
  });
  if(typeof window._saV2Store==='function') window._saV2Store(liste);
  window._saV2ListeSecili={};
  window.toast?.(secili.length+' teklif reddedildi','ok');
  window.renderSatinAlmaV2?.();
  }});
};

/* ── SAV2-HATIRLATMA-001: 5 gün yanıtsız teklif otomatik uyarı ── */
window._saV2HatirlatmaKontrol = function() {
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var simdi = Date.now();
  var besGun = 5*24*60*60*1000;
  var uyarilar = liste.filter(function(t){
    if(t.isDeleted||t.durum==='kabul'||t.durum==='reddedildi') return false;
    var tarih = t.gonderimTarih||t.updatedAt||t.createdAt||'';
    if(!tarih) return false;
    var gecen = simdi - new Date(tarih).getTime();
    return gecen > besGun;
  });
  if(!uyarilar.length) return;
  var bildirimKey = 'sav2_hatirlatma_'+new Date().toISOString().slice(0,10);
  if(localStorage.getItem(bildirimKey)) return;
  localStorage.setItem(bildirimKey, '1');
  uyarilar.forEach(function(t){
    var urunAdi = _saV2UrunAdi(t)||'Ürün';
    window.addNotif?.({
      tip: 'uyari',
      baslik: 'Yanıtsız Teklif — '+urunAdi,
      mesaj: (t.tedarikci||'Tedarikçi')+' teklifine 5+ gün yanıt yok. Takip et.',
      link: 'satinalma',
      tarih: new Date().toISOString()
    });
  });
  if(uyarilar.length>0) window.toast?.(uyarilar.length+' teklif 5 günden fazladır yanıtsız','warn');
};

/* ── SAV2-EXPORT-001: CSV Export ────────────────────────────── */
window._saV2ExportCSV = function() {
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var secili = Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];});
  var kayitlar = secili.length ? liste.filter(function(t){return secili.indexOf(String(t.id))!==-1;}) : liste.filter(function(t){return !t.isDeleted;});
  if(!kayitlar.length){window.toast?.('Dışa aktarılacak kayıt yok','warn');return;}
  var satirlar = [['Teklif ID','Tedarikci','Job ID','PI No','PI Tarih','Teklif Tarih','Urun Adi','Duay Kodu','Miktar','Birim','Birim Fiyat','Para','Toplam','Teslim Yeri','Teslim Masraf','Durum','Olusturan','Olusturma Tarihi']];
  kayitlar.forEach(function(t){
    var urunler = t.urunler&&t.urunler.length ? t.urunler : [t];
    urunler.forEach(function(u,i){
      satirlar.push([
        i===0?(t.id||''):'',
        i===0?(t.tedarikci||''):'',
        i===0?(t.jobId||''):'',
        i===0?(t.piNo||''):'',
        i===0?(t.piTarih||''):'',
        i===0?(t.teklifTarih||''):'',
        u.urunAdi||u.turkceAdi||'',
        u.duayKodu||'',
        u.miktar||'',
        u.birim||'',
        u.alisF||u.birimFiyat||'',
        u.para||'USD',
        u.toplam||'',
        i===0?(t.teslimYeri||''):'',
        i===0?(t.teslimMasraf||''):'',
        i===0?(t.durum||'bekleyen'):'',
        i===0?(t.createdBy||''):'',
        i===0?(t.createdAt||'').slice(0,10):''
      ]);
    });
  });
  var csv = satirlar.map(function(r){
    return r.map(function(c){
      var s=String(c||'').replace(/"/g,'""');
      return s.indexOf(',')!==-1||s.indexOf('"')!==-1||s.indexOf('\n')!==-1?'"'+s+'"':s;
    }).join(',');
  }).join('\n');
  var bom = '\uFEFF';
  var blob = new Blob([bom+csv],{type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href=url; a.download='alis_teklifleri_'+(new Date().toISOString().slice(0,10))+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.toast?.(kayitlar.length+' kayıt export edildi','ok');
};

/**
 * SAV2-ROW-MENU-001
 * Alış teklif satırından detay panelini açar — teklifin id'si ile
 * _saV2AktifId set edilir ve renderSatinAlmaV2 çağrılarak sağ panelde
 * _saV2DetayHTML render olur.
 * @param {string|number} id Alış teklif id'si
 */
window._saV2RowMenu = function(id) {
  if (id == null) return;
  var liste = typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) { window.toast?.('Teklif bulunamadı', 'warn'); return; }
  window._saV2AktifId = String(id);
  if (typeof window.renderSatinAlmaV2 === 'function') window.renderSatinAlmaV2();
};

console.log('[SAV2-RENDER] v2.0 y\u00fcklendi');
