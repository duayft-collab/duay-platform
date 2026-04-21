/* STORAGE-MONITOR-001 — LS/IDB periyodik izleme + sızıntı tespiti
 * Global: window.storageReport() — manuel sorgu
 * Otomatik: her 30s console.info + 2MB eşik uyarı
 */
(function(){
  'use strict';
  var LOG_INTERVAL_MS = 30000;
  var WARN_LS_KB = 2048; // 2 MB eşik
  var _prevKeys = {};
  var _prevTotal = 0;

  function measure(){
    var keys = Object.keys(localStorage);
    var total = 0;
    var perKey = [];
    keys.forEach(function(k){
      var v = localStorage.getItem(k) || '';
      var b = (k.length + v.length) * 2;
      total += b;
      perKey.push({k: k, kb: b/1024});
    });
    perKey.sort(function(a,b){ return b.kb - a.kb; });

    // Diff — hangi key'ler büyüdü
    var grew = [];
    perKey.forEach(function(p){
      var prev = _prevKeys[p.k] || 0;
      if (p.kb - prev > 10) { // 10 KB+ büyüme
        grew.push({k: p.k, delta: (p.kb - prev).toFixed(1) + ' KB'});
      }
      _prevKeys[p.k] = p.kb;
    });

    var totalDelta = total - _prevTotal;
    _prevTotal = total;

    return {
      totalKB: (total/1024).toFixed(1),
      deltaKB: (totalDelta/1024).toFixed(1),
      keyCount: keys.length,
      top5: perKey.slice(0,5).map(function(p){ return { k: p.k, kb: p.kb.toFixed(1) }; }),
      grewKeys: grew.slice(0,5)
    };
  }

  window.storageReport = function(){
    var m = measure();
    var out = Object.assign({}, m, {
      idbAvailable: typeof window.idbGet === 'function',
      idbFailed: window._idbFailed || false,
      storageReady: window._storageReady || false,
      memCacheKeys: Object.keys(window._memCache || {}).length,
      heapMB: performance.memory ? (performance.memory.usedJSHeapSize/1048576).toFixed(1) : 'N/A'
    });
    console.table(out.top5);
    if (out.grewKeys.length) console.table(out.grewKeys);
    return out;
  };

  function tick(){
    var m = measure();
    var tag = '[STORAGE-MON]';
    console.info(tag, 'LS', m.totalKB + 'KB', '(' + (m.deltaKB > 0 ? '+' : '') + m.deltaKB + 'KB)', 'keys', m.keyCount);
    if (m.grewKeys.length) {
      console.info(tag, 'GROW:', m.grewKeys.map(function(g){return g.k + ' ' + g.delta;}).join(', '));
    }
    if (parseFloat(m.totalKB) > WARN_LS_KB) {
      console.warn(tag, '⚠️ LS ' + m.totalKB + 'KB — eşik ' + WARN_LS_KB + 'KB aşıldı!');
    }
  }

  // İlk ölçüm 3 saniye sonra (sayfa otursun), sonra her 30s
  setTimeout(function(){
    tick();
    setInterval(tick, LOG_INTERVAL_MS);
  }, 3000);

  console.info('[STORAGE-MON] monitor aktif — storageReport() ile manuel sorgula');
})();
