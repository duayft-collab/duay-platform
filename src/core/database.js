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
  tahsilat      : 'ak_tahsilat1',
  satinalma     : 'ak_satinalma1',
  cari          : 'ak_cari1',
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
  kargoHistory  : 'ak_krg_history1',   // #4 durum geçmişi
  kargoMasraf   : 'ak_krg_masraf1',    // #6 masraf takibi
  kargoBelge    : 'ak_krg_belge1',     // #9 belge yönetimi
  navlunKarsi   : 'ak_nvl_karsi1',     // #2 karşılaştırma
  lojPerf       : 'ak_loj_perf1',      // #10 performans
  konteyner     : 'ak_konteyn1',
  nsecState     : 'ak_nsec_state',
  izin          : 'ak_izin1',
  tebligat      : 'ak_tebligat1',
  tatilAyarlar  : 'ak_tatil1',
  kpiLog        : 'ak_kpi_log1',
  taskChats     : 'ak_task_chat1',
  bankalar      : 'ak_bankalar1',
  navlun        : 'ak_navlun1',
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
  // Son güncelleme zamanını kaydet
  try { localStorage.setItem('ak_db_last_write', new Date().toISOString()); } catch(e) {}
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
 * İki veri setini ID bazında birleştirir — hiçbir kayıt silinmez.
 * Aynı ID'li kayıtlar arasında en güncel olan (ts alanı) kazanır.
 * Array olmayan veriler için Firestore kazanır.
 *
 * @param {string} localKey  localStorage key
 * @param {*}      fsData    Firestore'dan gelen veri
 * @param {string} collection  Koleksiyon adı (log için)
 * @returns {*}    Birleştirilmiş veri
 */
function _mergeDataSets(localKey, fsData, collection) {
  // Array olmayan veri — basit overwrite (merge anlamsız)
  if (!Array.isArray(fsData)) return fsData;

  var localData;
  try { localData = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch(e) { localData = []; }
  if (!Array.isArray(localData) || localData.length === 0) return fsData;
  if (fsData.length === 0) return localData;

  // ID bazında index oluştur
  var mergedMap = {};
  // Önce localStorage verilerini ekle
  localData.forEach(function(item) {
    var key = item.id || item._id;
    if (key) mergedMap[key] = item;
  });
  // Sonra Firestore verilerini ekle — aynı ID varsa ts karşılaştır
  fsData.forEach(function(item) {
    var key = item.id || item._id;
    if (!key) { // ID'siz kayıt — Firestore kazanır
      var dupCheck = localData.find(function(l) { return l.name === item.name && l.ts === item.ts; });
      if (!dupCheck) mergedMap['_noId_' + Math.random()] = item;
      return;
    }
    var existing = mergedMap[key];
    if (!existing) {
      mergedMap[key] = item;
    } else {
      // Daha güncel olanı seç (ts veya syncedAt karşılaştır)
      var fsTs = item.ts || item.syncedAt || item.updatedAt || '';
      var localTs = existing.ts || existing.syncedAt || existing.updatedAt || '';
      if (fsTs >= localTs) {
        mergedMap[key] = item;
      }
      // else localStorage'daki daha yeni → koru
    }
  });

  var result = Object.values(mergedMap);
  // Orijinal sıralama: en yeni en üstte
  result.sort(function(a, b) { return (b.ts || b.createdAt || '').localeCompare(a.ts || a.createdAt || ''); });

  if (result.length !== fsData.length || result.length !== localData.length) {
    console.info('[DB:merge]', collection, '→ FS:', fsData.length, '+ Local:', localData.length, '= Merged:', result.length);
  }
  return result;
}

/**
 * Merge sonucunu Firestore'a yazar — kendi echo'sunu engeller.
 * @param {string} path  Firestore doc path
 * @param {*}      data  Birleştirilmiş veri
 */
function _syncFirestoreMerged(path, data) {
  try {
    var FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) return;
    var collection = path.split('/').pop();
    _writingNow[collection] = Date.now() + 3000;
    var syncedAt = new Date().toISOString();
    FB_DB.doc(path).set({ data: data, syncedAt: syncedAt, mergedAt: syncedAt }, { merge: true })
      .then(function() { console.info('[DB:merge-write]', path, '→', Array.isArray(data) ? data.length + ' kayıt' : 'ok'); })
      .catch(function(e) { console.warn('[DB:merge-write error]', path, e.message); });
  } catch(e) {}
}

/**
 * Offline / Auth-bekleyen yazma kuyruğu.
 * Safari ITP veya yavaş auth init nedeniyle currentUser null iken
 * oluşan yazma isteklerini saklar ve auth hazır olunca gönderir.
 */
var _offlineWriteQueue = [];
var _offlineQueueProcessing = false;

function _queueOfflineWrite(path, data, mode) {
  // Aynı path için eski kuyruğu güncelle (en güncel veri kazanır)
  var existing = _offlineWriteQueue.findIndex(function(q) { return q.path === path; });
  if (existing !== -1) {
    _offlineWriteQueue[existing].data = data;
    _offlineWriteQueue[existing].ts = Date.now();
  } else {
    _offlineWriteQueue.push({ path: path, data: data, mode: mode || 'set', ts: Date.now() });
  }
  console.info('[DB:queue] Kuyruğa eklendi:', path, '| Kuyruk:', _offlineWriteQueue.length);
  // Auth hazır olunca kuyruğu işle
  if (!_offlineQueueProcessing) {
    _offlineQueueProcessing = true;
    var _checkInterval = setInterval(function() {
      var fbAuth = window.Auth?.getFBAuth?.();
      var fbDB = window.Auth?.getFBDB?.();
      if (fbDB && fbAuth?.currentUser) {
        clearInterval(_checkInterval);
        _offlineQueueProcessing = false;
        console.info('[DB:queue] Auth hazır — kuyruk işleniyor:', _offlineWriteQueue.length, 'kayıt');
        var queue = _offlineWriteQueue.splice(0);
        queue.forEach(function(q) {
          _syncFirestore(q.path, q.data, q.mode);
        });
      }
    }, 1000);
    // 30 saniye sonra timeout — sonsuz döngü engeli
    setTimeout(function() { clearInterval(_checkInterval); _offlineQueueProcessing = false; }, 30000);
  }
}

/**
 * Firestore\'a arka planda yazar — bağlı değilse sessizce atlar.
 * @param {string}   path    Firestore koleksiyon yolu (FS_PATHS fonksiyonu ile)
 * @param {*}        data    Yazılacak veri
 * @param {'set'|'add'} [mode='set']
 */
