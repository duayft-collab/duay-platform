/**
 * ═══════════════════════════════════════════════════════════════
 * src/core/app.js  —  v8.0.0
 * Operasyon Platformu — Ana Uygulama Motoru
 *
 * Sorumluluklar:
 *   1. App.init()      — sayfa yükleme, Auth state, tema, dil
 *   2. App.nav()       — panel yönlendirme + yetki guard
 *   3. UI yardımcıları — toast, openMo, closeMo, toggleSidebar
 *   4. Profil paneli   — renderProfilePanel, saveProfile
 *   5. Bildirimler     — toggleNotifPanel, markAllNotifRead
 *   6. Global arama    — openGSearch, doGSearch (Ctrl+K)
 *   7. Canlı saat      — tickClock (footer dinamik, login statik)
 *   8. Pinbar          — renderPinbar, openPinModal
 *   9. Sistem bildirimleri — generateSystemNotifs
 *  10. PDF raporu      — printModuleReport
 *  11. Sürüm geçmişi  — updateVersionUI, CHANGELOG
 *
 * Anayasa Kural 1 : i18n TR+EN, gece/gündüz tema
 * Anayasa Kural 3 : Her login/logout logActivity ile kayıt
 * Anayasa Kural 5 : Login versiyon STATIK, footer saati DİNAMİK
 *
 * Bağımlılıklar (bu dosyadan önce yüklenmiş olmalı):
 *   config/firebase.js → src/i18n/translations.js
 *   src/core/database.js → src/core/auth.js
 *   src/modules/*.js
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// Zaman yardımcıları (database.js'den de erişilebilir)

// ── Global Yardımcılar — tüm modüller bu fonksiyonlara window üzerinden erişir ──
window.g        = id  => document.getElementById(id);
window.st       = (id, v) => { const el = window.g(id); if (el) el.textContent = v; };
window.CU       = () => window.Auth?.getCU?.();
window.isAdmin  = () => window.Auth?.getCU?.()?.role === 'admin';
window.initials = name => (name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'?';
// AVC — Avatar renk paleti, pusula.js ve diğer modüller tarafından kullanılır
// app.js'den ÖNCE yüklenen modüller için buraya erken export yapılır
window.AVC = [
  ['#EEEDFE','#26215C'], ['#E1F5EE','#085041'],
  ['#E6F1FB','#0C447C'], ['#FAECE7','#993C1D'],
  ['#EAF3DE','#27500A'], ['#FAEEDA','#854F0B'],
  ['#FBEAF0','#72243E'], ['#F1EFE8','#2C2C2A'],
];


// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — SABITLER & DURUM
// ════════════════════════════════════════════════════════════════

/** Anayasa Kural 5 — bu versiyon hiçbir zaman runtime'da değişmez */
const APP_VER   = '8.0.0';
const APP_BUILD = '2026-03-19 14:50';

/** CHANGELOG — Sürüm Geçmişi */
const CHANGELOG = [
  { v:'8.0.0', ts:'2026-03-19 14:50', note:'Tam modüler mimari: database.js, auth.js, pusula.js, kargo.js, pirim.js, admin.js ayrıştırıldı. DocumentFragment performans iyileştirmesi.' },
  { v:'7.6.0', ts:'2026-03-19 12:00', note:'app.js modülerleştirildi, GlobalErrorHandler entegrasyonu, multi-tenant Firebase hazırlığı.' },
  { v:'4.1.0', ts:'2026-03-18 14:30', note:'Takvim performans, 15 form, Fuar kriter motoru, Temizlik rutinleri, Yetkilendirme yenileme.' },
  { v:'3.0.0', ts:'2026-03-16 22:00', note:'KPI & Personel Performans Paneli — haftalık/aylık/yıllık skor, liderlik tablosu, Excel+PDF.' },
  { v:'2.9.1', ts:'2026-03-16 21:00', note:'Güvenlik: demo şifreler silindi, sadece Firebase Auth.' },
  { v:'2.9.0', ts:'2026-03-16 20:00', note:'Sidebar tamamen yeniden gruplandı, toggle düzeltildi.' },
  { v:'2.5.0', ts:'2026-03-15 11:00', note:'İzin, Tebligat, Pirim SOP 2025, Konteyner, Firebase entegrasyonu.' },
  { v:'1.0.0', ts:'2026-03-14 09:00', note:'İlk sürüm: Dashboard, Kullanıcılar, Dökümanlar.' },
];

/** Tüm platform modülleri — RBAC için kayıt noktası */
const ALL_MODULES = [
  { id:'dashboard',  label:'Dashboard'           },
  { id:'announce',   label:'Duyurular'            },
  { id:'pusula',     label:'Görevler'             },
  { id:'puantaj',    label:'Puantaj'              },
  { id:'takvim',     label:'Takvim'               },
  { id:'notes',      label:'Notlar'               },
  { id:'links',      label:'Hızlı Linkler'        },
  { id:'hedefler',   label:'Hedefler'             },
  { id:'odemeler',   label:'Rutin Ödemeler'       },
  { id:'kargo',      label:'Kargo'                },
  { id:'stok',       label:'Stok'                 },
  { id:'ik',         label:'İK Yönetimi'          },
  { id:'izin',       label:'İzin Yönetimi'        },
  { id:'tebligat',   label:'Tebligat Takibi'      },
  { id:'evrak',      label:'Personel Evrak'       },
  { id:'arsiv',      label:'Şirket Arşivi'        },
  { id:'kpi',        label:'KPI & Performans'     },
  { id:'crm',        label:'CRM / Müşteriler'     },
  { id:'numune',     label:'Numune Arşivi'        },
  { id:'temizlik',   label:'Temizlik Kontrol'     },
  { id:'resmi',      label:'Resmi Evrak'          },
  { id:'etkinlik',   label:'Etkinlik / Fuar'      },
  { id:'pirim',      label:'Prim Yönetimi'        },
  { id:'rehber',     label:'Acil Rehber'          },
  { id:'settings',   label:'Ayarlar'              },
  { id:'admin',      label:'Kullanıcı Yönetimi'   },
];

/** Rol bazlı varsayılan modül erişimleri */
const ROLE_DEFAULT_MODULES = {
  admin:   ALL_MODULES.map(m => m.id),
  manager: ['dashboard','announce','pusula','puantaj','takvim','notes','links','hedefler','odemeler','kargo','stok','ik','izin','tebligat','evrak','arsiv','crm','numune','resmi','etkinlik','pirim','rehber','settings'],
  lead:    ['dashboard','announce','pusula','puantaj','takvim','notes','links','hedefler','kargo','stok','ik','izin','evrak','numune','etkinlik','pirim','rehber'],
  staff:   ['dashboard','announce','pusula','takvim','notes','links','izin','pirim'],
};

/** Admin-only paneller */
const ADMIN_ONLY_PANELS = ['admin','activity','ceo','kpi-panel','trash'];

// Uygulama durumu
let _DARK      = localStorage.getItem('ak_theme') === 'dark';
let _LANG      = localStorage.getItem('ak_lang')  || 'tr';
let _GS_SEL    = -1;
let _IDLE_TIMER= null;
let _toastTimer= null;

// Avatar renk paleti (shared) — window.AVC yukarıda erken export edildi, burada sync
const AVC = window.AVC;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════════

const _g  = window.g;
const _st = (id, v) => { const el = _g(id); if (el) el.textContent = v; };
const _p2 = n   => String(n).padStart(2, '0');

/** İsimden baş harfler */
const initials = window.initials;

/** 'YYYY-MM-DD HH:MM:SS' formatında şu anki zaman */

/** Sayıyı 2 haneli string'e çevirir */

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — YETKİ KONTROLÜ
// ════════════════════════════════════════════════════════════════

/**
 * Aktif kullanıcının belirtilen modüle erişimi var mı?
 * @param {string} modId
 * @returns {boolean}
 */
