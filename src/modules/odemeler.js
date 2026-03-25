/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v9.0.0
 * Rutin Ödemeler — Kullanıcı Atama, Alarm, Dekont, Excel Import/Export
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _go    = id  => document.getElementById(id);
const _sto   = (id,v) => { const el = _go(id); if (el) el.textContent = v; };
const _p2o   = n   => String(n).padStart(2,'0');
const _nowTso = () => { const n=new Date(); return `${n.getFullYear()}-${_p2o(n.getMonth()+1)}-${_p2o(n.getDate())} ${_p2o(n.getHours())}:${_p2o(n.getMinutes())}:${_p2o(n.getSeconds())}`; };
const _isAdminO = () => window.Auth?.getCU?.()?.role === 'admin' || window.Auth?.getCU?.()?.role === 'manager';
const _CUo      = () => window.Auth?.getCU?.();
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
        '<div style="font-size:14px;font-weight:600;color:var(--t)">Rutin Ödemeler</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:1px" id="odm-sub-title">Yükleniyor...</div>',
      '</div>',
      '<div style="display:flex;gap:6px;align-items:center">',
        '<button class="btn btns" onclick="openOdmChart()" style="border-radius:8px;font-size:11px">Grafik</button>',
        '<button class="btn btns" onclick="exportOdmXlsx()" style="border-radius:8px;font-size:11px">Excel</button>',
        '<button class="btn btns" onclick="_go(\'odm-import-file\').click()" style="border-radius:8px;font-size:11px">Yükle</button>',
        '<input type="file" id="odm-import-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="processOdmImport(this)">',
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
  const tabIds = ['all','gecikti','bekliyor','ay','abonelik','kredi_k','tahsilat'];
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
  if (thead) thead.style.display = (tab==='kredi_k'||tab==='abonelik'||tab==='tahsilat') ? 'none' : 'grid';
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
  const today   = _todayStr();
  const todayD  = new Date(today);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0,10);
  const thisMonth  = today.slice(0,7);

  const all = window.loadOdm ? loadOdm() : [];

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
    if (_odmCurrentTab === 'bekliyor' && st !== 'bekliyor' && st !== 'yaklasan') return false;
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
    if (chipStatus === 'pending-approval' && o.approvalStatus !== 'pending') return false;

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
  const totalAmt = all.reduce((s,o) => s + (parseFloat(o.amount)||0), 0);

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
          + '<div style="font-size:10px;color:var(--t3);margin-top:1px">' + cat.l + ' · ' + freq + (assigned?' · '+assigned.name:'') + (o.talimat?.banka?' · '+o.talimat.banka:'') + (noReceipt?' · <span style="color:var(--amt)">📎 eksik</span>':'') + (o.currency&&o.currency!=='TRY'?' · '+o.currency:'') + '</div>'
        + '</div>'
      + '</div>'
      + '<div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + curSym + (parseFloat(o.amount)||0).toLocaleString('tr-TR',{maximumFractionDigits:0}) + '</div>'
        + (o.recurringRule ? '<div style="font-size:9px;color:var(--ac)">🔁 Tekrarlayan</div>' : '')
      + '</div>'
      + '<div>'
        + '<div style="font-size:11px;font-weight:500;color:'+dueColor+'">' + (o.due||'—') + '</div>'
        + '<div style="font-size:10px;color:var(--t3)">' + diffTxt + '</div>'
      + '</div>'
      + '<div>'
        + '<span class="badge ' + sta.cls + '" style="font-size:10px">' + sta.ic + ' ' + sta.l + '</span>'
        + (o.approvalNeeded && !o.approved ? '<div style="font-size:9px;color:var(--amt);margin-top:2px">⏳ Onay bekliyor</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:3px;flex-shrink:0">'
        + (!o.paid
          ? (o.approvalNeeded && !o.approved
            ? '<button onclick="requestOdmApproval('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 8px;color:var(--amt)">Onay İste</button>'
            : '<button onclick="markOdmPaid('+o.id+');event.stopPropagation()" class="btn btnp" style="font-size:10px;border-radius:6px;padding:3px 9px;white-space:nowrap">✓ Ödendi</button>')
          : '<button onclick="toggleOdmPaid('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 7px">↩</button>')
        + (o.paid && !o.receipt ? '<button onclick="uploadOdmReceipt('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 6px;color:var(--amt)">📎</button>' : '')
        + '<button onclick="viewOdmHistory('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 5px;border-radius:6px" title="Geçmiş & Not">📋</button>'
        + ((o.cat==='abonelik'||o.cat==='fatura') ? '<button onclick="openOdmTalimatModal('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 5px;border-radius:6px;color:'+(o.talimat?.durum==='aktif'?'#10B981':'var(--t3)')+'" title="Ödeme Talimatı">🏦</button>' : '')
        + (o.approvalStatus==='pending' && _isAdminO() ? '<button onclick="approveOdm('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 7px;border-radius:6px;color:var(--grt)" title="Onayla">✓</button>' : '')
        + '<button onclick="openOdmModal('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 6px;border-radius:6px">✏️</button>'
        + (_isAdminO() ? '<button onclick="delOdm('+o.id+');event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 6px;border-radius:6px;color:var(--rdt)">🗑</button>' : '')
      + '</div>';

    frag.appendChild(card);
  });

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

    // Gerçekleşen / Planlanan
    + '<div style="display:flex;background:var(--s2);border-radius:9px;padding:3px;gap:2px">'
    + '<button id="odm-btn-gercek" onclick="_odmSetType(false)" style="flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;background:' + (!(o?.planned)?'var(--sf)':'none') + ';color:' + (!(o?.planned)?'var(--ac)':'var(--t3)') + '">💳 Gerçekleşen</button>'
    + '<button id="odm-btn-plan" onclick="_odmSetType(true)" style="flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;background:' + (o?.planned?'var(--sf)':'none') + ';color:' + (o?.planned?'#6366F1':'var(--t3)') + '">📅 Planlanan</button>'
    + '</div>'
    + '<input type="hidden" id="odm-f-planned" value="' + (o?.planned?'1':'0') + '">'

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
    + '<div class="fr" id="odm-actual-wrap" style="opacity:' + (o?.planned?'.4':'1') + '"><div class="fl">ÖDENDİĞİ TARİH</div>'
    + '<input type="date" class="fi" id="odm-f-actual" value="' + (o?o.actualDate||'':'') + '"' + (o?.planned?' disabled':'') + '></div>'
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
    + '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:500">Tekrarlayan ödeme</span><label class="psw"><input type="checkbox" id="odm-f-recurring"' + (o&&o.recurringRule?' checked':'') + '><span class="psl"></span></label></div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:500">Yönetici onayı gereksin</span><label class="psw"><input type="checkbox" id="odm-f-approval"' + (o&&o.approvalNeeded?' checked':'') + '><span class="psl"></span></label></div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:500">Ödendi olarak işaretle</span><label class="psw"><input type="checkbox" id="odm-f-paid"' + (o&&o.paid?' checked':'') + '><span class="psl"></span></label></div>'
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


// Ödeme formu helpers
function _odmSetType(isPlanned) {
  document.getElementById('odm-f-planned').value = isPlanned ? '1' : '0';
  const btn1 = document.getElementById('odm-btn-gercek');
  const btn2 = document.getElementById('odm-btn-plan');
  const wrap = document.getElementById('odm-actual-wrap');
  const act  = document.getElementById('odm-f-actual');
  if (btn1) { btn1.style.background = isPlanned?'none':'var(--sf)'; btn1.style.color = isPlanned?'var(--t3)':'var(--ac)'; }
  if (btn2) { btn2.style.background = isPlanned?'var(--sf)':'none'; btn2.style.color = isPlanned?'#6366F1':'var(--t3)'; }
  if (wrap) wrap.style.opacity = isPlanned ? '.4' : '1';
  if (act)  act.disabled = isPlanned;
}
window._odmSetType = _odmSetType;

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
  const name = (_go('odm-f-name')?.value || '').trim();
  if (!name) { window.toast?.('Ödeme adı zorunludur', 'err'); return; }
  const eid  = parseInt(_go('odm-f-eid')?.value || '0');
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
    planned:        _go('odm-f-planned')?.value === '1',
    note:           _go('odm-f-note')?.value     || '',
    paid:           !!_go('odm-f-paid')?.checked,
    alarmDays:      parseInt(_go('odm-f-alarm')?.value || '3'),
    assignedTo:     parseInt(_go('odm-f-assigned')?.value || '0') || null,
    recurringRule:  !!_go('odm-f-recurring')?.checked,
    approvalNeeded: !!_go('odm-f-approval')?.checked,
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
      Object.assign(o, entry);
    }
  } else {
    d.unshift({ id: Date.now(), ...entry, createdBy: _CUo()?.id });
  }
  window.storeOdm ? storeOdm(d) : null;
  _go('mo-odm-v9')?.remove();
  renderOdemeler();
  window.logActivity?.('view', `"${name}" ödeme ${eid?'güncellendi':'eklendi'}`);
  window.toast?.(eid ? 'Güncellendi ✓' : 'Ödeme eklendi ✓', 'ok');
}

