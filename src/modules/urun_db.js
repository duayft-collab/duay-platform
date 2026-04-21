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
  /* DRAFT-URUN-EKLE-001: taslak yükle, banner hazırla */
  var _udbDraft = null, _udbDraftBanner = '';
  try {
    _udbDraft = window.DraftManager && window.DraftManager.load('urun-ekle-batch');
    if (_udbDraft && _udbDraft.data && _udbDraft.data.urunler && _udbDraft.data.urunler.length) {
      _udbDraftBanner = window.DraftManager.bannerHtml('urun-ekle-batch') || '';
    }
  } catch(e) { console.warn('[DRAFT-URUN]', e && e.message); }
  var data = loadUrunDB();
  var u = id ? data.find(function(x) { return String(x.id) === String(id); }) : null;
  var esc = window._esc;

  // Cari listesi (satıcılar)
  /* CARI-BYPASS-FIX-003: izolasyon uygulansın, dropdown sadece kullanıcı carileri */
  var cariList = typeof loadCari === 'function' ? (loadCari()||[]).filter(function(c){return !c.isDeleted;}) : [];
  var cariOpts = '<option value="">— Satıcı Seçin —</option>' + cariList.map(function(c) { return '<option value="' + esc((c.ad || c.unvan || c.name || '')) + '"' + (u?.vendorName === (c.ad || c.unvan || c.name || '') ? ' selected' : '') + '>' + esc((c.ad || c.unvan || c.name || '')) + '</option>'; }).join('');
  var countryOpts = '<option value="">—</option>' + URUN_COUNTRIES.map(function(c) { return '<option value="' + c + '"' + (u?.origin === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');

  /* URUN-FORM-GORSEL-PERSIST-001: edit mode'da kaynak u objesi persist (save logic fallback) */
  if (u) {
    window._udbEditSource = window._udbEditSource || [];
    u._udbFormN = 1;
    window._udbEditSource = window._udbEditSource.filter(function(x){ return String(x._udbFormN) !== '1'; });
    window._udbEditSource.push(u);
  }

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-urun-db'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:1600px;width:96vw;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:13px;font-weight:700;color:var(--t)">' + 'Ürün Kataloğu — ' + (u ? '✏️ Düzenle' : 'Toplu Kayıt') + '</div>'
      + '<button onclick="document.getElementById(\'mo-urun-db\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px">'
      + _udbDraftBanner  /* DRAFT-URUN-EKLE-001 */
      // URUN-FORM-EXCEL-001: Excel tarzı çok satırlı tablo
      /* URUN-FORM-KART-LAYOUT-001-ADIM-A: table/thead/tbody → udb-kartlar container + udb-card (per-card table wrapper ADIM-B'ye kadar korunur) */
      + '<div id="udb-tablo-wrap" style="overflow-x:auto">'
        + '<div id="udb-kartlar">'
          + '<div class="udb-card" id="udb-row-1" style="border:0.5px solid var(--b,#e0e0e0);border-radius:12px;padding:18px;margin-bottom:14px;background:var(--sf,#fff)">' + _udbCardHTML(1, u) + '</div>'
        + '</div>'
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
  /* DRAFT-URUN-EKLE-001: banner callback + input listener */
  if (window.DraftManager) {
    window.DraftManager.attachBanner('urun-ekle-batch',
      function _onContinue(_d) {
        /* DRAFT-URUN-EKLE-001 PARÇA 2: restore */
        if (typeof window._udbDraftRestore === 'function') window._udbDraftRestore(_d);
      },
      function _onDiscard() {
        if (window.toast) window.toast('Taslak silindi', 'ok');
      }
    );
    /* Input listener — 2sn debounce ile save */
    mo.addEventListener('input', function(e) {
      if (!e.target || !e.target.id || e.target.id.indexOf('udb-') !== 0) return;
      try {
        var urunler = [];
        mo.querySelectorAll('.udb-card[id^="udb-row-"]').forEach(function(kart) {
          var n = kart.id.replace('udb-row-', '');
          urunler.push({
            n: n,
            duayName: (document.getElementById('udb-duayName-' + n) || {}).value || '',
            origName: (document.getElementById('udb-origName-' + n) || {}).value || '',
            vendor: (document.getElementById('udb-vendor-' + n) || {}).value || '',
            vendorCode: (document.getElementById('udb-vendorCode-' + n) || {}).value || '',
            category: (document.getElementById('udb-category-' + n) || {}).value || '',
            origin: (document.getElementById('udb-origin-' + n) || {}).value || '',
            unit: (document.getElementById('udb-unit-' + n) || {}).value || '',
            netW: (document.getElementById('udb-netW-' + n) || {}).value || '',
            grossW: (document.getElementById('udb-grossW-' + n) || {}).value || '',
            marka: (document.getElementById('udb-marka-' + n) || {}).value || '',
            raf: (document.getElementById('udb-raf-' + n) || {}).value || '',
            techDesc: (document.getElementById('udb-techDesc-' + n) || {}).value || '',
            sozlesme: (document.getElementById('udb-sozlesme-' + n) || {}).value || '',
            note: (document.getElementById('udb-note-' + n) || {}).value || '',
            hile: !!(document.getElementById('udb-hile-' + n) || {}).checked,
            hileNot: (document.getElementById('udb-hile-not-' + n) || {}).value || '',
            gizliKaynak: (document.getElementById('udb-gizliKaynak-' + n) || {}).value || '',
            uretimTarihi: (document.getElementById('udb-uretimTarihi-' + n) || {}).value || '',
            bakimYili: (document.getElementById('udb-bakimYili-' + n) || {}).value || ''
          });
        });
        /* En az 1 alan dolu mu kontrol et, boş form save etme */
        var _dolu = urunler.some(function(u){ return u.duayName || u.origName || u.vendor || u.category; });
        if (_dolu) window.DraftManager.save('urun-ekle-batch', { urunler: urunler });
      } catch(err) { console.warn('[DRAFT-URUN-EKLE]', err && err.message); }
    });
  }
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
    /* URUN-FORM-KART-LAYOUT-001-ADIM-A: tbody → udb-kartlar div wrapper */
    var kartlar = document.getElementById('udb-kartlar');
    if (!kartlar) return;
    var kart = document.createElement('div');
    kart.id = 'udb-row-' + n;
    kart.className = 'udb-card';
    /* URUN-FORM-KART-LAYOUT-001-ADIM-B: _udbSatirHTML → _udbCardHTML + kart padding */
    kart.style.cssText = 'border:0.5px solid var(--b,#e0e0e0);border-radius:12px;padding:18px;margin-bottom:14px;background:var(--sf,#fff)';
    kart.innerHTML = _udbCardHTML(n, null);
    kartlar.appendChild(kart);
  };

  window._udbSil = function(n) {
    var tr = document.getElementById('udb-row-' + n);
    if (tr) tr.remove();
    var detay = document.getElementById('udb-detay-' + n);
    if (detay) detay.remove();
  };

  /* URUN-FORM-KART-LAYOUT-001-ADIM-C: _udbDetay kaldırıldı — eski tr/insertAdjacentElement pattern ADIM-A sonrası çalışmıyordu; yeni _udbCardHTML'de detail bilgileri collapsible details olarak entegre */

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

  /* URUN-FORM-KART-LAYOUT-001-ADIM-B: _fld helper + _udbCardHTML kart template */
  function _fld(id, label, type, listId, required, placeholder, value, hint) {
    var esc = window._esc || function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var reqStar = required ? '<span style="color:#E0574F">*</span>' : '';
    var _titleAttr = hint ? ' title="' + esc(hint) + '"' : '';
    var lbl = '<label for="' + id + '"' + _titleAttr + ' style="display:block;font-size:10px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:5px;cursor:' + (hint ? 'help' : 'default') + '">' + esc(label) + ' ' + reqStar + (hint ? ' <span style="opacity:.5">ⓘ</span>' : '') + '</label>';
    var baseStyle = 'padding:8px 10px;border:0.5px solid var(--b,#e0e0e0);border-radius:8px;background:var(--sf,#fff);color:var(--t,#1c1c1e);font-size:12px;font-family:inherit;width:100%;box-sizing:border-box;outline:none;transition:border-color .12s';
    var focusHandlers = 'onfocus="this.style.borderColor=\'var(--ac,#007aff)\'" onblur="this.style.borderColor=\'var(--b,#e0e0e0)\'"';
    var v = esc(value || '');
    var ph = esc(placeholder || '');
    var input = '';
    if (type === 'textarea') {
      input = '<textarea id="' + id + '" placeholder="' + ph + '" style="' + baseStyle + ';min-height:68px;resize:vertical" ' + focusHandlers + '>' + v + '</textarea>';
    } else if (type === 'select-vendor') {
      var carilar = [];
      /* CARI-BYPASS-FIX-003 */ try { carilar = (typeof loadCari === 'function' ? loadCari() : []) || []; } catch(e) {}
      var opts = '<option value="">— Seçin —</option>' + carilar.map(function(c){ var nm = c.unvan||c.ad||c.name||''; var sel = (v === esc(nm)) ? ' selected' : ''; return '<option value="' + esc(nm) + '"' + sel + '>' + esc(nm) + '</option>'; }).join('');
      input = '<select id="' + id + '" style="' + baseStyle + '" ' + focusHandlers + '>' + opts + '</select>';
    } else if (type === 'select-country') {
      var countries = (typeof URUN_COUNTRIES !== 'undefined' ? URUN_COUNTRIES : (window.URUN_COUNTRIES || []));
      var opts = '<option value="">—</option>' + countries.map(function(c){ var sel = (v === esc(c)) ? ' selected' : ''; return '<option value="' + esc(c) + '"' + sel + '>' + esc(c) + '</option>'; }).join('');
      input = '<select id="' + id + '" style="' + baseStyle + '" ' + focusHandlers + '>' + opts + '</select>';
    } else if (type === 'select-unit') {
      var birimler = ['Adet','Kg','Gr','Ton','Metre','m²','m³','Litre','Paket','Koli','Kutu','Rulo','Set','Çift'];
      var opts = '<option value="">—</option>' + birimler.map(function(b){ var sel = (v === b) ? ' selected' : ''; return '<option value="' + b + '"' + sel + '>' + b + '</option>'; }).join('');
      input = '<select id="' + id + '" style="' + baseStyle + '" ' + focusHandlers + '>' + opts + '</select>';
    } else if (type === 'text-list') {
      input = '<input type="text" id="' + id + '" list="' + listId + '" value="' + v + '" placeholder="' + ph + '" style="' + baseStyle + '" ' + focusHandlers + '>';
    } else if (type === 'checkbox') {
      var checked = value ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--t2,#4a4a4a);cursor:pointer;padding:8px 0"><input type="checkbox" id="' + id + '"' + checked + ' style="width:14px;height:14px"> <span>' + esc(placeholder || label) + '</span></label>';
    } else {
      input = '<input type="' + type + '" id="' + id + '" value="' + v + '" placeholder="' + ph + '" style="' + baseStyle + '" ' + focusHandlers + '>';
    }
    return '<div>' + lbl + input + '</div>';
  }

  function _udbCardHTML(n, u) {
    u = u || {};
    var esc = window._esc || function(s){ return String(s == null ? '' : s); };
    /* Kategori datalist enjection (URUN-KATEGORI-BIRIM-COMBOBOX-001 ile uyumlu) */
    if (!document.getElementById('udb-kat-datalist')) {
      var _mevcut = (typeof loadUrunDB === 'function' ? loadUrunDB() : []) || [];
      var _defKat = ['Elektronik','Makine','Kimya','Tekstil','Gıda','Ambalaj','Kırtasiye','Mobilya','İnşaat','Yedek Parça','Diğer'];
      var _setKat = {}; _defKat.forEach(function(k){ _setKat[k]=true; }); _mevcut.forEach(function(x){ if(x && (x.category||x.kategori)) _setKat[x.category||x.kategori]=true; });
      var _dl = document.createElement('datalist'); _dl.id = 'udb-kat-datalist';
      _dl.innerHTML = Object.keys(_setKat).sort().map(function(k){ return '<option value="'+esc(k)+'">'; }).join('');
      document.body.appendChild(_dl);
    }
    /* URUN-FORM-EXCEL-001: details collapsible CSS bir kez enjekte */
    if (!document.getElementById('udb-excel-css')) {
      var _excelCss = document.createElement('style');
      _excelCss.id = 'udb-excel-css';
      _excelCss.textContent = 'details > summary::-webkit-details-marker{display:none}details > summary::marker{display:none}details[open] > summary{color:var(--ac);background:var(--sf2,rgba(0,0,0,0.02))}';
      document.head.appendChild(_excelCss);
    }
    var imgData = u.image || u.gorsel || '';
    var imgPreview = imgData
      ? '<img src="' + esc(imgData) + '" style="width:100%;height:100%;object-fit:cover" alt="">'
      : '<span style="font-size:11px;color:var(--t3,#8a8a8a);text-align:center;line-height:1.3">📷<br>Görsel<br>Ekle</span>';
    var mevcutKod = u.duayCode || u.duayKodu || '';
    var kodRozeti = mevcutKod
      ? '<span style="margin-left:10px;font-size:10px;padding:3px 8px;border-radius:6px;background:#E1F5EE;color:#1A8D6F;font-weight:600;letter-spacing:.03em">' + esc(mevcutKod) + '</span>'
      : '<span style="margin-left:10px;font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.04);color:var(--t3,#8a8a8a);font-weight:500">Kod otomatik</span>';
    /* URUN-FORM-KART-LAYOUT-001-ADIM-B: Kayıt zaman damgası */
    var zamanDamgasi;
    if (u.createdAt || u.updatedAt) {
      var _ts = u.updatedAt || u.createdAt;
      var _d = new Date(_ts);
      var _tsStr = isNaN(_d) ? String(_ts) : _d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
      var _edLbl = (u.updatedAt && u.createdAt && u.updatedAt !== u.createdAt) ? 'Son güncelleme' : 'Kayıt';
      zamanDamgasi = '<span style="margin-left:10px;font-size:10px;color:var(--t3,#8a8a8a)">⏱ ' + _edLbl + ': ' + esc(_tsStr) + '</span>';
    } else {
      zamanDamgasi = '<span style="margin-left:10px;font-size:10px;color:var(--t3,#8a8a8a)">⏱ Yeni — kaydedildiğinde oluşacak</span>';
    }
    return ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 12px 0;border-bottom:0.5px solid var(--b,#e0e0e0);margin-bottom:16px;flex-wrap:wrap;gap:6px">'
        + '<div style="display:flex;align-items:center;flex-wrap:wrap"><span style="font-size:13px;font-weight:600;color:var(--t,#1c1c1e)">📦 Ürün ' + n + '</span>' + kodRozeti + zamanDamgasi + '</div>'
        + '<button type="button" onclick="window._udbSil?.(' + n + ')" style="background:transparent;border:0.5px solid #E0574F;color:#E0574F;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit">× Kaldır</button>'
      + '</div>'
      /* URUN-FORM-BASIT-001 PARÇA A: BLOK 1 — 2 satır grid (Görsel 2-row span + 12 input), hidden inputs save logic intact */
      + '<div style="display:grid;grid-template-columns:120px repeat(7, minmax(0, 1fr));gap:10px;align-items:end">'
        + '<div style="grid-row:1/span 2">'
          + '<label style="display:block;font-size:10px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:5px">Görsel <span style="color:#E0574F">*</span></label>'
          + '<div id="udb-img-preview-' + n + '" onclick="document.getElementById(\'udb-img-' + n + '\').click()" style="width:120px;height:120px;border:0.5px dashed var(--b,#e0e0e0);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--t3,#8a8a8a);cursor:pointer;overflow:hidden;background:var(--s2,rgba(0,0,0,0.02));transition:border-color .12s" onmouseenter="this.style.borderColor=\'var(--ac,#007aff)\'" onmouseleave="this.style.borderColor=\'var(--b,#e0e0e0)\'">'
            + imgPreview
          + '</div>'
          + '<input type="file" id="udb-img-' + n + '" accept="image/*" style="display:none" onchange="window._udbGorselYukle?.(this, ' + n + ')">'
        + '</div>'
        /* Satır 1 — 7 input: TR + EN + Kategori + Tedarikçi + Tedarikçi Kodu + Menşei + Kod */
        + _fld('udb-duayName-' + n, 'Ürün Adı (TR)', 'text', '', true, 'örn: Mesh Ofis Koltuğu', u.duayName || u.urunAdi)
        + _fld('udb-origName-' + n, 'Ürün Adı (EN)', 'text', '', true, 'örn: Mesh Office Chair', u.origName || u.ingAd)
        + _fld('udb-category-' + n, 'Kategori', 'text-list', 'udb-kat-datalist', false, 'Mobilya, Ofis...', u.category || u.kategori)
        + _fld('udb-vendor-' + n, 'Tedarikçi', 'select-vendor', '', true, '', u.vendorName || u.tedarikci)
        + _fld('udb-vendorCode-' + n, 'Tedarikçi Kodu', 'text', '', true, 'örn: 3121312', u.vendorCode || u.saticiKodu)
        + _fld('udb-origin-' + n, 'Menşei', 'select-country', '', true, '', u.origin || u.mensei, 'Ürünün menşe ülkesi — nereden ithal edildiği (örn. Türkiye, Çin, Almanya)')
        + '<div><label style="display:block;font-size:10px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:5px">Kod</label><div style="height:32px;display:flex;align-items:center">' + kodRozeti + '</div></div>'
        /* Satır 2 — 5 input + 2 boş hücre: Birim + NetA + BrutA + Marka + Raf */
        + _fld('udb-unit-' + n, 'Birim', 'select-unit', '', true, '', u.unit || u.birim)
        + _fld('udb-netW-' + n, 'Net Ağırlık (kg)', 'number', '', false, 'örn: 2.5', u.netWeight || u.netAgirlik, 'Net ağırlık — ambalaj hariç sadece ürünün ağırlığı (kg)')
        + _fld('udb-grossW-' + n, 'Brüt Ağırlık (kg)', 'number', '', false, 'örn: 3.0', u.grossWeight || u.brutAgirlik, 'Brüt ağırlık — ambalaj dahil toplam ağırlık (kg) — kargo/navlun hesabı için')
        + _fld('udb-marka-' + n, 'Marka', 'text', '', false, 'örn: IKEA, Bosch', u.marka)
        + _fld('udb-raf-' + n, 'Raf Ömrü (gün)', 'number', '', false, 'örn: 365', u.shelfLife, 'Raf ömrü — ürünün üretim tarihinden itibaren kaç gün geçerli (bozulabilir ürünler için)')
        + '<div></div><div></div>'
      + '</div>'
      /* Hidden inputs — save logic intact (Teknik Açıklama + Ek Notlar modal'a taşınacak, PARÇA B-D'de) */
      + '<input type="hidden" id="udb-techDesc-' + n + '" value="' + esc(u.techDesc || u.teknikAciklama || '') + '">'
      + '<input type="hidden" id="udb-sozlesme-' + n + '" value="' + esc(u.sozlesmeNotu || '') + '">'
      + '<input type="hidden" id="udb-note-' + n + '" value="' + esc(u.note || '') + '">'
      + '<input type="checkbox" id="udb-hile-' + n + '" style="display:none"' + (u.gizliHile ? ' checked' : '') + '>'
      + '<input type="hidden" id="udb-hile-not-' + n + '" value="' + esc(u.gizliHileNot || '') + '">'
      + '<input type="hidden" id="udb-gizliKaynak-' + n + '" value="' + esc(u.gizliKaynak || '') + '">'
      /* URUN-FORM-BASIT-001 PARÇA E: Belgeler bloku */
      + '<div style="margin-top:12px;background:var(--sf2,rgba(0,0,0,0.02));border:0.5px solid var(--b,#e0e0e0);border-radius:8px;padding:12px">'
        + '<div style="font-size:10px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:8px">BELGELER</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px">'
          + '<div><label style="display:block;font-size:11px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Datasheet</label><input type="file" id="udb-datasheet-' + n + '" accept=".pdf" style="font-size:10px;width:100%"></div>'
          + '<div><label style="display:block;font-size:11px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Üretim Tarihi</label><input type="date" id="udb-uretimTarihi-' + n + '" value="' + esc(u.uretimTarihi || '') + '" class="fi" style="font-size:11px;width:100%"></div>'
          + '<div><label style="display:block;font-size:11px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Ürün Kataloğu</label><input type="file" id="udb-katalog-' + n + '" accept=".pdf,image/*" style="font-size:10px;width:100%"></div>'
          + '<div><label style="display:block;font-size:11px;color:var(--t3,#8a8a8a);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Bakım Yılı</label><input type="number" id="udb-bakimYili-' + n + '" value="' + esc(u.bakimYili || '') + '" placeholder="örn: 2024" class="fi" style="font-size:11px;width:100%"></div>'
        + '</div>'
        + '<button type="button" style="margin-top:10px;width:100%;padding:8px;border:0.5px dashed var(--b,#e0e0e0);border-radius:6px;background:transparent;color:var(--t3,#8a8a8a);font-size:11px;cursor:pointer;font-family:inherit">+ Diğer Teknik Dökümanlar Ekle</button>'
      + '</div>'
      /* URUN-FORM-BASIT-001 PARÇA E: TEK BUTON Notlar & Gizli Notlar (modal tetikleyici) */
      + (function(){
          var _doluMu = !!(u.techDesc || u.teknikAciklama || u.sozlesmeNotu || u.note || u.gizliHile || u.gizliHileNot || u.gizliKaynak);
          var _butonLabel = _doluMu ? '✓ Kayıtlı · Düzenle' : '▸ Doldur';
          var _butonBg = _doluMu ? '#0F6E56' : '#854F0B';
          return '<div style="margin-top:12px;border:0.5px solid #EF9F27;background:#FAEEDA;border-radius:8px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:10px">'
            + '<div>'
              + '<div style="font-size:12px;font-weight:500;color:#633806">📝 Notlar & Gizli Notlar</div>'
              + '<div style="font-size:10px;color:#854F0B;margin-top:2px">Teknik açıklama, sözleşme notu, özel not, gizli notlar</div>'
            + '</div>'
            + '<button type="button" class="udb-notlar-btn" onclick="window._udbNotlarModalAc && window._udbNotlarModalAc(' + n + ')" style="padding:8px 16px;border:none;border-radius:6px;background:' + _butonBg + ';color:#fff;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap">' + _butonLabel + '</button>'
          + '</div>';
        })();
  }

  /* URUN-FORM-KART-LAYOUT-001-ADIM-C: Eski _udbSatirHTML dead code silindi — _udbCardHTML tek aktif template */
}

/**
 * Ürün kaydet.
 */
window._saveUrunDB = function() {
  /* URUN-FORM-EXCEL-004: multi-row batch save
     Düzeltmeler: loadUrunDB/storeUrunDB (doğru store),
     Auth.getCU (dosya standardı), edit/duplicate scope dışı. */
  /* URUN-FORM-KART-LAYOUT-001-ADIM-A: #udb-tbody → #udb-kartlar, tr → .udb-card */
  var satirlar = document.querySelectorAll('#udb-kartlar > .udb-card[id^="udb-row-"]');
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
    /* URUN-FORM-2SATIR-001: teslim alanı kaldırıldı */
    var raf = document.getElementById('udb-raf-'+n)?.value||'';
    var netW = document.getElementById('udb-netW-'+n)?.value||'';
    var grossW = document.getElementById('udb-grossW-'+n)?.value||'';
    var note = (document.getElementById('udb-note-'+n)?.value||'').trim();
    var sozlesme = (document.getElementById('udb-sozlesme-'+n)?.value||'').trim();
    var marka = (document.getElementById('udb-marka-'+n)?.value||'').trim();
    /* URUN-FORM-2SATIR-001: uretimKontrol alanı kaldırıldı */
    var gizliHile = !!(document.getElementById('udb-hile-'+n)?.checked);
    var gizliHileNot = (document.getElementById('udb-hile-not-'+n)?.value||'').trim();
    /* URUN-FORM-BASIT-001 PARÇA B: yeni hidden input'ları oku */
    var gizliKaynak = (document.getElementById('udb-gizliKaynak-'+n)?.value||'').trim();
    var uretimTarihi = (document.getElementById('udb-uretimTarihi-'+n)?.value||'').trim();
    var bakimYili = (document.getElementById('udb-bakimYili-'+n)?.value||'').trim();
    /* URUN-FORM-GORSEL-PERSIST-001: Edit mode'da cache boşsa _udbEditSource'tan mevcut görseli koru */
    var _uSrc = null;
    if (window._udbEditSource && Array.isArray(window._udbEditSource)) {
      _uSrc = window._udbEditSource.find(function(x){ return String(x._udbFormN) === String(n); });
    }
    var image = window['_udbImg' + n] || (_uSrc && (_uSrc.image || _uSrc.gorsel)) || null;

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
      /* URUN-FORM-2SATIR-001: deliveryDays alanı kaldırıldı (edit mode'da eski değer Object.assign ile korunur) */
      shelfLife: raf ? Number(raf) : null,
      netWeight: netW ? Number(netW) : null,
      grossWeight: grossW ? Number(grossW) : null,
      note: note,
      sozlesmeNotu: sozlesme,
      marka: marka,
      /* URUN-FORM-2SATIR-001: uretimKontrol kaldırıldı (edit mode Object.assign ile korunur) */
      gizliHile: gizliHile,
      gizliHileNot: gizliHileNot,
      /* URUN-FORM-BASIT-001 PARÇA C: yeni alanlar */
      gizliKaynak: gizliKaynak,
      uretimTarihi: uretimTarihi || null,
      bakimYili: bakimYili ? Number(bakimYili) : null,
      /* URUN-LISTE-META-001: Kayıt sahibi + zaman damgası */
      createdById: (window.CU?.()?.id || null),
      createdByName: (window.CU?.()?.name || window.CU?.()?.displayName || '—'),
      updatedById: (window.CU?.()?.id || null),
      updatedByName: (window.CU?.()?.name || window.CU?.()?.displayName || '—'),
      image: image||null,
      _hasImage: !!image,
      _imageUploaded: image ? new Date().toISOString() : null,
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
        /* URUN-LISTE-META-001: createdById/createdByName preserve — edit'te sahibi değişmez */
        data[idx] = Object.assign(data[idx], k, {
          id: data[idx].id,
          createdAt: data[idx].createdAt,
          createdById: data[idx].createdById || k.createdById,
          createdByName: data[idx].createdByName || k.createdByName,
          duayCode: _koruDuayKodu || k.duayCode
        });
      }
      else { data.push(k); }
    } else {
      data.push(k);
    }
  });
  storeUrunDB(data);
  /* DRAFT-URUN-EKLE-001: başarılı kayıt sonrası taslağı temizle */
  try { if (window.DraftManager) { window.DraftManager.markSaving('urun-ekle-batch'); window.DraftManager.clear('urun-ekle-batch'); } } catch(e) {}

  Object.keys(window).filter(function(k){return k.startsWith('_udbImg');}).forEach(function(k){delete window[k];});
  /* URUN-FORM-GORSEL-PERSIST-001: edit source cache temizliği */
  window._udbEditSource = [];

  var mo = document.getElementById('mo-urun-db');
  if (mo) mo.remove();
  window.logActivity?.('urun_db', yeniKayitlar.length + ' ürün kaydedildi (+Yeni Ürün formu)');
  window.toast?.(yeniKayitlar.length + ' ürün kaydedildi', 'ok');
  /* URUN-LISTE-META-001: Save sonrası garanti render + arama filtresi reset */
  try {
    var _udbSearch = document.getElementById('udb-search');
    if (_udbSearch) _udbSearch.value = '';
    window._udbKatFilter = '';
    if (window.renderUrunDB) window.renderUrunDB();
  } catch(e) {}
};