function canModule(modId) {
  const cu = window.Auth?.getCU?.();
  if (!cu) return false;
  if (cu.role === 'admin' || cu.modules === null) return true;
  const mods = cu.modules || ROLE_DEFAULT_MODULES[cu.role] || ROLE_DEFAULT_MODULES.staff;
  return mods.includes(modId);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — CANLISAAT (Anayasa Kural 5)
// ════════════════════════════════════════════════════════════════

/**
 * Saat güncelleyici — saniye başı çalışır.
 *
 * Anayasa Kural 5:
 *   • Login ekranındaki versiyon (#l-pf) → STATIK → bu fonksiyon dokunmaz
 *   • Footer'daki saat (#clock-strip, #clock-el) → DİNAMİK → her saniye güncellenir
 */
function tickClock() {
  const n   = new Date();
  const hms = `${_p2(n.getHours())}:${_p2(n.getMinutes())}:${_p2(n.getSeconds())}`;
  const ymd = `${n.getFullYear()}-${_p2(n.getMonth()+1)}-${_p2(n.getDate())}`;

  // ── Footer şeridindeki dinamik saat ─────────────────────────
  const clockStrip = _g('clock-strip');
  if (clockStrip) clockStrip.textContent = `${ymd} ${hms}`;

  // ── Topnav brand alt yazı ────────────────────────────────────
  const clockEl = _g('clock-el');
  if (clockEl) clockEl.textContent = hms;

  // ── Login ekranı — versiyon STATIK, saat dinamik ─────────────
  // #l-pf zaten HTML'de statik olarak "v8.0.0 / 2026-03-19 14:50" içeriyor.
  // Bu fonksiyon onu ASLA değiştirmez.
  // Sadece login ekranındaki canlı saat alanı (eski #l-ver-time) varsa güncellenir.
  const lTime = _g('l-ver-time');
  if (lTime) lTime.textContent = hms;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — TOAST BİLDİRİMİ
// ════════════════════════════════════════════════════════════════

/**
 * Geçici bildirim banner'ı gösterir.
 * @param {string} msg   Mesaj metni
 * @param {string} [type] 'ok' | 'err' | '' (info)
 */
function toast(msg, type = '') {
  const el = _g('toast-el');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast' + (type ? ' ' + type : '');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — MODAL YÖNETİMİ
// ════════════════════════════════════════════════════════════════

/**
 * Modalı açar (CSS class 'open' ekler).
 * @param {string} id  Element ID
 */
function openMo(id) {
  const el = _g(id);
  if (el) el.classList.add('open');
}

/**
 * Modalı kapatır (CSS class 'open' kaldırır).
 * @param {string} id  Element ID
 */
function closeMo(id) {
  const el = _g(id);
  if (el) el.classList.remove('open');
}

// Overlay tıklamasıyla modal kapatma
document.addEventListener('click', e => {
  if (e.target.classList.contains('mo')) {
    e.target.classList.remove('open');
  }
});

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — TEMA & DİL
// ════════════════════════════════════════════════════════════════

/**
 * Mevcut temayı DOM'a uygular (gece/gündüz).
 */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', _DARK ? 'dark' : '');
  const tm = document.querySelector('meta[name="theme-color"]');
  if (tm) tm.content = _DARK ? '#1C1C1A' : '#3C3489';
  // Tema butonu metni
  const lBtn = _g('l-theme-btn');
  if (lBtn) lBtn.textContent = _DARK ? '☀️ Gündüz' : '🌙 Gece';
}

/**
 * Temayı geçiştirir ve kaydeder.
 */
function toggleTheme() {
  _DARK = !_DARK;
  localStorage.setItem('ak_theme', _DARK ? 'dark' : '');
  applyTheme();
}

/**
 * Dili değiştirir, DOM'daki data-i18n attribute'larını günceller.
 * @param {string} lang  'tr' | 'en' | 'fr'
 * @param {HTMLElement} [btn]  Aktif buton (class 'on' için)
 */
function setLang(lang, btn) {
  _LANG = lang;
  localStorage.setItem('ak_lang', lang);
  document.documentElement.lang = lang;
  // Dil pill butonları
  document.querySelectorAll('[data-lang-btn]').forEach(b => {
    b.classList.toggle('on', b.dataset.langBtn === lang);
  });
  // I18n motoru mevcutsa uygula (src/i18n/translations.js)
  if (window.I18n?.setLang) {
    window.I18n.setLang(lang);
  } else {
    // Fallback: data-i18n attribute'larını temizle
    _applyI18nFallback(lang);
  }
  applyTheme();
}

/**
 * I18n motoru yoksa basit TR/EN fallback uygulanır.
 * @param {string} lang
 */
function _applyI18nFallback(lang) {
  const MAP_EN = {
    'login.title': 'Sign In', 'login.subtitle': 'Access your account.',
    'login.email': 'EMAIL',  'login.password': 'PASSWORD', 'login.btn': 'Sign In',
    'btn.logout':  'Sign Out', 'nav.dashboard': 'Dashboard',
  };
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (lang === 'en' && MAP_EN[key]) el.textContent = MAP_EN[key];
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — GİRİŞ & ÇIKIŞ
// ════════════════════════════════════════════════════════════════

/**
 * Login butonuna basılınca çalışır.
 * Auth.login() sonucuna göre finishLogin veya hata gösterir.
 */
async function login() {
  const email    = (_g('lemail')?.value || '').trim().toLowerCase();
  const password = _g('lpwd')?.value || '';
  const errEl    = _g('l-err');
  const btn      = _g('lbtn');

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'E-posta ve şifre zorunludur.'; errEl.classList.add('show'); }
    return;
  }
  if (errEl) errEl.classList.remove('show');
  if (btn)   { btn.disabled = true; btn.textContent = 'Giriş yapılıyor…'; }

  // Auth modülü hazır değilse kullanıcıya bildir
  if (!window.Auth?.login) {
    if (btn)   { btn.disabled = false; btn.textContent = 'Giriş Yap'; }
    if (errEl) { errEl.textContent = 'Sistem hazırlanıyor, lütfen sayfayı yenileyin (F5).'; errEl.classList.add('show'); }
    return;
  }

  const result = await window.Auth.login(email, password);

  if (result?.ok) {
    // auth.js artık {ok:true, user} döndürüyor — doğrudan kullan
    // Fallback: user yoksa restoreSession() ile bul (session _localLogin'de yazıldı)
    const cu = result.user || window.Auth.restoreSession();

    if (cu) {
      _finishLogin(cu);
    } else {
      if (btn)  { btn.disabled = false; btn.textContent = 'Giriş Yap'; }
      if (errEl){ errEl.textContent = 'Hesabınız platforma eklenmemiş. Yöneticinizle iletişime geçin.'; errEl.classList.add('show'); }
    }
  } else {
    if (btn)  { btn.disabled = false; btn.textContent = 'Giriş Yap'; }
    if (errEl){ errEl.textContent = result?.error || 'E-posta veya şifre hatalı.'; errEl.classList.add('show'); }
    if (_g('lpwd')) _g('lpwd').value = '';
  }
}

/**
 * Başarılı giriş sonrası UI geçişini tamamlar.
 * @param {Object} user  Platform kullanıcı nesnesi
 */
// ── Kullanıcı Tercihleri & Oturum Yönetimi ─────────────────────

/**
 * Kullanıcı tercihlerini yükler ve uygular.
 * @param {Object} user
 */
function _loadAndApplyUserPrefs(user) {
  try {
    var prefs = JSON.parse(localStorage.getItem('ak_user_prefs_' + user.id) || '{}');
    // Son aktif panele dön
    if (prefs.lastPanel && prefs.lastPanel !== 'dashboard') {
      // 1500ms bekle — Firestore ilk veri çekme tamamlansın
      setTimeout(function() {
        var btn = document.querySelector('.nb[onclick*="' + prefs.lastPanel + '"]') || null;
        try { nav(prefs.lastPanel, btn); } catch(e) {}
      }, 1500);
    }
    // Sidebar durumu
    if (prefs.sidebarCollapsed) {
      var sb = document.querySelector('.sidebar');
      if (sb) sb.classList.add('collapsed');
    }
    // Tema
    if (prefs.theme) {
      localStorage.setItem('ak_theme', prefs.theme);
    }
    // Dil
    if (prefs.lang) {
      localStorage.setItem('ak_lang', prefs.lang);
    }
  } catch(e) {}
}

/**
 * Kullanıcı tercihini kaydeder.
 * @param {string} key
 * @param {*} value
 */
function _saveUserPref(key, value) {
  try {
    var uid = window.Auth?.getCU?.()?.id;
    if (!uid) return;
    var prefs = JSON.parse(localStorage.getItem('ak_user_prefs_' + uid) || '{}');
    prefs[key] = value;
    localStorage.setItem('ak_user_prefs_' + uid, JSON.stringify(prefs));
  } catch(e) {}
}

// Tema/dil değişiminde tercihi kaydet
var _origToggleTheme = typeof toggleTheme === 'function' ? toggleTheme : null;

/**
 * Oturum kayıtlarını yükler.
 * @returns {Array}
 */
function _loadSessions() {
  try { return JSON.parse(localStorage.getItem('ak_sessions') || '[]'); } catch(e) { return []; }
}

/**
 * Yeni oturum kaydeder.
 * @param {number} uid
 */
function _registerSession(uid) {
  var sessions = _loadSessions();
  var sessionId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  sessions.push({ uid: uid, sessionId: sessionId, ts: Date.now(), device: navigator.userAgent.slice(0, 80) });
  // 24 saatten eski oturumları temizle
  sessions = sessions.filter(function(s) { return Date.now() - s.ts < 86400000; });
  localStorage.setItem('ak_sessions', JSON.stringify(sessions));
  localStorage.setItem('ak_current_session', sessionId);
  // Firestore'a da yaz
  try {
    var FB_DB = window.Auth?.getFBDB?.();
    if (FB_DB) {
      var tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
      FB_DB.collection('duay_' + tid).doc('sessions').set({ data: sessions, syncedAt: new Date().toISOString() }, { merge: true }).catch(function() {});
    }
  } catch(e) {}
}

/**
 * Oturumu sonlandırır.
 * @param {string} sessionId
 */
function _endSession(sessionId) {
  var sessions = _loadSessions().filter(function(s) { return s.sessionId !== sessionId; });
  localStorage.setItem('ak_sessions', JSON.stringify(sessions));
}

/**
 * Kullanıcının aktif oturumlarını döndürür.
 * @param {number} uid
 * @returns {Array}
 */
function _getUserSessions(uid) {
  return _loadSessions().filter(function(s) { return s.uid === uid && (Date.now() - s.ts < 86400000); });
}

// Export
window._saveUserPref   = _saveUserPref;
window._loadSessions   = _loadSessions;
window._getUserSessions = _getUserSessions;
window._endSession     = _endSession;

function _finishLogin(user) {
  const users = loadUsers();

  // ACİL KURTARMA: _autoFirebaseUserSync tarafından yanlışlıkla
  // inactive yapılan kullanıcıları geri active yap
  var _recovered = false;
  users.forEach(function(u2) {
    if (u2.status === 'inactive' && u2._fbSyncNote) {
      u2.status = 'active';
      delete u2._fbSyncNote;
      delete u2._fbSyncAt;
      _recovered = true;
    }
  });
  if (_recovered) {
    console.info('[LOGIN] _fbSyncNote ile pasifleştirilmiş kullanıcılar kurtarıldı');
  }

  const u     = users.find(x => x.id === user.id) || user;
  u.lastLogin = nowTs();
  saveUsers(users);

  // Eş zamanlı oturum kontrolü
  var maxSessions = u.maxSessions || 0; // 0 = sınırsız
  if (maxSessions > 0) {
    var sessions = _loadSessions();
    var userSessions = sessions.filter(function(s) { return s.uid === u.id && (Date.now() - s.ts < 86400000); });
    if (userSessions.length >= maxSessions) {
      window.toast?.('Maksimum oturum sayısına ulaşıldı (' + maxSessions + '). Diğer cihazlardan çıkış yapın.', 'err');
      if (_g('lbtn')) { _g('lbtn').disabled = false; _g('lbtn').textContent = 'Giriş Yap'; }
      return;
    }
  }
  // Oturumu kaydet
  _registerSession(u.id);

  const errEl = _g('l-err');
  if (errEl) errEl.classList.remove('show');
  if (_g('lbtn')) { _g('lbtn').disabled = false; _g('lbtn').textContent = 'Giriş Yap'; }

  // Ekran geçişi
  const ls = _g('login-screen');
  const ap = _g('app');
  if (ls) { ls.classList.add('out'); setTimeout(() => { ls.style.display = 'none'; }, 300); }
  if (ap) ap.classList.add('on');

  logActivity('login', 'sisteme giriş yaptı');

  // Devam takibi — IP bazlı
  _trackAttendance(u);

  console.log('[LOGIN] _finishLogin çağrıldı. user:', user?.name, '| FB_AUTH:', !!window.Auth?.getFBAuth?.(), '| FB_AUTH.currentUser:', !!window.Auth?.getFBAuth?.()?.currentUser);
  // P0: Realtime sync — sadece Firebase Auth currentUser hazır olduğunda başlat
  var _fbAuth = window.Auth?.getFBAuth?.();
  if (_fbAuth && _fbAuth.currentUser) {
    // currentUser zaten var — hemen başlat
    setTimeout(() => window.DB?.startRealtimeSync?.(), 300);
  } else if (_fbAuth) {
    // currentUser henüz yok — onAuthStateChanged bekle
    var _syncUnsub = _fbAuth.onAuthStateChanged(function(fbUser) {
      if (fbUser) {
        console.info('[LOGIN] onAuthStateChanged tetiklendi — sync başlatılıyor');
        window.DB?.startRealtimeSync?.();
      }
      if (_syncUnsub) { _syncUnsub(); _syncUnsub = null; } // bir kez çalış
    });
  } else {
    // Firebase yok — offline mod, sync başlatma
    console.warn('[LOGIN] Firebase Auth yok — realtime sync atlanıyor');
  }

  // Kullanıcı tercihlerini yükle ve uygula
  _loadAndApplyUserPrefs(u);

  _initApp(u);
}

/**
 * Oturumu kapatır, login ekranına döner.
 */
async function logout() {
  logActivity('logout', 'sistemden çıkış yaptı');
  await window.Auth?.logout?.();

  const ls = _g('login-screen');
  const ap = _g('app');
  if (ls) { ls.style.display = 'flex'; ls.classList.remove('out'); }
  if (ap) ap.classList.remove('on');
  if (_g('lemail')) _g('lemail').value = '';
  if (_g('lpwd'))   _g('lpwd').value   = '';

  // Panelleri sıfırla
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  const dbPanel = _g('panel-dashboard');
  if (dbPanel) dbPanel.classList.add('on');
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  const firstBtn = document.querySelector('.nb');
  if (firstBtn) firstBtn.classList.add('on');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — UYGULAMA BAŞLATICI
// ════════════════════════════════════════════════════════════════

/**
 * Giriş sonrası uygulama UI'ını hazırlar.
 * @param {Object} user
 */

/** Planlanmış (publishAt) duyuruları zamanı gelince yayınlar */
function _checkScheduledAnnouncements() {
  if (typeof loadAnn !== 'function' || typeof storeAnn !== 'function') return;
  const now  = new Date();
  const anns = loadAnn();
  let changed = false;
  anns.forEach(a => {
    if (a.published || !a.publishAt) return;
    if (new Date(a.publishAt) <= now) {
      a.published = true;
      changed = true;
      window.addNotif?.('📣', '"' + a.title + '" duyurusu yayınlandı', 'ok', 'duyurular');
    }
  });
  if (changed) {
    storeAnn(anns);
    window.updateAnnBadge?.();
    window.renderAnnouncements?.();
  }
}

function _initApp(user) {
  if (!user) return;


  // Planlanmış duyuruları kontrol et
  _checkScheduledAnnouncements();

  // Şirket yıllık takvimini localStorage'a merge et (yoksa ekle, varsa atla)
  if (typeof window.mergeCompanyCalendar === 'function') {
    window.mergeCompanyCalendar();
  }
  // Zamanlanmış duyuruları kontrol et
  if (typeof window.checkScheduledAnnouncements === 'function') {
    window.checkScheduledAnnouncements();
    // Her 5 dakikada bir kontrol et
    setInterval(() => window.checkScheduledAnnouncements?.(), 5 * 60 * 1000);
  }
  // Yaklaşan tatilleri 10 gün önceden yöneticiye sor
  setTimeout(() => window.checkYaklasanTatiller?.(), 2000);

  // Nav avatar
  const users = loadUsers();
  const idx   = users.findIndex(x => x.id === user.id);
  const c     = AVC[Math.max(idx, 0) % AVC.length];
  const avEl  = _g('nav-av');
  if (avEl)  { avEl.textContent = initials(user.name); avEl.style.background = c[0]; avEl.style.color = c[1]; }
  _st('nav-name', user.name);
  _st('nav-role', _roleLabel(user.role));

  // Sidebar yetki filtresi — yalnızca erişimi olan modüller görünür
  _applySidebarPermissions(user);

  // Admin-only elementler
  const nbAdmin = _g('nb-admin');
  if (nbAdmin) nbAdmin.style.display = user.role === 'admin' ? 'flex' : 'none';

  // Personel filtresi (Pusula) — sadece admin
  const pusel = _g('pus-usel');
  if (pusel) pusel.style.display = user.role === 'admin' ? 'inline-block' : 'none';

  // ── Admin vs User UI Ayrımı ──────────────────────────────────
  _applyRoleUI(user);

  // i18n uygula
  if (window.I18n?.apply) window.I18n.apply();
  else _applyI18nFallback(_LANG);

  applyTheme();
  updateVersionUI();
  renderPinbar();
  updateAllBadges();
  _initNsecState();
  _resetIdleTimer();

  // Modüllerin ilk yüklemesi
  if (typeof window.renderPusula === 'function') { /* panele gidilince render edilir */ }

  // Sistem bildirimleri (800ms sonra — UI hazır olsun)
  setTimeout(generateSystemNotifs, 800);
  // Bekleyen görev atama bildirimleri
  setTimeout(() => window._checkPendingTaskNotifs?.(user), 1200);

  // Firebase durum rozetini güncelle
  setTimeout(() => window.Auth?.checkFirebaseStatus?.(), 1500);
  setTimeout(() => window._checkPendingTaskNotifs?.(user), 1500);
  setTimeout(() => window._startMorningRoutine?.(user), 2500);
  setTimeout(async () => { try { const q = await window._fetchDailyQuote?.(); if (q && window.setPusQuote) window.setPusQuote(q); } catch(e) {} }, 3000);
  setTimeout(() => _checkPendingTaskNotifs(user), 1500);
  setTimeout(() => _startMorningRoutine(user), 2500);
  setTimeout(async () => { try { const q = await _fetchDailyQuote(); if (q && window.setPusQuote) window.setPusQuote(q); } catch(e) {} }, 3000);
  // Bekleyen gorev bildirimleri
  setTimeout(() => _checkPendingTaskNotifs(user), 1500);
  setTimeout(() => _startMorningRoutine(user), 2500);
  // Gunluk sozu yukle
  setTimeout(async () => {
    try { const q = await _fetchDailyQuote(); if (q && window.setPusQuote) window.setPusQuote(q); } catch(e) {}
  }, 3000);

  // Firebase kullanıcı sync — login'de otomatik kontrol
  setTimeout(function() {
    try { _autoFirebaseUserSync(); } catch(e) {}
  }, 3000);

  // Kargo & Konteyner polling
  setTimeout(() => {
    try { window.startKargoPolling?.();   } catch (e) {}
    try { window.startKonteynPolling?.(); } catch (e) {}
    try { window.checkAllKonteyn?.();    } catch (e) {}
  }, 2000);

  // Tatil ve etkinlik kontrolleri
  setTimeout(() => { try { window.checkYaklasanTatiller?.();   } catch (e) {} }, 3000);
  setTimeout(() => { try { window.checkYaklasanEtkinlikler?.(); } catch (e) {} }, 4000);
  setInterval(()  => { try { window.checkYaklasanTatiller?.();   } catch (e) {} }, 6 * 3600 * 1000);
  setInterval(()  => { try { window.checkYaklasanEtkinlikler?.(); } catch (e) {} }, 3600 * 1000);
  setInterval(()  => { try { window.checkTebligatAlarms?.();    } catch (e) {} }, 6 * 3600 * 1000);

  // Pirim oran ipucu
  if (_g('prm-type') && typeof window.updatePirimRateHint === 'function') {
    window.updatePirimRateHint();
  }

  // beforeunload: KPI çıkış logu
  window.addEventListener('beforeunload', () => {
    try { window.logKpiExit?.(); } catch (e) {}
  });

  // Dashboard ilk render
  try { _renderDashboard(); } catch (e) {}
}

/**
 * Rol etiketini Türkçe döndürür.
 * @param {string} role
 * @returns {string}
 */
function _roleLabel(role) {
  return { admin:'👑 Yönetici', manager:'🏛️ Müdür', lead:'⭐ Takım Lideri', staff:'👤 Personel' }[role] || role;
}

/**
 * Sidebar nav butonlarına RBAC filtresi uygular.
 * @param {Object} user
 */
function _applySidebarPermissions(user) {
  document.querySelectorAll('.nb[onclick]').forEach(btn => {
    const match = btn.getAttribute('onclick').match(/App\.nav\('([^']+)'|nav\('([^']+)'/);
    if (!match) return;
    const modId = match[1] || match[2];
    if (!modId) return;
    if (user.role === 'admin') { btn.style.display = 'flex'; return; }
    if (modId === 'settings' || modId === 'admin') { btn.style.display = 'none'; return; }
    btn.style.display = canModule(modId) ? 'flex' : 'none';
  });
  // Dashboard her zaman görünür
  const dbBtn = document.querySelector(".nb[onclick*=\"'dashboard'\"]");
  if (dbBtn) dbBtn.style.display = 'flex';
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — PANELLERi BAŞLATICI (App.init)
// ════════════════════════════════════════════════════════════════

/**
 * Sayfa yüklendiğinde çağrılır.
 * Firebase Auth durumunu dinler; oturum varsa uygulamayı başlatır.
 */
function init() {
  // Dil & tema
  _LANG = localStorage.getItem('ak_lang') || 'tr';
  _DARK = localStorage.getItem('ak_theme') === 'dark';
  applyTheme();
  if (window.I18n?.loadLang) _LANG = window.I18n.loadLang();
  if (window.I18n?.apply)    window.I18n.apply();

  // Firebase Auth durum dinleyicisi
  window.Auth?.listenAuthState?.(
    async fbUser => {
      const cu = await window.Auth.resolveCurrentUser(fbUser.email);
      if (cu) _finishLogin(cu);
      else logout();
    },
    () => {
      // Oturum yok — localStorage oturumu dene
      const cu = window.Auth?.restoreSession?.();
      if (cu) _finishLogin(cu);
      // else: login ekranı zaten görünür
    }
  );

  // Firebase bağlı değilse localStorage oturumunu dene
  if (!window.Auth?.getFBAuth?.()) {
    const cu = window.Auth?.restoreSession?.();
    if (cu) _finishLogin(cu);
  }

  // Canlı saat — hemen başlat
  tickClock();
  setInterval(tickClock, 1000);

  // Klavye kısayolları
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openGSearch(); }
    if (e.key === 'Escape') { closeGSearch(); document.querySelectorAll('.mo.open').forEach(m => m.classList.remove('open')); }
  });

  // Mobil sidebar — nav butonuna basınca kapat
  document.addEventListener('click', e => {
    if (e.target.closest('.nb') && window.innerWidth <= 860) {
      const sb = document.querySelector('.sidebar');
      const ov = _g('mob-overlay');
      if (sb) sb.classList.remove('open');
      if (ov) ov.classList.remove('show');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — PANEL ROUTER (App.nav)
// ════════════════════════════════════════════════════════════════

/**
 * Paneller arası geçiş — RBAC guard dahil.
 * @param {string}       id   Panel kimliği (panel-{id} elementine karşılık gelir)
 * @param {HTMLElement}  [el] Tıklanan sidebar butonu (aktif class için)
 */
function nav(id, el) {
  const cu = window.Auth?.getCU?.();
  if (!cu) { toast('Oturum bulunamadı.', 'err'); return; }

  // ── YETKİ GUARD ─────────────────────────────────────────────
  if (id === 'settings' && cu.role !== 'admin') {
    toast('Bu bölüme erişim yetkiniz yok.', 'err'); return;
  }
  if (ADMIN_ONLY_PANELS.includes(id) && cu.role !== 'admin') {
    toast('Bu bölüm yalnızca yöneticilere açıktır.', 'err'); return;
  }
  if (cu.role !== 'admin' && !canModule(id) && id !== 'dashboard') {
    toast('Bu modüle erişim izniniz yok.', 'err'); return;
  }
  // ────────────────────────────────────────────────────────────

  // Tüm panelleri kapat, tüm nav butonlarını pasif yap
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));

  const target = _g('panel-' + id);
  if (!target) { console.warn('[App.nav] Panel bulunamadı:', 'panel-' + id); return; }
  target.classList.add('on');
  if (el) el.classList.add('on');

  // Son aktif paneli hatırla
  try { var _uid = window.Auth?.getCU?.()?.id; if (_uid) { var _p = JSON.parse(localStorage.getItem('ak_user_prefs_' + _uid) || '{}'); _p.lastPanel = id; localStorage.setItem('ak_user_prefs_' + _uid, JSON.stringify(_p)); } } catch(e) {}

  // Mobil: sidebar kapat
  if (window.innerWidth <= 860) {
    const sb = document.querySelector('.sidebar');
    const ov = _g('mob-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
  }

  // 24 saatlik panel güncelleme banner'ı (Admin modülünden)
  try { window.Admin?.showAllUpdateBanners?.(); } catch (e) {}

  // ── Panel render yönlendirmeleri ─────────────────────────────
  _renderPanel(id);
}

/**
 * Panel ID'ye göre ilgili modülün render fonksiyonunu çağırır.
 * Her modül tamamlandıkça buraya kayıt eklenir.
 * @param {string} id
 */
function _renderPanel(id) {
  const safe = fn => { try { fn(); } catch (e) { console.warn('[App.nav] render hatası:', id, e); } };

  const RENDERS = {
    dashboard:  () => safe(_renderDashboard),
    pusula:     () => safe(() => { window.Pusula?.init?.(); window.Pusula?.render?.(); }),
    kargo:      () => safe(() => { window.Kargo?.render?.(); window.Kargo?.renderKonteyn?.(); }),
    lojistik:   () => safe(() => { window.renderLojistik?.(); }),
    pirim:      () => safe(() => window.Pirim?.render?.()),
    admin:      () => safe(() => { window.Admin?.render?.(); window.Admin?.renderLog?.(); }),
    announce:   () => safe(() => { window.renderAnnouncements?.(); window.updateAnnBadge?.(); }),
    takvim:     () => safe(() => { window.renderCal?.(); setTimeout(() => window.checkYaklasanEtkinlikler?.(), 100); }),
    puantaj:    () => safe(() => window.renderPuantaj?.()),
    notes:      () => safe(() => window.renderNotes?.()),
    links:      () => safe(() => window.renderLinks?.()),
    hedefler:   () => safe(() => window.renderHedefler?.()),
    odemeler:   () => safe(() => window.renderOdemeler?.()),
    ik:         () => safe(() => { window.renderIk?.(); window.renderIkZimmet?.(); }),
    izin:       () => safe(() => window.renderIzin?.()),
    tebligat:   () => safe(() => window.renderTebligat?.()),
    evrak:      () => safe(() => window.renderEvrak?.()),
    arsiv:      () => safe(() => window.renderArsiv?.()),
    kpi:        () => safe(() => window.Kpi?.render?.() || window.renderKpiPanel?.()),
    crm:        () => safe(() => window.CrmHub?.render?.() || window.renderCrm?.()),
    numune:     () => safe(() => window.renderNumune?.()),
    temizlik:   () => safe(() => window.renderTemizlik?.()),
    resmi:      () => safe(() => window.renderResmi?.()),
    etkinlik:   () => safe(() => { window.renderEtkinlik?.(); setTimeout(() => window.applyFuarKriterleriToForm?.(), 50); }),
    rehber:     () => safe(() => window.renderRehber?.()),
    settings:   () => safe(() => { updateVersionUI(); window.Auth?.checkFirebaseStatus?.(); window.renderSettingsAdmin?.(); }),
    activity:   () => safe(() => window.renderActivity?.()),
    suggestions:() => safe(() => window.renderSugg?.()),
    trash:      () => safe(() => window.renderTrashPanel?.()),
    hesap:      () => safe(() => window.renderHesapHistory?.()),
  };

  // app_patch ve hub modülleri için fallback
  if (RENDERS[id]) {
    RENDERS[id]();
  } else {
    // Hub modülleri ve ek paneller
    const hubRenders = {
      'ik-hub':    () => safe(() => window.IkHub?.render?.()),
      'crm-hub':   () => safe(() => window.CrmHub?.render?.()),
      gorevler:    () => safe(() => window.Pusula?.render?.()),
      'kpi-panel': () => safe(() => window.renderKpiPanel?.() || window.KPI?.render?.()),
    };
    if (hubRenders[id]) hubRenders[id]();
    else window._patchRender?.(id);
  }
}

/**
 * Nav wrapper — sidebar butonunu otomatik bulur.
 * @param {string} id
 */
function goTo(id) {
  const btn = document.querySelector(`.nb[onclick*="'${id}'"]`);
  nav(id, btn);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 12 — DASHBOARD RENDER
// ════════════════════════════════════════════════════════════════

function _renderDashboard() {
  const cu = window.Auth?.getCU?.();
  if (!cu) return;

  const n    = new Date();
  const lang = _LANG;
  _st('db-date', n.toLocaleDateString(
    lang === 'en' ? 'en-GB' : lang === 'fr' ? 'fr-FR' : 'tr-TR',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  ));
  _st('db-welcome', (lang === 'en' ? 'Welcome' : lang === 'fr' ? 'Bienvenue' : 'Hoş geldiniz') + ', ' + cu.name + '!');

  // Modüle özel istatistik sayaçları
  const sg = _g('db-sg');
  if (!sg) return;

  const users  = loadUsers();
  const tasks  = loadTasks();
  const kargo  = loadKargo();
  const pirim  = loadPirim();
  const izin   = loadIzin();
  const today  = new Date().toISOString().slice(0, 10);

  const stats = [
    { icon: '👥', label: 'Aktif Kullanıcı',  val: cu.role === 'admin' ? users.filter(u => u.status === 'active').length : '—' },
    { icon: '📋', label: 'Açık Görev',        val: tasks.filter(t => !t.done && t.status !== 'done').length },
    { icon: '📦', label: 'Bekleyen Kargo',    val: kargo.filter(k => k.status === 'bekle').length },
    { icon: '⭐', label: 'Onay Bekleyen Prim',val: pirim.filter(p => p.status === 'pending').length },
    { icon: '🏖️', label: 'Bekleyen İzin',     val: izin.filter(i => i.status === 'pending').length },
    { icon: '🎯', label: 'Kritik Görev',      val: tasks.filter(t => !t.done && t.pri === 1).length },
    { icon: '⚠️', label: 'Gecikmiş Görev',   val: tasks.filter(t => !t.done && t.due && t.due < today).length },
    { icon: '🔔', label: 'Okunmamış Bildirim',val: loadNotifs().filter(n => !n.read).length },
  ];

  sg.innerHTML = stats.map(s => `
    <div class="sc">
      <div class="sci">${s.icon}</div>
      <div class="scv">${s.val}</div>
      <div class="scl">${s.label}</div>
    </div>`).join('');

  // Günün görevleri — hızlı bakış
  const content = _g('db-content');
  if (!content) return;
  const myTasks = tasks.filter(t =>
    (t.uid === cu.id || (t.participants || []).includes(cu.id)) && !t.done
  ).sort((a, b) => a.pri - b.pri).slice(0, 5);

  if (!myTasks.length) {
    content.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">🎉</div><div style="font-weight:500">Bugün tüm görevler tamamlandı!</div></div>`;
    return;
  }
  const priColors = { 1:'#ef4444', 2:'#f97316', 3:'#3b82f6', 4:'#9ca3af' };
  content.innerHTML = `<div class="card">
    <div class="ch"><span class="ct">Günün Görevleri</span><button class="btn btns" onclick="App.nav('pusula',document.querySelector('.nb[onclick*=\\'pusula\\']'))">Tümünü Gör →</button></div>
    <div style="padding:0 16px 12px">
      ${myTasks.map(t => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
          <div style="width:4px;height:36px;border-radius:2px;flex-shrink:0;background:${priColors[t.pri]||priColors[4]}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
            ${t.due ? `<div style="font-size:10px;color:${t.due < today ? 'var(--rd)' : 'var(--t3)'};margin-top:2px">${t.due < today ? '⚠ ' : ''}${t.due}</div>` : ''}
          </div>
          <input type="checkbox" onchange="Pusula?.toggle(${t.id},this.checked)" style="accent-color:var(--ac);width:16px;height:16px;flex-shrink:0">
        </div>`).join('')}
    </div>
  </div>`;

  _renderDashboardPusulaWidget(cu, tasks, today);

  // Geciken İşlemler bölümü
  _renderOverdueWidget(tasks, kargo, today);
}

function _renderOverdueWidget(tasks, kargo, today) {
  var el = _g('db-overdue');
  if (!el) {
    var content = _g('db-content');
    if (!content) return;
    el = document.createElement('div');
    el.id = 'db-overdue';
    content.insertBefore(el, content.firstChild);
  }

  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var sa  = typeof window._loadSA === 'function' ? window._loadSA() : [];

  var overdueOdm   = odm.filter(function(o) { return !o.paid && o.due && o.due < today; }).length;
  var overdueTasks  = tasks.filter(function(t) { return !t.done && t.due && t.due < today; }).length;
  var overdueKargo  = kargo.filter(function(k) { return k.status !== 'teslim' && k.eta && k.eta < today; }).length;
  var overdueSA     = sa.filter(function(s) { return s.status === 'pending' && s.createdAt; }).length;
  var total = overdueOdm + overdueTasks + overdueKargo + overdueSA;

  // Vadesi yaklaşan (7 gün içinde)
  var weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7); var weekStr = weekEnd.toISOString().slice(0,10);
  var nearOdm = odm.filter(function(o) { return !o.paid && !o.isDeleted && o.due && o.due >= today && o.due <= weekStr; });
  var nearTasks = tasks.filter(function(t) { return !t.done && !t.isDeleted && t.due && t.due >= today && t.due <= weekStr; });
  var nearTotal = nearOdm.length + nearTasks.length;

  // Onay bekleyen (admin için)
  var cu = window.Auth?.getCU?.();
  var pendingApproval = 0;
  if (cu?.role === 'admin' || cu?.role === 'manager') {
    pendingApproval = odm.filter(function(o) { return o.approvalStatus === 'pending' && !o.isDeleted; }).length
      + sa.filter(function(s) { return s.status === 'pending'; }).length;
  }

  if (!total && !nearTotal && !pendingApproval) { el.innerHTML = ''; return; }

  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var html = '';

  // Kırmızı: gecikmiş
  if (total) {
    var overdueDetails = [];
    odm.filter(function(o) { return !o.paid && !o.isDeleted && o.due && o.due < today; }).slice(0, 5).forEach(function(o) {
      overdueDetails.push('<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px"><span>💸</span><span style="flex:1;color:var(--t)">' + esc(o.name || '—') + ' <span style="color:var(--t3)">(' + esc(o.cariName || '') + ')</span></span><span style="font-weight:700;color:#DC2626">₺' + Number(o.amountTRY || o.amount || 0).toLocaleString('tr-TR') + '</span></div>');
    });
    tasks.filter(function(t) { return !t.done && !t.isDeleted && t.due && t.due < today; }).slice(0, 5).forEach(function(t) {
      var assignee = (typeof loadUsers === 'function' ? loadUsers() : []).find(function(u) { return u.id === t.uid; });
      overdueDetails.push('<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px"><span>📋</span><span style="flex:1;color:var(--t)">' + esc(t.title) + '</span><span style="color:var(--t3)">' + esc(assignee?.name || '—') + '</span></div>');
    });
    html += '<div class="card" style="border-left:4px solid #EF4444;margin-bottom:8px">'
      + '<div class="ch"><span class="ct" style="color:#EF4444">🚨 Geciken İşlemler (' + total + ')</span><button class="btn btns" onclick="App.nav(\'odemeler\')" style="font-size:10px">Görüntüle →</button></div>'
      + '<div style="padding:0 16px 12px">' + overdueDetails.join('') + '</div></div>';
  }

  // Sarı: yaklaşan
  if (nearTotal) {
    var nearDetails = [];
    nearOdm.slice(0, 3).forEach(function(o) {
      nearDetails.push('<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px"><span>💸</span><span style="flex:1;color:var(--t)">' + esc(o.name || '—') + '</span><span style="color:#92400E">' + (o.due || '') + '</span></div>');
    });
    nearTasks.slice(0, 3).forEach(function(t) {
      nearDetails.push('<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px"><span>📋</span><span style="flex:1;color:var(--t)">' + esc(t.title) + '</span><span style="color:#92400E">' + (t.due || '') + '</span></div>');
    });
    html += '<div class="card" style="border-left:4px solid #F59E0B;margin-bottom:8px">'
      + '<div class="ch"><span class="ct" style="color:#92400E">⚠️ Yaklaşan (' + nearTotal + ')</span></div>'
      + '<div style="padding:0 16px 12px">' + nearDetails.join('') + '</div></div>';
  }

  // Onay bekleyen (admin)
  if (pendingApproval) {
    html += '<div class="card" style="border-left:4px solid #6366F1;margin-bottom:8px">'
      + '<div class="ch"><span class="ct" style="color:#4F46E5">📝 Onay Bekleyen (' + pendingApproval + ')</span><button class="btn btns" onclick="App.nav(\'odemeler\')" style="font-size:10px">İncele →</button></div></div>';
  }

  el.innerHTML = html;
}

// ── Pusula Dashboard Widget ────────────────────────────────────────
function _renderDashboardPusulaWidget(cu, tasks, today) {
  const dayFocusEl = document.getElementById('db-day-focus');
  if (dayFocusEl) {
    const ids = (() => { try { return JSON.parse(localStorage.getItem('ak_pus_day_focus_' + cu.id) || '[]'); } catch(e) { return []; } })();
    if (!ids.length) {
      dayFocusEl.innerHTML = '<div style="padding:18px 16px;text-align:center;color:var(--t3);font-size:12px">Odak listesi bos. Pusula da gorev secin.</div>';
    } else {
      const priColors = { 1:'#ef4444', 2:'#f97316', 3:'#3b82f6', 4:'#9ca3af' };
      const rows = ids.map(id => {
        const t = tasks.find(x => x.id === id);
        if (!t) return '';
        const isLate = !t.done && t.due && t.due < today;
        const dur = t.duration ? (t.duration >= 60 ? Math.floor(t.duration/60) + 's' + (t.duration%60 ? ' '+t.duration%60+'dk' : '') : t.duration+'dk') : '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--b);cursor:pointer" data-nav="pusula" class="db-focus-row">'
          + '<div style="width:3px;height:32px;border-radius:2px;background:' + (priColors[t.pri]||priColors[4]) + ';flex-shrink:0"></div>'
          + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:13px;font-weight:' + (t.done?400:600) + ';color:' + (t.done?'var(--t3)':'var(--t)') + ';text-decoration:' + (t.done?'line-through':'none') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t.title + '</div>'
            + '<div style="display:flex;gap:8px;margin-top:2px">'
              + (t.due ? '<span style="font-size:10px;color:' + (isLate?'var(--rdt)':'var(--t3)') + '">' + (isLate?'⚠ ':'') + t.due + '</span>' : '')
              + (dur ? '<span style="font-size:10px;color:var(--ac)">⏱ ' + dur + '</span>' : '')
            + '</div>'
          + '</div>'
          + (t.done ? '<span style="font-size:14px">✅</span>' : '')
        + '</div>';
      }).join('');
      dayFocusEl.innerHTML = rows;
    }
  }

  const statsEl = document.getElementById('db-pusula-stats');
  if (statsEl) {
    const myT   = tasks.filter(t => t.uid === cu.id || (t.participants||[]).includes(cu.id));
    const total = myT.length;
    const done  = myT.filter(t => t.done || t.status === 'done').length;
    const inprog = myT.filter(t => t.status === 'inprogress').length;
    const overdue = myT.filter(t => !t.done && t.due && t.due < today).length;
    const critical = myT.filter(t => !t.done && t.pri === 1).length;
    const pct = total ? Math.round(done/total*100) : 0;
    const weekIds = (() => { try { return JSON.parse(localStorage.getItem('ak_pus_week_focus_' + cu.id) || '[]'); } catch(e) { return []; } })();
    statsEl.innerHTML = '<div style="padding:14px 16px">'
      + '<div style="margin-bottom:14px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          + '<span style="font-size:12px;color:var(--t2)">Genel Ilerleme</span>'
          + '<span style="font-size:13px;font-weight:700;color:' + (pct>=80?'var(--grt)':pct>=50?'var(--amt)':'var(--ac)') + '">' + pct + '%</span>'
        + '</div>'
        + '<div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden">'
          + '<div style="height:100%;width:' + pct + '%;background:' + (pct>=80?'var(--gr)':pct>=50?'var(--am)':'var(--ac)') + ';border-radius:3px;transition:width .4s"></div>'
        + '</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        + '<div style="background:var(--s2);border-radius:9px;padding:9px 11px"><div style="font-size:18px;font-weight:700;color:var(--t)">' + done + '<span style="font-size:11px;color:var(--t3);font-weight:400">/' + total + '</span></div><div style="font-size:10px;color:var(--t3);margin-top:1px">Tamamlanan</div></div>'
        + '<div style="background:var(--s2);border-radius:9px;padding:9px 11px"><div style="font-size:18px;font-weight:700;color:var(--ac)">' + inprog + '</div><div style="font-size:10px;color:var(--t3);margin-top:1px">Devam Eden</div></div>'
        + '<div style="background:' + (overdue?'rgba(239,68,68,.08)':'var(--s2)') + ';border-radius:9px;padding:9px 11px;border:1px solid ' + (overdue?'rgba(239,68,68,.2)':'transparent') + '"><div style="font-size:18px;font-weight:700;color:' + (overdue?'var(--rdt)':'var(--t)') + '">' + overdue + '</div><div style="font-size:10px;color:var(--t3);margin-top:1px">Gecikmiş</div></div>'
        + '<div style="background:var(--s2);border-radius:9px;padding:9px 11px"><div style="font-size:18px;font-weight:700;color:' + (critical?'#ef4444':'var(--t)') + '">' + critical + '</div><div style="font-size:10px;color:var(--t3);margin-top:1px">Kritik</div></div>'
      + '</div>'
      + (weekIds.length ? '<div style="margin-top:10px;background:rgba(99,102,241,.06);border-radius:8px;padding:8px 11px;font-size:11px;color:var(--t2)">Bu hafta <strong style="color:var(--ac)">' + weekIds.length + '</strong> odak gorev secildi</div>' : '')
    + '</div>';
  }
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 13 — SÜRÜM GEÇMİŞİ
// ════════════════════════════════════════════════════════════════

/**
 * Ayarlar panelindeki sürüm geçmişi bölümünü render eder.
 */
function updateVersionUI() {
  const el = _g('ver-hist');
  if (!el) return;
  el.innerHTML = CHANGELOG.map(c => `
    <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--b)">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--ac)">v${c.v}</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--t3)">${c.ts}</span>
      </div>
      <div style="font-size:12px;color:var(--t2)">${c.note}</div>
    </div>`).join('');
  // DB son güncelleme zamanı — fb-sync-time elementini güncelle
  const _updateDbSync = () => {
    const val = window.getDbLastSync ? window.getDbLastSync() : '—';
    const el1 = document.getElementById('fb-sync-time');
    const el2 = document.getElementById('db-last-sync');
    if (el1) el1.textContent = val;
    if (el2) el2.textContent = val;
  };
  _updateDbSync();
  if (!window._dbSyncInterval) {
    window._dbSyncInterval = setInterval(_updateDbSync, 5000);
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 14 — PROFIL PANELİ
// ════════════════════════════════════════════════════════════════

function toggleProfilePanel() {
  const p  = _g('profile-panel');
  const np = _g('notif-panel');
  if (np) np.classList.remove('open');
  if (!p) return;
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    _renderProfilePanel();
    document.addEventListener('click', _closeProfileOnBlur);
  } else {
    document.removeEventListener('click', _closeProfileOnBlur);
  }
}

function _closeProfilePanel() {
  const p = _g('profile-panel');
  if (p) p.classList.remove('open');
  document.removeEventListener('click', _closeProfileOnBlur);
}

function _closeProfileOnBlur(e) {
  if (!e.target.closest('#profile-panel') && !e.target.closest('.uchip')) {
    _closeProfilePanel();
  }
}

function _renderProfilePanel() {
  const cu = window.Auth?.getCU?.();
  if (!cu) return;
  const users = loadUsers();
  const idx   = users.findIndex(x => x.id === cu.id);
  const c     = AVC[Math.max(idx, 0) % AVC.length];
  const av    = _g('pp-av');
  if (av) { av.textContent = initials(cu.name); av.style.background = c[0]; av.style.color = c[1]; }
  _st('pp-name',  cu.name);
  _st('pp-role',  _roleLabel(cu.role));
  _st('pp-email', cu.email || '');
  const modsEl = _g('pp-modules');
  if (modsEl) {
    const userMods = cu.modules || ROLE_DEFAULT_MODULES[cu.role] || [];
    modsEl.innerHTML = userMods.slice(0, 12).map(m => {
      const def = ALL_MODULES.find(x => x.id === m);
      return def ? `<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:var(--al);color:var(--at)">${def.label}</span>` : '';
    }).join('');
  }
}

