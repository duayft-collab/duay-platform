/**
 * STORAGE-AUDIT-001 — Storage durumu kapsamlı rapor
 * STORAGE-ARCHITECTURE-ROOT-FIX-001
 */
(function() {
  'use strict';

  function _byteSize(str) {
    try { return new Blob([str]).size; } catch(e) { return String(str || '').length * 2; }
  }

  async function _idbStoreSize(store) {
    if (typeof window.idbKeys !== 'function') return { count: 0, bytes: 0, err: 'idb yok' };
    try {
      var keys = await window.idbKeys(store);
      var toplam = 0;
      for (var i = 0; i < keys.length; i++) {
        var v = await window.idbGet(keys[i], store);
        if (v) toplam += _byteSize(JSON.stringify(v));
      }
      return { count: keys.length, bytes: toplam };
    } catch(e) { return { count: 0, bytes: 0, err: e.message }; }
  }

  /**
   * window.storageAudit()
   * Returns: { ls, idb, orphan, duplicates, healthy, oneriler }
   */
  window.storageAudit = async function() {
    var rapor = {
      tarih: new Date().toISOString(),
      ls: { toplam: 0, keySayi: 0, big: [] },
      idb: { stores: {}, toplamBytes: 0 },
      orphan: [],
      expiredCache: [],
      oneriler: []
    };

    /* LS tarama */
    var lsKeys = Object.keys(localStorage);
    var idbRefs = {};
    for (var i = 0; i < lsKeys.length; i++) {
      var k = lsKeys[i];
      var v;
      try { v = localStorage.getItem(k); } catch(e) { continue; }
      if (v === null) continue;

      if (k.indexOf('__idbref_') === 0) {
        idbRefs[k.substring(10)] = true;
        continue;
      }

      var size = _byteSize(v);
      rapor.ls.toplam += size;
      rapor.ls.keySayi++;

      if (size >= 5 * 1024) {
        rapor.ls.big.push({ key: k, kb: (size / 1024).toFixed(2) });
      }

      /* Expired cache check */
      try {
        var p = JSON.parse(v);
        if (p && p._exp !== undefined && p._d !== undefined) {
          if (Date.now() > p._exp) {
            rapor.expiredCache.push({ key: k, expired: new Date(p._exp).toISOString() });
          }
        }
      } catch(e) {}
    }
    rapor.ls.big.sort(function(a, b) { return parseFloat(b.kb) - parseFloat(a.kb); });
    rapor.ls.toplamMB = (rapor.ls.toplam / 1024 / 1024).toFixed(2);

    /* IDB tarama */
    var stores = window._idbStores || ['urunler', 'satinalma', 'satisTeklifleri', 'odemeler', 'tahsilat', 'cari', 'tasks', 'pusulaPro', 'notif', 'activity', 'cache', 'misc'];
    for (var j = 0; j < stores.length; j++) {
      var s = stores[j];
      var info = await _idbStoreSize(s);
      rapor.idb.stores[s] = info;
      if (info.bytes) rapor.idb.toplamBytes += info.bytes;
      /* orphan check: her IDB key'i için LS'de __idbref_ var mı? */
      if (typeof window.idbKeys === 'function') {
        try {
          var ks = await window.idbKeys(s);
          for (var m = 0; m < ks.length; m++) {
            if (!idbRefs[ks[m]]) {
              rapor.orphan.push({ key: ks[m], store: s, neden: 'LS ref yok' });
            }
          }
        } catch(e) {}
      }
    }
    rapor.idb.toplamMB = (rapor.idb.toplamBytes / 1024 / 1024).toFixed(2);

    /* navigator estimate */
    try {
      var est = await navigator.storage.estimate();
      rapor.tarayiciToplam = {
        usage: est.usage,
        quota: est.quota,
        yuzde: est.quota ? ((est.usage / est.quota) * 100).toFixed(2) + '%' : '?'
      };
    } catch(e) {}

    /* Öneriler */
    if (rapor.ls.big.length > 0) {
      rapor.oneriler.push('LS\'de ' + rapor.ls.big.length + ' büyük key var → _storageMigrate() çalıştır');
    }
    if (rapor.expiredCache.length > 0) {
      rapor.oneriler.push(rapor.expiredCache.length + ' süresi dolmuş cache → otomatik silinecek');
    }
    if (rapor.orphan.length > 0) {
      rapor.oneriler.push(rapor.orphan.length + ' IDB orphan → manuel inceleme');
    }

    console.log('[STORAGE-AUDIT-001] Rapor:', rapor);
    return rapor;
  };

  /* Kısaltma */
  window.sa = function() { return window.storageAudit(); };

  console.log('[STORAGE-AUDIT-001] hazır. storageAudit() veya sa() ile rapor al.');
})();
