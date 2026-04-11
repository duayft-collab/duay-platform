
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
  var editId = inp.dataset.editId;
  if (editId) {
    var idx = notlar.findIndex(function(n){ return String(n.id) === String(editId); });
    if (idx !== -1) { notlar[idx].not = inp.value.trim(); notlar[idx].updatedAt = new Date().toISOString().slice(0,16).replace('T',' '); }
    delete inp.dataset.editId;
    localStorage.setItem(_mvNotKey, JSON.stringify(notlar));
    inp.value = '';
    window.toast && window.toast('Not güncellendi', 'ok');
    window._mvNotPanelGuncelle && window._mvNotPanelGuncelle();
    return;
  }
  notlar.unshift({id: typeof window.generateNumericId === 'function' ? window.generateNumericId() : (typeof window.generateId === 'function' ? window.generateId() : Date.now()),tarih:new Date().toISOString().slice(0,16).replace('T',' '),donem:window._mvDonem||'',not:inp.value.trim(),kullanici:window.CU?.()?.displayName||''});
  if(notlar.length>50) notlar=notlar.slice(0,50);
  localStorage.setItem(_mvNotKey,JSON.stringify(notlar));
  inp.value='';
  window.toast?.('Not kaydedildi','ok');
  window._mvNotPanelGuncelle();
};

window._mvNotSil = function(id) {
  window.confirmModal('Notu Sil', 'Bu not silinecek. Geri alınamaz.', function() {
    var notlar = JSON.parse(localStorage.getItem(_mvNotKey || 'ak_muavin_notlar_v1') || '[]');
    var yeni = notlar.filter(function(n) { return String(n.id) !== String(id); });
    localStorage.setItem(_mvNotKey || 'ak_muavin_notlar_v1', JSON.stringify(yeni));
    window.toast && window.toast('Not silindi', 'ok');
    window._mvNotPanelGuncelle && window._mvNotPanelGuncelle();
  });
};

window._mvNotDuzenle = function(id) {
  var notlar = JSON.parse(localStorage.getItem(_mvNotKey || 'ak_muavin_notlar_v1') || '[]');
  var not = notlar.find(function(n) { return String(n.id) === String(id); });
  if (!not) return;
  var inp = document.getElementById('mv-not-inp');
  if (!inp) return;
  inp.value = not.not || '';
  inp.focus();
  inp.dataset.editId = id;
  window.toast && window.toast('Notu düzenle — kaydet butonuna bas', 'info');
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
      +'<div style="display:flex;gap:4px;margin-top:4px">'
      +'<button onclick="event.stopPropagation();window._mvNotDuzenle(\''+n.id+'\')" style="font-size:10px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Düzenle</button>'
      +'<button onclick="event.stopPropagation();window._mvNotSil(\''+n.id+'\')" style="font-size:10px;padding:2px 8px;border:0.5px solid #F09595;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>'
      +'</div>'
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

/* ── MUAVIN-015: Mutabakat Onay Akışı ────────────────────────── */
var _mvOnayKey = 'ak_muavin_onay_v1';

window._mvOnayKaydet = function() {
  var donem = window._mvDonem||'';
  if(!donem){window.toast?.('Dönem seçin','warn');return;}
  var onaylar = JSON.parse(localStorage.getItem(_mvOnayKey)||'[]');
  var mevcut = onaylar.find(function(o){return o.donem===donem;});
  if(mevcut){window.toast?.('Bu dönem zaten onaylanmış: '+mevcut.tarih,'warn');return;}
  var islemler = window._mvSonIslemler||[];
  if(!islemler.length){window.toast?.('Önce Excel yükleyin','warn');return;}
  var topBorc = islemler.reduce(function(s,i){return s+(i.borc||0);},0);
  var topAlacak = islemler.reduce(function(s,i){return s+(i.alacak||0);},0);
  var kayit = {
    donem: donem,
    tarih: new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}),
    onaylayan: window.CU?.()?.displayName||window.CU?.()?.email||'Bilinmiyor',
    onaylayanId: window.CU?.()?.uid||'',
    islemSayisi: islemler.length,
    toplamBorc: topBorc,
    toplamAlacak: topAlacak,
    net: topBorc-topAlacak
  };
  onaylar.push(kayit);
  localStorage.setItem(_mvOnayKey,JSON.stringify(onaylar));
  window.toast?.('Mutabakat onaylandı: '+donem,'ok');
  window.renderMuavin?.();
};

