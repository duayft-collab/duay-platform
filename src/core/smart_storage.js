/**
 * SMART-STORAGE-001 — setData/getData router + TTL + Guard + Cleanup
 * STORAGE-ARCHITECTURE-ROOT-FIX-001
 */
(function() {
  'use strict';

  var THRESHOLD_BYTES = 5 * 1024; /* 5KB */
  var KEY_TO_STORE = {
    'ak_urunler1': 'urunler', 'ak_urun_db1': 'urunler',
    'ak_satinalma1': 'satinalma', 'ak_satinalma_v2': 'satinalma',
    'ak_alis_teklif1': 'satinalma', 'ak_satis_teklif1': 'satisTeklifleri',
    'ak_cmp_teklif1': 'satisTeklifleri', 'ak_crm_teklif1': 'satisTeklifleri',
    'ak_odm1': 'odemeler', 'ak_tahsilat1': 'tahsilat',
    'ak_cari1': 'cari', 'ak_tasks': 'tasks', 'ak_task_chat1': 'tasks',
    'ak_pusula_pro_v1': 'pusulaPro',
    'ak_notif1': 'notif', 'ak_ann1': 'notif',
    'ak_act1': 'activity', 'ak_activity1': 'activity', 'ak_activity_v1': 'activity'
  };
  var TTL_KEYS = {
    'ak_tcmb_cache': 3600000, 'ak_currencies1': 3600000, 'ak_altin_cache': 3600000,
    'ak_kur_rates': 3600000, 'ak_notif1': 604800000, 'ak_act1': 604800000,
    'ak_activity1': 604800000
  };

  function _byteSize(str) {
    try { return new Blob([str]).size; } catch(e) { return String(str || '').length * 2; }
  }

  function _storeFor(key) { return KEY_TO_STORE[key] || 'misc'; }

  /* setData(key, data) — ASYNC promise resolve */
  window.setData = async function(key, data) {
    var ttl = TTL_KEYS[key];
    var payload = (ttl > 0) ? { _d: data, _exp: Date.now() + ttl } : data;
    var serialized = JSON.stringify(payload);
    var size = _byteSize(serialized);
    if (size < THRESHOLD_BYTES) {
      try { localStorage.setItem(key, serialized); return { where: 'ls', size: size }; }
      catch(e) {
        console.warn('[SmartStorage] LS setItem hata, IDB\'ye düşüyor:', key, e);
        /* fallback IDB */
      }
    }
    if (typeof window.idbSet === 'function') {
      await window.idbSet(key, payload, _storeFor(key));
      /* LS'te sadece reference */
      try { localStorage.setItem('__idbref_' + key, '1'); } catch(e) {}
      return { where: 'idb', size: size };
    }
    /* IDB yoksa fallback LS (risk) */
    try { localStorage.setItem(key, serialized); return { where: 'ls-fallback', size: size }; } catch(e) {}
    return { where: 'fail', size: size };
  };

  /* getData(key) — ASYNC. LS'de varsa oradan, yoksa IDB */
  window.getData = async function(key) {
    /* LS önce */
    var raw = null;
    try { raw = localStorage.getItem(key); } catch(e) {}
    if (raw !== null && raw !== undefined && raw.indexOf('__idbref_') !== 0) {
      try {
        var p = JSON.parse(raw);
        if (p && p._exp !== undefined && p._d !== undefined) {
          if (Date.now() > p._exp) {
            localStorage.removeItem(key);
            return null;
          }
          return p._d;
        }
        return p;
      } catch(e) { return raw; }
    }
    /* IDB */
    if (typeof window.idbGet === 'function') {
      var val = await window.idbGet(key, _storeFor(key));
      if (val && val._exp !== undefined && val._d !== undefined) {
        if (Date.now() > val._exp) {
          await window.idbDelete(key, _storeFor(key));
          return null;
        }
        return val._d;
      }
      return val;
    }
    return null;
  };

  /* delData(key) */
  window.delData = async function(key) {
    try { localStorage.removeItem(key); } catch(e) {}
    try { localStorage.removeItem('__idbref_' + key); } catch(e) {}
    if (typeof window.idbDelete === 'function') {
      await window.idbDelete(key, _storeFor(key));
    }
  };

  /* LS-GUARD-001: setItem override — 5KB üstü bildir ve IDB öner */
  var _origSetItem = Storage.prototype.setItem;
  window._lsGuard5KB = true;
  Storage.prototype.setItem = function(key, value) {
    if (window._lsGuard5KB && this === localStorage && key && key.indexOf('ak_') === 0) {
      var size = _byteSize(String(value || ''));
      if (size > 50 * 1024) {
        console.warn('[LS-GUARD-001] 50KB üstü LS write:', key, (size / 1024).toFixed(1) + 'KB → setData() kullan');
      }
    }
    return _origSetItem.apply(this, arguments);
  };

  /* CLEANUP-AUTO-001: Load'da estimate check */
  window._smartStorageCleanup = async function() {
    try {
      var est = await navigator.storage.estimate();
      var pct = est.quota ? (est.usage / est.quota) * 100 : 0;
      if (pct < 70) return { pct: pct.toFixed(1), action: 'yok' };
      /* %70+: cache temizle */
      if (typeof window.idbKeys === 'function') {
        var cacheKeys = await window.idbKeys('cache');
        await Promise.all(cacheKeys.map(function(k) { return window.idbDelete(k, 'cache'); }));
      }
      if (pct < 85) return { pct: pct.toFixed(1), action: 'cache-temizlendi' };
      /* %85+: tasks + activity eski */
      if (typeof window._lsAutoTrim === 'function') window._lsAutoTrim();
      if (pct < 95) return { pct: pct.toFixed(1), action: 'agresif-cleanup' };
      /* %95+: emergency */
      if (typeof window._lsHardDeleteOld === 'function') window._lsHardDeleteOld();
      return { pct: pct.toFixed(1), action: 'emergency' };
    } catch(e) { return { err: e.message }; }
  };

  /* App load'da otomatik cleanup — 8 sn gecikme */
  setTimeout(function() {
    window._smartStorageCleanup().then(function(r) {
      if (r && r.action && r.action !== 'yok') console.log('[SmartStorage] cleanup:', r);
    });
  }, 8000);

  /* STORAGE-PROXY-PERSIST-001: Transparent localStorage → IDB proxy */
  var MIGRATE_KEYS = {
    'ak_urunler1': 'urunler', 'ak_urun_db1': 'urunler',
    'ak_satinalma1': 'satinalma', 'ak_satinalma_v2': 'satinalma', 'ak_alis_teklif1': 'satinalma',
    'ak_satis_teklif1': 'satisTeklifleri', 'ak_cmp_teklif1': 'satisTeklifleri', 'ak_crm_teklif1': 'satisTeklifleri',
    'ak_odm1': 'odemeler', 'ak_tahsilat1': 'tahsilat',
    'ak_cari1': 'cari', 'ak_tasks': 'tasks', 'ak_task_chat1': 'tasks',
    'ak_pusula_pro_v1': 'pusulaPro',
    'ak_notif1': 'notif', 'ak_ann1': 'notif',
    'ak_act1': 'activity', 'ak_activity1': 'activity',
    'ak_ihr_urun1': 'misc', 'ak_ihr_evrak1': 'misc',
    'ak_teklif_sartlar1': 'misc', 'ak_kpi1': 'misc',
    'ak_cal2': 'misc', 'ak_pn2': 'misc', 'ak_bankalar1': 'misc',
    'ak_alarms1': 'misc', 'ak_tk2': 'misc'
  };

  window._lsProxyCache = {};
  window._lsProxyReady = false;

  /* Preload — IDB'den RAM'e yükle (app load'da tek sefer) */
  async function _proxyPreload() {
    var keys = Object.keys(MIGRATE_KEYS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var store = MIGRATE_KEYS[k];
      try {
        var val = await window.idbGet(k, store);
        if (val !== null && val !== undefined) {
          window._lsProxyCache[k] = (typeof val === 'string') ? val : JSON.stringify(val);
        }
      } catch(e) {}
    }
    window._lsProxyReady = true;
    console.log('[STORAGE-PROXY-PERSIST-001] Preload tamam:', Object.keys(window._lsProxyCache).length, 'key yüklendi');
  }
  _proxyPreload();

  /* Orijinal metodları sakla (ilk kez) */
  if (!Storage.prototype.__origGetItem) {
    Storage.prototype.__origGetItem = Storage.prototype.getItem;
    Storage.prototype.__origSetItem = Storage.prototype.setItem;
    Storage.prototype.__origRemoveItem = Storage.prototype.removeItem;
  }

  /* getItem override — migrate key'ler için RAM cache döndür */
  Storage.prototype.getItem = function(key) {
    if (this === localStorage && MIGRATE_KEYS[key]) {
      return window._lsProxyCache[key] || null;
    }
    return Storage.prototype.__origGetItem.call(this, key);
  };

  /* setItem override — RAM'e yaz, IDB'ye fire-and-forget, LS'i kirletme */
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && MIGRATE_KEYS[key]) {
      window._lsProxyCache[key] = value;
      try {
        var parsed = JSON.parse(value);
        window.idbSet(key, parsed, MIGRATE_KEYS[key]).catch(function(){});
      } catch(e) {
        window.idbSet(key, value, MIGRATE_KEYS[key]).catch(function(){});
      }
      return; /* LS'e YAZMIYORUZ */
    }
    return Storage.prototype.__origSetItem.call(this, key, value);
  };

  /* removeItem override */
  Storage.prototype.removeItem = function(key) {
    if (this === localStorage && MIGRATE_KEYS[key]) {
      delete window._lsProxyCache[key];
      window.idbDelete(key, MIGRATE_KEYS[key]).catch(function(){});
      return;
    }
    return Storage.prototype.__origRemoveItem.call(this, key);
  };

  console.log('[SMART-STORAGE-001] hazır, threshold:', THRESHOLD_BYTES, 'bytes');
})();
