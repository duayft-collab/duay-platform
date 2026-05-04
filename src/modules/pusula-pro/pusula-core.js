/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-core.js — V170.3 POPULATE
   Sorumluluk: state, sabitler, ana namespace, ortak helper, izolasyon
   Kaynak: pusula_pro.js L1-289 (Bölge I L165-221 modal-task'a taşındı)
   ⚠ KX8 BİREBİR KOPYA — sadece dış IIFE wrap + var→window promotion eklendi
   ⚠ KX10: localStorage anahtarı (PP_KEY=ak_pusula_pro_v1) DEĞİŞTİRİLMEDİ
   ⚠ Defensive guard: yeniden yüklenirse window._pp* overwrite engellenir
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.core) window.PusulaPro.core = {};


/* ── İzolasyon Koruması ─────────────────────────────────────── */
(function() {
  if (window._ppIzoleKontrol) return;
  window._ppIzoleKontrol = true;
  var _korunanKeyler = ['ak_pusula_pro_v1','ak_pp_notlar_v1','ak_pp_challenge_v1','ak_pp_habit_v1','ak_pp_goal_v1','ak_pp_mesaj_v1','ak_pp_skor_v1','ak_pp_takvim_v1','ak_pp_hayat_v1','ak_pp_review_v1'];
  var _eskiKeyler = ['ak_tk2','ak_tasks','companyCalendar_events_v1'];
  window._ppEskiVeriKarisiyor = function(key) {
    return _eskiKeyler.indexOf(key) !== -1;
  };
  window._ppKorunanKey = function(key) {
    return _korunanKeyler.indexOf(key) !== -1;
  };
  console.log('[PP-IZOLE] Pusula Pro izolasyon aktif — eski Pusula verisi korunur, karışmaz');
})();

/* PUSULA-PRO-REDESIGN-001 PARÇA 1: _ppDebug + PP_PALETTE sabitleri */
window.PP_PALETTE = window.PP_PALETTE || {
  ok:         '#1D9E75',
  okDark:     '#0F6E56',
  okBg:       '#E1F5EE',
  warn:       '#854F0B',
  warnBg:     '#FAEEDA',
  err:        '#A32D2D',
  errBg:      '#FCEBEB',
  info:       '#185FA5',
  infoBg:     '#E6F1FB',
  muted:      '#888780'
};
window._ppDebug = window._ppDebug || function() {
  try {
    if (localStorage.getItem('pp_debug') === '1' || location.hostname === 'localhost') {
      console.log.apply(console, ['[PP]'].concat(Array.prototype.slice.call(arguments)));
    }
  } catch(e) {}
};
(function _ppInjectPalette() {
  if (document.getElementById('pp-palette-css')) return;
  var _p = window.PP_PALETTE;
  var _css = ':root{'
    + '--pp-ok:'+_p.ok+';--pp-ok-dark:'+_p.okDark+';--pp-ok-bg:'+_p.okBg+';'
    + '--pp-warn:'+_p.warn+';--pp-warn-bg:'+_p.warnBg+';'
    + '--pp-err:'+_p.err+';--pp-err-bg:'+_p.errBg+';'
    + '--pp-info:'+_p.info+';--pp-info-bg:'+_p.infoBg+';'
    + '--pp-muted:'+_p.muted+';}';
  var _style = document.createElement('style');
  _style.id = 'pp-palette-css';
  _style.textContent = _css;
  document.head.appendChild(_style);
})();