function markOdmPaid(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.paid   = true;
  o.paidTs = _nowTso();
  o.paidBy = _CUo()?.id;
  window.storeOdm ? storeOdm(d) : null;
  _logOdmAction(id, 'Odendi isaretlendi');
  renderOdemeler();
  localStorage.removeItem('odm_alarm_late_' + id);
  window.toast?.('✅ Ödendi olarak işaretlendi', 'ok');

  // Dekont uyarısı
  setTimeout(() => {
    window.toast?.('📎 Lütfen dekontu yüklemeyi unutmayın', 'warn');
    window.addNotif?.('📎', `"${o.name}" için dekont yüklenmedi`, 'warn', 'odemeler');
  }, 1500);
}

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
  if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;
  window.storeOdm ? storeOdm(loadOdm().filter(x => x.id !== id)) : null;
  renderOdemeler();
  window.toast?.('Silindi', 'ok');
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
  XLSX.utils.book_append_sheet(wb, ws, 'Rutin Ödemeler');
  XLSX.writeFile(wb, 'rutin-odemeler-' + _todayStr() + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
  window.logActivity?.('view', 'Rutin ödemeler Excel olarak indirildi');
}

function processOdmImport(inp) {
  const file = inp?.files?.[0]; if (!file) return;
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  const r = new FileReader();
  r.onload = function(e) {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) { window.toast?.('Dosyada veri bulunamadı', 'err'); return; }

      // Başlık satırını bul
      const header = rows[0].map(h => String(h||'').toLowerCase().trim());
      const col    = key => header.findIndex(h => h.includes(key));

      const nameCol   = col('ad') > -1 ? col('ad') : col('name');
      const catCol    = col('kategori') > -1 ? col('kategori') : col('cat');
      const amountCol = col('tutar') > -1 ? col('tutar') : col('amount');
      const dueCol    = col('tarih') > -1 ? col('tarih') : col('due');
      const freqCol   = col('sıklık') > -1 ? col('sıklık') : col('freq');
      const noteCol   = col('not') > -1 ? col('not') : col('note');

      if (nameCol < 0) { window.toast?.('Başlık satırında "Ödeme Adı" kolonu bulunamadı', 'err'); return; }

      const catKeys = Object.keys(ODM_CATS);
      const freqKeys = Object.keys(ODM_FREQ);

      const existing = window.loadOdm ? loadOdm() : [];
      let added = 0;

      rows.slice(1).forEach(row => {
        if (!row || !row[nameCol]) return;
        const name = String(row[nameCol]||'').trim();
        if (!name) return;

        // Kategori eşleştir
        let cat = 'diger';
        if (catCol > -1) {
          const catVal = String(row[catCol]||'').toLowerCase();
          const found  = catKeys.find(k => catVal.includes(k) || catVal.includes(ODM_CATS[k].l.toLowerCase()));
          if (found) cat = found;
        }

        // Sıklık eşleştir
        let freq = 'aylik';
        if (freqCol > -1) {
          const freqVal = String(row[freqCol]||'').toLowerCase();
          const found   = freqKeys.find(k => freqVal.includes(k) || freqVal.includes(ODM_FREQ[k].toLowerCase()));
          if (found) freq = found;
        }

        // Tarih format
        let due = '';
        if (dueCol > -1 && row[dueCol]) {
          const dv = row[dueCol];
          if (typeof dv === 'number') {
            // Excel serial date
            const d = new Date(Math.round((dv - 25569) * 86400 * 1000));
            due = d.toISOString().slice(0,10);
          } else {
            const parsed = new Date(String(dv));
            if (!isNaN(parsed)) due = parsed.toISOString().slice(0,10);
          }
        }

        existing.unshift({
          id:        Date.now() + added,
          name,
          cat,
          freq,
          amount:    amountCol > -1 ? (parseFloat(row[amountCol])||0) : 0,
          due,
          note:      noteCol > -1 ? (row[noteCol]||'') : '',
          paid:      false,
          alarmDays: 3,
          ts:        _nowTso(),
          createdBy: _CUo()?.id,
        });
        added++;
      });

      window.storeOdm ? storeOdm(existing) : null;
      renderOdemeler();
      window.toast?.(`${added} ödeme içe aktarıldı ✓`, 'ok');
      window.logActivity?.('view', `Excel'den ${added} ödeme aktarıldı`);
    } catch (err) {
      window.toast?.('Import hatası: ' + err.message, 'err');
    }
    inp.value = '';
  };
  r.readAsBinaryString(file);
}

