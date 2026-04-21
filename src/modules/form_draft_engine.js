/* DRAFT-ENGINE-001 — Global form taslak motoru
 * API:
 *   window.FormDraft.init(key, onRestore)  — form açılırken taslak varsa onRestore(data) çağrılır
 *   window.FormDraft.save(key, data)       — 2s debounce ile LS'ye yaz
 *   window.FormDraft.saveNow(key, data)    — anında yaz (debounce'suz)
 *   window.FormDraft.clear(key)            — form başarıyla kaydedilince taslağı sil
 *   window.FormDraft.has(key)              — taslak var mı?
 *   window.FormDraft.get(key)              — taslak datasını dön
 *
 * Key naming: 'draft:module:formName' (örn: 'draft:satis:yeniTeklif')
 * LS prefix: 'fd_' (form draft) — 100 taslak max, FIFO eviction
 */
(function(){
  'use strict';
  var PREFIX = 'fd_';
  var MAX_DRAFTS = 100;
  var DEBOUNCE_MS = 2000;
  var _timers = {};

  function _lsKey(key){ return PREFIX + key; }

  function _evictIfFull(){
    var keys = Object.keys(localStorage).filter(function(k){ return k.indexOf(PREFIX) === 0; });
    if (keys.length < MAX_DRAFTS) return;
    // En eski taslağı sil (createdAt'a göre)
    var items = keys.map(function(k){
      try {
        var v = JSON.parse(localStorage.getItem(k) || '{}');
        return { k: k, t: v._createdAt || 0 };
      } catch(e){ return { k: k, t: 0 }; }
    }).sort(function(a,b){ return a.t - b.t; });
    while (items.length >= MAX_DRAFTS) {
      localStorage.removeItem(items.shift().k);
    }
  }

  window.FormDraft = {
    init: function(key, onRestore){
      if (!key) return false;
      var d = this.get(key);
      if (d && typeof onRestore === 'function') {
        onRestore(d);
        return true;
      }
      return false;
    },

    save: function(key, data){
      if (!key) return;
      if (_timers[key]) clearTimeout(_timers[key]);
      _timers[key] = setTimeout(function(){
        window.FormDraft.saveNow(key, data);
        delete _timers[key];
      }, DEBOUNCE_MS);
    },

    saveNow: function(key, data){
      if (!key) return false;
      try {
        _evictIfFull();
        var payload = Object.assign({}, data || {}, { _createdAt: Date.now() });
        localStorage.setItem(_lsKey(key), JSON.stringify(payload));
        return true;
      } catch(e){
        console.warn('[DRAFT-ENGINE]', 'save failed', key, e);
        return false;
      }
    },

    clear: function(key){
      if (!key) return;
      if (_timers[key]) { clearTimeout(_timers[key]); delete _timers[key]; }
      localStorage.removeItem(_lsKey(key));
    },

    has: function(key){
      return !!localStorage.getItem(_lsKey(key));
    },

    get: function(key){
      try {
        var raw = localStorage.getItem(_lsKey(key));
        if (!raw) return null;
        var d = JSON.parse(raw);
        delete d._createdAt;
        return d;
      } catch(e){ return null; }
    },

    /* Debug helper: tüm taslakları listele */
    list: function(){
      var keys = Object.keys(localStorage).filter(function(k){ return k.indexOf(PREFIX) === 0; });
      return keys.map(function(k){
        try {
          var v = JSON.parse(localStorage.getItem(k) || '{}');
          return { key: k.substring(PREFIX.length), createdAt: new Date(v._createdAt||0).toISOString() };
        } catch(e){ return { key: k.substring(PREFIX.length), error: true }; }
      });
    }
  };

  console.info('[DRAFT-ENGINE-001] v1.0 aktif — API: window.FormDraft.init/save/clear/get/has/list');
})();
