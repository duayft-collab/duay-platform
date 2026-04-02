/**
 * src/modules/hesap_ozeti.js — v1.0.0
 * Hesap Ozeti — Gelir/Gider ozet paneli, trend, banka/kasa, vade takibi
 */
(function() {
'use strict';

var _g = function(id) { return document.getElementById(id); };
var _fmt = function(n) { return Math.round(n).toLocaleString('tr-TR'); };
var _fmtK = function(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'K' : Math.round(n).toString(); };
var _toTRY = function(amt, cur) { return typeof window._odmToTRY === 'function' ? window._odmToTRY(amt, cur) : parseFloat(amt) || 0; };
var _today = function() { return new Date().toISOString().slice(0,10); };
var _nowTs = function() { return new Date().toISOString(); };

var _HO = { period: 'month', from: '', to: '', banks: [] };

function _periodRange() {
  var now = new Date(); var y = now.getFullYear(); var m = now.getMonth(); var d = now.getDate();
  var fmt = function(dt) { return dt.toISOString().slice(0,10); };
  switch (_HO.period) {
    case 'today': return { from: _today(), to: _today() };
    case 'week': { var dow = now.getDay() || 7; var mon = new Date(now); mon.setDate(d - dow + 1); var sun = new Date(mon); sun.setDate(mon.getDate() + 6); return { from: fmt(mon), to: fmt(sun) }; }
    case 'month': return { from: y+'-'+String(m+1).padStart(2,'0')+'-01', to: y+'-'+String(m+1).padStart(2,'0')+'-'+String(new Date(y,m+1,0).getDate()).padStart(2,'0') };
    case 'quarter': { var qm = Math.floor(m/3)*3; return { from: fmt(new Date(y, qm, 1)), to: fmt(new Date(y, qm+3, 0)) }; }
    case 'year': return { from: y+'-01-01', to: y+'-12-31' };
    case 'custom': return { from: _HO.from, to: _HO.to };
    default: return { from: _today(), to: _today() };
  }
}

function _collect() {
  var range = _periodRange(); var from = range.from; var to = range.to;
  var odm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && o.due >= from && o.due <= to; });
  var tah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted && (t.date || t.due || t.ts || '').slice(0,10) >= from && (t.date || t.due || t.ts || '').slice(0,10) <= to; });
  var allOdm = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted; });
  var allTah = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted; });
  var totalGelir = tah.reduce(function(s, t) { return s + _toTRY(t.amount || 0, t.currency || 'TRY'); }, 0);
  var totalGider = odm.reduce(function(s, o) { return s + _toTRY(o.amount || 0, o.currency || 'TRY'); }, 0);
  var today = _today();
  var vadesiGecen = allOdm.filter(function(o) { return !o.paid && o.due && o.due < today; });
  var vadesiGecenToplam = vadesiGecen.reduce(function(s, o) { return s + _toTRY(o.amount || 0, o.currency || 'TRY'); }, 0);
  var bekleyenTah = allTah.filter(function(t) { return !t.collected; });
  var bekleyenTahToplam = bekleyenTah.reduce(function(s, t) { return s + _toTRY(t.amount || 0, t.currency || 'TRY'); }, 0);
  var catMap = {}; odm.forEach(function(o) { var cat = o.cat || 'diger'; if (!catMap[cat]) catMap[cat] = 0; catMap[cat] += _toTRY(o.amount || 0, o.currency || 'TRY'); });
  var trend = [];
  for (var i = 5; i >= 0; i--) {
    var td = new Date(); td.setMonth(td.getMonth() - i); var my = td.getFullYear(); var mm = td.getMonth();
    var mFrom = my+'-'+String(mm+1).padStart(2,'0')+'-01'; var mTo = my+'-'+String(mm+1).padStart(2,'0')+'-'+String(new Date(my,mm+1,0).getDate()).padStart(2,'0');
    var mLbl = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'][mm];
    var mGelir = (typeof loadTahsilat === 'function' ? loadTahsilat() : []).filter(function(t) { return !t.isDeleted && (t.date||t.due||t.ts||'').slice(0,10) >= mFrom && (t.date||t.due||t.ts||'').slice(0,10) <= mTo; }).reduce(function(s, t) { return s + _toTRY(t.amount || 0, t.currency || 'TRY'); }, 0);
    var mGider = (typeof loadOdm === 'function' ? loadOdm() : []).filter(function(o) { return !o.isDeleted && o.due >= mFrom && o.due <= mTo; }).reduce(function(s, o) { return s + _toTRY(o.amount || 0, o.currency || 'TRY'); }, 0);
    trend.push({ lbl: mLbl, gelir: mGelir, gider: mGider, isThis: i === 0 });
  }
  var banks = _HO.banks || [];
  var toplamBanka = banks.reduce(function(s, b) { return s + _toTRY(b.bakiye || 0, b.currency || 'TRY'); }, 0);
  return { totalGelir: totalGelir, totalGider: totalGider, net: totalGelir - totalGider, vadesiGecen: vadesiGecen, vadesiGecenToplam: vadesiGecenToplam, bekleyenTah: bekleyenTah, bekleyenTahToplam: bekleyenTahToplam, catMap: catMap, trend: trend, banks: banks, toplamBanka: toplamBanka, odm: odm, tah: tah };
}

