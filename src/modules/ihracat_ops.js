/**
 * src/modules/ihracat_ops.js — v2.0.0
 * İhracat Operasyon Merkezi — Tam Yeniden Yazım
 * 6 Sekme: Emirler · GÇB · Konşimento · Belgeler · Roller · Templateler
 */
(function IhracatOpsModule() {
'use strict';

var _g   = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || ''); };
var _cu  = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _isAdmin = function() { return window.isAdmin?.() || (_cu()?.role === 'admin'); };
var _isManager = function() { return _isAdmin() || (_cu()?.role === 'manager'); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };

var _loadD = function() { return typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar() : []; };
var _storeD = function(d) { window.storeIhracatDosyalar?.(d); };
var _loadE = function() { return typeof window.loadIhracatEvraklar === 'function' ? window.loadIhracatEvraklar() : []; };
var _storeE = function(d) { window.storeIhracatEvraklar?.(d); };
var _loadU = function() { return typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : []; };
var _loadG = function() { return typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb() : []; };
var _storeG = function(d) { window.storeIhracatGcb?.(d); };
var _loadBL = function() { return typeof window.loadIhracatBl === 'function' ? window.loadIhracatBl() : []; };
var _storeBL = function(d) { window.storeIhracatBl?.(d); };
var _loadT = function() { return typeof window.loadIhracatTemplate === 'function' ? window.loadIhracatTemplate() : []; };
var _storeT = function(d) { window.storeIhracatTemplate?.(d); };
var _loadGM = function() { return typeof window.loadGumrukculer === 'function' ? window.loadGumrukculer() : []; };
var _loadFW = function() { return typeof window.loadForwarderlar === 'function' ? window.loadForwarderlar() : []; };
var _loadCari = function() { return typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : []; };
var _loadUsers = function() { return typeof window.loadUsers === 'function' ? window.loadUsers() : []; };

var INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'CIP', 'CPT', 'DAP', 'DPU', 'DDP', 'FCA', 'FAS'];
var ODEME = ['TT', 'LC', 'DA', 'DP', 'OA'];

var DOSYA_DURUM = {
  taslak: { l: 'Taslak', c: '#6B7280', bg: 'rgba(107,114,128,.1)' },
  hazirlaniyor: { l: 'Hazırlanıyor', c: '#D97706', bg: 'rgba(217,119,6,.1)' },
  yukleniyor: { l: 'Yükleniyor', c: '#185FA5', bg: 'rgba(24,95,165,.1)' },
  yolda: { l: 'Yolda', c: '#0F6E56', bg: 'rgba(15,110,86,.1)' },
  teslim: { l: 'Teslim', c: '#16A34A', bg: 'rgba(22,163,74,.1)' },
  kapandi: { l: 'Kapandı', c: '#3B3B3B', bg: 'rgba(59,59,59,.1)' },
  iptal: { l: 'İptal', c: '#DC2626', bg: 'rgba(220,38,38,.1)' },
};

var EVRAK_TUR = {
  PI: { l: 'Proforma Invoice' }, CI: { l: 'Commercial Invoice' }, PL: { l: 'Packing List' },
  SEVK: { l: 'Sevk Emri' }, YUK: { l: 'Yükleme Talimatı' }, GCB: { l: 'GÇB' },
  BL: { l: 'Bill of Lading' }, MENSEI: { l: 'Menşei Şahadetnamesi' }, EUR1: { l: 'EUR.1 / A.TR' },
  INSP: { l: 'Inspection Raporu' }, SIG: { l: 'Sigorta Poliçesi' },
};

var EVRAK_DURUM = {
  taslak: { l: 'Taslak', c: '#6B7280', bg: 'rgba(107,114,128,.1)' },
  onay_bekliyor: { l: 'Onay Bekliyor', c: '#D97706', bg: 'rgba(217,119,6,.1)' },
  onaylandi: { l: 'Onaylandı', c: '#185FA5', bg: 'rgba(24,95,165,.1)' },
  gonderildi: { l: 'Gönderildi', c: '#16A34A', bg: 'rgba(22,163,74,.1)' },
  reddedildi: { l: 'Reddedildi', c: '#DC2626', bg: 'rgba(220,38,38,.1)' },
};

