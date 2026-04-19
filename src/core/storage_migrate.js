/**
 * MIGRATION-TOOL-001 — LS → IDB tek seferlik büyük key taşıma aracı
 * STORAGE-ARCHITECTURE-ROOT-FIX-001
 */
(function() {
  'use strict';

  var THRESHOLD_BYTES = 5 * 1024;
  var KEY_STORE_MAP = {
    'ak_urunler1': 'urunler', 'ak_urun_db1': 'urunler',
    'ak_satinalma1': 'satinalma', 'ak_satinalma_v2': 'satinalma', 'ak_alis_teklif1': 'satinalma',
    'ak_satis_teklif1': 'satisTeklifleri', 'ak_cmp_teklif1': 'satisTeklifleri', 'ak_crm_teklif1': 'satisTeklifleri',
    'ak_odm1': 'odemeler', 'ak_tahsilat1': 'tahsilat',
    'ak_cari1': 'cari', 'ak_tasks': 'tasks', 'ak_task_chat1': 'tasks',
    'ak_pusula_pro_v1': 'pusulaPro',
    'ak_pp_abonelik_v1': 'pusulaPro', 'ak_pp_challenge_v1': 'pusulaPro',
    'ak_pp_goal_v1': 'pusulaPro', 'ak_pp_habit_v1': 'pusulaPro',
    'ak_pp_hayat_v1': 'pusulaPro', 'ak_pp_notlar_v1': 'pusulaPro',
    'ak_pp_odemeler_v1': 'pusulaPro', 'ak_pp_oncelikler_v1': 'pusulaPro',
    'ak_pp_review_v1': 'pusulaPro', 'ak_pp_skor_v1': 'pusulaPro',
    'ak_pp_takvim_v1': 'pusulaPro',
    'ak_notif1': 'notif', 'ak_ann1': 'notif',
    'ak_act1': 'activity', 'ak_activity1': 'activity', 'ak_activity_v1': 'activity'
  };

  function _byteSize(str) {
    try { return new Blob([str]).size; } catch(e) { return String(str || '').length * 2; }
  }

  /**
   * window._storageMigrate(opts)
   * opts: { dryRun: true/false (default false), minBytes: 5120 }
   * Returns rapor: { tasinanlar, atlananlar, hatalilar, toplamKazancKB }
   */
  window._storageMigrate = async function(opts) {
    opts = opts || {};
    var dryRun = !!opts.dryRun;
    var minBytes = opts.minBytes || THRESHOLD_BYTES;
    var rapor = { tasinanlar: [], atlananlar: [], hatalilar: [], toplamKazancKB: 0, dryRun: dryRun, basladı: new Date().toISOString() };

    if (typeof window.idbSet !== 'function' || typeof window.idbGet !== 'function') {
      rapor.hatalilar.push({ err: 'idb helpers yüklenmemiş — script sırasını kontrol et' });
      console.error('[MIGRATION-TOOL-001] idb helpers yok');
      return rapor;
    }

    var keyler = Object.keys(localStorage);
    for (var i = 0; i < keyler.length; i++) {
      var k = keyler[i];
      if (k.indexOf('ak_') !== 0 && k.indexOf('pp_') !== 0 && k.indexOf('__idbref_') !== 0) continue;
      if (k.indexOf('__idbref_') === 0) continue; /* reference'ları atla */

      var raw;
      try { raw = localStorage.getItem(k); } catch(e) { continue; }
      if (raw === null || raw === undefined) continue;

      var size = _byteSize(raw);
      if (size < minBytes) {
        rapor.atlananlar.push({ key: k, kb: (size / 1024).toFixed(2), neden: '5KB altı (LS\'de kalsın)' });
        continue;
      }

      var store = KEY_STORE_MAP[k] || 'misc';

      /* Değeri parse et — JSON ise obje, değilse string */
      var parsed;
      try { parsed = JSON.parse(raw); } catch(e) { parsed = raw; }

      if (dryRun) {
        rapor.tasinanlar.push({ key: k, kb: (size / 1024).toFixed(2), store: store, mode: 'DRY-RUN' });
        rapor.toplamKazancKB += size / 1024;
        continue;
      }

      /* Gerçek taşıma */
      try {
        var idbBasari = await window.idbSet(k, parsed, store);
        if (!idbBasari) throw new Error('idbSet false döndü');

        /* LS'ten sil, sadece reference bırak */
        try { localStorage.setItem('__idbref_' + k, '1'); } catch(e) {}
        try { localStorage.removeItem(k); } catch(e) {}

        rapor.tasinanlar.push({ key: k, kb: (size / 1024).toFixed(2), store: store, mode: 'TAŞINDI' });
        rapor.toplamKazancKB += size / 1024;
      } catch(e) {
        rapor.hatalilar.push({ key: k, kb: (size / 1024).toFixed(2), hata: e.message || String(e) });
      }
    }

    rapor.toplamKazancMB = (rapor.toplamKazancKB / 1024).toFixed(2);
    rapor.bitti = new Date().toISOString();
    console.log('[MIGRATION-TOOL-001] Rapor:', rapor);
    return rapor;
  };

  /**
   * window._storageRollback(key) — tek key'i IDB'den LS'e geri al
   * Kayıt hatalarında kullanım: _storageRollback('ak_urunler1')
   */
  window._storageRollback = async function(key) {
    try {
      var store = KEY_STORE_MAP[key] || 'misc';
      var val = await window.idbGet(key, store);
      if (!val) return { ok: false, err: 'IDB\'de bulunamadı' };
      var str = (typeof val === 'string') ? val : JSON.stringify(val);
      localStorage.setItem(key, str);
      localStorage.removeItem('__idbref_' + key);
      await window.idbDelete(key, store);
      return { ok: true, key: key, bytes: _byteSize(str) };
    } catch(e) { return { ok: false, err: e.message }; }
  };

  window._storageMigrateHelp = function() {
    console.log('[MIGRATION-TOOL-001] Komutlar:');
    console.log('  await _storageMigrate({dryRun: true})  → ÖNİZLEME (veri silmez)');
    console.log('  await _storageMigrate()                → GERÇEK taşıma (LS→IDB)');
    console.log('  await _storageRollback("ak_urunler1")  → tek key geri al');
  };

  console.log('[MIGRATION-TOOL-001] hazır. _storageMigrateHelp() ile komut listesi.');
})();
