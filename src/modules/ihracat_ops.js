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
    panel.innerHTML = '<div class="ph"><div><div class="pht">İhracat Ops</div><div class="phs">İhracat emirleri ve operasyon takibi</div></div><div class="ur"><button class="btn btns" onclick="window.excelImportAc?.()">Excel Import</button><button class="btn btns" onclick="window._ihrRunChecks()">Kontrol Et</button><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div><div id="ihr-tabs" style="display:flex;border-bottom:0.5px solid var(--b);padding:0 20px"></div><div id="ihr-content" style="padding:0"></div>';
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
function _ihrAcDosya(id) { id = String(id); _aktifDosyaId = id; _aktifTab = 'emirler'; _ihrRenderTabs(); _ihrRenderDosyaDetay(id); }

function _ihrRenderDosyaDetay(id) {
  var el = _g('ihr-content'); if (!el) return;
  var d = _loadD().find(function(x) { return String(x.id) === String(id); });
  if (!d) { _aktifDosyaId = null; _ihrRenderContent(); return; }

  var today = _today();
  var gecikmiMi = d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum);

  var DURUM_STEPS = [
    { v: 'taslak',       l: 'Taslak' },
    { v: 'hazirlaniyor', l: 'Hazırlanıyor' },
    { v: 'yukleniyor',   l: 'Yükleniyor' },
    { v: 'yuklendi',     l: 'Yüklendi' },
    { v: 'yolda',        l: 'Yolda' },
    { v: 'teslim',       l: 'Teslim' }
  ];
  var aktifIdx = -1;
  DURUM_STEPS.forEach(function(s, i) { if (s.v === d.durum) aktifIdx = i; });

  /* Timeline */
  var timelineH = '<div style="display:flex;align-items:flex-start;gap:0;padding:14px 20px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  DURUM_STEPS.forEach(function(s, i) {
    var tamamlandi = i < aktifIdx;
    var aktifmi    = i === aktifIdx;
    var numBg  = tamamlandi ? '#EAF3DE' : aktifmi ? '#185FA5' : 'var(--sf)';
    var numClr = tamamlandi ? '#27500A' : aktifmi ? '#fff'    : 'var(--t3)';
    var numBrd = (tamamlandi || aktifmi) ? 'none' : '1px solid var(--bm)';
    var txtClr = aktifmi ? '#185FA5' : tamamlandi ? '#27500A' : 'var(--t3)';
    var numTxt = tamamlandi ? '&#10003;' : (i + 1);
    timelineH += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">';
    timelineH += '<div style="width:24px;height:24px;border-radius:50%;background:' + numBg + ';color:' + numClr + ';border:' + numBrd + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500">' + numTxt + '</div>';
    timelineH += '<div style="font-size:10px;color:' + txtClr + ';font-weight:' + (aktifmi ? '500' : '400') + ';white-space:nowrap">' + _esc(s.l) + '</div>';
    timelineH += '</div>';
    if (i < DURUM_STEPS.length - 1) {
      var lineBg = i < aktifIdx ? '#185FA5' : 'var(--b)';
      timelineH += '<div style="flex:1;height:1px;background:' + lineBg + ';margin-top:12px"></div>';
    }
  });
  timelineH += '</div>';

  /* Üst bar */
  var h = '<div style="padding:10px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--s2)">';
  h += '<button onclick="window._ihrGeriDon()" class="btn btns" style="font-size:11px;padding:4px 10px">\u2190 Geri</button>';
  h += '<span style="font-size:13px;font-weight:500;color:var(--ac)">' + _esc(d.dosyaNo) + '</span>';
  h += '<span style="font-size:12px;color:var(--t2)">' + _esc(d.musteriAd || '') + '</span>';
  h += _dosyaBadge(d.durum);
  if (gecikmiMi) h += '<span style="font-size:11px;color:#DC2626;font-weight:500">\u26a0\ufe0f Gecikti</span>';
  h += '<div style="margin-left:auto;display:flex;gap:6px">';
  h += '<button class="btn btns" onclick="window._ihrDosyaDuzenle(\'' + id + '\')" style="font-size:11px">Düzenle</button>';
  if (_isManager()) h += '<button class="btn" style="font-size:11px;background:#16A34A;color:#fff;border-color:#16A34A" onclick="window._ihrDurumDegistir(\'' + id + '\')">Durum Değiştir</button>';
  h += '</div></div>';

  /* Timeline */
  h += timelineH;

  /* Alt sekmeler */
  var SEKMELER = [
    { id: 'ozet', l: 'Özet' }, { id: 'urunler', l: 'Ürünler' }, { id: 'evraklar', l: 'Evraklar' },
    { id: 'gumrukcu', l: 'Gümrükçü' }, { id: 'forwarder', l: 'Forwarder' }, { id: 'gcb', l: 'GÇB' }, { id: 'bl', l: 'Konşimento' }
  ];
  h += '<div style="display:flex;gap:0;border-bottom:0.5px solid var(--b);padding:0 20px" id="ihr-detay-tabs">';
  SEKMELER.forEach(function(t, i) {
    h += '<div onclick="window._ihrDetayTab(\'' + t.id + '\',\'' + id + '\')" id="ihr-dt-' + t.id + '" style="padding:8px 14px;font-size:11px;cursor:pointer;border-bottom:2px solid ' + (i === 0 ? 'var(--ac);color:var(--ac);font-weight:500' : 'transparent;color:var(--t2)') + '">' + _esc(t.l) + '</div>';
  });
  h += '</div>';
  h += '<div id="ihr-detay-content" style="padding:16px 20px"></div>';
  el.innerHTML = h;
  _ihrDetayRenderOzet(d);
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

