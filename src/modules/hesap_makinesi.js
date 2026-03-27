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

// TCMB'den kur çek
(function _hmFetchRates() {
  fetch('https://www.tcmb.gov.tr/kurlar/today.xml')
    .then(function(r) { return r.text(); })
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
        if (d?.rates?.TRY) { HM_RATES.USD = Math.round(d.rates.TRY*100)/100; HM_RATES.EUR = Math.round(d.rates.TRY/(d.rates.EUR||1)*100)/100; HM_RATES.GBP = Math.round(d.rates.TRY/(d.rates.GBP||1)*100)/100; }
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
];

// ── Panel Inject ─────────────────────────────────────────────────
function _hmInjectPanel() {
  var p = document.getElementById('panel-hesap');
  if (!p || p.dataset.hmInjected) return;
  p.dataset.hmInjected = '1';

  // Mevcut hesap.js panelini temizle ve yenisini inject et
  p.innerHTML = ''
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b);background:#fff;position:sticky;top:0;z-index:10">'
      + '<div><div style="font-size:16px;font-weight:700;color:#1C1C1E">🧮 Hesap Makinesi</div><div style="font-size:11px;color:#8E8E93;margin-top:2px">19 modüllü finansal araç seti</div></div>'
      + '<div style="font-size:10px;color:#8E8E93">USD: ₺' + _hmFmt(HM_RATES.USD) + ' · EUR: ₺' + _hmFmt(HM_RATES.EUR) + ' · Altın: ₺' + _hmFmt(HM_RATES.ALTIN_GR) + '/gr</div>'
    + '</div>'
    + '<div style="display:flex;min-height:calc(100vh - 120px)">'
      // Sol: modül grid
      + '<div style="width:280px;border-right:1px solid #F0F0F0;padding:16px;overflow-y:auto;flex-shrink:0">'
        + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
        + HM_MODULES.map(function(m) {
            return '<button class="hm-mod-btn" data-hm="' + m.id + '" onclick="window._hmSelectModule(\'' + m.id + '\')" style="background:#fff;border:1.5px solid #F0F0F0;border-radius:12px;padding:12px 6px;cursor:pointer;text-align:center;font-family:inherit;transition:all .12s" onmouseover="this.style.borderColor=\'#007AFF\'" onmouseout="if(!this.classList.contains(\'hm-active\'))this.style.borderColor=\'#F0F0F0\'">'
              + '<div style="font-size:22px;margin-bottom:4px">' + m.icon + '</div>'
              + '<div style="font-size:9px;color:#1C1C1E;font-weight:500;line-height:1.2">' + m.label + '</div>'
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

// ── 19 MODÜL RENDERERLERİ ────────────────────────────────────────
var _hmRenderers = {};

// 1) Döviz Çevirici
_hmRenderers.doviz = function(el) {
  el.innerHTML = _hmCard('💱 Döviz Çevirici',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-dv-amt','Tutar','number','1000','oninput="window._hmCalcDoviz?.()"')
      + '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#8E8E93;text-transform:uppercase;margin-bottom:4px">KAYNAK</div><select id="hm-dv-from" style="width:100%;padding:10px;border:1.5px solid #E5E5EA;border-radius:10px;font-size:14px;font-family:inherit" onchange="window._hmCalcDoviz?.()"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="TRY">TRY</option></select></div>'
    + '</div>'
    + _hmResult('hm-dv-try','TL Karşılığı') + _hmResult('hm-dv-usd','USD') + _hmResult('hm-dv-eur','EUR')
    + '<div style="margin-top:10px;font-size:10px;color:#8E8E93">Kaynak: TCMB · USD: ₺' + _hmFmt(HM_RATES.USD) + ' · EUR: ₺' + _hmFmt(HM_RATES.EUR) + '</div>'
  );
};
window._hmCalcDoviz = function() {
  var amt = parseFloat(document.getElementById('hm-dv-amt')?.value||'0')||0;
  var from = document.getElementById('hm-dv-from')?.value||'USD';
  var tlVal = from === 'TRY' ? amt : amt * (HM_RATES[from]||1);
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-dv-try', '₺' + _hmFmt(tlVal));
  _s('hm-dv-usd', '$' + _hmFmt(tlVal / (HM_RATES.USD||1)));
  _s('hm-dv-eur', '€' + _hmFmt(tlVal / (HM_RATES.EUR||1)));
};

// 2) Altın
_hmRenderers.altin = function(el) {
  el.innerHTML = _hmCard('🥇 Altın Hesaplayıcı',
    _hmInput('hm-au-gr','Gram','number','10','oninput="window._hmCalcAltin?.()"')
    + _hmResult('hm-au-tl','TL Değeri') + _hmResult('hm-au-ceyrek','≈ Çeyrek Altın') + _hmResult('hm-au-yarim','≈ Yarım Altın') + _hmResult('hm-au-tam','≈ Tam Altın')
    + '<div style="margin-top:10px;font-size:10px;color:#8E8E93">Gram altın: ₺' + _hmFmt(HM_RATES.ALTIN_GR) + '</div>'
  );
};
window._hmCalcAltin = function() {
  var gr = parseFloat(document.getElementById('hm-au-gr')?.value||'0')||0;
  var tl = gr * HM_RATES.ALTIN_GR;
  var _s = function(id,v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  _s('hm-au-tl', '₺' + _hmFmt(tl));
  _s('hm-au-ceyrek', (tl / (HM_RATES.ALTIN_GR * 1.75)).toFixed(1) + ' adet');
  _s('hm-au-yarim', (tl / (HM_RATES.ALTIN_GR * 3.5)).toFixed(1) + ' adet');
  _s('hm-au-tam', (tl / (HM_RATES.ALTIN_GR * 7)).toFixed(1) + ' adet');
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

// 10) Eldeki Para
_hmRenderers.eldeki = function(el) {
  el.innerHTML = _hmCard('💵 Eldeki Para Kontrolü',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + _hmInput('hm-el-gerek','Gereken Tutar','number','50000','oninput="window._hmCalcEldeki?.()"')
      + _hmInput('hm-el-var','Eldeki Tutar','number','45000','oninput="window._hmCalcEldeki?.()"')
    + '</div>' + _hmResult('hm-el-diff','Fark')
  );
};
window._hmCalcEldeki = function() {
  var g=parseFloat(document.getElementById('hm-el-gerek')?.value||'0')||0;
  var v=parseFloat(document.getElementById('hm-el-var')?.value||'0')||0;
  var d=v-g; var el2=document.getElementById('hm-el-diff');
  if(el2){el2.textContent=(d>=0?'✅ Fazla: +':'❌ Eksik: ')+_hmFmt(Math.abs(d))+' ₺';el2.style.color=d>=0?'#16A34A':'#DC2626';}
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

// ── Render Hook ──────────────────────────────────────────────────
var _origRenderHesap = window.renderHesapHistory;
window.renderHesapHistory = function() {
  _hmInjectPanel();
  // İlk modülü seç
  if (!document.querySelector('.hm-active')) {
    setTimeout(function() { window._hmSelectModule?.('doviz'); }, 100);
  }
};
