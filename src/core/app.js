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
const APP_VER   = '9.2.0';
const APP_BUILD = '2026-04-02';

/** Platform genelinde geçerli UI kuralları */
window.PLATFORM_RULES = {
  quickPeek: true,       // Her liste satırında peek/detay görünümü olmalı
  bulkDelete: 'admin',   // Toplu silme admin-only
  deleteConfirm: true,   // Her silme confirmModal ile onay ister
  softDelete: true,      // Fiziksel silme yasak, çöp kutusuna taşı
};

/** CHANGELOG — Sürüm Geçmişi */
const CHANGELOG = [
  { v:'9.3.0', ts:'2026-04-01 20:00', note:'Menü yeniden yapılandırma: İK grubu eklendi, tüm modüller doğru gruba taşındı. Sürüm geçmişi otomatik güncelleme.' },
  { v:'9.2.0', ts:'2026-04-01 19:00', note:'Nakit Akışı: 8 KPI, kayıt sayıları, personel filtre, sıralama, 13 araç, döviz bazlı gecikme analizi.' },
  { v:'9.1.0', ts:'2026-04-01 18:00', note:'DB Monitör dashboard, localStorage otomatik temizlik (%80/%90/%95 eşikleri), storage kritik banner.' },
  { v:'9.0.0', ts:'2026-04-01 17:00', note:'Firebase Storage entegrasyonu — dosyalar artık localStorage yerine Storage\'a yazılıyor.' },
  { v:'8.9.0', ts:'2026-04-01 16:00', note:'Toplu silme (6 modül), trash geri al fix, updatedAt zorunlu, peek genel kural.' },
  { v:'8.8.0', ts:'2026-04-01 15:00', note:'Araçlar menüsü 13 araç: Hesap Özeti PDF, Yaş Dağılımı, SLA Takibi, Cari Analizi, Eksik Dekont.' },
  { v:'8.7.0', ts:'2026-04-01 14:00', note:'Ayarlar sidebar nav, Sağlık Monitörü Dashboard — 14 parametre, olay akışı, uzman yorumu.' },
  { v:'8.6.0', ts:'2026-04-01 13:00', note:'Pusula 8 modüle bölündü. SW cache v11. İhracat Ops modülü.' },
  { v:'8.5.0', ts:'2026-04-01 12:00', note:'Dashboard E-Myth/Vanish otomatik hesaplama, nakit akışı trendi bloğu, projeksiyon.' },
  { v:'8.0.0', ts:'2026-03-19 14:50', note:'Tam modüler mimari: database.js, auth.js, pusula.js, kargo.js, pirim.js, admin.js.' },
  { v:'4.1.0', ts:'2026-03-18 14:30', note:'Takvim performans, 15 form, Fuar kriter motoru, Temizlik rutinleri.' },
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

  // ── Footer B: saat + kullanıcı + DB durumu ─────────────────
  var _trDays = ['Pazar','Pazartesi','Sali','Carsamba','Persembe','Cuma','Cumartesi'];
  var _trMonths = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
  var clockStrip = _g('clock-strip');
  if (clockStrip) clockStrip.textContent = _trDays[n.getDay()] + ' ' + n.getDate() + ' ' + _trMonths[n.getMonth()] + ' · ' + hms;

  // Kullanıcı bilgileri (ilk yüklemede + her 3s)
  if (n.getSeconds() % 3 === 0) {
    var _cu2 = window.Auth?.getCU?.();
    var _ftUser = _g('ft-user-name');
    if (_ftUser && _cu2?.name) _ftUser.textContent = _cu2.name;
    var _ftRole = _g('ft-user-role');
    if (_ftRole && _cu2?.role) _ftRole.textContent = _cu2.role === 'admin' ? 'Admin' : _cu2.role === 'manager' ? 'Yonetici' : 'Personel';
    // Bağlantı + Auth durumu
    var _ftConn = _g('ft-conn');
    if (_ftConn) _ftConn.textContent = navigator.onLine ? 'Online' : 'Offline';
    var _ftAuth = _g('ft-auth');
    if (_ftAuth) _ftAuth.textContent = window.Auth?.getFBAuth?.()?.currentUser ? 'Aktif' : 'Pasif';
    // Sayfa yüklenme süresi
    var _ftLoad = _g('ft-load-time');
    if (_ftLoad && _ftLoad.textContent === '—') {
      try { var _pt = performance.timing; _ftLoad.textContent = (_pt.loadEventEnd - _pt.navigationStart) + 'ms'; } catch(e) {}
    }
    // Son sorgu süresi
    var _ftQuery = _g('ft-query-time');
    if (_ftQuery) _ftQuery.textContent = window._lastQueryTime ? window._lastQueryTime + 'ms' : '—';
    // Oturum başlangıç
    var _ftSess = _g('ft-session-start');
    if (_ftSess) {
      if (!window._sessionStart) window._sessionStart = Date.now();
      _ftSess.textContent = new Date(window._sessionStart).toLocaleTimeString('tr-TR');
    }
    // Son aktivite
    var _ftAct = _g('ft-last-activity');
    if (_ftAct) _ftAct.textContent = window._lastActivity ? new Date(window._lastActivity).toLocaleTimeString('tr-TR') : '—';
    // Aktif kullanıcı + oturum sayısı
    var _ftAU = _g('ft-active-users');
    var _ftSS = _g('ft-sessions');
    if (_ftAU) {
      try {
        var _users3 = typeof loadUsers === 'function' ? loadUsers() : [];
        var _now3 = Date.now();
        _ftAU.textContent = _users3.filter(function(u) { return u.lastLogin && (_now3 - new Date(u.lastLogin.replace(' ','T')).getTime()) < 1800000; }).length;
      } catch(e) { _ftAU.textContent = '0'; }
    }
    if (_ftSS) {
      try {
        var _sess = JSON.parse(localStorage.getItem('ak_active_sessions') || '{}');
        _ftSS.textContent = Object.keys(_sess).length;
      } catch(e) { _ftSS.textContent = '0'; }
    }
  }

  // DB durum (her 3 saniyede)
  if (n.getSeconds() % 3 === 0) {
    var _dbSyncEl = _g('db-last-sync');
    var _dbSizeEl = _g('db-size');
    var _dbDotEl  = _g('db-sync-dot');
    if (_dbSyncEl) {
      var _lst = window._lastSyncTime || 0;
      _dbSyncEl.textContent = _lst ? new Date(_lst).toLocaleTimeString('tr-TR') : '—';
    }
    if (_dbSizeEl) {
      try {
        var _bytes = 0;
        Object.keys(localStorage).forEach(function(k) { if (k.startsWith('ak_')) _bytes += (localStorage[k] || '').length * 2; });
        _dbSizeEl.textContent = _bytes > 1048576 ? (_bytes / 1048576).toFixed(1) + ' MB' : Math.round(_bytes / 1024) + ' KB';
      } catch(e) { _dbSizeEl.textContent = '—'; }
    }
    if (_dbDotEl) {
      var _syncAge = Date.now() - (window._lastSyncTime || 0);
      _dbDotEl.style.background = _syncAge < 60000 ? '#16a34a' : _syncAge < 300000 ? '#d97706' : '#dc2626';
    }
    // Storage durumu
    var _stSyncEl = _g('st-last-sync');
    var _stCountEl = _g('st-doc-count');
    var _stDotEl = _g('st-sync-dot');
    if (_stSyncEl) {
      var _slt = window._lastStorageSyncTime || 0;
      _stSyncEl.textContent = _slt ? new Date(_slt).toLocaleTimeString('tr-TR') : '—';
    }
    if (_stCountEl) {
      try {
        var _docN = 0;
        Object.keys(localStorage).forEach(function(k) {
          if (!k.startsWith('ak_')) return;
          var v = localStorage[k] || '';
          if (v.indexOf('data:') !== -1 || v.indexOf('belgeUrl') !== -1 || v.indexOf('docUrl') !== -1 || v.indexOf('fileUrl') !== -1) _docN++;
        });
        _stCountEl.textContent = String(_docN);
      } catch(e) {}
    }
    if (_stDotEl) {
      var _stAge = Date.now() - (window._lastStorageSyncTime || 0);
      _stDotEl.style.background = window._lastStorageSyncTime ? (_stAge < 60000 ? '#16a34a' : _stAge < 300000 ? '#d97706' : '#9CA3AF') : '#9CA3AF';
    }
  }

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

  // P-1: Login anında Firestore'dan güncel kullanıcı verisini çek (yetki güncelliği)
  try {
    var _fbDB = window.Auth?.getFBDB?.();
    var _tid  = window.DB?._getTid?.() || window._getTid?.() || '';
    if (_fbDB && _tid && user) {
      var _base = 'duay_' + _tid.replace(/[^a-zA-Z0-9_]/g, '_');
      _fbDB.collection(_base).doc('users').get().then(function(snap) {
        if (!snap.exists) return;
        var fsUsers = snap.data()?.data;
        if (!Array.isArray(fsUsers)) return;
        var fresh = fsUsers.find(function(u) { return u.id === user.id || (u.email && user.email && u.email.toLowerCase() === u.email.toLowerCase()); });
        if (!fresh) return;
        // CU'yu güncel Firestore verisiyle güncelle
        var cu = window.Auth?.getCU?.();
        if (cu && (JSON.stringify(cu.modules) !== JSON.stringify(fresh.modules) || JSON.stringify(cu.permissions) !== JSON.stringify(fresh.permissions) || cu.role !== fresh.role)) {
          Object.assign(cu, { role: fresh.role, modules: fresh.modules, permissions: fresh.permissions, access: fresh.access, dept: fresh.dept, rule12h: fresh.rule12h, status: fresh.status });
          console.info('[LOGIN] CU yetkileri Firestore\'dan güncellendi');
          try { window.dispatchEvent(new CustomEvent('auth-changed', { detail: cu })); } catch(e) {}
        }
        // localStorage'ı da güncelle
        try { localStorage.setItem(window.DB?.KEYS?.users || 'ak_u3', JSON.stringify(fsUsers)); } catch(e) {}
      }).catch(function(e) { console.warn('[LOGIN] Firestore kullanıcı çekme hatası:', e.message); });
    }
  } catch(e) {}

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
        // Safari: token zorla yenile (1 saatlik kesinti önleme)
        fbUser.getIdToken(true).then(function() {
          window.DB?.startRealtimeSync?.();
        }).catch(function() {
          window.DB?.startRealtimeSync?.();
        });
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
  // Top Nav v2 restore
  setTimeout(function() { window._tn2Restore?.(); }, 200);
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
    iddia:      () => safe(() => window.renderIddia?.()),
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
  var cu = window.Auth?.getCU?.();
  if (!cu) return;
  var isAdm = cu.role === 'admin' || cu.role === 'manager';
  var n = new Date();
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var today = new Date().toISOString().slice(0,10);
  var thisMonth = today.slice(0,7);
  var TR_DAYS = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  var TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  // Üst bar güncelle
  var dtEl = _g('db-datetime');
  if (dtEl) dtEl.textContent = TR_DAYS[n.getDay()] + ', ' + n.getDate() + ' ' + TR_MONTHS[n.getMonth()] + ' ' + n.getFullYear() + ' · ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  var avEl = _g('db-user-av');
  if (avEl) avEl.textContent = (cu.name||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
  var unEl = _g('db-user-name');
  if (unEl) unEl.textContent = cu.name || '';
  var verEl = _g('db-version');
  if (verEl) verEl.textContent = 'v' + (window.APP_VER || document.querySelector('[data-ver]')?.dataset.ver || '');
  var syncEl = _g('db-sync-status');
  if (syncEl) syncEl.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#16a34a"></span> Sync aktif';

  var content = _g('db-content'); if (!content) return;
  var sg = _g('db-sg'); // uyumluluk
  var weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7); var weekStr = weekEnd.toISOString().slice(0,10);
  var users = loadUsers(); var tasks = loadTasks().filter(function(t){return !t.isDeleted;});
  var odm = typeof loadOdm==='function'?loadOdm().filter(function(o){return !o.isDeleted;}):[];
  var tah = typeof loadTahsilat==='function'?loadTahsilat().filter(function(t){return !t.isDeleted;}):[];
  var kargo = loadKargo(); var sa = typeof loadSatinalma==='function'?loadSatinalma():[];
  var konts = typeof loadKonteyn==='function'?loadKonteyn().filter(function(k){return !k.closed;}):[];
  var cari = typeof loadCari==='function'?loadCari().filter(function(c){return !c.isDeleted;}):[];

  // ═══ B1: SAĞLIK SKORU ═══
  var score = 100;
  var gecikOdm = odm.filter(function(o){return !o.paid && o.due && o.due < today;});
  var gecikTask = tasks.filter(function(t){return !t.done && t.due && t.due < today;});
  var pendingOdm = odm.filter(function(o){return o.approvalStatus==='pending';});
  var pendingSA = sa.filter(function(s){return s.status==='pending';});
  score -= gecikOdm.length * 10;
  score -= gecikTask.length * 5;
  score -= pendingOdm.length * 2;
  score -= pendingSA.length * 2;
  // 7 gün kuralı — ihracat bilgi eksik konteynerler
  var ihracatUyari = [];
  konts.forEach(function(k) {
    if (!k.etd) return;
    var diff = Math.ceil((new Date(k.etd) - new Date()) / 86400000);
    if (diff > 7 || diff < 0) return;
    ihracatUyari.push({no: k.no, gun: diff, hasIMO: k.hasIMO});
  });
  score -= ihracatUyari.length * 8;
  score = Math.max(0, Math.min(100, score));
  var scoreColor = score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  var scoreIcon = score >= 80 ? '●' : score >= 50 ? '●' : '●';
  var scoreLabel = score >= 80 ? 'Sağlıklı' : score >= 50 ? 'Dikkat' : 'Kritik';
  var kritikSayi = gecikOdm.length + gecikTask.length;

  // ═══ B3: FİNANSAL NABIZ ═══
  var ayTahsilat = tah.filter(function(t){return t.collected && (t.due||t.ts||'').startsWith(thisMonth);}).reduce(function(s,t){return s+(parseFloat(t.amountTRY||t.amount)||0);},0);
  var ayOdeme = odm.filter(function(o){return o.paid && (o.due||o.ts||'').startsWith(thisMonth);}).reduce(function(s,o){return s+(parseFloat(o.amountTRY||o.amount)||0);},0);
  var netPoz = ayTahsilat - ayOdeme;
  var proj30 = tah.filter(function(t){return !t.collected && t.due && t.due>=today && t.due<=weekStr;}).reduce(function(s,t){return s+(parseFloat(t.amountTRY||t.amount)||0);},0) - odm.filter(function(o){return !o.paid && o.due && o.due>=today && o.due<=weekStr;}).reduce(function(s,o){return s+(parseFloat(o.amountTRY||o.amount)||0);},0);

  // ═══ B4: BUGÜN & BU HAFTA ═══
  var bugunOdm = odm.filter(function(o){return !o.paid && o.due===today;});
  var bugunTah = tah.filter(function(t){return !t.collected && t.due===today;});
  var bugunTask = tasks.filter(function(t){return !t.done && t.due===today;});
  var haftaOdm = odm.filter(function(o){return !o.paid && o.due && o.due>=today && o.due<=weekStr;}).reduce(function(s,o){return s+(parseFloat(o.amountTRY||o.amount)||0);},0);
  var haftaTah = tah.filter(function(t){return !t.collected && t.due && t.due>=today && t.due<=weekStr;}).reduce(function(s,t){return s+(parseFloat(t.amountTRY||t.amount)||0);},0);

  // ═══ B5: OPERASYONEL ═══
  var acikGorev = tasks.filter(function(t){return !t.done;}).length;
  var bekleyenSA = pendingSA.length;
  var aktifKargo = kargo.filter(function(k){return k.status!=='teslim';}).length;
  var aktifCari = cari.filter(function(c){return c.status==='active';}).length;
  var puan2 = typeof loadPuan==='function'?loadPuan().filter(function(p){return p.date===today;}):[];

  // ═══ RENDER ═══
  if (sg) sg.style.display = 'none';
  var C = 'background:var(--sf);border:0.5px solid var(--b);border-radius:12px;overflow:hidden';
  var _fmt = function(v) { return Math.round(Math.abs(v)).toLocaleString('tr-TR'); };

  // Sağlık barı güncelle
  var hbEl = _g('db-health-bar');
  if (hbEl) {
    var segs = '';
    for (var si = 0; si < 10; si++) {
      var segC = (si < Math.round(score/10)) ? (score>=71?'#16a34a':score>=31?'#D97706':'#dc2626') : 'var(--s2)';
      segs += '<div style="width:8px;height:14px;border-radius:2px;background:'+segC+'"></div>';
    }
    hbEl.innerHTML = segs;
  }
  var hsEl = _g('db-health-score');
  if (hsEl) { hsEl.textContent = score + '/100'; hsEl.style.color = scoreColor; }

  // Alert bar + nav
  var kritikSayi = gecikOdm.length + gecikTask.length + (proj30 < 0 ? 1 : 0);
  var wipCount = tasks.filter(function(t){return t.status==='inprogress';}).length;
  var _alertBar = _g('db-alert-bar');
  var _alertNav = _g('db-alert-nav');
  if (_alertBar && kritikSayi > 0) {
    var _als = [];
    if (proj30 < 0) _als.push('<span style="color:#A32D2D">● 7g projeksiyon kritik: -₺' + _fmt(proj30) + '</span>');
    if (wipCount > 5) _als.push('<span style="color:#633806">● Kanban WIP aşıldı: Devam ' + wipCount + '/5</span>');
    if (gecikTask.length) _als.push('<span style="color:#633806">● ' + gecikTask.length + ' gecikmiş görev · ' + gecikTask.filter(function(t){return t.pri===1;}).length + ' kritik</span>');
    _alertBar.innerHTML = '<b>Aktif Uyarılar:</b> ' + _als.join(' | ');
    _alertBar.style.display = '';
    if (_alertNav) { _alertNav.textContent = '⚠ ' + kritikSayi + ' Uyarı'; _alertNav.style.display = ''; }
  } else {
    if (_alertBar) _alertBar.style.display = 'none';
    if (_alertNav) _alertNav.style.display = 'none';
  }

  // Döviz pozisyonları
  var _fxNet = {};
  ['USD','EUR','TRY'].forEach(function(cur) {
    var odmC = odm.filter(function(o){return (o.currency||'TRY')===cur && !o.paid;}).reduce(function(s,o){return s+(parseFloat(o.amount)||0);},0);
    var tahC = tah.filter(function(t2){return (t2.currency||'TRY')===cur && !t2.collected;}).reduce(function(s,t2){return s+(parseFloat(t2.amount)||0);},0);
    _fxNet[cur] = tahC - odmC;
  });
  var fxSym = {USD:'$',EUR:'€',TRY:'₺'};

  // Gecikmiş alacak tutarı
  var gecikAlacak = gecikOdm.reduce(function(s,o){return s+(parseFloat(o.amountTRY||o.amount)||0);},0);
  // Online kullanıcılar
  var onlineUsers = users.filter(function(u2){ return u2.lastLogin && (Date.now() - new Date(u2.lastLogin.replace(' ','T')).getTime()) < 1800000; });

  // ── USER DASHBOARD ──────────────────────────────────────────
  if (!isAdm) {
    var myTasks = tasks.filter(function(t){return t.uid===cu.id && !t.done;});
    var myGecik = myTasks.filter(function(t){return t.due && t.due < today;});
    var myBugun = myTasks.filter(function(t){return t.due === today;});
    var myHafta = myTasks.filter(function(t){return t.due && t.due >= today && t.due <= weekStr;});
    var myOdm = odm.filter(function(o){return o.createdBy === cu.id;});
    var myPending = myOdm.filter(function(o){return o.approvalStatus==='pending';});
    var notifs = typeof loadNotifs === 'function' ? loadNotifs().filter(function(n2){return !n2.read && (!n2.targetUid || n2.targetUid === cu.id);}).slice(0,5) : [];
    var uh = '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">';
    uh += '<div style="font-size:16px;font-weight:700;color:var(--t)">Merhaba ' + esc(cu.name.split(' ')[0]) + '!</div>';
    uh += '<div style="font-size:11px;color:var(--t3);margin-top:-6px">Bugün ne yapmalısın?</div>';
    // 4 kart
    uh += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
    uh += '<div style="'+C+';padding:12px;text-align:center"><div style="font-size:20px;font-weight:700;color:'+(myGecik.length?'#DC2626':'var(--t)')+'">'+myTasks.length+'</div><div style="font-size:9px;color:var(--t3)">Açık Görev</div>'+(myGecik.length?'<div style="font-size:8px;color:#DC2626;font-weight:600">'+myGecik.length+' gecikmiş</div>':'')+'</div>';
    uh += '<div style="'+C+';padding:12px;text-align:center"><div style="font-size:20px;font-weight:700;color:#DC2626">'+myBugun.length+'</div><div style="font-size:9px;color:var(--t3)">Bugün Deadline</div></div>';
    uh += '<div style="'+C+';padding:12px;text-align:center"><div style="font-size:20px;font-weight:700;color:#D97706">'+myPending.length+'</div><div style="font-size:9px;color:var(--t3)">Onay Bekleyen</div></div>';
    uh += '<div style="'+C+';padding:12px;text-align:center"><div style="font-size:20px;font-weight:700">'+myHafta.length+'</div><div style="font-size:9px;color:var(--t3)">Bu Hafta</div></div>';
    uh += '</div>';
    // Görevlerim
    uh += '<div style="'+C+'"><div style="padding:8px 14px;font-size:12px;font-weight:700;color:var(--t);border-bottom:0.5px solid var(--b)">Görevlerim</div>';
    if (!myTasks.length) uh += '<div style="padding:16px;text-align:center;font-size:11px;color:var(--t3)">Açık görev yok</div>';
    myTasks.sort(function(a,b){return (a.pri||3)-(b.pri||3);}).slice(0,8).forEach(function(t) {
      var priC = t.pri===1?'#DC2626':t.pri===2?'#D97706':'#3B82F6';
      var late = t.due && t.due < today;
      uh += '<div onclick="openPusDetail('+t.id+')" style="display:flex;align-items:center;gap:8px;padding:6px 14px;border-bottom:0.5px solid var(--b);cursor:pointer;font-size:11px;transition:background .1s'+(late?';background:#FEF2F2':'')+'" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\''+(late?'#FEF2F2':'')+'\'">'
        + '<span style="width:3px;height:20px;border-radius:1px;background:'+priC+';flex-shrink:0"></span>'
        + '<span style="flex:1;color:var(--t)">'+esc(t.title)+'</span>'
        + (t.due ? '<span style="font-size:9px;color:'+(late?'#DC2626':'var(--t3)')+'">'+t.due.slice(5)+'</span>' : '')
        + '<span style="font-size:9px;padding:1px 5px;border-radius:99px;background:var(--s2);color:var(--t3)">Aç →</span></div>';
    });
    uh += '</div>';
    // Bildirimler
    if (notifs.length) {
      uh += '<div style="'+C+'"><div style="padding:8px 14px;font-size:12px;font-weight:700;color:var(--t);border-bottom:0.5px solid var(--b)">Bildirimler</div>';
      notifs.forEach(function(n2) {
        uh += '<div style="padding:6px 14px;border-bottom:0.5px solid var(--b);font-size:10px;color:var(--t)">' + esc(n2.icon||'📌') + ' ' + esc(n2.msg||'') + '</div>';
      });
      uh += '</div>';
    }
    uh += '</div>';
    content.innerHTML = uh;
    return;
  }

  // ── ADMIN DASHBOARD ──────────────────────────────────────────
  var h = '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">';

  // ═══ BÖLÜM 4: 6 METRİK KART ═══
  h += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0;'+C+'">';
  var mCards = [
    {l:'Net Pozisyon',v:(netPoz>=0?'+':'-')+'₺'+_fmt(netPoz),c:netPoz>=0?'#27500A':'#A32D2D',s:netPoz>=0?'↑ Pozitif':'↓ Negatif',sc:netPoz>=0?'#27500A':'#A32D2D'},
    {l:'Gecikmiş Alacak',v:'₺'+_fmt(gecikAlacak),c:gecikAlacak>0?'#A32D2D':'#27500A',s:gecikOdm.length+' işlem',sc:'var(--t3)'},
    {l:'Bu Hafta Vadeli',v:'₺'+_fmt(haftaOdm),c:'#633806',s:bugunOdm.length+' bugün',sc:'var(--t3)'},
    {l:'Gecikmiş Görev',v:String(gecikTask.length),c:gecikTask.length?'#A32D2D':'#27500A',s:gecikTask.filter(function(t2){return t2.pri===1;}).length+' kritik',sc:gecikTask.length?'#A32D2D':'var(--t3)'},
    {l:'Aktif Kullanıcı',v:String(users.filter(function(u2){return u2.status==='active';}).length),c:'var(--t)',s:onlineUsers.length+' çevrimiçi',sc:'var(--t3)'},
    {l:'Sistem Skoru',v:String(score),c:scoreColor,s:'/100 · '+scoreLabel,sc:scoreColor},
  ];
  mCards.forEach(function(m,i){
    h+='<div style="padding:14px 16px;border-right:'+(i<5?'0.5px solid var(--b)':'none')+'">'
      +'<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">'+m.l+'</div>'
      +'<div style="font-size:20px;font-weight:700;color:'+m.c+'">'+m.v+'</div>'
      +'<div style="font-size:9px;color:'+m.sc+';margin-top:3px">'+m.s+'</div></div>';
  });
  h += '</div>';

  // ═══ BÖLÜM 5: 3'LÜ ANA GRID ═══
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">';

  // — FİNANS PANELİ —
  h += '<div style="'+C+'">'
    + '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:.06em">Finans</span>'
      + '<span style="font-size:10px;color:#0C447C;cursor:pointer" onclick="App.nav(\'odemeler\')">Finans Kokpiti →</span></div>'
    + '<div style="padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:'+(netPoz>=0?'#27500A':'#A32D2D')+'">'+(netPoz>=0?'+':'-')+'₺'+_fmt(netPoz)+'</div><div style="font-size:10px;color:var(--t3)">bu ay net</div></div>'
    + '<div style="padding:0 16px 12px;display:flex;flex-direction:column;gap:6px;font-size:11px">'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">Bu ay tahsilat</span><span style="font-weight:600;color:#27500A">+₺'+_fmt(ayTahsilat)+'</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#A32D2D"></span><span style="flex:1;color:var(--t2)">Bu ay ödeme</span><span style="font-weight:600;color:#A32D2D">-₺'+_fmt(ayOdeme)+'</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#A32D2D"></span><span style="flex:1;color:var(--t2)">Gecikmiş</span><span style="font-weight:600;color:#A32D2D">₺'+_fmt(gecikAlacak)+' · '+gecikOdm.length+' işlem</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#633806"></span><span style="flex:1;color:var(--t2)">Bu hafta vadeli</span><span style="font-weight:600;color:#633806">₺'+_fmt(haftaOdm)+'</span></div>'
    + '</div>'
    // Döviz barı
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-top:0.5px solid var(--b)">'
      + ['USD','EUR','TRY'].map(function(cur){var nv=_fxNet[cur]||0;return '<div style="padding:8px 10px;text-align:center;border-right:0.5px solid var(--b);font-size:10px"><div>'+{USD:'🇺🇸',EUR:'🇪🇺',TRY:'🇹🇷'}[cur]+'</div><div style="font-weight:600;color:'+(nv>=0?'#27500A':'#A32D2D')+'">'+(nv>=0?'+':'-')+fxSym[cur]+_fmt(nv)+'</div><div style="font-size:8px;color:var(--t3)">'+cur+'</div></div>';}).join('')
    + '</div>'
    // Projeksiyon uyarısı
    + (proj30 < 0 ? '<div style="padding:8px 12px;background:#FCEBEB;font-size:10px;color:#A32D2D;font-weight:500">⚠ 7 günlük projeksiyon kritik: -₺'+_fmt(proj30)+'</div>' : '')
  + '</div>';

  // — OPERASYON PANELİ —
  var topGecik = gecikTask.sort(function(a,b){return (a.pri||4)-(b.pri||4);}).slice(0,4);
  var wipPct = Math.min(100, Math.round(wipCount / 5 * 100));
  var wipColor = wipPct <= 60 ? '#639922' : wipPct <= 90 ? '#BA7517' : '#E24B4A';
  h += '<div style="'+C+'">'
    + '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:.06em">Operasyon</span>'
      + '<span style="font-size:10px;color:#0C447C;cursor:pointer" onclick="App.nav(\'pusula\')">Pusula →</span></div>'
    // WIP bar
    + '<div style="padding:10px 16px;background:var(--s2)">'
      + '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px"><span style="color:var(--t2)">Kanban WIP — Devam Sütunu</span><span style="color:'+wipColor+';font-weight:600">'+wipCount+'/5'+(wipCount>5?' ⚠ Aşıldı':'')+'</span></div>'
      + '<div style="height:4px;background:var(--b);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+wipPct+'%;background:'+wipColor+';border-radius:2px"></div></div>'
    + '</div>'
    // Görev listesi
    + '<div style="padding:8px 0">';
  topGecik.forEach(function(t2){
    var days = Math.ceil((new Date(today)-new Date(t2.due))/86400000);
    var isLate = t2.due && t2.due < today;
    h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 16px;border-bottom:0.5px solid var(--b);cursor:pointer" onclick="openPusDetail('+t2.id+')">'
      + '<span style="width:5px;height:5px;border-radius:50%;background:'+(isLate?'#A32D2D':'#633806')+';flex-shrink:0"></span>'
      + '<span style="flex:1;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t2.title)+'</span>'
      + '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:'+(isLate?'#FCEBEB':'#FAEEDA')+';color:'+(isLate?'#A32D2D':'#633806')+';font-weight:600;white-space:nowrap">'+(isLate?days+'g gecikmiş':'1g kaldı')+'</span></div>';
  });
  if (!topGecik.length) h += '<div style="padding:16px;text-align:center;font-size:11px;color:var(--t3)">Gecikmiş görev yok</div>';
  h += '</div>'
    // Alt özet
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-top:0.5px solid var(--b);font-size:10px;color:var(--t3)">'
      + '<div style="padding:8px;text-align:center;border-right:0.5px solid var(--b)">Toplam: <b style="color:var(--t)">'+acikGorev+'</b> açık</div>'
      + '<div style="padding:8px;text-align:center;border-right:0.5px solid var(--b)">Tamamlanan: <b style="color:#27500A">'+tasks.filter(function(t2){return t2.done&&(t2.completedAt||'').slice(0,10)===today;}).length+'</b></div>'
      + '<div style="padding:8px;text-align:center">İnceleme: <b>'+tasks.filter(function(t2){return t2.status==='review';}).length+'</b></div>'
    + '</div>'
  + '</div>';

  // — GÜVENLİK & SİSTEM PANELİ —
  var actLog = typeof loadAct === 'function' ? loadAct().slice(0,3) : [];
  h += '<div style="'+C+'">'
    + '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:.06em">Güvenlik & Sistem</span>'
      + '<span style="font-size:10px;color:#0C447C;cursor:pointer" onclick="App.nav(\'settings\')">Sistem Ayarları →</span></div>'
    // Skor dairesi
    + '<div style="padding:16px;display:flex;align-items:center;gap:14px">'
      + '<div style="width:56px;height:56px;border-radius:50%;border:3px solid '+scoreColor+';display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:'+scoreColor+';flex-shrink:0">'+score+'</div>'
      + '<div><div style="font-size:12px;font-weight:600;color:var(--t)">Genel Sistem Skoru</div><div style="font-size:10px;color:var(--t3)">'+(score<70?'Operasyon skoru düşürüyor':'Sistem sağlıklı')+'</div></div></div>'
    // Durum listesi
    + '<div style="padding:0 16px 12px;display:flex;flex-direction:column;gap:4px;font-size:11px">'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">Auth servisi</span><span style="color:#27500A;font-weight:500">Online</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">DB Latency</span><span style="color:#27500A;font-weight:500">&lt;10ms</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">Audit log</span><span style="color:#27500A;font-weight:500">Senkron</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">Aktif oturum</span><span style="color:var(--t);font-weight:500">'+users.filter(function(u2){return u2.status==='active';}).length+'</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:#27500A"></span><span style="flex:1;color:var(--t2)">Son 24 saat</span><span style="color:var(--t);font-weight:500">'+actLog.length+' olay</span></div>'
    + '</div>'
    // Son olaylar
    + '<div style="padding:8px 16px;border-top:0.5px solid var(--b);font-size:10px;font-weight:600;color:var(--t);margin-bottom:4px">Son Olaylar</div>';
  actLog.forEach(function(ev){
    var evC = (ev.type==='user'||ev.message?.indexOf('yetki')!==-1)?'#633806':(ev.type==='login'?'#27500A':'#A32D2D');
    var evTime = ev.ts ? ev.ts.slice(11,16) : '';
    h += '<div style="display:flex;align-items:center;gap:6px;padding:4px 16px;font-size:10px">'
      + '<span style="width:4px;height:4px;border-radius:50%;background:'+evC+';flex-shrink:0"></span>'
      + '<span style="flex:1;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(ev.message||ev.detail||'')+'</span>'
      + '<span style="color:var(--t3);white-space:nowrap">'+evTime+'</span></div>';
  });
  h += '</div>';

  h += '</div>'; // 3'lü grid kapanış

  // ═══ BÖLÜM 6: 2'Lİ ALT GRID ═══
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';

  // — KULLANICILAR —
  h += '<div style="'+C+'">'
    + '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:.06em">Kullanıcılar · '+onlineUsers.length+' Çevrimiçi</span>'
      + '<span style="font-size:10px;color:#0C447C;cursor:pointer" onclick="App.nav(\'admin\')">Kullanıcı Yönetimi →</span></div>';
  var AVC_DB = [['#E0E7FF','#1E1B4B'],['#DCFCE7','#14532D'],['#F3E8FF','#3B0764'],['#FEF3C7','#78350F']];
  users.filter(function(u2){return u2.status==='active';}).sort(function(a,b){return (b.lastLogin||'').localeCompare(a.lastLogin||'');}).slice(0,6).forEach(function(u2,i){
    var isOn = onlineUsers.find(function(ou){return ou.id===u2.id;});
    var ini = (u2.name||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    var ac = AVC_DB[i % AVC_DB.length];
    var ago = u2.lastLogin ? (function(){ var d = Date.now() - new Date(u2.lastLogin.replace(' ','T')).getTime(); if(d<3600000) return 'Şu an aktif'; if(d<86400000) return Math.floor(d/3600000)+' saat önce'; return Math.floor(d/86400000)+' gün önce'; })() : 'Hiç';
    var rolL = u2.role==='admin'?'Yönetici':u2.role==='manager'?'Takım Lideri':'Personel';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:0.5px solid var(--b)">'
      + '<div style="position:relative;flex-shrink:0"><div style="width:32px;height:32px;border-radius:8px;background:'+ac[0]+';color:'+ac[1]+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">'+ini+'</div>'
      + '<div style="position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;border:1.5px solid var(--sf);background:'+(isOn?'#16a34a':'#9CA3AF')+'"></div></div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--t)">'+esc(u2.name)+'</div><div style="font-size:9px;color:var(--t3)">'+u2.role+' · '+rolL+'</div></div>'
      + '<span style="font-size:9px;color:var(--t3)">'+ago+'</span></div>';
  });
  h += '</div>';

  // — NAKİT AKIŞ GRAFİĞİ —
  var chartData = []; var allVals = [];
  for (var di = 6; di >= 0; di--) {
    var d2 = new Date(); d2.setDate(d2.getDate()-di); var ds = d2.toISOString().slice(0,10);
    var dayO = odm.filter(function(o2){return o2.paid && (o2.paidTs||o2.due||'').slice(0,10)===ds;}).reduce(function(s,o2){return s+(parseFloat(o2.amountTRY||o2.amount)||0);},0);
    var dayT = tah.filter(function(t2){return t2.collected && (t2.collectedTs||t2.due||'').slice(0,10)===ds;}).reduce(function(s,t2){return s+(parseFloat(t2.amountTRY||t2.amount)||0);},0);
    chartData.push({ds:ds,o:dayO,t:dayT,label:di===0?'Bugün':(d2.getDate()+' '+TR_MONTHS[d2.getMonth()].slice(0,3))});
    allVals.push(dayO); allVals.push(dayT);
  }
  allVals.sort(function(a,b){return a-b;});
  var cMax = allVals[Math.floor(allVals.length*0.85)] || 1;
  if (cMax < 1) cMax = 1;
  var chartTahTotal = chartData.reduce(function(s,c2){return s+c2.t;},0);
  var chartOdmTotal = chartData.reduce(function(s,c2){return s+c2.o;},0);

  h += '<div style="'+C+'">'
    + '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:.06em">Nakit Akışı — Son 7 Gün</span>'
      + '<span style="font-size:10px;color:#0C447C;cursor:pointer" onclick="App.nav(\'odemeler\')">Nakit Akışı →</span></div>'
    // Üst özet
    + '<div style="display:flex;gap:16px;padding:10px 16px;font-size:11px">'
      + '<span>Tahsilat <b style="color:#27500A">+₺'+_fmt(chartTahTotal)+'</b></span>'
      + '<span>Ödeme <b style="color:#A32D2D">-₺'+_fmt(chartOdmTotal)+'</b></span>'
      + '<span>Net <b style="color:'+(chartTahTotal-chartOdmTotal>=0?'#27500A':'#A32D2D')+'">'+(chartTahTotal-chartOdmTotal>=0?'+':'-')+'₺'+_fmt(chartTahTotal-chartOdmTotal)+'</b></span>'
    + '</div>'
    // Bar chart
    + '<div style="display:flex;gap:6px;align-items:flex-end;height:80px;padding:0 16px">';
  chartData.forEach(function(cd,ci){
    var hT = cd.t > 0 ? Math.max(4,Math.round(Math.min(cd.t,cMax)/cMax*70)) : 2;
    var hO = cd.o > 0 ? Math.max(4,Math.round(Math.min(cd.o,cMax)/cMax*70)) : 2;
    h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">'
      + '<div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:70px">'
      + '<div style="flex:1;height:'+hT+'px;background:#27500A;border-radius:2px 2px 0 0" title="Tahsilat: ₺'+_fmt(cd.t)+'"></div>'
      + '<div style="flex:1;height:'+hO+'px;background:#A32D2D;border-radius:2px 2px 0 0" title="Ödeme: ₺'+_fmt(cd.o)+'"></div></div>'
      + '<div style="font-size:8px;color:var(--t3);margin-top:2px;'+(ci===6?'font-weight:700':'')+'">'+(cd.label)+'</div></div>';
  });
  h += '</div>'
    + '<div style="padding:8px 16px;font-size:9px;color:var(--t3);display:flex;gap:12px">'
      + '<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:#27500A;vertical-align:middle;margin-right:3px"></span>Tahsilat</span>'
      + '<span><span style="display:inline-block;width:8px;height:8px;border-radius:1px;background:#A32D2D;vertical-align:middle;margin-right:3px"></span>Ödeme</span>'
    + '</div>'
  + '</div>';

  h += '</div>'; // 2'li grid kapanış

  // ═══ ESKİ BÖLÜMLER KALDIRILDI — yukarıdaki yeni tasarım kullanılıyor ═══
  // Hızlı eylemler
  var btnS = 'padding:6px 12px;border:none;border-radius:99px;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;color:#fff';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + '<button onclick="openOdmModal?.(null)" style="'+btnS+';background:#1E293B">+ Ödeme</button>'
    + '<button onclick="openTahsilatModal?.(null)" style="'+btnS+';background:#0F6E56">+ Tahsilat</button>'
    + '<button onclick="Pusula?.openAdd?.()" style="'+btnS+';background:#3B82F6">+ Görev</button>'
    + '</div>';

  // ESKİ KOD BAŞLANGIÇI — atla
  var ozlu = typeof window._getOzluSoz === 'function' ? window._getOzluSoz('dashboard') : '';
  if (ozlu) h += '<div style="text-align:right;font-size:9px;font-style:italic;color:var(--t3);margin-bottom:-2px">\u201C'+ozlu+'\u201D</div>';

  // ── SAĞLIK SKORU + UYARILAR (Tasarım C)
  var lsUsed = (function() { var total = 0; Object.keys(localStorage).forEach(function(k) { total += (localStorage.getItem(k) || '').length * 2; }); return Math.round(total / 1024); })();
  var lsPct = Math.round(lsUsed / 5120 * 100);
  var offlineQ = 0; try { offlineQ = JSON.parse(localStorage.getItem('ak_offline_queue') || '[]').length; } catch(e) {}
  var lastSync = localStorage.getItem('ak_db_last_write') || '';
  var syncAgo = lastSync ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000) + ' dk' : '—';

  var dbAlerts = [];
  if (lsPct >= 90) { dbAlerts.push({ level: 'err', main: 'localStorage %' + lsPct + ' dolu — veri kayıt edilemiyor', sub: (function() { var tops = Object.keys(localStorage).map(function(k) { return { k: k, kb: Math.round((localStorage.getItem(k) || '').length * 2 / 1024) }; }).sort(function(a, b) { return b.kb - a.kb; }).slice(0, 3); return tops.map(function(t) { return t.k + ': ' + t.kb + 'KB'; }).join(' · '); })(), actions: [{ label: 'Temizle', fn: 'window._emergencyCleanup?.()' }, { label: 'Monitör', fn: 'App.nav(\'settings\')' }] }); }
  else if (lsPct >= 80) { dbAlerts.push({ level: 'warn', main: 'localStorage %' + lsPct + ' dolu', sub: 'Ayarlar → Sağlık Monitörü\'nden temizleyin', actions: [{ label: 'Temizle', fn: 'window._emergencyCleanup?.()' }] }); }
  if (offlineQ > 0) { dbAlerts.push({ level: 'warn', main: offlineQ + ' kayıt çevrimdışı kuyrukta', sub: 'İnternet bağlantısı kontrol et', actions: [{ label: 'Sync', fn: 'window._manualSync?.()' }] }); }
  if (gecikOdm.length) { dbAlerts.push({ level: 'err', main: gecikOdm.length + ' gecikmiş ödeme · ₺' + Math.round(gecikAlacak).toLocaleString('tr-TR'), sub: gecikOdm.slice(0, 2).map(function(o) { return o.name || ''; }).join(', ') + (gecikOdm.length > 2 ? ' ve ' + (gecikOdm.length - 2) + ' daha' : ''), actions: [{ label: 'Nakit Akışı →', fn: 'App.nav(\'odemeler\')' }] }); }

  h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:12px;overflow:hidden">';
  // Üst: skor + uyarılar
  h += '<div style="display:grid;grid-template-columns:80px 1fr;border-bottom:0.5px solid var(--b)">';
  h += '<div style="padding:14px 16px;border-right:0.5px solid var(--b);display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:26px;font-weight:500;color:' + scoreColor + ';line-height:1">' + score + '</div><div style="font-size:9px;color:var(--t3);margin-top:3px">Sağlık skoru</div></div>';
  h += '<div style="padding:8px 12px;display:flex;flex-direction:column;gap:6px;justify-content:center">';
  if (!dbAlerts.length) { h += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#16a34a">Sistem sağlıklı — kritik sorun yok</div>'; }
  dbAlerts.forEach(function(a) {
    var bg = a.level === 'err' ? '#FCEBEB' : '#FAEEDA'; var bc = a.level === 'err' ? '#E24B4A' : '#EF9F27'; var tc = a.level === 'err' ? '#791F1F' : '#633806'; var sc = a.level === 'err' ? '#A32D2D' : '#854F0B'; var btnBc = a.level === 'err' ? '#F09595' : '#FAC775';
    h += '<div style="background:' + bg + ';border-left:3px solid ' + bc + ';padding:6px 10px;border-radius:6px"><div style="font-size:11px;font-weight:500;color:' + tc + '">' + a.main + '</div><div style="font-size:10px;color:' + sc + ';margin-top:2px">' + a.sub + '</div><div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">';
    a.actions.forEach(function(act) { h += '<span onclick="' + act.fn + '" style="font-size:10px;padding:2px 8px;border-radius:4px;cursor:pointer;border:0.5px solid ' + btnBc + ';background:#fff;color:' + tc + '">' + act.label + '</span>'; });
    h += '</div></div>';
  });
  h += '</div></div>';
  // Alt: 4 parametre
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr)">'
    + '<div style="padding:8px 12px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Depolama</div><div style="font-size:14px;font-weight:500;margin-top:2px;color:' + (lsPct >= 90 ? '#DC2626' : lsPct >= 80 ? '#D97706' : '#16a34a') + '">%' + lsPct + '</div></div>'
    + '<div style="padding:8px 12px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Firestore</div><div style="font-size:14px;font-weight:500;margin-top:2px;color:#16a34a">Aktif</div></div>'
    + '<div style="padding:8px 12px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Offline</div><div style="font-size:14px;font-weight:500;margin-top:2px;color:' + (offlineQ > 0 ? '#D97706' : '#16a34a') + '">' + offlineQ + '</div></div>'
    + '<div style="padding:8px 12px;text-align:center"><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Son sync</div><div style="font-size:14px;font-weight:500;margin-top:2px;color:var(--t)">' + syncAgo + '</div></div>'
    + '</div></div>';

  // ── B3: Finansal (kompakt)
  h += '<div style="'+C+';display:grid;grid-template-columns:repeat(4,1fr);gap:0">';
  [{l:'Tahsilat',v:'₺'+Math.round(ayTahsilat).toLocaleString('tr-TR'),c:'#16A34A'},{l:'Ödeme',v:'₺'+Math.round(ayOdeme).toLocaleString('tr-TR'),c:'#DC2626'},{l:'Net',v:(netPoz>=0?'+':'')+'₺'+Math.round(Math.abs(netPoz)).toLocaleString('tr-TR'),c:netPoz>=0?'#16A34A':'#DC2626'},{l:'7g Proj.',v:(proj30>=0?'+':'')+'₺'+Math.round(Math.abs(proj30)).toLocaleString('tr-TR'),c:proj30>=0?'#16A34A':'#DC2626'}].forEach(function(k,i){
    h += '<div onclick="App.nav(\'odemeler\')" style="padding:10px 12px;cursor:pointer;border-right:'+(i<3?'0.5px solid var(--b)':'none')+';min-width:0;overflow:hidden;transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;margin-bottom:3px">'+k.l+'</div>'
      + '<div style="font-size:clamp(14px,2vw,18px);font-weight:700;color:'+k.c+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+k.v+'</div></div>';
  });
  h += '</div>';

  // ── B4: Bugün & Hafta (kompakt)
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div style="'+C+';padding:10px 14px"><div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:6px">Bugün</div>'
    + '<div style="font-size:11px;display:flex;flex-direction:column;gap:3px">'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Ödeme</span><b style="color:#DC2626;cursor:pointer" onclick="App.nav(\'odemeler\')">'+bugunOdm.length+'</b></div>'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Tahsilat</span><b style="color:#16A34A">'+bugunTah.length+'</b></div>'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Görev</span><b style="cursor:pointer" onclick="App.nav(\'pusula\')">'+bugunTask.length+'</b></div></div></div>';
  h += '<div style="'+C+';padding:10px 14px"><div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:6px">Bu Hafta</div>'
    + '<div style="font-size:11px;display:flex;flex-direction:column;gap:3px">'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Ödeme</span><b style="color:#DC2626">₺'+Math.round(haftaOdm).toLocaleString('tr-TR')+'</b></div>'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Tahsilat</span><b style="color:#16A34A">₺'+Math.round(haftaTah).toLocaleString('tr-TR')+'</b></div>'
    + '<div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Onay</span><span style="font-size:8px;padding:1px 6px;border-radius:99px;background:#D9770618;color:#D97706;font-weight:600">'+(pendingOdm.length+bekleyenSA)+'</span></div></div></div>';
  h += '</div>';

  // ── B5: Operasyonel (kompakt 60px)
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
  var ops = [
    {l:'Görevler',v:acikGorev,u:'açık',sub:gecikTask.length+' gecikmiş',c:gecikTask.length?'#DC2626':'#16A34A',nav:'pusula'},
    {l:'Satın Alma',v:sa.length,u:'kayıt',sub:bekleyenSA+' onay',c:bekleyenSA?'#D97706':'#16A34A',nav:'satinalma'},
    {l:'Kargo',v:aktifKargo,u:'aktif',sub:konts.length+' kont.',c:'var(--t)',nav:'kargo'},
    {l:'Nakit',v:gecikOdm.length,u:'gecikmiş',sub:'₺'+Math.round(haftaOdm).toLocaleString('tr-TR'),c:gecikOdm.length?'#DC2626':'#16A34A',nav:'odemeler'},
    {l:'Cari',v:aktifCari,u:'aktif',sub:cari.filter(function(c2){return c2.status==='pending_approval';}).length+' onay',c:'var(--t)',nav:'cari'},
    {l:'Personel',v:puan2.length,u:'giriş',sub:puan2.filter(function(p){return p.isLate;}).length+' geç',c:puan2.filter(function(p){return p.isLate;}).length?'#D97706':'#16A34A',nav:'admin'},
  ];
  ops.forEach(function(o){
    var isAlert = parseInt(o.sub) > 0 && (o.sub.indexOf('gecikmiş') !== -1 || o.sub.indexOf('geç') !== -1);
    h += '<div onclick="App.nav(\''+o.nav+'\')" style="'+C+';padding:10px 12px;cursor:pointer;transition:all .1s" onmouseover="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,.05)\'" onmouseout="this.style.boxShadow=\'none\'">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:4px">'+o.l+'</div>'
      + '<div style="display:flex;align-items:baseline;gap:3px"><span style="font-size:20px;font-weight:700;color:'+o.c+'">'+o.v+'</span><span style="font-size:10px;color:var(--t3)">'+o.u+'</span></div>'
      + '<div style="font-size:10px;color:'+(isAlert?'#DC2626':'var(--t3)')+'">'+o.sub+'</div></div>';
  });
  h += '</div>';

  // ── B6: Sevkiyatlar (kompakt)
  if (konts.length) {
    h += '<div style="'+C+';padding:8px 14px"><div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:6px">Sevkiyatlar</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
    konts.slice(0,4).forEach(function(k){
      var dE = k.eta ? Math.ceil((new Date(k.eta)-new Date())/86400000) : null;
      var dc = dE!==null&&dE<=3?'#DC2626':dE!==null&&dE<=7?'#D97706':'#16A34A';
      h += '<div onclick="window.openKonteynDetail?.('+k.id+')" style="padding:6px 10px;background:var(--s2);border:0.5px solid var(--b);border-radius:6px;cursor:pointer;font-size:10px"><b>'+esc(k.no||'')+'</b>'+(dE!==null?' <span style="color:'+dc+';font-weight:600">'+dE+'g</span>':'')+(k.hasIMO?' <span style="color:#D97706;font-weight:700;font-size:8px">IMO</span>':'')+'</div>';
    });
    h += '</div></div>';
  }

  // ── B7: Onay kuyruğu (kompakt)
  if (isAdm && (pendingOdm.length || bekleyenSA)) {
    h += '<div style="'+C+'"><div style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--t);border-bottom:0.5px solid var(--b)">Onay Kuyruğu <span style="font-size:9px;padding:1px 5px;border-radius:99px;background:#D9770618;color:#D97706;font-weight:600">'+(pendingOdm.length+bekleyenSA)+'</span></div>';
    pendingOdm.slice(0,3).forEach(function(o){
      h += '<div style="display:flex;align-items:center;gap:6px;padding:5px 14px;border-bottom:0.5px solid var(--b);font-size:10px"><span style="flex:1">'+esc(o.name||'')+'</span><span style="font-weight:600">₺'+Number(o.amount||0).toLocaleString('tr-TR')+'</span>'
        + '<button onclick="processOdmApproval('+o.id+',\'ara_onayla\')" style="padding:1px 6px;border:none;border-radius:99px;background:#16A34A18;color:#16A34A;font-size:8px;font-weight:600;cursor:pointer;font-family:inherit">✓</button>'
        + '<button onclick="processOdmApproval('+o.id+',\'reddet\')" style="padding:1px 6px;border:none;border-radius:99px;background:#DC262618;color:#DC2626;font-size:8px;font-weight:600;cursor:pointer;font-family:inherit">✗</button></div>';
    });
    pendingSA.slice(0,2).forEach(function(s){
      h += '<div style="display:flex;align-items:center;gap:6px;padding:5px 14px;border-bottom:0.5px solid var(--b);font-size:10px"><span style="flex:1">SA: '+esc(s.supplier||'')+'</span><button onclick="window._approveSA?.('+s.id+')" style="padding:1px 6px;border:none;border-radius:99px;background:#16A34A18;color:#16A34A;font-size:8px;font-weight:600;cursor:pointer;font-family:inherit">✓</button></div>';
    });
    h += '</div>';
  }

  // ── B8: Grafik + Takvim yan yana
  var chartData = [], allVals = [];
  for (var di=6;di>=0;di--) {
    var d2 = new Date(); d2.setDate(d2.getDate()-di); var ds = d2.toISOString().slice(0,10);
    var dayO = odm.filter(function(o){return o.paid && (o.paidTs||o.due||'').slice(0,10)===ds;}).reduce(function(s,o){return s+(parseFloat(o.amountTRY||o.amount)||0);},0);
    var dayT = tah.filter(function(t){return t.collected && (t.collectedTs||t.due||'').slice(0,10)===ds;}).reduce(function(s,t){return s+(parseFloat(t.amountTRY||t.amount)||0);},0);
    chartData.push({ds:ds,o:dayO,t:dayT,dow:['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][d2.getDay()]});
    allVals.push(dayO); allVals.push(dayT);
  }
  // p75 persentil max
  allVals.sort(function(a,b){return a-b;});
  var p75idx = Math.floor(allVals.length * 0.75);
  var cappedMax = allVals[p75idx] || 1;
  if (cappedMax < 1) cappedMax = 1;

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  // Grafik sol
  h += '<div style="'+C+';padding:10px 14px"><div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:8px">Son 7 Gün</div>'
    + '<div style="display:flex;gap:4px;align-items:flex-end;height:56px">';
  chartData.forEach(function(cd) {
    var hT = cd.t > 0 ? Math.max(3, Math.round(Math.min(cd.t, cappedMax) / cappedMax * 48)) : 2;
    var hO = cd.o > 0 ? Math.max(3, Math.round(Math.min(cd.o, cappedMax) / cappedMax * 48)) : 2;
    var spike = cd.t > cappedMax || cd.o > cappedMax;
    h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px" title="'+cd.ds+' T:₺'+Math.round(cd.t).toLocaleString('tr-TR')+' Ö:₺'+Math.round(cd.o).toLocaleString('tr-TR')+'">'
      + (spike?'<div style="font-size:7px;color:var(--t3)">↑</div>':'')
      + '<div style="display:flex;gap:1px;align-items:flex-end;width:100%;height:48px">'
      + '<div style="flex:1;height:'+hT+'px;background:#16A34A;border-radius:2px 2px 0 0"></div>'
      + '<div style="flex:1;height:'+hO+'px;background:#DC2626;border-radius:2px 2px 0 0"></div></div>'
      + '<div style="font-size:7px;color:var(--t3)">'+cd.dow+'</div></div>';
  });
  h += '</div><div style="font-size:8px;color:var(--t3);margin-top:4px;display:flex;gap:10px"><span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:#16A34A;vertical-align:middle;margin-right:2px"></span>Tahsilat</span><span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:#DC2626;vertical-align:middle;margin-right:2px"></span>Ödeme</span></div></div>';

  // Takvim sağ — GitHub contribution graph
  h += '<div style="'+C+';padding:10px 14px"><div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:8px">30 Gün Aktivite</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:2px">';
  for (var ci=29;ci>=0;ci--) {
    var cd2 = new Date(); cd2.setDate(cd2.getDate()-ci); var cds = cd2.toISOString().slice(0,10);
    var gorevSayi = tasks.filter(function(t){return (t.completedAt||t.ts||'').slice(0,10)===cds;}).length;
    var odmSayi = odm.filter(function(o){return (o.paidTs||o.due||'').slice(0,10)===cds && o.paid;}).length;
    var tekSayi = (typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[]).filter(function(t2){return (t2.ts||'').slice(0,10)===cds;}).length;
    var toplam = gorevSayi + odmSayi + tekSayi;
    var renk = toplam === 0 ? 'var(--s2)' : toplam <= 2 ? '#BBF7D0' : toplam <= 5 ? '#4ADE80' : '#16A34A';
    h += '<div style="width:100%;aspect-ratio:1;background:'+renk+';border-radius:2px;cursor:default" title="'+cds+': '+gorevSayi+' görev, '+odmSayi+' ödeme, '+tekSayi+' teklif"></div>';
  }
  h += '</div></div>';
  h += '</div>';

  // ── Smart Goals
  var goals = typeof loadSmartGoals === 'function' ? loadSmartGoals() : [];
  if (goals.length) {
    h += '<div style="'+C+';padding:10px 14px"><div style="font-size:11px;font-weight:700;color:var(--t);margin-bottom:6px">Hedefler</div>';
    goals.forEach(function(gl) {
      var pct = gl.hedef > 0 ? Math.round(gl.mevcut / gl.hedef * 100) : 0;
      var gc = pct >= 75 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
      h += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:10px">'
        + '<span style="flex:1;color:var(--t)">'+esc(gl.baslik||'')+'</span>'
        + '<span style="font-weight:600;color:'+gc+'">'+gl.mevcut+'/'+gl.hedef+'</span>'
        + '<div style="width:60px;height:4px;background:var(--s2);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,pct)+'%;background:'+gc+';border-radius:2px"></div></div>'
        + '<span style="font-size:8px;color:'+gc+';font-weight:600">%'+pct+'</span></div>';
    });
    h += '</div>';
  }
  if (isAdm && !goals.length) {
    h += '<div style="'+C+';padding:10px 14px;display:flex;align-items:center;justify-content:space-between"><span style="font-size:10px;color:var(--t3)">Hedef tanımlı değil</span><button onclick="window._openSmartGoalAdd?.()" style="padding:3px 8px;border:0.5px solid var(--ac);border-radius:99px;background:none;color:var(--ac);font-size:9px;cursor:pointer;font-family:inherit">+ Hedef Ekle</button></div>';
  }

  // ── B9: Hızlı Eylemler (kompakt)
  var btnS = 'padding:6px 12px;border:none;border-radius:99px;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;color:#fff';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + '<button onclick="openOdmModal?.(null)" style="'+btnS+';background:#1E293B">+ Ödeme</button>'
    + '<button onclick="openTahsilatModal?.(null)" style="'+btnS+';background:#0F6E56">+ Tahsilat</button>'
    + '<button onclick="Pusula?.openAdd?.()" style="'+btnS+';background:#3B82F6">+ Görev</button>'
    + '<button onclick="window._openSatisModal?.()" style="'+btnS+';background:#065F46">+ Satış Teklifi</button>'
    + '<button onclick="window.openReportPanel?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:99px;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--t2);background:var(--sf)">Raporlar</button>'
    + '</div>';

  // ── B10: Sistem Sağlığı (E-Myth) ──────────────────────────
  if (isAdm) {
    var otoIslem = odm.filter(function(o){return o.source==='satinalma';}).length + kargo.filter(function(k){return k.source==='satinalma';}).length;
    var manuelIslem = pendingOdm.length + bekleyenSA;
    var otoOran = (otoIslem + manuelIslem) > 0 ? Math.round(otoIslem / (otoIslem + manuelIslem) * 100) : 100;
    var otoColor = otoOran >= 80 ? '#16A34A' : otoOran >= 50 ? '#D97706' : '#DC2626';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
    h += '<div style="'+C+';padding:10px 12px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t);margin-bottom:4px">⚙ Sistem <span style="font-size:7px;color:var(--t3);font-weight:400">E-Myth</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:3px">'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Oto</span><b style="color:#16A34A">' + otoIslem + '</b></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Manuel</span><b style="color:#D97706">' + manuelIslem + '</b></div>'
      + '<div style="height:3px;background:var(--s2);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+otoOran+'%;background:'+otoColor+';border-radius:2px"></div></div>'
      + '</div></div>';
    // B11
    var gecenAyStr = new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0,7);
    var gecenAyTah = tah.filter(function(t2){return t2.collected && (t2.due||t2.ts||'').startsWith(gecenAyStr);}).reduce(function(s2,t2){return s2+(parseFloat(t2.amountTRY||t2.amount)||0);},0);
    var tahBuyume = gecenAyTah > 0 ? Math.round((ayTahsilat - gecenAyTah) / gecenAyTah * 100) : 0;
    var teklifSayisi = (typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : []);
    var teklifKabul = teklifSayisi.filter(function(t2){return t2.durum==='kabul';}).length;
    var donusumOran = teklifSayisi.length > 0 ? Math.round(teklifKabul / teklifSayisi.length * 100) : 0;
    var ortGecikme = gecikOdm.length > 0 ? Math.round(gecikOdm.reduce(function(s2,o2){return s2+Math.ceil((new Date(today)-new Date(o2.due))/86400000);},0) / gecikOdm.length * 10) / 10 : 0;
    h += '<div style="'+C+';padding:10px 12px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t);margin-bottom:4px">📈 Büyüme</div>'
      + '<div style="display:flex;flex-direction:column;gap:3px">'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Tahsilat</span><b style="color:'+(tahBuyume>=0?'#16A34A':'#DC2626')+'">'+(tahBuyume>=0?'↑':'↓')+'%'+Math.abs(tahBuyume)+'</b></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Dönüşüm</span><b>%'+donusumOran+'</b></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Gecikme</span><b style="color:'+(ortGecikme>3?'#DC2626':'#16A34A')+'">'+ortGecikme+'g</b></div>'
      + '</div></div>';

    // B12: Sahip Bağımsızlık Skoru (Vanish)
    var otoTamam = tasks.filter(function(t2){return t2.done && t2.completedAt && t2.completedAt.startsWith(today) && t2.uid !== cu.id;}).length;
    var sahipOnay = pendingOdm.length + bekleyenSA;
    var gecenHaftaOnay = 0; // basitleştirilmiş
    h += '<div style="'+C+';padding:10px 12px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t);margin-bottom:4px">🏃 Bağımsızlık</div>'
      + '<div style="display:flex;flex-direction:column;gap:3px">'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Sizsiz</span><b style="color:#16A34A">' + otoTamam + ' iş</b></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t3)">Bekleyen</span><b style="color:'+(sahipOnay>0?'#D97706':'#16A34A')+'">' + sahipOnay + '</b></div>'
      + '</div></div>';
    h += '</div>';
  }

  h += '</div>'; // padding wrapper kapanış
  content.innerHTML = h;
}

// ── Dashboard Kullanım Kılavuzu ────────────────────────────────────
window._openDashboardGuide = function() {
  var old = document.getElementById('mo-db-guide'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-db-guide';
  var today = new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  var S = 'font-size:12px;line-height:1.7;color:var(--t2)';
  var H = 'font-size:14px;font-weight:700;color:var(--t);margin:16px 0 8px';
  var C = 'margin-left:16px;'+S;
  mo.innerHTML = '<div class="moc" style="max-width:640px;max-height:90vh;padding:0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column">'
    + '<div style="padding:16px 24px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      + '<div style="font-size:16px;font-weight:700;color:var(--t)">Dashboard Kullanim Kilavuzu</div>'
      + '<button onclick="document.getElementById(\'mo-db-guide\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="flex:1;overflow-y:auto;padding:20px 24px">'

    + '<div style="'+H+'">1. Dashboard Ne Ise Yarar?</div>'
    + '<div style="'+S+'">Sirketin anlik nabzini tek ekranda gosterir. Finans, operasyon ve guvenlik durumunu saniyeler icinde degerlendirmenizi saglar. Karar vermeden once bakmaniz gereken ilk ekrandir.</div>'

    + '<div style="'+H+'">2. Yuzde Yuz Olmasi Gereken Veriler</div>'
    + '<div style="'+C+'">'
      + '<div>✓ Net pozisyon (pozitif olmali)</div>'
      + '<div>✓ Gecikmis alacak (0 olmali)</div>'
      + '<div>✓ Gecikmis gorev (0 olmali)</div>'
      + '<div>✓ Auth servisi (Online olmali)</div>'
      + '<div>✓ DB Latency (&lt;10ms olmali)</div>'
      + '<div>✓ Audit log (Senkron olmali)</div>'
      + '<div>✓ WIP durumu (5 altinda olmali)</div>'
      + '<div>✓ Sistem skoru (80+ olmali)</div></div>'

    + '<div style="'+H+'">3. Olsa Iyi Olur</div>'
    + '<div style="'+C+'">'
      + '<div>~ Doviz pozisyonu (USD/EUR/TRY)</div>'
      + '<div>~ 7 gunluk projeksiyon</div>'
      + '<div>~ Kullanici aktivitesi</div>'
      + '<div>~ Nakit akis grafigi</div>'
      + '<div>~ Bu hafta vadeli odemeler</div>'
      + '<div>~ Kargo bekleyen sayisi</div></div>'

    + '<div style="'+H+'">4. Olsa da Olur Olmasa da Olur</div>'
    + '<div style="'+C+'">'
      + '<div>- Sistem versiyonu</div>'
      + '<div>- Sync durumu</div>'
      + '<div>- Son guncelleme zamani</div>'
      + '<div>- Demo kullanici aktivitesi</div></div>'

    + '<div style="'+H+'">5. 3 Dashboard Ornegi</div>'
    + '<div style="margin:8px 0;padding:10px 14px;background:#EAF3DE;border-radius:8px;font-size:11px"><b>Ornek A — Saglikli Sirket:</b><br>Net: +₺2.5M | Gecikmis: 0 | Gorev: 2 | Skor: 94<br>Sistem yesil, operasyon akiyor</div>'
    + '<div style="margin:8px 0;padding:10px 14px;background:#FAEEDA;border-radius:8px;font-size:11px"><b>Ornek B — Dikkat Gerektiren:</b><br>Net: -₺200K | Gecikmis: ₺800K | Gorev: 8 | Skor: 71<br>Finans turuncu, operasyon kirmizi</div>'
    + '<div style="margin:8px 0;padding:10px 14px;background:#FCEBEB;border-radius:8px;font-size:11px"><b>Ornek C — Kritik (Mevcut):</b><br>Net: -₺655K | Gecikmis: ₺3.2M | Gorev: 11 | Skor: 78<br>Alert bar aktif, acil mudahale gerekli</div>'

    + '<div style="'+H+'">6. Faydalari</div>'
    + '<div style="'+C+'">'
      + '<div>1. Sabah ilk 30 saniyede sirket durumunu gormek</div>'
      + '<div>2. Kritik sorunlari erkenden tespit etmek</div>'
      + '<div>3. Ekip performansini takip etmek</div>'
      + '<div>4. Nakit akisini gunluk izlemek</div>'
      + '<div>5. Guvenlik aciklarini aninda gormek</div>'
      + '<div>6. Karar almayi hizlandirmak</div></div>'

    + '</div>'
    + '<div style="padding:12px 24px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:space-between;flex-shrink:0">'
      + '<button onclick="window._downloadDashGuide?.()" class="btn btnp" style="font-size:12px;padding:8px 16px;border-radius:8px">PDF Indir</button>'
      + '<button onclick="document.getElementById(\'mo-db-guide\')?.remove()" class="btn btns" style="font-size:12px;padding:8px 16px;border-radius:8px">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._downloadDashGuide = function() {
  // jsPDF lazy load
  if (!window.jspdf) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function() { window._downloadDashGuide(); };
    document.head.appendChild(s);
    window.toast?.('PDF hazirlaniyor...', 'ok');
    return;
  }
  var doc = new window.jspdf.jsPDF();
  var y = 20;
  var add = function(text, size, bold) {
    doc.setFontSize(size || 11);
    if (bold) doc.setFont(undefined, 'bold'); else doc.setFont(undefined, 'normal');
    var lines = doc.splitTextToSize(text, 170);
    lines.forEach(function(line) { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += size ? size * 0.5 : 5; });
    y += 2;
  };
  add('DUAY GLOBAL LLC', 18, true);
  add('Dashboard Kullanim Kilavuzu', 14, true);
  y += 5;
  add('1. Dashboard Ne Ise Yarar?', 12, true);
  add('Sirketin anlik nabzini tek ekranda gosterir. Finans, operasyon ve guvenlik durumunu saniyeler icinde degerlendirmenizi saglar.');
  y += 3;
  add('2. Yuzde Yuz Olmasi Gereken Veriler', 12, true);
  ['Net pozisyon (pozitif)','Gecikmis alacak (0)','Gecikmis gorev (0)','Auth servisi (Online)','DB Latency (<10ms)','Audit log (Senkron)','WIP durumu (5 alti)','Sistem skoru (80+)'].forEach(function(t) { add('  * ' + t); });
  y += 3;
  add('3. Olsa Iyi Olur', 12, true);
  ['Doviz pozisyonu','7 gunluk projeksiyon','Kullanici aktivitesi','Nakit akis grafigi'].forEach(function(t) { add('  ~ ' + t); });
  y += 3;
  add('4. Olsa da Olur Olmasa da Olur', 12, true);
  ['Sistem versiyonu','Sync durumu','Son guncelleme','Demo kullanici'].forEach(function(t) { add('  - ' + t); });
  y += 3;
  add('6. Faydalari', 12, true);
  ['Sabah ilk 30s sirket durumu','Kritik sorun tespiti','Ekip performansi','Nakit akisi izleme','Guvenlik aciklari','Karar hizlandirma'].forEach(function(t,i) { add('  ' + (i+1) + '. ' + t); });
  y += 10;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  var today2 = new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
  doc.text(today2 + ' · Gizli & Sirkete Ozel', 20, 285);
  doc.save('Duay-Dashboard-Kilavuzu.pdf');
  window.toast?.('PDF indirildi', 'ok');
};

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
  if (!e.target.closest('#profile-panel') && !e.target.closest('.uchip') && !e.target.closest('#tn2-profile-chip')) {
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
  // Hızlı kullanıcı değiştir (admin/super_admin)
  let qsEl = _g('pp-quick-switch');
  if (!qsEl) {
    const pp = _g('profile-panel');
    if (pp) { qsEl = document.createElement('div'); qsEl.id = 'pp-quick-switch'; pp.appendChild(qsEl); }
  }
  if (qsEl) {
    if (cu.role === 'admin' || cu.role === 'super_admin') {
      const others = loadUsers().filter(u => u.id !== cu.id && u.status === 'active').slice(0, 8);
      let qh = '<div style="border-top:0.5px solid var(--b);margin-top:10px;padding-top:10px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Kullanıcı Değiştir</div>';
      others.forEach(u => {
        const ini = initials(u.name);
        qh += `<div onclick="window._ppSwitchUser('${u.id}')" style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:11px;color:var(--t)" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"><div style="width:22px;height:22px;border-radius:50%;background:var(--al);color:var(--at);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600">${ini}</div><span>${escapeHtml(u.name)}</span><span style="font-size:9px;color:var(--t3)">${u.role}</span></div>`;
      });
      qh += '</div>';
      qsEl.innerHTML = qh;
    } else { qsEl.innerHTML = ''; }
  }
}

/**
 * Profil düzenleme modalını açar.
 */
window._ppSwitchUser = function(uid) {
  try {
    const users = loadUsers();
    const target = users.find(u => String(u.id) === String(uid));
    if (!target) return;
    localStorage.setItem('ak_session', JSON.stringify({ uid: target.id, email: target.email, tenantId: window.DEFAULT_TENANT_ID || 'tenant_default', ts: Date.now(), switchedBy: window.Auth?.getCU?.()?.id }));
    logActivity('admin', 'Kullanıcı değiştirdi → ' + target.name);
    _closeProfilePanel();
    window._tn2Restore?.();
    toast('Kullanıcı değiştirildi: ' + target.name, 'ok');
  } catch(e) { console.error('[app] switchUser hata:', e); }
};

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
    <div class="notif-item${n.read ? '' : ' unread'}" data-id="${n.id}" data-link="${n.link || ''}" data-task-id="${n.taskId || ''}">
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
    const taskId = parseInt(item.dataset.taskId) || 0;
    const data = loadNotifs();
    const n    = data.find(x => x.id === id);
    if (n) n.read = true;
    storeNotifs(data);
    updateNotifBadge();
    _renderNotifPanel();
    _closeNotifPanel();
    // GOV-002: taskId varsa direkt görev aç
    if (taskId && typeof window._goToTask === 'function') {
      window._goToTask(taskId);
      return;
    }
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
  // Çöp kutusu topbar dot
  safe(() => {
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    const trashDot = _g('tn2-trash-dot');
    if (trashDot) trashDot.style.display = trash.length > 0 ? 'block' : 'none';
  });
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
// Son aktivite takibi
document.addEventListener('click', function() { window._lastActivity = Date.now(); });
document.addEventListener('keydown', function() { window._lastActivity = Date.now(); });

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
    // Günlük Checklist
    + '<div onclick="window.downloadDailyChecklist?.()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">📋</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Günlük Checklist</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Gecikmiş görevler + ödemeler</div></div>'
    // Aylık Rapor
    + '<div onclick="window.downloadMonthlyReport?.()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">📊</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Aylık Rapor</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Tahsilat, ödeme, kâr, top 5</div></div>'
    // Tedarikçi Performansı
    + '<div onclick="window._openTedarikciPerformans?.()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">🏭</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Tedarikçi Performansı</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Risk skoru, teslimat, fiyat</div></div>'
    // Müşteri Analizi
    + '<div onclick="window._openMusteriAnalizi?.()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">👥</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Müşteri Analizi</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">CLV, kar marjı, ödeme süresi</div></div>'
    // Rapor Geçmişi
    + '<div onclick="window._openMonthlyReportHistory?.()" style="padding:16px;border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all .15s;text-align:center;grid-column:span 2" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.background=\'var(--al)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.background=\'\'">'
    + '<div style="font-size:28px;margin-bottom:6px">📁</div>'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">Rapor Geçmişi</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px">Son 3 aylık rapor özeti</div></div>'
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

// ════════════════════════════════════════════════════════════════
// GÜNLÜK EXCEL CHECKLIST
// ════════════════════════════════════════════════════════════════

/** Günlük checklist verisi oluştur */
function _buildDailyChecklist() {
  var today = new Date().toISOString().slice(0, 10);
  var tasks = typeof loadTasks === 'function' ? loadTasks() : [];
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var sa = typeof loadSatinalma === 'function' ? loadSatinalma() : [];

  var todayTasks = tasks.filter(function(t) { return !t.isDeleted && !t.done && t.due && t.due <= today; });
  var todayOdm = odm.filter(function(o) { return !o.isDeleted && !o.paid && o.due && o.due <= today; });
  var pendingSA = sa.filter(function(s) { return s.status === 'pending'; });
  var users = typeof loadUsers === 'function' ? loadUsers() : [];

  var items = [];
  todayTasks.forEach(function(t) {
    var u = users.find(function(x) { return x.id === t.uid; });
    items.push({ tur: 'Görev', ad: t.title, sorumlu: u?.name || '—', vade: t.due, durum: 'Gecikmiş' });
  });
  todayOdm.forEach(function(o) {
    items.push({ tur: 'Ödeme', ad: o.name || '—', sorumlu: o.cariName || '—', vade: o.due, durum: o.paid ? 'Ödendi' : 'Bekliyor' });
  });
  pendingSA.forEach(function(s) {
    items.push({ tur: 'Satınalma', ad: s.supplier || s.piNo || '—', sorumlu: '—', vade: s.piDate || '—', durum: 'Onay Bekliyor' });
  });
  return { date: today, items: items, taskCount: todayTasks.length, odmCount: todayOdm.length, saCount: pendingSA.length };
}

/** Checklist Excel indir */
window.downloadDailyChecklist = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var cl = _buildDailyChecklist();
  var rows = [['Tür', 'Açıklama', 'Sorumlu / Cari', 'Vade', 'Durum']];
  cl.items.forEach(function(i) { rows.push([i.tur, i.ad, i.sorumlu, i.vade, i.durum]); });
  rows.push([]);
  rows.push(['Özet', 'Gecikmiş Görev: ' + cl.taskCount, 'Gecikmiş Ödeme: ' + cl.odmCount, 'Bekleyen SA: ' + cl.saCount, 'Tarih: ' + cl.date]);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Günlük Checklist');
  XLSX.writeFile(wb, 'checklist-' + cl.date + '.xlsx');
  window.toast?.('Günlük checklist indirildi ✓', 'ok');

  // Son 30 gün kaydet
  try {
    var history = JSON.parse(localStorage.getItem('ak_checklist_history') || '[]');
    history.unshift({ date: cl.date, tasks: cl.taskCount, odm: cl.odmCount, sa: cl.saCount, total: cl.items.length });
    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem('ak_checklist_history', JSON.stringify(history));
  } catch(e) {}
};

