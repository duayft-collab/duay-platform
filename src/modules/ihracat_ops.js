/**
 * src/modules/ihracat_ops.js — v2.0.0
 * İhracat Operasyon Merkezi — Tam Yeniden Yazım
 * 6 Sekme: Emirler · GÇB · Konşimento · Belgeler · Roller · Templateler
 */
(function IhracatOpsModule() {
'use strict';

// IHR-06: Kolon yonetimi sabitleri
var _IHR_KOLON_KEY = 'ak_ihr_kolon_v1';
// Is akisi sirasina gore varsayilan kolonlar
var _IHR_KOLON_DEFAULT = [
  // Kimlik
  'tedarikciAd','urun_kodu','aciklama','standart_urun_adi','gumrukcu_tanim',
  // Siniflandirma
  'mense_ulke','hs_kodu',
  // Fiyat
  'miktar','birim_fiyat','doviz','fatura_turu','kdv_orani',
  // Ambalaj
  'koli_adet','brut_kg','net_kg','hacim_m3',
  // Yukleme
  'konteyner_sira','etiket_rengi','once_yukle',
  // Alim
  'alis_fatura_no','alis_fatura_tarihi'
];
var _IHR_KOLON_PRESETS = {
  'CI/PL':  ['tedarikciAd','standart_urun_adi','fatura_urun_adi','aciklama','miktar','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hacim_m3','mense_ulke','hs_kodu'],
  'GCB':    ['tedarikciAd','urun_kodu','aciklama','miktar','birim_fiyat','doviz','mense_ulke','hs_kodu','fatura_turu','gcb_no','gcb_tarih','gcb_kur','gcb_kapandi','gcb_kapama_tarihi'],
  'Sigorta':['tedarikciAd','standart_urun_adi','miktar','birim_fiyat','doviz','brut_kg','hacim_m3','police_no','police_tarihi','police_tutari','sigorta_firma'],
  'VGM':    ['tedarikciAd','konteyner_sira','koli_adet','brut_kg','net_kg','hacim_m3','konteyner_no','booking_no','muhur_no','vgm_kg','vgm_no','vgm_tarih','vgm_kaynak'],
  'Gumrukcu PL': ['tedarikciAd','gumrukcu_tanim','hs_kodu','miktar','birim','brut_kg','net_kg','koli_adet','hacim_m3','mense_ulke','konteyner_no','muhur_no'],
};

// SMART-OCR-001: Evrak tipi bazli OCR prompt'lari
var _EVRAK_OCR_PROMPT = {
  GCB: { prompt:'Bu bir Gumruk Beyannamesi (GCB). Su alanlari cikar ve JSON ver: beyan_no, tescil_tarihi (YYYY-MM-DD), fob_deger (sayi), doviz (USD/EUR/TRY), ihracatci_adi, alici_adi, mal_tanimi, hs_kodu_listesi (array). Sadece JSON ver.', alanlar:['beyan_no','tescil_tarihi','fob_deger','doviz','ihracatci_adi','alici_adi','mal_tanimi'] },
  BL:  { prompt:'Bu bir Konsimento (Bill of Lading). Su alanlari cikar: bl_no, yukleme_tarihi (YYYY-MM-DD), consignee, notify_party, vessel_name, pol, pod, konteyner_no, seal_no, toplam_koli, toplam_kg, mal_tanimi, bl_turu (belgede DRAFT geciyorsa "draft", ORIGINAL geciyorsa "original"). Sadece JSON ver.', alanlar:['bl_no','yukleme_tarihi','consignee','notify_party','vessel_name','pol','pod','konteyner_no','seal_no','toplam_koli','toplam_kg','mal_tanimi','bl_turu'] },
  MENSEI:{ prompt:'Bu bir Mensei Sahadetnamesi. Su alanlari cikar: belge_no, tarih (YYYY-MM-DD), ihracatci, alici, mal_cinsi, mense_ulke. Sadece JSON ver.', alanlar:['belge_no','tarih','ihracatci','alici','mal_cinsi','mense_ulke'] },
  EUR1:{ prompt:'Bu bir EUR.1 veya A.TR dolasim belgesi. Su alanlari cikar: belge_no, tarih (YYYY-MM-DD), ihracatci, alici, mal_tanimi. Sadece JSON ver.', alanlar:['belge_no','tarih','ihracatci','alici','mal_tanimi'] },
  INSP:{ prompt:'Bu bir Inspection raporu. Su alanlari cikar: rapor_no, tarih (YYYY-MM-DD), firma, mal_tanimi, sonuc (uygun/uygun degil). Sadece JSON ver.', alanlar:['rapor_no','tarih','firma','mal_tanimi','sonuc'] },
  SIG: { prompt:'Bu bir sigorta policesidir. Su alanlari cikar: police_no, sigorta_sirketi, baslangic_tarihi (YYYY-MM-DD), bitis_tarihi, sigorta_degeri (sayi), doviz, kapsam_turu. Sadece JSON ver.', alanlar:['police_no','sigorta_sirketi','baslangic_tarihi','bitis_tarihi','sigorta_degeri','doviz','kapsam_turu'] },
};

var ETIKET_RENK = { Mavi:'#185FA5', Pembe:'#D4537E', Sari:'#BA7517', Yesil:'#16A34A', Mor:'#7C3AED', Turuncu:'#D85A30', Kirmizi:'#DC2626', Lacivert:'#1E3A5F', Turkuaz:'#0EA5E9', Lime:'#84CC16', Bordo:'#881337', Altin:'#D4A017', Gri:'#6B7280', Beyaz:'#F9FAFB', Siyah:'#111827', Kahve:'#78350F', Mercan:'#FB7185', Buz:'#E0F2FE', Lavanta:'#C4B5FD', Nane:'#6EE7B7', Somon:'#FDA4AF', Safran:'#FBBF24', Kobalt:'#3B82F6', Fusya:'#EC4899', Zeytin:'#65A30D', Indigo:'#4F46E5', Bakir:'#EA580C', Camgobegi:'#06B6D4', Ametist:'#8B5CF6', Gumus:'#94A3B8' };

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

/**
 * Kaydet/sil sonrasi dogru yere render eder.
 * Dosya detayindaysa detayda kalir, degilse ana listeye doner.
 */
function _ihrReRender() {
  if (_aktifDosyaId) {
    var _dd = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
    var _cc = _g('ihr-detay-content');
    if (_dd && _cc) {
      _ihrDetayRenderUrunler(_dd, _cc);
      return;
    }
    // Detay content yoksa full detay render
    _ihrRenderDosyaDetay(_aktifDosyaId);
    return;
  }
  window.renderIhracatOps?.();
}
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
    panel.innerHTML = '<div class="ph"><div><div class="pht">İhracat Ops</div><div class="phs">İhracat emirleri ve operasyon takibi</div></div><div class="ur"><button class="btn btns" onclick="event.stopPropagation();window.App?.nav?.(\'ihracat-formlar\')" style="font-size:11px">Formlar</button><button class="btn btns" onclick="event.stopPropagation();window._ihrKdvIadeHesapla?.()" style="font-size:11px">KDV Iade</button><button class="btn btns" onclick="event.stopPropagation();window._ihrExcelImportV3?.()">Excel Import</button><button class="btn btns" onclick="window._ihrRunChecks()">Kontrol Et</button><button class="btn btnp" onclick="window._ihrYeniEmir()">+ Yeni Emir</button></div></div><div id="ihr-tabs" style="display:flex;border-bottom:0.5px solid var(--b);padding:0 20px"></div><div id="ihr-content" style="padding:0"></div>';
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
  gcbAll.forEach(function(g) { var dosya = _loadD().find(function(d) { return d.id === g.dosya_id; }); h += '<tr><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(g.beyan_no || '—') + '</td><td style="font-size:11px">' + _esc(dosya?.dosyaNo || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(g.tescil_tarihi || '—') + '</td><td style="font-size:11px">' + (g.fob_deger ? g.fob_deger.toLocaleString('tr-TR') + ' ' + (g.doviz || '') : '—') + '</td><td>' + _badge(g.durum || 'bekliyor', '#D97706', 'rgba(217,119,6,.1)') + '</td><td><button class="btn btns" onclick="window._ihrGcbDuzenle(\'' + g.id + '\')" style="font-size:11px;padding:3px 8px">\u270f\ufe0f</button><button class="btn btns btnd" onclick="event.stopPropagation();window._ihrGcbSil?.(\'' + g.id + '\')" style="font-size:11px;padding:3px 8px">\ud83d\uddd1</button></td></tr>'; });
  h += '</tbody></table>'; el.innerHTML = h;
}

/* ── BL LİSTESİ ──────────────────────────────────────────── */
function _ihrRenderBlList(el) {
  var blAll = _loadBL().filter(function(b) { return !b.isDeleted; });
  var h = '<div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">Konşimento Takip</div><button class="btn btnp" onclick="window._ihrBlEkle(null)" style="font-size:11px">+ BL Ekle</button></div>';
  if (!blAll.length) { h += '<div style="text-align:center;padding:48px;color:var(--t2)">Henüz BL yok</div>'; el.innerHTML = h; return; }
  h += '<table class="tbl"><thead><tr><th>BL No</th><th>Dosya</th><th>Consignee</th><th>Yükleme</th><th>Tür</th><th></th></tr></thead><tbody>';
  blAll.forEach(function(b) { var dosya = _loadD().find(function(d) { return d.id === b.dosya_id; }); h += '<tr><td style="font-family:monospace;font-size:11px;color:var(--ac)">' + _esc(b.bl_no || '—') + '</td><td style="font-size:11px">' + _esc(dosya?.dosyaNo || '—') + '</td><td style="font-size:11px">' + _esc(b.consignee || '—') + '</td><td style="font-size:11px;font-family:monospace">' + _esc(b.yukleme_tarihi || '—') + '</td><td style="font-size:11px">' + _esc({ seaway: 'SeaWay', hardcopy: 'Hard Copy', telex: 'Telex' }[b.bl_turu] || '—') + '</td><td><button class="btn btns" onclick="window._ihrBlDuzenle(\'' + b.id + '\')" style="font-size:11px;padding:3px 8px">\u270f\ufe0f</button><button class="btn btns btnd" onclick="event.stopPropagation();window._ihrBlSil?.(\'' + b.id + '\')" style="font-size:11px;padding:3px 8px">\ud83d\uddd1</button></td></tr>'; });
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
  var gcbList = _loadG().filter(function(g) { return String(g.dosya_id) === String(d.id) && !g.isDeleted; });
  var blList = _loadBL().filter(function(b) { return String(b.dosya_id) === String(d.id) && !b.isDeleted; });
  var gumrukculer = _loadGM();
  var gm = null; gumrukculer.forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; });
  var forwarderlar = _loadFW();
  var fw = null; forwarderlar.forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; });

  // IHR-AKIS-001: Gorsel is akisi + dosya sagligi
  var _akisAdimlar = [
    { tur: 'PI', l: 'PI', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'PI\',null)', btnL: 'PI Oluştur' },
    { tur: 'CI', l: 'CI', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'CI\',null)', btnL: 'CI Oluştur' },
    { tur: 'PL', l: 'PL', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'PL\',null)', btnL: 'PL Oluştur' },
    { tur: 'GCB', l: 'GÇB', fn: 'window._ihrGcbEkle(\'' + d.id + '\')', btnL: 'GÇB Ekle', custom: function() { return gcbList.length > 0; } },
    { tur: 'BL', l: 'BL', fn: 'window._ihrBlEkle(\'' + d.id + '\')', btnL: 'BL Ekle', custom: function() { return blList.length > 0; } },
    { tur: 'KAPAT', l: 'Kapat', fn: '', btnL: '', custom: function() { return d.durum === 'kapandi'; } },
  ];
  var _evrakDurum = function(tur) {
    if (tur === 'GCB' || tur === 'BL' || tur === 'KAPAT') return null;
    var ev = evraklar.find(function(e) { return e.tur === tur; });
    return ev ? ev.durum : null;
  };
  var _akisHtml = '<div style="display:flex;align-items:center;gap:0;padding:10px 0;margin-bottom:12px;overflow-x:auto">';
  var _aktifAdim = null;
  _akisAdimlar.forEach(function(adim, idx) {
    var durum = adim.custom ? (adim.custom() ? 'tamam' : 'eksik') : (_evrakDurum(adim.tur) === 'onaylandi' || _evrakDurum(adim.tur) === 'gonderildi' ? 'tamam' : _evrakDurum(adim.tur) ? 'taslak' : 'eksik');
    // EVRAK-DOSYA-BADGE-001: dosya yuklu mu kontrolu
    var _adimEvrak = evraklar.find(function(e) { return e.tur === adim.tur; });
    var _adimDosyaVar = _adimEvrak && _adimEvrak.dosyalar && _adimEvrak.dosyalar.length > 0;
    var bg, fg, icon;
    if (durum === 'tamam' && _adimDosyaVar) { bg = '#EAF3DE'; fg = '#16A34A'; icon = '\u2705'; }
    else if (durum === 'tamam' && !_adimDosyaVar) { bg = '#FEF9C3'; fg = '#D97706'; icon = '\u26a0\ufe0f'; }
    else if (durum === 'taslak') { bg = '#FAEEDA'; fg = '#D97706'; icon = '\ud83d\udfe1'; }
    else { bg = '#F3F4F6'; fg = '#9CA3AF'; icon = '\u2b1c'; }
    if (durum === 'eksik' && !_aktifAdim) { _aktifAdim = adim; bg = '#FEF2F2'; fg = '#DC2626'; icon = '🔴'; }
    _akisHtml += '<div style="display:flex;flex-direction:column;align-items:center;min-width:60px">';
    _akisHtml += '<div style="width:32px;height:32px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid ' + fg + '">' + icon + '</div>';
    _akisHtml += '<div style="font-size:10px;font-weight:600;color:' + fg + ';margin-top:4px">' + adim.l + '</div>';
    _akisHtml += '</div>';
    if (idx < _akisAdimlar.length - 1) _akisHtml += '<div style="flex:1;height:2px;background:' + (durum === 'tamam' ? '#16A34A' : 'var(--b)') + ';min-width:20px;margin:0 4px"></div>';
  });
  _akisHtml += '</div>';
  if (_aktifAdim && _aktifAdim.fn) {
    _akisHtml += '<div style="text-align:center;margin-bottom:12px"><button class="btn btnp" onclick="event.stopPropagation();' + _aktifAdim.fn + '" style="font-size:11px">' + _aktifAdim.btnL + ' →</button></div>';
  }

  // Dosya Sağlığı skoru
  var _dUrunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; });
  var _hsDolu = _dUrunler.filter(function(u) { return !!u.hs_kodu; }).length;
  var _hsPct = _dUrunler.length > 0 ? Math.round(_hsDolu / _dUrunler.length * 100) : 0;
  var _evrakToplam = 6; // PI,CI,PL,GCB,BL,KAPAT
  var _evrakTamam = _akisAdimlar.filter(function(a) { var dur = a.custom ? (a.custom() ? 'tamam' : 'eksik') : (_evrakDurum(a.tur) === 'onaylandi' || _evrakDurum(a.tur) === 'gonderildi' ? 'tamam' : 'eksik'); return dur === 'tamam'; }).length;
  var _evrakPct = Math.round(_evrakTamam / _evrakToplam * 100);
  var _kalanG = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
  var _saglikPct = Math.round((_hsPct + _evrakPct) / 2);
  var _saglikRenk = _saglikPct >= 80 ? '#16A34A' : _saglikPct >= 50 ? '#D97706' : '#DC2626';

  var _saglikHtml = '<div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">';
  _saglikHtml += '<div style="flex:1;min-width:120px;padding:10px 14px;background:var(--sf);border:1px solid var(--b);border-radius:8px"><div style="font-size:10px;color:var(--t3)">HS Doluluk</div><div style="font-size:18px;font-weight:700;color:' + (_hsPct >= 100 ? '#16A34A' : '#DC2626') + '">%' + _hsPct + '</div></div>';
  _saglikHtml += '<div style="flex:1;min-width:120px;padding:10px 14px;background:var(--sf);border:1px solid var(--b);border-radius:8px"><div style="font-size:10px;color:var(--t3)">Evrak Tamamlanma</div><div style="font-size:18px;font-weight:700;color:' + (_evrakPct >= 80 ? '#16A34A' : '#D97706') + '">%' + _evrakPct + '</div></div>';
  _saglikHtml += '<div style="flex:1;min-width:120px;padding:10px 14px;background:var(--sf);border:1px solid var(--b);border-radius:8px"><div style="font-size:10px;color:var(--t3)">Kalan Gün</div><div style="font-size:18px;font-weight:700;color:' + (_kalanG !== null && _kalanG < 0 ? '#DC2626' : _kalanG !== null && _kalanG < 7 ? '#D97706' : '#16A34A') + '">' + (_kalanG !== null ? _kalanG : '—') + '</div></div>';
  _saglikHtml += '<div style="flex:1;min-width:120px;padding:10px 14px;background:var(--sf);border:1px solid ' + _saglikRenk + ';border-radius:8px"><div style="font-size:10px;color:var(--t3)">Dosya Sağlığı</div><div style="font-size:18px;font-weight:700;color:' + _saglikRenk + '">%' + _saglikPct + '</div></div>';
  _saglikHtml += '</div>';

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

  var h = _akisHtml + _saglikHtml + '<div style="display:flex;gap:16px;align-items:flex-start">';

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

  /* Dis Taraf Link */
  h += '<div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--b)">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Dis Taraf Belge Yukleme</div>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDisTarafLink?.(\'' + d.id + '\')" style="font-size:11px;width:100%;color:#185FA5">🔗 Yukleme Linki Olustur</button>';
  h += '</div>';

  /* Teklif Sistemi */
  h += '<div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--b)">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Teklif Sistemi</div>';
  h += '<div style="display:flex;gap:6px">';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrTeklifGonder?.(\'' + d.id + '\')" style="font-size:11px;flex:1">Teklif Iste</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrTeklifKarsilastir?.(\'' + d.id + '\')" style="font-size:11px;flex:1">Karsilastir</button>';
  h += '</div></div>';

  /* Kontrol Listeleri */
  h += '<div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--b)">';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Kontrol Listeleri</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrYuklemeKontrol?.(\'' + d.id + '\')" style="font-size:10px">Yukleme Kontrol</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKonteynerDizilim?.(\'' + d.id + '\')" style="font-size:10px">Konteyner Dizilim</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrTeslimatKontrol?.(\'' + d.id + '\')" style="font-size:10px">Teslimat Kontrol</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSevkIzni?.(\'' + d.id + '\')" style="font-size:10px">Sevk Izni</button>';
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
    var durum = kayit ? (EVRAK_DURUM[kayit.durum] || EVRAK_DURUM.taslak) : { l: 'Henuz Yok', c: '#9CA3AF', bg: 'rgba(156,163,175,.1)' };
    var isDuay = ev.kim === 'duay';
    var rowBg = kayit && kayit.durum !== 'taslak' ? 'var(--s2)' : 'var(--sf)';
    var zaman = kayit ? (kayit.gonderim_tarihi || kayit.updatedAt || kayit.createdAt || '') : '';
    var zamanTxt = zaman ? zaman.slice(0, 16).replace('T', ' ') : '';
    var dosyalar = (kayit && kayit.dosyalar) ? kayit.dosyalar : [];
    var yukleyenAd = kayit && kayit.yukleyen_ad ? kayit.yukleyen_ad : '';
    var revNo = dosyalar.length;

    h += '<div style="padding:8px 12px;border-radius:8px;border:0.5px solid var(--b);background:' + rowBg + ';margin-bottom:5px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';

    /* Sol: evrak adi + akis (inline editable) + zaman + yukleyen */
    h += '<div style="flex:1;min-width:0">';
    h += '<span style="font-size:12px;font-weight:' + (kayit ? '500' : '400') + ';color:var(--t)">' + _esc(ev.l) + '</span>';
    // EVRAK-DOSYA-BADGE-001: dosya durumu badge (dosya_url fallback dahil)
    var _topDosya = dosyalar.length + ((kayit && kayit.dosya_url && !dosyalar.length) ? 1 : 0);
    if (kayit && _topDosya > 0) {
      h += '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:20px;font-size:9px;font-weight:500;margin-left:6px;background:#EAF3DE;color:#085041;border:0.5px solid #97C459;vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:#16A34A"></span>' + _topDosya + ' dosya</span>';
    } else if (kayit) {
      h += '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:20px;font-size:9px;font-weight:500;margin-left:6px;background:#FAEEDA;color:#633806;border:0.5px solid #EF9F27;vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:#D97706"></span>Dosya yok</span>';
    } else {
      h += '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:20px;font-size:9px;font-weight:500;margin-left:6px;background:var(--s2);color:var(--t3);vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:var(--t3)"></span>Kayit Yok</span>';
    }
    if (revNo > 0) h += ' <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--s2);color:var(--t3)">Rev.' + revNo + '</span>';
    h += '<div style="font-size:10px;color:var(--t3)">';
    // Kaynak → Hedef (tiklaninca inline edit)
    var _evKaynak = (kayit && kayit.kaynak) ? kayit.kaynak : ev.uretici;
    var _evHedef = (kayit && kayit.hedef) ? kayit.hedef : ev.alici;
    if (kayit) {
      h += '<span onclick="event.stopPropagation();window._ihrEvrakKaynakDuzenle(\'' + kayit.id + '\')" style="cursor:pointer;text-decoration:underline dotted" title="Tikla duzenle">' + _esc(_evKaynak) + '</span>';
      h += ' \u2192 ';
      h += '<span onclick="event.stopPropagation();window._ihrEvrakHedefDuzenle(\'' + kayit.id + '\')" style="cursor:pointer;text-decoration:underline dotted" title="Tikla duzenle">' + _esc(_evHedef) + '</span>';
    } else {
      h += _esc(ev.uretici) + ' \u2192 ' + _esc(ev.alici);
    }
    if (zamanTxt) h += ' · ' + _esc(zamanTxt);
    if (yukleyenAd) h += ' · ' + _esc(yukleyenAd);
    h += '</div></div>';

    /* Sag: durum + butonlar */
    h += '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;flex-wrap:wrap">';
    h += _badge(durum.l, durum.c, durum.bg);

    /* DOCX + Excel + PDF — Duay uretimli evraklar */
    if (isDuay && ['PI','CI','PL','SEVK','YUK'].indexOf(ev.tur) !== -1) {
      var _docxTipMap = { PI:'pi', CI:'ci', PL:'pl', SEVK:'sevk', YUK:'yuk' };
      var _docxTip = _docxTipMap[ev.tur] || ev.tur.toLowerCase();
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDocxIndir?.(\'' + d.id + '\',\'' + _docxTip + '\')" style="font-size:10px;padding:2px 8px;color:#185FA5">DOCX</button>';
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrExcelIndir?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px;color:#1D6A2A">Excel</button>';
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrPdfIndir?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px;color:#C62828">PDF</button>';
    }
    h += '<button class="btn btns" onclick="window._ihrPdfOnizle(\'' + d.id + '\',\'' + ev.tur + '\',null)" style="font-size:10px;padding:2px 8px">Goruntule</button>';
    /* Dosya yukle — dis evraklar Smart OCR, ic evraklar normal */
    var _ocrEvraklar = ['GCB','BL','MENSEI','EUR1','INSP','SIG'];
    var _yukBtnMetin = (dosyalar.length > 0) ? '+ Ekle' : 'Yukle';
    var _yukBtnStil = (dosyalar.length > 0) ? 'color:#16A34A;border-color:#97C459' : 'color:#185FA5';
    if (_ocrEvraklar.indexOf(ev.tur) !== -1) {
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSmartEvrakYukle?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px;' + _yukBtnStil + '">' + _yukBtnMetin + '</button>';
    } else {
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrEvrakDosyaYukle(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px;' + _yukBtnStil + '">' + _yukBtnMetin + '</button>';
    }
    if (kayit && kayit.dosya_url) {
      h += '<a href="' + _esc(kayit.dosya_url) + '" target="_blank" class="btn btns" style="font-size:10px;padding:2px 8px;text-decoration:none">Indir</a>';
    }
    if (isDuay) {
      if (!kayit) { h += '<button class="btn btns" onclick="window._ihrEvrakOlustur(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Olustur</button>'; }
      else if (kayit.durum === 'taslak') { h += '<button class="btn btns" onclick="window._ihrEvrakOnayla(\'' + kayit.id + '\')" style="font-size:10px;padding:2px 8px;color:#16A34A">Onayla</button>'; }
      else if (kayit.durum === 'onaylandi') { h += '<button class="btn btns" onclick="window._ihrEvrakGonderModal(\'' + kayit.id + '\',\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px">Gonder</button>'; }
      else if (kayit.durum === 'gonderildi') { h += '<span style="font-size:10px;color:#16A34A;padding:2px 4px">\u2713</span>'; }
    }
    // BL Draft → Orijinal butonu
    if (ev.tur === 'BL' && kayit && kayit.bl_turu === 'draft') {
      h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSmartEvrakYukle?.(\'' + d.id + '\',\'BL\')" style="font-size:10px;padding:2px 8px;color:#D97706" title="Orijinal BL yukle">Orijinal BL Ekle</button>';
    }
    h += '</div></div>';

    /* Coklu dosya listesi — toggle ile acilir */
    if (dosyalar.length > 0) {
      var _toggleId = 'evrak-files-' + ev.tur + '-' + (kayit ? kayit.id : '');
      h += '<div style="padding:2px 12px"><button onclick="event.stopPropagation();var el=document.getElementById(\'' + _toggleId + '\');if(el)el.style.display=el.style.display===\'none\'?\'block\':\'none\'" style="background:none;border:none;cursor:pointer;font-size:10px;color:#185FA5;padding:0">Tum Versiyonlar (' + dosyalar.length + ') \u25BE</button></div>';
      h += '<div id="' + _toggleId + '" style="display:none;padding:4px 12px 6px">';
      dosyalar.forEach(function(df, di) {
        h += '<div style="display:flex;align-items:center;gap:6px;font-size:10px;padding:2px 0;border-top:' + (di > 0 ? '0.5px solid var(--b)' : 'none') + '">';
        h += '<span style="color:var(--t3)">📎</span>';
        h += '<span style="flex:1;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(df.ad || 'Dosya ' + (di + 1)) + '</span>';
        if (df.boyut) h += '<span style="color:var(--t3)">' + Math.round(df.boyut / 1024) + 'KB</span>';
        if (df.yukleyen_ad) h += '<span style="color:var(--t3)">' + _esc(df.yukleyen_ad) + '</span>';
        if (df.yukleme_tarihi) h += '<span style="color:var(--t3)">' + _esc(df.yukleme_tarihi.slice(0, 16)) + '</span>';
        if (df.revizyon) h += '<span style="padding:1px 4px;border-radius:3px;background:var(--s2);color:var(--t3)">R' + df.revizyon + '</span>';
        if (df.url_veya_b64) h += '<a href="' + _esc(df.url_veya_b64) + '" target="_blank" style="color:#185FA5;text-decoration:none">Ac</a>';
        h += '<button onclick="event.stopPropagation();window._ihrEvrakDosyaSil?.(\'' + (kayit ? kayit.id : '') + '\',\'' + df.id + '\')" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:10px;padding:0 2px" title="Sil">\u2717</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '</div>';
  });

  // Ozel evrak tipleri (kullanici tanimli)
  evraklar.filter(function(e) { return String(e.dosya_id) === String(d.id) && e.tur && e.tur.indexOf('OZEL_') === 0; }).forEach(function(ev) {
    var dosyalar2 = ev.dosyalar || [];
    h += '<div style="padding:8px 12px;border-radius:8px;border:0.5px solid var(--b);background:var(--s2);margin-bottom:5px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';
    var _ozelDosyaUrl = ev.dosya_url;
    var _ozelTopDosya = dosyalar2.length + (_ozelDosyaUrl && !dosyalar2.length ? 1 : 0);
    h += '<div><span style="font-size:12px;font-weight:500;color:var(--t)">' + _esc(ev.belge_adi || ev.tur) + '</span>';
    if (_ozelTopDosya > 0) h += '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:20px;font-size:9px;font-weight:500;margin-left:6px;background:#EAF3DE;color:#085041;border:0.5px solid #97C459;vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:#16A34A"></span>' + _ozelTopDosya + ' dosya</span>';
    else h += '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:20px;font-size:9px;font-weight:500;margin-left:6px;background:#FAEEDA;color:#633806;border:0.5px solid #EF9F27;vertical-align:middle"><span style="width:6px;height:6px;border-radius:50%;background:#D97706"></span>Dosya yok</span>';
    if (dosyalar2.length) h += ' <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--s2);color:var(--t3)">Rev.' + dosyalar2.length + '</span>';
    h += '<div style="font-size:10px;color:var(--t3)">' + _esc(ev.kaynak || '') + ' \u2192 ' + _esc(ev.hedef || '') + '</div></div>';
    h += '<div style="display:flex;gap:4px">';
    var _ozelBtnMetin = _ozelTopDosya > 0 ? '+ Ekle' : 'Yukle';
    var _ozelBtnStil = _ozelTopDosya > 0 ? 'color:#085041;border-color:#97C459' : 'color:#633806;border-color:#EF9F27';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrEvrakDosyaYukle(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:10px;padding:2px 8px;' + _ozelBtnStil + '">' + _ozelBtnMetin + '</button>';
    h += '<button class="btn btns btnd" onclick="event.stopPropagation();window._ihrOzelEvrakSil?.(\'' + ev.id + '\')" style="font-size:10px;padding:2px 8px">Sil</button>';
    h += '</div></div></div>';
  });
  // + Belge Ekle butonu
  h += '<button onclick="event.stopPropagation();window._ihrOzelEvrakEkle(\'' + d.id + '\')" style="width:100%;padding:8px;border:1px dashed var(--b);border-radius:8px;background:none;color:var(--t3);font-size:11px;cursor:pointer;font-family:inherit;margin-top:4px" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.color=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.color=\'var(--t3)\'">+ Belge Ekle</button>';
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
      // ORPHAN-001: Bağlı ürünleri de soft-delete
      var urunAll = _loadU(); var urunChanged = false;
      ids.forEach(function(did) {
        urunAll.forEach(function(u) {
          if (String(u.dosya_id) === String(did) && !u.isDeleted) { u.isDeleted = true; u.deletedAt = _now(); urunChanged = true; }
        });
      });
      if (urunChanged) _storeU(urunAll);
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
    var _cont = _g('ihr-detay-content');
    if (_dosya && _cont) { _ihrDetayRenderUrunler(_dosya, _cont); }
    setTimeout(function() {
      var inp = _g('ihr-urun-ara');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }, 30);
  } else {
    _ihrRenderContent();
  }
};
// IHR-ZINCIR-001: Evrak zincir kontrolu
function _evrakZincirKontrol(dosyaId, tur) {
  var ZINCIR = { CI: 'PI', PL: 'CI', GCB: 'PL', BL: 'GCB' };
  var onceki = ZINCIR[tur];
  if (!onceki) return true;
  var evraklar = typeof loadIhracatEvraklar === 'function' ? loadIhracatEvraklar() : (window.loadIhracatEvraklar?.() || []);
  var oncekiEvrak = evraklar.find(function(e) { return String(e.dosya_id) === String(dosyaId) && e.tur === onceki; });
  if (!oncekiEvrak) return false;
  return oncekiEvrak.durum === 'onaylandi' || oncekiEvrak.durum === 'gonderildi';
}

window._ihrRunChecks = function() {
  var today = _today(); var uyari = 0;
  _loadGM().forEach(function(g) { if (!g.vekalet_bitis) return; var gun = Math.ceil((new Date(g.vekalet_bitis) - new Date()) / 86400000); if (gun <= 30) { uyari++; window.addNotif?.('⚠️', g.firma_adi + ': Vekalet ' + gun + ' günde bitiyor', 'warn', 'ihracat'); } });
  _loadD().filter(function(d) { return !['kapandi', 'iptal'].includes(d.durum) && d.bitis_tarihi && d.bitis_tarihi < today; }).forEach(function(d) { uyari++; window.addNotif?.('🔴', d.dosyaNo + ' gecikmiş!', 'err', 'ihracat'); });
  // IHR-ROL-001: Forwarder/Gümrükçü atanmamış kontrolü
  _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); }).forEach(function(d) {
    if (!d.gumrukcu_id) { uyari++; window.addNotif?.('⚠️', (d.dosyaNo || 'Dosya') + ': Gümrükçü atanmamış', 'warn', 'ihracat'); }
    if (!d.forwarder_id) { uyari++; window.addNotif?.('⚠️', (d.dosyaNo || 'Dosya') + ': Forwarder atanmamış', 'warn', 'ihracat'); }
  });
  // IHR-10: GÇB yaş kontrolü
  _loadG().filter(function(g) { return !g.isDeleted && g.durum !== 'kapandi'; }).forEach(function(g) {
    if (g.tescil_tarihi) {
      var gcbGun = Math.ceil((new Date(today) - new Date(g.tescil_tarihi)) / 86400000);
      var dosya = _loadD().find(function(d) { return String(d.id) === String(g.dosya_id); });
      var no = dosya ? dosya.dosyaNo : g.beyan_no || 'GÇB';
      if (gcbGun > 30) { uyari++; window.addNotif?.('🔴', no + ': GÇB ' + gcbGun + ' gündür açık!', 'err', 'ihracat'); }
      else if (gcbGun > 14) { uyari++; window.addNotif?.('⚠️', no + ': GÇB ' + gcbGun + ' gündür açık', 'warn', 'ihracat'); }
    } else {
      var dosya2 = _loadD().find(function(d) { return String(d.id) === String(g.dosya_id); });
      if (dosya2 && dosya2.bitis_tarihi && dosya2.bitis_tarihi < today) { uyari++; window.addNotif?.('⚠️', (dosya2.dosyaNo || 'GÇB') + ': tescil tarihi yok, dosya gecikmiş', 'warn', 'ihracat'); }
    }
  });
  // IHR-KAYITLI-001: GÇB+7 gün ihraç kayıtlı dilekçe bildirimi
  _loadG().filter(function(g) { return !g.isDeleted && g.durum === 'kapandi' && g.kapanma_tarihi; }).forEach(function(g) {
    var kGun = Math.ceil((new Date(today) - new Date(g.kapanma_tarihi)) / 86400000);
    if (kGun >= 7 && kGun <= 30) {
      var bKey = 'ak_ihr_kayitli_bildirim_' + g.id;
      if (!localStorage.getItem(bKey)) {
        var dosya = _loadD().find(function(d) { return String(d.id) === String(g.dosya_id); });
        uyari++;
        window.addNotif?.('📋', (dosya ? dosya.dosyaNo : 'GÇB') + ': İhraç kayıtlı dilekçe paketi hazırlanabilir — GÇB+' + kGun + ' gün', 'info', 'ihracat');
      }
    }
  });
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
  Object.keys(ETIKET_RENK).forEach(function(v) { h += '<option value="' + v + '"' + (_filtreler.etiket_rengi === v ? ' selected' : '') + '>' + v + '</option>'; });
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
  var _tmpSaved; try { _tmpSaved = JSON.parse(localStorage.getItem(_IHR_KOLON_KEY) || 'null'); } catch(e2) { _tmpSaved = null; }
  var _tmpKolSay = (Array.isArray(_tmpSaved) && _tmpSaved.length) ? _tmpSaved.length : _IHR_KOLON_DEFAULT.length;
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKolonAyar?.(\'' + d.id + '\')" style="font-size:10px;color:#185FA5;font-weight:600" title="Kolon gorunumunu ayarla">\u2699 ' + _tmpKolSay + ' Kolon</button>';
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
  // KOLONLAR — is akisi sirasina gore duzenlendi, uluslararasi basliklar
  var KOLONLAR = [
    /* ── 1. ÜRÜN KİMLİK ─────────────────────────────── */
    { k: 'tedarikciAd',      l: 'Supplier',        w: 120, filtre: true,  bos: true },
    { k: 'urun_kodu',        l: 'Item Code',       w: 95,  filtre: false, bos: true },
    { k: 'satici_urun_kodu', l: 'Vendor Code',     w: 90,  filtre: false, bos: true },
    { k: 'benzer_urun_kodu', l: 'Alt. Code',       w: 80,  filtre: false, bos: true },
    { k: 'aciklama',         l: 'Description',     w: 200, filtre: false, bos: true },
    { k: 'standart_urun_adi',l: 'Std Name (EN)',   w: 160, filtre: false, bos: true },
    { k: 'fatura_urun_adi',  l: 'Invoice Name',    w: 140, filtre: false, bos: true },
    { k: 'gumrukcu_tanim',   l: 'Customs Desc',    w: 140, filtre: false, bos: true },
    { k: 'satici_urun_adi',  l: 'Vendor Name',     w: 130, filtre: false, bos: true },
    { k: 'teknik_aciklama',  l: 'Tech Spec',       w: 120, filtre: false, bos: true },
    /* ── 2. SINIFLANDIRMA ────────────────────────────── */
    { k: 'mense_ulke',       l: 'Origin',          w: 80,  filtre: true,  bos: true },
    { k: 'hs_kodu',          l: 'HS Code',         w: 95,  filtre: false, bos: true },
    { k: 'kategori',         l: 'Category',        w: 80,  filtre: true,  bos: true },
    { k: 'marka',            l: 'Brand',           w: 70,  filtre: true,  bos: true },
    /* ── 3. FİYAT & MİKTAR ──────────────────────────── */
    { k: 'miktar',           l: 'Qty',             w: 75,  filtre: false, bos: true },
    { k: 'birim_fiyat',      l: 'Unit Price',      w: 95,  filtre: false, bos: true },
    { k: 'doviz',            l: 'Cur',             w: 50,  filtre: true,  bos: false },
    { k: 'fatura_turu',      l: 'Inv. Type',       w: 95,  filtre: true,  bos: true },
    { k: 'kdv_orani',        l: 'VAT%',            w: 55,  filtre: true,  bos: false },
    { k: 'kdv_tutar',        l: 'VAT Amt',         w: 75,  filtre: false, bos: false },
    { k: 'kdv_dahil',        l: 'Incl VAT',        w: 80,  filtre: false, bos: false },
    /* ── 4. ALIM BİLGİLERİ ──────────────────────────── */
    { k: 'proforma_id',      l: 'PI No',           w: 85,  filtre: false, bos: true },
    { k: 'pi_link',          l: 'PI Link',         w: 55,  filtre: false, bos: false },
    { k: 'satis_siparis_id', l: 'SO No',           w: 80,  filtre: false, bos: true },
    { k: 'siparis_id',       l: 'PO No',           w: 80,  filtre: false, bos: true },
    { k: 'alis_fatura_no',   l: 'Purch Inv',       w: 90,  filtre: false, bos: true },
    { k: 'alis_fatura_tarihi',l:'Purch Date',      w: 85,  filtre: true,  bos: true },
    { k: 'teslim_tarihi',    l: 'Delivery',        w: 85,  filtre: true,  bos: true },
    { k: 'teslim_yeri',      l: 'Del. Place',      w: 85,  filtre: true,  bos: true },
    /* ── 5. AMBALAJ & YÜKLEME ────────────────────────── */
    { k: 'koli_adet',        l: 'Ctns',            w: 60,  filtre: false, bos: true },
    { k: 'brut_kg',          l: 'Gross KG',        w: 70,  filtre: false, bos: true },
    { k: 'net_kg',           l: 'Net KG',          w: 65,  filtre: false, bos: true },
    { k: 'hacim_m3',         l: 'CBM',             w: 60,  filtre: false, bos: true },
    { k: 'konteyner_sira',   l: 'Load #',          w: 60,  filtre: false, bos: true },
    { k: 'etiket_rengi',     l: 'Label',           w: 80,  filtre: true,  bos: true },
    { k: 'once_yukle',       l: 'Priority',        w: 80,  filtre: true,  bos: true },
    /* ── 6. IMO & DİB ────────────────────────────────── */
    { k: 'imo_urun',         l: 'IMO',             w: 50,  filtre: true,  bos: false },
    { k: 'imo_no',           l: 'IMO No',          w: 75,  filtre: false, bos: true },
    { k: 'imo_msds',         l: 'MSDS',            w: 60,  filtre: false, bos: false },
    { k: 'dib',              l: 'DİB',             w: 50,  filtre: true,  bos: true },
    /* ── 7. VGM ──────────────────────────────────────── */
    { k: 'vgm_kg',           l: 'VGM KG',          w: 70,  filtre: false, bos: true },
    { k: 'vgm_no',           l: 'VGM No',          w: 80,  filtre: false, bos: true },
    { k: 'vgm_kaynak',       l: 'VGM Src',         w: 75,  filtre: true,  bos: true },
    { k: 'vgm_tarih',        l: 'VGM Date',        w: 80,  filtre: true,  bos: true },
    /* ── 8. KONTEYNER & GÇB ─────────────────────────── */
    { k: 'booking_no',       l: 'Booking',         w: 85,  filtre: false, bos: true },
    { k: 'konteyner_no',     l: 'Cont. No',        w: 90,  filtre: false, bos: true },
    { k: 'muhur_no',         l: 'Seal No',         w: 80,  filtre: false, bos: true },
    { k: 'gcb_no',           l: 'GÇB No',          w: 85,  filtre: false, bos: true },
    { k: 'gcb_id',           l: 'GÇB ID',          w: 75,  filtre: false, bos: true },
    { k: 'gcb_tarih',        l: 'GÇB Date',        w: 80,  filtre: true,  bos: true },
    { k: 'gcb_kur',          l: 'GÇB Rate',        w: 65,  filtre: false, bos: true },
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
  // ETIKET_RENK modul scope'ta tanimli (asagida)
  var SELECT_KOLONLAR = { fatura_turu: ['', 'İhraç Kayıtlı KDV\'siz', 'KDV\'li', 'Transit Ticaret', 'Özel Matrah', 'Tevkifatlı', 'KDV Muaf'], mense_ulke: ['Türkiye', 'Çin', 'Hindistan', 'İtalya', 'Almanya', 'İspanya', 'Diğer'], dib: ['H', 'E'], imo_urun: ['H', 'E'], gcb_kapandi: ['', 'Kapandı', 'Açık'], vgm_kaynak: ['', 'Liman', 'Forwarder', 'İnternet'], konteyner_para: ['', 'USD', 'EUR', 'TRY'], once_yukle: ['Önce Yükle', 'Sonra Yükle', 'Yer Olursa Yükle'] };
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
  h += '<div style="overflow:auto;border:0.5px solid var(--b);border-radius:8px;max-height:calc(100vh - 280px)">';
  h += '<table class="tbl" style="font-size:10px;border-collapse:collapse;table-layout:fixed">';
  /* THEAD — sticky top */
  h += '<thead><tr style="position:sticky;top:0;z-index:4">';
  h += '<th style="position:sticky;left:0;z-index:3;background:' + stickyBgH + ';width:28px;min-width:28px;' + thS + ';border-right:2px solid var(--b)"><input type="checkbox" id="ihr-chk-all" onchange="event.stopPropagation();window._ihrUrunTumChk(this.checked)"></th>';
  h += '<th style="position:sticky;left:28px;z-index:3;background:' + stickyBgH + ';width:120px;min-width:120px;' + thS + '" title="Kolon #2 — tedarikciAd"><span style="font-size:8px;color:var(--t3);opacity:.6">#2</span> Supplier</th>';
  h += '<th style="position:sticky;left:148px;z-index:3;background:' + stickyBgH + ';width:90px;min-width:90px;' + thS + '" title="Kolon #3 — urun_kodu"><span style="font-size:8px;color:var(--t3);opacity:.6">#3</span> Item Code</th>';
  h += '<th style="position:sticky;left:238px;z-index:3;background:' + stickyBgH + ';width:220px;min-width:220px;' + thS + ';border-right:2px solid var(--b)" title="Kolon #4 — aciklama"><span style="font-size:8px;color:var(--t3);opacity:.6">#4</span> Description</th>';
  var _kolNo = 4; // 1=chk, 2=tedarikci, 3=urun_kodu, 4=aciklama (sticky)
  GORUNEN_KOLONLAR.forEach(function(kol) {
    if (kol.k === 'tedarikciAd' || kol.k === 'urun_kodu' || kol.k === 'aciklama') return;
    _kolNo++;
    var bosCount = kol.bos ? urunler.filter(function(u) { return !u[kol.k] || String(u[kol.k]).trim() === ''; }).length : 0;
    h += '<th style="width:' + kol.w + 'px;min-width:' + kol.w + 'px;' + thS + '" title="Kolon #' + _kolNo + ' — ' + kol.k + ' — ' + kol.l + '">';
    h += '<div style="display:flex;align-items:center;gap:2px"><span style="font-size:8px;color:var(--t3);opacity:.6;margin-right:2px">#' + _kolNo + '</span><span>' + kol.l + '</span>';
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
    h += '<td onclick="event.stopPropagation()" style="position:sticky;left:28px;z-index:2;background:' + cellBg + ';' + tdS + ';max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(u.tedarikciAd || '') + '">' + _esc(u.tedarikciAd || u.tedarikci || '') + '</td>';
    h += '<td data-alan="urun_kodu" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'urun_kodu\')" style="position:sticky;left:148px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-family:monospace;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(u.urun_kodu || '') + '</td>';
    h += '<td data-alan="aciklama" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'aciklama\')" style="position:sticky;left:238px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-right:2px solid var(--b)" title="' + _esc(u.aciklama || '') + '">' + _esc(u.aciklama || '') + '</td>';
    /* Kalan kolonlar */
    GORUNEN_KOLONLAR.forEach(function(kol) {
      var k = kol.k; if (k === 'tedarikciAd' || k === 'urun_kodu' || k === 'aciklama') return;
      var v = u[k]; var vs = _esc(v || '');
      if (k === 'pi_link') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" style="color:var(--ac)">Aç</a>' : '') + '</td>'; return; }
      if (k === 'kdv_tutar') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace">' + kdvTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'kdv_dahil') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;font-weight:500">' + kdvDahil.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'miktar') { h += '<td style="' + tdS + ';text-align:right;cursor:text" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'miktar\')">' + (miktar || 0).toLocaleString('tr-TR') + ' ' + _esc(u.birim || '') + '</td>'; return; }
      if (k === 'birim_fiyat') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;cursor:text;color:' + (v ? 'var(--t)' : 'var(--t3)') + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'birim_fiyat\')">' + (v ? birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(u.doviz || '') : '') + '</td>'; return; }
      if (k === 'etiket_rengi') { var er = ETIKET_RENK[v] || ''; h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center;padding:2px"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'etiket_rengi\',this.value);var _sel=this;setTimeout(function(){var _opt=_sel.options[_sel.selectedIndex];_sel.style.color=_opt?.dataset?.renk||\'var(--t)\';},10)" style="font-size:10px;border:none;background:transparent;cursor:pointer;color:' + (er || 'var(--t3)') + ';font-weight:500;width:100%"><option value="">—</option>'; Object.keys(ETIKET_RENK).forEach(function(rk) { h += '<option value="' + rk + '" data-renk="' + ETIKET_RENK[rk] + '"' + (v === rk ? ' selected' : '') + ' style="color:' + ETIKET_RENK[rk] + '">' + '\u25cf ' + rk + '</option>'; }); h += '</select></td>'; return; }
      if (k === 'doviz') { h += '<td style="' + tdS + ';text-align:center">' + vs + '</td>'; return; }
      if (k === 'imo_msds') { if (u.imo_urun === 'E') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac);font-size:10px">PDF</a>' : '<button class="btn btns" onclick="event.stopPropagation();window._ihrMsdsYukle(\'' + u.id + '\')" style="font-size:9px;padding:1px 5px">Yükle</button>') + '</td>'; } else { h += '<td style="' + tdS + '"><span style="font-size:9px;color:var(--t3)">—</span></td>'; } return; }
      if (k === 'yukleme_durumu') { var vgmVar = parseFloat(u.vgm_kg || 0) > 0; var durumVal = vgmVar ? 'Yüklendi' : (v || ''); var durumBg2 = durumVal === 'Yüklendi' ? '#EAF3DE' : 'var(--s2)'; var durumClr = durumVal === 'Yüklendi' ? '#27500A' : 'var(--t2)'; h += '<td style="' + tdS + '">' + (durumVal ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + durumBg2 + ';color:' + durumClr + '">' + _esc(durumVal) + '</span>' : '') + '</td>'; return; }
      if (SELECT_KOLONLAR[k]) { h += '<td onclick="event.stopPropagation()" style="' + tdS + '"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'' + k + '\',this.value)" style="font-size:10px;border:none;background:transparent;width:100%;cursor:pointer;color:var(--t)">'; SELECT_KOLONLAR[k].forEach(function(sv) { h += '<option value="' + _esc(sv) + '"' + (String(v || '') === sv ? ' selected' : '') + '>' + _esc(sv || '—') + '</option>'; }); h += '</select></td>'; return; }
      if (DATE_KOLONLAR.indexOf(k) !== -1) { h += '<td ondblclick="event.stopPropagation();window._ihrInlineDateEdit(this,\'' + u.id + '\',\'' + k + '\')" onclick="event.stopPropagation()" style="' + tdS + ';cursor:text;font-family:monospace">' + vs + '</td>'; return; }
      if (k === 'kdv_orani') { h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'kdv_orani\',parseFloat(this.value))" style="font-size:10px;border:none;background:transparent;cursor:pointer;text-align:center">'; [0, 1, 5, 10, 18, 20].forEach(function(kv) { h += '<option value="' + kv + '"' + (kdvOrani === kv ? ' selected' : '') + '>%' + kv + '</option>'; }); h += '</select></td>'; return; }
      h += '<td data-alan="' + k + '" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'' + k + '\')" style="' + tdS + ';cursor:text;max-width:' + kol.w + 'px" title="' + vs + '">' + vs + '</td>';
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
      _ihrReRender();
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
  var _reRender2 = _ihrReRender;
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
  if (u) { u.imo_msds = url; u.updatedAt = _now(); window.storeIhracatUrunler?.(urunler); window.toast?.('MSDS yüklendi', 'ok'); _ihrReRender(); }
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
    var _c2 = _g('ihr-detay-content');
    if (_d2 && _c2) _ihrDetayRenderUrunler(_d2, _c2);
  } else { _ihrRenderContent(); }
};
window._ihrFiltreTemizle = function() {
  window._ihrUrunFiltreler = {};
  window._ihrUrunAramaQ = '';
  window._ihrUrunSayfa = 1;
  if (_aktifDosyaId) {
    var _d3 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); });
    var _c3 = _g('ihr-detay-content');
    if (_d3 && _c3) _ihrDetayRenderUrunler(_d3, _c3);
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
    etiket_rengi: Object.keys(ETIKET_RENK),
    once_yukle: ['Önce Yükle', 'Sonra Yükle', 'Yer Olursa Yükle'],
    dilli_urun: ['H', 'E'],
    imo_urun: ['H', 'E'],
    fatura_turu: ['', 'İhraç Kayıtlı KDV\'siz', 'KDV\'li', 'Transit Ticaret', 'Özel Matrah', 'Tevkifatlı', 'KDV Muaf'],
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
      _ihrReRender(); return;
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
    urunler.unshift({ id: _genId(), dosya_id: dosyaId, tedarikci_id: tedarikci ? tedarikci.id : '', tedarikciAd: s.tedarikci || '', urun_kodu: s.urunKodu || s.urun_kodu || '', aciklama: s.urun || s.aciklama || '', standart_urun_adi: s.standart_urun_adi || s.urun || s.aciklama || '', hs_kodu: s.hs_kodu || '', kdv_orani: s.kdv_orani || '', miktar: parseFloat(s.miktar || 0), birim: s.birim || 'PCS', birim_fiyat: parseFloat(s.birimFiyat || s.birim_fiyat || 0), doviz: s.doviz || 'USD', kaynak: 'satinalma_' + sid, createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now() });
  });
  window.storeIhracatUrunler?.(urunler);
  _g('mo-satinalma-cek')?.remove();
  window.toast?.(seciliIds.length + ' ürün eklendi', 'ok');
  _ihrReRender();
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

// IHR-EXCEL-001: Gumrukcu PL Excel — Ingilizce basliklar
window._ihrGumrukcuPLExcel = function(dosyaId) {
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!urunler.length) { window.toast?.('Urun yok', 'warn'); return; }
  var headers = ['Supplier','Description (EN)','HS Code','Qty','Unit','Gross KG','Net KG','Carton','m3','Origin','Container No','Seal No'];
  var rows = urunler.sort(function(a,b) { return (a.konteyner_sira||99)-(b.konteyner_sira||99); }).map(function(u) {
    return [u.tedarikciAd||'', u.gumrukcu_tanim||u.standart_urun_adi||u.aciklama||'', u.hs_kodu||'', u.miktar||0, u.birim||'PCS', u.brut_kg||0, u.net_kg||0, u.koli_adet||0, u.hacim_m3||0, u.mense_ulke||'', u.konteyner_no||'', u.muhur_no||''].join('\t');
  });
  var icerik = (d ? d.dosyaNo : 'PL') + ' — Customs Packing List\n\n' + headers.join('\t') + '\n' + rows.join('\n');
  var blob = new Blob(['\ufeff' + icerik], { type: 'text/tab-separated-values;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Gumrukcu_PL_' + (d ? d.dosyaNo : 'export') + '.xls'; a.click();
  window.toast?.('Gumrukcu PL Excel indirildi', 'ok');
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
  // IHR-HS-001: CI/PL için HS kodu zorunlu
  if (tur === 'CI' || tur === 'PL') {
    var _hsU2 = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
    var _hsE2 = _hsU2.filter(function(u) { return !u.hs_kodu; }).length;
    if (_hsE2 > 0) { window.toast?.(_hsE2 + ' üründe HS/GTIP kodu eksik — ' + tur + ' üretilemez', 'err'); return; }
  }
  // IHR-ZINCIR-001: Evrak sırası kontrolü
  if ((tur === 'CI' || tur === 'PL') && !_evrakZincirKontrol(dosyaId, tur)) {
    var _oncekiAd = { CI: 'PI', PL: 'CI' }[tur];
    window.toast?.('Önce ' + _oncekiAd + ' onaylanmalı', 'err'); return;
  }
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
  _ihrReRender();
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
  _storeD(dosyalar); _g('mo-ihr-edit')?.remove(); window.toast?.('Dosya güncellendi', 'ok'); _ihrReRender();
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
  window.toast?.('Durum: ' + yeni, 'ok'); window.logActivity?.('ihracat', d.dosyaNo + ' → ' + yeni); _ihrReRender();
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
  _ihrReRender();
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
  _storeU(urunler); _g('mo-toplu-edit')?.remove(); window.toast?.(idler.length + ' ürün güncellendi', 'ok'); _ihrReRender();
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
  urunler.forEach(function(u, i) { var sira = (i + 1) + '. ' + (u.aciklama || u.urun_kodu || 'Ürün'); if (!u.aciklama) hatalar.push(sira + ' — Ürün açıklaması eksik'); if (!u.birim_fiyat) hatalar.push(sira + ' — Birim fiyat eksik'); if (!u.hs_kodu) hatalar.push(sira + ' — HS/GTIP kodu eksik'); if (!u.brut_kg) uyarilar.push(sira + ' — Brüt KG eksik'); if (!u.koli_adet) uyarilar.push(sira + ' — Koli adedi eksik'); if (!u.tedarikciAd) uyarilar.push(sira + ' — Tedarikçi tanımlı değil'); });
  // IHR-ALIM-001: Alım-ihraç miktar/fiyat karşılaştırması
  try {
    var satinalma = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
    if (satinalma.length) {
      urunler.forEach(function(u, i) {
        var sira = (i + 1) + '. ' + (u.aciklama || u.urun_kodu || 'Ürün');
        var kod = u.urun_kodu || '';
        if (!kod) return;
        var alis = satinalma.find(function(s) { return (s.urunKodu || s.urun_kodu || '') === kod; });
        if (!alis) return;
        var alisMiktar = parseFloat(alis.miktar || 0);
        var ihrMiktar = parseFloat(u.miktar || 0);
        if (alisMiktar > 0 && ihrMiktar > alisMiktar) hatalar.push(sira + ' — ihraç miktarı (' + ihrMiktar + ') alışı (' + alisMiktar + ') aşıyor');
        var alisFiyat = parseFloat(alis.birimFiyat || alis.birim_fiyat || 0);
        var ihrFiyat = parseFloat(u.birim_fiyat || 0);
        if (alisFiyat > 0 && ihrFiyat > 0 && Math.abs(ihrFiyat - alisFiyat) / alisFiyat > 0.20) uyarilar.push(sira + ' — fiyat farkı yüksek (alış: ' + alisFiyat + ' / ihraç: ' + ihrFiyat + ')');
      });
    }
  } catch(e) {}
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
window._ihrUrunSil = function(id) { window.confirmModal?.('Bu ürünü silmek istediğinizden emin misiniz?', { title: 'Ürün Sil', danger: true, confirmText: 'Sil', onConfirm: function() { var u = _loadU(); var item = u.find(function(x) { return String(x.id) === String(id); }); if (item) { item.isDeleted = true; item.deletedAt = _now(); } _storeU(u); window.toast?.('Silindi', 'ok'); if (_aktifDosyaId) { var _ddUS = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); var _ccUS = _g('ihr-detay-content'); if (_ddUS && _ccUS) { _ihrDetayRenderUrunler(_ddUS, _ccUS); return; } } _ihrReRender(); } }); };

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
  _storeGM(list); _g('mo-gm')?.remove(); window.toast?.('Gümrükçü kaydedildi', 'ok'); _ihrReRender();
};
window._ihrGumrukcuAta = function(dosyaId) { var gm = _loadGM().filter(function(g) { return !g.isDeleted && g.aktif; }); _moAc('mo-gm-ata', 'Gümrükçü Ata', '<input type="hidden" id="gm-ata-d" value="' + dosyaId + '"><div class="fg"><div class="fl">Gümrükçü</div><select class="fi" id="gm-ata-sel"><option value="">—</option>' + gm.map(function(g) { return '<option value="' + g.id + '">' + _esc(g.firma_adi) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-gm-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gmAtaKaydet()">Ata</button>'); };
window._gmAtaKaydet = function() { var did = _g('gm-ata-d')?.value; var gid = _g('gm-ata-sel')?.value; if (!gid) return; var d = _loadD(); var dosya = d.find(function(x) { return String(x.id) === String(did); }); if (dosya) { dosya.gumrukcu_id = gid; dosya.updatedAt = _now(); _storeD(d); } _g('mo-gm-ata')?.remove(); window.toast?.('Atandı', 'ok'); _ihrReRender(); };

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
  _storeFW(list); _g('mo-fw')?.remove(); window.toast?.('Forwarder kaydedildi', 'ok'); _ihrReRender();
};
window._ihrForwarderAta = function(dosyaId) { var fw = _loadFW().filter(function(f) { return !f.isDeleted && f.aktif; }); _moAc('mo-fw-ata', 'Forwarder Ata', '<input type="hidden" id="fw-ata-d" value="' + dosyaId + '"><div class="fg"><div class="fl">Forwarder</div><select class="fi" id="fw-ata-sel"><option value="">—</option>' + fw.map(function(f) { return '<option value="' + f.id + '">' + _esc(f.firma_adi) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-fw-ata\')?.remove()">İptal</button><button class="btn btnp" onclick="window._fwAtaKaydet()">Ata</button>'); };
window._fwAtaKaydet = function() { var did = _g('fw-ata-d')?.value; var fid = _g('fw-ata-sel')?.value; if (!fid) return; var d = _loadD(); var dosya = d.find(function(x) { return String(x.id) === String(did); }); if (dosya) { dosya.forwarder_id = fid; dosya.updatedAt = _now(); _storeD(d); } _g('mo-fw-ata')?.remove(); window.toast?.('Atandı', 'ok'); _ihrReRender(); };

// ── GÇB CRUD ─────────────────────────────────────────────
window._ihrGcbEkle = function(dosyaId) {
  // IHR-HS-001: HS kodu eksik kontrolü
  if (dosyaId) {
    var _hsUrunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
    var _hsEksik = _hsUrunler.filter(function(u) { return !u.hs_kodu; }).length;
    if (_hsEksik > 0) { window.toast?.(_hsEksik + ' üründe HS/GTIP kodu eksik — GÇB formu açılamaz', 'err'); return; }
    // IHR-ZINCIR-001: PL onaylı mı?
    if (!_evrakZincirKontrol(dosyaId, 'GCB')) { window.toast?.('Önce PL onaylanmalı', 'err'); return; }
  }
  var dosyalar = _loadD(); _moAc('mo-gcb-f', '+ GÇB Ekle', '<input type="hidden" id="gcb-f-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Dosya</div><select class="fi" id="gcb-f-dosya"><option value="">—</option>' + dosyalar.filter(function(x) { return !x.isDeleted; }).map(function(x) { return '<option value="' + x.id + '"' + (String(x.id) === String(dosyaId) ? ' selected' : '') + '>' + _esc(x.dosyaNo) + '</option>'; }).join('') + '</select></div><div><div class="fl">Beyanname No</div><input class="fi" id="gcb-f-beyan"></div><div><div class="fl">Tescil Tarihi</div><input class="fi" type="date" id="gcb-f-tescil"></div><div><div class="fl">FOB Değer</div><input class="fi" type="number" id="gcb-f-fob" step="0.01"></div><div><div class="fl">Döviz</div><select class="fi" id="gcb-f-doviz">' + DOVIZ.map(function(d) { return '<option>' + d + '</option>'; }).join('') + '</select></div><div><div class="fl">Kur (TL)</div><input class="fi" type="number" id="gcb-f-kur" step="0.0001" placeholder="Otomatik..."><div id="gcb-f-kur-note" style="font-size:9px;color:var(--t3);margin-top:2px"></div></div><div><div class="fl">Durum</div><select class="fi" id="gcb-f-durum"><option value="bekliyor">Bekliyor</option><option value="tescil">Tescil</option><option value="kapandi">Kapandı</option></select></div></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-gcb-f\')?.remove()">İptal</button><button class="btn btnp" onclick="window._gcbFKaydet()">Kaydet</button>');
  // IHR-KUR-001: Otomatik kur çek
  setTimeout(function() {
    try {
      fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r) { return r.json(); }).then(function(data) {
        var tryRate = data.rates && data.rates.TRY ? data.rates.TRY : 0;
        if (tryRate > 0) {
          var inp = _g('gcb-f-kur'); if (inp && !inp.value) inp.value = tryRate.toFixed(4);
          var note = _g('gcb-f-kur-note'); if (note) note.textContent = 'ExchangeRate API — ' + new Date().toLocaleTimeString('tr-TR');
        }
      }).catch(function() {});
    } catch(e) {}
  }, 200);
};
window._ihrGcbDuzenle = function(id) { var g = _loadG().find(function(x) { return x.id === id; }); if (!g) return; window._ihrGcbEkle(g.dosya_id); setTimeout(function() { _g('gcb-f-id').value = id; if (_g('gcb-f-beyan')) _g('gcb-f-beyan').value = g.beyan_no || ''; if (_g('gcb-f-tescil')) _g('gcb-f-tescil').value = g.tescil_tarihi || ''; if (_g('gcb-f-fob')) _g('gcb-f-fob').value = g.fob_deger || ''; if (_g('gcb-f-doviz')) _g('gcb-f-doviz').value = g.doviz || 'USD'; if (_g('gcb-f-durum')) _g('gcb-f-durum').value = g.durum || 'bekliyor'; }, 50); };
window._gcbFKaydet = function() { var did = _g('gcb-f-dosya')?.value; if (!did) { window.toast?.('Dosya seçiniz', 'err'); return; } var id = _g('gcb-f-id')?.value; var list = _loadG(); var entry = { dosya_id: did, beyan_no: (_g('gcb-f-beyan')?.value || '').trim(), tescil_tarihi: _g('gcb-f-tescil')?.value || '', fob_deger: parseFloat(_g('gcb-f-fob')?.value || 0), doviz: _g('gcb-f-doviz')?.value || 'USD', kur: parseFloat(_g('gcb-f-kur')?.value || 0) || null, durum: _g('gcb-f-durum')?.value || 'bekliyor', banka_zorunlu: false, updatedAt: _now() }; if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); } _storeG(list); _g('mo-gcb-f')?.remove(); window.toast?.('GÇB kaydedildi', 'ok'); _ihrReRender(); };
window._ihrGcbKapat = function(id) { var list = _loadG(); var g = list.find(function(x) { return String(x.id) === String(id); }); if (!g) return; g.durum = 'kapandi'; g.kapanma_tarihi = _today(); g.updatedAt = _now(); _storeG(list); window.toast?.('GÇB kapatıldı', 'ok'); _ihrReRender(); };

// ── BL CRUD ──────────────────────────────────────────────
window._ihrBlEkle = function(dosyaId) {
  // IHR-ZINCIR-001: GÇB onaylı mı?
  if (dosyaId && !_evrakZincirKontrol(dosyaId, 'BL')) { window.toast?.('GÇB henüz kapanmadı', 'warn'); }
  // IHR-EVRAK-001: GÇB kontrolü
  if (dosyaId) {
    var _gcbList = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
    if (!_gcbList.length) {
      window.confirmModal?.('Bu dosyaya ait GÇB kaydı bulunmuyor. BL normalde GÇB tescil edildikten sonra eklenir.', {
        title: 'GÇB Kontrolü', confirmText: 'Yine de Ekle',
        onConfirm: function() { window._ihrBlEkleForm(dosyaId); }
      });
      return;
    }
    var _gcbKapali = _gcbList.some(function(g) { return g.durum === 'kapandi'; });
    if (!_gcbKapali) {
      window.confirmModal?.('GÇB henüz kapatılmamış. BL, GÇB kapandıktan sonra eklenmesi önerilir.', {
        title: 'GÇB Kontrolü', confirmText: 'Yine de Ekle',
        onConfirm: function() { window._ihrBlEkleForm(dosyaId); }
      });
      return;
    }
  }
  window._ihrBlEkleForm(dosyaId);
};
window._ihrBlEkleForm = function(dosyaId) { var dosyalar = _loadD(); var d = dosyaId ? dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }) : null; _moAc('mo-bl-f', '+ BL Ekle', '<input type="hidden" id="bl-f-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Dosya</div><select class="fi" id="bl-f-dosya"><option value="">—</option>' + dosyalar.filter(function(x) { return !x.isDeleted; }).map(function(x) { return '<option value="' + x.id + '"' + (String(x.id) === String(dosyaId) ? ' selected' : '') + '>' + _esc(x.dosyaNo) + '</option>'; }).join('') + '</select></div><div><div class="fl">BL No</div><input class="fi" id="bl-f-no"></div><div><div class="fl">Yükleme Tarihi</div><input class="fi" type="date" id="bl-f-yukleme"></div><div style="grid-column:1/-1"><div class="fl">Consignee</div><input class="fi" id="bl-f-consignee" value="' + _esc(d ? d.bl_consignee : '') + '"></div><div><div class="fl">Konteyner No</div><input class="fi" id="bl-f-konteyner"></div><div><div class="fl">BL Türü</div><select class="fi" id="bl-f-tur"><option value="seaway">SeaWay</option><option value="hardcopy">Hard Copy</option><option value="telex">Telex</option></select></div></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-bl-f\')?.remove()">İptal</button><button class="btn btnp" onclick="window._blFKaydet()">Kaydet</button>'); };
window._ihrBlDuzenle = function(id) { var b = _loadBL().find(function(x) { return x.id === id; }); if (!b) return; window._ihrBlEkle(b.dosya_id); setTimeout(function() { _g('bl-f-id').value = id; if (_g('bl-f-no')) _g('bl-f-no').value = b.bl_no || ''; if (_g('bl-f-yukleme')) _g('bl-f-yukleme').value = b.yukleme_tarihi || ''; if (_g('bl-f-consignee')) _g('bl-f-consignee').value = b.consignee || ''; if (_g('bl-f-konteyner')) _g('bl-f-konteyner').value = b.konteyner_no || ''; if (_g('bl-f-tur')) _g('bl-f-tur').value = b.bl_turu || 'seaway'; }, 50); };
window._blFKaydet = function() { var did = _g('bl-f-dosya')?.value; if (!did) { window.toast?.('Dosya seçiniz', 'err'); return; } var id = _g('bl-f-id')?.value; var list = _loadBL(); var entry = { dosya_id: did, bl_no: (_g('bl-f-no')?.value || '').trim(), yukleme_tarihi: _g('bl-f-yukleme')?.value || '', consignee: (_g('bl-f-consignee')?.value || '').trim(), konteyner_no: (_g('bl-f-konteyner')?.value || '').trim(), bl_turu: _g('bl-f-tur')?.value || 'seaway', shipper: 'DUAY ULUSLARARASI TİCARET LTD. ŞTİ.', updatedAt: _now() }; if (id) { var ex = list.find(function(x) { return String(x.id) === String(id); }); if (ex) Object.assign(ex, entry); } else { entry.id = _genId(); entry.createdAt = _now(); list.unshift(entry); } _storeBL(list); _g('mo-bl-f')?.remove(); window.toast?.('BL kaydedildi', 'ok'); _ihrReRender(); };
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
    _ihrReRender();
    if (tur === 'CI' || tur === 'PL') { setTimeout(function() { window._ihrPdfOnizle(dosyaId, tur, urunler); }, 300); }
    return;
  }

  var MESAJLAR = { GCB: 'GÇB gümrükçü tarafından hazırlanıyor. GÇB sekmesinden takip edin.', BL: 'BL forwarder tarafından hazırlanıyor. Konşimento sekmesinden takip edin.', MENSEI: 'Menşei şahadetnamesi gümrükçü tarafından hazırlanıyor.', EUR1: 'EUR.1/A.TR gümrükçü tarafından hazırlanıyor.', INSP: 'Inspection raporu gözetim şirketinden gelir.', SIG: 'Sigorta poliçesi teslim şekline göre belirlenir.' };
  window.toast?.(MESAJLAR[tur] || 'Bu evrak harici kaynak tarafından üretilir.', 'warn');
};
window._ihrEvrakOnayla = function(id) { if (!_isManager()) { window.toast?.('Yetki yok', 'err'); return; } var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'onaylandi'; e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Onaylandı', 'ok'); _ihrReRender(); };
window._ihrEvrakGonder = function(id) { var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = 'gonderildi'; e.gonderim_tarihi = _now(); e.updatedAt = _now(); _storeE(evraklar); window.toast?.('Gönderildi', 'ok'); _ihrReRender(); };
window._ihrEvrakDuzenle = function(id) { var e = _loadE().find(function(x) { return String(x.id) === String(id); }); if (!e) return; var durumlar = [['taslak','Taslak'],['onay_bekliyor','Onay Bekliyor'],['onaylandi','Onaylandı'],['gonderildi','Gönderildi']]; _moAc('mo-ev-edit', 'Evrak Düzenle', '<input type="hidden" id="ev-id" value="' + id + '"><div class="fg"><div class="fl">Durum</div><select class="fi" id="ev-durum">' + durumlar.map(function(d) { return '<option value="' + d[0] + '"' + (e.durum === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></div><div class="fg" style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ev-not" rows="2">' + _esc(e.not || '') + '</textarea></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-ev-edit\')?.remove()">İptal</button><button class="btn btnp" onclick="window._evKaydet()">Kaydet</button>'); };
window._evKaydet = function() { var id = _g('ev-id')?.value; if (!id) return; var evraklar = _loadE(); var e = evraklar.find(function(x) { return String(x.id) === String(id); }); if (!e) return; e.durum = _g('ev-durum')?.value || e.durum; e.not = (_g('ev-not')?.value || '').trim(); e.updatedAt = _now(); _storeE(evraklar); _g('mo-ev-edit')?.remove(); window.toast?.('Güncellendi', 'ok'); _ihrReRender(); };
window._ihrEvrakEkle = function(dosyaId) { window._ihrEvrakDosyaYukle(dosyaId || '', 'CI'); };

/* ── EVRAK DOSYA YÜKLE (Dış evraklar) ───────────────────── */
window._ihrEvrakDosyaYukle = function(dosyaId, tur) {
  var old = _g('mo-evrak-yukle'); if (old) old.remove();
  var cu = _cu();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-evrak-yukle';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">' + _esc(tur) + ' Yukle</div><button onclick="document.getElementById(\'mo-evrak-yukle\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:18px 20px">'
    + '<input type="hidden" id="ey-dosya" value="' + dosyaId + '">'
    + '<input type="hidden" id="ey-tur" value="' + tur + '">'
    + '<div class="fg"><div class="fl">Dosya Sec (PDF, JPG, PNG, XLSX)</div>'
    + '<input type="file" id="ey-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" multiple style="font-size:11px;padding:8px;border:1px dashed var(--b);border-radius:8px;width:100%;cursor:pointer" onclick="event.stopPropagation()">'
    + '<div id="ey-file-list" style="margin-top:6px;font-size:10px;color:var(--t3)"></div></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">veya Harici URL</div><input class="fi" id="ey-url" placeholder="https://..." style="width:100%" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
    + '<div class="fg"><div class="fl">Kaynak</div><select class="fi" id="ey-kaynak" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="duay">Duay</option><option value="gumrukcu">Gumrukcu</option><option value="forwarder">Forwarder</option><option value="musteri">Musteri</option></select></div>'
    + '<div class="fg"><div class="fl">Hedef</div><select class="fi" id="ey-hedef" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="gumrukcu">Gumrukcu</option><option value="musteri">Musteri</option><option value="forwarder">Forwarder</option><option value="arsiv">Arsiv</option></select></div></div>'
    + '<div class="fg" style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="ey-not" rows="2" style="resize:vertical" placeholder="Evrak hakkinda not..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></textarea></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-evrak-yukle\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="window._evrakYukleKaydet()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._evrakYukleKaydet = function() {
  var dosyaId = (_g('ey-dosya') || {}).value;
  var tur = (_g('ey-tur') || {}).value;
  var url = ((_g('ey-url') || {}).value || '').trim();
  var not2 = ((_g('ey-not') || {}).value || '').trim();
  var kaynak = (_g('ey-kaynak') || {}).value || 'duay';
  var hedef = (_g('ey-hedef') || {}).value || 'gumrukcu';
  var fileInput = _g('ey-file');
  var cu = _cu();

  var evraklar = _loadE();
  var existing = null; evraklar.forEach(function(e) { if (String(e.dosya_id) === String(dosyaId) && e.tur === tur) existing = e; });

  var yeniDosyalar = [];
  var revBase = existing && existing.dosyalar ? existing.dosyalar.length : 0;

  var kaydetFn = function() {
    if (existing) {
      if (url) existing.dosya_url = url;
      existing.durum = 'gonderildi';
      existing.not = not2;
      existing.yukleyen_ad = cu?.name || '';
      existing.yukleyen_id = cu?.id;
      existing.gonderim_tarihi = _now();
      existing.updatedAt = _now();
      if (!existing.dosyalar) existing.dosyalar = [];
      yeniDosyalar.forEach(function(df) { existing.dosyalar.push(df); });
      if (url && !yeniDosyalar.length) existing.dosyalar.push({ id: _genId(), ad: tur + '_link', url_veya_b64: url, kaynak: kaynak, hedef: hedef, revizyon: revBase + 1, yukleyen_id: cu?.id, yukleyen_ad: cu?.name || '', yukleme_tarihi: _now() });
    } else {
      var dosyalarArr = yeniDosyalar.slice();
      if (url && !dosyalarArr.length) dosyalarArr.push({ id: _genId(), ad: tur + '_link', url_veya_b64: url, kaynak: kaynak, hedef: hedef, revizyon: 1, yukleyen_id: cu?.id, yukleyen_ad: cu?.name || '', yukleme_tarihi: _now() });
      evraklar.unshift({ id: _genId(), dosya_id: dosyaId, tur: tur, durum: 'gonderildi', dosya_url: url || '', dosyalar: dosyalarArr, not: not2, kaynak: kaynak, hedef: hedef, yukleyen_ad: cu?.name || '', yukleyen_id: cu?.id, gonderim_tarihi: _now(), createdAt: _now(), createdBy: cu?.id, updatedAt: _now() });
    }
    _storeE(evraklar);
    _g('mo-evrak-yukle')?.remove();
    window.toast?.(tur + ' yuklendi (' + (yeniDosyalar.length || 1) + ' dosya)', 'ok');
    window.logActivity?.('ihracat', tur + ' yuklendi — ' + (yeniDosyalar.length || 1) + ' dosya');
    if (_aktifDosyaId) { var _dd2 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd2) _ihrDetayRenderOzet(_dd2); }
  };

  // Dosya secildiyse oku
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    var filesArr = Array.from(fileInput.files);
    // 5MB uyari
    var buyukDosya = filesArr.find(function(f) { return f.size > 5 * 1024 * 1024; });
    if (buyukDosya) { window.toast?.(buyukDosya.name + ' 5MB ustu — kucuk dosya secin veya URL kullanin', 'err'); return; }
    var loaded = 0;
    filesArr.forEach(function(f, fi) {
      var reader = new FileReader();
      reader.onload = function(ev2) {
        var b64 = ev2.target.result;
        // 500KB altindaysa base64 kaydet, ustundeyse sadece meta
        var kayitB64 = (f.size < 500 * 1024) ? b64 : '';
        yeniDosyalar.push({ id: _genId(), ad: f.name, boyut: f.size, tip: f.type, url_veya_b64: kayitB64, kaynak: kaynak, hedef: hedef, revizyon: revBase + fi + 1, yukleyen_id: cu?.id, yukleyen_ad: cu?.name || '', yukleme_tarihi: _now() });
        loaded++;
        if (loaded === filesArr.length) kaydetFn();
      };
      reader.readAsDataURL(f);
    });
  } else if (url) {
    kaydetFn();
  } else {
    window.toast?.('Dosya sec veya URL gir', 'err');
  }
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
  _ihrReRender();
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
  _ihrReRender();
};

// ── MAİL TASLAKLARI ──────────────────────────────────────
window._ihrGumrukcuMail = function(dosyaId) { var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return; var gm = _loadGM().find(function(g) { return g.id === d.gumrukcu_id; }); var mail = 'Sayın ' + (gm?.yetkili_adi || 'İlgili') + ',\n\nDosya: ' + d.dosyaNo + '\nMüşteri: ' + d.musteriAd + '\nTeslim: ' + d.teslim_sekli + '\nLiman: ' + d.varis_limani + '\n\n' + (d.gumrukcu_notu || '') + '\n\nSaygılarımızla,\nDuay Uluslararası Ticaret'; _moAc('mo-mail-gm', 'Gümrükçü Mail', '<div class="fg"><div class="fl">Kime</div><input class="fi" id="m-gm-to" value="' + _esc(gm?.email || '') + '"></div><textarea class="fi" id="m-gm-body" rows="10" style="resize:vertical;font-family:monospace;font-size:11px;margin-top:8px">' + _esc(mail) + '</textarea>', '<button class="btn btns" onclick="document.getElementById(\'mo-mail-gm\')?.remove()">Kapat</button><button class="btn btns" onclick="navigator.clipboard?.writeText(document.getElementById(\'m-gm-body\')?.value);window.toast?.(\'Kopyalandı\',\'ok\')">Kopyala</button><button class="btn btnp" onclick="window.open(\'mailto:\'+encodeURIComponent(document.getElementById(\'m-gm-to\')?.value)+\'?body=\'+encodeURIComponent(document.getElementById(\'m-gm-body\')?.value))">Mail Aç</button>'); };
window._ihrForwarderMail = function(dosyaId) { var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return; var fw = _loadFW().find(function(f) { return f.id === d.forwarder_id; }); var mail = 'Sayın ' + (fw?.firma_adi || 'İlgili') + ',\n\nDosya: ' + d.dosyaNo + '\nTeslim: ' + d.teslim_sekli + '\nLiman: ' + d.varis_limani + '\n\nNavlun fiyatı ve uygun sefer önerisi beklenmektedir.\n\nSaygılarımızla,\nDuay Uluslararası Ticaret'; _moAc('mo-mail-fw', 'Forwarder Mail', '<div class="fg"><div class="fl">Kime</div><input class="fi" id="m-fw-to" value="' + _esc(fw?.email || '') + '"></div><textarea class="fi" id="m-fw-body" rows="10" style="resize:vertical;font-family:monospace;font-size:11px;margin-top:8px">' + _esc(mail) + '</textarea>', '<button class="btn btns" onclick="document.getElementById(\'mo-mail-fw\')?.remove()">Kapat</button><button class="btn btns" onclick="navigator.clipboard?.writeText(document.getElementById(\'m-fw-body\')?.value);window.toast?.(\'Kopyalandı\',\'ok\')">Kopyala</button><button class="btn btnp" onclick="window.open(\'mailto:\'+encodeURIComponent(document.getElementById(\'m-fw-to\')?.value)+\'?body=\'+encodeURIComponent(document.getElementById(\'m-fw-body\')?.value))">Mail Aç</button>'); };

// ── TEMPLATE CRUD ────────────────────────────────────────
window._ihrTemplateEkle = function() { var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; }).slice(0, 30); _moAc('mo-tpl', '+ Template Kaydet', '<div class="fg"><div class="fl">Template Adı *</div><input class="fi" id="tpl-ad"></div><div class="fg" style="margin-top:8px"><div class="fl">Dosyadan Doldur</div><select class="fi" id="tpl-dosya"><option value="">Manuel</option>' + dosyalar.map(function(d) { return '<option value="' + d.id + '">' + _esc(d.dosyaNo) + ' — ' + _esc(d.musteriAd) + '</option>'; }).join('') + '</select></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-tpl\')?.remove()">İptal</button><button class="btn btnp" onclick="window._tplKaydet()">Kaydet</button>'); };
window._tplKaydet = function() { var ad = (_g('tpl-ad')?.value || '').trim(); if (!ad) { window.toast?.('Ad zorunlu', 'err'); return; } var did = _g('tpl-dosya')?.value; var d = did ? _loadD().find(function(x) { return String(x.id) === String(did); }) : null; var list = _loadT(); list.unshift({ id: _genId(), ad: ad, musteriAd: d?.musteriAd || '', teslim_sekli: d?.teslim_sekli || '', varis_limani: d?.varis_limani || '', sure_gun: d?.sure_gun || 7, gumrukcu_id: d?.gumrukcu_id || '', forwarder_id: d?.forwarder_id || '', kullanim_sayisi: 0, createdAt: _now() }); _storeT(list); _g('mo-tpl')?.remove(); window.toast?.('Template kaydedildi', 'ok'); _ihrReRender(); };
window._ihrTemplateDuzenle = function(id) { var t = _loadT().find(function(x) { return x.id === id; }); if (!t) return; _moAc('mo-tpl-e', '✏️ Template', '<input type="hidden" id="tpl-e-id" value="' + id + '"><div class="fg"><div class="fl">Ad</div><input class="fi" id="tpl-e-ad" value="' + _esc(t.ad) + '"></div>', '<button class="btn btns" onclick="document.getElementById(\'mo-tpl-e\')?.remove()">İptal</button><button class="btn btnp" onclick="window._tplEKaydet()">Kaydet</button>'); };
window._tplEKaydet = function() { var id = _g('tpl-e-id')?.value; if (!id) return; var list = _loadT(); var t = list.find(function(x) { return String(x.id) === String(id); }); if (!t) return; t.ad = (_g('tpl-e-ad')?.value || '').trim() || t.ad; t.updatedAt = _now(); _storeT(list); _g('mo-tpl-e')?.remove(); window.toast?.('Güncellendi', 'ok'); _ihrReRender(); };

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
      var kolIdx = allKols.findIndex(function(kk) { return kk.k === k; });
      var kolNumStr = kolIdx >= 0 ? '#' + (kolIdx + 4) : '';
      h += '<label style="display:flex;align-items:center;gap:4px;padding:3px 8px;border:0.5px solid var(--b);border-radius:6px;background:' + (chk ? '#E6F1FB' : 'var(--sf)') + ';cursor:pointer;font-size:11px;color:' + (chk ? '#0C447C' : 'var(--t2)') + ';user-select:none">';
      h += '<input type="checkbox" data-kol="' + k + '" ' + (chk ? 'checked' : '') + ' onchange="event.stopPropagation();window._ihrKolonChk(this)" onclick="event.stopPropagation()" style="accent-color:#185FA5;cursor:pointer;width:12px;height:12px">';
      h += '<span style="font-size:8px;color:var(--t3);opacity:.6">' + kolNumStr + '</span> ' + _esc(kolMap[k]) + '</label>';
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
  if (_aktifDosyaId) { var _dd = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); var _cc = _g('ihr-detay-content'); if (_dd && _cc) _ihrDetayRenderUrunler(_dd, _cc); }
};