/**
 * Profil düzenleme modalını açar.
 */
function openProfileEdit() {
  const cu = window.Auth?.getCU?.();
  if (!cu) return;
  if (_g('prof-name'))  _g('prof-name').value  = cu.name || '';
  if (_g('prof-oldpw')) _g('prof-oldpw').value = '';
  if (_g('prof-newpw')) _g('prof-newpw').value = '';
  if (_g('prof-newpw2'))_g('prof-newpw2').value= '';
  _closeProfilePanel();
  openMo('mo-profile');
}

/**
 * Profil bilgilerini kaydeder (isim + isteğe bağlı şifre değişimi).
 */
function saveProfile() {
  const cu = window.Auth?.getCU?.();
  if (!cu) return;
  const name    = (_g('prof-name')?.value  || '').trim();
  if (!name) { toast('Ad zorunludur', 'err'); return; }

  const oldpw   = _g('prof-oldpw')?.value  || '';
  const newpw   = _g('prof-newpw')?.value  || '';
  const newpw2  = _g('prof-newpw2')?.value || '';

  if (newpw) {
    const chRes = window.Auth?.changePassword?.(oldpw, newpw);
    if (chRes && !chRes.ok) { toast(chRes.error || 'Şifre hatası', 'err'); return; }
    if (newpw !== newpw2)   { toast('Şifreler eşleşmiyor', 'err'); return; }
  }

  const users = loadUsers();
  const u     = users.find(x => x.id === cu.id);
  if (u) { u.name = name; saveUsers(users); }

  // S1: CU objesini güncelle (in-memory)
  if (cu) cu.name = name;
  // S3: Session'ı güncelle
  try { localStorage.setItem('ak_session', JSON.stringify({ uid: cu.id, email: cu.email, tenantId: window.DEFAULT_TENANT_ID || 'tenant_default', ts: Date.now() })); } catch(e) {}
  // S5: Firebase Auth displayName güncelle
  try {
    const fbUser = window.Auth?.getFBAuth?.()?.currentUser;
    if (fbUser) fbUser.updateProfile({ displayName: name }).catch(() => {});
  } catch(e) {}

  _st('nav-name', name);
  closeMo('mo-profile');
  logActivity('user', 'profilini güncelledi');
  toast('Profil güncellendi ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 15 — BİLDİRİM PANELİ
// ════════════════════════════════════════════════════════════════

function toggleNotifPanel() {
  const p  = _g('notif-panel');
  const pp = _g('profile-panel');
  if (pp) pp.classList.remove('open');
  if (!p) return;
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    _renderNotifPanel();
    document.addEventListener('click', _closeNotifOnBlur);
  } else {
    document.removeEventListener('click', _closeNotifOnBlur);
  }
}

function _closeNotifPanel() {
  const p = _g('notif-panel');
  if (p) p.classList.remove('open');
  document.removeEventListener('click', _closeNotifOnBlur);
}

function _closeNotifOnBlur(e) {
  if (!e.target.closest('#notif-panel') && !e.target.closest('.notif-btn')) {
    _closeNotifPanel();
  }
}

function _renderNotifPanel() {
  const list = _g('notif-list');
  if (!list) return;
  const _cuNotif = window.Auth?.getCU?.();
  // targetUid filtresi: null/undefined → herkese, değer varsa → sadece hedef
  const d      = loadNotifs().filter(n => !n.targetUid || n.targetUid === _cuNotif?.id);
  const unread = d.filter(n => !n.read).length;
  const hdr    = _g('notif-unread-count');
  if (hdr) hdr.textContent = unread > 0 ? `(${unread} okunmamış)` : '';

  if (!d.length) {
    list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2);font-size:13px">🔕 Bildirim yok</div>`;
    return;
  }
  list.innerHTML = d.slice(0, 30).map(n => `
    <div class="notif-item${n.read ? '' : ' unread'}" data-id="${n.id}" data-link="${n.link || ''}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:16px;flex-shrink:0">${n.icon || '🔔'}</span>
        <div style="flex:1">
          <div style="font-size:12px;line-height:1.4;color:${n.read ? 'var(--t2)' : 'var(--t)'};font-weight:${n.read ? '400' : '600'}">${n.msg}</div>
          <div style="font-size:10px;color:var(--t3);margin-top:3px;font-family:'DM Mono',monospace">${n.ts}</div>
        </div>
        ${!n.read ? `<div style="width:8px;height:8px;background:var(--ac);border-radius:50%;flex-shrink:0;margin-top:4px"></div>` : ''}
      </div>
    </div>`).join('');

  // Event delegation — tek listener
  list.onclick = e => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const id   = parseInt(item.dataset.id);
    const link = item.dataset.link || '';
    const data = loadNotifs();
    const n    = data.find(x => x.id === id);
    if (n) n.read = true;
    storeNotifs(data);
    updateNotifBadge();
    _renderNotifPanel();
    if (link) {
      // Derin link desteği: "cari:123" → cari panelini aç + ilgili cariyi seç
      if (link.indexOf(':') !== -1) {
        var parts = link.split(':');
        goTo(parts[0]);
        // Hedef ID ile seçim yap (modül bazlı)
        var targetId = parseInt(parts[1]);
        if (parts[0] === 'cari' && targetId && typeof window._selectCari === 'function') {
          setTimeout(function() { window._selectCari(targetId); }, 100);
        }
      } else {
        goTo(link);
      }
      _closeNotifPanel();
    }
  };
}