/**
 * Ürün listesi render.
 */
/* URUN-LISTE-META-001: Relative time + tam tarih helper'ları */
function _udbRelativeTime(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return 'az önce';
    if (diff < 3600000) return Math.floor(diff/60000) + ' dk önce';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' saat önce';
    if (diff < 604800000) return Math.floor(diff/86400000) + ' gün önce';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  } catch(e) { return '—'; }
}
function _udbTamTarih(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    return d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch(e) { return ''; }
}

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
  /* URUN-LISTE-META-001: Yeni eklenen/güncellenen üstte (updatedAt DESC) */
  data.sort(function(a, b) {
    var at = new Date(a.updatedAt || a.createdAt || 0).getTime();
    var bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bt - at;
  });
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
    html += '<div style="display:grid;grid-template-columns:24px 24px 100px 120px 1fr 80px 80px 80px 90px;padding:6px 14px;border-bottom:0.5px solid var(--b);align-items:center;font-size:11.5px;line-height:1.3;min-height:32px;min-width:850px;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'rgba(0,0,0,0.02)\';var _a=this.querySelector(\'.udb-row-actions\');if(_a){_a.style.opacity=\'1\';_a.style.pointerEvents=\'auto\'}" onmouseleave="this.style.background=\'\';var _a=this.querySelector(\'.udb-row-actions\');if(_a){_a.style.opacity=\'0\';_a.style.pointerEvents=\'none\'}">'
      + '<div><input type="checkbox" class="udb-bulk-chk" data-id="' + esc(uid) + '" onclick="event.stopPropagation();window._urunDBBulkCheck()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac)"></div>'
      + '<div>' + ((u.image || u.gorsel) ? '<img src="' + (u.image || u.gorsel) + '" style="width:28px;height:28px;object-fit:cover;border-radius:4px">' : u._hasImage ? '<div style="width:28px;height:28px;background:var(--s2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px" title="Görsel yüklü (Firestore)">\ud83d\udcf7</div>' : '<div style="width:28px;height:28px;background:var(--s2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px">\ud83d\udce6</div>') + '</div>'
      + '<div style="font-family:monospace;font-weight:600;color:var(--ac)">' + esc(u.duayCode || u.duayKodu || '\u2014') + '</div>'
      + '<div style="font-family:monospace;color:var(--t3)">' + esc(u.vendorCode || u.saticiKodu || '\u2014') + '</div>'
      /* URUN-LISTE-META-FIX3-001: TESHIS-001 inline ellipsis ile meta kırpılıyordu — ayrı block-level alt satıra taşındı (clipping yok) */
      + '<div style="min-width:0">'
        + '<div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
          + esc(u.duayName || u.urunAdi || u.standartAdi || '\u2014')
          + ((function(){var t=u.createdAt||u.ts||u.yuklemeTarihi;if(!t)return '';var ms=new Date()-new Date(t);if(ms>=0&&ms<86400000)return ' <span style="font-size:11px;padding:1px 6px;border-radius:6px;background:#E6F1FB;color:#185FA5;font-weight:500;letter-spacing:.02em">Yeni</span>';return '';})())
          + ' · <span style="font-size:11px;color:var(--t3);font-weight:400">' + esc(u.vendorName || u.tedarikci || '') + '</span>'
        + '</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400">'
          + '<span title="' + esc(_udbTamTarih(u.updatedAt || u.createdAt)) + '">' + _udbRelativeTime(u.updatedAt || u.createdAt) + '</span>'
          + ' · <span>' + esc(u.updatedByName || u.createdByName || '—') + '</span>'
        + '</div>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.category || u.kategori || '\u2014') + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + esc(u.origin || u.mensei || '\u2014') + '</div>'
      + '<div style="font-size:10px;font-family:monospace;color:var(--t3)">' + esc(u.gtip || '\u2014') + '</div>'
      /* URUN-LISTE-QUICKACT-001: Apple Mail tarzı contextual actions (hover reveal) */
      + '<div class="udb-row-actions" style="display:flex;gap:3px;opacity:0;pointer-events:none;transition:opacity .15s">'
        + '<button onclick="event.stopPropagation();window._udbPeek?.(\'' + esc(uid) + '\')" title="Önizle" class="btn btns" style="font-size:10px;padding:2px 6px;color:var(--t2)">\ud83d\udc41</button>'
        + '<button onclick="event.stopPropagation();window._udbKopyala?.(\'' + esc(uid) + '\')" title="Kopyala" class="btn btns" style="font-size:10px;padding:2px 6px;color:var(--t2)">\ud83d\udccb</button>'
        + '<button onclick="event.stopPropagation();openUrunModal(\'' + esc(uid) + '\')" title="Düzenle" class="btn btns" style="font-size:10px;padding:2px 6px">\u270f\ufe0f</button>'
        + '<button onclick="event.stopPropagation();window._deleteUrun?.(\'' + esc(uid) + '\')" title="Sil" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">\ud83d\uddd1</button>'
      + '</div>'
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