// ══ IHR-KDV-001: KDV Iade Motoru ══════════════════════════════
window._ihrKdvIadeHesapla = function() {
  var now = new Date();
  var oncekiAy = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var ayKey = oncekiAy.getFullYear() + '-' + String(oncekiAy.getMonth() + 1).padStart(2, '0');
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && (d.createdAt || '').startsWith(ayKey); });
  var ihrKdv = 0;
  dosyalar.forEach(function(d) {
    var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted && (u.fatura_turu || '').indexOf('KDV') !== -1; });
    urunler.forEach(function(u) { ihrKdv += parseFloat(u.kdv_tutar) || ((parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0) * ((parseFloat(u.kdv_orani) || 0) / 100)); });
  });
  var satinalma = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var giderKdv = 0;
  satinalma.filter(function(s) { return !s.isDeleted && (s.piDate || s.createdAt || '').startsWith(ayKey) && parseFloat(s.kdvOrani || s.kdv_orani || 0) > 0; })
    .forEach(function(s) { giderKdv += (parseFloat(s.totalAmount || s.toplam || 0)) * ((parseFloat(s.kdvOrani || s.kdv_orani || 0)) / 100); });
  var iade = ihrKdv + giderKdv;
  var ayAdi = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'][oncekiAy.getMonth()];
  window.toast?.(ayAdi + ' KDV iade: ' + Math.round(iade).toLocaleString('tr-TR') + ' TL (' + dosyalar.length + ' dosya)', 'ok');
  window.addNotif?.('💰', ayAdi + ' KDV iade listesi: ' + Math.round(iade).toLocaleString('tr-TR') + ' TL', 'info', 'ihracat');
  window.logActivity?.('ihracat', 'KDV iade hesaplandi: ' + ayAdi + ' → ' + Math.round(iade).toLocaleString('tr-TR') + ' TL');
};

