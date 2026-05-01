/**
 * @file expected_deliveries_docs_ui_apply.js
 * SHIPMENT-DOC-UI-EXTRACT-001 (V130) — TIR ortak belge apply modülü.
 * V129 SHIPMENT-DOC-TIR-SHARE-001 helper'ları ui.js'ten ayrıldı (K01 borç).
 *
 * Public API: window._sdApply (Object.freeze)
 *   - SHARED_SLOTS: 4 slot frozen array
 *   - findGroupedEds(currentEdId, konteynerNo)
 *   - genUploadGroupId()
 *   - showApplyModal(currentEdId, currentProductName, groupedEds, slot, fileNames, callback)
 *   - saveToSingleEd(edId, slot, newSlotMetas, meta)
 *   - saveToMultipleEds(edIds, slot, newSlotMetas, meta)
 *
 * Bağımlılıklar (window üzerinden):
 *   - window.loadExpectedDeliveries (database.js)
 *   - window._shipmentDocGet, _shipmentDocCreate, _shipmentDocUpdate (V117-V122)
 *   - window._shipmentDocUtil (V117 BELGE_META lookup)
 *   - window.toast (app.js)
 *
 * Closure leak yok — local _esc helper, dış closure dependency yok.
 * Yükleme sırası: probe.js → apply.js → ui.js (apply.js ui'dan önce).
 *
 * V123 PROBE-EXTRACT-001 pattern reuse — pure refactor, sıfır davranış değişikliği.
 */

