/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-utils.js — V170.3.2 POPULATE
   Sorumluluk: SADECE saf yardımcı fonksiyonlar (modüler saflık)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-UTILS-POPULATE-001
   Altın Kural: "State değiştiriyorsa → utils değildir."
   ──────────────────────────────────────────────────────────────────
   İçerik:
       _ppHaftaNo  — ISO-week math (saf, state mutation YOK, DOM YOK)
                     Kaynak: pusula_pro.js L2634-2641 (birebir kopya)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaUtils (flat — plugin modül)
   ⚠ DEFENSIVE GUARD: pusula_pro.js hala aktifse overwrite engelle
   ⚠ KX8 BİREBİR KOPYA: tek satır refactor yok, davranış %100 aynı
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaUtils) window.PusulaUtils = {};

  /* ── _ppHaftaNo: ISO-week (kaynak pusula_pro.js L2634-2641 birebir) ── */
  if (typeof window._ppHaftaNo !== 'function') {
    window._ppHaftaNo = function() {
      var d = new Date();
      var j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      var thu = new Date(j); thu.setUTCDate(j.getUTCDate() + (4 - (j.getUTCDay() || 7)));
      var yStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
      return d.getFullYear() + '-W' + Math.ceil((((thu - yStart) / 86400000) + 1) / 7);
    };
  }

  /* ── Canonical PusulaUtils namespace expose ── */
  window.PusulaUtils._ppHaftaNo = window._ppHaftaNo;
})();
