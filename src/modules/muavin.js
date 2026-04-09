'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   Çeyreklik muhasebe Excel karşılaştırma + fark raporu
   v2.6.0
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
   v1.4.0 (2026-04-09) — MUAVIN-005: xlsx/CSV export + arama filtresi
   v1.5.0 (2026-04-09) — MUAVIN-006: İkinci Excel karşılaştırma
   v1.6.0 (2026-04-09) — MUAVIN-SPLIT: 3 dosya mimarisi (parse/export/main)
   v1.7.0 (2026-04-09) — MUAVIN-009: Hesap kodu otomatik kategori + ağaç
   v1.8.0 (2026-04-09) — MUAVIN-010: Cari bazlı özet + muhasebeci notları
   v1.9.0 (2026-04-09) — MUAVIN-011: Sistem vs Excel fark + PDF raporu
   v2.0.0 (2026-04-09) — MUAVIN-UI-001: Tab bazlı 6 sekme A tasarım
   v2.1.0 (2026-04-09) — MUAVIN-012: Dönem karşılaştırma Q bazlı
   v2.2.0 (2026-04-09) — MUAVIN-013: Fiş detay popup + tarih aralığı filtresi
   v2.3.0 (2026-04-09) — MUAVIN-014: Excel şablon indir (muhasebeci formatı)
   v2.4.0 (2026-04-09) — MUAVIN-015: Mutabakat onay akışı + onay belgesi PDF
   v2.5.0 (2026-04-09) — MUAVIN-016: Mükerrer fiş + KDV + şüpheli tespit
   v2.6.0 (2026-04-09) — MUAVIN-017: Fark işaretleme + muhasebeci iletim PDF
*/

var MUAVİN_KEY = 'ak_muavin_v1';

function _mvLoad() { try { var r=localStorage.getItem(MUAVİN_KEY); return r?JSON.parse(r):[]; } catch(e){ return []; } }
function _mvStore(d) { try { localStorage.setItem(MUAVİN_KEY,JSON.stringify(d)); } catch(e){} }

