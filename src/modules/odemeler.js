/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v9.1.0
 * Nakit Akisi — Kullanıcı Atama, Alarm, Dekont, Excel Import/Export
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _go    = window.g;
const _sto   = window.st;
const _nowTso = window.nowTs;
const _isAdminO = () => window.Auth?.getCU?.()?.role === 'admin';
const _isManagerO = () => window.Auth?.getCU?.()?.role === 'manager' || window.Auth?.getCU?.()?.role === 'admin';
const _CUo      = window.CU;
const _todayStr = () => new Date().toISOString().slice(0,10);

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — SABİTLER
// ════════════════════════════════════════════════════════════════

const ODM_CATS = {
  kira:      { l:'Kira',           ic:'🏢', c:'ba' },
  fatura:    { l:'Fatura',         ic:'💡', c:'bb' },
  abonelik:  { l:'Abonelik',       ic:'🔄', c:'bp' },
  kredi_k:   { l:'Kredi Kartı',    ic:'💳', c:'bp' },
  vergi:     { l:'Vergi/SGK',      ic:'📋', c:'br' },
  sigorta:   { l:'Sigorta',        ic:'🛡️', c:'ba' },
  kredi:     { l:'Kredi',          ic:'🏦', c:'bb' },
  maas:      { l:'Maaş/Personel',  ic:'👥', c:'bg' },
  diger:     { l:'Diğer',          ic:'📌', c:'bg' },
};

// Abonelik alt tipleri
const ODM_ABONE_TYPES = {
  su:        { l:'Su',        ic:'💧' },
  elektrik:  { l:'Elektrik',  ic:'⚡' },
  dogalgaz:  { l:'Doğalgaz',  ic:'🔥' },
  telefon:   { l:'Telefon',   ic:'📱' },
  internet:  { l:'İnternet',  ic:'🌐' },
  yazilim:   { l:'Yazılım',   ic:'💻' },
  diger:     { l:'Diğer',     ic:'🔄' },
};
const ODM_FREQ = {
  gunluk:   'Günlük',
  haftalik: 'Haftalık',
  iki_haftada: '2 Haftalık',
  aylik:    'Aylık',
  uc_aylik: '3 Aylık',
  alti_aylik: '6 Aylık',
  yillik:   'Yıllık',
  teksefer: 'Tek Sefer',
};

// Hatırlatıcı zamanlaması seçenekleri
const ODM_REMINDER_UNITS = {
  dakika: 'Dakika',
  saat:   'Saat',
  gun:    'Gün',
  hafta:  'Hafta',
  ay:     'Ay',
};

const ODM_CURRENCY = {
  TRY: { sym: '₺',  name: 'Türk Lirası',    flag: '🇹🇷' },
  USD: { sym: '$',  name: 'Amerikan Doları', flag: '🇺🇸' },
  EUR: { sym: '€',  name: 'Euro',            flag: '🇪🇺' },
  GBP: { sym: '£',  name: 'İngiliz Sterlini',flag: '🇬🇧' },
  CHF: { sym: 'Fr', name: 'İsviçre Frangı',  flag: '🇨🇭' },
  JPY: { sym: '¥',  name: 'Japon Yeni',      flag: '🇯🇵' },
  AED: { sym: 'د.إ',name: 'Dirhem (BAE)',    flag: '🇦🇪' },
  SAR: { sym: '﷼',  name: 'Suudi Riyali',   flag: '🇸🇦' },
  XAU: { sym: 'gr', name: 'Altın (gram)',    flag: '🥇' },
  XAG: { sym: 'gr', name: 'Gümüş (gram)',   flag: '🥈' },
};

// Kur cache — TCMB'den çekilir, fallback statik
let _odmRatesCache = null;
let _odmRatesDate  = '';
let _odmRatesMode  = 'alis'; // 'alis' | 'satis' | 'manuel'
let _odmManualRates = {};

// Admin kur ayarları — localStorage'da saklanır
const ODM_KUR_CONFIG_KEY = 'odm_kur_config';
const ODM_KUR_SOURCES = {
  tcmb:      { l: 'TCMB (Merkez Bankası)', ic: '🏦' },
  exchange:  { l: 'ExchangeRate API',       ic: '🌐' },
  manuel:    { l: 'Manuel Giriş',           ic: '✏️' },
};

function _odmLoadKurConfig() {
  try { return JSON.parse(localStorage.getItem(ODM_KUR_CONFIG_KEY) || '{}'); } catch { return {}; }
}

function _odmSaveKurConfig(cfg) {
  localStorage.setItem(ODM_KUR_CONFIG_KEY, JSON.stringify(cfg));
}

const ODM_RATES_DEFAULT = {
  TRY: 1, USD: 38.50, EUR: 41.20, GBP: 48.90,
  CHF: 43.10, JPY: 0.26, AED: 10.48, SAR: 10.27,
  XAU: 3850, XAG: 45.20,
};

function _odmGetRates() {
  const r = { ...ODM_RATES_DEFAULT };
  if (_odmRatesCache) Object.assign(r, _odmRatesCache);
  if (_odmRatesMode === 'manuel') Object.assign(r, _odmManualRates);
  return r;
}

async function _odmFetchTCMB() {
  const today = new Date().toISOString().slice(0, 10);
  if (_odmRatesDate === today && _odmRatesCache) return;
  // Admin kur config — kaynak kontrolü
  var kurCfg = _odmLoadKurConfig();
  if (kurCfg.source === 'manuel') { return; } // Manuel modda otomatik çekme
  if (kurCfg.defaultMode) _odmRatesMode = kurCfg.defaultMode;
  // Kaynak tercihi: exchange öncelikli ise ters sırada dene
  var preferExchange = kurCfg.source === 'exchange';
  try {
    if (preferExchange) throw new Error('skip_tcmb');
    // TCMB XML kur — CORS proxy ile
    const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.tcmb.gov.tr/kurlar/today.xml'));
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    _odmRatesCache = {};
    doc.querySelectorAll('Currency').forEach(function(c) {
      var code = c.getAttribute('CurrencyCode');
      var buying = c.querySelector('ForexBuying');
      if (buying && buying.textContent) {
        var rate = parseFloat(buying.textContent.replace(',', '.'));
        if (rate > 0 && ODM_CURRENCY[code]) _odmRatesCache[code] = rate;
      }
    });
    _odmRatesDate = today;
    localStorage.setItem('odm_rates_cache', JSON.stringify({ d: today, r: _odmRatesCache }));
    console.log('[Ödemeler] TCMB kur güncellendi:', today);
  } catch (e) {
    // Fallback: exchangerate-api
    try {
      const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      const data = await res2.json();
      _odmRatesCache = {};
      Object.keys(ODM_CURRENCY).forEach(function(k) {
        if (k === 'TRY' || k === 'XAU' || k === 'XAG') return;
        if (data.rates[k]) _odmRatesCache[k] = Math.round(1 / data.rates[k] * 100) / 100;
      });
      _odmRatesDate = today;
      localStorage.setItem('odm_rates_cache', JSON.stringify({ d: today, r: _odmRatesCache }));
    } catch (e2) {
      // LocalStorage cache
      try { var c = JSON.parse(localStorage.getItem('odm_rates_cache') || '{}'); if (c.r) { _odmRatesCache = c.r; _odmRatesDate = c.d; } } catch(e3) {}
    }
  }
}

// Sayfa yüklenince kur çek
if (typeof window !== 'undefined') {
  setTimeout(() => _odmFetchTCMB().catch(() => {}), 2000);
  // İlk yüklemede localStorage verisini Firestore'a BİR KEZ yaz (sonsuz döngü koruması)
  setTimeout(function() {
    if (window._odmInitialSyncDone) return;
    window._odmInitialSyncDone = true;
    try {
      var FB_DB = window.Auth?.getFBDB?.();
      if (!FB_DB || !window.Auth?.getFBAuth?.()?.currentUser) {
        console.info('[Ödemeler] İlk yükleme — Firebase hazır değil, yazma atlandı');
        return;
      }
      var tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
      var base = 'duay_' + tid;
      // Ödemeler — sadece Firestore boşsa yaz
      var odmData = typeof loadOdm === 'function' ? loadOdm() : [];
      if (odmData.length) {
        FB_DB.collection(base).doc('odemeler').get().then(function(snap) {
          var fsData = snap.exists ? snap.data()?.data : null;
          if (!fsData || !Array.isArray(fsData) || fsData.length === 0) {
            if (typeof storeOdm === 'function') storeOdm(odmData);
            console.info('[Ödemeler] İlk yükleme — odemeler Firestore\'a yazıldı:', odmData.length);
          }
        }).catch(function() {});
      }
      // Tahsilat — sadece Firestore boşsa yaz
      var tahData = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
      if (tahData.length) {
        FB_DB.collection(base).doc('tahsilat').get().then(function(snap) {
          var fsData = snap.exists ? snap.data()?.data : null;
          if (!fsData || !Array.isArray(fsData) || fsData.length === 0) {
            if (typeof storeTahsilat === 'function') storeTahsilat(tahData);
            console.info('[Ödemeler] İlk yükleme — tahsilat Firestore\'a yazıldı:', tahData.length);
          }
        }).catch(function() {});
      }
    } catch(e) { console.warn('[Ödemeler] İlk Firestore yazma hatası:', e); }
  }, 5000);
}

function _odmToTRY(amount, currency) {
  const rates = _odmGetRates();
  const rate = rates[currency] || 1;
  return parseFloat(amount || 0) * rate;
}

function _odmFmtAmt(amount, currency) {
  const cur = ODM_CURRENCY[currency] || ODM_CURRENCY.TRY;
  const val = parseFloat(amount || 0);
  if (currency === 'XAU' || currency === 'XAG') {
    return val.toLocaleString('tr-TR', { minimumFractionDigits: 3 }) + ' ' + cur.sym;
  }
  return cur.sym + val.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
}

function _odmTLKarsiligi(amount, currency) {
  if (!amount || currency === 'TRY') return '';
  const tl = _odmToTRY(amount, currency);
  return '≈ ₺' + Math.round(tl).toLocaleString('tr-TR');
}

// Kur modu HTML seçici — modal içinde kullanılır
function _odmKurModeHTML(cur) {
  var rates = _odmGetRates();
  var rate = rates[cur] || 1;
  var kurCfg = _odmLoadKurConfig();
  var allowManuel = kurCfg.allowOverride !== false;
  var sourceLabel = ODM_KUR_SOURCES[kurCfg.source || 'tcmb']?.l || 'TCMB';
  return '<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--s2);border-radius:8px;margin-top:4px">'
    + '<span style="font-size:10px;color:var(--t3)">Kur:</span>'
    + '<select id="odm-kur-mode" onchange="_odmKurModeChange(this.value)" style="font-size:10px;border:none;background:none;color:var(--t2);cursor:pointer">'
    + '<option value="alis"' + (_odmRatesMode==='alis'?' selected':'') + '>MB Alış</option>'
    + '<option value="satis"' + (_odmRatesMode==='satis'?' selected':'') + '>MB Satış</option>'
    + (allowManuel ? '<option value="manuel"' + (_odmRatesMode==='manuel'?' selected':'') + '>Manuel</option>' : '')
    + '</select>'
    + '<span id="odm-kur-val" style="font-size:11px;font-weight:500;color:var(--t)">₺' + rate.toLocaleString('tr-TR', {minimumFractionDigits:4,maximumFractionDigits:4}) + '</span>'
    + (allowManuel ? '<input type="number" id="odm-kur-manuel" style="font-size:11px;width:80px;border:0.5px solid var(--b);border-radius:6px;padding:2px 6px;display:' + (_odmRatesMode==='manuel'?'block':'none') + '"'
    + ' placeholder="Kur girin" oninput="_odmManualRateInput(this)">' : '')
    + '<span id="odm-kur-date" style="font-size:9px;color:var(--t3);margin-left:auto">' + sourceLabel + ' · ' + (_odmRatesDate||'Statik') + '</span>'
    + '</div>';
}

function _odmKurModeChange(mode) {
  _odmRatesMode = mode;
  const el = document.getElementById('odm-kur-manuel');
  if (el) el.style.display = mode === 'manuel' ? 'block' : 'none';
  _odmUpdateKurDisplay();
}

function _odmManualRateInput(el) {
  const cur = document.getElementById('odm-f-currency')?.value
           || document.getElementById('tah-f-currency')?.value || 'USD';
  _odmManualRates[cur] = parseFloat(el.value) || 0;
  _odmUpdateKurDisplay();
  _odmUpdateTLPreview();
}

function _odmUpdateKurDisplay() {
  const cur = document.getElementById('odm-f-currency')?.value
           || document.getElementById('tah-f-currency')?.value || '';
  if (!cur || cur === 'TRY') return;
  const rates = _odmGetRates();
  const el = document.getElementById('odm-kur-val');
  if (el) el.textContent = '₺' + (rates[cur]||0).toLocaleString('tr-TR', {minimumFractionDigits:4,maximumFractionDigits:4});
}

function _odmUpdateTLPreview() {
  const amtEl  = document.getElementById('odm-f-amount') || document.getElementById('tah-f-amount');
  const curEl  = document.getElementById('odm-f-currency') || document.getElementById('tah-f-currency');
  const prvEl  = document.getElementById('odm-tl-preview');
  if (!amtEl || !curEl || !prvEl) return;
  const cur = curEl.value;
  const amt = parseFloat(amtEl.value) || 0;
  if (!amt || cur === 'TRY') { prvEl.textContent = ''; return; }
  prvEl.textContent = _odmTLKarsiligi(amt, cur);
}

window._odmKurModeChange   = _odmKurModeChange;
window._odmManualRateInput = _odmManualRateInput;
window._odmUpdateTLPreview = _odmUpdateTLPreview;
window._odmUpdateKurDisplay = _odmUpdateKurDisplay;
window._odmFetchTCMB       = _odmFetchTCMB;

/**
 * Hatırlatıcı hızlı butonları — değer ve birim ayarlar.
 */
function _odmSetReminder(val, unit) {
  var valEl = document.getElementById('odm-f-reminder-val');
  var unitEl = document.getElementById('odm-f-reminder-unit');
  if (valEl) valEl.value = val;
  if (unitEl) unitEl.value = unit;
  // Tarih+saat otomatik hesapla
  _odmCalcReminderDate();
}

/**
 * Vadeye göre hatırlatıcı tarihini otomatik hesaplar.
 */
function _odmAutoReminder() {
  var dueEl = document.getElementById('odm-f-due');
  if (!dueEl?.value) { window.toast?.('Önce son tarih girin', 'warn'); return; }
  var due = new Date(dueEl.value);
  var diff = Math.ceil((due - new Date()) / 86400000);
  // Akıllı seçim: <3 gün→1gün, <14 gün→3gün, <60 gün→1hafta, else→1ay
  if (diff <= 3) _odmSetReminder(1, 'gun');
  else if (diff <= 14) _odmSetReminder(3, 'gun');
  else if (diff <= 60) _odmSetReminder(1, 'hafta');
  else _odmSetReminder(1, 'ay');
  window.toast?.('Hatırlatıcı otomatik ayarlandı', 'ok');
}

/**
 * Reminder değer/biriminden alarm tarihini hesaplar ve date inputa yazar.
 */
function _odmCalcReminderDate() {
  var dueEl = document.getElementById('odm-f-due');
  var dateEl = document.getElementById('odm-f-alarm-date');
  if (!dueEl?.value || !dateEl) return;
  var due = new Date(dueEl.value);
  var val = parseInt(document.getElementById('odm-f-reminder-val')?.value || '3') || 3;
  var unit = document.getElementById('odm-f-reminder-unit')?.value || 'gun';
  switch(unit) {
    case 'dakika': due.setMinutes(due.getMinutes() - val); break;
    case 'saat':   due.setHours(due.getHours() - val); break;
    case 'gun':    due.setDate(due.getDate() - val); break;
    case 'hafta':  due.setDate(due.getDate() - val * 7); break;
    case 'ay':     due.setMonth(due.getMonth() - val); break;
  }
  dateEl.value = due.toISOString().slice(0, 10);
}

window._odmSetReminder    = _odmSetReminder;
window._odmAutoReminder   = _odmAutoReminder;
window._odmCalcReminderDate = _odmCalcReminderDate;
const ODM_STATUS = {
  bekliyor: { l:'Bekliyor',  ic:'📅', cls:'bb' },
  odendi:   { l:'Ödendi',    ic:'✅', cls:'bg' },
  gecikti:  { l:'Gecikti',   ic:'🚨', cls:'br' },
  yaklasan: { l:'Yaklaşıyor',ic:'⚠️', cls:'ba' },
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — ALARM SİSTEMİ
// ════════════════════════════════════════════════════════════════

function checkOdmAlarms() {
  const items  = window.loadOdm ? loadOdm() : [];
  const today  = _todayStr();
  const todayD = new Date(today);
  let alarmed  = 0;

  items.forEach(o => {
    if (!o.due || o.paid) return;
    const dueD  = new Date(o.due);
    const diff  = Math.ceil((dueD - todayD) / 86400000);
    const warn  = o.alarmDays || 3; // varsayılan 3 gün önce uyar

    // Gecikmiş
    if (diff < 0) {
      const key = 'odm_alarm_late_' + o.id;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('🚨', `Gecikmiş ödeme: "${o.name}" — ${Math.abs(diff)} gün gecikmiş`, 'err', 'odemeler');
        localStorage.setItem(key, today);
      }
    }
    // Yaklaşıyor
    else if (diff <= warn) {
      const key = 'odm_alarm_soon_' + o.id + '_' + today;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('⚠️', `"${o.name}" için ödeme günü yaklaşıyor — ${diff} gün kaldı`, 'warn', 'odemeler');
        localStorage.setItem(key, '1');
        alarmed++;
      }
    }

    // Dekont eksik — ödendi ama dekont yüklenmemiş
    if (o.paid && !o.receipt) {
      const key = 'odm_alarm_receipt_' + o.id;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('📎', `"${o.name}" ödemesi için dekont bekleniyor`, 'warn', 'odemeler');
        localStorage.setItem(key, '1');
      }
    }
  });

  return alarmed;
}

// Periyodik alarm kontrolü — her 30 dakika
function startOdmAlarmTimer() {
  checkOdmAlarms();
  _checkSozlesmeBitis();
  _checkRecurringOdm();
  setInterval(() => {
    checkOdmAlarms();
    _checkSozlesmeBitis();
    _checkRecurringOdm();
  }, 30 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectOdmPanel() {
  const panel = _go('panel-odemeler');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = [
    // STICKY WRAPPER — toolbar + metrik kartları birlikte sabit
    '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">',
    // TOPBAR — modern flat
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">',
      '<div>',
        '<div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">Nakit Akışı</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:2px" id="odm-sub-title">Yükleniyor...</div>',
      '</div>',
      '<div style="display:flex;gap:6px;align-items:center">',
        '<button onclick="openOdmChart()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.color=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.color=\'var(--t2)\'">Grafik</button>',
        '<button onclick="exportOdmXlsx()" id="odm-excel-btn" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">Excel</button>',
        '<button onclick="openOdmTrashPanel()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">🗑</button>',
        '<button onclick="window._openOdmImportModal?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">📥 İçe Aktar</button>',
        '<button onclick="openTahsilatModal(null)" style="padding:7px 14px;border:none;border-radius:7px;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .12s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">+ Tahsilat</button>',
        '<button onclick="openOdmModal(null)" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .12s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">+ Ödeme Ekle</button>',
      '</div>',
    '</div>',

    // METRİK KARTLARI — 4 kart, sidebar yok
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;border-bottom:0.5px solid var(--b)">',
      '<div style="padding:16px 20px;border-right:0.5px solid var(--b)">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Toplam Yükümlülük</div>',
        '<div style="font-size:24px;font-weight:600;color:var(--t);letter-spacing:-.02em" id="odm-bento-total-amt">₺0</div>',
        '<div style="height:3px;background:var(--s2);border-radius:99px;margin-top:10px;overflow:hidden">',
          '<div id="odm-prog-bar" style="height:100%;width:0%;background:var(--ac);border-radius:99px;transition:width .5s"></div>',
        '</div>',
        '<div style="display:flex;justify-content:space-between;margin-top:4px">',
          '<span style="font-size:9px;color:var(--ac)" id="odm-prog-pct">0% ödendi</span>',
          '<span style="font-size:9px;color:var(--t3)" id="odm-bento-ratio">0/0</span>',
        '</div>',
      '</div>',
      '<div id="odm-bento-gecikti" data-bentotab="gecikti" style="padding:16px 20px;border-right:0.5px solid var(--b);cursor:pointer;transition:background .12s" onmouseover="this.style.background=\'rgba(239,68,68,.04)\'" onmouseout="this.style.background=\'\'">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Gecikmiş</div>',
        '<div style="font-size:24px;font-weight:600;color:#EF4444" id="odm-stat-late">0</div>',
        '<div style="font-size:10px;color:#EF4444;margin-top:6px" id="odm-bento-late-hint">Hemen öde</div>',
      '</div>',
      '<div id="odm-bento-hafta" data-bentotab="bekliyor" style="padding:16px 20px;border-right:0.5px solid var(--b);cursor:pointer;transition:background .12s" onmouseover="this.style.background=\'rgba(217,119,6,.04)\'" onmouseout="this.style.background=\'\'">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Bu Hafta Vadeli</div>',
        '<div style="font-size:24px;font-weight:600;color:#D97706" id="odm-stat-soon">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:6px" id="odm-bento-week-amt">₺0</div>',
      '</div>',
      '<div id="odm-bento-ay" data-bentotab="ay" style="padding:16px 20px;cursor:pointer;transition:background .12s" onmouseover="this.style.background=\'rgba(16,185,129,.04)\'" onmouseout="this.style.background=\'\'">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Bu Ay Ödendi</div>',
        '<div style="font-size:24px;font-weight:600;color:#10B981" id="odm-stat-paid">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:6px" id="odm-bento-paid-amt">₺0</div>',
      '</div>',
    '</div>',

    // TAB NAVİGASYON — sticky wrapper içinde
    '<div id="odm-tabs-row" style="display:flex;border-bottom:0.5px solid var(--b);background:var(--sf);overflow-x:auto;scrollbar-width:none;padding:0 16px">',
      '<div id="odm-stab-all" onclick="setOdmTab(\'all\')" style="padding:11px 18px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;border-bottom:2px solid var(--ac);color:var(--ac);transition:all .12s">Tümü <span id="odm-stat-total" style="font-size:10px;opacity:.7">0</span></div>',
      '<div id="odm-stab-gecikti" onclick="setOdmTab(\'gecikti\')" style="padding:11px 18px;font-size:12px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Ödemeler</div>',
      '<div id="odm-stab-tahsilat" onclick="setOdmTab(\'tahsilat\')" style="padding:11px 18px;font-size:12px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Tahsilatlar</div>',
      '<div id="odm-stab-bekliyor" onclick="setOdmTab(\'bekliyor\')" style="padding:11px 18px;font-size:12px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Bekleyen</div>',
      '<div id="odm-stab-projeksiyon" onclick="setOdmTab(\'projeksiyon\')" style="padding:11px 18px;font-size:12px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Projeksiyon</div>',
    '</div>',

    // ARAMA + FİLTRELER — tek satır flat
    '<div style="padding:10px 20px;border-bottom:0.5px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center">',
      '<div style="position:relative;flex:1;min-width:200px">',
        '<svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%)" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="4.5" stroke="var(--t3)" stroke-width="1.3"/><path d="M10 10l2 2" stroke="var(--t3)" stroke-width="1.3" stroke-linecap="round"/></svg>',
        '<input class="fi" type="search" id="odm-search" placeholder="Ödeme, kategori veya cari ara…" oninput="renderOdemeler()" style="padding-left:32px;border-radius:7px;border:0.5px solid var(--b);background:var(--sf)">',
      '</div>',
      '<select class="fi" id="odm-cat-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:130px;border:0.5px solid var(--b)">',
        '<option value="">Tüm Kategoriler</option>',
        Object.entries(ODM_CATS).map(([k,v]) => `<option value="${k}">${v.ic} ${v.l}</option>`).join(''),
      '</select>',
      '<select class="fi" id="odm-status-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:120px;border:0.5px solid var(--b)">',
        '<option value="">Tüm Durumlar</option>',
        '<option value="bekliyor">Bekliyor</option><option value="gecikti">Gecikmiş</option><option value="odendi">Ödendi</option>',
      '</select>',
      '<input type="date" class="fi" id="odm-from-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:125px;border:0.5px solid var(--b)" title="Başlangıç">',
      '<input type="date" class="fi" id="odm-to-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:125px;border:0.5px solid var(--b)" title="Bitiş">',
      '<select class="fi" id="odm-cari-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:130px;border:0.5px solid var(--b)"><option value="">Tüm Cariler</option></select>',
      '<select class="fi" id="odm-cur-f" onchange="renderOdemeler()" style="border-radius:7px;font-size:11px;width:80px;border:0.5px solid var(--b)"><option value="">Döviz</option><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select>',
      '<select class="fi" id="odm-user-f" onchange="renderOdemeler()" style="display:none"><option value=""></option></select>',
      '<select class="fi" id="odm-freq-f" onchange="renderOdemeler()" style="display:none"><option value=""></option></select>',
      (_isManagerO() ? '<button onclick="window._odmBulkApprove?.()" style="padding:5px 10px;border:0.5px solid #16A34A;border-radius:7px;background:rgba(22,163,74,.06);color:#16A34A;font-size:11px;cursor:pointer;font-family:inherit">✅ Toplu Onayla</button>' : ''),
      '<button onclick="_odmClearFilters()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t3);font-size:11px;cursor:pointer;font-family:inherit" title="Filtreleri temizle">✕</button>',
    '</div>',
    '</div>', // sticky wrapper close (toolbar+metrik+tab+filtre)

    // Tablo CSS — modern flat
    '<style>',
    '.odm-chip{font-size:10px;padding:3px 9px;border-radius:99px;border:0.5px solid var(--b);background:var(--sf);color:var(--t2);cursor:pointer;white-space:nowrap;transition:all .12s}',
    '.odm-chip:hover{border-color:var(--ac);color:var(--ac)}',
    '.odm-chip-active{background:var(--ac)!important;color:#fff!important;border-color:var(--ac)!important}',
    '#odm-list>div{transition:background .1s}',
    '#odm-list>div:hover{background:var(--s2)!important}',
    '</style>',

    // TABLO BAŞLIK — beyaz kart içinde
    '<div style="margin:12px 20px 0;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden">',
    '<div id="odm-thead" style="display:grid;grid-template-columns:32px 1fr 110px 100px 90px 130px;gap:0;padding:8px 16px;border-bottom:0.5px solid var(--b);background:var(--s2)">',
      '<div></div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Ödeme</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Tutar</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Son Tarih</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlem</div>',
    '</div>',

    '<div id="odm-list"></div>',
    '</div>', // beyaz kart close
  ].join('');

  // Sekme click
  const tabsRow = _go('odm-tabs-row');
  if (tabsRow) {
    tabsRow.addEventListener('click', e => {
      const el = e.target.closest('[id^="odm-stab-"]');
      if (!el) return;
      setOdmTab(el.id.replace('odm-stab-', ''));
    });
  }

  _fillOdmUserFilter();
  checkOdmRecurring();
  checkOdmDocExpiry();

  // Sol panel highlight
  setTimeout(function() {
    document.querySelectorAll('.odm-nav-btn').forEach(function(b) {
      var active = b.dataset.nav === (window._odmActiveCat || 'odeme');
      b.style.background = active ? '#EBF2FF' : 'transparent';
      b.style.color = active ? '#007AFF' : '#333';
      b.style.fontWeight = active ? '600' : '400';
    });
  }, 50);
}

/**
 * Sol panel navigasyon tıklama.
 */
window._odmNavClick = function(cat) {
  window._odmActiveCat = cat;
  // Sekme eşleştir
  var tabMap = { odeme:'all', tahsilat:'tahsilat', bekleyen:'bekliyor', projeksiyon:'projeksiyon' };
  if (tabMap[cat]) { setOdmTab(tabMap[cat]); }
  else if (cat === 'cari') { window.nav?.('cari'); return; }
  else if (cat === 'butce') { window.openBudgetManager?.(); return; }
  // Excel butonunu güncelle — tahsilat sekmesinde tahsilat export
  var _xlBtn = document.getElementById('odm-excel-btn');
  if (_xlBtn) {
    _xlBtn.onclick = cat === 'tahsilat' ? exportTahsilatXlsx : exportOdmXlsx;
  }
  // Highlight güncelle
  document.querySelectorAll('.odm-nav-btn').forEach(function(b) {
    var active = b.dataset.nav === cat;
    b.style.background = active ? '#EBF2FF' : 'transparent';
    b.style.color = active ? '#007AFF' : '#333';
    b.style.fontWeight = active ? '600' : '400';
  });
};

function _fillOdmUserFilter() {
  const sel = _go('odm-user-f'); if (!sel) return;
  const users = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const cur   = sel.value;
  sel.innerHTML = '<option value="">Tüm Sorumlular</option>'
    + users.map(u => `<option value="${u.id}"${cur==u.id?' selected':''}>${u.name}</option>`).join('');
}


// ════════════════════════════════════════════════════════════════
// SEKME YÖNETİMİ  [v2.0]
// ════════════════════════════════════════════════════════════════
let _odmCurrentTab = 'all';

function setOdmTab(tab) {
  _odmCurrentTab = tab;
  const tabIds = ['all','gecikti','bekliyor','ay','abonelik','kredi_k','tahsilat','projeksiyon'];
  // Eski tab ID'leri de destekle
  tabIds.forEach(t => {
    const el = _go('odm-stab-' + t);
    if (!el) return;
    const active = t === tab;
    const acColor = t==='gecikti'?'var(--rdt)':t==='tahsilat'?'var(--grt)':'var(--ac)';
    el.style.borderBottomColor = active ? acColor : 'transparent';
    el.style.color = active ? acColor : (t==='gecikti'?'var(--rdt)':t==='tahsilat'?'var(--grt)':'var(--t3)');
    el.style.fontWeight = active ? '600' : '400';
  });
  // Bento kutu vurgusu
  ['odm-bento-gecikti','odm-bento-hafta','odm-bento-ay'].forEach(id => {
    const el = _go(id); if (el) el.style.background = '';
  });
  if (tab === 'gecikti'  && _go('odm-bento-gecikti')) _go('odm-bento-gecikti').style.background = 'rgba(254,242,242,.6)';
  if (tab === 'bekliyor' && _go('odm-bento-hafta'))   _go('odm-bento-hafta').style.background   = 'rgba(255,251,235,.6)';
  if (tab === 'ay'       && _go('odm-bento-ay'))       _go('odm-bento-ay').style.background       = 'rgba(236,253,245,.6)';
  const thead = _go('odm-thead');
  if (thead) thead.style.display = (tab==='kredi_k'||tab==='abonelik'||tab==='tahsilat'||tab==='projeksiyon') ? 'none' : 'grid';
  renderOdemeler();
}
window.setOdmTab = setOdmTab;

// ════════════════════════════════════════════════════════════════
// KREDİ KARTI ÖZEL KART  [v2.0]
// ════════════════════════════════════════════════════════════════
function _renderKrediKarti(o, users) {
  const today   = _todayStr();
  const todayD  = new Date(today);
  const kd      = o.kesiimTarihi || '';  // hesap kesim günü
  const od      = o.odemeGunu    || '';  // ödeme günü
  const limit   = parseFloat(o.limit  || 0);
  const bakiye  = parseFloat(o.bakiye || 0);
  const kul     = limit > 0 ? Math.round(bakiye / limit * 100) : 0;
  const kulColor = kul >= 80 ? '#EF4444' : kul >= 50 ? '#F97316' : '#10B981';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:0;margin-bottom:10px;overflow:hidden;transition:box-shadow .15s';
  card.onmouseenter = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)';
  card.onmouseleave = () => card.style.boxShadow = '';

  card.innerHTML = `
    <div style="background:linear-gradient(135deg,#1e1b4b,#3730a3);padding:16px 20px;color:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${o.name}</div>
          <div style="font-size:11px;opacity:.7">${o.banka||'Banka'} • ${o.sonDortHane?'**** '+o.sonDortHane:''}</div>
        </div>
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none"><rect width="32" height="24" rx="4" fill="rgba(255,255,255,.15)"/><circle cx="12" cy="12" r="8" fill="#EB001B" opacity=".8"/><circle cx="20" cy="12" r="8" fill="#F79E1B" opacity=".8"/></svg>
      </div>
      <div style="display:flex;gap:24px">
        <div>
          <div style="font-size:10px;opacity:.6">Limit</div>
          <div style="font-size:15px;font-weight:600">₺${limit.toLocaleString('tr-TR')}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:.6">Kullanılan</div>
          <div style="font-size:15px;font-weight:600">₺${bakiye.toLocaleString('tr-TR')}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:.6">Kullanım</div>
          <div style="font-size:15px;font-weight:600;color:${kulColor === '#EF4444'?'#fca5a5':kulColor==='#F97316'?'#fed7aa':'#86efac'}">${kul}%</div>
        </div>
      </div>
    </div>
    <div style="padding:12px 20px">
      <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${kul}%;background:${kulColor};border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">
        <div><div style="font-size:10px;color:var(--t3)">Hesap Kesim</div><div style="font-size:12px;font-weight:600;color:var(--t)">${kd ? 'Her ayın '+kd+'. günü' : '—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Son Ödeme</div><div style="font-size:12px;font-weight:600;color:${o.due&&o.due<today?'#EF4444':'var(--t)'};">${o.due||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Minimum Ödeme</div><div style="font-size:12px;font-weight:600;color:var(--t)">₺${(parseFloat(o.minOdeme||0)).toLocaleString('tr-TR')}</div></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:8px;padding:5px 12px">✓ Ödendi</button>` : `<button onclick="toggleOdmPaid(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px">↩ Geri Al</button>`}
        ${o.paid && !o.receipt ? `<button onclick="uploadOdmReceipt(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px;color:#D97706">📎 Dekont</button>` : ''}
        <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:5px 10px;border-radius:8px">✏️ Düzenle</button>
      </div>
    </div>`;

  return card;
}

// ════════════════════════════════════════════════════════════════
// ABONELİK ÖZEL KART  [v2.0]
// ════════════════════════════════════════════════════════════════
function _renderAbonelikKart(o, users, today, todayD) {
  const status  = o.paid ? 'odendi' : (o.due && o.due < today ? 'gecikti' : (o.due && Math.ceil((new Date(o.due)-todayD)/86400000) <= 7 ? 'yaklasan' : 'bekliyor'));
  const sta     = ODM_STATUS[status];
  const dueD    = o.due ? new Date(o.due) : null;
  const diff    = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
  const abone   = ODM_ABONE_TYPES[o.abonelikTipi] || ODM_ABONE_TYPES.diger;

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s';
  if (status === 'gecikti') card.style.borderColor = 'var(--rd)';
  if (status === 'yaklasan') card.style.borderColor = 'var(--am)';
  card.onmouseenter = () => card.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)';
  card.onmouseleave = () => card.style.boxShadow = '';

  card.innerHTML = `
    <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${abone.ic}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:600;color:var(--t)">${o.name}</span>
        <span style="font-size:10px;padding:1px 7px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5">${abone.l}</span>
        <span class="badge ${sta.cls}" style="font-size:10px">${sta.ic} ${sta.l}</span>
        ${o.sozlesme ? '<span style="font-size:10px;color:var(--ac);cursor:pointer" onclick="viewOdmReceipt('+o.id+')">📄 Sözleşme</span>' : ''}
      </div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:700;color:var(--t)">₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}<span style="font-size:10px;font-weight:400;color:var(--t3)">/${ODM_FREQ[o.freq]||'ay'}</span></span>
        <span style="font-size:11px;color:${status==='gecikti'?'var(--rdt)':status==='yaklasan'?'var(--amt)':'var(--t3)'}">📅 ${o.due||'—'} ${diff!==null?'('+( diff<0?Math.abs(diff)+' gün gecikti':diff===0?'Bugün!':diff+' gün kaldı')+')'  :''}</span>
        ${o.sozlesmeBitis ? '<span style="font-size:10px;color:var(--t3)">Sözleşme bitiş: '+o.sozlesmeBitis+'</span>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:5px;flex-shrink:0">
      ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:7px;padding:4px 10px">✓ Ödendi</button>` : ''}
      <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:4px 8px;border-radius:7px">✏️</button>
    </div>`;

  return card;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — RENDER
// ════════════════════════════════════════════════════════════════

function renderOdemeler() {
  _injectOdmPanel();
  checkOdmSLA();
  if (!_tickerInterval) _startKurTicker(); else renderKurTicker();
  const today   = _todayStr();
  const todayD  = new Date(today);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0,10);
  const thisMonth  = today.slice(0,7);

  // Tahsilat tab'ı seçiliyse loadTahsilat, diğer tab'larda loadOdm
  const _cuOdm  = _CUo();
  let _allRaw;
  if (_odmCurrentTab === 'tahsilat') {
    _allRaw = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  } else if (_odmCurrentTab === 'bekliyor') {
    // Bekleyen: hem ödeme hem tahsilat pending kayıtlarını birleştir
    var _odmPending = (window.loadOdm ? loadOdm() : []).map(function(o) { o._src = 'odeme'; return o; });
    var _tahPending = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).map(function(t) { t._src = 'tahsilat'; return t; });
    _allRaw = _odmPending.concat(_tahPending);
  } else {
    _allRaw = window.loadOdm ? loadOdm() : [];
  }
  // Soft-deleted kayıtları gizle (admin dahil — ayrı çöp kutusu panelinden görülür)
  var _activeRaw = _allRaw.filter(function(o) { return !o.isDeleted; });
  const all = _isManagerO() ? _activeRaw : _activeRaw.filter(o => o.createdBy === _cuOdm?.id || o.uid === _cuOdm?.id);

  // Cari dropdown doldur (ilk çağrıda)
  var _cariSel = _go('odm-cari-f');
  if (_cariSel && _cariSel.options.length <= 1) {
    var _cariNames = [];
    all.forEach(function(o) { if (o.cariName && _cariNames.indexOf(o.cariName) === -1) _cariNames.push(o.cariName); });
    _cariNames.sort().forEach(function(n) { _cariSel.insertAdjacentHTML('beforeend', '<option value="' + n + '">' + n + '</option>'); });
  }

  // Filtreler
  const q      = (_go('odm-search')?.value || '').toLowerCase();
  const catF   = _go('odm-cat-f')?.value   || '';
  const freqF  = _go('odm-freq-f')?.value  || '';
  const statF  = _go('odm-status-f')?.value || '';
  const userF  = _go('odm-user-f')?.value  || '';
  var cariF    = _go('odm-cari-f')?.value   || '';
  var curF     = _go('odm-cur-f')?.value    || '';

  function _getStatus(o) {
    if (o.paid) return 'odendi';
    if (o.due && o.due < today) return 'gecikti';
    if (o.due && o.due <= weekEndStr) return 'yaklasan';
    return 'bekliyor';
  }

  // Tab + Chip filtresi
  const today2 = _todayStr();
  const chipSrc    = _odmActiveFilters?.src    || '';
  const chipCat    = _odmActiveFilters?.cat    || '';
  const chipStatus = _odmActiveFilters?.status || '';

  let items = all.filter(o => {
    const st = _getStatus(o);

    // Sekme filtresi
    if (_odmCurrentTab === 'abonelik' && o.cat !== 'abonelik') return false;
    if (_odmCurrentTab === 'kredi_k'  && o.cat !== 'kredi_k')  return false;
    if (_odmCurrentTab === 'bekliyor' && st !== 'bekliyor' && st !== 'yaklasan' && !['pending','ara_onay_bekleniyor','final_onay_bekleniyor'].includes(o.approvalStatus)) return false;
    if (_odmCurrentTab === 'gecikti'  && st !== 'gecikti')  return false;
    if (_odmCurrentTab === 'ay') {
      if (!(o.due||'').startsWith(thisMonth) && !(o.paidTs||'').startsWith(thisMonth)) return false;
    }

    // Chip: Kaynak filtresi
    if (chipSrc === 'manual'    && o.source && o.source !== 'manual') return false;
    if (chipSrc === 'satinalma' && o.source !== 'satinalma') return false;
    if (chipSrc === 'fatura'    && o.source !== 'fatura') return false;
    if (chipSrc === 'otomatik'  && o.source !== 'otomatik') return false;
    if (chipSrc === 'manual' && !o.source) {} // manuel = kaynak yok = normal

    // Chip: Kategori filtresi
    if (chipCat && o.cat !== chipCat) return false;

    // Chip: Durum filtresi
    if (chipStatus === 'gecikti'         && st !== 'gecikti') return false;
    if (chipStatus === 'no-receipt'      && !(o.paid && !o.receipt)) return false;
    if (chipStatus === 'pending-approval' && !['pending','ara_onay_bekleniyor','final_onay_bekleniyor'].includes(o.approvalStatus)) return false;

    // Metin arama
    if (q) {
      const users2 = window.loadUsers ? loadUsers() : [];
      const asgn = users2.find(u => u.id === o.assignedTo);
      const searchStr = [o.name, o.note, o.source, asgn?.name, ODM_CATS[o.cat]?.l].filter(Boolean).join(' ').toLowerCase();
      if (!searchStr.includes(q)) return false;
    }

    // Eski select filtreleri (geriye dönük uyumluluk)
    if (catF  && o.cat  !== catF)  return false;
    if (freqF && o.freq !== freqF) return false;
    if (userF && String(o.assignedTo) !== userF) return false;
    if (statF) {
      if (statF === 'no-receipt' && !(o.paid && !o.receipt)) return false;
      else if (statF !== 'no-receipt' && st !== statF) return false;
    }
    // Cari filtresi
    if (cariF && (o.cariName || '') !== cariF) return false;
    // Para birimi filtresi
    if (curF && (o.currency || 'TRY') !== curF) return false;
    return true;
  });

  // Tab "ay" filtresi
  if (_odmCurrentTab === 'ay') {
    items = items.filter(o => (o.due||'').startsWith(thisMonth) || (o.paidTs||'').startsWith(thisMonth));
  }

  // Stats hesapla
  const lateN  = all.filter(o => !o.paid && o.due && o.due < today).length;
  const weekN  = all.filter(o => !o.paid && o.due && o.due >= today && o.due <= weekEndStr).length;
  const paidN  = all.filter(o => o.paid && (o.paidTs||'').startsWith(thisMonth)).length;
  const totalN = all.length;
  const weekAmt = all.filter(o => !o.paid && o.due && o.due >= today && o.due <= weekEndStr)
                     .reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  const paidAmt = all.filter(o => o.paid && (o.paidTs||'').startsWith(thisMonth))
                     .reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  // Onaylanmamış ödemeler finansal toplamdan hariç
  const confirmedAll = all.filter(o => o.approved || o.approvalStatus === 'kesinlesti' || o.approvalStatus === 'approved' || !_odmNeedsApproval(o));
  const totalAmt = confirmedAll.reduce((s,o) => s + (parseFloat(o.amount)||0), 0);

  // Sekme badge güncelle
  _sto('odm-stat-total', totalN);
  _sto('odm-stat-late',  lateN);
  _sto('odm-stat-late2', lateN);
  _sto('odm-stat-soon',  weekN);
  _sto('odm-stat-soon2', weekN);
  _sto('odm-stat-paid',  paidN);
  _sto('odm-stat-paid2', paidN);

  // Bento kutular güncelle
  const bentoAmt = _go('odm-bento-total-amt');
  if (bentoAmt) bentoAmt.textContent = '₺' + Math.round(totalAmt).toLocaleString('tr-TR');
  _sto('odm-bento-ratio', paidN + '/' + totalN);
  _sto('odm-bento-week-amt', '₺' + Math.round(weekAmt).toLocaleString('tr-TR'));
  _sto('odm-bento-paid-amt', '₺' + Math.round(paidAmt).toLocaleString('tr-TR'));
  _sto('odm-bento-late-hint', lateN > 0 ? lateN + ' ödeme gecikmiş' : 'Temiz');

  // Alt başlık
  const subTitle = _go('odm-sub-title');
  if (subTitle) {
    const d = new Date();
    subTitle.textContent = d.toLocaleString('tr-TR', {month:'long', year:'numeric'}) + ' · ' + paidN + '/' + totalN + ' ödendi';
  }

  // Progress bar
  const pct = totalN > 0 ? Math.round(paidN / totalN * 100) : 0;
  const barEl = _go('odm-prog-bar'); if (barEl) barEl.style.width = pct + '%';
  const pctEl = _go('odm-prog-pct'); if (pctEl) pctEl.textContent = pct + '% ödendi';

  // Vade uyumsuzluğu uyarısı (admin only)
  var _mismatchEl = document.getElementById('odm-mismatch-warn');
  if (!_mismatchEl && _isManagerO()) {
    _mismatchEl = document.createElement('div');
    _mismatchEl.id = 'odm-mismatch-warn';
    var _bentoParent = _go('odm-bento-gecikti')?.parentElement;
    if (_bentoParent) _bentoParent.parentElement.insertBefore(_mismatchEl, _bentoParent.nextSibling);
  }
  if (_mismatchEl && _isManagerO()) {
    var mm = _checkDurationMismatch();
    if (mm) {
      _mismatchEl.innerHTML = '<div style="padding:8px 20px;background:#FEF2F2;border-bottom:0.5px solid #FECACA;font-size:12px;color:#991B1B;display:flex;align-items:center;gap:8px">'
        + '<span style="font-size:16px">🚨</span>'
        + '<span><b>' + mm.days + ' gün içinde</b> ₺' + mm.gap.toLocaleString('tr-TR') + ' nakit açığı oluşacak (Ödeme: ₺' + mm.odm30.toLocaleString('tr-TR') + ' / Tahsilat: ₺' + mm.tah30.toLocaleString('tr-TR') + ')</span>'
        + '</div>';
    } else {
      _mismatchEl.innerHTML = '';
    }
  }

  // Tab "ay" filtresi
  if (_odmCurrentTab === 'ay') {
    items = items.filter(o => (o.due||'').startsWith(thisMonth) || (o.paidTs||'').startsWith(thisMonth));
  }

  const cont = _go('odm-list'); if (!cont) return;

  // Projeksiyon sekmesi — özel render
  if (_odmCurrentTab === 'projeksiyon') {
    _renderProjeksiyonTab(cont);
    return;
  }

  if (!items.length) {
    cont.innerHTML = '<div style="text-align:center;padding:56px;color:var(--t2)">'
      + '<div style="font-size:40px;margin-bottom:12px">💳</div>'
      + '<div style="font-size:15px;font-weight:500">Kayıt bulunamadı</div>'
      + '<div style="margin-top:12px"><button class="btn btnp" onclick="openOdmModal()">+ İlk Ödemeyi Ekle</button></div>'
      + '</div>';
    return;
  }

  const users = window.loadUsers ? loadUsers() : [];
  items = items.sort((a,b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1; if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  const frag = document.createDocumentFragment();

  items.forEach(o => {
    // Kredi kartı özel render
    if (o.cat === 'kredi_k') {
      frag.appendChild(_renderKrediKarti(o, users));
      return;
    }
    // Abonelik özel render
    if (o.cat === 'abonelik') {
      frag.appendChild(_renderAbonelikKart(o, users, today, todayD));
      return;
    }

    const cat    = ODM_CATS[o.cat]  || ODM_CATS.diger;
    const freq   = ODM_FREQ[o.freq] || '—';
    const status = _getStatus(o);
    const sta    = ODM_STATUS[status];
    const assigned = users.find(u => u.id === o.assignedTo);
    const avc  = typeof AVC !== 'undefined' ? AVC : [['#EEEDFE','#26215C']];
    const aidx = users.indexOf(assigned);
    const aColor = assigned ? avc[Math.max(aidx,0) % avc.length] : null;
    const aIni  = assigned ? (assigned.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : null;

    const dueD   = o.due ? new Date(o.due) : null;
    const diff   = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
    const diffTxt = diff === null ? '—'
      : diff < 0  ? `${Math.abs(diff)} gün gecikti`
      : diff === 0 ? 'Bugün!'
      : diff === 1 ? 'Yarın'
      : `${diff} gün kaldı`;

    const noReceipt = o.paid && !o.receipt;

    // TABLO SATIRI — Tasarım 3 + 10 öneri
    const rowBg = status==='gecikti' ? 'rgba(254,242,242,.5)' : status==='yaklasan' ? 'rgba(255,251,235,.5)' : 'var(--sf)';
    const card = document.createElement('div');
    card.dataset.oid = String(o.id);
    card.style.cssText = 'display:grid;grid-template-columns:28px 1fr 110px 100px 80px 140px;gap:0;padding:6px 16px;border-bottom:0.5px solid var(--b);align-items:center;background:'+rowBg+';transition:background .12s;max-height:56px';
    card.onmouseenter = () => card.style.background = 'var(--s2)';
    card.onmouseleave = () => { const cb = card.querySelector('.odm-bulk-chk'); card.style.background = (cb&&cb.checked)?'var(--al)':rowBg; };

    const dueColor = status==='gecikti' ? 'var(--rdt)' : status==='yaklasan' ? 'var(--amt)' : 'var(--t2)';
    const curSym = o.currency==='USD'?'$':o.currency==='EUR'?'€':'₺';

    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center">'
        + '<input type="checkbox" class="odm-bulk-chk" data-oid="'+o.id+'" onclick="event.stopPropagation();_onBulkCheck(this)" style="width:14px;height:14px;cursor:pointer;display:'+(_odmBulkMode?'block':'none')+'">'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer" onclick="openOdmModal('+o.id+')">'
        + '<div style="width:26px;height:26px;border-radius:6px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">' + cat.ic + '</div>'
        + '<div style="min-width:0">'
          + '<div style="font-size:12px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + o.name + _odmSourceBadge(o) + (o.talimat?.durum==='aktif'?'<span style="font-size:9px;margin-left:3px" title="Otomatik ödeme talimatı aktif">🏦</span>':'') + '</div>'
          + '<div style="font-size:10px;color:var(--t3);margin-top:1px">' + cat.l + ' · ' + freq + (assigned?' · '+assigned.name:'') + (o.talimat?.banka?' · '+o.talimat.banka:'') + (noReceipt?' · <span style="color:var(--amt);cursor:help" title="Fatura belgesi yuklenmemis — dekont ekleyin">📎 eksik</span>':'') + (o.currency&&o.currency!=='TRY'?' · '+o.currency:'') + '</div>'
        + '</div>'
      + '</div>'
      + '<div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + curSym + new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(parseFloat(o.amount)||0) + '</div>'
        + (o.currency && o.currency !== 'TRY' ? (function() {
            var _kr = o.kurRate || _odmGetRates()[o.currency] || 1;
            var _tl = Math.round((parseFloat(o.amount)||0) * _kr);
            return '<div style="font-size:9px;color:var(--t3)">₺' + _tl.toLocaleString('tr-TR') + ' <span style="opacity:.6">kur: ' + _kr.toLocaleString('tr-TR') + '</span></div>';
          })() : '')
        + (o.recurringRule ? '<div style="font-size:9px;color:var(--ac)">🔁 Tekrarlayan</div>' : '')
      + '</div>'
      + '<div>'
        + '<div style="font-size:11px;font-weight:500;color:'+dueColor+'">' + (o.due||'—') + '</div>'
        + '<div style="font-size:10px;color:var(--t3)">' + diffTxt + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'
        + '<span class="badge ' + sta.cls + '" style="font-size:10px;white-space:nowrap">' + sta.ic + ' ' + sta.l + '</span>'
        + (o.approvalStatus==='pending' ? '<span style="font-size:9px;color:var(--amt);white-space:nowrap">⏳ Onay</span>' : '')
        + (status==='gecikti' || (diff!==null && diff>=0 && diff<=2) ? '<span style="font-size:9px;font-weight:700;color:#EF4444;white-space:nowrap">🔴</span>' : '')
        + (o.approvalStatus==='pending_postpone' ? '<span style="font-size:9px;color:var(--amt);white-space:nowrap">⏳ Ertele</span>' : '')
      + '</div>'
      + '<div style="display:flex;gap:2px;flex-shrink:0;align-items:center;flex-wrap:nowrap">'
        // Ana butonlar
        + (!o.paid
          ? (_odmNeedsApproval(o) && o.approvalStatus !== 'approved' && o.approvalStatus !== 'kesinlesti'
            ? (o.approvalStatus === 'pending' || o.approvalStatus === 'ara_onay_bekleniyor' || o.approvalStatus === 'final_onay_bekleniyor'
              ? '<span style="font-size:9px;padding:2px 6px;border-radius:5px;background:rgba(245,158,11,.08);color:#D97706;font-weight:500;white-space:nowrap">⏳ Onay</span>'
              : '<button onclick="openApprovalFlow('+o.id+');event.stopPropagation()" style="font-size:9px;padding:2px 6px;border:0.5px solid #D97706;border-radius:5px;background:none;color:#D97706;cursor:pointer;font-family:inherit;white-space:nowrap">Onay İste</button>')
            : '<button onclick="markOdmPaid('+o.id+');event.stopPropagation()" style="font-size:9px;padding:2px 8px;border:none;border-radius:5px;background:var(--ac);color:#fff;cursor:pointer;font-family:inherit;white-space:nowrap">Ödendi</button>')
          : '<button onclick="toggleOdmPaid('+o.id+');event.stopPropagation()" style="font-size:9px;padding:2px 6px;border:0.5px solid var(--b);border-radius:5px;background:none;color:var(--t3);cursor:pointer;font-family:inherit">↩</button>')
        + ((o.approvalStatus==='pending' || o.approvalStatus==='ara_onay_bekleniyor' || o.approvalStatus==='final_onay_bekleniyor' || o.approvalStatus==='pending_postpone') && _isManagerO()
          ? '<button onclick="processOdmApproval('+o.id+',\''+(o.approvalStatus==='final_onay_bekleniyor'?'final_onayla':'ara_onayla')+'\');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 7px;border-radius:6px;color:var(--grt)">✓ Onayla</button>' : '')
        // ··· dropdown (ikincil butonlar)
        + '<div style="position:relative" onclick="event.stopPropagation()">'
          + '<button onclick="var d=this.nextElementSibling;d.style.display=d.style.display===\'none\'?\'flex\':\'none\'" class="btn btns" style="font-size:10px;padding:3px 6px;border-radius:6px">···</button>'
          + '<div style="display:none;position:absolute;right:0;top:100%;background:var(--sf);border:1px solid var(--b);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:50;flex-direction:column;min-width:140px;overflow:hidden">'
            + '<button onclick="showOdmApprovalTimeline('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">📋 Onay Gecmisi</button>'
            + '<button onclick="window._odmToggleQuickView?.('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">👁 Hızlı Bakış</button>'
            + '<button onclick="window._odmInlineEditRow?.('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">✏️ Inline Düzenle</button>'
            + '<button onclick="openOdmModal('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">📝 Detay Düzenle</button>'
            + (o.paid && !o.receipt ? '<button onclick="uploadOdmReceipt('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--amt);font-family:inherit;border-bottom:1px solid var(--b)" title="Fatura belgesi yuklenmemis">📎 Dekont Yukle (eksik)</button>' : '')
            + ((o.cat==='abonelik'||o.cat==='fatura') ? '<button onclick="openOdmTalimatModal('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">🏦 Odeme Talimati</button>' : '')
            + '<button onclick="window._odmSaveAsTemplate?.('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">🔁 Şablon Kaydet</button>'
            + (_isManagerO() || (o.approvalStatus === 'pending' && o.createdBy === _CUo()?.id) ? '<button onclick="delOdm('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--rdt);font-family:inherit">🗑 Sil</button>' : '')
          + '</div>'
        + '</div>'
      + '</div>';

    frag.appendChild(card);
  });

  // "+ Ekle" butonu — liste altına
  var addRowDiv = document.createElement('div');
  addRowDiv.style.cssText = 'padding:10px 16px;display:flex;gap:8px;border-bottom:1px solid var(--b)';
  addRowDiv.innerHTML = '<button onclick="window._odmOpenInlineTypePicker?.()" class="btn btnp" style="font-size:12px;padding:6px 16px;font-weight:600">+ Ekle</button>';
  frag.appendChild(addRowDiv);

  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — MODAL
// ════════════════════════════════════════════════════════════════

function openOdmModal(id) {
  _injectOdmPanel();

  // Modal oluştur
  const existing = _go('mo-odm-v9');
  if (existing) existing.remove();

  const users   = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const o       = id ? (loadOdm().find(x => x.id === id) || null) : null;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-v9'; ;

  // Cari listesi — sadece onaylı cariler seçilebilir
  var cariList = typeof loadCari === 'function' ? loadCari() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cariOpts = '<option value="">— Cari Seçin * —</option>' + cariList.map(function(c) {
    var isPending = c.status === 'pending_approval';
    var label = esc(c.name) + ' (' + (c.type || '') + ')' + (isPending ? ' ⏳ Onay Bekliyor' : '');
    return '<option value="' + esc(c.name) + '"' + (o?.cariName === c.name ? ' selected' : '') + (isPending ? ' disabled style="color:#999"' : '') + '>' + label + '</option>';
  }).join('');

  // Görev listesi
  var taskList = typeof loadTasks === 'function' ? loadTasks().filter(function(t) { return !t.done; }).slice(0, 50) : [];
  var taskOpts = '<option value="">— Görev Seçin —</option>' + taskList.map(function(t) { return '<option value="' + t.id + '"' + (o?.taskId == t.id ? ' selected' : '') + '>' + esc(t.title.slice(0, 40)) + '</option>'; }).join('');

  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;overflow:hidden;border-radius:16px">'
    + '<div style="padding:16px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">' + (o ? '✏️ Ödeme Düzenle' : '+ Yeni Ödeme') + '</div>'
    + '<button onclick="document.getElementById(\'mo-odm-v9\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;max-height:74vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px">'

    // İş ID (görev) + Cari Firma
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">İŞ ID (Görev)</div><select class="fi" id="odm-f-taskid" style="border-radius:8px">' + taskOpts + '</select></div>'
    + '<div class="fr"><div class="fl">CARİ FİRMA *</div><div style="display:flex;gap:4px"><select class="fi" id="odm-f-cari" style="flex:1;border-radius:8px">' + cariOpts + '</select><button type="button" onclick="window._openQuickCari?.()" class="btn btns" style="font-size:12px;padding:3px 8px;flex-shrink:0">+</button></div></div>'
    + '</div>'

    // İsim
    + '<div class="fr"><div class="fl">ÖDEME ADI *</div>'
    + '<input class="fi" id="odm-f-name" placeholder="Örn: Ofis Kirası" style="border-radius:8px" value="' + (o?o.name||'':'') + '"></div>'

    // Kategori + Sıklık
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">KATEGORİ</div><select class="fi" id="odm-f-cat" style="border-radius:8px">'
    + Object.entries(_odmGetAllCats()).map(function(e) { return '<option value="' + e[0] + '"' + (o&&o.cat===e[0]?' selected':'') + '>' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">SIKLIK</div><select class="fi" id="odm-f-freq" style="border-radius:8px">'
    + Object.entries(ODM_FREQ).map(function(e) { return '<option value="' + e[0] + '"' + (o&&o.freq===e[0]?' selected':'') + '>' + e[1] + '</option>'; }).join('')
    + '</select></div>'
    + '</div>'

    // Tutar + Para Birimi
    + '<div class="fr"><div class="fl">TUTAR *</div>'
    + '<div style="display:grid;grid-template-columns:1fr 140px;gap:8px">'
    + '<div style="position:relative">'
    + '<input class="fi" type="number" id="odm-f-amount" placeholder="0.00" min="0" step="0.01" value="' + (o?o.amount||'':'') + '" oninput="_odmUpdateTLPreview()" style="padding-right:80px">'
    + '<span id="odm-tl-preview" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--ac);pointer-events:none;white-space:nowrap">' + (o&&o.currency&&o.currency!=='TRY'?_odmTLKarsiligi(o.amount,o.currency):'') + '</span>'
    + '</div>'
    + '<select class="fi" id="odm-f-currency" onchange="_odmCurChange(this.value)" style="border-radius:8px">'
    + Object.entries(ODM_CURRENCY).map(function(e) { return '<option value="' + e[0] + '"' + ((o?.currency||'TRY')===e[0]?' selected':'') + '>' + e[1].flag + ' ' + e[0] + '</option>'; }).join('')
    + '</select></div>'
    + '<div id="odm-kur-wrap" style="' + ((!o?.currency||o?.currency==='TRY')?'display:none':'') + '">'
    + _odmKurModeHTML(o?.currency||'USD')
    + '</div>'
    + '</div>'

    // Döküman No + Ödeme Yöntemi
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">DÖKÜMAN NO *</div><input class="fi" id="odm-f-docno" placeholder="FTR-2026-001" value="' + (o?o.docNo||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">ÖDEME YÖNTEMİ *</div><select class="fi" id="odm-f-yontem" style="border-radius:8px" onchange="_onYontemChange(\'odm\')">'
    + '<option value="">— Seçin —</option>'
    + _odmLoadMethods().map(function(y) { return '<option value="' + y + '"' + (o?.yontem===y?' selected':'') + '>' + y + '</option>'; }).join('')
    + '</select></div>'
    + '</div>'
    + _bankaDropdownHTML('odm', o)

    // Tarihler
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">SON TARİH *</div>'
    + '<input type="date" class="fi" id="odm-f-due" style="border-radius:8px" value="' + (o?o.due||'':'') + '"></div>'
    + '<div class="fr"><div class="fl">ÖDENDİĞİ TARİH</div>'
    + '<input type="date" class="fi" id="odm-f-actual" value="' + (o?o.actualDate||'':'') + '"></div>'
    + '</div>'

    // Sorumlu
    + '<div class="fr"><div class="fl">SORUMLU KİŞİ</div><select class="fi" id="odm-f-assigned" style="border-radius:8px">'
    + '<option value="">— Seç —</option>'
    + users.map(function(u) { return '<option value="' + u.id + '"' + (o&&o.assignedTo===u.id?' selected':'') + '>' + u.name + '</option>'; }).join('')
    + '</select></div>'

    // Hatırlatıcı — zengin seçenekler
    + '<div style="background:var(--s2);border-radius:10px;padding:12px 14px">'
    + '<div class="fl" style="margin-bottom:8px">🔔 HATIRLATICI</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input type="date" class="fi" id="odm-f-alarm-date" value="' + (o?.alarmDate || '') + '" style="flex:1;border-radius:8px;font-size:11px">'
    + '<input type="time" class="fi" id="odm-f-alarm-time" value="' + (o?.alarmTime || '09:00') + '" style="width:80px;border-radius:8px;font-size:11px">'
    + '</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input type="number" class="fi" id="odm-f-reminder-val" min="1" max="365" value="' + (o?.reminderValue || 3) + '" style="width:55px;border-radius:8px;font-size:11px" placeholder="3">'
    + '<select class="fi" id="odm-f-reminder-unit" style="flex:1;border-radius:8px;font-size:11px">'
    + Object.entries(ODM_REMINDER_UNITS).map(function(e) { return '<option value="' + e[0] + '"' + ((o?.reminderUnit || 'gun') === e[0] ? ' selected' : '') + '>' + e[1] + ' önce</option>'; }).join('')
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'
    + '<button type="button" onclick="_odmSetReminder(1,\'gun\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 gün</button>'
    + '<button type="button" onclick="_odmSetReminder(3,\'gun\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">3 gün</button>'
    + '<button type="button" onclick="_odmSetReminder(1,\'hafta\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 hafta</button>'
    + '<button type="button" onclick="_odmSetReminder(1,\'ay\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 ay</button>'
    + '<button type="button" onclick="_odmAutoReminder()" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px;background:var(--ac);color:#fff">⚡ Otomatik</button>'
    + '</div>'
    + '</div>'

    // Not
    + '<div class="fr"><div class="fl">NOT</div>'
    + '<textarea class="fi" id="odm-f-note" rows="2" style="resize:none;border-radius:8px" placeholder="Açıklama…">' + (o?o.note||'':'') + '</textarea></div>'

    // Döküman yükleme
    + '<div class="fr"><div class="fl">DÖKÜMAN EKLE</div>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    + (o&&o.docs&&o.docs.length ? o.docs.map(function(d,i) { return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5;cursor:pointer" onclick="viewOdmDoc('+o.id+','+i+')">📎 '+d.name+'</span>'; }).join('') : '')
    + '<button type="button" onclick="uploadOdmDoc()" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 10px">📎 Dosya Yükle</button>'
    + '<span id="odm-doc-count" style="font-size:10px;color:var(--t3)">' + (o&&o.docs?o.docs.length+' dosya':'') + '</span>'
    + '</div>'
    + '<input type="hidden" id="odm-f-docs" value="' + (o&&o.docs?JSON.stringify(o.docs).replace(/"/g,'&quot;'):'[]') + '">'
    + '</div>'

    + '<input type="hidden" id="odm-f-eid" value="' + (o?o.id:'') + '">'
    + '<input type="hidden" id="odm-f-alarm" value="' + (o?o.alarmDays||3:3) + '">'
    + '</div>'

    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-v9\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="saveOdm()" style="padding:9px 22px;border-radius:9px">💾 Kaydet</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _go('odm-f-name')?.focus(); }, 10);
}



// ════════════════════════════════════════════════════════════════
// MODAL KATEGORI DEĞİŞİKLİĞİ  [v2.0]
// ════════════════════════════════════════════════════════════════
function _onOdmCatChange() {
  const cat = _go('odm-f-cat')?.value;
  const kEl = _go('odm-kredi-extra');
  const aEl = _go('odm-abone-extra');
  if (kEl) kEl.style.display = cat === 'kredi_k'  ? 'flex' : 'none';
  if (aEl) aEl.style.display = cat === 'abonelik' ? 'flex' : 'none';
}

function uploadOdmSozlesme() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,image/*';
  inp.onchange = function() {
    const file = this.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { window.toast?.('Dosya 10MB den kucuk olmali', 'err'); return; }
    const r = new FileReader();
    r.onload = e => {
      const dataEl = _go('odm-f-sozlesme-data');
      const nameEl = _go('odm-f-sozlesme-name');
      if (dataEl) dataEl.value = e.target.result;
      if (nameEl) nameEl.value = file.name;
      window.toast?.('Döküman hazır — kaydetmeyi unutmayın', 'ok');
    };
    r.readAsDataURL(file);
  };
  inp.click();
}

function viewOdmSozlesme(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o || !o.sozlesme) return;
  const win = window.open('', '_blank');
  win.document.write('<html><body style="margin:0">'
    + (o.sozlesme.startsWith('data:image')
      ? '<img src="' + o.sozlesme + '" style="max-width:100%">'
      : '<iframe src="' + o.sozlesme + '" style="width:100vw;height:100vh;border:none"></iframe>')
    + '</body></html>');
}
window.viewOdmSozlesme   = viewOdmSozlesme;
window.uploadOdmSozlesme = uploadOdmSozlesme;
window._onOdmCatChange   = _onOdmCatChange;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — CRUD
// ════════════════════════════════════════════════════════════════


// _odmSetType kaldırıldı (Gerçekleşen/Planlanan toggle kaldırıldı)

function _odmCurChange(cur) {
  const wrap = document.getElementById('odm-kur-wrap');
  if (wrap) wrap.style.display = (!cur||cur==='TRY') ? 'none' : 'block';
  _odmUpdateKurDisplay();
  _odmUpdateTLPreview();
}
window._odmCurChange = _odmCurChange;

function uploadOdmDoc() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png,.xlsx,.docx'; inp.multiple = true;
  inp.onchange = function() {
    try { var ex = JSON.parse(document.getElementById('odm-f-docs')?.value || '[]'); } catch { var ex = []; }
    Array.from(this.files).forEach(file => {
      if (file.size > 8*1024*1024) { window.toast?.("Dosya cok buyuk", 'warn'); return; }
      const r = new FileReader();
      r.onload = e => {
        ex.push({ name: file.name, data: e.target.result, ts: _nowTso() });
        const el = document.getElementById('odm-f-docs');
        if (el) el.value = JSON.stringify(ex);
        const cnt = document.getElementById('odm-doc-count');
        if (cnt) cnt.textContent = ex.length + ' dosya';
      };
      r.readAsDataURL(file);
    });
    window.toast?.('Dosyalar eklendi ✓', 'ok');
  };
  inp.click();
}

function viewOdmDoc(odmId, docIdx) {
  const o = (window.loadOdm?loadOdm():[]).find(x => x.id === odmId);
  if (!o?.docs?.[docIdx]) return;
  const doc = o.docs[docIdx];
  const win = window.open('','_blank');
  win.document.write('<html><body style="margin:0">'+(doc.data.startsWith('data:image')?'<img src="'+doc.data+'" style="max-width:100%">':'<iframe src="'+doc.data+'" style="width:100vw;height:100vh;border:none"></iframe>')+'</body></html>');
}
window.uploadOdmDoc = uploadOdmDoc;
window.viewOdmDoc   = viewOdmDoc;

/**
 * Eksik alanları görsel olarak vurgular: kırmızı border + shake + banner + scroll.
 * @param {string[]} fieldIds  Eksik alan ID listesi
 * @param {string} [bannerMsg]  Üstte gösterilecek banner mesajı
 */
function _odmHighlightMissing(fieldIds, bannerMsg) {
  // Mevcut hata stillerini temizle
  document.querySelectorAll('.odm-field-error').forEach(function(el) {
    el.classList.remove('odm-field-error', 'odm-shake');
  });
  var existingBanner = document.getElementById('odm-error-banner');
  if (existingBanner) existingBanner.remove();

  if (!fieldIds || !fieldIds.length) return;

  // Shake keyframes inject (bir kez)
  if (!document.getElementById('odm-shake-style')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'odm-shake-style';
    styleEl.textContent = '@keyframes odmShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}'
      + '.odm-field-error{border-color:#DC2626!important;box-shadow:0 0 0 2px rgba(220,38,38,.15)!important}'
      + '.odm-shake{animation:odmShake .4s ease}';
    document.head.appendChild(styleEl);
  }

  // Alanları vurgula
  var firstEl = null;
  fieldIds.forEach(function(fid) {
    var el = document.getElementById(fid);
    if (!el) return;
    el.classList.add('odm-field-error', 'odm-shake');
    if (!firstEl) firstEl = el;
    // Focus'ta temizle
    el.addEventListener('focus', function handler() {
      el.classList.remove('odm-field-error', 'odm-shake');
      el.removeEventListener('focus', handler);
    }, { once: true });
  });

  // Banner göster
  if (bannerMsg) {
    var modal = document.querySelector('#mo-odm-v9 .moc > div:nth-child(2)') || document.querySelector('#mo-tahsilat .moc > div:nth-child(2)');
    if (modal) {
      var banner = document.createElement('div');
      banner.id = 'odm-error-banner';
      banner.style.cssText = 'background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px';
      banner.innerHTML = '⚠️ ' + bannerMsg;
      modal.insertBefore(banner, modal.firstChild);
    }
  }

  // İlk eksik alana scroll
  if (firstEl) {
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstEl.focus();
  }
}

function saveOdm() {
  var cu = window.Auth?.getCU?.();
  var isAdmin = cu?.role === 'admin';
  var name = (document.getElementById('odm-f-name')?.value || '').trim();
  var _fAmt = parseFloat(document.getElementById('odm-f-amount')?.value || '0');
  var _fDue = document.getElementById('odm-f-due')?.value || '';
  var _fCari = document.getElementById('odm-f-cari')?.value || '';
  var _fDocNo = (document.getElementById('odm-f-docno')?.value || '').trim();
  var _fYontem = document.getElementById('odm-f-yontem')?.value || '';

  // Toplu validasyon — tüm eksik alanları bir kerede göster
  var _missingFields = [];
  var _missingLabels = [];
  if (!_fCari)   { _missingFields.push('odm-f-cari');   _missingLabels.push('Cari Firma'); }
  if (!name)     { _missingFields.push('odm-f-name');   _missingLabels.push('Ödeme Adı'); }
  if (!_fAmt || _fAmt <= 0) { _missingFields.push('odm-f-amount'); _missingLabels.push('Tutar (0 veya negatif olamaz)'); }
  if (!_fDue)    { _missingFields.push('odm-f-due');    _missingLabels.push('Son Tarih'); }
  if (!_fDocNo)  { _missingFields.push('odm-f-docno');  _missingLabels.push('Döküman No'); }
  if (!_fYontem) { _missingFields.push('odm-f-yontem'); _missingLabels.push('Ödeme Yöntemi'); }
  if (_missingFields.length) {
    _odmHighlightMissing(_missingFields, 'Eksik alanlar: ' + _missingLabels.join(', '));
    window.toast?.('Lütfen zorunlu alanları doldurun (' + _missingLabels.length + ' alan eksik)', 'err');
    return;
  }

  // Geçmiş vade tarihi uyarısı (engelleme yok, bilgilendirme)
  if (_fDue && _fDue < _todayStr() && !window._odmPastDateWarned) {
    window._odmPastDateWarned = true;
    window.toast?.('⚠️ Vade tarihi geçmişte — emin miseniz? Tekrar kaydet butonuna basın.', 'warn');
    _odmHighlightMissing(['odm-f-due'], 'Vade tarihi geçmişte');
    setTimeout(function() { window._odmPastDateWarned = false; }, 15000);
    return;
  }
  window._odmPastDateWarned = false;

  // Havale/EFT seçiliyse banka zorunlu
  if (_fYontem === 'Havale/EFT') {
    var _fBankaId = document.getElementById('odm-f-banka-sel')?.value || '';
    if (!_fBankaId) {
      _odmHighlightMissing(['odm-f-banka-sel'], 'Havale/EFT için banka seçimi zorunludur');
      window.toast?.('Banka/IBAN seçimi zorunludur', 'err');
      return;
    }
  }

  // Pending cari kontrolü — onaylanmamış cariyle ödeme oluşturulamaz
  var _selCari = (typeof loadCari === 'function' ? loadCari() : []).find(function(c) { return c.name === _fCari; });
  if (_selCari && _selCari.status === 'pending_approval') {
    _odmHighlightMissing(['odm-f-cari'], 'Bu cari henüz onaylanmadı');
    window.toast?.('Bu cari henüz onaylanmadı — önce yönetici onayı gerekli', 'err');
    return;
  }
  // Potansiyel cari ile ödeme oluşturulamaz — önce aktif cariye yükselt
  if (_selCari && (_selCari.cariType === 'potansiyel' || (!_selCari.cariType && _selCari.status !== 'active'))) {
    _odmHighlightMissing(['odm-f-cari'], 'Potansiyel cari ile ödeme oluşturulamaz');
    window.toast?.('Önce aktif cariye yükseltin — Cari panelinden evrak yükleyip onay isteyin', 'err');
    return;
  }

  // Cari limit kontrolü — limit aşıldıysa blokla (specialApproval hariç)
  var _cariCreditLimit = _selCari ? (_selCari.creditLimit || _selCari.limitAmount || 0) : 0;
  if (_selCari && _cariCreditLimit > 0) {
    var cariOdm = (window.loadOdm ? loadOdm() : []).filter(function(o) {
      return o.cariName === _fCari && !o.paid && !o.isDeleted;
    });
    var cariToplamBorc = cariOdm.reduce(function(sum, o) { return sum + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
    var yeniTutar = _odmToTRY(_fAmt, document.getElementById('odm-f-currency')?.value || 'TRY');
    if ((cariToplamBorc + yeniTutar) > _cariCreditLimit && !_selCari.specialApproval) {
      _odmHighlightMissing(['odm-f-cari', 'odm-f-amount'], 'Cari limit aşıldı!');
      window.toast?.('Cari kredi limiti aşıldı — Toplam: ₺' + Math.round(cariToplamBorc + yeniTutar).toLocaleString('tr-TR') + ' / Limit: ₺' + _cariCreditLimit.toLocaleString('tr-TR'), 'err');
      // Admin/manager özel onay verebilir
      if (_isManagerO()) {
        window.toast?.('Yönetici olarak limit aşımını onaylayabilirsiniz — tekrar kaydet butonuna basın', 'warn');
        _selCari.specialApproval = true;
        storeCari(loadCari().map(function(c) { return c.id === _selCari.id ? _selCari : c; }));
      }
      return;
    }
  }

  // Gecikmiş ödeme uyarısı — bu carinin gecikmiş ödemeleri varsa uyar
  if (_selCari) {
    var gecikOdm = (window.loadOdm ? loadOdm() : []).filter(function(o) {
      return o.cariName === _fCari && !o.paid && o.due && o.due < _todayStr();
    });
    if (gecikOdm.length > 0 && !window._odmGecikUyariGosterildi) {
      window._odmGecikUyariGosterildi = true;
      window.toast?.('⚠️ Bu carinin ' + gecikOdm.length + ' adet gecikmiş ödemesi var!', 'warn');
      // Uyarı göster ama engelleme — bir sonraki kaydetmede geçsin
      setTimeout(function() { window._odmGecikUyariGosterildi = false; }, 30000);
    }
  }

  // Mükerrer kayıt kontrolü — aynı cari + aynı döküman no engelle
  var _odmEditId = parseInt(document.getElementById('odm-f-eid')?.value || '0') || 0;
  if (_fDocNo && _fCari) {
    var _odmExisting = (window.loadOdm ? loadOdm() : []).find(function(o) {
      return o.cariName === _fCari && o.docNo === _fDocNo && o.id !== _odmEditId && !o.isDeleted;
    });
    if (_odmExisting) {
      _odmHighlightMissing(['odm-f-docno', 'odm-f-cari'], 'Mükerrer kayıt!');
      window.toast?.('Bu cari için "' + _fDocNo + '" numaralı döküman zaten kayıtlı', 'err');
      return;
    }
  }

  var eidVal = document.getElementById('odm-f-eid')?.value || '';
  var eid = eidVal ? parseInt(eidVal) : 0;
  var isNew = !eid;
  var d    = window.loadOdm ? loadOdm() : [];
  var cat = _go('odm-f-cat')?.value || 'diger';
  var currency = _go('odm-f-currency')?.value || 'TRY';
  const amount   = parseFloat(_go('odm-f-amount')?.value || '0') || 0;
  let docs = [];
  try { docs = JSON.parse(_go('odm-f-docs')?.value || '[]'); } catch {}
  const entry = {
    name,
    cat,
    freq:           _go('odm-f-freq')?.value     || 'aylik',
    amount,
    currency,
    amountTRY:      _odmToTRY(amount, currency),
    kurMode:        _odmRatesMode,
    kurRate:        _odmGetRates()[currency] || 1,
    due:            _go('odm-f-due')?.value      || '',
    actualDate:     _go('odm-f-actual')?.value   || '',
    note:           _go('odm-f-note')?.value     || '',
    alarmDays:      parseInt(_go('odm-f-alarm')?.value || '3'),
    alarmDate:      document.getElementById('odm-f-alarm-date')?.value || '',
    alarmTime:      document.getElementById('odm-f-alarm-time')?.value || '09:00',
    reminderValue:  parseInt(document.getElementById('odm-f-reminder-val')?.value || '3') || 3,
    reminderUnit:   document.getElementById('odm-f-reminder-unit')?.value || 'gun',
    assignedTo:     parseInt(_go('odm-f-assigned')?.value || '0') || null,
    cariName:       _fCari,
    docNo:          _fDocNo,
    yontem:         _fYontem,
    bankaId:        parseInt(document.getElementById('odm-f-banka-sel')?.value || '0') || null,
    taskId:         parseInt(_go('odm-f-taskid')?.value || '0') || null,
    docs,
    ts:         _nowTso(),
    updatedBy:  _CUo()?.id,
    // Kredi kartı alanları
    ...(cat === 'kredi_k' ? {
      banka:        _go('odm-f-banka')?.value   || '',
      sonDortHane:  _go('odm-f-son4')?.value    || '',
      limit:        parseFloat(_go('odm-f-limit')?.value  || '0') || 0,
      bakiye:       parseFloat(_go('odm-f-bakiye')?.value || '0') || 0,
      minOdeme:     parseFloat(_go('odm-f-min')?.value    || '0') || 0,
      kesiimTarihi: _go('odm-f-kesim')?.value  || '',
      odemeGunu:    _go('odm-f-odgun')?.value   || '',
    } : {}),
    // Abonelik alanları
    ...(cat === 'abonelik' ? {
      abonelikTipi:  _go('odm-f-abtype')?.value || 'diger',
      sozlesmeBitis: _go('odm-f-sozbitis')?.value || '',
      sozlesme:      _go('odm-f-sozlesme-data')?.value || undefined,
      sozlesmeName:  _go('odm-f-sozlesme-name')?.value || undefined,
    } : {}),
  };
  // sozlesme undefined ise sil
  if (entry.sozlesme === undefined) delete entry.sozlesme;
  if (entry.sozlesmeName === undefined) delete entry.sozlesmeName;
  if (eid) {
    const o = d.find(x => x.id === eid);
    if (o) {
      if (!o.paid && entry.paid) { entry.paidTs = _nowTso(); entry.paidBy = _CUo()?.id; }
      // Audit diff — tüm değişen alanları kaydet
      var _diffs = [];
      if (o.amount !== entry.amount) _diffs.push('Tutar: ' + (o.amount||0) + ' → ' + entry.amount);
      if (o.due !== entry.due) _diffs.push('Tarih: ' + (o.due||'-') + ' → ' + (entry.due||'-'));
      if (o.name !== entry.name) _diffs.push('Ad: ' + (o.name||'-') + ' → ' + entry.name);
      if (o.cariName !== entry.cariName) _diffs.push('Cari: ' + (o.cariName||'-') + ' → ' + (entry.cariName||'-'));
      if (o.yontem !== entry.yontem) _diffs.push('Yöntem: ' + (o.yontem||'-') + ' → ' + (entry.yontem||'-'));
      if (o.docNo !== entry.docNo) _diffs.push('Döküman: ' + (o.docNo||'-') + ' → ' + (entry.docNo||'-'));
      if (o.currency !== entry.currency) _diffs.push('Döviz: ' + (o.currency||'-') + ' → ' + (entry.currency||'-'));
      if (o.cat !== entry.cat) _diffs.push('Kategori: ' + (o.cat||'-') + ' → ' + (entry.cat||'-'));
      if (o.freq !== entry.freq) _diffs.push('Sıklık: ' + (o.freq||'-') + ' → ' + (entry.freq||'-'));
      if (o.alarmDate !== entry.alarmDate) _diffs.push('Alarm: ' + (o.alarmDate||'-') + ' → ' + (entry.alarmDate||'-'));
      if (_diffs.length) {
        // Değişiklik geçmişini kayıt üzerinde sakla
        if (!o.changeHistory) o.changeHistory = [];
        o.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: _diffs });
        if (!_isAdminO()) {
          var _admins = (window.loadUsers?.() || []).filter(function(u) { return u.role === 'admin' && u.status === 'active'; });
          _admins.forEach(function(a) { window.addNotif?.('📝', 'Odeme duzenlendi: ' + _diffs.join(', '), 'info', 'odemeler', a.id); });
        }
      }
      Object.assign(o, entry);
    }
  } else {
    const newEntry = { id: generateNumericId(), ...entry, createdBy: _CUo()?.id };
    // Sadece admin otomatik onaylı — manager dahil diğerleri pending
    if (_isAdminO()) {
      newEntry.approved = true;
      newEntry.approvedBy = _CUo()?.id;
      newEntry.approvedAt = _nowTso();
      newEntry.approvalStatus = 'approved';
    } else {
      newEntry.approvalStatus = 'pending';
      newEntry.approvalRequestedBy = _CUo()?.id;
      newEntry.approvalRequestedAt = _nowTso();
    }
    d.unshift(newEntry);
  }
  window.storeOdm ? storeOdm(d) : null;
  _go('mo-odm-v9')?.remove();
  renderOdemeler();
  window.logActivity?.('view', '"' + name + '" odeme ' + (isNew ? 'eklendi' : 'guncellendi'));
  // Yeni kayıt + admin değilse yöneticilere bildirim gönder
  if (isNew && !isAdmin) {
    var yoneticiler = (window.loadUsers?.() || []).filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active'; });
    yoneticiler.forEach(function(m) {
      window.addNotif?.('💰', 'Yeni odeme onay bekliyor: ' + name + ' - ' + (cu?.name || ''), 'warn', 'odemeler', m.id);
    });
    window.toast?.('Yonetici onayina gonderildi', 'ok');
  } else {
    window.toast?.(isNew ? 'Odeme eklendi' : 'Guncellendi', 'ok');
  }
}

function markOdmPaid(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  // Onay bekleyen ödeme ödendi işaretlenemez
  if (_odmNeedsApproval(o) && o.approvalStatus !== 'approved') {
    window.toast?.('Bu ödeme henüz onaylanmadı — önce yönetici onayı gerekli', 'err');
    return;
  }
  o.paid   = true;
  o.paidTs = _nowTso();
  o.paidBy = _CUo()?.id;
  window.storeOdm ? storeOdm(d) : null;
  _logOdmAction(id, 'Odendi isaretlendi');
  renderOdemeler();
  localStorage.removeItem('odm_alarm_late_' + id);
  window.toast?.('Ödendi olarak işaretlendi', 'ok');

  // Dekont uyarısı
  setTimeout(() => {
    window.toast?.('Lütfen dekontu yüklemeyi unutmayın', 'warn');
    window.addNotif?.('📎', `"${escapeHtml(o.name)}" için dekont yüklenmedi`, 'warn', 'odemeler');
  }, 1500);
}

/** Erteleme — neden yazma popup'ı gösterir, sonra yönetici onayına gönderir */
function postponeOdm(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;

  const old = _go('mo-odm-postpone');
  if (old) old.remove();

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-postpone'; ;
  mo.innerHTML = `<div class="moc" style="max-width:400px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b)">
      <div style="font-size:15px;font-weight:700;color:var(--t)">Ödeme Erteleme</div>
      <div style="font-size:12px;color:var(--t3);margin-top:2px">${escapeHtml(o.name)} — ${o.due || '—'}</div>
    </div>
    <div style="padding:16px 20px">
      <div class="fg"><div class="fl">YENİ TARİH <span style="color:var(--rd)">*</span></div>
        <input type="date" class="fi" id="odm-pp-date" value="${o.due || ''}">
      </div>
      <div class="fg"><div class="fl">ERTELEME NEDENİ <span style="color:var(--rd)">*</span></div>
        <textarea class="fi" id="odm-pp-reason" rows="3" placeholder="Neden erteleniyor?" style="resize:vertical"></textarea>
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="document.getElementById('mo-odm-postpone').remove()">İptal</button>
      <button class="btn btnp" onclick="_savePostpone(${id})" style="background:#F59E0B;border-color:#F59E0B">Ertele & Onay İste</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _go('odm-pp-reason')?.focus(); }, 10);
}

function _savePostpone(id) {
  const newDate = (_go('odm-pp-date')?.value || '').trim();
  const reason  = (_go('odm-pp-reason')?.value || '').trim();
  if (!newDate) { window.toast?.('Yeni tarih zorunludur', 'err'); return; }
  if (!reason)  { window.toast?.('Erteleme nedeni zorunludur', 'err'); return; }

  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;

  const cu = _CUo();
  o.postponed = true;
  o.postponeDate   = newDate;
  o.postponeReason = reason;
  o.postponeBy     = cu?.id;
  o.postponeAt     = _nowTso();
  o.oldDue         = o.due;
  // Erteleme yönetici onayına düşer
  o.approvalStatus = 'pending_postpone';
  o.approvalRequestedBy = cu?.id;
  o.approvalRequestedAt = _nowTso();

  window.storeOdm ? storeOdm(d) : null;
  _go('mo-odm-postpone')?.remove();
  _logOdmAction(id, 'Erteleme talebi: ' + reason + ' → ' + newDate);
  window.addNotif?.('⏳', '"' + escapeHtml(o.name) + '" erteleme onayı bekliyor — ' + escapeHtml(reason), 'warn', 'odemeler');
  window.toast?.('Erteleme talebi yöneticiye gönderildi', 'ok');
  renderOdemeler();
}
window.postponeOdm = postponeOdm;
window._savePostpone = _savePostpone;

function toggleOdmPaid(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.paid   = !o.paid;
  o.paidTs = o.paid ? _nowTso() : null;
  o.paidBy = o.paid ? _CUo()?.id : null;
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  window.toast?.(o.paid ? '✅ Ödendi' : '↩ Geri alındı', 'ok');
}

function delOdm(id) {
  var d = window.loadOdm ? loadOdm() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var cu = _CUo();

  // Yetki kontrolü
  var canDel = false;
  if (_isAdminO()) {
    canDel = true;
  } else if ((o.approvalStatus === 'pending' || !o.approvalStatus) && o.createdBy === cu?.id) {
    canDel = true;
  }
  if (!canDel) {
    window.toast?.('Onaylanmış kayıtlar yönetici izni olmadan silinemez', 'err');
    return;
  }

  window.confirmModal('Bu ödemeyi silmek istediğinizden emin misiniz?\n\n"' + (o.name || '') + '"', {
    title: 'Ödeme Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: function() {
      // Çöp kutusuna ekle
      if (typeof addToTrash === 'function') addToTrash(o, 'Ödeme', 'odemeler');
      // Soft delete — K06 Anayasa kuralı
      o.isDeleted = true;
      o.deletedAt = _nowTso();
      o.deletedBy = _CUo()?.id;
      o.deletedReason = 'user_delete';
      window.storeOdm ? storeOdm(d) : null;
      renderOdemeler();
      window.logActivity?.('view', 'Ödeme silindi (soft): ' + (o.name || ''));
      window.toast?.('Silindi — 30 gün içinde geri alınabilir', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — DEKONT
// ════════════════════════════════════════════════════════════════

function uploadOdmReceipt(id) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*,.pdf';
  inp.onchange = function() {
    const file = this.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { window.toast?.('Dosya 5MB\'dan küçük olmalı', 'err'); return; }
    const r = new FileReader();
    r.onload = function(e) {
      const d = window.loadOdm ? loadOdm() : [];
      const o = d.find(x => x.id === id); if (!o) return;
      o.receipt     = e.target.result;
      o.receiptName = file.name;
      o.receiptTs   = _nowTso();
      window.storeOdm ? storeOdm(d) : null;
      // Alarm key temizle
      localStorage.removeItem('odm_alarm_receipt_' + id);
      renderOdemeler();
      window.toast?.('📎 Dekont yüklendi ✓', 'ok');
      window.logActivity?.('view', `"${o.name}" için dekont yüklendi`);
    };
    r.readAsDataURL(file);
  };
  inp.click();
}

function viewOdmReceipt(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o || !o.receipt) return;
  const win = window.open('', '_blank');
  win.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh">'
    + (o.receipt.startsWith('data:image')
      ? `<img src="${o.receipt}" style="max-width:100%;max-height:100vh;object-fit:contain">`
      : `<iframe src="${o.receipt}" style="width:100vw;height:100vh;border:none"></iframe>`)
    + '</body></html>');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — EXCEL İMPORT / EXPORT
// ════════════════════════════════════════════════════════════════

function exportOdmXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const items = window.loadOdm ? loadOdm() : [];
  const users = window.loadUsers ? loadUsers() : [];

  const rows = [['ID','Ödeme Adı','Kategori','Sıklık','Tutar (₺)','Son Tarih','Durum','Sorumlu','Alarm (gün)','Not','Ödeme Tarihi','Dekont']];
  items.forEach(o => {
    const cat   = ODM_CATS[o.cat]?.l || o.cat;
    const freq  = ODM_FREQ[o.freq]   || o.freq;
    const user  = users.find(u => u.id === o.assignedTo);
    const today = _todayStr();
    const status = o.paid ? 'Ödendi' : (o.due && o.due < today ? 'Gecikti' : 'Bekliyor');
    rows.push([
      o.id, o.name, cat, freq,
      parseFloat(o.amount)||0,
      o.due||'',
      status,
      user?.name || '—',
      o.alarmDays||3,
      o.note||'',
      o.paidTs||'',
      o.receipt ? 'Var' : 'Yok',
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Sütun genişlikleri
  ws['!cols'] = [8,24,14,12,12,12,10,16,12,24,18,8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Nakit Akisi');
  XLSX.writeFile(wb, 'rutin-odemeler-' + _todayStr() + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
  window.logActivity?.('view', 'Rutin ödemeler Excel olarak indirildi');
}

// ════════════════════════════════════════════════════════════════
// EXCEL / CSV İÇE AKTARMA — Modal + Önizleme + Doğrulama
// ════════════════════════════════════════════════════════════════

/** @type {Array|null} İçe aktarma için hazırlanan satırlar */
var _odmImportRows = null;

/** @type {Array|null} İçe aktarma hata indeksleri */
var _odmImportErrors = null;

/**
 * İçe aktarma şablon dosyasını XLSX olarak indirir.
 * Sütunlar: Ad, Tutar, Para Birimi, Tarih, Kategori, Cari, Doküman No
 */
function _odmDownloadImportTemplate() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var header = ['Ad', 'Tutar', 'Para Birimi', 'Tarih', 'Kategori', 'Cari', 'Doküman No'];
  var sample = [
    ['Ofis kirası', 25000, 'TRY', '2026-04-01', 'Kira', 'ABC Gayrimenkul', 'KR-001'],
    ['Internet faturası', 850, 'TRY', '2026-04-05', 'Abonelik', 'Turkcell', 'FAT-2026-04'],
    ['Yazılım lisansı', 199, 'USD', '2026-04-10', 'Abonelik', 'GitHub Inc.', 'INV-4521'],
  ];
  var ws = XLSX.utils.aoa_to_sheet([header].concat(sample));
  ws['!cols'] = [{wch:22},{wch:12},{wch:12},{wch:12},{wch:14},{wch:20},{wch:14}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  XLSX.writeFile(wb, 'odeme-import-sablon.xlsx');
  window.toast?.('Şablon indirildi ✓', 'ok');
}

/**
 * İçe aktarma modalını açar.
 */
function _openOdmImportModal() {
  var mo = document.getElementById('mo-odm-import');
  if (mo) mo.remove();

  _odmImportRows = null;
  _odmImportErrors = null;

  mo = document.createElement('div');
  mo.id = 'mo-odm-import';
  mo.className = 'mo';
  mo.style.display = 'flex';
  mo.innerHTML = ''
    + '<div class="moc" style="max-width:700px;padding:0;border-radius:16px;overflow:hidden;background:var(--sf);max-height:90vh;display:flex;flex-direction:column">'
      // Header
      + '<div style="padding:16px 20px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
        + '<div>'
          + '<div style="font-size:15px;font-weight:700;color:var(--t)">📥 Ödeme İçe Aktar</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-top:2px">Excel (.xlsx) veya CSV dosyasından ödeme yükleyin</div>'
        + '</div>'
        + '<button onclick="document.getElementById(\'mo-odm-import\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
      + '</div>'
      // Body
      + '<div id="odm-import-body" style="flex:1;overflow-y:auto;padding:20px">'
        // Dosya seçimi
        + '<div style="border:2px dashed var(--b);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color .15s" id="odm-import-dropzone" onclick="document.getElementById(\'odm-import-finp\').click()" ondragover="event.preventDefault();this.style.borderColor=\'var(--ac)\'" ondragleave="this.style.borderColor=\'var(--b)\'" ondrop="event.preventDefault();this.style.borderColor=\'var(--b)\';window._odmImportHandleDrop?.(event)">'
          + '<div style="font-size:32px;margin-bottom:8px">📂</div>'
          + '<div style="font-size:13px;font-weight:600;color:var(--t)">Dosya sürükleyin veya tıklayın</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-top:4px">.xlsx, .xls veya .csv — maksimum 10MB</div>'
          + '<input type="file" id="odm-import-finp" accept=".xlsx,.xls,.csv" style="display:none" onchange="window._odmImportFileSelected?.(this)">'
        + '</div>'
        // Şablon indir
        + '<div style="margin-top:12px;text-align:center">'
          + '<button onclick="window._odmDownloadImportTemplate?.()" style="background:none;border:none;cursor:pointer;color:var(--ac);font-size:12px;font-family:inherit;text-decoration:underline">📋 Boş şablon indir (Ad, Tutar, Para Birimi, Tarih, Kategori, Cari, Doküman No)</button>'
        + '</div>'
        // Önizleme alanı
        + '<div id="odm-import-preview" style="display:none;margin-top:16px"></div>'
      + '</div>'
      // Footer
      + '<div id="odm-import-footer" style="display:none;padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
        + '<button class="btn btns" onclick="document.getElementById(\'mo-odm-import\')?.remove()" style="font-size:12px">İptal</button>'
        + '<button class="btn btnp" id="odm-import-confirm" onclick="window._odmImportConfirm?.()" style="font-size:12px">📥 İçe Aktar</button>'
      + '</div>'
    + '</div>';

  document.body.appendChild(mo);
  mo.onclick = function(ev) { if (ev.target === mo) mo.remove(); };
}

/**
 * Drag & drop ile dosya bırakma.
 * @param {DragEvent} ev
 */
window._odmImportHandleDrop = function(ev) {
  var file = ev.dataTransfer?.files?.[0];
  if (file) _odmImportParseFile(file);
};

/**
 * Dosya seçimi (input change).
 * @param {HTMLInputElement} inp
 */
window._odmImportFileSelected = function(inp) {
  var file = inp?.files?.[0];
  if (file) _odmImportParseFile(file);
};

/**
 * Seçilen dosyayı parse eder ve önizleme gösterir.
 * @param {File} file
 */
function _odmImportParseFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { window.toast?.('Dosya 10MB\'den küçük olmalı', 'err'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  var r = new FileReader();
  r.onload = function(e) {
    try {
      var wb   = XLSX.read(e.target.result, { type: 'binary' });
      var ws   = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) { window.toast?.('Dosyada veri bulunamadı', 'err'); return; }

      var header = rows[0].map(function(h) { return String(h || '').toLowerCase().trim(); });
      var col = function(key) { return header.findIndex(function(h) { return h.includes(key); }); };

      var nameCol = col('ad') > -1 ? col('ad') : col('name');
      var amtCol  = col('tutar') > -1 ? col('tutar') : col('amount');
      var curCol  = col('para') > -1 ? col('para') : (col('currency') > -1 ? col('currency') : col('birim'));
      var dueCol  = col('tarih') > -1 ? col('tarih') : col('due');
      var catCol  = col('kategori') > -1 ? col('kategori') : col('cat');
      var cariCol = col('cari') > -1 ? col('cari') : col('firma');
      var docCol  = col('doküman') > -1 ? col('doküman') : (col('dokuman') > -1 ? col('dokuman') : col('doc'));

      if (nameCol < 0) { window.toast?.('Başlık satırında "Ad" kolonu bulunamadı', 'err'); return; }

      var catKeys = Object.keys(ODM_CATS);
      var parsed = [];
      var errors = [];

      rows.slice(1).forEach(function(row, idx) {
        if (!row || row.every(function(c) { return !c && c !== 0; })) return;

        var name = String(row[nameCol] || '').trim();
        var amount = amtCol > -1 ? (parseFloat(row[amtCol]) || 0) : 0;

        // Para birimi
        var currency = 'TRY';
        if (curCol > -1 && row[curCol]) {
          var cv = String(row[curCol]).toUpperCase().trim();
          if (ODM_CURRENCY[cv]) currency = cv;
        }

        // Tarih
        var due = '';
        if (dueCol > -1 && row[dueCol]) {
          var dv = row[dueCol];
          if (typeof dv === 'number') {
            var dd = new Date(Math.round((dv - 25569) * 86400 * 1000));
            due = dd.toISOString().slice(0, 10);
          } else {
            var pp = new Date(String(dv));
            if (!isNaN(pp.getTime())) due = pp.toISOString().slice(0, 10);
          }
        }

        // Kategori
        var cat = 'diger';
        if (catCol > -1 && row[catCol]) {
          var catVal = String(row[catCol]).toLowerCase();
          var found = catKeys.find(function(k) { return catVal.includes(k) || catVal.includes(ODM_CATS[k].l.toLowerCase()); });
          if (found) cat = found;
        }

        var cari = cariCol > -1 ? String(row[cariCol] || '').trim() : '';
        var docNo = docCol > -1 ? String(row[docCol] || '').trim() : '';

        // Doğrulama
        var rowErrors = [];
        if (!name) rowErrors.push('Ad zorunlu');
        if (!amount || amount <= 0) rowErrors.push('Tutar zorunlu');
        if (!due) rowErrors.push('Tarih zorunlu');

        if (rowErrors.length) errors.push({ idx: parsed.length, msgs: rowErrors });

        parsed.push({
          name: name,
          amount: amount,
          currency: currency,
          due: due,
          cat: cat,
          cari: cari,
          docNo: docNo,
          _rowIdx: idx + 1,
          _errors: rowErrors,
        });
      });

      _odmImportRows = parsed;
      _odmImportErrors = errors;
      _odmImportRenderPreview(file.name, parsed, errors);

    } catch (err) {
      window.toast?.('Dosya okunamadı: ' + err.message, 'err');
    }
  };
  r.readAsBinaryString(file);
}

/**
 * Önizleme tablosunu render eder.
 * @param {string} fileName
 * @param {Array} parsed
 * @param {Array} errors
 */
function _odmImportRenderPreview(fileName, parsed, errors) {
  var preview = document.getElementById('odm-import-preview');
  var footer  = document.getElementById('odm-import-footer');
  if (!preview) return;

  var errorCount = errors.length;
  var validCount = parsed.length - errorCount;

  // Dropzone'u dosya bilgisi ile değiştir
  var dropzone = document.getElementById('odm-import-dropzone');
  if (dropzone) {
    dropzone.innerHTML = '<div style="display:flex;align-items:center;gap:10px;justify-content:center">'
      + '<span style="font-size:20px">📄</span>'
      + '<div style="text-align:left">'
        + '<div style="font-size:13px;font-weight:600;color:var(--t)">' + (typeof escapeHtml === 'function' ? escapeHtml(fileName) : fileName) + '</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + parsed.length + ' satır bulundu</div>'
      + '</div>'
      + '<button onclick="event.stopPropagation();document.getElementById(\'odm-import-finp\').value=\'\';document.getElementById(\'odm-import-finp\').click()" style="background:var(--s2);border:1px solid var(--b);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit">Değiştir</button>'
    + '</div>';
  }

  // Özet
  var html = '<div style="display:flex;gap:10px;margin-bottom:14px">'
    + '<div style="flex:1;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;padding:10px 14px;text-align:center">'
      + '<div style="font-size:18px;font-weight:700;color:#10B981">' + validCount + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">Geçerli</div>'
    + '</div>'
    + (errorCount > 0 ? '<div style="flex:1;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px 14px;text-align:center">'
      + '<div style="font-size:18px;font-weight:700;color:#EF4444">' + errorCount + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">Hatalı</div>'
    + '</div>' : '')
    + '<div style="flex:1;background:var(--s2);border:1px solid var(--b);border-radius:10px;padding:10px 14px;text-align:center">'
      + '<div style="font-size:18px;font-weight:700;color:var(--t)">' + parsed.length + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">Toplam</div>'
    + '</div>'
  + '</div>';

  // Hata uyarısı
  if (errorCount > 0) {
    html += '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:11px;color:#DC2626">'
      + '⚠️ <b>' + errorCount + ' satırda</b> zorunlu alan eksik. Hatalı satırlar kırmızı gösterilmiştir ve içe aktarılmayacaktır.'
    + '</div>';
  }

  // Admin değilse bilgi
  if (!_isAdminO()) {
    html += '<div style="background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:11px;color:#D97706">'
      + 'ℹ️ Admin değilsiniz — tüm kayıtlar <b>yönetici onayı bekleyen</b> (pending) olarak kaydedilecektir.'
    + '</div>';
  }

  // Önizleme tablosu (ilk 5 satır)
  var previewRows = parsed.slice(0, 5);
  html += '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:6px">Önizleme' + (parsed.length > 5 ? ' (ilk 5 / ' + parsed.length + ')' : '') + '</div>';
  html += '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden">';
  html += '<div style="display:grid;grid-template-columns:30px 1fr 90px 60px 80px 90px 1fr 90px;gap:0;padding:6px 10px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase">'
    + '<div>#</div><div>Ad</div><div>Tutar</div><div>Döviz</div><div>Tarih</div><div>Kategori</div><div>Cari</div><div>Dok. No</div>'
  + '</div>';

  previewRows.forEach(function(r, i) {
    var hasError = r._errors && r._errors.length > 0;
    var bg = hasError ? 'background:rgba(239,68,68,.08)' : (i % 2 === 0 ? 'background:var(--sf)' : 'background:var(--s2)');
    var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
    var catInfo = ODM_CATS[r.cat] || ODM_CATS.diger;
    var curSym = (ODM_CURRENCY[r.currency] || {}).sym || r.currency;

    html += '<div style="display:grid;grid-template-columns:30px 1fr 90px 60px 80px 90px 1fr 90px;gap:0;padding:6px 10px;border-bottom:1px solid var(--b);font-size:11px;' + bg + '">'
      + '<div style="color:var(--t3)">' + r._rowIdx + '</div>'
      + '<div style="font-weight:600;color:' + (hasError && !r.name ? '#EF4444' : 'var(--t)') + '">' + (r.name ? esc(r.name) : '<i style="color:#EF4444">eksik</i>') + '</div>'
      + '<div style="color:' + (hasError && (!r.amount || r.amount <= 0) ? '#EF4444' : 'var(--t)') + ';font-weight:600">' + (r.amount > 0 ? r.amount.toLocaleString('tr-TR') : '<i style="color:#EF4444">eksik</i>') + '</div>'
      + '<div style="color:var(--t3)">' + r.currency + '</div>'
      + '<div style="color:' + (hasError && !r.due ? '#EF4444' : 'var(--t3)') + '">' + (r.due || '<i style="color:#EF4444">eksik</i>') + '</div>'
      + '<div style="font-size:10px">' + catInfo.ic + ' ' + catInfo.l + '</div>'
      + '<div style="color:var(--t3);font-size:10px">' + (r.cari ? esc(r.cari) : '—') + '</div>'
      + '<div style="color:var(--t3);font-size:10px;font-family:monospace">' + (r.docNo ? esc(r.docNo) : '—') + '</div>'
    + '</div>';

    // Hata detayı
    if (hasError) {
      html += '<div style="grid-column:1/-1;padding:3px 10px 6px 40px;font-size:10px;color:#EF4444;background:rgba(239,68,68,.04)">'
        + '⚠ ' + r._errors.join(', ')
      + '</div>';
    }
  });

  if (parsed.length > 5) {
    html += '<div style="padding:8px 10px;text-align:center;font-size:11px;color:var(--t3);background:var(--s2)">… ve ' + (parsed.length - 5) + ' satır daha</div>';
  }
  html += '</div>';

  preview.innerHTML = html;
  preview.style.display = 'block';

  // Footer'ı göster
  if (footer) {
    footer.style.display = 'flex';
    var confirmBtn = document.getElementById('odm-import-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = '📥 ' + validCount + ' Satır İçe Aktar';
      confirmBtn.disabled = validCount === 0;
      if (validCount === 0) confirmBtn.style.opacity = '0.5';
    }
  }
}

/**
 * Onaylanan satırları kayıt olarak ekler.
 */
window._odmImportConfirm = function() {
  if (!_odmImportRows || !_odmImportRows.length) { window.toast?.('Veri yok', 'err'); return; }

  var cu = window.Auth?.getCU?.();
  var isAdmin = cu?.role === 'admin';
  var existing = window.loadOdm ? loadOdm() : [];
  var added = 0;

  _odmImportRows.forEach(function(r) {
    // Hatalı satırları atla
    if (r._errors && r._errors.length > 0) return;

    var entry = {
      id:          generateNumericId(),
      name:        r.name,
      cat:         r.cat || 'diger',
      freq:        'teksefer',
      amount:      r.amount || 0,
      currency:    r.currency || 'TRY',
      amountTRY:   _odmToTRY(r.amount || 0, r.currency || 'TRY'),
      kurMode:     _odmRatesMode,
      kurRate:     _odmGetRates()[r.currency || 'TRY'] || 1,
      due:         r.due || '',
      note:        r.cari ? ('Cari: ' + r.cari) : '',
      docNo:       r.docNo || '',
      alarmDays:   3,
      paid:        false,
      ts:          _nowTso(),
      createdBy:   cu?.id,
      source:      'import',
    };

    // Admin ise otomatik onaylı, değilse pending
    if (isAdmin) {
      entry.approved = true;
      entry.approvedBy = cu?.id;
      entry.approvedAt = _nowTso();
      entry.approvalStatus = 'approved';
    } else {
      entry.approvalStatus = 'pending';
      entry.approvalRequestedBy = cu?.id;
      entry.approvalRequestedAt = _nowTso();
    }

    existing.unshift(entry);
    added++;
  });

  if (added === 0) { window.toast?.('İçe aktarılacak geçerli satır yok', 'err'); return; }

  window.storeOdm ? storeOdm(existing) : null;
  document.getElementById('mo-odm-import')?.remove();
  renderOdemeler();
  window.toast?.('📥 ' + added + ' ödeme içe aktarıldı ✓', 'ok');
  window.logActivity?.('finans', 'Excel/CSV import: ' + added + ' ödeme aktarıldı');

  // Admin değilse yöneticilere bildirim
  if (!isAdmin) {
    var yoneticiler = (window.loadUsers?.() || []).filter(function(u) {
      return (u.role === 'admin' || u.role === 'manager') && u.status === 'active';
    });
    yoneticiler.forEach(function(m) {
      window.addNotif?.('📥', added + ' ödeme import edildi — onay bekliyor (' + (cu?.name || '') + ')', 'warn', 'odemeler', m.id);
    });
  }

  _odmImportRows = null;
  _odmImportErrors = null;
};

// Geriye uyumluluk — eski API
function processOdmImport(inp) {
  var file = inp?.files?.[0];
  if (file) _odmImportParseFile(file);
}
function importOdmFile() { _openOdmImportModal(); }

window._openOdmImportModal    = _openOdmImportModal;
window._odmDownloadImportTemplate = _odmDownloadImportTemplate;

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════
// 10 YENİ ÖNERİ — FONKSIYONLAR  [v3.0]
// ════════════════════════════════════════════════════════════════

// ÖNERI 1: Tekrarlayan ödeme — otomatik yeni dönem oluştur
function _checkRecurringOdm() {
  const d = window.loadOdm ? loadOdm() : [];
  const today = _todayStr();
  let changed = false;
  d.forEach(o => {
    if (!o.paid || !o.recurringRule || !o.due) return;
    const key = 'odm_rec_done_' + o.id + '_' + o.due;
    if (localStorage.getItem(key)) return;
    const freqDays = { haftalik:7, aylik:30, uc_aylik:90, yillik:365 };
    const days = freqDays[o.freq];
    if (!days) return;
    const nextDue = new Date(o.due);
    nextDue.setDate(nextDue.getDate() + days);
    const nextStr = nextDue.toISOString().slice(0,10);
    if (nextStr > today) return;
    const exists = d.some(x => x.name === o.name && x.due === nextStr);
    if (!exists) {
      d.push({ ...o, id: generateNumericId(), paid: false, paidTs: null, receipt: null, due: nextStr, createdAt: _nowTso() });
      localStorage.setItem(key, '1');
      changed = true;
    }
  });
  if (changed) { window.storeOdm ? storeOdm(d) : null; window.toast?.('Tekrarlayan ödemeler oluşturuldu ✓', 'ok'); }
}

// ÖNERI 2: Tahsilat modal
function openOdmTahsilat() {
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-tahsilat'; ;
  const tah = window.loadTahsilat ? loadTahsilat() : [];
  const today = _todayStr(); const todayD = new Date(today);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7); const weekEndStr = weekEnd.toISOString().slice(0,10);
  const rows = tah.map(t => {
    const diff = t.due ? Math.ceil((new Date(t.due)-todayD)/86400000) : null;
    const late = diff !== null && diff < 0;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">
      <div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">${t.name||'—'}</div><div style="font-size:10px;color:var(--t3)">${t.from||'Müşteri'} · ${t.due||'—'}</div></div>
      <div style="font-size:13px;font-weight:600;color:var(--t)">₺${(parseFloat(t.amount)||0).toLocaleString('tr-TR')}</div>
      <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${late?'var(--rdb)':'var(--grb)'};color:${late?'var(--rdt)':'var(--grt)'}">${late?'Gecikti':'Bekliyor'}</span>
    </div>`;
  }).join('');
  mo.innerHTML = `<div class="moc" style="max-width:500px">
    <div class="mt">💰 Tahsilatlar</div>
    <div style="margin-bottom:14px;display:flex;gap:8px">
      <input class="fi" id="tah-name" placeholder="Açıklama…" style="flex:1">
      <input class="fi" type="number" id="tah-amt" placeholder="Tutar (₺)" style="width:120px">
      <input type="date" class="fi" id="tah-due" style="width:130px">
      <button class="btn btnp" onclick="
        const t={id:generateNumericId(),name:_go('tah-name').value,amount:parseFloat(_go('tah-amt').value)||0,due:_go('tah-due').value,from:'',createdAt:_nowTso()};
        const d=window.loadTahsilat?loadTahsilat():[];d.unshift(t);
        if(window.storeTahsilat)storeTahsilat(d);
        document.getElementById('mo-tahsilat').remove();openOdmTahsilat();
      ">Ekle</button>
    </div>
    <div>${rows||'<div style="text-align:center;padding:24px;color:var(--t3)">Henüz tahsilat yok</div>'}</div>
    <div class="mf"><button class="btn" onclick="document.getElementById('mo-tahsilat').remove()">Kapat</button></div>
  </div>`;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openOdmTahsilat = openOdmTahsilat;

// ÖNERI 3: Tahsilat liste render
function _renderTahsilatList(tah, cont) {
  const today = _todayStr(); const todayD = new Date(today);
  if (!tah || !tah.length) {
    if (cont) cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">💰</div><div>Henüz tahsilat kaydı yok</div><button class="btn btnp" onclick="openOdmTahsilat()" style="margin-top:12px">+ Tahsilat Ekle</button></div>';
    return;
  }
  const groups = { late:[], week:[], month:[], rest:[] };
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7); const weekEndStr = weekEnd.toISOString().slice(0,10);
  tah.forEach(t => {
    if (!t.due) { groups.rest.push(t); return; }
    if (t.due < today) groups.late.push(t);
    else if (t.due <= weekEndStr) groups.week.push(t);
    else groups.month.push(t);
  });
  let html = '';
  const renderGroup = (label, color, items) => {
    if (!items.length) return '';
    return `<div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.08em;padding:10px 16px 4px">${label}</div>`
      + items.map(t => `<div style="display:grid;grid-template-columns:1fr 120px 90px 100px;padding:9px 16px;border-bottom:1px solid var(--b);align-items:center;gap:0">
        <div><div style="font-size:12px;font-weight:500;color:var(--t)">${t.name||'—'}</div><div style="font-size:10px;color:var(--t3)">${t.from||'Müşteri'}</div></div>
        <div style="font-size:13px;font-weight:600;color:var(--t)">₺${(parseFloat(t.amount)||0).toLocaleString('tr-TR')}</div>
        <div style="font-size:11px;color:${t.due<today?'var(--rdt)':'var(--t2)'}">${t.due||'—'}</div>
        <div><span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${t.due<today?'var(--rdb)':'var(--grb)'};color:${t.due<today?'var(--rdt)':'var(--grt)'}">${t.due<today?'Gecikti':'Bekliyor'}</span></div>
      </div>`).join('');
  };
  html += renderGroup('Gecikmiş', 'var(--rdt)', groups.late);
  html += renderGroup('Bu Hafta', 'var(--amt)', groups.week);
  html += renderGroup('Bu Ay', 'var(--ac)', groups.month);
  html += renderGroup('Diğer', 'var(--t3)', groups.rest);
  if (cont) cont.innerHTML = html;
}

// ÖNERI 4: Ödeme onay akışı
function requestOdmApproval(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.approvalNeeded = true;
  o.approvalRequestedBy = _CUo()?.id;
  o.approvalRequestedAt = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  window.addNotif?.('⏳', '"' + o.name + '" için ödeme onayı istendi', 'warn', 'odemeler');
  window.toast?.('Onay isteği gönderildi ✓', 'ok');
  renderOdemeler();
}
window.requestOdmApproval = requestOdmApproval;

function approveOdmPayment(id) {
  if (!_isAdminO()) { window.toast?.('Yetkiniz yok', 'err'); return; }
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.approved = true; o.approvedBy = _CUo()?.id; o.approvedAt = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  window.toast?.('Ödeme onaylandı ✓', 'ok');
  renderOdemeler();
}
window.approveOdmPayment = approveOdmPayment;

// ÖNERI 8: Toplu seçim & işaret
let _odmBulkMode = false;
let _odmBulkSelected = new Set();

function _toggleBulkMode() {
  _odmBulkMode = !_odmBulkMode;
  _odmBulkSelected.clear();
  const bar = _go('odm-bulk-bar');
  const btn = _go('odm-bulk-btn');
  if (bar) bar.style.display = _odmBulkMode ? 'flex' : 'none';
  if (btn) { btn.textContent = _odmBulkMode ? 'İptal' : 'Toplu Seç'; btn.style.color = _odmBulkMode ? 'var(--rdt)' : ''; }
  renderOdemeler();
}
window._toggleBulkMode = _toggleBulkMode;

function _onBulkCheck(el) {
  const id = parseInt(el.dataset.oid);
  if (el.checked) _odmBulkSelected.add(id);
  else _odmBulkSelected.delete(id);
  const cnt = _go('odm-bulk-count');
  if (cnt) cnt.textContent = _odmBulkSelected.size + ' seçildi';
  el.closest('[data-oid]').style.background = el.checked ? 'var(--al)' : 'var(--sf)';
}
window._onBulkCheck = _onBulkCheck;

function _bulkMarkPaid() {
  if (!_odmBulkSelected.size) { window.toast?.('Hiç ödeme seçilmedi', 'warn'); return; }
  const d = window.loadOdm ? loadOdm() : [];
  _odmBulkSelected.forEach(id => {
    const o = d.find(x => x.id === id);
    if (o && !o.paid) { o.paid = true; o.paidTs = _nowTso(); o.paidBy = _CUo()?.id; }
  });
  window.storeOdm ? storeOdm(d) : null;
  window.toast?.(_odmBulkSelected.size + ' ödeme işaretlendi ✓', 'ok');
  _odmBulkSelected.clear();
  _odmBulkMode = false;
  renderOdemeler();
}
window._bulkMarkPaid = _bulkMarkPaid;

// ÖNERI 9: Belge süresi uyarısı (abonelik sözleşmesi bitiş)
function _checkSozlesmeBitis() {
  const d = window.loadOdm ? loadOdm() : [];
  const today = _todayStr(); const todayD = new Date(today);
  d.filter(o => o.sozlesmeBitis).forEach(o => {
    const diff = Math.ceil((new Date(o.sozlesmeBitis) - todayD) / 86400000);
    if (diff <= 30 && diff > 0) {
      const key = 'sozlesme_warn_' + o.id + '_' + o.sozlesmeBitis;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('📄', '"' + o.name + '" sözleşmesi ' + diff + ' gün sonra bitiyor', 'warn', 'odemeler');
        localStorage.setItem(key, today);
      }
    }
  });
}

// ÖNERI 10: Ödeme notu + geçmiş log
function _logOdmAction(id, action) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  if (!o.history) o.history = [];
  o.history.unshift({ action, by: _CUo()?.name || 'Kullanıcı', at: _nowTso() });
  if (o.history.length > 20) o.history = o.history.slice(0, 20);
  window.storeOdm ? storeOdm(d) : null;
}


// ════════════════════════════════════════════════════════════════
// 2. TEKRARLAYANŞablon — Her ay/hafta/yıl otomatik oluştur
// ════════════════════════════════════════════════════════════════
function checkOdmRecurring() {
  const items = window.loadOdm ? loadOdm() : [];
  const today = _todayStr();
  const thisMonth = today.slice(0, 7);
  let added = 0;

  items.forEach(o => {
    if (!o.recurring || o.freq === 'teksefer') return;
    if (!o.due) return;

    const lastDue = o.lastRecurCreated || '';
    if (lastDue.slice(0, 7) === thisMonth) return; // Bu ay zaten oluşturuldu

    const dueD = new Date(o.due);
    const newDue = new Date(dueD);

    if (o.freq === 'aylik') newDue.setMonth(newDue.getMonth() + 1);
    else if (o.freq === 'haftalik') newDue.setDate(newDue.getDate() + 7);
    else if (o.freq === 'uc_aylik') newDue.setMonth(newDue.getMonth() + 3);
    else if (o.freq === 'yillik') newDue.setFullYear(newDue.getFullYear() + 1);

    const newDueStr = newDue.toISOString().slice(0, 10);
    if (newDueStr.slice(0, 7) !== thisMonth) return;

    const all = window.loadOdm ? loadOdm() : [];
    all.unshift({
      id: generateNumericId(),
      name: o.name,
      cat: o.cat, freq: o.freq, amount: o.amount,
      currency: o.currency || 'TRY',
      due: newDueStr, note: o.note || '',
      paid: false, alarmDays: o.alarmDays || 3,
      assignedTo: o.assignedTo || null,
      recurring: true, recurParentId: o.id,
      createdBy: _CUo()?.id, ts: _nowTso(),
    });
    o.lastRecurCreated = thisMonth;
    window.storeOdm ? storeOdm(all) : null;
    added++;
  });

  if (added > 0) {
    window.toast?.(added + ' tekrarlayan ödeme oluşturuldu', 'ok');
    renderOdemeler();
  }
}
window.checkOdmRecurring = checkOdmRecurring;

// ════════════════════════════════════════════════════════════════
// 3. TAHSİLAT MODÜLÜ — Alacak takibi
// ════════════════════════════════════════════════════════════════
// loadTahsilat / storeTahsilat artık database.js'te tanımlı (KEYS.tahsilat + Firestore sync)
// Eski 'duay_tahsilat' verisini yeni key'e migrate et
(function _migrateTahsilat() {
  try {
    var oldData = localStorage.getItem('duay_tahsilat');
    var newData = localStorage.getItem('ak_tahsilat1');
    if (oldData && (!newData || newData === '[]')) {
      localStorage.setItem('ak_tahsilat1', oldData);
      console.info('[Ödemeler] Tahsilat verisi duay_tahsilat → ak_tahsilat1 migrate edildi');
    }
  } catch(e) {}
})();

function openTahsilatModal(id) {
  const existing = document.getElementById('mo-tahsilat');
  if (existing) existing.remove();
  const users = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const o = id ? loadTahsilat().find(x => x.id === id) : null;
  // isPlanned kaldırıldı

  const TAH_TYPES = {
    musteri:'👥 Müşteri Ödemesi', satis:'🛒 Satış Geliri', iade:'↩ İade',
    komisyon:'💼 Komisyon', kira:'🏢 Kira Geliri', temlik:'📋 Temlik', diger:'📌 Diğer',
  };

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-tahsilat'; ;

  const curVal = o?.currency || 'TRY';
  // Kur HTML her zaman oluştur — TRY'de gizle, döviz seçilince göster
  const kurHTML = _odmKurModeHTML(curVal !== 'TRY' ? curVal : 'USD');

  let html = '<div class="moc" style="max-width:580px;padding:0;overflow:hidden;border-radius:16px">';
  html += '<div style="background:#0F6E56;padding:16px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">';
  html += '<div><div style="font-size:15px;font-weight:600">💰 ' + (o ? 'Tahsilat Düzenle' : 'Yeni Tahsilat') + '</div>';
  html += '<div style="font-size:10px;opacity:.7;margin-top:2px">Tahsilat kaydini olusturun</div></div>';
  html += '<button onclick="_go(\'mo-tahsilat\')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:18px">×</button></div>';
  html += '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;max-height:74vh;overflow-y:auto">';

  // İş ID (görev) + Cari Firma
  var tahCariList = typeof loadCari === 'function' ? loadCari() : [];
  var tahEsc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var tahTaskList = typeof loadTasks === 'function' ? loadTasks().filter(function(t) { return !t.done; }).slice(0, 50) : [];
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">İŞ ID (Görev)</div><select class="fi" id="tah-f-taskid" style="border-radius:8px">';
  html += '<option value="">— Görev Seçin —</option>';
  tahTaskList.forEach(function(t) { html += '<option value="' + t.id + '"' + (o?.taskId == t.id ? ' selected' : '') + '>' + tahEsc((t.title || '').slice(0, 40)) + '</option>'; });
  html += '</select></div>';
  html += '<div class="fr"><div class="fl">CARİ FİRMA *</div><div style="display:flex;gap:4px"><select class="fi" id="tah-f-cari" style="flex:1;border-radius:8px">';
  html += '<option value="">— Cari Seçin * —</option>';
  tahCariList.forEach(function(c) {
    var isPend = c.status === 'pending_approval';
    var lbl = tahEsc(c.name) + ' (' + (c.type || '') + ')' + (isPend ? ' ⏳ Onay Bekliyor' : '');
    html += '<option value="' + tahEsc(c.name) + '"' + (o?.cariName === c.name ? ' selected' : '') + (isPend ? ' disabled style="color:#999"' : '') + '>' + lbl + '</option>';
  });
  html += '</select><button type="button" onclick="window._openQuickCari?.()" class="btn btns" style="font-size:12px;padding:3px 8px;flex-shrink:0">+</button></div></div>';
  html += '</div>';

  // Müşteri + Tür
  html += '<div class="fr"><div class="fl">MÜŞTERİ / KAYNAK *</div><input class="fi" id="tah-f-name" placeholder="Müşteri adı veya kaynak..." value="' + (o?o.name||'':'') + '"></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">TAHSİLAT TÜRÜ *</div><select class="fi" id="tah-f-type">';
  Object.entries(TAH_TYPES).forEach(([k,v]) => { html += '<option value="' + k + '"' + (o&&o.type===k?' selected':'') + '>' + v + '</option>'; });
  html += '</select></div>';
  html += '<div class="fr"><div class="fl">FATURA / REFERANS NO *</div><input class="fi" id="tah-f-ref" placeholder="INV-2026-001..." value="' + (o?o.ref||'':'') + '"></div></div>';

  // Tutar + Para Birimi
  html += '<div class="fr"><div class="fl">TUTAR *</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 140px;gap:8px">';
  html += '<div style="position:relative"><input class="fi" type="number" id="tah-f-amount" placeholder="0.00" step="0.01" value="' + (o?o.amount||'':'') + '" oninput="_odmUpdateTLPreview()" style="padding-right:80px">';
  html += '<span id="odm-tl-preview" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:#0F6E56;pointer-events:none;white-space:nowrap">' + (o&&o.currency&&o.currency!=='TRY'?_odmTLKarsiligi(o.amount,o.currency):'') + '</span></div>';
  html += '<select class="fi" id="tah-f-currency" onchange="_tahCurChange(this.value)">';
  Object.entries(ODM_CURRENCY).forEach(([k,v]) => { html += '<option value="' + k + '"' + (curVal===k?' selected':'') + '>' + v.flag + ' ' + k + '</option>'; });
  html += '</select></div>';
  html += '<div id="tah-kur-wrap" style="' + (curVal==='TRY'?'display:none':'') + '">' + kurHTML + '</div></div>';

  // Tarihler
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">BEKLENEN / PLANLANAN TARİH</div><input type="date" class="fi" id="tah-f-due" value="' + (o?o.due||'':'') + '"></div>';
  html += '<div class="fr" id="tah-gercek-wrap"><div class="fl">GERÇEKLEŞEN TARİH</div><input type="date" class="fi" id="tah-f-actual" value="' + (o?o.actualDate||'':'') + '"></div></div>';

  // Yöntem + Banka
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">ALINAN HESAP / BANKA</div><input class="fi" id="tah-f-banka" placeholder="Garanti, İş Bankası..." value="' + (o?o.banka||'':'') + '"></div>';
  html += '<div class="fr"><div class="fl">ÖDEME YÖNTEMİ *</div><select class="fi" id="tah-f-yontem" onchange="_onYontemChange(\'tah\')">';
  _odmLoadMethods().forEach(function(y) { html += '<option value="' + y + '"' + (o&&o.yontem===y?' selected':'') + '>' + y + '</option>'; });
  html += '</select></div></div>';
  html += _bankaDropdownHTML('tah', o);

  // Sorumlu
  html += '<div class="fr"><div class="fl">SORUMLU</div><select class="fi" id="tah-f-user"><option value="">— Seç —</option>';
  users.forEach(u => { html += '<option value="' + u.id + '"' + (o&&o.assignedTo===u.id?' selected':'') + '>' + u.name + '</option>'; });
  html += '</select></div>';

  // Hatırlatıcı — zengin seçenekler (ödeme formuyla aynı)
  html += '<input type="hidden" id="tah-f-alarm" value="' + (o?o.alarmDays||3:3) + '">';
  html += '<div style="background:var(--s2);border-radius:10px;padding:12px 14px">';
  html += '<div class="fl" style="margin-bottom:8px">🔔 HATIRLATICI</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  html += '<div style="display:flex;gap:6px;align-items:center">';
  html += '<input type="date" class="fi" id="tah-f-alarm-date" value="' + (o?.alarmDate || '') + '" style="flex:1;border-radius:8px;font-size:11px">';
  html += '<input type="time" class="fi" id="tah-f-alarm-time" value="' + (o?.alarmTime || '09:00') + '" style="width:80px;border-radius:8px;font-size:11px">';
  html += '</div>';
  html += '<div style="display:flex;gap:6px;align-items:center">';
  html += '<input type="number" class="fi" id="tah-f-reminder-val" min="1" max="365" value="' + (o?.reminderValue || 3) + '" style="width:55px;border-radius:8px;font-size:11px">';
  html += '<select class="fi" id="tah-f-reminder-unit" style="flex:1;border-radius:8px;font-size:11px">';
  Object.entries(ODM_REMINDER_UNITS).forEach(function(e) { html += '<option value="' + e[0] + '"' + ((o?.reminderUnit || 'gun') === e[0] ? ' selected' : '') + '>' + e[1] + ' önce</option>'; });
  html += '</select></div></div>';
  html += '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">';
  html += '<button type="button" onclick="_odmSetReminder(1,\'gun\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 gün</button>';
  html += '<button type="button" onclick="_odmSetReminder(3,\'gun\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">3 gün</button>';
  html += '<button type="button" onclick="_odmSetReminder(1,\'hafta\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 hafta</button>';
  html += '<button type="button" onclick="_odmSetReminder(1,\'ay\')" class="btn btns" style="font-size:10px;padding:2px 8px;border-radius:6px">1 ay</button>';
  html += '</div></div>';

  // Not
  html += '<div class="fr"><div class="fl">NOT / AÇIKLAMA</div><textarea class="fi" id="tah-f-note" rows="2" style="resize:none" placeholder="Ek bilgiler...">' + (o?o.note||'':'') + '</textarea></div>';

  // Dökümanlar
  const docs = o?.docs || [];
  html += '<div class="fr"><div class="fl">DÖKÜMAN EKLE</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
  docs.forEach((d,i) => { html += '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(15,110,86,.1);color:#0F6E56;cursor:pointer" onclick="viewTahDoc(' + (o?o.id:0) + ',' + i + ')">📎 ' + d.name + '</span>'; });
  html += '<button type="button" onclick="uploadTahDoc()" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 10px">📎 Dosya Yükle</button>';
  html += '<span id="tah-doc-count" style="font-size:10px;color:var(--t3)">' + (docs.length?docs.length+' dosya':'') + '</span>';
  html += '</div><input type="hidden" id="tah-f-docs" value="' + JSON.stringify(docs).replace(/"/g,'&quot;') + '"></div>';

  // Tahsil toggle
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--s2);border-radius:9px">';
  html += '<span style="font-size:13px;font-weight:500">Tahsil edildi</span>';
  html += '<label class="psw"><input type="checkbox" id="tah-f-collected"' + (o&&o.collected?' checked':'') + '><span class="psl"></span></label></div>';

  html += '<input type="hidden" id="tah-f-eid" value="' + (o?o.id:'') + '">';
  html += '</div>';
  html += '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">';
  html += '<button class="btn" onclick="document.getElementById(\'mo-tahsilat\')?.remove()">İptal</button>';
  html += '<button class="btn btnp" onclick="saveTahsilat()" style="padding:9px 22px;border-radius:9px">💾 Kaydet</button></div></div>';

  mo.innerHTML = html;
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

// _tahSetType kaldırıldı (Gerçekleşen/Planlanan toggle kaldırıldı)

function _tahCurChange(cur) {
  const wrap = document.getElementById('tah-kur-wrap');
  if (wrap) {
    wrap.style.display = (!cur||cur==='TRY') ? 'none' : 'block';
    // Kur HTML'i güncelle — seçilen para birimine göre
    if (cur && cur !== 'TRY') {
      wrap.innerHTML = _odmKurModeHTML(cur);
    }
  }
  _odmUpdateKurDisplay();
  _odmUpdateTLPreview();
}
window._tahCurChange = _tahCurChange;

function uploadTahDoc() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png,.xlsx,.docx'; inp.multiple = true;
  inp.onchange = function() {
    try { var existing = JSON.parse(document.getElementById('tah-f-docs')?.value || '[]'); } catch { var existing = []; }
    Array.from(this.files).forEach(file => {
      if (file.size > 8*1024*1024) { window.toast?.("Dosya cok buyuk", 'warn'); return; }
      const r = new FileReader();
      r.onload = e => {
        existing.push({ name: file.name, data: e.target.result, ts: _nowTso() });
        const el = document.getElementById('tah-f-docs');
        if (el) el.value = JSON.stringify(existing);
        const cnt = document.getElementById('tah-doc-count');
        if (cnt) cnt.textContent = existing.length + ' dosya';
      };
      r.readAsDataURL(file);
    });
    window.toast?.('Dosyalar eklendi ✓', 'ok');
  };
  inp.click();
}

function viewTahDoc(tahId, docIdx) {
  const o = loadTahsilat().find(x => x.id === tahId);
  if (!o?.docs?.[docIdx]) return;
  const doc = o.docs[docIdx];
  const win = window.open('', '_blank');
  win.document.write('<html><body style="margin:0">' + (doc.data.startsWith('data:image') ? '<img src="' + doc.data + '" style="max-width:100%">' : '<iframe src="' + doc.data + '" style="width:100vw;height:100vh;border:none"></iframe>') + '</body></html>');
}
window.uploadTahDoc = uploadTahDoc;
window.viewTahDoc   = viewTahDoc;

function saveTahsilat() {
  var name = (document.getElementById('tah-f-name')?.value || '').trim();
  var _tahAmt = parseFloat(document.getElementById('tah-f-amount')?.value || '0');
  var _tahDue = document.getElementById('tah-f-due')?.value || '';
  var _tahCariVal = document.getElementById('tah-f-cari')?.value || '';
  var _tahRef = (document.getElementById('tah-f-ref')?.value || '').trim();

  // Toplu validasyon — tüm eksik alanları bir kerede göster
  var _missingFields = [];
  var _missingLabels = [];
  if (!_tahCariVal) { _missingFields.push('tah-f-cari');   _missingLabels.push('Cari Firma'); }
  if (!name)        { _missingFields.push('tah-f-name');   _missingLabels.push('Müşteri/Kaynak'); }
  if (!_tahAmt || _tahAmt <= 0) { _missingFields.push('tah-f-amount'); _missingLabels.push('Tutar (0 veya negatif olamaz)'); }
  if (!_tahDue)     { _missingFields.push('tah-f-due');    _missingLabels.push('Vade Tarihi'); }
  if (!_tahRef)     { _missingFields.push('tah-f-ref');    _missingLabels.push('Fatura/Referans No'); }
  if (_missingFields.length) {
    _odmHighlightMissing(_missingFields, 'Eksik alanlar: ' + _missingLabels.join(', '));
    window.toast?.('Lütfen zorunlu alanları doldurun (' + _missingLabels.length + ' alan eksik)', 'err');
    return;
  }

  // Geçmiş vade tarihi uyarısı
  if (_tahDue && _tahDue < _todayStr() && !window._tahPastDateWarned) {
    window._tahPastDateWarned = true;
    window.toast?.('⚠️ Vade tarihi geçmişte — emin misiniz? Tekrar kaydet butonuna basın.', 'warn');
    _odmHighlightMissing(['tah-f-due'], 'Vade tarihi geçmişte');
    setTimeout(function() { window._tahPastDateWarned = false; }, 15000);
    return;
  }
  window._tahPastDateWarned = false;

  // Havale/EFT seçiliyse banka zorunlu
  var _tahYontem = document.getElementById('tah-f-yontem')?.value || '';
  if (_tahYontem === 'Havale/EFT') {
    var _tahBankaId = document.getElementById('tah-f-banka-sel')?.value || '';
    if (!_tahBankaId) {
      _odmHighlightMissing(['tah-f-banka-sel'], 'Havale/EFT için banka seçimi zorunludur');
      window.toast?.('Banka/IBAN seçimi zorunludur', 'err');
      return;
    }
  }

  // Pending cari kontrolü
  if (_tahCariVal) {
    var _tahSelCari = (typeof loadCari === 'function' ? loadCari() : []).find(function(c) { return c.name === _tahCariVal; });
    if (_tahSelCari && _tahSelCari.status === 'pending_approval') {
      _odmHighlightMissing(['tah-f-cari'], 'Bu cari henüz onaylanmadı');
      window.toast?.('Bu cari henüz onaylanmadı — önce yönetici onayı gerekli', 'err');
      return;
    }
    // Potansiyel cari ile tahsilat oluşturulamaz
    if (_tahSelCari && (_tahSelCari.cariType === 'potansiyel' || (!_tahSelCari.cariType && _tahSelCari.status !== 'active'))) {
      _odmHighlightMissing(['tah-f-cari'], 'Potansiyel cari ile tahsilat oluşturulamaz');
      window.toast?.('Önce aktif cariye yükseltin — Cari panelinden evrak yükleyip onay isteyin', 'err');
      return;
    }
  }

  // Gecikmiş ödeme uyarısı — bu carinin gecikmiş ödemeleri varsa uyar
  if (_tahCariVal) {
    var _tahGecik = (window.loadOdm ? loadOdm() : []).filter(function(o) {
      return o.cariName === _tahCariVal && !o.paid && o.due && o.due < _todayStr();
    });
    if (_tahGecik.length > 0 && !window._tahGecikUyariGosterildi) {
      window._tahGecikUyariGosterildi = true;
      window.toast?.('⚠️ Bu carinin ' + _tahGecik.length + ' adet gecikmiş ödemesi var!', 'warn');
      setTimeout(function() { window._tahGecikUyariGosterildi = false; }, 30000);
    }
  }

  // Mükerrer kayıt kontrolü — aynı cari + aynı referans no engelle
  var _tahEditId = parseInt(document.getElementById('tah-f-eid')?.value || '0') || 0;
  if (_tahRef && _tahCariVal) {
    var _tahExisting = loadTahsilat().find(function(t) {
      return t.cariName === _tahCariVal && t.ref === _tahRef && t.id !== _tahEditId && !t.isDeleted;
    });
    if (_tahExisting) {
      _odmHighlightMissing(['tah-f-ref', 'tah-f-cari'], 'Mükerrer kayıt!');
      window.toast?.('Bu cari için "' + _tahRef + '" numaralı referans zaten kayıtlı', 'err');
      return;
    }
  }

  var eid = parseInt(document.getElementById('tah-f-eid')?.value || '0');
  const d = loadTahsilat();
  let docs = [];
  try { docs = JSON.parse(document.getElementById('tah-f-docs')?.value || '[]'); } catch {}
  const currency = document.getElementById('tah-f-currency')?.value || 'TRY';
  const amount   = parseFloat(document.getElementById('tah-f-amount')?.value || '0') || 0;
  const entry = {
    name,
    type:       document.getElementById('tah-f-type')?.value     || 'musteri',
    ref:        document.getElementById('tah-f-ref')?.value      || '',
    amount,
    currency,
    amountTRY:  _odmToTRY(amount, currency),
    kurMode:    _odmRatesMode,
    kurRate:    _odmGetRates()[currency] || 1,
    due:        document.getElementById('tah-f-due')?.value      || '',
    actualDate: document.getElementById('tah-f-actual')?.value   || '',
    banka:      document.getElementById('tah-f-banka')?.value    || '',
    yontem:     document.getElementById('tah-f-yontem')?.value   || '',
    bankaId:    parseInt(document.getElementById('tah-f-banka-sel')?.value || '0') || null,
    cariName:   document.getElementById('tah-f-cari')?.value     || '',
    taskId:     parseInt(document.getElementById('tah-f-taskid')?.value || '0') || null,
    // planned alanı kaldırıldı
    collected:  !!document.getElementById('tah-f-collected')?.checked,
    assignedTo: parseInt(document.getElementById('tah-f-user')?.value || '0') || null,
    alarmDays:  parseInt(document.getElementById('tah-f-alarm')?.value || '3'),
    alarmDate:  document.getElementById('tah-f-alarm-date')?.value || '',
    alarmTime:  document.getElementById('tah-f-alarm-time')?.value || '09:00',
    reminderValue: parseInt(document.getElementById('tah-f-reminder-val')?.value || '3') || 3,
    reminderUnit:  document.getElementById('tah-f-reminder-unit')?.value || 'gun',
    note:       document.getElementById('tah-f-note')?.value     || '',
    docs,
    ts: _nowTso(), updatedBy: _CUo()?.id,
  };
  if (eid) {
    var o = d.find(function(x) { return x.id === eid; });
    if (o) {
      // Audit diff — tüm değişen alanları kaydet
      var _tahDiffs = [];
      if (o.amount !== entry.amount) _tahDiffs.push('Tutar: ' + (o.amount||0) + ' → ' + entry.amount);
      if (o.due !== entry.due) _tahDiffs.push('Tarih: ' + (o.due||'-') + ' → ' + (entry.due||'-'));
      if (o.name !== entry.name) _tahDiffs.push('Ad: ' + (o.name||'-') + ' → ' + entry.name);
      if (o.cariName !== entry.cariName) _tahDiffs.push('Cari: ' + (o.cariName||'-') + ' → ' + (entry.cariName||'-'));
      if (o.yontem !== entry.yontem) _tahDiffs.push('Yöntem: ' + (o.yontem||'-') + ' → ' + (entry.yontem||'-'));
      if (o.ref !== entry.ref) _tahDiffs.push('Referans: ' + (o.ref||'-') + ' → ' + (entry.ref||'-'));
      if (o.currency !== entry.currency) _tahDiffs.push('Döviz: ' + (o.currency||'-') + ' → ' + (entry.currency||'-'));
      if (o.type !== entry.type) _tahDiffs.push('Tür: ' + (o.type||'-') + ' → ' + (entry.type||'-'));
      if (o.alarmDate !== entry.alarmDate) _tahDiffs.push('Alarm: ' + (o.alarmDate||'-') + ' → ' + (entry.alarmDate||'-'));
      if (_tahDiffs.length) {
        if (!o.changeHistory) o.changeHistory = [];
        o.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: _tahDiffs });
        if (!_isAdminO()) {
          var _admins2 = (window.loadUsers?.() || []).filter(function(u) { return u.role === 'admin' && u.status === 'active'; });
          _admins2.forEach(function(a) { window.addNotif?.('📝', 'Tahsilat duzenlendi: ' + _tahDiffs.join(', '), 'info', 'odemeler', a.id); });
        }
      }
      Object.assign(o, entry);
    }
  } else {
    var newEntry = { id: generateNumericId(), ...entry, createdBy: _CUo()?.id };
    if (_isAdminO()) {
      newEntry.approved = true;
      newEntry.approvedBy = _CUo()?.id;
      newEntry.approvalStatus = 'approved';
    } else {
      newEntry.approvalStatus = 'pending';
      newEntry.approvalRequestedBy = _CUo()?.id;
      newEntry.approvalRequestedAt = _nowTso();
    }
    d.unshift(newEntry);
  }
  storeTahsilat(d);
  document.getElementById('mo-tahsilat')?.remove();
  if (!eid && !_isAdminO()) {
    var _yoneticiler = (window.loadUsers?.() || []).filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active'; });
    _yoneticiler.forEach(function(m) {
      window.addNotif?.('💰', 'Yeni tahsilat onay bekliyor: ' + escapeHtml(name) + ' - ' + amount + ' ' + currency + ' (' + (_CUo()?.name || '') + ')', 'warn', 'odemeler', m.id);
    });
    window.toast?.('Tahsilat eklendi — yönetici onayı bekleniyor', 'ok');
  } else {
    window.toast?.(eid ? 'Güncellendi ✓' : 'Tahsilat eklendi ✓', 'ok');
  }
  if (window._renderTahsilatPanel) window._renderTahsilatPanel();
  renderOdemeler();
}

function markTahsilatCollected(id) {
  const d = loadTahsilat();
  const o = d.find(x => x.id === id); if (!o) return;
  o.collected = true; o.collectedTs = _nowTso(); o.collectedBy = _CUo()?.id;
  o.actualDate = _todayStr();
  storeTahsilat(d);
  window.toast?.('✅ Tahsilat tamamlandı', 'ok');
  if (window._renderTahsilatPanel) window._renderTahsilatPanel();
}

window.openTahsilatModal     = openTahsilatModal;
window.saveTahsilat          = saveTahsilat;
window.markTahsilatCollected = markTahsilatCollected;
// loadTahsilat / storeTahsilat artık database.js'te — window export orada yapılıyor

// ════════════════════════════════════════════════════════════════
// 4. ÖDEME ONAY AKIŞI
// ════════════════════════════════════════════════════════════════
function requestOdmApproval(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.approvalStatus = 'pending';
  o.approvalRequestedBy = _CUo()?.id;
  o.approvalRequestedAt = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  window.addNotif?.('⏳', '"' + o.name + '" onay bekliyor', 'warn', 'odemeler');
  window.toast?.('Onay talebi gönderildi', 'ok');
  renderOdemeler();
}

function approveOdm(id) {
  if (!_isAdminO()) { window.toast?.('Yetki gerekli', 'err'); return; }
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.approvalStatus = 'approved';
  o.approvedBy = _CUo()?.id;
  o.approvedAt = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  window.toast?.('✅ Ödeme onaylandı', 'ok');
  renderOdemeler();
}

window.requestOdmApproval = requestOdmApproval;
window.approveOdm = approveOdm;

// ════════════════════════════════════════════════════════════════
// 5. TOPLU ÖDEME İŞARETİ
// ════════════════════════════════════════════════════════════════
let _odmSelected = new Set();

function toggleOdmSelect(id) {
  if (_odmSelected.has(id)) _odmSelected.delete(id);
  else _odmSelected.add(id);
  _updateOdmBulkBar();
}

function _updateOdmBulkBar() {
  let bar = document.getElementById('odm-bulk-bar');
  if (_odmSelected.size === 0) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'odm-bulk-bar';
    bar.style.cssText = 'position:sticky;bottom:0;background:var(--ac);color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;z-index:50';
    document.getElementById('panel-odemeler')?.appendChild(bar);
  }
  bar.innerHTML = '<span style="font-size:12px;font-weight:500">' + _odmSelected.size + ' ödeme seçili</span>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="bulkMarkOdmPaid()" style="background:#fff;color:var(--ac);border:none;border-radius:7px;padding:5px 12px;font-size:11px;cursor:pointer;font-family:inherit">✓ Tümünü Ödendi İşaretle</button>'
    + '<button onclick="_odmSelected.clear();_updateOdmBulkBar();renderOdemeler()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:7px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit">✕ İptal</button>'
    + '</div>';
}

function bulkMarkOdmPaid() {
  if (_odmSelected.size === 0) return;
  const d = window.loadOdm ? loadOdm() : [];
  _odmSelected.forEach(id => {
    const o = d.find(x => x.id === id);
    if (o) { o.paid = true; o.paidTs = _nowTso(); o.paidBy = _CUo()?.id; }
  });
  window.storeOdm ? storeOdm(d) : null;
  window.toast?.(_odmSelected.size + ' ödeme işaretlendi ✓', 'ok');
  _odmSelected.clear();
  _updateOdmBulkBar();
  renderOdemeler();
}

window.toggleOdmSelect = toggleOdmSelect;
window.bulkMarkOdmPaid = bulkMarkOdmPaid;

// ════════════════════════════════════════════════════════════════
// 6. BANKA ÖDEME TALİMATI PDF
// ════════════════════════════════════════════════════════════════
function exportOdmPaymentPDF(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o) return;
  const win = window.open('', '_blank');
  const html = '<html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto">'
    + '<h2 style="color:#1e1b4b;margin-bottom:4px">Ödeme Talimatı</h2>'
    + '<p style="color:#6b7280;font-size:13px;margin-bottom:24px">Duay Global Trade</p>'
    + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
    + '<tr style="background:#f5f5ff"><td style="padding:10px;font-weight:600;width:40%">Ödeme Adı</td><td style="padding:10px">' + o.name + '</td></tr>'
    + '<tr><td style="padding:10px;font-weight:600">Tutar</td><td style="padding:10px;font-weight:700;color:#6366F1">₺' + parseFloat(o.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</td></tr>'
    + '<tr style="background:#f5f5ff"><td style="padding:10px;font-weight:600">Son Tarih</td><td style="padding:10px">' + (o.due || '—') + '</td></tr>'
    + '<tr><td style="padding:10px;font-weight:600">IBAN</td><td style="padding:10px">' + (o.iban || 'Belirtilmemiş') + '</td></tr>'
    + '<tr style="background:#f5f5ff"><td style="padding:10px;font-weight:600">Not</td><td style="padding:10px">' + (o.note || '—') + '</td></tr>'
    + '</table>'
    + '<p style="margin-top:24px;font-size:12px;color:#9ca3af">Oluşturulma: ' + new Date().toLocaleString('tr-TR') + '</p>'
    + '<button onclick="window.print()" style="margin-top:16px;background:#6366F1;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;cursor:pointer">Yazdır / PDF İndir</button>'
    + '</body></html>';
  win.document.write(html);
}
window.exportOdmPaymentPDF = exportOdmPaymentPDF;

// ════════════════════════════════════════════════════════════════
// 7. AYLIK HARCAMA GRAFİĞİ
// ════════════════════════════════════════════════════════════════
function openOdmChart() {
  const existing = document.getElementById('mo-odm-chart');
  if (existing) { existing.remove(); return; }
  const all = window.loadOdm ? loadOdm() : [];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const cats = ['fatura', 'abonelik', 'kredi_k', 'kira', 'diger'];
  const catColors = { fatura: '#F97316', abonelik: '#6366F1', kredi_k: '#8B5CF6', kira: '#10B981', diger: '#6B7280' };

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-chart'; ;

  const chartRows = months.map(m => {
    const mItems = all.filter(o => (o.due || '').startsWith(m) || (o.paidTs || '').startsWith(m));
    const total = mItems.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    return { m, total, items: mItems };
  });

  const maxVal = Math.max(...chartRows.map(r => r.total), 1);

  const barsHTML = chartRows.map(r => {
    const pct = Math.round(r.total / maxVal * 100);
    const lbl = r.m.slice(5) + '/' + r.m.slice(2, 4);
    return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">'
      + '<div style="font-size:10px;color:var(--t2);font-weight:500">₺' + Math.round(r.total / 1000) + 'k</div>'
      + '<div style="flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center">'
      + '<div style="width:32px;background:var(--ac);border-radius:4px 4px 0 0;height:' + pct + '%;min-height:4px;transition:height .3s"></div>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--t3)">' + lbl + '</div>'
      + '</div>';
  }).join('');

  mo.innerHTML = '<div class="moc" style="max-width:540px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div class="mt" style="margin-bottom:0">Son 6 Ay Harcama Grafiği</div>'
    + '<button onclick="document.getElementById(\'mo-odm-chart\')?.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="display:flex;align-items:flex-end;gap:6px;height:160px;padding:0 8px;border-left:1px solid var(--b);border-bottom:1px solid var(--b)">'
    + barsHTML
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="document.getElementById(\'mo-odm-chart\')?.remove()">Kapat</button></div>'
    + '</div>';

  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openOdmChart = openOdmChart;

// ════════════════════════════════════════════════════════════════
// 8. BELGE SÜRESİ UYARISI
// ════════════════════════════════════════════════════════════════
function checkOdmDocExpiry() {
  const items = window.loadOdm ? loadOdm() : [];
  const today = _todayStr();
  const todayD = new Date(today);
  items.forEach(o => {
    if (!o.sozlesmeBitis) return;
    const exp = new Date(o.sozlesmeBitis);
    const diff = Math.ceil((exp - todayD) / 86400000);
    if (diff <= 30 && diff > 0) {
      const key = 'odm_doc_exp_' + o.id + '_' + today.slice(0, 7);
      if (!localStorage.getItem(key)) {
        window.addNotif?.('📋', '"' + o.name + '" sözleşmesi ' + diff + ' günde sona eriyor', diff <= 7 ? 'err' : 'warn', 'odemeler');
        localStorage.setItem(key, '1');
      }
    }
  });
}
window.checkOdmDocExpiry = checkOdmDocExpiry;

// ════════════════════════════════════════════════════════════════
// 9. ÖDEME NOTU GEÇMİŞİ
// ════════════════════════════════════════════════════════════════
function addOdmNote(id, note) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  if (!o.history) o.history = [];
  o.history.unshift({
    ts: _nowTso(),
    user: _CUo()?.name || 'Kullanıcı',
    action: 'not',
    note: note.trim(),
  });
  window.storeOdm ? storeOdm(d) : null;
  window.toast?.('Not eklendi ✓', 'ok');
  renderOdemeler();
}

function viewOdmHistory(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o) return;
  const hist = o.history || [];
  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:420px">'
    + '<div class="mt">' + o.name + ' — Geçmiş</div>'
    + (hist.length === 0
      ? '<p style="color:var(--t3);font-size:13px;text-align:center;padding:24px">Kayıt yok</p>'
      : hist.map(h => '<div style="padding:8px 0;border-bottom:1px solid var(--b)">'
        + '<div style="font-size:11px;color:var(--t3)">' + h.ts + ' · ' + h.user + '</div>'
        + '<div style="font-size:12px;color:var(--t);margin-top:2px">' + (h.note || h.action) + '</div>'
        + '</div>').join(''))
    + '<div class="mf" style="margin-top:12px">'
    + '<input class="fi" id="odm-hist-note" placeholder="Yeni not ekle..." style="flex:1">'
    + '<button class="btn btnp" onclick="addOdmNote(' + id + ',document.getElementById(&quot;odm-hist-note&quot;).value);this.closest(&quot;.mo&quot;)?.remove()">Ekle</button>'
    + '<button class="btn" onclick="this.closest(&quot;.mo&quot;)?.remove()">Kapat</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

window.addOdmNote = addOdmNote;
window.viewOdmHistory = viewOdmHistory;

// ════════════════════════════════════════════════════════════════
// 10. SATINALMA → ÖDEME OTOMATİK BAĞLANTISI (API hazır)
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// KAYNAK ETİKETİ — Tablo satırında kaynak göster
// ════════════════════════════════════════════════════════════════
const ODM_SOURCES = {
  manual:    { l: 'Manuel',     ic: '✍', c: '#6B7280' },
  satinalma: { l: 'Satınalma',  ic: '🛒', c: '#6366F1' },
  fatura:    { l: 'Fatura',     ic: '📄', c: '#F97316' },
  otomatik:  { l: 'Oto.Ödeme',  ic: '🏦', c: '#10B981' },
};

function _odmSourceBadge(o) {
  const src = ODM_SOURCES[o.source] || ODM_SOURCES.manual;
  return '<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(107,114,128,.1);color:' + src.c + ';margin-left:4px">' + src.ic + ' ' + src.l + '</span>';
}

function createOdmFromPurchase(purchase) {
  if (!purchase || !purchase.totalAmount) return;
  // Güvenlik: onaysız kayıt nakit akışına düşmez
  if (purchase.status === 'pending' || purchase.status === 'revize_gerekli') {
    console.warn('[Ödemeler] Onaysız satınalma — nakit akışına yansımıyor');
    return;
  }
  var d = window.loadOdm ? loadOdm() : [];
  var now = _nowTso();
  var cur = purchase.currency || 'TRY';
  var rates = _odmGetRates();
  var kurRate = rates[cur] || 1;

  // Avans ödemesi — orijinal döviz + TL karşılığı
  if (purchase.advanceAmount && purchase.advanceDate) {
    var advTL = cur === 'TRY' ? purchase.advanceAmount : Math.round(purchase.advanceAmount * kurRate * 100) / 100;
    d.unshift({
      id: generateNumericId(),
      name: purchase.name + ' — Avans',
      source: 'satinalma',
      cat: 'diger', freq: 'teksefer',
      amount: purchase.advanceAmount,
      currency: cur,
      originalAmount: purchase.advanceAmount,
      originalCurrency: cur,
      tlAmount: advTL,
      kurRate: kurRate,
      due: purchase.advanceDate,
      note: 'Satınalma #' + purchase.id + ' avans ödemesi',
      paid: false, alarmDays: 3,
      assignedTo: purchase.assignedTo || null,
      purchaseId: purchase.id,
      ts: now, createdBy: _CUo()?.id,
    });
  }

  // Bakiye ödemesi — orijinal döviz + TL karşılığı
  var balance = purchase.totalAmount - (purchase.advanceAmount || 0);
  if (balance > 0 && purchase.balanceDate) {
    var balTL = cur === 'TRY' ? balance : Math.round(balance * kurRate * 100) / 100;
    d.unshift({
      id: generateNumericId(),
      name: purchase.name + ' — Bakiye',
      source: 'satinalma',
      cat: 'diger', freq: 'teksefer',
      amount: balance,
      currency: cur,
      originalAmount: balance,
      originalCurrency: cur,
      tlAmount: balTL,
      kurRate: kurRate,
      due: purchase.balanceDate,
      note: 'Satınalma #' + purchase.id + ' bakiye ödemesi',
      paid: false, alarmDays: 3,
      assignedTo: purchase.assignedTo || null,
      purchaseId: purchase.id,
      ts: now, createdBy: _CUo()?.id,
    });
  }

  window.storeOdm ? storeOdm(d) : null;
  window.toast?.('Ödeme listesine eklendi ✓', 'ok');
  renderOdemeler();
}
window.createOdmFromPurchase = createOdmFromPurchase;


// ════════════════════════════════════════════════════════════════
// CHİP FİLTRE SİSTEMİ
// ════════════════════════════════════════════════════════════════
let _odmActiveFilters = { src: '', cat: '', status: '' };

function _odmChipClick(el) {
  const filter = el.dataset.filter;
  const val    = el.dataset.val;

  // Aynı chip'e tıklanırsa kaldır
  const isSame = _odmActiveFilters[filter] === val;
  _odmActiveFilters[filter] = isSame ? '' : val;

  // Chip görünümünü güncelle
  document.querySelectorAll(`.odm-chip[data-filter="${filter}"]`).forEach(c => {
    c.classList.remove('odm-chip-active');
  });

  if (!isSame) el.classList.add('odm-chip-active');

  // "Tümü" chip'i — sadece src için
  if (filter === 'src') {
    const allChip = document.querySelector('.odm-chip[data-filter="src"][data-val=""]');
    if (allChip) {
      if (_odmActiveFilters.src === '') allChip.classList.add('odm-chip-active');
      else allChip.classList.remove('odm-chip-active');
    }
  }

  // hidden select'leri güncelle (eski uyumluluk)
  if (filter === 'cat') {
    const sel = document.getElementById('odm-cat-f');
    if (sel) sel.value = _odmActiveFilters.cat;
  }
  if (filter === 'status') {
    const sel = document.getElementById('odm-status-f');
    if (sel) sel.value = _odmActiveFilters.status;
  }

  renderOdemeler();
}

function _odmClearFilters() {
  _odmActiveFilters = { src: '', cat: '', status: '' };
  document.querySelectorAll('.odm-chip').forEach(c => c.classList.remove('odm-chip-active'));
  const allChip = document.querySelector('.odm-chip[data-filter="src"][data-val=""]');
  if (allChip) allChip.classList.add('odm-chip-active');
  const s = document.getElementById('odm-search');
  if (s) s.value = '';
  const uf = document.getElementById('odm-user-f');
  if (uf) uf.value = '';
  const ff = document.getElementById('odm-freq-f');
  if (ff) ff.value = '';
  renderOdemeler();
}

window._odmChipClick    = _odmChipClick;
window._odmClearFilters = _odmClearFilters;


// ════════════════════════════════════════════════════════════════
// OTOMATİK ÖDEME TALİMATI SİSTEMİ
// Elektrik, su, telefon vb. bankadan otomatik ödeniyor
// ════════════════════════════════════════════════════════════════
function openOdmTalimatModal(id) {
  const existing = document.getElementById('mo-odm-talimat');
  if (existing) existing.remove();

  const all = window.loadOdm ? loadOdm() : [];
  const o = id ? all.find(x => x.id === id) : null;
  if (!o) return;

  const t = o.talimat || {};
  const users = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];

  const BANKALAR = ['Garanti', 'İş Bankası', 'Yapı Kredi', 'Ziraat', 'Halkbank', 'Vakıfbank', 'Akbank', 'QNB Finansbank', 'Denizbank', 'ING', 'HSBC', 'Diğer'];

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-talimat'; ;

  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="background:#1e1b4b;padding:16px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">'
    + '<div>'
    + '<div style="font-size:14px;font-weight:600">🏦 Otomatik Ödeme Talimatı</div>'
    + '<div style="font-size:11px;opacity:.7;margin-top:2px">' + o.name + '</div>'
    + '</div>'
    + '<button onclick="document.getElementById(\'mo-odm-talimat\')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:18px">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px">'

    // Banka seç
    + '<div class="fr"><div class="fl">BANKA</div>'
    + '<select class="fi" id="tal-f-banka" style="border-radius:8px">'
    + '<option value="">— Banka Seçin —</option>'
    + BANKALAR.map(b => '<option value="' + b + '"' + (t.banka === b ? ' selected' : '') + '>' + b + '</option>').join('')
    + '</select></div>'

    // Hesap / IBAN
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">HESAP / IBAN</div><input class="fi" id="tal-f-iban" placeholder="TR..." value="' + (t.iban || '') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">TALİMAT NO</div><input class="fi" id="tal-f-no" placeholder="Opsiyonel" value="' + (t.no || '') + '" style="border-radius:8px"></div>'
    + '</div>'

    // Talimat tarihi + talimat veren
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">TALİMAT TARİHİ</div><input type="date" class="fi" id="tal-f-tarih" value="' + (t.tarih || '') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">TALİMAT VEREN</div>'
    + '<select class="fi" id="tal-f-veren" style="border-radius:8px">'
    + '<option value="">— Seçin —</option>'
    + users.map(u => '<option value="' + u.id + '"' + (t.verenId === u.id ? ' selected' : '') + '>' + u.name + '</option>').join('')
    + '</select></div>'
    + '</div>'

    // Ödeme günü + limit
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">HER AYIN KAÇ. GÜNÜ</div><input class="fi" type="number" id="tal-f-gun" min="1" max="31" placeholder="15" value="' + (t.gun || '') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">MAKSİMUM LİMİT (₺)</div><input class="fi" type="number" id="tal-f-limit" placeholder="Sınırsız" value="' + (t.limit || '') + '" style="border-radius:8px"></div>'
    + '</div>'

    // Durum + not
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">DURUM</div>'
    + '<select class="fi" id="tal-f-durum" style="border-radius:8px">'
    + '<option value="aktif"' + ((!t.durum || t.durum === 'aktif') ? ' selected' : '') + '>✅ Aktif</option>'
    + '<option value="iptal"' + (t.durum === 'iptal' ? ' selected' : '') + '>❌ İptal Edildi</option>'
    + '<option value="bekle"' + (t.durum === 'bekle' ? ' selected' : '') + '>⏳ Bekleniyor</option>'
    + '</select></div>'
    + '<div class="fr"><div class="fl">İLGİLİ KURUM</div><input class="fi" id="tal-f-kurum" placeholder="BEDAŞ, Türk Telekom..." value="' + (t.kurum || '') + '" style="border-radius:8px"></div>'
    + '</div>'

    + '<div class="fr"><div class="fl">NOT / AÇIKLAMA</div>'
    + '<textarea class="fi" id="tal-f-not" rows="2" style="resize:none;border-radius:8px" placeholder="Ek bilgi...">' + (t.not || '') + '</textarea></div>'

    + '<input type="hidden" id="tal-f-odmid" value="' + o.id + '">'
    + '</div>'
    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + (t.banka ? '<button class="btn btns" onclick="removeOdmTalimat(' + o.id + ')" style="color:var(--rdt)">Talimatı Kaldır</button>' : '<div></div>')
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-talimat\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="saveOdmTalimat()" style="padding:8px 20px;border-radius:9px">💾 Kaydet</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function saveOdmTalimat() {
  const odmId = parseInt(_go('tal-f-odmid')?.value || '0');
  const all = window.loadOdm ? loadOdm() : [];
  const o = all.find(x => x.id === odmId);
  if (!o) return;

  const users = window.loadUsers ? loadUsers() : [];
  const verenId = parseInt(_go('tal-f-veren')?.value || '0') || null;
  const veren = users.find(u => u.id === verenId);

  o.talimat = {
    banka:   _go('tal-f-banka')?.value   || '',
    iban:    _go('tal-f-iban')?.value    || '',
    no:      _go('tal-f-no')?.value      || '',
    tarih:   _go('tal-f-tarih')?.value   || '',
    verenId: verenId,
    verenAd: veren?.name || '',
    gun:     parseInt(_go('tal-f-gun')?.value || '0') || null,
    limit:   parseFloat(_go('tal-f-limit')?.value || '0') || null,
    durum:   _go('tal-f-durum')?.value   || 'aktif',
    kurum:   _go('tal-f-kurum')?.value   || '',
    not:     _go('tal-f-not')?.value     || '',
    ts:      _nowTso(),
  };
  o.source = 'otomatik';
  window.storeOdm ? storeOdm(all) : null;
  _go('mo-odm-talimat')?.remove();
  window.toast?.('✅ Otomatik ödeme talimatı kaydedildi', 'ok');
  renderOdemeler();
}

function removeOdmTalimat(id) {
  window.confirmModal('Otomatik ödeme talimatını kaldırmak istiyor musunuz?', {
    title: 'Talimat Kaldır',
    danger: true,
    confirmText: 'Evet, Kaldır',
    onConfirm: () => {
      const all = window.loadOdm ? loadOdm() : [];
      const o = all.find(x => x.id === id);
      if (!o) return;
      delete o.talimat;
      o.source = 'manual';
      window.storeOdm ? storeOdm(all) : null;
      _go('mo-odm-talimat')?.remove();
      window.toast?.('Talimat kaldırıldı', 'ok');
      renderOdemeler();
    }
  });
}

window.openOdmTalimatModal = openOdmTalimatModal;
window.saveOdmTalimat      = saveOdmTalimat;
window.removeOdmTalimat    = removeOdmTalimat;

// ════════════════════════════════════════════════════════════════
// YÖNETİCİ ONAY AKIŞI — Abonelik & otomatik hariç
// ════════════════════════════════════════════════════════════════
const ODM_AUTO_CATS = ['abonelik', 'fatura']; // Bunlar onay gerektirmez

function _odmNeedsApproval(o) {
  // Admin/manager oluşturmuşsa onay gerekmez
  if (o.approvedBy) return false;
  if (o.approved) return false;
  // Otomatik ödeme talimatı aktifse onay gerekmez
  if (o.talimat?.durum === 'aktif') return false;
  // Diğer tüm ödemeler onay gerektirir
  return true;
}

function approveOdm(id) {
  if (!window.Auth?.getCU?.()?.role || !['admin','manager'].includes(window.Auth.getCU().role)) {
    window.toast?.('Bu işlem için yönetici yetkisi gerekli', 'err'); return;
  }
  const all = window.loadOdm ? loadOdm() : [];
  const o = all.find(x => x.id === id); if (!o) return;

  // Erteleme onayıysa tarihi güncelle
  if (o.approvalStatus === 'pending_postpone' && o.postponeDate) {
    o.due = o.postponeDate;
    o.postponeApproved = true;
    window.toast?.('Erteleme onaylandı — yeni tarih: ' + o.due, 'ok');
    window.addNotif?.('✅', '"' + escapeHtml(o.name) + '" erteleme onaylandı → ' + o.due, 'ok', 'odemeler');
  } else {
    window.toast?.('Ödeme onaylandı', 'ok');
  }

  o.approvalStatus = 'approved';
  o.approved       = true;
  o.approvedBy     = window.Auth.getCU().id;
  o.approvedAt     = _nowTso();
  window.storeOdm ? storeOdm(all) : null;
  renderOdemeler();
}
window.approveOdm = approveOdm;

// ════════════════════════════════════════════════════════════════
// DİNAMİK ONAY HİYERARŞİSİ + APPROVAL LOG + SLA + BANKA
// ════════════════════════════════════════════════════════════════

const ODM_APPROVAL_STATUS = {
  pending:                { l:'Onay Bekliyor',           c:'#F59E0B', bg:'rgba(245,158,11,.08)' },
  ara_onay_bekleniyor:    { l:'Ara Onay Bekliyor',       c:'#3B82F6', bg:'rgba(59,130,246,.08)' },
  final_onay_bekleniyor:  { l:'Final Onay Bekliyor',     c:'#8B5CF6', bg:'rgba(139,92,246,.08)' },
  kesinlesti:             { l:'Kesinleşti',              c:'#10B981', bg:'rgba(16,185,129,.08)' },
  approved:               { l:'Onaylı',                  c:'#10B981', bg:'rgba(16,185,129,.08)' },
  pending_postpone:       { l:'Erteleme Onayı',          c:'#F97316', bg:'rgba(249,115,22,.08)' },
};

const ODM_BANKS = [
  {id:'garanti',  l:'Garanti BBVA',    ic:'🏦'},
  {id:'isbank',   l:'İş Bankası',      ic:'🏦'},
  {id:'akbank',   l:'Akbank',          ic:'🏦'},
  {id:'yapi',     l:'Yapı Kredi',      ic:'🏦'},
  {id:'qnb',      l:'QNB Finansbank',  ic:'🏦'},
  {id:'ziraat',   l:'Ziraat Bankası',  ic:'🏦'},
  {id:'vakif',    l:'VakıfBank',       ic:'🏦'},
  {id:'diger',    l:'Diğer',           ic:'🏢'},
];

// Approval Log — her ödeme için onay geçmişi
function _addApprovalLog(odmId, action, note) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === odmId); if (!o) return;
  if (!o.approvalLog) o.approvalLog = [];
  const cu = _CUo();
  o.approvalLog.push({ ts: _nowTso(), action, actorId: cu?.id, actorName: cu?.name||'Sistem', note: note||'' });
  window.storeOdm ? storeOdm(d) : null;
}

// Dinamik onay modalı — kişi seçimi
function openApprovalFlow(odmId) {
  const users = window.loadUsers?.() || [];
  const managers = users.filter(u => ['admin','manager'].includes(u.role) && u.status === 'active');
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === odmId);
  if (!o) return;

  const old = document.getElementById('mo-odm-approval'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-odm-approval'; ;
  const amount = parseFloat(o.amount||0);
  const needsDualApproval = amount >= 5000;

  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:16px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">Onaya Gonder</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + escapeHtml(o.name) + ' — ' + amount.toLocaleString('tr-TR') + ' TL</div>'
      + (needsDualApproval ? '<div style="font-size:10px;color:#F59E0B;margin-top:4px;font-weight:600">5.000 TL ustu — cift onay gerekli</div>' : '')
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<div class="fg"><div class="fl">ARA ONAYCI <span style="color:var(--rd)">*</span></div>'
        + '<select class="fi" id="oaf-approver">' + managers.map(u => '<option value="' + u.id + '">' + escapeHtml(u.name) + ' (' + u.role + ')</option>').join('') + '</select></div>'
      + (needsDualApproval ? '<div class="fg"><div class="fl">FİNAL ONAYCI</div><div style="font-size:11px;color:var(--t3);padding:6px 0">Ara onay sonrasi ilk yoneticiye otomatik gider</div></div>' : '')
      + '<div class="fg"><div class="fl">NOT (opsiyonel)</div><input class="fi" id="oaf-note" placeholder="Onay notu..."></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-odm-approval\').remove()">Iptal</button>'
      + '<button class="btn btnp" onclick="window._submitApprovalFlow(' + odmId + ')">Gonder</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}

window._submitApprovalFlow = function(odmId) {
  const approverId = parseInt(document.getElementById('oaf-approver')?.value || '0');
  const note = (document.getElementById('oaf-note')?.value || '').trim();
  if (!approverId) { window.toast?.('Onayci secin', 'err'); return; }

  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === odmId); if (!o) return;

  o.approvalStatus = 'ara_onay_bekleniyor';
  o.araOnayci = approverId;
  o.approvalRequestedBy = _CUo()?.id;
  o.approvalRequestedAt = _nowTso();
  if (!o.approvalLog) o.approvalLog = [];
  o.approvalLog.push({ ts: _nowTso(), action: 'onaya_gonderildi', actorId: _CUo()?.id, actorName: _CUo()?.name||'', note });

  window.storeOdm ? storeOdm(d) : null;
  document.getElementById('mo-odm-approval')?.remove();
  window.addNotif?.('💰', '"' + escapeHtml(o.name) + '" onayinizi bekliyor', 'warn', 'odemeler', approverId);
  window.toast?.('Onaya gonderildi', 'ok');
  renderOdemeler();
};

// Ara onay + final onay
function processOdmApproval(odmId, action) {
  if (!_isAdminO()) { window.toast?.('Yetki gerekli', 'err'); return; }
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === odmId); if (!o) return;
  const cu = _CUo();

  if (!o.approvalLog) o.approvalLog = [];

  if (action === 'ara_onayla') {
    const amount = parseFloat(o.amount||0);
    if (amount >= 5000) {
      // Çift onay — final onaya gönder
      o.approvalStatus = 'final_onay_bekleniyor';
      o.araOnaylayanId = cu?.id;
      o.araOnaylayanAt = _nowTso();
      o.approvalLog.push({ ts: _nowTso(), action: 'ara_onaylandi', actorId: cu?.id, actorName: cu?.name||'', note: '' });
      window.toast?.('Ara onay verildi — final onay bekleniyor', 'ok');
    } else {
      // Tek onay — direkt kesinleş
      o.approvalStatus = 'kesinlesti';
      o.approved = true;
      o.approvedBy = cu?.id;
      o.approvedAt = _nowTso();
      o.approvalLog.push({ ts: _nowTso(), action: 'kesinlesti', actorId: cu?.id, actorName: cu?.name||'', note: '' });
      window.toast?.('Odeme kesinlesti', 'ok');
    }
  } else if (action === 'final_onayla') {
    o.approvalStatus = 'kesinlesti';
    o.approved = true;
    o.approvedBy = cu?.id;
    o.approvedAt = _nowTso();
    o.approvalLog.push({ ts: _nowTso(), action: 'final_onaylandi', actorId: cu?.id, actorName: cu?.name||'', note: '' });
    window.toast?.('Final onay verildi — odeme kesinlesti', 'ok');
  } else if (action === 'reddet') {
    o.approvalStatus = 'rejected';
    o.approvalLog.push({ ts: _nowTso(), action: 'reddedildi', actorId: cu?.id, actorName: cu?.name||'', note: '' });
    window.toast?.('Odeme reddedildi', 'ok');
  }

  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
}
window.openApprovalFlow = openApprovalFlow;
window.processOdmApproval = processOdmApproval;

// SLA takibi — 24 saat geçen onay bekleyen ödemeler için hatırlatıcı
function checkOdmSLA() {
  var d = window.loadOdm ? loadOdm() : [];
  var now = Date.now();
  d.forEach(function(o) {
    if (!o.approvalRequestedAt) return;
    if (o.approvalStatus === 'kesinlesti' || o.approvalStatus === 'approved' || o.approved) return;
    var reqMs = new Date(o.approvalRequestedAt.replace(' ','T')).getTime();
    if (isNaN(reqMs)) return;
    var hoursSince = (now - reqMs) / 3600000;
    var slaKey = 'odm_sla_' + o.id;
    if (hoursSince >= 24 && !localStorage.getItem(slaKey)) {
      localStorage.setItem(slaKey, '1');
      window.addNotif?.('⏰', '"' + (o.name||'Odeme') + '" 24+ saattir onay bekliyor!', 'err', 'odemeler');
    }
  });
  // storeOdm ÇAĞIRILMIYOR — render sırasında Firestore write yasak (sonsuz döngü)
}

// Approval timeline gösterimi
function showOdmApprovalTimeline(odmId) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === odmId);
  if (!o) return;
  const log = o.approvalLog || [];
  const st = ODM_APPROVAL_STATUS[o.approvalStatus] || ODM_APPROVAL_STATUS.pending;

  const old = document.getElementById('mo-odm-timeline'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-odm-timeline'; ;
  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:12px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">Onay Gecmisi</div>'
        + '<div style="font-size:11px;color:var(--t3)">' + escapeHtml(o.name||'') + '</div></div>'
      + '<span style="font-size:10px;padding:3px 10px;border-radius:6px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span>'
    + '</div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
      + (log.length ? log.map((l,i) => '<div style="display:flex;gap:10px;padding-bottom:12px;'+(i<log.length-1?'border-left:2px solid var(--b);margin-left:5px;padding-left:16px':'margin-left:5px;padding-left:16px')+'">'
        + '<div style="width:12px;height:12px;border-radius:50%;background:var(--ac);flex-shrink:0;margin-top:2px;margin-left:-22px"></div>'
        + '<div><div style="font-size:12px;font-weight:500;color:var(--t)">' + escapeHtml(l.actorName||'?') + ' — ' + escapeHtml(l.action||'') + '</div>'
          + '<div style="font-size:10px;color:var(--t3)">' + (l.ts||'').slice(0,16) + '</div>'
          + (l.note ? '<div style="font-size:11px;color:var(--t2);margin-top:2px">' + escapeHtml(l.note) + '</div>' : '')
        + '</div></div>').join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Henuz onay gecmisi yok</div>')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn" onclick="document.getElementById(\'mo-odm-timeline\').remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window.showOdmApprovalTimeline = showOdmApprovalTimeline;

// Görev ID arama (debounce)
var _odmTaskTimer = null;
window._odmTaskSearch = function(val) {
  clearTimeout(_odmTaskTimer);
  var badge = document.getElementById('odm-task-badge');
  if (!badge) return;
  if (!val || !val.trim()) { badge.innerHTML = ''; return; }
  _odmTaskTimer = setTimeout(function() {
    var tasks = window.loadTasks?.() || [];
    var q = val.trim().toLowerCase();
    var found = tasks.find(function(t) { return String(t.id) === q || (t.title || '').toLowerCase().includes(q); });
    if (found) {
      badge.innerHTML = '<span style="color:#10B981;font-weight:600">&#10003; ' + escapeHtml(found.title) + '</span>';
      var inp = document.getElementById('odm-f-taskid');
      if (inp) inp.value = found.id;
    } else {
      badge.innerHTML = '<span style="color:#EF4444">Gorev bulunamadi</span>';
    }
  }, 500);
};

// Yüksek tutar uyarısı — saveOdm'u wrap et
// Eşik admin ayarlarından okunur (localStorage)
var ODM_HIGH_AMOUNT_KEY = 'odm_high_amount_settings';
function _getHighAmountThreshold() {
  try { var s = JSON.parse(localStorage.getItem(ODM_HIGH_AMOUNT_KEY) || '{}'); return { tl: s.tl || 50000, usd: s.usd || 10000 }; } catch(e) { return { tl: 50000, usd: 10000 }; }
}
/** Admin yüksek tutar eşiği ayarla */
window.openHighAmountSettings = function() {
  if (!_isAdminO()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var t = _getHighAmountThreshold();
  var ex = document.getElementById('mo-high-amt'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-high-amt'; ;
  mo.innerHTML = '<div class="moc" style="max-width:360px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">⚠️ Yüksek Tutar Eşiği</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<div><div class="fl">TL Eşiği</div><input type="number" class="fi" id="ha-tl" value="' + t.tl + '" style="border-radius:7px"></div>'
    + '<div><div class="fl">USD Eşiği</div><input type="number" class="fi" id="ha-usd" value="' + t.usd + '" style="border-radius:7px"></div>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-high-amt\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="localStorage.setItem(\'' + ODM_HIGH_AMOUNT_KEY + '\',JSON.stringify({tl:parseFloat(document.getElementById(\'ha-tl\').value)||50000,usd:parseFloat(document.getElementById(\'ha-usd\').value)||10000}));document.getElementById(\'mo-high-amt\')?.remove();window.toast?.(\'Eşik kaydedildi\',\'ok\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

(function() {
  var _origSaveOdm = saveOdm;
  saveOdm = function() {
    var amt = parseFloat(document.getElementById('odm-f-amount')?.value || '0') || 0;
    var cur = document.getElementById('odm-f-currency')?.value || 'TRY';
    var thresholds = _getHighAmountThreshold();
    var threshold = cur === 'TRY' ? thresholds.tl : thresholds.usd;
    if (amt >= threshold) {
      window.confirmModal('Yüksek Tutar Uyarısı: ' + amt.toLocaleString('tr-TR') + ' ' + cur + ' (eşik: ' + threshold.toLocaleString('tr-TR') + '). Devam etmek istiyor musunuz?', {
        title: 'Yüksek Tutar', danger: false, confirmText: 'Evet, Kaydet',
        onConfirm: function() { _origSaveOdm(); }
      });
    } else {
      _origSaveOdm();
    }
  };
  window.saveOdm = saveOdm;
})();

// Silme yetkisi — onay sürecindeki kayıtlar silinemez
(function() {
  var _origDel = delOdm;
  delOdm = function(id) {
    var all = window.loadOdm ? loadOdm() : [];
    var o = all.find(function(x) { return x.id === id; });
    if (o && o.approvalStatus && o.approvalStatus !== 'draft' && o.approvalStatus !== null) {
      if (!window.isAdmin?.()) {
        window.toast?.('Onay surecindeki kayitlar silinemez — yonetici onayi gerekli', 'err');
        return;
      }
    }
    _origDel(id);
  };
  window.delOdm = delOdm;
})();

// ════════════════════════════════════════════════════════════════
// CANLI KUR BANDI — USD/EUR/GBP + Altın + BTC
// 3 dakikada bir güncelleme, %2 değişim alarmı, kaydırmalı ticker
// ════════════════════════════════════════════════════════════════

/** @type {Object} Güncel kur verileri */
var _tickerRates = { USD: 38.50, EUR: 41.20, GBP: 48.90, ALTIN: 3850, BTC: 67000 };

/** @type {Object} Önceki kur verileri — değişim hesabı için */
var _tickerRatesPrev = {};

/** @type {number|null} Otomatik güncelleme interval ID */
var _tickerInterval = null;

/** @type {string} Son güncelleme zamanı */
var _tickerLastUpdate = '';

/**
 * Kur bandını render eder — sağdan sola kayan animasyonlu ticker.
 * İçerik iki kere tekrarlanır (sonsuz kaydırma efekti için).
 * @returns {void}
 */
function renderKurTicker() {
  var inner = document.getElementById('odm-kur-ticker-inner');
  if (!inner) return;

  var items = [
    { key: 'USD', flag: '🇺🇸', sym: '$' },
    { key: 'EUR', flag: '🇪🇺', sym: '€' },
    { key: 'GBP', flag: '🇬🇧', sym: '£' },
    { key: 'ALTIN', flag: '🥇', sym: 'gr' },
    { key: 'BTC', flag: '₿', sym: '' },
  ];

  var html = items.map(function(item) {
    var val  = _tickerRates[item.key] || 0;
    var prev = _tickerRatesPrev[item.key] || 0;
    var pct  = prev > 0 ? ((val - prev) / prev * 100) : 0;
    var arrow = pct > 0.01 ? '▲' : (pct < -0.01 ? '▼' : '');
    var arrowColor = pct > 0.01 ? '#10B981' : (pct < -0.01 ? '#EF4444' : 'var(--t3)');
    var valStr = item.key === 'BTC'
      ? '$' + Math.round(val).toLocaleString('en-US')
      : val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 14px;font-size:11px;font-weight:600;color:var(--t);white-space:nowrap">'
      + '<span style="font-size:13px">' + item.flag + '</span>'
      + '<span style="color:var(--ac);font-weight:700">' + item.key + '</span> '
      + valStr
      + (arrow ? ' <span style="color:' + arrowColor + ';font-size:9px;font-weight:700">' + arrow + ' ' + Math.abs(pct).toFixed(1) + '%</span>' : '')
      + '</span>'
      + '<span style="color:var(--b);padding:0 2px">│</span>';
  }).join('');

  // Son güncelleme zamanı
  var tsLabel = _tickerLastUpdate
    ? '<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 14px;font-size:10px;color:var(--t3);white-space:nowrap">🕐 ' + _tickerLastUpdate + '</span>'
    : '';

  // İçeriği 2x tekrarla — sonsuz kaydırma efekti
  inner.innerHTML = html + tsLabel + html + tsLabel;
}

/**
 * Tüm kur verilerini API'lerden çeker.
 * USD/EUR/GBP → exchangerate-api.com
 * Altın → metals.live (fallback: sabit mock)
 * BTC → CoinGecko
 * @returns {void}
 */
function fetchKurRates() {
  // Önceki değerleri sakla (değişim alarmı için)
  _tickerRatesPrev = Object.assign({}, _tickerRates);
  var updated = false;

  // 1) USD/EUR/GBP — exchangerate-api.com
  fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.rates && d.rates.TRY) {
        _tickerRates.USD = Math.round(d.rates.TRY * 100) / 100;
        _tickerRates.EUR = Math.round(d.rates.TRY / (d.rates.EUR || 1) * 100) / 100;
        _tickerRates.GBP = Math.round(d.rates.TRY / (d.rates.GBP || 1) * 100) / 100;
        updated = true;
      }
    })
    .catch(function(e) { console.warn('[Kur] Döviz API hatası:', e.message); })
    .finally(function() {
      _tickerLastUpdate = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      renderKurTicker();
      if (updated) _checkKurAlarm();
    });

  // 2) Altın — metals.live (CORS proxy + localStorage fallback)
  fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.metals.live/v1/spot'))
    .then(function(r) { if (!r.ok) throw new Error('proxy'); return r.json(); })
    .then(function(d) {
      // API [{gold: X, silver: Y, ...}] formatında döner
      if (Array.isArray(d) && d.length > 0 && d[0].gold) {
        // oz → gram: 1 troy oz = 31.1035 gram
        var ozToGram = 31.1035;
        var goldUsdPerGram = d[0].gold / ozToGram;
        // TL'ye çevir
        var tryRate = _tickerRates.USD || 38.50;
        _tickerRates.ALTIN = Math.round(goldUsdPerGram * tryRate * 100) / 100;
        localStorage.setItem('ak_altin_cache', JSON.stringify({ ts: Date.now(), rate: _tickerRates.ALTIN }));
        renderKurTicker();
        _checkKurAlarm();
      }
    })
    .catch(function() {
      // localStorage fallback — son bilinen fiyat
      try { var c = JSON.parse(localStorage.getItem('ak_altin_cache') || '{}'); if (c.rate) { _tickerRates.ALTIN = c.rate; } } catch(e) {}
      renderKurTicker();
    });

  // 3) BTC — CoinGecko
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.bitcoin && d.bitcoin.usd) {
        _tickerRates.BTC = Math.round(d.bitcoin.usd * 100) / 100;
        renderKurTicker();
        _checkKurAlarm();
      }
    })
    .catch(function(e) {
      console.warn('[Kur] BTC API hatası:', e.message);
    });
}

/**
 * %2 üzerinde kur değişimi varsa yöneticiye bildirim gönderir.
 * @returns {void}
 */
function _checkKurAlarm() {
  if (!_isManagerO()) return;
  var THRESHOLD = 2; // %2

  var labels = { USD: 'Dolar', EUR: 'Euro', GBP: 'Sterlin', ALTIN: 'Altın', BTC: 'Bitcoin' };

  Object.keys(_tickerRates).forEach(function(key) {
    var cur  = _tickerRates[key] || 0;
    var prev = _tickerRatesPrev[key] || 0;
    if (prev <= 0 || cur <= 0) return;

    var pct = Math.abs((cur - prev) / prev * 100);
    if (pct >= THRESHOLD) {
      var direction = cur > prev ? '📈 yükseldi' : '📉 düştü';
      var msg = (labels[key] || key) + ' ' + direction + ': '
        + prev.toLocaleString('tr-TR') + ' → ' + cur.toLocaleString('tr-TR')
        + ' (%' + pct.toFixed(1) + ')';
      window.addNotif?.('🚨', msg, 'warn', 'odemeler');
      window.logActivity?.('finans', 'Kur alarmı: ' + msg);
    }
  });
}

/**
 * 3 dakikada bir kur güncelleme interval'ını başlatır.
 * Çift çağrı koruması vardır.
 * @returns {void}
 */
function _startKurTicker() {
  if (_tickerInterval) clearInterval(_tickerInterval);
  fetchKurRates();
  _tickerInterval = setInterval(fetchKurRates, 180000); // 3 dakika
}

window._odmFetchKur = fetchKurRates;

// ════════════════════════════════════════════════════════════════
// NAKİT PROJEKSİYON — 15 Günlük Grafik (Sekme + Widget)
// Sadece approved/kesinlesti statüsündeki kayıtlar dahil
// ════════════════════════════════════════════════════════════════

/**
 * 15 günlük nakit projeksiyonu verisini hesaplar.
 * Sadece onaylanmış (approved/kesinlesti) kayıtları dahil eder.
 * @returns {{ days: Array, totalOdeme: number, totalTahsilat: number, cumNet: number }}
 */
function _calcProjeksiyon() {
  var odm = window.loadOdm?.() || [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var today = new Date();
  var days = [];
  var totalOdeme = 0;
  var totalTahsilat = 0;
  var cumNet = 0;

  // Sadece onaylanmış/kesinleşmiş ödemeleri filtrele
  var confirmedOdm = odm.filter(function(o) {
    if (o.paid) return false; // zaten ödenmişleri hariç tut
    return o.approved || o.approvalStatus === 'kesinlesti' || o.approvalStatus === 'approved' || !o.approvalStatus;
  });

  // Sadece onaylanmış/kesinleşmiş tahsilatları filtrele
  var confirmedTah = tah.filter(function(t) {
    if (t.collected) return false;
    return t.approved || t.approvalStatus === 'kesinlesti' || t.approvalStatus === 'approved' || !t.approvalStatus;
  });

  var projDays = _isManagerO() ? 90 : 15;
  for (var i = 0; i < projDays; i++) {
    var d = new Date(today);
    d.setDate(d.getDate() + i);
    var ds = d.toISOString().slice(0, 10);
    var dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });

    var odmDay = confirmedOdm
      .filter(function(o) { return o.due === ds; })
      .reduce(function(s, o) { return s + (parseFloat(o.amount) || 0); }, 0);

    var tahDay = confirmedTah
      .filter(function(t) { return t.due === ds; })
      .reduce(function(s, t) { return s + (parseFloat(t.amount) || 0); }, 0);

    var net = tahDay - odmDay;
    cumNet += net;
    totalOdeme += odmDay;
    totalTahsilat += tahDay;

    days.push({
      date: ds,
      label: ds.slice(5),
      dayName: dayName,
      odeme: odmDay,
      tahsilat: tahDay,
      net: net,
      cumNet: cumNet,
      odmCount: confirmedOdm.filter(function(o) { return o.due === ds; }).length,
      tahCount: confirmedTah.filter(function(t) { return t.due === ds; }).length,
    });
  }

  return { days: days, totalOdeme: totalOdeme, totalTahsilat: totalTahsilat, cumNet: cumNet };
}

/**
 * Projeksiyon sekmesi — tam ekran 15 günlük nakit akışı grafiği.
 * @param {HTMLElement} cont — odm-list container
 */
function _renderProjeksiyonTab(cont) {
  var proj = _calcProjeksiyon();
  var days = proj.days;
  var maxVal = Math.max.apply(null, days.map(function(d) { return Math.max(d.odeme, d.tahsilat, 1); }));

  var netColor = proj.cumNet >= 0 ? '#10B981' : '#EF4444';
  var netSign  = proj.cumNet >= 0 ? '+' : '';

  cont.innerHTML = ''
    // Başlık + özet kartlar
    + '<div style="padding:20px 20px 0">'
      + '<div style="font-size:16px;font-weight:700;color:var(--t);margin-bottom:14px">📊 ' + (days.length > 15 ? '90' : '15') + ' Günlük Nakit Projeksiyon</div>'
      + (function() {
          // Negatife düşen günleri bul — admin uyarı
          var negDays = days.filter(function(d) { return d.cumNet < 0; });
          if (!negDays.length || !_isManagerO()) return '';
          var firstNeg = negDays[0];
          return '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#991B1B;font-weight:500">🚨 '
            + firstNeg.date + ' tarihinde nakit negatife düşecek: <b>' + firstNeg.cumNet.toLocaleString('tr-TR') + '</b> — Toplam ' + negDays.length + ' gün negatif</div>';
        })()
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">'
        + '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:12px;padding:14px 16px">'
          + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Ödeme</div>'
          + '<div style="font-size:20px;font-weight:700;color:#EF4444">₺' + Math.round(proj.totalOdeme).toLocaleString('tr-TR') + '</div>'
        + '</div>'
        + '<div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:12px;padding:14px 16px">'
          + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Tahsilat</div>'
          + '<div style="font-size:20px;font-weight:700;color:#10B981">₺' + Math.round(proj.totalTahsilat).toLocaleString('tr-TR') + '</div>'
        + '</div>'
        + '<div style="background:' + (proj.cumNet >= 0 ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)') + ';border:1px solid ' + (proj.cumNet >= 0 ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)') + ';border-radius:12px;padding:14px 16px">'
          + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Net Nakit Dengesi</div>'
          + '<div style="font-size:20px;font-weight:700;color:' + netColor + '">' + netSign + '₺' + Math.abs(Math.round(proj.cumNet)).toLocaleString('tr-TR') + '</div>'
        + '</div>'
      + '</div>'
    + '</div>'

    // Bar chart
    + '<div style="padding:0 20px 8px">'
      + '<div style="display:flex;gap:3px;align-items:flex-end;height:160px;margin-bottom:0;padding-bottom:4px;border-bottom:1px solid var(--b)">'
      + days.map(function(d, idx) {
          var hT = d.tahsilat > 0 ? Math.max(4, Math.round(d.tahsilat / maxVal * 140)) : 0;
          var hO = d.odeme > 0 ? Math.max(4, Math.round(d.odeme / maxVal * 140)) : 0;
          var isToday = idx === 0;
          var borderStyle = isToday ? 'border:2px solid var(--ac);border-radius:8px;' : '';
          var bgStyle = isToday ? 'background:var(--al);' : '';

          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;padding:2px 0;' + borderStyle + bgStyle + '" title="' + d.date + ' — Ödeme: ₺' + Math.round(d.odeme).toLocaleString('tr-TR') + ' / Tahsilat: ₺' + Math.round(d.tahsilat).toLocaleString('tr-TR') + '">'
            + (hT > 0 ? '<div style="width:70%;height:' + hT + 'px;background:#10B981;border-radius:3px 3px 0 0;transition:height .3s"></div>' : '')
            + (hO > 0 ? '<div style="width:70%;height:' + hO + 'px;background:#EF4444;border-radius:0 0 3px 3px;transition:height .3s"></div>' : '')
            + (hT === 0 && hO === 0 ? '<div style="width:70%;height:2px;background:var(--b);border-radius:1px;margin-top:auto"></div>' : '')
            + '</div>';
        }).join('')
      + '</div>'

      // Tarih etiketleri
      + '<div style="display:flex;gap:3px;margin-top:2px">'
      + days.map(function(d, idx) {
          var isToday = idx === 0;
          var fw = isToday ? 'font-weight:700;color:var(--ac)' : 'color:var(--t3)';
          return '<div style="flex:1;text-align:center;font-size:8px;' + fw + ';min-width:0;overflow:hidden">'
            + '<div>' + d.dayName + '</div>'
            + '<div>' + d.label + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
    + '</div>'

    // Lejant
    + '<div style="padding:10px 20px;display:flex;gap:16px;font-size:11px;color:var(--t3);border-bottom:1px solid var(--b)">'
      + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10B981;margin-right:4px;vertical-align:middle"></span>Tahsilat</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#EF4444;margin-right:4px;vertical-align:middle"></span>Ödeme</span>'
      + '<span style="margin-left:auto;font-size:10px;color:var(--t3)">Sadece onaylanmış/kesinleşmiş kayıtlar dahil</span>'
    + '</div>'

    // Günlük detay tablosu
    + '<div style="padding:12px 20px">'
      + '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:10px">Günlük Detay</div>'
      + '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden">'
        // Tablo başlık
        + '<div style="display:grid;grid-template-columns:90px 70px 1fr 1fr 1fr 1fr;gap:0;padding:8px 12px;background:var(--s2);border-bottom:1px solid var(--b);font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase">'
          + '<div>Tarih</div><div>Gün</div><div style="text-align:right">Ödeme</div><div style="text-align:right">Tahsilat</div><div style="text-align:right">Net</div><div style="text-align:right">Kümülatif</div>'
        + '</div>'
        // Satırlar
        + days.map(function(d, idx) {
            var isToday = idx === 0;
            var rowBg = isToday ? 'background:var(--al)' : (idx % 2 === 0 ? 'background:var(--sf)' : 'background:var(--s2)');
            var netC = d.net >= 0 ? '#10B981' : '#EF4444';
            var cumC = d.cumNet >= 0 ? '#10B981' : '#EF4444';
            var netS = d.net >= 0 ? '+' : '';
            var cumS = d.cumNet >= 0 ? '+' : '';

            return '<div style="display:grid;grid-template-columns:90px 70px 1fr 1fr 1fr 1fr;gap:0;padding:7px 12px;border-bottom:1px solid var(--b);font-size:11px;' + rowBg + '">'
              + '<div style="font-weight:' + (isToday ? '700' : '500') + ';color:' + (isToday ? 'var(--ac)' : 'var(--t)') + '">' + d.date + '</div>'
              + '<div style="color:var(--t3)">' + d.dayName + (isToday ? ' ★' : '') + '</div>'
              + '<div style="text-align:right;color:#EF4444;font-weight:600">' + (d.odeme > 0 ? '₺' + Math.round(d.odeme).toLocaleString('tr-TR') + ' <span style="font-size:9px;color:var(--t3)">(' + d.odmCount + ')</span>' : '<span style="color:var(--t3)">—</span>') + '</div>'
              + '<div style="text-align:right;color:#10B981;font-weight:600">' + (d.tahsilat > 0 ? '₺' + Math.round(d.tahsilat).toLocaleString('tr-TR') + ' <span style="font-size:9px;color:var(--t3)">(' + d.tahCount + ')</span>' : '<span style="color:var(--t3)">—</span>') + '</div>'
              + '<div style="text-align:right;color:' + netC + ';font-weight:600">' + (d.net !== 0 ? netS + '₺' + Math.abs(Math.round(d.net)).toLocaleString('tr-TR') : '<span style="color:var(--t3)">—</span>') + '</div>'
              + '<div style="text-align:right;color:' + cumC + ';font-weight:700">' + cumS + '₺' + Math.abs(Math.round(d.cumNet)).toLocaleString('tr-TR') + '</div>'
            + '</div>';
          }).join('')
      + '</div>'
    + '</div>';
}

/**
 * Nakit projeksiyon widget — dashboard veya panel alt bölümü.
 * Eski renderNakitProjeksiyon yerine kullanılır.
 * @returns {void}
 */
function renderNakitProjeksiyon() {
  var cont = document.getElementById('odm-projeksiyon');
  if (!cont) return;

  var proj = _calcProjeksiyon();
  var days = proj.days;
  var maxVal = Math.max.apply(null, days.map(function(d) { return Math.max(d.odeme, d.tahsilat, 1); }));

  cont.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:10px">15 Günlük Nakit Projeksiyon</div>'
    + '<div style="display:flex;gap:4px;align-items:flex-end;height:120px;margin-bottom:8px">'
    + days.map(function(d) {
        var hO = d.odeme > 0 ? Math.max(2, Math.round(d.odeme / maxVal * 100)) : 2;
        var hT = d.tahsilat > 0 ? Math.max(2, Math.round(d.tahsilat / maxVal * 100)) : 2;
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0">'
          + '<div style="width:100%;height:' + hT + 'px;background:#10B981;border-radius:3px 3px 0 0"></div>'
          + '<div style="width:100%;height:' + hO + 'px;background:#EF4444;border-radius:0 0 3px 3px"></div>'
          + '<div style="font-size:8px;color:var(--t3);white-space:nowrap">' + d.label + '</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div style="display:flex;gap:12px;font-size:10px;color:var(--t3)">'
      + '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10B981;margin-right:3px"></span>Tahsilat</span>'
      + '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#EF4444;margin-right:3px"></span>Ödeme</span>'
      + '<span style="font-weight:600;color:' + (proj.cumNet >= 0 ? '#10B981' : '#EF4444') + '">Net: ' + (proj.cumNet >= 0 ? '+' : '') + Math.round(proj.cumNet).toLocaleString('tr-TR') + ' ₺</span>'
    + '</div>';
}
window.renderNakitProjeksiyon = renderNakitProjeksiyon;

const Odemeler = {
  render:      renderOdemeler,
  openModal:   openOdmModal,
  save:        saveOdm,
  del:         delOdm,
  togglePaid:  toggleOdmPaid,
  markPaid:    markOdmPaid,
  postpone:    postponeOdm,
  approve:     approveOdm,
  checkAlarms:    checkOdmAlarms,
  startAlarms:    startOdmAlarmTimer,
  checkRecurring: checkOdmRecurring,
  checkDocExpiry: checkOdmDocExpiry,
  fromPurchase:   createOdmFromPurchase,
  bulkPaid:       bulkMarkOdmPaid,
  openChart:      openOdmChart,
  exportXlsx:  exportOdmXlsx,
  importFile:  processOdmImport,
  CATS:        ODM_CATS,
  FREQ:        ODM_FREQ,
  renderTicker:   renderKurTicker,
  fetchKur:       fetchKurRates,
  startKurTicker: _startKurTicker,
  renderProjeksiyon: renderNakitProjeksiyon,
  BANKS:       ODM_BANKS,
  openApprovalFlow,
  processApproval: processOdmApproval,
  showTimeline: showOdmApprovalTimeline,
  checkSLA:    checkOdmSLA,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Odemeler;
} else {
  window.Odemeler       = Odemeler;
  window.renderOdemeler = renderOdemeler;
  window.openOdmModal   = openOdmModal;
  window.saveOdm        = saveOdm;
  window.delOdm         = delOdm;
  window.toggleOdmPaid  = toggleOdmPaid;
  window.markOdmPaid    = markOdmPaid;
  window.exportOdmXlsx  = exportOdmXlsx;
  window.processOdmImport = processOdmImport;
  window.importOdmFile  = importOdmFile;
  window.uploadOdmReceipt = uploadOdmReceipt;
  window.viewOdmReceipt = viewOdmReceipt;
  window.checkOdmAlarms = checkOdmAlarms;
  window.ODM_CATS       = ODM_CATS;

  // Alarm timer — sayfa yüklenince başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOdmAlarmTimer);
  } else {
    setTimeout(startOdmAlarmTimer, 2000);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 11 GELİŞTİRME — Odemeler v4.0
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// 1. BÜTÇE TAKİBİ — Kategori bazlı aylık limit
// ─────────────────────────────────────────────────────────────────
function loadOdmBudgets() {
  try { return JSON.parse(localStorage.getItem('duay_odm_budgets') || '{}'); } catch { return {}; }
}
function saveOdmBudgets(d) { localStorage.setItem('duay_odm_budgets', JSON.stringify(d)); }

/**
 * Admin kur kaynağı ayarları paneli.
 * Kaynak seçimi (TCMB/ExchangeRate/Manuel) + varsayılan kur modu (alış/satış).
 */
function openKurSettings() {
  if (!_isAdminO()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var ex = document.getElementById('mo-odm-kur-settings');
  if (ex) { ex.remove(); return; }
  var cfg = _odmLoadKurConfig();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-kur-settings'; ;
  mo.innerHTML = '<div class="moc" style="max-width:440px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 22px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">💱 Kur Ayarları</div>'
    + '<button onclick="document.getElementById(\'mo-odm-kur-settings\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">'
    + '<div class="fr"><div class="fl">KUR KAYNAĞI</div><select class="fi" id="kur-cfg-source" style="border-radius:8px">'
    + Object.entries(ODM_KUR_SOURCES).map(function(e) { return '<option value="' + e[0] + '"' + ((cfg.source || 'tcmb') === e[0] ? ' selected' : '') + '>' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">VARSAYILAN KUR MODU</div><select class="fi" id="kur-cfg-mode" style="border-radius:8px">'
    + '<option value="alis"' + ((cfg.defaultMode || 'alis') === 'alis' ? ' selected' : '') + '>MB Alış</option>'
    + '<option value="satis"' + ((cfg.defaultMode || 'alis') === 'satis' ? ' selected' : '') + '>MB Satış</option>'
    + '</select></div>'
    + '<div class="fr"><div class="fl">FORM BAZINDA MANUEL OVERRIDE</div>'
    + '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--t2);cursor:pointer">'
    + '<input type="checkbox" id="kur-cfg-allow-override"' + (cfg.allowOverride !== false ? ' checked' : '') + '> Kullanıcıların formda manuel kur girmesine izin ver'
    + '</label></div>'
    + '<div style="padding:8px 12px;background:var(--s2);border-radius:8px;font-size:11px;color:var(--t3)">'
    + '📊 Son kur güncellemesi: ' + (_odmRatesDate || 'Henüz çekilmedi') + '<br>'
    + '💵 USD: ₺' + (_odmGetRates().USD || '—') + ' | EUR: ₺' + (_odmGetRates().EUR || '—')
    + '</div>'
    + '</div>'
    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px;background:var(--s2)">'
    + '<button class="btn btns" onclick="document.getElementById(\'mo-odm-kur-settings\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="_odmSaveKurSettings()" style="border-radius:9px">💾 Kaydet</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

function _odmSaveKurSettings() {
  var cfg = {
    source: document.getElementById('kur-cfg-source')?.value || 'tcmb',
    defaultMode: document.getElementById('kur-cfg-mode')?.value || 'alis',
    allowOverride: document.getElementById('kur-cfg-allow-override')?.checked !== false,
    updatedBy: _CUo()?.id,
    updatedAt: _nowTso()
  };
  _odmSaveKurConfig(cfg);
  _odmRatesMode = cfg.defaultMode;
  // Kaynağa göre yeniden çek
  if (cfg.source === 'tcmb') {
    _odmRatesDate = '';
    _odmFetchTCMB().catch(function() {});
  }
  window.toast?.('Kur ayarları kaydedildi ✓', 'ok');
  window.logActivity?.('settings', 'Kur kaynağı güncellendi: ' + cfg.source);
  document.getElementById('mo-odm-kur-settings')?.remove();
}
window.openKurSettings = openKurSettings;
window._odmSaveKurSettings = _odmSaveKurSettings;

// ════════════════════════════════════════════════════════════════
// KATEGORİ VE ÖDEME YÖNTEMİ YÖNETİMİ — Admin CRUD
// ════════════════════════════════════════════════════════════════
const ODM_CUSTOM_CATS_KEY = 'odm_custom_cats';
const ODM_CUSTOM_METHODS_KEY = 'odm_custom_methods';
const ODM_DEFAULT_METHODS = ['Havale/EFT','Kredi Kartı','Nakit','Çek','Senet','Kripto','Diğer'];

/** @returns {Object} Özel kategoriler */
function _odmLoadCustomCats() {
  try { return JSON.parse(localStorage.getItem(ODM_CUSTOM_CATS_KEY) || '{}'); } catch { return {}; }
}

/** @returns {string[]} Ödeme yöntemleri (varsayılan + özel) */
function _odmLoadMethods() {
  try {
    var custom = JSON.parse(localStorage.getItem(ODM_CUSTOM_METHODS_KEY) || '[]');
    return ODM_DEFAULT_METHODS.concat(custom.filter(function(m) { return ODM_DEFAULT_METHODS.indexOf(m) === -1; }));
  } catch { return ODM_DEFAULT_METHODS; }
}

/** Tüm kategorileri döndürür (yerleşik + özel) */
function _odmGetAllCats() {
  var all = Object.assign({}, ODM_CATS, _odmLoadCustomCats());
  return all;
}

/**
 * Admin: Kategori ve Ödeme Yöntemi Yönetimi paneli.
 */
function openOdmCatMethodManager() {
  if (!_isAdminO()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var ex = document.getElementById('mo-odm-catmethod');
  if (ex) { ex.remove(); return; }
  var customCats = _odmLoadCustomCats();
  var customMethods = [];
  try { customMethods = JSON.parse(localStorage.getItem(ODM_CUSTOM_METHODS_KEY) || '[]'); } catch {}

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-catmethod'; ;
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 22px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">⚙️ Kategori & Yöntem Yönetimi</div>'
    + '<button onclick="document.getElementById(\'mo-odm-catmethod\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px">'

    // Kategoriler
    + '<div>'
    + '<div class="fl" style="margin-bottom:8px">KATEGORİLER</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'
    + Object.entries(ODM_CATS).map(function(e) {
        return '<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:var(--s2);color:var(--t2)">' + e[1].ic + ' ' + e[1].l + ' <span style="font-size:9px;color:var(--t3)">(sistem)</span></span>';
      }).join('')
    + Object.entries(customCats).map(function(e) {
        return '<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:rgba(99,102,241,.1);color:#4F46E5;cursor:pointer" onclick="_odmRemoveCustomCat(\'' + e[0] + '\')">' + (e[1].ic||'📁') + ' ' + e[1].l + ' ×</span>';
      }).join('')
    + '</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input class="fi" id="odm-new-cat-key" placeholder="anahtar (orn: pazarlama)" style="flex:1;font-size:11px;border-radius:8px">'
    + '<input class="fi" id="odm-new-cat-label" placeholder="Etiket (orn: Pazarlama)" style="flex:1;font-size:11px;border-radius:8px">'
    + '<input class="fi" id="odm-new-cat-icon" placeholder="İkon" style="width:45px;font-size:11px;border-radius:8px" value="📁">'
    + '<button class="btn btns" onclick="_odmAddCustomCat()" style="font-size:11px;white-space:nowrap">+ Ekle</button>'
    + '</div>'
    + '</div>'

    // Ödeme Yöntemleri
    + '<div>'
    + '<div class="fl" style="margin-bottom:8px">ÖDEME YÖNTEMLERİ</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'
    + ODM_DEFAULT_METHODS.map(function(m) {
        return '<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:var(--s2);color:var(--t2)">' + m + ' <span style="font-size:9px;color:var(--t3)">(sistem)</span></span>';
      }).join('')
    + customMethods.map(function(m) {
        return '<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:rgba(16,185,129,.1);color:#059669;cursor:pointer" onclick="_odmRemoveCustomMethod(\'' + m + '\')">' + m + ' ×</span>';
      }).join('')
    + '</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input class="fi" id="odm-new-method" placeholder="Yeni yöntem (orn: Mobil Ödeme)" style="flex:1;font-size:11px;border-radius:8px">'
    + '<button class="btn btns" onclick="_odmAddCustomMethod()" style="font-size:11px;white-space:nowrap">+ Ekle</button>'
    + '</div>'
    + '</div>'

    + '</div>'
    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-catmethod\')?.remove()">Kapat</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

function _odmAddCustomCat() {
  var key = (document.getElementById('odm-new-cat-key')?.value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  var label = (document.getElementById('odm-new-cat-label')?.value || '').trim();
  var icon = (document.getElementById('odm-new-cat-icon')?.value || '📁').trim();
  if (!key || !label) { window.toast?.('Anahtar ve etiket zorunludur', 'err'); return; }
  if (ODM_CATS[key]) { window.toast?.('Bu anahtar zaten sistem kategorisinde var', 'err'); return; }
  var custom = _odmLoadCustomCats();
  custom[key] = { l: label, ic: icon, c: 'bg' };
  localStorage.setItem(ODM_CUSTOM_CATS_KEY, JSON.stringify(custom));
  window.toast?.('Kategori eklendi: ' + label, 'ok');
  window.logActivity?.('settings', 'Özel kategori eklendi: ' + label);
  openOdmCatMethodManager();
}

function _odmRemoveCustomCat(key) {
  var custom = _odmLoadCustomCats();
  var label = custom[key]?.l || key;
  delete custom[key];
  localStorage.setItem(ODM_CUSTOM_CATS_KEY, JSON.stringify(custom));
  window.toast?.('Kategori silindi: ' + label, 'ok');
  openOdmCatMethodManager();
}

function _odmAddCustomMethod() {
  var method = (document.getElementById('odm-new-method')?.value || '').trim();
  if (!method) { window.toast?.('Yöntem adı zorunludur', 'err'); return; }
  var custom = [];
  try { custom = JSON.parse(localStorage.getItem(ODM_CUSTOM_METHODS_KEY) || '[]'); } catch {}
  if (custom.indexOf(method) !== -1 || ODM_DEFAULT_METHODS.indexOf(method) !== -1) {
    window.toast?.('Bu yöntem zaten var', 'err'); return;
  }
  custom.push(method);
  localStorage.setItem(ODM_CUSTOM_METHODS_KEY, JSON.stringify(custom));
  window.toast?.('Yöntem eklendi: ' + method, 'ok');
  window.logActivity?.('settings', 'Özel ödeme yöntemi eklendi: ' + method);
  openOdmCatMethodManager();
}

function _odmRemoveCustomMethod(method) {
  var custom = [];
  try { custom = JSON.parse(localStorage.getItem(ODM_CUSTOM_METHODS_KEY) || '[]'); } catch {}
  custom = custom.filter(function(m) { return m !== method; });
  localStorage.setItem(ODM_CUSTOM_METHODS_KEY, JSON.stringify(custom));
  window.toast?.('Yöntem silindi: ' + method, 'ok');
  openOdmCatMethodManager();
}

window.openOdmCatMethodManager = openOdmCatMethodManager;
window._odmAddCustomCat = _odmAddCustomCat;
window._odmRemoveCustomCat = _odmRemoveCustomCat;
window._odmAddCustomMethod = _odmAddCustomMethod;
window._odmRemoveCustomMethod = _odmRemoveCustomMethod;

// ════════════════════════════════════════════════════════════════
// BANKA/IBAN YÖNETİMİ — Admin CRUD
// ════════════════════════════════════════════════════════════════

/**
 * Admin banka/IBAN yönetim paneli.
 */
function openBankaManager() {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var ex = document.getElementById('mo-banka-mgr');
  if (ex) { ex.remove(); return; }
  var bankalar = typeof loadBankalar === 'function' ? loadBankalar() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-banka-mgr'; ;
  var listHTML = bankalar.length ? bankalar.map(function(b) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--b)">'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + esc(b.name) + ' <span style="font-size:10px;color:var(--t3)">(' + (b.hesapTur || 'TRY') + ')</span></div>'
        + '<div style="font-size:10px;color:var(--t3);font-family:monospace">' + esc(b.iban || '—') + (b.swift ? ' · SWIFT: ' + esc(b.swift) : '') + '</div>'
      + '</div>'
      + '<button onclick="_removeBanka(' + b.id + ')" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:14px" title="Sil">×</button>'
    + '</div>';
  }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Henüz banka eklenmemiş</div>';

  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 22px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">🏦 Banka/IBAN Yönetimi</div>'
    + '<button onclick="document.getElementById(\'mo-banka-mgr\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;max-height:60vh;overflow-y:auto">'
    // Mevcut bankalar
    + '<div style="margin-bottom:14px">'
    + '<div class="fl" style="margin-bottom:6px">KAYITLI BANKALAR (' + bankalar.length + ')</div>'
    + '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden">' + listHTML + '</div>'
    + '</div>'
    // Yeni banka ekle
    + '<div style="background:var(--s2);border-radius:10px;padding:14px">'
    + '<div class="fl" style="margin-bottom:8px">YENİ BANKA EKLE</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<input class="fi" id="bm-name" placeholder="Banka adı *" style="font-size:11px;border-radius:8px">'
    + '<select class="fi" id="bm-tur" style="font-size:11px;border-radius:8px">'
    + '<option value="TRY">🇹🇷 TRY</option><option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option><option value="GBP">🇬🇧 GBP</option>'
    + '</select>'
    + '</div>'
    + '<input class="fi" id="bm-iban" placeholder="IBAN (TR00 0000 0000 0000 0000 0000 00)" style="font-size:11px;border-radius:8px;margin-top:8px;font-family:monospace">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
    + '<input class="fi" id="bm-swift" placeholder="SWIFT/BIC kodu" style="font-size:11px;border-radius:8px">'
    + '<input class="fi" id="bm-sube" placeholder="Şube adı" style="font-size:11px;border-radius:8px">'
    + '</div>'
    + '<button class="btn btnp" onclick="_addBanka()" style="margin-top:10px;width:100%;border-radius:8px;font-size:12px">+ Banka Ekle</button>'
    + '</div>'
    + '</div>'
    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-banka-mgr\')?.remove()">Kapat</button>'
    + '</div></div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

function _addBanka() {
  var name = (document.getElementById('bm-name')?.value || '').trim();
  if (!name) { window.toast?.('Banka adı zorunludur', 'err'); return; }
  var iban = (document.getElementById('bm-iban')?.value || '').trim().replace(/\s+/g, ' ');
  var entry = {
    id: generateNumericId(),
    name: name,
    iban: iban,
    hesapTur: document.getElementById('bm-tur')?.value || 'TRY',
    swift: (document.getElementById('bm-swift')?.value || '').trim(),
    sube: (document.getElementById('bm-sube')?.value || '').trim(),
    createdAt: _nowTso(),
    createdBy: _CUo()?.id,
  };
  var d = typeof loadBankalar === 'function' ? loadBankalar() : [];
  d.unshift(entry);
  if (typeof storeBankalar === 'function') storeBankalar(d);
  window.toast?.('Banka eklendi: ' + name, 'ok');
  window.logActivity?.('settings', 'Banka eklendi: ' + name + ' (' + entry.hesapTur + ')');
  openBankaManager(); // Yeniden aç
}

function _removeBanka(id) {
  if (!_isManagerO()) return;
  var d = typeof loadBankalar === 'function' ? loadBankalar() : [];
  var b = d.find(function(x) { return x.id === id; });
  var label = b ? b.name : '';
  d = d.filter(function(x) { return x.id !== id; });
  if (typeof storeBankalar === 'function') storeBankalar(d);
  window.toast?.('Banka silindi: ' + label, 'ok');
  openBankaManager();
}

/**
 * Ödeme yöntemi değiştiğinde banka dropdown göster/gizle.
 * @param {string} prefix  'odm' veya 'tah'
 */
function _onYontemChange(prefix) {
  var yontem = document.getElementById(prefix + '-f-yontem')?.value || '';
  var wrap = document.getElementById(prefix + '-banka-wrap');
  if (!wrap) return;
  var isBanka = yontem === 'Havale/EFT';
  wrap.style.display = isBanka ? 'block' : 'none';
  // İlk açılışta bankalar listesini doldur
  if (isBanka && !wrap.dataset.loaded) {
    wrap.dataset.loaded = '1';
    var bankalar = typeof loadBankalar === 'function' ? loadBankalar() : [];
    var sel = document.getElementById(prefix + '-f-banka-sel');
    if (sel && bankalar.length) {
      sel.innerHTML = '<option value="">— Banka Seçin * —</option>' + bankalar.map(function(b) {
        var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
        return '<option value="' + b.id + '">' + esc(b.name) + ' (' + (b.hesapTur || 'TRY') + ') — ' + esc((b.iban || '').slice(0, 16)) + '...</option>';
      }).join('');
    }
  }
}
window._onYontemChange = _onYontemChange;

/**
 * Banka dropdown HTML bloğu oluşturur.
 * @param {string} prefix  'odm' veya 'tah'
 * @param {Object} [o]     Mevcut kayıt (düzenleme)
 * @returns {string}
 */
function _bankaDropdownHTML(prefix, o) {
  var bankalar = typeof loadBankalar === 'function' ? loadBankalar() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var yontem = o?.yontem || '';
  var isBanka = yontem === 'Havale/EFT';
  return '<div id="' + prefix + '-banka-wrap" style="display:' + (isBanka ? 'block' : 'none') + ';margin-top:8px" data-loaded="' + (isBanka ? '1' : '') + '">'
    + '<div class="fr"><div class="fl">BANKA/HESAP *</div>'
    + '<select class="fi" id="' + prefix + '-f-banka-sel" style="border-radius:8px">'
    + '<option value="">— Banka Seçin * —</option>'
    + bankalar.map(function(b) {
        return '<option value="' + b.id + '"' + (o?.bankaId == b.id ? ' selected' : '') + '>' + esc(b.name) + ' (' + (b.hesapTur || 'TRY') + ') — ' + esc((b.iban || '').slice(0, 16)) + '...</option>';
      }).join('')
    + '</select></div>'
    + '</div>';
}

window.openBankaManager = openBankaManager;
window._addBanka = _addBanka;
window._removeBanka = _removeBanka;

function openBudgetManager() {
  const ex = document.getElementById('mo-odm-budget');
  if (ex) { ex.remove(); return; }
  const budgets = loadOdmBudgets();
  const all = window.loadOdm ? loadOdm() : [];
  const thisMonth = _todayStr().slice(0,7);

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-budget'; ;

  let html = '<div class="moc" style="max-width:520px;padding:0;overflow:hidden;border-radius:16px">';
  html += '<div style="background:#1e1b4b;padding:16px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">';
  html += '<div><div style="font-size:14px;font-weight:600">📊 Bütçe Takibi</div><div style="font-size:10px;opacity:.7;margin-top:2px">' + thisMonth + ' — Kategori bazlı aylık limitler</div></div>';
  html += '<button onclick="_go(\"mo-odm-budget\")?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:18px">×</button></div>';
  html += '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:10px;max-height:70vh;overflow-y:auto">';

  Object.entries(ODM_CATS).forEach(([k, v]) => {
    const limit = budgets[k] || 0;
    const spent = all.filter(o => o.cat === k && (o.paidTs||o.due||'').startsWith(thisMonth))
                     .reduce((s, o) => s + (_odmToTRY(o.amount, o.currency||'TRY')), 0);
    const pct   = limit > 0 ? Math.min(Math.round(spent/limit*100), 100) : 0;
    const over  = limit > 0 && spent > limit;
    const barColor = over ? '#EF4444' : pct > 70 ? '#F97316' : '#6366F1';

    html += '<div style="padding:10px 12px;background:var(--s2);border-radius:9px">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
    html += '<span style="font-size:12px;font-weight:500">' + v.ic + ' ' + v.l + '</span>';
    html += '<div style="display:flex;align-items:center;gap:6px">';
    html += '<span style="font-size:11px;color:var(--t3)">₺' + Math.round(spent).toLocaleString('tr-TR') + ' / </span>';
    html += '<input type="number" data-cat="' + k + '" value="' + limit + '" placeholder="Limit" ';
    html += 'style="width:90px;font-size:11px;padding:2px 6px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf)" ';
    html += 'oninput="_odmSaveBudgetInline(this)" min="0">';
    if (over) html += '<span style="font-size:10px;color:#EF4444;font-weight:600">⚠ Aşıldı!</span>';
    html += '</div></div>';
    html += '<div style="height:4px;background:var(--b);border-radius:99px;overflow:hidden">';
    html += '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:99px;transition:width .4s"></div></div>';
    html += '</div>';
  });

  html += '</div>';
  html += '<div style="padding:12px 22px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;background:var(--s2)">';
  html += '<button class="btn btnp" onclick="_go(\"mo-odm-budget\")?.remove()">Kapat</button></div></div>';

  mo.innerHTML = html;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _odmSaveBudgetInline(el) {
  const budgets = loadOdmBudgets();
  const cat = el.dataset.cat;
  budgets[cat] = parseFloat(el.value) || 0;
  saveOdmBudgets(budgets);
}

function checkOdmBudgets() {
  const budgets = loadOdmBudgets();
  const all = window.loadOdm ? loadOdm() : [];
  const thisMonth = _todayStr().slice(0,7);
  Object.entries(budgets).forEach(([cat, limit]) => {
    if (!limit) return;
    const spent = all.filter(o => o.cat === cat && (o.paidTs||o.due||'').startsWith(thisMonth))
                     .reduce((s,o) => s + (_odmToTRY(o.amount,o.currency||'TRY')), 0);
    if (spent > limit) {
      const key = 'odm_budget_warn_' + cat + '_' + thisMonth;
      if (!localStorage.getItem(key)) {
        const catL = ODM_CATS[cat]?.l || cat;
        window.addNotif?.('⚠', catL + ' bütçesi aşıldı! ₺' + Math.round(spent).toLocaleString('tr-TR') + ' / ₺' + limit.toLocaleString('tr-TR'), 'err', 'odemeler');
        localStorage.setItem(key, '1');
      }
    }
  });
}

window.openBudgetManager     = openBudgetManager;
window._odmSaveBudgetInline  = _odmSaveBudgetInline;
window.checkOdmBudgets       = checkOdmBudgets;

// ─────────────────────────────────────────────────────────────────
// 2. TEKRARLAYANTAHSİLAT — Kira geliri vb. otomatik oluştur
// ─────────────────────────────────────────────────────────────────
function checkRecurringTahsilat() {
  const all = loadTahsilat();
  const thisMonth = _todayStr().slice(0,7);
  let added = 0;

  all.filter(o => o.recurringRule).forEach(o => {
    if ((o.lastRecurMonth||'') === thisMonth) return;
    const due = new Date(o.due||_todayStr());
    due.setMonth(due.getMonth() + 1);
    all.unshift({
      id: generateNumericId(),
      name: o.name, type: o.type, amount: o.amount,
      currency: o.currency||'TRY', due: due.toISOString().slice(0,10),
      banka: o.banka||'', yontem: o.yontem||'',
      assignedTo: o.assignedTo||null,
      collected: false, recurParentId: o.id,
      ts: _nowTso(), createdBy: _CUo()?.id,
    });
    o.lastRecurMonth = thisMonth;
  });

  if (added > 0) { storeTahsilat(all); window.toast?.(added + ' tekrarlayan tahsilat oluşturuldu', 'ok'); }
}
window.checkRecurringTahsilat = checkRecurringTahsilat;

// ─────────────────────────────────────────────────────────────────
// 3. BANKA MUTABAKATI — CSV/Excel ekstresi yükle, eşleştir
// ─────────────────────────────────────────────────────────────────
function openBankaMutabakat() {
  const ex = document.getElementById('mo-mutabakat');
  if (ex) { ex.remove(); return; }
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-mutabakat'; ;
  mo.innerHTML = '<div class="moc" style="max-width:560px">'
    + '<div class="mt">🏦 Banka Mutabakatı</div>'
    + '<p style="font-size:12px;color:var(--t3);margin-bottom:12px">Banka ekstrenizi yükleyin. Sistem ödeme kayıtlarıyla otomatik eşleştirir.</p>'
    + '<div class="fr"><div class="fl">Banka</div>'
    + '<select class="fi" id="mut-banka"><option value="">— Seçin —</option>'
    + ['Garanti','İş Bankası','Yapı Kredi','Ziraat','Halkbank','Vakıfbank','Akbank','Diğer'].map(b=>'<option>'+b+'</option>').join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">Dönem</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<input type="date" class="fi" id="mut-from"><input type="date" class="fi" id="mut-to"></div></div>'
    + '<div class="fr"><div class="fl">Ekstre dosyası (CSV / XLSX)</div>'
    + '<div style="border:2px dashed var(--b);border-radius:9px;padding:20px;text-align:center;cursor:pointer" onclick="_go(\"mut-file\").click()">'
    + '<div style="font-size:24px;margin-bottom:6px">📂</div>'
    + '<div style="font-size:12px;color:var(--t3)">Tıklayın veya dosyayı buraya sürükleyin</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:4px">CSV veya XLSX — maksimum 10MB</div>'
    + '</div>'
    + '<input type="file" id="mut-file" accept=".csv,.xlsx" style="display:none" onchange="_processMutabakat(this)"></div>'
    + '<div id="mut-result"></div>'
    + '<div class="mf"><button class="btn" onclick="_go(\"mo-mutabakat\")?.remove()">Kapat</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _processMutabakat(inp) {
  const file = inp?.files?.[0]; if (!file) return;
  const res = document.getElementById('mut-result');
  if (res) res.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--t3)">⏳ Analiz ediliyor...</div>';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const all = window.loadOdm ? loadOdm() : [];
      let matched = 0, unmatched = [];

      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.replace(/"/g,'').trim());
        const amount = parseFloat(cols[2]||cols[3]||'0');
        const desc   = (cols[1]||cols[2]||'').toLowerCase();
        if (!amount) return;

        const found = all.find(o => {
          const nameMatch = desc.includes((o.name||'').toLowerCase().slice(0,8));
          const amtMatch  = Math.abs(_odmToTRY(o.amount,o.currency||'TRY') - Math.abs(amount)) < 10;
          return nameMatch && amtMatch && !o.mutabakatEslesti;
        });

        if (found) {
          found.mutabakatEslesti = true;
          found.mutabakatTs = _nowTso();
          if (!found.paid) { found.paid = true; found.paidTs = _nowTso(); }
          matched++;
        } else {
          unmatched.push({ amount: Math.abs(amount), desc: cols[1]||'' });
        }
      });

      if (matched) { window.storeOdm?.(all); }

      if (res) res.innerHTML = '<div style="padding:12px;background:var(--s2);border-radius:8px;margin-top:8px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--grt);margin-bottom:6px">✅ ' + matched + ' ödeme eşleşti</div>'
        + (unmatched.length ? '<div style="font-size:11px;color:var(--t3)">' + unmatched.length + ' satır eşleşmedi:</div>'
          + unmatched.slice(0,5).map(u=>'<div style="font-size:10px;color:var(--t3)">• ' + u.desc + ' — ₺' + u.amount.toLocaleString('tr-TR') + '</div>').join('') : '')
        + '</div>';

      window.toast?.('Mutabakat tamamlandı: ' + matched + ' eşleşme', 'ok');
      renderOdemeler();
    } catch(err) {
      if (res) res.innerHTML = '<div style="color:var(--rdt);font-size:12px">Hata: ' + err.message + '</div>';
    }
  };
  reader.readAsText(file);
}
window.openBankaMutabakat = openBankaMutabakat;
window._processMutabakat  = _processMutabakat;

// ─────────────────────────────────────────────────────────────────
// 4. SMS/WHATSAPP HATIRLATICI TASLAK
// ─────────────────────────────────────────────────────────────────
function openOdmReminderModal(id) {
  const o = (window.loadOdm?loadOdm():[]).find(x=>x.id===id);
  if (!o) return;
  const users = window.loadUsers ? loadUsers() : [];
  const u = users.find(x => x.id === o.assignedTo);
  const msg = `Sayın ${u?.name||'İlgili'},\n\n"${o.name}" ödemesi için son tarih: ${o.due||'—'}\nTutar: ${_odmFmtAmt(o.amount,o.currency||'TRY')} ${_odmTLKarsiligi(o.amount,o.currency||'TRY')}\n\nLütfen zamanında işlem yapınız.\n\nDuay Global Trade`;

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:480px">'
    + '<div class="mt">📱 Hatırlatıcı Gönder</div>'
    + '<div class="fr"><div class="fl">ALICI</div>'
    + '<select class="fi" id="rem-user"><option value="">— Seçin —</option>'
    + users.map(u=>'<option value="'+u.id+'"'+( u.id===o.assignedTo?' selected':'')+'>'+u.name+'</option>').join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">KANAL</div>'
    + '<div style="display:flex;gap:8px">'
    + ['WhatsApp','SMS','E-posta'].map(c=>'<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="radio" name="rem-ch" value="'+c+'"'+( c==='WhatsApp'?' checked':'')+'>'+c+'</label>').join('')
    + '</div></div>'
    + '<div class="fr"><div class="fl">MESAJ</div>'
    + '<textarea class="fi" id="rem-msg" rows="5" style="resize:none">' + msg + '</textarea></div>'
    + '<div class="mf">'
    + '<button class="btn" onclick="this.closest(\'.mo\').remove()">İptal</button>'
    + '<button class="btn btnp" onclick="_sendOdmReminder('+id+')">📤 Gönder</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _sendOdmReminder(id) {
  const ch  = document.querySelector('input[name="rem-ch"]:checked')?.value || 'WhatsApp';
  const msg = document.getElementById('rem-msg')?.value || '';
  const uid = document.getElementById('rem-user')?.value;
  const users = window.loadUsers ? loadUsers() : [];
  const u = users.find(x => String(x.id) === uid);
  const phone = u?.phone || '';

  if (ch === 'WhatsApp' && phone) {
    window.open('https://wa.me/' + phone.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
  } else {
    navigator.clipboard?.writeText(msg);
    window.toast?.('Mesaj panoya kopyalandı — ' + ch + ' ile gönderin', 'ok');
  }

  window.logActivity?.('view', '"' + (u?.name||'?') + '" için ödeme hatırlatıcısı gönderildi');
  document.querySelector('.mo.open')?.remove();
}
window.openOdmReminderModal = openOdmReminderModal;
window._sendOdmReminder     = _sendOdmReminder;

// ─────────────────────────────────────────────────────────────────
// 5. GECİKME FAİZİ HESAPLAYICI
// ─────────────────────────────────────────────────────────────────
function openFaizHesap(id) {
  const o = (window.loadOdm?loadOdm():[]).find(x=>x.id===id);
  if (!o || !o.due) { window.toast?.('Son tarih girilmemiş', 'warn'); return; }

  const today = _todayStr();
  const dueD  = new Date(o.due);
  const todayD = new Date(today);
  const gun    = Math.max(0, Math.ceil((todayD - dueD) / 86400000));
  const anapar = _odmToTRY(o.amount, o.currency||'TRY');

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:420px">'
    + '<div class="mt">📐 Gecikme Faizi Hesaplayıcı</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px">'
    + '<div style="font-size:10px;color:var(--t3)">Anapar</div>'
    + '<div style="font-size:16px;font-weight:600;color:var(--t)">₺' + Math.round(anapar).toLocaleString('tr-TR') + '</div></div>'
    + '<div style="background:rgba(239,68,68,.08);border-radius:8px;padding:10px">'
    + '<div style="font-size:10px;color:var(--t3)">Gecikme süresi</div>'
    + '<div style="font-size:16px;font-weight:600;color:#EF4444">' + gun + ' gün</div></div>'
    + '</div>'
    + '<div class="fr"><div class="fl">YASAL FAİZ ORANI (yıllık %)</div>'
    + '<input class="fi" type="number" id="faiz-oran" value="9" step="0.1" oninput="_calcFaiz(' + anapar + ',' + gun + ')"></div>'
    + '<div id="faiz-result" style="background:var(--s2);border-radius:9px;padding:12px;margin-top:4px">'
    + '<div style="font-size:11px;color:var(--t3)">Hesapla düğmesine basın</div></div>'
    + '<div class="mf">'
    + '<button class="btn btnp" onclick="_calcFaiz(' + anapar + ',' + gun + ')">Hesapla</button>'
    + '<button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(() => { mo.classList.add('open'); _calcFaiz(anapar, gun); }, 10);
}

function _calcFaiz(anapar, gun) {
  const oran = parseFloat(document.getElementById('faiz-oran')?.value || '9') / 100;
  const faiz  = anapar * oran * gun / 365;
  const toplam = anapar + faiz;
  const el = document.getElementById('faiz-result');
  if (el) el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div><div style="font-size:10px;color:var(--t3)">Faiz tutarı</div><div style="font-size:15px;font-weight:600;color:#EF4444">₺' + faiz.toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</div></div>'
    + '<div><div style="font-size:10px;color:var(--t3)">Toplam ödeme</div><div style="font-size:15px;font-weight:600;color:var(--t)">₺' + toplam.toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</div></div>'
    + '</div>';
}
window.openFaizHesap = openFaizHesap;
window._calcFaiz     = _calcFaiz;

// ─────────────────────────────────────────────────────────────────
// 6. TEDARİKÇİ KARTI — Ödeme kaynağı profili
// ─────────────────────────────────────────────────────────────────
function openTedarikciKart(name) {
  const all = window.loadOdm ? loadOdm() : [];
  const items = all.filter(o => o.name === name || (o.note||'').includes(name));
  const total  = items.reduce((s,o) => s + _odmToTRY(o.amount,o.currency||'TRY'), 0);
  const paid   = items.filter(o => o.paid).reduce((s,o) => s + _odmToTRY(o.amount,o.currency||'TRY'), 0);
  const late   = items.filter(o => !o.paid && o.due && o.due < _todayStr()).length;

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:480px">'
    + '<div class="mt">🏢 ' + name + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px;text-align:center">'
    + '<div style="font-size:18px;font-weight:600;color:var(--t)">' + items.length + '</div>'
    + '<div style="font-size:10px;color:var(--t3)">Toplam İşlem</div></div>'
    + '<div style="background:var(--s2);border-radius:8px;padding:10px;text-align:center">'
    + '<div style="font-size:18px;font-weight:600;color:var(--ac)">₺' + Math.round(total/1000) + 'k</div>'
    + '<div style="font-size:10px;color:var(--t3)">Toplam Tutar</div></div>'
    + '<div style="background:' + (late?'rgba(239,68,68,.08)':'var(--s2)') + ';border-radius:8px;padding:10px;text-align:center">'
    + '<div style="font-size:18px;font-weight:600;color:' + (late?'#EF4444':'var(--grt)') + '">' + late + '</div>'
    + '<div style="font-size:10px;color:var(--t3)">Gecikmiş</div></div>'
    + '</div>'
    + '<div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:6px">Son İşlemler</div>'
    + '<div style="display:flex;flex-direction:column;gap:4px">'
    + items.slice(0,6).map(o => '<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--s2);border-radius:6px;font-size:11px">'
      + '<span>' + (o.due||'—') + ' · ' + (ODM_CATS[o.cat]?.l||o.cat) + '</span>'
      + '<span style="font-weight:500;color:' + (o.paid?'var(--grt)':o.due&&o.due<_todayStr()?'#EF4444':'var(--t)') + '">'
      + _odmFmtAmt(o.amount,o.currency||'TRY') + (o.paid?' ✓':'') + '</span></div>').join('')
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openTedarikciKart = openTedarikciKart;

// ─────────────────────────────────────────────────────────────────
// 7. ÇOKLU PARA RAPORU — TL bazlı özet
// ─────────────────────────────────────────────────────────────────
function openCurrencyReport() {
  const all = window.loadOdm ? loadOdm() : [];
  const tah = window.loadTahsilat ? loadTahsilat() : [];
  const thisMonth = _todayStr().slice(0,7);

  const byMonth = {};
  [...all, ...tah].forEach(o => {
    const m = (o.due||o.actualDate||o.ts||'').slice(0,7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { odeme: 0, tahsilat: 0 };
    const tl = _odmToTRY(o.amount||0, o.currency||'TRY');
    if (tah.includes(o)) byMonth[m].tahsilat += tl;
    else byMonth[m].odeme += tl;
  });

  const curGroups = {};
  all.forEach(o => {
    const c = o.currency||'TRY';
    if (!curGroups[c]) curGroups[c] = { total: 0, count: 0 };
    curGroups[c].total += parseFloat(o.amount||0);
    curGroups[c].count++;
  });

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  let html = '<div class="moc" style="max-width:540px">';
  html += '<div class="mt">💱 Çoklu Para Raporu</div>';

  // Döviz dağılımı
  html += '<div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:8px">Döviz Dağılımı</div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">';
  Object.entries(curGroups).forEach(([c, d]) => {
    const cur = ODM_CURRENCY[c] || { sym: c, flag: '' };
    const tl = all.filter(o=>(o.currency||'TRY')===c).reduce((s,o)=>s+_odmToTRY(o.amount||0,c),0);
    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--s2);border-radius:8px">';
    html += '<span style="font-size:16px">' + (cur.flag||'💰') + '</span>';
    html += '<span style="font-size:12px;font-weight:500;flex:1">' + c + ' — ' + (cur.name||c) + '</span>';
    html += '<span style="font-size:11px;color:var(--t3)">' + d.count + ' işlem</span>';
    html += '<span style="font-size:12px;font-weight:600;color:var(--t)">' + cur.sym + d.total.toLocaleString('tr-TR',{minimumFractionDigits:0}) + '</span>';
    if (c !== 'TRY') html += '<span style="font-size:10px;color:var(--ac)">≈ ₺' + Math.round(tl).toLocaleString('tr-TR') + '</span>';
    html += '</div>';
  });
  html += '</div>';

  // Aylık özet (son 4 ay)
  html += '<div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:8px">Son 4 Ay</div>';
  const months = Object.keys(byMonth).sort().slice(-4);
  months.forEach(m => {
    const b = byMonth[m];
    const net = b.tahsilat - b.odeme;
    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--s2);border-radius:8px;margin-bottom:4px">';
    html += '<span style="font-size:11px;font-weight:500;color:var(--t);flex:1">' + m + '</span>';
    html += '<span style="font-size:10px;color:#EF4444">Ödeme: ₺' + Math.round(b.odeme).toLocaleString('tr-TR') + '</span>';
    html += '<span style="font-size:10px;color:#10B981">Tahsilat: ₺' + Math.round(b.tahsilat).toLocaleString('tr-TR') + '</span>';
    html += '<span style="font-size:11px;font-weight:600;color:' + (net>=0?'#10B981':'#EF4444') + '">' + (net>=0?'+':'') + '₺' + Math.round(net).toLocaleString('tr-TR') + '</span>';
    html += '</div>';
  });

  html += '<div class="mf"><button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button>';
  html += '<button class="btn btns" onclick="exportCurrencyReportXlsx()">Excel İndir</button></div></div>';
  mo.innerHTML = html;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}
window.openCurrencyReport = openCurrencyReport;

/** Döviz raporu Excel export */
function exportCurrencyReportXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var items = window.loadOdm ? loadOdm() : [];
  var rates = _odmGetRates();
  var byCur = {};
  items.filter(function(o) { return !o.isDeleted && !o.paid; }).forEach(function(o) {
    var cur = o.currency || 'TRY';
    if (!byCur[cur]) byCur[cur] = { total: 0, count: 0 };
    byCur[cur].total += parseFloat(o.amount) || 0;
    byCur[cur].count++;
  });
  var rows = [['Para Birimi', 'Toplam', 'Kur', 'TL Karşılığı', 'Kayıt Sayısı']];
  Object.entries(byCur).forEach(function(e) {
    var kur = rates[e[0]] || 1;
    rows.push([e[0], e[1].total, kur, Math.round(e[1].total * kur), e[1].count]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Döviz Raporu');
  XLSX.writeFile(wb, 'doviz-raporu-' + _todayStr() + '.xlsx');
  window.toast?.('Döviz raporu indirildi ✓', 'ok');
}
window.exportCurrencyReportXlsx = exportCurrencyReportXlsx;

// ─────────────────────────────────────────────────────────────────
// 8. ÖDEME TAKVİMİ GÖRÜNÜMİ
// ─────────────────────────────────────────────────────────────────
function renderOdmCalendar(cont) {
  if (!cont) return;
  const all  = window.loadOdm ? loadOdm() : [];
  const tah  = window.loadTahsilat ? loadTahsilat() : [];
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = now.getMonth();
  const dim  = new Date(year, mon+1, 0).getDate();
  const start= new Date(year, mon, 1).getDay();

  const dayMap = {};
  all.forEach(o => {
    if (!o.due || !o.due.startsWith(year+'-'+(String(mon+1).padStart(2,'0')))) return;
    const d = parseInt(o.due.slice(8));
    if (!dayMap[d]) dayMap[d] = { odeme: [], tah: [] };
    dayMap[d].odeme.push(o);
  });
  tah.forEach(o => {
    const date = o.actualDate || o.due;
    if (!date || !date.startsWith(year+'-'+(String(mon+1).padStart(2,'0')))) return;
    const d = parseInt(date.slice(8));
    if (!dayMap[d]) dayMap[d] = { odeme: [], tah: [] };
    dayMap[d].tah.push(o);
  });

  const days = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  let html = '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">';
  html += '<span style="font-size:13px;font-weight:600;color:var(--t)">' + now.toLocaleString('tr-TR',{month:'long',year:'numeric'}) + '</span>';
  html += '<button class="btn btns" onclick="setOdmTab(\'all\')" style="font-size:11px">Listeye Dön</button></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">';
  days.forEach(d => { html += '<div style="text-align:center;font-size:9px;font-weight:600;color:var(--t3);padding:4px 0">' + d + '</div>'; });

  const offset = (start + 6) % 7;
  for (let i = 0; i < offset; i++) html += '<div></div>';

  for (let d = 1; d <= dim; d++) {
    const isToday = d === now.getDate();
    const data    = dayMap[d];
    html += '<div style="min-height:52px;border:0.5px solid var(--b);border-radius:6px;padding:3px;background:' + (isToday?'rgba(99,102,241,.06)':'var(--sf)') + '">';
    html += '<div style="font-size:10px;font-weight:' + (isToday?'700':'400') + ';color:' + (isToday?'var(--ac)':'var(--t2)') + ';text-align:center">' + d + '</div>';
    if (data) {
      data.odeme.slice(0,2).forEach(o => {
        const c = o.paid ? '#10B981' : (o.due<_todayStr()?'#EF4444':'#EF4444');
        html += '<div style="font-size:8px;padding:1px 3px;border-radius:3px;margin-top:1px;background:' + (o.paid?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)') + ';color:' + c + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + o.name + '">' + o.name.slice(0,10) + '</div>';
      });
      data.tah.slice(0,1).forEach(o => {
        html += '<div style="font-size:8px;padding:1px 3px;border-radius:3px;margin-top:1px;background:rgba(16,185,129,.1);color:#10B981;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + o.name + '">↑' + o.name.slice(0,8) + '</div>';
      });
    }
    html += '</div>';
  }
  html += '</div>';
  cont.innerHTML = html;
}
window.renderOdmCalendar = renderOdmCalendar;

// ─────────────────────────────────────────────────────────────────
// 9. E-FATURA DIŞA AKTARMA (GİB formatı hazırlığı)
// ─────────────────────────────────────────────────────────────────
function exportEFatura(id) {
  const o = (window.loadOdm?loadOdm():[]).find(x=>x.id===id);
  if (!o) return;
  const tl = _odmToTRY(o.amount||0, o.currency||'TRY');
  const kdv = tl * 0.20;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${o.id}</ID>
  <IssueDate>${_todayStr()}</IssueDate>
  <DueDate>${o.due||_todayStr()}</DueDate>
  <Note>${o.note||''}</Note>
  <InvoiceLine>
    <Item><Name>${o.name}</Name></Item>
    <Price><PriceAmount currencyID="TRY">${tl.toFixed(2)}</PriceAmount></Price>
    <TaxTotal>
      <TaxAmount currencyID="TRY">${kdv.toFixed(2)}</TaxAmount>
      <TaxSubtotal><TaxCategory><ID>0015</ID></TaxCategory></TaxSubtotal>
    </TaxTotal>
    <LineExtensionAmount currencyID="TRY">${(tl+kdv).toFixed(2)}</LineExtensionAmount>
  </InvoiceLine>
</Invoice>`;
  const blob = new Blob([xml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'efatura-' + o.id + '.xml';
  a.click();
  window.toast?.('E-fatura XML indirildi', 'ok');
}
window.exportEFatura = exportEFatura;

// ─────────────────────────────────────────────────────────────────
// 10. KPI DASHBOARD — Nakit akışı + ödeme/tahsilat karşılaştırması
// ─────────────────────────────────────────────────────────────────
function openOdmKPIDashboard() {
  const all = window.loadOdm ? loadOdm() : [];
  const tah = window.loadTahsilat ? loadTahsilat() : [];
  const today = _todayStr();
  const thisMonth = today.slice(0,7);

  const paidThisMonth = all.filter(o=>o.paid&&(o.paidTs||'').startsWith(thisMonth));
  const paidAmt = paidThisMonth.reduce((s,o)=>s+_odmToTRY(o.amount||0,o.currency||'TRY'),0);
  const tahAmt  = tah.filter(o=>o.collected&&(o.collectedTs||'').startsWith(thisMonth))
                     .reduce((s,o)=>s+_odmToTRY(o.amount||0,o.currency||'TRY'),0);
  const pendAmt = all.filter(o=>!o.paid&&!(o.approvalNeeded&&!o.approved))
                     .reduce((s,o)=>s+_odmToTRY(o.amount||0,o.currency||'TRY'),0);
  const lateAmt = all.filter(o=>!o.paid&&o.due&&o.due<today)
                     .reduce((s,o)=>s+_odmToTRY(o.amount||0,o.currency||'TRY'),0);
  const netCash = tahAmt - paidAmt;

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:580px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="background:linear-gradient(135deg,#1e1b4b,#3730a3);padding:16px 22px;color:#fff">'
    + '<div style="font-size:15px;font-weight:600;margin-bottom:2px">📊 KPI Dashboard</div>'
    + '<div style="font-size:10px;opacity:.7">' + thisMonth + ' — Ödeme & Tahsilat Analizi</div></div>'
    + '<div style="padding:16px 22px;display:flex;flex-direction:column;gap:12px">'

    // Ana metrikler
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _kpiCard('Bu Ay Ödeme','₺'+Math.round(paidAmt).toLocaleString('tr-TR'),'#EF4444','rgba(239,68,68,.08)')
    + _kpiCard('Bu Ay Tahsilat','₺'+Math.round(tahAmt).toLocaleString('tr-TR'),'#10B981','rgba(16,185,129,.08)')
    + _kpiCard('Net Nakit Akışı',(netCash>=0?'+':'')+'₺'+Math.round(Math.abs(netCash)).toLocaleString('tr-TR'),netCash>=0?'#10B981':'#EF4444',netCash>=0?'rgba(16,185,129,.08)':'rgba(239,68,68,.08)')
    + _kpiCard('Gecikmiş Tutar','₺'+Math.round(lateAmt).toLocaleString('tr-TR'),'#F97316','rgba(249,115,22,.08)')
    + '</div>'

    // Onay bekleyen özet
    + (all.filter(o=>o.approvalStatus==='pending').length ? '<div style="padding:10px 12px;background:rgba(245,158,11,.08);border-left:3px solid #F59E0B;border-radius:0 8px 8px 0">'
      + '<div style="font-size:12px;font-weight:600;color:#D97706">' + all.filter(o=>o.approvalStatus==='pending').length + ' ödeme yönetici onayı bekliyor</div>'
      + all.filter(o=>o.approvalStatus==='pending').slice(0,3).map(o=>'<div style="font-size:11px;color:var(--t3);margin-top:3px">• '+o.name+' — ₺'+Math.round(_odmToTRY(o.amount||0,o.currency||'TRY')).toLocaleString('tr-TR')+'</div>').join('')
      + '</div>' : '')

    + '</div>'
    + '<div style="padding:12px 22px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + '<button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button>'
    + '<button class="btn btns" onclick="openOdmChart()">Grafik Görünümü</button>'
    + '</div></div>';

  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

function _kpiCard(label, val, color, bg) {
  return '<div style="background:' + bg + ';border-radius:10px;padding:12px 14px">'
    + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">' + label + '</div>'
    + '<div style="font-size:20px;font-weight:600;color:' + color + '">' + val + '</div>'
    + '</div>';
}
window.openOdmKPIDashboard = openOdmKPIDashboard;

// ─────────────────────────────────────────────────────────────────
// 11. ONAY BİLDİRİMİ — Yöneticiye sistem + taslak e-posta
// ─────────────────────────────────────────────────────────────────
function notifyApprovalNeeded(id) {
  const o = (window.loadOdm?loadOdm():[]).find(x=>x.id===id);
  if (!o) return;
  const cu = window.Auth?.getCU?.();
  const users = window.loadUsers ? loadUsers() : [];
  const admins = users.filter(u => ['admin','manager'].includes(u.role));

  // Sistem bildirimi
  admins.forEach(a => {
    window.addNotif?.('💰', '"' + o.name + '" ödemesi onayınızı bekliyor — ₺' + Math.round(_odmToTRY(o.amount||0,o.currency||'TRY')).toLocaleString('tr-TR'), 'warn', 'odemeler');
  });

  // E-posta taslağı modal
  const emailBody = `Sayın Yönetici,

"${o.name}" adlı ödeme için onayınız beklenmektedir.

Tutar: ${_odmFmtAmt(o.amount||0, o.currency||'TRY')} ${_odmTLKarsiligi(o.amount||0, o.currency||'TRY')}
Son Tarih: ${o.due||'—'}
Kategori: ${ODM_CATS[o.cat]?.l||o.cat}
Talep Eden: ${cu?.name||'—'}
Not: ${o.note||'—'}

Lütfen Duay Platform üzerinden onaylayın.
Duay Global Trade`;

  const mo = document.createElement('div');
  mo.className = 'mo'; ;
  mo.innerHTML = '<div class="moc" style="max-width:480px">'
    + '<div class="mt">📧 Onay Bildirimi Gönderildi</div>'
    + '<p style="font-size:12px;color:var(--grt);margin-bottom:10px">✅ Sistem bildirimi tüm yöneticilere iletildi.</p>'
    + '<div class="fr"><div class="fl">E-POSTA TASLAK</div>'
    + '<textarea class="fi" id="notif-email" rows="8" style="resize:none;font-size:11px">' + emailBody + '</textarea></div>'
    + '<div class="mf">'
    + '<button class="btn" onclick="this.closest(\'.mo\').remove()">Kapat</button>'
    + '<button class="btn btnp" onclick="navigator.clipboard?.writeText(document.getElementById(\'notif-email\').value);window.toast?.(\'Kopyalandı\',\'ok\')">📋 Kopyala</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
  window.toast?.('Onay bildirimi gönderildi', 'ok');
}
window.notifyApprovalNeeded = notifyApprovalNeeded;

// ─────────────────────────────────────────────────────────────────
// ARAÇLAR MENÜSÜNE YENİ BUTONLAR — _injectOdmPanel güncelleniyor
// ─────────────────────────────────────────────────────────────────
function _odmInjectExtraButtons() {
  const topbar = document.querySelector('#panel-odemeler .pus-topbar, #panel-odemeler [style*="position:sticky"]');
  if (!topbar || topbar.dataset.extraInjected) return;
  topbar.dataset.extraInjected = '1';

  // Araçlar dropdown butonu ekle
  const extraBtn = document.createElement('div');
  extraBtn.style.cssText = 'position:relative;display:inline-block';
  extraBtn.innerHTML = '<button class="btn btns" onclick="_odmToggleTools(this)" style="border-radius:8px;font-size:11px">🛠 Araçlar ▾</button>'
    + '<div id="odm-extra-tools" style="display:none;position:absolute;right:0;top:calc(100%+4px);background:var(--sf);border:1px solid var(--b);border-radius:10px;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:100;overflow:hidden">'
    + '<button onclick="openBudgetManager();_go(\'odm-extra-tools\').style.display=\'none\'" class="btn btns" style="width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px">📊 Bütçe Takibi</button>'
    + '<button onclick="openBankaMutabakat();_go(\'odm-extra-tools\').style.display=\'none\'" class="btn btns" style="width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px">🏦 Banka Mutabakatı</button>'
    + '<button onclick="openCurrencyReport();_go(\'odm-extra-tools\').style.display=\'none\'" class="btn btns" style="width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px">💱 Döviz Raporu</button>'
    + '<button onclick="openOdmKPIDashboard();_go(\'odm-extra-tools\').style.display=\'none\'" class="btn btns" style="width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px">📈 KPI Dashboard</button>'
    + '<button onclick="openOdmChart();_go(\'odm-extra-tools\').style.display=\'none\'" class="btn btns" style="width:100%;text-align:left;border:none;border-radius:0;padding:9px 14px;font-size:12px">📉 Harcama Grafiği</button>'
    + '</div>';
  topbar.querySelector('[style*="gap"]')?.insertBefore(extraBtn, topbar.querySelector('.btn.btnp'));
}

function _odmToggleTools(btn) {
  const menu = document.getElementById('odm-extra-tools');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
window._odmToggleTools = _odmToggleTools;

// Sayfa dışı tıklanda araçlar menüsünü kapat
document.addEventListener('click', e => {
  if (!e.target.closest('#odm-extra-tools') && !e.target.textContent?.includes('Araçlar')) {
    const m = document.getElementById('odm-extra-tools');
    if (m) m.style.display = 'none';
  }
});

// Tablo satırı context menüsü — sağ tık extra aksiyonlar
function _odmRowContextMenu(e, id) {
  e.preventDefault();
  document.getElementById('odm-ctx-menu')?.remove();
  const o = (window.loadOdm?loadOdm():[]).find(x=>x.id===id);
  if (!o) return;

  const menu = document.createElement('div');
  menu.id = 'odm-ctx-menu';
  menu.style.cssText = 'position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;background:var(--sf);border:1px solid var(--b);border-radius:9px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;overflow:hidden';
  const items = [
    ['✏️ Düzenle',         () => openOdmModal(id)],
    ['📱 Hatırlatıcı',    () => openOdmReminderModal(id)],
    ['🏢 Tedarikçi Kartı', () => openTedarikciKart(o.name)],
    ['📐 Gecikme Faizi',   () => openFaizHesap(id)],
    ['📄 E-Fatura',        () => exportEFatura(id)],
    ['📋 Geçmiş & Not',    () => viewOdmHistory(id)],
    ['📎 PDF Talimatı',    () => exportOdmPaymentPDF(id)],
  ];
  if (_isAdminO()) items.push(['✓ Onayla', () => approveOdm(id)]);
  menu.innerHTML = items.map(([l,f]) => '<button style="width:100%;text-align:left;border:none;border-radius:0;padding:8px 14px;font-size:12px;background:none;cursor:pointer;font-family:inherit;color:var(--t2)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'none\'" onclick="(' + f.toString() + ')();document.getElementById(\'odm-ctx-menu\').remove()">' + l + '</button>').join('');
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), {once:true}), 10);
}
window._odmRowContextMenu = _odmRowContextMenu;

// renderOdemeler sonunda çalıştır
const _origRenderOdemeler = renderOdemeler;
window.renderOdemeler = function() {
  _origRenderOdemeler();
  setTimeout(() => {
    checkOdmBudgets();
    _odmInjectExtraButtons();
    // Tablo satırlarına sağ-tık menüsü ekle
    document.querySelectorAll('#odm-list > div[onmouseenter]').forEach(row => {
      const onclick = row.getAttribute('onclick') || '';
      const idMatch = onclick.match(/openOdmModal\((\d+)\)/);
      if (idMatch) {
        row.setAttribute('oncontextmenu', '_odmRowContextMenu(event,' + idMatch[1] + ')');
      }
    });
  }, 100);
};

// ════════════════════════════════════════════════════════════════
// INLINE SATIR DÜZENLEME — Ödeme + Tahsilat (Birleşik)
// ════════════════════════════════════════════════════════════════

var _ODM_INL_ST = 'font-size:11px;padding:4px 6px;border:1px solid var(--b);border-radius:5px;background:var(--s);color:var(--t);font-family:inherit;width:100%;box-sizing:border-box';

/**
 * Tip seçim satırını açar: 💸 Ödeme veya 💰 Tahsilat.
 */
window._odmOpenInlineTypePicker = function() {
  var existing = document.getElementById('odm-inline-new');
  if (existing) { existing.scrollIntoView({ behavior: 'smooth' }); return; }
  var cont = document.getElementById('odm-list');
  if (!cont) return;

  var picker = document.createElement('div');
  picker.id = 'odm-inline-new';
  picker.style.cssText = 'padding:16px;border:2px solid var(--b);background:var(--s2);display:flex;align-items:center;justify-content:center;gap:12px';
  picker.innerHTML = '<span style="font-size:12px;color:var(--t3);font-weight:500">Kayıt türü:</span>'
    + '<button onclick="window._odmShowInlineFields(\'odeme\')" style="padding:10px 24px;border:2px solid #EF4444;border-radius:10px;background:rgba(239,68,68,.06);cursor:pointer;font-size:14px;font-weight:600;color:#DC2626;font-family:inherit;transition:all .12s" onmouseover="this.style.background=\'rgba(239,68,68,.15)\'" onmouseout="this.style.background=\'rgba(239,68,68,.06)\'">💸 Ödeme</button>'
    + '<button onclick="window._odmShowInlineFields(\'tahsilat\')" style="padding:10px 24px;border:2px solid #10B981;border-radius:10px;background:rgba(16,185,129,.06);cursor:pointer;font-size:14px;font-weight:600;color:#059669;font-family:inherit;transition:all .12s" onmouseover="this.style.background=\'rgba(16,185,129,.15)\'" onmouseout="this.style.background=\'rgba(16,185,129,.06)\'">💰 Tahsilat</button>'
    + '<button onclick="document.getElementById(\'odm-inline-new\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3);padding:4px 8px">✕</button>';
  cont.appendChild(picker);
  picker.scrollIntoView({ behavior: 'smooth' });
};

/**
 * Seçilen tipe göre inline alanları gösterir.
 */
window._odmShowInlineFields = function(type) {
  var row = document.getElementById('odm-inline-new');
  if (!row) return;
  var IS = _ODM_INL_ST;
  var isOdeme = type === 'odeme';
  var borderColor = isOdeme ? 'rgba(239,68,68,.25)' : 'rgba(16,185,129,.25)';
  var bgColor = isOdeme ? 'rgba(239,68,68,.04)' : 'rgba(16,185,129,.04)';
  var btnColor = isOdeme ? '' : 'background:#10B981;border-color:#10B981';

  var catOpts = Object.entries(ODM_CATS).map(function(e) { return '<option value="' + e[0] + '">' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('');
  var curOpts = '<option value="TRY">₺ TRY</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option>';
  var bankOpts = '<option value="">—</option>' + ODM_BANKS.map(function(b) { return '<option value="' + b.id + '">' + b.ic + ' ' + b.l + '</option>'; }).join('');
  var tahTypeOpts = '<option value="musteri">Müşteri</option><option value="iade">İade</option><option value="devlet">Devlet/SGK</option><option value="faiz">Faiz</option><option value="diger">Diğer</option>';

  row.style.cssText = 'overflow-x:auto;border:2px solid ' + borderColor + ';background:' + bgColor;
  row.dataset.inlineType = type;

  if (isOdeme) {
    // Ödeme: Ad, Tutar, Para Birimi, Son Tarih, Kategori, Cari, Öncelik, Banka
    row.innerHTML = '<div style="display:flex;gap:0;min-width:1200px;align-items:center">'
      + '<div style="width:40px;padding:6px 4px;text-align:center;font-size:14px" title="Ödeme">💸</div>'
      + '<div style="flex:2;min-width:160px;padding:6px 4px"><input id="odi-name" placeholder="Ad / Açıklama *" style="' + IS + '" tabindex="1"></div>'
      + '<div style="width:110px;padding:6px 4px"><input type="number" id="odi-amount" placeholder="Tutar *" style="' + IS + '" tabindex="2"></div>'
      + '<div style="width:80px;padding:6px 4px"><select id="odi-currency" style="' + IS + '" tabindex="3">' + curOpts + '</select></div>'
      + '<div style="width:120px;padding:6px 4px"><input type="date" id="odi-due" style="' + IS + '" tabindex="4"></div>'
      + '<div style="width:120px;padding:6px 4px"><select id="odi-cat" style="' + IS + '" tabindex="5">' + catOpts + '</select></div>'
      + '<div style="width:110px;padding:6px 4px"><input id="odi-cari" placeholder="Cari / Firma" style="' + IS + '" tabindex="6"></div>'
      + '<div style="width:70px;padding:6px 4px"><select id="odi-pri" style="' + IS + '" tabindex="7"><option value="2">Normal</option><option value="1">Yüksek</option><option value="3">Düşük</option></select></div>'
      + '<div style="width:130px;padding:6px 4px"><select id="odi-bank" style="' + IS + '" tabindex="8">' + bankOpts + '</select></div>'
      + '<div style="width:90px;padding:6px 4px;display:flex;gap:3px;flex-shrink:0">'
        + '<button onclick="window._odmInlineSaveNew?.(\'odeme\')" class="btn btnp" style="font-size:10px;padding:3px 10px">✓ Kaydet</button>'
        + '<button onclick="document.getElementById(\'odm-inline-new\')?.remove()" class="btn btns" style="font-size:10px;padding:3px 6px">✗</button>'
      + '</div>'
    + '</div>';
  } else {
    // Tahsilat: Ad, Tutar, Para Birimi, Son Tarih, Tahsilat Türü, Cari
    row.innerHTML = '<div style="display:flex;gap:0;min-width:900px;align-items:center">'
      + '<div style="width:40px;padding:6px 4px;text-align:center;font-size:14px" title="Tahsilat">💰</div>'
      + '<div style="flex:2;min-width:160px;padding:6px 4px"><input id="odi-name" placeholder="Ad / Açıklama *" style="' + IS + '" tabindex="1"></div>'
      + '<div style="width:110px;padding:6px 4px"><input type="number" id="odi-amount" placeholder="Tutar *" style="' + IS + '" tabindex="2"></div>'
      + '<div style="width:80px;padding:6px 4px"><select id="odi-currency" style="' + IS + '" tabindex="3">' + curOpts + '</select></div>'
      + '<div style="width:120px;padding:6px 4px"><input type="date" id="odi-due" style="' + IS + '" tabindex="4"></div>'
      + '<div style="width:120px;padding:6px 4px"><select id="odi-tahtype" style="' + IS + '" tabindex="5">' + tahTypeOpts + '</select></div>'
      + '<div style="width:130px;padding:6px 4px"><input id="odi-cari" placeholder="Cari / Firma" style="' + IS + '" tabindex="6"></div>'
      + '<div style="width:90px;padding:6px 4px;display:flex;gap:3px;flex-shrink:0">'
        + '<button onclick="window._odmInlineSaveNew?.(\'tahsilat\')" class="btn btnp" style="font-size:10px;padding:3px 10px;' + btnColor + '">✓ Kaydet</button>'
        + '<button onclick="document.getElementById(\'odm-inline-new\')?.remove()" class="btn btns" style="font-size:10px;padding:3px 6px">✗</button>'
      + '</div>'
    + '</div>';
  }

  // Enter/Escape
  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._odmInlineSaveNew?.(type); }
    if (e.key === 'Escape') { row.remove(); }
  });
  setTimeout(function() { document.getElementById('odi-name')?.focus(); }, 50);
};

/**
 * Inline kaydet — ödeme veya tahsilat.
 */
window._odmInlineSaveNew = function(type) {
  var name   = (document.getElementById('odi-name')?.value || '').trim();
  var amount = parseFloat(document.getElementById('odi-amount')?.value || '0') || 0;
  var due    = document.getElementById('odi-due')?.value || '';
  var cur    = document.getElementById('odi-currency')?.value || 'TRY';

  // Doğrulama
  var _mark = function(id, bad) { var el = document.getElementById(id); if (el) el.style.borderColor = bad ? '#EF4444' : ''; };
  var errs = [];
  _mark('odi-name', !name);     if (!name)   errs.push('Ad');
  _mark('odi-amount', !amount); if (!amount) errs.push('Tutar');
  _mark('odi-due', !due);       if (!due)    errs.push('Son Tarih');
  if (errs.length) { window.toast?.('Zorunlu: ' + errs.join(', '), 'err'); return; }

  var cu = _CUo();
  var isAdmin = _isAdminO();

  if (type === 'tahsilat') {
    var d = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
    d.unshift({
      id: generateNumericId(), name: name, amount: amount, currency: cur, due: due,
      type: document.getElementById('odi-tahtype')?.value || 'musteri',
      from: (document.getElementById('odi-cari')?.value || '').trim(),
      collected: false, ts: _nowTso(), createdBy: cu?.id,
      approvalStatus: isAdmin ? 'approved' : 'pending',
    });
    if (typeof storeTahsilat === 'function') storeTahsilat(d);
    document.getElementById('odm-inline-new')?.remove();
    renderOdemeler();
    window.toast?.('💰 Tahsilat eklendi ✓', 'ok');
    if (!isAdmin) {
      var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return (u.role==='admin'||u.role==='manager') && u.status==='active'; });
      mgrs.forEach(function(m) { window.addNotif?.('💰', 'Yeni tahsilat onay bekliyor: ' + name + ' (' + (cu?.name||'') + ')', 'warn', 'odemeler', m.id); });
    }
  } else {
    var d2 = window.loadOdm ? loadOdm() : [];
    var entry = {
      id: generateNumericId(), name: name, amount: amount, currency: cur, due: due,
      cat: document.getElementById('odi-cat')?.value || 'diger',
      freq: 'teksefer', note: (document.getElementById('odi-cari')?.value || '').trim(),
      priority: parseInt(document.getElementById('odi-pri')?.value || '2'),
      banka: document.getElementById('odi-bank')?.value || '',
      paid: false, alarmDays: 3, ts: _nowTso(), createdBy: cu?.id, source: 'inline',
    };
    if (isAdmin) { entry.approved = true; entry.approvalStatus = 'approved'; }
    else { entry.approvalStatus = 'pending'; }
    d2.unshift(entry);
    window.storeOdm ? storeOdm(d2) : null;
    document.getElementById('odm-inline-new')?.remove();
    renderOdemeler();
    window.toast?.('💸 Ödeme eklendi ✓', 'ok');
    if (!isAdmin) {
      var mgrs2 = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return (u.role==='admin'||u.role==='manager') && u.status==='active'; });
      mgrs2.forEach(function(m) { window.addNotif?.('💸', 'Yeni ödeme onay bekliyor: ' + name + ' (' + (cu?.name||'') + ')', 'warn', 'odemeler', m.id); });
    }
  }
};

// Geriye uyumluluk
window._odmAddInlineRow = function() { window._odmOpenInlineTypePicker?.(); };
window._tahAddInlineRow = function() {
  window._odmOpenInlineTypePicker?.();
  setTimeout(function() { window._odmShowInlineFields?.('tahsilat'); }, 100);
};

/**
 * Mevcut ödeme satırını inline düzenlemeye çevirir.
 */
window._odmInlineEditRow = function(id) {
  var row = document.querySelector('[data-oid="' + id + '"]');
  if (!row || row.dataset.editing) return;
  row.dataset.editing = '1';
  var d = window.loadOdm ? loadOdm() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;

  var IS = _ODM_INL_ST;
  var catOpts = Object.entries(ODM_CATS).map(function(e) { return '<option value="' + e[0] + '"' + (o.cat === e[0] ? ' selected' : '') + '>' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('');
  var curOpts = ['TRY','USD','EUR'].map(function(c) { return '<option value="' + c + '"' + (o.currency === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');

  row.style.cssText = 'overflow-x:auto;border:2px solid rgba(239,68,68,.2);background:rgba(239,68,68,.04)';
  row.innerHTML = '<div style="display:flex;gap:0;min-width:1000px;align-items:center">'
    + '<div style="width:40px;padding:6px 4px;text-align:center;font-size:14px">✏️</div>'
    + '<div style="flex:2;min-width:160px;padding:6px 4px"><input id="ode-name-' + id + '" value="' + (o.name || '') + '" style="' + IS + '" tabindex="1"></div>'
    + '<div style="width:110px;padding:6px 4px"><input type="number" id="ode-amount-' + id + '" value="' + (o.amount || '') + '" style="' + IS + '" tabindex="2"></div>'
    + '<div style="width:80px;padding:6px 4px"><select id="ode-cur-' + id + '" style="' + IS + '" tabindex="3">' + curOpts + '</select></div>'
    + '<div style="width:120px;padding:6px 4px"><input type="date" id="ode-due-' + id + '" value="' + (o.due || '') + '" style="' + IS + '" tabindex="4"></div>'
    + '<div style="width:120px;padding:6px 4px"><select id="ode-cat-' + id + '" style="' + IS + '" tabindex="5">' + catOpts + '</select></div>'
    + '<div style="width:90px;padding:6px 4px;display:flex;gap:3px;flex-shrink:0">'
      + '<button onclick="window._odmInlineRowSave?.(' + id + ')" class="btn btnp" style="font-size:10px;padding:3px 10px">✓</button>'
      + '<button onclick="renderOdemeler()" class="btn btns" style="font-size:10px;padding:3px 6px">✗</button>'
      + '<button onclick="delOdm(' + id + ')" class="btn btns" style="font-size:10px;padding:3px 6px;color:#DC2626">🗑</button>'
    + '</div>'
  + '</div>';

  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._odmInlineRowSave?.(id); }
    if (e.key === 'Escape') { renderOdemeler(); }
  });
  setTimeout(function() { document.getElementById('ode-name-' + id)?.focus(); }, 50);
};

/**
 * Inline mevcut ödeme kaydeder.
 */
window._odmInlineRowSave = function(id) {
  var d = window.loadOdm ? loadOdm() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var name = (document.getElementById('ode-name-' + id)?.value || '').trim();
  var due  = document.getElementById('ode-due-' + id)?.value || '';
  if (!name) { window.toast?.('Ad zorunlu', 'err'); return; }
  if (!due)  { window.toast?.('Son tarih zorunlu', 'err'); return; }
  o.name     = name;
  o.amount   = parseFloat(document.getElementById('ode-amount-' + id)?.value || '0') || o.amount;
  o.currency = document.getElementById('ode-cur-' + id)?.value || o.currency;
  o.due      = due;
  o.cat      = document.getElementById('ode-cat-' + id)?.value || o.cat;
  o.ts       = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  window.toast?.('Güncellendi ✓', 'ok');
};


// ════════════════════════════════════════════════════════════════
// CARİ MODÜLÜ
// ════════════════════════════════════════════════════════════════

var CARI_KEY = 'ak_cari1';

// loadCari / storeCari artık database.js'te tanımlı (KEYS.cari + Firestore sync)
// İlk yükleme: Firestore boşsa localStorage verisini yaz
(function _cariInitialSync() {
  setTimeout(function() {
    if (window._cariInitialSyncDone) return;
    window._cariInitialSyncDone = true;
    try {
      var FB_DB = window.Auth?.getFBDB?.();
      if (!FB_DB || !window.Auth?.getFBAuth?.()?.currentUser) return;
      var tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
      FB_DB.collection('duay_' + tid).doc('cari').get().then(function(snap) {
        var fsData = snap.exists ? snap.data()?.data : null;
        if (!fsData || !Array.isArray(fsData) || fsData.length === 0) {
          var cariData = typeof loadCari === 'function' ? loadCari() : [];
          if (cariData.length && typeof storeCari === 'function') {
            storeCari(cariData);
            console.info('[Cari] İlk yükleme — Firestore\'a yazıldı:', cariData.length, 'kayıt');
          }
        }
      }).catch(function() {});
    } catch(e) {}
  }, 7000);
})();

// Cari ayarları (50K eşiği admin tarafından değiştirilebilir)
var CARI_SETTINGS_KEY = 'odm_cari_settings';
function _loadCariSettings() { try { return JSON.parse(localStorage.getItem(CARI_SETTINGS_KEY) || '{}'); } catch { return {}; } }
function _getCariDocThreshold() { return _loadCariSettings().docThreshold || 50000; }

/** Levenshtein mesafesi — firma adı benzerlik kontrolü */
function _levenshtein(a, b) {
  a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
  if (a === b) return 0;
  var m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  var d = [];
  for (var i = 0; i <= m; i++) { d[i] = [i]; }
  for (var j = 0; j <= n; j++) { d[0][j] = j; }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    }
  }
  return d[m][n];
}

/**
 * Cari kaydet (yeni veya güncelle).
 * 3 aşamalı: potansiyel → aktif → onaylı
 * VKN mükerrer kontrolü dahil.
 * @returns {Object|null} Kaydedilen entry veya null (hata)
 */
function saveCari(entry) {
  var d = loadCari();
  var isNew = !entry.id;
  var editId = entry.id || 0;

  // VKN format kontrolü (boş kabul edilir, doluysa 10 hane sayı zorunlu)
  if (entry.vkn && entry.vkn.trim()) {
    var vknClean = entry.vkn.replace(/\s/g, '');
    if (!/^\d{10}$/.test(vknClean)) {
      window.toast?.('VKN 10 haneli sayı olmalıdır (veya boş bırakın)', 'err');
      return null;
    }
    entry.vkn = vknClean;
  } else {
    entry.vkn = ''; // boş bırakıldı — kabul
  }
  // TCKN format kontrolü (boş kabul edilir, doluysa 11 hane sayı zorunlu)
  if (entry.tckn && entry.tckn.trim()) {
    var tcknClean = entry.tckn.replace(/\s/g, '');
    if (!/^\d{11}$/.test(tcknClean)) {
      window.toast?.('TCKN 11 haneli sayı olmalıdır (veya boş bırakın)', 'err');
      return null;
    }
    entry.tckn = tcknClean;
  } else {
    entry.tckn = '';
  }

  // VKN mükerrer kontrolü
  if (entry.vkn) {
    var vknDup = d.find(function(c) { return c.vkn === entry.vkn && c.id !== editId && !c.isDeleted; });
    if (vknDup) {
      window.toast?.('Bu VKN zaten kayıtlı: ' + (vknDup.name || '—'), 'err');
      return null;
    }
  }
  // TCKN mükerrer kontrolü
  if (entry.tckn) {
    var tcknDup = d.find(function(c) { return c.tckn === entry.tckn && c.id !== editId && !c.isDeleted; });
    if (tcknDup) {
      window.toast?.('Bu TCKN zaten kayıtlı: ' + (tcknDup.name || '—'), 'err');
      return null;
    }
  }

  // Firma adı benzerlik uyarısı (sadece uyarı, engelleme YOK)
  if (isNew && entry.name) {
    var similar = d.find(function(c) {
      if (c.isDeleted) return false;
      var dist = _levenshtein(c.name, entry.name);
      var maxLen = Math.max((c.name || '').length, (entry.name || '').length) || 1;
      return (1 - dist / maxLen) >= 0.8;
    });
    if (similar) {
      window.toast?.('⚠️ Benzer firma var: ' + similar.name + ' — kontrol edin', 'warn');
      // Engelleme yok — kayıt devam eder
    }
  }

  if (entry.id) {
    var existing = d.find(function(c) { return c.id === entry.id; });
    if (existing) {
      // Aşama değişikliği logla
      if (existing.cariType !== entry.cariType && entry.cariType) {
        if (!existing.changeHistory) existing.changeHistory = [];
        existing.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: ['Aşama: ' + (existing.cariType || 'potansiyel') + ' → ' + entry.cariType] });
      }
      Object.assign(existing, entry);
    }
    else d.unshift(entry);
  } else {
    entry.id = generateNumericId();
    entry.createdAt = _nowTso();
    entry.createdBy = _CUo()?.id;
    // Admin/yönetici: evrak zorunluluğu atla, doğrudan onaylı
    if (_isManagerO()) {
      entry.cariType = entry.cariType || 'onayli';
      entry.status = 'active';
      entry.approvedBy = _CUo()?.id;
      entry.approvedAt = _nowTso();
    } else {
      entry.cariType = entry.cariType || 'potansiyel';
      entry.status = 'pending_approval';
    }
    if (!entry.contacts) entry.contacts = [];
    if (!entry.documents) entry.documents = [];
    if (!entry.changeHistory) entry.changeHistory = [];
    entry.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: ['Cari oluşturuldu (aşama: ' + entry.cariType + ')'] });
    d.unshift(entry);
  }
  storeCari(d);
  // Yeni cari bildirimi
  if (isNew) {
    var cu = _CUo();
    var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) {
      return (u.role === 'admin' || u.role === 'manager') && u.status === 'active';
    });
    mgrs.forEach(function(m) {
      window.addNotif?.('🏢', 'Yeni cari onay bekliyor: ' + (entry.name || '—') + ' (' + (cu?.name || '') + ')', 'warn', 'cari:' + entry.id, m.id);
    });
  }
  return entry;
}

/**
 * Cari onaylama.
 */
function _approveCari(id) {
  if (!_isManagerO()) { window.toast?.('Yetki yok', 'err'); return; }
  var d = loadCari();
  var c = d.find(function(x) { return x.id === id; });
  if (!c) return;
  c.status = 'active';
  c.approvedBy = _CUo()?.id;
  c.approvedAt = _nowTso();
  storeCari(d);
  window.toast?.('Cari onaylandı ✓', 'ok');
  window.addNotif?.('✅', 'Cari onaylandı: ' + c.name, 'ok', 'cari', c.createdBy);
  if (typeof renderCari === 'function') renderCari();
}

/**
 * Cari reddetme.
 */
function _rejectCari(id) {
  if (!_isManagerO()) { window.toast?.('Yetki yok', 'err'); return; }
  var d = loadCari();
  var c = d.find(function(x) { return x.id === id; });
  if (!c) return;
  c.status = 'rejected';
  c.rejectedBy = _CUo()?.id;
  c.rejectedAt = _nowTso();
  storeCari(d);
  window.toast?.('Cari reddedildi', 'ok');
  window.addNotif?.('❌', 'Cari reddedildi: ' + c.name, 'err', 'cari', c.createdBy);
  if (typeof renderCari === 'function') renderCari();
}

/**
 * Cari risk skoru hesaplama (0-100).
 */
function _cariRiskScore(cariId, cariName) {
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var cOdm = odm.filter(function(o) { return o.cariId === cariId || (o.note || '').toLowerCase().includes((cariName || '').toLowerCase()); });
  if (cOdm.length < 3) return 50; // yetersiz veri
  var paid = cOdm.filter(function(o) { return o.paid; }).length;
  var late = cOdm.filter(function(o) { return !o.paid && o.due && o.due < new Date().toISOString().slice(0,10); }).length;
  var total = cOdm.length || 1;
  return Math.max(0, Math.min(100, Math.round((paid / total * 60) + (Math.max(0, 40 - late * 10)))));
}

/**
 * Yaşlandırma raporu: 30/60/90+ gün vadesi geçen.
 */
function _cariAgingReport(cariId, cariName) {
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var today = new Date().toISOString().slice(0, 10);
  var cOdm = odm.filter(function(o) { return !o.paid && o.due && o.due < today && (o.cariId === cariId || (o.note || '').toLowerCase().includes((cariName || '').toLowerCase())); });
  var aging = { d30: 0, d60: 0, d90: 0 };
  cOdm.forEach(function(o) {
    var days = Math.ceil((new Date(today) - new Date(o.due)) / 86400000);
    if (days >= 90) aging.d90 += parseFloat(o.amount) || 0;
    else if (days >= 60) aging.d60 += parseFloat(o.amount) || 0;
    else if (days >= 30) aging.d30 += parseFloat(o.amount) || 0;
  });
  return aging;
}

/**
 * İki cariyi birleştirir: hareketleri id1'e taşır, id2'yi siler.
 */
function _mergeCari(id1, id2) {
  if (!_isManagerO()) { window.toast?.('Yetki yok', 'err'); return; }
  // Ödemelerde cariId güncelle
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  odm.forEach(function(o) { if (o.cariId === id2) o.cariId = id1; });
  if (typeof storeOdm === 'function') storeOdm(odm);
  // Tahsilatlarda
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  tah.forEach(function(t) { if (t.cariId === id2) t.cariId = id1; });
  if (typeof storeTahsilat === 'function') storeTahsilat(tah);
  // Cariyi sil
  deleteCari(id2);
  window.toast?.('Cariler birleştirildi ✓', 'ok');
  if (typeof renderCari === 'function') renderCari();
}

window._approveCari  = _approveCari;
window._rejectCari   = _rejectCari;
window._cariRiskScore = _cariRiskScore;
window._cariAgingReport = _cariAgingReport;
window._mergeCari    = _mergeCari;

/**
 * Cari sil.
 */
function deleteCari(id) {
  storeCari(loadCari().filter(function(c) { return c.id !== id; }));
}

/**
 * Cari dropdown HTML oluşturur.
 * @param {string} selectedId
 * @param {string} inputId
 * @returns {string}
 */
function _cariDropdownHTML(selectedId, inputId) {
  var cariList = loadCari();
  return '<div style="display:flex;gap:4px;align-items:center">'
    + '<select class="fi" id="' + inputId + '" style="flex:1;font-size:11px">'
      + '<option value="">— Cari seçin —</option>'
      + cariList.map(function(c) { return '<option value="' + c.id + '"' + (String(c.id) === String(selectedId) ? ' selected' : '') + '>' + (c.name || '?') + ' (' + (c.type || 'diğer') + ')</option>'; }).join('')
    + '</select>'
    + '<button type="button" onclick="window._openQuickCari?.()" class="btn btns" style="font-size:12px;padding:3px 8px;flex-shrink:0">+</button>'
  + '</div>';
}

/**
 * Hızlı cari ekleme mini modalı.
 */
window._openQuickCari = function(editId) {
  var old = document.getElementById('mo-quick-cari'); if (old) old.remove();
  var c = editId ? loadCari().find(function(x) { return x.id === editId; }) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-quick-cari'; mo.style.display = 'flex'; ;
  mo.innerHTML = '<div class="moc" style="max-width:650px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:12px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:14px;font-weight:700;color:var(--t)">' + (c ? '✏️ Cari Düzenle' : '+ Cari Ekle') + '</div>'
      + '<button onclick="document.getElementById(\'mo-quick-cari\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    // 4 Sekme
    + '<div style="display:flex;border-bottom:1px solid var(--b);flex-shrink:0">'
      + '<button class="qc-tab active" data-tab="genel" onclick="window._qcSwitchTab(\'genel\')" style="padding:10px 18px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--ac);border-bottom:2px solid var(--ac);font-family:inherit">Genel</button>'
      + '<button class="qc-tab" data-tab="finans" onclick="window._qcSwitchTab(\'finans\')" style="padding:10px 18px;border:none;background:none;cursor:pointer;font-size:12px;color:var(--t3);border-bottom:2px solid transparent;font-family:inherit">Finansal</button>'
      + '<button class="qc-tab" data-tab="kisiler" onclick="window._qcSwitchTab(\'kisiler\')" style="padding:10px 18px;border:none;background:none;cursor:pointer;font-size:12px;color:var(--t3);border-bottom:2px solid transparent;font-family:inherit">Kişiler</button>'
      + '<button class="qc-tab" data-tab="belgeler" onclick="window._qcSwitchTab(\'belgeler\')" style="padding:10px 18px;border:none;background:none;cursor:pointer;font-size:12px;color:var(--t3);border-bottom:2px solid transparent;font-family:inherit">Belgeler</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:14px 16px">'
      // Genel sekmesi
      + '<div id="qc-panel-genel" class="qc-panel">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
          + '<div><div class="fl">FİRMA ADI *</div><input class="fi" id="qc-name" placeholder="Firma adı" value="' + esc(c?.name || '') + '"></div>'
          + '<div><div class="fl">TİP *</div><select class="fi" id="qc-type"><option value="tedarikci"' + (c?.type === 'tedarikci' ? ' selected' : '') + '>Tedarikçi</option><option value="musteri"' + (c?.type === 'musteri' ? ' selected' : '') + '>Müşteri</option><option value="diger"' + (c?.type === 'diger' ? ' selected' : '') + '>Diğer</option></select></div>'
          + '<div><div class="fl">CARİ AŞAMA</div><select class="fi" id="qc-caritype"><option value="potansiyel"' + ((c?.cariType || 'potansiyel') === 'potansiyel' ? ' selected' : '') + '>🔵 Potansiyel</option><option value="aktif"' + (c?.cariType === 'aktif' ? ' selected' : '') + '>🟡 Aktif</option><option value="onayli"' + (c?.cariType === 'onayli' ? ' selected' : '') + ' disabled>🟢 Onaylı (yönetici atar)</option></select></div>'
          + '<div><div class="fl">VKN (10 HANE) *</div><input class="fi" id="qc-tax" value="' + esc(c?.vkn || c?.taxNo || '') + '" placeholder="0000000000" maxlength="10" pattern="[0-9]{10}"></div>'
          + '<div><div class="fl">TCKN (11 HANE)</div><input class="fi" id="qc-tckn" value="' + esc(c?.tckn || '') + '" placeholder="Bireysel için" maxlength="11"></div>'
          + '<div><div class="fl">VERGİ DAİRESİ *</div><input class="fi" id="qc-taxoffice" value="' + esc(c?.taxOffice || '') + '" placeholder="Vergi dairesi"></div>'
          + '<div><div class="fl">ÜLKE *</div><input class="fi" id="qc-country" value="' + esc(c?.country || '') + '" placeholder="Türkiye"></div>'
          + '<div><div class="fl">ŞEHİR</div><input class="fi" id="qc-city" value="' + esc(c?.city || '') + '"></div>'
          + '<div><div class="fl">TELEFON</div><input class="fi" id="qc-phone" value="' + esc(c?.phone || '') + '"></div>'
          + '<div><div class="fl">E-POSTA</div><input class="fi" type="email" id="qc-email" value="' + esc(c?.email || '') + '"></div>'
          + '<div><div class="fl">WEB</div><input class="fi" id="qc-web" value="' + esc(c?.web || '') + '" placeholder="www.firma.com"></div>'
          + '<div><div class="fl">POSTA KODU</div><input class="fi" id="qc-zip" value="' + esc(c?.zip || '') + '"></div>'
        + '</div>'
        + '<div style="margin-top:10px"><div class="fl">ADRES</div><textarea class="fi" id="qc-address" rows="2" style="resize:none">' + esc(c?.address || '') + '</textarea></div>'
      + '</div>'
      // Finansal sekmesi
      + '<div id="qc-panel-finans" class="qc-panel" style="display:none">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
          + '<div><div class="fl">PARA BİRİMİ *</div><select class="fi" id="qc-currency"><option value="USD"' + (c?.currency === 'USD' ? ' selected' : '') + '>USD</option><option value="EUR"' + (c?.currency === 'EUR' ? ' selected' : '') + '>EUR</option><option value="TRY"' + (c?.currency === 'TRY' ? ' selected' : '') + '>TRY</option><option value="GBP"' + (c?.currency === 'GBP' ? ' selected' : '') + '>GBP</option></select></div>'
          + '<div><div class="fl">KREDİ LİMİTİ</div><input class="fi" type="number" id="qc-limit" value="' + (c?.limitAmount || '') + '"></div>'
          + '<div><div class="fl">ÖDEME VADESİ (gün)</div><input class="fi" type="number" id="qc-payterm" value="' + (c?.paymentTerm || '') + '" placeholder="30"></div>'
          + '<div><div class="fl">BANKA ADI</div><input class="fi" id="qc-bank" value="' + esc(c?.bankName || '') + '"></div>'
          + '<div><div class="fl">IBAN</div><input class="fi" id="qc-iban" value="' + esc(c?.iban || '') + '"></div>'
          + '<div><div class="fl">SWIFT</div><input class="fi" id="qc-swift" value="' + esc(c?.swift || '') + '"></div>'
        + '</div>'
      + '</div>'
      // Kişiler sekmesi
      + '<div id="qc-panel-kisiler" class="qc-panel" style="display:none">'
        + '<div id="qc-contacts">' + (function() {
            var contacts = c?.contacts || [];
            return contacts.map(function(ct, i) {
              return '<div class="qc-contact-row" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 30px;gap:6px;margin-bottom:6px">'
                + '<input class="fi qc-ct-name" placeholder="Ad Soyad" value="' + esc(ct.name || '') + '" style="font-size:11px;padding:5px">'
                + '<input class="fi qc-ct-pos" placeholder="Pozisyon" value="' + esc(ct.position || '') + '" style="font-size:11px;padding:5px">'
                + '<input class="fi qc-ct-phone" placeholder="Telefon" value="' + esc(ct.phone || '') + '" style="font-size:11px;padding:5px">'
                + '<input class="fi qc-ct-email" placeholder="E-posta" value="' + esc(ct.email || '') + '" style="font-size:11px;padding:5px">'
                + '<button onclick="this.closest(\'.qc-contact-row\').remove()" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
              + '</div>';
            }).join('');
          })()
        + '</div>'
        + '<button onclick="window._qcAddContact?.()" class="btn btns" style="font-size:11px;margin-top:6px">+ Kişi Ekle</button>'
      + '</div>'
      // Belgeler sekmesi
      + '<div id="qc-panel-belgeler" class="qc-panel" style="display:none">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">'
          + '<div style="padding:10px;border:1px solid var(--b);border-radius:8px;text-align:center">'
            + '<div class="fl">VERGİ LEVHASİ</div>'
            + '<div style="font-size:20px;margin:4px 0">' + (c?.vergiLevhasi ? '✅' : '❌') + '</div>'
            + '<button onclick="window._qcUploadDoc(\'vergiLevhasi\')" class="btn btns" style="font-size:10px;width:100%">📎 Yükle</button>'
          + '</div>'
          + '<div style="padding:10px;border:1px solid var(--b);border-radius:8px;text-align:center">'
            + '<div class="fl">İMZA SİRKÜLERİ</div>'
            + '<div style="font-size:20px;margin:4px 0">' + (c?.imzaSirkuleri ? '✅' : '❌') + '</div>'
            + '<button onclick="window._qcUploadDoc(\'imzaSirkuleri\')" class="btn btns" style="font-size:10px;width:100%">📎 Yükle</button>'
          + '</div>'
          + '<div style="padding:10px;border:1px solid var(--b);border-radius:8px;text-align:center">'
            + '<div class="fl">TİCARET SİCİL</div>'
            + '<div style="font-size:20px;margin:4px 0">' + (c?.ticaretSicil ? '✅' : '❌') + '</div>'
            + '<button onclick="window._qcUploadDoc(\'ticaretSicil\')" class="btn btns" style="font-size:10px;width:100%">📎 Yükle</button>'
          + '</div>'
        + '</div>'
        + '<div><div class="fl">DİĞER BELGE</div><input type="file" id="qc-doc-file" accept=".pdf,.jpg,.jpeg,.png" style="font-size:11px"></div>'
        + '<div style="font-size:9px;color:var(--t3);margin-top:2px">PDF/JPG/PNG, maks 5MB</div>'
        + '<div id="qc-docs-list" style="margin-top:10px">' + (function() {
            var docs = c?.documents || [];
            return docs.map(function(d) { return '<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--b)">📎 ' + esc(d.name || '?') + ' (' + (d.type || '—') + ')</div>'; }).join('') || '<div style="font-size:11px;color:var(--t3)">Belge yok</div>';
          })()
        + '</div>'
        + '<div style="margin-top:10px"><div class="fl">NOTLAR</div><textarea class="fi" id="qc-notes" rows="2" style="resize:none">' + esc(c?.notes || '') + '</textarea></div>'
      + '</div>'
      + '<input type="hidden" id="qc-edit-id" value="' + (c?.id || '') + '">'
    + '</div>'
    + '<div style="padding:10px 16px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-quick-cari\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveQuickCari?.()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  setTimeout(function() { document.getElementById('qc-name')?.focus(); }, 50);
};

window._qcSwitchTab = function(tab) {
  document.querySelectorAll('.qc-tab').forEach(function(t) {
    var active = t.dataset.tab === tab;
    t.style.color = active ? 'var(--ac)' : 'var(--t3)';
    t.style.borderBottomColor = active ? 'var(--ac)' : 'transparent';
    t.style.fontWeight = active ? '600' : '400';
  });
  document.querySelectorAll('.qc-panel').forEach(function(p) { p.style.display = 'none'; });
  var panel = document.getElementById('qc-panel-' + tab);
  if (panel) panel.style.display = '';
};

window._qcAddContact = function() {
  var cont = document.getElementById('qc-contacts'); if (!cont) return;
  cont.insertAdjacentHTML('beforeend', '<div class="qc-contact-row" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 30px;gap:6px;margin-bottom:6px">'
    + '<input class="fi qc-ct-name" placeholder="Ad Soyad" style="font-size:11px;padding:5px">'
    + '<input class="fi qc-ct-pos" placeholder="Pozisyon" style="font-size:11px;padding:5px">'
    + '<input class="fi qc-ct-phone" placeholder="Telefon" style="font-size:11px;padding:5px">'
    + '<input class="fi qc-ct-email" placeholder="E-posta" style="font-size:11px;padding:5px">'
    + '<button onclick="this.closest(\'.qc-contact-row\').remove()" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
  + '</div>');
};

window._saveQuickCari = function() {
  var name = (document.getElementById('qc-name')?.value || '').trim();
  if (!name) { window.toast?.('Firma adı zorunlu', 'err'); return; }
  var editId = document.getElementById('qc-edit-id')?.value || '';

  // Kişileri topla
  var contacts = [];
  document.querySelectorAll('.qc-contact-row').forEach(function(row) {
    var ct = { name: row.querySelector('.qc-ct-name')?.value || '', position: row.querySelector('.qc-ct-pos')?.value || '', phone: row.querySelector('.qc-ct-phone')?.value || '', email: row.querySelector('.qc-ct-email')?.value || '' };
    if (ct.name) contacts.push(ct);
  });

  var vknVal = (document.getElementById('qc-tax')?.value || '').trim();
  var entry = {
    name: name,
    type: document.getElementById('qc-type')?.value || 'diger',
    cariType: document.getElementById('qc-caritype')?.value || 'potansiyel',
    vkn: vknVal,
    tckn: (document.getElementById('qc-tckn')?.value || '').trim(),
    taxNo: vknVal,
    taxOffice: (document.getElementById('qc-taxoffice')?.value || '').trim(),
    country: (document.getElementById('qc-country')?.value || '').trim(),
    city: (document.getElementById('qc-city')?.value || '').trim(),
    phone: (document.getElementById('qc-phone')?.value || '').trim(),
    email: (document.getElementById('qc-email')?.value || '').trim(),
    web: (document.getElementById('qc-web')?.value || '').trim(),
    zip: (document.getElementById('qc-zip')?.value || '').trim(),
    address: (document.getElementById('qc-address')?.value || '').trim(),
    currency: document.getElementById('qc-currency')?.value || 'USD',
    limitAmount: parseFloat(document.getElementById('qc-limit')?.value || '0') || 0,
    paymentTerm: parseInt(document.getElementById('qc-payterm')?.value || '0') || 0,
    bankName: (document.getElementById('qc-bank')?.value || '').trim(),
    iban: (document.getElementById('qc-iban')?.value || '').trim(),
    swift: (document.getElementById('qc-swift')?.value || '').trim(),
    contacts: contacts,
    notes: (document.getElementById('qc-notes')?.value || '').trim(),
  };
  if (editId) entry.id = parseInt(editId);
  var result = saveCari(entry);
  if (result === null) return; // Hata varsa modal kapanmasın
  document.getElementById('mo-quick-cari')?.remove();
  window.toast?.(editId ? 'Cari güncellendi ✓' : 'Cari eklendi ✓', 'ok');
  renderOdemeler();
  if (typeof renderCari === 'function') renderCari();
};

/**
 * Cari panelini render eder.
 */
var _cariSelectedId = null;

function renderCari() {
  var panel = document.getElementById('panel-cari');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);position:sticky;top:0;z-index:200">'
        + '<div><div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">Cari Yönetimi</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Müşteri & Tedarikçi</div></div>'
        + '<div style="display:flex;gap:6px">'
          + '<button onclick="window._exportCariXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\'">Excel</button>'
          + (_isAdminO() ? '<button onclick="_insertCariDemoData()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">🎲 Demo</button>' : '')
          + '<button onclick="window._openQuickCari?.()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .12s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">+ Cari Ekle</button>'
        + '</div>'
      + '</div>'
      + '<div style="display:flex;min-height:calc(100vh - 120px)">'
        // Sol panel — liste
        + '<div style="width:320px;border-right:1px solid var(--b);display:flex;flex-direction:column;flex-shrink:0">'
          + '<div style="padding:8px 12px;border-bottom:0.5px solid var(--b);display:flex;gap:6px">'
            + '<input class="fi" id="cari-search" placeholder="Ara..." oninput="renderCari()" style="font-size:11px;flex:1;border:0.5px solid var(--b);border-radius:7px">'
            + '<select class="fi" id="cari-type-f" onchange="renderCari()" style="font-size:11px;width:90px;border:0.5px solid var(--b);border-radius:7px"><option value="">Tümü</option><option value="musteri">Müşteri</option><option value="tedarikci">Tedarikçi</option><option value="diger">Diğer</option></select>'
            + '<select class="fi" id="cari-stage-f" onchange="renderCari()" style="font-size:11px;width:95px;border:0.5px solid var(--b);border-radius:7px"><option value="">Tüm Aşama</option><option value="potansiyel">🔵 Potansiyel</option><option value="aktif">🟡 Aktif</option><option value="onayli">🟢 Onaylı</option><option value="rejected">🔴 Reddedildi</option></select>'
          + '</div>'
          + '<div id="cari-list" style="flex:1;overflow-y:auto"></div>'
        + '</div>'
        // Sağ panel — detay
        + '<div id="cari-detail" style="flex:1;overflow-y:auto;background:var(--s2)"></div>'
      + '</div>';
  }

  var all = loadCari().filter(function(c) { return !c.isDeleted; });
  var search = (document.getElementById('cari-search')?.value || '').toLowerCase();
  var typeF = document.getElementById('cari-type-f')?.value || '';
  var stageF = document.getElementById('cari-stage-f')?.value || '';
  var fl = all.filter(function(c) {
    if (typeF && c.type !== typeF) return false;
    if (stageF) {
      if (stageF === 'rejected' && c.status !== 'rejected') return false;
      if (stageF !== 'rejected' && (c.cariType || 'potansiyel') !== stageF) return false;
    }
    if (search && !(c.name || '').toLowerCase().includes(search)) return false;
    return true;
  });
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cont = document.getElementById('cari-list');
  if (!cont) return;
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var today = _todayStr();

  // ── İstatistik paneli ──────────────────────────────────────────
  var statsEl = document.getElementById('cari-stats');
  if (!statsEl) {
    statsEl = document.createElement('div');
    statsEl.id = 'cari-stats';
    var listParent = cont.parentElement;
    if (listParent) listParent.insertBefore(statsEl, cont);
  }
  var potCount = all.filter(function(c) { return (c.cariType || 'potansiyel') === 'potansiyel' && c.status !== 'rejected'; }).length;
  var aktCount = all.filter(function(c) { return c.cariType === 'aktif'; }).length;
  var onayCount = all.filter(function(c) { return c.cariType === 'onayli'; }).length;
  var redCount = all.filter(function(c) { return c.status === 'rejected'; }).length;
  var toplamBorc = odm.filter(function(o) { return !o.paid && !o.isDeleted; }).reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
  var toplamAlacak = tah.filter(function(t) { return !t.collected && !t.isDeleted; }).reduce(function(s, t) { return s + (parseFloat(t.amountTRY || t.amount) || 0); }, 0);
  statsEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:8px 12px;border-bottom:1px solid var(--b);background:var(--sf)">'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:var(--t)">' + all.length + '</div><div style="font-size:9px;color:var(--t3)">Toplam</div></div>'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:#3B82F6">' + potCount + '</div><div style="font-size:9px;color:var(--t3)">🔵 Potansiyel</div></div>'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:#F59E0B">' + aktCount + '</div><div style="font-size:9px;color:var(--t3)">🟡 Aktif</div></div>'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:#16A34A">' + onayCount + '</div><div style="font-size:9px;color:var(--t3)">🟢 Onaylı</div></div>'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:#DC2626">₺' + Math.round(toplamBorc).toLocaleString('tr-TR') + '</div><div style="font-size:9px;color:var(--t3)">Toplam Borç</div></div>'
    + '<div style="text-align:center;padding:6px"><div style="font-size:16px;font-weight:700;color:#16A34A">₺' + Math.round(toplamAlacak).toLocaleString('tr-TR') + '</div><div style="font-size:9px;color:var(--t3)">Toplam Alacak</div></div>'
  + '</div>';

  // ── Cari durum rengi hesaplama ─────────────────────────────────
  function _getCariStatusColor(c) {
    var cOdm = odm.filter(function(o) { return !o.isDeleted && (o.cariName === c.name); });
    var gecik = cOdm.filter(function(o) { return !o.paid && o.due && o.due < today; });
    var yakin = cOdm.filter(function(o) { return !o.paid && o.due && o.due >= today && o.due <= new Date(new Date().getTime() + 7*86400000).toISOString().slice(0,10); });
    var cLimit = c.creditLimit || c.limitAmount || 0;
    var unpaid = cOdm.filter(function(o) { return !o.paid; }).reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
    // Kırmızı: gecikmiş veya limit aşımı
    if (gecik.length > 0 || (cLimit > 0 && unpaid > cLimit)) return { icon: '🔴', color: '#DC2626', label: 'Riskli' };
    // Sarı: 7 gün içinde vade
    if (yakin.length > 0) return { icon: '🟡', color: '#F59E0B', label: 'Dikkat' };
    // Kupa: son 6 ayda tüm ödemeler zamanında
    var sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    var sixMonStr = sixMonthsAgo.toISOString().slice(0, 10);
    var recentOdm = cOdm.filter(function(o) { return o.due && o.due >= sixMonStr; });
    var allOnTime = recentOdm.length >= 3 && recentOdm.every(function(o) { return o.paid; });
    if (allOnTime) return { icon: '🏆', color: '#D4A017', label: 'Mükemmel' };
    // Yeşil: normal
    return { icon: '🟢', color: '#16A34A', label: 'İyi' };
  }

  // ── Toplu işlem toolbar (admin) ────────────────────────────────
  var bulkBar = document.getElementById('cari-bulk-bar');
  if (!bulkBar && _isManagerO()) {
    bulkBar = document.createElement('div');
    bulkBar.id = 'cari-bulk-bar';
    bulkBar.style.cssText = 'display:none;padding:6px 12px;background:#FEF2F2;border-bottom:1px solid #FECACA;align-items:center;gap:8px';
    bulkBar.innerHTML = '<span style="font-size:11px;color:#991B1B;font-weight:600" id="cari-bulk-count">0 seçili</span>'
      + '<button onclick="window._cariBulkDelete()" class="btn btns" style="font-size:10px;color:#DC2626">🗑 Seçilenleri Sil</button>'
      + '<button onclick="window._cariBulkClear()" class="btn btns" style="font-size:10px">İptal</button>';
    var listParent2 = cont.parentElement;
    if (listParent2) listParent2.insertBefore(bulkBar, cont);
  }

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px;margin-bottom:8px">🏢</div><div>Cari bulunamadı</div></div>';
    document.getElementById('cari-detail').innerHTML = '';
    return;
  }

  // Onay bekleyen cariler — yönetici için ayrı bölüm
  var pendingCari = fl.filter(function(c) { return c.status === 'pending_approval'; });
  var activeCari = fl.filter(function(c) { return c.status !== 'pending_approval'; });
  var isManager = _isManagerO();
  var html = '';

  // Onay Bekleyenler bölümü
  if (pendingCari.length > 0) {
    html += '<div style="padding:8px 12px;background:#FEF3C7;border-bottom:1px solid #FDE68A">'
      + '<div style="font-size:11px;font-weight:700;color:#92400E">⏳ Onay Bekleyenler (' + pendingCari.length + ')</div></div>';
    html += pendingCari.map(function(c) {
      var isSel = c.id === _cariSelectedId;
      var createdByUser = (typeof loadUsers === 'function' ? loadUsers() : []).find(function(u) { return u.id === c.createdBy; });
      return '<div onclick="window._selectCari?.(' + c.id + ')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #FDE68A;cursor:pointer;background:' + (isSel ? '#FEF3C7' : '#FFFBEB') + '">'
        + '<span style="font-size:14px">⏳</span>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:12px;font-weight:600;color:#92400E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.name) + '</div>'
          + '<div style="font-size:10px;color:#B45309">' + (c.type === 'musteri' ? 'Müşteri' : c.type === 'tedarikci' ? 'Tedarikçi' : 'Diğer')
            + (createdByUser ? ' · ' + esc(createdByUser.name) : '') + ' · ' + (c.createdAt || '').slice(0, 10) + '</div>'
        + '</div>'
        + (isManager
          ? '<div style="display:flex;gap:4px;flex-shrink:0">'
            + '<button onclick="event.stopPropagation();window._approveCari(' + c.id + ')" style="background:#16A34A;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;font-weight:600" title="Onayla">✓</button>'
            + '<button onclick="event.stopPropagation();window._rejectCari(' + c.id + ')" style="background:#DC2626;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;font-weight:600" title="Reddet">✗</button>'
          + '</div>'
          : '<span style="font-size:9px;color:#B45309;flex-shrink:0">Onay bekliyor</span>')
      + '</div>';
    }).join('');
  }

  // Aktif cariler bölümü
  if (activeCari.length > 0 && pendingCari.length > 0) {
    html += '<div style="padding:8px 12px;background:var(--s2);border-bottom:1px solid var(--b)">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t3)">✅ Aktif Cariler (' + activeCari.length + ')</div></div>';
  }
  html += activeCari.map(function(c) {
    var isSel = c.id === _cariSelectedId;
    var stage = c.cariType || 'potansiyel';
    var stageBadge = stage === 'onayli' ? '🟢' : stage === 'aktif' ? '🟡' : '🔵';
    var statusBadge = c.status === 'rejected' ? ' <span style="font-size:9px;color:#DC2626;font-weight:600">Reddedildi</span>' : '';
    var stageLabel = stage === 'onayli' ? 'Onaylı' : stage === 'aktif' ? 'Aktif' : 'Potansiyel';
    var sc = _getCariStatusColor(c);
    return '<div onclick="window._selectCari?.(' + c.id + ')" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--b);cursor:pointer;background:' + (isSel ? 'var(--al)' : '') + ';transition:background .1s" onmouseenter="if(!' + isSel + ')this.style.background=\'var(--s2)\'" onmouseleave="if(!' + isSel + ')this.style.background=\'\'">'
      + (isManager ? '<input type="checkbox" class="cari-bulk-cb" value="' + c.id + '" onclick="event.stopPropagation();window._cariUpdateBulkCount()" style="accent-color:#DC2626;flex-shrink:0">' : '')
      + '<span style="font-size:14px" title="' + sc.label + '">' + sc.icon + '</span>'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.name) + statusBadge + '</div>'
        + '<div style="font-size:10px;color:var(--t3)">' + (c.type === 'musteri' ? 'Müşteri' : c.type === 'tedarikci' ? 'Tedarikçi' : 'Diğer') + ' · ' + stageLabel + '</div></div>'
    + '</div>';
  }).join('');

  cont.innerHTML = html;

  // İlk cariyi seç — pending varsa ilk pending'i, yoksa ilk aktifi
  if (!_cariSelectedId && fl.length) {
    _cariSelectedId = pendingCari.length ? pendingCari[0].id : fl[0].id;
  }
  if (_cariSelectedId) _renderCariDetail(_cariSelectedId);
}

window._selectCari = function(id) { _cariSelectedId = id; renderCari(); };

function _renderCariDetail(id) {
  var cont = document.getElementById('cari-detail');
  if (!cont) return;
  var c = loadCari().find(function(x) { return x.id === id; });
  if (!c) { cont.innerHTML = ''; return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var cOdm = odm.filter(function(o) { return o.cariId === c.id || (o.note || '').toLowerCase().includes(c.name.toLowerCase()); });
  var cTah = tah.filter(function(t) { return t.cariId === c.id || (t.from || '').toLowerCase().includes(c.name.toLowerCase()); });
  var totalBorc = cOdm.reduce(function(a, o) { return a + (parseFloat(o.amount) || 0); }, 0);
  var totalAlacak = cTah.reduce(function(a, t) { return a + (parseFloat(t.amount) || 0); }, 0);
  var netBakiye = totalAlacak - totalBorc;

  // Tüm hareketler kronolojik
  var hareketler = [];
  cOdm.forEach(function(o) { hareketler.push({ type: 'odeme', name: o.name, amount: o.amount, date: o.due || o.ts, status: o.paid ? 'Ödendi' : 'Bekliyor' }); });
  cTah.forEach(function(t) { hareketler.push({ type: 'tahsilat', name: t.name, amount: t.amount, date: t.due || t.ts, status: t.collected ? 'Tahsil' : 'Bekliyor' }); });
  hareketler.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

  cont.innerHTML = '<div style="padding:20px">'
    // Başlık
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      + '<div>'
        + '<div style="font-size:18px;font-weight:700;color:var(--t)">' + esc(c.name) + '</div>'
        + '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + (c.type === 'musteri' ? '🟢 Müşteri' : c.type === 'tedarikci' ? '🔵 Tedarikçi' : '⚪ Diğer') + (c.phone ? ' · ' + esc(c.phone) : '') + (c.email ? ' · ' + esc(c.email) : '') + '</div>'
        + (c.iban ? '<div style="font-size:10px;color:var(--t3);margin-top:2px;font-family:monospace">IBAN: ' + esc(c.iban) + '</div>' : '')
        + (c.address ? '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + esc(c.address) + '</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:6px">'
        + '<button class="btn btns" onclick="openCariStatement(' + c.id + ',\'user\')" style="font-size:11px">📊 Özet</button>'
        + ((c.cariType === 'potansiyel' || !c.cariType) ? '<button class="btn btns" onclick="window._upgradeCariToActive(' + c.id + ')" style="font-size:11px;color:#F59E0B">⬆ Aktif Yap</button>' : '')
        + (c.cariType === 'aktif' && _isManagerO() ? '<button class="btn btns" onclick="window._approveCariUpgrade(' + c.id + ')" style="font-size:11px;color:#16A34A">✓ Onayla</button>' : '')
        + (_isManagerO() ? '<button class="btn btns" onclick="window._assignCariReview(' + c.id + ')" style="font-size:11px;color:#6366F1">👁 İncelet</button>' : '')
        + '<button class="btn btns" onclick="window._openQuickCari?.(' + c.id + ')" style="font-size:11px">✏️</button>'
      + '</div>'
    + '</div>'
    // Onay durumu banner
    + (function() {
        if (c.status === 'pending_approval') {
          var createdByUser = (typeof loadUsers === 'function' ? loadUsers() : []).find(function(u) { return u.id === c.createdBy; });
          return '<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'
            + '<div>'
              + '<div style="font-size:13px;font-weight:700;color:#92400E">⏳ Onay Bekliyor</div>'
              + '<div style="font-size:11px;color:#B45309;margin-top:2px">Oluşturan: ' + (createdByUser ? esc(createdByUser.name) : '—') + ' · ' + (c.createdAt || '').slice(0, 16) + '</div>'
            + '</div>'
            + (_isManagerO()
              ? '<div style="display:flex;gap:8px">'
                + '<button onclick="window._approveCari(' + c.id + ')" class="btn btnp" style="background:#16A34A;border-color:#16A34A;font-size:12px;padding:6px 16px;border-radius:8px">✓ Onayla</button>'
                + '<button onclick="window._rejectCari(' + c.id + ')" class="btn" style="color:#DC2626;border-color:#DC2626;font-size:12px;padding:6px 16px;border-radius:8px">✗ Reddet</button>'
              + '</div>'
              : '')
          + '</div>';
        }
        if (c.status === 'rejected') {
          return '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 16px;margin-bottom:16px">'
            + '<div style="font-size:13px;font-weight:700;color:#991B1B">❌ Reddedildi</div>'
            + '<div style="font-size:11px;color:#B91C1C;margin-top:2px">Reddeden: ' + (c.rejectedBy || '—') + '</div>'
          + '</div>';
        }
        if (c.status === 'active' && c.approvedBy) {
          var approverUser = (typeof loadUsers === 'function' ? loadUsers() : []).find(function(u) { return u.id === c.approvedBy; });
          return '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:8px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px">'
            + '<span style="font-size:12px;color:#16A34A;font-weight:600">✅ Onaylandı</span>'
            + '<span style="font-size:10px;color:#15803D">' + (approverUser ? esc(approverUser.name) : '') + ' · ' + (c.approvedAt || '').slice(0, 16) + '</span>'
          + '</div>';
        }
        return '';
      })()
    // Bento
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">'
      + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Toplam Alacak</div><div style="font-size:18px;font-weight:700;color:#16A34A">₺' + Math.round(totalAlacak).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Toplam Borç</div><div style="font-size:18px;font-weight:700;color:#DC2626">₺' + Math.round(totalBorc).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Net Bakiye</div><div style="font-size:18px;font-weight:700;color:' + (netBakiye >= 0 ? '#16A34A' : '#DC2626') + '">' + (netBakiye >= 0 ? '+' : '') + '₺' + Math.abs(Math.round(netBakiye)).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">İşlem Sayısı</div><div style="font-size:18px;font-weight:700;color:var(--t)">' + hareketler.length + '</div></div>'
      + (_isManagerO() ? (function() {
          var rs = _calcAdvancedRiskScore(c.name);
          return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Risk Skoru</div><div style="font-size:18px;font-weight:700;color:' + rs.color + '">' + rs.score + '</div><div style="font-size:9px;color:' + rs.color + '">' + rs.label + '</div></div>';
        })() : '')
    + '</div>'
    // Cari Limit uyarısı — creditLimit (saveOdm ile aynı alan adı)
    + (function() {
        var cLimit = c.creditLimit || c.limitAmount || 0;
        if (!cLimit || cLimit <= 0) return '';
        var unpaidBorc = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) {
          return o.cariName === c.name && !o.paid && !o.isDeleted;
        }).reduce(function(sum, o) { return sum + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
        var pct = Math.round(unpaidBorc / cLimit * 100);
        var barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#16A34A';
        var isExceeded = pct >= 100;
        return '<div style="background:' + (isExceeded ? '#FEF2F2' : 'var(--sf)') + ';border:1px solid ' + (isExceeded ? '#FECACA' : 'var(--b)') + ';border-radius:10px;padding:10px 14px;margin-bottom:12px">'
          + '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-bottom:4px"><span>' + (isExceeded ? '🚨' : '📊') + ' Kredi Limiti</span><span style="font-weight:600;color:' + barColor + '">₺' + Math.round(unpaidBorc).toLocaleString('tr-TR') + ' / ₺' + Math.round(cLimit).toLocaleString('tr-TR') + ' (' + pct + '%)</span></div>'
          + '<div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, pct) + '%;background:' + barColor + ';border-radius:3px"></div></div>'
          + (isExceeded ? '<div style="font-size:10px;color:#EF4444;margin-top:4px;font-weight:600">🚨 Kredi limiti aşıldı! Yeni ödeme oluşturulamaz.</div>' : pct >= 80 ? '<div style="font-size:10px;color:#F59E0B;margin-top:4px;font-weight:600">⚠️ Kredi limiti aşılmak üzere!</div>' : '')
        + '</div>';
      })()
    // Format toggle + Hareket tablosu
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:16px">'
      + '<div style="padding:10px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
        + '<span style="font-size:12px;font-weight:600;color:var(--t)">Hareket Geçmişi</span>'
        + '<div style="display:flex;gap:4px">'
          + '<button onclick="window._cariFormat=1;_renderCariDetail(' + id + ')" class="btn btns" style="font-size:9px;padding:2px 6px;' + ((!window._cariFormat || window._cariFormat === 1) ? 'background:var(--ac);color:#fff' : '') + '">Detay</button>'
          + '<button onclick="window._cariFormat=2;_renderCariDetail(' + id + ')" class="btn btns" style="font-size:9px;padding:2px 6px;' + (window._cariFormat === 2 ? 'background:var(--ac);color:#fff' : '') + '">Kompakt</button>'
        + '</div>'
      + '</div>'
      + (function() {
          var fmt = window._cariFormat || 1;
          var rates = _odmGetRates();
          if (fmt === 1) {
            // Format 1: Tutar | Para Birimi | Kur | TL Tutar
            return '<div style="display:grid;grid-template-columns:80px 1fr 80px 60px 70px 80px 70px;padding:6px 14px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase"><div>Tarih</div><div>Açıklama</div><div style="text-align:right">Tutar</div><div>Döviz</div><div style="text-align:right">Kur</div><div style="text-align:right">TL Tutar</div><div style="text-align:right">Durum</div></div>'
              + (hareketler.length ? hareketler.slice(0, 30).map(function(h, i) {
                  var color = h.type === 'tahsilat' ? '#16A34A' : '#DC2626';
                  var sign = h.type === 'tahsilat' ? '+' : '-';
                  var cur = h.currency || 'TRY';
                  var kur = h.kurRate || rates[cur] || 1;
                  var tlAmt = cur === 'TRY' ? h.amount : Math.round((h.amount || 0) * kur);
                  return '<div style="display:grid;grid-template-columns:80px 1fr 80px 60px 70px 80px 70px;padding:5px 14px;border-bottom:1px solid var(--b);font-size:11px;background:' + (i % 2 ? 'var(--s2)' : 'var(--sf)') + '">'
                    + '<div style="color:var(--t3)">' + (h.date || '—').slice(0, 10) + '</div>'
                    + '<div style="color:var(--t)">' + esc(h.name || '—') + '</div>'
                    + '<div style="text-align:right;font-weight:600;color:' + color + '">' + sign + Number(h.amount || 0).toLocaleString('tr-TR') + '</div>'
                    + '<div style="color:var(--t3)">' + cur + '</div>'
                    + '<div style="text-align:right;color:var(--t3)">' + (cur !== 'TRY' ? kur : '—') + '</div>'
                    + '<div style="text-align:right;font-weight:600;color:' + color + '">' + sign + '₺' + tlAmt.toLocaleString('tr-TR') + '</div>'
                    + '<div style="text-align:right;font-size:10px;color:var(--t3)">' + h.status + '</div>'
                  + '</div>';
                }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3)">Hareket yok</div>');
          } else {
            // Format 2: Kompakt — Tutar Para Birimi
            return '<div style="display:grid;grid-template-columns:80px 1fr 100px 80px;padding:6px 14px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase"><div>Tarih</div><div>Açıklama</div><div style="text-align:right">Tutar</div><div style="text-align:right">Durum</div></div>'
              + (hareketler.length ? hareketler.slice(0, 30).map(function(h, i) {
                  var color = h.type === 'tahsilat' ? '#16A34A' : '#DC2626';
                  var sign = h.type === 'tahsilat' ? '+' : '-';
                  return '<div style="display:grid;grid-template-columns:80px 1fr 100px 80px;padding:5px 14px;border-bottom:1px solid var(--b);font-size:11px;background:' + (i % 2 ? 'var(--s2)' : 'var(--sf)') + '">'
                    + '<div style="color:var(--t3)">' + (h.date || '—').slice(0, 10) + '</div>'
                    + '<div style="color:var(--t)">' + esc(h.name || '—') + '</div>'
                    + '<div style="text-align:right;font-weight:600;color:' + color + '">' + sign + '₺' + Number(h.amount || 0).toLocaleString('tr-TR') + '</div>'
                    + '<div style="text-align:right;font-size:10px;color:var(--t3)">' + h.status + '</div>'
                  + '</div>';
                }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3)">Hareket yok</div>');
          }
        })()
    + '</div>'
  + '</div>';
}

/**
 * Cari Excel export.
 */
window._exportCariXlsx = function() {
  if (!_cariSelectedId) { window.toast?.('Cari seçin', 'err'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  var c = loadCari().find(function(x) { return x.id === _cariSelectedId; });
  if (!c) return;
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var cOdm = odm.filter(function(o) { return o.cariId === c.id || (o.note || '').toLowerCase().includes(c.name.toLowerCase()); });
  var cTah = tah.filter(function(t) { return t.cariId === c.id || (t.from || '').toLowerCase().includes(c.name.toLowerCase()); });
  var rows = [['Tarih', 'Tip', 'Açıklama', 'Tutar', 'Durum']];
  cOdm.forEach(function(o) { rows.push([o.due || '', 'Ödeme', o.name, -(o.amount || 0), o.paid ? 'Ödendi' : 'Bekliyor']); });
  cTah.forEach(function(t) { rows.push([t.due || '', 'Tahsilat', t.name, t.amount || 0, t.collected ? 'Tahsil' : 'Bekliyor']); });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:10},{wch:30},{wch:14},{wch:10}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cari Ekstre');
  XLSX.writeFile(wb, 'Cari_' + c.name.replace(/[^a-zA-Z0-9]/g, '_') + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

/**
 * Cari PDF rapor (print-friendly).
 */
window._exportCariPDF = function() {
  if (!_cariSelectedId) { window.toast?.('Cari seçin', 'err'); return; }
  var c = loadCari().find(function(x) { return x.id === _cariSelectedId; });
  if (!c) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var odm = typeof loadOdm === 'function' ? loadOdm() : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var cOdm = odm.filter(function(o) { return o.cariId === c.id || (o.note || '').toLowerCase().includes(c.name.toLowerCase()); });
  var cTah = tah.filter(function(t) { return t.cariId === c.id || (t.from || '').toLowerCase().includes(c.name.toLowerCase()); });
  var totalB = cOdm.reduce(function(a, o) { return a + (parseFloat(o.amount) || 0); }, 0);
  var totalA = cTah.reduce(function(a, t) { return a + (parseFloat(t.amount) || 0); }, 0);

  var w = window.open('', '_blank', 'width=700,height=900');
  w.document.write('<!DOCTYPE html><html><head><title>Cari Ekstre — ' + esc(c.name) + '</title>'
    + '<style>body{font-family:Segoe UI,sans-serif;padding:40px;color:#1a1a2e;max-width:650px;margin:0 auto}'
    + '.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:12px}'
    + '@media print{button{display:none!important}}</style></head><body>'
    + '<div style="border-bottom:3px solid #6366F1;padding-bottom:16px;margin-bottom:20px">'
      + '<div style="font-size:20px;font-weight:700">Duay Global LLC</div>'
      + '<div style="font-size:12px;color:#6b7280">Cari Hesap Ekstresi · ' + new Date().toLocaleDateString('tr-TR') + '</div>'
    + '</div>'
    + '<div style="font-size:16px;font-weight:700;margin-bottom:12px">' + esc(c.name) + '</div>'
    + '<div class="row"><span style="color:#6b7280">Toplam Alacak</span><span style="color:#16A34A;font-weight:700">₺' + Math.round(totalA).toLocaleString('tr-TR') + '</span></div>'
    + '<div class="row"><span style="color:#6b7280">Toplam Borç</span><span style="color:#DC2626;font-weight:700">₺' + Math.round(totalB).toLocaleString('tr-TR') + '</span></div>'
    + '<div class="row"><span style="color:#6b7280">Net Bakiye</span><span style="font-weight:700">₺' + Math.round(totalA - totalB).toLocaleString('tr-TR') + '</span></div>'
    + '<div style="margin-top:20px"><button onclick="window.print()" style="padding:8px 20px;background:#6366F1;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨 Yazdır</button></div>'
    + '</body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// TEKRARLAYAN ŞABLON
// ════════════════════════════════════════════════════════════════

var ODM_TPL_KEY = 'ak_odm_templates1';

function _loadOdmTemplates() { try { return JSON.parse(localStorage.getItem(ODM_TPL_KEY) || '[]'); } catch(e) { return []; } }
function _storeOdmTemplates(d) { localStorage.setItem(ODM_TPL_KEY, JSON.stringify(d)); }

/**
 * Mevcut ödemeyi şablon olarak kaydeder.
 */
window._odmSaveAsTemplate = function(id) {
  var d = typeof loadOdm === 'function' ? loadOdm() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var tpls = _loadOdmTemplates();
  tpls.unshift({
    id: generateNumericId(), name: o.name, cat: o.cat, freq: o.freq || 'aylik',
    amount: o.amount, currency: o.currency || 'TRY', note: o.note || '',
    alarmDays: o.alarmDays || 3, createdAt: _nowTso(),
  });
  _storeOdmTemplates(tpls);
  window.toast?.('Şablon kaydedildi: ' + o.name, 'ok');
};

/**
 * Ay başında şablonlardan otomatik pending ödeme oluşturur.
 */
function checkRecurringTemplates() {
  var lastCheck = localStorage.getItem('ak_odm_tpl_check') || '';
  var thisMonth = new Date().toISOString().slice(0, 7);
  if (lastCheck === thisMonth) return;
  localStorage.setItem('ak_odm_tpl_check', thisMonth);

  var tpls = _loadOdmTemplates();
  if (!tpls.length) return;
  var d = typeof loadOdm === 'function' ? loadOdm() : [];
  var added = 0;

  tpls.forEach(function(t) {
    // Bu ay zaten oluşturulmuş mı?
    var exists = d.find(function(o) { return o.templateId === t.id && (o.due || '').startsWith(thisMonth); });
    if (exists) return;
    var dueDay = 15; // ay ortası varsayılan
    var due = thisMonth + '-' + String(dueDay).padStart(2, '0');
    d.unshift({
      id: generateNumericId(), name: t.name, cat: t.cat, freq: t.freq,
      amount: t.amount, currency: t.currency || 'TRY', due: due,
      note: 'Şablondan otomatik: ' + t.name, paid: false, alarmDays: t.alarmDays || 3,
      ts: _nowTso(), createdBy: null, source: 'template', templateId: t.id,
      approvalStatus: 'pending',
    });
    added++;
  });

  if (added) {
    window.storeOdm ? storeOdm(d) : null;
    window.addNotif?.('🔁', added + ' tekrarlayan ödeme oluşturuldu', 'info', 'odemeler');
  }
}
// Sayfa açılışında çalıştır
setTimeout(checkRecurringTemplates, 3000);

// ════════════════════════════════════════════════════════════════
// TOPLU ONAY
// ════════════════════════════════════════════════════════════════

/**
 * Seçili pending ödemeleri toplu onaylar.
 */
window._odmBulkApprove = function() {
  if (!_isAdminO()) { window.toast?.('Yetki yok', 'err'); return; }
  var checked = document.querySelectorAll('.odm-bulk-chk:checked');
  if (!checked.length) { window.toast?.('Onaylanacak kayıt seçin', 'err'); return; }
  var ids = [];
  checked.forEach(function(cb) { ids.push(parseInt(cb.dataset.oid)); });
  var d = typeof loadOdm === 'function' ? loadOdm() : [];
  var count = 0;
  ids.forEach(function(id) {
    var o = d.find(function(x) { return x.id === id; });
    if (o && o.approvalStatus === 'pending') {
      o.approvalStatus = 'approved';
      o.approved = true;
      o.approvedBy = _CUo()?.id;
      o.approvedAt = _nowTso();
      count++;
    }
  });
  if (count) {
    window.storeOdm ? storeOdm(d) : null;
    renderOdemeler();
    window.toast?.('✅ ' + count + ' kayıt onaylandı', 'ok');
    window.logActivity?.('view', 'Toplu onay: ' + count + ' ödeme');
  }
};

// ════════════════════════════════════════════════════════════════
// HIZLI BAKIŞ (Quick View Accordion) — Nakit Akışı
// ════════════════════════════════════════════════════════════════

/**
 * Ödeme satırının altında accordion hızlı bakış aç/kapat.
 */
window._odmToggleQuickView = function(id) {
  var existing = document.getElementById('odm-qv-' + id);
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('[id^="odm-qv-"]').forEach(function(el) { el.remove(); });

  var d = window.loadOdm ? loadOdm() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var cat = ODM_CATS[o.cat] || ODM_CATS.diger;
  var curSym = o.currency === 'USD' ? '$' : o.currency === 'EUR' ? '€' : '₺';
  var rates = _odmGetRates();
  var kurRate = o.kurRate || rates[o.currency] || 1;
  var tlAmt = o.currency && o.currency !== 'TRY' ? Math.round((parseFloat(o.amount) || 0) * kurRate) : null;

  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var assigned = users.find(function(u) { return u.id === o.assignedTo; });

  var qv = document.createElement('div');
  qv.id = 'odm-qv-' + id;
  qv.style.cssText = 'padding:12px 20px;background:var(--s2);border-bottom:2px solid var(--ac);animation:pus-row-in .15s ease';

  qv.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:11px">'
    // Sol: Tutar + TL
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Finansal</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Tutar:</span> <b style="font-size:14px;color:var(--t)">' + curSym + Number(o.amount || 0).toLocaleString('tr-TR') + '</b></div>'
      + (tlAmt ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">TL Karşılığı:</span> <b>₺' + tlAmt.toLocaleString('tr-TR') + '</b> <span style="font-size:9px;color:var(--t3)">(fatura kur: ' + kurRate + ')</span></div>' : '')
      + (function() {
          // Kur farkı hesaplama — fatura kuru vs güncel kur
          if (!o.currency || o.currency === 'TRY') return '';
          var currentRate = rates[o.currency] || 1;
          var faturRate = o.kurRate || currentRate;
          var diff = currentRate - faturRate;
          var diffTL = Math.round(diff * (parseFloat(o.amount) || 0));
          if (Math.abs(diff) < 0.01) return '';
          var diffColor = diffTL >= 0 ? '#DC2626' : '#16A34A'; // artış = zarar (ödeme), azalış = kazanç
          return '<div style="margin-bottom:4px"><span style="color:var(--t3)">Kur Farkı:</span> <span style="color:' + diffColor + ';font-weight:600">' + (diffTL >= 0 ? '+' : '') + '₺' + diffTL.toLocaleString('tr-TR') + '</span> <span style="font-size:9px;color:var(--t3)">(güncel: ' + currentRate.toFixed(2) + ')</span></div>';
        })()
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Kategori:</span> ' + cat.ic + ' ' + cat.l + '</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Sıklık:</span> ' + (ODM_FREQ[o.freq] || o.freq || '—') + '</div>'
    + '</div>'
    // Orta: Cari + Vade
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Detay</div>'
      + (o.cariName ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Cari:</span> <b>' + esc(o.cariName) + '</b></div>' : '')
      + (assigned ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Sorumlu:</span> ' + esc(assigned.name) + '</div>' : '')
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Vade:</span> ' + (o.due || '—') + '</div>'
      + (o.docNo ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Doküman No:</span> ' + esc(o.docNo) + '</div>' : '')
      + (o.yontem ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Yöntem:</span> ' + esc(o.yontem) + '</div>' : '')
      + (o.note ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Not:</span> ' + esc(o.note) + '</div>' : '')
    + '</div>'
    // Sağ: Onay
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Onay Durumu</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Durum:</span> ' + (o.approvalStatus || 'bekliyor') + '</div>'
      + (o.approvedAt ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Onay:</span> ' + o.approvedAt + '</div>' : '')
      + (o.paid ? '<div style="margin-bottom:4px;color:#16A34A">✅ Ödendi' + (o.paidTs ? ' — ' + o.paidTs : '') + '</div>' : '')
      + (o.receipt ? '<div style="margin-bottom:4px">📎 Dekont mevcut</div>' : '')
    + '</div>'
  + '</div>';

  var row = document.querySelector('[data-oid="' + id + '"]');
  if (row && row.nextSibling) row.parentNode.insertBefore(qv, row.nextSibling);
  else if (row) row.parentNode.appendChild(qv);
};

// ════════════════════════════════════════════════════════════════
// TAHSİLAT SİLME — Soft Delete (K06)
// ════════════════════════════════════════════════════════════════

/**
 * Tahsilat soft delete — yetki kontrolü + confirmModal.
 */
function delTahsilat(id) {
  var d = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var cu = _CUo();
  var canDel = false;
  if (_isAdminO()) {
    canDel = true;
  } else if ((o.approvalStatus === 'pending' || !o.approvalStatus) && o.createdBy === cu?.id) {
    canDel = true;
  }
  if (!canDel) {
    window.toast?.('Onaylanmış kayıtlar yönetici izni olmadan silinemez', 'err');
    return;
  }
  window.confirmModal('Bu tahsilatı silmek istediğinizden emin misiniz?\n\n"' + (o.name || '') + '"', {
    title: 'Tahsilat Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: function() {
      o.isDeleted = true;
      o.deletedAt = _nowTso();
      o.deletedBy = cu?.id;
      o.deletedReason = 'user_delete';
      if (typeof storeTahsilat === 'function') storeTahsilat(d);
      renderOdemeler();
      window.logActivity?.('view', 'Tahsilat silindi (soft): ' + (o.name || ''));
      window.toast?.('Silindi — 30 gün içinde geri alınabilir', 'ok');
    }
  });
}
window.delTahsilat = delTahsilat;

// ════════════════════════════════════════════════════════════════
// TAHSİLAT HIZLI BAKIŞ (Quick View Accordion)
// ════════════════════════════════════════════════════════════════

window._tahToggleQuickView = function(id) {
  var existing = document.getElementById('tah-qv-' + id);
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('[id^="tah-qv-"]').forEach(function(el) { el.remove(); });

  var d = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var o = d.find(function(x) { return x.id === id; });
  if (!o) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var rates = _odmGetRates();
  var kurRate = o.kurRate || rates[o.currency] || 1;
  var curSym = o.currency === 'USD' ? '$' : o.currency === 'EUR' ? '€' : '₺';
  var tlAmt = o.currency && o.currency !== 'TRY' ? Math.round((parseFloat(o.amount) || 0) * kurRate) : null;
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var assigned = users.find(function(u) { return u.id === o.assignedTo; });

  var qv = document.createElement('div');
  qv.id = 'tah-qv-' + id;
  qv.style.cssText = 'padding:12px 20px;background:var(--s2);border-bottom:2px solid #0F6E56;animation:pus-row-in .15s ease';

  qv.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:11px">'
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Finansal</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Tutar:</span> <b style="font-size:14px;color:#0F6E56">' + curSym + Number(o.amount || 0).toLocaleString('tr-TR') + '</b></div>'
      + (tlAmt ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">TL Karşılığı:</span> <b>₺' + tlAmt.toLocaleString('tr-TR') + '</b> <span style="font-size:9px;color:var(--t3)">(kur: ' + kurRate + ')</span></div>' : '')
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Tür:</span> ' + (o.type || '—') + '</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Yöntem:</span> ' + (o.yontem || '—') + '</div>'
    + '</div>'
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Detay</div>'
      + (assigned ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Sorumlu:</span> ' + esc(assigned.name) + '</div>' : '')
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Vade:</span> ' + (o.due || '—') + '</div>'
      + (o.cariName ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Cari:</span> ' + esc(o.cariName) + '</div>' : '')
      + (o.ref ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Referans No:</span> ' + esc(o.ref) + '</div>' : '')
      + (o.note ? '<div style="margin-bottom:4px"><span style="color:var(--t3)">Not:</span> ' + esc(o.note) + '</div>' : '')
    + '</div>'
    + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Durum</div>'
      + '<div style="margin-bottom:4px"><span style="color:var(--t3)">Onay:</span> ' + (o.approvalStatus || 'bekliyor') + '</div>'
      + (o.collected ? '<div style="margin-bottom:4px;color:#16A34A">✅ Tahsil edildi' + (o.collectedTs ? ' — ' + o.collectedTs : '') + '</div>' : '')
      + (o.docs && o.docs.length ? '<div style="margin-bottom:4px">📎 ' + o.docs.length + ' dosya</div>' : '')
      + '<div style="margin-top:6px;display:flex;gap:4px">'
        + '<button onclick="openTahsilatModal(' + id + ')" class="btn btns" style="font-size:10px;padding:3px 8px;border-radius:6px">✏️ Düzenle</button>'
        + '<button onclick="delTahsilat(' + id + ')" class="btn btns" style="font-size:10px;padding:3px 8px;border-radius:6px;color:#DC2626">🗑 Sil</button>'
      + '</div>'
    + '</div>'
  + '</div>';

  var row = document.querySelector('[data-tid="' + id + '"]');
  if (row && row.nextSibling) row.parentNode.insertBefore(qv, row.nextSibling);
  else if (row) row.parentNode.appendChild(qv);
};

// ════════════════════════════════════════════════════════════════
// TAHSİLAT EXCEL EXPORT
// ════════════════════════════════════════════════════════════════

function exportTahsilatXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var items = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var today = _todayStr();

  var rows = [['ID','Müşteri/Kaynak','Tür','Referans No','Tutar','Para Birimi','TL Karşılığı','Kur','Vade Tarihi','Durum','Yöntem','Banka','Cari','Sorumlu','Not','Oluşturan','Tarih']];
  items.filter(function(t) { return !t.isDeleted; }).forEach(function(t) {
    var user = users.find(function(u) { return u.id === t.assignedTo; });
    var creator = users.find(function(u) { return u.id === t.createdBy; });
    var status = t.collected ? 'Tahsil Edildi' : (t.due && t.due < today ? 'Gecikti' : 'Bekliyor');
    rows.push([
      t.id, t.name || '', t.type || '', t.ref || '',
      parseFloat(t.amount) || 0, t.currency || 'TRY',
      parseFloat(t.amountTRY) || parseFloat(t.amount) || 0,
      t.kurRate || 1, t.due || '',
      status, t.yontem || '', t.banka || '', t.cariName || '',
      user?.name || '—', t.note || '',
      creator?.name || '—', t.ts || ''
    ]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:10},{wch:25},{wch:15},{wch:15},{wch:12},{wch:8},{wch:12},{wch:8},{wch:12},{wch:12},{wch:12},{wch:15},{wch:20},{wch:15},{wch:25},{wch:15},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws, 'Tahsilatlar');
  XLSX.writeFile(wb, 'tahsilatlar-' + _todayStr() + '.xlsx');
  window.toast?.('Tahsilat Excel indirildi ✓', 'ok');
}
window.exportTahsilatXlsx = exportTahsilatXlsx;

// ════════════════════════════════════════════════════════════════
// ÇÖP KUTUSU PANELİ — Admin/Manager
// ════════════════════════════════════════════════════════════════

function openOdmTrashPanel() {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var ex = document.getElementById('mo-odm-trash');
  if (ex) { ex.remove(); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  var odmTrash = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return o.isDeleted; });
  var tahTrash = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return t.isDeleted; });
  var users = typeof loadUsers === 'function' ? loadUsers() : [];

  function _trashRow(item, type) {
    var delBy = users.find(function(u) { return u.id === item.deletedBy; });
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--b)">'
      + '<span style="font-size:14px">' + (type === 'odeme' ? '💸' : '💰') + '</span>'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;font-weight:600;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(item.name || '—') + '</div>'
        + '<div style="font-size:10px;color:var(--t3)">' + (type === 'odeme' ? 'Ödeme' : 'Tahsilat') + ' · Silen: ' + (delBy?.name || '—') + ' · ' + (item.deletedAt || '').slice(0, 16) + '</div>'
      + '</div>'
      + '<div style="font-size:12px;font-weight:600;color:var(--t)">₺' + Number(item.amount || 0).toLocaleString('tr-TR') + '</div>'
      + '<button onclick="_restoreTrashItem(' + item.id + ',\'' + type + '\')" class="btn btns" style="font-size:10px;padding:3px 8px;border-radius:6px;color:#16A34A">↩ Geri Yükle</button>'
      + (_isAdminO() ? '<button onclick="_permanentDeleteItem(' + item.id + ',\'' + type + '\')" class="btn btns" style="font-size:10px;padding:3px 8px;border-radius:6px;color:#DC2626">✕ Kalıcı Sil</button>' : '')
    + '</div>';
  }

  var allTrash = odmTrash.map(function(o) { return _trashRow(o, 'odeme'); }).concat(tahTrash.map(function(t) { return _trashRow(t, 'tahsilat'); }));
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-trash'; ;
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="padding:16px 22px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">🗑 Çöp Kutusu (' + allTrash.length + ')</div>'
    + '<button onclick="document.getElementById(\'mo-odm-trash\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="max-height:60vh;overflow-y:auto">'
    + (allTrash.length ? allTrash.join('') : '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px;margin-bottom:8px">🗑</div><div>Çöp kutusu boş</div></div>')
    + '</div>'
    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-trash\')?.remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

function _restoreTrashItem(id, type) {
  if (type === 'odeme') {
    var d = typeof loadOdm === 'function' ? loadOdm() : [];
    var o = d.find(function(x) { return x.id === id; });
    if (o) { o.isDeleted = false; delete o.deletedAt; delete o.deletedBy; delete o.deletedReason; o.restoredAt = _nowTso(); o.restoredBy = _CUo()?.id; }
    if (typeof storeOdm === 'function') storeOdm(d);
  } else {
    var d2 = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
    var t = d2.find(function(x) { return x.id === id; });
    if (t) { t.isDeleted = false; delete t.deletedAt; delete t.deletedBy; delete t.deletedReason; t.restoredAt = _nowTso(); t.restoredBy = _CUo()?.id; }
    if (typeof storeTahsilat === 'function') storeTahsilat(d2);
  }
  window.toast?.('Kayıt geri yüklendi ✓', 'ok');
  window.logActivity?.('view', (type === 'odeme' ? 'Ödeme' : 'Tahsilat') + ' geri yüklendi: ' + id);
  renderOdemeler();
  openOdmTrashPanel();
}

function _permanentDeleteItem(id, type) {
  if (!_isAdminO()) { window.toast?.('Kalıcı silme sadece admin yetkisiyle yapılabilir', 'err'); return; }
  window.confirmModal('Bu kayıt kalıcı olarak silinecek ve geri alınamaz!', {
    title: 'Kalıcı Sil',
    danger: true,
    confirmText: 'Kalıcı Sil',
    onConfirm: function() {
      if (type === 'odeme') {
        var d = typeof loadOdm === 'function' ? loadOdm() : [];
        if (typeof storeOdm === 'function') storeOdm(d.filter(function(x) { return x.id !== id; }));
      } else {
        var d2 = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
        if (typeof storeTahsilat === 'function') storeTahsilat(d2.filter(function(x) { return x.id !== id; }));
      }
      window.toast?.('Kalıcı olarak silindi', 'ok');
      window.logActivity?.('view', 'Kalıcı silme: ' + type + ' #' + id);
      openOdmTrashPanel();
    }
  });
}

window.openOdmTrashPanel = openOdmTrashPanel;
window._restoreTrashItem = _restoreTrashItem;
window._permanentDeleteItem = _permanentDeleteItem;

// ════════════════════════════════════════════════════════════════
// CARİ HESAP ÖZETİ — 3 FORMAT (Bankacılık Standardı)
// ════════════════════════════════════════════════════════════════

/**
 * Bir carinin tüm hareketlerini toplar ve kümülatif bakiye hesaplar.
 * @param {number} cariId
 * @param {Object} [opts]  { from, to, currency }
 * @returns {Object} { cari, hareketler[], toplamBorc, toplamAlacak, netBakiye, bakiyeByCur }
 */
function _buildCariStatement(cariId, opts) {
  opts = opts || {};
  var cariAll = typeof loadCari === 'function' ? loadCari() : [];
  var c = cariAll.find(function(x) { return x.id === cariId; });
  if (!c) return null;
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && (o.cariName === c.name || o.cariId === cariId); });
  var tah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted && (t.cariName === c.name || t.cariId === cariId); });
  var users = typeof loadUsers === 'function' ? loadUsers() : [];

  // Hareketleri birleştir
  var hareketler = [];
  odm.forEach(function(o) {
    hareketler.push({
      id: o.id, type: 'odeme', date: o.due || o.ts || '', name: o.name || '', amount: parseFloat(o.amount) || 0,
      currency: o.currency || 'TRY', amountTRY: parseFloat(o.amountTRY || o.amount) || 0, kurRate: o.kurRate || 1,
      status: o.paid ? 'Ödendi' : 'Bekliyor', docNo: o.docNo || '', yontem: o.yontem || '',
      approvalStatus: o.approvalStatus || '', approvedBy: o.approvedBy, approvedAt: o.approvedAt,
      createdBy: o.createdBy, updatedBy: o.updatedBy, ts: o.ts, changeHistory: o.changeHistory || [],
      assignedTo: o.assignedTo, paid: !!o.paid, collected: false
    });
  });
  tah.forEach(function(t) {
    hareketler.push({
      id: t.id, type: 'tahsilat', date: t.due || t.ts || '', name: t.name || '', amount: parseFloat(t.amount) || 0,
      currency: t.currency || 'TRY', amountTRY: parseFloat(t.amountTRY || t.amount) || 0, kurRate: t.kurRate || 1,
      status: t.collected ? 'Tahsil Edildi' : 'Bekliyor', docNo: t.ref || '', yontem: t.yontem || '',
      approvalStatus: t.approvalStatus || '', approvedBy: t.approvedBy, approvedAt: t.approvedAt,
      createdBy: t.createdBy, updatedBy: t.updatedBy, ts: t.ts, changeHistory: t.changeHistory || [],
      assignedTo: t.assignedTo, paid: false, collected: !!t.collected
    });
  });

  // Filtreler
  if (opts.from) hareketler = hareketler.filter(function(h) { return h.date >= opts.from; });
  if (opts.to)   hareketler = hareketler.filter(function(h) { return h.date <= opts.to; });
  if (opts.currency) hareketler = hareketler.filter(function(h) { return h.currency === opts.currency; });

  // Tarihe göre sırala (eski → yeni)
  hareketler.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

  // Kümülatif bakiye hesapla (para birimine göre ayrı)
  var bakiyeByCur = {};
  var toplamBorc = 0, toplamAlacak = 0;
  hareketler.forEach(function(h) {
    if (!bakiyeByCur[h.currency]) bakiyeByCur[h.currency] = 0;
    if (h.type === 'tahsilat') {
      bakiyeByCur[h.currency] += h.amount;
      toplamAlacak += h.amountTRY;
    } else {
      bakiyeByCur[h.currency] -= h.amount;
      toplamBorc += h.amountTRY;
    }
    h.bakiye = bakiyeByCur[h.currency];
    h.bakiyeLabel = (h.bakiye >= 0 ? '+' : '') + h.bakiye.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  });

  return {
    cari: c, hareketler: hareketler,
    toplamBorc: toplamBorc, toplamAlacak: toplamAlacak, netBakiye: toplamAlacak - toplamBorc,
    bakiyeByCur: bakiyeByCur, users: users
  };
}

/**
 * Cari hesap özeti modal — 3 format: musteri, user, admin.
 * @param {number} cariId
 * @param {string} [format='user']  'musteri' | 'user' | 'admin'
 */
function openCariStatement(cariId, format) {
  format = format || 'user';
  var st = _buildCariStatement(cariId);
  if (!st) { window.toast?.('Cari bulunamadı', 'err'); return; }
  var c = st.cari;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var today = _todayStr();

  var ex = document.getElementById('mo-cari-stmt');
  if (ex) ex.remove();

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-cari-stmt'; ;

  // Başlık
  var formatLabel = format === 'musteri' ? 'Müşteri Özeti' : format === 'admin' ? 'Yönetici Raporu' : 'Operasyonel Özet';
  var headerColor = format === 'musteri' ? '#1e40af' : format === 'admin' ? '#7c2d12' : '#0F6E56';

  // Tablo satırları
  var rowsHTML = '';
  st.hareketler.forEach(function(h, i) {
    var isLate = !h.paid && !h.collected && h.date && h.date < today;
    var isNear = !h.paid && !h.collected && h.date && h.date >= today && h.date <= new Date(new Date().getTime() + 7*86400000).toISOString().slice(0,10);
    var rowBg = isLate ? '#FEF2F2' : isNear ? '#FFFBEB' : (i % 2 ? 'var(--s2)' : 'var(--sf)');
    var borc = h.type === 'odeme' ? h.amount.toLocaleString('tr-TR', {minimumFractionDigits:2}) : '';
    var alacak = h.type === 'tahsilat' ? h.amount.toLocaleString('tr-TR', {minimumFractionDigits:2}) : '';
    var bakiyeColor = h.bakiye >= 0 ? '#16A34A' : '#DC2626';

    rowsHTML += '<tr style="background:' + rowBg + ';border-bottom:1px solid var(--b)">';
    rowsHTML += '<td style="padding:5px 8px;font-size:11px;color:' + (isLate ? '#DC2626' : 'var(--t3)') + '">' + (h.date || '—').slice(0, 10) + '</td>';
    rowsHTML += '<td style="padding:5px 8px;font-size:11px;color:var(--t)">' + esc(h.name) + '</td>';
    // Format user/admin ekstra sütunlar
    if (format !== 'musteri') {
      rowsHTML += '<td style="padding:5px 8px;font-size:10px;color:var(--t3)">' + esc(h.docNo) + '</td>';
    }
    rowsHTML += '<td style="padding:5px 8px;font-size:11px;color:#DC2626;text-align:right;font-weight:600">' + (borc ? borc + ' ' + h.currency : '') + '</td>';
    rowsHTML += '<td style="padding:5px 8px;font-size:11px;color:#16A34A;text-align:right;font-weight:600">' + (alacak ? alacak + ' ' + h.currency : '') + '</td>';
    rowsHTML += '<td style="padding:5px 8px;font-size:11px;color:' + bakiyeColor + ';text-align:right;font-weight:700">' + h.bakiyeLabel + ' ' + h.currency + '</td>';
    if (format !== 'musteri') {
      var statusColor = h.paid || h.collected ? '#16A34A' : isLate ? '#DC2626' : '#F59E0B';
      rowsHTML += '<td style="padding:5px 8px"><span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + statusColor + '22;color:' + statusColor + ';font-weight:600">' + h.status + '</span></td>';
    }
    // Admin ekstra sütunlar
    if (format === 'admin') {
      var creator = st.users.find(function(u) { return u.id === h.createdBy; });
      var approver = st.users.find(function(u) { return u.id === h.approvedBy; });
      rowsHTML += '<td style="padding:5px 8px;font-size:10px;color:var(--t3)">' + (creator?.name || '—') + '</td>';
      rowsHTML += '<td style="padding:5px 8px;font-size:10px;color:var(--t3)">' + (approver?.name ? approver.name + ' (' + (h.approvedAt || '').slice(0,10) + ')' : '—') + '</td>';
      rowsHTML += '<td style="padding:5px 8px;font-size:10px;color:var(--t3)">' + (h.changeHistory.length || 0) + '</td>';
    }
    rowsHTML += '</tr>';
  });

  // Tablo başlıkları
  var thStyle = 'padding:6px 8px;font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;text-align:left;border-bottom:2px solid var(--b)';
  var thHTML = '<tr><th style="' + thStyle + '">Tarih</th><th style="' + thStyle + '">Açıklama</th>';
  if (format !== 'musteri') thHTML += '<th style="' + thStyle + '">Döküman</th>';
  thHTML += '<th style="' + thStyle + ';text-align:right">Borç</th><th style="' + thStyle + ';text-align:right">Alacak</th><th style="' + thStyle + ';text-align:right">Bakiye</th>';
  if (format !== 'musteri') thHTML += '<th style="' + thStyle + '">Durum</th>';
  if (format === 'admin') thHTML += '<th style="' + thStyle + '">Oluşturan</th><th style="' + thStyle + '">Onaylayan</th><th style="' + thStyle + '">Değişiklik</th>';
  thHTML += '</tr>';

  // Limit bar (user+admin)
  var limitHTML = '';
  if (format !== 'musteri') {
    var cLimit = c.creditLimit || c.limitAmount || 0;
    if (cLimit > 0) {
      var pct = Math.round(st.toplamBorc / cLimit * 100);
      var barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#16A34A';
      limitHTML = '<div style="margin-bottom:12px;padding:8px 12px;background:var(--s2);border-radius:8px">'
        + '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-bottom:4px"><span>Kredi Limiti</span><span style="font-weight:600;color:' + barColor + '">₺' + Math.round(st.toplamBorc).toLocaleString('tr-TR') + ' / ₺' + cLimit.toLocaleString('tr-TR') + ' (' + pct + '%)</span></div>'
        + '<div style="height:5px;background:var(--b);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, pct) + '%;background:' + barColor + '"></div></div>'
        + '</div>';
    }
  }

  // Admin: para birimi pozisyon tablosu
  var posHTML = '';
  if (format === 'admin' && Object.keys(st.bakiyeByCur).length) {
    posHTML = '<div style="margin-top:12px;padding:10px 14px;background:var(--s2);border-radius:8px">'
      + '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Net Pozisyon (Para Birimi Bazlı)</div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    Object.entries(st.bakiyeByCur).forEach(function(e) {
      var color = e[1] >= 0 ? '#16A34A' : '#DC2626';
      posHTML += '<div style="padding:6px 12px;border-radius:6px;background:' + color + '11;border:1px solid ' + color + '33"><span style="font-size:10px;color:var(--t3)">' + e[0] + '</span> <span style="font-size:14px;font-weight:700;color:' + color + '">' + (e[1] >= 0 ? '+' : '') + e[1].toLocaleString('tr-TR', {minimumFractionDigits:2}) + '</span></div>';
    });
    posHTML += '</div></div>';
  }

  // Admin: değişiklik geçmişi
  var auditHTML = '';
  if (format === 'admin') {
    var allChanges = [];
    st.hareketler.forEach(function(h) {
      if (h.changeHistory && h.changeHistory.length) {
        h.changeHistory.forEach(function(ch) {
          allChanges.push({ ts: ch.ts, by: ch.by, changes: ch.changes, itemName: h.name });
        });
      }
    });
    if (allChanges.length) {
      allChanges.sort(function(a, b) { return (b.ts || '').localeCompare(a.ts || ''); });
      auditHTML = '<div style="margin-top:12px;padding:10px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px">'
        + '<div style="font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;margin-bottom:6px">Değişiklik Geçmişi (' + allChanges.length + ')</div>';
      allChanges.slice(0, 10).forEach(function(ch) {
        var byUser = st.users.find(function(u) { return u.id === ch.by; });
        auditHTML += '<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #FED7AA;color:#78350F">'
          + '<b>' + (ch.ts || '').slice(0, 16) + '</b> · ' + (byUser?.name || '—') + ' · <i>' + esc(ch.itemName || '') + '</i> → ' + ch.changes.join(', ')
          + '</div>';
      });
      auditHTML += '</div>';
    }
  }

  mo.innerHTML = '<div class="moc" style="max-width:900px;padding:0;border-radius:16px;overflow:hidden">'
    // Başlık
    + '<div style="background:' + headerColor + ';padding:18px 24px;color:#fff;display:flex;align-items:center;justify-content:space-between" id="cari-stmt-header">'
    + '<div>'
      + '<div style="font-size:16px;font-weight:700">DUAY GLOBAL TRADE LLC</div>'
      + '<div style="font-size:11px;opacity:.7;margin-top:2px">' + formatLabel + ' — ' + esc(c.name) + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
      + '<button onclick="_exportCariStmtXlsx(' + cariId + ',\'' + format + '\')" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px">⬇ Excel</button>'
      + '<button onclick="_printCariStmt()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px">🖨 Yazdır</button>'
      + '<button onclick="document.getElementById(\'mo-cari-stmt\')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:18px">×</button>'
    + '</div></div>'
    // Bilgi kartları
    + '<div style="padding:16px 24px;display:flex;gap:12px;border-bottom:1px solid var(--b);flex-wrap:wrap">'
      + '<div style="flex:1;min-width:120px;padding:10px;background:var(--sf);border:1px solid var(--b);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Toplam Borç</div><div style="font-size:18px;font-weight:700;color:#DC2626">₺' + Math.round(st.toplamBorc).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="flex:1;min-width:120px;padding:10px;background:var(--sf);border:1px solid var(--b);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Toplam Alacak</div><div style="font-size:18px;font-weight:700;color:#16A34A">₺' + Math.round(st.toplamAlacak).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="flex:1;min-width:120px;padding:10px;background:var(--sf);border:1px solid var(--b);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Net Bakiye</div><div style="font-size:18px;font-weight:700;color:' + (st.netBakiye >= 0 ? '#16A34A' : '#DC2626') + '">' + (st.netBakiye >= 0 ? '+' : '') + '₺' + Math.abs(Math.round(st.netBakiye)).toLocaleString('tr-TR') + '</div></div>'
      + '<div style="flex:1;min-width:120px;padding:10px;background:var(--sf);border:1px solid var(--b);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">İşlem Sayısı</div><div style="font-size:18px;font-weight:700;color:var(--t)">' + st.hareketler.length + '</div></div>'
    + '</div>'
    // İçerik
    + '<div style="padding:16px 24px;max-height:55vh;overflow-y:auto">'
      + limitHTML
      // Format seçici (user/admin modunda)
      + '<div style="display:flex;gap:4px;margin-bottom:12px">'
        + '<button onclick="openCariStatement(' + cariId + ',\'musteri\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px;' + (format === 'musteri' ? 'background:var(--ac);color:#fff' : '') + '">Müşteri</button>'
        + '<button onclick="openCariStatement(' + cariId + ',\'user\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px;' + (format === 'user' ? 'background:var(--ac);color:#fff' : '') + '">Operasyonel</button>'
        + (_isManagerO() ? '<button onclick="openCariStatement(' + cariId + ',\'admin\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px;' + (format === 'admin' ? 'background:var(--ac);color:#fff' : '') + '">Yönetici</button>' : '')
        + '</div>'
      // Tablo
      + '<div style="border:1px solid var(--b);border-radius:8px;overflow:hidden">'
        + '<table style="width:100%;border-collapse:collapse">'
        + '<thead>' + thHTML + '</thead>'
        + '<tbody>' + (rowsHTML || '<tr><td colspan="10" style="padding:24px;text-align:center;color:var(--t3)">Hareket bulunamadı</td></tr>') + '</tbody>'
        + '<tfoot><tr style="background:var(--s2);border-top:2px solid var(--b)">'
          + '<td style="padding:8px;font-size:11px;font-weight:700" colspan="' + (format === 'musteri' ? 2 : 3) + '">TOPLAM</td>'
          + '<td style="padding:8px;font-size:12px;font-weight:700;color:#DC2626;text-align:right">₺' + Math.round(st.toplamBorc).toLocaleString('tr-TR') + '</td>'
          + '<td style="padding:8px;font-size:12px;font-weight:700;color:#16A34A;text-align:right">₺' + Math.round(st.toplamAlacak).toLocaleString('tr-TR') + '</td>'
          + '<td style="padding:8px;font-size:12px;font-weight:700;color:' + (st.netBakiye >= 0 ? '#16A34A' : '#DC2626') + ';text-align:right">' + (st.netBakiye >= 0 ? '+' : '') + '₺' + Math.abs(Math.round(st.netBakiye)).toLocaleString('tr-TR') + '</td>'
          + '<td colspan="5"></td>'
        + '</tr></tfoot>'
        + '</table></div>'
      + posHTML
      + auditHTML
    + '</div>'
    // Müşteri formatında imza alanı
    + (format === 'musteri' ? '<div style="padding:16px 24px;border-top:1px solid var(--b);display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:10px;color:var(--t3)">'
      + '<div><div style="margin-bottom:30px">Düzenleyen:</div><div style="border-top:1px solid var(--t3);padding-top:4px">DUAY GLOBAL TRADE LLC</div></div>'
      + '<div><div style="margin-bottom:30px">Onaylayan:</div><div style="border-top:1px solid var(--t3);padding-top:4px">' + esc(c.name) + '</div></div>'
    + '</div>' : '')
    + '<div style="padding:10px 24px;border-top:1px solid var(--b);text-align:right;background:var(--s2)">'
    + '<span style="font-size:9px;color:var(--t3)">Oluşturulma: ' + today + ' · DUAY Platform v9.1</span>'
    + '</div></div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
}

/** Cari hesap özeti yazdırma */
function _printCariStmt() {
  var header = document.getElementById('cari-stmt-header');
  var modal = document.querySelector('#mo-cari-stmt .moc');
  if (!modal) return;
  var w = window.open('', '_blank');
  w.document.write('<html><head><title>Cari Hesap Özeti</title><style>body{font-family:system-ui;margin:20px}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border:1px solid #ddd;font-size:11px}th{background:#f5f5f5}@media print{button{display:none!important}}</style></head><body>');
  w.document.write(modal.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

/** Cari hesap özeti Excel export */
function _exportCariStmtXlsx(cariId, format) {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var st = _buildCariStatement(cariId);
  if (!st) return;
  var rows = [['Tarih', 'Açıklama', 'Döküman No', 'Borç', 'Alacak', 'Para Birimi', 'Bakiye', 'Durum', 'Oluşturan']];
  var users = st.users;
  st.hareketler.forEach(function(h) {
    var creator = users.find(function(u) { return u.id === h.createdBy; });
    rows.push([
      (h.date || '').slice(0, 10), h.name, h.docNo,
      h.type === 'odeme' ? h.amount : '', h.type === 'tahsilat' ? h.amount : '',
      h.currency, h.bakiye, h.status, creator?.name || '—'
    ]);
  });
  rows.push(['', 'TOPLAM', '', st.toplamBorc, st.toplamAlacak, 'TRY', st.netBakiye, '', '']);
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:25},{wch:15},{wch:12},{wch:12},{wch:8},{wch:12},{wch:12},{wch:15}];
  XLSX.utils.book_append_sheet(wb, ws, 'Hesap Ozeti');
  XLSX.writeFile(wb, 'cari-ozet-' + st.cari.name.replace(/\s+/g, '_') + '-' + _todayStr() + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
}

window.openCariStatement = openCariStatement;
window._printCariStmt = _printCariStmt;
window._exportCariStmtXlsx = _exportCariStmtXlsx;

// ════════════════════════════════════════════════════════════════
// DEMO VERİ YÜKLEME
// ════════════════════════════════════════════════════════════════

function _insertCariDemoData() {
  if (!_isAdminO()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var existing = typeof loadCari === 'function' ? loadCari() : [];
  if (existing.some(function(c) { return c.name === 'INNOCAP Trading Ltd'; })) {
    window.toast?.('Demo veriler zaten yüklenmiş', 'warn'); return;
  }
  var now = _nowTso();
  var cu = _CUo();

  // 5 Cari
  var cariler = [
    { id: generateNumericId(), name: 'INNOCAP Trading Ltd', type: 'musteri', currency: 'USD', creditLimit: 500000, status: 'active', phone: '+1 212 555 0100', email: 'info@innocap.com', country: 'US', createdAt: now, createdBy: cu?.id, approvedBy: cu?.id },
    { id: generateNumericId(), name: 'Doğsan Branda San. A.Ş.', type: 'tedarikci', currency: 'TRY', creditLimit: 2000000, status: 'active', phone: '0212 555 0200', email: 'satis@dogsan.com.tr', country: 'TR', createdAt: now, createdBy: cu?.id, approvedBy: cu?.id },
    { id: generateNumericId(), name: 'Merden Lojistik', type: 'tedarikci', currency: 'USD', creditLimit: 300000, status: 'active', phone: '+90 532 555 0300', email: 'ops@merden.com', country: 'TR', createdAt: now, createdBy: cu?.id, approvedBy: cu?.id },
    { id: generateNumericId(), name: 'Elips End. Malz. San. A.Ş.', type: 'musteri', currency: 'EUR', creditLimit: 250000, status: 'active', phone: '0216 555 0400', email: 'bilgi@elips.com.tr', country: 'TR', createdAt: now, createdBy: cu?.id, approvedBy: cu?.id },
    { id: generateNumericId(), name: 'Hava Kargo Batı Loj.', type: 'tedarikci', currency: 'TRY', creditLimit: 800000, status: 'active', phone: '0232 555 0500', email: 'info@havakargobati.com', country: 'TR', createdAt: now, createdBy: cu?.id, approvedBy: cu?.id },
  ];
  var allCari = existing.concat(cariler);
  if (typeof storeCari === 'function') storeCari(allCari);

  // 13 Hareket (8 ödeme + 5 tahsilat)
  var odmData = typeof loadOdm === 'function' ? loadOdm() : [];
  var tahData = typeof loadTahsilat === 'function' ? loadTahsilat() : [];

  var demoOdm = [
    { id: generateNumericId(), name: 'INNOCAP Hammadde Alımı', cat: 'diger', freq: 'teksefer', amount: 45000, currency: 'USD', amountTRY: 1732500, kurRate: 38.50, due: '2026-03-15', cariName: 'INNOCAP Trading Ltd', docNo: 'INV-2026-001', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: true, paidTs: '2026-03-14 10:30:00', createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'INNOCAP Nakliye Bedeli', cat: 'diger', freq: 'teksefer', amount: 8500, currency: 'USD', amountTRY: 327250, kurRate: 38.50, due: '2026-04-01', cariName: 'INNOCAP Trading Ltd', docNo: 'INV-2026-015', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Doğsan Branda Siparişi', cat: 'diger', freq: 'teksefer', amount: 875000, currency: 'TRY', amountTRY: 875000, kurRate: 1, due: '2026-03-10', cariName: 'Doğsan Branda San. A.Ş.', docNo: 'FTR-2026-044', yontem: 'Çek', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Doğsan Montaj Hizmeti', cat: 'diger', freq: 'teksefer', amount: 320000, currency: 'TRY', amountTRY: 320000, kurRate: 1, due: '2026-04-15', cariName: 'Doğsan Branda San. A.Ş.', docNo: 'FTR-2026-055', yontem: 'Havale/EFT', approvalStatus: 'pending', paid: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Merden Konteyner Taşıma', cat: 'diger', freq: 'aylik', amount: 12000, currency: 'USD', amountTRY: 462000, kurRate: 38.50, due: '2026-03-20', cariName: 'Merden Lojistik', docNo: 'MRD-2026-009', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: true, paidTs: '2026-03-19 14:00:00', createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Elips Sanayi Malzeme', cat: 'diger', freq: 'teksefer', amount: 67500, currency: 'EUR', amountTRY: 2781000, kurRate: 41.20, due: '2026-03-25', cariName: 'Elips End. Malz. San. A.Ş.', docNo: 'ELP-2026-003', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Elips Yedek Parça', cat: 'diger', freq: 'teksefer', amount: 15200, currency: 'EUR', amountTRY: 626240, kurRate: 41.20, due: '2026-02-28', cariName: 'Elips End. Malz. San. A.Ş.', docNo: 'ELP-2026-001', yontem: 'Nakit', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Hava Kargo Batı Navlun', cat: 'diger', freq: 'aylik', amount: 245000, currency: 'TRY', amountTRY: 245000, kurRate: 1, due: '2026-04-05', cariName: 'Hava Kargo Batı Loj.', docNo: 'HKB-2026-007', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, approvedAt: now, paid: false, createdBy: cu?.id, ts: now },
  ];

  var demoTah = [
    { id: generateNumericId(), name: 'INNOCAP Ürün Satışı', type: 'satis', amount: 62000, currency: 'USD', amountTRY: 2387000, kurRate: 38.50, due: '2026-03-18', cariName: 'INNOCAP Trading Ltd', ref: 'THS-2026-001', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, collected: true, collectedTs: '2026-03-17 11:00:00', createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Doğsan İade Alacağı', type: 'iade', amount: 150000, currency: 'TRY', amountTRY: 150000, kurRate: 1, due: '2026-04-10', cariName: 'Doğsan Branda San. A.Ş.', ref: 'THS-2026-008', yontem: 'Havale/EFT', approvalStatus: 'pending', collected: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Merden Hasar Tazminat', type: 'diger', amount: 5000, currency: 'USD', amountTRY: 192500, kurRate: 38.50, due: '2026-03-22', cariName: 'Merden Lojistik', ref: 'THS-2026-012', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, collected: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Elips Proje Ödemesi', type: 'musteri', amount: 95000, currency: 'EUR', amountTRY: 3914000, kurRate: 41.20, due: '2026-04-20', cariName: 'Elips End. Malz. San. A.Ş.', ref: 'THS-2026-015', yontem: 'Havale/EFT', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, collected: false, createdBy: cu?.id, ts: now },
    { id: generateNumericId(), name: 'Hava Kargo Komisyon', type: 'komisyon', amount: 45000, currency: 'TRY', amountTRY: 45000, kurRate: 1, due: '2026-03-30', cariName: 'Hava Kargo Batı Loj.', ref: 'THS-2026-018', yontem: 'Nakit', approvalStatus: 'approved', approved: true, approvedBy: cu?.id, collected: true, collectedTs: '2026-03-29 16:00:00', createdBy: cu?.id, ts: now },
  ];

  if (typeof storeOdm === 'function') storeOdm(odmData.concat(demoOdm));
  if (typeof storeTahsilat === 'function') storeTahsilat(tahData.concat(demoTah));

  window.toast?.('Demo veriler yüklendi: 5 cari + 13 hareket ✓', 'ok');
  window.logActivity?.('settings', 'Demo veriler yüklendi: 5 cari, 8 ödeme, 5 tahsilat');
  renderOdemeler();
  if (typeof renderCari === 'function') renderCari();
}

window._insertCariDemoData = _insertCariDemoData;

// ════════════════════════════════════════════════════════════════
// GİZLİ FİNANSAL ÖZELLİKLER — SADECE ADMİN/YÖNETİCİ
// ════════════════════════════════════════════════════════════════

/**
 * FIX 2 — Gelişmiş Cari Risk Skoru (0-100).
 * Gecikme süresi, limit kullanımı, ortalama gecikme dahil.
 */
function _calcAdvancedRiskScore(cariName) {
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && o.cariName === cariName; });
  if (odm.length < 2) return { score: 50, label: 'Yetersiz Veri', color: '#9CA3AF', details: [] };
  var today = _todayStr();
  var total = odm.length;
  var paid = odm.filter(function(o) { return o.paid; }).length;
  var late = odm.filter(function(o) { return !o.paid && o.due && o.due < today; });
  var lateCount = late.length;
  // Ortalama gecikme süresi (gün)
  var totalLateDays = late.reduce(function(s, o) { return s + Math.ceil((new Date(today) - new Date(o.due)) / 86400000); }, 0);
  var avgLateDays = lateCount > 0 ? Math.round(totalLateDays / lateCount) : 0;
  // Limit kullanımı
  var cari = (typeof loadCari === 'function' ? loadCari() : []).find(function(c) { return c.name === cariName; });
  var cLimit = cari ? (cari.creditLimit || cari.limitAmount || 0) : 0;
  var unpaid = odm.filter(function(o) { return !o.paid; }).reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
  var limitUsage = cLimit > 0 ? Math.round(unpaid / cLimit * 100) : 0;
  // Skor hesapla
  var payRate = Math.round(paid / total * 40); // max 40
  var latePenalty = Math.min(30, lateCount * 6); // max 30
  var delayPenalty = Math.min(15, Math.round(avgLateDays / 5) * 3); // max 15
  var limitPenalty = limitUsage > 100 ? 15 : limitUsage > 80 ? 10 : limitUsage > 50 ? 5 : 0; // max 15
  var score = Math.max(0, Math.min(100, 100 - latePenalty - delayPenalty - limitPenalty + (payRate - 40)));
  var label = score >= 80 ? 'Düşük Risk' : score >= 60 ? 'Orta Risk' : score >= 40 ? 'Yüksek Risk' : 'Kritik Risk';
  var color = score >= 80 ? '#16A34A' : score >= 60 ? '#F59E0B' : score >= 40 ? '#EF4444' : '#7C2D12';
  return {
    score: score, label: label, color: color,
    details: [
      'Ödeme oranı: %' + Math.round(paid / total * 100),
      'Gecikmiş: ' + lateCount + ' kayıt',
      'Ort. gecikme: ' + avgLateDays + ' gün',
      'Limit kullanım: %' + limitUsage,
    ]
  };
}
window._calcAdvancedRiskScore = _calcAdvancedRiskScore;

/**
 * FIX 3 — Kâr Marjı Analizi paneli (admin only).
 */
window.openProfitAnalysis = function() {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cariList = (typeof loadCari === 'function' ? loadCari() : []).filter(function(c) { return !c.isDeleted; });
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted; });
  var tah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted; });

  // Cari bazlı net pozisyon
  var positions = cariList.map(function(c) {
    var cOdm = odm.filter(function(o) { return o.cariName === c.name; }).reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
    var cTah = tah.filter(function(t) { return t.cariName === c.name; }).reduce(function(s, t) { return s + (parseFloat(t.amountTRY || t.amount) || 0); }, 0);
    return { name: c.name, borc: cOdm, alacak: cTah, net: cTah - cOdm };
  }).filter(function(p) { return p.borc > 0 || p.alacak > 0; });

  positions.sort(function(a, b) { return b.net - a.net; });
  var topProfit = positions.slice(0, 5);
  var topLoss = positions.slice(-5).reverse();

  // Döviz bazlı
  var byCur = {};
  odm.forEach(function(o) { var c = o.currency || 'TRY'; if (!byCur[c]) byCur[c] = { borc: 0, alacak: 0 }; byCur[c].borc += parseFloat(o.amount) || 0; });
  tah.forEach(function(t) { var c = t.currency || 'TRY'; if (!byCur[c]) byCur[c] = { borc: 0, alacak: 0 }; byCur[c].alacak += parseFloat(t.amount) || 0; });

  var ex = document.getElementById('mo-profit'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-profit'; ;
  mo.innerHTML = '<div class="moc" style="max-width:640px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div style="font-size:14px;font-weight:700;color:var(--t)">📈 Kâr Marjı Analizi</div>'
    + '<button onclick="document.getElementById(\'mo-profit\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:16px 20px;max-height:65vh;overflow-y:auto">'
    // Döviz pozisyon
    + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:8px">Para Birimi Bazlı Net Pozisyon</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
    + Object.entries(byCur).map(function(e) {
        var net = e[1].alacak - e[1].borc;
        var color = net >= 0 ? '#16A34A' : '#DC2626';
        return '<div style="padding:8px 14px;border-radius:8px;background:' + color + '0a;border:1px solid ' + color + '22"><span style="font-size:10px;color:var(--t3)">' + e[0] + '</span> <span style="font-size:14px;font-weight:700;color:' + color + '">' + (net >= 0 ? '+' : '') + Math.round(net).toLocaleString('tr-TR') + '</span></div>';
      }).join('')
    + '</div>'
    // En kârlı 5
    + '<div style="font-size:11px;font-weight:700;color:#16A34A;text-transform:uppercase;margin-bottom:6px">En Kârlı 5 Cari</div>'
    + topProfit.map(function(p) {
        return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--b)"><span>' + esc(p.name) + '</span><span style="color:#16A34A;font-weight:600">+₺' + Math.round(p.net).toLocaleString('tr-TR') + '</span></div>';
      }).join('')
    + '<div style="margin-top:16px;font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;margin-bottom:6px">En Zararlı 5 Cari</div>'
    + topLoss.map(function(p) {
        return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--b)"><span>' + esc(p.name) + '</span><span style="color:#DC2626;font-weight:600">₺' + Math.round(p.net).toLocaleString('tr-TR') + '</span></div>';
      }).join('')
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/**
 * FIX 4 — Vade Uyumsuzluğu Uyarısı (Duration Mismatch).
 * 30 günde tahsilat < ödeme ise nakit açığı uyarısı.
 */
function _checkDurationMismatch() {
  if (!_isManagerO()) return null;
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && !o.paid; });
  var tah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted && !t.collected; });
  var today = new Date();
  var d30 = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  var todayStr = today.toISOString().slice(0, 10);

  var odm30 = odm.filter(function(o) { return o.due && o.due >= todayStr && o.due <= d30; })
    .reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
  var tah30 = tah.filter(function(t) { return t.due && t.due >= todayStr && t.due <= d30; })
    .reduce(function(s, t) { return s + (parseFloat(t.amountTRY || t.amount) || 0); }, 0);

  var gap = tah30 - odm30;
  if (gap >= 0) return null;
  // Kaç gün içinde açık oluşacağını bul
  var cumNet = 0;
  var gapDay = 30;
  for (var i = 0; i < 30; i++) {
    var ds = new Date(today.getTime() + i * 86400000).toISOString().slice(0, 10);
    var dayOdm = odm.filter(function(o) { return o.due === ds; }).reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
    var dayTah = tah.filter(function(t) { return t.due === ds; }).reduce(function(s, t) { return s + (parseFloat(t.amountTRY || t.amount) || 0); }, 0);
    cumNet += dayTah - dayOdm;
    if (cumNet < 0 && gapDay === 30) gapDay = i;
  }
  return { gap: Math.abs(Math.round(gap)), days: gapDay, odm30: Math.round(odm30), tah30: Math.round(tah30) };
}
window._checkDurationMismatch = _checkDurationMismatch;

/**
 * FIX 5 — Çapraz Döviz Pozisyon Takibi paneli (admin only).
 */
window.openFxPosition = function() {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && !o.paid; });
  var tah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted && !t.collected; });
  var rates = _odmGetRates();

  var byCur = {};
  odm.forEach(function(o) { var c = o.currency || 'TRY'; if (!byCur[c]) byCur[c] = { borc: 0, alacak: 0 }; byCur[c].borc += parseFloat(o.amount) || 0; });
  tah.forEach(function(t) { var c = t.currency || 'TRY'; if (!byCur[c]) byCur[c] = { borc: 0, alacak: 0 }; byCur[c].alacak += parseFloat(t.amount) || 0; });

  var ex = document.getElementById('mo-fx-pos'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-fx-pos'; ;
  var tableRows = Object.entries(byCur).map(function(e) {
    var cur = e[0], pos = e[1];
    var net = pos.alacak - pos.borc;
    var kur = rates[cur] || 1;
    var tlNet = Math.round(net * kur);
    // Kur riski: %5 değişimde etki
    var kurRisk5 = Math.round(Math.abs(net) * kur * 0.05);
    var netColor = net >= 0 ? '#16A34A' : '#DC2626';
    return '<tr style="border-bottom:1px solid var(--b)">'
      + '<td style="padding:8px;font-weight:600">' + cur + '</td>'
      + '<td style="padding:8px;color:#DC2626;text-align:right">' + Math.round(pos.borc).toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:8px;color:#16A34A;text-align:right">' + Math.round(pos.alacak).toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:8px;color:' + netColor + ';font-weight:700;text-align:right">' + (net >= 0 ? '+' : '') + Math.round(net).toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:8px;text-align:right;color:var(--t3)">₺' + kur.toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:8px;color:' + netColor + ';font-weight:700;text-align:right">₺' + tlNet.toLocaleString('tr-TR') + '</td>'
      + '<td style="padding:8px;text-align:right;color:#F59E0B;font-size:10px">±₺' + kurRisk5.toLocaleString('tr-TR') + '</td>'
    + '</tr>';
  }).join('');

  mo.innerHTML = '<div class="moc" style="max-width:700px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div style="font-size:14px;font-weight:700;color:var(--t)">💱 Çapraz Döviz Pozisyon</div>'
    + '<button onclick="document.getElementById(\'mo-fx-pos\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:16px 20px;overflow-x:auto">'
    + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
    + '<thead><tr style="border-bottom:2px solid var(--b);font-size:9px;text-transform:uppercase;color:var(--t3)">'
    + '<th style="padding:6px 8px;text-align:left">Döviz</th><th style="padding:6px 8px;text-align:right">Borç</th><th style="padding:6px 8px;text-align:right">Alacak</th><th style="padding:6px 8px;text-align:right">Net</th><th style="padding:6px 8px;text-align:right">Kur</th><th style="padding:6px 8px;text-align:right">TL Net</th><th style="padding:6px 8px;text-align:right">%5 Risk</th>'
    + '</tr></thead><tbody>' + tableRows + '</tbody></table>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** Toplu seçim sayacı güncelle */
window._cariUpdateBulkCount = function() {
  var checked = document.querySelectorAll('.cari-bulk-cb:checked');
  var bar = document.getElementById('cari-bulk-bar');
  var cnt = document.getElementById('cari-bulk-count');
  if (bar) bar.style.display = checked.length ? 'flex' : 'none';
  if (cnt) cnt.textContent = checked.length + ' seçili';
};

/** Toplu seçimi temizle */
window._cariBulkClear = function() {
  document.querySelectorAll('.cari-bulk-cb:checked').forEach(function(cb) { cb.checked = false; });
  window._cariUpdateBulkCount();
};

/** Toplu cari silme (soft delete) */
window._cariBulkDelete = function() {
  if (!_isManagerO()) return;
  var ids = [];
  document.querySelectorAll('.cari-bulk-cb:checked').forEach(function(cb) { ids.push(parseInt(cb.value)); });
  if (!ids.length) return;
  window.confirmModal(ids.length + ' cari silinecek. Emin misiniz?', {
    title: 'Toplu Cari Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var d = loadCari();
      ids.forEach(function(id) {
        var c = d.find(function(x) { return x.id === id; });
        if (c) { c.isDeleted = true; c.deletedAt = _nowTso(); c.deletedBy = _CUo()?.id; }
      });
      storeCari(d);
      window.toast?.(ids.length + ' cari silindi', 'ok');
      window.logActivity?.('cari', 'Toplu silme: ' + ids.length + ' cari');
      renderCari();
    }
  });
};

/** Admin: cariyi başka personele incelet */
window._assignCariReview = function(cariId) {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var users = typeof loadUsers === 'function' ? loadUsers().filter(function(u) { return u.status === 'active'; }) : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var c = loadCari().find(function(x) { return x.id === cariId; });
  if (!c) return;

  var ex = document.getElementById('mo-cari-review'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-cari-review'; ;
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">👁 Cari İncelet — ' + esc(c.name) + '</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">'
    + '<div><div class="fl">İNCELEYECEK KİŞİ *</div><select class="fi" id="cr-user">'
    + users.map(function(u) { return '<option value="' + u.id + '">' + esc(u.name) + ' (' + u.role + ')</option>'; }).join('')
    + '</select></div>'
    + '<div><div class="fl">NOT</div><textarea class="fi" id="cr-note" rows="2" style="resize:none" placeholder="İnceleme talimatı..."></textarea></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-cari-review\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._sendCariReview(' + cariId + ')">📤 Gönder</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._sendCariReview = function(cariId) {
  var uid = parseInt(document.getElementById('cr-user')?.value || '0');
  var note = (document.getElementById('cr-note')?.value || '').trim();
  if (!uid) { window.toast?.('Kişi seçin', 'err'); return; }
  var d = loadCari();
  var c = d.find(function(x) { return x.id === cariId; });
  if (!c) return;
  c.reviewAssignedTo = uid;
  c.reviewAssignedAt = _nowTso();
  c.reviewAssignedBy = _CUo()?.id;
  c.reviewNote = note;
  c.reviewStatus = 'pending';
  if (!c.changeHistory) c.changeHistory = [];
  c.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: ['İnceleme talimatı verildi'] });
  storeCari(d);
  window.addNotif?.('👁', 'Cari inceleme talimatı: ' + c.name + ' — ' + note, 'warn', 'cari:' + cariId, uid);
  window.toast?.('İnceleme talimatı gönderildi ✓', 'ok');
  document.getElementById('mo-cari-review')?.remove();
  renderCari();
};

/** Cari belge yükleme (PDF/JPG/PNG, max 5MB) */
window._qcUploadDoc = function(docType) {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png';
  inp.onchange = function() {
    var file = this.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { window.toast?.('Dosya 5MB\'den küçük olmalı', 'err'); return; }
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { window.toast?.('Sadece PDF/JPG/PNG yükleyebilirsiniz', 'err'); return; }
    var r = new FileReader();
    r.onload = function(e) {
      // Kaydet: qc-edit-id varsa mevcut cariye, yoksa geçici sakla
      var editId = parseInt(document.getElementById('qc-edit-id')?.value || '0') || 0;
      if (editId) {
        var d = loadCari();
        var c = d.find(function(x) { return x.id === editId; });
        if (c) {
          c[docType] = { name: file.name, data: e.target.result, ts: _nowTso() };
          c.evrakTamamlandi = !!(c.vergiLevhasi && c.imzaSirkuleri);
          storeCari(d);
          window.toast?.(docType + ' yüklendi ✓', 'ok');
          window._openQuickCari(editId); // Formu yenile
        }
      } else {
        // Geçici: hidden input'a kaydet
        window['_qcTempDoc_' + docType] = { name: file.name, data: e.target.result, ts: _nowTso() };
        window.toast?.(docType + ' hazır — kaydetmeyi unutmayın', 'ok');
      }
    };
    r.readAsDataURL(file);
  };
  inp.click();
};

/** Potansiyel → Aktif Cari'ye yükselt */
window._upgradeCariToActive = function(cariId) {
  var d = loadCari();
  var c = d.find(function(x) { return x.id === cariId; });
  if (!c) return;
  // Evrak kontrolü
  if (!c.vergiLevhasi) { window.toast?.('Vergi Levhası yüklenmeli', 'err'); return; }
  if (!c.imzaSirkuleri) { window.toast?.('İmza Sirküleri yüklenmeli', 'err'); return; }
  // 50K TL üzeri işlem varsa ticaret sicil zorunlu
  var threshold = _getCariDocThreshold();
  var odmTotal = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return o.cariName === c.name && !o.isDeleted; })
    .reduce(function(s, o) { return s + (parseFloat(o.amountTRY || o.amount) || 0); }, 0);
  if (odmTotal > threshold && !c.ticaretSicil) {
    window.toast?.('₺' + threshold.toLocaleString('tr-TR') + ' üzeri işlem var — Ticaret Sicil belgesi zorunlu', 'err');
    return;
  }
  c.cariType = 'aktif';
  c.evrakTamamlandi = true;
  c.upgradeRequestedAt = _nowTso();
  c.upgradeRequestedBy = _CUo()?.id;
  if (!c.changeHistory) c.changeHistory = [];
  c.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: ['Aşama: potansiyel → aktif (onay bekliyor)'] });
  storeCari(d);
  // Yöneticilere bildirim
  var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active'; });
  mgrs.forEach(function(m) { window.addNotif?.('🔄', 'Cari yükseltme onayı: ' + c.name, 'warn', 'cari:' + c.id, m.id); });
  window.toast?.('Aktif cariye yükseltme talebi gönderildi', 'ok');
  if (typeof renderCari === 'function') renderCari();
};

/** Yönetici: Aktif → Onaylı Cari */
window._approveCariUpgrade = function(cariId) {
  if (!_isManagerO()) { window.toast?.('Yönetici yetkisi gerekli', 'err'); return; }
  var d = loadCari();
  var c = d.find(function(x) { return x.id === cariId; });
  if (!c) return;
  c.cariType = 'onayli';
  c.status = 'active';
  c.approvedBy = _CUo()?.id;
  c.approvedAt = _nowTso();
  if (!c.changeHistory) c.changeHistory = [];
  c.changeHistory.push({ ts: _nowTso(), by: _CUo()?.id, changes: ['Aşama: aktif → onaylı (yönetici onayı)'] });
  storeCari(d);
  window.addNotif?.('✅', 'Cari onaylandı: ' + c.name, 'ok', 'cari:' + c.id, c.createdBy);
  window.toast?.('Cari onaylı statüye yükseltildi ✓', 'ok');
  if (typeof renderCari === 'function') renderCari();
};

// Exports
// loadCari / storeCari artık database.js'te — window export orada yapılıyor
window.saveCari                = saveCari;
window.deleteCari              = deleteCari;
window.renderCari              = renderCari;
window.checkRecurringTemplates = checkRecurringTemplates;

// Export listesine ekle
if (typeof Odemeler !== 'undefined') {
  Odemeler.openBudgetManager    = openBudgetManager;
  Odemeler.openBankaMutabakat   = openBankaMutabakat;
  Odemeler.openCurrencyReport   = openCurrencyReport;
  Odemeler.renderOdmCalendar    = renderOdmCalendar;
  Odemeler.openOdmKPIDashboard  = openOdmKPIDashboard;
  Odemeler.notifyApprovalNeeded = notifyApprovalNeeded;
  Odemeler.checkRecurringTah    = checkRecurringTahsilat;
  Odemeler.exportEFatura        = exportEFatura;
  Odemeler.loadCari             = loadCari;
  Odemeler.renderCari           = renderCari;
  Odemeler.openKurSettings      = openKurSettings;
  Odemeler.openOdmCatMethodManager = openOdmCatMethodManager;
}
