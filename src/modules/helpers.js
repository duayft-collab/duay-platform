/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/helpers.js  —  v8.1.0
 * Yardımcı Modüller — 6 Alt Bölüm
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  BÖLÜM 1 — TAKVİM      renderCal, saveEvent, setCalView    │
 * │  BÖLÜM 2 — NOTLAR       renderNotes, saveNote, pinNote     │
 * │  BÖLÜM 3 — REHBER       renderRehber, saveRehber           │
 * │  BÖLÜM 4 — HEDEFLER     renderHedefler, saveHdf            │
 * │  BÖLÜM 5 — TEBLİGAT     renderTebligat, saveTebligat       │
 * │  BÖLÜM 6 — TEMİZLİK     renderTemizlik, saveTemizlik       │
 * │  BÖLÜM 7 — KPI           calcUserKpi, calcAllKpiScores     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Bağımlılıklar: utils.js, database.js, auth.js
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';
// loadUsers → window.loadUsers (database.js)
// loadTasks → window.loadTasks (database.js)
// toast → window.toast (app.js)

// ── Ortak kısayollar ─────────────────────────────────────────────
const _gh      = window.g;
// ── V18 eklenti alias ─────────────────────────────────────────
const _sth     = window.st;
const _nowTsh  = window.nowTs;
const _isAdminH = window.isAdmin;
const _CUh      = window.CU;


// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — TAKVİM
// Namespace: renderCal, setCalView, calNav, saveEvent, delEvent, checkYaklasanTatiller
// ════════════════════════════════════════════════════════════════

// ── Durum değişkenleri ───────────────────────────────────────────
let CAL_DATE       = new Date();
let CAL_SEL        = null;
let CAL_VIEW       = 'month';   // 'month' | 'week' | 'agenda'
let CAL_TYPE_FILTER= 'all';
let _calEvCache    = null;
let _calEvCacheKey = '';
let _calAllEvs     = null;
let _calRendering  = false;
let _calRenderTimer= null;

// ── Sabitler ─────────────────────────────────────────────────────
const EVC = {
  meeting : {bg:'#E6F1FB',tx:'#0C447C',ic:'🤝',label:'Toplantı'},
  deadline: {bg:'#FCEBEB',tx:'#A32D2D',ic:'⏰',label:'Son Tarih'},
  holiday : {bg:'#E1F5EE',tx:'#085041',ic:'🎉',label:'Etkinlik'},
  task    : {bg:'#EEEDFE',tx:'#26215C',ic:'📋',label:'Görev'},
};

