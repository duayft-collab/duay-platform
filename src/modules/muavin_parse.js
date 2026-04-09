
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

window._mvDosyaOku = function(inp) {
  var f = inp.files[0]; if(!f) return;
  var isXlsx = f.name.match(/\.xlsx?$/i);
  if(isXlsx) {
    var r = new FileReader();
    r.onload = function(e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        var ws = wb.Sheets[wb.SheetNames[0]];
        var tsv = XLSX.utils.sheet_to_csv(ws, {FS:'\t', RS:'\n'});
        var ta = document.getElementById('mv-excel-ham');
        if(ta) { ta.value = tsv; window.toast?.('.xlsx yüklendi — '+f.name,'ok'); }
      } catch(err) { window.toast?.('xlsx okunamadı: '+err.message,'err'); }
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2 = new FileReader();
    r2.onload = function(e) {
      var ta = document.getElementById('mv-excel-ham');
      if(ta) { ta.value = e.target.result; window.toast?.(f.name+' yüklendi','ok'); }
    };
    r2.readAsText(f, 'UTF-8');
  }
};

var _mvHesapKoduMap = {
  kira:       '770.01',
  fatura:     '770.02',
  abonelik:   '770.03',
  vergi:      '360.01',
  sigorta:    '370.01',
  maas:       '335.01',
  kredi_k:    '780.01',
  kredi:      '300.01',
  diger:      '770.99'
};

window._mvSistemTutar = function(hesapKodu, donem) {
  var odmler = typeof window.loadOdm==='function' ? window.loadOdm() : [];
  var yil = parseInt(donem); var q = parseInt(donem.replace(/^\d{4}Q/,''));
  var ayBaslangic = (q-1)*3; var ayBitis = ayBaslangic+2;
  var donemOdm = odmler.filter(function(o){
    if (o.isDeleted) return false;
    var tarih = new Date(o.dueDate||o.createdAt||'');
    if (isNaN(tarih)) return false;
    var ay = tarih.getMonth(); var oy = tarih.getFullYear();
    return oy===yil && ay>=ayBaslangic && ay<=ayBitis;
  });
  var kategoriList = [];
  Object.keys(_mvHesapKoduMap).forEach(function(k){ if(_mvHesapKoduMap[k]===hesapKodu) kategoriList.push(k); });
  var toplam = donemOdm.filter(function(o){ return kategoriList.indexOf(o.kategori||o.category||'') !== -1; })
    .reduce(function(s,o){ return s+(parseFloat(o.amountTRY)||parseFloat(o.amount)||0); },0);
  return toplam;
};