function _ihrDetayRenderOzet(d) {
  var c = _g('ihr-detay-content'); if (!c) return;
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id); });
  var tamam = evraklar.filter(function(e) { return e.durum === 'gonderildi'; }).length;
  var gumrukculer = _loadGM();
  var gm = null; gumrukculer.forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; });
  var forwarderlar = _loadFW();
  var fw = null; forwarderlar.forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; });

  /* Progress bar hesapla */
  var sure = d.sure_gun || 7;
  var baslangic = d.baslangic_tarihi ? new Date(d.baslangic_tarihi) : new Date();
  var gecenGun = Math.max(0, Math.ceil((new Date() - baslangic) / 86400000));
  var progPct = Math.min(100, Math.round((gecenGun / sure) * 100));
  var kalanGun = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;

  /* Vekalet kontrolü */
  var vekaletGun = (gm && gm.vekalet_bitis) ? Math.ceil((new Date(gm.vekalet_bitis) - new Date()) / 86400000) : null;

  var EVRAK_LISTESI = [
    { tur: 'PI',    l: 'Proforma Invoice',     uretici: 'Duay',      alici: 'Müşteri',               kim: 'duay' },
    { tur: 'CI',    l: 'Commercial Invoice',    uretici: 'Duay',      alici: 'Gümrükçü + Müşteri',    kim: 'duay' },
    { tur: 'PL',    l: 'Packing List',          uretici: 'Duay',      alici: 'Gümrükçü + Müşteri',    kim: 'duay' },
    { tur: 'SEVK',  l: 'Sevk Emri',             uretici: 'Duay',      alici: 'Forwarder',              kim: 'duay' },
    { tur: 'YUK',   l: 'Yükleme Talimatı',      uretici: 'Duay',      alici: 'Tedarikçi + Forwarder',  kim: 'duay' },
    { tur: 'GCB',   l: 'GÇB',                   uretici: 'Gümrükçü',  alici: 'Duay > Forwarder',       kim: 'dis' },
    { tur: 'BL',    l: 'Bill of Lading',         uretici: 'Forwarder', alici: 'Duay > Müşteri',         kim: 'dis' },
    { tur: 'MENSEI',l: 'Menşei Şahadetnamesi',   uretici: 'Gümrükçü',  alici: 'Duay > Müşteri',         kim: 'dis' },
    { tur: 'EUR1',  l: 'EUR.1 / A.TR',           uretici: 'Gümrükçü',  alici: 'Duay > Müşteri',         kim: 'dis' },
    { tur: 'INSP',  l: 'Inspection Raporu',      uretici: 'Gözetim',   alici: 'Duay > Müşteri',         kim: 'dis' },
    { tur: 'SIG',   l: 'Sigorta Poliçesi',       uretici: 'Sigorta',   alici: 'Duay',                   kim: 'dis' }
  ];

  var h = '<div style="display:flex;gap:16px;align-items:flex-start">';

  /* ── SOL BLOK ── */
  h += '<div style="flex:0 0 280px;width:280px;display:flex;flex-direction:column;gap:12px">';

  /* Dosya bilgileri */
  h += '<div style="background:var(--s2);border-radius:10px;padding:14px">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Dosya Bilgileri</div>';
  var teslimVal = d.teslim_sekli ? '<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#E6F1FB;color:#0C447C;font-weight:500">' + _esc(d.teslim_sekli) + '</span> ' + _esc(d.varis_limani || '') : '—';
  var bilgiRows = [
    ['Müşteri', _esc(d.musteriAd || '—')],
    ['Teslim', teslimVal],
    ['Yükleme Limanı', _esc(d.yukleme_limani || 'İstanbul')],
    ['Ödeme Şartı', _esc(d.odeme_sarti || '—')],
    ['Sorumlu', _esc(d.sorumluAd || '—')]
  ];
  bilgiRows.forEach(function(r) {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:12px">';
    h += '<span style="color:var(--t2)">' + _esc(r[0]) + '</span><span style="font-weight:500;color:var(--t)">' + r[1] + '</span></div>';
  });
  h += '</div>';

  /* Zaman */
  h += '<div style="background:var(--s2);border-radius:10px;padding:14px">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Zaman</div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:12px"><span style="color:var(--t2)">Başlangıç</span><span style="font-family:monospace;font-size:11px">' + _esc(d.baslangic_tarihi || '—') + '</span></div>';
  var bitisClr = kalanGun !== null && kalanGun < 0 ? '#DC2626' : kalanGun !== null && kalanGun <= 2 ? '#D97706' : 'var(--t)';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:12px"><span style="color:var(--t2)">Bitiş</span><span style="font-family:monospace;font-size:11px;color:' + bitisClr + '">' + _esc(d.bitis_tarihi || '—') + '</span></div>';
  var kalanTxt = kalanGun === null ? '—' : kalanGun < 0 ? Math.abs(kalanGun) + ' gün gecikti' : kalanGun === 0 ? 'Bugün!' : kalanGun + ' gün kaldı';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px"><span style="color:var(--t2)">Kalan</span><span style="font-weight:500;color:' + bitisClr + '">' + _esc(kalanTxt) + '</span></div>';
  h += '<div style="height:5px;background:var(--b);border-radius:3px;margin-top:8px;overflow:hidden"><div style="width:' + progPct + '%;height:100%;background:' + (progPct > 85 ? '#DC2626' : '#185FA5') + ';border-radius:3px"></div></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-top:4px"><span>1. gün</span><span>' + progPct + '%</span><span>' + _esc(String(d.sure_gun || 7)) + '. gün</span></div>';
  h += '</div>';

  /* Roller */
  h += '<div style="background:var(--s2);border-radius:10px;padding:14px">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Roller</div>';
  /* Gümrükçü */
  h += '<div style="padding:8px 0;border-bottom:0.5px solid var(--b)">';
  if (gm) {
    h += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--t2)">Gümrükçü</span><span style="font-weight:500">' + _esc(gm.firma_adi) + '</span></div>';
    if (vekaletGun !== null && vekaletGun <= 30) {
      var vc = vekaletGun <= 7 ? '#DC2626' : '#D97706';
      h += '<div style="font-size:10px;color:' + vc + '">Vekalet: ' + vekaletGun + ' gün kaldı</div>';
    }
  } else {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">';
    h += '<span style="color:var(--t2)">Gümrükçü</span>';
    h += '<button class="btn btnp" onclick="window._ihrGumrukcuAta(\'' + d.id + '\')" style="font-size:10px;padding:3px 10px">Ata</button>';
    h += '</div>';
  }
  h += '</div>';
  /* Forwarder */
  h += '<div style="padding:8px 0">';
  if (fw) {
    h += '<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--t2)">Forwarder</span><span style="font-weight:500">' + _esc(fw.firma_adi) + '</span></div>';
  } else {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">';
    h += '<span style="color:var(--t2)">Forwarder</span>';
    h += '<button class="btn btnp" onclick="window._ihrForwarderAta(\'' + d.id + '\')" style="font-size:10px;padding:3px 10px">Ata</button>';
    h += '</div>';
  }
  h += '</div>';
  h += '</div>';
  h += '</div>'; /* sol blok bitti */

  /* ── SAĞ BLOK: Evraklar ── */
  h += '<div style="flex:1;min-width:0">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
  h += '<div style="font-size:12px;font-weight:500">Evrak Durumu (' + tamam + '/' + EVRAK_LISTESI.length + ')</div>';
  h += '<div style="width:120px;height:5px;background:var(--b);border-radius:3px;overflow:hidden"><div style="width:' + Math.round((tamam / EVRAK_LISTESI.length) * 100) + '%;height:100%;background:#185FA5;border-radius:3px"></div></div>';
  h += '</div>';
  h += '<div style="display:flex;flex-direction:column;gap:5px">';

  EVRAK_LISTESI.forEach(function(ev) {
    var kayit = null;
    evraklar.forEach(function(e) { if (e.tur === ev.tur) kayit = e; });
    var durum = kayit ? (EVRAK_DURUM[kayit.durum] || EVRAK_DURUM.taslak) : { l: 'Henüz Yok', c: '#9CA3AF', bg: 'rgba(156,163,175,.1)' };
    var isDuay = ev.kim === 'duay';
    var rowBg = kayit ? 'var(--s2)' : 'var(--sf)';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;border:0.5px solid var(--b);background:' + rowBg + '">';
    h += '<div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">';
    h += '<span style="font-size:12px;font-weight:' + (kayit ? '500' : '400') + ';color:var(--t)">' + _esc(ev.l) + '</span>';
    h += '<span style="font-size:10px;color:var(--t3)">' + _esc(ev.uretici) + ' \u2192 ' + _esc(ev.alici) + '</span>';
    h += '</div>';
    h += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">';
    h += _badge(durum.l, durum.c, durum.bg);

    if (isDuay) {
      if (!kayit) {
        h += '<button class="btn btns" onclick="window._ihrEvrakOlustur(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Oluştur</button>';
      } else {
        h += '<button class="btn btns" onclick="window._ihrPdfOnizle(\'' + d.id + '\',\'' + ev.tur + '\',null)" style="font-size:10px;padding:2px 8px">Görüntüle</button>';
        if (kayit.durum === 'taslak') {
          h += '<button class="btn btns" onclick="window._ihrEvrakOnayla(\'' + kayit.id + '\')" style="font-size:10px;padding:2px 8px;color:#16A34A">Onayla</button>';
        } else if (kayit.durum === 'onaylandi') {
          h += '<button class="btn btns" onclick="window._ihrEvrakGonderModal(\'' + kayit.id + '\',\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Gönder</button>';
        } else if (kayit.durum === 'gonderildi') {
          h += '<span style="font-size:10px;color:#16A34A;padding:2px 4px">✓</span>';
        }
      }
    } else {
      if (!kayit) {
        h += '<button class="btn btns" onclick="window._ihrEvrakEkle(\'' + d.id + '\')" style="font-size:10px;padding:2px 8px">Yükle</button>';
      } else {
        h += '<button class="btn btns" onclick="window._ihrPdfOnizle(\'' + d.id + '\',\'' + ev.tur + '\',null)" style="font-size:10px;padding:2px 8px">Görüntüle</button>';
      }
    }
    h += '</div></div>';
  });

  h += '</div>'; /* evrak listesi */
  if (d.not) h += '<div style="margin-top:12px;background:var(--s2);padding:10px 12px;border-radius:8px;font-size:12px;color:var(--t2)">' + _esc(d.not) + '</div>';
  h += '</div>'; /* sağ blok */
  h += '</div>'; /* grid */
  c.innerHTML = h;
}

