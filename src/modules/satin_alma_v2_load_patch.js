'use strict';
/* ════════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2_load_patch.js — V195c MONKEY-PATCH HUB
   _saV2Load wrap konsolidasyonu: stack-based inject pattern.

   API: window._saV2Load_Push(tempData, durationMs) → entryId
        window._saV2Load_PatchStatus() → {installed, stackSize}

   Eski mekanik (satis.js:9-12 + render.js:632-645):
     - 2 farklı dosyada aynı pattern: capture → wrap → 5sn restore
     - Risk 1 (race condition): paralel tetikleme bozuk fonksiyon ref

   Yeni mekanik (bu hub):
     - Tek orijinal capture (lazy, ilk Push'ta)
     - Stack-based inject — paralel entry'ler kayıp olmaz
     - Bireysel timer her entry için, ID ile splice
     - Stack boşaldığında otomatik uninstall (orijinal'e dön)

   Davranış-eşit refactor (KX8 birebir kopya değil, davranış birebir):
     - Wrap inject hâlâ prepend ([temp].concat(orig))
     - 5sn timer süresi aynı (parametre + 5000 default)
     - _saV2Load() çıktısı (temp obj + orig) korundu
   ════════════════════════════════════════════════════════════════ */

(function() {

  /* ── State ──────────────────────────────────────────────────── */
  var origLoad = null;          /* Hub init'de yakalanır (lazy, ilk Push'ta) */
  var injectStack = [];         /* {id, tempData} */
  var entryCounter = 0;
  var installed = false;        /* window._saV2Load === combinedLoad? */

  /* ── Combined load — orig + stack injects ───────────────────── */
  function combinedLoad() {
    var base = (typeof origLoad === 'function') ? origLoad() : [];
    if (!injectStack.length) return base;
    var prepend = injectStack.map(function(s) { return s.tempData; });
    return prepend.concat(base);
  }

  /**
   * Geçici teklif obj'sini _saV2Load çıktısına prepend eder, durationMs
   * sonra otomatik kaldırır. Race-safe: paralel Push'lar kayıp olmaz,
   * her entry kendi timer'ı ile bireysel splice edilir.
   *
   * @param {Object} tempData — geçici teklif (id + alanlar)
   * @param {number} [durationMs=5000] — kayıt süresi
   * @returns {number} entryId — gelecek iptal için
   */
  window._saV2Load_Push = function(tempData, durationMs) {
    durationMs = durationMs || 5000;
    var entryId = ++entryCounter;
    var entry = { id: entryId, tempData: tempData };

    /* İlk Push'ta install (lazy original capture) */
    if (!installed) {
      origLoad = window._saV2Load;
      window._saV2Load = combinedLoad;
      installed = true;
    }
    injectStack.push(entry);

    /* Restore timer — entry'yi stack'ten çıkar, stack boşsa uninstall */
    setTimeout(function() {
      var idx = injectStack.findIndex(function(s) { return s.id === entryId; });
      if (idx >= 0) injectStack.splice(idx, 1);
      if (!injectStack.length && installed) {
        window._saV2Load = origLoad;
        installed = false;
      }
    }, durationMs);

    return entryId;
  };

  /**
   * Debug API — hub state snapshot. Production'da zarar yok.
   * @returns {{installed:boolean, stackSize:number}}
   */
  window._saV2Load_PatchStatus = function() {
    return { installed: installed, stackSize: injectStack.length };
  };

  console.info('[V195c] satin_alma_v2_load_patch yüklendi — Risk 1 (race condition) kapandı');
})();