window.renderMuavin = function() {
  var panel = document.getElementById('panel-muavin');
  if (!panel) return;
  var donem = window._mvDonem || new Date().getFullYear()+'Q'+Math.ceil((new Date().getMonth()+1)/3);
  var aktifTab = window._mvAktifTab || 'islemler';
  var kayitlar = (typeof _mvLoad==='function'?_mvLoad():[]).filter(function(s){return s.donem===donem;});
  var son = kayitlar.length ? kayitlar[kayitlar.length-1] : null;
  var tumIslemler = son ? (son.islemler||[]) : [];
  if(tumIslemler.length) { window._mvSonIslemler = tumIslemler; window._mvSonHesaplar = son.hesaplar||{}; }
  var uyarilar = window._mvUyarilar||{mukerrer:[],tutarsiz:[],supheli:[],kdv:[]};
  var topUyari = (uyarilar.mukerrer||[]).length+(uyarilar.tutarsiz||[]).length+(uyarilar.supheli||[]).length+(uyarilar.kdv||[]).length;
  var h = '<div style="padding:16px 20px;max-width:1200px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  h += '<div><div style="font-size:16px;font-weight:500;color:var(--t)">Muavin Defter Kontrol</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-top:1px">Çeyreklik muhasebe mutabakatı</div></div>';
  h += '<div style="display:flex;gap:6px">';
  ['Q1','Q2','Q3','Q4'].forEach(function(q){
    var id = new Date().getFullYear()+q;
    var ak = window._mvDonem===id;
    h += '<button onclick="event.stopPropagation();window._mvDonem=\''+id+'\';window.renderMuavin()" style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:'+(ak?'var(--t)':'transparent')+';color:'+(ak?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">'+new Date().getFullYear()+' '+q+'</button>';
  });
  h += '</div></div>';
  if(topUyari>0){
    h += '<div style="background:#FAEEDA;border:0.5px solid #854F0B;border-radius:6px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">';
    h += '<span style="font-size:12px;color:#854F0B;font-weight:500">⚠ '+topUyari+' uyarı</span>';
    if(uyarilar.mukerrer.length) h += '<span style="font-size:10px;color:#633806">🔁 Mükerrer: '+uyarilar.mukerrer.length+'</span>';
    if(uyarilar.tutarsiz.length) h += '<span style="font-size:10px;color:#633806">⚡ Tutarsız: '+uyarilar.tutarsiz.length+'</span>';
    if(uyarilar.supheli.length) h += '<span style="font-size:10px;color:#633806">🔍 Şüpheli: '+uyarilar.supheli.length+'</span>';
    if(uyarilar.kdv&&uyarilar.kdv.length) h += '<span style="font-size:10px;color:#633806">🧾 Şüpheli KDV oranı: '+uyarilar.kdv.length+'</span>';
    h += '</div>';
  }
  if(tumIslemler.length){
    var topBorc=tumIslemler.reduce(function(s,i){return s+(i.borc||0);},0);
    var topAlacak=tumIslemler.reduce(function(s,i){return s+(i.alacak||0);},0);
    var net=topBorc-topAlacak;
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">';
    h += '<div style="border:0.5px solid var(--b);border-radius:6px;padding:10px 14px"><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em">İŞLEM ADETİ</div><div style="font-size:22px;font-weight:500;color:var(--t);margin-top:2px">'+tumIslemler.length+'</div></div>';
    h += '<div style="border:0.5px solid var(--b);border-radius:6px;padding:10px 14px"><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em">TOPLAM BORÇ</div><div style="font-size:18px;font-weight:500;color:#A32D2D;margin-top:2px">'+topBorc.toLocaleString('tr-TR')+'</div></div>';
    h += '<div style="border:0.5px solid var(--b);border-radius:6px;padding:10px 14px"><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em">TOPLAM ALACAK</div><div style="font-size:18px;font-weight:500;color:#0F6E56;margin-top:2px">'+topAlacak.toLocaleString('tr-TR')+'</div></div>';
    h += '<div style="border:0.5px solid var(--b);border-radius:6px;padding:10px 14px"><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em">NET</div><div style="font-size:18px;font-weight:500;color:'+(net>0?'#A32D2D':net<0?'#0F6E56':'var(--t)')+';margin-top:2px">'+net.toLocaleString('tr-TR')+'</div></div>';
    h += '</div>';
  }
  var tablar = [{id:'yukle',lbl:'Veri Yükle'},{id:'islemler',lbl:'İşlem Listesi'+(tumIslemler.length?' ('+tumIslemler.length+')':'')},{id:'agac',lbl:'Hesap Ağacı'},{id:'cari',lbl:'Cari Özet'},{id:'karsilastirma',lbl:'Karşılaştırma'},{id:'donem',lbl:'Dönem Karşılaştırma'},{id:'notlar',lbl:'Notlar'}];
  h += '<div style="display:flex;border-bottom:0.5px solid var(--b);margin-bottom:16px;gap:0">';
  tablar.forEach(function(t){
    var ak = aktifTab===t.id;
    h += '<div onclick="event.stopPropagation();window._mvAktifTab=\''+t.id+'\';window.renderMuavin()" style="padding:8px 16px;font-size:11px;cursor:pointer;border-bottom:'+(ak?'2px solid var(--t)':'2px solid transparent')+';font-weight:'+(ak?'500':'400')+';color:'+(ak?'var(--t)':'var(--t3)')+';white-space:nowrap">'+t.lbl+'</div>';
  });
  h += '</div>';
  if(aktifTab==='yukle'){
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px">';
    h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:6px">Muhasebeci Excel</div>';
    h += window._mvDosyaAd
      ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#E1F5EE;border-radius:5px;margin-bottom:8px"><div><div style="font-size:10px;font-weight:500;color:#085041">✓ '+window._mvDosyaAd+'</div><div style="font-size:9px;color:#0F6E56">'+window._mvDosyaSatir+' işlem · '+window._mvDosyaTarih+'</div></div><button onclick="event.stopPropagation();window._mvHam=\'\';window._mvDosyaAd=\'\';window._mvSonIslemler=[];window._mvDosyaSatir=0;window.renderMuavin()" style="font-size:10px;padding:3px 8px;border:0.5px solid #0F6E56;border-radius:4px;background:transparent;cursor:pointer;color:#0F6E56">Sil</button></div>'
      : '<div style="padding:6px 10px;background:var(--s2);border-radius:5px;font-size:10px;color:var(--t3);margin-bottom:8px">Henüz yüklenmedi</div>';
    h += '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Excel\'den kopyala yapıştır veya dosya yükle (Tab ayrımlı)</div>';
    h += '<textarea id="mv-excel-ham" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Hesap Kodu | Açıklama | Borç | Alacak..." style="width:100%;height:160px;font-size:11px;font-family:monospace;padding:8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>';
    h += '<div style="display:flex;gap:6px;margin-top:8px">';
    h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2)">📂 Dosya Seç<input type="file" accept=".xlsx,.csv,.txt" onchange="window._mvDosyaOku(this)" style="display:none"></label>';
    h += '<button onclick="event.stopPropagation();window._mvSablonIndir()" style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">⬇ Şablon İndir</button>';
    h += '<button onclick="event.stopPropagation();window._mvKarsilastir();window._mvAktifTab=\'islemler\';window.renderMuavin()" style="font-size:10px;padding:5px 16px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Yükle ve Analiz Et →</button>';
    h += '</div></div>';
    h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px">';
    h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:6px">Bizim Excel (Şirket Kaydı)</div>';
    h += '<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Şirketin kendi muavin kaydı — karşılaştırma için yükle</div>';
    h += window._mvDosya2Ad
      ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#E1F5EE;border-radius:5px;margin-bottom:8px">'
        + '<div><div style="font-size:10px;font-weight:500;color:#085041">✓ ' + window._mvDosya2Ad + '</div>'
        + '<div style="font-size:9px;color:#0F6E56">' + (window._mvDosya2Satir || 0) + ' işlem · ' + (window._mvDosya2Tarih || '') + '</div></div>'
        + '<button onclick="event.stopPropagation();window._mvHam2=\'\';window._mvDosya2Ad=\'\';window._mvSonIslemler2=[];window._mvDosya2Satir=0;window.renderMuavin()" style="font-size:10px;padding:3px 8px;border:0.5px solid #A32D2D;border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D">Sil</button>'
        + '</div>'
      : '<div style="padding:6px 10px;background:var(--s2);border-radius:5px;font-size:10px;color:var(--t3);margin-bottom:8px">📂 Henüz yüklenmedi</div>';
    h += '<textarea id="mv-excel-ham2" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Şirket muavin Excel\'ini yapıştır veya dosya seç..." style="width:100%;height:120px;font-size:11px;font-family:monospace;padding:8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>';
    h += '<div style="display:flex;gap:6px;margin-top:8px">';
    h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2)">📂 Dosya Seç<input type="file" accept=".xlsx,.csv,.txt" onchange="window._mvDosyaOku2(this)" style="display:none"></label>';
    h += '<button onclick="event.stopPropagation();window._mvKarsilastir2()" style="font-size:10px;padding:5px 16px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
    h += '</div>';
    h += '</div></div>';
  }
  else if(aktifTab==='islemler'){
    if(!tumIslemler.length){ h += '<div style="padding:40px;text-align:center;color:var(--t3)">Önce "Veri Yükle" sekmesinden Excel yükleyin</div>'; }
    else {
      h += (window._mvOnayDurumuHTML?.()||'');
      h += '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">';
      h += '<input id="mv-ara" placeholder="Cari adı, fiş no, tarih, tutar, açıklama ara..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._mvAra(this.value)" style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
      h += '<span id="mv-ara-sonuc" style="font-size:10px;color:var(--t3);white-space:nowrap"></span>';
      h += '<input id="mv-tarih-bas" type="date" onchange="event.stopPropagation();window._mvTarihFiltrele()" style="font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit" title="Başlangıç tarihi">';
      h += '<span style="font-size:10px;color:var(--t3)">—</span>';
      h += '<input id="mv-tarih-bit" type="date" onchange="event.stopPropagation();window._mvTarihFiltrele()" style="font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit" title="Bitiş tarihi">';
      h += '<button onclick="event.stopPropagation();window._mvCSVExport()" style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">↓ CSV</button>';
      h += '<button onclick="event.stopPropagation();window._mvXLSMExport()" style="font-size:10px;padding:5px 10px;border:0.5px solid #0F6E56;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#0F6E56">↓ Excel</button>';
      h += '<button onclick="event.stopPropagation();window._mvPDFRaporu()" style="font-size:10px;padding:5px 10px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#A32D2D">⎙ PDF</button>';
      h += '</div>';
      h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10px;min-width:1100px">';
      h += '<thead><tr style="background:var(--s2)">';
      ['TARİH','TİP','FİŞ NO','AÇIKLAMA','BORÇ','ALACAK','BAKİYE','B/A','BORÇ(DÖV)','ALACAK(DÖV)','BAKİYE(DÖV)','B/A','CARİ ADI'].forEach(function(k){
        h += '<th style="padding:5px 6px;text-align:'+(k==='AÇIKLAMA'||k==='CARİ ADI'?'left':'right')+';border-bottom:0.5px solid var(--b);white-space:nowrap;font-size:9px;font-weight:500">'+k+'</th>';
      });
      h += '</tr></thead><tbody id="mv-islem-tbody">';
      h += window._mvIslemSatirHTML ? window._mvIslemSatirHTML(tumIslemler) : '';
      h += '</tbody></table></div>';
    }
  }
  else if(aktifTab==='agac'){
    h += (window._mvAgacHTML?.()||'<div style="padding:40px;text-align:center;color:var(--t3)">Önce Excel yükleyin</div>');
  }
  else if(aktifTab==='cari'){
    h += (window._mvCariOzetHTML?.()||'<div style="padding:40px;text-align:center;color:var(--t3)">Önce Excel yükleyin</div>');
  }
  else if(aktifTab==='karsilastirma'){
    if (window._mvDosyaAd || window._mvDosya2Ad) {
      h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--s2);border-radius:6px;margin-bottom:12px;border:0.5px solid var(--b)">';
      h += '<div style="flex:1"><div style="font-size:9px;color:var(--t3);font-weight:500;margin-bottom:3px">KARŞILAŞTIRILAN DOSYALAR</div>';
      h += '<div style="display:flex;align-items:center;gap:8px">';
      h += '<span style="font-size:11px;color:var(--t)">📂 ' + (window._mvDosyaAd || 'Yüklenmedi') + '</span>';
      if (window._mvDosyaSatir) h += '<span style="font-size:9px;color:var(--t3)">(' + window._mvDosyaSatir + ' işlem)</span>';
      h += '<span style="font-size:14px;color:var(--t3)">↔</span>';
      h += '<span style="font-size:11px;color:var(--t)">📂 ' + (window._mvDosya2Ad || 'Yüklenmedi') + '</span>';
      if (window._mvDosya2Satir) h += '<span style="font-size:9px;color:var(--t3)">(' + window._mvDosya2Satir + ' işlem)</span>';
      h += '</div></div>';
      var ikiDosya = window._mvDosyaAd && window._mvDosya2Ad;
      h += '<div style="text-align:right"><div style="font-size:9px;color:' + (ikiDosya ? '#0F6E56' : '#854F0B') + '">' + (ikiDosya ? '✓ Hazır' : '⚠ Eksik dosya') + '</div>';
      if (ikiDosya) h += '<button onclick="event.stopPropagation();window._mvKarsilastir2()" style="font-size:10px;padding:4px 12px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;margin-top:4px">Karşılaştır →</button>';
      h += '</div></div>';
    } else {
      h += '<div style="padding:10px 14px;background:#FAEEDA;border-radius:6px;margin-bottom:12px;font-size:10px;color:#854F0B">⚠ Karşılaştırma için önce "Veri Yükle" sekmesinden her iki Excel\'i yükleyin</div>';
    }
    h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:12px">';
    h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:6px">İkinci Excel (Bütçe / Önceki Dönem)</div>';
    h += '<textarea id="mv-excel-ham2" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="İkinci Excel yapıştır veya dosya seç..." style="width:100%;height:120px;font-size:11px;font-family:monospace;padding:8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>';
    h += '<div style="display:flex;gap:6px;margin-top:8px">';
    h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2)">📂 Dosya Seç<input type="file" accept=".xlsx,.csv,.txt" onchange="window._mvDosyaOku2(this)" style="display:none"></label>';
    h += '<button onclick="event.stopPropagation();window._mvKarsilastir2()" style="font-size:10px;padding:5px 16px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
    h += '</div></div>';
    h += (window._mvSistemFarkHTML?.() || '');
    h += '<div id="mv-muhasebeci-fark" style="margin-bottom:12px">';
    h += (window._mvMuhasebeciFarkRaporuHTML?.()||'');
    h += '</div>';
    h += '<div id="mv-fark-panel"></div>';
  }
  else if(aktifTab==='donem'){
    h += (window._mvDonemKarsilastirHTML?.()||'');
  }
  else if(aktifTab==='notlar'){
    h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px">';
    h += '<div style="font-size:11px;font-weight:500;color:var(--t);margin-bottom:10px">Muhasebeci Notları</div>';
    h += '<div style="display:flex;gap:6px;margin-bottom:12px">';
    h += '<input id="mv-not-inp" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._mvNotKaydet()" placeholder="Not ekle — Örn: Q1 2026 — 3 eksik fiş, takipte..." style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
    h += '<button onclick="event.stopPropagation();window._mvNotKaydet()" style="font-size:10px;padding:6px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kaydet</button>';
    h += '</div>';
    h += '<div id="mv-not-panel"></div>';
    h += '<div style="margin-top:12px"><button onclick="event.stopPropagation();window._mvTopluMutabakatPDF()" style="font-size:11px;padding:7px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">⎙ Toplu Mutabakat Raporu (Tüm Dönemler)</button></div>';
    h += '</div>';
  }
  h += '</div>';
  panel.innerHTML = h;
  setTimeout(function(){
    window._mvNotPanelGuncelle?.();
    var ta=document.getElementById('mv-excel-ham2');
    if(ta&&window._mvHam2) ta.value=window._mvHam2;
  },50);
};

console.log('[MUAVİN] v2.6 yüklendi');