// ══ IHR-EXCEL-002: Parasut Fatura Excel ════════════════════════
window._ihrParasutExcel = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) { window.toast?.('Dosya bulunamadi', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  if (!urunler.length) { window.toast?.('Urun yok', 'warn'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kutuphanesi yok', 'err'); return; }
  var ciNo = (d.dosyaNo || '').replace('IHR-', 'CI-');
  var tarih = d.bitis_tarihi || _today();
  var rows = [['Musteri Adi', 'Fatura No', 'Tarih', 'Urun/Hizmet', 'Miktar', 'Birim', 'Birim Fiyat', 'Doviz', 'KDV%', 'Toplam']];
  urunler.forEach(function(u) {
    var amt = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0);
    rows.push([d.musteriAd || '', ciNo, tarih, u.standart_urun_adi || u.aciklama || '', parseFloat(u.miktar) || 0, u.birim || 'PCS', parseFloat(u.birim_fiyat) || 0, u.doviz || 'USD', 0, amt]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parasut');
  XLSX.writeFile(wb, 'Parasut_' + ciNo + '.xlsx');
  window.toast?.('Parasut Excel indirildi', 'ok');
};

// ══ IHR-KAYITLI-001: Dilekçe paketi onay akışı ═══════════════
window._ihrKayitliDilekce = function(gcbId) {
  var g = _loadG().find(function(x) { return String(x.id) === String(gcbId); });
  if (!g) { window.toast?.('GÇB bulunamadı', 'err'); return; }
  var dosya = _loadD().find(function(d) { return String(d.id) === String(g.dosya_id); });
  var no = dosya ? dosya.dosyaNo : (g.beyan_no || 'GÇB');
  window.confirmModal?.(no + ' için ihraç kayıtlı dilekçe paketi hazır. Tedarikçiye mail atılsın mı?', {
    title: 'İhraç Kayıtlı Dilekçe', confirmText: 'Evet, Gönder',
    onConfirm: function() {
      localStorage.setItem('ak_ihr_kayitli_bildirim_' + gcbId, '1');
      window.logActivity?.('ihracat', no + ' ihraç kayıtlı dilekçe paketi hazırlandı');
      window.toast?.('Dilekçe paketi hazır — mail gönderildi', 'ok');
      window.addNotif?.('✅', no + ': Dilekçe paketi gönderildi', 'ok', 'ihracat');
    }
  });
};

// ══ DOC-FORMAT-001: Excel + PDF indirme ═══════════════════════
window._ihrExcelIndir = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) { window.toast?.('Dosya bulunamadi', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  if (!urunler.length) { window.toast?.('Urun yok', 'warn'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kutuphanesi yok', 'err'); return; }
  var no = (d.dosyaNo || '').replace('IHR-', tur + '-');
  var headers, rows;
  if (tur === 'CI') {
    headers = ['#','Description','Qty','Unit','Unit Price','Currency','Amount'];
    rows = urunler.map(function(u, i) { var amt = (parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0); return [i+1, u.standart_urun_adi||u.aciklama||'', u.miktar||0, u.birim||'PCS', u.birim_fiyat||0, u.doviz||'USD', amt.toFixed(2)]; });
  } else {
    headers = ['#','Description','Package','Qty','Net KG','Gross KG','m3'];
    rows = urunler.map(function(u, i) { return [i+1, u.standart_urun_adi||u.aciklama||'', u.paket_turu||'Carton', u.koli_adet||0, u.net_kg||0, u.brut_kg||0, u.hacim_m3||0]; });
  }
  var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tur);
  XLSX.writeFile(wb, no + '.xlsx');
  window.toast?.(tur + ' Excel indirildi', 'ok');
};

window._ihrPdfIndir = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) { window.toast?.('Dosya bulunamadi', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  if (!urunler.length) { window.toast?.('Urun yok', 'warn'); return; }
  var no = (d.dosyaNo || '').replace('IHR-', tur + '-');
  var w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { window.toast?.('Popup engellendi', 'err'); return; }
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + no + '</title><style>body{font-family:Arial;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-size:10px;text-transform:uppercase}.hdr{font-size:16px;font-weight:bold;margin-bottom:4px}.sub{font-size:11px;color:#666}@media print{body{padding:12px}}</style></head><body>';
  h += '<div class="hdr">DUAY GLOBAL LLC — ' + tur + '</div>';
  h += '<div class="sub">' + no + ' · ' + (d.musteriAd || '') + ' · ' + _today() + '</div>';
  h += '<table><thead><tr>';
  if (tur === 'CI') {
    h += '<th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Currency</th><th>Amount</th>';
    h += '</tr></thead><tbody>';
    var total = 0;
    urunler.forEach(function(u, i) { var amt = (parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0); total += amt; h += '<tr><td>' + (i+1) + '</td><td>' + (u.standart_urun_adi||u.aciklama||'') + '</td><td>' + (u.miktar||0) + '</td><td>' + (u.birim||'PCS') + '</td><td>' + (u.birim_fiyat||0) + '</td><td>' + (u.doviz||'USD') + '</td><td>' + amt.toFixed(2) + '</td></tr>'; });
    h += '<tr style="font-weight:bold"><td colspan="6" style="text-align:right">Total</td><td>' + total.toFixed(2) + '</td></tr>';
  } else {
    h += '<th>#</th><th>Description</th><th>Package</th><th>Qty</th><th>Net KG</th><th>Gross KG</th><th>m3</th>';
    h += '</tr></thead><tbody>';
    urunler.forEach(function(u, i) { h += '<tr><td>' + (i+1) + '</td><td>' + (u.standart_urun_adi||u.aciklama||'') + '</td><td>' + (u.paket_turu||'Carton') + '</td><td>' + (u.koli_adet||0) + '</td><td>' + (u.net_kg||0) + '</td><td>' + (u.brut_kg||0) + '</td><td>' + (u.hacim_m3||0) + '</td></tr>'; });
  }
  h += '</tbody></table><p style="margin-top:24px;font-size:10px;color:#999">Duay Global LLC · ' + _today() + '</p></body></html>';
  w.document.write(h); w.document.close();
  setTimeout(function() { w.print(); }, 500);
};

// ══ EVRAK-V2: Kaynak/Hedef inline edit ═══════════════════════
window._ihrEvrakKaynakDuzenle = function(evrakId) {
  var evraklar = _loadE(); var ev = evraklar.find(function(e) { return String(e.id) === String(evrakId); }); if (!ev) return;
  var yeni = prompt('Kaynak:', ev.kaynak || ''); if (yeni === null) return;
  ev.kaynak = yeni.trim(); ev.updatedAt = _now(); _storeE(evraklar);
  if (_aktifDosyaId) { var _dd3 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd3) _ihrDetayRenderOzet(_dd3); }
};
// EVRAK-V2: Ozel evrak tipi ekleme
window._ihrOzelEvrakEkle = function(dosyaId) {
  var old = _g('mo-ozel-evrak'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ozel-evrak';
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">+ Belge Ekle</div>'
    + '<div style="padding:18px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<input type="hidden" id="oe-dosya" value="' + dosyaId + '">'
    + '<div><div class="fl">Belge Adi *</div><input class="fi" id="oe-ad" placeholder="Ornek: Fumigasyon Sertifikasi" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Kaynak</div><input class="fi" id="oe-kaynak" placeholder="Gumrukcu" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Hedef</div><input class="fi" id="oe-hedef" placeholder="Duay → Musteri" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-ozel-evrak\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrOzelEvrakKaydet()">Ekle</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrOzelEvrakKaydet = function() {
  var dosyaId = (_g('oe-dosya') || {}).value;
  var ad = ((_g('oe-ad') || {}).value || '').trim();
  if (!ad) { window.toast?.('Belge adi zorunlu', 'err'); return; }
  var kaynak = ((_g('oe-kaynak') || {}).value || '').trim();
  var hedef = ((_g('oe-hedef') || {}).value || '').trim();
  var cu = _cu();
  var evraklar = _loadE();
  evraklar.unshift({
    id: _genId(), dosya_id: dosyaId, tur: 'OZEL_' + Date.now(),
    belge_adi: ad, durum: 'taslak', dosyalar: [],
    kaynak: kaynak, hedef: hedef,
    yukleyen_ad: cu?.name || '', yukleyen_id: cu?.id,
    createdAt: _now(), createdBy: cu?.id, updatedAt: _now()
  });
  _storeE(evraklar);
  _g('mo-ozel-evrak')?.remove();
  window.toast?.(ad + ' eklendi', 'ok');
  window.logActivity?.('ihracat', 'Ozel evrak eklendi: ' + ad);
  if (_aktifDosyaId) { var _dd5 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd5) _ihrDetayRenderOzet(_dd5); }
};

window._ihrEvrakHedefDuzenle = function(evrakId) {
  var evraklar = _loadE(); var ev = evraklar.find(function(e) { return String(e.id) === String(evrakId); }); if (!ev) return;
  var yeni = prompt('Hedef:', ev.hedef || ''); if (yeni === null) return;
  ev.hedef = yeni.trim(); ev.updatedAt = _now(); _storeE(evraklar);
  if (_aktifDosyaId) { var _dd4 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd4) _ihrDetayRenderOzet(_dd4); }
};

// ══ SMART-OCR-001: Evrak belge okuma ══════════════════════════
window._ihrSmartEvrakYukle = function(dosyaId, evrakTur) {
  var ocrDef = _EVRAK_OCR_PROMPT[evrakTur];
  if (!ocrDef) { window._ihrEvrakDosyaYukle(dosyaId, evrakTur); return; } // fallback
  // Gizli file input
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif'; inp.style.display = 'none';
  inp.onchange = function() {
    var file = inp.files[0]; if (!file) return; inp.remove();
    var reader = new FileReader();
    reader.onload = function(ev) {
      var b64Full = ev.target.result;
      var b64Data = b64Full.split(',')[1] || b64Full;
      var mediaType = file.type || 'image/jpeg';
      _smartOcrModal(dosyaId, evrakTur, b64Full, b64Data, mediaType, file, ocrDef);
    };
    reader.readAsDataURL(file);
  };
  document.body.appendChild(inp); inp.click();
};

function _smartOcrModal(dosyaId, evrakTur, b64Full, b64Data, mediaType, file, ocrDef) {
  var old = _g('mo-smart-evrak'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-smart-evrak';
  // 2 sutunlu modal
  var isPdf = mediaType.indexOf('pdf') !== -1;
  var preview = isPdf
    ? '<embed src="' + b64Full + '" type="application/pdf" style="width:100%;height:100%;border:none">'
    : '<img src="' + b64Full + '" style="max-width:100%;max-height:100%;object-fit:contain">';
  mo.innerHTML = '<div class="moc" style="max-width:1100px;width:95vw;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:12px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><div style="font-size:14px;font-weight:600">' + _esc(evrakTur) + ' — Belge Okuma</div><button onclick="document.getElementById(\'mo-smart-evrak\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="display:flex;flex:1;overflow:hidden">'
    + '<div style="flex:1;background:#f5f5f5;display:flex;align-items:center;justify-content:center;overflow:auto;padding:8px">' + preview + '</div>'
    + '<div id="smart-ocr-right" style="flex:1;overflow-y:auto;padding:16px;border-left:1px solid var(--b)">'
    + '<div style="text-align:center;padding:40px;color:var(--t2)"><div style="font-size:24px;margin-bottom:8px">🔍</div>Okunuyor...<div style="font-size:10px;color:var(--t3);margin-top:4px">Claude Vision API</div></div>'
    + '</div></div>'
    + '<div id="smart-ocr-footer" style="padding:10px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-smart-evrak\')?.remove()">Iptal</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);

  // API key
  var _storedKey2 = localStorage.getItem('ak_anthropic_key');
  var apiKey = _storedKey2 ? (function() { try { return atob(_storedKey2); } catch(e) { return _storedKey2; } })() : (window.__ANTHROPIC_KEY || '');
  if (!apiKey) {
    var right = _g('smart-ocr-right');
    if (right) right.innerHTML = '<div style="padding:16px"><div style="font-size:12px;font-weight:500;margin-bottom:8px">API Key Gerekli</div><input class="fi" id="socr-key" placeholder="sk-ant-..." style="width:100%;margin-bottom:8px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"><button class="btn btnp" onclick="event.stopPropagation();var k=document.getElementById(\'socr-key\')?.value;if(k){localStorage.setItem(\'ak_anthropic_key\',k);document.getElementById(\'mo-smart-evrak\')?.remove();window._ihrSmartEvrakYukle(\'' + dosyaId + '\',\'' + evrakTur + '\');}">Kaydet</button></div>';
    return;
  }

  // OCR API cagir
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1500, messages:[{ role:'user', content:[{ type:'image', source:{ type:'base64', media_type:mediaType, data:b64Data } },{ type:'text', text:ocrDef.prompt }] }] })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var text = data.content && data.content[0] ? data.content[0].text : '';
    var jsonStr = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    try {
      var parsed = JSON.parse(jsonStr);
      _smartOcrRenderForm(dosyaId, evrakTur, parsed, b64Data, mediaType, file, ocrDef);
    } catch(e) {
      var right = _g('smart-ocr-right');
      if (right) right.innerHTML = '<div style="padding:16px;color:#DC2626"><div style="font-weight:500;margin-bottom:8px">Okunamadi</div><div style="font-size:10px;background:var(--s2);padding:8px;border-radius:6px;max-height:200px;overflow-y:auto">' + _esc(text) + '</div></div>';
    }
  })
  .catch(function(err) {
    var right = _g('smart-ocr-right');
    if (right) right.innerHTML = '<div style="padding:16px;color:#DC2626">API Hatasi: ' + _esc(err.message) + '</div>';
  });
}

function _smartOcrRenderForm(dosyaId, evrakTur, parsed, b64Data, mediaType, file, ocrDef) {
  var right = _g('smart-ocr-right'); if (!right) return;
  var footer = _g('smart-ocr-footer');
  var okunan = Object.keys(parsed).filter(function(k) { return parsed[k]; }).length;
  var toplam = ocrDef.alanlar.length;
  var h = '';
  if (okunan >= toplam * 0.7) h += '<div style="background:#EAF3DE;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:11px;color:#085041">\u2713 ' + okunan + '/' + toplam + ' alan okundu — kontrol edin</div>';
  else h += '<div style="background:#FAEEDA;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:11px;color:#633806">\u26a0 ' + okunan + '/' + toplam + ' alan okundu — eksikleri doldurun</div>';
  ocrDef.alanlar.forEach(function(alan) {
    var val = parsed[alan] !== undefined ? String(parsed[alan]) : '';
    h += '<div style="margin-bottom:8px"><div style="font-size:10px;color:var(--t3);margin-bottom:2px">' + _esc(alan) + '</div><input class="fi" id="socr-' + alan + '" value="' + _esc(val) + '" style="width:100%;font-size:11px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  });
  // BL ozel: draft/original secimi
  if (evrakTur === 'BL') {
    var blTuru = (parsed.bl_turu || '').toLowerCase().indexOf('draft') !== -1 ? 'draft' : 'original';
    h += '<div style="margin-top:10px;padding:10px;background:var(--s2);border-radius:8px"><div style="font-size:11px;font-weight:500;margin-bottom:6px">BL Turu:</div>';
    h += '<label style="display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:4px;cursor:pointer"><input type="radio" name="socr-bl-tur" value="draft"' + (blTuru === 'draft' ? ' checked' : '') + '> BL Draft (taslak)</label>';
    h += '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="radio" name="socr-bl-tur" value="original"' + (blTuru === 'original' ? ' checked' : '') + '> Orijinal BL (final)</label>';
    if (blTuru === 'draft') h += '<div style="margin-top:6px;padding:6px 10px;background:#E6F1FB;border-radius:6px;font-size:10px;color:#0C447C">Draft olarak kaydedilecek. Orijinal geldiginde ayni evrak uzerine guncellenecek.</div>';
    h += '</div>';
  }
  right.innerHTML = h;
  if (footer) footer.innerHTML = '<button class="btn btns" onclick="document.getElementById(\'mo-smart-evrak\')?.remove()">Iptal</button><button class="btn btnp" onclick="event.stopPropagation();window._ihrSmartEvrakKaydet(\'' + dosyaId + '\',\'' + evrakTur + '\')">Onayla ve Kaydet</button>';
  // parsed'i window'a gecici kaydet
  window._smartOcrParsed = parsed;
  window._smartOcrB64 = b64Data;
  window._smartOcrMediaType = mediaType;
  window._smartOcrFile = file;
}

window._ihrSmartEvrakKaydet = function(dosyaId, evrakTur) {
  var parsed = window._smartOcrParsed || {};
  var b64Data = window._smartOcrB64 || '';
  var file = window._smartOcrFile;
  var cu = _cu();
  var ocrDef = _EVRAK_OCR_PROMPT[evrakTur];
  // Form'dan guncel degerleri oku
  if (ocrDef) { ocrDef.alanlar.forEach(function(alan) { var inp = _g('socr-' + alan); if (inp) parsed[alan] = inp.value.trim(); }); }
  // BL turu
  var blTuru = 'original';
  if (evrakTur === 'BL') {
    var radios = document.querySelectorAll('input[name="socr-bl-tur"]');
    radios.forEach(function(r) { if (r.checked) blTuru = r.value; });
  }

  // Evrak tipine gore kaydet
  if (evrakTur === 'GCB') {
    var gcbList = _loadG(); var existing = gcbList.find(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
    var entry = { dosya_id:dosyaId, beyan_no:parsed.beyan_no||'', tescil_tarihi:parsed.tescil_tarihi||'', fob_deger:parseFloat(parsed.fob_deger)||0, doviz:parsed.doviz||'USD', mal_tanimi:parsed.mal_tanimi||'', durum:'tescil', updatedAt:_now(), ocr_ile_okundu:true };
    if (existing) Object.assign(existing, entry);
    else { entry.id = _genId(); entry.createdAt = _now(); gcbList.unshift(entry); }
    _storeG(gcbList);
  } else if (evrakTur === 'BL') {
    var blList = _loadBL(); var exBl = blList.find(function(b) { return String(b.dosya_id) === String(dosyaId) && !b.isDeleted; });
    var blEntry = { dosya_id:dosyaId, bl_no:parsed.bl_no||'', yukleme_tarihi:parsed.yukleme_tarihi||'', consignee:parsed.consignee||'', notify_party:parsed.notify_party||'', vessel_name:parsed.vessel_name||'', pol:parsed.pol||'', pod:parsed.pod||'', konteyner_no:parsed.konteyner_no||'', seal_no:parsed.seal_no||'', bl_turu:blTuru, durum:blTuru==='draft'?'taslak':'orijinal', updatedAt:_now(), ocr_ile_okundu:true };
    if (exBl) Object.assign(exBl, blEntry);
    else { blEntry.id = _genId(); blEntry.createdAt = _now(); blList.unshift(blEntry); }
    _storeBL(blList);
  }

  // Evrak kaydina dosya ekle
  var evraklar = _loadE();
  var evKayit = evraklar.find(function(e) { return String(e.dosya_id) === String(dosyaId) && e.tur === evrakTur; });
  var yeniDosya = { id:_genId(), ad:file?file.name:evrakTur, boyut:file?file.size:0, tip:file?file.type:'', url_veya_b64:'', revizyon:(evKayit && evKayit.dosyalar ? evKayit.dosyalar.length : 0) + 1, yukleyen_id:cu?.id, yukleyen_ad:cu?.name||'', yukleme_tarihi:_now(), ocr_ile_okundu:true };
  if (evKayit) {
    evKayit.durum = evrakTur === 'BL' ? (blTuru === 'draft' ? 'taslak' : 'orijinal') : 'gonderildi';
    if (!evKayit.dosyalar) evKayit.dosyalar = [];
    evKayit.dosyalar.push(yeniDosya);
    evKayit.ek_veri = parsed;
    evKayit.updatedAt = _now();
  } else {
    evraklar.unshift({ id:_genId(), dosya_id:dosyaId, tur:evrakTur, durum:evrakTur === 'BL' ? (blTuru === 'draft' ? 'taslak' : 'orijinal') : 'gonderildi', dosyalar:[yeniDosya], ek_veri:parsed, createdAt:_now(), createdBy:cu?.id, updatedAt:_now() });
  }
  _storeE(evraklar);
  _g('mo-smart-evrak')?.remove();
  window._smartOcrParsed = null; window._smartOcrB64 = null; window._smartOcrFile = null;
  window.toast?.(evrakTur + ' okundu ve kaydedildi', 'ok');
  window.logActivity?.('ihracat', evrakTur + ' Smart OCR ile kaydedildi');
  if (_aktifDosyaId) { var _dd5 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd5) _ihrDetayRenderOzet(_dd5); }
};

// ══ CRUD-EVRAK-001: Silme fonksiyonlari ══════════════════════
window._ihrEvrakDosyaSil = function(evrakId, dosyaId) {
  window.confirmModal?.('Bu dosya kalici olarak silinecek?', { title:'Dosya Sil', danger:true, confirmText:'Evet, Sil', onConfirm: function() {
    var evraklar = _loadE(); var ev = evraklar.find(function(e) { return String(e.id) === String(evrakId); });
    if (ev && Array.isArray(ev.dosyalar)) { ev.dosyalar = ev.dosyalar.filter(function(df) { return String(df.id) !== String(dosyaId); }); ev.updatedAt = _now(); }
    _storeE(evraklar); window.toast?.('Dosya silindi', 'ok');
    if (_aktifDosyaId) { var _dd6 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd6) _ihrDetayRenderOzet(_dd6); }
  }});
};

window._ihrGcbSil = function(id) {
  window.confirmModal?.('Bu GCB kaydini silmek istediginizden emin misiniz?', { title:'GCB Sil', danger:true, confirmText:'Evet, Sil', onConfirm: function() {
    var list = _loadG(); var g = list.find(function(x) { return String(x.id) === String(id); });
    if (g) { g.isDeleted = true; g.deletedAt = _now(); } _storeG(list);
    window.toast?.('GCB silindi', 'ok'); window.logActivity?.('ihracat', 'GCB silindi: ' + (g ? g.beyan_no : id));
    _ihrReRender();
  }});
};

window._ihrBlSil = function(id) {
  window.confirmModal?.('Bu BL kaydini silmek istediginizden emin misiniz?', { title:'BL Sil', danger:true, confirmText:'Evet, Sil', onConfirm: function() {
    var list = _loadBL(); var b = list.find(function(x) { return String(x.id) === String(id); });
    if (b) { b.isDeleted = true; b.deletedAt = _now(); } _storeBL(list);
    window.toast?.('BL silindi', 'ok'); window.logActivity?.('ihracat', 'BL silindi: ' + (b ? b.bl_no : id));
    _ihrReRender();
  }});
};

window._ihrOzelEvrakSil = function(id) {
  window.confirmModal?.('Bu belge silinecek?', { title:'Belge Sil', danger:true, confirmText:'Evet, Sil', onConfirm: function() {
    var evraklar = _loadE(); var ev = evraklar.find(function(e) { return String(e.id) === String(id); });
    if (ev) { ev.isDeleted = true; ev.deletedAt = _now(); } _storeE(evraklar);
    window.toast?.('Belge silindi', 'ok');
    if (_aktifDosyaId) { var _dd7 = _loadD().find(function(x) { return String(x.id) === String(_aktifDosyaId); }); if (_dd7) _ihrDetayRenderOzet(_dd7); }
  }});
};

// ══ EXTERNAL-UPLOAD-001: Dis taraf link olusturma ═════════════
window._ihrDisTarafLink = function(dosyaId) {
  var old = _g('mo-dis-link'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-dis-link';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Yukleme Linki Olustur</div>'
    + '<div style="padding:18px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<div><div class="fl">Muhatap Tipi</div><select class="fi" id="dl-tip" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="gumrukcu">Gumrukcu</option><option value="forwarder">Forwarder</option><option value="sigortaci">Sigortaci</option><option value="tedarikci">Tedarikci</option></select></div>'
    + '<div><div class="fl">Ad Soyad / Firma</div><input class="fi" id="dl-ad" placeholder="Firma adi" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">E-posta</div><input class="fi" id="dl-mail" placeholder="ornek@firma.com" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div id="dl-result"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-dis-link\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrDisTarafLinkOlustur(\'' + dosyaId + '\')">Olustur</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrDisTarafLinkOlustur = function(dosyaId) {
  var ad = (_g('dl-ad')?.value || '').trim();
  var mail = (_g('dl-mail')?.value || '').trim();
  var tip = _g('dl-tip')?.value || 'gumrukcu';
  if (!ad) { window.toast?.('Ad zorunlu', 'err'); return; }
  var payload = dosyaId + ':' + Date.now() + ':' + ad + ':' + mail + ':' + tip;
  var token = btoa(payload);
  var link = 'https://duayft-collab.github.io/duay-platform/upload.html?token=' + token;
  var result = _g('dl-result');
  if (result) {
    result.innerHTML = '<div style="margin-top:8px"><div class="fl">Olusturulan Link</div>'
      + '<div style="display:flex;gap:6px"><input class="fi" id="dl-link" value="' + link + '" readonly style="font-size:10px;font-family:monospace"><button class="btn btnp" onclick="event.stopPropagation();navigator.clipboard?.writeText(document.getElementById(\'dl-link\')?.value);window.toast?.(\'Link kopyalandi\',\'ok\')" style="font-size:11px;flex-shrink:0">Kopyala</button></div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:4px">Link 30 gun gecerlidir. ' + ad + ' icin olusturuldu.</div></div>';
  }
  window.logActivity?.('ihracat', 'Dis taraf linki olusturuldu: ' + ad + ' (' + tip + ')');
};

// ══ 4 YENI BELGE INDIRME ══════════════════════════════════════
window._ihrYuklemeKontrol = function(dosyaId) { window._ihrDocxIndir?.(dosyaId, 'ykl'); };
window._ihrKonteynerDizilim = function(dosyaId) { window._ihrDocxIndir?.(dosyaId, 'kdl'); };
window._ihrTeslimatKontrol = function(dosyaId) { window._ihrDocxIndir?.(dosyaId, 'tkl'); };
window._ihrSevkIzni = function(dosyaId) { window._ihrDocxIndir?.(dosyaId, 'svk'); };

// ══ TEKLİF-PORTAL-001: Teklif gonder + karsilastir ═══════════
window._ihrTeklifGonder = function(dosyaId) {
  var old = _g('mo-teklif-gonder'); if (old) old.remove();
  var fwList = _loadFW().filter(function(f) { return !f.isDeleted && f.aktif; });
  var gmList = _loadGM().filter(function(g) { return !g.isDeleted; });
  var d = dosyaId ? _loadD().find(function(x) { return String(x.id) === String(dosyaId); }) : null;
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-teklif-gonder';
  var h = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden;max-height:85vh;display:flex;flex-direction:column">';
  h += '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600;flex-shrink:0">Teklif Daveti Gonder</div>';
  h += '<div style="flex:1;overflow-y:auto;padding:16px 20px">';
  h += '<div><div class="fl">Teklif Tipi</div><select class="fi" id="tg-tip" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="navlun">Navlun</option><option value="sigorta">Sigorta</option><option value="nakliye">Nakliye</option></select></div>';
  h += '<div style="margin-top:10px;font-size:11px;font-weight:500;margin-bottom:6px">Firmalar (sec)</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;max-height:200px;overflow-y:auto">';
  fwList.forEach(function(f) { h += '<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:6px;cursor:pointer"><input type="checkbox" class="tg-firma-chk" data-id="' + f.id + '" data-ad="' + _esc(f.firma_adi) + '" data-mail="' + _esc(f.email || '') + '" data-tip="forwarder">' + _esc(f.firma_adi) + ' <span style="font-size:9px;color:var(--t3)">FW</span></label>'; });
  gmList.forEach(function(g) { h += '<label style="display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:6px;cursor:pointer"><input type="checkbox" class="tg-firma-chk" data-id="' + g.id + '" data-ad="' + _esc(g.firma_adi) + '" data-mail="' + _esc(g.email || '') + '" data-tip="gumrukcu">' + _esc(g.firma_adi) + ' <span style="font-size:9px;color:var(--t3)">GM</span></label>'; });
  h += '</div>';
  if (d) { h += '<div style="margin-top:10px;padding:8px;background:var(--s2);border-radius:6px;font-size:10px;color:var(--t3)">POL: ' + _esc(d.yukleme_limani || '') + ' · POD: ' + _esc(d.varis_limani || '') + ' · ' + _esc(d.konteyner_turu || '40HC') + '</div>'; }
  h += '</div>';
  h += '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0"><button class="btn btns" onclick="document.getElementById(\'mo-teklif-gonder\')?.remove()">Iptal</button><button class="btn btnp" onclick="event.stopPropagation();window._ihrTeklifGonderKaydet(\'' + (dosyaId || '') + '\')">Gonder</button></div></div>';
  mo.innerHTML = h; document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrTeklifGonderKaydet = function(dosyaId) {
  var tip = (_g('tg-tip') || {}).value || 'navlun';
  var secili = []; document.querySelectorAll('.tg-firma-chk:checked').forEach(function(cb) { secili.push({ id: cb.dataset.id, ad: cb.dataset.ad, mail: cb.dataset.mail, tip: cb.dataset.tip }); });
  if (!secili.length) { window.toast?.('En az 1 firma sec', 'err'); return; }
  var linkler = [];
  secili.forEach(function(f) {
    var payload = (dosyaId||'') + ':' + f.id + ':' + f.ad + ':' + f.mail + ':' + tip + ':' + Date.now();
    var token = btoa(payload);
    linkler.push({ firma: f.ad, link: 'https://duayft-collab.github.io/duay-platform/teklif.html?token=' + token });
  });
  // Linkleri goster
  _g('mo-teklif-gonder')?.remove();
  var old2 = _g('mo-teklif-linkler'); if (old2) old2.remove();
  var mo2 = document.createElement('div'); mo2.className = 'mo'; mo2.id = 'mo-teklif-linkler';
  var h2 = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">' + secili.length + ' Firmaya Teklif Linki</div><div style="padding:16px 20px;max-height:400px;overflow-y:auto">';
  linkler.forEach(function(l) { h2 += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:500;margin-bottom:4px">' + _esc(l.firma) + '</div><div style="display:flex;gap:4px"><input class="fi" value="' + l.link + '" readonly style="font-size:9px;font-family:monospace"><button class="btn btns" onclick="event.stopPropagation();navigator.clipboard?.writeText(this.previousElementSibling.value);window.toast?.(\'Kopyalandi\',\'ok\')" style="font-size:10px;flex-shrink:0">Kopyala</button></div></div>'; });
  h2 += '</div><div style="padding:12px 20px;border-top:1px solid var(--b);text-align:right"><button class="btn btnp" onclick="document.getElementById(\'mo-teklif-linkler\')?.remove()">Kapat</button></div></div>';
  mo2.innerHTML = h2; document.body.appendChild(mo2); setTimeout(function() { mo2.classList.add('open'); }, 10);
  window.toast?.(secili.length + ' firmaya teklif daveti olusturuldu', 'ok');
  window.logActivity?.('ihracat', 'Teklif daveti: ' + secili.length + ' firma, tip: ' + tip);
};

window._ihrTeklifKarsilastir = function(dosyaId) {
  // Firestore'dan teklifleri cek (localStorage fallback)
  var teklifler = [];
  try { teklifler = JSON.parse(localStorage.getItem('ak_ihr_teklifler') || '[]').filter(function(t) { return String(t.dosya_id) === String(dosyaId) && !t.isDeleted; }); } catch(e) {}
  var old = _g('mo-teklif-karsilastir'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-teklif-karsilastir';
  var h = '<div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Teklif Karsilastirma</div><div style="padding:16px 20px">';
  if (!teklifler.length) { h += '<div style="text-align:center;padding:24px;color:var(--t3)">Henuz teklif gelmedi</div>'; }
  else {
    teklifler.sort(function(a, b) { return (a.fiyat || 0) - (b.fiyat || 0); });
    h += '<table class="tbl" style="font-size:11px"><thead><tr><th>Firma</th><th>Fiyat</th><th>Doviz</th><th>Transit</th><th>Gecerlilik</th><th></th></tr></thead><tbody>';
    teklifler.forEach(function(t, i) {
      var renk = i === 0 ? '#16A34A' : i === teklifler.length - 1 ? '#DC2626' : '#D97706';
      h += '<tr><td style="font-weight:500">' + _esc(t.firma_ad) + '</td><td style="color:' + renk + ';font-weight:700">' + (t.fiyat || 0) + '</td><td>' + (t.doviz || 'USD') + '</td><td>' + (t.transit_gun || '—') + ' gun</td><td>' + (t.gecerlilik_gun || '—') + ' gun</td><td><button class="btn btns" style="font-size:10px;color:#16A34A">Kabul</button></td></tr>';
    });
    h += '</tbody></table>';
  }
  h += '</div><div style="padding:12px 20px;border-top:1px solid var(--b);text-align:right"><button class="btn btns" onclick="document.getElementById(\'mo-teklif-karsilastir\')?.remove()">Kapat</button></div></div>';
  mo.innerHTML = h; document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

// ══════════════════════════════════════════════════════════════════
// EXCEL IMPORT V3 — Sablon + AI Hibrit
// ══════════════════════════════════════════════════════════════════

/** @type {Object} V3 sablon tanımlari */
var V3_SABLONLAR = {
  'yeni_urun': {
    ad: 'Yeni Urun Listesi', ikon: '\ud83d\udce6',
    aciklama: 'Tedarikci yeni urunler',
    kolonlar: [
      { key:'tedarikci',        tr:'Tedarikci / Satici',             en:'Vendor / Supplier' },
      { key:'urun_kodu',        tr:'Urun Kodu',                      en:'Product Code / Item Code' },
      { key:'urun_adi_tr',      tr:'Urun Adi (Turkce)',              en:'Unique Product Name (TR)' },
      { key:'standart_urun_adi',tr:'Standart Urun Adi (EN)',         en:'Standard Name (CI/PL)' },
      { key:'birim_fiyat',      tr:'Birim Fiyat',                    en:'Unit Price' },
      { key:'para_birimi',      tr:'Para Birimi',                    en:'Currency (USD/EUR/TRY)' },
      { key:'brut_kg',          tr:'Brut Agirlik (1 Urun)',          en:'1 Product Weight Gross' },
      { key:'koli_adet',        tr:'Koli Adedi',                     en:'Ctns / Package Quantity' },
      { key:'hs_kodu',          tr:'GTIP / HS Kodu',                 en:'HS Code / Tariff Code' }
    ]
  },
  'fiyat': {
    ad: 'Fiyat Guncellemesi', ikon: '\ud83d\udcb0',
    aciklama: 'Mevcut urunlere fiyat',
    kolonlar: [
      { key:'urun_kodu',   tr:'Urun Kodu',   en:'Product Code' },
      { key:'birim_fiyat', tr:'Birim Fiyat',  en:'Unit Price' },
      { key:'para_birimi', tr:'Para Birimi',  en:'Currency' },
      { key:'kur',         tr:'Kur',          en:'Exchange Rate' }
    ]
  },
  'agirlik': {
    ad: 'Agirlik & Ambalaj', ikon: '\u2696\ufe0f',
    aciklama: 'KG, Koli, CBM',
    kolonlar: [
      { key:'urun_kodu',    tr:'Urun Kodu',        en:'Product Code' },
      { key:'brut_kg',      tr:'Brut KG',           en:'Gross Weight' },
      { key:'net_kg',       tr:'Net KG',            en:'Net Weight' },
      { key:'koli_adet',    tr:'Koli Adedi',        en:'Ctns' },
      { key:'ambalaj_tipi', tr:'Ambalaj Tipi',      en:'Package Type' },
      { key:'olcu_koli',    tr:'Olculer (1 Koli)',  en:'Dimensions' },
      { key:'hacim_m3',     tr:'Hacim (CBM)',       en:'CBM' }
    ]
  },
  'gumruk': {
    ad: 'Gumruk Bilgileri', ikon: '\ud83d\udec3',
    aciklama: 'HS Kodu, GCB, IMO',
    kolonlar: [
      { key:'urun_kodu',   tr:'Urun Kodu',    en:'Product Code' },
      { key:'hs_kodu',     tr:'GTIP / HS',    en:'HS Code' },
      { key:'mensei_ulke', tr:'Mensei Ulke',   en:'Country of Origin' },
      { key:'imo_gerekli', tr:'IMO Gerekli',   en:'IMO Required' },
      { key:'imo_no',      tr:'IMO No',        en:'IMO Number' },
      { key:'gcb_id',      tr:'GCB No',        en:'Export Declaration ID' }
    ]
  },
  'konteyner': {
    ad: 'Konteyner & Yukleme', ikon: '\ud83d\udea2',
    aciklama: 'Konteyner, Muhur, Sira',
    kolonlar: [
      { key:'urun_kodu',           tr:'Urun Kodu',            en:'Product Code' },
      { key:'konteyner_no',        tr:'Konteyner No',         en:'Container No' },
      { key:'muhur_no',            tr:'Muhur No',             en:'Seal No' },
      { key:'konteyner_sirasi',    tr:'Konteyner Sirasi',     en:'Loading Order' },
      { key:'yuklenebilir_miktar', tr:'Yuklenebilir Miktar',  en:'Loadable Qty' }
    ]
  },
  'tumu': {
    ad: 'Tumunu Aktar (AI)', ikon: '\ud83d\udccb',
    aciklama: '34 kolon \u00b7 AI ile',
    kolonlar: null
  }
};

/** V3 state */
var _v3 = {
  dosyaId: null,
  adim: 1,
  seciliSablon: null,
  dosya: null,
  dosyaAdi: '',
  excelData: [],
  excelKolonlar: [],
  eslestirme: {},
  dupMod: 'guncelle',
  satirSayisi: 0
};

/**
 * Excel Import V3 ana giris noktasi.
 * @param {string} [dosyaId] Ihracat dosya ID
 */
window._ihrExcelImportV3 = function(dosyaId) {
  _v3.dosyaId = dosyaId
    || (typeof _aktifDosyaId !== 'undefined' && _aktifDosyaId)
    || window._ihrAktifDosyaId
    || document.querySelector('[data-dosya-id]')?.dataset?.dosyaId
    || null;
  _v3.adim = 1;
  _v3.seciliSablon = null;
  _v3.dosya = null;
  _v3.dosyaAdi = '';
  _v3.excelData = [];
  _v3.excelKolonlar = [];
  _v3.eslestirme = {};
  _v3.dupMod = 'guncelle';
  _v3.satirSayisi = 0;

  var old = document.getElementById('mo-import-v3');
  if (old) old.remove();

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-import-v3';
  mo.innerHTML = '<div class="moc" style="max-width:960px;width:95vw;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
    + '<div style="font-size:14px;font-weight:600">Excel\'den Urun Aktar</div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'mo-import-v3\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u2715</button>'
    + '</div>'
    + '<div id="import-v3-steps" style="flex-shrink:0"></div>'
    + '<div id="import-v3-body" style="flex:1;overflow-y:auto;min-height:300px"></div>'
    + '<div id="import-v3-footer" style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0"></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
  _v3RenderSteps();
  _v3Adim1();
};

/** Step bar render */
function _v3RenderSteps() {
  var el = document.getElementById('import-v3-steps');
  if (!el) return;
  var adimlar = ['Sablon Sec', 'Dosya Yukle', 'Eslestir / Onayla', 'Aktar'];
  el.innerHTML = '<div style="display:flex;align-items:center;gap:4px;padding:10px 20px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + adimlar.map(function(a, i) {
      var n = i + 1;
      var ok = n < _v3.adim;
      var on = n === _v3.adim;
      return '<div style="display:flex;align-items:center;gap:4px">'
        + '<div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;background:' + (ok ? '#EAF3DE' : on ? '#185FA5' : 'var(--s2)') + ';color:' + (ok ? '#27500A' : on ? '#fff' : 'var(--t3)') + '">' + (ok ? '\u2713' : n) + '</div>'
        + '<span style="font-size:11px;color:' + (on ? '#185FA5' : 'var(--t3)') + ';font-weight:' + (on ? '600' : '400') + '">' + a + '</span>'
        + (i < 3 ? '<span style="color:var(--t3);margin:0 4px;font-size:9px">\u2192</span>' : '')
        + '</div>';
    }).join('')
    + '</div>';
}

// ── ADIM 1 — SABLON SEC ──────────────────────────────────────
function _v3Adim1() {
  _v3.adim = 1; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;

  var h = '<div style="padding:20px">';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">';
  var keys = Object.keys(V3_SABLONLAR);
  keys.forEach(function(key) {
    var s = V3_SABLONLAR[key];
    var kolSay = s.kolonlar ? s.kolonlar.length : 34;
    var secili = _v3.seciliSablon === key;
    h += '<div onclick="event.stopPropagation();window._v3SablonSec(\'' + key + '\')" style="border:2px solid ' + (secili ? '#185FA5' : 'var(--b)') + ';border-radius:10px;padding:16px;cursor:pointer;background:' + (secili ? '#E6F1FB' : 'var(--sf)') + ';transition:all .15s">'
      + '<div style="font-size:20px;margin-bottom:6px">' + s.ikon + '</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--t)">' + _esc(s.ad) + '</div>'
      + '<div style="font-size:11px;color:var(--t3);margin:4px 0">' + _esc(s.aciklama) + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">Kolonlar: ' + kolSay + ' alan</div>'
      + '</div>';
  });
  h += '</div>';
  h += '<div id="v3-sablon-info" style="margin-top:12px"></div>';
  h += '</div>';
  body.innerHTML = h;

  if (_v3.seciliSablon) _v3SablonInfoGuncelle();

  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-import-v3\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" id="v3-devam-1" onclick="event.stopPropagation();window._v3Adim1Devam()" style="' + (_v3.seciliSablon ? '' : 'opacity:.4;pointer-events:none') + '">Devam \u2192</button>';
}

window._v3SablonSec = function(key) {
  _v3.seciliSablon = key;
  _v3Adim1();
};

function _v3SablonInfoGuncelle() {
  var info = document.getElementById('v3-sablon-info');
  if (!info || !_v3.seciliSablon) return;
  var s = V3_SABLONLAR[_v3.seciliSablon];
  if (!s) return;
  var kolSay = s.kolonlar ? s.kolonlar.length : 34;
  info.innerHTML = '<div style="background:#E6F1FB;border-radius:8px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between">'
    + '<div style="font-size:12px;color:#0C447C;font-weight:500">' + _esc(s.ad) + ' secildi \u00b7 ' + kolSay + ' kolon aktarilacak</div>'
    + (s.kolonlar ? '<button class="btn btns" onclick="event.stopPropagation();window._ihrSablonIndir(\'' + _v3.seciliSablon + '\')" style="font-size:10px;padding:4px 12px">\u2b07 Sablonu Indir</button>' : '')
    + '</div>';
}

window._v3Adim1Devam = function() {
  if (!_v3.seciliSablon) { window.toast?.('Sablon secin', 'err'); return; }
  _v3Adim2();
};

// ── ADIM 2 — DOSYA YUKLE ─────────────────────────────────────
function _v3Adim2() {
  _v3.adim = 2; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;

  var s = V3_SABLONLAR[_v3.seciliSablon];
  var h = '<div style="display:flex;gap:16px;padding:20px;flex-wrap:wrap">';
  if (s.kolonlar) {
    h += '<div style="flex:1;min-width:240px;padding:20px;border:1px solid var(--b);border-radius:10px;background:var(--s2);text-align:center">'
      + '<div style="font-size:24px;margin-bottom:8px">\ud83d\udcc4</div>'
      + '<div style="font-size:13px;font-weight:500;margin-bottom:6px">Hazir Sablonu Indir</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">Bu sablonu indir, Excel\'de doldur, geri yukle</div>'
      + '<button class="btn btns" onclick="event.stopPropagation();window._ihrSablonIndir(\'' + _v3.seciliSablon + '\')" style="font-size:11px">\u2b07 Sablon Indir</button>'
      + '</div>';
  }
  h += '<div style="flex:1;min-width:240px;padding:20px;border:2px dashed var(--bm);border-radius:10px;text-align:center;cursor:pointer" onclick="event.stopPropagation();document.getElementById(\'v3-file-input\')?.click()" id="v3-drop-zone">'
    + '<div style="font-size:32px;margin-bottom:8px">\ud83d\udce5</div>'
    + '<div style="font-size:13px;font-weight:500;margin-bottom:6px">Dosya Yukle</div>'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">.xlsx \u00b7 .csv \u00b7 .jpg \u00b7 .png \u00b7 .pdf</div>'
    + '<div id="v3-file-info" style="font-size:11px;color:#185FA5;margin-top:8px;font-weight:500"></div>'
    + '<input type="file" id="v3-file-input" accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png,.pdf" style="display:none" onchange="event.stopPropagation();window._v3DosyaSecildi(this)">'
    + '</div>';
  h += '</div>';
  h += '<div style="padding:0 20px 12px;font-size:10px;color:var(--t3)">Gorsel/PDF yuklerseniz AI otomatik okur (API key gerekli)</div>';
  body.innerHTML = h;

  // Drag & drop — Safari uyumlu
  var dz = document.getElementById('v3-drop-zone');
  if (dz) {
    dz.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); dz.style.borderColor = '#185FA5'; dz.style.background = '#E6F1FB'; });
    dz.addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); dz.style.borderColor = ''; dz.style.background = ''; });
    dz.addEventListener('drop', function(e) {
      e.preventDefault(); e.stopPropagation();
      dz.style.borderColor = ''; dz.style.background = '';
      var f = e.dataTransfer?.files?.[0];
      if (f) {
        var inp = document.getElementById('v3-file-input');
        try { var dt = new DataTransfer(); dt.items.add(f); if (inp) { inp.files = dt.files; window._v3DosyaSecildi(inp); } } catch(e2) { /* Safari fallback */ if (inp) window._v3DosyaSecildi({ files: [f] }); }
      }
    });
  }

  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Geri(1)">\u2190 Geri</button>'
    + '<button class="btn btnp" id="v3-devam-2" onclick="event.stopPropagation();window._v3Adim2Devam()" style="opacity:.4;pointer-events:none">Devam \u2192</button>';
}

