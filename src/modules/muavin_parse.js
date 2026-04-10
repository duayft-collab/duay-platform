
/* ── MUAVIN-009: Hesap Kodu Kategori Tablosu ──────────────── */
var _mvHesapKategori = {
  '1':'Dönen Varlıklar', '10':'Hazır Değerler', '100':'Kasa',
  '101':'Alınan Çekler', '102':'Bankalar', '103':'Verilen Çekler',
  '11':'Menkul Kıymetler',
  '12':'Ticari Alacaklar', '120':'Alıcılar', '121':'Alacak Senetleri',
  '13':'Diğer Alacaklar', '15':'Stoklar', '150':'İlk Madde',
  '153':'Ticari Mallar', '18':'Gelecek Aylara Ait Giderler',
  '2':'Duran Varlıklar', '25':'Maddi Duran Varlıklar',
  '253':'Tesis Makine', '254':'Taşıtlar', '255':'Demirbaşlar',
  '3':'Kısa Vadeli Yabancı Kaynaklar', '32':'Ticari Borçlar',
  '320':'Satıcılar', '321':'Borç Senetleri',
  '33':'Diğer Borçlar', '34':'Alınan Avanslar',
  '36':'Ödenecek Vergi', '360':'Ödenecek Vergi ve Fonlar',
  '361':'Ödenecek SGK', '37':'Borç ve Gider Karşılıkları',
  '38':'Gelecek Aylara Ait Gelirler',
  '4':'Uzun Vadeli Yabancı Kaynaklar', '40':'Banka Kredileri',
  '5':'Öz Kaynaklar', '50':'Ödenmiş Sermaye', '57':'Geçmiş Yıl Karı',
  '6':'Gelirler', '60':'Brüt Satışlar', '601':'Yurt Dışı Satışlar',
  '64':'Diğer Faaliyetlerden Gelirler',
  '7':'Giderler', '70':'Maliyet', '74':'Hizmet Üretim Maliyeti',
  '76':'Pazarlama Giderleri', '77':'Genel Yönetim Giderleri',
  '770':'Genel Yönetim', '780':'Finansman Giderleri',
  '79':'İşletme Faaliyetleri', '8':'Maliyet Hesapları'
};

window._mvHesapKategoriAd = function(hesapKodu) {
  if (!hesapKodu) return '';
  var kod = hesapKodu.split(/[\s\.\-]/)[0];
  return _mvHesapKategori[kod] || _mvHesapKategori[kod.slice(0, 3)] || _mvHesapKategori[kod.slice(0, 2)] || _mvHesapKategori[kod.slice(0, 1)] || '';
};

window._mvHam2 = '';
window._mvHam = '';
window._mvDosyaAd = '';
window._mvDosya2Ad = '';
window._mvDosyaSatir = 0;
window._mvDosya2Satir = 0;
window._mvDosyaTarih = '';
window._mvDosya2Tarih = '';

function _mvMetaKaydet(taraf, ad, satir, boyutStr) {
  try {
    var donem = window._mvDonem || (new Date().getFullYear() + 'Q' + Math.ceil((new Date().getMonth()+1)/3));
    var tarihStr = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'});
    var meta = JSON.parse(localStorage.getItem('ak_muavin_meta_v1')||'{}');
    if (!meta[donem]) meta[donem] = {};
    meta[donem][taraf] = { ad: ad, satir: satir, tarih: tarihStr, boyut: boyutStr };
    localStorage.setItem('ak_muavin_meta_v1', JSON.stringify(meta));
  } catch(e) { console.warn('[MUAVİN] meta kayıt hata:', e); }
}

