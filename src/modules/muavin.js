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
    window._mvSonIslemler = tumIslemler;
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
    h += '<span id="mv-ara-sonuc" style="font-size:10px;color:var(--t3);white-space:nowrap"></span>';
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
    if (tumIslemler.length) h += (window._mvAgacHTML?.() || '');
  }
  h += '</div>';
  panel.innerHTML = h;
  /* BUG-002: render sonrası ikinci Excel textarea restore */
  setTimeout(function() { var ta = document.getElementById('mv-excel-ham2'); if (ta && window._mvHam2) ta.value = window._mvHam2; }, 50);
};

console.log('[MUAVİN] v1.3 yüklendi');