function updateNotifBadge() {
  const _cuBadge = window.Auth?.getCU?.();
  const n   = loadNotifs().filter(x => !x.read && (!x.targetUid || x.targetUid === _cuBadge?.id)).length;
  const dot = _g('notif-dot');
  if (dot) dot.classList.toggle('show', n > 0);
}

function markAllNotifRead() {
  const d = loadNotifs();
  d.forEach(n => n.read = true);
  storeNotifs(d);
  updateNotifBadge();
  _renderNotifPanel();
  toast('Tümü okundu işaretlendi ✓', 'ok');
}

function clearAllNotifs() {
  window.confirmModal('Tüm bildirimler silinsin mi?', {
    title: 'Bildirimleri Temizle',
    danger: true,
    confirmText: 'Evet, Temizle',
    onConfirm: () => {
      storeNotifs([]);
      updateNotifBadge();
      _renderNotifPanel();
      toast('Bildirimler temizlendi ✓', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16 — OTOMATİK SİSTEM BİLDİRİMLERİ
// ════════════════════════════════════════════════════════════════

/**
 * Gecikmiş ödeme, hedef, kargo, tebligat bildirimlerini üretir.
 * Her _initApp sonrası 800ms gecikmeyle çağrılır.
 */
// ── Görev Bildirim Popup ─────────────────────────────────────────
function _checkPendingTaskNotifs(user) {
  if (!user) return;
  var notifs = window.loadNotifs ? window.loadNotifs() : [];
  var pending = notifs.filter(function(n) { return n.targetUid===user.id && n.needsAck && !n.acked && !n.read; });
  if (pending.length) _showTaskAssignPopup(pending, 0);
}

function _showTaskAssignPopup(pending, idx) {
  if (idx >= pending.length) return;
  var n = pending[idx];
  document.getElementById('task-assign-popup')?.remove();
  var pop = document.createElement('div');
  pop.id = 'task-assign-popup';
  pop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999';
  var priLabels = ['','Kritik','Yuksek','Normal','Dusuk'];
  var priColors = ['','#EF4444','#F97316','#EAB308','#22C55E'];
  pop.innerHTML = '<div style="background:var(--sf);border-radius:20px;padding:28px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">'
    + '<div style="width:52px;height:52px;border-radius:16px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">📋</div>'
    + '<div><div style="font-size:11px;font-weight:700;color:var(--ac);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Yeni Gorev Atandi</div>'
    + '<div style="font-size:18px;font-weight:700;color:var(--t)">' + (n.taskTitle||'Yeni Gorev') + '</div></div></div>'
    + '<div style="background:var(--s2);border-radius:12px;padding:14px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">ATAYAN</div><div style="font-size:13px;font-weight:600">' + (n.assigner||'---') + '</div></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">ONCELIK</div><div style="font-size:13px;font-weight:700;color:' + (priColors[n.priority||2]||'#EAB308') + '">' + (priLabels[n.priority||2]||'Normal') + '</div></div>'
    + (n.due ? '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">SON TARIH</div><div style="font-size:13px;font-weight:600">' + n.due + '</div></div>' : '')
    + '</div>'
    + '<div style="display:flex;gap:10px">'
    + '<button id="tapop-go" style="flex:1;background:var(--ac);color:#fff;border:none;border-radius:11px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Goreve Git</button>'
    + '<button id="tapop-ok" style="background:var(--s2);color:var(--t);border:none;border-radius:11px;padding:12px 18px;font-size:13px;cursor:pointer;font-family:inherit">Tamam</button></div>'
    + '</div>';
  document.body.appendChild(pop);
  var _ack = function() {
    var all = window.loadNotifs ? window.loadNotifs() : [];
    var f = all.find(function(x){ return x.id===n.id; });
    if (f) { f.acked=true; f.read=true; }
    if (window.storeNotifs) window.storeNotifs(all);
    if (window.updateNotifBadge) window.updateNotifBadge();
    pop.remove();
    setTimeout(function(){ _showTaskAssignPopup(pending, idx+1); }, 400);
  };
  document.getElementById('tapop-ok').addEventListener('click', _ack);
  document.getElementById('tapop-go').addEventListener('click', function(){ _ack(); if(typeof nav==='function') nav('pusula',null); });
  pop.addEventListener('click', function(e){ if(e.target===pop) _ack(); });
}

var _MORNING_KEY = 'ak_morning_done_';
var _QUOTE_KEY   = 'ak_pus_quote_';

async function _fetchDailyQuote() {
  var today = new Date().toISOString().slice(0,10);
  var cached = localStorage.getItem(_QUOTE_KEY + today);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  // Günlük alıntı listesi — API yerine local (CORS sorunu olmaz)
  var quotes = [
    { text: 'Zamanı yönetemeyen hiçbir şeyi yönetemez.', author: 'Peter Drucker' },
    { text: 'Bugün yapabileceğini yarına bırakma.', author: 'Benjamin Franklin' },
    { text: 'Başarı tesadüf değil, hazırlık, sıkı çalışma ve hatalardan öğrenmektir.', author: 'Colin Powell' },
    { text: 'Önce işi bitir, sonra mükemmelleştir.', author: 'Mark Twain' },
    { text: 'Büyük işler küçük adımlarla yapılır.', author: 'Lao Tzu' },
    { text: 'Fırsatlar çalışkan insanların zihninde parlar.', author: 'Thomas Edison' },
    { text: 'Zorluklar içinde fırsatlar yatar.', author: 'Albert Einstein' },
    { text: 'Başarının sırrı başlamaktır.', author: 'Mark Twain' },
    { text: 'Disiplin, motivasyonun bittiği yerde devreye girer.', author: 'Elbert Hubbard' },
    { text: 'Küçük adımlar büyük değişimler yaratır.', author: 'Lao Tzu' },
    { text: 'Planlama yaparken uzun düşün, uygularken hızlı hareket et.', author: 'Sun Tzu' },
    { text: 'Kalite tesadüfen oluşmaz; her zaman yüksek niyetin sonucudur.', author: 'John Ruskin' },
    { text: 'Bir takımın gücü her üyesinden, her üyenin gücü takımdan gelir.', author: 'Phil Jackson' },
    { text: 'Verimliliğin sırrı önceliklendirmedir.', author: 'Stephen Covey' },
    { text: 'Hiçbir rüzgar, nereye gittiğini bilmeyen gemiye yardım edemez.', author: 'Seneca' },
    { text: 'İyi yapılmış iş, erken yapılmış iştir.', author: 'Konfüçyüs' },
    { text: 'Düşüncelerine iyi bak, çünkü onlar eylemlerin tohumu olur.', author: 'Ralph Emerson' },
    { text: 'Mükemmellik bir eylem değil, bir alışkanlıktır.', author: 'Aristoteles' },
    { text: 'Zor günler sizi daha güçlü yapar.', author: 'Roy T. Bennett' },
    { text: 'Her büyük başarı bir zamanlar imkansız görünüyordu.', author: 'Nelson Mandela' },
    { text: 'Enerjiyi değiştiremezsek davranışı değiştiremeyiz.', author: 'Jim Loehr' },
    { text: 'Detaylara dikkat etmek, mükemmelliğin başlangıcıdır.', author: 'Leonardo da Vinci' },
    { text: 'Takım çalışması hayali gerçeğe dönüştürür.', author: 'John C. Maxwell' },
    { text: 'Önce anlamaya çalış, sonra anlaşılmaya.', author: 'Stephen Covey' },
    { text: 'Bilgi güçtür, ama uygulanmış bilgi daha güçlüdür.', author: 'Francis Bacon' },
    { text: 'Sabah planla, öğlen uygula, akşam değerlendir.', author: 'Konfüçyüs' },
    { text: 'En büyük risk, hiç risk almamaktır.', author: 'Mark Zuckerberg' },
    { text: 'Odak noktanız sonucunuzu belirler.', author: 'T. Harv Eker' },
    { text: 'Kalıcı başarı için güven inşa et.', author: 'Stephen Covey' },
    { text: 'Fikirlerin değil uygulamanın peşinden git.', author: 'Thomas Edison' },
  ];
  // Günün tarihine göre sabit alıntı seç (her gün aynı alıntı)
  var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  var q = quotes[dayOfYear % quotes.length];
  localStorage.setItem(_QUOTE_KEY + today, JSON.stringify(q));
  return q;
}

function _startMorningRoutine(user) {
  if (!user) return;
  setInterval(function() {
    var now = new Date(); var today = now.toISOString().slice(0,10);
    var key = _MORNING_KEY + today;
    if (now.getHours()===9 && now.getMinutes()===0 && !localStorage.getItem(key)) {
      localStorage.setItem(key,'1'); _triggerMorningAlert(user);
    }
  }, 60000);
}

async function _triggerMorningAlert(user) {
  var cu = user || window.Auth?.getCU?.();
  var dayFocus = JSON.parse(localStorage.getItem('ak_pus_day_focus_'+(cu?.id||''))||'[]');
  var dayEmpty = dayFocus.length===0;
  if (window.addNotif) window.addNotif('☀️', dayEmpty ? "Gunaydin! Odak gorevleri secilmedi." : 'Gunaydin! '+dayFocus.length+' odak goreviniz var.', dayEmpty?'warn':'ok', 'pusula');
  if (window.toast) setTimeout(function(){ window.toast(dayEmpty?'☀️ Odak gorevleri!':'☀️ Gunaydin!', dayEmpty?'warn':'ok'); }, 500);
  try { var q = await _fetchDailyQuote(); if (q && window.setPusQuote) window.setPusQuote(q); } catch(e) {}
}


function generateSystemNotifs() {
  const today = new Date().toISOString().slice(0, 10);
  const soon  = new Date(); soon.setDate(soon.getDate() + 7);
  const soonS = soon.toISOString().slice(0, 10);

  // Geciken rutin ödemeler
  try {
    loadOdm().filter(o => o.status !== 'paid' && o.date && o.date < today).forEach(o => {
      addNotif('💳', `Geciken ödeme: ${o.title} (${(o.amount || 0).toLocaleString('tr-TR')} ₺)`, 'warn', 'odemeler');
    });
  } catch (e) {}

  // Geciken hedefler
  try {
    loadHdf().filter(h => h.to < today && h.status !== 'done').forEach(h => {
      addNotif('🎯', `Gecikmiş hedef: ${h.title}`, 'warn', 'hedefler');
    });
  } catch (e) {}

  // 7 gün içinde sona erecek resmi belgeler
  try {
    loadResmi().filter(r => r.exp && r.exp >= today && r.exp <= soonS).forEach(r => {
      addNotif('🏛️', `${r.name} belgesi 7 gün içinde sona eriyor!`, 'warn', 'resmi');
    });
  } catch (e) {}

  // Onay bekleyen kargo
  try {
    loadKargo().filter(k => k.status === 'bekle').slice(0, 2).forEach(k => {
      addNotif('📦', `Bekleyen kargo: ${k.from} → ${k.to}`, 'info', 'kargo');
    });
  } catch (e) {}

  // Tebligat 3 gün alarm
  try {
    const now = new Date();
    loadTebligat().filter(t => t.status === 'open').forEach(t => {
      const days = Math.floor((now - new Date(t.date)) / 86400000);
      if (days >= 3) addNotif('📬', `Tebligat ${days} gündür açık: "${t.title}"`, 'warn', 'tebligat');
    });
  } catch (e) {}

  // Platform güncelleme bildirimi (her sürümde bir kez)
  const lastSeen = localStorage.getItem('ak_last_seen_ver') || '0';
  if (lastSeen !== APP_VER) {
    const cl = CHANGELOG.find(c => c.v === APP_VER);
    if (cl) {
      addNotif('🆕', `Platform güncellendi v${APP_VER}: ${cl.note.slice(0, 80)}…`, 'info', 'settings');
    }
    localStorage.setItem('ak_last_seen_ver', APP_VER);
  }

  updateNotifBadge();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 17 — GLOBAL ARAMA (Ctrl+K)
// ════════════════════════════════════════════════════════════════

function openGSearch() {
  const overlay = _g('gsearch-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setTimeout(() => _g('gsearch-inp')?.focus(), 50);
  const inp = _g('gsearch-inp');
  if (inp) inp.value = '';
  const res = _g('gsearch-results');
  if (res) res.innerHTML = `<div class="gsr-empty">Tüm modüllerde arama yapın…<br><span style="font-size:11px;color:var(--t3)">Görev, müşteri, kargo, belge, rehber, not…</span></div>`;
  _GS_SEL = -1;
}

function closeGSearch(e) {
  if (!e || e.target === _g('gsearch-overlay')) {
    _g('gsearch-overlay')?.classList.remove('open');
  }
}

function gSearchKey(e) {
  const items = _g('gsearch-results')?.querySelectorAll('.gsr-item') || [];
  if (e.key === 'ArrowDown') {
    _GS_SEL = Math.min(_GS_SEL + 1, items.length - 1);
    items.forEach((el, i) => el.classList.toggle('sel', i === _GS_SEL));
    if (items[_GS_SEL]) items[_GS_SEL].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    _GS_SEL = Math.max(_GS_SEL - 1, 0);
    items.forEach((el, i) => el.classList.toggle('sel', i === _GS_SEL));
  } else if (e.key === 'Enter' && _GS_SEL >= 0) {
    items[_GS_SEL]?.click();
  }
}

function doGSearch(q) {
  q = (q || '').trim().toLowerCase();
  const res = _g('gsearch-results');
  if (!res) return;
  _GS_SEL = -1;

  if (q.length < 2) {
    res.innerHTML = `<div class="gsr-empty">En az 2 karakter girin…</div>`;
    return;
  }

  const cu      = window.Auth?.getCU?.();
  const results = [];

  // Görevler
  try {
    loadTasks()
      .filter(t => (t.title || '').toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q))
      .slice(0, 3).forEach(t => results.push({
        icon: '🧭', title: t.title, sub: `Görev · ${t.done ? 'Tamamlandı' : 'Devam ediyor'}`,
        module: 'pusula',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('pusula'); setTimeout(() => window.Pusula?.openDetail?.(t.id), 300); }
      }));
  } catch (e) {}

  // Notlar
  try {
    loadNotes()
      .filter(n => n.uid === cu?.id && ((n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)))
      .slice(0, 3).forEach(n => results.push({
        icon: '📝', title: n.title, sub: `Not · ${n.cat || ''}`,
        module: 'notes',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('notes'); setTimeout(() => window.viewNote?.(n.id), 300); }
      }));
  } catch (e) {}

  // CRM
  try {
    loadCrmData()
      .filter(c => (c.name || '').toLowerCase().includes(q) || (c.contact || '').toLowerCase().includes(q))
      .slice(0, 3).forEach(c => results.push({
        icon: '🤝', title: c.name, sub: `CRM · ${c.contact || ''}`,
        module: 'crm',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('crm'); setTimeout(() => window.openCrmModal?.(c.id), 300); }
      }));
  } catch (e) {}

  // Kargo
  try {
    loadKargo()
      .filter(k => (k.from || '').toLowerCase().includes(q) || (k.to || '').toLowerCase().includes(q) || (k.note || '').toLowerCase().includes(q))
      .slice(0, 3).forEach(k => results.push({
        icon: '📦', title: `${k.from} → ${k.to}`, sub: `Kargo · ${k.firm || ''} ${k.note ? '· ' + k.note : ''}`,
        module: 'kargo',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('kargo'); }
      }));
  } catch (e) {}

  // Rehber
  try {
    loadRehber()
      .filter(r => (r.name || '').toLowerCase().includes(q) || (r.phone || '').includes(q) || (r.company || '').toLowerCase().includes(q))
      .slice(0, 3).forEach(r => results.push({
        icon: '📒', title: r.name, sub: `Rehber · ${r.company || r.phone || ''}`,
        module: 'rehber',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('rehber'); }
      }));
  } catch (e) {}

  // Hedefler
  try {
    loadHdf()
      .filter(h => (h.title || '').toLowerCase().includes(q))
      .slice(0, 2).forEach(h => results.push({
        icon: '🎯', title: h.title, sub: `Hedef · ${h.status || ''}`,
        module: 'hedefler',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('hedefler'); }
      }));
  } catch (e) {}

  // Duyurular
  try {
    loadAnn()
      .filter(a => (a.title || '').toLowerCase().includes(q) || (a.body || '').toLowerCase().includes(q))
      .slice(0, 2).forEach(a => results.push({
        icon: '📣', title: a.title, sub: `Duyuru · ${a.type || ''}`,
        module: 'announce',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('announce'); }
      }));
  } catch (e) {}

  // Numune
  try {
    loadNumune()
      .filter(n => (n.name || '').toLowerCase().includes(q) || (n.code || '').toLowerCase().includes(q))
      .slice(0, 2).forEach(n => results.push({
        icon: '🧪', title: n.name, sub: `Numune · ${n.code || ''}`,
        module: 'numune',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('numune'); }
      }));
  } catch (e) {}

  // İK
  try {
    loadIk()
      .filter(p => (p.name || '').toLowerCase().includes(q) || (p.pos || '').toLowerCase().includes(q))
      .slice(0, 2).forEach(p => results.push({
        icon: '👥', title: p.name, sub: `İK · ${p.pos || ''}`,
        module: 'ik',
        action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('ik'); }
      }));
  } catch (e) {}

  // Kullanıcılar (admin)
  try {
    if (cu?.role === 'admin') {
      loadUsers()
        .filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
        .slice(0, 2).forEach(u => results.push({
          icon: '👤', title: u.name, sub: `Kullanıcı · ${u.email || ''}`,
          module: 'admin',
          action: () => { _g('gsearch-overlay').classList.remove('open'); goTo('admin'); }
        }));
    }
  } catch (e) {}

  if (!results.length) {
    res.innerHTML = `<div class="gsr-empty">❌ "<strong>${q}</strong>" için sonuç bulunamadı.</div>`;
    return;
  }

  res.innerHTML = results.map((r, i) => `
    <div class="gsr-item${i === _GS_SEL ? ' sel' : ''}" data-idx="${i}">
      <span style="font-size:16px;flex-shrink:0">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
        <div style="font-size:11px;color:var(--t2)">${r.sub || ''}</div>
      </div>
      <span class="gsr-mod">${r.module}</span>
    </div>`).join('');

  // Event delegation — direct callbacks
  res.querySelectorAll('.gsr-item').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.addEventListener('click', () => { if (results[idx]) results[idx].action(); });
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 18 — SİDEBAR & MOBİL
// ════════════════════════════════════════════════════════════════