window._mvOnayDurumuHTML = function() {
  var donem = window._mvDonem||'';
  var onaylar = JSON.parse(localStorage.getItem(_mvOnayKey)||'[]');
  var onay = onaylar.find(function(o){return o.donem===donem;});
  var h = '<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px 16px;margin-bottom:12px">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:8px">Mutabakat Onay Durumu</div>';
  if(onay){
    h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#E1F5EE;border-radius:6px">';
    h += '<div style="font-size:20px">✓</div>';
    h += '<div><div style="font-size:11px;font-weight:500;color:#085041">'+donem+' Mutabakatı Onaylandı</div>';
    h += '<div style="font-size:10px;color:#0F6E56;margin-top:2px">'+onay.onaylayan+' · '+onay.tarih+'</div>';
    h += '<div style="font-size:10px;color:#0F6E56">'+onay.islemSayisi+' işlem · Borç: '+onay.toplamBorc.toLocaleString('tr-TR')+' · Alacak: '+onay.toplamAlacak.toLocaleString('tr-TR')+'</div>';
    h += '</div></div>';
    h += '<button onclick="event.stopPropagation();window._mvOnayPDFAl()" style="font-size:10px;padding:5px 12px;border:0.5px solid #0F6E56;border-radius:5px;background:transparent;cursor:pointer;color:#0F6E56;font-family:inherit;margin-top:8px">⎙ Onay Belgesi</button>';
  } else {
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';
    h += '<div style="font-size:11px;color:var(--t3)">Bu dönem henüz onaylanmadı</div>';
    h += '<button onclick="event.stopPropagation();window._mvOnayKaydet()" style="font-size:11px;padding:6px 16px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Mutabakatı Onayla</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
};

window._mvOnayPDFAl = function() {
  var donem = window._mvDonem||'';
  var onaylar = JSON.parse(localStorage.getItem(_mvOnayKey)||'[]');
  var onay = onaylar.find(function(o){return o.donem===donem;});
  if(!onay){window.toast?.('Onay bulunamadı','err');return;}
  var html='<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Mutabakat Onay Belgesi</title>';
  html+='<style>body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:12px}';
  html+='.baslik{text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}';
  html+='.satir{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}';
  html+='.onay-kutu{border:2px solid #0F6E56;border-radius:8px;padding:20px;margin:24px 0;text-align:center}';
  html+='.imza{display:flex;justify-content:space-between;margin-top:60px}';
  html+='.imza-alan{text-align:center;width:200px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html+='</style></head><body>';
  html+='<div class="baslik"><h2>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</h2><h3>MUAVİN DEFTER MUTABAKAT ONAY BELGESİ</h3></div>';
  html+='<div class="satir"><span>Dönem</span><strong>'+onay.donem+'</strong></div>';
  html+='<div class="satir"><span>İşlem Sayısı</span><strong>'+onay.islemSayisi+'</strong></div>';
  html+='<div class="satir"><span>Toplam Borç</span><strong>'+onay.toplamBorc.toLocaleString('tr-TR')+' TL</strong></div>';
  html+='<div class="satir"><span>Toplam Alacak</span><strong>'+onay.toplamAlacak.toLocaleString('tr-TR')+' TL</strong></div>';
  html+='<div class="satir"><span>Net Bakiye</span><strong>'+onay.net.toLocaleString('tr-TR')+' TL</strong></div>';
  html+='<div class="onay-kutu"><div style="font-size:24px;color:#0F6E56">✓</div>';
  html+='<div style="font-size:16px;font-weight:bold;color:#0F6E56;margin:8px 0">MUTABAKAT ONAYLANDI</div>';
  html+='<div>Onaylayan: <strong>'+onay.onaylayan+'</strong></div>';
  html+='<div>Tarih: <strong>'+onay.tarih+'</strong></div></div>';
  html+='<div class="imza"><div class="imza-alan"><div class="imza-cizgi">Muhasebe Sorumlusu</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Mali Müşavir</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Yönetim</div></div></div>';
  html+='</body></html>';
  var win=window.open('','_blank');
  if(!win){window.toast?.('Popup engellendi','warn');return;}
  win.document.write(html);
  win.document.close();
  win.print();
};

/* ── MUAVIN-018: Toplu Mutabakat PDF ──────────────────────── */
window._mvTopluMutabakatPDF = function() {
  var onaylar = JSON.parse(localStorage.getItem('ak_muavin_onay_v1') || '[]');
  if (!onaylar.length) { window.toast?.('Onaylanmış dönem bulunamadı', 'warn'); return; }
  var tarih = new Date().toLocaleDateString('tr-TR');
  var kullanici = window.CU?.()?.displayName || '';
  var html = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Toplu Mutabakat Raporu</title>';
  html += '<style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html += '.baslik{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}';
  html += '.donem-kart{border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:12px;page-break-inside:avoid}';
  html += '.onay-satir{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:10px}';
  html += '.onay-badge{display:inline-block;padding:2px 8px;background:#0F6E56;color:#fff;border-radius:3px;font-size:10px;margin-bottom:8px}';
  html += '.imza{display:flex;justify-content:space-between;margin-top:50px}';
  html += '.imza-alan{text-align:center;width:180px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html += '</style></head><body>';
  html += '<div class="baslik"><h2>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</h2>';
  html += '<h3>TOPLU MUAVİN MUTABAKAT RAPORU</h3>';
  html += '<p>Tarih: ' + tarih + ' &nbsp;|&nbsp; Hazırlayan: ' + kullanici + '</p>';
  html += '<p>Toplam ' + onaylar.length + ' dönem onaylanmış</p></div>';
  var genelBorc = 0; var genelAlacak = 0;
  onaylar.sort(function(a, b) { return a.donem > b.donem ? 1 : -1; }).forEach(function(o) {
    genelBorc += o.toplamBorc || 0; genelAlacak += o.toplamAlacak || 0;
    html += '<div class="donem-kart">';
    html += '<span class="onay-badge">✓ ONAYLANDI</span>';
    html += '<div class="onay-satir"><span>Dönem</span><strong>' + (o.donem || '') + '</strong></div>';
    html += '<div class="onay-satir"><span>İşlem Sayısı</span><strong>' + (o.islemSayisi || 0) + '</strong></div>';
    html += '<div class="onay-satir"><span>Toplam Borç</span><strong>' + (o.toplamBorc || 0).toLocaleString('tr-TR') + ' TL</strong></div>';
    html += '<div class="onay-satir"><span>Toplam Alacak</span><strong>' + (o.toplamAlacak || 0).toLocaleString('tr-TR') + ' TL</strong></div>';
    html += '<div class="onay-satir"><span>Net</span><strong>' + (o.net || 0).toLocaleString('tr-TR') + ' TL</strong></div>';
    html += '<div class="onay-satir"><span>Onaylayan</span><strong>' + (o.onaylayan || '') + '</strong></div>';
    html += '<div class="onay-satir"><span>Onay Tarihi</span><strong>' + (o.tarih || '') + '</strong></div>';
    html += '</div>';
  });
  html += '<div style="border:2px solid #111;border-radius:6px;padding:14px;margin-top:16px">';
  html += '<div style="font-weight:bold;margin-bottom:8px">GENEL TOPLAM</div>';
  html += '<div class="onay-satir"><span>Tüm Dönemler Toplam Borç</span><strong>' + genelBorc.toLocaleString('tr-TR') + ' TL</strong></div>';
  html += '<div class="onay-satir"><span>Tüm Dönemler Toplam Alacak</span><strong>' + genelAlacak.toLocaleString('tr-TR') + ' TL</strong></div>';
  html += '<div class="onay-satir"><span>Net Bakiye</span><strong>' + (genelBorc - genelAlacak).toLocaleString('tr-TR') + ' TL</strong></div>';
  html += '</div>';
  html += '<div class="imza">';
  html += '<div class="imza-alan"><div class="imza-cizgi">Şirket Yetkilisi</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Mali Müşavir</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Yönetim</div></div>';
  html += '</div></body></html>';
  var win = window.open('', '_blank');
  if (!win) { window.toast?.('Popup engellendi', 'warn'); return; }
  win.document.write(html);
  win.document.close();
  window.toast?.('Toplu mutabakat raporu açıldı', 'ok');
};

window._mvMutabakatPDFRaporu = function() {
  var s = window._mvEslesmeSonucu;
  if (!s) { window.toast && window.toast('Önce karşılaştırma yapın', 'warn'); return; }
  var donem = window._mvDonem || '';
  var tarih = new Date().toLocaleDateString('tr-TR');
  var meta = JSON.parse(localStorage.getItem('ak_muavin_meta_v1') || '{}');
  var mMeta = (meta[donem] || {}).muhasebeci || {};
  var bMeta = (meta[donem] || {}).baran || {};

  var html = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">';
  html += '<title>Mutabakat Raporu ' + donem + '</title>';
  html += '<style>';
  html += 'body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html += 'h1{font-size:16px;margin:0}h2{font-size:12px;margin:16px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}';
  html += '.baslik{text-align:center;margin-bottom:20px}.baslik p{color:#555;margin:4px 0;font-size:11px}';
  html += '.dosyalar{display:flex;gap:16px;margin-bottom:20px}';
  html += '.dosya-kart{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px;font-size:10px}';
  html += '.dosya-kart .lbl{font-size:9px;color:#888;text-transform:uppercase;margin-bottom:4px}';
  html += '.kpi{display:flex;gap:12px;margin-bottom:20px}';
  html += '.kpi-kart{flex:1;border:1px solid #ddd;border-radius:6px;padding:8px;text-align:center}';
  html += '.kpi-kart .lbl{font-size:9px;color:#888;text-transform:uppercase}';
  html += '.kpi-kart .val{font-size:20px;font-weight:bold;margin-top:2px}';
  html += 'table{width:100%;border-collapse:collapse;margin-bottom:16px}';
  html += 'th,td{border:1px solid #ddd;padding:4px 7px;font-size:10px}';
  html += 'th{background:#f5f5f5;font-weight:bold;text-align:left}';
  html += '.eslesti{background:#EAF3DE}.fark{background:#FAEEDA}.eksik{background:#FCEBEB}';
  html += '.imza{display:flex;justify-content:space-between;margin-top:40px}';
  html += '.imza-alan{text-align:center;width:180px}';
  html += '.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px;font-size:10px}';
  html += '</style></head><body>';

  html += '<div class="baslik"><h1>MUHASEBE MUTABAKATI RAPORU</h1>';
  html += '<p>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</p>';
  html += '<p>Dönem: <b>' + donem + '</b> &nbsp;|&nbsp; Oluşturma: ' + tarih + '</p></div>';

  html += '<div class="dosyalar">';
  html += '<div class="dosya-kart"><div class="lbl">Muhasebeci Excel</div>';
  html += '<b>' + (mMeta.ad || '—') + '</b><br>' + (mMeta.satir || 0) + ' işlem · ' + (mMeta.tarih || '') + '</div>';
  html += '<div class="dosya-kart"><div class="lbl">Baran Ekstresi</div>';
  html += '<b>' + (bMeta.ad || '—') + '</b><br>' + (bMeta.satir || 0) + ' işlem · ' + (bMeta.tarih || '') + '</div>';
  html += '</div>';

  var topFark = s.farkVar.length + s.sadeceMuhasebe.length + s.sadeceBaran.length + s.dovizFark.length;
  html += '<div class="kpi">';
  html += '<div class="kpi-kart"><div class="lbl">Eşleşen</div><div class="val" style="color:#27500A">' + s.eslesen.length + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Tutar Farkı</div><div class="val" style="color:#854F0B">' + s.farkVar.length + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Sadece Muhasebe</div><div class="val" style="color:#A32D2D">' + s.sadeceMuhasebe.length + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Sadece Baran</div><div class="val" style="color:#633806">' + s.sadeceBaran.length + '</div></div>';
  html += '<div class="kpi-kart"><div class="lbl">Döviz Farkı</div><div class="val" style="color:#185FA5">' + s.dovizFark.length + '</div></div>';
  html += '</div>';

  if (s.farkVar.length) {
    html += '<h2>Tutar Farkları (' + s.farkVar.length + ' kayıt)</h2>';
    html += '<table><thead><tr><th>Cari</th><th>Tarih (Muhasebe)</th><th>Tutar (Muhasebe)</th><th>Tarih (Baran)</th><th>Tutar (Baran)</th><th>Fark</th></tr></thead><tbody>';
    s.farkVar.forEach(function(f) {
      var mT = f.m.borc || f.m.alacak || 0;
      var bT = f.b.borcMeblagh || f.b.alacakMeblagh || 0;
      html += '<tr class="fark"><td>' + (f.m.cariAd || '—') + '</td><td>' + (f.m.tarih || '—') + '</td>';
      html += '<td style="text-align:right">' + mT.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' TL</td>';
      html += '<td>' + (f.b.tarih || '—') + '</td>';
      html += '<td style="text-align:right">' + bT.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ' + (f.b.borcDoviz || f.b.alacakDoviz || 'TL') + '</td>';
      html += '<td style="text-align:right;font-weight:bold">' + f.fark.toLocaleString('tr-TR', {minimumFractionDigits:2}) + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  if (s.sadeceMuhasebe.length) {
    html += '<h2>Sadece Muhasebede (' + s.sadeceMuhasebe.length + ' kayıt — Baran ekstresinde yok)</h2>';
    html += '<table><thead><tr><th>Cari</th><th>Tarih</th><th>Fiş No</th><th>Borç</th><th>Alacak</th></tr></thead><tbody>';
    s.sadeceMuhasebe.forEach(function(m) {
      html += '<tr class="eksik"><td>' + (m.cariAd || '—') + '</td><td>' + (m.tarih || '—') + '</td>';
      html += '<td>' + (m.fisNo || '—') + '</td>';
      html += '<td style="text-align:right">' + (m.borc ? m.borc.toLocaleString('tr-TR', {minimumFractionDigits:2}) : '—') + '</td>';
      html += '<td style="text-align:right">' + (m.alacak ? m.alacak.toLocaleString('tr-TR', {minimumFractionDigits:2}) : '—') + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  if (s.sadeceBaran.length) {
    html += '<h2>Sadece Baran Ekstresinde (' + s.sadeceBaran.length + ' kayıt — Muhasebede yok)</h2>';
    html += '<table><thead><tr><th>İşlem Türü</th><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr></thead><tbody>';
    s.sadeceBaran.forEach(function(b) {
      var t = b.borcMeblagh || b.alacakMeblagh || 0;
      html += '<tr class="eksik"><td>' + (b.islemTuru || '—') + '</td><td>' + (b.tarih || '—') + '</td>';
      html += '<td>' + (b.aciklama || '—').slice(0, 60) + '</td>';
      html += '<td style="text-align:right">' + t.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ' + (b.borcDoviz || b.alacakDoviz || '') + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  html += '<div class="imza">';
  html += '<div class="imza-alan"><div class="imza-cizgi">Hazırlayan</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Muhasebeci</div></div>';
  html += '<div class="imza-alan"><div class="imza-cizgi">Yönetim</div></div>';
  html += '</div>';
  html += '</body></html>';

  var win = window.open('', '_blank');
  if (!win) { window.toast && window.toast('Popup engellendi', 'warn'); return; }
  win.document.write(html);
  win.document.close();
  window.toast && window.toast('Mutabakat raporu açıldı', 'ok');
};

window._mvOnlemRaporuPDF = function() {
  var kategoriler = window._mvSonKategoriler;
  if(!kategoriler){window.toast?.('Önce karşılaştırma yapın','warn');return;}
  var toplamHata = Object.values(kategoriler).reduce(function(s,k){return s+k.items.length;},0);
  if(!toplamHata){window.toast?.('Hata bulunamadı','ok');return;}
  var tarih=new Date().toLocaleDateString('tr-TR');
  var donem=window._mvDonem||'';
  var html='<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Muavin Önlem Raporu</title>';
  html+='<style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html+='.baslik{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}';
  html+='.ozet{display:flex;gap:12px;margin-bottom:20px}';
  html+='.ozet-kart{border:1px solid #ddd;border-radius:6px;padding:10px;flex:1;text-align:center}';
  html+='.ozet-sayi{font-size:24px;font-weight:bold}';
  html+='.kat{margin-bottom:16px}';
  html+='.kat-baslik{font-weight:bold;padding:8px;border-radius:4px;margin-bottom:6px}';
  html+='.onlem{background:#f5f5f5;border-left:3px solid #185FA5;padding:8px 12px;margin:4px 0;border-radius:0 4px 4px 0}';
  html+='.imza{display:flex;justify-content:space-between;margin-top:50px}';
  html+='.imza-alan{text-align:center;width:200px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html+='</style></head><body>';
  html+='<div class="baslik"><h2>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</h2>';
  html+='<h3>MUAVİN HATA TESPİT VE ÖNLEM RAPORU</h3>';
  html+='<p>Dönem: <strong>'+donem+'</strong> | Tarih: '+tarih+'</p></div>';
  html+='<div class="ozet">';
  Object.values(kategoriler).forEach(function(k){
    if(!k.items.length) return;
    html+='<div class="ozet-kart"><div class="ozet-sayi" style="color:#A32D2D">'+k.items.length+'</div><div style="font-size:9px;margin-top:4px">'+k.ad+'</div></div>';
  });
  html+='</div>';
  var onlemler={eksik_kayit:['İlgili fişi karşı tarafın sistemine girin','Dönem kapanmadan mutabakat sağlayın','Eksik fişin belgelerini temin edin'],tutar_farki:['Orijinal belgeyi kontrol edin','Düzeltme fişi kesin','KDV tutarını ayrı kontrol edin'],tarih_farki:['Fiş tarihini belge üzerinden doğrulayın','Dönem geçişi varsa provizyon kontrolü yapın'],mukerrer:['Mükerrer kaydı iptal edin','Neden oluştuğunu kayıt altına alın'],yuksek_tutar:['Açıklama ve belge ekleyin','Yönetici onayı alın']};
  Object.entries(kategoriler).forEach(function(entry){
    var key=entry[0],k=entry[1];
    if(!k.items.length) return;
    html+='<div class="kat"><div class="kat-baslik" style="background:#f0f0f0">'+k.ad+' ('+k.items.length+' adet)</div>';
    html+='<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px"><thead><tr style="background:#f5f5f5"><th style="padding:5px;text-align:left">Fiş No</th><th style="padding:5px;text-align:left">Detay</th><th style="padding:5px;text-align:right">Tutar</th></tr></thead><tbody>';
    k.items.slice(0,15).forEach(function(item){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:4px 5px;font-family:monospace">'+(item.fisNo||'—')+'</td><td style="padding:4px 5px">'+(item.durum||item.tarih1||item.taraf||'')+'</td><td style="padding:4px 5px;text-align:right">'+(item.tutar?item.tutar.toLocaleString('tr-TR'):item.fark?'Fark: '+item.fark.toLocaleString('tr-TR'):'')+'</td></tr>';});
    html+='</tbody></table>';
    if(onlemler[key]){html+='<div style="font-weight:bold;margin-bottom:4px;font-size:10px">Önerilen Önlemler:</div>';onlemler[key].forEach(function(o){html+='<div class="onlem">'+o+'</div>';});}
    html+='</div>';
  });
  html+='<div class="imza"><div class="imza-alan"><div class="imza-cizgi">Hazırlayan</div></div><div class="imza-alan"><div class="imza-cizgi">Mali Müşavir</div></div><div class="imza-alan"><div class="imza-cizgi">Yönetim Onayı</div></div></div>';
  html+='</body></html>';
  var win=window.open('','_blank');
  if(!win){window.toast?.('Popup engellendi','warn');return;}
  win.document.write(html);win.document.close();win.print();
  window.toast?.('Önlem raporu açıldı','ok');
};

window._mvMuhasebeciyeGonderPDF = function() {
  var kategoriler = window._mvSonKategoriler;
  if(!kategoriler){window.toast?.('Önce karşılaştırma yapın','warn');return;}
  var toplamHata = Object.values(kategoriler).reduce(function(s,k){return s+k.items.length;},0);
  if(!toplamHata){window.toast?.('Hata bulunamadı — gönderilecek fark yok','ok');return;}
  var tarih=new Date().toLocaleDateString('tr-TR');
  var donem=window._mvDonem||'';
  var html='<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Muhasebeciye Fark Bildirimi</title>';
  html+='<style>body{font-family:Arial,sans-serif;margin:35px;color:#111;font-size:11px}';
  html+='.baslik{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}';
  html+='.resmi{background:#f8f8f8;border:1px solid #ddd;padding:14px;margin-bottom:16px;border-radius:4px}';
  html+='.fark-satir{border-bottom:1px solid #eee;padding:8px 0;display:flex;gap:12px}';
  html+='.etiket{font-size:9px;padding:2px 6px;border-radius:3px;color:#fff;white-space:nowrap}';
  html+='.talep{background:#EBF4FF;border-left:3px solid #185FA5;padding:8px 12px;margin:12px 0;border-radius:0 4px 4px 0;font-size:10px}';
  html+='.imza{display:flex;justify-content:space-between;margin-top:50px}';
  html+='.imza-alan{text-align:center;width:200px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html+='</style></head><body>';
  html+='<div class="baslik"><h2 style="margin:0 0 4px">DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</h2>';
  html+='<div style="font-size:12px;color:#555">Mali Müşavir Bildirim Yazısı</div></div>';
  html+='<div class="resmi">';
  html+='<div><strong>Konu:</strong> '+donem+' Dönemi Muavin Defter Fark Bildirimi</div>';
  html+='<div style="margin-top:4px"><strong>Tarih:</strong> '+tarih+'</div>';
  html+='<div style="margin-top:4px"><strong>Toplam Fark Sayısı:</strong> '+toplamHata+' adet</div>';
  html+='</div>';
  html+='<p>Sayın Mali Müşavirimiz,</p>';
  html+='<p>'+donem+' dönemine ait muavin defter karşılaştırması sonucunda aşağıdaki farklılıklar tespit edilmiştir. Söz konusu kayıtların tarafınızca incelenerek gerekli düzeltmelerin yapılmasını talep ederiz.</p>';
  Object.entries(kategoriler).forEach(function(entry){
    var key=entry[0],k=entry[1];
    if(!k.items.length) return;
    var renkler={eksik_kayit:'#A32D2D',tutar_farki:'#854F0B',tarih_farki:'#185FA5',mukerrer:'#854F0B',yuksek_tutar:'#A32D2D'};
    html+='<h3 style="margin:16px 0 8px;font-size:11px">'+k.ad+' ('+k.items.length+' adet)</h3>';
    k.items.slice(0,20).forEach(function(item){
      html+='<div class="fark-satir">';
      html+='<span class="etiket" style="background:'+(renkler[key]||'#555')+'">'+k.ad+'</span>';
      html+='<span style="font-family:monospace;min-width:80px">'+(item.fisNo||'—')+'</span>';
      html+='<span style="flex:1">'+(item.durum||item.tarih1||item.taraf||item.aciklama||'')+'</span>';
      html+='<span style="color:#A32D2D">'+(item.tutar?item.tutar.toLocaleString('tr-TR')+' TL':item.fark?'Fark: '+item.fark.toLocaleString('tr-TR')+' TL':'')+'</span>';
      html+='</div>';
    });
    var talepler={eksik_kayit:'Yukarıdaki fişlerin kayıtlarınıza işlenmesini talep ederiz.',tutar_farki:'Tutar farklılıklarının belge üzerinden kontrol edilerek düzeltilmesini talep ederiz.',tarih_farki:'Fiş tarihlerinin orijinal belgelerle karşılaştırılarak düzeltilmesini talep ederiz.',mukerrer:'Mükerrer kayıtların iptal edilerek tekil hale getirilmesini talep ederiz.',yuksek_tutar:'Yüksek tutarlı işlemlere açıklama ve belge eklenmesini talep ederiz.'};
    if(talepler[key]) html+='<div class="talep">Talebimiz: '+talepler[key]+'</div>';
  });
  html+='<div class="imza">';
  html+='<div class="imza-alan"><div class="imza-cizgi">Şirket Yetkilisi</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Mali İşler Sorumlusu</div></div>';
  html+='</div></body></html>';
  var win=window.open('','_blank');
  if(!win){window.toast?.('Popup engellendi','warn');return;}
  win.document.write(html);win.document.close();win.print();
  window.toast?.('Muhasebeciye gönderim raporu açıldı','ok');
};

window._mvIcMuhasebeRaporuPDF = function() {
  var kategoriler = window._mvSonKategoriler;
  if(!kategoriler){window.toast?.('Önce karşılaştırma yapın','warn');return;}
  var toplamHata = Object.values(kategoriler).reduce(function(s,k){return s+k.items.length;},0);
  if(!toplamHata){window.toast?.('Hata bulunamadı','ok');return;}
  var tarih=new Date().toLocaleDateString('tr-TR');
  var donem=window._mvDonem||'';
  var deadline=new Date(Date.now()+7*24*60*60*1000).toLocaleDateString('tr-TR');
  var html='<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>İç Muhasebe Aksiyon Raporu</title>';
  html+='<style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html+='.baslik{background:#111;color:#fff;padding:14px;margin-bottom:20px;border-radius:4px}';
  html+='.ozet-grid{display:flex;gap:10px;margin-bottom:16px}';
  html+='.ozet-kart{border:1px solid #ddd;border-radius:6px;padding:10px;flex:1;text-align:center}';
  html+='.aksiyon-satir{border:1px solid #ddd;border-radius:4px;padding:10px;margin-bottom:8px}';
  html+='.oncelik{font-size:9px;padding:2px 6px;border-radius:3px;color:#fff;display:inline-block;margin-bottom:6px}';
  html+='.checklist{list-style:none;padding:0;margin:6px 0 0}';
  html+='.checklist li{padding:3px 0;padding-left:16px;position:relative;font-size:10px}';
  html+='.checklist li:before{content:"☐";position:absolute;left:0}';
  html+='.imza{display:flex;justify-content:space-between;margin-top:40px}';
  html+='.imza-alan{text-align:center;width:180px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:35px}';
  html+='</style></head><body>';
  html+='<div class="baslik"><h2 style="margin:0 0 4px;font-size:16px">İÇ MUHASEBE AKSİYON RAPORU</h2>';
  html+='<div style="font-size:10px;opacity:.8">Dönem: '+donem+' | Tarih: '+tarih+' | Aksiyon Deadline: '+deadline+'</div></div>';
  html+='<div class="ozet-grid">';
  html+='<div class="ozet-kart"><div style="font-size:22px;font-weight:bold;color:#A32D2D">'+toplamHata+'</div><div style="font-size:9px;margin-top:2px">TOPLAM HATA</div></div>';
  Object.values(kategoriler).forEach(function(k){
    if(!k.items.length) return;
    html+='<div class="ozet-kart"><div style="font-size:18px;font-weight:bold">'+k.items.length+'</div><div style="font-size:9px;margin-top:2px">'+k.ad.toUpperCase()+'</div></div>';
  });
  html+='</div>';
  var aksiyonlar={
    eksik_kayit:{oncelik:'KRİTİK',renk:'#A32D2D',gorevler:['Eksik fişi sistem kayıtlarında ara','Orijinal belgeyi temin et','Döneme işle ve muhasebeciye bildir','Neden eksik kaldığını raporla']},
    tutar_farki:{oncelik:'YÜKSEK',renk:'#854F0B',gorevler:['Orijinal fatura/belge ile karşılaştır','KDV tutarını ayrı kontrol et','Düzeltme fişi hazırla','Muhasebeciye bildir']},
    tarih_farki:{oncelik:'ORTA',renk:'#185FA5',gorevler:['Belge tarihini doğrula','Dönem geçişi kontrolü yap','Gerekirse ters kayıt aç']},
    mukerrer:{oncelik:'YÜKSEK',renk:'#854F0B',gorevler:['Hangi kaydın doğru olduğunu belirle','Yanlış kaydı iptal et','Neden mükerrer girildiğini araştır']},
    yuksek_tutar:{oncelik:'İZLEME',renk:'#5F5E5A',gorevler:['Yönetici onayını kontrol et','Açıklama ve belge ekle','Karşı taraf mutabakatını al']}
  };
  Object.entries(kategoriler).forEach(function(entry){
    var key=entry[0],k=entry[1];
    if(!k.items.length) return;
    var aks=aksiyonlar[key]||{oncelik:'NORMAL',renk:'#555',gorevler:[]};
    html+='<div class="aksiyon-satir">';
    html+='<span class="oncelik" style="background:'+aks.renk+'">'+aks.oncelik+'</span> ';
    html+='<strong style="font-size:11px">'+k.ad+'</strong> <span style="color:#555;font-size:10px">('+k.items.length+' kayıt)</span>';
    html+='<table style="width:100%;border-collapse:collapse;font-size:10px;margin:6px 0"><thead><tr style="background:#f5f5f5"><th style="padding:4px;text-align:left">Fiş No</th><th style="padding:4px;text-align:left">Detay</th><th style="padding:4px;text-align:right">Tutar</th></tr></thead><tbody>';
    k.items.slice(0,10).forEach(function(item){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:3px 4px;font-family:monospace">'+(item.fisNo||'—')+'</td><td style="padding:3px 4px">'+(item.durum||item.tarih1||item.taraf||'')+'</td><td style="padding:3px 4px;text-align:right">'+(item.tutar?item.tutar.toLocaleString('tr-TR')+' TL':'')+'</td></tr>';});
    html+='</tbody></table>';
    if(aks.gorevler.length){
      html+='<div style="font-size:10px;font-weight:bold;margin-top:6px">Yapılacaklar:</div>';
      html+='<ul class="checklist">';
      aks.gorevler.forEach(function(g){html+='<li>'+g+'</li>';});
      html+='</ul>';
    }
    html+='<div style="margin-top:6px;font-size:9px;color:#555">Sorumlu: _______________ | Tamamlanma Tarihi: '+deadline+'</div>';
    html+='</div>';
  });
  html+='<div class="imza">';
  html+='<div class="imza-alan"><div class="imza-cizgi">Hazırlayan</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Muhasebe Müdürü</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Genel Müdür</div></div>';
  html+='</div></body></html>';
  var win=window.open('','_blank');
  if(!win){window.toast?.('Popup engellendi','warn');return;}
  win.document.write(html);win.document.close();win.print();
  window.toast?.('İç muhasebe aksiyon raporu açıldı','ok');
};

/* \u2500\u2500 MUAVIN-EXCEL-001: Birle\u015fik Excel \u0130ndir \u2500\u2500 */
window._mvBirlesikExcelIndir = function() {
  var firmalar = typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi() : [];
  if (!firmalar.length) { window.toast?.('\u00d6nce dosya y\u00fckleyin', 'warn'); return; }
  var satirlar = [];
  satirlar.push(['Tarih', 'Fatura No', 'Bor\u00e7 TL', 'Alacak TL', 'Firma Ad\u0131', 'Kaynak', 'Durum', 'A\u00e7\u0131klama']);
  firmalar.forEach(function(f) {
    (f.sonuc || []).forEach(function(r) {
      var m = r.muhasebeci, s = r.sirket;
      if (m) {
        satirlar.push([m.tarih || '', m.faturaNo || '', m.tip === 'borc' ? m.tutarTL.toFixed(2) : '0.00', m.tip === 'alacak' ? m.tutarTL.toFixed(2) : '0.00', m.firma || f.ad || '', 'Muhasebeci', r.durum, m.aciklama || '']);
      }
      if (s) {
        satirlar.push([s.tarih || '', s.faturaNo || '', s.tip === 'borc' ? s.tutarTL.toFixed(2) : '0.00', s.tip === 'alacak' ? s.tutarTL.toFixed(2) : '0.00', s.firma || f.ad || '', '\u015eirket', r.durum, s.aciklama || '']);
      }
    });
  });
  if (typeof XLSX === 'undefined') { window.toast?.('SheetJS y\u00fcklenmedi', 'err'); return; }
  var ws = XLSX.utils.aoa_to_sheet(satirlar);
  ws['!cols'] = [12, 20, 14, 14, 30, 12, 14, 40].map(function(w) { return { wch: w }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mutabakat');
  var donem = typeof window._mvAktifDonem === 'function' ? window._mvAktifDonem() : '';
  var dosyaAdi = 'muavin_birlesik_' + (donem || new Date().toISOString().slice(0, 10)) + '.xlsx';
  XLSX.writeFile(wb, dosyaAdi);
  window.toast?.('Excel indirildi', 'ok');
  window.logActivity?.('export', 'Muavin birle\u015fik Excel indirildi: ' + dosyaAdi);
};

console.log('[MUAVIN-EXPORT] y\u00fcklendi');