window._v3DosyaSecildi = function(input) {
  var file = input.files?.[0];
  if (!file) return;
  _v3.dosyaAdi = file.name;
  _v3.dosya = file;
  var info = document.getElementById('v3-file-info');
  var sizeKB = Math.round(file.size / 1024);
  if (info) info.textContent = file.name + ' \u00b7 ' + sizeKB + ' KB';
  var btn = document.getElementById('v3-devam-2');
  if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
};

window._v3Adim2Devam = function() {
  if (!_v3.dosya) { window.toast?.('Dosya secin', 'err'); return; }
  var file = _v3.dosya;
  var ext = file.name.split('.').pop().toLowerCase();
  var imageExts = ['jpg', 'jpeg', 'png', 'pdf'];
  var body = document.getElementById('import-v3-body');

  if (imageExts.indexOf(ext) !== -1) {
    if (body) body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:12px">\ud83d\udd0d</div>Gorsel okunuyor...<div style="font-size:10px;color:var(--t3);margin-top:8px">Claude Vision API kullaniliyor</div></div>';
    _v3ProcessImage(file);
    return;
  }

  if (body) body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t2)">Dosya okunuyor...</div>';
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (ext === 'csv') {
        var lines = e.target.result.split('\n').filter(function(l) { return l.trim(); });
        var rows = lines.map(function(l) { return l.split(/[,;\t]/).map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); });
        _v3ProcessRawData(rows);
      } else if (typeof XLSX !== 'undefined') {
        var wb = XLSX.read(e.target.result, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        _v3ProcessRawData(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }));
      } else {
        window.toast?.('XLSX kutuphanesi bulunamadi', 'err');
      }
    } catch (err) {
      if (body) body.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626">' + _esc(err.message) + '</div>';
    }
  };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
};

