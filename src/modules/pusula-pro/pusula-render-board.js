/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-render-board.js — V170.3.9 POPULATE
   Sorumluluk: Takvim/Ödeme/Abonelik panel render + helper'lar
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-RENDER-BOARD-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       _ppTakvimSonrakiHesapla    L2122-2172  Periyodik etkinlik next-date
       _ppTakvimHatirlatmaKontrol L2174-2188  Hatırlatma scan
       _ppTakvimBaslat            L2227-2267  Boot
       _ppTakvimPanelRender       L2278-2402  Panel ana render
       _ppTakAyOnce/Sonra/Bugun   L2405-2431  Ay navigasyonu
       _ppTakGunTikla             L2432-2508  Gün cell tıklama
       _ppTakEtkinlikAc           L2509-2531  Etkinlik detay
       _ppOdemeBaslat             L2778-2788  Ödeme boot
       _ppAbonelikBaslat          L2790-2798  Abonelik boot
       _ppOdemePanelRender        L2802-2844  Ödeme panel
       _ppAbonelikPanelRender     L2859-2901  Abonelik panel
       _ppTakvimCSVImport         L3589-3643  CSV içe aktarma
       _ppTakvimJSONImport        L3646-3701  JSON içe aktarma
       _ppTakvimHatirlaticiKontrol L3946-3966 Hatırlatıcı kontrol
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.renderBoard (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ KX10: PP_TAKVIM_KEY + _ppTakvimLoad/Store store.js'te (Cycle 3.2.4) — DUPLICATE YOK
   ⚠ Bağımlılık: window._ppTakvimLoad/Store (store ✓ Cycle 3.2.4)
                 window._ppOdemeLoad/Store, _ppAbonelikLoad/Store (store ✓)
                 window._ppEsc, _ppNow, _ppToday, _ppId, _ppCu (core ✓)
                 window._ppEmptyState (core ✓)
                 window.toast (global)
                 window._ppTakAy (state, actions tarafından set)
   ⚠ DOM: panel-pusula-pro body, takvim grid hücreleri
   ⚠ ATLANANLAR:
       _ppTakvimYeniAc, _ppTakvimFormKaydet → modal-template (Cycle 3.2.12)
       _ppTakvimTamamla, _ppTakvimSil       → actions (Cycle 3.2.13)
       _ppOdemeYeniAc, _ppOdemeSil          → modal-payment (Cycle 3.2.11)
       _ppAbonelikYeniAc, _ppAbonelikSil    → modal-payment
       _ppOdeme*Modal*                      → modal-payment
   ⚠ V175+ NOT: _ppTakvimCSVImport/JSONImport → sync.js'e taşıma adayı
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.renderBoard) window.PusulaPro.renderBoard = {};
  if (window._ppRenderBoardLoaded) return;
  window._ppRenderBoardLoaded = true;

window._ppTakvimSonrakiHesapla = function(olay) {
  var bugun = new Date();
  var pd = (olay.periyotDetay||'').toLowerCase();
  var periyot = (olay.periyot||'').toLowerCase();
  try {
    if (periyot==='günlük'||periyot==='gunluk') {
      var d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d.toISOString().slice(0,10);
    }
    if (periyot==='haftalık'||periyot==='haftalik') {
      var gunler = {pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cuma:5,cumartesi:6,pazar:0};
      for (var g in gunler) { if (pd.indexOf(g)!==-1) { var hedef=gunler[g]; var d2=new Date(); var cur=d2.getDay(); var delta=(hedef-cur+7)%7||7; d2.setDate(d2.getDate()+delta); d2.setHours(9,0,0,0); return d2.toISOString().slice(0,10); } }
    }
    if (periyot==='aylık'||periyot==='aylik') {
      var m = pd.match(/(\d+)\.\s*g[üu]n/i); if(m){ var gun=parseInt(m[1]); var d3=new Date(); d3.setDate(gun); if(d3<=bugun) d3.setMonth(d3.getMonth()+1); d3.setHours(9,0,0,0); return d3.toISOString().slice(0,10); }
      var dowMap = {pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cuma:5,cumartesi:6,pazar:0};
      var mNDow = pd.match(/(\d+)\.\s*([a-zçğışöü]+)/i);
      if (mNDow) {
        var nth = parseInt(mNDow[1]);
        var dowAd = mNDow[2].toLowerCase().replace('ş','s').replace('ğ','g').replace('ü','u').replace('ö','o').replace('ı','i').replace('ç','c');
        var dow = dowMap[dowAd] !== undefined ? dowMap[dowAd] : -1;
        if (dow >= 0) {
          var now2 = new Date();
          for (var ay2=0; ay2<3; ay2++) {
            var y2=now2.getFullYear(), m3=now2.getMonth()+ay2;
            if (m3>11){ m3-=12; y2++; }
            var first=new Date(y2,m3,1); var firstDow=first.getDay();
            var delta2=(dow-firstDow+7)%7; var day2=1+delta2+(nth-1)*7;
            var cand2=new Date(y2,m3,day2); cand2.setHours(9,0,0,0);
            if (cand2.getMonth()===m3 && cand2>new Date()) { return cand2.toISOString().slice(0,10); }
          }
        }
      }
      var mHafta = pd.match(/(\d+)\.\s*hafta/i);
      if (mHafta) {
        var nthH = parseInt(mHafta[1]);
        var now3 = new Date();
        for (var ay3=0; ay3<3; ay3++) {
          var y3=now3.getFullYear(), m4=now3.getMonth()+ay3;
          if (m4>11){ m4-=12; y3++; }
          var d6=new Date(y3,m4,1+(nthH-1)*7); d6.setHours(9,0,0,0);
          if (d6.getMonth()===m4 && d6>new Date()) { return d6.toISOString().slice(0,10); }
        }
      }
      var m2 = pd.match(/ayın son/i); if(m2){ var d4=new Date(); d4.setMonth(d4.getMonth()+1,0); d4.setHours(17,0,0,0); return d4.toISOString().slice(0,10); }
    }
    if (periyot==='yıllık'||periyot==='yillik') {
      var d5=new Date(); d5.setFullYear(d5.getFullYear()+1); d5.setMonth(0,15); d5.setHours(9,0,0,0); return d5.toISOString().slice(0,10);
    }
  } catch(e) { console.warn('[PP]', e); }
  return null;
};