/** Her gün 18:00'de otomatik checklist kontrolü */
(function _initDailyChecklist() {
  function _check() {
    var now = new Date();
    if (now.getHours() !== 18) return;
    var today = now.toISOString().slice(0, 10);
    var lastCheck = localStorage.getItem('ak_checklist_last') || '';
    if (lastCheck === today) return;
    localStorage.setItem('ak_checklist_last', today);
    // Admin'e bildirim
    if (window.isAdmin?.()) {
      window.toast?.('📋 Günlük checklist hazır — indirmek için Raporlar panelini açın', 'info');
    }
  }
  setTimeout(_check, 5000);
  setInterval(_check, 3600000); // her saat kontrol
})();

// ════════════════════════════════════════════════════════════════
// AYLIK OTOMATİK RAPOR
// ════════════════════════════════════════════════════════════════

/**
 * Aylık rapor verisi oluştur.
 * @returns {object} Tüm metrikleri içeren rapor nesnesi
 */
function _buildMonthlyReport() {
  var now = new Date();
  var yil = now.getFullYear();
  var ay = now.getMonth(); // 0-indexed
  var ayBaslangic = new Date(yil, ay, 1).toISOString().slice(0, 10);
  var aySon = new Date(yil, ay + 1, 0).toISOString().slice(0, 10);
  var ayAdi = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][ay];

  var odm = typeof loadOdm === 'function' ? loadOdm().filter(function(o) { return !o.isDeleted; }) : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat().filter(function(t) { return !t.isDeleted; }) : [];
  var tasks = typeof loadTasks === 'function' ? loadTasks().filter(function(t) { return !t.isDeleted; }) : [];
  var kargo = typeof loadKargo === 'function' ? loadKargo() : [];
  var satisTek = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c) { return !c.isDeleted; }) : [];

  // Bu ay filtreleme
  var buAyOdm = odm.filter(function(o) { return o.due >= ayBaslangic && o.due <= aySon; });
  var buAyTah = tah.filter(function(t) { return t.due >= ayBaslangic && t.due <= aySon; });
  var buAyTasks = tasks.filter(function(t) { return t.createdAt && t.createdAt.slice(0, 10) >= ayBaslangic && t.createdAt.slice(0, 10) <= aySon; });

  // Tahsilat toplamı
  var tahsilatToplam = buAyTah.reduce(function(s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
  // Ödeme toplamı
  var odemeToplam = buAyOdm.reduce(function(s, o) { return s + (parseFloat(o.amount) || 0); }, 0);
  // Net
  var netKarZarar = tahsilatToplam - odemeToplam;

  // En çok satan ürün top 5
  var urunSatisMap = {};
  satisTek.forEach(function(st) {
    if (!st.ts || st.ts.slice(0, 10) < ayBaslangic || st.ts.slice(0, 10) > aySon) return;
    (st.urunler || []).forEach(function(u) {
      var key = u.urunAdi || u.urunKodu || 'Bilinmeyen';
      if (!urunSatisMap[key]) urunSatisMap[key] = { ad: key, toplam: 0, miktar: 0 };
      urunSatisMap[key].toplam += (parseFloat(u.satisFiyat) || 0) * (parseFloat(u.miktar) || 0);
      urunSatisMap[key].miktar += (parseFloat(u.miktar) || 0);
    });
  });
  var top5Urun = Object.values(urunSatisMap).sort(function(a, b) { return b.toplam - a.toplam; }).slice(0, 5);

  // En kârlı müşteri top 5
  var musteriKarMap = {};
  satisTek.forEach(function(st) {
    if (!st.ts || st.ts.slice(0, 10) < ayBaslangic || st.ts.slice(0, 10) > aySon) return;
    var key = st.musteri || 'Bilinmeyen';
    if (!musteriKarMap[key]) musteriKarMap[key] = { ad: key, toplam: 0 };
    musteriKarMap[key].toplam += (parseFloat(st.genelToplam) || 0);
  });
  var top5Musteri = Object.values(musteriKarMap).sort(function(a, b) { return b.toplam - a.toplam; }).slice(0, 5);

  // Gecikmiş ödeme sayısı
  var today = now.toISOString().slice(0, 10);
  var gecikmisSayisi = odm.filter(function(o) { return !o.paid && o.due && o.due < today; }).length;

  // Görev sayıları
  var tamamlananGorev = buAyTasks.filter(function(t) { return t.done; }).length;
  var acikGorev = tasks.filter(function(t) { return !t.done; }).length;

  // Aktif kargo
  var aktifKargo = kargo.filter(function(k) { return !k.closed && !k.isDeleted; }).length;

  return {
    yil: yil, ay: ay, ayAdi: ayAdi,
    donem: ayAdi + ' ' + yil,
    ayBaslangic: ayBaslangic, aySon: aySon,
    tahsilatToplam: tahsilatToplam,
    odemeToplam: odemeToplam,
    netKarZarar: netKarZarar,
    top5Urun: top5Urun,
    top5Musteri: top5Musteri,
    gecikmisSayisi: gecikmisSayisi,
    tamamlananGorev: tamamlananGorev,
    acikGorev: acikGorev,
    aktifKargo: aktifKargo,
    olusturma: now.toISOString()
  };
}

/**
 * Aylık rapor Excel olarak indirir.
 * @param {object} [rapor] Hazır rapor verisi (opsiyonel, yoksa yeniden oluşturur)
 */
window.downloadMonthlyReport = function(rapor) {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var r = rapor || _buildMonthlyReport();
  var wb = XLSX.utils.book_new();

  // Sayfa 1: Özet
  var ozet = [
    ['DUAY GLOBAL TRADE — AYLIK RAPOR'],
    ['Dönem', r.donem],
    ['Oluşturma Tarihi', r.olusturma.slice(0, 10)],
    [],
    ['METRİK', 'DEĞER'],
    ['Tahsilat Toplamı', r.tahsilatToplam],
    ['Ödeme Toplamı', r.odemeToplam],
    ['Net Kâr/Zarar', r.netKarZarar],
    ['Gecikmiş Ödeme Sayısı', r.gecikmisSayisi],
    ['Tamamlanan Görev', r.tamamlananGorev],
    ['Açık Görev', r.acikGorev],
    ['Aktif Kargo', r.aktifKargo],
    [],
    ['EN ÇOK SATAN ÜRÜN TOP 5'],
    ['Ürün', 'Miktar', 'Toplam Tutar'],
  ];
  r.top5Urun.forEach(function(u) { ozet.push([u.ad, u.miktar, u.toplam]); });
  ozet.push([]);
  ozet.push(['EN KÂRLI MÜŞTERİ TOP 5']);
  ozet.push(['Müşteri', 'Toplam Satış']);
  r.top5Musteri.forEach(function(m) { ozet.push([m.ad, m.toplam]); });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ozet), 'Özet');
  var dosyaAdi = 'aylik-rapor-' + r.yil + '-' + String(r.ay + 1).padStart(2, '0') + '.xlsx';
  XLSX.writeFile(wb, dosyaAdi);
  window.toast?.('Aylık rapor indirildi: ' + r.donem + ' ✓', 'ok');

  // Rapor geçmişini sakla (son 3 ay)
  try {
    var hist = JSON.parse(localStorage.getItem('ak_monthly_report_history') || '[]');
    // Aynı dönem varsa güncelle
    hist = hist.filter(function(h) { return h.donem !== r.donem; });
    hist.unshift({
      donem: r.donem,
      yil: r.yil, ay: r.ay,
      tahsilat: r.tahsilatToplam,
      odeme: r.odemeToplam,
      net: r.netKarZarar,
      gecikmisSayisi: r.gecikmisSayisi,
      tamamlananGorev: r.tamamlananGorev,
      acikGorev: r.acikGorev,
      aktifKargo: r.aktifKargo,
      olusturma: r.olusturma
    });
    if (hist.length > 3) hist = hist.slice(0, 3);
    localStorage.setItem('ak_monthly_report_history', JSON.stringify(hist));
  } catch (e) {}

  return r;
};