window._mvKarsilastir = function() {
  var text = document.getElementById('mv-excel-ham')?.value||'';
  if(!text.trim()){window.toast?.('Excel verisi giriniz','warn');return;}
  var satirlar = text.split(/\r?\n/);
  var donem = window._mvDonem || new Date().getFullYear()+'Q'+Math.ceil((new Date().getMonth()+1)/3);
  var hesaplar = {};
  var aktifCari = '';
  var aktifHesapKodu = '';
  var islemler = [];
  satirlar.forEach(function(satir){
    if(!satir.trim()) return;
    var p = satir.split(/\t/).map(function(x){
      return x.trim().replace(/^"|"$/g,'').replace(/\u00A0/g,' ');
    });
    var ilk = p[0]||'';
    var tarihRe = /^\d{2}[.\-\/]\d{2}[.\-\/]\d{4}$/;
    var hesapRe = /^\d{3}[\.\-]\w/;
    var toplamRe = /Nakli|Genel\s*Toplam|Yekün/i;
    if(toplamRe.test(ilk) || toplamRe.test(satir)) return;
    if(hesapRe.test(ilk)) {
      var bosHucre = ilk.indexOf(' ');
      aktifHesapKodu = bosHucre>0 ? ilk.slice(0,bosHucre) : ilk;
      aktifCari = bosHucre>0 ? ilk.slice(bosHucre+1).trim() : (p[1]||'');
      if(!hesaplar[aktifHesapKodu]) hesaplar[aktifHesapKodu]={ad:aktifHesapKodu,cari:aktifCari,islemler:[],borc:0,alacak:0,bakiye:0};
      return;
    }
    if(tarihRe.test(ilk) && aktifHesapKodu) {
      var tip = p[1]||'';
      var fisNo = p[2]||'';
      var aciklama = (p[3]||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var borc = parseFloat((p[4]||'').replace(/\./g,'').replace(',','.'))||0;
      var alacak = parseFloat((p[5]||'').replace(/\./g,'').replace(',','.'))||0;
      var bakiye = parseFloat((p[6]||'').replace(/\./g,'').replace(',','.'))||0;
      var ba = p[7]||'';
      var borcDov = parseFloat((p[9]||'').replace(/\./g,'').replace(',','.'))||0;
      var alacakDov = parseFloat((p[10]||'').replace(/\./g,'').replace(',','.'))||0;
      var bakiyeDov = parseFloat((p[11]||'').replace(/\./g,'').replace(',','.'))||0;
      var baDov = p[12]||'';
      var islem = {tarih:ilk,tip:tip,fisNo:fisNo,aciklama:aciklama,borc:borc,alacak:alacak,bakiye:bakiye,ba:ba,borcDov:borcDov,alacakDov:alacakDov,bakiyeDov:bakiyeDov,baDov:baDov,hesap:aktifHesapKodu,cari:aktifCari};
      hesaplar[aktifHesapKodu].islemler.push(islem);
      hesaplar[aktifHesapKodu].borc += borc;
      hesaplar[aktifHesapKodu].alacak += alacak;
      hesaplar[aktifHesapKodu].bakiye = bakiye;
      islemler.push(islem);
    }
  });
  window._mvSonHesaplar = hesaplar;
  window._mvSonIslemler = islemler;
  var hesapSayisi = Object.keys(hesaplar).length;
  var islemSayisi = islemler.length;
  var kayit = {id:Date.now(),donem:donem,tarih:new Date().toISOString().slice(0,16).replace('T',' '),hesapSayisi:hesapSayisi,islemSayisi:islemSayisi,hesaplar:hesaplar,islemler:islemler};
  var liste = _mvLoad(); liste.push(kayit); if(liste.length>10) liste=liste.slice(-10); _mvStore(liste);
  window.toast?.('Parse tamamlandı: '+hesapSayisi+' hesap, '+islemSayisi+' işlem','ok');
  window.renderMuavin();
};

/* ── MUAVIN-006: İkinci Excel Karşılaştırma + Fark Raporu ──── */
window._mvSonHesaplar2 = null;
window._mvSonIslemler2 = [];

window._mvDosyaOku2 = function(inp) {
  var f = inp.files[0]; if (!f) return;
  var isXlsx = f.name.match(/\.xlsx?$/i);
  if (isXlsx) {
    var r = new FileReader();
    r.onload = function(e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var tsv = XLSX.utils.sheet_to_csv(ws, { FS: '\t', RS: '\n' });
        var ta = document.getElementById('mv-excel-ham2');
        if (ta) { ta.value = tsv; window._mvHam2 = tsv; window.toast?.('.xlsx yüklendi — ' + f.name, 'ok'); }
      } catch(err) { window.toast?.('xlsx okunamadı: ' + err.message, 'err'); }
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2 = new FileReader();
    r2.onload = function(e) {
      var ta = document.getElementById('mv-excel-ham2');
      if (ta) { ta.value = e.target.result; window._mvHam2 = e.target.result; window.toast?.(f.name + ' yüklendi', 'ok'); }
    };
    r2.readAsText(f, 'UTF-8');
  }
};

window._mvKarsilastir2 = function() {
  var text = document.getElementById('mv-excel-ham2')?.value || window._mvHam2 || '';
  if (!text.trim()) { window.toast?.('İkinci Excel verisi giriniz — önce yapıştırın veya dosya seçin', 'warn'); return; }
  var islemler2 = [];
  var hesaplar2 = {};
  var aktifCari = '', aktifHesapKodu = '';
  var satirlar = text.split(/\r?\n/);
  satirlar.forEach(function(satir) {
    if (!satir.trim()) return;
    var p = satir.split(/\t/).map(function(x) { return x.trim().replace(/^"|"$/g, '').replace(/\u00A0/g, ' '); });
    var ilk = p[0] || '';
    var tarihRe = /^\d{2}[.\-\/]\d{2}[.\-\/]\d{4}$/;
    var hesapRe = /^\d{3}[\.\-]\w/;
    var toplamRe = /Nakli|Genel\s*Toplam|Yekün/i;
    if (toplamRe.test(satir)) return;
    if (hesapRe.test(ilk)) {
      var bo = ilk.indexOf(' ');
      aktifHesapKodu = bo > 0 ? ilk.slice(0, bo) : ilk;
      aktifCari = bo > 0 ? ilk.slice(bo + 1).trim() : (p[1] || '');
      if (!hesaplar2[aktifHesapKodu]) hesaplar2[aktifHesapKodu] = { ad: aktifHesapKodu, cari: aktifCari, islemler: [], borc: 0, alacak: 0 };
      return;
    }
    if (tarihRe.test(ilk) && aktifHesapKodu) {
      var borc = parseFloat((p[4] || '').replace(/\./g, '').replace(',', '.')) || 0;
      var alacak = parseFloat((p[5] || '').replace(/\./g, '').replace(',', '.')) || 0;
      var islem = { tarih: ilk, fisNo: p[2] || '', aciklama: (p[3] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'), borc: borc, alacak: alacak, hesap: aktifHesapKodu, cari: aktifCari };
      hesaplar2[aktifHesapKodu].islemler.push(islem);
      hesaplar2[aktifHesapKodu].borc += borc;
      hesaplar2[aktifHesapKodu].alacak += alacak;
      islemler2.push(islem);
    }
  });
  window._mvSonHesaplar2 = hesaplar2;
  window._mvSonIslemler2 = islemler2;
  window.toast?.('İkinci Excel: ' + islemler2.length + ' işlem yüklendi', 'ok');
  window._mvFarkRaporu();
};

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

console.log('[MUAVIN-PARSE] yüklendi');

