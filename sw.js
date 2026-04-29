/**
 * ════════════════════════════════════════════════════════════════
 * sw.js — Service Worker v1.0
 * Duay Global Trade Operasyon Platformu
 *
 * Strateji: Cache-First for statics, Network-First for API
 * ════════════════════════════════════════════════════════════════
 */

/* [CACHE-BUMP-2026-04-24-V22] Oturum sonu bump — 26 commit aktivasyon */
/* [CACHE-BUMP-2026-04-24-V23] SW fetch handler aktivasyon — SW-EXTERNAL-API-PASSTHROUGH-001 */
/* [CACHE-BUMP-2026-04-25-V24] PDF Harmonize + ORD kripto + Format D D1+D2 aktivasyon */
/* [CACHE-BUMP-2026-04-25-V25] Banka bilgisi para birimi otomatik (PI-BANKA-001) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V26] PI tek banka render (CLAUDE-KURAL-PI-001 madde 2) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V27] PI tarih DD MMM YYYY (CLAUDE-KURAL-PI-001 madde 1) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V28] PI ortak bilgi standardı (CLAUDE-KURAL-PI-001 madde 5) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V29] duayCode → duayKodu rename + migration (ALIS-001) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V30] PI %100 EN (CLAUDE-KURAL-PI-001 madde 3+4) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V32] PI ön kontrol (madde 7) + ALIS-002 createdBy standardize aktivasyon */
/* [CACHE-BUMP-2026-04-25-V33] FİX-PI-A-001 Format A duplicate Terms + Banking ünvan EN aktivasyon */
/* [CACHE-BUMP-2026-04-25-V34] PI-001 sprint kapanış (8 madde TAMAM) */
/* [CACHE-BUMP-2026-04-25-V35] ALIS-003+004+005 + PUSULA-002+012 + SATIS-001+002+006+008+009 toplu */
/* [CACHE-BUMP-2026-04-26-V36] FIRMA-INFO paketi (001-007) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V37] PI-FIX paketi (001-005) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V38] PI-FIX-007 (header WA+Web) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V39] URUN-IMG-001 + ROLE-FIX-001 aktivasyon */
/* [CACHE-BUMP-2026-04-27-V40] LOJ-1A (expected_deliveries Sil butonu) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V41] LOJ-1B-A (expected_deliveries Düzenle modal) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V42] LOJ-1B-B (expected_deliveries Onay & Satınalma 4 alan) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V43] LOJ-1B-C1 (inline status combobox + DEPODA + statusHistory) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V44] MODAL-FIX-001 (autoFillKonteynUrl + 13 carrier) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V45] LOJ-1B-C2 (Sevkiyat & Takip 5 alan + auto-fill tracking URL) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V46] LOJ-1B-C3 (Tracking URL tek tıkla aç butonu) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V47] LOJ-1B-C4 (Belge PDF Storage upload) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V48] LOJ-1B-D (Gelen/Giden + filtre + arama bar) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V49] LOJ-1B-E (Aksiyon menüsünde Eke göz at) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V50] LOJ-FIX-001 (akıllı GECIKTI override) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V51] LOJ-FIX-002 (Sevkiyat Merkezi auto re-render) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V52] LOJ-1B-G (Sorumlu + ikon kolonları + tedarikçi fix) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V53] LOJ-1B-H (24h+ non-admin pending action) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V54] LOJ-1B-I (Admin onay UI: pending modal) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V55] SETTINGS-001 (Admin rol bilgi paneli + 4 çelişki) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V56] LOJ-1B-F (pending approve/reject statusHistory audit) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V75] PP-MODAL-CONDITIONAL-003 (Kredi + Diger placeholder, 8 TİP TAMAMLANDI) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V76] SW-PRECACHE-AUTOSYNC-001 (PRECACHE_URLS otomatik senkron) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V77] DEAD-CORE-CLEANUP-001 (7 dead file silindi + storage_audit taşındı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V78] SYNC-EXPECTED-DELIVERIES-001 (Sevkiyat realtime sync aktive) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V79] SYNC-GAP-CLOSE-001 (6 SYNC_MAP eklenti + tatilAyarlar Firestore yazımı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V80] SYNC-MODULE-MAPPING-FIX-001 (10 lazy mapping eksiği kapatıldı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V81] SYNC-CACHE-INVALIDATE-FIX-001 (_memCache direkt invalidate) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V82] WRITE-LOCAL-FOUNDATION-001 — _writeLocal fn aktivasyon */
/* [CACHE-BUMP-2026-04-29-V83] WRITE-REMOTE-FOUNDATION-001 — _writeRemote fn aktivasyon */
/* [CACHE-BUMP-2026-04-29-V84] CASH-FLOW-MODULE-001 — Nakit Akışı Manuel MVP modülü */
/* [CACHE-BUMP-2026-04-29-V85] LISTENER-WRITE-UNIFY-001 — listener _writeLocal entegrasyonu + _writingLock unify */
/* [CACHE-BUMP-2026-04-29-V86] NOMERGE-USERFILTER-FIX-001 — yetki-filtreli koleksiyonlar merge mode'a alındı */
/* [CACHE-BUMP-2026-04-29-V87] WRITE-REMOTE-MERGE-BY-ID-001 — _writeRemote merge by-id mantığı */
/* [CACHE-BUMP-2026-04-29-V88] STORE-CARI-MIGRATE-PILOT-001 — storeCari _writeRemote'a migrate (pilot) */
/* [CACHE-BUMP-2026-04-29-V89] STORE-MIGRATE-BATCH-A-001 — storeUrunler + storeSatinalma migrate */
/* [CACHE-BUMP-2026-04-29-V90] STORE-MIGRATE-BATCH-B-001 — storeAlisTeklifleri + storeSatisTeklifleri migrate */
/* [CACHE-BUMP-2026-04-29-V91] STORE-MIGRATE-APPEND-ONLY-001 — saveAct + storeNotifs + storeTaskChats migrate */
/* [CACHE-BUMP-2026-04-29-V92] CLEAN-NOTIFS-MIGRATE-001 — _cleanNotifications admin fn _writeRemote'a migrate */
/* [CACHE-BUMP-2026-04-29-V93] CARI-DISPLAY-FIX-001 — schema unify (unvan || ad || name) display helper */
/* [CACHE-BUMP-2026-04-29-V94] CARI-RESTORE-RESPECT-001 — _mergeDataSets restore-respect rule (cross-tab restore safe) */
/* [CACHE-BUMP-2026-04-29-V95] CASH-FLOW-MENU-FIX-001 — üst nav Muhasebe altmenüsüne Nakit Akışı Manuel item eklendi */
/* [CACHE-BUMP-2026-04-29-V96] DEMO-REMOVE-001 — Demo button + 3 demo fn (_insertDemoUrunler + _insertCariDemoData + _temizleDemoVeri) silindi */
/* [CACHE-BUMP-2026-04-29-V97] SATIS-EMOJI-NAV-001 — Satış teklifi ürün satırından Ürün Kataloğuna emoji navigation aktivasyon */
/* [CACHE-BUMP-2026-04-29-V98] SATIS-PI-DESIGN-CLEANUP-001 — 4 PI tasarımı silindi (C/I/L/O), 4 korundu (A/B/D1/D2) (T1: ae70269) */
/* [CACHE-BUMP-2026-04-29-V99] SATIS-FORM-GORSEL-FIX-001 — Satış teklifi form ürün satırı görsel render fix (u.gorsel || u.image fallback) (T1: ca7a193) */
const CACHE_NAME    = 'duay-platform-v99';
const CACHE_VERSION = '99.0.0';

