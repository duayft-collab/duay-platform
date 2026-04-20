/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/dashboard.js  —  v8.2.0
 * DASH-002 — Ana Dashboard tam yeniden tasarım
 *
 * Bölümler:
 *   1. Karşılama Banner
 *   2. Finans (4 metrik kart)
 *   3. Action Coach KPI (4 white kart)
 *   4. E-Myth + Vanish (3fr + 2fr)
 *   5. Nakit Grafik (SVG çizgi)
 *   6. Alt 4'lü (aktivite, iddialar, Q2, günün sözü)
 *   + Admin Hedef Modalı
 *
 * Anayasa: K01 ≤800, K08 strict, D2 app.js dokunulmaz, D3 IIFE
 * ════════════════════════════════════════════════════════════════
 */
(function DashboardModule() {
'use strict';

/* ── Kısayollar ─────────────────────────────────────────────── */
const _g   = id => document.getElementById(id);
const _esc = window._esc;
const _cu  = () => window.CU?.() || window.Auth?.getCU?.();
const _isA = () => { const r = _cu()?.role; return r === 'admin' || r === 'manager'; };
const _fmt = v => Math.round(Math.abs(v)).toLocaleString('tr-TR');
const _pct = v => Math.round(v) + '%';
const _ls  = k => localStorage.getItem(k);
const _lsn = k => parseFloat(_ls(k)) || 0;
const _lsj = (k, d) => { try { return JSON.parse(_ls(k)) || d; } catch { return d; } };

/* ── Renk Yardımcıları ──────────────────────────────────────── */
const BG3  = 'var(--bg)';
const BG2  = 'var(--s2)';
const BG1  = 'var(--sf)';
const BD   = 'var(--b)';
const BDM  = 'var(--bm)';
const T1   = 'var(--t)';
const T2   = 'var(--t2)';
const T3   = 'var(--t3)';
const GREEN = '#27500A';
const RED   = '#A32D2D';
const BLUE  = '#185FA5';
const NAVY  = '#0C447C';
const AMBER = '#EF9F27';
const PURPLE = '#3C3489';

/* ── Stil Sabitleri ─────────────────────────────────────────── */
const S_MK  = 'border-radius:8px;padding:12px 14px;background:' + BG2 + ';min-width:0;overflow:hidden';
const S_WK  = 'background:' + BG1 + ';border:0.5px solid ' + BD + ';border-radius:8px;padding:12px 14px;min-width:0;overflow:hidden';
const S_LBL = 'font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
const S_VAL = 'font-size:18px;font-weight:500;line-height:1.2;margin:3px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
const S_SUB = 'font-size:10px;color:' + T3 + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
const S_SEC = 'font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:' + T3 + ';margin-bottom:6px;display:flex;align-items:center;gap:6px';

/* ── Badge yardımcısı ───────────────────────────────────────── */
function _badge(text, bg, fg) {
  return '<span style="font-size:8px;padding:1px 6px;border-radius:4px;background:' + bg + ';color:' + fg + '">' + _esc(text) + '</span>';
}
const _bg = (t) => _badge(t, '#EAF3DE', GREEN);
const _ba = (t) => _badge(t, '#FAEEDA', '#633806');
const _br = (t) => _badge(t, '#FCEBEB', RED);
const _bb = (t) => _badge(t, '#E6F1FB', NAVY);
const _bp = (t) => _badge(t, '#EEEDFE', PURPLE);

/* ── Veri Yükleyiciler ──────────────────────────────────────── */
function _loadOdm()   { return (typeof window.loadOdm === 'function' ? window.loadOdm() : []).filter(o => !o.isDeleted); }
function _loadTah()   { return (typeof window.loadTahsilat === 'function' ? window.loadTahsilat() : []).filter(t => !t.isDeleted); }
function _loadIddia()  { return typeof window.loadIddialar === 'function' ? window.loadIddialar() : []; }
function _loadUsers()  { return typeof window.loadUsers === 'function' ? window.loadUsers() : []; }
function _loadTasks()  { return (typeof window.loadTasks === 'function' ? window.loadTasks() : []).filter(t => !t.isDeleted); }
function _loadNotifs() { return typeof window.loadNotifs === 'function' ? window.loadNotifs() : []; }
function _loadAlis()   { return typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : []; }
function _loadSozler() { return _lsj('ak_sozler1', []); }
function _loadCari()   { return typeof window.loadCari === 'function' ? window.loadCari().filter(c => !c.isDeleted) : []; }

/* ── Tarih Yardımcıları ─────────────────────────────────────── */
const _now   = () => new Date();
const _today = () => _now().toISOString().slice(0, 10);
function _thisMonth(d) {
  const n = d || _now();
  return n.getMonth() === _now().getMonth() && n.getFullYear() === _now().getFullYear();
}
function _getWeekNumber(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const y = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt - y) / 86400000 + 1) / 7);
}
function _weeklyGroup(items, field, weeks) {
  const now = _now();
  const result = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now); end.setDate(end.getDate() - w * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const sum = items.filter(i => {
      const d = new Date(i[field]);
      return d >= start && d <= end;
    }).reduce((s, i) => s + (parseFloat(i.amountTRY || i.amount) || 0), 0);
    result.push({ sum, start, end });
  }
  return result;
}

/* ── Ring SVG ───────────────────────────────────────────────── */
function _ring(pct, size, strokeW, color) {
  const r = (size - strokeW) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
    + '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + BG2 + '" stroke-width="' + strokeW + '"/>'
    + '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeW + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '" stroke-linecap="round" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"/>'
    + '<text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-size="' + Math.round(size * 0.28) + '" font-weight="600" fill="' + color + '">' + _pct(pct) + '</text></svg>';
}

/* ── Progress Bar ───────────────────────────────────────────── */
function _bar(pct, color) {
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  return '<div style="height:5px;border-radius:2px;background:' + BG2 + ';overflow:hidden"><div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:2px"></div></div>';
}