var _aktifTab = 'emirler';
var _aktifDosyaId = null;
var _search = '';
var _durumFilter = 'all';

function _badge(text, c, bg) { return '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + bg + ';color:' + c + ';font-weight:500">' + _esc(text) + '</span>'; }
function _dosyaBadge(d) { var s = DOSYA_DURUM[d] || DOSYA_DURUM.taslak; return _badge(s.l, s.c, s.bg); }
function _detayRow(l, v) { return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span style="color:var(--t2)">' + _esc(l) + '</span><span style="color:var(--t);font-weight:500">' + (typeof v === 'string' ? _esc(v || '—') : (v || '—')) + '</span></div>'; }
function _kpiKart(l, v, c) { return '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:10px;padding:12px 16px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">' + l + '</div><div style="font-size:22px;font-weight:700;color:' + c + '">' + v + '</div></div>'; }

function _nextDosyaNo() {
  var y = new Date().getFullYear(); var all = _loadD(); var max = 0;
  all.forEach(function(r) { var m = (r.dosyaNo || '').match(/IHR-(\d{4})-(\d{4})/); if (m && parseInt(m[1]) === y && parseInt(m[2]) > max) max = parseInt(m[2]); });
  return 'IHR-' + y + '-' + String(max + 1).padStart(4, '0');
}

var IHR_TABS = [
  { id: 'emirler', l: 'İhracat Emirleri' }, { id: 'gcb', l: 'GÇB Takip' }, { id: 'konsimento', l: 'Konşimento' },
  { id: 'belgeler', l: 'Belgeler' }, { id: 'roller', l: 'Roller' }, { id: 'templateler', l: 'Templateler' },
];

/* ══════════════════════════════════════════════════════════ */
window.renderIhracatOps = function() {
  var panel = _g('panel-ihracat-ops'); if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div class="ph"><div><div class="pht">İhracat Ops</div><div class="phs">İhracat emirleri ve operasyon takibi</div></div><div class="ur"><button class="btn btns" onclick="window._ihrRunChecks()">Kontrol Et</button><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div><div id="ihr-tabs" style="display:flex;border-bottom:0.5px solid var(--b);padding:0 20px"></div><div id="ihr-content" style="padding:0"></div>';
  }
  _ihrRenderTabs(); _ihrRenderContent();
};

function _ihrRenderTabs() {
  var el = _g('ihr-tabs'); if (!el) return;
  el.innerHTML = IHR_TABS.map(function(t) { return '<div onclick="window._ihrTab(\'' + t.id + '\')" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid ' + (_aktifTab === t.id ? 'var(--ac);color:var(--ac);font-weight:500' : 'transparent;color:var(--t2)') + '">' + _esc(t.l) + '</div>'; }).join('');
}

window._ihrTab = function(tab) { _aktifTab = tab; _aktifDosyaId = null; _ihrRenderTabs(); _ihrRenderContent(); };

function _ihrRenderContent() {
  var el = _g('ihr-content'); if (!el) return;
  if (_aktifDosyaId && _aktifTab === 'emirler') { _ihrRenderDosyaDetay(_aktifDosyaId); return; }
  switch (_aktifTab) {
    case 'emirler': _ihrRenderEmirler(el); break;
    case 'gcb': _ihrRenderGcbList(el); break;
    case 'konsimento': _ihrRenderBlList(el); break;
    case 'belgeler': _ihrRenderBelgeler(el); break;
    case 'roller': _ihrRenderRoller(el); break;
    case 'templateler': _ihrRenderTemplates(el); break;
  }
}

/* ── EMİRLER ─────────────────────────────────────────────── */
function _ihrRenderEmirler(el) {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; }); var today = _today();
  var aktif = dosyalar.filter(function(d) { return !['kapandi', 'iptal'].includes(d.durum); }).length;
  var gecikti = dosyalar.filter(function(d) { return d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum); }).length;

  var h = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 20px;border-bottom:0.5px solid var(--b)">' + _kpiKart('Aktif', aktif, '#185FA5') + _kpiKart('Gecikmiş', gecikti, gecikti > 0 ? '#DC2626' : '#16A34A') + _kpiKart('Kapanan', dosyalar.filter(function(d) { return d.durum === 'kapandi'; }).length, '#7C3AED') + _kpiKart('Toplam', dosyalar.length, '#6B7280') + '</div>';
  h += '<div style="display:flex;gap:8px;padding:12px 20px;border-bottom:0.5px solid var(--b);flex-wrap:wrap;align-items:center"><input class="fi" id="ihr-search" placeholder="Dosya no, müşteri..." oninput="window._ihrSearch(this.value)" value="' + _esc(_search) + '" style="max-width:280px;font-size:12px">';
  [['all', 'Tümü'], ['hazirlaniyor', 'Hazırlanıyor'], ['yolda', 'Yolda'], ['gecikti', 'Gecikmiş']].forEach(function(f) { h += '<span onclick="window._ihrDurumFilter(\'' + f[0] + '\')" style="padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;' + (_durumFilter === f[0] ? 'background:var(--ac);color:#fff' : 'background:var(--s2);color:var(--t2)') + '">' + f[1] + '</span>'; });
  h += '</div>';

  var items = dosyalar;
  if (_search) { var q = _search.toLowerCase(); items = items.filter(function(d) { return (d.dosyaNo || '').toLowerCase().indexOf(q) !== -1 || (d.musteriAd || '').toLowerCase().indexOf(q) !== -1; }); }
  if (_durumFilter === 'gecikti') items = items.filter(function(d) { return d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum); });
  else if (_durumFilter !== 'all') items = items.filter(function(d) { return d.durum === _durumFilter; });
  items.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });

  if (!items.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:36px;margin-bottom:12px">📦</div><div>İhracat emri bulunamadı</div><div style="margin-top:12px"><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div>'; el.innerHTML = h; return; }

  h += '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Dosya No</th><th>Müşteri</th><th>Teslim</th><th>Bitiş</th><th>Durum</th><th>Kalan</th><th></th></tr></thead><tbody>';
  items.forEach(function(d) {
    var kalan = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
    var kalanTxt = kalan === null ? '—' : kalan < 0 ? '<span style="color:#DC2626">' + Math.abs(kalan) + 'g gecikti</span>' : kalan + 'g';
    h += '<tr><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(d.dosyaNo || '—') + '</td><td style="font-size:12px;font-weight:500">' + _esc(d.musteriAd || '—') + '</td><td style="font-size:10px;padding:2px 7px;border-radius:3px;background:#E6F1FB;color:#0C447C">' + _esc(d.teslim_sekli || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(d.bitis_tarihi || '—') + '</td><td>' + _dosyaBadge(d.durum) + '</td><td style="font-size:11px">' + kalanTxt + '</td><td><button class="btn btns" onclick="window._ihrAcDosya(\'' + d.id + '\')" style="font-size:11px;padding:3px 8px">Aç</button></td></tr>';
  });
  h += '</tbody></table></div>'; el.innerHTML = h;
}

