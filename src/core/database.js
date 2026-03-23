/**
 * ═══════════════════════════════════════════════════════════════
 * src/core/database.js  —  v8.1.0
 * Merkezi Veri Katmanı — Tüm load* / store* / save* fonksiyonları
 *
 * Anayasa Kural 2 : Firebase senkronizasyon mantığı korunur.
 * Anayasa Kural 3 : Her public fonksiyon JSDoc ile belgelenmiştir.
 * Anayasa Kural 4 : GlobalErrorHandler entegrasyonu —
 *                   her yazma hatası toast + console ile raporlanır.
 *
 * Yükleme sırası  : config/firebase.js → bu dosya → diğer modüller
 * Dışa aktarım    : window.DB  (aşağı bak)
 *                   Geriye uyumluluk için tüm fonksiyonlar
 *                   window.* üzerinden de erişilebilir.
 * ═══════════════════════════════════════════════════════════════
 */
(function(){
'use strict';

// ── Versiyon ─────────────────────────────────────────────────────
const DB_VERSION = '8.0.0';

// ── localStorage Anahtar Sabitleri ───────────────────────────────
/** @type {Object.<string,string>} Tüm localStorage key'leri tek yerden */
const KEYS = {
  users         : 'ak_u3',
  puan          : 'ak_pn2',
  tasks         : 'ak_tk2',
  calendar      : 'ak_cal2',
  suggestions   : 'ak_sk1',
  announcements : 'ak_ann1',
  links         : 'ak_lnk2',
  notes         : 'ak_nt1',
  activity      : 'ak_act1',
  currencies    : 'ak_currencies1',
  kargoFirms    : 'ak_krg_firms1',
  rehber        : 'ak_rehber1',
  hedefler      : 'ak_hdf2',
  trash         : 'ak_trash1',
  odemeler      : 'ak_odm1',
  kargo         : 'ak_krg1',
  greetings     : 'ak_grt1',
  stok          : 'ak_stk1',
  ik            : 'ak_ik1',
  evrak         : 'ak_evrak1',
  arsivDolaplar : 'ak_arsiv_d1',
  arsivBelgeler : 'ak_arsiv_b1',
  kpi           : 'ak_kpi1',
  kararlar      : 'ak_karar1',
  crm           : 'ak_crm1',
  numune        : 'ak_numune1',
  temizlik      : 'ak_temizlik1',
  resmiEvrak    : 'ak_resmi1',
  etkinlik      : 'ak_etkinlik1',
  fuarKriter    : 'ak_fuar_kriter1',
  notifications : 'ak_notif1',
  hesapHistory  : 'ak_hesap1',
  pirim         : 'ak_pirim1',
  pirimParams   : 'ak_pirim_params1',
  localDocs     : 'ak_docs_local1',
  kargoChecks   : 'ak_krg_checks1',
  konteyner     : 'ak_konteyn1',
  nsecState     : 'ak_nsec_state',
  izin          : 'ak_izin1',
  tebligat      : 'ak_tebligat1',
  tatilAyarlar  : 'ak_tatil1',
  kpiLog        : 'ak_kpi_log1',
  taskChats     : 'ak_task_chat1',
  theme         : 'ak_theme',
  lang          : 'ak_lang',
  pusView       : 'ak_pus_view',
  noteView      : 'ak_nview',
};

// ════════════════════════════════════════════════════════════════
// MERKEZI HATA YÖNETİCİSİ (Anayasa Kural 4)
// ════════════════════════════════════════════════════════════════

/**
 * Veri katmanı hatalarını merkezi olarak yönetir.
 * Toast gösterir (eğer window.toast mevcutsa), konsola yazar.
 * @param {string} context  Hangi fonksiyonda hata oluştu
 * @param {Error}  err      Hata nesnesi
 * @param {'warn'|'err'} [level='warn']
 */
function GlobalErrorHandler(context, err, level = 'warn') {
  const msg = `[DB:${context}] ${err?.message || err}`;
  console.error(msg, err);
  // Toast sadece yazma/kritik hatalarda gösterilir
  if (level === 'err' && typeof window.toast === 'function') {
    window.toast(`Veri hatası: ${context} — ${err?.message || 'Bilinmeyen hata'}`, 'err');
  }
}

// ════════════════════════════════════════════════════════════════
// TEMEL YARDIMCI — güvenli JSON okuma/yazma
// ════════════════════════════════════════════════════════════════

/**
 * localStorage'dan güvenli JSON okur.
 * @param {string} key
 * @param {*}      fallback  Hata veya boş durumda döndürülür
 * @returns {*}
 */
function _read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    GlobalErrorHandler('_read:' + key, e, 'warn');
    return fallback;
  }
}

/**
 * localStorage'a güvenli JSON yazar.
 * @param {string} key
 * @param {*}      value
 * @returns {boolean} Başarılı mı?
 */
function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    GlobalErrorHandler('_write:' + key, e, 'err');
    if (typeof window.toast === 'function') {
      window.toast('Depolama alanı dolu! Bazı veriler kaydedilemedi.', 'err');
    }
    return false;
  }
}

/**
 * Firestore'a arka planda yazar — bağlı değilse sessizce atlar.
 * @param {string}   path    Firestore koleksiyon yolu (FS_PATHS fonksiyonu ile)
 * @param {*}        data    Yazılacak veri
 * @param {'set'|'add'} [mode='set']
 */
function _syncFirestore(path, data, mode = 'set') {
  try {
    const FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) return;
    const payload = { data, syncedAt: new Date().toISOString() };
    if (mode === 'set') {
      FB_DB.doc(path).set(payload, { merge: true })
        .catch(e => GlobalErrorHandler('_syncFirestore:' + path, e, 'warn'));
    } else {
      FB_DB.collection(path).add({ ...payload })
        .catch(e => GlobalErrorHandler('_syncFirestore:' + path, e, 'warn'));
    }
  } catch (e) {
    GlobalErrorHandler('_syncFirestore', e, 'warn');
  }
}