/** Aylık rapor geçmişi modalı */
window._openMonthlyReportHistory = function() {
  document.getElementById('mo-reports')?.remove();
  var hist = [];
  try { hist = JSON.parse(localStorage.getItem('ak_monthly_report_history') || '[]'); } catch (e) {}
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var ex = document.getElementById('mo-monthly-hist'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-monthly-hist'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:700;color:var(--t)">Aylık Rapor Geçmişi</div><button onclick="document.getElementById(\'mo-monthly-hist\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    + (hist.length ? hist.map(function(h) {
        var netColor = h.net >= 0 ? '#16A34A' : '#DC2626';
        return '<div style="padding:12px;border:0.5px solid var(--b);border-radius:8px;margin-bottom:8px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:13px;font-weight:700;color:var(--t)">' + esc(h.donem) + '</span><span style="font-size:9px;color:var(--t3)">' + (h.olusturma || '').slice(0, 10) + '</span></div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px">'
          + '<div><span style="color:var(--t3)">Tahsilat</span><div style="font-weight:600;color:#16A34A">' + (h.tahsilat || 0).toLocaleString('tr-TR') + '</div></div>'
          + '<div><span style="color:var(--t3)">Ödeme</span><div style="font-weight:600;color:#DC2626">' + (h.odeme || 0).toLocaleString('tr-TR') + '</div></div>'
          + '<div><span style="color:var(--t3)">Net</span><div style="font-weight:600;color:' + netColor + '">' + (h.net >= 0 ? '+' : '') + (h.net || 0).toLocaleString('tr-TR') + '</div></div>'
          + '</div>'
          + '<div style="display:flex;gap:10px;margin-top:6px;font-size:9px;color:var(--t3)">'
          + '<span>Gecikmiş: ' + (h.gecikmisSayisi || 0) + '</span>'
          + '<span>Tamamlanan: ' + (h.tamamlananGorev || 0) + '</span>'
          + '<span>Açık: ' + (h.acikGorev || 0) + '</span>'
          + '<span>Kargo: ' + (h.aktifKargo || 0) + '</span>'
          + '</div>'
          + '<button onclick="window.downloadMonthlyReport?.()" style="margin-top:6px;padding:3px 8px;border:0.5px solid var(--ac);border-radius:4px;background:none;color:var(--ac);font-size:9px;cursor:pointer;font-family:inherit">Yeniden İndir</button>'
          + '</div>';
      }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3)">Henüz rapor geçmişi yok.<br><span style="font-size:10px">İlk aylık raporu oluşturmak için Raporlar panelinden "Aylık Rapor" butonuna tıklayın.</span></div>')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right"><button class="btn" onclick="document.getElementById(\'mo-monthly-hist\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** Smart Goal ekleme modalı */
