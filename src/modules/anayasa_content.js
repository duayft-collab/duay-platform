'use strict';
/* ════════════════════════════════════════════════════════════
   src/modules/anayasa_content.js — Anayasa İçerik Proxy

   V194e-3b: Veri core/duay_anayasa_master.js'e taşındı.
   Bu dosya artık geriye uyumluluk için ince proxy.

   KX10 + KX11 uyumlu — ortak veri tek kaynak (master), modül
   sadece tüketici.

   Kullanım: window.ANAYASA_CONTENT (read-only).
   Kaynak:   window.DUAY_ANAYASA_GET() (core/duay_anayasa_master.js)
   ════════════════════════════════════════════════════════════ */
(function() {
  if (typeof window.DUAY_ANAYASA_GET !== 'function') {
    console.error('[ANAYASA_CONTENT] HATA: DUAY_ANAYASA_GET accessor yok. ' +
                  'core/duay_anayasa_master.js bu dosyadan ONCE yuklenmeli.');
    return;
  }
  var c = window.DUAY_ANAYASA_GET();
  if (!c) { console.warn('[ANAYASA_CONTENT] Master accessor null dondu.'); return; }
  console.log('[ANAYASA_CONTENT] V194e-3b proxy: master\'dan', c.belgeler.length, 'belge,', c.kx_kurallari.length, 'KX maddesi.');
})();
