/**
 * ════════════════════════════════════════════════════════════════
 * src/core/auth.js  —  v8.2.1 — Firestore user sync fix
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
// BÖLÜM 0 — ŞİFRE HASH (PBKDF2 + per-user salt)
// ════════════════════════════════════════════════════════════════
// Güvenlik: PBKDF2-SHA256, 100.000 iterasyon, 16 byte random salt
// Format  : "pbkdf2$<salt_hex>$<hash_hex>"
// Geriye uyumluluk: eski SHA-256 (64-char hex) ve plaintext da kabul edilir

/**
 * Şifreyi PBKDF2 ile hash'ler (per-user random salt).
 * @param {string} password
 * @param {string} [saltHex]  — Belirtilmezse yeni random salt üretilir
 * @returns {Promise<string>} "pbkdf2$saltHex$hashHex"
 */
async function _hashPassword(password, saltHex) {
  try {
    const enc    = new TextEncoder();
    // Salt: belirtilmişse kullan, yoksa yeni üret
    let saltBuf;
    if (saltHex) {
      saltBuf = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    } else {
      saltBuf = crypto.getRandomValues(new Uint8Array(16));
    }
    const saltH = Array.from(saltBuf).map(b => b.toString(16).padStart(2,'0')).join('');
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const hashBuf = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations: 100000 },
      keyMaterial, 256
    );
    const hashH = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
    return 'pbkdf2$' + saltH + '$' + hashH;
  } catch (e) {
    // PBKDF2 desteklenmiyor — SHA-256 fallback (eski tarayıcı)
    console.warn('[auth] PBKDF2 desteklenmiyor, SHA-256 fallback.');
    return _hashPasswordLegacy(password);
  }
}

