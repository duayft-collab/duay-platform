
window._mvCSVExport = function() {
  var islemler = window._mvSonIslemler||[];
  if(!islemler.length){window.toast?.('Önce Excel yükleyin','warn');return;}
  var satirlar = ['Hesap\tTarih\tTip\tFiş No\tAçıklama\tBorç\tAlacak\tBakiye\tB/A'];
  islemler.forEach(function(i){
    satirlar.push([i.hesap,i.tarih,i.tip,i.fisNo,i.aciklama,i.borc,i.alacak,i.bakiye,i.ba].join('\t'));
  });
  var blob = new Blob(['\uFEFF'+satirlar.join('\n')],{type:'text/csv;charset=utf-8'});
  var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='muavin_islem_listesi_'+(window._mvDonem||'export')+'.csv';
  a.click(); URL.revokeObjectURL(a.href);
  window.toast?.('CSV indirildi: '+islemler.length+' işlem','ok');
};

window._mvXLSMExport = function() {
  var islemler = window._mvSonIslemler||[];
  if(!islemler.length){window.toast?.('Önce Excel yükleyin','warn');return;}
  if(typeof XLSX==='undefined'){window.toast?.('SheetJS yüklenmedi','err');return;}
  var baslik = ['TARİH','TİP','FİŞ NO','AÇIKLAMA','BORÇ','ALACAK','BAKİYE','B/A','BORÇ(DÖV)','ALACAK(DÖV)','BAKİYE(DÖV)','B/A(DÖV)','CARİ ADI'];
  var satirlar = [baslik];
  islemler.forEach(function(i){
    satirlar.push([i.tarih,i.tip,i.fisNo,i.aciklama.replace(/&lt;/g,'<').replace(/&gt;/g,'>'),i.borc||'',i.alacak||'',i.bakiye||'',i.ba,i.borcDov||'',i.alacakDov||'',i.bakiyeDov||'',i.baDov,i.cari]);
  });
  var ws = XLSX.utils.aoa_to_sheet(satirlar);
  ws['!cols'] = [{wch:12},{wch:8},{wch:10},{wch:60},{wch:14},{wch:14},{wch:14},{wch:5},{wch:14},{wch:14},{wch:14},{wch:5},{wch:40}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Muavin');
  var donem = window._mvDonem || 'export';
  XLSX.writeFile(wb, 'muavin_'+donem+'.xlsx', {bookType:'xlsx'});
  window.toast?.('Excel indirildi: '+islemler.length+' işlem','ok');
};

window._mvAra = function(deger) {
  var tbody = document.getElementById('mv-islem-tbody');
  if(!tbody) return;
  var f = deger.toLowerCase().trim();
  var islemler = window._mvSonIslemler||[];
  if(!f){ tbody.innerHTML = window._mvIslemSatirHTML(islemler); var s=document.getElementById('mv-ara-sonuc'); if(s) s.textContent=''; return; }
  var filtre = islemler.filter(function(i){
    return (
      (i.tarih||'').toLowerCase().includes(f) ||
      (i.tip||'').toLowerCase().includes(f) ||
      (i.fisNo||'').toLowerCase().includes(f) ||
      (i.aciklama||'').toLowerCase().includes(f) ||
      (i.cari||'').toLowerCase().includes(f) ||
      String(i.borc||'').includes(f) ||
      String(i.alacak||'').includes(f) ||
      String(i.bakiye||'').includes(f) ||
      String(i.borcDov||'').includes(f) ||
      String(i.alacakDov||'').includes(f) ||
      (i.ba||'').toLowerCase()===f
    );
  });
  var sonuc = document.getElementById('mv-ara-sonuc');
  if(sonuc) sonuc.textContent = filtre.length+' sonuç / '+islemler.length+' işlem';
  tbody.innerHTML = window._mvIslemSatirHTML(filtre);
};

window._mvIslemSatirHTML = function(islemler) {
  if(!islemler.length) return '<tr><td colspan="13" style="padding:20px;text-align:center;color:var(--t3)">Sonuç bulunamadı</td></tr>';
  return islemler.map(function(i){
    return '<tr style="border-bottom:0.5px solid var(--b)">'
      +'<td style="padding:4px 6px;white-space:nowrap;text-align:right">'+i.tarih+'</td>'
      +'<td style="padding:4px 6px;color:var(--t3);text-align:right">'+i.tip+'</td>'
      +'<td style="padding:4px 6px;font-family:monospace;text-align:right">'+i.fisNo+'</td>'
      +'<td style="padding:4px 6px;color:var(--t2);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(i.aciklama||'')+'">'+i.aciklama+'</td>'
      +'<td style="padding:4px 6px;text-align:right;color:'+(i.borc?'#A32D2D':'var(--t3)')+'">'+(i.borc?i.borc.toLocaleString('tr-TR'):'')+'</td>'
      +'<td style="padding:4px 6px;text-align:right;color:'+(i.alacak?'#0F6E56':'var(--t3)')+'">'+(i.alacak?i.alacak.toLocaleString('tr-TR'):'')+'</td>'
      +'<td style="padding:4px 6px;text-align:right;font-weight:500">'+(i.bakiye||0).toLocaleString('tr-TR')+'</td>'
      +'<td style="padding:4px 6px;text-align:center;color:'+(i.ba==='A'?'#0F6E56':'#A32D2D')+'">'+i.ba+'</td>'
      +'<td style="padding:4px 6px;text-align:right;color:var(--t3)">'+(i.borcDov?i.borcDov.toLocaleString('tr-TR'):'')+'</td>'
      +'<td style="padding:4px 6px;text-align:right;color:var(--t3)">'+(i.alacakDov?i.alacakDov.toLocaleString('tr-TR'):'')+'</td>'
      +'<td style="padding:4px 6px;text-align:right;color:var(--t3)">'+(i.bakiyeDov?i.bakiyeDov.toLocaleString('tr-TR'):'')+'</td>'
      +'<td style="padding:4px 6px;text-align:center;color:'+(i.baDov==='A'?'#0F6E56':'#A32D2D')+'">'+(i.baDov||'')+'</td>'
      +'<td style="padding:4px 6px;color:var(--t2);white-space:nowrap">'+(i.cari||'')+'</td>'
      +'</tr>';
  }).join('');
};


/* ── MUAVIN-009: Hesap Ağacı Görünümü ──────────────────────── */
window._mvAgacHTML = function() {
  var hesaplar = window._mvSonHesaplar || {};
  if (!Object.keys(hesaplar).length) return '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Önce Excel yükleyin</div>';
  var gruplar = {};
  Object.keys(hesaplar).forEach(function(k) {
    var h = hesaplar[k];
    var anaKod = k.split(/[\s\.\-]/)[0].slice(0, 1);
    var anaAd = (typeof _mvHesapKategori !== 'undefined' ? _mvHesapKategori[anaKod] : null) || ('Grup ' + anaKod);
    if (!gruplar[anaKod]) gruplar[anaKod] = { ad: anaAd, hesaplar: [], borc: 0, alacak: 0 };
    gruplar[anaKod].hesaplar.push(h);
    gruplar[anaKod].borc += h.borc || 0;
    gruplar[anaKod].alacak += h.alacak || 0;
  });
  var html = '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-top:16px">';
  html += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Hesap Ağacı</div>';
  Object.keys(gruplar).sort().forEach(function(gk) {
    var g = gruplar[gk];
    html += '<div style="margin-bottom:8px">';
    html += '<div onclick="event.stopPropagation();var d=document.getElementById(\'mv-agac-' + gk + '\');if(d)d.style.display=d.style.display===\'none\'?\'\':\'none\'" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--s2);border-radius:6px;cursor:pointer">';
    html += '<span style="font-size:11px;font-weight:500;color:var(--t)">' + gk + ' — ' + g.ad + '</span>';
    html += '<span style="font-size:10px;color:var(--t3)">' + g.hesaplar.length + ' hesap · B:' + g.borc.toLocaleString('tr-TR') + ' A:' + g.alacak.toLocaleString('tr-TR') + '</span>';
    html += '</div>';
    html += '<div id="mv-agac-' + gk + '" style="padding-left:16px;margin-top:4px">';
    g.hesaplar.forEach(function(h) {
      var katAd = window._mvHesapKategoriAd?.(h.ad) || '';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-bottom:0.5px solid var(--b)">';
      html += '<div><span style="font-size:10px;font-family:monospace;color:var(--t)">' + (h.ad || '') + '</span>';
      if (katAd) html += ' <span style="font-size:9px;color:var(--t3)">' + katAd + '</span>';
      html += '<span style="font-size:9px;color:var(--t2);margin-left:6px">' + (h.cari || '') + '</span></div>';
      html += '<span style="font-size:10px;color:var(--t3)">' + h.islemler.length + ' işlem</span>';
      html += '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  return html;
};

/* ── MUAVIN-010: Cari Bazlı Özet ───────────────────────────── */
window._mvCariOzetHTML = function() {
  var islemler = window._mvSonIslemler||[];
  if(!islemler.length) return '';
  var cariMap = {};
  islemler.forEach(function(i){
    var c = i.cari||'Bilinmeyen';
    if(!cariMap[c]) cariMap[c]={cari:c,islemSayisi:0,borc:0,alacak:0,bakiye:0};
    cariMap[c].islemSayisi++;
    cariMap[c].borc += i.borc||0;
    cariMap[c].alacak += i.alacak||0;
    cariMap[c].bakiye = i.bakiye||0;
  });
  var sirali = Object.values(cariMap).sort(function(a,b){return (b.borc+b.alacak)-(a.borc+a.alacak);});
  var h='<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-top:16px">';
  h+='<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Cari Bazlı Özet ('+sirali.length+' cari)</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:10px">';
  h+='<thead><tr style="background:var(--s2)"><th style="padding:5px 8px;text-align:left">CARİ ADI</th><th style="padding:5px 8px;text-align:right">İŞLEM</th><th style="padding:5px 8px;text-align:right">BORÇ</th><th style="padding:5px 8px;text-align:right">ALACAK</th><th style="padding:5px 8px;text-align:right">BAKİYE</th></tr></thead><tbody>';
  sirali.forEach(function(c){
    var net = c.borc-c.alacak;
    h+='<tr style="border-bottom:0.5px solid var(--b)">';
    h+='<td style="padding:5px 8px;color:var(--t)">'+c.cari+'</td>';
    h+='<td style="padding:5px 8px;text-align:right;color:var(--t3)">'+c.islemSayisi+'</td>';
    h+='<td style="padding:5px 8px;text-align:right;color:#A32D2D">'+(c.borc?c.borc.toLocaleString('tr-TR'):'—')+'</td>';
    h+='<td style="padding:5px 8px;text-align:right;color:#0F6E56">'+(c.alacak?c.alacak.toLocaleString('tr-TR'):'—')+'</td>';
    h+='<td style="padding:5px 8px;text-align:right;font-weight:500;color:'+(net>0?'#A32D2D':net<0?'#0F6E56':'var(--t3)')+'">'+net.toLocaleString('tr-TR')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
};

/* ── MUAVIN-010: Muhasebeci Notları ─────────────────────────── */
var _mvNotKey = 'ak_muavin_notlar_v1';
window._mvNotKaydet = function() {
  var inp = document.getElementById('mv-not-inp');
  if(!inp||!inp.value.trim()) return;
  var notlar = JSON.parse(localStorage.getItem(_mvNotKey)||'[]');
  notlar.unshift({id:Date.now(),tarih:new Date().toISOString().slice(0,16).replace('T',' '),donem:window._mvDonem||'',not:inp.value.trim(),kullanici:window.CU?.()?.displayName||''});
  if(notlar.length>50) notlar=notlar.slice(0,50);
  localStorage.setItem(_mvNotKey,JSON.stringify(notlar));
  inp.value='';
  window.toast?.('Not kaydedildi','ok');
  window._mvNotPanelGuncelle();
};

window._mvNotPanelGuncelle = function() {
  var panel = document.getElementById('mv-not-panel');
  if(!panel) return;
  var notlar = JSON.parse(localStorage.getItem(_mvNotKey)||'[]');
  var donem = window._mvDonem||'';
  var filtre = notlar.filter(function(n){return !donem||n.donem===donem;});
  panel.innerHTML = filtre.length ? filtre.map(function(n){
    return '<div style="padding:8px 0;border-bottom:0.5px solid var(--b)">'
      +'<div style="font-size:9px;color:var(--t3)">'+n.tarih+(n.kullanici?' · '+n.kullanici:'')+(n.donem?' · '+n.donem:'')+'</div>'
      +'<div style="font-size:11px;color:var(--t);margin-top:2px">'+n.not+'</div>'
      +'</div>';
  }).join('') : '<div style="font-size:10px;color:var(--t3)">Bu dönem için not yok</div>';
};

console.log('[MUAVIN-EXPORT] yüklendi');
