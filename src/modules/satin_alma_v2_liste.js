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
  /* ALIS-LISTE-UX-PACK-001: Tedarikçi gruplama aktifse fl'yi tedarikçi adına göre sırala */
  if (window._saV2GruplaAktif) {
    fl.sort(function(a,b){ return (a.tedarikci||'Diğer').localeCompare(b.tedarikci||'Diğer','tr'); });
  }
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
  /* SA-PIPELINE-001b: dropdown tüm aşamalar — SA_PIPELINE_STAGES'tan üret */
  var _durumOpts = '<option value="">Tüm durumlar</option>' + Object.entries(window.SA_PIPELINE_STAGES || {}).sort(function(a,b){ return a[1].sira - b[1].sira; }).map(function(e){ return '<option value="'+e[0]+'">'+e[1].label+'</option>'; }).join('');
  h+='<select id="sav2-durum" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)">'+_durumOpts+'</select>';
  h+='<select id="sav2-ted" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm tedarikçiler</option></select>';
  h+='<select id="sav2-para" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tüm para birimleri</option><option value="USD"'+(paraF==='USD'?' selected':'')+'>USD</option><option value="EUR"'+(paraF==='EUR'?' selected':'')+'>EUR</option><option value="TRY"'+(paraF==='TRY'?' selected':'')+'>TRY</option></select>';
  h+='<select id="sav2-tarih" onchange="event.stopPropagation();window.SAV2_SAYFA=1;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="padding:4px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)"><option value="">Tarihe göre</option><option value="bu-ay"'+(tarihF==='bu-ay'?' selected':'')+'>Bu ay</option><option value="hafta"'+(tarihF==='hafta'?' selected':'')+'>Bu hafta</option></select>';
  h+='<div style="flex:1"></div>';
  h+='<button onclick="event.stopPropagation();window._saV2ExportCSV()" style="padding:4px 10px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)">↓ CSV</button>';
  /* SATINALMA-V2-FEATURE-PACK-001: Tedarikçi karşılaştır butonu */
  h+='<button onclick="event.stopPropagation();window._saV2TedarikciKarsilastir()" style="padding:4px 10px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;font-size:10px;flex-shrink:0;font-family:inherit;color:var(--color-text-secondary)">Tedarikçi Karşılaştır</button>';
  /* ALIS-LISTE-UX-PACK-001: Tedarikçi gruplama toggle butonu */
  h+='<button onclick="event.stopPropagation();window._saV2GruplaToggle?.()" id="sav2-grupla-btn" style="padding:4px 10px;border:0.5px solid var(--color-border-secondary);border-radius:5px;background:'+(window._saV2GruplaAktif?'var(--color-text-primary)':'transparent')+';cursor:pointer;font-size:10px;flex-shrink:0;font-family:inherit;color:'+(window._saV2GruplaAktif?'#fff':'var(--color-text-secondary)')+'">Tedarikçi Grupla</button>';
  h+='</div>';
  if(seciliSay>0){
    h+='<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:#FAEEDA;border-bottom:0.5px solid #854F0B">';
    h+='<span style="font-size:10px;color:#633806;font-weight:500">'+seciliSay+' seçildi</span>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluOnayla()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--color-border-secondary);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">✓ Onayla</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluReddet()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">✕ Reddet</button>';
    h+='<button onclick="event.stopPropagation();window._saV2TopluSil()" style="font-size:9px;padding:2px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>';
    /* SATINALMA-V2-FEATURE-PACK-001: Toplu Excel export butonu */
    h+='<button onclick="event.stopPropagation();window._saV2TopluExcel()" style="font-size:9px;padding:2px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">↓ Excel</button>';
    h+='</div>';
  }
  /* SATINALMA-LISTE-GENISLIK-001: wrapper min-width:0 + detay kapalıysa border-right gizle */
  /* SA-LISTE-REDESIGN-001: sağ panel kaldırıldı — tek kolon */
  h+='<div style="display:flex;flex:1;min-width:0;min-height:0;overflow:hidden">';
  h+='<div style="flex:1;min-width:0;overflow-y:auto">';
  /* ALIS-LISTE-UX-PACK-001: 7 sütun grid (KAR % eklendi: TUTAR ↔ DURUM arası) */
  h+='<div style="display:grid;grid-template-columns:20px minmax(180px,1fr) 88px 110px 80px 120px 72px 52px;padding:5px 16px;background:var(--color-background-secondary);border-bottom:0.5px solid '+_b+';position:sticky;top:0;z-index:1">';
  var _th=function(label,alan){
    var aktif=sir.alan===alan;
    var yon=aktif?(sir.yon==='asc'?'↑':'↓'):'↕';
    return '<div onclick="event.stopPropagation();window._saV2ListeSirala={alan:\''+alan+'\',yon:\''+(aktif&&sir.yon==='asc'?'desc':'asc')+'\'};window.renderSatinAlmaV2()" style="font-size:10px;font-weight:500;color:'+(aktif?'var(--color-text-primary)':'var(--color-text-tertiary)')+';letter-spacing:.04em;cursor:pointer">'+label+' '+yon+'</div>';
  };
  h+='<div></div>';
  h+=_th('ÜRÜN / TEDARİKÇİ','urunAdi');
  h+=_th('AÇILIŞ','createdAt');
  h+=_th('TUTAR','toplamTutar');
  h+='<div style="font-size:10px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em;text-align:right">KUR (TRY)</div>';
  h+=_th('AŞAMA','durum');
  h+='<div style="font-size:10px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.04em;text-align:center">SÜRE</div>';
  h+='<div></div>';
  h+='</div>';
  /* ALIS-LISTE-UX-PACK-001: Gruplama aktifse tedarikçi başlık satırları */
  var _grpOnceki = '';
  goster.forEach(function(t){
    if (window._saV2GruplaAktif) {
      var _grpAd = t.tedarikci || 'Diğer';
      if (_grpAd !== _grpOnceki) {
        _grpOnceki = _grpAd;
        var _grpItems = fl.filter(function(x) { return (x.tedarikci || 'Diğer') === _grpAd; });
        var _grpTutar = _grpItems.reduce(function(s,x) { return s + (parseFloat(x.toplamTutar) || parseFloat(window._saV2AlisF?.(x)) || 0); }, 0);
        h+='<div style="padding:8px 12px;background:var(--color-background-secondary);border-bottom:0.5px solid '+_b+';font-size:10px;font-weight:600;color:var(--color-text-primary)">📦 '+(window._esc?.(_grpAd)||_grpAd)+' <span style="color:var(--color-text-tertiary);font-weight:400;margin-left:6px">('+_grpItems.length+' teklif · '+_grpTutar.toLocaleString('tr-TR',{maximumFractionDigits:0})+')</span></div>';
      }
    }
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
    /* ALIS-LISTE-UX-PACK-001: süre dolumu satır rengi (2 gün=kırmızı, 7 gün=sarı) */
    var _gunKalan = _gecerlilik ? Math.floor((new Date(_gecerlilik) - new Date()) / 86400000) : 999;
    var _satirBg = aktif ? '#E6F1FB' : secili ? '#FFFCF5' : (_gunKalan <= 2 ? '#FCEBEB' : _gunKalan <= 7 ? '#FAEEDA' : 'var(--color-background-primary)');
    h+='<div onclick="event.stopPropagation();window._saV2AktifId=\''+t.id+'\';window.renderSatinAlmaV2()" style="display:grid;grid-template-columns:20px minmax(180px,1fr) 88px 110px 80px 120px 72px 52px;padding:8px 16px;border-bottom:0.5px solid '+_b+';border-left:'+_solBorder+';align-items:center;cursor:pointer;background:'+_satirBg+'" onmouseover="if(!'+aktif+')this.style.background=\'var(--color-background-secondary)\'" onmouseout="if(!'+aktif+')this.style.background=\''+_satirBg+'\'">';
    // Kolon 1: checkbox
    h+='<input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:11px;height:11px;cursor:pointer">';
    // Kolon 2: ürün/tedarikçi adı + jobId + PI rozet alt satır
    // SATINALMA-LISTE-XSS-001: window._esc ile user-input sanitize
    /* SATIS-LISTE-PI-NO-001: PI no monospace mavi rozet (ürün adı yanında) */
    var _piNoLst = t.piNo || t.pi_no || '';
    var _piHTMLLst = _piNoLst ? ' <span style="font-size:8px;font-family:monospace;color:#185FA5;background:#E6F1FB;padding:1px 4px;border-radius:3px" title="PI No">'+(window._esc?.(_piNoLst)||_piNoLst)+'</span>' : '';
    /* SATINALMA-V2-FEATURE-PACK-001: Rev badge (revNo>1) + Job ID tıklanabilir link */
    var _revHTML = (t.revNo && t.revNo > 1) ? ' <span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-family:monospace">Rev'+t.revNo+'</span>' : '';
    /* SATINALMA-V2-JOB-LINK-FIX-001: _saV2AktifId → _sav2SrchVal (arama filtresi) */
    var _jobHTML = t.jobId
      ? '<span onclick="event.stopPropagation();window._sav2SrchVal=\''+t.jobId+'\';window.SAV2_SAYFA=1;window.renderSatinAlmaV2?.()" style="color:#185FA5;cursor:pointer;font-family:monospace;font-size:9px" title="Job ID → '+(window._esc?.(t.jobId)||t.jobId)+'">'+(window._esc?.(t.jobId)||t.jobId)+'</span>'
      : '<span style="color:var(--color-text-tertiary);font-size:9px">—</span>';
    h+='<div style="min-width:0"><div style="font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(window._esc?.(window._saV2UrunAdi?.(t))||window._saV2UrunAdi?.(t)||'—')+(t.urunler&&t.urunler.length>1?' <span style="font-size:8px;background:#E6F1FB;color:#0C447C;padding:1px 4px;border-radius:6px">+'+( t.urunler.length-1)+'</span>':'')+_piHTMLLst+_revHTML+'</div>';
    h+='<div style="font-size:10px;color:var(--color-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(window._esc?.(t.tedarikci)||t.tedarikci||'—')+' · '+_jobHTML+'</div></div>';
    // Kolon 3: tutar + para birimi soluk
    /* SA-LISTE-REDESIGN-001: Açılış hücresi (tarih+saat) */
    var _acT=t.createdAt||t.teklifTarih||'';
    var _acGun=_acT?new Date(_acT).toLocaleDateString('tr-TR',{day:'2-digit',month:'short'}):'—';
    var _acSaat=_acT?(_acT.length>10?_acT.slice(11,16):''):'';
    h+='<div style="text-align:center"><div style="font-size:11px;color:var(--color-text-secondary)">'+_acGun+'</div><div style="font-size:10px;color:var(--color-text-tertiary)">'+_acSaat+'</div></div>';
    /* SA-LISTE-REDESIGN-001: TUTAR + KUR (TRY) hesabı + fiyat trend (KUR cell'e gömülür) */
    var _alisFN=parseFloat(window._saV2AlisF?.(t))||0;
    var _paraN=window._saV2Para?.(t)||'TRY';
    var _kurN=(_paraN!=='TRY'&&window._saKur&&window._saKur[_paraN])?Math.round(_alisFN*parseFloat(window._saKur[_paraN])):null;
    /* SA-LISTE-REDESIGN-001 (fix): trend KUR cell içinde, grid-cell sayısı aligned (8/8) */
    /* SA-TREND-FIX-001: aynı para birimi kıyası — USD/TRY karışımı sahte yüzde üretiyordu */
    var _oncF=liste.filter(function(x){return x.id!==t.id&&x.jobId&&x.jobId===t.jobId&&!x.isDeleted&&(window._saV2Para?.(x)||'USD')===(window._saV2Para?.(t)||'USD');}).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
    var _oncFiyat=_oncF.length?parseFloat(window._saV2AlisF?.(_oncF[0]))||0:0;
    var _trendHTML='';
    if(_oncFiyat>0&&_alisFN>0){var _trendPct=Math.round(((_alisFN-_oncFiyat)/_oncFiyat)*100);var _trendRenk=_trendPct<0?'#0F6E56':_trendPct>0?'#A32D2D':'var(--color-text-tertiary)';_trendHTML='<div style="font-size:9px;font-weight:500;color:'+_trendRenk+'">'+(_trendPct<=0?'↓':'↑')+Math.abs(_trendPct)+'%</div>';}
    h+='<div style="font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap">'+((window._saV2AlisF?.(t)||parseFloat(t.toplamTutar)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}))+' <span style="font-size:9px;color:var(--color-text-tertiary);font-weight:400">'+(window._saV2Para?.(t)||t.toplamPara||'USD')+'</span></div>';
    h+='<div style="text-align:right"><div style="font-size:10px;color:var(--color-text-tertiary)">'+(_kurN?_kurN.toLocaleString('tr-TR')+'₺':'—')+'</div>'+_trendHTML+'</div>';
    // Kolon 5: durum badge + geçerlilik badge (mevcut _bittiBadge/_uyariIkon mantığı korunsun)
    /* SA-PIPELINE-001b: badge renk/label SA_PIPELINE_STAGES'tan, fallback eski renkler */
    var _stageInfo = window.SA_PIPELINE_STAGES?.[durum] || null;
    var _bgColor = _stageInfo ? _stageInfo.renk + '22' : (durum==='onaylandi'?'#E1F5EE':durum==='reddedildi'?'#FCEBEB':'#FAEEDA');
    var _fgColor = _stageInfo ? _stageInfo.renk : (durum==='onaylandi'?'#085041':durum==='reddedildi'?'#791F1F':'#633806');
    var _stLbl = _stageInfo ? _stageInfo.label : durum;
    var _bittiBadge=_sureBitti?' <span style="font-size:8px;padding:2px 6px;border-radius:8px;background:#FCEBEB;color:#A32D2D;font-weight:600;white-space:nowrap" title="Süresi doldu: '+_gecerlilik+'">Süresi Doldu</span>':'';
    var _uyariIkon=_sureUyari?' <span title="Gecerlilik 7 gun icinde dolacak: '+_gecerlilik+'" style="color:#D97706;font-size:10px;cursor:help">⚠</span>':'';
    /* SA-PIPELINE-001b: pipeline timer göstergesi */
    var _pipelineKalan = (typeof window._saPipelineTimerKalan === 'function') ? window._saPipelineTimerKalan(t) : null;
    var _timerHTML = _pipelineKalan === null ? '' : _pipelineKalan > 0
      ? '<div style="font-size:9px;color:var(--color-text-tertiary)">⏱ '+Math.ceil(_pipelineKalan)+'h kaldı</div>'
      : '<div style="font-size:9px;padding:2px 5px;border-radius:6px;background:#FCEBEB;color:#A32D2D;font-weight:600;display:inline-block">⚠ Süre doldu</div>';
    /* SA-LISTE-REDESIGN-001: AŞAMA pill büyük, tek div */
    h+='<div><span style="font-size:9px;padding:2px 8px;border-radius:20px;white-space:nowrap;font-weight:500;background:'+_bgColor+';color:'+_fgColor+'">'+_stLbl+'</span>'+(_bittiBadge||'')+'</div>';
    // Kolon 5: GEÇERLİLİK — satisMusteriOnay ise kalan saat (renk kademeli), yoksa tarih
    /* SA-LISTE-REDESIGN-001: SÜRE hücresi — pipeline timer */
    var _pKalan=typeof window._saPipelineTimerKalan==='function'?window._saPipelineTimerKalan(t):null;
    h+=_pKalan===null?'<div style="font-size:10px;color:var(--color-text-tertiary);text-align:center">—</div>':_pKalan>0?'<div style="font-size:10px;font-weight:500;color:#854F0B;text-align:center">⏱ '+Math.ceil(_pKalan)+'h</div>':'<div style="font-size:10px;font-weight:600;color:#A32D2D;text-align:center">⚠ doldu</div>';
    // Kolon 6: İŞLEM — satisMusteriOnay ise sadece "Onaya Sun", değilse "Satış" + "···"
    /* SA-LISTE-REDESIGN-001: İŞLEM kolonu sadeleştirildi — Satış/PI/KAR kaldırıldı, tedarikçi mesajı eklendi */
    var _msgM=[(window._saV2UrunAdi?.(t)||'Ürün'),(t.tedarikci||'—'),(_alisFN.toLocaleString('tr-TR')+' '+_paraN),('Teslimat: '+(t.teslimYeri||'—'))].join(' | ').replace(/[\u0027\u0060]/g,'');
    h+='<div style="display:flex;gap:2px;justify-content:flex-end">';
    if(t.satisMusteriOnay===true){h+='<button onclick="event.stopPropagation();window._saV2OnayaSun?.(\''+t.id+'\')" style="font-size:9px;padding:3px 8px;border:none;border-radius:5px;background:#D97706;color:#fff;font-weight:600;cursor:pointer;font-family:inherit">Sun</button>';}
    h+='<button onclick="event.stopPropagation();window._saV2PeekPanel(\''+t.id+'\')" style="font-size:10px;padding:3px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;color:var(--color-text-secondary);font-family:inherit">···</button>';
    h+='<button onclick="event.stopPropagation();navigator.clipboard?.writeText(\''+_msgM+'\');window.toast?.(\'Kopyalandı\',\'ok\')" title="Tedarikçi mesajı kopyala" style="font-size:10px;padding:3px 8px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;color:var(--color-text-tertiary);font-family:inherit">✉</button>';
    h+='</div>';
    h+='</div>';
    if(t.urunler&&t.urunler.length>1){
      t.urunler.forEach(function(u,idx){
        /* ALIS-LISTE-UX-PACK-001: child row 7-col grid (KAR % boş hücre) */
        h+='<div style="display:grid;grid-template-columns:20px minmax(180px,1fr) 88px 110px 80px 120px 72px 52px;padding:3px 16px 3px 28px;border-bottom:0.5px solid '+_b+';background:var(--color-background-secondary);align-items:center">';
        // SAV2-GRUP-CB-001: grup ürün satırına checkbox — parent t.id state'ine bind
        h+='<div style="font-size:9px;display:flex;align-items:center;gap:2px"><input type="checkbox" '+(secili?'checked':'')+' onchange="event.stopPropagation();window._saV2ListeSecili=window._saV2ListeSecili||{};window._saV2ListeSecili[\''+t.id+'\']=this.checked;window.renderSatinAlmaV2()" onclick="event.stopPropagation()" style="width:10px;height:10px;cursor:pointer;flex-shrink:0"><span style="color:var(--color-text-tertiary)">'+(idx+1)+'.</span></div>';
        // SATINALMA-LISTE-XSS-002: ürün alt satırında window._esc sarmalama
        h+='<div style="font-size:9px;color:var(--color-text-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(window._esc?.(u.urunAdi||u.turkceAdi||u.duayKodu)||u.urunAdi||u.turkceAdi||u.duayKodu||'—')+'</div>';
        h+='<div style="font-size:9px;color:#0F6E56;white-space:nowrap">'+(u.alisF||'—')+' '+(u.para||'')+'</div>';
        h+='<div></div>';
        h+='<div></div>';
        h+='<div></div>';
        /* SA-LISTE-REDESIGN-001 (fix): 8-col grid için eksik hücre — SÜRE boş */
        h+='<div></div>';
        h+='<button onclick="event.stopPropagation();window._saV2TeklifOlusturUrun(\''+t.id+'\','+idx+')" style="font-size:8px;padding:1px 6px;border:0.5px solid #185FA5;border-radius:3px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">→$</button>';
        h+='</div>';
      });
    }
  });
  h+=window._listHelper?.sayfalama(fl.length,sayfa,boyut,'renderSatinAlmaV2','sav2')||'';
  h+='</div>';
  /* SA-LISTE-REDESIGN-001: sağ detay paneli kaldırıldı — liste tek kolon */
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

