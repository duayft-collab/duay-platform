/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/init.js
 * V138.2 POPULATE — DOMContentLoaded guard + bootstrap
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  function bootstrap() {
    var core = window.SalesCRM.core;
    if (!core || !core.loadLocal) {
      console.warn('[SalesCRM] core not ready, init aborted');
      return;
    }
    try {
      core.loadLocal();
      var pages = window.SalesCRM.pages;
      if (pages && pages.renderAll) pages.renderAll();
      console.log('[SalesCRM] bootstrap OK');
    } catch (e) {
      console.error('[SalesCRM] bootstrap error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    setTimeout(bootstrap, 0);
  }
})();
