/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/urun_db.js  —  v1.0.0
 * Ürün Veritabanı — Tam CRUD + Excel Import/Export
 * localStorage: ak_urun_db1
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

var URUN_DB_KEY = 'ak_urun_db1';

function loadUrunDB(opts) {
  /* URUN-STORE-FIX-001: platform loadUrunler'a delegate */
  return window.loadUrunler?.(opts||{tumKullanicilar:true,_dahilSilinenler:true}) || [];
}
function storeUrunDB(d) {
  /* URUN-STORE-FIX-001: platform storeUrunler'a delegate */
  return window.storeUrunler?.(d);
}

/**
 * Duay Ürün Kodu otomatik üretir: SatıcıKodu-ÜrünKodu
 */
function _generateDuayCode(vendorName, vendorCode) {
  var prefix = (vendorName || 'XX').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  var code = (vendorCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return 'DY-' + prefix + '-' + (code || '') + '-' + Date.now().toString(36).slice(-6);
}

/**
 * URUN-DUAY-KODU-AUTO-001: 11 başlayan unique duay kodu üretir.
 * Format: '11.XXXXXX' (6 hane timestamp sonu + collision counter varsa suffix)
 * Mevcut kayıtlardaki duayCode + duayKodu field'larına karşı unique garantili.
 * @param {Array<string>} mevcutKodlar - existing duayCode + duayKodu listesi
 * @returns {string} örnek: "11.683453" veya "11.6834531" (collision varsa)
 */
function _genDuayKodu(mevcutKodlar) {
  var mevcut = {};
  (mevcutKodlar || []).forEach(function(k) { if (k) mevcut[String(k)] = true; });
  var tsBase = Date.now().toString().slice(-6);
  var kod = '11.' + tsBase;
  var sayac = 0;
  while (mevcut[kod] && sayac < 1000) {
    sayac++;
    kod = '11.' + tsBase + sayac;
  }
  return kod;
}

var URUN_COUNTRIES = ['Türkiye','Çin','Almanya','ABD','İtalya','Fransa','İngiltere','Japonya','Güney Kore','Hindistan','Brezilya','Rusya','İspanya','Hollanda','Belçika','İsviçre','Avusturya','Polonya','Çekya','Macaristan','Romanya','Bulgaristan','Yunanistan','Mısır','BAE','Suudi Arabistan','İran','Tayland','Vietnam','Endonezya','Malezya','Singapur','Tayvan','Pakistan','Bangladeş','Sri Lanka','Arjantin','Kolombiya','Peru','Şili','Meksika','Kanada','Avustralya','Güney Afrika','Nijerya','Kenya','Fas','Cezayir','Tunus'];

/**
 * Ürün ekleme/düzenleme modalı.
 */
function openUrunModal(id) {
  var old = document.getElementById('mo-urun-db'); if (old) old.remove();
  var data = loadUrunDB();
  var u = id ? data.find(function(x) { return String(x.id) === String(id); }) : null;
  var esc = window._esc;

  // Cari listesi (satıcılar)
  var cariList = typeof loadCari === 'function' ? (loadCari({tumKullanicilar:true})||[]).filter(function(c){return !c.isDeleted;}) : [];
  var cariOpts = '<option value="">— Satıcı Seçin —</option>' + cariList.map(function(c) { return '<option value="' + esc((c.ad || c.unvan || c.name || '')) + '"' + (u?.vendorName === (c.ad || c.unvan || c.name || '') ? ' selected' : '') + '>' + esc((c.ad || c.unvan || c.name || '')) + '</option>'; }).join('');
  var countryOpts = '<option value="">—</option>' + URUN_COUNTRIES.map(function(c) { return '<option value="' + c + '"' + (u?.origin === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-urun-db'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:1600px;width:96vw;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:13px;font-weight:700;color:var(--t)">' + 'Ürün Kataloğu — ' + (u ? '✏️ Düzenle' : 'Toplu Kayıt') + '</div>'
      + '<button onclick="document.getElementById(\'mo-urun-db\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px">'
      // URUN-FORM-EXCEL-001: Excel tarzı çok satırlı tablo
      + '<div id="udb-tablo-wrap" style="overflow-x:auto">'
        + '<table id="udb-tablo" style="width:100%;border-collapse:collapse;table-layout:fixed;min-width:1320px">'
          + '<colgroup>'
            + '<col style="width:32px">'
            + '<col style="width:48px">'
            + '<col style="width:145px">'
            + '<col style="width:145px">'
            + '<col style="width:145px">'
            + '<col style="width:115px">'
            + '<col style="width:105px">'
            + '<col style="width:80px">'
            + '<col style="width:78px">'
            + '<col style="width:85px">'
            + '<col style="width:81px">'
            + '<col style="width:85px">'
            + '<col style="width:85px">'
            + '<col style="width:1fr">'
            + '<col style="width:32px">'
          + '</colgroup>'
          + '<thead id="udb-thead">'
            + '<tr style="background:var(--s2);border-bottom:0.5px solid var(--b)">'
              + '<th style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center">#</th>'
              + '<th style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center">GÖRSEL *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">TEDARİKÇİ *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">ÜRÜN ADI (TR) *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">ÜRÜN ADI (EN) *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">KATEGORİ *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">TED. KODU *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">MENŞEİ *</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">BİRİM *</th>'
              + '<th title="Teslim süresi (gün) — tedarikçi kaç günde teslim eder" style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center;cursor:help">TSL(G)</th>'
              + '<th title="Raf ömrü (gün) — ürünün depoda bozulmadan kalabileceği süre" style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center;cursor:help">RAF(G)</th>'
              + '<th title="Net ağırlık (kg) — ambalajsız ürün ağırlığı" style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center;cursor:help">NET KG</th>'
              + '<th title="Brüt ağırlık (kg) — ambalaj dahil toplam ağırlık" style="padding:8px 4px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:center;cursor:help">BRÜT KG</th>'
              + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:var(--t2);white-space:nowrap;text-align:left">TEK. AÇIKLAMA *</th>'
              + '<th style="padding:8px 4px"></th>'
            + '</tr>'
          + '</thead>'
          + '<tbody id="udb-tbody">'
            + '<tr id="udb-row-1">' + _udbSatirHTML(1, u) + '</tr>'
          + '</tbody>'
        + '</table>'
      + '</div>'
      + '<div style="padding:8px 16px;display:' + (u ? 'none' : 'block') + '">'
        + '<button onclick="event.stopPropagation();window._udbSatirEkle?.()" style="font-size:13px;color:var(--ac);background:none;border:none;cursor:pointer">+ Ürün satırı ekle</button>'
      + '</div>'
      + '<input type="hidden" id="ud-eid" value="' + esc(u?.id || '') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-urun-db\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveUrunDB?.()">Tümünü Kaydet →</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  requestAnimationFrame(function(){ mo.classList.add('open'); });
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });

  // Duay kodu otomatik üret
  if (!u) {
    var _autoCode = function() {
      var v = document.getElementById('ud-vendor')?.value || '';
      var c = document.getElementById('ud-vendorCode')?.value || '';
      var el = document.getElementById('ud-duayCode');
      if (el) el.value = _generateDuayCode(v, c);
    };
    document.getElementById('ud-vendor')?.addEventListener('change', _autoCode);
    document.getElementById('ud-vendorCode')?.addEventListener('input', _autoCode);
  }

  // URUN-FORM-EXCEL-002: satır ekle/sil/detay/görsel fonksiyonları
  window._udbRowCounter = 1;

  window._udbSatirEkle = function() {
    window._udbRowCounter++;
    var n = window._udbRowCounter;
    var tbody = document.getElementById('udb-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.id = 'udb-row-' + n;
    tr.style.borderBottom = '0.5px solid var(--b)';
    tr.style.background = (n % 2 === 0) ? 'var(--s2)' : 'var(--sf)';
    tr.innerHTML = _udbSatirHTML(n, null);
    tbody.appendChild(tr);
  };

  window._udbSil = function(n) {
    var tr = document.getElementById('udb-row-' + n);
    if (tr) tr.remove();
    var detay = document.getElementById('udb-detay-' + n);
    if (detay) detay.remove();
  };

  window._udbDetay = function(n) {
    var mevcut = document.getElementById('udb-detay-' + n);
    if (mevcut) { mevcut.remove(); return; }
    var tr = document.getElementById('udb-row-' + n);
    if (!tr) return;
    var detayTr = document.createElement('tr');
    detayTr.id = 'udb-detay-' + n;
    detayTr.innerHTML = '<td colspan="15" style="padding:0"><div style="background:#E6F1FB;border-top:0.5px solid #B5D4F4;border-bottom:1.5px solid #185FA5;padding:12px 20px"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:12px"><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:4px">ÖNEMLİ NOT</div><textarea id="udb-note-'+n+'" rows="3" style="width:100%;box-sizing:border-box;font-size:12px;resize:none"></textarea></div><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:4px">SÖZLEŞME NOTLARI</div><textarea id="udb-sozlesme-'+n+'" rows="3" style="width:100%;box-sizing:border-box;font-size:12px;resize:none" placeholder="Her alımda sözleşmeye otomatik gider..."></textarea></div><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:4px">ÜRETİM & TESLİMAT KONTROLÜ</div><textarea id="udb-uretim-'+n+'" rows="3" style="width:100%;box-sizing:border-box;font-size:12px;resize:none" placeholder="Her satın almada güncellenir..."></textarea></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px"><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:6px">GİZLİ HİLE</div><div style="display:flex;align-items:center;gap:8px;padding:8px;background:#FAEEDA;border:0.5px solid #EF9F27;border-radius:6px;margin-bottom:6px"><input type="checkbox" id="udb-hile-'+n+'" style="width:14px;height:14px"><label style="font-size:12px;color:#633806">Bu üründe gizli hile var</label></div><textarea id="udb-hile-not-'+n+'" rows="2" style="width:100%;box-sizing:border-box;font-size:12px;resize:none" placeholder="Gizli hile detayları..."></textarea></div><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:6px">BELGELER</div><div style="display:flex;flex-direction:column;gap:5px"><button style="padding:6px;font-size:12px;text-align:left">+ Datasheet (PDF)</button><button style="padding:6px;font-size:12px;text-align:left">+ Ürün Kataloğu</button><button style="padding:6px;font-size:12px;text-align:left">+ Diğer Belgeler</button></div></div><div><div style="font-size:10px;font-weight:500;color:#0C447C;margin-bottom:6px">NUMUNE & MARKA</div><div style="display:flex;flex-direction:column;gap:5px"><button style="padding:6px;font-size:12px;text-align:left">+ Numune Ekle</button></div><div style="margin-top:8px"><div style="font-size:10px;color:#0C447C;margin-bottom:4px">MARKA</div><input type="text" id="udb-marka-'+n+'" placeholder="Marka adı" style="width:100%;box-sizing:border-box;font-size:12px"></div></div></div></div></td>';
    tr.insertAdjacentElement('afterend', detayTr);
  };

  window._udbGorselSec = function(n) {
    /* URUN-FORM-EXCEL-003: görsel kalite uyarı popup */
    var uyariMo = document.createElement('div');
    uyariMo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    uyariMo.innerHTML = '<div style="background:var(--sf,#fff);border-radius:12px;padding:24px 28px;max-width:480px;width:90%">'
      + '<div style="font-size:14px;font-weight:600;color:#A32D2D;margin-bottom:12px">Bu görsel müşteriye sunulacak teklifte kullanılır — profesyonel olması zorunludur.</div>'
      + '<div style="font-size:13px;color:#333;line-height:1.8;margin-bottom:12px">'
      + '<b>Kabul edilen türler:</b><br>'
      + '1. Beyaz/düz arka plan — ürün ortalanmış, gölgesiz<br>'
      + '2. Stüdyo çekimi — profesyonel ışık, temiz arka plan<br>'
      + '3. Teknik çizim — ölçülü, vektörel<br>'
      + '4. Ambalaj görseli — kutu/paket, marka logosu görünür<br>'
      + '5. Gerçek kullanım — ürün yerinde, bağlam anlaşılır'
      + '</div>'
      + '<div style="font-size:13px;color:#A32D2D;margin-bottom:20px"><b>Kabul edilmez:</b> Bulanık · Filigran · Karmaşık arka plan · Ekran fotoğrafı</div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end">'
      + '<button id="udb-gorsel-iptal" style="padding:10px 20px;font-size:13px;border:0.5px solid #ccc;border-radius:8px;cursor:pointer;background:transparent">İptal</button>'
      + '<button id="udb-gorsel-devam" style="padding:10px 20px;font-size:13px;background:#185FA5;color:#fff;border:none;border-radius:8px;cursor:pointer">Anladım, Görsel Seç →</button>'
      + '</div></div>';
    document.body.appendChild(uyariMo);
    document.getElementById('udb-gorsel-iptal').onclick = function() { uyariMo.remove(); };
    document.getElementById('udb-gorsel-devam').onclick = function() {
      uyariMo.remove();
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jpg,.jpeg,.png,.webp';
      input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { window.toast?.('Görsel max 5MB olabilir', 'err'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          /* URUN-GORSEL-COMPRESS-001: Canvas 200px JPEG70 compress */
          var img = new Image();
          img.onload = function() {
            var maxDim = 200;
            var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            var w = Math.round(img.width * scale);
            var h = Math.round(img.height * scale);
            var canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            var compressed = canvas.toDataURL('image/jpeg', 0.7);
            var cell = document.querySelector('#udb-row-' + n + ' .udb-gorsel-cell');
            if (cell) cell.innerHTML = '<img src="' + compressed + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px">';
            window['_udbImg' + n] = compressed;
          };
          img.onerror = function() {
            var cell = document.querySelector('#udb-row-' + n + ' .udb-gorsel-cell');
            if (cell) cell.innerHTML = '<img src="' + ev.target.result + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px">';
            window['_udbImg' + n] = ev.target.result;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };
  };

  function _udbSatirHTML(n, u) {
    /* URUN-KATEGORI-BIRIM-COMBOBOX-001: unique kategori/birim listesi + datalist enjekte */
    var _mevcutUrunler = (typeof loadUrunDB === 'function' ? loadUrunDB() : []) || [];
    var _defKat = ['Elektronik','Makine','Kimya','Tekstil','Gıda','Ambalaj','Kırtasiye','Mobilya','İnşaat','Yedek Parça','Diğer'];
    var _defBirim = ['Adet','Kg','Gr','Ton','Metre','m²','m³','Litre','Paket','Koli','Kutu','Rulo','Set'];
    var _setKat = {}; _defKat.forEach(function(k){ _setKat[k]=true; }); _mevcutUrunler.forEach(function(x){ if(x && x.category) _setKat[x.category]=true; });
    var _setBirim = {}; _defBirim.forEach(function(b){ _setBirim[b]=true; }); _mevcutUrunler.forEach(function(x){ if(x && x.unit) _setBirim[x.unit]=true; });
    var _katList = Object.keys(_setKat).sort();
    var _birimList = Object.keys(_setBirim).sort();
    if (!document.getElementById('udb-kat-datalist')) {
      var _dl1 = document.createElement('datalist'); _dl1.id = 'udb-kat-datalist';
      _dl1.innerHTML = _katList.map(function(k){ return '<option value="'+esc(k)+'">'; }).join('');
      document.body.appendChild(_dl1);
    }
    if (!document.getElementById('udb-birim-datalist')) {
      var _dl2 = document.createElement('datalist'); _dl2.id = 'udb-birim-datalist';
      _dl2.innerHTML = _birimList.map(function(b){ return '<option value="'+esc(b)+'">'; }).join('');
      document.body.appendChild(_dl2);
    }
    var rowCariOpts = '<option value="">— Satıcı Seçin —</option>' + cariList.map(function(c) { return '<option value="' + esc((c.ad || c.unvan || c.name || '')) + '"' + (u && u.vendorName === (c.ad || c.unvan || c.name || '') ? ' selected' : '') + '>' + esc((c.ad || c.unvan || c.name || '')) + '</option>'; }).join('');
    var rowCountryOpts = '<option value="">—</option>' + URUN_COUNTRIES.map(function(c) { return '<option value="' + c + '"' + (u && u.origin === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    return '<td style="padding:4px 4px;text-align:center;vertical-align:middle;font-size:11px;color:var(--t2)">'+n+'<br><button onclick="event.stopPropagation();window._udbDetay?.('+n+')" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--ac);padding:0">⋯</button></td>'
      + '<td style="padding:4px 4px;text-align:center;vertical-align:middle"><div class="udb-gorsel-cell" onclick="event.stopPropagation();window._udbGorselSec?.('+n+')" style="width:40px;height:40px;border:1.5px dashed var(--b);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;color:var(--t3);margin:0 auto">'+(u && (u.image || u._hasImage) ? '📷' : '+')+'</div></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><select class="fi" id="udb-vendor-'+n+'">' + rowCariOpts + '</select></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><input class="fi" id="udb-duayName-'+n+'" value="'+esc(u?.duayName||'')+'" placeholder="Türkçe ad"></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><input class="fi" id="udb-origName-'+n+'" value="'+esc(u?.origName||'')+'" placeholder="English name"></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><input class="fi" list="udb-kat-datalist" id="udb-category-'+n+'" value="'+esc(u?.category||'')+'" placeholder="Kategori seç/yaz"></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><input class="fi" id="udb-vendorCode-'+n+'" value="'+esc(u?.vendorCode||'')+'" placeholder="Tedarikçinin ürün kodu"></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><select class="fi" id="udb-origin-'+n+'">' + rowCountryOpts + '</select></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><input class="fi" list="udb-birim-datalist" id="udb-unit-'+n+'" value="'+esc(u?.unit||'Adet')+'" placeholder="Birim"></td>'
      + '<td style="padding:4px 4px;vertical-align:middle"><input class="fi" type="number" id="udb-teslim-'+n+'" value="'+esc(u?.deliveryDays||'')+'" placeholder="örn 15"></td>'
      + '<td style="padding:4px 4px;vertical-align:middle"><input class="fi" type="number" id="udb-raf-'+n+'" value="'+esc(u?.shelfLife||'')+'" placeholder="örn 365"></td>'
      + '<td style="padding:4px 4px;vertical-align:middle"><input class="fi" type="number" id="udb-netW-'+n+'" value="'+esc(u?.netWeight||'')+'" placeholder="örn 2.5" step="0.01"></td>'
      + '<td style="padding:4px 4px;vertical-align:middle"><input class="fi" type="number" id="udb-grossW-'+n+'" value="'+esc(u?.grossWeight||'')+'" placeholder="örn 3.0" step="0.01"></td>'
      + '<td style="padding:4px 6px;vertical-align:middle"><textarea class="fi" id="udb-techDesc-'+n+'" rows="1" placeholder="Açıklama" style="resize:vertical;min-height:32px">'+esc(u?.techDesc||'')+'</textarea></td>'
      + '<td style="padding:4px 4px;text-align:center;vertical-align:middle"><button onclick="event.stopPropagation();window._udbSil?.('+n+')" style="background:none;border:none;cursor:pointer;font-size:18px;color:#E24B4A;padding:0">×</button></td>';
  }
}

/**
 * Ürün kaydet.
 */
window._saveUrunDB = function() {
  /* URUN-FORM-EXCEL-004: multi-row batch save
     Düzeltmeler: loadUrunDB/storeUrunDB (doğru store),
     Auth.getCU (dosya standardı), edit/duplicate scope dışı. */
  var satirlar = document.querySelectorAll('#udb-tbody > tr[id^="udb-row-"]');
  if (!satirlar.length) { window.toast?.('En az 1 ürün girin', 'err'); return; }
  var data = loadUrunDB();
  var hatalar = [];
  var yeniKayitlar = [];
  /* URUN-DUAY-KODU-AUTO-001: mevcut kodlarla collision kontrolü için toplama */
  var _mevcutKodlar = data.map(function(d) { return d.duayCode || d.duayKodu; }).filter(Boolean);

  satirlar.forEach(function(tr) {
    var n = tr.id.replace('udb-row-', '');
    var duayName = (document.getElementById('udb-duayName-'+n)?.value||'').trim();
    var origName = (document.getElementById('udb-origName-'+n)?.value||'').trim();
    var vendorId = document.getElementById('udb-vendor-'+n)?.value||'';
    var vendorCode = (document.getElementById('udb-vendorCode-'+n)?.value||'').trim();
    var category = (document.getElementById('udb-category-'+n)?.value||'').trim();
    var origin = (document.getElementById('udb-origin-'+n)?.value||'').trim();
    var unit = (document.getElementById('udb-unit-'+n)?.value||'').trim();
    var techDesc = (document.getElementById('udb-techDesc-'+n)?.value||'').trim();
    var teslim = document.getElementById('udb-teslim-'+n)?.value||'';
    var raf = document.getElementById('udb-raf-'+n)?.value||'';
    var netW = document.getElementById('udb-netW-'+n)?.value||'';
    var grossW = document.getElementById('udb-grossW-'+n)?.value||'';
    var note = (document.getElementById('udb-note-'+n)?.value||'').trim();
    var sozlesme = (document.getElementById('udb-sozlesme-'+n)?.value||'').trim();
    var marka = (document.getElementById('udb-marka-'+n)?.value||'').trim();
    var uretimKontrol = (document.getElementById('udb-uretim-'+n)?.value||'').trim();
    var gizliHile = !!(document.getElementById('udb-hile-'+n)?.checked);
    var gizliHileNot = (document.getElementById('udb-hile-not-'+n)?.value||'').trim();
    var image = window['_udbImg'+n]||null;

    if (!duayName) { hatalar.push('Satır '+n+': Ürün adı (TR) zorunlu'); return; }
    if (!vendorId) { hatalar.push('Satır '+n+': Tedarikçi zorunlu'); return; }
    if (!techDesc) { hatalar.push('Satır '+n+': Teknik açıklama zorunlu'); return; }
    if (!origName) { hatalar.push('Satır '+n+': Ürün adı (EN) zorunlu'); return; }
    if (!origin) { hatalar.push('Satır '+n+': Menşei zorunlu'); return; }
    if (!unit) { hatalar.push('Satır '+n+': Birim zorunlu'); return; }
    if (!image) { hatalar.push('Satır '+n+': Görsel zorunlu'); return; }

    /* URUN-DUAY-KODU-AUTO-001: 11. prefix unique duay kodu */
    var _yeniDuayKodu = _genDuayKodu(_mevcutKodlar);
    _mevcutKodlar.push(_yeniDuayKodu);
    var kayit = {
      id: _generateDuayCode(vendorId, vendorCode) || (typeof window.generateId==='function' ? window.generateId() : Date.now()),
      duayCode: _yeniDuayKodu,
      duayName: duayName,
      origName: origName,
      vendorId: (function(){ var c = (typeof loadCari === 'function' ? (loadCari({tumKullanicilar:true})||[]) : []).find(function(x){ return (x.ad||x.unvan||x.name||'') === vendorId; }); return c ? String(c.id||c.uid||'') : ''; })(),
      vendorName: vendorId,
      vendorCode: vendorCode,
      category: category,
      origin: origin,
      unit: unit || 'Adet',
      techDesc: techDesc,
      deliveryDays: teslim ? Number(teslim) : null,
      shelfLife: raf ? Number(raf) : null,
      netWeight: netW ? Number(netW) : null,
      grossWeight: grossW ? Number(grossW) : null,
      note: note,
      sozlesmeNotu: sozlesme,
      marka: marka,
      uretimKontrol: uretimKontrol,
      gizliHile: gizliHile,
      gizliHileNot: gizliHileNot,
      image: image||null,
      _hasImage: !!image,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      yukleyen_id: window.Auth?.getCU?.()?.id||null
    };
    yeniKayitlar.push(kayit);
  });

  if (hatalar.length) { window.toast?.(hatalar[0], 'err'); return; }
  if (!yeniKayitlar.length) { window.toast?.('Kaydedilecek ürün yok', 'err'); return; }

  yeniKayitlar.forEach(function(k){
    /* URUN-EDIT-MODE-001: edit mode update, yeni mode push */
    var eid = document.getElementById('ud-eid')?.value||'';
    if (eid) {
      var idx = data.findIndex(function(d){ return String(d.id) === String(eid); });
      if (idx > -1) {
        /* URUN-DUAY-KODU-AUTO-001: edit'te mevcut duayCode/duayKodu korunur, yeni kod atlanır */
        var _koruDuayKodu = data[idx].duayCode || data[idx].duayKodu;
        data[idx] = Object.assign(data[idx], k, { id: data[idx].id, createdAt: data[idx].createdAt, duayCode: _koruDuayKodu || k.duayCode });
      }
      else { data.push(k); }
    } else {
      data.push(k);
    }
  });
  storeUrunDB(data);

  Object.keys(window).filter(function(k){return k.startsWith('_udbImg');}).forEach(function(k){delete window[k];});

  var mo = document.getElementById('mo-urun-db');
  if (mo) mo.remove();
  window.logActivity?.('urun_db', yeniKayitlar.length + ' ürün kaydedildi (+Yeni Ürün formu)');
  window.toast?.(yeniKayitlar.length + ' ürün kaydedildi', 'ok');
  window.renderUrunDB?.();
};

/**
 * Ürün listesi render.
 */
function renderUrunDB() {
  /* URUN-STORE-FIX-001: tek seferlik ak_urun_db1 → ak_urunler1 migration */
  (function _migrateUrunDB(){
    try {
      var old = localStorage.getItem('ak_urun_db1');
      if(!old) return;
      var lz = window.LZString;
      var data = old.startsWith('_LZ_')&&lz ? JSON.parse(lz.decompressFromUTF16(old.slice(4))) : JSON.parse(old);
      if(!Array.isArray(data)||!data.length) { localStorage.removeItem('ak_urun_db1'); return; }
      var existing = window.loadUrunler?.({tumKullanicilar:true,_dahilSilinenler:true})||[];
      var merged = existing.concat(data.filter(function(n){return !existing.find(function(e){return String(e.id)===String(n.id);});}));
      window.storeUrunler?.(merged);
      localStorage.removeItem('ak_urun_db1');
    } catch(e){}
  })();
  var panel = document.getElementById('panel-urun-db');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);position:sticky;top:0;z-index:200">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">🗃️ Ürün Veritabanı</div><div style="font-size:10px;color:var(--t3)">Ürün tanımları, kodlar, teknik bilgiler</div></div>'
      + '<div style="display:flex;gap:6px"><button class="btn btns" onclick="window._exportUrunXlsx?.()" style="font-size:11px">\u2b07 Excel</button><button class="btn btns" onclick="window._importUrunXlsx?.()" style="font-size:11px">\ud83d\udce5 Iceri Aktar</button><button class="btn btnp" onclick="openUrunModal(null)" style="font-size:12px">+ Urun Ekle</button></div>'
    + '</div>'
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;background:var(--s2)">'
      + '<input class="fi" id="udb-search" placeholder="🔍 Ürün adı, kod, kategori..." oninput="renderUrunDB()" style="font-size:11px;flex:1">'
    + '</div>'
    + '<div id="udb-kat-chips" style="padding:8px 16px;border-bottom:0.5px solid var(--b);display:flex;gap:6px;flex-wrap:wrap;background:var(--sf)"></div>'
    + '<div id="udb-list" style="overflow-x:auto"></div>';
  }

  var data = loadUrunDB().filter(function(u) { return !u.isDeleted; });
  var search = (document.getElementById('udb-search')?.value || '').toLowerCase();
  /* URUN-KATALOG-KAT-CHIP-001: kategori filter state + chip render */
  var aktifKat = window._udbKatFilter || '';
  var benzersizKats = {};
  data.forEach(function(u){ var _k = u && (u.category || u.kategori); if (_k) benzersizKats[_k] = (benzersizKats[_k]||0) + 1; });
  var katListe = Object.keys(benzersizKats).sort();
  var chipsDiv = document.getElementById('udb-kat-chips');
  if (chipsDiv) {
    var chipHtml = '<button onclick="window._udbKatFilter=\'\';renderUrunDB()" style="padding:4px 12px;border-radius:14px;border:0.5px solid ' + (!aktifKat?'var(--ac)':'var(--b)') + ';background:' + (!aktifKat?'var(--ac)':'transparent') + ';color:' + (!aktifKat?'#fff':'var(--t2)') + ';font-size:10px;cursor:pointer;font-family:inherit;transition:all .15s">Tümü <span style="opacity:.7">·' + data.length + '</span></button>';
    katListe.forEach(function(k){
      var on = aktifKat === k;
      chipHtml += '<button onclick="window._udbKatFilter=' + JSON.stringify(k) + ';renderUrunDB()" style="padding:4px 12px;border-radius:14px;border:0.5px solid ' + (on?'var(--ac)':'var(--b)') + ';background:' + (on?'var(--ac)':'transparent') + ';color:' + (on?'#fff':'var(--t2)') + ';font-size:10px;cursor:pointer;font-family:inherit;transition:all .15s">' + window._esc(k) + ' <span style="opacity:.7">·' + benzersizKats[k] + '</span></button>';
    });
    chipsDiv.innerHTML = chipHtml;
  }
  var fl = data.filter(function(u) {
    if (aktifKat && (u.category || u.kategori || '') !== aktifKat) return false;
    if (!search) return true;
    return (u.duayName || u.urunAdi || u.standartAdi || '').toLowerCase().includes(search) || (u.duayCode || u.duayKodu || '').toLowerCase().includes(search) || (u.vendorCode || u.saticiKodu || '').toLowerCase().includes(search) || (u.category || u.kategori || '').toLowerCase().includes(search) || (u.vendorName || u.tedarikci || '').toLowerCase().includes(search);
  });

  var cont = document.getElementById('udb-list');
  if (!cont) return;
  var esc = window._esc;

  // Toplu islem bar
  var bulkBar = '<div id="udb-bulk-bar" style="display:none;padding:6px 16px;background:#FCEBEB;border-bottom:0.5px solid #E24B4A;align-items:center;gap:8px;font-size:11px;color:#791F1F">'
    + '<span id="udb-bulk-cnt">0</span> urun secili '
    + '<button onclick="event.stopPropagation();window._urunDBTopluSil()" style="padding:3px 10px;border-radius:5px;border:0.5px solid #E24B4A;background:#FCEBEB;color:#791F1F;font-size:10px;cursor:pointer;font-family:inherit">Toplu Sil</button>'
    + '<button onclick="event.stopPropagation();window._urunDBTumunuSec()" style="padding:3px 10px;border-radius:5px;border:0.5px solid var(--b);background:var(--sf);color:var(--t2);font-size:10px;cursor:pointer;font-family:inherit">Tumunu Sec</button>'
    + '</div>';

  if (!fl.length) {
    cont.innerHTML = bulkBar + '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px">\ud83d\uddc3\ufe0f</div><div style="margin-top:8px">Urun bulunamadi</div></div>';
    return;
  }

  var html = bulkBar;
  /* URUN-LISTE-COMPACT-001: Apple Finder compact — 0.5px hairline, letter-spacing, 10px header */
  html += '<div style="display:grid;grid-template-columns:24px 24px 100px 120px 1fr 80px 80px 80px 90px;padding:8px 14px;background:var(--s2);border-bottom:0.5px solid var(--b);font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;min-width:850px">'
    + '<div></div><div>Gorsel</div><div>Duay Kodu</div><div>Satici Kodu</div><div>Urun Adi</div><div>Kategori</div><div>Mensei</div><div>GTIP</div><div>Islem</div></div>';

  fl.forEach(function(u) {
    var uid = String(u.id);
    html += '<div style="display:grid;grid-template-columns:24px 24px 100px 120px 1fr 80px 80px 80px 90px;padding:6px 14px;border-bottom:0.5px solid var(--b);align-items:center;font-size:11.5px;line-height:1.3;min-height:32px;min-width:850px;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'rgba(0,0,0,0.02)\'" onmouseleave="this.style.background=\'\'">'
      + '<div><input type="checkbox" class="udb-bulk-chk" data-id="' + esc(uid) + '" onclick="event.stopPropagation();window._urunDBBulkCheck()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac)"></div>'
      + '<div>' + ((u.image || u.gorsel) ? '<img src="' + (u.image || u.gorsel) + '" style="width:28px;height:28px;object-fit:cover;border-radius:4px">' : u._hasImage ? '<div style="width:28px;height:28px;background:var(--s2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px" title="Görsel yüklü (Firestore)">\ud83d\udcf7</div>' : '<div style="width:28px;height:28px;background:var(--s2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px">\ud83d\udce6</div>') + '</div>'
      + '<div style="font-family:monospace;font-weight:600;color:var(--ac)">' + esc(u.duayCode || u.duayKodu || '\u2014') + '</div>'
      + '<div style="font-family:monospace;color:var(--t3)">' + esc(u.vendorCode || u.saticiKodu || '\u2014') + '</div>'
      + '<div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(u.duayName || u.urunAdi || u.standartAdi || '\u2014') + ((function(){var t=u.createdAt||u.ts||u.yuklemeTarihi;if(!t)return '';var ms=new Date()-new Date(t);if(ms>=0&&ms<86400000)return ' <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:#E6F1FB;color:#185FA5;font-weight:500;letter-spacing:.02em">Yeni</span>';return '';})()) + ' · <span style="font-size:11px;color:var(--t3);font-weight:400">' + esc(u.vendorName || u.tedarikci || '') + '</span></div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.category || u.kategori || '\u2014') + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.origin || u.mensei || '\u2014') + '</div>'
      + '<div style="font-size:10px;font-family:monospace;color:var(--t3)">' + esc(u.gtip || '\u2014') + '</div>'
      + '<div style="display:flex;gap:3px"><button onclick="event.stopPropagation();openUrunModal(\'' + esc(uid) + '\')" class="btn btns" style="font-size:10px;padding:2px 6px">\u270f\ufe0f</button><button onclick="event.stopPropagation();window._deleteUrun?.(\'' + esc(uid) + '\')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">\ud83d\uddd1</button></div>'
    + '</div>';
  });
  cont.innerHTML = html;
}

/**
 * Tek urun soft delete.
 * @param {string|number} id Urun ID
 */
window._deleteUrun = function(id) {
  window.confirmModal?.('Bu urunu silmek istediginizden emin misiniz?', {
    title: 'Urun Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var data = loadUrunDB();
      var item = data.find(function(x) { return String(x.id) === String(id); });
      /* URUN-DELETE-FIX-001: sessiz başarısızlığı engelle — bulunamayan için else uyarı */
      if (item) {
        item.isDeleted = true;
        item.deletedAt = new Date().toISOString();
        item.deletedBy = window.Auth?.getCU?.()?.id || '';
        storeUrunDB(data);
        window.logActivity?.('urun_db', 'Urun silindi: ' + (item.duayName || item.duayCode || id));
        renderUrunDB();
        window.toast?.('Silindi', 'ok');
      } else {
        window.toast?.('Ürün bulunamadı', 'warn');
        renderUrunDB();
      }
    }
  });
};

/** Checkbox sayacini guncelle */
window._urunDBBulkCheck = function() {
  var n = document.querySelectorAll('.udb-bulk-chk:checked').length;
  var bar = document.getElementById('udb-bulk-bar');
  var cnt = document.getElementById('udb-bulk-cnt');
  if (bar) bar.style.display = n ? 'flex' : 'none';
  if (cnt) cnt.textContent = n;
};

/** Tumunu sec/kaldir */
window._urunDBTumunuSec = function() {
  var boxes = document.querySelectorAll('.udb-bulk-chk');
  var allChecked = Array.from(boxes).every(function(cb) { return cb.checked; });
  boxes.forEach(function(cb) { cb.checked = !allChecked; });
  window._urunDBBulkCheck();
};

/**
 * Toplu silme — secili urunleri soft delete yapar.
 */
window._urunDBTopluSil = function() {
  var checked = document.querySelectorAll('.udb-bulk-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return cb.dataset.id; });
  if (!ids.length) { window.toast?.('Urun secin', 'err'); return; }
  window.confirmModal?.(ids.length + ' urun silinecek?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var data = loadUrunDB();
      var now = new Date().toISOString();
      var cuId = window.Auth?.getCU?.()?.id || '';
      ids.forEach(function(id) {
        var item = data.find(function(x) { return String(x.id) === String(id); });
        if (item) {
          item.isDeleted = true;
          item.deletedAt = now;
          item.deletedBy = cuId;
        }
      });
      storeUrunDB(data);
      window.toast?.(ids.length + ' urun silindi', 'ok');
      window.logActivity?.('urun_db', 'Toplu silme: ' + ids.length + ' urun');
      renderUrunDB();
    }
  });
};

window._exportUrunXlsx = function() {
  var data = loadUrunDB();
  if (!data.length || typeof XLSX === 'undefined') { window.toast?.('Veri veya XLSX yok', 'err'); return; }
  var ws = XLSX.utils.json_to_sheet(data.map(function(u) { var o = Object.assign({}, u); delete o.image; delete o.changeLog; return o; }));
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Urunler');
  XLSX.writeFile(wb, 'UrunDB_' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

window._importUrunXlsx = function() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
  inp.onchange = function() {
    var file = inp.files[0]; if (!file || typeof XLSX === 'undefined') return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var wb = XLSX.read(e.target.result, { type: 'binary' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      var data = loadUrunDB(); var added = 0;
      rows.forEach(function(r) {
        if (!r.duayName && !r['Duay Ürün Adı']) return;
        data.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : (typeof window.generateId === 'function' ? window.generateId() : Date.now() + added),
          duayName: r.duayName || r['Duay Ürün Adı'] || '', duayCode: r.duayCode || r['Duay Kodu'] || _generateDuayCode(r.vendorName || '', r.vendorCode || ''),
          vendorName: r.vendorName || r['Satıcı'] || '', vendorCode: r.vendorCode || r['Satıcı Kodu'] || '',
          category: r.category || r['Kategori'] || '', origin: r.origin || r['Menşei'] || '',
          gtip: r.gtip || r['GTİP'] || '', unit: r.unit || 'Adet',
          createdAt: new Date().toISOString(), changeLog: [],
        }); added++;
      });
      storeUrunDB(data); renderUrunDB();
      window.toast?.('📥 ' + added + ' ürün içe aktarıldı', 'ok');
    };
    reader.readAsBinaryString(file);
  };
  inp.click();
};

// Exports
window.loadUrunDB    = loadUrunDB;
window.storeUrunDB   = storeUrunDB;
window.openUrunModal = openUrunModal;
window.renderUrunDB  = renderUrunDB;
