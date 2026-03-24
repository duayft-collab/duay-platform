/**
 * ════════════════════════════════════════════════════════════════
 * src/core/cache.js  —  v1.0.0
 * In-Memory Önbellekleme Katmanı
 *
 * database.js'den SONRA, diğer modüllerden ÖNCE yüklenmeli.
 * Mevcut window.loadTasks, window.loadUsers vb. fonksiyonları
 * şeffaf şekilde önbellekleyen wrapper'lar tanımlar.
 *
 * Önbellek invalidation:
 *   saveTasks() → tasks cache temizlenir
 *   saveUsers() → users cache temizlenir
 *   vb.
 *
 * Yükleme: index.html'de database.js'den hemen sonra
 *   <script src="src/core/cache.js"></script>
 * ════════════════════════════════════════════════════════════════
 */
(function() {
'use strict';

const _cache = Object.create(null);

function _wrap(loadFn, saveFn, key) {
  // Orijinal fonksiyonları sakla
  const _origLoad = window[loadFn];
  const _origSave = window[saveFn];

  if (!_origLoad || !_origSave) return; // Henüz yüklenmedi

  // Load: önbellekten dön, yoksa oku ve önbelleğe al
  window[loadFn] = function() {
    if (_cache[key] !== undefined) return _cache[key];
    const data = _origLoad.apply(this, arguments);
    _cache[key] = data;
    return data;
  };

  // Save: yaz ve önbelleği güncelle
  window[saveFn] = function(data) {
    _cache[key] = data;
    return _origSave.apply(this, arguments);
  };

  // DB nesnesi üzerinde de güncelle
  if (window.DB) {
    window.DB[loadFn] = window[loadFn];
    window.DB[saveFn] = window[saveFn];
  }
}

// Önbellek temizleme — logout'ta çağrılır
window.clearDataCache = function() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
  console.info('[Cache] Önbellek temizlendi');
};

// Tüm kritik koleksiyonları önbellekle
// DOMContentLoaded'da çalıştır — database.js yüklendikten sonra
function _initCache() {
  [
    ['loadTasks',    'saveTasks',    'tasks'],
    ['loadUsers',    'saveUsers',    'users'],
    ['loadKargo',    'storeKargo',   'kargo'],
    ['loadKonteyn',  'storeKonteyn', 'konteyn'],
    ['loadIk',       'storeIk',      'ik'],
    ['loadPirim',    'storePirim',   'pirim'],
    ['loadStok',     'storeStok',    'stok'],
    ['loadCrmData',  'storeCrmData', 'crm'],
    ['loadAnn',      'storeAnn',     'ann'],
    ['loadNotes',    'saveNotes',    'notes'],
    ['loadHdf',      'storeHdf',     'hdf'],
    ['loadOdm',      'storeOdm',     'odm'],
    ['loadIzin',     'storeIzin',    'izin'],
    ['loadNotifs',   'storeNotifs',  'notifs'],
    ['loadAct',      'saveAct',      'act'],
    ['loadCal',      'saveCal',      'cal'],
  ].forEach(function(triple) {
    _wrap(triple[0], triple[1], triple[2]);
  });

  // Logout'ta önbelleği temizle
  const _origLogout = window.App?.logout;
  if (_origLogout && window.App) {
    window.App.logout = function() {
      window.clearDataCache();
      return _origLogout.apply(this, arguments);
    };
  }

  console.info('[Cache] Önbellekleme aktif —', Object.keys(_cache).length, 'koleksiyon izleniyor');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initCache);
} else {
  // Script'ler body sonunda yüklendiğinde DOMContentLoaded zaten geçti
  setTimeout(_initCache, 0);
}

})();