// Offline'da kesinlikle çalışması gereken dosyalar
// [SW-PRECACHE-AUTOSYNC-001 START]
const PRECACHE_URLS = [
  // OTOMATIK ÜRETİM — manuel düzenleme yapma. Sync için: bash scripts/sync-sw.sh
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/config/firebase.js',
  '/src/i18n/translations.js',
  '/src/core/idb.js',
  '/src/core/smart_storage.js',
  '/src/core/database.js',
  '/src/modules/storage_monitor.js',
  '/src/modules/form_draft_engine.js',
  '/src/core/aux_sync.js',
  '/src/core/cache.js',
  '/src/core/utils.js',
  '/src/core/auth.js',
  '/src/core/storage_helpers.js',
  '/src/core/gdrive.js',
  '/src/modules/cari_utils.js',
  '/src/modules/panel_stubs.js',
  '/src/modules/admin.js',
  '/src/modules/user_settings.js',
  '/src/modules/kargo.js',
  '/src/modules/navlun.js',
  '/src/modules/loj_features.js',
  '/src/modules/pirim.js',
  '/src/modules/pusula_pro.js',
  '/src/modules/ik.js',
  '/src/modules/crm.js',
  '/src/modules/stok.js',
  '/src/modules/urun_db.js',
  '/src/modules/satis_teklif.js',
  '/src/modules/satin_alma_v2.js',
  '/src/modules/satin_alma_v2_render.js',
  '/src/modules/satin_alma_v2_liste.js',
  '/src/modules/satin_alma_v2_satis.js',
  '/src/modules/satin_alma_v2_form.js',
  '/src/modules/satin_alma_v2_csv.js',
  '/src/modules/satin_alma_v2_duzenleme.js',
  '/src/modules/satin_alma_v2_pi.js',
  '/src/modules/fason.js',
  '/src/modules/fason_checklist.js',
  '/src/modules/platform_standartlari.js',
  '/src/modules/hesap_ozeti.js',
  '/src/modules/muavin.js',
  '/src/modules/muavin_parse.js',
  '/src/modules/hesap_mutabakati.js',
  '/src/modules/muavin_export.js',
  '/src/modules/gcb.js',
  '/src/modules/alarm.js',
  '/src/modules/excel_import.js',
  '/src/modules/finans.js',
  '/src/modules/helpers.js',
  '/src/modules/announce.js',
  '/src/modules/hedefler.js',
  '/src/modules/odemeler.js',
  '/src/modules/nakit_akis.js',
  '/src/modules/cash_flow.js',
  '/src/modules/kpi.js',
  '/src/modules/ik_panel.js',
  '/src/modules/puantaj.js',
  '/src/modules/izin.js',
  '/src/modules/crm_panel.js',
  '/src/modules/extra_panels.js',
  '/src/modules/docs.js',
  '/src/modules/formlar.js',
  '/src/modules/gorusme.js',
  '/src/modules/ceo.js',
  '/src/modules/hesap.js',
  '/src/modules/hesap_makinesi.js',
  '/src/core/confirm_modal.js',
  '/src/modules/modals.js',
  '/src/modules/dashboard.js',
  '/src/modules/dashboardDetay.js',
  '/src/modules/urunler.js',
  '/src/modules/ihracat_listesi.js',
  '/src/modules/numuneler.js',
  '/src/modules/ihracat_ops.js',
  '/src/modules/ihracat_belgeler.js',
  '/src/modules/ihracat_formlar.js',
  '/src/modules/talimatlar.js',
  '/src/modules/expected_deliveries.js',
  '/src/core/draft_manager.js',
  '/src/core/app.js',
  '/src/modules/app_patch.js',
  '/src/modules/lojistik.js',
  '/src/modules/ik_hub.js',
  '/src/modules/iddia.js',
  '/src/modules/sozler.js',
  '/src/modules/crm_hub.js',
];
// [SW-PRECACHE-AUTOSYNC-001 END]