function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = _g('mob-overlay');
  if (!sb || !ov) return;
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}

/**
 * Sidebar grup başlıklarının aç/kapat durumunu yönetir.
 * @param {string} nsId  nsec element ID
 */
function toggleNsec(nsId) {
  const nsEl = _g(nsId);
  if (!nsEl) return;
  const sidebar    = nsEl.closest('aside') || nsEl.parentElement;
  const allNsec    = [...sidebar.querySelectorAll('.nsec')];
  const nsIdx      = allNsec.indexOf(nsEl);
  const nextNsec   = allNsec[nsIdx + 1];
  const buttons    = [];
  let sib          = nsEl.nextElementSibling;
  while (sib && sib !== nextNsec) {
    if (sib.classList.contains('nb')) buttons.push(sib);
    sib = sib.nextElementSibling;
  }
  const isCollapsed = nsEl.classList.contains('collapsed');
  if (isCollapsed) {
    nsEl.classList.remove('collapsed');
    buttons.forEach(b => { b.style.display = 'flex'; b.style.opacity = '1'; });
  } else {
    nsEl.classList.add('collapsed');
    buttons.forEach(b => { b.style.display = 'none'; });
  }
  const state = loadNsecState();
  state[nsId] = !isCollapsed;
  saveNsecState(state);
}

