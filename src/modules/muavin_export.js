
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


console.log('[MUAVIN-EXPORT] yüklendi');
