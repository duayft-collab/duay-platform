/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/dashboardDetay.js  —  v8.2.0
 * DASH-003 — Detay Dashboard modülü
 *
 * Ana Dashboard'dan "Detay Görünüm →" ile açılır.
 * Grup bazlı: Finans / Operasyon / Katalog / Ekip
 * Sol ana alan (değişken) + sağ sidebar (sabit)
 *
 * Anayasa: K01 ≤800, K08 strict, D2 app.js dokunulmaz, D3 IIFE
 * ════════════════════════════════════════════════════════════════
 */
(function DashboardDetayModule() {
'use strict';

/* ── Kısayollar ─────────────────────────────────────────────── */
const _g   = id => document.getElementById(id);
const _esc = window._esc;
const _cu  = () => window.CU?.() || window.Auth?.getCU?.();
const _fmt = v => Math.round(Math.abs(v)).toLocaleString('tr-TR');
const _pct = v => Math.round(v) + '%';
const _ls  = k => localStorage.getItem(k);
const _lsn = k => parseFloat(_ls(k)) || 0;
const _lsj = (k, d) => { try { return JSON.parse(_ls(k)) || d; } catch { return d; } };

/* ── Renkler & Stiller ──────────────────────────────────────── */
const BG3 = 'var(--bg)', BG2 = 'var(--s2)', BG1 = 'var(--sf)', BD = 'var(--b)', BDM = 'var(--bm)';
const T1 = 'var(--t)', T2 = 'var(--t2)', T3 = 'var(--t3)';
const GREEN = '#27500A', RED = '#A32D2D', BLUE = '#185FA5', NAVY = '#0C447C', AMBER = '#EF9F27', PURPLE = '#3C3489';
const S_MK  = 'border-radius:7px;padding:10px 14px;background:' + BG2;
const S_WK  = 'background:' + BG1 + ';border:0.5px solid ' + BD + ';border-radius:8px;padding:12px 14px';
const S_LBL = 'font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:' + T3;
const S_VAL = 'font-size:19px;font-weight:500';
const S_SUB = 'font-size:10px;color:' + T3;

/* ── Badge ──────────────────────────────────────────────────── */
function _badge(text, bg, fg) { return '<span style="font-size:8px;padding:1px 6px;border-radius:4px;background:' + bg + ';color:' + fg + '">' + _esc(text) + '</span>'; }
const _bg = t => _badge(t, '#EAF3DE', GREEN);
const _ba = t => _badge(t, '#FAEEDA', '#633806');
const _br = t => _badge(t, '#FCEBEB', RED);
const _bb = t => _badge(t, '#E6F1FB', NAVY);

/* ── Veri ────────────────────────────────────────────────────── */
function _loadIhracat(){ return typeof window.loadIhracatOps === 'function' ? window.loadIhracatOps() : []; }
function _loadOdm()    { return (typeof window.loadOdm === 'function' ? window.loadOdm() : []).filter(o => !o.isDeleted); }
function _loadTah()    { return (typeof window.loadTahsilat === 'function' ? window.loadTahsilat() : []).filter(t => !t.isDeleted); }
function _loadIddia()  { return typeof window.loadIddialar === 'function' ? window.loadIddialar() : []; }
function _loadUsers()  { return typeof window.loadUsers === 'function' ? window.loadUsers() : []; }
function _loadTasks()  { return (typeof window.loadTasks === 'function' ? window.loadTasks() : []).filter(t => !t.isDeleted); }
function _loadNotifs() { return typeof window.loadNotifs === 'function' ? window.loadNotifs() : []; }
function _loadAlis()   { return typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : []; }
function _loadCari()   { return typeof window.loadCari === 'function' ? window.loadCari().filter(c => !c.isDeleted) : []; }
function _loadKargo()  { return typeof window.loadKargo === 'function' ? window.loadKargo() : []; }
function _loadUrunler(){ return typeof window.loadUrunler === 'function' ? window.loadUrunler() : []; }
function _loadSozler() { return _lsj('ak_sozler1', []); }

/* ── Tarih ──────────────────────────────────────────────────── */
const _now = () => new Date();
const _today = () => _now().toISOString().slice(0, 10);
function _thisMonth(d) { const n = _now(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
function _thisWeek(d) { const n = _now(); const diff = (n - d) / 86400000; return diff >= 0 && diff < 7; }

function _weeklyGroup(items, field, weeks) {
  const now = _now(), result = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now); end.setDate(end.getDate() - w * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const sum = items.filter(i => { const d = new Date(i[field]); return d >= start && d <= end; })
      .reduce((s, i) => s + (parseFloat(i.amountTRY || i.amount) || 0), 0);
    result.push({ sum, start, end });
  }
  return result;
}
function _weeklyCount(items, field, weeks) {
  const now = _now(), result = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now); end.setDate(end.getDate() - w * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const count = items.filter(i => { const d = new Date(i[field]); return d >= start && d <= end; }).length;
    result.push({ count, start, end });
  }
  return result;
}

/* ── Ring + Bar ─────────────────────────────────────────────── */
function _ring(pct, size, strokeW, color) {
  const r = (size - strokeW) / 2, c = Math.PI * 2 * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
    + '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + BG2 + '" stroke-width="' + strokeW + '"/>'
    + '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeW + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" stroke-linecap="round" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>'
    + '<text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-size="' + Math.round(size*0.28) + '" font-weight="600" fill="' + color + '">' + _pct(pct) + '</text></svg>';
}
function _bar(pct, color) {
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  return '<div style="height:5px;border-radius:2px;background:' + BG2 + ';overflow:hidden"><div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:2px"></div></div>';
}
function _pctColor(pct) { return pct >= 90 ? GREEN : pct >= 70 ? AMBER : '#E24B4A'; }
function _chip(label, val) { return '<span style="padding:6px 12px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:10px;color:#E6F1FB">' + label + ' <b>' + val + '</b></span>'; }

/* ── SVG Çizgi/Bar Chart ────────────────────────────────────── */
function _svgLine(data1, data2, w, h) {
  const max = Math.max(...data1, ...data2, 1);
  const step = data1.length > 1 ? w / (data1.length - 1) : w;
  let p1 = '', p2 = '';
  data1.forEach((v, i) => { const x = i * step, y = h - (v / max) * (h - 5) - 2; p1 += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1); });
  data2.forEach((v, i) => { const x = i * step, y = h - (v / max) * (h - 5) - 2; p2 += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1); });
  let svg = '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">';
  if (p1) svg += '<path d="' + p1 + '" fill="none" stroke="' + BLUE + '" stroke-width="1.5"/>';
  if (p2) svg += '<path d="' + p2 + '" fill="none" stroke="#F09595" stroke-width="1.5" stroke-dasharray="3 2"/>';
  return svg + '</svg>';
}
function _svgBars(data, w, h, colors) {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  let svg = '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">';
  data.forEach((v, i) => {
    const bh = Math.max(2, (v / max) * (h - 4));
    const c = Array.isArray(colors) ? colors[i % colors.length] : colors;
    svg += '<rect x="' + (i * bw + 2) + '" y="' + (h - bh) + '" width="' + (bw - 4) + '" height="' + bh + '" rx="2" fill="' + c + '"/>';
  });
  return svg + '</svg>';
}