(function() {
  'use strict';

  /* XSS-KURAL-001: 5-char HTML escape (lokal, dependency-free) */
  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  /* SHIPMENT-DOC-TIR-SHARE-001: TIR ortak belge slot'ları (V129) */
  /* Bu slot'lar konteynerNo eşleşen ED'ler arasında paylaşılabilir */
  const SHARED_SLOTS = Object.freeze([
    'soforFotos',      // Şoför fotoğrafları (multi)
    'yuklemeFotos',    // Yükleme fotoğrafları (multi)
    'ekBelgeler',      // Ek belgeler (multi)
    'nakliyeFatura'    // Nakliye faturası (single, TIR-level)
  ]);

  /**
   * Verilen konteynerNo ile eşleşen DİĞER ED'leri bul.
   * @param {string} currentEdId şu anki ED (hariç tutulacak)
   * @param {string} konteynerNo gruplama anahtarı (boş ise [] döner)
   * @returns {Array} [{edId, productName, supplierId}], max 20 ED
   */
  function _findGroupedEds(currentEdId, konteynerNo) {
    if (!konteynerNo || !konteynerNo.trim()) return [];
    if (typeof window.loadExpectedDeliveries !== 'function') return [];
    try {
      const allEds = window.loadExpectedDeliveries({raw: true}) || [];
      const matched = [];
      for (let i = 0; i < allEds.length && matched.length < 20; i++) {
        const ed = allEds[i];
        if (!ed || ed.id === currentEdId) continue;
        if (ed.konteynerNo && ed.konteynerNo.trim() === konteynerNo.trim()) {
          matched.push({
            edId: ed.id,
            productName: ed.productName || '—',
            supplierId: ed.supplierId || ''
          });
        }
      }
      return matched;
    } catch (e) {
      return [];
    }
  }

  /**
   * uploadGroupId üret — her batch için unique (apply-to-multi-ED için).
   * @returns {string} 'grp_<timestamp>_<rand>'
   */
  function _genUploadGroupId() {
    return 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Multi-ED apply checkbox modal göster.
   * Kullanıcı seçili ED'leri callback'e döndürür. İptal'de callback çağrılmaz.
   * @param {string} currentEdId mevcut ED (zaten checked + disabled)
   * @param {string} currentProductName mevcut ED ürün adı (display)
   * @param {Array} groupedEds [{edId, productName, supplierId}] — _findGroupedEds çıktısı
   * @param {string} slot belge slot adı (header için)
   * @param {Array<string>} fileNames seçilen dosya adları (header için)
   * @param {function} callback (selectedEdIds: string[]) => void
   */
  function _showApplyModal(currentEdId, currentProductName, groupedEds, slot, fileNames, callback) {
    /* Önceki apply modal varsa kaldır */
    const existingBackdrop = document.getElementById('sd-apply-backdrop');
    if (existingBackdrop && existingBackdrop.parentNode) existingBackdrop.parentNode.removeChild(existingBackdrop);

    /* Slot label (BELGE_META'dan) */
    const slotMeta = (window._shipmentDocUtil && window._shipmentDocUtil.BELGE_META && window._shipmentDocUtil.BELGE_META[slot]) || {};
    const slotLabel = slotMeta.label || slot;
    const slotIcon = slotMeta.icon || '📄';

    /* Dosya özeti (header) */
    const fileCount = fileNames.length;
    const fileSummary = fileCount === 1 ? fileNames[0] : fileCount + ' dosya';

    /* ED checkbox listesi HTML */
    /* Mevcut ED zaten checked + disabled (her zaman dahil) */
    const currentRow = '<label style="display:flex;align-items:center;padding:8px 10px;background:#F0F9F5;border-radius:6px;margin-bottom:6px;cursor:not-allowed;opacity:0.85">' +
      '<input type="checkbox" checked disabled style="margin-right:10px"> ' +
      '<span style="font-weight:600;color:#1A8D6F">' + _esc(currentProductName) + '</span> ' +
      '<span style="color:#666;font-size:11px;margin-left:6px">(şu anki ED)</span>' +
      '</label>';

    /* Diğer ED'ler default checked (opt-out pattern) */
    const otherRows = groupedEds.map(function(g) {
      return '<label style="display:flex;align-items:center;padding:8px 10px;background:#FAFAFA;border-radius:6px;margin-bottom:6px;cursor:pointer">' +
        '<input type="checkbox" data-apply-ed="' + _esc(g.edId) + '" checked style="margin-right:10px"> ' +
        '<span style="color:#333">' + _esc(g.productName) + '</span>' +
        (g.supplierId ? '<span style="color:#999;font-size:11px;margin-left:6px">[' + _esc(g.supplierId) + ']</span>' : '') +
        '</label>';
    }).join('');

    /* Backdrop + modal HTML */
    const backdropHtml = '<div id="sd-apply-backdrop" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center">' +
      '<div style="background:#fff;border-radius:8px;width:520px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
        /* Header */
        '<div style="padding:14px 16px;border-bottom:1px solid #e5e5e5">' +
          '<div style="font-size:15px;font-weight:600;color:#333">🔗 Belgeyi diğer ED\'lere uygula</div>' +
          '<div style="font-size:12px;color:#666;margin-top:4px">' + _esc(slotIcon) + ' ' + _esc(slotLabel) + ' — ' + _esc(fileSummary) + '</div>' +
        '</div>' +
        /* Body */
        '<div style="padding:14px 16px">' +
          '<div style="font-size:12px;color:#666;margin-bottom:10px">Aynı konteynerdeki ' + (groupedEds.length + 1) + ' ED. İstediklerinizin işaretini kaldırabilirsiniz:</div>' +
          currentRow +
          otherRows +
        '</div>' +
        /* Footer */
        '<div style="padding:12px 16px;border-top:1px solid #e5e5e5;display:flex;justify-content:flex-end;gap:8px">' +
          '<button id="sd-apply-cancel" style="padding:8px 16px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:13px">İptal</button>' +
          '<button id="sd-apply-confirm" style="padding:8px 16px;border:none;background:#1A8D6F;color:#fff;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">Yükle</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    /* Append + event handlers */
    document.body.insertAdjacentHTML('beforeend', backdropHtml);
    const backdrop = document.getElementById('sd-apply-backdrop');

    function _close() {
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', _onEsc);
    }
    function _onEsc(e) { if (e.key === 'Escape') _close(); }

    document.addEventListener('keydown', _onEsc);

    /* Backdrop click (içerik dışı) → kapan */
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) _close();
    });

    /* İptal butonu */
    const cancelBtn = document.getElementById('sd-apply-cancel');
    if (cancelBtn) cancelBtn.onclick = _close;

    /* Yükle butonu */
    const confirmBtn = document.getElementById('sd-apply-confirm');
    if (confirmBtn) confirmBtn.onclick = function() {
      const selectedEdIds = [currentEdId];
      const checkboxes = backdrop.querySelectorAll('input[data-apply-ed]:checked');
      for (let i = 0; i < checkboxes.length; i++) {
        selectedEdIds.push(checkboxes[i].getAttribute('data-apply-ed'));
      }
      _close();
      if (typeof callback === 'function') callback(selectedEdIds);
    };
  }

  /**
   * Tek ED'ye slotMeta(lar) kaydet (V128 davranış reuse).
   * Multi: existingArr.concat(newSlotMetas) APPEND
   * Single: newSlotMetas[0] REPLACE
   * @param {string} edId hedef ED
   * @param {string} slot belge slot
   * @param {Array} newSlotMetas yeni slotMeta'lar
   * @param {object} meta BELGE_META[slot]
   * @returns {object} _shipmentDocUpdate result
   */
  function _saveToSingleEd(edId, slot, newSlotMetas, meta) {
    const sd = window._shipmentDocGet(edId);
    if (!sd) return { success: false, error: 'sd_not_found_' + edId };
    let newValue;
    if (meta.multi) {
      const existingArr = Array.isArray(sd.belgeler[slot]) ? sd.belgeler[slot] : [];
      newValue = existingArr.concat(newSlotMetas);
    } else {
      newValue = newSlotMetas[0];
    }
    return window._shipmentDocUpdate(edId, 'belgeler.' + slot, newValue);
  }

  /**
   * N ED'ye slotMeta(lar) loop ile kaydet (V129 multi-ED).
   * Her ED için _saveToSingleEd, per-ED try/catch ile race-free.
   * Auto-create defensive (sd null ise yarat).
   * @param {Array<string>} edIds hedef ED'ler
   * @param {string} slot belge slot
   * @param {Array} newSlotMetas yeni slotMeta'lar (uploadGroupId enjekte edildi)
   * @param {object} meta BELGE_META[slot]
   * @returns {object} {successEdIds, failEdIds}
   */
  function _saveToMultipleEds(edIds, slot, newSlotMetas, meta) {
    const successEdIds = [];
    const failEdIds = [];
    for (let i = 0; i < edIds.length; i++) {
      const targetEdId = edIds[i];
      try {
        /* Auto-create defensive */
        let sd = window._shipmentDocGet(targetEdId);
        if (!sd) {
          window._shipmentDocCreate(targetEdId);
          sd = window._shipmentDocGet(targetEdId);
        }
        if (!sd) { failEdIds.push(targetEdId); continue; }
        /* KAPALI guard per-ED */
        if (sd.state === 'KAPALI') { failEdIds.push(targetEdId + ' (kapalı)'); continue; }
        const result = _saveToSingleEd(targetEdId, slot, newSlotMetas, meta);
        if (result && result.success !== false) {
          successEdIds.push(targetEdId);
        } else {
          failEdIds.push(targetEdId + ' (' + (result && result.error || 'hata') + ')');
        }
      } catch (e) {
        failEdIds.push(targetEdId + ' (' + (e.message || 'exception') + ')');
      }
    }
    return { successEdIds: successEdIds, failEdIds: failEdIds };
  }

  /**
   * Slot'taki belgenin (veya belgelerin) kaç ED'de paylaşıldığını say.
   * uploadGroupId üzerinden runtime aggregate. Threshold count >= 2 → paylaşım var.
   * @param {string} slot belge slot key (ör. 'soforFotos')
   * @param {object|Array} value tek slotMeta veya array (multi)
   * @returns {number} En yüksek paylaşım sayısı (0 = yok, 1 = tek ED, 2+ = paylaşımlı)
   */
  function _countSharedEds(slot, value) {
    if (!value) return 0;
    if (typeof window.loadExpectedDeliveries !== 'function') return 0;
    /* uploadGroupId'leri topla (Set) */
    const groupIds = new Set();
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] && value[i].uploadGroupId) groupIds.add(value[i].uploadGroupId);
      }
    } else if (value.uploadGroupId) {
      groupIds.add(value.uploadGroupId);
    }
    if (groupIds.size === 0) return 0;
    /* Her uploadGroupId için ED count, max döndür */
    try {
      const allEds = window.loadExpectedDeliveries({raw: true}) || [];
      let maxCount = 0;
      groupIds.forEach(function(gId) {
        let count = 0;
        for (let i = 0; i < allEds.length; i++) {
          const ed = allEds[i];
          if (!ed || !ed.shipmentDoc || !ed.shipmentDoc.belgeler) continue;
          const slotVal = ed.shipmentDoc.belgeler[slot];
          if (!slotVal) continue;
          if (Array.isArray(slotVal)) {
            for (let j = 0; j < slotVal.length; j++) {
              if (slotVal[j] && slotVal[j].uploadGroupId === gId) { count++; break; }
            }
          } else if (slotVal.uploadGroupId === gId) {
            count++;
          }
        }
        if (count > maxCount) maxCount = count;
      });
      return maxCount;
    } catch (e) {
      return 0;
    }
  }

  /* SHIPMENT-DOC-UI-EXTRACT-001: public namespace (V130) — V117 _shipmentDocUtil pattern reuse */
  /* V131 GENİŞLETME: countSharedEds eklendi */
  window._sdApply = Object.freeze({
    SHARED_SLOTS: SHARED_SLOTS,
    findGroupedEds: _findGroupedEds,
    genUploadGroupId: _genUploadGroupId,
    showApplyModal: _showApplyModal,
    saveToSingleEd: _saveToSingleEd,
    saveToMultipleEds: _saveToMultipleEds,
    countSharedEds: _countSharedEds
  });

})();
