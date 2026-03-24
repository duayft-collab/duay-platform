'use strict';

// ════════════════════════════════════════════════════════════════
// config/firebase.js  —  v8.2.0 / 2026-03-24 00:00
// Firebase Yapılandırması
// Proje: operasyon-platform
//
// ⚠️  GÜVENLİK: API key'leri asla bu dosyaya yazmayın.
//     Gerçek değerler .env dosyasında tutulur.
//     MacBook terminalde yapılandırma için:
//       cp .env.example .env
//       nano .env   ← gerçek değerleri buraya yazın
//
// Anayasa Kural 02 — Sıfır Hardcode Politikası
// ════════════════════════════════════════════════════════════════

// ── .env desteği ─────────────────────────────────────────────────
// Eğer bir build tool (Vite, Webpack, Parcel) kullanıyorsanız
// aşağıdaki import.meta.env veya process.env bloğu aktif edilir.
// Vanilla HTML + script tag kullanıyorsanız window.__ENV__ nesnesini
// index.html'de <script> ile inject edin (aşağıya bakın).
//
// index.html'e eklenecek script (body başına, diğer scriptlerden önce):
//
//   <script>
//     window.__ENV__ = {
//       FIREBASE_API_KEY:            'YOUR_FIREBASE_API_KEY',
//       FIREBASE_AUTH_DOMAIN:        'YOUR_FIREBASE_AUTH_DOMAIN',
//       FIREBASE_PROJECT_ID:         'YOUR_FIREBASE_PROJECT_ID',
//       FIREBASE_STORAGE_BUCKET:     'YOUR_FIREBASE_STORAGE_BUCKET',
//       FIREBASE_MESSAGING_SENDER_ID:'YOUR_FIREBASE_MESSAGING_SENDER_ID',
//       FIREBASE_APP_ID:             'YOUR_FIREBASE_APP_ID',
//       FIREBASE_MEASUREMENT_ID:     'YOUR_FIREBASE_MEASUREMENT_ID',
//       FIREBASE_APPCHECK_SITE_KEY:  'YOUR_RECAPTCHA_V3_SITE_KEY',
//     };
//   </script>
//
// .env.example dosyası (projeye commit edilir, gerçek değerler commit edilmez):
//   FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
//   FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
//   ...
// ─────────────────────────────────────────────────────────────────

function _getEnv(key, fallback) {
  // 1. window.__ENV__ (vanilla HTML injection)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  // 2. import.meta.env (Vite)
  try {
    if (typeof import_meta_env !== 'undefined') return import_meta_env['VITE_' + key] || fallback;
  } catch (e) {}
  // 3. process.env (Node/Webpack)
  try {
    if (typeof process !== 'undefined' && process.env) return process.env['VITE_' + key] || fallback;
  } catch (e) {}
  // 4. Fallback — geliştirme ortamı uyarısı
  if (fallback === undefined) {
    console.warn('[Firebase] Yapılandırma eksik:', key,
      '— window.__ENV__ veya .env dosyasını kontrol edin.');
  }
  return fallback || '';
}

