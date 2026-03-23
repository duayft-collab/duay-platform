'use strict';

// ════════════════════════════════════════════════════════════════
// config/firebase.js — Firebase Yapılandırması
// Proje: operasyon-platform
// ════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDNWvZjgjpzM3eUcA_xDsapWZZaOs0qwWE",
  authDomain:        "operasyon-platform.firebaseapp.com",
  projectId:         "operasyon-platform",
  storageBucket:     "operasyon-platform.firebasestorage.app",
  messagingSenderId: "810645052589",
  appId:             "1:810645052589:web:3ac500eefa029904727a24",
  measurementId:     "G-6JL2CSM886"
};

const DEFAULT_TENANT_ID = 'tenant_default';

// Firestore koleksiyon yolları
const FS_PATHS = {
  tenantBase : tid => `tenants/${tid}`,
  tenant     : tid => `tenants/${tid}`,          // database.js uyumluluğu
  meta       : tid => `tenants/${tid}/meta`,
  data       : tid => `tenants/${tid}/data`,
  logs       : tid => `tenants/${tid}/logs`,
  users      : tid => `tenants/${tid}/meta/users`,
};

// database.js window.FirebaseConfig?.paths kullanıyor — bunu FS_PATHS ile eşle
// Firebase başlatıldıktan sonra paths property'si inject edilir
window.FS_PATHS = FS_PATHS;

// Firebase başlatma
let FirebaseConfig = null;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      FirebaseConfig = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      FirebaseConfig = firebase.apps[0];
    }
    console.log('[Firebase] Başlatıldı:', FIREBASE_CONFIG.projectId);
  }
} catch(e) {
  console.warn('[Firebase] Başlatma hatası:', e.message);
}

// Global erişim
window.FIREBASE_CONFIG     = FIREBASE_CONFIG;
window.DEFAULT_TENANT_ID   = DEFAULT_TENANT_ID;
window.FS_PATHS            = FS_PATHS;
window.FirebaseConfig      = FirebaseConfig;

// auth.js FirebaseConfig.config bekliyor — inject et
// database.js FirebaseConfig.paths bekliyor — inject et
if (!window.FirebaseConfig || typeof window.FirebaseConfig !== 'object') {
  window.FirebaseConfig = {};
}
window.FirebaseConfig.config    = FIREBASE_CONFIG;   // auth.js için
window.FirebaseConfig.paths     = FS_PATHS;           // database.js için
window.FirebaseConfig.tenantId  = DEFAULT_TENANT_ID;
window._getFirestorePaths = () => FS_PATHS;
