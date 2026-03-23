/**
 * ════════════════════════════════════════════════════════════════
 * src/core/auth.js  —  v8.0.1  (login-fix)
 * Firebase Auth + Yerel Fallback + Multi-tenant + Oturum Yönetimi
 *
 * v8.0.1 düzeltmeleri:
 *   - Object.defineProperty çakışması kaldırıldı (auth.js crash'i)
 *   - _localLogin CU referansını doğrudan döndürüyor
 *   - window.Auth her koşulda atanıyor
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 0 — ŞİFRE HASH (SHA-256 + SubtleCrypto)
// ════════════════════════════════════════════════════════════════

/**
 * Şifreyi SHA-256 ile hash'ler.
 * @param {string} password
 * @returns {Promise<string>} hex string
 */
async function _hashPassword(password) {
  try {
    const encoder = new TextEncoder();
    const data    = encoder.encode(password + 'duay_salt_v1'); // uygulama salt
    const hash    = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    // SubtleCrypto yoksa (eski tarayıcı) plaintext'e düş
    console.warn('[auth] SubtleCrypto yok, plaintext mod.');
    return password;
  }
}

/**
 * Hash'lenmiş şifreyi doğrular.
 * Eski plaintext kayıtlarla da geriye dönük uyumlu.
 * @param {string} inputPassword  — kullanıcının girdiği şifre
 * @param {string} storedHash     — kayıttaki hash veya eski plaintext
 * @returns {Promise<boolean>}
 */
async function _verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return false;
  // Yeni format: 64 karakter hex (SHA-256)
  if (storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)) {
    const inputHash = await _hashPassword(inputPassword);
    return inputHash === storedHash;
  }
  // Eski format: plaintext — kabul et ve migration flag koy
  return inputPassword === storedHash;
}

/**
 * Plaintext şifresi olan kullanıcıyı hash'e migrate eder.
 * Login başarılıysa arka planda otomatik çalışır.
 * @param {Object} user
 * @param {string} plainPassword
 */
async function _migratePasswordHash(user, plainPassword) {
  try {
    const stored = user.pw || user.password || '';
    // Zaten hash'lenmiş mi?
    if (stored.length === 64 && /^[0-9a-f]+$/.test(stored)) return;
    // Plaintext → hash'e çevir
    const hash = await _hashPassword(plainPassword);
    user.pw = hash;
    if (user.password !== undefined) user.password = hash;
    const saveFn = (typeof window.saveUsers === 'function') ? window.saveUsers : null;
    if (saveFn) {
      const users = (typeof window.loadUsers === 'function') ? window.loadUsers() : [];
      const idx   = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx] = user; saveFn(users); }
    }
    console.info('[auth] Sifre hash migrate edildi:', user.email);
  } catch (e) {
    console.warn('[auth] Migration hatası:', e);
  }
}


let CU      = null;
let FB_APP  = null;
let FB_AUTH = null;
let FB_DB   = null;