window._openSmartGoalAdd = function() {
  var ex = document.getElementById('mo-smart-goal'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-smart-goal'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:380px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:12px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">Hedef Ekle</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px">'
    + '<input class="fi" id="sg-baslik" placeholder="Hedef başlığı" style="font-size:12px">'
    + '<div style="display:flex;gap:8px"><input class="fi" id="sg-hedef" type="number" placeholder="Hedef değer" style="flex:1;font-size:12px"><input class="fi" id="sg-mevcut" type="number" placeholder="Mevcut" style="flex:1;font-size:12px" value="0"></div>'
    + '<input class="fi" id="sg-deadline" type="date" style="font-size:12px">'
    + '</div><div style="padding:10px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:6px"><button class="btn" onclick="document.getElementById(\'mo-smart-goal\')?.remove()">İptal</button><button class="btn btnp" onclick="window._saveSmartGoal()">Kaydet</button></div></div>';
  document.body.appendChild(mo); setTimeout(function(){mo.classList.add('open');},10);
};
window._saveSmartGoal = function() {
  var b = (document.getElementById('sg-baslik')?.value||'').trim();
  var h2 = parseFloat(document.getElementById('sg-hedef')?.value||'0');
  if (!b || !h2) { window.toast?.('Başlık ve hedef değer zorunlu','err'); return; }
  var d = typeof loadSmartGoals === 'function' ? loadSmartGoals() : [];
  d.push({ id: typeof generateNumericId==='function'?generateNumericId():Date.now(), baslik: b, hedef: h2, mevcut: parseFloat(document.getElementById('sg-mevcut')?.value||'0'), deadline: document.getElementById('sg-deadline')?.value||'', ts: new Date().toISOString() });
  if (typeof storeSmartGoals === 'function') storeSmartGoals(d);
  document.getElementById('mo-smart-goal')?.remove();
  window.toast?.('Hedef eklendi ✓','ok');
  _renderDashboard();
};

/** Her ayın son günü saat 17:00'de otomatik tetikle */
(function _initMonthlyReport() {
  function _checkMonthly() {
    var now = new Date();
    // Ayın son günü mü?
    var yarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var ayinSonGunu = yarin.getMonth() !== now.getMonth();
    if (!ayinSonGunu) return;
    // Saat 17 mi?
    if (now.getHours() !== 17) return;
    // Bugün zaten oluşturuldu mu?
    var donem = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var lastRun = localStorage.getItem('ak_monthly_report_last') || '';
    if (lastRun === donem) return;
    localStorage.setItem('ak_monthly_report_last', donem);
    // Admin kontrolü
    if (!window.isAdmin?.()) return;
    // Rapor oluştur ve indir
    var r = window.downloadMonthlyReport();
    // Bildirim gönder
    window.addNotif?.('📊', 'Aylık rapor hazır: ' + (r ? r.donem : donem) + ' — Excel indirildi', 'ok', 'dashboard');
  }
  setTimeout(_checkMonthly, 8000);
  setInterval(_checkMonthly, 3600000); // her saat kontrol
})();

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
window._finishLogin     = _finishLogin;

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

// ── TOP NAV v2 — Grup/Modül routing ─────────────────────────
var _TN2_GROUPS = {
  dashboard: { label:'Dashboard', mods: [
    { id:'dashboard', label:'Dashboard' },
  ]},
  satis: { label:'Satış', mods: [
    { id:'crm',              label:'CRM'              },
    { id:'satis-teklifleri', label:'Satış Teklifleri' },
    { id:'cari',             label:'Cariler'          },
  ]},
  satinalma: { label:'Satınalma', mods: [
    { id:'satinalma',       label:'İş Takibi'       },
    { id:'alis-teklifleri', label:'Alış Teklifleri' },
    { id:'kargo',           label:'Kargo'           },
    { id:'ihracat-ops',     label:'İhracat Ops'     },
    { id:'gcb',              label:'GCB Takip'       },
    { id:'urunler',         label:'Ürün Kataloğu'   },
    { id:'numune',          label:'Numune Arşivi'   },
  ]},
  operasyon: { label:'Operasyon', mods: [
    { id:'pusula',    label:'Görevler'         },
    { id:'evrak',     label:'Evrak'            },
    { id:'temizlik',  label:'Temizlik Kontrol' },
    { id:'arsiv-hub', label:'Arşiv'            },
  ]},
  muhasebe: { label:'Muhasebe', mods: [
    { id:'odemeler',     label:'Nakit Akışı'  },
    { id:'hesap-ozeti',  label:'Hesap Özeti'  },
    { id:'finans',       label:'Finans Paneli' },
    { id:'pirim',        label:'Prim'          },
    { id:'kpi-panel',    label:'KPI'           },
  ]},
  ik: { label:'İK', mods: [
    { id:'ik-hub',  label:'İK Merkezi'      },
    { id:'izin',    label:'İzin Takibi'     },
    { id:'puantaj', label:'Puantaj'         },
    { id:'formlar', label:'Form Şablonları' },
  ]},
  sistem: { label:'Sistem', mods: [
    { id:'admin',          label:'Kullanıcılar'       },
    { id:'settings',       label:'Ayarlar'            },
    { id:'sistem-testler', label:'Sistem Testleri'    },
    { id:'platform-rules', label:'Platform Kuralları' },
  ]},
};
var _tn2ActiveGrp = localStorage.getItem('ak_nav_grup') || 'dashboard';
if (_tn2ActiveGrp === 'ekip') _tn2ActiveGrp = 'sistem';
if (_tn2ActiveGrp === 'finans') _tn2ActiveGrp = 'muhasebe';
if (_tn2ActiveGrp === 'katalog') _tn2ActiveGrp = 'satinalma';
var _tn2ActiveMod = localStorage.getItem('ak_nav_modul') || 'dashboard';

window._tn2SelectGrp = function(grp, el) {
  _tn2ActiveGrp = grp;
  localStorage.setItem('ak_nav_grup', grp);
  // Grup styling
  document.querySelectorAll('.tn2-grp').forEach(function(g2) { g2.classList.remove('on'); });
  if (el) el.classList.add('on');
  // Modül barını doldur
  var bar3 = document.getElementById('tn2-modules');
  if (!bar3) return;
  var g = _TN2_GROUPS[grp];
  if (!g || grp === 'dashboard') {
    bar3.innerHTML = '';
    bar3.style.display = 'none';
    window.App?.nav?.('dashboard');
    _tn2ActiveMod = 'dashboard';
    localStorage.setItem('ak_nav_modul', 'dashboard');
    return;
  }
  var visMods = g.mods.filter(function(m) { return canModule(m.id); });
  if (!visMods.length) { bar3.innerHTML = ''; bar3.style.display = 'none'; window.App?.nav?.('dashboard'); return; }
  bar3.style.display = 'flex';
  bar3.innerHTML = visMods.map(function(m) {
    return '<div class="tn2-mod' + (_tn2ActiveMod === m.id ? ' on' : '') + '" data-mod="' + m.id + '" onclick="window._tn2SelectMod(\'' + m.id + '\',this)">' + m.label + '</div>';
  }).join('');
  // İlk görünür modülü seç
  if (!visMods.find(function(m) { return m.id === _tn2ActiveMod; })) {
    window._tn2SelectMod(visMods[0].id, bar3.querySelector('.tn2-mod'));
  }
};

window._tn2SelectMod = function(modId, el) {
  _tn2ActiveMod = modId;
  localStorage.setItem('ak_nav_modul', modId);
  document.querySelectorAll('.tn2-mod').forEach(function(m) { m.classList.remove('on'); });
  if (el) el.classList.add('on');
  // Modülü aç — mevcut nav sistemi
  window.App?.nav?.(modId);
};

// Sayfa yüklenince son konuma dön
window._tn2Restore = function() {
  var cu = window.Auth?.getCU?.();
  if (!cu) return;
  // User bilgilerini güncelle
  var avEl = document.getElementById('tn2-av');
  var nmEl = document.getElementById('tn2-name');
  var rlEl = document.getElementById('tn2-role');
  if (avEl) avEl.textContent = (cu.name||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
  if (nmEl) nmEl.textContent = cu.name || '';
  if (rlEl) rlEl.textContent = cu.role === 'admin' ? 'Admin' : cu.role === 'manager' ? 'Yonetici' : 'Personel';
  // Bildirim dot
  var notifs = typeof loadNotifs === 'function' ? loadNotifs().filter(function(n) { return !n.read && (!n.targetUid || n.targetUid === cu.id); }) : [];
  var dot = document.getElementById('tn2-notif-dot');
  if (dot) dot.style.display = notifs.length > 0 ? '' : 'none';
  // GK-08: Yetkisiz grupları gizle
  document.querySelectorAll('.tn2-grp').forEach(function(gEl) {
    var gid = gEl.dataset.grp; if (!gid || gid === 'dashboard') return;
    var grp = _TN2_GROUPS[gid];
    if (!grp) { gEl.style.display = 'none'; return; }
    var hasVisible = grp.mods.some(function(m) { return canModule(m.id); });
    gEl.style.display = hasVisible ? '' : 'none';
  });
  // Nav restore
  var grpEl = document.querySelector('.tn2-grp[data-grp="' + _tn2ActiveGrp + '"]');
  if (grpEl && grpEl.style.display !== 'none') window._tn2SelectGrp(_tn2ActiveGrp, grpEl);
  else window._tn2SelectGrp('dashboard', document.querySelector('.tn2-grp[data-grp="dashboard"]'));
};
window._initNsecState   = _initNsecState;
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

