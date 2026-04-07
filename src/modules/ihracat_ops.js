/**
 * src/modules/ihracat_ops.js — v2.0.0
 * İhracat Operasyon Merkezi — Tam Yeniden Yazım
 * 6 Sekme: Emirler · GÇB · Konşimento · Belgeler · Roller · Templateler
 */
(function IhracatOpsModule() {
'use strict';

// IHR-06: Kolon yonetimi sabitleri
var _IHR_KOLON_KEY = 'ak_ihr_kolon_v3';
var _IHR_KOLON_W_KEY = 'ak_ihr_kolon_w_v1';
// Is akisi sirasina gore varsayilan kolonlar — en sik kullanilan 24 alan
var _IHR_KOLON_DEFAULT = [
  // G1 Kimlik (6)
  'tedarikciAd','urun_kodu','aciklama','standart_urun_adi','fatura_urun_adi','gumrukcu_tanim',
  // G2 Fiyat (7)
  'miktar','birim','birim_fiyat','doviz','fatura_turu','kdv_orani','toplam_tutar',
  // G3 Ambalaj (4)
  'koli_adet','brut_kg','net_kg','hacim_m3',
  // G5 Gumruk (3)
  'mense_ulke','hs_kodu','imo_gerekli',
  // G6 Yukleme (7)
  'konteyner_sira','etiket_rengi','once_yukle','konteyner_no','muhur_no','yukleme_durumu','stok_durumu',
  // G7 GCB & Ihracat (4)
  'alis_fatura_no','alis_fatura_tarihi','gcb_no','gcb_durum',
  // G8 Durum (2)
  'musteri_onay','duay_onay'
];
// IHR-KOLON-V3: Grup isimleri
var _IHR_GRUP_AD = {
  1: 'Urun Kimligi',
  2: 'Fiyat & Teklif',
  3: 'Ambalaj & Agirlik',
  4: 'Hammadde',
  5: 'Gumruk & Siniflandirma',
  6: 'Lojistik & Yukleme',
  7: 'GCB & Ihracat',
  8: 'Durum & Onay'
};
var _IHR_KOLON_PRESETS = {
  'CI/PL':  ['tedarikciAd','standart_urun_adi','fatura_urun_adi','aciklama','miktar','birim','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hacim_m3','mense_ulke','hs_kodu'],
  'GCB':    ['tedarikciAd','urun_kodu','aciklama','miktar','birim_fiyat','doviz','mense_ulke','hs_kodu','fatura_turu','gcb_no','gcb_tarih','gcb_kur','gcb_durum','gcb_kapama_tarihi'],
  'Sigorta':['tedarikciAd','standart_urun_adi','miktar','birim_fiyat','doviz','brut_kg','hacim_m3','police_no','police_tarihi','sigorta_firma'],
  'VGM':    ['tedarikciAd','konteyner_sira','koli_adet','brut_kg','net_kg','hacim_m3','konteyner_no','booking_no','muhur_no','vgm_kg','vgm_no','vgm_tarih','vgm_kaynak'],
  'Gumrukcu PL': ['tedarikciAd','gumrukcu_tanim','hs_kodu','miktar','birim','brut_kg','net_kg','koli_adet','hacim_m3','mense_ulke','konteyner_no','muhur_no'],
  'Hammadde': ['tedarikciAd','urun_kodu','aciklama','hammadde_adi','hammadde_ton_fiyat','hammadde_para','hammadde_kaynak'],
  'Teslim':   ['tedarikciAd','urun_kodu','aciklama','stok_durumu','stok_miktar','teslim_suresi','teslim_tarihi','teslim_alan','teslim_eden','urun_nerede'],
  'Onay':     ['tedarikciAd','urun_kodu','aciklama','musteri_onay','duay_onay','yukleme_durumu','onemli_not_1'],
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

var _aktifTab = 'dashboard';
var _aktifDosyaId = null;
var _aktifPeekId = null;

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
/** Gorunum preset degistir */
window._ihrSetGorunum = function(dosyaId, presetKey) {
  try { localStorage.setItem('ak_ihr_preset_' + dosyaId, presetKey); } catch(e) {}
  _ihrReRender();
};

/** Grup toggle — tikla ac/kapat */
window._ihrToggleGrup = function(dosyaId, grup) {
  var key = 'ak_ihr_gizli_grup_' + dosyaId;
  var gizli = [];
  try { var raw = localStorage.getItem(key); if (raw) gizli = raw.split(','); } catch(e) {}
  var gs = String(grup);
  if (gizli.indexOf(gs) !== -1) {
    gizli = gizli.filter(function(g) { return g !== gs; });
  } else {
    gizli.push(gs);
  }
  try { localStorage.setItem(key, gizli.join(',')); } catch(e) {}
  _ihrReRender();
};

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
  { id: 'dashboard', l: 'Dashboard' },
  { id: 'emirler', l: '\u0130hracat Emirleri' },
];

/* ══════════════════════════════════════════════════════════ */
window.renderIhracatOps = function() {
  var panel = _g('panel-ihracat-ops'); if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div id="ihr-tabs" style="display:none"></div><div id="ihr-content" style="padding:0"></div>';
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
  switch (_aktifTab) {
    case 'dashboard': window._ihrRenderDashboard?.(el); break;
    case 'emirler': _ihrRenderEmirler(el); break;
    case 'gcb': _ihrRenderGcbList(el); break;
    case 'konsimento': _ihrRenderBlList(el); break;
    case 'belgeler': _ihrRenderBelgeler(el); break;
    case 'roller': _ihrRenderRoller(el); break;
    case 'templateler': _ihrRenderTemplates(el); break;
  }
}

/* ── EMİRLER — Split Pane Peek (IHR-PEEK-001) ───────────── */
function _ihrRenderEmirler(el) {
  el.innerHTML = '<div style="display:flex;height:calc(100vh - 140px);min-height:500px;overflow:hidden">'
    + '<div id="ihr-sol-liste" style="width:0;flex-shrink:0;border-right:none;overflow:hidden;display:none;flex-direction:column;background:var(--sf)"></div>'
    + '<div id="ihr-sag-cockpit" style="flex:1;overflow:hidden;display:flex;flex-direction:column"></div>'
    + '</div>';
  _ihrRenderSolListe();
  _ihrRenderSagCockpit();
}

/** Sol kolon — dar dosya listesi */
function _ihrRenderSolListe() {
  var el = document.getElementById('ihr-sol-liste');
  if (!el) return;
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; });
  var today = _today();
  var h = '<div style="background:var(--sf);border-bottom:0.5px solid var(--b);padding:8px 12px">';
  h += '<input class="fi" id="ihr-peek-ara" placeholder="Dosya no, müşteri..." oninput="event.stopPropagation();window._ihrPeekAra(this.value)" value="' + _esc(_search) + '" style="font-size:11px;width:100%">';
  h += '<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">';
  [['all','Tümü'],['hazirlaniyor','Haz.'],['yolda','Yolda'],['gecikti','Gecik.']].forEach(function(f) {
    h += '<span onclick="event.stopPropagation();window._ihrDurumFilter(\'' + f[0] + '\')" style="padding:2px 8px;border-radius:10px;font-size:9px;cursor:pointer;' + (_durumFilter === f[0] ? 'background:var(--ac);color:#fff' : 'background:var(--s2);color:var(--t2)') + '">' + f[1] + '</span>';
  });
  h += '</div></div>';

  var items = dosyalar;
  if (_search) { var q = _search.toLowerCase(); items = items.filter(function(d) { return (d.dosyaNo || '').toLowerCase().indexOf(q) !== -1 || (d.musteriAd || '').toLowerCase().indexOf(q) !== -1; }); }
  if (_durumFilter === 'gecikti') items = items.filter(function(d) { return d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum); });
  else if (_durumFilter !== 'all') items = items.filter(function(d) { return d.durum === _durumFilter; });
  items.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  items = items.slice(0, 50);

  if (!items.length) { h += '<div style="text-align:center;padding:32px 12px;color:var(--t2);font-size:11px">Dosya bulunamadı</div>'; el.innerHTML = h; return; }

  items.forEach(function(d) {
    var secili = String(d.id) === String(_aktifPeekId);
    var kalan = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
    var gecikmisMi = kalan !== null && kalan < 0;
    h += '<div onclick="event.stopPropagation();window._ihrMasterSec?.(\'' + d.id + '\')" style="padding:6px 10px;cursor:pointer;border-bottom:0.5px solid var(--b);border-left:3px solid ' + (secili ? '#185FA5' : 'transparent') + ';' + (secili ? 'background:#E6F1FB;' : '') + (gecikmisMi ? 'background:rgba(220,38,38,.04);' : '') + '">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-family:monospace;font-size:10px;color:#185FA5">' + _esc(d.dosyaNo || '—') + '</span>' + _dosyaBadge(d.durum) + '</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px"><span style="font-size:12px;font-weight:500">' + _esc(d.musteriAd || '—') + '</span>';
    if (d.bitis_tarihi) { h += '<span style="font-size:10px;color:' + (gecikmisMi ? '#DC2626' : 'var(--t3)') + '">' + d.bitis_tarihi.slice(5) + '</span>'; }
    h += '</div></div>';
  });
  el.innerHTML = h;
}

/** Sag kolon — cockpit veya bos durum */
function _ihrRenderSagCockpit() {
  var el = document.getElementById('ihr-sag-cockpit');
  if (!el) return;

  if (!_aktifPeekId) {
    var _solGizli = document.getElementById('ihr-sol-liste') && document.getElementById('ihr-sol-liste').style.display === 'none';
    if (_solGizli) {
      var _ilkId = _aktifDosyaId || (window._ihrAktifDosyaId) || (_loadD().filter(function(x){return !x.isDeleted;}).length > 0 ? _loadD().filter(function(x){return !x.isDeleted;})[0].id : null);
      if (_ilkId) { _aktifPeekId = String(_ilkId); _aktifDosyaId = String(_ilkId); window._ihrAktifDosyaId = String(_ilkId); }
    }
    if (!_aktifPeekId) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:8px;color:var(--t2)"><div style="font-size:24px;opacity:.3">\ud83d\udcc2</div><div style="font-size:12px">Dosya se\u00e7ilmedi \u2014 De\u011fi\u015ftir butonunu kullan\u0131n</div></div>';
      return;
    }
  }

  var d = _loadD().filter(function(x) { return !x.isDeleted; }).find(function(x) { return String(x.id) === String(_aktifPeekId); });
  if (!d) { el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:var(--t2)">Dosya bulunamad\u0131</div>'; return; }

  /* Cockpit icerigi — dosya detay yapisini sag panele render et */
  _aktifDosyaId = String(d.id);
  _ihrRenderDosyaDetayInto(d.id, el);
}

/** Dosya detayini verilen elemente render eder (master-detail icin) */
function _ihrRenderDosyaDetayInto(id, targetEl) {
  try { var d = _loadD().find(function(x) { return String(x.id) === String(id); });
  if (!d || !targetEl) return;
  var today = _today();
  var gecikmiMi = d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum);
  var DURUM_STEPS = [
    { v:'taslak',l:'Taslak',gun:3,bildirimHedef:null },
    { v:'hazirlaniyor',l:'Haz\u0131rlan\u0131yor',gun:5,bildirimHedef:'gumrukcu' },
    { v:'yukleniyor',l:'Y\u00fckleniyor',gun:3,bildirimHedef:'forwarder' },
    { v:'yuklendi',l:'Y\u00fcklendi',gun:2,bildirimHedef:'musteri' },
    { v:'yolda',l:'Yolda',gun:21,bildirimHedef:'musteri' },
    { v:'teslim',l:'Teslim',gun:0,bildirimHedef:null }
  ];
  var aktifIdx = -1;
  DURUM_STEPS.forEach(function(s, i) { if (s.v === d.durum) aktifIdx = i; });
  if (d.durum === 'kapandi') aktifIdx = 5;

  /* Surec hesaplamalari */
  var _bnMs = Date.now();
  var _basl = d.durum_tarihi ? new Date(d.durum_tarihi).getTime() : new Date(d.createdAt || d.updatedAt || _bnMs).getTime();
  var _adimG = Math.floor((_bnMs - _basl) / 86400000);
  var _adimSa = Math.floor((_bnMs - _basl) / 3600000) % 24;
  var _aktifS = aktifIdx >= 0 ? DURUM_STEPS[aktifIdx] : DURUM_STEPS[0];
  var _ortG = _aktifS ? _aktifS.gun : 3;
  var _geck = _adimG > _ortG;
  var _geckG = _adimG - _ortG;
  var _kalanG2 = DURUM_STEPS.slice(aktifIdx >= 0 ? aktifIdx + 1 : 1).reduce(function(s, x) { return s + x.gun; }, 0);
  var _etaMs = _bnMs + _kalanG2 * 86400000;
  var _etaTrh = new Date(_etaMs).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  var _bitisMs = d.bitis_tarihi ? new Date(d.bitis_tarihi).getTime() : null;
  var _etaRnk = _bitisMs ? (_etaMs > _bitisMs ? '#DC2626' : '#16A34A') : '#185FA5';

  /* Varyasyon C timeline */
  var timelineH = '<div style="display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--sf);border-bottom:0.5px solid var(--b);flex-shrink:0">';
  /* Sol: adim adi */
  timelineH += '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">';
  timelineH += '<span style="font-size:9px;font-weight:500;color:#185FA5">' + _esc(_aktifS ? _aktifS.l : 'Taslak') + '</span>';
  timelineH += '<span style="font-size:8px;color:var(--t3)">' + (aktifIdx + 1) + '/6</span>';
  timelineH += '</div>';
  /* Orta: micro dot timeline */
  timelineH += '<div style="flex:1;display:flex;align-items:center;gap:0;position:relative">';
  timelineH += '<div style="position:absolute;left:0;right:0;height:1.5px;background:var(--b);z-index:0"></div>';
  if (aktifIdx > 0) timelineH += '<div style="position:absolute;left:0;width:' + Math.round(aktifIdx / 5 * 100) + '%;height:1.5px;background:#185FA5;z-index:0"></div>';
  DURUM_STEPS.forEach(function(s, i) {
    if (i > 0) timelineH += '<div style="flex:1"></div>';
    var sonraki = i === aktifIdx + 1;
    if (i === aktifIdx) timelineH += '<div style="width:12px;height:12px;border-radius:50%;background:#185FA5;flex-shrink:0;position:relative;z-index:1" title="' + _esc(s.l) + '"></div>';
    else if (i < aktifIdx) timelineH += '<div style="width:8px;height:8px;border-radius:50%;background:#185FA5;flex-shrink:0;position:relative;z-index:1"></div>';
    else timelineH += '<div onclick="event.stopPropagation();' + (sonraki ? 'window._ihrAdimIleri?.(\'' + id + '\',\'' + s.v + '\')' : '') + '" style="width:7px;height:7px;border-radius:50%;background:var(--sf);border:1.5px solid var(--bm);flex-shrink:0;position:relative;z-index:1;cursor:' + (sonraki ? 'pointer' : 'default') + '" title="' + _esc(s.l) + (sonraki ? ' \u2192 ge\u00e7' : '') + '"></div>';
  });
  timelineH += '</div>';
  /* Sag: sure + gecikme + ETA */
  timelineH += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">';
  timelineH += '<span style="font-size:8px;color:' + (_geck ? '#DC2626' : 'var(--t3)') + '">' + _adimG + 'g' + (_adimSa > 0 ? ' ' + _adimSa + 'sa' : '') + '</span>';
  if (_geck) timelineH += '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FEF2F2;color:#DC2626">+' + _geckG + 'g</span>';
  timelineH += '<div style="width:1px;height:12px;background:var(--b)"></div>';
  timelineH += '<span style="font-size:8px;color:' + _etaRnk + '" title="Tahmini teslim">ETA ' + _etaTrh + '</span>';
  if (_aktifS && _aktifS.bildirimHedef) timelineH += '<button onclick="event.stopPropagation();window._ihrPaydasBildirim?.(\'' + id + '\',\'' + _aktifS.bildirimHedef + '\')" style="font-size:8px;padding:1px 6px;border-radius:3px;border:0.5px solid var(--bm);background:transparent;cursor:pointer;color:var(--t2);font-family:inherit" title="Paydasa bildirim">\u2709</button>';
  timelineH += '</div>';
  timelineH += '</div>';

  /* IHR-NAV-001: Ust bar + sekmeler tek satir */
  var _kpBdg2 = window._ihrKapamaKontrol?.(id);
  var _evAll3 = _loadE().filter(function(e3) { return String(e3.dosya_id) === String(id) && !e3.isDeleted; });
  var SEKMELER = [
    { id: 'ozet', l: '\u00d6zet' }, { id: 'urunler', l: '\u00dcr\u00fcnler' }, { id: 'evraklar', l: 'Evraklar' },
    { id: 'mutabakat', l: 'Mutabakat' }, { id: 'paydas', l: 'Payda\u015flar' }, { id: 'kapat', l: 'Kapat' }
  ];
  var h = '<div style="padding:0 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:6px;background:var(--s2);min-height:40px;flex-wrap:nowrap;overflow:hidden">';
  h += '<span style="font-size:11px;font-weight:500;color:var(--ac);flex-shrink:0">' + _esc(d.dosyaNo) + '</span>';
  h += '<span style="font-size:10px;color:var(--t2);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">' + _esc(d.musteriAd || '') + '</span>';
  h += _dosyaBadge(d.durum);
  if (gecikmiMi) h += '<span style="font-size:9px;color:#DC2626;font-weight:500;flex-shrink:0">Gecikti</span>';
  h += '<div style="flex:1;display:flex;align-items:stretch;height:40px;overflow-x:auto" id="ihr-detay-tabs">';
  SEKMELER.forEach(function(t, i) {
    var _tb3 = '';
    if (t.id === 'kapat' && _kpBdg2 && !_kpBdg2.kapanabilir) _tb3 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#FCEBEB;color:#791F1F">' + _kpBdg2.eksikler.length + '</span>';
    else if (t.id === 'kapat' && _kpBdg2 && _kpBdg2.kapanabilir) _tb3 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#EAF3DE;color:#27500A">\u2713</span>';
    if (t.id === 'evraklar') { var _ek3 = _evAll3.filter(function(e4) { return !e4.durum || e4.durum === 'taslak'; }).length; if (_ek3 > 0) _tb3 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#FAEEDA;color:#633806">' + _ek3 + '</span>'; }
    h += '<div onclick="event.stopPropagation();window._ihrDetayTab(\'' + t.id + '\',\'' + id + '\')" id="ihr-dt-' + t.id + '" style="padding:0 12px;font-size:11px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;border-bottom:2px solid ' + (i === 0 ? 'var(--ac);color:var(--ac);font-weight:500' : 'transparent;color:var(--t2)') + '">' + _esc(t.l) + _tb3 + '</div>';
  });
  h += '</div>';
  h += '<div style="display:flex;gap:4px;flex-shrink:0">';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDosyaDuzenle?.(\'' + id + '\')" style="font-size:10px;padding:3px 8px">D\u00fczenle</button>';
  if (_isManager()) h += '<button class="btn" style="font-size:10px;padding:3px 10px;background:#16A34A;color:#fff;border-color:#16A34A" onclick="event.stopPropagation();window._ihrDurumDegistir?.(\'' + id + '\')">Durum</button>';
  h += '</div></div>';
  h += timelineH;
  h += '<div id="ihr-detay-content" style="padding:0;flex:1;overflow-y:auto"></div>';
  targetEl.innerHTML = h;
  _ihrDetayRenderOzet(d);
  } catch(e) { console.error('[IHR] RenderDosyaDetayInto hata:', e); if (targetEl) targetEl.innerHTML = '<div style="padding:24px;color:#DC2626;font-size:12px;font-family:monospace">[IHR-ERR] ' + _esc(String(e.message||e)) + '</div>'; }
}

/** Master-detail — dosya sec */
function _ihrMasterSecFn(id) {
  _aktifPeekId = String(id);
  _aktifDosyaId = String(id);
  _ihrRenderSolListe();
  _ihrRenderSagCockpit();
}
window._ihrMasterSec = function(id) { _ihrMasterSecFn(id); };
window._ihrPeekSec = function(id) { _ihrMasterSecFn(id); }; /* compat */

/** Peek — arama */
window._ihrPeekAra = function(q) {
  _search = (q || '').trim().toLowerCase();
  _ihrRenderSolListe();
};

/** Hizli durum guncelle */
window._ihrHizliDurumGuncelle = function(id, yeniDurum) {
  if (yeniDurum === 'kapandi' || yeniDurum === 'iptal') {
    if (typeof window.confirmModal === 'function') {
      window.confirmModal('Dosya durumu "' + (DOSYA_DURUM[yeniDurum]?.l || yeniDurum) + '" olarak değiştirilsin mi?', function() {
        _ihrDurumUygula(id, yeniDurum);
      });
      return;
    }
  }
  _ihrDurumUygula(id, yeniDurum);
};

function _ihrDurumUygula(id, yeniDurum) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(id); });
  if (!d) return;
  d.durum = yeniDurum;
  d.updatedAt = _now();
  d.updatedBy = _cu()?.id;
  _storeD(dosyalar);
  window.toast?.('Durum güncellendi', 'ok');
  _ihrRenderSolListe();
  _ihrRenderSagPeek();
}

/** Hizli not kaydet */
window._ihrHizliNotKaydet = function(id) {
  var ta = document.getElementById('ihr-peek-not-' + id);
  var not = ta ? ta.value.trim() : '';
  if (!not) { window.toast?.('Not boş olamaz', 'warn'); return; }
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(id); });
  if (!d) return;
  d.son_not = not;
  d.updatedAt = _now();
  _storeD(dosyalar);
  window.toast?.('Not kaydedildi', 'ok');
};

/** Eylem onerileri — dosya bazli akilli oneriler */
function _ihrEylemOnerileri(d) {
  var oneriler = [];
  var gcbList = typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb().filter(function(g) { return String(g.dosya_id) === String(d.id) && !g.isDeleted; }) : [];
  var blList = typeof window.loadIhracatBl === 'function' ? window.loadIhracatBl().filter(function(b) { return String(b.dosya_id) === String(d.id) && !b.isDeleted; }) : [];
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  if (!gcbList.length) oneriler.push({ oncelik: 'kirmizi', mesaj: 'GÇB tescil edilmedi — gümrükçüden talep et', sekme: 'gumrukcu' });
  var sigVar = evraklar.find(function(e) { return e.tur === 'SIG' || e.type === 'SIG'; });
  if (!sigVar) oneriler.push({ oncelik: 'kirmizi', mesaj: 'Sigorta poliçesi eksik — yükle', sekme: 'evraklar' });
  if (gcbList.length && gcbList[0].kapanma_tarihi) {
    var kGun = Math.ceil((new Date() - new Date(gcbList[0].kapanma_tarihi)) / 86400000);
    if (kGun > 90 && kGun <= 120) oneriler.push({ oncelik: 'sari', mesaj: 'Kambiyo vadesi ' + (120 - kGun) + ' günde doluyor', sekme: 'ozet' });
    if (kGun > 120) oneriler.push({ oncelik: 'kirmizi', mesaj: 'Kambiyo süresi doldu!', sekme: 'ozet' });
  }
  if (!blList.length && d.durum === 'yukleniyor') oneriler.push({ oncelik: 'sari', mesaj: 'BL henüz alınmadı — forwarderı takip et', sekme: 'forwarder' });
  if (!d.forwarder_id && !d.forwarder) oneriler.push({ oncelik: 'sari', mesaj: 'Forwarder atanmamış', sekme: 'roller' });
  if (!oneriler.length) oneriler.push({ oncelik: 'yesil', mesaj: 'Kritik eksik yok', sekme: 'ozet' });
  return oneriler;
}

/** Uyari hesapla — tek dosya icin alarm listesi */
function _ihrHesaplaUyarilar(d) {
  var uyarilar = [];
  var today = _today();
  if (d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum)) {
    var gecikGun = Math.ceil((new Date() - new Date(d.bitis_tarihi)) / 86400000);
    uyarilar.push(gecikGun + ' gün gecikmiş');
  }
  var gcbList = typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb().filter(function(g) { return String(g.dosya_id) === String(d.id) && !g.isDeleted; }) : [];
  if (!gcbList.length && !['taslak', 'kapandi', 'iptal'].includes(d.durum)) uyarilar.push('GÇB bekleniyor');
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  if (!evraklar.find(function(e) { return e.tur === 'SIG' || e.type === 'SIG'; }) && !['taslak', 'kapandi', 'iptal'].includes(d.durum)) uyarilar.push('Sigorta poliçesi eksik');
  if (gcbList.length && gcbList[0].kapanma_tarihi) {
    var kGun = Math.ceil((new Date() - new Date(gcbList[0].kapanma_tarihi)) / 86400000);
    if (kGun > 105 && kGun <= 120) uyarilar.push('Kambiyo vadesi ' + (120 - kGun) + ' günde doluyor');
    if (kGun > 120) uyarilar.push('Kambiyo süresi doldu!');
  }
  return uyarilar;
}

/* ── DOSYA DETAY ─────────────────────────────────────────── */
function _ihrAcDosya(id) {
  id = String(id); _aktifDosyaId = id; _aktifPeekId = id; _aktifTab = 'emirler';
  _ihrRenderTabs(); _ihrRenderContent();
  setTimeout(function() { window._ihrMasterSec?.(id); }, 50);
}

function _ihrRenderDosyaDetay(id) {
  var el = _g('ihr-content'); if (!el) return;
  var d = _loadD().find(function(x) { return String(x.id) === String(id); });
  if (!d) { _aktifDosyaId = null; _ihrRenderContent(); return; }

  var today = _today();
  var gecikmiMi = d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi', 'iptal'].includes(d.durum);

  var DURUM_STEPS = [
    { v:'taslak',l:'Taslak',gun:3 },{ v:'hazirlaniyor',l:'Haz\u0131rlan\u0131yor',gun:5 },
    { v:'yukleniyor',l:'Y\u00fckleniyor',gun:3 },{ v:'yuklendi',l:'Y\u00fcklendi',gun:2 },
    { v:'yolda',l:'Yolda',gun:21 },{ v:'teslim',l:'Teslim',gun:0 }
  ];
  var aktifIdx = -1;
  DURUM_STEPS.forEach(function(s, i) { if (s.v === d.durum) aktifIdx = i; });
  var _bnMs2 = Date.now();
  var _basl2 = d.durum_tarihi ? new Date(d.durum_tarihi).getTime() : new Date(d.createdAt || _bnMs2).getTime();
  var _adimG2 = Math.floor((_bnMs2 - _basl2) / 86400000);
  var _aktifS2 = aktifIdx >= 0 ? DURUM_STEPS[aktifIdx] : DURUM_STEPS[0];
  var _geck2 = _adimG2 > (_aktifS2 ? _aktifS2.gun : 3);
  var _kalanG3 = DURUM_STEPS.slice(aktifIdx >= 0 ? aktifIdx + 1 : 1).reduce(function(s, x) { return s + x.gun; }, 0);
  var _etaTrh2 = new Date(_bnMs2 + _kalanG3 * 86400000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  var _bitisMs2 = d.bitis_tarihi ? new Date(d.bitis_tarihi).getTime() : null;
  var _etaRnk2 = _bitisMs2 ? ((_bnMs2 + _kalanG3 * 86400000) > _bitisMs2 ? '#DC2626' : '#16A34A') : '#185FA5';

  /* Varyasyon C timeline */
  var timelineH = '<div style="display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--sf);border-bottom:0.5px solid var(--b);flex-shrink:0">';
  timelineH += '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><span style="font-size:9px;font-weight:500;color:#185FA5">' + _esc(_aktifS2 ? _aktifS2.l : 'Taslak') + '</span><span style="font-size:8px;color:var(--t3)">' + (aktifIdx + 1) + '/6</span></div>';
  timelineH += '<div style="flex:1;display:flex;align-items:center;gap:0;position:relative"><div style="position:absolute;left:0;right:0;height:1.5px;background:var(--b);z-index:0"></div>';
  if (aktifIdx > 0) timelineH += '<div style="position:absolute;left:0;width:' + Math.round(aktifIdx / 5 * 100) + '%;height:1.5px;background:#185FA5;z-index:0"></div>';
  DURUM_STEPS.forEach(function(s, i) {
    if (i > 0) timelineH += '<div style="flex:1"></div>';
    if (i === aktifIdx) timelineH += '<div style="width:12px;height:12px;border-radius:50%;background:#185FA5;flex-shrink:0;position:relative;z-index:1"></div>';
    else if (i < aktifIdx) timelineH += '<div style="width:8px;height:8px;border-radius:50%;background:#185FA5;flex-shrink:0;position:relative;z-index:1"></div>';
    else timelineH += '<div style="width:7px;height:7px;border-radius:50%;background:var(--sf);border:1.5px solid var(--bm);flex-shrink:0;position:relative;z-index:1"></div>';
  });
  timelineH += '</div>';
  timelineH += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span style="font-size:8px;color:' + (_geck2 ? '#DC2626' : 'var(--t3)') + '">' + _adimG2 + 'g</span>';
  if (_geck2) timelineH += '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FEF2F2;color:#DC2626">+' + (_adimG2 - (_aktifS2 ? _aktifS2.gun : 3)) + 'g</span>';
  timelineH += '<div style="width:1px;height:12px;background:var(--b)"></div><span style="font-size:8px;color:' + _etaRnk2 + '">ETA ' + _etaTrh2 + '</span></div>';
  timelineH += '</div>';

  /* IHR-NAV-001: Ust bar + sekmeler tek satir */
  var _kpBdg = window._ihrKapamaKontrol?.(id);
  var _evAll2 = _loadE().filter(function(e2) { return String(e2.dosya_id) === String(id) && !e2.isDeleted; });
  var SEKMELER = [
    { id: 'ozet', l: '\u00d6zet' }, { id: 'urunler', l: '\u00dcr\u00fcnler' }, { id: 'evraklar', l: 'Evraklar' },
    { id: 'mutabakat', l: 'Mutabakat' }, { id: 'paydas', l: 'Payda\u015flar' }, { id: 'kapat', l: 'Kapat' }
  ];
  var h = '<div style="padding:0 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:6px;background:var(--s2);min-height:40px;flex-wrap:nowrap;overflow:hidden">';
  h += '<button onclick="event.stopPropagation();window._ihrGeriDon()" class="btn btns" style="font-size:10px;padding:3px 8px;flex-shrink:0">\u2190 Geri</button>';
  h += '<span style="font-size:11px;font-weight:500;color:var(--ac);flex-shrink:0">' + _esc(d.dosyaNo) + '</span>';
  h += '<span style="font-size:10px;color:var(--t2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">' + _esc(d.musteriAd || '') + '</span>';
  h += _dosyaBadge(d.durum);
  if (gecikmiMi) h += '<span style="font-size:9px;color:#DC2626;font-weight:500;flex-shrink:0">Gecikti</span>';
  /* Sekmeler ortada */
  h += '<div style="flex:1;display:flex;align-items:stretch;height:40px;overflow-x:auto" id="ihr-detay-tabs">';
  SEKMELER.forEach(function(t, i) {
    var _tbdg2 = '';
    if (t.id === 'kapat' && _kpBdg && !_kpBdg.kapanabilir) _tbdg2 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#FCEBEB;color:#791F1F">' + _kpBdg.eksikler.length + '</span>';
    else if (t.id === 'kapat' && _kpBdg && _kpBdg.kapanabilir) _tbdg2 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#EAF3DE;color:#27500A">\u2713</span>';
    if (t.id === 'evraklar') { var _eksEv2 = _evAll2.filter(function(e3) { return !e3.durum || e3.durum === 'taslak'; }).length; if (_eksEv2 > 0) _tbdg2 = ' <span style="font-size:8px;padding:1px 4px;border-radius:8px;background:#FAEEDA;color:#633806">' + _eksEv2 + '</span>'; }
    h += '<div onclick="event.stopPropagation();window._ihrDetayTab(\'' + t.id + '\',\'' + id + '\')" id="ihr-dt-' + t.id + '" style="padding:0 12px;font-size:11px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;border-bottom:2px solid ' + (i === 0 ? 'var(--ac);color:var(--ac);font-weight:500' : 'transparent;color:var(--t2)') + '">' + _esc(t.l) + _tbdg2 + '</div>';
  });
  h += '</div>';
  /* Sag butonlar */
  h += '<div style="display:flex;gap:4px;flex-shrink:0">';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrDosyaDuzenle?.(\'' + id + '\')" style="font-size:10px;padding:3px 8px">D\u00fczenle</button>';
  if (_isManager()) h += '<button class="btn" style="font-size:10px;padding:3px 10px;background:#16A34A;color:#fff;border-color:#16A34A" onclick="event.stopPropagation();window._ihrDurumDegistir?.(\'' + id + '\')">Durum</button>';
  h += '</div>';
  h += '</div>';
  /* Surec bar */
  h += timelineH;
  h += '<div id="ihr-detay-content" style="padding:0;overflow-y:auto"></div>';
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
  var h = '';

  /* Evrak Setleri */
  h += '<div style="padding:10px 20px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:6px">EVRAK SETLER\u0130</div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  var _evSetler = [
    { k:'musteri', l:'\ud83d\udce6 M\u00fc\u015fteri Seti', c:'#185FA5', bg:'#E6F1FB', ac:'PI + CI + PL' },
    { k:'gumrukcu', l:'\ud83c\udfdb G\u00fcmr\u00fck\u00e7\u00fc Seti', c:'#16A34A', bg:'#EAF3DE', ac:'CI + PL + TR Fatura' },
    { k:'forwarder', l:'\ud83d\udea2 Forwarder Seti', c:'#D97706', bg:'#FAEEDA', ac:'CI + PL + Sevk + Y\u00fckleme' },
    { k:'sigortaci', l:'\ud83d\udee1 Sigortac\u0131 Seti', c:'#7C3AED', bg:'#F5F3FF', ac:'CI + PL + Teklif Formu' }
  ];
  _evSetler.forEach(function(s) {
    h += '<button onclick="event.stopPropagation();window._ihrEvrakSetiUret?.(\'' + s.k + '\')" style="padding:5px 12px;border-radius:6px;font-size:10px;cursor:pointer;border:0.5px solid ' + s.c + ';background:' + s.bg + ';color:' + s.c + ';font-family:inherit;font-weight:500">' + s.l + ' <span style="font-size:8px;font-weight:400;opacity:.7">(' + s.ac + ')</span></button>';
  });
  h += '</div></div>';

  h += '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between"><div style="font-size:13px;font-weight:500">T\u00fcm Evraklar (' + evraklar.length + ')</div></div>';
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
/* ══════════════════════════════════════════════════════════════
   YENİ EMİR V2 — 7 Adımlı Wizard (YENI-EMIR-V2-001)
   ══════════════════════════════════════════════════════════════ */
window._ihrEmirAdim = 1;

var _fl = function(renk, metin) { var c = renk === 'red' ? '#DC2626' : renk === 'blue' ? '#185FA5' : renk === 'yellow' ? '#D97706' : '#16A34A'; return '<div style="font-size:8px;font-weight:600;color:var(--t2);display:flex;align-items:center;gap:4px;margin-bottom:2px"><div style="width:7px;height:7px;border-radius:50%;background:' + c + ';flex-shrink:0"></div>' + metin + '</div>'; };
var _fiA = function(v) { return '<div style="border:0.5px solid #C0DD97;border-radius:5px;padding:4px 8px;font-size:9px;background:#EAF3DE;color:#27500A;min-height:26px;display:flex;align-items:center">' + _esc(String(v || '')) + '</div>'; };
var _secH = function(bg, txt, label) { return '<div style="padding:5px 10px;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;background:' + bg + ';color:' + txt + '">' + label + '</div>'; };

function _emirStepBar() {
  var adimlar = [{n:1,l:'Dosya'},{n:2,l:'G\u00fcmr\u00fck\u00e7\u00fc'},{n:3,l:'Forwarder'},{n:4,l:'Evraklar'},{n:5,l:'Inspection'},{n:6,l:'Sigorta'},{n:7,l:'Muhasebe'}];
  var h = '';
  adimlar.forEach(function(a, i) {
    var ok = a.n < window._ihrEmirAdim, on = a.n === window._ihrEmirAdim;
    h += '<div style="display:flex;align-items:center;gap:4px;font-size:9px;white-space:nowrap;padding:0 8px"><div style="width:16px;height:16px;border-radius:50%;font-size:8px;font-weight:600;display:flex;align-items:center;justify-content:center;background:' + (ok ? '#16A34A' : on ? '#185FA5' : 'var(--s2)') + ';color:' + (ok || on ? '#fff' : 'var(--t3)') + ';border:' + (ok || on ? 'none' : '0.5px solid var(--b)') + '">' + (ok ? '\u2713' : a.n) + '</div><span style="color:' + (on ? '#185FA5' : 'var(--t3)') + ';font-weight:' + (on ? '500' : '400') + '">' + a.l + '</span></div>';
    if (i < 6) h += '<div style="width:20px;height:1px;background:' + (ok ? '#16A34A' : 'var(--b)') + ';flex-shrink:0"></div>';
  });
  var el = _g('ihr-step-bar'); if (el) el.innerHTML = h;
  var lbl = _g('ihr-step-label'); if (lbl) lbl.textContent = 'Ad\u0131m ' + window._ihrEmirAdim + '/7 \u00b7 ' + adimlar[window._ihrEmirAdim - 1].l;
}

function _emirRenderAdim() {
  var body = _g('ihr-emir-body'); if (!body) return;
  _emirStepBar();
  var _ed = window._ihrEmirEditId ? (_loadD().find(function(x){ return String(x.id)===String(window._ihrEmirEditId); })||null) : null;
  var users = _loadUsers().filter(function(u) { return u.status === 'active'; });
  var cariList = _loadCari().filter(function(c) { return !c.isDeleted; });
  var gumrukculer = _loadGM(); var forwarderlar = _loadFW();
  var uOpts = users.map(function(u) { return '<option value="' + u.id + '">' + _esc(u.name) + '</option>'; }).join('');
  var cOpts = cariList.map(function(c) { return '<option value="' + c.id + '">' + _esc(c.name) + '</option>'; }).join('');
  var gOpts = gumrukculer.map(function(g) { return '<option value="' + g.id + '">' + _esc(g.firma_adi || g.name || '') + '</option>'; }).join('');
  var fOpts = forwarderlar.map(function(f) { return '<option value="' + f.id + '">' + _esc(f.firma_adi || f.name || '') + '</option>'; }).join('');
  var n = window._ihrEmirAdim; var h = '';

  if (n === 1) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#DC2626', '#fff', 'DOSYA B\u0130LG\u0130LER\u0130');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
    h += '<div>' + _fl('red', 'Form Tipi *') + '<select class="fi" id="ihr-form-tipi" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option><option value="bedelli">Bedelli \u0130hracat</option><option value="bedelsiz">Bedelsiz \u0130hracat</option><option value="numune">Numune \u0130hracat\u0131</option><option value="gecici">Ge\u00e7ici \u0130hracat</option></select></div>';
    h += '<div>' + _fl('red', 'Teslim \u015eekli *') + '<select class="fi" id="ihr-incoterms" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + INCOTERMS.map(function(i) { return '<option value="' + i + '">' + i + '</option>'; }).join('') + '</select></div>';
    h += '<div>' + _fl('green', '\u0130hracat ID') + _fiA(_genId()) + '</div>';
    h += '<div>' + _fl('red', 'Talimat Giren *') + '<select class="fi" id="ihr-talimat-giren" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + uOpts + '</select></div>';
    h += '<div>' + _fl('red', 'Onaylayan *') + '<select class="fi" id="ihr-talimat-onaylayan" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + uOpts + '</select></div>';
    h += '<div>' + _fl('green', 'Giri\u015f Tarihi') + _fiA(_today()) + '</div>';
    h += '<div>' + _fl('red', 'Ba\u015flang\u0131\u00e7 Tarihi *') + '<input class="fi" type="date" id="ihr-gorev-baslangic" value="' + _today() + '" onclick="event.stopPropagation()"></div>';
    h += '<div>' + _fl('red', 'G\u00f6rev Sorumlusu *') + '<select class="fi" id="ihr-gorev-sorumlusu" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + uOpts + '</select></div>';
    h += '<div>' + _fl('yellow', 'M\u00fc\u015fteri *') + '<select class="fi" id="ihr-musteri" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + cOpts + '</select></div>';
    h += '</div>';
    h += '<div style="padding:0 10px 8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div>' + _fl('yellow', 'WhatsApp Grubu') + '<input class="fi" id="ihr-wa-link" placeholder="Grup ad\u0131 + link..." onclick="event.stopPropagation()"></div>';
    h += '<div>' + _fl('yellow', 'WA Hat\u0131rlatma') + '<textarea class="fi" id="ihr-wa-hatirlatma" rows="2" placeholder="Payla\u015f\u0131lacak d\u00f6k\u00fcmanlar..." onclick="event.stopPropagation()"></textarea></div>';
    h += '</div></div>';
  } else if (n === 2) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#185FA5', '#fff', 'G\u00dcMR\u00dcK\u00c7\u00dc');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div>' + _fl('blue', 'G\u00fcmr\u00fck\u00e7\u00fc Atamas\u0131 *') + '<select class="fi" id="ihr-gumrukcu" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + gOpts + '</select></div>';
    h += '<div>' + _fl('green', 'Vekalet Son Tarihi') + _fiA('Se\u00e7ime g\u00f6re otomatik') + '</div>';
    h += '<div style="grid-column:1/-1">' + _fl('blue', 'G\u00fcmr\u00fck\u00e7\u00fc Notu') + '<textarea class="fi" id="ihr-gumrukcu-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '<div>' + _fl('yellow', 'Uyar\u0131: Men\u015fei') + '<input class="fi" id="ihr-uyari-mensei" placeholder="\u00dcr\u00fcn men\u015fei bilgisi..." onclick="event.stopPropagation()"></div>';
    h += '<div>' + _fl('yellow', 'Uyar\u0131: G\u00c7B') + '<input class="fi" id="ihr-uyari-gcb" placeholder="G\u00c7B \u00f6zel notlar..." onclick="event.stopPropagation()"></div>';
    h += '</div></div>';
  } else if (n === 3) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#185FA5', '#fff', 'FORWARDER');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
    h += '<div>' + _fl('blue', 'Forwarder *') + '<select class="fi" id="ihr-forwarder" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + fOpts + '</select></div>';
    h += '<div>' + _fl('blue', 'Konteyner') + '<select class="fi" id="ihr-konteyner" onclick="event.stopPropagation()"><option value="">—</option><option>20DC</option><option>40DC</option><option>40HC</option><option>LCL</option></select></div>';
    h += '<div>' + _fl('blue', 'Var\u0131\u015f Liman\u0131') + '<input class="fi" id="ihr-varis" placeholder="Abidjan Port" onclick="event.stopPropagation()"></div>';
    h += '<div>' + _fl('yellow', 'Kon\u015fimento T\u00fcr\u00fc') + '<select class="fi" id="ihr-konsimento-turu" onclick="event.stopPropagation()"><option value="">—</option><option>SeaWay BL (Soft)</option><option>SeaWay BL (Hard)</option><option>Air Waybill</option><option>Express BL</option></select></div>';
    h += '<div>' + _fl('blue', 'Notify') + '<select class="fi" id="ihr-konsimento-notify" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + cOpts + '</select></div>';
    h += '<div>' + _fl('blue', 'Consignee') + '<select class="fi" id="ihr-konsimento-consignee" onclick="event.stopPropagation()"><option value="">— Se\u00e7in —</option>' + cOpts + '</select></div>';
    h += '<div style="grid-column:1/-1">' + _fl('green', 'Shipper') + _fiA('DUAY ULUSLARARASI T\u0130CARET L\u0130M\u0130TED \u015e\u0130RKET\u0130') + '</div>';
    h += '<div style="grid-column:1/-1">' + _fl('yellow', 'Forwarder Notu') + '<textarea class="fi" id="ihr-forwarder-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '</div></div>';
  } else if (n === 4) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#DC2626', '#fff', 'M\u00dc\u015eTER\u0130 EVRAKLARI');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    for (var ei = 1; ei <= 4; ei++) h += '<div>' + _fl('yellow', 'Ek D\u00f6k\u00fcman ' + ei) + '<input class="fi" id="ihr-ek-dok-' + ei + '" onclick="event.stopPropagation()"></div>';
    h += '<div style="grid-column:1/-1">' + _fl('red', 'BL \u00d6zel Not') + '<textarea class="fi" id="ihr-bl-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '<div style="grid-column:1/-1">' + _fl('red', 'CI \u00d6zel Not') + '<textarea class="fi" id="ihr-ci-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '<div>' + _fl('green', 'PL Packing List') + _fiA('Olu\u015fturan: Bizim (otomatik)') + '</div>';
    h += '<div>' + _fl('green', 'CI Commercial Inv.') + _fiA('Olu\u015fturan: Bizim (otomatik)') + '</div>';
    h += '<div>' + _fl('green', 'BL Bill of Lading') + _fiA('Olu\u015fturan: Forwarder') + '</div>';
    h += '<div>' + _fl('green', 'OD Certificate') + _fiA('Olu\u015fturan: G\u00fcmr\u00fck\u00e7\u00fc') + '</div>';
    h += '</div></div>';
  } else if (n === 5) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#D97706', '#fff', 'INSPECTION / G\u00d6ZET\u0130M');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div>' + _fl('yellow', 'Inspection \u015eirketi') + '<select class="fi" id="ihr-inspection-firma" onclick="event.stopPropagation()"><option value="">—</option><option>SGS</option><option>Bureau Veritas</option><option>Intertek</option><option>T\u00dcV</option></select></div>';
    h += '<div>' + _fl('yellow', 'Inspection No') + '<input class="fi" id="ihr-inspection-no" onclick="event.stopPropagation()"></div>';
    h += '<div style="grid-column:1/-1">' + _fl('yellow', 'Inspection Notu') + '<textarea class="fi" id="ihr-inspection-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '<div>' + _fl('yellow', 'Evrak G\u00f6zetimi') + '<select class="fi" id="ihr-evrak-gozetim" onclick="event.stopPropagation()"><option value="">Yok</option><option>Gerekli</option><option>G\u00fcmr\u00fck\u00e7\u00fc</option><option>Forwarder</option></select></div>';
    h += '</div></div>';
  } else if (n === 6) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#D97706', '#fff', 'S\u0130GORTA');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div>' + _fl('yellow', 'Sigorta Durumu') + '<select class="fi" id="ihr-sigorta-durum" onclick="event.stopPropagation()"><option value="">—</option><option>Fiyat al</option><option>Yapt\u0131r\u0131lacak</option><option>Gerekmiyor</option><option>M\u00fc\u015fteri Yapacak</option></select></div>';
    h += '<div>' + _fl('yellow', 'Sigorta Notu') + '<textarea class="fi" id="ihr-sigorta-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '</div></div>';
  } else if (n === 7) {
    h += '<div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--b);margin-bottom:10px">' + _secH('#185FA5', '#fff', 'MUHASEBE');
    h += '<div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
    h += '<div style="grid-column:1/-1">' + _fl('blue', 'Muhasebeci Notu') + '<textarea class="fi" id="ihr-muhasebeci-not" rows="2" onclick="event.stopPropagation()"></textarea></div>';
    h += '<div>' + _fl('blue', 'Tedarik\u00e7i Notu') + '<input class="fi" id="ihr-tedarikci-not" onclick="event.stopPropagation()"></div>';
    h += '<div style="grid-column:2/-1">' + _fl('blue', 'Bankadan Para Zorunlu mu?') + '<select class="fi" id="ihr-banka-zorunlu" onclick="event.stopPropagation()"><option value="">—</option><option>Zorunlu</option><option>Zorunlu De\u011fil</option><option>\u00dclkeye G\u00f6re</option></select></div>';
    h += '</div></div>';
  }
  body.innerHTML = h;
  if (_ed) { setTimeout(function() { window._ihrEmirDoldur?.(_ed); }, 30); }
  /* Footer güncelle */
  var ftr = _g('ihr-emir-footer');
  if (ftr) {
    var fh = '<span id="ihr-step-label" style="font-size:9px;color:var(--t3)"></span><div style="display:flex;gap:6px">';
    fh += '<button onclick="event.stopPropagation();window._ihrEmirEditId=null;document.getElementById(\'mo-ihr-emir\')?.remove()" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u0130ptal</button>';
    if (n > 1) fh += '<button onclick="event.stopPropagation();window._ihrEmirAdim--;window._emirRenderAdim()" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2190 Geri</button>';
    if (n < 7) fh += '<button onclick="event.stopPropagation();window._ihrEmirAdim++;window._emirRenderAdim()" style="font-size:10px;padding:5px 14px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">\u0130leri \u2192</button>';
    else fh += '<button onclick="event.stopPropagation();window._ihrEmirKaydet()" style="font-size:10px;padding:5px 14px;border:none;border-radius:5px;background:#16A34A;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">Dosyay\u0131 A\u00e7 \u2192</button>';
    fh += '</div>';
    ftr.innerHTML = fh;
  }
  _emirStepBar();
}

window._ihrYeniEmir = function(editId) {
  window._ihrEmirEditId = editId ? String(editId) : null;
  var _editDosya = editId ? (_loadD().find(function(x){ return String(x.id)===String(editId); })||null) : null;
  window._ihrEmirAdim = 1;
  var ex = _g('mo-ihr-emir'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ihr-emir';
  mo.onclick = function(e) { if (e.target === mo) { window._ihrEmirEditId = null; mo.remove(); } };
  mo.innerHTML = '<div class="moc" style="max-width:920px;width:96vw;max-height:94vh;padding:0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column">'
    + '<div style="padding:10px 16px;border-bottom:0.5px solid var(--b);background:var(--sf);display:flex;align-items:center;gap:10px;flex-shrink:0"><div><div style="font-size:13px;font-weight:500">' + (_editDosya ? '\u270f\ufe0f Dosya D\u00fczenle \u2014 ' + _esc(_editDosya.dosyaNo||'') : '+ Yeni \u0130hracat Emri') + '</div><div style="font-size:9px;color:var(--t3)">\u0130hracat Talimat A\u00e7ma Formu \u00b7 Y\u00f6netici Olu\u015fturur</div></div><div style="margin-left:auto;display:flex;gap:6px"><button onclick="event.stopPropagation();window._ihrEmirTemplateSec?.()" style="padding:4px 10px;border-radius:5px;background:#7C2D12;color:#fff;border:none;font-size:9px;cursor:pointer;font-family:inherit">Template Kaydet</button><button onclick="event.stopPropagation();window._ihrEmirEditId=null;document.getElementById(\'mo-ihr-emir\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;padding:7px 14px;background:var(--sf);border-bottom:0.5px solid var(--b);flex-shrink:0"><div><div style="font-size:8px;color:var(--t3)">Form Ad\u0131</div><div style="font-size:9px;font-weight:500">\u0130hracat Talimat\u0131</div></div><div><div style="font-size:8px;color:var(--t3)">Olu\u015fturma</div><div style="font-size:9px;font-weight:500;color:#27500A">' + _today() + '</div></div><div><div style="font-size:8px;color:var(--t3)">G\u00fcncelleyen</div><div style="font-size:9px;font-weight:500;color:#27500A">' + _esc(_cu()?.name || '') + '</div></div><div><div style="font-size:8px;color:var(--t3)">G\u00fcncelleme Nedeni</div><input class="fi" id="ihr-guncelleme-neden" placeholder="G\u00fcncelleme nedeni..." style="font-size:9px" onclick="event.stopPropagation()"></div></div>'
    + '<div id="ihr-step-bar" style="padding:7px 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;flex-shrink:0;overflow-x:auto"></div>'
    + '<div id="ihr-emir-body" style="flex:1;overflow-y:auto;padding:14px 16px"></div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;padding:5px 14px;background:var(--sf);border-top:0.5px solid var(--b);flex-shrink:0;font-size:8px;color:var(--t3)"><span>\ud83d\udd34 Sabit zorunlu</span><span>\ud83d\udd35 Her i\u015flemde</span><span>\ud83d\udfe1 \u015earta ba\u011fl\u0131</span><span>\ud83d\udfe2 Otomatik</span><span>\u25a0 Template</span></div>'
    + '<div id="ihr-emir-footer" style="padding:9px 14px;border-top:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;background:var(--sf);flex-shrink:0"></div>'
    + '</div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
  _emirRenderAdim();
};

window._ihrEmirDoldur = function(d) {
  if (!d) return;
  var _sv = function(id, val) { var el = _g(id); if (el && val !== undefined && val !== null) el.value = val; };
  _sv('ihr-form-tipi', d.form_tipi); _sv('ihr-musteri', d.musteri_id); _sv('ihr-incoterms', d.teslim_sekli);
  _sv('ihr-varis', d.varis_limani); _sv('ihr-gorev-baslangic', d.baslangic_tarihi);
  _sv('ihr-talimat-giren', d.talimat_giren); _sv('ihr-talimat-onaylayan', d.talimat_onaylayan);
  _sv('ihr-gorev-sorumlusu', d.gorev_sorumlusu); _sv('ihr-wa-link', d.whatsapp_link);
  _sv('ihr-wa-hatirlatma', d.whatsapp_hatirlatma); _sv('ihr-gumrukcu', d.gumrukcu_id);
  _sv('ihr-gumrukcu-not', d.gumrukcu_not); _sv('ihr-forwarder', d.forwarder_id);
  _sv('ihr-konteyner', d.konteyner_tipi); _sv('ihr-konsimento-turu', d.konsimento_turu);
  _sv('ihr-konsimento-notify', d.konsimento_notify); _sv('ihr-konsimento-consignee', d.konsimento_consignee);
  _sv('ihr-forwarder-not', d.forwarder_not); _sv('ihr-bl-not', d.bl_ozel_not);
  _sv('ihr-ci-not', d.ci_ozel_not); _sv('ihr-ek-dok-1', d.ek_dok_1); _sv('ihr-ek-dok-2', d.ek_dok_2);
  _sv('ihr-ek-dok-3', d.ek_dok_3); _sv('ihr-ek-dok-4', d.ek_dok_4);
  _sv('ihr-sigorta-durum', d.sigorta_durum); _sv('ihr-sigorta-not', d.sigorta_not);
  _sv('ihr-muhasebeci-not', d.muhasebeci_not); _sv('ihr-tedarikci-not', d.tedarikci_not);
  _sv('ihr-banka-zorunlu', d.banka_zorunlu); _sv('ihr-guncelleme-neden', d.guncelleme_nedeni);
};

window._ihrEmirKaydet = function() {
  var formTipi = _g('ihr-form-tipi')?.value; var musteriId = _g('ihr-musteri')?.value;
  var incoterms = _g('ihr-incoterms')?.value; var varis = (_g('ihr-varis')?.value || '').trim();
  if (!formTipi) { window.toast?.('Form tipi se\u00e7iniz', 'err'); window._ihrEmirAdim = 1; _emirRenderAdim(); return; }
  if (!musteriId) { window.toast?.('M\u00fc\u015fteri se\u00e7iniz', 'err'); window._ihrEmirAdim = 1; _emirRenderAdim(); return; }
  if (!incoterms) { window.toast?.('Teslim \u015fekli se\u00e7iniz', 'err'); window._ihrEmirAdim = 1; _emirRenderAdim(); return; }
  /* IHR-DUZENLE-WIZARD-001: Edit modu — mevcut dosyayi guncelle */
  var _editId = window._ihrEmirEditId || null;
  if (_editId) {
    var dosyalar2 = _loadD(); var de = dosyalar2.find(function(x){ return String(x.id)===String(_editId); });
    if (de) {
      var musteriE = _loadCari().find(function(c){ return String(c.id)===String(musteriId); });
      de.form_tipi = formTipi; de.musteri_id = musteriId; de.musteriAd = musteriE?.name || de.musteriAd;
      de.teslim_sekli = incoterms; de.varis_limani = varis;
      de.talimat_giren = _g('ihr-talimat-giren')?.value || de.talimat_giren;
      de.talimat_onaylayan = _g('ihr-talimat-onaylayan')?.value || de.talimat_onaylayan;
      de.gorev_sorumlusu = _g('ihr-gorev-sorumlusu')?.value || de.gorev_sorumlusu;
      de.whatsapp_link = _g('ihr-wa-link')?.value || de.whatsapp_link;
      de.whatsapp_hatirlatma = _g('ihr-wa-hatirlatma')?.value || de.whatsapp_hatirlatma;
      de.gumrukcu_id = _g('ihr-gumrukcu')?.value || de.gumrukcu_id;
      de.gumrukcu_not = _g('ihr-gumrukcu-not')?.value || de.gumrukcu_not;
      de.forwarder_id = _g('ihr-forwarder')?.value || de.forwarder_id;
      de.konteyner_tipi = _g('ihr-konteyner')?.value || de.konteyner_tipi;
      de.konsimento_turu = _g('ihr-konsimento-turu')?.value || de.konsimento_turu;
      de.konsimento_notify = _g('ihr-konsimento-notify')?.value || de.konsimento_notify;
      de.konsimento_consignee = _g('ihr-konsimento-consignee')?.value || de.konsimento_consignee;
      de.forwarder_not = _g('ihr-forwarder-not')?.value || de.forwarder_not;
      de.bl_ozel_not = _g('ihr-bl-not')?.value || de.bl_ozel_not;
      de.ci_ozel_not = _g('ihr-ci-not')?.value || de.ci_ozel_not;
      de.ek_dok_1 = _g('ihr-ek-dok-1')?.value || de.ek_dok_1;
      de.ek_dok_2 = _g('ihr-ek-dok-2')?.value || de.ek_dok_2;
      de.ek_dok_3 = _g('ihr-ek-dok-3')?.value || de.ek_dok_3;
      de.ek_dok_4 = _g('ihr-ek-dok-4')?.value || de.ek_dok_4;
      de.sigorta_durum = _g('ihr-sigorta-durum')?.value || de.sigorta_durum;
      de.sigorta_not = _g('ihr-sigorta-not')?.value || de.sigorta_not;
      de.muhasebeci_not = _g('ihr-muhasebeci-not')?.value || de.muhasebeci_not;
      de.tedarikci_not = _g('ihr-tedarikci-not')?.value || de.tedarikci_not;
      de.banka_zorunlu = _g('ihr-banka-zorunlu')?.value || de.banka_zorunlu;
      de.guncelleme_nedeni = _g('ihr-guncelleme-neden')?.value || '';
      de.updatedAt = _now(); de.updatedBy = _cu()?.id;
      _storeD(dosyalar2);
      _g('mo-ihr-emir')?.remove();
      window._ihrEmirEditId = null;
      window.toast?.('Dosya g\u00fcncellendi: ' + de.dosyaNo, 'ok');
      window.logActivity?.('ihracat', de.dosyaNo + ' g\u00fcncellendi');
      _aktifDosyaId = de.id; _ihrReRender(); return;
    }
  }
  var musteri = _loadCari().find(function(c) { return String(c.id) === String(musteriId); });
  var baslangic = _g('ihr-gorev-baslangic')?.value || _today();
  var bitis = new Date(baslangic); bitis.setDate(bitis.getDate() + 30);
  var dosya = {
    id: _genId(), dosyaNo: formTipi.toUpperCase().slice(0, 3) + '-' + _today().replace(/-/g, '').slice(2),
    form_tipi: formTipi, musteri_id: musteriId, musteriAd: musteri?.name || '',
    teslim_sekli: incoterms, varis_limani: varis,
    talimat_giren: _g('ihr-talimat-giren')?.value || '', talimat_onaylayan: _g('ihr-talimat-onaylayan')?.value || '',
    gorev_sorumlusu: _g('ihr-gorev-sorumlusu')?.value || '', baslangic_tarihi: baslangic,
    bitis_tarihi: bitis.toISOString().slice(0, 10),
    whatsapp_link: _g('ihr-wa-link')?.value || '', whatsapp_hatirlatma: _g('ihr-wa-hatirlatma')?.value || '',
    gumrukcu_id: _g('ihr-gumrukcu')?.value || '', gumrukcu_not: _g('ihr-gumrukcu-not')?.value || '',
    uyari_mensei: _g('ihr-uyari-mensei')?.value || '', uyari_gcb: _g('ihr-uyari-gcb')?.value || '',
    forwarder_id: _g('ihr-forwarder')?.value || '', konteyner_tipi: _g('ihr-konteyner')?.value || '',
    varis_limani: varis,
    konsimento_turu: _g('ihr-konsimento-turu')?.value || '', konsimento_notify: _g('ihr-konsimento-notify')?.value || '',
    konsimento_consignee: _g('ihr-konsimento-consignee')?.value || '', forwarder_not: _g('ihr-forwarder-not')?.value || '',
    bl_ozel_not: _g('ihr-bl-not')?.value || '', ci_ozel_not: _g('ihr-ci-not')?.value || '',
    ek_dok_1: _g('ihr-ek-dok-1')?.value || '', ek_dok_2: _g('ihr-ek-dok-2')?.value || '',
    ek_dok_3: _g('ihr-ek-dok-3')?.value || '', ek_dok_4: _g('ihr-ek-dok-4')?.value || '',
    inspection_firma: _g('ihr-inspection-firma')?.value || '', inspection_no: _g('ihr-inspection-no')?.value || '',
    evrak_gozetim: _g('ihr-evrak-gozetim')?.value || '',
    sigorta_durum: _g('ihr-sigorta-durum')?.value || '', sigorta_not: _g('ihr-sigorta-not')?.value || '',
    muhasebeci_not: _g('ihr-muhasebeci-not')?.value || '', tedarikci_not: _g('ihr-tedarikci-not')?.value || '',
    banka_zorunlu: _g('ihr-banka-zorunlu')?.value || '',
    guncelleme_nedeni: _g('ihr-guncelleme-neden')?.value || '',
    durum: 'hazirlaniyor', createdAt: _now(), createdBy: _cu()?.id, updatedAt: _now()
  };
  var dL = _loadD(); dL.unshift(dosya); _storeD(dL);
  _g('mo-ihr-emir')?.remove();
  window.toast?.('Dosya a\u00e7\u0131ld\u0131: ' + dosya.dosyaNo, 'ok');
  window.logActivity?.('ihracat', '\u0130hracat dosyas\u0131 a\u00e7\u0131ld\u0131: ' + dosya.dosyaNo);
  _aktifDosyaId = dosya.id; window._ihrAktifDosyaId = dosya.id; window.renderIhracatOps();
};

window._ihrEmirTemplateSec = function() {
  var musteriId = _g('ihr-musteri')?.value;
  var musteriAd = _loadCari().find(function(c) { return String(c.id) === String(musteriId); })?.name || 'Genel';
  var ad = prompt('Template ad\u0131 (' + musteriAd + ' i\u00e7in):');
  if (!ad) return;
  var tplData = { id: _genId(), ad: ad, musteriAd: musteriAd, musteriId: musteriId, form_tipi: _g('ihr-form-tipi')?.value, teslim_sekli: _g('ihr-incoterms')?.value, varis_limani: _g('ihr-varis')?.value, gumrukcu_id: _g('ihr-gumrukcu')?.value, forwarder_id: _g('ihr-forwarder')?.value, konteyner_tipi: _g('ihr-konteyner')?.value, createdAt: _now() };
  var tplList = _loadT(); tplList.unshift(tplData); _storeT(tplList);
  window.toast?.('Template kaydedildi: ' + ad, 'ok');
};

/* ── YARDIMCILAR ─────────────────────────────────────────── */
window._ihrGeriDon = function() { _aktifDosyaId = null; _ihrRenderContent(); };
window._emirRenderAdim = _emirRenderAdim;

/** IHR-OZET-D2-001: Risk skoru hesapla */
function _ihrRiskSkoru(d) {
  var puan = 0;
  var _sigV = !!(d.police_no);
  var gcbL = typeof window.loadIhracatGcb === 'function' ? window.loadIhracatGcb().filter(function(g) { return String(g.dosya_id) === String(d.id) && !g.isDeleted; }) : [];
  var kGun = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
  var evk = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  var tamam2 = evk.filter(function(e) { return e.durum === 'gonderildi' || e.durum === 'tamamlandi'; }).length;
  var ePct = 11 > 0 ? Math.round(tamam2 / 11 * 100) : 0;
  if (!_sigV) puan += 30;
  if (kGun !== null && kGun < 7) puan += 25;
  if (!gcbL.length && !['taslak','kapandi','iptal'].includes(d.durum)) puan += 15;
  if (ePct < 20) puan += 20;
  if (d.konteyner_hacim_m3 && d.konteyner_tipi) {
    var kap = d.konteyner_tipi === '40HC' ? 76 : d.konteyner_tipi === '40DC' ? 67 : d.konteyner_tipi === '20DC' ? 33 : 67;
    if (parseFloat(d.konteyner_hacim_m3) > kap) puan += 10;
  }
  var seviye = puan >= 80 ? 'kritik' : puan >= 50 ? 'yuksek' : puan >= 20 ? 'orta' : 'dusuk';
  return { puan: puan, seviye: seviye };
}

/** IHR-OZET-D2-001: Eylem plani */
function _ihrEylemPlani(d, _gcb1, _sigVar, kalanGun, _evrakPct) {
  var plan = [];
  if (!_sigVar) plan.push({ oncelik: 1, renk: '#DC2626', bg: 'rgba(220,38,38,.06)', mesaj: 'Sigorta poliçesini yükle', altMesaj: 'GÇB ve BL süreci başlayamaz', sekme: 'evraklar' });
  if (d.konteyner_hacim_m3 && d.konteyner_tipi) {
    var kap = d.konteyner_tipi === '40HC' ? 76 : d.konteyner_tipi === '40DC' ? 67 : d.konteyner_tipi === '20DC' ? 33 : 67;
    if (parseFloat(d.konteyner_hacim_m3) > kap) plan.push({ oncelik: 1, renk: '#DC2626', bg: 'rgba(220,38,38,.06)', mesaj: 'Konteyner tipini değiştir', altMesaj: (d.konteyner_tipi || '40DC') + ' kapasitesi yetersiz', sekme: 'urunler' });
  }
  if (!_gcb1 && !['taslak','kapandi','iptal'].includes(d.durum)) plan.push({ oncelik: 2, renk: '#D97706', bg: 'rgba(217,119,6,.06)', mesaj: 'GÇB tescil için gümrükçüyü takip et', altMesaj: 'Gümrükçü sekmesinden iletişim kur', sekme: 'gumrukcu' });
  if (kalanGun !== null && kalanGun < 7 && kalanGun >= 0) plan.push({ oncelik: 2, renk: '#D97706', bg: 'rgba(217,119,6,.06)', mesaj: kalanGun + ' gün kaldı — dosyayı hızlandır', altMesaj: 'Tüm evrakları kontrol et', sekme: 'evraklar' });
  if (_evrakPct < 30) plan.push({ oncelik: 3, renk: '#D97706', bg: 'rgba(217,119,6,.06)', mesaj: 'Evrak tamamlanma %' + _evrakPct + ' — düşük', altMesaj: 'Evraklar sekmesini kontrol et', sekme: 'evraklar' });
  if (!plan.length) plan.push({ oncelik: 3, renk: '#16A34A', bg: 'rgba(22,163,74,.06)', mesaj: 'Kritik sorun yok', altMesaj: 'Dosya iyi durumda', sekme: 'ozet' });
  return plan.slice(0, 4);
}

/** IHR-OZET-D2-001: Finansal ozet */
function _ihrFinansalOzet(d) {
  var fob = 0;
  if (d.fob_deger) { fob = d.fob_deger; }
  else { _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; }).forEach(function(u) { fob += parseFloat(u.miktar || 0) * parseFloat(u.birim_fiyat || 0); }); }
  return {
    fob: fob ? fob.toLocaleString('tr-TR') + ' ' + (d.doviz || 'USD') : '\u2014',
    navlun: d.navlun_tutar ? d.navlun_tutar.toLocaleString('tr-TR') : '\u2014',
    sigorta: d.police_no ? 'Var (' + _esc(d.police_no) + ')' : 'Eksik!',
    marj: d.marj_pct ? '%' + d.marj_pct : '\u2014'
  };
}

function _ihrDetayRenderOzet(d) {
  var c = _g('ihr-detay-content'); if (!c) return;

  /* COCKPIT-FIX-002: Ust bar, timeline ve sekme barini gizle */
  /* ihr-detay-content'in kardes elementlerini bul ve gizle */
  if (c.parentElement) {
    var _siblings = c.parentElement.children;
    for (var _si = 0; _si < _siblings.length; _si++) {
      if (_siblings[_si] !== c) {
        _siblings[_si].setAttribute('style', 'display:none !important');
      }
    }
  }
  /* Content padding'i kaldir — cockpit tam ekran */
  c.setAttribute('style', 'padding:0;margin:0');

  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  var tamam = evraklar.filter(function(e) { return e.durum === 'gonderildi' || e.durum === 'tamamlandi'; }).length;
  var gcbList = _loadG().filter(function(g) { return String(g.dosya_id) === String(d.id) && !g.isDeleted; });
  var blList = _loadBL().filter(function(b) { return String(b.dosya_id) === String(d.id) && !b.isDeleted; });
  var gumrukculer = _loadGM();
  var gm = null; gumrukculer.forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; });
  var forwarderlar = _loadFW();
  var fw = null; forwarderlar.forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; });

  /* Hesaplamalar */
  var _kpiRenk = function(p) { return p >= 80 ? '#16A34A' : p >= 50 ? '#D97706' : '#DC2626'; };
  var _kalanRenk = function(g) { return g === null ? 'var(--t3)' : g < 0 ? '#DC2626' : g < 7 ? '#DC2626' : g < 15 ? '#D97706' : '#16A34A'; };
  var kalanGun = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date()) / 86400000) : null;
  var kambiyo = window._ihrKambiyo90?.(d.id);
  var _dUrunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; });
  var _hsPct = _dUrunler.length > 0 ? Math.round(_dUrunler.filter(function(u) { return !!u.hs_kodu; }).length / _dUrunler.length * 100) : 0;

  var EVRAK_LISTESI = [
    { tur: 'PI',    l: 'Proforma Invoice',     uretici: 'Duay',      alici: 'M\u00fc\u015fteri',               kim: 'duay' },
    { tur: 'CI',    l: 'Commercial Invoice',    uretici: 'Duay',      alici: 'M\u00fc\u015fteri',               kim: 'duay' },
    { tur: 'PL',    l: 'Packing List',          uretici: 'Duay',      alici: 'G\u00fcmr\u00fck\u00e7\u00fc \u00b7 FW \u00b7 M\u00fc\u015fteri', kim: 'duay' },
    { tur: 'SEVK',  l: 'Sevk Emri',             uretici: 'Duay',      alici: 'Forwarder',              kim: 'duay' },
    { tur: 'YUK',   l: 'Y\u00fckleme Talimat\u0131',      uretici: 'Duay',      alici: 'Forwarder',              kim: 'duay' },
    { tur: 'GCB',   l: 'G\u00c7B',                   uretici: 'G\u00fcmr\u00fck\u00e7\u00fc',  alici: 'Duay > Forwarder',       kim: 'dis' },
    { tur: 'BL',    l: 'Bill of Lading',         uretici: 'Forwarder', alici: 'Duay > M\u00fc\u015fteri',         kim: 'dis' },
    { tur: 'MENSEI',l: 'Men\u015fei \u015eahadetnamesi',   uretici: 'G\u00fcmr\u00fck\u00e7\u00fc',  alici: 'Duay > M\u00fc\u015fteri',         kim: 'dis' },
    { tur: 'EUR1',  l: 'EUR.1 / A.TR',           uretici: 'G\u00fcmr\u00fck\u00e7\u00fc',  alici: 'Duay > M\u00fc\u015fteri',         kim: 'dis' },
    { tur: 'INSP',  l: 'Inspection Raporu',      uretici: 'G\u00f6zetim',   alici: 'Duay > M\u00fc\u015fteri',         kim: 'dis' },
    { tur: 'TRFAT', l: 'TR \u0130hracat Faturas\u0131',   uretici: 'Duay',      alici: 'G\u00fcmr\u00fck\u00e7\u00fc',              kim: 'duay' },
    { tur: 'TTF',   l: 'Teklif Talep Formu',    uretici: 'Duay',      alici: 'FW \u00b7 Sig. \u00b7 \u0130\u00e7 Nakliye',   kim: 'duay' },
    { tur: 'SIG',   l: 'Sigorta Poli\u00e7esi',       uretici: 'Sigorta',   alici: 'Duay',                   kim: 'dis' }
  ];
  var _evrakPct = EVRAK_LISTESI.length > 0 ? Math.round(tamam / EVRAK_LISTESI.length * 100) : 0;
  var _saglikPct = Math.round((_hsPct + _evrakPct) / 2);
  var _saglikRenk = _kpiRenk(_saglikPct);
  var _gcb1 = gcbList[0];
  var _sigVar = !!(d.police_no);
  var dosyaAsama = parseInt(d.asamaNo || d.asama || 1) || 1;
  var durumObj = DOSYA_DURUM[d.durum] || DOSYA_DURUM.taslak;

  /* Pipeline adimlar */
  var _akisAdimlar = [
    { tur: 'PI', l: 'PI', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'PI\',null)', btnL: 'PI' },
    { tur: 'CI', l: 'CI', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'CI\',null)', btnL: 'CI' },
    { tur: 'PL', l: 'PL', fn: 'window._ihrPdfOnizle(\'' + d.id + '\',\'PL\',null)', btnL: 'PL' },
    { tur: 'GCB', l: 'G\u00c7B', fn: 'window._ihrGcbEkle(\'' + d.id + '\')', btnL: 'G\u00c7B', custom: function() { return gcbList.length > 0; } },
    { tur: 'BL', l: 'BL', fn: 'window._ihrBlEkle(\'' + d.id + '\')', btnL: 'BL', custom: function() { return blList.length > 0; } },
    { tur: 'KAPAT', l: 'Kapat', fn: '', btnL: '', custom: function() { return d.durum === 'kapandi'; } }
  ];
  var _evrakDurum = function(tur) {
    if (tur === 'GCB' || tur === 'BL' || tur === 'KAPAT') return null;
    var ev = evraklar.find(function(e) { return e.tur === tur; });
    return ev ? ev.durum : null;
  };

  /* Kesin px yukseklik — Safari calc() sorunu icin */
  /* Runtime'da kalan alani hesapla: content div'in ustundeki her seyi olc */
  var _cockpitH = window.innerHeight;
  if (c && c.getBoundingClientRect) {
    _cockpitH = window.innerHeight - Math.round(c.getBoundingClientRect().top);
  }
  if (_cockpitH < 340) _cockpitH = 340;

  /* ═══════════════════════════════════════════════════════════
     IHR-COCKPIT-V2-001 — 3 kolon C tasarimi
     ═══════════════════════════════════════════════════════════ */
  var _riskSkor = _ihrRiskSkoru(d);
  var _eylemPlan = _ihrEylemPlani(d, _gcb1, _sigVar, kalanGun, _evrakPct);
  var _uyarilarC = _ihrHesaplaUyarilar(d);
  var _finOzet = _ihrFinansalOzet(d);

  var h = '<div id="ihr-cockpit-' + d.id + '" style="display:flex;flex-direction:column;height:' + _cockpitH + 'px;overflow:hidden;background:var(--s2);border-radius:0 0 8px 8px">';

  /* ═══ BOLUM 1 — HERO ═══════════════════════════════════════ */
  h += '<div style="background:#0C2340;padding:10px 14px;flex-shrink:0;display:flex;align-items:center;gap:10px">';
  h += '<button onclick="event.stopPropagation();window._ihrGeriDon()" style="font-size:9px;padding:3px 8px;border-radius:4px;border:0.5px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-family:inherit">\u2190</button>';
  h += '<span style="font-size:13px;font-weight:700;color:#fff;font-family:monospace">' + _esc(d.dosyaNo || '') + '</span>';
  h += '<span style="font-size:11px;color:rgba(255,255,255,.55);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(d.musteriAd || '') + '</span>';
  h += '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:' + durumObj.bg + ';color:' + durumObj.c + '">' + _esc(durumObj.l) + '</span>';
  if (kalanGun !== null && kalanGun < 7) h += '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(220,38,38,.25);color:#FCA5A5">Biti\u015f: ' + kalanGun + 'g !</span>';
  if (d.teslim_sekli) h += '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(24,95,165,.25);color:#93C5FD">' + _esc(d.teslim_sekli) + (d.varis_limani ? ' \u00b7 ' + _esc(d.varis_limani) : '') + '</span>';
  h += '<div style="margin-left:auto;display:flex;gap:4px">';
  var _hBtnS = 'font-size:9px;padding:3px 7px;border-radius:4px;border:0.5px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-family:inherit';
  h += '<button onclick="event.stopPropagation();window._ihrDosyaDuzenle?.(\'' + d.id + '\')" style="' + _hBtnS + '">D\u00fczenle</button>';
  h += '<button onclick="event.stopPropagation();window._ihrKlon?.(\'' + d.id + '\')" style="' + _hBtnS + '">Klonla</button>';
  if (_isManager()) h += '<button onclick="event.stopPropagation();window._ihrDurumDegistir?.(\'' + d.id + '\')" style="' + _hBtnS + ';border-color:rgba(76,175,80,.4);color:#81C784">Durum</button>';
  h += '</div></div>';

  /* ═══ BOLUM 2 — SUREC BANDI ══════════════════════════════ */
  var _surecAdimlar = [
    { k:'taslak', l:'Taslak' }, { k:'hazirlaniyor', l:'Teklif' }, { k:'yukleniyor', l:'Teslim' },
    { k:'yolda', l:'G\u00c7B' }, { k:'teslim', l:'Y\u00fckleme' }, { k:'kapandi', l:'Kapand\u0131' }
  ];
  var _durumSira = { taslak:1, hazirlaniyor:2, yukleniyor:3, yolda:4, teslim:5, kapandi:6, iptal:0 };
  var _aktifSira = _durumSira[d.durum] || 1;
  h += '<div style="background:#0f2b44;padding:7px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:0;flex-shrink:0">';
  _surecAdimlar.forEach(function(a, idx) {
    var sira = idx + 1;
    var tamamlandi = sira < _aktifSira;
    var aktif = sira === _aktifSira;
    var dotBg = tamamlandi ? '#16A34A' : aktif ? '#fff' : 'rgba(255,255,255,.08)';
    var dotClr = tamamlandi ? '#fff' : aktif ? '#185FA5' : 'rgba(255,255,255,.3)';
    var dotBorder = tamamlandi || aktif ? 'none' : '1px solid rgba(255,255,255,.1)';
    h += '<div style="display:flex;flex-direction:column;align-items:center;gap:2px">';
    h += '<div style="width:22px;height:22px;border-radius:50%;background:' + dotBg + ';color:' + dotClr + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:' + dotBorder + '">' + (tamamlandi ? '\u2713' : sira) + '</div>';
    h += '<div style="font-size:7.5px;color:' + (aktif ? '#fff' : 'rgba(255,255,255,.35)') + ';' + (aktif ? 'font-weight:600' : '') + '">' + a.l + '</div>';
    h += '</div>';
    if (idx < _surecAdimlar.length - 1) h += '<div style="flex:1;height:1px;background:' + (tamamlandi ? '#16A34A' : 'rgba(255,255,255,.1)') + ';margin:0 4px"></div>';
  });
  h += '</div>';

  /* ═══ BOLUM 3 — SEKMELER ═════════════════════════════════ */
  h += '<div style="background:var(--sf);border-bottom:0.5px solid var(--b);display:flex;padding:0 0 0 200px;flex-shrink:0">';
  var _sekmeler2 = [{ id:'ozet',l:'\u00d6zet' },{ id:'urunler',l:'\u00dcr\u00fcnler' },{ id:'evraklar',l:'Evraklar' }];
  _sekmeler2.forEach(function(s) {
    var aktifS = s.id === 'ozet';
    h += '<div onclick="event.stopPropagation();window._ihrDetayTab(\'' + s.id + '\',\'' + d.id + '\')" style="padding:8px 14px;font-size:11px;cursor:pointer;border-bottom:2px solid ' + (aktifS ? 'var(--ac)' : 'transparent') + ';color:' + (aktifS ? 'var(--ac)' : 'var(--t2)') + ';font-weight:' + (aktifS ? '500' : '400') + '">' + s.l + '</div>';
  });
  h += '<div style="margin-left:auto;padding:0 12px;display:flex;gap:5px;align-items:center">';
  h += '<button onclick="event.stopPropagation();window._ihrImportDocs?.(\'' + d.id + '\')" title="Tedarik\u00e7i faturas\u0131ndan \u00fcr\u00fcnleri i\u00e7e aktar\u0131r" style="font-size:9px;padding:3px 8px;border:0.5px solid #B5D4F4;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">Import Docs</button>';
  h += '</div></div>';

  /* ═══ BOLUM 4 — 3 KOLON ANA ALAN ═════════════════════════ */
  h += '<div style="flex:1;display:grid;grid-template-columns:200px 1fr 210px;overflow:hidden">';

  /* ── KOLON 1 — Sol Panel ──────────────────────────────────── */
  h += '<div style="border-right:0.5px solid var(--b);background:var(--sf);overflow-y:auto;display:flex;flex-direction:column">';
  /* A — Dosya Bilgisi */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">DOSYA B\u0130LG\u0130S\u0130</div>';
  var _bSatir = 'display:flex;justify-content:space-between;padding:3px 0;font-size:10px;border-bottom:0.5px solid var(--b)';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">M\u00fc\u015fteri</span><span style="font-weight:500;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(d.musteriAd || '\u2014') + '</span></div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Teslim</span><span style="font-weight:500">' + (d.teslim_sekli ? '<span style="color:#185FA5">' + _esc(d.teslim_sekli) + '</span>' : '') + '</span></div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">\u00d6deme</span><span style="font-weight:500">' + _esc(d.odeme_sarti || '\u2014') + '</span></div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Konteyner</span><span style="font-weight:500">' + _esc(d.konteyner_tipi || '\u2014') + '</span></div>';
  var _bBitisRenk = kalanGun !== null && kalanGun < 7 ? '#DC2626;font-weight:700' : 'var(--t)';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Biti\u015f</span><span style="color:' + _bBitisRenk + '">' + _esc(d.bitis_tarihi || '\u2014') + '</span></div>';
  h += '</div>';
  /* B — Finansal */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">F\u0130NANSAL</div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">FOB</span><span style="font-weight:500">' + _esc(_finOzet.fob) + '</span></div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Navlun</span><span style="font-weight:500">' + _esc(_finOzet.navlun) + '</span></div>';
  var _sigRenk = _finOzet.sigorta === 'Eksik!' ? 'color:#DC2626;font-weight:700' : 'font-weight:500';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Sigorta</span><span style="' + _sigRenk + '">' + _esc(_finOzet.sigorta) + '</span></div>';
  h += '<div style="' + _bSatir + '"><span style="color:var(--t3)">Marj</span><span style="font-weight:500">' + _esc(_finOzet.marj) + '</span></div>';
  h += '</div>';
  /* C — Paydas Tamamlanma */
  h += '<div style="padding:10px 12px;flex:1">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">PAYDA\u015e TAMAMLANMA</div>';
  [{k:'musteri',l:'M\u00fc\u015fteri'},{k:'sigortaci',l:'Sigortac\u0131'},{k:'gumrukcu',l:'G\u00fcmr\u00fck\u00e7\u00fc'},{k:'forwarder',l:'Forwarder'}].forEach(function(p) {
    var pp = window._ihrPaydasPct?.(d.id, p.k) || { pct: 0 };
    var pct = pp.pct || 0;
    var barRenk = pct === 0 ? '#DC2626' : pct < 50 ? '#D97706' : '#185FA5';
    h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px"><span style="color:var(--t2)">' + p.l + '</span><span style="color:' + barRenk + '">%' + pct + '</span></div>';
    h += '<div style="height:3px;background:var(--b);border-radius:2px"><div style="height:3px;border-radius:2px;background:' + barRenk + ';width:' + pct + '%"></div></div></div>';
  });
  h += '</div>';
  h += '</div>'; /* sol panel bitti */

  /* ── KOLON 2 — Orta Esnek Alan ───────────────────────────── */
  h += '<div style="padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:10px">';
  /* 2A — 4 Alarm Karti */
  var _kritikSay = _uyarilarC.length;
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">';
  h += '<div style="border-radius:8px;padding:9px 10px;background:#FEF2F2;border:0.5px solid #FECACA"><div style="font-size:7.5px;font-weight:700;letter-spacing:.5px;color:#DC2626;margin-bottom:2px">KR\u0130T\u0130K</div><div style="font-size:20px;font-weight:800;color:#DC2626">' + _kritikSay + '</div><div style="font-size:8.5px;color:#991B1B;line-height:1.3;margin-top:3px">' + (_uyarilarC[0] || '\u2014') + '</div></div>';
  h += '<div style="border-radius:8px;padding:9px 10px;background:#FFFBEB;border:0.5px solid #FDE68A"><div style="font-size:7.5px;font-weight:700;letter-spacing:.5px;color:#D97706;margin-bottom:2px">UYARI</div><div style="font-size:20px;font-weight:800;color:#D97706">' + (!_gcb1 ? 1 : 0) + '</div><div style="font-size:8.5px;color:#92400E;line-height:1.3;margin-top:3px">' + (!_gcb1 ? 'G\u00c7B bekleniyor' : '\u2014') + '</div></div>';
  var _iyiSay = (_hsPct >= 80 ? 1 : 0) + (_gcb1 ? 1 : 0) + (blList.length > 0 ? 1 : 0);
  h += '<div style="border-radius:8px;padding:9px 10px;background:#EAF3DE;border:0.5px solid #C0DD97"><div style="font-size:7.5px;font-weight:700;letter-spacing:.5px;color:#16A34A;margin-bottom:2px">\u0130Y\u0130</div><div style="font-size:20px;font-weight:800;color:#16A34A">' + _iyiSay + '</div><div style="font-size:8.5px;color:#166534;line-height:1.3;margin-top:3px">' + (_hsPct >= 80 ? 'HS iyi' : '') + (_gcb1 ? ' G\u00c7B var' : '') + '</div></div>';
  var _riskRenk2 = { kritik:'#DC2626', yuksek:'#D97706', orta:'#D97706', dusuk:'#16A34A' };
  h += '<div style="border-radius:8px;padding:9px 10px;background:#0C2340;border:0.5px solid #0C2340"><div style="font-size:7.5px;font-weight:700;letter-spacing:.5px;color:rgba(255,255,255,.5);margin-bottom:2px">R\u0130SK SKORU</div><div style="font-size:20px;font-weight:800;color:' + (_riskRenk2[_riskSkor.seviye] || '#fff') + '">' + _riskSkor.puan + '</div><div style="font-size:8.5px;color:rgba(255,255,255,.5);margin-top:3px">' + ({kritik:'Kritik',yuksek:'Y\u00fcksek',orta:'Orta',dusuk:'D\u00fc\u015f\u00fck'}[_riskSkor.seviye] || '') + '</div></div>';
  h += '</div>';

  /* 2B — Eylem Plani */
  h += '<div style="background:var(--sf);border-radius:8px;border:0.5px solid var(--b);overflow:hidden">';
  h += '<div style="padding:7px 12px;border-bottom:0.5px solid var(--b);font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3)">EYLEM PLANI</div>';
  _eylemPlan.forEach(function(ep) {
    h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--b)">';
    h += '<div style="width:3px;height:32px;border-radius:2px;background:' + ep.renk + ';flex-shrink:0"></div>';
    h += '<div style="flex:1"><div style="font-size:10px;font-weight:500">' + ep.mesaj + '</div><div style="font-size:8.5px;color:var(--t3)">' + ep.altMesaj + '</div></div>';
    h += '<span onclick="event.stopPropagation();window._ihrDetayTab(\'' + ep.sekme + '\',\'' + d.id + '\')" style="font-size:10px;color:#185FA5;cursor:pointer">Git \u2192</span>';
    h += '</div>';
  });
  h += '</div>';

  /* 2C — Hizli Iletisim */
  h += '<div style="background:var(--sf);border-radius:8px;border:0.5px solid var(--b);padding:10px 12px">';
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:7px">HIZLI \u0130LET\u0130\u015e\u0130M</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">';
  var _ileBtns = [
    { k:'gumrukcu', ad: gm ? (gm.firma_adi || 'G\u00fcmr\u00fck\u00e7\u00fc') : 'Atanmam\u0131\u015f', atandi: !!gm, renk:'#185FA5' },
    { k:'forwarder', ad: fw ? (fw.firma_adi || 'Forwarder') : 'Atanmam\u0131\u015f', atandi: !!fw, renk:'#185FA5' },
    { k:'musteri', ad:'M\u00fc\u015fteri', atandi:true, renk:'#16A34A' },
    { k:'sigortaci', ad: _sigVar ? 'Sigortac\u0131' : 'Sigorta YOK!', atandi: _sigVar, renk: _sigVar ? '#185FA5' : '#DC2626' }
  ];
  _ileBtns.forEach(function(b) {
    var cardBg = b.atandi ? 'var(--s2)' : (b.k === 'sigortaci' ? '#FCEBEB' : 'var(--s2)');
    var cardBorder = b.atandi ? 'var(--b)' : (b.k === 'sigortaci' ? '#FECACA' : 'var(--b)');
    h += '<div onclick="event.stopPropagation();window._ihrDetayTab(\'' + b.k + '\',\'' + d.id + '\')" style="padding:5px 8px;border-radius:6px;border:0.5px solid ' + cardBorder + ';background:' + cardBg + ';display:flex;align-items:center;gap:6px;cursor:pointer">';
    var initials = b.ad.split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
    h += '<div style="width:22px;height:22px;border-radius:50%;background:' + b.renk + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;flex-shrink:0">' + initials + '</div>';
    h += '<div><div style="font-size:9px;font-weight:500;color:' + (b.atandi ? 'var(--t)' : '#DC2626') + '">' + _esc(b.ad) + '</div></div>';
    h += '</div>';
  });
  h += '</div></div>';
  h += '</div>'; /* orta alan bitti */

  /* ── KOLON 3 — Sag Panel ─────────────────────────────────── */
  h += '<div style="border-left:0.5px solid var(--b);background:var(--sf);overflow-y:auto;display:flex;flex-direction:column">';
  /* 3A — Evraklar */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">EVRAKLAR (' + tamam + '/' + EVRAK_LISTESI.length + ')</div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px">';
  EVRAK_LISTESI.forEach(function(ev) {
    var kayit = evraklar.find(function(e) { return e.tur === ev.tur && !e.isDeleted; });
    var pillBg, pillClr;
    if (kayit && (kayit.durum === 'gonderildi' || kayit.durum === 'tamamlandi')) { pillBg = '#EAF3DE'; pillClr = '#27500A'; }
    else if (kayit) { pillBg = '#FAEEDA'; pillClr = '#854F0B'; }
    else { pillBg = 'var(--s2)'; pillClr = 'var(--t3)'; }
    h += '<span style="font-size:8px;padding:2px 7px;border-radius:10px;font-weight:500;background:' + pillBg + ';color:' + pillClr + '">' + (kayit && (kayit.durum === 'gonderildi' || kayit.durum === 'tamamlandi') ? '\u2713 ' : '') + ev.tur + '</span>';
  });
  h += '</div>';
  h += '<div style="height:3px;background:var(--b);border-radius:2px"><div style="height:3px;border-radius:2px;background:' + _kpiRenk(_evrakPct) + ';width:' + _evrakPct + '%"></div></div>';
  h += '<div style="font-size:8.5px;color:var(--t3);margin-top:3px">%' + _evrakPct + ' tamamland\u0131</div>';
  h += '</div>';

  /* 3B — Kambiyo */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">KAMB\u0130YO 90 G\u00dcN</div>';
  if (kambiyo) {
    var kRenk = kambiyo.durum === 'gecmis' || kambiyo.durum === 'kritik' ? '#DC2626' : kambiyo.durum === 'uyari' ? '#D97706' : '#16A34A';
    if (kambiyo.odenmis) { h += '<div style="font-size:16px;font-weight:700;color:#16A34A">\u00d6dendi \u2713</div>'; }
    else { h += '<div style="font-size:16px;font-weight:700;color:' + kRenk + '">' + kambiyo.kalanGun + 'g</div>'; }
    h += '<div style="display:flex;justify-content:flex-end;margin-top:4px"><button onclick="event.stopPropagation();window._ihrKambiyoOde?.(\'' + d.id + '\')" style="font-size:8px;padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">' + (kambiyo.odenmis ? 'Geri Al' : '\u00d6dendi') + '</button></div>';
  } else {
    h += '<div style="font-size:9px;color:var(--t3);line-height:1.5">G\u00c7B a\u00e7\u0131lmadan kambiyo s\u00fcresi ba\u015flam\u0131yor.</div>';
    h += '<div style="background:#FAEEDA;border-radius:5px;padding:5px 8px;font-size:8.5px;color:#854F0B;margin-top:6px">\u23f1 G\u00c7B bekleniyor</div>';
  }
  h += '</div>';

  /* 3C — Hizli Aksiyonlar */
  h += '<div style="padding:10px 12px;flex:1">';
  h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:7px">HIZLI AKS\u0130YONLAR</div>';
  h += '<div style="display:flex;flex-direction:column;gap:5px">';
  var _aksBtnS = 'padding:6px 10px;border-radius:6px;border:0.5px solid var(--b);font-size:10px;cursor:pointer;text-align:left;font-family:inherit;background:transparent;color:var(--t2)';
  if (!_sigVar) h += '<button onclick="event.stopPropagation();window._ihrDetayTab(\'sigortaci\',\'' + d.id + '\')" style="' + _aksBtnS + ';background:#FCEBEB;border-color:#FECACA;color:#DC2626">Sigorta Ekle \u2192</button>';
  if (!_gcb1) h += '<button onclick="event.stopPropagation();window._ihrGcbEkle?.(\'' + d.id + '\')" style="' + _aksBtnS + '">G\u00c7B Ekle \u2192</button>';
  h += '<button onclick="event.stopPropagation();window._ihrEvrakEkle?.(\'' + d.id + '\')" style="' + _aksBtnS + '">Evrak Y\u00fckle \u2192</button>';
  h += '<button onclick="event.stopPropagation();window._ihrBelgeUret?.(\'' + d.id + '\',\'CI\')" style="' + _aksBtnS + '">Belge \u00dcret \u2192</button>';
  h += '</div></div>';
  h += '</div>'; /* sag panel bitti */
  h += '</div>'; /* 3 kolon bitti */

  /* ═══ BOLUM 5 — BOTTOM BAR ═══════════════════════════════ */
  h += '<div style="background:#0C2340;padding:7px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0">';
  var _bbS = 'font-size:9px;color:rgba(255,255,255,.55)';
  h += '<span style="' + _bbS + '">Kalan: <strong style="color:' + (kalanGun !== null && kalanGun < 7 ? '#FCA5A5' : '#fff') + '">' + (kalanGun !== null ? kalanGun + 'g' : '\u2014') + '</strong></span>';
  if (d.gemi_etd) h += '<span style="' + _bbS + '">ETD: <strong style="color:#fff">' + _esc(d.gemi_etd) + '</strong></span>';
  if (_gcb1 && _gcb1.tescil_tarihi) h += '<span style="' + _bbS + '">G\u00c7B: <strong style="color:#fff">' + _esc(_gcb1.tescil_tarihi) + '</strong></span>';
  h += '<div style="margin-left:auto;display:flex;gap:6px;align-items:center">';
  EVRAK_LISTESI.slice(0, 6).forEach(function(ev) {
    var kayit = evraklar.find(function(e) { return e.tur === ev.tur && !e.isDeleted; });
    var pClr = kayit && (kayit.durum === 'gonderildi' || kayit.durum === 'tamamlandi') ? '#16A34A' : kayit ? '#D97706' : 'rgba(255,255,255,.2)';
    h += '<span style="font-size:8px;padding:1px 6px;border-radius:8px;background:' + pClr + ';color:#fff">' + ev.tur + '</span>';
  });
  h += '</div></div>';

  h += '</div>'; /* cockpit wrapper bitti */

  /* ── Eski layout kaldirildi (IHR-COCKPIT-V2-001) ── */
  c.innerHTML = h;

  /* Overflow kontrol — gelistirme sırasında tasmayı konsola bildirir */
  setTimeout(function() {
    var cockpit = document.getElementById('ihr-cockpit-' + d.id);
    if (!cockpit) return;
    var actual = cockpit.scrollHeight;
    var allowed = cockpit.offsetHeight;
    if (actual > allowed + 2) {
      console.warn('[COCKPIT] tasma tespit edildi: ' + actual + 'px > ' + allowed + 'px');
    }
  }, 100);
}

window._ihrDetayTab = function(tab, id) {
  var d = _loadD().find(function(x) { return String(x.id) === String(id); }); if (!d) return;

  /* COCKPIT-FIX-002: Cockpit disindaki sekmelere gecerken gizlenen elementleri geri getir */
  if (tab !== 'ozet') {
    var _cc = _g('ihr-detay-content');
    if (_cc && _cc.parentElement) {
      var _sibs = _cc.parentElement.children;
      for (var _ri = 0; _ri < _sibs.length; _ri++) {
        _sibs[_ri].removeAttribute('style');
      }
    }
    if (_cc) _cc.setAttribute('style', 'padding:0;overflow-y:auto;height:100%');
  }

  /* IHR-NAV-001: Eski paydas sekme id'lerini yonlendir */
  if (tab === 'musteri' || tab === 'sigortaci' || tab === 'gumrukcu' || tab === 'forwarder') tab = 'paydas';
  document.querySelectorAll('#ihr-detay-tabs > div').forEach(function(b) { b.style.borderBottomColor = 'transparent'; b.style.color = 'var(--t2)'; b.style.fontWeight = '400'; });
  var active = _g('ihr-dt-' + tab); if (active) { active.style.borderBottomColor = 'var(--ac)'; active.style.color = 'var(--ac)'; active.style.fontWeight = '500'; }
  var c = _g('ihr-detay-content'); if (!c) return;
  if (tab === 'ozet') { _ihrDetayRenderOzet(d); return; }
  if (tab === 'urunler') { _ihrDetayRenderUrunler(d, c); return; }
  if (tab === 'evraklar') { window._ihrDetayRenderEvraklar(d, c); return; }
  if (tab === 'paydas') { window._ihrRenderPaydas?.(c, id); return; }
  if (tab === 'mutabakat') { window._ihrDetayRenderMutabakat?.(d, c); return; }
  if (tab === 'kapat') { window._ihrDetayRenderKapat?.(d, c); return; }
  if (tab === 'musteri') { window._ihrDetayRenderMusteri(d, c); return; }
  if (tab === 'sigortaci') { window._ihrDetayRenderSigortaci(d, c); return; }
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
window._ihrAktifDosyaId = null;
/* _aktifDosyaId değişince window'u güncelle */
var _origAcDosya = _ihrAcDosya;
function _ihrAcDosyaWrapped(id) { _origAcDosya(id); window._ihrAktifDosyaId = _aktifDosyaId; }
window._ihrAcDosya = _ihrAcDosyaWrapped;
window._ihrRenderDosyaDetay = _ihrRenderDosyaDetay;
window._ihrRenderContent = _ihrRenderContent;
window._ihrDetayRenderOzet = _ihrDetayRenderOzet;
// IHR-DASHBOARD-V2-FIX-001: cross-IIFE scope export
window._ihrRiskSkoru = _ihrRiskSkoru;
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
/* IHR-HS-FILTER-001: HS eksik filtre toggle */
window._ihrHsFilter = function(dosyaId) {
  if (window.__ihrHsFilterAktif) {
    window.__ihrHsFilterAktif = false;
    window._ihrUrunAramaQ = '';
  } else {
    window.__ihrHsFilterAktif = true;
    window._ihrUrunAramaQ = '__HS_EKSIK__';
  }
  window._ihrDetayTab('urunler', dosyaId);
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
    if (_aramaQ === '__HS_EKSIK__') { return !u.hs_kodu; }
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
  var _dosyaId = d.id;
  var faturaTuruGrup = {};
  tumurunler.forEach(function(u) { var ft = u.fatura_turu || 'Tanımsız'; if (!faturaTuruGrup[ft]) faturaTuruGrup[ft] = 0; faturaTuruGrup[ft] += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); });

  h += '<div style="display:flex;flex-direction:column">';
  /* Aktif Dosya Bar (URUN-SOL-PANEL-001) */
  h += '<div style="display:flex;align-items:center;gap:8px;padding:0 12px;background:#042C53;height:30px;flex-shrink:0">';
  h += '<span style="font-size:8px;color:rgba(255,255,255,.4)">Aktif:</span>';
  h += '<span style="font-size:9px;color:#85B7EB;font-weight:600;font-family:monospace">' + _esc(d.dosyaNo || '') + '</span>';
  h += '<span style="color:rgba(255,255,255,.15)">\u00b7</span>';
  h += '<span style="font-size:8px;color:rgba(255,255,255,.5);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(d.musteriAd || '') + '</span>';
  h += '<div style="width:1px;height:14px;background:rgba(255,255,255,.1)"></div>';
  h += '<input id="ihr-nav-ara" placeholder="Dosya ara..." oninput="event.stopPropagation();window._ihrNavAra?.(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:8px;padding:2px 7px;border-radius:3px;border:0.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:rgba(255,255,255,.6);width:160px;font-family:inherit">';
  h += '<button onclick="event.stopPropagation();window._ihrDosyaAraModal?.()" title="Farkl\u0131 bir ihracat dosyas\u0131na ge\u00e7" style="font-size:8px;padding:2px 7px;border:0.5px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.55);border-radius:3px;cursor:pointer;font-family:inherit">De\u011fi\u015ftir \u25be</button>';
  h += '<span style="font-size:7px;color:rgba(255,255,255,.2);margin-left:auto">Sadece bu dosyan\u0131n \u00fcr\u00fcnleri</span>';
  h += '</div>';
  h += '<div style="position:sticky;top:0;z-index:20;background:var(--sf)">';

  /* SATIR 1: Kimlik + KPI + Büyük Aksiyonlar (30px) */
  h += '<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--sf);border-bottom:0.5px solid var(--b);min-height:30px;flex-wrap:nowrap;overflow:hidden">';
  /* Sol grup */
  h += '<div style="flex-shrink:0;display:flex;gap:6px;align-items:center">';
  h += '<span style="font-size:13px;font-family:monospace;color:#185FA5;font-weight:700;letter-spacing:-.3px">' + _esc(d.dosyaNo || '') + '</span><span style="font-size:9px;color:var(--t3);margin-left:4px">' + _esc(d.musteriAd||'') + '</span>';
  h += '<div style="width:1px;height:14px;background:var(--b);flex-shrink:0"></div>';
  h += '<span style="font-size:10px;font-weight:500;color:var(--t)">' + urunler.length + '/' + tumurunler.length + ' kalem</span>';
  h += '</div>';
  /* Orta grup — KPI pill'ler */
  h += '<div style="flex:1;display:flex;gap:4px;align-items:center;overflow:hidden">';
  if (toplamKoli > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:var(--s2);color:var(--t2);white-space:nowrap">' + toplamKoli.toLocaleString('tr-TR') + ' koli</span>';
  if (toplamBrut > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:var(--s2);color:var(--t2);white-space:nowrap">' + toplamBrut.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' kg</span>';
  if (toplamM3 > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:var(--s2);color:var(--t2);white-space:nowrap">' + toplamM3.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' m\u00b3</span>';
  if (toplamUSD > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#E6F1FB;color:#0C447C;font-weight:500;white-space:nowrap">$' + toplamUSD.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + '</span>';
  if (toplamEUR > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#EAF3DE;color:#27500A;font-weight:500;white-space:nowrap">\u20ac' + toplamEUR.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + '</span>';
  if (eksikHs > 0) { var _hsAktif = !!window.__ihrHsFilterAktif; h += '<button onclick="event.stopPropagation();window._ihrHsFilter?.(\'' + _dosyaId + '\')" style="font-size:9px;padding:1px 7px;border-radius:10px;background:' + (_hsAktif ? '#DC2626' : '#FEF2F2') + ';color:' + (_hsAktif ? '#fff' : '#991B1B') + ';white-space:nowrap;border:none;cursor:pointer;font-family:inherit" title="T\u0131kla: HS eksik \u00fcr\u00fcnleri filtrele">' + (_hsAktif ? '\u2715 ' : '') + 'HS Eksik: ' + eksikHs + '</button>'; }
  if (tutarsizSayi > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#FAEEDA;color:#633806;white-space:nowrap">Tutarsız: ' + tutarsizSayi + '</span>';
  for (var ftk in faturaTuruGrup) { if (faturaTuruGrup[ftk] > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#EEEDFE;color:#26215C;white-space:nowrap">' + _esc(ftk.slice(0, 15)) + ': $' + Math.round(faturaTuruGrup[ftk]).toLocaleString('tr-TR') + '</span>'; }
  h += '</div>';
  /* Sag grup — büyük aksiyonlar */
  h += '<div style="flex-shrink:0;display:flex;gap:3px;align-items:center">';
  h += '<button onclick="event.stopPropagation();window._ihrTab(\'dashboard\')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid rgba(24,95,165,.3);background:#E6F1FB;color:#0C447C;cursor:pointer;font-family:inherit">\u2190 Dashboard</button>';
  h += '<div style="width:1px;height:16px;background:var(--b)"></div>';
  var _abS = 'font-size:9px;padding:2px 7px;border-radius:4px;border:0.5px solid var(--b);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)';
  h += '<button onclick="event.stopPropagation();window._ihrUrunExcel(\'' + _dosyaId + '\')" style="' + _abS + '">XLSX</button>';
  h += '<button onclick="event.stopPropagation();window._ihrDogrula(\'' + _dosyaId + '\')" style="' + _abS + '">Do\u011frula</button>';
  h += '<div style="width:1px;height:16px;background:var(--b)"></div>';
  h += '<button onclick="event.stopPropagation();window._ihrUrunEkle(\'' + _dosyaId + '\')" style="font-size:9px;padding:2px 10px;border-radius:4px;border:none;background:#185FA5;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">+ Ekle</button>';
  h += '</div>';
  h += '</div>'; /* SATIR 1 bitti */
  /* BELGE TOOLBAR — temizlenmis (URUN-TASARIM-001) */
  h += '<div style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:var(--sf);border-bottom:0.5px solid var(--b);flex-wrap:nowrap;overflow-x:auto">';
  h += '<button onclick="event.stopPropagation();window._ihrBelgePaneliAc?.(\'' + _dosyaId + '\')" title="PI, CI, PL gibi ihracat belgelerini y\u00f6netir ve basar" style="font-size:9px;padding:3px 12px;border-radius:4px;border:none;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:500;flex-shrink:0">Belgeler \u25be</button>';
  h += '<div style="width:1px;height:16px;background:var(--b);flex-shrink:0;margin:0 3px"></div>';
  var _aktifKaynak = window._ihrUrunFiltreler && window._ihrUrunFiltreler.kaynak;
  var _elAkt = _aktifKaynak === 'el'; var _saAkt = _aktifKaynak === 'sa'; var _imAkt = _aktifKaynak === 'im';
  h += '<button onclick="event.stopPropagation();window._ihrKaynakFiltre?.(\'' + _dosyaId + '\',\'el\')" title="Manuel girilen \u00fcr\u00fcnleri filtreler" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #27500A;color:' + (_elAkt ? '#fff' : '#27500A') + ';background:' + (_elAkt ? '#27500A' : 'transparent') + ';cursor:pointer;font-family:inherit;flex-shrink:0;font-weight:' + (_elAkt ? '600' : '400') + '">EL</button>';
  h += '<button onclick="event.stopPropagation();window._ihrKaynakFiltre?.(\'' + _dosyaId + '\',\'sa\')" title="Sat\u0131nalmadan gelen \u00fcr\u00fcnleri filtreler" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #0C447C;color:' + (_saAkt ? '#fff' : '#0C447C') + ';background:' + (_saAkt ? '#0C447C' : 'transparent') + ';cursor:pointer;font-family:inherit;flex-shrink:0;font-weight:' + (_saAkt ? '600' : '400') + '">SA</button>';
  h += '<button onclick="event.stopPropagation();window._ihrKaynakFiltre?.(\'' + _dosyaId + '\',\'im\')" title="Import Docs ile i\u00e7e aktar\u0131lan \u00fcr\u00fcnleri filtreler" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #3C3489;color:' + (_imAkt ? '#fff' : '#3C3489') + ';background:' + (_imAkt ? '#3C3489' : 'transparent') + ';cursor:pointer;font-family:inherit;flex-shrink:0;font-weight:' + (_imAkt ? '600' : '400') + '">IM</button>';
  if (eksikHs > 0) h += '<button onclick="event.stopPropagation();window._ihrHsToplu(\'' + _dosyaId + '\')" title="HS kodu eksik \u00fcr\u00fcnlere toplu kod atar" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #D97706;color:#854F0B;background:#FAEEDA;cursor:pointer;font-family:inherit;flex-shrink:0;margin-left:4px">HS Toplu (' + eksikHs + ')</button>';
  var _secSay = typeof document !== 'undefined' ? (document.querySelectorAll('.ihr-urun-chk:checked').length || 0) : 0;
  h += '<button id="ihr-toplu-onayla-btn" onclick="event.stopPropagation();window._ihrTopluOnayla?.(\'' + _dosyaId + '\')" title="Se\u00e7ili SA \u00fcr\u00fcnlerini onaylar \u2014 \u00f6nce sat\u0131r se\u00e7" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #27500A;color:' + (_secSay > 0 ? '#fff' : '#27500A') + ';background:' + (_secSay > 0 ? '#27500A' : 'transparent') + ';cursor:pointer;font-family:inherit;flex-shrink:0;opacity:' + (_secSay > 0 ? '1' : '.45') + '">Toplu Onayla' + (_secSay > 0 ? ' (' + _secSay + ')' : '') + '</button>';
  h += '<div style="width:1px;height:16px;background:var(--b);flex-shrink:0;margin:0 2px"></div>';
  h += '<button onclick="event.stopPropagation();window.excelImportAc?.(window._ihrAktifDosyaId||\'\')" title="Tedarik\u00e7i faturas\u0131ndan \u00fcr\u00fcnleri i\u00e7e aktar\u0131r" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #185FA5;color:#185FA5;background:transparent;cursor:pointer;font-family:inherit;flex-shrink:0">Import Docs</button>';
  h += '<div style="width:1px;height:16px;background:var(--b);flex-shrink:0;margin:0 2px"></div>';
  h += '<button onclick="event.stopPropagation();window._ihrSatinalmaGecis?.()" title="Sat\u0131nalma mod\u00fcl\u00fcne ge\u00e7er" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid #185FA5;color:#185FA5;background:transparent;cursor:pointer;font-family:inherit;flex-shrink:0">\u2192 Sat\u0131nalma</button>';
  h += '</div>';

  /* SATIR 2: Filtre + Presetler + Küçük Araçlar (28px) */
  h += '<div style="display:flex;align-items:center;gap:5px;padding:3px 10px;background:#F8F8F6;border-bottom:0.5px solid var(--b);min-height:28px">';
  /* Sol filtre grubu */
  h += '<div style="flex-shrink:0;display:flex;gap:4px;align-items:center">';
  h += '<input id="ihr-urun-ara" placeholder="Ara..." oninput="event.stopPropagation();window._ihrUrunAra?.(this.value)" value="' + _esc(_aramaQ) + '" style="width:140px;font-size:10px;padding:2px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()">';
  var _selS = 'font-size:9px;padding:2px 4px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t2);font-family:inherit';
  h += '<select onchange="event.stopPropagation();window._ihrFiltrele(\'tedarikciAd\',this.value)" style="' + _selS + ';max-width:120px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Tedarikçi</option>';
  uniq('tedarikciAd').sort().forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (_filtreler.tedarikciAd === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
  h += '</select>';
  h += '<select onchange="event.stopPropagation();window._ihrFiltrele(\'etiket_rengi\',this.value)" style="' + _selS + ';max-width:100px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Etiket</option>';
  Object.keys(ETIKET_RENK).forEach(function(v) { h += '<option value="' + v + '"' + (_filtreler.etiket_rengi === v ? ' selected' : '') + '>' + v + '</option>'; });
  h += '</select>';
  h += '<select onchange="event.stopPropagation();window._ihrFiltrele(\'fatura_turu\',this.value)" style="' + _selS + ';max-width:120px" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">Fatura Türü</option>';
  uniq('fatura_turu').forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (_filtreler.fatura_turu === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
  h += '</select>';
  if (Object.keys(_filtreler).some(function(k) { return _filtreler[k]; }) || _aramaQ) h += '<button onclick="event.stopPropagation();window._ihrFiltreTemizle()" style="font-size:9px;color:#DC2626;border:none;background:transparent;cursor:pointer;font-family:inherit">Temizle</button>';
  h += '</div>';
  /* Orta preset grubu — inline presetler */
  var _presetBtnI = 'font-size:9px;padding:2px 8px;border-radius:10px;cursor:pointer;font-family:inherit;white-space:nowrap;';
  var _presetOnI = 'background:#0f1923;color:#fff;border:0.5px solid #0f1923;font-weight:500;';
  var _presetOffI = 'background:transparent;color:var(--t2);border:0.5px solid var(--b);';
  var _presetListI = [
    { k:'auto', l:'Otomatik' }, { k:'hazirlik', l:'Hazırlık' }, { k:'ci_pl', l:'CI/PL' },
    { k:'yukleme', l:'Yükleme' }, { k:'gumruk', l:'Gümrük' }, { k:'tam', l:'Tam' }
  ];
  h += '<div style="flex:1;display:flex;gap:3px;align-items:center;overflow:hidden">';
  h += '<span style="font-size:9px;color:var(--t3);flex-shrink:0;margin-right:2px">Görünüm:</span>';
  _presetListI.forEach(function(p) {
    var on = _aktifPreset === p.k;
    h += '<button onclick="event.stopPropagation();window._ihrSetGorunum(\'' + _dosyaId + '\',\'' + p.k + '\')" style="' + _presetBtnI + (on ? _presetOnI : _presetOffI) + '">' + p.l + '</button>';
  });
  h += '</div>';
  /* Sag araçlar grubu */
  h += '<div style="flex-shrink:0;display:flex;gap:3px;align-items:center">';
  var _saS = 'font-size:9px;padding:2px 7px;border-radius:4px;border:0.5px solid var(--b);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)';
  h += '<button id="ihr-urun-toplu-sil" onclick="event.stopPropagation();window._ihrUrunTopluSil(\'' + _dosyaId + '\')" style="' + _saS + ';display:none;color:#DC2626;border-color:#DC2626">Sil</button>';
  h += '<button onclick="event.stopPropagation();window._ihrTopluDuzenle(\'' + _dosyaId + '\')" title="Se\u00e7ili \u00fcr\u00fcnlerde ayn\u0131 alan\u0131 toplu de\u011fi\u015ftirir" style="' + _saS + '">Toplu D\u00fczenle</button>';
  var _tmpSaved; try { _tmpSaved = JSON.parse(localStorage.getItem(_IHR_KOLON_KEY) || 'null'); } catch(e2) { _tmpSaved = null; }
  var _tmpKolSay = (Array.isArray(_tmpSaved) && _tmpSaved.length) ? _tmpSaved.length : _IHR_KOLON_DEFAULT.length;
  h += '<button onclick="event.stopPropagation();window._ihrKolonAyar?.(\'' + _dosyaId + '\')" title="Kolon g\u00f6r\u00fcn\u00fcm\u00fc ve s\u0131ras\u0131n\u0131 ayarlar" style="' + _saS + ';color:#185FA5;border-color:#B5D4F4;font-weight:500">\u2699 ' + _tmpKolSay + ' Kolon</button>';
  h += '<button onclick="event.stopPropagation();window._ihrKonteynerGorunum(\'' + _dosyaId + '\')" title="\u00dcr\u00fcnleri konteyner baz\u0131nda gruplar" style="' + _saS + '">Konteyner</button>';
  h += '<button onclick="event.stopPropagation();window._ihrSatinalmaCek(\'' + _dosyaId + '\')" title="Sat\u0131nalmada onayl\u0131 \u00fcr\u00fcnleri bu dosyaya aktar\u0131r" style="' + _saS + ';color:#3C3489;border-color:#AFA9EC">SA \u00c7ek</button>';
  h += '</div>';
  h += '</div>'; /* SATIR 2 bitti */

  h += '</div>'; /* sticky blok sonu */

  if (!urunler.length) {
    h += '<div style="display:flex;align-items:center;justify-content:center;padding:48px 24px;color:var(--t2);font-size:12px;background:var(--s2);border-radius:8px;margin:12px">' + (tumurunler.length ? 'Filtreye uyan ürün yok' : 'Henüz ürün eklenmedi') + '</div>';
    h += '</div>'; /* dış wrapper sonu */
    el.innerHTML = h; return;
  }

  /* IHR-KOLON-V3: 80+ kolon, 8 is akisi grubu, TR/EN ikili baslik, read-only hesaplama */
  var KOLONLAR = [
    /* ══ G1 — URUN KIMLIGI (Satinalma) ══════════════════════ */
    { k:'ihracat_id',        l:'Ihracat ID',                     en:'Export ID',               g:1, ro:true,  w:80,  filtre:false, bos:false },
    { k:'tedarikciAd',       l:'Tedarikci',                      en:'Vendor / Supplier',       g:1, ro:false, w:120, filtre:true,  bos:true },
    { k:'urun_kodu',         l:'Urun Kodu',                      en:'Product Code',            g:1, ro:false, w:95,  filtre:false, bos:true },
    { k:'aciklama',          l:'Urun Adi (TR)',                   en:'Product Name (TR)',       g:1, ro:false, w:200, filtre:false, bos:true },
    { k:'anahtar_kelime',    l:'Anahtar Kelime',                  en:'Keywords',                g:1, ro:false, w:100, filtre:false, bos:true },
    { k:'standart_urun_adi', l:'Standart Urun Adi (EN)',          en:'Standard Name (CI/PL)',   g:1, ro:false, w:160, filtre:false, bos:true },
    { k:'satici_urun_adi',   l:'Satici Urun Adi',                 en:'Vendor Product Name',     g:1, ro:false, w:130, filtre:false, bos:true },
    { k:'satici_urun_kodu',  l:'Satici Urun Kodu',                en:'Vendor Code',             g:1, ro:false, w:90,  filtre:false, bos:true },
    { k:'fatura_urun_adi',   l:'Fatura Urun Adi',                 en:'Invoice Product Name',    g:1, ro:false, w:140, filtre:false, bos:true },
    { k:'musteri_notu',      l:'Musteri Notu',                    en:'Customer Notes',          g:1, ro:false, w:120, filtre:false, bos:true },
    { k:'tuketim_suresi',    l:'Tuketim Suresi (Gun)',            en:'Shelf Life (Days)',       g:1, ro:false, w:80,  filtre:false, bos:true },
    { k:'son_kullanma',      l:'Son Kullanma Tarihi',              en:'Expiry Date',             g:1, ro:false, w:85,  filtre:true,  bos:true },
    { k:'katalog_siparis',   l:'Katalog Siparis Kaynagi',         en:'Catalog Order Source',    g:1, ro:false, w:100, filtre:false, bos:true },

    /* ══ G2 — FIYAT & TEKLIF ════════════════════════════════ */
    { k:'teklif_id',         l:'Teklif/Fatura No',                en:'Offer/Invoice ID',        g:2, ro:false, w:90,  filtre:false, bos:true },
    { k:'fatura_turu',       l:'Teklif/Fatura Turu',              en:'Offer/Invoice Type',      g:2, ro:false, w:100, filtre:true,  bos:true },
    { k:'teklif_tarihi',     l:'Teklif Tarihi',                   en:'Offer Date',              g:2, ro:false, w:85,  filtre:true,  bos:true },
    { k:'miktar',            l:'Miktar',                          en:'Quantity',                g:2, ro:false, w:75,  filtre:false, bos:true },
    { k:'birim',             l:'Birim',                           en:'Unit Type',               g:2, ro:false, w:55,  filtre:true,  bos:true },
    { k:'kdv_orani',         l:'KDV Orani',                       en:'VAT Rate %',              g:2, ro:false, w:70,  filtre:true,  bos:false },
    { k:'doviz',             l:'Doviz',                           en:'Currency',                g:2, ro:false, w:65,  filtre:true,  bos:false },
    { k:'doviz_kur',         l:'Doviz Kuru (TRY)',                en:'Currency Rate TRY',       g:2, ro:false, w:85,  filtre:false, bos:true },
    { k:'ihracat_kur',       l:'Ihracat Kuru',                    en:'Export Rate',             g:2, ro:false, w:70,  filtre:false, bos:true },
    { k:'birim_fiyat',       l:'Birim Fiyat',                     en:'Unit Price',              g:2, ro:false, w:95,  filtre:false, bos:true },
    { k:'toplam_tutar',      l:'Toplam (KDV Haric)',              en:'Total Excl. Tax TRY',     g:2, ro:true,  w:95,  filtre:false, bos:false },
    { k:'toplam_kdv',        l:'KDV Tutari',                      en:'Total Tax TRY',           g:2, ro:true,  w:80,  filtre:false, bos:false },
    { k:'toplam_kdv_dahil',  l:'Toplam (KDV Dahil)',              en:'Total Incl. Tax TRY',     g:2, ro:true,  w:95,  filtre:false, bos:false },
    { k:'doviz_toplami',     l:'Doviz Toplami',                   en:'Currency Total',          g:2, ro:true,  w:85,  filtre:false, bos:false },

    /* ══ G3 — AMBALAJ & AGIRLIK ═════════════════════════════ */
    { k:'koli_adet',         l:'Koli Adedi',                      en:'Package Qty (Ctns)',      g:3, ro:false, w:75,  filtre:false, bos:true },
    { k:'ambalaj_tipi',      l:'Ambalaj Tipi',                    en:'Package Type',            g:3, ro:false, w:80,  filtre:true,  bos:true },
    { k:'birim_brut_kg',     l:'1 Urun Brut (KG)',                en:'1 Pcs Gross Weight',      g:3, ro:false, w:80,  filtre:false, bos:true },
    { k:'brut_kg',           l:'Toplam Brut (KG)',                en:'Total Gross KG',          g:3, ro:true,  w:90,  filtre:false, bos:false },
    { k:'birim_net_kg',      l:'1 Urun Net (KG)',                 en:'1 Pcs Net Weight',        g:3, ro:false, w:75,  filtre:false, bos:true },
    { k:'net_kg',            l:'Toplam Net (KG)',                 en:'Total Net KG',            g:3, ro:true,  w:90,  filtre:false, bos:false },
    { k:'koli_olcu',         l:'1 Koli Olculeri',                 en:'1 Pkg Dimensions',        g:3, ro:false, w:90,  filtre:false, bos:true },
    { k:'hacim_m3',          l:'Toplam Hacim (m3)',               en:'Total CBM',               g:3, ro:true,  w:85,  filtre:false, bos:false },

    /* ══ G4 — HAMMADDE ══════════════════════════════════════ */
    { k:'hammadde_adi',      l:'Hammadde Adi',                    en:'Raw Material',            g:4, ro:false, w:110, filtre:false, bos:true },
    { k:'hammadde_ton_fiyat',l:'Hammadde Ton Fiyati',             en:'RM Ton Price',            g:4, ro:false, w:90,  filtre:false, bos:true },
    { k:'hammadde_para',     l:'Hammadde Para Birimi',            en:'RM Currency',             g:4, ro:false, w:70,  filtre:true,  bos:true },
    { k:'hammadde_kaynak',   l:'Fiyat Kaynagi',                   en:'Price Source',            g:4, ro:false, w:90,  filtre:false, bos:true },

    /* ══ G5 — GUMRUK & SINIFLANDIRMA ════════════════════════ */
    { k:'mense_ulke',        l:'Mensei Ulke',                     en:'Country of Origin',       g:5, ro:false, w:90,  filtre:true,  bos:true },
    { k:'hs_kodu',           l:'GTIP / HS Kodu',                  en:'HS Code',                 g:5, ro:false, w:100, filtre:false, bos:true },
    { k:'gumrukcu_tanim',    l:'Gumrukcu Tanimi',                  en:'Customs Description',     g:5, ro:false, w:140, filtre:false, bos:true },
    { k:'imo_gerekli',       l:'IMO Gerekli Mi?',                 en:'IMO Required',            g:5, ro:false, w:65,  filtre:true,  bos:true },
    { k:'imo_no',            l:'IMO No',                          en:'IMO Number',              g:5, ro:false, w:75,  filtre:false, bos:true },
    { k:'imo_msds',          l:'MSDS',                            en:'MSDS',                    g:5, ro:false, w:60,  filtre:false, bos:false },
    { k:'dib',               l:'DIB',                             en:'DIB (Y/N)',               g:5, ro:false, w:50,  filtre:true,  bos:true },
    { k:'kategori',          l:'Kategori',                        en:'Category',                g:5, ro:false, w:80,  filtre:true,  bos:true },
    { k:'marka',             l:'Marka',                           en:'Brand',                   g:5, ro:false, w:70,  filtre:true,  bos:true },

    /* ══ G6 — LOJISTIK & YUKLEME ════════════════════════════ */
    { k:'stok_durumu',       l:'Stok Durumu',                     en:'Stock Status',            g:6, ro:false, w:80,  filtre:true,  bos:true },
    { k:'stok_miktar',       l:'Stokta Olan Miktar',              en:'Stock Qty',               g:6, ro:false, w:80,  filtre:false, bos:true },
    { k:'urun_nerede',       l:'Urun Nerede',                     en:'Product Location',        g:6, ro:false, w:90,  filtre:true,  bos:true },
    { k:'teslim_suresi',     l:'Teslim Suresi (Gun)',             en:'Lead Time (Days)',        g:6, ro:false, w:80,  filtre:false, bos:true },
    { k:'odeme_sartlari',    l:'Odeme Sartlari',                  en:'Payment Terms',           g:6, ro:false, w:90,  filtre:true,  bos:true },
    { k:'etiket_rengi',      l:'Kutu Etiket Rengi',               en:'Box Label Color',         g:6, ro:false, w:80,  filtre:true,  bos:true },
    { k:'konteyner_sira',    l:'Yukleme Sirasi',                  en:'Loading Order',           g:6, ro:false, w:65,  filtre:false, bos:true },
    { k:'once_yukle',        l:'Yukleme Onceligi',                en:'Load Priority',           g:6, ro:false, w:80,  filtre:true,  bos:true },
    { k:'yuklenebilir_miktar',l:'Yuklenebilir Miktar',            en:'Loadable Qty',            g:6, ro:false, w:80,  filtre:false, bos:true },
    { k:'konteyner_no',      l:'Konteyner No',                    en:'Container No',            g:6, ro:false, w:100, filtre:false, bos:true },
    { k:'muhur_no',          l:'Muhur No',                        en:'Seal No',                 g:6, ro:false, w:80,  filtre:false, bos:true },
    { k:'booking_no',        l:'Booking No',                      en:'Booking No',              g:6, ro:false, w:85,  filtre:false, bos:true },
    { k:'teslim_tarihi',     l:'Teslim Tarihi',                   en:'Delivery Date',           g:6, ro:false, w:85,  filtre:true,  bos:true },
    { k:'teslim_alan',       l:'Teslim Alan',                     en:'Received By',             g:6, ro:false, w:85,  filtre:false, bos:true },
    { k:'teslim_eden',       l:'Teslim Eden',                     en:'Delivered By',            g:6, ro:false, w:85,  filtre:false, bos:true },
    { k:'yukleme_durumu',    l:'Yukleme Durumu',                  en:'Loading Status',          g:6, ro:false, w:85,  filtre:true,  bos:true },
    /* VGM */
    { k:'vgm_kg',            l:'VGM Agirlik',                     en:'VGM Weight',              g:6, ro:false, w:70,  filtre:false, bos:true },
    /* Tasima */
    { k:'nakliye_firma',     l:'Nakliye Firmasi',                 en:'Transport Company',       g:6, ro:false, w:100, filtre:false, bos:true },

    /* ══ G7 — GCB & IHRACAT ═════════════════════════════════ */
    { k:'alis_fatura_no',    l:'Alis Fatura No',                  en:'Purchase Invoice No',     g:7, ro:false, w:90,  filtre:false, bos:true },
    { k:'alis_fatura_tarihi',l:'Alis Fatura Tarihi',              en:'Purchase Invoice Date',   g:7, ro:false, w:85,  filtre:true,  bos:true },
    { k:'proforma_id',       l:'Proforma No',                     en:'PI No',                   g:7, ro:false, w:85,  filtre:false, bos:true },
    { k:'ihracat_fatura_id', l:'Ihracat Fatura ID',               en:'Export Invoice ID',       g:7, ro:false, w:90,  filtre:false, bos:true },
    { k:'ihracat_fatura_tarihi',l:'Ihracat Fatura Tarihi',        en:'Export Invoice Date',     g:7, ro:false, w:85,  filtre:true,  bos:true },
    { k:'gcb_id',            l:'GCB ID',                          en:'GCB ID',                  g:7, ro:false, w:75,  filtre:false, bos:true },
    { k:'gcb_no',            l:'GCB Beyan No',                    en:'GCB Decl. No',            g:7, ro:false, w:90,  filtre:false, bos:true },
    { k:'gcb_tarih',         l:'GCB Tescil Tarihi',               en:'GCB Reg. Date',           g:7, ro:false, w:85,  filtre:true,  bos:true },
    { k:'gcb_kur',           l:'GCB Tescil Kuru',                 en:'GCB Reg. Rate',           g:7, ro:false, w:70,  filtre:false, bos:true },
    { k:'gcb_kapama_tarihi', l:'GCB Kapama Tarihi',               en:'GCB Closing Date',        g:7, ro:false, w:85,  filtre:true,  bos:true },
    { k:'gcb_toplam',        l:'GCB Toplam',                      en:'GCB Total',               g:7, ro:true,  w:80,  filtre:false, bos:false },
    { k:'gcb_durum',         l:'GCB Durumu',                      en:'GCB Status',              g:7, ro:false, w:80,  filtre:true,  bos:true },
    { k:'mensei_no',         l:'Mensei Belge No',                 en:'Origin Cert. No',         g:7, ro:false, w:80,  filtre:false, bos:true },
    { k:'mensei_tarih',      l:'Mensei Tarihi',                   en:'Origin Cert. Date',       g:7, ro:false, w:85,  filtre:true,  bos:true },
    { k:'avans_odemesi',     l:'Avans Odemesi',                   en:'Advance Payment',         g:7, ro:false, w:85,  filtre:false, bos:true },
    /* Sigorta */
    { k:'police_no',         l:'Police No',                       en:'Policy No',               g:7, ro:false, w:90,  filtre:false, bos:true },
    { k:'sigorta_firma',     l:'Sigorta Firmasi',                 en:'Insurance Company',       g:7, ro:false, w:100, filtre:false, bos:true },

    /* ══ G8 — DURUM & ONAY ══════════════════════════════════ */
    { k:'musteri_onay',      l:'Musteri Onay Durumu',             en:'Customer Approval',       g:8, ro:false, w:90,  filtre:true,  bos:true },
    { k:'duay_onay',         l:'Duay Onay Durumu',                en:'Duay Approval',           g:8, ro:false, w:85,  filtre:true,  bos:true },
    { k:'kdv_iadesi',        l:'KDV Iadesi Tutari',               en:'VAT Refund Amount',       g:8, ro:false, w:90,  filtre:false, bos:true },
    { k:'onemli_not_1',      l:'Onemli Notlar',                   en:'Important Notes',         g:8, ro:false, w:140, filtre:false, bos:true },
    { k:'duay_not',          l:'Duaya Ozel Not',                  en:'Internal Note',           g:8, ro:false, w:140, filtre:false, bos:true }
  ];

  // GORUNUM-SISTEMI-001: Asama bazli otomatik gorunum + preset sistemi
  window._ihrAllKolonlar = KOLONLAR;
  var _dil = localStorage.getItem('ak_lang') || 'tr';

  // Asama bazli otomatik kolon setleri
  var _ASAMA_KOLONLAR = {
    1: ['tedarikciAd','urun_kodu','aciklama','standart_urun_adi','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hs_kodu'],
    2: ['tedarikciAd','urun_kodu','standart_urun_adi','miktar','birim','birim_fiyat','doviz','koli_adet','brut_kg','toplam_tutar','hs_kodu','gumrukcu_tanim'],
    3: ['tedarikciAd','urun_kodu','standart_urun_adi','koli_adet','brut_kg','net_kg','hacim_m3','konteyner_no','muhur_no','konteyner_sira','etiket_rengi'],
    4: ['urun_kodu','standart_urun_adi','hs_kodu','mense_ulke','gumrukcu_tanim','gcb_id','gcb_tarih','gcb_durum'],
    5: ['urun_kodu','standart_urun_adi','toplam_tutar','gcb_id','gcb_kapama_tarihi','musteri_onay','duay_onay']
  };
  // Preset kolon setleri
  var _PRESET_KOLONLAR = {
    auto: null,
    hazirlik: ['tedarikciAd','urun_kodu','aciklama','standart_urun_adi','fatura_urun_adi','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hs_kodu'],
    ci_pl: ['tedarikciAd','urun_kodu','standart_urun_adi','miktar','birim','birim_fiyat','doviz','koli_adet','brut_kg','net_kg','hacim_m3','toplam_tutar','hs_kodu','mense_ulke'],
    yukleme: ['urun_kodu','standart_urun_adi','koli_adet','brut_kg','net_kg','hacim_m3','konteyner_no','muhur_no','konteyner_sira','once_yukle','etiket_rengi','yukleme_durumu'],
    gumruk: ['urun_kodu','standart_urun_adi','hs_kodu','mense_ulke','gumrukcu_tanim','imo_gerekli','imo_no','gcb_id','gcb_no','gcb_tarih','gcb_toplam','gcb_durum'],
    tam: null
  };

  // Aktif gorunumu belirle
  var _dosyaId = d.id;
  var _dosyaAsama = parseInt(d.asamaNo || d.asama || 1) || 1;
  var _aktifPreset = 'auto';
  try { _aktifPreset = localStorage.getItem('ak_ihr_preset_' + _dosyaId) || 'auto'; } catch(e) {}

  var _gorunumKolonlari;
  var _savedW = {}; try { _savedW = JSON.parse(localStorage.getItem(_IHR_KOLON_W_KEY) || '{}') || {}; } catch(e2) { _savedW = {}; }
  if (_aktifPreset === 'tam') {
    _gorunumKolonlari = null; // tum kolonlar
  } else if (_aktifPreset !== 'auto' && _PRESET_KOLONLAR[_aktifPreset]) {
    _gorunumKolonlari = _PRESET_KOLONLAR[_aktifPreset];
  } else {
    // Auto — dosya asamasina gore veya kullanici secimi
    var _savedKols; try { _savedKols = JSON.parse(localStorage.getItem(_IHR_KOLON_KEY) || 'null'); } catch(e) { _savedKols = null; }
    if (Array.isArray(_savedKols) && _savedKols.length) {
      _gorunumKolonlari = _savedKols;
    } else if (_ASAMA_KOLONLAR[_dosyaAsama]) {
      _gorunumKolonlari = _ASAMA_KOLONLAR[_dosyaAsama];
    } else {
      _gorunumKolonlari = _IHR_KOLON_DEFAULT;
    }
  }

  // Gizli gruplari kontrol et
  var _gizliGruplar = [];
  try { var _gg = localStorage.getItem('ak_ihr_gizli_grup_' + _dosyaId); if (_gg) _gizliGruplar = _gg.split(','); } catch(e) {}

  var GORUNEN_KOLONLAR = _gorunumKolonlari
    ? KOLONLAR.filter(function(col) { return _gorunumKolonlari.indexOf(col.k) !== -1 && _gizliGruplar.indexOf(String(col.g)) === -1; })
    : KOLONLAR.filter(function(col) { return _gizliGruplar.indexOf(String(col.g)) === -1; });

  /* ── FREEZE LAYOUT: Sol sabit 3 kolon + Sağ kaydırılabilir ── */
  // ETIKET_RENK modul scope'ta tanimli (asagida)
  var SELECT_KOLONLAR = {
    fatura_turu: ['', 'Ihrac Kayitli KDV\'siz', 'KDV\'li', 'Transit Ticaret', 'Ozel Matrah', 'Tevkifatli', 'KDV Muaf'],
    mense_ulke: ['Turkiye', 'Cin', 'Hindistan', 'Italya', 'Almanya', 'Ispanya', 'Diger'],
    dib: ['H', 'E'], imo_gerekli: ['H', 'E'],
    gcb_durum: ['', 'Acik', 'Kapandi', 'Iptal'],
    vgm_kaynak: ['', 'Liman', 'Forwarder', 'Internet'],
    doviz: ['USD', 'EUR', 'TRY', 'GBP', 'CNY'],
    hammadde_para: ['', 'USD', 'EUR', 'TRY'],
    birim: ['PCS', 'KG', 'MT', 'SET', 'PKG', 'CTN', 'PLT', 'M', 'M2', 'M3', 'LT'],
    ambalaj_tipi: ['', 'KARTON', 'PALET', 'CUVAL', 'BIDON', 'IBC', 'VARIL', 'KASA', 'BALYALI'],
    once_yukle: ['Once Yukle', 'Sonra Yukle', 'Yer Olursa Yukle'],
    musteri_onay: ['', 'Onaylandi', 'Bekliyor', 'Reddedildi'],
    duay_onay: ['', 'Onaylandi', 'Bekliyor', 'Iptal'],
    yukleme_durumu: ['', 'Bekliyor', 'Hazirlaniyor', 'Yuklendi', 'Teslim Edildi'],
    stok_durumu: ['', 'Stokta', 'Siparis Verildi', 'Uretimde', 'Yolda', 'Tukendi'],
    teslim_sekli: ['', 'Fabrikadan', 'Depodan', 'Limandan', 'Kargo ile'],
    odeme_sartlari: ['', 'Pesin', 'Vadeli 30 Gun', 'Vadeli 60 Gun', 'Vadeli 90 Gun', 'Acik Hesap']
  };
  var DATE_KOLONLAR = ['alis_fatura_tarihi', 'teklif_tarihi', 'son_kullanma', 'gcb_tarih', 'gcb_kapama_tarihi', 'mensei_tarih', 'teslim_tarihi', 'ihracat_fatura_tarihi'];
  var sortedUrunler = urunler.slice().sort(function(a, b) { return (parseInt(a.konteyner_sira) || 99) - (parseInt(b.konteyner_sira) || 99); });

  /* Ürün sayfalama (STANDART-FIX-007) */
  if (!window._ihrUrunSayfa) window._ihrUrunSayfa = 1;
  var _IHR_URUN_SAYFA_BOY = 50;
  var _ihrUrunToplamSayfa = Math.max(1, Math.ceil(sortedUrunler.length / _IHR_URUN_SAYFA_BOY));
  if (window._ihrUrunSayfa > _ihrUrunToplamSayfa) window._ihrUrunSayfa = _ihrUrunToplamSayfa;
  var _ihrUrunBas = (window._ihrUrunSayfa - 1) * _IHR_URUN_SAYFA_BOY;
  var sayfaUrunler = sortedUrunler.slice(_ihrUrunBas, _ihrUrunBas + _IHR_URUN_SAYFA_BOY);
  var tdS = 'padding:2px 6px;border-bottom:0.5px solid var(--b);border-right:0.5px solid var(--b);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  var thS = 'padding:3px 6px;background:var(--s2);border-bottom:0.5px solid var(--b);border-right:0.5px solid var(--b);font-size:9px;white-space:nowrap;vertical-align:top;text-align:left';

  /* ── TEK TABLO + STICKY KOLONLAR ── */
  var stickyBg = 'var(--sf)';
  var stickyBgH = 'var(--s2)';
  h += '<div style="overflow:auto;border:0.5px solid var(--b);border-radius:8px;max-height:calc(100vh - 185px)">';
  h += '<table class="tbl" style="font-size:10px;border-collapse:collapse;table-layout:auto">';
  /* THEAD — Model C: grup bant + dile gore tek satir baslik */
  var _GRUP_RENK = {
    1: { bg:'#E6F1FB', c:'#0C447C', tr:'Urun Kimligi',         en:'Product Identity' },
    2: { bg:'#FAEEDA', c:'#633806', tr:'Fiyat & Teklif',        en:'Price & Offer' },
    3: { bg:'#EAF3DE', c:'#085041', tr:'Ambalaj',               en:'Packaging' },
    4: { bg:'#F3E8FF', c:'#6B21A8', tr:'Hammadde',              en:'Raw Material' },
    5: { bg:'#FCE7F3', c:'#9D174D', tr:'Gumruk',                en:'Customs' },
    6: { bg:'#E0F2FE', c:'#075985', tr:'Lojistik',              en:'Logistics' },
    7: { bg:'#FEF3C7', c:'#854D0E', tr:'GCB & Ihracat',         en:'GCB & Export' },
    8: { bg:'var(--s2)', c:'var(--t3)', tr:'Durum',              en:'Status' }
  };
  // Gorunen kolonlarin grup colspan'larini hesapla (sticky haric)
  var _grpColspans = {};
  GORUNEN_KOLONLAR.forEach(function(kol) {
    if (kol.k === 'tedarikciAd' || kol.k === 'urun_kodu' || kol.k === 'aciklama') return;
    var g = kol.g || 1;
    _grpColspans[g] = (_grpColspans[g] || 0) + 1;
  });

  h += '<thead>';
  /* Satir 1 — Grup bant */
  var _gbS = 'padding:3px 8px;font-size:9px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;border-right:0.5px solid rgba(0,0,0,.06)';
  h += '<tr style="position:sticky;top:0;z-index:5">';
  h += '<th style="position:sticky;left:0;z-index:6;background:' + stickyBgH + ';width:28px;min-width:28px;' + _gbS + ';border-right:2px solid var(--b)" rowspan="2"><input type="checkbox" id="ihr-chk-all" onchange="event.stopPropagation();window._ihrUrunTumChk(this.checked)"></th>';
  h += '<th colspan="3" style="position:sticky;left:28px;z-index:6;background:#E6F1FB;color:#0C447C;' + _gbS + ';border-right:2px solid var(--b)">' + (_dil === 'en' ? 'Product Identity' : 'Urun Kimligi') + '</th>';
  // Gruplar sirali
  var _grpSira = [1,2,3,4,5,6,7,8];
  _grpSira.forEach(function(g) {
    var cs = _grpColspans[g] || 0;
    if (!cs) return;
    var gr = _GRUP_RENK[g] || _GRUP_RENK[8];
    var gizli = _gizliGruplar.indexOf(String(g)) !== -1;
    h += '<th colspan="' + cs + '" style="background:' + gr.bg + ';color:' + gr.c + ';' + _gbS + ';cursor:pointer;' + (gizli ? 'opacity:.5;' : '') + '" onclick="event.stopPropagation();window._ihrToggleGrup(\'' + _dosyaId + '\',' + g + ')" title="Tikla: grubu ac/kapat">' + (gizli ? '\u25b6 ' : '\u25bc ') + (_dil === 'en' ? gr.en : gr.tr) + '</th>';
  });
  h += '<th style="width:50px;min-width:50px;' + _gbS + ';background:var(--s2)" rowspan="2"></th>';
  h += '</tr>';

  /* Satir 2 — Dile gore tek satirli kolon basliklari */
  var _thS2 = 'font-size:10px;font-weight:500;color:var(--t2);line-height:1.3;white-space:nowrap';
  h += '<tr style="position:sticky;top:24px;z-index:4">';
  /* 3 sticky kolon */
  h += '<th style="position:sticky;left:28px;z-index:5;background:' + stickyBgH + ';width:120px;min-width:120px;padding:5px 8px;border-right:0.5px solid var(--b)"><span style="' + _thS2 + '">' + (_dil === 'en' ? 'Vendor' : 'Tedarikci') + '</span></th>';
  h += '<th style="position:sticky;left:148px;z-index:5;background:' + stickyBgH + ';width:100px;min-width:100px;padding:5px 8px;border-right:0.5px solid var(--b)"><span style="' + _thS2 + '">' + (_dil === 'en' ? 'Product Code' : 'Urun Kodu') + '</span></th>';
  h += '<th style="position:sticky;left:248px;z-index:5;background:' + stickyBgH + ';width:200px;min-width:200px;padding:5px 8px;border-right:2px solid var(--b)"><span style="' + _thS2 + '">' + (_dil === 'en' ? 'Product Name' : 'Urun Adi') + '</span></th>';
  /* Kalan kolonlar */
  var _kolNo = 4;
  GORUNEN_KOLONLAR.forEach(function(kol) {
    if (kol.k === 'tedarikciAd' || kol.k === 'urun_kodu' || kol.k === 'aciklama') return;
    _kolNo++;
    var bosCount = kol.bos ? urunler.filter(function(u) { return !u[kol.k] || String(u[kol.k]).trim() === ''; }).length : 0;
    var _roBg = kol.ro ? 'background:#FAEEDA;color:#633806;font-weight:500;' : '';
    var _kolLabel = _dil === 'en' ? kol.en : kol.l;
    var _kw = (_savedW[kol.k] && _savedW[kol.k] >= 40) ? _savedW[kol.k] : kol.w;
    h += '<th style="width:' + _kw + 'px;min-width:' + _kw + 'px;padding:5px 8px;border-right:0.5px solid var(--b);' + _roBg + '" title="' + _esc(kol.en) + ' — ' + _esc(kol.l) + '">';
    h += '<span style="' + _thS2 + '">' + _kolLabel;
    if (kol.filtre) {
      var aktif = _filtreler[kol.k];
      h += ' <select onchange="event.stopPropagation();window._ihrFiltrele(\'' + kol.k + '\',this.value)" onclick="event.stopPropagation()" style="border:none;background:transparent;font-size:9px;cursor:pointer;color:' + (aktif ? '#185FA5' : 'var(--t3)') + ';vertical-align:middle">';
      h += '<option value="">' + (aktif ? '\u25cf' : '\u25be') + '</option><option value="">(Tumu)</option>';
      uniq(kol.k).sort().forEach(function(v) { h += '<option value="' + _esc(v) + '"' + (aktif === v ? ' selected' : '') + '>' + _esc(v) + '</option>'; });
      h += '</select>';
    }
    h += '</span>';
    if (kol.bos && bosCount > 0) h += '<div style="font-size:8px;color:#D97706;margin-top:1px">' + bosCount + ' bos</div>';
    h += '</th>';
  });
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
    h += '<td data-alan="urun_kodu" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'urun_kodu\')" style="position:sticky;left:148px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-family:monospace;font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(u.urun_kodu || '') + '</td>';
    h += '<td data-alan="aciklama" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'aciklama\')" style="position:sticky;left:248px;z-index:2;background:' + cellBg + ';' + tdS + ';cursor:text;font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-right:2px solid var(--b)" title="' + _esc(u.aciklama || '') + '">' + _esc(u.aciklama || '') + '</td>';
    /* Kalan kolonlar */
    GORUNEN_KOLONLAR.forEach(function(kol) {
      var _kw = (_savedW && _savedW[kol.k] && _savedW[kol.k] >= 40) ? _savedW[kol.k] : (kol.w || 80);
      var k = kol.k; if (k === 'tedarikciAd' || k === 'urun_kodu' || k === 'aciklama') return;
      var v = u[k]; var vs = _esc(v || '');
      // Read-only hesaplanan alanlar — sari arka plan
      var _roStyle = 'background:#FEF9C333;color:var(--t3);';
      if (k === 'pi_link') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" style="color:var(--ac)">Ac</a>' : '') + '</td>'; return; }
      if (k === 'toplam_tutar') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + topKdvHaric.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'toplam_kdv') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + kdvTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'toplam_kdv_dahil') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;font-weight:500;' + _roStyle + '">' + kdvDahil.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td>'; return; }
      if (k === 'doviz_toplami') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + topKdvHaric.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(u.doviz || '') + '</td>'; return; }
      if (k === 'brut_kg' && kol.ro) { var _bk = parseFloat(u.birim_brut_kg || 0) * miktar; h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + (_bk ? _bk.toLocaleString('tr-TR', { minimumFractionDigits: 1 }) : (v || '')) + '</td>'; return; }
      if (k === 'net_kg' && kol.ro) { var _nk = parseFloat(u.birim_net_kg || 0) * miktar; h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + (_nk ? _nk.toLocaleString('tr-TR', { minimumFractionDigits: 1 }) : (v || '')) + '</td>'; return; }
      if (k === 'hacim_m3' && kol.ro) { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + (v || '') + '</td>'; return; }
      if (k === 'gcb_toplam') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;' + _roStyle + '">' + (v || '') + '</td>'; return; }
      if (k === 'ihracat_id') { h += '<td style="' + tdS + ';font-family:monospace;color:var(--t3);' + _roStyle + '">' + _esc(v || '') + '</td>'; return; }
      if (k === 'miktar') { h += '<td style="' + tdS + ';text-align:right;cursor:text" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'miktar\')">' + (miktar || 0).toLocaleString('tr-TR') + ' ' + _esc(u.birim || '') + '</td>'; return; }
      if (k === 'birim_fiyat') { h += '<td style="' + tdS + ';text-align:right;font-family:monospace;cursor:text;color:' + (v ? 'var(--t)' : 'var(--t3)') + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'birim_fiyat\')">' + (v ? birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(u.doviz || '') : '') + '</td>'; return; }
      if (k === 'etiket_rengi') { var er = ETIKET_RENK[v] || ''; h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center;padding:2px"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'etiket_rengi\',this.value);var _sel=this;setTimeout(function(){var _opt=_sel.options[_sel.selectedIndex];_sel.style.color=_opt?.dataset?.renk||\'var(--t)\';},10)" style="font-size:10px;border:none;background:transparent;cursor:pointer;color:' + (er || 'var(--t3)') + ';font-weight:500;width:100%"><option value="">—</option>'; Object.keys(ETIKET_RENK).forEach(function(rk) { h += '<option value="' + rk + '" data-renk="' + ETIKET_RENK[rk] + '"' + (v === rk ? ' selected' : '') + ' style="color:' + ETIKET_RENK[rk] + '">' + '\u25cf ' + rk + '</option>'; }); h += '</select></td>'; return; }
      if (k === 'doviz') { h += '<td style="' + tdS + ';text-align:center">' + vs + '</td>'; return; }
      if (k === 'imo_msds') { var _imoFlag = u.imo_gerekli || u.imo_urun || 'H'; if (_imoFlag === 'E') { h += '<td style="' + tdS + '">' + (v ? '<a href="' + _esc(v) + '" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac);font-size:10px">PDF</a>' : '<button class="btn btns" onclick="event.stopPropagation();window._ihrMsdsYukle(\'' + u.id + '\')" style="font-size:9px;padding:1px 5px">Yukle</button>') + '</td>'; } else { h += '<td style="' + tdS + '"><span style="font-size:9px;color:var(--t3)">\u2014</span></td>'; } return; }
      if (k === 'yukleme_durumu') { var vgmVar = parseFloat(u.vgm_kg || 0) > 0; var durumVal = vgmVar ? 'Yüklendi' : (v || ''); var durumBg2 = durumVal === 'Yüklendi' ? '#EAF3DE' : 'var(--s2)'; var durumClr = durumVal === 'Yüklendi' ? '#27500A' : 'var(--t2)'; h += '<td style="' + tdS + '">' + (durumVal ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + durumBg2 + ';color:' + durumClr + '">' + _esc(durumVal) + '</span>' : '') + '</td>'; return; }
      if (SELECT_KOLONLAR[k]) { h += '<td onclick="event.stopPropagation()" style="' + tdS + '"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'' + k + '\',this.value)" style="font-size:10px;border:none;background:transparent;width:100%;cursor:pointer;color:var(--t)">'; SELECT_KOLONLAR[k].forEach(function(sv) { h += '<option value="' + _esc(sv) + '"' + (String(v || '') === sv ? ' selected' : '') + '>' + _esc(sv || '—') + '</option>'; }); h += '</select></td>'; return; }
      if (DATE_KOLONLAR.indexOf(k) !== -1) { h += '<td ondblclick="event.stopPropagation();window._ihrInlineDateEdit(this,\'' + u.id + '\',\'' + k + '\')" onclick="event.stopPropagation()" style="' + tdS + ';cursor:text;font-family:monospace">' + vs + '</td>'; return; }
      if (k === 'kdv_orani') { h += '<td onclick="event.stopPropagation()" style="' + tdS + ';text-align:center"><select onchange="event.stopPropagation();window._ihrInlineSelectDegis(\'' + u.id + '\',\'kdv_orani\',parseFloat(this.value))" style="font-size:10px;border:none;background:transparent;cursor:pointer;text-align:center">'; [0, 1, 5, 10, 18, 20].forEach(function(kv) { h += '<option value="' + kv + '"' + (kdvOrani === kv ? ' selected' : '') + '>%' + kv + '</option>'; }); h += '</select></td>'; return; }
      if (kol.ro) { h += '<td style="' + tdS + ';background:#FEF9C333;color:var(--t3);max-width:' + _kw + 'px" title="' + vs + '">' + vs + '</td>'; return; }
      h += '<td data-alan="' + k + '" data-uid="' + u.id + '" onclick="event.stopPropagation();window._ihrInlineEdit(this,\'' + u.id + '\',\'' + k + '\')" style="' + tdS + ';cursor:text;max-width:' + _kw + 'px" title="' + vs + '">' + vs + '</td>';
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
  h += '</div>'; /* dış wrapper sonu */
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
  var _onayBtn = document.getElementById('ihr-toplu-onayla-btn'); if (_onayBtn) { _onayBtn.textContent = secili > 0 ? 'Toplu Onayla (' + secili + ')' : 'Toplu Onayla'; _onayBtn.style.opacity = secili > 0 ? '1' : '.45'; _onayBtn.style.background = secili > 0 ? '#27500A' : 'transparent'; _onayBtn.style.color = secili > 0 ? '#fff' : '#27500A'; }
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
window._ihrEvrakToggle = function(id) { var el = document.getElementById(id); if (!el) return; el.style.display = el.style.display === 'none' ? 'table-row' : 'none'; };

/* IHR-SURECBAR-002: Tek tik ileri gec */
window._ihrAdimIleri = function(dosyaId, hedefDurum) {
  var dosyalar = _loadD(); var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var DURUM_L = { hazirlaniyor: 'Haz\u0131rlan\u0131yor', yukleniyor: 'Y\u00fckleniyor', yuklendi: 'Y\u00fcklendi', yolda: 'Yolda', teslim: 'Teslim' };
  var hedefL = DURUM_L[hedefDurum] || hedefDurum;
  window.confirmModal?.(_esc(d.dosyaNo || dosyaId) + ' dosyas\u0131n\u0131 "' + hedefL + '" a\u015famas\u0131na almak istiyor musunuz?', { title: 'Durum De\u011fi\u015ftir', confirmText: 'Evet', onConfirm: function() {
    d.durum = hedefDurum; d.durum_tarihi = _now(); d.updatedAt = _now();
    _storeD(dosyalar);
    window.logActivity?.('ihracat', 'Durum de\u011fi\u015ftirildi: ' + hedefL, dosyaId);
    window.toast?.(hedefL + ' a\u015famas\u0131na al\u0131nd\u0131', 'ok');
    var el = document.getElementById('ihr-sag-cockpit');
    if (el) _ihrRenderDosyaDetayInto(dosyaId, el);
    else { _ihrRenderSolListe(); }
  }});
};

/* IHR-SURECBAR-002: Checklist modal */
window._ihrChecklistGoster = function(dosyaId, adimIdx) {
  var CL = [
    { l: 'Taslak', checklist: ['PI haz\u0131r', 'M\u00fc\u015fteri onay\u0131', 'HS kodlar\u0131 dolu'] },
    { l: 'Haz\u0131rlan\u0131yor', checklist: ['CI onaylanm\u0131\u015f', 'PL tamamlanm\u0131\u015f', 'G\u00fcmr\u00fck\u00e7\u00fc atanm\u0131\u015f'] },
    { l: 'Y\u00fckleniyor', checklist: ['G\u00c7B tescil', 'Sigorta aktif', 'Booking var'] },
    { l: 'Y\u00fcklendi', checklist: ['BL al\u0131nd\u0131', 'Konteyner m\u00fch\u00fcrl\u00fc'] },
    { l: 'Yolda', checklist: ['BL m\u00fc\u015fteriye g\u00f6nderildi', 'ETD onaylanm\u0131\u015f'] },
    { l: 'Teslim', checklist: ['Var\u0131\u015f onay\u0131', 'KDV iade talebi'] }
  ];
  var step = CL[adimIdx] || CL[0];
  var old = document.getElementById('mo-checklist'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-checklist';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var rows = step.checklist.map(function(c) { return '<div style="padding:5px 0;font-size:11px;border-bottom:0.5px solid var(--b)">' + c + '</div>'; }).join('');
  mo.innerHTML = '<div class="moc" style="max-width:360px;padding:0;border-radius:12px;overflow:hidden"><div style="padding:10px 16px;border-bottom:0.5px solid var(--b);font-size:12px;font-weight:500">' + step.l + ' \u2014 Yap\u0131lacaklar</div><div style="padding:10px 16px">' + rows + '</div><div style="padding:8px 16px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-checklist\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

/* IHR-SURECBAR-002: Paydas bildirim */
window._ihrPaydasBildirim = function(dosyaId, tip) {
  var tipL = { gumrukcu: 'G\u00fcmr\u00fck\u00e7\u00fc', forwarder: 'Forwarder', musteri: 'M\u00fc\u015fteri' };
  window.toast?.((tipL[tip] || tip) + ' i\u00e7in bildirim linki olu\u015fturuldu \u2014 Evraklar sekmesinden payla\u015fabilirsiniz', 'ok');
  window._ihrDetayTab?.('evraklar', dosyaId);
};

window._ihrDetayRenderEvraklar = function(d, c) {
  if (!c) c = _g('ihr-detay-content'); if (!c) return;
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  var dosyaAsama = parseInt(d.asamaNo || d.asama || 1) || 1;
  var gm = null; try { _loadGM().forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; }); } catch(e2) {}
  var fw = null; try { _loadFW().forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; }); } catch(e2) {}
  var gmAd = gm ? _esc(gm.firma_adi || 'G\u00fcmr\u00fck\u00e7\u00fc') : 'G\u00fcmr\u00fck\u00e7\u00fc';
  var fwAd = fw ? _esc(fw.firma_adi || 'Forwarder') : 'Forwarder';
  var EVRAK_LIST = [
    { tur:'PI',    l:'Proforma Invoice',       grup:'ticaret',  uretici:'Duay',       taraflar:{musteri:true},                             sorumluTip:'duay',      bagimli:'',     duay:true  },
    { tur:'CI',    l:'Commercial Invoice',     grup:'ticaret',  uretici:'Duay',       taraflar:{musteri:true},                             sorumluTip:'duay',      bagimli:'G\u00c7B', duay:true  },
    { tur:'TRFAT', l:'TR \u0130hracat Faturas\u0131',  grup:'ticaret',  uretici:'Duay',       taraflar:{gumrukcu:true},                            sorumluTip:'duay',      bagimli:'G\u00c7B', duay:true  },
    { tur:'INSP',  l:'Inspection Raporu',      grup:'ticaret',  uretici:'Muayene',    taraflar:{musteri:true},                             sorumluTip:'dis',       bagimli:'',     duay:false },
    { tur:'PL',    l:'Packing List',           grup:'lojistik', uretici:'Duay',       taraflar:{musteri:true,gumrukcu:true,forwarder:true}, sorumluTip:'duay',      bagimli:'G\u00c7B', duay:true  },
    { tur:'SEVK',  l:'Konteyner Sevk Emri',    grup:'lojistik', uretici:'Duay',       taraflar:{forwarder:true},                           sorumluTip:'duay',      bagimli:'',     duay:true  },
    { tur:'YUK',   l:'Y\u00fckleme Talimat\u0131',    grup:'lojistik', uretici:'Duay',       taraflar:{forwarder:true},                           sorumluTip:'duay',      bagimli:'',     duay:true  },
    { tur:'BL',    l:'Bill of Lading',         grup:'lojistik', uretici:'Forwarder',  taraflar:{musteri:true,forwarder:true},              sorumluTip:'forwarder', bagimli:'\u00d6deme', duay:false },
    { tur:'TTF',   l:'Teklif Talep Formu',     grup:'operasyon',uretici:'Duay',       taraflar:{forwarder:true,sigortaci:true},            sorumluTip:'duay',      bagimli:'',     duay:true  },
    { tur:'GCB',   l:'G\u00c7B',              grup:'gumruk',   uretici:'G\u00fcmr\u00fck\u00e7\u00fc',  taraflar:{gumrukcu:true,forwarder:true},             sorumluTip:'gumrukcu',  bagimli:'BL',   duay:false },
    { tur:'MENSEI',l:'Men\u015fei \u015eahadetnamesi', grup:'mensei',   uretici:'G\u00fcmr\u00fck\u00e7\u00fc',  taraflar:{musteri:true},                             sorumluTip:'gumrukcu',  bagimli:'',     duay:false },
    { tur:'EUR1',  l:'EUR.1 / A.TR',          grup:'mensei',   uretici:'G\u00fcmr\u00fck\u00e7\u00fc',  taraflar:{musteri:true},                             sorumluTip:'gumrukcu',  bagimli:'',     duay:false },
    { tur:'SIG',   l:'Sigorta Poli\u00e7esi', grup:'sigorta',  uretici:'Sigortac\u0131', taraflar:{sigortaci:true},                           sorumluTip:'sigortaci', bagimli:'BL',   duay:false }
  ];
  var GRUPLAR = [
    { id:'ticaret',  l:'T\u0130CARET BELGELER\u0130',   renk:'#185FA5' },
    { id:'lojistik', l:'LOJ\u0130ST\u0130K BELGELER\u0130',  renk:'#d97706' },
    { id:'operasyon',l:'OPERASYON BELGELER\u0130', renk:'#7F77DD' },
    { id:'gumruk',   l:'G\u00dcMR\u00dcK BELGELER\u0130',   renk:'#dc2626' },
    { id:'mensei',   l:'MEN\u015eE\u0130 BELGELER\u0130',   renk:'#16a34a' },
    { id:'sigorta',  l:'S\u0130GORTA BELGELER\u0130',  renk:'#7c3aed' }
  ];
  /* Yardimci fonksiyonlar */
  var _tl = function(taraflarObj, taraf, kayit) {
    if (!taraflarObj[taraf]) return '<td style="text-align:center;padding:4px 6px;border-left:1px solid var(--b)"><span style="color:var(--t3)">\u2014</span></td>';
    var bg, ic, title;
    if (!kayit) { bg = '#fee2e2'; ic = '!'; title = 'Eksik'; }
    else if (kayit.durum === 'gonderildi' || kayit.durum === 'tamamlandi' || kayit.durum === 'onaylandi') { bg = '#dcfce7'; ic = '\u2713'; title = 'Haz\u0131r'; }
    else if (kayit.durum === 'taslak' || kayit.durum === 'hazirlaniyor') { bg = '#fef9c3'; ic = '\u23f3'; title = 'Haz\u0131rlan\u0131yor'; }
    else { bg = '#f3f4f6'; ic = '\u25cb'; title = 'Hen\u00fcz gerekmez'; }
    var tbg = taraf === 'musteri' ? '#eff6ff' : taraf === 'gumrukcu' ? '#fff7ed' : taraf === 'forwarder' ? '#fffbeb' : taraf === 'sigortaci' ? '#faf5ff' : '';
    return '<td style="text-align:center;padding:4px 6px;border-left:1px solid var(--b);background:' + tbg + '" title="' + title + '"><div style="width:22px;height:22px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:10px">' + ic + '</div></td>';
  };
  var _doluluk = function(kayit) { if (!kayit) return 0; if (kayit.durum === 'gonderildi' || kayit.durum === 'tamamlandi') return 100; if (kayit.durum === 'onaylandi') return 85; if (kayit.durum === 'hazirlaniyor') return 55; if (kayit.durum === 'taslak') return 30; return 10; };
  var _dolulukHtml = function(pct) { var r = pct >= 85 ? '#16a34a' : pct >= 50 ? '#ca8a04' : pct > 0 ? '#dc2626' : '#d1d5db'; return '<div style="width:44px;height:4px;background:#e5e7eb;border-radius:2px;margin:0 auto"><div style="width:' + pct + '%;height:4px;background:' + r + ';border-radius:2px"></div></div><div style="font-size:8px;text-align:center;color:' + r + ';margin-top:1px">' + (pct > 0 ? '%' + pct : '\u2014') + '</div>'; };
  var _sorumluHtml = function(ev) { var ad, bg, clr; if (ev.sorumluTip === 'gumrukcu') { ad = gmAd; bg = '#fff7ed'; clr = '#d97706'; } else if (ev.sorumluTip === 'forwarder') { ad = fwAd; bg = '#fffbeb'; clr = '#d97706'; } else if (ev.sorumluTip === 'sigortaci') { ad = 'Sigortac\u0131'; bg = '#faf5ff'; clr = '#7c3aed'; } else if (ev.sorumluTip === 'dis') { ad = 'D\u0131\u015f Taraf'; bg = '#f3f4f6'; clr = '#6b7280'; } else { ad = 'Duay'; bg = '#eff6ff'; clr = '#185FA5'; } return '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:' + bg + ';color:' + clr + ';font-weight:500">' + ad + '</span>'; };

  var tamam = 0, kritik = 0, hazir = 0;
  EVRAK_LIST.forEach(function(ev) { var k = evraklar.find(function(e) { return e.tur === ev.tur; }); var p = _doluluk(k); if (p >= 85) tamam++; else if (p >= 30) hazir++; else kritik++; });
  var h = '';

  /* Toolbar */
  h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--sf);border-bottom:0.5px solid var(--b);position:sticky;top:0;z-index:10">';
  h += '<span style="font-size:10px;font-weight:500;color:var(--t)">' + tamam + '/' + EVRAK_LIST.length + ' belge</span>';
  if (kritik > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#fee2e2;color:#dc2626">' + kritik + ' kritik</span>';
  if (hazir > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#fef9c3;color:#ca8a04">' + hazir + ' haz\u0131rlan\u0131yor</span>';
  h += '<div style="flex:1"></div>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrTumBelgeLink?.(\'' + d.id + '\')" style="font-size:9px">\u2197 T\u00fcm\u00fcn\u00fc Payla\u015f</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrOzelEvrakEkle?.(\'' + d.id + '\')" style="font-size:9px">+ Belge Ekle</button>';
  h += '</div>';

  /* Legend */
  h += '<div style="display:flex;gap:10px;padding:4px 14px;background:var(--sf);border-bottom:0.5px solid var(--b);font-size:8px;color:var(--t3)">';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#dcfce7;margin-right:3px"></span>Haz\u0131r</span>';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#fef9c3;margin-right:3px"></span>Haz\u0131rlan\u0131yor</span>';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#fee2e2;margin-right:3px"></span>Eksik</span>';
  h += '<span style="margin-left:6px;font-style:italic">Sat\u0131ra t\u0131kla: detay g\u00f6r</span></div>';

  /* Tablo */
  h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10px">';
  h += '<thead><tr style="background:var(--sf)">';
  h += '<th style="padding:6px 10px;text-align:left;font-size:9px;font-weight:500;color:var(--t3);border-bottom:0.5px solid var(--b);min-width:170px">Belge</th>';
  h += '<th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:500;color:var(--t3);border-bottom:0.5px solid var(--b);min-width:70px">Sorumlu</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:var(--t3);border-bottom:0.5px solid var(--b);min-width:55px">Doluluk</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:#185FA5;border-bottom:0.5px solid var(--b);background:#eff6ff;min-width:65px">M\u00fc\u015fteri</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:#d97706;border-bottom:0.5px solid var(--b);background:#fff7ed;min-width:65px">G\u00fcmr\u00fck\u00e7\u00fc</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:#d97706;border-bottom:0.5px solid var(--b);background:#fffbeb;min-width:65px">Forwarder</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:#7c3aed;border-bottom:0.5px solid var(--b);background:#faf5ff;min-width:65px">Sigortac\u0131</th>';
  h += '<th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:500;color:var(--t3);border-bottom:0.5px solid var(--b);min-width:60px">Aksiyon</th>';
  h += '</tr></thead><tbody>';

  GRUPLAR.forEach(function(grup) {
    var gb = EVRAK_LIST.filter(function(ev) { return ev.grup === grup.id; });
    if (!gb.length) return;
    h += '<tr><td colspan="8" style="padding:4px 10px;background:var(--s2);font-size:8px;font-weight:600;letter-spacing:.07em;color:' + grup.renk + ';border-top:0.5px solid var(--b);border-bottom:0.5px solid var(--b)">' + grup.l + '</td></tr>';
    gb.forEach(function(ev) {
      var kayit = evraklar.find(function(e) { return e.tur === ev.tur; });
      var pct = _doluluk(kayit);
      var expId = 'evr-exp-' + d.id + '-' + ev.tur;
      h += '<tr onclick="event.stopPropagation();window._ihrEvrakToggle(\'' + expId + '\')" style="cursor:pointer;border-bottom:0.5px solid var(--b)">';
      /* Belge adi */
      h += '<td style="padding:6px 10px"><div style="display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:' + (pct >= 85 ? '#16a34a' : pct >= 30 ? '#ca8a04' : pct > 0 ? '#dc2626' : '#d1d5db') + ';flex-shrink:0"></span><div><div style="font-size:10px;font-weight:500;color:var(--t)">' + _esc(ev.l) + '</div><div style="font-size:8px;color:var(--t3)">' + _esc(ev.uretici) + '</div>';
      if (ev.bagimli && pct < 85) h += '<div style="font-size:8px;color:#dc2626">\u2192 ' + _esc(ev.bagimli) + ' bloke</div>';
      h += '</div></div></td>';
      /* Sorumlu */
      h += '<td style="padding:4px 8px">' + _sorumluHtml(ev) + '</td>';
      /* Doluluk */
      h += '<td style="padding:4px 8px;text-align:center">' + _dolulukHtml(pct) + '</td>';
      /* Taraf sutunlari */
      h += _tl(ev.taraflar, 'musteri', kayit);
      h += _tl(ev.taraflar, 'gumrukcu', kayit);
      h += _tl(ev.taraflar, 'forwarder', kayit);
      h += _tl(ev.taraflar, 'sigortaci', kayit);
      /* Aksiyon */
      h += '<td style="padding:4px 8px;text-align:right">';
      if (!kayit) {
        if (ev.duay) h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrEvrakOlustur?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:8px;padding:1px 7px">Olu\u015ftur</button>';
        else h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSmartEvrakYukle?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:8px;padding:1px 7px">Y\u00fckle</button>';
      } else if (pct >= 85) {
        h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrBelgeLink?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:8px;padding:1px 7px">\ud83d\udd17 Link</button>';
      } else {
        if (kayit.durum === 'taslak' && ev.duay) h += '<button class="btn" onclick="event.stopPropagation();window._ihrEvrakOnayla?.(\'' + kayit.id + '\')" style="font-size:8px;padding:1px 7px;background:#EAF3DE;color:#27500A;border:0.5px solid #97C459">Onayla</button>';
        else if (kayit.durum === 'onaylandi' && ev.duay) h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrEvrakGonderModal?.(\'' + kayit.id + '\',\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:8px;padding:1px 7px">G\u00f6nder</button>';
        else h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSmartEvrakYukle?.(\'' + d.id + '\',\'' + ev.tur + '\')" style="font-size:8px;padding:1px 7px">Devam</button>';
      }
      h += '</td></tr>';
      /* Expand satiri */
      h += '<tr id="' + expId + '" style="display:none"><td colspan="8" style="padding:8px 14px;background:#eff6ff;border-bottom:0.5px solid #dbeafe;font-size:9px">';
      if (!kayit) {
        h += '<div style="color:#dc2626">\u26a0 Hen\u00fcz belge y\u00fcklenmedi / olu\u015fturulmad\u0131.';
        if (ev.bagimli) h += ' Bu belge olmadan <strong>' + _esc(ev.bagimli) + '</strong> tamamlanamaz.';
        h += '</div>';
      } else {
        var durR = pct >= 85 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626';
        h += '<div style="display:flex;gap:16px;flex-wrap:wrap"><div><div style="font-weight:500;color:#185FA5;margin-bottom:3px">Durum: <span style="color:' + durR + '">' + _esc(kayit.durum || '?') + '</span></div>';
        if (kayit.gonderim_tarihi || kayit.updatedAt) h += '<div style="color:#6b7280">Son g\u00fcncelleme: ' + _esc((kayit.gonderim_tarihi || kayit.updatedAt || '').slice(0, 10)) + '</div>';
        if (kayit.yukleyen_ad) h += '<div style="color:#6b7280">Y\u00fckleyen: ' + _esc(kayit.yukleyen_ad) + '</div>';
        h += '</div>';
        if (ev.bagimli && pct < 85) h += '<div style="color:#dc2626">\u26a0 Tamamlanmadan <strong>' + _esc(ev.bagimli) + '</strong> yap\u0131lamaz.</div>';
        h += '</div>';
      }
      h += '</td></tr>';
    });
  });
  h += '</tbody></table></div>';

  /* Ozel evraklar */
  var ozelEvraklar = evraklar.filter(function(e) { return e.tur && e.tur.indexOf('OZEL_') === 0; });
  if (ozelEvraklar.length) {
    h += '<div style="font-size:10px;font-weight:500;margin:10px 0 4px 14px;color:var(--t3)">Ozel Belgeler</div>';
    ozelEvraklar.forEach(function(ev) {
      h += '<div style="display:flex;align-items:center;gap:6px;padding:5px 14px;border-bottom:0.5px solid var(--b)">';
      h += '<span style="flex:1;font-size:10px">' + _esc(ev.belge_adi || ev.tur) + '</span>';
      if (ev.dosya_url) h += '<a href="' + _esc(ev.dosya_url) + '" target="_blank" style="font-size:9px;color:#185FA5;text-decoration:none">Indir</a>';
      h += '<button class="btn btns btnd" onclick="event.stopPropagation();window._ihrOzelEvrakSil?.(\'' + ev.id + '\')" style="font-size:8px;padding:1px 4px">Sil</button>';
      h += '</div>';
    });
  }
  c.innerHTML = h;
};

/* IHR-DOKUMAN-001: Belge bazli paylasim linki */
/* IHR-MUTABAKAT-001: Alis/CI/PL/GCB karsilastirma */
window._ihrDetayRenderMutabakat = function(d, c) {
  if (!c) c = _g('ihr-detay-content'); if (!c) return;
  var dosyaId = d.id;
  var ihU = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var tumSA = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var gcbM = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
  var fN = function(n) { return Math.round(n).toLocaleString('tr-TR'); };

  var satirlar = ihU.map(function(u) {
    var esl = tumSA.find(function(s) { var uA = (u.aciklama || u.urun_adi || '').toLowerCase(); var sA = (s.urun || '').toLowerCase(); return (u.satinalma_id && String(s.id) === String(u.satinalma_id)) || (uA.length > 5 && sA.length > 5 && (uA.indexOf(sA.slice(0, 8)) !== -1 || sA.indexOf(uA.slice(0, 8)) !== -1)); }) || null;
    var ciM = parseFloat(u.miktar) || 0; var ciT = ciM * (parseFloat(u.birim_fiyat) || 0);
    var aM = esl ? (parseFloat(esl.miktar) || 0) : null; var aT = esl ? (aM * (parseFloat(esl.birimFiyat) || 0)) : null;
    var mF = aM !== null ? Math.abs(ciM - aM) : null; var dF = aT !== null ? Math.abs(ciT - aT) : null;
    var dur, dR, dB;
    if (!esl) { dur = 'Al\u0131\u015f yok'; dR = '#A32D2D'; dB = '#FCEBEB'; }
    else if (dF > 500) { dur = '$' + fN(dF) + ' fark'; dR = '#A32D2D'; dB = '#FCEBEB'; }
    else if (mF > 0) { dur = 'Miktar +' + Math.round(mF); dR = '#633806'; dB = '#FAEEDA'; }
    else if (!u.hs_kodu || u.hs_kodu.length < 6) { dur = 'HS eksik'; dR = '#633806'; dB = '#FAEEDA'; }
    else { dur = 'E\u015fle\u015fti'; dR = '#27500A'; dB = '#EAF3DE'; }
    return { u: u, esl: esl, ciM: ciM, ciT: ciT, aM: aM, aT: aT, mF: mF, dF: dF, dur: dur, dR: dR, dB: dB };
  });

  var topE = satirlar.filter(function(s) { return s.dur === 'E\u015fle\u015fti'; }).length;
  var topF = satirlar.filter(function(s) { return s.dur !== 'E\u015fle\u015fti'; }).length;
  var topCI = satirlar.reduce(function(a, s) { return a + s.ciT; }, 0);
  var topAL = satirlar.reduce(function(a, s) { return a + (s.aT || 0); }, 0);
  var marj = topCI > 0 ? Math.round((topCI - topAL) / topCI * 1000) / 10 : 0;
  var h = '';

  /* Toolbar */
  h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--sf);border-bottom:0.5px solid var(--b);position:sticky;top:0;z-index:10">';
  h += '<span style="font-size:11px;font-weight:500">Belge Mutabakat</span>';
  h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#EAF3DE;color:#27500A">' + topE + ' e\u015fle\u015fti</span>';
  if (topF > 0) h += '<span style="font-size:9px;padding:1px 7px;border-radius:10px;background:#FEF2F2;color:#DC2626">' + topF + ' fark</span>';
  h += '<div style="flex:1"></div>';
  h += '<select id="ihr-mut-filtre" onchange="event.stopPropagation();window._ihrMutabakatFiltre()" style="font-size:10px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit"><option value="hepsi">T\u00fcm kalemler</option><option value="fark">Sadece farklar</option><option value="eslesen">Sadece e\u015fle\u015fenler</option><option value="alis_yok">Al\u0131\u015f eksik</option></select>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrMutabakatExcel?.(\'' + dosyaId + '\')" style="font-size:9px">Excel</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKarRaporu?.(\'' + dosyaId + '\')" style="font-size:9px">\ud83d\udcb0 K\u00e2r Raporu</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrMutabakatOzet?.(\'' + dosyaId + '\')" style="font-size:9px">\ud83d\udcca \u00d6zet Rapor</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrMutabakatPdf?.(\'' + dosyaId + '\')" style="font-size:9px">PDF Rapor</button>';
  h += '</div>';

  /* VGM KG Kontrolü */
  var plBrutKg = ihU.reduce(function(a,u){ return a + (parseFloat(u.brut_kg)||0); }, 0);
  var vgmKg2 = ihU.reduce(function(a,u){ return a + (parseFloat(u.vgm_kg)||0); }, 0);
  var vgmVar2 = vgmKg2 > 0;
  var gcb1kg = gcbM[0]; var gcbBrutKg = gcb1kg ? (parseFloat(gcb1kg.brut_kg || gcb1kg.toplam_kg || 0)) : null;
  var blListKg = _loadBL().filter(function(b){ return String(b.dosya_id)===String(dosyaId)&&!b.isDeleted; });
  var bl1kg = blListKg[0]; var blKg2 = bl1kg ? (parseFloat(bl1kg.toplam_kg || 0)) : null;
  var kgEsit = function(a, b) { return b !== null && Math.abs(a - b) < 1; };
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:6px">VGM KG KONTROL\u00dc</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px">';
  var _vS = 'border-radius:6px;padding:7px 10px;text-align:center';
  h += '<div style="' + _vS + ';background:#E6F1FB;border:0.5px solid #B5D4F4"><div style="font-size:8px;color:#0C447C">VGM</div><div style="font-size:16px;font-weight:600;color:#185FA5">' + (vgmVar2 ? fN(vgmKg2) : '\u2014') + '</div><div style="font-size:8px;color:var(--t3)">Referans</div></div>';
  var _plMatch = vgmVar2 && kgEsit(vgmKg2, plBrutKg); var _plClr = _plMatch ? '#16A34A' : (vgmVar2 ? '#DC2626' : 'var(--t)');
  h += '<div style="' + _vS + ';background:' + (_plMatch ? '#EAF3DE' : 'var(--s2)') + ';border:0.5px solid ' + (_plMatch ? '#C0DD97' : 'var(--b)') + '"><div style="font-size:8px;color:var(--t3)">PL</div><div style="font-size:16px;font-weight:600;color:' + _plClr + '">' + fN(plBrutKg) + '</div>' + (vgmVar2 && !_plMatch ? '<div style="font-size:8px;color:#DC2626">Fark: ' + fN(plBrutKg - vgmKg2) + '</div>' : '') + '</div>';
  var _gcbMatch = gcbBrutKg !== null && vgmVar2 && kgEsit(vgmKg2, gcbBrutKg); var _gcbClr2 = gcbBrutKg === null ? 'var(--t3)' : (_gcbMatch ? '#16A34A' : '#DC2626');
  h += '<div style="' + _vS + ';background:' + (_gcbMatch ? '#EAF3DE' : 'var(--s2)') + ';border:0.5px solid ' + (_gcbMatch ? '#C0DD97' : 'var(--b)') + '"><div style="font-size:8px;color:var(--t3)">G\u00c7B</div><div style="font-size:16px;font-weight:600;color:' + _gcbClr2 + '">' + (gcbBrutKg !== null ? fN(gcbBrutKg) : '\u2014') + '</div>' + (gcbBrutKg === null ? '<div style="font-size:8px;color:#D97706">Bekleniyor</div>' : '') + '</div>';
  var _blMatch = blKg2 !== null && vgmVar2 && kgEsit(vgmKg2, blKg2); var _blClr2 = blKg2 === null ? 'var(--t3)' : (_blMatch ? '#16A34A' : '#DC2626');
  h += '<div style="' + _vS + ';background:' + (_blMatch ? '#EAF3DE' : 'var(--s2)') + ';border:0.5px solid ' + (_blMatch ? '#C0DD97' : 'var(--b)') + '"><div style="font-size:8px;color:var(--t3)">BL</div><div style="font-size:16px;font-weight:600;color:' + _blClr2 + '">' + (blKg2 !== null ? fN(blKg2) : '\u2014') + '</div>' + (blKg2 === null ? '<div style="font-size:8px;color:#D97706">Bekleniyor</div>' : '') + '</div>';
  h += '</div>';
  /* Sonuç pill'leri */
  h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
  if (vgmVar2) {
    h += '<span style="font-size:8px;padding:2px 7px;border-radius:10px;background:' + (_plMatch ? '#EAF3DE' : '#FCEBEB') + ';color:' + (_plMatch ? '#27500A' : '#791F1F') + '">' + (_plMatch ? 'VGM = PL \u2713' : 'VGM \u2260 PL') + '</span>';
    h += '<span style="font-size:8px;padding:2px 7px;border-radius:10px;background:' + (gcbBrutKg === null ? '#FAEEDA' : _gcbMatch ? '#EAF3DE' : '#FCEBEB') + ';color:' + (gcbBrutKg === null ? '#854F0B' : _gcbMatch ? '#27500A' : '#791F1F') + '">' + (gcbBrutKg === null ? 'G\u00c7B bekleniyor' : _gcbMatch ? 'VGM = G\u00c7B \u2713' : 'VGM \u2260 G\u00c7B') + '</span>';
    h += '<span style="font-size:8px;padding:2px 7px;border-radius:10px;background:' + (blKg2 === null ? '#FAEEDA' : _blMatch ? '#EAF3DE' : '#FCEBEB') + ';color:' + (blKg2 === null ? '#854F0B' : _blMatch ? '#27500A' : '#791F1F') + '">' + (blKg2 === null ? 'BL bekleniyor' : _blMatch ? 'VGM = BL \u2713' : 'VGM \u2260 BL') + '</span>';
  } else { h += '<span style="font-size:8px;padding:2px 7px;border-radius:10px;background:#FAEEDA;color:#854F0B">VGM girilmemi\u015f</span>'; }
  h += '</div></div>';

  /* KPI */
  h += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:8px 12px;border-bottom:0.5px solid var(--b)">';
  var kS = 'background:var(--s2);border-radius:6px;padding:7px 10px;text-align:center';
  h += '<div style="' + kS + '"><div style="font-size:9px;color:var(--t3)">Kalem</div><div style="font-size:18px;font-weight:500;color:var(--t)">' + satirlar.length + '</div></div>';
  h += '<div style="' + kS + '"><div style="font-size:9px;color:#27500A">E\u015fle\u015fen</div><div style="font-size:18px;font-weight:500;color:#16A34A">' + topE + '</div></div>';
  h += '<div style="' + kS + '"><div style="font-size:9px;color:#633806">Fark</div><div style="font-size:18px;font-weight:500;color:#D97706">' + topF + '</div></div>';
  h += '<div style="' + kS + '"><div style="font-size:9px;color:#0C447C">CI Toplam</div><div style="font-size:18px;font-weight:500;color:#185FA5">$' + fN(topCI) + '</div></div>';
  h += '<div style="' + kS + '"><div style="font-size:9px;color:var(--t3)">Br\u00fct Marj</div><div style="font-size:18px;font-weight:500;color:' + (marj > 10 ? '#16A34A' : marj > 0 ? '#D97706' : '#DC2626') + '">' + (marj > 0 ? '%' + marj : '\u2014') + '</div></div>';
  h += '</div>';

  /* Basliklar */
  var kH = 'padding:5px 8px;font-size:9px;font-weight:500;border-left:0.5px solid var(--b)';
  h += '<div style="display:flex;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  h += '<div style="padding:5px 8px;font-size:9px;font-weight:500;color:var(--t3);min-width:160px;flex:1">\u00dcr\u00fcn</div>';
  h += '<div style="' + kH + ';min-width:130px;background:#FAEEDA;color:#633806">Al\u0131\u015f Faturas\u0131</div>';
  h += '<div style="' + kH + ';min-width:130px;background:#E6F1FB;color:#0C447C">CI</div>';
  h += '<div style="' + kH + ';min-width:110px;background:#EAF3DE;color:#27500A">PL</div>';
  h += '<div style="' + kH + ';min-width:100px;background:#FCEBEB;color:#791F1F">G\u00c7B</div>';
  h += '<div style="' + kH + ';min-width:75px;color:var(--t3)">Durum</div>';
  h += '</div>';

  /* Satirlar */
  if (!satirlar.length) { h += '<div style="text-align:center;padding:40px;color:var(--t3);font-size:11px">\u00dcr\u00fcn bulunamad\u0131</div>'; }
  else {
    h += '<div id="ihr-mut-satirlar">';
    satirlar.forEach(function(s, idx) {
      var u = s.u; var bgR = idx % 2 === 1 ? 'background:var(--s2)' : '';
      var durumKey = !s.esl ? 'alis_yok' : (s.dF > 500 || s.mF > 0) ? 'fark' : 'eslesen';
      h += '<div data-durum="' + durumKey + '" style="display:flex;border-bottom:0.5px solid var(--b);' + bgR + '">';
      /* Urun */
      h += '<div style="padding:6px 8px;min-width:160px;flex:1;border-right:0.5px solid var(--b)"><div style="font-size:10px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">' + _esc(u.aciklama || u.urun_adi || '\u2014') + '</div><div style="font-size:8px;color:var(--t3)">' + _esc(u.urun_kodu || '') + '</div></div>';
      /* Alis */
      h += '<div style="padding:6px 8px;min-width:130px;background:' + (s.esl ? '#FAEEDA' : '#FCEBEB') + ';border-left:0.5px solid var(--b)">';
      if (s.esl) { h += '<div style="font-size:10px">' + fN(s.aM) + '</div><div style="font-size:8px;color:#633806">$' + fN(s.aT || 0) + '</div>'; }
      else { h += '<div style="font-size:9px;color:#A32D2D;font-style:italic">E\u015fle\u015fme yok</div>'; }
      h += '</div>';
      /* CI */
      h += '<div style="padding:6px 8px;min-width:130px;background:#E6F1FB;border-left:0.5px solid var(--b)"><div style="font-size:10px;color:' + (s.mF > 0 ? '#DC2626' : 'var(--t)') + '">' + fN(s.ciM) + ' ' + _esc(u.birim || 'kg') + '</div><div style="font-size:8px;color:#0C447C">$' + fN(s.ciT) + '</div></div>';
      /* PL */
      h += '<div style="padding:6px 8px;min-width:110px;background:#EAF3DE;border-left:0.5px solid var(--b)"><div style="font-size:10px;color:#27500A">' + (u.koli_adet ? fN(u.koli_adet) + ' koli' : '\u2014') + '</div><div style="font-size:8px;color:#27500A">' + (u.brut_kg ? fN(u.brut_kg) + ' kg' : '\u2014') + '</div></div>';
      /* GCB */
      h += '<div style="padding:6px 8px;min-width:100px;background:#FCEBEB;border-left:0.5px solid var(--b)"><div style="font-size:9px;color:' + (gcbM.length ? '#27500A' : '#791F1F') + '">' + (gcbM.length ? _esc(gcbM[0].tescil_no || 'Tescilli') : 'Bekleniyor') + '</div></div>';
      /* Durum */
      h += '<div style="padding:6px 8px;min-width:75px;text-align:center;border-left:0.5px solid var(--b)"><span style="font-size:8px;padding:1px 6px;border-radius:3px;background:' + s.dB + ';color:' + s.dR + ';font-weight:500">' + s.dur + '</span></div>';
      h += '</div>';
    });
    h += '</div>'; /* ihr-mut-satirlar bitti */
    /* Toplam */
    h += '<div style="display:flex;background:var(--s2);border-top:1px solid var(--b)">';
    h += '<div style="padding:7px 8px;min-width:160px;flex:1;font-weight:500;font-size:10px">TOPLAM</div>';
    h += '<div style="padding:7px 8px;min-width:130px;background:#FAEEDA;border-left:0.5px solid var(--b);font-weight:500;font-size:10px;color:#633806">$' + fN(topAL) + '</div>';
    h += '<div style="padding:7px 8px;min-width:130px;background:#E6F1FB;border-left:0.5px solid var(--b);font-weight:500;font-size:10px;color:#0C447C">$' + fN(topCI) + '</div>';
    h += '<div style="padding:7px 8px;min-width:110px;background:#EAF3DE;border-left:0.5px solid var(--b);font-size:10px;color:#27500A">' + fN(satirlar.reduce(function(a, s2) { return a + (parseInt(s2.u.koli_adet) || 0); }, 0)) + ' koli</div>';
    h += '<div style="padding:7px 8px;min-width:100px;background:#FCEBEB;border-left:0.5px solid var(--b);font-size:10px;color:#791F1F">' + gcbM.length + ' G\u00c7B</div>';
    h += '<div style="padding:7px 8px;min-width:75px;border-left:0.5px solid var(--b);font-size:10px;font-weight:500;color:' + (marj > 10 ? '#16A34A' : '#D97706') + '">' + (marj > 0 ? '%' + marj : '\u2014') + '</div>';
    h += '</div>';
  }
  c.innerHTML = h;
};

/* IHR-KAPAT-001: Dosya kapama kontrol listesi */
window._ihrKapamaKontrol = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return { kapanabilir: false, tamamlandi: [], eksikler: [], uyarilar: [], kosullar: [], durum: '' };
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId) && !e.isDeleted; });
  var gcbList = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
  var blList = _loadBL().filter(function(b) { return String(b.dosya_id) === String(dosyaId) && !b.isDeleted; });
  var _evOk = function(tur) { var e = evraklar.find(function(x) { return x.tur === tur; }); return e && ['gonderildi', 'onaylandi', 'tamamlandi'].indexOf(e.durum) !== -1; };
  var KOSULLAR = [
    { grup: 'Belgeler', l: 'PI onayl\u0131', zorunlu: true, ok: _evOk('PI') },
    { grup: 'Belgeler', l: 'CI g\u00f6nderildi', zorunlu: true, ok: _evOk('CI') },
    { grup: 'Belgeler', l: 'PL haz\u0131r', zorunlu: true, ok: _evOk('PL') },
    { grup: 'Belgeler', l: 'G\u00c7B tescilli', zorunlu: true, ok: gcbList.length > 0 },
    { grup: 'Belgeler', l: 'BL al\u0131nd\u0131', zorunlu: true, ok: blList.length > 0 },
    { grup: 'Belgeler', l: 'TR \u0130hracat Faturas\u0131', zorunlu: false, ok: _evOk('TRFAT') },
    { grup: 'Finans', l: 'Sigorta poli\u00e7esi', zorunlu: true, ok: !!d.police_no || _evOk('SIG') },
    { grup: 'Finans', l: 'KDV iade talebi', zorunlu: false, ok: !!d.kdv_iade_tarihi },
    { grup: 'Finans', l: 'Kambiyo takibi', zorunlu: false, ok: !!d.kambiyo_takip },
    { grup: 'Onay', l: 'M\u00fc\u015fteri teslim onay\u0131', zorunlu: true, ok: !!d.teslim_onay },
    { grup: 'Onay', l: 'Belge mutabakat\u0131', zorunlu: false, ok: true },
    { grup: 'Onay', l: 'G\u00fcmr\u00fck\u00e7\u00fc hesapla\u015fmas\u0131', zorunlu: false, ok: !!d.gumrukcu_hesap_ok }
  ];
  var tam = KOSULLAR.filter(function(k) { return k.ok; });
  var eks = KOSULLAR.filter(function(k) { return !k.ok && k.zorunlu; });
  var uy = KOSULLAR.filter(function(k) { return !k.ok && !k.zorunlu; });
  return { kapanabilir: eks.length === 0 && d.durum !== 'kapandi', tamamlandi: tam, eksikler: eks, uyarilar: uy, kosullar: KOSULLAR, durum: d.durum };
};

window._ihrDetayRenderKapat = function(d, c) {
  if (!c) c = _g('ihr-detay-content'); if (!c) return;
  var dosyaId = d.id;
  if (d.durum === 'kapandi') {
    c.innerHTML = '<div style="text-align:center;padding:40px 20px"><div style="font-size:32px;margin-bottom:10px">\u2713</div><div style="font-size:14px;font-weight:500;color:#16A34A;margin-bottom:6px">Bu dosya kapat\u0131lm\u0131\u015f</div><div style="font-size:11px;color:var(--t3);margin-bottom:16px">Kapanma tarihi: ' + _esc(d.kapanma_tarihi || '\u2014') + '</div><button class="btn btns" onclick="event.stopPropagation();window._ihrKapamaRaporu?.(\'' + dosyaId + '\')">Kapama Raporu</button></div>';
    return;
  }
  var kp = window._ihrKapamaKontrol(dosyaId);
  var pct = Math.round(kp.tamamlandi.length / kp.kosullar.length * 100);
  var pR2 = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var topFOB = urunler.reduce(function(a, u) { return a + (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }, 0);
  var fU2 = function(n) { return '$' + Math.round(n || 0).toLocaleString('tr-TR'); };
  var h = '';
  /* Ozet */
  h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--b);background:var(--sf)"><div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">' + _esc(d.dosyaNo || dosyaId) + '</div><div style="font-size:10px;color:var(--t3)">' + _esc(d.musteriAd || '\u2014') + ' \u00b7 ' + fU2(topFOB) + ' FOB</div></div>';
  if (!kp.kapanabilir) h += '<div style="background:#FCEBEB;border:1px solid #FCA5A5;border-radius:6px;padding:5px 10px;font-size:10px;color:#991B1B">' + kp.eksikler.length + ' zorunlu eksik</div>';
  else h += '<div style="background:#EAF3DE;border:1px solid #86EFAC;border-radius:6px;padding:5px 10px;font-size:10px;color:#14532D">Haz\u0131r</div>';
  h += '</div>';
  /* Progress + KPI */
  var r2 = 30; var circ2 = 2 * Math.PI * r2; var dash2 = circ2 * pct / 100;
  h += '<div style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="' + r2 + '" fill="none" stroke="var(--b)" stroke-width="8"/><circle cx="40" cy="40" r="' + r2 + '" fill="none" stroke="' + pR2 + '" stroke-width="8" stroke-dasharray="' + dash2.toFixed(1) + ' ' + circ2.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 40 40)"/><text x="40" y="37" text-anchor="middle" font-size="14" font-weight="500" fill="' + pR2 + '">%' + pct + '</text><text x="40" y="50" text-anchor="middle" font-size="8" fill="var(--t3)">haz\u0131r</text></svg>';
  var kS2 = 'background:var(--s2);border-radius:6px;padding:7px;text-align:center';
  var today2 = new Date().toISOString().slice(0, 10);
  var kalanG2 = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date(today2)) / 86400000) : null;
  var gR2 = kalanG2 === null ? 'var(--t3)' : kalanG2 < 0 ? '#DC2626' : kalanG2 < 7 ? '#D97706' : '#16A34A';
  var gT2 = kalanG2 === null ? '\u2014' : kalanG2 < 0 ? Math.abs(kalanG2) + 'g ge\u00e7' : kalanG2 + 'g';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px"><div style="' + kS2 + '"><div style="font-size:9px;color:#27500A">Tamam</div><div style="font-size:18px;font-weight:500;color:#16A34A">' + kp.tamamlandi.length + '</div></div><div style="' + kS2 + '"><div style="font-size:9px;color:#791F1F">Zorunlu Eksik</div><div style="font-size:18px;font-weight:500;color:#DC2626">' + kp.eksikler.length + '</div></div><div style="' + kS2 + '"><div style="font-size:9px;color:#633806">Uyar\u0131</div><div style="font-size:18px;font-weight:500;color:#D97706">' + kp.uyarilar.length + '</div></div><div style="' + kS2 + '"><div style="font-size:9px;color:' + gR2 + '">Biti\u015f</div><div style="font-size:12px;font-weight:500;color:' + gR2 + '">' + gT2 + '</div></div></div>';
  h += '</div>';
  /* Kontrol listesi */
  ['Belgeler', 'Finans', 'Onay'].forEach(function(grup) {
    var gK = kp.kosullar.filter(function(k) { return k.grup === grup; });
    h += '<div style="padding:5px 14px;font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:#185FA5;background:var(--sf);border-bottom:0.5px solid var(--b)">' + grup + '</div>';
    gK.forEach(function(k) {
      var dC = k.ok ? '#16A34A' : k.zorunlu ? '#DC2626' : '#D97706';
      var ic2 = k.ok ? '\u2713' : k.zorunlu ? '\u2717' : '!';
      var tC = k.ok ? 'var(--t)' : k.zorunlu ? '#DC2626' : '#D97706';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:0.5px solid var(--b);font-size:11px"><span style="width:16px;height:16px;border-radius:50%;background:' + dC + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0">' + ic2 + '</span><span style="flex:1;color:' + tC + '">' + _esc(k.l) + '</span>' + (!k.ok && !k.zorunlu ? '<span style="font-size:9px;color:#D97706">Opsiyonel</span>' : '') + '</div>';
    });
  });
  /* Buton */
  h += '<div style="padding:14px;border-top:0.5px solid var(--b)">';
  if (!kp.kapanabilir) {
    h += '<button disabled style="width:100%;padding:10px;background:#e5e7eb;color:#9ca3af;border:none;border-radius:8px;font-size:12px;cursor:not-allowed;font-family:inherit">Dosyay\u0131 Kapat \u2014 ' + kp.eksikler.length + ' zorunlu ko\u015ful eksik</button>';
    h += '<div style="text-align:center;font-size:10px;color:var(--t3);margin-top:6px">Zorunlu ko\u015fullar tamamland\u0131\u011f\u0131nda aktif olacak</div>';
  } else {
    h += '<button onclick="event.stopPropagation();window._ihrDosyaKapat?.(\'' + dosyaId + '\')" style="width:100%;padding:10px;background:#185FA5;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Dosyay\u0131 Kapat ve Ar\u015fivle \u2192</button>';
    h += '<div style="text-align:center;font-size:10px;color:var(--t3);margin-top:6px">Bu i\u015flem geri al\u0131namaz.</div>';
  }
  h += '</div>';
  c.innerHTML = h;
};

window._ihrDosyaKapat = function(dosyaId) {
  var kp = window._ihrKapamaKontrol(dosyaId);
  if (!kp.kapanabilir) { window.toast?.('Ko\u015fullar tamamlanmadan kapat\u0131lamaz', 'err'); return; }
  var dosyalar = _loadD(); var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  window.confirmModal?.(_esc(d.dosyaNo || dosyaId) + ' dosyas\u0131n\u0131 kapatmak ve ar\u015five almak istiyor musunuz?', { title: 'Dosya Kapat', danger: true, confirmText: 'Evet, Kapat', onConfirm: function() {
    d.durum = 'kapandi'; d.kapanma_tarihi = _now(); d.kapanan_by = _cu()?.id; d.updatedAt = _now();
    _storeD(dosyalar);
    window.logActivity?.('ihracat', 'Dosya kapat\u0131ld\u0131 ve ar\u015five al\u0131nd\u0131', dosyaId);
    window.toast?.('Dosya kapat\u0131ld\u0131', 'ok');
    var el = document.getElementById('ihr-sag-cockpit');
    if (el) _ihrRenderDosyaDetayInto(dosyaId, el);
    setTimeout(function() { window._ihrKapamaRaporu?.(dosyaId); }, 500);
  }});
};

window._ihrKapamaRaporu = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId) && !e.isDeleted; });
  var gcbList = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
  var blList = _loadBL().filter(function(b) { return String(b.dosya_id) === String(dosyaId) && !b.isDeleted; });
  var topFOB = urunler.reduce(function(a, u) { return a + (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }, 0);
  var topKg = urunler.reduce(function(a, u) { return a + (parseFloat(u.brut_kg) || 0); }, 0);
  var topKoli = urunler.reduce(function(a, u) { return a + (parseInt(u.koli_adet) || 0); }, 0);
  var acilis = (d.createdAt || '').slice(0, 10); var kapanis = d.kapanma_tarihi || new Date().toISOString().slice(0, 10);
  var surGun = acilis && kapanis ? Math.ceil((new Date(kapanis) - new Date(acilis)) / 86400000) : '\u2014';
  var fN2 = function(n) { return Math.round(n || 0).toLocaleString('tr-TR'); };
  var belgeler = evraklar.map(function(e) { return '<span style="font-size:9px;padding:2px 7px;background:#EAF3DE;color:#27500A;border-radius:3px;margin:2px">' + e.tur + '</span>'; }).join('');
  if (gcbList.length) belgeler += '<span style="font-size:9px;padding:2px 7px;background:#EAF3DE;color:#27500A;border-radius:3px;margin:2px">G\u00c7B</span>';
  if (blList.length) belgeler += '<span style="font-size:9px;padding:2px 7px;background:#EAF3DE;color:#27500A;border-radius:3px;margin:2px">BL</span>';
  var html = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Kapama Raporu \u2014 ' + _esc(d.dosyaNo || dosyaId) + '</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f3f4f6;-webkit-print-color-adjust:exact}.page{background:#fff;max-width:800px;margin:20px auto;box-shadow:0 0 15px rgba(0,0,0,.1)}@media print{body{background:#fff}.noprint{display:none!important}.page{box-shadow:none;margin:0}}</style></head><body>'
    + '<div class="noprint" style="position:sticky;top:0;background:#185FA5;padding:8px 20px;display:flex;justify-content:space-between;align-items:center"><span style="color:#fff;font-size:11px">Kapama Raporu \u00b7 ' + _esc(d.dosyaNo || dosyaId) + '</span><div style="display:flex;gap:8px"><button onclick="window.print()" style="background:#fff;color:#185FA5;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">Yazd\u0131r</button><button onclick="window.close()" style="background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.3);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">Kapat</button></div></div>'
    + '<div class="page"><div style="background:#0f1923;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:18px;font-weight:300;color:#fff;letter-spacing:-.5px">DUAY<span style="font-weight:700"> global</span></div><div style="font-size:9px;color:rgba(255,255,255,.4);margin-top:2px">Dosya Kapama Raporu</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:500;color:#85B7EB">' + _esc(d.dosyaNo || dosyaId) + '</div><div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:4px">Kapan\u0131\u015f: ' + kapanis + '</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr)"><div style="padding:14px;text-align:center;border-right:0.5px solid #e5e7eb"><div style="font-size:9px;color:#6b7280">M\u00fc\u015fteri</div><div style="font-size:12px;font-weight:500;margin-top:2px">' + _esc(d.musteriAd || '\u2014') + '</div></div><div style="padding:14px;text-align:center;border-right:0.5px solid #e5e7eb"><div style="font-size:9px;color:#6b7280">FOB</div><div style="font-size:14px;font-weight:500;color:#185FA5;margin-top:2px">$' + fN2(topFOB) + '</div></div><div style="padding:14px;text-align:center;border-right:0.5px solid #e5e7eb"><div style="font-size:9px;color:#6b7280">Toplam</div><div style="font-size:12px;font-weight:500;margin-top:2px">' + fN2(topKg) + ' kg \u00b7 ' + fN2(topKoli) + ' koli</div></div><div style="padding:14px;text-align:center"><div style="font-size:9px;color:#6b7280">S\u00fcre</div><div style="font-size:14px;font-weight:500;margin-top:2px">' + surGun + ' g\u00fcn</div></div></div>'
    + '<div style="padding:14px 20px;border-top:0.5px solid #e5e7eb"><div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#185FA5;margin-bottom:8px">Belgeler</div><div style="display:flex;flex-wrap:wrap;gap:4px">' + belgeler + '</div></div>'
    + '<div style="padding:14px 20px;border-top:0.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end"><div style="max-width:55%"><div style="font-size:10px;line-height:1.7;color:#374151">T\u00fcm belgeler ar\u015fivlendi.</div></div><div style="text-align:center"><div style="width:140px;border-top:1px solid #111;padding-top:4px;font-size:9px;color:#6b7280">Onay / \u0130mza</div></div></div></div></body></html>';
  var win = window.open('', '_blank', 'width=860,height=680,scrollbars=yes');
  if (win) { win.document.write(html); win.document.close(); } else window.toast?.('Popup engellendi', 'err');
};

window._ihrMutabakatFiltre = function() {
  var f = document.getElementById('ihr-mut-filtre')?.value || 'hepsi';
  var cont = document.getElementById('ihr-mut-satirlar'); if (!cont) return;
  var rows = cont.children;
  for (var ri = 0; ri < rows.length; ri++) {
    var d2 = rows[ri].dataset.durum || '';
    var goster = f === 'hepsi' || (f === 'fark' && d2 !== 'eslesen') || (f === 'eslesen' && d2 === 'eslesen') || (f === 'alis_yok' && d2 === 'alis_yok');
    rows[ri].style.display = goster ? '' : 'none';
  }
};

window._ihrMutabakatPdf = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var c2 = document.createElement('div');
  window._ihrDetayRenderMutabakat(d, c2);
  var bugun = new Date().toLocaleDateString('tr-TR');
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mutabakat Raporu</title><style>body{font-family:system-ui,sans-serif;margin:20px;font-size:11px}@media print{.noprint{display:none}}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:12px"><div><div style="font-size:16px;font-weight:500">Belge Mutabakat Raporu</div><div style="font-size:11px;color:#6b7280">' + _esc(d.dosyaNo || dosyaId) + ' \u00b7 ' + _esc(d.musteriAd || '') + '</div></div><div style="text-align:right;font-size:10px;color:#6b7280">Duay Global LLC<br>' + bugun + '</div></div>' + c2.innerHTML + '<div class="noprint" style="margin-top:20px"><button onclick="window.print()" style="padding:6px 16px;background:#185FA5;color:#fff;border:none;border-radius:4px;cursor:pointer">Yazd\u0131r / PDF</button></div></body></html>';
  var win = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
  if (win) { win.document.write(html); win.document.close(); } else window.toast?.('Popup engellendi', 'err');
};

window._ihrMutabakatExcel = function(dosyaId) {
  var ihU = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var tumSA = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var satirlar = ['\u00dcr\u00fcn\tHS\tCI Miktar\tCI Tutar($)\tAl\u0131\u015f Miktar\tAl\u0131\u015f Tutar($)\tMiktar Fark\tDe\u011fer Fark($)\tKoli\tBr\u00fct Kg\tDurum'];
  ihU.forEach(function(u) {
    var esl = tumSA.find(function(s) { var uA = (u.aciklama || '').toLowerCase(); var sA = (s.urun || '').toLowerCase(); return (u.satinalma_id && String(s.id) === String(u.satinalma_id)) || (uA.length > 5 && sA.length > 5 && (uA.indexOf(sA.slice(0, 8)) !== -1 || sA.indexOf(uA.slice(0, 8)) !== -1)); });
    var ciM = parseFloat(u.miktar) || 0; var ciT = ciM * (parseFloat(u.birim_fiyat) || 0);
    var aM = esl ? (parseFloat(esl.miktar) || 0) : 0; var aT = esl ? (aM * (parseFloat(esl.birimFiyat) || 0)) : 0;
    var dur = !esl ? 'Al\u0131\u015f yok' : Math.abs(ciT - aT) > 500 ? 'Deger fark\u0131' : Math.abs(ciM - aM) > 0 ? 'Miktar fark\u0131' : 'E\u015fle\u015fti';
    satirlar.push([u.aciklama || '', u.hs_kodu || '', ciM, Math.round(ciT), aM, Math.round(aT), Math.round(Math.abs(ciM - aM)), Math.round(Math.abs(ciT - aT)), u.koli_adet || 0, u.brut_kg || 0, dur].join('\t'));
  });
  var blob = new Blob(['\ufeff' + satirlar.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (_loadD().find(function(x) { return String(x.id) === String(dosyaId); })?.dosyaNo || dosyaId) + '_mutabakat.xls'; a.click();
  window.toast?.('Excel indirildi', 'ok');
};

/* IHR-URUN-001: Tumunu Uret + HS Toplu */
window._ihrTumBelgeleriUret = function(dosyaId) {
  var BELGE_GRUPLARI = [
    { ad:'D\u0131\u015f Taraf (M\u00fc\u015fteri)', turler:['PI','CI','PL','FI','SI','GCI'], defLang:'en' },
    { ad:'Lojistik / G\u00fcmr\u00fck', turler:['KT','SE','ST','NTF','NFO','SIG'], defLang:'tr' },
    { ad:'Tedarik / \u0130\u00e7', turler:['PO','MTF','MTET','IRK','QC','KYT'], defLang:'tr' },
    { ad:'Raporlama', turler:['HOS','TD','OD','KAPAK','PARASUT'], defLang:'tr' },
    { ad:'\ud83d\udcc4 DOCX \u015eablonlar', turler:['DOCX-PL','DOCX-CI','DOCX-FRQ','DOCX-IRQ'], defLang:'en' }
  ];
  var TUR_AD = { PI:'Proforma Invoice', CI:'Commercial Invoice', PL:'Packing List', FI:'Freight Invoice', SI:'Sample Invoice', GCI:'Customs Invoice', KT:'Kon\u015fimento Talimat\u0131', SE:'Sevk Emri', ST:'Sevk Talimat\u0131', NTF:'Navlun Teklif Talep', NFO:'Navlun Fiyat Onay', SIG:'Sigorta Talep', PO:'Purchase Order', MTF:'Mal Teslim Formu', MTET:'Mal Teslim Etme', IRK:'\u0130rsaliye', QC:'Kalite Kontrol', KYT:'Y\u00fckleme Tutana\u011f\u0131', HOS:'Hesap \u00d6zeti', TD:'Tahsilat Dekontu', OD:'\u00d6deme Dekontu', KAPAK:'Dosya Kapa\u011f\u0131', PARASUT:'Para\u015f\u00fct Excel', 'DOCX-PL':'Packing List \u2014 Bo\u015f \u015eablon', 'DOCX-CI':'Commercial Invoice \u2014 Bo\u015f \u015eablon', 'DOCX-FRQ':'Forwarder Teklif Talep', 'DOCX-IRQ':'Sigorta Teklif Talep' };
  var old = document.getElementById('mo-tumbelge'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-tumbelge';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var dilSec = window._ihrBelgeDil || 'en';
  var h2 = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden">';
  h2 += '<div style="padding:12px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:13px;font-weight:600">Belge \u00dcret</div><button onclick="event.stopPropagation();document.getElementById(\'mo-tumbelge\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div>';
  h2 += '<div style="padding:8px 18px;border-bottom:0.5px solid var(--b);display:flex;gap:6px">';
  h2 += '<button onclick="event.stopPropagation();window._ihrBelgeDil=\'en\';window._ihrTumBelgeleriUret(\'' + dosyaId + '\')" style="font-size:10px;padding:3px 10px;border-radius:4px;border:0.5px solid ' + (dilSec === 'en' ? '#185FA5' : 'var(--b)') + ';background:' + (dilSec === 'en' ? '#E6F1FB' : 'transparent') + ';cursor:pointer;color:' + (dilSec === 'en' ? '#185FA5' : 'var(--t2)') + ';font-family:inherit">\ud83c\uddec\ud83c\udde7 English</button>';
  h2 += '<button onclick="event.stopPropagation();window._ihrBelgeDil=\'tr\';window._ihrTumBelgeleriUret(\'' + dosyaId + '\')" style="font-size:10px;padding:3px 10px;border-radius:4px;border:0.5px solid ' + (dilSec === 'tr' ? '#185FA5' : 'var(--b)') + ';background:' + (dilSec === 'tr' ? '#E6F1FB' : 'transparent') + ';cursor:pointer;color:' + (dilSec === 'tr' ? '#185FA5' : 'var(--t2)') + ';font-family:inherit">\ud83c\uddf9\ud83c\uddf7 T\u00fcrk\u00e7e</button>';
  h2 += '</div>';
  h2 += '<div style="padding:10px 18px;max-height:55vh;overflow-y:auto">';
  BELGE_GRUPLARI.forEach(function(g) {
    h2 += '<div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 5px;padding-bottom:3px;border-bottom:0.5px solid var(--b)">' + g.ad + '</div>';
    g.turler.forEach(function(t) {
      var isParasut = t === 'PARASUT';
      var isDOCX = t.indexOf('DOCX-') === 0;
      var docxAlt = isDOCX ? t.replace('DOCX-', '').toLowerCase() : '';
      h2 += '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:0.5px solid var(--b);font-size:11px;' + (isDOCX ? 'background:var(--sf)' : '') + '">';
      if (isDOCX) h2 += '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:600;min-width:35px;text-align:center">DOCX</span>';
      else h2 += '<span style="min-width:45px;font-weight:600;color:#185FA5;font-size:10px">' + t + '</span>';
      h2 += '<span style="flex:1;color:var(--t2)">' + (TUR_AD[t] || t) + '</span>';
      if (!isDOCX) h2 += '<span style="font-size:8px;color:var(--t3);padding:1px 5px;border-radius:3px;background:var(--s2)">' + dilSec.toUpperCase() + '</span>';
      if (isParasut) {
        h2 += '<button onclick="event.stopPropagation();window._ihrParasutExcel?.(\'' + dosyaId + '\');document.getElementById(\'mo-tumbelge\')?.remove()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 Excel</button>';
      } else if (isDOCX) {
        h2 += '<button onclick="event.stopPropagation();window._ihrFormIndir?.(\'' + docxAlt + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 DOCX \u0130ndir</button>';
      } else {
        h2 += '<button onclick="event.stopPropagation();window._ihrBelgeUretDogrudan(\'' + dosyaId + '\',\'' + t + '\',\'' + dilSec + '\');document.getElementById(\'mo-tumbelge\')?.remove()" style="font-size:9px;padding:2px 8px;border:none;border-radius:4px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit">\u00dcret \u2192</button>';
      }
      h2 += '</div>';
    });
  });
  h2 += '</div>';
  h2 += '<div style="padding:10px 18px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-tumbelge\')?.remove()">Kapat</button></div>';
  h2 += '</div>';
  mo.innerHTML = h2;
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** Dogrudan belge uret — modal atla, tek adimda */
window._ihrBelgeUretDogrudan = function(dosyaId, tur, lang) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  lang = lang || window._ihrBelgeDil || 'en';
  var html = window._ihrBelgeHtml?.(d, tur, 'dis', urunler, { lang: lang });
  if (!html) { window.toast?.('Belge \u00fcretilemedi', 'err'); return; }
  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  window.toast?.(tur + ' belgesi \u00fcretildi (' + lang.toUpperCase() + ')', 'ok');
};

window._ihrHsToplu = function(dosyaId) {
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted && !u.hs_kodu; });
  if (!urunler.length) { window.toast?.('T\u00fcm \u00fcr\u00fcnlerde HS kodu mevcut', 'ok'); return; }
  var rows = urunler.map(function(u) { return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid var(--b)"><span style="flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(u.aciklama || u.urun_adi || u.id) + '</span><input id="hs-input-' + u.id + '" placeholder="6001.10" value="" style="width:90px;font-size:10px;padding:2px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'; }).join('');
  var old = document.getElementById('mo-hs-toplu'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-hs-toplu';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:12px 18px;border-bottom:0.5px solid var(--b);font-size:13px;font-weight:600">HS Kodu Toplu Ata</div><div style="padding:10px 18px;max-height:50vh;overflow-y:auto"><div style="font-size:10px;color:var(--t2);margin-bottom:8px">' + urunler.length + ' \u00fcr\u00fcnde HS kodu eksik:</div>' + rows + '</div><div style="padding:10px 18px;border-top:0.5px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-hs-toplu\')?.remove()">Vazge\u00e7</button><button class="btn btnp" onclick="event.stopPropagation();window._ihrHsTopluKaydet(\'' + dosyaId + '\')">Kaydet</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrHsTopluKaydet = function(dosyaId) {
  var urunler = _loadU(); var guncellendi = 0;
  urunler.filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; }).forEach(function(u) {
    var input = document.getElementById('hs-input-' + u.id);
    if (input && input.value.trim()) { u.hs_kodu = input.value.trim(); u.updatedAt = _now(); guncellendi++; }
  });
  _storeU(urunler);
  document.getElementById('mo-hs-toplu')?.remove();
  window.toast?.(guncellendi + ' \u00fcr\u00fcne HS kodu atand\u0131', 'ok');
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (d) _ihrDetayRenderUrunler(d, _g('ihr-detay-content'));
};

window._ihrBelgeLink = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  var payload = dosyaId + ':' + tur + ':' + Date.now();
  var token = btoa(unescape(encodeURIComponent(payload)));
  var link = 'https://duayft-collab.github.io/duay-platform/upload.html?token=' + token + '&tur=' + tur;
  var old = _g('mo-belge-link'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-belge-link';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:12px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:13px;font-weight:600">Payla\u015f\u0131m Linki</div><button onclick="event.stopPropagation();document.getElementById(\'mo-belge-link\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div>'
    + '<div style="padding:16px 18px"><div style="font-size:11px;color:var(--t2);margin-bottom:10px">' + _esc(tur) + ' belgesi i\u00e7in payla\u015f\u0131m linki. <strong>Login gerekmez</strong> \u2014 linki alan direkt belgeyi g\u00f6r\u00fcr.</div>'
    + '<div style="display:flex;gap:6px"><input id="mo-bl-link" class="fi" value="' + link + '" readonly style="font-size:10px;font-family:monospace;flex:1"><button class="btn btnp" onclick="event.stopPropagation();navigator.clipboard?.writeText(document.getElementById(\'mo-bl-link\')?.value);window.toast?.(\'Link kopyaland\u0131\',\'ok\')" style="flex-shrink:0">Kopyala</button></div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:6px">Link 30 g\u00fcn ge\u00e7erli \u00b7 Sadece bu belge g\u00f6r\u00fcn\u00fcr</div></div>'
    + '<div style="padding:10px 18px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-belge-link\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
  window.logActivity?.('ihracat', tur + ' belge linki olusturuldu: ' + (d.dosyaNo || dosyaId));
};

window._ihrTumBelgeLink = function(dosyaId) {
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId) && !e.isDeleted && (e.durum === 'gonderildi' || e.durum === 'tamamlandi' || e.dosya_url); });
  if (!evraklar.length) { window.toast?.('Payla\u015f\u0131lacak onayl\u0131 belge yok', 'err'); return; }
  var old = _g('mo-tum-link'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-tum-link';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var rows = evraklar.map(function(ev) {
    var payload = dosyaId + ':' + ev.tur + ':' + Date.now();
    var token = btoa(unescape(encodeURIComponent(payload)));
    var link = 'https://duayft-collab.github.io/duay-platform/upload.html?token=' + token + '&tur=' + ev.tur;
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--b)"><span style="font-size:10px;font-weight:500;min-width:50px">' + _esc(ev.tur) + '</span><input value="' + link + '" readonly style="flex:1;font-size:9px;font-family:monospace;padding:2px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf)"><button onclick="event.stopPropagation();navigator.clipboard?.writeText(this.previousElementSibling.value);window.toast?.(\'Kopyaland\u0131\',\'ok\')" style="font-size:9px;padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">Kopyala</button></div>';
  }).join('');
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:12px 18px;border-bottom:0.5px solid var(--b);font-size:13px;font-weight:600">T\u00fcm Belge Linkleri</div><div style="padding:14px 18px;max-height:60vh;overflow-y:auto">' + rows + '</div><div style="padding:10px 18px;border-top:0.5px solid var(--b);font-size:10px;color:var(--t3)">Her link 30 g\u00fcn ge\u00e7erli. Login gerekmez.</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** CI arsiv tumunu sil */
window._ihrCIArsivTumunuSil = function(dosyaId) {
  var evraklar = _loadE();
  var ciAll = evraklar.filter(function(e) { return String(e.dosya_id) === String(dosyaId) && e.tur === 'CI' && !e.isDeleted; });
  ciAll.sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  var arsivler = ciAll.slice(1);
  if (!arsivler.length) { window.toast?.('Silinecek arsiv yok', 'warn'); return; }
  window.confirmModal?.(arsivler.length + ' arsiv CI silinecek?', {
    title: 'Arsiv Temizle', danger: true, confirmText: 'Tumunu Sil',
    onConfirm: function() {
      arsivler.forEach(function(ac) { ac.isDeleted = true; ac.deletedAt = _now(); });
      _storeE(evraklar);
      window._ihrLog(dosyaId, arsivler.length + ' CI arsiv silindi', null, 'CI');
      window.toast?.(arsivler.length + ' arsiv silindi', 'ok');
      _ihrReRender();
    }
  });
};

/** CI arsiv tek silme */
window._ihrEvrakArsivSil = function(evrakId, dosyaId) {
  window.confirmModal?.('Bu arsiv CI silinsin mi?', {
    title: 'Arsiv Sil', danger: true, confirmText: 'Sil',
    onConfirm: function() {
      var evraklar = _loadE();
      var ev = evraklar.find(function(e) { return String(e.id) === String(evrakId); });
      if (ev) { ev.isDeleted = true; ev.deletedAt = _now(); }
      _storeE(evraklar);
      window._ihrLog(dosyaId, 'CI arsiv silindi', null, 'CI');
      window.toast?.('Arsiv silindi', 'ok');
      _ihrReRender();
    }
  });
};

/* ── STUB'LAR ────────────────────────────────────────────── */
/* _ihrDosyaDuzenle stub kaldirildi — gercek implementasyon asagida */
window._ihrDurumDegistir = function() { window.toast?.('Yakında', 'warn'); };
window._ihrUrunEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakEkle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakDuzenle = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakOnayla = function() { window.toast?.('Yakında', 'warn'); };
window._ihrEvrakGonder = function() { window.toast?.('Yakında', 'warn'); };
/* _ihrEvrakOlustur eski stub kaldırıldı — tanım ikinci IIFE'de */
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
/* IHR-BELGE-B-001: PDF onizleme → belge uret sistemi */
window._ihrPdfOnizle = function(dosyaId, tur) {
  window._ihrBelgeUret(dosyaId, tur);
};

/* _ihrEvrakOlustur — tanım ikinci IIFE'de (satır ~3081), evrak kaydı oluşturur + _ihrPdfOnizle çağırır */

/** Doluluk hesapla */
window._ihrDolulukHesapla = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return { pct: 0, dolu: [], eksik: [] };
  var u = _loadU().filter(function(x) { return String(x.dosya_id) === String(dosyaId) && !x.isDeleted; });
  var KONTROLLER = {
    PI: [['M\u00fc\u015fteri ad\u0131', !!d.musteriAd], ['\u00dcr\u00fcnler mevcut', u.length > 0], ['Birim fiyatlar', u.every(function(x) { return x.birim_fiyat > 0; })], ['Teslim \u015fekli', !!d.teslim_sekli], ['\u00d6deme ko\u015fullar\u0131', !!(d.odeme_kosulu || d.odeme_sarti)]],
    CI: [['M\u00fc\u015fteri ad\u0131', !!d.musteriAd], ['\u00dcr\u00fcnler mevcut', u.length > 0], ['HS kodlar\u0131', u.length > 0 && u.every(function(x) { return !!x.hs_kodu; })], ['Birim fiyatlar', u.every(function(x) { return x.birim_fiyat > 0; })], ['Teslim \u015fekli', !!d.teslim_sekli]],
    PL: [['\u00dcr\u00fcnler mevcut', u.length > 0], ['Koli adetleri', u.every(function(x) { return x.koli_adet > 0; })], ['Br\u00fct a\u011f\u0131rl\u0131k', u.every(function(x) { return x.brut_kg > 0; })], ['Hacim', u.every(function(x) { return x.hacim_m3 > 0; })], ['Konteyner tipi', !!d.konteyner_tipi]],
    TRFAT: [['M\u00fc\u015fteri ad\u0131', !!d.musteriAd], ['\u00dcr\u00fcnler mevcut', u.length > 0], ['Birim fiyatlar', u.every(function(x) { return x.birim_fiyat > 0; })], ['Teslim \u015fekli', !!d.teslim_sekli]],
    SEVK: [['Forwarder atand\u0131', !!d.forwarder_id], ['Konteyner tipi', !!d.konteyner_tipi], ['Liman bilgisi', !!(d.yukl_limani || d.varis_limani)]],
    YUK: [['Forwarder atand\u0131', !!d.forwarder_id], ['\u00dcr\u00fcnler mevcut', u.length > 0], ['Koli adetleri', u.every(function(x) { return x.koli_adet > 0; })], ['Teslim tarihi', !!d.bitis_tarihi]],
    TTF: [['\u00dcr\u00fcnler mevcut', u.length > 0], ['Birim fiyatlar', u.every(function(x) { return x.birim_fiyat > 0; })], ['Teslim \u015fekli', !!d.teslim_sekli]]
  };
  var kontrol = KONTROLLER[tur] || [];
  var dolu = kontrol.filter(function(k) { return k[1]; }).map(function(k) { return k[0]; });
  var eksik = kontrol.filter(function(k) { return !k[1]; }).map(function(k) { return k[0]; });
  return { pct: kontrol.length > 0 ? Math.round(dolu.length / kontrol.length * 100) : 0, dolu: dolu, eksik: eksik };
};

/** Belge uret — doluluk modali */
window._ihrBelgeUret = function(dosyaId, tur) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  var dl = window._ihrDolulukHesapla(dosyaId, tur);
  var TUR_ADI = { PI: 'Proforma Invoice', CI: 'Commercial Invoice', PL: 'Packing List', TRFAT: 'TR \u0130hracat Faturas\u0131', SEVK: 'Sevk Emri', YUK: 'Y\u00fckleme Talimat\u0131', TTF: 'Teklif Talep Formu' };
  var turAdi = TUR_ADI[tur] || tur;
  var pR = dl.pct >= 80 ? '#16A34A' : dl.pct >= 50 ? '#ca8a04' : '#dc2626';
  var pB = dl.pct >= 80 ? '#EAF3DE' : dl.pct >= 50 ? '#fef9c3' : '#fef2f2';
  var old = _g('mo-belge-uret'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-belge-uret';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var dR = dl.dolu.map(function(x) { return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px"><span style="width:7px;height:7px;border-radius:50%;background:#16A34A;flex-shrink:0"></span>' + _esc(x) + '</div>'; }).join('');
  var eR = dl.eksik.map(function(x) { return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px"><span style="width:7px;height:7px;border-radius:50%;background:#dc2626;flex-shrink:0"></span>' + _esc(x) + '</div>'; }).join('');
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:12px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:13px;font-weight:600">' + _esc(turAdi) + ' Olu\u015ftur</div><button onclick="event.stopPropagation();document.getElementById(\'mo-belge-uret\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div>'
    + '<div style="padding:14px 18px">'
    + '<div style="background:' + pB + ';border-radius:8px;padding:10px 12px;margin-bottom:12px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;font-weight:500;color:' + pR + '">Veri doluluk oran\u0131</span><span style="font-size:16px;font-weight:700;color:' + pR + '">%' + dl.pct + '</span></div><div style="height:6px;background:rgba(0,0,0,.1);border-radius:3px"><div style="width:' + dl.pct + '%;height:6px;background:' + pR + ';border-radius:3px"></div></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px"><div><div style="font-size:9px;font-weight:500;color:#16A34A;text-transform:uppercase;margin-bottom:5px">Dolu Alanlar</div>' + dR + '</div><div><div style="font-size:9px;font-weight:500;color:#dc2626;text-transform:uppercase;margin-bottom:5px">Eksik Alanlar</div>' + eR + '</div></div>'
    + (dl.eksik.length > 0 ? '<div style="background:#fef9c3;border-radius:5px;padding:6px 10px;font-size:9px;color:#92400E;margin-bottom:10px">\u26a0 ' + dl.eksik.length + ' eksik alan var. Yine de olu\u015fturabilirsiniz.</div>' : '')
    + '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:6px">\u0130\u00e7erik Seviyesi</div>'
    + '<div style="display:flex;gap:6px;margin-bottom:14px">'
    + '<button id="bu-sev-yonetici" onclick="event.stopPropagation();window._ihrBuSetSeviye(\'yonetici\')" style="flex:1;padding:6px;font-size:9px;border-radius:5px;border:1.5px solid #185FA5;background:#E6F1FB;cursor:pointer;font-family:inherit;font-weight:500;color:#0C447C">Y\u00f6netici</button>'
    + '<button id="bu-sev-sirket" onclick="event.stopPropagation();window._ihrBuSetSeviye(\'sirket\')" style="flex:1;padding:6px;font-size:9px;border-radius:5px;border:0.5px solid var(--b);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u015eirket \u0130\u00e7i</button>'
    + '<button id="bu-sev-dis" onclick="event.stopPropagation();window._ihrBuSetSeviye(\'dis\')" style="flex:1;padding:6px;font-size:9px;border-radius:5px;border:0.5px solid var(--b);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">D\u0131\u015f Taraf</button>'
    + '</div><input type="hidden" id="bu-dosya-id" value="' + _esc(dosyaId) + '"><input type="hidden" id="bu-tur" value="' + _esc(tur) + '"><input type="hidden" id="bu-seviye" value="yonetici">'
    + '</div>'
    + '<div style="padding:10px 18px;border-top:0.5px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-belge-uret\')?.remove()">\u0130ptal</button><button class="btn btnp" onclick="event.stopPropagation();window._ihrBelgeAc()">Olu\u015ftur \u2192</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrBuSetSeviye = function(s) {
  ['yonetici', 'sirket', 'dis'].forEach(function(x) {
    var btn = document.getElementById('bu-sev-' + x); if (!btn) return;
    if (x === s) { btn.style.border = '1.5px solid #185FA5'; btn.style.background = '#E6F1FB'; btn.style.color = '#0C447C'; btn.style.fontWeight = '500'; }
    else { btn.style.border = '0.5px solid var(--b)'; btn.style.background = 'transparent'; btn.style.color = 'var(--t2)'; btn.style.fontWeight = '400'; }
  });
  var hid = document.getElementById('bu-seviye'); if (hid) hid.value = s;
};

/** Belge ac — HTML yeni pencere */
window._ihrBelgeAc = function() {
  var dosyaId = _g('bu-dosya-id')?.value; var tur = _g('bu-tur')?.value; var seviye = _g('bu-seviye')?.value || 'dis';
  if (!dosyaId || !tur) return;
  document.getElementById('mo-belge-uret')?.remove();
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var urunler = _loadU().filter(function(x) { return String(x.dosya_id) === String(dosyaId) && !x.isDeleted; });
  var gm = null; _loadGM().forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm = g; });
  var fw = null; _loadFW().forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw = f; });
  var html = window._ihrBelgeHtml(d, tur, seviye, urunler, gm, fw);
  var win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (win) { win.document.write(html); win.document.close(); }
  else { window.toast?.('Popup engellendi', 'err'); }
  window.logActivity?.('ihracat', tur + ' belgesi olu\u015fturuldu (' + seviye + ')', dosyaId);
};

/** Belge HTML sablonu — Design B */
window._ihrBelgeHtml = function(d, tur, seviye, urunler, gm, fw) {
  var y = seviye === 'yonetici';
  var ic = seviye === 'yonetici' || seviye === 'sirket';
  var TUR_ADI = { PI: 'PROFORMA INVOICE', CI: 'COMMERCIAL INVOICE', PL: 'PACKING LIST', TRFAT: 'T\u00dcRK\u00c7E \u0130HRACAT FATURASI', SEVK: 'SEVK EMR\u0130', YUK: 'Y\u00dcKLEME TALIMATI', TTF: 'TEKL\u0130F TALEP FORMU' };
  var turAdi = TUR_ADI[tur] || tur;
  var topUSD = 0, topKoli = 0, topKg = 0, topM3 = 0;
  urunler.forEach(function(u) { topUSD += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); topKoli += parseInt(u.koli_adet) || 0; topKg += parseFloat(u.brut_kg) || 0; topM3 += parseFloat(u.hacim_m3) || 0; });
  var fU = function(n) { return '$' + Math.round(n).toLocaleString('tr-TR'); };
  var maliyetUSD = topUSD * 0.815; var karUSD = topUSD - maliyetUSD; var marjPct = topUSD > 0 ? Math.round(karUSD / topUSD * 1000) / 10 : 0;
  var belgeNo = tur + '-' + (d.dosyaNo || '0001').replace('IHR-', '');
  var bugun = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  var gecerlilik = new Date(Date.now() + 30 * 86400000).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  /* Urun satirlari */
  var uS = '';
  if (!urunler.length) uS = '<tr><td colspan="' + (y ? 7 : 6) + '" style="text-align:center;color:#9ca3af;font-style:italic;padding:16px">\u00dcr\u00fcn girilmemi\u015f</td></tr>';
  else urunler.forEach(function(u) {
    var t = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0);
    uS += '<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">' + _esc(u.aciklama || u.urun_adi || '\u2014') + '<br><span style="font-size:9px;color:#6b7280">' + _esc(u.urun_kodu || '') + '</span></td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:center">' + (u.hs_kodu || '<span style="color:#dc2626">Eksik</span>') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + (parseFloat(u.miktar) || 0).toLocaleString('tr-TR') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:center">' + _esc(u.birim || 'kg') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + _esc(u.doviz || 'USD') + ' ' + (parseFloat(u.birim_fiyat) || 0).toFixed(2) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right;font-weight:600">' + fU(t) + '</td>' + (y ? '<td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right;color:#dc2626;background:#fef2f2">' + fU(t * 0.815) + '</td>' : '') + '</tr>';
  });

  /* PL satirlari */
  var pS = '';
  urunler.forEach(function(u) {
    pS += '<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px">' + _esc(u.aciklama || '\u2014') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:center">' + _esc(u.hs_kodu || '\u2014') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + (parseInt(u.koli_adet) || 0) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + (parseFloat(u.brut_kg) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + (parseFloat(u.net_kg) || (parseFloat(u.brut_kg) || 0) * 0.95).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;text-align:right">' + (parseFloat(u.hacim_m3) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 }) + '</td></tr>';
  });

  var icerik = '';
  /* PI/CI/TRFAT tablo */
  if (tur === 'PI' || tur === 'CI' || tur === 'TRFAT') {
    icerik += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px"><thead><tr style="background:#f9fafb"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">\u00dcr\u00fcn</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">HS</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Miktar</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">Birim</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">B.Fiyat</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Tutar</th>' + (y ? '<th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;background:#fef2f2;color:#dc2626">Maliyet</th>' : '') + '</tr></thead><tbody>' + uS + '</tbody></table>';
  }
  /* PL tablo */
  if (tur === 'PL') {
    icerik += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px"><thead><tr style="background:#f9fafb"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">\u00dcr\u00fcn</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">HS</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Koli</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Br\u00fct kg</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Net kg</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">m\u00b3</th></tr></thead><tbody>' + pS + '<tr style="background:#f9fafb;font-weight:600"><td style="padding:6px 8px;border:1px solid #e5e7eb">TOPLAM</td><td style="border:1px solid #e5e7eb"></td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">' + topKoli + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">' + topKg.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">' + Math.round(topKg * 0.95).toLocaleString('tr-TR') + '</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">' + topM3.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</td></tr></tbody></table>';
  }
  /* SEVK/YUK */
  if (tur === 'SEVK' || tur === 'YUK') {
    icerik += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px"><tbody><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280;width:160px">Forwarder</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + (fw ? _esc(fw.firma_adi) : '\u2014') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Y\u00fckleme Liman\u0131</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.yukl_limani || 'Mersin') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Var\u0131\u015f Liman\u0131</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.teslim_limani || d.varis_limani || '\u2014') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Konteyner</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.konteyner_tipi || '40HC') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Toplam</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + topKoli + ' koli / ' + topKg.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' kg</td></tr></tbody></table>';
  }
  /* TTF */
  if (tur === 'TTF') {
    icerik += '<div style="margin-bottom:12px;font-size:11px;line-height:1.7">A\u015fa\u011f\u0131da belirtilen sevkiyat i\u00e7in teklif talep etmekteyiz.</div><table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px"><tbody><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280;width:180px">Y\u00fckleme Noktas\u0131</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.yukl_limani || 'Mersin') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Var\u0131\u015f Noktas\u0131</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.teslim_limani || d.varis_limani || '\u2014') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Konteyner</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + _esc(d.konteyner_tipi || '40HC') + '</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">A\u011f\u0131rl\u0131k</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + topKg.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' kg</td></tr><tr><td style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">Hacim</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500">' + topM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' m\u00b3</td></tr></tbody></table>';
  }

  var yonHtml = y ? '<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:8px 12px;margin-bottom:12px;font-size:10px;color:#991b1b;border-radius:0 4px 4px 0">G\u0130ZL\u0130 \u2014 Maliyet: ' + fU(maliyetUSD) + ' \u00b7 Marj: %' + marjPct + ' \u00b7 K\u00e2r: ' + fU(karUSD) + '</div>' : '';
  var sirHtml = ic ? '<div style="background:#eff6ff;border-left:4px solid #185FA5;padding:8px 12px;margin-bottom:12px;font-size:10px;color:#1e40af;border-radius:0 4px 4px 0">Dahili: ' + _esc(d.dosyaNo || '\u2014') + ' \u00b7 G\u00fcmr\u00fck\u00e7\u00fc: ' + (gm ? _esc(gm.firma_adi) : 'Atanmad\u0131') + '</div>' : '';
  var topBlok = (tur === 'PI' || tur === 'CI' || tur === 'TRFAT') ? '<div style="display:flex;justify-content:flex-end;margin-top:12px"><div style="min-width:240px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden"><div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:10px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280">Ara Toplam</span><span>' + fU(topUSD) + '</span></div><div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:10px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280">KDV (0%)</span><span>$0</span></div>' + (y ? '<div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:10px;border-bottom:1px solid #e5e7eb;background:#fef2f2"><span style="color:#dc2626">K\u00e2r [G\u0130ZL\u0130]</span><span style="color:#16A34A">' + fU(karUSD) + '</span></div>' : '') + '<div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;font-weight:700;background:#185FA5;color:#fff"><span>TOPLAM</span><span>' + fU(topUSD) + ' USD</span></div></div></div>' : '';
  var tarafGrid = (tur === 'PI' || tur === 'CI' || tur === 'TRFAT') ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px"><div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px"><div style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#185FA5;margin-bottom:8px">Sat\u0131c\u0131</div><div style="font-size:12px;font-weight:600">Duay Global LLC</div><div style="font-size:10px;color:#6b7280;line-height:1.7;margin-top:4px">\u0130stanbul, T\u00fcrkiye</div></div><div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px"><div style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#185FA5;margin-bottom:8px">Al\u0131c\u0131</div><div style="font-size:12px;font-weight:600">' + _esc(d.musteriAd || '\u2014') + '</div><div style="font-size:10px;color:#6b7280;line-height:1.7;margin-top:4px">' + _esc(d.musteriUlke || '') + '</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px"><div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px"><div style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#185FA5;margin-bottom:8px">Teslimat</div><div style="font-size:10px;line-height:1.9">Teslim: <strong>' + _esc(d.teslim_sekli || 'FOB') + '</strong><br>\u00d6deme: <strong>' + _esc(d.odeme_kosulu || d.odeme_sarti || '\u2014') + '</strong></div></div><div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px"><div style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#185FA5;margin-bottom:8px">Banka</div><div style="font-size:10px;line-height:1.9">T\u00fcrkiye \u0130\u015f Bankas\u0131<br>SWIFT: ISBKTRIS</div></div></div>' : '';

  return '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>' + turAdi + ' \u2014 ' + belgeNo + '</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:0;background:#f3f4f6;-webkit-print-color-adjust:exact}.page{background:#fff;max-width:840px;margin:20px auto;box-shadow:0 0 20px rgba(0,0,0,.1)}@media print{body{background:#fff}.no-print{display:none!important}.page{box-shadow:none;margin:0;max-width:100%}}</style></head><body>'
    + '<div class="no-print" style="position:sticky;top:0;z-index:100;background:#185FA5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between"><span style="color:#fff;font-size:11px">' + turAdi + ' \u00b7 ' + belgeNo + ' \u00b7 ' + (y ? 'Y\u00f6netici' : ic ? '\u015eirket \u0130\u00e7i' : 'D\u0131\u015f Taraf') + '</span><div style="display:flex;gap:8px"><button onclick="window.print()" style="background:#fff;color:#185FA5;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:500">Yazd\u0131r / PDF</button><button onclick="window.close()" style="background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.3);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">Kapat</button></div></div>'
    + '<div class="page" style="padding:0"><div style="padding:20px 24px;border-bottom:3px solid #185FA5;display:flex;align-items:flex-start;justify-content:space-between"><div><div style="font-size:18px;font-weight:700;color:#185FA5;letter-spacing:-.5px">DUAY<span style="color:#111;font-weight:300"> global</span></div><div style="font-size:9px;color:#6b7280;margin-top:2px">Uluslararas\u0131 Tekstil Ticareti \u00b7 \u0130stanbul, T\u00fcrkiye</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:300;color:#111;letter-spacing:-.5px">' + turAdi + '</div><div style="font-size:10px;color:#6b7280;margin-top:4px">No: ' + belgeNo + '</div><div style="font-size:10px;color:#6b7280">Tarih: ' + bugun + '</div></div></div>'
    + '<div style="padding:20px 24px">' + yonHtml + sirHtml + tarafGrid + icerik + topBlok
    + '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end"><div style="font-size:9px;color:#9ca3af;max-width:55%;line-height:1.6">Bu belge Duay Global LLC taraf\u0131ndan d\u00fczenlenmi\u015ftir.</div><div style="text-align:right"><div style="font-size:9px;color:#9ca3af;margin-bottom:20px">\u0130mza / Ka\u015fe:</div><div style="width:180px;border-top:1px solid #111;font-size:9px;color:#6b7280;padding-top:4px;text-align:center">Duay Global LLC</div></div></div></div></div></body></html>';
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
/* IHR-DUZENLE-WIZARD-001: Duzenle butonu wizard edit moduna baglanir */
window._ihrDosyaDuzenle = function(id) {
  if (!id) { window.toast?.('Dosya ID eksik', 'err'); return; }
  var d = _loadD().find(function(x){ return String(x.id)===String(id); });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  window._ihrYeniEmir(id);
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
      var _kolW = allKols[kolIdx] ? allKols[kolIdx].w : 80;
      var _savedWm; try { var _wMap = JSON.parse(localStorage.getItem(_IHR_KOLON_W_KEY) || '{}'); _savedWm = _wMap[k] || _kolW; } catch(e2) { _savedWm = _kolW; }
      h += '<span style="font-size:8px;color:var(--t3);opacity:.6">' + kolNumStr + '</span> ' + _esc(kolMap[k]);
      h += '<input type="number" data-kol-w="' + k + '" value="' + _savedWm + '" min="40" max="400" onclick="event.stopPropagation()" onchange="event.stopPropagation()" style="width:42px;font-size:9px;padding:1px 3px;border:0.5px solid var(--b);border-radius:3px;margin-left:4px;text-align:center;font-family:inherit;background:var(--sf);color:var(--t2)" title="Kolon genisligi (px)">';
      h += '</label>';
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
  try { var _wObj = {}; document.querySelectorAll('#mo-kolon-ayar input[data-kol-w]').forEach(function(inp) { var v = parseInt(inp.value); if (inp.dataset.kolW && v >= 40 && v <= 400) _wObj[inp.dataset.kolW] = v; }); localStorage.setItem(_IHR_KOLON_W_KEY, JSON.stringify(_wObj)); } catch(e2) {}
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
  satirSayisi: 0,
  excelSheets: [],
  seciliSheet: 0,
  guvenilik: {},
  hatalar: [],
  importOzet: null
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

/** Step bar render — EXCEL-IMPORT-UPGRADE-001 */
function _v3RenderSteps() {
  var el = document.getElementById('import-v3-steps');
  if (!el) return;
  var adimlar = [
    { n:1, ikon:'\ud83d\udcc1', l:'Dosya Yükle', alt:'Excel dosyanı seç' },
    { n:2, ikon:'\ud83d\udccb', l:'Sayfa Seç', alt:'Hangi sayfa?' },
    { n:3, ikon:'\ud83d\udd17', l:'Eşleştir', alt:'Sütunları eşleştir' },
    { n:4, ikon:'\ud83d\udc40', l:'Kontrol & Aktar', alt:'Son kontrol' }
  ];
  var h = '<div style="display:flex;align-items:center;padding:12px 20px;background:var(--sf);border-bottom:0.5px solid var(--b)">';
  adimlar.forEach(function(a, i) {
    var tamamlandi = _v3.adim > a.n;
    var aktif = _v3.adim === a.n;
    var numBg = tamamlandi ? '#16A34A' : aktif ? '#185FA5' : 'var(--b)';
    var numClr = (tamamlandi || aktif) ? '#fff' : 'var(--t3)';
    var txtClr = aktif ? '#185FA5' : tamamlandi ? '#27500A' : 'var(--t3)';
    h += '<div style="display:flex;flex-direction:column;align-items:center;flex:1">';
    h += '<div style="width:32px;height:32px;border-radius:50%;background:'+numBg+';color:'+numClr+';display:flex;align-items:center;justify-content:center;font-size:'+(tamamlandi?'14px':'13px')+';font-weight:600;margin-bottom:4px">'+(tamamlandi?'\u2713':a.ikon)+'</div>';
    h += '<div style="font-size:10px;font-weight:500;color:'+txtClr+'">'+a.l+'</div>';
    if (aktif) h += '<div style="font-size:9px;color:var(--t3);margin-top:1px">'+a.alt+'</div>';
    h += '</div>';
    if (i < adimlar.length-1) h += '<div style="flex:0 0 32px;height:2px;background:'+(tamamlandi?'#16A34A':'var(--b)')+';border-radius:1px;margin-bottom:20px"></div>';
  });
  h += '</div>';
  el.innerHTML = h;
}

// ── ADIM 1 — DOSYA YUKLE (EXCEL-IMPORT-UPGRADE-001) ─────────
function _v3Adim1() {
  _v3.adim = 1; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;
  var h = '<div style="padding:32px 20px;text-align:center">';
  h += '<div style="font-size:48px;margin-bottom:12px">\ud83d\udcca</div>';
  h += '<div style="font-size:18px;font-weight:500;color:var(--t);margin-bottom:6px">Excel dosyan\u0131 buraya b\u0131rak!</div>';
  h += '<div style="font-size:12px;color:var(--t3);margin-bottom:24px">Ya da a\u015fa\u011f\u0131daki butona t\u0131kla. .xlsx veya .xls dosyas\u0131 olmal\u0131.</div>';
  h += '<div id="v3-drop-zone" onclick="event.stopPropagation();document.getElementById(\'v3-file-input\').click()" style="border:3px dashed var(--b);border-radius:16px;padding:32px;cursor:pointer;background:var(--s2);transition:all .2s;margin:0 auto;max-width:400px">';
  h += '<input type="file" id="v3-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="event.stopPropagation();window._v3DosyaSec(this)">';
  if (_v3.dosyaAdi) {
    h += '<div style="font-size:32px;margin-bottom:8px">\u2705</div>';
    h += '<div style="font-size:14px;font-weight:500;color:#16A34A">'+_esc(_v3.dosyaAdi)+'</div>';
    h += '<div style="font-size:11px;color:var(--t3);margin-top:4px">'+_v3.satirSayisi+' sat\u0131r haz\u0131r</div>';
    h += '<div style="font-size:10px;color:#185FA5;margin-top:8px;text-decoration:underline;cursor:pointer">Farkl\u0131 dosya se\u00e7</div>';
  } else {
    h += '<div style="font-size:14px;color:var(--t2);margin-bottom:12px">Dosyay\u0131 s\u00fcr\u00fckle & b\u0131rak</div>';
    h += '<button style="padding:10px 24px;background:#185FA5;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:500">\ud83d\udcc2 Dosya Se\u00e7</button>';
  }
  h += '</div>';
  h += '<div style="margin-top:16px;font-size:11px;color:var(--t3)">\ud83d\udca1 \u0130pucu: Dosyan\u0131n ilk sat\u0131r\u0131 ba\u015fl\u0131k sat\u0131r\u0131 olmal\u0131 (\u00dcr\u00fcn Ad\u0131, Miktar, Fiyat vb.)</div>';
  h += '</div>';
  body.innerHTML = h;
  _v3KurDragDrop();
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-import-v3\')?.remove()">İptal</button>'
    + '<button class="btn btnp" id="v3-devam-1" onclick="event.stopPropagation();window._v3Adim2()" style="'+(_v3.dosyaAdi?'':'opacity:.4;pointer-events:none')+'">Devam \u2192 Sayfa Se\u00e7</button>';
}

function _v3KurDragDrop() {
  var zone = document.getElementById('v3-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.style.borderColor='#185FA5'; zone.style.background='#E6F1FB'; }, { capture:true });
  zone.addEventListener('dragleave', function(){ zone.style.borderColor='var(--b)'; zone.style.background='var(--s2)'; }, { capture:true });
  zone.addEventListener('drop', function(e){ e.preventDefault(); zone.style.borderColor='var(--b)'; zone.style.background='var(--s2)'; var f=e.dataTransfer.files[0]; if(f) window._v3DosyaOku(f); }, { capture:true });
}

window._v3DosyaSec = function(input) { var f = input.files && input.files[0]; if (f) window._v3DosyaOku(f); };

window._v3DosyaOku = function(f) {
  _v3.dosyaAdi = f.name;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (!window.XLSX) { window.toast?.('Excel okuyucu y\u00fckl\u00fcyor...', 'warn'); return; }
      var wb = window.XLSX.read(e.target.result, { type:'array', cellText:false, cellDates:true });
      _v3.excelSheets = wb.SheetNames;
      _v3.seciliSheet = 0;
      _v3._wb = wb;
      _v3OkuSheet(wb, wb.SheetNames[0]);
      _v3Adim1();
    } catch(err) { window.toast?.('Dosya okunamad\u0131: ' + err.message, 'err'); }
  };
  reader.readAsArrayBuffer(f);
};

function _v3OkuSheet(wb, sheetName) {
  var ws = wb.Sheets[sheetName];
  var json = window.XLSX.utils.sheet_to_json(ws, { header:1, raw:false, defval:'' });
  if (!json.length) { _v3.excelData = []; _v3.excelKolonlar = []; _v3.satirSayisi = 0; return; }
  var basliklar = json[0].map(function(b){ return String(b||'').trim(); }).filter(Boolean);
  _v3.excelKolonlar = basliklar;
  _v3.excelData = json.slice(1).filter(function(r){ return r.some(function(c){ return c!==''; }); }).map(function(r){
    var obj = {};
    basliklar.forEach(function(b, i){ obj[b] = r[i] !== undefined ? String(r[i]||'').trim() : ''; });
    return obj;
  });
  _v3.satirSayisi = _v3.excelData.length;
  _v3.eslestirme = {};
  _v3.guvenilik = {};
}

// ── ADIM 2 — SAYFA SEC (EXCEL-IMPORT-UPGRADE-001) ───────────
function _v3Adim2() {
  _v3.adim = 2; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;
  var sheets = _v3.excelSheets || [];
  var h = '<div style="padding:24px 20px">';
  h += '<div style="font-size:16px;font-weight:500;margin-bottom:4px">\ud83d\udccb Hangi sayfa?</div>';
  h += '<div style="font-size:12px;color:var(--t3);margin-bottom:20px">Dosyanda birden fazla sayfa varsa hangisini aktarmak istedi\u011fini se\u00e7.</div>';
  if (sheets.length <= 1) {
    h += '<div style="background:#EAF3DE;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:10px"><span style="font-size:24px">\u2705</span><div><div style="font-weight:500;color:#27500A">'+_esc(sheets[0]||'Sayfa1')+'</div><div style="font-size:11px;color:#3B6D11">'+_v3.satirSayisi+' sat\u0131r verisi mevcut</div></div></div>';
  } else {
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">';
    sheets.forEach(function(sh, idx) {
      var secili = _v3.seciliSheet === idx;
      h += '<div onclick="event.stopPropagation();window._v3SheetSec('+idx+')" style="border:2px solid '+(secili?'#185FA5':'var(--b)')+';border-radius:10px;padding:14px;cursor:pointer;background:'+(secili?'#E6F1FB':'var(--sf)')+';text-align:center"><div style="font-size:28px;margin-bottom:6px">\ud83d\udcc4</div><div style="font-size:12px;font-weight:500;color:'+(secili?'#185FA5':'var(--t)')+'">'+_esc(sh)+'</div>'+(secili?'<div style="font-size:10px;color:#185FA5;margin-top:3px">\u2713 Se\u00e7ili</div>':'')+'</div>';
    });
    h += '</div>';
  }
  h += '<div style="margin-top:16px;padding:10px 14px;background:#FAEEDA;border-radius:8px;font-size:11px;color:#633806">\ud83d\udca1 Se\u00e7ilen sayfada <strong>'+_v3.satirSayisi+'</strong> sat\u0131r ve <strong>'+_v3.excelKolonlar.length+'</strong> s\u00fctun var.</div>';
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Adim1()">\u2190 Geri</button><button class="btn btnp" onclick="event.stopPropagation();window._v3Adim3()">Devam \u2192 E\u015fle\u015ftir</button>';
}

window._v3SheetSec = function(idx) { _v3.seciliSheet = idx; if (_v3._wb) _v3OkuSheet(_v3._wb, _v3.excelSheets[idx]); _v3Adim2(); };

// ── ADIM 3 — AKILLI ESLESTIRME (EXCEL-IMPORT-UPGRADE-001) ───
function _v3Adim3() { _v3.adim = 3; _v3RenderSteps(); _v3OtomatikEslesDir(); _v3Adim3Render(); }

function _v3OtomatikEslesDir() {
  if (Object.keys(_v3.eslestirme).length > 0) return;
  var ALAN_ESLEME = {
    aciklama:['aciklama','urun adi','urun ad\u0131','product name','\u00fcr\u00fcn ad\u0131','product description','\u00fcr\u00fcn a\u00e7\u0131klama','item name','a\u00e7\u0131klama'],
    urun_kodu:['urun kodu','\u00fcr\u00fcn kodu','urun no','\u00fcr\u00fcn no','product code','article','kod','code','item code','sku'],
    miktar:['miktar','adet','qty','quantity','amount','miktar\u0131','adet say\u0131s\u0131'],
    birim:['birim','unit','\u00f6l\u00e7\u00fc','olcu','birimi'],
    birim_fiyat:['birim fiyat','fiyat','price','unit price','birim fiyat\u0131','fiyat\u0131'],
    doviz:['doviz','d\u00f6viz','para birimi','currency','para'],
    hs_kodu:['hs','hs kodu','gtip','g\u00fcmr\u00fck kodu','gumruk kodu','tariff','hs code'],
    koli_adet:['koli','koli adet','koli say\u0131s\u0131','carton','box','kol\u0131'],
    brut_kg:['brut','br\u00fct kg','brut kg','gross weight','br\u00fct a\u011f\u0131rl\u0131k','gross kg'],
    net_kg:['net','net kg','net weight','net a\u011f\u0131rl\u0131k'],
    hacim_m3:['hacim','m3','cbm','volume','hacim m3'],
    tedarikciAd:['tedarikci','tedarik\u00e7i','supplier','vendor','satici','sat\u0131c\u0131','tedarik\u00e7i ad\u0131']
  };
  var guvenTespit = {};
  _v3.excelKolonlar.forEach(function(excKol) {
    var kucuk = excKol.toLowerCase().replace(/[^a-z0-9\u011f\u00fc\u015f\u0131\u00f6\u00e7]/g,'');
    var enIyi = null; var enIyiSkor = 0;
    Object.keys(ALAN_ESLEME).forEach(function(sistemAlan) {
      ALAN_ESLEME[sistemAlan].forEach(function(anahtar) {
        var kucukAnahtar = anahtar.toLowerCase().replace(/[^a-z0-9\u011f\u00fc\u015f\u0131\u00f6\u00e7]/g,'');
        var skor = 0;
        if (kucuk === kucukAnahtar) skor = 100;
        else if (kucuk.indexOf(kucukAnahtar) !== -1 || kucukAnahtar.indexOf(kucuk) !== -1) skor = 75;
        else if (kucuk.slice(0,4) === kucukAnahtar.slice(0,4) && kucuk.length > 3) skor = 50;
        if (skor > enIyiSkor) { enIyiSkor = skor; enIyi = sistemAlan; }
      });
    });
    if (enIyi && enIyiSkor >= 50) { _v3.eslestirme[excKol] = enIyi; guvenTespit[excKol] = enIyiSkor; }
    else { _v3.eslestirme[excKol] = 'atla'; guvenTespit[excKol] = 0; }
  });
  _v3.guvenilik = guvenTespit;
}

function _v3Adim3Render() {
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;
  var TUM_ALANLAR = [
    { v:'atla', l:'\u2014 Atla (bu s\u00fctun aktar\u0131lmas\u0131n) \u2014' },
    { v:'aciklama', l:'\u00dcr\u00fcn A\u00e7\u0131klamas\u0131' }, { v:'urun_kodu', l:'\u00dcr\u00fcn Kodu' },
    { v:'miktar', l:'Miktar' }, { v:'birim', l:'Birim' }, { v:'birim_fiyat', l:'Birim Fiyat' },
    { v:'doviz', l:'D\u00f6viz' }, { v:'hs_kodu', l:'HS / GTIP Kodu' },
    { v:'koli_adet', l:'Koli Adeti' }, { v:'brut_kg', l:'Br\u00fct A\u011f\u0131rl\u0131k' },
    { v:'net_kg', l:'Net A\u011f\u0131rl\u0131k' }, { v:'hacim_m3', l:'Hacim (m\u00b3)' },
    { v:'tedarikciAd', l:'Tedarik\u00e7i Ad\u0131' }
  ];
  var eslesti = Object.values(_v3.eslestirme).filter(function(v){ return v&&v!=='atla'; }).length;
  var pct = _v3.excelKolonlar.length > 0 ? Math.round(eslesti/_v3.excelKolonlar.length*100) : 0;
  var pctRenk = pct>=70?'#16A34A':pct>=40?'#D97706':'#DC2626';
  var h = '';
  h += '<div style="padding:10px 16px;background:var(--sf);border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:12px">';
  h += '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--t2)">E\u015fle\u015fme durumu</span><span style="font-size:11px;font-weight:500;color:'+pctRenk+'">'+eslesti+'/'+_v3.excelKolonlar.length+' (%'+pct+')</span></div>';
  h += '<div style="height:6px;background:var(--b);border-radius:3px"><div style="width:'+pct+'%;height:6px;background:'+pctRenk+';border-radius:3px"></div></div></div>';
  h += '<button onclick="event.stopPropagation();window._v3SifirlaEslestir()" style="font-size:9px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\ud83d\udd04 S\u0131f\u0131rla</button>';
  h += '<button onclick="event.stopPropagation();window._v3YenidenOtomatik()" style="font-size:9px;padding:3px 8px;border:0.5px solid #185FA5;border-radius:4px;background:#E6F1FB;cursor:pointer;color:#185FA5;font-family:inherit">\ud83e\udde0 Otomatik</button>';
  h += '</div>';
  h += '<div style="padding:0 0 8px">';
  _v3.excelKolonlar.forEach(function(excKol, idx) {
    var secili = _v3.eslestirme[excKol] || 'atla';
    var guv = _v3.guvenilik[excKol] || 0;
    var eslesti2 = secili !== 'atla';
    var bg = idx % 2 === 0 ? 'var(--sf)' : 'var(--s2)';
    var ornekDeger = _v3.excelData[0] ? (_v3.excelData[0][excKol]||'') : '';
    h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:'+bg+';border-bottom:0.5px solid var(--b)">';
    h += '<div style="min-width:150px;flex:0 0 150px"><div style="font-size:11px;font-weight:500;color:var(--t)">'+_esc(excKol)+'</div>';
    if (ornekDeger) h += '<div style="font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">\u00d6rnek: '+_esc(String(ornekDeger).slice(0,25))+'</div>';
    h += '</div><span style="font-size:16px;color:var(--t3)">\u2192</span>';
    h += '<div style="flex:1"><select onchange="event.stopPropagation();window._v3EslestirSec(\''+_esc(excKol)+'\',this.value)" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:1.5px solid '+(eslesti2?'#16A34A':'var(--b)')+';border-radius:6px;background:'+(eslesti2?'#EAF3DE':'var(--sf)')+';color:var(--t);font-family:inherit;cursor:pointer">';
    TUM_ALANLAR.forEach(function(a){ h += '<option value="'+a.v+'"'+(secili===a.v?' selected':'')+'>'+_esc(a.l)+'</option>'; });
    h += '</select></div>';
    if (guv > 0) { var guvRenk=guv>=75?'#16A34A':guv>=50?'#D97706':'#DC2626'; var guvBg=guv>=75?'#EAF3DE':guv>=50?'#FAEEDA':'#FCEBEB'; h += '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:'+guvBg+';color:'+guvRenk+';font-weight:500;flex-shrink:0;min-width:40px;text-align:center">%'+guv+'</span>'; }
    else { h += '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#f3f4f6;color:var(--t3);flex-shrink:0;min-width:40px;text-align:center">Atla</span>'; }
    h += '</div>';
  });
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Adim2()">\u2190 Geri</button><button class="btn btnp" onclick="event.stopPropagation();window._v3Adim4()">Devam \u2192 \u00d6nizle</button>';
}

window._v3EslestirSec = function(kolAdi, deger) { _v3.eslestirme[kolAdi] = deger; };
window._v3SifirlaEslestir = function() { _v3.eslestirme = {}; _v3.guvenilik = {}; _v3Adim3Render(); };
window._v3YenidenOtomatik = function() { _v3.eslestirme = {}; _v3.guvenilik = {}; _v3OtomatikEslesDir(); _v3Adim3Render(); window.toast?.('Otomatik e\u015fle\u015ftirme tamamland\u0131', 'ok'); };

// ── ADIM 4 — ONIZLE & AKTAR (EXCEL-IMPORT-UPGRADE-001) ──────
function _v3Adim4() {
  _v3.adim = 4; _v3RenderSteps();
  var body = document.getElementById('import-v3-body');
  var footer = document.getElementById('import-v3-footer');
  if (!body) return;
  var ZORUNLU = ['aciklama','miktar'];
  var eksikZorunlu = ZORUNLU.filter(function(z){ return !Object.values(_v3.eslestirme).includes(z); });
  var mappedRows = _v3.excelData.map(function(satir){
    var mapped = {};
    _v3.excelKolonlar.forEach(function(k){ var alan = _v3.eslestirme[k]; if (alan && alan !== 'atla') mapped[alan] = satir[k]; });
    return mapped;
  }).filter(function(m){ return Object.keys(m).length > 0; });
  _v3._mappedRows = mappedRows;
  var hataliSatirlar = [];
  mappedRows.forEach(function(m, idx){
    var h2 = [];
    if (!m.aciklama || !String(m.aciklama).trim()) h2.push('\u00dcr\u00fcn ad\u0131 bo\u015f');
    if (m.miktar && isNaN(parseFloat(m.miktar))) h2.push('Miktar say\u0131 de\u011fil');
    if (m.birim_fiyat && isNaN(parseFloat(m.birim_fiyat))) h2.push('Fiyat say\u0131 de\u011fil');
    if (h2.length) hataliSatirlar.push({ satir: idx+1, hatalar: h2 });
  });
  var eslesti = Object.values(_v3.eslestirme).filter(function(v){ return v&&v!=='atla'; }).length;
  var hazir = mappedRows.length - hataliSatirlar.length;
  var h = '';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--b)">';
  h += '<div style="background:#EAF3DE;padding:12px;text-align:center"><div style="font-size:9px;color:#27500A">Toplam</div><div style="font-size:22px;font-weight:500;color:#16A34A">'+mappedRows.length+'</div></div>';
  h += '<div style="background:#E6F1FB;padding:12px;text-align:center"><div style="font-size:9px;color:#0C447C">E\u015fle\u015fen</div><div style="font-size:22px;font-weight:500;color:#185FA5">'+eslesti+'</div></div>';
  h += '<div style="background:'+(hataliSatirlar.length?'#FCEBEB':'#EAF3DE')+';padding:12px;text-align:center"><div style="font-size:9px;color:'+(hataliSatirlar.length?'#791F1F':'#27500A')+'">Hatal\u0131</div><div style="font-size:22px;font-weight:500;color:'+(hataliSatirlar.length?'#DC2626':'#16A34A')+'">'+hataliSatirlar.length+'</div></div>';
  h += '<div style="background:'+(eksikZorunlu.length?'#FCEBEB':'#EAF3DE')+';padding:12px;text-align:center"><div style="font-size:9px;color:'+(eksikZorunlu.length?'#791F1F':'#27500A')+'">Aktar\u0131labilir</div><div style="font-size:22px;font-weight:500;color:'+(eksikZorunlu.length?'#DC2626':'#16A34A')+'">'+hazir+'</div></div>';
  h += '</div>';
  if (eksikZorunlu.length) {
    h += '<div style="padding:10px 16px;background:#FCEBEB;border-bottom:0.5px solid #FCA5A5;display:flex;align-items:center;gap:8px"><span style="font-size:16px">\u26a0\ufe0f</span><div><div style="font-size:11px;font-weight:500;color:#991B1B">Zorunlu alanlar e\u015fle\u015fmedi!</div><div style="font-size:10px;color:#7F1D1D">Eksik: '+eksikZorunlu.map(function(z){ return z==='aciklama'?'\u00dcr\u00fcn Ad\u0131':'Miktar'; }).join(', ')+'</div></div>';
    h += '<button onclick="event.stopPropagation();window._v3Adim3()" style="margin-left:auto;font-size:10px;padding:3px 10px;border:0.5px solid #DC2626;border-radius:4px;background:transparent;cursor:pointer;color:#DC2626;font-family:inherit">\u2190 Geri</button></div>';
  }
  if (hataliSatirlar.length > 0) {
    h += '<div style="padding:8px 16px;background:#FAEEDA;border-bottom:0.5px solid var(--b)"><div style="font-size:10px;font-weight:500;color:#633806;margin-bottom:4px">\u26a0\ufe0f '+hataliSatirlar.length+' sat\u0131rda sorun var</div>';
    hataliSatirlar.slice(0,3).forEach(function(hs){ h += '<div style="font-size:10px;color:#92400E">Sat\u0131r '+hs.satir+': '+hs.hatalar.join(', ')+'</div>'; });
    if (hataliSatirlar.length > 3) h += '<div style="font-size:10px;color:var(--t3)">...ve '+(hataliSatirlar.length-3)+' sat\u0131r daha</div>';
    h += '</div>';
  }
  if (mappedRows.length > 0) {
    var onizKolonlar = Object.keys(mappedRows[0]).slice(0,6);
    var ALAN_ADI = { aciklama:'\u00dcr\u00fcn Ad\u0131', urun_kodu:'Kod', miktar:'Miktar', birim:'Birim', birim_fiyat:'Fiyat', doviz:'D\u00f6viz', hs_kodu:'HS', koli_adet:'Koli', brut_kg:'Br\u00fct', tedarikciAd:'Tedarik\u00e7i' };
    h += '<div style="padding:10px 16px 4px;font-size:10px;font-weight:500;color:var(--t2)">\ud83d\udc41\ufe0f \u0130lk 10 sat\u0131r \u00f6nizleme:</div>';
    h += '<div style="overflow-x:auto;padding:0 16px 12px"><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:4px 8px;text-align:left;border:0.5px solid var(--b);color:#185FA5">#</th>';
    onizKolonlar.forEach(function(k){ h += '<th style="padding:4px 8px;text-align:left;border:0.5px solid var(--b);color:#185FA5;white-space:nowrap">'+(ALAN_ADI[k]||k)+'</th>'; });
    h += '</tr></thead><tbody>';
    mappedRows.slice(0,10).forEach(function(m, ri){
      var hataVar = hataliSatirlar.find(function(hs){ return hs.satir === ri+1; });
      h += '<tr style="background:'+(hataVar?'#FEF2F2':(ri%2?'var(--s2)':'var(--sf)'))+'">';
      h += '<td style="padding:3px 8px;border:0.5px solid var(--b);color:var(--t3)">'+(ri+1)+(hataVar?'\u26a0\ufe0f':'')+'</td>';
      onizKolonlar.forEach(function(k){ var val = String(m[k]||'').slice(0,25); h += '<td style="padding:3px 8px;border:0.5px solid var(--b);'+((!val&&ZORUNLU.indexOf(k)!==-1)?'background:#FCEBEB':'')+'">'+(_esc(val)||'<span style="color:#DC2626">Bo\u015f!</span>')+'</td>'; });
      h += '</tr>';
    });
    if (mappedRows.length > 10) h += '<tr><td colspan="'+(onizKolonlar.length+1)+'" style="padding:6px;text-align:center;color:var(--t3);font-style:italic">... ve '+(mappedRows.length-10)+' sat\u0131r daha</td></tr>';
    h += '</tbody></table></div>';
  }
  body.innerHTML = h;
  var importEngel = eksikZorunlu.length > 0 || mappedRows.length === 0;
  footer.innerHTML = '<button class="btn btns" onclick="event.stopPropagation();window._v3Adim3()">\u2190 Geri</button>'
    + (importEngel ? '<button class="btn btnp" disabled style="opacity:.4;cursor:not-allowed">\u26d4 \u00d6nce Zorunlu Alanlar\u0131 E\u015fle\u015ftir</button>'
    : '<button class="btn btnp" onclick="event.stopPropagation();window._ihrExcelImportV3Execute()" style="background:#16A34A;border-color:#16A34A">\u2705 '+hazir+' Sat\u0131r\u0131 Aktar</button>');
}

// ── ESKI FONKSIYONLAR KALDIRILDI (EXCEL-IMPORT-UPGRADE-001) ──
// _v3AiEslestir, _v3RenderEslestirme, _v3ProcessRawData → yerine _v3OtomatikEslesDir, _v3Adim3Render, _v3OkuSheet
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

// ══════════════════════════════════════════════════════════════════
// IHR-OPS-REDESIGN-002 — Asama 1: Altyapi + Yardimci Fonksiyonlar
// ══════════════════════════════════════════════════════════════════

// ── BOLUM I: Paydas Tamamlanma % ─────────────────────────────
var _PAYDAS_KONTROL = {
  musteri: ['musteriAd','musteri_mail','musteri_yetkili','musteri_tel'],
  sigortaci: ['sigortaFirma','police_no','sigorta_deger'],
  gumrukcu: ['gumrukcu_id','gcb_tarih','gcb_durum'],
  forwarder: ['forwarder_id','booking_no','konteyner_no','muhur_no']
};

/**
 * Paydas tamamlanma yuzdesini hesaplar.
 * @param {string} dosyaId
 * @param {string} paydas musteri|sigortaci|gumrukcu|forwarder
 * @returns {{pct:number, eksikler:string[]}}
 */
window._ihrPaydasPct = function(dosyaId, paydas) {
  var kontrol = _PAYDAS_KONTROL[paydas];
  if (!kontrol) return { pct: 0, eksikler: [] };
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return { pct: 0, eksikler: kontrol.slice() };
  // Gumrukcu/forwarder icin dosya + GCB/BL kontrolu
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var gcb = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; })[0];
  var bl = _loadBL().filter(function(b) { return String(b.dosya_id) === String(dosyaId) && !b.isDeleted; })[0];
  var kaynakObj = Object.assign({}, d, gcb || {}, bl || {});
  var dolu = 0; var eksikler = [];
  kontrol.forEach(function(k) {
    if (kaynakObj[k] && String(kaynakObj[k]).trim()) dolu++;
    else eksikler.push(k);
  });
  return { pct: Math.round(dolu / kontrol.length * 100), eksikler: eksikler };
};

// ── BOLUM F: Kambiyo 90 Gun Countdown ────────────────────────
/**
 * GCB tescil tarihinden 90 gun kambiyo sayaci.
 * @param {string} dosyaId
 * @returns {?{kalanGun:number, deadline:string, durum:string, odenmis:boolean}}
 */
window._ihrKambiyo90 = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  var gcb = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; })[0];
  var gcbTarih = gcb?.tescil_tarihi || d?.gcb_tescil_tarihi;
  if (!gcbTarih) return null;
  var deadline = new Date(gcbTarih);
  deadline.setDate(deadline.getDate() + 90);
  var kalanGun = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return {
    kalanGun: kalanGun,
    deadline: deadline.toLocaleDateString('tr-TR'),
    durum: kalanGun < 0 ? 'gecmis' : kalanGun < 15 ? 'kritik' : kalanGun < 30 ? 'uyari' : 'normal',
    odenmis: !!(d?.kambiyo_odenmis)
  };
};

// ── BOLUM C: Konteyner Kapasitesi Gauge ──────────────────────
var _KONTEYNER_TIP = {
  '40HC': { m3: 76, kg: 28000 },
  '20DC': { m3: 33, kg: 28000 },
  '40DC': { m3: 67, kg: 28000 }
};

/**
 * Konteyner kapasite gauge HTML'i olusturur.
 * @param {string} dosyaId
 * @returns {string} HTML
 */
window._ihrKonteynerGauge = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  var tip = (d?.konteyner_tipi || '40HC').toUpperCase();
  var kap = _KONTEYNER_TIP[tip] || _KONTEYNER_TIP['40HC'];
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var topM3 = 0, topKG = 0;
  urunler.forEach(function(u) {
    topM3 += parseFloat(u.hacim_m3) || 0;
    topKG += (parseFloat(u.brut_kg) || 0);
  });
  // Sanity check — gauge bari max %100 ama gosterge deger gercek
  var pctM3 = Math.min(Math.round(topM3 / kap.m3 * 100), 999);
  var pctKG = Math.min(Math.round(topKG / kap.kg * 100), 999);
  var barM3 = Math.min(pctM3, 100);
  var barKG = Math.min(pctKG, 100);
  var renk = function(p) { return p >= 95 ? '#DC2626' : p >= 80 ? '#D97706' : '#16A34A'; };

  var h = '<div style="padding:12px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf)">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<span style="font-size:12px;font-weight:600">Konteyner ' + _esc(tip) + '</span>';
  h += '<div style="display:flex;gap:4px">';
  Object.keys(_KONTEYNER_TIP).forEach(function(t) {
    var aktif = t === tip;
    h += '<button onclick="event.stopPropagation();window._ihrSetKonteynerTip(\'' + dosyaId + '\',\'' + t + '\')" style="padding:2px 8px;border-radius:4px;font-size:9px;cursor:pointer;font-family:inherit;border:0.5px solid ' + (aktif ? 'var(--ac)' : 'var(--b)') + ';background:' + (aktif ? 'var(--ac)' : 'var(--sf)') + ';color:' + (aktif ? '#fff' : 'var(--t2)') + '">' + t + '</button>';
  });
  h += '</div></div>';
  // M3 gauge
  h += '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:3px"><span>Hacim (m\u00b3)</span><span>' + topM3.toFixed(1) + ' / ' + kap.m3 + ' m\u00b3</span></div>';
  h += '<div style="height:10px;background:var(--s2);border-radius:5px;overflow:hidden;position:relative"><div style="height:100%;width:' + barM3 + '%;background:' + renk(pctM3) + ';border-radius:5px;transition:width .3s"></div><div style="position:absolute;left:80%;top:0;bottom:0;width:1px;background:rgba(0,0,0,.2)"></div></div></div>';
  // KG gauge
  h += '<div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:3px"><span>Agirlik (KG)</span><span>' + topKG.toLocaleString('tr-TR') + ' / ' + kap.kg.toLocaleString('tr-TR') + ' KG</span></div>';
  h += '<div style="height:10px;background:var(--s2);border-radius:5px;overflow:hidden;position:relative"><div style="height:100%;width:' + barKG + '%;background:' + renk(pctKG) + ';border-radius:5px;transition:width .3s"></div><div style="position:absolute;left:80%;top:0;bottom:0;width:1px;background:rgba(0,0,0,.2)"></div></div></div>';
  // Uyari mesajlari
  var maxPct = Math.max(pctM3, pctKG);
  if (pctM3 > 100 || pctKG > 100) h += '<div style="font-size:9px;color:#DC2626;margin-top:6px;font-weight:500">\ud83d\udd34 Konteyner kapasitesi asildi! (M\u00b3 %' + pctM3 + ', KG %' + pctKG + ')</div>';
  else if (maxPct >= 95) h += '<div style="font-size:9px;color:#DC2626;margin-top:6px;font-weight:500">\ud83d\udd34 Konteyner neredeyse dolu</div>';
  else if (maxPct >= 80) h += '<div style="font-size:9px;color:#D97706;margin-top:6px">\u26a0 ' + tip + ' kapasitesinin %' + maxPct + '\'i dolu</div>';
  h += '</div>';
  return h;
};

/** Konteyner tipini degistir */
window._ihrSetKonteynerTip = function(dosyaId, tip) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); });
  if (d) { d.konteyner_tipi = tip; d.updatedAt = _now(); _storeD(dosyalar); }
  _ihrReRender();
};

// ── BOLUM J: Otomatik Iletisim Logu ─────────────────────────
/**
 * Ihracat dosyasina iletisim logu yazar.
 * @param {string} dosyaId
 * @param {string} aksiyon
 * @param {string} [hedef]
 * @param {string} [evrakTur]
 */
window._ihrLog = function(dosyaId, aksiyon, hedef, evrakTur) {
  var logKey = 'ak_ihr_log_' + dosyaId;
  var loglar = [];
  try { loglar = JSON.parse(localStorage.getItem(logKey) || '[]'); } catch(e) {}
  loglar.unshift({
    id: Date.now().toString(),
    aksiyon: aksiyon,
    hedef: hedef || null,
    evrakTur: evrakTur || null,
    kim: _cu()?.name || 'Duay Admin',
    tarih: _now()
  });
  if (loglar.length > 200) loglar = loglar.slice(0, 200);
  try { localStorage.setItem(logKey, JSON.stringify(loglar)); } catch(e) {}
};

// ── BOLUM E: 5 Seviyeli Evrak Durumu ─────────────────────────
/**
 * Evrakin durum seviyesini belirler.
 * @param {Object} evrak
 * @param {number} dosyaAsama
 * @returns {{seviye:number, label:string, renk:string}}
 */
window._ihrEvrakDurumSeviye = function(evrak, dosyaAsama) {
  var zorunluAsama = { PI:1, CI:2, PL:2, GCB:3, BL:4, SIG:1, SEVK:3, YUK:3 };
  var gerekliMi = (dosyaAsama || 1) >= (zorunluAsama[evrak.tur] || 99);
  if (!gerekliMi) return { seviye: 5, label: 'Henuz gerekmez', renk: '#888' };
  if (evrak.durum === 'gonderildi' || evrak.durum === 'tamamlandi') return { seviye: 4, label: 'Tamamlandi', renk: '#3B6D11' };
  if (evrak.durum === 'onay_bekliyor' || evrak.durum === 'onaylandi') return { seviye: 3, label: 'Onay bekliyor', renk: '#EF9F27' };
  if (evrak.durum === 'hazirlaniyor' || evrak.durum === 'taslak') return { seviye: 2, label: 'Hazirlaniyor', renk: '#BA7517' };
  return { seviye: 1, label: 'Kritik eksik', renk: '#A32D2D' };
};

// ── BOLUM G: BL Kademeli Onay ────────────────────────────────
var _BL_ADIMLAR = [
  { id: 'draft_alindi', label: 'Forwarder Draft BL Gonderdi' },
  { id: 'ic_onaylandi', label: 'Duay Ic Kontrol' },
  { id: 'musteri_onayladi', label: 'Musteri Draft Onayi' },
  { id: 'odeme_alindi', label: 'Odeme Alindi' },
  { id: 'orijinal_released', label: 'Orijinal BL Teslim' }
];

/**
 * BL kademeli onay modali acar.
 * @param {string} dosyaId
 */
window._ihrBlOnayAc = function(dosyaId) {
  var old = _g('mo-bl-onay'); if (old) old.remove();
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  var mevcutAdim = d.bl_adim || '';
  var mevcutIdx = -1;
  _BL_ADIMLAR.forEach(function(a, i) { if (a.id === mevcutAdim) mevcutIdx = i; });

  var h = '<div style="padding:16px 20px">';
  _BL_ADIMLAR.forEach(function(a, i) {
    var tamamlandi = i <= mevcutIdx;
    var aktif = i === mevcutIdx + 1;
    // orijinal_released icin ozel kontrol
    var kilitli = (a.id === 'orijinal_released' && mevcutIdx < 3);
    var bg = tamamlandi ? '#EAF3DE' : aktif ? '#E6F1FB' : 'var(--s2)';
    var renk = tamamlandi ? '#16A34A' : aktif ? '#185FA5' : 'var(--t3)';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:4px;border-radius:8px;background:' + bg + '">';
    h += '<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;background:' + (tamamlandi ? '#16A34A' : 'var(--s2)') + ';color:' + (tamamlandi ? '#fff' : 'var(--t3)') + '">' + (tamamlandi ? '\u2713' : (i + 1)) + '</div>';
    h += '<div style="flex:1"><div style="font-size:11px;font-weight:500;color:' + renk + '">' + _esc(a.label) + '</div></div>';
    if (aktif && !kilitli) {
      h += '<button class="btn btnp" onclick="event.stopPropagation();window._ihrBlOnayAdim(\'' + dosyaId + '\',\'' + a.id + '\')" style="font-size:10px;padding:4px 12px">Onayla</button>';
    } else if (kilitli) {
      h += '<span style="font-size:9px;color:var(--t3)">Once odeme alinmali</span>';
    }
    h += '</div>';
  });
  h += '</div>';

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-bl-onay';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600">BL Onay Akisi</div><button onclick="event.stopPropagation();document.getElementById(\'mo-bl-onay\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u2715</button></div>'
    + h
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);text-align:right"><button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-bl-onay\')?.remove()">Kapat</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** BL onay adimi tamamla */
window._ihrBlOnayAdim = function(dosyaId, adimId) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  d.bl_adim = adimId;
  d.updatedAt = _now();
  _storeD(dosyalar);
  var adimLabel = '';
  _BL_ADIMLAR.forEach(function(a) { if (a.id === adimId) adimLabel = a.label; });
  window._ihrLog(dosyaId, 'BL adim: ' + adimLabel, null, 'BL');
  window.toast?.(adimLabel + ' tamamlandi', 'ok');
  window.logActivity?.('ihracat', 'BL onay: ' + adimLabel);
  _g('mo-bl-onay')?.remove();
  window._ihrBlOnayAc(dosyaId);
};

// ── BOLUM H: Dosya Klonlama ─────────────────────────────────
/**
 * Dosya klonlama modali acar.
 * @param {string} kaynakDosyaId
 */
window._ihrKlon = function(kaynakDosyaId) {
  var old = _g('mo-ihr-klon'); if (old) old.remove();
  var kaynak = _loadD().find(function(x) { return String(x.id) === String(kaynakDosyaId); });
  if (!kaynak) { window.toast?.('Kaynak dosya bulunamadi', 'err'); return; }

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-ihr-klon';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Dosya Klonla</div>'
    + '<div style="padding:16px 20px">'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">Kaynak: <b>' + _esc(kaynak.dosyaNo || '') + '</b> — ' + _esc(kaynak.musteriAd || '') + '</div>'
    + '<div style="font-size:12px;font-weight:500;margin-bottom:8px">Kopyalanacak bolumler:</div>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" id="klon-urunler" checked> Urun listesi (fiyat haric)</label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" id="klon-musteri" checked> Musteri bilgileri</label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" id="klon-paydas" checked> Paydas kisi bilgileri</label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" id="klon-konteyner" checked> Konteyner tipi</label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" id="klon-evraklar"> Evraklar (bos)</label>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-ihr-klon\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrKlonKaydet(\'' + kaynakDosyaId + '\')">Yeni Emir Olustur</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** Klonu kaydet ve yeni dosya olustur */
window._ihrKlonKaydet = function(kaynakId) {
  var kaynak = _loadD().find(function(x) { return String(x.id) === String(kaynakId); });
  if (!kaynak) return;

  var yeniId = _genId();
  // Dosya no: IHR-YIL-SIRA
  var yil = new Date().getFullYear();
  var mevcut = _loadD().filter(function(dd) { return !dd.isDeleted; });
  var sira = mevcut.length + 1;
  var dosyaNo = 'IHR-' + yil + '-' + String(sira).padStart(3, '0');

  var yeni = {
    id: yeniId,
    dosyaNo: dosyaNo,
    asamaNo: 1,
    durum: 'taslak',
    createdAt: _now(),
    createdBy: _cu()?.id
  };

  // Musteri bilgileri
  if (_g('klon-musteri')?.checked) {
    yeni.musteriAd = kaynak.musteriAd || '';
    yeni.musteri_mail = kaynak.musteri_mail || '';
    yeni.musteri_yetkili = kaynak.musteri_yetkili || '';
    yeni.musteri_tel = kaynak.musteri_tel || '';
    yeni.musteri_ulke = kaynak.musteri_ulke || '';
    yeni.musteri_adres = kaynak.musteri_adres || '';
  }
  // Paydas
  if (_g('klon-paydas')?.checked) {
    yeni.gumrukcu_id = kaynak.gumrukcu_id || '';
    yeni.forwarder_id = kaynak.forwarder_id || '';
    yeni.teslim_sekli = kaynak.teslim_sekli || '';
    yeni.varis_limani = kaynak.varis_limani || '';
  }
  // Konteyner
  if (_g('klon-konteyner')?.checked) {
    yeni.konteyner_tipi = kaynak.konteyner_tipi || '40HC';
  }

  // Dosyayi kaydet
  var dosyalar = _loadD();
  dosyalar.unshift(yeni);
  _storeD(dosyalar);

  // Urunleri kopyala (fiyat haric)
  if (_g('klon-urunler')?.checked) {
    var kaynakUrunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(kaynakId) && !u.isDeleted; });
    if (kaynakUrunler.length) {
      var tumUrunler = _loadU();
      kaynakUrunler.forEach(function(u) {
        var kopya = Object.assign({}, u);
        kopya.id = _genId();
        kopya.dosya_id = yeniId;
        kopya.birim_fiyat = null;
        kopya.toplam_tutar = null;
        kopya.createdAt = _now();
        kopya.createdBy = _cu()?.id;
        tumUrunler.unshift(kopya);
      });
      window.storeIhracatUrunler?.(tumUrunler);
    }
  }

  window._ihrLog(yeniId, 'Dosya klonlandi (kaynak: ' + (kaynak.dosyaNo || kaynakId) + ')', null, null);
  window.logActivity?.('ihracat', 'Dosya klonlandi: ' + dosyaNo + ' (kaynak: ' + kaynak.dosyaNo + ')');
  _g('mo-ihr-klon')?.remove();
  window.toast?.('Yeni dosya olusturuldu: ' + dosyaNo, 'ok');
  _ihrAcDosya(yeniId);
};

// ── BOLUM K/L: Musteri ve Sigortaci Placeholder Render ───────
/**
 * Musteri sekmesi render (Asama 3'te detaylandirilacak).
 * @param {Object} d Dosya objesi
 * @param {HTMLElement} c Container element
 */
window._ihrDetayRenderMusteri = function(d, c) {
  if (!c) return;
  var kambiyo = window._ihrKambiyo90?.(d.id);
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  var musteriEvraklar = evraklar.filter(function(e) { return ['PI','CI','PL','BL','MENSEI'].indexOf(e.tur) !== -1; });
  var loglar = [];
  try { loglar = JSON.parse(localStorage.getItem('ak_ihr_log_' + d.id) || '[]'); } catch(e) {}

  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px">';

  /* ── SOL: Musteri bilgi + gonderilen evraklar ── */
  h += '<div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:13px;font-weight:600">Musteri Bilgileri</div><button class="btn btns" onclick="event.stopPropagation();window._ihrMusteriDuzenle?.(\'' + d.id + '\')" style="font-size:10px">Duzenle</button></div>';
  /* Bilgi karti */
  h += '<div style="background:var(--s2);border-radius:8px;padding:12px;margin-bottom:12px">';
  [['Firma', d.musteriAd], ['Yetkili', d.musteri_yetkili], ['E-posta', d.musteri_mail], ['Telefon', d.musteri_tel], ['Ulke', d.musteri_ulke], ['Adres', d.musteri_adres]].forEach(function(r) {
    h += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span style="color:var(--t3)">' + r[0] + '</span><span style="font-weight:500;color:var(--t);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(r[1] || '\u2014') + '</span></div>';
  });
  h += '</div>';
  /* Musteriye gonderilen evraklar */
  h += '<div style="font-size:11px;font-weight:600;margin-bottom:6px">Musteriye Gonderilen Evraklar</div>';
  if (musteriEvraklar.length) {
    musteriEvraklar.forEach(function(ev) {
      var durumRenk = ev.durum === 'gonderildi' ? '#16A34A' : ev.durum === 'onaylandi' ? '#185FA5' : '#D97706';
      h += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:0.5px solid var(--b)">';
      h += '<div style="width:6px;height:6px;border-radius:50%;background:' + durumRenk + '"></div>';
      h += '<span style="font-size:11px;flex:1">' + _esc(ev.tur) + '</span>';
      h += '<span style="font-size:9px;padding:1px 6px;border-radius:10px;background:' + durumRenk + '22;color:' + durumRenk + '">' + _esc(ev.durum || 'taslak') + '</span>';
      if (ev.gonderim_tarihi) h += '<span style="font-size:9px;color:var(--t3);font-family:monospace">' + _esc(ev.gonderim_tarihi.slice(0, 10)) + '</span>';
      h += '</div>';
    });
  } else {
    h += '<div style="font-size:10px;color:var(--t3);padding:8px 0">Henuz evrak gonderilmedi</div>';
  }
  h += '</div>'; /* sol bitti */

  /* ── SAG: Kambiyo + Konteyner + Ek satis + Log ── */
  h += '<div>';
  /* Kambiyo 90 gun */
  if (kambiyo) {
    var kRenk = kambiyo.durum === 'gecmis' || kambiyo.durum === 'kritik' ? '#DC2626' : kambiyo.durum === 'uyari' ? '#D97706' : '#16A34A';
    h += '<div style="padding:16px;background:var(--s2);border-radius:10px;margin-bottom:12px;text-align:center">';
    h += '<div style="font-size:10px;color:var(--t3);margin-bottom:6px">Kambiyo 90 Gun</div>';
    if (kambiyo.odenmis) {
      h += '<div style="font-size:32px;font-weight:700;color:#16A34A">Odendi \u2713</div>';
    } else {
      h += '<div style="font-size:40px;font-weight:700;color:' + kRenk + '">' + kambiyo.kalanGun + '</div>';
      h += '<div style="font-size:11px;color:var(--t3)">gun kaldi \u00b7 Son: ' + kambiyo.deadline + '</div>';
      if (kambiyo.kalanGun <= 15 && kambiyo.kalanGun > 0) h += '<div style="font-size:10px;color:#DC2626;margin-top:6px;font-weight:600">\u26a0 Acil odeme gerekli!</div>';
    }
    h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrKambiyoOde?.(\'' + d.id + '\')" style="font-size:10px;margin-top:8px">' + (kambiyo.odenmis ? 'Geri Al' : 'Odeme Alindi') + '</button>';
    h += '</div>';
  }
  /* Konteyner gauge + ek satis */
  h += window._ihrKonteynerGauge?.(d.id) || '';
  /* Iletisim logu */
  h += '<div style="margin-top:12px">';
  h += '<div style="font-size:11px;font-weight:600;margin-bottom:6px">Iletisim Logu</div>';
  var _sonLog = loglar.slice(0, 10);
  if (_sonLog.length) {
    _sonLog.forEach(function(log) {
      h += '<div style="display:flex;gap:6px;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:10px">';
      h += '<span style="color:var(--t3);font-family:monospace;flex-shrink:0">' + _esc((log.tarih || '').slice(0, 10)) + '</span>';
      h += '<span style="color:var(--t);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(log.aksiyon || '') + '</span>';
      if (log.kim) h += '<span style="color:var(--t3)">' + _esc(log.kim) + '</span>';
      h += '</div>';
    });
    if (loglar.length > 10) h += '<div style="font-size:9px;color:var(--t3);padding:4px 0">... ve ' + (loglar.length - 10) + ' kayit daha</div>';
  } else {
    h += '<div style="font-size:10px;color:var(--t3);padding:8px 0">Henuz log yok</div>';
  }
  h += '</div>';
  h += '</div>'; /* sag bitti */

  h += '</div>'; /* 2 kolon grid bitti */
  c.innerHTML = h;
};

/** Musteri bilgileri duzenleme modali */
window._ihrMusteriDuzenle = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  var old = _g('mo-mus-edit'); if (old) old.remove();
  var fS = 'class="fi" style="font-size:11px;width:100%" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"';
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-mus-edit';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Musteri Bilgileri Duzenle</div>'
    + '<div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Firma Adi</div><input ' + fS + ' id="me-firma" value="' + _esc(d.musteriAd || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Yetkili</div><input ' + fS + ' id="me-yetkili" value="' + _esc(d.musteri_yetkili || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">E-posta</div><input ' + fS + ' id="me-mail" value="' + _esc(d.musteri_mail || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Telefon</div><input ' + fS + ' id="me-tel" value="' + _esc(d.musteri_tel || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Ulke</div><input ' + fS + ' id="me-ulke" value="' + _esc(d.musteri_ulke || '') + '"></div>'
    + '<div style="grid-column:1/-1"><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Adres</div><input ' + fS + ' id="me-adres" value="' + _esc(d.musteri_adres || '') + '"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-mus-edit\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrMusteriKaydet(\'' + dosyaId + '\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrMusteriKaydet = function(dosyaId) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  d.musteriAd = (_g('me-firma')?.value || '').trim();
  d.musteri_yetkili = (_g('me-yetkili')?.value || '').trim();
  d.musteri_mail = (_g('me-mail')?.value || '').trim();
  d.musteri_tel = (_g('me-tel')?.value || '').trim();
  d.musteri_ulke = (_g('me-ulke')?.value || '').trim();
  d.musteri_adres = (_g('me-adres')?.value || '').trim();
  d.updatedAt = _now();
  _storeD(dosyalar);
  _g('mo-mus-edit')?.remove();
  window.toast?.('Musteri bilgileri guncellendi', 'ok');
  window._ihrLog(dosyaId, 'Musteri bilgileri guncellendi', null, null);
  _ihrReRender();
};

/** Sigortaci bilgileri duzenleme modali */
window._ihrSigortaciDuzenle = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  var old = _g('mo-sig-edit'); if (old) old.remove();
  var fS = 'class="fi" style="font-size:11px;width:100%" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"';
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-sig-edit';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Sigortaci Bilgileri Duzenle</div>'
    + '<div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Firma</div><input ' + fS + ' id="se-firma" value="' + _esc(d.sigortaFirma || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Yetkili</div><input ' + fS + ' id="se-yetkili" value="' + _esc(d.sigorta_yetkili || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">E-posta</div><input ' + fS + ' id="se-mail" value="' + _esc(d.sigorta_mail || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Telefon</div><input ' + fS + ' id="se-tel" value="' + _esc(d.sigorta_tel || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Police No</div><input ' + fS + ' id="se-police" value="' + _esc(d.police_no || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Police Tarihi</div><input type="date" ' + fS + ' id="se-ptarihi" value="' + _esc(d.police_tarihi || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Bitis Tarihi</div><input type="date" ' + fS + ' id="se-pbitis" value="' + _esc(d.police_bitis || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Prim Tutari</div><input type="number" ' + fS + ' id="se-prim" value="' + _esc(d.sigorta_prim || '') + '"></div>'
    + '<div><div style="font-size:10px;color:var(--t3);margin-bottom:3px">Navlun Bedeli</div><input type="number" ' + fS + ' id="se-navlun" value="' + _esc(d.navlun_bedeli || '') + '"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-sig-edit\')?.remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrSigortaciKaydet(\'' + dosyaId + '\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrSigortaciKaydet = function(dosyaId) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  d.sigortaFirma = (_g('se-firma')?.value || '').trim();
  d.sigorta_yetkili = (_g('se-yetkili')?.value || '').trim();
  d.sigorta_mail = (_g('se-mail')?.value || '').trim();
  d.sigorta_tel = (_g('se-tel')?.value || '').trim();
  d.police_no = (_g('se-police')?.value || '').trim();
  d.police_tarihi = (_g('se-ptarihi')?.value || '').trim();
  d.police_bitis = (_g('se-pbitis')?.value || '').trim();
  d.sigorta_prim = parseFloat(_g('se-prim')?.value || 0) || null;
  d.navlun_bedeli = parseFloat(_g('se-navlun')?.value || 0) || null;
  d.updatedAt = _now();
  _storeD(dosyalar);
  _g('mo-sig-edit')?.remove();
  window.toast?.('Sigortaci bilgileri guncellendi', 'ok');
  window._ihrLog(dosyaId, 'Sigortaci bilgileri guncellendi', null, null);
  _ihrReRender();
};

/** Kambiyo odeme durumu toggle */
window._ihrKambiyoOde = function(dosyaId) {
  var dosyalar = _loadD();
  var d = dosyalar.find(function(x) { return String(x.id) === String(dosyaId); });
  if (!d) return;
  d.kambiyo_odenmis = !d.kambiyo_odenmis;
  d.updatedAt = _now();
  _storeD(dosyalar);
  window._ihrLog(dosyaId, d.kambiyo_odenmis ? 'Kambiyo odendi' : 'Kambiyo odeme geri alindi', null, null);
  window.toast?.(d.kambiyo_odenmis ? 'Kambiyo odendi' : 'Odeme geri alindi', 'ok');
  _ihrReRender();
};

/**
 * Sigortaci sekmesi render (Asama 3'te detaylandirilacak).
 * @param {Object} d Dosya objesi
 * @param {HTMLElement} c Container element
 */
window._ihrDetayRenderSigortaci = function(d, c) {
  if (!c) return;
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; });
  var malBedeli = 0;
  urunler.forEach(function(u) { malBedeli += (parseFloat(u.birim_fiyat) || 0) * (parseFloat(u.miktar) || 0); });
  var navlun = parseFloat(d.navlun_bedeli) || 0;
  var cifDeger = malBedeli + navlun;
  var sigortaDeger = cifDeger * 1.10;
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; });
  var sigEvrak = evraklar.find(function(e) { return e.tur === 'SIG'; });

  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px">';

  /* ── SOL: Firma + Police ── */
  h += '<div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:13px;font-weight:600">Sigortaci Bilgileri</div><button class="btn btns" onclick="event.stopPropagation();window._ihrSigortaciDuzenle?.(\'' + d.id + '\')" style="font-size:10px">Duzenle</button></div>';
  /* Firma karti */
  h += '<div style="background:var(--s2);border-radius:8px;padding:12px;margin-bottom:12px">';
  [['Firma', d.sigortaFirma], ['Yetkili', d.sigorta_yetkili], ['E-posta', d.sigorta_mail], ['Telefon', d.sigorta_tel]].forEach(function(r) {
    h += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span style="color:var(--t3)">' + r[0] + '</span><span style="font-weight:500;color:var(--t)">' + _esc(r[1] || '\u2014') + '</span></div>';
  });
  h += '</div>';
  /* Police bilgileri */
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">Police Bilgileri</div>';
  h += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:12px;margin-bottom:8px">';
  [['Police No', d.police_no], ['Police Tarihi', d.police_tarihi], ['Bitis Tarihi', d.police_bitis], ['Prim Tutari', d.sigorta_prim ? d.sigorta_prim + ' ' + (d.sigorta_prim_doviz || 'USD') : null], ['Para Birimi', d.sigorta_prim_doviz]].forEach(function(r) {
    h += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span style="color:var(--t3)">' + r[0] + '</span><span style="font-weight:500;color:var(--t)">' + _esc(r[1] || '\u2014') + '</span></div>';
  });
  h += '</div>';
  /* Police bitis uyarisi */
  if (d.police_bitis) {
    var pbGun = Math.ceil((new Date(d.police_bitis) - new Date()) / 86400000);
    if (pbGun < 0) h += '<div style="font-size:10px;color:#DC2626;padding:6px 10px;background:#FEF2F2;border-radius:6px;margin-bottom:8px;font-weight:500">\ud83d\udd34 Police suresi ' + Math.abs(pbGun) + ' gun once doldu!</div>';
    else if (pbGun < 15) h += '<div style="font-size:10px;color:#D97706;padding:6px 10px;background:#FAEEDA;border-radius:6px;margin-bottom:8px">\u26a0 Police suresi ' + pbGun + ' gun kaldi</div>';
  }
  /* Police dosya yukle */
  h += '<div style="display:flex;gap:6px;margin-top:8px">';
  if (sigEvrak && sigEvrak.dosya_url) {
    h += '<a href="' + _esc(sigEvrak.dosya_url) + '" target="_blank" class="btn btns" style="font-size:10px;text-decoration:none">Goruntule</a>';
  }
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSmartEvrakYukle?.(\'' + d.id + '\',\'SIG\')" style="font-size:10px;color:#185FA5">' + (sigEvrak ? '+ Yeni Versiyon' : 'Police Yukle') + '</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._ihrSigortaTeklif?.(\'' + d.id + '\')" style="font-size:10px">Teklif Iste</button>';
  h += '</div>';
  h += '</div>'; /* sol bitti */

  /* ── SAG: CIF hesaplama ── */
  h += '<div>';
  h += '<div style="font-size:13px;font-weight:600;margin-bottom:12px">Sigorta Degeri Hesaplama</div>';
  h += '<div style="background:var(--s2);border-radius:10px;padding:16px">';
  var _hesapS = 'display:flex;justify-content:space-between;font-size:11px;padding:4px 0';
  h += '<div style="' + _hesapS + '"><span>Mal Bedeli</span><span style="font-family:monospace;font-weight:500">' + malBedeli.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(d.doviz || 'USD') + '</span></div>';
  h += '<div style="' + _hesapS + '"><span style="color:var(--t3)">+ Navlun</span><span style="font-family:monospace">' + navlun.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</span></div>';
  h += '<div style="' + _hesapS + ';border-top:1px solid var(--b);padding-top:6px"><span style="font-weight:500">= CIF Deger</span><span style="font-family:monospace;font-weight:600">' + cifDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</span></div>';
  h += '<div style="' + _hesapS + '"><span style="color:var(--t3)">+ %10 Marj</span><span style="font-family:monospace">' + (cifDeger * 0.10).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</span></div>';
  h += '<div style="' + _hesapS + ';border-top:2px solid var(--ac);padding-top:8px;margin-top:4px"><span style="font-size:13px;font-weight:700;color:#185FA5">Sigorta Degeri</span><span style="font-size:14px;font-family:monospace;font-weight:700;color:#185FA5">' + sigortaDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + _esc(d.doviz || 'USD') + '</span></div>';
  h += '</div>';
  /* Bilgi notu */
  h += '<div style="margin-top:12px;padding:10px;background:#E6F1FB;border-radius:8px;font-size:10px;color:#0C447C">';
  h += '<div style="font-weight:600;margin-bottom:4px">Hesaplama Yontemi</div>';
  h += 'CIF = Mal Bedeli + Navlun<br>';
  h += 'Sigorta Degeri = CIF x 1.10 (%10 marj)<br>';
  h += '<span style="color:var(--t3)">Urun sayisi: ' + urunler.length + ' \u00b7 Toplam miktar: ' + urunler.reduce(function(s, u) { return s + (parseFloat(u.miktar) || 0); }, 0).toLocaleString('tr-TR') + '</span>';
  h += '</div>';
  /* Gonder butonu engeli */
  h += '<div style="margin-top:12px;padding:8px 10px;background:#FAEEDA;border-radius:8px;font-size:10px;color:#633806">';
  h += '\u26a0 Sigorta policesi "Gonder" butonu ile gonderilemez. Sadece goruntulenebilir ve yuklenebilir.';
  h += '</div>';
  h += '</div>'; /* sag bitti */

  h += '</div>'; /* 2 kolon grid bitti */
  c.innerHTML = h;
};

// ════════════════════════════════════════════════════════════════
// IHR-DASHBOARD-V2: 11 ozellikli profesyonel dashboard
// ════════════════════════════════════════════════════════════════

/** 3a — Son 6 ay FOB trend */
function _ihrFobTrend() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; });
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var aylar = [];
  for (var i = 5; i >= 0; i--) {
    var dt = new Date(); dt.setMonth(dt.getMonth() - i);
    var ym = dt.toISOString().slice(0, 7);
    var ayAd = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'][dt.getMonth()];
    var toplam = 0;
    dosyalar.forEach(function(d) {
      if ((d.bitis_tarihi || '').slice(0, 7) === ym || (d.createdAt || '').slice(0, 7) === ym) {
        if (d.fob_deger) { toplam += parseFloat(d.fob_deger) || 0; }
        else { urunler.filter(function(u) { return String(u.dosya_id) === String(d.id); }).forEach(function(u) { toplam += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }); }
      }
    });
    aylar.push({ ay: ayAd, toplam: toplam });
  }
  return aylar;
}

/** 3b — GCB yas takip */
function _ihrGcbYasTakip() {
  var gcbList = _loadG().filter(function(g) { return !g.isDeleted && g.tescil_tarihi; });
  var dosyalar = _loadD();
  var today = Date.now();
  return gcbList.map(function(g) {
    var gun = Math.ceil((today - new Date(g.tescil_tarihi).getTime()) / 86400000);
    var d = dosyalar.find(function(x) { return String(x.id) === String(g.dosya_id); });
    return { dosyaId: g.dosya_id, dosyaNo: d?.dosyaNo || '', musteriAd: d?.musteriAd || '', gun: gun, seviye: gun > 30 ? 'kritik' : gun > 15 ? 'uyari' : 'normal' };
  }).sort(function(a, b) { return b.gun - a.gun; });
}

/** 3c — Konteyner doluluk */
function _ihrKonteynerDoluluk() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); });
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var KT = { '40HC': { m3: 76, kg: 28000 }, '20DC': { m3: 33, kg: 28000 }, '40DC': { m3: 67, kg: 28000 } };
  return dosyalar.map(function(d) {
    var tip = (d.konteyner_tipi || '40HC').toUpperCase();
    var kap = KT[tip] || KT['40HC'];
    var topM3 = 0, topKG = 0;
    urunler.filter(function(u) { return String(u.dosya_id) === String(d.id); }).forEach(function(u) { topM3 += parseFloat(u.hacim_m3) || 0; topKG += parseFloat(u.brut_kg) || 0; });
    return { dosyaNo: d.dosyaNo, musteriAd: d.musteriAd, konteynerTip: tip, m3Pct: Math.round(topM3 / kap.m3 * 100), kgPct: Math.round(topKG / kap.kg * 100), asimVar: topM3 / kap.m3 > 1 || topKG / kap.kg > 1 };
  }).filter(function(x) { return x.m3Pct > 0 || x.kgPct > 0; });
}

/** 3d — Navlun karsilastirma */
function _ihrNavlunKarsilastirma() {
  return _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); }).map(function(d) {
    return { dosyaNo: d.dosyaNo, musteriAd: d.musteriAd, varis_limani: d.varis_limani || '', navlun: parseFloat(d.navlun_tutar) || 0 };
  }).filter(function(x) { return x.navlun > 0; }).sort(function(a, b) { return b.navlun - a.navlun; });
}

/** 3e — Musteri onay panosu */
function _ihrMusteriOnayPanosu() {
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var bekliyor = urunler.filter(function(u) { return u.musteri_onay === 'Bekliyor'; }).length;
  var incelemede = urunler.filter(function(u) { return u.musteri_onay === 'Incelemede'; }).length;
  var onaylandi = urunler.filter(function(u) { return u.musteri_onay === 'Onaylandi'; }).length;
  var gunler = [];
  urunler.filter(function(u) { return u.musteri_onay === 'Bekliyor' && u.updatedAt; }).forEach(function(u) { gunler.push(Math.ceil((Date.now() - new Date(u.updatedAt).getTime()) / 86400000)); });
  var ort = gunler.length > 0 ? Math.round(gunler.reduce(function(s, g) { return s + g; }, 0) / gunler.length) : 0;
  return { bekliyor: bekliyor, incelemede: incelemede, onaylandi: onaylandi, ortalamaGun: ort };
}

/** 3f — Evrak saglik */
function _ihrEvrakSaglik() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); });
  var evraklar = _loadE().filter(function(e) { return !e.isDeleted; });
  var toplamEksik = 0;
  var dosyaBazli = dosyalar.map(function(d) {
    var de = evraklar.filter(function(e) { return String(e.dosya_id) === String(d.id); });
    var tamam = de.filter(function(e) { return e.durum === 'gonderildi' || e.durum === 'tamamlandi'; }).length;
    var eksik = 11 - tamam; toplamEksik += eksik;
    return { dosyaNo: d.dosyaNo, musteriAd: d.musteriAd, pct: Math.round(tamam / 11 * 100), eksik: eksik };
  });
  var ortPct = dosyaBazli.length > 0 ? Math.round(dosyaBazli.reduce(function(s, d) { return s + d.pct; }, 0) / dosyaBazli.length) : 0;
  return { pct: ortPct, toplamEksik: toplamEksik, dosyaBazli: dosyaBazli };
}

/** 3g — KDV iade potansiyeli */
function _ihrKdvIadePotansiyeli() {
  var gcbList = _loadG().filter(function(g) { return !g.isDeleted; });
  var bekleyen = 0, incelemede = 0, sonIade = 0;
  gcbList.forEach(function(g) {
    var kdv = (parseFloat(g.fob_deger) || 0) * 0.18;
    if (g.durum === 'kapandi') sonIade += kdv; else if (g.durum === 'incelemede') incelemede += kdv; else bekleyen += kdv;
  });
  return { bekleyen: bekleyen, incelemede: incelemede, sonIade: sonIade };
}

/** 3h — Sigorta vadeleri */
function _ihrSigortaVadeleri() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && d.police_bitis; });
  var today = Date.now();
  return dosyalar.map(function(d) {
    var kalanGun = Math.ceil((new Date(d.police_bitis).getTime() - today) / 86400000);
    return { dosyaNo: d.dosyaNo, musteriAd: d.musteriAd, sigorta_firma: d.sigorta_firma || '', kalanGun: kalanGun, seviye: kalanGun < 14 ? 'kritik' : kalanGun < 30 ? 'uyari' : 'normal' };
  }).sort(function(a, b) { return a.kalanGun - b.kalanGun; });
}

/** 3i — Ulke dagilimi */
function _ihrUlkeDagilimi() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); });
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var ulkeMap = {};
  dosyalar.forEach(function(d) {
    var ulke = d.varis_ulke || d.varis_limani || 'Bilinmiyor';
    var fob = 0;
    urunler.filter(function(u) { return String(u.dosya_id) === String(d.id); }).forEach(function(u) { fob += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); });
    ulkeMap[ulke] = (ulkeMap[ulke] || 0) + fob;
  });
  var toplam = Object.values(ulkeMap).reduce(function(s, v) { return s + v; }, 0) || 1;
  return Object.entries(ulkeMap).map(function(e) { return { ulke: e[0], toplam: e[1], pct: Math.round(e[1] / toplam * 100) }; }).sort(function(a, b) { return b.toplam - a.toplam; });
}

/** 3j — FW & Gumrukcu performans */
function _ihrFwGmPerformans() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; });
  var evraklar = _loadE().filter(function(e) { return !e.isDeleted; });
  var today = new Date().toISOString().slice(0, 10);
  var _fp = function(fId, tip) {
    var fd = dosyalar.filter(function(d) { return tip === 'gumrukcu' ? String(d.gumrukcu_id) === String(fId) : String(d.forwarder_id) === String(fId); });
    if (!fd.length) return { puan: 0, ortGecikme: 0 };
    var geciken = fd.filter(function(d) { return d.bitis_tarihi && d.bitis_tarihi < today && !['kapandi','iptal'].includes(d.durum); }).length;
    var evPct = 0;
    fd.forEach(function(d) { var de = evraklar.filter(function(e) { return String(e.dosya_id) === String(d.id); }); evPct += de.length > 0 ? (de.filter(function(e) { return e.durum === 'gonderildi' || e.durum === 'tamamlandi'; }).length / 11 * 100) : 0; });
    evPct = fd.length > 0 ? Math.round(evPct / fd.length) : 0;
    return { puan: Math.min(5, Math.max(1, Math.round(evPct / 20) - geciken)), ortGecikme: geciken };
  };
  var sonuc = [];
  _loadGM().filter(function(g) { return !g.isDeleted; }).forEach(function(g) { var p = _fp(g.id, 'gumrukcu'); sonuc.push({ firmaAd: g.firma_adi || g.name || '?', tip: 'gumrukcu', puan: p.puan, ortGecikme: p.ortGecikme }); });
  _loadFW().filter(function(f) { return !f.isDeleted; }).forEach(function(f) { var p = _fp(f.id, 'forwarder'); sonuc.push({ firmaAd: f.firma_adi || f.name || '?', tip: 'forwarder', puan: p.puan, ortGecikme: p.ortGecikme }); });
  return sonuc.sort(function(a, b) { return b.puan - a.puan; });
}

/** IHR-HUB-001: Kritik alarm hesaplama */
function _ihrAlarmlar() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); });
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var gcbList = _loadG().filter(function(g) { return !g.isDeleted; });
  var today = new Date().toISOString().slice(0, 10);
  var now = Date.now();
  var KT = { '40HC': { m3: 76, kg: 28000 }, '20DC': { m3: 33, kg: 28000 }, '40DC': { m3: 67, kg: 28000 } };
  var alarms = [];
  dosyalar.forEach(function(d) {
    /* Gecikmiş dosya */
    if (d.bitis_tarihi && d.bitis_tarihi < today) {
      var gun = Math.ceil((now - new Date(d.bitis_tarihi).getTime()) / 86400000);
      alarms.push({ tip: 'gecikme', seviye: 'kritik', mesaj: (d.dosyaNo || '?') + ' gecikmi\u015f \u2014 ' + gun + ' g\u00fcn', dosyaId: d.id, dosyaNo: d.dosyaNo });
    }
    /* Konteyner asimi */
    var tip = (d.konteyner_tipi || '40HC').toUpperCase();
    var kap = KT[tip] || KT['40HC'];
    var topM3 = 0, topKG = 0;
    urunler.filter(function(u) { return String(u.dosya_id) === String(d.id); }).forEach(function(u) { topM3 += parseFloat(u.hacim_m3) || 0; topKG += parseFloat(u.brut_kg) || 0; });
    var maxPct = Math.max(Math.round(topM3 / kap.m3 * 100), Math.round(topKG / kap.kg * 100));
    if (maxPct > 100) alarms.push({ tip: 'konteyner', seviye: 'kritik', mesaj: (d.dosyaNo || '?') + ' konteyner %' + maxPct + ' a\u015f\u0131ld\u0131', dosyaId: d.id, dosyaNo: d.dosyaNo });
    /* Sigorta vadesi */
    if (d.police_bitis) {
      var sigGun = Math.ceil((new Date(d.police_bitis).getTime() - now) / 86400000);
      if (sigGun < 14) alarms.push({ tip: 'sigorta', seviye: 'kritik', mesaj: (d.dosyaNo || '?') + ' poli\u00e7esi ' + sigGun + ' g\u00fcnde bitiyor', dosyaId: d.id, dosyaNo: d.dosyaNo });
      else if (sigGun < 30) alarms.push({ tip: 'sigorta', seviye: 'uyari', mesaj: (d.dosyaNo || '?') + ' poli\u00e7esi ' + sigGun + ' g\u00fcnde bitiyor', dosyaId: d.id, dosyaNo: d.dosyaNo });
    }
  });
  /* GCB 30+ gun */
  gcbList.forEach(function(g) {
    if (!g.tescil_tarihi || g.durum === 'kapandi') return;
    var gun = Math.ceil((now - new Date(g.tescil_tarihi).getTime()) / 86400000);
    if (gun > 30) {
      var d = _loadD().find(function(x) { return String(x.id) === String(g.dosya_id); });
      alarms.push({ tip: 'gcb', seviye: 'uyari', mesaj: (d?.dosyaNo || 'G\u00c7B') + ' G\u00c7B ' + gun + ' g\u00fcn ge\u00e7ti', dosyaId: g.dosya_id, dosyaNo: d?.dosyaNo || '' });
    }
  });
  return alarms.sort(function(a, b) { return a.seviye === 'kritik' && b.seviye !== 'kritik' ? -1 : a.seviye !== 'kritik' && b.seviye === 'kritik' ? 1 : 0; });
}

/** Dashboard ana render */
/* IHR-DASH-001: Dashboard yardimci fonksiyonlari */
var _ihrGunlukGorevler = function(aktifD, evraklar, gcbList, blList) {
  var gorevler = []; var today = _today();
  aktifD.forEach(function(d) {
    var dE = evraklar.filter(function(e) { return String(e.dosya_id) === String(d.id); });
    var dG = gcbList.filter(function(g) { return String(g.dosya_id) === String(d.id); });
    var dB = blList.filter(function(b) { return String(b.dosya_id) === String(d.id); });
    var kG = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi) - new Date(today)) / 86400000) : null;
    if (!dG.length && !['taslak', 'kapandi', 'iptal'].includes(d.durum)) gorevler.push({ l: 'G\u00c7B tescil \u2014 ' + _esc(d.dosyaNo || ''), acillik: kG !== null && kG < 3 ? 'kritik' : 'uyari', dosyaId: d.id });
    if (!dB.length && !['taslak', 'kapandi', 'iptal'].includes(d.durum)) gorevler.push({ l: 'BL bekle \u2014 ' + _esc(d.dosyaNo || ''), acillik: kG !== null && kG < 5 ? 'kritik' : 'uyari', dosyaId: d.id });
    if (!dE.find(function(e) { return e.tur === 'CI' && (e.durum === 'onaylandi' || e.durum === 'gonderildi'); })) gorevler.push({ l: 'CI onay \u2014 ' + _esc(d.dosyaNo || ''), acillik: 'normal', dosyaId: d.id });
    if (!dE.find(function(e) { return e.tur === 'SIG'; })) gorevler.push({ l: 'Sigorta y\u00fckle \u2014 ' + _esc(d.dosyaNo || ''), acillik: 'normal', dosyaId: d.id });
    if (kG !== null && kG < 0) gorevler.push({ l: Math.abs(kG) + 'g gecikmi\u015f \u2014 ' + _esc(d.dosyaNo || ''), acillik: 'kritik', dosyaId: d.id });
  });
  gorevler.sort(function(a, b) { var s = { kritik: 0, uyari: 1, normal: 2 }; return (s[a.acillik] || 3) - (s[b.acillik] || 3); });
  return gorevler.slice(0, 8);
};

var _ihrKambiyoSayac = function(aktifD) {
  var bugun = new Date();
  return aktifD.filter(function(d) { return d.gib_tarihi || d.createdAt; }).map(function(d) {
    var bas = new Date(d.gib_tarihi || d.createdAt); var gecen = Math.floor((bugun - bas) / 86400000); var kalan = 90 - gecen;
    return { dosyaNo: d.dosyaNo || d.id, kalan: kalan, pct: Math.min(100, Math.round(gecen / 90 * 100)), acillik: kalan < 10 ? 'kritik' : kalan < 20 ? 'uyari' : 'normal', dosyaId: d.id };
  }).filter(function(x) { return x.kalan < 30; }).sort(function(a, b) { return a.kalan - b.kalan; });
};

var _ihrBekleyenOnaylar = function(aktifD, evraklar) {
  var onaylar = [];
  aktifD.forEach(function(d) {
    var dE = evraklar.filter(function(e) { return String(e.dosya_id) === String(d.id); });
    ['PI', 'CI', 'PL'].forEach(function(tur) {
      var e = dE.find(function(x) { return x.tur === tur; });
      if (e && e.durum === 'taslak') onaylar.push({ tur: tur, dosyaNo: d.dosyaNo || d.id, mesaj: tur + ' onay bekleniyor', dosyaId: d.id });
    });
  });
  return onaylar.slice(0, 5);
};

var _ihrGcbBlTakip = function(aktifD, gcbList, blList) {
  var eksikler = [];
  aktifD.forEach(function(d) {
    if (['taslak', 'kapandi', 'iptal'].includes(d.durum)) return;
    if (!gcbList.find(function(g) { return String(g.dosya_id) === String(d.id); })) eksikler.push({ tip: 'G\u00c7B', dosyaNo: d.dosyaNo || d.id, sorumlular: 'G\u00fcmr\u00fck\u00e7\u00fc', dosyaId: d.id });
    if (!blList.find(function(b) { return String(b.dosya_id) === String(d.id); })) eksikler.push({ tip: 'BL', dosyaNo: d.dosyaNo || d.id, sorumlular: 'Forwarder', dosyaId: d.id });
  });
  return eksikler.slice(0, 6);
};

window._ihrRenderDashboard = function(el) {
  if (!el) return;
  var _esc2 = typeof window.escapeHtml === 'function' ? window.escapeHtml : function(s) { return String(s || ''); };
  var _fmtK = function(n) { var a = Math.abs(n); return a >= 1000000 ? (a / 1000000).toFixed(1) + 'M' : a >= 1000 ? Math.round(a / 1000) + 'K' : Math.round(a).toString(); };

  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted; });
  var aktifD = dosyalar.filter(function(d) { return !['kapandi','iptal'].includes(d.durum); });
  var urunler = _loadU().filter(function(u) { return !u.isDeleted; });
  var today = new Date().toISOString().slice(0, 10);
  var geciken = aktifD.filter(function(d) { return d.bitis_tarihi && d.bitis_tarihi < today; });
  var evSaglik = _ihrEvrakSaglik();
  var kdv = _ihrKdvIadePotansiyeli();
  var gcbAcik = _loadG().filter(function(g) { return !g.isDeleted && g.durum !== 'kapandi'; });
  var evraklarAll = _loadE().filter(function(e) { return !e.isDeleted; });
  var gcbListAll = _loadG().filter(function(g) { return !g.isDeleted; });
  var blListAll = _loadBL().filter(function(b) { return !b.isDeleted; });
  var gorevler = _ihrGunlukGorevler(aktifD, evraklarAll, gcbListAll, blListAll);
  var kambiyo = _ihrKambiyoSayac(aktifD);
  var onaylar = _ihrBekleyenOnaylar(aktifD, evraklarAll);
  var gcbBlEksik = _ihrGcbBlTakip(aktifD, gcbListAll, blListAll);
  var acilGorev = gorevler.filter(function(g) { return g.acillik === 'kritik'; }).length;
  var usd = (window.LIVE_RATES?.USD || 44.55);
  var eur = (window.LIVE_RATES?.EUR || 51.70);
  var altin = (window.LIVE_RATES?.ALTIN || 4350);
  var thisMonth = new Date().toISOString().slice(0, 7);
  var buAyFob = 0;
  dosyalar.filter(function(d) { return (d.createdAt || '').slice(0, 7) === thisMonth || (d.bitis_tarihi || '').slice(0, 7) === thisMonth; }).forEach(function(d) {
    if (d.fob_deger) buAyFob += parseFloat(d.fob_deger) || 0;
    else urunler.filter(function(u) { return String(u.dosya_id) === String(d.id); }).forEach(function(u) { buAyFob += (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); });
  });
  var hedef = parseFloat(localStorage.getItem('ak_ihr_aylik_hedef') || '200000');
  var hedefPct = hedef > 0 ? Math.min(100, Math.round(buAyFob / hedef * 100)) : 0;
  var hedefRenk = hedefPct >= 70 ? '#16a34a' : hedefPct >= 40 ? '#d97706' : '#dc2626';

  var h = '';

  /* TOPBAR */
  h += '<div style="background:#0C2340;display:flex;align-items:center;height:38px;padding:0 14px;gap:8px;flex-shrink:0">';
  h += '<div style="width:22px;height:22px;border-radius:5px;background:#185FA5;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:600">IO</div>';
  h += '<span style="font-size:12px;font-weight:600;color:#fff">Dashboard</span>';
  h += '<div style="width:1px;height:16px;background:rgba(255,255,255,.12)"></div>';
  h += '<span style="font-size:10px;color:rgba(255,255,255,.5)">USD</span><span style="font-size:10px;font-weight:600;color:#4ade80;font-family:\'DM Mono\',monospace">\u20ba' + usd.toFixed(2) + '</span>';
  h += '<span style="font-size:10px;color:rgba(255,255,255,.5);margin-left:4px">EUR</span><span style="font-size:10px;font-weight:600;color:#4ade80;font-family:\'DM Mono\',monospace">\u20ba' + eur.toFixed(2) + '</span>';
  h += '<span style="font-size:10px;color:rgba(255,255,255,.5);margin-left:4px">Au</span><span style="font-size:10px;font-weight:600;color:#fbbf24;font-family:\'DM Mono\',monospace">\u20ba' + Math.round(altin).toLocaleString('tr-TR') + '</span>';
  h += '<div style="flex:1"></div>';
  h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:9px;color:rgba(255,255,255,.5)">Hedef</span><div style="width:60px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden"><div style="height:100%;width:' + hedefPct + '%;background:' + hedefRenk + ';border-radius:2px"></div></div><span style="font-size:9px;font-weight:600;color:' + hedefRenk + '">%' + hedefPct + '</span></div>';
  h += '<button onclick="event.stopPropagation();window._ihrAyarlarModal?.()" style="padding:2px 8px;border:0.5px solid rgba(255,255,255,.2);border-radius:4px;background:transparent;color:rgba(255,255,255,.6);font-size:9px;cursor:pointer;font-family:inherit">\u2699 Ayarlar</button>';
  h += '<button onclick="event.stopPropagation();window._ihrRunChecks?.()" style="padding:2px 8px;border:0.5px solid rgba(255,255,255,.2);border-radius:4px;background:transparent;color:rgba(255,255,255,.6);font-size:9px;cursor:pointer;font-family:inherit">Kontrol Et</button>';
  h += '<button onclick="event.stopPropagation();var _re=_g(\'ihr-content\');if(_re)window._ihrRenderDashboard(_re)" style="padding:2px 8px;border:0.5px solid rgba(255,255,255,.2);border-radius:4px;background:transparent;color:rgba(255,255,255,.6);font-size:9px;cursor:pointer;font-family:inherit">\u21bb Yenile</button>';
  if (geciken.length > 0) h += '<button onclick="event.stopPropagation();window._ihrRunChecks?.()" style="padding:2px 8px;border:0.5px solid rgba(220,38,38,.5);border-radius:4px;background:rgba(220,38,38,.2);color:#F87171;font-size:9px;cursor:pointer;font-family:inherit">\u26a0 Gecikmi\u015f (' + geciken.length + ')</button>';
  h += '<button onclick="event.stopPropagation();window._ihrExcelExport?.();window.toast?.(\'\u0130ndiriliyor...\',\'ok\')" style="padding:2px 8px;border:0.5px solid rgba(255,255,255,.2);border-radius:4px;background:transparent;color:rgba(255,255,255,.6);font-size:9px;cursor:pointer;font-family:inherit">\u2193 Rapor</button>';
  h += '<button onclick="event.stopPropagation();window._ihrYeniEmir()" style="padding:4px 10px;border:none;border-radius:5px;background:#185FA5;color:#fff;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:4px">+ Yeni Emir</button>';
  h += '</div>';

  /* ALARM BANDI */
  var alarmlar = _ihrAlarmlar();
  if (alarmlar.length > 0) {
    h += '<div style="padding:5px 14px;border-bottom:0.5px solid var(--b);background:var(--sf)">';
    alarmlar.slice(0, 5).forEach(function(a) {
      var bg = a.seviye === 'kritik' ? '#FEF2F2' : '#FFFBEB';
      var bc = a.seviye === 'kritik' ? '#DC2626' : '#D97706';
      var tc = a.seviye === 'kritik' ? '#991B1B' : '#92400E';
      h += '<div style="background:' + bg + ';border-left:3px solid ' + bc + ';border-radius:0 5px 5px 0;padding:4px 10px;margin-bottom:3px;display:flex;align-items:center;gap:8px">';
      h += '<span style="font-size:10px;color:' + tc + ';flex:1">' + (typeof window.escapeHtml === 'function' ? window.escapeHtml(a.mesaj) : a.mesaj) + '</span>';
      if (a.dosyaId) h += '<button onclick="event.stopPropagation();window._ihrAcDosya?.(\'' + a.dosyaId + '\')" style="font-size:8px;padding:2px 7px;border:0.5px solid ' + bc + ';border-radius:4px;background:transparent;color:' + bc + ';cursor:pointer;font-family:inherit;flex-shrink:0">A\u00e7</button>';
      h += '</div>';
    });
    if (alarmlar.length > 5) h += '<div style="font-size:9px;color:var(--t3);padding:2px 0">... ve ' + (alarmlar.length - 5) + ' alarm daha</div>';
    h += '</div>';
  }

  /* HUB KARTLARI */
  var evrakS = _ihrEvrakSaglik();
  h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);background:var(--sf)">';
  h += '<div style="font-size:9px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;color:var(--t3);margin-bottom:8px">Mod\u00fcller</div>';
  h += '<div style="display:flex;gap:8px">';
  /* Hub 1: Dashboard */
  h += '<div onclick="event.stopPropagation();window._ihrTab(\'dashboard\')" style="display:flex;flex-direction:column;flex:1;border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;cursor:pointer;background:var(--sf)">';
  h += '<div style="width:24px;height:24px;border-radius:6px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#185FA5;margin-bottom:6px">D</div>';
  h += '<div style="font-size:11px;font-weight:600;color:var(--t)">Dashboard</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Genel bak\u0131\u015f \u00b7 KPI</div>';
  h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500;margin-top:6px;align-self:flex-start">' + aktifD.length + ' aktif</span>';
  h += '<div style="font-size:9px;color:#185FA5;margin-top:6px">\u015eu an</div></div>';
  /* Hub 2: Emirler */
  h += '<div onclick="event.stopPropagation();window._ihrTab(\'emirler\')" style="display:flex;flex-direction:column;flex:1;border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;cursor:pointer;background:var(--sf)">';
  h += '<div style="width:24px;height:24px;border-radius:6px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#185FA5;margin-bottom:6px">E</div>';
  h += '<div style="font-size:11px;font-weight:600;color:var(--t)">\u0130hracat Emirleri</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Dosyalar \u00b7 G\u00c7B \u00b7 BL</div>';
  if (geciken.length > 0) h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#FEF2F2;color:#991B1B;font-weight:500;margin-top:6px;align-self:flex-start">' + geciken.length + ' kritik</span>';
  else h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:500;margin-top:6px;align-self:flex-start">G\u00fcncel</span>';
  h += '<div style="font-size:9px;color:#185FA5;margin-top:6px">A\u00e7 \u2192</div></div>';
  /* Hub 3: Belgeler */
  h += '<div onclick="event.stopPropagation();window._ihrBelgelerModal?.()" style="display:flex;flex-direction:column;flex:1;border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;cursor:pointer;background:var(--sf)">';
  h += '<div style="width:24px;height:24px;border-radius:6px;background:#FAEEDA;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#633806;margin-bottom:6px">B</div>';
  h += '<div style="font-size:11px;font-weight:600;color:var(--t)">Belgeler</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">G\u00c7B \u00b7 BL \u00b7 CI \u00b7 PL</div>';
  if (evrakS.toplamEksik > 0) h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#FEF2F2;color:#991B1B;font-weight:500;margin-top:6px;align-self:flex-start">' + evrakS.toplamEksik + ' eksik</span>';
  else h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:500;margin-top:6px;align-self:flex-start">Tamam</span>';
  h += '<div style="font-size:9px;color:#185FA5;margin-top:6px">A\u00e7 \u2192</div></div>';
  /* Hub 4: Roller */
  h += '<div onclick="event.stopPropagation();window._ihrAyarlarModal?.();setTimeout(function(){window._ihrAyarlarTab?.(\'roller\')},50)" style="display:flex;flex-direction:column;flex:1;border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;cursor:pointer;background:var(--sf)">';
  h += '<div style="width:24px;height:24px;border-radius:6px;background:#EAF3DE;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#27500A;margin-bottom:6px">R</div>';
  h += '<div style="font-size:11px;font-weight:600;color:var(--t)">Roller & Firmalar</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">G\u00fcmr\u00fck\u00e7\u00fc \u00b7 FW \u00b7 Sig.</div>';
  h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:500;margin-top:6px;align-self:flex-start">G\u00fcncel</span>';
  h += '<div style="font-size:9px;color:#185FA5;margin-top:6px">A\u00e7 \u2192</div></div>';
  /* Hub 5: Templateler */
  h += '<div onclick="event.stopPropagation();window._ihrAyarlarModal?.();setTimeout(function(){window._ihrAyarlarTab?.(\'templateler\')},50)" style="display:flex;flex-direction:column;flex:1;border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;cursor:pointer;background:var(--sf)">';
  h += '<div style="width:24px;height:24px;border-radius:6px;background:#EEEDFE;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#3C3489;margin-bottom:6px">T</div>';
  h += '<div style="font-size:11px;font-weight:600;color:var(--t)">Templateler</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">CI \u00b7 PL \u00b7 PI \u015fablonlar\u0131</div>';
  h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#EEEDFE;color:#3C3489;font-weight:500;margin-top:6px;align-self:flex-start">Haz\u0131r</span>';
  h += '<div style="font-size:9px;color:#185FA5;margin-top:6px">A\u00e7 \u2192</div></div>';
  h += '</div></div>';

  /* 6 KPI */
  h += '<div style="display:flex;gap:6px;padding:8px 12px;border-bottom:0.5px solid var(--b);background:var(--sf);flex-shrink:0;flex-wrap:wrap">';
  [{ l:'Aktif Dosya',v:aktifD.length,c:'#185FA5',fn:null },{ l:'Gecikmi\u015f',v:geciken.length,c:'#dc2626',fn:null },{ l:'Bu Ay FOB',v:'$'+_fmtK(buAyFob),c:'#16a34a',fn:null },{ l:'KDV \u0130ade',v:'\u20ba'+_fmtK(kdv.bekleyen),c:'#7C3AED',fn:null },{ l:'A\u00e7\u0131k G\u00c7B',v:gcbAcik.length,c:'#d97706',fn:null },{ l:'Evrak Eksik',v:evSaglik.toplamEksik,c:'#dc2626',fn:'window._ihrBelgelerModal?.()' }].forEach(function(k) {
    var click = k.fn ? 'onclick="event.stopPropagation();' + k.fn + '" style="cursor:pointer;' : 'style="';
    h += '<div ' + click + 'flex:1;min-width:80px;text-align:center;background:var(--s2);border-radius:6px;padding:6px 4px"><div style="font-size:16px;font-weight:700;color:' + k.c + ';font-family:\'DM Mono\',monospace">' + k.v + '</div><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.03em;margin-top:2px">' + k.l + '</div></div>';
  });
  h += '</div>';

  /* 3 KOLON */
  h += '<div style="display:flex;flex:1;overflow:hidden">';

  /* SOL (220px) — Dosya listesi + GCB Yas + Sigorta Vade */
  h += '<div style="width:220px;flex-shrink:0;border-right:0.5px solid var(--b);display:flex;flex-direction:column;overflow:hidden;background:var(--sf)">';
  h += '<div style="padding:6px 8px;border-bottom:0.5px solid var(--b);display:flex;gap:4px;flex-shrink:0"><input type="search" placeholder="Ara\u2026" oninput="event.stopPropagation();window._ihrDbAra?.(this.value)" style="flex:1;padding:4px 8px;border:0.5px solid var(--b);border-radius:4px;font-size:10px;background:var(--sf);color:var(--t);font-family:inherit;min-width:0"><select onchange="event.stopPropagation();window._ihrDbSirala?.(this.value)" style="padding:4px;border:0.5px solid var(--b);border-radius:4px;font-size:9px;background:var(--sf);color:var(--t2);font-family:inherit"><option value="risk">Risk</option><option value="tarih">Tarih</option><option value="fob">FOB</option></select></div>';
  h += '<div style="flex:1;overflow-y:auto">';
  var araQ = (window._ihrDbAraQ || '').toLowerCase();
  var sirala = window._ihrDbSiralaV || 'risk';
  var listeD = aktifD.filter(function(d) { return !araQ || (d.dosyaNo || '').toLowerCase().indexOf(araQ) !== -1 || (d.musteriAd || '').toLowerCase().indexOf(araQ) !== -1; });
  if (sirala === 'risk') listeD.sort(function(a, b) { return (_ihrRiskSkoru(b)?.skor || 0) - (_ihrRiskSkoru(a)?.skor || 0); });
  else if (sirala === 'tarih') listeD.sort(function(a, b) { return (b.bitis_tarihi || '').localeCompare(a.bitis_tarihi || ''); });
  else if (sirala === 'fob') listeD.sort(function(a, b) { return (parseFloat(b.fob_deger) || 0) - (parseFloat(a.fob_deger) || 0); });
  listeD.slice(0, 20).forEach(function(d) {
    var rs = _ihrRiskSkoru(d); var dotR = rs?.skor >= 70 ? '#dc2626' : rs?.skor >= 40 ? '#d97706' : rs?.skor >= 20 ? '#185FA5' : '#16a34a';
    var kalanG = d.bitis_tarihi ? Math.ceil((new Date(d.bitis_tarihi).getTime() - Date.now()) / 86400000) : null;
    h += '<div onclick="event.stopPropagation();window._ihrAcDosya?.(\'' + d.id + '\')" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:0.5px solid var(--b);cursor:pointer;font-size:10px"><div style="width:6px;height:6px;border-radius:50%;background:' + dotR + ';flex-shrink:0"></div><div style="flex:1;min-width:0;overflow:hidden"><div style="font-family:monospace;font-size:10px;color:var(--ac)">' + _esc2(d.dosyaNo || '') + '</div><div style="font-size:9px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(d.musteriAd || '') + '</div></div>';
    if (kalanG !== null) { var kR = kalanG < 0 ? '#dc2626' : kalanG < 7 ? '#d97706' : '#16a34a'; h += '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:' + kR + '22;color:' + kR + ';font-weight:500;flex-shrink:0">' + kalanG + 'g</span>'; }
    h += '</div>';
  });
  if (!listeD.length) h += '<div style="padding:16px;text-align:center;font-size:10px;color:var(--t3)">Dosya yok</div>';
  h += '</div>';
  var gcbYas = _ihrGcbYasTakip().slice(0, 3);
  h += '<div style="flex-shrink:0;padding:6px 8px;border-top:0.5px solid var(--b)"><div style="font-size:8px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">G\u00c7B Ya\u015f</div>';
  gcbYas.forEach(function(g) { var r = g.seviye === 'kritik' ? '#dc2626' : g.seviye === 'uyari' ? '#d97706' : 'var(--t2)'; h += '<div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0"><span style="color:var(--t2)">' + _esc2(g.dosyaNo) + '</span><span style="font-weight:600;color:' + r + '">' + g.gun + 'g</span></div>'; });
  if (!gcbYas.length) h += '<div style="font-size:9px;color:var(--t3)">Yok</div>';
  h += '</div>';
  var sigV = _ihrSigortaVadeleri().slice(0, 3);
  h += '<div style="flex-shrink:0;padding:6px 8px;border-top:0.5px solid var(--b)"><div style="font-size:8px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Sigorta Vade</div>';
  sigV.forEach(function(s) { var r = s.seviye === 'kritik' ? '#dc2626' : s.seviye === 'uyari' ? '#d97706' : '#16a34a'; h += '<div style="display:flex;justify-content:space-between;font-size:9px;padding:2px 0"><span style="color:var(--t2)">' + _esc2(s.dosyaNo) + '</span><span style="font-weight:600;color:' + r + '">' + s.kalanGun + 'g</span></div>'; });
  if (!sigV.length) h += '<div style="font-size:9px;color:var(--t3)">Yok</div>';
  h += '</div></div>';

  /* ORTA — Konteyner + Onay + Navlun + KDV + FW/GM */
  h += '<div style="flex:1;min-width:0;border-right:0.5px solid var(--b);display:flex;flex-direction:column;overflow-y:auto;background:var(--sf)">';
  var kontD = _ihrKonteynerDoluluk().slice(0, 4);
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Konteyner Doluluk</div>';
  kontD.forEach(function(k) { var mx = Math.max(k.m3Pct, k.kgPct); var r = mx > 95 ? '#dc2626' : mx > 80 ? '#d97706' : '#16a34a'; h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:9px"><span style="min-width:70px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(k.dosyaNo) + '</span><div style="flex:1;height:8px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, mx) + '%;background:' + r + ';border-radius:3px"></div></div><span style="font-weight:600;color:' + r + ';min-width:30px;text-align:right;font-family:\'DM Mono\',monospace">%' + mx + '</span>' + (k.asimVar ? '<span style="font-size:8px;color:#dc2626;font-weight:600">!</span>' : '') + '</div>'; });
  if (!kontD.length) h += '<div style="font-size:9px;color:var(--t3)">Veri yok</div>';
  h += '</div>';
  var onay = _ihrMusteriOnayPanosu();
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">M\u00fc\u015fteri Onay</div><div style="display:flex;gap:6px">';
  h += '<div style="flex:1;background:#FCEBEB;border-radius:5px;padding:5px;text-align:center"><div style="font-size:14px;font-weight:700;color:#dc2626">' + onay.bekliyor + '</div><div style="font-size:8px;color:#791F1F">Bekliyor</div></div>';
  h += '<div style="flex:1;background:#FFFBEB;border-radius:5px;padding:5px;text-align:center"><div style="font-size:14px;font-weight:700;color:#d97706">' + onay.incelemede + '</div><div style="font-size:8px;color:#92400E">\u0130ncelemede</div></div>';
  h += '<div style="flex:1;background:#EAF3DE;border-radius:5px;padding:5px;text-align:center"><div style="font-size:14px;font-weight:700;color:#16a34a">' + onay.onaylandi + '</div><div style="font-size:8px;color:#27500A">Onayl\u0131</div></div>';
  h += '</div>' + (onay.ortalamaGun > 0 ? '<div style="font-size:9px;color:var(--t3);margin-top:4px">Ort. bekleme: ' + onay.ortalamaGun + ' g\u00fcn</div>' : '') + '</div>';
  var navlun = _ihrNavlunKarsilastirma().slice(0, 4); var navMax = navlun.length > 0 ? navlun[0].navlun : 1;
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Navlun</div>';
  navlun.forEach(function(n) { var pct = Math.round(n.navlun / navMax * 100); h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:9px"><span style="min-width:70px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(n.dosyaNo) + '</span><div style="flex:1;height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#185FA5;border-radius:3px"></div></div><span style="font-family:\'DM Mono\',monospace;color:var(--t);min-width:45px;text-align:right">$' + _fmtK(n.navlun) + '</span></div>'; });
  if (!navlun.length) h += '<div style="font-size:9px;color:var(--t3)">Veri yok</div>';
  h += '</div>';
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">KDV \u0130ade</div><div style="display:flex;gap:6px"><div style="flex:1;background:#E6F1FB;border-radius:5px;padding:5px;text-align:center"><div style="font-size:12px;font-weight:700;color:#185FA5;font-family:\'DM Mono\',monospace">\u20ba' + _fmtK(kdv.bekleyen) + '</div><div style="font-size:8px;color:#0C447C">Bekleyen</div></div><div style="flex:1;background:#FFFBEB;border-radius:5px;padding:5px;text-align:center"><div style="font-size:12px;font-weight:700;color:#d97706;font-family:\'DM Mono\',monospace">\u20ba' + _fmtK(kdv.incelemede) + '</div><div style="font-size:8px;color:#92400E">\u0130ncelemede</div></div><div style="flex:1;background:#EAF3DE;border-radius:5px;padding:5px;text-align:center"><div style="font-size:12px;font-weight:700;color:#16a34a;font-family:\'DM Mono\',monospace">\u20ba' + _fmtK(kdv.sonIade) + '</div><div style="font-size:8px;color:#27500A">Tamamlanan</div></div></div></div>';
  var fwgm = _ihrFwGmPerformans().slice(0, 5);
  h += '<div style="padding:8px 12px"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">FW & G\u00dcM Performans</div>';
  fwgm.forEach(function(f) { h += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:9px"><span style="font-size:8px;padding:1px 4px;border-radius:3px;background:' + (f.tip === 'gumrukcu' ? '#E6F1FB' : '#FFFBEB') + ';color:' + (f.tip === 'gumrukcu' ? '#0C447C' : '#92400E') + '">' + (f.tip === 'gumrukcu' ? 'G\u00dcM' : 'FW') + '</span><span style="flex:1;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(f.firmaAd) + '</span>'; for (var pi = 0; pi < 5; pi++) h += '<span style="color:' + (pi < f.puan ? '#185FA5' : 'var(--s2)') + ';font-size:8px">\u25cf</span>'; h += '</div>'; });
  if (!fwgm.length) h += '<div style="font-size:9px;color:var(--t3)">Veri yok</div>';
  h += '</div></div>';

  /* SAG (240px) — Gorevler + Alarmlar + GCB/BL + Onaylar + Kambiyo + Hizli Islem */
  h += '<div style="width:240px;flex-shrink:0;display:flex;flex-direction:column;overflow-y:auto;background:var(--sf)">';

  /* 5A — Gunluk Gorev Listesi */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:9px;text-transform:uppercase;color:var(--t3);letter-spacing:.07em">Bug\u00fcn\u00fcn G\u00f6revleri</div>';
  if (acilGorev > 0) h += '<span style="font-size:8px;padding:1px 6px;border-radius:10px;background:#FCEBEB;color:#791F1F">' + acilGorev + ' acil</span>';
  h += '</div>';
  if (!gorevler.length) h += '<div style="font-size:10px;color:var(--t3);text-align:center;padding:8px">G\u00f6rev yok</div>';
  else gorevler.forEach(function(g) { var dC2 = g.acillik === 'kritik' ? '#DC2626' : g.acillik === 'uyari' ? '#D97706' : '#185FA5'; h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5px solid var(--b);font-size:10px;cursor:pointer" onclick="event.stopPropagation();window._ihrAcDosya?.(\'' + g.dosyaId + '\')"><span style="width:7px;height:7px;border-radius:50%;background:' + dC2 + ';flex-shrink:0"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t)">' + g.l + '</span></div>'; });
  h += '</div>';

  /* 5B — Alarm Merkezi */
  var _dashAlarm = [];
  aktifD.forEach(function(d2) {
    var kG3 = d2.bitis_tarihi ? Math.ceil((new Date(d2.bitis_tarihi) - new Date(today)) / 86400000) : null;
    if (kG3 !== null && kG3 < 0) _dashAlarm.push({ seviye: 'kritik', mesaj: _esc2(d2.dosyaNo || '') + ': ' + Math.abs(kG3) + 'g gecikmi\u015f', dosyaId: d2.id });
    if (kG3 !== null && kG3 >= 0 && kG3 < 7) _dashAlarm.push({ seviye: 'uyari', mesaj: _esc2(d2.dosyaNo || '') + ': ' + kG3 + 'g kald\u0131', dosyaId: d2.id });
  });
  if (_dashAlarm.length) {
    h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0"><div style="font-size:9px;text-transform:uppercase;color:var(--t3);letter-spacing:.07em;margin-bottom:5px">Alarm Merkezi</div>';
    _dashAlarm.slice(0, 3).forEach(function(a2) { var bg2 = a2.seviye === 'kritik' ? '#FCEBEB' : '#FAEEDA'; var tc2 = a2.seviye === 'kritik' ? '#991B1B' : '#92400E'; h += '<div style="background:' + bg2 + ';border-radius:4px;padding:4px 8px;margin-bottom:4px;font-size:10px;color:' + tc2 + ';cursor:pointer" onclick="event.stopPropagation();window._ihrAcDosya?.(\'' + a2.dosyaId + '\')">' + a2.mesaj + '</div>'; });
    h += '</div>';
  }

  /* 5C — GCB & BL Takip */
  if (gcbBlEksik.length) {
    h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><div style="font-size:9px;text-transform:uppercase;color:var(--t3);letter-spacing:.07em">G\u00c7B & BL Takip</div><span style="font-size:8px;padding:1px 6px;border-radius:10px;background:#FCEBEB;color:#791F1F">' + gcbBlEksik.length + '</span></div>';
    gcbBlEksik.slice(0, 4).forEach(function(e2) { h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px;border-bottom:0.5px solid var(--b)"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FCEBEB;color:#791F1F;font-weight:500">' + e2.tip + '</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(e2.dosyaNo) + '</span><span style="font-size:9px;color:var(--t3)">' + _esc2(e2.sorumlular) + '</span></div>'; });
    h += '</div>';
  }

  /* 5D — Bekleyen Onaylar */
  if (onaylar.length) {
    h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><div style="font-size:9px;text-transform:uppercase;color:var(--t3);letter-spacing:.07em">Bekleyen Onaylar</div><span style="font-size:8px;padding:1px 6px;border-radius:10px;background:#FAEEDA;color:#633806">' + onaylar.length + '</span></div>';
    onaylar.slice(0, 3).forEach(function(o2) { h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px;border-bottom:0.5px solid var(--b)"><span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FAEEDA;color:#633806;font-weight:500">' + o2.tur + '</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc2(o2.mesaj) + '</span></div>'; });
    h += '</div>';
  }

  /* 5E — Kambiyo Sayac */
  if (kambiyo.length) {
    h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0"><div style="font-size:9px;text-transform:uppercase;color:var(--t3);letter-spacing:.07em;margin-bottom:5px">Kambiyo 90 G\u00fcn</div>';
    kambiyo.slice(0, 3).forEach(function(k2) { var kR2 = k2.acillik === 'kritik' ? '#DC2626' : k2.acillik === 'uyari' ? '#D97706' : 'var(--t2)'; h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px;border-bottom:0.5px solid var(--b)"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t)">' + _esc2(k2.dosyaNo) + '</span><div style="width:50px;height:4px;background:var(--b);border-radius:2px"><div style="width:' + k2.pct + '%;height:4px;background:' + kR2 + ';border-radius:2px"></div></div><span style="font-size:9px;color:' + kR2 + ';min-width:28px">' + k2.kalan + 'g</span></div>'; });
    h += '</div>';
  }

  /* 5F — FOB Trend (kompakt) */
  var fobT = _ihrFobTrend(); var fobMax = Math.max.apply(null, fobT.map(function(f2) { return f2.toplam; }).concat([1]));
  h += '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">FOB Trend</div><div style="display:flex;align-items:flex-end;gap:3px;height:28px">';
  fobT.forEach(function(f2, i2) { var bH2 = fobMax > 0 ? Math.max(2, Math.round(f2.toplam / fobMax * 28)) : 2; h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px"><div style="width:100%;height:' + bH2 + 'px;background:' + (i2 === fobT.length - 1 ? '#185FA5' : '#B0C4DE') + ';border-radius:2px"></div><span style="font-size:6px;color:var(--t3)">' + f2.ay + '</span></div>'; });
  h += '</div></div>';

  /* 5G — Hizli Islemler (sadelestirilmis) */
  var _imS = 'width:100%;padding:5px;border-radius:5px;font-size:9px;cursor:pointer;font-family:inherit;';
  h += '<div style="flex:1;padding:8px 12px;display:flex;flex-direction:column;gap:3px"><div style="font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">H\u0131zl\u0131 \u0130\u015flemler</div>';
  h += '<button onclick="event.stopPropagation();window._ihrBelgePaneliAc?.(window._ihrAktifDosyaId||\'\')" style="' + _imS + 'background:#185FA5;color:#fff;border-color:#185FA5;font-weight:500;margin-bottom:4px">\ud83d\udcc4 Belge Y\u00f6netimi</button>';
  h += '<button onclick="event.stopPropagation();window.excelImportAc?.(\'\')" style="' + _imS + 'background:transparent;border:0.5px solid var(--b);color:var(--t2)">Import Docs</button>';
  h += '<button onclick="event.stopPropagation();window._ihrKdvIadeHesapla?.()" style="' + _imS + 'background:transparent;border:0.5px solid var(--b);color:var(--t2)">KDV \u0130ade Hesapla</button>';
  h += '<button onclick="event.stopPropagation();window._ihrAyarlarModal?.()" style="' + _imS + 'background:transparent;border:0.5px solid var(--b);color:var(--t2)">Rol & Firmalar</button>';
  h += '</div></div>';

  h += '</div>'; /* 3 kolon bitti */

  /* FOB vs Hedef bar */
  var fobHedef = parseFloat(localStorage.getItem('ak_ihr_fob_hedef') || '0') || 40000000;
  var fobHPct = fobHedef > 0 ? Math.min(100, Math.round(buAyFob / fobHedef * 100)) : 0;
  var fobHRnk = fobHPct >= 80 ? '#16A34A' : fobHPct >= 50 ? '#D97706' : '#DC2626';
  h += '<div style="padding:5px 14px;background:var(--sf);border-top:0.5px solid var(--b);display:flex;align-items:center;gap:10px">';
  h += '<span style="font-size:9px;color:var(--t3)">FOB Hedef</span>';
  h += '<div style="flex:1;height:6px;background:var(--s2);border-radius:3px"><div style="width:' + fobHPct + '%;height:6px;background:' + fobHRnk + ';border-radius:3px"></div></div>';
  h += '<span style="font-size:10px;font-weight:500;color:' + fobHRnk + '">%' + fobHPct + '</span>';
  h += '<span style="font-size:9px;color:var(--t3)">$' + _fmtK(buAyFob) + ' / $' + _fmtK(fobHedef) + '</span>';
  h += '</div>';

  el.innerHTML = h;
};

/* IHR-DASHBOARD-V2-FIX-001: cross-IIFE scope export */
window._ihrEvrakSaglik = _ihrEvrakSaglik;

/* IHR-SIMPLIFY-001: Ayarlar modal (Roller + Templateler) */
/* IHR-SIMPLIFY-002: Belgeler modal */
window._ihrBelgelerModal = function() {
  var existing = document.getElementById('mo-ihr-belgeler');
  if (existing) { existing.remove(); return; }
  var mo = document.createElement('div');
  mo.id = 'mo-ihr-belgeler';
  mo.className = 'mo';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:900px;padding:0;border-radius:14px;overflow:hidden;max-height:85vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      + '<div style="font-size:14px;font-weight:600;color:var(--t)">T\u00fcm Evraklar</div>'
      + '<button onclick="event.stopPropagation();document.getElementById(\'mo-ihr-belgeler\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">\u00d7</button>'
    + '</div>'
    + '<div id="ihr-belgeler-modal-content" style="flex:1;overflow-y:auto;min-height:300px"></div>'
    + '<div style="padding:10px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;flex-shrink:0">'
      + '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-ihr-belgeler\')?.remove()">Kapat</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() {
    mo.classList.add('open');
    var contentEl = document.getElementById('ihr-belgeler-modal-content');
    if (contentEl) _ihrRenderBelgeler(contentEl);
  }, 10);
};

/* IHR-PAYDAS-001: 4 paydas sekmesi tek ekranda */
/* ══════════════════════════════════════════════════════════════
   PAYDAS EKRANI — 2x2 GRID (PAYDAS-EKRAN-001)
   ══════════════════════════════════════════════════════════════ */
window._ihrRenderPaydas = function(el, dosyaId) {
  if (!el) return;
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId); }); if (!d) return;
  var gumrukculer = _loadGM().filter(function(g) { return !g.isDeleted; });
  var forwarderlar = _loadFW().filter(function(f) { return !f.isDeleted; });
  var gm = d.gumrukcu_id ? gumrukculer.find(function(g) { return String(g.id) === String(d.gumrukcu_id); }) : null;
  var fw = d.forwarder_id ? forwarderlar.find(function(f) { return String(f.id) === String(d.forwarder_id); }) : null;
  var musteriAd = d.musteriAd || '\u2014';
  var sigortaVar = !!(d.police_no);
  var fN = function(v) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(v || '\u2014') : (v || '\u2014'); };
  var _pr = function(l, v, renk) { return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:10px"><span style="color:var(--t3)">' + l + '</span><span style="font-weight:500;color:' + (renk || 'var(--t)') + ';text-align:right;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + v + '</span></div>'; };
  var _ch = function(ikon, rBg, rT, baslik, alt, pct) { var pH = pct === 100 ? '<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#EAF3DE;color:#27500A;font-weight:600">\u2713 Tam</span>' : pct > 0 ? '<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#FAEEDA;color:#854F0B;font-weight:600">%' + pct + '</span>' : '<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:#FCEBEB;color:#791F1F;font-weight:600">Atanmad\u0131</span>'; return '<div style="padding:8px 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;background:' + rBg + ';color:' + rT + '">' + ikon + '</div><div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">' + baslik + '</div><div style="font-size:9px;color:var(--t3)">' + alt + '</div></div>' + pH + '</div>'; };
  var _cbtn = function(btns) { return '<div style="padding:6px 14px;border-top:0.5px solid var(--b);display:flex;gap:5px;background:var(--sf)">' + btns.map(function(b) { var s = b.tip === 'p' ? 'border:0.5px solid var(--ac);color:var(--ac)' : 'border:0.5px solid var(--b);color:var(--t2)'; return '<button onclick="event.stopPropagation();' + (b.fn || '') + '" style="font-size:9px;padding:3px 9px;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;' + s + '">' + b.l + '</button>'; }).join('') + '</div>'; };

  var atananS = (musteriAd !== '\u2014' ? 1 : 0) + (gm ? 1 : 0) + (fw ? 1 : 0) + (sigortaVar ? 1 : 0);
  var h = '<div style="padding:9px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;background:var(--sf);flex-shrink:0"><div><div style="font-size:13px;font-weight:500;color:var(--t)">Payda\u015flar</div><div style="font-size:10px;color:var(--t2);margin-top:1px">' + fN(d.dosyaNo) + ' \u00b7 ' + fN(d.musteriAd) + '</div></div><span style="font-size:9px;padding:2px 8px;border-radius:8px;background:' + (atananS >= 3 ? '#EAF3DE;color:#27500A' : '#FAEEDA;color:#854F0B') + ';font-weight:500">' + atananS + '/4 atand\u0131</span></div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;flex:1;overflow-y:auto">';

  /* MUSTERI */
  h += '<div style="border-right:0.5px solid var(--b);border-bottom:0.5px solid var(--b);display:flex;flex-direction:column">';
  h += _ch('M\u00dc', '#E6F1FB', '#0C447C', 'M\u00fc\u015fteri', 'Al\u0131c\u0131 taraf', musteriAd !== '\u2014' ? 100 : 0);
  h += '<div style="padding:8px 14px;flex:1">' + _pr('Firma', fN(musteriAd)) + _pr('\u00dclke', fN(d.varis_ulkesi || d.varis_limani)) + _pr('E-posta', fN(d.musteriEmail), '#185FA5') + _pr('Telefon', fN(d.musteriTel)) + '</div>';
  h += (d.musteriEmail ? '<div style="padding:5px 14px;background:#EAF3DE;border-top:0.5px solid #C0DD97;font-size:9px;color:#27500A;display:flex;align-items:center;gap:5px"><div style="width:7px;height:7px;border-radius:50%;background:#16A34A"></div>BL bilgileri mevcut</div>' : '<div style="padding:5px 14px;background:#FAEEDA;border-top:0.5px solid #FAC775;font-size:9px;color:#854F0B;display:flex;align-items:center;gap:5px"><div style="width:7px;height:7px;border-radius:50%;background:#D97706"></div>\u0130leti\u015fim bilgileri eksik</div>');
  h += _cbtn([{l:'D\u00fczenle',fn:''},{l:'Mail G\u00f6nder',tip:'p',fn:''}]);
  h += '</div>';

  /* GUMRUKCU */
  var gmPct = gm ? Math.round([gm.firma_adi, gm.yetkili_adi, gm.eposta, gm.telefon].filter(Boolean).length / 4 * 100) : 0;
  h += '<div style="border-bottom:0.5px solid var(--b);display:flex;flex-direction:column">';
  h += _ch('G\u00dc', '#EAF3DE', '#27500A', 'G\u00fcmr\u00fck\u00e7\u00fc', 'G\u00fcmr\u00fck m\u00fc\u015favirli\u011fi', gmPct);
  h += '<div style="padding:8px 14px;flex:1">';
  if (gm) { h += _pr('Firma', fN(gm.firma_adi)) + _pr('Yetkili', fN(gm.yetkili_adi)) + _pr('E-posta', fN(gm.eposta), '#185FA5') + _pr('Telefon', fN(gm.telefon)); if (gm.vekalet_bitis) { var vGun = Math.ceil((new Date(gm.vekalet_bitis) - new Date()) / 86400000); h += _pr('Vekalet', gm.vekalet_bitis + (vGun <= 30 ? ' (' + vGun + 'g)' : ' \u2713'), vGun <= 7 ? '#DC2626' : vGun <= 30 ? '#D97706' : '#16A34A'); } }
  else h += '<div style="text-align:center;padding:20px;color:var(--t3);font-size:10px">G\u00fcmr\u00fck\u00e7\u00fc atanmad\u0131</div>';
  h += '</div>';
  h += _cbtn([{l:gm?'De\u011fi\u015ftir':'Ata',fn:'window._ihrGumrukcuAta(\''+dosyaId+'\')'},{l:'Mail',tip:'p',fn:'window._ihrGumrukcuMail?.(\''+dosyaId+'\')'},{l:'G\u00c7B Ekle',fn:'window._ihrGcbEkle?.(\''+dosyaId+'\')'}]);
  h += '</div>';

  /* FORWARDER */
  var fwPct = fw ? Math.round([fw.firma_adi, fw.yetkili_adi, fw.eposta, fw.telefon].filter(Boolean).length / 4 * 100) : 0;
  h += '<div style="border-right:0.5px solid var(--b);display:flex;flex-direction:column">';
  h += _ch('FW', '#FAEEDA', '#633806', 'Forwarder', 'Navlun & lojistik', fwPct);
  h += '<div style="padding:8px 14px;flex:1">';
  if (fw) { h += _pr('Firma', fN(fw.firma_adi)) + _pr('Yetkili', fN(fw.yetkili_adi)) + _pr('E-posta', fN(fw.eposta), '#185FA5') + _pr('Konteyner', fN(d.konteyner_tipi)) + _pr('Navlun', d.navlun ? d.navlun + ' ' + (d.doviz || 'USD') : 'Bekleniyor', d.navlun ? '#16A34A' : '#D97706'); }
  else h += '<div style="text-align:center;padding:20px;color:var(--t3);font-size:10px">Forwarder atanmad\u0131</div>';
  h += '</div>';
  h += _cbtn([{l:fw?'De\u011fi\u015ftir':'Ata',fn:'window._ihrForwarderAta?.(\''+dosyaId+'\')'},{l:'Mail',tip:'p',fn:'window._ihrForwarderMail?.(\''+dosyaId+'\')'},{l:'BL Ekle',fn:'window._ihrBlEkle?.(\''+dosyaId+'\')'},{l:'Teklif',fn:'window._ihrBelgeLinkOlustur?.(\''+dosyaId+'\',\'TTF\')'}]);
  h += '</div>';

  /* SIGORTACI */
  h += '<div style="display:flex;flex-direction:column">';
  h += _ch('SG', '#EEEDFE', '#3C3489', 'Sigortac\u0131', 'Kargo sigortas\u0131', sigortaVar ? 100 : 0);
  if (sigortaVar) {
    h += '<div style="padding:8px 14px;flex:1">' + _pr('Poli\u00e7e No', fN(d.police_no)) + _pr('Sigorta Bedeli', d.sigorta_bedel ? d.sigorta_bedel + ' ' + (d.doviz || 'USD') : '\u2014') + _pr('Ba\u015flang\u0131\u00e7', fN(d.sigorta_baslangic)) + _pr('Biti\u015f', fN(d.sigorta_bitis)) + '</div>';
    h += '<div style="padding:5px 14px;background:#EAF3DE;border-top:0.5px solid #C0DD97;font-size:9px;color:#27500A;display:flex;align-items:center;gap:5px"><div style="width:7px;height:7px;border-radius:50%;background:#16A34A"></div>Poli\u00e7e aktif</div>';
    h += _cbtn([{l:'D\u00fczenle',fn:''},{l:'G\u00f6r\u00fcnt\u00fcle',tip:'p',fn:''}]);
  } else {
    var teslim = (d.teslim_sekli || '').toUpperCase();
    var sigNot = ['CIF', 'CIP'].indexOf(teslim) !== -1 ? teslim + ' teslimde sigorta zorunludur' : 'CFR/FOB teslimde opsiyonel';
    h += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:20px;text-align:center"><div style="font-size:24px;opacity:.25;margin-bottom:8px">\ud83d\udee1</div><div style="font-size:10px;color:var(--t3);margin-bottom:4px">Hen\u00fcz sigortac\u0131 atanmad\u0131</div><div style="font-size:9px;color:var(--t3);margin-bottom:12px">' + sigNot + '</div><div style="display:flex;gap:6px"><button onclick="event.stopPropagation()" style="font-size:10px;padding:4px 12px;border-radius:5px;border:0.5px solid var(--ac);color:var(--ac);background:transparent;cursor:pointer;font-family:inherit">Sigortac\u0131 Ata</button><button onclick="event.stopPropagation();window._ihrBelgeLinkOlustur?.(\'' + dosyaId + '\',\'SIG\')" style="font-size:10px;padding:4px 12px;border-radius:5px;border:0.5px solid var(--b);color:var(--t2);background:transparent;cursor:pointer;font-family:inherit">Teklif Linki</button></div></div>';
  }
  h += '</div>';

  h += '</div>'; /* grid */
  el.innerHTML = h;
};

window._ihrAyarlarModal = function() {
  var existing = document.getElementById('mo-ihr-ayarlar');
  if (existing) { existing.remove(); return; }
  var mo = document.createElement('div');
  mo.id = 'mo-ihr-ayarlar';
  mo.className = 'mo';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  mo.innerHTML = '<div class="moc" style="max-width:800px;padding:0;border-radius:14px;overflow:hidden;max-height:85vh;display:flex;flex-direction:column">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
      + '<div style="font-size:14px;font-weight:600;color:var(--t)">\u0130hracat Ayarlar\u0131</div>'
      + '<button onclick="event.stopPropagation();document.getElementById(\'mo-ihr-ayarlar\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">\u00d7</button>'
    + '</div>'
    + '<div style="display:flex;border-bottom:0.5px solid var(--b);padding:0 20px;flex-shrink:0">'
      + '<div class="ihr-ayarlar-tab" data-tab="roller" onclick="event.stopPropagation();window._ihrAyarlarTab(\'roller\')" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);font-weight:500">Roller & Firmalar</div>'
      + '<div class="ihr-ayarlar-tab" data-tab="templateler" onclick="event.stopPropagation();window._ihrAyarlarTab(\'templateler\')" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2)">Templateler</div>'
    + '</div>'
    + '<div id="ihr-ayarlar-content" style="flex:1;overflow-y:auto;min-height:300px"></div>'
    + '<div style="padding:12px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;flex-shrink:0">'
      + '<button class="btn btns" onclick="event.stopPropagation();document.getElementById(\'mo-ihr-ayarlar\')?.remove()">Kapat</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); window._ihrAyarlarTab('roller'); }, 10);
};

window._ihrAyarlarTab = function(tab) {
  var el = document.getElementById('ihr-ayarlar-content');
  if (!el) return;
  document.querySelectorAll('.ihr-ayarlar-tab').forEach(function(t) {
    var aktif = t.dataset.tab === tab;
    t.style.borderBottom = aktif ? '2px solid var(--ac)' : '2px solid transparent';
    t.style.color = aktif ? 'var(--ac)' : 'var(--t2)';
    t.style.fontWeight = aktif ? '500' : '400';
  });
  if (tab === 'roller') { _ihrRenderRoller(el); }
  else if (tab === 'templateler') { _ihrRenderTemplates(el); }
};

/* Dashboard arama & siralama */
window._ihrDbAra = function(q) { window._ihrDbAraQ = (q || '').trim().toLowerCase(); var el = _g('ihr-content'); if (el && _aktifTab === 'dashboard') window._ihrRenderDashboard(el); };
window._ihrDbSirala = function(v) { window._ihrDbSiralaV = v; var el = _g('ihr-content'); if (el && _aktifTab === 'dashboard') window._ihrRenderDashboard(el); };

/* Toplu evrak yardimcilar */
window._ihrTopluSecili = [];
window._ihrTopluCikar = function(id) { window._ihrTopluSecili = (window._ihrTopluSecili || []).filter(function(x) { return String(x) !== String(id); }); var el = _g('ihr-content'); if (el && _aktifTab === 'dashboard') window._ihrRenderDashboard(el); };
window._ihrTopluSecDialog = function() {
  var dosyalar = _loadD().filter(function(d) { return !d.isDeleted && !['kapandi','iptal'].includes(d.durum); });
  var h2 = dosyalar.map(function(d) { return '<div onclick="event.stopPropagation();window._ihrTopluSecili.push(\'' + d.id + '\');document.getElementById(\'mo-toplu-sec\')?.remove();var _el=document.getElementById(\'ihr-content\');if(_el)window._ihrRenderDashboard(_el)" style="padding:8px 14px;border-bottom:0.5px solid var(--b);cursor:pointer;font-size:12px">' + (typeof window.escapeHtml === 'function' ? window.escapeHtml(d.dosyaNo + ' \u2014 ' + (d.musteriAd || '')) : d.dosyaNo) + '</div>'; }).join('');
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-toplu-sec';
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:12px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600;display:flex;justify-content:space-between"><span>Dosya Se\u00e7</span><button onclick="document.getElementById(\'mo-toplu-sec\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div><div style="max-height:50vh;overflow-y:auto">' + (h2 || '<div style="padding:20px;text-align:center;color:var(--t3)">Dosya yok</div>') + '</div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
};
window._ihrTopluEvrakUret = function(tur) {
  var secili = window._ihrTopluSecili || [];
  if (!secili.length) { window.toast?.('\u00d6nce dosya se\u00e7in', 'err'); return; }
  secili.forEach(function(id) { window._ihrPdfOnizle?.(id, tur, null); });
  window.toast?.(secili.length + ' dosya i\u00e7in ' + tur + ' \u00fcretiliyor', 'ok');
};

/* ══════════════════════════════════════════════════════════════
   SARTLI KURAL SISTEMI (IHR-BELGE-FIX-001)
   ══════════════════════════════════════════════════════════════ */
var _SARTLI_KEY = 'ak_ihr_sartli_v1';
function _loadSartli() { try { return JSON.parse(localStorage.getItem(_SARTLI_KEY) || '[]'); } catch(e) { return []; } }
function _storeSartli(d) { try { localStorage.setItem(_SARTLI_KEY, JSON.stringify(d)); } catch(e) {} }

window._ihrSartliKuralCalistir = function(dosyaId, tetikleyiciTip, context) {
  var kurallar = _loadSartli().filter(function(k) { return k.aktif; });
  if (!kurallar.length) return;
  context = context || {};
  kurallar.forEach(function(kural) {
    if (kural.tetikleyici.tip !== tetikleyiciTip) return;
    var eslesme = false;
    if (tetikleyiciTip === 'evrak_olusunca') eslesme = context.evrak_tur === kural.tetikleyici.evrak_tur;
    else if (tetikleyiciTip === 'alan_dolunca') eslesme = context.alan === kural.tetikleyici.alan;
    else if (tetikleyiciTip === 'durum_degisince') eslesme = context.durum === kural.tetikleyici.durum;
    if (!eslesme) return;
    var gecikme = parseInt(kural.aksiyon.gecikme_sn) || 0;
    setTimeout(function() {
      if (kural.aksiyon.tip === 'belge_uret') {
        window._ihrBelgeUretDogrudan(dosyaId, kural.aksiyon.belge_tur, kural.aksiyon.lang || 'en');
      }
      window.toast?.('\ud83e\udd16 \u015eartl\u0131 kural: ' + (kural.ad || 'Kural') + ' \u00e7al\u0131\u015ft\u0131', 'ok');
      window.logActivity?.('ihr_sartli_kural', 'Kural \u00e7al\u0131\u015ft\u0131: ' + (kural.ad || 'Kural'));
    }, gecikme * 1000);
  });
};

/** Evrak seti uret — tek tikla coklu belge */
window._ihrEvrakSetiUret = function(setKey) {
  var SETLER = {
    musteri: { label:'\ud83d\udce6 M\u00fc\u015fteri Seti', turler:['PI','CI','PL'] },
    gumrukcu: { label:'\ud83c\udfdb G\u00fcmr\u00fck\u00e7\u00fc Seti', turler:['CI','PL'] },
    forwarder: { label:'\ud83d\udea2 Forwarder Seti', turler:['CI','PL'] },
    sigortaci: { label:'\ud83d\udee1 Sigortac\u0131 Seti', turler:['CI','PL'] }
  };
  var set = SETLER[setKey]; if (!set) return;
  var dosyaId = _aktifDosyaId;
  if (!dosyaId) { window.toast?.('\u00d6nce bir dosya a\u00e7\u0131n', 'warn'); return; }
  var btnKey = 'seti_' + setKey + '_' + dosyaId;
  if (window[btnKey]) return;
  window[btnKey] = true;
  window.toast?.(set.label + ' \u00fcretiliyor \u2014 ' + set.turler.join(', '), 'ok');
  var idx = 0;
  var uretSiradaki = function() {
    if (idx >= set.turler.length) { window[btnKey] = false; window.toast?.(set.label + ' tamamland\u0131 (' + set.turler.length + ' belge)', 'ok'); return; }
    var tur = set.turler[idx++];
    setTimeout(function() { window._ihrBelgeUretDogrudan?.(dosyaId, tur, 'en'); uretSiradaki(); }, 800 * (idx - 1));
  };
  uretSiradaki();
};

/* ══════════════════════════════════════════════════════════════
   MERKEZ\u0130 BELGE Y\u00d6NET\u0130M PANEL\u0130 (BELGE-MERKEZ-001)
   ══════════════════════════════════════════════════════════════ */
window._bmAktifDil = 'en';
window._bmAktifYon = 'portrait';

window._bmAktifDep = 'ihracat';

window._NEDEN_MAP = {
  FI:'Navlun tutar\u0131 girilmemi\u015f \u2192 Dosya D\u00fczenle \u2192 Navlun alan\u0131n\u0131 doldurun',
  NTF:'Forwarder atanmam\u0131\u015f \u2192 Payda\u015flar sekmesi \u2192 Forwarder ekle',
  NFO:'\u00d6nce NTF (Navlun Teklif Talep) olu\u015fturulmal\u0131',
  SIG:'Sigortac\u0131 atanmam\u0131\u015f \u2192 Payda\u015flar sekmesi \u2192 Sigortac\u0131 ekle',
  GCI:'Baz\u0131 \u00fcr\u00fcnlerde HS kodu eksik \u2192 \u00dcr\u00fcnler sekmesi \u2192 HS Kodu ekle',
  BL:'G\u00c7B tescil edilmeden BL \u00fcretilemez \u2192 G\u00c7B Ekle butonunu kullan\u0131n',
  MTET:'Forwarder atanmam\u0131\u015f \u2192 Payda\u015flar sekmesi',
  HOS:'Tahsilat kayd\u0131 bulunamad\u0131 \u2192 Muhasebe sekmesinden ekleyin'
};

function _bmHataKontrol(tur, d, urunler, fw) {
  if (tur === 'FI' && !parseFloat(d.navlun || 0)) return window._NEDEN_MAP.FI;
  if (tur === 'NTF' && !fw) return window._NEDEN_MAP.NTF;
  if (tur === 'NFO' && !fw) return window._NEDEN_MAP.NTF;
  if (tur === 'SIG' && !d.sigortaci_id) return window._NEDEN_MAP.SIG;
  if (tur === 'GCI' && urunler.some(function(u) { return !u.hs_kodu; })) return window._NEDEN_MAP.GCI;
  if (tur === 'MTET' && !fw) return window._NEDEN_MAP.MTET;
  return null;
}

window._bmNeden = function(tur) {
  var elId = 'bm-neden-' + tur;
  var existing = document.getElementById(elId);
  if (existing) { existing.remove(); return; }
  var neden = window._NEDEN_MAP?.[tur] || 'Bu belge i\u00e7in ek bilgi gerekli';
  var row = document.querySelector('[data-bm-tur="' + tur + '"]');
  if (!row) return;
  var div = document.createElement('div'); div.id = elId;
  div.setAttribute('style', 'padding:5px 14px 6px;background:#FEF2F2;border-top:0.5px solid #FECACA;font-size:9px;color:#991B1B;line-height:1.5');
  div.textContent = neden;
  row.insertAdjacentElement('afterend', div);
};

window._ihrBelgePaneliAc = function(dosyaId) {
  dosyaId = dosyaId || window._ihrAktifDosyaId || '';
  var tumDosyalar = _loadD().filter(function(x) { return !x.isDeleted; });
  var d = dosyaId ? tumDosyalar.find(function(x) { return String(x.id) === String(dosyaId); }) : tumDosyalar[0] || null;
  if (d) dosyaId = d.id;
  var evraklar = d ? _loadE().filter(function(e) { return String(e.dosya_id) === String(d.id) && !e.isDeleted; }) : [];
  var urunler = d ? _loadU().filter(function(u) { return String(u.dosya_id) === String(d.id) && !u.isDeleted; }) : [];
  var gumrukculer = _loadGM(); var gm2 = null; if (d) gumrukculer.forEach(function(g) { if (String(g.id) === String(d.gumrukcu_id)) gm2 = g; });
  var forwarderlar = _loadFW(); var fw2 = null; if (d) forwarderlar.forEach(function(f) { if (String(f.id) === String(d.forwarder_id)) fw2 = f; });

  var old = document.getElementById('mo-belge-merkez'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-belge-merkez';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var tamam = evraklar.length;
  var TUR_AD = { PI:'Proforma Invoice', CI:'Commercial Invoice', PL:'Packing List', FI:'Freight Invoice', SI:'Sample Invoice', GCI:'Customs Invoice', KT:'Kon\u015fimento Talimat\u0131', SE:'Shipping Order', ST:'Shipping Instruction', NTF:'Freight Quote Request', NFO:'Freight Price Approval', SIG:'Sigorta Talep', PO:'Purchase Order', MTF:'Mal Teslim Formu', MTET:'Mal Teslim Etme', IRK:'\u0130rsaliye', QC:'Kalite Kontrol', KYT:'Y\u00fckleme Tutana\u011f\u0131', HOS:'Account Statement', TD:'Tahsilat Dekontu', OD:'\u00d6deme Dekontu', KAPAK:'Export File Cover', PARASUT:'Para\u015f\u00fct Excel' };
  var GRUPLAR = [
    { ad:'DI\u015e TARAF (M\u00dc\u015eTER\u0130)', dep:'ihracat', turler:[{k:'PI',l:'en'},{k:'CI',l:'en'},{k:'PL',l:'en'},{k:'FI',l:'en'},{k:'SI',l:'en'},{k:'GCI',l:'en'}] },
    { ad:'LOJ\u0130ST\u0130K / G\u00dcMR\u00dcK', dep:'ihracat', turler:[{k:'KT',l:'tr'},{k:'SE',l:'en'},{k:'ST',l:'en'},{k:'NTF',l:'en'},{k:'NFO',l:'tr'},{k:'SIG',l:'tr'}] },
    { ad:'TEDAR\u0130K / \u0130\u00c7', dep:'ihracat', turler:[{k:'PO',l:'tr'},{k:'MTF',l:'tr'},{k:'MTET',l:'tr'},{k:'IRK',l:'tr'},{k:'QC',l:'tr'},{k:'KYT',l:'tr'}] },
    { ad:'RAPORLAMA', dep:'ihracat', turler:[{k:'HOS',l:'en'},{k:'TD',l:'tr'},{k:'OD',l:'tr'},{k:'KAPAK',l:'en'},{k:'PARASUT',l:'tr'}] },
    { ad:'KDV \u0130ADE', dep:'kdv', turler:[{k:'KDV',l:'tr'},{k:'KDV-R',l:'tr'}] },
    { ad:'SATI\u015e', dep:'satis', turler:[{k:'TEK',l:'tr'},{k:'SIP',l:'tr'}] },
    { ad:'MUHASEBE', dep:'muhasebe', turler:[{k:'MUH-TD',l:'tr'},{k:'MUH-OD',l:'tr'},{k:'MUH-HS',l:'en'}] },
    { ad:'DOCX \u015eABLONLAR', dep:'diger', turler:[{k:'DOCX-PL',l:'en'},{k:'DOCX-CI',l:'en'},{k:'DOCX-FRQ',l:'tr'},{k:'DOCX-IRQ',l:'tr'}] }
  ];
  TUR_AD['KDV'] = 'KDV \u0130ade Hesaplama'; TUR_AD['KDV-R'] = 'KDV \u0130ade Raporu';
  TUR_AD['TEK'] = 'Sat\u0131\u015f Teklifi'; TUR_AD['SIP'] = 'Sat\u0131\u015f Sipari\u015fi';
  TUR_AD['MUH-TD'] = 'Tahsilat Dekontu'; TUR_AD['MUH-OD'] = '\u00d6deme Dekontu'; TUR_AD['MUH-HS'] = 'Hesap \u00d6zeti';
  TUR_AD['DOCX-PL'] = 'PL \u015eablon'; TUR_AD['DOCX-CI'] = 'CI \u015eablon'; TUR_AD['DOCX-FRQ'] = 'Forwarder Teklif'; TUR_AD['DOCX-IRQ'] = 'Sigorta Teklif';
  var DOCX = [];
  var _belge_setleri = {
    musteri:{l:'\ud83d\udce6 M\u00fc\u015fteri',turler:['PI','CI','PL']},
    gumrukcu:{l:'\ud83c\udfdb G\u00fcmr\u00fck\u00e7\u00fc',turler:['CI','PL']},
    forwarder:{l:'\ud83d\udea2 Forwarder',turler:['CI','PL','SE']},
    sigortaci:{l:'\ud83d\udee1 Sigortac\u0131',turler:['CI','PL']}
  };
  var _esc2 = function(s) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var dilSec = window._bmAktifDil || 'en';
  var yonSec = window._bmAktifYon || 'portrait';

  var h = '<div class="moc" style="max-width:820px;padding:0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;max-height:90vh">';

  /* HEADER — dosya select */
  h += '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:8px;flex-shrink:0">';
  h += '<div style="font-size:13px;font-weight:500">Belge Y\u00f6netimi</div>';
  if (tumDosyalar.length > 1) {
    h += '<select id="bm-dosya-sec" onchange="event.stopPropagation();window._ihrBelgePaneliAc(this.value)" onclick="event.stopPropagation()" style="font-size:10px;padding:3px 8px;border-radius:5px;border:0.5px solid var(--b);max-width:200px;cursor:pointer;font-family:inherit">';
    tumDosyalar.forEach(function(dd) { h += '<option value="' + dd.id + '"' + (String(dd.id) === String(dosyaId) ? ' selected' : '') + '>' + _esc2(dd.dosyaNo || '') + ' \u2014 ' + _esc2((dd.musteriAd || '').slice(0, 18)) + '</option>'; });
    h += '</select>';
  } else if (d) {
    h += '<span style="font-size:10px;color:var(--t3)">' + _esc2(d.dosyaNo || '') + ' \u00b7 ' + _esc2(d.musteriAd || '') + '</span>';
  }
  h += '<span style="margin-left:auto;font-size:10px;color:var(--t3)">' + tamam + '/' + 13 + ' mevcut</span>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'mo-belge-merkez\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button>';
  h += '</div>';

  /* DEPARTMAN BUTONLARI */
  var _depSec = window._bmAktifDep || 'ihracat';
  var _depBtnS = 'font-size:9px;padding:3px 10px;border-radius:4px;cursor:pointer;font-family:inherit;';
  h += '<div style="padding:8px 18px;border-bottom:0.5px solid var(--b);display:flex;gap:4px;flex-shrink:0">';
  [{k:'ihracat',l:'\u0130hracat'},{k:'kdv',l:'KDV \u0130ade'},{k:'satis',l:'Sat\u0131\u015f'},{k:'muhasebe',l:'Muhasebe'},{k:'diger',l:'Di\u011fer'}].forEach(function(dp) {
    var on = _depSec === dp.k;
    h += '<button onclick="event.stopPropagation();window._bmAktifDep=\'' + dp.k + '\';window._ihrBelgePaneliAc(\'' + dosyaId + '\')" style="' + _depBtnS + 'border:0.5px solid ' + (on ? '#185FA5' : 'var(--b)') + ';background:' + (on ? '#185FA5' : 'transparent') + ';color:' + (on ? '#fff' : 'var(--t2)') + '">' + dp.l + '</button>';
  });
  h += '</div>';

  /* ARAC CUBUGU */
  h += '<div style="padding:10px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex-shrink:0">';
  /* Set butonlari */
  Object.keys(_belge_setleri).forEach(function(sk) {
    var s = _belge_setleri[sk];
    h += '<button onclick="event.stopPropagation();' + s.turler.map(function(t){return 'var c=document.getElementById(\'bm-chk-'+t+'\');if(c)c.checked=true;';}).join('') + 'window._bmGuncelle()" style="font-size:9px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">' + s.l + '</button>';
  });
  h += '<div style="width:1px;height:16px;background:var(--b)"></div>';
  /* Dil */
  h += '<button onclick="event.stopPropagation();window._bmAktifDil=\'en\';window._ihrBelgePaneliAc(\'' + dosyaId + '\')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid ' + (dilSec==='en'?'#185FA5':'var(--b)') + ';background:' + (dilSec==='en'?'#E6F1FB':'transparent') + ';cursor:pointer;color:' + (dilSec==='en'?'#185FA5':'var(--t2)') + ';font-family:inherit">\ud83c\uddec\ud83c\udde7 EN</button>';
  h += '<button onclick="event.stopPropagation();window._bmAktifDil=\'tr\';window._ihrBelgePaneliAc(\'' + dosyaId + '\')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid ' + (dilSec==='tr'?'#185FA5':'var(--b)') + ';background:' + (dilSec==='tr'?'#E6F1FB':'transparent') + ';cursor:pointer;color:' + (dilSec==='tr'?'#185FA5':'var(--t2)') + ';font-family:inherit">\ud83c\uddf9\ud83c\uddf7 TR</button>';
  h += '<div style="width:1px;height:16px;background:var(--b)"></div>';
  /* Yon */
  h += '<button onclick="event.stopPropagation();window._bmAktifYon=\'portrait\';window._ihrBelgePaneliAc(\'' + dosyaId + '\')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid ' + (yonSec==='portrait'?'#185FA5':'var(--b)') + ';background:' + (yonSec==='portrait'?'#E6F1FB':'transparent') + ';cursor:pointer;color:' + (yonSec==='portrait'?'#185FA5':'var(--t2)') + ';font-family:inherit">\u2195 Dikey</button>';
  h += '<button onclick="event.stopPropagation();window._bmAktifYon=\'landscape\';window._ihrBelgePaneliAc(\'' + dosyaId + '\')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:0.5px solid ' + (yonSec==='landscape'?'#185FA5':'var(--b)') + ';background:' + (yonSec==='landscape'?'#E6F1FB':'transparent') + ';cursor:pointer;color:' + (yonSec==='landscape'?'#185FA5':'var(--t2)') + ';font-family:inherit">\u2194 Yatay</button>';
  h += '<div style="margin-left:auto"><label style="font-size:9px;color:var(--t2);cursor:pointer;display:flex;align-items:center;gap:4px"><input type="checkbox" id="bm-chk-all" onchange="event.stopPropagation();document.querySelectorAll(\'[id^=bm-chk-]\').forEach(function(c){if(c.id!==\'bm-chk-all\')c.checked=document.getElementById(\'bm-chk-all\').checked});window._bmGuncelle()"> T\u00fcm\u00fcn\u00fc Se\u00e7</label></div>';
  h += '</div>';

  /* ANA BODY — 2 kolon grid */
  h += '<div style="display:grid;grid-template-columns:1fr 196px;flex:1;overflow:hidden">';

  /* SOL — BELGE LISTESI */
  h += '<div id="bm-liste" style="overflow-y:auto">';
  GRUPLAR.filter(function(g) { return !g.dep || g.dep === _depSec; }).forEach(function(g) {
    h += '<div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);padding:6px 14px 3px;background:var(--s2);text-transform:uppercase">' + g.ad + '</div>';
    g.turler.forEach(function(t) {
      var isParasut = t.k === 'PARASUT';
      var isDOCX2 = t.k.indexOf('DOCX-') === 0;
      var isKDV = t.k === 'KDV' || t.k === 'KDV-R';
      var mevcut = evraklar.find(function(e) { return e.tur === t.k; });
      var hata = _bmHataKontrol(t.k, d || {}, urunler, fw2);
      var durumPill = mevcut ? '<span style="font-size:8px;padding:1px 6px;border-radius:3px;background:#EAF3DE;color:#27500A;font-weight:500">\u2713</span>' : hata ? '<span style="font-size:8px;padding:1px 6px;border-radius:3px;background:#FCEBEB;color:#791F1F;font-weight:500">\u2717</span>' : '<span style="font-size:8px;padding:1px 6px;border-radius:3px;background:var(--s2);color:var(--t3)">\u2014</span>';
      h += '<div data-bm-tur="' + t.k + '" style="display:flex;align-items:center;gap:6px;padding:5px 14px;border-bottom:0.5px solid var(--b)">';
      if (!isDOCX2) h += '<input type="checkbox" id="bm-chk-' + t.k + '" onchange="event.stopPropagation();window._bmGuncelle()" style="width:14px;height:14px;cursor:pointer">';
      h += '<span style="font-size:9px;font-weight:600;color:#185FA5;background:#E6F1FB;padding:1px 6px;border-radius:3px;min-width:42px;text-align:center">' + t.k + '</span>';
      h += '<span style="flex:1;font-size:10px;color:var(--t)">' + (TUR_AD[t.k] || t.k) + '</span>';
      h += '<span style="font-size:8px;color:var(--t3)">' + t.l.toUpperCase() + '</span>';
      h += durumPill;
      if (isParasut) {
        h += '<button onclick="event.stopPropagation();window._ihrParasutExcel?.(\'' + dosyaId + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 Excel</button>';
      } else if (isDOCX2) {
        var dxAlt = t.k.replace('DOCX-','').toLowerCase();
        h += '<button onclick="event.stopPropagation();window._ihrFormIndir?.(\'' + dxAlt + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u2b07 DOCX</button>';
      } else if (isKDV) {
        h += '<button onclick="event.stopPropagation();window._ihrKdvIadeHesapla?.()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Hesapla</button>';
      } else if (hata) {
        h += '<button onclick="event.stopPropagation();window._bmNeden(\'' + t.k + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid #DC2626;border-radius:4px;background:transparent;cursor:pointer;color:#DC2626;font-family:inherit">Neden?</button>';
      } else if (mevcut) {
        h += '<button onclick="event.stopPropagation();window._ihrPdfOnizle?.(\'' + dosyaId + '\',\'' + t.k + '\',null)" style="font-size:9px;padding:2px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit">G\u00f6r\u00fcnt\u00fcle</button>';
      } else {
        h += '<button onclick="event.stopPropagation();window._bmTekUret(\'' + dosyaId + '\',\'' + t.k + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u00dcret \u2192</button>';
      }
      h += '</div>';
    });
  });
  h += '</div>';

  /* SAĞ PANEL */
  h += '<div id="bm-sag" style="border-left:0.5px solid var(--b);background:var(--sf);overflow-y:auto;display:flex;flex-direction:column">';
  /* Dosya özeti */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:5px">DOSYA</div>';
  if (d) {
    var _sS = 'display:flex;justify-content:space-between;padding:2px 0;font-size:9px;border-bottom:0.5px solid var(--b)';
    h += '<div style="' + _sS + '"><span style="color:var(--t3)">No</span><span style="color:#185FA5;font-weight:500">' + _esc2(d.dosyaNo || '') + '</span></div>';
    h += '<div style="' + _sS + '"><span style="color:var(--t3)">M\u00fc\u015fteri</span><span>' + _esc2((d.musteriAd || '').slice(0, 16)) + '</span></div>';
    h += '<div style="' + _sS + '"><span style="color:var(--t3)">Teslim</span><span>' + _esc2((d.teslim_sekli || '') + ' ' + (d.varis_limani || '')) + '</span></div>';
    h += '<div style="' + _sS + '"><span style="color:var(--t3)">Evrak</span><span>' + tamam + '/13</span></div>';
  } else h += '<div style="font-size:9px;color:var(--t3)">Dosya se\u00e7ilmedi</div>';
  h += '</div>';
  /* Teklif Linkleri */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:5px">TEKL\u0130F L\u0130NKLER\u0130</div>';
  var _fwAd = fw2 ? _esc2(fw2.firma_adi || 'Forwarder') : 'Atanmad\u0131';
  h += '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:5px;padding:5px 8px;display:flex;align-items:center;margin-bottom:4px;' + (fw2 ? '' : 'opacity:.5') + '"><span style="flex:1;font-size:9px;font-weight:500;color:#0C447C">Navlun Teklifi</span>';
  h += '<button onclick="event.stopPropagation();window._ihrBelgeLinkOlustur?.(\'' + dosyaId + '\',\'TTF\')" style="font-size:8px;padding:1px 6px;border:0.5px solid #185FA5;border-radius:3px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit"' + (fw2 ? '' : ' disabled') + '>Kopyala</button></div>';
  var _sigAd = d && d.sigortaci_id ? 'Sigortac\u0131' : 'Atanmad\u0131';
  h += '<div style="background:#F5F3FF;border:0.5px solid #DDD6FE;border-radius:5px;padding:5px 8px;display:flex;align-items:center;' + (d && d.sigortaci_id ? '' : 'opacity:.5') + '"><span style="flex:1;font-size:9px;font-weight:500;color:#7C3AED">Sigorta Teklifi</span>';
  h += '<button onclick="event.stopPropagation();window._ihrBelgeLinkOlustur?.(\'' + dosyaId + '\',\'SIG\')" style="font-size:8px;padding:1px 6px;border:0.5px solid #7C3AED;border-radius:3px;background:transparent;cursor:pointer;color:#7C3AED;font-family:inherit"' + (d && d.sigortaci_id ? '' : ' disabled') + '>Kopyala</button></div>';
  h += '</div>';
  /* Üretilemeyenler */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)"><div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:5px">\u00dcRET\u0130LEMEYENLER</div>';
  var _hatalar3 = [];
  GRUPLAR.filter(function(g) { return !g.dep || g.dep === _depSec; }).forEach(function(g) { g.turler.forEach(function(t) { var ht = _bmHataKontrol(t.k, d || {}, urunler, fw2); if (ht) _hatalar3.push({ k: t.k, msg: ht }); }); });
  if (_hatalar3.length) { _hatalar3.forEach(function(ht) { h += '<div style="background:#FEF2F2;border:0.5px solid #F7C1C1;border-radius:5px;padding:4px 8px;font-size:9px;color:#791F1F;margin-bottom:3px"><strong>' + ht.k + ':</strong> ' + _esc2(ht.msg).slice(0, 60) + '</div>'; }); }
  else h += '<div style="font-size:9px;color:#16A34A">\u2713 T\u00fcm belgeler \u00fcretilebilir</div>';
  h += '</div>';
  /* Özellikler */
  h += '<div style="padding:10px 12px;flex:1"><div style="font-size:8px;font-weight:700;letter-spacing:.8px;color:var(--t3);margin-bottom:5px">\u00d6ZELL\u0130KLER</div>';
  h += '<div style="font-size:9px;color:var(--t2);line-height:1.8">\u2713 \u00c7oklu se\u00e7im + toplu \u00fcretim<br>\u2713 Departman filtresi (6 kategori)<br>\u2713 Evrak setleri tek t\u0131kla<br>\u2713 Teklif link \u00fcretici<br>\u2713 Hata a\u00e7\u0131klamas\u0131<br>\u2713 EN/TR \u00b7 Dikey/Yatay<br>\u2713 KDV \u0130ade, Sat\u0131\u015f, Muhasebe</div>';
  h += '</div>';
  h += '</div>'; /* sag panel bitti */
  h += '</div>'; /* grid bitti */

  /* FOOTER */
  h += '<div style="padding:10px 18px;border-top:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">';
  h += '<span id="bm-secili-sayi" style="font-size:11px;color:var(--t2)">0 belge se\u00e7ildi</span>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'mo-belge-merkez\')?.remove()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u0130ptal</button>';
  h += '<button onclick="event.stopPropagation();window._bmTopluUret(\'' + dosyaId + '\')" style="font-size:11px;padding:6px 18px;border:none;border-radius:6px;background:#16A34A;color:#fff;cursor:pointer;font-weight:500;font-family:inherit">Se\u00e7ilenleri \u00dcret \u2192</button>';
  h += '</div></div>';
  h += '</div>';

  mo.innerHTML = h;
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._bmGuncelle = function() {
  var sayi = document.querySelectorAll('[id^="bm-chk-"]:checked').length;
  var allChk = document.getElementById('bm-chk-all');
  if (allChk) sayi = Math.max(0, sayi - (allChk.checked ? 1 : 0));
  var el = document.getElementById('bm-secili-sayi');
  if (el) el.textContent = sayi + ' belge se\u00e7ildi';
};

window._bmTekUret = function(dosyaId, tur) {
  var lang = window._bmAktifDil || 'en';
  window._ihrBelgeUretDogrudan?.(dosyaId, tur, lang);
};

window._bmTopluUret = function(dosyaId) {
  if (window._bmTopluLoading) return;
  window._bmTopluLoading = true;
  var secili = [];
  document.querySelectorAll('[id^="bm-chk-"]:checked').forEach(function(c) {
    var t = c.id.replace('bm-chk-', '');
    if (t !== 'all' && t.indexOf('DOCX') === -1 && t !== 'PARASUT') secili.push(t);
  });
  if (!secili.length) { window.toast?.('Belge se\u00e7ilmedi', 'warn'); window._bmTopluLoading = false; return; }
  window.toast?.(secili.length + ' belge \u00fcretiliyor...', 'ok');
  secili.forEach(function(tur, i) {
    setTimeout(function() {
      window._bmTekUret(dosyaId, tur);
      if (i === secili.length - 1) { window._bmTopluLoading = false; window.toast?.('T\u00fcm belgeler \u00fcretildi', 'ok'); }
    }, i * 700);
  });
};

/* IHR-BELGELER-BTN-001: override kaldirildi — _ihrBelgePaneliAc kullaniliyor */

/* ══════════════════════════════════════════════════════════════
   KAR RAPORU (MUTABAKAT-001)
   ══════════════════════════════════════════════════════════════ */
window._ihrBelgeFloatPanel = function(dosyaId) {
  dosyaId = dosyaId || window._ihrAktifDosyaId || '';
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) { window.toast?.('\u00d6nce bir dosya se\u00e7in', 'warn'); return; }
  var evraklar = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId) && !e.isDeleted; });
  var dil = window._ihrBelgeFloatDil || 'en';
  var old = document.getElementById('mo-belge-float'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-belge-float';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var KARTLAR = [
    { k:'PI', ad:'Proforma Invoice', bg:'#E6F1FB', c:'#0C447C', b:'#B5D4F4' },
    { k:'CI', ad:'Commercial Invoice', bg:'#EAF3DE', c:'#27500A', b:'#C0DD97' },
    { k:'PL', ad:'Packing List', bg:'#EEEDFE', c:'#3C3489', b:'#AFA9EC' },
    { k:'TRFAT', ad:'Transit Fatura', bg:'#FAEEDA', c:'#633806', b:'#FAC775' },
    { k:'SEVK', ad:'Sevk \u0130rsaliyesi', bg:'#F1EFE8', c:'#444441', b:'#D3D1C7' },
    { k:'YUK', ad:'Y\u00fckleme Talimat\u0131', bg:'#F1EFE8', c:'#444441', b:'#D3D1C7' },
    { k:'TTF', ad:'Ta\u015f\u0131ma Talimat\u0131', bg:'#FCEBEB', c:'#791F1F', b:'#F7C1C1' }
  ];
  var h = '<div class="moc" style="max-width:840px;padding:0;border-radius:12px;overflow:hidden">';
  h += '<div style="background:#042C53;padding:0 14px;height:40px;display:flex;align-items:center;gap:10px">';
  h += '<span style="font-size:12px;font-weight:500;color:#85B7EB">Belgeler</span>';
  h += '<span style="font-size:9px;color:rgba(255,255,255,.35);font-family:monospace">' + _esc(d.dosyaNo||'') + '</span>';
  h += '<div style="display:flex;border:0.5px solid rgba(255,255,255,.2);border-radius:3px;overflow:hidden;margin-left:8px">';
  h += '<button onclick="event.stopPropagation();window._ihrBelgeFloatDil=\'en\';window._ihrBelgeFloatPanel(\'' + dosyaId + '\')" style="font-size:8px;padding:2px 8px;background:' + (dil==='en'?'#185FA5':'transparent') + ';color:' + (dil==='en'?'#fff':'rgba(255,255,255,.5)') + ';border:none;cursor:pointer;font-family:inherit">EN</button>';
  h += '<button onclick="event.stopPropagation();window._ihrBelgeFloatDil=\'tr\';window._ihrBelgeFloatPanel(\'' + dosyaId + '\')" style="font-size:8px;padding:2px 8px;background:' + (dil==='tr'?'#185FA5':'transparent') + ';color:' + (dil==='tr'?'#fff':'rgba(255,255,255,.5)') + ';border:none;cursor:pointer;font-family:inherit;border-left:0.5px solid rgba(255,255,255,.2)">TR</button>';
  h += '</div>';
  h += '<div style="margin-left:auto;display:flex;gap:6px">';
  h += '<button onclick="event.stopPropagation();window._ihrDetayTab(\'evraklar\',\'' + dosyaId + '\');document.getElementById(\'mo-belge-float\')?.remove()" style="font-size:8px;padding:2px 8px;border:0.5px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.6);border-radius:3px;cursor:pointer;font-family:inherit">Evraklar Sekmesi \u2192</button>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'mo-belge-float\')?.remove()" style="font-size:14px;padding:0 8px;border:none;background:transparent;color:rgba(255,255,255,.4);cursor:pointer">\u00d7</button>';
  h += '</div></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);background:#fff">';
  var mevcutTurler = {};
  evraklar.forEach(function(e) { if (!mevcutTurler[e.tur] || e.createdAt > mevcutTurler[e.tur].createdAt) mevcutTurler[e.tur] = e; });
  KARTLAR.forEach(function(kart, idx) {
    var ev = mevcutTurler[kart.k];
    var tarih = ev ? (ev.createdAt||'').slice(0,10) : '';
    h += '<div style="padding:10px;border-right:' + (idx<6?'0.5px solid #D3D1C7':'none') + '">';
    h += '<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px"><div style="width:14px;height:14px;background:' + kart.bg + ';border:0.5px solid ' + kart.b + ';border-radius:2px;flex-shrink:0"></div><span style="font-size:11px;font-weight:600;color:' + kart.c + '">' + _esc(kart.k) + '</span></div>';
    h += '<div style="font-size:7px;color:#888780;margin-bottom:6px;line-height:1.3">' + _esc(kart.ad) + '</div>';
    h += '<div style="font-size:7px;margin-bottom:8px;color:' + (ev?'#27500A':'#B4B2A9') + '">' + (ev ? '\u2713 ' + tarih : '\u2014 Hen\u00fcz yok') + '</div>';
    h += '<button onclick="event.stopPropagation();window._ihrBelgeUretDogrudan(\'' + dosyaId + '\',\'' + kart.k + '\',\'' + dil + '\');document.getElementById(\'mo-belge-float\')?.remove()" style="width:100%;font-size:7px;padding:2px 0;border:none;background:#185FA5;color:#fff;border-radius:2px;cursor:pointer;font-family:inherit;margin-bottom:3px">\u00dcret</button>';
    h += '<div style="display:flex;gap:2px">';
    h += '<button onclick="event.stopPropagation();' + (ev?'window._ihrPdfOnizle?.(\'' + dosyaId + '\',\'' + kart.k + '\',null)':'') + '" ' + (ev?'':'disabled') + ' style="flex:1;font-size:7px;padding:1px 0;border:0.5px solid #D3D1C7;background:transparent;color:' + (ev?'#444441':'#B4B2A9') + ';border-radius:2px;cursor:' + (ev?'pointer':'default') + ';font-family:inherit">G\u00f6r</button>';
    h += '<button onclick="event.stopPropagation();" ' + (ev&&ev.dosya_url?'':'disabled') + ' style="flex:1;font-size:7px;padding:1px 0;border:0.5px solid #D3D1C7;background:transparent;color:' + (ev&&ev.dosya_url?'#444441':'#B4B2A9') + ';border-radius:2px;cursor:' + (ev&&ev.dosya_url?'pointer':'default') + ';font-family:inherit">\u2193</button>';
    h += '</div></div>';
  });
  h += '</div>';
  var hazirSay = Object.keys(mevcutTurler).filter(function(k){ return KARTLAR.find(function(x){return x.k===k;}); }).length;
  h += '<div style="padding:8px 14px;background:#F8F8F6;border-top:0.5px solid #D3D1C7;display:flex;align-items:center;gap:8px">';
  h += '<span style="font-size:7px;color:#888780">' + hazirSay + '/7 belge haz\u0131r</span>';
  h += '<div style="margin-left:auto;display:flex;gap:4px">';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'mo-belge-float\')?.remove()" class="btn btns" style="font-size:7px;padding:2px 8px">Kapat</button>';
  h += '</div></div></div>';
  mo.innerHTML = h;
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrKarRaporu = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var tumSA = typeof window.loadSatinalma === 'function' ? window.loadSatinalma() : [];
  var fN = function(n) { return (parseFloat(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var doviz = urunler[0]?.doviz || 'USD';
  var topFOB = urunler.reduce(function(a, u) { return a + (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }, 0);
  var navlunGelir = parseFloat(d.navlun || 0);
  var sigortaGelir = parseFloat(d.sigorta_bedel || 0);
  var topAlis = urunler.reduce(function(acc, u) {
    var esl = tumSA.find(function(s) { return u.satinalma_id && String(s.id) === String(u.satinalma_id); });
    return acc + (esl ? (parseFloat(esl.miktar) || 0) * (parseFloat(esl.birimFiyat) || 0) : 0);
  }, 0);
  var navlunGider = parseFloat(d.navlun_odeme || d.navlun || 0);
  var sigortaGider = parseFloat(d.sigorta_prim || d.sigorta_bedel || 0);
  var gumrukGider = parseFloat(d.gumruk_masraf || 0);
  var digerGider = parseFloat(d.diger_masraf || 0);
  var topGider = topAlis + navlunGider + sigortaGider + gumrukGider + digerGider;
  var netKar = topFOB - topGider;
  var marjPct = topFOB > 0 ? Math.round(netKar / topFOB * 1000) / 10 : 0;
  var urunKarlar = urunler.map(function(u) {
    var ciT = (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0);
    var esl = tumSA.find(function(s) { return u.satinalma_id && String(s.id) === String(u.satinalma_id); });
    var alisT = esl ? (parseFloat(esl.miktar) || 0) * (parseFloat(esl.birimFiyat) || 0) : 0;
    return { ad: u.standart_urun_adi || u.aciklama || u.urun_kodu || '\u2014', ciT: ciT, alisT: alisT, kar: ciT - alisT, marj: ciT > 0 ? Math.round((ciT - alisT) / ciT * 1000) / 10 : 0 };
  });

  var karRenk = netKar >= 0 ? '#16A34A' : '#DC2626';
  var marjBg = marjPct > 15 ? '#16A34A' : marjPct > 5 ? '#D97706' : '#DC2626';
  var hR = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>K\u00e2r Raporu</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}.page{max-width:210mm;margin:0 auto;padding:20px 24px}.no-print{background:#0C2340;padding:8px 16px;display:flex;gap:8px;justify-content:flex-end}@media print{.no-print{display:none!important}}</style></head><body>';
  hR += '<div class="no-print"><button onclick="window.print()" style="padding:4px 16px;background:#185FA5;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">Yazd\u0131r</button><button onclick="window.close()" style="padding:4px 16px;background:transparent;color:#fff;border:0.5px solid rgba(255,255,255,.3);border-radius:4px;cursor:pointer;font-size:11px">Kapat</button></div>';
  hR += '<div class="page">';
  hR += '<div style="background:#0C2340;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:8px 8px 0 0"><div style="color:#fff"><div style="font-size:8px;color:rgba(255,255,255,.5)">DUAY GLOBAL TRADE</div><div style="font-size:16px;font-weight:700;margin-top:2px">K\u00c2R RAPORU</div></div><div style="text-align:right;color:rgba(255,255,255,.7);font-size:9px">' + _esc(d.dosyaNo || '') + '<br>' + new Date().toISOString().slice(0, 10) + '</div></div>';
  /* Gelirler */
  hR += '<div style="padding:12px 20px;border:0.5px solid var(--b)"><div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:8px">GEL\u0130RLER</div>';
  var _kS2 = 'display:flex;justify-content:space-between;padding:4px 0;font-size:10px;border-bottom:0.5px solid #eee';
  hR += '<div style="' + _kS2 + '"><span>Sat\u0131\u015f (CI \u2014 FOB)</span><span style="font-weight:500">' + doviz + ' ' + fN(topFOB) + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>Navlun Geliri</span><span>' + fN(navlunGelir) + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>Sigorta Geliri</span><span>' + fN(sigortaGelir) + '</span></div>';
  hR += '<div style="' + _kS2 + ';border-bottom:2px solid #1a1a1a;font-weight:600"><span>TOPLAM GEL\u0130R</span><span>' + doviz + ' ' + fN(topFOB + navlunGelir + sigortaGelir) + '</span></div>';
  hR += '</div>';
  /* Giderler */
  hR += '<div style="padding:12px 20px;border:0.5px solid var(--b);border-top:none"><div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:8px">G\u0130DERLER</div>';
  hR += '<div style="' + _kS2 + '"><span>Al\u0131\u015f Maliyeti</span><span style="color:#DC2626">' + (topAlis > 0 ? fN(topAlis) : '\u2014 (al\u0131\u015f faturas\u0131 ba\u011fl\u0131 de\u011fil)') + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>Navlun \u00d6demesi</span><span>' + fN(navlunGider) + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>Sigorta \u00d6demesi</span><span>' + fN(sigortaGider) + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>G\u00fcmr\u00fck Masraf\u0131</span><span>' + (gumrukGider > 0 ? fN(gumrukGider) : '\u2014 (girilmemi\u015f)') + '</span></div>';
  hR += '<div style="' + _kS2 + '"><span>Di\u011fer Masraflar</span><span>' + fN(digerGider) + '</span></div>';
  hR += '<div style="' + _kS2 + ';border-bottom:2px solid #1a1a1a;font-weight:600"><span>TOPLAM G\u0130DER</span><span>' + fN(topGider) + '</span></div>';
  hR += '</div>';
  /* Net Kâr */
  hR += '<div style="background:' + (netKar >= 0 ? '#EAF3DE' : '#FCEBEB') + ';padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:700;color:' + karRenk + '">';
  hR += '<span>NET K\u00c2R</span><span>' + doviz + ' ' + fN(netKar) + ' (%' + marjPct + ')</span></div>';
  /* Ürün bazlı */
  hR += '<div style="padding:12px 20px"><div style="font-size:9px;font-weight:700;letter-spacing:.6px;color:var(--t3);margin-bottom:8px">\u00dcR\u00dcN BAZINDA K\u00c2R ANAL\u0130Z\u0130</div>';
  hR += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f8f8f8;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a"><th style="padding:5px 8px;text-align:left">\u00dcr\u00fcn</th><th style="padding:5px 8px;text-align:right">Sat\u0131\u015f</th><th style="padding:5px 8px;text-align:right">Al\u0131\u015f</th><th style="padding:5px 8px;text-align:right">K\u00e2r</th><th style="padding:5px 8px;text-align:right">Marj %</th></tr></thead><tbody>';
  urunKarlar.forEach(function(uk) {
    hR += '<tr><td style="padding:4px 8px;border-bottom:0.5px solid #eee">' + _esc(uk.ad.slice(0, 30)) + '</td><td style="padding:4px 8px;text-align:right;border-bottom:0.5px solid #eee">' + fN(uk.ciT) + '</td><td style="padding:4px 8px;text-align:right;border-bottom:0.5px solid #eee;' + (uk.alisT === 0 ? 'color:#999;font-style:italic' : '') + '">' + (uk.alisT > 0 ? fN(uk.alisT) : 'e\u015fle\u015fmedi') + '</td><td style="padding:4px 8px;text-align:right;border-bottom:0.5px solid #eee;color:' + (uk.kar >= 0 ? '#16A34A' : '#DC2626') + '">' + fN(uk.kar) + '</td><td style="padding:4px 8px;text-align:right;border-bottom:0.5px solid #eee">%' + uk.marj + '</td></tr>';
  });
  hR += '</tbody></table></div>';
  hR += '</div></body></html>';
  var w = window.open('', '_blank');
  if (w) { w.document.write(hR); w.document.close(); }
};

/* ══════════════════════════════════════════════════════════════
   MUTABAKAT OZET RAPORU (MUTABAKAT-001)
   ══════════════════════════════════════════════════════════════ */
window._ihrMutabakatOzet = function(dosyaId) {
  var d = _loadD().find(function(x) { return String(x.id) === String(dosyaId) && !x.isDeleted; });
  if (!d) { window.toast?.('Dosya bulunamad\u0131', 'err'); return; }
  var urunler = _loadU().filter(function(u) { return String(u.dosya_id) === String(dosyaId) && !u.isDeleted; });
  var gcbList2 = _loadG().filter(function(g) { return String(g.dosya_id) === String(dosyaId) && !g.isDeleted; });
  var blList2 = _loadBL().filter(function(b) { return String(b.dosya_id) === String(dosyaId) && !b.isDeleted; });
  var evraklar2 = _loadE().filter(function(e) { return String(e.dosya_id) === String(dosyaId) && !e.isDeleted; });
  var fN = function(n) { return (parseFloat(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  var ciUrun = urunler.length;
  var plKoli = urunler.reduce(function(a, u) { return a + (parseInt(u.koli_adet) || 0); }, 0);
  var plBrut = urunler.reduce(function(a, u) { return a + (parseFloat(u.brut_kg) || 0); }, 0);
  var plNet = urunler.reduce(function(a, u) { return a + (parseFloat(u.net_kg) || 0); }, 0);
  var ciTutar = urunler.reduce(function(a, u) { return a + (parseFloat(u.miktar) || 0) * (parseFloat(u.birim_fiyat) || 0); }, 0);
  var hsOk = urunler.filter(function(u) { return u.hs_kodu && u.hs_kodu.length >= 6; }).length;
  var gcb1o = gcbList2[0]; var bl1o = blList2[0];
  var gcbBrut = gcb1o ? (parseFloat(gcb1o.brut_kg || gcb1o.toplam_kg || 0)) : null;
  var blBrut = bl1o ? (parseFloat(bl1o.toplam_kg || 0)) : null;
  var vgmBrut = urunler.reduce(function(a, u) { return a + (parseFloat(u.vgm_kg) || 0); }, 0) || null;

  var hO = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>M\u00fctabakat \u00d6zet</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}.page{max-width:210mm;margin:0 auto;padding:20px 24px}.no-print{background:#0C2340;padding:8px 16px;display:flex;gap:8px;justify-content:flex-end}@media print{.no-print{display:none!important}}</style></head><body>';
  hO += '<div class="no-print"><button onclick="window.print()" style="padding:4px 16px;background:#185FA5;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">Yazd\u0131r</button><button onclick="window.close()" style="padding:4px 16px;background:transparent;color:#fff;border:0.5px solid rgba(255,255,255,.3);border-radius:4px;cursor:pointer;font-size:11px">Kapat</button></div>';
  hO += '<div class="page">';
  hO += '<div style="background:#0C2340;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:8px 8px 0 0"><div style="color:#fff"><div style="font-size:8px;color:rgba(255,255,255,.5)">DUAY GLOBAL TRADE</div><div style="font-size:16px;font-weight:700;margin-top:2px">M\u00dcTABAKAT \u00d6ZET RAPORU</div></div><div style="text-align:right;color:rgba(255,255,255,.7);font-size:9px">' + _esc(d.dosyaNo || '') + ' \u00b7 ' + _esc(d.musteriAd || '') + '<br>' + new Date().toISOString().slice(0, 10) + '</div></div>';

  /* Karşılaştırma tablosu */
  hO += '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:1px"><thead><tr style="background:#f8f8f8"><th style="padding:6px 8px;text-align:left;border:0.5px solid #ddd"></th><th style="padding:6px 8px;text-align:right;border:0.5px solid #ddd;background:rgba(24,95,165,.06);color:#185FA5">CI (Ref)</th><th style="padding:6px 8px;text-align:right;border:0.5px solid #ddd">PL</th><th style="padding:6px 8px;text-align:right;border:0.5px solid #ddd">G\u00c7B</th><th style="padding:6px 8px;text-align:right;border:0.5px solid #ddd">BL</th><th style="padding:6px 8px;text-align:right;border:0.5px solid #ddd">VGM</th></tr></thead><tbody>';
  var _oRow = function(label, ci, pl, gcb, bl, vgm) {
    return '<tr><td style="padding:5px 8px;border:0.5px solid #ddd;font-weight:500">' + label + '</td><td style="padding:5px 8px;border:0.5px solid #ddd;text-align:right;background:rgba(24,95,165,.03);font-weight:500">' + ci + '</td><td style="padding:5px 8px;border:0.5px solid #ddd;text-align:right">' + pl + '</td><td style="padding:5px 8px;border:0.5px solid #ddd;text-align:right">' + gcb + '</td><td style="padding:5px 8px;border:0.5px solid #ddd;text-align:right">' + bl + '</td><td style="padding:5px 8px;border:0.5px solid #ddd;text-align:right">' + vgm + '</td></tr>';
  };
  hO += _oRow('\u00dcr\u00fcn Kalemi', ciUrun, ciUrun, gcb1o ? (gcb1o.urun_sayisi || ciUrun) : '\u2014', '\u2014', ciUrun);
  hO += _oRow('Toplam Koli', '\u2014', plKoli, gcb1o ? (gcb1o.toplam_koli || '\u2014') : '\u2014', bl1o ? (bl1o.toplam_koli || '\u2014') : '\u2014', plKoli);
  hO += _oRow('Br\u00fct KG', '\u2014', fN(plBrut), gcbBrut !== null ? fN(gcbBrut) : '\u2014', blBrut !== null ? fN(blBrut) : '\u2014', vgmBrut ? fN(vgmBrut) : '\u2014');
  hO += _oRow('Net KG', '\u2014', fN(plNet), '\u2014', '\u2014', '\u2014');
  hO += _oRow('Toplam Tutar', fN(ciTutar), '\u2014', gcb1o ? fN(gcb1o.fob_deger || ciTutar) : '\u2014', '\u2014', '\u2014');
  hO += _oRow('HS Kodu', hsOk + '/' + ciUrun, hsOk + '/' + ciUrun, '\u2014', '\u2014', '\u2014');
  hO += '</tbody></table>';

  /* Evrak durumu */
  hO += '<div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">';
  ['PI', 'CI', 'PL', 'GCB', 'BL', 'SIG'].forEach(function(tur) {
    var var2 = evraklar2.find(function(e) { return e.tur === tur; });
    var bg2 = var2 ? '#EAF3DE' : '#FCEBEB';
    var clr2 = var2 ? '#27500A' : '#791F1F';
    hO += '<div style="background:' + bg2 + ';border-radius:6px;padding:6px 12px;text-align:center;min-width:50px"><div style="font-size:9px;font-weight:600;color:' + clr2 + '">' + tur + '</div><div style="font-size:14px;margin-top:2px">' + (var2 ? '\u2713' : '\u2717') + '</div></div>';
  });
  hO += '</div>';
  hO += '</div></body></html>';
  var w2 = window.open('', '_blank');
  if (w2) { w2.document.write(hO); w2.document.close(); }
};

/* ══════════════════════════════════════════════════════════════
   URUN-TASARIM-001 — Yeni fonksiyonlar
   ══════════════════════════════════════════════════════════════ */
window._ihrKaynakFiltre = function(dosyaId, kaynak) {
  window._ihrUrunKaynakFiltre = (window._ihrUrunKaynakFiltre === kaynak) ? null : kaynak;
  var d2 = _loadD().find(function(x) { return String(x.id) === String(dosyaId); });
  var c2 = _g('ihr-detay-content');
  if (d2 && c2) _ihrDetayRenderUrunler(d2, c2);
};

window._ihrTopluOnayla = function(dosyaId) {
  var secili = Array.from(document.querySelectorAll('.ihr-urun-chk:checked')).map(function(cb) { return cb.dataset.id; });
  if (!secili.length) { window.toast?.('\u00d6nce \u00fcr\u00fcn se\u00e7in', 'warn'); return; }
  window.confirmModal?.('Se\u00e7ili ' + secili.length + ' \u00fcr\u00fcn\u00fc onayla?', {
    title: 'Toplu Onayla', confirmText: 'Onayla',
    onConfirm: function() {
      var urunler = _loadU();
      secili.forEach(function(id) { var u = urunler.find(function(x) { return String(x.id) === String(id); }); if (u) { u.onay_durumu = 'onaylandi'; u.updatedAt = _now(); u.updatedBy = _cu()?.id; } });
      _storeU(urunler);
      window.toast?.('Toplu onayland\u0131: ' + secili.length + ' \u00fcr\u00fcn', 'ok');
      _ihrReRender();
    }
  });
};

window._ihrUrunPeekAc = function(id) {
  var panel = document.getElementById('ihr-peek-panel'); if (!panel) return;
  var u = _loadU().find(function(x) { return String(x.id) === String(id); }); if (!u) return;
  var kaynak = u.kaynak || 'el';
  var kR = kaynak === 'sa' ? { bg: '#E6F1FB', c: '#0C447C', l: 'SA Sat\u0131nalma' } : kaynak === 'im' ? { bg: '#EEEDFE', c: '#3C3489', l: 'IM Import' } : { bg: '#EAF3DE', c: '#27500A', l: 'EL Manuel' };
  var fld = function(l, v, renk) { return '<div style="padding:4px 12px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;font-size:10px"><span style="color:var(--t2)">' + l + '</span><span style="font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (renk ? 'color:' + renk : '') + '">' + _esc(String(v || '\u2014')) + '</span></div>'; };
  var h2 = '<div style="padding:7px 12px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;background:var(--s2)"><span style="font-size:10px;font-weight:500">' + _esc(u.urun_kodu || u.aciklama || '\u2014') + '</span><button onclick="event.stopPropagation();window._ihrUrunPeekKapat()" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t3)">\u00d7</button></div>';
  h2 += fld('Kaynak', '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:' + kR.bg + ';color:' + kR.c + '">' + kR.l + '</span>');
  h2 += fld('Standart Ad', u.standart_urun_adi, !u.standart_urun_adi ? '#DC2626' : null);
  h2 += fld('HS Kodu', u.hs_kodu, !u.hs_kodu ? '#DC2626' : '#16A34A');
  h2 += fld('Miktar', (u.miktar || '\u2014') + ' ' + (u.birim || ''));
  h2 += fld('Br\u00fct KG', u.brut_kg ? u.brut_kg + ' kg' : '\u2014', !u.brut_kg ? '#DC2626' : null);
  h2 += fld('Fiyat', u.birim_fiyat ? (u.doviz || '') + ' ' + u.birim_fiyat : '\u2014', !u.birim_fiyat ? '#DC2626' : '#185FA5');
  h2 += fld('Koli', u.koli_adet);
  h2 += fld('Men\u015fei', u.mense_ulke);
  h2 += '<div style="padding:8px 12px;display:flex;flex-direction:column;gap:4px">';
  h2 += '<button onclick="event.stopPropagation();window._ihrInlineEdit?.(null,\'' + id + '\',\'aciklama\')" style="font-size:9px;padding:4px;border-radius:5px;border:0.5px solid #185FA5;color:#185FA5;cursor:pointer;font-family:inherit">D\u00fczenle</button>';
  h2 += '</div>';
  panel.style.width = '210px';
  panel.innerHTML = h2;
};

window._ihrUrunPeekKapat = function() {
  var p = document.getElementById('ihr-peek-panel'); if (p) p.style.width = '0';
};

window._ihrDosyaAraModal = function() {
  var dosyalar = _loadD().filter(function(d2) { return !d2.isDeleted; });
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ihr-dosya-ara';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var renderL = function(q) {
    var fil = q ? dosyalar.filter(function(d2) { return (d2.dosyaNo || '').toLowerCase().indexOf(q) !== -1 || (d2.musteriAd || '').toLowerCase().indexOf(q) !== -1; }) : dosyalar;
    return fil.slice(0, 20).map(function(d2) {
      return '<div onclick="event.stopPropagation();window._ihrSetAktifDosya(\'' + d2.id + '\')" style="padding:10px 16px;border-bottom:0.5px solid var(--b);cursor:pointer;display:flex;align-items:center;gap:8px"><div style="flex:1"><div style="font-size:12px;font-weight:500">' + _esc(d2.dosyaNo) + '</div><div style="font-size:10px;color:var(--t2)">' + _esc(d2.musteriAd || '') + '</div></div></div>';
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--t3)">Sonu\u00e7 bulunamad\u0131</div>';
  };
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:12px;overflow:hidden"><div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:8px"><input id="ihr-dosya-ara-inp" class="fi" placeholder="Dosya no veya m\u00fc\u015fteri ara..." style="flex:1;font-size:12px" oninput="event.stopPropagation();document.getElementById(\'ihr-dosya-ara-liste\').innerHTML=window._ihrAraRender?.(this.value.toLowerCase())||\'\'"><button onclick="event.stopPropagation();document.getElementById(\'mo-ihr-dosya-ara\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">\u00d7</button></div><div id="ihr-dosya-ara-liste" style="max-height:340px;overflow-y:auto">' + renderL('') + '</div></div>';
  window._ihrAraRender = renderL;
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._ihrSetAktifDosya = function(id) {
  _aktifDosyaId = id; window._ihrAktifDosyaId = id;
  document.getElementById('mo-ihr-dosya-ara')?.remove();
  window.toast?.('Aktif dosya de\u011fi\u015ftirildi', 'ok');
  _ihrReRender();
};

window._ihrSatinalmaGecis = function() {
  if (typeof window.nav === 'function') window.nav('satinalma');
  else window.App?.nav?.('satinalma');
};

window._ihrImportDocs = function(dosyaId) {
  window.excelImportAc?.(dosyaId || '');
};

})();
