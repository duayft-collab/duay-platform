/**
 * IDB-CORE-001 — IndexedDB wrapper (appDB)
 * STORAGE-ARCHITECTURE-ROOT-FIX-001 altyapı
 */
(function() {
  'use strict';

  var DB_NAME = 'duayAppDB';
  var DB_VERSION = 1;
  var STORES = ['urunler', 'satinalma', 'satisTeklifleri', 'odemeler', 'tahsilat', 'cari', 'tasks', 'pusulaPro', 'notif', 'activity', 'cache', 'misc'];

  var _dbPromise = null;

  function _openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function(resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB desteklenmiyor')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = function() { reject(req.error); };
      req.onsuccess = function() { resolve(req.result); };
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        STORES.forEach(function(s) {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: 'key' });
          }
        });
      };
    });
    return _dbPromise;
  }

  function _tx(storeName, mode) {
    return _openDB().then(function(db) {
      if (!db.objectStoreNames.contains(storeName)) {
        /* Bilinmeyen store — misc'e düş */
        storeName = 'misc';
      }
      return db.transaction([storeName], mode).objectStore(storeName);
    });
  }

  /* idbSet(key, data, store?) — async, resolve'da kaydet */
  window.idbSet = function(key, data, store) {
    store = store || 'misc';
    return _tx(store, 'readwrite').then(function(os) {
      return new Promise(function(resolve, reject) {
        var req = os.put({ key: key, data: data, updatedAt: Date.now() });
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) { console.warn('[idb] set hata:', key, e); return false; });
  };

  /* idbGet(key, store?) — async, null resolve eder bulunmazsa */
  window.idbGet = function(key, store) {
    store = store || 'misc';
    return _tx(store, 'readonly').then(function(os) {
      return new Promise(function(resolve, reject) {
        var req = os.get(key);
        req.onsuccess = function() { resolve(req.result ? req.result.data : null); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) { console.warn('[idb] get hata:', key, e); return null; });
  };

  /* idbDelete(key, store?) */
  window.idbDelete = function(key, store) {
    store = store || 'misc';
    return _tx(store, 'readwrite').then(function(os) {
      return new Promise(function(resolve, reject) {
        var req = os.delete(key);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) { console.warn('[idb] delete hata:', key, e); return false; });
  };

  /* idbKeys(store?) — tüm key'leri listele */
  window.idbKeys = function(store) {
    store = store || 'misc';
    return _tx(store, 'readonly').then(function(os) {
      return new Promise(function(resolve, reject) {
        var req = os.getAllKeys();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) { console.warn('[idb] keys hata:', e); return []; });
  };

  /* idbSize() — yaklaşık toplam kullanım */
  window.idbSize = async function() {
    try {
      var est = await navigator.storage.estimate();
      return { usage: est.usage || 0, quota: est.quota || 0 };
    } catch(e) { return { usage: 0, quota: 0 }; }
  };

  /* Global expose */
  window._idbStores = STORES;
  window._idbDbName = DB_NAME;

  /* Pre-open DB (uygulama başlarken) */
  _openDB().then(function() {
    console.log('[IDB-CORE-001] appDB hazır:', STORES.length, 'store');
  }).catch(function(e) {
    console.error('[IDB-CORE-001] DB açılamadı:', e);
  });
})();