/* ── Grafik tab state ───────────────────────────────────────── */
let _detayAy = 1;

/* ════════════════════════════════════════════════════════════════
   BANNER — grup bazlı
   ════════════════════════════════════════════════════════════════ */
function _renderBanner(grup) {
  const cfg = {
    finans:    { title: 'Finans Detayı', sub: 'Nakit Akışı · Teklifler · Faturalar', chips: () => { const t = _loadTah(); const o = _loadOdm(); const ay = t.filter(x => x.createdAt && _thisMonth(new Date(x.createdAt))).reduce((s,x) => s+(parseFloat(x.amountTRY||x.amount)||0), 0); const pend = o.filter(x => x.approvalStatus==='pending').length + t.filter(x => x.approvalStatus==='pending').length; return _chip('Tahsilat', '₺'+_fmt(ay)) + _chip('Onay', String(pend)); }},
    operasyon: { title: 'Operasyon Detayı', sub: 'Görevler · Kargo', chips: () => { const tk = _loadTasks(); return _chip('Aktif', String(tk.filter(t=>!t.done).length)) + _chip('Gecikmiş', String(tk.filter(t=>!t.done&&t.due&&t.due<_today()).length)); }},
    katalog:   { title: 'Katalog Detayı', sub: 'Ürünler · Cariler', chips: () => _chip('Ürün', String(_loadUrunler().length)) + _chip('Cari', String(_loadCari().length)) },
    ekip:      { title: 'Ekip Detayı', sub: 'Kullanıcılar · İddia', chips: () => _chip('Aktif', String(_loadUsers().filter(u=>u.status==='active').length)) + _chip('İddia', String(_loadIddia().filter(x=>x.durum==='aktif').length)) },
    ihracat:   { title: 'İhracat Detayı', sub: 'Sevkiyatlar · GÇB · B/L', chips: () => { const ops=_loadIhracat(); return _chip('Yolda', String(ops.filter(o=>o.status==='yolda').length)) + _chip('Teslim', String(ops.filter(o=>o.status==='teslim'&&o.gercekYukleme&&_thisMonth(new Date(o.gercekYukleme))).length)); }},
  };
  const c = cfg[grup] || cfg.finans;
  return '<div style="background:#042C53;border-radius:9px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">'
    + '<div><div style="font-size:15px;color:#E6F1FB;font-weight:500">' + _esc(c.title) + '</div>'
    + '<div style="font-size:11px;color:#85B7EB">' + _esc(c.sub) + '</div></div>'
    + '<div style="display:flex;gap:6px">' + c.chips() + '</div></div>';
}

/* ════════════════════════════════════════════════════════════════
   METRİK KARTLAR — grup bazlı
   ════════════════════════════════════════════════════════════════ */