window._ppTakvimHatirlatmaKontrol = function() {
  var olaylar = _ppTakvimLoad().filter(function(o){ return o.durum==='active' && !o.isDeleted; });
  var bugun = _ppToday();
  var uyarilar = [];
  olaylar.forEach(function(o) {
    var sonraki = o.sonrakiCalisma || window._ppTakvimSonrakiHesapla(o);
    if (!sonraki) return;
    var kalan = Math.ceil((new Date(sonraki) - new Date(bugun)) / 86400000);
    var hatirlatma = parseInt(o.hatirlatmaGun||3);
    if (kalan >= 0 && kalan <= hatirlatma) {
      uyarilar.push({ olay:o, sonraki:sonraki, kalan:kalan });
    }
  });
  return uyarilar;
};
window._ppTakvimBaslat = function() {
  var mevcut = _ppTakvimLoad();
  var guncellendi = false;
  mevcut.forEach(function(o) {
    if (!o.sonrakiCalisma) {
      o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o) || null;
      if (o.sonrakiCalisma) guncellendi = true;
    }
  });
  if (guncellendi) { _ppTakvimStore(mevcut); console.log('[PP-TAKVIM] sonrakiCalisma güncellendi'); }
  if (mevcut.length > 0) return;
  var baslangic = [
    { id:'TAK-001', baslik:'Aylık Ödeme Raporu', kategori:'MUHASEBE', periyot:'Aylık', periyotDetay:'Her ayın 1. Pazartesi 10:00', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-002', baslik:'SGK Bildirimi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın 23. günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-003', baslik:'Muhtasar Beyanname', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 26. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-004', baslik:'KDV Beyannamesi', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 28. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-005', baslik:'Maaş Ödemeleri', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın son iş günü', sorumluUnvan:'İK / Muhasebe', oncelik:'Kritik', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-006', baslik:'Haftalık Operasyon Toplantısı', kategori:'YÖNETİM', periyot:'Haftalık', periyotDetay:'Her Pazartesi 10:00', sorumluUnvan:'Operasyon Müdürü', oncelik:'Normal', hatirlatmaGun:1, durum:'active', createdAt:_ppNow() },
    { id:'TAK-007', baslik:'Sigorta Poliçe Kontrolü', kategori:'SİGORTA', periyot:'Aylık', periyotDetay:'Her ayın 1. haftası', sorumluUnvan:'Operasyon Yöneticisi', oncelik:'Normal', hatirlatmaGun:7, durum:'active', createdAt:_ppNow() },
    { id:'TAK-008', baslik:'Yıllık Bağımsız Denetim', kategori:'HUKUKİ', periyot:'Yıllık', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Genel Müdür', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-009', baslik:'Geçici Vergi Beyannamesi Q1', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Mayıs ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-010', baslik:'Geçici Vergi Beyannamesi Q2', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Ağustos ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-011', baslik:'Geçici Vergi Beyannamesi Q3', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Kasım ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-012', baslik:'Yıllık Gelir Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Mart ayı 31. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-013', baslik:'Yıllık Kurumlar Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Nisan ayı 30. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-014', baslik:'Ba-Bs Formu (Alış/Satış Bildirimi)', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın son günü', sorumluUnvan:'Muhasebe', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-015', baslik:'Damga Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 26. günü', sorumluUnvan:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-016', baslik:'SGK Prim Ödemesi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın son günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-017', baslik:'İşsizlik Sigortası Bildirimi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın 23. günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Yüksek', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-018', baslik:'Muavin Defter Kontrol Q1', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Nisan ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-019', baslik:'Muavin Defter Kontrol Q2', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Temmuz ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-020', baslik:'Muavin Defter Kontrol Q3', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Ekim ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-021', baslik:'Muavin Defter Kontrol Q4', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-022', baslik:'İhracat Teşvik Başvurusu', kategori:'Operasyon', periyot:'Her 3 Ayda 1', periyotDetay:'Çeyrek sonu son iş günü', sorumluUnvan:'Operasyon Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-023', baslik:'Ticaret Sicil Yıllık Tescil', kategori:'HUKUKİ', periyot:'Yıllık', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Genel Müdür', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-024', baslik:'İş Sağlığı ve Güvenliği Eğitimi', kategori:'İK', periyot:'Yıllık', periyotDetay:'Her yılın Haziran ayı', sorumluUnvan:'İnsan Kaynakları', oncelik:'Normal', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() }
  ];
  baslangic.forEach(function(o){ o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o)||null; });
  _ppTakvimStore(baslangic);
  console.log('[PP-TAKVIM] '+baslangic.length+' başlangıç kaydı yüklendi');
};
window._ppTakvimPanelRender = function(body) {
  if (!body) return;
  // Migration: eski 'etkinlik'/'klasik' sekme → 'takvim'
  if (window._ppTakSekme === 'etkinlik' || window._ppTakSekme === 'klasik') {
    window._ppTakSekme = 'takvim';
  }
  var sekme = window._ppTakSekme || 'takvim';
  var katRenk = { MUHASEBE:'var(--pp-info)', 'İK':'#1D9E75', 'VERGİ':'var(--pp-err)', 'SİGORTA':'var(--pp-warn)', 'YÖNETİM':'#534AB7', 'HUKUKİ':'#888780', 'LOJİSTİK':'#0F6E56', 'OPERASYON':'var(--pp-warn)', 'TOPLANTI':'#534AB7', 'SON TARİH':'var(--pp-err)', 'TATİL':'#1D9E75', 'GÖREV':'var(--pp-info)', 'KİŞİSEL':'#888780', 'DİĞER':'#888780' };
  var katBg = { MUHASEBE:'#E6F1FB', 'İK':'#E1F5EE', 'VERGİ':'#FCEBEB', 'SİGORTA':'#FAEEDA', 'YÖNETİM':'#EEEDFE', 'HUKUKİ':'#F1EFE8', 'LOJİSTİK':'#E1F5EE', 'OPERASYON':'#FAEEDA', 'TOPLANTI':'#EEEDFE', 'SON TARİH':'#FCEBEB', 'TATİL':'#E1F5EE', 'GÖREV':'#E6F1FB', 'KİŞİSEL':'#F1EFE8', 'DİĞER':'#F1EFE8' };
  var _sekmeBtn = function(id, lbl) {
    var aktif = sekme === id;
    return '<button onclick="event.stopPropagation();window._ppTakSekme=\'' + id + '\';window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:' + (aktif ? 'var(--t)' : 'transparent') + ';color:' + (aktif ? 'var(--sf)' : 'var(--t2)') + ';cursor:pointer;font-family:inherit">' + lbl + '</button>';
  };
  var hBase = '<div style="display:flex;flex-direction:column;height:100%;flex:1">';
  hBase += '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:0.5px solid var(--b);flex-shrink:0;flex-wrap:wrap">';
  hBase += '<div style="display:flex;gap:3px;margin-right:8px">';
  hBase += _sekmeBtn('takvim', 'Takvim');
  hBase += _sekmeBtn('odeme', 'Ödemeler');
  hBase += _sekmeBtn('abonelik', 'Abonelikler');
  hBase += '</div>';
  if (sekme === 'odeme' || sekme === 'abonelik') {
    var hBranch = hBase;
    hBranch += '<button onclick="event.stopPropagation();window._ppTakvimYeniAc()" style="font-size:var(--pp-meta);padding:4px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Etkinlik</button>';
    hBranch += '</div>';
    if (sekme === 'odeme') { window._ppOdemePanelRender(body, hBranch); return; }
    if (sekme === 'abonelik') { window._ppAbonelikPanelRender(body, hBranch); return; }
  }
  if (!(window._ppTakAy instanceof Date)) {
    window._ppTakAy = new Date();
    window._ppTakAy.setDate(1);
  }
  var cur = new Date(window._ppTakAy);
  cur.setDate(1);
  var yil = cur.getFullYear();
  var ay = cur.getMonth();
  var AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var h = hBase;
  h += '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">';
  h += '<button onclick="event.stopPropagation();window._ppTakAyOnce()" style="font-size:14px;padding:2px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;line-height:1">‹</button>';
  h += '<span style="font-size:13px;font-weight:500;min-width:130px;text-align:center;color:var(--t)">' + AY_ADLARI[ay] + ' ' + yil + '</span>';
  h += '<button onclick="event.stopPropagation();window._ppTakAySonra()" style="font-size:14px;padding:2px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;line-height:1">›</button>';
  h += '<button onclick="event.stopPropagation();window._ppTakBugun()" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;margin-left:4px">Bugün</button>';
  h += '<button onclick="event.stopPropagation();window._ppTakvimYeniAc()" style="font-size:var(--pp-meta);padding:4px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500;margin-left:8px">+ Etkinlik</button>';
  h += '</div>';
  h += '</div>';
  var pusulaOlaylar = (typeof _ppTakvimLoad === 'function' ? _ppTakvimLoad() : []).filter(function(o) { return !o.isDeleted; });
  var mainCal = (typeof window.loadCalendar === 'function') ? window.loadCalendar() : [];
  if (!Array.isArray(mainCal)) mainCal = [];
  mainCal = mainCal.filter(function(c) { return !c.isDeleted; });
  var _ownEsc = (typeof _ppEsc === 'function') ? _ppEsc : function(s) { return String(s == null ? '' : s); };
  var gunOlaylariTopla = function(dateStr) {
    var result = [];
    pusulaOlaylar.forEach(function(o) {
      var tarih = '';
      if (o.sonrakiCalisma) tarih = String(o.sonrakiCalisma).slice(0, 10);
      else if (typeof window._ppTakvimSonrakiHesapla === 'function') {
        var _hT = window._ppTakvimSonrakiHesapla(o);
        if (_hT) tarih = String(_hT).slice(0, 10);
      }
      if (!tarih && o.basTarih) tarih = String(o.basTarih).slice(0, 10);
      if (tarih === dateStr) {
        result.push({ kaynak: 'pusula', id: o.id, baslik: o.baslik || 'Etkinlik', kategori: (o.kategori || 'DİĞER').toUpperCase() });
      }
    });
    mainCal.forEach(function(c) {
      var tarih = String(c.date || c.tarih || '').slice(0, 10);
      if (tarih === dateStr) {
        result.push({ kaynak: 'main', id: c.id, baslik: c.title || c.baslik || c.name || 'Etkinlik', kategori: (c.kategori || c.category || 'DİĞER').toUpperCase() });
      }
    });
    return result;
  };
  var now = new Date();
  var bugunStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  var ilkGun = new Date(yil, ay, 1);
  var sonGun = new Date(yil, ay + 1, 0).getDate();
  var ilkGunIdx = ilkGun.getDay();
  var ofset = (ilkGunIdx === 0) ? 6 : ilkGunIdx - 1;
  var gunAdlari = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--s2);border-bottom:0.5px solid var(--b);flex-shrink:0">';
  gunAdlari.forEach(function(ga, i) {
    var isHS = i >= 5;
    h += '<div style="text-align:center;font-size:var(--pp-meta);font-weight:700;color:' + (isHS ? 'var(--pp-err)' : 'var(--t3)') + ';padding:6px 0;letter-spacing:.04em">' + ga + '</div>';
  });
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1;overflow-y:auto">';
  var onceAySonGun = new Date(yil, ay, 0).getDate();
  for (var oi = 0; oi < ofset; oi++) {
    var onceGun = onceAySonGun - ofset + oi + 1;
    h += '<div style="min-height:80px;border-right:0.5px solid var(--b);border-bottom:0.5px solid var(--b);padding:4px;background:var(--s2);opacity:0.4"><div style="font-size:var(--pp-body);color:var(--t3);padding:2px 4px">' + onceGun + '</div></div>';
  }
  for (var gun = 1; gun <= sonGun; gun++) {
    var dateStr = yil + '-' + String(ay+1).padStart(2,'0') + '-' + String(gun).padStart(2,'0');
    var isToday = dateStr === bugunStr;
    var hafIdx = (ofset + gun - 1) % 7;
    var isHafSon = hafIdx >= 5;
    var olaylar = gunOlaylariTopla(dateStr);
    var bgRest = isHafSon ? 'rgba(163,45,45,0.02)' : 'transparent';
    h += '<div onclick="event.stopPropagation();window._ppTakGunTikla(\'' + dateStr + '\')" style="min-height:80px;border-right:0.5px solid var(--b);border-bottom:0.5px solid var(--b);padding:4px;cursor:pointer;background:' + bgRest + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + bgRest + '\'">';
    if (isToday) {
      h += '<div style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--pp-info);color:#fff;font-size:var(--pp-body);font-weight:600;margin-bottom:2px">' + gun + '</div>';
    } else {
      h += '<div style="font-size:var(--pp-body);color:' + (isHafSon ? 'var(--pp-err)' : 'var(--t2)') + ';padding:2px 4px;font-weight:' + (isHafSon ? '500' : '400') + '">' + gun + '</div>';
    }
    var maxOl = 3;
    olaylar.slice(0, maxOl).forEach(function(e) {
      var kr = katRenk[e.kategori] || '#888780';
      var kb = katBg[e.kategori] || '#F1EFE8';
      h += '<div onclick="event.stopPropagation();window._ppTakEtkinlikAc(\'' + e.kaynak + '\',\'' + (e.id || '') + '\')" style="font-size:var(--pp-meta);padding:2px 5px;margin-top:2px;border-radius:3px;background:' + kb + ';color:' + kr + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;border-left:2px solid ' + kr + '" title="' + _ownEsc(e.baslik) + '">' + _ownEsc(e.baslik) + '</div>';
    });
    if (olaylar.length > maxOl) {
      h += '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px;padding-left:4px">+' + (olaylar.length - maxOl) + ' daha</div>';
    }
    h += '</div>';
  }
  var dolu = ofset + sonGun;
  var kalan = (7 - (dolu % 7)) % 7;
  for (var sk = 1; sk <= kalan; sk++) {
    h += '<div style="min-height:80px;border-right:0.5px solid var(--b);border-bottom:0.5px solid var(--b);padding:4px;background:var(--s2);opacity:0.4"><div style="font-size:var(--pp-body);color:var(--t3);padding:2px 4px">' + sk + '</div></div>';
  }
  h += '</div>';
  h += '</div>';
  /* XSS-RISK: _esc() zorunlu */
  body.innerHTML = h;
};

