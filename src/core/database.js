/**
 * ════════════════════════════════════════
 * LOCALSTORAGE POLİTİKASI — v2.0
 * ════════════════════════════════════════
 * Hedef: Daima <%60 dolu tut.
 * Firestore gerçek veritabanı, localStorage sadece önbellek.
 *
 * YAZIM KURALLARI:
 * 1. Her store fonksiyonu limit zorunlu: d.slice(0, MAX)
 * 2. Base64 yasak — dosya = Firebase Storage URL
 * 3. Koleksiyon limitleri:
 *    trash:50  notifications:50  activity:100  kpiLog:500
 *    tasks:500 (aktif+son100done) taskChats:20msg/task
 *    odemeler:1000  tahsilat:1000  (diğerleri):200
 * 4. Yeni koleksiyon: KEYS + limit + _ALL_SYNC_COLS + store slice
 *
 * OTOMATİK KORUMA:
 * _write() → hata olunca emergency cleanup + retry
 * bgCheck 5dk → %80:notif+trash  %90:activity  %95:taskChats
 * _oneTimeStorageClean() → sayfa açılışında base64+limit temizlik
 *
 * FIRESTORE KURAL:
 * trash, notifications, activity → merge yok, FS master
 * ════════════════════════════════════════
 */

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

// ══ ACİL YER AÇMA — %90+ doluysa LZ-String olmadan bile çalışır ══
(function _immediateCleanup() {
  try {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      total += (localStorage.key(i).length + (localStorage.getItem(localStorage.key(i)) || '').length) * 2;
    }
    var pct = Math.round(total / (5 * 1024 * 1024) * 100);
    if (pct < 85) return; // yeterli yer var

    // 1) Büyük koleksiyonları agresif kes
    var trimKeys = [
      ['ak_trash1', 8], ['ak_act1', 15], ['ak_notif1', 10],
      ['ak_kpi_log1', 30], ['ak_task_chat1', null],
      ['ak_krg_history1', 20], ['ak_loj_perf1', 10],
      ['ak_update_log1', 10], ['ak_hesap1', 20],
    ];
    trimKeys.forEach(function(pair) {
      var k = pair[0], max = pair[1];
      try {
        var raw = localStorage.getItem(k);
        if (!raw || raw.length < 1000) return;
        if (max === null) { localStorage.setItem(k, '{}'); return; } // taskChats → boş obje
        var d = JSON.parse(raw);
        if (Array.isArray(d) && d.length > max) {
          localStorage.setItem(k, JSON.stringify(d.slice(-max)));
        }
      } catch(e) {}
    });

    // 2) Silinmiş kayıtları tüm koleksiyonlardan at
    ['ak_ihr_urun1','ak_satinalma1','ak_odm1','ak_tahsilat1','ak_urunler1','ak_tk2','ak_pirim1','ak_cari1'].forEach(function(k) {
      try {
        var raw = localStorage.getItem(k);
        if (!raw || raw.length < 500) return;
        var d = JSON.parse(raw);
        if (!Array.isArray(d)) return;
        var before = d.length;
        d = d.filter(function(item) { return !item.isDeleted; });
        if (d.length < before) localStorage.setItem(k, JSON.stringify(d));
      } catch(e) {}
    });

    // 3) Boş alanları tüm büyük dizilerden temizle
    ['ak_ihr_urun1','ak_satinalma1','ak_urunler1','ak_tk2'].forEach(function(k) {
      try {
        var raw = localStorage.getItem(k);
        if (!raw || raw.length < 2000) return;
        var d = JSON.parse(raw);
        if (!Array.isArray(d)) return;
        var cleaned = d.map(function(item) {
          if (!item || typeof item !== 'object') return item;
          var c = {};
          Object.keys(item).forEach(function(f) {
            var v = item[f];
            if (v === null || v === undefined || v === '' || v === 0) return;
            if (Array.isArray(v) && v.length === 0) return;
            c[f] = v;
          });
          return c;
        });
        localStorage.setItem(k, JSON.stringify(cleaned));
      } catch(e) {}
    });

    console.info('[DB] Acil temizlik tamamlandi — %' + pct + ' → yeniden hesaplanacak');
  } catch(e) { console.warn('[DB] Acil temizlik hata:', e); }
})();

// ── Versiyon ─────────────────────────────────────────────────────
const DB_VERSION = '8.3.0';

// ── Firebase Storage ─────────────────────────────────────────────
var FB_STORAGE = null;
try { if (typeof firebase !== 'undefined' && firebase.storage) FB_STORAGE = firebase.storage(); } catch (e) { /* Storage opsiyonel */ }

/** @param {File} file @param {string} path @returns {Promise<string>} download URL */
window._uploadToStorage = async function(file, path) {
  if (!FB_STORAGE) throw new Error('Storage başlatılamadı');
  var ref = FB_STORAGE.ref(path);
  await ref.put(file);
  return await ref.getDownloadURL();
};

/** @param {string} base64DataUrl @param {string} filename @param {string} folder @returns {Promise<string>} */
window._uploadBase64ToStorage = async function(base64DataUrl, filename, folder) {
  if (!FB_STORAGE) throw new Error('Storage başlatılamadı');
  var res = await fetch(base64DataUrl);
  var blob = await res.blob();
  var tid = typeof _getTid === 'function' ? _getTid() : 'default';
  var path = 'tenants/' + tid + '/' + folder + '/' + Date.now() + '_' + filename;
  var ref = FB_STORAGE.ref(path);
  await ref.put(blob);
  return await ref.getDownloadURL();
};

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
  urunler       : 'ak_urunler1',
  teklifSartlar : 'ak_teklif_sartlar1',
  fikirler      : 'ak_fikirler1',
  updateLog     : 'ak_update_log1',
  smartGoals    : 'ak_smart_goals1',
  alisTeklifleri: 'ak_alis_teklif1',
  satisTeklifleri:'ak_satis_teklif1',
  theme         : 'ak_theme',
  lang          : 'ak_lang',
  pusView       : 'ak_pus_view',
  noteView      : 'ak_nview',
  iddialar      : 'ak_iddialar1',
  ihracatOps       : 'ak_ihracat_ops1',
  ihracatDosyalar  : 'ak_ihr_dosya1',
  ihracatEvraklar  : 'ak_ihr_evrak1',
  ihracatUrunler   : 'ak_ihr_urun1',
  ihracatGcb       : 'ak_ihr_gcb1',
  ihracatBl        : 'ak_ihr_bl1',
  ihracatTemplate  : 'ak_ihr_tpl1',
  gumrukculer      : 'ak_gumrukcu1',
  forwarderlar     : 'ak_forwarder1',
  inspectionFirma  : 'ak_inspection1',
  evrakWorkflow    : 'ak_evrak_wf1',
  gcb           : 'ak_gcb1',
  alarms        : 'ak_alarms1',
  alarmLog      : 'ak_alarm_log1',
  sozler        : 'ak_sozler1',
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
    if (raw === null || raw === undefined) {
      // Safari: localStorage boşsa Firestore'dan zorla çek
      var _isSaf = typeof _isSafari !== 'undefined' ? _isSafari : /safari/i.test(navigator.userAgent);
      if (_isSaf && key.startsWith('ak_') && !window['_fsync_' + key]) {
        window['_fsync_' + key] = true;
        setTimeout(function() { window._forceSync?.(key); }, 100);
      }
      return fallback;
    }
    // LZ-String sıkıştırılmış veri kontrolü
    if (raw.startsWith('_LZ_')) {
      var _lz = typeof LZString !== 'undefined' ? LZString : (typeof window !== 'undefined' ? window.LZString : null);
      if (_lz) return JSON.parse(_lz.decompressFromUTF16(raw.slice(4)));
      return fallback; // LZ kütüphanesi yüklenmemiş
    }
    return JSON.parse(raw);
  } catch (e) {
    GlobalErrorHandler('_read:' + key, e, 'warn');
    return fallback;
  }
}

/**
 * Acil temizlik — %75 üzeri dolulukta çağrılır.
 */
function _emergencyClean() {
  try {
    var _ec = function(k, max) { try { var raw = localStorage.getItem(k); if (!raw) return; var d; if (raw.startsWith('_LZ_') && typeof LZString !== 'undefined') d = JSON.parse(LZString.decompressFromUTF16(raw.slice(4))); else d = JSON.parse(raw); if (Array.isArray(d) && d.length > max) { var trimmed = JSON.stringify(d.slice(-max)); if (typeof LZString !== 'undefined') localStorage.setItem(k, '_LZ_' + LZString.compressToUTF16(trimmed)); else localStorage.setItem(k, trimmed); } } catch(e) {} };
    _ec(KEYS.notifications, 15); _ec(KEYS.activity, 20); _ec(KEYS.trash, 15);
    _ec(KEYS.kpiLog, 50); _ec(KEYS.odemeler, 300); _ec(KEYS.tahsilat, 300);
    try { var tc = JSON.parse(localStorage.getItem(KEYS.taskChats) || '{}'); Object.keys(tc).forEach(function(t) { if (Array.isArray(tc[t]) && tc[t].length > 10) tc[t] = tc[t].slice(-10); }); localStorage.setItem(KEYS.taskChats, JSON.stringify(tc)); } catch(e) {}
    try { localStorage.setItem('ak_storage_critical', '1'); } catch(e) {}
  } catch(e) {}
}

/**
 * localStorage'a güvenli JSON yazar.
 * @param {string} key
 * @param {*}      value
 * @returns {boolean} Başarılı mı?
 */