/* ── DOSYA DETAY ─────────────────────────────────────────── */
function _ihrAcDosya(id) { _aktifDosyaId = id; _aktifTab = 'emirler'; _ihrRenderTabs(); _ihrRenderDosyaDetay(id); }

function _ihrRenderDosyaDetay(id) {
  var el = _g('ihr-content'); if (!el) return;
  var d = _loadD().find(function(x) { return x.id === id; }); if (!d) { _aktifDosyaId = null; _ihrRenderContent(); return; }
  var evraklar = _loadE().filter(function(e) { return e.dosya_id === d.id; });
  var tamam = evraklar.filter(function(e) { return e.durum === 'gonderildi'; }).length;

  var h = '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:12px;background:var(--s2)"><button onclick="window._ihrGeriDon()" class="btn btns" style="font-size:11px">← Geri</button><span style="font-size:13px;font-weight:500">' + _esc(d.dosyaNo) + '</span><span style="font-size:12px;color:var(--t2)">' + _esc(d.musteriAd || '') + '</span>' + _dosyaBadge(d.durum) + '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px">';
  h += '<div><div style="font-size:11px;font-weight:500;color:var(--t2);text-transform:uppercase;margin-bottom:10px">Dosya Bilgileri</div>';
  h += _detayRow('Dosya No', d.dosyaNo) + _detayRow('Müşteri', d.musteriAd) + _detayRow('Teslim', d.teslim_sekli) + _detayRow('Varış', d.varis_limani) + _detayRow('Ödeme', d.odeme_sarti) + _detayRow('Başlangıç', d.baslangic_tarihi) + _detayRow('Bitiş', d.bitis_tarihi) + _detayRow('Süre', (d.sure_gun || 7) + ' gün');
  h += '</div><div><div style="font-size:11px;font-weight:500;color:var(--t2);text-transform:uppercase;margin-bottom:10px">Evrak Durumu (' + tamam + '/' + Object.keys(EVRAK_TUR).length + ')</div>';
  Object.keys(EVRAK_TUR).forEach(function(k) { var v = EVRAK_TUR[k]; var ev = evraklar.find(function(e) { return e.tur === k; }); var durum = ev ? (EVRAK_DURUM[ev.durum] || EVRAK_DURUM.taslak) : { l: 'Henüz Yok', c: '#9CA3AF', bg: 'rgba(156,163,175,.1)' }; h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span>' + _esc(v.l) + '</span><span style="font-size:9px;padding:1px 7px;border-radius:3px;background:' + durum.bg + ';color:' + durum.c + '">' + durum.l + '</span></div>'; });
  h += '</div></div>';
  if (d.not) h += '<div style="padding:0 20px 16px"><div style="font-size:11px;color:var(--t2);background:var(--s2);padding:10px 12px;border-radius:8px">' + _esc(d.not) + '</div></div>';
  el.innerHTML = h;
}

/* ── GÇB LİSTESİ ────────────────────────────────────────── */
function _ihrRenderGcbList(el) {
  var gcbAll = _loadG().filter(function(g) { return !g.isDeleted; });
  var h = '<div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">GÇB Takip</div><button class="btn btnp" onclick="window._ihrGcbEkle(null)" style="font-size:11px">+ GÇB Ekle</button></div>';
  if (!gcbAll.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)">Henüz GÇB yok</div>'; el.innerHTML = h; return; }
  h += '<table class="tbl"><thead><tr><th>GÇB No</th><th>Dosya</th><th>Tescil</th><th>FOB</th><th>Durum</th><th></th></tr></thead><tbody>';
  gcbAll.forEach(function(g) { var dosya = _loadD().find(function(d) { return d.id === g.dosya_id; }); h += '<tr><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(g.beyan_no || '—') + '</td><td style="font-size:11px">' + _esc(dosya?.dosyaNo || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(g.tescil_tarihi || '—') + '</td><td style="font-size:11px">' + (g.fob_deger ? g.fob_deger.toLocaleString('tr-TR') + ' ' + (g.doviz || '') : '—') + '</td><td>' + _badge(g.durum || 'bekliyor', '#D97706', 'rgba(217,119,6,.1)') + '</td><td><button class="btn btns" onclick="window._ihrGcbDuzenle(\'' + g.id + '\')" style="font-size:11px;padding:3px 8px">✏️</button></td></tr>'; });
  h += '</tbody></table>'; el.innerHTML = h;
}

/* ── BL LİSTESİ ──────────────────────────────────────────── */
function _ihrRenderBlList(el) {
  var blAll = _loadBL().filter(function(b) { return !b.isDeleted; });
  var h = '<div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">Konşimento Takip</div><button class="btn btnp" onclick="window._ihrBlEkle(null)" style="font-size:11px">+ BL Ekle</button></div>';
  if (!blAll.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)">Henüz BL yok</div>'; el.innerHTML = h; return; }
  h += '<table class="tbl"><thead><tr><th>BL No</th><th>Dosya</th><th>Consignee</th><th>Yükleme</th><th>Tür</th><th></th></tr></thead><tbody>';
  blAll.forEach(function(b) { var dosya = _loadD().find(function(d) { return d.id === b.dosya_id; }); h += '<tr><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(b.bl_no || '—') + '</td><td style="font-size:11px">' + _esc(dosya?.dosyaNo || '—') + '</td><td style="font-size:11px">' + _esc(b.consignee || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(b.yukleme_tarihi || '—') + '</td><td style="font-size:11px">' + _esc({ seaway: 'SeaWay', hardcopy: 'Hard Copy', telex: 'Telex' }[b.bl_turu] || '—') + '</td><td><button class="btn btns" onclick="window._ihrBlDuzenle(\'' + b.id + '\')" style="font-size:11px;padding:3px 8px">✏️</button></td></tr>'; });
  h += '</tbody></table>'; el.innerHTML = h;
}

/* ── BELGELER ────────────────────────────────────────────── */
function _ihrRenderBelgeler(el) {
  var evraklar = _loadE().filter(function(e) { return !e.isDeleted; });
  var h = '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between"><div style="font-size:13px;font-weight:500">Tüm Evraklar (' + evraklar.length + ')</div></div>';
  if (!evraklar.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)">Henüz evrak yok</div>'; el.innerHTML = h; return; }
  h += '<table class="tbl"><thead><tr><th>Tür</th><th>Dosya</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>';
  evraklar.forEach(function(e) { var dosya = _loadD().find(function(d) { return d.id === e.dosya_id; }); var tur = EVRAK_TUR[e.tur] || { l: e.tur }; var durum = EVRAK_DURUM[e.durum] || EVRAK_DURUM.taslak; h += '<tr><td style="font-size:11px;font-weight:500">' + _esc(tur.l) + '</td><td style="font-size:11px;color:var(--ac)">' + _esc(dosya?.dosyaNo || '—') + '</td><td>' + _badge(durum.l, durum.c, durum.bg) + '</td><td style="font-size:11px;font-family:monospace">' + _esc(e.createdAt || '—') + '</td><td><button class="btn btns" onclick="window._ihrEvrakDuzenle(\'' + e.id + '\')" style="font-size:10px;padding:2px 8px">✏️</button></td></tr>'; });
  h += '</tbody></table>'; el.innerHTML = h;
}

/* ── ROLLER ───────────────────────────────────────────────── */
function _ihrRenderRoller(el) {
  var gumrukculer = _loadGM().filter(function(g) { return !g.isDeleted; });
  var forwarderlar = _loadFW().filter(function(f) { return !f.isDeleted; });
  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px">';
  h += '<div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-size:12px;font-weight:500">Gümrükçüler</div><button class="btn btnp" onclick="window._ihrGumrukcuEkle()" style="font-size:11px">+ Ekle</button></div>';
  if (!gumrukculer.length) h += '<div style="padding:20px;text-align:center;color:var(--t2);background:var(--s2);border-radius:8px">Kayıt yok</div>';
  gumrukculer.forEach(function(g) { var gun = g.vekalet_bitis ? Math.ceil((new Date(g.vekalet_bitis) - new Date()) / 86400000) : null; h += '<div style="border:0.5px solid ' + (gun !== null && gun <= 30 ? '#D97706' : 'var(--b)') + ';border-radius:10px;padding:12px 14px;margin-bottom:8px"><div style="font-size:12px;font-weight:500">' + _esc(g.firma_adi) + '</div><div style="font-size:11px;color:var(--t2)">' + _esc(g.yetkili_adi || '') + '</div>' + (gun !== null ? '<div style="font-size:10px;color:' + (gun <= 7 ? '#DC2626' : '#D97706') + ';margin-top:4px">Vekalet: ' + gun + ' gün</div>' : '') + '</div>'; });
  h += '</div><div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-size:12px;font-weight:500">Forwarderlar</div><button class="btn btnp" onclick="window._ihrForwarderEkle()" style="font-size:11px">+ Ekle</button></div>';
  if (!forwarderlar.length) h += '<div style="padding:20px;text-align:center;color:var(--t2);background:var(--s2);border-radius:8px">Kayıt yok</div>';
  forwarderlar.forEach(function(f) { h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px"><div style="font-size:12px;font-weight:500">' + _esc(f.firma_adi) + '</div>' + ((f.tercih_armator || []).length ? '<div style="font-size:10px;color:#16A34A">Tercih: ' + _esc(f.tercih_armator.join(', ')) + '</div>' : '') + '</div>'; });
  h += '</div></div>'; el.innerHTML = h;
}

/* ── TEMPLATELER ─────────────────────────────────────────── */
function _ihrRenderTemplates(el) {
  var templates = _loadT().filter(function(t) { return !t.isDeleted; });
  var h = '<div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">Templateler</div></div>';
  if (!templates.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)">Henüz template yok</div>'; el.innerHTML = h; return; }
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px 20px">';
  templates.forEach(function(t) { h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:14px"><div style="font-size:13px;font-weight:500;margin-bottom:4px">' + _esc(t.ad) + '</div><div style="font-size:11px;color:var(--t2);margin-bottom:8px">' + _esc(t.musteriAd || 'Genel') + '</div><button class="btn btnp" onclick="window._ihrYeniEmir(\'' + t.id + '\')" style="font-size:10px;width:100%">Bu Template ile Aç</button></div>'; });
  h += '</div>'; el.innerHTML = h;
}

/* ── YENİ EMİR ───────────────────────────────────────────── */
window._ihrYeniEmir = function(templateId) {
  var tpl = templateId ? _loadT().find(function(t) { return t.id === templateId; }) : null;
  var users = _loadUsers(); var cariList = _loadCari(); var gumrukculer = _loadGM(); var forwarderlar = _loadFW();
  var ex = _g('mo-ihr-emir'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ihr-emir';
  mo.innerHTML = '<div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">+ Yeni İhracat Emri</div><button onclick="document.getElementById(\'mo-ihr-emir\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div><div style="padding:18px 20px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><div class="fl">Müşteri *</div><select class="fi" id="ihr-musteri"><option value="">— Seçin —</option>' + cariList.map(function(c) { return '<option value="' + c.id + '">' + _esc(c.name) + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Teslim Şekli *</div><select class="fi" id="ihr-incoterms"><option value="">— Seçin —</option>' + INCOTERMS.map(function(i) { return '<option value="' + i + '"' + (tpl && tpl.teslim_sekli === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Varış Limanı *</div><input class="fi" id="ihr-varis" value="' + _esc(tpl ? tpl.varis_limani : '') + '" placeholder="Abidjan Port"></div>'
    + '<div><div class="fl">Ödeme</div><select class="fi" id="ihr-odeme"><option value="">—</option>' + ODEME.map(function(o) { return '<option value="' + o + '">' + o + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Başlangıç</div><input class="fi" type="date" id="ihr-baslangic" value="' + _today() + '"></div>'
    + '<div><div class="fl">Süre (gün)</div><input class="fi" type="number" id="ihr-sure" value="' + (tpl ? tpl.sure_gun || 7 : 7) + '" min="1"></div>'
    + '<div><div class="fl">Gümrükçü</div><select class="fi" id="ihr-gumrukcu"><option value="">—</option>' + gumrukculer.map(function(g) { return '<option value="' + g.id + '">' + _esc(g.firma_adi) + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Forwarder</div><select class="fi" id="ihr-forwarder"><option value="">—</option>' + forwarderlar.map(function(f) { return '<option value="' + f.id + '">' + _esc(f.firma_adi) + '</option>'; }).join('') + '</select></div>'
    + '</div><div style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ihr-not" rows="2" style="resize:vertical"></textarea></div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-ihr-emir\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrEmirKaydet()">Dosyayı Aç</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrEmirKaydet = function() {
  var musteriId = _g('ihr-musteri')?.value; var incoterms = _g('ihr-incoterms')?.value; var varis = (_g('ihr-varis')?.value || '').trim();
  if (!musteriId) { window.toast?.('Müşteri seçiniz', 'err'); return; }
  if (!incoterms) { window.toast?.('Teslim şekli seçiniz', 'err'); return; }
  if (!varis) { window.toast?.('Varış limanı giriniz', 'err'); return; }
  var musteri = _loadCari().find(function(c) { return String(c.id) === String(musteriId); });
  var baslangic = _g('ihr-baslangic')?.value || _today(); var sure = parseInt(_g('ihr-sure')?.value || 7);
  var bitis = new Date(baslangic); bitis.setDate(bitis.getDate() + sure);
  var d = _loadD();
  var dosya = { id: _genId(), dosyaNo: _nextDosyaNo(), musteri_id: musteriId, musteriAd: musteri?.name || '', teslim_sekli: incoterms, varis_limani: varis, odeme_sarti: _g('ihr-odeme')?.value || '', gumrukcu_id: _g('ihr-gumrukcu')?.value || '', forwarder_id: _g('ihr-forwarder')?.value || '', not: (_g('ihr-not')?.value || '').trim(), sure_gun: sure, baslangic_tarihi: baslangic, bitis_tarihi: bitis.toISOString().slice(0, 10), durum: 'hazirlaniyor', createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() };
  d.unshift(dosya); _storeD(d);
  _g('mo-ihr-emir')?.remove();
  window.toast?.('Dosya açıldı: ' + dosya.dosyaNo, 'ok');
  window.logActivity?.('ihracat', 'İhracat dosyası açıldı: ' + dosya.dosyaNo);
  _aktifDosyaId = dosya.id; window.renderIhracatOps();
};

/* ── YARDIMCILAR ─────────────────────────────────────────── */
window._ihrGeriDon = function() { _aktifDosyaId = null; _ihrRenderContent(); };
window._ihrSearch = function(v) { _search = v; _ihrRenderContent(); };
window._ihrDurumFilter = function(v) { _durumFilter = v; _ihrRenderContent(); };
window._ihrAcDosya = _ihrAcDosya;
window._ihrRunChecks = function() {
  var today = _today(); var uyari = 0;
  _loadGM().forEach(function(g) { if (!g.vekalet_bitis) return; var gun = Math.ceil((new Date(g.vekalet_bitis) - new Date()) / 86400000); if (gun <= 30) { uyari++; window.addNotif?.('⚠️', g.firma_adi + ': Vekalet ' + gun + ' günde bitiyor', 'warn', 'ihracat'); } });
  _loadD().filter(function(d) { return !['kapandi', 'iptal'].includes(d.durum) && d.bitis_tarihi && d.bitis_tarihi < today; }).forEach(function(d) { uyari++; window.addNotif?.('🔴', d.dosyaNo + ' gecikmiş!', 'err', 'ihracat'); });
  window.toast?.(uyari > 0 ? uyari + ' uyarı' : 'Temiz', uyari > 0 ? 'warn' : 'ok');
};

/* ── STUB'LAR ────────────────────────────────────────────── */
window._ihrDosyaDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrDurumDegistir = function() { window.toast?.('Yakında', 'warn'); };
window._ihrUrunEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakOnayla = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakGonder = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakOlustur = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGumrukcuAta = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGumrukcuEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGumrukcuDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrForwarderAta = function() { window.toast?.('Yakında', 'warn'); };
window._ihrForwarderEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrForwarderDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGcbEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGcbDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGcbKapat = function() { window.toast?.('Yakında', 'warn'); };
window._ihrBlEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrBlDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrBlMusteriyeIlet = function() { window.toast?.('Yakında', 'warn'); };
window._ihrGumrukcuMail = function() { window.toast?.('Yakında', 'warn'); };
window._ihrForwarderMail = function() { window.toast?.('Yakında', 'warn'); };
window._ihrTemplateEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrTemplateDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrTemplateKullan = function(id) { window._ihrYeniEmir(id); };

})();