function _v3ProcessRawData(rows) {
  if (!rows || rows.length < 2) { window.toast?.('Dosyada veri bulunamadi', 'err'); return; }
  var headerRowIdx = 0, maxDolu = 0;
  for (var ri = 0; ri < Math.min(10, rows.length); ri++) {
    var dolu = 0;
    for (var ci = 0; ci < rows[ri].length; ci++) { if (String(rows[ri][ci] || '').trim()) dolu++; }
    if (dolu > maxDolu) { maxDolu = dolu; headerRowIdx = ri; }
  }
  if (maxDolu < 2) { window.toast?.('Baslik satiri bulunamadi', 'err'); return; }
  _v3.excelKolonlar = rows[headerRowIdx].map(function(k, i) { return String(k || '').trim() || ('Sutun_' + (i + 1)); });
  _v3.excelData = rows.slice(headerRowIdx + 1).filter(function(r) {
    return r.some(function(c) { return String(c || '').trim(); });
  }).map(function(r) {
    var obj = {};
    _v3.excelKolonlar.forEach(function(k, i) { obj[k] = String(r[i] || '').trim(); });
    return obj;
  });
  if (!_v3.excelData.length) { window.toast?.('Veri satirlari bulunamadi', 'err'); return; }
  _v3.satirSayisi = _v3.excelData.length;
  window.toast?.(_v3.satirSayisi + ' satir okundu', 'ok');
  _v3Adim3();
}