function _syncFirestore(path, data, mode = 'set') {
  try {
    const FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) {
      console.warn('[DB:sync] Firebase DB yok — offline mod. Auth durum:', !!window.Auth?.getFBAuth?.()?.currentUser);
      // Offline queue: currentUser hazır olunca tekrar dene
      _queueOfflineWrite(path, data, mode);
      return;
    }
    // Auth hazır değilse queue'ya ekle — Safari ITP gecikmesi için
    var _fbAuth = window.Auth?.getFBAuth?.();
    if (_fbAuth && !_fbAuth.currentUser) {
      console.warn('[DB:sync] currentUser null — yazma kuyruğa alındı:', path);
      _queueOfflineWrite(path, data, mode);
      return;
    }
    const collection = path.split('/').pop();
    const syncedAt = new Date().toISOString();
    const payload = { data, syncedAt };
    // P1: onSnapshot'ın kendi yazmamızı geri okumasını engelle (2s pencere)
    _writingNow[collection] = Date.now() + 2000;
    // localStorage'a timestamp kaydet
    try { localStorage.setItem(collection + '_ts', syncedAt); } catch(e) {}
    console.log('[FIRESTORE WRITE]', path, '→', Array.isArray(data) ? data.length + ' kayıt' : typeof data, '| Auth:', !!_fbAuth?.currentUser);
    if (mode === 'set') {
      // Önce mevcut Firestore verisini oku, merge et, sonra yaz (veri kaybı önleme)
      if (Array.isArray(data)) {
        FB_DB.doc(path).get().then(function(snap) {
          var fsExisting = snap.exists ? snap.data()?.data : null;
          var finalData = data;
          if (Array.isArray(fsExisting) && fsExisting.length > 0) {
            // Mevcut FS verisi ile local veriyi birleştir
            var idSet = {};
            data.forEach(function(item) { if (item.id || item._id) idSet[item.id || item._id] = true; });
            // FS'de olup local'de olmayan kayıtları ekle (silinmiş olarak işaretlenmemişse)
            fsExisting.forEach(function(item) {
              var key = item.id || item._id;
              if (key && !idSet[key] && !item.isDeleted) {
                finalData.push(item);
                console.info('[DB:sync-merge] FS kayıt korundu:', collection, key);
              }
            });
          }
          var finalPayload = { data: finalData, syncedAt: syncedAt };
          return FB_DB.doc(path).set(finalPayload, { merge: true });
        })
          .then(function() { console.log('[FIRESTORE OK+MERGE]', path); })
          .catch(function(e) { console.error('[FIRESTORE ERROR]', path, e.code, e.message); GlobalErrorHandler('_syncFirestore:' + path, e, 'warn'); });
      } else {
        // Array olmayan veri — doğrudan set
        FB_DB.doc(path).set(payload, { merge: true })
          .then(() => console.log('[FIRESTORE OK]', path))
          .catch(e => { console.error('[FIRESTORE ERROR]', path, e.code, e.message); GlobalErrorHandler('_syncFirestore:' + path, e, 'warn'); });
      }
    } else {
      FB_DB.collection(path).add({ ...payload })
        .then(() => console.log('[FIRESTORE OK]', path))
        .catch(e => { console.error('[FIRESTORE ERROR]', path, e.code, e.message); GlobalErrorHandler('_syncFirestore:' + path, e, 'warn'); });
    }
  } catch (e) {
    console.error('[FIRESTORE EXCEPTION]', e);
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
// Firestore doc referansı çift sayıda segment gerektirir
// tenants_default/tasks = 2 segment = geçerli döküman referansı
function _fsPath(collection) {
  const tid = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
  return 'duay_' + tid + '/' + collection;
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
  // Firebase Auth: duayft@gmail.com — Admin
  { id: 1, name: 'Duay Admin',    email: 'duayft@gmail.com',         pw: '', role: 'admin',   access: ['İK','Finans','Operasyon','Teknik','Maaş','Sistem'], modules: null, status: 'active', lastLogin: null },
  // Firebase Auth: muhasebe@duaycor.com — Muhasebe personeli
  { id: 2, name: 'Muhasebe',      email: 'muhasebe@duaycor.com',      pw: '', role: 'staff',   access: ['Finans','Operasyon'], modules: null, status: 'active', lastLogin: null },
  // Firebase Auth: duaymuhasebe@gmail.com — Muhasebe (Gmail)
  { id: 3, name: 'Duay Muhasebe', email: 'duaymuhasebe@gmail.com',    pw: '', role: 'staff',   access: ['Finans'], modules: null, status: 'active', lastLogin: null },
];

/**
 * Kullanıcı listesini localStorage'dan okur.
 * @returns {Array<Object>} Kullanıcı dizisi
 */
function loadUsers() {
  var d = _read(KEYS.users);
  if (Array.isArray(d) && d.length > 0) {
    var _fixed = false;

    // 1) Mükerrer e-posta temizliği — autoCreated duplikatları kaldır
    var _emailSeen = {};
    var _cleanList = [];
    d.forEach(function(u) {
      var key = (u.email || '').toLowerCase();
      if (!key) { _cleanList.push(u); return; }
      if (_emailSeen[key]) {
        // Duplikat: autoCreated olanı at, orijinali koru
        if (u.autoCreated) {
          console.warn('[DB] Mükerrer kullanıcı kaldırıldı:', u.email, '(autoCreated, id:' + u.id + ')');
          _fixed = true;
          return; // atla
        }
        // Orijinal zaten eklendiyse, autoCreated olanı at
        var prev = _cleanList.find(function(x) { return (x.email || '').toLowerCase() === key; });
        if (prev && prev.autoCreated) {
          // Önceki autoCreated idi, bunu koru, öncekini çıkar
          _cleanList = _cleanList.filter(function(x) { return x !== prev; });
          _cleanList.push(u);
          _fixed = true;
          return;
        }
        // İkisi de orijinal — her ikisini de tut (farklı kayıtlar olabilir)
        _cleanList.push(u);
        return;
      }
      _emailSeen[key] = true;
      _cleanList.push(u);
    });
    d = _cleanList;

    // 2) DEFAULT_USERS'taki admin her zaman status:'active', role:'admin'
    DEFAULT_USERS.forEach(function(def) {
      if (def.role !== 'admin') return;
      var match = d.find(function(u) { return u.id === def.id || (u.email && u.email.toLowerCase() === def.email.toLowerCase()); });
      if (match) {
        if (match.status !== 'active' || match.role !== 'admin') {
          match.status = 'active';
          match.role = 'admin';
          match.access = def.access;
          delete match.isDeleted;
          delete match._fbSyncNote;
          _fixed = true;
        }
      } else {
        // Admin hiç yoksa DEFAULT'tan ekle
        d.unshift({ ...def });
        _fixed = true;
      }
    });

    if (_fixed) {
      try { localStorage.setItem(KEYS.users, JSON.stringify(d)); } catch(e) {}
      console.warn('[DB] Kullanıcı listesi düzeltildi — admin korundu, duplikatlar temizlendi');
    }
    return d;
  }
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
 * Kullanıcı listesini localStorage'a yazar ve Firestore\'a senkronize eder.
 * @param {Array<Object>} data
 */
function saveUsers(data) {
  // Race condition koruması: yazma zamanını kaydet
  const _writeTs = new Date().toISOString();
  _write(KEYS.users, data);
  try { localStorage.setItem('users_last_write', _writeTs); } catch(e) {}
  // Sadece giriş yapılmışsa Firestore'a yaz
  const _cu = window.Auth?.getCU?.();
  if (_cu) {
    const _fp_users = _fsPath('users');
    if (_fp_users) _syncFirestore(_fp_users, data);
  }
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
  {"id": 200, "own": 0, "title": "🇹🇷 Yılbaşı", "date": "2026-01-01", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Yılbaşı. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 155, "own": 0, "title": "🗓 Q1 Kickoff — 90 Günlük Rocks Başlangıcı", "date": "2026-01-05", "time": "09:00", "type": "meeting", "desc": "EOS Q1 Rocks belirleme oturumu. Şirket 1 yıllık hedeflerden 90 günlük öncelikleri seçin. ActionCOACH: \"90 gün odak, 1 yıl momentum.\" Katılım: Tüm liderler zorunlu.", "status": "approved", "recurring": true},
  {"id": 215, "own": 0, "title": "⚡ L10 Kickoff — Q1 Başlangıcı", "date": "2026-01-05", "time": "09:00", "type": "meeting", "desc": "Q1 başlıyor. EOS L10 ritmi başlatın: Scorecard, Rocks, Headlines, IDS. 90 günde neye odaklanıyorsunuz? Rocks belirleyin ve tüm ekiple paylaşın.", "status": "approved", "recurring": false},
  {"id": 168, "own": 0, "title": "Aylık Genel Toplantı — Ocak", "date": "2026-01-05", "time": "14:00", "type": "meeting", "desc": "Ocak ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 184, "own": 0, "title": "Yıllık Scorecard & KPI Belirleme", "date": "2026-01-12", "time": "09:00", "type": "meeting", "desc": "Scaling Up: Yıl için kritik sayıları belirle. Her departman için 1 haftalık önde görünen gösterge (leading indicator) + 1 haftalık arkadan gelen gösterge (lagging). Max 10 KPI.", "status": "approved", "recurring": true},
  {"id": 188, "own": 0, "title": "Organizasyon Şeması Güncelleme", "date": "2026-01-19", "time": "10:00", "type": "task", "desc": "EOS Accountability Chart güncelleme. Her koltuğun 3-5 sorumluluğu belli mi? Boş koltuklar var mı? E-Myth: Doğru pozisyonlar, doğru insanlar.", "status": "approved", "recurring": true},
  {"id": 196, "own": 0, "title": "İşe Alım Planlama — Q1", "date": "2026-01-19", "time": "10:00", "type": "task", "desc": "EOS People Analyzer: Hangi koltuklarda doğru kişi yok? İşe alım planı. E-Myth: Mükemmel işe alım sistemi — iş tanımı, test, referans, deneme süreci.", "status": "approved", "recurring": true},
  {"id": 101, "own": 0, "title": "KDV Beyannamesi — Ocak", "date": "2026-01-26", "time": "17:00", "type": "deadline", "desc": "Ocak ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 113, "own": 0, "title": "Muhtasar Beyanname — Ocak", "date": "2026-01-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 125, "own": 0, "title": "SGK Aylık Prim Ödeme — Ocak", "date": "2026-01-31", "time": "17:00", "type": "deadline", "desc": "Ocak ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 143, "own": 0, "title": "Ba-Bs Formu — Ocak", "date": "2026-01-31", "time": "17:00", "type": "deadline", "desc": "Ocak ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 169, "own": 0, "title": "Aylık Genel Toplantı — Şubat", "date": "2026-02-02", "time": "14:00", "type": "meeting", "desc": "Şubat ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 197, "own": 0, "title": "Şirket Kültür & Değerler Toplantısı", "date": "2026-02-09", "time": "14:00", "type": "meeting", "desc": "EOS Core Values: Şirket değerleri yaşanıyor mu? ActionCOACH: Kültür = Lider davranışı. Değer uyumu en üst liderlikten başlar.", "status": "approved", "recurring": true},
  {"id": 102, "own": 0, "title": "KDV Beyannamesi — Şubat", "date": "2026-02-26", "time": "17:00", "type": "deadline", "desc": "Şubat ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 114, "own": 0, "title": "Muhtasar Beyanname — Şubat", "date": "2026-02-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 189, "own": 0, "title": "Liderlik Gelişim Günü — H1", "date": "2026-02-27", "time": "09:00", "type": "holiday", "desc": "ActionCOACH: Liderlik eğitim günü. 5 Ways (Leads, Conversion, Transactions, Average Sale, Margins) analizi. Şirket büyüme matematikini gözden geçir.", "status": "approved", "recurring": true},
  {"id": 126, "own": 0, "title": "SGK Aylık Prim Ödeme — Şubat", "date": "2026-02-28", "time": "17:00", "type": "deadline", "desc": "Şubat ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 144, "own": 0, "title": "Ba-Bs Formu — Şubat", "date": "2026-02-28", "time": "17:00", "type": "deadline", "desc": "Şubat ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 170, "own": 0, "title": "Aylık Genel Toplantı — Mart", "date": "2026-03-02", "time": "14:00", "type": "meeting", "desc": "Mart ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 194, "own": 0, "title": "Nakit Akışı Değerlendirmesi — Q1", "date": "2026-03-09", "time": "10:00", "type": "task", "desc": "Q1 nakit pozisyonu, alacak yaşlandırması, borç yapısı. Scaling Up: Nakit = Oksijen.", "status": "approved", "recurring": true},
  {"id": 186, "own": 0, "title": "Süreç & SOP Gözden Geçirme — Q1", "date": "2026-03-16", "time": "10:00", "type": "task", "desc": "E-Myth Franchise Prototype güncelleme. Her departman: hangi süreçler belgelendi, hangisi eksik? Hedef: Her iş tekrarlı ve devredilir olmalı.", "status": "approved", "recurring": true},
  {"id": 180, "own": 0, "title": "Bireysel Performans Görüşmeleri — Q1", "date": "2026-03-23", "time": "09:00", "type": "task", "desc": "Tüm çalışanlarla birebir Q1 performans görüşmeleri. ActionCOACH: Feedback kültürü, GAS hedefleri (Goals-Accountability-Support). 3 gün içinde tamamlanmalı.", "status": "approved", "recurring": true},
  {"id": 216, "own": 0, "title": "🏁 L10 Kapanış — Q1 Bitiyor", "date": "2026-03-23", "time": "09:00", "type": "meeting", "desc": "Q1 bitiyor — son hafta. Rocks tamamlandı mı? Tamamlanmayan'lar Q2'ye mi taşınıyor, düşürülüyor mu? Q2 Quarterly Review'e hazırlanın.", "status": "approved", "recurring": false},
  {"id": 103, "own": 0, "title": "KDV Beyannamesi — Mart", "date": "2026-03-26", "time": "17:00", "type": "deadline", "desc": "Mart ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 115, "own": 0, "title": "Muhtasar Beyanname — Mart", "date": "2026-03-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 156, "own": 0, "title": "📊 Q1 Quarterly Review (EOS)", "date": "2026-03-30", "time": "09:00", "type": "meeting", "desc": "Q1 değerlendirmesi: Rocks tamamlama %, Scorecard analizi, Issues listesi temizleme, Q2 Rocks hazırlığı. Scaling Up: 4 karar — People, Strategy, Execution, Cash.", "status": "approved", "recurring": true},
  {"id": 127, "own": 0, "title": "SGK Aylık Prim Ödeme — Mart", "date": "2026-03-31", "time": "17:00", "type": "deadline", "desc": "Mart ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 142, "own": 0, "title": "Gelir Vergisi Beyanı", "date": "2026-03-31", "time": "17:00", "type": "deadline", "desc": "2025 yılı yıllık gelir vergisi beyanname son günü.", "status": "approved", "recurring": true},
  {"id": 145, "own": 0, "title": "Ba-Bs Formu — Mart", "date": "2026-03-31", "time": "17:00", "type": "deadline", "desc": "Mart ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 157, "own": 0, "title": "🗓 Q2 Kickoff — 90 Günlük Rocks", "date": "2026-04-06", "time": "09:00", "type": "meeting", "desc": "Q2 Rocks belirleme. Her Rock: 90 günde tamamlanabilir, ölçülebilir, sorumlusu belli. E-Myth: Sistemler insanı değil, insanlar sistemi yönetir.", "status": "approved", "recurring": true},
  {"id": 217, "own": 0, "title": "⚡ L10 Kickoff — Q2 Başlangıcı", "date": "2026-04-06", "time": "09:00", "type": "meeting", "desc": "Q2 başlıyor. Q1 Rocks'u gözden geçirin. Yeni 90 günlük öncelikleri belirleyin. Scaling Up: Strateji hâlâ geçerli mi?", "status": "approved", "recurring": false},
  {"id": 171, "own": 0, "title": "Aylık Genel Toplantı — Nisan", "date": "2026-04-06", "time": "14:00", "type": "meeting", "desc": "Nisan ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 199, "own": 0, "title": "Onboarding Süreç Gözden Geçirme", "date": "2026-04-20", "time": "10:00", "type": "task", "desc": "E-Myth: Yeni çalışan oryantasyon sistemi güncelle. İlk 90 gün planı her pozisyon için belli mi?", "status": "approved", "recurring": true},
  {"id": 201, "own": 0, "title": "🇹🇷 Ulusal Egemenlik ve Çocuk Bayramı", "date": "2026-04-23", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Ulusal Egemenlik ve Çocuk Bayramı. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 104, "own": 0, "title": "KDV Beyannamesi — Nisan", "date": "2026-04-26", "time": "17:00", "type": "deadline", "desc": "Nisan ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 116, "own": 0, "title": "Muhtasar Beyanname — Nisan", "date": "2026-04-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 128, "own": 0, "title": "SGK Aylık Prim Ödeme — Nisan", "date": "2026-04-30", "time": "17:00", "type": "deadline", "desc": "Nisan ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 140, "own": 0, "title": "Kurumlar Vergisi Beyanı", "date": "2026-04-30", "time": "17:00", "type": "deadline", "desc": "2025 yılı kurumlar vergisi beyannamesi son günü. CEO + CFO onay süreci önceden tamamlanmalı.", "status": "approved", "recurring": true},
  {"id": 141, "own": 0, "title": "Kurumlar Vergisi Ödemesi", "date": "2026-04-30", "time": "17:00", "type": "deadline", "desc": "Kurumlar vergisi birinci taksit ödemesi.", "status": "approved", "recurring": true},
  {"id": 146, "own": 0, "title": "Ba-Bs Formu — Nisan", "date": "2026-04-30", "time": "17:00", "type": "deadline", "desc": "Nisan ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 202, "own": 0, "title": "🇹🇷 Emek ve Dayanışma Günü", "date": "2026-05-01", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Emek ve Dayanışma Günü. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 172, "own": 0, "title": "Aylık Genel Toplantı — Mayıs", "date": "2026-05-04", "time": "14:00", "type": "meeting", "desc": "Mayıs ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 137, "own": 0, "title": "Geçici Vergi — Q1 Beyan", "date": "2026-05-14", "time": "17:00", "type": "deadline", "desc": "Ocak-Mart 2026 dönemi geçici kurumlar vergisi beyanı. EOS Q1 sonuçlarıyla birlikte değerlendirin.", "status": "approved", "recurring": true},
  {"id": 203, "own": 0, "title": "🇹🇷 Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2026-05-19", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Atatürk'ü Anma, Gençlik ve Spor Bayramı. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 105, "own": 0, "title": "KDV Beyannamesi — Mayıs", "date": "2026-05-26", "time": "17:00", "type": "deadline", "desc": "Mayıs ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 117, "own": 0, "title": "Muhtasar Beyanname — Mayıs", "date": "2026-05-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 129, "own": 0, "title": "SGK Aylık Prim Ödeme — Mayıs", "date": "2026-05-31", "time": "17:00", "type": "deadline", "desc": "Mayıs ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 147, "own": 0, "title": "Ba-Bs Formu — Mayıs", "date": "2026-05-31", "time": "17:00", "type": "deadline", "desc": "Mayıs ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 173, "own": 0, "title": "Aylık Genel Toplantı — Haziran", "date": "2026-06-01", "time": "14:00", "type": "meeting", "desc": "Haziran ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 198, "own": 0, "title": "Çalışan Bağlılık Anketi", "date": "2026-06-08", "time": "09:00", "type": "task", "desc": "Yıllık çalışan bağlılık anketi. EOS: eNPS ölçümü. Sonuçları Q3 Rocks'a entegre et.", "status": "approved", "recurring": true},
  {"id": 191, "own": 0, "title": "Müşteri Memnuniyeti Analizi — Q2", "date": "2026-06-15", "time": "10:00", "type": "task", "desc": "ActionCOACH: NPS (Net Promoter Score) ölçümü. Müşteri geri bildirim analizi. 9-10 veren müşterilerden referans, 6 altına müdahale planı.", "status": "approved", "recurring": true},
  {"id": 181, "own": 0, "title": "Bireysel Performans Görüşmeleri — Q2", "date": "2026-06-22", "time": "09:00", "type": "task", "desc": "Q2 performans görüşmeleri. Rocks katkısı, değer uyumu, gelişim alanları.", "status": "approved", "recurring": true},
  {"id": 218, "own": 0, "title": "🏁 L10 Kapanış — Q2 Bitiyor", "date": "2026-06-22", "time": "09:00", "type": "meeting", "desc": "Q2 bitiyor. Yarı yıl kontrolü. Scorecard'daki kırmızı sayılar çözüldü mü? Q3 Rocks'u belirlemek için Quarterly Review'e gidin.", "status": "approved", "recurring": false},
  {"id": 106, "own": 0, "title": "KDV Beyannamesi — Haziran", "date": "2026-06-26", "time": "17:00", "type": "deadline", "desc": "Haziran ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 118, "own": 0, "title": "Muhtasar Beyanname — Haziran", "date": "2026-06-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 158, "own": 0, "title": "📊 Q2 Quarterly Review (EOS)", "date": "2026-06-29", "time": "09:00", "type": "meeting", "desc": "Q2 değerlendirmesi + Yarı yıl performans analizi. Scaling Up: Yıllık hedeflerin %50 kontrolü. BHAG ile uyumu kontrol et.", "status": "approved", "recurring": true},
  {"id": 130, "own": 0, "title": "SGK Aylık Prim Ödeme — Haziran", "date": "2026-06-30", "time": "17:00", "type": "deadline", "desc": "Haziran ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 148, "own": 0, "title": "Ba-Bs Formu — Haziran", "date": "2026-06-30", "time": "17:00", "type": "deadline", "desc": "Haziran ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 159, "own": 0, "title": "🗓 Q3 Kickoff — 90 Günlük Rocks", "date": "2026-07-06", "time": "09:00", "type": "meeting", "desc": "Q3 Rocks. ActionCOACH: \"Measure what matters.\" Scorecard güncellemesi ve ekip hizalaması.", "status": "approved", "recurring": true},
  {"id": 219, "own": 0, "title": "⚡ L10 Kickoff — Q3 Başlangıcı", "date": "2026-07-06", "time": "09:00", "type": "meeting", "desc": "Q3 başlıyor. Yılın yarısı geride. BHAG'a doğru gidiyor musunuz? Nakit pozisyonu kontrol edin. Q3 Rocks belirleyin.", "status": "approved", "recurring": false},
  {"id": 185, "own": 0, "title": "Yarı Yıl Strateji Revizyonu", "date": "2026-07-06", "time": "10:00", "type": "meeting", "desc": "Yıllık planın yarı yıl kontrolü. Scaling Up 4 Karar: Doğru insanlar mı? Strateji hâlâ geçerli mi? Yürütme etkin mi? Nakit yeterli mi?", "status": "approved", "recurring": true},
  {"id": 174, "own": 0, "title": "Aylık Genel Toplantı — Temmuz", "date": "2026-07-06", "time": "14:00", "type": "meeting", "desc": "Temmuz ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 204, "own": 0, "title": "🇹🇷 Demokrasi ve Millî Birlik Günü", "date": "2026-07-15", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Demokrasi ve Millî Birlik Günü. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 107, "own": 0, "title": "KDV Beyannamesi — Temmuz", "date": "2026-07-26", "time": "17:00", "type": "deadline", "desc": "Temmuz ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 119, "own": 0, "title": "Muhtasar Beyanname — Temmuz", "date": "2026-07-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 131, "own": 0, "title": "SGK Aylık Prim Ödeme — Temmuz", "date": "2026-07-31", "time": "17:00", "type": "deadline", "desc": "Temmuz ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 149, "own": 0, "title": "Ba-Bs Formu — Temmuz", "date": "2026-07-31", "time": "17:00", "type": "deadline", "desc": "Temmuz ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 175, "own": 0, "title": "Aylık Genel Toplantı — Ağustos", "date": "2026-08-03", "time": "14:00", "type": "meeting", "desc": "Ağustos ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 138, "own": 0, "title": "Geçici Vergi — Q2 Beyan", "date": "2026-08-14", "time": "17:00", "type": "deadline", "desc": "Nisan-Haziran 2026 dönemi geçici kurumlar vergisi beyanı.", "status": "approved", "recurring": true},
  {"id": 108, "own": 0, "title": "KDV Beyannamesi — Ağustos", "date": "2026-08-26", "time": "17:00", "type": "deadline", "desc": "Ağustos ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 120, "own": 0, "title": "Muhtasar Beyanname — Ağustos", "date": "2026-08-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 190, "own": 0, "title": "Liderlik Gelişim Günü — H2", "date": "2026-08-28", "time": "09:00", "type": "holiday", "desc": "İkinci yarı liderlik gelişim günü. ActionCOACH: Mastery (Destination, Money, Delivery, People, Systems, Business). Hangi alanda eksiksiniz?", "status": "approved", "recurring": true},
  {"id": 205, "own": 0, "title": "🇹🇷 Zafer Bayramı", "date": "2026-08-30", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Zafer Bayramı. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 132, "own": 0, "title": "SGK Aylık Prim Ödeme — Ağustos", "date": "2026-08-31", "time": "17:00", "type": "deadline", "desc": "Ağustos ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 150, "own": 0, "title": "Ba-Bs Formu — Ağustos", "date": "2026-08-31", "time": "17:00", "type": "deadline", "desc": "Ağustos ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 195, "own": 0, "title": "Nakit Akışı Değerlendirmesi — Q3", "date": "2026-09-07", "time": "10:00", "type": "task", "desc": "Q3 nakit değerlendirmesi. Yıl sonu nakit projeksiyonu. Vergi karşılığı yeterli mi?", "status": "approved", "recurring": true},
  {"id": 176, "own": 0, "title": "Aylık Genel Toplantı — Eylül", "date": "2026-09-07", "time": "14:00", "type": "meeting", "desc": "Eylül ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 187, "own": 0, "title": "Süreç & SOP Gözden Geçirme — Q3", "date": "2026-09-14", "time": "10:00", "type": "task", "desc": "Sistemler denetimi. E-Myth: \"Sisteminiz sizin yerinize çalışıyor mu?\" Onboarding, satış, teslimat, müşteri hizmetleri süreçleri güncelle.", "status": "approved", "recurring": true},
  {"id": 182, "own": 0, "title": "Bireysel Performans Görüşmeleri — Q3", "date": "2026-09-21", "time": "09:00", "type": "task", "desc": "Q3 performans görüşmeleri. Yıl sonu bonus/pirim simülasyonu.", "status": "approved", "recurring": true},
  {"id": 220, "own": 0, "title": "🏁 L10 Kapanış — Q3 Bitiyor", "date": "2026-09-21", "time": "09:00", "type": "meeting", "desc": "Q3 bitiyor. Yıl sonu hedeflere ulaşabilecek misiniz? Nakit projeksiyonu yapın. Q4 Rocks son kez netleştirin.", "status": "approved", "recurring": false},
  {"id": 109, "own": 0, "title": "KDV Beyannamesi — Eylül", "date": "2026-09-26", "time": "17:00", "type": "deadline", "desc": "Eylül ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 121, "own": 0, "title": "Muhtasar Beyanname — Eylül", "date": "2026-09-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 160, "own": 0, "title": "📊 Q3 Quarterly Review (EOS)", "date": "2026-09-28", "time": "09:00", "type": "meeting", "desc": "Q3 değerlendirmesi + Yıl sonu tahmini. Q4 Rocks + 2027 yıllık plan ön hazırlığı başlar.", "status": "approved", "recurring": true},
  {"id": 133, "own": 0, "title": "SGK Aylık Prim Ödeme — Eylül", "date": "2026-09-30", "time": "17:00", "type": "deadline", "desc": "Eylül ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 151, "own": 0, "title": "Ba-Bs Formu — Eylül", "date": "2026-09-30", "time": "17:00", "type": "deadline", "desc": "Eylül ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 161, "own": 0, "title": "🗓 Q4 Kickoff — 90 Günlük Rocks", "date": "2026-10-05", "time": "09:00", "type": "meeting", "desc": "Q4 Rocks. Yılı güçlü kapatma hedefleri. Scaling Up: Kritik sayıları ve nakit döngüsünü takip et.", "status": "approved", "recurring": true},
  {"id": 221, "own": 0, "title": "⚡ L10 Kickoff — Q4 Başlangıcı", "date": "2026-10-05", "time": "09:00", "type": "meeting", "desc": "Q4 başlıyor — yılı kapatma zamanı. Q4 Rocks + 2027 yıllık plan hazırlığı başlar. E-Myth: Sistemler hazır mı?", "status": "approved", "recurring": false},
  {"id": 177, "own": 0, "title": "Aylık Genel Toplantı — Ekim", "date": "2026-10-05", "time": "14:00", "type": "meeting", "desc": "Ekim ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 110, "own": 0, "title": "KDV Beyannamesi — Ekim", "date": "2026-10-26", "time": "17:00", "type": "deadline", "desc": "Ekim ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 122, "own": 0, "title": "Muhtasar Beyanname — Ekim", "date": "2026-10-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 206, "own": 0, "title": "🇹🇷 Cumhuriyet Bayramı", "date": "2026-10-29", "time": "00:00", "type": "holiday", "desc": "Resmî tatil — Cumhuriyet Bayramı. Çalışma planlamasını bu güne göre yapın.", "status": "approved", "recurring": true},
  {"id": 134, "own": 0, "title": "SGK Aylık Prim Ödeme — Ekim", "date": "2026-10-31", "time": "17:00", "type": "deadline", "desc": "Ekim ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 152, "own": 0, "title": "Ba-Bs Formu — Ekim", "date": "2026-10-31", "time": "17:00", "type": "deadline", "desc": "Ekim ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 178, "own": 0, "title": "Aylık Genel Toplantı — Kasım", "date": "2026-11-02", "time": "14:00", "type": "meeting", "desc": "Kasım ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 193, "own": 0, "title": "Yıllık Bütçe Planlaması — 2027", "date": "2026-11-09", "time": "09:00", "type": "meeting", "desc": "Scaling Up: Bir sonraki yıl bütçe ve nakit akışı planlaması. CFO + CEO + departman liderleri. CANI (Cash Acceleration Strategies): Fiyatlandırma, ön ödeme, stok, alacak/borç döngüsü.", "status": "approved", "recurring": true},
  {"id": 139, "own": 0, "title": "Geçici Vergi — Q3 Beyan", "date": "2026-11-14", "time": "17:00", "type": "deadline", "desc": "Temmuz-Eylül 2026 dönemi geçici kurumlar vergisi beyanı.", "status": "approved", "recurring": true},
  {"id": 192, "own": 0, "title": "Müşteri Memnuniyeti Analizi — Q4", "date": "2026-11-16", "time": "10:00", "type": "task", "desc": "Yıl sonu NPS analizi. Sadakat programı değerlendirme. ActionCOACH: En iyi müşterini koru, en kötüsünü bırak.", "status": "approved", "recurring": true},
  {"id": 111, "own": 0, "title": "KDV Beyannamesi — Kasım", "date": "2026-11-26", "time": "17:00", "type": "deadline", "desc": "Kasım ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 123, "own": 0, "title": "Muhtasar Beyanname — Kasım", "date": "2026-11-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 135, "own": 0, "title": "SGK Aylık Prim Ödeme — Kasım", "date": "2026-11-30", "time": "17:00", "type": "deadline", "desc": "Kasım ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 153, "own": 0, "title": "Ba-Bs Formu — Kasım", "date": "2026-11-30", "time": "17:00", "type": "deadline", "desc": "Kasım ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true},
  {"id": 162, "own": 0, "title": "📊 Q4 Annual Planning — 2027 Strateji", "date": "2026-12-07", "time": "09:00", "type": "meeting", "desc": "Yıllık strateji toplantısı (2 gün). EOS Annual Plan: 1 yıl, 3 yıl, 10 yıl hedefleri. BHAG gözden geçirme. Scaling Up: People, Strategy, Execution, Cash planlaması. E-Myth: Franchise Prototype güncelleme.", "status": "approved", "recurring": true},
  {"id": 179, "own": 0, "title": "Aylık Genel Toplantı — Aralık", "date": "2026-12-07", "time": "14:00", "type": "meeting", "desc": "Aralık ayı tüm şirket toplantısı. Gündem: Geçen ay sonuçları (KPIler), Bu ay öncelikleri (Rocks), Şirket haberleri, Soru-cevap. Scaling Up: Şeffaflık kültürü için tüm ekip görmeli.", "status": "approved", "recurring": true},
  {"id": 183, "own": 0, "title": "Yıllık Performans Değerlendirmesi", "date": "2026-12-14", "time": "09:00", "type": "task", "desc": "Yıllık birebir değerlendirmeler. E-Myth: Doğru kişi, doğru koltuğa. EOS: People Analyzer (GGPD: Get it, Want it, Capacity to do it, Demonstrates values).", "status": "approved", "recurring": true},
  {"id": 222, "own": 0, "title": "🏁 L10 Kapanış — Q4 Bitiyor", "date": "2026-12-14", "time": "09:00", "type": "meeting", "desc": "Q4 bitiyor — yıl kapanıyor. Rocks tamamlama oranı? 2027 planı hazır mı? Yıl sonu kutlaması için tarih belirleyin.", "status": "approved", "recurring": false},
  {"id": 163, "own": 0, "title": "🏁 Yıl Sonu Kapanış & Kutlama", "date": "2026-12-25", "time": "16:00", "type": "holiday", "desc": "Yıl sonu şirket değerlendirmesi ve kutlama etkinliği. ActionCOACH: Başarıları kutlamak kültür oluşturur.", "status": "approved", "recurring": true},
  {"id": 112, "own": 0, "title": "KDV Beyannamesi — Aralık", "date": "2026-12-26", "time": "17:00", "type": "deadline", "desc": "Aralık ayı KDV-1 beyannamesi son günü. E-Beyan zorunlu. Muhasebe birimi ile koordinasyon sağlayın.", "status": "approved", "recurring": true},
  {"id": 124, "own": 0, "title": "Muhtasar Beyanname — Aralık", "date": "2026-12-26", "time": "17:00", "type": "deadline", "desc": "Aylık muhtasar ve prim hizmet beyannamesi. SGK + stopaj bildirimi.", "status": "approved", "recurring": true},
  {"id": 136, "own": 0, "title": "SGK Aylık Prim Ödeme — Aralık", "date": "2026-12-31", "time": "17:00", "type": "deadline", "desc": "Aralık ayı SGK işçi ve işveren primi ödeme günü. Geç ödeme gecikme zammına yol açar.", "status": "approved", "recurring": true},
  {"id": 154, "own": 0, "title": "Ba-Bs Formu — Aralık", "date": "2026-12-31", "time": "17:00", "type": "deadline", "desc": "Aralık ayı Ba (alış) ve Bs (satış) bildirim formu. 5.000 TL üzeri işlemler bildirilmeli.", "status": "approved", "recurring": true}
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

/** Şirket yıllık ritim takvimini mevcut takvimiyle birleştirir.
 *  localStorage zaten doluysa DEFAULT_CAL görmezden gelinir.
 *  Bu fonksiyon uygulama açılışında bir kez çağrılır. */
function mergeCompanyCalendar() {
  const existing = _read(KEYS.calendar);
  if (!Array.isArray(existing)) return; // boşsa DEFAULT_CAL zaten kullanılıyor
  const existingIds = new Set(existing.map(e => e.id));
  const toAdd = DEFAULT_CAL.filter(e => !existingIds.has(e.id));
  if (toAdd.length > 0) {
    const merged = [...existing, ...toAdd];
    _write(KEYS.calendar, merged);
    console.log('[DB] Şirket takvimi güncellendi:', toAdd.length, 'etkinlik eklendi');
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ÖNERİLER, DUYURULAR, NOTLAR, LİNKLER
// ════════════════════════════════════════════════════════════════

const DEFAULT_SUGGESTIONS = [
  { id: 1, uid: 2, title: 'Mobil Uygulama',   desc: 'iOS/Android destek.',   type: 'feature',     status: 'review',  ts: '2026-03-15 10:22:00' },
  { id: 2, uid: 3, title: 'Bildirim Sistemi', desc: 'E-posta bildirimi.',     type: 'improvement', status: 'pending', ts: '2026-03-14 14:05:00' },
];
const DEFAULT_ANN = [
  { id: 1, title: 'Platforma Hoş Geldiniz!', body: 'Duay Global LLC v8.0 kullanıma açıldı.', type: 'info', ts: '2026-03-19 10:00:00', read: [], audience: 'all' },
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
/** @param {Array<Object>} d Son 500 kayıt saklanır */ function saveAct(d) { _write(KEYS.activity, d.slice(0, 500));
  var _fp = _fsPath('activity'); if (_fp) _syncFirestore(_fp, d.slice(0, 500));
}

/**
 * Kullanıcı hareketini loglar. Hem localStorage'a hem Firestore\'a yazar.
 * @param {string} type    'task' | 'user' | 'kargo' | 'view' | ...
 * @param {string} detail  Okunabilir eylem açıklaması
 */
function logActivity(type, detail) {
  const CU = window.Auth?.getCU?.();
  if (!CU) return;
  const acts = loadAct();
  const entry = { id: generateNumericId(), uid: CU.id, uname: CU.name, type, detail, ts: nowTs() };
  acts.unshift(entry);
  saveAct(acts);
  // Firestore log (Anayasa Kural 3 — her hareket tarih + UID)
  // Firestore activity log
  const _fp_act = window.Auth?.getFBDB?.();
  if (_fp_act) {
    const _logTid = (_getTid()).replace(/[^a-zA-Z0-9_]/g, '_');
    _fp_act.collection('duay_' + _logTid + '_logs').add({
      ...entry, serverTs: window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || null
    }).catch(() => {});
  }
  // Dashboard badge güncelle (varsa)
  if (typeof window.updateDashboardActs === 'function') window.updateDashboardActs();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — BİLDİRİMLER
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadNotifs()    { const d = _read(KEYS.notifications); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 100 kayıt */ function storeNotifs(d) { _write(KEYS.notifications, d.slice(0, 100));
  if (window.Auth?.getFBAuth?.()?.currentUser) {
    const _fp_notifs = _fsPath('notifications'); if (_fp_notifs) _syncFirestore(_fp_notifs, d.slice(0, 100));
  }
}

/**
 * Bildirim ekler ve rozeti günceller.
 * @param {string} icon   Emoji
 * @param {string} msg    Bildirim metni
 * @param {string} [type='info'] 'info' | 'warn' | 'ok' | 'err'
 * @param {string} [link='']    Tıklandığında gidilecek panel
 */
function addNotif(icon, msg, type = 'info', link = '', targetUid = null) {
  const d = loadNotifs();
  d.unshift({ id: generateNumericId(), icon, msg, type, link, ts: nowTs(), read: false, targetUid: targetUid || null });
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
/** @param {Array<Object>} d */ function storeKonteyn(d)     { _write(KEYS.konteyner, d);
  var _fp = _fsPath('konteyner'); if (_fp) _syncFirestore(_fp, d);
}

/** @returns {Object}        */ function loadKargoHistory()  { const d = _read(KEYS.kargoHistory);  return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoHistory(d) { _write(KEYS.kargoHistory, d); }

/** @returns {Object}        */ function loadKargoMasraf()   { const d = _read(KEYS.kargoMasraf);   return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoMasraf(d) { _write(KEYS.kargoMasraf, d); }

/** @returns {Object}        */ function loadKargoBelge()    { const d = _read(KEYS.kargoBelge);    return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoBelge(d)  { _write(KEYS.kargoBelge, d); }

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
/** @returns {Array<Object>} */
function loadTahsilat() {
  var d = _read(KEYS.tahsilat);
  if (Array.isArray(d) && d.length > 0) return d;
  // Migrasyon: eski 'duay_tahsilat' key'inden oku
  try {
    var oldData = JSON.parse(localStorage.getItem('duay_tahsilat') || '[]');
    if (Array.isArray(oldData) && oldData.length > 0) {
      _write(KEYS.tahsilat, oldData);
      console.info('[DB] Tahsilat migrasyon: duay_tahsilat → ' + KEYS.tahsilat + ' (' + oldData.length + ' kayıt)');
      return oldData;
    }
  } catch(e) {}
  return [];
}
/** @param {Array<Object>} d */
function storeTahsilat(d) {
  _write(KEYS.tahsilat, d);
  var _fp_tahsilat = _fsPath('tahsilat');
  if (_fp_tahsilat) _syncFirestore(_fp_tahsilat, d);
}
/** @returns {Array<Object>} */ function loadSatinalma() { const d = _read(KEYS.satinalma); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeSatinalma(d) { _write(KEYS.satinalma, d);
  var _fp = _fsPath('satinalma'); if (_fp) _syncFirestore(_fp, d);
}
/** @returns {Array<Object>} */ function loadCari() { const d = _read(KEYS.cari); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeCari(d) { _write(KEYS.cari, d);
  var _fp = _fsPath('cari'); if (_fp) _syncFirestore(_fp, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16B — BANKA/IBAN YÖNETİMİ
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadBankalar() { var d = _read(KEYS.bankalar); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeBankalar(d) { _write(KEYS.bankalar, d);
  var _fp = _fsPath('bankalar'); if (_fp) _syncFirestore(_fp, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16C — NAVLUN TEKLİFLERİ
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadNavlun() { var d = _read(KEYS.navlun); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeNavlun(d) { _write(KEYS.navlun, d);
  var _fp = _fsPath('navlun'); if (_fp) _syncFirestore(_fp, d);
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
/** @param {Array<Object>} d */ function storeEvrak(d)         { _write(KEYS.evrak, d);
  var _fp = _fsPath('evrak'); if (_fp) _syncFirestore(_fp, d);
}

/** @returns {Array<Object>} */ function loadDolaplar()        { const d = _read(KEYS.arsivDolaplar); return Array.isArray(d) ? d : DEFAULT_DOLAPLAR; }
/** @param {Array<Object>} d */ function storeDolaplar(d)      { _write(KEYS.arsivDolaplar, d); }

/** @returns {Array<Object>} */ function loadArsivBelgeler()   { const d = _read(KEYS.arsivBelgeler); return Array.isArray(d) ? d : DEFAULT_ARSIV_BELGELER; }
/** @param {Array<Object>} d */ function storeArsivBelgeler(d) { _write(KEYS.arsivBelgeler, d);
  var _fp = _fsPath('arsivBelgeler'); if (_fp) _syncFirestore(_fp, d);
}

/** @returns {Array<Object>} */ function loadResmi()           { const d = _read(KEYS.resmiEvrak);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeResmi(d)         { _write(KEYS.resmiEvrak, d);
  var _fp = _fsPath('resmiEvrak'); if (_fp) _syncFirestore(_fp, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 22 — ETKİNLİK / FUAR
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadEtkinlik()       { const d = _read(KEYS.etkinlik);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeEtkinlik(d)     { _write(KEYS.etkinlik, d);
  var _fp = _fsPath('etkinlik'); if (_fp) _syncFirestore(_fp, d);
}

/** @returns {Object|null}   */ function loadFuarKriterleri()  { return _read(KEYS.fuarKriter, null); }
/** @param {Object} d        */ function saveFuarKriterleri(d) { _write(KEYS.fuarKriter, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 23 — GÖREV YAZIŞMA (Task Chat)
// ════════════════════════════════════════════════════════════════

/** @returns {Object.<number,Array>} taskId → mesaj dizisi */
function loadTaskChats()    { const d = _read(KEYS.taskChats); return (d && typeof d === 'object') ? d : {}; }
/** @param {Object} d       */ function storeTaskChats(d) { _write(KEYS.taskChats, d);
  const _fp_chats = _fsPath('taskChats'); if (_fp_chats) _syncFirestore(_fp_chats, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 24 — KUTLAMA / TEBRIK
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadGrt()     { const d = _read(KEYS.greetings); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeGrt(d)   { _write(KEYS.greetings, d);
  var _fp = _fsPath('greetings'); if (_fp) _syncFirestore(_fp, d);
}

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
 * Tüm localStorage verisini Firestore\'a aktarır.
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
      const _mbase = 'duay_' + tid.replace(/[^a-zA-Z0-9_]/g, '_');
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
 * P1: Kendi yazdığımız koleksiyonları takip eder.
 * onSnapshot kendi yazımımızı geri okumasın diye kullanılır.
 * @type {Object.<string, number>} collection → expiry timestamp
 */
const _writingNow = {};

/** Double-call guard — startRealtimeSync birden fazla çağrılmasını engeller */
let _syncStarted = false;

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
    if (!FB_DB) { console.warn('[LISTEN] FB_DB yok, atlanıyor:', collection); return; }

    const tid   = _getTid();
    // paths kontrolü kaldırıldı — _base2 kendi path'ini oluşturuyor

    // Önceki listener varsa kapat
    if (_listeners[collection]) {
      _listeners[collection]();
      delete _listeners[collection];
    }

    const _base2 = 'duay_' + tid.replace(/[^a-zA-Z0-9_]/g, '_');
    const docRef = FB_DB.collection(_base2).doc(collection);
    console.log('[LISTEN]', collection, '→', _base2 + '/' + collection, '| Auth:', !!window.Auth?.getFBAuth?.()?.currentUser);
    // Anlık ilk çekme — Firestore + localStorage merge (veri kaybı önleme)
    docRef.get().then(snap => {
      if (!snap.exists) return;
      const fsData = snap.data()?.data;
      if (fsData === null || fsData === undefined) return;
      var merged = _mergeDataSets(localKey, fsData, collection);
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
        localStorage.setItem(localKey + '_ts', snap.data()?.syncedAt || new Date().toISOString());
      } catch(e) {}
      // Merge sonucu Firestore'dan farklıysa geri yaz
      if (Array.isArray(merged) && Array.isArray(fsData) && merged.length > fsData.length) {
        _syncFirestoreMerged(_base2 + '/' + collection, merged);
      }
      if (typeof onUpdate === 'function') {
        try { onUpdate(merged); } catch(e) {}
      }
      var count = Array.isArray(merged) ? merged.length : Object.keys(merged).length;
      console.info('[DB:init]', collection, '→', count, 'kayıt (merge)');
    }).catch(e => {
      if (e.code !== 'permission-denied') console.warn('[DB:init]', collection, e.message);
    });

    const unsubscribe = docRef.onSnapshot(snap => {
      if (!snap.exists) {
        console.info('[DB:realtime]', collection, '→ Firestore boş, localStorage kullanılıyor');
        return;
      }
      // P1: Kendi yazmamızdan gelen echo'yu atla
      if (_writingNow[collection] && Date.now() < _writingNow[collection]) {
        return;
      }
      delete _writingNow[collection];

      const fsData = snap.data()?.data;
      if (fsData === null || fsData === undefined) return;

      // Merge: Firestore + localStorage birleştir (veri kaybı önleme)
      var merged = _mergeDataSets(localKey, fsData, collection);
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
        localStorage.setItem(localKey + '_ts', snap.data()?.syncedAt || new Date().toISOString());
      } catch (e) { GlobalErrorHandler('realtime:write', e, 'warn'); }
      // Merge sonucu Firestore'dan farklıysa geri yaz
      if (Array.isArray(merged) && Array.isArray(fsData) && merged.length > fsData.length) {
        _syncFirestoreMerged(_base2 + '/' + collection, merged);
      }

      // UI'ı yenile (throttled)
      if (typeof onUpdate === 'function') {
        clearTimeout(_listeners[collection + '_timer']);
        _listeners[collection + '_timer'] = setTimeout(() => {
          try { onUpdate(merged); }
          catch (e) { GlobalErrorHandler('realtime:render', e, 'warn'); }
        }, 300);
      }

      console.info('[DB:realtime]', collection, '→', Array.isArray(merged) ? merged.length : '?', 'kayıt (merge)');
    }, err => {
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
/**
 * Realtime sync'ten gelen kullanıcı verisinde CU'yu günceller.
 * Rol, isim, durum değişikliklerini anında yansıtır.
 */
function _refreshCU(usersData) {
  try {
    const cu = window.Auth?.getCU?.();
    if (!cu || !Array.isArray(usersData)) return;
    const updated = usersData.find(u => u.id === cu.id || (u.email && cu.email && u.email.toLowerCase() === cu.email.toLowerCase()));
    if (!updated) return;
    // Değişiklik var mı kontrol et
    const changed = updated.name !== cu.name || updated.role !== cu.role || updated.status !== cu.status
                 || JSON.stringify(updated.modules) !== JSON.stringify(cu.modules)
                 || JSON.stringify(updated.permissions) !== JSON.stringify(cu.permissions);
    if (!changed) return;
    // CU'yu güncelle (auth.js CU değişkenine doğrudan erişim)
    Object.assign(cu, { name: updated.name, role: updated.role, status: updated.status, modules: updated.modules, permissions: updated.permissions, access: updated.access, dept: updated.dept, rule12h: updated.rule12h });
    // Session'ı güncelle
    try { localStorage.setItem('ak_session', JSON.stringify({ uid: cu.id, email: cu.email, tenantId: window.DEFAULT_TENANT_ID || 'tenant_default', ts: Date.now() })); } catch(e) {}
    // Tüm modüllere bildir
    try { window.dispatchEvent(new CustomEvent('auth-changed', { detail: cu })); } catch(e) {}
    // UI güncelle
    const navName = document.getElementById('nav-name');
    if (navName) navName.textContent = cu.name;
    console.info('[DB] CU güncellendi:', cu.name, cu.role);
    // Askıya alınmışsa çıkış yap
    if (updated.status === 'suspended') {
      window.toast?.('Hesabınız askıya alındı', 'err');
      setTimeout(() => window.App?.logout?.(), 1500);
    }
  } catch(e) { console.warn('[DB] _refreshCU hatası:', e); }
}

/**
 * Realtime sync'ten gelen görev verisinde yeni atama var mı kontrol eder.
 * CU'ya atanan yeni görev varsa anlık modal gösterir.
 */
const _lastSeenTaskIds = new Set();
function _checkNewAssignments(tasksData) {
  try {
    const cu = window.Auth?.getCU?.();
    if (!cu || !Array.isArray(tasksData)) return;
    // İlk yüklemede mevcut görevleri kaydet, modal gösterme
    if (!_lastSeenTaskIds.size) {
      tasksData.forEach(t => _lastSeenTaskIds.add(t.id));
      return;
    }
    tasksData.forEach(t => {
      if (_lastSeenTaskIds.has(t.id)) return;
      _lastSeenTaskIds.add(t.id);
      // Yeni görev ve bana atanmış mı?
      if (t.uid === cu.id) {
        _showAssignmentModal(t);
      }
    });
  } catch(e) {}
}

// Global fonksiyon — inline onclick'ten çağrılır
window._closeAssignModal = function() {
  document.getElementById('mo-task-assigned')?.remove();
};
window._goToTask = function(tid) {
  var mo = document.getElementById('mo-task-assigned');
  if (mo) mo.remove();

  if (typeof window.nav === 'function') window.nav('pusula');

  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    if (typeof window.openPusDetail === 'function' && document.getElementById('pusula-panel')) {
      clearInterval(interval);
      window.openPusDetail(tid);
    }
    if (attempts > 20) clearInterval(interval);
  }, 200);
};

function _showAssignmentModal(task) {
  const old = document.getElementById('mo-task-assigned'); if (old) old.remove();
  const esc = window.escapeHtml || (s => s);

  const PRI = { 1:{l:'Kritik',ic:'🔴',c:'#EF4444',bg:'#FEF2F2'}, 2:{l:'Yuksek',ic:'🟡',c:'#F59E0B',bg:'#FFFBEB'}, 3:{l:'Normal',ic:'🟢',c:'#10B981',bg:'#ECFDF5'}, 4:{l:'Dusuk',ic:'⚪',c:'#9CA3AF',bg:'#F9FAFB'} };
  const p = PRI[task.pri] || PRI[3];

  let dueText = '';
  if (task.due) {
    const diff = Math.ceil((new Date(task.due) - new Date()) / 86400000);
    if (diff < 0) dueText = '<span style="color:#EF4444;font-weight:700">' + Math.abs(diff) + ' gun GECİKTİ!</span>';
    else if (diff === 0) dueText = '<span style="color:#EF4444;font-weight:700">BUGUN!</span>';
    else if (diff === 1) dueText = '<span style="color:#F97316;font-weight:600">YARIN</span>';
    else if (diff <= 3) dueText = '<span style="color:#F97316;font-weight:600">' + diff + ' gun kaldi</span>';
    else if (diff <= 7) dueText = '<span style="color:#F59E0B">' + diff + ' gun kaldi</span>';
    else dueText = '<span style="color:#10B981">' + diff + ' gun kaldi</span>';
  }

  const users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  const assigner = users.find(u => u.id === task.createdBy) || {};
  const tid = task.id;

  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-task-assigned'; mo.style.zIndex='9999';
  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:16px;overflow:hidden;animation:_pusNotifSlide .3s ease-out">'
    + '<div style="background:linear-gradient(135deg,' + p.c + 'dd,' + p.c + '99);padding:24px;text-align:center;color:#fff">'
      + '<div style="font-size:36px;margin-bottom:8px">📋</div>'
      + '<div style="font-size:18px;font-weight:700">Yeni Gorev Atandi!</div>'
      + '<div style="font-size:13px;opacity:.85;margin-top:4px">Sana yeni bir gorev atandi, basarilar!</div>'
    + '</div>'
    + '<div style="padding:20px">'
      + '<div style="font-size:16px;font-weight:700;color:var(--t);margin-bottom:12px;line-height:1.3">' + esc(task.title) + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
        + '<span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:' + p.bg + ';color:' + p.c + ';border:1px solid ' + p.c + '30">' + p.ic + ' ' + p.l + '</span>'
        + (task.department ? '<span style="font-size:11px;padding:4px 10px;border-radius:6px;background:var(--s2);color:var(--t2)">' + esc(task.department) + '</span>' : '')
      + '</div>'
      + (dueText ? '<div style="font-size:13px;margin-bottom:8px">📅 ' + dueText + '</div>' : '')
      + (assigner.name ? '<div style="font-size:12px;color:var(--t3)">Atayan: <span style="font-weight:600;color:var(--t2)">' + esc(assigner.name) + '</span></div>' : '')
    + '</div>'
    + '<div style="padding:0 20px 20px;display:flex;gap:8px">'
      + '<button onclick="window._closeAssignModal()" class="btn btns" style="flex:1;padding:10px;font-size:13px">Tamam</button>'
      + '<button onclick="window._goToTask(' + tid + ')" class="btn btnp" style="flex:1;padding:10px;font-size:13px">Gorevi Gor</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

function startRealtimeSync() {
  console.log('[SYNC] startRealtimeSync çağrıldı. _syncStarted:', _syncStarted, '| FB_DB:', !!window.Auth?.getFBDB?.(), '| FB_AUTH currentUser:', !!window.Auth?.getFBAuth?.()?.currentUser);
  if (_syncStarted) { console.info('[DB] Realtime sync zaten çalışıyor — tekrar başlatma atlandı'); return; }
  _syncStarted = true;
  // Koleksiyon adı → [localStorage key, UI render fonksiyonu adı]
  const SYNC_MAP = [
    // Kullanıcılar — tüm cihazlarda güncel kalmalı + CU güncelle
    ['users',         KEYS.users,         (data) => { _refreshCU(data); if (!window._adminSaving) window.renderUsers?.(); }],
    // Kritik — her kullanıcı için
    ['tasks',         KEYS.tasks,         (data) => { _checkNewAssignments(data); window.Pusula?.render?.(); }],
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
    ['tahsilat',      KEYS.tahsilat,      () => window.renderOdemeler?.()],
    ['satinalma',     KEYS.satinalma,     () => window.renderSatinAlma?.()],
    ['cari',          KEYS.cari,          () => window.renderCari?.()],
    // Ek kritik koleksiyonlar
    ['konteyner',     KEYS.konteyner,     () => window.renderKargo?.()],
    ['evrak',         KEYS.evrak,         () => window.renderEvrak?.()],
    ['etkinlik',      KEYS.etkinlik,      () => window.renderEtkinlik?.()],
    ['numune',        KEYS.numune,        () => window.renderNumune?.()],
    ['resmiEvrak',    KEYS.resmiEvrak,    () => window.renderResmi?.()],
    ['arsivBelgeler', KEYS.arsivBelgeler, () => window.renderArsiv?.()],
    ['greetings',     KEYS.greetings,     () => window.renderGorusme?.()],
    ['puan',          KEYS.puan,          () => window.renderPuantaj?.()],
    ['activity',      KEYS.activity,      () => window.renderActivity?.()],
    ['kpi',           KEYS.kpi,           () => window.renderKpi?.()],
    ['notes',         KEYS.notes,         () => window.renderNotes?.()],
    ['tebligat',      KEYS.tebligat,      () => window.renderTebligat?.()],
    ['bankalar',      KEYS.bankalar,      () => {}],
    ['navlun',        KEYS.navlun,        () => window.renderNavlun?.()],
    // Görev yazışmaları — cihazlar arası senkronize olmalı
    ['taskChats',     KEYS.taskChats,     () => {
      // Açık chat varsa yenile
      try { window.pdpRefreshChatMsgs?.(); } catch(e) {}
      try {
        const tid = document.getElementById('taskchat-tid')?.value;
        if (tid) window.renderTaskChatMsgs?.(parseInt(tid));
      } catch(e) {}
    }],
    // Bildirimler — cihazlar arası senkronize
    ['notifications', KEYS.notifications, () => {
      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
      if (typeof window._renderNotifPanel === 'function') window._renderNotifPanel();
    }],
  ];

  SYNC_MAP.forEach(([col, key, render]) => {
    _listenCollection(col, key, render);
  });

  console.info('[DB] Realtime sync başlatıldı:', SYNC_MAP.length, 'koleksiyon');

  // İlk veri çekme sonrası aktif paneli yeniden render et
  // get() çağrıları ~500-2000ms sürebilir — sonrası için zorla render
  setTimeout(function() {
    console.info('[DB] İlk sync tamamlandı — aktif panel yeniden render');
    if (typeof window._renderActivePanel === 'function') window._renderActivePanel();
  }, 2500);

  // Otomatik veri aktarımı — Firestore boşsa localStorage'ı yükle
  setTimeout(_autoUploadIfEmpty, 3500);
}

/**
 * Firestore boşsa localStorage verilerini otomatik yükler.
 * Her login'de bir kez çalışır — veri kaybını önler.
 */
async function _autoUploadIfEmpty() {
  const FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) return;
  const tid  = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
  const base = 'duay_' + tid;

  const UPLOAD_MAP = [
    ['tasks',  KEYS.tasks,  loadTasks],
    ['users',  KEYS.users,  loadUsers],
    ['kargo',  KEYS.kargo,  () => { try { return JSON.parse(localStorage.getItem(KEYS.kargo)||'[]'); } catch(e){return [];} }],
    ['ik',     KEYS.ik,     () => { try { return JSON.parse(localStorage.getItem(KEYS.ik)||'[]'); } catch(e){return [];} }],
  ];

  let uploaded = 0;
  for (const [col, key, loader] of UPLOAD_MAP) {
    try {
      const docRef = FB_DB.collection(base).doc(col);
      const snap   = await docRef.get();
      const fsData = snap.exists ? snap.data()?.data : null;

      // Firestore boş veya az veri varsa, local'deki daha fazlaysa yükle
      const localData = loader();
      if (Array.isArray(localData) && localData.length > 0) {
        if (!fsData || !Array.isArray(fsData) || fsData.length < localData.length) {
          await docRef.set({ data: localData, syncedAt: new Date().toISOString(), autoUploaded: true }, { merge: true });
          uploaded++;
          console.info('[DB:auto-upload]', col, '→', localData.length, 'kayıt yüklendi');
        }
      }
    } catch(e) {
      console.warn('[DB:auto-upload]', col, e.message);
    }
  }

  if (uploaded > 0) {
    console.info('[DB:auto-upload] Toplam', uploaded, 'koleksiyon Firestore\'a yüklendi');
    window.toast?.('☁️ Veriler buluta aktarıldı (' + uploaded + ' koleksiyon)', 'ok');
  }
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
  _syncStarted = false;
  console.info('[DB] Realtime sync durduruldu.');
}


// ════════════════════════════════════════════════════════════════
// FORM DRAFT (Oto-Kayıt)
// ════════════════════════════════════════════════════════════════

var _draftTimers = {};

/**
 * Form değişikliklerini draft olarak kaydeder (2sn debounce).
 * @param {string} formId
 * @param {Object} data
 */
function _saveDraft(formId, data) {
  try { localStorage.setItem('ak_draft_' + formId, JSON.stringify({ data: data, ts: Date.now() })); } catch(e) {}
}

/**
 * Draft varsa yükler.
 * @param {string} formId
 * @returns {Object|null}
 */
function _loadDraft(formId) {
  try {
    var raw = JSON.parse(localStorage.getItem('ak_draft_' + formId) || 'null');
    if (raw && raw.data && (Date.now() - raw.ts < 86400000)) return raw.data; // 24 saat geçerli
  } catch(e) {}
  return null;
}

/**
 * Draft temizler.
 * @param {string} formId
 */
function _clearDraft(formId) {
  try { localStorage.removeItem('ak_draft_' + formId); } catch(e) {}
}

/**
 * Form elementlerine debounced draft kayıt ekler.
 * @param {string} formId
 * @param {Function} collectFn — form verilerini toplayan fonksiyon
 */
function _initFormDraft(formId, collectFn) {
  if (_draftTimers[formId]) clearTimeout(_draftTimers[formId]);
  document.addEventListener('input', function(e) {
    var target = e.target;
    if (!target?.closest || !target.closest('[data-draft="' + formId + '"]')) return;
    if (_draftTimers[formId]) clearTimeout(_draftTimers[formId]);
    _draftTimers[formId] = setTimeout(function() {
      try { _saveDraft(formId, collectFn()); } catch(err) {}
    }, 2000);
  });
}

window._saveDraft    = _saveDraft;
window._loadDraft    = _loadDraft;
window._clearDraft   = _clearDraft;
window._initFormDraft = _initFormDraft;


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
  loadCal, saveCal, setCalInvalidator, mergeCompanyCalendar,
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
  loadKargoHistory, storeKargoHistory,
  loadKargoMasraf, storeKargoMasraf,
  loadKargoBelge, storeKargoBelge,
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
  loadOdm, storeOdm, loadTahsilat, storeTahsilat, loadSatinalma, storeSatinalma, loadCari, storeCari, loadBankalar, storeBankalar, loadNavlun, storeNavlun,
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
    'loadCal','saveCal','mergeCompanyCalendar','loadSugg','storeSugg','loadAnn','storeAnn',
    '_fsPath','_getPaths','_getTid','startRealtimeSync','stopRealtimeSync',
    'loadLinks','saveLinks','loadNotes','saveNotes','loadAct','saveAct',
    'logActivity','addNotif','loadNotifs','storeNotifs',
    'loadIk','storeIk','loadKargo','storeKargo',
    'loadKargoFirmalar','storeKargoFirmalar','loadKonteyn','storeKonteyn',
    'loadKargoChecks','storeKargoChecks','loadPirim','storePirim',
    'loadPirimParams','storePirimParams','loadStok','storeStok',
    'loadNumune','storeNumune','loadCrmData','storeCrmData',
    'loadRehber','storeRehber','loadHdf','storeHdf',
    'loadTrash','storeTrash','loadOdm','storeOdm','loadTahsilat','storeTahsilat','loadSatinalma','storeSatinalma','loadCari','storeCari','loadBankalar','storeBankalar','loadNavlun','storeNavlun',
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
