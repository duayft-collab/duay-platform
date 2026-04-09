
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
      +'<td style="padding:4px 6px;font-family:monospace;text-align:right;cursor:pointer;color:#185FA5;text-decoration:underline" onclick="event.stopPropagation();window._mvFisDetayAc(\''+i.fisNo+'\')">'+(i.fisNo||'—')+'</td>'
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

/* ── MUAVIN-011: Sistem vs Excel Fark ──────────────────────── */
window._mvSistemFarkHTML = function() {
  var islemler = window._mvSonIslemler || [];
  if (!islemler.length) return '<div style="padding:20px;text-align:center;color:var(--t3)">Önce Excel yükleyin</div>';
  var donem = window._mvDonem || '';
  var odmler = typeof window.loadOdm === 'function' ? window.loadOdm() : [];
  var yil = parseInt(donem); var q = parseInt((donem || '').replace(/^\d{4}Q/, ''));
  var ayBas = (q - 1) * 3; var ayBit = ayBas + 2;
  var donemOdm = odmler.filter(function(o) {
    if (o.isDeleted) return false;
    var t = new Date(o.dueDate || o.createdAt || '');
    return !isNaN(t) && t.getFullYear() === yil && t.getMonth() >= ayBas && t.getMonth() <= ayBit;
  });
  var sistemToplam = donemOdm.reduce(function(s, o) { return s + (parseFloat(o.amountTRY) || parseFloat(o.amount) || 0); }, 0);
  var excelToplam = islemler.reduce(function(s, i) { return s + (i.borc || 0); }, 0);
  var fark = excelToplam - sistemToplam;
  var h = '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px">';
  h += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Sistem vs Excel Karşılaştırma</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">';
  h += '<div style="background:var(--s2);border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">EXCEL TOPLAM</div><div style="font-size:18px;font-weight:500;color:#A32D2D">' + excelToplam.toLocaleString('tr-TR') + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">SİSTEM TOPLAM</div><div style="font-size:18px;font-weight:500;color:#0F6E56">' + sistemToplam.toLocaleString('tr-TR') + '</div></div>';
  h += '<div style="background:' + (Math.abs(fark) < 1 ? '#E1F5EE' : '#FCEBEB') + ';border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">FARK</div><div style="font-size:18px;font-weight:500;color:' + (Math.abs(fark) < 1 ? '#0F6E56' : '#A32D2D') + '">' + fark.toLocaleString('tr-TR') + '</div></div>';
  h += '</div>';
  h += '<div style="font-size:10px;color:var(--t3)">Sistem: ' + donemOdm.length + ' ödeme kaydı · Excel: ' + islemler.length + ' işlem · Dönem: ' + donem + '</div>';
  h += '</div>';
  return h;
};

