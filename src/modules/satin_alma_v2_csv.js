/* ── SA-V2-CSV-001: Toplu CSV Import ───────────────────────── */
window._saV2CSVImport = function() {
  var mevcut = document.getElementById('sav2-csv-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'sav2-csv-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:640px;max-height:90vh;overflow-y:auto">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div><div style="font-size:14px;font-weight:500;color:var(--t)">CSV / Excel Import</div>'
    + '<div style="font-size:9px;color:var(--t3);margin-top:2px">Excel\'den kopyala yapıştır veya CSV dosyası seç</div></div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-csv-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>'
    + '</div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:6px;padding:10px 14px">'
    + '<div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:6px">Beklenen kolon sırası (ilk satır başlık):</div>'
    + '<div style="font-size:10px;font-family:monospace;color:#185FA5">DUAY_KODU | URUN_ADI | TURKCE_ADI | MARKA | BIRIM | MENSEI | GTIP | ALIS_FIYATI | PARA | MIKTAR | TEDARIKCI | JOB_ID</div>'
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DOSYA SEÇ (.csv, .txt)</div>'
    + '<input type="file" accept=".csv,.txt" onchange="event.stopPropagation();window._saV2CSVDosyaOku(this)" style="font-size:11px;color:var(--t)">'
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">VEYA EXCEL\'DEN KOPYALA YAPIŞIR</div>'
    + '<textarea id="sav2-csv-text" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Excel\'den seç → Kopyala → Buraya yapıştır (Cmd+V)" style="width:100%;height:140px;font-size:11px;font-family:monospace;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:vertical;box-sizing:border-box"></textarea>'
    + '</div>'
    + '<div id="sav2-csv-oniz" style="display:none;background:var(--s2);border-radius:6px;padding:10px;border:0.5px solid var(--b)">'
    + '<div style="font-size:9px;font-weight:500;color:var(--t3);margin-bottom:6px" id="sav2-csv-oniz-say"></div>'
    + '<div id="sav2-csv-oniz-liste" style="font-size:10px;color:var(--t2);max-height:120px;overflow-y:auto"></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="event.stopPropagation();window._saV2CSVOnizle()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Önizle</button>'
    + '<button onclick="event.stopPropagation();window._saV2CSVKaydet()" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">İçe Aktar</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-csv-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">İptal</button>'
    + '</div></div></div>';
  document.body.appendChild(modal);
};

window._saV2CSVDosyaOku = function(inp) {
  var f = inp.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) { var ta = document.getElementById('sav2-csv-text'); if (ta) ta.value = e.target.result; };
  r.readAsText(f, 'UTF-8');
};

window._saV2CSVParse = function(text) {
  var satirlar = text.split(/\r?\n/).filter(function(s) { return s.trim(); });
  if (satirlar.length < 2) return [];
  var ayrac = ',';
  var sayC = (text.match(/,/g) || []).length;
  var sayN = (text.match(/;/g) || []).length;
  var sayT = (text.match(/\t/g) || []).length;
  if (sayT > sayC && sayT > sayN) ayrac = '\t';
  else if (sayN > sayC) ayrac = ';';
  var basliklar = satirlar[0].split(ayrac).map(function(s) { return s.trim().toUpperCase().replace(/\s+/g, '_'); });
  var kolonMap = { DUAY_KODU: 'duayKodu', URUN_ADI: 'urunAdi', TURKCE_ADI: 'turkceAdi', MARKA: 'marka', BIRIM: 'birim', MENSEI: 'mensei', GTIP: 'gtip', ALIS_FIYATI: 'alisF', PARA: 'para', MIKTAR: 'miktar', TEDARIKCI: 'tedarikci', JOB_ID: 'jobId' };
  var kayitlar = [];
  for (var i = 1; i < satirlar.length; i++) {
    var hucre = satirlar[i].split(ayrac).map(function(s) { return s.trim().replace(/^"|"$/g, ''); });
    var obj = {};
    basliklar.forEach(function(b, idx) { var k = kolonMap[b]; if (k) obj[k] = hucre[idx] || ''; });
    if (!obj.urunAdi && !obj.duayKodu) continue;
    kayitlar.push({
      id: window._saId?.() || (Date.now() + i + Math.random().toString(36).slice(2, 6)),
      duayKodu: obj.duayKodu || '',
      urunAdi: obj.urunAdi || '',
      turkceAdi: obj.turkceAdi || '',
      marka: obj.marka || '',
      birim: obj.birim || 'Adet',
      mensei: obj.mensei || 'TR',
      gtip: obj.gtip || '',
      alisF: obj.alisF || '',
      para: obj.para || 'USD',
      miktar: obj.miktar || '1',
      tedarikci: obj.tedarikci || '',
      jobId: obj.jobId || '',
      durum: 'bekleyen',
      karMarji: 33,
      createdAt: window._saNow?.(),
      updatedAt: window._saNow?.()
    });
  }
  return kayitlar;
};

window._saV2CSVOnizle = function() {
  var text = document.getElementById('sav2-csv-text')?.value || '';
  if (!text.trim()) { window.toast?.('Önce veri girin', 'warn'); return; }
  var kayitlar = window._saV2CSVParse(text);
  var oniz = document.getElementById('sav2-csv-oniz');
  var say = document.getElementById('sav2-csv-oniz-say');
  var liste = document.getElementById('sav2-csv-oniz-liste');
  if (!oniz) return;
  if (!kayitlar.length) { window.toast?.('Geçerli satır bulunamadı', 'warn'); return; }
  oniz.style.display = 'block';
  if (say) say.textContent = kayitlar.length + ' satır okundu — ilk 5 önizleme:';
  if (liste) liste.innerHTML = kayitlar.slice(0, 5).map(function(k) {
    return '<div style="padding:3px 0;border-bottom:0.5px solid var(--b)">' + _saEsc(k.duayKodu || '—') + ' · ' + _saEsc(k.urunAdi) + ' · ' + _saEsc(k.alisF) + ' ' + _saEsc(k.para) + '</div>';
  }).join('');
};

window._saV2CSVKaydet = function() {
  var text = document.getElementById('sav2-csv-text')?.value || '';
  if (!text.trim()) { window.toast?.('Önce veri girin', 'warn'); return; }
  var kayitlar = window._saV2CSVParse(text);
  if (!kayitlar.length) { window.toast?.('Geçerli satır bulunamadı', 'warn'); return; }
  var liste = window._saV2Load?.() || [];
  kayitlar.forEach(function(k) { liste.unshift(k); });
  window._saV2Store?.(liste);
  document.getElementById('sav2-csv-modal')?.remove();
  window.toast?.(kayitlar.length + ' teklif içe aktarıldı', 'ok');
  window.renderSatinAlmaV2?.();
};

