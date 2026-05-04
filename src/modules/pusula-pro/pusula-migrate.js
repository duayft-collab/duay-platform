/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-migrate.js — V170.3.7 POPULATE
   Sorumluluk: Eski Pusula → Pusula Pro veri migration (idempotent)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-MIGRATE-POPULATE-001
   Kaynak: pusula_pro.js bölgesi (KX8 birebir kopya):
       _ppTakvimMigration  L2190-2225  Eski takvim → PusulaPro takvim
                           Idempotent guard: ak_pp_takvim_migration_v1 flag
                           CAL-{id} prefix ile çakışma önlemi
                           5 tip mapping (meeting/deadline/holiday/task/personal)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.migrate (nested core ekosistem)
   ⚠ DEFENSIVE: toplu guard (Object.assign atlanır, eski tanım korunur)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ IDEMPOTENT: localStorage 'ak_pp_takvim_migration_v1' flag
                 → bir kez çalışır, sonra atlanır
   ⚠ Bağımlılık: window._ppTakvimLoad/Store (store ✓ Cycle 3.2.4)
                 window._ppNow (core ✓ Cycle 3.1)
                 window.loadCal (eski Pusula app, typeof guard'lı)
                 window.toast (optional, && guard'lı)
   ⚠ Çağrılma noktası: pusula_pro.js L2273 — _ppRender içinde otomatik tetikli
                       Bu çağrı render-list/board cycle'larında gelecek
   ⚠ V169 wrapper (pusula_pro_migrate_x.js) farklı bir migration —
       LZString sıkıştırma + Firestore senkron (DOKUNULMAZ KX9)
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.migrate) window.PusulaPro.migrate = {};
  if (window._ppMigrateLoaded) return;
  window._ppMigrateLoaded = true;

window._ppTakvimMigration = function() {
  if (localStorage.getItem('ak_pp_takvim_migration_v1')) return;
  var calEvents = typeof window.loadCal === 'function' ? window.loadCal() : [];
  if (!calEvents || !calEvents.length) return;
  var ppMevcut = _ppTakvimLoad();
  var mevcutIdler = ppMevcut.map(function(o){ return o.id; });
  var tipKategori = { meeting:'TOPLANTI', deadline:'SON TARİH', holiday:'TATİL', task:'GÖREV', personal:'KİŞİSEL' };
  var eklenen = 0;
  calEvents.forEach(function(e) {
    var yeniId = 'CAL-' + e.id;
    if (mevcutIdler.indexOf(yeniId) !== -1) return;
    ppMevcut.push({
      id: yeniId,
      baslik: e.title || e.desc || '—',
      kategori: tipKategori[e.type] || 'DİĞER',
      periyot: 'Tek Seferlik',
      periyotDetay: (e.date || '') + (e.time ? ' ' + e.time : ''),
      sorumluUnvan: '',
      oncelik: e.type === 'deadline' ? 'Yüksek' : 'Normal',
      hatirlatmaGun: 1,
      durum: 'active',
      createdAt: e.updatedAt || _ppNow(),
      sonrakiCalisma: e.date || null,
      aciklama: e.desc || '',
      isDeleted: false,
      kaynak: 'eski-takvim'
    });
    eklenen++;
  });
  if (eklenen > 0) {
    _ppTakvimStore(ppMevcut);
    localStorage.setItem('ak_pp_takvim_migration_v1', '1');
    console.log('[PP-TAKVIM] Migration: ' + eklenen + ' etkinlik aktarıldı');
    window.toast && window.toast('Eski takvimden ' + eklenen + ' etkinlik aktarıldı', 'ok');
  }
};

  /* ── V170.3.7 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppTakvimMigration) {
    Object.assign(window, {
      _ppTakvimMigration: window._ppTakvimMigration
    });
  }

  /* ── V170.3.7 CANONICAL PusulaPro.migrate EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.migrate, {
    _ppTakvimMigration: window._ppTakvimMigration
  });
})();