function _loadBanks() { try { _HO.banks = JSON.parse(localStorage.getItem('ak_ho_banks') || '[]'); } catch(e) { _HO.banks = []; } }
function _saveBanks() { localStorage.setItem('ak_ho_banks', JSON.stringify(_HO.banks)); }

window._hoBankModal = function() {
  var mo = document.createElement('div'); mo.className = 'mo';
  mo.innerHTML = '<div class="moc" style="max-width:460px;padding:20px"><div style="font-size:14px;font-weight:500;margin-bottom:14px">Banka / Kasa Ekle</div><div style="display:flex;flex-direction:column;gap:10px"><input class="fi" id="ho-b-name" placeholder="Banka / Kasa adi *"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select class="fi" id="ho-b-cur"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select><input class="fi" id="ho-b-bakiye" type="number" placeholder="Bakiye *"></div><input class="fi" id="ho-b-tip" placeholder="Hesap tipi (Vadesiz, Kasa...)"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn btns" onclick="this.closest(\'.mo\').remove()">Iptal</button><button class="btn btnp" onclick="window._hoSaveBank()">Ekle</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._hoSaveBank = function() {
  var name = (_g('ho-b-name')?.value || '').trim(); var cur = _g('ho-b-cur')?.value || 'TRY'; var bak = parseFloat(_g('ho-b-bakiye')?.value || '0') || 0; var tip = (_g('ho-b-tip')?.value || '').trim();
  if (!name || !bak) { window.toast?.('Ad ve bakiye zorunlu', 'err'); return; }
  _HO.banks.push({ id: Date.now(), name: name, currency: cur, bakiye: bak, tip: tip, updatedAt: _nowTs() });
  _saveBanks(); document.querySelector('.mo')?.remove(); window.renderHesapOzeti(); window.toast?.('Hesap eklendi', 'ok');
};
window._hoDeleteBank = function(id) { _HO.banks = _HO.banks.filter(function(b) { return b.id !== id; }); _saveBanks(); window.renderHesapOzeti(); };
window._hoUpdateBank = function(id, bakiye) { var b = _HO.banks.find(function(x) { return x.id === id; }); if (b) { b.bakiye = parseFloat(bakiye) || 0; b.updatedAt = _nowTs(); _saveBanks(); window.renderHesapOzeti(); } };

