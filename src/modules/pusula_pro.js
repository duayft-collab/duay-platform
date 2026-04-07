/* ════════════════════════════════════════════════════════════════
   src/modules/pusula_pro.js — Pusula Pro v1.0
   Firestore: duay_tenant_default/tasks (mevcut veri korunur)
   localStorage: ak_pusula_pro_v1
   5 Mod: akis / calisma / odak / degerlendirme / ceo
════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Sabitler ───────────────────────────────────────────────── */
var PP_KEY        = 'ak_pusula_pro_v1';
var PP_TASK_KEY   = 'ak_tk2';
var PP_MOD        = 'akis';
var PP_MODS       = ['akis','calisma','odak','degerlendirme','ceo'];

var PP_PRIORITIES = {
  kritik: { l:'Kritik', c:'#A32D2D', bg:'#FCEBEB' },
  yuksek: { l:'Yüksek', c:'#854F0B', bg:'#FAEEDA' },
  normal: { l:'Normal', c:'#5F5E5A', bg:'var(--color-background-secondary)' },
  dusuk:  { l:'Düşük',  c:'#888780', bg:'var(--color-background-secondary)' }
};

/* ── Yardımcılar ────────────────────────────────────────────── */
var _ppEsc = function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
var _ppNow = function() { return new Date().toISOString().slice(0,19).replace('T',' '); };
var _ppToday = function() { return new Date().toISOString().slice(0,10); };
var _ppId = function() { return typeof window.generateId==='function' ? window.generateId() : Date.now()+Math.random().toString(36).slice(2,8); };
var _ppCu = function() { return window.Auth?.getCU?.() || window.CU?.(); };
var _ppIsAdmin = function() { var r=_ppCu()?.role; return r==='admin'||r==='manager'; };

/* ── Veri ───────────────────────────────────────────────────── */
function _ppLoad() {
  try {
    var r = localStorage.getItem(PP_KEY);
    if (!r) return [];
    if (r.startsWith('_LZ_') && typeof LZString!=='undefined') return JSON.parse(LZString.decompressFromUTF16(r.slice(4))||'[]');
    return JSON.parse(r);
  } catch(e) { return []; }
}
function _ppStore(d) {
  try {
    var s = JSON.stringify(d);
    if (typeof LZString!=='undefined' && s.length>500) { localStorage.setItem(PP_KEY,'_LZ_'+LZString.compressToUTF16(s)); }
    else { localStorage.setItem(PP_KEY,s); }
  } catch(e) { console.error('[PP]',e); }
}

/* ── Eski Pusula Export ─────────────────────────────────────── */
window._ppExport = function() {
  try {
    var raw = localStorage.getItem(PP_TASK_KEY) || '[]';
    var tasks = raw.startsWith('_LZ_') && typeof LZString!=='undefined'
      ? JSON.parse(LZString.decompressFromUTF16(raw.slice(4))||'[]')
      : JSON.parse(raw);
    var blob = new Blob([JSON.stringify({export_date:new Date().toISOString(),count:tasks.length,tasks:tasks},null,2)],{type:'application/json'});
    var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='pusula_yedek_'+_ppToday()+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.toast?.('Yedek indirildi — '+tasks.length+' görev','ok');
  } catch(e) { window.toast?.('Export hatası: '+e.message,'err'); }
};

/* ── Global Export ──────────────────────────────────────────── */
window._ppLoad   = _ppLoad;
window._ppStore  = _ppStore;
window._ppExport = window._ppExport;
window.PusulaProLoaded = true;
console.log('[PUSULA-PRO] v1.0 yüklendi | Export: window._ppExport()');
