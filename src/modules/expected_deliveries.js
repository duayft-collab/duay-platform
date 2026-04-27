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
  var STATUSES = ['TEDARIK_ASAMASINDA','URETIMDE','YUKLEME_BEKLIYOR','YOLDA','GUMRUKTE','DEPODA','TESLIM_ALINDI','GECIKTI'];
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
      window.toast && window.toast('AUTO_MODE aktif — manuel giriş için admin yetki gerekli', 'err');
      return { success: false, error: 'mode_restricted' };
    }

    ed = ed || {};
    var v = window._edValidate(ed);
    if (!v.valid) {
      window.toast && window.toast('Eksik: ' + v.errors.join(', '), 'err');
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
      window.toast?.('confirmModal bulunamadı', 'err');
      return;
    }
    window.confirmModal('Bu kaydı silmek istediğinizden emin misiniz?', {
      title: 'Kayıt Sil',
      danger: true,
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: function() {
        if (window._edDelete(edId)) {
          window.toast?.('Kayıt silindi', 'ok');
          window._edRenderPanel?.();
        } else {
          window.toast?.('Silme başarısız', 'err');
        }
      }
    });
  };

  /* LOJ-1B-A: Düzenle butonu — modal + submit handler */
  window._edEditModal = function(edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = list.find(function(e) { return e.id === edId; });
    if (!ed) { window.toast?.('Kayıt bulunamadı', 'err'); return; }
    var ex = document.getElementById('ed-edit-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-edit-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    var statusOpts = [['TEDARIK_ASAMASINDA','Tedarik'],['URETIMDE','Üretimde'],['YUKLEME_BEKLIYOR','Yükleme'],['YOLDA','Yolda'],['TESLIM_ALINDI','Teslim Alındı']];
    var priOpts = [['LOW','Düşük'],['NORMAL','Normal'],['CRITICAL','Kritik']];
    var unitOpts = ['adet','kg','palet','ton','m³','lt','kutu'];
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:600px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:16px">✏️ Kayıt Düzenle</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Ürün Adı *') + '<input id="ede-productName" style="' + _edWizardInput + '" value="' + _uiEsc(ed.productName || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Tedarikçi *') + '<select id="ede-supplierId" style="' + _edWizardInput + '">' + _edSupplierOpts(ed.supplierId) + '</select></div>'
        + '<div>' + _edWizardLabel('Miktar *') + '<input id="ede-quantityTotal" type="number" min="1" step="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums;text-align:right" value="' + (ed.quantityTotal || '') + '"></div>'
        + '<div>' + _edWizardLabel('Birim') + '<select id="ede-unit" style="' + _edWizardInput + '">' + unitOpts.map(function(u) { return '<option value="' + u + '"' + (ed.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div>'
        + '<div>' + _edWizardLabel('Proforma Tarihi') + '<input id="ede-proformaDate" type="date" style="' + _edWizardInput + '" value="' + (ed.proformaDate || '') + '"></div>'
        + '<div>' + _edWizardLabel('Tahmini Teslim *') + '<input id="ede-estimatedDeliveryDate" type="date" style="' + _edWizardInput + '" value="' + (ed.estimatedDeliveryDate || '') + '"></div>'
        + '<div>' + _edWizardLabel('Termin (gün)') + '<input id="ede-deliveryTermDays" type="number" min="1" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.deliveryTermDays || '') + '"></div>'
        + '<div>' + _edWizardLabel('Tolerans (gün)') + '<input id="ede-toleranceDays" type="number" min="0" style="' + _edWizardInput + ';font-variant-numeric:tabular-nums" value="' + (ed.toleranceDays || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Yön') + '<select id="ede-yon" style="' + _edWizardInput + '">' + ['GIDEN','GELEN'].map(function(__y){var __l = __y === 'GIDEN' ? '📤 Giden' : '📥 Gelen'; return '<option value="' + __y + '"' + ((ed.yon || 'GIDEN') === __y ? ' selected' : '') + '>' + __l + '</option>';}).join('') + '</select></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Sorumlu *') + '<select id="ede-responsibleUserId" style="' + _edWizardInput + '">' + _edUserOpts(ed.responsibleUserId) + '</select></div>'
        + '<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--t2);margin-top:8px;padding-top:8px;border-top:0.5px solid var(--b)">Onay & Satınalma</div>'
        + '<div>' + _edWizardLabel('Teklif Onaylayan') + '<select id="ede-teklifOnaylayan" style="' + _edWizardInput + '">' + _edUserOpts(ed.teklifOnaylayan || '') + '</select></div>'
        + '<div>' + _edWizardLabel('Teklif Onay Tarihi') + '<input id="ede-teklifOnayTarihi" type="datetime-local" style="' + _edWizardInput + '" value="' + (ed.teklifOnayTarihi || '') + '"></div>'
        + '<div>' + _edWizardLabel('Avans Ödeme Tarihi') + '<input id="ede-avansOdemeTarihi" type="datetime-local" style="' + _edWizardInput + '" value="' + (ed.avansOdemeTarihi || '') + '"></div>'
        + '<div>' + _edWizardLabel('Satınalma Sorumlusu') + '<select id="ede-satinAlmaSorumlusu" style="' + _edWizardInput + '">' + _edUserOpts(ed.satinAlmaSorumlusu || '') + '</select></div>'
        + '<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--t2);margin-top:8px;padding-top:8px;border-top:0.5px solid var(--b)">Sevkiyat & Takip</div>'
        + '<div>' + _edWizardLabel('Konteyner No') + '<input id="ede-konteynerNo" style="' + _edWizardInput + '" value="' + _uiEsc(ed.konteynerNo || '') + '"></div>'
        + '<div>' + _edWizardLabel('Armatör') + '<select id="ede-armator" onchange="window._edAutoFillTrackingUrl && window._edAutoFillTrackingUrl()" style="' + _edWizardInput + '">' + ['','MSC','Maersk','CMA CGM','COSCO','Hapag-Lloyd','ONE','Evergreen','Yang Ming','HMM','ZIM','PIL','OOCL','Diger'].map(function(__c){return '<option value="' + __c + '"' + (ed.armator === __c ? ' selected' : '') + '>' + (__c || '— Seçin —') + '</option>';}).join('') + '</select></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Yükleme Firma') + '<input id="ede-yuklemeFirmaAd" style="' + _edWizardInput + '" value="' + _uiEsc(ed.yuklemeFirmaAd || '') + '"></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Tracking URL') + '<div style="display:flex;gap:6px;align-items:stretch">' + '<input id="ede-trackingUrl" type="url" style="' + _edWizardInput + ';flex:1" value="' + _uiEsc(ed.trackingUrl || '') + '" placeholder="https://...">' + '<button type="button" onclick="window._edOpenTrackingUrl && window._edOpenTrackingUrl()" style="padding:8px 14px;border:0.5px solid var(--b);background:var(--s2);color:var(--t2);border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap" title="Yeni sekmede aç">🔗 Aç</button>' + '</div></div>'
        + '<div style="grid-column:span 2">' + _edWizardLabel('Varış Zamanı') + '<input id="ede-varisZamani" type="datetime-local" style="' + _edWizardInput + '" value="' + (ed.varisZamani || '') + '"></div>'
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
  };

  window._edEditSubmit = function(edId) {
    var productName = (document.getElementById('ede-productName')?.value || '').trim();
    var supplierId = document.getElementById('ede-supplierId')?.value || '';
    var quantityTotal = parseFloat(document.getElementById('ede-quantityTotal')?.value) || 0;
    if (!productName) { window.toast?.('Ürün adı zorunlu', 'err'); return; }
    if (!supplierId) { window.toast?.('Tedarikçi zorunlu', 'err'); return; }
    if (quantityTotal <= 0) { window.toast?.('Miktar > 0 olmalı', 'err'); return; }
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) { window.toast?.('Kayıt bulunamadı', 'err'); return; }
    list[idx].productName = productName;
    list[idx].supplierId = supplierId;
    list[idx].quantityTotal = quantityTotal;
    list[idx].unit = document.getElementById('ede-unit')?.value || list[idx].unit;
    list[idx].proformaDate = document.getElementById('ede-proformaDate')?.value || '';
    list[idx].estimatedDeliveryDate = document.getElementById('ede-estimatedDeliveryDate')?.value || '';
    list[idx].deliveryTermDays = parseInt(document.getElementById('ede-deliveryTermDays')?.value) || list[idx].deliveryTermDays;
    list[idx].toleranceDays = parseInt(document.getElementById('ede-toleranceDays')?.value) || 0;
    list[idx].yon = document.getElementById('ede-yon')?.value || 'GIDEN';
    list[idx].responsibleUserId = document.getElementById('ede-responsibleUserId')?.value || list[idx].responsibleUserId;
    list[idx].teklifOnaylayan = document.getElementById('ede-teklifOnaylayan')?.value || '';
    list[idx].teklifOnayTarihi = document.getElementById('ede-teklifOnayTarihi')?.value || '';
    list[idx].avansOdemeTarihi = document.getElementById('ede-avansOdemeTarihi')?.value || '';
    list[idx].satinAlmaSorumlusu = document.getElementById('ede-satinAlmaSorumlusu')?.value || '';
    list[idx].konteynerNo = document.getElementById('ede-konteynerNo')?.value || '';
    list[idx].armator = document.getElementById('ede-armator')?.value || '';
    list[idx].yuklemeFirmaAd = document.getElementById('ede-yuklemeFirmaAd')?.value || '';
    list[idx].trackingUrl = document.getElementById('ede-trackingUrl')?.value || '';
    list[idx].varisZamani = document.getElementById('ede-varisZamani')?.value || '';
    list[idx].belgeUrl = document.getElementById('ede-belgeUrl')?.value || '';
    list[idx].priority = document.getElementById('ede-priority')?.value || 'NORMAL';
    list[idx].status = document.getElementById('ede-status')?.value || list[idx].status;
    list[idx].updatedAt = new Date().toISOString();
    if (typeof window.storeExpectedDeliveries === 'function') window.storeExpectedDeliveries(list);
    document.getElementById('ed-edit-modal')?.remove();
    window.toast?.('Kayıt güncellendi', 'ok');
    window._edRenderPanel?.();
  };

  /* LOJ-1B-C1: Inline status combobox + statusHistory */
  window._edStatusChange = function(edId, newStatus) {
    if (!edId || !newStatus) return;
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === edId) { idx = i; break; } }
    if (idx === -1) { window.toast?.('Kayıt bulunamadı', 'err'); return; }
    var ed = list[idx];
    if (ed.status === newStatus) return;
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
    window.toast?.('Durum güncellendi: ' + label, 'ok');
    window._edRenderPanel?.();
  };

  /* LOJ-1B-C2: Armatör seçildiğinde tracking URL otomatik dolum
     13 carrier URL pattern (kargo modülündeki autoFillKonteynUrl ile aynı) */
  window._edAutoFillTrackingUrl = function() {
    var hat = document.getElementById('ede-armator')?.value || '';
    var urls = {
      'MSC': 'https://www.msc.com/track-a-shipment?agencyPath=msc',
      'Maersk': 'https://www.maersk.com/tracking/',
      'CMA CGM': 'https://www.cma-cgm.com/ebusiness/tracking/search',
      'COSCO': 'https://elines.coscoshipping.com/ebusiness/cargoTracking',
      'Hapag-Lloyd': 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html',
      'ONE': 'https://ecomm.one-line.com/ecom/CUP_HOM_3301.do',
      'Evergreen': 'https://www.shipmentlink.com/servlet/TUF1_CargoTracking.do',
      'Yang Ming': 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx',
      'HMM': 'https://www.hmm21.com/cms/business/ebiz/trackTrace/trackTrace/index.jsp',
      'ZIM': 'https://www.zim.com/tools/track-a-shipment',
      'PIL': 'https://www.pilship.com/shared/ajax/?fn=get_track_trace',
      'OOCL': 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx',
      'Diger': ''
    };
    var input = document.getElementById('ede-trackingUrl');
    if (input && urls[hat]) input.value = urls[hat];
  };

  /* LOJ-1B-C3: Tracking URL'i yeni sekmede aç (🔗 Aç butonu handler) */
  window._edOpenTrackingUrl = function() {
    var u = (document.getElementById('ede-trackingUrl')?.value || '').trim();
    if (!u) { window.toast?.('URL boş', 'err'); return; }
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  /* LOJ-1B-C4: PDF eki Storage upload + kaldırma */
  window._edUploadBelge = async function(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    var file = fileInput.files[0];
    if (file['size'] > 20 * 1024 * 1024) { window.toast?.('Dosya 20MB limitini aşıyor', 'err'); return; }
    if (typeof window._uploadBase64ToStorage !== 'function') {
      window.toast?.('Storage helper bulunamadı', 'err'); return;
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
      window.toast?.('Belge yüklendi', 'ok');
    } catch (err) {
      window.toast?.('Yükleme başarısız: ' + (err && err.message || String(err)), 'err');
      if (statusEl) statusEl.textContent = 'Belge yok';
    }
  };

  window._edBelgeKaldir = function() {
    var urlEl = document.getElementById('ede-belgeUrl');
    var statusEl = document.getElementById('ede-belge-status');
    if (urlEl) urlEl.value = '';
    if (statusEl) statusEl.textContent = 'Belge yok';
  };

  /* LOJ-1B-D: Filter state update + re-render */
  window._edFilter = function(field, value) {
    if (!window._edFilterState) window._edFilterState = { yon: '', status: '', search: '' };
    window._edFilterState[field] = value;
    var container = document.getElementById('ed-list-container');
    if (container && typeof window.renderEdList === 'function') {
      container.outerHTML = window.renderEdList();
    }
  };

  /* LOJ-1B-E: Eke göz at — belge varsa yeni sekmede aç, yoksa toast */
  window._edEkeGozAt = function(edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = list.find(function(e){ return e.id === edId; });
    if (!ed || !ed.belgeUrl) {
      window.toast?.('Bu kayda ek dosya yok', 'err');
      return;
    }
    window.open(ed.belgeUrl, '_blank', 'noopener,noreferrer');
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

  var STATUS_LABELS = {
    TEDARIK_ASAMASINDA: 'Tedarik',
    URETIMDE: 'Üretimde',
    YUKLEME_BEKLIYOR: 'Yükleme',
    YOLDA: 'Yolda',
    GUMRUKTE: 'Gümrükte',
    DEPODA: 'Depoda',
    TESLIM_ALINDI: 'Teslim',
    GECIKTI: 'Gecikti'
  };
  var STATUS_COLORS = {
    TEDARIK_ASAMASINDA: '#888780',
    URETIMDE: '#D97706',
    YUKLEME_BEKLIYOR: '#854F0B',
    YOLDA: '#185FA5',
    GUMRUKTE: '#7C3AED',
    DEPODA: '#7C3AED',
    TESLIM_ALINDI: '#16A34A',
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
        + '<div style="display:flex;gap:4px;flex-shrink:0">'
          + '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + stColor + '22;color:' + stColor + ';font-weight:500;letter-spacing:.04em">' + _uiEsc(stLabel).toUpperCase() + '</span>'
          + (pri === 'CRITICAL' ? '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + priColor + '22;color:' + priColor + ';font-weight:600;letter-spacing:.04em">⚠ ' + _uiEsc(priLabel).toUpperCase() + '</span>' : '')
        + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;flex-wrap:wrap">'
        + '<div style="font-size:11px;color:' + remColor + ';font-weight:500">' + remText + '</div>'
        + '<div style="font-size:10px;color:var(--t3,#6B7280);font-variant-numeric:tabular-nums">' + delivered + '/' + total + ' ' + _uiEsc(ed.unit || '') + '</div>'
      + '</div>'
      + '<div style="height:4px;background:var(--s2,#F1F5F9);border-radius:2px;overflow:hidden;margin-bottom:10px">'
        + '<div style="height:100%;width:' + pct + '%;background:' + stColor + ';transition:width .3s"></div>'
      + '</div>'
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
    if (isNaN(qty) || qty <= 0) { if (window.toast) window.toast('Geçersiz miktar', 'err'); return; }
    var r = window._edAddDelivery(edId, { qty: qty, deliveryDate: new Date().toISOString(), status: 'delivered' });
    if (r && r.success) {
      if (window.toast) window.toast('Teslimat eklendi', 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || 'Ekleme hatası', 'err');
    }
  };

  window._edOpenDetail = function(edId) {
    var all = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var ed = all.find(function(e) { return e.id === edId; });
    if (!ed) { if (window.toast) window.toast('Kayıt bulunamadı', 'err'); return; }
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
          + '<div style="font-size:16px;font-weight:600;color:var(--t,#111);display:flex;align-items:center;gap:10px;flex-wrap:wrap">🚚 Teslimat Takibi <span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + modeColor + '22;color:' + modeColor + ';font-weight:500;letter-spacing:.04em">' + mode.replace('_', ' ') + '</span></div>'
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
          + '<div style="grid-column:span 2">' + _edWizardLabel('Tedarikçi *') + '<select id="edw-supplierId" style="' + _edWizardInput + '">' + _edSupplierOpts(s.data.supplierId) + '</select></div>'
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
      if (window.toast) window.toast('Yeni teslimat oluşturuldu', 'ok');
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
    if (r && r.success) { if (window.toast) window.toast('Öncelik güncellendi', 'ok'); window._edRenderPanel(); }
    else { if (window.toast) window.toast((r && r.error) || 'Hata', 'err'); }
  };

  window._edChangeResponsibleModal = function(edId) {
    var ex = document.getElementById('ed-change-resp-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-change-resp-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    mo.innerHTML = '<div style="background:var(--sf,#fff);color:var(--t);width:420px;max-width:92vw;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit">'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:16px">Sorumlu Değiştir</div>'
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
    if (!userSel || !userSel.value) { if (window.toast) window.toast('Yeni sorumlu seçin', 'err'); return; }
    var opt = userSel.selectedOptions && userSel.selectedOptions[0];
    var role = (opt && opt.getAttribute('data-role')) || 'staff';
    var r = window._edChangeResponsible(edId, userSel.value, role, reason.trim());
    if (r && r.success) {
      document.getElementById('ed-change-resp-modal').remove();
      if (window.toast) window.toast('Sorumlu değiştirildi', 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || 'Hata', 'err');
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
      if (window.toast) window.toast('Gecikme bilgisi kaydedildi', 'ok');
      window._edRenderPanel();
    } else {
      if (window.toast) window.toast((r && r.error) || 'Hata', 'err');
    }
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
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edChangeResponsibleModal && window._edChangeResponsibleModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">👤 Sorumlu Değiştir</button>'
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edPriorityMenu && window._edPriorityMenu(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">⭐ Öncelik Değiştir</button>'
      + (isOverdue ? '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edDelayReasonModal && window._edDelayReasonModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px;color:#E0574F" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">⚠️ Gecikme Sebebi</button>' : '')
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edEkeGozAt && window._edEkeGozAt(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">📎 Eke göz at</button>'
      + '<button onclick="document.getElementById(\'ed-aksiyon-menu\').remove();window._edEditModal && window._edEditModal(\'' + _uiEsc(edId) + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:inherit;border-radius:8px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'">✏️ Düzenle</button>'
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

    var STATUS = {
      'TEDARIK_ASAMASINDA':{t:'Tedarik',c:'#6B7280',bg:'#F3F4F6'},
      'URETIMDE':{t:'Üretimde',c:'#2563EB',bg:'#EFF6FF'},
      'YUKLEME_BEKLIYOR':{t:'Yükleme',c:'#CA8A04',bg:'#FEF9C3'},
      'YOLDA':{t:'Yolda',c:'#EA580C',bg:'#FFEDD5'},
      'GUMRUKTE':{t:'Gümrükte',c:'#7C3AED',bg:'#F3E8FF'},
      'DEPODA':{t:'Depoda',c:'#7C3AED',bg:'#EDE9FE'},
      'TESLIM_ALINDI':{t:'Teslim',c:'#0F6E56',bg:'#D1FAE5'},
      'GECIKTI':{t:'Gecikmiş',c:'#DC2626',bg:'#FEE2E2'}
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
    try { (typeof window.loadCari === 'function' ? window.loadCari() : []).forEach(function(c){ cariMap[String(c.id)] = c.ad || c.firmaAdi || ''; }); } catch(e){}

    /* LOJ-1B-D: Filter state + apply + filterBar */
    if (!window._edFilterState) window._edFilterState = { yon: '', status: '', search: '' };
    var __fs = window._edFilterState;
    list = list.filter(function(__ed) {
      if (__fs.yon && (__ed.yon || 'GIDEN') !== __fs.yon) return false;
      if (__fs.status && __ed.status !== __fs.status) return false;
      if (__fs.search) {
        var __q = String(__fs.search).trim().toLowerCase();
        var __hay = ((__ed.productName || '') + ' ' + (__ed.supplierId || '') + ' ' + (cariMap[String(__ed.supplierId)] || '') + ' ' + (__ed.konteynerNo || '')).toLowerCase();
        if (__hay.indexOf(__q) === -1) return false;
      }
      return true;
    });
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
      + '<input type="search" placeholder="Ara: ürün, tedarikçi, konteyner..." value="' + esc(__fs.search || '') + '" oninput="window._edFilter && window._edFilter(\'search\', this.value)" style="' + __fbStyle + ';flex:1;min-width:160px;cursor:text">'
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
      var __rowBg = __yon === 'GELEN' ? 'rgba(59,130,246,0.06)' : 'rgba(249,115,22,0.06)';
      var __yonBadge = __yon === 'GELEN' ? '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#DBEAFE;color:#1E40AF;font-weight:500">📥 GELEN</span>' : '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#FED7AA;color:#9A3412;font-weight:500">📤 GIDEN</span>';
      return '<div style="display:grid;grid-template-columns:0.55fr 1.7fr 1.2fr 1fr 0.85fr 0.85fr auto;gap:12px;padding:10px 16px;border-bottom:0.5px solid var(--b);align-items:center;font-size:12px;background:' + __rowBg + '">'
        + '<div>' + __yonBadge + '</div>'
        + '<div><div style="font-weight:500;color:var(--t)">'+esc(ed.productName||'—')+'</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+esc(tedAd)+'</div></div>'
        + '<div onclick="event.stopPropagation()"><select onchange="window._edStatusChange && window._edStatusChange(\'' + esc(ed.id) + '\', this.value)" style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:500;color:' + st['c'] + ';background:' + st['bg'] + ';border:0.5px solid ' + st['c'] + '33;cursor:pointer;font-family:inherit">' + STATUSES.map(function(__sk){var __s = STATUS[__sk];return '<option value="' + __sk + '"' + (ed.status === __sk ? ' selected' : '') + '>' + esc(__s ? __s['t'] : __sk) + '</option>';}).join('') + '</select></div>'
        + '<div style="font-variant-numeric:tabular-nums;color:var(--t2)">'+qd+'/'+qt+' <span style="color:var(--t3);font-size:10px">(%'+pct+')</span></div>'
        + '<div style="font-variant-numeric:tabular-nums;color:var(--t2)">'+esc(eta)+'</div>'
        + '<div style="font-size:11px">'+daysHtml+'</div>'
        + '<button onclick="event.stopPropagation();window._edAksiyonMenu && window._edAksiyonMenu(\''+esc(ed.id)+'\')" style="padding:4px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t3);font-size:14px;font-family:inherit;line-height:1">⋮</button>'
        + '</div>';
    }).join('');

    var hdrRow = '<div style="display:grid;grid-template-columns:0.55fr 1.7fr 1.2fr 1fr 0.85fr 0.85fr auto;gap:12px;padding:8px 16px;background:var(--s2);font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">'
      + '<div>Yön</div><div>Ürün / Tedarikçi</div><div>Durum</div><div>Miktar</div><div>Tahmini</div><div>Kalan</div><div></div></div>';

    return '<div id="ed-list-container" style="'+card+'">'
      + '<div style="'+hdr+'">'
      + '<span style="font-size:13px;font-weight:500">Beklenen Teslimatlar <span style="font-weight:400;color:var(--t3);font-size:11px;margin-left:6px">'+list.length+' kayıt</span></span>'
      + '<button onclick="window._edWizardAc && window._edWizardAc()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:var(--t2);font-family:inherit">+ Yeni</button>'
      + '</div>'
      + filterBar
      + hdrRow + rows
      + (list.length > 20 ? '<div style="padding:8px 16px;text-align:center;font-size:10px;color:var(--t3)">+'+(list.length-20)+' kayıt daha</div>' : '')
      + '</div>';
  };
})();
