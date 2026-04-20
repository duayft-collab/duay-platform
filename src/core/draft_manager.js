/* DRAFT-MANAGER-001: Global form taslak yöneticisi
   window.DraftManager — tüm formlar aynı API ile kayıp önleme
   LS prefix: ak_draft_ · max 20 draft · debounce 2sn */
'use strict';

(function() {
  var LS_PREFIX = 'ak_draft_';
  var MAX_DRAFTS = 20;
  var DEBOUNCE_MS = 2000;
  var VERSION = 1;

  var _debounceTimers = {}; /* formKey -> timerId */
  var _activeForms = {};    /* formKey -> 'saving' (skip while saving) */
  var _bannerCallbacks = {};

  function _keyFor(formKey) {
    return LS_PREFIX + formKey + '_v' + VERSION;
  }

  function _listAllKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(LS_PREFIX) === 0) out.push(k);
    }
    return out;
  }

  function _pruneOldest() {
    var keys = _listAllKeys();
    if (keys.length <= MAX_DRAFTS) return;
    var entries = keys.map(function(k) {
      try {
        var v = JSON.parse(localStorage.getItem(k) || '{}');
        return { key: k, savedAt: v.savedAt || 0 };
      } catch(e) { return { key: k, savedAt: 0 }; }
    });
    entries.sort(function(a, b) { return a.savedAt - b.savedAt; });
    var toDel = entries.slice(0, entries.length - MAX_DRAFTS);
    toDel.forEach(function(e) { try { localStorage.removeItem(e.key); } catch(_){} });
  }

  /**
   * Save draft — 2s debounce, JSON serialize, LS quota-safe
   * @param {string} formKey - Unique form identifier (örn: 'urun-ekle')
   * @param {object} data - Form data (JSON serializable)
   */
  function save(formKey, data) {
    if (_activeForms[formKey] === 'saving') return;
    clearTimeout(_debounceTimers[formKey]);
    _debounceTimers[formKey] = setTimeout(function() {
      try {
        var payload = { savedAt: Date.now(), data: data };
        localStorage.setItem(_keyFor(formKey), JSON.stringify(payload));
        _pruneOldest();
      } catch(e) {
        console.warn('[DraftManager] save fail:', formKey, e && e.message);
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Load draft if exists
   * @returns {{data, savedAt, ageMs}|null}
   */
  function load(formKey) {
    try {
      var raw = localStorage.getItem(_keyFor(formKey));
      if (!raw) return null;
      var p = JSON.parse(raw);
      return {
        data: p.data,
        savedAt: p.savedAt,
        ageMs: Date.now() - (p.savedAt || 0)
      };
    } catch(e) { return null; }
  }

  /**
   * Clear draft (başarılı kayıt sonrası)
   */
  function clear(formKey) {
    clearTimeout(_debounceTimers[formKey]);
    delete _debounceTimers[formKey];
    try { localStorage.removeItem(_keyFor(formKey)); } catch(_){}
  }

  /**
   * Kayıt öncesi çağır — debounce save'leri askıya al (5s)
   */
  function markSaving(formKey) {
    _activeForms[formKey] = 'saving';
    setTimeout(function() { delete _activeForms[formKey]; }, 5000);
  }

  /**
   * Banner HTML — Devam Et / Sil butonları
   * @returns {string|null} HTML veya null (taslak yoksa)
   */
  function bannerHtml(formKey) {
    var d = load(formKey);
    if (!d) return null;
    var mins = Math.round(d.ageMs / 60000);
    var ageText = mins < 1 ? 'az önce' : mins < 60 ? mins + ' dk önce' : Math.round(mins / 60) + ' sa önce';
    var esc = window._esc || function(s){return String(s==null?'':s);};
    return '<div id="dm-banner-' + esc(formKey) + '" style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;font-size:12px">'
      + '<span style="color:#9A3412">📝 Kaydedilmemiş taslak var (' + ageText + ')</span>'
      + '<span>'
        + '<button onclick="window.DraftManager._continue(\'' + esc(formKey) + '\')" style="background:#1A8D6F;color:#fff;border:0;padding:6px 12px;border-radius:6px;margin-right:6px;cursor:pointer;font-family:inherit">Devam Et</button>'
        + '<button onclick="window.DraftManager._discard(\'' + esc(formKey) + '\')" style="background:transparent;color:#9A3412;border:1px solid #FDBA74;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:inherit">Sil</button>'
      + '</span></div>';
  }

  /**
   * Banner callback kaydet — _continue/_discard tıklanınca çağrılır
   * @param {function} onContinue - (data) => void
   * @param {function} onDiscard - () => void
   */
  function attachBanner(formKey, onContinue, onDiscard) {
    _bannerCallbacks[formKey] = { onContinue: onContinue, onDiscard: onDiscard };
  }

  function _continue(formKey) {
    var d = load(formKey);
    var cb = _bannerCallbacks[formKey];
    var el = document.getElementById('dm-banner-' + formKey);
    if (el) el.remove();
    if (cb && cb.onContinue && d) cb.onContinue(d.data);
  }

  function _discard(formKey) {
    clear(formKey);
    var cb = _bannerCallbacks[formKey];
    var el = document.getElementById('dm-banner-' + formKey);
    if (el) el.remove();
    if (cb && cb.onDiscard) cb.onDiscard();
    if (window.toast) window.toast('Taslak silindi', 'ok');
  }

  function stats() {
    var keys = _listAllKeys();
    return {
      totalDrafts: keys.length,
      maxAllowed: MAX_DRAFTS,
      totalSizeKB: Math.round(keys.reduce(function(s, k) {
        return s + (localStorage.getItem(k) || '').length;
      }, 0) / 1024),
      keys: keys.map(function(k){ return k.replace(LS_PREFIX, '').replace('_v' + VERSION, ''); })
    };
  }

  window.DraftManager = {
    save: save,
    load: load,
    clear: clear,
    markSaving: markSaving,
    bannerHtml: bannerHtml,
    attachBanner: attachBanner,
    _continue: _continue,
    _discard: _discard,
    stats: stats,
    _prune: _pruneOldest
  };

  console.log('[DraftManager] yüklü — window.DraftManager aktif (save/load/clear/bannerHtml/stats)');
})();
