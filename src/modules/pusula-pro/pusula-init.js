/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-init.js — V170.3.16 POPULATE
   Sorumluluk: Boot zinciri + 16 modül load guard kontrolü + orphan sweep
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-INIT-POPULATE-001
   Kaynak: pusula_pro.js bölgesi (KX8 birebir kopya):
       _ppOrphanMesajSweep   L886-914  Orphan görev mesaj key temizleme
       Boot block            L915-924  Window expose + setTimeout 5s + 1h interval
                                       PusulaProLoaded flag
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.init (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ V170 SON DOSYA — 16/16 dosya POPULATE bu cycle ile bitiyor
   ⚠ BOOT TIMING:
       - Init'te 5s sonra ilk sweep (yükleme yarışı önlemek için)
       - Sonra 1 saatte bir periyodik sweep
       - localStorage'da 'ak_pp_gorev_mesaj_<taskId>' key'leri tara
       - Görev silinmişse mesaj key'i de sil (tombstone temizliği)
   ⚠ LOAD GUARD KONTROLÜ:
       16 modülün hepsinin _ppXxxLoaded flag'i set olmuş mu?
       Eksikse console.warn (Cycle 4 aktivasyon teşhisi için)
   ⚠ Bağımlılık: window._ppLoad (store ✓ Cycle 3.2.4)
                 localStorage (browser native)
                 window._ppDebug (core ✓ Cycle 3.1)
                 window._ppRender (render-list ✓ Cycle 3.2.7)
                 window._ppExport (sync ✓ Cycle 3.2.5)
                 window._ppStore (store ✓ Cycle 3.2.4)
   ⚠ V170.3.16 EK: 16 modül load guard cross-check
                   (orijinal pusula_pro.js'te yoktu — defensive ek, davranış değiştirmez)
══════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.init) window.PusulaPro.init = {};
  if (window._ppInitLoaded) return;
  window._ppInitLoaded = true;

function _ppOrphanMesajSweep() {
  try {
    var tasks = _ppLoad() || [];
    var validIds = {};
    tasks.forEach(function(t) {
      if (t && t.id != null) validIds[String(t.id)] = true;
    });
    var removed = 0;
    var totalBytes = 0;
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var k = localStorage.key(i);
      if (!k || k.indexOf('ak_pp_gorev_mesaj_') !== 0) continue;
      var taskId = k.replace('ak_pp_gorev_mesaj_', '');
      if (!validIds[taskId]) {
        var val = localStorage.getItem(k) || '';
        totalBytes += new Blob([val]).size;
        localStorage.removeItem(k);
        removed++;
      }
    }
    if (removed > 0) {
      console.log('[LS-SYNC-008] ' + removed + ' orphan mesaj key temizlendi (~' + (totalBytes/1024).toFixed(1) + ' KB)');
    }
    return { removed: removed, bytes: totalBytes };
  } catch(e) {
    console.warn('[LS-SYNC-008]', e && e.message);
    return { removed: 0, bytes: 0, err: e.message };
  }
}
window._ppOrphanMesajSweep = _ppOrphanMesajSweep;

/* LS-SYNC-008: init'te 1 kez, sonra 1 saatte bir sweep (sürekli çalıştır'ma yük olur) */
setTimeout(function(){ _ppOrphanMesajSweep(); }, 5000);
setInterval(function(){ _ppOrphanMesajSweep(); }, 60 * 60 * 1000);
window._ppStore  = _ppStore;
window._ppExport = window._ppExport;
window.renderPusulaPro = window._ppRender;
window.PusulaProLoaded = true;
window._ppDebug('v1.0 yüklendi | Export: window._ppExport()');

  /* ── V170.3.16 EK: 16 modül load guard cross-check (defensive) ── */
  /* Cycle 4 aktivasyon sırasında modül yükleme sırası kritik. Bu          */
  /* kontrol yalnız tanılayıcıdır; başarısız olursa davranış değişmez,     */
  /* sadece console.warn ile uyarı verir. KX8 birebir kopya disiplini      */
  /* korunur — orijinal pusula_pro.js davranışı etkilenmez.                 */
  function _ppModulCrossCheck() {
    var moduller = [
      { ad: 'core',          flag: '_ppIzoleKontrol'     },
      { ad: 'utils',         flag: '_ppHaftaNo'          },
      { ad: 'yasam',         flag: '_ppYasamLoaded'      },
      { ad: 'iletisim',      flag: '_ppIletisimLoaded'   },
      { ad: 'store',         flag: '_ppStoreLoaded'      },
      { ad: 'sync',          flag: '_ppSyncLoaded'       },
      { ad: 'migrate',       flag: '_ppMigrateLoaded'    },
      { ad: 'renderList',    flag: '_ppRenderListLoaded' },
      { ad: 'renderBoard',   flag: '_ppRenderBoardLoaded'},
      { ad: 'renderDetail',  flag: '_ppRenderDetailLoaded'},
      { ad: 'modalTask',     flag: '_ppModalTaskLoaded'  },
      { ad: 'modalPayment',  flag: '_ppModalPaymentLoaded'},
      { ad: 'modalTemplate', flag: '_ppModalTemplateLoaded'},
      { ad: 'actions',       flag: '_ppActionsLoaded'    },
      { ad: 'events',        flag: '_ppEventsLoaded'     },
      { ad: 'init',          flag: '_ppInitLoaded'       }
    ];
    var eksik = [];
    moduller.forEach(function(m) {
      if (typeof window[m.flag] === 'undefined') eksik.push(m.ad);
    });
    if (eksik.length > 0) {
      console.warn('[PP-INIT] V170 modül eksik:', eksik.join(', '));
    } else if (window._ppDebug) {
      window._ppDebug('V170 16/16 modül yüklendi');
    }
    return { yuklenenSayi: moduller.length - eksik.length, toplam: moduller.length, eksik: eksik };
  }
  window._ppModulCrossCheck = _ppModulCrossCheck;


  /* ── V170.3.16 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppOrphanMesajSweep) {
    Object.assign(window, {
      _ppOrphanMesajSweep: window._ppOrphanMesajSweep,
      _ppModulCrossCheck: _ppModulCrossCheck
    });
  }

  /* ── V170.3.16 CANONICAL PusulaPro.init EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.init, {
    _ppOrphanMesajSweep: window._ppOrphanMesajSweep,
    _ppModulCrossCheck: _ppModulCrossCheck
  });

  /* ── BOOT — 16 modül cross-check (DOMContentLoaded sonrası) ── */
  /* Bu çağrı yalnızca diagnostic. Davranış değişmez (orijinalde yoktu). */
  if (typeof setTimeout === 'function') {
    setTimeout(function() { try { _ppModulCrossCheck(); } catch(e) {} }, 100);
  }
})();
