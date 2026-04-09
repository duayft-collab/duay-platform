'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   Çeyreklik muhasebe Excel karşılaştırma + fark raporu
   v1.3.0
════════════════════════════════════════════════════════════════ */
/*
ℹ️ MUAVİN DEFTER KONTROL — NE YAPAR, NASIL KULLANILIR?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 NE İŞE YARAR?
   Her çeyrek sonunda muhasebeciden gelen Excel dosyasını,
   sistemin kendi kayıtlarıyla karşılaştırır. Farkları bulur,
   rapor çıkarır. Kısaca: "Muhasebeci ne diyor, sistem ne diyor,
   nerede uyuşmuyor?" sorusunu yanıtlar.
   Açılış: Üst Menü → Muhasebe → Muavin Defter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 DÖNEM SEÇİMİ
   Sağ üstte 4 buton: 2026 Q1 · Q2 · Q3 · Q4
   Q1 = Ocak-Mart | Q2 = Nisan-Haziran
   Q3 = Temmuz-Eylül | Q4 = Ekim-Aralık
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 KULLANIM ADIMLARI (3 adım)
   1️⃣  Muhasebeciden Excel al (ham muavin döküm dosyası)
   2️⃣  Sol panele yapıştır VEYA "Dosya Seç" ile yükle
       Format: Hesap Kodu | Açıklama | Borç | Alacak
       Desteklenen: .xlsx / .csv / .txt / Tab / Virgül / Noktalı virgül
   3️⃣  "Karşılaştır →" butonuna bas → rapor otomatik çıkar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SONUÇ RAPORU — 3 RENK
   🟢 Eşleşiyor  → Excel ile sistem aynı, sorun yok
   🔴 Fark var   → Tutar uyuşmuyor, araştır
   🟡 Eksik      → Sistemde bu hesap koduna kayıt yok
   Her satırda: Hesap Kodu · Açıklama · Excel Tutarı ·
                Sistem Tutarı · Fark · Durum
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗂️  HESAP KODU → KATEGORİ EŞLEŞTİRME
   770.01 → Kira        | 770.02 → Fatura
   770.03 → Abonelik    | 360.01 → Vergi
   370.01 → Sigorta     | 335.01 → Maaş
   780.01 → Kredi Kartı | 300.01 → Kredi
   770.99 → Diğer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ÖNEMLİ NOTLAR
   • Sistem tutarı: Nakit Akışı modülündeki ödemelerden hesaplanır
   • Dövizli ödemelerde amountTRY (kayıt anındaki kur) kullanılır
   • Sonuçlar saklanır (son 20 karşılaştırma — ak_muavin_v1)
   • Fark çıkarsa: ya sistemde eksik kayıt var, ya hesap kodu farklı
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 SÜRÜM GEÇMİŞİ
   v1.0.0 (2026-04-09) — İlk sürüm: Excel yükleme, karşılaştırma,
                          fark raporu, 3 KPI (eşleşen/fark/eksik)
   v1.1.0 (2026-04-09) — MUAVIN-002: Gerçek sistem tutarı hesaplama,
                          9 kategori→hesapKodu mapping, dönem filtresi
   v1.2.0 (2026-04-09) — MUAVIN-003: Gerçek muavin formatı parse,
                          hesap bazlı gruplama, Tarih/Tip/Fiş No/Açıklama/
                          Borç/Alacak/Bakiye/B/A kolonları, CSV export
   v1.3.0 (2026-04-09) — MUAVIN-004: SheetJS ile .xlsx desteği,
                          CARİ ADI kolonu (hesap başlığı satıra taşındı),
                          Nakli Yekün/Genel Toplam filtrelendi,
                          tüm işlemler tek tabloda, döviz kolonları eklendi
*/

var MUAVİN_KEY = 'ak_muavin_v1';

function _mvLoad() { try { var r=localStorage.getItem(MUAVİN_KEY); return r?JSON.parse(r):[]; } catch(e){ return []; } }
function _mvStore(d) { try { localStorage.setItem(MUAVİN_KEY,JSON.stringify(d)); } catch(e){} }

