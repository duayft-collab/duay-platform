/**
 * Duay Global Trade Company — Operasyon Platformu
 * Dosya:        src/modules/expected_deliveries_docs_probe.js
 * Açıklama:     Shipment Doc manager-only diagnostic probe (DevTools console)
 * Anayasa Ref:  K01 (modül split), K02 (manager guard), K04 (try/catch+toast),
 *               K08 ('use strict' + JSDoc), K14 (PII mask reuse)
 * Tarih:        2026-05-01
 * Versiyon:     1.0.0 (V123 — SHIPMENT-DOC-PROBE-EXTRACT-001)
 *
 * V121'de docs.js içinde tanımlanmıştı; V123'te K01 800 satır limitini
 * korumak için ayrı dosyaya çıkarıldı. Bağımlılıklar public window API
 * üzerinden çözülüyor (no inter-module closure dependency).
 *
 * Modal YOK — pure console.group + console.table.
 * Manager+ rol gerekir, non-manager için sessiz fail yerine toast warn.
 */
(function() {
  'use strict';

  /**
   * Tek API testini güvenli koş, sonucu döndür (probe için).
   * @param {string} name fonksiyon ismi
   * @param {Function} fn çağrılacak fn
   * @returns {*} fn sonucu veya error mesajı
   */
  function _probeRun(name, fn) {
    try { return fn(); } catch (e) { return 'ERR: ' + (e && e.message); }
  }

  /**
   * Shipment Doc altyapısını DevTools console'a raporla (manager-only).
   * Modal YOK — pure console.group + console.table. UI artığı bırakmaz.
   * @param {string} edId
   */
  window._shipmentDocProbe = function(edId) {
    /* K02 — manager-only guard (V117 _shipmentDocUtil reuse) */
    const util = window._shipmentDocUtil;
    if (!util || !util.isManager()) {
      if (typeof window.toast === 'function') window.toast('Yetki: manager+ gerekir', 'warn');
      return;
    }
    if (!edId) {
      console.warn('[PROBE] edId gerekli');
      return;
    }

    /* ED + sd erişimi public API üzerinden (V118 reuse) */
    let sd = window._shipmentDocGet(edId);

    /* Doc yoksa idempotent auto-create (test için) */
    if (!sd) {
      const r = window._shipmentDocCreate(edId);
      if (!r.success) {
        const msg = r.error === 'ed_not_found' ? 'ED bulunamadı' : 'Doc oluşturulamadı';
        console.error('[PROBE] Create fail:', r.error);
        if (typeof window.toast === 'function') window.toast(msg, 'err');
        return;
      }
      sd = r.sd;
      console.log('%c📦 Auto-created shipmentDoc', 'color:#1A8D6F;font-weight:600');
    }

    const stateColor = window._shipmentDocStateColor(sd.state);
    const suggested = window._shipmentDocSuggestNextState(edId);
    const allowed = window._shipmentDocAllowedNextStates(sd.state);

    /* Mikro tasarım 1: emoji + edId başlık */
    console.group('%c📦 Shipment Doc Probe — ED #' + edId, 'color:' + stateColor.fg + ';font-weight:600;font-size:13px');
    console.log('State:    %c' + sd.state + ' (' + window._shipmentDocStateLabel(sd.state) + ')',
      'background:' + stateColor.bg + ';color:' + stateColor.fg + ';padding:2px 6px;border-radius:3px');
    console.log('Owner:    ' + window._shipmentDocMaskName(sd.history.length ? (sd.history[0].uname || '?') : 'Bilinmiyor'));
    console.log('Suggest:  ' + (suggested || '— (terminal state)'));
    console.log('Allowed:  [' + allowed.join(', ') + ']');
    console.log('History:  ' + sd.history.length + ' kayıt' +
      (sd.archivedCount ? ' (+' + sd.archivedCount + ' arşivde)' : ''));

    /* Mikro tasarım 2: history tail + API testleri tek tabloda */
    if (sd.history.length) {
      console.log('%c📜 History tail (son 3):', 'font-weight:600');
      const tail = sd.history.slice(-3).map(function(h) {
        const meta = window._shipmentDocAuditMeta(h.action) || {};
        return {
          ts: (h.ts || '').slice(11, 19),
          action: (meta.icon || '?') + ' ' + h.action,
          severity: h.severity,
          uname: window._shipmentDocMaskName(h.uname || '?')
        };
      });
      console.table(tail);
    }

    console.log('%c🧪 API Test:', 'font-weight:600');
    console.table([
      { api: '_shipmentDocGet',           result: _probeRun('Get',         function() { return window._shipmentDocGet(edId) ? 'sd OK' : 'null'; }) },
      { api: '_shipmentDocCreate (idem)', result: _probeRun('CreateIdem',  function() { return JSON.stringify(window._shipmentDocCreate(edId)); }) },
      { api: '_shipmentDocCanTransition', result: _probeRun('CanTrans',    function() { return JSON.stringify(window._shipmentDocCanTransition(sd.state, 'HAZIR')); }) },
      { api: '_shipmentDocIsFieldKritik', result: _probeRun('IsKritik',    function() { return window._shipmentDocIsFieldKritik('yuk.brutKg'); }) },
      { api: '_shipmentDocAuditMeta',     result: _probeRun('AuditMeta',   function() { return JSON.stringify(window._shipmentDocAuditMeta('UPLOAD')); }) }
    ]);

    console.groupEnd();

    if (typeof window.toast === 'function') window.toast('Probe console\'a yazıldı (F12 → Console)', 'info');
  };

})();
