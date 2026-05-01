/**
 * SHIPMENT-DOC-UI-VIEW-EXTRACT-001 (V133.2.refactor):
 * _shipmentDocUiSlotView fn ui.js'den extract edildi (K01 borç kapatma).
 *
 * ui.js: 807 → ~710 (K01 OK).
 * Public API aynı: window._shipmentDocUiSlotView(edId, slot)
 * Bağımlılıklar (load order zorunlu, index.html script sırası):
 *   - docs.js (V117-V123): _shipmentDocGet, _shipmentDocUtil
 *   - ui_apply.js (V129-V132.1): _sdApply (indirect)
 *   - ui.js (V124-V133.2): _shipmentDocUiUploadFile, _shipmentDocUiDeleteSlot
 *
 * @module expected_deliveries_docs_ui_view
 */

(function() {
  'use strict';

  /* XSS-KURAL-001: 5-char HTML escape (lokal kopya, ui.js ile aynı pattern) */
  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  /**
   * SHIPMENT-DOC-SLOT-VIEW-001 (V133.2): Dolu slot tıklama → view modal.
   * Single slot: 1 dosya gösterir, 👁 Görüntüle / 🗑 Sil / + Değiştir
   * Multi slot: N dosya listeler, her birine 👁 + (V132.2'de 🗑), + Yeni Yükle / 🗑 Tümünü Sil
   * @param {string} edId hedef ED
   * @param {string} slot belge slot key
   */
  window._shipmentDocUiSlotView = function(edId, slot) {
    if (typeof window._shipmentDocGet !== 'function') {
      window.toast && window.toast('API yüklenmedi', 'err');
      return;
    }
    const sd = window._shipmentDocGet(edId);
    const slotValue = sd && sd.belgeler && sd.belgeler[slot];
    if (!slotValue || (Array.isArray(slotValue) && slotValue.length === 0)) {
      /* Boş ise direkt upload */
      window._shipmentDocUiUploadFile(edId, slot);
      return;
    }
    const meta = window._shipmentDocUtil && window._shipmentDocUtil.BELGE_META && window._shipmentDocUtil.BELGE_META[slot];
    const slotName = meta && meta.name ? meta.name : slot;
    const slotIcon = meta && meta.icon ? meta.icon : '📎';
    const isMulti = Array.isArray(slotValue);
    const files = isMulti ? slotValue : [slotValue];

    /* Backdrop + modal */
    const backdrop = document.createElement('div');
    backdrop.id = 'sd-slotview-backdrop';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:8px;padding:20px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,0.2)';

    let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><h3 style="margin:0;font-size:16px">' + slotIcon + ' ' + _esc(slotName) + (isMulti ? ' (' + files.length + ')' : '') + '</h3><button id="sd-slotview-close" style="background:none;border:0;font-size:20px;cursor:pointer;color:#888;padding:0 8px">×</button></div>';

    /* Dosya listesi */
    html += '<div style="border:1px solid #e5e5e5;border-radius:6px;padding:8px;margin-bottom:12px;max-height:300px;overflow-y:auto">';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fname = (f && f.filename) || 'belge.dat';
      const fsize = f && f.size ? Math.round(f.size / 1024) + ' KB' : '';
      const fdate = f && f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('tr-TR') : '';
      const fby = f && f.uploadedBy ? _esc(f.uploadedBy) : '';
      const furl = f && f.url ? f.url : '#';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:0.5px solid #eee">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📎 ' + _esc(fname) + '</div>';
      html += '<div style="font-size:11px;color:#888;margin-top:2px">' + fsize + (fdate ? ' · ' + fdate : '') + (fby ? ' · ' + fby : '') + '</div>';
      html += '</div>';
      html += '<a href="' + _esc(furl) + '" target="_blank" rel="noopener" style="background:#1976D2;color:#fff;text-decoration:none;padding:6px 10px;border-radius:4px;font-size:14px;font-weight:500" title="Görüntüle">👁</a>';
      html += '</div>';
    }
    html += '</div>';

    /* Footer butonlar */
    html += '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">';
    if (isMulti) {
      html += '<button id="sd-slotview-add" style="background:#2E7D32;color:#fff;border:0;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:500">+ Yeni Yükle</button>';
      html += '<button id="sd-slotview-deleteAll" style="background:#C62828;color:#fff;border:0;padding:8px 16px;border-radius:4px;cursor:pointer">🗑 Tümünü Sil</button>';
    } else {
      html += '<button id="sd-slotview-replace" style="background:#FB8C00;color:#fff;border:0;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:500">+ Değiştir</button>';
      html += '<button id="sd-slotview-deleteSingle" style="background:#C62828;color:#fff;border:0;padding:8px 16px;border-radius:4px;cursor:pointer">🗑 Sil</button>';
    }
    html += '</div>';

    modal.innerHTML = html;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    /* Event handlers */
    const cleanup = function() { try { backdrop.remove(); } catch (e) {} };
    modal.querySelector('#sd-slotview-close').onclick = cleanup;
    backdrop.onclick = function(e) { if (e.target === backdrop) cleanup(); };

    if (isMulti) {
      modal.querySelector('#sd-slotview-add').onclick = function() {
        cleanup();
        window._shipmentDocUiUploadFile(edId, slot);
      };
      modal.querySelector('#sd-slotview-deleteAll').onclick = function() {
        cleanup();
        if (typeof window._shipmentDocUiDeleteSlot === 'function') {
          window._shipmentDocUiDeleteSlot(edId, slot);
        }
      };
    } else {
      modal.querySelector('#sd-slotview-replace').onclick = function() {
        cleanup();
        window._shipmentDocUiUploadFile(edId, slot);
      };
      modal.querySelector('#sd-slotview-deleteSingle').onclick = function() {
        cleanup();
        if (typeof window._shipmentDocUiDeleteSlot === 'function') {
          window._shipmentDocUiDeleteSlot(edId, slot);
        }
      };
    }
  };
})();