/** Eski SHA-256 hash — migration ve fallback için */
async function _hashPasswordLegacy(password) {
  try {
    const enc  = new TextEncoder();
    const data = enc.encode(password + 'duay_salt_v1');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch (e) {
    return password; // son çare plaintext
  }
}

/**
 * Hash'lenmiş şifreyi doğrular.
 * 3 format desteklenir (geriye uyumluluk):
 *   1. PBKDF2: "pbkdf2$salt$hash"
 *   2. SHA-256: 64-char hex
 *   3. Eski: plaintext
 * @param {string} inputPassword
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
async function _verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return false;

  // Format 1: PBKDF2
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const computed = await _hashPassword(inputPassword, saltHex);
    return computed === storedHash;
  }

  // Format 2: eski SHA-256 (64-char hex) — kabul et, login sonrası upgrade
  if (storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)) {
    const inputHash = await _hashPasswordLegacy(inputPassword);
    return inputHash === storedHash;
  }

  // Format 3: plaintext (çok eski kayıtlar)
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
    // Zaten PBKDF2 formatında mı? Migration gerekmez
    if (stored.startsWith('pbkdf2$')) return;
    // SHA-256 veya plaintext → PBKDF2'ye yükselt
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
    // Safari multi-tab persistence desteklemiyor → synchronizeTabs:false
    // Bu sayede Safari'de 30-40sn gecikme önlenir
    FB_DB.enablePersistence({ synchronizeTabs: false }).catch(function(e) {
      if (e.code === 'failed-precondition') {
        console.warn('[auth] Persistence: birden fazla sekme açık — offline cache devre dışı');
      } else if (e.code === 'unimplemented') {
        console.warn('[auth] Persistence: bu tarayıcı desteklemiyor');
      }
    });
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
  console.log('[AUTH] login başladı. FB_AUTH:', !!FB_AUTH, '| FB_DB:', !!FB_DB);
  // Firebase varsa önce dene
  if (FB_AUTH) {
    try {
      await FB_AUTH.signInWithEmailAndPassword(email, password);
      console.log('[AUTH] Firebase signIn başarılı. currentUser:', FB_AUTH.currentUser?.email);
      // Firebase başarılı — CU'yu platform tablosundan çöz
      const fbEmail = FB_AUTH.currentUser?.email || email;
      return await _localLogin(fbEmail, password, true); // skipPwCheck=true
    } catch (e) {
      console.warn('[AUTH] Firebase signIn başarısız:', e.code, '→ yerel login deneniyor');
      // Firebase başarısız → yerel dene
      const local = await _localLogin(email, password);
      if (local.ok) { console.log('[AUTH] Yerel login başarılı (Firebase Auth token YOK)'); return local; }
      return { ok: false, error: _translateFirebaseError(e.code) };
    }
  }
  console.warn('[AUTH] FB_AUTH yok → direkt yerel login');
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

    // DEBUG: admin giriş sorunu tespiti
    var _adminCheck = users.find(function(u) { return u.email && u.email.toLowerCase() === 'duayft@gmail.com'; });
    console.log('[AUTH:DEBUG] users count:', users.length, '| admin kaydı:', _adminCheck ? JSON.stringify({id:_adminCheck.id, role:_adminCheck.role, status:_adminCheck.status, autoCreated:_adminCheck.autoCreated}) : 'YOK');

    if (skipPwCheck) {
      // Firebase doğruladı — e-posta ile bul (status filtresi YOK — inactive da olsa bul)
      user = users.find(u =>
        u.email && u.email.toLowerCase() === email.toLowerCase()
      );

      // Bulunan kullanıcı inactive/suspended ise otomatik kurtarma
      // Firebase Auth başarılı = kullanıcı gerçek ve yetkili
      if (user && user.status !== 'active') {
        console.info('[auth] Kullanıcı kurtarılıyor:', user.email, 'status:', user.status, '→ active');
        user.status = 'active';
        delete user._fbSyncNote;
        delete user._fbSyncAt;
        delete user.isDeleted;
        // Tüm kullanıcı listesini güncelle ve FIRESTORE'A DA YAZ
        try {
          if (typeof window.saveUsers === 'function') window.saveUsers(users);
          else if (typeof saveUsers === 'function') saveUsers(users);
        } catch(e) {}
        console.info('[auth] Kurtarma tamamlandı — Firestore\'a da yazıldı');
      }

      // Kullanıcı localStorage'da yoksa — yeni cihaz veya temiz tarayıcı
      if (!user) {
        try {
          const fbDB = FB_DB;
          if (fbDB) {
            const tid = TENANT_ID.replace(/[^a-zA-Z0-9_]/g,'_');
            const docPath = 'duay_' + tid;
            console.info('[auth] Firestore verisinden users cekiliyor:', docPath + '/users');
            const snap = await fbDB.collection(docPath).doc('users').get();
            if (snap.exists) {
              const remoteUsers = snap.data()?.data;
              if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
                try { localStorage.setItem('ak_u3', JSON.stringify(remoteUsers)); } catch(e) {}
                if (window._cache) window._cache['users'] = remoteUsers;
                // Status filtresi olmadan bul
                user = remoteUsers.find(u =>
                  u.email && u.email.toLowerCase() === email.toLowerCase()
                );
                // Inactive/bozuk status ise kurtarma — Firestore'a da yaz
                if (user && user.status !== 'active') {
                  console.info('[auth] Firestore kullanıcı kurtarılıyor:', user.email, 'status:', user.status);
                  user.status = 'active';
                  delete user._fbSyncNote;
                  delete user._fbSyncAt;
                  delete user.isDeleted;
                  try { localStorage.setItem('ak_u3', JSON.stringify(remoteUsers)); } catch(e) {}
                  // Firestore'a geri yaz — bozuk veriyi düzelt
                  try {
                    var _syncPayload = { data: remoteUsers, syncedAt: new Date().toISOString() };
                    fbDB.collection(docPath).doc('users').set(_syncPayload, { merge: true });
                    console.info('[auth] Firestore users düzeltildi');
                  } catch(e2) {}
                }
                console.info('[auth] Kullanıcılar Firestore\'tan yüklendi (' + remoteUsers.length + ')');
              }
            }
          }
        } catch(e) {
          console.warn('[auth] Firestore kullanıcı çekme hatası:', e);
        }

        // Hâlâ bulunamadıysa — Firebase hesabından otomatik staff kullanıcı oluştur
        if (!user) {
          const fbUser = FB_AUTH?.currentUser;
          if (fbUser) {
            user = {
              id: generateNumericId(),
              name: fbUser.displayName || email.split('@')[0],
              email: email.toLowerCase(),
              role: 'staff',
              status: 'active',
              modules: null,
              access: [],
              pw: '',
              createdAt: new Date().toISOString().slice(0,10),
              autoCreated: true
            };
            try {
              const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : []);
              allUsers.push(user);
              if (typeof window.saveUsers === 'function') window.saveUsers(allUsers);
              console.info('[auth] Yeni kullanıcı otomatik oluşturuldu:', email);
            } catch(e) { console.warn('[auth] Kullanıcı oluşturma hatası:', e); }
          }
        }
      }
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
    // Realtime sync _finishLogin'den başlatılır — burada ÇAĞIRMA (duplike olur)
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

async function resolveCurrentUser(email) {
  try {
    const loadFn = (typeof window !== 'undefined' && typeof window.loadUsers === 'function')
      ? window.loadUsers
      : (typeof loadUsers === 'function' ? loadUsers : null);
    if (!loadFn) return null;
    let users = loadFn();
    let user  = users.find(u =>
      u.email && u.email.toLowerCase() === email.toLowerCase() && u.status === 'active'
    );
    // S6: Firestore fallback — localStorage'da yoksa Firestore'dan çek
    if (!user && FB_DB) {
      try {
        const tid = TENANT_ID.replace(/[^a-zA-Z0-9_]/g, '_');
        const snap = await FB_DB.collection('duay_' + tid).doc('users').get();
        if (snap.exists) {
          const remoteUsers = snap.data()?.data;
          if (Array.isArray(remoteUsers) && remoteUsers.length) {
            try { localStorage.setItem('ak_u3', JSON.stringify(remoteUsers)); } catch(e) {}
            user = remoteUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase() && u.status === 'active');
            console.info('[auth] resolveCurrentUser: Firestore fallback kullanıldı');
          }
        }
      } catch(e) { console.warn('[auth] resolveCurrentUser Firestore fallback:', e.message); }
    }
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
      id: (typeof generateNumericId==='function'?generateNumericId():Date.now()), type,
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
// GOOGLE SSO
// ════════════════════════════════════════════════════════════════

async function loginWithGoogle() {
  if (!FB_AUTH) { window.toast?.('Firebase baglantisi gerekli', 'err'); return; }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await FB_AUTH.signInWithPopup(provider);
    if (result?.user) {
      const localResult = await _localLogin(result.user.email, '', true);
      if (localResult.ok) {
        // Onboarding kontrolu
        if (!localResult.user.onboardingDone) _showOnboarding(localResult.user);
        return localResult;
      }
    }
    return { ok: false, error: 'Google girisi basarisiz' };
  } catch(e) {
    if (e.code === 'auth/popup-closed-by-user') return { ok: false, error: '' };
    console.warn('[auth] Google SSO:', e.message);
    return { ok: false, error: _translateFirebaseError(e.code) || e.message };
  }
}

// ════════════════════════════════════════════════════════════════
// ONBOARDING SIHIRBAZI (3 adim)
// ════════════════════════════════════════════════════════════════

function _showOnboarding(user) {
  if (user.onboardingDone) return;
  const AVATARS = ['#7C3AED','#0369A1','#D97706','#DC2626','#059669','#DB2777','#2563EB','#EA580C'];
  const DEPTS = ['IK','Finans','Operasyon','Satis','Lojistik','Teknik','Muhasebe','Yonetim'];
  let step = 1, selColor = user.color || AVATARS[0], selDept = user.dept || '';

  function render() {
    const old = document.getElementById('mo-onboarding'); if (old) old.remove();
    const mo = document.createElement('div');
    mo.className='mo open'; mo.id='mo-onboarding'; mo.style.zIndex='9999';
    const dots = [1,2,3].map(i=>`<div style="width:${i===step?'24px':'8px'};height:8px;border-radius:4px;background:${i===step?'var(--ac)':'var(--b)'};transition:all .2s"></div>`).join('');

    let content = '';
    if (step===1) {
      content = `<div style="text-align:center;margin-bottom:16px"><div style="font-size:16px;font-weight:700;color:var(--t)">Avatar Secin</div><div style="font-size:12px;color:var(--t3)">Profilinizi kisisellestirilmis</div></div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">${AVATARS.map(c=>`<button onclick="window._obSelColor='${c}';window._obRender()" style="width:48px;height:48px;border-radius:14px;background:${c};border:3px solid ${selColor===c?'var(--t)':'transparent'};cursor:pointer;font-size:18px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;transition:all .15s">${(user.name||'?')[0]}</button>`).join('')}</div>`;
    } else if (step===2) {
      content = `<div style="text-align:center;margin-bottom:16px"><div style="font-size:16px;font-weight:700;color:var(--t)">Departman Secin</div><div style="font-size:12px;color:var(--t3)">Hangi ekiptesiniz?</div></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${DEPTS.map(d=>`<button onclick="window._obSelDept='${d}';window._obRender()" style="padding:10px;border-radius:8px;border:1.5px solid ${selDept===d?'var(--ac)':'var(--b)'};background:${selDept===d?'var(--al)':'var(--sf)'};cursor:pointer;font-size:12px;font-weight:500;color:${selDept===d?'var(--ac)':'var(--t)'};font-family:inherit;transition:all .12s">${d}</button>`).join('')}</div>`;
    } else {
      content = `<div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">🎉</div><div style="font-size:18px;font-weight:700;color:var(--t);margin-bottom:6px">Hazirsiniz!</div><div style="font-size:13px;color:var(--t3)">Platformu kesfetmeye baslayin</div></div>`;
    }

    mo.innerHTML = `<div class="moc" style="max-width:420px;padding:0;border-radius:16px;overflow:hidden">
      <div style="padding:24px 24px 16px">${content}</div>
      <div style="padding:12px 24px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;gap:4px">${dots}</div>
        <div style="display:flex;gap:8px">
          ${step>1?`<button class="btn btns" onclick="window._obStep=${step-1};window._obRender()">Geri</button>`:''}
          <button class="btn btnp" onclick="window._obNext()">${step===3?'Baslayalim':'Devam'}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(mo);
  }

  window._obSelColor = selColor;
  window._obSelDept = selDept;
  window._obStep = step;
  window._obRender = () => { selColor=window._obSelColor; selDept=window._obSelDept; step=window._obStep; render(); };
  window._obNext = () => {
    if (step < 3) { step++; window._obStep=step; render(); return; }
    // Kaydet
    const users = typeof window.loadUsers==='function' ? window.loadUsers() : [];
    const u = users.find(x=>x.id===user.id);
    if (u) { u.color=selColor; u.dept=selDept; u.onboardingDone=true; if(typeof window.saveUsers==='function') window.saveUsers(users); }
    if (CU) { CU.color=selColor; CU.dept=selDept; CU.onboardingDone=true; }
    document.getElementById('mo-onboarding')?.remove();
    window.toast?.('Profiliniz hazirlandi', 'ok');
  };
  render();
}

// ════════════════════════════════════════════════════════════════
// IP BAZLI ERISIM KISITLAMA
// ════════════════════════════════════════════════════════════════

const IP_WHITELIST_KEY = 'ak_ip_whitelist';

function _loadIpWhitelist() {
  try { return JSON.parse(localStorage.getItem(IP_WHITELIST_KEY)||'{"enabled":false,"ips":[]}'); }
  catch { return {enabled:false,ips:[]}; }
}
function _storeIpWhitelist(d) { localStorage.setItem(IP_WHITELIST_KEY, JSON.stringify(d)); }

async function checkIpAccess() {
  const wl = _loadIpWhitelist();
  if (!wl.enabled || !wl.ips.length) return true;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    const userIp = data.ip;
    if (wl.ips.includes(userIp)) return true;
    window.toast?.('Bu IP adresinden erisim engellendi: '+userIp, 'err');
    return false;
  } catch(e) {
    console.warn('[auth] IP kontrolu basarisiz:', e.message);
    return true; // API hatasi durumunda izin ver
  }
}

function openIpWhitelistModal() {
  if (!isAdmin()) return;
  const wl = _loadIpWhitelist();
  const old = document.getElementById('mo-ip-wl'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-ip-wl'; mo.style.zIndex='2100';
  mo.innerHTML = `<div class="moc" style="max-width:420px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">IP Erisim Kisitlama</div>
    </div>
    <div style="padding:16px 20px">
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">
        <input type="checkbox" id="ip-wl-enabled" ${wl.enabled?'checked':''} style="accent-color:var(--ac);width:18px;height:18px">
        <div><div style="font-size:13px;font-weight:500;color:var(--t)">IP Kisitlama Aktif</div>
        <div style="font-size:10px;color:var(--t3)">Kapali iken tum IP'lere izin verilir</div></div>
      </label>
      <div class="fg"><div class="fl">IZIN VERILEN IP'LER</div>
        <textarea class="fi" id="ip-wl-list" rows="4" style="font-family:'DM Mono',monospace;font-size:12px" placeholder="192.168.1.1&#10;10.0.0.1&#10;Her satira bir IP">${(wl.ips||[]).join('\\n')}</textarea>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-ip-wl').remove()">Iptal</button>
      <button class="btn btnp" onclick="window._saveIpWl()">Kaydet</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window._saveIpWl = function() {
  const enabled = document.getElementById('ip-wl-enabled')?.checked || false;
  const raw = (document.getElementById('ip-wl-list')?.value || '').trim();
  const ips = raw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  _storeIpWhitelist({ enabled, ips });
  document.getElementById('mo-ip-wl')?.remove();
  window.toast?.('IP ayarlari kaydedildi', 'ok');
};

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Auth = {
  initFirebase, listenAuthState,
  login, loginWithGoogle, logout, resolveCurrentUser, restoreSession, changePassword,
  isAdmin, canAccess, checkFirebaseStatus, checkIpAccess,
  getCU:       () => CU,
  getFBAuth:   () => FB_AUTH,
  getFBDB:     () => FB_DB,
  getTenantId: () => TENANT_ID,
  logAction:   _logEntry,
  openIpWhitelist: openIpWhitelistModal,
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
