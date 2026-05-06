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

  /* ────────────────────────────────────────────────────────────────
   * V187c — handlingFlags ENUM sabitleri (KX10 tek kaynak)
   * STRICT: enum array (string yok, virgül yok, küçük yazım farkı yok).
   * Tüm modüller bu sabitleri window üstünden okur.
   * ──────────────────────────────────────────────────────────────── */
  /* V191e — Mevcut 7 enum + 3 yeni istif uyarısı (NON_STACKABLE, TOP_LOAD_ONLY, DO_NOT_STACK_ON_TOP).
   * Geri uyumlu: eski kayıtlardaki 7-enum array'ler etkilenmez. */
  var HANDLING_FLAGS_ENUM = ['DANGEROUS', 'FRAGILE', 'KEEP_UPRIGHT', 'LIQUID_LEAK_RISK', 'ODOR', 'PERISHABLE', 'REFRIGERATED', 'NON_STACKABLE', 'TOP_LOAD_ONLY', 'DO_NOT_STACK_ON_TOP'];
  var HANDLING_FLAGS_EMOJI = {
    DANGEROUS: '🔥',
    FRAGILE: '⚠',
    KEEP_UPRIGHT: '⬆',
    LIQUID_LEAK_RISK: '💧',
    ODOR: '👃',
    PERISHABLE: '🥗',
    REFRIGERATED: '🧊',
    /* V191e */
    NON_STACKABLE: '🚫📦',
    TOP_LOAD_ONLY: '⬆️📦',
    DO_NOT_STACK_ON_TOP: '⛔⬆️'
  };
  var HANDLING_FLAGS_LABEL_KEY = {
    DANGEROUS: 'ed.handling.dangerous',
    FRAGILE: 'ed.handling.fragile',
    KEEP_UPRIGHT: 'ed.handling.keepUpright',
    LIQUID_LEAK_RISK: 'ed.handling.liquidLeakRisk',
    ODOR: 'ed.handling.odor',
    PERISHABLE: 'ed.handling.perishable',
    REFRIGERATED: 'ed.handling.refrigerated',
    /* V191e */
    NON_STACKABLE: 'ed.handling.nonStackable',
    TOP_LOAD_ONLY: 'ed.handling.topLoadOnly',
    DO_NOT_STACK_ON_TOP: 'ed.handling.doNotStackOnTop'
  };
  /* Window expose — diğer modüller (expected_deliveries.js _edEditModal, renderEdList) buradan okur */
  if (!window.HANDLING_FLAGS_ENUM)      window.HANDLING_FLAGS_ENUM      = HANDLING_FLAGS_ENUM;
  if (!window.HANDLING_FLAGS_EMOJI)     window.HANDLING_FLAGS_EMOJI     = HANDLING_FLAGS_EMOJI;
  if (!window.HANDLING_FLAGS_LABEL_KEY) window.HANDLING_FLAGS_LABEL_KEY = HANDLING_FLAGS_LABEL_KEY;

  /* ────────────────────────────────────────────────────────────────
   * V188b — TESLİMAT YAPAN (Delivered By) sabitleri
   * Yeni 4 enum: MUSTERI / TEDARIKCI / NAKLIYECI / DEPO
   * Eski 2 enum (SATICI_TESLIM / FIRMA_ALIR) MAPPING ile UI'da
   * yeni karşılıklarına dönüştürülür (data migration yok).
   * KX10 — tek kaynak; expected_deliveries.js bu sabitlerden okur.
   * ──────────────────────────────────────────────────────────────── */
  var TESLIMAT_YAPAN_ENUM = ['MUSTERI', 'TEDARIKCI', 'NAKLIYECI', 'DEPO'];
  var TESLIMAT_YAPAN_LABEL_KEY = {
    MUSTERI:    'ed.teslim.musteri',
    TEDARIKCI:  'ed.teslim.tedarikci',
    NAKLIYECI:  'ed.teslim.nakliyeci',
    DEPO:       'ed.teslim.depo'
  };
  var TESLIMAT_YAPAN_SHORT_KEY = {
    MUSTERI:    'ed.teslim.short.musteri',
    TEDARIKCI:  'ed.teslim.short.tedarikci',
    NAKLIYECI:  'ed.teslim.short.nakliyeci',
    DEPO:       'ed.teslim.short.depo'
  };
  /* Eski 2 değer için mapping (UI gösterimi yeni karşılıklarına dönüşür):
   *   SATICI_TESLIM → 'TEDARIKCI' label gösterimi (satıcı teslim eder = tedarikçi getiriyor)
   *   FIRMA_ALIR    → 'DEPO'      label gösterimi (firma alır       = depomuza gelir)
   * Veride değer aynı kalır; sadece label render'ı sırasında map kullanılır. */
  var TESLIMAT_YAPAN_LEGACY_MAP = {
    SATICI_TESLIM: 'TEDARIKCI',
    FIRMA_ALIR:    'DEPO'
  };
  if (!window.TESLIMAT_YAPAN_ENUM)        window.TESLIMAT_YAPAN_ENUM        = TESLIMAT_YAPAN_ENUM;
  if (!window.TESLIMAT_YAPAN_LABEL_KEY)   window.TESLIMAT_YAPAN_LABEL_KEY   = TESLIMAT_YAPAN_LABEL_KEY;
  if (!window.TESLIMAT_YAPAN_SHORT_KEY)   window.TESLIMAT_YAPAN_SHORT_KEY   = TESLIMAT_YAPAN_SHORT_KEY;
  if (!window.TESLIMAT_YAPAN_LEGACY_MAP)  window.TESLIMAT_YAPAN_LEGACY_MAP  = TESLIMAT_YAPAN_LEGACY_MAP;

  /* Helper: değer (eski/yeni) → resolved enum (yeni 4'ten biri ya da '') */
  function _resolveTeslimat(value) {
    if (!value) return '';
    if (TESLIMAT_YAPAN_ENUM.indexOf(value) >= 0) return value;
    if (TESLIMAT_YAPAN_LEGACY_MAP[value])        return TESLIMAT_YAPAN_LEGACY_MAP[value];
    return '';
  }
  /* Helper: değer (eski/yeni) → uzun label ('— Belirtilmedi —' / '🏢 Tedarikçi' …) */
  function _teslimatYapanLabel(value) {
    var resolved = _resolveTeslimat(value);
    if (!resolved) return _t('ed.teslim.empty');
    return _t(TESLIMAT_YAPAN_LABEL_KEY[resolved] || 'ed.teslim.empty');
  }
  /* Helper: değer (eski/yeni) → kısa label ('🏢 Tedarikçi' / '🏭 Depo') — listede sub-line için */
  function _teslimatYapanShort(value) {
    var resolved = _resolveTeslimat(value);
    if (!resolved) return '';
    return _t(TESLIMAT_YAPAN_SHORT_KEY[resolved] || 'ed.teslim.empty');
  }
  if (!window._teslimatYapanLabel)  window._teslimatYapanLabel  = _teslimatYapanLabel;
  if (!window._teslimatYapanShort)  window._teslimatYapanShort  = _teslimatYapanShort;
  if (!window._resolveTeslimat)     window._resolveTeslimat     = _resolveTeslimat;

  /* ─── i18n + toast yardımcıları (yukarıda tanımlı, her yerde kullanılabilir) ─── */
  function _toast(msg, kind) { if (typeof window.toast === 'function') window.toast(msg, kind || 'ok'); }
  function _t(key, vars) { return (typeof window.t === 'function') ? window.t(key, null, vars || null) : key; }

  /* ─── State ─── */
  var state = {
    mode: null,         // 'create' | 'edit'
    edId: null,         // edit mode → kayıt id
    currentStep: 1,     // 1..4
    formData: {},       // birleşik alanlar
  };

  /* ─── Step tanımları — i18n key'lerden okur ─── */
  function _stepTitle(n) { return _t('ed.wizard.step.' + n); }
  var STEPS = [
    { n: 1, icon: '📦' },
    { n: 2, icon: '🚛' },
    { n: 3, icon: '🌐' },
    { n: 4, icon: '📄' },
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
        +   '<div style="font-size:10px;font-weight:' + weight + ';color:' + txtColor + ';margin-top:6px;white-space:nowrap">' + s.icon + ' ' + _stepTitle(s.n) + '</div>'
        + '</div>';
      if (i < STEPS.length - 1) {
        var lineCol = done ? '#16A34A' : 'var(--s3,#E5E5EA)';
        html += '<div style="flex:1;height:2px;background:' + lineCol + ';margin:0 12px;margin-bottom:24px;max-width:80px"></div>';
      }
    });
    html += '</div>';
    return html;
  }

  /* RBAC: 4 KISITLI ALAN — İhracat ID / Sipariş Kodu / Sorumlu / Renk
   * Talimat: 'asistan İhracat ID/Sipariş/Sorumlu/Renk hariç tüm verileri girebilir' */
  function canEditRestricted() { return isAdminOrManager(); }
  function canEditGeneral() { return isPrivileged(); }

  /* V186f / K10 cleanup: STATUSES + RENK ortak veri TEK KAYNAK (expected_deliveries.js).
   * V186_STATUSES/V186_RENK kopyaları silindi → window.STATUSES_LIST + window.LOJ_RENK_LIST.
   * Bu sayede 'TEDARIK_ASAMASINDA' vs 'TEDARIK' uyumsuzluk bug'ı da kapandı.
   * V185b4-r5: status + renk label'ları i18n sözlüğünden okur. */
  function _statuses() {
    var list = window.STATUSES_LIST || [];
    return list.map(function (k) { return [k, _statusLabel(k)]; });
  }
  function _renkList() { return window.LOJ_RENK_LIST || []; }
  function _statusLabel(key) {
    /* Önce ed.status.X i18n key'i, yoksa fallback STATUS_LABELS map */
    var i18nKey = 'ed.status.' + key;
    var i18n = _t(i18nKey);
    if (i18n !== i18nKey) return i18n;
    return (window.STATUS_LABELS && window.STATUS_LABELS[key]) || key;
  }
  function _renkAd(key) {
    /* ed.color.X i18n key'i, yoksa fallback _LOJ_KOLI_RENK[].a */
    var i18nKey = 'ed.color.' + key;
    var i18n = _t(i18nKey);
    if (i18n !== i18nKey) return i18n;
    var r = (_renkList()).find(function (x) { return x.k === key; });
    return r ? r.a : key;
  }

  /* V186_PRIORITY — başka modülde kullanılmıyor, V186 dosyasında kalır */
  var V186_PRIORITY = [['LOW', _t('ed.priority.low'), '#6B7280'], ['NORMAL', _t('ed.priority.normal'), '#185FA5'], ['CRITICAL', _t('ed.priority.critical'), '#DC2626']];

  /* ─── Form alanı style + label helper'ları ─── */
  var INPUT_CSS = 'width:100%;padding:8px 10px;border:0.5px solid var(--b,#D1D5DB);border-radius:7px;font-size:12px;background:var(--sf,#fff);color:var(--t);font-family:inherit;box-sizing:border-box';
  function lbl(text) {
    return '<div style="font-size:10px;font-weight:600;color:var(--t2,#4B5563);margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em">' + text + '</div>';
  }
  function _val(v) { return v == null ? '' : esc(v); }

  /* ─── State setter (form alanı binding'i) ─── */
  window._v186SetField = function (key, value) { state.formData[key] = value; };

  /* V187c — handlingFlags ENUM ARRAY toggle helper.
   * STRICT: enum array (string yok, virgül yok, küçük yazım farkı yok).
   * Tıklamada: array'e ekle/çıkar + buton görsel state güncelle (style inline). */
  window._v186ToggleHandlingFlag = function (flag, btnEl) {
    if (!Array.isArray(state.formData.handlingFlags)) state.formData.handlingFlags = [];
    var arr = state.formData.handlingFlags;
    var i = arr.indexOf(flag);
    if (i >= 0) {
      arr.splice(i, 1);
      if (btnEl) {
        btnEl.dataset.active = '0';
        btnEl.style.borderColor = 'var(--b)';
        btnEl.style.background = 'transparent';
        btnEl.style.fontWeight = '400';
      }
    } else {
      arr.push(flag);
      if (btnEl) {
        btnEl.dataset.active = '1';
        btnEl.style.borderColor = '#2563EB';
        btnEl.style.background = '#DBEAFE';
        btnEl.style.fontWeight = '600';
      }
    }
  };

  /* V187d → V188a: _v186AutoTrackingUrl kaldırıldı.
   * Konteyner/Armatör/Tracking alanları V188 Sevkiyat Wizard'a taşındı,
   * auto-tracking artık `_v188AutoTrackingUrl` (yeni dosya) tarafından sağlanır. */

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
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.productName'))
        + '<input type="text" oninput="window._v186SetField(\'productName\', this.value)" value="' + _val(d.productName) + '" style="' + INPUT_CSS + '" placeholder="Ürün adı...">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.supplier'))
        + '<select onchange="window._v186SetField(\'supplierId\', this.value); window._edRotaPrefill && window._edRotaPrefill(this.value)" style="' + INPUT_CSS + '">' + supplierOpts + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.quantity'))
        + '<input type="number" min="1" step="1" oninput="window._v186SetField(\'quantityTotal\', this.value)" value="' + _val(d.quantityTotal) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums;text-align:right">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.unit'))
        + '<select onchange="window._v186SetField(\'unit\', this.value)" style="' + INPUT_CSS + '">'
        + unitOpts.map(function (u) { return '<option value="' + u + '"' + (d.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.weightKg'))
        + '<input type="number" min="0" step="0.1" oninput="window._v186SetField(\'weightKg\', this.value)" value="' + _val(d.weightKg) + '" placeholder="örn: 2450" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.volumeM3'))
        + '<input type="number" min="0" step="0.1" oninput="window._v186SetField(\'volumeM3\', this.value)" value="' + _val(d.volumeM3) + '" placeholder="örn: 12.5" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.proformaDate'))
        + '<input type="date" oninput="window._v186SetField(\'proformaDate\', this.value)" value="' + _val(d.proformaDate) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.proformaId'))
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'proformaId\', this.value)" value="' + _val(d.proformaId) + '" placeholder="örn: PRF-2026-001" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.estimatedDeliveryDate'))
        + '<input type="date" oninput="window._v186SetField(\'estimatedDeliveryDate\', this.value)" value="' + _val(d.estimatedDeliveryDate) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.deliveryTermDays'))
        + '<input type="number" min="1" oninput="window._v186SetField(\'deliveryTermDays\', this.value)" value="' + _val(d.deliveryTermDays) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.toleranceDays'))
        + '<input type="number" min="0" oninput="window._v186SetField(\'toleranceDays\', this.value)" value="' + _val(d.toleranceDays) + '" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '</div>';
  }
  function renderStep2() {
    var d = state.formData;
    var yonOpts = [['GIDEN', _t('ed.yon.giden')], ['GELEN', _t('ed.yon.gelen')]];
    var teslimOpts = [
      ['',           _t('ed.teslim.empty')],
      ['MUSTERI',    _t('ed.teslim.musteri')],
      ['TEDARIKCI',  _t('ed.teslim.tedarikci')],
      ['NAKLIYECI',  _t('ed.teslim.nakliyeci')],
      ['DEPO',       _t('ed.teslim.depo')]
    ];
    var paketOpts = [
      ['',          _t('ed.pkg.empty')],
      ['palet',     _t('ed.pkg.palet')],
      ['koli',      _t('ed.pkg.koli')],
      ['big-bag',   _t('ed.pkg.bigBag')],
      ['kafes',     _t('ed.pkg.kafes')],
      ['cuval',     _t('ed.pkg.cuval')],
      ['dokme',     _t('ed.pkg.dokme')],
      ['diger',     _t('ed.pkg.diger')],
    ];
    var armatorList = ['', 'MSC', 'Maersk', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'Yang Ming', 'HMM', 'ZIM', 'PIL', 'OOCL', 'Diger'];
    return '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.yon'))
        + '<select onchange="window._v186SetField(\'yon\', this.value)" style="' + INPUT_CSS + '">'
        + yonOpts.map(function (y) { return '<option value="' + y[0] + '"' + ((d.yon || 'GIDEN') === y[0] ? ' selected' : '') + '>' + y[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + sect('📤', _t('ed.sect.cikis'), _t('ed.sect.trIci'))
      + '<div>' + lbl(_t('ed.label.originCity'))
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'originCity\', this.value)" value="' + _val(d.originCity) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.originDistrict'))
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'originDistrict\', this.value)" value="' + _val(d.originDistrict) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('🎯', _t('ed.sect.varis'), _t('ed.sect.trIci'))
      + '<div>' + lbl(_t('ed.label.destinationCity'))
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'destinationCity\', this.value)" value="' + _val(d.destinationCity) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.destinationDistrict'))
        + '<input type="text" maxlength="50" oninput="window._v186SetField(\'destinationDistrict\', this.value)" value="' + _val(d.destinationDistrict) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('🚛', _t('ed.sect.yuklemeTeslim'))
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.yuklemeFirma'))
        + '<input type="text" oninput="window._v186SetField(\'yuklemeFirmaAd\', this.value)" value="' + _val(d.yuklemeFirmaAd) + '" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.teslimTipi'))
        + '<select onchange="window._v186SetField(\'teslimTipi\', this.value)" style="' + INPUT_CSS + '">'
        + teslimOpts.map(function (t) { return '<option value="' + t[0] + '"' + (_resolveTeslimat(d.teslimTipi || '') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + sect('📦', _t('ed.sect.paket'))
      + '<div>' + lbl(_t('ed.label.paketTuru'))
        + '<select onchange="window._v186SetField(\'paketTuru\', this.value)" style="' + INPUT_CSS + '">'
        + paketOpts.map(function (p) { return '<option value="' + p[0] + '"' + ((d.paketTuru || '') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.paketAdedi'))
        + '<input type="number" min="0" oninput="window._v186SetField(\'paketAdedi\', this.value)" value="' + _val(d.paketAdedi) + '" placeholder="örn: 24" style="' + INPUT_CSS + ';font-variant-numeric:tabular-nums">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.paketEbatlari'))
        + '<input type="text" oninput="window._v186SetField(\'paketEbatlari\', this.value)" value="' + _val(d.paketEbatlari) + '" placeholder="örn: 120×80×100 cm" style="' + INPUT_CSS + '">'
      + '</div>'
      + sect('📦', _t('ed.sect.yuklemeDetay'))
      + '<div>' + lbl(_t('ed.label.containerSequenceNo'))
        + '<input type="number" min="1" step="1" oninput="window._v186SetField(\'containerSequenceNo\', this.value ? Number(this.value) : null)" value="' + (d.containerSequenceNo != null ? esc(String(d.containerSequenceNo)) : '') + '" placeholder="örn: 5" style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.loadingPriority'))
        + '<select onchange="window._v186SetField(\'loadingPriority\', this.value)" style="' + INPUT_CSS + '">'
        + ['', 'REQUIRED', 'OPTIONAL'].map(function (p) {
            var lblText = p === 'REQUIRED' ? _t('ed.loadingPri.required')
                        : p === 'OPTIONAL' ? _t('ed.loadingPri.optional')
                        : _t('ed.loadingPri.empty');
            return '<option value="' + p + '"' + ((d.loadingPriority || '') === p ? ' selected' : '') + '>' + esc(lblText) + '</option>';
          }).join('')
        + '</select>'
      + '</div>'
      /* V187c — handlingFlags ENUM ARRAY (multi-button toggle grid, full row) */
      + (function () {
          var enums = HANDLING_FLAGS_ENUM;
          var labelMap = HANDLING_FLAGS_LABEL_KEY;
          var current = Array.isArray(d.handlingFlags) ? d.handlingFlags : [];
          var btns = enums.map(function (flag) {
            var isActive = current.indexOf(flag) >= 0;
            var lblText = _t(labelMap[flag]);
            return '<button type="button" data-flag="' + flag + '" data-active="' + (isActive ? '1' : '0') + '"'
              + ' onclick="window._v186ToggleHandlingFlag(\'' + flag + '\', this)"'
              + ' title="' + esc(lblText) + '"'
              + ' style="padding:6px 10px;border:1px solid ' + (isActive ? '#2563EB' : 'var(--b)') + ';border-radius:6px;'
              + 'background:' + (isActive ? '#DBEAFE' : 'transparent') + ';cursor:pointer;font-size:12px;font-family:inherit;'
              + 'color:var(--t);font-weight:' + (isActive ? '600' : '400') + ';transition:border-color 150ms,background 150ms">'
              + esc(lblText)
              + '</button>';
          }).join('');
          return '<div style="grid-column:span 2">' + lbl(_t('ed.label.handlingFlags'))
            + '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2)">'
            + btns
            + '</div>'
            + '</div>';
        })()
      + '</div>';
  }
  function renderStep3() {
    var d = state.formData;
    var canRestricted = canEditRestricted();
    var canGeneral    = canEditGeneral();
    var dis = function (allow) { return allow ? '' : ' disabled style="opacity:.6;cursor:not-allowed"'; };
    var userOpts = (typeof window._edUserOpts === 'function') ? window._edUserOpts(d.responsibleUserId) : '<option value="">— Sorumlu —</option>';
    var teklifOnaylayanOpts = (typeof window._edUserOpts === 'function') ? window._edUserOpts(d.teklifOnaylayan || '') : '<option value="">—</option>';
    var satinAlmaOpts       = (typeof window._edUserOpts === 'function') ? window._edUserOpts(d.satinAlmaSorumlusu || '') : '<option value="">—</option>';

    /* RBAC etiketi üstte */
    var rbacBanner = '';
    if (!canRestricted && canGeneral) {
      rbacBanner = '<div style="grid-column:span 2;padding:10px 14px;background:#FEF3C7;border:0.5px solid #FCD34D;border-radius:8px;font-size:11px;color:#92400E;display:flex;align-items:center;gap:8px"><span style="font-size:16px">⚠</span><span>' + esc(_t('ed.wizard.banner.asistan')) + '</span></div>';
    } else if (!canGeneral) {
      rbacBanner = '<div style="grid-column:span 2;padding:10px 14px;background:#F3F4F6;border:0.5px solid #D1D5DB;border-radius:8px;font-size:11px;color:#4B5563;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🔒</span><span>' + esc(_t('ed.wizard.banner.readonly')) + '</span></div>';
    }

    return '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + rbacBanner
      + sect('🌐', _t('ed.sect.ihracatSiparis'), canRestricted ? '' : 'Sadece admin / manager')
      + '<div>' + lbl(_t('ed.label.ihracatId') + (canRestricted ? '' : ' 🔒'))
        + '<input type="text" maxlength="30" oninput="window._v186SetField(\'ihracatId\', this.value)" value="' + _val(d.ihracatId) + '"' + dis(canRestricted) + ' style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.siparisKodu') + (canRestricted ? '' : ' 🔒'))
        + '<input type="text" maxlength="30" oninput="window._v186SetField(\'siparisKodu\', this.value)" value="' + _val(d.siparisKodu) + '"' + dis(canRestricted) + ' style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.renk') + (canRestricted ? '' : ' 🔒'))
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + _renkList().map(function (r) {
            var sel = d.renk === r.k;
            var border = sel ? '3px solid var(--t)' : '0.5px solid var(--b)';
            var click = canRestricted ? 'window._v186SetField(\'renk\',\'' + r.k + '\');document.querySelectorAll(\'[data-v186-renk-wrap]\').forEach(function(b){b.querySelector(\'.v186-renk-circle\').style.border=\'0.5px solid var(--b)\';b.querySelector(\'.v186-renk-name\').style.fontWeight=\'400\';});this.querySelector(\'.v186-renk-circle\').style.border=\'3px solid var(--t)\';this.querySelector(\'.v186-renk-name\').style.fontWeight=\'600\';' : '';
            var cur = canRestricted ? 'pointer' : 'not-allowed';
            return '<div data-v186-renk-wrap data-v186-renk="' + r.k + '" onclick="' + click + '" title="' + esc(_renkAd(r.k)) + '" style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;cursor:' + cur + ';padding:4px;border-radius:6px"' + (canRestricted ? '' : ' aria-disabled="true"') + '>'
              + '<div class="v186-renk-circle" style="width:32px;height:32px;border:' + border + ';border-radius:50%;background:' + r.h + ';transition:.15s"></div>'
              + '<div class="v186-renk-name" style="font-size:9px;color:var(--t2);font-weight:' + (sel ? '600' : '400') + ';text-align:center">' + esc(_renkAd(r.k)) + '</div>'
              + '</div>';
          }).join('')
        + '</div>'
      + '</div>'
      + sect('👤', _t('ed.sect.sorumluluk'), canRestricted ? '' : 'admin/manager')
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.responsibleUser') + (canRestricted ? '' : ' 🔒'))
        + '<select onchange="window._v186SetField(\'responsibleUserId\', this.value)"' + dis(canRestricted) + ' style="' + INPUT_CSS + '">' + userOpts + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.teklifOnaylayan'))
        + '<select onchange="window._v186SetField(\'teklifOnaylayan\', this.value)"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">' + teklifOnaylayanOpts + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.teklifOnayTarihi'))
        + '<input type="datetime-local" oninput="window._v186SetField(\'teklifOnayTarihi\', this.value)" value="' + _val(d.teklifOnayTarihi) + '"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.avansOdemeTarihi'))
        + '<input type="datetime-local" oninput="window._v186SetField(\'avansOdemeTarihi\', this.value)" value="' + _val(d.avansOdemeTarihi) + '"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.satinAlmaSorumlusu'))
        + '<select onchange="window._v186SetField(\'satinAlmaSorumlusu\', this.value)"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">' + satinAlmaOpts + '</select>'
      + '</div>'
      + sect('🚦', _t('ed.sect.durumOncelik'))
      + '<div>' + lbl(_t('ed.label.priority'))
        + '<select onchange="window._v186SetField(\'priority\', this.value)"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">'
        + V186_PRIORITY.map(function (p) { return '<option value="' + p[0] + '"' + ((d.priority || 'NORMAL') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '<div>' + lbl(_t('ed.label.status'))
        + '<select onchange="window._v186SetField(\'status\', this.value)"' + dis(canGeneral) + ' style="' + INPUT_CSS + '">'
        + _statuses().map(function (s) { return '<option value="' + s[0] + '"' + ((d.status || 'SIPARIS_ASAMASINDA') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('')
        + '</select>'
      + '</div>'
      + '</div>';
  }
  function renderStep4() {
    var d = state.formData;
    var canGeneral = canEditGeneral();
    var dis = function (allow) { return allow ? '' : ' disabled style="opacity:.6;cursor:not-allowed"'; };

    /* V191f — Sade özet: kullanıcı kaydetmeden önce kritik bilgileri tek bakışta görür.
     * Tüm 18 alan görüntüleme isterse "📋 Tüm Bilgileri Gör" → modal (_v186SummaryModal). */
    var sup = (typeof window.loadSuppliers === 'function') ? (window.loadSuppliers() || []).find(function (s) { return String(s.id) === String(d.supplierId); }) : null;
    var supName = sup ? (sup.name || sup.unvan || '—') : (d.supplierId ? '#' + d.supplierId : '—');
    var sade1Parts = [];
    if (d.productName) sade1Parts.push(d.productName);
    if (supName && supName !== '—') sade1Parts.push(supName);
    if (d.weightKg) sade1Parts.push(d.weightKg + ' kg');
    if (d.volumeM3) sade1Parts.push(d.volumeM3 + ' m³');
    var sade1 = sade1Parts.join(' · ') || '—';
    var sade2Parts = [];
    if (d.estimatedDeliveryDate) sade2Parts.push('ETA: ' + d.estimatedDeliveryDate);
    if (d.yon) sade2Parts.push(d.yon === 'GELEN' ? '📥 Gelen' : '📤 Giden');
    if (d.loadingPriority === 'REQUIRED') sade2Parts.push('⭐ ' + _t('ed.loadingPri.required'));
    var sade2 = sade2Parts.join(' · ');

    return '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      + sect('📄', _t('ed.sect.belge'))
      + '<div style="grid-column:span 2">' + lbl(_t('ed.label.belgeUrl'))
        + '<div style="display:flex;flex-direction:column;gap:6px">'
        + '<input type="file" accept=".pdf,application/pdf" onchange="window._v186BelgeUpload && window._v186BelgeUpload(this)"' + dis(canGeneral) + ' style="font-size:11px;padding:6px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);font-family:inherit">'
        + '<input type="hidden" id="v186-belgeUrl" value="' + _val(d.belgeUrl) + '">'
        + '<div id="v186-belge-status" style="font-size:11px;color:var(--t3);padding:4px 0">'
          + (d.belgeUrl
              ? '✓ Mevcut belge · <a href="' + _val(d.belgeUrl) + '" target="_blank" rel="noopener" style="color:var(--ac,#185FA5)">Görüntüle</a>'
              : 'Belge yok')
        + '</div>'
        + '</div>'
      + '</div>'
      /* V191f — Sade özet bloğu */
      + '<div style="grid-column:span 2;background:var(--s2,#F5F5F7);border-radius:10px;padding:16px">'
        + '<div style="color:var(--gr,#1D9E75);font-size:12px;font-weight:500;margin-bottom:10px">' + (typeof window.t === 'function' ? window.t('ed.summary.allReady') : '✓ Tüm bilgiler hazır') + '</div>'
        + '<div style="color:var(--t);font-size:13px;font-weight:500;margin-bottom:4px">' + esc(sade1) + '</div>'
        + (sade2 ? '<div style="color:var(--t2);font-size:12px;margin-bottom:14px">' + esc(sade2) + '</div>' : '<div style="margin-bottom:14px"></div>')
        + '<button type="button" onclick="window._v186SummaryModal && window._v186SummaryModal()" style="padding:7px 14px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);cursor:pointer;font-size:11px;color:var(--t);font-family:inherit;font-weight:500">' + (typeof window.t === 'function' ? window.t('ed.summary.openButton') : '📋 Tüm Bilgileri Gör') + '</button>'
      + '</div>'
      + '</div>';
  }

  /* V191f — Tüm Bilgiler modal: Step 4 sade özetinden açılır.
   * Mevcut row helper mantığı reuse — kategorize: 📦 Temel · 🚛 Rota · 🌐 İhracat. */
  window._v186SummaryModal = function() {
    var d = state.formData;
    var sup = (typeof window.loadSuppliers === 'function') ? (window.loadSuppliers() || []).find(function (s) { return String(s.id) === String(d.supplierId); }) : null;
    var supName = sup ? (sup.name || sup.unvan || '—') : (d.supplierId ? '#' + d.supplierId : '—');
    var statusLabel = (_statuses().find(function (s) { return s[0] === d.status; }) || [d.status, d.status || '—'])[1];
    var renkLabel = d.renk ? _renkAd(d.renk) : '—';
    var priLabel  = (V186_PRIORITY.find(function (p) { return p[0] === d.priority; }) || ['', d.priority || _t('ed.priority.normal')])[1];
    function row(k, v) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px dashed var(--b)"><span style="color:var(--t3);font-size:11px">' + k + '</span><span style="color:var(--t);font-size:12px;font-weight:500;text-align:right;max-width:60%">' + (v == null || v === '' ? '<span style="color:var(--t3);font-style:italic">—</span>' : esc(v)) + '</span></div>';
    }
    var rotaCikis = (d.originCity || '?') + (d.originDistrict ? ', ' + d.originDistrict : '');
    var rotaVaris = (d.destinationCity || '?') + (d.destinationDistrict ? ', ' + d.destinationDistrict : '');

    var ex = document.getElementById('v186-summary-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'v186-summary-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10001;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };

    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:520px;max-width:92vw;max-height:90vh;display:flex;flex-direction:column;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      + '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'
        + '<div style="font-size:14px;font-weight:600">' + (typeof window.t === 'function' ? window.t('ed.summary.modal.title') : 'Tüm Bilgiler') + '</div>'
        + '<button type="button" onclick="document.getElementById(\'v186-summary-modal\').remove()" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--t3);padding:0;line-height:1">✕</button>'
      + '</div>'
      + '<div style="padding:18px 20px;overflow-y:auto;flex:1;font-size:12px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">📦 ' + _t('ed.sect.temel') + '</div>'
        + row('Ürün Adı', d.productName)
        + row('Tedarikçi', supName)
        + row('Miktar', (d.quantityTotal ? d.quantityTotal + ' ' + (d.unit || 'adet') : ''))
        + row('Ağırlık / Hacim', ((d.weightKg ? d.weightKg + ' kg' : '—') + ' / ' + (d.volumeM3 ? d.volumeM3 + ' m³' : '—')))
        + row('Tahmini Teslim', d.estimatedDeliveryDate)
        + row('Tolerans', (d.toleranceDays ? d.toleranceDays + ' gün' : ''))
        + '<div style="font-size:11px;font-weight:700;color:var(--t2);margin:14px 0 10px;text-transform:uppercase;letter-spacing:.05em">🚛 ' + _t('ed.sect.rotaLojistik') + '</div>'
        + row('Yön', (d.yon === 'GELEN' ? '📥 Gelen' : '📤 Giden'))
        + row('Çıkış → Varış', rotaCikis + ' → ' + rotaVaris)
        + row('Yükleme Firma', d.yuklemeFirmaAd)
        + row(_t('ed.label.teslimTipi'), _teslimatYapanLabel(d.teslimTipi))
        + row(_t('ed.label.containerSequenceNo'), (d.containerSequenceNo != null ? '#' + d.containerSequenceNo : ''))
        + row(_t('ed.label.loadingPriority'),
              d.loadingPriority === 'REQUIRED' ? _t('ed.loadingPri.required')
            : d.loadingPriority === 'OPTIONAL' ? _t('ed.loadingPri.optional')
            : '')
        + row(_t('ed.label.handlingFlags'),
              (Array.isArray(d.handlingFlags) && d.handlingFlags.length
                ? d.handlingFlags.map(function (f) { return HANDLING_FLAGS_EMOJI[f] || ''; }).filter(Boolean).join(' ')
                : ''))
        + '<div style="font-size:11px;font-weight:700;color:var(--t2);margin:14px 0 10px;text-transform:uppercase;letter-spacing:.05em">🌐 ' + _t('ed.sect.ihracatSorumluluk') + '</div>'
        + row('İhracat ID', d.ihracatId)
        + row('Sipariş Kodu', d.siparisKodu)
        + row('Renk', renkLabel)
        + row('Sorumlu', d.responsibleUserId)
        + row('Öncelik', priLabel)
        + row('Durum', statusLabel)
      + '</div>'
      + '<div style="padding:12px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;background:var(--s2,#F5F5F7);flex-shrink:0">'
        + '<button type="button" onclick="document.getElementById(\'v186-summary-modal\').remove()" style="padding:8px 18px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);cursor:pointer;font-size:12px;color:var(--t);font-family:inherit;font-weight:500">' + (typeof window.t === 'function' ? window.t('ed.summary.close') : 'Kapat') + '</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(mo);
  };

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
    var canGeneral = canEditGeneral();
    var prevBtn = isFirst
      ? '<button onclick="window._v186WizardClose()" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;color:var(--t2);font-family:inherit">' + _t('ed.wizard.btn.cancel') + '</button>'
      : '<button onclick="window._v186WizardPrev()" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;color:var(--t);font-family:inherit">' + _t('ed.wizard.btn.prev') + '</button>';
    var nextBtn;
    if (isLast) {
      /* V186d: salt-okunur kullanıcı için Save yok, sadece Kapat */
      nextBtn = canGeneral
        ? '<button onclick="window._v186WizardSave()" style="padding:8px 22px;border:none;border-radius:8px;background:#16A34A;color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">' + _t('ed.wizard.btn.save') + '</button>'
        : '<button onclick="window._v186WizardClose()" style="padding:8px 22px;border:0.5px solid var(--b);border-radius:8px;background:var(--s2);color:var(--t);cursor:pointer;font-size:13px;font-weight:500;font-family:inherit">' + _t('ed.wizard.btn.close') + '</button>';
    } else {
      nextBtn = '<button onclick="window._v186WizardNext()" style="padding:8px 22px;border:none;border-radius:8px;background:#185FA5;color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">' + _t('ed.wizard.btn.next') + '</button>';
    }
    return '<div style="padding:14px 24px;border-top:0.5px solid var(--b);background:var(--s2,#F5F5F7);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:11px;color:var(--t3)">' + _t('ed.wizard.stepProgress', { n: state.currentStep }) + '</div>'
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
    var modeTitle = state.mode === 'create' ? _t('ed.wizard.title.create') : _t('ed.wizard.title.edit');
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
      /* V186e: _Original referansları kullan (override sonrası sonsuz döngü engeli) */
      if (mode === 'create' && typeof window._edWizardAcOriginal === 'function') return window._edWizardAcOriginal();
      if (mode === 'edit'   && typeof window._edEditModalOriginal === 'function') return window._edEditModalOriginal(edId);
      /* Override henüz yapılmamışsa (defensive) */
      if (mode === 'create' && typeof window._edWizardAc === 'function') return window._edWizardAc();
      if (mode === 'edit'   && typeof window._edEditModal === 'function') return window._edEditModal(edId);
      return;
    }
    state.mode = (mode === 'edit') ? 'edit' : 'create';
    state.edId = edId || null;
    state.currentStep = 1;
    state.formData = {};

    /* V186d: CREATE RBAC — sadece admin/manager yeni kayıt oluşturabilir
     * (asistan create yapamaz çünkü Sorumlu zorunlu, asistan Sorumlu seçemez) */
    if (state.mode === 'create' && !isAdminOrManager()) {
      _toast(_t('ed.toast.permissionDenied'), 'err');
      state.mode = null;
      return;
    }

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
  /* ─── V186d: VALIDATION ─── */
  function validateForm() {
    var d = state.formData;
    var errors = [];
    if (!d.productName || !String(d.productName).trim()) errors.push({ step: 1, field: 'Ürün Adı' });
    if (!d.supplierId) errors.push({ step: 1, field: 'Tedarikçi' });
    if (!d.quantityTotal || parseFloat(d.quantityTotal) <= 0) errors.push({ step: 1, field: 'Miktar (>0)' });
    if (!d.estimatedDeliveryDate) errors.push({ step: 1, field: 'Tahmini Teslim' });
    /* V187a: Proforma Date varsa Proforma ID zorunlu */
    if (d.proformaDate && (!d.proformaId || !String(d.proformaId).trim())) {
      errors.push({ step: 1, field: _t('ed.label.proformaId') });
    }
    if (!d.originCity || !String(d.originCity).trim()) errors.push({ step: 2, field: 'Çıkış Şehir' });
    if (!d.originDistrict || !String(d.originDistrict).trim()) errors.push({ step: 2, field: 'Çıkış Bölge' });
    if (!d.destinationCity || !String(d.destinationCity).trim()) errors.push({ step: 2, field: 'Varış Şehir' });
    if (!d.destinationDistrict || !String(d.destinationDistrict).trim()) errors.push({ step: 2, field: 'Varış Bölge' });
    if (state.mode === 'create' && !d.responsibleUserId) errors.push({ step: 3, field: 'Sorumlu' });
    return errors;
  }


  function close() { document.getElementById('v186-wizard-modal')?.remove(); state.mode = null; state.edId = null; state.currentStep = 1; state.formData = {}; }  function save() {
    /* 1) Validation */
    var errors = validateForm();
    if (errors.length) {
      var fieldList = errors.map(function (e) { return e.field; }).join(', ');
      _toast(_t('ed.toast.missingFields', { fields: fieldList }), 'err');
      /* En düşük step numarasına dön (eksiğin en başı) */
      var minStep = errors.reduce(function (m, e) { return Math.min(m, e.step); }, 4);
      if (state.currentStep !== minStep) { state.currentStep = minStep; render(); }
      return;
    }

    /* 2) Storage ulaşılabilirlik */
    if (typeof window.loadExpectedDeliveries !== 'function' || typeof window.storeExpectedDeliveries !== 'function') {
      _toast(_t('ed.toast.storageMissing'), 'err');
      return;
    }

    var list = window.loadExpectedDeliveries({ raw: true }) || [];
    var d = Object.assign({}, state.formData);
    var cu = _cu() || {};
    var nowIso = new Date().toISOString();

    if (state.mode === 'create') {
      /* CREATE — RBAC: asistan create yapamaz (open'da kontrol edildi) */
      var newRec = Object.assign({}, d, {
        id: 'ed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        createdAt: nowIso,
        createdBy: cu.id || cu.uid || null,
        createdByName: cu.name || cu.displayName || '—',
        status: d.status || 'SIPARIS_ASAMASINDA',
        priority: d.priority || 'NORMAL',
        statusHistory: [{ type: 'created', by: cu.id || cu.uid || null, at: nowIso, status: d.status || 'SIPARIS_ASAMASINDA' }],
        deliveries: [],
      });
      list.push(newRec);
      window.storeExpectedDeliveries(list);

      try { if (typeof window.logActivity === 'function') window.logActivity('ed_v186_created', 'edId=' + newRec.id + ' productName=' + (newRec.productName || '')); } catch (e) {}
      _toast(_t('ed.toast.deliveryCreated'), 'ok');

    } else if (state.mode === 'edit') {
      /* EDIT — RBAC: asistan 4 kısıtlı alanı değiştirememeli (UI disabled +
       *              server-side de güvence: eski değer korunur) */
      var idx = -1;
      for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(state.edId)) { idx = i; break; } }
      if (idx === -1) { _toast(_t('ed.toast.notFound'), 'err'); return; }
      var existing = list[idx];

      if (!canEditRestricted()) {
        d.ihracatId         = existing.ihracatId;
        d.siparisKodu       = existing.siparisKodu;
        d.renk              = existing.renk;
        d.responsibleUserId = existing.responsibleUserId;
      }

      list[idx] = Object.assign({}, existing, d, {
        updatedAt: nowIso,
        updatedBy: cu.id || cu.uid || null,
        updatedByName: cu.name || cu.displayName || '—',
      });
      window.storeExpectedDeliveries(list);

      try { if (typeof window.logActivity === 'function') window.logActivity('ed_v186_updated', 'edId=' + state.edId + ' fields=' + Object.keys(d).filter(function (k) { return d[k]; }).join(',').slice(0, 200)); } catch (e) {}
      _toast(_t('ed.toast.updated'), 'ok');
    }

    /* 3) UI refresh + close */
    if (typeof window._edRefresh === 'function') {
      try { window._edRefresh(); } catch (e) {}
    } else if (typeof window.renderEdList === 'function') {
      try { window.renderEdList(); } catch (e) {}
    }
    close();
  }

  /* Global export */
  window._v186WizardOpen  = open;
  window._v186WizardNext  = next;
  window._v186WizardPrev  = prev;
  window._v186WizardClose = close;
  window._v186WizardSave  = save;

  /* ─── V186e: AKTİVASYON ─── */

  /* Feature flag — default AÇIK. localStorage 'use_v186_wizard'='false' → eski sistem.
   * Acil rollback: localStorage.setItem('use_v186_wizard','false') + sayfa yenile */
  if (typeof window.USE_V186_WIZARD === 'undefined') {
    try {
      var __saved = localStorage.getItem('use_v186_wizard');
      window.USE_V186_WIZARD = (__saved !== 'false'); // null/missing/true → true
    } catch (_) { window.USE_V186_WIZARD = true; }
  }

  /* Eski 3 wizard çağrısı → V186'a köprü.
   * Eski versiyonlar _xxxOriginal olarak korunur (rollback için → flag false). */
  function _v186Hijack() {
    if (typeof window._edWizardAc === 'function' && !window._edWizardAcOriginal) {
      window._edWizardAcOriginal = window._edWizardAc;
      window._edWizardAc = function () { return open('create'); };
      console.log(LOG_PREFIX, '_edWizardAc → V186 (eski: _edWizardAcOriginal)');
    }
    if (typeof window._edEditModal === 'function' && !window._edEditModalOriginal) {
      window._edEditModalOriginal = window._edEditModal;
      window._edEditModal = function (edId) { return open('edit', edId); };
      console.log(LOG_PREFIX, '_edEditModal → V186 (eski: _edEditModalOriginal)');
    }
  }

  /* expected_deliveries.js zaten yüklü olmalı ama defensive: hem hemen hem
   * DOMContentLoaded'da dene */
  _v186Hijack();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _v186Hijack);
  }

  /* Konsol bilgisi */
  console.log(LOG_PREFIX, 'V186e — AKTİF (default).');
  console.log(LOG_PREFIX, 'Geri dönüş için: window.USE_V186_WIZARD = false; sayfa yenile');

})();