const FIREBASE_CONFIG = {
  apiKey:            _getEnv('FIREBASE_API_KEY',             'YOUR_FIREBASE_API_KEY'),
  authDomain:        _getEnv('FIREBASE_AUTH_DOMAIN',         'YOUR_FIREBASE_AUTH_DOMAIN'),
  projectId:         _getEnv('FIREBASE_PROJECT_ID',          'YOUR_FIREBASE_PROJECT_ID'),
  storageBucket:     _getEnv('FIREBASE_STORAGE_BUCKET',      'YOUR_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: _getEnv('FIREBASE_MESSAGING_SENDER_ID', 'YOUR_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             _getEnv('FIREBASE_APP_ID',              'YOUR_FIREBASE_APP_ID'),
  measurementId:     _getEnv('FIREBASE_MEASUREMENT_ID',      'YOUR_FIREBASE_MEASUREMENT_ID'),
};

// App Check reCAPTCHA v3 site key
const APPCHECK_SITE_KEY = _getEnv('FIREBASE_APPCHECK_SITE_KEY', 'YOUR_RECAPTCHA_V3_SITE_KEY');

const DEFAULT_TENANT_ID = 'tenant_default';

// ── Firestore Koleksiyon Yolları ──────────────────────────────────
const FS_PATHS = {
  tenantBase : tid => `tenants/${tid}`,
  tenant     : tid => `tenants/${tid}`,
  meta       : tid => `tenants/${tid}/meta`,
  data       : tid => `tenants/${tid}/data`,
  logs       : tid => `tenants/${tid}/logs`,
  users      : tid => `tenants/${tid}/meta/users`,
};

window.FS_PATHS = FS_PATHS;

// ── Firebase Başlatma ────────────────────────────────────────────
let FirebaseConfig = null;

try {
  if (typeof firebase !== 'undefined') {

    // Config geçerliliğini kontrol et
    if (FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') {
      console.error(
        '[Firebase] ⛔ API key yapılandırılmamış!\n' +
        'index.html\'e window.__ENV__ bloğu ekleyin veya .env dosyasını düzenleyin.\n' +
        'Detay: config/firebase.js dosyasının başındaki yoruma bakın.'
      );
    }

    if (!firebase.apps.length) {
      FirebaseConfig = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      FirebaseConfig = firebase.apps[0];
    }

    console.log('[Firebase] Başlatıldı:', FIREBASE_CONFIG.projectId);

    // ── Firebase App Check (Anayasa Kural 02 — Bot Koruması) ────
    // reCAPTCHA v3 ile bot ve sahte istemci erişimini engeller.
    // Firebase Console → App Check → reCAPTCHA v3 → site key alın.
    // Aktivasyon: https://console.firebase.google.com/project/YOUR_PROJECT/appcheck
    if (APPCHECK_SITE_KEY && APPCHECK_SITE_KEY !== 'YOUR_RECAPTCHA_V3_SITE_KEY') {
      try {
        if (typeof firebase.appCheck === 'function') {
          const appCheck = firebase.appCheck();
          appCheck.activate(
            new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
            // isTokenAutoRefreshEnabled: true — token otomatik yenilenir
            true
          );
          console.log('[Firebase] App Check aktif — reCAPTCHA v3');
        } else {
          console.warn(
            '[Firebase] App Check SDK yüklü değil.\n' +
            'index.html\'e şunu ekleyin:\n' +
            '<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check-compat.js"></script>'
          );
        }
      } catch (appCheckErr) {
        console.warn('[Firebase] App Check başlatılamadı:', appCheckErr.message);
      }
    } else {
      console.warn(
        '[Firebase] App Check devre dışı — FIREBASE_APPCHECK_SITE_KEY tanımlı değil.\n' +
        'Firebase Console → App Check bölümünden reCAPTCHA v3 site key alın.'
      );
    }

  } else {
    console.warn('[Firebase] firebase global nesnesi bulunamadı — SDK yüklü mü?');
  }
} catch (e) {
  console.warn('[Firebase] Başlatma hatası:', e.message);
}

// ── Global Erişim ─────────────────────────────────────────────────
window.FIREBASE_CONFIG     = FIREBASE_CONFIG;
window.DEFAULT_TENANT_ID   = DEFAULT_TENANT_ID;
window.FS_PATHS            = FS_PATHS;
window.FirebaseConfig      = FirebaseConfig;

if (!window.FirebaseConfig || typeof window.FirebaseConfig !== 'object') {
  window.FirebaseConfig = {};
}
window.FirebaseConfig.config    = FIREBASE_CONFIG;
window.FirebaseConfig.paths     = FS_PATHS;
window.FirebaseConfig.tenantId  = DEFAULT_TENANT_ID;
window._getFirestorePaths = () => FS_PATHS;