function _renderMetrikler(grup) {
  let cards = [];
  const today = _today();
  if (grup === 'finans') {
    const tah = _loadTah(), odm = _loadOdm();
    const topT = tah.reduce((s,t) => s+(parseFloat(t.amountTRY||t.amount)||0), 0);
    const topO = odm.reduce((s,o) => s+(parseFloat(o.amountTRY||o.amount)||0), 0);
    const net = topT - topO;
    const ayT = tah.filter(t => t.createdAt && _thisMonth(new Date(t.createdAt))).reduce((s,t) => s+(parseFloat(t.amountTRY||t.amount)||0), 0);
    const gecik = tah.filter(t => t.due && t.due < today && !t.collected);
    const pend = odm.filter(o => o.approvalStatus==='pending').length + tah.filter(t => t.approvalStatus==='pending').length;
    cards = [
      { l:'Net Pozisyon', v:'₺'+_fmt(net), c: net>=0?GREEN:RED, s:'Toplam' },
      { l:'Bu Ay Tahsilat', v:'₺'+_fmt(ayT), c:T1, s:'Aylık' },
      { l:'Gecikmiş', v:'₺'+_fmt(gecik.reduce((s,t)=>s+(parseFloat(t.amountTRY||t.amount)||0),0)), c:RED, s:gecik.length+' kayıt' },
      { l:'Onay Bekleyen', v:String(pend), c:AMBER, s:'İşlem' },
    ];
  } else if (grup === 'operasyon') {
    const tk = _loadTasks();
    const aktif = tk.filter(t => !t.done).length;
    const tamam = tk.filter(t => t.done).length;
    const gecik = tk.filter(t => !t.done && t.due && t.due < today).length;
    const hafta = tk.filter(t => t.createdAt && _thisWeek(new Date(t.createdAt))).length;
    cards = [
      { l:'Aktif Görev', v:String(aktif), c:BLUE, s:'Açık' },
      { l:'Tamamlanan', v:String(tamam), c:GREEN, s:'Bitti' },
      { l:'Gecikmiş', v:String(gecik), c:RED, s:'Kritik' },
      { l:'Bu Hafta Eklenen', v:String(hafta), c:T1, s:'Yeni' },
    ];
  } else if (grup === 'katalog') {
    const ur = _loadUrunler(), ca = _loadCari();
    const aktifUr = ur.filter(u => !u.isDeleted && u.aktif !== false).length;
    const yeniCa = ca.filter(c => c.createdAt && _thisMonth(new Date(c.createdAt))).length;
    cards = [
      { l:'Toplam Ürün', v:String(ur.length), c:T1, s:'Kayıt' },
      { l:'Aktif Ürün', v:String(aktifUr), c:GREEN, s:'Listelenebilir' },
      { l:'Toplam Cari', v:String(ca.length), c:BLUE, s:'Kayıt' },
      { l:'Bu Ay Yeni', v:String(yeniCa), c:NAVY, s:'Cari' },
    ];
  } else if (grup === 'ihracat') {
    const ops = _loadIhracat();
    const yolda = ops.filter(o => o.status==='yolda').length;
    const teslim = ops.filter(o => o.status==='teslim' && o.gercekYukleme && _thisMonth(new Date(o.gercekYukleme))).length;
    const ciroUSD = ops.filter(o => o.doviz==='USD').reduce((s,o) => s+((parseFloat(o.birimFiyat)||0)*(parseFloat(o.miktar)||0)), 0);
    cards = [
      { l:'Toplam İşlem', v:String(ops.length), c:T1, s:'Kayıt' },
      { l:'Yolda', v:String(yolda), c:BLUE, s:'Transit' },
      { l:'Bu Ay Teslim', v:String(teslim), c:GREEN, s:'Tamamlandı' },
      { l:'Ciro USD', v:'$'+_fmt(ciroUSD), c:T1, s:'Toplam' },
    ];
  } else {
    const us = _loadUsers(), tk = _loadTasks(), id = _loadIddia();
    const aktif = us.filter(u => u.status==='active').length;
    const kazanilan = id.filter(x => x.durum==='kazanildi' && x.bitisTarih && _thisWeek(new Date(x.bitisTarih))).length;
    cards = [
      { l:'Aktif Kullanıcı', v:String(aktif), c:GREEN, s:'Çalışan' },
      { l:'Toplam Görev', v:String(tk.length), c:T1, s:'Kayıt' },
      { l:'Aktif İddia', v:String(id.filter(x=>x.durum==='aktif').length), c:BLUE, s:'Süren' },
      { l:'Bu Hafta Kazanılan', v:String(kazanilan), c:GREEN, s:'İddia' },
    ];
  }
  let h = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px">';
  cards.forEach(c => {
    h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">' + _esc(c.l) + '</div>'
      + '<div style="' + S_VAL + ';color:' + c.c + '">' + c.v + '</div>'
      + '<div style="' + S_SUB + '">' + _esc(c.s) + '</div></div>';
  });
  return h + '</div>';
}

/* ════════════════════════════════════════════════════════════════
   GRAFİK — grup bazlı
   ════════════════════════════════════════════════════════════════ */
