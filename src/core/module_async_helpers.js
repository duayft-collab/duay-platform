/* STORAGE-LONGTERM-001 ADIM 1: Module async helpers */
/* Amaç: Modüller bu helper'ları kullanırsa proxy atlanır, direkt IDB'ye gider.
   Kullanım örneği (gelecek):
     async function loadUrunlerAsync() { return await window.dbGet('urunler', 'ak_urunler1') || []; }
*/

(function() {
  'use strict';

  window.dbGet = async function(storeName, key) {
    try {
      if (!window.appDB) return null;
      var tx = window.appDB.transaction(storeName, 'readonly');
      var store = tx.objectStore(storeName);
      return await new Promise(function(resolve, reject) {
        var req = store.get(key);
        req.onsuccess = function() {
          var val = req.result;
          if (val && val.data !== undefined) resolve(val.data);
          else resolve(val);
        };
        req.onerror = function() { reject(req.error); };
      });
    } catch(e) {
      console.warn('[STORAGE-LONGTERM-001] dbGet fail:', storeName, key, e);
      return null;
    }
  };

  window.dbSet = async function(storeName, key, value) {
    try {
      if (!window.appDB) return false;
      var tx = window.appDB.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      return await new Promise(function(resolve, reject) {
        var req = store.put({ key: key, data: value, ts: Date.now() }, key);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { reject(req.error); };
      });
    } catch(e) {
      console.warn('[STORAGE-LONGTERM-001] dbSet fail:', storeName, key, e);
      return false;
    }
  };

  window.dbDelete = async function(storeName, key) {
    try {
      if (!window.appDB) return false;
      var tx = window.appDB.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      return await new Promise(function(resolve) {
        var req = store.delete(key);
        req.onsuccess = function() { resolve(true); };
        req.onerror = function() { resolve(false); };
      });
    } catch(e) { return false; }
  };

  /* Migration garantisi — reload'da kritik key IDB'de yoksa LS'den oku, IDB'ye yaz, LS'den sil */
  window._storageMigrationGuarantor = async function() {
    var STORE_MAP = window._STORAGE_STORE_MAP || {
      'ak_urunler1': 'urunler',
      'ak_odm1': 'odemeler',
      'ak_tahsilat1': 'tahsilat',
      'ak_satis_teklif1': 'satisTeklifleri',
      'ak_cari1': 'cari',
      'ak_alis_teklif1': 'satinalma',
      'ak_pusula_pro_v1': 'pusulaPro',
      'ak_act1': 'activity'
    };
    var taşınan = 0;
    var keys = Object.keys(STORE_MAP);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var store = STORE_MAP[key];
      /* IDB'de var mı kontrol et */
      var mevcut = await window.dbGet(store, key);
      if (mevcut !== null && mevcut !== undefined) continue;
      /* LS'ten oku (raw, proxy atla) */
      var raw = Storage.prototype.__origGetItem ? Storage.prototype.__origGetItem.call(localStorage, key) : localStorage.getItem(key);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        await window.dbSet(store, key, parsed);
        /* LS'ten sil — proxy cache de sıfırla */
        if (Storage.prototype.__origRemoveItem) Storage.prototype.__origRemoveItem.call(localStorage, key);
        else localStorage.removeItem(key);
        if (window._lsProxyCache) delete window._lsProxyCache[key];
        taşınan++;
      } catch(e) {}
    }
    if (taşınan > 0) console.log('[STORAGE-LONGTERM-001] Migration guarantor: ' + taşınan + ' key garanti altına alındı');
    return { taşınan: taşınan, toplam: keys.length };
  };

  /* Health monitor — proxy vs IDB tutarlılık */
  window.storageHealthCheck = async function() {
    var STORE_MAP = window._STORAGE_STORE_MAP || {};
    var rapor = [];
    for (var key in STORE_MAP) {
      var store = STORE_MAP[key];
      var lsVar = !!localStorage.getItem(key);
      var idbVar = (await window.dbGet(store, key)) !== null;
      var ramVar = !!(window._lsProxyCache && window._lsProxyCache[key]);
      rapor.push({ key: key, store: store, ls: lsVar, idb: idbVar, ram: ramVar, sağlıklı: idbVar });
    }
    console.table(rapor);
    return rapor;
  };

  /* Otomatik çağrı — sayfa açıldıktan 3sn sonra garantor çalıştır */
  setTimeout(function() {
    if (window.appDB) {
      window._storageMigrationGuarantor();
    }
  }, 3000);

})();
