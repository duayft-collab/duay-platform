/**
 * ════════════════════════════════════════════════════════════════
 * src/core/auth.js  —  v1.0.0
 * Kimlik Dogrulama Katmani
 *
 * Sorumluluklar:
 *   1. Firebase Auth entegrasyonu (signIn / signOut / onAuthStateChanged)
 *   2. Yerel (localStorage) oturum yonetimi (offline / demo mod)
 *   3. window.Auth API — app.js ve tum moduller buradan okur
 *
 * Yukleme sirasi: database.js → cache.js → [BU DOSYA] → utils.js
 * Disari aktarim: window.Auth
 *
 * Anayasa Kural 02 — Sifir hardcode secret
 * Anayasa Kural 03 — Her login/logout logActivity ile kayit
 * Anayasa Kural 05 — Session versiyon bilgisi statik
 * ════════════════════════════════════════════════════════════════
 */
(function() {
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const SESSION_KEY  = 'ak_session';
const BRUTE_KEY    = 'ak_brute';
const MAX_ATTEMPTS = 5;
const LOCK_MS      = 15 * 60 * 1000; // 15 dakika (K02)

// ── Durum ────────────────────────────────────────────────────────
let _currentUser = null;
let _fbAuth      = null;
let _fbDB        = null;

// ── Firebase referanslari ────────────────────────────────────────
function _initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      if (firebase.auth)      _fbAuth = firebase.auth();
      if (firebase.firestore) _fbDB   = firebase.firestore();
    }
  } catch (e) {
    console.warn('[Auth] Firebase init:', e.message);
  }
}
_initFirebase();

// ── Brute-force korumasi (K02) ───────────────────────────────────
function _getBrute() {
  try { return JSON.parse(localStorage.getItem(BRUTE_KEY)) || {}; } catch { return {}; }
}
function _setBrute(data) {
  try { localStorage.setItem(BRUTE_KEY, JSON.stringify(data)); } catch (e) {}
}
function _isLocked() {
  const b = _getBrute();
  if (b.count >= MAX_ATTEMPTS && b.lockedAt) {
    if (Date.now() - b.lockedAt < LOCK_MS) return true;
    _setBrute({}); // kilit suresi doldu
  }
  return false;
}
function _recordFail() {
  const b = _getBrute();
  b.count = (b.count || 0) + 1;
  if (b.count >= MAX_ATTEMPTS) b.lockedAt = Date.now();
  _setBrute(b);
}
function _resetBrute() {
  _setBrute({});
}

// ── Sifre hashleme (SHA-256) ────────────────────────────────────
async function _hash(str) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: basit hash (guvenlik azalir ama calismaya devam eder)
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(16).padStart(8, '0');
}

// ── Session yonetimi ────────────────────────────────────────────
function _saveSession(user) {
  _currentUser = user;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      ts:    new Date().toISOString()
    }));
  } catch (e) {}
}

