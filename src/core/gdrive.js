/**
 * ═══════════════════════════════════════════════════════════════
 * src/core/gdrive.js — Google Drive Entegrasyonu v1.0
 *
 * Duay Global Trade — Görsel ve Belge Depolama
 * Base64 fallback: Drive bağlı değilse localStorage'a yazar
 *
 * Yükleme sırası: auth.js → database.js → bu dosya
 * ═══════════════════════════════════════════════════════════════
 */
(function() {
'use strict';

// ── Yapılandırma ─────────────────────────────────────────────
var GDRIVE_CONFIG_KEY = 'ak_gdrive_config';
var GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
var GDRIVE_DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Varsayılan klasör yapısı
var GDRIVE_FOLDERS = {
  root:        'DUAY',
  urunGorsel:  'DUAY/Görseller/Ürünler',
  demirbas:    'DUAY/Görseller/Demirbaşlar',
  teklifler:   'DUAY/Belgeler/Teklifler',
  sozlesmeler: 'DUAY/Belgeler/Sözleşmeler',
  ihracat:     'DUAY/Belgeler/İhracat',
};

// ── Durum ─────────────────────────────────────────────────────
var _gdriveReady = false;
var _gdriveFolderIds = {};

/**
 * Drive yapılandırmasını yükler.
 * @returns {Object}
 */
function _loadConfig() {
  try { return JSON.parse(localStorage.getItem(GDRIVE_CONFIG_KEY) || '{}'); } catch(e) { return {}; }
}
function _saveConfig(cfg) {
  localStorage.setItem(GDRIVE_CONFIG_KEY, JSON.stringify(cfg));
}

/**
 * Drive'ın aktif olup olmadığını kontrol eder.
 * @returns {boolean}
 */
function isDriveEnabled() {
  var cfg = _loadConfig();
  return cfg.enabled === true && _gdriveReady;
}

/**
 * Google API client'ı başlatır.
 * Admin ayarlarından etkinleştirilmişse çalışır.
 */
function initGDrive() {
  var cfg = _loadConfig();
  if (!cfg.enabled) {
    console.info('[GDrive] Devre dışı — admin ayarlarından etkinleştirin');
    return;
  }
  if (!cfg.apiKey || !cfg.clientId) {
    console.warn('[GDrive] API Key veya Client ID eksik');
    return;
  }
  // gapi yüklü mü kontrol et
  if (typeof gapi === 'undefined') {
    console.warn('[GDrive] gapi kütüphanesi yüklenmedi — base64 fallback aktif');
    return;
  }
  gapi.load('client:auth2', function() {
    gapi.client.init({
      apiKey: cfg.apiKey,
      clientId: cfg.clientId,
      discoveryDocs: [GDRIVE_DISCOVERY],
      scope: GDRIVE_SCOPES,
    }).then(function() {
      _gdriveReady = true;
      console.info('[GDrive] Başarıyla başlatıldı');
      // Klasör yapısını oluştur
      _ensureFolderStructure();
    }).catch(function(e) {
      console.warn('[GDrive] Başlatma hatası:', e.message || e);
    });
  });
}

/**
 * Drive'da klasör yapısını oluşturur (yoksa).
 */
function _ensureFolderStructure() {
  // Basitleştirilmiş: klasör ID'lerini cache'ten al
  var cfg = _loadConfig();
  if (cfg.folderIds) {
    _gdriveFolderIds = cfg.folderIds;
    return;
  }
  // İlk kullanımda klasörleri oluştur
  _createFolderIfNotExists('DUAY', null).then(function(rootId) {
    _gdriveFolderIds.root = rootId;
    return Promise.all([
      _createFolderChain(['DUAY', 'Görseller', 'Ürünler'], rootId),
      _createFolderChain(['DUAY', 'Görseller', 'Demirbaşlar'], rootId),
      _createFolderChain(['DUAY', 'Belgeler', 'Teklifler'], rootId),
      _createFolderChain(['DUAY', 'Belgeler', 'Sözleşmeler'], rootId),
      _createFolderChain(['DUAY', 'Belgeler', 'İhracat'], rootId),
    ]);
  }).then(function(results) {
    cfg.folderIds = _gdriveFolderIds;
    _saveConfig(cfg);
    console.info('[GDrive] Klasör yapısı oluşturuldu');
  }).catch(function(e) {
    console.warn('[GDrive] Klasör oluşturma hatası:', e);
  });
}

function _createFolderIfNotExists(name, parentId) {
  if (!_gdriveReady) return Promise.reject('Drive hazır değil');
  var q = "name='" + name + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (parentId) q += " and '" + parentId + "' in parents";
  return gapi.client.drive.files.list({ q: q, fields: 'files(id,name)', spaces: 'drive' })
    .then(function(res) {
      if (res.result.files && res.result.files.length > 0) return res.result.files[0].id;
      var meta = { name: name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) meta.parents = [parentId];
      return gapi.client.drive.files.create({ resource: meta, fields: 'id' }).then(function(r) { return r.result.id; });
    });
}

function _createFolderChain(parts, rootId) {
  // Recursive: DUAY → Görseller → Ürünler
  var current = Promise.resolve(rootId);
  for (var i = 1; i < parts.length; i++) {
    (function(name) {
      current = current.then(function(parentId) {
        return _createFolderIfNotExists(name, parentId).then(function(folderId) {
          _gdriveFolderIds[parts.slice(0, parts.indexOf(name) + 1).join('/')] = folderId;
          return folderId;
        });
      });
    })(parts[i]);
  }
  return current;
}

/**
 * Dosya yükler — Drive aktifse Drive'a, değilse base64 döner.
 * @param {File} file HTML File nesnesi
 * @param {string} klasor Klasör yolu (örn: 'Görseller/Ürünler')
 * @returns {Promise<{url:string, fileId:string, source:string}>}
 */
function gdriveUpload(file, klasor) {
  if (!file) return Promise.reject('Dosya yok');

  // Drive aktif değilse base64 fallback
  if (!isDriveEnabled()) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) {
        resolve({ url: e.target.result, fileId: null, source: 'base64' });
      };
      reader.readAsDataURL(file);
    });
  }

  // Drive'a yükle
  var fullPath = 'DUAY/' + klasor;
  var folderId = _gdriveFolderIds[fullPath] || _gdriveFolderIds.root;
  var metadata = {
    name: file.name,
    parents: folderId ? [folderId] : [],
  };

  var form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  var token = gapi.auth.getToken()?.access_token;
  if (!token) return Promise.reject('Auth token yok');

  return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: form,
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.error) throw new Error(data.error.message);
    // Dosyayı herkese açık yap (görsel URL için)
    return gapi.client.drive.permissions.create({
      fileId: data.id,
      resource: { role: 'reader', type: 'anyone' },
    }).then(function() {
      var url = 'https://drive.google.com/uc?id=' + data.id;
      return { url: url, fileId: data.id, source: 'gdrive', webLink: data.webViewLink };
    });
  })
  .catch(function(e) {
    console.warn('[GDrive] Yükleme hatası, base64 fallback:', e);
    // Fallback: base64
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        resolve({ url: ev.target.result, fileId: null, source: 'base64' });
      };
      reader.readAsDataURL(file);
    });
  });
}