function _pctColor(pct, gT, aT) {
  const g = gT || 90, a = aT || 70;
  return pct >= g ? GREEN : pct >= a ? AMBER : '#E24B4A';
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 1 — KARŞILAMA BANNER
   ════════════════════════════════════════════════════════════════ */
function _renderBanner() {
  const cu = _cu();
  if (!cu) return '';
  const name = _esc(cu.displayName || cu.ad || cu.name || '');
  const n = _now();
  const dayStr = n.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const odm = _loadOdm();
  const tah = _loadTah();
  const pendingCount = odm.filter(o => o.approvalStatus === 'pending').length + tah.filter(t => t.approvalStatus === 'pending').length;
  const skorVal = _ls('ak_sistem_skoru') || '%—';

  // Bu ay tahsilat
  const ayTah = tah.filter(t => t.createdAt && _thisMonth(new Date(t.createdAt)))
    .reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  const otoVal = _ls('ak_otomasyon_oran') || '%0';
  const aktifIddia = _loadIddia().filter(x => x.durum === 'aktif').length;

  const chip = (label, val) => '<span style="padding:6px 12px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:10px;color:#E6F1FB">' + label + ' <b>' + val + '</b></span>';

  return '<div style="background:#042C53;border-radius:9px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between">'
    + '<div>'
    + '<div style="font-size:15px;color:#E6F1FB;font-weight:500">Günaydın, ' + name + '</div>'
    + '<div style="font-size:11px;color:#85B7EB">' + dayStr + ' · ' + pendingCount + ' onay bekliyor · Sistem skoru ' + _esc(skorVal) + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:6px">'
    + chip('Tahsilat', '₺' + _fmt(ayTah))
    + chip('Otomasyon', _esc(otoVal))
    + chip('İddia', String(aktifIddia))
    + '</div></div>';
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 2 — FİNANS
   ════════════════════════════════════════════════════════════════ */
function _renderIhracatOzet() {
  const ops = typeof window.loadIhracatOps === 'function' ? window.loadIhracatOps() : [];
  let h = '<div style="' + S_SEC + '">İHRACAT ' + _bb('Özet') + '</div>';
  if (!ops.length) {
    h += '<div style="' + S_WK + ';font-size:11px;color:' + T3 + ';text-align:center;padding:12px">Henüz ihracat kaydı yok<br><span onclick="window.App?.nav?.(\'ihracat-ops\')" style="color:' + BLUE + ';cursor:pointer;font-size:10px">Ekle →</span></div>';
    return h;
  }
  const yolda = ops.filter(o => o.status === 'yolda').length;
  const teslim = ops.filter(o => o.status === 'teslim' && o.gercekYukleme && _thisMonth(new Date(o.gercekYukleme))).length;
  const ciroUSD = ops.filter(o => o.doviz === 'USD').reduce((s, o) => s + ((parseFloat(o.birimFiyat) || 0) * (parseFloat(o.miktar) || 0)), 0);
  h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px">';
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Yolda</div><div style="' + S_VAL + ';color:' + BLUE + '">' + yolda + '</div><div style="' + S_SUB + '">Sevkiyat</div></div>';
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Bu Ay Teslim</div><div style="' + S_VAL + ';color:' + GREEN + '">' + teslim + '</div><div style="' + S_SUB + '">Tamamlandı</div></div>';
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Ciro USD</div><div style="font-size:18px;font-weight:500;color:' + T1 + '">$' + _fmt(ciroUSD) + '</div><div style="' + S_SUB + '">Toplam</div></div>';
  h += '</div>';
  h += '<div style="text-align:right;margin-top:4px"><span onclick="localStorage.setItem(\'ak_nav_grup\',\'ihracat\');window.App?.nav?.(\'dashboardDetay\')" style="font-size:10px;color:' + BLUE + ';cursor:pointer">Detay →</span></div>';
  return h;
}

function _toTRY(amount, currency) {
  if (!currency || currency === 'TRY') return parseFloat(amount) || 0;
  var rates = {};
  try { rates = JSON.parse(localStorage.getItem('ak_kur_rates') || '{}'); } catch (e) { /* */ }
  var r = rates[currency] || 1;
  return (parseFloat(amount) || 0) * r;
}

function _renderNakitBlok() {
  var tah = _loadTah();
  var odm = _loadOdm();
  var n = _now();
  var today = _today();
  var topTah = tah.reduce(function(s, t) { return s + _toTRY(t.amountTRY || t.amount, t.currency); }, 0);
  var topOdm = odm.reduce(function(s, o) { return s + _toTRY(o.amountTRY || o.amount, o.currency); }, 0);
  var net = topTah - topOdm;

  var ayTah = tah.filter(function(t) { var d = t.createdAt || t.updatedAt || t.ts; return d && _thisMonth(new Date(d)); }).reduce(function(s, t) { return s + _toTRY(t.amountTRY || t.amount, t.currency); }, 0);
  var gecenAy = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  var gecenAyTah = tah.filter(function(t) { var d = t.createdAt || t.updatedAt || t.ts; if (!d) return false; var dd = new Date(d); return dd.getMonth() === gecenAy.getMonth() && dd.getFullYear() === gecenAy.getFullYear(); }).reduce(function(s, t) { return s + _toTRY(t.amountTRY || t.amount, t.currency); }, 0);
  var degisim = gecenAyTah > 0 ? Math.round(((ayTah - gecenAyTah) / gecenAyTah) * 100) : 0;

  var gecik = tah.filter(function(t) { return t.approvalStatus !== 'approved' || (t.due && t.due < today && !t.collected); });
  var gecikTutar = gecik.reduce(function(s, t) { return s + _toTRY(t.amountTRY || t.amount, t.currency); }, 0);

  var tahHiz = (function() {
    var col = tah.filter(function(t) { return t.collected && t.due && t.ts; });
    if (!col.length) return null;
    var tot = col.reduce(function(s, t) { return s + Math.abs(Math.ceil((new Date(t.ts) - new Date(t.due)) / 86400000)); }, 0);
    return Math.round(tot / col.length);
  })();

  var weekCount = _nakitAy === 1 ? 4 : _nakitAy === 3 ? 13 : 26;
  var tahWeeks = _weeklyGroup(tah, 'createdAt', weekCount);
  var odmWeeks = _weeklyGroup(odm, 'createdAt', weekCount);
  var allVals = tahWeeks.map(function(w) { return w.sum; }).concat(odmWeeks.map(function(w) { return w.sum; }));
  var maxV = Math.max.apply(null, allVals.concat([1]));
  var svgW = 400, svgH = 80;
  var pts = tahWeeks.length;
  var step = pts > 1 ? svgW / (pts - 1) : svgW;

  var tahPath = '', odmPath = '';
  tahWeeks.forEach(function(w, i) { var x = (i * step).toFixed(1); var y = (svgH - (w.sum / maxV) * (svgH - 10) - 5).toFixed(1); tahPath += (i === 0 ? 'M' : 'L') + x + ',' + y; });
  odmWeeks.forEach(function(w, i) { var x = (i * step).toFixed(1); var y = (svgH - (w.sum / maxV) * (svgH - 10) - 5).toFixed(1); odmPath += (i === 0 ? 'M' : 'L') + x + ',' + y; });

  var tabBtn = function(label, val) {
    var active = _nakitAy === val;
    return '<span onclick="window._dashNakitTab(' + val + ')" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:9px;' + (active ? 'background:#E6F1FB;color:' + NAVY + ';font-weight:600' : 'color:' + T3) + '">' + label + '</span>';
  };

  var dColor = degisim >= 0 ? GREEN : RED;
  var hizColor = tahHiz === null ? BLUE : tahHiz <= 15 ? GREEN : tahHiz <= 30 ? AMBER : RED;

  var h = '';
  // Koyu topbar
  h += '<div style="background:#042C53;border-radius:9px 9px 0 0;padding:10px 16px;display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;font-weight:500;color:#E6F1FB">Nakit Akışı</span><div style="display:flex;gap:2px;background:rgba(255,255,255,.08);border-radius:5px;padding:2px">' + tabBtn('1A', 1) + tabBtn('3A', 3) + tabBtn('6A', 6) + '</div></div>';

  // 4 KPI
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);border:0.5px solid ' + BD + ';border-top:none;border-bottom:none">';
  h += '<div style="' + S_MK + ';border-right:0.5px solid ' + BD + '"><div style="' + S_LBL + '">Net Pozisyon</div><div style="font-size:16px;font-weight:500;color:' + (net >= 0 ? GREEN : RED) + '">' + (net >= 0 ? '+' : '-') + '₺' + _fmt(Math.abs(net)) + '</div><div style="' + S_SUB + ';color:' + (net >= 0 ? GREEN : RED) + '">' + (net >= 0 ? 'Pozitif' : 'Negatif') + '</div></div>';
  h += '<div style="' + S_MK + ';border-right:0.5px solid ' + BD + '"><div style="' + S_LBL + '">Bu Ay Tahsilat</div><div style="font-size:16px;font-weight:500;color:' + T1 + '">₺' + _fmt(ayTah) + '</div><div style="' + S_SUB + ';color:' + dColor + '">' + (degisim >= 0 ? '↑' : '↓') + ' ' + _pct(Math.abs(degisim)) + '</div></div>';
  h += '<div style="' + S_MK + ';border-right:0.5px solid ' + BD + '"><div style="' + S_LBL + '">Gecikmiş Alacak</div><div style="font-size:16px;font-weight:500;color:' + RED + '">₺' + _fmt(gecikTutar) + '</div><div style="' + S_SUB + '">' + gecik.length + ' kayıt</div></div>';
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Tahsil Hızı</div><div style="font-size:16px;font-weight:500;color:' + hizColor + '">' + (tahHiz !== null ? tahHiz + ' gün' : '— gün') + '</div><div style="' + S_SUB + ';color:' + (tahHiz && tahHiz > 15 ? AMBER : T3) + '">Hedef: 15 gün</div></div>';
  h += '</div>';

  // Grafik
  h += '<div style="background:' + BG1 + ';border:0.5px solid ' + BD + ';border-top:none;padding:10px 14px 5px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px"><span style="font-size:10px;font-weight:500;color:' + T1 + '">Haftalık trend</span></div>';
  h += '<svg width="100%" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="none">';
  if (tahPath) h += '<path d="' + tahPath + ' L' + ((pts - 1) * step).toFixed(1) + ',' + (svgH - 5) + ' L0,' + (svgH - 5) + ' Z" fill="' + BLUE + '" opacity=".06"/>';
  if (tahPath) h += '<path d="' + tahPath + '" fill="none" stroke="' + BLUE + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
  if (odmPath) h += '<path d="' + odmPath + '" fill="none" stroke="#F09595" stroke-width="1.3" stroke-dasharray="3 2" stroke-linecap="round"/>';
  h += '</svg>';
  h += '<div style="display:flex;gap:10px;font-size:8px;color:' + T3 + ';margin-top:4px"><span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.8px;background:' + BLUE + ';display:inline-block"></span>Tahsilat</span><span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.3px;background:#F09595;border-top:1px dashed #F09595;display:inline-block"></span>Ödeme</span></div></div>';

  // Döviz bazlı gecikmiş alacak kur fark analizi
  var _kurRates = {};
  try { _kurRates = JSON.parse(localStorage.getItem('ak_kur_rates') || '{}'); } catch (e) { /* */ }
  var _gecikDoviz = gecik.filter(function(t) { return t.currency && t.currency !== 'TRY' && (parseFloat(t.amount) || 0) > 0; });
  if (_gecikDoviz.length > 0) {
    var _dovizGrp = {};
    _gecikDoviz.forEach(function(t) {
      var cur = t.currency;
      if (!_dovizGrp[cur]) _dovizGrp[cur] = { cur: cur, totalAmt: 0, totalFark: 0, items: [] };
      var amt = parseFloat(t.amount) || 0;
      var girisKur = parseFloat(t.kurRate) || 0;
      var bugunKur = parseFloat(_kurRates[cur]) || 0;
      var fark = (girisKur > 0 && bugunKur > 0) ? (bugunKur - girisKur) * amt : 0;
      _dovizGrp[cur].totalAmt += amt;
      _dovizGrp[cur].totalFark += fark;
      _dovizGrp[cur].items.push({ amt: amt, girisKur: girisKur, bugunKur: bugunKur, fark: fark });
    });
    var _toplamFark = Object.values(_dovizGrp).reduce(function(s, g) { return s + g.totalFark; }, 0);
    var _farkColor = _toplamFark >= 0 ? GREEN : RED;

    h += '<div style="background:' + BG1 + ';border:0.5px solid ' + BD + ';border-top:none;padding:9px 14px">';
    h += '<div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:' + T3 + ';margin-bottom:7px">Döviz Bazlı Gecikmiş Alacak — Kur Farkı</div>';
    Object.values(_dovizGrp).forEach(function(g) {
      var sym = g.cur === 'USD' ? '$' : g.cur === 'EUR' ? '€' : g.cur;
      var avgGiris = g.items.filter(function(i) { return i.girisKur > 0; });
      var girisAvg = avgGiris.length > 0 ? Math.round(avgGiris.reduce(function(s, i) { return s + i.girisKur; }, 0) / avgGiris.length * 100) / 100 : 0;
      var bugun = g.items[0]?.bugunKur || 0;
      var fc = g.totalFark >= 0 ? GREEN : RED;
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:0.5px solid ' + BD + ';font-size:11px">';
      h += '<div><span style="font-weight:600;color:' + T1 + '">' + g.cur + '</span> · <span style="color:' + T2 + '">' + sym + Math.round(g.totalAmt).toLocaleString('tr-TR') + '</span>';
      if (girisAvg > 0 && bugun > 0) h += ' <span style="font-size:9px;color:' + T3 + '">Giriş: ₺' + girisAvg.toFixed(2) + ' → Bugün: ₺' + bugun.toFixed(2) + '</span>';
      h += '</div>';
      h += '<div style="font-weight:600;color:' + fc + '">' + (g.totalFark >= 0 ? '+' : '') + '₺' + Math.round(Math.abs(g.totalFark)).toLocaleString('tr-TR') + '</div></div>';
    });
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:11px;font-weight:600"><span style="color:' + T1 + '">Toplam Kur Farkı</span><span style="color:' + _farkColor + '">' + (_toplamFark >= 0 ? '+' : '') + '₺' + Math.round(Math.abs(_toplamFark)).toLocaleString('tr-TR') + ' ' + (_toplamFark >= 0 ? '(avantaj)' : '(kayıp)') + '</span></div>';
    h += '</div>';
  }

  // Link
  h += '<div style="background:' + BG1 + ';border:0.5px solid ' + BD + ';border-top:none;border-radius:0 0 9px 9px;padding:6px 14px;text-align:right"><span onclick="window.App?.nav?.(\'odemeler\')" style="font-size:9px;color:' + BLUE + ';cursor:pointer;padding:3px 8px;border-radius:4px;background:#E6F1FB">Nakit Akışı tam liste →</span></div>';

  return h;
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 3 — ACTION COACH KPI
   ════════════════════════════════════════════════════════════════ */
function _renderKPI() {
  const alis = _loadAlis();
  const kabul = alis.filter(a => a.status === 'kabul' || a.status === 'approved' || a.accepted);
  const konvPct = alis.length > 0 ? Math.round((kabul.length / alis.length) * 100) : 0;
  const hedefKonv = _lsn('ak_hedef_konversiyon') || 40;
  const konvColor = konvPct >= 75 ? '#97C459' : konvPct >= 50 ? AMBER : '#E24B4A';

  // Haftalık büyüme
  const tah = _loadTah();
  const weeks = _weeklyGroup(tah, 'createdAt', 6);
  const maxWeek = Math.max(...weeks.map(w => w.sum), 1);
  const barColors = ['#E6F1FB', '#B5D4F4', '#85B7EB', '#378ADD', '#185FA5', '#0C447C'];
  const lastW = weeks[weeks.length - 1]?.sum || 0;
  const prevW = weeks[weeks.length - 2]?.sum || 0;
  const buyumePct = prevW > 0 ? Math.round(((lastW - prevW) / prevW) * 100) : 0;

  // Ekip performans
  const users = _loadUsers().filter(u => u.status === 'active' || u.aktif);
  const tasks = _loadTasks();

  // Hedef vs gerçek
  const hedefCiro = _lsn('ak_hedef_ciro') || 1;
  const ayTah = tah.filter(t => t.createdAt && _thisMonth(new Date(t.createdAt)))
    .reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  const hedefMusteri = _lsn('ak_hedef_musteri') || 1;
  const yeniMusteri = _loadCari().filter(c => c.createdAt && _thisMonth(new Date(c.createdAt))).length;

  let h = '<div style="' + S_SEC + '">' + _esc('ACTION COACH KPI') + ' ' + _ba('Büyüme & Satış') + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px">';

  // Kart 1 — Satış Konversiyon
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:10px">'
    + _ring(konvPct, 47, 3.5, konvColor)
    + '<div><div style="font-size:12px;font-weight:500;color:' + T1 + '">Satış Konversiyon</div>'
    + '<div style="font-size:9px;color:' + T3 + '">Hedef: ' + _pct(hedefKonv) + ' · Teklif→Sipariş</div>'
    + '<div style="font-size:9px;color:' + T3 + '">Fark: ' + (konvPct - hedefKonv >= 0 ? '+' : '') + _pct(konvPct - hedefKonv) + '</div>'
    + _bg('Hedef') + '</div></div>';

  // Kart 2 — Haftalık Büyüme
  const barH = 52;
  let barSvg = '<svg width="100%" height="' + barH + '" viewBox="0 0 120 ' + barH + '" preserveAspectRatio="none">';
  const bw = 120 / 6;
  weeks.forEach((w, i) => {
    const bh = maxWeek > 0 ? Math.max(2, (w.sum / maxWeek) * (barH - 4)) : 2;
    barSvg += '<rect x="' + (i * bw + 2) + '" y="' + (barH - bh) + '" width="' + (bw - 4) + '" height="' + bh + '" rx="2" fill="' + barColors[i] + '"/>';
  });
  barSvg += '</svg>';
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:5px">Haftalık Büyüme</div>'
    + barSvg
    + '<div style="font-size:9px;color:' + T3 + ';margin-top:4px;display:flex;justify-content:space-between">'
    + '<span>Son 6 hafta</span>'
    + (buyumePct >= 0 ? _bg('+' + _pct(buyumePct)) : _br(_pct(buyumePct)))
    + '</div></div>';

  // Kart 3 — Ekip Performans
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:7px">Ekip Performans</div>';
  users.slice(0, 4).forEach(u => {
    const uTasks = tasks.filter(t => t.uid === u.id);
    const done = uTasks.filter(t => t.done).length;
    const total = uTasks.length || 1;
    const pct = Math.round((done / total) * 100);
    h += '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;color:' + T2 + ';margin-bottom:2px">'
      + '<span>' + _esc((u.name || '').split(' ')[0]) + '</span><span>' + _pct(pct) + '</span></div>'
      + _bar(pct, BLUE) + '</div>';
  });
  h += '</div>';

  // Kart 4 — Hedef vs Gerçek
  const ciroPct = Math.round((ayTah / hedefCiro) * 100);
  const mustPct = Math.round((yeniMusteri / hedefMusteri) * 100);
  const sopTam = _lsn('ak_sop_tamamlanan');
  const sopTop = _lsn('ak_sop_toplam') || 1;
  const tahHiz = Math.min(100, Math.round(ayTah / (hedefCiro || 1) * 100));
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:7px">Hedef vs Gerçek</div>';
  const hvg = [
    { label: 'Aylık Ciro', pct: ciroPct },
    { label: 'Yeni Müşteri', pct: mustPct },
    { label: 'Tahsilat Hızı', pct: tahHiz },
  ];
  hvg.forEach(item => {
    const c = _pctColor(item.pct);
    h += '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;color:' + T2 + ';margin-bottom:2px">'
      + '<span>' + item.label + '</span><span style="color:' + c + '">' + _pct(item.pct) + '</span></div>'
      + _bar(item.pct, c) + '</div>';
  });
  h += '</div>';

  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 4 — E-MYTH + VANISH
   ════════════════════════════════════════════════════════════════ */
function _calcEmythVanish() {
  try {
    // SOP hesaplama
    if (typeof window.loadLocalDocs === 'function') {
      const docs = window.loadLocalDocs();
      const sopDocs = docs.filter(d => d.cat === 'Sistem' || d.cat === 'Operasyon' || (d.name && d.name.toUpperCase().includes('SOP')));
      const tam = sopDocs.length;
      const top = docs.length || 1;
      if (tam > 0) {
        localStorage.setItem('ak_sop_tamamlanan', tam);
        localStorage.setItem('ak_sop_toplam', top);
        const sopPct = Math.round((tam / top) * 100);
        const sistemsiz = Math.max(0, 100 - sopPct);
        localStorage.setItem('ak_sistemsiz_oran', sistemsiz);
      }
    }
    // Görev tamamlanma → delegasyon proxy
    if (typeof window.loadTasks === 'function') {
      const tasks = window.loadTasks().filter(t => !t.isDeleted);
      const total = tasks.length || 1;
      const done = tasks.filter(t => t.done === true || t.status === 'done').length;
      const delPct = Math.round((done / total) * 100);
      if (delPct > 0) localStorage.setItem('ak_delegasyon_skor', delPct);
      // Sahipsiz karar — uid boş/null olan bu haftaki görevler
      const weekAgo = Date.now() - 7 * 86400000;
      const sahipsiz = tasks.filter(t => {
        const ts = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        return (!t.uid || t.uid === 0 || t.uid === '') && ts > weekAgo;
      }).length;
      localStorage.setItem('ak_sahipsiz_karar', sahipsiz);
    }
    // Otomatik sistem skoru hesapla (100 üzerinden)
    var _autoSkor = 0;
    // +30: DB health sağlıklıysa
    if (typeof window._getDbHealth === 'function') {
      var _dbH2 = window._getDbHealth();
      if (!_dbH2.hasRed && !_dbH2.hasAmber) _autoSkor += 30;
      else if (!_dbH2.hasRed) _autoSkor += 15;
      // +15: localStorage <%60 doluysa
      if (_dbH2.storage.pct < 60) _autoSkor += 15;
      else if (_dbH2.storage.pct < 80) _autoSkor += 8;
      // +10: updatedAt eksik <%5
      if (_dbH2.data.noUpdatedAtPct < 5) _autoSkor += 10;
      else if (_dbH2.data.noUpdatedAtPct < 20) _autoSkor += 5;
    } else { _autoSkor += 55; }
    // +20: gecikmiş alacak yoksa
    if (typeof window.loadTahsilat === 'function') {
      var _today2 = _today();
      var _gecik2 = window.loadTahsilat().filter(function(t) { return !t.isDeleted && t.due && t.due < _today2 && !t.collected; });
      if (_gecik2.length === 0) _autoSkor += 20;
      else if (_gecik2.length < 5) _autoSkor += 10;
    } else { _autoSkor += 20; }
    // +25: görev tamamlama >%70
    if (typeof window.loadTasks === 'function') {
      var _t2 = window.loadTasks().filter(function(t) { return !t.isDeleted; });
      var _d2 = _t2.filter(function(t) { return t.done || t.status === 'done'; }).length;
      var _pct2 = _t2.length > 0 ? Math.round((_d2 / _t2.length) * 100) : 100;
      if (_pct2 >= 70) _autoSkor += 25;
      else if (_pct2 >= 50) _autoSkor += 15;
      else _autoSkor += 5;
    } else { _autoSkor += 25; }
    localStorage.setItem('ak_sistem_skoru', '%' + Math.min(100, _autoSkor));
  } catch (e) { console.warn('[DASH] calcEmythVanish:', e.message); }
}

function _renderEmythVanish() {
  let h = '<div style="display:grid;grid-template-columns:3fr 2fr;gap:9px">';

  // ── E-MYTH ──
  h += '<div>';
  h += '<div style="' + S_SEC + '">' + _esc('E-MYTH — SİSTEM KURUMU') + ' ' + _bp('SOP & Sistem') + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px">';

  // SOP Tamamlanma
  const sopTam = _lsn('ak_sop_tamamlanan');
  const sopTop = _lsn('ak_sop_toplam') || 1;
  const sopPct = Math.round((sopTam / sopTop) * 100);
  const sopColor = sopPct >= 80 ? GREEN : sopPct >= 60 ? AMBER : '#E24B4A';
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:10px">'
    + _ring(sopPct, 44, 3, sopColor)
    + '<div><div style="font-size:15px;font-weight:600;color:' + T1 + '">' + sopTam + '/' + Math.round(sopTop) + '</div>'
    + '<div style="font-size:9px;color:#E24B4A">' + (Math.round(sopTop) - sopTam) + ' eksik</div></div></div>';

  // Sistemsiz İş Oranı
  const sistemsiz = _lsn('ak_sistemsiz_oran');
  const sisColor = sistemsiz < 10 ? GREEN : AMBER;
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:10px">'
    + _ring(sistemsiz, 44, 3, sisColor)
    + '<div><div style="font-size:15px;font-weight:600;color:' + T1 + '">' + _pct(sistemsiz) + '</div>'
    + '<div style="font-size:9px;color:#E24B4A">Hedef: %10 altı</div></div></div>';

  // Modül Skorları
  const skorlar = _lsj('ak_modul_skorlar', { nakit: 0, gorev: 0, katalog: 0, musteri: 0 });
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:5px">Modül Skorları</div>';
  Object.entries(skorlar).forEach(([k, v]) => {
    const b = v >= 80 ? _bg(_pct(v)) : v >= 60 ? _ba(_pct(v)) : _br(_pct(v));
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:' + T2 + ';margin-bottom:3px">'
      + '<span>' + _esc(k) + '</span>' + b + '</div>';
  });
  h += '</div>';
  h += '</div></div>';

  // ── VANISH ──
  h += '<div>';
  h += '<div style="' + S_SEC + '">' + _esc('VANİSH ENDEKSİ') + ' ' + _bg('Sahipsiz Çalışma') + '</div>';

  const otoOran = _lsn('ak_otomasyon_oran');
  const sahipsiz = _lsn('ak_sahipsiz_karar');
  const delegasyon = _lsn('ak_delegasyon_skor');
  const sahipMud = _lsn('ak_sahip_mudahale');

  h += '<div style="' + S_WK + '">';
  // Üst 2 metrik
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px">';
  h += '<div style="background:' + BG2 + ';border-radius:6px;padding:10px;text-align:center">'
    + '<div style="font-size:25px;font-weight:600;color:' + GREEN + '">' + _pct(otoOran) + '</div>'
    + '<div style="font-size:9px;color:' + T3 + '">Otomasyon</div></div>';
  h += '<div style="background:' + BG2 + ';border-radius:6px;padding:10px;text-align:center">'
    + '<div style="font-size:25px;font-weight:600;color:' + BLUE + '">' + Math.round(sahipsiz) + '</div>'
    + '<div style="font-size:9px;color:' + T3 + '">Sahipsiz Karar/hafta</div></div>';
  h += '</div>';

  // Alt progress barlar
  h += '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;color:' + T2 + ';margin-bottom:2px">'
    + '<span>Delegasyon Skoru</span><span>' + _pct(delegasyon) + '</span></div>' + _bar(delegasyon, GREEN) + '</div>';
  h += '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;color:' + T2 + ';margin-bottom:2px">'
    + '<span>Sahip Müdahale</span><span>' + _pct(sahipMud) + '</span></div>' + _bar(sahipMud, '#E24B4A') + '</div>';
  h += '<div style="font-size:11px;color:' + T3 + ';margin-top:9px">Sahip müdahalesi düşükse sistem çalışıyor.</div>';
  h += '</div></div>';

  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 5 — NAKİT GRAFİK
   ════════════════════════════════════════════════════════════════ */
let _nakitAy = 1; // 1=1A, 3=3A, 6=6A

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 6 — ALT 4'LÜ
   ════════════════════════════════════════════════════════════════ */
function _renderAlt() {
  const cu = _cu();
  let h = '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">';

  // ── Kart 1: Son Aktivite ──
  const notifs = _loadNotifs().slice(0, 4);
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:7px">Son Aktivite</div>';
  const ikonMap = {
    odeme: ['#E6F1FB', NAVY], tahsilat: ['#E6F1FB', NAVY],
    gorev: ['#EAF3DE', GREEN], uyari: ['#FCEBEB', RED], iddia: ['#EEEDFE', PURPLE]
  };
  if (notifs.length === 0) {
    h += '<div style="font-size:9px;color:' + T3 + ';text-align:center;padding:8px">Bildirim yok</div>';
  }
  notifs.forEach(n => {
    const typ = (n.type || 'gorev').toLowerCase();
    const ic = ikonMap[typ] || ikonMap.gorev;
    const saat = n.ts ? new Date(n.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    h += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">'
      + '<div style="width:23px;height:23px;border-radius:50%;background:' + ic[0] + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<span style="font-size:9px;color:' + ic[1] + '">●</span></div>'
      + '<span style="flex:1;font-size:10px;color:' + T2 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(n.msg || n.message || '') + '</span>'
      + '<span style="font-size:9px;color:' + T3 + ';white-space:nowrap">' + saat + '</span></div>';
  });
  h += '</div>';

  // ── Kart 2: Aktif İddialar ──
  const iddialar = _loadIddia().filter(x => x.durum === 'aktif').slice(0, 3);
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:7px">Aktif İddialar</div>';
  if (iddialar.length === 0) {
    h += '<div style="font-size:9px;color:' + T3 + ';text-align:center;padding:8px">Aktif iddia yok</div>';
  }
  iddialar.forEach(id => {
    const baslık = _esc(id.baslik || id.title || '');
    const harf = (id.sahibi || id.owner || '?')[0].toUpperCase();
    const hash = (id.sahibi || id.owner || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const avColors = ['#E0E7FF', '#DCFCE7', '#F3E8FF', '#FEF3C7', '#FCE7F3'];
    const avBg = avColors[hash % avColors.length];
    const kalanGun = id.bitis ? Math.max(0, Math.ceil((new Date(id.bitis) - _now()) / 86400000)) : '—';
    const turBadge = id.tur === 'verimlilik' ? _ba('Verimlilik') : id.tur === 'kalite' ? _bp('Kalite') : id.tur === 'satis' ? _bg('Satış') : _bb('Süre');
    h += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">'
      + '<div style="width:23px;height:23px;border-radius:50%;background:' + avBg + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex-shrink:0">' + harf + '</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:10px;color:' + T1 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + baslık + '</div>'
      + '<div style="display:flex;gap:4px;align-items:center;font-size:9px;color:' + T3 + '">' + kalanGun + 'g kaldı · ' + turBadge + '</div></div></div>';
  });
  h += '</div>';

  // ── Kart 3: Q2 Hedefleri ──
  const q2 = _lsj('ak_q2_hedefler', { ciro: 0, sop: 0, vanish: 0, musteri: 0 });
  const tah = _loadTah();
  const ayTah = tah.filter(t => t.createdAt && _thisMonth(new Date(t.createdAt)))
    .reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  const sopT = _lsn('ak_sop_tamamlanan');
  const sopTp = _lsn('ak_sop_toplam') || 1;
  const otoO = _lsn('ak_otomasyon_oran');
  const yeniM = _loadCari().filter(c => c.createdAt && _thisMonth(new Date(c.createdAt))).length;
  const q2Items = [
    { label: 'Ciro ₺' + _fmt(q2.ciro || 1), pct: Math.round((ayTah / (q2.ciro || 1)) * 100) },
    { label: 'SOP ' + _pct((sopT / sopTp) * 100), pct: Math.round((sopT / sopTp) * 100) },
    { label: 'Vanish ' + _pct(otoO), pct: Math.round((otoO / 90) * 100) },
    { label: 'Yeni Müşteri ' + yeniM, pct: Math.round((yeniM / (q2.musteri || 1)) * 100) },
  ];
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:12px;font-weight:500;color:' + T1 + ';margin-bottom:7px">Q2 Hedefleri</div>';
  q2Items.forEach(item => {
    const c = item.pct >= 80 ? BLUE : item.pct >= 60 ? AMBER : '#E24B4A';
    h += '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;color:' + T2 + ';margin-bottom:2px">'
      + '<span>' + item.label + '</span><span style="color:' + c + '">' + _pct(item.pct) + '</span></div>'
      + _bar(item.pct, c) + '</div>';
  });
  h += '</div>';

  // ── Kart 4: Günün Sözü ──
  const sozler = _loadSozler().filter(s => s.aktif !== false);
  const gunSoz = _ls('ak_gunun_sozu');
  let soz = null;
  if (gunSoz) {
    try { soz = JSON.parse(gunSoz); } catch { /* ignore */ }
  }
  if (!soz && sozler.length > 0) {
    const dayIdx = Math.floor(_now().getTime() / 86400000) % sozler.length;
    soz = sozler[dayIdx];
  }
  h += '<div style="background:#042C53;border-radius:8px;padding:13px">';
  h += '<div style="font-size:13px;color:#A32D2D;margin-bottom:7px">ℹ</div>';
  if (soz) {
    h += '<div style="font-size:11px;color:#E6F1FB;font-style:italic;line-height:1.5">' + _esc(soz.soz || soz.text || '') + '</div>'
      + '<div style="width:20px;height:1.5px;background:#378ADD;margin:7px 0"></div>'
      + '<div style="font-size:10px;color:#85B7EB">' + _esc(soz.yazar || soz.author || '') + '</div>';
  } else {
    h += '<div style="font-size:11px;color:#85B7EB;font-style:italic">Henüz söz eklenmemiş</div>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   ADMİN AYARLAR MODALI
   ════════════════════════════════════════════════════════════════ */
function _openAdminModal() {
  let existing = _g('dash-admin-modal');
  if (existing) { existing.remove(); return; }

  const fields = [
    { key: 'ak_sistem_skoru', label: 'Sistem Skoru (%)', type: 'number' },
    { key: 'ak_otomasyon_oran', label: 'Otomasyon Oranı (%)', type: 'number' },
    { key: 'ak_sahip_mudahale', label: 'Sahip Müdahale (%)', type: 'number' },
    { key: 'ak_hedef_konversiyon', label: 'Hedef Konversiyon (%)', type: 'number' },
    { key: 'ak_hedef_ciro', label: 'Hedef Ciro (TL)', type: 'number' },
    { key: 'ak_hedef_musteri', label: 'Hedef Yeni Müşteri', type: 'number' },
    { key: 'ak_hedef_ihracat_adet', label: 'Aylık Hedef Sevkiyat (adet)', type: 'number' },
    { key: 'ak_hedef_ihracat_ciro', label: 'Aylık Hedef Ciro (USD)', type: 'number' },
  ];

  const modulFields = ['nakit', 'gorev', 'katalog', 'musteri'];
  const q2Fields = ['ciro', 'sop', 'vanish', 'musteri'];

  const overlay = document.createElement('div');
  overlay.id = 'dash-admin-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center';

  let mh = '<div style="background:' + BG1 + ';border-radius:12px;padding:20px;width:460px;max-height:80vh;overflow-y:auto">';
  mh += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<span style="font-size:13px;font-weight:600;color:' + T1 + '">Hedefleri Düzenle</span>'
    + '<span onclick="document.getElementById(\'dash-admin-modal\').remove()" style="cursor:pointer;font-size:16px;color:' + T3 + '">✕</span></div>';

  fields.forEach(f => {
    const val = _ls(f.key) || '';
    mh += '<div style="margin-bottom:8px"><label style="font-size:9px;color:' + T3 + ';display:block;margin-bottom:2px">' + _esc(f.label) + '</label>'
      + '<input data-dash-key="' + f.key + '" type="' + f.type + '" value="' + _esc(val) + '" style="width:100%;padding:5px 8px;border:0.5px solid ' + BD + ';border-radius:6px;font-size:11px;background:' + BG2 + ';color:' + T1 + '"/></div>';
  });

  // Modül skorları
  const mSkor = _lsj('ak_modul_skorlar', { nakit: 0, gorev: 0, katalog: 0, musteri: 0 });
  mh += '<div style="font-size:9px;color:' + T3 + ';margin:10px 0 4px">Modül Skorları</div>';
  mh += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  modulFields.forEach(k => {
    mh += '<div><label style="font-size:8px;color:' + T3 + '">' + _esc(k) + '</label>'
      + '<input data-dash-modul="' + k + '" type="number" value="' + (mSkor[k] || 0) + '" style="width:100%;padding:4px 6px;border:0.5px solid ' + BD + ';border-radius:4px;font-size:10px;background:' + BG2 + ';color:' + T1 + '"/></div>';
  });
  mh += '</div>';

  // Q2 Hedefleri
  const q2 = _lsj('ak_q2_hedefler', { ciro: 0, sop: 0, vanish: 0, musteri: 0 });
  mh += '<div style="font-size:9px;color:' + T3 + ';margin:10px 0 4px">Q2 Hedefleri</div>';
  mh += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  q2Fields.forEach(k => {
    mh += '<div><label style="font-size:8px;color:' + T3 + '">' + _esc(k) + '</label>'
      + '<input data-dash-q2="' + k + '" type="number" value="' + (q2[k] || 0) + '" style="width:100%;padding:4px 6px;border:0.5px solid ' + BD + ';border-radius:4px;font-size:10px;background:' + BG2 + ';color:' + T1 + '"/></div>';
  });
  mh += '</div>';

  mh += '<button id="dash-admin-save" style="margin-top:14px;width:100%;padding:8px;border:none;border-radius:8px;background:#042C53;color:#E6F1FB;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Kaydet</button>';
  mh += '</div>';

  overlay.innerHTML = mh;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  _g('dash-admin-save').addEventListener('click', function() {
    overlay.querySelectorAll('[data-dash-key]').forEach(inp => {
      localStorage.setItem(inp.dataset.dashKey, inp.value);
    });
    const modulObj = {};
    overlay.querySelectorAll('[data-dash-modul]').forEach(inp => {
      modulObj[inp.dataset.dashModul] = parseFloat(inp.value) || 0;
    });
    localStorage.setItem('ak_modul_skorlar', JSON.stringify(modulObj));
    const q2Obj = {};
    overlay.querySelectorAll('[data-dash-q2]').forEach(inp => {
      q2Obj[inp.dataset.dashQ2] = parseFloat(inp.value) || 0;
    });
    localStorage.setItem('ak_q2_hedefler', JSON.stringify(q2Obj));
    overlay.remove();
    if (typeof window.toast === 'function') window.toast('Hedefler kaydedildi', 'success');
    renderDashboard();
  });
}

/* ════════════════════════════════════════════════════════════════
   ANA RENDER
   ════════════════════════════════════════════════════════════════ */
/** @public */
/* PIRIM-DASHBOARD-WIDGET-001: staff + lead için dashboard'a "Primim" widget'ı */
window._pirimiGetir = function() {
  var cu = window.CU?.() || window.Auth?.getCU?.();
  if (!cu) return;
  window.App?.nav?.('pirim');
};

function _renderPirimimWidget() {
  const role = _cu()?.role || '';
  /* PIRIM-DASHBOARD-ADMIN-001: Admin için tüm personel prim özet tablosu */
  if (role === 'admin' || role === 'manager') {
    if (typeof loadPirim !== 'function') return '';
    var primler = loadPirim().filter(function(p){ return !p.isDeleted; });
    if (!primler.length) return '';
    var users = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u){ return !u.isDeleted; });
    var userMap = {};
    users.forEach(function(u){ userMap[u.uid||u.id] = u.displayName || u.ad || u.name || u.email || '?'; });
    var ozet = {};
    primler.forEach(function(p){
      var uid = p.uid || p.assignedTo || 'unknown';
      // PIRIM-DASH-CLICK-001: uid field'ı ozet value'ya eklenir (rows map preserve)
      if (!ozet[uid]) ozet[uid] = { uid: uid, ad: userMap[uid] || '—', toplam:0, odenen:0, bekleyen:0 };
      var amt = parseFloat(p.amount) || 0;
      ozet[uid].toplam += amt;
      if (p.status === 'paid') ozet[uid].odenen += amt;
      else ozet[uid].bekleyen += amt;
    });
    /* PIRIM-DASH-SORT-BEKLEYEN-001: bekleyen prime göre sırala (en çok bekleyen üstte) */
    var rows = Object.keys(ozet).map(function(k){ return ozet[k]; }).sort(function(a,b){ return b.bekleyen - a.bekleyen; });
    var fmt = function(n){ return n.toLocaleString('tr-TR', {minimumFractionDigits:0, maximumFractionDigits:0}); };
    var h = '<div onclick="window._pirimiGetir()" style="cursor:pointer;padding:14px 16px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf)">'
      // PIRIM-ADMIN-EXCEL-001: başlık satırı flex — Excel butonu sağda
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--t)">\ud83d\udcb0 Personel Prim Özeti <span style="font-size:9px;color:var(--t3);font-weight:400">(' + rows.length + ' personel)</span></div>'
        + '<button onclick="event.stopPropagation();window._pirimAdminExcel?.()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)" title="Prim özetini Excel olarak indir">⬇ Excel</button>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:6px;font-size:9px;font-weight:600;color:var(--t3);text-transform:uppercase;padding-bottom:4px;border-bottom:0.5px solid var(--b)">'
      + '<div>Personel</div><div style="text-align:right">Toplam</div><div style="text-align:right;color:#16A34A">Ödenen</div><div style="text-align:right;color:#D97706">Bekleyen</div></div>';
    rows.slice(0, 8).forEach(function(r){
      h += '<div style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:6px;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--b)">'
        // PIRIM-DASH-CLICK-001: personel adı tıklanabilir → _pirimDetayGoster modal
        + '<div onclick="event.stopPropagation();window._pirimDetayGoster?.(\'' + String(r.uid) + '\')" style="cursor:pointer;color:var(--ac);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="Detay aç">' + r.ad + '</div>'
        + '<div style="text-align:right;color:var(--t);font-weight:500">' + fmt(r.toplam) + '</div>'
        + '<div style="text-align:right;color:#16A34A">' + fmt(r.odenen) + '</div>'
        + '<div style="text-align:right;color:#D97706">' + fmt(r.bekleyen) + '</div>'
        + '</div>';
    });
    h += '<div style="font-size:10px;color:var(--t3);margin-top:6px;text-align:right">Detay → Prim Yönetimi</div></div>';
    return h;
  }
  if (role !== 'staff' && role !== 'lead') return '';
  return '<div onclick="window._pirimiGetir()" style="cursor:pointer;padding:16px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf)">'
    + '<div style="font-size:12px;font-weight:600;color:var(--t)">\ud83d\udcb0 Primim</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:4px">Detay\u0131n\u0131 g\u00f6r \u2192</div>'
    + '</div>';
}

/* DASHBOARD-REDESIGN-001 PARÇA A: Yeni orchestrator + BLOK 1 (Greeting + 3 mini KPI) */
function _dashYeniRender() {
  var panel = document.getElementById('panel-dashboard');
  if (!panel) return;
  var cu = (typeof window.CU === 'function' ? window.CU() : null) || _cu();
  var saat = new Date().getHours();
  var greet = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';

  var pending = ((typeof window.loadTasks === 'function' ? window.loadTasks() : []) || [])
    .filter(function(t){ return t && !t.isDeleted && !t.completed; }).length;
  var acikSA = ((typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : []) || [])
    .filter(function(t){ return t && !t.isDeleted && t.durum !== 'tamamlandi' && t.durum !== 'iptal'; }).length;
  var gecikmis = ((typeof window.loadTahsilat === 'function' ? window.loadTahsilat() : []) || [])
    .filter(function(t){ return t && !t.isDeleted && t.durum !== 'tahsil_edildi' && t.vade && new Date(t.vade).getTime() < Date.now(); }).length;

  var h = '<div style="padding:24px 32px;max-width:1400px;margin:0 auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:16px">';
  h += '<div>';
  h += '<div style="font-size:22px;font-weight:500">' + greet + ', ' + ((cu && (cu.name || cu.displayName)) || 'Misafir') + '</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-top:3px">' + new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + '</div>';
  h += '</div>';
  h += '<div style="display:flex;gap:10px">';
  h += _dashMiniKpi('Görev', pending, 'pusula-pro');
  h += _dashMiniKpi('Teklif', acikSA, 'satin-alma');
  h += _dashMiniKpi('Gecikmiş', gecikmis, 'tahsilat');
  h += '</div></div>';

  /* DASHBOARD-REDESIGN-001 PARÇA B: BLOK 2 Alert strip */
  var alerts = [];
  var _now = Date.now();
  try {
    var _tah = (typeof window.loadTahsilat === 'function' ? window.loadTahsilat() : []) || [];
    _tah.forEach(function(t) {
      if (t && !t.isDeleted && t.durum !== 'tahsil_edildi' && t.vade && new Date(t.vade).getTime() < _now) {
        alerts.push({ tip: 'kirmizi', ikon: '🚨', msg: 'Gecikmiş tahsilat: ' + (t.musteriAd || '—') + ' · ' + (Number(t.tutar)||0).toLocaleString('tr-TR') + ' ' + (t.para || ''), link: 'tahsilat' });
      }
    });
  } catch(e) {}
  try {
    var _sa = (typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : []) || [];
    _sa.forEach(function(t) {
      if (!t || t.isDeleted) return;
      if (t.durum !== 'bekleyen') return;
      var _olu = new Date(t.createdAt || t.olusturmaT || t.ts || 0).getTime();
      if (!_olu) return;
      var _gun = (_now - _olu) / 86400000;
      if (_gun > 7) alerts.push({ tip: 'turuncu', ikon: '⏳', msg: 'Onay bekliyor ' + Math.floor(_gun) + ' gündür: ' + (t.piNo || t.tedarikci || '—'), link: 'satin-alma' });
    });
  } catch(e) {}
  try {
    if (localStorage.getItem('ak_storage_critical') === '1') {
      alerts.push({ tip: 'kirmizi', ikon: '💾', msg: 'Depolama dolu — veri kaydedilemiyor', link: 'admin' });
    }
  } catch(e) {}
  try {
    if (typeof window._getDbHealth === 'function') {
      var _dbH = window._getDbHealth();
      if (_dbH && (_dbH.hasRed || _dbH.hasAmber)) {
        var _msg = (_dbH.alerts && _dbH.alerts[0] && _dbH.alerts[0].msg) || 'Veritabanı anormalliği';
        alerts.push({ tip: _dbH.hasRed ? 'kirmizi' : 'turuncu', ikon: _dbH.hasRed ? '🔴' : '🟡', msg: _msg, link: 'admin' });
      }
    }
  } catch(e) {}

  if (alerts.length) {
    h += '<div style="margin-bottom:20px">';
    alerts.slice(0, 3).forEach(function(a) {
      var bg = a.tip === 'kirmizi' ? '#FCEBEB' : a.tip === 'turuncu' ? '#FAEEDA' : '#FAECE7';
      var fg = a.tip === 'kirmizi' ? '#791F1F' : a.tip === 'turuncu' ? '#854F0B' : '#712B13';
      var _m = window._esc ? window._esc(a.msg) : a.msg;
      h += '<div onclick="window.App && window.App.nav && window.App.nav(\'' + a.link + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:' + bg + ';border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:12px;color:' + fg + '"><span>' + a.ikon + '</span><span style="flex:1">' + _m + '</span><span style="opacity:.6">→</span></div>';
    });
    if (alerts.length > 3) {
      h += '<div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px">+ ' + (alerts.length - 3) + ' uyarı daha</div>';
    }
    h += '</div>';
  }

  /* TODO PARÇA C: KPI grid + Timeline  /  PARÇA D: Quick action + legacy → Detay */
  h += '<div style="padding:40px;text-align:center;color:var(--t3);font-size:11px">Yeni dashboard yapımı devam ediyor (PARÇA B-D sonra). Eski görünüm için "Detay Görünüm →" butonunu kullan.</div>';
  h += '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button onclick="window.App?.nav?.(\'dashboardDetay\')" style="font-size:10px;padding:4px 12px;border-radius:12px;background:var(--sf);border:0.5px solid var(--b);color:var(--t2);cursor:pointer;font-family:inherit">Detay Görünüm →</button></div>';

  h += '</div>';
  panel.innerHTML = h;
}

function _dashMiniKpi(label, val, link) {
  return '<div onclick="window.App && window.App.nav && window.App.nav(\'' + link + '\')" style="padding:6px 14px;background:var(--sf);border:0.5px solid var(--b);border-radius:8px;cursor:pointer;text-align:center;min-width:72px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">' + label + '</div><div style="font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;margin-top:2px">' + (val||0) + '</div></div>';
}

function renderDashboard() {
  const panel = _g('panel-dashboard');
  if (!panel) return;
  const cu = _cu();
  if (!cu) return;
  _calcEmythVanish();

  let h = '<div style="padding:12px 20px;background:' + BG3 + ';display:flex;flex-direction:column;gap:16px;min-height:100%">';

  // Üst butonlar (sağ üst)
  h += '<div style="display:flex;justify-content:flex-end;gap:6px">';
  h += '<button onclick="window.App?.nav?.(\'dashboardDetay\')" style="font-size:10px;padding:3px 10px;border-radius:12px;background:' + BG2 + ';border:0.5px solid ' + BDM + ';color:' + T2 + ';cursor:pointer;font-family:inherit">Detay Görünüm →</button>';
  if (_isA()) {
    h += '<button onclick="window._openDashAdminModal()" style="font-size:10px;padding:3px 10px;border-radius:12px;background:' + BG2 + ';border:0.5px solid ' + BDM + ';color:' + T2 + ';cursor:pointer;font-family:inherit">⚙ Hedefleri Düzenle</button>';
  }
  h += '</div>';

  // Storage kritik uyarısı
  if (localStorage.getItem('ak_storage_critical') === '1') {
    h += '<div onclick="window._showSyncDetails?.()" style="cursor:pointer;padding:8px 16px;background:#FCEBEB;border-radius:8px;margin-bottom:4px;display:flex;align-items:center;gap:8px;border:1px solid #E24B4A33"><span style="font-size:14px">🔴</span><span style="font-size:12px;font-weight:500;color:#791F1F;flex:1">Depolama %100 dolu — veri kaydedilemiyor</span><span onclick="event.stopPropagation();window._emergencyCleanup?.()" style="font-size:10px;padding:3px 8px;background:#791F1F;color:#fff;border-radius:4px;cursor:pointer">Temizle</span></div>';
  }

  // DB sağlık uyarısı
  if (typeof window._getDbHealth === 'function') {
    var _dbH = window._getDbHealth();
    if (_dbH.hasRed || _dbH.hasAmber) {
      var _dbAlertColor = _dbH.hasRed ? '#791F1F' : '#633806';
      var _dbAlertBg = _dbH.hasRed ? '#FCEBEB' : '#FAEEDA';
      var _dbAlertMsg = _dbH.alerts[0]?.msg || 'Anormallik';
      h += '<div onclick="window._showSyncDetails?.()" style="cursor:pointer;padding:8px 16px;background:' + _dbAlertBg + ';border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:8px;border:1px solid ' + _dbAlertColor + '22"><span style="font-size:14px">' + (_dbH.hasRed ? '🔴' : '🟡') + '</span><span style="font-size:12px;font-weight:500;color:' + _dbAlertColor + ';flex:1">' + _dbAlertMsg + '</span><span style="font-size:10px;color:' + _dbAlertColor + '">Ayarlar →</span></div>';
    }
  }
  h += _renderPirimimWidget();
  h += _renderBanner();
  h += _renderNakitBlok();
  h += _renderIhracatOzet();
  h += _renderKPI();
  h += _renderEmythVanish();
  h += _renderAlt();
  h += '</div>';

  panel.innerHTML = h;
}

/* ── Nakit tab handler ──────────────────────────────────────── */
window._dashNakitTab = function(val) {
  _nakitAy = val;
  renderDashboard();
};

/* ── Storage kritik banner ─────────────────────────────────── */
window._showStorageCriticalBanner = function() {
  // Dashboard render'da zaten kontrol ediliyor, sadece re-render tetikle
  if (typeof renderDashboard === 'function') renderDashboard();
};

window._emergencyCleanup = function() {
  try {
    var n = JSON.parse(localStorage.getItem('ak_notif1') || '[]');
    if (n.length > 25) localStorage.setItem('ak_notif1', JSON.stringify(n.slice(0, 25)));
    var t = JSON.parse(localStorage.getItem('ak_trash1') || '[]');
    if (t.length > 25) localStorage.setItem('ak_trash1', JSON.stringify(t.slice(0, 25)));
    var a = JSON.parse(localStorage.getItem('ak_activity1') || '[]');
    if (a.length > 50) localStorage.setItem('ak_activity1', JSON.stringify(a.slice(0, 50)));
    localStorage.removeItem('ak_storage_critical');
    window.toast?.('Acil temizlik tamamlandı', 'ok');
    if (typeof renderDashboard === 'function') renderDashboard();
  } catch (e) { window.toast?.('Temizlik hatası', 'err'); }
};

/* ── Admin modal handler ────────────────────────────────────── */
window._openDashAdminModal = _openAdminModal;

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
/** @namespace Dashboard */
const Dashboard = { render: renderDashboard };

/* PIRIM-ADMIN-EXCEL-001: admin prim özet tablosu Excel export */
window._pirimAdminExcel = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenemedi', 'err'); return; }
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var primler = typeof loadPirim === 'function' ? loadPirim() : [];
  if (!primler.length) { window.toast?.('Prim kaydı yok', 'warn'); return; }
  var userMap = {};
  users.forEach(function(u) { userMap[u.uid || u.id] = u.displayName || u.name || u.email || '—'; });
  var ozet = {};
  primler.filter(function(p) { return !p.isDeleted; }).forEach(function(p) {
    var uid = p.uid || p.personelId || p.assignedTo || 'unknown';
    if (!ozet[uid]) ozet[uid] = { ad: userMap[uid] || '—', toplam: 0, odenen: 0, bekleyen: 0 };
    var t = parseFloat(p.amount || p.tutar || 0) || 0;
    ozet[uid].toplam += t;
    if (p.status === 'paid' || p.odendi) ozet[uid].odenen += t;
    else ozet[uid].bekleyen += t;
  });
  var rows = [['Personel', 'Toplam', 'Ödenen', 'Bekleyen']];
  Object.keys(ozet).sort(function(a, b) { return ozet[b].bekleyen - ozet[a].bekleyen; })
    .forEach(function(uid) {
      var r = ozet[uid];
      rows.push([r.ad, r.toplam, r.odenen, r.bekleyen]);
    });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:24},{wch:12},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws, 'Prim Özeti');
  XLSX.writeFile(wb, 'prim-ozeti-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Prim özeti indirildi ✓', 'ok');
  if (typeof window.logActivity === 'function') window.logActivity('rapor', 'Prim özeti Excel export: ' + Object.keys(ozet).length + ' personel');
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} else {
  window.Dashboard = Dashboard;
  window.renderDashboard = renderDashboard;
  /* DASHBOARD-REDESIGN-001 PARÇA A: yeni render'ı son atama — eski intact kalır, ileride ayrı rota */
  window.renderDashboard = _dashYeniRender;
}

})();
