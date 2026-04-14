/* satin_alma_v2_liste.js — SA-V2 C Tasarımı Split Panel Liste */
'use strict';

/* ── C Tasarımı Split Panel ──────────────────────────────── */

window._saV2ListeC = true;
window._saV2ListeSirala = window._saV2ListeSirala || {alan:'createdAt',yon:'desc'};
window._saV2ListeSecili = window._saV2ListeSecili || {};
window._saV2AktifId = window._saV2AktifId || null;

window.renderSatinAlmaV2 = function() {
  /* SAV2-RENDER-MERGE-001: render.js yüklüyse gelişmiş 4-mod görünüme devret */
  if (window._saV2RenderLoaded && typeof window._saV2RenderMain === 'function') {
    window._saV2RenderMain();
    return;
  }
  var cont = document.getElementById('panel-satin-alma');
  if(!cont) return;
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var srch = (window._sav2SrchVal||'').toLowerCase();
  var durumF = document.getElementById('sav2-durum')?.value||'';
  var tedF = document.getElementById('sav2-ted')?.value||'';
  var tarihF = document.getElementById('sav2-tarih')?.value||'';
  // ALIS-LISTE-C-001: para birimi filtresi
  var paraF = document.getElementById('sav2-para')?.value||'';
  var bugAy = new Date().toISOString().slice(0,7);
  var buHafta = new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10);
  var fl = liste.filter(function(t){
    if(t.isDeleted) return false;
    if(srch&&!((t.tedarikci||'').toLowerCase().includes(srch)||(window._saV2UrunAdi?.(t)||'').toLowerCase().includes(srch)||(window._saV2DuayKodu?.(t)||'').toLowerCase().includes(srch)||(t.jobId||'').toLowerCase().includes(srch)||(t.piNo||'').toLowerCase().includes(srch))) return false;
    if(durumF&&t.durum!==durumF) return false;
    if(tedF&&t.tedarikci!==tedF) return false;
    if(paraF && (t.para||t.toplamPara||t.doviz||t.paraBirimi||'')!==paraF) return false;
    if(tarihF==='hafta'&&(t.createdAt||'')<buHafta) return false;
    if(tarihF==='bu-ay'&&!(t.createdAt||'').startsWith(bugAy)) return false;
    return true;
  });
  var sir = window._saV2ListeSirala;
  fl.sort(function(a,b){
    var av=a[sir.alan]||'',bv=b[sir.alan]||'';
    return sir.yon==='asc'?(av>bv?1:-1):(av<bv?1:-1);
  });
  var boyut=20;
  var sayfa=window.SAV2_SAYFA||1;
  var bas=(sayfa-1)*boyut;
  var goster=fl.slice(bas,bas+boyut);
  var aktifT=fl.find(function(t){return String(t.id)===String(window._saV2AktifId);})||goster[0]||null;
  if(aktifT) window._saV2AktifId=String(aktifT.id);
  var seciliSay=Object.keys(window._saV2ListeSecili||{}).filter(function(k){return window._saV2ListeSecili[k];}).length;
  var kpiToplam=fl.reduce(function(s,t){return s+(parseFloat(t.toplamTutar)||parseFloat(window._saV2AlisF?.(t))||0);},0);
  var _b='var(--color-border-tertiary)';
  var h='<div style="display:flex;flex-direction:column;height:100%">';
  // ALIS-LISTE-C-001: 5 KPI kart, 5. SÜRESI YAKLAŞAN (gecerlilik 0-7 gun)
  h+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px 12px;border-bottom:0.5px solid '+_b+'">';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">BU AY TEKLİF</div><div style="font-size:18px;font-weight:500;color:var(--color-text-primary)">'+fl.length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">BEKLEYEN</div><div style="font-size:18px;font-weight:500;color:#854F0B">'+fl.filter(function(t){return t.durum==='bekleyen';}).length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">ONAYLI</div><div style="font-size:18px;font-weight:500;color:#0F6E56">'+fl.filter(function(t){return t.durum==='onaylandi';}).length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">TOPLAM</div><div style="font-size:14px;font-weight:500;color:var(--color-text-primary)">'+kpiToplam.toLocaleString('tr-TR',{maximumFractionDigits:0})+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">SÜRESI YAKLAŞAN</div><div style="font-size:18px;font-weight:500;color:#DC2626">'+fl.filter(function(t){var g=t.gecerlilikTarihi||t.validUntil;if(!g)return false;var d=(new Date(g)-new Date())/86400000;return d>=0&&d<=7;}).length+'</div></div>';
  h+='</div>';
  // ALIS-LISTE-C-001: tek satır filtre, flex-wrap:nowrap + overflow-x:auto, 2 yeni select (para, tarih)
  h+='<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:0.5px solid '+_b+';overflow-x:auto;flex-wrap:nowrap">';
  h+='<button onclick="event.stopPropagation();window._saV2YeniTeklif()" style="padding:5px 12px;border:none;border-radius:5px;background:var(--color-text-primary);color:#ffffff;cursor:pointer;font-size:10px;font-weight:500;font-family:inherit;flex-shrink:0">+ Yeni Teklif</button>';
  h+='<input id="sav2-srch" value="'+(window._sav2SrchVal||'')+'" placeholder="Ara..." oninput="event.stopPropagation();window._sav2SrchVal=this.value;window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;width:140px;flex-shrink:0;font-family:inherit;color:var(--color-text-primary)">';
  h+='<select id="sav2-durum" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm durumlar</option><option value="bekleyen">Bekleyen</option><option value="onaylandi">Onaylı</option><option value="reddedildi">Reddedildi</option></select>';
  h+='<select id="sav2-ted" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm tedarikçiler</option></select>';
  h+='<select id="sav2-para" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm para birimleri</option><option value="USD"'+(paraF==='USD'?' selected':'')+'>USD</option><option value="EUR"'+(paraF==='EUR'?' selected':'')+'>EUR</option><option value="TRY"'+(paraF==='TRY'?' selected':'')+'>TRY</option></select>';
  h+='<select id="sav2-tarih" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tarihe göre</option><option value="bu-ay"'+(tarihF==='bu-ay'?' selected':'')+'>Bu ay</option><option value="hafta"'+(tarihF==='hafta'?' selected':'')+'>Bu hafta</option></select>';
  h+='<div style="flex:1"></div>';
  h+='<button onclick="event.stopPropagation();window._saV2ExportCSV()" style="padding:4px 10px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)">↓ CSV</button>';
  h+='</div>';
  if(seciliSay>0){
    h+='<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:#FAEEDA;border-bottom:0.5px solid #854F0B">';
    h+='<span style="font-size:10px;color:#633806;font-weight:500">'+seciliSay+' seçildi</span>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluOnayla()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--color-border-secondary);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">✓ Onayla</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluReddet()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">✕ Reddet</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluSil()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>';
    h+='</div>';
  }
  /* SATINALMA-LISTE-GENISLIK-001: wrapper min-width:0 + detay kapalıysa border-right gizle */
  h+='<div style="display:flex;flex:1;min-width:0;min-height:0;overflow:hidden">';
  h+='<div style="flex:1;min-width:0;overflow-y:auto;'+(window._saV2AktifId?'border-right:0.5px solid '+_b:'border-right:none')+'">';
  // ALIS-LISTE-C-001: 6 sütun grid — ÜRÜN/TEDARİKÇİ + TUTAR + DURUM + GEÇERLİLİK + İŞLEM
  h+='<div style="display:grid;grid-template-columns:20px minmax(200px,1fr) 110px 120px 90px 90px;padding:5px 10px;background:var(--color-background-secondary);border-bottom:0.5px solid '+_b+';position:sticky;top:0;z-index:1">';
  var _th=function(label,alan){
    var aktif=sir.alan===alan;
    var yon=aktif?(sir.yon==='asc'?'↑':'↓'):'↕';
    return '<div onclick="event.stopPropagation();window._saV2ListeSirala={alan:\''+alan+'\',yon:\''+(aktif&&sir.yon==='asc'?'desc':'asc')+'\'};window.renderSatinAlmaV2()" style="font-size:10px;font-weight:500;color:'+(aktif?'var(--color-text-primary)':'var(--color-text-tertiary)')+';letter-spacing:.04em;cursor:pointer">'+label+' '+yon+'</div>';
  };
  h+='<div></div>';
  h+=_th('ÜRÜN / TEDARİKÇİ','createdAt');
  h+=_th('TUTAR','toplamTutar');
  h+='<div style="font-size:10px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em">DURUM</div>';
  h+='<div style="font-size:10px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em">GEÇERLİLİK</div>';
  h+='<div style="font-size:10px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em">İŞLEM</div>';
  h+='</div>';
  goster.forEach(function(t){
    var aktif=String(t.id)===String(window._saV2AktifId);
    var secili=window._saV2ListeSecili&&window._saV2ListeSecili[t.id];
    var durum=t.durum||'bekleyen';
    // SAV2-GECERLILIK-001: gecerlilik kontrolu — t.durum mutate etmeden local hesaplama
    var _gecerlilik=t.gecerlilikTarihi||t.validUntil||'';
    var _sureBitti=false, _sureUyari=false;
    if(_gecerlilik){
      var _bugun=new Date().toISOString().slice(0,10);
      if(_gecerlilik<_bugun) _sureBitti=true;
      else {
        var _diffGun=Math.ceil((new Date(_gecerlilik).getTime()-new Date(_bugun).getTime())/86400000);
        if(_diffGun>=0 && _diffGun<=7) _sureUyari=true;
      }
    }
    // ALIS-LISTE-C-001: sol border öncelik — satışMüşteriOnay (turuncu) > süresi bitmiş (kırmızı) > yok
    var _solBorder = (t.satisMusteriOnay === true) ? '3px solid #D97706' : (_sureBitti ? '3px solid #A32D2D' : '3px solid transparent');
    h+='<div onclick="event.stopPropagation();window._saV2AktifId=\''+t.id+'\';window.renderSatinAlmaV2()" style="display:grid;grid-template-columns:20px minmax(200px,1fr) 110px 120px 90px 90px;padding:7px 10px;border-bottom:0.5px solid '+_b+';border-left:'+_solBorder+';align-items:center;cursor:pointer;background:'+(aktif?'#E6F1FB':secili?'#FFFCF5':'var(--color-background-primary)')+'" onmouseover="if(!'+aktif+')this.style.background=\'var(--color-background-secondary)\'" onmouseout="if(!'+aktif+')this.style.background=\''+(secili?'#FFFCF5':'var(--color-background-primary)')+'\'">';
    // Kolon 1: checkbox
    h+='<input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:11px;height:11px;cursor:pointer">';
    // Kolon 2: ürün/tedarikçi adı + jobId + PI rozet alt satır
    // SATINALMA-LISTE-XSS-001: window._esc ile user-input sanitize
    /* SATIS-LISTE-PI-NO-001: PI no monospace mavi rozet (ürün adı yanında) */
    var _piNoLst = t.piNo || t.pi_no || '';
    var _piHTMLLst = _piNoLst ? ' <span style="font-size:8px;font-family:monospace;color:#185FA5;background:#E6F1FB;padding:1px 4px;border-radius:3px" title="PI No">'+(window._esc?.(_piNoLst)||_piNoLst)+'</span>' : '';
    h+='<div style="min-width:0"><div style="font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(window._esc?.(window._saV2UrunAdi?.(t))||window._saV2UrunAdi?.(t)||'—')+(t.urunler&&t.urunler.length>1?' <span style="font-size:8px;background:#E6F1FB;color:#0C447C;padding:1px 4px;border-radius:6px">+'+( t.urunler.length-1)+'</span>':'')+_piHTMLLst+'</div>';
    h+='<div style="font-size:10px;color:var(--color-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(window._esc?.(t.tedarikci)||t.tedarikci||'—')+(t.jobId?' · '+(window._esc?.(t.jobId)||t.jobId)+'':'')+'</div></div>';
    // Kolon 3: tutar + para birimi soluk
    h+='<div style="font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap">'+((window._saV2AlisF?.(t)||parseFloat(t.toplamTutar)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}))+' <span style="font-size:9px;color:var(--color-text-tertiary);font-weight:400">'+(window._saV2Para?.(t)||t.toplamPara||'USD')+'</span></div>';
    // Kolon 4: durum badge + geçerlilik badge (mevcut _bittiBadge/_uyariIkon mantığı korunsun)
    var _bgColor=durum==='onaylandi'?'#E1F5EE':durum==='reddedildi'?'#FCEBEB':'#FAEEDA';
    var _fgColor=durum==='onaylandi'?'#085041':durum==='reddedildi'?'#791F1F':'#633806';
    var _bittiBadge=_sureBitti?' <span style="font-size:8px;padding:2px 6px;border-radius:8px;background:#FCEBEB;color:#A32D2D;font-weight:600;white-space:nowrap" title="Süresi doldu: '+_gecerlilik+'">Süresi Doldu</span>':'';
    var _uyariIkon=_sureUyari?' <span title="Gecerlilik 7 gun icinde dolacak: '+_gecerlilik+'" style="color:#D97706;font-size:10px;cursor:help">⚠</span>':'';
    h+='<div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap"><span style="font-size:8px;padding:2px 6px;border-radius:8px;white-space:nowrap;background:'+_bgColor+';color:'+_fgColor+'">'+durum+'</span>'+_bittiBadge+_uyariIkon+'</div>';
    // Kolon 5: GEÇERLİLİK — satisMusteriOnay ise kalan saat (renk kademeli), yoksa tarih
    if (t.satisMusteriOnay === true && t.acilGorevBitis) {
      var _kalan = Math.round((new Date(t.acilGorevBitis) - new Date()) / 3600000);
      var _kalanRenk = _kalan > 24 ? '#15803D' : _kalan > 8 ? '#D97706' : '#DC2626';
      h+='<div style="font-size:10px;font-weight:600;color:'+_kalanRenk+';white-space:nowrap" title="Acil görev bitiş: '+t.acilGorevBitis+'">'+(_kalan>=0?_kalan+'sa kaldı':'Süresi geçti')+'</div>';
    } else {
      h+='<div style="font-size:9px;color:var(--color-text-tertiary);font-family:monospace;white-space:nowrap">'+(_gecerlilik?_gecerlilik:'—')+'</div>';
    }
    // Kolon 6: İŞLEM — satisMusteriOnay ise sadece "Onaya Sun", değilse "Satış" + "···"
    if (t.satisMusteriOnay === true) {
      h+='<div><button onclick="event.stopPropagation();window._saV2OnayaSun?.(\''+t.id+'\')" style="font-size:9px;padding:4px 8px;border:none;border-radius:4px;background:#D97706;color:#fff;font-weight:600;cursor:pointer;font-family:inherit">Onaya Sun</button></div>';
    } else {
      h+='<div style="display:flex;gap:3px"><button onclick="event.stopPropagation();window._saV2TeklifOlusturAkilli?.(\''+t.id+'\')" style="font-size:9px;padding:4px 7px;border:none;border-radius:4px;background:#185FA5;color:#fff;font-weight:600;cursor:pointer;font-family:inherit">Satış</button>';
      /* SATIS-LISTE-PI-GUNCELLE-001: hızlı PI No düzenleme butonu */
      h+='<button onclick="event.stopPropagation();window._saV2PIGuncelle(\''+t.id+'\')" title="PI No güncelle" style="font-size:9px;padding:3px 7px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">PI No</button>';
      h+='<button onclick="event.stopPropagation();window._saV2RowMenu?.(\''+t.id+'\')" title="Daha fazla" style="font-size:11px;padding:2px 7px;border:0.5px solid '+_b+';border-radius:4px;background:transparent;cursor:pointer;color:var(--color-text-tertiary);line-height:1;font-family:inherit">···</button>';
      /* SATIS-LISTE-PEEK-001: hızlı bakış peek panel butonu */
      h+='<button onclick="event.stopPropagation();window._saV2PeekPanel(\''+t.id+'\')" title="Hızlı bakış" style="font-size:9px;padding:3px 8px;border:0.5px solid '+_b+';border-radius:4px;background:transparent;cursor:pointer;color:var(--color-text-secondary);font-family:inherit">👁 Gör</button></div>';
    }
    h+='</div>';
    if(t.urunler&&t.urunler.length>1){
      t.urunler.forEach(function(u,idx){
        h+='<div style="display:grid;grid-template-columns:20px minmax(200px,1fr) 110px 120px 90px 90px;padding:3px 10px 3px 24px;border-bottom:0.5px solid '+_b+';background:var(--color-background-secondary);align-items:center">';
        // SAV2-GRUP-CB-001: grup ürün satırına checkbox — parent t.id state'ine bind
        h+='<div style="font-size:9px;display:flex;align-items:center;gap:2px"><input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:10px;height:10px;cursor:pointer;flex-shrink:0"><span style="color:var(--color-text-tertiary)">'+(idx+1)+'.</span></div>';
        // SATINALMA-LISTE-XSS-002: ürün alt satırında window._esc sarmalama
        h+='<div style="font-size:9px;color:var(--color-text-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(window._esc?.(u.urunAdi||u.turkceAdi||u.duayKodu)||u.urunAdi||u.turkceAdi||u.duayKodu||'—')+'</div>';
        h+='<div style="font-size:9px;color:#0F6E56;white-space:nowrap">'+(u.alisF||'—')+' '+(u.para||'')+'</div>';
        h+='<div></div>';
        h+='<div></div>';
        h+='<button onclick="event.stopPropagation();window._saV2TeklifOlusturUrun(\''+t.id+'\','+idx+')" style="font-size:8px;padding:1px 6px;border:0.5px solid #185FA5;border-radius:3px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">→$</button>';
        h+='</div>';
      });
    }
  });
  h+=window._listHelper?.sayfalama(fl.length,sayfa,boyut,'renderSatinAlmaV2','sav2')||'';
  h+='</div>';
  h+='<div id="sav2-detay-panel" style="width:280px;flex-shrink:0;overflow-y:auto">';
  if(aktifT){
    h+=window._saV2DetayHTML(aktifT);
  } else {
    h+='<div style="padding:40px;text-align:center;color:var(--color-text-tertiary);font-size:11px">Teklif seçin</div>';
  }
  h+='</div>';
  h+='</div></div>';
  cont.innerHTML=h;
  var tedSel=document.getElementById('sav2-ted');
  if(tedSel&&tedSel.options.length<=1){
    var tedler=[...new Set(liste.map(function(t){return t.tedarikci||'';}).filter(Boolean))].sort();
    tedler.forEach(function(ted){var opt=document.createElement('option');opt.value=ted;opt.textContent=ted;if(ted===tedF)opt.selected=true;tedSel.appendChild(opt);});
  }
  var srchEl=document.getElementById('sav2-srch');
  if(srchEl&&document.activeElement!==srchEl&&window._sav2SrchVal){srchEl.focus();srchEl.setSelectionRange(srchEl.value.length,srchEl.value.length);}
  window._saV2HatirlatmaKontrol?.();
};