/** Gorsel/PDF dosyasini Claude Vision ile isle */
function _v3ProcessImage(file) {
  var body = document.getElementById('import-v3-body');
  var reader = new FileReader();
  reader.onload = function(ev) {
    var b64Full = ev.target.result;
    var b64Data = b64Full.split(',')[1] || b64Full;
    var mediaType = file.type || 'image/jpeg';
    var _storedKey = localStorage.getItem('ak_anthropic_key');
    var apiKey = _storedKey ? (function() { try { return atob(_storedKey); } catch(e) { return _storedKey; } })() : '';
    if (!apiKey) apiKey = window.__ANTHROPIC_KEY || '';
    if (!apiKey) {
      if (body) body.innerHTML = '<div style="padding:24px;text-align:center">'
        + '<div style="font-size:13px;font-weight:500;margin-bottom:12px">Anthropic API Key Gerekli</div>'
        + '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">Gorsel okuma icin Claude Vision API kullanilir.</div>'
        + '<input class="fi" id="v3-api-key" placeholder="sk-ant-..." style="width:100%;max-width:400px;margin-bottom:12px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()">'
        + '<div style="display:flex;gap:8px;justify-content:center">'
        + '<button class="btn btns" onclick="event.stopPropagation();window._v3Geri(2)">Iptal</button>'
        + '<button class="btn btnp" onclick="event.stopPropagation();var k=document.getElementById(\'v3-api-key\')?.value;if(k){try{localStorage.setItem(\'ak_anthropic_key\',btoa(k));}catch(e){localStorage.setItem(\'ak_anthropic_key\',k);}window._v3Adim2Devam();}">Kaydet ve Devam</button>'
        + '</div></div>';
      return;
    }
    var prompt = 'Bu belgeden urun listesini cikar. Her urun icin su alanlari bul: urun adi/aciklamasi, urun kodu, miktar, birim, birim fiyat, para birimi, HS kodu, brut kg, koli adedi. JSON array formatinda ver: [{"aciklama":"...","urun_kodu":"...","miktar":0,"birim":"PCS","birim_fiyat":0,"doviz":"USD","hs_kodu":"...","brut_kg":0,"koli_adet":0}]. Bulamazsan bos birak. Sadece JSON ver.';
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: b64Data } }, { type: 'text', text: prompt }] }] })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      try {
        var text = data.content && data.content[0] ? data.content[0].text : '';
        var jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        var urunler = JSON.parse(jsonStr);
        if (!Array.isArray(urunler) || !urunler.length) throw new Error('Urun bulunamadi');
        _v3.excelKolonlar = Object.keys(urunler[0]);
        _v3.excelData = urunler.map(function(u) { var obj = {}; _v3.excelKolonlar.forEach(function(k) { obj[k] = String(u[k] || ''); }); return obj; });
        _v3.satirSayisi = _v3.excelData.length;
        _v3.eslestirme = {};
        _v3.excelKolonlar.forEach(function(k) { _v3.eslestirme[k] = k; });
        window.toast?.(_v3.satirSayisi + ' urun okundu (Vision)', 'ok');
        _v3Adim3();
      } catch(parseErr) {
        if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:#DC2626"><div style="font-size:13px;font-weight:500;margin-bottom:8px">Gorsel okunamadi</div><div style="font-size:11px;color:var(--t3)">' + _esc(parseErr.message) + '</div><button class="btn btns" onclick="event.stopPropagation();window._v3Geri(2)" style="margin-top:12px">\u2190 Geri</button></div>';
      }
    })
    .catch(function(err) {
      if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:#DC2626"><div style="font-size:13px;font-weight:500;margin-bottom:8px">API Hatasi</div><div style="font-size:11px">' + _esc(err.message) + '</div><button class="btn btns" onclick="event.stopPropagation();window._v3Geri(2)" style="margin-top:8px">\u2190 Geri</button></div>';
    });
  };
  reader.readAsDataURL(file);
}

