/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v9.0.0
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
  haftalik: 'Haftalık',
  aylik:    'Aylık',
  uc_aylik: '3 Aylık',
  yillik:   'Yıllık',
  teksefer: 'Tek Sefer',
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
  try {
    const proxy = 'https://api.exchangerate-api.com/v4/latest/TRY';
    const res = await fetch(proxy);
    if (!res.ok) throw new Error('API hatası');
    const data = await res.json();
    // ExchangeRate API TRY bazlı verir (1 TRY = X döviz), biz tersi istiyoruz
    _odmRatesCache = {};
    Object.keys(ODM_CURRENCY).forEach(k => {
      if (k === 'TRY' || k === 'XAU' || k === 'XAG') return;
      if (data.rates[k]) _odmRatesCache[k] = 1 / data.rates[k];
    });
    _odmRatesDate = today;
    localStorage.setItem('odm_rates_cache', JSON.stringify({ d: today, r: _odmRatesCache }));
    console.log('[Ödemeler] Kur güncellendi:', today);
  } catch (e) {
    // Fallback: localStorage cache
    try {
      const c = JSON.parse(localStorage.getItem('odm_rates_cache') || '{}');
      if (c.r) { _odmRatesCache = c.r; _odmRatesDate = c.d; }
    } catch {}
  }
}

