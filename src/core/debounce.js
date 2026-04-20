/**
 * ARAMA-DEBOUNCE-001 — Global debounce + throttle helper'ları
 * window._debounce(fn, ms = 300) → son çağrıdan ms kadar sessiz kalındığında fn çalışır.
 * window._throttle(fn, ms = 200) → aynı fn ms süresince en fazla bir kez çalışır.
 *
 * Kullanım:
 *   input.oninput = window._debounce(function(e) { renderFilter(e.target.value); }, 300);
 *   window.onscroll = window._throttle(function() { updateScrollPos(); }, 200);
 *
 * Uygulandığında (sonraki talimatlar): ürün arama, cari arama, satış arama kutuları.
 */
(function() {
  'use strict';

  window._debounce = function(fn, ms) {
    var timeout;
    var wait = (typeof ms === 'number' && ms > 0) ? ms : 300;
    return function() {
      var ctx = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() { fn.apply(ctx, args); }, wait);
    };
  };

  window._throttle = function(fn, ms) {
    var lastCall = 0;
    var wait = (typeof ms === 'number' && ms > 0) ? ms : 200;
    return function() {
      var now = Date.now();
      if (now - lastCall < wait) return;
      lastCall = now;
      return fn.apply(this, arguments);
    };
  };

  console.log('[ARAMA-DEBOUNCE-001] _debounce + _throttle hazır');
})();
