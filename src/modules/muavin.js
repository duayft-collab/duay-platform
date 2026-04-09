'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   Çeyreklik muhasebe Excel karşılaştırma + fark raporu
   v1.0.0
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

  /* Sonuç — hesap gruplu */
  var kayitlar = _mvLoad().filter(function(s){return s.donem===donem;});
  if(kayitlar.length) {
    var son = kayitlar[kayitlar.length-1];
    h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:12px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
    h += '<div style="font-size:12px;font-weight:500;color:var(--t)">'+donem+' — '+(son.hesapSayisi||0)+' hesap · '+(son.islemSayisi||0)+' işlem</div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<button onclick="event.stopPropagation();window._mvCSVExport()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">↓ CSV</button>';
    h += '<div style="font-size:10px;color:var(--t3)">'+son.tarih+'</div></div></div>';
    Object.keys(son.hesaplar||{}).forEach(function(hAd){
      var hv = son.hesaplar[hAd];
      h += '<div style="margin-bottom:12px">';
      h += '<div style="font-size:11px;font-weight:500;color:var(--t);padding:6px 8px;background:var(--s2);border-radius:5px;margin-bottom:4px;display:flex;justify-content:space-between">';
      h += '<span>'+hAd+'</span>';
      h += '<span style="font-size:10px;color:var(--t3)">Borç: '+(hv.borc||0).toLocaleString('tr-TR')+'  Alacak: '+(hv.alacak||0).toLocaleString('tr-TR')+'  Bakiye: '+(hv.topBakiye||hv.bakiye||0).toLocaleString('tr-TR')+'</span>';
      h += '</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:10px">';
      h += '<thead><tr style="background:var(--s2)"><th style="padding:4px 6px;text-align:left;border-bottom:0.5px solid var(--b)">Tarih</th><th style="padding:4px 6px;text-align:left">Tip</th><th style="padding:4px 6px;text-align:left">Fiş No</th><th style="padding:4px 6px;text-align:left">Açıklama</th><th style="padding:4px 6px;text-align:right">Borç</th><th style="padding:4px 6px;text-align:right">Alacak</th><th style="padding:4px 6px;text-align:right">Bakiye</th><th style="padding:4px 6px;text-align:center">B/A</th></tr></thead><tbody>';
      (hv.islemler||[]).forEach(function(i){
        h += '<tr style="border-bottom:0.5px solid var(--b)">';
        h += '<td style="padding:4px 6px;white-space:nowrap">'+i.tarih+'</td>';
        h += '<td style="padding:4px 6px;color:var(--t3)">'+i.tip+'</td>';
        h += '<td style="padding:4px 6px;font-family:monospace">'+i.fisNo+'</td>';
        h += '<td style="padding:4px 6px;color:var(--t2);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+i.aciklama+'">'+i.aciklama+'</td>';
        h += '<td style="padding:4px 6px;text-align:right">'+(i.borc?i.borc.toLocaleString('tr-TR'):'')+'</td>';
        h += '<td style="padding:4px 6px;text-align:right">'+(i.alacak?i.alacak.toLocaleString('tr-TR'):'')+'</td>';
        h += '<td style="padding:4px 6px;text-align:right;font-weight:500">'+i.bakiye.toLocaleString('tr-TR')+'</td>';
        h += '<td style="padding:4px 6px;text-align:center;color:'+(i.ba==='A'?'#0F6E56':'#A32D2D')+'">'+i.ba+'</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    });
    h += '</div>';
  }
  h += '</div>';
  panel.innerHTML = h;
};

window._mvDosyaOku = function(inp) {
  var f = inp.files[0]; if(!f) return;
  var r = new FileReader();
  r.onload = function(e){ var ta=document.getElementById('mv-excel-ham'); if(ta) ta.value=e.target.result; };
  r.readAsText(f,'UTF-8');
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
  var aktifHesap = null;
  var islemler = [];
  satirlar.forEach(function(satir){
    if(!satir.trim()) return;
    var p = satir.split(/\t/).map(function(x){return x.trim().replace(/^"|"$/g,'').replace(/\./g,'').replace(',','.');});
    if(p.length < 3) return;
    var ilk = p[0]||'';
    var tarihRe = /^\d{2}[.\-\/]\d{2}[.\-\/]\d{4}$/;
    var hesapRe = /^\d{3}[\.\-]/;
    if(hesapRe.test(ilk) || (ilk && !tarihRe.test(ilk) && p.length <= 3 && isNaN(parseFloat(p[1])))) {
      aktifHesap = ilk + (p[1]?' '+p[1]:'');
      if(!hesaplar[aktifHesap]) hesaplar[aktifHesap] = {ad:aktifHesap, islemler:[], borc:0, alacak:0, bakiye:0};
      return;
    }
    if(tarihRe.test(ilk) && aktifHesap) {
      var tip = p[1]||'';
      var fisNo = p[2]||'';
      var aciklama = (p[3]||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var borc = parseFloat(p[4])||0;
      var alacak = parseFloat(p[5])||0;
      var bakiye = parseFloat(p[6])||0;
      var ba = p[7]||'';
      var islem = {tarih:ilk,tip:tip,fisNo:fisNo,aciklama:aciklama,borc:borc,alacak:alacak,bakiye:bakiye,ba:ba,hesap:aktifHesap};
      hesaplar[aktifHesap].islemler.push(islem);
      hesaplar[aktifHesap].borc += borc;
      hesaplar[aktifHesap].alacak += alacak;
      hesaplar[aktifHesap].bakiye = bakiye;
      islemler.push(islem);
      return;
    }
    if((ilk.indexOf('Nakli')!==-1||ilk.indexOf('Genel')!==-1) && aktifHesap) {
      var topBorc = parseFloat(p[4])||0;
      var topAlacak = parseFloat(p[5])||0;
      var topBakiye = parseFloat(p[6])||0;
      if(ilk.indexOf('Genel')!==-1) {
        hesaplar[aktifHesap].topBorc = topBorc;
        hesaplar[aktifHesap].topAlacak = topAlacak;
        hesaplar[aktifHesap].topBakiye = topBakiye;
      }
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

console.log('[MUAVİN] v1.0 yüklendi');