/** PUSULA-TAKVIM-REDESIGN-001: ay navigasyonu helper'ları */
window._ppTakAyOnce = function() {
  if (!(window._ppTakAy instanceof Date)) window._ppTakAy = new Date();
  window._ppTakAy.setDate(1);
  window._ppTakAy.setMonth(window._ppTakAy.getMonth() - 1);
  var body = document.getElementById('pp-body');
  if (body) window._ppTakvimPanelRender(body);
};
window._ppTakAySonra = function() {
  if (!(window._ppTakAy instanceof Date)) window._ppTakAy = new Date();
  window._ppTakAy.setDate(1);
  window._ppTakAy.setMonth(window._ppTakAy.getMonth() + 1);
  var body = document.getElementById('pp-body');
  if (body) window._ppTakvimPanelRender(body);
};
window._ppTakBugun = function() {
  window._ppTakAy = new Date();
  window._ppTakAy.setDate(1);
  var body = document.getElementById('pp-body');
  if (body) window._ppTakvimPanelRender(body);
};
/**
 * PUSULA-TAKVIM-GUN-001
 * Bir gün hücresine tıklanınca direkt yeni etkinlik formu açmak yerine
 * o günün etkinliklerini özet bir popup içinde göster. Kullanıcı o günü
 * "incelerken" hem mevcut etkinlikleri görüyor hem tek tıkta yenisini
 * ekleyebiliyor — Apple Calendar benzeri akış.
 */
