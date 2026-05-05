/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-utils.js — V170.3.2 POPULATE
   Sorumluluk: SADECE saf yardımcı fonksiyonlar (modüler saflık)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-UTILS-POPULATE-001
   Altın Kural: "State değiştiriyorsa → utils değildir."
   ──────────────────────────────────────────────────────────────────
   İçerik:
       _ppHaftaNo  — ISO-week math (saf, state mutation YOK, DOM YOK)
                     Kaynak: pusula_pro.js L2634-2641 (birebir kopya)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaUtils (flat — plugin modül)
   ⚠ DEFENSIVE GUARD: pusula_pro.js hala aktifse overwrite engelle
   ⚠ KX8 BİREBİR KOPYA: tek satır refactor yok, davranış %100 aynı
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaUtils) window.PusulaUtils = {};

  /* ── _ppHaftaNo: ISO-week (kaynak pusula_pro.js L2634-2641 birebir) ── */
  if (typeof window._ppHaftaNo !== 'function') {
    window._ppHaftaNo = function() {
      var d = new Date();
      var j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      var thu = new Date(j); thu.setUTCDate(j.getUTCDate() + (4 - (j.getUTCDay() || 7)));
      var yStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
      return d.getFullYear() + '-W' + Math.ceil((((thu - yStart) / 86400000) + 1) / 7);
    };
  }

  /* ── Canonical PusulaUtils namespace expose ── */
  window.PusulaUtils._ppHaftaNo = window._ppHaftaNo;
})();

/* V184.1 PUSULA-HOTFIX-001 — _ppUserTagHTML restore from pusula_pro.js:1983 (16-modüler refactor'da atlanmış) */
window._ppUserTagHTML = function(containerId, placeholder) {
  return '<div style="position:relative">'
    + '<div id="'+containerId+'-wrap" style="display:flex;flex-wrap:wrap;gap:5px;padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);min-height:36px;cursor:text" onclick="event.stopPropagation();this.querySelector(\'input\')?.focus()">'
    + '<input id="'+containerId+'-input" placeholder="'+placeholder+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._ppUserAra(this,\''+containerId+'\')" style="border:none;background:transparent;font-size:var(--pp-body);outline:none;color:var(--t);min-width:120px;flex:1;font-family:inherit">'
    + '</div>'
    + '<div id="'+containerId+'-dd" style="display:none;position:absolute;z-index:9999;width:100%;left:0;top:100%;margin-top:2px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--sf);overflow:hidden;max-height:160px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>'
    + '</div>';
};

window._ppUserAra = function(inp, containerId) {
  var q = inp.value.toLowerCase().trim();
  var dd = document.getElementById(containerId+'-dd');
  if (!dd) return;
  if (!q) { dd.style.display='none'; return; }
  var users = window._ppKullanicilar();
  var eslesme = users.filter(function(u){ return (u.displayName||'').toLowerCase().indexOf(q)!==-1 || (u.email||'').toLowerCase().indexOf(q)!==-1; }).slice(0,6);
  if (!eslesme.length) { dd.style.display='none'; return; }
  /* XSS-SAFE: statik */
  dd.innerHTML = eslesme.map(function(u){
    var ini = (u.displayName||'?').slice(0,2).toUpperCase();
    var ad = _ppEsc(u.displayName||u.email||'');
    var uid = _ppEsc(u.uid||u.id||'');
    var rol = _ppEsc(u.role||u.departman||'');
    return '<div onclick="event.stopPropagation();window._ppUserSec(\''+containerId+'\',\''+ad+'\',\''+uid+'\',\''+rol+'\')" style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;font-size:var(--pp-body)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:var(--pp-info);color:#fff;font-size:var(--pp-meta);font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+ini+'</div>'
      + '<span style="flex:1">'+ad+'</span>'
      + '<span style="font-size:var(--pp-meta);color:var(--t3)">'+rol+'</span>'
      + '</div>';
  }).join('');
  dd.style.display='block';
};

window._ppUserSec = function(containerId, ad, uid, rol) {
  var wrap = document.getElementById(containerId+'-wrap');
  var inp = document.getElementById(containerId+'-input');
  var dd = document.getElementById(containerId+'-dd');
  if (!wrap || !inp) return;
  var tag = document.createElement('div');
  tag.dataset.uid = uid;
  tag.dataset.ad = ad;
  tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:var(--pp-r-lg);font-size:var(--pp-body);background:var(--s2);color:var(--t);border:0.5px solid var(--b)';
  /* XSS-RISK: _esc() zorunlu */
  tag.innerHTML = ad + '<button onclick="event.stopPropagation();this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:var(--pp-body);line-height:1;padding:0;margin-left:2px">×</button>';
  wrap.insertBefore(tag, inp);
  inp.value='';
  if (dd) dd.style.display='none';
};

window._ppUserTaglerAl = function(containerId) {
  var wrap = document.getElementById(containerId+'-wrap');
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('[data-uid]')).map(function(el){ return { uid:el.dataset.uid, ad:el.dataset.ad }; });
};