function _mvParseMuhasebeci(tsv) {
  var satirlar = tsv.split('\n');
  var islemler = [];
  var mevcutCari = '';
  var mevcutHesapKodu = '';
  satirlar.forEach(function(satir) {
    var kolonlar = satir.split('\t');
    var ilk = (kolonlar[0]||'').trim();
    if (!ilk) return;
    var skipler = ['nakli','genel','tarih','tip','fiş','borç','alacak','bakiye','hesap','dönem','tl','b/a'];
    if (skipler.some(function(k){return ilk.toLowerCase().indexOf(k)!==-1;})) return;
    var tarihVal = new Date(kolonlar[0]);
    if (isNaN(tarihVal.getTime())) {
      var m = ilk.match(/^(\d{2,3}[\.\w]+)\s+(.+)$/);
      if (m) { mevcutHesapKodu = m[1]; mevcutCari = m[2].trim(); }
      return;
    }
    var borc = parseFloat((kolonlar[4]||'').replace(',','.'))||0;
    var alacak = parseFloat((kolonlar[5]||'').replace(',','.'))||0;
    var tip = (kolonlar[1]||'').trim();
    var fisNo = (kolonlar[2]||'').trim();
    if (!tip && !fisNo && borc===0 && alacak===0) return;
    islemler.push({
      tarih: tarihVal.toLocaleDateString('tr-TR'),
      tip: tip, fisNo: fisNo,
      aciklama: (kolonlar[3]||'').trim(),
      borc: borc, alacak: alacak,
      bakiye: parseFloat((kolonlar[6]||'').replace(',','.'))||0,
      ba: (kolonlar[7]||'').trim(),
      cariAd: mevcutCari, hesapKodu: mevcutHesapKodu,
      _taraf: 'muhasebeci'
    });
  });
  return islemler;
}

function _mvParseBaran(tsv) {
  var satirlar = tsv.split('\n');
  var islemler = [];
  var baslik = false;
  var km = {islemTuru:0,tarih:1,aciklama:2,faturaSeri:3,faturaSira:4,borcMeblagh:7,borcDoviz:8,alacakMeblagh:9,alacakDoviz:10,tlBakiye:11};
  satirlar.forEach(function(satir) {
    var k = satir.split('\t').map(function(x){return x.trim();});
    if (!baslik) {
      if ((k[0]||'').toLowerCase().indexOf('işlem')!==-1||(k[0]||'').toLowerCase().indexOf('tür')!==-1) {
        k.forEach(function(h,i){
          var hh=h.toLowerCase();
          if(hh.indexOf('işlem türü')!==-1) km.islemTuru=i;
          else if(hh==='tarih') km.tarih=i;
          else if(hh==='açıklama'||hh==='aciklama') km.aciklama=i;
          else if(hh.indexOf('fatura seri')!==-1) km.faturaSeri=i;
          else if(hh.indexOf('fatura sıra')!==-1||hh.indexOf('fatura sira')!==-1) km.faturaSira=i;
          else if(hh.indexOf('borç meblağ')!==-1) km.borcMeblagh=i;
          else if(hh.indexOf('borç döviz')!==-1) km.borcDoviz=i;
          else if(hh.indexOf('alacak meblağ')!==-1) km.alacakMeblagh=i;
          else if(hh.indexOf('alacak döviz')!==-1) km.alacakDoviz=i;
          else if(hh.indexOf('tl bakiye')!==-1) km.tlBakiye=i;
        });
        baslik=true;
      }
      return;
    }
    if (k.length<3) return;
    var islemTuru=k[km.islemTuru]||'';
    var tarih=k[km.tarih]||'';
    if (!islemTuru&&!tarih) return;
    var tObj=new Date(tarih);
    islemler.push({
      islemTuru: islemTuru,
      tarih: !isNaN(tObj.getTime())?tObj.toLocaleDateString('tr-TR'):tarih,
      aciklama: k[km.aciklama]||'',
      faturaSeri: k[km.faturaSeri]||'',
      faturaSira: k[km.faturaSira]||'',
      borcMeblagh: parseFloat((k[km.borcMeblagh]||'').replace(',','.'))||0,
      borcDoviz: k[km.borcDoviz]||'',
      alacakMeblagh: parseFloat((k[km.alacakMeblagh]||'').replace(',','.'))||0,
      alacakDoviz: k[km.alacakDoviz]||'',
      tlBakiye: parseFloat((k[km.tlBakiye]||'').replace(',','.'))||0,
      _taraf:'baran'
    });
  });
  return islemler;
}