// Eski API uyumluluğu
function importOdmFile() { _go('odm-import-file')?.click(); }

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
      d.push({ ...o, id: Date.now() + Math.random(), paid: false, paidTs: null, receipt: null, due: nextStr, createdAt: _nowTso() });
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
        const t={id:Date.now(),name:_go('tah-name').value,amount:parseFloat(_go('tah-amt').value)||0,due:_go('tah-due').value,from:'',createdAt:_nowTso()};
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
      id: Date.now() + added,
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
  const isPlanned = o ? !!o.planned : false;

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
  html += '<div style="font-size:10px;opacity:.7;margin-top:2px">Gerçekleşen veya planlanan tahsilatı kaydedin</div></div>';
  html += '<button onclick="_go("mo-tahsilat")?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:18px">×</button></div>';
  html += '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px;max-height:74vh;overflow-y:auto">';

  // Gerçekleşen / Planlanan toggle
  html += '<div style="display:flex;background:var(--s2);border-radius:9px;padding:3px;gap:2px">';
  html += '<button id="tah-btn-gercek" onclick="_tahSetType(false)" style="flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;background:' + (!isPlanned?'var(--sf)':'none') + ';color:' + (!isPlanned?'#0F6E56':'var(--t3)') + '">✅ Gerçekleşen</button>';
  html += '<button id="tah-btn-plan" onclick="_tahSetType(true)" style="flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;background:' + (isPlanned?'var(--sf)':'none') + ';color:' + (isPlanned?'#6366F1':'var(--t3)') + '">📅 Planlanan</button>';
  html += '</div><input type="hidden" id="tah-f-planned" value="' + (isPlanned?'1':'0') + '">';

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
  html += '<div class="fr" id="tah-gercek-wrap" style="opacity:' + (isPlanned?'.4':'1') + '"><div class="fl">GERÇEKLEŞEN TARİH</div><input type="date" class="fi" id="tah-f-actual" value="' + (o?o.actualDate||'':'') + '"' + (isPlanned?' disabled':'') + '></div></div>';

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

