/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/hesap_makinesi.js  —  v1.0.0
 * 19 Modüllü Hesap Makinesi — Apple Minimalist Tasarım
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
var HM_BORC_KEY = 'ak_borc1';
var HM_REF_KEY  = 'ak_ref_prices1';
var HM_PORT_KEY = 'ak_portfolio1';
var HM_TEKLIF_KEY = 'ak_cmp_teklif1';

var HM_RATES = { USD: 38.50, EUR: 41.20, GBP: 48.90, ALTIN_GR: 3850, ALTIN_ONS: 2650 };

// TCMB'den kur çek — CORS proxy ile
(function _hmFetchRates() {
  fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.tcmb.gov.tr/kurlar/today.xml'))
    .then(function(r) { if (!r.ok) throw new Error('proxy'); return r.text(); })
    .then(function(xml) {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      doc.querySelectorAll('Currency').forEach(function(c) {
        var code = c.getAttribute('CurrencyCode');
        var buy = c.querySelector('ForexBuying');
        if (buy && buy.textContent) {
          var rate = parseFloat(buy.textContent.replace(',', '.'));
          if (code === 'USD' && rate > 0) HM_RATES.USD = rate;
          if (code === 'EUR' && rate > 0) HM_RATES.EUR = rate;
          if (code === 'GBP' && rate > 0) HM_RATES.GBP = rate;
        }
      });
    }).catch(function() {
      fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json();}).then(function(d) {
        if (d && d.rates && d.rates.TRY) { HM_RATES.USD = Math.round(d.rates.TRY*100)/100; HM_RATES.EUR = Math.round(d.rates.TRY/(d.rates.EUR||1)*100)/100; HM_RATES.GBP = Math.round(d.rates.TRY/(d.rates.GBP||1)*100)/100; }
      }).catch(function(){});
    });
})();

// ── CRUD Helpers ─────────────────────────────────────────────────
function _hmLoad(key) { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch(e) { return []; } }
function _hmStore(key,d) { localStorage.setItem(key, JSON.stringify(d)); }
var _hmFmt = function(n) { return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}); };

// ── Modül Tanımları ──────────────────────────────────────────────
var HM_MODULES = [
  { id:'doviz',    icon:'💱', label:'Döviz Çevirici' },
  { id:'altin',    icon:'🥇', label:'Altın Hesap' },
  { id:'karzarar', icon:'📊', label:'Kâr/Zarar' },
  { id:'borc',     icon:'📒', label:'Borç/Alacak' },
  { id:'refiyat',  icon:'🏷', label:'Referans Fiyat' },
  { id:'kdv',      icon:'💰', label:'KDV Hesap' },
  { id:'doplan',   icon:'📅', label:'Dövizli Ödeme' },
  { id:'kurfark',  icon:'↔️', label:'Kur Farkı' },
  { id:'navlun',   icon:'🚢', label:'Navlun Maliyet' },
  { id:'eldeki',   icon:'💵', label:'Eldeki Para' },
  { id:'faiz',     icon:'🏦', label:'Faiz Hesap' },
  { id:'marj',     icon:'📈', label:'Kâr Marjı' },
  { id:'capraz',   icon:'🔄', label:'Çapraz Kur' },
  { id:'portfoy',  icon:'💼', label:'Portföy' },
  { id:'tarihsel', icon:'📆', label:'Tarihsel Kâr' },
  { id:'ihracat',  icon:'🌍', label:'İhracat Maliyet' },
  { id:'gecikme',  icon:'⏰', label:'Gecikme Faizi' },
  { id:'butce',    icon:'🎯', label:'Bütçe Kalan' },
  { id:'karsilastir', icon:'⚖️', label:'Karşılaştırmalı' },
  // PRO modüller — admin/manager only
  { id:'carry',      icon:'🔐', label:'Carry Trade',      pro: true },
  { id:'enflasyon',  icon:'🔐', label:'Enflasyon Arbitraj', pro: true },
  { id:'opsiyon',    icon:'🔐', label:'Döviz Opsiyon',    pro: true },
  { id:'tedfin',     icon:'🔐', label:'Tedarikçi Finans', pro: true },
  { id:'elastik',    icon:'🔐', label:'Fiyat Elastikiyet', pro: true },
  { id:'subvansiyon',icon:'🔐', label:'Çapraz Sübvansiyon', pro: true },
  { id:'kurkoruma',  icon:'🔐', label:'Kur Korumalı',     pro: true },
];

// ── Panel Inject ─────────────────────────────────────────────────
function _hmInjectPanel() {
  var p = document.getElementById('panel-hesap');
  if (!p || p.dataset.hmInjected) return;
  p.dataset.hmInjected = '1';

  var cu = window.Auth?.getCU?.();
  var isProUser = cu && (cu.role === 'admin' || cu.role === 'manager');
  var visibleMods = HM_MODULES.filter(function(m) { return !m.pro || isProUser; });
  var modCount = visibleMods.length;

  // Hızlı erişim tercihleri
  var HM_QUICK_KEY = 'ak_hm_quick_icons';
  var defaultQuick = ['doviz','marj','kurfark','navlun','faiz'];
  var quickIds = [];
  try { quickIds = JSON.parse(localStorage.getItem(HM_QUICK_KEY) || 'null') || defaultQuick; } catch(e) { quickIds = defaultQuick; }

  p.innerHTML = ''
    + '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
    // TOPBAR
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">🧮 Hesap Makinesi</div><div style="font-size:10px;color:var(--t3);margin-top:2px">' + modCount + ' modül</div></div>'
      + '<div style="font-size:10px;color:var(--t3)">USD: ₺' + _hmFmt(HM_RATES.USD) + ' · EUR: ₺' + _hmFmt(HM_RATES.EUR) + ' · Altın: ₺' + _hmFmt(HM_RATES.ALTIN_GR) + '/gr</div>'
    + '</div>'
    // HIZLI ERİŞİM İKON ÇUBUĞU
    + '<div style="display:flex;align-items:center;gap:4px;padding:6px 20px;border-bottom:0.5px solid var(--b);overflow-x:auto;scrollbar-width:none" id="hm-quick-bar">'
      + '<style>#hm-quick-bar::-webkit-scrollbar{display:none}</style>'
      + quickIds.map(function(qid) {
          var mod = HM_MODULES.find(function(m) { return m.id === qid; });
          if (!mod) return '';
          return '<button onclick="window._hmSelectModule(\'' + qid + '\')" title="' + mod.label + '" style="width:28px;height:28px;border-radius:50%;border:none;background:var(--s2);cursor:pointer;font-size:14px;flex-shrink:0;transition:all .12s;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background=\'var(--al)\'" onmouseout="this.style.background=\'var(--s2)\'">' + mod.icon + '</button>';
        }).join('')
      + '<button onclick="window._openHmQuickSettings?.()" title="Düzenle" style="width:28px;height:28px;border-radius:50%;border:0.5px dashed var(--b);background:none;cursor:pointer;font-size:11px;flex-shrink:0;color:var(--t3);display:flex;align-items:center;justify-content:center" onmouseover="this.style.borderColor=\'var(--ac)\';this.style.color=\'var(--ac)\'" onmouseout="this.style.borderColor=\'var(--b)\';this.style.color=\'var(--t3)\'">⚙</button>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;min-height:calc(100vh - 120px)">'
      // Sol: modül grid
      + '<div style="width:280px;border-right:1px solid #F0F0F0;padding:16px;overflow-y:auto;flex-shrink:0">'
        + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
        + visibleMods.map(function(m) {
            var proBadge = m.pro ? '<div style="font-size:7px;background:#007AFF;color:#fff;border-radius:3px;padding:1px 4px;display:inline-block;margin-top:2px">PRO</div>' : '';
            return '<button class="hm-mod-btn" data-hm="' + m.id + '" onclick="window._hmSelectModule(\'' + m.id + '\')" style="background:#fff;border:1.5px solid ' + (m.pro ? 'rgba(0,122,255,.2)' : '#F0F0F0') + ';border-radius:12px;padding:12px 6px;cursor:pointer;text-align:center;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'#007AFF\'" onmouseout="if(!this.classList.contains(\'hm-active\'))this.style.borderColor=\'' + (m.pro ? 'rgba(0,122,255,.2)' : '#F0F0F0') + '\'">'
              + '<div style="font-size:22px;margin-bottom:4px">' + m.icon + '</div>'
              + '<div style="font-size:9px;color:#1C1C1E;font-weight:500;line-height:1.2">' + m.label + '</div>'
              + proBadge
            + '</button>';
          }).join('')
        + '</div>'
      + '</div>'
      // Sağ: hesaplama paneli
      + '<div id="hm-calc-area" style="flex:1;padding:24px;overflow-y:auto;background:#FAFAFA"></div>'
    + '</div>';
}

// ── Modül Seçimi ─────────────────────────────────────────────────
window._hmSelectModule = function(id) {
  document.querySelectorAll('.hm-mod-btn').forEach(function(b) {
    var active = b.dataset.hm === id;
    b.classList.toggle('hm-active', active);
    b.style.borderColor = active ? '#007AFF' : '#F0F0F0';
    b.style.background = active ? 'rgba(0,122,255,.06)' : '#fff';
  });
  var area = document.getElementById('hm-calc-area');
  if (!area) return;
  var fn = _hmRenderers[id];
  if (fn) fn(area); else area.innerHTML = '<div style="padding:40px;text-align:center;color:#8E8E93">Modül yükleniyor...</div>';
};