/* ALIS-LISTE-UX-PACK-001: Tedarikçi gruplama toggle */
window._saV2GruplaAktif = window._saV2GruplaAktif || false;
window._saV2GruplaToggle = function() {
  window._saV2GruplaAktif = !window._saV2GruplaAktif;
  window.renderSatinAlmaV2?.();
};

/* SATINALMA-V2-FEATURE-PACK-001: Toplu Excel export — seçili tekliflerden 9 kolon xlsx */
window._saV2TopluExcel = function() {
  var secili = Object.keys(window._saV2ListeSecili || {}).filter(function(k) { return window._saV2ListeSecili[k]; });
  if (!secili.length) { window.toast?.('Önce teklif seçin', 'warn'); return; }
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var seciliListe = liste.filter(function(t) { return secili.includes(String(t.id)); });
  /* SATINALMA-V2-CSV-FALLBACK-001: XLSX yoksa CSV indir */
  if (typeof XLSX === 'undefined') {
    var csv = ['Tedarikçi,Ürün,Alış,Para,Miktar,Toplam,Durum,Tarih,Job ID\n'];
    seciliListe.forEach(function(t) {
      csv.push([
        t.tedarikci || '',
        (typeof window._saV2UrunAdi === 'function' ? window._saV2UrunAdi(t) : t.urunAdi) || '',
        t.alisFiyati || t.alisF || '',
        t.para || t.toplamPara || '',
        t.miktar || '',
        t.toplamTutar || '',
        t.durum || '',
        (t.createdAt || '').slice(0, 10),
        t.jobId || ''
      ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',') + '\n');
    });
    var blob = new Blob(csv, { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'alis-teklifleri-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    window.toast?.('CSV indirildi ✓ (' + seciliListe.length + ' teklif)', 'ok');
    return;
  }
  var satirlar = [['Tedarikçi','Ürün','Alış Fiyatı','Para','Miktar','Toplam','Durum','Tarih','Job ID']];
  seciliListe.forEach(function(t) {
    satirlar.push([
      t.tedarikci || '',
      (typeof window._saV2UrunAdi === 'function' ? window._saV2UrunAdi(t) : t.urunAdi) || '',
      t.alisFiyati || t.alisF || '',
      t.para || t.toplamPara || '',
      t.miktar || '',
      t.toplamTutar || '',
      t.durum || '',
      (t.createdAt || '').slice(0, 10),
      t.jobId || ''
    ]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(satirlar);
  XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
  XLSX.writeFile(wb, 'alis-teklifleri-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Excel indirildi ✓ (' + seciliListe.length + ' teklif)', 'ok');
};

/* SATINALMA-V2-FEATURE-PACK-001: Tedarikçi karşılaştır — grup bazlı özet modal */
window._saV2TedarikciKarsilastir = function() {
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load().filter(function(t) { return !t.isDeleted; }) : [];
  var gruplar = {};
  liste.forEach(function(t) {
    var k = t.tedarikci || 'Diğer';
    if (!gruplar[k]) gruplar[k] = { say: 0, toplam: 0 };
    gruplar[k].say++;
    /* SATINALMA-V2-JOB-LINK-FIX-001: para birimi karmasını düzelt — hepsini USD'ye çevir */
    var _ham = parseFloat(t.toplamTutar || 0);
    var _paraX = t.para || t.toplamPara || 'TRY';
    var _usdX = typeof window._saV2KurCevir === 'function' ? window._saV2KurCevir(_ham, _paraX, 'USD') : _ham;
    gruplar[k].toplam += _usdX || 0;
  });
  var esc = window._esc || function(s) { return String(s || ''); };
  var mo = document.createElement('div');
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var satirlar = Object.keys(gruplar).map(function(k) { return [k, gruplar[k]]; })
    .sort(function(a, b) { return b[1].toplam - a[1].toplam; })
    .map(function(e) {
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--color-border-tertiary);font-size:11px">'
        + '<div style="font-weight:500;color:var(--color-text-primary)">' + esc(e[0]) + '</div>'
        + '<div style="display:flex;gap:16px">'
        + '<span style="color:var(--color-text-secondary)">' + e[1].say + ' teklif</span>'
        + '<span style="font-family:monospace;font-weight:500">' + e[1].toplam.toLocaleString('tr-TR', {maximumFractionDigits: 0}) + ' USD</span>'
        + '</div></div>';
    }).join('');
  mo.innerHTML = '<div style="background:var(--color-background-primary);border-radius:12px;width:480px;max-height:70vh;overflow:hidden;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">Tedarikçi Karşılaştırması</div><div style="font-size:9px;color:var(--color-text-tertiary);margin-top:2px">USD eşdeğeri — farklı para birimleri otomatik çevrilir</div></div>'
    + '<button onclick="event.stopPropagation();this.closest(\'[style*=fixed]\').remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--color-text-tertiary)">×</button>'
    + '</div>'
    + '<div style="padding:16px 20px;overflow-y:auto">' + (satirlar || '<div style="padding:20px;text-align:center;color:var(--color-text-tertiary);font-size:11px">Teklif yok</div>') + '</div>'
    + '</div>';
  document.body.appendChild(mo);
};