/* PUSULA-PRO-REDESIGN-001 PARÇA 5: _ppEmptyState helper + segmented control CSS */
window._ppEmptyState = function(mod, ikonChar, baslik, altmetin, ctaLabel, ctaHandler) {
  var _e = window._esc || function(s){return String(s==null?'':s);};
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center;min-height:280px">'
    + '<div style="font-size:40px;margin-bottom:12px;opacity:.4">' + ikonChar + '</div>'
    + '<div style="font-size:15px;font-weight:500;color:var(--t);margin-bottom:6px">' + _e(baslik) + '</div>'
    + '<div style="font-size:var(--pp-body);color:var(--t3);max-width:320px;line-height:1.5;margin-bottom:20px">' + _e(altmetin) + '</div>'
    + (ctaLabel ? '<button onclick="' + ctaHandler + '" style="padding:8px 16px;background:var(--pp-info);color:#fff;border:none;border-radius:var(--pp-r-sm);font-size:var(--pp-body);font-weight:500;cursor:pointer;font-family:inherit">' + _e(ctaLabel) + '</button>' : '')
    + '</div>';
};
(function _ppInjectSegmentedCss() {
  if (document.getElementById('pp-segmented-css')) return;
  var _style = document.createElement('style');
  _style.id = 'pp-segmented-css';
  _style.textContent = '.pp-tabs{display:inline-flex;padding:3px;background:var(--s2,rgba(0,0,0,0.04));border-radius:var(--pp-r-md);gap:2px}'
    + '.pp-tabs .pp-tab{padding:6px 14px;border:none;background:transparent;color:var(--t3);font-size:var(--pp-body);font-weight:500;border-radius:var(--pp-r-sm);cursor:pointer;transition:all .15s;font-family:inherit}'
    + '.pp-tabs .pp-tab.on{background:var(--sf,#fff);color:var(--t);box-shadow:0 1px 2px rgba(0,0,0,.05)}'
    + '.pp-tabs .pp-tab:hover:not(.on){color:var(--t2)}';
  document.head.appendChild(_style);
})();

/* PUSULA-PRO-REDESIGN-001 PARÇA 4: Merkezi timer registry (zombie task + memory leak fix) */
window._ppTimers = window._ppTimers || { intervals: [], timeouts: [] };
window._ppSetInterval = window._ppSetInterval || function(fn, ms, label) {
  var id = setInterval(fn, ms);
  window._ppTimers.intervals.push({ id: id, label: label || 'unnamed', ms: ms, started: Date.now() });
  return id;
};
window._ppSetTimeout = window._ppSetTimeout || function(fn, ms, label) {
  var id = setTimeout(function() {
    window._ppTimers.timeouts = window._ppTimers.timeouts.filter(function(t) { return t.id !== id; });
    fn();
  }, ms);
  window._ppTimers.timeouts.push({ id: id, label: label || 'unnamed', ms: ms, started: Date.now() });
  return id;
};
window._ppCleanup = window._ppCleanup || function(reason) {
  var sayi = { intervals: 0, timeouts: 0 };
  window._ppTimers.intervals.forEach(function(t) { try { clearInterval(t.id); sayi.intervals++; } catch(e) {} });
  window._ppTimers.timeouts.forEach(function(t) { try { clearTimeout(t.id); sayi.timeouts++; } catch(e) {} });
  window._ppTimers.intervals = [];
  window._ppTimers.timeouts = [];
  if (window._ppDebug) window._ppDebug('[PP Cleanup]', reason || '-', sayi);
  return sayi;
};
/* beforeunload cleanup hook (idempotent) */
if (!window._ppCleanupBound) {
  window._ppCleanupBound = true;
  window.addEventListener('beforeunload', function() {
    if (window._ppCleanup) window._ppCleanup('beforeunload');
  });
}

/* PUSULA-PRO-REDESIGN-001 PARÇA 2: Typography unification — 4-tier hiyerarşi */
(function _ppInjectTypographyCss() {
  if (document.getElementById('pp-typography-css')) return;
  var _style = document.createElement('style');
  _style.id = 'pp-typography-css';
  _style.textContent = ':root{--pp-h1:15px;--pp-h2:13px;--pp-body:12px;--pp-meta:10px}';
  document.head.appendChild(_style);
})();