function _renderTrendBars(trend) {
  var maxVal = Math.max.apply(null, trend.map(function(t) { return Math.max(t.gelir, t.gider); })); if (!maxVal) maxVal = 1; var H = 130;
  return trend.map(function(t) {
    var gh = Math.round(t.gelir / maxVal * H); var gdr = Math.round(t.gider / maxVal * H);
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="display:flex;gap:3px;align-items:flex-end;height:' + H + 'px"><div style="width:10px;height:' + gh + 'px;background:' + (t.isThis ? '#185FA5' : '#B5D4F4') + ';border-radius:3px 3px 0 0"></div><div style="width:10px;height:' + gdr + 'px;background:' + (t.isThis ? '#A32D2D' : '#F09595') + ';border-radius:3px 3px 0 0"></div></div><div style="font-size:8px;color:' + (t.isThis ? '#185FA5' : 'var(--t3)') + ';font-weight:' + (t.isThis ? '500' : '400') + '">' + t.lbl + '</div></div>';
  }).join('');
}

function _renderFlowTable(data) {
  var cats = window.ODM_CATS || {};
  var rows = Object.keys(data.catMap).sort(function(a, b) { return data.catMap[b] - data.catMap[a]; }).map(function(cat) {
    var label = (cats[cat] && cats[cat].l) || cat; var amt = data.catMap[cat];
    return '<tr><td style="padding:6px 14px;color:var(--t2)">' + label + '</td><td style="padding:6px 14px;text-align:right;color:#dc2626">-₺' + _fmt(amt) + '</td></tr>';
  }).join('');
  rows += '<tr><td style="padding:6px 14px;color:var(--t2)">Tahsilat (Gelir)</td><td style="padding:6px 14px;text-align:right;color:#16a34a">+₺' + _fmt(data.totalGelir) + '</td></tr>';
  var netColor = data.net >= 0 ? '#16a34a' : '#dc2626';
  rows += '<tr style="background:var(--s2);font-weight:500"><td style="padding:6px 14px">TOPLAM NET</td><td style="padding:6px 14px;text-align:right;color:' + netColor + '">' + (data.net >= 0 ? '+' : '') + '₺' + _fmt(Math.abs(data.net)) + '</td></tr>';
  return '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:var(--s2);border-bottom:1px solid var(--b)"><th style="padding:6px 14px;text-align:left;font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase">Kategori</th><th style="padding:6px 14px;text-align:right;font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase">Tutar</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

window.renderHesapOzeti = function() {
  _loadBanks();
  var panel = _g('panel-hesap-ozeti'); if (!panel) return;
  var data = _collect(); var range = _periodRange();
  var periodLabels = { today: 'Bugun', week: 'Bu Hafta', month: 'Bu Ay', quarter: 'Bu Ceyrek', year: 'Bu Yil', custom: 'Ozel' };

  var pills = ['today', 'week', 'month', 'quarter', 'year'].map(function(p) {
    var on = p === _HO.period;
    return '<span onclick="window._hoSetPeriod(\'' + p + '\')" style="padding:3px 12px;border-radius:12px;font-size:10px;cursor:pointer;' + (on ? 'background:#185FA5;color:#E6F1FB;font-weight:500' : 'color:#85B7EB') + '">' + periodLabels[p] + '</span>';
  }).join('');

  var kpis = [
    { lbl: 'Toplam Gelir', val: '₺' + _fmtK(data.totalGelir), color: '#16a34a' },
    { lbl: 'Toplam Gider', val: '₺' + _fmtK(data.totalGider), color: '#dc2626' },
    { lbl: 'Net Pozisyon', val: (data.net >= 0 ? '+' : '') + '₺' + _fmtK(Math.abs(data.net)), color: data.net >= 0 ? '#185FA5' : '#dc2626' },
    { lbl: 'Vadesi Gecen', val: '₺' + _fmtK(data.vadesiGecenToplam), sub: data.vadesiGecen.length + ' kayit', color: '#D97706' },
    { lbl: 'Bekleyen Tahsilat', val: '₺' + _fmtK(data.bekleyenTahToplam), sub: data.bekleyenTah.length + ' kayit', color: '#7C3AED' },
  ];
  var kpiHTML = kpis.map(function(k) {
    return '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px 14px"><div style="font-size:9px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">' + k.lbl + '</div><div style="font-size:20px;font-weight:600;color:' + k.color + ';margin-bottom:3px">' + k.val + '</div>' + (k.sub ? '<div style="font-size:10px;color:var(--t3)">' + k.sub + '</div>' : '') + '</div>';
  }).join('');

  var today = _today();
  var overdueHTML = data.vadesiGecen.sort(function(a, b) { return a.due < b.due ? -1 : 1; }).slice(0, 5).map(function(o) {
    var diff = Math.floor((new Date(today) - new Date(o.due)) / 86400000);
    var bc = diff > 30 ? '#FCEBEB' : diff > 7 ? '#FAEEDA' : '#E6F1FB';
    var tc = diff > 30 ? '#791F1F' : diff > 7 ? '#633806' : '#0C447C';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:var(--s2)"><span style="font-size:8px;padding:1px 6px;border-radius:3px;background:' + bc + ';color:' + tc + ';font-weight:600;white-space:nowrap">' + diff + ' GUN</span><div style="flex:1;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (o.cariName || o.name || '—') + '</div><div style="font-size:11px;font-weight:500;color:#dc2626;white-space:nowrap">₺' + _fmt(_toTRY(o.amount || 0, o.currency || 'TRY')) + '</div></div>';
  }).join('') || '<div style="padding:16px;text-align:center;font-size:11px;color:var(--t3)">Vadesi gecen kayit yok</div>';

  var bankHTML = _HO.banks.map(function(b) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--s2);border-radius:7px;gap:8px"><div><div style="font-size:11px;font-weight:500;color:var(--t)">' + b.name + '</div><div style="font-size:9px;color:var(--t3)">' + (b.tip || b.currency) + '</div></div><input type="number" value="' + b.bakiye + '" onchange="window._hoUpdateBank(' + b.id + ',this.value)" style="width:90px;text-align:right;font-size:11px;font-weight:500;border:0.5px solid var(--b);border-radius:5px;padding:3px 6px;background:transparent;color:var(--t);font-family:inherit"><button onclick="window._hoDeleteBank(' + b.id + ')" style="border:none;background:transparent;cursor:pointer;font-size:11px;color:var(--t3);padding:2px 6px">x</button></div>';
  }).join('') + '<div style="display:flex;justify-content:space-between;padding:6px 10px;border-top:0.5px solid var(--b)"><span style="font-size:11px;font-weight:500;color:var(--t)">Toplam</span><span style="font-size:13px;font-weight:500;color:#185FA5">₺' + _fmt(data.toplamBanka) + '</span></div><div style="padding:6px 10px"><button onclick="window._hoBankModal()" style="width:100%;padding:6px;border:0.5px dashed var(--b);border-radius:6px;background:transparent;font-size:10px;color:var(--t3);cursor:pointer;font-family:inherit">+ Hesap / Kasa Ekle</button></div>';

  var gaugeNet = Math.min(Math.max(data.net / Math.max(data.totalGelir, 1), 0), 1);
  var gaugeLen = Math.round(gaugeNet * 188);
  var gaugeColor = data.net >= 0 ? '#185FA5' : '#dc2626';

  panel.innerHTML =
    '<div style="background:#042C53;padding:10px 20px;display:flex;align-items:center;gap:12px"><div><div style="font-size:14px;font-weight:600;color:#E6F1FB">Hesap Ozeti</div><div style="font-size:10px;color:#85B7EB">Son guncelleme: ' + new Date().toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</div></div><div style="flex:1"></div></div>'
    + '<div style="background:#031E38;padding:6px 20px;display:flex;gap:4px;align-items:center;border-bottom:0.5px solid rgba(255,255,255,.06)">' + pills + '<span style="width:0.5px;height:14px;background:rgba(255,255,255,.12);margin:0 6px;flex-shrink:0"></span><span style="font-size:10px;color:#5A8FC4">' + (range.from || '') + (range.from !== range.to ? ' — ' + (range.to || '') : '') + '</span></div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:14px">'
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">' + kpiHTML + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 320px;gap:12px">'
    // Sol
    + '<div style="display:flex;flex-direction:column;gap:12px">'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--b)"><div style="font-size:12px;font-weight:600;color:var(--t)">Gelir / Gider Trendi</div><div style="font-size:10px;color:var(--t3)">Son 6 ay</div></div><div style="padding:14px 14px 6px;display:flex;align-items:flex-end;gap:8px;height:168px">' + _renderTrendBars(data.trend) + '</div><div style="display:flex;gap:12px;padding:6px 14px 10px;font-size:9px;color:var(--t3)"><span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:#185FA5;display:inline-block"></span>Tahsilat</span><span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:#A32D2D;display:inline-block"></span>Odeme</span></div></div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--b)"><div style="font-size:12px;font-weight:600;color:var(--t)">Nakit Akis Tablosu</div></div>' + _renderFlowTable(data) + '</div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:12px;font-weight:600;color:var(--t)">Vadesi Gecen</div>' + (data.vadesiGecen.length ? '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:#FCEBEB;color:#791F1F">' + data.vadesiGecen.length + ' kritik</span>' : '') + '</div><div style="padding:8px 14px;display:flex;flex-direction:column;gap:5px">' + overdueHTML + '</div></div>'
    + '</div>'
    // Sag
    + '<div style="display:flex;flex-direction:column;gap:12px">'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--b)"><div style="font-size:12px;font-weight:600;color:var(--t)">Nakit Pozisyonu</div></div><div style="padding:16px 14px;display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="140" height="80" viewBox="0 0 140 80"><path d="M10 75 A60 60 0 0 1 130 75" fill="none" stroke="var(--b)" stroke-width="12" stroke-linecap="round"/><path d="M10 75 A60 60 0 0 1 130 75" fill="none" stroke="' + gaugeColor + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="188" stroke-dashoffset="' + (188 - gaugeLen) + '"/><text x="70" y="68" text-anchor="middle" font-size="13" font-weight="600" fill="' + gaugeColor + '">' + (data.net >= 0 ? '+' : '') + '₺' + _fmtK(Math.abs(data.net)) + '</text><text x="70" y="78" text-anchor="middle" font-size="7" fill="#888">Net Pozisyon</text></svg><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%"><div style="text-align:center;padding:6px;background:var(--s2);border-radius:7px"><div style="font-size:13px;font-weight:600;color:#16a34a">₺' + _fmtK(data.totalGelir) + '</div><div style="font-size:9px;color:var(--t3)">Gelir</div></div><div style="text-align:center;padding:6px;background:var(--s2);border-radius:7px"><div style="font-size:13px;font-weight:600;color:#dc2626">₺' + _fmtK(data.totalGider) + '</div><div style="font-size:9px;color:var(--t3)">Gider</div></div></div></div></div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--b)"><div style="font-size:12px;font-weight:600;color:var(--t)">Banka & Kasa</div></div><div style="padding:8px 14px;display:flex;flex-direction:column;gap:6px">' + bankHTML + '</div></div>'
    + '</div>'
    + '</div></div>';
};

window._hoSetPeriod = function(p) { _HO.period = p; if (p !== 'custom') { _HO.from = ''; _HO.to = ''; } window.renderHesapOzeti(); };
window._hoCustomRange = function() { _HO.from = _g('ho-from')?.value || ''; _HO.to = _g('ho-to')?.value || ''; if (_HO.from && _HO.to) window.renderHesapOzeti(); };

})();
