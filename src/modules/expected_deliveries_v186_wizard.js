/* ════════════════════════════════════════════════════════════════
 * V186 — TEK 4-ETAPLI PROFESYONEL WIZARD
 * ════════════════════════════════════════════════════════════════
 * V184f cycle'ı: 3 wizard → 1 wizard birleştirme.
 * Eski wizard'lar (_edWizardAc, _edEditModal, _edAtaModal) KORUNUR
 * — yeni wizard feature flag ile aktive olur:
 *   window.USE_V186_WIZARD = true → yeni
 *   default false                  → eski (rollback için)
 *
 * Bu dosya V186a (İSKELET): nav + state + step başlıkları boş içerik.
 * V186b: Step 1 + 2 alanları
 * V186c: Step 3 (RBAC) + Step 4 (özet)
 * V186d: Validation + Save
 * V186e: Feature flag default true + eski wizard pasifleştirme
 * ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var LOG_PREFIX = '[V186-WIZARD]';

  /* ─── State ─── */
  var state = {
    mode: null,         // 'create' | 'edit'
    edId: null,         // edit mode → kayıt id
    currentStep: 1,     // 1..4
    formData: {},       // birleşik alanlar
  };

  /* ─── Step tanımları ─── */
  var STEPS = [
    { n: 1, title: 'Temel Bilgiler',          icon: '📦' },
    { n: 2, title: 'Rota & Lojistik',         icon: '🚛' },
    { n: 3, title: 'İhracat & Sorumluluk',    icon: '🌐' },
    { n: 4, title: 'Belge & Özet',            icon: '📄' },
  ];

  /* ─── RBAC helper'ları ─── */
  function _cu() { return (typeof window.CU === 'function') ? window.CU() : (window.CU || null); }
  function _role() { var c = _cu(); return c ? (c.role || c.rol) : ''; }
  function isAdminOrManager() { var r = _role(); return r === 'admin' || r === 'manager' || r === 'super_admin'; }
  function isAsistan()         { return _role() === 'asistan'; }
  function isPrivileged()      { return isAdminOrManager() || isAsistan(); }

  /* ─── HTML helper ─── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ─── Step navigation HTML — dot + line ─── */
  function navHtml() {
    var html = '<div style="padding:18px 24px;background:var(--s2,#F5F5F7);border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:0;justify-content:center">';
    STEPS.forEach(function (s, i) {
      var active   = s.n === state.currentStep;
      var done     = s.n < state.currentStep;
      var bg       = active ? '#185FA5' : (done ? '#16A34A' : 'var(--s3,#E5E5EA)');
      var color    = (active || done) ? '#fff' : 'var(--t3,#9CA3AF)';
      var txtColor = active ? 'var(--t)' : (done ? 'var(--t2)' : 'var(--t3)');
      var weight   = active ? '600' : '500';
      html += '<div style="display:flex;flex-direction:column;align-items:center;flex:0 0 auto">'
        +   '<div style="width:32px;height:32px;border-radius:50%;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;transition:.2s">'
        +     (done ? '✓' : s.n)
        +   '</div>'
        +   '<div style="font-size:10px;font-weight:' + weight + ';color:' + txtColor + ';margin-top:6px;white-space:nowrap">' + s.icon + ' ' + s.title + '</div>'
        + '</div>';
      if (i < STEPS.length - 1) {
        var lineCol = done ? '#16A34A' : 'var(--s3,#E5E5EA)';
        html += '<div style="flex:1;height:2px;background:' + lineCol + ';margin:0 12px;margin-bottom:24px;max-width:80px"></div>';
      }
    });
    html += '</div>';
    return html;
  }

  /* ─── Form alanı style + label helper'ları ─── */
  var INPUT_CSS = 'width:100%;padding:8px 10px;border:0.5px solid var(--b,#D1D5DB);border-radius:7px;font-size:12px;background:var(--sf,#fff);color:var(--t);font-family:inherit;box-sizing:border-box';
  function lbl(text) {
    return '<div style="font-size:10px;font-weight:600;color:var(--t2,#4B5563);margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em">' + text + '</div>';
  }
  function _val(v) { return v == null ? '' : esc(v); }

  /* ─── State setter (form alanı binding'i) ─── */
  window._v186SetField = function (key, value) { state.formData[key] = value; };

  /* ─── Bölüm başlığı ─── */
  function sect(icon, title, hint) {
    return '<div style="grid-column:span 2;margin-top:6px;padding-top:10px;border-top:0.5px solid var(--b,#E5E5EA)">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t,#111);letter-spacing:.02em">' + icon + ' ' + title + '</div>'
      + (hint ? '<div style="font-size:10px;color:var(--t3,#9CA3AF);margin-top:2px">' + hint + '</div>' : '')
      + '</div>';
  }

  /* ─── Step body — ŞİMDİLİK PLACEHOLDER (V186b/c'de doldurulacak) ─── */
  function renderStep1() {
    var d = state.formData;
    var unitOpts = ['adet', 'kg', 'palet', 'ton', 'm³', 'lt', 'kutu'];
    var supplierOpts = (typeof window._edSupplierOpts === 'function') ? window._edSupplierOpts(d.supplierId) : '<option value="">— Tedarikçi —</option>';
    return '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + '<div style="grid-column:span 2">' + lbl('Ürün Adı *')
        + '<input type="text" oninput="window._v186SetField(\'productName\', this.value)" value="' + _val(d.productName) + '" style="' + INPUT_CSS + '" placeholder="Ürün adı...">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl('Tedarikçi *')
        + '<select onchange="window._v186SetField(\'supplierId\', this.value); window._edRotaPrefill && window._edRotaPrefill(this.value)" style="' + INPUT_CSS + '">' + supplierOpts + '</select>'
      + '</div>'
      + '<div>' + lbl('Miktar *')
        + '<input type="number" min="1" step="1" oninput="window._v186SetField(\'quantityTotal\', this.value)" value="' + _val(d.quantityTotal) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums;text-align:right">'
      + '</div>'
      + '<div>' + lbl('Birim')
        + '<select onchange="window._v186SetField(\'unit\', this.value)" style="' + INPUT_CSS + '">'
        + unitOpts.map(function (u) { return '<option value="' + u + '"' + (d.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div>' + lbl('Ağırlık (kg)')
        + '<input type="number" min="0" step="0.1" oninput="window._v186SetField(\'weightKg\', this.value)" value="' + _val(d.weightKg) + '" placeholder="örn: 2450" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl('Hacim (m³)')
        + '<input type="number" min="0" step="0.1" oninput="window._v186SetField(\'volumeM3\', this.value)" value="' + _val(d.volumeM3) + '" placeholder="örn: 12.5" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl('Proforma Tarihi')
        + '<input type="date" oninput="window._v186SetField(\'proformaDate\', this.value)" value="' + _val(d.proformaDate) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl('Tahmini Teslim *')
        + '<input type="date" oninput="window._v186SetField(\'estimatedDeliveryDate\', this.value)" value="' + _val(d.estimatedDeliveryDate) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl('Termin (gün)')
        + '<input type="number" min="1" oninput="window._v186SetField(\'deliveryTermDays\', this.value)" value="' + _val(d.deliveryTermDays) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl('Tolerans (gün)')
        + '<input type="number" min="0" oninput="window._v186SetField(\'toleranceDays\', this.value)" value="' + _val(d.toleranceDays) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '</div>';
  }
  function renderStep2() {
    var d = state.formData;
    var yonOpts = [['GIDEN', '📤 Giden'], ['GELEN', '📥 Gelen']];
    var teslimOpts = [['', '— Belirtilmedi —'], ['SATICI_TESLIM', '📦 Satıcı teslim eder'], ['FIRMA_ALIR', '🏭 Firma alır']];
    var paketOpts = [['', '— Seç —'], ['palet', 'Palet'], ['koli', 'Koli'], ['big-bag', 'Big Bag'], ['kafes', 'Kafes/Kasa'], ['cuval', 'Çuval'], ['dokme', 'Dökme'], ['diger', 'Diğer']];
    var armatorList = ['', 'MSC', 'Maersk', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'Yang Ming', 'HMM', 'ZIM', 'PIL', 'OOCL', 'Diger'];
    return '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + '<div style="grid-column:span 2">' + lbl('Yön')
        + '<select onchange="window._v186SetField(\'yon\', this.value)" style="' + INPUT_CSS + '">'
        + yonOpts.map(function (y) { return '<option value="' + y[0] + '"' + ((d.yon || 'GIDEN') === y[0] ? ' selected' : '') + '>' + y[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + sect('📤', 'Çıkış Lokasyonu', 'Türkiye içi')
      + '<div>' + lbl('Çıkış Şehir *')
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'originCity\', this.value)" value="' + _val(d.originCity) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl('Çıkış Bölge *')
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'originDistrict\', this.value)" value="' + _val(d.originDistrict) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('🎯', 'Varış Lokasyonu', 'Türkiye içi')
      + '<div>' + lbl('Varış Şehir *')
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'destinationCity\', this.value)" value="' + _val(d.destinationCity) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl('Varış Bölge *')
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'destinationDistrict\', this.value)" value="' + _val(d.destinationDistrict) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('🚛', 'Yükleme & Teslim')
      + '<div style="grid-column:span 2">' + lbl('Yükleme Firma')
        + '<input type="text" oninput="window._v186SetField(\'yuklemeFirmaAd\', this.value)" value="' + _val(d.yuklemeFirmaAd) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl('Teslim Tipi')
        + '<select onchange="window._v186SetField(\'teslimTipi\', this.value)" style="' + INPUT_CSS + '">'
        + teslimOpts.map(function (t) { return '<option value="' + t[0] + '"' + ((d.teslimTipi || '') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + sect('📦', 'Paket Bilgisi')
      + '<div>' + lbl('Paket Türü')
        + '<select onchange="window._v186SetField(\'paketTuru\', this.value)" style="' + INPUT_CSS + '">'
        + paketOpts.map(function (p) { return '<option value="' + p[0] + '"' + ((d.paketTuru || '') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div>' + lbl('Paket Adedi')
        + '<input type="number" min="0" oninput="window._v186SetField(\'paketAdedi\', this.value)" value="' + _val(d.paketAdedi) + '" placeholder="örn: 24" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl('Paket Ebatları')
        + '<input type="text" oninput="window._v186SetField(\'paketEbatlari\', this.value)" value="' + _val(d.paketEbatlari) + '" placeholder="örn: 120×80×100 cm" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('🚢', 'Sevkiyat & Takip')
      + '<div>' + lbl('Konteyner No')
        + '<input type="text" oninput="window._v186SetField(\'konteynerNo\', this.value)" value="' + _val(d.konteynerNo) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl('Armatör')
        + '<select onchange="window._v186SetField(\'armator\', this.value)" style="' + INPUT_CSS + '">'
        + armatorList.map(function (c) { return '<option value="' + c + '"' + ((d.armator || '') === c ? ' selected' : '') + '>' + (c || '— Seçin —') + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl('Tracking URL')
        + '<input type="url" oninput="window._v186SetField(\'trackingUrl\', this.value)" value="' + _val(d.trackingUrl) + '" placeholder="https://..." style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl('Varış Zamanı')
        + '<input type="datetime-local" oninput="window._v186SetField(\'varisZamani\', this.value)" value="' + _val(d.varisZamani) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '</div>';
  }
  function renderStep3() {
    return '<div style="padding:60px 20px;text-align:center;color:var(--t3)">'
      + '<div style="font-size:48px;margin-bottom:12px">🌐</div>'
      + '<div style="font-size:14px;font-weight:500;color:var(--t2);margin-bottom:6px">Step 3 — İhracat & Sorumluluk</div>'
      + '<div style="font-size:11px;color:var(--t3)">' + (isAdminOrManager() ? '✓ Yetkin var' : (isAsistan() ? '⚠ Asistan: kısıtlı (İhracat ID/Sipariş/Renk hariç)' : '🔒 Sadece görüntüleme')) + '</div>'
      + '<div style="font-size:12px;color:var(--t3);font-style:italic;margin-top:6px">İskelet — V186c cycle\'ında alanlar eklenecek</div>'
      + '</div>';
  }
  function renderStep4() {
    return '<div style="padding:60px 20px;text-align:center;color:var(--t3)">'
      + '<div style="font-size:48px;margin-bottom:12px">📄</div>'
      + '<div style="font-size:14px;font-weight:500;color:var(--t2);margin-bottom:6px">Step 4 — Belge & Özet</div>'
      + '<div style="font-size:12px;color:var(--t3);font-style:italic">İskelet — V186c cycle\'ında alanlar eklenecek</div>'
      + '</div>';
  }
  function renderBody() {
    switch (state.currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return '';
    }
  }

  /* ─── Footer (Önceki / Sonraki / Kaydet) ─── */
  function footerHtml() {
    var isFirst = state.currentStep === 1;
    var isLast  = state.currentStep === 4;
    var prevBtn = isFirst
      ? '<button onclick="window._v186WizardClose()" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;color:var(--t2);font-family:inherit">İptal</button>'
      : '<button onclick="window._v186WizardPrev()" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;color:var(--t);font-family:inherit">◀ Önceki</button>';
    var nextBtn = isLast
      ? '<button onclick="window._v186WizardSave()" style="padding:8px 22px;border:none;border-radius:8px;background:#16A34A;color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">✓ Kaydet</button>'
      : '<button onclick="window._v186WizardNext()" style="padding:8px 22px;border:none;border-radius:8px;background:#185FA5;color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">Sonraki ▶</button>';
    return '<div style="padding:14px 24px;border-top:0.5px solid var(--b);background:var(--s2,#F5F5F7);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:11px;color:var(--t3)">Step ' + state.currentStep + ' / 4</div>'
      + '<div style="display:flex;gap:8px">' + prevBtn + nextBtn + '</div>'
      + '</div>';
  }

  /* ─── Render bütünü ─── */
  function render() {
    var ex = document.getElementById('v186-wizard-modal');
    if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'v186-wizard-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:inherit';
    mo.onclick = function (e) { if (e.target === mo) close(); };
    var modeTitle = state.mode === 'create' ? '➕ Yeni Teslimat' : '✏ Teslimatı Düzenle';
    var devBadge  = '<span style="background:#FEF3C7;color:#92400E;font-size:9px;padding:2px 6px;border-radius:6px;margin-left:8px;font-weight:600">V186 BETA</span>';
    mo.innerHTML = '<div style="background:var(--sf,#fff);width:720px;max-width:94vw;max-height:90vh;border-radius:14px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden" onclick="event.stopPropagation()">'
      + '<div style="padding:16px 24px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
        + '<div style="font-size:15px;font-weight:600;color:var(--t)">' + modeTitle + devBadge + '</div>'
        + '<button onclick="window._v186WizardClose()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--t3);line-height:1;padding:0 4px">×</button>'
      + '</div>'
      + navHtml()
      + '<div style="flex:1;overflow-y:auto;min-height:280px">' + renderBody() + '</div>'
      + footerHtml()
    + '</div>';
    document.body.appendChild(mo);
  }

  /* ─── Public API ─── */
  function open(mode, edId) {
    if (!window.USE_V186_WIZARD) {
      console.log(LOG_PREFIX, 'feature flag kapalı, eski wizard\'a yönlendiriliyor');
      if (mode === 'create' && typeof window._edWizardAc === 'function') return window._edWizardAc();
      if (mode === 'edit'   && typeof window._edEditModal === 'function') return window._edEditModal(edId);
      return;
    }
    state.mode = (mode === 'edit') ? 'edit' : 'create';
    state.edId = edId || null;
    state.currentStep = 1;
    state.formData = {};

    /* Edit mode — kayıt yükle */
    if (state.mode === 'edit' && edId) {
      var list = (typeof window.loadExpectedDeliveries === 'function')
        ? (window.loadExpectedDeliveries({ raw: true }) || []) : [];
      var ed = list.find(function (x) { return String(x.id) === String(edId); });
      if (!ed) {
        if (typeof window.toast === 'function') {
          window.toast(typeof window.t === 'function' ? window.t('ed.toast.notFound') : 'Kayıt bulunamadı', 'err');
        }
        return;
      }
      state.formData = Object.assign({}, ed);
    }
    render();
  }
  function next()  { if (state.currentStep < 4) { state.currentStep++; render(); } }
  function prev()  { if (state.currentStep > 1) { state.currentStep--; render(); } }
  function close() { document.getElementById('v186-wizard-modal')?.remove(); state.mode = null; state.edId = null; state.currentStep = 1; state.formData = {}; }
  function save()  {
    /* V186d cycle'ında doldurulacak */
    if (typeof window.toast === 'function') window.toast('Kaydet — V186d cycle\'ında uygulanacak', 'warn');
    console.log(LOG_PREFIX, 'save() çağrıldı, formData:', state.formData);
  }

  /* Global export */
  window._v186WizardOpen  = open;
  window._v186WizardNext  = next;
  window._v186WizardPrev  = prev;
  window._v186WizardClose = close;
  window._v186WizardSave  = save;

  /* Konsol bilgisi */
  console.log(LOG_PREFIX, 'V186a iskeleti yüklendi. Test:');
  console.log(LOG_PREFIX, '  window.USE_V186_WIZARD = true');
  console.log(LOG_PREFIX, '  window._v186WizardOpen("create")');

})();