const MONTHS = {
  tr:['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  en:['January','February','March','April','May','June','July','August','September','October','November','December'],
  fr:['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
};
const WDAYS = {
  tr:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],
  en:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  fr:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
};

// ── Türkiye Yasal Tatilleri ──────────────────────────────────────
const TR_TATILLER = [
  {ay:1,  gun:1,  ad:'Yılbaşı',                                     tip:'milli', gun_sayisi:1},
  {ay:4,  gun:23, ad:'Ulusal Egemenlik ve Çocuk Bayramı',            tip:'milli', gun_sayisi:1},
  {ay:5,  gun:1,  ad:'İşçi Bayramı',                                 tip:'milli', gun_sayisi:1},
  {ay:5,  gun:19, ad:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",     tip:'milli', gun_sayisi:1},
  {ay:7,  gun:15, ad:'Demokrasi ve Millî Birlik Günü',               tip:'milli', gun_sayisi:1},
  {ay:8,  gun:30, ad:'Zafer Bayramı',                                 tip:'milli', gun_sayisi:1},
  {ay:10, gun:29, ad:'Cumhuriyet Bayramı',                            tip:'milli', gun_sayisi:1},
];

// Dini tatiller — Hicri takvim 2026 tahmini
const TR_DINI_2026 = [
  {tarih:'2026-04-19',ad:'Ramazan Bayramı 1. Gün', tip:'dini', gun_sayisi:3},
  {tarih:'2026-04-20',ad:'Ramazan Bayramı 2. Gün', tip:'dini', gun_sayisi:3},
  {tarih:'2026-04-21',ad:'Ramazan Bayramı 3. Gün', tip:'dini', gun_sayisi:3},
  {tarih:'2026-06-26',ad:'Kurban Bayramı 1. Gün',  tip:'dini', gun_sayisi:4},
  {tarih:'2026-06-27',ad:'Kurban Bayramı 2. Gün',  tip:'dini', gun_sayisi:4},
  {tarih:'2026-06-28',ad:'Kurban Bayramı 3. Gün',  tip:'dini', gun_sayisi:4},
  {tarih:'2026-06-29',ad:'Kurban Bayramı 4. Gün',  tip:'dini', gun_sayisi:4},
];

function getTatillerThisYear() {
  const yil = new Date().getFullYear();
  const sabit = TR_TATILLER.map(t => ({
    tarih: `${yil}-${_p2h(t.ay)}-${_p2h(t.gun)}`,
    ad: t.ad, tip: t.tip, gun_sayisi: t.gun_sayisi || 1,
  }));
  return [...sabit, ...TR_DINI_2026];
}

function _isTatilDay(ds) {
  return getTatillerThisYear().some(t => t.tarih === ds);
}

function _getTatilAd(ds) {
  const t = getTatillerThisYear().find(x => x.tarih === ds);
  return t ? t.ad : null;
}

// ── Takvim önbellek yönetimi ─────────────────────────────────────
function invalidateCalCache() { _calEvCache = null; _calEvCacheKey = ''; }


// ════════════════════════════════════════════════════════════════
// TEKRARLAYıCı ETKİNLİK MOTORU
// Desteklenen tipler: daily, weekly, biweekly, monthly, yearly,
//                    weekdays (Pzt-Cum), custom (belirli günler)
// Veri yapısı:
//   recur: { freq, interval, endDate, days, count, seriesId }
//   freq: 'daily'|'weekly'|'biweekly'|'monthly'|'yearly'|'weekdays'|'custom'
//   days: [0-6] (0=Pzt) custom haftalık günler için
//   endDate: 'YYYY-MM-DD' bitiş tarihi (opsiyonel)
//   count: max tekrar sayısı (opsiyonel)
//   seriesId: orijinal event id'si (tüm tekrarlarda aynı)
// ════════════════════════════════════════════════════════════════

function _expandRecurring(evs, fromDate, toDate) {
  var result = [];
  var fromD  = new Date(fromDate + 'T00:00:00');
  var toD    = new Date(toDate   + 'T23:59:59');

  evs.forEach(function(ev) {
    if (!ev.recur || !ev.recur.freq) {
      // Tekrarlamayan: aralıkta mı kontrol et
      if (ev.date >= fromDate && ev.date <= toDate) result.push(ev);
      return;
    }

    var freq      = ev.recur.freq;
    var interval  = ev.recur.interval || 1;
    var endDate   = ev.recur.endDate  || null;
    var maxCount  = ev.recur.count    || 365;
    var days      = ev.recur.days     || [];   // [0-6] 0=Pzt
    var seriesId  = ev.recur.seriesId || ev.id;
    var startD    = new Date(ev.date  + 'T00:00:00');

    // Başlangıç tarihi aralığın dışında ve eski ise devam et
    if (startD > toD) return;
    var endD = endDate ? new Date(endDate + 'T23:59:59') : toD;
    if (endD > toD) endD = toD;

    var count = 0;
    var cur   = new Date(startD);

    function _pad(n) { return String(n).padStart(2,'0'); }
    function _dateStr(d) {
      return d.getFullYear() + '-' + _pad(d.getMonth()+1) + '-' + _pad(d.getDate());
    }
    var exceptions = (ev.recur && ev.recur.exceptions) || [];
    function _pushOccurrence(d) {
      var ds = _dateStr(d);
      if (ds < fromDate || ds > toDate) return;
      if (exceptions.indexOf(ds) > -1) return; // hariç tutulan gün
      result.push(Object.assign({}, ev, {
        id:         seriesId + '_' + ds,
        date:       ds,
        isOccurrence: true,
        seriesId:   seriesId,
        originalId: ev.id,
      }));
    }

    if (freq === 'daily') {
      while (cur <= endD && count < maxCount) {
        _pushOccurrence(cur);
        cur = new Date(cur); cur.setDate(cur.getDate() + interval);
        count++;
      }
    } else if (freq === 'weekly' || freq === 'biweekly') {
      var weekInterval = (freq === 'biweekly') ? 2 : interval;
      while (cur <= endD && count < maxCount) {
        _pushOccurrence(cur);
        cur = new Date(cur); cur.setDate(cur.getDate() + 7 * weekInterval);
        count++;
      }
    } else if (freq === 'weekdays') {
      // Pazartesi–Cuma her gün
      while (cur <= endD && count < maxCount) {
        var dow = cur.getDay(); // 0=Paz, 1=Pzt...6=Cmt
        if (dow >= 1 && dow <= 5) _pushOccurrence(cur);
        cur = new Date(cur); cur.setDate(cur.getDate() + 1);
        count++;
      }
    } else if (freq === 'custom') {
      // Belirli hafta günleri: days=[0,2,4] → Pzt,Çar,Cum
      // days: 0=Pzt,1=Sal,...,6=Paz (JS'ten farklı)
      while (cur <= endD && count < maxCount) {
        var jsDow = cur.getDay(); // 0=Paz, 1=Pzt...
        var ourDow = jsDow === 0 ? 6 : jsDow - 1; // 0=Pzt
        if (days.indexOf(ourDow) > -1) _pushOccurrence(cur);
        cur = new Date(cur); cur.setDate(cur.getDate() + 1);
        count++;
      }
    } else if (freq === 'monthly') {
      while (cur <= endD && count < maxCount) {
        _pushOccurrence(cur);
        cur = new Date(cur); cur.setMonth(cur.getMonth() + interval);
        count++;
      }
    } else if (freq === 'yearly') {
      while (cur <= endD && count < maxCount) {
        _pushOccurrence(cur);
        cur = new Date(cur); cur.setFullYear(cur.getFullYear() + interval);
        count++;
      }
    }
  });

  // Tekrarsız + tekrarlı birleştir, sırala, aynı tarih-id tekrarını çıkar
  var seen = {};
  return result.filter(function(e) {
    var k = e.id + '_' + e.date;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

function visEvs() {
  if (_calAllEvs) return _calAllEvs;
  const d  = loadCal();
  const cu = _CUh();
  let base = _isAdminH() ? d : d.filter(e => e.own === 0 || e.own === cu?.id || e.status === 'approved');
  if (CAL_TYPE_FILTER && CAL_TYPE_FILTER !== 'all') base = base.filter(e => e.type === CAL_TYPE_FILTER);
  return base; // ham liste — genişletme visEvsForMonth yapar
}

function visEvsForMonth(Y, M) {
  const cu  = _CUh();
  const key = Y + '-' + M + '-' + CAL_TYPE_FILTER + '-' + (_isAdminH() ? 'a' : 'u' + (cu && cu.id));
  if (_calEvCacheKey === key && _calEvCache) return _calEvCache;

  const firstDay = Y + '-' + _p2h(M + 1) + '-01';
  const lastDay  = Y + '-' + _p2h(M + 1) + '-' + _p2h(new Date(Y, M + 1, 0).getDate());

  // Recurring expansion: tüm etkinlikleri bu ay için genişlet
  const expanded = _expandRecurring(visEvs(), firstDay, lastDay);
  _calEvCache    = expanded;
  _calEvCacheKey = key;
  return _calEvCache;
}

// Belirli bir gün için genişletilmiş etkinlikler
function visEvsForDay(ds) {
  const d  = new Date(ds + 'T12:00');
  const Y  = d.getFullYear(), M = d.getMonth();
  // Ay cache varsa kullan, yoksa o gün için expand et
  const monthKey = Y + '-' + M + '-' + CAL_TYPE_FILTER + '-' + (_isAdminH() ? 'a' : 'u' + (_CUh() && _CUh().id));
  if (_calEvCacheKey === monthKey && _calEvCache) {
    return _calEvCache.filter(function(e) { return e.date === ds; });
  }
  return _expandRecurring(visEvs(), ds, ds);
}

// ── Debounced render ─────────────────────────────────────────────
function renderCalDebounced() {
  clearTimeout(_calRenderTimer);
  _calRenderTimer = setTimeout(() => {
    if (_calRendering) return;
    _calRendering = true;
    requestAnimationFrame(() => { renderCal(); _calRendering = false; });
  }, 100);
}

// ── Tip filtresi ─────────────────────────────────────────────────
function setCalTypeFilter(type, btn) {
  CAL_TYPE_FILTER = type;
  invalidateCalCache();
  document.querySelectorAll('#cal-type-chips .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderCalDebounced();
}
// ── Ana render: AY görünümü ──────────────────────────────────────
function renderCal() {
  const Y = CAL_DATE.getFullYear(), M = CAL_DATE.getMonth();
  const rawCal = loadCal();
  const cu = _CUh();
  let _tmpEvs = _isAdminH() ? rawCal : rawCal.filter(e => e.own === 0 || e.own === cu?.id || e.status === 'approved');
  if (CAL_TYPE_FILTER && CAL_TYPE_FILTER !== 'all') _tmpEvs = _tmpEvs.filter(e => e.type === CAL_TYPE_FILTER);
  _calAllEvs = _tmpEvs;

  const lang = (typeof getLang==='function'?getLang():(typeof getLang==='function'?getLang():localStorage.getItem('ak_lang')||'tr')||'tr') || 'tr';
  const monthNames = MONTHS[lang] || MONTHS.tr;
  _sth('cal-lbl', monthNames[M] + ' ' + Y);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === Y && today.getMonth() === M;
  _sth('cal-sub-lbl', isCurrentMonth
    ? 'Bu ay · ' + today.toLocaleDateString('tr-TR', {weekday: 'long'})
    : '');

  if (CAL_VIEW === 'week')   { const mc = _gh('cal-month-card'); if (mc) mc.style.display = 'none'; renderCalWeek(Y, M); renderCalUpcoming(); renderCalMonthStats(); renderCalLegend(); _calAllEvs = null; return; }
  if (CAL_VIEW === 'agenda') { const mc = _gh('cal-month-card'); if (mc) mc.style.display = 'none'; renderCalAgenda(); renderCalUpcoming(); renderCalMonthStats(); renderCalLegend(); _calAllEvs = null; return; }

  const mc = _gh('cal-month-card'); if (mc) mc.style.display = '';
  const wkEl2 = _gh('cal-week-view');   if (wkEl2)  wkEl2.style.display  = 'none';
  const agEl2 = _gh('cal-agenda-view'); if (agEl2)  agEl2.style.display  = 'none';

  const wdays = _gh('cal-wd');
  if (wdays && !wdays._rendered) {
    wdays.innerHTML = (WDAYS[lang] || WDAYS.tr).map((d, i) =>
      `<div class="chd" style="${i >= 5 ? 'color:var(--ac);opacity:.7' : ''}">${d}</div>`).join('');
    wdays._rendered = true;
  }

  const first = new Date(Y, M, 1);
  let sd = first.getDay() - 1; if (sd < 0) sd = 6;
  const total = new Date(Y, M + 1, 0).getDate();
  const prev  = new Date(Y, M, 0).getDate();
  const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();

  const monthEvs = visEvsForMonth(Y, M);
  const evsByDay = {};
  monthEvs.forEach(e => {
    const day = parseInt((e.date || '').slice(8, 10));
    if (!evsByDay[day]) evsByDay[day] = [];
    evsByDay[day].push(e);
  });

  const grid = _gh('cal-days'); if (!grid) { _calAllEvs = null; return; }

  // ── DocumentFragment — Anayasa Kural 3 ──────────────────────────
  const frag = document.createDocumentFragment();

  // Önceki ay günleri
  for (let i = sd - 1; i >= 0; i--) {
    const c = document.createElement('div'); c.className = 'cd om';
    c.innerHTML = `<div class="cdn">${prev - i}</div>`;
    frag.appendChild(c);
  }

  // Bu ayın günleri
  for (let d = 1; d <= total; d++) {
    const ds       = `${Y}-${_p2h(M + 1)}-${_p2h(d)}`;
    const evs      = evsByDay[d] || [];
    const isT      = todayY === Y && todayM === M && todayD === d;
    const isSel    = CAL_SEL === ds;
    const dow      = new Date(Y, M, d).getDay();
    const isWeekend= (dow === 0 || dow === 6);
    const isTatil  = _isTatilDay(ds);
    const tatilAd  = _getTatilAd(ds);

    const c = document.createElement('div');
    c.className = 'cd' + (isT ? ' today' : '') + (isSel ? ' sel' : '') + (isTatil ? ' tatil-day' : '');
    c.dataset.date = ds;
    if (isWeekend && !isT && !isSel) c.style.background = 'var(--s2)';
    if (isTatil   && !isT && !isSel) c.style.background = '#FEF3C7';

    const visible = evs.slice(0, 3); const more = evs.length - 3;
    let html = `<div class="cdn">${d}${isTatil ? ' 🎉' : ''}</div>`;
    if (isTatil && tatilAd) html += `<div class="ced" style="background:#E1F5EE;color:#085041;font-size:10px">🏛️ ${tatilAd}</div>`;
    for (let i = 0; i < visible.length; i++) {
      const e = visible[i]; const ev = EVC[e.type];
      html += `<div class="ced" style="background:${ev?.bg||'#e5e7eb'};color:${ev?.tx||'#374151'}">${ev?.ic||''} ${e.title}</div>`;
    }
    if (more > 0) html += `<div class="cd-more">+${more}</div>`;
    if (evs.length === 0 && isT && !isTatil) html += `<div style="width:5px;height:5px;border-radius:50%;background:var(--ac);margin:2px auto 0"></div>`;
    c.innerHTML = html;
    c.onclick = () => selCalDay(ds);
    frag.appendChild(c);
  }

  // Sonraki ay dolgu günleri
  const rem = (7 - (sd + total) % 7) % 7;
  for (let d = 1; d <= rem; d++) {
    const c = document.createElement('div'); c.className = 'cd om';
    c.innerHTML = `<div class="cdn">${d}</div>`;
    frag.appendChild(c);
  }

  grid.innerHTML = '';
  grid.appendChild(frag);
  renderCalUpcoming(); renderCalMonthStats(); renderCalLegend();
  if (CAL_SEL) selCalDay(CAL_SEL);
  _calAllEvs = null;
}

// ── Haftalık görünüm ─────────────────────────────────────────────
function renderCalWeek(Y, M) {
  const weekEl = _gh('cal-week-view'); if (!weekEl) return;
  weekEl.style.display = 'block';
  const agEl = _gh('cal-agenda-view'); if (agEl) agEl.style.display = 'none';
  const today  = new Date();
  const start  = new Date(CAL_DATE);
  const day    = start.getDay(); const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  const vis = visEvs();
  const weekEvsByDay = {};
  days.forEach(d => {
    const ds = `${d.getFullYear()}-${_p2h(d.getMonth()+1)}-${_p2h(d.getDate())}`;
    weekEvsByDay[ds] = vis.filter(e => e.date === ds);
  });
  const hours = [8,9,10,11,12,13,14,15,16,17,18,19];
  weekEl.innerHTML = `<div class="cal-week-grid">
    <div class="cal-week-header" style="background:var(--s2)"></div>
    ${days.map(d => {
      const isT = d.toDateString() === today.toDateString();
      return `<div class="cal-week-header" style="${isT?'background:var(--al);color:var(--ac)':''}">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][d.getDay()===0?6:d.getDay()-1]}<br><span style="font-size:16px;font-weight:700">${d.getDate()}</span></div>`;
    }).join('')}
    ${hours.map(h => `
      <div class="cal-week-time">${h}:00</div>
      ${days.map(d => {
        const ds = `${d.getFullYear()}-${_p2h(d.getMonth()+1)}-${_p2h(d.getDate())}`;
        const hEvs = (weekEvsByDay[ds]||[]).filter(e => e.time && parseInt(e.time.split(':')[0]) === h);
        return `<div class="cal-week-cell" onclick="selCalDay('${ds}')">
          ${hEvs.map(e => `<div class="cal-week-ev" style="background:${EVC[e.type]?.bg};color:${EVC[e.type]?.tx}">${e.title}</div>`).join('')}
        </div>`;
      }).join('')}
    `).join('')}
  </div>`;
}

// ── Ajanda görünümü ──────────────────────────────────────────────
function renderCalAgenda() {
  const agendaEl = _gh('cal-agenda-view'); if (!agendaEl) return;
  agendaEl.style.display = 'block';
  const wkEl = _gh('cal-week-view'); if (wkEl) wkEl.style.display = 'none';
  const today    = new Date().toISOString().slice(0, 10);
  const vis      = visEvs().filter(e => e.date >= today)
                           .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  if (!vis.length) {
    agendaEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">📭</div>Yaklaşan etkinlik yok.</div>`;
    return;
  }
  const byDay = {};
  vis.forEach(e => { if (!byDay[e.date]) byDay[e.date] = []; byDay[e.date].push(e); });

  // DocumentFragment
  const frag = document.createDocumentFragment();
  Object.entries(byDay).forEach(([date, evs]) => {
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-agenda-day';
    const dateLabel = new Date(date + 'T12:00').toLocaleDateString('tr-TR', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const cu = _CUh();
    dayEl.innerHTML = `<div class="cal-agenda-date">${dateLabel}</div>`
      + evs.map(e => `<div class="cal-agenda-ev" onclick="selCalDay('${date}')">
          <div class="cal-agenda-dot" style="background:${EVC[e.type]?.tx||'var(--ac)'}"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${EVC[e.type]?.ic||''} ${e.title}</div>
            <div class="cse-time">${e.time}${e.desc?' · '+e.desc:''}</div>
          </div>
          ${(_isAdminH()||e.own===cu?.id)?`<button onclick="event.stopPropagation();delEvent(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:12px">✕</button>`:''}
        </div>`).join('');
    frag.appendChild(dayEl);
  });
  agendaEl.replaceChildren(frag);
}

// ── Yaklaşan etkinlikler ─────────────────────────────────────────
function renderCalUpcoming() {
  const t  = new Date().toISOString().slice(0, 10);
  // Yaklaşan 60 gün için recurring genişlet
  const _upEnd = new Date(); _upEnd.setDate(_upEnd.getDate() + 60);
  const _upEndStr = _upEnd.toISOString().slice(0,10);
  const up = _expandRecurring(visEvs(), t, _upEndStr)
    .filter(function(e){ return e.date >= t; })
    .sort(function(a,b){ return a.date.localeCompare(b.date); })
    .slice(0, 8);
  const c  = _gh('cal-upc'); if (!c) return;
  if (!up.length) { c.innerHTML = `<div style="font-size:12px;color:var(--t2)">Yaklaşan etkinlik yok.</div>`; return; }
  const today = new Date().toISOString().slice(0, 10);

  // DocumentFragment
  var frag = document.createDocumentFragment();
  up.forEach(function(e) {
    var ev  = EVC[e.type] || {bg:'var(--s2)',tx:'var(--t)',ic:'📅'};
    var dl  = Math.ceil((new Date(e.date) - new Date(today)) / 86400000);
    var dlLabel = dl===0?'<span style="color:var(--ac);font-weight:700">Bugün</span>'
                : dl===1?'<span style="color:var(--am);font-weight:600">Yarın</span>'
                : '<span style="color:var(--t3)">'+dl+' gün</span>';
    var isRec = e.recur && e.recur.freq && e.recur.freq !== 'none';
    var row = document.createElement('div');
    row.className = 'cal-upc-row';
    row.innerHTML = '<div class="cal-upc-icon" style="background:'+ev.bg+';color:'+ev.tx+'">'+ev.ic+'</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + e.title + (isRec?'<span class="recur-badge">🔁</span>':'') + '</div>'
      + '<div style="font-size:10px;margin-top:2px;display:flex;align-items:center;gap:4px">'
      + dlLabel + '<span style="color:var(--b)">·</span><span style="color:var(--t2)">'+e.time+'</span>'
      + '</div>'
      + '</div>';
    row.addEventListener('click', function(){ calNavToDay(e.date); });
    frag.appendChild(row);
  });
  c.replaceChildren(frag);
}

// ── Ay istatistikleri ────────────────────────────────────────────
function renderCalMonthStats() {
  const c = _gh('cal-month-stats'); if (!c) return;
  const Y = CAL_DATE.getFullYear(), M = CAL_DATE.getMonth();
  const monthEvs = visEvs().filter(e => e.date.startsWith(`${Y}-${_p2h(M+1)}`));
  const byType = {}; monthEvs.forEach(e => { byType[e.type] = (byType[e.type]||0) + 1; });
  if (!monthEvs.length) { c.innerHTML = `<div style="font-size:12px;color:var(--t2)">Bu ay etkinlik yok.</div>`; return; }
  var total = monthEvs.length;
  c.innerHTML = '<div style="font-size:20px;font-weight:700;color:var(--t);letter-spacing:-.3px;margin-bottom:2px">'+total+'</div>'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">etkinlik bu ay</div>'
    + Object.entries(byType).map(function(entry) {
        var type = entry[0], cnt = entry[1];
        var ev = EVC[type] || {bg:'var(--s2)',tx:'var(--ac)',label:type,ic:'📅'};
        var pct = Math.round(cnt/total*100);
        return '<div style="margin-bottom:8px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">'
          + '<span style="font-size:11px;color:var(--t2);display:flex;align-items:center;gap:5px"><span style="font-size:12px">'+ev.ic+'</span>'+ev.label+'</span>'
          + '<span style="font-size:11px;font-weight:600;color:var(--t)">'+cnt+'</span>'
          + '</div>'
          + '<div style="height:3px;background:var(--s2);border-radius:99px;overflow:hidden">'
          + '<div style="height:100%;width:'+pct+'%;background:'+ev.tx+';border-radius:99px;transition:width .4s ease"></div>'
          + '</div></div>';
      }).join('');
}

// ── Renk açıklaması ──────────────────────────────────────────────
function renderCalLegend() {
  var c = _gh('cal-legend'); if (!c) return;
  var frag = document.createDocumentFragment();
  Object.entries(EVC).forEach(function(entry) {
    var k = entry[0], v = entry[1];
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer';
    row.innerHTML = '<div style="width:26px;height:18px;border-radius:4px;background:'+v.bg+';display:flex;align-items:center;justify-content:center;font-size:11px">'+v.ic+'</div>'
      + '<span style="font-size:11px;color:var(--t2);flex:1">'+v.label+'</span>';
    row.addEventListener('click', function(){ setCalTypeFilter(k, null); });
    frag.appendChild(row);
  });
  c.replaceChildren(frag);
}

// ── Gün seçimi ───────────────────────────────────────────────────
function selCalDay(ds) {
  CAL_SEL = ds;
  const evs = visEvsForDay(ds);
  const dateStr = new Date(ds + 'T12:00:00').toLocaleDateString('tr-TR', {weekday:'long',day:'numeric',month:'long'});
  const tatilAd = _getTatilAd(ds);
  _sth('cal-sel-l', dateStr + (tatilAd ? ' · 🎉 ' + tatilAd : ''));
  const sc = _gh('cal-sel-ev'); if (!sc) return;

  // DocumentFragment
  const frag = document.createDocumentFragment();
  if (!evs.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:var(--t2);padding:8px 0';
    msg.textContent = tatilAd ? `🎉 ${tatilAd} — resmi tatil günü.` : 'Bu gün için etkinlik yok.';
    frag.appendChild(msg);
  } else {
    const cu = _CUh();
    evs.forEach(e => {
      const ev = EVC[e.type] || {bg:'var(--s2)',tx:'var(--t)',ic:'📅'};
      const card = document.createElement('div');
      card.className = 'cse'; card.style.borderColor = ev.tx;
      var canEdit2 = _isAdminH() || e.own === (cu && cu.id);
      var isRec2   = !!(e.recur && e.recur.freq && e.recur.freq !== 'none');
      var editId2  = e.originalId || e.id;
      var sid2     = e.seriesId   || e.id;
      card.innerHTML = '<div style="display:flex;align-items:flex-start;gap:6px">'
        + '<div style="flex:1">'
        + '<div style="font-weight:600;font-size:13px;color:var(--t)">'+ ev.ic +' '+ e.title + (isRec2?'<span style="font-size:9px;color:var(--ac);background:var(--al);padding:1px 5px;border-radius:3px;margin-left:4px">🔁</span>':'')+  '</div>'
        + '<div class="cse-time">'+ e.time + (e.desc?' · '+e.desc:'') +'</div>'
        + '</div>'
        + (canEdit2 ? '<div style="display:flex;gap:4px;flex-shrink:0">'
          + '<button class="cal-ev-edit" data-id="'+ editId2 +'" style="background:var(--s2);border:1px solid var(--b);border-radius:5px;cursor:pointer;font-size:11px;padding:2px 7px;color:var(--t2);font-family:inherit">✏️</button>'
          + '<button class="cal-ev-del" data-id="'+ e.id +'" data-sid="'+ sid2 +'" data-rec="'+ (isRec2?'1':'0') +'" style="background:var(--rdb);border:1px solid var(--rd);border-radius:5px;cursor:pointer;font-size:11px;padding:2px 7px;color:var(--rdt);font-family:inherit">✕</button>'
          + '</div>' : '')
        + '</div>';
      card.querySelector('.cal-ev-edit') && card.querySelector('.cal-ev-edit').addEventListener('click', function(){
        openEvModal(parseInt(this.dataset.id));
      });
      var delBtn2 = card.querySelector('.cal-ev-del');
      if (delBtn2) delBtn2.addEventListener('click', function(){
        if (this.dataset.rec === '1') delEventWithOption(parseInt(this.dataset.id), parseInt(this.dataset.sid));
        else delEvent(parseInt(this.dataset.id));
      });
      frag.appendChild(card);
    });
  }
  sc.replaceChildren(frag);

  // Sadece highlight güncelle — tam renderCal() çağırmadan
  document.querySelectorAll('#cal-days .cd').forEach(cell => {
    const cellDate = cell.dataset.date;
    if (cellDate) { if (cellDate === ds) cell.classList.add('sel'); else cell.classList.remove('sel'); }
  });
}

// ── Navigasyon ───────────────────────────────────────────────────
function calNav(dir, gotoToday = false) {
  if (gotoToday) { CAL_DATE = new Date(); CAL_SEL = new Date().toISOString().slice(0, 10); }
  else CAL_DATE = new Date(CAL_DATE.getFullYear(), CAL_DATE.getMonth() + dir, 1);
  invalidateCalCache();
  renderCalDebounced();
}

function calNavToDay(ds) {
  const d = new Date(ds + 'T12:00');
  const sameMonth = CAL_DATE.getFullYear() === d.getFullYear() && CAL_DATE.getMonth() === d.getMonth();
  if (!sameMonth) { CAL_DATE = new Date(d.getFullYear(), d.getMonth(), 1); invalidateCalCache(); CAL_SEL = ds; renderCalDebounced(); }
  else selCalDay(ds);
}

function calGoTo(ds) {
  const d = new Date(ds + 'T12:00');
  CAL_DATE = new Date(d.getFullYear(), d.getMonth(), 1);
  invalidateCalCache(); renderCalDebounced();
}

// ── Etkinlik modal & CRUD ────────────────────────────────────────
function openEvModal(editId) {
  var existing = document.getElementById('mo-cal-form');
  if (existing) existing.remove();

  var ev     = editId ? loadCal().find(function(e){ return e.id === editId; }) : null;
  var users  = loadUsers().filter(function(u){ return u.status === 'active'; });
  var today  = new Date().toISOString().slice(0, 10);
  var cu     = _CUh();
  var recur  = (ev && ev.recur) || null;

  var userOpts = users.map(function(u) {
    return '<option value="' + u.id + '"' + ((ev && (ev.participants||[]).indexOf(u.id) > -1) ? ' selected' : '') + '>' + u.name + ' (' + u.role + ')</option>';
  }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo';
  mo.id = 'mo-cal-form';
  mo.style.zIndex = '2100';

  var recurHtml = [
    '<div class="fr" style="margin-top:4px">',
    '<div class="fl">🔁 TEKRARLAMA</div>',
    '<select class="fi" id="cal-recur-freq" onchange="calRecurFreqChange(this.value)">',
    '<option value="none"'  + (!recur||recur.freq==='none'  ?'selected':'') + '>Tekrarsız</option>',
    '<option value="daily"' + (recur&&recur.freq==='daily'  ?'selected':'') + '>Her Gün</option>',
    '<option value="weekly"'+ (recur&&recur.freq==='weekly' ?'selected':'') + '>Her Hafta</option>',
    '<option value="biweekly"'+(recur&&recur.freq==='biweekly'?'selected':'')+'>' + 'Her 2 Haftada Bir</option>',
    '<option value="weekdays"'+(recur&&recur.freq==='weekdays'?'selected':'')+'>' + 'Hft İçi (Pzt-Cum)</option>',
    '<option value="custom"'+(recur&&recur.freq==='custom'  ?'selected':'') + '>Özel Günler</option>',
    '<option value="monthly"'+(recur&&recur.freq==='monthly'?'selected':'')+'>' + 'Her Ay</option>',
    '<option value="yearly"'+(recur&&recur.freq==='yearly'  ?'selected':'') + '>Her Yıl</option>',
    '</select>',
    '</div>',

    // Özel günler seçici
    '<div id="cal-recur-days-wrap" style="display:' + (recur&&recur.freq==='custom'?'block':'none') + ';margin-top:8px">',
    '<div class="fl" style="margin-bottom:6px">GÜNLER</div>',
    '<div style="display:flex;gap:6px;flex-wrap:wrap">',
    ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(function(d, i) {
      var chk = (recur&&recur.days&&recur.days.indexOf(i)>-1)?'checked':'';
      return '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;border:1px solid var(--b);cursor:pointer;font-size:12px;background:var(--sf)">'
           + '<input type="checkbox" class="cal-recur-day" value="' + i + '" ' + chk + ' style="accent-color:var(--ac)">' + d + '</label>';
    }).join(''),
    '</div></div>',

    // Bitiş
    '<div id="cal-recur-end-wrap" style="display:' + (recur&&recur.freq&&recur.freq!=='none'?'grid':'none') + ';grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">',
    '<div class="fr"><div class="fl">BİTİŞ TARİHİ</div>',
    '<input type="date" class="fi" id="cal-recur-end" value="' + (recur&&recur.endDate||'') + '"></div>',
    '<div class="fr"><div class="fl">MAKS. TEKRAR</div>',
    '<input type="number" class="fi" id="cal-recur-count" placeholder="∞" min="1" max="500" value="' + (recur&&recur.count||'') + '" style="width:100%"></div>',
    '</div>',
  ].join('');

  mo.innerHTML = [
    '<div class="moc" style="max-width:540px;padding:0;overflow:hidden">',
    '<div style="padding:16px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">',
    '<div class="mt" style="margin-bottom:0">' + (ev ? '✏️ Etkinlik Düzenle' : '+ Etkinlik Ekle') + '</div>',
    '<button onclick="document.getElementById(\'mo-cal-form\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px">×</button>',
    '</div>',
    '<div style="padding:18px 22px;max-height:70vh;overflow-y:auto">',
    '<input type="hidden" id="cal-form-eid" value="' + (ev&&ev.id||'') + '">',
    '<div class="fr"><div class="fl">BAŞLIK *</div>',
    '<input class="fi" id="cal-form-title" placeholder="Etkinlik adı…" value="' + (ev&&ev.title||'') + '"></div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">',
    '<div class="fr"><div class="fl">TARİH *</div>',
    '<input type="date" class="fi" id="cal-form-date" value="' + (ev&&ev.date||(window.CAL_SEL||today)) + '"></div>',
    '<div class="fr"><div class="fl">SAAT</div>',
    '<input type="time" class="fi" id="cal-form-time" value="' + (ev&&ev.time||'09:00') + '"></div>',
    '</div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">',
    '<div class="fr"><div class="fl">TÜR</div>',
    '<select class="fi" id="cal-form-type">',
    '<option value="meeting"'  + ((ev&&ev.type==='meeting') ?'selected':'') + '>🤝 Toplantı</option>',
    '<option value="deadline"' + ((ev&&ev.type==='deadline')?'selected':'') + '>⏰ Son Tarih</option>',
    '<option value="holiday"'  + ((ev&&ev.type==='holiday') ?'selected':'') + '>🎉 Tatil / Etkinlik</option>',
    '<option value="task"'     + ((ev&&ev.type==='task')    ?'selected':'') + '>📋 Görev</option>',
    '</select></div>',
    '<div class="fr"><div class="fl">DURUM</div>',
    '<select class="fi" id="cal-form-status"' + (_isAdminH()?'':' disabled') + '>',
    '<option value="approved"' + ((!ev||ev.status==='approved')?'selected':'') + '>✅ Onaylı</option>',
    '<option value="pending"'  + ((ev&&ev.status==='pending') ?'selected':'') + '>⏳ Onay Bekliyor</option>',
    '</select></div>',
    '</div>',
    '<div class="fr"><div class="fl">AÇIKLAMA</div>',
    '<textarea class="fi" id="cal-form-desc" rows="2" style="resize:vertical" placeholder="Gündem, detay…">' + (ev&&ev.desc||'') + '</textarea></div>',
    '<div class="fr"><div class="fl">👥 KATILIMCILAR <span style="font-weight:400;color:var(--t3)">(boş = herkese açık)</span></div>',
    '<select class="fi" id="cal-form-part" multiple size="3" style="height:auto">' + userOpts + '</select></div>',

    // Tekrarlama bölümü
    '<div style="border-top:1px solid var(--b);padding-top:14px;margin-top:6px">',
    '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">🔁 Tekrarlama</div>',
    recurHtml,
    '</div>',
    '</div>',
    '<div style="padding:14px 22px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">',
    '<button class="btn" onclick="document.getElementById(\'mo-cal-form\').remove()">İptal</button>',
    '<button class="btn btnp" onclick="saveCalForm()" style="padding:9px 22px">Kaydet</button>',
    '</div>',
    '</div>'
  ].join('');

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e){ if (e.target === mo) mo.remove(); });
  setTimeout(function(){
    mo.classList.add('open');
    var titleEl = document.getElementById('cal-form-title');
    if (titleEl) titleEl.focus();
  }, 10);
}

// Tekrarlama frekansı değişince UI güncelle
function calRecurFreqChange(freq) {
  var daysWrap = document.getElementById('cal-recur-days-wrap');
  var endWrap  = document.getElementById('cal-recur-end-wrap');
  if (daysWrap) daysWrap.style.display = freq === 'custom' ? 'block' : 'none';
  if (endWrap)  endWrap.style.display  = (freq && freq !== 'none') ? 'grid' : 'none';
}



function saveCalForm() {
  var eid   = parseInt((document.getElementById('cal-form-eid')  || {}).value || '0');
  var title = ((document.getElementById('cal-form-title') || {}).value || '').trim();
  var date  = (document.getElementById('cal-form-date')  || {}).value  || '';
  if (!title || !date) { window.toast?.('Başlık ve tarih zorunludur', 'err'); return; }

  var cu   = _CUh();
  var d    = loadCal();
  var partSel = document.getElementById('cal-form-part');
  var part = partSel ? Array.from(partSel.selectedOptions).map(function(o){ return parseInt(o.value); }) : [];

  // Tekrarlama ayarları
  var recurFreq    = (document.getElementById('cal-recur-freq')    || {}).value || 'none';
  var recurEnd     = (document.getElementById('cal-recur-end')     || {}).value || '';
  var recurCount   = parseInt((document.getElementById('cal-recur-count') || {}).value || '0') || 0;
  var recurInterval= parseInt((document.getElementById('cal-recur-interval') || {}).value || '1') || 1;
  // Özel günler checkboxları
  var customDays = [];
  document.querySelectorAll('.cal-recur-day:checked').forEach(function(cb) {
    customDays.push(parseInt(cb.value));
  });

  var recur = null;
  if (recurFreq && recurFreq !== 'none') {
    recur = { freq: recurFreq, interval: recurInterval, seriesId: eid || generateNumericId() };
    if (recurEnd)   recur.endDate = recurEnd;
    if (recurCount) recur.count   = recurCount;
    if (recurFreq === 'custom' && customDays.length) recur.days = customDays;
    if (recurFreq === 'biweekly') recur.interval = 2;
  }

  var fields = {
    title, date,
    time:         (document.getElementById('cal-form-time')   || {}).value || '09:00',
    type:         (document.getElementById('cal-form-type')   || {}).value || 'meeting',
    status:       _isAdminH() ? ((document.getElementById('cal-form-status') || {}).value || 'approved') : 'pending',
    desc:         (document.getElementById('cal-form-desc')   || {}).value || '',
    participants: part,
    own:          _isAdminH() ? 0 : cu && cu.id,
    reqBy:        cu && cu.id,
    reqByName:    cu && cu.name,
  };
  if (recur) fields.recur = recur;
  else delete fields.recur;

  if (eid) {
    // Tekrar serisini düzenliyorsa: sadece bu mi, hepsi mi?
    var origEv = d.find(function(e){ return e.id === eid; });
    if (origEv && origEv.recur && recur) {
      // Serinin tüm gelecek etkinlikleri güncellenir (master değişir)
      Object.assign(origEv, fields);
    } else if (origEv) {
      Object.assign(origEv, fields);
    }
    window.toast?.('Güncellendi ✓', 'ok');
    window.logActivity?.('cal', '"' + title + '" etkinliği güncellendi');
  } else {
    var newId = generateNumericId();
    if (recur) recur.seriesId = newId;
    d.push(Object.assign({ id: newId }, fields));
    window.logActivity?.('cal', '"' + title + '" ' + (recur ? '(tekrarlayan) ' : '') + 'etkinliği ' + (_isAdminH()?'eklendi':'onay için gönderildi') + ' (' + date + ')');
    if (!_isAdminH()) {
      window.toast?.('Etkinlik yönetici onayına gönderildi ✓', 'ok');
      window.addNotif?.('📅', 'Onay bekleyen etkinlik: "' + title + '" (' + date + ') — ' + (cu && cu.name), 'warn', 'takvim');
    } else {
      window.toast?.((recur ? '🔁 Tekrarlayan etkinlik' : 'Etkinlik') + ' eklendi ✓', 'ok');
    }
  }

  saveCal(d);
  invalidateCalCache();
  document.getElementById('mo-cal-form') && document.getElementById('mo-cal-form').remove();
  renderCal();
  if (CAL_SEL) selCalDay(CAL_SEL);
}

// Tekrarlayan etkinliğin bir oluşumunu sil veya tüm seriyi sil
function delEventWithOption(evId, seriesId) {
  if (!seriesId) { delEvent(evId); return; }
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.style.zIndex = '2200';
  var _sid = seriesId;
  var _oid = evId;
  mo.innerHTML = [
    '<div class="moc" style="max-width:400px">',
    '<div class="mt">Tekrarlayan Etkinliği Sil</div>',
    '<p style="margin-bottom:20px;color:var(--t2);font-size:13px">Bu tekrarlayan etkinliği nasıl silmek istersiniz?</p>',
    '<div class="mof" style="flex-direction:column;gap:8px">',
    '<button class="btn btns" style="justify-content:flex-start;text-align:left" id="del-one-btn">📅 Sadece bu tarihi sil</button>',
    '<button class="btn btns" style="justify-content:flex-start;text-align:left;color:var(--rdt)" id="del-series-btn">🗑 Tüm seriyi sil</button>',
    '<button class="btn" id="del-cancel-btn">İptal</button>',
    '</div></div>'
  ].join('');
  document.body.appendChild(mo);
  setTimeout(function(){ mo.classList.add('open'); }, 10);
  mo.addEventListener('click', function(e){ if (e.target === mo) mo.remove(); });
  document.getElementById('del-one-btn').addEventListener('click', function(){
    _delOneOccurrence(_sid, _oid); mo.remove();
  });
  document.getElementById('del-series-btn').addEventListener('click', function(){
    _delEntireSeries(_sid); mo.remove();
  });
  document.getElementById('del-cancel-btn').addEventListener('click', function(){ mo.remove(); });
}

function _delOneOccurrence(seriesId, occurrenceId) {
  var d = loadCal();
  var master = d.find(function(e){ return e.id === seriesId; });
  if (!master) return;
  if (!master.recur) { master.recur = {}; }
  if (!master.recur.exceptions) master.recur.exceptions = [];
  // Hariç tutulan tarih ekle
  var occDate = String(occurrenceId).split('_').pop();
  if (master.recur.exceptions.indexOf(occDate) === -1) master.recur.exceptions.push(occDate);
  saveCal(d); invalidateCalCache(); renderCal();
  window.toast?.('Bu tarih silindi', 'ok');
}

function _delEntireSeries(seriesId) {
  var d = loadCal().filter(function(e){ return e.id !== seriesId; });
  saveCal(d); invalidateCalCache(); renderCal();
  window.toast?.('Tüm seri silindi', 'ok');
}

function saveEvent() {
  const title = (_gh('ev-title')?.value || '').trim();
  const date  = _gh('ev-date')?.value || '';
  if (!title || !date) { window.toast?.('Başlık ve tarih zorunludur', 'err'); return; }
  const cu = _CUh();
  const d  = loadCal();
  const status = _isAdminH() ? 'approved' : 'pending';
  const newEv = {
    id: generateNumericId(), own: _isAdminH() ? 0 : cu?.id,
    title, date,
    time:  _gh('ev-time')?.value  || '09:00',
    type:  _gh('ev-type')?.value  || 'meeting',
    desc:  _gh('ev-desc')?.value  || '',
    status, reqBy: cu?.id, reqByName: cu?.name,
    participants: [],
  };
  d.push(newEv);
  saveCal(d);
  window.closeMo?.('mo-event');
  renderCal();
  window.logActivity?.('cal', `"${title}" etkinliği ${_isAdminH()?'ekledi':'onay için gönderdi'} (${date})`);
  if (!_isAdminH()) {
    window.toast?.('Etkinlik yönetici onayına gönderildi ✓', 'ok');
    window.addNotif?.('📅', `Onay bekleyen etkinlik: "${title}" (${date}) — ${cu?.name}`, 'warn', 'takvim');
  } else {
    window.toast?.('Etkinlik eklendi ✓', 'ok');
  }
}

function approveCalEvent(id) {
  if (!_isAdminH()) { window.toast?.('Yetki yok', 'err'); return; }
  const d = loadCal(); const ev = d.find(x => x.id === id); if (!ev) return;
  ev.status = 'approved'; saveCal(d); renderCal();
  window.logActivity?.('cal', `"${ev.title}" etkinliği onaylandı`);
  window.addNotif?.('✅', `Etkinlik onaylandı: "${ev.title}" (${ev.date})`, 'ok', 'takvim');
  window.toast?.('Etkinlik onaylandı ✓', 'ok');
}

function rejectCalEvent(id) {
  if (!_isAdminH()) { window.toast?.('Yetki yok', 'err'); return; }
  const d = loadCal(); const ev = d.find(x => x.id === id); if (!ev) return;
  ev.status = 'rejected'; saveCal(d); renderCal();
  window.addNotif?.('❌', `Etkinlik reddedildi: "${ev.title}"`, 'warn', 'takvim');
  window.toast?.('Etkinlik reddedildi', 'ok');
}

function delEvent(id) {
  const d  = loadCal();
  const ev = d.find(e => e.id === id); if (!ev) return;
  const cu = _CUh();
  if (ev.own !== 0 && ev.own !== cu?.id && !_isAdminH()) { window.toast?.('Yetki yok', 'err'); return; }
  saveCal(d.filter(e => e.id !== id));
  invalidateCalCache();
  if (CAL_SEL) selCalDay(CAL_SEL); else renderCal();
  window.toast?.('"' + ev.title + '" silindi', 'ok');
  window.logActivity?.('cal', `"${ev.title}" etkinliği silindi`);
}

// ── Tatil yaklaşma bildirimi ─────────────────────────────────────
function checkYaklasanTatiller() {
  if (!_isAdminH()) return;
  const today = new Date();
  const todayS = today.toISOString().slice(0, 10);

  // Hem yasal tatiller hem de takvime eklenmiş tatil/bayram etkinlikleri
  const calHolidays = loadCal().filter(e =>
    e.type === 'holiday' && e.status === 'approved' && e.date >= todayS
  );
  const yasal = getTatillerThisYear().map(t => ({
    ad: t.ad, tarih: t.tarih, gun_sayisi: t.gun_sayisi || 1, kaynak: 'yasal'
  }));
  const calEvs = calHolidays.map(e => ({
    ad: e.title, tarih: e.date, gun_sayisi: 1, kaynak: 'takvim', desc: e.desc || ''
  }));

  // Birleştir, tekrarları çıkar
  const allHolidays = [...yasal];
  calEvs.forEach(c => {
    if (!allHolidays.some(y => y.tarih === c.tarih && y.ad === c.ad)) {
      allHolidays.push(c);
    }
  });

  allHolidays.forEach(t => {
    const tatilDate = new Date(t.tarih);
    const daysLeft  = Math.ceil((tatilDate - today) / 86400000);
    if (daysLeft > 0 && daysLeft <= 10) {
      const key = 'tatil_modal_' + t.tarih;
      if (!localStorage.getItem(key)) {
        // Modal aç — yöneticiden tatil gün sayısı ve duyuru onayı iste
        openTatilUyariModal({
          ad: t.ad,
          tarih: t.tarih,
          gun_sayisi: t.gun_sayisi || 1,
          daysLeft,
          key
        });
      }
    }
  });
}

// ── Tatil uyarı modalını aç ──────────────────────────────────────
function openTatilUyariModal(tatil) {
  // Önce eski modal varsa kaldır
  const existing = document.getElementById('mo-tatil-uyari');
  if (existing) existing.remove();

  const mo = document.createElement('div');
  mo.className = 'mo';
  mo.id = 'mo-tatil-uyari';
  mo.style.zIndex = '2200';

  const users = loadUsers().filter(u => u.status === 'active');
  const userOpts = `<option value="all">👥 Tüm Personel</option>`
    + users.map(u => `<option value="uid:${u.id}">${u.name} (${u.role})</option>`).join('');

  // Varsayılan duyuru metni
  const defaultMsg = `${tatil.ad} nedeniyle ${tatil.tarih} tarihinde ${tatil.gun_sayisi} gün tatilimiz bulunmaktadır. Tüm personelimize iyi bayramlar ve tatiller dileriz.`;
  // Varsayılan yayın tarihi: şimdi
  const now = new Date();
  const defaultPubDate = now.toISOString().slice(0, 10);
  const defaultPubTime = now.toTimeString().slice(0, 5);

  mo.innerHTML = `
<div class="moc" style="max-width:560px;padding:0;overflow:hidden">
  <div style="background:linear-gradient(135deg,var(--ac),#6366F1);padding:20px 24px;color:#fff">
    <div style="font-size:18px;font-weight:700;margin-bottom:4px">🎉 Yaklaşan Tatil</div>
    <div style="font-size:13px;opacity:.85">${tatil.ad} — <strong>${tatil.daysLeft} gün kaldı</strong> (${tatil.tarih})</div>
  </div>
  <div style="padding:20px 24px">
    <div class="fr" style="margin-bottom:14px">
      <div class="fl">📅 Tatil Kaç Gün?</div>
      <input class="fi" type="number" id="tatil-gun-sayisi" value="${tatil.gun_sayisi}" min="1" max="30" style="width:100px">
    </div>
    <div class="fr" style="margin-bottom:14px">
      <div class="fl">👥 Kimlere Gönderilsin?</div>
      <select class="fi" id="tatil-hedef" multiple size="4" style="height:auto">
        ${userOpts}
      </select>
      <div style="font-size:10px;color:var(--t3);margin-top:3px">Çoklu seçim için Ctrl/Cmd basılı tutun</div>
    </div>
    <div class="fr" style="margin-bottom:14px">
      <div class="fl">📢 Duyuru Metni <span style="color:var(--rd)">*</span></div>
      <textarea class="fi" id="tatil-duyuru-metin" rows="4" style="resize:vertical">${defaultMsg}</textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px">
      <div class="fr">
        <div class="fl">📆 Yayın Tarihi</div>
        <input class="fi" type="date" id="tatil-pub-tarih" value="${defaultPubDate}">
      </div>
      <div class="fr">
        <div class="fl">🕐 Yayın Saati</div>
        <input class="fi" type="time" id="tatil-pub-saat" value="${defaultPubTime}">
      </div>
    </div>
    <div style="background:var(--al);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--at)">
      💡 Onaylarsanız duyuru belirlenen tarih ve saatte otomatik yayınlanır ve personel ekranında görünür.
    </div>
  </div>
  <div style="padding:14px 24px;border-top:1px solid var(--b);display:flex;justify-content:space-between;gap:10px;background:var(--s2)">
    <button class="btn" onclick="tatilUyariAtla('${tatil.key}')">Şimdi Değil</button>
    <div style="display:flex;gap:8px">
      <button class="btn btns" onclick="tatilUyariAtlaVeHatirlatma('${tatil.key}')">Daha Sonra Hatırlat</button>
      <button class="btn btnp" onclick="tatilUyariOnayla('${tatil.tarih}','${tatil.ad}')">✓ Duyuru Oluştur</button>
    </div>
  </div>
</div>`;

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) tatilUyariAtlaVeHatirlatma(tatil.key); });
  setTimeout(() => mo.classList.add('open'), 10);

  // Tüm personel seçili gelsin varsayılan
  const sel = document.getElementById('tatil-hedef');
  if (sel && sel.options[0]) sel.options[0].selected = true;
}

function tatilUyariAtla(key) {
  localStorage.setItem(key, '1');
  document.getElementById('mo-tatil-uyari')?.remove();
}

function tatilUyariAtlaVeHatirlatma(key) {
  // Sadece modalı kapat, key'i kaydetme — yarın tekrar sorar
  document.getElementById('mo-tatil-uyari')?.remove();
}

function tatilUyariOnayla(tarih, ad) {
  const gunSayisi  = parseInt(document.getElementById('tatil-gun-sayisi')?.value || '1');
  const metin      = (document.getElementById('tatil-duyuru-metin')?.value || '').trim();
  const pubTarih   = document.getElementById('tatil-pub-tarih')?.value || new Date().toISOString().slice(0,10);
  const pubSaat    = document.getElementById('tatil-pub-saat')?.value  || '09:00';
  const hedefSel   = document.getElementById('tatil-hedef');

  if (!metin) { window.toast?.('Duyuru metni boş olamaz', 'err'); return; }

  // Hedef kitle
  let targetUsers = [];
  let target = 'all';
  if (hedefSel) {
    const selected = Array.from(hedefSel.selectedOptions).map(o => o.value);
    if (!selected.includes('all') && selected.length > 0) {
      target = 'users';
      targetUsers = selected.filter(v => v.startsWith('uid:')).map(v => parseInt(v.replace('uid:', '')));
    }
  }

  // Takvim etkinliğini güncelle — gün sayısını ekle
  const cal = loadCal();
  const ev  = cal.find(e => e.date === tarih && e.type === 'holiday');
  if (ev) {
    ev.gun_sayisi = gunSayisi;
    ev.desc = (ev.desc || '') + (gunSayisi > 1 ? ` · ${gunSayisi} gün` : '');
    saveCal(cal);
  }

  // Duyuru oluştur
  const cu   = _CUh();
  const anns = loadAnn();
  const pubTs = pubTarih + ' ' + pubSaat + ':00';
  const nowTs = _nowTsh();
  const isScheduled = pubTs > nowTs;

  anns.unshift({
    id:          generateNumericId(),
    title:       `🎉 ${ad}`,
    body:        metin,
    type:        'info',
    ts:          nowTs,
    publishAt:   pubTs,        // zamanlanmış yayın
    published:   !isScheduled, // hemen mi yayınlansın?
    read:        [],
    target,
    targetUsers,
    addedBy:     cu?.id,
    addedByName: cu?.name,
    tatilGun:    gunSayisi,
    tatilTarih:  tarih,
  });
  storeAnn(anns);
  window.updateAnnBadge?.();

  // Anında yayınlanıyorsa bildirim de gönder
  if (!isScheduled) {
    const users = loadUsers().filter(u => {
      if (target === 'all') return true;
      return targetUsers.includes(u.id);
    });
    users.forEach(u => {
      window.addNotif?.('🎉', `${ad} duyurusu: ${metin.slice(0, 60)}…`, 'info', 'duyurular');
    });
    window.toast?.('Duyuru yayınlandı ✓', 'ok');
  } else {
    window.toast?.(`Duyuru ${pubTarih} ${pubSaat}'de yayınlanacak ✓`, 'ok');
  }

  // Key kaydet — bu tatil için tekrar sormayalım
  const key = 'tatil_modal_' + tarih;
  localStorage.setItem(key, '1');
  document.getElementById('mo-tatil-uyari')?.remove();
  window.logActivity?.('cal', `"${ad}" tatili için duyuru oluşturuldu (${pubTs})`);

  // Duyurular paneli varsa yenile
  window.renderAnnouncements?.();
}

// ── Yasal tatilleri takvime otomatik ekle ────────────────────────
function initTrYasalEvents() {
  const existing = loadCal();
  const tatiller = getTatillerThisYear();
  let added = 0;
  tatiller.forEach(t => {
    if (existing.some(e => e.date === t.tarih && e.type === 'holiday' && e.title === t.ad)) return;
    existing.push({
      id: generateNumericId(), own: 0,
      title: t.ad, date: t.tarih, time: '00:00',
      type: 'holiday', desc: `${t.tip === 'milli' ? 'Milli Bayram' : 'Dini Bayram'} · ${t.gun_sayisi} gün`,
      status: 'approved', reqBy: 0, reqByName: 'Sistem',
    });
  });
  if (added > 0) { saveCal(existing); invalidateCalCache(); }
}

// ── Yasal tatil duyurusu yap ─────────────────────────────────────
function tatilDuyuruYap(tatil) {
  const anns = loadAnn();
  if (anns.some(a => a.title && a.title.includes(tatil.ad))) return;
  const cu = _CUh();
  anns.unshift({
    id: generateNumericId(), title: '🎉 ' + tatil.ad,
    body: `${tatil.ad} nedeniyle ${tatil.tarih} tarihinde tatil olacaktır. İyi bayramlar!`,
    type: 'info', ts: _nowTsh(), read: [], target: 'all', targetRoles: [], targetUsers: [],
    addedBy: cu?.id, addedByName: cu?.name,
  });
  storeAnn(anns);
  window.updateAnnBadge?.();
}

// ── Excel export ─────────────────────────────────────────────────

// ── Zamanlanmış duyuruları kontrol et & yayınla ──────────────────
function checkScheduledAnnouncements() {
  const anns    = loadAnn();
  const nowTs   = _nowTsh();
  let   changed = false;
  anns.forEach(a => {
    if (a.publishAt && !a.published && a.publishAt <= nowTs) {
      a.published = true;
      changed = true;
      window.addNotif?.('📢', `Duyuru yayınlandı: "${a.title}"`, 'info', 'duyurular');
    }
  });
  if (changed) {
    storeAnn(anns);
    window.updateAnnBadge?.();
    window.renderAnnouncements?.();
  }
}

function exportCalXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const rows = loadCal().map(e => ({
    Başlık: e.title, Tarih: e.date, Saat: e.time,
    Tür:    EVC[e.type]?.label || e.type, Durum: e.status,
    Açıklama: e.desc || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Takvim');
  XLSX.writeFile(wb, `Takvim_${_nowTsh().slice(0, 10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — NOTLAR
// Namespace: renderNotes, saveNote, delNote, pinNote, viewNote
// ════════════════════════════════════════════════════════════════

// ── Sabitler ─────────────────────────────────────────────────────
const NC    = {yellow:'#FEF9C3',blue:'#DBEAFE',green:'#DCFCE7',pink:'#FCE7F3',orange:'#FFEDD5',purple:'#F3E8FF'};
const NCATS = {genel:'📌 Genel',fikir:'💡 Fikir',toplanti:'🤝 Toplantı',gorev:'✅ Görev Notu',ozel:'🔒 Özel'};

let NOTE_VIEW    = localStorage.getItem('ak_nview') || 'grid';
let VIEWING_NOTE = null;

// ── Yardımcılar ──────────────────────────────────────────────────
function setNoteView(v, btn) {
  NOTE_VIEW = v; localStorage.setItem('ak_nview', v);
  document.querySelectorAll('#nt-v-grid,#nt-v-list').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderNotes();
}

function pickNtColor(c, el) {
  const inp = _gh('nt-color'); if (inp) inp.value = c;
  document.querySelectorAll('#nt-cpick span').forEach(s => { s.style.border = '2px solid transparent'; s.style.transform = ''; });
  if (el) { el.style.border = '2px solid var(--ac)'; el.style.transform = 'scale(1.2)'; }
}

function ntFmt(b, a) {
  const ta = _gh('nt-body'); if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
  ta.value = ta.value.slice(0, s) + b + sel + a + ta.value.slice(e);
  ta.selectionStart = s + b.length; ta.selectionEnd = e + b.length; ta.focus();
}

function renderNoteBody(txt) {
  if (!txt) return '<span style="color:var(--t3)">İçerik yok.</span>';
  return txt.split('\n').map(l => {
    l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>');
    if (l.startsWith('☑ ')) return `<div style="display:flex;gap:6px"><span style="color:var(--gr)">✅</span><span style="text-decoration:line-through;color:var(--t2)">${l.slice(2)}</span></div>`;
    if (l.startsWith('☐ ')) return `<div style="display:flex;gap:6px"><span>⬜</span><span>${l.slice(2)}</span></div>`;
    if (l.startsWith('- '))  return `<div style="display:flex;gap:6px;padding-left:4px"><span style="color:var(--ac)">•</span><span>${l.slice(2)}</span></div>`;
    if (l.startsWith('# '))  return `<div style="font-size:17px;font-weight:600;margin-top:8px">${l.slice(2)}</div>`;
    if (l === '---')          return `<hr style="border:none;border-top:1px solid var(--b);margin:8px 0">`;
    if (!l.trim())            return `<div style="height:7px"></div>`;
    return `<div>${l}</div>`;
  }).join('');
}

// ── CRUD ─────────────────────────────────────────────────────────
function openNoteModal(editId) {
  if (editId) {
    const n = loadNotes().find(x => x.id === editId); if (!n) return;
    if (_gh('nt-title')) _gh('nt-title').value = n.title;
    if (_gh('nt-body'))  _gh('nt-body').value  = n.body;
    if (_gh('nt-cat'))   _gh('nt-cat').value   = n.cat || 'genel';
    if (_gh('nt-pin'))   _gh('nt-pin').checked = n.pinned || false;
    if (_gh('nt-color')) _gh('nt-color').value = n.color || '';
    if (_gh('nt-eid'))   _gh('nt-eid').value   = editId;
    document.querySelectorAll('#nt-cpick span').forEach(s => {
      s.style.border = s.dataset.c === (n.color || '') ? '2px solid var(--ac)' : '2px solid transparent';
    });
    _sth('mo-nt-t', '✏️ Notu Düzenle');
  } else {
    ['nt-title', 'nt-body'].forEach(id => { const el = _gh(id); if (el) el.value = ''; });
    if (_gh('nt-cat'))   _gh('nt-cat').value   = 'genel';
    if (_gh('nt-pin'))   _gh('nt-pin').checked = false;
    if (_gh('nt-color')) _gh('nt-color').value = '';
    if (_gh('nt-eid'))   _gh('nt-eid').value   = '';
    document.querySelectorAll('#nt-cpick span').forEach(s => {
      s.style.border = s.dataset.c === '' ? '2px solid var(--ac)' : '2px solid transparent';
    });
    _sth('mo-nt-t', '📝 Not Ekle');
  }
  window.closeMo?.('mo-nview');
  window.openMo?.('mo-note');
}

function saveNote() {
  const title = (_gh('nt-title')?.value || '').trim();
  const body  = (_gh('nt-body')?.value  || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const cu    = _CUh();
  const notes = loadNotes();
  const eid   = parseInt(_gh('nt-eid')?.value || '0');
  const now   = _nowTsh();
  if (eid) {
    const n = notes.find(x => x.id === eid);
    if (n) Object.assign(n, {title, body, cat: _gh('nt-cat')?.value || 'genel', pinned: _gh('nt-pin')?.checked || false, color: _gh('nt-color')?.value || '', updated: now});
    window.logActivity?.('note', `"${title}" notunu güncelledi`);
    window.toast?.('Not güncellendi ✓', 'ok');
  } else {
    notes.push({id: generateNumericId(), uid: cu?.id, title, body, cat: _gh('nt-cat')?.value || 'genel', pinned: _gh('nt-pin')?.checked || false, color: _gh('nt-color')?.value || '', ts: now, updated: now});
    window.logActivity?.('note', `"${title}" notu ekledi`);
    window.toast?.('Not eklendi ✓', 'ok');
  }
  saveNotes(notes);
  window.closeMo?.('mo-note');
  renderNotes();
}

function delNote(id) {
  window.confirmModal('Notu silmek istediğinizden emin misiniz?', {
    title: 'Not Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      const cu    = _CUh();
      const notes = loadNotes();
      const n     = notes.find(x => x.id === id);
      if (!n || (n.uid !== cu?.id && !_isAdminH())) { window.toast?.('Yetki yok', 'err'); return; }
      saveNotes(notes.filter(x => x.id !== id));
      renderNotes();
      window.logActivity?.('note', `"${n.title}" notunu sildi`);
      window.toast?.('Silindi', 'ok');
    }
  });
}

function pinNote(id) {
  const notes = loadNotes(); const n = notes.find(x => x.id === id); if (!n) return;
  n.pinned = !n.pinned; saveNotes(notes); renderNotes();
  window.toast?.(n.pinned ? '📌 Pinlendi' : 'Pin kaldırıldı', 'ok');
}

function viewNote(id) {
  const notes = loadNotes(); const n = notes.find(x => x.id === id); if (!n) return;
  VIEWING_NOTE = id;
  _sth('mnv-title', (n.pinned ? '📌 ' : '') + n.title);
  const meta = _gh('mnv-meta'); if (meta) meta.textContent = (NCATS[n.cat]||n.cat) + ' · ' + (n.updated||n.ts);
  const body = _gh('mnv-body');
  if (body) { body.style.background = NC[n.color] || 'var(--s2)'; body.innerHTML = renderNoteBody(n.body); }
  window.openMo?.('mo-nview');
  window.logActivity?.('note', `"${n.title}" notunu görüntüledi`);
}

function editNoteView() { if (VIEWING_NOTE) openNoteModal(VIEWING_NOTE); }
function delNoteView()  { if (VIEWING_NOTE) { delNote(VIEWING_NOTE); window.closeMo?.('mo-nview'); VIEWING_NOTE = null; } }

// ── Render — DocumentFragment ────────────────────────────────────
function renderNotes() {
  const cu     = _CUh();
  const search = (_gh('nt-search')?.value || '').toLowerCase();
  const catF   = _gh('nt-cat-f')?.value || '';
  const sortF  = _gh('nt-sort')?.value  || 'newest';
  let notes    = loadNotes().filter(n => n.uid === cu?.id);
  if (search) notes = notes.filter(n => n.title.toLowerCase().includes(search) || (n.body||'').toLowerCase().includes(search));
  if (catF)   notes = notes.filter(n => n.cat === catF);
  if (sortF === 'newest') notes.sort((a, b) => b.id - a.id);
  if (sortF === 'oldest') notes.sort((a, b) => a.id - b.id);
  if (sortF === 'az')     notes.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  const sorted = [...notes.filter(n => n.pinned), ...notes.filter(n => !n.pinned)];

  const cont = _gh('notes-cont'); if (!cont) return;
  const gBtn = _gh('nt-v-grid'); const lBtn = _gh('nt-v-list');
  if (gBtn) gBtn.classList.toggle('on', NOTE_VIEW === 'grid');
  if (lBtn) lBtn.classList.toggle('on', NOTE_VIEW === 'list');

  if (!sorted.length) {
    cont.innerHTML = `<div style="padding:60px;text-align:center;color:var(--t2)"><div style="font-size:40px;margin-bottom:12px">📝</div><div style="font-size:15px;font-weight:500">Henüz not yok</div><button class="btn btnp" onclick="openNoteModal(null)" style="margin-top:16px">+ Not Ekle</button></div>`;
    return;
  }

  const mkCard = n => {
    const bg      = NC[n.color] || 'var(--sf)';
    const cat     = NCATS[n.cat] || n.cat;
    const preview = (n.body || '').replace(/[*_#☐☑]/g, '').slice(0, 120);
    return `<div class="note-card${n.pinned?' pinned':''}" style="background:${bg}" onclick="viewNote(${n.id})">
      <div class="nc-acts">
        <button onclick="event.stopPropagation();pinNote(${n.id})" style="background:var(--sf);border:1px solid var(--b);border-radius:4px;padding:2px 5px;cursor:pointer;font-size:11px">${n.pinned?'📌':'📍'}</button>
        <button onclick="event.stopPropagation();openNoteModal(${n.id})" style="background:var(--sf);border:1px solid var(--b);border-radius:4px;padding:2px 5px;cursor:pointer;font-size:11px">✏️</button>
        <button onclick="event.stopPropagation();delNote(${n.id})" style="background:var(--rdb);border:none;border-radius:4px;padding:2px 5px;cursor:pointer;font-size:11px;color:var(--rdt)">🗑</button>
      </div>
      <div class="nc-title">${n.pinned?'📌 ':''}${n.title}</div>
      <div class="nc-body">${preview||'<span style="font-style:italic;color:var(--t3)">İçerik yok</span>'}</div>
      <div class="nc-meta"><span style="padding:2px 6px;border-radius:99px;background:rgba(0,0,0,.06);font-size:10px">${cat}</span><span>${(n.updated||n.ts).slice(0,10)}</span></div>
    </div>`;
  };

  const mkLi = n => {
    const bg      = NC[n.color] || 'var(--sf)';
    const cat     = NCATS[n.cat] || n.cat;
    const preview = (n.body || '').replace(/[*_#☐☑]/g, '').slice(0, 100);
    return `<div class="note-li${n.pinned?' pinned':''}" style="background:${bg}" onclick="viewNote(${n.id})">
      <div style="font-size:22px;flex-shrink:0">${n.pinned?'📌':'📝'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:13px">${n.title}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${preview||'—'}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">${cat} · ${(n.updated||n.ts).slice(0,10)}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button onclick="event.stopPropagation();pinNote(${n.id})" style="background:none;border:1px solid var(--b);border-radius:4px;padding:3px 6px;cursor:pointer;font-size:11px">${n.pinned?'📌':'📍'}</button>
        <button onclick="event.stopPropagation();openNoteModal(${n.id})" style="background:none;border:1px solid var(--b);border-radius:4px;padding:3px 6px;cursor:pointer;font-size:11px">✏️</button>
        <button onclick="event.stopPropagation();delNote(${n.id})" style="background:var(--rdb);border:none;border-radius:4px;padding:3px 6px;cursor:pointer;font-size:11px;color:var(--rdt)">🗑</button>
      </div>
    </div>`;
  };

  // DocumentFragment ile oluştur
  const wrapper = document.createElement('div');
  if (NOTE_VIEW === 'grid') {
    wrapper.className = 'noteg';
    wrapper.innerHTML = sorted.map(mkCard).join('');
  } else {
    wrapper.innerHTML = sorted.map(mkLi).join('');
  }
  cont.replaceChildren(wrapper);
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — ACİL REHBER
// Namespace: renderRehber, saveRehber, delRehber
// ════════════════════════════════════════════════════════════════

const RHCATS = {
  altin   : '🥇 Altın',    banka   : '🏦 Banka',
  lojistik: '🚚 Lojistik', gumruk  : '📦 Gümrük',
  muhasebe: '📊 Muhasebe', hukuk   : '⚖️ Hukuk',
  diger   : '📌 Diğer',
};

function openRehberModal(id) {
  if (id) {
    const e = loadRehber().find(x => x.id === id); if (!e) return;
    if (_gh('rh-name'))   _gh('rh-name').value   = e.name;
    if (_gh('rh-cat'))    _gh('rh-cat').value     = e.cat;
    if (_gh('rh-phone'))  _gh('rh-phone').value   = e.phone;
    if (_gh('rh-contact'))_gh('rh-contact').value = e.contact;
    if (_gh('rh-email'))  _gh('rh-email').value   = e.email;
    if (_gh('rh-note'))   _gh('rh-note').value    = e.note;
    if (_gh('rh-eid'))    _gh('rh-eid').value     = id;
    _sth('mo-rh-t', '✏️ Kişi Düzenle');
  } else {
    ['rh-name','rh-phone','rh-contact','rh-email','rh-note'].forEach(i => { const el = _gh(i); if (el) el.value = ''; });
    if (_gh('rh-eid')) _gh('rh-eid').value = '';
    _sth('mo-rh-t', '+ Kişi/Firma Ekle');
  }
  window.openMo?.('mo-rehber');
}

function saveRehber() {
  const name = (_gh('rh-name')?.value || '').trim();
  if (!name) { window.toast?.('İsim zorunludur', 'err'); return; }
  const d   = loadRehber();
  const eid = parseInt(_gh('rh-eid')?.value || '0');
  const entry = {
    name, cat: _gh('rh-cat')?.value || 'diger',
    phone:   (_gh('rh-phone')?.value   || '').trim(),
    contact: (_gh('rh-contact')?.value || '').trim(),
    email:   (_gh('rh-email')?.value   || '').trim(),
    note:    (_gh('rh-note')?.value    || '').trim(),
  };
  if (eid) { const e = d.find(x => x.id === eid); if (e) Object.assign(e, entry); }
  else d.push({id: generateNumericId(), ...entry});
  storeRehber(d);
  window.closeMo?.('mo-rehber');
  renderRehber();
  window.logActivity?.('view', `rehbere "${name}" kaydı ekledi`);
  window.toast?.(name + ' kaydedildi ✓', 'ok');
}

function delRehber(id) {
  if (!_isAdminH()) { window.toast?.('Yetki yok', 'err'); return; }
  window.confirmModal('Bu kaydı silmek istediğinizden emin misiniz?', {
    title: 'Rehber Kaydı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeRehber(loadRehber().filter(x => x.id !== id));
      renderRehber();
      window.toast?.('Silindi', 'ok');
    }
  });
}

// ── Render — DocumentFragment ────────────────────────────────────
function renderRehber() {
  const search = (_gh('rehber-search')?.value || '').toLowerCase();
  const catF   = _gh('rehber-cat-f')?.value  || '';
  let list     = loadRehber();
  if (search) list = list.filter(e => e.name.toLowerCase().includes(search) || e.phone.includes(search) || (e.contact||'').toLowerCase().includes(search));
  if (catF)   list = list.filter(e => e.cat === catF);
  const cont = _gh('rehber-list'); if (!cont) return;
  if (!list.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">📒</div>Kayıt bulunamadı.</div>`;
    return;
  }

  // DocumentFragment
  const frag = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px';
  list.forEach(e => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:var(--r);padding:16px;box-shadow:var(--sh)';
    card.innerHTML = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-weight:600;font-size:14px">${e.name}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">${RHCATS[e.cat]||e.cat}${e.contact?' · '+e.contact:''}</div>
        </div>
        <div style="display:flex;gap:4px">
          ${_isAdminH()?`<button class="btn btns" onclick="openRehberModal(${e.id})">✏️</button><button class="btn btns btnd" onclick="delRehber(${e.id})">🗑</button>`:''}
        </div>
      </div>
      ${e.phone?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><a href="tel:${e.phone}" class="btn btns btnp" style="text-decoration:none">📞 ${e.phone}</a></div>`:''}
      ${e.email?`<div style="font-size:12px;color:var(--t2);margin-bottom:4px">✉️ <a href="mailto:${e.email}" style="color:var(--ac)">${e.email}</a></div>`:''}
      ${e.note?`<div style="font-size:11px;color:var(--t3);margin-top:6px;padding-top:6px;border-top:1px solid var(--b)">📝 ${e.note}</div>`:''}`;
    grid.appendChild(card);
  });
  frag.appendChild(grid);
  cont.replaceChildren(frag);
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — TEBLİGAT TAKİBİ
// Namespace: renderTebligat, saveTebligat, checkTebligatAlarms
// ════════════════════════════════════════════════════════════════

const TEB_CATS = {
  mahkeme :'⚖️ Mahkeme/Yargı', vergi   :'🏛️ Vergi/Maliye',
  sgk     :'🏥 SGK',           icra    :'💼 İcra',
  belediye:'🏛️ Belediye',      diger   :'📌 Diğer',
};
const TEB_BOLUMLER = {
  muhasebe:'📊 Muhasebe', hukuk:'⚖️ Hukuk',
  ik      :'👥 İK',       yonetim:'🏛️ Yönetim',
  it      :'💻 IT',       diger:'📌 Diğer',
};

function openTebModal(id) {
  const users = loadUsers();
  const sel   = _gh('teb-sorumlu');
  if (sel) sel.innerHTML = users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  if (id) {
    const e = loadTebligat().find(x => x.id === id); if (!e) return;
    if (_gh('teb-title'))    _gh('teb-title').value    = e.title;
    if (_gh('teb-cat'))      _gh('teb-cat').value      = e.cat;
    if (_gh('teb-date'))     _gh('teb-date').value     = e.date;
    if (_gh('teb-deadline')) _gh('teb-deadline').value = e.deadline || '';
    if (_gh('teb-bolum'))    _gh('teb-bolum').value    = e.bolum || 'muhasebe';
    if (_gh('teb-kaynak'))   _gh('teb-kaynak').value   = e.kaynak || '';
    if (sel)                 sel.value                 = e.sorumluid;
    if (_gh('teb-desc'))     _gh('teb-desc').value     = e.desc || '';
    if (_gh('teb-eid'))      _gh('teb-eid').value      = id;
    _sth('mo-teb-t', '✏️ Tebligat Düzenle');
  } else {
    ['teb-title','teb-deadline','teb-kaynak','teb-desc'].forEach(i => { const el = _gh(i); if (el) el.value = ''; });
    if (_gh('teb-date'))  _gh('teb-date').valueAsDate = new Date();
    if (_gh('teb-cat'))   _gh('teb-cat').value  = 'diger';
    if (_gh('teb-bolum')) _gh('teb-bolum').value = 'muhasebe';
    if (_gh('teb-eid'))   _gh('teb-eid').value   = '';
    _sth('mo-teb-t', '+ Tebligat Kaydı');
  }
  window.openMo?.('mo-tebligat');
}

function saveTebligat() {
  const title = (_gh('teb-title')?.value || '').trim();
  if (!title) { window.toast?.('Konu/başlık zorunludur', 'err'); return; }
  if (_gh('teb-date') && !_gh('teb-date').value) _gh('teb-date').valueAsDate = new Date();
  const date       = _gh('teb-date')?.value || new Date().toISOString().slice(0, 10);
  const sorumluid  = parseInt(_gh('teb-sorumlu')?.value || '0');
  const d          = loadTebligat();
  const eid        = parseInt(_gh('teb-eid')?.value || '0');
  const fi         = _gh('teb-file');
  const cu         = _CUh();
  const entry = {
    title,
    cat:      _gh('teb-cat')?.value      || 'diger',
    date,
    deadline: _gh('teb-deadline')?.value || '',
    bolum:    _gh('teb-bolum')?.value    || 'diger',
    kaynak:   _gh('teb-kaynak')?.value   || '',
    sorumluid,
    desc:     _gh('teb-desc')?.value     || '',
    status:   'open', asamalar: [],
    addedBy: cu?.id, addedByName: cu?.name, ts: _nowTsh(),
  };
  const save2 = fd => {
    if (fd) entry.file = fd;
    if (eid) {
      if (!_isAdminH()) { window.toast?.('Değişiklik için admin onayı gereklidir', 'err'); return; }
      const e = d.find(x => x.id === eid); if (e) Object.assign(e, entry);
    } else { d.push({id: generateNumericId(), ...entry}); }
    storeTebligat(d);
    window.closeMo?.('mo-tebligat');
    renderTebligat();
    const users = loadUsers();
    const u = users.find(x => x.id === sorumluid) || {name: 'Atanmadı'};
    window.addNotif?.('📬', `Yeni tebligat: "${title}" — Sorumlu: ${u.name}`, 'warn', 'tebligat');
    window.logActivity?.('view', `Tebligat kaydedildi: "${title}"`);
    window.toast?.('Tebligat kaydedildi ✓', 'ok');
  };
  if (fi?.files?.[0]) { const r = new FileReader(); r.onload = e => save2({name: fi.files[0].name, data: e.target.result}); r.readAsDataURL(fi.files[0]); }
  else save2(null);
}

function openTebAsamaModal(tebId) {
  if (_gh('teb-asama-teb-id'))  _gh('teb-asama-teb-id').value  = tebId;
  if (_gh('teb-asama-desc'))    _gh('teb-asama-desc').value    = '';
  if (_gh('teb-asama-date'))    _gh('teb-asama-date').valueAsDate = new Date();
  if (_gh('teb-asama-status'))  _gh('teb-asama-status').value  = '';
  const teb = loadTebligat().find(x => x.id === tebId);
  _sth('teb-asama-title-info', teb ? `"${teb.title}" için yeni aşama` : '');
  window.openMo?.('mo-teb-asama');
}

function saveTebAsama() {
  const tebId = parseInt(_gh('teb-asama-teb-id')?.value || '0'); if (!tebId) return;
  const desc  = (_gh('teb-asama-desc')?.value || '').trim();
  if (!desc) { window.toast?.('Aşama açıklaması zorunludur', 'err'); return; }
  const cu        = _CUh();
  const newStatus = _gh('teb-asama-status')?.value || '';
  const fi        = _gh('teb-asama-file');
  const asama = {
    id: generateNumericId(), desc,
    date: _gh('teb-asama-date')?.value || '',
    addedBy: cu?.id, addedByName: cu?.name,
    ts: _nowTsh(), statusChange: newStatus || null,
    pendingApproval: !_isAdminH(),
  };
  const save2 = fd => {
    if (fd) asama.file = fd;
    const d   = loadTebligat();
    const teb = d.find(x => x.id === tebId); if (!teb) return;
    if (!_isAdminH()) {
      if (!teb.pendingAsamalar) teb.pendingAsamalar = [];
      teb.pendingAsamalar.push(asama);
      storeTebligat(d);
      window.closeMo?.('mo-teb-asama');
      renderTebligat();
      window.addNotif?.('📋', `Tebligat aşaması onay bekliyor: "${teb.title}"`, 'warn', 'tebligat');
      window.toast?.('Aşama yönetici onayına gönderildi ✓', 'ok');
      return;
    }
    if (!teb.asamalar) teb.asamalar = [];
    teb.asamalar.push(asama);
    if (newStatus) teb.status = newStatus;
    storeTebligat(d);
    window.closeMo?.('mo-teb-asama');
    renderTebligat();
    window.toast?.('Aşama eklendi ✓', 'ok');
    window.logActivity?.('view', `"${teb.title}" tebligatına aşama eklendi`);
  };
  if (fi?.files?.[0]) { const r = new FileReader(); r.onload = e => save2({name: fi.files[0].name, data: e.target.result}); r.readAsDataURL(fi.files[0]); }
  else save2(null);
}

function approveTebAsama(tebId, asamaId) {
  if (!_isAdminH()) return;
  const cu = _CUh();
  const d  = loadTebligat(); const teb = d.find(x => x.id === tebId); if (!teb) return;
  const asama = (teb.pendingAsamalar || []).find(a => a.id === asamaId); if (!asama) return;
  if (!teb.asamalar) teb.asamalar = [];
  teb.asamalar.push({...asama, approved: true, approvedBy: cu?.id, approveTs: _nowTsh()});
  teb.pendingAsamalar = (teb.pendingAsamalar || []).filter(a => a.id !== asamaId);
  if (asama.statusChange) teb.status = asama.statusChange;
  storeTebligat(d); renderTebligat();
  window.toast?.('Aşama onaylandı ✓', 'ok');
}

function closeTebligat(id) {
  if (!_isAdminH()) { window.toast?.('Dosya kapatma admin yetkisi gerektirir', 'err'); return; }
  window.confirmModal('Bu tebligat dosyasını kapatmak istediğinizden emin misiniz?', {
    title: 'Tebligat Kapat',
    danger: true,
    confirmText: 'Evet, Kapat',
    onConfirm: () => {
      const cu = _CUh();
      const d  = loadTebligat(); const teb = d.find(x => x.id === id); if (!teb) return;
      teb.status = 'closed'; teb.closedAt = _nowTsh(); teb.closedBy = cu?.name;
      storeTebligat(d); renderTebligat();
      window.toast?.('Dosya kapatıldı ✓', 'ok');
      window.logActivity?.('view', `"${teb.title}" tebligat dosyası kapatıldı`);
    }
  });
}

function delTebligat(id) {
  if (!_isAdminH()) return;
  const d = loadTebligat(); const t = d.find(x => x.id === id); if (!t) return;
  window.confirmModal(`"${t.title}" silinsin mi?`, {
    title: 'Tebligat Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeTebligat(d.filter(x => x.id !== id));
      renderTebligat();
      window.toast?.('Silindi', 'ok');
    }
  });
}

function checkTebligatAlarms() {
  const d      = loadTebligat().filter(t => t.status === 'open');
  const todayS = new Date().toISOString().slice(0, 10);
  const today  = new Date();
  d.forEach(t => {
    const daysSince = Math.floor((today - new Date(t.date)) / 86400000);
    if (daysSince >= 3 && !t.alarmSent3) {
      t.alarmSent3 = true;
      window.addNotif?.('🚨', `TEBLİGAT ALARM: "${t.title}" ${daysSince} gündür bekliyor! (${TEB_CATS[t.cat]||t.cat})`, 'warn', 'tebligat');
    }
    if (t.deadline && t.deadline <= todayS && !t.deadlineAlarm) {
      t.deadlineAlarm = true;
      window.addNotif?.('⏰', `Tebligat hedef tarihi geçti: "${t.title}" (${t.deadline})`, 'warn', 'tebligat');
    }
  });
  storeTebligat([...d, ...loadTebligat().filter(t => t.status !== 'open')]);
}

// ── Render — DocumentFragment ────────────────────────────────────
function renderTebligat() {
  const d      = loadTebligat();
  const users  = loadUsers();
  const todayS = new Date().toISOString().slice(0, 10);
  const today  = new Date();
  const alarmData = d.filter(t => {
    if (t.status !== 'open') return false;
    return Math.floor((today - new Date(t.date)) / 86400000) >= 3;
  });
  _sth('teb-total',  d.length);
  _sth('teb-alarm',  alarmData.length);
  _sth('teb-open',   d.filter(t => t.status === 'open').length);
  _sth('teb-closed', d.filter(t => t.status === 'closed').length);
  const nb = _gh('nb-teb-b'); if (nb) nb.style.display = alarmData.length > 0 ? 'inline' : 'none';

  // Alarm bar
  const alBar = _gh('teb-alarm-bar');
  if (alBar) {
    if (alarmData.length) {
      alBar.innerHTML = `<div style="background:var(--rdb);border-radius:var(--rs);padding:10px 14px;margin-bottom:4px">
        <div style="font-size:12px;font-weight:700;color:var(--rdt);margin-bottom:6px">🚨 ${alarmData.length} tebligat 3+ gündür açık — işlem gerekiyor!</div>
        ${alarmData.slice(0, 3).map(t => {
          const days = Math.floor((today - new Date(t.date)) / 86400000);
          return `<div style="font-size:12px;color:var(--rdt);margin-bottom:3px">• "${t.title}" — ${days} gün (${TEB_CATS[t.cat]||t.cat})</div>`;
        }).join('')}
      </div>`;
    } else { alBar.innerHTML = ''; }
  }

  // Filtreler
  const sf     = _gh('teb-status-f')?.value || '';
  const cf     = _gh('teb-cat-f')?.value    || '';
  const search = (_gh('teb-search')?.value  || '').toLowerCase();
  let fl = d;
  if (sf === 'alarm') fl = fl.filter(t => { const days = Math.floor((today - new Date(t.date)) / 86400000); return t.status === 'open' && days >= 3; });
  else if (sf)        fl = fl.filter(t => t.status === sf);
  if (cf)             fl = fl.filter(t => t.cat === cf);
  if (search)         fl = fl.filter(t => t.title.toLowerCase().includes(search) || (t.kaynak||'').toLowerCase().includes(search));

  const list = _gh('tebligat-list'); if (!list) return;
  if (!fl.length) {
    list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:8px">📬</div>Tebligat bulunamadı.</div>`;
    return;
  }

  // DocumentFragment
  const frag = document.createDocumentFragment();
  fl.forEach(t => {
    const u          = users.find(x => x.id === t.sorumluid) || {name: '?'};
    const daysSince  = Math.floor((today - new Date(t.date)) / 86400000);
    const isAlarm    = t.status === 'open' && daysSince >= 3;
    const isClosed   = t.status === 'closed';
    const asamaCnt   = (t.asamalar || []).length;
    const pendingCnt = (t.pendingAsamalar || []).length;

    const card = document.createElement('div');
    card.style.cssText = `border:2px solid ${isAlarm?'var(--rd)':isClosed?'var(--bm)':'var(--b)'};border-radius:var(--r);padding:16px 18px;margin-bottom:12px;background:${isAlarm?'var(--rdb)':'var(--sf)'}`;
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:14px">${t.title}</span>
            <span class="badge ${isClosed?'bg':isAlarm?'br':'ba'}">${isClosed?'✅ Kapalı':isAlarm?'🚨 Alarm':'📂 Açık'}</span>
            <span style="font-size:11px;background:var(--s2);padding:2px 8px;border-radius:99px;color:var(--t2)">${TEB_CATS[t.cat]||t.cat}</span>
            <span style="font-size:11px;background:var(--s2);padding:2px 8px;border-radius:99px;color:var(--t2)">${TEB_BOLUMLER[t.bolum]||t.bolum}</span>
          </div>
          <div style="font-size:12px;color:var(--t2);margin-bottom:4px">📍 ${t.kaynak||'—'} · 👤 ${u.name} · 📅 ${t.date}${isAlarm?` <strong style="color:var(--rd)">(${daysSince} gün açık!)</strong>`:''}</div>
          ${t.deadline?`<div style="font-size:11px;color:${t.deadline<todayS?'var(--rd)':'var(--t2)'};margin-bottom:4px">⏰ Hedef: ${t.deadline}${t.deadline<todayS?' ⚠ Geçti!':''}</div>`:''}
          <div style="font-size:12px;color:var(--t2)">${t.desc||''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
          ${t.file?`<a href="${t.file.data}" download="${t.file.name}" class="btn btns" style="text-decoration:none;font-size:11px">⬇ Belge</a>`:''}
          ${!isClosed?`<button class="btn btns" onclick="openTebAsamaModal(${t.id})" style="font-size:11px">+ Aşama</button>`:''}
          ${!isClosed&&_isAdminH()?`<button class="btn btns btng" onclick="closeTebligat(${t.id})" style="font-size:11px">✓ Kapat</button>`:''}
          <button class="btn btns" onclick="openTebModal(${t.id})" style="font-size:11px">✏️</button>
          ${_isAdminH()?`<button class="btn btns btnd" onclick="delTebligat(${t.id})" style="font-size:11px">🗑</button>`:''}
        </div>
      </div>
      ${asamaCnt > 0 || pendingCnt > 0 ? `<div style="border-top:1px solid var(--b);padding-top:10px;margin-top:6px">
        <div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Aşamalar (${asamaCnt} kayıt${pendingCnt>0?' · '+pendingCnt+' onay bekliyor':''})</div>
        ${(t.asamalar||[]).map(a=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:12px"><div style="width:6px;height:6px;border-radius:50%;background:var(--gr);flex-shrink:0;margin-top:5px"></div><div><div>${a.desc}</div><div style="font-size:10px;color:var(--t3);margin-top:2px">${a.addedByName} · ${(a.ts||'').slice(0,16)}</div></div></div>`).join('')}
        ${(t.pendingAsamalar||[]).map(a=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px dashed var(--bm);font-size:12px;opacity:.75"><div style="width:6px;height:6px;border-radius:50%;background:var(--am);flex-shrink:0;margin-top:5px"></div><div style="flex:1"><div>${a.desc} <span style="font-size:10px;color:var(--amt)">(Onay bekliyor)</span></div><div style="font-size:10px;color:var(--t3)">${a.addedByName} · ${(a.ts||'').slice(0,16)}</div></div>${_isAdminH()?`<button class="btn btns btng" onclick="approveTebAsama(${t.id},${a.id})" style="font-size:10px;padding:2px 8px">Onayla</button>`:''}</div>`).join('')}
      </div>` : ''}`;
    frag.appendChild(card);
  });
  list.replaceChildren(frag);
}

function exportTebXlsx() {
  if (typeof XLSX === 'undefined') return;
  const users = loadUsers();
  const rows  = loadTebligat().map(t => {
    const u = users.find(x => x.id === t.sorumluid) || {name: '?'};
    return {Konu: t.title, Kategori: TEB_CATS[t.cat]||t.cat, Bölüm: TEB_BOLUMLER[t.bolum]||t.bolum, Kaynak: t.kaynak||'', 'Geliş Tarihi': t.date, Hedef: t.deadline||'—', Sorumlu: u.name, Durum: t.status === 'open' ? 'Açık' : t.status === 'closed' ? 'Kapalı' : 'Diğer', 'Aşama Sayısı': (t.asamalar||[]).length};
  });
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tebligat');
  XLSX.writeFile(wb, `Tebligat_${_nowTsh().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — HEDEFLER
// Namespace: renderHedefler, saveHdf, addHdfStep, approveHdf
// ════════════════════════════════════════════════════════════════

const HDF_STATUS = {
  planned : {l:'📋 Planlandı',      c:'bb'},
  progress: {l:'🔄 Devam Ediyor',   c:'ba'},
  done    : {l:'✅ Tamamlandı',     c:'bg'},
};

let HDF_STEPS_TEMP = [];

// ── Adım editörü ─────────────────────────────────────────────────
function addHdfStep() {
  HDF_STEPS_TEMP.push({id: generateNumericId(), text: '', done: false, substeps: []});
  renderHdfStepsEditor();
}

function addHdfSubstep(stepId) {
  const step = HDF_STEPS_TEMP.find(s => s.id === stepId); if (!step) return;
  step.substeps.push({id: generateNumericId(), text: '', done: false});
  renderHdfStepsEditor();
}

function delHdfStep(stepId)             { HDF_STEPS_TEMP = HDF_STEPS_TEMP.filter(s => s.id !== stepId); renderHdfStepsEditor(); }
function delHdfSubstep(stepId, subId)   { const step = HDF_STEPS_TEMP.find(s => s.id === stepId); if (!step) return; step.substeps = step.substeps.filter(x => x.id !== subId); renderHdfStepsEditor(); }

function renderHdfStepsEditor() {
  const cont = _gh('hdf-steps-cont'); if (!cont) return;
  cont.innerHTML = HDF_STEPS_TEMP.map((s, i) => `
    <div style="background:var(--s2);border-radius:var(--rs);padding:10px 12px;border:1px solid var(--b)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;font-weight:600;color:var(--t2);flex-shrink:0">${i+1}.</span>
        <input class="fi" style="flex:1;padding:5px 8px;font-size:13px" placeholder="Aksiyon adımı…" value="${s.text||''}" oninput="HDF_STEPS_TEMP[${i}].text=this.value">
        <button type="button" onclick="delHdfStep(${s.id})" style="background:var(--rdb);border:none;border-radius:4px;padding:2px 6px;cursor:pointer;color:var(--rdt);font-size:11px;flex-shrink:0">✕</button>
      </div>
      ${s.substeps.map((sub, j) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding-left:16px">
          <span style="font-size:10px;color:var(--t3)">↳</span>
          <input class="fi" style="flex:1;padding:4px 8px;font-size:12px" placeholder="Etap…" value="${sub.text||''}" oninput="HDF_STEPS_TEMP[${i}].substeps[${j}].text=this.value">
          <button type="button" onclick="delHdfSubstep(${s.id},${sub.id})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:11px">✕</button>
        </div>`).join('')}
      <button type="button" onclick="addHdfSubstep(${s.id})" style="background:none;border:1px dashed var(--bm);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;color:var(--t2);margin-left:16px;margin-top:2px">+ Etap Ekle</button>
    </div>`).join('');
}

// ── CRUD ─────────────────────────────────────────────────────────
function openHdfModal(id) {
  const users = loadUsers();
  const sel   = _gh('hdf-user');
  if (sel) sel.innerHTML = '<option value="0">Tüm Şirket</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  const fuSel = _gh('hdf-filter-usr');
  if (fuSel) fuSel.innerHTML = '<option value="0">Tüm Personel</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  if (id) {
    const e = loadHdf().find(x => x.id === id); if (!e) return;
    if (_gh('hdf-title'))  _gh('hdf-title').value  = e.title;
    if (_gh('hdf-desc'))   _gh('hdf-desc').value   = e.desc;
    if (_gh('hdf-from'))   _gh('hdf-from').value   = e.from;
    if (_gh('hdf-to'))     _gh('hdf-to').value     = e.to;
    if (_gh('hdf-status')) _gh('hdf-status').value = e.status;
    if (sel)               sel.value               = e.uid || 0;
    if (_gh('hdf-eid'))    _gh('hdf-eid').value    = id;
    HDF_STEPS_TEMP = JSON.parse(JSON.stringify(e.steps || []));
    _sth('mo-hdf-t', '✏️ Hedef Düzenle');
  } else {
    ['hdf-title','hdf-desc','hdf-from','hdf-to'].forEach(i => { const el = _gh(i); if (el) el.value = ''; });
    if (_gh('hdf-status')) _gh('hdf-status').value = 'planned';
    if (_gh('hdf-eid'))    _gh('hdf-eid').value    = '';
    HDF_STEPS_TEMP = [];
    _sth('mo-hdf-t', '🎯 SMART Hedef Ekle');
  }
  renderHdfStepsEditor();
  window.openMo?.('mo-hdf');
}

function saveHdf() {
  const title = (_gh('hdf-title')?.value || '').trim();
  const to    = _gh('hdf-to')?.value || '';
  if (!title) { window.toast?.('Hedef başlığı zorunludur', 'err'); return; }
  if (!to)    { window.toast?.('Son tarih zorunludur', 'err'); return; }
  const cu  = _CUh();
  HDF_STEPS_TEMP = HDF_STEPS_TEMP.filter(s => s.text.trim());
  HDF_STEPS_TEMP.forEach(s => s.substeps = s.substeps.filter(x => x.text.trim()));
  const d   = loadHdf();
  const eid = parseInt(_gh('hdf-eid')?.value || '0');
  const entry = {
    title, desc: _gh('hdf-desc')?.value || '',
    from: _gh('hdf-from')?.value || '',
    to,
    status: _gh('hdf-status')?.value || 'planned',
    uid: parseInt(_gh('hdf-user')?.value || '0'),
    steps: JSON.parse(JSON.stringify(HDF_STEPS_TEMP)),
  };
  if (eid) {
    const e = d.find(x => x.id === eid);
    if (!_isAdminH()) {
      if (e) { e._pendingChange = {...entry, approvalStatus: 'pending', reqBy: cu?.id, reqByName: cu?.name, reqTs: _nowTsh(), isEdit: true}; }
      storeHdf(d); window.closeMo?.('mo-hdf'); renderHedefler();
      window.addNotif?.('🎯', `Hedef değişikliği onay bekliyor: "${title}"`, 'warn', 'hedefler');
      window.toast?.('Değişiklik yönetici onayına gönderildi ✓', 'ok'); return;
    }
    if (e) Object.assign(e, entry);
  } else {
    if (!_isAdminH()) {
      const pending = {id: generateNumericId(), ...entry, approvalStatus: 'pending', reqBy: cu?.id, reqByName: cu?.name, reqTs: _nowTsh()};
      d.push(pending); storeHdf(d); window.closeMo?.('mo-hdf'); renderHedefler();
      window.addNotif?.('🎯', `Yeni hedef onay bekliyor: "${title}"`, 'warn', 'hedefler');
      window.toast?.('Hedef yönetici onayına gönderildi ✓', 'ok'); return;
    }
    d.push({id: generateNumericId(), ...entry});
  }
  storeHdf(d); window.closeMo?.('mo-hdf'); renderHedefler();
  window.logActivity?.('view', `"${title}" hedefi kaydetti`);
  window.toast?.(title + ' kaydedildi ✓', 'ok');
}

function approveHdf(id) {
  if (!_isAdminH()) return;
  const cu = _CUh();
  const d  = loadHdf(); const h = d.find(x => x.id === id); if (!h) return;
  if (h._pendingChange) { Object.assign(h, h._pendingChange); delete h._pendingChange; }
  h.approvalStatus = 'approved'; h.approvedBy = cu?.id; h.approveTs = _nowTsh();
  storeHdf(d); renderHedefler();
  window.toast?.('Hedef onaylandı ✓', 'ok');
  window.logActivity?.('view', `"${h.title}" hedefini onayladı`);
}

function rejectHdf(id) {
  if (!_isAdminH()) return;
  const d = loadHdf(); const h = d.find(x => x.id === id); if (!h) return;
  h.approvalStatus = 'rejected'; h._pendingChange = null;
  storeHdf(d); renderHedefler(); window.toast?.('Hedef reddedildi', 'ok');
}

function toggleHdfStep(hid, sid) {
  const d = loadHdf(); const h = d.find(x => x.id === hid); if (!h) return;
  const s = h.steps.find(x => x.id === sid); if (s) s.done = !s.done;
  storeHdf(d); renderHedefler();
}

function toggleHdfSubstep(hid, sid, subid) {
  const d = loadHdf(); const h = d.find(x => x.id === hid); if (!h) return;
  const s = h.steps.find(x => x.id === sid); if (!s) return;
  const sub = s.substeps.find(x => x.id === subid); if (sub) sub.done = !sub.done;
  storeHdf(d); renderHedefler();
}

function delHdf(id) {
  if (!_isAdminH()) { window.toast?.('Yetki yok', 'err'); return; }
  const d = loadHdf(); const h = d.find(x => x.id === id); if (!h) return;
  window.confirmModal(`"${h.title}" silinsin mi?`, {
    title: 'Hedef Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeHdf(d.filter(x => x.id !== id));
      renderHedefler();
      window.toast?.('"' + h.title + '" silindi', 'ok');
    }
  });
}

function exportHdfXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const rows  = [];
  loadHdf().forEach(h => {
    const u = users.find(x => x.id === h.uid) || {name: 'Tüm Şirket'};
    rows.push({Başlık: h.title, Sorumlu: u.name, Başlangıç: h.from, Bitiş: h.to, Durum: HDF_STATUS[h.status]?.l || h.status, Açıklama: h.desc});
    (h.steps || []).forEach((s, i) => {
      rows.push({Başlık: '  ' + (i+1) + '. ' + s.text, Durum: s.done ? '✅' : '⬜'});
      (s.substeps || []).forEach(sub => rows.push({Başlık: '    ↳ ' + sub.text, Durum: sub.done ? '✅' : '⬜'}));
    });
  });
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hedefler');
  XLSX.writeFile(wb, `Hedefler_${_nowTsh().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}

// ── Render — DocumentFragment ────────────────────────────────────
function renderHedefler() {
  const cu     = _CUh();
  const fSt    = _gh('hdf-filter-st')?.value  || '';
  const fUsr   = parseInt(_gh('hdf-filter-usr')?.value || '0');
  const search = (_gh('hdf-search')?.value     || '').toLowerCase();
  const users  = loadUsers();
  const fuSel  = _gh('hdf-filter-usr');
  if (fuSel && fuSel.options.length <= 1)
    fuSel.innerHTML = '<option value="0">Tüm Personel</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  let hdfs = _isAdminH() ? loadHdf() : loadHdf().filter(h => h.uid === 0 || h.uid === cu?.id);
  if (fSt)    hdfs = hdfs.filter(h => h.status === fSt);
  if (fUsr)   hdfs = hdfs.filter(h => h.uid === fUsr);
  if (search) hdfs = hdfs.filter(h => h.title.toLowerCase().includes(search) || (h.desc||'').toLowerCase().includes(search));
  const todayS = new Date().toISOString().slice(0, 10);
  _sth('hdf-total',    hdfs.length);
  _sth('hdf-planned',  hdfs.filter(h => h.status === 'planned').length);
  _sth('hdf-progress', hdfs.filter(h => h.status === 'progress').length);
  _sth('hdf-done',     hdfs.filter(h => h.status === 'done').length);
  _sth('hdf-late',     hdfs.filter(h => h.to < todayS && h.status !== 'done').length);
  const nb = _gh('nb-hdf-b');
  if (nb) { const n = hdfs.filter(h => h.status === 'progress').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }
  const cont = _gh('hdf-list'); if (!cont) return;
  if (!hdfs.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:32px;margin-bottom:10px">🎯</div>Henüz hedef yok.</div>`;
    return;
  }

  // DocumentFragment
  const frag = document.createDocumentFragment();
  hdfs.forEach(h => {
    const st2     = HDF_STATUS[h.status] || HDF_STATUS.planned;
    const u       = users.find(x => x.id === h.uid) || {name: 'Tüm Şirket'};
    const od      = h.to && h.to < todayS && h.status !== 'done';
    const pct     = h.from && h.to
      ? Math.min(100, Math.max(0, Math.round((new Date(todayS) - new Date(h.from)) / (new Date(h.to) - new Date(h.from)) * 100)))
      : 0;
    const steps     = h.steps || [];
    const doneSteps = steps.filter(s => s.done).length;
    const canEdit   = _isAdminH() || h.uid === cu?.id;
    const card = document.createElement('div');
    card.className = 'card'; card.style.marginBottom = '14px';
    card.innerHTML = `<div style="padding:16px 20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-weight:600;font-size:15px;line-height:1.3">${h.title}${od?` <span style="color:var(--rd);font-size:11px">⚠ Gecikmiş</span>`:''}</div>
          <div style="font-size:12px;color:var(--t2);margin-top:4px">${h.desc||''}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;align-items:center">
          <span class="badge ${st2.c}">${st2.l}</span>
          ${canEdit?`<button class="btn btns" onclick="openHdfModal(${h.id})">✏️</button>`:''}
          ${_isAdminH()?`<button class="btn btns btnd" onclick="delHdf(${h.id})">🗑</button>`:''}
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--t2);margin-bottom:12px;flex-wrap:wrap">
        <span>👤 ${u.name}</span>
        <span>📅 ${h.from||'—'} → <strong style="color:${od?'var(--rd)':'var(--t2)'}">${h.to||'—'}</strong></span>
        ${steps.length?`<span>📋 ${doneSteps}/${steps.length} adım</span>`:''}
      </div>
      <div style="height:6px;background:var(--s2);border-radius:99px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;background:${h.status==='done'?'var(--gr)':h.status==='progress'?'var(--ac)':'var(--s3)'};width:${h.status==='done'?100:pct}%;transition:width .5s;border-radius:99px"></div>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:${steps.length?12:0}px;text-align:right">${h.status==='done'?'100':pct}% süre geçti</div>
      ${steps.length ? `<div style="border-top:1px solid var(--b);padding-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">🗂 Aksiyon Adımları</div>
        ${steps.map(s => `<div style="margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" ${s.done?'checked':''} onchange="toggleHdfStep(${h.id},${s.id})" style="accent-color:var(--ac);width:14px;height:14px;flex-shrink:0">
            <span style="font-size:13px;font-weight:500;${s.done?'text-decoration:line-through;color:var(--t3)':''}">${s.text}</span>
          </div>
          ${(s.substeps||[]).length ? `<div style="padding-left:22px;margin-top:4px">${(s.substeps||[]).map(sub=>`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <input type="checkbox" ${sub.done?'checked':''} onchange="toggleHdfSubstep(${h.id},${s.id},${sub.id})" style="accent-color:var(--am);width:12px;height:12px;flex-shrink:0">
              <span style="font-size:11px;color:var(--t2);${sub.done?'text-decoration:line-through;color:var(--t3)':''}">↳ ${sub.text}</span>
            </div>`).join('')}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}


// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — TEMİZLİK ROTİNLERİ
// Namespace: renderTemizlik, saveTemizlik, addSeciliRutinler
// ════════════════════════════════════════════════════════════════

// ── Hazır şablonlar ──────────────────────────────────────────────
const TMZ_RUTIN_SABLONLAR = [
  {title:'Sabah Ofis Hazırlığı',    area:'Genel Ofis',  period:'daily',   checklist:[{id:1,text:'Havalandırma / camları aç',done:false},{id:2,text:'Masaları toz al',done:false},{id:3,text:'Çöp kutularını kontrol et',done:false},{id:4,text:'Zemin süpürme',done:false},{id:5,text:'Ortak alanları düzenle',done:false}]},
  {title:'Akşam Kapanış Temizliği', area:'Genel Ofis',  period:'daily',   checklist:[{id:1,text:'Tüm çöpleri boşalt',done:false},{id:2,text:'Masaları topla',done:false},{id:3,text:'Bilgisayar ekranlarını kapat',done:false},{id:4,text:'Zemin ıslak silme',done:false},{id:5,text:'Kapı ve pencere kontrol',done:false}]},
  {title:'Mutfak Günlük Temizlik',  area:'Mutfak',      period:'daily',   checklist:[{id:1,text:'Bulaşıkları yıka',done:false},{id:2,text:'Tezgah ve ocağı sil',done:false},{id:3,text:'Çöpü çıkar',done:false},{id:4,text:'Buzdolabı ön kısmını sil',done:false}]},
  {title:'Tuvaletler Günlük',       area:'WC / Tuvalet',period:'daily',   checklist:[{id:1,text:'Klozet temizle',done:false},{id:2,text:'Lavabo ve ayna sil',done:false},{id:3,text:'Sabun / kağıt havlu doldur',done:false},{id:4,text:'Zemin paspas',done:false},{id:5,text:'Çöp kutusunu boşalt',done:false}]},
  {title:'Haftalık Derin Temizlik', area:'Genel Ofis',  period:'weekly',  checklist:[{id:1,text:'Tüm cam yüzeyleri sil',done:false},{id:2,text:'Klima filtrelerini kontrol et',done:false},{id:3,text:'Halı / mefruşatı elektrikli süpürgele',done:false},{id:4,text:'Dolap ve raf üstlerini temizle',done:false},{id:5,text:'Kapı kollarını dezenfekte et',done:false},{id:6,text:'Elektronik cihazları sil',done:false}]},
  {title:'Haftalık Mutfak Derin',   area:'Mutfak',      period:'weekly',  checklist:[{id:1,text:'Buzdolabını temizle',done:false},{id:2,text:'Mikrodalga içini sil',done:false},{id:3,text:'Dolap içlerini kontrol et',done:false},{id:4,text:'Tüm zemin temizliği',done:false}]},
  {title:'Aylık Genel Bakım',       area:'Bina Geneli', period:'monthly', checklist:[{id:1,text:'Klima filtresi değişimi / temizliği',done:false},{id:2,text:'Yangın tüplerini kontrol et',done:false},{id:3,text:'Acil çıkış yollarını kontrol et',done:false},{id:4,text:'Boya / çatlak kontrolü',done:false},{id:5,text:'Dış alan (otopark, bahçe) temizliği',done:false},{id:6,text:'Depo ve arşiv düzenlemesi',done:false}]},
];

let TMZ_ITEMS_TEMP = [];

// ── Checklist editörü ────────────────────────────────────────────
function addTmzItem() {
  TMZ_ITEMS_TEMP.push({id: generateNumericId(), text: '', done: false});
  renderTmzChecklist();
}

function renderTmzChecklist() {
  const cont = _gh('tmz-checklist-cont'); if (!cont) return;
  cont.innerHTML = TMZ_ITEMS_TEMP.map((item, i) =>
    `<div style="display:flex;align-items:center;gap:8px">
      <input class="fi" style="flex:1;padding:5px 8px;font-size:12px" value="${item.text}" placeholder="Kontrol maddesi…" oninput="TMZ_ITEMS_TEMP[${i}].text=this.value">
      <button type="button" onclick="TMZ_ITEMS_TEMP.splice(${i},1);renderTmzChecklist()" style="background:var(--rdb);border:none;border-radius:4px;padding:3px 7px;cursor:pointer;color:var(--rdt);font-size:11px">✕</button>
    </div>`).join('');
}

// ── Hazır şablon seçici ──────────────────────────────────────────
function openRutinSablon() {
  const existing = _gh('mo-tmz-rutin'); if (existing) existing.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-tmz-rutin';
  mo.innerHTML = `<div class="modal" style="max-width:600px">
    <div class="mt">🧹 Hazır Rutin Ekle</div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:16px">Aşağıdan hazır rutin şablonunu seçin ve personele atayın:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${TMZ_RUTIN_SABLONLAR.map((s, i) => `
        <label style="display:flex;align-items:center;gap:8px;background:var(--s2);border-radius:8px;padding:10px;cursor:pointer;border:2px solid transparent" onmouseenter="this.style.borderColor='var(--ac)'" onmouseleave="this.style.borderColor='transparent'">
          <input type="checkbox" id="rutin-sel-${i}" value="${i}" style="accent-color:var(--ac)">
          <div>
            <div style="font-size:13px;font-weight:600">${s.title}</div>
            <div style="font-size:10px;color:var(--t2)">${s.area} · ${{daily:'Günlük',weekly:'Haftalık',monthly:'Aylık'}[s.period]} · ${s.checklist.length} madde</div>
          </div>
        </label>`).join('')}
    </div>
    <div class="fr"><div class="fl">SORUMLU PERSONEL</div>
      <select class="fi" id="rutin-sorumlu">${loadUsers().map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}</select>
    </div>
    <div class="mf">
      <button class="btn" onclick="window.closeMo?.('mo-tmz-rutin')">İptal</button>
      <button class="btn btnp" onclick="addSeciliRutinler()">✓ Seçilenleri Ekle</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.classList.add('open');
  mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });
}

function addSeciliRutinler() {
  const uid = parseInt(_gh('rutin-sorumlu')?.value || '0');
  const d   = loadTemizlik();
  let added = 0;
  TMZ_RUTIN_SABLONLAR.forEach((s, i) => {
    if (_gh('rutin-sel-' + i)?.checked) {
      d.push({
        id: generateNumericId(), title: s.title, area: s.area,
        period: s.period, uid,
        checklist: s.checklist.map(c => ({...c, done: false})),
        start: new Date().toISOString().slice(0, 10),
        lastCheck: '', status: 'pending',
      });
      added++;
    }
  });
  storeTemizlik(d);
  window.closeMo?.('mo-tmz-rutin');
  const existing = _gh('mo-tmz-rutin'); if (existing) existing.remove();
  renderTemizlik();
  window.toast?.(`${added} rutin eklendi ✓`, 'ok');
}

// ── Modal ────────────────────────────────────────────────────────
function openTemizlikModal(id) {
  const users = loadUsers();
  const sel   = _gh('tmz-user');
  if (sel) sel.innerHTML = users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  if (id) {
    const e = loadTemizlik().find(x => x.id === id); if (!e) return;
    if (_gh('tmz-title'))      _gh('tmz-title').value      = e.title;
    if (_gh('tmz-area'))       _gh('tmz-area').value       = e.area;
    if (_gh('tmz-period'))     _gh('tmz-period').value     = e.period;
    if (sel)                   sel.value                   = e.uid;
    if (_gh('tmz-start'))      _gh('tmz-start').value      = e.start;
    if (_gh('tmz-last-check')) _gh('tmz-last-check').value = e.lastCheck || '';
    if (_gh('tmz-eid'))        _gh('tmz-eid').value        = id;
    TMZ_ITEMS_TEMP = JSON.parse(JSON.stringify(e.checklist || []));
    _sth('mo-tmz-t', '✏️ Görev Düzenle');
  } else {
    ['tmz-title','tmz-area'].forEach(i => { const el = _gh(i); if (el) el.value = ''; });
    if (_gh('tmz-period'))     _gh('tmz-period').value  = 'daily';
    if (_gh('tmz-start'))      _gh('tmz-start').valueAsDate = new Date();
    if (_gh('tmz-last-check')) _gh('tmz-last-check').value  = '';
    if (_gh('tmz-eid'))        _gh('tmz-eid').value     = '';
    TMZ_ITEMS_TEMP = [];
    _sth('mo-tmz-t', '+ Temizlik Görevi');
  }
  renderTmzChecklist();
  window.openMo?.('mo-temizlik');
}

// ── CRUD ─────────────────────────────────────────────────────────
function saveTemizlik() {
  const title = (_gh('tmz-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const d   = loadTemizlik();
  const eid = parseInt(_gh('tmz-eid')?.value || '0');
  const entry = {
    title, area: _gh('tmz-area')?.value || '',
    period: _gh('tmz-period')?.value || 'daily',
    uid:    parseInt(_gh('tmz-user')?.value || '0'),
    checklist: TMZ_ITEMS_TEMP.filter(x => x.text.trim()),
    start:    _gh('tmz-start')?.value     || '',
    lastCheck:_gh('tmz-last-check')?.value|| '',
    status: 'pending',
  };
  if (eid) { const e = d.find(x => x.id === eid); if (e) Object.assign(e, entry); }
  else d.push({id: generateNumericId(), ...entry});
  storeTemizlik(d);
  window.closeMo?.('mo-temizlik');
  renderTemizlik();
  window.logActivity?.('view', `"${title}" temizlik görevi kaydedildi`);
  window.toast?.(title + ' kaydedildi ✓', 'ok');
}

function toggleTmzItem(taskId, itemId) {
  const d = loadTemizlik(); const t = d.find(x => x.id === taskId); if (!t) return;
  const item = t.checklist.find(x => x.id === itemId);
  if (item) {
    item.done = !item.done;
    const allDone = t.checklist.every(x => x.done);
    if (allDone) { t.status = 'done'; t.lastCheck = new Date().toISOString().slice(0, 10); }
    else t.status = 'pending';
  }
  storeTemizlik(d); renderTemizlik();
}

function resetTmzChecklist(id) {
  const d = loadTemizlik(); const t = d.find(x => x.id === id); if (!t) return;
  t.checklist.forEach(x => x.done = false); t.status = 'pending';
  storeTemizlik(d); renderTemizlik(); window.toast?.('Liste sıfırlandı', 'ok');
}

function delTemizlik(id) {
  if (!_isAdminH()) return;
  storeTemizlik(loadTemizlik().filter(x => x.id !== id));
  renderTemizlik();
}

// ── Render — DocumentFragment ────────────────────────────────────
function renderTemizlik() {
  const cu     = _CUh();
  const users  = loadUsers();
  const pf     = _gh('tmz-period-f')?.value || '';
  const uf     = parseInt(_gh('tmz-user-f')?.value || '0');
  const af     = _gh('tmz-area-f')?.value   || '';

  // Alan filtresi dolduruluyor
  const asel = _gh('tmz-area-f');
  if (asel && asel.options.length <= 1) {
    [...new Set(loadTemizlik().map(t => t.area).filter(Boolean))].forEach(a => {
      const o = document.createElement('option'); o.value = a; o.textContent = a; asel.appendChild(o);
    });
  }
  const usel = _gh('tmz-user-f');
  if (usel && usel.options.length <= 1)
    usel.innerHTML = '<option value="0">Tüm Personel</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');

  let d = loadTemizlik();
  if (!_isAdminH()) d = d.filter(t => t.uid === cu?.id);
  if (pf) d = d.filter(t => t.period === pf);
  if (uf) d = d.filter(t => t.uid   === uf);
  if (af) d = d.filter(t => t.area  === af);

  const todayS = new Date().toISOString().slice(0, 10);
  const all    = loadTemizlik();
  _sth('tmz-total',   all.length);
  _sth('tmz-done',    all.filter(t => t.status === 'done').length);
  _sth('tmz-pending', all.filter(t => t.status === 'pending').length);
  _sth('tmz-late',    all.filter(t => t.status !== 'done' && t.lastCheck && t.period === 'daily' && t.lastCheck < todayS).length);
  const nb = _gh('nb-tmz-b');
  if (nb) { const n = all.filter(t => t.status === 'pending').length; nb.textContent = n; nb.style.display = n > 0 ? 'inline' : 'none'; }

  const cont = _gh('temizlik-list'); if (!cont) return;
  if (!d.length) { cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">Görev bulunamadı.</div>`; return; }

  const pMap = {daily:'Günlük', weekly:'Haftalık', monthly:'Aylık'};

  // DocumentFragment
  const frag = document.createDocumentFragment();
  d.forEach(t => {
    const u    = users.find(x => x.id === t.uid) || {name: '?'};
    const done = t.checklist.filter(x => x.done).length;
    const tot  = t.checklist.length;
    const pct  = tot ? Math.round(done / tot * 100) : 0;
    const card = document.createElement('div');
    card.className = 'card'; card.style.marginBottom = '12px';
    card.innerHTML = `<div style="padding:14px 18px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div>
          <div style="font-weight:600;font-size:14px">${t.title}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:3px">📍 ${t.area} · ${pMap[t.period]||t.period} · 👤 ${u.name}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          ${t.status==='done'?'<span class="badge bg">✅ Tamamlandı</span>':'<span class="badge ba">⏳ Bekliyor</span>'}
          ${(_isAdminH()||t.uid===cu?.id)?`<button class="btn btns" onclick="openTemizlikModal(${t.id})">✏️</button>`:''}
          ${_isAdminH()?`<button class="btn btns btnd" onclick="delTemizlik(${t.id})">🗑</button>`:''}
        </div>
      </div>
      <div style="height:4px;background:var(--s2);border-radius:99px;margin-bottom:8px;overflow:hidden">
        <div style="height:100%;background:${pct===100?'var(--gr)':'var(--ac)'};width:${pct}%;border-radius:99px"></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        ${t.checklist.map(item =>
          `<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:4px 10px;background:var(--s2);border-radius:99px;${item.done?'text-decoration:line-through;color:var(--t3)':''}">
            <input type="checkbox" ${item.done?'checked':''} onchange="toggleTmzItem(${t.id},${item.id})" style="accent-color:var(--gr)">${item.text}
          </label>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--t3)">
        <span>${done}/${tot} tamamlandı · Son: ${t.lastCheck||'—'}</span>
        ${t.status==='done'?`<button class="btn btns" onclick="resetTmzChecklist(${t.id})" style="font-size:10px">↺ Sıfırla</button>`:''}
      </div>
    </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function exportTemizlikXlsx() {
  if (typeof XLSX === 'undefined') return;
  const users = loadUsers();
  const rows  = loadTemizlik().map(t => {
    const u = users.find(x => x.id === t.uid) || {name: '?'};
    return {Görev: t.title, Alan: t.area, Periyot: t.period, Sorumlu: u.name, Durum: t.status === 'done' ? 'Tamamlandı' : 'Bekliyor', 'Son Kontrol': t.lastCheck||'—'};
  });
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Temizlik');
  XLSX.writeFile(wb, `Temizlik_${_nowTsh().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}


// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Helpers = {
  // Takvim
  renderCal, renderCalDebounced, renderCalWeek, renderCalAgenda,
  renderCalUpcoming, renderCalMonthStats, renderCalLegend,
  selCalDay, calNav, calNavToDay, calGoTo,
  setCalTypeFilter, invalidateCalCache,
  openEvModal, saveEvent, approveCalEvent, rejectCalEvent, delEvent,
  checkYaklasanTatiller, initTrYasalEvents, tatilDuyuruYap,
  exportCalXlsx,
  EVC, MONTHS, WDAYS, TR_TATILLER, TR_DINI_2026,
  // Notlar
  renderNotes, openNoteModal, saveNote, delNote, pinNote, viewNote,
  editNoteView, delNoteView, setNoteView, pickNtColor, ntFmt, renderNoteBody,
  NC, NCATS,
  // Rehber
  renderRehber, openRehberModal, saveRehber, delRehber,
  RHCATS,
  // Tebligat
  renderTebligat, openTebModal, saveTebligat,
  openTebAsamaModal, saveTebAsama, approveTebAsama,
  closeTebligat, delTebligat, checkTebligatAlarms, exportTebXlsx,
  TEB_CATS, TEB_BOLUMLER,
  // Hedefler
  renderHedefler, openHdfModal, saveHdf,
  addHdfStep, addHdfSubstep, delHdfStep, delHdfSubstep, renderHdfStepsEditor,
  approveHdf, rejectHdf, toggleHdfStep, toggleHdfSubstep, delHdf, exportHdfXlsx,
  HDF_STATUS,
  // Temizlik
  renderTemizlik, openTemizlikModal, saveTemizlik,
  addTmzItem, renderTmzChecklist, toggleTmzItem, resetTmzChecklist, delTemizlik,
  openRutinSablon, addSeciliRutinler, exportTemizlikXlsx,
  TMZ_RUTIN_SABLONLAR,
};


// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — HELPERS
// ════════════════════════════════════════════════════════════════

function renderOdmCalendar(){
  const cont=g('odm-calendar-view');if(!cont)return;
  const odms=loadOdm();const today=new Date();const year=today.getFullYear();const month=today.getMonth();
  const firstDay=new Date(year,month,1);const lastDay=new Date(year,month+1,0);
  const MONTHS_TR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  // Build calendar
  let sd=firstDay.getDay()-1;if(sd<0)sd=6;
  const days=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  let html2=`<div style="background:var(--sf);border:1px solid var(--b);border-radius:var(--r);padding:16px">
    <div style="font-size:15px;font-weight:600;margin-bottom:14px;text-align:center">${MONTHS_TR[month]} ${year} — Ödeme Takvimi</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">${days.map(d=>`<div style="text-align:center;font-size:10px;font-weight:600;color:var(--t3);padding:4px">${d}</div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
  for(let i=0;i<sd;i++)html2+=`<div style="min-height:60px"></div>`;
  for(let d=1;d<=lastDay.getDate();d++){
    const ds=`${year}-${p2(month+1)}-${p2(d)}`;
    const dayOdms=odms.filter(o=>o.date===ds);
    const isToday=today.getDate()===d;
    html2+=`<div style="min-height:60px;border:1px solid var(--b);border-radius:6px;padding:4px;background:${isToday?'var(--al)':dayOdms.length?'var(--s2)':'var(--sf)'};${isToday?'border-color:var(--ac)':''}">
      <div style="font-size:11px;font-weight:600;color:${isToday?'var(--ac)':'var(--t2)'};margin-bottom:2px">${d}</div>
      ${dayOdms.map(o=>`<div style="font-size:9px;padding:1px 4px;border-radius:3px;background:${o.status==='paid'?'var(--grb)':o.status==='overdue'?'var(--rdb)':'var(--amb)'};color:${o.status==='paid'?'var(--grt)':o.status==='overdue'?'var(--rdt)':'var(--amt)'};margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${o.title}: ${o.amount.toLocaleString('tr-TR')} TL">${o.title}</div>`).join('')}
    </div>`;
  }
  html2+=`</div></div>`;
  cont.innerHTML=html2;
}

function calcUserKpi(uid,range){
  const score={};
  const tasks=loadTasks();
  const puantaj=loadPuan();
  const pirim=loadPirim();
  const izin=loadIzin();
  const krg=loadKargo();
  const stok=loadStok();
  const crm=loadCrmData?loadCrmData():[];
  const grt=loadGrt();

  // 1. GÖREV SKORU (30 puan max)
  const myTasks=tasks.filter(t=>t.uid===uid&&inPeriod(t.due,range));
  const doneTasks=myTasks.filter(t=>t.done);
  const lateTasks=myTasks.filter(t=>!t.done&&t.due<range.end);
  const taskScore=myTasks.length>0?Math.round((doneTasks.length/myTasks.length)*30):null;
  score.task={value:taskScore,max:30,done:doneTasks.length,total:myTasks.length,late:lateTasks.length,
    label:'Görev Tamamlama',icon:'✅'};

  // 2. DEVAM SKORU (20 puan max) — puantaj
  const myPuan=puantaj.filter(p=>p.uid===uid&&inPeriod(p.date,range));
  const onTime=myPuan.filter(p=>p.ok).length;
  const pScore=myPuan.length>0?Math.round((onTime/myPuan.length)*20):null;
  score.attendance={value:pScore,max:20,onTime,total:myPuan.length,
    label:'Devam / Dakiklik',icon:'🕐'};

  // 3. PİRİM SKORU (25 puan max) — onaylı pirimler
  const myPirim=pirim.filter(p=>p.uid===uid&&p.status==='approved'&&inPeriod(p.date,range));
  const pirimAmt=myPirim.reduce((a,p)=>a+(p.amount||0),0);
  const pirimCount=myPirim.length;
  // Pirim başına 5 puan, max 25
  const pirimScore=Math.min(pirimCount*5,25);
  score.pirim={value:pirimScore,max:25,count:pirimCount,amount:pirimAmt,
    label:'Pirim Performansı',icon:'⭐'};

  // 4. İZİN SKORU (10 puan max) — mazeretsiz devamsızlık var mı?
  const myIzin=izin.filter(i=>i.uid===uid&&i.status==='approved'&&inPeriod(i.start,range));
  const mazeretsiz=myIzin.filter(i=>i.type==='mazeretsiz').reduce((a,i)=>a+(i.days||0),0);
  const izinScore=Math.max(0,10-mazeretsiz*3); // Her mazeretsiz gün 3 puan düşer
  score.izin={value:izinScore,max:10,mazeretsiz,
    label:'Devam Disiplini',icon:'📅'};

  // 5. KARGO/OPERASYoN SKORU (15 puan max) — kargo ekleyen personel
  const myKrg=krg.filter(k=>k.uid===uid&&inPeriod(k.date,range));
  const krgScore=Math.min(myKrg.length*3,15);
  score.kargo={value:krgScore,max:15,count:myKrg.length,
    label:'Operasyon Katkısı',icon:'📦'};

  // Toplam ham skor
  const vals=[score.task.value,score.attendance.value,score.pirim.value,score.izin.value,score.kargo.value]
    .filter(v=>v!==null);
  const total=vals.reduce((a,v)=>a+v,0);
  const maxPossible=100;
  score.total=total;
  score.maxPossible=maxPossible;
  score.pct=Math.round((total/maxPossible)*100);
  score.grade=total>=90?'A+':total>=80?'A':total>=70?'B+':total>=60?'B':total>=50?'C':'D';
  score.gradeColor=total>=80?'var(--gr)':total>=60?'var(--am)':'var(--rd)';

  return score;
}

function calcAllKpiScores(){
  const range=getKpiPeriodRange();
  const users=loadUsers().filter(u=>u.status==='active');
  const uidF=parseInt(g('kpi-user-sel')?.value||'0');
  const filtered=uidF?users.filter(u=>u.id===uidF):users;
  return filtered.map(u=>({user:u,scores:calcUserKpi(u.id,range),range}))
    .sort((a,b)=>b.scores.total-a.scores.total);
}

function addGrtNote(id){
  const note=g('grt-note-input-'+id)?.value.trim();
  if(!note){toast('Not boş olamaz','err');return;}
  const shareWith=[];
  document.querySelectorAll('[id^="grt-share-'+id+'-"]:checked').forEach(cb=>{
    shareWith.push(parseInt(cb.value));
  });
  const d=loadGrt();const e=d.find(x=>x.id===id);if(!e)return;
  if(!e.adminNotes)e.adminNotes=[];
  e.adminNotes.push({id:generateNumericId(),text:note,by:CU.id,byName:CU.name,ts:nowTs(),sharedWith:shareWith});
  storeGrt(d);renderGorusme();
  toast('Not kaydedildi ✓'+(shareWith.length?' — '+shareWith.length+' kişiyle paylaşıldı':''),'ok');
}

function startNoteAutosave(){
  clearInterval(NOTE_AUTOSAVE_TIMER);
  NOTE_AUTOSAVE_TIMER=setInterval(()=>{
    const body=g('nt-body');const title=g('nt-title');
    if(title?.value&&body?.value){
      localStorage.setItem('ak_note_draft',JSON.stringify({title:title.value,body:body.value,ts:nowTs()}));
    }
  },30000);
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = Helpers;
} else {
  window.Helpers = Helpers;
  // V18 eklenen fonksiyonlar
  window.renderOdmCalendar  = renderOdmCalendar;
  window.calcUserKpi        = window.calcUserKpi || calcUserKpi;
  window.calcAllKpiScores   = calcAllKpiScores;
  window.addGrtNote         = addGrtNote;
  window.startNoteAutosave  = startNoteAutosave;

  // Geriye uyumluluk — tüm fonksiyonlar window.* üzerinden erişilebilir
  const FNS = [
    'renderCal','renderCalDebounced','renderCalWeek','renderCalAgenda',
    'renderCalUpcoming','renderCalMonthStats','renderCalLegend',
    'selCalDay','calNav','calNavToDay','calGoTo',
    'setCalView','setCalTypeFilter','invalidateCalCache',
    'openEvModal','saveEvent','approveCalEvent','rejectCalEvent','delEvent',
    'checkYaklasanTatiller','initTrYasalEvents','tatilDuyuruYap','exportCalXlsx','openTatilUyariModal','tatilUyariAtla','tatilUyariAtlaVeHatirlatma','tatilUyariOnayla','openEvModal','saveCalForm','calRecurFreqChange','checkScheduledAnnouncements','visEvsForDay','_expandRecurring','delEventWithOption','_delOneOccurrence','_delEntireSeries',
    'renderNotes','openNoteModal','saveNote','delNote','pinNote','viewNote',
    'editNoteView','delNoteView','setNoteView','pickNtColor','ntFmt','renderNoteBody',
    'renderRehber','openRehberModal','saveRehber','delRehber',
    'renderTebligat','openTebModal','saveTebligat',
    'openTebAsamaModal','saveTebAsama','approveTebAsama',
    'closeTebligat','delTebligat','checkTebligatAlarms','exportTebXlsx',
    'renderHedefler','openHdfModal','saveHdf',
    'addHdfStep','addHdfSubstep','delHdfStep','delHdfSubstep','renderHdfStepsEditor',
    'approveHdf','rejectHdf','toggleHdfStep','toggleHdfSubstep','delHdf','exportHdfXlsx',
    'renderTemizlik','openTemizlikModal','saveTemizlik',
    'addTmzItem','renderTmzChecklist','toggleTmzItem','resetTmzChecklist','delTemizlik',
    'openRutinSablon','addSeciliRutinler','exportTemizlikXlsx',
  ];
  FNS.forEach(name => { if (Helpers[name]) window[name] = Helpers[name]; });

  // Sabit nesneler
  window.EVC             = EVC;
  window.MONTHS          = MONTHS;
  window.WDAYS           = WDAYS;
  window.TR_TATILLER     = TR_TATILLER;
  window.TR_DINI_2026    = TR_DINI_2026;
  window.HDF_STATUS      = HDF_STATUS;
  window.HDF_STEPS_TEMP  = HDF_STEPS_TEMP;
  window.TMZ_ITEMS_TEMP  = TMZ_ITEMS_TEMP;
  window.TMZ_RUTIN_SABLONLAR = TMZ_RUTIN_SABLONLAR;
  window.TEB_CATS        = TEB_CATS;
  window.TEB_BOLUMLER    = TEB_BOLUMLER;
  window.NC              = NC;
  window.NCATS           = NCATS;
  window.RHCATS          = RHCATS;
  // Durum değişkenleri — diğer modüllerden de okunabilmeli
  Object.defineProperty(window, 'CAL_DATE',        {get:()=>CAL_DATE,        set:v=>CAL_DATE=v});
  Object.defineProperty(window, 'CAL_SEL',         {get:()=>CAL_SEL,         set:v=>CAL_SEL=v});
  Object.defineProperty(window, 'CAL_VIEW',        {get:()=>CAL_VIEW,        set:v=>CAL_VIEW=v});
  Object.defineProperty(window, 'CAL_TYPE_FILTER', {get:()=>CAL_TYPE_FILTER, set:v=>CAL_TYPE_FILTER=v});
  Object.defineProperty(window, 'NOTE_VIEW',       {get:()=>NOTE_VIEW,       set:v=>NOTE_VIEW=v});
  Object.defineProperty(window, 'VIEWING_NOTE',    {get:()=>VIEWING_NOTE,    set:v=>VIEWING_NOTE=v});
  Object.defineProperty(window, 'HDF_STEPS_TEMP',  {get:()=>HDF_STEPS_TEMP, set:v=>{HDF_STEPS_TEMP.length=0;HDF_STEPS_TEMP.push(...v);}});
  Object.defineProperty(window, 'TMZ_ITEMS_TEMP',  {get:()=>TMZ_ITEMS_TEMP, set:v=>{TMZ_ITEMS_TEMP.length=0;TMZ_ITEMS_TEMP.push(...v);}});
}

// ── Error boundary wrappers ─────────────────────────────────────
// error-boundary-wrap

(function() {
  const _orig_renderCal = window.renderCal || (typeof renderCal === 'function' ? renderCal : null);
  if (_orig_renderCal) {
    window.renderCal = function(...args) {
      try { return _orig_renderCal(...args); }
      catch(err) {
        console.error('[renderCal]', err);
        window.toast?.('Panel yüklenemedi: renderCal', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderTebligat = window.renderTebligat || (typeof renderTebligat === 'function' ? renderTebligat : null);
  if (_orig_renderTebligat) {
    window.renderTebligat = function(...args) {
      try { return _orig_renderTebligat(...args); }
      catch(err) {
        console.error('[renderTebligat]', err);
        window.toast?.('Panel yüklenemedi: renderTebligat', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderHedefler = window.renderHedefler || (typeof renderHedefler === 'function' ? renderHedefler : null);
  if (_orig_renderHedefler) {
    window.renderHedefler = function(...args) {
      try { return _orig_renderHedefler(...args); }
      catch(err) {
        console.error('[renderHedefler]', err);
        window.toast?.('Panel yüklenemedi: renderHedefler', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderRehber = window.renderRehber || (typeof renderRehber === 'function' ? renderRehber : null);
  if (_orig_renderRehber) {
    window.renderRehber = function(...args) {
      try { return _orig_renderRehber(...args); }
      catch(err) {
        console.error('[renderRehber]', err);
        window.toast?.('Panel yüklenemedi: renderRehber', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderNotes = window.renderNotes || (typeof renderNotes === 'function' ? renderNotes : null);
  if (_orig_renderNotes) {
    window.renderNotes = function(...args) {
      try { return _orig_renderNotes(...args); }
      catch(err) {
        console.error('[renderNotes]', err);
        window.toast?.('Panel yüklenemedi: renderNotes', 'err');
      }
    };
  }
})();
})();