window.renderMuavin = function() {
  var panel = document.getElementById('panel-muavin');
  if (!panel) return;
  var donem = window._mvDonem || new Date().getFullYear()+'Q'+Math.ceil((new Date().getMonth()+1)/3);
  var h = '<div style="padding:16px;max-width:1100px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  h += '<div><div style="font-size:18px;font-weight:500;color:var(--t)">Muavin Defter Kontrol</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-top:2px">Çeyreklik muhasebe mutabakatı — Excel karşılaştırma + fark raporu</div></div>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  ['Q1','Q2','Q3','Q4'].forEach(function(q){
    var yil = new Date().getFullYear();
    var id = yil+q;
    var aktif = window._mvDonem === id;
    h += '<button onclick="event.stopPropagation();window._mvDonem=\''+id+'\';window.renderMuavin()" style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:'+(aktif?'var(--t)':'transparent')+';color:'+(aktif?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">'+yil+' '+q+'</button>';
  });
  h += '</div></div>';

  /* Yükle alanı */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

  /* Muhasebe Excel */
  h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:8px">Muhasebeci Excel (Ham Veri)</div>';
  h += '<div style="font-size:10px;color:var(--t3);margin-bottom:10px">Muhasebeciden gelen Excel dosyasını buraya yapıştır veya yükle</div>';
  h += '<textarea id="mv-excel-ham" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Excel\'den kopyala yapıştır (Tab/Virgül ayrımlı)&#10;Format: Hesap Kodu | Açıklama | Borç | Alacak" style="width:100%;height:120px;font-size:11px;font-family:monospace;padding:8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>';
  h += '<div style="display:flex;gap:6px;margin-top:8px">';
  h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2)">Dosya Seç<input type="file" accept=".xlsx,.csv,.txt" onchange="window._mvDosyaOku(this)" style="display:none"></label>';
  h += '<button onclick="event.stopPropagation();window._mvKarsilastir()" style="font-size:10px;padding:5px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
  h += '</div></div>';

  /* Sistem Verisi */
  h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:8px">Sistem Verileri ('+donem+')</div>';
  var odmler = typeof window.loadOdm === 'function' ? window.loadOdm() : [];
  var tahsilatlar = typeof window.loadTahsilat === 'function' ? window.loadTahsilat() : [];
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">';
  h += '<div style="background:var(--s2);border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">ÖDEME</div><div style="font-size:18px;font-weight:500;color:var(--t)">'+odmler.length+'</div></div>';
  h += '<div style="background:var(--s2);border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">TAHSİLAT</div><div style="font-size:18px;font-weight:500;color:var(--t)">'+tahsilatlar.length+'</div></div>';
  h += '<div style="background:var(--s2);border-radius:6px;padding:10px;text-align:center"><div style="font-size:9px;color:var(--t3)">TOPLAM</div><div style="font-size:18px;font-weight:500;color:var(--t)">'+(odmler.length+tahsilatlar.length)+'</div></div>';
  h += '</div>';
  h += '<div style="font-size:10px;color:var(--t3)">Nakit Akışı ve Tahsilat modülündeki kayıtlar otomatik yüklenir</div>';
  h += '</div></div>';

  /* İkinci Excel Karşılaştırma */
  h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:16px">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:8px">İkinci Excel Karşılaştırma (Bütçe / Önceki Dönem)</div>';
  h += '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Birinci Excel yüklendikten sonra karşılaştırmak istediğiniz ikinci Excel\'i yükleyin</div>';
  h += '<textarea id="mv-excel-ham2" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="İkinci Excel — yapıştır veya dosya seç" style="width:100%;height:80px;font-size:11px;font-family:monospace;padding:8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>';
  h += '<div style="display:flex;gap:6px;margin-top:8px">';
  h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2)">Dosya Seç<input type="file" accept=".xlsx,.csv,.txt" onchange="window._mvDosyaOku2(this)" style="display:none"></label>';
  h += '<button onclick="event.stopPropagation();window._mvKarsilastir2()" style="font-size:10px;padding:5px 14px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
  h += '</div></div>';
  h += '<div id="mv-fark-panel"></div>';

  /* Sonuç — hesap gruplu */
  var kayitlar = _mvLoad().filter(function(s){return s.donem===donem;});
  if(kayitlar.length) {
    var son = kayitlar[kayitlar.length-1];
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:12px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
    h += '<div style="font-size:12px;font-weight:500;color:var(--t)">'+donem+' — '+(son.hesapSayisi||0)+' hesap · '+(son.islemSayisi||0)+' işlem</div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<button onclick="event.stopPropagation();window._mvCSVExport()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">↓ CSV</button>';
    h += '<button onclick="event.stopPropagation();window._mvXLSMExport()" style="font-size:10px;padding:4px 10px;border:0.5px solid #0F6E56;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#0F6E56">↓ Excel</button>';
    h += '<div style="font-size:10px;color:var(--t3)">'+son.tarih+'</div></div></div>';
    var tumIslemler = son.islemler || [];
    var topBorc = tumIslemler.reduce(function(s,i){return s+(i.borc||0);},0);
    var topAlacak = tumIslemler.reduce(function(s,i){return s+(i.alacak||0);},0);
    var topBakiye = tumIslemler.length ? tumIslemler[tumIslemler.length-1].bakiye : 0;
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
    h += '<div style="background:var(--s2);border-radius:6px;padding:8px 12px;text-align:center"><div style="font-size:9px;color:var(--t3)">İŞLEM ADETİ</div><div style="font-size:20px;font-weight:500;color:var(--t)">'+tumIslemler.length+'</div></div>';
    h += '<div style="background:#FCEBEB;border-radius:6px;padding:8px 12px;text-align:center"><div style="font-size:9px;color:#A32D2D">TOPLAM BORÇ</div><div style="font-size:16px;font-weight:500;color:#A32D2D">'+topBorc.toLocaleString('tr-TR')+'</div></div>';
    h += '<div style="background:#E1F5EE;border-radius:6px;padding:8px 12px;text-align:center"><div style="font-size:9px;color:#0F6E56">TOPLAM ALACAK</div><div style="font-size:16px;font-weight:500;color:#0F6E56">'+topAlacak.toLocaleString('tr-TR')+'</div></div>';
    h += '<div style="background:var(--s2);border-radius:6px;padding:8px 12px;text-align:center"><div style="font-size:9px;color:var(--t3)">NET BAKİYE</div><div style="font-size:16px;font-weight:500;color:var(--t)">'+(topBakiye||0).toLocaleString('tr-TR')+'</div></div>';
    h += '</div>';
    h += '<div style="margin-bottom:8px;display:flex;gap:8px;align-items:center">';
    h += '<input id="mv-ara" placeholder="Cari adı, fiş no veya açıklama ara..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._mvAra(this.value)" style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
    h += '</div>';
    h += '<div style="overflow-x:auto">';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10px;min-width:1200px">';
    h += '<thead><tr style="background:var(--s2);position:sticky;top:0">';
    ['TARİH','TİP','FİŞ NO','AÇIKLAMA','BORÇ','ALACAK','BAKİYE','B/A','BORÇ(DÖV)','ALACAK(DÖV)','BAKİYE(DÖV)','B/A','CARİ ADI'].forEach(function(k){
      h += '<th style="padding:5px 6px;text-align:'+(k==='AÇIKLAMA'||k==='CARİ ADI'?'left':'right')+';border-bottom:0.5px solid var(--b);white-space:nowrap;font-size:9px">'+k+'</th>';
    });
    h += '</tr></thead><tbody id="mv-islem-tbody">';
    tumIslemler.forEach(function(i){
      h += '<tr style="border-bottom:0.5px solid var(--b)">';
      h += '<td style="padding:4px 6px;white-space:nowrap;text-align:right">'+i.tarih+'</td>';
      h += '<td style="padding:4px 6px;color:var(--t3);text-align:right">'+i.tip+'</td>';
      h += '<td style="padding:4px 6px;font-family:monospace;text-align:right">'+i.fisNo+'</td>';
      h += '<td style="padding:4px 6px;color:var(--t2);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(i.aciklama||'')+'">'+i.aciklama+'</td>';
      h += '<td style="padding:4px 6px;text-align:right">'+(i.borc?i.borc.toLocaleString('tr-TR'):'')+'</td>';
      h += '<td style="padding:4px 6px;text-align:right">'+(i.alacak?i.alacak.toLocaleString('tr-TR'):'')+'</td>';
      h += '<td style="padding:4px 6px;text-align:right;font-weight:500">'+(i.bakiye||0).toLocaleString('tr-TR')+'</td>';
      h += '<td style="padding:4px 6px;text-align:center;color:'+(i.ba==='A'?'#0F6E56':'#A32D2D')+'">'+i.ba+'</td>';
      h += '<td style="padding:4px 6px;text-align:right">'+(i.borcDov?i.borcDov.toLocaleString('tr-TR'):'')+'</td>';
      h += '<td style="padding:4px 6px;text-align:right">'+(i.alacakDov?i.alacakDov.toLocaleString('tr-TR'):'')+'</td>';
      h += '<td style="padding:4px 6px;text-align:right">'+(i.bakiyeDov?i.bakiyeDov.toLocaleString('tr-TR'):'')+'</td>';
      h += '<td style="padding:4px 6px;text-align:center;color:'+(i.baDov==='A'?'#0F6E56':'#A32D2D')+'">'+(i.baDov||'')+'</td>';
      h += '<td style="padding:4px 6px;color:var(--t2);white-space:nowrap">'+(i.cari||'')+'</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    h += '</div>';
  }
  h += '</div>';
  panel.innerHTML = h;
};

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
  var satirlar = document.querySelectorAll('#mv-islem-tbody tr');
  var f = deger.toLowerCase().trim();
  satirlar.forEach(function(tr){
    tr.style.display = (!f || tr.textContent.toLowerCase().includes(f)) ? '' : 'none';
  });
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
        if (ta) { ta.value = tsv; window.toast?.('.xlsx yüklendi — ' + f.name, 'ok'); }
      } catch(err) { window.toast?.('xlsx okunamadı: ' + err.message, 'err'); }
    };
    r.readAsArrayBuffer(f);
  } else {
    var r2 = new FileReader();
    r2.onload = function(e) {
      var ta = document.getElementById('mv-excel-ham2');
      if (ta) { ta.value = e.target.result; window.toast?.(f.name + ' yüklendi', 'ok'); }
    };
    r2.readAsText(f, 'UTF-8');
  }
};

window._mvKarsilastir2 = function() {
  var text = document.getElementById('mv-excel-ham2')?.value || '';
  if (!text.trim()) { window.toast?.('İkinci Excel verisi giriniz', 'warn'); return; }
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

console.log('[MUAVİN] v1.3 yüklendi');
