'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/satin_alma_v2.js — Satın Alma V2
   Veri: ak_satinalma_v2 (yeni) + ak_satinalma1 (eski, sadece okuma)
   Teklif ID: [MüşteriKodu]-[YılAyGünSaatDakika]
   Örnek: 3230-202604081423
   Onay zinciri: katalog→satıcı cari→ödeme→nakit→lojistik→ihracat→pusula
════════════════════════════════════════════════════════════════ */

/* ── Sabitler ───────────────────────────────────────────────── */
var SAV2_KEY        = 'ak_satinalma_v2';
var SAV2_TEKLIF_KEY = 'ak_sa_teklifler_v2';
var SAV2_AKT_ID     = null;
var SAV2_SAYFA      = 1;
var SAV2_SAYFA_BOY  = 20;
var SAV2_MOD        = 'teklifler';

/* ── CSS değişken kısayolları ───────────────────────────────── */
var _sf = 'var(--sf)', _s2 = 'var(--s2)', _b = 'var(--b)', _bm = 'var(--bm)';
var _t  = 'var(--t)',  _t2 = 'var(--t2)', _t3 = 'var(--t3)';

/* ── Yardımcılar ────────────────────────────────────────────── */
var _saEsc  = window._saEsc  = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
var _saNow  = window._saNow  = function(){ return new Date().toISOString(); };
var _saToday= window._saToday= function(){ return new Date().toISOString().slice(0,10); };
var _saId   = window._saId   = function(){ return typeof window.generateId==='function'?window.generateId():Date.now()+Math.random().toString(36).slice(2,8); };
var _saCu   = window._saCu   = function(){ return window.Auth?.getCU?.() || window.CU?.(); };

/* ── Teklif ID üretici ──────────────────────────────────────── */
window._saTeklifId = function(musteriKod) {
  var d = new Date();
  var pad = function(n,l){ return String(n).padStart(l||2,'0'); };
  var tarih = String(d.getFullYear()) + pad(d.getMonth()+1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
  return (musteriKod||'0000') + '-' + tarih;
};

/* ── Veri fonksiyonları ─────────────────────────────────────── */
function _saV2Load() {
  if (typeof window.loadAlisTeklifleri === 'function') return window.loadAlisTeklifleri();
  try {
    var r = localStorage.getItem(SAV2_KEY);
    if (!r) return [];
    if (r.startsWith('_LZ_') && typeof LZString!=='undefined')
      return JSON.parse(LZString.decompressFromUTF16(r.slice(4))||'[]');
    return JSON.parse(r);
  } catch(e) { return []; }
}
function _saV2Store(d) {
  if (typeof window.storeAlisTeklifleri === 'function') { window.storeAlisTeklifleri(d); return; }
  try {
    var s = JSON.stringify(d);
    if (typeof LZString!=='undefined' && s.length>500)
      localStorage.setItem(SAV2_KEY,'_LZ_'+LZString.compressToUTF16(s));
    else localStorage.setItem(SAV2_KEY,s);
  } catch(e) { console.error('[SAV2]',e); }
}
function _saTeklifLoad() {
  if (typeof window.loadSatisTeklifleri === 'function') return window.loadSatisTeklifleri();
  try { var r=localStorage.getItem(SAV2_TEKLIF_KEY); return r?JSON.parse(r):[]; } catch(e){ return []; }
}
function _saTeklifStore(d) {
  if (typeof window.storeSatisTeklifleri === 'function') { window.storeSatisTeklifleri(d); return; }
  try { localStorage.setItem(SAV2_TEKLIF_KEY,JSON.stringify(d)); } catch(e){}
}

/* ── KPI hesaplayıcı ────────────────────────────────────────── */
window._saV2Kpi = function() {
  var liste = _saV2Load().filter(function(t){ return !t.isDeleted; });
  var buAy  = _saToday().slice(0,7);
  var buAyListe = liste.filter(function(t){ return (t.createdAt||'').startsWith(buAy); });
  var bekleyen  = liste.filter(function(t){ return t.durum==='bekleyen'; });
  var onaylilar = liste.filter(function(t){ return t.durum==='onaylandi'; });
  var marjlar   = onaylilar.map(function(t){ return parseFloat(t.karMarji)||0; });
  var ortMarj   = marjlar.length ? (marjlar.reduce(function(a,b){return a+b;},0)/marjlar.length).toFixed(1) : 0;
  var toplam    = buAyListe.reduce(function(a,t){ return a+(parseFloat(t.toplamTl)||0); },0);
  return { buAy:buAyListe.length, bekleyen:bekleyen.length, ortMarj:ortMarj, toplam:toplam };
};

/* ── Kur çekici (fallback zinciri) ─────────────────────────── */
window._saKur = { USD:44.55, EUR:51.70, GBP:59.30, _son:null };
window._saKurCek = function() {
  if (window._saKur._son && (Date.now()-window._saKur._son)<3600000) return;
  fetch('https://api.frankfurter.app/latest?from=USD,EUR,GBP&to=TRY')
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.rates) {
        window._saKur.USD = d.rates.TRY||44.55;
        window._saKur._son = Date.now();
      }
    }).catch(function(){});
};
window._saKurCek();

/* ── Global export ──────────────────────────────────────────── */
window._saV2Load    = _saV2Load;
window._saV2Store   = _saV2Store;
window._saTeklifLoad= _saTeklifLoad;
window._saTeklifStore=_saTeklifStore;
window.SAV2_KEY     = SAV2_KEY;
window.PusulaProLoaded_SAV2 = true;
console.log('[SAV2] v2.0 yüklendi');
window._saEsc=_saEsc;window._saNow=_saNow;window._saToday=_saToday;window._saId=_saId;window._saCu=_saCu;