// Sayfa yüklenince çek
if (typeof window !== 'undefined') {
  setTimeout(() => _odmFetchTCMB().catch(() => {}), 2000);
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
  const rates = _odmGetRates();
  const rate = rates[cur] || 1;
  return '<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--s2);border-radius:8px;margin-top:4px">'
    + '<span style="font-size:10px;color:var(--t3)">Kur:</span>'
    + '<select id="odm-kur-mode" onchange="_odmKurModeChange(this.value)" style="font-size:10px;border:none;background:none;color:var(--t2);cursor:pointer">'
    + '<option value="alis"' + (_odmRatesMode==='alis'?' selected':'') + '>MB Alış</option>'
    + '<option value="satis"' + (_odmRatesMode==='satis'?' selected':'') + '>MB Satış</option>'
    + '<option value="manuel"' + (_odmRatesMode==='manuel'?' selected':'') + '>Manuel</option>'
    + '</select>'
    + '<span id="odm-kur-val" style="font-size:11px;font-weight:500;color:var(--t)">₺' + rate.toLocaleString('tr-TR', {minimumFractionDigits:4,maximumFractionDigits:4}) + '</span>'
    + '<input type="number" id="odm-kur-manuel" style="font-size:11px;width:80px;border:0.5px solid var(--b);border-radius:6px;padding:2px 6px;display:' + (_odmRatesMode==='manuel'?'block':'none') + '"'
    + ' placeholder="Kur girin" oninput="_odmManualRateInput(this)">'
    + '<span id="odm-kur-date" style="font-size:9px;color:var(--t3);margin-left:auto">' + (_odmRatesDate||'Statik') + '</span>'
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
    // TOPBAR
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">',
      '<div>',
        '<div style="font-size:14px;font-weight:600;color:var(--t)">Nakit Akisi</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:1px" id="odm-sub-title">Yükleniyor...</div>',
      '</div>',
      '<div style="display:flex;gap:6px;align-items:center">',
        '<button class="btn btns" onclick="openOdmChart()" style="border-radius:8px;font-size:11px">Grafik</button>',
        '<button class="btn btns" onclick="exportOdmXlsx()" style="border-radius:8px;font-size:11px">Excel</button>',
        '<button class="btn btns" onclick="window._openOdmImportModal?.()" style="border-radius:8px;font-size:11px">📥 İçe Aktar</button>',
        '<button class="btn btnp" onclick="openTahsilatModal(null)" style="border-radius:8px;font-size:11px">+ Tahsilat</button>',
        '<button class="btn btnp" onclick="openOdmModal(null)" style="border-radius:8px;font-size:12px;font-weight:600">+ Ödeme Ekle</button>',
      '</div>',
    '</div>',

    // BENTO ÜST ÖZET — 4 metrik kutusu
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-bottom:1px solid var(--b)">',
      '<div style="padding:14px 18px;border-right:1px solid var(--b)">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam yükümlülük</div>',
        '<div style="font-size:22px;font-weight:500;color:var(--t)" id="odm-bento-total-amt">₺0</div>',
        '<div style="height:4px;background:var(--s2);border-radius:99px;margin-top:8px;overflow:hidden">',
          '<div id="odm-prog-bar" style="height:100%;width:0%;background:var(--ac);border-radius:99px;transition:width .5s"></div>',
        '</div>',
        '<div style="display:flex;justify-content:space-between;margin-top:3px">',
          '<span style="font-size:9px;color:var(--ac)" id="odm-prog-pct">0% ödendi</span>',
          '<span style="font-size:9px;color:var(--t3)" id="odm-bento-ratio">0/0</span>',
        '</div>',
      '</div>',
      '<div id="odm-bento-gecikti" data-bentotab="gecikti" style="padding:14px 18px;border-right:1px solid var(--b);cursor:pointer;transition:background .1s">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Gecikmiş</div>',
        '<div style="font-size:22px;font-weight:500;color:#EF4444" id="odm-stat-late">0</div>',
        '<div style="font-size:10px;color:#EF4444;margin-top:4px" id="odm-bento-late-hint">Hemen öde</div>',
      '</div>',
      '<div id="odm-bento-hafta" data-bentotab="bekliyor" style="padding:14px 18px;border-right:1px solid var(--b);cursor:pointer;transition:background .1s">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Bu hafta</div>',
        '<div style="font-size:22px;font-weight:500;color:#D97706" id="odm-stat-soon">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="odm-bento-week-amt">₺0</div>',
      '</div>',
      '<div id="odm-bento-ay" data-bentotab="ay" style="padding:14px 18px;cursor:pointer;transition:background .1s">',
        '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Bu ay ödendi</div>',
        '<div style="font-size:22px;font-weight:500;color:#10B981" id="odm-stat-paid">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="odm-bento-paid-amt">₺0</div>',
      '</div>',
    '</div>',

    // SEKMELER
    '<div id="odm-tabs-row" style="display:flex;border-bottom:1px solid var(--b);background:var(--sf);overflow-x:auto;scrollbar-width:none">',
      '<div id="odm-stab-all" style="padding:9px 16px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border-bottom:2px solid var(--ac);color:var(--ac)">Tümü <span id="odm-stat-total">0</span></div>',
      '<div id="odm-stab-gecikti" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--rd)">Gecikmiş <span id="odm-stat-late2">0</span></div>',
      '<div id="odm-stab-bekliyor" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Bu Hafta <span id="odm-stat-soon2">0</span></div>',
      '<div id="odm-stab-ay" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Bu Ay <span id="odm-stat-paid2">0</span></div>',
      '<div id="odm-stab-abonelik" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Abonelikler</div>',
      '<div id="odm-stab-kredi_k" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Kredi Kartları</div>',
      '<div id="odm-stab-tahsilat" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:#0F6E56">💰 Tahsilat</div>',
      '<div id="odm-stab-projeksiyon" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">📊 Projeksiyon</div>',
    '</div>',

    // ARAMA + FİLTRELER — OPTİMİZE
    '<div style="border-bottom:1px solid var(--b);background:var(--sf)">',
      // Satır 1: Arama
      '<div style="padding:10px 16px;display:flex;gap:8px;align-items:center;border-bottom:0.5px solid var(--b)">',
        '<div style="position:relative;flex:1">',
          '<svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%)" width="13" height="13" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="4.5" stroke="var(--t3)" stroke-width="1.3"/><path d="M10 10l2 2" stroke="var(--t3)" stroke-width="1.3" stroke-linecap="round"/></svg>',
          '<input class="fi" type="search" id="odm-search" placeholder="Ödeme, kategori veya sorumlu ara…" oninput="renderOdemeler()" style="padding-left:32px;border-radius:8px;background:var(--s2)">',
        '</div>',
        '<select class="fi" id="odm-user-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:150px;max-width:180px">',
          '<option value="">👤 Tüm Sorumlular</option>',
        '</select>',
        '<select class="fi" id="odm-freq-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:130px;max-width:160px">',
          '<option value="">🔁 Tüm Sıklıklar</option>',
          Object.entries(ODM_FREQ).map(([k,v]) => `<option value="${k}">${v}</option>`).join(''),
        '</select>',
        '<button class="btn btns" onclick="bulkMarkOdmPaid()" style="border-radius:8px;font-size:11px;white-space:nowrap">☑ Toplu Ödendi</button>',
        '<button class="btn btns" onclick="_odmClearFilters()" style="border-radius:8px;font-size:11px;white-space:nowrap">✕ Temizle</button>',
      '</div>',
      // Satır 2: Hızlı chip filtreler
      '<div style="padding:6px 16px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">',
        '<span style="font-size:10px;color:var(--t3);font-weight:500;margin-right:2px">Filtrele:</span>',
        // Kaynak chip'leri
        '<div id="odm-src-chips" style="display:flex;gap:4px;flex-wrap:wrap">',
          '<div class="odm-chip odm-chip-active" data-filter="src" data-val="" onclick="_odmChipClick(this)">Tümü</div>',
          '<div class="odm-chip" data-filter="src" data-val="manual" onclick="_odmChipClick(this)">✍ Manuel</div>',
          '<div class="odm-chip" data-filter="src" data-val="satinalma" onclick="_odmChipClick(this)">🛒 Satınalma</div>',
          '<div class="odm-chip" data-filter="src" data-val="fatura" onclick="_odmChipClick(this)">📄 Fatura</div>',
          '<div class="odm-chip" data-filter="src" data-val="otomatik" onclick="_odmChipClick(this)">🏦 Otomatik</div>',
        '</div>',
        '<div style="width:1px;height:16px;background:var(--b);margin:0 4px"></div>',
        // Kategori chip'leri
        '<div id="odm-cat-chips" style="display:flex;gap:4px;flex-wrap:wrap">',
          '<div class="odm-chip" data-filter="cat" data-val="fatura" onclick="_odmChipClick(this)">💡 Fatura</div>',
          '<div class="odm-chip" data-filter="cat" data-val="abonelik" onclick="_odmChipClick(this)">🔄 Abonelik</div>',
          '<div class="odm-chip" data-filter="cat" data-val="kredi_k" onclick="_odmChipClick(this)">💳 Kredi Kartı</div>',
          '<div class="odm-chip" data-filter="cat" data-val="kira" onclick="_odmChipClick(this)">🏢 Kira</div>',
          '<div class="odm-chip" data-filter="cat" data-val="vergi" onclick="_odmChipClick(this)">📋 Vergi</div>',
          '<div class="odm-chip" data-filter="cat" data-val="sigorta" onclick="_odmChipClick(this)">🛡 Sigorta</div>',
        '</div>',
        // Durum chip'leri
        '<div style="width:1px;height:16px;background:var(--b);margin:0 4px"></div>',
        '<div class="odm-chip" data-filter="status" data-val="gecikti" onclick="_odmChipClick(this)">🚨 Gecikmiş</div>',
        '<div class="odm-chip" data-filter="status" data-val="no-receipt" onclick="_odmChipClick(this)">📎 Dekont Eksik</div>',
        '<div class="odm-chip" data-filter="status" data-val="pending-approval" onclick="_odmChipClick(this)">⏳ Onay Bekleyen</div>',
        // hidden select (eski uyumluluk için)
        '<select id="odm-cat-f" onchange="renderOdemeler()" style="display:none"><option value=""></option>' + Object.entries(ODM_CATS).map(([k,v])=>`<option value="${k}">${v.l}</option>`).join('') + '</select>',
        '<select id="odm-status-f" onchange="renderOdemeler()" style="display:none"><option value=""></option><option value="bekliyor">Bekliyor</option><option value="gecikti">Gecikmiş</option><option value="odendi">Ödendi</option><option value="no-receipt">Dekont Eksik</option></select>',
      '</div>',
    '</div>',

    // Chip CSS — dinamik enjekte
    '<style>.odm-chip{font-size:10px;padding:3px 9px;border-radius:99px;border:0.5px solid var(--b);background:var(--s2);color:var(--t2);cursor:pointer;white-space:nowrap;transition:all .12s}.odm-chip:hover{border-color:var(--ac);color:var(--ac)}.odm-chip-active{background:var(--ac)!important;color:#fff!important;border-color:var(--ac)!important}</style>',

    // TABLO BAŞLIK
    '<div id="odm-thead" style="display:grid;grid-template-columns:32px 1fr 110px 100px 90px 130px;gap:0;padding:6px 16px;border-bottom:1px solid var(--b);background:var(--s2)">',
      '<div></div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Ödeme</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Tutar</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Son Tarih</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlem</div>',
    '</div>',

    '<div id="odm-list"></div>',
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
}

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
  } else {
    _allRaw = window.loadOdm ? loadOdm() : [];
  }
  const all = _isManagerO() ? _allRaw : _allRaw.filter(o => o.createdBy === _cuOdm?.id || o.uid === _cuOdm?.id);

  // Filtreler
  const q      = (_go('odm-search')?.value || '').toLowerCase();
  const catF   = _go('odm-cat-f')?.value   || '';
  const freqF  = _go('odm-freq-f')?.value  || '';
  const statF  = _go('odm-status-f')?.value || '';
  const userF  = _go('odm-user-f')?.value  || '';

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
    card.style.cssText = 'display:grid;grid-template-columns:28px 1fr 110px 100px 90px 130px;gap:0;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;background:'+rowBg+';transition:background .12s';
    card.onmouseenter = () => card.style.background = 'var(--s2)';
    card.onmouseleave = () => { const cb = card.querySelector('.odm-bulk-chk'); card.style.background = (cb&&cb.checked)?'var(--al)':rowBg; };

    const dueColor = status==='gecikti' ? 'var(--rdt)' : status==='yaklasan' ? 'var(--amt)' : 'var(--t2)';
    const curSym = o.currency==='USD'?'$':o.currency==='EUR'?'€':'₺';

    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center">'
        + '<input type="checkbox" class="odm-bulk-chk" data-oid="'+o.id+'" onclick="event.stopPropagation();_onBulkCheck(this)" style="width:14px;height:14px;cursor:pointer;display:'+(_odmBulkMode?'block':'none')+'">'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer" onclick="openOdmModal('+o.id+')">'
        + '<div style="width:32px;height:32px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + cat.ic + '</div>'
        + '<div style="min-width:0">'
          + '<div style="font-size:12px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + o.name + _odmSourceBadge(o) + (o.talimat?.durum==='aktif'?'<span style="font-size:9px;margin-left:3px" title="Otomatik ödeme talimatı aktif">🏦</span>':'') + '</div>'
          + '<div style="font-size:10px;color:var(--t3);margin-top:1px">' + cat.l + ' · ' + freq + (assigned?' · '+assigned.name:'') + (o.talimat?.banka?' · '+o.talimat.banka:'') + (noReceipt?' · <span style="color:var(--amt);cursor:help" title="Fatura belgesi yuklenmemis — dekont ekleyin">📎 eksik</span>':'') + (o.currency&&o.currency!=='TRY'?' · '+o.currency:'') + '</div>'
        + '</div>'
      + '</div>'
      + '<div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + curSym + (parseFloat(o.amount)||0).toLocaleString('tr-TR',{maximumFractionDigits:0}) + '</div>'
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
      + '<div>'
        + '<span class="badge ' + sta.cls + '" style="font-size:10px">' + sta.ic + ' ' + sta.l + '</span>'
        + (o.approvalStatus==='pending' ? '<div style="font-size:9px;color:var(--amt);margin-top:2px">⏳ Onay bekliyor</div>' : '')
        + (status==='gecikti' || (diff!==null && diff>=0 && diff<=2) ? '<div style="font-size:9px;font-weight:700;color:#EF4444;margin-top:2px">🔴 Kritik</div>' : '')
        + (o.approvalStatus==='pending_postpone' ? '<div style="font-size:9px;color:var(--amt);margin-top:2px">⏳ Erteleme onayı</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:3px;flex-shrink:0;align-items:center">'
        // Ana butonlar (her zaman görünür)
        + (!o.paid
          ? (_odmNeedsApproval(o) && o.approvalStatus !== 'approved' && o.approvalStatus !== 'kesinlesti'
            ? (o.approvalStatus === 'pending' || o.approvalStatus === 'ara_onay_bekleniyor' || o.approvalStatus === 'final_onay_bekleniyor'
              ? '<span style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(245,158,11,.08);color:#D97706;font-weight:500">⏳ Onay Bekleniyor</span>'
              : '<button onclick="openApprovalFlow('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 8px;color:var(--amt)">Onay Iste</button>')
            : '<button onclick="markOdmPaid('+o.id+');event.stopPropagation()" class="btn btnp" style="font-size:10px;border-radius:6px;padding:3px 9px;white-space:nowrap">Odendi</button>')
          : '<button onclick="toggleOdmPaid('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 7px">↩</button>')
        + (!o.paid && o.approvalStatus !== 'pending_postpone' ? '<button onclick="postponeOdm('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 8px;color:var(--amt)">Ertele</button>' : '')
        + ((o.approvalStatus==='pending' || o.approvalStatus==='ara_onay_bekleniyor' || o.approvalStatus==='final_onay_bekleniyor' || o.approvalStatus==='pending_postpone') && _isManagerO()
          ? '<button onclick="processOdmApproval('+o.id+',\''+(o.approvalStatus==='final_onay_bekleniyor'?'final_onayla':'ara_onayla')+'\');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 7px;border-radius:6px;color:var(--grt)">✓ Onayla</button>' : '')
        // ··· dropdown (ikincil butonlar)
        + '<div style="position:relative" onclick="event.stopPropagation()">'
          + '<button onclick="var d=this.nextElementSibling;d.style.display=d.style.display===\'none\'?\'flex\':\'none\'" class="btn btns" style="font-size:10px;padding:3px 6px;border-radius:6px">···</button>'
          + '<div style="display:none;position:absolute;right:0;top:100%;background:var(--sf);border:1px solid var(--b);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:50;flex-direction:column;min-width:140px;overflow:hidden">'
            + '<button onclick="showOdmApprovalTimeline('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">📋 Onay Gecmisi</button>'
            + '<button onclick="window._odmInlineEditRow?.('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">✏️ Inline Düzenle</button>'
            + '<button onclick="openOdmModal('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">📝 Detay Düzenle</button>'
            + (o.paid && !o.receipt ? '<button onclick="uploadOdmReceipt('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--amt);font-family:inherit;border-bottom:1px solid var(--b)" title="Fatura belgesi yuklenmemis">📎 Dekont Yukle (eksik)</button>' : '')
            + ((o.cat==='abonelik'||o.cat==='fatura') ? '<button onclick="openOdmTalimatModal('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--t);font-family:inherit;border-bottom:1px solid var(--b)">🏦 Odeme Talimati</button>' : '')
            + (_isManagerO() ? '<button onclick="delOdm('+o.id+')" style="background:none;border:none;padding:8px 12px;text-align:left;font-size:11px;cursor:pointer;color:var(--rdt);font-family:inherit">🗑 Sil</button>' : '')
          + '</div>'
        + '</div>'
      + '</div>';

    frag.appendChild(card);
  });

  // "+ Satır Ekle" butonları — liste altına
  var addRowDiv = document.createElement('div');
  addRowDiv.style.cssText = 'padding:8px 16px;display:flex;gap:8px;border-bottom:1px solid var(--b)';
  addRowDiv.innerHTML = '<button onclick="window._odmAddInlineRow?.()" class="btn btns" style="font-size:11px;padding:4px 12px">+ Satır Ekle</button>'
    + (_odmCurrentTab === 'tahsilat' ? '<button onclick="window._tahAddInlineRow?.()" class="btn btns" style="font-size:11px;padding:4px 12px;color:#10B981">+ Tahsilat Satırı</button>' : '');
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
  mo.className = 'mo'; mo.id = 'mo-odm-v9'; mo.style.zIndex = '2100';

  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;overflow:hidden;border-radius:16px">'
    + '<div style="padding:16px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">' + (o ? '✏️ Ödeme Düzenle' : '+ Yeni Ödeme') + '</div>'
    + '<button onclick="document.getElementById(\'mo-odm-v9\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;max-height:74vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px">'

    // İsim
    + '<div class="fr"><div class="fl">ÖDEME ADI *</div>'
    + '<input class="fi" id="odm-f-name" placeholder="Örn: Ofis Kirası" style="border-radius:8px" value="' + (o?o.name||'':'') + '"></div>'

    // Kategori + Sıklık
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">KATEGORİ</div><select class="fi" id="odm-f-cat" style="border-radius:8px">'
    + Object.entries(ODM_CATS).map(([k,v]) => `<option value="${k}"${o&&o.cat===k?' selected':''}>${v.ic} ${v.l}</option>`).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">SIKLIK</div><select class="fi" id="odm-f-freq" style="border-radius:8px">'
    + Object.entries(ODM_FREQ).map(([k,v]) => `<option value="${k}"${o&&o.freq===k?' selected':''}>${v}</option>`).join('')
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
    + Object.entries(ODM_CURRENCY).map(([k,v]) => `<option value="${k}"${(o?.currency||'TRY')===k?' selected':''}>${v.flag} ${k}</option>`).join('')
    + '</select></div>'
    + '<div id="odm-kur-wrap" style="' + ((!o?.currency||o?.currency==='TRY')?'display:none':'') + '">'
    + _odmKurModeHTML(o?.currency||'USD')
    + '</div>'
    + '</div>'

    // Tarihler
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">PLANLANAN / SON TARİH</div>'
    + '<input type="date" class="fi" id="odm-f-due" style="border-radius:8px" value="' + (o?o.due||'':'') + '"></div>'
    + '<div class="fr" id="odm-actual-wrap"><div class="fl">ÖDENDİĞİ TARİH</div>'
    + '<input type="date" class="fi" id="odm-f-actual" value="' + (o?o.actualDate||'':'') + '"></div>'
    + '</div>'

    // Sorumlu + Alarm
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">SORUMLU KİŞİ</div><select class="fi" id="odm-f-assigned" style="border-radius:8px">'
    + '<option value="">— Seç —</option>'
    + users.map(u => `<option value="${u.id}"${o&&o.assignedTo===u.id?' selected':''}>${u.name}</option>`).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">ALARM (GÜN ÖNCE)</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<input type="range" id="odm-f-alarm" min="1" max="30" value="' + (o?o.alarmDays||3:3) + '" style="flex:1" oninput="document.getElementById(\'odm-f-alarm-val\').textContent=this.value">'
    + '<span id="odm-f-alarm-val" style="font-size:13px;font-weight:700;color:var(--ac);min-width:24px;text-align:center">' + (o?o.alarmDays||3:3) + '</span>'
    + '<span style="font-size:12px;color:var(--t3)">gün</span>'
    + '</div></div>'
    + '</div>'

    // Not
    + '<div class="fr"><div class="fl">NOT</div>'
    + '<textarea class="fi" id="odm-f-note" rows="2" style="resize:none;border-radius:8px" placeholder="Açıklama…">' + (o?o.note||'':'') + '</textarea></div>'

    // Döküman
    + '<div class="fr"><div class="fl">DÖKÜMAN EKLE</div>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    + (o&&o.docs&&o.docs.length ? o.docs.map((d,i) => '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5;cursor:pointer" onclick="viewOdmDoc('+o.id+','+i+')" >📎 '+d.name+'</span>').join('') : '')
    + '<button type="button" onclick="uploadOdmDoc()" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 10px">📎 Dosya Yükle</button>'
    + '<span id="odm-doc-count" style="font-size:10px;color:var(--t3)">' + (o&&o.docs?o.docs.length+' dosya':'') + '</span>'
    + '</div>'
    + '<input type="hidden" id="odm-f-docs" value="' + (o&&o.docs?JSON.stringify(o.docs).replace(/"/g,'&quot;'):'[]') + '">'
    + '</div>'

    // Tekrar + Onay + Ödendi
    + '<div style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--s2);border-radius:9px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + '<div class="fr"><div class="fl">DOKUMAN NO</div><input class="fi" id="odm-f-docno" placeholder="FTR-2026-001" value="' + (o?o.docNo||'':'') + '" style="border-radius:8px"></div>'
      + '<div class="fr"><div class="fl">GOREV ID</div><input class="fi" id="odm-f-taskid" placeholder="Gorev ara..." value="' + (o?o.taskId||'':'') + '" oninput="window._odmTaskSearch(this.value)" style="border-radius:8px"><div id="odm-task-badge" style="font-size:11px;margin-top:4px"></div></div>'
    + '</div>'
    + '</div>'

    + '<input type="hidden" id="odm-f-eid" value="' + (o?o.id:'') + '">'
    + '</div>'

    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-v9\').remove()">İptal</button>'
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

function saveOdm() {
  var cu = window.Auth?.getCU?.();
  var isAdmin = cu?.role === 'admin';
  var name = (document.getElementById('odm-f-name')?.value || '').trim();
  if (!name) { window.toast?.('Odeme adi zorunludur', 'err'); return; }
  var _fAmt = parseFloat(document.getElementById('odm-f-amount')?.value || '0');
  if (!_fAmt) { window.toast?.('Tutar zorunludur', 'err'); return; }
  var _fDue = document.getElementById('odm-f-due')?.value || '';
  if (!_fDue) { window.toast?.('Tarih zorunludur', 'err'); return; }
  var eidVal = document.getElementById('odm-f-eid')?.value || '';
  var eid = eidVal ? parseInt(eidVal) : 0;
  var isNew = !eid;
  const d    = window.loadOdm ? loadOdm() : [];
  const cat = _go('odm-f-cat')?.value || 'diger';
  const currency = _go('odm-f-currency')?.value || 'TRY';
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
    assignedTo:     parseInt(_go('odm-f-assigned')?.value || '0') || null,
    docNo:          (_go('odm-f-docno')?.value || '').trim(),
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
      // Audit diff — değişen alanları kaydet
      var _diffs = [];
      if (o.amount !== entry.amount) _diffs.push('Tutar: ' + (o.amount||0) + ' → ' + entry.amount);
      if (o.due !== entry.due) _diffs.push('Tarih: ' + (o.due||'-') + ' → ' + (entry.due||'-'));
      if (o.name !== entry.name) _diffs.push('Ad: ' + (o.name||'-') + ' → ' + entry.name);
      if (_diffs.length && !_isAdminO()) {
        var _admins = (window.loadUsers?.() || []).filter(function(u) { return u.role === 'admin' && u.status === 'active'; });
        _admins.forEach(function(a) { window.addNotif?.('📝', 'Odeme duzenlendi: ' + _diffs.join(', '), 'info', 'odemeler', a.id); });
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
  mo.className = 'mo'; mo.id = 'mo-odm-postpone'; mo.style.zIndex = '2100';
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
  if (!_isAdminO()) return;
  window.confirmModal('Bu ödemeyi silmek istediğinizden emin misiniz?', {
    title: 'Ödeme Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      window.storeOdm ? storeOdm(loadOdm().filter(x => x.id !== id)) : null;
      renderOdemeler();
      window.toast?.('Silindi', 'ok');
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
  mo.className = 'mo'; mo.id = 'mo-tahsilat'; mo.style.zIndex = '2200';
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
function loadTahsilat() {
  try { return JSON.parse(localStorage.getItem('duay_tahsilat') || '[]'); } catch { return []; }
}
function storeTahsilat(d) {
  localStorage.setItem('duay_tahsilat', JSON.stringify(d));
}

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
  mo.className = 'mo'; mo.id = 'mo-tahsilat'; mo.style.zIndex = '2200';

  const curVal = o?.currency || 'TRY';
  const kurHTML = curVal !== 'TRY' ? _odmKurModeHTML(curVal) : '';

  let html = '<div class="moc" style="max-width:580px;padding:0;overflow:hidden;border-radius:16px">';
  html += '<div style="background:#0F6E56;padding:16px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">';
  html += '<div><div style="font-size:15px;font-weight:600">💰 ' + (o ? 'Tahsilat Düzenle' : 'Yeni Tahsilat') + '</div>';
  html += '<div style="font-size:10px;opacity:.7;margin-top:2px">Tahsilat kaydini olusturun</div></div>';
  html += '<button onclick="_go(\'mo-tahsilat\')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:18px">×</button></div>';
  html += '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;max-height:74vh;overflow-y:auto">';

  // Müşteri + Tür
  html += '<div class="fr"><div class="fl">MÜŞTERİ / KAYNAK *</div><input class="fi" id="tah-f-name" placeholder="Müşteri adı veya kaynak..." value="' + (o?o.name||'':'') + '"></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">TAHSİLAT TÜRÜ</div><select class="fi" id="tah-f-type">';
  Object.entries(TAH_TYPES).forEach(([k,v]) => { html += '<option value="' + k + '"' + (o&&o.type===k?' selected':'') + '>' + v + '</option>'; });
  html += '</select></div>';
  html += '<div class="fr"><div class="fl">FATURA / REFERANS NO</div><input class="fi" id="tah-f-ref" placeholder="INV-2026-001..." value="' + (o?o.ref||'':'') + '"></div></div>';

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

  // Banka + Yöntem
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">ALINAN HESAP / BANKA</div><input class="fi" id="tah-f-banka" placeholder="Garanti, İş Bankası..." value="' + (o?o.banka||'':'') + '"></div>';
  html += '<div class="fr"><div class="fl">ÖDEME YÖNTEMİ</div><select class="fi" id="tah-f-yontem">';
  ['Havale/EFT','Kredi Kartı','Nakit','Çek','Senet','Kripto','Diğer'].forEach(y => { html += '<option value="' + y + '"' + (o&&o.yontem===y?' selected':'') + '>' + y + '</option>'; });
  html += '</select></div></div>';

  // Sorumlu + Alarm
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div class="fr"><div class="fl">SORUMLU</div><select class="fi" id="tah-f-user"><option value="">— Seç —</option>';
  users.forEach(u => { html += '<option value="' + u.id + '"' + (o&&o.assignedTo===u.id?' selected':'') + '>' + u.name + '</option>'; });
  html += '</select></div>';
  html += '<div class="fr"><div class="fl">HATIRLATICI (GÜN ÖNCE)</div><input class="fi" type="number" id="tah-f-alarm" min="1" max="30" value="' + (o?o.alarmDays||3:3) + '"></div></div>';

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
  html += '<button class="btn" onclick="_go("mo-tahsilat")?.remove()">İptal</button>';
  html += '<button class="btn btnp" onclick="saveTahsilat()" style="padding:9px 22px;border-radius:9px">💾 Kaydet</button></div></div>';

  mo.innerHTML = html;
  document.body.appendChild(mo);
  setTimeout(() => mo.classList.add('open'), 10);
}

// _tahSetType kaldırıldı (Gerçekleşen/Planlanan toggle kaldırıldı)

function _tahCurChange(cur) {
  const wrap = document.getElementById('tah-kur-wrap');
  if (wrap) { wrap.style.display = (!cur||cur==='TRY') ? 'none' : 'block'; }
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
  const name = (document.getElementById('tah-f-name')?.value || '').trim();
  if (!name) { window.toast?.('Kaynak adı zorunlu', 'err'); return; }
  const eid = parseInt(document.getElementById('tah-f-eid')?.value || '0');
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
    // planned alanı kaldırıldı
    collected:  !!document.getElementById('tah-f-collected')?.checked,
    assignedTo: parseInt(document.getElementById('tah-f-user')?.value || '0') || null,
    alarmDays:  parseInt(document.getElementById('tah-f-alarm')?.value || '3'),
    note:       document.getElementById('tah-f-note')?.value     || '',
    docs,
    ts: _nowTso(), updatedBy: _CUo()?.id,
  };
  if (eid) {
    const o = d.find(x => x.id === eid);
    if (o) Object.assign(o, entry);
  } else {
    const newEntry = { id: generateNumericId(), ...entry, createdBy: _CUo()?.id };
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
    const _admins = (window.loadUsers?.() || []).filter(u => u.role === 'admin' && u.status === 'active');
    _admins.forEach(a => {
      window.addNotif?.('💰', 'Yeni tahsilat onay bekliyor: ' + escapeHtml(name) + ' - ' + amount + ' ' + currency, 'warn', 'odemeler', a.id);
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
window.loadTahsilat          = loadTahsilat;

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
  mo.className = 'mo'; mo.id = 'mo-odm-chart'; mo.style.zIndex = '2200';

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
    + '<button onclick="_go("mo-odm-chart")?.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="display:flex;align-items:flex-end;gap:6px;height:160px;padding:0 8px;border-left:1px solid var(--b);border-bottom:1px solid var(--b)">'
    + barsHTML
    + '</div>'
    + '<div class="mf"><button class="btn" onclick="_go("mo-odm-chart")?.remove()">Kapat</button></div>'
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
  mo.className = 'mo'; mo.style.zIndex = '2200';
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
  mo.className = 'mo'; mo.id = 'mo-odm-talimat'; mo.style.zIndex = '2300';

  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:16px;overflow:hidden">'
    + '<div style="background:#1e1b4b;padding:16px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">'
    + '<div>'
    + '<div style="font-size:14px;font-weight:600">🏦 Otomatik Ödeme Talimatı</div>'
    + '<div style="font-size:11px;opacity:.7;margin-top:2px">' + o.name + '</div>'
    + '</div>'
    + '<button onclick="_go("mo-odm-talimat")?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:18px">×</button>'
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
    + '<button class="btn" onclick="_go("mo-odm-talimat")?.remove()">İptal</button>'
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
  mo.className='mo'; mo.id='mo-odm-approval'; mo.style.zIndex='2100';
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
  const d = window.loadOdm ? loadOdm() : [];
  const now = Date.now();
  d.forEach(o => {
    if (!o.approvalRequestedAt) return;
    if (o.approvalStatus === 'kesinlesti' || o.approvalStatus === 'approved' || o.approved) return;
    const reqMs = new Date(o.approvalRequestedAt.replace(' ','T')).getTime();
    if (isNaN(reqMs)) return;
    const hoursSince = (now - reqMs) / 3600000;
    if (hoursSince >= 24 && !o._slaNotified) {
      o._slaNotified = true;
      window.addNotif?.('⏰', '"' + (o.name||'Odeme') + '" 24+ saattir onay bekliyor!', 'err', 'odemeler');
    }
  });
  window.storeOdm ? storeOdm(d) : null;
}

// Approval timeline gösterimi
function showOdmApprovalTimeline(odmId) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === odmId);
  if (!o) return;
  const log = o.approvalLog || [];
  const st = ODM_APPROVAL_STATUS[o.approvalStatus] || ODM_APPROVAL_STATUS.pending;

  const old = document.getElementById('mo-odm-timeline'); if (old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-odm-timeline'; mo.style.zIndex='2100';
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
(function() {
  var _origSaveOdm = saveOdm;
  saveOdm = function() {
    var amt = parseFloat(document.getElementById('odm-f-amount')?.value || '0') || 0;
    if (amt >= 50000) {
      window.confirmModal('Yuksek Tutar Uyarisi: ' + amt.toLocaleString('tr-TR') + ' TL. Devam etmek istiyor musunuz?', {
        title: 'Yuksek Tutar', danger: false, confirmText: 'Evet, Kaydet',
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

  // 2) Altın — metals.live (mock fallback)
  fetch('https://api.metals.live/v1/spot')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      // API [{gold: X, silver: Y, ...}] formatında döner
      if (Array.isArray(d) && d.length > 0 && d[0].gold) {
        // oz → gram: 1 troy oz = 31.1035 gram
        var ozToGram = 31.1035;
        var goldUsdPerGram = d[0].gold / ozToGram;
        // TL'ye çevir
        var tryRate = _tickerRates.USD || 38.50;
        _tickerRates.ALTIN = Math.round(goldUsdPerGram * tryRate * 100) / 100;
        renderKurTicker();
        _checkKurAlarm();
      }
    })
    .catch(function(e) {
      console.warn('[Kur] Altın API hatası (mock kullanılıyor):', e.message);
      // Mock fallback — gerçekçi statik veri
      _tickerRates.ALTIN = 3850;
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

  for (var i = 0; i < 15; i++) {
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
      + '<div style="font-size:16px;font-weight:700;color:var(--t);margin-bottom:14px">📊 15 Günlük Nakit Projeksiyon</div>'
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

function openBudgetManager() {
  const ex = document.getElementById('mo-odm-budget');
  if (ex) { ex.remove(); return; }
  const budgets = loadOdmBudgets();
  const all = window.loadOdm ? loadOdm() : [];
  const thisMonth = _todayStr().slice(0,7);

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-budget'; mo.style.zIndex = '2300';

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
  mo.className = 'mo'; mo.id = 'mo-mutabakat'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:560px">'
    + '<div class="mt">🏦 Banka Mutabakatı</div>'
    + '<p style="font-size:12px;color:var(--t3);margin-bottom:12px">Banka ekstrenizi yükleyin. Sistem ödeme kayıtlarıyla otomatik eşleştirir.</p>'
    + '<div class="fr"><div class="fl">BANKA</div>'
    + '<select class="fi" id="mut-banka"><option value="">— Seçin —</option>'
    + ['Garanti','İş Bankası','Yapı Kredi','Ziraat','Halkbank','Vakıfbank','Akbank','Diğer'].map(b=>'<option>'+b+'</option>').join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">DÖNEM</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<input type="date" class="fi" id="mut-from"><input type="date" class="fi" id="mut-to"></div></div>'
    + '<div class="fr"><div class="fl">EKSTRE DOSYASI (CSV / XLSX)</div>'
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
  mo.className = 'mo'; mo.style.zIndex = '2300';
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
// INLINE SATIR DÜZENLEME — Ödeme + Tahsilat
// ════════════════════════════════════════════════════════════════

var _ODM_INL_ST = 'font-size:11px;padding:3px 6px;border:1px solid var(--b);border-radius:4px;background:var(--s);color:var(--t);font-family:inherit;width:100%;box-sizing:border-box';

/**
 * Ödeme listesinin altına inline yeni satır ekler.
 */
window._odmAddInlineRow = function() {
  if (document.getElementById('odm-inline-new')) {
    document.getElementById('odm-inline-new')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  var cont = document.getElementById('odm-list');
  if (!cont) return;

  var catOpts = '<option value="diger">Diğer</option>' + Object.entries(ODM_CATS).map(function(e) { return '<option value="' + e[0] + '">' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('');

  var row = document.createElement('div');
  row.id = 'odm-inline-new';
  row.style.cssText = 'display:grid;grid-template-columns:28px 1fr 110px 100px 90px 130px;gap:0;padding:8px 16px;border:2px solid rgba(99,102,241,.2);background:rgba(99,102,241,.04);align-items:center';
  row.innerHTML = '<div></div>'
    + '<div><input id="odi-name" placeholder="Ödeme adı *" style="' + _ODM_INL_ST + '" tabindex="1"></div>'
    + '<div><input type="number" id="odi-amount" placeholder="Tutar *" style="' + _ODM_INL_ST + '" tabindex="2"></div>'
    + '<div><input type="date" id="odi-due" style="' + _ODM_INL_ST + '" tabindex="3"></div>'
    + '<div><select id="odi-cat" style="' + _ODM_INL_ST + '" tabindex="4">' + catOpts + '</select></div>'
    + '<div style="display:flex;gap:3px">'
      + '<button onclick="window._odmInlineSave?.()" class="btn btnp" style="font-size:10px;padding:2px 8px">✓</button>'
      + '<button onclick="document.getElementById(\'odm-inline-new\')?.remove()" class="btn btns" style="font-size:10px;padding:2px 6px">✗</button>'
    + '</div>';

  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._odmInlineSave?.(); }
    if (e.key === 'Escape') { row.remove(); }
  });

  cont.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth' });
  setTimeout(function() { document.getElementById('odi-name')?.focus(); }, 50);
};

/**
 * Inline ödeme satırını kaydeder.
 */
window._odmInlineSave = function() {
  var name   = (document.getElementById('odi-name')?.value || '').trim();
  var amount = parseFloat(document.getElementById('odi-amount')?.value || '0') || 0;
  var due    = document.getElementById('odi-due')?.value || '';
  var cat    = document.getElementById('odi-cat')?.value || 'diger';

  if (!name) { window.toast?.('Ödeme adı zorunlu', 'err'); document.getElementById('odi-name').style.borderColor = '#EF4444'; return; }
  if (!amount) { window.toast?.('Tutar zorunlu', 'err'); document.getElementById('odi-amount').style.borderColor = '#EF4444'; return; }

  var d = window.loadOdm ? loadOdm() : [];
  var cu = _CUo();
  var newEntry = {
    id: generateNumericId(), name: name, cat: cat, freq: 'teksefer',
    amount: amount, currency: 'TRY', due: due, note: '', paid: false,
    alarmDays: 3, ts: _nowTso(), createdBy: cu?.id, source: 'inline',
  };
  if (_isAdminO()) { newEntry.approved = true; newEntry.approvalStatus = 'approved'; }
  else { newEntry.approvalStatus = 'pending'; }
  d.unshift(newEntry);
  window.storeOdm ? storeOdm(d) : null;
  document.getElementById('odm-inline-new')?.remove();
  renderOdemeler();
  window.toast?.('Ödeme eklendi ✓', 'ok');
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

  var catOpts = Object.entries(ODM_CATS).map(function(e) { return '<option value="' + e[0] + '"' + (o.cat === e[0] ? ' selected' : '') + '>' + e[1].ic + ' ' + e[1].l + '</option>'; }).join('');

  row.style.background = 'rgba(99,102,241,.04)';
  row.innerHTML = '<div></div>'
    + '<div><input id="ode-name-' + id + '" value="' + (o.name || '') + '" style="' + _ODM_INL_ST + '" tabindex="1"></div>'
    + '<div><input type="number" id="ode-amount-' + id + '" value="' + (o.amount || '') + '" style="' + _ODM_INL_ST + '" tabindex="2"></div>'
    + '<div><input type="date" id="ode-due-' + id + '" value="' + (o.due || '') + '" style="' + _ODM_INL_ST + '" tabindex="3"></div>'
    + '<div><select id="ode-cat-' + id + '" style="' + _ODM_INL_ST + '" tabindex="4">' + catOpts + '</select></div>'
    + '<div style="display:flex;gap:3px">'
      + '<button onclick="window._odmInlineRowSave?.(' + id + ')" class="btn btnp" style="font-size:10px;padding:2px 8px">✓</button>'
      + '<button onclick="renderOdemeler()" class="btn btns" style="font-size:10px;padding:2px 6px">✗</button>'
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
  if (!name) { window.toast?.('Ad zorunlu', 'err'); return; }
  o.name   = name;
  o.amount = parseFloat(document.getElementById('ode-amount-' + id)?.value || '0') || o.amount;
  o.due    = document.getElementById('ode-due-' + id)?.value || o.due;
  o.cat    = document.getElementById('ode-cat-' + id)?.value || o.cat;
  o.ts     = _nowTso();
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  window.toast?.('Güncellendi ✓', 'ok');
};

/**
 * Tahsilat listesine inline yeni satır ekler.
 */
window._tahAddInlineRow = function() {
  if (document.getElementById('tah-inline-new')) return;
  var cont = document.getElementById('odm-list');
  if (!cont) return;
  var row = document.createElement('div');
  row.id = 'tah-inline-new';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 120px 90px 100px;padding:9px 16px;border:2px solid rgba(16,185,129,.2);background:rgba(16,185,129,.04);align-items:center;gap:0';
  row.innerHTML = ''
    + '<div><input id="thi-name" placeholder="Tahsilat adı *" style="' + _ODM_INL_ST + '" tabindex="1"></div>'
    + '<div><input type="number" id="thi-amount" placeholder="Tutar *" style="' + _ODM_INL_ST + '" tabindex="2"></div>'
    + '<div><input type="date" id="thi-due" style="' + _ODM_INL_ST + '" tabindex="3"></div>'
    + '<div style="display:flex;gap:3px">'
      + '<button onclick="window._tahInlineSave?.()" class="btn btnp" style="font-size:10px;padding:2px 8px;background:#10B981;border-color:#10B981">✓</button>'
      + '<button onclick="document.getElementById(\'tah-inline-new\')?.remove()" class="btn btns" style="font-size:10px;padding:2px 6px">✗</button>'
    + '</div>';
  row.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window._tahInlineSave?.(); }
    if (e.key === 'Escape') { row.remove(); }
  });
  cont.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth' });
  setTimeout(function() { document.getElementById('thi-name')?.focus(); }, 50);
};

/**
 * Inline tahsilat kaydeder.
 */
window._tahInlineSave = function() {
  var name   = (document.getElementById('thi-name')?.value || '').trim();
  var amount = parseFloat(document.getElementById('thi-amount')?.value || '0') || 0;
  var due    = document.getElementById('thi-due')?.value || '';
  if (!name) { window.toast?.('Ad zorunlu', 'err'); return; }
  if (!amount) { window.toast?.('Tutar zorunlu', 'err'); return; }
  var d = typeof loadTahsilat === 'function' ? loadTahsilat() : [];
  d.unshift({
    id: generateNumericId(), name: name, amount: amount, due: due,
    from: '', collected: false, ts: _nowTso(), createdBy: _CUo()?.id,
    approvalStatus: _isAdminO() ? 'approved' : 'pending',
  });
  if (typeof storeTahsilat === 'function') storeTahsilat(d);
  document.getElementById('tah-inline-new')?.remove();
  renderOdemeler();
  window.toast?.('Tahsilat eklendi ✓', 'ok');
};


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
}