window._ppTakGunTikla = function(dateStr) {
  // Mevcut popup varsa kaldır
  var eski = document.getElementById('pptak-gun-popup');
  if (eski) eski.remove();

  // O güne ait etkinlikleri birleştir (pusula takvim + ana loadCalendar)
  var pusulaOlaylar = (typeof _ppTakvimLoad === 'function') ? _ppTakvimLoad().filter(function(o){return !o.isDeleted;}) : [];
  var mainCal = (typeof window.loadCalendar === 'function') ? window.loadCalendar() : [];
  if (!Array.isArray(mainCal)) mainCal = [];
  mainCal = mainCal.filter(function(c){return !c.isDeleted;});
  var olaylar = [];
  pusulaOlaylar.forEach(function(o) {
    var tarih = '';
    if (o.sonrakiCalisma) tarih = String(o.sonrakiCalisma).slice(0,10);
    else if (typeof window._ppTakvimSonrakiHesapla === 'function') {
      var _hT = window._ppTakvimSonrakiHesapla(o);
      if (_hT) tarih = String(_hT).slice(0,10);
    }
    if (!tarih && o.basTarih) tarih = String(o.basTarih).slice(0,10);
    if (tarih === dateStr) {
      olaylar.push({ kaynak:'pusula', id:o.id, baslik:o.baslik||'Etkinlik', kategori:(o.kategori||'DİĞER').toUpperCase() });
    }
  });
  mainCal.forEach(function(c) {
    var tarih = String(c.date||c.tarih||'').slice(0,10);
    if (tarih === dateStr) {
      olaylar.push({ kaynak:'main', id:c.id, baslik:c.title||c.baslik||c.name||'Etkinlik', kategori:(c.kategori||c.category||'DİĞER').toUpperCase() });
    }
  });

  // Tıklanan gün hücresini bul
  var hucre = document.querySelector('[onclick*="'+dateStr+'"]');
  if (!hucre) return;

  // Tarih başlığı (13 Nisan)
  var aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var dObj = new Date(dateStr);
  var baslikStr = dObj.getDate() + ' ' + aylar[dObj.getMonth()];

  // Kategori renk haritası (_ppTakvimPanelRender closure ile aynı)
  var katRenk = { MUHASEBE:'var(--pp-info)', 'İK':'#1D9E75', 'VERGİ':'var(--pp-err)', 'SİGORTA':'var(--pp-warn)', 'YÖNETİM':'#534AB7', 'HUKUKİ':'#888780', 'LOJİSTİK':'#0F6E56', 'OPERASYON':'var(--pp-warn)', 'TOPLANTI':'#534AB7', 'SON TARİH':'var(--pp-err)', 'TATİL':'#1D9E75', 'GÖREV':'var(--pp-info)', 'KİŞİSEL':'#888780', 'DİĞER':'#888780' };
  var katBg = { MUHASEBE:'#E6F1FB', 'İK':'#E1F5EE', 'VERGİ':'#FCEBEB', 'SİGORTA':'#FAEEDA', 'YÖNETİM':'#EEEDFE', 'HUKUKİ':'#F1EFE8', 'LOJİSTİK':'#E1F5EE', 'OPERASYON':'#FAEEDA', 'TOPLANTI':'#EEEDFE', 'SON TARİH':'#FCEBEB', 'TATİL':'#E1F5EE', 'GÖREV':'#E6F1FB', 'KİŞİSEL':'#F1EFE8', 'DİĞER':'#F1EFE8' };
  var esc = window._esc || function(s){return String(s==null?'':s);};

  // Popup HTML
  var popup = document.createElement('div');
  popup.id = 'pptak-gun-popup';
  var rect = hucre.getBoundingClientRect();
  popup.style.cssText = 'position:absolute;left:'+(rect.left + window.scrollX)+'px;top:'+(rect.bottom + window.scrollY + 4)+'px;min-width:220px;max-width:300px;background:var(--sf);border:1px solid var(--b);border-radius:var(--pp-r-md);box-shadow:0 6px 20px rgba(0,0,0,.12);z-index:1000;padding:12px;font-family:inherit';
  var iH = '<div style="font-size:13px;font-weight:700;color:var(--t);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">'+esc(baslikStr)+'</div>';
  if (!olaylar.length) {
    iH += '<div style="font-size:var(--pp-body);color:var(--t3);padding:10px 0;text-align:center">Bu gün etkinlik yok</div>';
  } else {
    olaylar.forEach(function(e) {
      var kr = katRenk[e.kategori] || '#888780';
      var kb = katBg[e.kategori] || '#F1EFE8';
      iH += '<div onclick="event.stopPropagation();document.getElementById(\'pptak-gun-popup\')?.remove();window._ppTakEtkinlikAc?.(\''+e.kaynak+'\',\''+(e.id||'')+'\')" style="font-size:var(--pp-body);padding:6px 10px;margin-bottom:5px;border-radius:var(--pp-r-sm);background:'+kb+';color:'+kr+';cursor:pointer;border-left:3px solid '+kr+';font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(e.baslik)+'">'+esc(e.baslik)+'</div>';
    });
  }
  iH += '<button onclick="event.stopPropagation();document.getElementById(\'pptak-gun-popup\')?.remove();window._ppTakvimYeniAc?.();setTimeout(function(){var el=document.getElementById(\'pptak-basTarih\');if(el)el.value=\''+dateStr+'\';},120)" style="width:100%;font-size:var(--pp-body);padding:7px;border:0.5px dashed var(--b);border-radius:var(--pp-r-sm);background:transparent;color:var(--t2);cursor:pointer;font-family:inherit;margin-top:6px">+ Yeni Etkinlik</button>';
  /* XSS-RISK: _esc() zorunlu */
  popup.innerHTML = iH;
  document.body.appendChild(popup);

  // Dışarı tıklayınca kapat — spec'te once:true dendi ama once:true inside
  // click'te listener kaybolup sonraki outside click'i yakalayamadığı için
  // self-removing pattern (persistent listener + removeEventListener) daha
  // güvenilir. setTimeout 10ms — popup'ı açan click'in kendi bubbling'ini kaçır.
  setTimeout(function() {
    var _gizle = function(ev) {
      if (popup.contains(ev.target)) return;
      popup.remove();
      document.removeEventListener('click', _gizle);
    };
    document.addEventListener('click', _gizle);
  }, 10);
};
window._ppTakEtkinlikAc = function(kaynak, id) {
  if (kaynak === 'pusula') {
    var liste = (typeof _ppTakvimLoad === 'function') ? _ppTakvimLoad() : [];
    var o = liste.find(function(x) { return String(x.id) === String(id); });
    if (!o) return;
    var parts = [o.baslik];
    if (o.kategori) parts.push(o.kategori);
    if (o.periyot) parts.push(o.periyot);
    if (o.sorumluUnvan) parts.push(o.sorumluUnvan);
    window.toast?.(parts.join(' · '), 'info');
    return;
  }
  if (kaynak === 'main') {
    var cal = (typeof window.loadCalendar === 'function') ? window.loadCalendar() : [];
    var c = cal.find(function(x) { return String(x.id) === String(id); });
    if (!c) return;
    var parts2 = [c.title || c.baslik || c.name || 'Etkinlik'];
    if (c.kategori || c.category) parts2.push(c.kategori || c.category);
    if (c.date || c.tarih) parts2.push(String(c.date || c.tarih).slice(0, 10));
    window.toast?.(parts2.join(' · '), 'info');
  }
};