/** Sidebar grup durumlarını localStorage'dan geri yükler */
function _initNsecState() {
  const state   = loadNsecState();
  const sidebar = document.querySelector('aside.sidebar');
  if (!sidebar) return;
  const allNsec = [...sidebar.querySelectorAll('.nsec')];
  allNsec.forEach(nsEl => {
    const nsId = nsEl.id;
    if (!nsId) return;
    const nsIdx   = allNsec.indexOf(nsEl);
    const nextSec = allNsec[nsIdx + 1];
    const buttons = [];
    let sib       = nsEl.nextElementSibling;
    while (sib && sib !== nextSec) {
      if (sib.classList.contains('nb')) buttons.push(sib);
      sib = sib.nextElementSibling;
    }
    if (state[nsId] === true) {
      nsEl.classList.add('collapsed');
      buttons.forEach(b => { b.style.display = 'none'; });
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 19 — PIN BAR
// ════════════════════════════════════════════════════════════════

function renderPinbar() {
  const cont = _g('pinbar-links');
  if (!cont) return;
  cont.innerHTML = '';
  const cu = window.Auth?.getCU?.();
  if (!cu) return;

  loadLinks()
    .filter(l => _canSeeLink(l, cu))
    .forEach(l => {
      const a     = document.createElement('a');
      a.className = 'plink';
      a.href      = l.url;
      a.target    = '_blank';
      a.rel       = 'noopener noreferrer';
      const canDel = cu.role === 'admin' || l.owner === cu.id;
      a.innerHTML = `<span style="font-size:13px">${l.icon || '🌐'}</span>
        <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.name}</span>
        ${canDel ? `<span class="pldel" onclick="event.preventDefault();event.stopPropagation();App.deletePin(${l.id})" title="Kaldır">✕</span>` : ''}
        <span class="ptip">${(l.desc || l.url || '').slice(0, 60)}</span>`;
      cont.appendChild(a);
    });
}

function _canSeeLink(l, cu) {
  if (!cu) return false;
  if (cu.role === 'admin') return true;
  if (l.owner === cu.id)  return true;
  if (l.owner !== 0)      return false;
  if (l.vis === 'all')    return true;
  if (l.vis === 'roles')  return (l.visRoles || []).includes(cu.role);
  if (l.vis === 'users')  return (l.visUsers || []).includes(cu.id);
  return false;
}

function openPinModal(editId) {
  if (_g('pin-url'))    _g('pin-url').value    = '';
  if (_g('pin-name'))   _g('pin-name').value   = '';
  if (_g('pin-icon'))   _g('pin-icon').value   = '';
  if (_g('pin-eid'))    _g('pin-eid').value     = editId || '';
  if (_g('pin-desc'))   _g('pin-desc').value   = '';
  const as = _g('pin-admin-sec');
  const cu = window.Auth?.getCU?.();
  if (as) as.style.display = cu?.role === 'admin' ? 'block' : 'none';
  const vs = _g('pin-vis');
  if (vs) vs.value = 'private';
  openMo('mo-pin');
}

function deletePin(id) {
  window.confirmModal('Bu linki kaldırmak istediğinizden emin misiniz?', {
    title: 'Link Kaldır',
    danger: true,
    confirmText: 'Evet, Kaldır',
    onConfirm: () => {
      saveLinks(loadLinks().filter(l => l.id !== id));
      renderPinbar();
      toast('Link kaldırıldı', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 20 — TÜM BADGE'LARI GÜNCELLE
// ════════════════════════════════════════════════════════════════

/** Tüm sidebar badge'lerini tek seferde günceller */
function updateAllBadges() {
  const safe = fn => { try { fn(); } catch (e) {} };

  // Duyuru
  safe(() => window.updateAnnBadge?.());
  // Görev
  safe(() => window.Pusula?.updateBadge?.());
  // Puantaj
  safe(() => window.updatePuanBadge?.());
  // Bildirim noktası
  safe(updateNotifBadge);
  // İzin
  safe(() => {
    const iz  = loadIzin();
    const nb  = _g('nb-izin-b');
    if (nb) { const n = iz.filter(x => x.status === 'pending').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // Prim
  safe(() => {
    const prm = loadPirim();
    const nb  = _g('nb-pirim-b');
    if (nb) { const n = prm.filter(p => p.status === 'pending').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // Kargo
  safe(() => {
    const krg = loadKargo();
    const nb  = _g('nb-krg-b');
    if (nb) { const n = krg.filter(k => k.status === 'bekle').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // Hedefler
  safe(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nb    = _g('nb-hdf-b');
    if (nb) { const n = loadHdf().filter(h => h.to < today && h.status !== 'done').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // Görüşme onay bekleyen
  safe(() => { window.updateGrtBadge?.(); });
  // Stok onay bekleyen
  safe(() => {
    const stk = window.loadStok?.() || [];
    const nb  = _g('nb-stok-b');
    if (nb) { const n = stk.filter(s => s.status === 'bekle' && !s.approved).length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // Tebligat alarm
  safe(() => {
    const teb = window.loadTebligat?.() || [];
    const nb  = _g('nb-teb-b');
    if (nb) { const n = teb.filter(t => t.status === 'open').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  });
  // CRM lead
  safe(() => { window.renderCrm && window.renderCrm(); });
}

function updateDashboardActs() {
  const cu = window.Auth?.getCU?.();
  if (!cu) return;
  if (_g('panel-dashboard')?.classList.contains('on')) _renderDashboard();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 21 — ATIL OTURUM ZAMANLAYICISI
// ════════════════════════════════════════════════════════════════

function _resetIdleTimer() {
  clearTimeout(_IDLE_TIMER);
  // 25 dakika hareketsizlik → uyarı bildirimi
  _IDLE_TIMER = setTimeout(() => {
    const cu = window.Auth?.getCU?.();
    if (cu) addNotif('⏰', 'Oturum 5 dakika içinde kapanacak. Hareket edin.', 'warn');
  }, 25 * 60 * 1000);
}

document.addEventListener('mousemove', _resetIdleTimer);
document.addEventListener('keydown',   _resetIdleTimer);

// ════════════════════════════════════════════════════════════════
// BÖLÜM 22 — PDF MODÜL RAPORU
// ════════════════════════════════════════════════════════════════

/**
 * Seçilen modül için print penceresi açar.
 * @param {string} modId  'pusula' | 'ik' | 'crm' | 'resmi' | ...
 */
function printModuleReport(modId) {
  const cu    = window.Auth?.getCU?.();
  const TITLES = { pusula:'Görev Raporu', puantaj:'Puantaj Raporu', kargo:'Kargo Raporu', ik:'İK Raporu', crm:'CRM Raporu', odemeler:'Ödeme Raporu', hedefler:'Hedefler Raporu', numune:'Numune Raporu', resmi:'Resmi Evrak Raporu' };
  const win   = window.open('', '_blank', 'width=800,height=900');
  if (!win) { toast('Popup engellendi. Tarayıcı ayarlarını kontrol edin.', 'err'); return; }
  let body = '';

  if (modId === 'pusula') {
    const users = loadUsers();
    const tasks = window.Pusula?.visTasks?.() || loadTasks();
    body = `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
      <thead style="background:#f5f5f5"><tr><th>Görev</th><th>Sorumlu</th><th>Öncelik</th><th>Son Tarih</th><th>Durum</th></tr></thead>
      <tbody>${tasks.map(t => { const u = users.find(x => x.id === t.uid) || { name:'?' }; return `<tr><td>${t.title}</td><td>${u.name}</td><td>${{1:'Kritik',2:'Önemli',3:'Normal',4:'Düşük'}[t.pri]||'?'}</td><td>${t.due||'—'}</td><td>${t.done?'Tamamlandı':'Devam'}</td></tr>`; }).join('')}</tbody>
    </table>`;
  } else if (modId === 'ik') {
    const ik = loadIk();
    const IK_STAGES = ['1.Teklif','2.Belgeler','3.SGK','4.Oryantasyon','5.Deneme','6.Tam Kadro'];
    body = `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
      <thead style="background:#f5f5f5"><tr><th>Ad Soyad</th><th>Pozisyon</th><th>Başlangıç</th><th>Durum</th><th>Aşama</th></tr></thead>
      <tbody>${ik.map(p => `<tr><td>${p.name}</td><td>${p.pos||'—'}</td><td>${p.start||'—'}</td><td>${p.status}</td><td>${IK_STAGES[p.stage]||'—'}</td></tr>`).join('')}</tbody>
    </table>`;
  } else if (modId === 'crm') {
    const crm   = loadCrmData();
    const users = loadUsers();
    body = `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
      <thead style="background:#f5f5f5"><tr><th>Firma</th><th>Yetkili</th><th>Şehir</th><th>Durum</th><th>Potansiyel</th></tr></thead>
      <tbody>${crm.map(c => { const u = users.find(x => x.id === c.owner) || { name:'?' }; return `<tr><td>${c.name}</td><td>${c.contact||'—'}</td><td>${c.city||'—'}</td><td>${c.status}</td><td>${(c.value||0).toLocaleString('tr-TR')} ₺</td></tr>`; }).join('')}</tbody>
    </table>`;
  } else if (modId === 'resmi') {
    const rm = loadResmi();
    body = `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
      <thead style="background:#f5f5f5"><tr><th>Belge</th><th>Tür</th><th>Kurum</th><th>Son Geçerlilik</th></tr></thead>
      <tbody>${rm.map(r => `<tr><td>${r.name}</td><td>${r.cat}</td><td>${r.inst||'—'}</td><td>${r.exp||'Süresiz'}</td></tr>`).join('')}</tbody>
    </table>`;
  } else {
    body = `<p>Bu modül için PDF raporu henüz desteklenmiyor. Excel çıktısı kullanınız.</p>`;
  }

  win.document.write(`<!DOCTYPE html><html><head><title>${TITLES[modId]||'Rapor'}</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}h1{font-size:18px;margin-bottom:6px}h2{font-size:13px;font-weight:normal;color:#666;margin-bottom:20px}table{width:100%}th{text-align:left}footer{margin-top:30px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}</style>
    </head><body>
    <h1>Duay Global LLC — ${TITLES[modId]||'Rapor'}</h1>
    <h2>Oluşturulma: ${nowTs()} · ${cu?.name||'?'}</h2>
    ${body}
    <footer>Duay Global LLC v${APP_VER} · Gizli ve Şirkete Özel</footer>
    <script>window.print();<\/script></body></html>`);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 23 — VERİ SIFIRLAMA
// ════════════════════════════════════════════════════════════════

/**
 * Demo verilerini localStorage'dan temizler ve sayfayı yeniden yükler.
 * (Yalnızca geliştirme/test için)
 */
function resetDemoData() {
  window.confirmModal('Tüm veriler sıfırlanacak.\n\nBu işlem geri alınamaz!', {
    title: 'Veriyi Sıfırla',
    danger: true,
    confirmText: 'Evet, Sıfırla',
    onConfirm: () => {
      const KEYS_TO_CLEAR = [
        'ak_u3','ak_pn2','ak_tk2','ak_cal2','ak_sk1','ak_ann1','ak_lnk2','ak_nt1',
        'ak_act1','ak_lang','ak_theme','ak_nview','ak_pus_view','ak_session',
      ];
      KEYS_TO_CLEAR.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      location.reload();
    }
  });
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM — window.App
// ════════════════════════════════════════════════════════════════

/** Tüm public fonksiyonlar App nesnesi üzerinden erişilebilir */
const App = {
  // Init
  init,
  // Panel
  nav, goTo,
  // Auth
  login, logout,
  // UI yardımcıları
  toast, openMo, closeMo, toggleSidebar,
  // Tema & Dil
  toggleTheme, setLang,
  // Profil
  toggleProfilePanel, openProfileEdit, saveProfile,
  // Bildirimler
  toggleNotifPanel, markAllNotifRead, clearAllNotifs, updateNotifBadge,
  // Global arama
  openGSearch, closeGSearch, doGSearch, gSearchKey,
  // Pinbar
  renderPinbar, openPinModal, deletePin,
  // Badge'ler
  updateAllBadges, updateDashboardActs,
  // Sürüm
  updateVersionUI,
  // Sistem bildirimleri
  generateSystemNotifs,
  // PDF
  printModuleReport,
  // Veri
  resetDemoData,
  // Yardımcılar
  initials, canModule,
  // Sabitler
  APP_VER, APP_BUILD, CHANGELOG, ALL_MODULES, ROLE_DEFAULT_MODULES,
};

window.ALL_MODULES = ALL_MODULES;
window.ROLE_DEFAULT_MODULES = ROLE_DEFAULT_MODULES;
window.App = App;

// ── Geriye uyumluluk — eski HTML inline onclick='nav(...)' çağrıları ──
window.nav              = nav;
window.goTo             = goTo;

/**
 * Aktif paneli tespit edip render fonksiyonunu çağırır.
 * İlk veri yüklemesi sonrası çağrılır.
 */
/**
 * Otomatik Firebase kullanıcı senkronizasyonu.
 * Firebase Auth'ta olmayan platformdaki kullanıcıları pasif olarak işaretler.
 * Sadece admin login'inde çalışır.
 */
/**
 * Otomatik Firebase kullanıcı senkronizasyonu — DEVRİ DIŞI.
 *
 * NEDEN: Google, fetchSignInMethodsForEmail() API'sini Email Enumeration
 * Protection kapsamında kısıtladı. Kayıtlı e-postalar için bile boş
 * dizi [] döndürüyor. Bu da TÜM kullanıcıların yanlışlıkla inactive
 * olarak işaretlenmesine yol açıyordu.
 *
 * ALTERNATİF: Admin panelindeki firebaseSync() butonu (admin.js)
 * manuel olarak kullanılabilir — orada fetchSignInMethods yerine
 * kullanıcı listesi karşılaştırması yapılmalı.
 */
async function _autoFirebaseUserSync() {
  // fetchSignInMethodsForEmail güvenilmez — otomatik sync devre dışı
  console.info('[UserSync] Otomatik sync devre dışı (fetchSignInMethods kısıtlaması)');
}

// ════════════════════════════════════════════════════════════════
// PERSONEL DEVAM TAKİBİ — IP bazlı
// ════════════════════════════════════════════════════════════════

/**
 * Giriş sırasında IP çeker, mesai saati + kayıtlı IP kontrolü yapar.
 * Puantaj'a otomatik işler.
 */
async function _trackAttendance(user) {
  if (!user) return;
  try {
    // Mesai ayarları (admin tanımlar)
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('ak_mesai_settings') || '{}'); } catch(e) {}
    var mesaiStart = settings.start || '09:00';
    var mesaiEnd = settings.end || '18:00';

    // IP çek
    var userIp = '—';
    try {
      var res = await fetch('https://api.ipify.org?format=json');
      var data = await res.json();
      userIp = data.ip || '—';
    } catch(e) { userIp = 'bilinmiyor'; }

    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    var today = now.toISOString().slice(0, 10);

    // Kayıtlı IP kontrolü
    var registeredIp = user.workIp || '';
    var isRemote = registeredIp && userIp !== registeredIp && userIp !== 'bilinmiyor';
    var isLate = timeStr > mesaiStart;
    var workType = isRemote ? 'uzaktan' : 'ofis';

    // Puantaj'a kaydet
    var puan = typeof loadPuan === 'function' ? loadPuan() : [];
    var existingToday = puan.find(function(p) { return p.uid === user.id && p.date === today; });
    if (!existingToday) {
      puan.unshift({
        id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(),
        uid: user.id,
        uname: user.name,
        date: today,
        loginTime: timeStr,
        loginIp: userIp,
        workType: workType,
        isLate: isLate,
        mesaiStart: mesaiStart,
        status: isLate ? 'gec' : 'normal',
      });
      if (typeof savePuan === 'function') savePuan(puan);
      console.info('[Devam] Puantaj kaydedildi:', user.name, workType, isLate ? '(geç)' : '');
    }

    // Uzaktan çalışma bildirimi
    if (isRemote) {
      var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
        return (u.role === 'admin' || u.role === 'manager') && u.status === 'active' && u.id !== user.id;
      });
      mgrs.forEach(function(m) {
        window.addNotif?.('🏠', user.name + ' uzaktan giriş yaptı (IP: ' + userIp + ')', 'info', 'admin', m.id);
      });
    }
    // Geç giriş bildirimi
    if (isLate && !isRemote) {
      var mgrs2 = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
        return (u.role === 'admin' || u.role === 'manager') && u.status === 'active' && u.id !== user.id;
      });
      mgrs2.forEach(function(m) {
        window.addNotif?.('⏰', user.name + ' geç giriş: ' + timeStr + ' (mesai: ' + mesaiStart + ')', 'warn', 'admin', m.id);
      });
    }

    // Aktivite loguna IP ekle
    logActivity('attendance', workType + ' giriş — IP: ' + userIp + (isLate ? ' (GEÇ ' + timeStr + ')' : ''));
  } catch(e) {
    console.warn('[Devam] Hata:', e.message);
  }
}

/** Admin mesai saati ayarları */
window.openMesaiSettings = function() {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('ak_mesai_settings') || '{}'); } catch(e) {}
  var ex = document.getElementById('mo-mesai'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-mesai'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:380px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">⏰ Mesai Ayarları</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">BAŞLANGIÇ</div><input type="time" class="fi" id="mesai-start" value="' + (settings.start || '09:00') + '"></div>'
    + '<div><div class="fl">BİTİŞ</div><input type="time" class="fi" id="mesai-end" value="' + (settings.end || '18:00') + '"></div>'
    + '</div></div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-mesai\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="localStorage.setItem(\'ak_mesai_settings\',JSON.stringify({start:document.getElementById(\'mesai-start\').value,end:document.getElementById(\'mesai-end\').value}));document.getElementById(\'mo-mesai\')?.remove();window.toast?.(\'Mesai ayarları kaydedildi\',\'ok\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

// ════════════════════════════════════════════════════════════════
// RAPORLAMA SİSTEMİ — 4 temel rapor
// ════════════════════════════════════════════════════════════════

window.openReportPanel = function() {
  var ex = document.getElementById('mo-reports'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-reports'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 22px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">📊 Raporlama Merkezi</div><div style="font-size:10px;color:var(--t3)">PDF ve Excel çıktı alın</div></div>'
    + '<button onclick="document.getElementById(\'mo-reports\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    // Ödeme/Tahsilat Raporu
    + '<div onclick="window._openOdmReport()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">💸</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Ödeme/Tahsilat</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Tarih, cari, döviz filtreli</div></div>'
    // Görev Raporu
    + '<div onclick="window._openTaskReport()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">📋</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Görev Raporu</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Departman, durum, kullanıcı</div></div>'
    // Cari Hesap Özeti
    + '<div onclick="window._openCariReport()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">🏢</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Cari Hesap Özeti</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">3 format: müşteri/user/admin</div></div>'
    // Kargo Raporu
    + '<div onclick="window._openKargoReport()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">📦</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Kargo Raporu</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Konteyner bazlı</div></div>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** Ödeme/Tahsilat raporu — filtre + Excel */
window._openOdmReport = function() {
  document.getElementById('mo-reports')?.remove();
  var ex = document.getElementById('mo-odm-report'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-report'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">💸 Ödeme/Tahsilat Raporu</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">BAŞLANGIÇ</div><input type="date" class="fi" id="rpt-odm-from"></div>'
    + '<div><div class="fl">BİTİŞ</div><input type="date" class="fi" id="rpt-odm-to"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">CARİ</div><select class="fi" id="rpt-odm-cari"><option value="">Tümü</option>'
    + (typeof loadCari === 'function' ? loadCari().map(function(c) { return '<option value="' + (c.name || '') + '">' + (c.name || '') + '</option>'; }).join('') : '')
    + '</select></div>'
    + '<div><div class="fl">PARA BİRİMİ</div><select class="fi" id="rpt-odm-cur"><option value="">Tümü</option><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div></div>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-report\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._generateOdmReport()">📊 Rapor Oluştur</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._generateOdmReport = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var from = document.getElementById('rpt-odm-from')?.value || '';
  var to = document.getElementById('rpt-odm-to')?.value || '';
  var cari = document.getElementById('rpt-odm-cari')?.value || '';
  var cur = document.getElementById('rpt-odm-cur')?.value || '';

  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  odm = odm.filter(function(o) { return !o.isDeleted; });
  tah = tah.filter(function(t) { return !t.isDeleted; });
  if (from) { odm = odm.filter(function(o) { return o.due >= from; }); tah = tah.filter(function(t) { return t.due >= from; }); }
  if (to) { odm = odm.filter(function(o) { return o.due <= to; }); tah = tah.filter(function(t) { return t.due <= to; }); }
  if (cari) { odm = odm.filter(function(o) { return o.cariName === cari; }); tah = tah.filter(function(t) { return t.cariName === cari; }); }
  if (cur) { odm = odm.filter(function(o) { return o.currency === cur; }); tah = tah.filter(function(t) { return t.currency === cur; }); }

  var rows = [['Tür','Ad','Cari','Tutar','Döviz','TL Karşılığı','Vade','Durum','Yöntem','Doküman No']];
  odm.forEach(function(o) { rows.push(['Ödeme', o.name||'', o.cariName||'', o.amount||0, o.currency||'TRY', o.amountTRY||o.amount||0, o.due||'', o.paid?'Ödendi':'Bekliyor', o.yontem||'', o.docNo||'']); });
  tah.forEach(function(t) { rows.push(['Tahsilat', t.name||'', t.cariName||'', t.amount||0, t.currency||'TRY', t.amountTRY||t.amount||0, t.due||'', t.collected?'Tahsil':'Bekliyor', t.yontem||'', t.ref||'']); });

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Rapor');
  XLSX.writeFile(wb, 'odeme-tahsilat-rapor-' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Rapor indirildi ✓', 'ok');
  document.getElementById('mo-odm-report')?.remove();
};

/** Görev raporu */
window._openTaskReport = function() {
  document.getElementById('mo-reports')?.remove();
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  if (typeof exportTasksXlsx === 'function') exportTasksXlsx();
  else window.toast?.('Görev export fonksiyonu bulunamadı', 'err');
};

/** Cari raporu */
window._openCariReport = function() {
  document.getElementById('mo-reports')?.remove();
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c) { return !c.isDeleted; }) : [];
  if (!cariList.length) { window.toast?.('Cari kaydı yok', 'err'); return; }
  if (typeof openCariStatement === 'function') openCariStatement(cariList[0].id, 'user');
  else window.toast?.('Cari özet fonksiyonu bulunamadı', 'err');
};

/** Kargo raporu */
window._openKargoReport = function() {
  document.getElementById('mo-reports')?.remove();
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  if (typeof exportKargoXlsx === 'function') exportKargoXlsx();
  else window.toast?.('Kargo export fonksiyonu bulunamadı', 'err');
};

window._renderActivePanel = function() {
  var activePanel = document.querySelector('.panel.on');
  if (!activePanel) return;
  var id = (activePanel.id || '').replace('panel-', '');
  if (id) {
    console.info('[App] Aktif panel yeniden render:', id);
    _renderPanel(id);
  }
};
window.toast            = toast;
window.openMo           = openMo;
window.closeMo          = closeMo;
window.toggleTheme      = toggleTheme;
window.setLang          = setLang;
window.toggleSidebar    = toggleSidebar;

/** Sidebar collapse/expand toggle — durum localStorage'a kaydedilir */
window._toggleSidebarCollapse = function() {
  var sb = document.querySelector('.sidebar');
  if (!sb) return;
  var isCollapsed = sb.classList.toggle('collapsed');
  localStorage.setItem('ak_sidebar_collapsed', isCollapsed ? '1' : '0');
  var btn = document.getElementById('sidebar-collapse-btn');
  if (btn) btn.querySelector('span').textContent = isCollapsed ? '▸' : '◂';
};

/** Sidebar menü renk teması */
window._setSidebarTheme = function(theme) {
  var sb = document.querySelector('.sidebar');
  if (!sb) return;
  // Mevcut tema sınıflarını kaldır
  ['sidebar-dark','sidebar-navy','sidebar-green','sidebar-purple'].forEach(function(c) { sb.classList.remove(c); });
  if (theme && theme !== 'default') sb.classList.add('sidebar-' + theme);
  localStorage.setItem('ak_sidebar_theme', theme || 'default');
};

/** Sayfa yüklenince sidebar durumunu uygula */
(function _initSidebarState() {
  setTimeout(function() {
    // Collapse
    if (localStorage.getItem('ak_sidebar_collapsed') === '1') {
      var sb = document.querySelector('.sidebar');
      if (sb) sb.classList.add('collapsed');
      var btn = document.getElementById('sidebar-collapse-btn');
      if (btn) btn.querySelector('span').textContent = '▸';
    }
    // Tema
    var theme = localStorage.getItem('ak_sidebar_theme') || 'default';
    if (theme !== 'default') window._setSidebarTheme(theme);
  }, 100);
})();
window.toggleNsec       = toggleNsec;
window.openGSearch      = openGSearch;
window.closeGSearch     = closeGSearch;
window.doGSearch        = doGSearch;
window.gSearchKey       = gSearchKey;
window.toggleNotifPanel = toggleNotifPanel;
window.markAllNotifRead = markAllNotifRead;
window.clearAllNotifs   = clearAllNotifs;
window.updateNotifBadge = updateNotifBadge;
window.renderPinbar     = renderPinbar;
window.openPinModal     = openPinModal;
window.updateAllBadges  = updateAllBadges;
window.updateDashboardActs = updateDashboardActs;
window.updateVersionUI  = updateVersionUI;
window.generateSystemNotifs    = generateSystemNotifs;
window._checkPendingTaskNotifs = _checkPendingTaskNotifs;
window._startMorningRoutine    = _startMorningRoutine;
window._triggerMorningAlert    = _triggerMorningAlert;
window._fetchDailyQuote        = _fetchDailyQuote;
window.printModuleReport = printModuleReport;
window.initials         = initials;
window.canModule        = canModule;
window.toggleProfilePanel = toggleProfilePanel;
window.openProfileEdit  = openProfileEdit;
window.saveProfile      = saveProfile;

// ── Otomatik başlatma ────────────────────────────────────────────
// DOMContentLoaded beklemeden çağrılır — script defer olmadığından
// DOM zaten hazırdır (index.html'de body sonunda yüklenir).
App.init();

// ════════════════════════════════════════════════════════════════
// ADMIN vs USER UI AYRIMI
// ════════════════════════════════════════════════════════════════
function _applyRoleUI(user) {
  if (!user) return;
  const isAdm = (user.role === 'admin' || user.role === 'manager');
  const isLead = (user.role === 'lead');

  // Pusula hero butonları
  const adminOnlyBtns = [
    'btn-pus-analiz',   // Personel analizi
  ];
  // Excel butonları user için de görünür (kendi verilerini indirebilir)
  // Gantt, Odak, Notlar, Şablonlar herkese açık

  adminOnlyBtns.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdm ? '' : 'none';
  });

  // Görev listesi — user sadece kendi görevlerini görür
  // Bu zaten visTasks() içinde kontrol ediliyor ama
  // hero'daki Tüm Personel filtresi gizlensin
  const pusUsel = document.getElementById('pus-usel');
  if (pusUsel) pusUsel.style.display = isAdm ? '' : 'none';

  // User için hero başlığını kişiselleştir
  const heroSub = document.getElementById('ph-pus-s');
  if (heroSub && !isAdm) {
    heroSub.textContent = 'Görevleriniz · ' + user.name;
  } else if (heroSub && isAdm) {
    heroSub.textContent = 'Görev yönetim merkezi';
  }

  // User için görev ekleme — sadece kendine
  // saveTask'ta uid zaten CU.id'ye kilitleniyor — kontrol var

  // User ekranında Gantt butonu görünür
  // Board, Liste, Benim, Gantt — hepsi görünür

  // Workload paneli butonu — user için gizle
  const btnAnaliz = document.getElementById('btn-pus-analiz');
  if (btnAnaliz) btnAnaliz.style.display = isAdm || isLead ? '' : 'none';

  // Body'e role class'ı ekle — CSS hook için
  document.body.classList.remove('role-admin','role-manager','role-lead','role-staff');
  document.body.classList.add('role-' + (user.role || 'staff'));

  // User için kişisel dashboard badge'leri güncelle
  if (!isAdm) {
    // User sadece kendi görevlerini sayar
    setTimeout(() => window.updatePusBadge?.(), 500);
  }

  console.info('[UI] Role applied:', user.role);
}

// CSS role classes
(function _injectRoleCSS() {
  if (document.getElementById('role-ui-css')) return;
  const s = document.createElement('style');
  s.id = 'role-ui-css';
  s.textContent = `
    /* User ekranı — admin-only elementleri gizle */
    .role-staff .admin-only { display: none !important; }
    .role-staff .manager-only { display: none !important; }

    /* User hero — daha sade görünüm */
    .role-staff .pus-hero { background: linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 100%); }

    /* User için görev kartları — sadece kendi kartları */
    .role-staff .tk-row .tk-action-btn { opacity: 1; }
  `;
  document.head.appendChild(s);
})();

window._applyRoleUI = _applyRoleUI;