// paths nesnesini her zaman güvenli al
function _getPaths() {
  return window.FirebaseConfig?.paths
      || window.FS_PATHS
      || window._getFirestorePaths?.()
      || null;
}

// Tenant ID'yi güvenli al
function _getTid() {
  return window.Auth?.getTenantId?.()
      || window.DEFAULT_TENANT_ID
      || 'tenant_default';
}

// Koleksiyon için Firestore doc path üret
function _fsPath(collection) {
  const paths = _getPaths();
  const tid   = _getTid();
  if (!paths) return null;
  const base = (typeof paths.tenant === 'function') ? paths.tenant(tid) : `tenants/${tid}`;
  return base + '/' + collection;
}

// Zaman damgası yardımcısı
const p2    = n => String(n).padStart(2, '0');
/** @returns {string} 'YYYY-MM-DD HH:MM:SS' formatında şu anki zaman */
let nowTs = () => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth()+1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}:${p2(n.getSeconds())}`; };

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — KULLANICILAR
// ════════════════════════════════════════════════════════════════

/**
 * Demo kullanıcılar — Firebase bağlı değilken yerel giriş için kullanılır.
 *
 * ⚠️  GELİŞTİRME ORTAMI — Üretimde Firebase Auth kullanılır,
 *     bu şifreler otomatik olarak devre dışı kalır.
 *
 * Test girişi:
 *   Admin   → admin@sirket.com   / admin123
 *   Personel→ personel@sirket.com / personel123
 */
const DEFAULT_USERS = [
  { id: 1, name: 'Admin',        email: 'admin@sirket.com',     pw: '023e1829391a235dc15adcf2c9719c76a74e87e0454fb3f8ef6eda4f4358c972', role: 'admin', access: ['İK','Finans','Operasyon','Teknik','Maaş','Sistem'], modules: null, status: 'active', lastLogin: null },
  { id: 7, name: 'Duay Admin', email: 'duayft@gmail.com',   pw: '023e1829391a235dc15adcf2c9719c76a74e87e0454fb3f8ef6eda4f4358c972', role: 'admin', access: ['İK','Finans','Operasyon','Teknik','Maaş','Sistem'], modules: null, status: 'active', lastLogin: null },
  { id: 2, name: 'Demo Personel', email: 'personel@sirket.com', pw: '1e22ed1e01b436e0b1d0a027d224d52b68825dd84a263953412b47cf12b6dcc3', role: 'staff', access: ['İK'], modules: null, status: 'active', lastLogin: null },
];

/**
 * Kullanıcı listesini localStorage'dan okur.
 * @returns {Array<Object>} Kullanıcı dizisi
 */
function loadUsers() {
  const d = _read(KEYS.users);
  if (Array.isArray(d) && d.length > 0) return d;
  return DEFAULT_USERS;
}

/**
 * localStorage'daki kullanıcı verisini zorunlu günceller.
 * Eski pw:'' kayıtları yeni şifrelerle eşleştirir.
 * Sayfa yüklendiğinde otomatik çağrılır — eski veri sorunu çözülür.
 */
function _migrateUserPasswords() {
  try {
    const raw = localStorage.getItem(KEYS.users);
    if (!raw) return; // localStorage boş → DEFAULT_USERS zaten kullanılır
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return;
    let changed = false;
    DEFAULT_USERS.forEach(def => {
      const existing = stored.find(u => u.id === def.id);
      if (existing && (!existing.pw || existing.pw === '') && def.pw) {
        existing.pw = def.pw;
        changed = true;
        console.info('[DB] Şifre güncellendi:', existing.email);
      }
    });
    if (changed) localStorage.setItem(KEYS.users, JSON.stringify(stored));
  } catch (e) {}
}
// Sayfa yüklendiğinde otomatik çalıştır
_migrateUserPasswords();

/**
 * Kullanıcı listesini localStorage'a yazar ve Firestore'a senkronize eder.
 * @param {Array<Object>} data
 */
function saveUsers(data) {
  _write(KEYS.users, data);
  const _fp_users = _fsPath('users');
  if (_fp_users) _syncFirestore(_fp_users, data);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — PUANTAJ
// ════════════════════════════════════════════════════════════════

/** Demo puantaj kayıtları */
const DEFAULT_PUAN = [
  { id: 1, uid: 2, date: '2026-03-10', pI: '09:00', pO: '18:00', aI: '09:05', aO: '18:20', ok: true  },
  { id: 2, uid: 2, date: '2026-03-11', pI: '09:00', pO: '18:00', aI: '09:18', aO: '17:45', ok: false },
  { id: 3, uid: 3, date: '2026-03-10', pI: '09:00', pO: '18:00', aI: '08:55', aO: '18:00', ok: true  },
  { id: 4, uid: 4, date: '2026-03-10', pI: '09:00', pO: '18:00', aI: null,   aO: null,   ok: false },
];

/** @returns {Array<Object>} */
function loadPuan()        { const d = _read(KEYS.puan); return Array.isArray(d) ? d : DEFAULT_PUAN; }
/** @param {Array<Object>} d */
function savePuan(d)       { _write(KEYS.puan, d); 
  const _fp_puan = _fsPath('puan'); if (_fp_puan) _syncFirestore(_fp_puan, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — GÖREVLER (Pusula)
// ════════════════════════════════════════════════════════════════

/** Demo görev kayıtları */
const DEFAULT_TASKS = [
  { id: 1, uid: 2, title: 'Q1 Raporu hazırla', desc: 'Finans koordineli',  pri: 1, done: false, due: '2026-03-17', status: 'todo', subTasks: [] },
  { id: 2, uid: 2, title: 'Onboarding planı',  desc: 'Nisan için',         pri: 2, done: false, due: '2026-03-20', status: 'todo', subTasks: [] },
  { id: 3, uid: 3, title: 'Sprint 12 tamamla', desc: 'Backend API',        pri: 1, done: false, due: '2026-03-18', status: 'inprogress', subTasks: [] },
  { id: 4, uid: 3, title: 'Kod review',         desc: 'PR #42',             pri: 2, done: false, due: '2026-03-16', status: 'review', subTasks: [] },
  { id: 5, uid: 5, title: 'Bütçe revizyonu',    desc: 'Q2',                 pri: 1, done: false, due: '2026-03-16', status: 'todo', subTasks: [] },
];

/** @returns {Array<Object>} */
function loadTasks()       { const d = _read(KEYS.tasks); return Array.isArray(d) ? d : DEFAULT_TASKS; }
/** @param {Array<Object>} d */
function saveTasks(d)      { _write(KEYS.tasks, d); 
  const _fp_tasks = _fsPath('tasks'); if (_fp_tasks) _syncFirestore(_fp_tasks, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — TAKVİM
// ════════════════════════════════════════════════════════════════

const DEFAULT_CAL = [
  { id: 1, own: 0, title: 'Yönetim Toplantısı',   date: '2026-03-17', time: '10:00', type: 'meeting',  desc: 'Aylık toplantı',   status: 'approved' },
  { id: 2, own: 0, title: 'Q1 Rapor Son Tarihi',  date: '2026-03-31', time: '17:00', type: 'deadline', desc: 'Finansal rapor',   status: 'approved' },
  { id: 3, own: 0, title: 'Takım Yemeği',          date: '2026-03-20', time: '12:30', type: 'holiday',  desc: 'Öğle yemeği',     status: 'approved' },
];

// Takvim önbellek temizleme referansı (renderCal kullananlar için)
let _calInvalidate = null;
/** Takvim önbelleğini temizleyecek fonksiyon kaydeder (takvim modülü tarafından ayarlanır) */
function setCalInvalidator(fn) { _calInvalidate = fn; }

/** @returns {Array<Object>} */
function loadCal()         { const d = _read(KEYS.calendar); return Array.isArray(d) ? d : DEFAULT_CAL; }
/** @param {Array<Object>} d */
function saveCal(d)        { _write(KEYS.calendar, d); if (typeof _calInvalidate === 'function') _calInvalidate(); 
  const _fp_calendar = _fsPath('calendar'); if (_fp_calendar) _syncFirestore(_fp_calendar, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ÖNERİLER, DUYURULAR, NOTLAR, LİNKLER
// ════════════════════════════════════════════════════════════════

const DEFAULT_SUGGESTIONS = [
  { id: 1, uid: 2, title: 'Mobil Uygulama',   desc: 'iOS/Android destek.',   type: 'feature',     status: 'review',  ts: '2026-03-15 10:22:00' },
  { id: 2, uid: 3, title: 'Bildirim Sistemi', desc: 'E-posta bildirimi.',     type: 'improvement', status: 'pending', ts: '2026-03-14 14:05:00' },
];
const DEFAULT_ANN = [
  { id: 1, title: 'Platforma Hoş Geldiniz!', body: 'AkademiHub v8.0 kullanıma açıldı.', type: 'info', ts: '2026-03-19 10:00:00', read: [], audience: 'all' },
];
const DEFAULT_LINKS = [
  { id: 1, owner: 0, name: 'Google', url: 'https://google.com', icon: '🔍', vis: 'all', visRoles: [], visUsers: [] },
  { id: 2, owner: 0, name: 'Gmail',  url: 'https://gmail.com',  icon: '📧', vis: 'all', visRoles: [], visUsers: [] },
  { id: 3, owner: 0, name: 'Drive',  url: 'https://drive.google.com', icon: '☁️', vis: 'all', visRoles: [], visUsers: [] },
];
const DEFAULT_NOTES = [
  { id: 1, uid: 1, title: 'Platform Notları', body: '☐ Kullanıcıları ekle\n☑ İlk girişi yap', cat: 'genel', color: 'blue', pinned: true, ts: '2026-03-19 10:00:00', updated: '2026-03-19 10:00:00' },
];

/** @returns {Array<Object>} */ function loadSugg()    { const d = _read(KEYS.suggestions);   return Array.isArray(d) ? d : DEFAULT_SUGGESTIONS; }
/** @param {Array<Object>} d */ function storeSugg(d)  { _write(KEYS.suggestions, d); 
  const _fp_suggestions = _fsPath('suggestions'); if (_fp_suggestions) _syncFirestore(_fp_suggestions, d);
}

/** @returns {Array<Object>} */ function loadAnn()     { const d = _read(KEYS.announcements); return Array.isArray(d) ? d : DEFAULT_ANN; }
/** @param {Array<Object>} d */ function storeAnn(d)   { _write(KEYS.announcements, d); 
  const _fp_announcements = _fsPath('announcements'); if (_fp_announcements) _syncFirestore(_fp_announcements, d);
}

/** @returns {Array<Object>} */ function loadLinks()   { const d = _read(KEYS.links);         return (Array.isArray(d) && d.length) ? d : DEFAULT_LINKS; }
/** @param {Array<Object>} d */ function saveLinks(d)  { _write(KEYS.links, d); 
  const _fp_links = _fsPath('links'); if (_fp_links) _syncFirestore(_fp_links, d);
}

/** @returns {Array<Object>} */ function loadNotes()   { const d = _read(KEYS.notes);         return Array.isArray(d) ? d : DEFAULT_NOTES; }
/** @param {Array<Object>} d */ function saveNotes(d)  { _write(KEYS.notes, d); 
  const _fp_notes = _fsPath('notes'); if (_fp_notes) _syncFirestore(_fp_notes, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — AKTİVİTE LOGU
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadAct()     { const d = _read(KEYS.activity); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 500 kayıt saklanır */ function saveAct(d) { _write(KEYS.activity, d.slice(0, 500)); }

/**
 * Kullanıcı hareketini loglar. Hem localStorage'a hem Firestore'a yazar.
 * @param {string} type    'task' | 'user' | 'kargo' | 'view' | ...
 * @param {string} detail  Okunabilir eylem açıklaması
 */
function logActivity(type, detail) {
  const CU = window.Auth?.getCU?.();
  if (!CU) return;
  const acts = loadAct();
  const entry = { id: Date.now(), uid: CU.id, uname: CU.name, type, detail, ts: nowTs() };
  acts.unshift(entry);
  saveAct(acts);
  // Firestore log (Anayasa Kural 3 — her hareket tarih + UID)
  const tid   = window.Auth?.getTenantId?.() || 'tenant_default';
  const paths = window.FirebaseConfig?.paths;
  if (paths) _syncFirestore(paths.logs(tid), entry, 'add');
  // Dashboard badge güncelle (varsa)
  if (typeof window.updateDashboardActs === 'function') window.updateDashboardActs();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — BİLDİRİMLER
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadNotifs()    { const d = _read(KEYS.notifications); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 100 kayıt */ function storeNotifs(d) { _write(KEYS.notifications, d.slice(0, 100)); }

/**
 * Bildirim ekler ve rozeti günceller.
 * @param {string} icon   Emoji
 * @param {string} msg    Bildirim metni
 * @param {string} [type='info'] 'info' | 'warn' | 'ok' | 'err'
 * @param {string} [link='']    Tıklandığında gidilecek panel
 */
function addNotif(icon, msg, type = 'info', link = '') {
  const d = loadNotifs();
  d.unshift({ id: Date.now(), icon, msg, type, link, ts: nowTs(), read: false });
  storeNotifs(d);
  if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — İK / PERSONEL
// ════════════════════════════════════════════════════════════════

const DEFAULT_IK = [
  { id: 1, name: 'Ayşe Kaya',  pos: 'Takım Lideri', dept: 'it',        start: '2024-03-01', status: 'active',    stage: 5, email: 'ayse@sirket.com', phone: '', note: '' },
  { id: 2, name: 'Mert Demir', pos: 'Geliştirici',  dept: 'it',        start: '2025-01-15', status: 'probation', stage: 4, email: 'mert@sirket.com', phone: '', note: 'Deneme süreci devam ediyor' },
  { id: 3, name: 'Yeni Aday',  pos: 'Muhasebeci',   dept: 'muhasebe',  start: '2026-04-01', status: 'pending',   stage: 1, email: '',               phone: '', note: 'Belgeler bekleniyor' },
];

/** @returns {Array<Object>} */ function loadIk()       { const d = _read(KEYS.ik); return Array.isArray(d) ? d : DEFAULT_IK; }
/** @param {Array<Object>} d */ function storeIk(d)     { _write(KEYS.ik, d); 
  const _fp_ik = _fsPath('ik'); if (_fp_ik) _syncFirestore(_fp_ik, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — KARGO & KONTEYNER
// ════════════════════════════════════════════════════════════════

const DEFAULT_KARGO_FIRMALAR = ['Yurtiçi','Aras','MNG','PTT','DHL','UPS','FedEx','TNT'];

/** @returns {Array<Object>} */ function loadKargo()         { const d = _read(KEYS.kargo);      return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeKargo(d)       { _write(KEYS.kargo, d); 
  const _fp_kargo = _fsPath('kargo'); if (_fp_kargo) _syncFirestore(_fp_kargo, d);
}

/** @returns {Array<string>} */ function loadKargoFirmalar() { const d = _read(KEYS.kargoFirms); return (Array.isArray(d) && d.length) ? d : DEFAULT_KARGO_FIRMALAR; }
/** @param {Array<string>} d */ function storeKargoFirmalar(d) { _write(KEYS.kargoFirms, d); }

/** @returns {Array<Object>} */ function loadKonteyn()       { const d = _read(KEYS.konteyner);  return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeKonteyn(d)     { _write(KEYS.konteyner, d); }

/** @returns {Object}        */ function loadKargoChecks()   { const d = _read(KEYS.kargoChecks); return (d && typeof d === 'object') ? d : {}; }
/** @param {Object} d        */ function storeKargoChecks(d) { _write(KEYS.kargoChecks, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — PİRİM
// ════════════════════════════════════════════════════════════════

const DEFAULT_PIRIM_PARAMS = [
  { code: 'YA', label: 'Yıllık Artan',       base: 'maas',    rate: 0.50, locked: true  },
  { code: 'SC', label: 'Satış Cirosu',        base: 'ciro',    rate: 0.15, locked: true  },
  { code: 'NY', label: 'Yeni Müşteri',        base: 'sabit',   rate: 0.50, locked: true  },
  { code: 'CA', label: 'Ciro Artış Primi',    base: 'ciro',    rate: 0.25, locked: true  },
  { code: 'DD', label: 'Dönem Değerlendirme', base: 'serbest', rate: null, locked: false },
  { code: 'RD', label: 'Referans Dönüşüm',    base: 'serbest', rate: null, locked: false },
  { code: 'CE', label: 'CEO Takdir',           base: 'serbest', rate: null, locked: false },
];

/** @returns {Array<Object>} */ function loadPirim()          { const d = _read(KEYS.pirim);       return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storePirim(d)        { _write(KEYS.pirim, d); 
  const _fp_pirim = _fsPath('pirim'); if (_fp_pirim) _syncFirestore(_fp_pirim, d);
}

/** @returns {Array<Object>} */ function loadPirimParams()    { const d = _read(KEYS.pirimParams); return (Array.isArray(d) && d.length) ? d : DEFAULT_PIRIM_PARAMS; }
/** @param {Array<Object>} d */ function storePirimParams(d)  { _write(KEYS.pirimParams, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — STOK & NUMUNE
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadStok()    { const d = _read(KEYS.stok);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeStok(d)  { _write(KEYS.stok, d); 
  const _fp_stok = _fsPath('stok'); if (_fp_stok) _syncFirestore(_fp_stok, d);
}

const DEFAULT_NUMUNE = [
  { id: 1, dir: 'giris', name: 'Model A Kumaş Numunesi', code: 'NM-001', qty: 3, date: '2026-03-10', uid: 2, iadeDate: '2026-04-10', returned: false, note: 'Müşteriye gösterim için', img: null },
  { id: 2, dir: 'cikis', name: 'Renk Kartı Seti',         code: 'NM-002', qty: 1, date: '2026-03-15', uid: 3, iadeDate: '2026-03-30', returned: false, note: 'Fuar için çıkartıldı',  img: null },
];
/** @returns {Array<Object>} */ function loadNumune()  { const d = _read(KEYS.numune);  return Array.isArray(d) ? d : DEFAULT_NUMUNE; }
/** @param {Array<Object>} d */ function storeNumune(d){ _write(KEYS.numune, d); 
  const _fp_numune = _fsPath('numune'); if (_fp_numune) _syncFirestore(_fp_numune, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 12 — CRM
// ════════════════════════════════════════════════════════════════

const DEFAULT_CRM = [
  { id: 1, name: 'TechNova A.Ş.',  contact: 'Ahmet Bey',   phone: '0212 555 10 10', email: 'ahmet@example.com', city: 'İstanbul', status: 'aktif',  value: 120000, owner: 2, note: 'Uzun vadeli sözleşme',        ts: '2025-06-01' },
  { id: 2, name: 'Bulut Yazılım',  contact: 'Selin Hanım', phone: '0232 444 20 20', email: 'selin@example.com', city: 'İzmir',    status: 'teklif', value: 45000,  owner: 2, note: 'Fiyat teklifi gönderildi',    ts: '2026-02-15' },
  { id: 3, name: 'Mavi Lojistik',  contact: 'Emre Bey',    phone: '0312 333 30 30', email: 'emre@example.com',  city: 'Ankara',   status: 'lead',   value: 80000,  owner: 2, note: 'İlk görüşme yapıldı',        ts: '2026-03-10' },
];
/** @returns {Array<Object>} */ function loadCrmData()    { const d = _read(KEYS.crm);  return Array.isArray(d) ? d : DEFAULT_CRM; }
/** @param {Array<Object>} d */ function storeCrmData(d)  { _write(KEYS.crm, d); 
  const _fp_crm = _fsPath('crm'); if (_fp_crm) _syncFirestore(_fp_crm, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 13 — REHBER
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadRehber()  { const d = _read(KEYS.rehber); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeRehber(d){ _write(KEYS.rehber, d); 
  const _fp_rehber = _fsPath('rehber'); if (_fp_rehber) _syncFirestore(_fp_rehber, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 14 — HEDEFLER
// ════════════════════════════════════════════════════════════════

const DEFAULT_HDF = [
  { id: 1, uid: 0, title: 'Q1 2026 Satış Hedefi', desc: 'Aylık satış 500K TL — aylık raporlarla ölçülecek', from: '2026-01-01', to: '2026-03-31', status: 'progress', steps: [] },
];
/** @returns {Array<Object>} */ function loadHdf()     { const d = _read(KEYS.hedefler); return Array.isArray(d) ? d : DEFAULT_HDF; }
/** @param {Array<Object>} d */ function storeHdf(d)   { _write(KEYS.hedefler, d); 
  const _fp_hedefler = _fsPath('hedefler'); if (_fp_hedefler) _syncFirestore(_fp_hedefler, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 15 — ÇÖP KUTUSU (Soft Delete)
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadTrash()   { const d = _read(KEYS.trash); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 500 kayıt */ function storeTrash(d) { _write(KEYS.trash, d.slice(0, 500)); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16 — RUTİN ÖDEMELER
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadOdm()     { const d = _read(KEYS.odemeler); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeOdm(d)   { _write(KEYS.odemeler, d); 
  const _fp_odemeler = _fsPath('odemeler'); if (_fp_odemeler) _syncFirestore(_fp_odemeler, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 17 — İZİN YÖNETİMİ
// ════════════════════════════════════════════════════════════════

/**
 * İzin kayıtlarını yükler.
 * @returns {Array<Object>}
 */
function loadIzin()    { const d = _read(KEYS.izin); return Array.isArray(d) ? d : []; }
/**
 * İzin kayıtlarını yazar. Hata durumunda false döner.
 * @param {Array<Object>} d
 * @returns {boolean}
 */
function storeIzin(d)  {
  const ok = _write(KEYS.izin, d);
  const _fp_izin = _fsPath('izin'); if (_fp_izin) _syncFirestore(_fp_izin, d);
  if (!ok) GlobalErrorHandler('storeIzin', new Error('localStorage yazılamadı'), 'err');
  return ok;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 18 — TEBLİGAT
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadTebligat()   { const d = _read(KEYS.tebligat); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeTebligat(d) { _write(KEYS.tebligat, d); 
  const _fp_tebligat = _fsPath('tebligat'); if (_fp_tebligat) _syncFirestore(_fp_tebligat, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 19 — TEMİZLİK ROTİNLERİ
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadTemizlik()   { const d = _read(KEYS.temizlik); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeTemizlik(d) { _write(KEYS.temizlik, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 20 — KPI & PERFORMANS
// ════════════════════════════════════════════════════════════════

const DEFAULT_KPI = [
  { id: 1, title: 'Aylık Satış Hedefi', current: 380000, target: 500000, unit: '₺', period: 'Mart 2026' },
  { id: 2, title: 'Müşteri Memnuniyeti', current: 87,   target: 95,     unit: '%', period: 'Mart 2026' },
];
/** @returns {Array<Object>} */ function loadKpi()         { const d = _read(KEYS.kpi);    return Array.isArray(d) ? d : DEFAULT_KPI; }
/** @param {Array<Object>} d */ function storeKpi(d)       { _write(KEYS.kpi, d); 
  const _fp_kpi = _fsPath('kpi'); if (_fp_kpi) _syncFirestore(_fp_kpi, d);
}

/** @returns {Array<Object>} */ function loadKpiLog()      { const d = _read(KEYS.kpiLog); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 2000 kayıt */ function storeKpiLog(d) { _write(KEYS.kpiLog, d.slice(0, 2000)); }

/** @returns {Array<Object>} */ function loadKarar()       { const d = _read(KEYS.kararlar); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeKarar(d)     { _write(KEYS.kararlar, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 21 — EVRAK & ARŞİV
// ════════════════════════════════════════════════════════════════

const DEFAULT_DOLAPLAR = [
  { id: 1, name: 'Dolap A1', loc: '2. Kat Muhasebe', uid: 5, desc: 'Muhasebe evrakları 2024-2026', color: 'var(--blb)' },
  { id: 2, name: 'Dolap B1', loc: '1. Kat İK',       uid: 2, desc: 'İK belgeleri ve sözleşmeler',  color: 'var(--grb)' },
];
const DEFAULT_ARSIV_BELGELER = [
  { id: 1, dolapId: 1, name: 'Vergi Levhası 2026', cat: 'vergi', raf: 'Raf 1', date: '2026-01-01', exp: '2026-12-31', status: 'approved', note: '',             file: null },
  { id: 2, dolapId: 1, name: 'Gelir Tablosu Q1',  cat: 'fatura', raf: 'Raf 2', date: '2026-03-31', exp: '',           status: 'pending',  note: 'Onay bekliyor', file: null },
];

/** @returns {Array<Object>} */ function loadEvrak()           { const d = _read(KEYS.evrak);        return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeEvrak(d)         { _write(KEYS.evrak, d); }

/** @returns {Array<Object>} */ function loadDolaplar()        { const d = _read(KEYS.arsivDolaplar); return Array.isArray(d) ? d : DEFAULT_DOLAPLAR; }
/** @param {Array<Object>} d */ function storeDolaplar(d)      { _write(KEYS.arsivDolaplar, d); }

/** @returns {Array<Object>} */ function loadArsivBelgeler()   { const d = _read(KEYS.arsivBelgeler); return Array.isArray(d) ? d : DEFAULT_ARSIV_BELGELER; }
/** @param {Array<Object>} d */ function storeArsivBelgeler(d) { _write(KEYS.arsivBelgeler, d); }

/** @returns {Array<Object>} */ function loadResmi()           { const d = _read(KEYS.resmiEvrak);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeResmi(d)         { _write(KEYS.resmiEvrak, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 22 — ETKİNLİK / FUAR
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadEtkinlik()       { const d = _read(KEYS.etkinlik);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeEtkinlik(d)     { _write(KEYS.etkinlik, d); }

/** @returns {Object|null}   */ function loadFuarKriterleri()  { return _read(KEYS.fuarKriter, null); }
/** @param {Object} d        */ function saveFuarKriterleri(d) { _write(KEYS.fuarKriter, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 23 — GÖREV YAZIŞMA (Task Chat)
// ════════════════════════════════════════════════════════════════

/** @returns {Object.<number,Array>} taskId → mesaj dizisi */
function loadTaskChats()    { const d = _read(KEYS.taskChats); return (d && typeof d === 'object') ? d : {}; }
/** @param {Object} d       */ function storeTaskChats(d) { _write(KEYS.taskChats, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 24 — KUTLAMA / TEBRIK
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadGrt()     { const d = _read(KEYS.greetings); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeGrt(d)   { _write(KEYS.greetings, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 25 — HESAP GEÇMİŞİ & DÖVİZ
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadHesapHistory()    { const d = _read(KEYS.hesapHistory); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 200 kayıt */ function storeHesapHistory(d) { _write(KEYS.hesapHistory, d.slice(0, 200)); }

const DEFAULT_CURRENCIES = ['USD','EUR','GBP','ALTIN','PETROL'];
/** @returns {Array<string>} */ function loadCurrencies()      { const d = _read(KEYS.currencies); return (Array.isArray(d) && d.length) ? d : DEFAULT_CURRENCIES; }
/** @param {Array<string>} d */ function saveCurrencies(d)     { _write(KEYS.currencies, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 26 — YEREL DÖKÜMANLAR
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadLocalDocs()       { const d = _read(KEYS.localDocs); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeLocalDocs(d)     { _write(KEYS.localDocs, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 27 — TATİL AYARLARI
// ════════════════════════════════════════════════════════════════

/** @returns {Object} */
function loadTatilAyarlar()    {
  const d = _read(KEYS.tatilAyarlar);
  return (d && typeof d === 'object') ? d : { calisan: true, uyariGun: 7, otoDuyuru: false };
}
/** @param {Object} d */
function storeTatilAyarlar(d)  { _write(KEYS.tatilAyarlar, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 28 — UI DURUMU (Tema, Dil, Sidebar)
// ════════════════════════════════════════════════════════════════

/** @returns {string} 'dark' | 'light' */   function getTheme()           { return _read(KEYS.theme, 'light'); }
/** @param {string} v */                    function setTheme(v)           { _write(KEYS.theme, v); }
/** @returns {string} 'tr' | 'en' | 'fr' */ function getLang()            { return _read(KEYS.lang, 'tr'); }
/** @param {string} v */                    function setLang(v)            { _write(KEYS.lang, v); }
/** @returns {Object} */                    function loadNsecState()       { return _read(KEYS.nsecState, {}); }
/** @param {Object} s */                    function saveNsecState(s)      { _write(KEYS.nsecState, s); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 29 — FİRESTORE TOPLU GÖÇ
// ════════════════════════════════════════════════════════════════

/**
 * Tüm localStorage verisini Firestore'a aktarır.
 * Admin yetkisi gerektirir.
 * @returns {Promise<void>}
 */
async function migrateToFirestore() {
  const FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) { GlobalErrorHandler('migrate', new Error('Firebase DB bağlı değil'), 'err'); return; }
  const isAdmin = window.Auth?.isAdmin?.();
  if (!isAdmin) { GlobalErrorHandler('migrate', new Error('Admin yetkisi gereklidir'), 'err'); return; }

  const tid   = _getTid();
  const paths = _getPaths();
  if (!paths) {
    if (typeof window.toast === 'function') window.toast('Firebase path yapılandırması eksik', 'err');
    return;
  }

  const collections = {
    users:     loadUsers(),
    tasks:     loadTasks(),
    kargo:     loadKargo(),
    ik:        loadIk(),
    pirim:     loadPirim(),
    crm:       loadCrmData(),
    stok:      loadStok(),
    hedefler:  loadHdf(),
    duyurular: loadAnn(),
    notlar:    loadNotes(),
    izin:      loadIzin(),
    tebligat:  loadTebligat(),
    kpi:       loadKpi(),
  };

  let batch = FB_DB.batch ? FB_DB.batch() : null;
  let opCount = 0;

  for (const [colName, data] of Object.entries(collections)) {
    try {
      const _mbase = (typeof paths.tenant === 'function') ? paths.tenant(tid) : `tenants/${tid}`;
      const docRef = FB_DB.collection(_mbase).doc(colName);
      const payload = { data, syncedAt: new Date().toISOString(), migratedBy: window.Auth?.getCU?.()?.id };
      if (batch) {
        batch.set(docRef, payload, { merge: true });
        opCount++;
        if (opCount >= 490) { await batch.commit(); batch = FB_DB.batch(); opCount = 0; }
      } else {
        await docRef.set(payload, { merge: true });
      }
    } catch (e) {
      GlobalErrorHandler('migrate:' + colName, e, 'warn');
    }
  }

  if (batch && opCount > 0) await batch.commit();
  logActivity('system', 'Tüm veriler Firestore\'a aktarıldı');
  if (typeof window.toast === 'function') window.toast('Firestore\'a aktarım tamamlandı ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

/** Merkezi DB nesnesi — tüm veri işlemleri buradan erişilebilir */
// ════════════════════════════════════════════════════════════════
// BÖLÜM 30 — REALTIME FIREBASE SYNC (onSnapshot)
// ════════════════════════════════════════════════════════════════

/**
 * Aktif listener'ları saklar — unsubscribe için
 * @type {Object.<string, Function>}
 */
const _listeners = {};

/**
 * Firestore koleksiyonuna realtime listener kurar.
 * Değişiklik gelince localStorage'ı günceller ve UI'ı yeniler.
 *
 * @param {string} collection  Firestore koleksiyon adı ('tasks', 'kargo' vs.)
 * @param {string} localKey    localStorage key (KEYS objesinden)
 * @param {Function} [onUpdate] Güncelleme gelince çağrılacak fn (örn: renderKargo)
 */
function _listenCollection(collection, localKey, onUpdate) {
  try {
    const FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) return; // Firebase bağlı değil

    const tid   = _getTid();
    const paths = _getPaths();
    if (!paths) return;

    // Önceki listener varsa kapat
    if (_listeners[collection]) {
      _listeners[collection]();
      delete _listeners[collection];
    }

    const _base2 = (typeof paths.tenant === 'function') ? paths.tenant(tid) : `tenants/${tid}`;
    const docRef = FB_DB.collection(_base2).doc(collection);
    const unsubscribe = docRef.onSnapshot(snap => {
      if (!snap.exists) {
        // Firestore'da veri yok — localStorage'ı kaynak olarak kullan
        console.info('[DB:realtime]', collection, '→ Firestore boş, localStorage kullanılıyor');
        return;
      }
      const data = snap.data()?.data;
      if (!Array.isArray(data)) return;

      // localStorage güncelle
      try { localStorage.setItem(localKey, JSON.stringify(data)); }
      catch (e) { GlobalErrorHandler('realtime:write', e, 'warn'); }

      // UI'ı yenile (throttled)
      if (typeof onUpdate === 'function') {
        clearTimeout(_listeners[collection + '_timer']);
        _listeners[collection + '_timer'] = setTimeout(() => {
          try { onUpdate(data); }
          catch (e) { GlobalErrorHandler('realtime:render', e, 'warn'); }
        }, 300);
      }

      console.info('[DB:realtime]', collection, '→', Array.isArray(data) ? data.length : '?', 'kayıt');
    }, err => {
      // İzin hatası veya bağlantı problemi — sadece log, crash yok
      if (err.code === 'permission-denied') {
        console.warn('[DB:realtime]', collection, '→ Firestore izni yok, offline mod');
      } else {
        GlobalErrorHandler('realtime:' + collection, err, 'warn');
      }
    });

    _listeners[collection] = unsubscribe;
  } catch (e) {
    GlobalErrorHandler('_listenCollection', e, 'warn');
  }
}

/**
 * Tüm kritik koleksiyonlar için realtime sync başlatır.
 * Auth başarılı olduktan sonra çağrılır.
 */
function startRealtimeSync() {
  // Koleksiyon adı → [localStorage key, UI render fonksiyonu adı]
  const SYNC_MAP = [
    // Kritik — her kullanıcı için
    ['tasks',         KEYS.tasks,         () => window.Pusula?.render?.()],
    ['calendar',      KEYS.calendar,      () => window.renderCal?.()],
    ['announcements', KEYS.announcements, () => window.renderAnnouncements?.()],
    // Operasyon
    ['kargo',         KEYS.kargo,         () => window.Kargo?.render?.()],
    ['stok',          KEYS.stok,          () => window.Stok?.render?.()],
    ['crm',           KEYS.crm,           () => window.renderCrm?.()],
    // İK & Personel
    ['ik',            KEYS.ik,            () => window.renderIk?.()],
    ['izin',          KEYS.izin,          () => window.renderIzin?.()],
    ['pirim',         KEYS.pirim,         () => window.Pirim?.render?.()],
    // Diğer
    ['hedefler',      KEYS.hedefler,      () => window.renderHedefler?.()],
    ['odemeler',      KEYS.odemeler,      () => window.renderOdemeler?.()],
    ['kpi',           KEYS.kpi,           () => window.renderKpi?.()],
    ['notes',         KEYS.notes,         () => window.renderNotes?.()],
    ['tebligat',      KEYS.tebligat,      () => window.renderTebligat?.()],
  ];

  SYNC_MAP.forEach(([col, key, render]) => {
    _listenCollection(col, key, render);
  });

  console.info('[DB] Realtime sync başlatıldı:', SYNC_MAP.length, 'koleksiyon');
}

/**
 * Tüm realtime listener'ları durdurur (logout'ta çağrılır).
 */
function stopRealtimeSync() {
  Object.keys(_listeners).forEach(key => {
    if (typeof _listeners[key] === 'function') {
      _listeners[key](); // unsubscribe
    }
    delete _listeners[key];
  });
  console.info('[DB] Realtime sync durduruldu.');
}


const DB = {
  VERSION: DB_VERSION,
  KEYS,
  // Hata yönetici
  GlobalErrorHandler,
  // Yardımcılar
  nowTs, logActivity, addNotif,
  // Kullanıcılar
  loadUsers, saveUsers,
  // Puantaj
  loadPuan, savePuan,
  // Görevler
  loadTasks, saveTasks,
  // Takvim
  loadCal, saveCal, setCalInvalidator,
  // Öneri & Duyuru & Not & Link
  loadSugg, storeSugg,
  loadAnn, storeAnn,
  loadLinks, saveLinks,
  loadNotes, saveNotes,
  // Aktivite
  loadAct, saveAct,
  // Bildirimler
  loadNotifs, storeNotifs,
  // İK
  loadIk, storeIk,
  // Kargo & Konteyner
  loadKargo, storeKargo,
  loadKargoFirmalar, storeKargoFirmalar,
  loadKonteyn, storeKonteyn,
  loadKargoChecks, storeKargoChecks,
  // Prim
  loadPirim, storePirim,
  loadPirimParams, storePirimParams,
  // Stok & Numune
  loadStok, storeStok,
  loadNumune, storeNumune,
  // CRM
  loadCrmData, storeCrmData,
  // Rehber
  loadRehber, storeRehber,
  // Hedefler
  loadHdf, storeHdf,
  // Çöp
  loadTrash, storeTrash,
  // Ödemeler
  loadOdm, storeOdm,
  // İzin & Tebligat & Temizlik
  loadIzin, storeIzin,
  loadTebligat, storeTebligat,
  loadTemizlik, storeTemizlik,
  // Evrak & Arşiv
  loadEvrak, storeEvrak,
  loadDolaplar, storeDolaplar,
  loadArsivBelgeler, storeArsivBelgeler,
  loadResmi, storeResmi,
  // KPI & Karar
  loadKpi, storeKpi,
  loadKpiLog, storeKpiLog,
  loadKarar, storeKarar,
  // Etkinlik & Fuar
  loadEtkinlik, storeEtkinlik,
  loadFuarKriterleri, saveFuarKriterleri,
  // Task Chat
  loadTaskChats, storeTaskChats,
  // Diğer
  loadGrt, storeGrt,
  loadHesapHistory, storeHesapHistory,
  loadCurrencies, saveCurrencies,
  loadLocalDocs, storeLocalDocs,
  loadTatilAyarlar, storeTatilAyarlar,
  // UI
  getTheme, setTheme, getLang, setLang,
  loadNsecState, saveNsecState,
  // Firestore
  migrateToFirestore,
  // Realtime sync
  startRealtimeSync,
  stopRealtimeSync,
  listenCollection: _listenCollection,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DB;
} else {
  window.DB = DB;
  // Geriye uyumluluk — eski HTML inline onclick'ler ve diğer modüller
  // doğrudan window.loadUsers() gibi çağırabilir
  const fns = [
    'loadUsers','saveUsers','loadPuan','savePuan','loadTasks','saveTasks',
    'loadCal','saveCal','loadSugg','storeSugg','loadAnn','storeAnn',
    '_fsPath','_getPaths','_getTid','startRealtimeSync','stopRealtimeSync',
    'loadLinks','saveLinks','loadNotes','saveNotes','loadAct','saveAct',
    'logActivity','addNotif','loadNotifs','storeNotifs',
    'loadIk','storeIk','loadKargo','storeKargo',
    'loadKargoFirmalar','storeKargoFirmalar','loadKonteyn','storeKonteyn',
    'loadKargoChecks','storeKargoChecks','loadPirim','storePirim',
    'loadPirimParams','storePirimParams','loadStok','storeStok',
    'loadNumune','storeNumune','loadCrmData','storeCrmData',
    'loadRehber','storeRehber','loadHdf','storeHdf',
    'loadTrash','storeTrash','loadOdm','storeOdm',
    'loadIzin','storeIzin','loadTebligat','storeTebligat',
    'loadTemizlik','storeTemizlik','loadEvrak','storeEvrak',
    'loadDolaplar','storeDolaplar','loadArsivBelgeler','storeArsivBelgeler',
    'loadResmi','storeResmi','loadKpi','storeKpi',
    'loadKpiLog','storeKpiLog','loadKarar','storeKarar',
    'loadEtkinlik','storeEtkinlik','loadFuarKriterleri','saveFuarKriterleri',
    'loadTaskChats','storeTaskChats','loadGrt','storeGrt',
    'loadHesapHistory','storeHesapHistory','loadCurrencies','saveCurrencies',
    'loadLocalDocs','storeLocalDocs','loadTatilAyarlar','storeTatilAyarlar',
    'getTheme','setTheme','getLang','setLang','loadNsecState','saveNsecState',
    'nowTs', 'GlobalErrorHandler',
  ];
  fns.forEach(name => { if (DB[name]) window[name] = DB[name]; });
}

})();
