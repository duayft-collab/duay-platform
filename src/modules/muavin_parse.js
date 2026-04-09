
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
        if(ta) { ta.value = tsv; window._mvHam = tsv; window._mvDosyaAd = f.name; window._mvDosyaTarih = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}); window.toast?.('.xlsx yüklendi — '+f.name,'ok'); }
      } catch(err) { window.toast?.('xlsx okunamadı: '+err.message,'err'); }
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2 = new FileReader();
    r2.onload = function(e) {
      var ta = document.getElementById('mv-excel-ham');
      if(ta) { ta.value = e.target.result; window._mvHam = e.target.result; window._mvDosyaAd = f.name; window._mvDosyaTarih = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}); window.toast?.(f.name+' yüklendi','ok'); }
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
  /* MUAVIN-016: Mükerrer/tutarsız/şüpheli/KDV tespiti */
  var fisNoMap = {};
  var mukerrerler = [];
  var tutarsizlar = [];
  var supheliler = [];
  var kdvFarklari = [];
  islemler.forEach(function(i) {
    if (i.fisNo) {
      if (fisNoMap[i.fisNo]) { if (mukerrerler.indexOf(i.fisNo) === -1) mukerrerler.push(i.fisNo); }
      else { fisNoMap[i.fisNo] = true; }
    }
    if (i.borc && i.alacak && Math.abs(Math.abs(i.bakiye) - Math.abs(i.borc - i.alacak)) > 1) {
      tutarsizlar.push(i.fisNo || i.tarih);
    }
    if ((i.borc > 100000 || i.alacak > 100000) && (!i.aciklama || i.aciklama.length < 5)) {
      supheliler.push({ tip: 'Yüksek tutar + kısa açıklama', fisNo: i.fisNo, tutar: i.borc || i.alacak });
    }
    var kdvOran = i.aciklama ? (i.aciklama.match(/%(\d+)\s*KDV/i) || i.aciklama.match(/KDV[:\s]+%?(\d+)/i)) : null;
    if (kdvOran) {
      var oran = parseInt(kdvOran[1]);
      if (oran !== 0 && oran !== 1 && oran !== 8 && oran !== 10 && oran !== 18 && oran !== 20) {
        kdvFarklari.push({ fisNo: i.fisNo, oran: oran });
      }
    }
  });
  window._mvUyarilar = {
    mukerrer: mukerrerler,
    tutarsiz: tutarsizlar,
    supheli: supheliler,
    kdv: kdvFarklari
  };
  var hesapSayisi = Object.keys(hesaplar).length;
  var islemSayisi = islemler.length;
  var kayit = {id:Date.now(),donem:donem,tarih:new Date().toISOString().slice(0,16).replace('T',' '),hesapSayisi:hesapSayisi,islemSayisi:islemSayisi,hesaplar:hesaplar,islemler:islemler};
  var liste = _mvLoad(); liste.push(kayit); if(liste.length>10) liste=liste.slice(-10); _mvStore(liste);
  window._mvDosyaSatir = islemSayisi;
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
        if (ta) { ta.value = tsv; window._mvHam2 = tsv; window._mvDosya2Ad = f.name; window._mvDosya2Tarih = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}); window.toast?.('.xlsx yüklendi — ' + f.name, 'ok'); }
      } catch(err) { window.toast?.('xlsx okunamadı: ' + err.message, 'err'); }
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2 = new FileReader();
    r2.onload = function(e) {
      var ta = document.getElementById('mv-excel-ham2');
      if (ta) { ta.value = e.target.result; window._mvHam2 = e.target.result; window._mvDosya2Ad = f.name; window._mvDosya2Tarih = new Date().toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}); window.toast?.(f.name + ' yüklendi', 'ok'); }
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
  window._mvDosya2Satir = islemler2.length;
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

console.log('[MUAVIN-PARSE] yüklendi');

