/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/expected_deliveries.js — v0.1 (PARÇA 1: veri modeli + helper + mode + validation)
 * EXPECTED-DELIVERIES-FLOW-002
 * ════════════════════════════════════════════════════════════════
 */
(function() {
  'use strict';
/* LOJ-WIZARD-SUPPLIER-FIX-001: loadCari izolasyon — admin disinda kendi cari'leri */


  /* ─── MODE GUARD ──────────────────────────────────────────── */
  window.EXPECTED_DELIVERIES_MODE = window.EXPECTED_DELIVERIES_MODE || 'MANUAL_MODE';

  window._edIsAutoMode = function() {
    return window.EXPECTED_DELIVERIES_MODE === 'AUTO_MODE';
  };

  window._edCanManualCreate = function() {
    if (window._edIsAutoMode()) {
      var cu = (window.CU && window.CU()) || {};
      return (cu.role || cu.rol) === 'admin';
    }
    return true;
  };

  /* ─── COMPUTED HELPERS ────────────────────────────────────── */
  window._edCalculateDelivered = function(ed) {
    if (!ed || !Array.isArray(ed.deliveries)) return 0;
    return ed.deliveries.reduce(function(sum, d) { return sum + (parseFloat(d && d.qty) || 0); }, 0);
  };

  window._edCalculateRemaining = function(ed) {
    var total = parseFloat(ed && ed.quantityTotal) || 0;
    return Math.max(0, total - window._edCalculateDelivered(ed));
  };

  window._edCalculateDelay = function(ed) {
    if (!ed || !ed.estimatedDeliveryDate) return 0;
    var est = new Date(ed.estimatedDeliveryDate).getTime();
    if (isNaN(est)) return 0;
    return Math.floor((Date.now() - est) / 86400000);
  };

  window._edIsOverdue = function(ed) {
    var delay = window._edCalculateDelay(ed);
    var tolerance = parseInt(ed && ed.toleranceDays, 10);
    if (isNaN(tolerance)) tolerance = 0;
    return delay > tolerance;
  };

  window._edCalculateRemainingDays = function(ed) {
    if (!ed || !ed.estimatedDeliveryDate) return null;
    var est = new Date(ed.estimatedDeliveryDate).getTime();
    if (isNaN(est)) return null;
    return Math.ceil((est - Date.now()) / 86400000);
  };

  /* SHIPMENT-LIST-COLUMNS-002: konteyner kapasite hesaplayıcı (V133.1) */
  /* V184a4 / LOJ-CONTAINER-CALC-001: Konteyner öneri algoritması.
   * Kapasiteler (gerçek payload): 20ft 28m³/28000kg · 40ft 56m³/26000kg · 40HC 68m³/26000kg
   * Kural: 2×20ft ASLA otomatik öneri DEĞİL — 40ft/40HC her zaman tercih edilir (operasyonel verimlilik). */
  window._edCalculateContainers = function(ed) {
    var wt = parseFloat(ed && ed.weightKg) || 0;
    var vol = parseFloat(ed && ed.volumeM3) || 0;
    if (wt === 0 && vol === 0) return null;
    var C20_VOL = 28, C20_WT = 28000;
    var C40_VOL = 56, C40_WT = 26000;
    var C40HC_VOL = 68, C40HC_WT = 26000;

    /* 1×20ft yeterli mi? */
    if (vol <= C20_VOL && wt <= C20_WT) {
      var fillVol20 = Math.round((vol / C20_VOL) * 100);
      return { wt: wt, vol: vol, count: 1, type: '20ft', level: 'ok',
               text: '✅ 1 × 20ft yeter (%' + fillVol20 + ' hacim)',
               color: '#3B6D11' };
    }
    /* 1×40ft yeterli mi? (40HC daha pahalı, 40ft mümkünse onu tercih et) */
    if (vol <= C40_VOL && wt <= C40_WT) {
      var fillVol40 = Math.round((vol / C40_VOL) * 100);
      return { wt: wt, vol: vol, count: 1, type: '40ft', level: 'ok',
               text: '✅ 1 × 40ft yeter (%' + fillVol40 + ' hacim)',
               color: '#3B6D11' };
    }
    /* 1×40HC yeterli mi? */
    if (vol <= C40HC_VOL && wt <= C40HC_WT) {
      var fillVol40HC = Math.round((vol / C40HC_VOL) * 100);
      return { wt: wt, vol: vol, count: 1, type: '40HC', level: 'warn',
               text: '✅ 1 × 40HC yeter (%' + fillVol40HC + ' hacim)',
               color: '#185FA5' };
    }
    /* Birden fazla 40HC */
    var needHC = Math.max(Math.ceil(vol / C40HC_VOL), Math.ceil(wt / C40HC_WT));
    var totalCapVol = needHC * C40HC_VOL;
    var fillMulti = Math.round((vol / totalCapVol) * 100);
    return { wt: wt, vol: vol, count: needHC, type: '40HC', level: 'critical',
             text: '🔴 ' + needHC + ' × 40HC gerekli (%' + fillMulti + ' hacim)',
             color: '#A32D2D' };
  };

  window._edEnrich = function(ed) {
    if (!ed) return ed;
    ed.quantityDelivered = window._edCalculateDelivered(ed);
    ed.quantityRemaining = window._edCalculateRemaining(ed);
    ed.remainingDays = window._edCalculateRemainingDays(ed);
    /* LOJ-FIX-001: Sadece ilk aşamalarda (mal henüz hareket etmemiş) overdue ise GECIKTI.
       YOLDA, GUMRUKTE, DEPODA, TESLIM_ALINDI durumlarında kullanıcı seçimini koru. */
    var __earlyStatuses = ['TEDARIK_ASAMASINDA', 'URETIMDE', 'YUKLEME_BEKLIYOR'];
    if (window._edIsOverdue(ed) && __earlyStatuses.indexOf(ed.status) !== -1) {
      ed.status = 'GECIKTI';
    }
    return ed;
  };

  /* ─── VALIDATION ──────────────────────────────────────────── */
  var PRIORITIES = ['LOW', 'NORMAL', 'CRITICAL'];
  var STATUSES = ['SIPARIS_ASAMASINDA','TEDARIK_ASAMASINDA','URETIMDE','SATICIDA_HAZIR','YUKLEME_NOKTASINDA','YUKLEME_PLANLANDI','YUKLEME_BEKLIYOR','SEVK_EDILDI','YOLDA','GUMRUKTE','DEPODA','TESLIM_ALINDI','KONTEYNIRA_YUKLENDI','MUSTERI_TESLIM_ALDI','GECIKTI'];
  var DELAY_OWNERS = ['supplier', 'logistics', 'internal'];

  window._edValidate = function(ed) {
    var errors = [];
    if (!ed) return { valid: false, errors: ['Kayıt boş'] };

    if (!ed.productName) errors.push('Ürün adı zorunlu');
    if (!ed.supplierId) errors.push('Tedarikçi zorunlu');
    if (!ed.responsibleUserId) errors.push('Sorumlu kullanıcı zorunlu');
    if (!ed.responsibleRole) errors.push('Sorumlu rol zorunlu');

    var qty = parseFloat(ed.quantityTotal);
    if (!qty || qty <= 0) errors.push('Miktar 0\'dan büyük olmalı');

    if (ed.proformaDate && ed.estimatedDeliveryDate) {
      if (new Date(ed.proformaDate) > new Date(ed.estimatedDeliveryDate)) {
        errors.push('Proforma tarihi, tahmini teslim tarihinden sonra olamaz');
      }
    }
    if (ed.actualShipmentDate && ed.actualDeliveryDate) {
      if (new Date(ed.actualShipmentDate) > new Date(ed.actualDeliveryDate)) {
        errors.push('Sevk tarihi, teslim tarihinden sonra olamaz');
      }
    }

    if (ed.priority && PRIORITIES.indexOf(ed.priority) === -1) errors.push('Geçersiz öncelik (LOW/NORMAL/CRITICAL)');
    if (ed.status && STATUSES.indexOf(ed.status) === -1) errors.push('Geçersiz durum');
    if (ed.delayOwner && DELAY_OWNERS.indexOf(ed.delayOwner) === -1) errors.push('Geçersiz gecikme sorumlusu');

    return { valid: errors.length === 0, errors: errors };
  };

  /* ─── CREATE / UPDATE / DELETE WRAPPERS ───────────────────── */
  window._edCreate = function(ed) {
    if (!window._edCanManualCreate()) {
      window.toast && window.toast(t('ed.toast.autoMode'), 'err');
      return { success: false, error: 'mode_restricted' };
    }

    ed = ed || {};
    var v = window._edValidate(ed);
    if (!v.valid) {
      window.toast && window.toast(t('ed.toast.missingFields', null, { fields: v.errors.join(', ') }), 'err');
      return { success: false, errors: v.errors };
    }

    var cu = (window.CU && window.CU()) || {};
    ed.id = ed.id || ('ed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    ed.createdAt = ed.createdAt || new Date().toISOString();
    ed.updatedAt = new Date().toISOString();
    ed.createdById = cu.id || cu.uid || 'bilinmiyor';
    ed.isDeleted = false;
    ed.autoGenerated = !!ed.autoGenerated;

    if (!ed.priority) ed.priority = 'NORMAL';
    if (!ed.status) ed.status = 'TEDARIK_ASAMASINDA';
    if (!Array.isArray(ed.deliveries)) ed.deliveries = [];
    if (ed.toleranceDays === undefined || ed.toleranceDays === null) ed.toleranceDays = 3;

    window._edEnrich(ed);

    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    list.push(ed);
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);

    try {
      if (typeof window.logActivity === 'function') {
        window.logActivity('expected_delivery_created', { edId: ed.id, productName: ed.productName, supplierId: ed.supplierId });
      }
    } catch(e) {}

    return { success: true, ed: ed };
  };

  window._edUpdate = function(edId, patch) {
    if (!edId) return { success: false, error: 'id_missing' };
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) return { success: false, error: 'not_found' };

    var merged = Object.assign({}, list[idx], patch || {});
    merged.updatedAt = new Date().toISOString();

    var v = window._edValidate(merged);
    if (!v.valid) return { success: false, errors: v.errors };

    window._edEnrich(merged);
    list[idx] = merged;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    return { success: true, ed: merged };
  };

  window._edDelete = function(edId) {
    if (!edId) return false;
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) return false;
    list[idx].isDeleted = true;
    list[idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    return true;
  };

  /* LOJ-1A: Sil butonu — confirmModal + _edDelete + render */
  window._edDeleteConfirm = function(edId) {
    if (!edId) return;
    if (typeof window.confirmModal !== 'function') {
      window.toast?.(t('ed.toast.confirmModalMissing'), 'err');
      return;
    }
    /* LOJ-1B-H: 48h+ + non-admin → admin onayı talebi */
    var __all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var __ed = __all.find(function(e){ return e.id === edId; });
    if (__ed && !window._edIsAdmin() && window._edIsOlderThan24h(__ed)) {
      window.confirmModal('Bu kayıt 48 saatten eski. Silme talebiniz admin onayına gönderilecek.', {
        title: 'Onay Gerekli',
        danger: false,
        confirmText: 'Talep Gönder',
        cancelText: 'İptal',
        onConfirm: function() {
          var __r = window._edRequestApproval('delete', edId, null);
          if (__r && __r.success === false) return; // dedup → toast _edRequestApproval içinde
          window.toast?.(t('ed.toast.deleteRequestSent'), 'ok');
        }
      });
      return;
    }
    window.confirmModal('Bu kaydı silmek istediğinizden emin misiniz?', {
      title: 'Kayıt Sil',
      danger: true,
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: function() {
        if (window._edDelete(edId)) {
          window.toast?.(t('ed.toast.deleted'), 'ok');
          window._edRefresh?.();
        } else {
          window.toast?.(t('ed.toast.deleteFailed'), 'err');
        }
      }
    });
  };

  /* LOJ-1B-A: Düzenle butonu — modal + submit handler */
  window._edEditModal = function(edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = list.find(function(e) { return e.id === edId; });
    if (!ed) { window.toast?.(t('ed.toast.notFound'), 'err'); return; }
    var ex = document.getElementById('ed-edit-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-edit-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    var statusOpts = [['TEDARIK_ASAMASINDA','Tedarik'],['URETIMDE','Üretimde'],['YUKLEME_BEKLIYOR','Yükleme'],['YOLDA','Yolda'],['TESLIM_ALINDI','Teslim Alındı']];
    var priOpts = [['LOW','Düşük'],['NORMAL','Normal'],['CRITICAL','Kritik']];
    var unitOpts = ['adet','kg','palet','ton','m³','lt','kutu'];
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:600px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:16px">✏️ ' + (typeof window.t === 'function' ? window.t('ed.modal.edit') : 'Kayıt Düzenle') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Ürün Adı *') + '<input id="ede-productName" style="' + _edWizardInput + '" value="' + _uiEsc(ed.productName || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Tedarikçi *') + '<select id="ede-supplierId" onchange="window._edRotaPrefill && window._edRotaPrefill(this.value)" style="' + _edWizardInput + '">' + _edSupplierOpts(ed.supplierId) + '</select></div>'
        + '<div>' + _edWizardLabel('Miktar *') + '<input id="ede-quantityTotal" type="number" min="1" step="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums;text-align:right" value="' + (ed.quantityTotal || '') + '"></div>'
        + '<div>' + _edWizardLabel('Birim') + '<select id="ede-unit" style="' + _edWizardInput + '">' + unitOpts.map(function(u) { return '<option value="' + u + '"' + (ed.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div>'
        + '<div>' + _edWizardLabel('Proforma Tarihi') + '<input id="ede-proformaDate" type="date" style="' + _edWizardInput + '" value="' + (ed.proformaDate || '') + '"></div>'
        + '<div>' + _edWizardLabel('Proforma ID') + '<input id="ede-proformaId" type="text" maxlength="50" placeholder="PRF-2026-001" style="' + _edWizardInput + '" value="' + _uiEsc(ed.proformaId || '') + '"></div>'
        + '<div>' + _edWizardLabel('Tahmini Teslim *') + '<input id="ede-estimatedDeliveryDate" type="date" style="' + _edWizardInput + '" value="' + (ed.estimatedDeliveryDate || '') + '"></div>'
        + '<div>' + _edWizardLabel('Termin (gün)') + '<input id="ede-deliveryTermDays" type="number" min="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.deliveryTermDays || '') + '"></div>'
        + '<div>' + _edWizardLabel('Tolerans (gün)') + '<input id="ede-toleranceDays" type="number" min="0" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.toleranceDays || '') + '"></div>'
        /* V184a2 / LOJ-ROTA-INFO-001: Çıkış-Varış lokasyonu (Türkiye içi) */
        + '<div style="grid-column:span 2;margin-top:6px;padding-top:8px;border-top:0.5px solid var(--b)"><div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:6px">📤 ' + (typeof window.t === 'function' ? window.t('ed.sect.cikis') : 'Çıkış Lokasyonu') + ' <span style="color:var(--t3);font-weight:400">(' + (typeof window.t === 'function' ? window.t('ed.sect.trIci') : 'Türkiye içi') + ')</span></div></div>'
        + '<div>' + _edWizardLabel('Çıkış Şehir *') + '<input id="ede-originCity" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(ed.originCity || '') + '"></div>'
        + '<div>' + _edWizardLabel('Çıkış Bölge *') + '<input id="ede-originDistrict" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(ed.originDistrict || '') + '"></div>'
        + '<div style="grid-column:span 2;margin-top:6px;padding-top:8px;border-top:0.5px solid var(--b)"><div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:6px">🎯 ' + (typeof window.t === 'function' ? window.t('ed.sect.varis') : 'Varış Lokasyonu') + ' <span style="color:var(--t3);font-weight:400">(' + (typeof window.t === 'function' ? window.t('ed.sect.trIci') : 'Türkiye içi') + ')</span></div></div>'
        + '<div>' + _edWizardLabel('Varış Şehir *') + '<input id="ede-destinationCity" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(ed.destinationCity || '') + '"></div>'
        + '<div>' + _edWizardLabel('Varış Bölge *') + '<input id="ede-destinationDistrict" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(ed.destinationDistrict || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Yön') + '<select id="ede-yon" style="' + _edWizardInput + '">' + ['GIDEN','GELEN'].map(function(__y){var __l = __y === 'GIDEN' ? '📤 Giden' : '📥 Gelen'; return '<option value="' + __y + '"' + ((ed.yon || 'GIDEN') === __y ? ' selected' : '') + '>' + __l + '</option>';}).join('') + '</select></div>'
        /* V184d / LOJ-METRICS-001: Teslim Tipi (opsiyonel) */
        + '<div style="grid-column:span 2">' + _edWizardLabel((typeof window.t === 'function' ? window.t('ed.label.teslimTipi') : 'Teslimat Yapan')) + '<select id="ede-teslimTipi" style="' + _edWizardInput + '">' + (function(){var __t = (typeof window.t === 'function') ? window.t : function(k){return k;}; var __cur = (typeof window._resolveTeslimat === 'function') ? window._resolveTeslimat(ed.teslimTipi || '') : (ed.teslimTipi || ''); return [['','ed.teslim.empty'],['MUSTERI','ed.teslim.musteri'],['TEDARIKCI','ed.teslim.tedarikci'],['NAKLIYECI','ed.teslim.nakliyeci'],['DEPO','ed.teslim.depo']].map(function(__o){return '<option value="' + __o[0] + '"' + (__cur === __o[0] ? ' selected' : '') + '>' + __t(__o[1]) + '</option>';}).join('');})() + '</select></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Sorumlu *') + '<select id="ede-responsibleUserId" style="' + _edWizardInput + '">' + _edUserOpts(ed.responsibleUserId) + '</select></div>'
        + '<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--t2);margin-top:8px;padding-top:8px;border-top:0.5px solid var(--b)">' + (typeof window.t === 'function' ? window.t('ed.modal.onayLabel') : 'Onay & Satınalma') + '</div>'
        + '<div>' + _edWizardLabel('Teklif Onaylayan') + '<select id="ede-teklifOnaylayan" style="' + _edWizardInput + '">' + _edUserOpts(ed.teklifOnaylayan || '') + '</select></div>'
        + '<div>' + _edWizardLabel('Teklif Onay Tarihi') + '<input id="ede-teklifOnayTarihi" type="datetime-local" style="' + _edWizardInput + '" value="' + (ed.teklifOnayTarihi || '') + '"></div>'
        + '<div>' + _edWizardLabel('Avans Ödeme Tarihi') + '<input id="ede-avansOdemeTarihi" type="datetime-local" style="' + _edWizardInput + '" value="' + (ed.avansOdemeTarihi || '') + '"></div>'
        + '<div>' + _edWizardLabel('Satınalma Sorumlusu') + '<select id="ede-satinAlmaSorumlusu" style="' + _edWizardInput + '">' + _edUserOpts(ed.satinAlmaSorumlusu || '') + '</select></div>'
        + '<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--t2);margin-top:8px;padding-top:8px;border-top:0.5px solid var(--b)">' + (typeof window.t === 'function' ? window.t('ed.sect.yuklemeDetay') : 'Yükleme Detayı') + '</div>'
        + '<div>' + _edWizardLabel('Sıra No (yükleme)') + '<input id="ede-containerSequenceNo" type="number" min="1" step="1" placeholder="örn: 5" style="' + _edWizardInput + '" value="' + (ed.containerSequenceNo != null ? _uiEsc(String(ed.containerSequenceNo)) : '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Yükleme Önceliği') + '<select id="ede-loadingPriority" style="' + _edWizardInput + '">' + ['','REQUIRED','OPTIONAL'].map(function(__p){var __l = __p === 'REQUIRED' ? '⭐ Zorunlu' : (__p === 'OPTIONAL' ? '○ Opsiyonel' : '— Belirtilmedi —'); return '<option value="' + __p + '"' + ((ed.loadingPriority || '') === __p ? ' selected' : '') + '>' + __l + '</option>';}).join('') + '</select></div>'
        /* V187c — handlingFlags ENUM ARRAY (multi-button toggle grid, full row) */
        + (function(){
            var __enums = window.HANDLING_FLAGS_ENUM || ['DANGEROUS','FRAGILE','KEEP_UPRIGHT','LIQUID_LEAK_RISK','ODOR','PERISHABLE','REFRIGERATED'];
            var __labelMap = window.HANDLING_FLAGS_LABEL_KEY || {};
            var __current = Array.isArray(ed.handlingFlags) ? ed.handlingFlags : [];
            var __t = (typeof window.t === 'function') ? window.t : function(k){return k;};
            var __btns = __enums.map(function(__flag){
              var __act = __current.indexOf(__flag) >= 0;
              var __lbl = __labelMap[__flag] ? __t(__labelMap[__flag]) : __flag;
              return '<button type="button" data-flag="' + __flag + '" data-active="' + (__act ? '1' : '0') + '"'
                + ' onclick="window._edToggleHandling && window._edToggleHandling(\'' + __flag + '\', this)"'
                + ' title="' + _uiEsc(__lbl) + '"'
                + ' style="padding:6px 10px;border:1px solid ' + (__act ? '#2563EB' : 'var(--b)') + ';border-radius:6px;'
                + 'background:' + (__act ? '#DBEAFE' : 'transparent') + ';cursor:pointer;font-size:12px;font-family:inherit;'
                + 'color:var(--t);font-weight:' + (__act ? '600' : '400') + ';transition:border-color 150ms,background 150ms">'
                + _uiEsc(__lbl)
                + '</button>';
            }).join('');
            return '<div style="grid-column:span 2">' + _edWizardLabel(__t('ed.label.handlingFlags'))
              + '<div id="ede-handlingFlags-grid" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2)">'
              + __btns
              + '</div>'
              + '</div>';
          })()
        + '<div>' + _edWizardLabel('Ağırlık (kg)') + '<input id="ede-weightKg" type="number" min="0" step="0.1" placeholder="örn: 2450" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.weightKg || '') + '"></div>'
        + '<div>' + _edWizardLabel('Hacim (m³)') + '<input id="ede-volumeM3" type="number" min="0" step="0.1" placeholder="örn: 12.5" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.volumeM3 || '') + '"></div>'
        + '<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--t2);margin-top:8px;padding-top:8px;border-top:0.5px solid var(--b)">' + (typeof window.t === 'function' ? window.t('ed.sect.paket') : 'Paket Bilgisi') + '</div>'
        + '<div>' + _edWizardLabel('Paket Türü') + '<select id="ede-paketTuru" style="' + _edWizardInput + '"><option value="">— Seç —</option>' + ['palet','koli','big-bag','kafes','cuval','dokme','diger'].map(function(__o){var __l = {palet:'Palet',koli:'Koli','big-bag':'Big Bag',kafes:'Kafes/Kasa',cuval:'Çuval',dokme:'Dökme',diger:'Diğer'}[__o];return '<option value="' + __o + '"' + (ed.paketTuru === __o ? ' selected' : '') + '>' + __l + '</option>';}).join('') + '</select></div>'
        + '<div>' + _edWizardLabel('Paket Adedi') + '<input id="ede-paketAdedi" type="number" min="0" placeholder="örn: 24" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.paketAdedi || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Paket Ebatları') + '<input id="ede-paketEbatlari" placeholder="örn: 120×80×100 cm" style="' + _edWizardInput + '" value="' + _uiEsc(ed.paketEbatlari || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Yükleme Firma') + '<input id="ede-yuklemeFirmaAd" style="' + _edWizardInput + '" value="' + _uiEsc(ed.yuklemeFirmaAd || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Belge / Sözleşme PDF') + '<div style="display:flex;flex-direction:column;gap:6px">' + '<input type="file" accept=".pdf,application/pdf" onchange="window._edUploadBelge && window._edUploadBelge(this)" style="font-size:11px;padding:6px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);font-family:inherit">' + '<input type="hidden" id="ede-belgeUrl" value="' + _uiEsc(ed.belgeUrl || '') + '">' + '<div id="ede-belge-status" style="font-size:11px;color:var(--t3);padding:4px 0">' + (ed.belgeUrl ? '✓ Mevcut belge · <a href="' + _uiEsc(ed.belgeUrl) + '" target="_blank" rel="noopener" style="color:var(--ac)">Görüntüle</a> · <button type="button" onclick="window._edBelgeKaldir && window._edBelgeKaldir()" style="background:none;border:none;cursor:pointer;color:#E0574F;font-size:11px;font-family:inherit;padding:0">🗑️ Kaldır</button>' : 'Belge yok') + '</div>' + '</div></div>'
        + '<div>' + _edWizardLabel('Öncelik') + '<select id="ede-priority" style="' + _edWizardInput + '">' + priOpts.map(function(p) { return '<option value="' + p[0] + '"' + (ed.priority === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></div>'
        + '<div>' + _edWizardLabel('Durum') + '<select id="ede-status" style="' + _edWizardInput + '">' + statusOpts.map(function(st) { return '<option value="' + st[0] + '"' + (ed.status === st[0] ? ' selected' : '') + '>' + st[1] + '</option>'; }).join('') + '</select></div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">'
        + '<button onclick="document.getElementById(\'ed-edit-modal\').remove()" style="padding:8px 14px;border:0.5px solid var(--b);background:transparent;color:var(--t2);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">İptal</button>'
        + '<button onclick="window._edEditSubmit && window._edEditSubmit(\'' + _uiEsc(edId) + '\')" style="padding:8px 16px;border:none;background:#1A8D6F;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(mo);
    /* V184a2 / LOJ-ROTA-INFO-001: eski kayıt soft uyarısı (Q3) — 4 alan boşsa toast */
    if (!ed.originCity || !ed.originDistrict || !ed.destinationCity || !ed.destinationDistrict) {
      if (typeof window.toast === 'function') {
        window.toast(t('ed.toast.oldRecordRoute'), 'warn');
      }
    }
  };

  /* V187c — handlingFlags ENUM ARRAY toggle/getter (eski _edEditModal için).
   * STRICT: enum array (string yok, virgül yok, küçük yazım farkı yok).
   * Veri DOM'da tutulur (button data-active="0|1"), save zamanında okur. */
  window._edToggleHandling = function (flag, btnEl) {
    if (!btnEl) return;
    var isActive = btnEl.dataset.active === '1';
    if (isActive) {
      btnEl.dataset.active = '0';
      btnEl.style.borderColor = 'var(--b)';
      btnEl.style.background = 'transparent';
      btnEl.style.fontWeight = '400';
    } else {
      btnEl.dataset.active = '1';
      btnEl.style.borderColor = '#2563EB';
      btnEl.style.background = '#DBEAFE';
      btnEl.style.fontWeight = '600';
    }
  };
  /* DOM'dan aktif handlingFlags'i array olarak oku (save flow için) */
  window._edGetHandlingFlags = function () {
    var grid = document.getElementById('ede-handlingFlags-grid');
    if (!grid) return [];
    var btns = grid.querySelectorAll('button[data-flag][data-active="1"]');
    var enums = window.HANDLING_FLAGS_ENUM || ['DANGEROUS','FRAGILE','KEEP_UPRIGHT','LIQUID_LEAK_RISK','ODOR','PERISHABLE','REFRIGERATED'];
    var out = [];
    for (var i = 0; i < btns.length; i++) {
      var f = btns[i].dataset.flag;
      if (enums.indexOf(f) >= 0) out.push(f); // enum whitelist (defansif)
    }
    return out;
  };

  /* V184a2 / LOJ-ROTA-INFO-001: Tedarikçi seçilince cari.city → originCity prefill.
   * Hem _edEditModal (ede- prefix) hem yeni kayıt wizard (edw- prefix) için çalışır.
   * Override edilebilir: sadece input boşsa doldurur, mevcut değer korunur.
   * Cari'de district yok (Q2), originDistrict manuel kalır. */
  window._edRotaPrefill = function(supplierId) {
    if (!supplierId) return;
    try {
      var cariList = (typeof window.loadCari === 'function') ? window.loadCari() : [];
      var cari = null;
      for (var i = 0; i < cariList.length; i++) {
        if (String(cariList[i].id) === String(supplierId)) { cari = cariList[i]; break; }
      }
      if (!cari) return;
      var city = cari.city || cari.sehir || '';
      if (!city) return;
      /* Hangi wizard açıksa onun input'unu doldur (ikisi aynı anda DOM'da olamaz) */
      ['ede-originCity', 'edw-originCity'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && !el.value) el.value = city;
      });
    } catch (err) {
      console.warn('[V184a2] _edRotaPrefill hatası:', err);
    }
  };

  window._edEditSubmit = function(edId) {
    var productName = (document.getElementById('ede-productName')?.value || '').trim();
    var supplierId = document.getElementById('ede-supplierId')?.value || '';
    var quantityTotal = parseFloat(document.getElementById('ede-quantityTotal')?.value) || 0;
    if (!productName) { window.toast?.(t('ed.toast.productRequired'), 'err'); return; }
    if (!supplierId) { window.toast?.(t('ed.toast.supplierRequired'), 'err'); return; }
    if (quantityTotal <= 0) { window.toast?.(t('ed.toast.qtyPositive'), 'err'); return; }
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) { window.toast?.(t('ed.toast.notFound'), 'err'); return; }
    /* LOJ-1B-H: 48h+ + non-admin → admin onayı talebi (tüm form payload) */
    if (!window._edIsAdmin() && window._edIsOlderThan24h(list[idx])) {
      var __payload = {
        productName: productName, supplierId: supplierId, quantityTotal: quantityTotal,
        unit: document.getElementById('ede-unit')?.value || list[idx].unit,
        proformaDate: document.getElementById('ede-proformaDate')?.value || '',
        proformaId: document.getElementById('ede-proformaId')?.value || '',
        estimatedDeliveryDate: document.getElementById('ede-estimatedDeliveryDate')?.value || '',
        deliveryTermDays: parseInt(document.getElementById('ede-deliveryTermDays')?.value) || list[idx].deliveryTermDays,
        toleranceDays: parseInt(document.getElementById('ede-toleranceDays')?.value) || 0,
        yon: document.getElementById('ede-yon')?.value || 'GIDEN',
        teslimTipi: document.getElementById('ede-teslimTipi')?.value || '',
        responsibleUserId: document.getElementById('ede-responsibleUserId')?.value || list[idx].responsibleUserId,
        teklifOnaylayan: document.getElementById('ede-teklifOnaylayan')?.value || '',
        teklifOnayTarihi: document.getElementById('ede-teklifOnayTarihi')?.value || '',
        avansOdemeTarihi: document.getElementById('ede-avansOdemeTarihi')?.value || '',
        satinAlmaSorumlusu: document.getElementById('ede-satinAlmaSorumlusu')?.value || '',
        /* V188a: konteynerNo / armator / trackingUrl / varisZamani Sevkiyat Wizard'a taşındı */
        containerSequenceNo: (function(){var v = document.getElementById('ede-containerSequenceNo')?.value; return v ? Number(v) : null;})(),
        loadingPriority: document.getElementById('ede-loadingPriority')?.value || '',
        /* V187c — handlingFlags ENUM ARRAY (approval payload) */
        handlingFlags: (typeof window._edGetHandlingFlags === 'function') ? window._edGetHandlingFlags() : (Array.isArray(list[idx].handlingFlags) ? list[idx].handlingFlags : []),
        /* V184a2 / LOJ-ROTA-INFO-001: Çıkış-Varış lokasyonu (Q4: düzenleme'de validation yok) */
        originCity: (document.getElementById('ede-originCity')?.value || '').trim().slice(0, 50),
        originDistrict: (document.getElementById('ede-originDistrict')?.value || '').trim().slice(0, 50),
        destinationCity: (document.getElementById('ede-destinationCity')?.value || '').trim().slice(0, 50),
        destinationDistrict: (document.getElementById('ede-destinationDistrict')?.value || '').trim().slice(0, 50),
        weightKg: parseFloat(document.getElementById('ede-weightKg')?.value) || null,
        volumeM3: parseFloat(document.getElementById('ede-volumeM3')?.value) || null,
        paketTuru: document.getElementById('ede-paketTuru')?.value || null,
        paketAdedi: parseInt(document.getElementById('ede-paketAdedi')?.value, 10) || null,
        paketEbatlari: (document.getElementById('ede-paketEbatlari')?.value || '').trim() || null,
        yuklemeFirmaAd: document.getElementById('ede-yuklemeFirmaAd')?.value || '',
        belgeUrl: document.getElementById('ede-belgeUrl')?.value || '',
        priority: document.getElementById('ede-priority')?.value || 'NORMAL',
        status: document.getElementById('ede-status')?.value || list[idx].status
      };
      var __r = window._edRequestApproval('update', edId, __payload);
      if (__r && __r.success === false) return; // dedup → toast _edRequestApproval içinde
      document.getElementById('ed-edit-modal')?.remove();
      window.toast?.(t('ed.toast.editRequestSent'), 'ok');
      return;
    }
    list[idx].productName = productName;
    list[idx].supplierId = supplierId;
    list[idx].quantityTotal = quantityTotal;
    list[idx].unit = document.getElementById('ede-unit')?.value || list[idx].unit;
    list[idx].proformaDate = document.getElementById('ede-proformaDate')?.value || '';
    list[idx].proformaId = document.getElementById('ede-proformaId')?.value || '';
    list[idx].estimatedDeliveryDate = document.getElementById('ede-estimatedDeliveryDate')?.value || '';
    list[idx].deliveryTermDays = parseInt(document.getElementById('ede-deliveryTermDays')?.value) || list[idx].deliveryTermDays;
    list[idx].toleranceDays = parseInt(document.getElementById('ede-toleranceDays')?.value) || 0;
    list[idx].yon = document.getElementById('ede-yon')?.value || 'GIDEN';
    list[idx].teslimTipi = document.getElementById('ede-teslimTipi')?.value || '';
    list[idx].responsibleUserId = document.getElementById('ede-responsibleUserId')?.value || list[idx].responsibleUserId;
    list[idx].teklifOnaylayan = document.getElementById('ede-teklifOnaylayan')?.value || '';
    list[idx].teklifOnayTarihi = document.getElementById('ede-teklifOnayTarihi')?.value || '';
    list[idx].avansOdemeTarihi = document.getElementById('ede-avansOdemeTarihi')?.value || '';
    list[idx].satinAlmaSorumlusu = document.getElementById('ede-satinAlmaSorumlusu')?.value || '';
    /* V188a: konteynerNo Sevkiyat Wizard'a taşındı */
    var __seqVal = document.getElementById('ede-containerSequenceNo')?.value;
    list[idx].containerSequenceNo = __seqVal ? Number(__seqVal) : null;
    list[idx].loadingPriority = document.getElementById('ede-loadingPriority')?.value || '';
    /* V187c — handlingFlags ENUM ARRAY (direct save) */
    list[idx].handlingFlags = (typeof window._edGetHandlingFlags === 'function') ? window._edGetHandlingFlags() : (Array.isArray(list[idx].handlingFlags) ? list[idx].handlingFlags : []);
    /* V184a2 / LOJ-ROTA-INFO-001: rota alanları (direct save path - eksikti) */
    list[idx].originCity = (document.getElementById('ede-originCity')?.value || '').trim().slice(0, 50);
    list[idx].originDistrict = (document.getElementById('ede-originDistrict')?.value || '').trim().slice(0, 50);
    list[idx].destinationCity = (document.getElementById('ede-destinationCity')?.value || '').trim().slice(0, 50);
    list[idx].destinationDistrict = (document.getElementById('ede-destinationDistrict')?.value || '').trim().slice(0, 50);
    list[idx].weightKg = parseFloat(document.getElementById('ede-weightKg')?.value) || null;
    list[idx].volumeM3 = parseFloat(document.getElementById('ede-volumeM3')?.value) || null;
    list[idx].paketTuru = document.getElementById('ede-paketTuru')?.value || null;
    list[idx].paketAdedi = parseInt(document.getElementById('ede-paketAdedi')?.value, 10) || null;
    list[idx].paketEbatlari = (document.getElementById('ede-paketEbatlari')?.value || '').trim() || null;
    /* V188a: armator / trackingUrl / varisZamani Sevkiyat Wizard'a taşındı */
    list[idx].yuklemeFirmaAd = document.getElementById('ede-yuklemeFirmaAd')?.value || '';
    list[idx].belgeUrl = document.getElementById('ede-belgeUrl')?.value || '';
    list[idx].priority = document.getElementById('ede-priority')?.value || 'NORMAL';
    list[idx].status = document.getElementById('ede-status')?.value || list[idx].status;
    list[idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    document.getElementById('ed-edit-modal')?.remove();
    window.toast?.(t('ed.toast.updated'), 'ok');
    window._edRefresh?.();
  };

  /* LOJ-1B-C1: Inline status combobox + statusHistory */
  window._edStatusChange = function(edId, newStatus) {
    if (!edId || !newStatus) return;
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) { window.toast?.(t('ed.toast.notFound'), 'err'); return; }
    var ed = list[idx];
    if (ed.status === newStatus) return;
    /* V184b / LOJ-STATUS-EXPAND-001: non-admin geri-dönüş engeli (GECIKTI sıra dışı, her yerden gidebilir) */
    if (typeof window._edIsAdmin === 'function' && !window._edIsAdmin()) {
      var oldOrder = STATUS_ORDER[ed.status] || 0;
      var newOrder = STATUS_ORDER[newStatus] || 0;
      if (oldOrder > 0 && newOrder > 0 && newOrder < oldOrder) {
        window.toast?.(t('ed.toast.statusBackwardBlocked'), 'warn');
        /* V185 / B5: status backward block audit log (güvenlik olayı) */
        try { if (typeof window.logActivity === 'function') window.logActivity('ed_status_backward_blocked', 'edId=' + edId + ' from=' + ed.status + ' to=' + newStatus); } catch(e) {}
        if (typeof window._edRefresh === 'function') window._edRefresh();
        return;
      }
    }
    if (!Array.isArray(ed.statusHistory)) ed.statusHistory = [];
    ed.statusHistory.push({
      from: ed.status || '',
      to: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: window._currentUser?.id || window._currentUserId || null
    });
    ed.status = newStatus;
    ed.statusUpdatedAt = new Date().toISOString();
    ed.updatedAt = new Date().toISOString();
    list[idx] = ed;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    var label = STATUS_LABELS[newStatus] || newStatus;
    window.toast?.(t('ed.toast.statusUpdated', null, { label: label }), 'ok');
    /* V185 / B5: status değişim audit log */
    try { if (typeof window.logActivity === 'function') window.logActivity('ed_status_changed', 'edId=' + edId + ' from=' + (ed.statusHistory[ed.statusHistory.length - 1]?.from || '') + ' to=' + newStatus); } catch(e) {}
    window._edRefresh?.();
  };

  /* LOJ-1B-C2: Armatör seçildiğinde tracking URL otomatik dolum
     13 carrier URL pattern (kargo modülündeki autoFillKonteynUrl ile aynı) */
  window._edAutoFillTrackingUrl = function() {
    /* V187d: Merkezi config (carrier_tracking_map.js) kullanılır.
     * Container No varsa URL'e otomatik gömülür ({CONTAINER} placeholder). */
    var hat = document.getElementById('ede-armator')?.value || '';
    var containerNo = document.getElementById('ede-konteynerNo')?.value || '';
    var input = document.getElementById('ede-trackingUrl');
    if (!input || !hat) return;
    var url = (typeof window.__buildTrackingUrl === 'function')
      ? window.__buildTrackingUrl(hat, containerNo)
      : '';
    if (url) input.value = url;
  };

  /* LOJ-1B-C3: Tracking URL'i yeni sekmede aç (🔗 Aç butonu handler) */
  window._edOpenTrackingUrl = function() {
    var u = (document.getElementById('ede-trackingUrl')?.value || '').trim();
    if (!u) { window.toast?.(t('ed.toast.urlEmpty'), 'err'); return; }
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  /* LOJ-1B-C4: PDF eki Storage upload + kaldırma */
  window._edUploadBelge = async function(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    var file = fileInput.files[0];
    if (file['size'] > 20 * 1024 * 1024) { window.toast?.(t('ed.toast.fileTooLarge'), 'err'); return; }
    if (typeof window._uploadBase64ToStorage !== 'function') {
      window.toast?.(t('ed.toast.storageMissing'), 'err'); return;
    }
    var statusEl = document.getElementById('ede-belge-status');
    var urlEl = document.getElementById('ede-belgeUrl');
    if (statusEl) statusEl.textContent = 'Yükleniyor...';
    try {
      var dataUrl = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      var url = await window._uploadBase64ToStorage(dataUrl, file['name'], 'expected-deliveries-belge');
      if (urlEl) urlEl.value = url;
      var fnameEsc = (window._uiEsc || window._esc || function(x){return x;})(file['name']);
      if (statusEl) statusEl.innerHTML = '✓ Yüklendi: ' + fnameEsc + ' · <a href="' + url + '" target="_blank" rel="noopener" style="color:var(--ac)">Görüntüle</a> · <button type="button" onclick="window._edBelgeKaldir && window._edBelgeKaldir()" style="background:none;border:none;cursor:pointer;color:#E0574F;font-size:11px;font-family:inherit;padding:0">🗑️ Kaldır</button>';
      window.toast?.(t('ed.toast.fileUploaded'), 'ok');
    } catch (err) {
      window.toast?.(t('ed.toast.uploadFailed', null, { err: (err && err.message) || String(err) }), 'err');
      if (statusEl) statusEl.textContent = 'Belge yok';
    }
  };

  window._edBelgeKaldir = function() {
    var urlEl = document.getElementById('ede-belgeUrl');
    var statusEl = document.getElementById('ede-belge-status');
    if (urlEl) urlEl.value = '';
    if (statusEl) statusEl.textContent = 'Belge yok';
  };

  /* ════════════════════════════════════════════════════════════════
   * V189b — ARAMA HELPER'LARI (KX10 — tek kaynak)
   * ────────────────────────────────────────────────────────────────
   * P0-1: Eksik alanlar (ihracatId, siparisKodu, armator, sorumlu, vs.)
   * P0-2: Türkçe karakter normalleşmesi (İ→i, I→ı)
   * Yeni aranabilir alan eklemek için yalnızca _edBuildSearchHaystack
   * helper'ı düzenlenir — _edApplyFilterState ve renderEdList ortak okur.
   * ════════════════════════════════════════════════════════════════ */

  /* V189b — Türkçe-bilinçli lowercase. JS toLowerCase 'İ' → 'i̇' (i+combining dot)
   * üretir, hem 'ı' (dotless i) hem 'i' (dotted i) ile karışır. Bu helper
   * önce 'İ'→'i' ve 'I'→'ı' map'lediği için Türkçe arama tutarlı çalışır. */
  function _edTurkishLower(s) {
    if (s == null) return '';
    return String(s)
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase();
  }
  if (!window._edTurkishLower) window._edTurkishLower = _edTurkishLower;

  /* V189b — KX10 tek kaynak: aranabilir alanları tek string'e birleştirir.
   * Türkçe-bilinçli lowercase uygulanır.
   * Yeni alan eklemek için sadece bu listeye ekle. */
  function _edBuildSearchHaystack(ed, cariMap, userMap) {
    if (!ed) return '';
    cariMap = cariMap || {};
    userMap = userMap || {};
    var supplierName    = cariMap[String(ed.supplierId || '')]            || '';
    var responsibleName = userMap[String(ed.responsibleUserId || '')]     || '';
    var fields = [
      ed.id              || '',
      ed.ihracatId       || '',
      ed.siparisKodu     || '',
      ed.productName     || '',
      ed.supplierId      || '',
      supplierName,
      ed.konteynerNo     || '',
      ed.armator         || '',
      ed.trackingUrl     || '',
      ed.proformaId      || '',
      ed.yuklemeFirmaAd  || '',
      ed.originCity      || '',
      ed.originDistrict  || '',
      ed.destinationCity || '',
      ed.destinationDistrict || '',
      responsibleName
    ];
    return _edTurkishLower(fields.join(' '));
  }
  if (!window._edBuildSearchHaystack) window._edBuildSearchHaystack = _edBuildSearchHaystack;

  /* LOJ-1B-D: Filter state update + re-render */
  window._edFilter = function(field, value) {
    if (!window._edFilterState) window._edFilterState = { yon: '', status: '', search: '' };
    window._edFilterState[field] = value;
    var container = document.getElementById('ed-list-container');
    if (container && typeof window.renderEdList === 'function') {
      container.outerHTML = window.renderEdList();
    }
  };

  /* V187j — _edFilterState'i bir listeye uygula (Excel/JSON export ortak mantık).
   * KX10: tek kaynak — renderEdList'teki filter logic'i ile birebir aynı kurallar.
   * V189b — arama: _edBuildSearchHaystack + _edTurkishLower (Türkçe + 16 alan). */
  window._edApplyFilterState = function (list) {
    if (!Array.isArray(list)) return [];
    if (!window._edFilterState) window._edFilterState = { yon: '', status: '', search: '' };
    var fs = window._edFilterState;
    var cariMap = {};
    try {
      (typeof window.loadCari === 'function' ? window.loadCari() : []).forEach(function (c) {
        if (c && c.id) cariMap[String(c.id)] = c.name || c.unvan || c.ad || c.firmaAdi || '';
      });
    } catch (e) {}
    /* V189b — userMap (sorumlu adı arama için, helper iterasyon dışı build) */
    var userMap = {};
    try {
      (typeof window.loadUsers === 'function' ? window.loadUsers() : []).forEach(function (u) {
        if (u && u.id) userMap[String(u.id)] = u.name || u.displayName || u.ad || u.email || '';
      });
    } catch (e) {}
    /* V189b — query bir kez normalize et (her ed için tekrar etmesin) */
    var q = fs.search ? _edTurkishLower(String(fs.search).trim()) : '';
    return list.filter(function (ed) {
      if (fs.yon && (ed.yon || 'GIDEN') !== fs.yon) return false;
      if (fs.status && ed.status !== fs.status) return false;
      if (q) {
        var hay = _edBuildSearchHaystack(ed, cariMap, userMap);
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  };

  /* LOJ-1B-E: Eke göz at — belge varsa yeni sekmede aç, yoksa toast */
  window._edEkeGozAt = function(edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = list.find(function(e){ return e.id === edId; });
    if (!ed || !ed.belgeUrl) {
      window.toast?.(t('ed.toast.noFiles'), 'err');
      return;
    }
    window.open(ed.belgeUrl, '_blank', 'noopener,noreferrer');
  };

  /* LOJ-FIX-002: Tek noktadan ed re-render — ana panel + Sevkiyat Merkezi tablosu */
  window._edRefresh = function() {
    if (typeof window._edRenderPanel === 'function') window._edRenderPanel();
    var container = document.getElementById('ed-list-container');
    if (container && typeof window.renderEdList === 'function') {
      container.outerHTML = window.renderEdList();
    }
  };

  /* LOJ-1B-H: Pending actions (admin onay sistemi) — 48h+ non-admin sil/düzenle talepleri */
  var PENDING_KEY = 'ak_ed_pending_v1';
  window._edPendingActionsLoad = function() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') || []; } catch(e) { return []; }
  };
  window._edPendingActionsStore = function(list) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list || [])); } catch(e) {}
  };
  window._edIsAdmin = function() {
    if (typeof window.isAdmin === 'function') return !!window.isAdmin();
    var cu = (typeof window.CU === 'function' ? window.CU() : null) || {};
    return (cu.role || cu.rol) === 'admin';
  };
  window._edIsOlderThan24h = function(ed) {
    if (!ed) return false;
    var ts = 0;
    if (ed.createdAt) {
      ts = new Date(ed.createdAt).getTime();
    } else if (ed.id && typeof ed.id === 'string') {
      var m = ed.id.match(/^ed_(\d+)/);
      if (m) ts = parseInt(m[1], 10);
    }
    if (!ts || isNaN(ts)) return false;
    return (Date.now() - ts) > 172800000;
  };
  window._edRequestApproval = function(action, edId, payload) {
    var cu = (typeof window.CU === 'function' ? window.CU() : null) || {};
    var list = window._edPendingActionsLoad();
    /* V185 / B2: dedup — aynı edId + action için zaten pending varsa engelle */
    var existing = null;
    for (var __dx = 0; __dx < list.length; __dx++) {
      var __pa = list[__dx];
      if (__pa.status === 'pending' && String(__pa.edId) === String(edId) && __pa.action === action) {
        existing = __pa; break;
      }
    }
    if (existing) {
      var actionLabel = action === 'delete' ? t('ed.actionLabel.delete') : (action === 'update' ? t('ed.actionLabel.update') : action);
      window.toast?.(t('ed.toast.dedupBlocked', null, { action: actionLabel }), 'warn');
      try { if (typeof window.logActivity === 'function') window.logActivity('ed_pending_dedup_blocked', 'edId=' + edId + ' action=' + action + ' existingId=' + existing.id); } catch(e) {}
      return { success: false, error: 'duplicate_pending', existingId: existing.id };
    }
    list.push({
      id: 'pa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      edId: edId,
      action: action,
      payload: payload || null,
      requestedBy: cu.id || cu.uid || null,
      requestedByName: cu.name || cu.displayName || '—',
      requestedAt: new Date().toISOString(),
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null
    });
    window._edPendingActionsStore(list);
    /* V185 / B5: tahkim talep audit log */
    try { if (typeof window.logActivity === 'function') window.logActivity('ed_pending_request', 'action=' + action + ' edId=' + edId); } catch(e) {}
    return { success: true };
  };

  /* LOJ-1B-I: Admin onay UI — pending listeyi modal'da göster, onayla/reddet */
  window._edApprovePending = function(actionId) {
    if (!actionId) return;
    if (!window._edIsAdmin()) { window.toast?.(t('ed.toast.adminApproveOnly'), 'err'); return; }
    var actions = window._edPendingActionsLoad();
    var ai = -1;
    for (var i = 0; i < actions.length; i++) { if (actions[i].id === actionId) { ai = i; break; } }
    if (ai === -1) { window.toast?.(t('ed.toast.requestNotFound'), 'err'); return; }
    var action = actions[ai];
    if (action.status !== 'pending') { window.toast?.(t('ed.toast.requestAlreadyReviewed'), 'warn'); return; }
    /* V185 / B1: Self-onay engeli — talep eden kendi talebini onaylayamaz (4-göz ilkesi) */
    var __cuB1 = (typeof window.CU === 'function' ? window.CU() : null) || {};
    var __cuB1Id = __cuB1.id || __cuB1.uid || null;
    if (action.requestedBy && __cuB1Id && String(action.requestedBy) === String(__cuB1Id)) {
      window.toast?.(t('ed.toast.selfApproveBlocked'), 'err');
      /* V185 / B5: self-approve block audit log (güvenlik olayı) */
      try { if (typeof window.logActivity === 'function') window.logActivity('ed_pending_self_approve_blocked', 'actionId=' + actionId + ' edId=' + action.edId); } catch(e) {}
      return;
    }
    var ok = false;
    if (action.action === 'delete') {
      /* LOJ-1B-K: Approved delete audit log — soft delete sayesinde statusHistory korunur */
      var __delList = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      var __delIdx = -1;
      for (var __m = 0; __m < __delList.length; __m++) { if (__delList[__m].id === action.edId) { __delIdx = __m; break; } }
      if (__delIdx !== -1) {
        if (!Array.isArray(__delList[__delIdx].statusHistory)) __delList[__delIdx].statusHistory = [];
        var __cu = (typeof window['CU'] === 'function') ? window['CU']() : null;
        var __cuId = __cu ? (__cu.id || __cu.uid) : null;
        __delList[__delIdx].statusHistory.push({
          type: 'approved_delete',
          by: __cuId,
          requestedBy: action.requestedBy || null,
          at: new Date().toISOString()
        });
        if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(__delList);
      }
      ok = window._edDelete(action.edId);
    } else if (action.action === 'update' && action.payload) {
      var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      var idx = -1;
      for (var j = 0; j < list.length; j++) { if (list[j].id === action.edId) { idx = j; break; } }
      if (idx !== -1) {
        Object.assign(list[idx], action.payload);
        list[idx].updatedAt = new Date().toISOString();
        /* LOJ-1B-F: Approved update audit log */
        if (!Array.isArray(list[idx].statusHistory)) list[idx].statusHistory = [];
        list[idx].statusHistory.push({
          type: 'approved_update',
          by: (window.CU && window.CU() && (window.CU().id || window.CU().uid)) || null,
          requestedBy: action.requestedBy || null,
          fields: Object.keys(action.payload),
          at: new Date().toISOString()
        });
        if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
        ok = true;
      }
    }
    if (!ok) { window.toast?.(t('ed.toast.applyFailed'), 'err'); return; }
    var cu = (typeof window.CU === 'function' ? window.CU() : null) || {};
    actions[ai].status = 'approved';
    actions[ai].reviewedBy = cu.id || cu.uid || null;
    actions[ai].reviewedByName = cu.name || cu.displayName || '—';
    actions[ai].reviewedAt = new Date().toISOString();
    window._edPendingActionsStore(actions);
    window.toast?.(t('ed.toast.requestApproved'), 'ok');
    /* V185 / B5: tahkim onay audit log */
    try { if (typeof window.logActivity === 'function') window.logActivity('ed_pending_approved', 'actionId=' + actionId + ' edId=' + actions[ai].edId + ' action=' + actions[ai].action); } catch(e) {}
    document.getElementById('ed-pending-modal')?.remove();
    window._edRefresh?.();
  };

  window._edRejectPending = function(actionId) {
    if (!actionId) return;
    if (!window._edIsAdmin()) { window.toast?.(t('ed.toast.adminRejectOnly'), 'err'); return; }
    var actions = window._edPendingActionsLoad();
    var ai = -1;
    for (var i = 0; i < actions.length; i++) { if (actions[i].id === actionId) { ai = i; break; } }
    if (ai === -1) { window.toast?.(t('ed.toast.requestNotFound'), 'err'); return; }
    if (actions[ai].status !== 'pending') { window.toast?.(t('ed.toast.requestAlreadyReviewed'), 'warn'); return; }
    var cu = (typeof window.CU === 'function' ? window.CU() : null) || {};
    /* LOJ-1B-F: Rejected action audit log — ed bulunduysa statusHistory'ye yaz */
    var __action = actions[ai];
    var __edList = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var __edIdx = -1;
    for (var __k = 0; __k < __edList.length; __k++) { if (__edList[__k].id === __action.edId) { __edIdx = __k; break; } }
    if (__edIdx !== -1) {
      if (!Array.isArray(__edList[__edIdx].statusHistory)) __edList[__edIdx].statusHistory = [];
      __edList[__edIdx].statusHistory.push({
        type: 'rejected_' + __action.action,
        by: cu.id || cu.uid || null,
        requestedBy: __action.requestedBy || null,
        at: new Date().toISOString()
      });
      if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(__edList);
    }
    actions[ai].status = 'rejected';
    actions[ai].reviewedBy = cu.id || cu.uid || null;
    actions[ai].reviewedByName = cu.name || cu.displayName || '—';
    actions[ai].reviewedAt = new Date().toISOString();
    window._edPendingActionsStore(actions);
    window.toast?.(t('ed.toast.requestRejected'), 'ok');
    /* V185 / B5: tahkim red audit log */
    try { if (typeof window.logActivity === 'function') window.logActivity('ed_pending_rejected', 'actionId=' + actionId + ' edId=' + __action.edId + ' action=' + __action.action); } catch(e) {}
    document.getElementById('ed-pending-modal')?.remove();
    if (typeof window._edPendingModalOpen === 'function') window._edPendingModalOpen();
    window._edRefresh?.();
  };

  /* V185 / B3: Yaş göstergesi — "X saat/gün önce" */
  function _edPendingTimeAgo(iso) {
    if (!iso) return '—';
    try {
      var t = new Date(iso).getTime();
      if (isNaN(t)) return '—';
      var diff = Date.now() - t;
      var min = Math.floor(diff / 60000);
      if (min < 1) return 'şimdi';
      if (min < 60) return min + ' dk önce';
      var hr = Math.floor(min / 60);
      if (hr < 24) return hr + ' saat önce';
      var day = Math.floor(hr / 24);
      return day + ' gün önce';
    } catch(e) { return '—'; }
  }

  /* V185 / B3: Tek talep kartı — sol renkli kenarlık + yaş + vurgulu talep eden */
  function _edPendingCardHtml(a, edMap, esc) {
    var ed = edMap[a.edId] || { productName: '(silinmiş)' };
    var dateStr = a.requestedAt ? new Date(a.requestedAt).toLocaleString('tr-TR') : '—';
    var ageStr = _edPendingTimeAgo(a.requestedAt);
    var isDelete = a.action === 'delete';
    var actionLabel = isDelete ? '🗑️ Silme' : '✏️ Güncelleme';
    var sideColor = isDelete ? '#DC2626' : '#185FA5';
    var bgTint = isDelete ? 'rgba(220,38,38,.04)' : 'rgba(24,95,165,.04)';
    /* 24h+ bekleyen talep — yaş badge kırmızı */
    var ageOld = false;
    try { ageOld = (Date.now() - new Date(a.requestedAt).getTime()) > 86400000; } catch(e) {}
    var ageBadgeBg = ageOld ? '#DC2626' : '#6B7280';
    var detailBtn = a.action === 'update' && a.payload
      ? '<button onclick="event.stopPropagation();var d=document.getElementById(\'pa-detail-' + esc(a.id) + '\');if(d)d.style.display=d.style.display===\'none\'?\'block\':\'none\';" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;margin-right:4px">Detay</button>'
      : '';
    var detailDiv = a.action === 'update' && a.payload
      ? '<div id="pa-detail-' + esc(a.id) + '" style="display:none;margin-top:8px;padding:8px;background:var(--s2);border-radius:6px;font-size:10px;font-family:monospace;color:var(--t3);max-height:150px;overflow-y:auto">' + esc(JSON.stringify(a.payload, null, 2)) + '</div>'
      : '';
    return '<div data-pa-action="' + esc(a.action) + '" style="border:0.5px solid var(--b);border-left:4px solid ' + sideColor + ';border-radius:8px;padding:12px 14px;margin-bottom:8px;background:' + bgTint + '">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:13px;font-weight:500;color:var(--t)">' + esc(ed.productName || '—') + '</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
            + '<span style="color:' + sideColor + ';font-weight:600">' + actionLabel + '</span>'
            + '<span style="background:var(--s2);padding:2px 7px;border-radius:10px;font-weight:500;color:var(--t2)">👤 ' + esc(a.requestedByName || '—') + '</span>'
            + '<span style="background:' + ageBadgeBg + ';color:#fff;padding:2px 7px;border-radius:10px;font-weight:500;font-size:10px" title="' + esc(dateStr) + '">⏱ ' + ageStr + '</span>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px;flex-shrink:0">'
          + detailBtn
          + '<button onclick="window._edApprovePending && window._edApprovePending(\'' + esc(a.id) + '\')" style="font-size:11px;padding:5px 12px;border:none;border-radius:6px;background:#16A34A;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">✅ Onayla</button>'
          + '<button onclick="window._edRejectPending && window._edRejectPending(\'' + esc(a.id) + '\')" style="font-size:11px;padding:5px 12px;border:none;border-radius:6px;background:#DC2626;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">❌ Reddet</button>'
        + '</div>'
      + '</div>'
      + detailDiv
    + '</div>';
  }

  /* V185 / B3: filtre değişimi — JS yerine CSS display ile */
  window._edPendingFilter = function(kind) {
    var modal = document.getElementById('ed-pending-modal');
    if (!modal) return;
    var cards = modal.querySelectorAll('[data-pa-action]');
    cards.forEach(function(c) {
      var a = c.getAttribute('data-pa-action');
      c.style.display = (kind === 'all' || a === kind) ? '' : 'none';
    });
    /* Aktif rozet stilini güncelle */
    modal.querySelectorAll('[data-pa-filter]').forEach(function(b) {
      var k = b.getAttribute('data-pa-filter');
      if (k === kind) {
        b.style.background = 'var(--t)'; b.style.color = 'var(--sf)';
      } else {
        b.style.background = 'transparent'; b.style.color = 'var(--t2)';
      }
    });
  };

  window._edPendingModalOpen = function() {
    if (!window._edIsAdmin()) { window.toast?.(t('ed.toast.adminOnly'), 'err'); return; }
    var ex = document.getElementById('ed-pending-modal'); if (ex) ex.remove();
    var actions = (window._edPendingActionsLoad() || []).filter(function(a){ return a.status === 'pending'; });
    /* V185 / B3: en eski üstte — acil olanlar (uzun bekleyen) önce işlenir */
    actions.sort(function(a, b) {
      var ta = new Date(a.requestedAt || 0).getTime() || 0;
      var tb = new Date(b.requestedAt || 0).getTime() || 0;
      return ta - tb;
    });
    var edList = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var edMap = {};
    edList.forEach(function(e){ edMap[e.id] = e; });
    var esc = window._uiEsc || function(s){return String(s||'');};
    /* V185 / B3: filtre sayıları */
    var nDel = 0, nUpd = 0;
    actions.forEach(function(a) { if (a.action === 'delete') nDel++; else if (a.action === 'update') nUpd++; });
    var mo = document.createElement('div');
    mo.id = 'ed-pending-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    var rows = actions.length === 0
      ? '<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">🎉 Bekleyen talep yok</div>'
      : actions.map(function(a){ return _edPendingCardHtml(a, edMap, esc); }).join('');
    /* V185 / B3: filtre rozetleri (sadece talep varsa göster) */
    var filterBar = actions.length === 0 ? '' :
      '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'
      + '<button data-pa-filter="all" onclick="window._edPendingFilter(\'all\')" style="font-size:11px;padding:5px 11px;border:0.5px solid var(--b);border-radius:14px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Hepsi (' + actions.length + ')</button>'
      + (nDel > 0 ? '<button data-pa-filter="delete" onclick="window._edPendingFilter(\'delete\')" style="font-size:11px;padding:5px 11px;border:0.5px solid #DC262633;border-radius:14px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit;font-weight:500">🗑️ Silme (' + nDel + ')</button>' : '')
      + (nUpd > 0 ? '<button data-pa-filter="update" onclick="window._edPendingFilter(\'update\')" style="font-size:11px;padding:5px 11px;border:0.5px solid #185FA533;border-radius:14px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit;font-weight:500">✏️ Güncelleme (' + nUpd + ')</button>' : '')
      + '</div>';
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:680px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
        + '<div style="font-size:15px;font-weight:600;color:var(--t)">🔔 ' + (typeof window.t === 'function' ? window.t('ed.pending.title') : 'Onay Bekleyen Talepler') + ' (' + actions.length + ')</div>'
        + '<button onclick="document.getElementById(\'ed-pending-modal\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
      + '</div>'
      + filterBar
      + rows
    + '</div>';
    document.body.appendChild(mo);
  };

  window._edPendingBtnHTML = function() {
    if (!window._edIsAdmin?.()) return '';
    var pc = (window._edPendingActionsLoad?.() || []).filter(function(a){return a.status === 'pending';}).length;
    var bg = pc > 0 ? '#FEE2E2' : 'transparent';
    var color = pc > 0 ? '#DC2626' : 'var(--t2)';
    var border = pc > 0 ? '#DC2626' : 'var(--b)';
    var label = pc > 0 ? '🔔 Onay (' + pc + ')' : '🔔 Onay';
    return '<button onclick="window._edPendingModalOpen && window._edPendingModalOpen()" style="margin-left:6px;padding:5px 10px;border:0.5px solid ' + border + ';border-radius:6px;background:' + bg + ';color:' + color + ';cursor:pointer;font-size:11px;font-family:inherit" title="Onay bekleyen talepler">' + label + '</button>';
  };

  /* ─── PARÇA 2: DELIVERY MANAGEMENT ──────────────────────── */
  var _edFindRaw = function(edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) return { list: list, idx: i }; }
    return { list: list, idx: -1 };
  };

  window._edAddDelivery = function(edId, delivery) {
    if (!delivery || typeof delivery.qty !== 'number' || delivery.qty <= 0) {
      return { success: false, error: 'Geçersiz miktar (qty > 0 olmalı)' };
    }
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    var ed = f.list[f.idx];
    if (!Array.isArray(ed.deliveries)) ed.deliveries = [];

    var delivered = window._edCalculateDelivered(ed);
    var remaining = (parseFloat(ed.quantityTotal) || 0) - delivered;
    if (delivery.qty > remaining) {
      return { success: false, error: 'Miktar kalan sınırını aşıyor (kalan: ' + remaining + ', eklenen: ' + delivery.qty + ')' };
    }

    delivery.status = delivery.status || 'shipped';
    delivery.shipmentDate = delivery.shipmentDate || new Date().toISOString();
    delivery.addedAt = new Date().toISOString();

    ed.deliveries.push(delivery);
    ed.updatedAt = new Date().toISOString();

    if (!ed.actualShipmentDate && delivery.shipmentDate) {
      ed.actualShipmentDate = delivery.shipmentDate;
      if (ed.status === 'TEDARIK_ASAMASINDA' || ed.status === 'URETIMDE') ed.status = 'YOLDA';
    }

    window._edEnrich(ed);
    f.list[f.idx] = ed;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);

    try { if (typeof window.logActivity === 'function') window.logActivity('expected_delivery_partial_added', { edId: edId, qty: delivery.qty }); } catch(e) {}
    return { success: true, ed: ed };
  };

  window._edMarkDelivered = function(edId, deliveryIdx) {
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    var ed = f.list[f.idx];
    if (!Array.isArray(ed.deliveries) || !ed.deliveries[deliveryIdx]) return { success: false, error: 'invalid_delivery_idx' };

    ed.deliveries[deliveryIdx].status = 'delivered';
    ed.deliveries[deliveryIdx].deliveryDate = ed.deliveries[deliveryIdx].deliveryDate || new Date().toISOString();
    ed.updatedAt = new Date().toISOString();

    if (!ed.actualDeliveryDate) ed.actualDeliveryDate = ed.deliveries[deliveryIdx].deliveryDate;

    window._edEnrich(ed);
    if (ed.quantityRemaining === 0) ed.status = 'TESLIM_ALINDI';

    f.list[f.idx] = ed;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);
    return { success: true, ed: ed };
  };

  window._edMarkShipped = function(edId, deliveryIdx) {
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    var ed = f.list[f.idx];
    if (!Array.isArray(ed.deliveries) || !ed.deliveries[deliveryIdx]) return { success: false, error: 'invalid_delivery_idx' };
    ed.deliveries[deliveryIdx].status = 'in-transit';
    ed.updatedAt = new Date().toISOString();
    f.list[f.idx] = ed;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);
    return { success: true, ed: ed };
  };

  window._edSetDelayOwner = function(edId, owner, reason) {
    if (DELAY_OWNERS.indexOf(owner) === -1) return { success: false, error: 'Geçersiz owner (supplier/logistics/internal)' };
    if (!reason || String(reason).trim().length < 10) return { success: false, error: 'Gecikme sebebi minimum 10 karakter' };
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    f.list[f.idx].delayOwner = owner;
    f.list[f.idx].delayReason = String(reason).trim();
    f.list[f.idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);
    return { success: true, ed: f.list[f.idx] };
  };

  window._edUpdatePriority = function(edId, priority) {
    if (PRIORITIES.indexOf(priority) === -1) return { success: false, error: 'Geçersiz öncelik' };
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    f.list[f.idx].priority = priority;
    f.list[f.idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);
    return { success: true, ed: f.list[f.idx] };
  };

  /* ─── PARÇA 2: QUERY HELPERS (PARÇA 6 UI için temel) ────── */
  window._edFilterByStatus = function(status) {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    return all.filter(function(e) { return e.status === status; });
  };

  window._edFilterOverdue = function() {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    return all.filter(function(e) { return window._edIsOverdue(e) && e.status !== 'TESLIM_ALINDI'; });
  };

  window._edFilterCritical = function() {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    return all.filter(function(e) { return e.priority === 'CRITICAL'; });
  };

  window._edFilterUpcoming = function(days) {
    var d = parseInt(days, 10) || 7;
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    return all.filter(function(e) {
      var rem = window._edCalculateRemainingDays(e);
      return rem !== null && rem >= 0 && rem <= d && e.status !== 'TESLIM_ALINDI';
    });
  };

  /* ─── PARÇA 3: SORUMLULUK + CRITICAL BİLDİRİM ────────────── */
  window._edAssignResponsible = function(edId, userId, role) {
    if (!userId || !role) return { success: false, error: 'userId ve role zorunlu' };
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    var ed = f.list[f.idx];

    if (!Array.isArray(ed.responsibleHistory)) ed.responsibleHistory = [];
    if (ed.responsibleUserId && ed.responsibleUserId !== userId) {
      ed.responsibleHistory.push({
        userId: ed.responsibleUserId,
        role: ed.responsibleRole,
        assignedAt: ed.responsibleAssignedAt || ed.createdAt,
        removedAt: new Date().toISOString()
      });
    }
    ed.responsibleUserId = userId;
    ed.responsibleRole = role;
    ed.responsibleAssignedAt = new Date().toISOString();
    ed.updatedAt = new Date().toISOString();

    f.list[f.idx] = ed;
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f.list);

    try { if (typeof window._edNotifyResponsible === 'function') window._edNotifyResponsible(ed, 'assigned'); } catch(e) {}
    try { if (typeof window.logActivity === 'function') window.logActivity('ed_responsible_assigned', { edId: edId, userId: userId, role: role }); } catch(e) {}
    return { success: true, ed: ed };
  };

  window._edChangeResponsible = function(edId, newUserId, newRole, reason) {
    var f = _edFindRaw(edId);
    if (f.idx === -1) return { success: false, error: 'not_found' };
    var ed = f.list[f.idx];
    var oldUserId = ed.responsibleUserId;
    var oldRole = ed.responsibleRole;
    if (oldUserId === newUserId) return { success: false, error: 'Aynı kullanıcıya zaten atanmış' };

    var result = window._edAssignResponsible(edId, newUserId, newRole);
    if (!result.success) return result;

    try {
      if (oldUserId && typeof window.addNotif === 'function') {
        var _cu = (window.CU && window.CU()) || {};
        if (oldUserId !== (_cu.id || _cu.uid)) {
          window.addNotif(
            'ℹ️',
            'Teslimat sorumluluğu devredildi: ' + (ed.productName || '') + (reason ? ' — ' + reason : ''),
            'info',
            'expected-deliveries',
            oldUserId,
            edId
          );
        }
      }
    } catch(e) {}

    if (reason && String(reason).trim()) {
      var f2 = _edFindRaw(edId);
      if (f2.idx !== -1) {
        if (!Array.isArray(f2.list[f2.idx].responsibleChanges)) f2.list[f2.idx].responsibleChanges = [];
        f2.list[f2.idx].responsibleChanges.push({
          from: { userId: oldUserId, role: oldRole },
          to: { userId: newUserId, role: newRole },
          reason: String(reason).trim(),
          changedAt: new Date().toISOString(),
          changedBy: ((window.CU && window.CU() && (window.CU().id || window.CU().uid)) || 'bilinmiyor')
        });
        if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(f2.list);
      }
    }
    return { success: true, ed: result.ed };
  };

  var ED_NOTIF_MESSAGES = {
    assigned: { icon: '📦', type: 'info', text: function(ed) { return 'Teslimat sorumluluğu size atandı: ' + (ed.productName || ''); } },
    critical: { icon: '🔴', type: 'err',  text: function(ed) { return 'KRİTİK: ' + (ed.productName || '') + ' teslimatı acil takip'; } },
    overdue:  { icon: '⚠️', type: 'warn', text: function(ed) { return 'Teslimat GECİKTİ: ' + (ed.productName || ''); } },
    reminder: { icon: '⏰', type: 'warn', text: function(ed) { return 'Teslimat yaklaşıyor: ' + (ed.productName || ''); } }
  };

  window._edNotifyResponsible = function(ed, eventType) {
    if (!ed || !ed.responsibleUserId || typeof window.addNotif !== 'function') return;
    var _cu = (window.CU && window.CU()) || {};
    var _cuId = _cu.id || _cu.uid;
    if (ed.responsibleUserId === _cuId) return;

    var _bugun = new Date().toISOString().slice(0, 10);
    var _dedupKey = 'ed_notif_' + ed.id + '_' + ed.responsibleUserId + '_' + eventType + '_' + _bugun;
    try {
      if (localStorage.getItem(_dedupKey)) return;
      localStorage.setItem(_dedupKey, '1');
    } catch(e) {}

    var m = ED_NOTIF_MESSAGES[eventType] || ED_NOTIF_MESSAGES.reminder;
    window.addNotif(m.icon, m.text(ed), m.type, 'expected-deliveries', ed.responsibleUserId, ed.id);

    if (ed.priority === 'CRITICAL' && eventType !== 'critical') {
      try {
        var users = (typeof window.loadUsers === 'function' ? window.loadUsers() : []) || [];
        users.forEach(function(u) {
          if ((u.role || u.rol) !== 'admin') return;
          var _aUid = u.id || u.uid;
          if (!_aUid || _aUid === _cuId) return;
          var _aDedup = 'ed_critical_' + ed.id + '_' + _aUid + '_' + _bugun;
          if (localStorage.getItem(_aDedup)) return;
          localStorage.setItem(_aDedup, '1');
          window.addNotif('🔴', 'KRİTİK teslimat: ' + (ed.productName || ''), 'err', 'expected-deliveries', _aUid, ed.id);
        });
      } catch(e) {}
    }
  };

  window._edGetResponsibleList = function(edId) {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = all.find(function(e) { return e.id === edId; });
    if (!ed) return [];
    var out = [];
    if (ed.responsibleUserId) {
      out.push({
        userId: ed.responsibleUserId,
        role: ed.responsibleRole,
        assignedAt: ed.responsibleAssignedAt || ed.createdAt,
        removedAt: null,
        current: true
      });
    }
    if (Array.isArray(ed.responsibleHistory)) {
      ed.responsibleHistory.forEach(function(h) { out.push(Object.assign({}, h, { current: false })); });
    }
    return out;
  };

  /* _edUpdatePriority override — CRITICAL'a geçişte notify */
  var _origUpdatePriority = window._edUpdatePriority;
  window._edUpdatePriority = function(edId, priority) {
    var result = _origUpdatePriority ? _origUpdatePriority(edId, priority) : { success: false };
    if (result && result.success && priority === 'CRITICAL') {
      try { if (typeof window._edNotifyResponsible === 'function') window._edNotifyResponsible(result.ed, 'critical'); } catch(e) {}
    }
    return result;
  };

  /* Manuel cron — PARÇA 5'te otomatik interval */
  window._edCheckOverdueAndNotify = function() {
    var overdueList = (typeof window._edFilterOverdue === 'function' ? window._edFilterOverdue() : []) || [];
    overdueList.forEach(function(ed) {
      try { if (typeof window._edNotifyResponsible === 'function') window._edNotifyResponsible(ed, 'overdue'); } catch(e) {}
    });
    return { count: overdueList.length };
  };

  /* ─── PARÇA 4: EVENT LISTENERS ──────────────────────────── */
  var _edFindByRef = function(list, d) {
    for (var i = 0; i < list.length; i++) {
      var ed = list[i];
      if (d.edId && ed.id === d.edId) return i;
      if (d.orderId && ed.orderId && ed.orderId === d.orderId) return i;
      if (d.satinalmaId && ed.satinalmaId && ed.satinalmaId === d.satinalmaId) return i;
      if (d.proformaId && ed.proformaId && ed.proformaId === d.proformaId) return i;
    }
    return -1;
  };

  /* AVANS_ODENDI → auto ED create */
  window.addEventListener('AVANS_ODENDI', function(e) {
    try {
      var d = (e && e.detail) || {};
      if (!d.orderId && !d.satinalmaId && !d.proformaId && !d.odemeId) return;

      var existingList = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      if (_edFindByRef(existingList, d) !== -1) {
        console.log('[ED-EVENT] AVANS_ODENDI — zaten kayıt var');
        return;
      }

      var now = new Date();
      var termDays = parseInt(d.deliveryTermDays, 10) || 45;
      var estDelivery = new Date(now.getTime() + termDays * 86400000);
      var _cu = (window.CU && window.CU()) || {};

      var result = window._edCreate({
        orderId: d.orderId,
        satinalmaId: d.satinalmaId,
        proformaId: d.proformaId,
        odemeId: d.odemeId,
        supplierId: d.supplierId || d.cariId || 'bilinmiyor',
        productName: d.productName || 'Tedarikçi siparişi',
        quantityTotal: parseFloat(d.quantity) || 1,
        unit: d.unit || 'adet',
        proformaDate: d.proformaDate || now.toISOString(),
        paymentDate: d.paymentDate || now.toISOString(),
        estimatedDeliveryDate: d.estimatedDeliveryDate || estDelivery.toISOString(),
        deliveryTermDays: termDays,
        toleranceDays: parseInt(d.toleranceDays, 10) || 3,
        priority: d.priority || 'NORMAL',
        status: 'TEDARIK_ASAMASINDA',
        responsibleUserId: d.responsibleUserId || _cu.id || _cu.uid || '1',
        responsibleRole: d.responsibleRole || 'admin',
        autoGenerated: true
      });

      if (result.success) {
        console.log('[ED-EVENT] AVANS_ODENDI → ED oluşturuldu:', result.ed.id);
        try {
          if (typeof window.addNotif === 'function') {
            window.addNotif('📦', 'Tedarikçi siparişi takibe alındı: ' + (d.productName || ''), 'info', 'expected-deliveries', result.ed.responsibleUserId, result.ed.id);
          }
        } catch(ne) {}
      }
    } catch(err) { console.warn('[ED-EVENT AVANS_ODENDI]', err && err.message); }
  });

  /* URUN_SEVK_EDILDI → actualShipmentDate + status YOLDA */
  window.addEventListener('URUN_SEVK_EDILDI', function(e) {
    try {
      var d = (e && e.detail) || {};
      var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      var idx = _edFindByRef(list, d);
      if (idx === -1) { console.log('[ED-EVENT] URUN_SEVK_EDILDI — eşleşen ED yok'); return; }

      list[idx].actualShipmentDate = d.shipmentDate || new Date().toISOString();
      var st = list[idx].status;
      if (st === 'TEDARIK_ASAMASINDA' || st === 'URETIMDE' || st === 'YUKLEME_BEKLIYOR') {
        list[idx].status = 'YOLDA';
      }
      list[idx].updatedAt = new Date().toISOString();
      window._edEnrich(list[idx]);
      if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);

      console.log('[ED-EVENT] URUN_SEVK_EDILDI → ED güncellendi:', list[idx].id);
      try { if (typeof window._edNotifyResponsible === 'function') window._edNotifyResponsible(list[idx], 'reminder'); } catch(ne) {}
    } catch(err) { console.warn('[ED-EVENT URUN_SEVK_EDILDI]', err && err.message); }
  });

  /* MAL_TESLIM_EDILDI → deliveries[] ekle */
  window.addEventListener('MAL_TESLIM_EDILDI', function(e) {
    try {
      var d = (e && e.detail) || {};
      if (!d.edId && !d.orderId && !d.satinalmaId) return;
      var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      var idx = _edFindByRef(list, d);
      if (idx === -1) { console.log('[ED-EVENT] MAL_TESLIM_EDILDI — eşleşen ED yok'); return; }

      var qty = parseFloat(d.qty);
      if (isNaN(qty)) qty = parseFloat(d.quantity) || 0;
      if (qty <= 0) { console.warn('[ED-EVENT] MAL_TESLIM_EDILDI — qty geçersiz'); return; }

      var addResult = window._edAddDelivery(list[idx].id, {
        qty: qty,
        shipmentDate: d.shipmentDate || list[idx].actualShipmentDate,
        deliveryDate: d.deliveryDate || new Date().toISOString(),
        status: 'delivered'
      });

      if (addResult && addResult.success) {
        var freshList = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
        var fIdx = -1;
        for (var i = 0; i < freshList.length; i++) { if (freshList[i].id === list[idx].id) { fIdx = i; break; } }
        if (fIdx !== -1 && freshList[fIdx].quantityRemaining === 0) {
          freshList[fIdx].status = 'TESLIM_ALINDI';
          freshList[fIdx].actualDeliveryDate = freshList[fIdx].actualDeliveryDate || d.deliveryDate || new Date().toISOString();
          if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(freshList);
        }
        console.log('[ED-EVENT] MAL_TESLIM_EDILDI → teslimat eklendi:', list[idx].id);
      }
    } catch(err) { console.warn('[ED-EVENT MAL_TESLIM_EDILDI]', err && err.message); }
  });

  /* CARI_ONAYLANDI → info log + pending ED count (tedarikçi aktifleşti) */
  window.addEventListener('CARI_ONAYLANDI', function(e) {
    try {
      var d = (e && e.detail) || {};
      var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
      var count = 0;
      list.forEach(function(ed) {
        if (ed.supplierId === d.cariId && ed.status === 'TEDARIK_ASAMASINDA') count++;
      });
      console.log('[ED-EVENT] CARI_ONAYLANDI (info) —', d.name || d.cariId, '· pending ED:', count);
    } catch(err) { console.warn('[ED-EVENT CARI_ONAYLANDI]', err && err.message); }
  });

  /* ─── PARÇA 5: HATIRLATMA MOTORU ────────────────────────── */
  window._edHatirlatmaTrigger = function(ed) {
    var rem = window._edCalculateRemainingDays(ed);
    if (rem === null) return null;
    if (window._edIsOverdue(ed)) return 'overdue';
    if (rem === 15) return '15day';
    if (rem === 7)  return '7day';
    if (rem === 4)  return '4day';
    if (rem === 1)  return '1day';
    return null;
  };

  var _TASK_TRIGGERS = ['7day', '4day', '1day', 'overdue'];

  window._edHatirlatmaKontrol = function() {
    var list = ((typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [])
      .filter(function(ed) { return ed && ed.status !== 'TESLIM_ALINDI'; });

    var results = { total: 0, notif: 0, task: 0 };
    var bugun = new Date().toISOString().slice(0, 10);

    list.forEach(function(ed) {
      var trig = window._edHatirlatmaTrigger(ed);
      if (!trig) return;
      results.total++;

      var key = 'ed_hatirlatma_' + ed.id + '_' + trig + '_' + bugun;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch(e) {}

      try {
        if (typeof window._edNotifyResponsible === 'function') {
          window._edNotifyResponsible(ed, trig === 'overdue' ? 'overdue' : 'reminder');
          results.notif++;
        }
      } catch(e) {}

      if (_TASK_TRIGGERS.indexOf(trig) !== -1 && typeof window.addTask === 'function') {
        try {
          window.addTask({
            title: 'Teslimat takip: ' + (ed.productName || '') + ' (' + trig + ')',
            deliveryId: ed.id,
            assignedRole: ed.responsibleRole,
            assignedUser: ed.responsibleUserId,
            dueDate: ed.estimatedDeliveryDate,
            priority: ed.priority === 'CRITICAL' ? 'high' : 'normal',
            autoGenerated: true,
            source: 'expected_deliveries'
          });
          results.task++;
        } catch(e) {}
      }
    });
    return results;
  };

  window._edHatirlatmaBaslat = function() {
    if (window._edHatirlatmaInterval) return;
    setTimeout(function() {
      try { window._edHatirlatmaKontrol(); } catch(e) {}
    }, 10000);
    window._edHatirlatmaInterval = setInterval(function() {
      try { window._edHatirlatmaKontrol(); } catch(e) {}
    }, 5 * 60 * 1000);
  };

  window._edHatirlatmaDurdur = function() {
    if (window._edHatirlatmaInterval) {
      clearInterval(window._edHatirlatmaInterval);
      window._edHatirlatmaInterval = null;
    }
  };

  /* Auto-start */
  window._edHatirlatmaBaslat();

  /* ─── PARÇA 6: UI LİSTE + 4 FİLTRE (Apple minimal) ─────── */
  var _uiEsc = function(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  /* LOJISTIK-RENK-001: Yön/admin only 3 alan + 20 renk paleti */
  var _edAdminFields = function() {
    var r = (typeof window.CU === 'function' ? window.CU()?.role : window.CU?.role) || '';
    return r === 'admin' || r === 'manager';
  };
  var _LOJ_KOLI_RENK = [
    { k: 'kirmizi',    h: '#FF3B30', a: 'Kırmızı' },
    { k: 'turuncu',    h: '#FF9500', a: 'Turuncu' },
    { k: 'sari',       h: '#FFCC00', a: 'Sarı' },
    { k: 'yesil',      h: '#34C759', a: 'Yeşil' },
    { k: 'mint',       h: '#00C7BE', a: 'Mint' },
    { k: 'cyan',       h: '#32ADE6', a: 'Cyan' },
    { k: 'mavi',       h: '#007AFF', a: 'Mavi' },
    { k: 'lacivert',   h: '#0040DD', a: 'Lacivert' },
    { k: 'mor',        h: '#AF52DE', a: 'Mor' },
    { k: 'pembe',      h: '#FF2D55', a: 'Pembe' },
    { k: 'kahverengi', h: '#A2845E', a: 'Kahve' },
    { k: 'gri',        h: '#8E8E93', a: 'Gri' },
    { k: 'siyah',      h: '#1C1C1E', a: 'Siyah' },
    { k: 'koyu_yesil', h: '#1B5E20', a: 'K.Yeşil' },
    { k: 'haki',       h: '#7B6F2C', a: 'Haki' },
    { k: 'bordo',      h: '#7B1F1F', a: 'Bordo' },
    { k: 'altin',      h: '#C7A23B', a: 'Altın' },
    { k: 'gumus',      h: '#B0B0B0', a: 'Gümüş' },
    { k: 'krem',       h: '#F1E6C8', a: 'Krem' },
    { k: 'lila',       h: '#C8A2C8', a: 'Lila' }
  ];
  var _lojRenkBul = function(k) { return _LOJ_KOLI_RENK.find(function(r){return r.k===k;}) || null; };
  var _lojRenkBadge = function(k, emoji) {
    var r = _lojRenkBul(k);
    if (!r && !emoji) return '<span style="color:var(--t3);font-size:10px">—</span>';
    var em = emoji ? '<span style="font-size:11px">' + _uiEsc(String(emoji).slice(0,4)) + '</span>' : '';
    if (!r) return '<span style="font-size:11px">' + em + '</span>';
    /* V187a: renk adı i18n'den (ed.color.X) — yoksa _LOJ_KOLI_RENK.a fallback */
    var ad = (typeof window.t === 'function') ? window.t('ed.color.' + r.k) : r.a;
    if (ad === 'ed.color.' + r.k) ad = r.a;
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;background:' + r.h + '15;border:0.5px solid ' + r.h + '40;font-size:10px;white-space:nowrap"><span style="width:8px;height:8px;border-radius:2px;background:' + r.h + ';display:inline-block;flex-shrink:0"></span>' + em + '<span style="color:var(--t2);font-weight:500">' + _uiEsc(ad) + '</span></span>';
  };
  var _lojRenkPickerHtml = function(id, mevcut) {
    var opts = '<option value="">—</option>' + _LOJ_KOLI_RENK.map(function(r){
      return '<option value="' + r.k + '"' + (r.k===mevcut?' selected':'') + '>' + r.a + '</option>';
    }).join('');
    return '<select class="fi" id="' + id + '" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="width:100%">' + opts + '</select>';
  };
  var _lojIhracatDropdownHtml = function(id, mevcut) {
    var ihrList = (typeof window.loadIhracatOps === 'function') ? window.loadIhracatOps() : [];
    ihrList = (ihrList || []).filter(function(x){ return !x.isDeleted; }).slice(0, 50);
    var found = false;
    var opts = '<option value="">—</option>' + ihrList.map(function(i){
      var lbl = i.exportNo || i.dosyaNo || i.no || i.id;
      var v = String(i.id);
      if (v === String(mevcut || '')) found = true;
      return '<option value="' + _uiEsc(v) + '"' + (v===String(mevcut || '')?' selected':'') + '>' + _uiEsc(String(lbl)) + '</option>';
    }).join('');
    var digerSelected = (mevcut && !found) ? ' selected' : '';
    opts += '<option value="__diger__"' + digerSelected + '>Diğeri (manuel gir)…</option>';
    var manualVal = (mevcut && !found) ? _uiEsc(String(mevcut)) : '';
    var manualDisplay = (mevcut && !found) ? 'block' : 'none';
    return '<select class="fi" id="' + id + '" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onchange="window._lojIhrChange(this)" style="width:100%">' + opts + '</select>'
         + '<input class="fi" id="' + id + '-manual" placeholder="Manuel ihracat ID/no (max 15)" maxlength="15" value="' + manualVal + '" style="display:' + manualDisplay + ';margin-top:6px;width:100%" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()">';
  };
  var _lojIhrValue = function(selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return '';
    if (sel.value === '__diger__') {
      var manual = document.getElementById(selectId + '-manual');
      return manual ? (manual.value || '').trim().slice(0, 15) : '';
    }
    return sel.value || '';
  };
  window._lojIhrChange = function(sel) {
    var manual = document.getElementById(sel.id + '-manual');
    if (!manual) return;
    manual.style.display = sel.value === '__diger__' ? 'block' : 'none';
  };

  var STATUS_LABELS = {
    SIPARIS_ASAMASINDA: 'Sipariş Aşamasında',
    TEDARIK_ASAMASINDA: 'Tedarik',
    URETIMDE: 'Üretimde',
    SATICIDA_HAZIR: 'Satıcıda Hazır',
    YUKLEME_NOKTASINDA: 'Yükleme Noktasında',
    YUKLEME_PLANLANDI: 'Yükleme Planlandı',
    YUKLEME_BEKLIYOR: 'Yükleme Bekliyor',
    SEVK_EDILDI: 'Sevk Edildi',
    YOLDA: 'Yolda',
    GUMRUKTE: 'Gümrükte',
    DEPODA: 'Depoda',
    TESLIM_ALINDI: 'Teslim Edildi',
    KONTEYNIRA_YUKLENDI: 'Konteynıra Yüklendi',
    MUSTERI_TESLIM_ALDI: 'Müşteri Teslim Aldı',
    GECIKTI: 'Gecikti'
  };
  /* V184b / LOJ-STATUS-EXPAND-001: akış sırası — non-admin geri dönemez (GECIKTI sıra dışı) */
  var STATUS_ORDER = {
    SIPARIS_ASAMASINDA: 0,
    TEDARIK_ASAMASINDA: 1,
    URETIMDE: 2,
    SATICIDA_HAZIR: 3,
    YUKLEME_NOKTASINDA: 4,
    YUKLEME_PLANLANDI: 5,
    YUKLEME_BEKLIYOR: 6,
    SEVK_EDILDI: 7,
    YOLDA: 8,
    GUMRUKTE: 9,
    DEPODA: 10,
    TESLIM_ALINDI: 11,
    KONTEYNIRA_YUKLENDI: 12,
    MUSTERI_TESLIM_ALDI: 13,
    GECIKTI: -1
  };
  var STATUS_COLORS = {
    SIPARIS_ASAMASINDA: '#9CA3AF',
    TEDARIK_ASAMASINDA: '#888780',
    URETIMDE: '#D97706',
    SATICIDA_HAZIR: '#0EA5E9',
    YUKLEME_NOKTASINDA: '#EAB308',
    YUKLEME_PLANLANDI: '#F59E0B',
    YUKLEME_BEKLIYOR: '#854F0B',
    SEVK_EDILDI: '#0891B2',
    YOLDA: '#185FA5',
    GUMRUKTE: '#7C3AED',
    DEPODA: '#7C3AED',
    TESLIM_ALINDI: '#16A34A',
    KONTEYNIRA_YUKLENDI: '#2563EB',
    MUSTERI_TESLIM_ALDI: '#15803D',
    GECIKTI: '#E0574F'
  };
  var PRI_LABELS = { LOW: 'Düşük', NORMAL: 'Normal', CRITICAL: 'Kritik' };
  var PRI_COLORS = { LOW: '#6B7280', NORMAL: '#374151', CRITICAL: '#E0574F' };

  function _edColorByDays(rem) {
    if (rem === null || rem === undefined) return '#9CA3AF';
    if (rem > 15) return '#9CA3AF';
    if (rem >= 7) return '#F59E0B';
    if (rem >= 4) return '#F97316';
    return '#E0574F';
  }

  function _edUserAd(uid) {
    try {
      var users = (typeof window.loadUsers === 'function' ? window.loadUsers() : []) || [];
      var u = users.find(function(x) { return (x.id || x.uid) === uid; });
      return u ? (u.name || u.displayName || u.email || '—') : (uid || '—');
    } catch(e) { return uid || '—'; }
  }

  window._edCurrentFilter = window._edCurrentFilter || 'upcoming';

  window._edSetFilter = function(f) {
    window._edCurrentFilter = f;
    window._edRenderPanel();
  };

  window._edRenderCard = function(ed) {
    var rem = window._edCalculateRemainingDays(ed);
    var remColor = _edColorByDays(rem);
    var remText = rem === null ? 'Tarih yok' : (rem < 0 ? (Math.abs(rem) + ' gün geçti') : (rem === 0 ? 'Bugün' : (rem + ' gün kaldı')));
    var st = ed.status || 'TEDARIK_ASAMASINDA';
    var stColor = STATUS_COLORS[st] || '#888780';
    var stLabel = STATUS_LABELS[st] || st;
    var pri = ed.priority || 'NORMAL';
    var priColor = PRI_COLORS[pri] || '#374151';
    var priLabel = PRI_LABELS[pri] || pri;
    var delivered = ed.quantityDelivered || 0;
    var total = ed.quantityTotal || 0;
    var pct = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;
    var etaStr = ed.estimatedDeliveryDate ? new Date(ed.estimatedDeliveryDate).toLocaleDateString('tr-TR') : '—';
    var sorumlu = ed.responsibleUserId ? _edUserAd(ed.responsibleUserId) : '—';

    return '<div style="background:var(--sf,#fff);border:0.5px solid var(--b,#CBD5E1);border-radius:10px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.04)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px">'
        + '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'
          + '<span style="font-size:14px">📦</span>'
          + '<div style="min-width:0;flex:1">'
            + '<div style="font-size:13px;font-weight:500;color:var(--t,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _uiEsc(ed.productName || '—') + '</div>'
            + '<div style="font-size:10px;color:var(--t3,#6B7280);letter-spacing:.02em;margin-top:2px">' + _uiEsc(ed.supplierId || '—') + '</div>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;flex-shrink:0;align-items:center">'
          + '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + stColor + '22;color:' + stColor + ';font-weight:500;letter-spacing:.04em">' + _uiEsc(stLabel).toUpperCase() + '</span>'
          + (pri === 'CRITICAL' ? '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + priColor + '22;color:' + priColor + ';font-weight:600;letter-spacing:.04em">⚠ ' + _uiEsc(priLabel).toUpperCase() + '</span>' : '')
          /* SHIPMENT-DOC-LIST-PROGRESS-001: belge progress badge (V125, ed.shipmentDoc varsa görünür) */
          + (window._shipmentDocCardBadgeHtml ? window._shipmentDocCardBadgeHtml(ed) : '')
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;flex-wrap:wrap">'
        + '<div style="font-size:11px;color:' + remColor + ';font-weight:500">' + remText + '</div>'
        + '<div style="font-size:10px;color:var(--t3,#6B7280);font-variant-numeric:tabular-nums">' + delivered + '/' + total + ' ' + _uiEsc(ed.unit || '') + '</div>'
      + '</div>'
      + '<div style="height:4px;background:var(--s2,#F1F5F9);border-radius:2px;overflow:hidden;margin-bottom:10px">'
        + '<div style="height:100%;width:' + pct + '%;background:' + stColor + ';transition:width .3s"></div>'
      + '</div>'
      /* SHIPMENT-LIST-COLUMNS-001: konteynerNo chip (V133, conditional render) */
      + (ed.konteynerNo ? '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span title="Konteyner / TIR" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-family:ui-monospace,monospace;color:#185FA5;background:#E6F1FB;padding:3px 8px;border-radius:6px;font-weight:500">🚛 ' + _uiEsc(ed.konteynerNo) + '</span></div>' : '')
      /* SHIPMENT-LIST-COLUMNS-002: KG/m³ chip + konteyner uyarı (V133.1, conditional) */
      + ((ed.weightKg || ed.volumeM3) ? '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"><div style="display:flex;gap:8px;flex-wrap:wrap"><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-family:ui-monospace,monospace;color:#0F6E56;background:#E1F5EE;padding:3px 8px;border-radius:6px;font-weight:500">⚖ ' + (ed.weightKg ? Math.round(ed.weightKg).toLocaleString('tr-TR') + ' kg' : '—') + (ed.volumeM3 ? ' / ' + ed.volumeM3.toLocaleString('tr-TR') + ' m³' : '') + '</span></div></div>' : '')
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
        + '<div style="font-size:10px;color:var(--t3,#6B7280)">🗓 ' + etaStr + ' · 👤 ' + _uiEsc(sorumlu) + '</div>'
        + '<div style="display:flex;gap:4px">'
          + '<button onclick="window._edOpenDetail && window._edOpenDetail(\'' + _uiEsc(ed.id) + '\')" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b,#CBD5E1);background:transparent;border-radius:6px;cursor:pointer;font-family:inherit;color:var(--t2,#374151)">Detay</button>'
          + (ed.status !== 'TESLIM_ALINDI' ? '<button onclick="window._edAddDeliveryPrompt && window._edAddDeliveryPrompt(\'' + _uiEsc(ed.id) + '\')" style="font-size:10px;padding:4px 10px;border:none;background:#1A8D6F;color:#fff;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:500">+ Teslimat</button>' : '')
          /* PARÇA 8: aksiyon menüsü ⋯ */
          + '<button onclick="window._edAksiyonMenu && window._edAksiyonMenu(\'' + _uiEsc(ed.id) + '\')" title="Aksiyonlar" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b,#CBD5E1);background:transparent;border-radius:6px;cursor:pointer;font-family:inherit;color:var(--t2,#374151)">⋯</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  };

  window._edAddDeliveryPrompt = function(edId) {
    var qtyStr = window.prompt('Eklenecek teslim miktarı:', '');
    if (qtyStr === null) return;
    var qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) { if (window.toast) window.toast(t('ed.toast.invalidQty'), 'err'); return; }
    var r = window._edAddDelivery(edId, { qty: qty, deliveryDate: new Date().toISOString(), status: 'delivered' });
    if (r && r.success) {
      if (window.toast) window.toast(t('ed.toast.deliveryAdded'), 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || t('ed.toast.addError'), 'err');
    }
  };

  window._edOpenDetail = function(edId) {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = all.find(function(e) { return e.id === edId; });
    if (!ed) { if (window.toast) window.toast(t('ed.toast.notFound'), 'err'); return; }
    var deliveries = (ed.deliveries || []).map(function(d, i) {
      return '<tr style="border-bottom:0.5px solid var(--b)"><td style="padding:6px 8px;font-size:11px">' + (i + 1) + '</td><td style="padding:6px 8px;font-size:11px;font-variant-numeric:tabular-nums">' + (d.qty || 0) + '</td><td style="padding:6px 8px;font-size:11px">' + (d.shipmentDate ? new Date(d.shipmentDate).toLocaleDateString('tr-TR') : '—') + '</td><td style="padding:6px 8px;font-size:11px">' + (d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString('tr-TR') : '—') + '</td><td style="padding:6px 8px;font-size:10px;color:var(--t3)">' + _uiEsc(d.status || '—') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--t3);font-size:11px">Teslimat kaydı yok</td></tr>';
    var ex = document.getElementById('ed-detail-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-detail-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t,#111);width:640px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="font-size:15px;font-weight:600">📦 ' + _uiEsc(ed.productName || '—') + '</div><button onclick="document.getElementById(\'ed-detail-modal\').remove()" style="background:none;border:none;font-size:18px;color:var(--t3);cursor:pointer">×</button></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tedarikçi</div><div style="font-size:12px;margin-top:2px">' + _uiEsc(ed.supplierId || '—') + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Sorumlu</div><div style="font-size:12px;margin-top:2px">' + _uiEsc(_edUserAd(ed.responsibleUserId)) + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Durum</div><div style="font-size:12px;margin-top:2px;color:' + (STATUS_COLORS[ed.status] || '#888780') + ';font-weight:500">' + _uiEsc(STATUS_LABELS[ed.status] || ed.status || '—') + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Toplam</div><div style="font-size:12px;margin-top:2px;font-variant-numeric:tabular-nums">' + (ed.quantityTotal || 0) + ' ' + _uiEsc(ed.unit || '') + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Teslim</div><div style="font-size:12px;margin-top:2px;font-variant-numeric:tabular-nums">' + (ed.quantityDelivered || 0) + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Kalan</div><div style="font-size:12px;margin-top:2px;font-variant-numeric:tabular-nums">' + (ed.quantityRemaining || 0) + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tahmini Teslim</div><div style="font-size:12px;margin-top:2px">' + (ed.estimatedDeliveryDate ? new Date(ed.estimatedDeliveryDate).toLocaleDateString('tr-TR') : '—') + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Öncelik</div><div style="font-size:12px;margin-top:2px;color:' + (PRI_COLORS[ed.priority] || '#374151') + ';font-weight:500">' + _uiEsc(PRI_LABELS[ed.priority] || ed.priority || '—') + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tolerans</div><div style="font-size:12px;margin-top:2px">' + (ed.toleranceDays || 0) + ' gün</div></div>'
      + '</div>'
      + (ed.delayReason ? '<div style="margin-bottom:16px;padding:10px;background:#FEF2F2;border:0.5px solid #FECACA;border-radius:8px;font-size:11px;color:#991B1B">⚠ <b>Gecikme:</b> ' + _uiEsc(ed.delayOwner || '—') + ' — ' + _uiEsc(ed.delayReason) + '</div>' : '')
      + '<div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Teslimat Geçmişi</div>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><thead><tr style="background:var(--s2,#F1F5F9);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em"><th style="padding:6px 8px;text-align:left">#</th><th style="padding:6px 8px;text-align:left">Miktar</th><th style="padding:6px 8px;text-align:left">Sevk</th><th style="padding:6px 8px;text-align:left">Teslim</th><th style="padding:6px 8px;text-align:left">Durum</th></tr></thead><tbody>' + deliveries + '</tbody></table>'
      + (ed.autoGenerated ? '<div style="font-size:9px;color:var(--t3);text-align:center;padding-top:8px;border-top:0.5px solid var(--b)">🤖 Otomatik oluşturuldu · ' + (ed.createdAt ? new Date(ed.createdAt).toLocaleDateString('tr-TR') : '—') + '</div>' : '')
    + '</div>';
    document.body.appendChild(mo);
  };

  /* ─── PARÇA 7: Dashboard performans metrikleri + widget ─── */
  window._edGetPerformanceMetrics = function() {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    var delivered = list.filter(function(e) { return e.status === 'TESLIM_ALINDI'; });
    var active = list.filter(function(e) { return e.status !== 'TESLIM_ALINDI'; });
    var overdue = list.filter(function(e) { return window._edIsOverdue(e) && e.status !== 'TESLIM_ALINDI'; });
    var critical = list.filter(function(e) { return e.priority === 'CRITICAL'; });

    var onTime = delivered.filter(function(e) {
      if (!e.actualDeliveryDate || !e.estimatedDeliveryDate) return false;
      return new Date(e.actualDeliveryDate) <= new Date(e.estimatedDeliveryDate);
    });
    var onTimeRate = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 100) : 0;

    var delays = [];
    delivered.forEach(function(e) {
      if (e.actualDeliveryDate && e.estimatedDeliveryDate) {
        var diff = Math.floor((new Date(e.actualDeliveryDate) - new Date(e.estimatedDeliveryDate)) / 86400000);
        delays.push(Math.max(0, diff));
      }
    });
    var avgDelay = delays.length > 0 ? Math.round(delays.reduce(function(a,b){return a+b;}, 0) / delays.length) : 0;

    var bySupplier = {};
    list.forEach(function(e) {
      var sid = e.supplierId || 'bilinmiyor';
      if (!bySupplier[sid]) bySupplier[sid] = { total: 0, onTime: 0, delayed: 0, totalDelay: 0 };
      bySupplier[sid].total++;
      if (e.status === 'TESLIM_ALINDI' && e.actualDeliveryDate && e.estimatedDeliveryDate) {
        var d = Math.floor((new Date(e.actualDeliveryDate) - new Date(e.estimatedDeliveryDate)) / 86400000);
        if (d <= 0) bySupplier[sid].onTime++;
        else { bySupplier[sid].delayed++; bySupplier[sid].totalDelay += d; }
      }
    });
    var supplierList = Object.keys(bySupplier).map(function(sid) {
      var s = bySupplier[sid];
      return {
        supplierId: sid,
        total: s.total,
        rate: s.total > 0 ? Math.round((s.onTime / s.total) * 100) : 0,
        avgDelay: s.delayed > 0 ? Math.round(s.totalDelay / s.delayed) : 0
      };
    });

    return {
      total: list.length,
      active: active.length,
      overdue: overdue.length,
      critical: critical.length,
      delivered: delivered.length,
      onTimeRate: onTimeRate,
      avgDelay: avgDelay,
      topPerformers: supplierList.filter(function(s){return s.total >= 2;}).sort(function(a,b){return b.rate - a.rate;}).slice(0, 5),
      worstPerformers: supplierList.filter(function(s){return s.delayed > 0;}).sort(function(a,b){return b.avgDelay - a.avgDelay;}).slice(0, 5)
    };
  };

  window._dashEDWidget = function() {
    var m = window._edGetPerformanceMetrics ? window._edGetPerformanceMetrics() : {};
    return '<div style="border:0.5px solid var(--b,#CBD5E1);border-radius:12px;padding:16px;background:var(--sf,#fff);margin-bottom:10px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
        + '<div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--t3,#6B7280)">📦 Teslimat Takibi</div>'
        + '<span onclick="window.App&&window.App.nav&&window.App.nav(\'teslimat-takip\')" style="font-size:10px;color:#1A8D6F;cursor:pointer">Detay →</span>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
        + '<div><div style="font-size:9px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em">Toplam</div><div style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.total || 0) + '</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em">Aktif</div><div style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.active || 0) + '</div></div>'
        + '<div><div style="font-size:9px;color:#E0574F;text-transform:uppercase;letter-spacing:.05em">Geciken</div><div style="font-size:18px;font-weight:600;color:#E0574F;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.overdue || 0) + '</div></div>'
        + '<div><div style="font-size:9px;color:#E0574F;text-transform:uppercase;letter-spacing:.05em">Kritik</div><div style="font-size:18px;font-weight:600;color:#E0574F;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.critical || 0) + '</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:0.5px solid var(--b,#E5E7EB)">'
        + '<div><div style="font-size:9px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em">Zamanında %</div><div style="font-size:20px;font-weight:600;color:#1A8D6F;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.onTimeRate || 0) + '%</div></div>'
        + '<div><div style="font-size:9px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em">Ort. Gecikme</div><div style="font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px">' + (m.avgDelay || 0) + ' <span style="font-size:11px;font-weight:400;color:var(--t3)">gün</span></div></div>'
      + '</div>'
      + ((m.worstPerformers || []).length > 0
          ? '<div style="margin-top:12px;padding-top:10px;border-top:0.5px solid var(--b,#E5E7EB)"><div style="font-size:9px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">En Çok Geciktirenler</div>'
            + m.worstPerformers.slice(0, 3).map(function(s) {
                return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0"><span>' + _uiEsc(s.supplierId) + '</span><span style="color:#E0574F;font-variant-numeric:tabular-nums">' + s.avgDelay + ' gün ort.</span></div>';
              }).join('')
          + '</div>'
          : '')
    + '</div>';
  };

  /* ─── PARÇA 7 + ED-HOTFIX-BUNDLE-001 fix2: Filter click event delegation (2 yöntem) */
  window._edFilterDelegationReady = window._edFilterDelegationReady || false;
  function _edEnsureFilterDelegation() {
    if (window._edFilterDelegationReady) return;
    var panel = document.getElementById('panel-teslimat-takip');
    if (!panel) return;
    panel.addEventListener('click', function(ev) {
      if (!ev.target || !ev.target.closest) return;
      /* Yol 1: data-ed-filter attribute */
      var btn = ev.target.closest('[data-ed-filter]');
      if (btn) {
        var f = btn.getAttribute('data-ed-filter');
        if (f && typeof window._edSetFilter === 'function') {
          ev.preventDefault();
          window._edSetFilter(f);
          return;
        }
      }
      /* Yol 2: onclick attr regex parse (HTML onclick fail edilirse backup) */
      var btn2 = ev.target.closest('[onclick*="_edSetFilter"]');
      if (btn2) {
        var m = (btn2.getAttribute('onclick') || '').match(/_edSetFilter\s*\(\s*['"]([^'"]+)['"]/);
        if (m && typeof window._edSetFilter === 'function') {
          ev.preventDefault();
          window._edSetFilter(m[1]);
        }
      }
    });
    window._edFilterDelegationReady = true;
  }

  window._edRenderPanel = function() {
    var p = document.getElementById('panel-teslimat-takip');
    if (!p) return;

    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    var counts = {
      total: all.length,
      upcoming: (typeof window._edFilterUpcoming === 'function' ? window._edFilterUpcoming(7) : []).length,
      overdue: (typeof window._edFilterOverdue === 'function' ? window._edFilterOverdue() : []).length,
      critical: (typeof window._edFilterCritical === 'function' ? window._edFilterCritical() : []).length,
      done: all.filter(function(e) { return e.status === 'TESLIM_ALINDI'; }).length
    };

    var filter = window._edCurrentFilter || 'upcoming';
    var shown = [];
    if (filter === 'upcoming') shown = (typeof window._edFilterUpcoming === 'function' ? window._edFilterUpcoming(7) : []);
    else if (filter === 'overdue') shown = (typeof window._edFilterOverdue === 'function' ? window._edFilterOverdue() : []);
    else if (filter === 'critical') shown = (typeof window._edFilterCritical === 'function' ? window._edFilterCritical() : []);
    else if (filter === 'done') shown = all.filter(function(e) { return e.status === 'TESLIM_ALINDI'; });
    else shown = all;

    var mode = window.EXPECTED_DELIVERIES_MODE || 'MANUAL_MODE';
    var modeColor = mode === 'AUTO_MODE' ? '#185FA5' : '#6B7280';

    var filterBtn = function(key, label, count) {
      var active = filter === key;
      /* PARÇA 7: inline onclick + data-ed-filter (event delegation backup) */
      return '<button data-ed-filter="' + key + '" onclick="window._edSetFilter && window._edSetFilter(\'' + key + '\')" style="padding:7px 14px;border:none;background:' + (active ? 'var(--t,#111)' : 'transparent') + ';color:' + (active ? '#fff' : 'var(--t2,#374151)') + ';border-radius:8px;font-size:11px;font-weight:' + (active ? '500' : '400') + ';cursor:pointer;font-family:inherit;letter-spacing:.02em;transition:all .15s">' + label + ' <span style="font-variant-numeric:tabular-nums;opacity:.7">' + count + '</span></button>';
    };

    p.innerHTML = '<div style="padding:0;font-family:inherit;max-width:100%;box-sizing:border-box">'
      /* ED-HOTFIX-BUNDLE-001 fix1: Header responsive — flex-wrap + max-width:100% + min-width:0 child; buton bar ayrıca */
      + '<div style="padding:18px 24px 10px;border-bottom:0.5px solid var(--b,#CBD5E1);display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;max-width:100%">'
        + '<div style="min-width:0;flex:1 1 260px">'
          + '<div style="font-size:16px;font-weight:600;color:var(--t,#111);display:flex;align-items:center;gap:10px;flex-wrap:wrap">🚚 ' + (typeof window.t === 'function' ? window.t('ed.panel.title') : 'Teslimat Takibi') + ' <span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + modeColor + '22;color:' + modeColor + ';font-weight:500;letter-spacing:.04em">' + mode.replace('_', ' ') + '</span></div>'
          + '<div style="font-size:11px;color:var(--t3,#6B7280);margin-top:3px">Toplam: <b>' + counts.total + '</b> · Yaklaşan: <b style="color:#F59E0B">' + counts.upcoming + '</b> · Gecikmiş: <b style="color:#E0574F">' + counts.overdue + '</b> · Kritik: <b style="color:#E0574F">' + counts.critical + '</b></div>'
        + '</div>'
        /* ED-HOTFIX-BUNDLE-001: Yeni Teslimat butonu flex-shrink:0 — asla viewport dışına düşmez */
        + '<button onclick="window._edWizardAc && window._edWizardAc()" style="padding:8px 16px;border:none;background:#1A8D6F;color:#fff;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0">+ Yeni Teslimat</button>'
      + '</div>'
      + '<div style="padding:14px 24px;border-bottom:0.5px solid var(--b,#CBD5E1);display:flex;gap:4px;flex-wrap:wrap;background:var(--s2,#F1F5F9)">'
        + filterBtn('upcoming', 'Yaklaşan', counts.upcoming)
        + filterBtn('overdue', 'Gecikenler', counts.overdue)
        + filterBtn('critical', 'Kritik', counts.critical)
        + filterBtn('done', 'Tamamlanan', counts.done)
        + filterBtn('all', 'Tümü', counts.total)
      + '</div>'
      + '<div style="padding:16px 24px">'
        + (shown.length
            ? shown.map(function(ed) { return window._edRenderCard(ed); }).join('')
            : '<div style="padding:40px 20px;text-align:center;color:var(--t3,#9CA3AF);font-size:13px">Bu filtrede kayıt yok</div>')
      + '</div>'
    + '</div>';

    /* PARÇA 7: Event delegation hotfix — inline onclick fail edilirse yedek */
    _edEnsureFilterDelegation();
  };

  /* ─── PARÇA 8: YENİ TESLIMAT WIZARD + AKSİYON MENÜ ────────── */
  var _edWizardState = null;

  function _edSupplierOpts(sel) {
    var list = (typeof window.loadCari === 'function' ? window.loadCari() : []) || [];
    list = list.filter(function(c) { return !c.isDeleted && (c.type === 'tedarikci' || c.tip === 'tedarikci' || c.cariType === 'onayli'); });
    if (list.length === 0) list = (typeof window.loadCari === 'function' ? window.loadCari() : []).filter(function(c) { return !c.isDeleted; });
    return '<option value="">— Tedarikçi Seçin —</option>' + list.map(function(c) {
      var id = c.id;
      var ad = c.name || c.ad || c.unvan || '—';
      return '<option value="' + _uiEsc(id) + '"' + (sel === id ? ' selected' : '') + '>' + _uiEsc(ad) + '</option>';
    }).join('');
  }

  function _edUserOpts(sel) {
    var list = (typeof window.loadUsers === 'function' ? window.loadUsers() : []) || [];
    list = list.filter(function(u) { return (u.status || 'active') === 'active'; });
    return '<option value="">— Sorumlu Seçin —</option>' + list.map(function(u) {
      var uid = u.id || u.uid;
      var ad = u.name || u.displayName || u.email || '—';
      var rol = u.role || u.rol || 'staff';
      return '<option value="' + _uiEsc(uid) + '" data-role="' + _uiEsc(rol) + '"' + (sel === uid ? ' selected' : '') + '>' + _uiEsc(ad) + ' (' + _uiEsc(rol) + ')</option>';
    }).join('');
  }

  var _edWizardLabel = function(txt) { return '<div style="font-size:10px;color:var(--t3,#6B7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">' + txt + '</div>'; };
  var _edWizardInput = 'width:100%;padding:9px 11px;border:0.5px solid var(--b,#CBD5E1);border-radius:8px;font-size:13px;font-family:inherit;background:var(--sf,#fff);color:var(--t,#111);box-sizing:border-box';

  function _edWizardRender() {
    var s = _edWizardState;
    if (!s) return;
    var mo = document.getElementById('ed-wizard-modal');
    if (!mo) return;
    var body = mo.querySelector('[data-wizard-body]');
    if (!body) return;

    var progress = '<div style="display:flex;gap:4px;margin-bottom:20px">'
      + [1,2,3,4].map(function(n) {
          var active = s.step === n;
          var done = s.step > n;
          return '<div style="flex:1;height:3px;border-radius:2px;background:' + (active || done ? '#1A8D6F' : 'var(--b,#E5E7EB)') + '"></div>';
        }).join('')
    + '</div>';

    var content = '';
    if (s.step === 1) {
      content = progress + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">Adım 1 / 4 — Ürün & Tedarikçi</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
          + '<div style="grid-column:span 2">' + _edWizardLabel('Ürün Adı *') + '<input id="edw-productName" style="' + _edWizardInput + '" value="' + _uiEsc(s.data.productName || '') + '" placeholder="Mesh Ofis Koltuğu"></div>'
          + '<div style="grid-column:span 2">' + _edWizardLabel('Tedarikçi *') + '<select id="edw-supplierId" onchange="window._edRotaPrefill && window._edRotaPrefill(this.value)" style="' + _edWizardInput + '">' + _edSupplierOpts(s.data.supplierId) + '</select></div>'
          + '<div>' + _edWizardLabel('Miktar *') + '<input id="edw-quantityTotal" type="number" min="1" step="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums;text-align:right" value="' + (s.data.quantityTotal || '') + '"></div>'
          + '<div>' + _edWizardLabel('Birim') + '<select id="edw-unit" style="' + _edWizardInput + '">'
              + ['adet','kg','palet','ton','m³','lt','kutu'].map(function(u) { return '<option value="' + u + '"' + (s.data.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('')
            + '</select></div>'
        + '</div>';
    } else if (s.step === 2) {
      content = progress + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">Adım 2 / 4 — Tarihler & Termin</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
          + '<div>' + _edWizardLabel('Proforma Tarihi') + '<input id="edw-proformaDate" type="date" style="' + _edWizardInput + '" value="' + (s.data.proformaDate || '') + '"></div>'
          + '<div>' + _edWizardLabel('Tahmini Teslim *') + '<input id="edw-estimatedDeliveryDate" type="date" style="' + _edWizardInput + '" value="' + (s.data.estimatedDeliveryDate || '') + '"></div>'
          + '<div>' + _edWizardLabel('Termin (gün)') + '<input id="edw-deliveryTermDays" type="number" min="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (s.data.deliveryTermDays || 45) + '"></div>'
          + '<div>' + _edWizardLabel('Tolerans (gün)') + '<input id="edw-toleranceDays" type="number" min="0" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (s.data.toleranceDays || 3) + '"></div>'
          /* V184a2 / LOJ-ROTA-INFO-001: Çıkış-Varış lokasyonu (Türkiye içi) */
          + '<div style="grid-column:span 2;margin-top:6px;padding-top:8px;border-top:0.5px solid var(--b)"><div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:6px">📤 ' + (typeof window.t === 'function' ? window.t('ed.sect.cikis') : 'Çıkış Lokasyonu') + ' <span style="color:var(--t3);font-weight:400">(' + (typeof window.t === 'function' ? window.t('ed.sect.trIci') : 'Türkiye içi') + ')</span></div></div>'
          + '<div>' + _edWizardLabel('Çıkış Şehir *') + '<input id="edw-originCity" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(s.data.originCity || '') + '"></div>'
          + '<div>' + _edWizardLabel('Çıkış Bölge *') + '<input id="edw-originDistrict" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(s.data.originDistrict || '') + '"></div>'
          + '<div style="grid-column:span 2;margin-top:6px;padding-top:8px;border-top:0.5px solid var(--b)"><div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:6px">🎯 ' + (typeof window.t === 'function' ? window.t('ed.sect.varis') : 'Varış Lokasyonu') + ' <span style="color:var(--t3);font-weight:400">(' + (typeof window.t === 'function' ? window.t('ed.sect.trIci') : 'Türkiye içi') + ')</span></div></div>'
          + '<div>' + _edWizardLabel('Varış Şehir *') + '<input id="edw-destinationCity" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(s.data.destinationCity || '') + '"></div>'
          + '<div>' + _edWizardLabel('Varış Bölge *') + '<input id="edw-destinationDistrict" maxlength="50" style="' + _edWizardInput + '" value="' + _uiEsc(s.data.destinationDistrict || '') + '"></div>'
          /* V184d / LOJ-METRICS-001: Teslim Tipi (opsiyonel) */
          + '<div style="grid-column:span 2">' + _edWizardLabel((typeof window.t === 'function' ? window.t('ed.label.teslimTipi') : 'Teslimat Yapan')) + '<select id="edw-teslimTipi" style="' + _edWizardInput + '">' + (function(){var __t = (typeof window.t === 'function') ? window.t : function(k){return k;}; var __cur = (typeof window._resolveTeslimat === 'function') ? window._resolveTeslimat(s.data.teslimTipi || '') : (s.data.teslimTipi || ''); return [['','ed.teslim.empty'],['MUSTERI','ed.teslim.musteri'],['TEDARIKCI','ed.teslim.tedarikci'],['NAKLIYECI','ed.teslim.nakliyeci'],['DEPO','ed.teslim.depo']].map(function(__o){return '<option value="' + __o[0] + '"' + (__cur === __o[0] ? ' selected' : '') + '>' + __t(__o[1]) + '</option>';}).join('');})() + '</select></div>'
        + '</div>';
    } else if (s.step === 3) {
      content = progress + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">Adım 3 / 4 — Sorumluluk & Öncelik</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
          + '<div style="grid-column:span 2">' + _edWizardLabel('Sorumlu Kullanıcı *') + '<select id="edw-responsibleUserId" style="' + _edWizardInput + '">' + _edUserOpts(s.data.responsibleUserId) + '</select></div>'
          + '<div>' + _edWizardLabel('Öncelik') + '<select id="edw-priority" style="' + _edWizardInput + '">'
              + [['LOW','Düşük'],['NORMAL','Normal'],['CRITICAL','Kritik']].map(function(p) { return '<option value="' + p[0] + '"' + (s.data.priority === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('')
            + '</select></div>'
          + '<div>' + _edWizardLabel('Başlangıç Durumu') + '<select id="edw-status" style="' + _edWizardInput + '">'
              + [['TEDARIK_ASAMASINDA','Tedarik'],['URETIMDE','Üretimde'],['YUKLEME_BEKLIYOR','Yükleme']].map(function(st) { return '<option value="' + st[0] + '"' + (s.data.status === st[0] ? ' selected' : '') + '>' + st[1] + '</option>'; }).join('')
            + '</select></div>'
        + '</div>';
    } else if (s.step === 4) {
      var supAd = '—';
      try {
        var cari = (typeof window.loadCari === 'function' ? window.loadCari() : []).find(function(c) { return c.id === s.data.supplierId; });
        if (cari) supAd = cari.name || cari.ad || cari.unvan || '—';
      } catch(e) {}
      var sorumlu = _edUserAd(s.data.responsibleUserId);
      var priLbl = ({ LOW: 'Düşük', NORMAL: 'Normal', CRITICAL: 'Kritik' })[s.data.priority] || s.data.priority;
      content = progress + '<div style="font-size:11px;color:var(--t3);margin-bottom:14px">Adım 4 / 4 — Özet</div>'
        + '<div style="background:var(--s2,#F1F5F9);border:0.5px solid var(--b,#CBD5E1);border-radius:10px;padding:16px">'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Ürün</div><div style="font-weight:500;margin-top:2px">' + _uiEsc(s.data.productName || '—') + '</div></div>'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tedarikçi</div><div style="font-weight:500;margin-top:2px">' + _uiEsc(supAd) + '</div></div>'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Miktar</div><div style="font-weight:500;margin-top:2px;font-variant-numeric:tabular-nums">' + (s.data.quantityTotal || 0) + ' ' + _uiEsc(s.data.unit || '') + '</div></div>'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tahmini Teslim</div><div style="font-weight:500;margin-top:2px">' + (s.data.estimatedDeliveryDate || '—') + '</div></div>'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Sorumlu</div><div style="font-weight:500;margin-top:2px">' + _uiEsc(sorumlu) + '</div></div>'
            + '<div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Öncelik</div><div style="font-weight:500;margin-top:2px;color:' + (s.data.priority === 'CRITICAL' ? '#E0574F' : 'var(--t)') + '">' + _uiEsc(priLbl) + '</div></div>'
          + '</div>'
        + '</div>';
    }

    body.innerHTML = content;

    var btnBar = mo.querySelector('[data-wizard-buttons]');
    if (btnBar) {
      btnBar.innerHTML = ''
        + '<button onclick="document.getElementById(\'ed-wizard-modal\').remove()" style="padding:9px 16px;border:0.5px solid var(--b,#CBD5E1);background:transparent;color:var(--t2);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">İptal</button>'
        + (s.step > 1 ? '<button onclick="window._edWizardGeri && window._edWizardGeri()" style="padding:9px 16px;border:0.5px solid var(--b,#CBD5E1);background:transparent;color:var(--t2);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">← Geri</button>' : '')
        + (s.step < 4 ? '<button onclick="window._edWizardIleri && window._edWizardIleri()" style="padding:9px 16px;border:none;background:var(--t,#111);color:#fff;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">İleri →</button>'
                      : '<button onclick="window._edWizardKaydet && window._edWizardKaydet()" style="padding:9px 18px;border:none;background:#1A8D6F;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">✓ Kaydet</button>');
    }
  }

  function _edWizardTopla() {
    var s = _edWizardState;
    if (!s) return;
    var g = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    if (s.step === 1) {
      s.data.productName = g('edw-productName').trim();
      s.data.supplierId = g('edw-supplierId');
      s.data.quantityTotal = parseFloat(g('edw-quantityTotal')) || 0;
      s.data.unit = g('edw-unit') || 'adet';
    } else if (s.step === 2) {
      s.data.proformaDate = g('edw-proformaDate');
      s.data.estimatedDeliveryDate = g('edw-estimatedDeliveryDate');
      s.data.deliveryTermDays = parseInt(g('edw-deliveryTermDays'), 10) || 45;
      s.data.toleranceDays = parseInt(g('edw-toleranceDays'), 10) || 3;
      /* V184a2 / LOJ-ROTA-INFO-001: rota alanları (yeni kayıtta zorunlu - validate'de) */
      s.data.originCity = (g('edw-originCity') || '').trim().slice(0, 50);
      s.data.originDistrict = (g('edw-originDistrict') || '').trim().slice(0, 50);
      s.data.destinationCity = (g('edw-destinationCity') || '').trim().slice(0, 50);
      s.data.destinationDistrict = (g('edw-destinationDistrict') || '').trim().slice(0, 50);
      s.data.teslimTipi = g('edw-teslimTipi') || '';
    } else if (s.step === 3) {
      var userSel = document.getElementById('edw-responsibleUserId');
      s.data.responsibleUserId = userSel ? userSel.value : '';
      var opt = userSel && userSel.selectedOptions && userSel.selectedOptions[0];
      s.data.responsibleRole = (opt && opt.getAttribute('data-role')) || 'staff';
      s.data.priority = g('edw-priority') || 'NORMAL';
      s.data.status = g('edw-status') || 'TEDARIK_ASAMASINDA';
    }
  }

  function _edWizardValidate(step) {
    var s = _edWizardState;
    if (!s) return 'State yok';
    var d = s.data;
    if (step === 1) {
      if (!d.productName) return 'Ürün adı zorunlu';
      if (!d.supplierId) return 'Tedarikçi zorunlu';
      if (!d.quantityTotal || d.quantityTotal <= 0) return 'Miktar > 0 olmalı';
    }
    if (step === 2) {
      if (!d.estimatedDeliveryDate) return 'Tahmini teslim tarihi zorunlu';
      if (d.proformaDate && new Date(d.proformaDate) > new Date(d.estimatedDeliveryDate)) return 'Proforma tarihi teslim tarihinden sonra olamaz';
      /* V184a2 / LOJ-ROTA-INFO-001: yeni kayıtta 4 rota alanı zorunlu (Q4) */
      if (!d.originCity) return 'Çıkış Şehir zorunlu';
      if (!d.originDistrict) return 'Çıkış Bölge zorunlu';
      if (!d.destinationCity) return 'Varış Şehir zorunlu';
      if (!d.destinationDistrict) return 'Varış Bölge zorunlu';
    }
    if (step === 3) {
      if (!d.responsibleUserId) return 'Sorumlu kullanıcı zorunlu';
    }
    return null;
  }

  window._edWizardIleri = function() {
    _edWizardTopla();
    var err = _edWizardValidate(_edWizardState.step);
    if (err) { if (window.toast) window.toast(err, 'err'); return; }
    _edWizardState.step = Math.min(4, _edWizardState.step + 1);
    _edWizardRender();
  };

  window._edWizardGeri = function() {
    _edWizardTopla();
    _edWizardState.step = Math.max(1, _edWizardState.step - 1);
    _edWizardRender();
  };

  window._edWizardKaydet = function() {
    _edWizardTopla();
    var d = _edWizardState.data;
    var r = window._edCreate(d);
    if (r && r.success) {
      var mo = document.getElementById('ed-wizard-modal'); if (mo) mo.remove();
      if (window.toast) window.toast(t('ed.toast.deliveryCreated'), 'ok');
      _edWizardState = null;
      window._edRenderPanel();
    } else {
      var msg = (r && r.errors && r.errors.join(', ')) || (r && r.error) || 'Oluşturma hatası';
      if (window.toast) window.toast(msg, 'err');
    }
  };

  window._edWizardAc = function() {
    var ex = document.getElementById('ed-wizard-modal'); if (ex) ex.remove();
    _edWizardState = {
      step: 1,
      data: {
        productName: '', supplierId: '', quantityTotal: '', unit: 'adet',
        proformaDate: new Date().toISOString().slice(0, 10),
        estimatedDeliveryDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
        deliveryTermDays: 45, toleranceDays: 3,
        responsibleUserId: '', responsibleRole: 'staff',
        priority: 'NORMAL', status: 'TEDARIK_ASAMASINDA'
      }
    };
    var mo = document.createElement('div');
    mo.id = 'ed-wizard-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t,#111);width:560px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:4px">+ Yeni Teslimat Takibi</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">Manuel olarak yeni bir tedarikçi teslimat kaydı oluştur</div>'
      + '<div data-wizard-body style="min-height:240px"></div>'
      + '<div data-wizard-buttons style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"></div>'
    + '</div>';
    document.body.appendChild(mo);
    _edWizardRender();
  };

  /* ─── AKSİYON MENÜ (Sorumlu Değiştir / Öncelik / Gecikme) ─ */
  window._edPriorityMenu = function(edId) {
    var pri = window.prompt('Öncelik seç (LOW / NORMAL / CRITICAL):', 'NORMAL');
    if (!pri) return;
    pri = pri.trim().toUpperCase();
    var r = window._edUpdatePriority(edId, pri);
    if (r && r.success) { if (window.toast) window.toast(t('ed.toast.priorityUpdated'), 'ok'); window._edRenderPanel(); }
    else { if (window.toast) window.toast((r && r.error) || t('ed.toast.genericError'), 'err'); }
  };

  window._edChangeResponsibleModal = function(edId) {
    var ex = document.getElementById('ed-change-resp-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-change-resp-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:420px;max-width:92vw;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:16px">' + (typeof window.t === 'function' ? window.t('ed.modal.sorumluDegistir') : 'Sorumlu Değiştir') + '</div>'
      + _edWizardLabel('Yeni Sorumlu *')
      + '<select id="edcr-user" style="' + _edWizardInput + ';margin-bottom:12px">' + _edUserOpts('') + '</select>'
      + _edWizardLabel('Devir Sebebi (opsiyonel)')
      + '<textarea id="edcr-reason" rows="3" placeholder="Tatile çıktı, görev değişti..." style="' + _edWizardInput + ';resize:vertical;margin-bottom:16px"></textarea>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\'ed-change-resp-modal\').remove()" style="padding:8px 14px;border:0.5px solid var(--b);background:transparent;color:var(--t2);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">İptal</button>'
        + '<button onclick="window._edChangeRespSubmit && window._edChangeRespSubmit(\'' + _uiEsc(edId) + '\')" style="padding:8px 16px;border:none;background:#1A8D6F;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Devret</button>'
      + '</div>'
    + '</div>';
    document.body.appendChild(mo);
  };

  window._edChangeRespSubmit = function(edId) {
    var userSel = document.getElementById('edcr-user');
    var reason = (document.getElementById('edcr-reason') || {}).value || '';
    if (!userSel || !userSel.value) { if (window.toast) window.toast(t('ed.toast.selectNewResponsible'), 'err'); return; }
    var opt = userSel.selectedOptions && userSel.selectedOptions[0];
    var role = (opt && opt.getAttribute('data-role')) || 'staff';
    var r = window._edChangeResponsible(edId, userSel.value, role, reason.trim());
    if (r && r.success) {
      document.getElementById('ed-change-resp-modal').remove();
      if (window.toast) window.toast(t('ed.toast.responsibleChanged'), 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || t('ed.toast.genericError'), 'err');
    }
  };

  window._edDelayReasonModal = function(edId) {
    var ex = document.getElementById('ed-delay-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-delay-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:420px;max-width:92vw;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:16px">Gecikme Sebebi</div>'
      + _edWizardLabel('Sorumlu *')
      + '<select id="eddl-owner" style="' + _edWizardInput + ';margin-bottom:12px">'
        + '<option value="">— Seçin —</option><option value="supplier">Tedarikçi</option><option value="logistics">Lojistik</option><option value="internal">Dahili</option>'
      + '</select>'
      + _edWizardLabel('Sebep Açıklaması (min 10 karakter) *')
      + '<textarea id="eddl-reason" rows="4" maxlength="1000" placeholder="Üretim hattında arıza..." style="' + _edWizardInput + ';resize:vertical;margin-bottom:16px"></textarea>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\'ed-delay-modal\').remove()" style="padding:8px 14px;border:0.5px solid var(--b);background:transparent;color:var(--t2);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">İptal</button>'
        + '<button onclick="window._edDelayReasonSubmit && window._edDelayReasonSubmit(\'' + _uiEsc(edId) + '\')" style="padding:8px 16px;border:none;background:#E0574F;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
      + '</div>'
    + '</div>';
    document.body.appendChild(mo);
  };

  window._edDelayReasonSubmit = function(edId) {
    var owner = (document.getElementById('eddl-owner') || {}).value || '';
    var reason = ((document.getElementById('eddl-reason') || {}).value || '').trim();
    var r = window._edSetDelayOwner(edId, owner, reason);
    if (r && r.success) {
      document.getElementById('ed-delay-modal').remove();
      if (window.toast) window.toast(t('ed.toast.delaySaved'), 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || t('ed.toast.genericError'), 'err');
    }
  };

  /* LOJISTIK-RENK-001: yön/admin mevcut kayda 3 alan atar/değiştirir */
  window._edAtaModal = function(edId) {
    if (!_edAdminFields()) { window.toast?.(t('ed.toast.permissionDenied'), 'warn'); return; }
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = list.find(function(x){return String(x.id)===String(edId);});
    if (!ed) { window.toast?.(t('ed.toast.notFound'), 'err'); return; }
    var old = document.getElementById('mo-ed-ata'); if (old) old.remove();
    var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ed-ata';
    mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden">'
      + '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);font-size:14px;font-weight:600">' + (typeof window.t === 'function' ? window.t('ed.modal.ata') : 'İhracat / Sipariş / Renk Ata') + '</div>'
      + '<div style="padding:18px 20px">'
      + '<div style="margin-bottom:12px"><div class="fl" style="font-size:11px;color:var(--t3);margin-bottom:4px">İhracat ID <span style="color:var(--t3);font-size:10px">(max 15 karakter)</span></div>' + _lojIhracatDropdownHtml('ed-at-ihracat', ed.ihracatId || '') + '</div>'
      + '<div style="margin-bottom:12px"><div class="fl" style="font-size:11px;color:var(--t3);margin-bottom:4px">Sipariş Kodu <span style="color:var(--t3);font-size:10px">(müşteri ref)</span></div><input class="fi" id="ed-at-siparis" value="' + _uiEsc(ed.siparisKodu || '') + '" placeholder="ALC-2026-0099" style="width:100%"></div>'
      + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:12px">'
      + '<div><div class="fl" style="font-size:11px;color:var(--t3);margin-bottom:4px">Koli Etiket Rengi</div>' + _lojRenkPickerHtml('ed-at-renk', ed.koliRenk || '') + '</div>'
      + '<div><div class="fl" style="font-size:11px;color:var(--t3);margin-bottom:4px">Emoji <span style="color:var(--t3);font-size:10px">(opsiyonel)</span></div><input class="fi" id="ed-at-emoji" value="' + _uiEsc(ed.koliEmoji || '') + '" maxlength="4" placeholder="📦" style="width:100%"></div>'
      + '</div></div>'
      + '<div style="padding:12px 20px;border-top:0.5px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-ed-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._edAtaKaydet(\'' + _uiEsc(String(ed.id)) + '\')">Kaydet</button></div></div>';
    document.body.appendChild(mo); setTimeout(function(){mo.classList.add('open');},10);
  };

  window._edAtaKaydet = function(edId) {
    if (!_edAdminFields()) { window.toast?.(t('ed.toast.permissionDenied'), 'warn'); return; }
    var g = function(eid) { return document.getElementById(eid); };
    var patch = {
      ihracatId: _lojIhrValue('ed-at-ihracat').slice(0, 15),
      siparisKodu: (g('ed-at-siparis')?.value || '').trim(),
      koliRenk: g('ed-at-renk')?.value || '',
      koliEmoji: (g('ed-at-emoji')?.value || '').slice(0, 4)
    };
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = list.findIndex(function(x){return String(x.id)===String(edId);});
    if (idx < 0) { window.toast?.(t('ed.toast.notFound'), 'err'); return; }
    var prev = { ihracatId: list[idx].ihracatId || '', siparisKodu: list[idx].siparisKodu || '', koliRenk: list[idx].koliRenk || '', koliEmoji: list[idx].koliEmoji || '' };
    list[idx].ihracatId = patch.ihracatId;
    list[idx].siparisKodu = patch.siparisKodu;
    list[idx].koliRenk = patch.koliRenk;
    list[idx].koliEmoji = patch.koliEmoji;
    list[idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    if (typeof window.logActivity === 'function') {
      var changes = [];
      Object.keys(prev).forEach(function(key){
        if (String(prev[key]) !== String(list[idx][key])) changes.push(key + ':' + (prev[key] || '∅') + '→' + (list[idx][key] || '∅'));
      });
      if (changes.length) window.logActivity('expected_delivery', 'ata', edId, changes.join(','));
    }
    document.getElementById('mo-ed-ata')?.remove();
    window.toast?.(t('ed.toast.assignSaved'), 'ok');
    if (typeof window._edRefresh === 'function') window._edRefresh();
    else if (typeof window.renderEdList === 'function') window.renderEdList();
  };

  window._edAksiyonMenu = function(edId) {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = all.find(function(e) { return e.id === edId; });
    if (!ed) return;
    var isOverdue = window._edIsOverdue && window._edIsOverdue(ed) && ed.status !== 'TESLIM_ALINDI';
    var ex = document.getElementById('ed-aksiyon-menu'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-aksiyon-menu';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);min-width:240px;max-width:92vw;border-radius:12px;padding:8px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;padding:10px 12px 6px">Aksiyon</div>'
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edChangeResponsibleModal && window._edChangeResponsibleModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">👤 ' + (typeof window.t === 'function' ? window.t('ed.modal.sorumluDegistir') : 'Sorumlu Değiştir') + '</button>'
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edPriorityMenu && window._edPriorityMenu(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">⭐ Öncelik Değiştir</button>'
      + (isOverdue ? '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edDelayReasonModal && window._edDelayReasonModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px;color:#E0574F" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">⚠️ Gecikme Sebebi</button>' : '')
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edEkeGozAt && window._edEkeGozAt(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">📎 Eke göz at</button>'
      /* SHIPMENT-DOC-UI-MINIMAL-001: modal aç (V124, ana fn) */
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._shipmentDocUiOpen && window._shipmentDocUiOpen(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">📦 Belgeler</button>'
      /* V187e: Probe (DevTools) UI'dan kaldırıldı — operasyon kullanıcısı için anlamsızdı.
       * Global window._shipmentDocProbe fonksiyonu KORUNUR — admin console'dan çağırabilir:
       *   window._shipmentDocProbe('ed_xxxxx') */
      /* LOJISTIK-RENK-001: yön/admin koşullu Ata buton (Düzenle ÖNCESİ) */
      + (_edAdminFields() ? '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edAtaModal && window._edAtaModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">🏷️ ' + (typeof window.t === 'function' ? window.t('ed.modal.ata') : 'İhracat / Sipariş / Renk Ata') + '</button>' : '')
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edEditModal && window._edEditModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">✏️ Düzenle</button>'
      /* V188a — Sevkiyat Wizard: konteynerNo/armator/trackingUrl/varisZamani için ayrı modal */
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edSevkiyatWizardAc && window._edSevkiyatWizardAc(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">' + (typeof window.t === 'function' ? window.t('ed.actionMenu.sevkiyat') : '🚛 Sevkiyat Bilgisi') + '</button>'
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edDeleteConfirm && window._edDeleteConfirm(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px;color:#E0574F" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">🗑️ Sil</button>'
    + '</div>';
    document.body.appendChild(mo);
  };

  /* LOJ-ED-LIST-001 — Beklenen Teslimatlar liste render (Sevkiyat Merkezi için) */
  window.renderEdList = function(){
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries() : []) || [];
    var cu = typeof window.CU === 'function' ? window.CU() : null;
    var list = all;
    // User isolation — non-admin sadece kendi sorumlu/createdBy
    if (cu && (cu.role || cu.rol) !== 'admin') {
      var uid = String(cu.id || cu.uid || '');
      if (uid) {
        list = all.filter(function(ed){
          return String(ed.responsibleUserId || '') === uid || String(ed.createdBy || '') === uid || String(ed.createdById || '') === uid;
        });
      }
    }
    // Enrich
    list = list.map(function(ed){ return typeof window._edEnrich === 'function' ? window._edEnrich(Object.assign({}, ed)) : ed; });
    // Sort: overdue önce, sonra ETA yakın
    list.sort(function(a,b){
      var ao = typeof window._edIsOverdue === 'function' && window._edIsOverdue(a) ? 1 : 0;
      var bo = typeof window._edIsOverdue === 'function' && window._edIsOverdue(b) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      var at = new Date(a.estimatedDeliveryDate || '9999-12-31').getTime();
      var bt = new Date(b.estimatedDeliveryDate || '9999-12-31').getTime();
      return at - bt;
    });

    /* V190b — 15 status hardcoded renk → 4 renk grubu (mevcut CSS variable sistemi).
     * NEUTRAL (8): Açık/Bekliyor   → var(--t2) / var(--s2)
     * ACCENT  (3): Aktif/Yolda     → var(--blt) / var(--blb)
     * SUCCESS (3): Tamamlandı       → var(--grt) / var(--grb)
     * DANGER  (1): Sorun            → var(--rdt) / var(--rdb)
     * Dark mode otomatik (theme dosyasında dark variant'ları tanımlı). */
    var STATUS = {
      'SIPARIS_ASAMASINDA':{t:'Sipariş Aşamasında',c:'var(--t2)',bg:'var(--s2)'},
      'TEDARIK_ASAMASINDA':{t:'Tedarik',c:'var(--t2)',bg:'var(--s2)'},
      'URETIMDE':{t:'Üretimde',c:'var(--t2)',bg:'var(--s2)'},
      'SATICIDA_HAZIR':{t:'Satıcıda Hazır',c:'var(--t2)',bg:'var(--s2)'},
      'YUKLEME_NOKTASINDA':{t:'Yükleme Noktasında',c:'var(--t2)',bg:'var(--s2)'},
      'YUKLEME_PLANLANDI':{t:'Yükleme Planlandı',c:'var(--t2)',bg:'var(--s2)'},
      'YUKLEME_BEKLIYOR':{t:'Yükleme Bekliyor',c:'var(--t2)',bg:'var(--s2)'},
      'SEVK_EDILDI':{t:'Sevk Edildi',c:'var(--t2)',bg:'var(--s2)'},
      'YOLDA':{t:'Yolda',c:'var(--blt)',bg:'var(--blb)'},
      'GUMRUKTE':{t:'Gümrükte',c:'var(--blt)',bg:'var(--blb)'},
      'DEPODA':{t:'Depoda',c:'var(--blt)',bg:'var(--blb)'},
      'TESLIM_ALINDI':{t:'Teslim Edildi',c:'var(--grt)',bg:'var(--grb)'},
      'KONTEYNIRA_YUKLENDI':{t:'Konteynıra Yüklendi',c:'var(--grt)',bg:'var(--grb)'},
      'MUSTERI_TESLIM_ALDI':{t:'Müşteri Teslim Aldı',c:'var(--grt)',bg:'var(--grb)'},
      'GECIKTI':{t:'Gecikmiş',c:'var(--rdt)',bg:'var(--rdb)'}
    };
    var card = 'background:var(--sf);border-radius:12px;border:0.5px solid var(--b);overflow:hidden;margin-top:12px';
    var hdr = 'padding:11px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between';
    var esc = window._esc || function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};

    if (list.length === 0) {
      return '<div style="'+card+'">'
        + '<div style="'+hdr+'"><span style="font-size:13px;font-weight:500">Beklenen Teslimatlar</span>'
        + '<button onclick="window._edWizardAc && window._edWizardAc()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:var(--t2);font-family:inherit">+ Yeni</button></div>'
        + '<div style="padding:32px 16px;text-align:center;color:var(--t3);font-size:12px">Henüz teslimat takibi yok. Yukarıdan "+ Yeni Teslimat Takibi" ile ekleyebilirsin.</div>'
        + '</div>';
    }

    // Cari lookup
    var cariMap = {};
    try { (typeof window.loadCari === 'function' ? window.loadCari() : []).forEach(function(c){ cariMap[String(c.id)] = c.name || c.unvan || c.ad || c.firmaAdi || ''; }); } catch(e){}

    /* LOJ-1B-D: Filter state + apply + filterBar */
    if (!window._edFilterState) window._edFilterState = { yon: '', status: '', search: '' };
    var __fs = window._edFilterState;
    /* V187j — total (filtre öncesi RBAC-filtreli görünür kayıt sayısı) */
    var __totalBeforeFilter = list.length;
    /* V189b — KX10 fix: filter logic _edApplyFilterState (tek kaynak) üzerinden uygula.
     * Eski duplicate filter (yön + status + search) buradan kaldırıldı. */
    list = (typeof window._edApplyFilterState === 'function')
      ? window._edApplyFilterState(list)
      : list;
    var __fbStyle = 'font-size:11px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--sf);color:var(--t);font-family:inherit;cursor:pointer';
    var __fbActive = 'font-size:11px;padding:5px 10px;border:0.5px solid var(--ac);border-radius:5px;background:var(--ac);color:#fff;font-family:inherit;cursor:pointer;font-weight:500';
    var filterBar = '<div style="padding:8px 16px;background:var(--s2);border-bottom:0.5px solid var(--b);display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      + '<button type="button" onclick="window._edFilter && window._edFilter(\'yon\', \'\')" style="' + (__fs.yon === '' ? __fbActive : __fbStyle) + '">Tümü</button>'
      + '<button type="button" onclick="window._edFilter && window._edFilter(\'yon\', \'GELEN\')" style="' + (__fs.yon === 'GELEN' ? __fbActive : __fbStyle) + '">📥 Gelen</button>'
      + '<button type="button" onclick="window._edFilter && window._edFilter(\'yon\', \'GIDEN\')" style="' + (__fs.yon === 'GIDEN' ? __fbActive : __fbStyle) + '">📤 Giden</button>'
      + '<select onchange="window._edFilter && window._edFilter(\'status\', this.value)" style="' + __fbStyle + ';padding:5px 8px">'
        + '<option value=""' + (__fs.status === '' ? ' selected' : '') + '>Tüm Durumlar</option>'
        + STATUSES.map(function(__sk){var __s = STATUS[__sk]; return '<option value="' + __sk + '"' + (__fs.status === __sk ? ' selected' : '') + '>' + (__s ? __s['t'] : __sk) + '</option>';}).join('')
      + '</select>'
      + '<input type="search" placeholder="Ara: ürün, tedarikçi, EXP, sipariş, sorumlu, şehir, armatör..." value="' + esc(__fs.search || '') + '" oninput="window._edFilter && window._edFilter(\'search\', this.value)" style="' + __fbStyle + ';flex:1;min-width:160px;cursor:text">'
    + '</div>';
    var rows = list.slice(0,20).map(function(ed){
      var st = STATUS[ed.status] || {t: ed.status || '-', c:'#6B7280', bg:'#F3F4F6'};
      var tedAd = cariMap[String(ed.supplierId)] || ed.tedarikci || '—';
      var eta = ed.estimatedDeliveryDate ? new Date(ed.estimatedDeliveryDate).toLocaleDateString('tr-TR',{day:'2-digit',month:'short'}) : '—';
      var rd = typeof ed.remainingDays === 'number' ? ed.remainingDays : null;
      var daysHtml = '';
      if (rd !== null) {
        if (rd < 0) daysHtml = '<span style="color:#DC2626;font-weight:500">'+Math.abs(rd)+' gün geç</span>';
        else if (rd === 0) daysHtml = '<span style="color:#EA580C;font-weight:500">Bugün</span>';
        else if (rd < 7) daysHtml = '<span style="color:#CA8A04">'+rd+' gün</span>';
        else daysHtml = '<span style="color:var(--t3)">'+rd+' gün</span>';
      }
      var qd = ed.quantityDelivered || 0, qt = ed.quantityTotal || 0;
      var pct = qt > 0 ? Math.round(qd/qt*100) : 0;
      var __yon = ed.yon || 'GIDEN';
      /* SHIPMENT-LIST-COLUMNS-002: TIR grup tint — konteynerNo varsa #E3F2FD override (V133.1) */
      var __rowBg = ed.konteynerNo ? '#E3F2FD' : (__yon === 'GELEN' ? 'rgba(59,130,246,0.06)' : 'rgba(249,115,22,0.06)');
      var __yonBadge = __yon === 'GELEN' ? '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#DBEAFE;color:#1E40AF;font-weight:500">📥 Gelen</span>' : '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#FED7AA;color:#9A3412;font-weight:500">📤 Giden</span>';
      var __sorumluAd = ed.responsibleUserId ? _edUserAd(ed.responsibleUserId) : '';
      var __sorumluInitials = __sorumluAd && __sorumluAd !== '—' ? __sorumluAd.split(' ').map(function(__p){return (__p[0]||'').toUpperCase();}).slice(0,2).join('') : '—';
      var __ikonlar = '';
      if (ed.belgeUrl) __ikonlar += '<a href="' + esc(ed.belgeUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="text-decoration:none;font-size:13px;margin-right:4px" title="Belge / PDF">📎</a>';
      /* V184a5: Tracking link grup başlığında — row'dan kaldırıldı */
      /* SHIPMENT-DOC-LIST-PROGRESS-001: belge progress badge (V125.1, ed.shipmentDoc varsa) */
      if (window._shipmentDocCardBadgeHtml) __ikonlar += window._shipmentDocCardBadgeHtml(ed);
      if (!__ikonlar) __ikonlar = '<span style="color:var(--t3);font-size:10px">—</span>';
      /* V187c — 14-kolon grid (Sevkiyat hücresi KG/m³ sonrası) */
      return '<div data-ed-id="' + esc(String(ed.id || '')) + '" data-ihracat-id="' + esc(String(ed.ihracatId || '')) + '" style="display:grid;grid-template-columns:0.5fr 1.2fr 2fr 1fr 0.8fr 0.9fr 1.1fr 0.8fr 0.7fr 1fr 0.7fr 1.4fr 0.7fr auto;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--b);align-items:center;font-size:12px;background:' + __rowBg + '">'
        + '<div>' + __yonBadge + '</div>'
        + '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (ed.ihracatId ? esc(String(ed.ihracatId).slice(0,15)) : '<span style="color:var(--t3)">—</span>') + '</div>'
        + '<div><div style="font-weight:500;color:var(--t)">'+esc(ed.productName||'—')+'</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+esc(tedAd)+'</div></div>'
        /* V184a5: Konteyner kolonu kaldırıldı (grup başlığında) */
        + '<div onclick="event.stopPropagation()"><select onchange="window._edStatusChange && window._edStatusChange(\'' + esc(ed.id) + '\', this.value)" style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:500;color:' + st['c'] + ';background:' + st['bg'] + ';border:0.5px solid ' + st['c'] + '33;cursor:pointer;font-family:inherit">' + STATUSES.map(function(__sk){var __s = STATUS[__sk];return '<option value="' + __sk + '"' + (ed.status === __sk ? ' selected' : '') + '>' + esc(__s ? __s['t'] : __sk) + '</option>';}).join('') + '</select></div>'
        + '<div style="font-variant-numeric:tabular-nums;color:var(--t2)">'+qd+'/'+qt+' <span style="color:var(--t3);font-size:10px">(%'+pct+')</span></div>'
        /* SHIPMENT-LIST-COLUMNS-002: KG/m³ + konteyner uyarı (V133.1) */
        + '<div style="font-size:10px;line-height:1.3">' + ((ed.weightKg || ed.volumeM3) ? '<div style="font-family:ui-monospace,monospace;color:var(--t2);font-weight:500">' + (ed.weightKg ? Math.round(ed.weightKg).toLocaleString('tr-TR') + ' kg' : '—') + (ed.volumeM3 ? ' / ' + ed.volumeM3.toLocaleString('tr-TR') + ' m³' : '') + '</div>' : '<span style="color:var(--t3)">—</span>') + '</div>'
        /* V187c — Sevkiyat kompakt hücresi (Line 1: #SıraNo + Önc badge / Line 2: handlingFlags emoji) + multi-line tooltip */
        + (function(){
            var __seqDisp = ed.containerSequenceNo != null ? '#' + ed.containerSequenceNo : '';
            var __priBadge = '';
            if (ed.loadingPriority === 'REQUIRED') {
              __priBadge = '<span style="background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:3px;margin-left:4px;font-size:9px;font-weight:500">⭐</span>';
            } else if (ed.loadingPriority === 'OPTIONAL') {
              __priBadge = '<span style="background:var(--s2);color:var(--t3);padding:1px 5px;border-radius:3px;margin-left:4px;font-size:9px">○</span>';
            }
            var __flags = Array.isArray(ed.handlingFlags) ? ed.handlingFlags : [];
            var __emojiMap = window.HANDLING_FLAGS_EMOJI || {};
            var __labelKeyMap = window.HANDLING_FLAGS_LABEL_KEY || {};
            var __tFn = (typeof window.t === 'function') ? window.t : function(k){return k;};
            var __emojiBar = __flags.map(function(f){return __emojiMap[f] || '';}).filter(Boolean).join(' ');
            /* Multi-line tooltip — her alan kendi label'ı ile */
            var __tip = [];
            if (__seqDisp) __tip.push('Yükleme Sırası: ' + __seqDisp);
            if (ed.loadingPriority === 'REQUIRED') __tip.push('Öncelik: ⭐ Zorunlu');
            else if (ed.loadingPriority === 'OPTIONAL') __tip.push('Öncelik: ○ Opsiyonel');
            if (__flags.length) {
              __tip.push('Taşıma: ' + __flags.map(function(f){return __labelKeyMap[f] ? __tFn(__labelKeyMap[f]) : f;}).join(', '));
            }
            var __title = __tip.length ? esc(__tip.join('\n')) : '';
            var __empty = !__seqDisp && !__priBadge && !__emojiBar;
            return '<div title="' + __title + '" style="font-size:10px;line-height:1.3;overflow:hidden">'
              + (__empty ? '<span style="color:var(--t3)">—</span>'
                  : ('<div style="font-family:ui-monospace,monospace;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
                     + (__seqDisp ? '<span style="font-weight:500">' + __seqDisp + '</span>' : '')
                     + __priBadge + '</div>'
                     + (__emojiBar ? '<div style="margin-top:2px;font-size:12px;letter-spacing:1px">' + __emojiBar + '</div>' : '')))
              + '</div>';
          })()
        + '<div style="font-variant-numeric:tabular-nums;font-weight:' + (rd !== null && rd < 7 ? '600' : '400') + ';color:' + (rd !== null && rd < 0 ? '#DC2626' : (rd !== null && rd === 0 ? '#EA580C' : (rd !== null && rd < 7 ? '#CA8A04' : 'var(--t2)'))) + '">' + esc(eta) + (rd !== null && rd < 0 ? ' <span style="font-size:9px;font-weight:500">(' + Math.abs(rd) + ' gün geç)</span>' : (rd !== null && rd >= 0 && rd < 7 ? ' <span style="font-size:9px;font-weight:500">(' + (rd === 0 ? 'bugün' : rd + ' gün') + ')</span>' : '')) + '</div>'
        + '<div style="text-align:center"><div style="font-size:11px;font-weight:600;color:var(--t2)" title="' + esc(__sorumluAd || 'Atanmamış') + '">' + esc(__sorumluInitials) + '</div>' + (function(){var __short = (typeof window._teslimatYapanShort === 'function') ? window._teslimatYapanShort(ed.teslimTipi) : ''; return __short ? '<div style="font-size:9px;color:var(--t3);margin-top:1px;white-space:nowrap" title="' + esc(__short) + '">' + esc(__short) + '</div>' : '';})() + '</div>'
        /* LOJISTIK-RENK-001: Sipariş Kodu + Renk hücreleri */
        + '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (ed.siparisKodu ? esc(String(ed.siparisKodu)) : '<span style="color:var(--t3)">—</span>') + '</div>'
        + '<div style="text-align:center">' + _lojRenkBadge(ed.koliRenk, ed.koliEmoji) + '</div>'
        /* V184a2 / LOJ-ROTA-INFO-001: Rota hücresi (dikey 4-line: üst ilçe, alt şehir) */
        + '<div style="font-size:10px;line-height:1.25;overflow:hidden">' + ((ed.originCity || ed.originDistrict || ed.destinationCity || ed.destinationDistrict) ? ('<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t2);font-weight:500">' + esc(ed.originDistrict || '?') + '</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t3);font-size:9px">' + esc(ed.originCity || '?') + '</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t2);font-weight:500;margin-top:2px">→ ' + esc(ed.destinationDistrict || '?') + '</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t3);font-size:9px">' + esc(ed.destinationCity || '?') + '</div>') : '<span style="color:var(--t3)">—</span>') + '</div>'
        + '<div style="font-size:13px;text-align:center">' + __ikonlar + '</div>'
        + '<button onclick="event.stopPropagation();window._edAksiyonMenu && window._edAksiyonMenu(\''+esc(ed.id)+'\')" style="padding:4px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t3);font-size:14px;font-family:inherit;line-height:1">⋮</button>'
        + '</div>';
    }).join('');

    /* V187c — 14-kolon header (Yön | İhrID | Ürün/Ted | Durum | Miktar | KG/m³ | Sevkiyat | Tahmini | Sorumlu | SipKod | Renk | Rota | İkon | Aksiyon) */
    var hdrRow = '<div style="display:grid;grid-template-columns:0.5fr 1.2fr 2fr 1fr 0.8fr 0.9fr 1.1fr 0.8fr 0.7fr 1fr 0.7fr 1.4fr 0.7fr auto;gap:10px;padding:8px 16px;background:var(--s2);font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">'
      + '<div>Yön</div><div>İhracat ID</div><div>Ürün / Tedarikçi</div><div>Durum</div><div>Miktar</div><div style="background:#E8F5E9;border-radius:4px 4px 0 0;padding:4px 6px;margin:-4px -6px">KG / m³</div><div title="Sıra No · Yükleme Önc · Taşıma Uyarıları">Sevkiyat</div><div>Tahmini</div><div>Sorumlu</div><div>Sipariş Kodu</div><div>Renk</div><div>Rota</div><div>İkon</div><div></div></div>';

    return '<div id="ed-list-container" style="'+card+'">'
      + '<div style="'+hdr+'">'
      + '<span style="font-size:13px;font-weight:500">Beklenen Teslimatlar <span style="font-weight:400;color:var(--t3);font-size:11px;margin-left:6px">' + (__totalBeforeFilter !== list.length ? (__totalBeforeFilter + ' kayıt (' + list.length + ' görünür)') : (list.length + ' kayıt')) + '</span></span>'
      /* V190e — Apple style: 3 export buton (V187g/h/i) → 1 ⋮ Daha fazla menü.
       * _edExportPdf/Xlsx/Json fonksiyonları korundu, sadece UI giriş noktası değişti.
       * Liste boşsa ⋮ gizlenir (export anlamsız). */
      + '<button onclick="window._edWizardAc && window._edWizardAc()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:var(--t2);font-family:inherit;margin-right:6px">+ Yeni</button>'
      + (list.length > 0 ? '<button onclick="window._edExportMenuAc && window._edExportMenuAc()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:var(--t2);font-family:inherit;margin-right:6px" title="' + (typeof window.t === 'function' ? window.t('ed.toolbar.more') : 'Daha fazla') + '">⋮</button>' : '')
      + (window._edPendingBtnHTML ? window._edPendingBtnHTML() : '')
      + '</div>'
      + filterBar
      + hdrRow + rows
      + (list.length > 20 ? '<div style="padding:8px 16px;text-align:center;font-size:10px;color:var(--t3)">+'+(list.length-20)+' kayıt daha</div>' : '')
      + '</div>';
  };

  /* ────────────────────────────────────────────────────────────────
   * V190e — EXPORT MENU (⋮ Daha fazla dropdown)
   * 3 export butonu (V187g/h/i) tek ⋮ menü altında toplandı.
   * _edAksiyonMenu pattern'i reuse — fixed modal, dış-tıklamada kapan.
   * ──────────────────────────────────────────────────────────────── */
  window._edExportMenuAc = function () {
    var t = (typeof window.t === 'function') ? window.t : function (k) { return k; };
    var ex = document.getElementById('ed-export-menu'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-export-menu';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function (e) { if (e.target === mo) mo.remove(); };
    var btnStyle = 'display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px';
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);min-width:240px;max-width:92vw;border-radius:12px;padding:8px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;padding:10px 12px 6px">' + t('ed.toolbar.exportTitle') + '</div>'
      + '<button onclick="document.getElementById(\'ed-export-menu\').remove();window._edExportJson && window._edExportJson()" style="' + btnStyle + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">' + t('ed.toolbar.json') + '</button>'
      + '<button onclick="document.getElementById(\'ed-export-menu\').remove();window._edExportXlsx && window._edExportXlsx()" style="' + btnStyle + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">' + t('ed.toolbar.xlsx') + '</button>'
      + '<button onclick="document.getElementById(\'ed-export-menu\').remove();window._edExportPdf && window._edExportPdf()" style="' + btnStyle + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">' + t('ed.toolbar.pdf') + '</button>'
      + '</div>';
    document.body.appendChild(mo);
  };

  /* ─── V187g — Export Center: PDF export (html2pdf wrapper) ───────
   * #ed-list-container DOM'unu A4 PDF'e çevirir.
   * Müşteri sunumuna uygun: filtre uygulanmış görünüm aktarılır.
   * html2pdf yoksa toast ile bildirir, sessiz fail değil. */
  window._edExportPdf = function () {
    var t = (typeof window.t === 'function') ? window.t : function (k) { return k; };
    if (typeof html2pdf === 'undefined') {
      if (typeof window.toast === 'function') window.toast(t('ed.toast.pdfMissing'), 'err');
      return;
    }
    var el = document.getElementById('ed-list-container');
    if (!el) {
      if (typeof window.toast === 'function') window.toast(t('ed.toast.pdfMissing'), 'err');
      return;
    }
    var dateStr = new Date().toISOString().slice(0, 10);
    var filename = t('ed.export.pdf.filename') + '_' + dateStr + '.pdf';
    if (typeof window.toast === 'function') window.toast(t('ed.toast.pdfGenerating'), 'ok');
    /* K05: PDF export audit log */
    try {
      if (typeof window.logActivity === 'function') {
        window.logActivity('ed_pdf_export', 'recordCount=' + (el.querySelectorAll('[data-ed-id]').length || 0));
      }
    } catch (e) {}
    html2pdf().set({
      margin: 8,
      filename: filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.5, logging: false, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }  // 14 kolon → landscape
    }).from(el).save();
  };

  /* ─── V187h — Export Center: Excel export (SheetJS XLSX) ─────────
   * Veri tabanlı (DOM bağımsız) — 20 kolon, lookup'lı (Tedarikçi/Sorumlu adı çekilir).
   * K06: soft-deleted kayıtlar dahil edilmez (sadece isDeleted!==true).
   * V187a/b/c yeni alanları (proformaId, containerSequenceNo, loadingPriority, handlingFlags) kapsanır. */
  window._edExportXlsx = function () {
    var t = (typeof window.t === 'function') ? window.t : function (k) { return k; };
    if (typeof XLSX === 'undefined') {
      if (typeof window.toast === 'function') window.toast(t('ed.toast.xlsxMissing'), 'err');
      return;
    }
    var list = (typeof window.loadExpectedDeliveries === 'function')
      ? (window.loadExpectedDeliveries({ raw: true }) || [])
      : [];
    /* K06: soft-deleted hariç */
    list = list.filter(function (d) { return d && !d.isDeleted; });
    /* V187j — filterState uygula (toolbar'da görünenle aynı export edilsin) */
    if (typeof window._edApplyFilterState === 'function') list = window._edApplyFilterState(list);
    if (list.length === 0) {
      if (typeof window.toast === 'function') window.toast(t('ed.toast.xlsxGenerating'), 'warn');
      return;
    }
    if (typeof window.toast === 'function') window.toast(t('ed.toast.xlsxGenerating'), 'ok');

    /* Lookup tabloları (Tedarikçi adı, Sorumlu adı, Status label) */
    var cariList = (typeof window.loadCari === 'function') ? (window.loadCari() || []) : [];
    var cariMap = {};
    cariList.forEach(function (c) { if (c && c.id) cariMap[String(c.id)] = c; });
    var userAdFn = (typeof window._edUserAd === 'function') ? window._edUserAd : function (uid) { return uid || ''; };
    var statusLabels = window.STATUS_LABELS || {};
    var emojiMap = window.HANDLING_FLAGS_EMOJI || {};

    /* Header (TR i18n'den; 20 kolon — V187a/b/c yeni alanları işaretli) */
    var header = [
      t('ed.label.yon'), t('ed.label.ihracatId'), t('ed.label.siparisKodu'), t('ed.label.proformaId'),
      t('ed.label.productName'), t('ed.label.supplier'), t('ed.label.quantity'), t('ed.label.unit'),
      t('ed.label.weightKg'), t('ed.label.volumeM3'), t('ed.label.estimatedDeliveryDate'), t('ed.label.status'),
      t('ed.label.containerSequenceNo'), t('ed.label.loadingPriority'), t('ed.label.handlingFlags'),
      t('ed.label.konteynerNo'), t('ed.label.armator'), t('ed.label.responsibleUser'), t('ed.label.renk'),
      'Rota'  // ed.label namespace'inde 'Rota' tek bir anahtar yok — composite (originCity → destinationCity)
    ];

    /* Satır: enum'lar TR label'a açılır (REQUIRED→Zorunlu, GIDEN→Giden vb) */
    var loadingPriLabel = function (p) {
      if (p === 'REQUIRED') return t('ed.loadingPri.required');
      if (p === 'OPTIONAL') return t('ed.loadingPri.optional');
      return '';
    };
    var handlingFlagsDisplay = function (flags) {
      if (!Array.isArray(flags) || !flags.length) return '';
      return flags.map(function (f) { return emojiMap[f] || f; }).join(' ');
    };
    var rotaCompose = function (d) {
      var o = (d.originDistrict || '') + (d.originCity ? ' / ' + d.originCity : '');
      var v = (d.destinationDistrict || '') + (d.destinationCity ? ' / ' + d.destinationCity : '');
      if (!o && !v) return '';
      return (o || '?') + ' → ' + (v || '?');
    };

    var rows = [header].concat(list.map(function (d) {
      var sup = cariMap[String(d.supplierId)] || null;
      var supName = sup ? (sup.firma || sup.unvan || sup.ad || '') : '';
      return [
        d.yon === 'GELEN' ? 'Gelen' : 'Giden',
        d.ihracatId || '',
        d.siparisKodu || '',
        d.proformaId || '',
        d.productName || '',
        supName,
        Number(d.quantityTotal || 0),       // numerik — Excel filter/sort için
        d.unit || '',
        d.weightKg != null ? Number(d.weightKg) : '',
        d.volumeM3 != null ? Number(d.volumeM3) : '',
        d.estimatedDeliveryDate || '',
        statusLabels[d.status] || d.status || '',
        d.containerSequenceNo != null ? Number(d.containerSequenceNo) : '',
        loadingPriLabel(d.loadingPriority),
        handlingFlagsDisplay(d.handlingFlags),
        d.konteynerNo || '',
        d.armator || '',
        d.responsibleUserId ? userAdFn(d.responsibleUserId) : '',
        d.renk || d.koliRenk || '',
        rotaCompose(d)
      ];
    }));

    var ws = XLSX.utils.aoa_to_sheet(rows);
    /* Kolon genişlik tahmini (Excel auto-size yok; default genişlik biraz daha rahat) */
    ws['!cols'] = header.map(function (h, i) {
      var w = (i === 4 || i === 5 || i === 19) ? 28  // Ürün, Tedarikçi, Rota geniş
            : (i === 14) ? 16                         // Taşıma Uyarıları emoji
            : (i === 11 || i === 13) ? 16             // Durum, Yük. Önc.
            : 12;
      return { wch: w };
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('ed.export.xlsx.sheetName'));

    var dateStr = new Date().toISOString().slice(0, 10);
    var filename = t('ed.export.xlsx.filename') + '_' + dateStr + '.xlsx';

    /* K05: Excel export audit log */
    try {
      if (typeof window.logActivity === 'function') {
        window.logActivity('ed_xlsx_export', 'recordCount=' + list.length);
      }
    } catch (e) {}

    XLSX.writeFile(wb, filename);
  };

  /* ─── V187i — Export Center: JSON export (Blob + auto-download) ──
   * Vanilla — external lib yok. K06: soft-delete kayıtlar dahil edilmez.
   * Tüm raw alanlar export edilir (geliştirici/destek/yedek senaryosu).
   * K05: audit log (recordCount). */
  window._edExportJson = function () {
    var t = (typeof window.t === 'function') ? window.t : function (k) { return k; };
    var list = (typeof window.loadExpectedDeliveries === 'function')
      ? (window.loadExpectedDeliveries({ raw: true }) || [])
      : [];
    /* K06: soft-deleted hariç */
    list = list.filter(function (d) { return d && !d.isDeleted; });
    /* V187j — filterState uygula (toolbar'da görünenle aynı export edilsin) */
    if (typeof window._edApplyFilterState === 'function') list = window._edApplyFilterState(list);
    if (list.length === 0) return;

    if (typeof window.toast === 'function') window.toast(t('ed.toast.jsonGenerating'), 'ok');

    var dateStr = new Date().toISOString().slice(0, 10);
    var filename = t('ed.export.json.filename') + '_' + dateStr + '.json';
    var payload = {
      exportedAt: new Date().toISOString(),
      version: 'V187i',
      recordCount: list.length,
      records: list
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    /* Cleanup — DOM ve URL ref'ini bırakma (memory leak önleme) */
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    /* K05: JSON export audit log */
    try {
      if (typeof window.logActivity === 'function') {
        window.logActivity('ed_json_export', 'recordCount=' + list.length);
      }
    } catch (e) {}
  };

  /* ─── V186f / K10 cleanup: STATUSES + STATUS_LABELS + STATUS_COLORS + _LOJ_KOLI_RENK ───
   * V186 wizard ortak veri tek kaynaktan okur. V186_STATUSES/V186_RENK kopyaları silindi. */
  window.STATUSES_LIST    = STATUSES;
  window.STATUS_LABELS    = STATUS_LABELS;
  window.STATUS_COLORS    = STATUS_COLORS;
  window.LOJ_RENK_LIST    = _LOJ_KOLI_RENK;
})();
