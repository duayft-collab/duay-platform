/* ENTERPRISE-FLOW-NETWORK-001 PARÇA 1: Event Bus Core */
(function() {
  'use strict';

  var _listeners = {};
  var _history = [];
  var _dedupe = {};
  var _depth = 0;
  var MAX_DEPTH = 10;
  var DEDUPE_WINDOW = 100; // ms
  var HISTORY_SIZE = 100;

  function _dedupeKey(evt, payload) {
    var id = payload && (payload.entityId || payload.orderId || payload.offerId || payload.id);
    return evt + '::' + (id || 'noid');
  }

  function emit(eventName, payload) {
    if (!eventName) return false;
    payload = payload || {};

    /* Duplicate koruma */
    var key = _dedupeKey(eventName, payload);
    var now = Date.now();
    if (_dedupe[key] && (now - _dedupe[key]) < DEDUPE_WINDOW) {
      return false;
    }
    _dedupe[key] = now;

    /* Infinite loop koruma */
    if (_depth >= MAX_DEPTH) {
      console.error('[evBus] MAX_DEPTH aşıldı, event iptal:', eventName);
      return false;
    }

    /* History */
    _history.push({ event: eventName, payload: payload, ts: now });
    if (_history.length > HISTORY_SIZE) _history.shift();

    /* Activity log */
    try {
      if (window.logActivity) {
        window.logActivity({ type: 'event', event: eventName, payload: payload });
      }
    } catch(e) {}

    /* Handler'ları çalıştır */
    var handlers = _listeners[eventName] ? Array.from(_listeners[eventName]) : [];
    _depth++;
    try {
      handlers.forEach(function(fn) {
        try { fn(payload); } catch(err) { console.error('[evBus]', eventName, err); }
      });
    } finally {
      _depth--;
    }

    return true;
  }

  function on(eventName, handler) {
    if (!_listeners[eventName]) _listeners[eventName] = new Set();
    _listeners[eventName].add(handler);
    return function() { off(eventName, handler); };
  }

  function off(eventName, handler) {
    if (_listeners[eventName]) _listeners[eventName].delete(handler);
  }

  function once(eventName, handler) {
    var wrap = function(p) { off(eventName, wrap); handler(p); };
    on(eventName, wrap);
  }

  /* Debug */
  function history(limit) { return _history.slice(-(limit || 20)); }
  function stats() {
    var out = {};
    Object.keys(_listeners).forEach(function(k) { out[k] = _listeners[k].size; });
    return { listeners: out, historyLength: _history.length, depth: _depth };
  }

  /* Expose */
  window.evBus = {
    emit: emit, on: on, off: off, once: once,
    history: history, stats: stats,
    _listeners: _listeners, _history: _history
  };

  console.log('[evBus] Event Bus initialized');
})();
