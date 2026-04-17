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
  var yy = String(d.getFullYear()).slice(-2);
  var tarih = yy + pad(d.getMonth()+1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
  var kod = String(musteriKod||'0000').slice(-4).padStart(4,'0');
  return kod + '-' + tarih;
};

/* ── Veri fonksiyonları ─────────────────────────────────────── */
function _saV2Load() {
  if (typeof window.loadAlisTeklifleri === 'function') return window.loadAlisTeklifleri();
  try {
    var r = localStorage.getItem(SAV2_KEY);
    if (!r) return [];
    if (r.startsWith('_LZ_') && typeof LZString!=='undefined')
    { var _d = JSON.parse(LZString.decompressFromUTF16(r.slice(4))||'[]');
      return typeof window._saNormalizeDurum === 'function' ? window._saNormalizeDurum(_d) : _d; }
    var _d2 = JSON.parse(r);
    return typeof window._saNormalizeDurum === 'function' ? window._saNormalizeDurum(_d2) : _d2;
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
  /* SATINALMA-V2-KPI-MARJ-FIX-002: t.karMarji yok — alisF/satisF/toplamSatis + _saV2AlisF helper fallback chain */
  var karlilar = liste.filter(function(t) {
    var a = parseFloat((typeof window._saV2AlisF === 'function' ? window._saV2AlisF(t) : 0) || t.alisF || t.alisFiyati || 0);
    var s = parseFloat(t.satisF || t.satisFiyati || t.toplamSatis || 0);
    return a > 0 && s > 0;
  });
  var ortMarj = karlilar.length > 0
    ? Math.round(karlilar.reduce(function(acc, t) {
        var a = parseFloat((typeof window._saV2AlisF === 'function' ? window._saV2AlisF(t) : 0) || t.alisF || t.alisFiyati || 0);
        var s = parseFloat(t.satisF || t.satisFiyati || t.toplamSatis || 0);
        return acc + ((s - a) / a * 100);
      }, 0) / karlilar.length)
    : 0;
  /* SATINALMA-V2-KPI-TOPLAM-FIX-001: toplamTl alanı yok — toplamTutar × kur (TRY) fallback */
  var toplam = buAyListe.reduce(function(a,t){
    var kur = (window._saKur && window._saKur[t.toplamPara || t.para || 'USD']) || 44.55;
    var tl = parseFloat(t.toplamTl) || (parseFloat(t.toplamTutar || 0) * kur);
    return a + tl;
  }, 0);
  return { buAy:buAyListe.length, bekleyen:bekleyen.length, ortMarj:ortMarj, toplam:toplam };
};

/* ── Kur çekici (fallback zinciri) ─────────────────────────── */
window._saKur = window._saKur || { USD:44.55, EUR:51.70, GBP:59.30, CNY:6.20, TRY:1, _son:null };
window._saKurCek = function() {
  var simdi = Date.now();
  if(window._saKur._son && simdi - window._saKur._son < 3600000) return;
  fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP')
    .then(function(r){return r.json();})
    .then(function(d){
      if(d&&d.rates){
        window._saKur.USD = d.rates.TRY||44.55;
        window._saKur.EUR = d.rates.TRY/d.rates.EUR||51.70;
        window._saKur.GBP = d.rates.TRY/d.rates.GBP||59.30;
        window._saKur.CNY = d.rates.TRY/7.2||6.20;
        window._saKur.TRY = 1;
        window._saKur._son = Date.now();
        console.log('[KUR] G\u00fcncellendi:', {USD:window._saKur.USD.toFixed(2), EUR:window._saKur.EUR.toFixed(2), GBP:window._saKur.GBP.toFixed(2)});
        // KUR-MERKEZI-001: merkezi kur objesi + Firestore sync
        window.DUAY_KUR = { USD: window._saKur.USD, EUR: window._saKur.EUR, GBP: window._saKur.GBP, CNY: window._saKur.CNY, TRY: 1, _ts: new Date().toISOString() };
        if (typeof _write === 'function') _write('ak_doviz_kur', window.DUAY_KUR);
        var _kurFp = typeof _fsPath === 'function' ? _fsPath('kur') : null;
        if (_kurFp && typeof _syncFirestore === 'function') _syncFirestore(_kurFp, window.DUAY_KUR);
      }
    })
    .catch(function(e){
      console.warn('[KUR] API hatas\u0131, fallback kullan\u0131l\u0131yor:', e.message);
    });
};
window._saKurCek();

/* ── Durum Map (SA-DURUM-MIGRATE-001) ───────────────────────
   Eski durum değerlerini (onay_bekliyor/onay-hazir/kabul vs.)
   görsel label+renk'e çevirir. Veri değişmez, sadece render katmanı. */
window.SA_DURUM_MAP = {
  'bekleyen'      : { label: 'Beklemede',     renk: '#854F0B' },
  'onay_bekliyor' : { label: 'Onay Bekliyor', renk: '#B45309' },
  'onay-hazir'    : { label: 'Onaya Hazır',   renk: '#B45309' },
  'onaylandi'     : { label: 'Onaylandı',     renk: '#0F6E56' },
  'kabul'         : { label: 'Kabul',         renk: '#0F6E56' },
  'reddedildi'    : { label: 'Reddedildi',    renk: '#A32D2D' }
};

/* ── Pipeline Aşamaları (SA-PIPELINE-001a) ─────────────────── */
window.SA_PIPELINE_STAGES = {
  'arastirma'        : { label: 'Araştırma',         renk: '#7C3AED', timerSaat: 72,   sira: 0,  sonraki: 'teklif-bekleniyor' },
  'teklif-bekleniyor': { label: 'Teklif Bekleniyor', renk: '#D97706', timerSaat: 24,   sira: 1,  sonraki: 'teklif-alindi' },
  'teklif-alindi'    : { label: 'Teklif Alındı',     renk: '#2563EB', timerSaat: 72,   sira: 2,  sonraki: 'takip-1' },
  'takip-1'          : { label: 'İlk Takip',         renk: '#0284C7', timerSaat: 168,  sira: 3,  sonraki: 'bekleyen' },
  'bekleyen'         : { label: 'Beklemede',         renk: '#6B7280', timerSaat: null, sira: 4,  sonraki: 'satis-hazir' },
  'satis-hazir'      : { label: 'Satış Hazır',       renk: '#059669', timerSaat: null, sira: 5,  sonraki: 'onay-hazir' },
  'onay-hazir'       : { label: 'Onay Bekliyor',     renk: '#B45309', timerSaat: null, sira: 6,  sonraki: 'onaylandi' },
  'onaylandi'        : { label: 'Onaylandı',         renk: '#065F46', timerSaat: null, sira: 7,  sonraki: 'siparis' },
  'siparis'          : { label: 'Sipariş',           renk: '#1D4ED8', timerSaat: null, sira: 8,  sonraki: 'teslim-alindi' },
  'teslim-alindi'    : { label: 'Teslim Alındı',     renk: '#047857', timerSaat: null, sira: 9,  sonraki: 'tamamlandi' },
  'tamamlandi'       : { label: 'Tamamlandı',        renk: '#064E3B', timerSaat: null, sira: 10, sonraki: null },
  'reddedildi'       : { label: 'Reddedildi',        renk: '#991B1B', timerSaat: null, sira: 11, sonraki: null }
};

/* Sonraki aşamaya ilerle */
window._saPipelineIlerle = function(id) {
  var liste = _saV2Load();
  var t = liste.find(function(x){ return String(x.id) === String(id); });
  if (!t) return;
  var mevcut = window.SA_PIPELINE_STAGES[t.durum];
  if (!mevcut || !mevcut.sonraki) { window.toast?.('İlerlenecek aşama yok','err'); return; }
  var eskiDurum = t.durum;
  var yeniDurum = mevcut.sonraki;
  var yeniInfo = window.SA_PIPELINE_STAGES[yeniDurum];
  var cu = _saCu();
  t.durum = yeniDurum;
  t.pipelineAdimlari = Array.isArray(t.pipelineAdimlari) ? t.pipelineAdimlari : [];
  t.pipelineAdimlari.push({ durum: eskiDurum, yeniDurum: yeniDurum, tarih: _saNow(), kim: cu?.displayName || cu?.email || '' });
  if (yeniInfo && yeniInfo.timerSaat) {
    t.pipelineTimerBaslangic = _saNow();
    t.pipelineTimerSaat = yeniInfo.timerSaat;
  } else {
    t.pipelineTimerBaslangic = null;
    t.pipelineTimerSaat = null;
  }
  t.updatedAt = _saNow();
  _saV2Store(liste);
  if (typeof window.renderSatinAlmaV2 === 'function') window.renderSatinAlmaV2();
  window.toast?.('Aşama güncellendi → ' + (yeniInfo?.label || yeniDurum), 'ok');
};

/* Timer kalan saat (sayı veya null) */
window._saPipelineTimerKalan = function(t) {
  if (!t || !t.pipelineTimerBaslangic || !t.pipelineTimerSaat) return null;
  var baslangic = new Date(t.pipelineTimerBaslangic).getTime();
  if (isNaN(baslangic)) return null;
  var gecenSaat = (Date.now() - baslangic) / 3600000;
  return Math.max(0, t.pipelineTimerSaat - gecenSaat);
};

/* Satış hazır — satış modülüne bildirim */
window._saSatisHazir = function(id) {
  var liste = _saV2Load();
  var t = liste.find(function(x){ return String(x.id) === String(id); });
  if (!t) return;
  var cu = _saCu();
  var eskiDurum = t.durum;
  t.durum = 'satis-hazir';
  t.satisHazirTarih = _saNow();
  t.pipelineAdimlari = Array.isArray(t.pipelineAdimlari) ? t.pipelineAdimlari : [];
  t.pipelineAdimlari.push({ durum: eskiDurum, yeniDurum: 'satis-hazir', tarih: _saNow(), kim: cu?.displayName || cu?.email || '' });
  t.updatedAt = _saNow();
  _saV2Store(liste);
  try { window.addNotif?.('🛒', 'Satınalma: Satış hazır — ' + (t.baslik || t.id), 'ok', 'satinalma', null); } catch(e){}
  if (typeof window.renderSatinAlmaV2 === 'function') window.renderSatinAlmaV2();
  window.toast?.('Satış hazır olarak işaretlendi','ok');
};

/* Avans al — prim tetikle */
window._saAvansAl = function(id) {
  var liste = _saV2Load();
  var t = liste.find(function(x){ return String(x.id) === String(id); });
  if (!t) return;
  t.avansAlindi = true;
  t.avansTarih = _saNow();
  t.updatedAt = _saNow();
  _saV2Store(liste);
  try { window._pirimTetikle?.('satinalma_avans', { teklifId: id, tutar: t.toplamTutar, para: t.toplamPara, kim: t.createdBy }); } catch(e){}
  try { window.addNotif?.('💰', 'Avans alındı — prim tetiklendi', 'ok', 'satinalma', null); } catch(e){}
  if (typeof window.renderSatinAlmaV2 === 'function') window.renderSatinAlmaV2();
};

/* Mal teslim al — prim tetikle + durum güncelle */
window._saMalTeslimAl = function(id) {
  var liste = _saV2Load();
  var t = liste.find(function(x){ return String(x.id) === String(id); });
  if (!t) return;
  var cu = _saCu();
  var eskiDurum = t.durum;
  t.malTeslimAlindi = true;
  t.malTeslimTarih = _saNow();
  t.durum = 'teslim-alindi';
  t.pipelineAdimlari = Array.isArray(t.pipelineAdimlari) ? t.pipelineAdimlari : [];
  t.pipelineAdimlari.push({ durum: eskiDurum, yeniDurum: 'teslim-alindi', tarih: _saNow(), kim: cu?.displayName || cu?.email || '' });
  t.updatedAt = _saNow();
  _saV2Store(liste);
  try { window._pirimTetikle?.('satinalma_teslim', { teklifId: id, tutar: t.toplamTutar, para: t.toplamPara, kim: t.createdBy }); } catch(e){}
  try { window.addNotif?.('📦', 'Mal teslim alındı — prim tetiklendi', 'ok', 'satinalma', null); } catch(e){}
  try { window.logActivity?.('satinalma_teslim', 'info', { teklifId: id, durum: 'teslim-alindi' }); } catch(e){}
  if (typeof window.renderSatinAlmaV2 === 'function') window.renderSatinAlmaV2();
};

/* SA-DURUM-MIGRATE-001: eski durum değerlerini normalize etmek için hook noktası.
   Şu an pass-through — veri değişmiyor. Gelecekte gerçek normalize burada. */
window._saNormalizeDurum = function(liste) {
  if (!Array.isArray(liste)) return liste;
  return liste;
};

/* ── Global export ──────────────────────────────────────────── */
window._saV2Load    = _saV2Load;
window._saV2Store   = _saV2Store;
window._saTeklifLoad= _saTeklifLoad;
window._saTeklifStore=_saTeklifStore;
window.SAV2_KEY     = SAV2_KEY;
window.PusulaProLoaded_SAV2 = true;
console.log('[SAV2] v2.0 yüklendi');
window._saEsc=_saEsc;window._saNow=_saNow;window._saToday=_saToday;window._saId=_saId;window._saCu=_saCu;

/* ── SA-LISTE-ACTIONS-001: Düzenle + Sil aksiyon menüsü ─────── */
window._saV2AksiyonMenu = function(id, btn) {
  var mevcut = document.getElementById('sav2-aksiyon-menu');
  if (mevcut) { mevcut.remove(); if (mevcut.dataset.id === String(id)) return; }
  var menu = document.createElement('div');
  menu.id = 'sav2-aksiyon-menu';
  menu.dataset.id = String(id);
  var rect = btn.getBoundingClientRect();
  menu.style.cssText = 'position:fixed;top:'+(rect.bottom+4)+'px;left:'+(rect.left-80)+'px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:9999;min-width:120px;overflow:hidden';
  menu.innerHTML = '<button onclick="event.stopPropagation();document.getElementById(\'sav2-aksiyon-menu\')?.remove();window._saV2Duzenle?.(\''+id+'\')||window._saV2DuzenleForm?.(\''+id+'\')" style="width:100%;padding:9px 14px;border:none;background:transparent;cursor:pointer;font-size:12px;text-align:left;color:var(--color-text-primary);font-family:inherit;display:block">\u270f D\u00fczelt</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-aksiyon-menu\')?.remove();window._saV2TekSil?.(\''+id+'\')" style="width:100%;padding:9px 14px;border:none;background:transparent;cursor:pointer;font-size:12px;text-align:left;color:#A32D2D;font-family:inherit;display:block;border-top:0.5px solid var(--color-border-tertiary)">\ud83d\uddd1 Sil</button>';
  document.body.appendChild(menu);
  var _kapat = function(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', _kapat); } };
  setTimeout(function() { document.addEventListener('click', _kapat); }, 10);
};