/* PUSULA-PRO-REDESIGN-001 PARÇA 3B: Radius + Spacing + Soft shadow + hairline border (try/catch hardened) */
(function _ppInjectSpacingCss() {
  try {
    if (document.getElementById('pp-spacing-css')) return;
    var _style = document.createElement('style');
    _style.id = 'pp-spacing-css';
    _style.textContent = ':root{'
      + '--pp-r-sm:6px;--pp-r-md:8px;--pp-r-lg:12px;--pp-r-xl:16px;'
      + '--pp-s-1:4px;--pp-s-2:8px;--pp-s-3:12px;--pp-s-4:16px;--pp-s-6:24px;--pp-s-8:32px;'
      + '--pp-shadow:0 1px 2px rgba(0,0,0,.04);--pp-shadow-lg:0 2px 8px rgba(0,0,0,.06);'
      + '--pp-border:0.5px solid var(--b,#e0e0e0);}'
      + '.pp-card{background:var(--sf,#fff);border:var(--pp-border);border-radius:var(--pp-r-lg);box-shadow:var(--pp-shadow);padding:var(--pp-s-4)}';
    document.head.appendChild(_style);
    console.log('[Pusula] PARÇA 3 spacing CSS inject OK');
  } catch(e) {
    console.error('[Pusula] PARÇA 3 spacing CSS inject FAIL:', e && e.message ? e.message : e);
  }
})();

/* ── Sabitler ───────────────────────────────────────────────── */
var PP_KEY        = 'ak_pusula_pro_v1';
var PP_TASK_KEY   = 'ak_tk2';
var PP_MOD        = 'akis';
/* PUSULA-CEO-REMOVE-001: CEO sekmesi kaldırıldı */
var PP_MODS       = ['akis','calisma','takvim','odak','degerlendirme'];
// PUSULA-TOPLU-001: global toplu seçim state
window._ppSeciliGorevler = window._ppSeciliGorevler || {};

var PP_PRIORITIES = {
  kritik: { l:'Kritik', c:'var(--pp-err)', bg:'#FCEBEB' },
  yuksek: { l:'Yüksek', c:'var(--pp-warn)', bg:'#FAEEDA' },
  normal: { l:'Normal', c:'#5F5E5A', bg:'var(--color-background-secondary)' },
  dusuk:  { l:'Düşük',  c:'#888780', bg:'var(--color-background-secondary)' }
};

/* ── Yardımcılar ────────────────────────────────────────────── */
var _ppEsc = function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
/* SAAT-FIX-001: İstanbul saati */
var _ppNow = function() { return window._istNow ? window._istNow() : new Date().toISOString().slice(0,19).replace('T',' '); };
var _ppToday = function() { return new Date().toISOString().slice(0,10); };
var _ppId = function() { return typeof window.generateId==='function' ? window.generateId() : Date.now()+Math.random().toString(36).slice(2,8); };
var _ppCu = function() { return window.Auth?.getCU?.() || window.CU?.(); };
var _ppIsAdmin = function() { var r=_ppCu()?.role; return r==='admin'||r==='manager'; };

  /* Bölge I (L165-221: _ppOncelikSec, _ppEtiketEkle, _ppEtiketleriAl) → pusula-modal-task.js'e taşınacak */

function _ppKullaniciRolu(task) {
  if (!task) return null;
  var _me = _ppCu();
  if (!_me) return null;
  if (_ppIsAdmin()) return 'admin';
  var _uid = _me.uid || String(_me.id || '') || _me.email || '';
  var _email = _me.email || '';
  function _matchUser(arr) {
    if (!Array.isArray(arr)) return false;
    return arr.some(function(s){
      if (!s) return false;
      if (typeof s === 'object') {
        var sUid = s.uid || s.id || '';
        var sAd = s.ad || s.name || s.displayName || s.email || '';
        return sUid === _uid || sUid === _email || sAd === _email || sAd === (_me.displayName || _me.name || '');
      }
      return s === _uid || s === _email;
    });
  }
  if (_matchUser(task.sorumlu)) return 'sorumlu';
  if (_matchUser(task.etkiliGozlemci) || _matchUser(task.gozlemci)) return 'etkiliGozlemci';
  if (_matchUser(task.seyirci) || _matchUser(task.paylasilanlar)) return 'seyirci';
  return null;
}
window._ppKullaniciRolu = _ppKullaniciRolu;

/**
 * PUSULA-IZOLASYON-001: Merkezi görev izolasyon filtresi.
 * Admin/manager: tüm görevleri görür.
 * Diğer roller: yalnızca sahip olduğu veya paylaşılan görevleri görür.
 * @param {Array} tasks
 * @returns {Array}
 */