function _renderGrafik(grup) {
  const wc = _detayAy === 1 ? 4 : _detayAy === 3 ? 13 : 26;
  const tabBtn = (label, val) => {
    const active = _detayAy === val;
    return '<span onclick="window._detayGrafTab(' + val + ')" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:8px;' + (active ? 'background:#E6F1FB;color:'+NAVY+';font-weight:600' : 'color:'+T3) + '">' + label + '</span>';
  };
  let h = '<div style="' + S_WK + '">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';

  if (grup === 'finans') {
    h += '<span style="font-size:10px;font-weight:500;color:' + T1 + '">Nakit Akışı Trendi</span>';
    h += '<div style="display:flex;gap:2px">' + tabBtn('1A',1) + tabBtn('3A',3) + tabBtn('6A',6) + '</div></div>';
    const tah = _loadTah(), odm = _loadOdm();
    const tw = _weeklyGroup(tah, 'createdAt', wc), ow = _weeklyGroup(odm, 'createdAt', wc);
    h += _svgLine(tw.map(w=>w.sum), ow.map(w=>w.sum), 400, 55);
    h += '<div style="display:flex;gap:12px;font-size:9px;color:'+T3+';margin-top:4px">'
      + '<span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.5px;background:'+BLUE+';display:inline-block"></span>Tahsilat</span>'
      + '<span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.5px;background:#F09595;display:inline-block"></span>Ödeme</span></div>';
  } else if (grup === 'operasyon') {
    h += '<span style="font-size:10px;font-weight:500;color:' + T1 + '">Görev Tamamlanma Trendi</span></div>';
    const tk = _loadTasks().filter(t => t.done && t.completedAt);
    const wk = _weeklyCount(tk, 'completedAt', 6);
    const colors = ['#E6F1FB','#B5D4F4','#85B7EB','#378ADD','#185FA5','#0C447C'];
    h += _svgBars(wk.map(w=>w.count), 400, 55, colors);
    h += '<div style="font-size:9px;color:'+T3+';margin-top:4px">Son 6 hafta · Tamamlanan görevler</div>';
  } else if (grup === 'katalog') {
    h += '<span style="font-size:10px;font-weight:500;color:' + T1 + '">Ürün Ekleme Trendi</span></div>';
    const ur = _loadUrunler().filter(u => u.createdAt);
    const wk = _weeklyCount(ur, 'createdAt', 6);
    h += _svgBars(wk.map(w=>w.count), 400, 55, BLUE);
    h += '<div style="font-size:9px;color:'+T3+';margin-top:4px">Son 6 hafta · Yeni ürünler</div>';
  } else if (grup === 'ihracat') {
    h += '<span style="font-size:10px;font-weight:500;color:' + T1 + '">Haftalık Teslim Trendi</span></div>';
    const teslimOps = _loadIhracat().filter(o => o.status==='teslim' && o.gercekYukleme);
    const wk = _weeklyCount(teslimOps, 'gercekYukleme', 6);
    h += _svgBars(wk.map(w=>w.count), 400, 55, BLUE);
    h += '<div style="font-size:9px;color:'+T3+';margin-top:4px">Haftalık teslim sayısı</div>';
  } else {
    h += '<span style="font-size:10px;font-weight:500;color:' + T1 + '">Performans Trendi</span></div>';
    const tk = _loadTasks().filter(t => t.done && t.completedAt);
    const wk = _weeklyCount(tk, 'completedAt', 6);
    h += _svgLine(wk.map(w=>w.count), [], 400, 55);
    h += '<div style="font-size:9px;color:'+T3+';margin-top:4px">Son 6 hafta · Tamamlanan</div>';
  }
  return h + '</div>';
}

/* ════════════════════════════════════════════════════════════════
   İKİLİ KARTLAR — grup bazlı
   ════════════════════════════════════════════════════════════════ */