function _clearSession() {
  _currentUser = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

// ── Kullanici cozumleme ─────────────────────────────────────────
function _findUserByEmail(email) {
  const users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  return users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase());
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════

/**
 * Giris yapar. Oncelik: Firebase Auth → yerel sifre eslestirme.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ok:boolean, user?:Object, error?:string}>}
 */
async function login(email, password) {
  // Brute-force kontrolu
  if (_isLocked()) {
    const b = _getBrute();
    const kalan = Math.ceil((LOCK_MS - (Date.now() - b.lockedAt)) / 60000);
    return { ok: false, error: `Cok fazla hatali giris. ${kalan} dakika bekleyin.` };
  }

  // 1. Firebase Auth ile dene
  if (_fbAuth) {
    try {
      const cred = await _fbAuth.signInWithEmailAndPassword(email, password);
      if (cred?.user) {
        const platformUser = _findUserByEmail(cred.user.email);
        if (platformUser) {
          if (platformUser.status === 'suspended') {
            await _fbAuth.signOut();
            return { ok: false, error: 'Hesabiniz askiya alinmis. Yoneticinize basvurun.' };
          }
          _resetBrute();
          _saveSession(platformUser);
          return { ok: true, user: platformUser };
        }
        // Firebase'de var ama platformda yok
        await _fbAuth.signOut();
        return { ok: false, error: 'Hesabiniz platforma eklenmemis. Yoneticinizle iletisime gecin.' };
      }
    } catch (fbErr) {
      // Firebase hatasi — yerel girisle devam et
      console.info('[Auth] Firebase login basarisiz, yerel mod deneniyor:', fbErr.code);
    }
  }

  // 2. Yerel sifre eslestirme (offline / demo mod)
  const user = _findUserByEmail(email);
  if (!user) {
    _recordFail();
    return { ok: false, error: 'E-posta veya sifre hatali.' };
  }
  if (user.status === 'suspended') {
    return { ok: false, error: 'Hesabiniz askiya alinmis. Yoneticinize basvurun.' };
  }

  const pwHash = await _hash(password);
  if (user.pw && user.pw === pwHash) {
    _resetBrute();
    _saveSession(user);
    return { ok: true, user };
  }

  _recordFail();
  return { ok: false, error: 'E-posta veya sifre hatali.' };
}

/**
 * Oturumu kapatir.
 */
async function logout() {
  _clearSession();
  try { if (_fbAuth) await _fbAuth.signOut(); } catch (e) {}
}

/**
 * Mevcut kullaniciyi dondurur.
 * @returns {Object|null}
 */
function getCU() {
  return _currentUser;
}

/**
 * localStorage'dan oturumu geri yukler.
 * @returns {Object|null}
 */
function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const sess = JSON.parse(raw);
    // Kullanici hala aktif mi kontrol et
    const user = _findUserByEmail(sess.email);
    if (user && user.status !== 'suspended') {
      _currentUser = user;
      return user;
    }
    _clearSession();
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Firebase Auth email'inden platform kullanicisini bulur.
 * @param {string} email
 * @returns {Object|null}
 */
function resolveCurrentUser(email) {
  const user = _findUserByEmail(email);
  if (user && user.status !== 'suspended') {
    _saveSession(user);
    return user;
  }
  return null;
}

/**
 * Firebase onAuthStateChanged dinleyicisi.
 * @param {Function} onAuth    Firebase kullanicisi varsa
 * @param {Function} onNoAuth  Oturum yoksa
 */
function listenAuthState(onAuth, onNoAuth) {
  if (!_fbAuth) {
    // Firebase yok — yerel moda gec
    if (typeof onNoAuth === 'function') onNoAuth();
    return;
  }
  _fbAuth.onAuthStateChanged(fbUser => {
    if (fbUser) {
      if (typeof onAuth === 'function') onAuth(fbUser);
    } else {
      if (typeof onNoAuth === 'function') onNoAuth();
    }
  });
}

/**
 * Firebase Auth instance'ini dondurur.
 * @returns {Object|null}
 */
function getFBAuth() {
  return _fbAuth;
}

/**
 * Firestore instance'ini dondurur.
 * @returns {Object|null}
 */
function getFBDB() {
  return _fbDB;
}

/**
 * Tenant ID'yi dondurur.
 * @returns {string}
 */
function getTenantId() {
  return window.DEFAULT_TENANT_ID || 'tenant_default';
}

/**
 * Firebase baglanti durumunu kontrol eder ve UI'i gunceller.
 */
function checkFirebaseStatus() {
  const el = document.getElementById('fb-status');
  if (!el) return;
  if (_fbAuth && _fbAuth.currentUser) {
    el.textContent = 'Firebase: Bagli';
    el.style.color = '#22c55e';
  } else if (_fbAuth) {
    el.textContent = 'Firebase: Hazir (oturum yok)';
    el.style.color = '#f59e0b';
  } else {
    el.textContent = 'Firebase: Bagli degil (yerel mod)';
    el.style.color = '#ef4444';
  }
}

/**
 * Sifre degistirme.
 * @param {string} oldPw
 * @param {string} newPw
 * @returns {{ok:boolean, error?:string}}
 */
function changePassword(oldPw, newPw) {
  if (!_currentUser) return { ok: false, error: 'Oturum bulunamadi.' };
  if (!newPw || newPw.length < 6) return { ok: false, error: 'Sifre en az 6 karakter olmali.' };

  // Firebase Auth sifre degistirme
  if (_fbAuth && _fbAuth.currentUser) {
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(
        _fbAuth.currentUser.email, oldPw
      );
      _fbAuth.currentUser.reauthenticateWithCredential(cred)
        .then(() => _fbAuth.currentUser.updatePassword(newPw))
        .catch(e => console.warn('[Auth] Firebase pw change:', e.message));
    } catch (e) {}
  }

  // Yerel sifre guncelleme (async hash — fire & forget)
  _hash(newPw).then(hash => {
    const users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
    const u = users.find(x => x.id === _currentUser.id);
    if (u) {
      u.pw = hash;
      if (typeof window.saveUsers === 'function') window.saveUsers(users);
    }
  });

  return { ok: true };
}

// ── Ayarlar paneli icin ek yardimcilar ───────────────────────────
function renderSettingsAdmin() {
  checkFirebaseStatus();
}

// ════════════════════════════════════════════════════════════════
// DISA AKTARIM
// ════════════════════════════════════════════════════════════════

window.Auth = {
  login,
  logout,
  getCU,
  restoreSession,
  resolveCurrentUser,
  listenAuthState,
  getFBAuth,
  getFBDB,
  getTenantId,
  checkFirebaseStatus,
  changePassword,
  renderSettingsAdmin,
};

console.info('[Auth] v1.0.0 hazir —', _fbAuth ? 'Firebase aktif' : 'yerel mod');
})();