function _tahSetType(isPlanned) {
  document.getElementById('tah-f-planned').value = isPlanned ? '1' : '0';
  const btn1 = document.getElementById('tah-btn-gercek');
  const btn2 = document.getElementById('tah-btn-plan');
  const wrap = document.getElementById('tah-gercek-wrap');
  const act  = document.getElementById('tah-f-actual');
  if (btn1) { btn1.style.background = isPlanned?'none':'var(--sf)'; btn1.style.color = isPlanned?'var(--t3)':'#0F6E56'; }
  if (btn2) { btn2.style.background = isPlanned?'var(--sf)':'none'; btn2.style.color = isPlanned?'#6366F1':'var(--t3)'; }
  if (wrap) wrap.style.opacity = isPlanned ? '.4' : '1';
  if (act)  act.disabled = isPlanned;
}
window._tahSetType = _tahSetType;

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
    planned:    document.getElementById('tah-f-planned')?.value === '1',
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
    d.unshift({ id: Date.now(), ...entry, createdBy: _CUo()?.id });
  }
  storeTahsilat(d);
  document.getElementById('mo-tahsilat')?.remove();
  window.toast?.(eid ? 'Güncellendi ✓' : 'Tahsilat eklendi ✓', 'ok');
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
  const d = window.loadOdm ? loadOdm() : [];
  const now = _nowTso();

  // Avans ödemesi
  if (purchase.advanceAmount && purchase.advanceDate) {
    d.unshift({
      id: Date.now(),
      name: purchase.name + ' — Avans',
      source: 'satinalma',
      cat: 'diger', freq: 'teksefer',
      amount: purchase.advanceAmount,
      due: purchase.advanceDate,
      note: 'Satınalma #' + purchase.id + ' avans ödemesi',
      paid: false, alarmDays: 3,
      assignedTo: purchase.assignedTo || null,
      purchaseId: purchase.id,
      ts: now, createdBy: _CUo()?.id,
    });
  }

  // Bakiye ödemesi
  const balance = purchase.totalAmount - (purchase.advanceAmount || 0);
  if (balance > 0 && purchase.balanceDate) {
    d.unshift({
      id: Date.now() + 1,
      name: purchase.name + ' — Bakiye',
      source: 'satinalma',
      cat: 'diger', freq: 'teksefer',
      amount: balance,
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
  if (!confirm('Otomatik ödeme talimatını kaldırmak istiyor musunuz?')) return;
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

window.openOdmTalimatModal = openOdmTalimatModal;
window.saveOdmTalimat      = saveOdmTalimat;
window.removeOdmTalimat    = removeOdmTalimat;

// ════════════════════════════════════════════════════════════════
// YÖNETİCİ ONAY AKIŞI — Abonelik & otomatik hariç
// ════════════════════════════════════════════════════════════════
const ODM_AUTO_CATS = ['abonelik', 'fatura']; // Bunlar onay gerektirmez

function _odmNeedsApproval(o) {
  if (ODM_AUTO_CATS.includes(o.cat)) return false;
  if (o.source === 'otomatik') return false;
  if (o.talimat?.durum === 'aktif') return false;
  return o.approvalNeeded || (parseFloat(o.amount) >= 5000 && !o.approved);
}

function approveOdm(id) {
  if (!window.Auth?.getCU?.()?.role || !['admin','manager'].includes(window.Auth.getCU().role)) {
    window.toast?.('Bu işlem için yönetici yetkisi gerekli', 'err'); return;
  }
  const all = window.loadOdm ? loadOdm() : [];
  const o = all.find(x => x.id === id); if (!o) return;
  o.approvalStatus = 'approved';
  o.approved       = true;
  o.approvedBy     = window.Auth.getCU().id;
  o.approvedAt     = _nowTso();
  window.storeOdm ? storeOdm(all) : null;
  window.toast?.('✅ Ödeme onaylandı', 'ok');
  renderOdemeler();
}
window.approveOdm = approveOdm;

const Odemeler = {
  render:      renderOdemeler,
  openModal:   openOdmModal,
  save:        saveOdm,
  del:         delOdm,
  togglePaid:  toggleOdmPaid,
  markPaid:    markOdmPaid,
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