/** Hızlı erişim ikon ayarları */
window._openHmQuickSettings = function() {
  var HM_QUICK_KEY = 'ak_hm_quick_icons';
  var defaultQuick = ['doviz','marj','kurfark','navlun','faiz'];
  var current = [];
  try { current = JSON.parse(localStorage.getItem(HM_QUICK_KEY) || 'null') || defaultQuick; } catch(e) { current = defaultQuick; }
  var cu = window.Auth?.getCU?.();
  var isProUser = cu && (cu.role === 'admin' || cu.role === 'manager');
  var avail = HM_MODULES.filter(function(m) { return !m.pro || isProUser; });

  var ex = document.getElementById('mo-hm-quick'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-hm-quick';
  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">⚙ Hızlı Erişim Ayarları</div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">Çubukta görmek istediğiniz modülleri seçin (maks 8)</div>'
    + avail.map(function(m) {
        var checked = current.indexOf(m.id) !== -1;
        return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid var(--b);cursor:pointer;font-size:12px">'
          + '<input type="checkbox" class="hm-qk-cb" value="' + m.id + '"' + (checked ? ' checked' : '') + ' style="accent-color:var(--ac)">'
          + '<span style="font-size:16px">' + m.icon + '</span> ' + m.label + '</label>';
      }).join('')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-hm-quick\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveHmQuick()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._saveHmQuick = function() {
  var selected = [];
  document.querySelectorAll('.hm-qk-cb:checked').forEach(function(cb) { selected.push(cb.value); });
  if (selected.length > 8) { window.toast?.('Maksimum 8 ikon seçebilirsiniz', 'err'); return; }
  localStorage.setItem('ak_hm_quick_icons', JSON.stringify(selected));
  document.getElementById('mo-hm-quick')?.remove();
  // Panel'i yeniden inject et
  var p = document.getElementById('panel-hesap');
  if (p) { p.dataset.hmInjected = ''; _hmInjectPanel(); }
  window.toast?.('Hızlı erişim güncellendi ✓', 'ok');
};

// ── Kart Wrapper ─────────────────────────────────────────────────
function _hmCard(title, content) {
  return '<div style="background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);padding:20px;margin-bottom:16px">'
    + '<div style="font-size:14px;font-weight:600;color:#1C1C1E;margin-bottom:14px">' + title + '</div>'
    + content + '</div>';
}
function _hmInput(id, label, type, placeholder, extra) {
  return '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">' + label + '</div>'
    + '<input type="' + (type||'number') + '" id="' + id + '" placeholder="' + (placeholder||'') + '" style="width:100%;padding:10px 12px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#1C1C1E;box-sizing:border-box" ' + (extra||'') + '></div>';
}
function _hmResult(id, label) {
  return '<div style="background:#F2F2F7;border-radius:10px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center">'
    + '<span style="font-size:12px;color:#8E8E93">' + label + '</span><span id="' + id + '" style="font-size:18px;font-weight:700;color:#1C1C1E">—</span></div>';
}

// ── Export Buttons Helper ─────────────────────────────────────────
function _hmExportButtons(modId) {
  return '<div style="display:flex;gap:6px;margin-top:12px;justify-content:flex-end">'
    + '<button onclick="window._hmExport?.(\'' + modId + '\',\'xlsx\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px">⬇ Excel</button>'
    + '<button onclick="window._hmExport?.(\'' + modId + '\',\'pdf\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px">📄 PDF</button>'
    + '<button onclick="window._hmExport?.(\'' + modId + '\',\'json\')" class="btn btns" style="font-size:10px;padding:3px 10px;border-radius:6px">{ } JSON</button>'
  + '</div>';
}

window._hmExport = function(modId, format) {
  var keyMap = { borc: HM_BORC_KEY, portfoy: HM_PORT_KEY, karsilastir: HM_TEKLIF_KEY, eldeki: HM_ELDEKI_KEY };
  var key = keyMap[modId]; if (!key) { window.toast?.('Export desteklenmiyor', 'err'); return; }
  var data = _hmLoad(key);
  if (!data.length) { window.toast?.('Veri yok', 'err'); return; }

  if (format === 'json') {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = modId + '_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    window.toast?.('JSON indirildi ✓', 'ok');
  } else if (format === 'xlsx' && typeof XLSX !== 'undefined') {
    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, modId);
    XLSX.writeFile(wb, modId + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
    window.toast?.('Excel indirildi ✓', 'ok');
  } else if (format === 'pdf') {
    var w = window.open('', '_blank', 'width=600,height=700');
    w.document.write('<!DOCTYPE html><html><head><title>' + modId + '</title><style>body{font-family:sans-serif;padding:30px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:12px}th{background:#f5f5f5}@media print{button{display:none!important}}</style></head><body>'
      + '<h2>' + modId.toUpperCase() + ' Raporu</h2><p style="color:#888">' + new Date().toLocaleDateString('tr-TR') + '</p>'
      + '<table><tr>' + Object.keys(data[0]||{}).map(function(k){return '<th>'+k+'</th>';}).join('') + '</tr>'
      + data.map(function(r){return '<tr>'+Object.values(r).map(function(v){return '<td>'+(v===null?'—':v)+'</td>';}).join('')+'</tr>';}).join('')
      + '</table><button onclick="window.print()" style="margin-top:20px;padding:8px 16px;background:#007AFF;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨 Yazdır</button></body></html>');
    w.document.close();
  } else {
    window.toast?.('Export formatı desteklenmiyor', 'err');
  }
};

// ── 19 MODÜL RENDERERLERİ ────────────────────────────────────────
var _hmRenderers = {};

// 50+ para birimi ISO 4217
var HM_ALL_CURRENCIES = [
  'TRY','USD','EUR','GBP','JPY','CNY','AED','SAR','CHF','CAD','AUD','NZD',
  'NOK','SEK','DKK','PLN','CZK','HUF','RON','BGN','HRK','RSD','UAH','GEL',
  'AMD','AZN','KZT','UZS','PKR','INR','BDT','LKR','MYR','IDR','THB','VND',
  'PHP','KRW','TWD','HKD','SGD','BRL','MXN','ARS','CLP','COP','PEN','ZAR',
  'NGN','GHS','EGP','XAU','XAU-ONS','BTC','ETH'
];

// Mock kur kaynaklari
var HM_KUR_SOURCES = {
  tcmb:   { label:'TCMB', usd: HM_RATES.USD, eur: HM_RATES.EUR, gbp: HM_RATES.GBP },
  harem:  { label:'Harem Altın', usd: HM_RATES.USD * 1.012, eur: HM_RATES.EUR * 1.015, gbp: HM_RATES.GBP * 1.01 },
  mt:     { label:'MT Döviz', usd: HM_RATES.USD * 0.995, eur: HM_RATES.EUR * 0.998, gbp: HM_RATES.GBP * 0.997 },
  kaynak: { label:'Altın Kaynak', usd: HM_RATES.USD * 1.005, eur: HM_RATES.EUR * 1.008, gbp: HM_RATES.GBP * 1.003 },
};

var HM_ELDEKI_KEY = 'ak_eldeki1';

// 1) Döviz Çevirici — 50+ Para Birimi
_hmRenderers.doviz = function(el) {
  var srcOpts = Object.entries(HM_KUR_SOURCES).map(function(e) { return '<option value="' + e[0] + '">' + e[1].label + '</option>'; }).join('');
  var curOpts = HM_ALL_CURRENCIES.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
  el.innerHTML = _hmCard('💱 Döviz Çevirici — 50+ Para Birimi',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-dv-amt','Tutar','number','1000','oninput="window._hmCalcDoviz?.()"')
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">KAYNAK</div><select id="hm-dv-from" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:13px;font-family:inherit" onchange="window._hmCalcDoviz?.()">' + curOpts + '</select></div>'
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">HEDEF</div><select id="hm-dv-to" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:13px;font-family:inherit" onchange="window._hmCalcDoviz?.()"><option value="TRY" selected>TRY</option>' + curOpts + '</select></div>'
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">KAYNAK</div><select id="hm-dv-src" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:13px;font-family:inherit" onchange="window._hmCalcDoviz?.()">' + srcOpts + '</select></div>'
    + '</div>'
    + _hmResult('hm-dv-result','Sonuç') + _hmResult('hm-dv-try','TL Karşılığı') + _hmResult('hm-dv-usd','USD') + _hmResult('hm-dv-eur','EUR')
    + '<div style="margin-top:12px;border:1px solid #F0F0F0;border-radius:10px;overflow:hidden">'
      + '<div style="padding:8px 12px;background:#F9FAFB;font-size:10px;font-weight:700;color:#8E8E93;border-bottom:1px solid #F0F0F0">Alış / Satış Spread</div>'
      + '<div id="hm-dv-spread" style="padding:8px 12px;font-size:11px"></div>'
    + '</div>'
  );
  window._hmCalcDoviz?.();
};
window._hmCalcDoviz = function() {
  var amt = parseFloat(document.getElementById('hm-dv-amt')?.value||'0')||0;
  var from = document.getElementById('hm-dv-from')?.value||'USD';
  var to = document.getElementById('hm-dv-to')?.value||'TRY';
  var srcKey = document.getElementById('hm-dv-src')?.value||'tcmb';
  var src = HM_KUR_SOURCES[srcKey] || HM_KUR_SOURCES.tcmb;
  var rates = { USD: src.usd, EUR: src.eur, GBP: src.gbp, TRY: 1, XAU: HM_RATES.ALTIN_GR, 'XAU-ONS': HM_RATES.ALTIN_ONS * HM_RATES.USD, BTC: 67000 * HM_RATES.USD, ETH: 3500 * HM_RATES.USD };
  var tlVal = amt * (rates[from]||1);
  var toRate = rates[to] || 1;
  var result = tlVal / toRate;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-dv-result', _hmFmt(result) + ' ' + to);
  _s('hm-dv-try', '₺' + _hmFmt(tlVal));
  _s('hm-dv-usd', '$' + _hmFmt(tlVal / (rates.USD||1)));
  _s('hm-dv-eur', '€' + _hmFmt(tlVal / (rates.EUR||1)));
  _s('hm-dv-gbp', '£' + _hmFmt(tlVal / (rates.GBP||1)));
  // Spread
  var sp = document.getElementById('hm-dv-spread');
  if (sp) {
    var spread = 0.015; // %1.5 tipik spread
    sp.innerHTML = '<div style="display:flex;gap:20px">'
      + '<span>USD Alış: ₺' + _hmFmt(src.usd*(1-spread)) + ' · Satış: ₺' + _hmFmt(src.usd*(1+spread)) + '</span>'
      + '<span>EUR Alış: ₺' + _hmFmt(src.eur*(1-spread)) + ' · Satış: ₺' + _hmFmt(src.eur*(1+spread)) + '</span>'
    + '</div>';
  }
};

// 2) Altın — Gelişmiş
var HM_ALTIN_UNITS = {
  gram:   { label:'Gram',   gr: 1 },
  ons:    { label:'Ons',    gr: 31.1035 },
  ceyrek: { label:'Çeyrek', gr: 1.75 },
  yarim:  { label:'Yarım',  gr: 3.5 },
  tam:    { label:'Tam',    gr: 7 },
  ata:    { label:'Ata',    gr: 7.22 },
};

_hmRenderers.altin = function(el) {
  var unitOpts = Object.entries(HM_ALTIN_UNITS).map(function(e) { return '<option value="' + e[0] + '">' + e[1].label + '</option>'; }).join('');
  el.innerHTML = _hmCard('🥇 Altın Hesaplayıcı — Gelişmiş',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-au-miktar','Miktar','number','10','oninput="window._hmCalcAltin?.()"')
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">BİRİM</div><select id="hm-au-unit" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:14px;font-family:inherit" onchange="window._hmCalcAltin?.()">' + unitOpts + '</select></div>'
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">PARA BİRİMİ</div><select id="hm-au-cur" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:14px;font-family:inherit" onchange="window._hmCalcAltin?.()"><option value="TRY">₺ TRY</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select></div>'
    + '</div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;cursor:pointer"><input type="checkbox" id="hm-au-iscilik" onchange="window._hmCalcAltin?.()" style="accent-color:#007AFF"> İşçilik payı dahil (%8)</label>'
    + _hmResult('hm-au-tl','Değer') + _hmResult('hm-au-gram','Gram Karşılığı')
    + '<div style="margin-top:12px;border:1px solid #F0F0F0;border-radius:10px;overflow:hidden"><div style="padding:8px 12px;background:#F9FAFB;font-size:10px;font-weight:700;color:#8E8E93;border-bottom:1px solid #F0F0F0">Birim Dönüşüm</div><div id="hm-au-matrix" style="padding:8px 12px;font-size:11px"></div></div>'
    + '<div style="margin-top:8px;font-size:10px;color:#8E8E93">Gram altın: ₺' + _hmFmt(HM_RATES.ALTIN_GR) + ' · Ons: $' + _hmFmt(HM_RATES.ALTIN_ONS) + '</div>'
  );
  window._hmCalcAltin?.();
};
window._hmCalcAltin = function() {
  var miktar = parseFloat(document.getElementById('hm-au-miktar')?.value||'0')||0;
  var unit = document.getElementById('hm-au-unit')?.value||'gram';
  var cur = document.getElementById('hm-au-cur')?.value||'TRY';
  var iscilik = document.getElementById('hm-au-iscilik')?.checked;
  var grPerUnit = (HM_ALTIN_UNITS[unit]||{gr:1}).gr;
  var totalGr = miktar * grPerUnit;
  var tlVal = totalGr * HM_RATES.ALTIN_GR;
  if (iscilik) tlVal *= 1.08;
  var val = cur === 'TRY' ? tlVal : cur === 'USD' ? tlVal / HM_RATES.USD : tlVal / HM_RATES.EUR;
  var sym = cur === 'TRY' ? '₺' : cur === 'USD' ? '$' : '€';
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-au-tl', sym + _hmFmt(val));
  _s('hm-au-gram', _hmFmt(totalGr) + ' gram');
  // Dönüşüm matrisi
  var mx = document.getElementById('hm-au-matrix');
  if (mx) mx.innerHTML = Object.entries(HM_ALTIN_UNITS).map(function(e) { return '<span style="display:inline-block;margin-right:12px">' + e[1].label + ': <b>' + (totalGr / e[1].gr).toFixed(2) + '</b></span>'; }).join('');
};

// 3) Kâr/Zarar
_hmRenderers.karzarar = function(el) {
  el.innerHTML = _hmCard('📊 Kâr/Zarar Hesaplama',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-kz-alis','Alış Fiyatı','number','100','oninput="window._hmCalcKZ?.()"')
      + _hmInput('hm-kz-satis','Satış Fiyatı','number','120','oninput="window._hmCalcKZ?.()"')
      + _hmInput('hm-kz-miktar','Miktar','number','10','oninput="window._hmCalcKZ?.()"')
    + '</div>'
    + _hmResult('hm-kz-net','Net Kâr/Zarar') + _hmResult('hm-kz-pct','Kâr Oranı %')
  );
};
window._hmCalcKZ = function() {
  var alis=parseFloat(document.getElementById('hm-kz-alis')?.value||'0')||0;
  var satis=parseFloat(document.getElementById('hm-kz-satis')?.value||'0')||0;
  var miktar=parseFloat(document.getElementById('hm-kz-miktar')?.value||'1')||1;
  var net=(satis-alis)*miktar; var pct=alis>0?((satis-alis)/alis*100):0;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-kz-net', (net>=0?'+':'') + '₺' + _hmFmt(net));
  _s('hm-kz-pct', (pct>=0?'+':'') + pct.toFixed(2) + '%');
  document.getElementById('hm-kz-net').style.color = net >= 0 ? '#16A34A' : '#DC2626';
  document.getElementById('hm-kz-pct').style.color = pct >= 0 ? '#16A34A' : '#DC2626';
};

// 6) KDV
_hmRenderers.kdv = function(el) {
  el.innerHTML = _hmCard('💰 KDV Hesaplayıcı',
    _hmInput('hm-kdv-amt','Tutar','number','1000','oninput="window._hmCalcKDV?.()"')
    + '<div style="display:flex;gap:6px;margin-bottom:10px">'
      + ['1','8','18','20'].map(function(r) { return '<button onclick="document.getElementById(\'hm-kdv-rate\').value=\'' + r + '\';window._hmCalcKDV?.()" class="btn btns" style="font-size:12px;padding:6px 14px;border-radius:8px">%' + r + '</button>'; }).join('')
      + '<input type="number" id="hm-kdv-rate" value="20" style="width:60px;padding:6px;border:1.5px solid #E5E5EA;border-radius:8px;font-size:12px;text-align:center" oninput="window._hmCalcKDV?.()">'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:10px"><label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="hm-kdv-mode" value="haric" checked onchange="window._hmCalcKDV?.()">KDV Hariç</label><label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="hm-kdv-mode" value="dahil" onchange="window._hmCalcKDV?.()">KDV Dahil</label></div>'
    + _hmResult('hm-kdv-kdv','KDV Tutarı') + _hmResult('hm-kdv-total','Toplam')
  );
};
window._hmCalcKDV = function() {
  var amt=parseFloat(document.getElementById('hm-kdv-amt')?.value||'0')||0;
  var rate=parseFloat(document.getElementById('hm-kdv-rate')?.value||'20')||20;
  var mode=document.querySelector('input[name="hm-kdv-mode"]:checked')?.value||'haric';
  var kdv,total;
  if (mode==='haric') { kdv=amt*rate/100; total=amt+kdv; } else { kdv=amt-amt/(1+rate/100); total=amt; }
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-kdv-kdv', '₺' + _hmFmt(kdv)); _s('hm-kdv-total', '₺' + _hmFmt(total));
};

// 5) Referans Fiyat
_hmRenderers.refiyat = function(el) {
  el.innerHTML = _hmCard('🏷 Referans Fiyat Karşılaştırma',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-rf-market','Piyasa Fiyatı','number','100','oninput="window._hmCalcRef?.()"')
      + _hmInput('hm-rf-own','Kendi Fiyatım','number','95','oninput="window._hmCalcRef?.()"')
    + '</div>' + _hmResult('hm-rf-diff','Fark') + _hmResult('hm-rf-pct','Fark %')
  );
};
window._hmCalcRef = function() {
  var m=parseFloat(document.getElementById('hm-rf-market')?.value||'0')||0;
  var o=parseFloat(document.getElementById('hm-rf-own')?.value||'0')||0;
  var diff=o-m; var pct=m>0?((o-m)/m*100):0;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-rf-diff',(diff>=0?'+':'')+_hmFmt(diff)+' ₺'); _s('hm-rf-pct',(pct>=0?'+':'')+pct.toFixed(2)+'%');
};

// 8) Kur Farkı
_hmRenderers.kurfark = function(el) {
  el.innerHTML = _hmCard('↔️ Kur Farkı Hesaplama',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-kf-amt','Tutar ($)','number','10000','oninput="window._hmCalcKF?.()"')
      + _hmInput('hm-kf-sipkur','Sipariş Kuru','number','32.5','oninput="window._hmCalcKF?.()"')
      + _hmInput('hm-kf-odmkur','Ödeme Kuru','number', String(HM_RATES.USD),'oninput="window._hmCalcKF?.()"')
    + '</div>' + _hmResult('hm-kf-diff','Kur Farkı') + _hmResult('hm-kf-total','Toplam TL Farkı')
  );
};
window._hmCalcKF = function() {
  var a=parseFloat(document.getElementById('hm-kf-amt')?.value||'0')||0;
  var sk=parseFloat(document.getElementById('hm-kf-sipkur')?.value||'0')||0;
  var ok=parseFloat(document.getElementById('hm-kf-odmkur')?.value||'0')||0;
  var diff=ok-sk; var total=a*diff;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-kf-diff',(diff>=0?'+':'')+_hmFmt(diff)+' ₺'); _s('hm-kf-total',(total>=0?'+':'')+_hmFmt(total)+' ₺');
  document.getElementById('hm-kf-total').style.color = total>=0?'#16A34A':'#DC2626';
};

// 10) Eldeki Para — CRUD
_hmRenderers.eldeki = function(el) {
  var data = _hmLoad(HM_ELDEKI_KEY);
  var totalTL = data.reduce(function(a,b) { var r = b.currency==='USD'?HM_RATES.USD:b.currency==='EUR'?HM_RATES.EUR:1; return a+(b.amount||0)*r; }, 0);
  el.innerHTML = _hmCard('💵 Eldeki Para Takibi',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<input class="fi" id="hm-el-kisi" placeholder="Kaynak (Kasa, Banka...)" style="font-size:12px;padding:8px">'
      + '<input type="number" class="fi" id="hm-el-tutar" placeholder="Tutar" style="font-size:12px;padding:8px">'
      + '<select class="fi" id="hm-el-cur" style="font-size:12px;padding:8px"><option value="TRY">₺ TRY</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select>'
      + '<button onclick="window._hmAddEldeki?.()" class="btn btnp" style="font-size:12px">+ Ekle</button>'
    + '</div>'
    + _hmResult('hm-el-total','Toplam TL Değeri')
    + _hmInput('hm-el-ihtiyac','İhtiyaç Tutarı (₺)','number','','oninput="window._hmCalcEldekiNeed?.()"')
    + _hmResult('hm-el-diff','Fark')
    + '<div id="hm-el-list" style="margin-top:10px">' + data.map(function(b,i) {
        var r = b.currency==='USD'?HM_RATES.USD:b.currency==='EUR'?HM_RATES.EUR:1;
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:12px">'
          + '<span style="flex:1">'+(b.name||'—')+'</span>'
          + '<span style="font-weight:600">' + _hmFmt(b.amount) + ' ' + (b.currency||'TRY') + '</span>'
          + '<span style="color:#8E8E93;font-size:10px">≈₺' + _hmFmt(b.amount*r) + '</span>'
          + '<button onclick="window._hmDelEldeki?.(' + i + ')" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
        + '</div>';
      }).join('') + '</div>'
    + _hmExportButtons('eldeki')
  );
  var tel = document.getElementById('hm-el-total'); if(tel) tel.textContent = '₺' + _hmFmt(totalTL);
};
window._hmAddEldeki = function() {
  var name=(document.getElementById('hm-el-kisi')?.value||'').trim();
  var amt=parseFloat(document.getElementById('hm-el-tutar')?.value||'0')||0;
  var cur=document.getElementById('hm-el-cur')?.value||'TRY';
  if(!name||!amt){window.toast?.('Kaynak ve tutar zorunlu','err');return;}
  var d=_hmLoad(HM_ELDEKI_KEY); d.push({name:name,amount:amt,currency:cur});
  _hmStore(HM_ELDEKI_KEY,d); _hmRenderers.eldeki(document.getElementById('hm-calc-area'));
};
window._hmDelEldeki = function(idx) { var d=_hmLoad(HM_ELDEKI_KEY); d.splice(idx,1); _hmStore(HM_ELDEKI_KEY,d); _hmRenderers.eldeki(document.getElementById('hm-calc-area')); };
window._hmCalcEldekiNeed = function() {
  var need=parseFloat(document.getElementById('hm-el-ihtiyac')?.value||'0')||0;
  var data=_hmLoad(HM_ELDEKI_KEY);
  var total=data.reduce(function(a,b){var r=b.currency==='USD'?HM_RATES.USD:b.currency==='EUR'?HM_RATES.EUR:1;return a+(b.amount||0)*r;},0);
  var diff=total-need; var el2=document.getElementById('hm-el-diff');
  if(el2){el2.textContent=(diff>=0?'✅ Yeterli: +':'❌ Eksik: ')+_hmFmt(Math.abs(diff))+' ₺';el2.style.color=diff>=0?'#16A34A':'#DC2626';}
};

// 11) Faiz
_hmRenderers.faiz = function(el) {
  el.innerHTML = _hmCard('🏦 Faiz Hesaplama',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-fz-ana','Anapara','number','100000','oninput="window._hmCalcFaiz?.()"')
      + _hmInput('hm-fz-oran','Yıllık Oran %','number','45','oninput="window._hmCalcFaiz?.()"')
      + _hmInput('hm-fz-sure','Süre (ay)','number','12','oninput="window._hmCalcFaiz?.()"')
    + '</div>' + _hmResult('hm-fz-basit','Basit Faiz') + _hmResult('hm-fz-bilesik','Bileşik Faiz')
  );
};
window._hmCalcFaiz = function() {
  var a=parseFloat(document.getElementById('hm-fz-ana')?.value||'0')||0;
  var o=parseFloat(document.getElementById('hm-fz-oran')?.value||'0')||0;
  var s=parseFloat(document.getElementById('hm-fz-sure')?.value||'0')||0;
  var basit=a*(o/100)*(s/12); var bilesik=a*Math.pow(1+o/100/12,s)-a;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-fz-basit','₺'+_hmFmt(basit)+' → Toplam: ₺'+_hmFmt(a+basit));
  _s('hm-fz-bilesik','₺'+_hmFmt(bilesik)+' → Toplam: ₺'+_hmFmt(a+bilesik));
};

// 12) Kâr Marjı
_hmRenderers.marj = function(el) {
  el.innerHTML = _hmCard('📈 Kâr Marjı',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-mj-maliyet','Maliyet','number','80','oninput="window._hmCalcMarj?.()"')
      + _hmInput('hm-mj-marj','Marj %','number','25','oninput="window._hmCalcMarj?.()"')
    + '</div>' + _hmResult('hm-mj-satis','Satış Fiyatı') + _hmResult('hm-mj-kar','Net Kâr')
  );
};
window._hmCalcMarj = function() {
  var m=parseFloat(document.getElementById('hm-mj-maliyet')?.value||'0')||0;
  var p=parseFloat(document.getElementById('hm-mj-marj')?.value||'0')||0;
  var s=m*(1+p/100); var k=s-m;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-mj-satis','₺'+_hmFmt(s)); _s('hm-mj-kar','₺'+_hmFmt(k));
};

// 13) Çapraz Kur
_hmRenderers.capraz = function(el) {
  var usdeur=(HM_RATES.USD/(HM_RATES.EUR||1)).toFixed(4);
  var eurusd=(HM_RATES.EUR/(HM_RATES.USD||1)).toFixed(4);
  var usdgbp=(HM_RATES.USD/(HM_RATES.GBP||1)).toFixed(4);
  el.innerHTML = _hmCard('🔄 Çapraz Kur Tablosu',
    '<div style="border:1px solid #F0F0F0;border-radius:10px;overflow:hidden">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;background:#F9FAFB;font-size:10px;font-weight:700;color:#8E8E93;border-bottom:1px solid #F0F0F0"><div></div><div>USD</div><div>EUR</div><div>GBP</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;font-size:12px;border-bottom:1px solid #F0F0F0"><div style="font-weight:600">TRY</div><div>' + _hmFmt(HM_RATES.USD) + '</div><div>' + _hmFmt(HM_RATES.EUR) + '</div><div>' + _hmFmt(HM_RATES.GBP) + '</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;font-size:12px;border-bottom:1px solid #F0F0F0"><div style="font-weight:600">USD/EUR</div><div>1</div><div>' + usdeur + '</div><div>' + usdgbp + '</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;font-size:12px"><div style="font-weight:600">EUR/USD</div><div>' + eurusd + '</div><div>1</div><div>' + ((HM_RATES.EUR||1)/(HM_RATES.GBP||1)).toFixed(4) + '</div></div>'
    + '</div>'
  );
};

// 17) Gecikme Faizi
_hmRenderers.gecikme = function(el) {
  el.innerHTML = _hmCard('⏰ Gecikme Faizi',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-gc-tutar','Tutar','number','50000','oninput="window._hmCalcGecikme?.()"')
      + _hmInput('hm-gc-vade','Vade Tarihi','date','','onchange="window._hmCalcGecikme?.()"')
      + _hmInput('hm-gc-odeme','Ödeme Tarihi','date','','onchange="window._hmCalcGecikme?.()"')
    + '</div>'
    + '<div style="margin-bottom:10px;font-size:10px;color:#8E8E93">Yasal gecikme faizi oranı: %24/yıl (aylık %2)</div>'
    + _hmResult('hm-gc-gun','Gecikme Gün') + _hmResult('hm-gc-faiz','Gecikme Faizi')
  );
};
window._hmCalcGecikme = function() {
  var tutar=parseFloat(document.getElementById('hm-gc-tutar')?.value||'0')||0;
  var vade=document.getElementById('hm-gc-vade')?.value||'';
  var odeme=document.getElementById('hm-gc-odeme')?.value||new Date().toISOString().slice(0,10);
  if(!vade)return;
  var gun=Math.max(0,Math.ceil((new Date(odeme)-new Date(vade))/86400000));
  var faiz=tutar*0.24/365*gun;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-gc-gun',gun+' gün'); _s('hm-gc-faiz','₺'+_hmFmt(faiz));
};

// 18) Bütçe Kalan
_hmRenderers.butce = function(el) {
  el.innerHTML = _hmCard('🎯 Bütçe Kalan',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-bt-butce','Aylık Bütçe','number','100000','oninput="window._hmCalcButce?.()"')
      + _hmInput('hm-bt-harcanan','Harcanan','number','65000','oninput="window._hmCalcButce?.()"')
    + '</div>' + _hmResult('hm-bt-kalan','Kalan') + _hmResult('hm-bt-gunluk','Günlük Ortalama')
  );
};
window._hmCalcButce = function() {
  var b=parseFloat(document.getElementById('hm-bt-butce')?.value||'0')||0;
  var h=parseFloat(document.getElementById('hm-bt-harcanan')?.value||'0')||0;
  var kalan=b-h; var kalanGun=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()-new Date().getDate();
  var gunluk=kalanGun>0?kalan/kalanGun:0;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-bt-kalan',(kalan>=0?'':'⚠ ')+'₺'+_hmFmt(kalan)); _s('hm-bt-gunluk','₺'+_hmFmt(gunluk)+'/gün ('+kalanGun+' gün kaldı)');
  document.getElementById('hm-bt-kalan').style.color=kalan>=0?'#16A34A':'#DC2626';
};

// 9) Navlun Maliyet
_hmRenderers.navlun = function(el) {
  el.innerHTML = _hmCard('🚢 Navlun Maliyet (Landed Cost)',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-nv-fob','FOB Fiyat ($)','number','10000','oninput="window._hmCalcNavlun?.()"')
      + _hmInput('hm-nv-navlun','Navlun ($)','number','2000','oninput="window._hmCalcNavlun?.()"')
      + _hmInput('hm-nv-sigorta','Sigorta ($)','number','200','oninput="window._hmCalcNavlun?.()"')
      + _hmInput('hm-nv-gumruk','Gümrük (%)','number','5','oninput="window._hmCalcNavlun?.()"')
    + '</div>' + _hmResult('hm-nv-cfr','CFR Fiyat') + _hmResult('hm-nv-cif','CIF Fiyat') + _hmResult('hm-nv-landed','Landed Cost (₺)')
  );
};
window._hmCalcNavlun = function() {
  var fob=parseFloat(document.getElementById('hm-nv-fob')?.value||'0')||0;
  var nav=parseFloat(document.getElementById('hm-nv-navlun')?.value||'0')||0;
  var sig=parseFloat(document.getElementById('hm-nv-sigorta')?.value||'0')||0;
  var gum=parseFloat(document.getElementById('hm-nv-gumruk')?.value||'0')||0;
  var cfr=fob+nav; var cif=cfr+sig; var landed=cif*(1+gum/100)*HM_RATES.USD;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-nv-cfr','$'+_hmFmt(cfr)); _s('hm-nv-cif','$'+_hmFmt(cif)); _s('hm-nv-landed','₺'+_hmFmt(landed));
};

// 7) Dövizli Ödeme Planı
_hmRenderers.doplan = function(el) {
  el.innerHTML = _hmCard('📅 Dövizli Ödeme Planı',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-dp-total','Toplam ($)','number','50000','oninput="window._hmCalcDoPlan?.()"')
      + _hmInput('hm-dp-taksit','Taksit Sayısı','number','6','oninput="window._hmCalcDoPlan?.()"')
      + _hmInput('hm-dp-kur','Kur (₺/$)','number',String(HM_RATES.USD),'oninput="window._hmCalcDoPlan?.()"')
    + '</div><div id="hm-dp-table" style="margin-top:10px"></div>'
  );
};
window._hmCalcDoPlan = function() {
  var total=parseFloat(document.getElementById('hm-dp-total')?.value||'0')||0;
  var n=parseInt(document.getElementById('hm-dp-taksit')?.value||'1')||1;
  var kur=parseFloat(document.getElementById('hm-dp-kur')?.value||'0')||1;
  var taksit=total/n;
  var html='<div style="border:1px solid #F0F0F0;border-radius:10px;overflow:hidden">';
  html+='<div style="display:grid;grid-template-columns:60px 1fr 1fr;padding:6px 12px;background:#F9FAFB;font-size:10px;font-weight:700;color:#8E8E93;border-bottom:1px solid #F0F0F0"><div>#</div><div>Döviz</div><div>TL</div></div>';
  for(var i=1;i<=n;i++){
    html+='<div style="display:grid;grid-template-columns:60px 1fr 1fr;padding:6px 12px;border-bottom:1px solid #F0F0F0;font-size:12px"><div>'+i+'</div><div>$'+_hmFmt(taksit)+'</div><div>₺'+_hmFmt(taksit*kur)+'</div></div>';
  }
  html+='<div style="display:grid;grid-template-columns:60px 1fr 1fr;padding:8px 12px;font-size:12px;font-weight:700;background:#F9FAFB"><div>Toplam</div><div>$'+_hmFmt(total)+'</div><div>₺'+_hmFmt(total*kur)+'</div></div></div>';
  document.getElementById('hm-dp-table').innerHTML=html;
};

// 16) İhracat Maliyet
_hmRenderers.ihracat = function(el) {
  el.innerHTML = _hmCard('🌍 İhracat Maliyet',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-ih-uretim','Üretim Maliyeti ($)','number','5000','oninput="window._hmCalcIhracat?.()"')
      + _hmInput('hm-ih-navlun','Navlun ($)','number','1500','oninput="window._hmCalcIhracat?.()"')
      + _hmInput('hm-ih-gumruk','Gümrük ($)','number','500','oninput="window._hmCalcIhracat?.()"')
      + _hmInput('hm-ih-marj','Kâr Marjı %','number','20','oninput="window._hmCalcIhracat?.()"')
    + '</div>' + _hmResult('hm-ih-fob','FOB') + _hmResult('hm-ih-cfr','CFR') + _hmResult('hm-ih-satis','Satış Fiyatı')
  );
};
window._hmCalcIhracat = function() {
  var u=parseFloat(document.getElementById('hm-ih-uretim')?.value||'0')||0;
  var n=parseFloat(document.getElementById('hm-ih-navlun')?.value||'0')||0;
  var g=parseFloat(document.getElementById('hm-ih-gumruk')?.value||'0')||0;
  var m=parseFloat(document.getElementById('hm-ih-marj')?.value||'0')||0;
  var fob=u+g; var cfr=fob+n; var satis=cfr*(1+m/100);
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-ih-fob','$'+_hmFmt(fob)); _s('hm-ih-cfr','$'+_hmFmt(cfr)); _s('hm-ih-satis','$'+_hmFmt(satis));
};

// 15) Tarihsel Kâr
_hmRenderers.tarihsel = function(el) {
  el.innerHTML = _hmCard('📆 Tarihsel Kâr Hesaplama',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-th-alis','Alış Fiyatı','number','25','oninput="window._hmCalcTarihsel?.()"')
      + _hmInput('hm-th-bugun','Bugünkü Fiyat','number', String(HM_RATES.USD),'oninput="window._hmCalcTarihsel?.()"')
      + _hmInput('hm-th-yil','Kaç Yıl Önce','number','2','oninput="window._hmCalcTarihsel?.()"')
    + '</div>' + _hmResult('hm-th-kar','Toplam Getiri %') + _hmResult('hm-th-yillik','Yıllık Getiri %')
  );
};
window._hmCalcTarihsel = function() {
  var a=parseFloat(document.getElementById('hm-th-alis')?.value||'0')||0;
  var b=parseFloat(document.getElementById('hm-th-bugun')?.value||'0')||0;
  var y=parseFloat(document.getElementById('hm-th-yil')?.value||'1')||1;
  var toplamPct=a>0?((b-a)/a*100):0; var yillikPct=y>0?(Math.pow(b/Math.max(a,0.01),1/y)-1)*100:0;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-th-kar',(toplamPct>=0?'+':'')+toplamPct.toFixed(2)+'%'); _s('hm-th-yillik',(yillikPct>=0?'+':'')+yillikPct.toFixed(2)+'%/yıl');
};

// 4) Borç/Alacak (CRUD)
_hmRenderers.borc = function(el) {
  var data = _hmLoad(HM_BORC_KEY);
  var total = data.reduce(function(a,b){return a+(b.type==='borc'?-(b.amount||0):(b.amount||0));},0);
  el.innerHTML = _hmCard('📒 Borç/Alacak Takibi',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<input class="fi" id="hm-ba-kisi" placeholder="Kişi/Firma" style="font-size:12px;padding:8px">'
      + '<input type="number" class="fi" id="hm-ba-tutar" placeholder="Tutar" style="font-size:12px;padding:8px">'
      + '<select class="fi" id="hm-ba-tip" style="font-size:12px;padding:8px"><option value="alacak">Alacak</option><option value="borc">Borç</option></select>'
      + '<button onclick="window._hmAddBorc?.()" class="btn btnp" style="font-size:12px">+ Ekle</button>'
    + '</div>'
    + _hmResult('hm-ba-net','Net Bakiye')
    + '<div id="hm-ba-list" style="margin-top:10px">' + data.map(function(b,i){
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:12px">'
          + '<span style="flex:1">'+(b.name||'—')+'</span>'
          + '<span style="font-weight:600;color:'+(b.type==='borc'?'#DC2626':'#16A34A')+'">'+(b.type==='borc'?'-':'+')+_hmFmt(b.amount)+'</span>'
          + '<button onclick="window._hmDelBorc?.('+i+')" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
        + '</div>';
      }).join('') + '</div>'
    + _hmExportButtons('borc')
  );
  var nel = document.getElementById('hm-ba-net');
  if(nel){nel.textContent=(total>=0?'+':'')+_hmFmt(total)+' ₺';nel.style.color=total>=0?'#16A34A':'#DC2626';}
};
window._hmAddBorc = function() {
  var name=(document.getElementById('hm-ba-kisi')?.value||'').trim();
  var amt=parseFloat(document.getElementById('hm-ba-tutar')?.value||'0')||0;
  var tip=document.getElementById('hm-ba-tip')?.value||'alacak';
  if(!name||!amt){window.toast?.('Kişi ve tutar zorunlu','err');return;}
  var d=_hmLoad(HM_BORC_KEY); d.unshift({name:name,amount:amt,type:tip,ts:new Date().toISOString()});
  _hmStore(HM_BORC_KEY,d); _hmRenderers.borc(document.getElementById('hm-calc-area'));
};
window._hmDelBorc = function(idx) { var d=_hmLoad(HM_BORC_KEY); d.splice(idx,1); _hmStore(HM_BORC_KEY,d); _hmRenderers.borc(document.getElementById('hm-calc-area')); };

// 14) Portföy (CRUD)
_hmRenderers.portfoy = function(el) {
  var data = _hmLoad(HM_PORT_KEY);
  var totalTL = data.reduce(function(a,b){
    var rate = b.type==='altin' ? HM_RATES.ALTIN_GR : (HM_RATES[b.currency]||1);
    return a + (b.amount||0) * rate;
  },0);
  el.innerHTML = _hmCard('💼 Portföy Takibi',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<select class="fi" id="hm-pf-tip" style="font-size:12px;padding:8px"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="altin">Altın (gr)</option></select>'
      + '<input type="number" class="fi" id="hm-pf-miktar" placeholder="Miktar" style="font-size:12px;padding:8px">'
      + '<button onclick="window._hmAddPortfoy?.()" class="btn btnp" style="font-size:12px">+ Ekle</button>'
    + '</div>'
    + _hmResult('hm-pf-total','Toplam TL Değeri')
    + '<div id="hm-pf-list" style="margin-top:10px">' + data.map(function(p,i){
        var rate = p.type==='altin' ? HM_RATES.ALTIN_GR : (HM_RATES[p.currency]||1);
        var tl = (p.amount||0)*rate;
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F0F0F0;font-size:12px">'
          + '<span style="flex:1">'+(p.type==='altin'?'🥇 ':'')+_hmFmt(p.amount)+' '+(p.type==='altin'?'gr':p.currency)+'</span>'
          + '<span style="font-weight:600;color:var(--t)">₺'+_hmFmt(tl)+'</span>'
          + '<button onclick="window._hmDelPortfoy?.('+i+')" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
        + '</div>';
      }).join('') + '</div>'
    + _hmExportButtons('portfoy')
  );
  var tel = document.getElementById('hm-pf-total');
  if(tel) tel.textContent = '₺'+_hmFmt(totalTL);
};
window._hmAddPortfoy = function() {
  var tip=document.getElementById('hm-pf-tip')?.value||'USD';
  var amt=parseFloat(document.getElementById('hm-pf-miktar')?.value||'0')||0;
  if(!amt){window.toast?.('Miktar girin','err');return;}
  var d=_hmLoad(HM_PORT_KEY); d.push({type:tip,currency:tip==='altin'?'XAU':tip,amount:amt});
  _hmStore(HM_PORT_KEY,d); _hmRenderers.portfoy(document.getElementById('hm-calc-area'));
};
window._hmDelPortfoy = function(idx) { var d=_hmLoad(HM_PORT_KEY); d.splice(idx,1); _hmStore(HM_PORT_KEY,d); _hmRenderers.portfoy(document.getElementById('hm-calc-area')); };

// 19) Karşılaştırmalı Teklif (CRUD)
_hmRenderers.karsilastir = function(el) {
  var data = _hmLoad(HM_TEKLIF_KEY);
  el.innerHTML = _hmCard('⚖️ Karşılaştırmalı Teklif',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<input class="fi" id="hm-ct-firma" placeholder="Firma adı" style="font-size:12px;padding:8px">'
      + '<input type="number" class="fi" id="hm-ct-fiyat" placeholder="Fiyat" style="font-size:12px;padding:8px">'
      + '<button onclick="window._hmAddTeklif?.()" class="btn btnp" style="font-size:12px">+ Ekle</button>'
    + '</div>'
    + '<div id="hm-ct-list">' + (function() {
        if (!data.length) return '<div style="font-size:12px;color:#8E8E93;text-align:center;padding:12px">Teklif ekleyin (max 5)</div>';
        var min = Math.min.apply(null, data.map(function(t){return t.price||Infinity;}));
        return data.map(function(t,i){
          var isBest = t.price === min;
          return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid '+(isBest?'#16A34A':'#F0F0F0')+';border-radius:8px;margin-bottom:6px;background:'+(isBest?'rgba(22,163,74,.06)':'#fff')+'">'
            + '<span style="flex:1;font-size:13px;font-weight:500">'+(t.name||'—')+(isBest?' <span style="font-size:9px;color:#16A34A;font-weight:700">★ EN UCUZ</span>':'')+'</span>'
            + '<span style="font-size:14px;font-weight:700;color:'+(isBest?'#16A34A':'#1C1C1E')+'">₺'+_hmFmt(t.price)+'</span>'
            + '<button onclick="window._hmDelTeklif?.('+i+')" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
          + '</div>';
        }).join('');
      })() + '</div>'
    + _hmExportButtons('karsilastir')
  );
};
window._hmAddTeklif = function() {
  var name=(document.getElementById('hm-ct-firma')?.value||'').trim();
  var price=parseFloat(document.getElementById('hm-ct-fiyat')?.value||'0')||0;
  if(!name||!price){window.toast?.('Firma ve fiyat zorunlu','err');return;}
  var d=_hmLoad(HM_TEKLIF_KEY); if(d.length>=5){window.toast?.('Maksimum 5 teklif','err');return;}
  d.push({name:name,price:price}); _hmStore(HM_TEKLIF_KEY,d);
  _hmRenderers.karsilastir(document.getElementById('hm-calc-area'));
};
window._hmDelTeklif = function(idx) { var d=_hmLoad(HM_TEKLIF_KEY); d.splice(idx,1); _hmStore(HM_TEKLIF_KEY,d); _hmRenderers.karsilastir(document.getElementById('hm-calc-area')); };

// ════════════════════════════════════════════════════════════════
// PRO MODÜLLER — Admin/Manager Only
// ════════════════════════════════════════════════════════════════

function _hmProCard(title, content) {
  return '<div style="background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);padding:20px;margin-bottom:16px;border-left:3px solid #007AFF">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><span style="font-size:14px;font-weight:600;color:#1C1C1E">' + title + '</span><span style="font-size:8px;background:#007AFF;color:#fff;border-radius:4px;padding:2px 6px;font-weight:700">PRO</span></div>'
    + content + '</div>';
}

// 1) Carry Trade
_hmRenderers.carry = function(el) {
  el.innerHTML = _hmProCard('🔐 Carry Trade Hesaplama',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-ct-tl-rate','TL Faiz Oranı (yıllık %)','number','50','oninput="window._hmCalcCarry?.()"')
      + _hmInput('hm-ct-usd-rate','USD Faiz Oranı (yıllık %)','number','5','oninput="window._hmCalcCarry?.()"')
      + _hmInput('hm-ct-amount','Başlangıç Tutarı ($)','number','100000','oninput="window._hmCalcCarry?.()"')
      + _hmInput('hm-ct-months','Süre (ay)','number','6','oninput="window._hmCalcCarry?.()"')
    + '</div>'
    + _hmResult('hm-ct-profit','Net Carry Kârı') + _hmResult('hm-ct-break','Break-Even Kur')
    + '<div id="hm-ct-scenarios" style="margin-top:12px"></div>'
  );
};
window._hmCalcCarry = function() {
  var tlR=parseFloat(document.getElementById('hm-ct-tl-rate')?.value||'0')/100;
  var usdR=parseFloat(document.getElementById('hm-ct-usd-rate')?.value||'0')/100;
  var amt=parseFloat(document.getElementById('hm-ct-amount')?.value||'0')||0;
  var months=parseFloat(document.getElementById('hm-ct-months')?.value||'0')||0;
  var kur=HM_RATES.USD;
  var tlAmt=amt*kur; var tlReturn=tlAmt*(1+tlR*months/12); var usdReturn=amt*(1+usdR*months/12);
  var breakKur=tlReturn/usdReturn; var profit=tlReturn-usdReturn*kur;
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-ct-profit',(profit>=0?'+':'')+_hmFmt(profit)+' ₺'); _s('hm-ct-break','₺'+_hmFmt(breakKur)+' (mevcut: ₺'+_hmFmt(kur)+')');
  document.getElementById('hm-ct-profit').style.color=profit>=0?'#16A34A':'#DC2626';
  // Senaryo tablosu
  var sc=document.getElementById('hm-ct-scenarios');
  if(sc){var html='<div style="font-size:11px;font-weight:600;color:#1C1C1E;margin-bottom:6px">Kur Senaryoları</div><div style="border:1px solid #F0F0F0;border-radius:8px;overflow:hidden">';
    [kur*0.9,kur*0.95,kur,kur*1.05,kur*1.1].forEach(function(k,i){
      var p=tlReturn-usdReturn*k;
      html+='<div style="display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #F0F0F0;font-size:11px;background:'+(i===2?'#F2F2F7':'#fff')+'"><span>₺'+_hmFmt(k)+'</span><span style="font-weight:600;color:'+(p>=0?'#16A34A':'#DC2626')+'">'+(p>=0?'+':'')+_hmFmt(p)+' ₺</span></div>';
    });
    sc.innerHTML=html+'</div>';}
};

// 2) Enflasyon Arbitrajı
_hmRenderers.enflasyon = function(el) {
  el.innerHTML = _hmProCard('🔐 Enflasyon Arbitrajı',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-ea-cost','Birim Maliyet (₺)','number','1000','oninput="window._hmCalcEnflasyon?.()"')
      + _hmInput('hm-ea-qty','Miktar','number','100','oninput="window._hmCalcEnflasyon?.()"')
      + _hmInput('hm-ea-storage','Depolama Maliyet/ay (₺)','number','500','oninput="window._hmCalcEnflasyon?.()"')
      + _hmInput('hm-ea-inflation','Tahmini Enflasyon (%/yıl)','number','45','oninput="window._hmCalcEnflasyon?.()"')
      + _hmInput('hm-ea-finance','Finansman Maliyeti (%/yıl)','number','40','oninput="window._hmCalcEnflasyon?.()"')
      + _hmInput('hm-ea-months','Süre (ay)','number','6','oninput="window._hmCalcEnflasyon?.()"')
    + '</div>'
    + _hmResult('hm-ea-profit','Net Arbitraj Kârı') + _hmResult('hm-ea-break','Break-Even Süre')
  );
};
window._hmCalcEnflasyon = function() {
  var cost=parseFloat(document.getElementById('hm-ea-cost')?.value||'0')||0;
  var qty=parseFloat(document.getElementById('hm-ea-qty')?.value||'0')||0;
  var storage=parseFloat(document.getElementById('hm-ea-storage')?.value||'0')||0;
  var inf=parseFloat(document.getElementById('hm-ea-inflation')?.value||'0')/100;
  var fin=parseFloat(document.getElementById('hm-ea-finance')?.value||'0')/100;
  var months=parseFloat(document.getElementById('hm-ea-months')?.value||'0')||0;
  var totalCost=cost*qty; var valueGain=totalCost*inf*months/12;
  var storageCost=storage*months; var financeCost=totalCost*fin*months/12;
  var net=valueGain-storageCost-financeCost;
  var monthlyNet=valueGain/Math.max(months,1)-(storage+totalCost*fin/12);
  var breakMonths=monthlyNet>0?0:999;
  if(monthlyNet>0){for(var m=1;m<=36;m++){var g=totalCost*inf*m/12-storage*m-totalCost*fin*m/12;if(g>0){breakMonths=m;break;}}}
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-ea-profit',(net>=0?'+':'')+_hmFmt(net)+' ₺'); _s('hm-ea-break',breakMonths<999?breakMonths+' ay':'Kârsız');
  document.getElementById('hm-ea-profit').style.color=net>=0?'#16A34A':'#DC2626';
};

// 3) Döviz Opsiyon Simülatörü
_hmRenderers.opsiyon = function(el) {
  el.innerHTML = _hmProCard('🔐 Döviz Opsiyon Simülatörü',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-op-spot','Mevcut Kur','number',String(HM_RATES.USD),'oninput="window._hmCalcOpsiyon?.()"')
      + _hmInput('hm-op-strike','Hedef Kur (Strike)','number',String(Math.round(HM_RATES.USD*1.05*100)/100),'oninput="window._hmCalcOpsiyon?.()"')
      + _hmInput('hm-op-amount','Tutar ($)','number','100000','oninput="window._hmCalcOpsiyon?.()"')
      + _hmInput('hm-op-months','Süre (ay)','number','3','oninput="window._hmCalcOpsiyon?.()"')
    + '</div>'
    + _hmResult('hm-op-premium','Tahmini Opsiyon Primi') + _hmResult('hm-op-hedge','Korumalı Maliyet') + _hmResult('hm-op-nohEdge','Korunmasız Risk')
  );
};
window._hmCalcOpsiyon = function() {
  var spot=parseFloat(document.getElementById('hm-op-spot')?.value||'0')||0;
  var strike=parseFloat(document.getElementById('hm-op-strike')?.value||'0')||0;
  var amt=parseFloat(document.getElementById('hm-op-amount')?.value||'0')||0;
  var months=parseFloat(document.getElementById('hm-op-months')?.value||'0')||0;
  var premium=amt*0.025*months/3; // ~%2.5 per quarter approx
  var hedgedCost=amt*strike+premium; var noHedgeRisk=amt*(strike-spot);
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-op-premium','$'+_hmFmt(premium)+' (₺'+_hmFmt(premium*spot)+')');
  _s('hm-op-hedge','₺'+_hmFmt(hedgedCost));
  _s('hm-op-nohEdge',(noHedgeRisk>=0?'Zarar: ':'Kazanç: ')+'₺'+_hmFmt(Math.abs(noHedgeRisk*spot)));
};

// 4) Tedarikçi Finansmanı
_hmRenderers.tedfin = function(el) {
  el.innerHTML = _hmProCard('🔐 Tedarikçi Finansmanı',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-tf-fatura','Fatura Tutarı','number','100000','oninput="window._hmCalcTedFin?.()"')
      + _hmInput('hm-tf-vade','Vade (gün)','number','60','oninput="window._hmCalcTedFin?.()"')
      + _hmInput('hm-tf-banka','Banka İskonto (yıllık %)','number','45','oninput="window._hmCalcTedFin?.()"')
      + _hmInput('hm-tf-ted','Tedarikçi İskontosu (%)','number','3','oninput="window._hmCalcTedFin?.()"')
    + '</div>'
    + _hmResult('hm-tf-erken','Erken Ödeme Maliyeti') + _hmResult('hm-tf-bekle','Bekleme + İskonto') + _hmResult('hm-tf-tavsiye','Tavsiye')
  );
};
window._hmCalcTedFin = function() {
  var fatura=parseFloat(document.getElementById('hm-tf-fatura')?.value||'0')||0;
  var vade=parseFloat(document.getElementById('hm-tf-vade')?.value||'0')||0;
  var banka=parseFloat(document.getElementById('hm-tf-banka')?.value||'0')/100;
  var ted=parseFloat(document.getElementById('hm-tf-ted')?.value||'0')/100;
  var erkenMaliyet=fatura*banka*vade/365; var iskontoKar=fatura*ted;
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-tf-erken','Finansman: ₺'+_hmFmt(erkenMaliyet)+' → Net: ₺'+_hmFmt(fatura-erkenMaliyet));
  _s('hm-tf-bekle','İskonto: ₺'+_hmFmt(iskontoKar)+' → Net: ₺'+_hmFmt(fatura-iskontoKar));
  var tavsiye=iskontoKar>erkenMaliyet?'✅ Bekle, iskonto al (₺'+_hmFmt(iskontoKar-erkenMaliyet)+' tasarruf)':'✅ Erken öde (₺'+_hmFmt(erkenMaliyet-iskontoKar)+' daha ucuz)';
  _s('hm-tf-tavsiye',tavsiye);
};

// 5) Fiyat Elastikiyeti
_hmRenderers.elastik = function(el) {
  el.innerHTML = _hmProCard('🔐 Fiyat Elastikiyeti',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-fe-p1','Mevcut Fiyat','number','100','oninput="window._hmCalcElastik?.()"')
      + _hmInput('hm-fe-p2','Yeni Fiyat','number','90','oninput="window._hmCalcElastik?.()"')
      + _hmInput('hm-fe-q1','Mevcut Satış Adedi','number','1000','oninput="window._hmCalcElastik?.()"')
      + _hmInput('hm-fe-elastik','Talep Değişimi (%)','number','15','oninput="window._hmCalcElastik?.()"')
    + '</div>'
    + _hmResult('hm-fe-revenue','Gelir Değişimi') + _hmResult('hm-fe-coeff','Elastikiyet Katsayısı') + _hmResult('hm-fe-optimal','Optimal Fiyat')
  );
};
window._hmCalcElastik = function() {
  var p1=parseFloat(document.getElementById('hm-fe-p1')?.value||'0')||0;
  var p2=parseFloat(document.getElementById('hm-fe-p2')?.value||'0')||0;
  var q1=parseFloat(document.getElementById('hm-fe-q1')?.value||'0')||0;
  var qChg=parseFloat(document.getElementById('hm-fe-elastik')?.value||'0')/100;
  var q2=q1*(1+qChg); var rev1=p1*q1; var rev2=p2*q2; var diff=rev2-rev1;
  var pChg=(p2-p1)/Math.max(p1,0.01); var coeff=pChg!==0?(qChg/pChg):0;
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-fe-revenue',(diff>=0?'+':'')+_hmFmt(diff)+' ₺ ('+_hmFmt(rev1)+'→'+_hmFmt(rev2)+')');
  _s('hm-fe-coeff',coeff.toFixed(2)+' '+(Math.abs(coeff)>1?'(Esnek)':'(Esnek değil)'));
  _s('hm-fe-optimal','~₺'+_hmFmt(p1*(1-1/Math.max(Math.abs(coeff),0.01)))+' (marjinal gelir=0)');
  document.getElementById('hm-fe-revenue').style.color=diff>=0?'#16A34A':'#DC2626';
};

// 6) Çapraz Sübvansiyon
_hmRenderers.subvansiyon = function(el) {
  el.innerHTML = _hmProCard('🔐 Çapraz Sübvansiyon',
    '<div style="font-size:11px;font-weight:600;color:#8E8E93;margin-bottom:8px">A Ürünü</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">'
      + _hmInput('hm-cs-ap','A Fiyat','number','100','oninput="window._hmCalcSubv?.()"')
      + _hmInput('hm-cs-ac','A Maliyet','number','70','oninput="window._hmCalcSubv?.()"')
      + _hmInput('hm-cs-aq','A Satış Adedi','number','500','oninput="window._hmCalcSubv?.()"')
    + '</div>'
    + '<div style="font-size:11px;font-weight:600;color:#8E8E93;margin-bottom:8px">B Ürünü</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">'
      + _hmInput('hm-cs-bp','B Fiyat','number','200','oninput="window._hmCalcSubv?.()"')
      + _hmInput('hm-cs-bc','B Maliyet','number','120','oninput="window._hmCalcSubv?.()"')
      + _hmInput('hm-cs-bq','B Satış Adedi','number','300','oninput="window._hmCalcSubv?.()"')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-cs-disc','A İndirim (%)','number','10','oninput="window._hmCalcSubv?.()"')
      + _hmInput('hm-cs-boost','B Satış Artışı (%)','number','20','oninput="window._hmCalcSubv?.()"')
    + '</div>'
    + _hmResult('hm-cs-before','Mevcut Toplam Kâr') + _hmResult('hm-cs-after','Sübvansiyon Sonrası') + _hmResult('hm-cs-diff','Fark')
  );
};
window._hmCalcSubv = function() {
  var ap=parseFloat(document.getElementById('hm-cs-ap')?.value||'0')||0;
  var ac=parseFloat(document.getElementById('hm-cs-ac')?.value||'0')||0;
  var aq=parseFloat(document.getElementById('hm-cs-aq')?.value||'0')||0;
  var bp=parseFloat(document.getElementById('hm-cs-bp')?.value||'0')||0;
  var bc=parseFloat(document.getElementById('hm-cs-bc')?.value||'0')||0;
  var bq=parseFloat(document.getElementById('hm-cs-bq')?.value||'0')||0;
  var disc=parseFloat(document.getElementById('hm-cs-disc')?.value||'0')/100;
  var boost=parseFloat(document.getElementById('hm-cs-boost')?.value||'0')/100;
  var before=(ap-ac)*aq+(bp-bc)*bq;
  var newAp=ap*(1-disc); var newBq=bq*(1+boost);
  var after=(newAp-ac)*aq+(bp-bc)*newBq;
  var diff=after-before;
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-cs-before','₺'+_hmFmt(before)); _s('hm-cs-after','₺'+_hmFmt(after));
  _s('hm-cs-diff',(diff>=0?'+':'')+_hmFmt(diff)+' ₺');
  document.getElementById('hm-cs-diff').style.color=diff>=0?'#16A34A':'#DC2626';
};

// 7) Kur Korumalı Fiyatlama
_hmRenderers.kurkoruma = function(el) {
  el.innerHTML = _hmProCard('🔐 Kur Korumalı Fiyatlama',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-kk-cost','Maliyet ($)','number','10000','oninput="window._hmCalcKurKoruma?.()"')
      + _hmInput('hm-kk-margin','Hedef Kâr Marjı (%)','number','20','oninput="window._hmCalcKurKoruma?.()"')
      + _hmInput('hm-kk-hedge','Hedge Maliyeti (%)','number','2','oninput="window._hmCalcKurKoruma?.()"')
      + _hmInput('hm-kk-months','Ödeme Süresi (ay)','number','3','oninput="window._hmCalcKurKoruma?.()"')
    + '</div>'
    + _hmResult('hm-kk-price','TL Satış Fiyatı') + _hmResult('hm-kk-net','Net Kâr')
    + '<div id="hm-kk-scenarios" style="margin-top:12px"></div>'
  );
};
window._hmCalcKurKoruma = function() {
  var cost=parseFloat(document.getElementById('hm-kk-cost')?.value||'0')||0;
  var margin=parseFloat(document.getElementById('hm-kk-margin')?.value||'0')/100;
  var hedge=parseFloat(document.getElementById('hm-kk-hedge')?.value||'0')/100;
  var kur=HM_RATES.USD;
  var tlCost=cost*kur; var hedgeCost=tlCost*hedge;
  var salePrice=(tlCost+hedgeCost)*(1+margin); var net=salePrice-tlCost-hedgeCost;
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-kk-price','₺'+_hmFmt(salePrice)); _s('hm-kk-net','+₺'+_hmFmt(net));
  var sc=document.getElementById('hm-kk-scenarios');
  if(sc){
    var scenarios=[{l:'İyimser',k:kur*0.95},{l:'Baz',k:kur},{l:'Kötümser',k:kur*1.1}];
    sc.innerHTML='<div style="font-size:11px;font-weight:600;color:#1C1C1E;margin-bottom:6px">Kur Senaryoları</div><div style="border:1px solid #F0F0F0;border-radius:8px;overflow:hidden">'
      +scenarios.map(function(s,i){var actualCost=cost*s.k;var p=salePrice-actualCost-hedgeCost;return '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;background:'+(i===1?'#F2F2F7':'#fff')+'"><span>'+s.l+' (₺'+_hmFmt(s.k)+')</span><span style="font-weight:600;color:'+(p>=0?'#16A34A':'#DC2626')+'">'+(p>=0?'+':'')+_hmFmt(p)+' ₺</span></div>';}).join('')
      +'</div>';
  }
};

// ════════════════════════════════════════════════════════════════
// ELİT FİNANSÇI YÖNTEMLERİ
// ════════════════════════════════════════════════════════════════

// Kelly Kriteri — HM_MODULES'a eklenmez, PRO içine zaten dahil
// Mevcut _hmRenderers'a ek modüller olarak ekliyoruz

HM_MODULES.push(
  { id:'kelly',      icon:'🎲', label:'Kelly Kriteri',     pro: true },
  { id:'montecarlo', icon:'🎰', label:'Monte Carlo',       pro: true },
  { id:'sharpe',     icon:'📐', label:'Sharpe Oranı',      pro: true }
);

// Kelly Kriteri
_hmRenderers.kelly = function(el) {
  el.innerHTML = _hmProCard('🎲 Kelly Kriteri — Optimal Pozisyon',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-kl-win','Kazanma Olasılığı (%)','number','55','oninput="window._hmCalcKelly?.()"')
      + _hmInput('hm-kl-ratio','Kazanç/Kayıp Oranı','number','1.5','oninput="window._hmCalcKelly?.()"')
      + _hmInput('hm-kl-capital','Sermaye','number','100000','oninput="window._hmCalcKelly?.()"')
    + '</div>'
    + _hmResult('hm-kl-pct','Kelly %') + _hmResult('hm-kl-amount','Optimal Pozisyon') + _hmResult('hm-kl-half','Yarım Kelly (güvenli)')
  );
};
window._hmCalcKelly = function() {
  var w=parseFloat(document.getElementById('hm-kl-win')?.value||'0')/100;
  var r=parseFloat(document.getElementById('hm-kl-ratio')?.value||'0')||1;
  var cap=parseFloat(document.getElementById('hm-kl-capital')?.value||'0')||0;
  var kelly=w-(1-w)/r; kelly=Math.max(0,Math.min(1,kelly));
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-kl-pct',(kelly*100).toFixed(1)+'%');
  _s('hm-kl-amount','₺'+_hmFmt(cap*kelly));
  _s('hm-kl-half','₺'+_hmFmt(cap*kelly/2)+' (Half-Kelly)');
};

// Monte Carlo
_hmRenderers.montecarlo = function(el) {
  el.innerHTML = _hmProCard('🎰 Monte Carlo Simülasyonu',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-mc-start','Başlangıç Bakiye','number','100000','oninput="window._hmCalcMC?.()"')
      + _hmInput('hm-mc-monthly','Aylık Gelir/Gider','number','5000','oninput="window._hmCalcMC?.()"')
      + _hmInput('hm-mc-volatility','Volatilite (%)','number','20','oninput="window._hmCalcMC?.()"')
    + '</div>'
    + _hmResult('hm-mc-avg','Ortalama (12 ay)') + _hmResult('hm-mc-best','En İyi Senaryo') + _hmResult('hm-mc-worst','En Kötü Senaryo')
    + '<div id="hm-mc-chart" style="margin-top:12px"></div>'
  );
};
window._hmCalcMC = function() {
  var start=parseFloat(document.getElementById('hm-mc-start')?.value||'0')||0;
  var monthly=parseFloat(document.getElementById('hm-mc-monthly')?.value||'0')||0;
  var vol=parseFloat(document.getElementById('hm-mc-volatility')?.value||'0')/100;
  var sims=500; var results=[];
  for(var s=0;s<sims;s++){var bal=start;for(var m=0;m<12;m++){var shock=(Math.random()-0.5)*2*vol;bal+=monthly*(1+shock);}results.push(bal);}
  results.sort(function(a,b){return a-b;});
  var avg=results.reduce(function(a,b){return a+b;},0)/sims;
  var best=results[Math.round(sims*0.95)]; var worst=results[Math.round(sims*0.05)];
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-mc-avg','₺'+_hmFmt(avg)); _s('hm-mc-best','₺'+_hmFmt(best)); _s('hm-mc-worst','₺'+_hmFmt(worst));
  document.getElementById('hm-mc-best').style.color='#16A34A';
  document.getElementById('hm-mc-worst').style.color='#DC2626';
};

// Sharpe Oranı
_hmRenderers.sharpe = function(el) {
  el.innerHTML = _hmProCard('📐 Sharpe Oranı — Portföy Performansı',
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _hmInput('hm-sp-return','Portföy Getiri (%)','number','25','oninput="window._hmCalcSharpe?.()"')
      + _hmInput('hm-sp-riskfree','Risksiz Getiri (%)','number','10','oninput="window._hmCalcSharpe?.()"')
      + _hmInput('hm-sp-std','Std Sapma (%)','number','15','oninput="window._hmCalcSharpe?.()"')
    + '</div>'
    + _hmResult('hm-sp-ratio','Sharpe Oranı') + _hmResult('hm-sp-grade','Değerlendirme')
  );
};
window._hmCalcSharpe = function() {
  var ret=parseFloat(document.getElementById('hm-sp-return')?.value||'0');
  var rf=parseFloat(document.getElementById('hm-sp-riskfree')?.value||'0');
  var std=parseFloat(document.getElementById('hm-sp-std')?.value||'1')||1;
  var sharpe=(ret-rf)/std;
  var grade=sharpe>=2?'🟢 Mükemmel':sharpe>=1?'🟡 İyi':sharpe>=0.5?'🟠 Orta':'🔴 Zayıf';
  var _s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  _s('hm-sp-ratio',sharpe.toFixed(3));
  _s('hm-sp-grade',grade);
  document.getElementById('hm-sp-ratio').style.color=sharpe>=1?'#16A34A':sharpe>=0?'#D97706':'#DC2626';
};

// Sayı formatlama — tüm number input'lar
(function _hmInitNumberFormat() {
  document.addEventListener('blur', function(e) {
    if (e.target?.type !== 'number' || !e.target.closest('#hm-calc-area')) return;
    // Number input'larda format uygulanmaz (browser zorlar)
    // Bunun yerine yanına TL gösterimi eklenebilir
  }, true);
})();

// ── Render Hook ──────────────────────────────────────────────────
var _origRenderHesap = window.renderHesapHistory;
window.renderHesapHistory = function() {
  _hmInjectPanel();
  // İlk modülü seç
  if (!document.querySelector('.hm-active')) {
    setTimeout(function() { window._hmSelectModule?.('doviz'); }, 100);
  }
};