/**
 * Drive'dan dosya siler.
 * @param {string} fileId
 * @returns {Promise}
 */
function gdriveDelete(fileId) {
  if (!fileId || !isDriveEnabled()) return Promise.resolve();
  return gapi.client.drive.files.delete({ fileId: fileId })
    .then(function() { console.info('[GDrive] Dosya silindi:', fileId); })
    .catch(function(e) { console.warn('[GDrive] Silme hatası:', e); });
}

/**
 * Drive dosya URL'i döner.
 * @param {string} fileId
 * @returns {string}
 */
function gdriveGetUrl(fileId) {
  if (!fileId) return '';
  return 'https://drive.google.com/uc?id=' + fileId;
}

/**
 * Drive durumunu döner.
 * @returns {Object}
 */
function gdriveStatus() {
  var cfg = _loadConfig();
  return {
    enabled: cfg.enabled || false,
    ready: _gdriveReady,
    hasApiKey: !!(cfg.apiKey),
    hasClientId: !!(cfg.clientId),
    folderCount: Object.keys(_gdriveFolderIds).length,
  };
}

/**
 * Admin: Drive ayarlarını günceller.
 * @param {Object} settings { enabled, apiKey, clientId }
 */
function gdriveUpdateSettings(settings) {
  var cfg = _loadConfig();
  Object.assign(cfg, settings);
  _saveConfig(cfg);
  if (cfg.enabled && cfg.apiKey && cfg.clientId) {
    initGDrive();
  }
}

/**
 * Mevcut base64 görselleri Drive'a taşır (migration).
 * @returns {Promise<number>} Taşınan dosya sayısı
 */
function gdriveMigrateBase64() {
  if (!isDriveEnabled()) {
    window.toast?.('Drive bağlı değil — önce ayarlardan etkinleştirin', 'err');
    return Promise.resolve(0);
  }
  var urunler = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var base64Items = urunler.filter(function(u) { return u.gorsel && u.gorsel.startsWith('data:'); });
  if (!base64Items.length) {
    window.toast?.('Taşınacak base64 görsel yok', 'info');
    return Promise.resolve(0);
  }
  window.toast?.('Taşınıyor: ' + base64Items.length + ' görsel...', 'info');
  var count = 0;
  var chain = Promise.resolve();
  base64Items.forEach(function(u) {
    chain = chain.then(function() {
      // base64'ü Blob'a çevir
      var parts = u.gorsel.split(',');
      var mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      var binary = atob(parts[1]);
      var arr = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      var blob = new Blob([arr], { type: mime });
      var file = new File([blob], (u.duayKodu || 'urun') + '.jpg', { type: mime });
      return gdriveUpload(file, 'Görseller/Ürünler').then(function(result) {
        if (result.source === 'gdrive') {
          u.gorsel = result.url;
          u.gorselDriveId = result.fileId;
          count++;
        }
      });
    });
  });
  return chain.then(function() {
    if (count > 0 && typeof storeUrunler === 'function') storeUrunler(urunler);
    window.toast?.(count + ' görsel Drive\'a taşındı ✓', 'ok');
    return count;
  });
}

// ── Sayfa yüklenince otomatik başlat ─────────────────────────
setTimeout(initGDrive, 3000);

// ── Window exports ───────────────────────────────────────────
window.GDrive = {
  upload: gdriveUpload,
  delete: gdriveDelete,
  getUrl: gdriveGetUrl,
  status: gdriveStatus,
  updateSettings: gdriveUpdateSettings,
  migrateBase64: gdriveMigrateBase64,
  isEnabled: isDriveEnabled,
  init: initGDrive,
  FOLDERS: GDRIVE_FOLDERS,
};
window.gdriveUpload = gdriveUpload;
window.gdriveDelete = gdriveDelete;
window.gdriveGetUrl = gdriveGetUrl;

})();
