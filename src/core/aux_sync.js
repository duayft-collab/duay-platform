/**
 * src/core/aux_sync.js — v1.0.0
 * REALTIME-FIX-001: Yardımcı koleksiyonları realtime dinlemeye alır.
 * 8 koleksiyon: currencies, kargoFirms, rehber, arsivDolaplar,
 * pirimParams, tatilAyarlar, kargoMasraf, kargoBelge
 *
 * database.js'in _listenCollection altyapısını yeniden yazmadan kullanır.
 * Başlatma: startRealtimeSync() sonunda otomatik çağrılır (500ms gecikme).
 * Durdurma: stopRealtimeSync() içinde otomatik çağrılır.
 */
(function AuxSyncModule() {
'use strict';

/* ── Private değişkenler ─────────────────────────────────────── */
var _auxListeners = {};
var _auxStarted = false;

/* ── Koleksiyon tanımları ────────────────────────────────────── */
var AUX_COLLECTIONS = [
  /* Tam realtime — 6 koleksiyon */
  { col: 'currencies',    key: 'ak_currencies1',    render: function() { window.renderKur?.(); } },
  { col: 'kargoFirms',    key: 'ak_krg_firms1',     render: function() { window.Kargo?.render?.(); } },
  { col: 'rehber',        key: 'ak_rehber1',         render: function() { window.renderRehber?.(); } },
  { col: 'arsivDolaplar', key: 'ak_arsiv_d1',        render: function() { window.renderArsiv?.(); } },
  { col: 'pirimParams',   key: 'ak_pirim_params1',   render: function() { window.Pirim?.render?.(); } },
  { col: 'tatilAyarlar',  key: 'ak_tatil1',          render: function() { window.renderIzin?.(); } },
  /* Koşullu realtime — 2 koleksiyon (sadece kargo modülü açıksa render et) */
  { col: 'kargoMasraf',   key: 'ak_krg_masraf1',     render: function() { if (window.Kargo?.aktif?.()) window.Kargo?.render?.(); } },
  { col: 'kargoBelge',    key: 'ak_krg_belge1',      render: function() { if (window.Kargo?.aktif?.()) window.Kargo?.render?.(); } }
];

/* ── Private helper ──────────────────────────────────────────── */
function _auxListen(collection, localKey, onUpdate) {
  if (typeof window.DB?.listenCollection !== 'function') {
    console.warn('[AUX_SYNC] DB.listenCollection hazir degil:', collection);
    return;
  }
  try {
    var unsub = window.DB.listenCollection(collection, localKey, onUpdate);
    if (typeof unsub === 'function') {
      _auxListeners[collection] = unsub;
    }
  } catch (err) {
    console.error('[AUX_SYNC] Listener kurulamadi:', collection, err.message);
  }
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Tüm yardımcı koleksiyonları realtime dinlemeye başlatır.
 * Double-start guard: zaten çalışıyorsa tekrar başlatmaz.
 */
function start() {
  if (_auxStarted) return;
  _auxStarted = true;
  console.log('[AUX_SYNC] Baslatiliyor \u2014 ' + AUX_COLLECTIONS.length + ' koleksiyon');

  AUX_COLLECTIONS.forEach(function(c) {
    _auxListen(c.col, c.key, c.render);
  });

  var aktifSayi = Object.keys(_auxListeners).length;
  console.log('[AUX_SYNC] Listener aktif:', aktifSayi);

  if (aktifSayi > 10) {
    console.warn('[AUX_SYNC] Uyari: ' + aktifSayi + ' aktif listener \u2014 performans riski');
  }
}

/**
 * Tüm yardımcı listener'ları durdurur ve temizler.
 */
function stop() {
  Object.keys(_auxListeners).forEach(function(key) {
    if (typeof _auxListeners[key] === 'function') {
      _auxListeners[key]();
    }
    delete _auxListeners[key];
  });
  _auxStarted = false;
  console.info('[AUX_SYNC] Durduruldu.');
}

/**
 * Mevcut durumu döndürür.
 * @returns {{ aktif: boolean, listenerSayisi: number, koleksiyonlar: string[] }}
 */
function status() {
  return {
    aktif: _auxStarted,
    listenerSayisi: Object.keys(_auxListeners).length,
    koleksiyonlar: Object.keys(_auxListeners)
  };
}

/* ── Window export ───────────────────────────────────────────── */
window.AuxSync = {
  start: start,
  stop: stop,
  status: status
};

})();