/* URUN-LISTE-QUICKACT-001: Peek — küçük toast ile ürün önizleme */
window._udbPeek = function(id) {
  var u = (loadUrunDB() || []).find(function(x){ return String(x.id) === String(id); });
  if (!u) { window.toast?.('Ürün bulunamadı','err'); return; }
  var nm = u.duayName || u.urunAdi || '—';
  var cat = u.category || u.kategori || '—';
  var ted = u.vendorName || u.tedarikci || '—';
  var kod = u.duayCode || u.duayKodu || '—';
  window.toast?.('📦 ' + nm + ' · ' + cat + ' · ' + ted + ' · Kod: ' + kod, 'info', 4000);
};

/* URUN-LISTE-QUICKACT-001: Kopyala — ürünü duplicate kaydet */
window._udbKopyala = function(id) {
  var data = loadUrunDB() || [];
  var u = data.find(function(x){ return String(x.id) === String(id); });
  if (!u) { window.toast?.('Ürün bulunamadı','err'); return; }
  if (!confirm('Bu ürünü kopyalamak istediğinize emin misiniz?\n\n"' + (u.duayName || u.urunAdi || '—') + '" yeni bir kayıt olarak eklenecek.')) return;
  var kopya = Object.assign({}, u, {
    id: (typeof _genDuayKodu === 'function' ? 'DY-' + Date.now().toString(36) : Date.now()),
    duayCode: (typeof _genDuayKodu === 'function' ? _genDuayKodu(data.map(function(d){ return d.duayCode || d.duayKodu; })) : null),
    duayKodu: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    yukleyen_id: window.Auth?.getCU?.()?.id || null
  });
  delete kopya.deletedAt;
  kopya.isDeleted = false;
  data.push(kopya);
  storeUrunDB(data);
  window.toast?.('✓ Ürün kopyalandı','success');
  if (typeof renderUrunDB === 'function') renderUrunDB();
};

