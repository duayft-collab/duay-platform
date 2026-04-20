/* DATASHEET-STORAGE-001 PARÇA 1: Firebase Storage helper'ları
   Lazy-fetch pattern — firebase.storage() runtime'da çağrılır.
   Mevcut database.js:120 FB_STORAGE init'iyle çakışmaz (idempotent).
   SDK (firebase-storage-compat.js) index.html'de yüklü olmalı. */
'use strict';

(function() {
  function _getStorage() {
    if (typeof firebase === 'undefined' || !firebase.storage) {
      throw new Error('Firebase Storage SDK yüklü değil — index.html\'de firebase-storage-compat.js eksik');
    }
    return firebase.storage();
  }

  /**
   * Dosyayı Firebase Storage'a yükler. Progress callback + 20MB limit.
   * @param {string} path — storage yolu (ör: 'datasheets/urun123.pdf')
   * @param {File|Blob} file
   * @param {function(number)} [onProgress] — yüzde (0-100)
   * @returns {Promise<{url, path, size, name, type, uploadedAt}>}
   */
  window.storageUpload = function(path, file, onProgress) {
    return new Promise(function(resolve, reject) {
      try {
        if (!file || !(file instanceof File || file instanceof Blob)) {
          return reject(new Error('Geçersiz dosya'));
        }
        if (file.size > 20 * 1024 * 1024) {
          return reject(new Error('Dosya 20MB limitini aşıyor (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)'));
        }
        var storage = _getStorage();
        var storageRef = storage.ref(path);
        var task = storageRef.put(file);

        task.on('state_changed',
          function(snapshot) {
            var pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (typeof onProgress === 'function') onProgress(pct);
          },
          function(err) { reject(err); },
          function() {
            task.snapshot.ref.getDownloadURL().then(function(url) {
              resolve({
                url: url,
                path: path,
                size: file.size,
                name: file.name || '',
                type: file.type || '',
                uploadedAt: new Date().toISOString()
              });
            }).catch(reject);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  };

  /**
   * Storage'dan dosyayı siler.
   * @param {string} path
   * @returns {Promise<void>}
   */
  window.storageDelete = function(path) {
    try {
      var storage = _getStorage();
      return storage.ref(path).delete();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  /**
   * Path'ten download URL getirir.
   * @param {string} path
   * @returns {Promise<string>} URL
   */
  window.storageGetUrl = function(path) {
    try {
      var storage = _getStorage();
      return storage.ref(path).getDownloadURL();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  /**
   * Storage SDK yüklü ve kullanılabilir mi kontrolü.
   * @returns {boolean}
   */
  window.storageReady = function() {
    try {
      return typeof firebase !== 'undefined' && !!firebase.storage;
    } catch (e) {
      return false;
    }
  };
})();