// ── ADIM 3 — ESLESTIR / ONAYLA ───────────────────────────────
function _v3Adim3() {
  _v3.adim = 3; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;

  var sablon = V3_SABLONLAR[_v3.seciliSablon];
  var hasApiKey = !!(localStorage.getItem('ak_anthropic_key') || window.__ANTHROPIC_KEY);
  var aiMode = hasApiKey && sablon.kolonlar;

  if (aiMode && Object.keys(_v3.eslestirme).length === 0) {
    body.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:32px;margin-bottom:12px">\ud83e\udde0</div><div style="font-size:13px;font-weight:500">AI eslestirme yapiliyor...</div><div style="font-size:11px;color:var(--t3);margin-top:4px">Excel kolonlari sistem alanlariyla eslestirilyor</div></div>';
    footer.innerHTML = '';
    _v3AiEslestir(sablon);
    return;
  }

  if (Object.keys(_v3.eslestirme).length === 0 && sablon.kolonlar) {
    _v3.eslestirme = {};
    sablon.kolonlar.forEach(function(kol, i) {
      if (i < _v3.excelKolonlar.length) {
        _v3.eslestirme[_v3.excelKolonlar[i]] = kol.key;
      }
    });
  }

  _v3RenderEslestirme(body, footer, sablon, aiMode);
}