/* URUN-FORM-KART-LAYOUT-001-ADIM-B: Görsel yükleme + preview (Canvas compress URUN-GORSEL-COMPRESS-001 ile uyumlu) */
if (typeof window._udbGorselYukle !== 'function') {
  window._udbGorselYukle = function(input, n) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { window.toast?.('Görsel max 5MB olabilir', 'err'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
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
        window['_udbImg' + n] = compressed;
        var preview = document.getElementById('udb-img-preview-' + n);
        if (preview) preview.innerHTML = '<img src="' + compressed + '" style="width:100%;height:100%;object-fit:cover" alt="">';
      };
      img.onerror = function() {
        window['_udbImg' + n] = ev.target.result;
        var preview = document.getElementById('udb-img-preview-' + n);
        if (preview) preview.innerHTML = '<img src="' + ev.target.result + '" style="width:100%;height:100%;object-fit:cover" alt="">';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
}

/* URUN-FORM-BASIT-001 PARÇA D: Notlar & Gizli Notlar tek sayfa modal */
window._udbNotlarModalAc = function(urunIdx) {
  var mevcut = document.getElementById('udb-notlar-modal');
  if (mevcut) mevcut.remove();
  var esc = window._esc || function(s){return String(s==null?'':s);};

  var teknikAcik = (document.getElementById('udb-techDesc-' + urunIdx) || {}).value || '';
  var sozlesme = (document.getElementById('udb-sozlesme-' + urunIdx) || {}).value || '';
  var ozelNot = (document.getElementById('udb-note-' + urunIdx) || {}).value || '';
  var hileCb = document.getElementById('udb-hile-' + urunIdx);
  var gizliVar = hileCb ? hileCb.checked : false;
  var gizliNot = (document.getElementById('udb-hile-not-' + urunIdx) || {}).value || '';
  var gizliKaynak = (document.getElementById('udb-gizliKaynak-' + urunIdx) || {}).value || '';

  var mo = document.createElement('div');
  mo.id = 'udb-notlar-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto';
  mo.addEventListener('click', function(e){ if (e.target === mo) mo.remove(); });

  var h = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:760px;max-width:100%;overflow:hidden" onclick="event.stopPropagation()">'
    + '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div><div style="font-size:14px;font-weight:500;color:var(--t)">\u{1F4DD} Notlar & Gizli Notlar</div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:2px">T\u00fcm alanlar\u0131 tek sayfada doldur, Kaydet bas, kapat</div></div>'
      + '<button onclick="document.getElementById(\'udb-notlar-modal\').remove()" style="background:none;border:none;cursor:pointer;font-size:22px;color:var(--t3)">\u00d7</button>'
    + '</div>'
    + '<div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + '<div><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">TEKN\u0130K A\u00c7IKLAMA</div>'
      + '<textarea id="unm-teknik" rows="5" class="fi" style="width:100%;resize:vertical">' + esc(teknikAcik) + '</textarea></div>'
      + '<div><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">S\u00d6ZLE\u015eME NOTU</div>'
      + '<textarea id="unm-sozlesme" rows="5" class="fi" placeholder="Proformaya eklenecek \u00f6zel madde..." style="width:100%;resize:vertical">' + esc(sozlesme) + '</textarea></div>'
      + '<div style="grid-column:span 2"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">\u00d6ZEL NOT</div>'
      + '<textarea id="unm-ozel" rows="3" class="fi" placeholder="\u0130\u00e7 not \u2014 al\u0131m karar\u0131na dair..." style="width:100%;resize:vertical">' + esc(ozelNot) + '</textarea></div>'
    + '</div>'
    + '<div style="border-top:0.5px solid var(--b);padding:16px 20px;background:#FAEEDA">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px">'
        + '<input type="checkbox" id="unm-gizli-check" ' + (gizliVar ? 'checked' : '') + ' onchange="document.getElementById(\'unm-gizli-box\').style.display=this.checked?\'block\':\'none\'">'
        + '<span style="font-size:12px;font-weight:500;color:#854F0B">\u{1F512} Gizli Notlar / Maliyet Fark\u0131 var</span>'
        + '<a href="https://duayft-collab.github.io/duay-platform/docs/SAHB-0200-380.pdf" target="_blank" style="font-size:10px;color:#854F0B;margin-left:auto;text-decoration:underline" onclick="event.stopPropagation()">SAHB-0200-380 referans</a>'
      + '</label>'
      + '<div id="unm-gizli-box" style="display:' + (gizliVar ? 'block' : 'none') + '">'
        + '<div style="font-size:10px;color:#854F0B;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">G\u0130ZL\u0130 H\u0130LE NOTU (sadece y\u00f6neticiler g\u00f6r\u00fcr)</div>'
        + '<textarea id="unm-gizli-not" rows="4" class="fi" placeholder="Tedarik\u00e7i yan\u0131tlar\u0131ndan \u00e7\u0131kan gizli \u00f6zellik / hile / maliyet fark\u0131..." style="width:100%;resize:vertical;margin-bottom:10px">' + esc(gizliNot) + '</textarea>'
        + '<div style="font-size:10px;color:#854F0B;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">KAYNAK \u2014 F\u0130RMA / K\u0130\u015e\u0130 / TELEFON</div>'
        + '<input id="unm-gizli-kaynak" class="fi" placeholder="\u00f6rn: Do\u011fan A\u015f / Ahmet Bey / 0532..." value="' + esc(gizliKaynak) + '" style="width:100%">'
      + '</div>'
    + '</div>'
    + '<div style="padding:14px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;gap:8px">'
      + '<button onclick="document.getElementById(\'udb-notlar-modal\').remove()" class="btn btns" style="font-size:12px">\u0130ptal</button>'
      + '<button onclick="window._udbNotlarKaydet(' + urunIdx + ')" class="btn btnp" style="font-size:12px">Kaydet & Kapat</button>'
    + '</div>'
  + '</div>';

  mo.innerHTML = h;
  document.body.appendChild(mo);
};

window._udbNotlarKaydet = function(urunIdx) {
  var teknikAcik = (document.getElementById('unm-teknik') || {}).value || '';
  var sozlesme = (document.getElementById('unm-sozlesme') || {}).value || '';
  var ozel = (document.getElementById('unm-ozel') || {}).value || '';
  var gizliVar = (document.getElementById('unm-gizli-check') || {}).checked || false;
  var gizliNot = (document.getElementById('unm-gizli-not') || {}).value || '';
  var gizliKaynak = (document.getElementById('unm-gizli-kaynak') || {}).value || '';

  var setVal = function(id, v) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  };
  setVal('udb-techDesc-' + urunIdx, teknikAcik);
  setVal('udb-sozlesme-' + urunIdx, sozlesme);
  setVal('udb-note-' + urunIdx, ozel);
  setVal('udb-hile-' + urunIdx, gizliVar);
  setVal('udb-hile-not-' + urunIdx, gizliNot);
  setVal('udb-gizliKaynak-' + urunIdx, gizliKaynak);

  var btn = document.querySelector('[data-udb-idx="' + urunIdx + '"] .udb-notlar-btn, #udb-row-' + urunIdx + ' .udb-notlar-btn');
  if (btn) {
    var dolu = !!(teknikAcik || sozlesme || ozel || gizliVar || gizliKaynak);
    btn.innerHTML = dolu ? '\u2713 Kay\u0131tl\u0131 \u00b7 D\u00fczenle' : '\u25b8 Doldur';
    btn.style.background = dolu ? '#0F6E56' : '#854F0B';
  }
  var modal = document.getElementById('udb-notlar-modal');
  if (modal) modal.remove();
  if (window.toast) window.toast('Notlar kaydedildi', 'ok');
};

/* DRAFT-URUN-EKLE-001 PARÇA 2: Taslaktan forma restore */
window._udbDraftRestore = function(draftData) {
  if (!draftData || !draftData.urunler || draftData.urunler.length === 0) {
    if (window.toast) window.toast('Taslak boş', 'warn');
    return;
  }
  var mevcut = document.querySelectorAll('[id^="udb-duayName-"]').length;
  var eksik = draftData.urunler.length - mevcut;
  for (var i = 0; i < eksik; i++) {
    if (typeof window._udbSatirEkle === 'function') window._udbSatirEkle();
  }
  setTimeout(function(){
    draftData.urunler.forEach(function(urun, idx){
      var n = idx + 1;
      var map = {
        duayName: urun.duayName,
        origName: urun.origName,
        category: urun.category,
        vendor: urun.vendor,
        vendorCode: urun.vendorCode,
        origin: urun.origin,
        unit: urun.unit,
        netW: urun.netW,
        grossW: urun.grossW,
        marka: urun.marka,
        raf: urun.raf,
        uretimTarihi: urun.uretimTarihi,
        bakimYili: urun.bakimYili,
        techDesc: urun.techDesc,
        sozlesme: urun.sozlesme,
        note: urun.note,
        'hile-not': urun.hileNot,
        gizliKaynak: urun.gizliKaynak
      };
      Object.keys(map).forEach(function(field){
        var el = document.getElementById('udb-' + field + '-' + n);
        if (el && map[field] !== undefined && map[field] !== null && map[field] !== '') {
          el.value = map[field];
        }
      });
      /* gizli hile checkbox — ayrı */
      var hileEl = document.getElementById('udb-hile-' + n);
      if (hileEl) hileEl.checked = !!urun.hile;
      /* Notlar butonunun rozet durumu güncelle */
      var kart = document.getElementById('udb-row-' + n);
      if (kart) {
        var btn = kart.querySelector('.udb-notlar-btn');
        if (btn) {
          var dolu = !!(urun.techDesc || urun.sozlesme || urun.note || urun.hile || urun.gizliKaynak);
          btn.innerHTML = dolu ? '✓ Kayıtlı · Düzenle' : '▸ Doldur';
          btn.style.background = dolu ? '#0F6E56' : '#854F0B';
        }
      }
    });
    if (window.toast) window.toast(draftData.urunler.length + ' ürün geri yüklendi', 'ok');
  }, 100);
};

// Exports
window.loadUrunDB    = loadUrunDB;
window.storeUrunDB   = storeUrunDB;
window.openUrunModal = openUrunModal;
window.renderUrunDB  = renderUrunDB;
