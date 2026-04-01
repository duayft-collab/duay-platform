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
const _esc = s => typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
const S_MK  = 'border-radius:7px;padding:11px 15px;background:' + BG2;
const S_WK  = 'background:' + BG1 + ';border:0.5px solid ' + BD + ';border-radius:8px;padding:13px 15px';
const S_LBL = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:' + T3;
const S_VAL = 'font-size:24px;font-weight:500';
const S_SUB = 'font-size:11px;color:' + T3;
const S_SEC = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:' + T3 + ';margin-bottom:7px;display:flex;align-items:center;gap:7px';

/* ── Badge yardımcısı ───────────────────────────────────────── */
function _badge(text, bg, fg) {
  return '<span style="font-size:9px;padding:2px 7px;border-radius:4px;background:' + bg + ';color:' + fg + '">' + _esc(text) + '</span>';
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
  return '<div style="height:6px;border-radius:2px;background:' + BG2 + ';overflow:hidden"><div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:2px"></div></div>';
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

  const chip = (label, val) => '<span style="padding:7px 13px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:11px;color:#E6F1FB">' + label + ' <b>' + val + '</b></span>';

  return '<div style="background:#042C53;border-radius:9px;padding:15px 22px;display:flex;align-items:center;justify-content:space-between">'
    + '<div>'
    + '<div style="font-size:16px;color:#E6F1FB;font-weight:500">Günaydın, ' + name + '</div>'
    + '<div style="font-size:12px;color:#85B7EB">' + dayStr + ' · ' + pendingCount + ' onay bekliyor · Sistem skoru ' + _esc(skorVal) + '</div>'
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
function _renderFinans() {
  const odm = _loadOdm();
  const tah = _loadTah();
  const n = _now();
  const topTah = tah.reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  const topOdm = odm.reduce((s, o) => s + (parseFloat(o.amountTRY || o.amount) || 0), 0);
  const net = topTah - topOdm;

  // Bu ay tahsilat
  const ayTah = tah.filter(t => t.createdAt && _thisMonth(new Date(t.createdAt)))
    .reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  // Geçen ay tahsilat
  const gecenAy = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  const gecenAyTah = tah.filter(t => {
    if (!t.createdAt) return false;
    const d = new Date(t.createdAt);
    return d.getMonth() === gecenAy.getMonth() && d.getFullYear() === gecenAy.getFullYear();
  }).reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);
  const degisim = gecenAyTah > 0 ? Math.round(((ayTah - gecenAyTah) / gecenAyTah) * 100) : 0;

  // Gecikmiş alacak
  const today = _today();
  const gecik = tah.filter(t => t.approvalStatus !== 'approved' || (t.due && t.due < today && !t.collected));
  const gecikTutar = gecik.reduce((s, t) => s + (parseFloat(t.amountTRY || t.amount) || 0), 0);

  // Ort müşteri değeri
  const cariSet = new Set(tah.map(t => t.cariId || t.cari).filter(Boolean));
  const ortMusteri = cariSet.size > 0 ? Math.round(topTah / cariSet.size) : 0;

  let h = '<div style="' + S_SEC + '">' + _esc('FİNANS') + ' ' + _bb('Nakit Akışı') + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">';

  // Kart 1
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Net Pozisyon</div>'
    + '<div style="' + S_VAL + ';color:' + (net >= 0 ? GREEN : RED) + '">₺' + _fmt(net) + '</div>'
    + '<div style="' + S_SUB + '">Açık: ₺' + _fmt(topOdm) + '</div></div>';
  // Kart 2
  const dColor = degisim >= 0 ? GREEN : RED;
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Bu Ay Tahsilat</div>'
    + '<div style="' + S_VAL + ';color:' + T1 + '">₺' + _fmt(ayTah) + '</div>'
    + '<div style="' + S_SUB + ';color:' + dColor + '">' + (degisim >= 0 ? '↑' : '↓') + ' ' + _pct(Math.abs(degisim)) + '</div></div>';
  // Kart 3
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Gecikmiş Alacak</div>'
    + '<div style="' + S_VAL + ';color:' + RED + '">₺' + _fmt(gecikTutar) + '</div>'
    + '<div style="' + S_SUB + '">' + gecik.length + ' kayıt</div></div>';
  // Kart 4
  h += '<div style="' + S_MK + '"><div style="' + S_LBL + '">Ort. Müşteri Değeri</div>'
    + '<div style="' + S_VAL + ';color:' + BLUE + '">₺' + _fmt(ortMusteri) + '</div>'
    + '<div style="' + S_SUB + '">Action Coach KPI</div></div>';

  h += '</div>';
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
  h += '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">';

  // Kart 1 — Satış Konversiyon
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:11px">'
    + _ring(konvPct, 52, 4, konvColor)
    + '<div><div style="font-size:13px;font-weight:500;color:' + T1 + '">Satış Konversiyon</div>'
    + '<div style="font-size:10px;color:' + T3 + '">Hedef: ' + _pct(hedefKonv) + ' · Teklif→Sipariş</div>'
    + '<div style="font-size:10px;color:' + T3 + '">Fark: ' + (konvPct - hedefKonv >= 0 ? '+' : '') + _pct(konvPct - hedefKonv) + '</div>'
    + _bg('Hedef') + '</div></div>';

  // Kart 2 — Haftalık Büyüme
  const barH = 57;
  let barSvg = '<svg width="100%" height="' + barH + '" viewBox="0 0 120 ' + barH + '" preserveAspectRatio="none">';
  const bw = 120 / 6;
  weeks.forEach((w, i) => {
    const bh = maxWeek > 0 ? Math.max(2, (w.sum / maxWeek) * (barH - 4)) : 2;
    barSvg += '<rect x="' + (i * bw + 2) + '" y="' + (barH - bh) + '" width="' + (bw - 4) + '" height="' + bh + '" rx="2" fill="' + barColors[i] + '"/>';
  });
  barSvg += '</svg>';
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:6px">Haftalık Büyüme</div>'
    + barSvg
    + '<div style="font-size:10px;color:' + T3 + ';margin-top:4px;display:flex;justify-content:space-between">'
    + '<span>Son 6 hafta</span>'
    + (buyumePct >= 0 ? _bg('+' + _pct(buyumePct)) : _br(_pct(buyumePct)))
    + '</div></div>';

  // Kart 3 — Ekip Performans
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:8px">Ekip Performans</div>';
  users.slice(0, 4).forEach(u => {
    const uTasks = tasks.filter(t => t.uid === u.id);
    const done = uTasks.filter(t => t.done).length;
    const total = uTasks.length || 1;
    const pct = Math.round((done / total) * 100);
    h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:10px;color:' + T2 + ';margin-bottom:2px">'
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
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:8px">Hedef vs Gerçek</div>';
  const hvg = [
    { label: 'Aylık Ciro', pct: ciroPct },
    { label: 'Yeni Müşteri', pct: mustPct },
    { label: 'Tahsilat Hızı', pct: tahHiz },
  ];
  hvg.forEach(item => {
    const c = _pctColor(item.pct);
    h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:10px;color:' + T2 + ';margin-bottom:2px">'
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
function _renderEmythVanish() {
  let h = '<div style="display:grid;grid-template-columns:3fr 2fr;gap:10px">';

  // ── E-MYTH ──
  h += '<div>';
  h += '<div style="' + S_SEC + '">' + _esc('E-MYTH — SİSTEM KURUMU') + ' ' + _bp('SOP & Sistem') + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">';

  // SOP Tamamlanma
  const sopTam = _lsn('ak_sop_tamamlanan');
  const sopTop = _lsn('ak_sop_toplam') || 1;
  const sopPct = Math.round((sopTam / sopTop) * 100);
  const sopColor = sopPct >= 80 ? GREEN : sopPct >= 60 ? AMBER : '#E24B4A';
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:11px">'
    + _ring(sopPct, 48, 3, sopColor)
    + '<div><div style="font-size:16px;font-weight:600;color:' + T1 + '">' + sopTam + '/' + Math.round(sopTop) + '</div>'
    + '<div style="font-size:10px;color:#E24B4A">' + (Math.round(sopTop) - sopTam) + ' eksik</div></div></div>';

  // Sistemsiz İş Oranı
  const sistemsiz = _lsn('ak_sistemsiz_oran');
  const sisColor = sistemsiz < 10 ? GREEN : AMBER;
  h += '<div style="' + S_WK + ';display:flex;align-items:center;gap:11px">'
    + _ring(sistemsiz, 48, 3, sisColor)
    + '<div><div style="font-size:16px;font-weight:600;color:' + T1 + '">' + _pct(sistemsiz) + '</div>'
    + '<div style="font-size:10px;color:#E24B4A">Hedef: %10 altı</div></div></div>';

  // Modül Skorları
  const skorlar = _lsj('ak_modul_skorlar', { nakit: 0, gorev: 0, katalog: 0, musteri: 0 });
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:6px">Modül Skorları</div>';
  Object.entries(skorlar).forEach(([k, v]) => {
    const b = v >= 80 ? _bg(_pct(v)) : v >= 60 ? _ba(_pct(v)) : _br(_pct(v));
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:' + T2 + ';margin-bottom:3px">'
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
  h += '<div style="background:' + BG2 + ';border-radius:6px;padding:11px;text-align:center">'
    + '<div style="font-size:28px;font-weight:600;color:' + GREEN + '">' + _pct(otoOran) + '</div>'
    + '<div style="font-size:10px;color:' + T3 + '">Otomasyon</div></div>';
  h += '<div style="background:' + BG2 + ';border-radius:6px;padding:11px;text-align:center">'
    + '<div style="font-size:28px;font-weight:600;color:' + BLUE + '">' + Math.round(sahipsiz) + '</div>'
    + '<div style="font-size:10px;color:' + T3 + '">Sahipsiz Karar/hafta</div></div>';
  h += '</div>';

  // Alt progress barlar
  h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:10px;color:' + T2 + ';margin-bottom:2px">'
    + '<span>Delegasyon Skoru</span><span>' + _pct(delegasyon) + '</span></div>' + _bar(delegasyon, GREEN) + '</div>';
  h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:10px;color:' + T2 + ';margin-bottom:2px">'
    + '<span>Sahip Müdahale</span><span>' + _pct(sahipMud) + '</span></div>' + _bar(sahipMud, '#E24B4A') + '</div>';
  h += '<div style="font-size:12px;color:' + T3 + ';margin-top:10px">Sahip müdahalesi düşükse sistem çalışıyor.</div>';
  h += '</div></div>';

  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 5 — NAKİT GRAFİK
   ════════════════════════════════════════════════════════════════ */
let _nakitAy = 1; // 1=1A, 3=3A, 6=6A
function _renderNakit() {
  const tah = _loadTah();
  const odm = _loadOdm();
  const weekCount = _nakitAy === 1 ? 4 : _nakitAy === 3 ? 13 : 26;
  const tahWeeks = _weeklyGroup(tah, 'createdAt', weekCount);
  const odmWeeks = _weeklyGroup(odm, 'createdAt', weekCount);
  const allVals = [...tahWeeks.map(w => w.sum), ...odmWeeks.map(w => w.sum)];
  const maxV = Math.max(...allVals, 1);

  // SVG line chart
  const svgW = 400, svgH = 79;
  const pts = tahWeeks.length;
  const step = pts > 1 ? svgW / (pts - 1) : svgW;

  let tahPath = '', odmPath = '';
  tahWeeks.forEach((w, i) => {
    const x = i * step;
    const y = svgH - (w.sum / maxV) * (svgH - 5) - 2;
    tahPath += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  });
  odmWeeks.forEach((w, i) => {
    const x = i * step;
    const y = svgH - (w.sum / maxV) * (svgH - 5) - 2;
    odmPath += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  });

  const tabBtn = (label, val) => {
    const active = _nakitAy === val;
    return '<span onclick="window._dashNakitTab(' + val + ')" style="cursor:pointer;padding:3px 11px;border-radius:4px;font-size:10px;'
      + (active ? 'background:#E6F1FB;color:' + NAVY + ';font-weight:600' : 'color:' + T3)
      + '">' + label + '</span>';
  };

  let h = '<div style="' + S_WK + '">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<span style="font-size:13px;font-weight:500;color:' + T1 + '">Nakit Akışı Trendi</span>'
    + '<div style="display:flex;gap:2px">' + tabBtn('1A', 1) + tabBtn('3A', 3) + tabBtn('6A', 6) + '</div></div>';

  h += '<svg width="100%" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="none">';
  if (tahPath) h += '<path d="' + tahPath + '" fill="none" stroke="' + BLUE + '" stroke-width="1.5"/>';
  if (odmPath) h += '<path d="' + odmPath + '" fill="none" stroke="#F09595" stroke-width="1.5" stroke-dasharray="3 2"/>';
  h += '</svg>';

  h += '<div style="display:flex;gap:13px;font-size:11px;color:' + T3 + ';margin-top:6px">'
    + '<span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.5px;background:' + BLUE + ';display:inline-block"></span>Tahsilat</span>'
    + '<span style="display:flex;align-items:center;gap:3px"><span style="width:12px;height:1.5px;background:#F09595;border-top:1px dashed #F09595;display:inline-block"></span>Ödeme</span>'
    + '</div></div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   BÖLÜM 6 — ALT 4'LÜ
   ════════════════════════════════════════════════════════════════ */
function _renderAlt() {
  const cu = _cu();
  let h = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">';

  // ── Kart 1: Son Aktivite ──
  const notifs = _loadNotifs().slice(0, 4);
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:8px">Son Aktivite</div>';
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
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      + '<div style="width:25px;height:25px;border-radius:50%;background:' + ic[0] + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<span style="font-size:10px;color:' + ic[1] + '">●</span></div>'
      + '<span style="flex:1;font-size:11px;color:' + T2 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(n.msg || n.message || '') + '</span>'
      + '<span style="font-size:10px;color:' + T3 + ';white-space:nowrap">' + saat + '</span></div>';
  });
  h += '</div>';

  // ── Kart 2: Aktif İddialar ──
  const iddialar = _loadIddia().filter(x => x.durum === 'aktif').slice(0, 3);
  h += '<div style="' + S_WK + '">'
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:8px">Aktif İddialar</div>';
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
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">'
      + '<div style="width:25px;height:25px;border-radius:50%;background:' + avBg + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0">' + harf + '</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:11px;color:' + T1 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + baslık + '</div>'
      + '<div style="display:flex;gap:4px;align-items:center;font-size:10px;color:' + T3 + '">' + kalanGun + 'g kaldı · ' + turBadge + '</div></div></div>';
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
    + '<div style="font-size:13px;font-weight:500;color:' + T1 + ';margin-bottom:8px">Q2 Hedefleri</div>';
  q2Items.forEach(item => {
    const c = item.pct >= 80 ? BLUE : item.pct >= 60 ? AMBER : '#E24B4A';
    h += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:10px;color:' + T2 + ';margin-bottom:2px">'
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
  h += '<div style="background:#042C53;border-radius:8px;padding:14px">';
  h += '<div style="font-size:14px;color:#A32D2D;margin-bottom:8px">ℹ</div>';
  if (soz) {
    h += '<div style="font-size:12px;color:#E6F1FB;font-style:italic;line-height:1.5">' + _esc(soz.soz || soz.text || '') + '</div>'
      + '<div style="width:22px;height:1.5px;background:#378ADD;margin:8px 0"></div>'
      + '<div style="font-size:11px;color:#85B7EB">' + _esc(soz.yazar || soz.author || '') + '</div>';
  } else {
    h += '<div style="font-size:12px;color:#85B7EB;font-style:italic">Henüz söz eklenmemiş</div>';
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
    { key: 'ak_sahipsiz_karar', label: 'Sahipsiz Karar/hafta', type: 'number' },
    { key: 'ak_delegasyon_skor', label: 'Delegasyon Skoru (%)', type: 'number' },
    { key: 'ak_sahip_mudahale', label: 'Sahip Müdahale (%)', type: 'number' },
    { key: 'ak_sistemsiz_oran', label: 'Sistemsiz İş Oranı (%)', type: 'number' },
    { key: 'ak_sop_tamamlanan', label: 'SOP Tamamlanan', type: 'number' },
    { key: 'ak_sop_toplam', label: 'SOP Toplam', type: 'number' },
    { key: 'ak_hedef_konversiyon', label: 'Hedef Konversiyon (%)', type: 'number' },
    { key: 'ak_hedef_ciro', label: 'Hedef Ciro (TL)', type: 'number' },
    { key: 'ak_hedef_musteri', label: 'Hedef Yeni Müşteri', type: 'number' },
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
function renderDashboard() {
  const panel = _g('panel-dashboard');
  if (!panel) return;
  const cu = _cu();
  if (!cu) return;

  let h = '<div style="padding:18px 32px;background:' + BG3 + ';display:flex;flex-direction:column;gap:18px;min-height:100%">';

  // Üst butonlar (sağ üst)
  h += '<div style="display:flex;justify-content:flex-end;gap:6px">';
  h += '<button onclick="window.App?.nav?.(\'dashboardDetay\')" style="font-size:10px;padding:3px 10px;border-radius:12px;background:' + BG2 + ';border:0.5px solid ' + BDM + ';color:' + T2 + ';cursor:pointer;font-family:inherit">Detay Görünüm →</button>';
  if (_isA()) {
    h += '<button onclick="window._openDashAdminModal()" style="font-size:10px;padding:3px 10px;border-radius:12px;background:' + BG2 + ';border:0.5px solid ' + BDM + ';color:' + T2 + ';cursor:pointer;font-family:inherit">⚙ Hedefleri Düzenle</button>';
  }
  h += '</div>';

  h += _renderBanner();
  h += _renderFinans();
  h += _renderKPI();
  h += _renderEmythVanish();
  h += _renderNakit();
  h += _renderAlt();
  h += '</div>';

  panel.innerHTML = h;
}

/* ── Nakit tab handler ──────────────────────────────────────── */
window._dashNakitTab = function(val) {
  _nakitAy = val;
  renderDashboard();
};

/* ── Admin modal handler ────────────────────────────────────── */
window._openDashAdminModal = _openAdminModal;

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
/** @namespace Dashboard */
const Dashboard = { render: renderDashboard };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} else {
  window.Dashboard = Dashboard;
  window.renderDashboard = renderDashboard;
}

})();
