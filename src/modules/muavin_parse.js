
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

function _mvParseTarih(s) {
  if(!s) return null;
  var str = String(s).trim();
  var m = str.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/);
  if(m) {
    var gun=parseInt(m[1]),ay=parseInt(m[2]),yil=parseInt(m[3]);
    if(yil<100) yil+=2000;
    var d=new Date(yil,ay-1,gun);
    return isNaN(d.getTime())?null:d;
  }
  var d2=new Date(s);
  return isNaN(d2.getTime())?null:d2;
}

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
    var tarihObj = _mvParseTarih(kolonlar[0]);
    if (!tarihObj) {
      var m = ilk.match(/^(\d{2,3}[\.\w]+)\s+(.+)$/);
      if (m) { mevcutHesapKodu = m[1]; mevcutCari = m[2].trim(); }
      return;
    }
    var borc = parseFloat((kolonlar[4]||'').replace(',','.'))||0;
    var alacak = parseFloat((kolonlar[5]||'').replace(',','.'))||0;
    var tip = (kolonlar[1]||'').trim();
    var fisNo = (kolonlar[2]||'').trim();
    var aciklama = (kolonlar[3]||'').trim();
    var faturaNo = (typeof window._mvNormalize?.faturaNoAyikla === 'function' ? (window._mvNormalize.faturaNoAyikla(aciklama) || window._mvNormalize.faturaNoAyikla(fisNo)) : null) || fisNo;
    if (!tip && !fisNo && borc===0 && alacak===0) return;
    islemler.push({
      tarih: tarihObj.toLocaleDateString('tr-TR'),
      tip: tip, fisNo: fisNo, faturaNo: faturaNo,
      aciklama: aciklama,
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
    var tObj=_mvParseTarih(tarih);
    islemler.push({
      islemTuru: islemTuru,
      tarih: tObj?tObj.toLocaleDateString('tr-TR'):tarih,
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

  function _isle(tsv, sheetAdi) {
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
    if (taraf === 'muhasebeci') { window._mvSonIslemler = islemler; window._mvSonHesaplar = {}; }
    else { window._mvSonIslemlerB = islemler; }
    window._mvEslesmeSonucu = null;
    /* Normalize engine \u2014 firma ay\u0131r\u0131\u015ft\u0131rma */
    try {
      var _don = window._mvDonem || (new Date().getFullYear() + 'Q' + Math.ceil((new Date().getMonth() + 1) / 3));
      var _meta = JSON.parse(localStorage.getItem('ak_muavin_meta_v1') || '{}');
      if (!_meta[_don]) _meta[_don] = {};
      var _genericSheets = ['Sheet1','Sayfa1','Sheet','Sayfa','Data','Veri','1','-',''];
      var _dosyaAdi = f.name.replace(/\.(xlsx?|csv|txt|ods)$/i, '').trim();
      /* Dosya ad\u0131ndan firma ad\u0131 temizle: tarih, say\u0131, Ekstre gibi g\u00fcr\u00fclt\u00fc kald\u0131r */
      var _temizDosyaAdi = _dosyaAdi.replace(/[-_]/g, ' ').replace(/\b\d{1,4}\b/g, '').replace(/\b(ekstre|ekstresi|hesap|hareket|rapor|liste|mutabakat|cari|detay)\b/gi, '').replace(/\s+/g, ' ').trim();
      var firmaAdi = document.getElementById('mv-firma-adi')?.value?.trim() || (sheetAdi && _genericSheets.indexOf(sheetAdi) === -1 ? sheetAdi : null) || _temizDosyaAdi || _dosyaAdi;
      if (taraf === 'muhasebeci' && typeof window._mvNormalize?.muhasebecdenNormalize === 'function') {
        _meta[_don].muhasebeci = _meta[_don].muhasebeci || {};
        _meta[_don].muhasebeci.normalArr = window._mvNormalize.muhasebecdenNormalize(islemler, firmaAdi);
        _meta[_don].muhasebeci.firmaAdi = firmaAdi;
      } else if (taraf === 'baran' && typeof window._mvNormalize?.sirkettenNormalize === 'function') {
        _meta[_don].baran = _meta[_don].baran || {};
        _meta[_don].baran.normalArr = window._mvNormalize.sirkettenNormalize(islemler, null);
        _meta[_don].baran.firmaAdi = firmaAdi;
      }
      localStorage.setItem('ak_muavin_meta_v1', JSON.stringify(_meta));
      window._mvMeta = _meta;
    } catch (normErr) { console.warn('[MUAVIN] normalize hata:', normErr); }
    window.toast?.( f.name + ' y\u00fcklendi \u2014 ' + islemler.length + ' i\u015flem', 'ok');
    window._mvAktifTab = 'karsilastirma';
    window.renderMuavin?.();
    /* MUAVIN-OTO-ESLESTIR-001: her iki dosya da hazırsa otomatik karşılaştır */
    setTimeout(function() {
      var mOk = !!(window._mvSonIslemler && window._mvSonIslemler.length);
      var bOk = !!(window._mvSonIslemlerB && window._mvSonIslemlerB.length);
      if (mOk && bOk && !window._mvEslesmeSonucu) {
        window.toast?.('Her iki dosya hazır — otomatik karşılaştırılıyor...', 'ok');
        window._mvEslestir?.();
      }
    }, 600);
  }

  if (/\.xls[xm]?$/i.test(f.name)) {
    var r=new FileReader();
    r.onload=function(e){
      try {
        if(typeof XLSX==='undefined'){window.toast&&window.toast('SheetJS yüklenmedi','err');return;}
        var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
        _isle(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]],{FS:'\t',RS:'\n'}), wb.SheetNames[0] || '');
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
  var is2 = window._mvSonIslemlerB || [];
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
  var is2 = window._mvSonIslemlerB||[];
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
  if (!islemler||!islemler.length) return '<tr><td colspan="12" style="padding:20px;text-align:center;color:var(--t3);font-size:11px">Kayıt bulunamadı</td></tr>';
  /* MUAVIN-KOLON-UNIF-001: 12-kolon unified format (baran side) */
  return islemler.map(function(i){
    var esnNo = i.snNo || i.faturaNo || (i.faturaSeri&&i.faturaSira ? i.faturaSeri+i.faturaSira : null) || '—';
    var dovizCinsi = i.borcDoviz || i.alacakDoviz || i.borcDovizCinsi || i.alacakDovizCinsi || 'TRL';
    var isTL = dovizCinsi==='TRL' || dovizCinsi==='TRY';
    var borcMeb = parseFloat(i.borcMeblagh||i.borcMeblag||0);
    var alacakMeb = parseFloat(i.alacakMeblagh||i.alacakMeblag||0);
    var dovizTutar = isTL ? 0 : (borcMeb || alacakMeb);
    var kurAlis = i.kurAlis ? i.kurAlis.toFixed(4) : (isTL?'—':'⏳');
    var kurSatis = i.kurSatis ? i.kurSatis.toFixed(4) : (isTL?'—':'⏳');
    var tip = i.islemTuru || '—';
    return '<tr style="border-bottom:0.5px solid var(--b)">'
      +'<td style="padding:4px 8px;font-size:10px">'+(i.tarih||'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;color:var(--t3)">'+window._esc(tip)+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;font-family:monospace;color:#185FA5">'+window._esc(esnNo)+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+window._esc(i.aciklama||'')+'">'+window._esc((i.aciklama||'').slice(0,55))+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;color:'+(borcMeb>0?'#A32D2D':'var(--t3)')+'">'+(borcMeb>0?borcMeb.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;color:'+(alacakMeb>0?'#16A34A':'var(--t3)')+'">'+(alacakMeb>0?alacakMeb.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:10px;text-align:right;color:#185FA5;font-family:monospace">'+(dovizTutar?dovizTutar.toLocaleString('tr-TR',{minimumFractionDigits:2}):'—')+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;color:#185FA5">'+window._esc(dovizCinsi)+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;text-align:right;color:#854F0B;font-family:monospace">'+kurAlis+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;text-align:right;color:#854F0B;font-family:monospace">'+kurSatis+'</td>'
      +'<td style="padding:4px 8px;font-size:9px;color:var(--t3)">—</td>'
      +'<td style="padding:4px 8px"></td>'
      +'</tr>';
  }).join('');
};

/* ── T3-MV-003: Fuzzy cari adı eşleştirme ──────────────────── */
function _mvFuzzyEsles(a, b) {
  if (!a || !b) return 0;
  var norm = function(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/\bltd\b|\bllc\b|\b\u015fti\b|\ba\.\u015f\b|\binc\b|\bcorp\b|\bco\b/gi, '')
    .replace(/[^a-z0-9\u011f\u00fc\u015f\u0131\u00f6\u00e7\u0430-\u044f\s]/gi, '').trim(); };
  var na = norm(a), nb = norm(b);
  if (na === nb) return 100;
  if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return 90;
  var wordsA = na.split(' ').filter(Boolean);
  var wordsB = nb.split(' ').filter(Boolean);
  var esles = wordsA.filter(function(w) { return wordsB.some(function(x) { return x === w || (x.length > 3 && w.indexOf(x) !== -1) || (w.length > 3 && x.indexOf(w) !== -1); }); });
  var wordScore = wordsA.length > 0 ? (esles.length / Math.max(wordsA.length, wordsB.length)) * 100 : 0;
  /* Levenshtein mesafesi */
  var lenA = na.length, lenB = nb.length;
  if (lenA > 60 || lenB > 60) return Math.round(wordScore);
  var dp = [];
  for (var i = 0; i <= lenA; i++) { dp[i] = [i]; }
  for (var j = 0; j <= lenB; j++) { dp[0][j] = j; }
  for (var i2 = 1; i2 <= lenA; i2++) for (var j2 = 1; j2 <= lenB; j2++) {
    dp[i2][j2] = na[i2 - 1] === nb[j2 - 1] ? dp[i2 - 1][j2 - 1] : 1 + Math.min(dp[i2 - 1][j2], dp[i2][j2 - 1], dp[i2 - 1][j2 - 1]);
  }
  var levScore = Math.max(0, (1 - dp[lenA][lenB] / Math.max(lenA, lenB)) * 100);
  return Math.round(Math.max(wordScore, levScore));
}
window._mvFuzzyMatch = _mvFuzzyEsles;

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

window._mvHataKategoriHTML = function() {
  var is1 = window._mvSonIslemler||[];
  var isB = window._mvSonIslemlerB||[];
  if(!is1.length&&!isB.length) return '<div style="padding:20px;text-align:center;color:var(--t3)">Önce her iki Excel\'i yükleyin</div>';
  var kategoriler = {
    eksik_kayit: {ad:'Eksik Kayıt',aciklama:'Bir tarafta var diğerinde yok',renkBg:'#FCEBEB',renkText:'#A32D2D',items:[]},
    tutar_farki: {ad:'Tutar Farkı',aciklama:'Aynı fiş farklı tutar',renkBg:'#FAEEDA',renkText:'#854F0B',items:[]},
    tarih_farki: {ad:'Tarih Farkı',aciklama:'Aynı fiş farklı tarih',renkBg:'#E6F1FB',renkText:'#185FA5',items:[]},
    mukerrer: {ad:'Mükerrer Kayıt',aciklama:'Aynı fiş birden fazla kez',renkBg:'#FAEEDA',renkText:'#854F0B',items:[]},
    yuksek_tutar: {ad:'Yüksek Tutar Uyarısı',aciklama:'100.000 TL üstü açıklamasız',renkBg:'#FCEBEB',renkText:'#A32D2D',items:[]}
  };
  var fisMap1={},fisMapB={};
  is1.forEach(function(i){if(i.fisNo){if(fisMap1[i.fisNo])kategoriler.mukerrer.items.push({fisNo:i.fisNo,taraf:'Muhasebeci'});else fisMap1[i.fisNo]=i;}});
  isB.forEach(function(i){if(i.fisNo){if(fisMapB[i.fisNo])kategoriler.mukerrer.items.push({fisNo:i.fisNo,taraf:'Şirket'});else fisMapB[i.fisNo]=i;}});
  Object.keys(fisMap1).forEach(function(fis){
    var i1=fisMap1[fis],iB=fisMapB[fis];
    if(!iB){kategoriler.eksik_kayit.items.push({fisNo:fis,durum:'Muhasebecide var, şirkette yok',tutar:i1.borc||i1.alacak,tarih:i1.tarih});}
    else{
      if(Math.abs((i1.borc||0)-(iB.borc||0))>1||Math.abs((i1.alacak||0)-(iB.alacak||0))>1) kategoriler.tutar_farki.items.push({fisNo:fis,tutar1:i1.borc||i1.alacak,tutarB:iB.borc||iB.alacak,fark:Math.abs((i1.borc||0)-(iB.borc||0))});
      if(i1.tarih!==iB.tarih) kategoriler.tarih_farki.items.push({fisNo:fis,tarih1:i1.tarih,tarihB:iB.tarih});
    }
  });
  Object.keys(fisMapB).forEach(function(fis){if(!fisMap1[fis])kategoriler.eksik_kayit.items.push({fisNo:fis,durum:'Şirkette var, muhasebecide yok',tutar:fisMapB[fis].borc||fisMapB[fis].alacak,tarih:fisMapB[fis].tarih});});
  is1.forEach(function(i){if((i.borc>100000||i.alacak>100000)&&(!i.aciklama||i.aciklama.trim().length<5))kategoriler.yuksek_tutar.items.push({fisNo:i.fisNo,tutar:i.borc||i.alacak,tarih:i.tarih});});
  var toplamHata = Object.values(kategoriler).reduce(function(s,k){return s+k.items.length;},0);
  window._mvSonKategoriler = kategoriler;
  if(!toplamHata) return '<div style="padding:16px;background:#E1F5EE;border-radius:8px;color:#085041;font-size:12px;font-weight:500">✓ Hata bulunamadı — kayıtlar uyuşuyor</div>';
  var h='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">';
  Object.values(kategoriler).forEach(function(k){
    h+='<div style="background:'+k.renkBg+';border-radius:8px;padding:12px;text-align:center">';
    h+='<div style="font-size:22px;font-weight:500;color:'+k.renkText+'">'+k.items.length+'</div>';
    h+='<div style="font-size:9px;font-weight:500;color:'+k.renkText+';margin-top:2px">'+k.ad.toUpperCase()+'</div>';
    h+='<div style="font-size:8px;color:'+k.renkText+';opacity:.7;margin-top:2px">'+k.aciklama+'</div>';
    h+='</div>';
  });
  h+='</div>';
  Object.entries(kategoriler).forEach(function(entry){
    var kat=entry[1];
    if(!kat.items.length) return;
    h+='<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:10px">';
    h+='<div style="background:'+kat.renkBg+';padding:10px 14px;display:flex;align-items:center;justify-content:space-between">';
    h+='<div><span style="font-size:11px;font-weight:500;color:'+kat.renkText+'">'+kat.ad+'</span><span style="font-size:9px;color:'+kat.renkText+';margin-left:8px;opacity:.8">'+kat.aciklama+'</span></div>';
    h+='<span style="font-size:11px;font-weight:500;color:'+kat.renkText+'">'+kat.items.length+' adet</span>';
    h+='</div>';
    h+='<table style="width:100%;border-collapse:collapse;font-size:10px"><tbody>';
    kat.items.slice(0,10).forEach(function(item){
      h+='<tr style="border-bottom:0.5px solid var(--b)">';
      h+='<td style="padding:6px 12px;font-family:monospace;color:var(--t)">'+(item.fisNo||'—')+'</td>';
      h+='<td style="padding:6px 12px;color:var(--t2)">'+(item.durum||item.tarih1||item.taraf||'')+'</td>';
      h+='<td style="padding:6px 12px;text-align:right;color:var(--t3)">'+(item.tutar?item.tutar.toLocaleString('tr-TR'):item.fark?'Fark: '+item.fark.toLocaleString('tr-TR'):'')+'</td>';
      h+='<td style="padding:6px 12px;color:var(--t3)">'+(item.tarih||item.tarihB||'')+'</td>';
      h+='</tr>';
    });
    if(kat.items.length>10) h+='<tr><td colspan="4" style="padding:6px 12px;color:var(--t3);font-style:italic">...ve '+(kat.items.length-10)+' kayıt daha</td></tr>';
    h+='</tbody></table></div>';
  });
  return h;
};

/* ── MUAVIN-NORMALIZE-001: Ortak Form Normalize Engine ──────── */
window._mvNormalize = {
  faturaNoRegex: /BAT\d{10,16}|[A-Z]{2,5}\d{8,16}/g,
  faturaNoAyikla: function(metin) {
    if (!metin) return null;
    var eslesmeler = String(metin).match(window._mvNormalize.faturaNoRegex);
    return eslesmeler ? eslesmeler[0] : null;
  },
  tarihNormalize: function(t) {
    if (!t) return null;
    if (t instanceof Date) return t.toISOString().slice(0, 10);
    var s = String(t).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    var m = s.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (m) { var g = m[1].padStart(2, '0'), ay = m[2].padStart(2, '0'), y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + ay + '-' + g; }
    return null;
  },
  tutarNormalize: function(v) {
    if (v === null || v === undefined || v === '') return 0;
    var s = String(v).replace(/[^\d\.,\-]/g, '').replace(',', '.');
    return parseFloat(s) || 0;
  },
  /* MUAVIN-KUR-CEK-001: TCMB tarihe özel kur → localStorage cache + fallback exchangerate */
  kurCek: async function(tarih, doviz) {
    if (!tarih || !doviz || doviz === 'TRL' || doviz === 'TRY') return null;
    var cacheKey = 'ak_kur_' + tarih + '_' + doviz;
    var cached = localStorage.getItem(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch(e) {} }
    var tarihNo = tarih.replace(/-/g, '');
    var yil = tarih.slice(0, 4);
    var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://www.tcmb.gov.tr/kurlar/' + yil + '/' + tarihNo + '.xml');
    try {
      var r = await fetch(proxyUrl);
      var txt = await r.text();
      var pattern = 'CurrencyCode="' + doviz + '"';
      var idx = txt.indexOf(pattern);
      if (idx === -1) throw new Error('TCMB no match');
      var bolum = txt.slice(idx, idx + 400);
      var alis = bolum.match(/<ForexBuying>([\d.]+)<\/ForexBuying>/);
      var satis = bolum.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/);
      if (!alis) throw new Error('TCMB no ForexBuying');
      var sonuc = { alis: parseFloat(alis[1]), satis: parseFloat(satis ? satis[1] : alis[1]) };
      try { localStorage.setItem(cacheKey, JSON.stringify(sonuc)); } catch(e) {}
      return sonuc;
    } catch(e) {
      try {
        var r2 = await fetch('https://open.er-api.com/v6/latest/' + doviz);
        var d2 = await r2.json();
        if (d2.rates && d2.rates.TRY) {
          var sonuc2 = { alis: parseFloat(d2.rates.TRY.toFixed(4)), satis: parseFloat((d2.rates.TRY * 1.005).toFixed(4)) };
          try { localStorage.setItem(cacheKey, JSON.stringify(sonuc2)); } catch(e3) {}
          return sonuc2;
        }
      } catch(e2) {}
      return null;
    }
  },
  muhasebecdenNormalize: function(satirlar, firmaAdi) {
    var self = window._mvNormalize;
    return satirlar.filter(function(s) { return s.tarih && (s.borc || s.alacak); }).map(function(s) {
      var fatNo = self.faturaNoAyikla(s.aciklama);
      var tutar = self.tutarNormalize(s.borc || 0) - self.tutarNormalize(s.alacak || 0);
      /* MUAVIN-KUR-CEK-001: döviz alanları + kur placeholder */
      return { kaynak: 'muhasebeci', firma: firmaAdi || s.firma || '', faturaNo: fatNo, tarih: self.tarihNormalize(s.tarih), tutarTL: Math.abs(tutar), tutarUSD: 0, tip: tutar > 0 ? 'borc' : 'alacak', aciklama: s.aciklama || '', fisNo: s.fisNo || '', dovizCinsi: 'TRY', dovizBorc: tutar > 0 ? Math.abs(tutar) : 0, dovizAlacak: tutar < 0 ? Math.abs(tutar) : 0, kurAlis: null, kurSatis: null, ham: s };
    });
  },
  sirkettenNormalize: function(satirlar, kurTablosu) {
    var self = window._mvNormalize;
    return satirlar.filter(function(s) { return s.tarih && (s.borcMeblagh || s.alacakMeblagh || s.borcMeblag || s.alacakMeblag); }).map(function(s) {
      var fatNo = s.faturaSira || self.faturaNoAyikla(s.aciklama);
      var _bMeb = s.borcMeblagh || s.borcMeblag || 0;
      var _aMeb = s.alacakMeblagh || s.alacakMeblag || 0;
      var _bDov = s.borcDoviz || s.borcDovizCinsi || '';
      var _aDov = s.alacakDoviz || s.alacakDovizCinsi || '';
      var borcUSD = self.tutarNormalize(_bDov === 'USD' ? _bMeb : 0);
      var alacakUSD = self.tutarNormalize(_aDov === 'USD' ? _aMeb : 0);
      var borcTL = self.tutarNormalize(_bDov === 'TL' || _bDov === 'TRY' ? _bMeb : 0);
      var alacakTL = self.tutarNormalize(_aDov === 'TL' || _aDov === 'TRY' ? _aMeb : 0);
      var kur = kurTablosu && s.tarih ? kurTablosu[self.tarihNormalize(s.tarih)] || kurTablosu['varsayilan'] || 44.55 : 44.55;
      var netUSD = borcUSD - alacakUSD;
      var netTL = borcTL - alacakTL + (netUSD * kur);
      /* MUAVIN-KUR-CEK-001: döviz alanları + kur placeholder */
      return { kaynak: 'sirket', firma: self.firmaAdiAyikla(s.aciklama), faturaNo: fatNo, tarih: self.tarihNormalize(s.tarih), tutarTL: Math.abs(netTL), tutarUSD: Math.abs(netUSD), tip: netTL < 0 ? 'alacak' : 'borc', aciklama: s.aciklama || '', islemTuru: s.islemTuru || '', kur: kur, dovizCinsi: _bDov || _aDov || 'TRY', dovizBorc: self.tutarNormalize(_bMeb), dovizAlacak: self.tutarNormalize(_aMeb), kurAlis: null, kurSatis: null, ham: s };
    });
  },
  firmaAdiAyikla: function(aciklama) {
    if (!aciklama) return '';
    var s = String(aciklama);
    var patterns = [/HVL-([^-]+)-/, /SN:\d+\s+([A-Z\u00c7\u011e\u0130\u00d6\u015e\u00dca-z\u00e7\u011f\u0131\u015f\u00f6\u00fc\s\.]+?)(?:\s+(?:V\.NO|TCKN|VKN|A\.\u015e|LTD))/i, /([A-Z\u00c7\u011e\u0130\u00d6\u015e\u00dc\s]{5,}(?:A\.\u015e\.|LTD\.|A\.S\.))/];
    for (var i = 0; i < patterns.length; i++) { var m = s.match(patterns[i]); if (m && m[1]) return m[1].trim(); }
    return '';
  },
  karsilastir: function(muhasebeci, sirket, esikTL) {
    esikTL = esikTL || 1;
    var map = {};
    muhasebeci.forEach(function(r) { var k = r.faturaNo || r.tarih + '_' + r.tutarTL; map[k] = map[k] || { muhasebeci: null, sirket: null }; map[k].muhasebeci = r; });
    sirket.forEach(function(r) { var k = r.faturaNo || r.tarih + '_' + r.tutarTL; map[k] = map[k] || { muhasebeci: null, sirket: null }; map[k].sirket = r; });
    return Object.values(map).map(function(cift) {
      var m = cift.muhasebeci, s = cift.sirket;
      if (m && s) { var fark = Math.abs((m.tutarTL || 0) - (s.tutarTL || 0)); return { durum: fark <= esikTL ? 'mutabik' : 'fark', farkTL: fark, muhasebeci: m, sirket: s }; }
      else if (m) { return { durum: 'sadece_muhasebeci', farkTL: m.tutarTL || 0, muhasebeci: m, sirket: null }; }
      else { return { durum: 'sadece_sirket', farkTL: s.tutarTL || 0, muhasebeci: null, sirket: s }; }
    });
  },
  mutabakatSkoru: function(sonuclar) {
    if (!sonuclar.length) return 0;
    var mutabik = sonuclar.filter(function(r) { return r.durum === 'mutabik'; }).length;
    return Math.round((mutabik / sonuclar.length) * 100);
  }
};

/* ── MUAVIN-FIRMA-001: Firma Bazlı Liste + Mutabakat Skoru ── */
window._mvFirmaListesi = function() {
  var meta = window._mvMeta || {};
  var donem = typeof window._mvAktifDonem === 'function' ? window._mvAktifDonem() : '';
  var d = meta[donem] || {};
  var muhArr = (d.muhasebeci || {}).normalArr || [];
  var sirArr = (d.baran || {}).normalArr || [];
  var firmalar = {};
  var esl = window._mvFirmaEslestirmeler || {};
  muhArr.forEach(function(r) { var f = r.firma || '?'; var eslF = esl[f] || f; firmalar[eslF] = firmalar[eslF] || { ad: eslF, muhasebeci: [], sirket: [] }; firmalar[eslF].muhasebeci.push(r); });
  sirArr.forEach(function(r) { var f = r.firma || '?'; firmalar[f] = firmalar[f] || { ad: f, muhasebeci: [], sirket: [] }; firmalar[f].sirket.push(r); });
  return Object.values(firmalar).map(function(f) {
    var sonuc = typeof window._mvNormalize?.karsilastir === 'function' ? window._mvNormalize.karsilastir(f.muhasebeci, f.sirket) : [];
    var skor = typeof window._mvNormalize?.mutabakatSkoru === 'function' ? window._mvNormalize.mutabakatSkoru(sonuc) : 0;
    var fark = sonuc.filter(function(r) { return r.durum !== 'mutabik'; }).length;
    return { ad: f.ad, skor: skor, fark: fark, toplam: sonuc.length, sonuc: sonuc };
  }).sort(function(a, b) { return a.skor - b.skor; });
};

window._mvFirmaKarsilastirHTML = function(firma) {
  if (!firma) return '<div style="padding:40px;text-align:center;color:var(--t3)">Firma se\u00e7in</div>';
  var esc = typeof window._esc === 'function' ? window._esc : function(s) { return String(s || ''); };
  var renk = firma.skor >= 90 ? '#0F6E56' : firma.skor >= 70 ? '#854F0B' : '#A32D2D';
  var h = '<div style="padding:16px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  h += '<div style="font-size:14px;font-weight:500">' + esc(firma.ad) + '</div>';
  h += '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:24px;font-weight:700;color:' + renk + '">%' + firma.skor + '</div>';
  h += '<button onclick="event.stopPropagation();window._mvMutabakatMektubu?.(\'' + esc(firma.ad).replace(/'/g, "\\'") + '\')" style="font-size:9px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u2399 Mektup PDF</button>';
  h += '</div></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">';
  h += '<div style="background:var(--s2);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">TOPLAM</div><div style="font-size:18px;font-weight:500">' + firma.toplam + '</div></div>';
  h += '<div style="background:#E1F5EE;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#085041">MUTABIK</div><div style="font-size:18px;font-weight:500;color:#0F6E56">' + (firma.toplam - firma.fark) + '</div></div>';
  h += '<div style="background:#FCEBEB;border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:#791F1F">FARK</div><div style="font-size:18px;font-weight:500;color:#A32D2D">' + firma.fark + '</div></div></div>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2);border-bottom:0.5px solid var(--b)">';
  h += '<th style="padding:6px;text-align:left">Durum</th><th style="padding:6px;text-align:left">Fatura No</th><th style="padding:6px;text-align:left">Tarih</th><th style="padding:6px;text-align:right">Muhasebeci TL</th><th style="padding:6px;text-align:right">\u015eirket TL</th><th style="padding:6px;text-align:right">Fark</th>';
  h += '</tr></thead><tbody>';
  (firma.sonuc || []).forEach(function(r) {
    var bg = r.durum === 'mutabik' ? '' : '#FFF8F8';
    var dr = r.durum === 'mutabik' ? '#0F6E56' : r.durum === 'fark' ? '#854F0B' : '#A32D2D';
    var dl = r.durum === 'mutabik' ? '\u2713 Mutab\u0131k' : r.durum === 'fark' ? '\u26a0 Fark' : r.durum === 'sadece_muhasebeci' ? '\u2190 Sadece Muh.' : '\u2192 Sadece \u015eirket';
    var src = r.muhasebeci || r.sirket || {};
    var fatNo = src.faturaNo || '\u2014';
    var tarih = src.tarih || '\u2014';
    var muhTL = r.muhasebeci ? r.muhasebeci.tutarTL.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '\u2014';
    var sirTL = r.sirket ? r.sirket.tutarTL.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '\u2014';
    var farkTL = (r.farkTL || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
    h += '<tr style="border-bottom:0.5px solid var(--b);background:' + bg + '">';
    h += '<td style="padding:5px 6px;color:' + dr + ';font-weight:500">' + dl + '</td>';
    h += '<td style="padding:5px 6px;font-family:monospace;font-size:9px">' + esc(fatNo) + '</td>';
    h += '<td style="padding:5px 6px;color:var(--t3)">' + esc(tarih) + '</td>';
    h += '<td style="padding:5px 6px;text-align:right">' + muhTL + '</td>';
    h += '<td style="padding:5px 6px;text-align:right">' + sirTL + '</td>';
    h += '<td style="padding:5px 6px;text-align:right;color:' + dr + '">' + farkTL + '</td></tr>';
  });
  h += '</tbody></table></div>';
  return h;
};

/* MUAVIN-PARSE-FIRMA-001: Tek sheet'ten çoklu firma ayrıştırma */
window._mvMuhasebeciFirmaAyristir = function(satirlar) {
  var firmalar = {};
  var aktifFirma = null;
  var firmaSatir = /^\d{3}\.\w+\s+(.+)/;
  satirlar.forEach(function(satir) {
    if(!satir||!satir[0]) return;
    var ilkKolon = String(satir[0]).trim();
    var firmaEslesmesi = ilkKolon.match(firmaSatir);
    if(firmaEslesmesi) {
      aktifFirma = firmaEslesmesi[1].trim();
      firmalar[aktifFirma] = firmalar[aktifFirma]||[];
      return;
    }
    if(ilkKolon==='TAR\u0130H'||ilkKolon==='Tarih') return;
    if(!aktifFirma) return;
    var tarih = satir[0];
    var borc = parseFloat(satir[4])||0;
    var alacak = parseFloat(satir[5])||0;
    if(!tarih||(borc===0&&alacak===0)) return;
    var aciklama = String(satir[3]||'');
    firmalar[aktifFirma].push({
      tarih: tarih,
      tip: satir[1]||'',
      fisNo: satir[2]||'',
      aciklama: aciklama,
      borc: borc,
      alacak: alacak,
      bakiye: parseFloat(satir[6])||0,
      firma: aktifFirma
    });
  });
  return firmalar;
};

window._mvMuhasebeciFirmaListele = function(satirlar) {
  var firmalar = window._mvMuhasebeciFirmaAyristir(satirlar);
  return Object.keys(firmalar).map(function(ad){
    var kayitlar = firmalar[ad];
    var normalArr = window._mvNormalize?.muhasebecdenNormalize(kayitlar, ad)||[];
    return {
      ad: ad,
      kayitSayisi: kayitlar.length,
      normalArr: normalArr,
      toplamBorc: kayitlar.reduce(function(s,r){return s+r.borc;},0),
      toplamAlacak: kayitlar.reduce(function(s,r){return s+r.alacak;},0)
    };
  });
};

/* \u2500\u2500 MUAVIN-FIRMA-ESLESTIR-001: Otomatik + Manuel E\u015fle\u015ftirme \u2500\u2500 */
window._mvFirmaEslestirmeler = JSON.parse(localStorage.getItem('ak_mv_eslestirme') || '{}');

window._mvFirmaEslestirmeYap = function() {
  var meta = window._mvMeta || {};
  var donem = typeof window._mvAktifDonem === 'function' ? window._mvAktifDonem() : '';
  var d = meta[donem] || {};
  var muhFirmalar = (d.muhasebeci || {}).normalArr ? [... new Set((d.muhasebeci.normalArr || []).map(function(r) { return r.firma || ''; }).filter(Boolean))] : [];
  var sirFirmalar = (d.baran || {}).normalArr ? [... new Set((d.baran.normalArr || []).map(function(r) { return r.firma || ''; }).filter(Boolean))] : [];
  var eslestirmeler = window._mvFirmaEslestirmeler = window._mvFirmaEslestirmeler || {};
  var cozulemeyenler = [];
  muhFirmalar.forEach(function(muh) {
    if (eslestirmeler[muh]) return;
    var enIyi = null, enSkor = 0;
    sirFirmalar.forEach(function(sir) {
      var skor = typeof _mvFuzzyEsles === 'function' ? _mvFuzzyEsles(muh, sir) : 0;
      if (skor > enSkor) { enSkor = skor; enIyi = sir; }
    });
    if (enSkor >= 80) { eslestirmeler[muh] = enIyi; }
    else { cozulemeyenler.push({ muh: muh, oneri: enIyi, skor: enSkor }); }
  });
  localStorage.setItem('ak_mv_eslestirme', JSON.stringify(eslestirmeler));
  return { eslestirmeler: eslestirmeler, cozulemeyenler: cozulemeyenler };
};

window._mvFirmaEslestirmeMenuAc = function() {
  var mevcut = document.getElementById('mv-eslestirme-modal');
  if (mevcut) { mevcut.remove(); return; }
  var sonuc = window._mvFirmaEslestirmeYap();
  var coz = sonuc.cozulemeyenler;
  var esl = sonuc.eslestirmeler;
  var meta = window._mvMeta || {};
  var donem = typeof window._mvAktifDonem === 'function' ? window._mvAktifDonem() : '';
  var d = meta[donem] || {};
  var sirFirmalar = (d.baran || {}).normalArr ? [... new Set((d.baran.normalArr || []).map(function(r) { return r.firma || ''; }).filter(Boolean))] : [];
  var esc = typeof window._esc === 'function' ? window._esc : function(s) { return String(s || ''); };
  var mo = document.createElement('div');
  mo.id = 'mv-eslestirme-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var h = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:680px;max-height:85vh;display:flex;flex-direction:column">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--b)">';
  h += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Firma E\u015fle\u015ftirme</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Muhasebeci firma adlar\u0131 ile \u015firket firma adlar\u0131n\u0131 e\u015fle\u015ftirin</div></div>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'mv-eslestirme-modal\')?.remove()" style="border:none;background:none;font-size:20px;cursor:pointer;color:var(--t3)">\u00d7</button></div>';
  h += '<div style="overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px">';
  if (Object.keys(esl).length) {
    h += '<div style="font-size:10px;font-weight:500;color:#0F6E56;margin-bottom:4px">Otomatik E\u015fle\u015ftirilenler (' + Object.keys(esl).length + ')</div>';
    Object.keys(esl).forEach(function(k) {
      h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#E1F5EE;border-radius:5px;font-size:10px">';
      h += '<span style="flex:1;color:#085041">' + esc(k) + '</span><span style="color:var(--t3)">\u2192</span><span style="flex:1;color:#085041">' + esc(esl[k]) + '</span>';
      h += '<button onclick="event.stopPropagation();delete window._mvFirmaEslestirmeler[\'' + k.replace(/'/g, "\\'") + '\'];localStorage.setItem(\'ak_mv_eslestirme\',JSON.stringify(window._mvFirmaEslestirmeler));document.getElementById(\'mv-eslestirme-modal\')?.remove();window._mvFirmaEslestirmeMenuAc()" style="font-size:9px;border:none;background:none;cursor:pointer;color:#A32D2D">\u2715</button></div>';
    });
  }
  if (coz.length) {
    h += '<div style="font-size:10px;font-weight:500;color:#A32D2D;margin-top:8px;margin-bottom:4px">E\u015fle\u015ftirilemeyen (' + coz.length + ')</div>';
    coz.forEach(function(item, idx) {
      h += '<div style="border:0.5px solid var(--b);border-radius:5px;padding:8px 10px">';
      h += '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:6px">' + esc(item.muh) + '</div>';
      h += '<div style="display:flex;gap:6px;align-items:center">';
      h += '<select id="mv-esl-' + idx + '" onclick="event.stopPropagation()" style="flex:1;font-size:10px;padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">E\u015fle\u015ftirme se\u00e7...</option>';
      sirFirmalar.forEach(function(sf) { h += '<option value="' + esc(sf) + '"' + (sf === item.oneri ? ' selected' : '') + '>' + esc(sf) + (sf === item.oneri ? ' (%' + item.skor + ')' : '') + '</option>'; });
      h += '</select>';
      h += '<button onclick="event.stopPropagation();var sel=document.getElementById(\'mv-esl-' + idx + '\');if(!sel||!sel.value){window.toast?.(\'\u015eART SE\u00c7\u0130N\',\'warn\');return;}window._mvFirmaEslestirmeler[\'' + item.muh.replace(/'/g, "\\'") + '\']=sel.value;localStorage.setItem(\'ak_mv_eslestirme\',JSON.stringify(window._mvFirmaEslestirmeler));sel.closest(\'div[style*=border]\').style.background=\'#E1F5EE\';window.toast?.(\'\u2713 E\u015fle\u015ftirildi\',\'ok\')" style="font-size:10px;padding:5px 12px;border:none;border-radius:4px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit">E\u015fle\u015ftir</button>';
      h += '</div></div>';
    });
  }
  if (!coz.length && !Object.keys(esl).length) {
    h += '<div style="text-align:center;padding:40px;color:var(--t3);font-size:11px">\u00d6nce her iki dosyay\u0131 da y\u00fckleyin</div>';
  }
  h += '</div>';
  h += '<div style="padding:10px 16px;border-top:0.5px solid var(--b);display:flex;justify-content:space-between">';
  h += '<span style="font-size:9px;color:var(--t3);line-height:32px">E\u015fle\u015ftirmeler otomatik kaydedilir</span>';
  h += '<button onclick="event.stopPropagation();window.renderMuavin?.();document.getElementById(\'mv-eslestirme-modal\')?.remove()" style="font-size:11px;padding:7px 20px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Uygula ve Kapat</button>';
  h += '</div></div>';
  mo.innerHTML = h;
  document.body.appendChild(mo);
};

/* MUAVIN-KUR-CEK-001: Tüm işlemler için kur doldur (TRY/TRL skip, diğerleri TCMB/fallback) */
window._mvKurDoldur = async function(islemler) {
  if (!Array.isArray(islemler) || !window._mvNormalize || typeof window._mvNormalize.kurCek !== 'function') return;
  for (var i = 0; i < islemler.length; i++) {
    var ism = islemler[i];
    var doviz = ism.dovizCinsi || 'TRY';
    if (doviz === 'TRY' || doviz === 'TRL') continue;
    var kur = await window._mvNormalize.kurCek(ism.tarih, doviz);
    if (kur) { ism.kurAlis = kur.alis; ism.kurSatis = kur.satis; }
  }
  if (typeof window.renderMuavin === 'function') window.renderMuavin();
};

console.log('[MUAVIN-PARSE] y\u00fcklendi');