var _ppIzolasyonFiltre = function(tasks) {
  if (_ppIsAdmin()) return tasks;
  /* PP-IZOLASYON-REFIX-001: cu.id + email fallback + _kullanici.email son çare */
  var cu = _ppCu();
  var _uid = cu?.uid
    || String(cu?.id || '')
    || cu?.email
    || window._kullanici?.email
    || '';
  if (!_uid) return [];
  return tasks.filter(function(t) {
    /* PUSULA-GORUNUM-FIX-001: sahip, sorumlu, gözlemci veya paylaşılan */
    var _sahip = t.olusturanId || t.createdBy || '';
    /* PUSULA-PRO-ASSIGNMENT-FIX-001: sahip boşsa non-admin'i erken reject etme — altındaki sorumlu/gozlemci/paylasilan match'e fallthrough */
    if (!_sahip && _ppIsAdmin()) return true;
    if (_sahip === _uid) return true;
    var sorumluArr = Array.isArray(t.sorumlu) ? t.sorumlu : (t.sorumlu ? [t.sorumlu] : []);
    /* KUYRUK-IZOLASYON-FIX-002: string sorumlu (displayName/email) ve uid karşılaştırması */
    var cu = _ppCu();
    if (sorumluArr.some(function(s) {
      if (!s) return false;
      var sUid = typeof s === 'object' ? (s.uid || s.id || '') : '';
      var sAd = typeof s === 'object' ? (s.ad || s.name || s.displayName || s.email || '') : String(s);
      return sUid === _uid || sUid === (cu?.email||'') ||
             sAd === (cu?.displayName || cu?.name || '') || sAd === (cu?.email||'') ||
             String(s) === _uid;
    })) return true;
    var gozlemciArr = Array.isArray(t.gozlemci) ? t.gozlemci : (t.gozlemci ? [t.gozlemci] : []);
    if (gozlemciArr.some(function(g){ return (g && (g.uid || g)) === _uid; })) return true;
    var paylasilan = Array.isArray(t.paylasilanlar) ? t.paylasilanlar : [];
    return paylasilan.indexOf(_uid) !== -1;
  });
};

/* ── Veri ───────────────────────────────────────────────────── */

  /* ── V170.3 LEGACY GLOBAL EXPOSE (var → window promotion, bölme zorunluluğu) ── */
  /* SEBEP: orijinal pusula_pro.js'te file-scope idi; 14 dosyaya bölme sonrası   */
  /*        diğer dosyalardan erişim için window'a alındı. Davranış değişikliği  */
  /*        DEĞİL, görünürlük restorasyonu (Scope Break önleme).                 */
  if (!window._ppEsc) {
    Object.assign(window, {
      PP_KEY: PP_KEY, PP_TASK_KEY: PP_TASK_KEY, PP_MOD: PP_MOD,
      PP_MODS: PP_MODS, PP_PRIORITIES: PP_PRIORITIES,
      _ppEsc: _ppEsc, _ppNow: _ppNow, _ppToday: _ppToday, _ppId: _ppId,
      _ppCu: _ppCu, _ppIsAdmin: _ppIsAdmin,
      _ppKullaniciRolu: _ppKullaniciRolu, _ppIzolasyonFiltre: _ppIzolasyonFiltre
    });
  }

  /* ── V170.3 CANONICAL NAMESPACE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.core, {
    PP_KEY: PP_KEY, PP_TASK_KEY: PP_TASK_KEY, PP_MOD: PP_MOD,
    PP_MODS: PP_MODS, PP_PRIORITIES: PP_PRIORITIES,
    _ppEsc: _ppEsc, _ppNow: _ppNow, _ppToday: _ppToday, _ppId: _ppId,
    _ppCu: _ppCu, _ppIsAdmin: _ppIsAdmin,
    _ppKullaniciRolu: _ppKullaniciRolu, _ppIzolasyonFiltre: _ppIzolasyonFiltre,
    PP_PALETTE: window.PP_PALETTE, _ppDebug: window._ppDebug,
    _ppEmptyState: window._ppEmptyState, _ppTimers: window._ppTimers,
    _ppSetInterval: window._ppSetInterval, _ppSetTimeout: window._ppSetTimeout,
    _ppCleanup: window._ppCleanup
  });
})();