window._ihrDetayTab = function(tab, id) {
  var d = _loadD().find(function(x) { return String(x.id) === String(id); }); if (!d) return;
  document.querySelectorAll('#ihr-detay-tabs > div').forEach(function(b) { b.style.borderBottomColor = 'transparent'; b.style.color = 'var(--t2)'; b.style.fontWeight = '400'; });
  var active = _g('ihr-dt-' + tab); if (active) { active.style.borderBottomColor = 'var(--ac)'; active.style.color = 'var(--ac)'; active.style.fontWeight = '500'; }
  var c = _g('ihr-detay-content'); if (!c) return;
  if (tab === 'ozet') { _ihrDetayRenderOzet(d); return; }
  if (tab === 'urunler') { var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; }); c.innerHTML = '<div style="padding:16px 20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:12px;font-weight:500">' + urunler.length + ' ürün</div><button class="btn btnp" onclick="window._ihrUrunEkle(\'' + d.id + '\')" style="font-size:11px">+ Ürün Ekle</button></div>' + (urunler.length ? '<table class="tbl"><thead><tr><th>Ürün</th><th>Miktar</th><th>Fiyat</th><th>Toplam</th><th></th></tr></thead><tbody>' + urunler.map(function(u) { var toplam = (u.miktar || 0) * (u.birim_fiyat || 0); return '<tr><td style="font-size:11px">' + _esc(u.aciklama || '—') + '</td><td style="font-size:11px">' + (u.miktar || 0) + ' ' + _esc(u.birim || '') + '</td><td style="font-size:11px">' + (u.birim_fiyat || 0).toFixed(2) + ' ' + _esc(u.doviz || '') + '</td><td style="font-size:11px;font-weight:500">' + toplam.toFixed(2) + ' ' + _esc(u.doviz || '') + '</td><td><button class="btn btns btnd" onclick="window._ihrUrunSil(\'' + u.id + '\')" style="font-size:10px;padding:2px 6px">🗑</button></td></tr>'; }).join('') + '</tbody></table>' : '<div style="text-align:center;padding:24px;color:var(--t3)">Ürün yok</div>') + '</div>'; return; }
  if (tab === 'evraklar') { var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id); }); c.innerHTML = '<div style="padding:16px 20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:12px;font-weight:500">Evraklar</div><button class="btn btnp" onclick="window._ihrEvrakOlustur(\'' + d.id + '\',\'CI\')" style="font-size:11px">+ CI Oluştur</button></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">' + Object.keys(EVRAK_TUR).map(function(k) { var v = EVRAK_TUR[k]; var ev = evraklar.find(function(e) { return e.tur === k; }); var durum = ev ? (EVRAK_DURUM[ev.durum] || EVRAK_DURUM.taslak) : { l: 'Yok', c: '#9CA3AF', bg: 'rgba(156,163,175,.1)' }; return '<div style="border:0.5px solid var(--b);border-radius:8px;padding:10px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;font-weight:500">' + _esc(v.l) + '</span><span style="font-size:9px;padding:1px 7px;border-radius:3px;background:' + durum.bg + ';color:' + durum.c + '">' + durum.l + '</span></div>' + (ev ? '<button class="btn btns" onclick="window._ihrEvrakDuzenle(\'' + ev.id + '\')" style="font-size:10px;padding:2px 8px">Düzenle</button>' : '<button class="btn btns" onclick="window._ihrEvrakOlustur(\'' + d.id + '\',\'' + k + '\')" style="font-size:10px;padding:2px 8px">Oluştur</button>') + '</div>'; }).join('') + '</div></div>'; return; }
  if (tab === 'gumrukcu') {
    var gumrukculer = _loadGM().filter(function(g) { return !g.isDeleted; });
    var gm = d.gumrukcu_id ? gumrukculer.find(function(g) { return String(g.id) === String(d.gumrukcu_id); }) : null;
    var gh = '<div style="padding:16px 20px">';
    gh += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:12px;font-weight:500">Gümrükçü</div><button class="btn btnp" onclick="window._ihrGumrukcuAta(\'' + d.id + '\')" style="font-size:11px">' + (gm ? 'Değiştir' : 'Ata') + '</button></div>';
    if (gm) {
      gh += _detayRow('Firma', gm.firma_adi) + _detayRow('Yetkili', gm.yetkili_adi || '—') + _detayRow('Telefon', gm.telefon || '—') + _detayRow('E-posta', gm.eposta || '—');
      if (gm.vekalet_bitis) { var vGun = Math.ceil((new Date(gm.vekalet_bitis) - new Date()) / 86400000); gh += _detayRow('Vekalet Bitiş', gm.vekalet_bitis + (vGun <= 30 ? ' <span style="color:' + (vGun <= 7 ? '#DC2626' : '#D97706') + ';font-weight:500">(' + vGun + ' gün)</span>' : '')); }
      gh += '<div style="margin-top:12px;display:flex;gap:6px"><button class="btn btns" onclick="window._ihrGumrukcuMail(\'' + d.id + '\')" style="font-size:11px">Mail Gönder</button><button class="btn btns" onclick="window._ihrGumrukcuDuzenle(\'' + gm.id + '\')" style="font-size:11px">Düzenle</button></div>';
    } else { gh += '<div style="text-align:center;padding:24px;color:var(--t3)">Gümrükçü atanmadı</div>'; }
    gh += '</div>'; c.innerHTML = gh; return;
  }
  if (tab === 'forwarder') {
    var forwarderlar = _loadFW().filter(function(f) { return !f.isDeleted; });
    var fw = d.forwarder_id ? forwarderlar.find(function(f) { return String(f.id) === String(d.forwarder_id); }) : null;
    var fh = '<div style="padding:16px 20px">';
    fh += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:12px;font-weight:500">Forwarder</div><button class="btn btnp" onclick="window._ihrForwarderAta(\'' + d.id + '\')" style="font-size:11px">' + (fw ? 'Değiştir' : 'Ata') + '</button></div>';
    if (fw) {
      fh += _detayRow('Firma', fw.firma_adi) + _detayRow('Yetkili', fw.yetkili_adi || '—') + _detayRow('Telefon', fw.telefon || '—') + _detayRow('E-posta', fw.eposta || '—');
      if ((fw.tercih_armator || []).length) fh += _detayRow('Tercih Armatör', fw.tercih_armator.join(', '));
      fh += '<div style="margin-top:12px;display:flex;gap:6px"><button class="btn btns" onclick="window._ihrForwarderMail(\'' + d.id + '\')" style="font-size:11px">Mail Gönder</button><button class="btn btns" onclick="window._ihrForwarderDuzenle(\'' + fw.id + '\')" style="font-size:11px">Düzenle</button></div>';
    } else { fh += '<div style="text-align:center;padding:24px;color:var(--t3)">Forwarder atanmadı</div>'; }
    fh += '</div>'; c.innerHTML = fh; return;
  }
  if (tab === 'gcb') { var gcb = _loadG().filter(function(g) { return String(g.dosya_id) === String(d.id); })[0]; c.innerHTML = '<div style="padding:16px 20px">' + (gcb ? _detayRow('Beyanname No', gcb.beyan_no) + _detayRow('Tescil', gcb.tescil_tarihi) + _detayRow('FOB', gcb.fob_deger ? gcb.fob_deger.toLocaleString('tr-TR') + ' ' + (gcb.doviz || '') : '—') + _detayRow('Durum', gcb.durum) + '<div style="margin-top:12px;display:flex;gap:6px"><button class="btn btns" onclick="window._ihrGcbDuzenle(\'' + gcb.id + '\')" style="font-size:11px">✏️</button>' + (gcb.durum !== 'kapandi' ? '<button class="btn btns" onclick="window._ihrGcbKapat(\'' + gcb.id + '\')" style="font-size:11px;color:#16A34A">Kapat</button>' : '') + '</div>' : '<div style="text-align:center;padding:24px;color:var(--t3)">GÇB yok<br><button class="btn btnp" onclick="window._ihrGcbEkle(\'' + d.id + '\')" style="margin-top:8px;font-size:11px">+ GÇB Ekle</button></div>') + '</div>'; return; }
  if (tab === 'bl') { var bl = _loadBL().filter(function(b) { return String(b.dosya_id) === String(d.id); })[0]; c.innerHTML = '<div style="padding:16px 20px">' + (bl ? _detayRow('BL No', bl.bl_no) + _detayRow('Consignee', bl.consignee) + _detayRow('Yükleme', bl.yukleme_tarihi) + _detayRow('Tür', bl.bl_turu) + '<div style="margin-top:12px"><button class="btn btns" onclick="window._ihrBlDuzenle(\'' + bl.id + '\')" style="font-size:11px">✏️</button></div>' : '<div style="text-align:center;padding:24px;color:var(--t3)">BL yok<br><button class="btn btnp" onclick="window._ihrBlEkle(\'' + d.id + '\')" style="margin-top:8px;font-size:11px">+ BL Ekle</button></div>') + '</div>'; return; }
};
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
window._ihrTemplateKullan = function(id) { window._ihrYeniEmir(id); };
window._ihrPdfOnizle = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId); });
  var ev = null; evraklar.forEach(function(e) { if (e.tur === tur) ev = e; });
  if (ev && ev.dosya_url) { window.open(ev.dosya_url, '_blank'); return; }
  window.toast?.(_esc(tur) + ' önizleme — PDF henüz oluşturulmadı', 'warn');
};