window._mvDosyaOku = function(inp, taraf) {
  var f = inp.files[0]; if (!f) return;
  taraf = taraf || 'muhasebeci';
  var boyutKB = Math.round(f.size/1024);
  var boyutStr = boyutKB>1024?(Math.round(boyutKB/102.4)/10)+' MB':boyutKB+' KB';

  window._mvYuklemeBaslat && window._mvYuklemeBaslat(taraf);

  function _isle(tsv) {
    var islemler = taraf==='baran' ? _mvParseBaran(tsv) : _mvParseMuhasebeci(tsv);
    if (!islemler.length) {
      window.toast&&window.toast('Geçerli işlem bulunamadı — format uyumsuz olabilir','warn');
      var _m2=JSON.parse(localStorage.getItem('ak_muavin_meta_v1')||'{}');
      var _d2=window._mvDonem||(new Date().getFullYear()+'Q'+Math.ceil((new Date().getMonth()+1)/3));
      if(_m2[_d2]){delete _m2[_d2][taraf];}
      localStorage.setItem('ak_muavin_meta_v1',JSON.stringify(_m2));
      window.renderMuavin&&window.renderMuavin();
      return;
    }
    _mvMetaKaydet(taraf, f.name, islemler.length, boyutStr);
    if (taraf==='muhasebeci') { window._mvSonIslemler=islemler; window._mvSonHesaplar={}; }
    else { window._mvSonIslemlerB=islemler; }
    window._mvEslesmeSonucu=null;
    window.toast&&window.toast(f.name+' yüklendi — '+islemler.length+' işlem','ok');
    window._mvAktifTab='karsilastirma';
    window.renderMuavin&&window.renderMuavin();
  }

  if (/\.xls[xm]?$/i.test(f.name)) {
    var r=new FileReader();
    r.onload=function(e){
      try {
        if(typeof XLSX==='undefined'){window.toast&&window.toast('SheetJS yüklenmedi','err');return;}
        var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
        _isle(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]],{FS:'\t',RS:'\n'}));
      } catch(err){
  console.warn('[MUAVİN] xlsx hata:',err);
  window.toast&&window.toast('xlsx okunamadı: '+err.message,'err');
  var _meta=JSON.parse(localStorage.getItem('ak_muavin_meta_v1')||'{}');
  var _don=window._mvDonem||(new Date().getFullYear()+'Q'+Math.ceil((new Date().getMonth()+1)/3));
  if(_meta[_don]){delete _meta[_don][taraf];}
  localStorage.setItem('ak_muavin_meta_v1',JSON.stringify(_meta));
  window.renderMuavin&&window.renderMuavin();
}
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2=new FileReader();
    r2.onload=function(e){_isle(e.target.result);};
    r2.readAsText(f,'UTF-8');
  }
};

window._mvSonIslemlerB = [];

/* v3.0: iki dosya okuma artık _mvDosyaOku(inp, taraf) ile yapılıyor */