let TENANT_ID = (typeof FirebaseConfig !== 'undefined')
  ? (FirebaseConfig.tenantId || 'tenant_default')
  : 'tenant_default';

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — FIREBASE BAŞLATMA
// ════════════════════════════════════════════════════════════════

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.info('[auth] Firebase SDK yok — yerel mod aktif.');
      return;
    }
    const cfg = (typeof FirebaseConfig !== 'undefined') ? FirebaseConfig.config : null;
    if (!cfg || !cfg.apiKey) {
      console.warn('[auth] Firebase config eksik — yerel mod kullanılıyor.');
      return;
    }
    FB_APP  = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
    FB_AUTH = firebase.auth();
    FB_DB   = firebase.firestore();
    FB_DB.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    console.info('[auth] Firebase başlatıldı. Tenant:', TENANT_ID);
    // Offline-First: Persistence aktif et
    const FB_DB_TEMP = window.firebase?.firestore?.();
    if (FB_DB_TEMP && typeof window.initFirebasePersistence === 'function') {
      window.initFirebasePersistence(FB_DB_TEMP);
    }
  } catch (e) {
    console.error('[auth] Firebase başlatma hatası:', e);
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — AUTH STATE DİNLEYİCİ
// ════════════════════════════════════════════════════════════════

function listenAuthState(onIn, onOut) {
  if (FB_AUTH) {
    FB_AUTH.onAuthStateChanged(u => u ? onIn(u) : onOut());
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — GİRİŞ
// ════════════════════════════════════════════════════════════════

async function login(email, password) {
  // Firebase varsa önce dene
  if (FB_AUTH) {
    try {
      await FB_AUTH.signInWithEmailAndPassword(email, password);
      // Firebase başarılı — CU'yu platform tablosundan çöz
      const fbEmail = FB_AUTH.currentUser?.email || email;
      return await _localLogin(fbEmail, password, true); // skipPwCheck=true
    } catch (e) {
      // Firebase başarısız → yerel dene
      const local = await _localLogin(email, password);
      if (local.ok) return local;
      return { ok: false, error: _translateFirebaseError(e.code) };
    }
  }
  // Firebase yok → direkt yerel
  return await _localLogin(email, password);
}

/**
 * Yerel kullanıcı tablosuna karşı doğrulama.
 * @param {string}  email
 * @param {string}  password
 * @param {boolean} [skipPwCheck=false]  Firebase başarılıysa şifre kontrolü atla
 * @returns {{ok:boolean, user?:Object, error?:string}}
 */
async function _localLogin(email, password, skipPwCheck = false) {
  try {
    // loadUsers güvenli erişim: database.js bu dosyadan ÖNCE yüklenir
    const loadFn = (typeof window !== 'undefined' && typeof window.loadUsers === 'function')
      ? window.loadUsers
      : (typeof loadUsers === 'function' ? loadUsers : null);

    if (!loadFn) {
      console.warn('[auth] loadUsers bulunamadı.');
      return { ok: false, error: 'Veri katmanı hazır değil.' };
    }

    const users = loadFn();
    let user;

    if (skipPwCheck) {
      // Firebase doğruladı — sadece e-posta eşleşmesi yeterli
      user = users.find(u =>
        u.email && u.email.toLowerCase() === email.toLowerCase() &&
        u.status === 'active'
      );
    } else {
      // Yerel doğrulama — hash veya plaintext (geriye dönük uyumlu)
      const _matchingUsers = users.filter(u =>
        u.email && u.email.toLowerCase() === email.toLowerCase()
      );
      for (const u of _matchingUsers) {
        const stored = u.pw || u.password || '';
        const match  = await _verifyPassword(password, stored);
        if (match) { user = u; break; }
      }
    }

    if (!user)                       return { ok: false, error: 'E-posta veya şifre hatalı.' };
    if (user.status === 'suspended') return { ok: false, error: 'Hesabınız askıya alınmış.' };
    if (user.status !== 'active')    return { ok: false, error: 'Hesabınız aktif değil.' };

    CU = user;
    _persistSession(user);
    _logEntry('login', `Giriş: ${user.name}`);
    // Arka planda şifreyi hash'e migrate et (plaintext ise)
    if (!skipPwCheck) _migratePasswordHash(user, password);
    // Realtime sync başlat (Firebase varsa)
    setTimeout(() => window.DB?.startRealtimeSync?.(), 500);
    // user nesnesini de döndür — app.js doğrudan kullansın
    return { ok: true, user };
  } catch (e) {
    console.error('[auth] _localLogin hatası:', e);
    return { ok: false, error: 'Giriş hatası: ' + e.message };
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — KULLANICI ÇÖZÜMLEME
// ════════════════════════════════════════════════════════════════

function resolveCurrentUser(email) {
  try {
    const loadFn = (typeof window !== 'undefined' && typeof window.loadUsers === 'function')
      ? window.loadUsers
      : (typeof loadUsers === 'function' ? loadUsers : null);
    if (!loadFn) return null;
    const users = loadFn();
    const user  = users.find(u =>
      u.email && u.email.toLowerCase() === email.toLowerCase() && u.status === 'active'
    );
    if (user) { CU = user; _persistSession(user); _logEntry('login', `Firebase: ${user.name}`); }
    return user || null;
  } catch (e) {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ÇIKIŞ
// ════════════════════════════════════════════════════════════════

async function logout() {
  if (CU) _logEntry('logout', `Çıkış: ${CU.name}`);
  _clearSession();
  CU = null;
  // Realtime listener'ları durdur
  window.DB?.stopRealtimeSync?.();
  if (FB_AUTH) { try { await FB_AUTH.signOut(); } catch (e) {} }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — OTURUM GERİ YÜKLEME
// ════════════════════════════════════════════════════════════════

function restoreSession() {
  try {
    const raw = localStorage.getItem('ak_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || Date.now() - s.ts > 8 * 3600000) { _clearSession(); return null; }
    const loadFn = (typeof window !== 'undefined' && typeof window.loadUsers === 'function')
      ? window.loadUsers : (typeof loadUsers === 'function' ? loadUsers : null);
    if (!loadFn) return null;
    const users = loadFn();
    const user  = users.find(u => u.id === s.uid && u.status === 'active');
    if (user) CU = user;
    return user || null;
  } catch (e) { return null; }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — ŞİFRE DEĞİŞTİRME
// ════════════════════════════════════════════════════════════════

async function changePassword(oldPwd, newPwd) {
  if (!CU) return { ok: false, error: 'Oturum yok.' };
  if (!newPwd || newPwd.length < 6) return { ok: false, error: 'En az 6 karakter giriniz.' };
  if (!oldPwd) return { ok: false, error: 'Mevcut şifrenizi girin.' };

  const loadFn = (typeof window.loadUsers === 'function') ? window.loadUsers : null;
  const saveFn = (typeof window.saveUsers === 'function') ? window.saveUsers : null;
  if (!loadFn || !saveFn) return { ok: false, error: 'Veri katmanı hazır değil.' };

  const users = loadFn();
  const user  = users.find(u => u.id === CU.id);
  if (!user) return { ok: false, error: 'Kullanıcı bulunamadı.' };

  // Firebase aktifse — Firebase üzerinden doğrula (re-authenticate)
  const fbUser = FB_AUTH?.currentUser;
  if (fbUser) {
    try {
      // Firebase re-authentication
      const credential = firebase.auth.EmailAuthProvider.credential(fbUser.email, oldPwd);
      await fbUser.reauthenticateWithCredential(credential);
      // Firebase doğruladı — yerel şifre kontrolünü atla
    } catch (fbErr) {
      // Firebase hata kodu → Türkçe mesaj
      const fbMsg = {
        'auth/wrong-password':        'Mevcut şifre hatalı.',
        'auth/invalid-credential':    'Mevcut şifre hatalı.',
        'auth/too-many-requests':     'Çok fazla deneme. Lütfen bekleyin.',
        'auth/network-request-failed':'Ağ hatası. İnternetinizi kontrol edin.',
      }[fbErr.code] || 'Mevcut şifre hatalı.';
      return { ok: false, error: fbMsg };
    }
  } else {
    // Firebase yok — yerel doğrulama
    const currentPw = user.pw || user.password || '';
    const pwMatch   = currentPw
      ? await _verifyPassword(oldPwd, currentPw)
      : true; // pw hiç set edilmemişse geç — Firebase kullanıcısı
    if (!pwMatch) return { ok: false, error: 'Mevcut şifre hatalı.' };
  }

  // Yeni şifreyi hash'le ve kaydet
  const newHash = await _hashPassword(newPwd);
  user.pw = newHash;
  user.password = newHash;
  CU.pw = newHash;
  saveFn(users);

  // Firebase şifresini de güncelle
  if (fbUser) {
    try {
      await fbUser.updatePassword(newPwd);
    } catch (e) {
      console.warn('[auth] Firebase şifre güncelleme:', e.message);
      // Yerel güncelleme başarılı oldu, Firebase kısmı uyarı
      _logEntry('passwordChange', 'Şifre değiştirildi (Firebase güncelleme başarısız: ' + e.message + ')');
      return { ok: true, warning: "Firebase sifre guncellenemedi: " + e.message };
    }
  }

  _logEntry('passwordChange', 'Şifre başarıyla değiştirildi');
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — YETKİ KONTROL
// ════════════════════════════════════════════════════════════════

function isAdmin()           { return CU?.role === 'admin'; }
function canAccess(moduleId) {
  if (!CU) return false;
  if (isAdmin()) return true;
  if (!Array.isArray(CU.modules)) return true;
  return CU.modules.includes(moduleId);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — FİREBASE DURUM ROZETİ
// ════════════════════════════════════════════════════════════════

function checkFirebaseStatus(badgeId = 'fb-status-badge', infoId = 'fb-auth-info') {
  const badge = document.getElementById(badgeId);
  const info  = document.getElementById(infoId);
  if (!badge) return;
  const fbUser = FB_AUTH?.currentUser;
  if (fbUser) {
    badge.textContent = '✅ Bağlı'; badge.className = 'badge bg';
    if (info) info.textContent = `Giriş: ${fbUser.email} (${fbUser.uid.slice(0,8)}…)`;
  } else {
    badge.textContent = '⚠️ Bağlantı yok'; badge.className = 'badge ba';
    if (info) info.textContent = 'Firebase oturumu yok.';
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — İÇ YARDIMCILAR
// ════════════════════════════════════════════════════════════════

function _persistSession(u) {
  try {
    localStorage.setItem('ak_session', JSON.stringify({
      uid: u.id, email: u.email, tenantId: TENANT_ID, ts: Date.now()
    }));
  } catch (e) {}
}

function _clearSession() {
  ['ak_session','ak_session_entry_ms','ak_session_ts'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });
}

function _logEntry(type, message) {
  try {
    const KEY  = 'ak_activity_v1';
    const logs = JSON.parse(localStorage.getItem(KEY) || '[]');
    logs.unshift({
      id: Date.now(), type,
      uid: CU?.id || 0, uname: CU?.name || 'Sistem',
      message, ts: new Date().toISOString().slice(0,19).replace('T',' '),
      tenantId: TENANT_ID,
    });
    localStorage.setItem(KEY, JSON.stringify(logs.slice(0, 2000)));
    if (FB_DB && window.FirebaseConfig?.paths) {
      FB_DB.collection(window.FirebaseConfig.paths.logs(TENANT_ID))
        .add({ type, uid: CU?.id, uname: CU?.name, message,
               ts: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(() => {});
    }
  } catch (e) {}
}

function _translateFirebaseError(code) {
  const M = {
    'auth/user-not-found'        : 'E-posta veya şifre hatalı.',
    'auth/wrong-password'        : 'Şifre hatalı.',
    'auth/invalid-email'         : 'Geçersiz e-posta.',
    'auth/user-disabled'         : 'Hesap askıya alınmış.',
    'auth/too-many-requests'     : 'Çok fazla deneme. Bekleyin.',
    'auth/network-request-failed': 'Ağ hatası.',
    'auth/invalid-credential'    : 'Geçersiz kimlik bilgileri.',
  };
  return M[code] || `Giriş hatası (${code}).`;
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Auth = {
  initFirebase, listenAuthState,
  login, logout, resolveCurrentUser, restoreSession, changePassword,
  isAdmin, canAccess, checkFirebaseStatus,
  getCU:       () => CU,
  getFBAuth:   () => FB_AUTH,
  getFBDB:     () => FB_DB,
  getTenantId: () => TENANT_ID,
  logAction:   _logEntry,
};

// Firebase başlat
initFirebase();

// ── Dışa aktar — window.Auth MUTLAKA atanmalı ────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
} else {
  window.Auth      = Auth;
  window.isAdmin   = isAdmin;
  window.canAccess = canAccess;
  // NOT: Object.defineProperty KULLANILMIYOR — crash'e yol açıyordu.
  // FB_AUTH ve FB_DB artık Auth.getFBAuth() / Auth.getFBDB() ile alınır.
}