// ── Install: tüm statik dosyaları cache'e al ──────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Hata olursa tek tek deneyerek yükle (bazı dosyalar yoksa atlansın)
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Cache edilemedi:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: eski cache'leri temizle ────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activate v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eski cache siliniyor:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-First (statik), Network-First (API) ─────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // [SW-FIX-001 START] Firebase API'leri SW'den İZOLE — browser doğrudan halletsin
  // (Firestore onSnapshot stream stabilitesi + token refresh + auth flow + storage)
  // Eski [SW-FIREBASESTORAGE-BYPASS-001] bu blokla genişletildi (firebasestorage dahil)
  const FIREBASE_HOSTS = [
    'firestore.googleapis' + '.com',
    'firebaseio' + '.com',
    'securetoken.googleapis' + '.com',
    'identitytoolkit.googleapis' + '.com',
    'firebaseinstallations.googleapis' + '.com',
    'firebasestorage.googleapis' + '.com',
    'fcmregistrations.googleapis' + '.com',
    'fcm.googleapis' + '.com',
    'apis.google' + '.com'
  ];
  const __isFirebaseRequest = FIREBASE_HOSTS.some(function(h) {
    return url.hostname === h || url.hostname.endsWith('.' + h);
  });
  if (__isFirebaseRequest) {
    return; // SW DOKUNMA — browser native handle eder
  }
  // [SW-FIX-001 END]

  // Firebase, CDN ve dış API'lar → Network-First
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('exchangerate-api') ||
    url.hostname.includes('open.er-api') ||
    /* [SW-EXTERNAL-API-PASSTHROUGH-001] Kur/altın/proxy API'leri eksikti — respondWith null hatası fix */
    url.hostname.includes('frankfurter') ||
    url.hostname.includes('goldapi') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('tcmb.gov.tr')
  ) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Statik dosyalar → Network-First, offline'da cache fallback
  if (
    request.method === 'GET' && (
      url.pathname.endsWith('.js')  ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.html')||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.json')
    )
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cache.match(request))
      )
    );
    return;
  }

  // Diğer istekler → normal network, offline'da index.html fallback
  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === 'navigate') return caches.match('/index.html');
      return caches.match(request);
    })
  );
});

// ── Push bildirimleri (opsiyonel) ────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Duay Platform', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag:  data.tag || 'default',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const url = event.notification.data?.url || '/';
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