window._mvFarkRaporu = function() {
  var is1 = window._mvSonIslemler || [];
  var is2 = window._mvSonIslemler2 || [];
  if (!is1.length || !is2.length) { window.toast?.('Her iki Excel de yüklü olmalı', 'warn'); return; }
  var h2 = document.getElementById('mv-fark-panel');
  if (!h2) return;
  var h1map = {};
  is1.forEach(function(i) { var k = i.fisNo || i.tarih; if (!h1map[k]) h1map[k] = i; });
  var farklar = [];
  is2.forEach(function(i2) {
    var k = i2.fisNo || i2.tarih;
    var i1 = h1map[k];
    if (!i1) { farklar.push({ tip: 'sadece2', i2: i2 }); return; }
    if (Math.abs((i1.borc || 0) - (i2.borc || 0)) > 0.01 || Math.abs((i1.alacak || 0) - (i2.alacak || 0)) > 0.01) {
      farklar.push({ tip: 'tutar', i1: i1, i2: i2 });
    }
  });
  is1.forEach(function(i1) {
    var k = i1.fisNo || i1.tarih;
    var bulundu = is2.some(function(i2) { return (i2.fisNo || i2.tarih) === k; });
    if (!bulundu) farklar.push({ tip: 'sadece1', i1: i1 });
  });
  var h = '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-top:16px">';
  h += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Fark Raporu — ' + is1.length + ' vs ' + is2.length + ' işlem · ' + farklar.length + ' fark</div>';
  if (!farklar.length) {
    h += '<div style="color:#0F6E56;font-size:12px;padding:12px 0">✓ İki Excel tamamen eşleşiyor</div>';
  } else {
    h += '<table style="width:100%;border-collapse:collapse;font-size:10px">';
    h += '<thead><tr style="background:var(--s2)"><th style="padding:5px 6px;text-align:left">TİP</th><th style="padding:5px 6px">FİŞ NO</th><th style="padding:5px 6px">AÇIKLAMA</th><th style="padding:5px 6px;text-align:right">BORÇ 1</th><th style="padding:5px 6px;text-align:right">BORÇ 2</th><th style="padding:5px 6px;text-align:right">FARK</th></tr></thead><tbody>';
    farklar.forEach(function(f) {
      var renk = f.tip === 'tutar' ? '#854F0B' : f.tip === 'sadece1' ? '#A32D2D' : '#185FA5';
      var lbl = f.tip === 'tutar' ? 'Tutar Farkı' : f.tip === 'sadece1' ? 'Sadece 1.Excel' : 'Sadece 2.Excel';
      var i = f.i1 || f.i2;
      var b1 = (f.i1?.borc || 0).toLocaleString('tr-TR');
      var b2 = (f.i2?.borc || 0).toLocaleString('tr-TR');
      var fark = ((f.i1?.borc || 0) - (f.i2?.borc || 0)).toLocaleString('tr-TR');
      h += '<tr style="border-bottom:0.5px solid var(--b)">';
      h += '<td style="padding:4px 6px;color:' + renk + ';font-weight:500">' + lbl + '</td>';
      h += '<td style="padding:4px 6px;font-family:monospace">' + (i?.fisNo || '—') + '</td>';
      h += '<td style="padding:4px 6px;color:var(--t2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (i?.aciklama || '—') + '</td>';
      h += '<td style="padding:4px 6px;text-align:right">' + b1 + '</td>';
      h += '<td style="padding:4px 6px;text-align:right">' + b2 + '</td>';
      h += '<td style="padding:4px 6px;text-align:right;color:' + renk + ';font-weight:500">' + fark + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
  }
  h += '</div>';
  h2.innerHTML = h;
};

/* ── MUAVIN-016-017: Fark İşaretleme + Muhasebeci İletim ───── */
window._mvDuzeltmeNotu = {};

window._mvMuhasebeciFarkRaporuHTML = function() {
  var is1 = window._mvSonIslemler||[];
  var is2 = window._mvSonIslemler2||[];
  var donem = window._mvDonem||'';
  var farklar = [];
  if(is1.length && is2.length) {
    var h1map = {};
    is1.forEach(function(i){var k=i.fisNo||i.tarih; h1map[k]=i;});
    var h2map = {};
    is2.forEach(function(i){var k=i.fisNo||i.tarih; h2map[k]=i;});
    is1.forEach(function(i1){
      var k=i1.fisNo||i1.tarih;
      if(!h2map[k]) farklar.push({tip:'sistemde_var',i:i1,aciklama:'Muhasebecide kayıt yok'});
      else if(Math.abs((i1.borc||0)-(h2map[k].borc||0))>0.01) farklar.push({tip:'tutar_farki',i:i1,i2:h2map[k],aciklama:'Tutar uyuşmuyor'});
    });
    is2.forEach(function(i2){
      var k=i2.fisNo||i2.tarih;
      if(!h1map[k]) farklar.push({tip:'muhasebecide_var',i:i2,aciklama:'Sistemde kayıt yok'});
    });
  } else if(is1.length) {
    var odmler = typeof window.loadOdm==='function'?window.loadOdm():[];
    var yil=parseInt(donem); var q=parseInt((donem||'').replace(/^\d{4}Q/,''));
    var ayBas=(q-1)*3; var ayBit=ayBas+2;
    var donemOdm = odmler.filter(function(o){
      if(o.isDeleted) return false;
      var t=new Date(o.dueDate||o.createdAt||'');
      return !isNaN(t)&&t.getFullYear()===yil&&t.getMonth()>=ayBas&&t.getMonth()<=ayBit;
    });
    var odmFisler = {};
    donemOdm.forEach(function(o){if(o.fisNo||o.referans) odmFisler[o.fisNo||o.referans]=o;});
    is1.forEach(function(i){
      var k=i.fisNo;
      if(k&&!odmFisler[k]) farklar.push({tip:'sistemde_yok',i:i,aciklama:'Platform kayıtlarında bu fiş bulunamadı'});
    });
  }
  window._mvSonFarklar = farklar;
  if(!farklar.length) return '<div style="padding:16px;background:#E1F5EE;border-radius:8px;color:#085041;font-size:11px">✓ Fark bulunamadı — tüm kayıtlar uyuşuyor</div>';
  var h='<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden">';
  h+='<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);background:var(--s2);display:flex;align-items:center;justify-content:space-between">';
  h+='<div style="font-size:11px;font-weight:500;color:var(--t)">'+farklar.length+' Fark Tespit Edildi</div>';
  h+='<button onclick="event.stopPropagation();window._mvIletimRaporuPDF()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#A32D2D;color:#fff;cursor:pointer;font-family:inherit">⎙ Muhasebeciye Gönder</button>';
  h+='</div>';
  farklar.forEach(function(f,idx){
    var renk = f.tip==='sistemde_var'?'#185FA5':f.tip==='muhasebecide_var'?'#854F0B':'#A32D2D';
    var etiket = f.tip==='sistemde_var'?'Muhasebecide Yok':f.tip==='muhasebecide_var'?'Sistemde Yok':'Tutar Farkı';
    h+='<div style="padding:10px 16px;border-bottom:0.5px solid var(--b)">';
    h+='<div style="display:flex;align-items:flex-start;gap:10px">';
    h+='<span style="font-size:9px;padding:2px 6px;border-radius:3px;background:'+renk+';color:#fff;white-space:nowrap;margin-top:1px">'+etiket+'</span>';
    h+='<div style="flex:1">';
    h+='<div style="font-size:11px;color:var(--t);font-weight:500">'+(f.i.fisNo?'Fiş: '+f.i.fisNo:'Tarih: '+f.i.tarih)+'</div>';
    h+='<div style="font-size:10px;color:var(--t2);margin-top:2px">'+f.i.aciklama+'</div>';
    if(f.i.borc) h+='<div style="font-size:10px;color:var(--t3)">Borç: '+f.i.borc.toLocaleString('tr-TR')+'</div>';
    h+='</div>';
    h+='</div>';
    h+='<div style="margin-top:6px"><textarea id="mv-not-'+idx+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onchange="window._mvDuzeltmeNotu['+idx+']=this.value" placeholder="Düzeltme notu — ne yapılacak?" style="width:100%;font-size:10px;padding:6px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);height:50px;resize:none;font-family:inherit;box-sizing:border-box"></textarea></div>';
    h+='</div>';
  });
  h+='</div>';
  return h;
};

window._mvIletimRaporuPDF = function() {
  var farklar = window._mvSonFarklar||[];
  if(!farklar.length){window.toast?.('Fark bulunamadı','warn');return;}
  var donem = window._mvDonem||'export';
  var tarih = new Date().toLocaleDateString('tr-TR');
  var kullanici = window.CU?.()?.displayName||'';
  var html='<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Muavin Fark Raporu</title>';
  html+='<style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:11px}';
  html+='.baslik{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}';
  html+='.fark{border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px}';
  html+='.etiket{display:inline-block;padding:2px 8px;border-radius:3px;color:#fff;font-size:10px;margin-bottom:6px}';
  html+='.not{background:#f9f9f9;border:1px solid #ddd;padding:8px;border-radius:4px;margin-top:6px;font-style:italic}';
  html+='.imza{display:flex;justify-content:space-between;margin-top:50px}';
  html+='.imza-alan{text-align:center;width:200px}.imza-cizgi{border-top:1px solid #111;padding-top:6px;margin-top:40px}';
  html+='</style></head><body>';
  html+='<div class="baslik"><h2>DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</h2>';
  html+='<h3>MUAVİN DEFTER FARK VE DÜZELTİM RAPORU</h3>';
  html+='<p>Dönem: <strong>'+donem+'</strong> &nbsp;|&nbsp; Tarih: '+tarih+'&nbsp;|&nbsp; Hazırlayan: '+kullanici+'</p></div>';
  html+='<p>Bu rapor, şirket kayıtları ile muhasebeci muavin defteri arasındaki farklılıkları göstermektedir.</p>';
  html+='<h3>Tespit Edilen Farklar ('+farklar.length+' adet)</h3>';
  farklar.forEach(function(f,i){
    var renk = f.tip==='sistemde_var'?'#185FA5':f.tip==='muhasebecide_var'?'#854F0B':'#A32D2D';
    var etiket = f.tip==='sistemde_var'?'Muhasebecide Yok':f.tip==='muhasebecide_var'?'Sistemde Yok':'Tutar Farkı';
    var not = window._mvDuzeltmeNotu[i]||'';
    html+='<div class="fark">';
    html+='<span class="etiket" style="background:'+renk+'">'+etiket+'</span>';
    html+='<div><strong>'+(f.i.fisNo?'Fiş No: '+f.i.fisNo:'Tarih: '+f.i.tarih)+'</strong></div>';
    if(f.i.cari) html+='<div>Cari: '+f.i.cari+'</div>';
    if(f.i.borc) html+='<div>Borç: '+f.i.borc.toLocaleString('tr-TR')+' TL</div>';
    if(not) html+='<div class="not">Düzeltme Notu: '+not+'</div>';
    else html+='<div class="not" style="color:#999">Düzeltme notu girilmedi</div>';
    html+='</div>';
  });
  html+='<div class="imza">';
  html+='<div class="imza-alan"><div class="imza-cizgi">Şirket Yetkilisi</div></div>';
  html+='<div class="imza-alan"><div class="imza-cizgi">Mali Müşavir</div></div>';
  html+='</div>';
  html+='</body></html>';
  var win=window.open('','_blank');
  if(!win){window.toast?.('Popup engellendi','warn');return;}
  win.document.write(html);
  win.document.close();
  win.print();
  window.toast?.('Rapor açıldı — yazdır veya PDF kaydet','ok');
};

window._mvBaranSatirHTML = function(islemler) {
  if (!islemler||!islemler.length) return '<tr><td colspan="11" style="padding:20px;text-align:center;color:var(--t3);font-size:11px">Kayıt bulunamadı</td></tr>';
  return islemler.map(function(i){
    return '<tr style="border-bottom:0.5px solid var(--b)">'
      +'<td style="padding:4px 8px;font-size:10px;color:var(--t2)">'+window._esc(i.islemTuru||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px">'+(i.tarih||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+window._esc(i.aciklama||'')+'">'+window._esc(i.aciklama||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;font-family:monospace">'+window._esc(i.faturaSeri||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;font-family:monospace;color:#185FA5">'+window._esc(i.faturaSira||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;font-family:monospace">'+(i.borcMeblagh?i.borcMeblagh.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:center">'+window._esc(i.borcDoviz||'')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;font-family:monospace">'+(i.alacakMeblagh?i.alacakMeblagh.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:center">'+window._esc(i.alacakDoviz||'')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;font-family:monospace">'+(i.tlBakiye?i.tlBakiye.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—')+'</td>'
      +'<td></td>'
      +'</tr>';
  }).join('');
};

/* ── T3-MV-003: Fuzzy cari adı eşleştirme ──────────────────── */
function _mvFuzzyEsles(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().replace(/[^a-züğışçöa-z0-9\s]/gi, '').trim();
  b = b.toLowerCase().replace(/[^a-züğışçöa-z0-9\s]/gi, '').trim();
  if (a === b) return 100;
  var aKelimeler = a.split(/\s+/).filter(function(k){ return k.length > 2; });
  var bKelimeler = b.split(/\s+/).filter(function(k){ return k.length > 2; });
  var eslesenKelime = 0;
  aKelimeler.forEach(function(ak) {
    if (bKelimeler.some(function(bk){ return bk.indexOf(ak) !== -1 || ak.indexOf(bk) !== -1; })) eslesenKelime++;
  });
  if (!aKelimeler.length) return 0;
  return Math.round((eslesenKelime / aKelimeler.length) * 100);
}

function _mvCariCikar(aciklama) {
  if (!aciklama) return '';
  var hvlMatch = aciklama.match(/HVL-([^-\s]+)/i);
  if (hvlMatch) return hvlMatch[1].trim();
  var snMatch = aciklama.match(/SN:\d+\s+([A-ZÜĞIŞÇÖ][^-]+?)(?:\s{2,}|$)/i);
  if (snMatch) return snMatch[1].trim();
  var intMatch = aciklama.match(/INT-HVL-([^-\s]+)/i);
  if (intMatch) return intMatch[1].trim();
  var buyukMatch = aciklama.match(/([A-ZÜĞIŞÇÖ][A-ZÜĞIŞÇÖa-züğışçö\s]{4,30})/);
  if (buyukMatch) return buyukMatch[1].trim();
  return '';
}

function _mvTarihFark(t1, t2) {
  try {
    var d1 = new Date(t1.split('.').reverse().join('-'));
    var d2 = new Date(t2.split('.').reverse().join('-'));
    return Math.abs((d1 - d2) / 86400000);
  } catch(e) { return 999; }
}

window._mvEslestir = function() {
  var islemlerM = window._mvSonIslemler || [];
  var islemlerB = window._mvSonIslemlerB || [];
  if (!islemlerM.length || !islemlerB.length) {
    window.toast && window.toast('Her iki dosya da yüklenmeli', 'warn');
    return;
  }
  window.toast && window.toast('Karşılaştırılıyor...', 'info');
  var eslesen = [], farkVar = [], dovizFark = [], sadeceMuhasebe = [], sadeceBaran = [];
  var eslesenMIdx = [], eslesenBIdx = [];

  islemlerB.forEach(function(b, bi) {
    var bCari = _mvCariCikar(b.aciklama) || b.islemTuru || '';
    var bTutar = b.borcMeblagh || b.alacakMeblagh || 0;
    var bDoviz = b.borcDoviz || b.alacakDoviz || 'TRY';
    var enIyiSkor = 0, enIyiM = null, enIyiMi = -1;

    islemlerM.forEach(function(m, mi) {
      if (eslesenMIdx.indexOf(mi) !== -1) return;
      var mCari = m.cariAd || '';
      var cariSkor = _mvFuzzyEsles(bCari, mCari);
      if (cariSkor < 60) return;
      var tarihFark = _mvTarihFark(b.tarih || '', m.tarih || '');
      if (tarihFark > 5) return;
      var toplam = cariSkor + Math.max(0, 30 - tarihFark * 5);
      if (toplam > enIyiSkor) { enIyiSkor = toplam; enIyiM = m; enIyiMi = mi; }
    });

    if (!enIyiM) { sadeceBaran.push(b); return; }

    var mTutar = enIyiM.borc || enIyiM.alacak || 0;
    var mDoviz = 'TRY';
    eslesenMIdx.push(enIyiMi);
    eslesenBIdx.push(bi);

    if (bDoviz !== 'TRY' && bDoviz !== mDoviz) {
      dovizFark.push({ m: enIyiM, b: b, not: 'Para birimi farklı: ' + bDoviz + ' / ' + mDoviz });
    } else if (Math.abs(bTutar - mTutar) > 1) {
      farkVar.push({ m: enIyiM, b: b, fark: Math.abs(bTutar - mTutar) });
    } else {
      eslesen.push({ m: enIyiM, b: b });
    }
  });

  islemlerM.forEach(function(m, mi) {
    if (eslesenMIdx.indexOf(mi) === -1) sadeceMuhasebe.push(m);
  });

  window._mvEslesmeSonucu = { eslesen: eslesen, farkVar: farkVar, dovizFark: dovizFark, sadeceMuhasebe: sadeceMuhasebe, sadeceBaran: sadeceBaran };
  window.toast && window.toast('Karşılaştırma tamamlandı — ' + eslesen.length + ' eşleşti, ' + (farkVar.length + sadeceMuhasebe.length + sadeceBaran.length) + ' fark', 'ok');
  window._mvAktifTab = 'karsilastirma';
  window.renderMuavin && window.renderMuavin();
};

window._mvEslesmeSonucHTML = function() {
  var s = window._mvEslesmeSonucu;
  if (!s) return '';
  var h = '<div style="overflow-y:auto">';
  h += '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:0.5px solid var(--b);background:var(--s2)">';
  var ozetler = [
    { lbl: 'Eşleşti', val: s.eslesen.length, renk: '#27500A', bg: '#EAF3DE' },
    { lbl: 'Tutar Farkı', val: s.farkVar.length, renk: '#854F0B', bg: '#FAEEDA' },
    { lbl: 'Döviz Farkı', val: s.dovizFark.length, renk: '#185FA5', bg: '#E6F1FB' },
    { lbl: 'Sadece Muhasebe', val: s.sadeceMuhasebe.length, renk: '#A32D2D', bg: '#FCEBEB' },
    { lbl: 'Sadece Baran', val: s.sadeceBaran.length, renk: '#633806', bg: '#FAEEDA' }
  ];
  ozetler.forEach(function(o, i) {
    h += '<div style="padding:10px 12px;border-right:' + (i<4?'0.5px solid var(--b)':'none') + ';background:' + o.bg + '">';
    h += '<div style="font-size:18px;font-weight:500;color:' + o.renk + '">' + o.val + '</div>';
    h += '<div style="font-size:10px;color:' + o.renk + ';margin-top:2px">' + o.lbl + '</div>';
    h += '</div>';
  });
  h += '</div>';
  if (s.farkVar.length) {
    h += '<div style="padding:10px 12px;font-size:11px;font-weight:500;color:var(--t);border-bottom:0.5px solid var(--b);background:#FAEEDA">Tutar Farkları (' + s.farkVar.length + ')</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Cari</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Tarih M</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Tutar M (TL)</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Tarih B</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Tutar B</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Fark</th></tr></thead><tbody>';
    s.farkVar.forEach(function(f) {
      var mT = f.m.borc || f.m.alacak || 0;
      var bT = f.b.borcMeblagh || f.b.alacakMeblagh || 0;
      h += '<tr style="border-bottom:0.5px solid var(--b);background:#FAEEDA"><td style="padding:4px 8px;font-weight:500">' + (typeof window._esc==='function'?window._esc(f.m.cariAd||'—'):(f.m.cariAd||'—')) + '</td><td style="padding:4px 8px">' + (f.m.tarih||'—') + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace">' + mT.toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</td><td style="padding:4px 8px">' + (f.b.tarih||'—') + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace">' + bT.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ' + (f.b.borcDoviz||f.b.alacakDoviz||'') + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace;color:#A32D2D;font-weight:500">' + f.fark.toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</td></tr>';
    });
    h += '</tbody></table>';
  }
  if (s.sadeceMuhasebe.length) {
    h += '<div style="padding:10px 12px;font-size:11px;font-weight:500;color:var(--t);border-bottom:0.5px solid var(--b);border-top:0.5px solid var(--b);background:#FCEBEB">Sadece Muhasebede (' + s.sadeceMuhasebe.length + ')</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Cari</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Tarih</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Fiş No</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Borç</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Alacak</th></tr></thead><tbody>';
    s.sadeceMuhasebe.forEach(function(m) {
      h += '<tr style="border-bottom:0.5px solid var(--b);background:#FCEBEB"><td style="padding:4px 8px;font-weight:500">' + (typeof window._esc==='function'?window._esc(m.cariAd||'—'):(m.cariAd||'—')) + '</td><td style="padding:4px 8px">' + (m.tarih||'—') + '</td><td style="padding:4px 8px;font-family:monospace">' + (m.fisNo||'—') + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace">' + (m.borc?m.borc.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—') + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace">' + (m.alacak?m.alacak.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—') + '</td></tr>';
    });
    h += '</tbody></table>';
  }
  if (s.sadeceBaran.length) {
    h += '<div style="padding:10px 12px;font-size:11px;font-weight:500;color:var(--t);border-bottom:0.5px solid var(--b);border-top:0.5px solid var(--b);background:#FAEEDA">Sadece Baran\'da (' + s.sadeceBaran.length + ')</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">İşlem Türü</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Tarih</th><th style="padding:5px 8px;text-align:left;border-bottom:0.5px solid var(--b)">Açıklama</th><th style="padding:5px 8px;text-align:right;border-bottom:0.5px solid var(--b)">Tutar</th></tr></thead><tbody>';
    s.sadeceBaran.forEach(function(b) {
      var tutar = b.borcMeblagh || b.alacakMeblagh || 0;
      var doviz = b.borcDoviz || b.alacakDoviz || '';
      h += '<tr style="border-bottom:0.5px solid var(--b);background:#FAEEDA"><td style="padding:4px 8px">' + (typeof window._esc==='function'?window._esc(b.islemTuru||'—'):(b.islemTuru||'—')) + '</td><td style="padding:4px 8px">' + (b.tarih||'—') + '</td><td style="padding:4px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (typeof window._esc==='function'?window._esc(b.aciklama||''):(b.aciklama||'')) + '">' + (typeof window._esc==='function'?window._esc(b.aciklama||'—'):(b.aciklama||'—')) + '</td><td style="padding:4px 8px;text-align:right;font-family:monospace">' + (tutar?tutar.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—') + ' ' + doviz + '</td></tr>';
    });
    h += '</tbody></table>';
  }
  h += '</div>';
  return h;
};

console.log('[MUAVIN-PARSE] yüklendi');