function _renderIkili(grup) {
  let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">';

  if (grup === 'finans') {
    // Sol: Satış Konversiyon + Hedef vs Gerçek
    const alis = _loadAlis();
    const kabul = alis.filter(a => a.status==='kabul'||a.status==='approved'||a.accepted);
    const konvPct = alis.length > 0 ? Math.round((kabul.length/alis.length)*100) : 0;
    const konvColor = konvPct >= 75 ? '#97C459' : konvPct >= 50 ? AMBER : '#E24B4A';
    const hedefK = _lsn('ak_hedef_konversiyon') || 40;
    h += '<div style="' + S_WK + '">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += _ring(konvPct, 44, 3, konvColor);
    h += '<div><div style="font-size:12px;font-weight:500;color:'+T1+'">Satış Konversiyon</div>'
      + '<div style="font-size:9px;color:'+T3+'">Hedef: '+_pct(hedefK)+' · Fark: '+(konvPct-hedefK>=0?'+':'')+_pct(konvPct-hedefK)+'</div></div></div>';
    // Hedef vs Gerçek
    const tah = _loadTah();
    const ayT = tah.filter(t=>t.createdAt&&_thisMonth(new Date(t.createdAt))).reduce((s,t)=>s+(parseFloat(t.amountTRY||t.amount)||0),0);
    const hCiro = _lsn('ak_hedef_ciro') || 1, hMust = _lsn('ak_hedef_musteri') || 1;
    const yeniM = _loadCari().filter(c=>c.createdAt&&_thisMonth(new Date(c.createdAt))).length;
    const items = [{ l:'Aylık Ciro', p:Math.round(ayT/hCiro*100) }, { l:'Yeni Müşteri', p:Math.round(yeniM/hMust*100) }];
    items.forEach(it => { const c = _pctColor(it.p); h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+it.l+'</span><span style="color:'+c+'">'+_pct(it.p)+'</span></div>'+_bar(it.p,c)+'</div>'; });
    h += '</div>';
    // Sağ: E-Myth SOP + Vanish
    const sopT = _lsn('ak_sop_tamamlanan'), sopTp = _lsn('ak_sop_toplam') || 1;
    const sopPct = Math.round(sopT/sopTp*100), sopC = sopPct>=80?GREEN:sopPct>=60?AMBER:'#E24B4A';
    h += '<div style="' + S_WK + '">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += _ring(sopPct, 44, 3, sopC);
    h += '<div><div style="font-size:12px;font-weight:500;color:'+T1+'">SOP Tamamlanma</div>'
      + '<div style="font-size:9px;color:'+T3+'">'+sopT+'/'+Math.round(sopTp)+'</div></div></div>';
    const del = _lsn('ak_delegasyon_skor'), mud = _lsn('ak_sahip_mudahale');
    h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>Delegasyon</span><span>'+_pct(del)+'</span></div>'+_bar(del,GREEN)+'</div>';
    h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>Sahip Müdahale</span><span>'+_pct(mud)+'</span></div>'+_bar(mud,'#E24B4A')+'</div>';
    h += '</div>';

  } else if (grup === 'operasyon') {
    const tk = _loadTasks(), today = _today();
    const done = tk.filter(t=>t.done).length, devam = tk.filter(t=>!t.done&&t.status==='inprogress').length;
    const gecik = tk.filter(t=>!t.done&&t.due&&t.due<today).length, total = tk.length||1;
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Görev Dağılımı</div>';
    [{ l:'Tamamlandı', p:Math.round(done/total*100), c:GREEN },{ l:'Devam', p:Math.round(devam/total*100), c:BLUE },{ l:'Gecikmiş', p:Math.round(gecik/total*100), c:RED }]
      .forEach(it => { h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+it.l+'</span><span>'+_pct(it.p)+'</span></div>'+_bar(it.p,it.c)+'</div>'; });
    h += '</div>';
    const kr = _loadKargo();
    const aktifK = kr.filter(k=>k.status!=='teslim'&&!k.isDeleted).length, teslim = kr.filter(k=>k.status==='teslim').length;
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Kargo Durumu</div>';
    [{ l:'Aktif', v:aktifK, c:BLUE },{ l:'Teslim', v:teslim, c:GREEN },{ l:'Toplam', v:kr.length, c:T1 }]
      .forEach(it => { h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:3px"><span>'+it.l+'</span><span style="font-weight:500;color:'+it.c+'">'+it.v+'</span></div>'; });
    h += '</div>';

  } else if (grup === 'katalog') {
    const ur = _loadUrunler(), ca = _loadCari();
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Ürün Kategorileri</div>';
    const cats = {}; ur.forEach(u => { const k = u.kategori || u.category || 'Diğer'; cats[k] = (cats[k]||0)+1; });
    Object.entries(cats).slice(0,5).forEach(([k,v]) => { const p = Math.round(v/ur.length*100); h += '<div style="margin-bottom:3px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+_esc(k)+'</span><span>'+v+'</span></div>'+_bar(p,BLUE)+'</div>'; });
    if (!Object.keys(cats).length) h += '<div style="font-size:9px;color:'+T3+';padding:6px 0">Kategori verisi yok</div>';
    h += '</div>';
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Cari Türleri</div>';
    const turler = {}; ca.forEach(c => { const k = c.tur || c.type || 'Diğer'; turler[k] = (turler[k]||0)+1; });
    Object.entries(turler).slice(0,5).forEach(([k,v]) => { const p = Math.round(v/ca.length*100); h += '<div style="margin-bottom:3px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+_esc(k)+'</span><span>'+v+'</span></div>'+_bar(p,NAVY)+'</div>'; });
    if (!Object.keys(turler).length) h += '<div style="font-size:9px;color:'+T3+';padding:6px 0">Tür verisi yok</div>';
    h += '</div>';

  } else if (grup === 'ihracat') {
    const ops = _loadIhracat();
    // Sol: Son işlemler
    h += '<div style="' + S_WK + '"><div style="font-size:13px;font-weight:500;color:'+T1+';margin-bottom:6px">Son İşlemler</div>';
    ops.slice(0,5).forEach(o => {
      const stR = {yolda:'#E6F1FB',teslim:'#EAF3DE',hazirlaniyor:'#FAEEDA',iptal:'#FCEBEB'};
      const stT = {yolda:'#0C447C',teslim:'#27500A',hazirlaniyor:'#633806',iptal:'#A32D2D'};
      const st = o.status||'taslak';
      h += '<div style="display:flex;justify-content:space-between;font-size:10px;color:'+T2+';margin-bottom:4px"><span>'+_esc(o.expNo||'—')+'</span><span style="font-size:9px;padding:1px 5px;border-radius:3px;background:'+(stR[st]||BG2)+';color:'+(stT[st]||T3)+'">'+_esc(st)+'</span></div>';
    });
    if (!ops.length) h += '<div style="font-size:10px;color:'+T3+';text-align:center;padding:8px">Kayıt yok</div>';
    h += '</div>';
    // Sağ: Alıcı dağılımı
    h += '<div style="' + S_WK + '"><div style="font-size:13px;font-weight:500;color:'+T1+';margin-bottom:6px">Alıcı Dağılımı</div>';
    const aliciSay = {}; ops.forEach(o => { const a = o.aliciAdi||'—'; aliciSay[a]=(aliciSay[a]||0)+1; });
    const alicilar = Object.entries(aliciSay).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const maxA = alicilar[0]?.[1]||1;
    alicilar.forEach(([a,s]) => { const p=Math.round(s/maxA*100); h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:10px;color:'+T2+';margin-bottom:2px"><span>'+_esc(a)+'</span><span>'+s+'</span></div>'+_bar(p,BLUE)+'</div>'; });
    if (!alicilar.length) h += '<div style="font-size:10px;color:'+T3+'">Veri yok</div>';
    h += '</div>';

  } else {
    // Ekip
    const us = _loadUsers().filter(u=>u.status==='active'), tk = _loadTasks();
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Kullanıcı Performans</div>';
    us.slice(0,5).forEach(u => {
      const uT = tk.filter(t=>t.uid===u.id), done = uT.filter(t=>t.done).length, total = uT.length||1;
      const pct = Math.round(done/total*100);
      h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+_esc((u.name||'').split(' ')[0])+'</span><span>'+_pct(pct)+'</span></div>'+_bar(pct,BLUE)+'</div>';
    });
    h += '</div>';
    const id = _loadIddia();
    const aktif = id.filter(x=>x.durum==='aktif').length, kazanan = id.filter(x=>x.durum==='kazanildi').length;
    const oran = (aktif+kazanan) > 0 ? Math.round(kazanan/(aktif+kazanan)*100) : 0;
    h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">İddia Kazanma</div>';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' + _ring(oran, 44, 3, oran>=60?GREEN:oran>=40?AMBER:'#E24B4A');
    h += '<div><div style="font-size:9px;color:'+T2+'">Kazanılan: '+kazanan+'</div><div style="font-size:9px;color:'+T2+'">Aktif: '+aktif+'</div></div></div>';
    const seri = id.filter(x=>x.durum==='kazanildi').sort((a,b)=>(b.bitisTarih||'').localeCompare(a.bitisTarih||'')).length;
    h += '<div style="font-size:9px;color:'+T3+'">Toplam kazanılan seri: '+seri+'</div>';
    h += '</div>';
  }

  return h + '</div>';
}

/* ════════════════════════════════════════════════════════════════
   E-MYTH + VANISH + Q2 (kompakt)
   ════════════════════════════════════════════════════════════════ */
function _renderEmythQ2(grup) {
  let h = '';
  // E-Myth + Vanish — sadece Finans'ta tam, diğerlerinde kompakt
  if (grup === 'finans') {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">';
    // Sol: SOP + Sistemsiz + Modül
    const sopT = _lsn('ak_sop_tamamlanan'), sopTp = _lsn('ak_sop_toplam')||1;
    const sopPct = Math.round(sopT/sopTp*100), sopC = sopPct>=80?GREEN:sopPct>=60?AMBER:'#E24B4A';
    const sisO = _lsn('ak_sistemsiz_oran'), sisC = sisO<10?GREEN:AMBER;
    const skorlar = _lsj('ak_modul_skorlar', {nakit:0,gorev:0,katalog:0,musteri:0});
    h += '<div style="' + S_WK + '">';
    h += '<div style="display:flex;gap:10px;margin-bottom:6px">';
    h += '<div style="text-align:center">'+_ring(sopPct,30,2,sopC)+'<div style="font-size:7px;color:'+T3+'">SOP</div></div>';
    h += '<div style="text-align:center">'+_ring(sisO,30,2,sisC)+'<div style="font-size:7px;color:'+T3+'">Sistemsiz</div></div></div>';
    Object.entries(skorlar).forEach(([k,v]) => { const b = v>=80?_bg(_pct(v)):v>=60?_ba(_pct(v)):_br(_pct(v)); h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:2px"><span>'+_esc(k)+'</span>'+b+'</div>'; });
    h += '</div>';
    // Sağ: Vanish
    const oto = _lsn('ak_otomasyon_oran'), sah = _lsn('ak_sahipsiz_karar');
    const del = _lsn('ak_delegasyon_skor'), mud = _lsn('ak_sahip_mudahale');
    h += '<div style="' + S_WK + '">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">';
    h += '<div style="background:'+BG2+';border-radius:6px;padding:6px;text-align:center"><div style="font-size:20px;font-weight:600;color:'+GREEN+'">'+_pct(oto)+'</div><div style="font-size:7px;color:'+T3+'">Otomasyon</div></div>';
    h += '<div style="background:'+BG2+';border-radius:6px;padding:6px;text-align:center"><div style="font-size:20px;font-weight:600;color:'+BLUE+'">'+Math.round(sah)+'</div><div style="font-size:7px;color:'+T3+'">Sahipsiz/hf</div></div></div>';
    h += '<div style="margin-bottom:3px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>Delegasyon</span><span>'+_pct(del)+'</span></div>'+_bar(del,GREEN)+'</div>';
    h += '<div><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>Müdahale</span><span>'+_pct(mud)+'</span></div>'+_bar(mud,'#E24B4A')+'</div>';
    h += '</div></div>';
  }
  // Q2 Hedefleri — tüm gruplar
  const q2 = _lsj('ak_q2_hedefler', {ciro:0,sop:0,vanish:0,musteri:0});
  const tah = _loadTah();
  const ayT = tah.filter(t=>t.createdAt&&_thisMonth(new Date(t.createdAt))).reduce((s,t)=>s+(parseFloat(t.amountTRY||t.amount)||0),0);
  const sopT2 = _lsn('ak_sop_tamamlanan'), sopTp2 = _lsn('ak_sop_toplam')||1;
  const otoO = _lsn('ak_otomasyon_oran');
  const yeniM = _loadCari().filter(c=>c.createdAt&&_thisMonth(new Date(c.createdAt))).length;
  const q2Items = [
    { l:'Ciro ₺'+_fmt(q2.ciro||1), p:Math.round(ayT/(q2.ciro||1)*100) },
    { l:'SOP '+_pct(sopT2/sopTp2*100), p:Math.round(sopT2/sopTp2*100) },
    { l:'Vanish '+_pct(otoO), p:Math.round(otoO/90*100) },
    { l:'Yeni Müşteri '+yeniM, p:Math.round(yeniM/(q2.musteri||1)*100) },
  ];
  h += '<div style="' + S_WK + '"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Q2 Hedefleri</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px">';
  q2Items.forEach(it => { const c = it.p>=80?BLUE:it.p>=60?AMBER:'#E24B4A'; h += '<div style="margin-bottom:3px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+it.l+'</span><span style="color:'+c+'">'+_pct(it.p)+'</span></div>'+_bar(it.p,c)+'</div>'; });
  h += '</div></div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   SAĞ SIDEBAR
   ════════════════════════════════════════════════════════════════ */
function _renderSidebar() {
  let h = '';
  // 1. Onay Bekleyen
  const odm = _loadOdm(), tah = _loadTah();
  const pendO = odm.filter(o=>o.approvalStatus==='pending').slice(0,3);
  const pendT = tah.filter(t=>t.approvalStatus==='pending').slice(0,3);
  const pend = [...pendO,...pendT].slice(0,3);
  h += '<div style="' + S_WK + ';margin-bottom:7px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<span style="font-size:12px;font-weight:500;color:'+T1+'">Onay Bekleyen</span>'+_br(String(pendO.length+pendT.length-pend.length+pend.length))+'</div>';
  pend.forEach(p => {
    const ad = _esc(p.cari || p.cariAd || p.supplier || '—');
    const tutar = '₺' + _fmt(parseFloat(p.amountTRY||p.amount)||0);
    h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:3px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">'+ad+'</span>'+_ba(tutar)+'</div>';
  });
  if (!pend.length) h += '<div style="font-size:9px;color:'+T3+'">Onay yok</div>';
  h += '<div style="font-size:8px;color:'+BLUE+';cursor:pointer;margin-top:4px" onclick="window.App?.nav?.(\'odemeler\')">Tümünü gör →</div></div>';

  // 2. Döviz Pozisyon
  const fxSym = {USD:'$',EUR:'€',TRY:'₺'};
  h += '<div style="' + S_WK + ';margin-bottom:7px"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Döviz Pozisyon</div>';
  ['USD','EUR','TRY'].forEach(cur => {
    const odmC = odm.filter(o=>(o.currency||'TRY')===cur&&!o.paid).reduce((s,o)=>s+(parseFloat(o.amount)||0),0);
    const tahC = tah.filter(t=>(t.currency||'TRY')===cur&&!t.collected).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
    const net = tahC - odmC;
    h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:3px"><span>'+cur+'</span><span style="font-weight:500;color:'+(net>=0?GREEN:RED)+'">'+(net>=0?'+':'-')+fxSym[cur]+_fmt(net)+'</span></div>';
  });
  h += '</div>';

  // 3. Ekip Performans
  const users = _loadUsers().filter(u=>u.status==='active');
  const tasks = _loadTasks();
  h += '<div style="' + S_WK + ';margin-bottom:7px"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Ekip Performans</div>';
  users.slice(0,4).forEach(u => {
    const uT = tasks.filter(t=>t.uid===u.id), done = uT.filter(t=>t.done).length, total = uT.length||1;
    const pct = Math.round(done/total*100);
    h += '<div style="margin-bottom:4px"><div style="display:flex;justify-content:space-between;font-size:9px;color:'+T2+';margin-bottom:1px"><span>'+_esc((u.name||'').split(' ')[0])+'</span><span>'+_pct(pct)+'</span></div>'+_bar(pct,BLUE)+'</div>';
  });
  h += '</div>';

  // 4. Aktif İddialar
  const iddialar = _loadIddia().filter(x=>x.durum==='aktif').slice(0,2);
  h += '<div style="' + S_WK + ';margin-bottom:7px"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Aktif İddialar</div>';
  iddialar.forEach(id => {
    const harf = (id.sahibi||id.owner||'?')[0].toUpperCase();
    const hash = (id.sahibi||id.owner||'x').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const avColors = ['#E0E7FF','#DCFCE7','#F3E8FF','#FEF3C7','#FCE7F3'];
    const kalanGun = id.bitis ? Math.max(0,Math.ceil((new Date(id.bitis)-_now())/86400000)) : '—';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
      + '<div style="width:18px;height:18px;border-radius:50%;background:'+avColors[hash%avColors.length]+';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;flex-shrink:0">'+harf+'</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:9px;color:'+T1+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(id.baslik||id.title||'')+'</div>'
      + '<div style="font-size:9px;color:'+T3+'">'+kalanGun+'g kaldı</div></div></div>';
  });
  if (!iddialar.length) h += '<div style="font-size:9px;color:'+T3+'">Aktif iddia yok</div>';
  h += '</div>';

  // 5. Son Aktivite
  const notifs = _loadNotifs().slice(0,3);
  const ikonMap = { odeme:['#E6F1FB',NAVY], tahsilat:['#E6F1FB',NAVY], gorev:['#EAF3DE',GREEN], uyari:['#FCEBEB',RED], iddia:['#EEEDFE',PURPLE] };
  h += '<div style="' + S_WK + ';margin-bottom:7px"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:6px">Son Aktivite</div>';
  notifs.forEach(n => {
    const typ = (n.type||'gorev').toLowerCase(), ic = ikonMap[typ]||ikonMap.gorev;
    const saat = n.ts ? new Date(n.ts).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) : '';
    h += '<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">'
      + '<div style="width:14px;height:14px;border-radius:50%;background:'+ic[0]+';display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:6px;color:'+ic[1]+'">●</span></div>'
      + '<span style="flex:1;font-size:9px;color:'+T2+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(n.msg||n.message||'')+'</span>'
      + '<span style="font-size:7px;color:'+T3+'">'+saat+'</span></div>';
  });
  if (!notifs.length) h += '<div style="font-size:9px;color:'+T3+'">Bildirim yok</div>';
  h += '</div>';

  // 6. Günün Sözü
  const sozler = _loadSozler().filter(s=>s.aktif!==false);
  let soz = null;
  const gunSoz = _ls('ak_gunun_sozu');
  if (gunSoz) { try { soz = JSON.parse(gunSoz); } catch { /* */ } }
  if (!soz && sozler.length > 0) { soz = sozler[Math.floor(_now().getTime()/86400000) % sozler.length]; }
  h += '<div style="background:#042C53;border-radius:8px;padding:10px">';
  h += '<div style="font-size:12px;color:#A32D2D;margin-bottom:5px">ℹ</div>';
  if (soz) {
    h += '<div style="font-size:10px;color:#E6F1FB;font-style:italic;line-height:1.5">'+_esc(soz.soz||soz.text||'')+'</div>'
      + '<div style="width:20px;height:1.5px;background:#378ADD;margin:5px 0"></div>'
      + '<div style="font-size:8px;color:#85B7EB">'+_esc(soz.yazar||soz.author||'')+'</div>';
  } else { h += '<div style="font-size:9px;color:#85B7EB;font-style:italic">Henüz söz eklenmemiş</div>'; }
  h += '</div>';

  // İhracat yolda olanlar
  const ops2 = _loadIhracat();
  const yolda2 = ops2.filter(o => o.status === 'yolda').slice(0, 3);
  if (yolda2.length) {
    h += '<div style="' + S_WK + ';margin-top:7px"><div style="font-size:12px;font-weight:500;color:'+T1+';margin-bottom:5px">Yolda Olanlar</div>';
    yolda2.forEach(o => { h += '<div style="font-size:10px;color:'+T2+';margin-bottom:3px">'+_esc(o.expNo||'—')+' · '+_esc(o.varisLimani||'—')+'</div>'; });
    h += '</div>';
  }

  return h;
}

/* ════════════════════════════════════════════════════════════════
   ANA RENDER
   ════════════════════════════════════════════════════════════════ */
/** @public */
function renderDashboardDetay() {
  const panel = _g('panel-dashboardDetay');
  if (!panel) return;
  if (!_cu()) return;

  const grup = _ls('ak_nav_grup') || 'finans';

  let h = '<div style="display:grid;grid-template-columns:1fr 220px;min-height:100%">';

  // Sol ana alan
  h += '<div style="padding:14px 18px 14px 24px;background:'+BG1+';display:flex;flex-direction:column;gap:10px">';
  // Geri butonu
  h += '<div><span onclick="window.App?.nav?.(\'dashboard\')" style="font-size:10px;color:'+BLUE+';cursor:pointer">← Ana Dashboard</span></div>';
  h += _renderBanner(grup);
  h += _renderMetrikler(grup);
  h += _renderGrafik(grup);
  h += _renderIkili(grup);
  h += _renderEmythQ2(grup);
  h += '</div>';

  // Sağ sidebar
  h += '<div style="padding:14px 16px 14px 14px;background:'+BG2+';border-left:0.5px solid '+BD+';display:flex;flex-direction:column;overflow-y:auto">';
  h += _renderSidebar();
  h += '</div>';

  h += '</div>';
  panel.innerHTML = h;
}

/* ── Tab handler ────────────────────────────────────────────── */
window._detayGrafTab = function(val) { _detayAy = val; renderDashboardDetay(); };

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
const DashboardDetay = { render: renderDashboardDetay };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardDetay;
} else {
  window.DashboardDetay = DashboardDetay;
  window.renderDashboardDetay = renderDashboardDetay;
}

})();
