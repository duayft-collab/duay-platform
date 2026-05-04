/**
 * PUSULA-PRO-SYNC-001 (V167)
 *
 * PusulaPro Abonelik/Odeme/Hayat Firestore sync.
 *
 * MIMARI:
 *   - Tek document: window._fsPath('pusula')
 *   - 'data' field (gorevler) DOKUNULMAZ
 *   - Yeni field'lar: abonelik, odemeler, hayat, _v167SyncedAt_<field>
 *   - Field-level merge (Firestore native {merge: true})
 *
 * V167.3 SON DUZELTMELERI (kullanici onay):
 *   - _isSame SIRA BAGIMSIZ — id'ye gore sort + key sorted stringify
 *   - Store debounce 300ms — spam yazma onlenir
 *
 * KX9: pusula_pro.js DOKUNULMAZ — sadece wrap.
 * Master kural: Abonelikler PP icinde, Muhasebe'ye baglanmaz — uyumlu.
 */
(function () {
  'use strict';
  if (window._v167Applied) return;
  window._v167Applied = true;

  /* ============= CONFIG ============= */
  function _getFsPath() {
    if (typeof window._fsPath === 'function') return window._fsPath('pusula');
    return 'duay_tenant_default/pusula';
  }

  var FIELD_MAP = {
    Abonelik: 'abonelik',
    Odeme: 'odemeler',
    Hayat: 'hayat'
  };

  function _tsLsKey(field) { return 'ak_pp_' + field + '_v167ts'; }
  function _now() { return new Date().toISOString(); }

  /* ============= NORMALIZE — anahtar sirasi deterministik ============= */
  function _stableStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
      try { return JSON.stringify(obj); } catch (e) { return String(obj); }
    }
    if (Array.isArray(obj)) {
      var parts = [];
      for (var i = 0; i < obj.length; i++) parts.push(_stableStringify(obj[i]));
      return '[' + parts.join(',') + ']';
    }
    var keys = Object.keys(obj).sort();
    var pieces = [];
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      pieces.push(JSON.stringify(k) + ':' + _stableStringify(obj[k]));
    }
    return '{' + pieces.join(',') + '}';
  }

  /* ============= SIRA BAGIMSIZ ARRAY KARSILASTIRMA ============= */
  function _isSame(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    /* id'ye gore sort kopyalari (orijinal etkilenmez) */
    var sortFn = function (x, y) {
      var xi = (x && x.id != null) ? String(x.id) : '';
      var yi = (y && y.id != null) ? String(y.id) : '';
      return xi < yi ? -1 : (xi > yi ? 1 : 0);
    };
    var aSorted = a.slice().sort(sortFn);
    var bSorted = b.slice().sort(sortFn);
    for (var i = 0; i < aSorted.length; i++) {
      try {
        if (_stableStringify(aSorted[i]) !== _stableStringify(bSorted[i])) return false;
      } catch (e) { return false; }
    }
    return true;
  }

  /* ============= TIMESTAMP MS KARSILASTIRMA ============= */
  function _tsMs(ts) {
    if (!ts) return 0;
    try {
      var n = new Date(ts).getTime();
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  }

  /* ============= FIRESTORE FIELD WRITE (merge) ============= */
  function _fsFieldWrite(field, data) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      console.warn('[V167] firebase yok — sync atlandi');
      return Promise.resolve(false);
    }
    var fs = firebase.firestore();
    var ts = _now();
    var payload = {};
    payload[field] = data;
    payload['_v167SyncedAt_' + field] = ts;
    return fs.doc(_getFsPath()).set(payload, { merge: true })
      .then(function () {
        try { localStorage.setItem(_tsLsKey(field), ts); } catch (e) {}
        console.log('[V167] FS yazildi: ' + field + ' (' + (Array.isArray(data) ? data.length : '?') + ' kayit) ts=' + ts);
        return true;
      })
      .catch(function (e) {
        console.error('[V167] FS yazma hata (' + field + '):', e.message || e);
        return false;
      });
  }

  /* ============= DEBOUNCE STORE — per field ============= */
  var _debounceTimers = {};
  function _fsFieldWriteDebounced(field, data) {
    if (_debounceTimers[field]) {
      clearTimeout(_debounceTimers[field]);
    }
    _debounceTimers[field] = setTimeout(function () {
      _debounceTimers[field] = null;
      _fsFieldWrite(field, data);
    }, 300);
  }

  /* ============= FIRESTORE FIELD READ ============= */
  function _fsFieldRead(field) {
    if (typeof firebase === 'undefined' || !firebase.firestore) return Promise.resolve(null);
    var fs = firebase.firestore();
    return fs.doc(_getFsPath()).get()
      .then(function (snap) {
        if (!snap.exists) return { exists: false, data: null, syncedAt: null };
        var d = snap.data() || {};
        if (!Array.isArray(d[field])) return { exists: true, data: null, syncedAt: null };
        return { exists: true, data: d[field], syncedAt: d['_v167SyncedAt_' + field] || null };
      })
      .catch(function (e) {
        console.error('[V167] FS okuma hata (' + field + '):', e.message || e);
        return null;
      });
  }

  /* ============= STORE WRAP (sync up — debounced) ============= */
  function _wrapStore(fnName, field) {
    var orig = window[fnName];
    if (typeof orig !== 'function') {
      console.warn('[V167] ' + fnName + ' yok — wrap atlandi');
      return false;
    }
    var origMarker = '_origStore_V167_' + fnName;
    if (window[origMarker]) return true;
    window[origMarker] = orig;
    window[fnName] = function (data) {
      var r = orig.apply(this, arguments);
      _fsFieldWriteDebounced(field, data);
      return r;
    };
    return true;
  }

  /* ============= LOAD WRAP (sync down) ============= */
  function _wrapLoad(fnName, field) {
    var orig = window[fnName];
    if (typeof orig !== 'function') {
      console.warn('[V167] ' + fnName + ' yok — wrap atlandi');
      return false;
    }
    var origMarker = '_origLoad_V167_' + fnName;
    if (window[origMarker]) return true;
    window[origMarker] = orig;
    window[fnName] = function () {
      var localData = orig.apply(this, arguments) || [];

      _fsFieldRead(field).then(function (fsResult) {
        if (!fsResult) return;
        if (!fsResult.exists || !Array.isArray(fsResult.data)) return;

        var localTs = null;
        try { localTs = localStorage.getItem(_tsLsKey(field)); } catch (e) {}
        var fsTs = fsResult.syncedAt;

        if (fsTs && localTs && fsTs === localTs) return;

        if (_isSame(fsResult.data, localData)) {
          if (fsTs) {
            try { localStorage.setItem(_tsLsKey(field), fsTs); } catch (e) {}
          }
          return;
        }

        var fsMs = _tsMs(fsTs);
        var localMs = _tsMs(localTs);
        var fsNewer;
        if (fsMs && localMs) fsNewer = fsMs > localMs;
        else if (fsMs && !localMs) fsNewer = true;
        else if (!fsMs && localMs) fsNewer = false;
        else fsNewer = fsResult.data.length > localData.length;

        if (fsNewer) {
          console.log('[V167] FS daha guncel (' + field + '): local=' + localData.length + ' fs=' + fsResult.data.length + ' — localStorage update');
          var storeFnName = fnName.replace('Load', 'Store');
          var storeOrig = window['_origStore_V167_' + storeFnName] || window[storeFnName];
          if (typeof storeOrig === 'function') {
            try { storeOrig(fsResult.data); } catch (e) { console.error('[V167] LS update hata:', e); }
          }
          if (fsTs) {
            try { localStorage.setItem(_tsLsKey(field), fsTs); } catch (e) {}
          }
          _triggerRender(field);
        } else {
          console.log('[V167] Local daha guncel (' + field + ') — Firestore upload');
          _fsFieldWriteDebounced(field, localData);
        }
      });

      return localData;
    };
    return true;
  }

  /* ============= UI RE-RENDER HOOK ============= */
  function _triggerRender(field) {
    if (field === 'abonelik' && typeof window._ppAbonelikPanelRender === 'function') {
      try { window._ppAbonelikPanelRender(); } catch (e) {}
    }
    if (field === 'odemeler' && typeof window._ppOdemePanelRender === 'function') {
      try { window._ppOdemePanelRender(); } catch (e) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('v167:datasync', { detail: { field: field } }));
    } catch (e) {}
  }

  /* ============= INITIAL SYNC UP ============= */
  function _initialSyncUp() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    var fs = firebase.firestore();
    fs.doc(_getFsPath()).get().then(function (snap) {
      var fsData = snap.exists ? (snap.data() || {}) : {};
      Object.keys(FIELD_MAP).forEach(function (k) {
        var field = FIELD_MAP[k];
        var loadOrig = window['_origLoad_V167__pp' + k + 'Load'];
        if (typeof loadOrig !== 'function') return;
        var localData = loadOrig() || [];
        var fsHasField = snap.exists && Array.isArray(fsData[field]);
        if (!fsHasField && localData.length > 0) {
          console.log('[V167] initial sync up: ' + field + ' (' + localData.length + ' kayit) Firestore\'a yukleniyor');
          _fsFieldWrite(field, localData);
        }
      });
    }).catch(function (e) {
      console.warn('[V167] initial sync up hata:', e.message || e);
    });
  }

  /* ============= APPLY ============= */
  function _apply() {
    var s1 = _wrapStore('_ppAbonelikStore', FIELD_MAP.Abonelik);
    var s2 = _wrapStore('_ppOdemeStore', FIELD_MAP.Odeme);
    var s3 = _wrapStore('_ppHayatStore', FIELD_MAP.Hayat);
    var l1 = _wrapLoad('_ppAbonelikLoad', FIELD_MAP.Abonelik);
    var l2 = _wrapLoad('_ppOdemeLoad', FIELD_MAP.Odeme);
    var l3 = _wrapLoad('_ppHayatLoad', FIELD_MAP.Hayat);

    window._v167Status = {
      wrapAbonelikStore: s1, wrapOdemeStore: s2, wrapHayatStore: s3,
      wrapAbonelikLoad: l1, wrapOdemeLoad: l2, wrapHayatLoad: l3,
      applied: s1 && s2 && s3 && l1 && l2 && l3,
      fsPath: _getFsPath()
    };
    console.log('[V167 PusulaPro Firestore sync] aktif', window._v167Status);

    setTimeout(function () { _initialSyncUp(); }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 800); });
  } else {
    setTimeout(_apply, 800);
  }
})();