/* ── EVRAK GÖNDER MODAL ───────────────────────────────────── */
window._ihrEvrakGonderModal = function(evrakId, dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var gm = null; _loadGM().forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; });
  var fw = null; _loadFW().forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; });

  /* Evrak türüne göre alıcı belirle */
  var ALICILAR = {
    PI:   [{ l: 'Müşteri', email: d.musteriEmail || '' }],
    CI:   [{ l: 'Gümrükçü', email: (gm && gm.eposta) || '' }, { l: 'Müşteri', email: d.musteriEmail || '' }],
    PL:   [{ l: 'Gümrükçü', email: (gm && gm.eposta) || '' }, { l: 'Müşteri', email: d.musteriEmail || '' }],
    SEVK: [{ l: 'Forwarder', email: (fw && fw.eposta) || '' }],
    YUK:  [{ l: 'Forwarder', email: (fw && fw.eposta) || '' }]
  };
  var alicilar = ALICILAR[tur] || [{ l: 'Alıcı', email: '' }];
  var ilkEmail = (alicilar[0] && alicilar[0].email) || '';
  var konu = (d.dosyaNo || '') + ' — ' + tur + ' — ' + (d.musteriAd || '');

  var aliciOpts = '';
  alicilar.forEach(function(a) {
    aliciOpts += '<option value="' + _esc(a.email) + '">' + _esc(a.l) + (a.email ? ' — ' + _esc(a.email) : ' (email tanımlı değil)') + '</option>';
  });
  aliciOpts += '<option value="diger">Diğer...</option>';

  var old = _g('mo-evrak-gonder'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-evrak-gonder';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">Evrak Gönder — ' + _esc(tur) + '</div><button onclick="document.getElementById(\'mo-evrak-gonder\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:18px 20px">'
    + '<input type="hidden" id="eg-evrak-id" value="' + evrakId + '">'
    + '<div class="fg"><div class="fl">Kime Gönderilecek</div><select class="fi" id="eg-alici" onchange="var el=document.getElementById(\'eg-email\');if(el&&this.value!==\'diger\')el.value=this.value">' + aliciOpts + '</select></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">E-posta Adresi</div><input class="fi" id="eg-email" value="' + _esc(ilkEmail) + '"></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">Konu</div><input class="fi" id="eg-konu" value="' + _esc(konu) + '"></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">Not (opsiyonel)</div><textarea class="fi" id="eg-not" rows="3" style="resize:vertical" placeholder="Evrak ile ilgili notlar..."></textarea></div>'
    + '<div style="margin-top:10px;padding:10px 12px;background:var(--s2);border-radius:8px;font-size:11px;color:var(--t2)">Gönder butonuna basınca mail uygulamanız açılacak.</div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-evrak-gonder\')?.remove()">İptal</button>'
    + '<button class="btn btns" onclick="window._evrakGonderKopyala(\'' + evrakId + '\',\'' + dosyaId + '\',\'' + tur + '\')">Konuyu Kopyala</button>'
    + '<button class="btn btnp" onclick="window._evrakGonderMail(\'' + evrakId + '\',\'' + dosyaId + '\',\'' + tur + '\')">Mail Aç</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._evrakGonderMail = function(evrakId, dosyaId, tur) {
  var email = (_g('eg-email') || {}).value || '';
  var konu  = (_g('eg-konu') || {}).value || '';
  var notTxt = (_g('eg-not') || {}).value || '';
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });

  var body = notTxt
    ? notTxt + '\n\n---\nDuay Uluslararası Ticaret\nDosya: ' + (d ? d.dosyaNo : '')
    : 'Sayın ilgili,\n\nEkte ' + tur + ' belgesi gönderilmiştir.\n\nSaygılarımızla,\nDuay Uluslararası Ticaret\nDosya: ' + (d ? d.dosyaNo : '');

  var mailtoUrl = 'mailto:' + encodeURIComponent(email)
    + '?subject=' + encodeURIComponent(konu)
    + '&body=' + encodeURIComponent(body);
  window.open(mailtoUrl);

  /* Durumu gönderildi yap */
  var evraklar = _loadE();
  var ev = null; evraklar.forEach(function(e) { if (String(e.id) === String(evrakId)) ev = e; });
  if (ev) { ev.durum = 'gonderildi'; ev.gonderim_tarihi = _now(); ev.updatedAt = _now(); _storeE(evraklar); }

  _g('mo-evrak-gonder')?.remove();
  window.toast?.('Mail uygulaması açıldı — evrak gönderildi olarak işaretlendi', 'ok');
  window.logActivity?.('ihracat', tur + ' gönderildi: ' + email);
  window.renderIhracatOps?.();
};

window._evrakGonderKopyala = function() {
  var konu = (_g('eg-konu') || {}).value || '';
  if (navigator.clipboard) { navigator.clipboard.writeText(konu); }
  window.toast?.('Konu kopyalandı', 'ok');
};

})();

/* ══════════════════════════════════════════════════════════
   IHRACAT OPS — COMMIT 3: CRUD · Mail · PDF/XLSX
   ══════════════════════════════════════════════════════════ */
