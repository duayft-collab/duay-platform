/**
 * PUSULA-PRO-LOAD-FIX-001 (V168)
 *
 * PusulaPro gorev verisi kurtarma — _ppLoad localStorage'dan 0 donduyse
 * Firestore'dan duay_<tenant>/pusula doc.data field'ini cekip localStorage'a yaz.
 *
 * PROBLEM:
 *   - 224 gorev Firestore'da (data field)
 *   - localStorage[ak_pusula_pro_v1] BOS
 *   - _ppLoad → 0 → UI: "Henuz gorev yok"
 *   - Veri kayip degil, yuklenmiyor
 *
 * COZUM:
 *   - _ppLoad wrap (sync return korunur)
 *   - localData bos ise async Firestore'dan cek
 *   - LZString ile sikistirip localStorage'a yaz (PP_KEY)
 *   - UI render fn'i tetikle
 *   - Tek seferlik (_v168RestoredOnce flag)
 *
 * V168.1 KALITE DUZELTMELERI (kullanici onay):
 *   - _v168RestoredOnce flag — restore sayfa omru boyunca 1 kez
 *   - fsData kontrolu genisletildi: Array + her eleman object check
 *
 * KX9: pusula_pro.js DOKUNULMAZ — sadece wrap.
 * READ-ONLY FIX: write yok, migration yok, IndexedDB yok, LS-GUARD'a dokunma.
 * V167 ile catismaz: V167 abonelik/odeme/hayat field'lari, V168 sadece data field okur.
 */
(function () {
  'use strict';
  if (window._v168Applied) return;
  window._v168Applied = true;

  /* ============= CONFIG ============= */
  function _getFsPath() {
    if (typeof window._fsPath === 'function') return window._fsPath('pusula');
    return 'duay_tenant_default/pusula';
  }

  function _getPpKey() {
    return window.PP_KEY || 'ak_pusula_pro_v1';
  }

  /* ============= FSDATA GUVENLI KONTROL (genisletilmis) ============= */
  function _isValidFsTaskArray(fsData) {
    if (!Array.isArray(fsData)) return false;
    if (fsData.length === 0) return false;
    for (var i = 0; i < fsData.length; i++) {
      var item = fsData[i];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
    }
    return true;
  }

  /* ============= LOCALSTORAGE'A YAZ (LZString sikistirma) ============= */
  function _writeToLocalStorage(data) {
    try {
      var json = JSON.stringify(data);
      var key = _getPpKey();
      if (typeof LZString !== 'undefined' && json.length > 500) {
        var compressed = '_LZ_' + LZString.compressToUTF16(json);
        localStorage.setItem(key, compressed);
        return { ok: true, size: compressed.length, compressed: true };
      } else {
        localStorage.setItem(key, json);
        return { ok: true, size: json.length, compressed: false };
      }
    } catch (e) {
      console.error('[V168] localStorage yazma hata:', e.message || e);
      return { ok: false, error: e.message };
    }
  }

  /* ============= FIRESTORE'DAN DATA FIELD CEK ============= */
  function _restoreFromFirestore() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      console.warn('[V168] firebase yok — kurtarma atlandi');
      return;
    }
    var fs = firebase.firestore();
    fs.doc(_getFsPath()).get()
      .then(function (snap) {
        if (!snap.exists) {
          console.warn('[V168] Firestore doc yok — kurtarilacak veri yok');
          return;
        }
        var d = snap.data();
        var fsData = d ? d.data : null;
        if (!_isValidFsTaskArray(fsData)) {
          console.warn('[V168] FS data field gecersiz veya bos — kurtarma atlandi');
          return;
        }
        var writeResult = _writeToLocalStorage(fsData);
        if (!writeResult.ok) {
          console.error('[V168] kurtarma basarisiz — LS yazilamadi');
          return;
        }
        console.log('[V168] ' + fsData.length + ' gorev Firestore\'dan localStorage\'a kurtarildi (' + (writeResult.size / 1024).toFixed(1) + ' KB ' + (writeResult.compressed ? 'sikistirilmis' : 'raw') + ')');
        _triggerRender();
      })
      .catch(function (e) {
        console.error('[V168] FS okuma hata:', e.message || e);
      });
  }

  /* ============= UI RE-RENDER HOOK ============= */
  function _triggerRender() {
    if (typeof window._ppRender === 'function') {
      try { window._ppRender(); console.log('[V168] _ppRender tetiklendi'); return; } catch (e) {}
    }
    if (typeof window.renderPusulaPro === 'function') {
      try { window.renderPusulaPro(); console.log('[V168] renderPusulaPro tetiklendi'); return; } catch (e) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('v168:gorevkurtarma', { detail: { restored: true } }));
      console.log('[V168] custom event v168:gorevkurtarma dispatched');
    } catch (e) {}
  }

  /* ============= LOAD WRAP (sync return + async restore) ============= */
  function _wrapPpLoad() {
    var orig = window._ppLoad;
    if (typeof orig !== 'function') {
      console.warn('[V168] _ppLoad yok — wrap atlandi');
      return false;
    }
    if (window._origLoad_V168__ppLoad) return true;
    window._origLoad_V168__ppLoad = orig;
    window._ppLoad = function () {
      var localData = orig.apply(this, arguments) || [];

      if (localData.length === 0 && !window._v168RestoredOnce && !window._v168RestoreInProgress) {
        window._v168RestoreInProgress = true;
        window._v168RestoredOnce = true;
        setTimeout(function () {
          _restoreFromFirestore();
          setTimeout(function () { window._v168RestoreInProgress = false; }, 2000);
        }, 100);
      }

      return localData;
    };
    return true;
  }

  /* ============= APPLY ============= */
  function _apply() {
    var w = _wrapPpLoad();
    window._v168Status = {
      wrapPpLoad: w,
      applied: w,
      fsPath: _getFsPath(),
      ppKey: _getPpKey()
    };
    console.log('[V168 PusulaPro gorev kurtarma] aktif', window._v168Status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 1000); });
  } else {
    setTimeout(_apply, 1000);
  }
})();
