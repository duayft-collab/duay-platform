/**
 * src/modules/ihracat_ops.js — v2.0.0
 * İhracat Operasyon Merkezi — Tam Yeniden Yazım
 * 6 Sekme: Emirler · GÇB · Konşimento · Belgeler · Roller · Templateler
 */
(function IhracatOpsModule() {
'use strict';

// IHR-06: Kolon yonetimi sabitleri
var _IHR_KOLON_KEY = 'ak_ihr_kolon_v1';
var _IHR_KOLON_DEFAULT = ['tedarikciAd','aciklama','standart_urun_adi','miktar','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hacim_m3','mense_ulke','hs_kodu'];
var _IHR_KOLON_PRESETS = {
  'CI/PL':  ['tedarikciAd','standart_urun_adi','fatura_urun_adi','aciklama','miktar','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hacim_m3','mense_ulke','hs_kodu'],
  'GCB':    ['tedarikciAd','urun_kodu','aciklama','miktar','birim_fiyat','doviz','mense_ulke','hs_kodu','fatura_turu','gcb_no','gcb_tarih','gcb_kur','gcb_kapandi','gcb_kapama_tarihi'],
  'Sigorta':['tedarikciAd','standart_urun_adi','miktar','birim_fiyat','doviz','brut_kg','hacim_m3','police_no','police_tarihi','police_tutari','sigorta_firma'],
  'VGM':    ['tedarikciAd','konteyner_sira','koli_adet','brut_kg','net_kg','hacim_m3','konteyner_no','booking_no','muhur_no','vgm_kg','vgm_no','vgm_tarih','vgm_kaynak'],
};

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
  { id: 'emirler', l: 'İhracat Emirleri' },
  { id: 'belgeler', l: 'Belgeler' },
  { id: 'roller', l: 'Roller' },
  { id: 'templateler', l: 'Templateler' },
];

/* ══════════════════════════════════════════════════════════ */
window.renderIhracatOps = function() {
  var panel = _g('panel-ihracat-ops'); if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div class="ph"><div><div class="pht">İhracat Ops</div><div class="phs">İhracat emirleri ve operasyon takibi</div></div><div class="ur"><button class="btn btns" onclick="event.stopPropagation();window.App?.nav?.(\'ihracat-formlar\')" style="font-size:11px">Formlar</button><button class="btn btns" onclick="window.excelImportAc?.()">Excel Import</button><button class="btn btns" onclick="window._ihrRunChecks()">Kontrol Et</button><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div><div id="ihr-tabs" style="display:flex;border-bottom:0.5px solid var(--b);padding:0 20px"></div><div id="ihr-content" style="padding:0"></div>';
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

  /* Sayfalama */
  if (!window._ihrSayfa) window._ihrSayfa = 1;
  if (_search || _durumFilter !== 'all') window._ihrSayfa = 1;
  var IHR_SAYFA_BOYUT = 50;
  var ihrToplamSayfa = Math.max(1, Math.ceil(items.length / IHR_SAYFA_BOYUT));
  if (window._ihrSayfa > ihrToplamSayfa) window._ihrSayfa = ihrToplamSayfa;
  var ihrBaslangic = (window._ihrSayfa - 1) * IHR_SAYFA_BOYUT;
  var sayfaItems = items.slice(ihrBaslangic, ihrBaslangic + IHR_SAYFA_BOYUT);

  if (!items.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:36px;margin-bottom:12px">📦</div><div>İhracat emri bulunamadı</div><div style="margin-top:12px"><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div>'; el.innerHTML = h; return; }

  h += '<div style="display:flex;gap:6px;padding:0 20px 8px;align-items:center">';
  h += '<button class="btn btns" onclick="event.stopPropagation();var c=document.getElementById(\'ihr-emir-chk-all\');if(c){c.checked=!c.checked;document.querySelectorAll(\'.ihr-emir-chk\').forEach(function(x){x.checked=c.checked});window._ihrEmirChkDegis()}" style="font-size:10px">Seç</button>';
  h += '<button class="btn btns btnd" id="ihr-emir-toplu-sil" onclick="event.stopPropagation();window._ihrEmirTopluSil()" style="font-size:10px;display:none">Sil</button>';
  h += '</div>';
  h += '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="width:28px"><input type="checkbox" id="ihr-emir-chk-all" onchange="event.stopPropagation();document.querySelectorAll(\'.ihr-emir-chk\').forEach(function(c){c.checked=this.checked}.bind(this));window._ihrEmirChkDegis()"></th><th>Dosya No</th><th>Müşteri</th><th>Teslim</th><th>Bitiş</th><th>Durum</th><th>Kalan</th><th></th></tr></thead><tbody>';
  sayfaItems.forEach(function(d) {
    var kalan = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
    var kalanTxt = kalan === null ? '—' : kalan < 0 ? '<span style="color:#DC2626">' + Math.abs(kalan) + 'g gecikti</span>' : kalan + 'g';
    h += '<tr><td><input type="checkbox" class="ihr-emir-chk" data-id="' + d.id + '" onchange="window._ihrEmirChkDegis()"></td><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(d.dosyaNo || '—') + '</td><td style="font-size:12px;font-weight:500">' + _esc(d.musteriAd || '—') + '</td><td style="font-size:10px;padding:2px 7px;border-radius:3px;background:#E6F1FB;color:#0C447C">' + _esc(d.teslim_sekli || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(d.bitis_tarihi || '—') + '</td><td>' + _dosyaBadge(d.durum) + '</td><td style="font-size:11px">' + kalanTxt + '</td><td><button class="btn btns" onclick="window._ihrAcDosya(\'' + d.id + '\')" style="font-size:11px;padding:3px 8px">Aç</button></td></tr>';
  });
  h += '</tbody></table></div>';
  /* Sayfalama footer */
  if (items.length > IHR_SAYFA_BOYUT) {
    h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;font-size:11px;border-top:0.5px solid var(--b)">';
    h += '<span style="color:var(--t2)">' + (ihrBaslangic + 1) + '–' + Math.min(ihrBaslangic + IHR_SAYFA_BOYUT, items.length) + ' / ' + items.length + ' dosya</span>';
    h += '<div style="margin-left:auto;display:flex;gap:4px">';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSayfa=Math.max(1,window._ihrSayfa-1);window.renderIhracatOps()" style="font-size:10px;padding:3px 8px"' + (window._ihrSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    for (var ipi = 1; ipi <= Math.min(ihrToplamSayfa, 7); ipi++) { h += '<button class="btn ' + (ipi === window._ihrSayfa ? 'btnp' : 'btns') + '" onclick="event.stopPropagation();window._ihrSayfa=' + ipi + ';window.renderIhracatOps()" style="font-size:10px;padding:3px 8px">' + ipi + '</button>'; }
    if (ihrToplamSayfa > 7) h += '<span style="color:var(--t3)">... ' + ihrToplamSayfa + '</span>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSayfa=Math.min(' + ihrToplamSayfa + ',window._ihrSayfa+1);window.renderIhracatOps()" style="font-size:10px;padding:3px 8px"' + (window._ihrSayfa >= ihrToplamSayfa ? ' disabled' : '') + '>\u2192</button>';
    h += '</div></div>';
  }
  el.innerHTML = h;
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
    { id: 'ozet', l: 'Özet' },
    { id: 'urunler', l: 'Ürünler' },
    { id: 'evraklar', l: 'Evraklar' },
    { id: 'gumrukcu', l: 'Gümrükçü' },
    { id: 'forwarder', l: 'Forwarder' }
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
  h += '<table class="tbl"><thead><tr><th>Tür</th><th>Dosya</th><th>Durum</th><th>Hazırlayan</th><th>Tarih</th><th></th></tr></thead><tbody>';
  evraklar.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); }).forEach(function(e) {
    var dosya = _loadD().find(function(d) { return String(d.id) === String(e.dosya_id); });
    var tur = EVRAK_TUR[e.tur] || { l: e.tur };
    var durum = EVRAK_DURUM[e.durum] || EVRAK_DURUM.taslak;
    var zaman = (e.gonderim_tarihi || e.updatedAt || e.createdAt || '').slice(0, 16).replace('T', ' ');
    h += '<tr>';
    h += '<td style="font-size:11px;font-weight:500">' + _esc(tur.l) + '</td>';
    h += '<td style="font-size:11px;color:var(--ac)">' + _esc(dosya ? dosya.dosyaNo : '—') + '</td>';
    h += '<td>' + _badge(durum.l, durum.c, durum.bg) + '</td>';
    h += '<td style="font-size:11px">' + _esc(e.hazirlayanAd || '—') + '</td>';
    h += '<td style="font-size:11px;font-family:monospace">' + _esc(zaman) + '</td>';
    h += '<td><div style="display:flex;gap:4px">';
    h += '<button class="btn btns" onclick="window._ihrPdfOnizle(\'' + _esc(e.dosya_id) + '\',\'' + _esc(e.tur) + '\',null)" style="font-size:10px;padding:2px 8px">Görüntüle</button>';
    if (e.dosya_url) h += '<a href="' + _esc(e.dosya_url) + '" target="_blank" class="btn btns" style="font-size:10px;padding:2px 8px;text-decoration:none">İndir</a>';
    h += '<button class="btn btns" onclick="window._ihrEvrakDuzenle(\'' + e.id + '\')" style="font-size:10px;padding:2px 8px">Düzenle</button>';
    h += '</div></td>';
    h += '</tr>';
  });
  h += '</tbody></table>'; el.innerHTML = h;
}