(function IhracatOpsCRUD() {
'use strict';
var _g = function(id) { return document.getElementById(id); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || ''); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };
var _isAdmin = function() { return window.isAdmin?.() || (_cu()?.role === 'admin'); };
var _isManager = function() { return _isAdmin() || (_cu()?.role === 'manager'); };
var _loadD = function() { return typeof window.loadIhracatDosyalar === 'function' ? window.loadIhracatDosyalar() : []; };
var _storeD = function(d) { window.storeIhracatDosyalar?.(d); };
var _loadE = function() { return typeof window.loadIhracatEvraklar === 'function' ? window.loadIhracatEvraklar() : []; };
var _storeE = function(d) { window.storeIhracatEvraklar?.(d); };
var _loadU = function() { return typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : []; };
var _storeU = function(d) { window.storeIhracatUrunler?.(d); };
var _loadG = function() { return typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb() : []; };
var _storeG = function(d) { window.storeIhracatGcb?.(d); };
var _loadBL = function() { return typeof window.loadIhracatBl === 'function' ? window.loadIhracatBl() : []; };
var _storeBL = function(d) { window.storeIhracatBl?.(d); };
var _loadT = function() { return typeof window.loadIhracatTemplate === 'function' ? window.loadIhracatTemplate() : []; };
var _storeT = function(d) { window.storeIhracatTemplate?.(d); };
var _loadGM = function() { return typeof window.loadGumrukculer === 'function' ? window.loadGumrukculer() : []; };
var _storeGM = function(d) { window.storeGumrukculer?.(d); };
var _loadFW = function() { return typeof window.loadForwarderlar === 'function' ? window.loadForwarderlar() : []; };
var _storeFW = function(d) { window.storeForwarderlar?.(d); };
var _loadWF = function() { return typeof window.loadEvrakWorkflow === 'function' ? window.loadEvrakWorkflow() : []; };
var _storeWF = function(d) { window.storeEvrakWorkflow?.(d); };
var INCOTERMS = ['EXW','FOB','CFR','CIF','CIP','CPT','DAP','DPU','DDP','FCA','FAS'];
var BIRIM = ['PCS','KGS','MTR','SET','TON','M2','M3','LTR'];
var DOVIZ = ['USD','EUR','TRY','GBP'];
var ETIKET = ['Mavi','Pembe','Sarı','Yeşil','Mor','Turuncu'];

function _moAc(id, baslik, icerik, footer) { var old = _g(id); if (old) old.remove(); var mo = document.createElement('div'); mo.className = 'mo'; mo.id = id; mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;color:var(--t)">' + baslik + '</div><button onclick="document.getElementById(\'' + id + '\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div><div style="padding:18px 20px">' + icerik + '</div><div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">' + footer + '</div></div>'; document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10); }

// ── DOSYA DÜZENLEME ──────────────────────────────────────
window._ihrDosyaDuzenle = function(id) {
  var d = _loadD().find(function(x) { return x.id === id; }); if (!d) return;
  var users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  _moAc('mo-ihr-edit', '✏️ Dosya Düzenle — ' + _esc(d.dosyaNo),
    '<input type="hidden" id="ihr-edit-id" value="' + id + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><div class="fl">Teslim Şekli</div><select class="fi" id="ihr-edit-incoterms">' + INCOTERMS.map(function(i) { return '<option value="' + i + '"' + (d.teslim_sekli === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Varış Limanı</div><input class="fi" id="ihr-edit-varis" value="' + _esc(d.varis_limani || '') + '"></div>'
    + '<div><div class="fl">Bitiş Tarihi</div><input class="fi" type="date" id="ihr-edit-bitis" value="' + _esc(d.bitis_tarihi || '') + '"></div>'
    + '<div><div class="fl">BL Türü</div><select class="fi" id="ihr-edit-bl"><option value="seaway"' + (d.bl_turu === 'seaway' ? ' selected' : '') + '>SeaWay</option><option value="hardcopy"' + (d.bl_turu === 'hardcopy' ? ' selected' : '') + '>Hard Copy</option><option value="telex"' + (d.bl_turu === 'telex' ? ' selected' : '') + '>Telex</option></select></div>'
    + '</div><div style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ihr-edit-not" rows="2" style="resize:vertical">' + _esc(d.not || '') + '</textarea></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-ihr-edit\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrDosyaKaydet()">Kaydet</button>');
};
window._ihrDosyaKaydet = function() {
  var id = _g('ihr-edit-id')?.value; if (!id) return; var dosyalar = _loadD(); var d = dosyalar.find(function(x) { return String(x.id) === String(id); }); if (!d) return;
  d.teslim_sekli = _g('ihr-edit-incoterms')?.value || d.teslim_sekli; d.varis_limani = (_g('ihr-edit-varis')?.value || '').trim() || d.varis_limani; d.bitis_tarihi = _g('ihr-edit-bitis')?.value || d.bitis_tarihi; d.bl_turu = _g('ihr-edit-bl')?.value || d.bl_turu; d.not = (_g('ihr-edit-not')?.value || '').trim(); d.updatedAt = _now();
  _storeD(dosyalar); _g('mo-ihr-edit')?.remove(); window.toast?.('Dosya güncellendi', 'ok'); window.renderIhracatOps?.();
};

// ── DURUM DEĞİŞTİR ──────────────────────────────────────
window._ihrDurumDegistir = function(id) {
  var d = _loadD().find(function(x) { return x.id === id; }); if (!d) return;
  var durumlar = [['hazirlaniyor','Hazırlanıyor'],['yukleniyor','Yükleniyor'],['yolda','Yolda'],['teslim','Teslim'],['kapandi','Kapandı'],['iptal','İptal']];
  _moAc('mo-ihr-durum', 'Durum Değiştir — ' + _esc(d.dosyaNo),
    '<input type="hidden" id="ihr-durum-id" value="' + id + '"><div class="fg"><div class="fl">Yeni Durum</div><select class="fi" id="ihr-durum-sel">' + durumlar.map(function(x) { return '<option value="' + x[0] + '"' + (d.durum === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-ihr-durum\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrDurumKaydet()">Kaydet</button>');
};
window._ihrDurumKaydet = function() {
  var id = _g('ihr-durum-id')?.value; var yeni = _g('ihr-durum-sel')?.value; if (!id || !yeni) return;
  var dosyalar = _loadD(); var d = dosyalar.find(function(x) { return String(x.id) === String(id); }); if (!d) return;
  d.durum = yeni; d.updatedAt = _now(); _storeD(dosyalar); _g('mo-ihr-durum')?.remove();
  window.toast?.('Durum: ' + yeni, 'ok'); window.logActivity?.('ihracat', d.dosyaNo + ' → ' + yeni); window.renderIhracatOps?.();
};

// ── ÜRÜN CRUD ────────────────────────────────────────────
window._ihrUrunEkle = function(dosyaId) {
  _moAc('mo-ihr-urun', '+ Ürün Ekle',
    '<input type="hidden" id="ihr-urun-dosya" value="' + dosyaId + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div style="grid-column:1/-1"><div class="fl">Ürün Açıklaması *</div><input class="fi" id="ihr-urun-aciklama" placeholder="Ürün açıklaması"></div>'
    + '<div><div class="fl">Miktar *</div><input class="fi" type="number" id="ihr-urun-miktar" placeholder="0"></div>'
    + '<div><div class="fl">Birim</div><select class="fi" id="ihr-urun-birim">' + BIRIM.map(function(b) { return '<option>' + b + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Birim Fiyat</div><input class="fi" type="number" id="ihr-urun-fiyat" step="0.01" placeholder="0.00"></div>'
    + '<div><div class="fl">Döviz</div><select class="fi" id="ihr-urun-doviz">' + DOVIZ.map(function(d) { return '<option>' + d + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">HS Kodu</div><input class="fi" id="ihr-urun-hs" placeholder="6301.20"></div>'
    + '<div><div class="fl">Etiket</div><select class="fi" id="ihr-urun-etiket">' + ETIKET.map(function(e) { return '<option>' + e + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Brüt kg</div><input class="fi" type="number" id="ihr-urun-brut" placeholder="0"></div>'
    + '<div><div class="fl">Koli</div><input class="fi" type="number" id="ihr-urun-koli" placeholder="0"></div>'
    + '</div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-ihr-urun\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrUrunKaydet()">Ekle</button>');
};
window._ihrUrunKaydet = function() {
  var aciklama = (_g('ihr-urun-aciklama')?.value || '').trim(); var miktar = parseFloat(_g('ihr-urun-miktar')?.value || 0);
  if (!aciklama) { window.toast?.('Açıklama zorunlu', 'err'); return; } if (!miktar) { window.toast?.('Miktar zorunlu', 'err'); return; }
  var urunler = _loadU(); urunler.unshift({ id: _genId(), dosya_id: _g('ihr-urun-dosya')?.value, aciklama: aciklama, miktar: miktar, birim: _g('ihr-urun-birim')?.value || 'PCS', birim_fiyat: parseFloat(_g('ihr-urun-fiyat')?.value || 0), doviz: _g('ihr-urun-doviz')?.value || 'USD', hs_kodu: (_g('ihr-urun-hs')?.value || '').trim(), etiket_rengi: _g('ihr-urun-etiket')?.value || 'Mavi', brut_kg: parseFloat(_g('ihr-urun-brut')?.value || 0), koli_adet: parseInt(_g('ihr-urun-koli')?.value || 0), mense_ulke: 'Türkiye', createdAt: _now(), createdBy: _cu()?.id });
  _storeU(urunler); _g('mo-ihr-urun')?.remove(); window.toast?.('Ürün eklendi', 'ok'); window.renderIhracatOps?.();
};
window._ihrUrunSil = function(id) { window.confirmModal?.('Bu ürünü silmek istediğinizden emin misiniz?', { title: 'Ürün Sil', danger: true, confirmText: 'Sil', onConfirm: function() { var u = _loadU(); var item = u.find(function(x) { return String(x.id) === String(id); }); if (item) { item.isDeleted = true; item.deletedAt = _now(); } _storeU(u); window.toast?.('Silindi', 'ok'); window.renderIhracatOps?.(); } }); };

// ── GÜMRÜKÇÜ CRUD ────────────────────────────────────────
function _gmForm(id) {
  var g = id ? _loadGM().find(function(x) { return x.id === id; }) : null;
  _moAc('mo-gm', g ? '✏️ Gümrükçü Düzenle' : '+ Gümrükçü Ekle',
    '<input type="hidden" id="gm-id" value="' + (g ? g.id : '') + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Firma Adı *</div><input class="fi" id="gm-firma" value="' + _esc(g ? g.firma_adi : '') + '"></div><div><div class="fl">Yetkili</div><input class="fi" id="gm-yetkili" value="' + _esc(g ? g.yetkili_adi : '') + '"></div><div><div class="fl">E-posta</div><input class="fi" id="gm-email" value="' + _esc(g ? g.email : '') + '"></div><div><div class="fl">Telefon</div><input class="fi" id="gm-tel" value="' + _esc(g ? g.telefon : '') + '"></div><div><div class="fl">Vekalet Bitiş</div><input class="fi" type="date" id="gm-vekalet" value="' + _esc(g ? g.vekalet_bitis : '') + '"></div></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-gm\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gmKaydet()">Kaydet</button>');
}
window._ihrGumrukcuEkle = function() { _gmForm(null); };
window._ihrGumrukcuDuzenle = function(id) { _gmForm(id); };
window._gmKaydet = function() {
  var firma = (_g('gm-firma')?.value || '').trim(); if (!firma) { window.toast?.('Firma adı zorunlu', 'err'); return; }
  var id = _g('gm-id')?.value; var list = _loadGM();
  var entry = { firma_adi: firma, yetkili_adi: (_g('gm-yetkili')?.value || '').trim(), email: (_g('gm-email')?.value || '').trim(), telefon: (_g('gm-tel')?.value || '').trim(), vekalet_bitis: _g('gm-vekalet')?.value || '', aktif: true, updatedAt: _now() };
  if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); }
  _storeGM(list); _g('mo-gm')?.remove(); window.toast?.('Gümrükçü kaydedildi', 'ok'); window.renderIhracatOps?.();
};
window._ihrGumrukcuAta = function(dosyaId) { var gm = _loadGM().filter(function(g) { return !g.isDeleted && g.aktif; }); _moAc('mo-gm-ata', 'Gümrükçü Ata', '<input type="hidden" id="gm-ata-d" value="' + dosyaId + '"><div class="fg"><div class="fl">Gümrükçü</div><select class="fi" id="gm-ata-sel"><option value="">—</option>' + gm.map(function(g) { return '<option value="' + g.id + '">' + _esc(g.firma_adi) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-gm-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gmAtaKaydet()">Ata</button>'); };
window._gmAtaKaydet = function() { var did = _g('gm-ata-d')?.value; var gid = _g('gm-ata-sel')?.value; if (!gid) return; var d = _loadD(); var dosya = d.find(function(x) { return String(x.id) === String(did); }); if (dosya) { dosya.gumrukcu_id = gid; dosya.updatedAt = _now(); _storeD(d); } _g('mo-gm-ata')?.remove(); window.toast?.('Atandı', 'ok'); window.renderIhracatOps?.(); };

// ── FORWARDER CRUD ───────────────────────────────────────
function _fwForm(id) {
  var f = id ? _loadFW().find(function(x) { return x.id === id; }) : null;
  _moAc('mo-fw', f ? '✏️ Forwarder Düzenle' : '+ Forwarder Ekle',
    '<input type="hidden" id="fw-id" value="' + (f ? f.id : '') + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Firma Adı *</div><input class="fi" id="fw-firma" value="' + _esc(f ? f.firma_adi : '') + '"></div><div><div class="fl">E-posta</div><input class="fi" id="fw-email" value="' + _esc(f ? f.email : '') + '"></div><div><div class="fl">Telefon</div><input class="fi" id="fw-tel" value="' + _esc(f ? f.telefon : '') + '"></div><div style="grid-column:1/-1"><div class="fl">Tercih Armatör (virgülle)</div><input class="fi" id="fw-tercih" value="' + _esc(f ? (f.tercih_armator || []).join(', ') : '') + '"></div><div style="grid-column:1/-1"><div class="fl">Yasak Armatör (virgülle)</div><input class="fi" id="fw-yasak" value="' + _esc(f ? (f.yasak_armator || []).join(', ') : '') + '"></div></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-fw\')?.remove()">İptal</button><button class="btn btnp" onclick="window._fwKaydet()">Kaydet</button>');
}
window._ihrForwarderEkle = function() { _fwForm(null); };
window._ihrForwarderDuzenle = function(id) { _fwForm(id); };
window._fwKaydet = function() {
  var firma = (_g('fw-firma')?.value || '').trim(); if (!firma) { window.toast?.('Firma adı zorunlu', 'err'); return; }
  var id = _g('fw-id')?.value; var list = _loadFW();
  var entry = { firma_adi: firma, email: (_g('fw-email')?.value || '').trim(), telefon: (_g('fw-tel')?.value || '').trim(), tercih_armator: (_g('fw-tercih')?.value || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean), yasak_armator: (_g('fw-yasak')?.value || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean), aktif: true, updatedAt: _now() };
  if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); }
  _storeFW(list); _g('mo-fw')?.remove(); window.toast?.('Forwarder kaydedildi', 'ok'); window.renderIhracatOps?.();
};
window._ihrForwarderAta = function(dosyaId) { var fw = _loadFW().filter(function(f) { return !f.isDeleted && f.aktif; }); _moAc('mo-fw-ata', 'Forwarder Ata', '<input type="hidden" id="fw-ata-d" value="' + dosyaId + '"><div class="fg"><div class="fl">Forwarder</div><select class="fi" id="fw-ata-sel"><option value="">—</option>' + fw.map(function(f) { return '<option value="' + f.id + '">' + _esc(f.firma_adi) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-fw-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._fwAtaKaydet()">Ata</button>'); };
window._fwAtaKaydet = function() { var did = _g('fw-ata-d')?.value; var fid = _g('fw-ata-sel')?.value; if (!fid) return; var d = _loadD(); var dosya = d.find(function(x) { return String(x.id) === String(did); }); if (dosya) { dosya.forwarder_id = fid; dosya.updatedAt = _now(); _storeD(d); } _g('mo-fw-ata')?.remove(); window.toast?.('Atandı', 'ok'); window.renderIhracatOps?.(); };

// ── GÇB CRUD ─────────────────────────────────────────────
window._ihrGcbEkle = function(dosyaId) { var dosyalar = _loadD(); _moAc('mo-gcb-f', '+ GÇB Ekle', '<input type="hidden" id="gcb-f-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Dosya</div><select class="fi" id="gcb-f-dosya"><option value="">—</option>' + dosyalar.filter(function(x) { return !x.isDeleted; }).map(function(x) { return '<option value="' + x.id + '"' + (String(x.id) === String(dosyaId) ? ' selected' : '') + '>' + _esc(x.dosyaNo) + '</option>'; }).join('') + '</select></div><div><div class="fl">Beyanname No</div><input class="fi" id="gcb-f-beyan"></div><div><div class="fl">Tescil Tarihi</div><input class="fi" type="date" id="gcb-f-tescil"></div><div><div class="fl">FOB Değer</div><input class="fi" type="number" id="gcb-f-fob" step="0.01"></div><div><div class="fl">Döviz</div><select class="fi" id="gcb-f-doviz">' + DOVIZ.map(function(d) { return '<option>' + d + '</option>'; }).join('') + '</select></div><div><div class="fl">Durum</div><select class="fi" id="gcb-f-durum"><option value="bekliyor">Bekliyor</option><option value="tescil">Tescil</option><option value="kapandi">Kapandı</option></select></div></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-gcb-f\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gcbFKaydet()">Kaydet</button>'); };
window._ihrGcbDuzenle = function(id) { var g = _loadG().find(function(x) { return x.id === id; }); if (!g) return; window._ihrGcbEkle(g.dosya_id); setTimeout(function() { _g('gcb-f-id').value = id; if (_g('gcb-f-beyan')) _g('gcb-f-beyan').value = g.beyan_no || ''; if (_g('gcb-f-tescil')) _g('gcb-f-tescil').value = g.tescil_tarihi || ''; if (_g('gcb-f-fob')) _g('gcb-f-fob').value = g.fob_deger || ''; if (_g('gcb-f-doviz')) _g('gcb-f-doviz').value = g.doviz || 'USD'; if (_g('gcb-f-durum')) _g('gcb-f-durum').value = g.durum || 'bekliyor'; }, 50); };
window._gcbFKaydet = function() { var did = _g('gcb-f-dosya')?.value; if (!did) { window.toast?.('Dosya seçiniz', 'err'); return; } var id = _g('gcb-f-id')?.value; var list = _loadG(); var entry = { dosya_id: did, beyan_no: (_g('gcb-f-beyan')?.value || '').trim(), tescil_tarihi: _g('gcb-f-tescil')?.value || '', fob_deger: parseFloat(_g('gcb-f-fob')?.value || 0), doviz: _g('gcb-f-doviz')?.value || 'USD', durum: _g('gcb-f-durum')?.value || 'bekliyor', banka_zorunlu: false, updatedAt: _now() }; if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); } _storeG(list); _g('mo-gcb-f')?.remove(); window.toast?.('GÇB kaydedildi', 'ok'); window.renderIhracatOps?.(); };
window._ihrGcbKapat = function(id) { var list = _loadG(); var g = list.find(function(x) { return String(x.id) === String(id); }); if (!g) return; g.durum = 'kapandi'; g.kapanma_tarihi = _today(); g.updatedAt = _now(); _storeG(list); window.toast?.('GÇB kapatıldı', 'ok'); window.renderIhracatOps?.(); };

// ── BL CRUD ──────────────────────────────────────────────
window._ihrBlEkle = function(dosyaId) { var dosyalar = _loadD(); var d = dosyaId ? dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }) : null; _moAc('mo-bl-f', '+ BL Ekle', '<input type="hidden" id="bl-f-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Dosya</div><select class="fi" id="bl-f-dosya"><option value="">—</option>' + dosyalar.filter(function(x) { return !x.isDeleted; }).map(function(x) { return '<option value="' + x.id + '"' + (String(x.id) === String(dosyaId) ? ' selected' : '') + '>' + _esc(x.dosyaNo) + '</option>'; }).join('') + '</select></div><div><div class="fl">BL No</div><input class="fi" id="bl-f-no"></div><div><div class="fl">Yükleme Tarihi</div><input class="fi" type="date" id="bl-f-yukleme"></div><div style="grid-column:1/-1"><div class="fl">Consignee</div><input class="fi" id="bl-f-consignee" value="' + _esc(d ? d.bl_consignee : '') + '"></div><div><div class="fl">Konteyner No</div><input class="fi" id="bl-f-konteyner"></div><div><div class="fl">BL Türü</div><select class="fi" id="bl-f-tur"><option value="seaway">SeaWay</option><option value="hardcopy">Hard Copy</option><option value="telex">Telex</option></select></div></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-bl-f\')?.remove()">İptal</button><button class="btn btnp" onclick="window._blFKaydet()">Kaydet</button>'); };
window._ihrBlDuzenle = function(id) { var b = _loadBL().find(function(x) { return x.id === id; }); if (!b) return; window._ihrBlEkle(b.dosya_id); setTimeout(function() { _g('bl-f-id').value = id; if (_g('bl-f-no')) _g('bl-f-no').value = b.bl_no || ''; if (_g('bl-f-yukleme')) _g('bl-f-yukleme').value = b.yukleme_tarihi || ''; if (_g('bl-f-consignee')) _g('bl-f-consignee').value = b.consignee || ''; if (_g('bl-f-konteyner')) _g('bl-f-konteyner').value = b.konteyner_no || ''; if (_g('bl-f-tur')) _g('bl-f-tur').value = b.bl_turu || 'seaway'; }, 50); };
window._blFKaydet = function() { var did = _g('bl-f-dosya')?.value; if (!did) { window.toast?.('Dosya seçiniz', 'err'); return; } var id = _g('bl-f-id')?.value; var list = _loadBL(); var entry = { dosya_id: did, bl_no: (_g('bl-f-no')?.value || '').trim(), yukleme_tarihi: _g('bl-f-yukleme')?.value || '', consignee: (_g('bl-f-consignee')?.value || '').trim(), konteyner_no: (_g('bl-f-konteyner')?.value || '').trim(), bl_turu: _g('bl-f-tur')?.value || 'seaway', shipper: 'DUAY ULUSLARARASI TİCARET LTD. ŞTİ.', updatedAt: _now() }; if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); } _storeBL(list); _g('mo-bl-f')?.remove(); window.toast?.('BL kaydedildi', 'ok'); window.renderIhracatOps?.(); };
window._ihrBlMusteriyeIlet = function() { window.toast?.('BL müşteriye iletildi', 'ok'); window.addNotif?.('🚢', 'BL müşteriye iletildi', 'ok', 'ihracat'); };

// ── EVRAK OLUŞTUR / ONAYLA / GÖNDER ─────────────────────
window._ihrEvrakOlustur = function(dosyaId, tur) { var evraklar = _loadE(); evraklar.unshift({ id: _genId(), dosya_id: dosyaId, tur: tur, durum: 'taslak', hazirlayanAd: _cu()?.name || '', createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() }); _storeE(evraklar); window.toast?.(tur + ' taslağı oluşturuldu', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakOnayla = function(id) { if (!_isManager()) { window.toast?.('Yetki yok', 'err'); return; } var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'onaylandi'; e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Onaylandı', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakGonder = function(id) { var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'gonderildi'; e.gonderim_tarihi = _now(); e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Gönderildi', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakDuzenle = function(id) { var e = _loadE().find(function(x) { return String(x.id) === String(id); }); if (!e) return; var durumlar = [['taslak','Taslak'],['onay_bekliyor','Onay Bekliyor'],['onaylandi','Onaylandı'],['gonderildi','Gönderildi']]; _moAc('mo-ev-edit', 'Evrak Düzenle', '<input type="hidden" id="ev-id" value="' + id + '"><div class="fg"><div class="fl">Durum</div><select class="fi" id="ev-durum">' + durumlar.map(function(d) { return '<option value="' + d[0] + '"' + (e.durum === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></div><div class="fg" style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ev-not" rows="2">' + _esc(e.not || '') + '</textarea></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-ev-edit\')?.remove()">İptal</button><button class="btn btnp" onclick="window._evKaydet()">Kaydet</button>'); };
window._evKaydet = function() { var id = _g('ev-id')?.value; if (!id) return; var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = _g('ev-durum')?.value || e.durum; e.not = (_g('ev-not')?.value || '').trim(); e.updatedAt = _now(); _storeE(evraklar); _g('mo-ev-edit')?.remove(); window.toast?.('Güncellendi', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakEkle = function(dosyaId) { window._ihrEvrakOlustur(dosyaId || '', 'CI'); };

// ── GÜMRÜKÇÜ / FORWARDER ATAMA ──────────────────────────
window._ihrGumrukcuAta = function(dosyaId) {
  var gumrukculer = _loadGM().filter(function(g) { return !g.isDeleted; });
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];

  var secenekler = [];
  gumrukculer.forEach(function(g) { secenekler.push({ id: 'gm_' + g.id, l: g.firma_adi + (g.yetkili_adi ? ' — ' + g.yetkili_adi : '') }); });
  cariList.forEach(function(c) { secenekler.push({ id: 'cr_' + c.id, l: c.name + ' (Cari)' }); });

  _moAc('mo-gm-ata', 'Gümrükçü Ata',
    '<input type="hidden" id="gm-ata-dosya" value="' + dosyaId + '">'
    + '<div class="fg"><div class="fl">Gümrükçü Seç</div>'
    + '<select class="fi" id="gm-ata-sel" style="width:100%"><option value="">— Seçin —</option>'
    + secenekler.map(function(s) { return '<option value="' + _esc(s.id) + '">' + _esc(s.l) + '</option>'; }).join('') + '</select></div>'
    + '<div style="margin-top:8px;font-size:11px;color:var(--t2)">Listede yoksa önce <strong>Roller</strong> sekmesinden ekleyin.</div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-gm-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gumrukcuAtaKaydet()">Ata</button>');
};

window._gumrukcuAtaKaydet = function() {
  var dosyaId = (_g('gm-ata-dosya') || {}).value;
  var secilen = (_g('gm-ata-sel') || {}).value;
  if (!secilen) { window.toast?.('Gümrükçü seçiniz', 'err'); return; }

  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;

  if (secilen.indexOf('gm_') === 0) {
    d.gumrukcu_id = secilen.replace('gm_', '');
    var gm = _loadGM().find(function(g) { return String(g.id) === String(d.gumrukcu_id); });
    d.gumrukcuAd = gm ? gm.firma_adi : '';
  } else {
    var cariId = secilen.replace('cr_', '');
    var cariList = typeof window.loadCari === 'function' ? window.loadCari() : [];
    var cari = null; cariList.forEach(function(c) { if (String(c.id) === String(cariId)) cari = c; });
    if (cari) {
      var gmList = _loadGM();
      var existing = null; gmList.forEach(function(g) { if (g.cari_id === cariId) existing = g; });
      if (existing) {
        d.gumrukcu_id = existing.id;
        d.gumrukcuAd = existing.firma_adi;
      } else {
        var yeni = { id: _genId(), firma_adi: cari.name, yetkili_adi: cari.contact || '', email: cari.email || '', telefon: cari.phone || '', aktif: true, cari_id: cariId, createdAt: _now(), createdBy: _cu()?.id };
        gmList.unshift(yeni);
        _storeGM(gmList);
        d.gumrukcu_id = yeni.id;
        d.gumrukcuAd = yeni.firma_adi;
      }
    }
  }
  d.updatedAt = _now();
  _storeD(dosyalar);
  _g('mo-gm-ata')?.remove();
  window.toast?.('Gümrükçü atandı', 'ok');
  window.logActivity?.('ihracat', 'Gümrükçü atandı: ' + (d.gumrukcuAd || '') + ' → ' + (d.dosyaNo || ''));
  window.renderIhracatOps?.();
};

window._ihrForwarderAta = function(dosyaId) {
  var forwarderlar = _loadFW().filter(function(f) { return !f.isDeleted; });
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];

  var secenekler = [];
  forwarderlar.forEach(function(f) { secenekler.push({ id: 'fw_' + f.id, l: f.firma_adi }); });
  cariList.forEach(function(c) { secenekler.push({ id: 'cr_' + c.id, l: c.name + ' (Cari)' }); });

  _moAc('mo-fw-ata', 'Forwarder Ata',
    '<input type="hidden" id="fw-ata-dosya" value="' + dosyaId + '">'
    + '<div class="fg"><div class="fl">Forwarder Seç</div>'
    + '<select class="fi" id="fw-ata-sel" style="width:100%"><option value="">— Seçin —</option>'
    + secenekler.map(function(s) { return '<option value="' + _esc(s.id) + '">' + _esc(s.l) + '</option>'; }).join('') + '</select></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-fw-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._forwarderAtaKaydet()">Ata</button>');
};

window._forwarderAtaKaydet = function() {
  var dosyaId = (_g('fw-ata-dosya') || {}).value;
  var secilen = (_g('fw-ata-sel') || {}).value;
  if (!secilen) { window.toast?.('Forwarder seçiniz', 'err'); return; }

  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;

  if (secilen.indexOf('fw_') === 0) {
    d.forwarder_id = secilen.replace('fw_', '');
    var fw = _loadFW().find(function(f) { return String(f.id) === String(d.forwarder_id); });
    d.forwarderAd = fw ? fw.firma_adi : '';
  } else {
    var cariId = secilen.replace('cr_', '');
    var cariList = typeof window.loadCari === 'function' ? window.loadCari() : [];
    var cari = null; cariList.forEach(function(c) { if (String(c.id) === String(cariId)) cari = c; });
    if (cari) {
      var fwList = _loadFW();
      var existing = null; fwList.forEach(function(f) { if (f.cari_id === cariId) existing = f; });
      if (existing) {
        d.forwarder_id = existing.id;
        d.forwarderAd = existing.firma_adi;
      } else {
        var yeni = { id: _genId(), firma_adi: cari.name, email: cari.email || '', telefon: cari.phone || '', tercih_armator: [], aktif: true, cari_id: cariId, createdAt: _now(), createdBy: _cu()?.id };
        fwList.unshift(yeni);
        _storeFW(fwList);
        d.forwarder_id = yeni.id;
        d.forwarderAd = yeni.firma_adi;
      }
    }
  }
  d.updatedAt = _now();
  _storeD(dosyalar);
  _g('mo-fw-ata')?.remove();
  window.toast?.('Forwarder atandı', 'ok');
  window.logActivity?.('ihracat', 'Forwarder atandı: ' + (d.forwarderAd || '') + ' → ' + (d.dosyaNo || ''));
  window.renderIhracatOps?.();
};

// ── MAİL TASLAKLARI ──────────────────────────────────────
window._ihrGumrukcuMail = function(dosyaId) { var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return; var gm = _loadGM().find(function(g) { return g.id === d.gumrukcu_id; }); var mail = 'Sayın ' + (gm?.yetkili_adi || 'İlgili') + ',\n\nDosya: ' + d.dosyaNo + '\nMüşteri: ' + d.musteriAd + '\nTeslim: ' + d.teslim_sekli + '\nLiman: ' + d.varis_limani + '\n\n' + (d.gumrukcu_notu || '') + '\n\nSaygılarımızla,\nDuay Uluslararası Ticaret'; _moAc('mo-mail-gm', 'Gümrükçü Mail', '<div class="fg"><div class="fl">Kime</div><input class="fi" id="m-gm-to" value="' + _esc(gm?.email || '') + '"></div><textarea class="fi" id="m-gm-body" rows="10" style="resize:vertical;font-family:monospace;font-size:11px;margin-top:8px">' + _esc(mail) + '</textarea>', '<button class="btn btns" onclick="document.getElementById(\'mo-mail-gm\')?.remove()">Kapat</button><button class="btn btns" onclick="navigator.clipboard?.writeText(document.getElementById(\'m-gm-body\')?.value);window.toast?.(\'Kopyalandı\',\'ok\')">Kopyala</button><button class="btn btnp" onclick="window.open(\'mailto:\'+encodeURIComponent(document.getElementById(\'m-gm-to\')?.value)+\'?body=\'+encodeURIComponent(document.getElementById(\'m-gm-body\')?.value))">Mail Aç</button>'); };
window._ihrForwarderMail = function(dosyaId) { var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return; var fw = _loadFW().find(function(f) { return f.id === d.forwarder_id; }); var mail = 'Sayın ' + (fw?.firma_adi || 'İlgili') + ',\n\nDosya: ' + d.dosyaNo + '\nTeslim: ' + d.teslim_sekli + '\nLiman: ' + d.varis_limani + '\n\nNavlun fiyatı ve uygun sefer önerisi beklenmektedir.\n\nSaygılarımızla,\nDuay Uluslararası Ticaret'; _moAc('mo-mail-fw', 'Forwarder Mail', '<div class="fg"><div class="fl">Kime</div><input class="fi" id="m-fw-to" value="' + _esc(fw?.email || '') + '"></div><textarea class="fi" id="m-fw-body" rows="10" style="resize:vertical;font-family:monospace;font-size:11px;margin-top:8px">' + _esc(mail) + '</textarea>', '<button class="btn btns" onclick="document.getElementById(\'mo-mail-fw\')?.remove()">Kapat</button><button class="btn btns" onclick="navigator.clipboard?.writeText(document.getElementById(\'m-fw-body\')?.value);window.toast?.(\'Kopyalandı\',\'ok\')">Kopyala</button><button class="btn btnp" onclick="window.open(\'mailto:\'+encodeURIComponent(document.getElementById(\'m-fw-to\')?.value)+\'?body=\'+encodeURIComponent(document.getElementById(\'m-fw-body\')?.value))">Mail Aç</button>'); };

// ── TEMPLATE CRUD ────────────────────────────────────────
window._ihrTemplateEkle = function() { var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; }).slice(0, 30); _moAc('mo-tpl', '+ Template Kaydet', '<div class="fg"><div class="fl">Template Adı *</div><input class="fi" id="tpl-ad"></div><div class="fg" style="margin-top:8px"><div class="fl">Dosyadan Doldur</div><select class="fi" id="tpl-dosya"><option value="">Manuel</option>' + dosyalar.map(function(d) { return '<option value="' + d.id + '">' + _esc(d.dosyaNo) + ' — ' + _esc(d.musteriAd) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-tpl\')?.remove()">İptal</button><button class="btn btnp" onclick="window._tplKaydet()">Kaydet</button>'); };
window._tplKaydet = function() { var ad = (_g('tpl-ad')?.value || '').trim(); if (!ad) { window.toast?.('Ad zorunlu', 'err'); return; } var did = _g('tpl-dosya')?.value; var d = did ? _loadD().find(function(x) { return String(x.id) === String(did); }) : null; var list = _loadT(); list.unshift({ id: _genId(), ad: ad, musteriAd: d?.musteriAd || '', teslim_sekli: d?.teslim_sekli || '', varis_limani: d?.varis_limani || '', sure_gun: d?.sure_gun || 7, gumrukcu_id: d?.gumrukcu_id || '', forwarder_id: d?.forwarder_id || '', kullanim_sayisi: 0, createdAt: _now() }); _storeT(list); _g('mo-tpl')?.remove(); window.toast?.('Template kaydedildi', 'ok'); window.renderIhracatOps?.(); };
window._ihrTemplateDuzenle = function(id) { var t = _loadT().find(function(x) { return x.id === id; }); if (!t) return; _moAc('mo-tpl-e', '✏️ Template', '<input type="hidden" id="tpl-e-id" value="' + id + '"><div class="fg"><div class="fl">Ad</div><input class="fi" id="tpl-e-ad" value="' + _esc(t.ad) + '"></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-tpl-e\')?.remove()">İptal</button><button class="btn btnp" onclick="window._tplEKaydet()">Kaydet</button>'); };
window._tplEKaydet = function() { var id = _g('tpl-e-id')?.value; if (!id) return; var list = _loadT(); var t = list.find(function(x) { return String(x.id) === String(id); }); if (!t) return; t.ad = (_g('tpl-e-ad')?.value || '').trim() || t.ad; t.updatedAt = _now(); _storeT(list); _g('mo-tpl-e')?.remove(); window.toast?.('Güncellendi', 'ok'); window.renderIhracatOps?.(); };

})();