function _write(key, value) {
  var now = new Date().toISOString();
  // taskChats base64 engeli — Firestore sync dahil tüm yazmalardan önce
  if ((key === KEYS.taskChats || key === 'ak_task_chat1') && value && typeof value === 'object' && !Array.isArray(value)) {
    try { Object.keys(value).forEach(function(k) { (value[k] || []).forEach(function(m) { if (m.file && m.file.data && typeof m.file.data === 'string' && m.file.data.startsWith('data:')) { m.file = { name: m.file.name || 'dosya', _stripped: true }; } Object.keys(m).forEach(function(f) { if (m[f] && typeof m[f] === 'string' && m[f].startsWith('data:') && m[f].length > 1000) { m[f] = '[stripped]'; } }); }); }); } catch (e) {}
  }
  // tasks base64 engeli
  if ((key === KEYS.tasks || key === 'ak_tk2') && Array.isArray(value)) {
    try { value.forEach(function(t) { ['docs', 'attachments', 'files'].forEach(function(f) { if (Array.isArray(t[f])) { t[f] = t[f].map(function(d) { if (d && d.data && typeof d.data === 'string' && d.data.startsWith('data:')) { return { name: d.name || 'dosya', url: d.url || null, _stripped: true }; } return d; }); } }); ['receipt', 'img', 'image', 'file'].forEach(function(f) { if (!t[f]) return; if (typeof t[f] === 'string' && t[f].startsWith('data:')) { t[f] = null; } else if (typeof t[f] === 'object' && t[f].data && typeof t[f].data === 'string' && t[f].data.startsWith('data:')) { t[f] = { name: t[f].name || 'dosya', size: t[f].data.length, _stripped: true }; } }); }); } catch (e) {}
  }
  // trash: originalData icindeki base64'leri temizle
  if (key === KEYS.trash && Array.isArray(value)) {
    try { value = value.map(function(item) {
      if (!item || !item.originalData || typeof item.originalData !== 'object') return item;
      var od = Object.assign({}, item.originalData); var dirty = false;
      ['file','receipt','img','image'].forEach(function(f) {
        if (!od[f]) return;
        if (typeof od[f] === 'string' && od[f].startsWith('data:')) { od[f] = { _stripped: true, size: od[f].length }; dirty = true; }
        else if (typeof od[f] === 'object' && od[f].data && typeof od[f].data === 'string' && od[f].data.startsWith('data:')) { od[f] = { name: od[f].name || 'dosya', size: od[f].data.length, _stripped: true }; dirty = true; }
      });
      ['docs','attachments','files','belgeler'].forEach(function(arr) {
        if (!Array.isArray(od[arr])) return;
        od[arr] = od[arr].map(function(d) {
          if (d && d.data && typeof d.data === 'string' && d.data.length > 1000) { dirty = true; return { name: d.name || 'dosya', ts: d.ts, url: d.url || null, size: d.data.length, _stripped: true }; }
          return d;
        });
      });
      return dirty ? Object.assign({}, item, { originalData: od }) : item;
    }); } catch(e) {}
  }
  // Son güncelleme zamanını kaydet
  try { localStorage.setItem('ak_db_last_write', now); } catch(e) {}
  // Array verilerinde updatedAt — henüz yoksa ilk kez ata
  // Değiştirilen kayıtlar kendi updatedAt'lerini store fonksiyonunda güncellemeli
  if (Array.isArray(value)) {
    value.forEach(function(item) {
      if (item && typeof item === 'object' && (item.id || item._id)) {
        if (!item.updatedAt) item.updatedAt = now;
      }
    });
  }
  // base64 veriyi localStorage'a yazmadan temizle
  if (Array.isArray(value)) {
    value = value.map(function(item) {
      if (!item || typeof item !== 'object') return item;
      var clean = Object.assign({}, item);
      ['file','receipt','img','image'].forEach(function(f) {
        if (clean[f] && typeof clean[f] === 'string' && clean[f].startsWith('data:')) {
          clean[f] = { _placeholder: true, name: 'Dosya (Storage)', size: clean[f].length };
        }
        if (clean[f] && clean[f].data && typeof clean[f].data === 'string' && clean[f].data.startsWith('data:')) {
          clean[f] = { name: clean[f].name || 'dosya', size: clean[f].data.length, _placeholder: true };
        }
      });
      // docs array içindeki base64'leri temizle (url olsun olmasın)
      if (Array.isArray(clean.docs)) {
        clean.docs = clean.docs.map(function(d) {
          if (d && d.data && typeof d.data === 'string' && d.data.length > 1000) {
            return { name: d.name || 'dosya', ts: d.ts, url: d.url || null, _stripped: true };
          }
          return d;
        });
      }
      return clean;
    });
  }
  // Boş alan temizliği — null/undefined/'' alanları sil (%30-40 tasarruf)
  if (Array.isArray(value)) {
    value = value.map(function(item) {
      if (!item || typeof item !== 'object') return item;
      var clean = {};
      Object.keys(item).forEach(function(k) {
        var v = item[k];
        if (v === null || v === undefined || v === '' || v === 0) return; // boşları atla
        if (Array.isArray(v) && v.length === 0) return; // boş dizileri atla
        clean[k] = v;
      });
      return clean;
    });
  }
  // LZ-String sıkıştırma (%60-80 tasarruf)
  var _lz = typeof LZString !== 'undefined' ? LZString : (typeof window !== 'undefined' ? window.LZString : null);
  var _jsonStr = JSON.stringify(value);
  try {
    if (_lz && key.startsWith('ak_') && _jsonStr.length > 500) {
      localStorage.setItem(key, '_LZ_' + _lz.compressToUTF16(_jsonStr));
    } else {
      localStorage.setItem(key, _jsonStr);
    }
    return true;
  } catch (e) {
    // Emergency: büyük koleksiyonları küçült
    try {
      var _ec2 = function(k2, mx) { try { var raw2 = localStorage.getItem(k2); if (!raw2) return; var d2 = raw2.startsWith('_LZ_') && _lz ? JSON.parse(_lz.decompressFromUTF16(raw2.slice(4))) : JSON.parse(raw2); if (Array.isArray(d2) && d2.length > mx) { var trimmed = JSON.stringify(d2.slice(-mx)); localStorage.setItem(k2, _lz ? '_LZ_' + _lz.compressToUTF16(trimmed) : trimmed); } } catch(e5) {} };
      _ec2(KEYS.notifications, 15); _ec2(KEYS.activity, 20); _ec2(KEYS.trash, 15);
      _ec2(KEYS.kpiLog, 50); _ec2(KEYS.taskChats, '{}');
    } catch (e2) {}
    // Retry
    try {
      if (_lz && key.startsWith('ak_')) {
        localStorage.setItem(key, '_LZ_' + _lz.compressToUTF16(_jsonStr));
      } else {
        localStorage.setItem(key, _jsonStr);
      }
      return true;
    } catch (e3) {
      GlobalErrorHandler('_write:' + key, e3, 'err');
      window.toast?.('Depolama dolu', 'err');
      return false;
    }
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
  try {
    // FIX: _read() kullan — LZ-String sıkıştırılmış veriyi de çözer
    localData = _read(localKey, []);
  } catch(e) { localData = []; }
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
      // Daha güncel olanı seç (updatedAt > ts > syncedAt karşılaştır)
      var fsTs = item.updatedAt || item.ts || item.syncedAt || '';
      var localTs = existing.updatedAt || existing.ts || existing.syncedAt || '';
      if (fsTs >= localTs) {
        mergedMap[key] = item;
      }
      // isDeleted propagation: silinen taraf daha yeniyse silinmiş ver kazanır
      if (item.isDeleted && fsTs >= localTs) mergedMap[key] = item;
      if (existing.isDeleted && localTs >= fsTs) mergedMap[key] = existing;
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

/** FIX 4: Otomatik çöp kutusu temizliği — 30 günü dolan kayıtlar */
(function _autoCleanTrash() {
  setTimeout(function() {
    try {
      var trash = _read(KEYS.trash);
      if (!Array.isArray(trash) || !trash.length) return;
      var now = new Date();
      var before = trash.length;
      trash = trash.filter(function(item) {
        if (!item.expiresAt) return true;
        return new Date(item.expiresAt) > now;
      });
      if (trash.length < before) {
        var silinen = before - trash.length;
        _write(KEYS.trash, trash);
        var _fp = _fsPath('trash'); if (_fp) _syncFirestore(_fp, trash);
        console.info('[DB] Çöp kutusu otomatik temizlik:', silinen, 'kayıt silindi');
        if (window.isAdmin?.()) {
          window.addNotif?.('🗑', silinen + ' kayıt çöp kutusundan otomatik silindi (30 gün doldu)', 'info', 'system');
        }
      }
    } catch(e) {}
  }, 6000);
})();

/** Mevcut LS'deki base64 siskinligini tek seferlik temizle */
(function _oneTimeBase64Cleanup() {
  var _DONE_KEY = 'ak_b64clean_v3';
  if (localStorage.getItem(_DONE_KEY)) return;
  setTimeout(function() {
    try {
      var changed = false;
      // 1) Tasks — file field object format
      var tasks = JSON.parse(localStorage.getItem('ak_tk2') || '[]');
      tasks.forEach(function(t) {
        ['receipt','img','image','file'].forEach(function(f) {
          if (!t[f]) return;
          if (typeof t[f] === 'string' && t[f].startsWith('data:')) { t[f] = null; changed = true; }
          else if (typeof t[f] === 'object' && t[f].data && typeof t[f].data === 'string' && t[f].data.startsWith('data:')) { t[f] = { name: t[f].name || 'dosya', size: t[f].data.length, _stripped: true }; changed = true; }
        });
      });
      if (changed) { localStorage.setItem('ak_tk2', JSON.stringify(tasks)); changed = false; }
      // 2) Trash — originalData nested base64
      var trash = JSON.parse(localStorage.getItem('ak_trash1') || '[]');
      trash = trash.map(function(item) {
        if (!item || !item.originalData || typeof item.originalData !== 'object') return item;
        var od = Object.assign({}, item.originalData); var dirty = false;
        ['file','receipt','img','image'].forEach(function(f) {
          if (!od[f]) return;
          if (typeof od[f] === 'string' && od[f].startsWith('data:')) { od[f] = { _stripped: true, size: od[f].length }; dirty = true; }
          else if (typeof od[f] === 'object' && od[f].data && typeof od[f].data === 'string' && od[f].data.startsWith('data:')) { od[f] = { name: od[f].name || 'dosya', size: od[f].data.length, _stripped: true }; dirty = true; }
        });
        ['docs','attachments','files','belgeler'].forEach(function(arr) {
          if (!Array.isArray(od[arr])) return;
          od[arr] = od[arr].map(function(d) {
            if (d && d.data && typeof d.data === 'string' && d.data.length > 1000) { dirty = true; return { name: d.name || 'dosya', ts: d.ts, url: d.url || null, size: d.data.length, _stripped: true }; }
            return d;
          });
        });
        if (!dirty) return item;
        changed = true;
        return Object.assign({}, item, { originalData: od });
      });
      if (changed) { localStorage.setItem('ak_trash1', JSON.stringify(trash)); }
      // 3) Ihracat urunleri — silinmis olanlari skeleton'a indir
      try {
        var ihrUrun = JSON.parse(localStorage.getItem('ak_ihr_urun1') || '[]');
        var ihrTemiz = ihrUrun.map(function(u) {
          if (!u.isDeleted) return u;
          return { id: u.id, isDeleted: true, deletedAt: u.deletedAt || null, dosya_id: u.dosya_id || null };
        });
        localStorage.setItem('ak_ihr_urun1', JSON.stringify(ihrTemiz));
        changed = true;
      } catch(e3) { console.warn('[DB] ihracat cleanup hata:', e3); }
      // 4) Tum ak_ key'lerini LZ-String ile sikistir
      var _lzM = typeof LZString !== 'undefined' ? LZString : null;
      if (_lzM) {
        var _before = 0;
        for (var _mi = 0; _mi < localStorage.length; _mi++) {
          var _mk = localStorage.key(_mi);
          _before += (localStorage.getItem(_mk) || '').length;
        }
        for (var _mi2 = 0; _mi2 < localStorage.length; _mi2++) {
          var _mk2 = localStorage.key(_mi2);
          if (!_mk2 || !_mk2.startsWith('ak_')) continue;
          var _mv = localStorage.getItem(_mk2);
          if (!_mv || _mv.startsWith('_LZ_') || _mv.length < 500) continue;
          try {
            JSON.parse(_mv); // JSON olduğunu doğrula
            localStorage.setItem(_mk2, '_LZ_' + _lzM.compressToUTF16(_mv));
          } catch(e4) {} // JSON değilse atla
        }
        var _afterM = 0;
        for (var _mi3 = 0; _mi3 < localStorage.length; _mi3++) {
          var _mk3 = localStorage.key(_mi3);
          _afterM += (localStorage.getItem(_mk3) || '').length;
        }
        var _saved = Math.round((_before - _afterM) / 1024);
        console.info('[DB] LZ-String migration: ' + _saved + 'KB tasarruf');
      }
      localStorage.setItem(_DONE_KEY, '1');
      var after = 0;
      for (var _ai = 0; _ai < localStorage.length; _ai++) { after += (localStorage.getItem(localStorage.key(_ai)) || '').length; }
      after = after / 1024 / 1024;
      console.info('[DB] cleanup tamamlandi. LS: ' + after.toFixed(2) + 'MB');
      if (window.isAdmin?.()) { window.toast?.('LS: ' + after.toFixed(2) + 'MB', 'ok'); }
    } catch(e) { console.warn('[DB] base64 cleanup hata:', e); }
  }, 8000);
})();

/**
 * Tüm senkronize edilen koleksiyon adları.
 * _syncFirestore ve _startBgSyncCheck bu listeyi kullanır.
 */
var _ALL_SYNC_COLS = [
  'users','tasks','calendar','announcements',
  'kargo','stok','crm','ik','izin','pirim',
  'hedefler','odemeler','tahsilat','satinalma','cari',
  'konteyner','evrak','etkinlik','numune','resmiEvrak','arsivBelgeler',
  'greetings','puan','activity','kpi','notes','tebligat',
  'bankalar','navlun','urunler','fikirler',
  'alisTeklifleri','satisTeklifleri','teklifSartlar','ihracatOps',
  'updateLog','trash','kararlar','suggestions','links','smartGoals',
  'taskChats','notifications','iddialar','sozler','gcb',
  'ihracatDosyalar','ihracatEvraklar','ihracatUrunler',
  'ihracatGcb','ihracatBl','ihracatTemplate',
  'gumrukculer','forwarderlar','evrakWorkflow'
];

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
    var syncedAt = new Date().toISOString();
    _writingNow[collection] = { expiry: Date.now() + 5000, syncedAt: syncedAt };
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
    // P1: onSnapshot'ın kendi yazmamızı geri okumasını engelle
    // syncedAt tabanlı — echo tespiti sabit süre yerine exact match ile yapılır
    _writingNow[collection] = { expiry: Date.now() + 5000, syncedAt: syncedAt };
    // localStorage'a timestamp kaydet
    try { localStorage.setItem(collection + '_ts', syncedAt); } catch(e) {}
    // Verbose log yalnızca debug modda
    if (localStorage.getItem('ak_debug')) console.log('[FS:W]', path, Array.isArray(data) ? data.length : typeof data);
    // Kritik koleksiyonlar Safari doğrulamalı yazma kullanır
    // Tüm SYNC_MAP koleksiyonları doğrulamalı yazma kapsamında
    var _useCritical = !!KEYS[collection] || _ALL_SYNC_COLS.indexOf(collection) !== -1;

    if (mode === 'set') {
      // trash, notifications, activity → merge yok, direkt üzerine yaz
      var _noMergeCols = ['trash', 'notifications', 'activity'];
      if (Array.isArray(data) && _noMergeCols.indexOf(collection) !== -1) {
        var _nmPayload = { data: data, syncedAt: syncedAt };
        if (_useCritical && _isSafari) { _verifiedWrite(path, data); }
        else { FB_DB.doc(path).set(_nmPayload).then(function() { if (_useCritical) _setSyncStatus('ok'); }).catch(function(e) { if (_useCritical) _setSyncStatus('error', collection + ': ' + e.message); }); }
        return;
      }
      // Önce mevcut Firestore verisini oku, merge et, sonra yaz (veri kaybı önleme)
      if (Array.isArray(data)) {
        FB_DB.doc(path).get().then(function(snap) {
          var fsExisting = snap.exists ? snap.data()?.data : null;
          // Kopyasını al — orijinal data dizisini mutate etme
          var finalData = data.slice();
          if (Array.isArray(fsExisting) && fsExisting.length > 0) {
            // Mevcut FS verisi ile local veriyi ID bazlı birleştir
            var idSet = {};
            finalData.forEach(function(item) { var k = item.id || item._id; if (k) idSet[k] = true; });
            // FS'de olup local'de olmayan kayıtları ekle (silinmiş olarak işaretlenmemişse)
            fsExisting.forEach(function(item) {
              var key = item.id || item._id;
              if (key && !idSet[key] && !item.isDeleted) {
                finalData.push(item);
                console.info('[DB:sync-merge] FS kayıt korundu:', collection, key);
              }
            });
            // Merge sonucunu localStorage'a da yaz — LZ-String uyumlu
            try {
              var _lzM2 = typeof LZString !== 'undefined' ? LZString : null;
              var _lsKey2 = KEYS[collection] || ('ak_' + collection);
              var _jsonM2 = JSON.stringify(finalData);
              if (_lzM2 && _lsKey2.startsWith('ak_') && _jsonM2.length > 500) {
                localStorage.setItem(_lsKey2, '_LZ_' + _lzM2.compressToUTF16(_jsonM2));
              } else {
                localStorage.setItem(_lsKey2, _jsonM2);
              }
            } catch(e2) {}
          }
          // Kritik koleksiyon + Safari → doğrulamalı yazma
          if (_useCritical && _isSafari) {
            _verifiedWrite(path, finalData);
          } else {
            var finalPayload = { data: finalData, syncedAt: syncedAt };
            FB_DB.doc(path).set(finalPayload, { merge: true })
              .then(function() {
                if (_useCritical) _setSyncStatus('ok');
              })
              .catch(function(e) {
                if (_useCritical) _setSyncStatus('error', collection + ': ' + e.message);
                GlobalErrorHandler('_syncFirestore:' + path, e, 'warn');
              });
          }
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

    // 1) autoCreated kullanıcıları ANINDA sil — bunlar hatalı oluşturulmuş duplikatlardır
    var _beforeLen = d.length;
    d = d.filter(function(u) {
      if (u.autoCreated) {
        console.warn('[DB] autoCreated kullanıcı silindi:', u.email, 'id:', u.id, 'role:', u.role);
        return false;
      }
      return true;
    });
    if (d.length !== _beforeLen) _fixed = true;

    // 2) DEFAULT_USERS'taki admin HER ZAMAN status:'active', role:'admin'
    DEFAULT_USERS.forEach(function(def) {
      if (def.role !== 'admin') return;
      var match = d.find(function(u) {
        return u.id === def.id || (u.email && u.email.toLowerCase() === def.email.toLowerCase());
      });
      if (match) {
        if (match.status !== 'active' || match.role !== 'admin') {
          console.warn('[DB] Admin kurtarıldı:', match.email, 'status:', match.status, '→ active, role:', match.role, '→ admin');
          match.status = 'active';
          match.role = 'admin';
          match.access = def.access;
          delete match.isDeleted;
          delete match._fbSyncNote;
          delete match._fbSyncAt;
          _fixed = true;
        }
      } else {
        // Admin hiç yoksa DEFAULT'tan ekle
        console.warn('[DB] Admin kaydı yoktu — DEFAULT\'tan ekleniyor:', def.email);
        d.unshift(JSON.parse(JSON.stringify(def)));
        _fixed = true;
      }
    });

    // Düzeltme yapıldıysa localStorage + Firestore'a yaz
    if (_fixed) {
      try { localStorage.setItem(KEYS.users, JSON.stringify(d)); } catch(e) {}
      // Firestore'a da zorla yaz — onSnapshot'ın bozuk veriyi geri getirmesini engelle
      try {
        var _fb = window.Auth?.getFBDB?.();
        if (_fb) {
          var _tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
          _fb.collection('duay_' + _tid).doc('users').set({ data: d, syncedAt: new Date().toISOString() }, { merge: true });
          console.warn('[DB] Düzeltilmiş kullanıcı listesi Firestore\'a yazıldı');
        }
      } catch(e2) {}
      console.warn('[DB] Kullanıcı listesi düzeltildi:', d.length, 'kullanıcı');
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
function saveTasks(d)      { var _now2 = new Date().toISOString(); d = d.map(function(t) { if (!t.updatedAt) t.updatedAt = _now2; return t; }); if (d.length > 500) { var _active = d.filter(function(t) { return !t.isDeleted && t.status !== 'done'; }); var _done = d.filter(function(t) { return t.status === 'done' && !t.isDeleted; }).slice(-100); var _del = d.filter(function(t) { return t.isDeleted; }).slice(-50); d = _active.concat(_done, _del); } _write(KEYS.tasks, d);
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
/** @param {Array<Object>} d Son 100 kayıt saklanır */ function saveAct(d) { _write(KEYS.activity, d.slice(0, 100));
  var _fp = _fsPath('activity'); if (_fp) _syncFirestore(_fp, d.slice(0, 100));
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
/** @param {Array<Object>} d Son 50 kayıt */ function storeNotifs(d) {
  var sliced = d.slice(0, 50);
  _write(KEYS.notifications, sliced);
  // Notifications sync — debounced (500ms) to prevent rapid-fire writes
  clearTimeout(storeNotifs._timer);
  storeNotifs._timer = setTimeout(function() {
    if (window.Auth?.getFBAuth?.()?.currentUser) {
      var _fp_notifs = _fsPath('notifications'); if (_fp_notifs) _syncFirestore(_fp_notifs, sliced);
    }
  }, 500);
}

/**
 * Bildirim ekler ve rozeti günceller.
 * @param {string} icon   Emoji
 * @param {string} msg    Bildirim metni
 * @param {string} [type='info'] 'info' | 'warn' | 'ok' | 'err'
 * @param {string} [link='']    Tıklandığında gidilecek panel
 * @param {number|string|null} [targetUid=null] Hedef kullanıcı ID
 * @param {number|null} [taskId=null] İlişkili görev ID — tıklanınca direkt görev açılır
 */
function addNotif(icon, msg, type = 'info', link = '', targetUid = null, taskId = null) {
  const d = loadNotifs();
  d.unshift({ id: generateNumericId(), icon, msg, type, link, ts: nowTs(), read: false, targetUid: targetUid || null, taskId: taskId || null });
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

/** @returns {Array<Object>} */ function loadKargo()         { const d = _read(KEYS.kargo); const arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array<Object>} d */ function storeKargo(d)       { _write(KEYS.kargo, d); 
  const _fp_kargo = _fsPath('kargo'); if (_fp_kargo) _syncFirestore(_fp_kargo, d);
}

/** @returns {Array<string>} */ function loadKargoFirmalar() { const d = _read(KEYS.kargoFirms); return (Array.isArray(d) && d.length) ? d : DEFAULT_KARGO_FIRMALAR; }
/** @param {Array<string>} d */ function storeKargoFirmalar(d) { _write(KEYS.kargoFirms, d); var _fp = _fsPath('kargoFirms'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Array<Object>} */ function loadKonteyn()       { const d = _read(KEYS.konteyner);  return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeKonteyn(d)     { _write(KEYS.konteyner, d);
  var _fp = _fsPath('konteyner'); if (_fp) _syncFirestore(_fp, d);
}

/** @returns {Object}        */ function loadKargoHistory()  { const d = _read(KEYS.kargoHistory);  return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoHistory(d) { _write(KEYS.kargoHistory, d); var _fp = _fsPath('kargoHistory'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Object}        */ function loadKargoMasraf()   { const d = _read(KEYS.kargoMasraf);   return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoMasraf(d) { _write(KEYS.kargoMasraf, d); var _fp = _fsPath('kargoMasraf'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Object}        */ function loadKargoBelge()    { const d = _read(KEYS.kargoBelge);    return (d && typeof d==='object') ? d : {}; }
/** @param  {Object} d       */ function storeKargoBelge(d)  { _write(KEYS.kargoBelge, d); var _fp = _fsPath('kargoBelge'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Object}        */ function loadKargoChecks()   { const d = _read(KEYS.kargoChecks); return (d && typeof d === 'object') ? d : {}; }
/** @param {Object} d        */ function storeKargoChecks(d) { _write(KEYS.kargoChecks, d); var _fp = _fsPath('kargoChecks'); if (_fp) _syncFirestore(_fp, d); }

// İhracat Operasyon
/** @returns {Array<Object>} */ function loadIhracatOps()   { const d = _read(KEYS.ihracatOps); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeIhracatOps(d) { _write(KEYS.ihracatOps, d); const _fp = _fsPath('ihracatOps'); if (_fp) _syncFirestore(_fp, d); }

// İhracat V2 koleksiyonları
function loadIhracatDosyalar()  { var d = _read(KEYS.ihracatDosyalar); var arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
function storeIhracatDosyalar(d){ _write(KEYS.ihracatDosyalar, d.slice(0,200)); var fp = _fsPath('ihracatDosyalar'); if (fp) _syncFirestore(fp, d); }
function loadIhracatEvraklar()  { var d = _read(KEYS.ihracatEvraklar); return Array.isArray(d) ? d : []; }
function storeIhracatEvraklar(d){ _write(KEYS.ihracatEvraklar, d.slice(0,500)); var fp = _fsPath('ihracatEvraklar'); if (fp) _syncFirestore(fp, d); }
function loadIhracatUrunler()   { var d = _read(KEYS.ihracatUrunler); return Array.isArray(d) ? d : []; }
function storeIhracatUrunler(d) {
  var yazilacak = d.map(function(u) {
    if (!u.isDeleted) return u;
    return { id: u.id, isDeleted: true, deletedAt: u.deletedAt || null, dosya_id: u.dosya_id || null };
  });
  _write(KEYS.ihracatUrunler, yazilacak.slice(0, 1000));
  var fp = _fsPath('ihracatUrunler'); if (fp) _syncFirestore(fp, yazilacak);
}
function loadIhracatGcb()       { var d = _read(KEYS.ihracatGcb); return Array.isArray(d) ? d : []; }
function storeIhracatGcb(d)     { _write(KEYS.ihracatGcb, d.slice(0,200)); var fp = _fsPath('ihracatGcb'); if (fp) _syncFirestore(fp, d); }
function loadIhracatBl()        { var d = _read(KEYS.ihracatBl); return Array.isArray(d) ? d : []; }
function storeIhracatBl(d)      { _write(KEYS.ihracatBl, d.slice(0,200)); var fp = _fsPath('ihracatBl'); if (fp) _syncFirestore(fp, d); }
function loadIhracatTemplate()  { var d = _read(KEYS.ihracatTemplate); return Array.isArray(d) ? d : []; }
function storeIhracatTemplate(d){ _write(KEYS.ihracatTemplate, d.slice(0,100)); var fp = _fsPath('ihracatTemplate'); if (fp) _syncFirestore(fp, d); }
function loadGumrukculer()      { var d = _read(KEYS.gumrukculer); return Array.isArray(d) ? d : []; }
function storeGumrukculer(d)    { _write(KEYS.gumrukculer, d.slice(0,50)); var fp = _fsPath('gumrukculer'); if (fp) _syncFirestore(fp, d); }
function loadForwarderlar()     { var d = _read(KEYS.forwarderlar); return Array.isArray(d) ? d : []; }
function storeForwarderlar(d)   { _write(KEYS.forwarderlar, d.slice(0,50)); var fp = _fsPath('forwarderlar'); if (fp) _syncFirestore(fp, d); }
function loadEvrakWorkflow()    { var d = _read(KEYS.evrakWorkflow); return Array.isArray(d) ? d : []; }
function storeEvrakWorkflow(d)  { _write(KEYS.evrakWorkflow, d.slice(0,500)); var fp = _fsPath('evrakWorkflow'); if (fp) _syncFirestore(fp, d); }

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

/** @returns {Array<Object>} */ function loadPirim()          { const d = _read(KEYS.pirim); const arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array<Object>} d */ function storePirim(d)        { _write(KEYS.pirim, d); 
  const _fp_pirim = _fsPath('pirim'); if (_fp_pirim) _syncFirestore(_fp_pirim, d);
}

/** @returns {Array<Object>} */ function loadPirimParams()    { const d = _read(KEYS.pirimParams); return (Array.isArray(d) && d.length) ? d : DEFAULT_PIRIM_PARAMS; }
/** @param {Array<Object>} d */ function storePirimParams(d)  { _write(KEYS.pirimParams, d); var _fp = _fsPath('pirimParams'); if (_fp) _syncFirestore(_fp, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — STOK & NUMUNE
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadStok()    { const d = _read(KEYS.stok);   return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeStok(d)  { var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.stok, d); 
  const _fp_stok = _fsPath('stok'); if (_fp_stok) _syncFirestore(_fp_stok, d);
}

const DEFAULT_NUMUNE = [
  { id: 1, dir: 'giris', name: 'Model A Kumaş Numunesi', code: 'NM-001', qty: 3, date: '2026-03-10', uid: 2, iadeDate: '2026-04-10', returned: false, note: 'Müşteriye gösterim için', img: null },
  { id: 2, dir: 'cikis', name: 'Renk Kartı Seti',         code: 'NM-002', qty: 1, date: '2026-03-15', uid: 3, iadeDate: '2026-03-30', returned: false, note: 'Fuar için çıkartıldı',  img: null },
];
/** @returns {Array<Object>} */ function loadNumune()  { const d = _read(KEYS.numune); const arr = Array.isArray(d) ? d : DEFAULT_NUMUNE; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array<Object>} d */ function storeNumune(d){ var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.numune, d); 
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
/** @param {Array<Object>} d */ function storeCrmData(d)  { var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.crm, d); 
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
/** @param {Array<Object>} d Son 50 kayıt */ function storeTrash(d) { _write(KEYS.trash, d.slice(0, 50)); var _fp = _fsPath('trash'); if (_fp) _syncFirestore(_fp, d.slice(0, 50)); }
/**
 * Silinen kaydı çöp kutusuna ekler.
 * @param {Object} item Orijinal kayıt
 * @param {string} moduleName Modül adı (Ödeme, Görev, Cari, Ürün vb.)
 * @param {string} collection Orijinal koleksiyon adı
 */
function addToTrash(item, moduleName, collection) {
  if (!item) return;
  var cu = window.Auth?.getCU?.();
  var now = new Date();
  var expires = new Date(now.getTime() + 30 * 86400000);
  var trash = loadTrash();
  trash.unshift({
    id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(),
    originalId: item.id || item._id,
    originalCollection: collection || '',
    originalData: JSON.parse(JSON.stringify(item)),
    name: item.name || item.title || item.teklifNo || item.urunAdi || item.piNo || '—',
    moduleName: moduleName || 'Bilinmeyen',
    deletedBy: cu?.id,
    deletedByName: cu?.name || '—',
    deletedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  storeTrash(trash);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16 — RUTİN ÖDEMELER
// ════════════════════════════════════════════════════════════════

/** @returns {Array<Object>} */ function loadOdm()     { const d = _read(KEYS.odemeler); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeOdm(d)   { var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); if(d.length>1000){d=d.filter(function(o){return !o.isDeleted;}).slice(-1000);} _write(KEYS.odemeler, d);
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
  var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.tahsilat, d);
  var _fp_tahsilat = _fsPath('tahsilat');
  if (_fp_tahsilat) _syncFirestore(_fp_tahsilat, d);
}
/** @returns {Array<Object>} */ function loadSatinalma() { const d = _read(KEYS.satinalma); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeSatinalma(d) { _write(KEYS.satinalma, d);
  var _fp = _fsPath('satinalma'); if (_fp) _syncFirestore(_fp, d);
}
/** @returns {Array<Object>} */ function loadCari() { const d = _read(KEYS.cari); const arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array<Object>} d */ function storeCari(d) { var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.cari, d);
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
/** @param {Array<Object>} d */ function storeNavlun(d) { var _now2=new Date().toISOString(); d=d.map(function(t){if(!t.updatedAt)t.updatedAt=_now2;return t;}); _write(KEYS.navlun, d);
  var _fp = _fsPath('navlun'); if (_fp) _syncFirestore(_fp, d);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 16D — ÜRÜNLER / ALIŞ TEKLİF / SATIŞ TEKLİF
// ════════════════════════════════════════════════════════════════
/** @returns {Array} */ function loadUrunler() { var d = _read(KEYS.urunler); var arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array} d */ function storeUrunler(d) { _write(KEYS.urunler, d); var _fp = _fsPath('urunler'); if (_fp) _syncFirestore(_fp, d); }
/** @returns {Array} */ function loadAlisTeklifleri() { var d = _read(KEYS.alisTeklifleri); return Array.isArray(d) ? d : []; }
/** @param {Array} d */ function storeAlisTeklifleri(d) { _write(KEYS.alisTeklifleri, d); var _fp = _fsPath('alisTeklifleri'); if (_fp) _syncFirestore(_fp, d); }
/** @returns {Array} */ function loadSatisTeklifleri() { var d = _read(KEYS.satisTeklifleri); var arr = Array.isArray(d) ? d : []; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }).filter(function(k) { return !k.isDeleted; }); }
/** @param {Array} d */ function storeSatisTeklifleri(d) { _write(KEYS.satisTeklifleri, d); var _fp = _fsPath('satisTeklifleri'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Array} */ function loadFikirler() { var d = _read(KEYS.fikirler); return Array.isArray(d) ? d : []; }
/** @param {Array} d */ function storeFikirler(d) { _write(KEYS.fikirler, d); var _fp = _fsPath('fikirler'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Array} */ function loadIddialar() { var d = _read(KEYS.iddialar); return Array.isArray(d) ? d : []; }
/** @param {Array} d */ function storeIddialar(d) { _write(KEYS.iddialar, d); var _fp = _fsPath('iddialar'); if (_fp) _syncFirestore(_fp, d); }

/** @returns {Array} */ function loadTeklifSartlar() { var d = _read(KEYS.teklifSartlar); return Array.isArray(d) ? d : []; }
/** @param {Array} d */ function storeTeklifSartlar(d) { _write(KEYS.teklifSartlar, d); var _fp = _fsPath('teklifSartlar'); if (_fp) _syncFirestore(_fp, d); }
/** @returns {Array} */ function loadUpdateLog() { var d = _read(KEYS.updateLog); return Array.isArray(d) ? d : []; }
/** @param {Array} d */ function storeUpdateLog(d) { _write(KEYS.updateLog, d); var _fp = _fsPath('updateLog'); if (_fp) _syncFirestore(_fp, d); }
/** @returns {Array<Object>} */ function loadSmartGoals() { var d = _read(KEYS.smartGoals); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeSmartGoals(d) { _write(KEYS.smartGoals, d); var _fp = _fsPath('smartGoals'); if (_fp) _syncFirestore(_fp, d); }

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
/** @param {Array<Object>} d */ function storeTemizlik(d) { _write(KEYS.temizlik, d); var _fp = _fsPath('temizlik'); if (_fp) _syncFirestore(_fp, d); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 20 — KPI & PERFORMANS
// ════════════════════════════════════════════════════════════════

const DEFAULT_KPI = [
  { id: 1, title: 'Aylık Satış Hedefi', current: 380000, target: 500000, unit: '₺', period: 'Mart 2026' },
  { id: 2, title: 'Müşteri Memnuniyeti', current: 87,   target: 95,     unit: '%', period: 'Mart 2026' },
];
/** @returns {Array<Object>} */ function loadKpi()         { const d = _read(KEYS.kpi); const arr = Array.isArray(d) ? d : DEFAULT_KPI; return arr.map(function(k) { return window._migrateRecord ? window._migrateRecord(k) : k; }); }
/** @param {Array<Object>} d */ function storeKpi(d)       { _write(KEYS.kpi, d); 
  const _fp_kpi = _fsPath('kpi'); if (_fp_kpi) _syncFirestore(_fp_kpi, d);
}

/** @returns {Array<Object>} */ function loadKpiLog()      { const d = _read(KEYS.kpiLog); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d Son 500 kayıt */ function storeKpiLog(d) { _write(KEYS.kpiLog, d.slice(0, 500)); var _fp = _fsPath('kpiLog'); if (_fp) _syncFirestore(_fp, d.slice(0, 500)); }

/** @returns {Array<Object>} */ function loadKarar()       { const d = _read(KEYS.kararlar); return Array.isArray(d) ? d : []; }
/** @param {Array<Object>} d */ function storeKarar(d)     { _write(KEYS.kararlar, d); var _fp = _fsPath('kararlar'); if (_fp) _syncFirestore(_fp, d); }

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
/** @param {Array<Object>} d */ function storeDolaplar(d)      { _write(KEYS.arsivDolaplar, d); var _fp = _fsPath('arsivDolaplar'); if (_fp) _syncFirestore(_fp, d); }

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
/** @param {Object} d       */ function storeTaskChats(d) { if(d&&typeof d==='object'){Object.keys(d).forEach(function(k){if(Array.isArray(d[k])&&d[k].length>20)d[k]=d[k].slice(-20);});} _write(KEYS.taskChats, d);
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
 * syncedAt değeri saklanır — echo tespiti timestamp karşılaştırmasıyla yapılır.
 * @type {Object.<string, {expiry: number, syncedAt: string}>}
 */
const _writingNow = {};

/**
 * onSnapshot throttle — koleksiyon başına son işlem zamanı.
 * Aynı koleksiyon için saniyede max 1 işlem yapılır.
 * @type {Object.<string, number>}
 */
const _lastSnapshotProcess = {};

/**
 * Veri hash cache — aynı veri tekrar gelirse skip et.
 * @type {Object.<string, string>}
 */
const _lastDataHash = {};

/** Double-call guard — startRealtimeSync birden fazla çağrılmasını engeller */
var _syncStarted = {};

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
    if (localStorage.getItem('ak_debug')) console.log('[LISTEN]', collection, '→', _base2 + '/' + collection);
    // Anlık ilk çekme — Firestore + localStorage merge (veri kaybı önleme)
    docRef.get().then(snap => {
      if (!snap.exists) return;
      const fsData = snap.data()?.data;
      if (fsData === null || fsData === undefined) return;
      var merged = _mergeDataSets(localKey, fsData, collection);
      _stripBase64BeforeWrite(localKey, merged);
      try {
        var _lzInit = typeof LZString !== 'undefined' ? LZString : null;
        var _jsonInit = JSON.stringify(merged);
        if (_lzInit && localKey.startsWith('ak_') && _jsonInit.length > 500) {
          localStorage.setItem(localKey, '_LZ_' + _lzInit.compressToUTF16(_jsonInit));
        } else {
          localStorage.setItem(localKey, _jsonInit);
        }
        localStorage.setItem(localKey + '_ts', snap.data()?.syncedAt || new Date().toISOString());
      } catch(e) {}
      // FIX: Init merge sonrası cache invalidate
      try { if (typeof window.invalidateCacheForCollection === 'function') window.invalidateCacheForCollection(collection); } catch(e) {}
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
        return;
      }
      // P1: Kendi yazmamızdan gelen echo'yu atla — syncedAt bazlı exact match
      var _wn = _writingNow[collection];
      if (_wn) {
        var _snapSyncedAt = snap.data()?.syncedAt || '';
        // syncedAt eşleşiyorsa bu bizim kendi yazmamız (echo) — atla
        if (_snapSyncedAt && _snapSyncedAt === _wn.syncedAt) {
          delete _writingNow[collection];
          return;
        }
        // Süre henüz dolmadıysa ve syncedAt farklıysa bu başka cihazdan — İŞLE
        // Süre dolduysa temizle
        if (Date.now() >= _wn.expiry) {
          delete _writingNow[collection];
        }
      }

      // Throttle: 300ms'de max 1 işlem (hızlı sync)
      var now = Date.now();
      if (_lastSnapshotProcess[collection] && (now - _lastSnapshotProcess[collection]) < 300) {
        return;
      }
      _lastSnapshotProcess[collection] = now;

      const fsData = snap.data()?.data;
      if (fsData === null || fsData === undefined) return;

      // Hash check — aynı veri gelirse skip et (döngü engelleyici)
      // syncedAt Firestore'da her yazımda güncellenir — en güvenilir değişiklik sinyali
      var dataHash = '';
      try {
        var _syncedAt = snap.data()?.syncedAt || '';
        if (_syncedAt) {
          dataHash = collection + ':' + _syncedAt;
        } else if (Array.isArray(fsData)) {
          dataHash = fsData.length + ':' + JSON.stringify(fsData).length;
        } else {
          dataHash = JSON.stringify(fsData).length.toString();
        }
      } catch(e) {}
      if (dataHash && _lastDataHash[collection] === dataHash) {
        return;
      }
      _lastDataHash[collection] = dataHash;

      // trash, notifications, activity → merge yok, Firestore master
      var _rtNoMerge = ['trash', 'notifications', 'activity'];
      var merged;
      if (_rtNoMerge.indexOf(collection) !== -1) {
        // Merge yapmadan direkt Firestore verisini al
        merged = Array.isArray(fsData) ? fsData : fsData;
      } else {
        merged = _mergeDataSets(localKey, fsData, collection);
      }
      _stripBase64BeforeWrite(localKey, merged);
      try {
        var _lzRT = typeof LZString !== 'undefined' ? LZString : null;
        var _jsonRT = JSON.stringify(merged);
        if (_lzRT && localKey.startsWith('ak_') && _jsonRT.length > 500) {
          localStorage.setItem(localKey, '_LZ_' + _lzRT.compressToUTF16(_jsonRT));
        } else {
          localStorage.setItem(localKey, _jsonRT);
        }
        localStorage.setItem(localKey + '_ts', snap.data()?.syncedAt || new Date().toISOString());
      } catch (e) { GlobalErrorHandler('realtime:write', e, 'warn'); }
      // FIX: In-memory cache'i invalidate et — onSnapshot bypass sorunu
      try {
        if (typeof window.invalidateCacheForCollection === 'function') {
          window.invalidateCacheForCollection(collection);
        }
      } catch(e) {}
      // Merge sonucu Firestore'dan farklıysa geri yaz (trash/notifications/activity hariç)
      if (_rtNoMerge.indexOf(collection) === -1 && Array.isArray(merged) && Array.isArray(fsData) && merged.length > fsData.length) {
        _syncFirestoreMerged(_base2 + '/' + collection, merged);
      }

      // UI'ı yenile (throttled)
      // DB durum göstergesi güncelle
      window._lastSyncTime = Date.now();

      if (typeof onUpdate === 'function') {
        clearTimeout(_listeners[collection + '_timer']);
        _listeners[collection + '_timer'] = setTimeout(() => {
          try { onUpdate(merged); }
          catch (e) { GlobalErrorHandler('realtime:render', e, 'warn'); }
        }, 100);
      }
    }, err => {
      if (err.code === 'permission-denied') {
        console.warn('[DB:realtime]', collection, '→ permission-denied — token yenileniyor...');
        // Token yenile ve yeniden bağlan
        try {
          var _fbA = window.Auth?.getFBAuth?.();
          if (_fbA && _fbA.currentUser) {
            _fbA.currentUser.getIdToken(true).then(function() {
              console.info('[DB:realtime]', collection, '→ token yenilendi, yeniden bağlanıyor...');
              setTimeout(function() { _listenCollection(collection, localKey, onUpdate); }, 1000);
            }).catch(function(e2) {
              console.error('[DB:realtime] token yenileme basarisiz:', e2.message);
              // 30s sonra tekrar dene
              setTimeout(function() { _listenCollection(collection, localKey, onUpdate); }, 30000);
            });
          } else {
            // Auth yok — 30s sonra tekrar dene
            setTimeout(function() { _listenCollection(collection, localKey, onUpdate); }, 30000);
          }
        } catch(e3) {
          setTimeout(function() { _listenCollection(collection, localKey, onUpdate); }, 30000);
        }
      } else {
        console.warn('[DB:realtime]', collection, '→ onSnapshot koptu:', err.message);
        GlobalErrorHandler('realtime:' + collection, err, 'warn');
        setTimeout(function() {
          console.info('[DB:realtime]', collection, '→ yeniden bağlanıyor...');
          _listenCollection(collection, localKey, onUpdate);
        }, 2000);
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

  // goTo → hem nav butonu seçimi hem panel açılışı
  if (typeof window.goTo === 'function') window.goTo('pusula');
  else if (typeof window.nav === 'function') window.nav('pusula');

  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    // pus-main-view: pusula panelinin ana container'ı (index.html)
    if (typeof window.openPusDetail === 'function' && document.getElementById('pus-main-view')) {
      clearInterval(interval);
      window.openPusDetail(tid);
    }
    if (attempts > 30) clearInterval(interval);
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

/** onSnapshot/bgCheck localStorage yazımından önce base64 temizle */
function _stripBase64BeforeWrite(key, data) {
  try {
    if ((key === KEYS.taskChats || key === 'ak_task_chat1') && data && typeof data === 'object' && !Array.isArray(data)) {
      Object.keys(data).forEach(function(k) { (data[k] || []).forEach(function(m) { if (m.file && m.file.data && typeof m.file.data === 'string' && m.file.data.startsWith('data:')) { m.file = { name: m.file.name || 'dosya', _stripped: true }; } Object.keys(m).forEach(function(f) { if (m[f] && typeof m[f] === 'string' && m[f].startsWith('data:') && m[f].length > 1000) m[f] = '[stripped]'; }); }); });
    }
    if ((key === KEYS.tasks || key === 'ak_tk2') && Array.isArray(data)) {
      data.forEach(function(t) { ['docs', 'attachments', 'files'].forEach(function(f) { if (Array.isArray(t[f])) { t[f] = t[f].map(function(d) { if (d && d.data && typeof d.data === 'string' && d.data.startsWith('data:')) return { name: d.name || 'dosya', url: d.url || null, _stripped: true }; return d; }); } }); ['receipt', 'img', 'image', 'file'].forEach(function(f) { if (t[f] && typeof t[f] === 'string' && t[f].startsWith('data:')) t[f] = null; }); });
    }
  } catch (e) {}
}

function startRealtimeSync() {
  console.log('[SYNC] startRealtimeSync çağrıldı. _syncStarted:', Object.keys(_syncStarted).length, '| FB_DB:', !!window.Auth?.getFBDB?.(), '| FB_AUTH currentUser:', !!window.Auth?.getFBAuth?.()?.currentUser);
  if (_syncStarted._all) { console.info('[DB] Realtime sync zaten çalışıyor — tekrar başlatma atlandı'); return; }
  _syncStarted._all = true;
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
    ['urunler',       KEYS.urunler,       () => window.renderUrunler?.()],
    ['fikirler',      KEYS.fikirler,      () => window._onFikirUpdate?.()],
    ['iddialar',      KEYS.iddialar,      () => window.renderIddia?.()],
    ['alisTeklifleri', KEYS.alisTeklifleri, () => window.renderAlisTeklifleri?.()],
    ['satisTeklifleri',KEYS.satisTeklifleri,() => window.renderSatisTeklifleri?.()],
    ['teklifSartlar', KEYS.teklifSartlar, () => {}],
    ['updateLog',     KEYS.updateLog,     () => {}],
    ['trash',         KEYS.trash,         () => {}],
    ['kararlar',      KEYS.kararlar,      () => {}],
    ['suggestions',   KEYS.suggestions,   () => {}],
    ['links',         KEYS.links,         () => {}],
    ['smartGoals',    KEYS.smartGoals,    () => {}],
    // İhracat — REALTIME-SYNC-001: cihazlar arası canlı senkronizasyon
    ['ihracatDosyalar', KEYS.ihracatDosyalar, () => window.renderIhracatOps?.()],
    ['ihracatEvraklar', KEYS.ihracatEvraklar,  () => window.renderIhracatOps?.()],
    ['ihracatUrunler',  KEYS.ihracatUrunler,   () => window.renderIhracatOps?.()],
    ['ihracatGcb',      KEYS.ihracatGcb,       () => window.renderGcb?.()],
    ['ihracatBl',       KEYS.ihracatBl,        () => window.renderIhracatOps?.()],
    ['ihracatTemplate', KEYS.ihracatTemplate,  () => {}],
    ['gumrukculer',     KEYS.gumrukculer,      () => window.renderIhracatFormlar?.()],
    ['forwarderlar',    KEYS.forwarderlar,      () => window.renderIhracatFormlar?.()],
    ['evrakWorkflow',   KEYS.evrakWorkflow,    () => window.renderIhracatOps?.()],
    ['ihracatOps',      KEYS.ihracatOps,       () => window.renderIhracatOps?.()],
    ['sozler',          KEYS.sozler,           () => {}],
    ['gcb',             KEYS.gcb,              () => window.renderGcb?.()],
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
    if (!_syncStarted[col]) {
      _syncStarted[col] = true;
      _listenCollection(col, key, render);
    }
  });

  console.info('[DB] Realtime sync başlatıldı:', SYNC_MAP.length, 'koleksiyon');

  // Sync göstergesini başlat
  _setSyncStatus('ok');

  // ── Token yenileme — 45 dakikada bir (1 saatlik expiry öncesi) ──
  if (!window._tokenRefreshTimer) {
    window._tokenRefreshTimer = setInterval(function() {
      try {
        var _fbAR = window.Auth?.getFBAuth?.();
        if (_fbAR && _fbAR.currentUser) {
          _fbAR.currentUser.getIdToken(true).then(function() {
            console.info('[AUTH] Token yenilendi (periyodik 45dk)');
          }).catch(function(e) {
            console.warn('[AUTH] Token yenileme basarisiz:', e.message);
          });
        }
      } catch(e) {}
    }, 45 * 60 * 1000); // 45 dakika
  }

  // ── Tab görünür olunca token + listener kontrol ──
  if (!window._visibilityHandler) {
    window._visibilityHandler = true;
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState !== 'visible') return;
      // Tab aktif oldu — token yenile
      try {
        var _fbAV = window.Auth?.getFBAuth?.();
        if (_fbAV && _fbAV.currentUser) {
          _fbAV.currentUser.getIdToken(true).then(function() {
            console.info('[AUTH] Token yenilendi (tab visible)');
            window._lastSyncTime = Date.now();
          }).catch(function() {});
        }
      } catch(e) {}
    });
  }

  // Arka plan denetim başlat (5dk aralıklı)
  _startBgSyncCheck();

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
    ['ihracatDosyalar', KEYS.ihracatDosyalar, loadIhracatDosyalar],
    ['ihracatUrunler',  KEYS.ihracatUrunler,  loadIhracatUrunler],
    ['ihracatEvraklar', KEYS.ihracatEvraklar, loadIhracatEvraklar],
    ['ihracatGcb',      KEYS.ihracatGcb,      loadIhracatGcb],
    ['ihracatBl',       KEYS.ihracatBl,       loadIhracatBl],
    ['gumrukculer',     KEYS.gumrukculer,     loadGumrukculer],
    ['forwarderlar',    KEYS.forwarderlar,     loadForwarderlar],
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
 * Manuel veri aktarımı — ilerleme göstergesi ile.
 * @param {string} statusElId — ilerleme gösterge div'inin id'si
 */
async function manualUploadToFirestore(statusElId) {
  var FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) { window.toast?.('Firebase bağlantısı yok', 'err'); return; }
  var tid = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
  var base = 'duay_' + tid;
  var statusEl = statusElId ? document.getElementById(statusElId) : null;

  var COLS = [
    { key: KEYS.tasks,            col: 'tasks',            ad: 'Görevler',           loader: loadTasks },
    { key: KEYS.users,            col: 'users',            ad: 'Kullanıcılar',       loader: loadUsers },
    { key: KEYS.ihracatDosyalar,  col: 'ihracatDosyalar',  ad: 'İhracat Dosyaları',  loader: loadIhracatDosyalar },
    { key: KEYS.ihracatUrunler,   col: 'ihracatUrunler',   ad: 'İhracat Ürünleri',   loader: loadIhracatUrunler },
    { key: KEYS.ihracatEvraklar,  col: 'ihracatEvraklar',  ad: 'İhracat Evraklar',   loader: loadIhracatEvraklar },
    { key: KEYS.gumrukculer,      col: 'gumrukculer',      ad: 'Gümrükçüler',        loader: loadGumrukculer },
    { key: KEYS.forwarderlar,     col: 'forwarderlar',     ad: 'Forwarderlar',        loader: loadForwarderlar },
  ];

  var toplamKayit = 0, hatalar = 0;
  if (statusEl) statusEl.innerHTML = '';

  for (var ci = 0; ci < COLS.length; ci++) {
    var k = COLS[ci];
    try {
      var liste = k.loader();
      if (!Array.isArray(liste) || !liste.length) {
        if (statusEl) statusEl.innerHTML += '<div style="font-size:11px;color:var(--t3);padding:3px 0">\u23ed ' + k.ad + ' — boş</div>';
        continue;
      }
      if (statusEl) statusEl.innerHTML += '<div style="font-size:11px;color:var(--t2);padding:3px 0" id="fs-m-' + k.col + '">\u23f3 ' + k.ad + ' — ' + liste.length + ' kayıt yükleniyor...</div>';

      var docRef = FB_DB.collection(base).doc(k.col);
      await docRef.set({ data: liste, syncedAt: new Date().toISOString(), manualUpload: true }, { merge: true });
      toplamKayit += liste.length;

      var el = document.getElementById('fs-m-' + k.col);
      if (el) el.innerHTML = '<span style="color:#16A34A">\u2713 ' + k.ad + ' — ' + liste.length + ' kayıt aktarıldı</span>';
    } catch (e) {
      hatalar++;
      if (statusEl) statusEl.innerHTML += '<div style="font-size:11px;color:#DC2626;padding:3px 0">\u2717 ' + k.ad + ' — HATA: ' + e.message + '</div>';
    }
  }

  if (statusEl) statusEl.innerHTML += '<div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:' + (hatalar ? '#FAEEDA' : '#EAF3DE') + ';font-size:12px;color:' + (hatalar ? '#633806' : '#27500A') + '">' + (hatalar ? hatalar + ' modülde hata. ' : '\u2713 ') + toplamKayit + ' kayıt Firestore\'a aktarıldı.</div>';
  window.toast?.(toplamKayit + ' kayıt buluta aktarıldı', 'ok');
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
  _syncStarted = {};
  console.info('[DB] Realtime sync durduruldu.');
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 31 — SYNC GÜVENİLİRLİK (SYNC-001)
// ════════════════════════════════════════════════════════════════

/**
 * Sync durum yönetimi — tüm cihazlarda görünür gösterge.
 * @type {{status:'ok'|'syncing'|'error', lastSync:string, errors:number, lastError:string}}
 */
var _syncState = { status: 'ok', lastSync: '', errors: 0, lastError: '' };

/** Safari tespiti */
var _isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/** Safari fallback: localStorage boşsa Firestore'dan zorla çek */
window._forceSync = function(localKey) {
  var FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) return;
  // localKey → collection name bul (KEYS reverse lookup)
  var col = null;
  Object.entries(KEYS).forEach(function(e) { if (e[1] === localKey) col = e[0]; });
  if (!col) return;
  var tid = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
  var base = 'duay_' + tid;
  FB_DB.collection(base).doc(col).get().then(function(snap) {
    if (!snap.exists) return;
    var fsData = snap.data()?.data;
    if (!fsData) return;
    try { localStorage.setItem(localKey, JSON.stringify(fsData)); } catch(e) {}
    // İlgili modülü yeniden render et
    if (typeof window._renderActivePanel === 'function') window._renderActivePanel();
    console.info('[SYNC:forceSync]', col, '→', Array.isArray(fsData) ? fsData.length : 'obj');
  }).catch(function() {});
};

/**
 * Sync durumunu günceller ve UI göstergesini yeniler.
 * @param {'ok'|'syncing'|'error'} status
 * @param {string} [errMsg]
 */
function _setSyncStatus(status, errMsg) {
  _syncState.status = status;
  if (status === 'ok') _syncState.lastSync = new Date().toISOString();
  if (status === 'error') {
    _syncState.errors++;
    _syncState.lastError = errMsg || '';
    // 24 saat sonra hata sayacını sıfırla
    try {
      var _errKey = 'ak_sync_err_ts';
      var _errTs = parseInt(localStorage.getItem(_errKey) || '0');
      if (!_errTs || Date.now() - _errTs > 86400000) {
        _syncState.errors = 1;
        localStorage.setItem(_errKey, String(Date.now()));
      }
    } catch(e) {}
  }
  _renderSyncIndicator();
}

/**
 * Dashboard/header sync göstergesi render.
 * 🟢 Senkronize | 🟡 Senkronize ediliyor | 🔴 Hata
 */
function _renderSyncIndicator() {
  var el = document.getElementById('sync-indicator');
  if (!el) {
    // Header'daki notif-dot yanına ekle
    var header = document.querySelector('.ubar-right');
    if (!header) return;
    el = document.createElement('div');
    el.id = 'sync-indicator';
    el.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:10px;padding:2px 8px;border-radius:12px;cursor:pointer;transition:all .2s';
    el.title = 'Senkronizasyon durumu';
    el.onclick = function() { window._showSyncDetails?.(); };
    header.insertBefore(el, header.firstChild);
  }
  var s = _syncState;
  if (s.status === 'ok') {
    el.style.background = 'rgba(34,197,94,.1)';
    el.style.color = '#16a34a';
    el.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#16a34a;flex-shrink:0"></span> Sync';
  } else if (s.status === 'syncing') {
    el.style.background = 'rgba(234,179,8,.1)';
    el.style.color = '#ca8a04';
    el.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#ca8a04;flex-shrink:0;animation:pulse 1s infinite"></span> Sync…';
  } else {
    el.style.background = 'rgba(220,38,38,.1)';
    el.style.color = '#dc2626';
    el.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#dc2626;flex-shrink:0"></span> Hata';
  }
}

/**
 * Sync detay panelini gösterir (tıklanınca).
 * Ayarlar → Veritabanı Sağlığı paneline yönlendirir.
 */
window._showSyncDetails = function() {
  if (typeof window.App !== 'undefined' && typeof window.App.nav === 'function') {
    window.App.nav('settings');
  }
  setTimeout(function() {
    window.setNav?.('monitor', document.getElementById('sni-monitor'));
    window._renderMonitorPage?.();
  }, 400);
};

/**
 * Offline kuyruk uzunluğu — _offlineWriteQueue erişimi
 * @returns {number}
 */
window._getOfflineQueueLen = function() {
  return typeof _offlineWriteQueue !== 'undefined' ? _offlineWriteQueue.length : 0;
};

/** Listener listesini dışa aç */
window._dbListeners = _listeners;
window._stripBase64BeforeWrite = _stripBase64BeforeWrite;

/**
 * Veritabanı sağlık verilerini toplar.
 * @returns {Object} health metrics
 */
window._getDbHealth = function() {
  var lsTotal = 0;
  var lsKeys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    var v = localStorage.getItem(k) || '';
    var bytes = (k.length + v.length) * 2;
    lsTotal += bytes;
    if (k.startsWith('ak_')) lsKeys.push({ key: k, bytes: bytes });
  }
  lsKeys.sort(function(a, b) { return b.bytes - a.bytes; });
  var lsMB = (lsTotal / 1024 / 1024).toFixed(2);
  var lsLimit = 5;
  var lsPct = Math.round(lsTotal / (lsLimit * 1024 * 1024) * 100);

  var tasks = [], notifs = [], trash = [];
  try { tasks = JSON.parse(localStorage.getItem('ak_tk2') || '[]'); } catch (e) { /* */ }
  try { notifs = JSON.parse(localStorage.getItem('ak_notif1') || '[]'); } catch (e) { /* */ }
  try { trash = JSON.parse(localStorage.getItem('ak_trash1') || '[]'); } catch (e) { /* */ }

  var noUpdatedAt = tasks.filter(function(t) { return !t.isDeleted && !t.updatedAt; }).length;
  var noUpdatedAtPct = tasks.length > 0 ? Math.round(noUpdatedAt / tasks.length * 100) : 0;

  var oldestTrash = trash.length > 0
    ? trash.reduce(function(min, t) { return (!min || (t.deletedAt && t.deletedAt < min)) ? t.deletedAt : min; }, null)
    : null;

  var queueLen = typeof window._getOfflineQueueLen === 'function' ? window._getOfflineQueueLen() : 0;
  var listenerCount = Object.keys(window._dbListeners || {}).length;

  var alerts = [];
  if (lsPct >= 80) alerts.push({ level: 'red', msg: 'localStorage %' + lsPct + ' dolu — kritik!' });
  else if (lsPct >= 60) alerts.push({ level: 'amber', msg: 'localStorage %' + lsPct + ' dolu' });
  if (notifs.length > 100) alerts.push({ level: 'red', msg: 'Bildirimler ' + notifs.length + ' kayıt — temizlenmeli!' });
  else if (notifs.length > 50) alerts.push({ level: 'amber', msg: 'Bildirimler ' + notifs.length + ' kayıt' });
  if (_syncState.errors > 3) alerts.push({ level: 'red', msg: '24 saatte ' + _syncState.errors + ' sync hatası' });
  else if (_syncState.errors > 0) alerts.push({ level: 'amber', msg: _syncState.errors + ' sync hatası' });
  if (queueLen > 10) alerts.push({ level: 'red', msg: 'Offline kuyrukta ' + queueLen + ' işlem bekliyor' });
  else if (queueLen > 0) alerts.push({ level: 'amber', msg: 'Offline kuyrukta ' + queueLen + ' işlem var' });
  if (noUpdatedAtPct > 20) alerts.push({ level: 'amber', msg: 'Görevlerin %' + noUpdatedAtPct + '\'ünde updatedAt eksik' });
  if (trash.length > 100) alerts.push({ level: 'amber', msg: 'Çöp kutusunda ' + trash.length + ' kayıt' });

  return {
    sync: { status: _syncState.status, lastSync: _syncState.lastSync, errors: _syncState.errors, lastError: _syncState.lastError, queueLen: queueLen, listeners: listenerCount },
    storage: { usedMB: lsMB, limitMB: lsLimit, pct: lsPct, topKeys: lsKeys.slice(0, 5), total: lsTotal },
    data: { taskCount: tasks.length, deletedTasks: tasks.filter(function(t) { return t.isDeleted; }).length, noUpdatedAt: noUpdatedAt, noUpdatedAtPct: noUpdatedAtPct, notifCount: notifs.length, trashCount: trash.length, oldestTrash: oldestTrash },
    alerts: alerts,
    hasRed: alerts.some(function(a) { return a.level === 'red'; }),
    hasAmber: alerts.some(function(a) { return a.level === 'amber'; }),
  };
};

/** @private Yardımcı: metrik kart */
function _dbStatCard(label, value) {
  return '<div style="background:var(--s2);border-radius:8px;padding:10px 12px;text-align:center">'
    + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">' + label + '</div>'
    + '<div style="font-size:18px;font-weight:500">' + value + '</div></div>';
}

/**
 * Veritabanı Sağlığı panelini render eder.
 */
window._renderDbHealthPanel = function() {
  var panel = document.getElementById('db-health-panel');
  var badge = document.getElementById('db-health-badge');
  if (!panel) return;

  var h = window._getDbHealth();
  var s = h.sync;
  var st = h.storage;
  var d = h.data;

  if (badge) {
    if (h.hasRed) { badge.className = 'badge br'; badge.textContent = '⚠ Anormallik'; }
    else if (h.hasAmber) { badge.className = 'badge ba'; badge.textContent = '⚡ Uyarı'; }
    else { badge.className = 'badge bg'; badge.textContent = '✓ Sağlıklı'; }
  }

  var alertHtml = '';
  if (h.alerts.length) {
    alertHtml = '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px">';
    h.alerts.forEach(function(a) {
      var bg = a.level === 'red' ? '#FCEBEB' : '#FAEEDA';
      var c = a.level === 'red' ? '#791F1F' : '#633806';
      alertHtml += '<div style="padding:7px 12px;background:' + bg + ';border-radius:6px;font-size:11px;color:' + c + ';font-weight:500">' + (a.level === 'red' ? '🔴 ' : '🟡 ') + a.msg + '</div>';
    });
    alertHtml += '</div>';
  }

  var stColor = st.pct >= 80 ? '#791F1F' : st.pct >= 60 ? '#633806' : '#27500A';
  var lastSyncStr = s.lastSync ? new Date(s.lastSync).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  var keyRows = st.topKeys.map(function(k) {
    var kb = (k.bytes / 1024).toFixed(1);
    var nm = k.key.replace('ak_', '');
    return '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t2);padding:3px 0;border-bottom:0.5px solid var(--b)"><span>' + nm + '</span><span style="font-family:monospace">' + kb + ' KB</span></div>';
  }).join('');

  var syncColor = s.status === 'ok' ? '#27500A' : s.status === 'syncing' ? '#633806' : '#791F1F';
  var syncLabel = s.status === 'ok' ? '✅ Senkronize' : s.status === 'syncing' ? '🔄 Senkronize ediliyor…' : '🔴 Hata';

  panel.innerHTML = alertHtml
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Senkronizasyon</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'
    + _dbStatCard('Durum', '<span style="font-size:12px;color:' + syncColor + ';font-weight:600">' + syncLabel + '</span>')
    + _dbStatCard('Son Sync', lastSyncStr)
    + _dbStatCard('24s Hata', '<span style="color:' + (s.errors > 3 ? '#791F1F' : 'var(--t)') + ';font-size:20px;font-weight:500">' + s.errors + '</span>')
    + '</div>'
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Depolama</div>'
    + '<div style="margin-bottom:6px">'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>localStorage kullanımı</span><span style="font-weight:500;color:' + stColor + '">' + st.usedMB + ' MB / ' + st.limitMB + ' MB (%' + st.pct + ')</span></div>'
    + '<div style="height:6px;background:var(--b);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + st.pct + '%;background:' + stColor + ';border-radius:3px;transition:width .3s"></div></div></div>'
    + '<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--t3);margin-bottom:5px">En büyük 5 koleksiyon</div>' + keyRows + '</div>'
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Veri Bütünlüğü</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'
    + _dbStatCard('Görev', d.taskCount)
    + _dbStatCard('Bildirim', '<span style="color:' + (d.notifCount > 100 ? '#791F1F' : d.notifCount > 50 ? '#633806' : 'var(--t)') + ';font-size:20px;font-weight:500">' + d.notifCount + '</span>')
    + _dbStatCard('Çöp Kutusu', d.trashCount)
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn btns" style="font-size:11px" onclick="window._manualSync?.()">☁️ Manuel Sync</button>'
    + '<button class="btn btns" style="font-size:11px" onclick="window._cleanNotifications?.()">🗑 Bildirimleri Temizle</button>'
    + '</div>';
};

/**
 * Bildirim temizleme — son 50'yi tutar.
 */
window._cleanNotifications = function() {
  try {
    var notifs = JSON.parse(localStorage.getItem('ak_notif1') || '[]');
    var cleaned = notifs.slice(0, 50);
    localStorage.setItem('ak_notif1', JSON.stringify(cleaned));
    var path = typeof _fsPath === 'function' ? _fsPath('notifications') : null;
    if (path) _syncFirestore(path, cleaned);
    window.toast?.((notifs.length - cleaned.length) + ' bildirim temizlendi', 'ok');
    window._renderDbHealthPanel?.();
  } catch (e) {
    window.toast?.('Temizleme hatası: ' + e.message, 'err');
  }
};

/**
 * Settings sidebar navigasyonu.
 * @param {string} page - Sayfa adı (gorunum, guvenlik, pwa, firebase, veri, monitor, surum)
 * @param {HTMLElement} [el] - Tıklanan nav öğesi
 */
window.setNav = function(page, el) {
  document.querySelectorAll('.set-nav-item').forEach(function(i) { i.classList.remove('active'); });
  document.querySelectorAll('.set-page').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
  if (el) el.classList.add('active');
  var pg = document.getElementById('set-page-' + page);
  if (pg) { pg.classList.add('active'); pg.style.display = 'block'; }
  if (page === 'monitor') window._renderMonitorPage?.();
};

/**
 * Sağlık Monitörü tam sayfa render.
 */
window._renderMonitorPage = function() {
  var h = window._getDbHealth?.();
  if (!h) return;

  var now = new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Son kontrol zamanı
  var lastCheckEl = document.getElementById('set-monitor-lastcheck');
  if (lastCheckEl) lastCheckEl.textContent = 'Son kontrol: ' + now;

  // Durum badge (topbar)
  var statusEl = document.getElementById('set-monitor-status');
  if (statusEl) {
    if (h.hasRed) {
      statusEl.style.background = 'rgba(239,68,68,.1)'; statusEl.style.color = '#791F1F';
      statusEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#E24B4A;flex-shrink:0"></div> Anormallik';
    } else if (h.hasAmber) {
      statusEl.style.background = 'rgba(186,117,23,.1)'; statusEl.style.color = '#633806';
      statusEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#BA7517;flex-shrink:0"></div> Uyarı';
    } else {
      statusEl.style.background = 'rgba(29,158,117,.15)'; statusEl.style.color = '#085041';
      statusEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#1D9E75;flex-shrink:0"></div> Sistem sağlıklı';
    }
  }

  // Sidebar badge
  var badgeEl = document.getElementById('set-monitor-badge');
  if (badgeEl) badgeEl.style.display = (h.hasRed || h.hasAmber) ? '' : 'none';

  // KPI kartları
  var kpiEl = document.getElementById('set-monitor-kpi');
  if (kpiEl) {
    var stColor = h.storage.pct >= 80 ? '#791F1F' : h.storage.pct >= 60 ? '#633806' : '#27500A';
    var nColor = h.data.notifCount > 100 ? '#791F1F' : h.data.notifCount > 50 ? '#633806' : 'var(--t)';
    var vals = [
      { v: '%' + h.storage.pct, l: 'Depolama', c: stColor },
      { v: h.data.notifCount, l: 'Bildirim', c: nColor },
      { v: h.sync.errors, l: 'Sync hata', c: h.sync.errors > 3 ? '#791F1F' : 'var(--t)' },
      { v: h.sync.queueLen, l: 'Offline kuyruk', c: h.sync.queueLen > 5 ? '#791F1F' : 'var(--t)' },
      { v: h.sync.listeners, l: 'FS Listener', c: 'var(--t)' },
      { v: h.data.taskCount, l: 'Görev sayısı', c: 'var(--t)' },
    ];
    kpiEl.innerHTML = vals.map(function(m) {
      return '<div class="ms"><div class="msv" style="color:' + m.c + '">' + m.v + '</div><div class="msl">' + m.l + '</div></div>';
    }).join('');
  }

  // Uyarılar
  var alertEl = document.getElementById('set-monitor-alerts');
  if (alertEl) {
    if (h.alerts.length) {
      alertEl.innerHTML = h.alerts.map(function(a) {
        var bg = a.level === 'red' ? '#FCEBEB' : '#FAEEDA';
        var c = a.level === 'red' ? '#791F1F' : '#633806';
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:7px;margin-bottom:6px;font-size:12px;background:' + bg + ';color:' + c + '">' + (a.level === 'red' ? '🔴' : '🟡') + ' ' + a.msg + '</div>';
      }).join('');
    } else {
      alertEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:7px;margin-bottom:6px;font-size:12px;background:#EAF3DE;color:#27500A">✅ Tüm parametreler normal aralıkta</div>';
    }
  }

  // Olay akışı (timeline)
  var tlEl = document.getElementById('set-monitor-timeline');
  if (tlEl) {
    var lastSync = h.sync.lastSync ? new Date(h.sync.lastSync).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    var events = [
      { t: now, ok: true, m: 'Monitör kontrolü çalıştı' },
      { t: lastSync, ok: true, m: 'Son başarılı Firestore sync' },
      { t: '—', ok: h.data.notifCount <= 50, m: 'Bildirim koleksiyonu: ' + h.data.notifCount + ' kayıt' },
      { t: '—', ok: h.storage.pct < 60, m: 'localStorage: %' + h.storage.pct + ' dolu (' + h.storage.usedMB + ' MB)' },
    ];
    tlEl.innerHTML = events.map(function(e) {
      return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:0.5px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);font-family:monospace;min-width:40px;padding-top:1px">' + e.t + '</div>'
        + '<div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:3px;background:' + (e.ok ? '#639922' : '#E24B4A') + '"></div>'
        + '<div style="font-size:12px;color:var(--t2)">' + e.m + '</div></div>';
    }).join('');
  }

  // Uzman yorumu
  var expertEl = document.getElementById('set-monitor-expert');
  if (expertEl) {
    var insights = [];
    if (h.data.notifCount > 50)
      insights.push('Bildirim koleksiyonu (' + h.data.notifCount + ' kayıt) Firestore merge döngüsünde büyüyor. Bu klasik "silent accumulator" senaryosu — günlük kullanımda fark edilmez, 3-6 ayda localStorage limitine dayanır. Ayda bir temizleme alışkanlığı edinilmeli.');
    if (h.data.noUpdatedAtPct > 10)
      insights.push('updatedAt eksikliği (%' + h.data.noUpdatedAtPct + ') merge stratejisinin zayıf noktası: iki cihaz aynı kaydı değiştirince hangisi kazanacağı belirsizleşir, eski veri yeniyi ezebilir. saveTasks her çağrıda updatedAt güncellemeli.');
    if (h.storage.pct > 40)
      insights.push('localStorage %' + h.storage.pct + ' dolu. Büyüme doğrusal değil — veri hacmi hızlanınca %80\'e beklenenden çabuk ulaşılabilir.');
    if (!insights.length)
      insights.push('Sistem şu an stabil. Tüm parametreler referans aralığında. localStorage doluluk ve bildirim sayısını haftalık takip etmek yeterli.');
    expertEl.innerHTML = insights.join('<br><br>');
  }

  // Parametreler tablosu
  var paramEl = document.getElementById('set-monitor-params');
  if (paramEl) {
    var params = [
      { n: 'localStorage doluluk', v: '%' + h.storage.pct, ok: h.storage.pct < 60 },
      { n: 'localStorage kullanım', v: h.storage.usedMB + ' MB / 5 MB', ok: true },
      { n: 'Bildirim koleksiyonu', v: h.data.notifCount + ' kayıt', ok: h.data.notifCount <= 50 },
      { n: 'Sync durumu', v: h.sync.status === 'ok' ? 'Senkronize' : h.sync.status, ok: h.sync.status === 'ok' },
      { n: '24s sync hatası', v: h.sync.errors, ok: h.sync.errors === 0 },
      { n: 'Offline kuyruk', v: h.sync.queueLen, ok: h.sync.queueLen === 0 },
      { n: 'FS listener sayısı', v: h.sync.listeners, ok: h.sync.listeners < 45 },
      { n: 'Görev sayısı', v: h.data.taskCount, ok: h.data.taskCount < 2000 },
      { n: 'updatedAt eksik oran', v: '%' + h.data.noUpdatedAtPct, ok: h.data.noUpdatedAtPct < 10 },
      { n: 'Çöp kutusu', v: h.data.trashCount + ' kayıt', ok: h.data.trashCount < 100 },
    ];
    paramEl.innerHTML = params.map(function(p) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--b)">'
        + '<div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:' + (p.ok ? '#639922' : '#E24B4A') + '"></div>'
        + '<div style="flex:1;font-size:12px;color:var(--t2)">' + p.n + '</div>'
        + '<div style="font-size:12px;font-weight:500;font-family:monospace;color:' + (p.ok ? 'var(--t)' : '#791F1F') + '">' + p.v + '</div></div>';
    }).join('');
  }
};

/** Settings paneli açılınca monitör sayfasını otomatik render et */
document.addEventListener('click', function(e) {
  if (!e.target) return;
  var nb = e.target.closest ? e.target.closest('#nb-settings') : null;
  if (!nb && e.target.id !== 'nb-settings') return;
  setTimeout(function() { window._renderMonitorPage?.(); }, 500);
});

/**
 * FIX 1+2: Yazma doğrulama — Firestore'a yaz, sonra oku, doğrula.
 * Safari'de ek 1s bekleme. 3 deneme hakkı.
 *
 * @param {string} path   Firestore doc path
 * @param {*}      data   Yazılacak veri
 * @param {number} [retry=0] Deneme sayısı
 */
function _verifiedWrite(path, data, retry) {
  retry = retry || 0;
  var collection = path.split('/').pop();
  var FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) { _queueOfflineWrite(path, data, 'set'); return; }

  _setSyncStatus('syncing');
  var syncedAt = new Date().toISOString();
  _writingNow[collection] = { expiry: Date.now() + 5000, syncedAt: syncedAt };

  // Yazma
  FB_DB.doc(path).set({ data: data, syncedAt: syncedAt }, { merge: true })
    .then(function() {
      // Doğrulama: Safari'de 1200ms (longPolling yavaş), diğerlerinde 300ms bekle
      var delay = _isSafari ? 1200 : 300;
      setTimeout(function() {
        FB_DB.doc(path).get().then(function(snap) {
          if (snap.exists && snap.data()?.syncedAt === syncedAt) {
            _setSyncStatus('ok');
            console.info('[SYNC:OK]', collection, retry > 0 ? '(retry ' + retry + ')' : '');
          } else if (retry < 2) {
            console.warn('[SYNC:RETRY]', collection, 'doğrulama başarısız, tekrar deneniyor…', retry + 1);
            _verifiedWrite(path, data, retry + 1);
          } else {
            // Log koleksiyonları sessizce geç — kullanıcıya hata gösterme
            var _silentCols = ['activity', 'notifications', 'trash', 'updateLog'];
            if (_silentCols.indexOf(collection) !== -1) {
              console.warn('[SYNC:SKIP]', collection, 'doğrulama başarısız — log koleksiyonu, sessizce atlanıyor');
              _setSyncStatus('ok');
            } else {
              _setSyncStatus('error', collection + ' yazma doğrulanamadı');
              window.toast?.('Son işleminiz kaydedilemedi — tekrar deneyin', 'err');
              window.addNotif?.('🔴', 'Sync hatası: ' + collection + ' doğrulanamadı', 'err', 'admin');
            }
          }
        }).catch(function(e) {
          if (retry < 2) _verifiedWrite(path, data, retry + 1);
          else {
            var _silentCols2 = ['activity', 'notifications', 'trash', 'updateLog'];
            if (_silentCols2.indexOf(collection) === -1) {
              _setSyncStatus('error', e.message);
              window.toast?.('Son işleminiz kaydedilemedi — tekrar deneyin', 'err');
            } else {
              console.warn('[SYNC:SKIP]', collection, 'doğrulama hatası — sessizce atlanıyor');
            }
          }
        });
      }, delay);
    })
    .catch(function(e) {
      console.error('[SYNC:ERR]', collection, e.message);
      if (retry < 2) {
        setTimeout(function() { _verifiedWrite(path, data, retry + 1); }, 1000);
      } else {
        var _silentCols3 = ['activity', 'notifications', 'trash', 'updateLog'];
        if (_silentCols3.indexOf(collection) === -1) {
          _setSyncStatus('error', e.message);
          _queueOfflineWrite(path, data, 'set');
          window.toast?.('Son işleminiz kaydedilemedi — tekrar deneyin', 'err');
        } else {
          console.warn('[SYNC:SKIP]', collection, 'yazma hatası — sessizce atlanıyor');
        }
      }
    });
}

/**
 * FIX 3: Arka plan denetim — 5 dakikada bir localStorage vs Firestore karşılaştır.
 * Fark varsa Firestore'u baz al.
 */
var _bgCheckTimer = null;
function _startBgSyncCheck() {
  if (_bgCheckTimer) return;
  _bgCheckTimer = setInterval(function() {
    // Otomatik localStorage temizlik — hedef <%60
    try {
      var _lsTotal = 0;
      for (var _li = 0; _li < localStorage.length; _li++) { var _lk = localStorage.key(_li); _lsTotal += ((_lk.length + (localStorage.getItem(_lk) || '').length) * 2); }
      var _lsPct = Math.round(_lsTotal / (5 * 1024 * 1024) * 100);
      if (_lsPct >= 60) {
        var _n1 = JSON.parse(localStorage.getItem(KEYS.notifications) || '[]');
        if (_n1.length > 30) { localStorage.setItem(KEYS.notifications, JSON.stringify(_n1.slice(0, 30))); }
      }
      if (_lsPct >= 70) {
        var _tr1 = JSON.parse(localStorage.getItem(KEYS.trash) || '[]');
        if (_tr1.length > 30) { localStorage.setItem(KEYS.trash, JSON.stringify(_tr1.slice(0, 30))); }
        var _act1 = JSON.parse(localStorage.getItem(KEYS.activity) || '[]');
        if (_act1.length > 50) { localStorage.setItem(KEYS.activity, JSON.stringify(_act1.slice(0, 50))); }
      }
      if (_lsPct >= 80) {
        var _tc1 = JSON.parse(localStorage.getItem(KEYS.taskChats) || '{}');
        Object.keys(_tc1).forEach(function(tid) { if (Array.isArray(_tc1[tid]) && _tc1[tid].length > 20) _tc1[tid] = _tc1[tid].slice(-20); });
        localStorage.setItem(KEYS.taskChats, JSON.stringify(_tc1));
      }
      if (_lsPct >= 85) {
        var _od1 = JSON.parse(localStorage.getItem(KEYS.odemeler) || '[]');
        if (_od1.length > 500) { localStorage.setItem(KEYS.odemeler, JSON.stringify(_od1.filter(function(o){return !o.isDeleted;}).slice(-500))); }
        var _th1 = JSON.parse(localStorage.getItem(KEYS.tahsilat) || '[]');
        if (_th1.length > 500) { localStorage.setItem(KEYS.tahsilat, JSON.stringify(_th1.filter(function(t){return !t.isDeleted;}).slice(-500))); }
        var _kl1 = JSON.parse(localStorage.getItem(KEYS.kpiLog) || '[]');
        if (_kl1.length > 200) { localStorage.setItem(KEYS.kpiLog, JSON.stringify(_kl1.slice(-200))); }
      }
      if (_lsPct >= 60) {
        // taskChats+tasks base64 temizle
        try { var _tcbg = JSON.parse(localStorage.getItem('ak_task_chat1') || '{}'); var _tcbgc = false; Object.keys(_tcbg).forEach(function(k) { (_tcbg[k] || []).forEach(function(m) { if (m.file && m.file.data && typeof m.file.data === 'string' && m.file.data.startsWith('data:')) { m.file = { name: m.file.name || 'dosya', _stripped: true }; _tcbgc = true; } Object.keys(m).forEach(function(f) { if (m[f] && typeof m[f] === 'string' && m[f].startsWith('data:') && m[f].length > 1000) { m[f] = '[stripped]'; _tcbgc = true; } }); }); }); if (_tcbgc) localStorage.setItem('ak_task_chat1', JSON.stringify(_tcbg)); } catch (e) {}
        try { var _tkbg = JSON.parse(localStorage.getItem('ak_tk2') || '[]'); var _tkbgc = false; _tkbg.forEach(function(t) { ['docs','attachments','files'].forEach(function(f) { if (Array.isArray(t[f])) { t[f] = t[f].map(function(d) { if (d && d.data && typeof d.data === 'string' && d.data.startsWith('data:')) { _tkbgc = true; return { name: d.name || 'dosya', _stripped: true }; } return d; }); } }); }); if (_tkbgc) localStorage.setItem('ak_tk2', JSON.stringify(_tkbg)); } catch (e) {}
      }
      if (_lsPct < 60) { try { localStorage.removeItem('ak_storage_critical'); } catch (e) { /* */ } }
    } catch (e) { /* */ }

    var FB_DB = window.Auth?.getFBDB?.();
    if (!FB_DB) return;
    var tid = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
    var base = 'duay_' + tid;
    // Tüm SYNC_MAP koleksiyonlarını kontrol et
    var allCols = _ALL_SYNC_COLS.map(function(col) { return [col, KEYS[col] || 'ak_' + col]; });
    var _bgNoMerge = ['trash', 'notifications', 'activity', 'taskChats'];
    allCols.forEach(function(pair) {
      var col = pair[0]; var key = pair[1];
      if (_bgNoMerge.indexOf(col) !== -1) {
        // Merge yapma, FS küçükse local'i küçült
        FB_DB.collection(base).doc(col).get().then(function(snap) {
          if (!snap.exists) return; var fs2 = snap.data()?.data;
          if (!Array.isArray(fs2)) return;
          var loc2 = []; try { loc2 = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
          if (Array.isArray(loc2) && fs2.length < loc2.length) { try { localStorage.setItem(key, JSON.stringify(fs2)); } catch(e) {} }
        }).catch(function() {});
        return;
      }
      try {
        FB_DB.collection(base).doc(col).get().then(function(snap) {
          if (!snap.exists) return;
          var fsData = snap.data()?.data;
          if (!fsData) return;
          var localRaw = localStorage.getItem(key);
          var localData = null;
          try { localData = JSON.parse(localRaw); } catch(e) {}
          if (!Array.isArray(fsData) || !Array.isArray(localData)) return;
          // ID bazlı merge — her iki taraftaki eksik kayıtları birleştir
          var merged = _mergeDataSets(key, fsData, col);
          if (merged.length !== localData.length || merged.length !== fsData.length) {
            console.info('[SYNC:BG]', col, '→ merge: FS:', fsData.length, '+ Local:', localData.length, '= Merged:', merged.length);
            try { localStorage.setItem(key, JSON.stringify(merged)); } catch(e) {}
            // Firestore'a da geri yaz (local'de olup FS'de olmayan kayıtlar varsa)
            if (merged.length > fsData.length) {
              var _bgBase = 'duay_' + tid;
              _syncFirestoreMerged(_bgBase + '/' + col, merged);
            }
          }
        }).catch(function() {});
      } catch(e) {}
    });
    // ── IHR-3AY-001: 3 ay ihracat zorunluluk alarmi ──
    try {
      var _ihrDosyalar = typeof loadIhracatDosyalar === 'function' ? loadIhracatDosyalar() : [];
      var _bugunku = new Date().toISOString().slice(0, 10);
      _ihrDosyalar.filter(function(d) { return !d.isDeleted && d.createdAt && !['kapandi','iptal'].includes(d.durum); }).forEach(function(d) {
        var gun = Math.ceil((new Date(_bugunku) - new Date(d.createdAt)) / 86400000);
        if (gun > 90) { window.addNotif?.('🔴', (d.dosyaNo || 'Dosya') + ': 3 ay ihracat süresi doldu!', 'err', 'ihracat'); }
        else if (gun > 60) { window.addNotif?.('⚠️', (d.dosyaNo || 'Dosya') + ': 3 ay zorunluluğuna ' + (90 - gun) + ' gün kaldı', 'warn', 'ihracat'); }
      });
    } catch(e) {}

    // ── IHR-KAMBIYO-001: 4 ay kambiyo takibi ──
    try {
      var _MUAF_ULKELER = ['Almanya','Fransa','İtalya','İspanya','Hollanda','Belçika','Avusturya','Portekiz','Yunanistan','İrlanda','Finlandiya','Lüksemburg','ABD','İngiltere','Japonya','Çin','Güney Kore','Kanada','Avustralya','İsviçre','Norveç','İsveç','Danimarka'];
      var _gcbKapali = typeof loadIhracatGcb === 'function' ? loadIhracatGcb().filter(function(g) { return !g.isDeleted && g.durum === 'kapandi' && g.kapanma_tarihi; }) : [];
      _gcbKapali.forEach(function(g) {
        var dosya = _ihrDosyalar.find(function(d) { return String(d.id) === String(g.dosya_id); });
        var ulke = dosya ? (dosya.varis_ulkesi || dosya.alici_ulke || '') : '';
        if (_MUAF_ULKELER.indexOf(ulke) !== -1) return;
        var kGun = Math.ceil((new Date(_bugunku) - new Date(g.kapanma_tarihi)) / 86400000);
        var no = dosya ? dosya.dosyaNo : (g.beyan_no || 'GÇB');
        if (kGun > 120) { window.addNotif?.('🔴', no + ': Kambiyo süresi doldu!', 'err', 'ihracat'); }
        else if (kGun > 90) { window.addNotif?.('⚠️', no + ': Kambiyo süresine ' + (120 - kGun) + ' gün kaldı', 'warn', 'ihracat'); }
      });
    } catch(e) {}

  }, 2 * 60 * 1000);
}

/**
 * FIX 5: Manuel sync — tüm kritik koleksiyonları zorla Firestore'dan çek.
 */
window._manualSync = function() {
  window.toast?.('Senkronizasyon başlatılıyor…', 'ok');
  _setSyncStatus('syncing');
  var FB_DB = window.Auth?.getFBDB?.();
  if (!FB_DB) { _setSyncStatus('error', 'Firebase bağlantısı yok'); window.toast?.('Firebase bağlantısı yok', 'err'); return; }
  var tid = _getTid().replace(/[^a-zA-Z0-9_]/g, '_');
  var base = 'duay_' + tid;
  var cols = _ALL_SYNC_COLS.map(function(col) { return [col, KEYS[col] || 'ak_' + col]; });
  var done = 0;
  cols.forEach(function(pair) {
    FB_DB.collection(base).doc(pair[0]).get().then(function(snap) {
      if (snap.exists && snap.data()?.data) {
        try { localStorage.setItem(pair[1], JSON.stringify(snap.data().data)); } catch(e) {}
      }
      done++;
      if (done >= cols.length) {
        _setSyncStatus('ok');
        window.toast?.('Senkronizasyon tamamlandı ✓', 'ok');
        if (typeof window._renderActivePanel === 'function') window._renderActivePanel();
      }
    }).catch(function(e) {
      done++;
      console.warn('[SYNC:MANUAL]', pair[0], e.message);
    });
  });
};


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
  loadTrash, storeTrash, addToTrash, loadSmartGoals, storeSmartGoals,
  // Ödemeler
  loadOdm, storeOdm, loadTahsilat, storeTahsilat, loadSatinalma, storeSatinalma, loadCari, storeCari, loadBankalar, storeBankalar, loadNavlun, storeNavlun, loadUrunler, storeUrunler, loadAlisTeklifleri, storeAlisTeklifleri, loadSatisTeklifleri, storeSatisTeklifleri, loadTeklifSartlar, storeTeklifSartlar, loadUpdateLog, storeUpdateLog, loadFikirler, storeFikirler,
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
  // İddia
  loadIddialar, storeIddialar,
  // İhracat
  loadIhracatOps, storeIhracatOps,
  loadIhracatDosyalar, storeIhracatDosyalar, loadIhracatEvraklar, storeIhracatEvraklar,
  loadIhracatUrunler, storeIhracatUrunler, loadIhracatGcb, storeIhracatGcb,
  loadIhracatBl, storeIhracatBl, loadIhracatTemplate, storeIhracatTemplate,
  loadGumrukculer, storeGumrukculer, loadForwarderlar, storeForwarderlar,
  loadEvrakWorkflow, storeEvrakWorkflow,
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
  manualUploadToFirestore,
  listenCollection: _listenCollection,
  // Sync güvenilirlik
  getSyncState: function() { return _syncState; },
  manualSync: window._manualSync,
};

/** @description Soft delete + timestamp migration yardımcısı (STANDART-FIX-001) */
window._migrateRecord = function(kayit) {
  if (!kayit || typeof kayit !== 'object') return kayit;
  if (!('isDeleted' in kayit)) kayit.isDeleted = false;
  if (!('deletedAt' in kayit)) kayit.deletedAt = null;
  if (!('createdAt' in kayit)) kayit.createdAt = kayit.ts || kayit.olusturma || new Date().toISOString();
  if (!('updatedAt' in kayit)) kayit.updatedAt = kayit.guncellenme || kayit.updatedAt || new Date().toISOString();
  return kayit;
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
    '_fsPath','_getPaths','_getTid','startRealtimeSync','stopRealtimeSync','manualUploadToFirestore',
    'loadLinks','saveLinks','loadNotes','saveNotes','loadAct','saveAct',
    'logActivity','addNotif','loadNotifs','storeNotifs',
    'loadIk','storeIk','loadKargo','storeKargo',
    'loadKargoFirmalar','storeKargoFirmalar','loadKonteyn','storeKonteyn',
    'loadKargoChecks','storeKargoChecks','loadPirim','storePirim',
    'loadPirimParams','storePirimParams','loadStok','storeStok',
    'loadNumune','storeNumune','loadCrmData','storeCrmData',
    'loadRehber','storeRehber','loadHdf','storeHdf',
    'loadTrash','storeTrash','addToTrash','loadOdm','storeOdm','loadTahsilat','storeTahsilat','loadSatinalma','storeSatinalma','loadCari','storeCari','loadBankalar','storeBankalar','loadNavlun','storeNavlun','loadUrunler','storeUrunler','loadAlisTeklifleri','storeAlisTeklifleri','loadSatisTeklifleri','storeSatisTeklifleri','loadTeklifSartlar','storeTeklifSartlar','loadUpdateLog','storeUpdateLog','loadFikirler','storeFikirler','loadIddialar','storeIddialar',
    'loadIhracatOps','storeIhracatOps',
    'loadIhracatDosyalar','storeIhracatDosyalar','loadIhracatEvraklar','storeIhracatEvraklar',
    'loadIhracatUrunler','storeIhracatUrunler','loadIhracatGcb','storeIhracatGcb',
    'loadIhracatBl','storeIhracatBl','loadIhracatTemplate','storeIhracatTemplate',
    'loadGumrukculer','storeGumrukculer','loadForwarderlar','storeForwarderlar',
    'loadEvrakWorkflow','storeEvrakWorkflow',
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

// Uygulama açılışında şişmiş veriyi bir kez temizle
(function _oneTimeStorageClean() {
  // ACİL TEMİZLİK
  try {
    var _ec2 = function(k, max, fromEnd) { var raw = localStorage.getItem(k); if (!raw) return; try { var d = JSON.parse(raw); if (d.length > max) { localStorage.setItem(k, JSON.stringify(fromEnd ? d.slice(-max) : d.slice(0, max))); console.log('[EMERGENCY]', k, d.length, '→', max); } } catch(e) {} };
    _ec2('ak_kpi_log1', 100, true); _ec2('ak_act1', 30, true); _ec2('ak_notif1', 20, false); _ec2('ak_odm1', 300, false); _ec2('ak_tahsilat1', 300, false);
    try { var tcR = localStorage.getItem('ak_task_chat1'); if (tcR) { var tc2 = JSON.parse(tcR); var tc2c = false; Object.keys(tc2).forEach(function(tid) { if (Array.isArray(tc2[tid]) && tc2[tid].length > 5) { tc2[tid] = tc2[tid].slice(-5); tc2c = true; } }); if (tc2c) localStorage.setItem('ak_task_chat1', JSON.stringify(tc2)); } } catch(e) {}
    Object.keys(localStorage).forEach(function(k) { if (!k.startsWith('ak_')) return; var raw = localStorage.getItem(k); if (!raw || raw.length < 20000) return; try { var parsed = JSON.parse(raw); if (!Array.isArray(parsed)) return; var changed = false; parsed.forEach(function(item) { if (!item || typeof item !== 'object') return; ['receipt','img','image','file','imgdata','data'].forEach(function(f) { if (item[f] && typeof item[f] === 'string' && item[f].length > 500 && item[f].startsWith('data:')) { item[f] = null; changed = true; } if (item[f] && item[f].data && typeof item[f].data === 'string' && item[f].data.startsWith('data:')) { item[f] = { name: item[f].name || 'dosya', _stripped: true }; changed = true; } }); }); if (changed) localStorage.setItem(k, JSON.stringify(parsed)); } catch(e) {} });
    var _et = 0; Object.keys(localStorage).forEach(function(k) { _et += (localStorage.getItem(k) || '').length * 2; }); console.log('[EMERGENCY] Sonuç: %' + Math.round(_et / (5 * 1024 * 1024) * 100) + ' dolu');
  } catch(e) { console.warn('[EMERGENCY] Hata:', e); }

  try {
    var trash = loadTrash();
    if (trash.length > 50) { storeTrash(trash.slice(0, 50)); console.log('[DB] Trash temizlendi:', trash.length, '→ 50'); }
    var tasks = loadTasks();
    if (tasks.length > 300) {
      var active = tasks.filter(function(t) { return !t.isDeleted && t.status !== 'done'; });
      var done = tasks.filter(function(t) { return t.status === 'done' && !t.isDeleted; }).slice(-50);
      saveTasks(active.concat(done));
      console.log('[DB] Tasks kırpıldı:', tasks.length, '→', active.length + done.length);
    }
    // Tüm ak_ key'lerinde base64 veri temizle
    var _b64cleaned = 0;
    Object.keys(localStorage).forEach(function(k) {
      if (!k.startsWith('ak_')) return;
      var raw = localStorage.getItem(k);
      if (!raw || raw.length < 50000) return; // 50KB altı atla
      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        var changed = false;
        parsed.forEach(function(item) {
          if (!item || typeof item !== 'object') return;
          // docs array
          if (Array.isArray(item.docs)) {
            item.docs = item.docs.map(function(d) {
              if (d && d.data && typeof d.data === 'string' && d.data.length > 1000) {
                changed = true; _b64cleaned++;
                return { name: d.name || 'dosya', ts: d.ts, url: d.url || null, _stripped: true };
              }
              return d;
            });
          }
          // Tekil alanlar
          ['receipt', 'img', 'image', 'file', 'imgdata'].forEach(function(f) {
            if (item[f] && typeof item[f] === 'string' && item[f].length > 1000 && item[f].startsWith('data:')) {
              item[f] = null; changed = true; _b64cleaned++;
            }
            if (item[f] && item[f].data && typeof item[f].data === 'string' && item[f].data.length > 1000) {
              item[f] = { name: item[f].name || 'dosya', _stripped: true }; changed = true; _b64cleaned++;
            }
          });
        });
        if (changed) { localStorage.setItem(k, JSON.stringify(parsed)); }
      } catch (e) { /* JSON parse hatası — atla */ }
    });
    if (_b64cleaned) console.log('[DB] Base64 temizlendi:', _b64cleaned, 'alan');
    // taskChats base64 temizle
    try { var _tcb = JSON.parse(localStorage.getItem('ak_task_chat1') || '{}'); var _tcbc = false; Object.keys(_tcb).forEach(function(k) { (_tcb[k] || []).forEach(function(m) { if (m.file && m.file.data && typeof m.file.data === 'string' && m.file.data.startsWith('data:')) { m.file = { name: m.file.name || 'dosya', _stripped: true }; _tcbc = true; } Object.keys(m).forEach(function(f) { if (m[f] && typeof m[f] === 'string' && m[f].startsWith('data:') && m[f].length > 1000) { m[f] = '[dosya-stripped]'; _tcbc = true; } if (m[f] && m[f].data && typeof m[f].data === 'string' && m[f].data.startsWith('data:')) { m[f] = { name: m[f].name || 'dosya', _stripped: true }; _tcbc = true; } }); }); }); if (_tcbc) { localStorage.setItem('ak_task_chat1', JSON.stringify(_tcb)); console.log('[DB] taskChats base64 temizlendi'); } } catch (e) {}
    // tasks base64 temizle
    try { var _tkb = JSON.parse(localStorage.getItem('ak_tk2') || '[]'); var _tkbc = false; _tkb.forEach(function(t) { ['docs', 'attachments', 'files'].forEach(function(f) { if (Array.isArray(t[f])) { t[f] = t[f].map(function(d) { if (d && d.data && typeof d.data === 'string' && d.data.startsWith('data:')) { _tkbc = true; return { name: d.name || 'dosya', url: d.url || null, _stripped: true }; } return d; }); } }); ['receipt', 'img', 'image', 'file'].forEach(function(f) { if (t[f] && typeof t[f] === 'string' && t[f].startsWith('data:')) { t[f] = null; _tkbc = true; } }); }); if (_tkbc) { localStorage.setItem('ak_tk2', JSON.stringify(_tkb)); console.log('[DB] tasks base64 temizlendi'); } } catch (e) {}
    // Koleksiyon limitleri
    var _trim = function(key, max) { try { var d = JSON.parse(localStorage.getItem(key) || '[]'); if (d.length > max) { localStorage.setItem(key, JSON.stringify(d.slice(-max))); console.log('[DB]', key, d.length, '→', max); } } catch(e) {} };
    _trim(KEYS.notifications, 30); _trim(KEYS.activity, 50); _trim(KEYS.trash, 30);
    _trim(KEYS.odemeler, 500); _trim(KEYS.tahsilat, 500); _trim(KEYS.kpiLog, 200);
    try { var tc = JSON.parse(localStorage.getItem(KEYS.taskChats) || '{}'); var tcC = false; Object.keys(tc).forEach(function(tid) { if (Array.isArray(tc[tid]) && tc[tid].length > 20) { tc[tid] = tc[tid].slice(-20); tcC = true; } }); if (tcC) { localStorage.setItem(KEYS.taskChats, JSON.stringify(tc)); } } catch(e) {}
  } catch (e) { console.warn('[DB] Storage clean:', e); }
})();

})();