/* ── MUAVIN-011: PDF Özet Raporu ──────────────────────────── */
window._mvPDFRaporu = function() {
  var islemler = window._mvSonIslemler || [];
  if (!islemler.length) { window.toast?.('Önce Excel yükleyin', 'warn'); return; }
  var donem = window._mvDonem || 'export';
  var topBorc = islemler.reduce(function(s, i) { return s + (i.borc || 0); }, 0);
  var topAlacak = islemler.reduce(function(s, i) { return s + (i.alacak || 0); }, 0);
  var net = topBorc - topAlacak;
  var hesaplar = window._mvSonHesaplar || {};
  var tarih = new Date().toLocaleDateString('tr-TR');
  var html = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Muavin Raporu ' + donem + '</title>';
  html += '<style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html += '.baslik{text-align:center;margin-bottom:20px}.baslik h1{font-size:18px;margin:0}.baslik p{color:#555;margin:4px 0}';
  html += '.kpi{display:flex;gap:16px;margin-bottom:20px}.kpi-kart{border:1px solid #ddd;border-radius:6px;padding:10px 16px;flex:1;text-align:center}.kpi-kart .lbl{font-size:9px;color:#888;text-transform:uppercase}.kpi-kart .val{font-size:20px;font-weight:bold;margin-top:2px}';
  html += 'table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ddd;padding:5px 8px;font-size:10px}th{background:#f5f5f5;font-weight:bold}';
  html += '.imza{display:flex;justify-content:space-between;margin-top:40px}.imza-alan{text-align:center;width:200px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html += '</style></head><body>';
  html += '<div class="baslik"><h1>MUAVİN DEFTER KONTROL RAPORU</h1>';
  html += '<p>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</p>';
  html += '<p>Dönem: ' + donem + ' &nbsp;|&nbsp; Oluşturma: ' + tarih + '</p></div>';
  html += '<div class="kpi">';
  html += '<div class="kpi-kart"><div class="lbl">İşlem Adeti</div><div class="val">' + islemler.length + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Toplam Borç</div><div class="val" style="color:#c00">' + topBorc.toLocaleString('tr-TR') + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Toplam Alacak</div><div class="val" style="color:#060">' + topAlacak.toLocaleString('tr-TR') + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Net Bakiye</div><div class="val" style="color:' + (net > 0 ? '#c00' : '#060') + '">' + net.toLocaleString('tr-TR') + '</div></div>';
  html += '</div>';
  html += '<h3 style="margin-bottom:8px">Hesap Özeti</h3>';
  html += '<table><thead><tr><th>Hesap Kodu</th><th>Cari Adı</th><th>İşlem</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr></thead><tbody>';
  Object.keys(hesaplar).forEach(function(k) {
    var h2 = hesaplar[k];
    html += '<tr><td>' + k + '</td><td>' + (h2.cari || '') + '</td><td style="text-align:center">' + (h2.islemler || []).length + '</td>';
    html += '<td style="text-align:right">' + (h2.borc || 0).toLocaleString('tr-TR') + '</td>';
    html += '<td style="text-align:right">' + (h2.alacak || 0).toLocaleString('tr-TR') + '</td>';
    html += '<td style="text-align:right">' + (h2.bakiye || 0).toLocaleString('tr-TR') + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<div class="imza">';
  html += '<div class="imza-alan"><div class="imza-cizgi">Hazırlayan</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Mali Müşavir</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Yönetim</div></div>';
  html += '</div>';
  html += '</body></html>';
  var win = window.open('', '_blank');
  if (!win) { window.toast?.('Popup engellendi', 'warn'); return; }
  win.document.write(html);
  win.document.close();
  window.toast?.('PDF raporu açıldı', 'ok');
};

/* ── MUAVIN-012: Dönem Karşılaştırma ────────────────────────── */
window._mvDonemKarsilastirHTML = function() {
  var tumKayitlar = typeof _mvLoad==='function'?_mvLoad():[];
  if(!tumKayitlar.length) return '<div style="padding:20px;text-align:center;color:var(--t3)">Henüz karşılaştırma verisi yok</div>';
  var donemler = {};
  tumKayitlar.forEach(function(k){
    if(!k.donem) return;
    if(!donemler[k.donem]) donemler[k.donem]=k;
    else if(k.id>donemler[k.donem].id) donemler[k.donem]=k;
  });
  var sirali = Object.keys(donemler).sort();
  if(sirali.length<2) return '<div style="padding:20px;text-align:center;color:var(--t3)">En az 2 dönem yüklü olmalı (Şu an: '+sirali.length+')</div>';
  var h='<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px">';
  h+='<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Dönem Karşılaştırma — '+sirali.join(' · ')+'</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:10px">';
  h+='<thead><tr style="background:var(--s2)">';
  h+='<th style="padding:6px 8px;text-align:left;border-bottom:0.5px solid var(--b);font-size:9px">HESAP</th>';
  sirali.forEach(function(d){
    h+='<th style="padding:6px 8px;text-align:right;border-bottom:0.5px solid var(--b);font-size:9px">'+d+' BORÇ</th>';
    h+='<th style="padding:6px 8px;text-align:right;border-bottom:0.5px solid var(--b);font-size:9px">'+d+' ALACAK</th>';
  });
  h+='<th style="padding:6px 8px;text-align:right;border-bottom:0.5px solid var(--b);font-size:9px;color:#854F0B">DEĞİŞİM</th>';
  h+='</tr></thead><tbody>';
  var tumHesaplar = {};
  sirali.forEach(function(d){
    var k=donemler[d];
    Object.keys(k.hesaplar||{}).forEach(function(hk){tumHesaplar[hk]=true;});
  });
  Object.keys(tumHesaplar).sort().forEach(function(hk){
    h+='<tr style="border-bottom:0.5px solid var(--b)">';
    h+='<td style="padding:5px 8px;font-family:monospace;font-size:10px">'+hk+'</td>';
    var borclar=[];
    sirali.forEach(function(d){
      var hv=(donemler[d].hesaplar||{})[hk];
      var borc=hv?hv.borc||0:0;
      var alacak=hv?hv.alacak||0:0;
      borclar.push(borc);
      h+='<td style="padding:5px 8px;text-align:right;color:'+(borc?'#A32D2D':'var(--t3)')+'">'+(borc?borc.toLocaleString('tr-TR'):'—')+'</td>';
      h+='<td style="padding:5px 8px;text-align:right;color:'+(alacak?'#0F6E56':'var(--t3)')+'">'+(alacak?alacak.toLocaleString('tr-TR'):'—')+'</td>';
    });
    var degisim = borclar.length>=2 ? borclar[borclar.length-1]-borclar[0] : 0;
    var degisimYuzde = borclar[0] ? Math.round(degisim/borclar[0]*100) : 0;
    h+='<td style="padding:5px 8px;text-align:right;font-weight:500;color:'+(degisim>0?'#A32D2D':degisim<0?'#0F6E56':'var(--t3)')+'">'+(degisim?(degisim>0?'+':'')+degisim.toLocaleString('tr-TR')+' ('+degisimYuzde+'%)':'—')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
};

/* ── MUAVIN-013: Fiş Detay Popup ───────────────────────────── */
window._mvFisDetayAc = function(fisNo) {
  var islemler = window._mvSonIslemler||[];
  var fis = islemler.filter(function(i){return i.fisNo===fisNo;});
  var mevcut = document.getElementById('mv-fis-popup');
  if(mevcut&&mevcut.dataset.fis===fisNo){mevcut.remove();return;}
  if(mevcut) mevcut.remove();
  if(!fis.length) return;
  var topBorc = fis.reduce(function(s,i){return s+(i.borc||0);},0);
  var topAlacak = fis.reduce(function(s,i){return s+(i.alacak||0);},0);
  var p = document.createElement('div');
  p.id = 'mv-fis-popup';
  p.dataset.fis = fisNo;
  p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--sf);border:0.5px solid var(--b);border-radius:10px;z-index:9999;width:560px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)';
  var h='<div style="padding:14px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  h+='<div><div style="font-size:13px;font-weight:500;color:var(--t)">Fiş Detayı</div>';
  h+='<div style="font-size:10px;font-family:monospace;color:var(--t3)">'+fisNo+'</div></div>';
  h+='<button onclick="event.stopPropagation();document.getElementById(\'mv-fis-popup\')?.remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:18px">×</button></div>';
  h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px 18px;border-bottom:0.5px solid var(--b)">';
  h+='<div style="text-align:center"><div style="font-size:9px;color:var(--t3)">İŞLEM</div><div style="font-size:20px;font-weight:500;color:var(--t)">'+fis.length+'</div></div>';
  h+='<div style="text-align:center"><div style="font-size:9px;color:var(--t3)">TOPLAM BORÇ</div><div style="font-size:16px;font-weight:500;color:#A32D2D">'+topBorc.toLocaleString('tr-TR')+'</div></div>';
  h+='<div style="text-align:center"><div style="font-size:9px;color:var(--t3)">TOPLAM ALACAK</div><div style="font-size:16px;font-weight:500;color:#0F6E56">'+topAlacak.toLocaleString('tr-TR')+'</div></div>';
  h+='</div>';
  h+='<table style="width:100%;border-collapse:collapse;font-size:10px">';
  h+='<thead><tr style="background:var(--s2)"><th style="padding:6px 10px;text-align:left;border-bottom:0.5px solid var(--b)">TARİH</th><th style="padding:6px 10px;text-align:left">CARİ</th><th style="padding:6px 10px;text-align:right">BORÇ</th><th style="padding:6px 10px;text-align:right">ALACAK</th><th style="padding:6px 10px;text-align:center">B/A</th></tr></thead><tbody>';
  fis.forEach(function(i){
    h+='<tr style="border-bottom:0.5px solid var(--b)">';
    h+='<td style="padding:5px 10px;white-space:nowrap">'+i.tarih+'</td>';
    h+='<td style="padding:5px 10px;color:var(--t2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+i.cari+'</td>';
    h+='<td style="padding:5px 10px;text-align:right;color:'+(i.borc?'#A32D2D':'var(--t3)')+'">'+(i.borc?i.borc.toLocaleString('tr-TR'):'—')+'</td>';
    h+='<td style="padding:5px 10px;text-align:right;color:'+(i.alacak?'#0F6E56':'var(--t3)')+'">'+(i.alacak?i.alacak.toLocaleString('tr-TR'):'—')+'</td>';
    h+='<td style="padding:5px 10px;text-align:center;color:'+(i.ba==='A'?'#0F6E56':'#A32D2D')+'">'+i.ba+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table>';
  h+='<div style="padding:12px 18px;border-top:0.5px solid var(--b);text-align:right">';
  h+='<button onclick="event.stopPropagation();document.getElementById(\'mv-fis-popup\')?.remove()" style="font-size:11px;padding:6px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Kapat</button>';
  h+='</div>';
  p.innerHTML=h;
  document.body.appendChild(p);
  document.addEventListener('click',function rm(e){if(!p.contains(e.target)){p.remove();document.removeEventListener('click',rm);}});
};

/* ── MUAVIN-013: Tarih Aralığı Filtresi ─────────────────────── */
window._mvTarihFiltrele = function() {
  var bas=document.getElementById('mv-tarih-bas')?.value||'';
  var bit=document.getElementById('mv-tarih-bit')?.value||'';
  var tbody=document.getElementById('mv-islem-tbody');
  if(!tbody) return;
  var islemler=window._mvSonIslemler||[];
  var filtre=islemler.filter(function(i){
    if(!bas&&!bit) return true;
    var t=i.tarih||'';
    var parca=t.split(/[.\-\/]/);
    if(parca.length<3) return true;
    var iso=parca[2]+'-'+(parca[1].length<2?'0':'')+parca[1]+'-'+(parca[0].length<2?'0':'')+parca[0];
    if(bas&&iso<bas) return false;
    if(bit&&iso>bit) return false;
    return true;
  });
  var sonuc=document.getElementById('mv-ara-sonuc');
  if(sonuc) sonuc.textContent=filtre.length+' sonuç / '+islemler.length+' işlem';
  tbody.innerHTML=window._mvIslemSatirHTML?window._mvIslemSatirHTML(filtre):'';
};

/* ── MUAVIN-014: Excel Şablon İndir ────────────────────────── */
window._mvSablonIndir = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('SheetJS yüklenmedi', 'err'); return; }
  var baslik = ['Hesap Kodu + Cari Adı', '', '', '', '', '', '', '', ''];
  var header = ['TARİH', 'TİP', 'FİŞ NO', 'AÇIKLAMA', 'BORÇ (TL)', 'ALACAK (TL)', 'BAKİYE (TL)', 'B/A', 'TİP (TL)'];
  var ornek2 = ['16.05.2025', 'Mahsup', '00210', 'Açıklama metni buraya yazılır', '36857,69', '', '36857,69', 'B', 'TL'];
  var ornek3 = ['30.05.2025', 'Mahsup', '00232', '', '', '124368,53', '87510,84', 'A', 'TL'];
  var nakli = ['', '', '', 'Nakli Yekün Hariç :', '123811,04', '124368,53', '557,49', 'A'];
  var genel = ['', '', '', 'Genel Toplam :', '123811,04', '124368,53', '557,49', 'A'];
  var bos = [];
  var satirlar = [
    baslik, header, ornek2, ornek3, nakli, genel, bos,
    ['320.A02 BAŞKA FİRMA LTD. ŞTİ.'],
    header,
    ['01.06.2025', 'Mahsup', '00310', 'Örnek işlem', '50000', '', '50000', 'B', 'TL'],
    ['', '', '', 'Genel Toplam :', '50000', '0', '50000', 'B']
  ];
  var ws = XLSX.utils.aoa_to_sheet(satirlar);
  ws['!cols'] = [{ wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 5 }, { wch: 5 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Muavin Format');
  XLSX.writeFile(wb, 'muavin_sablon.xlsx');
  window.toast?.('Şablon indirildi — muavin_sablon.xlsx', 'ok');
};

console.log('[MUAVIN-EXPORT] yüklendi');