window._ppOdemeBaslat = function() {
  if (_ppOdemeLoad().length > 0) return;
  var odemeler = [
    { id:'OD-001', baslik:'Ofis Kirası', kategori:'Kira', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 1. günü', sorumlu:'Muhasebe', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'OD-002', baslik:'Elektrik Faturası', kategori:'Fatura', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 15. günü', sorumlu:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'OD-003', baslik:'İnternet / Telefon', kategori:'Fatura', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 10. günü', sorumlu:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'OD-004', baslik:'Muhasebe / Mali Müşavir', kategori:'Hizmet', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın son iş günü', sorumlu:'Yönetim', oncelik:'Normal', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() }
  ];
  odemeler.forEach(function(o){ o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o)||null; });
  _ppOdemeStore(odemeler);
};

window._ppAbonelikBaslat = function() {
  if (_ppAbonelikLoad().length > 0) return;
  var abonelikler = [
    { id:'AB-001', baslik:'Google Workspace', kategori:'SaaS', tutar:'', para:'USD', periyot:'Aylık', yenileme:'', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'AB-002', baslik:'GitHub', kategori:'SaaS', tutar:'', para:'USD', periyot:'Aylık', yenileme:'', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'AB-003', baslik:'Domain / Hosting', kategori:'Altyapı', tutar:'', para:'USD', periyot:'Yıllık', yenileme:'', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() }
  ];
  _ppAbonelikStore(abonelikler);
};
window._ppOdemePanelRender = function(body, h) {
  var odemeler = _ppOdemeLoad().filter(function(o){ return !o.isDeleted; });
  var bugun = _ppToday();
  h += '<div style="flex:1;overflow-y:auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:var(--pp-meta);color:var(--t3)">'+odemeler.length+' rutin ödeme</div>';
  h += '<button onclick="event.stopPropagation();window._ppOdemeYeniAc()" style="font-size:var(--pp-meta);padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>';
  h += '</div>';
  odemeler.forEach(function(o) {
    var sonraki = o.sonrakiCalisma || (window._ppTakvimSonrakiHesapla?.(o)) || '—';
    var kalan = sonraki&&sonraki!=='—' ? Math.ceil((new Date(sonraki)-new Date(bugun))/86400000) : null;
    // [PP-ODM-001 START] 4-kademe vade renk uyari sistemi (PP-ABN-001 ile tutarli)
    var kRenk, kBg, kLabel;
    if (kalan === null) {
      kRenk = 'var(--t3)'; kBg = 'transparent'; kLabel = '—';
    } else if (kalan < 0) {
      kRenk = '#DC2626'; kBg = '#FEE2E2'; kLabel = '🔴 ' + Math.abs(kalan) + ' gun gecikti';
    } else if (kalan === 0) {
      kRenk = '#EA580C'; kBg = '#FED7AA'; kLabel = '🟠 Bugun — acil';
    } else if (kalan < 3) {
      kRenk = '#EA580C'; kBg = '#FED7AA'; kLabel = '🟠 ' + kalan + ' gun — acil';
    } else if (kalan < 7) {
      kRenk = '#D97706'; kBg = '#FEF3C7'; kLabel = '🟡 ' + kalan + ' gun';
    } else {
      kRenk = '#16A34A'; kBg = '#DCFCE7'; kLabel = '🟢 ' + kalan + ' gun';
    }
    // [PP-ODM-001 END]
    h += '<div style="display:grid;grid-template-columns:120px 1fr 80px 90px 70px 60px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    h += '<span style="font-size:var(--pp-meta);padding:2px 6px;border-radius:3px;background:#E6F1FB;color:var(--pp-info);font-weight:500">'+_ppEsc(o.kategori||'')+'</span>';
    h += '<div><div style="font-size:var(--pp-body);font-weight:500;color:var(--t)">'+_ppEsc(o.baslik)+'</div><div style="font-size:var(--pp-meta);color:var(--t3)">'+_ppEsc(o.periyotDetay||'')+'</div></div>';
    h += '<div style="font-size:var(--pp-meta);color:var(--t2)">'+_ppEsc(o.tutar?(o.tutar+' '+o.para):'—')+'</div>';
    h += '<div style="font-size:var(--pp-meta);color:var(--t3)">'+sonraki+'</div>';
    h += '<span style="font-size:var(--pp-meta);padding:2px 6px;border-radius:3px;background:'+kBg+';color:'+kRenk+';font-weight:500">'+kLabel+'</span>';
    h += '<div style="display:flex;gap:3px;justify-content:flex-end" onclick="event.stopPropagation()">'
       + '<button onclick="event.stopPropagation();window._ppOdemeModalAc(\''+o.id+'\', \''+(o.tip||'fatura')+'\')" style="font-size:var(--pp-meta);padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2)" title="Düzenle">✎</button>'
       + '<button onclick="event.stopPropagation();window._ppOdemeSil(\''+o.id+'\')" style="font-size:var(--pp-meta);padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--pp-err)" title="Sil">×</button>'
       + '</div>';
    h += '</div>';
  });
  h += '</div>';
  /* XSS-RISK: _esc() zorunlu */
  body.innerHTML = h;
};
window._ppAbonelikPanelRender = function(body, h) {
  var abonelikler = _ppAbonelikLoad().filter(function(a){ return !a.isDeleted; });
  var bugun = _ppToday();
  h += '<div style="flex:1;overflow-y:auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:var(--pp-meta);color:var(--t3)">'+abonelikler.length+' abonelik</div>';
  h += '<button onclick="event.stopPropagation();window._ppAbonelikYeniAc()" style="font-size:var(--pp-meta);padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>';
  h += '</div>';
  abonelikler.forEach(function(a) {
    var yenileme = a.yenileme || '—';
    var kalan = yenileme&&yenileme!=='—' ? Math.ceil((new Date(yenileme)-new Date(bugun))/86400000) : null;
    // [PP-ABN-001 START] 4-kademe vade renk uyari sistemi
    var kRenk, kBg, kLabel;
    if (kalan === null) {
      kRenk = 'var(--t3)'; kBg = 'transparent'; kLabel = '—';
    } else if (kalan < 0) {
      kRenk = '#DC2626'; kBg = '#FEE2E2'; kLabel = '🔴 ' + Math.abs(kalan) + ' gun gecikti';
    } else if (kalan === 0) {
      kRenk = '#EA580C'; kBg = '#FED7AA'; kLabel = '🟠 Bugun — acil';
    } else if (kalan < 3) {
      kRenk = '#EA580C'; kBg = '#FED7AA'; kLabel = '🟠 ' + kalan + ' gun — acil';
    } else if (kalan < 7) {
      kRenk = '#D97706'; kBg = '#FEF3C7'; kLabel = '🟡 ' + kalan + ' gun';
    } else {
      kRenk = '#16A34A'; kBg = '#DCFCE7'; kLabel = '🟢 ' + kalan + ' gun';
    }
    // [PP-ABN-001 END]
    h += '<div style="display:grid;grid-template-columns:100px 1fr 80px 100px 80px 60px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    h += '<span style="font-size:var(--pp-meta);padding:2px 6px;border-radius:3px;background:#EEEDFE;color:#3C3489;font-weight:500">'+_ppEsc(a.kategori||'')+'</span>';
    h += '<div><div style="font-size:var(--pp-body);font-weight:500;color:var(--t)">'+_ppEsc(a.baslik)+'</div><div style="font-size:var(--pp-meta);color:var(--t3)">'+_ppEsc(a.periyot||'')+'</div></div>';
    h += '<div style="font-size:var(--pp-meta);color:var(--t2)">'+_ppEsc(a.tutar?(a.tutar+' '+a.para):'—')+'</div>';
    h += '<div style="font-size:var(--pp-meta);color:var(--t3)">'+yenileme+'</div>';
    h += '<span style="font-size:var(--pp-meta);padding:2px 6px;border-radius:3px;background:'+kBg+';color:'+kRenk+';font-weight:500">'+kLabel+'</span>';
    h += '<div style="display:flex;gap:3px;justify-content:flex-end" onclick="event.stopPropagation()">'
       + '<button onclick="event.stopPropagation();window._ppAbonelikModalAc(\''+a.id+'\')" style="font-size:var(--pp-meta);padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2)" title="Duzenle">✎</button>'
       + '<button onclick="event.stopPropagation();window._ppAbonelikSil(\''+a.id+'\')" style="font-size:var(--pp-meta);padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--pp-err)" title="Sil">×</button>'
       + '</div>';
    h += '</div>';
  });
  h += '</div>';
  /* XSS-RISK: _esc() zorunlu */
  body.innerHTML = h;
};
window._ppTakvimCSVImport = function(csvText) {
  if (!csvText || !csvText.trim()) { window.toast?.('CSV boş', 'warn'); return; }
  var satirlar = csvText.trim().split(/\r?\n/);
  if (satirlar.length < 2) { window.toast?.('Veri yok', 'warn'); return; }
  var basliklar = satirlar[0].split(',').map(function(s) { return s.trim().toLowerCase().replace(/['"]/g, ''); });
  var kolonMap = {
    'no': 'no', 'periyot': 'periyot', 'kategori': 'kategori',
    'alt kategori': 'altKategori', 'altkategori': 'altKategori',
    'kaynak': 'kaynak',
    'etkinlik adi': 'baslik', 'etkinlik adı': 'baslik',
    'etkinlik detayi': 'periyotDetay', 'etkinlik detayı': 'periyotDetay',
    'periyot detayi': 'periyotDetay', 'periyot detayı': 'periyotDetay',
    'sorumlu kisi': 'sorumluUnvan', 'sorumlu kişi': 'sorumluUnvan',
    'atanmis gorevli': 'atananGorevli', 'atanmış görevli': 'atananGorevli',
    'ilgili dokuman': 'ilgiliDokuman', 'ilgili döküman': 'ilgiliDokuman'
  };
  var liste = window._ppTakvimLoad?.() || [];
  var eklenen = 0;
  var atlanan = 0;
  for (var i = 1; i < satirlar.length; i++) {
    var kolonlar = satirlar[i].split(',').map(function(s) { return s.trim().replace(/^["']|["']$/g, ''); });
    if (!kolonlar.some(function(k) { return k.length > 0; })) continue;
    var vals = {};
    basliklar.forEach(function(b, idx) {
      var key = kolonMap[b] || b;
      vals[key] = kolonlar[idx] || '';
    });
    if (!vals.baslik) { atlanan++; continue; }
    var yeni = {
      id: window._ppId?.() || Date.now() + Math.random().toString(36).slice(2, 6),
      no: vals.no || '',
      baslik: vals.baslik,
      kategori: vals.kategori || 'Genel',
      altKategori: vals.altKategori || '',
      kaynak: vals.kaynak || '',
      periyot: vals.periyot || 'Tek Seferlik',
      periyotDetay: vals.periyotDetay || '',
      sorumluUnvan: vals.sorumluUnvan || '',
      atananGorevli: vals.atananGorevli || '',
      ilgiliDokuman: vals.ilgiliDokuman || '',
      takvimeEkle: 'Evet',
      oncelik: 'Normal',
      hatirlatmaGun: 1,
      durum: 'active',
      createdAt: window._ppNow?.(),
      isDeleted: false
    };
    yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
    liste.push(yeni);
    eklenen++;
  }
  window._ppTakvimStore?.(liste);
  window.toast?.(eklenen + ' etkinlik eklendi, ' + atlanan + ' atlandı', 'ok');
  window._ppModRender?.();
};

/* ── PP-TAK-V2-004: JSON Import ─────────────────────────────── */
window._ppTakvimJSONImport = function(inp) {
  var f = inp.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) { window.toast?.('Geçersiz format — dizi bekleniyor', 'warn'); return; }
      var liste = window._ppTakvimLoad?.() || [];
      var eklenen = 0;
      data.forEach(function(ev) {
        if (!ev.name && !ev.baslik) return;
        var yeni = {
          id: window._ppId?.() || (Date.now() + Math.random().toString(36).slice(2, 6)),
          name: ev.name || ev.baslik || '',
          baslik: ev.baslik || ev.name || '',
          period: ev.period || ev.periyot || '',
          periyot: ev.periyot || ev.period || '',
          periodDetail: ev.periodDetail || ev.periyotDetay || '',
          periyotDetay: ev.periyotDetay || ev.periodDetail || '',
          category: ev.category || ev.kategori || '',
          kategori: ev.kategori || ev.category || '',
          altKategori: ev.altKategori || ev.subCategory || '',
          kaynak: ev.kaynak || ev.source || '',
          resp: ev.resp || ev.sorumlu || '',
          sorumlu: ev.sorumlu || ev.resp || '',
          sorumluUnvan: ev.sorumluUnvan || ev.sorumlu || ev.resp || '',
          atananGorevli: ev.atananGorevli || ev.assigned || '',
          ilgiliDokuman: ev.ilgiliDokuman || ev.doc || '',
          detail: ev.detail || ev.detay || '',
          detay: ev.detay || ev.detail || '',
          addToCalendar: ev.addToCalendar || ev.takvimeEkle || 'Evet',
          takvimeEkle: ev.takvimeEkle || ev.addToCalendar || 'Evet',
          priority: ev.priority || ev.oncelik || 'Normal',
          oncelik: ev.oncelik || ev.priority || 'Normal',
          startDate: ev.startDate || ev.basTarih || '',
          basTarih: ev.basTarih || ev.startDate || '',
          durum: ev.status || ev.durum || 'active',
          status: ev.status || ev.durum || 'active',
          no: ev.no || '',
          hatirlatmaGun: ev.hatirlatmaGun || 3,
          createdAt: window._ppNow?.(),
          updatedAt: window._ppNow?.()
        };
        yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
        liste.push(yeni);
        eklenen++;
      });
      window._ppTakvimStore?.(liste);
      window.toast?.(eklenen + ' etkinlik içe aktarıldı', 'ok');
      window._ppModRender?.();
    } catch(err) {
      window.toast?.('JSON parse hatası: ' + err.message, 'warn');
    }
  };
  r.readAsText(f, 'UTF-8');
};
window._ppTakvimHatirlaticiKontrol = function() {
  var bugun = new Date();
  var olaylar = typeof _ppTakvimLoad==='function' ? _ppTakvimLoad() : [];
  olaylar.filter(function(o){ return !o.isDeleted; }).forEach(function(o) {
    var tarih = o.sonrakiCalisma || o.basTarih || '';
    if (!tarih) return;
    var fark = Math.round((new Date(tarih) - bugun) / 86400000);
    var key = 'pp_hat_' + o.id + '_' + String(tarih).slice(0,10);
    if (localStorage.getItem(key)) return;
    if (fark === 0) {
      window.addNotif?.('⏰', 'Bugün: ' + (o.baslik||''), 'warn', 'pusula-pro');
      localStorage.setItem(key, '1');
    } else if (fark === 1) {
      window.addNotif?.('📅', 'Yarın: ' + (o.baslik||''), 'info', 'pusula-pro');
      localStorage.setItem(key, '1');
    } else if (fark === 3) {
      window.addNotif?.('🔔', '3 gün sonra: ' + (o.baslik||''), 'info', 'pusula-pro');
      localStorage.setItem(key, '1');
    }
  });
};

  /* ── V170.3.9 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppTakvimPanelRender) {
    Object.assign(window, {
      _ppTakvimSonrakiHesapla: window._ppTakvimSonrakiHesapla,
      _ppTakvimHatirlatmaKontrol: window._ppTakvimHatirlatmaKontrol,
      _ppTakvimBaslat: window._ppTakvimBaslat,
      _ppTakvimPanelRender: window._ppTakvimPanelRender,
      _ppTakAyOnce: window._ppTakAyOnce,
      _ppTakAySonra: window._ppTakAySonra,
      _ppTakBugun: window._ppTakBugun,
      _ppTakGunTikla: window._ppTakGunTikla,
      _ppTakEtkinlikAc: window._ppTakEtkinlikAc,
      _ppOdemeBaslat: window._ppOdemeBaslat,
      _ppAbonelikBaslat: window._ppAbonelikBaslat,
      _ppOdemePanelRender: window._ppOdemePanelRender,
      _ppAbonelikPanelRender: window._ppAbonelikPanelRender,
      _ppTakvimCSVImport: window._ppTakvimCSVImport,
      _ppTakvimJSONImport: window._ppTakvimJSONImport,
      _ppTakvimHatirlaticiKontrol: window._ppTakvimHatirlaticiKontrol
    });
  }

  /* ── V170.3.9 CANONICAL PusulaPro.renderBoard EXPOSE ── */
  Object.assign(window.PusulaPro.renderBoard, {
    _ppTakvimSonrakiHesapla: window._ppTakvimSonrakiHesapla,
    _ppTakvimHatirlatmaKontrol: window._ppTakvimHatirlatmaKontrol,
    _ppTakvimBaslat: window._ppTakvimBaslat,
    _ppTakvimPanelRender: window._ppTakvimPanelRender,
    _ppTakAyOnce: window._ppTakAyOnce,
    _ppTakAySonra: window._ppTakAySonra,
    _ppTakBugun: window._ppTakBugun,
    _ppTakGunTikla: window._ppTakGunTikla,
    _ppTakEtkinlikAc: window._ppTakEtkinlikAc,
    _ppOdemeBaslat: window._ppOdemeBaslat,
    _ppAbonelikBaslat: window._ppAbonelikBaslat,
    _ppOdemePanelRender: window._ppOdemePanelRender,
    _ppAbonelikPanelRender: window._ppAbonelikPanelRender,
    _ppTakvimCSVImport: window._ppTakvimCSVImport,
    _ppTakvimJSONImport: window._ppTakvimJSONImport,
    _ppTakvimHatirlaticiKontrol: window._ppTakvimHatirlaticiKontrol
  });
})();