/* ── ROLLER ───────────────────────────────────────────────── */
function _ihrRenderRoller(el) {
  var cariList = _loadCari();

  var gumrukculer = cariList.filter(function(c) {
    return c.type === 'gumrukcu' || (c.tags && c.tags.indexOf('gumrukcu') !== -1) ||
      (c.name && (c.name.toLowerCase().indexOf('gumruk') !== -1 || c.name.toLowerCase().indexOf('gümrük') !== -1));
  });
  var forwarderlar = cariList.filter(function(c) {
    return c.type === 'forwarder' || (c.tags && c.tags.indexOf('forwarder') !== -1) ||
      (c.name && (c.name.toLowerCase().indexOf('forwarder') !== -1 || c.name.toLowerCase().indexOf('nakliye') !== -1));
  });

  var h = '<div style="padding:16px 20px">';
  h += '<div style="background:rgba(24,95,165,.06);border:0.5px solid #B5D4F4;border-radius:10px;padding:12px 16px;font-size:11px;color:#185FA5;margin-bottom:16px">';
  h += 'Gümrükçü ve Forwarder kayıtları <strong>Cari Yönetimi</strong> üzerinden yönetilir. Buradan atama yapabilirsiniz.';
  h += '</div>';

  h += '<div style="display:flex;gap:20px;align-items:flex-start">';

  /* Gümrükçüler */
  h += '<div style="flex:1;min-width:0">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<div style="font-size:12px;font-weight:500">Gümrükçüler</div>';
  h += '<a href="#" onclick="window.navigateTo?.(\'cari\');return false;" style="font-size:11px;color:var(--ac);text-decoration:none">Cari\'de Yönet →</a>';
  h += '</div>';

  var gmListe = gumrukculer.length ? gumrukculer : cariList.slice(0, 10);
  if (!gmListe.length) {
    h += '<div style="padding:20px;text-align:center;color:var(--t2);background:var(--s2);border-radius:8px;font-size:12px">Cari kaydı bulunamadı</div>';
  } else {
    gmListe.forEach(function(c) {
      h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--sf)">';
      h += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:4px">' + _esc(c.name) + '</div>';
      if (c.email) h += '<div style="font-size:11px;color:var(--t2)">' + _esc(c.email) + '</div>';
      if (c.phone) h += '<div style="font-size:11px;color:var(--t3)">' + _esc(c.phone) + '</div>';
      h += '</div>';
    });
    if (!gumrukculer.length) {
      h += '<div style="font-size:11px;color:var(--t3);padding:4px 0">Not: Cari\'de type=\'gumrukcu\' olarak işaretleyin</div>';
    }
  }
  h += '</div>';

  /* Forwarderlar */
  h += '<div style="flex:1;min-width:0">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<div style="font-size:12px;font-weight:500">Forwarderlar</div>';
  h += '<a href="#" onclick="window.navigateTo?.(\'cari\');return false;" style="font-size:11px;color:var(--ac);text-decoration:none">Cari\'de Yönet →</a>';
  h += '</div>';

  var fwListe = forwarderlar.length ? forwarderlar : cariList.slice(0, 10);
  if (!fwListe.length) {
    h += '<div style="padding:20px;text-align:center;color:var(--t2);background:var(--s2);border-radius:8px;font-size:12px">Cari kaydı bulunamadı</div>';
  } else {
    fwListe.forEach(function(c) {
      h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--sf)">';
      h += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:4px">' + _esc(c.name) + '</div>';
      if (c.email) h += '<div style="font-size:11px;color:var(--t2)">' + _esc(c.email) + '</div>';
      if (c.phone) h += '<div style="font-size:11px;color:var(--t3)">' + _esc(c.phone) + '</div>';
      h += '</div>';
    });
    if (!forwarderlar.length) {
      h += '<div style="font-size:11px;color:var(--t3);padding:4px 0">Not: Cari\'de type=\'forwarder\' olarak işaretleyin</div>';
    }
  }
  h += '</div>';

  h += '</div></div>';
  el.innerHTML = h;
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
    + '<div style="grid-column:1/-1"><div class="fl">Dosya Adı / Referans No *</div><input class="fi" id="ihr-dosya-adi" placeholder="Örnek: Kumaş-Q2-2026, ABC-Tekstil-Nisan..." style="font-size:13px;font-weight:500"><div style="font-size:10px;color:var(--t3);margin-top:3px">Serbest format — sipariş no, müşteri kısaltma, tarih vb. kullanabilirsiniz</div></div>'
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
  var dosyaAdi = (_g('ihr-dosya-adi')?.value || '').trim();
  var musteriId = _g('ihr-musteri')?.value; var incoterms = _g('ihr-incoterms')?.value; var varis = (_g('ihr-varis')?.value || '').trim();
  if (!dosyaAdi) { window.toast?.('Dosya adı zorunludur', 'err'); return; }
  if (!musteriId) { window.toast?.('Müşteri seçiniz', 'err'); return; }
  if (!incoterms) { window.toast?.('Teslim şekli seçiniz', 'err'); return; }
  if (!varis) { window.toast?.('Varış limanı giriniz', 'err'); return; }
  var musteri = _loadCari().find(function(c) { return String(c.id) === String(musteriId); });
  var baslangic = _g('ihr-baslangic')?.value || _today(); var sure = parseInt(_g('ihr-sure')?.value || 7);
  var bitis = new Date(baslangic); bitis.setDate(bitis.getDate() + sure);
  var d = _loadD();
  var dosya = { id: _genId(), dosyaNo: dosyaAdi, musteri_id: musteriId, musteriAd: musteri?.name || '', teslim_sekli: incoterms, varis_limani: varis, odeme_sarti: _g('ihr-odeme')?.value || '', gumrukcu_id: _g('ihr-gumrukcu')?.value || '', forwarder_id: _g('ihr-forwarder')?.value || '', not: (_g('ihr-not')?.value || '').trim(), sure_gun: sure, baslangic_tarihi: baslangic, bitis_tarihi: bitis.toISOString().slice(0, 10), durum: 'hazirlaniyor', createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() };
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

  /* Teklif Talepleri */
  h += '<div style="margin-top:14px;padding-top:10px;border-top:0.5px solid var(--b)">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Teklif Talepleri</div>';
  h += '<div style="display:flex;flex-direction:column;gap:6px">';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSigortaTeklif(\'' + d.id + '\')" style="font-size:11px;justify-content:flex-start">Sigorta Teklif Talebi</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDocxIndir?.(\'' + d.id + '\',\'irq\')" style="font-size:11px;justify-content:flex-start;color:#185FA5">DOCX Sigorta Teklif</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrForwarderTeklif(\'' + d.id + '\')" style="font-size:11px;justify-content:flex-start">Navlun Teklif Talebi</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDocxIndir?.(\'' + d.id + '\',\'frq\')" style="font-size:11px;justify-content:flex-start;color:#185FA5">DOCX Forwarder Teklif</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrIcNakliyeTeklif(\'' + d.id + '\')" style="font-size:11px;justify-content:flex-start">İç Nakliye Teklif Talebi</button>';
  h += '</div></div>';

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
    var rowBg = kayit && kayit.durum !== 'taslak' ? 'var(--s2)' : 'var(--sf)';
    var zaman = kayit ? (kayit.gonderim_tarihi || kayit.updatedAt || kayit.createdAt || '') : '';
    var zamanTxt = zaman ? zaman.slice(0, 16).replace('T', ' ') : '';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;border:0.5px solid var(--b);background:' + rowBg + ';margin-bottom:5px">';

    /* Sol: evrak adı + akış + zaman */
    h += '<div style="flex:1;min-width:0">';
    h += '<span style="font-size:12px;font-weight:' + (kayit ? '500' : '400') + ';color:var(--t)">' + _esc(ev.l) + '</span>';
    h += '<div style="font-size:10px;color:var(--t3)">' + _esc(ev.uretici) + ' \u2192 ' + _esc(ev.alici);
    if (zamanTxt) h += ' <span style="color:var(--t3);margin-left:6px">' + _esc(zamanTxt) + '</span>';
    h += '</div></div>';

    /* Sağ: durum + butonlar */
    h += '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">';
    h += _badge(durum.l, durum.c, durum.bg);

    /* DOCX Üret — CI ve PL için */
    if (ev.tur === 'CI' || ev.tur === 'PL') {
      var _docxTip = ev.tur === 'CI' ? 'ci' : 'pl';
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDocxIndir?.(\'' + d.id + '\',\'' + _docxTip + '\')" style="font-size:10px;padding:2px 8px;color:#185FA5">DOCX</button>';
    }
    /* Görüntüle — her zaman */
    h += '<button class="btn btns" onclick="window._ihrPdfOnizle(\'' + d.id + '\',\'' + ev.tur + '\',null)" style="font-size:10px;padding:2px 8px">Görüntüle</button>';
    /* İndir — URL varsa */
    if (kayit && kayit.dosya_url) {
      h += '<a href="' + _esc(kayit.dosya_url) + '" target="_blank" class="btn btns" style="font-size:10px;padding:2px 8px;text-decoration:none">İndir</a>';
    }
    /* Düzenle — kayıt varsa */
    if (kayit) {
      h += '<button class="btn btns" onclick="window._ihrEvrakDuzenle(\'' + kayit.id + '\')" style="font-size:10px;padding:2px 8px">Düzenle</button>';
    }
    if (isDuay) {
      if (!kayit) {
        h += '<button class="btn btns" onclick="window._ihrEvrakOlustur(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Oluştur</button>';
      } else if (kayit.durum === 'taslak') {
        h += '<button class="btn btns" onclick="window._ihrEvrakOnayla(\'' + kayit.id + '\')" style="font-size:10px;padding:2px 8px;color:#16A34A">Onayla</button>';
      } else if (kayit.durum === 'onaylandi') {
        h += '<button class="btn btns" onclick="window._ihrEvrakGonderModal(\'' + kayit.id + '\',\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Gönder</button>';
      } else if (kayit.durum === 'gonderildi') {
        h += '<span style="font-size:10px;color:#16A34A;padding:2px 4px">✓</span>';
      }
    } else {
      if (!kayit) {
        h += '<button class="btn btns" onclick="window._ihrEvrakDosyaYukle(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Yükle</button>';
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
  if (tab === 'urunler') { _ihrDetayRenderUrunler(d, c); return; }
  if (tab === 'evraklar') { window._ihrDetayRenderEvraklar(d, c); return; }
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
window._ihrEmirChkDegis = function() {
  var n = document.querySelectorAll('.ihr-emir-chk:checked').length;
  var btn = _g('ihr-emir-toplu-sil');
  if (btn) { btn.style.display = n > 0 ? '' : 'none'; btn.textContent = n + ' Dosyayı Sil'; }
};
window._ihrEmirTopluSil = function() {
  if (!window._yetkiKontrol?.('toplu_sil')) return;
  var ids = []; document.querySelectorAll('.ihr-emir-chk:checked').forEach(function(c) { ids.push(c.dataset.id); });
  if (!ids.length) return;
  window.confirmModal?.(ids.length + ' ihracat dosyası silinecek. Emin misiniz?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var dosyalar = _loadD();
      ids.forEach(function(id) { var d = dosyalar.find(function(x) { return String(x.id) === String(id); }); if (d) { d.isDeleted = true; d.deletedAt = _now(); d.deletedBy = _cu()?.id; } });
      _storeD(dosyalar);
      window.toast?.(ids.length + ' dosya silindi', 'ok');
      window.renderIhracatOps?.();
    }
  });
};
window._ihrDurumFilter = function(v) { _durumFilter = v; _ihrRenderContent(); };
window._ihrAcDosya = _ihrAcDosya;
window._ihrRenderDosyaDetay = _ihrRenderDosyaDetay;
window._ihrRenderContent = _ihrRenderContent;
window._ihrDetayRenderOzet = _ihrDetayRenderOzet;
// DOCX modülü için veri erişim yardımcıları
window._ihrLoadDosya   = function(id) { return _loadD().find(function(x) { return String(x.id) === String(id); }); };
window._ihrLoadUrunler = function(id) { return _loadU().filter(function(u) { return String(u.dosya_id) === String(id) && !u.isDeleted; }); };
window._ihrLoadBL      = function(id) { return (_loadBL() || []).find(function(b) { return String(b.dosya_id) === String(id); }) || null; };
window._ihrUrunAra = function(q) {
  window._ihrUrunAramaQ = q;
  window._ihrUrunSayfa = 1;
  if (_aktifDosyaId) {
    var _dosya = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
    if (_dosya) { _ihrDetayRenderOzet(_dosya); }
    // Arama input'una focus geri ver
    setTimeout(function() {
      var inp = _g('ihr-urun-ara');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }, 30);
  } else {
    _ihrRenderContent();
  }
};
window._ihrRunChecks = function() {
  var today = _today(); var uyari = 0;
  _loadGM().forEach(function(g) { if (!g.vekalet_bitis) return; var gun = Math.ceil((new Date(g.vekalet_bitis) - new Date()) / 86400000); if (gun <= 30) { uyari++; window.addNotif?.('⚠️', g.firma_adi + ': Vekalet ' + gun + ' günde bitiyor', 'warn', 'ihracat'); } });
  _loadD().filter(function(d) { return !['kapandi', 'iptal'].includes(d.durum) && d.bitis_tarihi && d.bitis_tarihi < today; }).forEach(function(d) { uyari++; window.addNotif?.('🔴', d.dosyaNo + ' gecikmiş!', 'err', 'ihracat'); });
  window.toast?.(uyari > 0 ? uyari + ' uyarı' : 'Temiz', uyari > 0 ? 'warn' : 'ok');
};

/* ── ÜRÜNLER DETAY RENDER ─────────────────────────────────── */
function _ihrDetayRenderUrunler(d, el) {
  try { return _ihrDetayRenderUrunlerInner(d, el); } catch(e) { console.error('[IHR] Urunler render hata:', e); if (el) el.innerHTML = '<div style="padding:24px;color:#DC2626">Urunler yuklenemedi: ' + e.message + '</div>'; }
}
function _ihrDetayRenderUrunlerInner(d, el) {
  var tumurunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; });
  /* İhracat ID otomatik yaz */
  var dosyaNo = d.dosyaNo || d.id;
  tumurunler.forEach(function(u) { if (!u.ihracat_id) u.ihracat_id = dosyaNo; });
  var _filtreler = window._ihrUrunFiltreler || {};
  var _aramaQ = window._ihrUrunAramaQ || '';

  /* Filtreleme uygula */
  var urunler = tumurunler.filter(function(u) {
    if (_aramaQ) {
      var q = _aramaQ.toLowerCase();
      if ((u.urun_kodu || '').toLowerCase().indexOf(q) === -1 &&
          (u.aciklama || '').toLowerCase().indexOf(q) === -1 &&
          (u.tedarikciAd || '').toLowerCase().indexOf(q) === -1) return false;
    }
    for (var fk in _filtreler) { if (_filtreler[fk] && String(u[fk] || '') !== String(_filtreler[fk])) return false; }
    return true;
  });

  /* Unique değerler (filtre dropdown için) */
  var uniq = function(k) { var s = {}; tumurunler.forEach(function(u) { if (u[k]) s[u[k]] = 1; }); return Object.keys(s); };

  /* Toplam hesapla */
  var toplamUSD = 0, toplamEUR = 0;
  urunler.forEach(function(u) { var t = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); if (u.doviz === 'USD') toplamUSD += t; if (u.doviz === 'EUR') toplamEUR += t; });
  var toplamKoli = 0, toplamBrut = 0, toplamM3 = 0, eksikHs = 0, eksikFiyat = 0;
  urunler.forEach(function(u) {
    toplamKoli += parseInt(u.koli_adet) || 0; toplamBrut += parseFloat(u.brut_kg) || 0; toplamM3 += parseFloat(u.hacim_m3) || 0;
    if (!u.hs_kodu) eksikHs++; if (!u.birim_fiyat) eksikFiyat++;
  });

  /* Fiyat tutarsızlık kontrolü */
  var fiyatMap = {};
  tumurunler.forEach(function(u) { if (!u.urun_kodu) return; if (!fiyatMap[u.urun_kodu]) fiyatMap[u.urun_kodu] = {}; fiyatMap[u.urun_kodu][u.birim_fiyat] = 1; });
  var tutarsizKodlar = {};
  for (var fk in fiyatMap) { if (Object.keys(fiyatMap[fk]).length > 1) tutarsizKodlar[fk] = 1; }
  var tutarsizSayi = Object.keys(tutarsizKodlar).length;

  var h = '';

  /* SATIR 1: KPI şeridi */
  h += '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:0.5px solid var(--b);overflow-x:auto;min-height:30px">';
  h += '<span style="font-size:11px;font-weight:500;color:var(--t)">' + urunler.length + '/' + tumurunler.length + ' kalem</span>';
  if (toplamKoli > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--s2);color:var(--t2)">' + toplamKoli.toLocaleString('tr-TR') + ' koli</span>';
  if (toplamBrut > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--s2);color:var(--t2)">' + toplamBrut.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' kg</span>';
  if (toplamM3 > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--s2);color:var(--t2)">' + toplamM3.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' m\u00b3</span>';
  if (toplamUSD > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#E6F1FB;color:#0C447C;font-weight:500">$' + toplamUSD.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + '</span>';
  if (toplamEUR > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#EAF3DE;color:#27500A;font-weight:500">\u20ac' + toplamEUR.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + '</span>';
  if (eksikHs > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FAEEDA;color:#633806;cursor:default" title="HS kodu eksik ürünler: ' + eksikHs + '">HS Eksik: ' + eksikHs + '</span>';
  if (eksikFiyat > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FCEBEB;color:#791F1F">Fiyat Eksik: ' + eksikFiyat + '</span>';
  if (tutarsizSayi > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FAEEDA;color:#633806">Tutarsız: ' + tutarsizSayi + '</span>';
  var faturaTuruGrup = {};
  tumurunler.forEach(function(u) { var ft = u.fatura_turu || 'Tanımsız'; if (!faturaTuruGrup[ft]) faturaTuruGrup[ft] = 0; faturaTuruGrup[ft] += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); });
  for (var ftk in faturaTuruGrup) { if (faturaTuruGrup[ftk] > 0) h += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#EEEDFE;color:#26215C;white-space:nowrap">' + _esc(ftk.slice(0, 15)) + ': $' + Math.round(faturaTuruGrup[ftk]).toLocaleString('tr-TR') + '</span>'; }
  h += '<span style="font-size:10px;color:var(--t3);margin-left:auto;flex-shrink:0">Son: ' + _now().slice(11, 16) + '</span>';
  h += '</div>';

  /* SATIR 2: Araçlar */
  h += '<div style="display:flex;align-items:center;gap:5px;padding:5px 0;border-bottom:0.5px solid var(--b);overflow-x:auto;min-height:36px">';
  h += '<input class="fi" id="ihr-urun-ara" placeholder="Ara..." oninput="event.stopPropagation();window._ihrUrunAra?.(this.value)" value="' + _esc(_aramaQ) + '" style="width:160px;font-size:11px;flex-shrink:0" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()">';
  h += '<select class="fi" onchange="event.stopPropagation();window._ihrFiltrele(\'tedarikciAd\',this.value)" style="font-size:10px;padding:3px 6px;flex-shrink:0;max-width:120px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Tedarikçi</option>';
  uniq('tedarikciAd').sort().forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (_filtreler.tedarikciAd === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
  h += '</select>';
  h += '<select class="fi" onchange="event.stopPropagation();window._ihrFiltrele(\'etiket_rengi\',this.value)" style="font-size:10px;padding:3px 6px;flex-shrink:0;max-width:100px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Etiket</option>';
  ['Mavi', 'Pembe', 'Sarı', 'Yeşil', 'Mor', 'Turuncu'].forEach(function(v) { h += '<option value="' + v + '"' + (_filtreler.etiket_rengi === v ? ' selected' : '') + '>' + v + '</option>'; });
  h += '</select>';
  h += '<select class="fi" onchange="event.stopPropagation();window._ihrFiltrele(\'once_yukle\',this.value)" style="font-size:10px;padding:3px 6px;flex-shrink:0;max-width:100px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Yükle</option>';
  uniq('once_yukle').forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (_filtreler.once_yukle === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
  h += '</select>';
  h += '<select class="fi" onchange="event.stopPropagation();window._ihrFiltrele(\'fatura_turu\',this.value)" style="font-size:10px;padding:3px 6px;flex-shrink:0;max-width:120px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Fatura Türü</option>';
  uniq('fatura_turu').forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (_filtreler.fatura_turu === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
  h += '</select>';
  if (Object.keys(_filtreler).some(function(k) { return _filtreler[k]; }) || _aramaQ) h += '<button class="btn" onclick="event.stopPropagation();window._ihrFiltreTemizle()" style="font-size:10px;color:#DC2626">Temizle</button>';
  h += '<div style="margin-left:auto;display:flex;gap:4px;flex-shrink:0">';
  h += '<button class="btn btns" id="ihr-urun-hepsini-sec" onclick="event.stopPropagation();window._ihrUrunHepsiniSec()" style="font-size:10px">Seç</button>';
  h += '<button class="btn btns btnd" id="ihr-urun-toplu-sil" onclick="event.stopPropagation();window._ihrUrunTopluSil(\'' + d.id + '\')" style="font-size:10px;display:none">Sil</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrTopluDuzenle(\'' + d.id + '\')" style="font-size:10px">Toplu Düzenle</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKolonAyar?.(\'' + d.id + '\')" style="font-size:10px;color:#185FA5;font-weight:600" title="Kolon gorunumunu ayarla">\u2699 ' + GORUNEN_KOLONLAR.length + '/' + KOLONLAR.length + ' Kolon</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrUrunExcel(\'' + d.id + '\')" style="font-size:10px">XLSX</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrPdfOnizle(\'' + d.id + '\',\'CI\',null)" style="font-size:10px">CI</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrPdfOnizle(\'' + d.id + '\',\'PL\',null)" style="font-size:10px">PL</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDogrula(\'' + d.id + '\')" style="font-size:10px">Doğrula</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKonteynerGorunum(\'' + d.id + '\')" style="font-size:10px">Konteyner</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSatinalmaCek(\'' + d.id + '\')" style="font-size:10px">Satınalma</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrUrunEkle(\'' + d.id + '\')" style="font-size:10px">+ Ekle</button>';
  h += '</div></div>';

  if (!urunler.length) {
    h += '<div style="text-align:center;padding:32px;color:var(--t2);background:var(--s2);border-radius:8px">' + (tumurunler.length ? 'Filtreye uyan ürün yok' : 'Henüz ürün eklenmedi') + '</div>';
    el.innerHTML = h; return;
  }

  /* Kolon tanımları */
  var KOLONLAR = [
    { k: 'tedarikciAd', l: 'Tedarikçi', w: 110, filtre: true, bos: true },
    { k: 'proforma_id', l: 'Proforma ID', w: 90, filtre: false, bos: true },
    { k: 'pi_link', l: 'PI Link', w: 55, filtre: false, bos: false },
    { k: 'satis_siparis_id', l: 'Satış Sipariş', w: 85, filtre: false, bos: true },
    { k: 'siparis_id', l: 'Sipariş ID', w: 80, filtre: false, bos: true },
    { k: 'alis_fatura_no', l: 'Alış Fatura No', w: 90, filtre: false, bos: true },
    { k: 'alis_fatura_tarihi', l: 'Alış Fatura Tarihi', w: 90, filtre: true, bos: true },
    { k: 'fatura_turu', l: 'Fatura Türü', w: 90, filtre: true, bos: true },
    { k: 'urun_kodu', l: 'Ürün Kodu', w: 90, filtre: false, bos: true },
    { k: 'satici_urun_kodu', l: 'Satıcı Ürün Kodu', w: 90, filtre: false, bos: true },
    { k: 'benzer_urun_kodu', l: 'Benzer Kod', w: 80, filtre: false, bos: true },
    { k: 'satici_urun_adi', l: 'Satıcı Orijinal Adı', w: 120, filtre: false, bos: true },
    { k: 'aciklama', l: 'Ürün Açıklaması', w: 160, filtre: false, bos: true },
    { k: 'standart_urun_adi', l: 'Standart Ad (CI/PL)', w: 130, filtre: false, bos: true },
    { k: 'teknik_aciklama', l: 'Teknik Açıklama', w: 120, filtre: false, bos: true },
    { k: 'fatura_urun_adi', l: 'Faturada Geçen Ad', w: 120, filtre: false, bos: true },
    { k: 'gumrukcu_tanim', l: 'Gümrükçü Tanım', w: 110, filtre: false, bos: true },
    { k: 'mense_ulke', l: 'Menşe Ülke', w: 90, filtre: true, bos: true },
    { k: 'hs_kodu', l: 'GTIP / HS Code', w: 85, filtre: false, bos: true },
    { k: 'miktar', l: 'Miktar', w: 70, filtre: false, bos: true },
    { k: 'birim_fiyat', l: 'Birim Fiyat', w: 90, filtre: false, bos: true },
    { k: 'doviz', l: 'Kur', w: 45, filtre: true, bos: false },
    { k: 'kdv_orani', l: 'KDV%', w: 55, filtre: true, bos: false },
    { k: 'kdv_tutar', l: 'KDV Tutarı', w: 80, filtre: false, bos: false },
    { k: 'kdv_dahil', l: 'KDV Dahil', w: 90, filtre: false, bos: false },
    { k: 'teslim_tarihi', l: 'Teslim Tarihi', w: 90, filtre: true, bos: true },
    { k: 'teslim_yeri', l: 'Teslim Yeri', w: 90, filtre: true, bos: true },
    { k: 'etiket_rengi', l: 'Etiket Rengi', w: 90, filtre: true, bos: true },
    { k: 'once_yukle', l: 'Yükle Önceliği', w: 85, filtre: true, bos: true },
    { k: 'koli_adet', l: 'Koli Adedi', w: 65, filtre: false, bos: true },
    { k: 'brut_kg', l: 'Brüt KG', w: 65, filtre: false, bos: true },
    { k: 'net_kg', l: 'Net KG', w: 65, filtre: false, bos: true },
    { k: 'hacim_m3', l: 'Hacim m³', w: 65, filtre: false, bos: true },
    { k: 'konteyner_sira', l: 'Konteyner Sıra', w: 80, filtre: false, bos: true },
    { k: 'imo_urun', l: 'IMO', w: 55, filtre: true, bos: false },
    { k: 'imo_no', l: 'IMO No', w: 80, filtre: false, bos: true },
    { k: 'imo_msds', l: 'IMO MSDS', w: 70, filtre: false, bos: false },
    { k: 'dib', l: 'DİB', w: 55, filtre: true, bos: true },
    { k: 'kategori', l: 'Kategori', w: 80, filtre: true, bos: true },
    { k: 'marka', l: 'Marka', w: 70, filtre: true, bos: true },
    { k: 'duay_not', l: 'Duay Not', w: 100, filtre: false, bos: true },
    /* VGM */
    { k: 'vgm_kg', l: 'VGM KG', w: 70, filtre: false, bos: true },
    { k: 'vgm_no', l: 'VGM No', w: 80, filtre: false, bos: true },
    { k: 'vgm_kaynak', l: 'VGM Kaynak', w: 80, filtre: true, bos: true },
    { k: 'vgm_tarih', l: 'VGM Tarihi', w: 85, filtre: true, bos: true },
    /* GÇB */
    { k: 'booking_no', l: 'Booking No', w: 90, filtre: false, bos: true },
    { k: 'konteyner_no', l: 'Konteyner No', w: 90, filtre: false, bos: true },
    { k: 'muhur_no', l: 'Mühür No', w: 80, filtre: false, bos: true },
    { k: 'gcb_no', l: 'GÇB No', w: 90, filtre: false, bos: true },
    { k: 'gcb_id', l: 'GÇB ID', w: 80, filtre: false, bos: true },
    { k: 'gcb_tarih', l: 'GÇB Tarihi', w: 85, filtre: true, bos: true },
    { k: 'gcb_kur', l: 'GÇB Kur', w: 65, filtre: false, bos: true },
    { k: 'gcb_kapandi', l: 'GÇB Kapandı', w: 75, filtre: true, bos: true },
    { k: 'gcb_kapama_tarihi', l: 'GÇB Kapama Tarihi', w: 95, filtre: true, bos: true },
    { k: 'mensei_no', l: 'Menşei No', w: 80, filtre: false, bos: true },
    { k: 'mensei_tarih', l: 'Menşei Tarihi', w: 85, filtre: true, bos: true },
    /* Sigorta */
    { k: 'police_no', l: 'Poliçe No', w: 90, filtre: false, bos: true },
    { k: 'police_tarihi', l: 'Poliçe Tarihi', w: 85, filtre: true, bos: true },
    { k: 'police_kapsami', l: 'Poliçe Kapsamı', w: 100, filtre: false, bos: true },
    { k: 'police_tutari', l: 'Poliçe Tutarı', w: 85, filtre: false, bos: true },
    { k: 'sigorta_firma', l: 'Sigorta Firması', w: 100, filtre: false, bos: true },
    /* Taşıma */
    { k: 'kamyon_sofor', l: 'Kamyon Şoförü', w: 100, filtre: false, bos: true },
    { k: 'sofor_tc', l: 'TC No', w: 80, filtre: false, bos: true },
    { k: 'arac_plaka', l: 'Araç Plaka', w: 80, filtre: false, bos: true },
    { k: 'dorse_plaka', l: 'Dorse Plaka', w: 80, filtre: false, bos: true },
    { k: 'nakliye_firma', l: 'Nakliye Firması', w: 100, filtre: false, bos: true },
    { k: 'gumruk_maliyeti', l: 'Gümrük Maliyeti', w: 90, filtre: false, bos: true },
    { k: 'konteyner_satis', l: 'Konteyner Satış Fiyatı', w: 110, filtre: false, bos: true },
    { k: 'konteyner_para', l: 'Para Birimi', w: 70, filtre: true, bos: true },
    { k: 'satici_adi', l: 'Satıcı Adı', w: 100, filtre: false, bos: true },
    { k: 'gumrukcu_adi', l: 'Gümrükçü Adı', w: 100, filtre: false, bos: true },
    { k: 'muhasebeci_adi', l: 'Resmi Muhasebeci', w: 100, filtre: false, bos: true },
    { k: 'ihracat_id', l: 'İhracat ID', w: 100, filtre: false, bos: false },
    /* Son */
    { k: 'kdv_iadesi', l: 'KDV İadesi Tutarı', w: 90, filtre: false, bos: true },
    { k: 'yukleme_durumu', l: 'Yükleme Durumu', w: 90, filtre: true, bos: true }
  ];

  // IHR-06: Gorunen kolon filtresi
  window._ihrAllKolonlar = KOLONLAR;
  var _savedKols; try { _savedKols = JSON.parse(localStorage.getItem(_IHR_KOLON_KEY) || 'null'); } catch(e) { _savedKols = null; }
  var GORUNEN_KOLONLAR = (Array.isArray(_savedKols) && _savedKols.length)
    ? KOLONLAR.filter(function(col) { return _savedKols.indexOf(col.k) !== -1; })
    : KOLONLAR.filter(function(col) { return _IHR_KOLON_DEFAULT.indexOf(col.k) !== -1; });

  /* ── FREEZE LAYOUT: Sol sabit 3 kolon + Sağ kaydırılabilir ── */
  var ETIKET_RENK = { Mavi: '#185FA5', Pembe: '#D4537E', 'Sarı': '#BA7517', 'Yeşil': '#16A34A', Mor: '#7C3AED', Turuncu: '#D85A30' };
  var SELECT_KOLONLAR = { fatura_turu: ['', 'İhraç Kayıtlı KDV\'li', 'İhraç Kayıtlı KDV\'siz', 'Özel Matrah', 'Tevkifatlı', 'KDV Muaf'], mense_ulke: ['Türkiye', 'Çin', 'Hindistan', 'İtalya', 'Almanya', 'İspanya', 'Diğer'], dib: ['H', 'E'], imo_urun: ['H', 'E'], gcb_kapandi: ['', 'Kapandı', 'Açık'], vgm_kaynak: ['', 'Liman', 'Forwarder', 'İnternet'], konteyner_para: ['', 'USD', 'EUR', 'TRY'], once_yukle: ['Önce Yükle', 'Sonra Yükle', 'Yer Olursa Yükle'] };
  var DATE_KOLONLAR = ['alis_fatura_tarihi', 'gcb_tarih', 'gcb_kapama_tarihi', 'mensei_tarih', 'vgm_tarih', 'police_tarihi'];
  var sortedUrunler = urunler.slice().sort(function(a, b) { return (parseInt(a.konteyner_sira) || 99) - (parseInt(b.konteyner_sira) || 99); });

  /* Ürün sayfalama (STANDART-FIX-007) */
  if (!window._ihrUrunSayfa) window._ihrUrunSayfa = 1;
  var _IHR_URUN_SAYFA_BOY = 50;
  var _ihrUrunToplamSayfa = Math.max(1, Math.ceil(sortedUrunler.length / _IHR_URUN_SAYFA_BOY));
  if (window._ihrUrunSayfa > _ihrUrunToplamSayfa) window._ihrUrunSayfa = _ihrUrunToplamSayfa;
  var _ihrUrunBas = (window._ihrUrunSayfa - 1) * _IHR_URUN_SAYFA_BOY;
  var sayfaUrunler = sortedUrunler.slice(_ihrUrunBas, _ihrUrunBas + _IHR_URUN_SAYFA_BOY);
  var tdS = 'padding:5px 8px;border-bottom:0.5px solid var(--b);border-right:0.5px solid var(--b);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  var thS = 'padding:4px 8px;background:var(--s2);border-bottom:0.5px solid var(--b);border-right:0.5px solid var(--b);font-size:10px;white-space:nowrap;vertical-align:top;text-align:left';

  /* ── TEK TABLO + STICKY KOLONLAR ── */
  var stickyBg = 'var(--sf)';
  var stickyBgH = 'var(--s2)';
  h += '<div style="overflow-x:auto;border:0.5px solid var(--b);border-radius:8px">';
  h += '<table class="tbl" style="font-size:10px;border-collapse:collapse;table-layout:fixed">';
  /* THEAD */
  h += '<thead><tr>';
  h += '<th style="position:sticky;left:0;z-index:3;background:' + stickyBgH + ';width:28px;min-width:28px;' + thS + ';border-right:2px solid var(--b)"><input type="checkbox" id="ihr-chk-all" onchange="event.stopPropagation();window._ihrUrunTumChk(this.checked)"></th>';
  h += '<th style="position:sticky;left:28px;z-index:3;background:' + stickyBgH + ';width:110px;min-width:110px;' + thS + '">Tedarikçi</th>';
  h += '<th style="position:sticky;left:138px;z-index:3;background:' + stickyBgH + ';width:85px;min-width:85px;' + thS + '">Ürün Kodu</th>';
  h += '<th style="position:sticky;left:223px;z-index:3;background:' + stickyBgH + ';width:180px;min-width:180px;' + thS + ';border-right:2px solid var(--b)">Ürün Açıklaması</th>';
  GORUNEN_KOLONLAR.forEach(function(kol) {
    if (kol.k === 'tedarikciAd' || kol.k === 'urun_kodu' || kol.k === 'aciklama') return;
    var bosCount = kol.bos ? urunler.filter(function(u) { return !u[kol.k] || String(u[kol.k]).trim() === ''; }).length : 0;
    h += '<th style="width:' + kol.w + 'px;min-width:' + kol.w + 'px;' + thS + '">';
    h += '<div style="display:flex;align-items:center;gap:2px"><span>' + kol.l + '</span>';
    if (kol.filtre) {
      var aktif = _filtreler[kol.k];
      h += '<select onchange="event.stopPropagation();window._ihrFiltrele(\'' + kol.k + '\',this.value)" onclick="event.stopPropagation()" style="border:none;background:transparent;font-size:9px;cursor:pointer;color:' + (aktif ? '#185FA5' : 'var(--t3)') + '">';
      h += '<option value="">' + (aktif ? '\u25cf' : '\u25be') + '</option><option value="">(Tümü)</option>';
      uniq(kol.k).sort().forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (aktif === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
      h += '</select>';
    }
    h += '</div>';
    if (kol.bos && bosCount > 0) h += '<div style="font-size:9px;color:#D97706;margin-top:2px">' + bosCount + ' boş</div>';
    h += '</th>';
  });
  h += '<th style="width:50px;min-width:50px;' + thS + '"></th>';
  h += '</tr></thead>';
  /* TBODY */
  h += '<tbody id="ihr-urun-tbody">';
  sayfaUrunler.forEach(function(u) {
    var kdvOrani = parseFloat(u.kdv_orani || 0);
    var birimFiyat = parseFloat(u.birim_fiyat || 0);
    var miktar = parseFloat(u.miktar || 0);
    var topKdvHaric = miktar * birimFiyat;
    var kdvTutar = topKdvHaric * (kdvOrani / 100);
    var kdvDahil = topKdvHaric + kdvTutar;
    var tutarsiz = !!tutarsizKodlar[u.urun_kodu];
    var rowBg = tutarsiz ? '#FAEEDA11' : 'inherit';
    var cellBg = rowBg === 'inherit' ? stickyBg : rowBg;

    h += '<tr style="background:' + rowBg + '" data-id="' + u.id + '" onclick="event.stopPropagation()">';
    /* Sticky kolonlar */
    h += '<td onclick="event.stopPropagation()" style="position:sticky;left:0;z-index:2;background:' + cellBg + ';' + tdS + ';text-align:center;max-width:28px;border-right:2px solid var(--b)"><input type="checkbox" class="ihr-urun-chk" data-id="' + u.id + '" onchange="event.stopPropagation();window._ihrUrunChkDegis()"></td>';
    h += '<td onclick="event.stopPropagation()" style="position:sticky;left:28px;z-index:2;background:' + cellBg + ';' + tdS + ';max-width:110px" title="' + _esc(u.tedarikciAd || '') + '">' + _esc(u.tedarikciAd || u.tedarikci || '') + '</td>';
    h += '<td ondblclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'urun_kodu\')" onclick="event.stopPropagation()" style="position:sticky;left:138px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-family:monospace;max-width:85px">' + _esc(u.urun_kodu || '') + '</td>';
    h += '<td ondblclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'aciklama\')" onclick="event.stopPropagation()" style="position:sticky;left:223px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-weight:500;max-width:180px;border-right:2px solid var(--b)" title="' + _esc(u.aciklama || '') + '">' + _esc(u.aciklama || '') + '</td>';
    /* Kalan kolonlar */
    GORUNEN_KOLONLAR.forEach(function(kol) {
      var k = kol.k; if (k === 'tedarikciAd' || k === 'urun_kodu' || k === 'aciklama') return;
      var v = u[k]; var vs = _esc(v || '');
      if (k === 'pi_link') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" style="color:var(--ac)">Aç</a>' : '') + '</td>'; return; }
      if (k === 'kdv_tutar') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace">' + kdvTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'kdv_dahil') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;font-weight:500">' + kdvDahil.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'miktar') { h += '<td style="' + tdS + ';text-align:right;cursor:text" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'miktar\')">' + (miktar || 0).toLocaleString('tr-TR') + ' ' + _esc(u.birim || '') + '</td>'; return; }
      if (k === 'birim_fiyat') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;cursor:text;color:' + (v ? 'var(--t)' : 'var(--t3)') + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'birim_fiyat\')">' + (v ? birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(u.doviz || '') : '') + '</td>'; return; }
      if (k === 'etiket_rengi') { var er = ETIKET_RENK[v] || ''; h += '<td style="' + tdS + ';text-align:center"><div style="display:flex;align-items:center;gap:3px;justify-content:center">'; if (er) h += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + er + '"></span>'; h += '<span>' + vs + '</span></div></td>'; return; }
      if (k === 'doviz') { h += '<td style="' + tdS + ';text-align:center">' + vs + '</td>'; return; }
      if (k === 'imo_msds') { if (u.imo_urun === 'E') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac);font-size:10px">PDF</a>' : '<button class="btn btns" onclick="event.stopPropagation();window._ihrMsdsYukle(\'' + u.id + '\')" style="font-size:9px;padding:1px 5px">Yükle</button>') + '</td>'; } else { h += '<td style="' + tdS + '"><span style="font-size:9px;color:var(--t3)">—</span></td>'; } return; }
      if (k === 'yukleme_durumu') { var vgmVar = parseFloat(u.vgm_kg || 0) > 0; var durumVal = vgmVar ? 'Yüklendi' : (v || ''); var durumBg2 = durumVal === 'Yüklendi' ? '#EAF3DE' : 'var(--s2)'; var durumClr = durumVal === 'Yüklendi' ? '#27500A' : 'var(--t2)'; h += '<td style="' + tdS + '">' + (durumVal ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + durumBg2 + ';color:' + durumClr + '">' + _esc(durumVal) + '</span>' : '') + '</td>'; return; }
      if (SELECT_KOLONLAR[k]) { h += '<td onclick="event.stopPropagation()" style="' + tdS + '"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'' + k + '\',this.value)" style="font-size:10px;border:none;background:transparent;width:100%;cursor:pointer;color:var(--t)">'; SELECT_KOLONLAR[k].forEach(function(sv) { h += '<option value="' + _esc(sv) + '"' + (String(v || '') === sv ? ' selected' : '') + '>' + _esc(sv || '—') + '</option>'; }); h += '</select></td>'; return; }
      if (DATE_KOLONLAR.indexOf(k) !== -1) { h += '<td ondblclick="event.stopPropagation();window._ihrInlineDateEdit(this,\'' + u.id + '\',\'' + k + '\')" onclick="event.stopPropagation()" style="' + tdS + ';cursor:text;font-family:monospace">' + vs + '</td>'; return; }
      if (k === 'kdv_orani') { h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'kdv_orani\',parseFloat(this.value))" style="font-size:10px;border:none;background:transparent;cursor:pointer;text-align:center">'; [0, 1, 5, 10, 18, 20].forEach(function(kv) { h += '<option value="' + kv + '"' + (kdvOrani === kv ? ' selected' : '') + '>%' + kv + '</option>'; }); h += '</select></td>'; return; }
      h += '<td ondblclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'' + k + '\')" onclick="event.stopPropagation()" style="' + tdS + ';cursor:text;max-width:' + kol.w + 'px" title="' + vs + '">' + vs + '</td>';
    });
    h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center"><button class="btn btns btnd" onclick="event.stopPropagation();window._ihrUrunSil(\'' + u.id + '\')" style="font-size:9px;padding:1px 5px">Sil</button></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';

  /* Ürün sayfalama footer */
  if (sortedUrunler.length > _IHR_URUN_SAYFA_BOY) {
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;font-size:10px;color:var(--t3);border-top:0.5px solid var(--b)">';
    h += '<span>' + (_ihrUrunBas + 1) + '–' + Math.min(_ihrUrunBas + _IHR_URUN_SAYFA_BOY, sortedUrunler.length) + ' / ' + sortedUrunler.length + ' ürün</span>';
    h += '<div style="display:flex;gap:4px">';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrUrunSayfa=Math.max(1,window._ihrUrunSayfa-1);window._ihrUrunAra?.(window._ihrUrunAramaQ||\'\')" style="font-size:10px;padding:2px 8px"' + (window._ihrUrunSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrUrunSayfa=Math.min(' + _ihrUrunToplamSayfa + ',window._ihrUrunSayfa+1);window._ihrUrunAra?.(window._ihrUrunAramaQ||\'\')" style="font-size:10px;padding:2px 8px"' + (window._ihrUrunSayfa >= _ihrUrunToplamSayfa ? ' disabled' : '') + '>\u2192</button>';
    h += '</div></div>';
  }

  /* Alt satır */
  h += '<div style="display:flex;gap:16px;justify-content:flex-end;padding:8px 4px;font-size:12px;border-top:0.5px solid var(--b);margin-top:6px">';
  h += '<span style="color:var(--t3)">Gösterilen: ' + urunler.length + ' / ' + tumurunler.length + '</span>';
  if (toplamUSD > 0) h += '<span>USD: <strong>$' + toplamUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</strong></span>';
  if (toplamEUR > 0) h += '<span>EUR: <strong>\u20ac' + toplamEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</strong></span>';
  h += '</div>';
  el.innerHTML = h;
}

/* ── ÜRÜN CHECKBOX / TOPLU SİLME ─────────────────────────── */
window._ihrUrunFiltreler = window._ihrUrunFiltreler || {};
window._ihrUrunAramaQ = window._ihrUrunAramaQ || '';

window._ihrUrunTumChk = function(checked) {
  document.querySelectorAll('.ihr-urun-chk').forEach(function(c) { c.checked = checked; });
  window._ihrUrunChkDegis();
};
window._ihrUrunChkDegis = function() {
  var secili = document.querySelectorAll('.ihr-urun-chk:checked').length;
  var topluSilBtn = _g('ihr-urun-toplu-sil');
  if (topluSilBtn) { topluSilBtn.style.display = secili > 0 ? 'inline-flex' : 'none'; topluSilBtn.textContent = secili + ' Ürünü Sil'; }
};
window._ihrUrunHepsiniSec = function() {
  var chkAll = _g('ihr-chk-all');
  if (chkAll) { chkAll.checked = !chkAll.checked; window._ihrUrunTumChk(chkAll.checked); }
};
window._ihrUrunTopluSil = function(dosyaId) {
  var seciliIdler = [];
  document.querySelectorAll('.ihr-urun-chk:checked').forEach(function(c) { seciliIdler.push(c.dataset.id); });
  if (!seciliIdler.length) return;
  window.confirmModal?.(seciliIdler.length + ' ürünü silmek istiyor musunuz?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var urunler = _loadU();
      seciliIdler.forEach(function(sid) { var u = urunler.find(function(x) { return String(x.id) === String(sid); }); if (u) { u.isDeleted = true; u.deletedAt = _now(); u.deletedBy = _cu()?.id; } });
      window.storeIhracatUrunler?.(urunler);
      window.toast?.(seciliIdler.length + ' ürün silindi', 'ok');
      window.renderIhracatOps?.();
    }
  });
};

window._ihrInlineSelectDegis = function(urunId, alan, deger) {
  var urunler = _loadU(); var u = urunler.find(function(x) { return String(x.id) === String(urunId); }); if (!u) return;
  u[alan] = deger;
  if (alan === 'vgm_kg' && parseFloat(deger) > 0) u.yukleme_durumu = 'Yüklendi';
  u.updatedAt = _now(); window.storeIhracatUrunler?.(urunler);
};
window._ihrInlineDateEdit = function(td, urunId, alan) {
  if (td.querySelector('input')) return;
  var eskiDeger = td.textContent.trim();
  var inp = document.createElement('input'); inp.type = 'date'; inp.value = eskiDeger || '';
  inp.style.cssText = 'font-size:10px;padding:1px 3px;border:1px solid #185FA5;border-radius:3px;background:var(--sf);color:var(--t)';
  td.innerHTML = ''; td.appendChild(inp); inp.focus();
  var _reRender2 = function() {
    if (_aktifDosyaId) { var _dd2 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd2) { _ihrDetayRenderOzet(_dd2); return; } }
    window.renderIhracatOps?.();
  };
  inp.addEventListener('blur', function() {
    var urunler = _loadU(); var u = urunler.find(function(x) { return String(x.id) === String(urunId); });
    if (u && inp.value !== eskiDeger) { u[alan] = inp.value; u.updatedAt = _now(); window.storeIhracatUrunler?.(urunler); }
    _reRender2();
  });
  inp.addEventListener('click', function(e) { e.stopPropagation(); });
  inp.addEventListener('keydown', function(e) { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') _reRender2(); });
};

window._ihrMsdsYukle = function(urunId) {
  var url = prompt('IMO MSDS PDF URL girin (Firebase Storage linki):');
  if (!url) return;
  var urunler = _loadU(); var u = urunler.find(function(x) { return String(x.id) === String(urunId); });
  if (u) { u.imo_msds = url; u.updatedAt = _now(); window.storeIhracatUrunler?.(urunler); window.toast?.('MSDS yüklendi', 'ok'); window.renderIhracatOps?.(); }
};

/* ── SİGORTA TEKLİF FORMU ──────────────────────────────── */
window._ihrSigortaTeklif = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var toplamUSD = urunler.reduce(function(s, u) { return s + (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }, 0);
  var toplamBrut = urunler.reduce(function(s, u) { return s + (parseFloat(u.brut_kg) || 0); }, 0);
  var toplamM3 = urunler.reduce(function(s, u) { return s + (parseFloat(u.hacim_m3) || 0); }, 0);
  var cif = (toplamUSD * 1.1).toFixed(2);
  var urunTanim = urunler.slice(0, 3).map(function(u) { return u.aciklama || u.urun_kodu || ''; }).join(', ') + (urunler.length > 3 ? ' vb.' : '');
  var old = _g('mo-sigorta-teklif'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-sigorta-teklif';
  mo.innerHTML = '<div class="moc" style="max-width:620px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Sigorta Teklif Talebi — ' + _esc(d.dosyaNo) + '</div>'
    + '<div style="padding:18px 20px">'
    + '<div style="background:rgba(24,95,165,.06);border:0.5px solid #B5D4F4;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#185FA5">Bilgiler dosyadan otomatik dolduruldu. Kontrol edip mail gönderin.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fg"><div class="fl">Yükleme Limanı</div><input class="fi" id="sig-yukl" value="' + _esc(d.yukleme_limani || 'Istanbul, Türkiye') + '"></div>'
    + '<div class="fg"><div class="fl">Varış Limanı</div><input class="fi" id="sig-varis" value="' + _esc(d.varis_limani || '') + '"></div>'
    + '<div class="fg"><div class="fl">Sigorta Değeri (CIF+%10)</div><input class="fi" id="sig-deger" value="USD ' + cif + '"></div>'
    + '<div class="fg"><div class="fl">Sigorta Türü</div><select class="fi" id="sig-tur"><option>Tam Ziya (All Risk / ICC-A)</option><option>Dar Kapsamlı (ICC-C)</option><option>ICC-B</option></select></div>'
    + '<div class="fg"><div class="fl">Konteyner Tipi</div><select class="fi" id="sig-kont"><option>40 HC</option><option>40 DC</option><option>20 DC</option></select></div>'
    + '<div class="fg"><div class="fl">Brüt Ağırlık (kg)</div><input class="fi" id="sig-kg" value="' + toplamBrut.toFixed(0) + '"></div>'
    + '<div class="fg"><div class="fl">Hacim (m³)</div><input class="fi" id="sig-m3" value="' + toplamM3.toFixed(2) + '"></div>'
    + '<div class="fg"><div class="fl">Tahmini Yükleme</div><input class="fi" type="date" id="sig-tarih" value="' + (d.bitis_tarihi || '') + '"></div>'
    + '<div class="fg" style="grid-column:1/-1"><div class="fl">Ürün Tanımı (EN)</div><input class="fi" id="sig-urun" value="' + _esc(urunTanim) + '"></div>'
    + '<div class="fg"><div class="fl">Sigortacı E-posta</div><input class="fi" id="sig-email" placeholder="sigorta@firma.com"></div>'
    + '</div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-sigorta-teklif\')?.remove()">Kapat</button>'
    + '<button class="btn btnp" onclick="window._sigMailGonder()">Mail Aç</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._sigMailGonder = function() {
  var email = (_g('sig-email') || {}).value || '';
  var varis = (_g('sig-varis') || {}).value || '';
  var deger = (_g('sig-deger') || {}).value || '';
  var tur = (_g('sig-tur') || {}).value || '';
  var kont = (_g('sig-kont') || {}).value || '';
  var kg = (_g('sig-kg') || {}).value || '';
  var m3 = (_g('sig-m3') || {}).value || '';
  var urun = (_g('sig-urun') || {}).value || '';
  var tarih = (_g('sig-tarih') || {}).value || '';
  var yukl = (_g('sig-yukl') || {}).value || '';
  var konu = 'Sigorta Teklif Talebi — ' + varis + ' / ' + deger;
  var body = 'Sayın İlgili,\n\nAşağıdaki sevkiyat için kargo sigortası teklifi talep etmekteyiz.\n\nSEVK BİLGİLERİ\nYükleme  : ' + yukl + '\nVarış    : ' + varis + '\nÜrün     : ' + urun + '\nBrüt KG  : ' + kg + ' kg | Hacim: ' + m3 + ' m³\nKonteyner: ' + kont + '\n\nSİGORTA TALEBİ\nSigorta Değeri : ' + deger + '\nSigorta Türü   : ' + tur + '\nYükleme Tarihi : ' + tarih + '\n\nTeklifinizi bekliyoruz.\nSaygılarımızla, Duay Uluslararası Ticaret';
  window.open('mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(konu) + '&body=' + encodeURIComponent(body));
  window.toast?.('Mail uygulaması açıldı', 'ok'); _g('mo-sigorta-teklif')?.remove();
};

/* ── FORWARDER NAVLUN TEKLİF FORMU ────────────────────── */
window._ihrForwarderTeklif = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var toplamBrut = urunler.reduce(function(s, u) { return s + (parseFloat(u.brut_kg) || 0); }, 0);
  var toplamM3 = urunler.reduce(function(s, u) { return s + (parseFloat(u.hacim_m3) || 0); }, 0);
  var toplamKoli = urunler.reduce(function(s, u) { return s + (parseInt(u.koli_adet) || 0); }, 0);
  var imoVar = urunler.some(function(u) { return u.imo_urun === 'E'; });
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];
  var fwlar = cariList.filter(function(c) { return c.type === 'forwarder' || (c.name && c.name.toLowerCase().indexOf('forwarder') !== -1); });
  var fwOpts = '<option value="">— Seç —</option>';
  fwlar.forEach(function(f) { fwOpts += '<option value="' + _esc(f.email || '') + '">' + _esc(f.name) + '</option>'; });
  fwOpts += '<option value="manuel">Manuel gir...</option>';
  var old = _g('mo-forwarder-teklif'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-forwarder-teklif';
  mo.innerHTML = '<div class="moc" style="max-width:640px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Navlun Teklif Talebi — ' + _esc(d.dosyaNo) + '</div>'
    + '<div style="padding:18px 20px">'
    + '<div style="background:#FAEEDA;border:0.5px solid #EF9F27;border-radius:8px;padding:8px 14px;margin-bottom:14px;font-size:11px;color:#633806">Navlun teklifinde fiyat bilgisi paylaşılmaz — sadece kg/m³/ürün türü gönderilir.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fg"><div class="fl">Yükleme Limanı (POL)</div><input class="fi" id="fw-pol" value="' + _esc(d.yukleme_limani || 'Istanbul (TRIST)') + '"></div>'
    + '<div class="fg"><div class="fl">Varış Limanı (POD)</div><input class="fi" id="fw-pod" value="' + _esc(d.varis_limani || '') + '"></div>'
    + '<div class="fg"><div class="fl">Konteyner Tipi</div><select class="fi" id="fw-kont"><option>40 HC</option><option>40 DC</option><option>20 DC</option><option>Reefer</option></select></div>'
    + '<div class="fg"><div class="fl">Adet</div><input class="fi" type="number" id="fw-adet" value="1"></div>'
    + '<div class="fg"><div class="fl">Brüt KG</div><input class="fi" id="fw-kg" value="' + toplamBrut.toFixed(0) + '"></div>'
    + '<div class="fg"><div class="fl">Hacim m³</div><input class="fi" id="fw-m3" value="' + toplamM3.toFixed(2) + '"></div>'
    + '<div class="fg"><div class="fl">Koli Adedi</div><input class="fi" id="fw-koli" value="' + toplamKoli + '"></div>'
    + '<div class="fg"><div class="fl">Ürün Türü</div><input class="fi" id="fw-urun" value="Non-Hazardous General Cargo' + (imoVar ? ' (IMO maddesi içerir)' : '') + '"></div>'
    + '<div class="fg"><div class="fl">B/L Türü</div><select class="fi" id="fw-bl"><option>SeaWay BL</option><option>Hard Copy BL</option><option>Telex Release</option></select></div>'
    + '<div class="fg"><div class="fl">Navlun Ödemesi</div><select class="fi" id="fw-odeme"><option>Prepaid</option><option>Collect</option></select></div>'
    + '<div class="fg"><div class="fl">Yükleme Tarihi</div><input class="fi" type="date" id="fw-tarih" value="' + (d.bitis_tarihi || '') + '"></div>'
    + '<div class="fg"><div class="fl">Son Teklif Tarihi</div><input class="fi" type="date" id="fw-son-tarih"></div>'
    + '<div class="fg"><div class="fl">Tercih Armatör</div><input class="fi" id="fw-armator" placeholder="Maersk, CMA CGM..."></div>'
    + '<div class="fg"><div class="fl">Forwarder</div><select class="fi" id="fw-email-sel" onchange="var e=document.getElementById(\'fw-email\');if(e&&this.value!==\'manuel\')e.value=this.value">' + fwOpts + '</select></div>'
    + '<div class="fg" style="grid-column:1/-1"><div class="fl">E-posta</div><input class="fi" id="fw-email" placeholder="forwarder@firma.com"></div>'
    + '</div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-forwarder-teklif\')?.remove()">Kapat</button>'
    + '<button class="btn btnp" onclick="window._fwMailGonder()">Mail Aç</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._fwMailGonder = function() {
  var pol = (_g('fw-pol') || {}).value || ''; var pod = (_g('fw-pod') || {}).value || '';
  var kont = (_g('fw-kont') || {}).value || ''; var adet = (_g('fw-adet') || {}).value || '1';
  var kg = (_g('fw-kg') || {}).value || ''; var m3 = (_g('fw-m3') || {}).value || '';
  var urun = (_g('fw-urun') || {}).value || ''; var bl = (_g('fw-bl') || {}).value || '';
  var odeme = (_g('fw-odeme') || {}).value || ''; var tarih = (_g('fw-tarih') || {}).value || '';
  var son = (_g('fw-son-tarih') || {}).value || ''; var armator = (_g('fw-armator') || {}).value || '';
  var email = (_g('fw-email') || {}).value || '';
  var konu = 'Navlun Fiyat Talebi — ' + pol + ' / ' + pod;
  var body = 'Sayın İlgili,\n\nAşağıdaki sevkiyat için navlun fiyatı talep etmekteyiz.\n\nSEVK BİLGİLERİ\nYükleme : ' + pol + '\nVarış   : ' + pod + '\nKonteyner: ' + adet + 'x ' + kont + '\nBrüt KG : ' + kg + ' kg\nHacim   : ' + m3 + ' m³\nÜrün    : ' + urun + '\nB/L     : ' + bl + '\nNavlun  : ' + odeme + '\nYükleme : ' + tarih + (armator ? '\nTercih  : ' + armator : '') + '\nSon Teklif: ' + son + '\n\nSaygılarımızla,\nDuay Uluslararası Ticaret';
  window.open('mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(konu) + '&body=' + encodeURIComponent(body));
  window.toast?.('Mail uygulaması açıldı', 'ok'); _g('mo-forwarder-teklif')?.remove();
};

/* ── İÇ NAKLİYE TEKLİF FORMU ─────────────────────────── */
window._ihrIcNakliyeTeklif = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var toplamBrut = urunler.reduce(function(s, u) { return s + (parseFloat(u.brut_kg) || 0); }, 0);
  var toplamM3 = urunler.reduce(function(s, u) { return s + (parseFloat(u.hacim_m3) || 0); }, 0);
  var toplamKoli = urunler.reduce(function(s, u) { return s + (parseInt(u.koli_adet) || 0); }, 0);
  /* Tedarikçi bazlı duraklar */
  var tedMap = {};
  urunler.forEach(function(u) { var k = u.tedarikciAd || 'Bilinmeyen'; if (!tedMap[k]) tedMap[k] = { ad: k, koli: 0, kg: 0 }; tedMap[k].koli += parseInt(u.koli_adet) || 0; tedMap[k].kg += parseFloat(u.brut_kg) || 0; });
  var duraklar = Object.keys(tedMap).map(function(k) { return tedMap[k]; });
  var durakHtml = '';
  duraklar.forEach(function(t, i) {
    durakHtml += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:var(--sf)"><div style="font-size:11px;font-weight:500;margin-bottom:6px">' + (i + 1) + '. Durak — ' + _esc(t.ad) + '</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="fg"><div class="fl">Adres</div><input class="fi" id="nak-adr-' + i + '" placeholder="Fabrika adresi..."></div><div class="fg"><div class="fl">Koli</div><input class="fi" type="number" id="nak-koli-' + i + '" value="' + t.koli + '"></div><div class="fg"><div class="fl">KG</div><input class="fi" type="number" id="nak-kg-' + i + '" value="' + t.kg.toFixed(0) + '"></div></div></div>';
  });
  var old = _g('mo-ic-nakliye'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ic-nakliye';
  mo.innerHTML = '<div class="moc" style="max-width:620px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">İç Nakliye Teklif Talebi — ' + _esc(d.dosyaNo) + '</div>'
    + '<div style="padding:18px 20px">'
    + '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Yükleme Durakları (Tedarikçi Bazlı)</div>' + durakHtml + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fg" style="grid-column:1/-1"><div class="fl">Teslim Noktası (Liman/Depo)</div><input class="fi" id="nak-teslim" value="' + _esc(d.yukleme_limani || '') + '"></div>'
    + '<div class="fg"><div class="fl">Teslim Tarihi</div><input class="fi" type="date" id="nak-tarih" value="' + (d.bitis_tarihi || '') + '"></div>'
    + '<div class="fg"><div class="fl">Konteyner Tipi</div><select class="fi" id="nak-kont"><option>40 HC</option><option>40 DC</option><option>20 DC</option></select></div>'
    + '<div class="fg"><div class="fl">Toplam KG</div><input class="fi" id="nak-toplam-kg" value="' + toplamBrut.toFixed(0) + '" readonly></div>'
    + '<div class="fg"><div class="fl">Toplam m³</div><input class="fi" id="nak-toplam-m3" value="' + toplamM3.toFixed(2) + '" readonly></div>'
    + '<div class="fg"><div class="fl">Nakliyeci E-posta</div><input class="fi" id="nak-email" placeholder="nakliye@firma.com"></div>'
    + '<div class="fg"><div class="fl">Özel Talimat</div><input class="fi" id="nak-not" placeholder="Kırılır, dikkat vb..."></div>'
    + '</div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-ic-nakliye\')?.remove()">Kapat</button>'
    + '<button class="btn btnp" onclick="window._nakMailGonder(' + duraklar.length + ')">Mail Aç</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._nakMailGonder = function(durakSayisi) {
  var teslim = (_g('nak-teslim') || {}).value || ''; var tarih = (_g('nak-tarih') || {}).value || '';
  var kont = (_g('nak-kont') || {}).value || ''; var email = (_g('nak-email') || {}).value || '';
  var not = (_g('nak-not') || {}).value || '';
  var kgTop = (_g('nak-toplam-kg') || {}).value || ''; var m3Top = (_g('nak-toplam-m3') || {}).value || '';
  var durakMet = '';
  for (var i = 0; i < durakSayisi; i++) { var adr = (_g('nak-adr-' + i) || {}).value || '—'; var koli = (_g('nak-koli-' + i) || {}).value || '0'; var kg = (_g('nak-kg-' + i) || {}).value || '0'; durakMet += '\n  ' + (i + 1) + '. Durak: ' + adr + ' — ' + koli + ' koli / ' + kg + ' kg'; }
  var konu = 'İç Nakliye Teklif Talebi — ' + teslim;
  var body = 'Sayın İlgili,\n\nAşağıdaki sevkiyat için iç nakliye teklifi talep etmekteyiz.\n\nYÜKLEME DURAKLARI:' + durakMet + '\n\nTESLİM BİLGİLERİ\nTeslim Yeri  : ' + teslim + '\nTeslim Tarihi: ' + tarih + '\nKonteyner    : ' + kont + '\nToplam KG    : ' + kgTop + ' kg\nToplam m³    : ' + m3Top + (not ? '\nÖzel Talimat : ' + not : '') + '\n\nSaygılarımızla,\nDuay Uluslararası Ticaret';
  window.open('mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(konu) + '&body=' + encodeURIComponent(body));
  window.toast?.('Mail uygulaması açıldı', 'ok'); _g('mo-ic-nakliye')?.remove();
};

window._ihrFiltrele = function(kolon, deger) {
  if (!window._ihrUrunFiltreler) window._ihrUrunFiltreler = {};
  window._ihrUrunFiltreler[kolon] = deger;
  window._ihrUrunSayfa = 1;
  if (_aktifDosyaId) {
    var _d2 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
    if (_d2) _ihrDetayRenderOzet(_d2);
  } else { _ihrRenderContent(); }
};
window._ihrFiltreTemizle = function() {
  window._ihrUrunFiltreler = {};
  window._ihrUrunAramaQ = '';
  window._ihrUrunSayfa = 1;
  if (_aktifDosyaId) {
    var _d3 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
    if (_d3) _ihrDetayRenderOzet(_d3);
  } else { _ihrRenderContent(); }
};

/* ── INLINE EDIT ─────────────────────────────────────────── */
window._ihrInlineEdit = function(td, urunId, alan) {
  if (td.querySelector('input') || td.querySelector('select')) return;
  var eskiDeger = td.textContent.trim().replace('—', '');
  var allTds = document.querySelectorAll('#ihr-urun-tbody td[data-alan]');
  var allArr = []; allTds.forEach(function(t) { allArr.push(t); });
  var idx = allArr.indexOf(td);

  var SELECT_ALANLAR = {
    doviz: ['USD', 'EUR', 'TRY', 'GBP'],
    birim: ['PCS', 'KGS', 'MTR', 'SET', 'TON', 'M2', 'M3', 'LTR'],
    etiket_rengi: ['Mavi', 'Pembe', 'Sarı', 'Yeşil', 'Mor', 'Turuncu'],
    once_yukle: ['Önce Yükle', 'Sonra Yükle', 'Yer Olursa Yükle'],
    dilli_urun: ['H', 'E'],
    imo_urun: ['H', 'E'],
    fatura_turu: ['', 'İhraç Kayıtlı KDV\'li', 'İhraç Kayıtlı KDV\'siz', 'Özel Matrah', 'Tevkifatlı', 'KDV Muaf'],
    mense_ulke: ['Türkiye', 'Çin', 'Hindistan', 'İtalya', 'Diğer']
  };
  var SAYISALLAR = ['miktar', 'birim_fiyat', 'konteyner_sira', 'kdv_orani', 'brut_kg', 'net_kg', 'hacim_m3', 'koli_adet'];

  var inp;
  if (SELECT_ALANLAR[alan]) {
    inp = document.createElement('select');
    inp.style.cssText = 'width:100%;font-size:10px;border:1px solid #185FA5;border-radius:3px;background:var(--sf);color:var(--t);padding:1px 2px';
    SELECT_ALANLAR[alan].forEach(function(v) { var o = document.createElement('option'); o.value = v; o.textContent = v; if (v === eskiDeger) o.selected = true; inp.appendChild(o); });
  } else {
    inp = document.createElement('input');
    inp.type = SAYISALLAR.indexOf(alan) !== -1 ? 'number' : 'text';
    if (['birim_fiyat', 'brut_kg', 'net_kg', 'hacim_m3'].indexOf(alan) !== -1) inp.step = '0.01';
    inp.value = eskiDeger === '—' || eskiDeger === 'EKSİK' ? '' : eskiDeger;
    inp.style.cssText = 'width:100%;font-size:10px;padding:2px 4px;border:1px solid #185FA5;border-radius:3px;background:var(--sf);color:var(--t)';
  }

  var _reRenderOzet = function() {
    if (_aktifDosyaId) {
      var _dd = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
      if (_dd) { _ihrDetayRenderOzet(_dd); return; }
    }
    window.renderIhracatOps?.();
  };
  var kaydet = function() {
    var yeniDeger = inp.value.trim();
    if (yeniDeger === eskiDeger) { _reRenderOzet(); return; }
    var urunler = _loadU();
    var u = urunler.find(function(x) { return String(x.id) === String(urunId); });
    if (u) {
      u[alan] = SAYISALLAR.indexOf(alan) !== -1 ? (parseFloat(yeniDeger) || 0) : yeniDeger;
      u.updatedAt = _now();
      window.storeIhracatUrunler?.(urunler);
    }
    _reRenderOzet();
  };
  inp.addEventListener('blur', kaydet);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); kaydet(); }
    if (e.key === 'Escape') { _reRenderOzet(); }
    if (e.key === 'Tab') {
      e.preventDefault(); kaydet();
      var nextIdx = e.shiftKey ? idx - 1 : idx + 1;
      if (allArr[nextIdx]) { var next = allArr[nextIdx]; var na = next.dataset.alan; var ni = next.dataset.uid; if (na && ni) setTimeout(function() { window._ihrInlineEdit(next, ni, na); }, 50); }
    }
  });
  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus();
  if (inp.tagName === 'INPUT') inp.select();
};

/* ── SATINALMA'DAN ÇEK ──────────────────────────────────── */
window._ihrSatinalmaCek = function(dosyaId) {
  var satinalma = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var uygun = satinalma.filter(function(s) { return !s.isDeleted && s.durum !== 'iptal'; });
  if (!uygun.length) { window.toast?.('Satınalma\'da uygun kayıt bulunamadı', 'warn'); return; }
  /* Tedarikçi listesi */
  var tedSet = {}; uygun.forEach(function(s) { if (s.tedarikci) tedSet[s.tedarikci] = 1; });
  var tedOpts = ''; Object.keys(tedSet).sort().forEach(function(t) { tedOpts += '<option value="' + _esc(t) + '">' + _esc(t) + '</option>'; });

  var old = _g('mo-satinalma-cek'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-satinalma-cek';
  var satirHtml = '';
  uygun.forEach(function(s) {
    var qTxt = _esc(((s.urun || s.aciklama || '') + (s.tedarikci || '')).toLowerCase());
    satirHtml += '<tr class="sc-satir" data-tedarikci="' + _esc(s.tedarikci || '') + '" data-q="' + qTxt + '">';
    satirHtml += '<td><input type="checkbox" class="sc-chk" data-id="' + s.id + '" onchange="window._scSayimGuncelle()"></td>';
    satirHtml += '<td style="font-weight:500">' + _esc(s.tedarikci || '—') + '</td>';
    satirHtml += '<td style="font-family:monospace;font-size:10px">' + _esc(s.urunKodu || s.urun_kodu || '—') + '</td>';
    satirHtml += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(s.urun || s.aciklama || '') + '">' + _esc((s.urun || s.aciklama || '—').slice(0, 40)) + '</td>';
    satirHtml += '<td style="text-align:right">' + (s.miktar || 0) + ' ' + _esc(s.birim || 'PCS') + '</td>';
    satirHtml += '<td style="text-align:right;font-family:monospace">' + (s.birimFiyat || s.birim_fiyat || 0) + '</td>';
    satirHtml += '<td>' + _esc(s.doviz || 'USD') + '</td>';
    satirHtml += '<td style="font-family:monospace;font-size:10px">' + _esc((s.tarih || s.createdAt || '').slice(0, 10)) + '</td>';
    satirHtml += '<td style="font-size:10px">' + _esc(s.faturaNo || s.fatura_no || '—') + '</td>';
    satirHtml += '<td><span style="font-size:9px;padding:1px 6px;border-radius:3px;background:var(--s2);color:var(--t2)">' + _esc(s.durum || '—') + '</span></td></tr>';
  });
  mo.innerHTML = '<div class="moc" style="max-width:900px;width:95vw;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Satınalma\'dan Ürün Çek</div>'
    + '<div style="padding:0"><input type="hidden" id="sc-dosya-id" value="' + dosyaId + '">'
    + '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + '<input class="fi" id="sc-arama" placeholder="Ürün, tedarikçi, fatura no..." oninput="window._scFiltrele()" style="flex:1;font-size:12px">'
    + '<select class="fi" id="sc-tedarikci-f" onchange="window._scFiltrele()" style="font-size:11px"><option value="">Tedarikçi: Tümü</option>' + tedOpts + '</select>'
    + '<button class="btn btns" onclick="document.querySelectorAll(\'.sc-chk\').forEach(function(c){c.checked=true});window._scSayimGuncelle()" style="font-size:11px">Hepsini Seç</button>'
    + '<span id="sc-secim-sayac" style="font-size:11px;color:var(--t2)">0 seçildi</span></div>'
    + '<div style="overflow:auto;max-height:450px"><table class="tbl" style="font-size:11px" id="sc-tablo"><thead><tr style="background:var(--s2);position:sticky;top:0">'
    + '<th style="width:28px"><input type="checkbox" onchange="document.querySelectorAll(\'.sc-chk\').forEach(function(c){c.checked=this.checked}.bind(this));window._scSayimGuncelle()"></th>'
    + '<th>Tedarikçi</th><th>Ürün Kodu</th><th>Ürün Adı</th><th>Miktar</th><th>Birim Fiyat</th><th>Kur</th><th>Tarih</th><th>Fatura No</th><th>Durum</th>'
    + '</tr></thead><tbody id="sc-tbody">' + satirHtml + '</tbody></table></div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-satinalma-cek\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrSatinalmaKaydet()">Seçilenleri Ekle</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._scFiltrele = function() {
  var q = ((_g('sc-arama') || {}).value || '').toLowerCase();
  var t = ((_g('sc-tedarikci-f') || {}).value || '');
  document.querySelectorAll('#sc-tbody .sc-satir').forEach(function(tr) {
    var qMatch = !q || (tr.dataset.q || '').indexOf(q) !== -1;
    var tMatch = !t || tr.dataset.tedarikci === t;
    tr.style.display = (qMatch && tMatch) ? '' : 'none';
  });
};
window._scSayimGuncelle = function() {
  var n = document.querySelectorAll('.sc-chk:checked').length;
  var el = _g('sc-secim-sayac'); if (el) el.textContent = n + ' seçildi';
};

window._ihrSatinalmaKaydet = function() {
  var dosyaId = (_g('sc-dosya-id') || {}).value;
  var seciliIds = [];
  document.querySelectorAll('.sc-chk:checked').forEach(function(c) { seciliIds.push(c.dataset.id); });
  if (!seciliIds.length) { window.toast?.('Kayıt seçiniz', 'err'); return; }
  var satinalma = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var cariList = typeof window.loadCari === 'function' ? window.loadCari() : [];
  var urunler = _loadU();
  seciliIds.forEach(function(sid) {
    var s = satinalma.find(function(x) { return String(x.id) === String(sid); }); if (!s) return;
    var tedarikci = null; cariList.forEach(function(c) { if (c.name === s.tedarikci) tedarikci = c; });
    urunler.unshift({ id: _genId(), dosya_id: dosyaId, tedarikci_id: tedarikci ? tedarikci.id : '', tedarikciAd: s.tedarikci || '', urun_kodu: s.urunKodu || s.urun_kodu || '', aciklama: s.urun || s.aciklama || '', miktar: parseFloat(s.miktar || 0), birim: s.birim || 'PCS', birim_fiyat: parseFloat(s.birimFiyat || s.birim_fiyat || 0), doviz: s.doviz || 'USD', kaynak: 'satinalma_' + sid, createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() });
  });
  window.storeIhracatUrunler?.(urunler);
  _g('mo-satinalma-cek')?.remove();
  window.toast?.(seciliIds.length + ' ürün eklendi', 'ok');
  window.renderIhracatOps?.();
};

/* ── ÜRÜN EXCEL EXPORT + GRUPLAMA ─────────────────────────── */
window._ihrUrunExcel = function(dosyaId) {
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  var basliklar = ['Tedarikci', 'Proforma ID', 'PI Link', 'Satis Siparis ID', 'Alis Fatura No', 'Alis Fatura Tarihi', 'Fatura Turu', 'Urun Kodu', 'Satici Urun Kodu', 'Benzer Kod', 'Satici Orijinal Adi', 'Urun Aciklamasi', 'Standart Ad', 'Teknik Aciklama', 'Faturada Gecen', 'Gumrukcu Tanim', 'Mense', 'GTIP/HS', 'Miktar', 'Birim', 'Birim Fiyat', 'Kur', 'KDV%', 'KDV Tutari', 'KDV Dahil', 'Teslim Tarihi', 'Teslim Yeri', 'Etiket', 'Yukle', 'Koli', 'Brut KG', 'Net KG', 'Hacim m3', 'Sira', 'Dilli', 'IMO', 'Kategori', 'Marka', 'Renk', 'Duay Not', 'Siparis ID'];
  var satirlar = urunler.sort(function(a, b) { return (a.konteyner_sira || 99) - (b.konteyner_sira || 99); }).map(function(u) {
    var toplamKdvHaric = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0);
    var kdvTutar = toplamKdvHaric * ((parseFloat(u.kdv_orani) || 0) / 100);
    return [
      u.tedarikciAd || u.tedarikci || '', u.proforma_id || '', u.pi_link || '', u.satis_siparis_id || '', u.alis_fatura_no || '', u.alis_fatura_tarihi || '', u.fatura_turu || '',
      u.urun_kodu || '', u.satici_urun_kodu || '', u.benzer_urun_kodu || '', u.satici_urun_adi || '', u.aciklama || '', u.standart_urun_adi || '', u.teknik_aciklama || '', u.fatura_urun_adi || '', u.gumrukcu_tanim || '', u.mense_ulke || '', u.hs_kodu || '',
      u.miktar || 0, u.birim || 'PCS', u.birim_fiyat || 0, u.doviz || 'USD',
      u.kdv_orani || 0, kdvTutar.toFixed(2), (toplamKdvHaric + kdvTutar).toFixed(2),
      u.teslim_tarihi || '', u.teslim_yeri || '', u.etiket_rengi || '', u.once_yukle || '',
      u.koli_adet || 0, u.brut_kg || 0, u.net_kg || 0, u.hacim_m3 || 0, u.konteyner_sira || '',
      u.dilli_urun || 'H', u.imo_urun || 'H', u.kategori || '', u.marka || '', u.renk || '', u.duay_not || '', u.siparis_id || ''
    ].join('\t');
  });
  var icerik = (d ? d.dosyaNo : 'Ihracat') + ' — Ürün Listesi\n\n' + basliklar.join('\t') + '\n' + satirlar.join('\n');
  var blob = new Blob(['\ufeff' + icerik], { type: 'text/tab-separated-values;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = (d ? d.dosyaNo : 'ihracat') + '_urunler.xls'; a.click();
  URL.revokeObjectURL(url);
  window.toast?.('Excel indirildi', 'ok');
};

window._ihrUrunTedarikciGrupla = function() {
  var tbody = document.getElementById('ihr-urun-tbody'); if (!tbody) return;
  /* Mevcut grup satirlarini temizle */
  tbody.querySelectorAll('.ihr-grup-satir').forEach(function(r) { r.remove(); });
  var satirlar = tbody.querySelectorAll('tr');
  var mevcut = null;
  satirlar.forEach(function(tr) {
    var tedarikci = (tr.querySelector('td:nth-child(2)') || {}).textContent || '';
    tedarikci = tedarikci.trim();
    if (tedarikci !== mevcut) {
      mevcut = tedarikci;
      var ara = document.createElement('tr');
      ara.className = 'ihr-grup-satir';
      ara.innerHTML = '<td colspan="22" style="background:var(--s2);font-size:10px;font-weight:500;color:var(--t2);padding:4px 10px;text-transform:uppercase;letter-spacing:.06em">' + (tedarikci || 'Tedarikçi Belirtilmemiş') + '</td>';
      tr.parentNode.insertBefore(ara, tr);
    }
  });
  window.toast?.('Tedarikçi bazlı gruplandı', 'ok');
};

/* ── EVRAKLAR DETAY PANEL ─────────────────────────────────── */
window._ihrDetayRenderEvraklar = function(d, c) {
  if (!c) c = _g('ihr-detay-content'); if (!c) return;
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id); });
  var EVRAK_LIST = [
    { tur: 'PI',    l: 'Proforma Invoice',        uretici: 'Duay',      aciklama: 'Satış teklifi / ön fatura',         duay: true },
    { tur: 'CI',    l: 'Commercial Invoice',       uretici: 'Duay',      aciklama: 'Ticari fatura — CI tam + sansürlü', duay: true },
    { tur: 'PL',    l: 'Packing List',             uretici: 'Duay',      aciklama: 'Ambalaj ve yükleme listesi',        duay: true },
    { tur: 'SEVK',  l: 'Konteyner Sevk Emri',      uretici: 'Duay',      aciklama: 'Shipping instruction → Forwarder',  duay: true },
    { tur: 'YUK',   l: 'Yükleme Talimatı',         uretici: 'Duay',      aciklama: 'Tedarikçi + Forwarder yükleme',     duay: true },
    { tur: 'GCB',   l: 'Gümrük Çıkış Beyannamesi', uretici: 'Gümrükçü',  aciklama: 'GÇB → Duay → Forwarder',           duay: false },
    { tur: 'BL',    l: 'Bill of Lading',            uretici: 'Forwarder', aciklama: 'Konşimento → Duay → Müşteri',       duay: false },
    { tur: 'MENSEI',l: 'Menşei Şahadetnamesi',      uretici: 'Gümrükçü',  aciklama: 'Müşteri için menşei belgesi',       duay: false },
    { tur: 'EUR1',  l: 'EUR.1 / A.TR',              uretici: 'Gümrükçü',  aciklama: 'Kara nakliyeli sevkiyatlarda',      duay: false },
    { tur: 'INSP',  l: 'Inspection Raporu',          uretici: 'Gözetim',   aciklama: 'Gözetim şirketi → Duay → Müşteri', duay: false },
    { tur: 'SIG',   l: 'Sigorta Poliçesi',           uretici: 'Sigorta',   aciklama: 'Teslim şekline göre belirlenir',   duay: false }
  ];
  var tamam = evraklar.filter(function(e) { return e.durum === 'gonderildi'; }).length;
  var h = '';
  /* Özet bar */
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
  h += '<div><div style="font-size:13px;font-weight:500">Evrak Durumu</div><div style="font-size:11px;color:var(--t2);margin-top:2px">' + tamam + ' / ' + EVRAK_LIST.length + ' tamamlandı</div></div>';
  h += '<div style="width:160px;height:6px;background:var(--b);border-radius:3px;overflow:hidden"><div style="width:' + Math.round((tamam / EVRAK_LIST.length) * 100) + '%;height:100%;background:#185FA5;border-radius:3px"></div></div>';
  h += '</div>';
  /* Evrak kartları */
  EVRAK_LIST.forEach(function(ev) {
    var kayit = null; evraklar.forEach(function(e) { if (e.tur === ev.tur) kayit = e; });
    var durum = kayit ? (EVRAK_DURUM[kayit.durum] || EVRAK_DURUM.taslak) : { l: 'Henüz Yok', c: '#9CA3AF', bg: 'rgba(156,163,175,.1)' };
    var zamanTxt = kayit ? (kayit.gonderim_tarihi || kayit.updatedAt || '').slice(0, 16).replace('T', ' ') : '';
    h += '<div style="border:0.5px solid var(--b);border-radius:10px;margin-bottom:8px;overflow:hidden">';
    h += '<div style="display:flex;align-items:center;padding:10px 14px;background:var(--s2);gap:10px">';
    h += '<div style="flex:1"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;font-weight:500;color:var(--t)">' + _esc(ev.l) + '</span>' + _badge(durum.l, durum.c, durum.bg);
    if (zamanTxt) h += '<span style="font-size:10px;color:var(--t3)">' + _esc(zamanTxt) + '</span>';
    h += '</div><div style="font-size:10px;color:var(--t3);margin-top:2px">' + _esc(ev.uretici) + ' — ' + _esc(ev.aciklama) + '</div></div>';
    /* Butonlar */
    h += '<div style="display:flex;gap:5px">';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrPdfOnizle(\'' + d.id + '\',\'' + ev.tur + '\',null)" style="font-size:10px;padding:3px 10px">Görüntüle</button>';
    if (kayit && kayit.dosya_url) h += '<a href="' + _esc(kayit.dosya_url) + '" target="_blank" class="btn btns" style="font-size:10px;padding:3px 10px;text-decoration:none">İndir</a>';
    if (ev.duay) {
      if (!kayit) h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrEvrakOlustur(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:3px 10px">Oluştur</button>';
      else if (kayit.durum === 'taslak') h += '<button class="btn" onclick="event.stopPropagation();window._ihrEvrakOnayla(\'' + kayit.id + '\')" style="font-size:10px;padding:3px 10px;background:#EAF3DE;color:#27500A;border-color:#97C459">Onayla</button>';
      else if (kayit.durum === 'onaylandi') h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrEvrakGonderModal(\'' + kayit.id + '\',\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:3px 10px">Gönder</button>';
      else if (kayit.durum === 'gonderildi') h += '<span style="font-size:10px;color:#16A34A;padding:3px 6px">\u2713 Gönderildi</span>';
    } else {
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrEvrakDosyaYukle(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:3px 10px">Yükle</button>';
    }
    if (kayit) h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrEvrakDuzenle(\'' + kayit.id + '\')" style="font-size:10px;padding:3px 10px">\u270f\ufe0f</button>';
    h += '</div></div>';
    if (kayit && kayit.not) h += '<div style="padding:6px 14px;font-size:11px;color:var(--t2);border-top:0.5px solid var(--b)">' + _esc(kayit.not) + '</div>';
    h += '</div>';
  });
  c.innerHTML = h;
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
window._ihrPdfOnizle = function(dosyaId, tur, urunler) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) { window.toast?.('Dosya bulunamadı', 'err'); return; }
  var evraklar = _loadE();
  var kayit = null; evraklar.forEach(function(e) { if (String(e.dosya_id) === String(dosyaId) && e.tur === tur) kayit = e; });
  /* Dış evrak ise ve URL varsa yeni sekmede aç */
  if (kayit && kayit.dosya_url) { window.open(kayit.dosya_url, '_blank'); return; }
  /* Kayıt yoksa önce oluştur uyarısı */
  if (!kayit) { window.toast?.('Önce "Oluştur" butonuna basın', 'warn'); return; }
  if (!urunler) urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  if (!urunler.length) { window.toast?.('Ürün eklenmemiş — önce Ürünler sekmesinden ürün ekleyin', 'warn'); return; }
  window.toast?.(_esc(tur) + ' önizleme — PDF render yakında', 'warn');
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
  var d = _loadD().find(function(x) { return String(x.id) === String(id); }); if (!d) return;
  var users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  _moAc('mo-ihr-edit', '✏️ Dosya Düzenle — ' + _esc(d.dosyaNo),
    '<input type="hidden" id="ihr-edit-id" value="' + id + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div style="grid-column:1/-1"><div class="fl">Dosya Adı / Referans No</div><input class="fi" id="ihr-edit-dosya-adi" value="' + _esc(d.dosyaNo || '') + '"></div>'
    + '<div><div class="fl">Teslim Şekli</div><select class="fi" id="ihr-edit-incoterms">' + INCOTERMS.map(function(i) { return '<option value="' + i + '"' + (d.teslim_sekli === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Varış Limanı</div><input class="fi" id="ihr-edit-varis" value="' + _esc(d.varis_limani || '') + '"></div>'
    + '<div><div class="fl">Bitiş Tarihi</div><input class="fi" type="date" id="ihr-edit-bitis" value="' + _esc(d.bitis_tarihi || '') + '"></div>'
    + '<div><div class="fl">BL Türü</div><select class="fi" id="ihr-edit-bl"><option value="seaway"' + (d.bl_turu === 'seaway' ? ' selected' : '') + '>SeaWay</option><option value="hardcopy"' + (d.bl_turu === 'hardcopy' ? ' selected' : '') + '>Hard Copy</option><option value="telex"' + (d.bl_turu === 'telex' ? ' selected' : '') + '>Telex</option></select></div>'
    + '</div><div style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ihr-edit-not" rows="2" style="resize:vertical">' + _esc(d.not || '') + '</textarea></div>',
    '<button class="btn btns" onclick="document.getElementById(\'mo-ihr-edit\')?.remove()">İptal</button><button class="btn btnp" onclick="window._ihrDosyaKaydet()">Kaydet</button>');
};
window._ihrDosyaKaydet = function() {
  var id = _g('ihr-edit-id')?.value; if (!id) return; var dosyalar = _loadD(); var d = dosyalar.find(function(x) { return String(x.id) === String(id); }); if (!d) return;
  var yeniDosyaAdi = (_g('ihr-edit-dosya-adi')?.value || '').trim(); if (yeniDosyaAdi) d.dosyaNo = yeniDosyaAdi;
  d.teslim_sekli = _g('ihr-edit-incoterms')?.value || d.teslim_sekli; d.varis_limani = (_g('ihr-edit-varis')?.value || '').trim() || d.varis_limani; d.bitis_tarihi = _g('ihr-edit-bitis')?.value || d.bitis_tarihi; d.bl_turu = _g('ihr-edit-bl')?.value || d.bl_turu; d.not = (_g('ihr-edit-not')?.value || '').trim(); d.updatedAt = _now();
  _storeD(dosyalar); _g('mo-ihr-edit')?.remove(); window.toast?.('Dosya güncellendi', 'ok'); window.renderIhracatOps?.();
};

// ── DURUM DEĞİŞTİR ──────────────────────────────────────
window._ihrDurumDegistir = function(id) {
  var d = _loadD().find(function(x) { return String(x.id) === String(id); }); if (!d) return;
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
  var cariList = typeof window.loadCari === 'function' ? window.loadCari().filter(function(c) { return !c.isDeleted; }) : [];
  var cariOpts = '<option value="">— Seçin —</option>';
  cariList.forEach(function(c) { cariOpts += '<option value="' + c.id + '">' + _esc(c.name) + '</option>'; });
  var old = _g('mo-ihr-urun'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ihr-urun';
  mo.innerHTML = '<div class="moc" style="max-width:860px;width:96vw;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">Ürün Ekle</div><button onclick="document.getElementById(\'mo-ihr-urun\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:0"><input type="hidden" id="ihr-urun-dosya" value="' + dosyaId + '">'
    + '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0">'
    /* SOL: Temel */
    + '<div style="padding:16px 18px;border-right:0.5px solid var(--b)">'
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Temel Bilgiler</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
    + '<div class="fg"><div class="fl">Tedarikçi *</div><select class="fi" id="ihr-urun-tedarikci">' + cariOpts + '</select></div>'
    + '<div class="fg"><div class="fl">Ürün Açıklaması (CI/PL/BL) *</div><input class="fi" id="ihr-urun-aciklama" placeholder="TUMBLER 6 PCS GIFT PACK"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Ürün Kodu</div><input class="fi" id="ihr-urun-kod" placeholder="LV-XES234"></div>'
    + '<div class="fg"><div class="fl">Satıcı Ürün Kodu</div><input class="fi" id="ihr-urun-satici-kod"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Miktar *</div><input class="fi" type="number" id="ihr-urun-miktar" placeholder="0"></div>'
    + '<div class="fg"><div class="fl">Birim</div><select class="fi" id="ihr-urun-birim">' + BIRIM.map(function(b) { return '<option>' + b + '</option>'; }).join('') + '</select></div>'
    + '<div class="fg"><div class="fl">HS Kodu (GTIP)</div><input class="fi" id="ihr-urun-hs" placeholder="7013.49"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Birim Fiyat</div><input class="fi" type="number" id="ihr-urun-fiyat" placeholder="0.00" step="0.01"></div>'
    + '<div class="fg"><div class="fl">Döviz</div><select class="fi" id="ihr-urun-doviz">' + DOVIZ.map(function(d) { return '<option>' + d + '</option>'; }).join('') + '</select></div>'
    + '<div class="fg"><div class="fl">KDV %</div><select class="fi" id="ihr-urun-kdv"><option value="0">%0</option><option value="10">%10</option><option value="18">%18</option><option value="20">%20</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Fatura Türü</div><select class="fi" id="ihr-urun-fatura-turu"><option value="">— Seçin —</option><option value="İhraç Kayıtlı KDV\'li">İhraç Kayıtlı KDV\'li</option><option value="İhraç Kayıtlı KDV\'siz">İhraç Kayıtlı KDV\'siz</option><option value="Özel Matrah">Özel Matrah</option><option value="Tevkifatlı">Tevkifatlı</option><option value="KDV Muaf">KDV Muaf</option></select></div>'
    + '<div class="fg"><div class="fl">Menşe Ülke</div><input class="fi" id="ihr-urun-mense" value="Türkiye"></div></div>'
    + '<div class="fg"><div class="fl">Standart Ürün Adı (CI/PL için farklı kullanılacaksa)</div><input class="fi" id="ihr-urun-standart-adi"></div>'
    + '<div class="fg"><div class="fl">Gümrükçü Yardımcı Tanım</div><input class="fi" id="ihr-urun-gumrukcu-tanim"></div>'
    + '</div></div>'
    /* SAĞ: Paketleme + Belge */
    + '<div style="padding:16px 18px">'
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Paketleme & Konteyner</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Koli Adedi</div><input class="fi" type="number" id="ihr-urun-koli"></div>'
    + '<div class="fg"><div class="fl">Konteyner Sırası</div><input class="fi" type="number" id="ihr-urun-sira" value="1"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Brüt KG</div><input class="fi" type="number" id="ihr-urun-brut" step="0.01"></div>'
    + '<div class="fg"><div class="fl">Net KG</div><input class="fi" type="number" id="ihr-urun-net" step="0.01"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Hacim (m³)</div><input class="fi" type="number" id="ihr-urun-hacim" step="0.001"></div>'
    + '<div class="fg"><div class="fl">Yükleme Önceliği</div><select class="fi" id="ihr-urun-once-yukle"><option value="Önce Yükle">Önce Yükle</option><option value="Sonra Yükle">Sonra Yükle</option><option value="Yer Olursa Yükle">Yer Olursa Yükle</option></select></div></div>'
    + '<div class="fg"><div class="fl">Etiket Rengi</div><select class="fi" id="ihr-urun-etiket"><option value="">— Seçin —</option>' + ETIKET.map(function(e) { return '<option>' + e + '</option>'; }).join('') + '</select></div>'
    + '<div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:2px">'
    + '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Belge & Referans</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="fg"><div class="fl">Proforma ID</div><input class="fi" id="ihr-urun-proforma"></div>'
    + '<div class="fg"><div class="fl">Teslim Tarihi</div><input class="fi" type="date" id="ihr-urun-teslim-tarih"></div>'
    + '<div class="fg"><div class="fl">Satış Sipariş ID</div><input class="fi" id="ihr-urun-satis-siparis"></div>'
    + '<div class="fg"><div class="fl">Alış Fatura No</div><input class="fi" id="ihr-urun-alis-fatura-no"></div>'
    + '<div class="fg"><div class="fl">Kategori</div><input class="fi" id="ihr-urun-kategori" placeholder="Cam, Tekstil..."></div>'
    + '<div class="fg"><div class="fl">Marka</div><input class="fi" id="ihr-urun-marka"></div></div>'
    + '<div style="display:flex;gap:16px;margin-top:10px;font-size:11px">'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ihr-urun-imo"> IMO\'lu</label>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ihr-urun-dilli"> Dilli Ürün</label></div></div>'
    + '<div class="fg" style="margin-top:10px"><div class="fl">Duay Özel Not</div><textarea class="fi" id="ihr-urun-duay-not" rows="2" style="resize:vertical"></textarea></div>'
    + '</div></div></div></div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-ihr-urun\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._ihrUrunKaydet()">Ürün Ekle</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._ihrUrunKaydet = function() {
  var aciklama = (_g('ihr-urun-aciklama')?.value || '').trim(); var miktar = parseFloat(_g('ihr-urun-miktar')?.value || 0);
  if (!aciklama) { window.toast?.('Açıklama zorunludur', 'err'); return; }
  if (!miktar) { window.toast?.('Miktar zorunludur', 'err'); return; }
  var dosyaId = _g('ihr-urun-dosya')?.value;
  var cariList = typeof window.loadCari === 'function' ? window.loadCari() : [];
  var tedarikciId = _g('ihr-urun-tedarikci')?.value || '';
  var tedarikci = null; cariList.forEach(function(c) { if (String(c.id) === String(tedarikciId)) tedarikci = c; });
  var urunler = _loadU(); urunler.unshift({
    id: _genId(), dosya_id: dosyaId,
    tedarikci_id: tedarikciId, tedarikciAd: tedarikci ? tedarikci.name : '',
    urun_kodu: (_g('ihr-urun-kod')?.value || '').trim(),
    satici_urun_kodu: (_g('ihr-urun-satici-kod')?.value || '').trim(),
    aciklama: aciklama,
    standart_urun_adi: (_g('ihr-urun-standart-adi')?.value || '').trim(),
    gumrukcu_tanim: (_g('ihr-urun-gumrukcu-tanim')?.value || '').trim(),
    hs_kodu: (_g('ihr-urun-hs')?.value || '').trim(),
    mense_ulke: _g('ihr-urun-mense')?.value || 'Türkiye',
    miktar: miktar, birim: _g('ihr-urun-birim')?.value || 'PCS',
    birim_fiyat: parseFloat(_g('ihr-urun-fiyat')?.value || 0), doviz: _g('ihr-urun-doviz')?.value || 'USD',
    kdv_orani: parseFloat(_g('ihr-urun-kdv')?.value || 0),
    fatura_turu: _g('ihr-urun-fatura-turu')?.value || '',
    koli_adet: parseInt(_g('ihr-urun-koli')?.value || 0),
    brut_kg: parseFloat(_g('ihr-urun-brut')?.value || 0),
    net_kg: parseFloat(_g('ihr-urun-net')?.value || 0),
    hacim_m3: parseFloat(_g('ihr-urun-hacim')?.value || 0),
    konteyner_sira: parseInt(_g('ihr-urun-sira')?.value || 1),
    once_yukle: _g('ihr-urun-once-yukle')?.value || 'Önce Yükle',
    etiket_rengi: _g('ihr-urun-etiket')?.value || '',
    proforma_id: (_g('ihr-urun-proforma')?.value || '').trim(),
    satis_siparis_id: (_g('ihr-urun-satis-siparis')?.value || '').trim(),
    alis_fatura_no: (_g('ihr-urun-alis-fatura-no')?.value || '').trim(),
    teslim_tarihi: _g('ihr-urun-teslim-tarih')?.value || '',
    kategori: (_g('ihr-urun-kategori')?.value || '').trim(),
    marka: (_g('ihr-urun-marka')?.value || '').trim(),
    imo_urun: _g('ihr-urun-imo')?.checked ? 'E' : 'H',
    dilli_urun: _g('ihr-urun-dilli')?.checked ? 'E' : 'H',
    duay_not: (_g('ihr-urun-duay-not')?.value || '').trim(),
    createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now()
  });
  _storeU(urunler); _g('mo-ihr-urun')?.remove(); window.toast?.('Ürün eklendi', 'ok');
  window.logActivity?.('ihracat', 'Ürün eklendi: ' + aciklama);
  window.renderIhracatOps?.();
};
/* Toplu Düzenle + Konteyner Görünüm + Doğrula */
window._ihrTopluDuzenle = function(dosyaId) {
  var seciliIdler = []; document.querySelectorAll('.ihr-urun-chk:checked').forEach(function(c) { seciliIdler.push(c.dataset.id); });
  if (!seciliIdler.length) { window.toast?.('Ürün seçiniz', 'warn'); return; }
  var seciliUrunler = _loadU().filter(function(u) { return seciliIdler.indexOf(String(u.id)) !== -1; });
  var old = _g('mo-toplu-edit'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-toplu-edit';
  var urunListeHtml = ''; seciliUrunler.forEach(function(u) { urunListeHtml += '\u2022 ' + _esc(u.aciklama || u.urun_kodu || 'Ürün') + '<br>'; });
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">' + seciliIdler.length + ' Ürün Seçildi — Toplu Düzenle</div>'
    + '<div style="padding:18px 20px">'
    + '<div style="background:#E6F1FB;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:11px;color:#0C447C">Doldurulan alanlar <strong>' + seciliIdler.length + ' ürüne</strong> uygulanır. Boş bırakılanlar değiştirilmez.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div class="fg"><div class="fl">Etiket Rengi</div><select class="fi" id="te-etiket"><option value="">— Değiştirme —</option><option>Mavi</option><option>Pembe</option><option>Sarı</option><option>Yeşil</option><option>Mor</option><option>Turuncu</option></select></div>'
    + '<div class="fg"><div class="fl">Yükleme Sırası</div><select class="fi" id="te-yukle"><option value="">— Değiştirme —</option><option>Önce Yükle</option><option>Sonra Yükle</option><option>Yer Olursa Yükle</option></select></div>'
    + '<div class="fg"><div class="fl">Teslim Tarihi</div><input class="fi" type="date" id="te-teslim-tarih"></div>'
    + '<div class="fg"><div class="fl">Teslim Yeri</div><input class="fi" id="te-teslim-yer" placeholder="Fabrika / İstanbul"></div>'
    + '<div class="fg"><div class="fl">Fatura Türü</div><select class="fi" id="te-fatura"><option value="">— Değiştirme —</option><option>İhraç Kayıtlı KDV\'li</option><option>İhraç Kayıtlı KDV\'siz</option><option>Özel Matrah</option><option>KDV Muaf</option></select></div>'
    + '<div class="fg"><div class="fl">Menşe Ülke</div><input class="fi" id="te-mense" placeholder="Türkiye"></div>'
    + '<div class="fg"><div class="fl">Konteyner Sırası (başlangıç)</div><input class="fi" type="number" id="te-sira-bas" placeholder="1"><div style="font-size:10px;color:var(--t3);margin-top:3px">Her ürün için 1 artar</div></div>'
    + '<div class="fg"><div class="fl">KDV Oranı</div><select class="fi" id="te-kdv"><option value="">— Değiştirme —</option><option value="0">%0</option><option value="10">%10</option><option value="18">%18</option><option value="20">%20</option></select></div>'
    + '<div class="fg"><div class="fl">Alış Fatura No</div><input class="fi" id="te-alis-fatura" placeholder="FAT-2026-XXXX"></div>'
    + '<div class="fg"><div class="fl">Proforma ID</div><input class="fi" id="te-proforma" placeholder="PI-2026-XXXX"></div>'
    + '<div class="fg" style="grid-column:1/-1"><div class="fl">Duay Not</div><textarea class="fi" id="te-not" rows="2" style="resize:vertical"></textarea></div>'
    + '</div>'
    + '<div style="margin-top:12px;padding:10px 12px;background:var(--s2);border-radius:8px"><div style="font-size:10px;font-weight:500;color:var(--t2);margin-bottom:6px">Seçili Ürünler:</div><div style="font-size:11px;color:var(--t);max-height:80px;overflow-y:auto">' + urunListeHtml + '</div></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-toplu-edit\')?.remove()">İptal</button>'
    + '<button class="btn btns btnd" onclick="window._ihrUrunTopluSil(\'' + dosyaId + '\')">Seçilenleri Sil</button>'
    + '<button class="btn btnp" onclick="window._ihrTopluDuzenleKaydet(' + JSON.stringify(seciliIdler) + ')">Uygula</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._ihrTopluDuzenleKaydet = function(idler) {
  var urunler = _loadU();
  var etiket = (_g('te-etiket') || {}).value; var yukle = (_g('te-yukle') || {}).value;
  var teslimTarih = (_g('te-teslim-tarih') || {}).value; var teslimYer = ((_g('te-teslim-yer') || {}).value || '').trim();
  var fatura = (_g('te-fatura') || {}).value; var mense = ((_g('te-mense') || {}).value || '').trim();
  var siraBase = parseInt((_g('te-sira-bas') || {}).value || 0); var kdv = (_g('te-kdv') || {}).value;
  var alisFatura = ((_g('te-alis-fatura') || {}).value || '').trim(); var proforma = ((_g('te-proforma') || {}).value || '').trim();
  var not = ((_g('te-not') || {}).value || '').trim();
  var siraIdx = siraBase;
  idler.forEach(function(id) {
    var u = urunler.find(function(x) { return String(x.id) === String(id); }); if (!u) return;
    if (etiket) u.etiket_rengi = etiket; if (yukle) u.once_yukle = yukle;
    if (teslimTarih) u.teslim_tarihi = teslimTarih; if (teslimYer) u.teslim_yeri = teslimYer;
    if (fatura) u.fatura_turu = fatura; if (mense) u.mense_ulke = mense;
    if (siraBase) { u.konteyner_sira = siraIdx; siraIdx++; }
    if (kdv) u.kdv_orani = parseFloat(kdv); if (alisFatura) u.alis_fatura_no = alisFatura;
    if (proforma) u.proforma_id = proforma; if (not) u.duay_not = not;
    u.updatedAt = _now();
  });
  _storeU(urunler); _g('mo-toplu-edit')?.remove(); window.toast?.(idler.length + ' ürün güncellendi', 'ok'); window.renderIhracatOps?.();
};

window._ihrKonteynerGorunum = function(dosyaId) {
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; }).sort(function(a, b) { return (a.konteyner_sira || 99) - (b.konteyner_sira || 99); });
  var toplamBrut = 0; urunler.forEach(function(u) { toplamBrut += parseFloat(u.brut_kg) || 0; });
  var RENK_MAP = { Mavi: '#185FA5', Pembe: '#D4537E', 'Sarı': '#BA7517', 'Yeşil': '#16A34A', Mor: '#7C3AED', Turuncu: '#D85A30' };
  var MAX_KG = 26000;
  var icerik = '<div style="font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><span>Toplam: <strong>' + toplamBrut.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' kg</strong></span><span style="color:' + (toplamBrut > MAX_KG ? '#DC2626' : '#16A34A') + '">' + (toplamBrut > MAX_KG ? 'Kapasite aşılıyor' : 'Kapasite uygun') + ' (Max ~26t)</span></div>';
  icerik += '<div style="border:2px solid var(--t2);border-radius:8px;padding:12px;min-height:200px;background:var(--s2)"><div style="font-size:10px;color:var(--t3);margin-bottom:8px">40HC Konteyner</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
  urunler.forEach(function(u) { var renk = RENK_MAP[u.etiket_rengi] || '#888780'; var koli = parseInt(u.koli_adet) || 1; var genislik = Math.max(60, Math.min(200, koli * 8)); icerik += '<div style="background:' + renk + ';border-radius:4px;padding:4px 6px;color:#fff;font-size:9px;min-width:' + genislik + 'px;text-align:center"><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc((u.aciklama || u.urun_kodu || '').slice(0, 18)) + '</div><div style="opacity:.85">' + koli + ' koli · ' + (parseFloat(u.brut_kg) || 0).toFixed(0) + ' kg</div></div>'; });
  icerik += '</div></div>';
  var pct = Math.min(100, Math.round((toplamBrut / MAX_KG) * 100));
  icerik += '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>Doluluk</span><span style="font-weight:500">' + pct + '%</span></div><div style="height:8px;background:var(--b);border-radius:4px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + (pct > 95 ? '#DC2626' : pct > 80 ? '#D97706' : '#16A34A') + ';border-radius:4px"></div></div></div>';
  var old = _g('mo-konteyner'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-konteyner';
  mo.innerHTML = '<div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Konteyner Yerleşim Görünümü</div><div style="padding:18px 20px">' + icerik + '</div><div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-konteyner\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrDogrula = function(dosyaId) {
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var hatalar = [], uyarilar = [];
  urunler.forEach(function(u, i) { var sira = (i + 1) + '. ' + (u.aciklama || u.urun_kodu || 'Ürün'); if (!u.aciklama) hatalar.push(sira + ' — Ürün açıklaması eksik'); if (!u.birim_fiyat) hatalar.push(sira + ' — Birim fiyat eksik'); if (!u.hs_kodu) uyarilar.push(sira + ' — HS/GTIP kodu eksik'); if (!u.brut_kg) uyarilar.push(sira + ' — Brüt KG eksik'); if (!u.koli_adet) uyarilar.push(sira + ' — Koli adedi eksik'); if (!u.tedarikciAd) uyarilar.push(sira + ' — Tedarikçi tanımlı değil'); });
  var tamam = hatalar.length === 0 && uyarilar.length === 0;
  var old = _g('mo-dogrula'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-dogrula';
  var ic = '';
  if (tamam) ic += '<div style="background:#EAF3DE;border-radius:8px;padding:16px;text-align:center;font-size:13px;color:#27500A;font-weight:500">Tüm alanlar tamam — CI ve PL oluşturabilirsiniz</div>';
  if (hatalar.length) { ic += '<div style="font-size:11px;font-weight:500;color:#791F1F;margin-bottom:8px">' + hatalar.length + ' Hata</div>'; hatalar.forEach(function(h) { ic += '<div style="background:#FCEBEB;border-left:3px solid #DC2626;padding:6px 10px;margin-bottom:4px;font-size:11px;color:#791F1F;border-radius:0 4px 4px 0">' + _esc(h) + '</div>'; }); }
  if (uyarilar.length) { ic += '<div style="font-size:11px;font-weight:500;color:#633806;margin-top:12px;margin-bottom:8px">' + uyarilar.length + ' Uyarı</div>'; uyarilar.forEach(function(u) { ic += '<div style="background:#FAEEDA;border-left:3px solid #D97706;padding:6px 10px;margin-bottom:4px;font-size:11px;color:#633806;border-radius:0 4px 4px 0">' + _esc(u) + '</div>'; }); }
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">CI / PL Doğrulama</div><div style="padding:18px 20px">' + ic + '</div><div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-dogrula\')?.remove()">Kapat</button>' + (hatalar.length === 0 ? '<button class="btn btns" onclick="document.getElementById(\'mo-dogrula\')?.remove();window._ihrPdfOnizle(\'' + dosyaId + '\',\'CI\',null)">CI Oluştur</button><button class="btn btnp" onclick="document.getElementById(\'mo-dogrula\')?.remove();window._ihrPdfOnizle(\'' + dosyaId + '\',\'PL\',null)">PL Oluştur</button>' : '') + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
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
window._ihrEvrakOlustur = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var DUAY_EVRAKLARI = ['PI', 'CI', 'PL', 'SEVK', 'YUK'];

  if (DUAY_EVRAKLARI.indexOf(tur) !== -1) {
    var evraklar = _loadE();
    var existing = null; evraklar.forEach(function(e) { if (String(e.dosya_id) === String(dosyaId) && e.tur === tur) existing = e; });
    if (existing) { window._ihrPdfOnizle(dosyaId, tur, urunler); return; }
    var evrak = { id: _genId(), dosya_id: dosyaId, tur: tur, durum: 'taslak', hazirlayan_id: _cu()?.id, hazirlayanAd: _cu()?.name || '', son_kullanici: tur === 'SEVK' ? 'forwarder' : tur === 'YUK' ? 'tedarikci+forwarder' : 'musteri', son_tarih: d.bitis_tarihi || '', createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() };
    evraklar.unshift(evrak); _storeE(evraklar);
    var wf = _loadWF(); wf.unshift({ id: _genId(), evrak_id: evrak.id, adim: 'hazirlandi', yapan_id: _cu()?.id, tarih: _now(), not: 'Taslak oluşturuldu' }); _storeWF(wf);
    window.toast?.(tur + ' taslağı oluşturuldu', 'ok');
    window.renderIhracatOps?.();
    if (tur === 'CI' || tur === 'PL') { setTimeout(function() { window._ihrPdfOnizle(dosyaId, tur, urunler); }, 300); }
    return;
  }

  var MESAJLAR = { GCB: 'GÇB gümrükçü tarafından hazırlanıyor. GÇB sekmesinden takip edin.', BL: 'BL forwarder tarafından hazırlanıyor. Konşimento sekmesinden takip edin.', MENSEI: 'Menşei şahadetnamesi gümrükçü tarafından hazırlanıyor.', EUR1: 'EUR.1/A.TR gümrükçü tarafından hazırlanıyor.', INSP: 'Inspection raporu gözetim şirketinden gelir.', SIG: 'Sigorta poliçesi teslim şekline göre belirlenir.' };
  window.toast?.(MESAJLAR[tur] || 'Bu evrak harici kaynak tarafından üretilir.', 'warn');
};
window._ihrEvrakOnayla = function(id) { if (!_isManager()) { window.toast?.('Yetki yok', 'err'); return; } var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'onaylandi'; e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Onaylandı', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakGonder = function(id) { var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'gonderildi'; e.gonderim_tarihi = _now(); e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Gönderildi', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakDuzenle = function(id) { var e = _loadE().find(function(x) { return String(x.id) === String(id); }); if (!e) return; var durumlar = [['taslak','Taslak'],['onay_bekliyor','Onay Bekliyor'],['onaylandi','Onaylandı'],['gonderildi','Gönderildi']]; _moAc('mo-ev-edit', 'Evrak Düzenle', '<input type="hidden" id="ev-id" value="' + id + '"><div class="fg"><div class="fl">Durum</div><select class="fi" id="ev-durum">' + durumlar.map(function(d) { return '<option value="' + d[0] + '"' + (e.durum === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></div><div class="fg" style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ev-not" rows="2">' + _esc(e.not || '') + '</textarea></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-ev-edit\')?.remove()">İptal</button><button class="btn btnp" onclick="window._evKaydet()">Kaydet</button>'); };
window._evKaydet = function() { var id = _g('ev-id')?.value; if (!id) return; var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = _g('ev-durum')?.value || e.durum; e.not = (_g('ev-not')?.value || '').trim(); e.updatedAt = _now(); _storeE(evraklar); _g('mo-ev-edit')?.remove(); window.toast?.('Güncellendi', 'ok'); window.renderIhracatOps?.(); };
window._ihrEvrakEkle = function(dosyaId) { window._ihrEvrakDosyaYukle(dosyaId || '', 'CI'); };

/* ── EVRAK DOSYA YÜKLE (Dış evraklar) ───────────────────── */
window._ihrEvrakDosyaYukle = function(dosyaId, tur) {
  var old = _g('mo-evrak-yukle'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-evrak-yukle';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">' + _esc(tur) + ' Yükle</div><button onclick="document.getElementById(\'mo-evrak-yukle\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:18px 20px">'
    + '<input type="hidden" id="ey-dosya" value="' + dosyaId + '">'
    + '<input type="hidden" id="ey-tur" value="' + tur + '">'
    + '<div class="fg"><div class="fl">Dosya URL (Firebase Storage veya harici link)</div><input class="fi" id="ey-url" placeholder="https://..." style="width:100%"></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ey-not" rows="2" style="resize:vertical" placeholder="Evrak hakkında not..."></textarea></div>'
    + '<div style="margin-top:10px;font-size:11px;color:var(--t2)">Dosyayı önce Firebase Storage\'a yükleyin, URL\'yi buraya yapıştırın.</div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-evrak-yukle\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._evrakYukleKaydet()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._evrakYukleKaydet = function() {
  var dosyaId = (_g('ey-dosya') || {}).value;
  var tur = (_g('ey-tur') || {}).value;
  var url = ((_g('ey-url') || {}).value || '').trim();
  var not = ((_g('ey-not') || {}).value || '').trim();
  if (!url) { window.toast?.('URL zorunludur', 'err'); return; }

  var evraklar = _loadE();
  var existing = null; evraklar.forEach(function(e) { if (String(e.dosya_id) === String(dosyaId) && e.tur === tur) existing = e; });
  if (existing) {
    existing.dosya_url = url; existing.durum = 'gonderildi'; existing.not = not;
    existing.gonderim_tarihi = _now(); existing.updatedAt = _now();
  } else {
    evraklar.unshift({ id: _genId(), dosya_id: dosyaId, tur: tur, durum: 'gonderildi', dosya_url: url, not: not, gonderim_tarihi: _now(), createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() });
  }
  _storeE(evraklar);
  _g('mo-evrak-yukle')?.remove();
  window.toast?.(tur + ' yüklendi', 'ok');
  window.logActivity?.('ihracat', tur + ' yüklendi: ' + url);
  window.renderIhracatOps?.();
};

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

// ══ IHR-06: Kolon Yonetimi ════════════════════════════════════
window._ihrKolonAyar = function(dosyaId) {
  var allKols = window._ihrAllKolonlar || [];
  var saved; try { saved = JSON.parse(localStorage.getItem(_IHR_KOLON_KEY) || 'null') || _IHR_KOLON_DEFAULT.slice(); } catch(e) { saved = _IHR_KOLON_DEFAULT.slice(); }
  var kolMap = {}; allKols.forEach(function(k) { kolMap[k.k] = k.l; });
  var groups = [
    { baslik:'Kimlik & Baglanti', keys:['tedarikciAd','proforma_id','pi_link','satis_siparis_id','siparis_id','alis_fatura_no','alis_fatura_tarihi','fatura_turu'] },
    { baslik:'Urun', keys:['urun_kodu','satici_urun_kodu','benzer_urun_kodu','satici_urun_adi','aciklama','standart_urun_adi','teknik_aciklama','fatura_urun_adi','gumrukcu_tanim','mense_ulke','hs_kodu'] },
    { baslik:'Fiyat & KDV', keys:['miktar','birim_fiyat','doviz','kdv_orani','kdv_tutar','kdv_dahil','kdv_iadesi'] },
    { baslik:'Ambalaj & Yukleme', keys:['koli_adet','brut_kg','net_kg','hacim_m3','konteyner_sira','etiket_rengi','once_yukle','teslim_tarihi','teslim_yeri','marka','kategori','duay_not'] },
    { baslik:'IMO & DIB', keys:['imo_urun','imo_no','imo_msds','dib'] },
    { baslik:'VGM', keys:['vgm_kg','vgm_no','vgm_kaynak','vgm_tarih'] },
    { baslik:'GCB & Konteyner', keys:['booking_no','konteyner_no','muhur_no','gcb_no','gcb_id','gcb_tarih','gcb_kur','gcb_kapandi','gcb_kapama_tarihi','mensei_no','mensei_tarih'] },
    { baslik:'Sigorta', keys:['police_no','police_tarihi','police_kapsami','police_tutari','sigorta_firma'] },
    { baslik:'Tasima', keys:['kamyon_sofor','sofor_tc','arac_plaka','dorse_plaka','nakliye_firma','gumruk_maliyeti','konteyner_satis','konteyner_para','yukleme_durumu'] },
    { baslik:'Diger', keys:['satici_adi','gumrukcu_adi','muhasebeci_adi','ihracat_id'] },
  ];
  var old = _g('mo-kolon-ayar'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-kolon-ayar';
  var h = '<div class="moc" style="max-width:680px;padding:0;border-radius:14px;overflow:hidden;max-height:88vh;display:flex;flex-direction:column">';
  h += '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600;flex-shrink:0">\u2699 Kolon Gorunumu <span style="font-size:11px;font-weight:400;color:var(--t3)">(' + allKols.length + ' kolondan sec)</span></div>';
  h += '<div style="padding:8px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex-shrink:0">';
  h += '<span style="font-size:11px;color:var(--t3)">Hazir Sablonlar:</span>';
  Object.keys(_IHR_KOLON_PRESETS).forEach(function(pr) { h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKolonPreset(\'' + pr + '\')" style="font-size:10px;padding:3px 10px">' + pr + '</button>'; });
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKolonPreset(\'tumu\')" style="font-size:10px;padding:3px 10px">Tumunu Goster</button>';
  h += '<button class="btn" onclick="event.stopPropagation();window._ihrKolonPreset(\'sifirla\')" style="font-size:10px;padding:3px 10px;color:#DC2626">Varsayilan</button>';
  h += '</div>';
  h += '<div style="overflow-y:auto;flex:1;padding:12px 20px">';
  groups.forEach(function(gr) {
    var gKols = gr.keys.filter(function(k) { return kolMap[k]; });
    if (!gKols.length) return;
    h += '<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">' + gr.baslik + '</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
    gKols.forEach(function(k) {
      var chk = saved.indexOf(k) !== -1;
      h += '<label style="display:flex;align-items:center;gap:4px;padding:3px 8px;border:0.5px solid var(--b);border-radius:6px;background:' + (chk ? '#E6F1FB' : 'var(--sf)') + ';cursor:pointer;font-size:11px;color:' + (chk ? '#0C447C' : 'var(--t2)') + ';user-select:none">';
      h += '<input type="checkbox" data-kol="' + k + '" ' + (chk ? 'checked' : '') + ' onchange="event.stopPropagation();window._ihrKolonChk(this)" onclick="event.stopPropagation()" style="accent-color:#185FA5;cursor:pointer;width:12px;height:12px">';
      h += _esc(kolMap[k]) + '</label>';
    });
    h += '</div></div>';
  });
  h += '</div>';
  h += '<div style="padding:10px 20px;border-top:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">';
  h += '<span id="ihr-kolon-sayac" style="font-size:11px;color:var(--t3)">' + saved.length + ' kolon secili</span>';
  h += '<div style="display:flex;gap:8px"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-kolon-ayar\')?.remove()">Iptal</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrKolonKaydet(\'' + dosyaId + '\')">Uygula</button></div></div></div>';
  mo.innerHTML = h; document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrKolonChk = function(cb) {
  var cnt = document.querySelectorAll('#mo-kolon-ayar input[type=checkbox]:checked').length;
  var sayac = _g('ihr-kolon-sayac'); if (sayac) sayac.textContent = cnt + ' kolon secili';
  var lbl = cb.closest('label'); if (lbl) { lbl.style.background = cb.checked ? '#E6F1FB' : 'var(--sf)'; lbl.style.color = cb.checked ? '#0C447C' : 'var(--t2)'; }
};

window._ihrKolonPreset = function(preset) {
  var keys = preset === 'tumu' ? (window._ihrAllKolonlar || []).map(function(k) { return k.k; })
    : preset === 'sifirla' ? _IHR_KOLON_DEFAULT.slice()
    : (_IHR_KOLON_PRESETS[preset] || _IHR_KOLON_DEFAULT.slice());
  document.querySelectorAll('#mo-kolon-ayar input[type=checkbox]').forEach(function(cb) {
    cb.checked = keys.indexOf(cb.dataset.kol) !== -1;
    var lbl = cb.closest('label'); if (lbl) { lbl.style.background = cb.checked ? '#E6F1FB' : 'var(--sf)'; lbl.style.color = cb.checked ? '#0C447C' : 'var(--t2)'; }
  });
  var sayac = _g('ihr-kolon-sayac'); if (sayac) sayac.textContent = document.querySelectorAll('#mo-kolon-ayar input[type=checkbox]:checked').length + ' kolon secili';
};

window._ihrKolonKaydet = function(dosyaId) {
  var keys = []; document.querySelectorAll('#mo-kolon-ayar input[type=checkbox]:checked').forEach(function(cb) { keys.push(cb.dataset.kol); });
  if (keys.length < 1) { window.toast?.('En az 1 kolon secilmeli', 'err'); return; }
  try { localStorage.setItem(_IHR_KOLON_KEY, JSON.stringify(keys)); } catch(e) { window.toast?.('Kayit hatasi', 'err'); return; }
  _g('mo-kolon-ayar')?.remove();
  window.toast?.(keys.length + ' kolon uygulandi', 'ok');
  window.logActivity?.('ihracat', 'Kolon gorunumu: ' + keys.length + ' kolon');
  if (_aktifDosyaId) { var _dd = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd) _ihrDetayRenderOzet(_dd); }
};

})();
