/**
 * ════════════════════════════════════════════════════════════════════
 * sw.js — V193 EDIT 7.1.7 KILL-SWITCH (GEÇİCİ — 5-10 dk yayında kalır)
 * ════════════════════════════════════════════════════════════════════
 *
 * AMACI:
 *   Mevcut canlıdaki ESKİ SW'lerin auto-update mekanizması yok. Bu yüzden
 *   yeni sürümleri (V193e7p2 ve sonrası) fark edemiyorlar. Kullanıcılar
 *   manuel cache temizleme yapmadan eski sürümde takılı kalıyor.
 *
 * NASIL ÇALIŞIR:
 *   1. Eski SW Network-First strateji ile periyodik olarak sw.js'i kontrol eder
 *   2. Bu kill-switch'i indirir → install + skipWaiting → activate
 *   3. Activate handler:
 *      a) Tüm CacheStorage cache'lerini siler
 *      b) self.registration.unregister() — SW'i sistemden tamamen kaldırır
 *      c) Açık tüm client'ları reload eder
 *   4. Reload sonrası sayfa SW'siz açılır → tarayıcı doğrudan GitHub Pages'tan
 *      yükler → 5-10 dk sonra asıl sw.js (V193e7p2 + auto-update) geri push'lanır
 *      → temiz başlangıç + kalıcı auto-update mekanizması
 *
 * KULLANICI HİÇBİR ŞEY YAPMAZ:
 *   - Cache temizleme yok
 *   - Hard reload yok
 *   - Konsol yok
 *   - Slack mesajı yok
 *   Sadece sayfa kendi kendine yenilenir, sonraki güncellemelerde de öyle.
 *
 * ÖNEMLİ:
 *   Bu dosya 5-10 dakika SONRA asıl sw.js (sw.js.real yedek) ile değiştirilecek.
 *   Bu süre içinde yeni satır eklenmez, başka feature push edilmez — sadece
 *   eşik atlatma penceresi.
 *
 * V193 EDIT 7.1.7 · 2026-05-06 · Tek seferlik kullanım
 * ════════════════════════════════════════════════════════════════════
 */
'use strict';

const KILL_VERSION = 'KILL-SWITCH-V193e7p3';
console.log('[SW]', KILL_VERSION, '— eski SW kaldırılıyor, cache temizleniyor');

/* Install — beklemeden aktive ol */
self.addEventListener('install', event => {
  console.log('[SW]', KILL_VERSION, 'install — skipWaiting');
  self.skipWaiting();
});

/* Activate — kendini öldür */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      /* 1) Tüm CacheStorage cache'lerini sil — eski 'duay-platform-v193*' dahil hepsi */
      const keys = await caches.keys();
      console.log('[SW]', KILL_VERSION, 'cache silinecek sayı:', keys.length, keys);
      await Promise.all(keys.map(k => caches.delete(k)));

      /* 2) Tüm açık client'ları (sekmeleri) reload et — kullanıcı fark etmeden yenilenir.
       *    Önce reload, sonra unregister — aksi halde unregister sonrası client'lara
       *    erişim kaybolur. */
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      console.log('[SW]', KILL_VERSION, 'reload edilecek sekme sayısı:', clientList.length);
      for (const client of clientList) {
        try {
          if ('navigate' in client) {
            /* navigate(url) → SW olmadan tekrar yükle. URL'e cache-buster eklemek
             * isabetli olur ama Safari bazı URL paramlarında HTTP cache'i de bypass
             * eder, ek paramsız doğru URL yeter — SW kalktığı için browser doğrudan
             * GitHub Pages'tan yükleyecek. */
            await client.navigate(client.url);
          }
        } catch (e) {
          console.warn('[SW] navigate err:', e && e.message);
        }
      }

      /* 3) Bu SW kaydını sistemden tamamen kaldır — bir daha çalışmasın.
       *    Sonraki sayfa açılışında index.html navigator.serviceWorker.register('./sw.js')
       *    çağıracak ve o zaman ASIL sw.js (V193e7p2) yeniden kayıt olacak. */
      await self.registration.unregister();
      console.log('[SW]', KILL_VERSION, 'unregistered ✓ — bir sonraki yüklemede ASIL sw.js gelecek');
    } catch (e) {
      console.error('[SW]', KILL_VERSION, 'aktivasyon hatası:', e);
    }
  })());
});

/* Fetch — hiçbir şey yapma, browser doğrudan halletsin.
 * (event.respondWith çağırmazsak browser default davranışa düşer = network) */
self.addEventListener('fetch', event => {
  /* no-op */
});

/* Message — eski SW'lerden gelen SKIP_WAITING gibi mesajları görmezden gel */
self.addEventListener('message', event => {
  /* no-op */
});
