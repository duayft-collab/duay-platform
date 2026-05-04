/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-store.js — V170.3.5 POPULATE
   Sorumluluk: localStorage Load/Store (görev, takvim, ödeme, abonelik)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-STORE-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       Görev               L289-319   _ppLoad + _ppStore
                           (LZString sıkıştırma + Firestore _syncFirestore + storeTasks)
       Takvim              L2117-2120 PP_TAKVIM_KEY + _ppTakvimLoad/Store
       Ödeme/Abonelik      L2769-2776 PP_ODEME_KEY + PP_ABONELIK_KEY + 4 fn
   ──────────────────────────────────────────────────────────────────
   ⚠ MİMARİ KARAR (Mini-Cycle 2.1): store yalnızca CORE veri sahası
       Yasam'a giden:    Skor/Goal/Challenge/Habit/Hayat/Rev/Öncelik (Cycle 3.2.2)
       İletisim'e giden: Mesaj/Not/GorevMesaj (Cycle 3.2.3)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.store (nested core ekosistem)
   ⚠ DEFENSIVE: toplu guard (Object.assign atlanır, eski tanım korunur)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ KX10: 3 sabit DEĞİŞTİRİLMEDİ
       PP_TAKVIM_KEY=ak_pp_takvim_v1, PP_ODEME_KEY=ak_pp_odemeler_v1,
       PP_ABONELIK_KEY=ak_pp_abonelik_v1
   ⚠ Bağımlılık: window.PP_KEY (core, Cycle 3.1)
                 LZString (global, typeof guard'lı orijinal kodda)
                 _fsPath, _syncFirestore (sync, typeof guard'lı)
                 window.storeTasks, window._write, window.KEYS (başka modüller, ?. guard)
   ⚠ KRİTİK: _x wrapper'lar (load_fix_x, migrate_x, sync_x) window._ppLoad/_ppStore
            kullanır — toplu legacy expose ile sağlanır
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.store) window.PusulaPro.store = {};
  if (window._ppStoreLoaded) return;
  window._ppStoreLoaded = true;

/* ── Veri ───────────────────────────────────────────────────── */
function _ppLoad() {
  try {
    var r = localStorage.getItem(PP_KEY);
    if (!r) return [];
    if (r.startsWith('_LZ_') && typeof LZString!=='undefined') return JSON.parse(LZString.decompressFromUTF16(r.slice(4))||'[]');
    return JSON.parse(r);
  } catch(e) { console.warn('[PP] load hata:', e); return []; }
}
function _ppStore(d) {
  try {
    var s = JSON.stringify(d);
    if (typeof LZString!=='undefined' && s.length>500) { localStorage.setItem(PP_KEY,'_LZ_'+LZString.compressToUTF16(s)); }
    else { localStorage.setItem(PP_KEY,s); }
  } catch(e) { console.error('[PP]',e); }
  try {
    var _ppFp = typeof _fsPath === 'function' ? _fsPath('pusula') : null;
    if (_ppFp && typeof _syncFirestore === 'function') {
      _syncFirestore(_ppFp, d);
    }
    /* PUSULA-SYNC-TEST-001: sync path görünürlüğü */
    if (_ppFp) console.info('[PP-SYNC] Firestore yazıldı:', d.length, 'görev,', _ppFp);
    else console.warn('[PP-SYNC] Firestore path yok — sync atlandı');
  } catch(_e) { console.warn('[PP] Firestore sync hata:', _e.message); }
  /* PUSULA-KAYIT-FIX-001: storeTasks varsa onu kullan (unified store path), yoksa _write fallback */
  /* PP-STORE-D-FIX-001: storeTasks(d) — yeni veriyi yaz (eski _ppLoad() çağrısı kayıt kaybı yaratıyordu) */
  if(typeof window.storeTasks==='function') { window.storeTasks(d); }
  else if(typeof window._write === 'function') window._write(window.KEYS?.pusula||'ak_pusula_pro_v1', d);
}

/* ── Eski Pusula Export ─────────────────────────────────────── */
/* ── Şirket Takvimi ─────────────────────────────────────────── */
var PP_TAKVIM_KEY = 'ak_pp_takvim_v1';
function _ppTakvimLoad(){ try{ var r=localStorage.getItem(PP_TAKVIM_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppTakvimStore(d){ try{ localStorage.setItem(PP_TAKVIM_KEY,JSON.stringify(d)); }catch(e){} }
/* ── Rutin Ödemeler + Abonelik Takibi ──────────────────────── */
var PP_ODEME_KEY = 'ak_pp_odemeler_v1';
var PP_ABONELIK_KEY = 'ak_pp_abonelik_v1';

function _ppOdemeLoad(){ try{ var r=localStorage.getItem(PP_ODEME_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppOdemeStore(d){ try{ localStorage.setItem(PP_ODEME_KEY,JSON.stringify(d)); }catch(e){} }
function _ppAbonelikLoad(){ try{ var r=localStorage.getItem(PP_ABONELIK_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppAbonelikStore(d){ try{ localStorage.setItem(PP_ABONELIK_KEY,JSON.stringify(d)); }catch(e){} }

  /* ── V170.3.5 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  /* SEBEP: function _ppLoad() / _ppStore() IIFE içinde function-scope    */
  /*        olur. _x wrapper'lar (V167-V169) window._ppLoad/_ppStore      */
  /*        kullanır → expose ZORUNLU.                                     */
  if (!window._ppLoad) {
    Object.assign(window, {
      _ppLoad: _ppLoad,
      _ppStore: _ppStore,
      _ppTakvimLoad: _ppTakvimLoad,
      _ppTakvimStore: _ppTakvimStore,
      _ppOdemeLoad: _ppOdemeLoad,
      _ppOdemeStore: _ppOdemeStore,
      _ppAbonelikLoad: _ppAbonelikLoad,
      _ppAbonelikStore: _ppAbonelikStore,
      PP_TAKVIM_KEY: PP_TAKVIM_KEY,
      PP_ODEME_KEY: PP_ODEME_KEY,
      PP_ABONELIK_KEY: PP_ABONELIK_KEY
    });
  }

  /* ── V170.3.5 CANONICAL PusulaPro.store EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.store, {
    _ppLoad: _ppLoad,
    _ppStore: _ppStore,
    _ppTakvimLoad: _ppTakvimLoad,
    _ppTakvimStore: _ppTakvimStore,
    _ppOdemeLoad: _ppOdemeLoad,
    _ppOdemeStore: _ppOdemeStore,
    _ppAbonelikLoad: _ppAbonelikLoad,
    _ppAbonelikStore: _ppAbonelikStore,
    PP_TAKVIM_KEY: PP_TAKVIM_KEY,
    PP_ODEME_KEY: PP_ODEME_KEY,
    PP_ABONELIK_KEY: PP_ABONELIK_KEY
  });
})();
