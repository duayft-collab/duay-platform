/* satin_alma_v2_liste.js — SA-V2 C Tasarımı Split Panel Liste */
'use strict';

/* ── C Tasarımı Split Panel ──────────────────────────────── */

window._saV2ListeC = true;
window._saV2ListeSirala = window._saV2ListeSirala || {alan:'createdAt',yon:'desc'};
window._saV2ListeSecili = window._saV2ListeSecili || {};
window._saV2AktifId = window._saV2AktifId || null;

window.renderSatinAlmaV2 = function() {
  var cont = document.getElementById('panel-satin-alma');
  if(!cont) return;
  var liste = typeof window._saV2Load==='function'?window._saV2Load():[];
  var srch = (window._sav2SrchVal||'').toLowerCase();
  var durumF = document.getElementById('sav2-durum')?.value||'';
  var tedF = document.getElementById('sav2-ted')?.value||'';
  var tarihF = document.getElementById('sav2-tarih')?.value||'';
  var bugAy = new Date().toISOString().slice(0,7);
  var buHafta = new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10);
  var fl = liste.filter(function(t){
    if(t.isDeleted) return false;
    if(srch&&!((t.tedarikci||'').toLowerCase().includes(srch)||(window._saV2UrunAdi?.(t)||'').toLowerCase().includes(srch)||(window._saV2DuayKodu?.(t)||'').toLowerCase().includes(srch)||(t.jobId||'').toLowerCase().includes(srch)||(t.piNo||'').toLowerCase().includes(srch))) return false;
    if(durumF&&t.durum!==durumF) return false;
    if(tedF&&t.tedarikci!==tedF) return false;
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
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:10px 12px;border-bottom:0.5px solid '+_b+'">';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">BU AY TEKLİF</div><div style="font-size:18px;font-weight:500;color:var(--color-text-primary)">'+fl.length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">BEKLEYEN</div><div style="font-size:18px;font-weight:500;color:#854F0B">'+fl.filter(function(t){return t.durum==='bekleyen';}).length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">ONAYLI</div><div style="font-size:18px;font-weight:500;color:#0F6E56">'+fl.filter(function(t){return t.durum==='onaylandi';}).length+'</div></div>';
  h+='<div style="background:var(--color-background-secondary);border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:var(--color-text-tertiary)">TOPLAM</div><div style="font-size:14px;font-weight:500;color:var(--color-text-primary)">'+kpiToplam.toLocaleString('tr-TR',{maximumFractionDigits:0})+'</div></div>';
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:0.5px solid '+_b+';flex-wrap:wrap">';
  h+='<button onclick="event.stopPropagation();window._saV2YeniTeklif()" style="padding:5px 12px;border:none;border-radius:5px;background:var(--color-text-primary);color:#ffffff;cursor:pointer;font-size:10px;font-weight:500;font-family:inherit">+ Yeni Teklif</button>';
  h+='<input id="sav2-srch" value="'+(window._sav2SrchVal||'')+'" placeholder="Ara..." oninput="event.stopPropagation();window._sav2SrchVal=this.value;window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;width:160px;font-family:inherit;color:var(--color-text-primary)">';
  h+='<select id="sav2-durum" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm durumlar</option><option value="bekleyen">Bekleyen</option><option value="onaylandi">Onaylı</option><option value="reddedildi">Reddedildi</option></select>';
  h+='<select id="sav2-ted" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm tedarikçiler</option></select>';
  h+='<div style="flex:1"></div>';
  h+='<button onclick="event.stopPropagation();window._saV2ExportCSV()" style="padding:4px 10px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;font-size:10px;font-family:inherit;color:var(--color-text-secondary)">↓ CSV</button>';
  h+='</div>';
  if(seciliSay>0){
    h+='<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:#FAEEDA;border-bottom:0.5px solid #854F0B">';
    h+='<span style="font-size:10px;color:#633806;font-weight:500">'+seciliSay+' seçildi</span>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluOnayla()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--color-border-secondary);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">✓ Onayla</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluReddet()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">✕ Reddet</button>';
    h+='<button onclick="event.stopPropagation();window._saV2BulkSatisEkle?.()" style="font-size:9px;padding:2px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">+ Satış Teklifine Ekle</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluSil()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>';
    h+='</div>';
  }
  h+='<div style="display:flex;flex:1;min-height:0;overflow:hidden">';
  h+='<div style="flex:1;min-width:0;overflow-y:auto;border-right:0.5px solid '+_b+'">';
  h+='<div style="display:grid;grid-template-columns:20px 1fr 80px 70px;padding:5px 10px;background:var(--color-background-secondary);border-bottom:0.5px solid '+_b+';position:sticky;top:0;z-index:1">';
  var _th=function(label,alan){
    var aktif=sir.alan===alan;
    var yon=aktif?(sir.yon==='asc'?'↑':'↓'):'↕';
    return '<div onclick="event.stopPropagation();window._saV2ListeSirala={alan:\''+alan+'\',yon:\''+(aktif&&sir.yon==='asc'?'desc':'asc')+'\'};window.renderSatinAlmaV2()" style="font-size:9px;font-weight:500;color:'+(aktif?'var(--color-text-primary)':'var(--color-text-tertiary)')+';letter-spacing:.04em;cursor:pointer">'+label+' '+yon+'</div>';
  };
  h+='<div></div>';
  h+=_th('ÜRÜN / TEDARİKÇİ','createdAt');
  h+=_th('FİYAT','toplamTutar');
  h+='<div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em">DURUM</div>';
  h+='</div>';
  goster.forEach(function(t){
    var aktif=String(t.id)===String(window._saV2AktifId);
    var secili=window._saV2ListeSecili&&window._saV2ListeSecili[t.id];
    var durum=t.durum||'bekleyen';
    var solRenk=durum==='onaylandi'?'#0F6E56':durum==='reddedildi'?'#A32D2D':'#854F0B';
    h+='<div onclick="event.stopPropagation();window._saV2AktifId=\''+t.id+'\';window.renderSatinAlmaV2()" style="display:grid;grid-template-columns:20px 1fr 80px 70px;padding:7px 10px;border-bottom:0.5px solid '+_b+';border-left:2px solid '+(aktif?'#185FA5':solRenk)+';align-items:center;cursor:pointer;background:'+(aktif?'#E6F1FB':secili?'#FFFCF5':'var(--color-background-primary)')+'" onmouseover="if(!'+aktif+')this.style.background=\'var(--color-background-secondary)\'" onmouseout="if(!'+aktif+')this.style.background=\''+(secili?'#FFFCF5':'var(--color-background-primary)')+'\'">';
    h+='<input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:11px;height:11px;cursor:pointer">';
    h+='<div style="min-width:0"><div style="font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(window._saEsc?_saEsc(window._saV2UrunAdi?.(t)||'—'):window._saV2UrunAdi?.(t)||'—')+(t.urunler&&t.urunler.length>1?' <span style="font-size:8px;background:#E6F1FB;color:#0C447C;padding:1px 4px;border-radius:6px">+'+( t.urunler.length-1)+'</span>':'')+'</div>';
    h+='<div style="font-size:9px;color:var(--color-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(t.tedarikci||'—')+' · '+(t.jobId||'—')+'</div></div>';
    h+='<div style="font-size:10px;font-weight:500;color:#0F6E56">'+((window._saV2AlisF?.(t)||0).toLocaleString('tr-TR',{maximumFractionDigits:2}))+' '+(window._saV2Para?.(t)||'USD')+'</div>';
    h+='<span style="font-size:8px;padding:2px 6px;border-radius:8px;white-space:nowrap;background:'+(durum==='onaylandi'?'#E1F5EE':durum==='reddedildi'?'#FCEBEB':'#FAEEDA')+';color:'+(durum==='onaylandi'?'#085041':durum==='reddedildi'?'#791F1F':'#633806')+'">'+durum+'</span>';
    h+='</div>';
    if(t.urunler&&t.urunler.length>1){
      t.urunler.forEach(function(u,idx){
        h+='<div style="display:grid;grid-template-columns:20px 1fr 80px 70px;padding:3px 10px 3px 24px;border-bottom:0.5px solid '+_b+';background:var(--color-background-secondary);align-items:center">';
        // SAV2-GRUP-CB-001: grup ürün satırına checkbox — parent t.id state'ine bind
        h+='<div style="font-size:9px;display:flex;align-items:center;gap:2px"><input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:10px;height:10px;cursor:pointer;flex-shrink:0"><span style="color:var(--color-text-tertiary)">'+(idx+1)+'.</span></div>';
        h+='<div style="font-size:9px;color:var(--color-text-secondary)">'+(u.urunAdi||u.turkceAdi||u.duayKodu||'—')+'</div>';
        h+='<div style="font-size:9px;color:#0F6E56">'+(u.alisF||'—')+' '+(u.para||'')+'</div>';
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
  var solRenk=durum==='onaylandi'?'#0F6E56':durum==='reddedildi'?'#A32D2D':'#854F0B';
  var h='<div style="border-left:2px solid '+solRenk+'">';
  h+='<div style="padding:12px 14px;border-bottom:0.5px solid '+_b+';background:var(--color-background-secondary)">';
  var gorsel=t.gorsel||(t.urunler&&t.urunler[0]?.gorsel)||'';
  if(gorsel) h+='<img src="'+gorsel+'" style="width:48px;height:48px;border-radius:6px;object-fit:cover;float:right;margin-left:8px">';
  h+='<div style="font-size:12px;font-weight:500;color:var(--color-text-primary)">'+(window._saV2UrunAdi?.(t)||'—')+'</div>';
  h+='<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:2px">'+(window._saV2DuayKodu?.(t)||'—')+' · '+(t.tedarikci||'—')+'</div>';
  h+='<div style="margin-top:6px"><span style="font-size:8px;padding:2px 6px;border-radius:8px;background:'+(durum==='onaylandi'?'#E1F5EE':durum==='reddedildi'?'#FCEBEB':'#FAEEDA')+';color:'+(durum==='onaylandi'?'#085041':durum==='reddedildi'?'#791F1F':'#633806')+'">'+durum+'</span></div>';
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
  if(_canSatis) h+='<button onclick="event.stopPropagation();window._saV2TeklifOlustur(\''+t.id+'\')" style="padding:7px;border:none;border-radius:5px;background:#185FA5;color:#fff;font-size:10px;cursor:pointer;font-weight:500;font-family:inherit">Satış Teklifi Oluştur</button>';
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