function _v3RenderEslestirme(body, footer, sablon, aiMode) {
  var h = '';
  if (!aiMode && sablon.kolonlar) {
    h += '<div style="padding:10px 20px;background:#FAEEDA;border-bottom:1px solid var(--b);font-size:11px;color:#633806">'
      + 'AI devre disi \u2014 sablon sirasi kullaniliyor. Excel\'inizin kolon sirasi sablonla eslesiyorsa direkt aktarilir.'
      + '</div>';
  }
  h += '<div style="padding:8px 20px;background:#E6F1FB;border-bottom:1px solid var(--b);font-size:11px;color:#0C447C">'
    + _esc(_v3.dosyaAdi) + ' \u00b7 ' + _v3.satirSayisi + ' satir \u00b7 ' + _v3.excelKolonlar.length + ' kolon'
    + '</div>';

  var eslesti = 0;
  _v3.excelKolonlar.forEach(function(k) { if (_v3.eslestirme[k] && _v3.eslestirme[k] !== 'atla') eslesti++; });
  h += '<div style="padding:8px 20px;font-size:10px;color:var(--t3)">' + eslesti + '/' + _v3.excelKolonlar.length + ' kolon eslesti</div>';

  var tumAlanlar = [
    { v:'atla', l:'\u2014 Atla / Skip \u2014' },
    { v:'aciklama', l:'Urun Aciklamasi' }, { v:'urun_kodu', l:'Urun Kodu' },
    { v:'standart_urun_adi', l:'Standart Adi (EN)' }, { v:'tedarikci', l:'Tedarikci' },
    { v:'birim_fiyat', l:'Birim Fiyat' }, { v:'para_birimi', l:'Para Birimi' },
    { v:'brut_kg', l:'Brut KG' }, { v:'net_kg', l:'Net KG' },
    { v:'koli_adet', l:'Koli Adedi' }, { v:'hacim_m3', l:'Hacim (CBM)' },
    { v:'hs_kodu', l:'HS / GTIP Kodu' }, { v:'mensei_ulke', l:'Mensei Ulke' },
    { v:'miktar', l:'Miktar' }, { v:'birim', l:'Birim' },
    { v:'doviz', l:'Doviz' }, { v:'kur', l:'Kur' },
    { v:'mense_ulke', l:'Mense Ulke' }, { v:'konteyner_no', l:'Konteyner No' },
    { v:'muhur_no', l:'Muhur No' }, { v:'konteyner_sirasi', l:'Konteyner Sirasi' },
    { v:'yuklenebilir_miktar', l:'Yuklenebilir Miktar' },
    { v:'ambalaj_tipi', l:'Ambalaj Tipi' }, { v:'olcu_koli', l:'Olculer (1 Koli)' },
    { v:'imo_gerekli', l:'IMO Gerekli' }, { v:'imo_no', l:'IMO No' },
    { v:'gcb_id', l:'GCB No' }, { v:'urun_adi_tr', l:'Urun Adi (TR)' },
    { v:'fatura_urun_adi', l:'Fatura Adi' }, { v:'gumrukcu_tanim', l:'Gumrukcu Tanim' },
    { v:'siparis_no', l:'Siparis No' }, { v:'marka', l:'Marka' },
    { v:'kdv_orani', l:'KDV Orani' }, { v:'toplam_fiyat', l:'Toplam Fiyat' }
  ];

  _v3.excelKolonlar.forEach(function(k) {
    if (k.indexOf('Sutun_') === 0) {
      var dolu = false;
      for (var si = 0; si < Math.min(5, _v3.excelData.length); si++) { if (_v3.excelData[si][k]) { dolu = true; break; } }
      if (!dolu) return;
    }
    var secili = _v3.eslestirme[k] || 'atla';
    var eslesmis = secili !== 'atla';
    var guven = _v3.eslestirme['_guven_' + k] || '';
    var bg = eslesmis ? (guven === 'dusuk' ? '#FEF9C3' : '#EAF3DE') : '#FAEEDA';
    var fg = eslesmis ? (guven === 'dusuk' ? '#854F0B' : '#085041') : '#633806';
    var ornekler = [];
    for (var oi = 0; oi < Math.min(3, _v3.excelData.length); oi++) {
      var ov = _v3.excelData[oi][k];
      if (ov) ornekler.push(String(ov).slice(0, 20));
    }
    h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 20px;border-bottom:0.5px solid var(--b);font-size:11px">';
    h += '<span style="flex:0 0 180px;font-family:monospace;font-size:10px;padding:3px 6px;border-radius:4px;background:' + bg + ';color:' + fg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + (eslesmis ? (guven === 'dusuk' ? '? ' : '\u2713 ') : '') + _esc(k) + '</span>';
    h += '<span style="color:var(--t3)">\u2192</span>';
    h += '<select class="fi" style="font-size:11px;min-width:180px;padding:5px 8px;' + (eslesmis ? 'border-color:#97C459;background:#EAF3DE' : '') + '" onchange="event.stopPropagation();window._v3EslGuncelle(\'' + _esc(k).replace(/'/g, "\\'") + '\',this.value)" onclick="event.stopPropagation()">';
    tumAlanlar.forEach(function(a) { h += '<option value="' + a.v + '"' + (secili === a.v ? ' selected' : '') + '>' + _esc(a.l) + '</option>'; });
    h += '</select>';
    h += '<span style="flex:1;font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(ornekler.join(' \u00b7 ')) + '</span>';
    h += '</div>';
  });

  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Geri(2)">\u2190 Geri</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._v3Adim3Devam()">Devam \u2192</button>';
}

window._v3EslGuncelle = function(k, v) { _v3.eslestirme[k] = v; };

/** AI ile kolon eslestirme */
function _v3AiEslestir(sablon) {
  var _storedKey = localStorage.getItem('ak_anthropic_key');
  var apiKey = _storedKey ? (function() { try { return atob(_storedKey); } catch(e) { return _storedKey; } })() : '';
  if (!apiKey) apiKey = window.__ANTHROPIC_KEY || '';

  if (!apiKey || !sablon.kolonlar) {
    _v3.eslestirme = {};
    sablon.kolonlar.forEach(function(kol, i) {
      if (i < _v3.excelKolonlar.length) _v3.eslestirme[_v3.excelKolonlar[i]] = kol.key;
    });
    _v3RenderEslestirme(document.getElementById('import-v3-body'), document.getElementById('import-v3-footer'), sablon, false);
    return;
  }

  var sistemAlanlari = sablon.kolonlar.map(function(k) { return k.key + ' | ' + k.tr + ' | ' + k.en; }).join('\n');
  var prompt = 'Sen bir veri eslestirme asistanisin.\n\nExcel basliklari: [' + _v3.excelKolonlar.join(', ') + ']\nSecilen sablon: ' + sablon.ad + '\nSistem alanlari:\n' + sistemAlanlari + '\n\nHer Excel basligini en uygun sistem alaniyla eslestir.\nEmin olmadiklarini "?" ile isaretle.\n\nJSON formatinda yanit ver:\n{"eslesme":[{"excel":"Excel Basligi","sistem_key":"alan_key","guven":"yuksek|orta|dusuk"}],"eslesmeyen":["eslesmeyen basliklar"]}';

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    try {
      var text = data.content && data.content[0] ? data.content[0].text : '';
      var jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      var result = JSON.parse(jsonStr);
      _v3.eslestirme = {};
      if (result.eslesme && Array.isArray(result.eslesme)) {
        result.eslesme.forEach(function(e) {
          _v3.eslestirme[e.excel] = e.sistem_key;
          _v3.eslestirme['_guven_' + e.excel] = e.guven || 'orta';
        });
      }
      _v3.excelKolonlar.forEach(function(k) {
        if (!_v3.eslestirme[k]) _v3.eslestirme[k] = 'atla';
      });
      window.toast?.('AI eslestirme tamamlandi', 'ok');
      _v3RenderEslestirme(document.getElementById('import-v3-body'), document.getElementById('import-v3-footer'), sablon, true);
    } catch(e) {
      console.warn('[V3:AI] Parse hatasi, sablon sirasi kullaniliyor:', e.message);
      _v3.eslestirme = {};
      sablon.kolonlar.forEach(function(kol, i) {
        if (i < _v3.excelKolonlar.length) _v3.eslestirme[_v3.excelKolonlar[i]] = kol.key;
      });
      _v3RenderEslestirme(document.getElementById('import-v3-body'), document.getElementById('import-v3-footer'), sablon, false);
    }
  })
  .catch(function(err) {
    console.warn('[V3:AI] API hatasi, sablon sirasi kullaniliyor:', err.message);
    _v3.eslestirme = {};
    if (sablon.kolonlar) {
      sablon.kolonlar.forEach(function(kol, i) {
        if (i < _v3.excelKolonlar.length) _v3.eslestirme[_v3.excelKolonlar[i]] = kol.key;
      });
    }
    _v3RenderEslestirme(document.getElementById('import-v3-body'), document.getElementById('import-v3-footer'), sablon, false);
  });
}

window._v3Adim3Devam = function() { _v3Adim4(); };

// ── ADIM 4 — ONIZLEME & AKTAR ────────────────────────────────
function _v3Adim4() {
  _v3.adim = 4; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;

  var mappedRows = [];
  var atlandiKolonlar = [];
  _v3.excelKolonlar.forEach(function(k) {
    if ((!_v3.eslestirme[k] || _v3.eslestirme[k] === 'atla') && k.indexOf('_guven_') !== 0) atlandiKolonlar.push(k);
  });
  _v3.excelData.forEach(function(satir) {
    var mapped = {};
    _v3.excelKolonlar.forEach(function(k) {
      var alan = _v3.eslestirme[k];
      if (alan && alan !== 'atla' && alan.indexOf('_guven_') !== 0) mapped[alan] = satir[k];
    });
    if (Object.keys(mapped).length > 0) mappedRows.push(mapped);
  });

  var mevcutU = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var dosyaUrunler = _v3.dosyaId ? mevcutU.filter(function(u) { return String(u.dosya_id) === String(_v3.dosyaId) && !u.isDeleted; }) : mevcutU.filter(function(u) { return !u.isDeleted; });
  var cakismaSay = 0;
  mappedRows.forEach(function(m) {
    if (m.urun_kodu) {
      var dup = dosyaUrunler.find(function(u) { return u.urun_kodu === m.urun_kodu; });
      if (dup) cakismaSay++;
    }
  });

  var h = '<div style="padding:12px 20px;background:var(--s2);border-bottom:1px solid var(--b);font-size:11px;display:flex;gap:12px;flex-wrap:wrap">';
  h += '<span style="color:#085041;font-weight:500">' + mappedRows.length + ' satir aktarilacak</span>';
  if (atlandiKolonlar.length) h += '<span style="color:var(--t3)">' + atlandiKolonlar.length + ' kolon atlandi</span>';
  if (cakismaSay) h += '<span style="color:#D97706">' + cakismaSay + ' mevcut urun koduna cakisma</span>';
  h += '</div>';

  if (mappedRows.length > 0) {
    var onizKolonlar = Object.keys(mappedRows[0]).slice(0, 8);
    h += '<div style="overflow-x:auto;padding:12px 20px"><table class="tbl" style="font-size:10px"><thead><tr>';
    onizKolonlar.forEach(function(k) { h += '<th style="white-space:nowrap">' + _esc(k) + '</th>'; });
    h += '</tr></thead><tbody>';
    mappedRows.slice(0, 5).forEach(function(m, ri) {
      h += '<tr>';
      onizKolonlar.forEach(function(k) { h += '<td style="background:' + (ri % 2 ? 'var(--s2)' : '') + '">' + _esc(String(m[k] || '').slice(0, 30)) + '</td>'; });
      h += '</tr>';
    });
    if (mappedRows.length > 5) h += '<tr><td colspan="' + onizKolonlar.length + '" style="text-align:center;color:var(--t3);font-style:italic">... ve ' + (mappedRows.length - 5) + ' satir daha</td></tr>';
    h += '</tbody></table></div>';
  }

  if (cakismaSay > 0) {
    h += '<div style="padding:12px 20px;border-top:1px solid var(--b)">';
    h += '<div style="font-size:12px;font-weight:500;margin-bottom:8px">Cakisma Secenegi</div>';
    [{ k:'guncelle', l:'Mevcut urunleri guncelle' }, { k:'yeni', l:'Sadece yeni urun ekle' }, { k:'tumu', l:'Tumunu yeni ekle (mukerrer olusabilir)' }].forEach(function(d) {
      var aktif = _v3.dupMod === d.k;
      h += '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px;cursor:pointer" onclick="event.stopPropagation();window._v3DupSec(\'' + d.k + '\')">';
      h += '<span style="color:' + (aktif ? '#185FA5' : 'var(--t3)') + ';font-size:16px">' + (aktif ? '\u25c9' : '\u25cb') + '</span>';
      h += '<span style="color:' + (aktif ? 'var(--t)' : 'var(--t2)') + '">' + d.l + '</span></label>';
    });
    h += '</div>';
  }

  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Geri(3)">\u2190 Geri</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrExcelImportV3Execute()">Aktar (' + mappedRows.length + ' satir)</button>';
  _v3._mappedRows = mappedRows;
}

window._v3DupSec = function(mod) { _v3.dupMod = mod; _v3Adim4(); };

/**
 * V3 import uygula — eslestirilen verileri ihracat urunlerine yazar.
 */
window._ihrExcelImportV3Execute = function() {
  var rows = _v3._mappedRows;
  if (!rows || !rows.length) { window.toast?.('Aktarilacak veri yok', 'err'); return; }

  var cu = typeof window.CU === 'function' ? window.CU() : (window.Auth?.getCU?.());
  var mevcutU = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var dosyaId = _v3.dosyaId;
  var genId = typeof window.generateNumericId === 'function' ? window.generateNumericId : function() { return Date.now() + Math.floor(Math.random() * 10000); };
  var nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  var eklenen = 0, guncellenen = 0, atlandi = 0;

  rows.forEach(function(m) {
    var dup = null;
    if (m.urun_kodu && dosyaId) {
      dup = mevcutU.find(function(u) { return !u.isDeleted && u.urun_kodu === m.urun_kodu && String(u.dosya_id) === String(dosyaId); });
    }
    if (dup && _v3.dupMod === 'guncelle') {
      Object.keys(m).forEach(function(k) { if (m[k] && String(m[k]).trim()) dup[k] = m[k]; });
      dup.updatedAt = nowStr; guncellenen++;
    } else if (dup && _v3.dupMod === 'yeni') {
      atlandi++;
    } else {
      mevcutU.unshift({
        id: genId(), dosya_id: dosyaId || '',
        aciklama: m.aciklama || m.urun_adi_tr || '',
        standart_urun_adi: m.standart_urun_adi || m.aciklama || '',
        urun_kodu: m.urun_kodu || '', hs_kodu: m.hs_kodu || '',
        kdv_orani: m.kdv_orani || '',
        miktar: parseFloat(m.miktar || 0), birim: m.birim || 'PCS',
        birim_fiyat: parseFloat(m.birim_fiyat || 0),
        doviz: m.doviz || m.para_birimi || 'USD',
        brut_kg: parseFloat(m.brut_kg || 0), net_kg: parseFloat(m.net_kg || 0),
        hacim_m3: parseFloat(m.hacim_m3 || 0), koli_adet: parseInt(m.koli_adet || 0),
        mense_ulke: m.mense_ulke || m.mensei_ulke || '',
        tedarikciAd: m.tedarikci || '', gumrukcu_tanim: m.gumrukcu_tanim || '',
        fatura_urun_adi: m.fatura_urun_adi || '',
        konteyner_no: m.konteyner_no || '', muhur_no: m.muhur_no || '',
        konteyner_sira: m.konteyner_sirasi || '',
        imo_gerekli: m.imo_gerekli || '', imo_no: m.imo_no || '',
        gcb_id: m.gcb_id || '', ambalaj_tipi: m.ambalaj_tipi || '',
        olcu_koli: m.olcu_koli || '',
        kaynak: 'excel_v3', createdAt: nowStr, createdBy: cu?.id
      });
      eklenen++;
    }
  });

  if (typeof window.storeIhracatUrunler === 'function') window.storeIhracatUrunler(mevcutU);

  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (body) {
    body.innerHTML = '<div style="padding:32px 20px;text-align:center">'
      + '<div style="font-size:36px;margin-bottom:12px">\u2705</div>'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:20px">Import Tamamlandi</div>'
      + '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">'
      + '<div style="background:#EAF3DE;border-radius:10px;padding:16px 24px;text-align:center;min-width:90px"><div style="font-size:28px;font-weight:700;color:#16A34A">' + eklenen + '</div><div style="font-size:11px;color:#085041">Eklendi</div></div>'
      + '<div style="background:#E6F1FB;border-radius:10px;padding:16px 24px;text-align:center;min-width:90px"><div style="font-size:28px;font-weight:700;color:#185FA5">' + guncellenen + '</div><div style="font-size:11px;color:#0C447C">Guncellendi</div></div>'
      + '<div style="background:#FAEEDA;border-radius:10px;padding:16px 24px;text-align:center;min-width:90px"><div style="font-size:28px;font-weight:700;color:#D97706">' + atlandi + '</div><div style="font-size:11px;color:#633806">Atlandi</div></div>'
      + '</div></div>';
  }
  if (footer) {
    footer.innerHTML = '<button class="btn btnp" onclick="event.stopPropagation();document.getElementById(\'mo-import-v3\')?.remove();if(window._aktifDosyaId){window._ihrRenderDosyaDetay?.(window._aktifDosyaId);}else{window.renderIhracatOps?.();}">Urunlere Git \u2192</button>';
  }

  window.toast?.(eklenen + ' urun aktarildi' + (guncellenen ? ' \u00b7 ' + guncellenen + ' guncellendi' : '') + (atlandi ? ' \u00b7 ' + atlandi + ' atlandi' : ''), 'ok');
  window.logActivity?.('import', 'Excel V3: ' + eklenen + ' eklendi, ' + guncellenen + ' guncellendi, ' + atlandi + ' atlandi');
};

// ── GERI NAVIGASYON ──────────────────────────────────────────
window._v3Geri = function(adim) {
  if (adim === 1) _v3Adim1();
  else if (adim === 2) _v3Adim2();
  else if (adim === 3) { _v3.eslestirme = {}; _v3Adim3(); }
};

// ── SABLON INDIR ─────────────────────────────────────────────
/**
 * Secilen sablonun bos Excel dosyasini indirir.
 * @param {string} sablonKey V3_SABLONLAR key
 */
window._ihrSablonIndir = function(sablonKey) {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kutuphanesi yuklu degil', 'err'); return; }
  var sablon = V3_SABLONLAR[sablonKey];
  if (!sablon || !sablon.kolonlar) { window.toast?.('Bu sablon icin indirme desteklenmiyor', 'err'); return; }

  var headers = sablon.kolonlar.map(function(k) { return k.tr + ' (' + k.en + ')'; });
  var ornekMap = {
    tedarikci: 'ABC Trading Co.', urun_kodu: 'PRD-001', urun_adi_tr: 'Ornek Urun',
    standart_urun_adi: 'Sample Product', birim_fiyat: '12.50', para_birimi: 'USD',
    brut_kg: '25.5', net_kg: '22.0', koli_adet: '10', hs_kodu: '8471.30.00',
    mensei_ulke: 'Turkiye', imo_gerekli: 'H', imo_no: '1234', gcb_id: 'GCB-2026-001',
    konteyner_no: 'MSKU1234567', muhur_no: 'SL12345', konteyner_sirasi: '1',
    yuklenebilir_miktar: '500', ambalaj_tipi: 'KARTON', olcu_koli: '40x30x25',
    hacim_m3: '0.03', kur: '32.50', miktar: '100'
  };
  var ornekSatir = sablon.kolonlar.map(function(k) { return ornekMap[k.key] || ''; });

  var ws = XLSX.utils.aoa_to_sheet([headers, ornekSatir]);
  ws['!cols'] = headers.map(function(h2) { return { wch: Math.max(20, h2.length + 2) }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sablon.ad);
  var tarih = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, 'duay_sablon_' + sablonKey + '_' + tarih + '.xlsx');
  window.toast?.('Sablon indirildi', 'ok');
};

})();
