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

/* ── Panel Render ───────────────────────────────────────────── */
window._ppRender = function() {
  var panel = document.getElementById('panel-pusula-pro');
  if (!panel) return;
  if (panel.dataset.injected) { window._ppModRender(); return; }
  panel.dataset.injected = '1';
  var _modBtns = PP_MODS.map(function(m) {
    var lbl = {akis:'Akış',calisma:'Çalışma',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[m];
    return '<button onclick="event.stopPropagation();window._ppSetMod(\'' + m + '\')" id="pp-mod-' + m + '" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:20px;cursor:pointer;font-family:inherit;background:transparent;color:var(--t2)">' + lbl + '</button>';
  }).join('');
  panel.innerHTML = ''
    + '<div style="display:flex;flex-direction:column;height:100%;background:var(--sf)">'
    + '<div id="pp-head" style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:40px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
    + '<div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px"><div style="width:6px;height:6px;border-radius:50%;background:#E24B4A"></div>Pusula OS</div>'
    + '<div style="display:flex;gap:3px" id="pp-modes">' + _modBtns + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<div id="pp-score-pill" style="font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;background:var(--s2);color:var(--t);border:0.5px solid var(--b)">Bugün <span style="color:#1D9E75">0 pt</span></div>'
    + '<button onclick="event.stopPropagation();window._ppExport?.()" style="font-size:9px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Yedek Al</button>'
    + '</div></div>'
    + '<div id="pp-frog-bar" style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:#FCEBEB;border-bottom:0.5px solid #F7C1C1;flex-shrink:0">'
    + '<div style="font-size:8px;font-weight:500;color:#A32D2D;letter-spacing:.08em;min-width:90px">BUGÜNÜN FROGU</div>'
    + '<div id="pp-frog-txt" style="font-size:13px;font-weight:500;color:#501313;flex:1">Henüz belirlenmedi — görev ekle</div>'
    + '<button onclick="event.stopPropagation();window._ppFrogBasla?.()" style="font-size:10px;padding:5px 14px;background:#A32D2D;color:#fff;border:none;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:500">Başla →</button>'
    + '</div>'
    + '<div id="pp-body" style="flex:1;overflow:hidden;display:flex"></div>'
    + '</div>';
  window._ppSetMod('akis');
};

window._ppSetMod = function(mod) {
  PP_MOD = mod;
  window._ppAktifMod = mod;
  document.querySelectorAll('[id^="pp-mod-"]').forEach(function(btn) {
    var m = btn.id.replace('pp-mod-', '');
    btn.style.background = m === mod ? 'var(--t)' : 'transparent';
    btn.style.color = m === mod ? 'var(--sf)' : 'var(--t2)';
    btn.style.borderColor = m === mod ? 'var(--t)' : 'var(--b)';
  });
  window._ppModRender();
};

window._ppModRender = function() {
  var body = document.getElementById('pp-body');
  if (!body) return;
  var mod = window._ppAktifMod || 'akis';
  if (mod === 'odak') {
    body.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;background:var(--sf)">'
      + '<div style="font-size:11px;color:var(--t3);letter-spacing:.1em;margin-bottom:16px">ODAK MODU</div>'
      + '<div id="pp-odak-frog" style="font-size:18px;font-weight:500;color:var(--t);max-width:500px;line-height:1.4;margin-bottom:24px">Frog seçilmedi</div>'
      + '<div style="font-size:48px;font-weight:300;letter-spacing:.04em;color:var(--t);margin-bottom:8px" id="pp-odak-timer">00:00:00</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-bottom:24px">Deep Work bloğu</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="event.stopPropagation();window._ppDwBasla?.()" style="font-size:12px;padding:10px 28px;background:var(--t);color:var(--sf);border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:500">Başla</button>'
      + '<button onclick="event.stopPropagation();window._ppSetMod(\'calisma\')" style="font-size:12px;padding:10px 20px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Çık</button>'
      + '</div></div>';
  } else {
    body.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;color:var(--t3);font-size:13px">'
      + window._ppModLabel(mod) + ' modu yakında aktif olacak...</div>';
  }
};

window._ppModLabel = function(mod) {
  return {akis:'Akış',calisma:'Çalışma',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[mod] || mod;
};

/* ── Global Export ──────────────────────────────────────────── */
window._ppLoad   = _ppLoad;
window._ppStore  = _ppStore;
window._ppExport = window._ppExport;
window.renderPusulaPro = window._ppRender;
window.PusulaProLoaded = true;
console.log('[PUSULA-PRO] v1.0 yüklendi | Export: window._ppExport()');