window._saV2DetayHTML = function(t) {
  var _b='var(--color-border-tertiary)';
  var durum=t.durum||'bekleyen';
  // SAV2-GECERLILIK-002: gecerlilik kontrolu (SAV2-GECERLILIK-001 ile ayni mantik)
  var _gecerlilik=t.gecerlilikTarihi||t.validUntil||'';
  var _sureBitti=false, _sureUyari=false;
  if(_gecerlilik){
    var _bugun=new Date().toISOString().slice(0,10);
    if(_gecerlilik<_bugun) _sureBitti=true;
    else {
      var _diffGun=Math.ceil((new Date(_gecerlilik).getTime()-new Date(_bugun).getTime())/86400000);
      if(_diffGun>=0 && _diffGun<=7) _sureUyari=true;
    }
  }
  var solRenk=_sureBitti?'#A32D2D':(durum==='onaylandi'?'#0F6E56':durum==='reddedildi'?'#A32D2D':'#854F0B');
  var h='<div style="border-left:2px solid '+solRenk+'">';
  h+='<div style="padding:12px 14px;border-bottom:0.5px solid '+_b+';background:var(--color-background-secondary)">';
  var gorsel=t.gorsel||(t.urunler&&t.urunler[0]?.gorsel)||'';
  if(gorsel) h+='<img src="'+gorsel+'" style="width:48px;height:48px;border-radius:6px;object-fit:cover;float:right;margin-left:8px">';
  /* SATIS-LISTE-PI-NO-001: detay başlıkta PI no rozet (alt satırda) */
  var _piNoDet = t.piNo || t.pi_no || '';
  h+='<div style="font-size:12px;font-weight:500;color:var(--color-text-primary)">'+(window._saV2UrunAdi?.(t)||'—')+'</div>';
  h+='<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:2px">'+(window._saV2DuayKodu?.(t)||'—')+' · '+(t.tedarikci||'—')+(_piNoDet?' · <span style="font-family:monospace;color:#185FA5">PI: '+(window._esc?.(_piNoDet)||_piNoDet)+'</span>':'')+'</div>';
  // SAV2-GECERLILIK-002: durum badge yanina ayri "Süresi Doldu" badge ve 7-gun ⚠ uyari ikonu (liste view ile ayni pattern)
  var _bgColor=durum==='onaylandi'?'#E1F5EE':durum==='reddedildi'?'#FCEBEB':'#FAEEDA';
  var _fgColor=durum==='onaylandi'?'#085041':durum==='reddedildi'?'#791F1F':'#633806';
  var _bittiBadge=_sureBitti?' <span style="font-size:8px;padding:2px 6px;border-radius:8px;background:#FCEBEB;color:#A32D2D;font-weight:600;white-space:nowrap" title="Süresi doldu: '+_gecerlilik+'">Süresi Doldu</span>':'';
  var _uyariIkon=_sureUyari?' <span title="Gecerlilik 7 gun icinde dolacak: '+_gecerlilik+'" style="color:#D97706;font-size:10px;cursor:help">⚠</span>':'';
  h+='<div style="margin-top:6px;display:flex;align-items:center;gap:3px;flex-wrap:wrap"><span style="font-size:8px;padding:2px 6px;border-radius:8px;background:'+_bgColor+';color:'+_fgColor+'">'+durum+'</span>'+_bittiBadge+_uyariIkon+'</div>';
  h+='<div style="clear:both"></div>';
  h+='</div>';
  h+='<div style="padding:10px 14px">';
  var _dr=function(l,v){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid '+_b+'"><span style="font-size:9px;color:var(--color-text-tertiary)">'+l+'</span><span style="font-size:9px;font-weight:500;color:var(--color-text-primary)">'+v+'</span></div>';};
  h+=_dr('PI No',t.piNo||'—');
  h+=_dr('Job ID',t.jobId||'—');
  h+=_dr('Teslim',t.teslimYeri||t.teslimMasraf||'—');
  h+=_dr('Toplam','<span style="color:#0F6E56;font-weight:500">'+((window._saV2AlisF?.(t)||0).toLocaleString('tr-TR',{maximumFractionDigits:2}))+' '+(window._saV2Para?.(t)||'USD')+'</span>');
  h+=_dr('Tarih',(t.teklifTarih||t.createdAt||'').slice(0,10));
  h+=_dr('Giren',(t.createdBy||'—')+' · '+(t.createdAt||'').slice(11,16));
  if(t.urunler&&t.urunler.length>1){
    h+='<div style="margin-top:8px;padding-top:8px;border-top:0.5px solid '+_b+'">';
    h+='<div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);margin-bottom:4px">ÜRÜNLER ('+t.urunler.length+')</div>';
    t.urunler.forEach(function(u,i){
      h+='<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid '+_b+';font-size:9px">';
      h+='<span style="color:var(--color-text-secondary)">'+(i+1)+'. '+(u.urunAdi||u.duayKodu||'—')+'</span>';
      h+='<span style="color:#0F6E56">'+(u.alisF||'—')+' '+(u.para||'')+'</span>';
      h+='</div>';
    });
    h+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:10px;font-weight:500">';
    h+='<span>Toplam</span><span style="color:#0F6E56">'+(t.toplamTutar||'—')+' '+(t.toplamPara||'')+'</span>';
    h+='</div></div>';
  }
  h+='<div style="display:flex;flex-direction:column;gap:5px;margin-top:10px">';
  var _canSatis=window.isAdmin?.()||['manager','lead'].includes(window.CU?.()?.role||window.CU?.()?.rol||'');
  if(_canSatis) h+='<button onclick="event.stopPropagation();window._saV2TeklifOlusturAkilli?.(\''+t.id+'\')" style="padding:7px;border:none;border-radius:5px;background:#185FA5;color:#fff;font-size:10px;cursor:pointer;font-weight:500;font-family:inherit">Satış Teklifi Oluştur</button>';
  if(_canSatis && !t.hazirlanmaTarihi) {
    h += '<button onclick="event.stopPropagation();window._saV2DosyaHazir(\''+t.id+'\')" style="padding:7px;border:none;border-radius:5px;background:#0F6E56;color:#fff;font-size:10px;cursor:pointer;font-weight:500;font-family:inherit;width:100%;margin-top:4px">\u2713 Dosya Sat\u0131\u015fa Haz\u0131r</button>';
  } else if(t.hazirlanmaTarihi) {
    h += '<div style="padding:6px;background:#E1F5EE;border-radius:5px;font-size:9px;color:#085041;text-align:center;margin-top:4px">\u2713 Haz\u0131r \u00b7 '+(t.hazirlanmaTarihi||'').slice(0,16).replace('T',' ')+'</div>';
  }
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">';
  h+='<button ondblclick="event.stopPropagation();window._saV2DuzenleForm?.(\''+t.id+'\')" onclick="event.stopPropagation();window._saV2DuzenleForm?.(\''+t.id+'\')" style="padding:6px;border:0.5px solid var(--color-border-secondary);border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:var(--color-text-secondary)">✏ Düzenle</button>';
  h+='<button onclick="event.stopPropagation();window._saV2Kopyala?.(\''+t.id+'\')" style="padding:6px;border:0.5px solid var(--color-border-secondary);border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:var(--color-text-secondary)">⎘ Kopyala</button>';
  h+='</div>';
  h+='<button onclick="event.stopPropagation();window._saV2Karsilastir?.(\''+t.id+'\')" style="padding:6px;border:0.5px solid var(--color-border-secondary);border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:var(--color-text-secondary)">↔ Karşılaştır</button>';
  h+='<button onclick="event.stopPropagation();window._saV2TekSil?.(\''+t.id+'\')" style="padding:6px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;font-size:10px;cursor:pointer;font-family:inherit;color:#A32D2D">Sil</button>';
  h+='</div>';
  var gecmis=typeof window._saV2Load==='function'?window._saV2Load().filter(function(x){return !x.isDeleted&&String(x.id)!==String(t.id)&&x.urunler&&x.urunler.some(function(u){return (u.duayKodu||'')===(window._saV2DuayKodu?.(t)||'');});}):[];
  if(gecmis.length){
    h+='<div style="margin-top:10px;padding-top:8px;border-top:0.5px solid '+_b+'">';
    h+='<div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);margin-bottom:4px">FİYAT GEÇMİŞİ</div>';
    gecmis.slice(0,3).forEach(function(g){
      var gu=g.urunler?.find(function(u){return (u.duayKodu||'')===(window._saV2DuayKodu?.(t)||'');})||{};
      h+='<div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0;border-bottom:0.5px solid '+_b+'">';
      h+='<span style="color:var(--color-text-tertiary)">'+(g.createdAt||'').slice(0,10)+'</span>';
      h+='<span style="color:#0F6E56">'+(gu.alisF||'—')+' '+(gu.para||'')+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div></div>';
  return h;
};

window._saV2TeklifOlusturUrun = function(teklifId, urunIdx) {
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var t = liste.find(function(x){return String(x.id)===String(teklifId);});
  if(!t){window.toast?.('Teklif bulunamadı','warn');return;}
  window._saV2TeklifOlustur?.(teklifId);
};

/* SAV2-HAZIR-001: Dosya Satışa Hazır işaretleme */
window._saV2DosyaHazir = function(id) {
  window.confirmModal?.('Bu dosya sat\u0131\u015fa haz\u0131r olarak i\u015faretlenecek. Devam?', {
    title: 'Dosya Sat\u0131\u015fa Haz\u0131r',
    confirmText: 'Evet, \u0130\u015faretle',
    onConfirm: function() {
      var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
      var t = liste.find(function(x){return String(x.id)===String(id);});
      if(!t){window.toast?.('Teklif bulunamad\u0131','warn');return;}
      var now = new Date().toISOString();
      t.hazirlanmaTarihi = now;
      t.updatedAt = now;
      if(typeof window._saV2Store==='function') window._saV2Store(liste);
      window.logActivity?.('edit','Dosya sat\u0131\u015fa haz\u0131r: '+(window._saV2UrunAdi?.(t)||t.id));
      if(typeof window.storeKpi==='function'||typeof window.logKpi==='function') {
        var kpiVeri = {
          tip: 'dosya_hazir',
          teklifId: id,
          urunAdi: window._saV2UrunAdi?.(t)||'',
          tedarikci: t.tedarikci||'',
          hazirlanmaTarihi: now,
          createdBy: window.CU?.()?.displayName||''
        };
        window.logKpi?.(kpiVeri)||window.storeKpi?.(kpiVeri);
      }
      window.toast?.('Dosya sat\u0131\u015fa haz\u0131r olarak i\u015faretlendi','ok');
      window.renderSatinAlmaV2?.();
    }
  });
};

/**
 * SATINALMA-ONAYA-SUN-001
 * Satış müşteri onayı sonrası işaretlenmiş alış teklifini (t.satisMusteriOnay)
 * yönetici onayına sun: durumu 'onay-hazir' yap, onayaSunmaTarihi set et,
 * storeAlisTeklifleri ile DB'ye yaz, admin/manager rolüne bildirim gönder.
 * @param {string|number} id Alış teklif id'si
 */
window._saV2OnayaSun = function(id) {
  var liste = typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) { window.toast?.('Teklif bulunamadı', 'err'); return; }
  if (!t.satisMusteriOnay) {
    window.toast?.('Bu teklif henüz satış onayı almamış', 'warn');
    return;
  }
  t.durum = 'onay-hazir';
  t.onayaSunmaTarihi = new Date().toISOString();
  if (typeof window.storeAlisTeklifleri === 'function') {
    try { window.storeAlisTeklifleri(liste); } catch (e) { console.warn('[onaya-sun] store hata:', e); }
  }
  // Admin / manager bildirim
  var users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  var mgrs = users.filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active' && !u.isDeleted; });
  var urunAdi = (typeof window._saV2UrunAdi === 'function' ? window._saV2UrunAdi(t) : (t.urunAdi || '')) || '';
  mgrs.forEach(function(m) {
    if (typeof window.addNotif === 'function') {
      window.addNotif('📋', 'Onay bekliyor: ' + urunAdi + ' (' + (t.tedarikci || '?') + ')', 'warn', 'satinalma-v2', m.id);
    }
  });
  window.toast?.('Onaya sunuldu — ' + mgrs.length + ' yöneticiye bildirildi', 'ok');
  window.renderSatinAlmaV2?.();
};

/* SATIS-LISTE-PI-GUNCELLE-001: Hızlı PI No düzenleme (liste satırından prompt ile) */
window._saV2PIGuncelle = function(id) {
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var teklif = liste.find(function(t) { return String(t.id) === String(id); });
  if (!teklif) { window.toast?.('Teklif bulunamadı', 'err'); return; }
  var mevcutPI = teklif.piNo || teklif.pi_no || '';
  var yeniPI = window.prompt('PI No girin:', mevcutPI);
  if (yeniPI === null) return;
  yeniPI = yeniPI.trim();
  var idx = liste.findIndex(function(t) { return String(t.id) === String(id); });
  if (idx === -1) return;
  liste[idx].piNo = yeniPI;
  liste[idx].updatedAt = new Date().toISOString();
  if (typeof window._saV2Store === 'function') window._saV2Store(liste);
  window.toast?.('PI No güncellendi: ' + (yeniPI || '(boş)'), 'ok');
  if (typeof window.logActivity === 'function') window.logActivity('satinalma-v2', 'PI No güncelle: ' + id + ' → ' + yeniPI);
  window.renderSatinAlmaV2?.();
};

/* SATIS-LISTE-PEEK-001: hızlı bakış peek panel — sağdan açılan ürün listesi + toplam */
window._saV2PeekPanel = function(id) {
  var liste = window._saV2Load ? window._saV2Load() : [];
  var t = liste.find(function(x){ return x.id===id; });
  if(!t) return;
  var mevcut = document.getElementById('sav2-peek-panel'); if(mevcut) mevcut.remove();
  var mo = document.createElement('div');
  mo.id = 'sav2-peek-panel';
  mo.style.cssText = 'position:fixed;right:0;top:0;bottom:0;width:380px;background:var(--sf);border-left:0.5px solid var(--b);z-index:9000;overflow-y:auto;box-shadow:-4px 0 20px rgba(0,0,0,.08)';
  mo.onclick = function(e){ e.stopPropagation(); };
  var urunler = t.urunler || t.urun || [];
  var toplam = t.toplamTutar || t.genelToplam || t.toplam || 0;
  var para = t.toplamPara || t.paraBirimi || 'USD';
  var urunHTML = urunler.map(function(u,i){
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px">'
      +'<div style="flex:1;color:var(--t)">'+window._esc(u.urunAdi||u.turkceAdi||u.ad||'—')+'<span style="color:var(--t3);font-size:9px;margin-left:4px">×'+( u.miktar||1)+'</span></div>'
      +'<div style="color:var(--t2);font-family:monospace;font-size:10px">'+(parseFloat(u.satisFiyati||u.satis||0)*( u.miktar||1)).toFixed(2)+' '+para+'</div>'
      +'</div>';
  }).join('');
  mo.innerHTML = '<div style="padding:16px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    +'<div><div style="font-size:13px;font-weight:500;color:var(--t)">'+window._esc(t.musteriAdi||t.musteri||'—')+'</div>'
    +'<div style="font-size:9px;color:var(--t3);margin-top:2px">'+window._esc(t.proformaNo||t.piNo||t.id)+'</div></div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'sav2-peek-panel\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    +'</div>'
    +'<div style="padding:12px 20px">'
    +'<div style="font-size:10px;font-weight:500;color:var(--t3);margin-bottom:8px">ÜRÜNLER ('+urunler.length+')</div>'
    +urunHTML
    +'<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:12px;font-weight:500;margin-top:4px">'
    +'<span style="color:var(--t)">Toplam</span>'
    +'<span style="color:var(--t);font-family:monospace">'+parseFloat(toplam).toFixed(2)+' '+para+'</span>'
    +'</div>'
    +'<div style="margin-top:8px;display:flex;gap:6px">'
    +'<button onclick="event.stopPropagation();window._saV2TeklifDetay?.(\''+id+'\');document.getElementById(\'sav2-peek-panel\')?.remove()" style="flex:1;padding:7px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Detay Aç</button>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'sav2-peek-panel\')?.remove()" style="padding:7px 12px;border:0.5px solid var(--b);border-radius:6px;background:transparent;font-size:11px;cursor:pointer;font-family:inherit;color:var(--t2)">Kapat</button>'
    +'</div></div>';
  document.body.appendChild(mo);
  document.addEventListener('click', function _peek(e){ if(!mo.contains(e.target)){ mo.remove(); document.removeEventListener('click',_peek); } });
};
