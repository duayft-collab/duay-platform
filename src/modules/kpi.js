/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/kpi.js  —  v8.1.0
 * KPI & Performans Paneli
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)
// loadTasks → window.loadTasks (database.js)
// closeMo → window.closeMo (app.js)

const _gk  = window.g;
const _stk = window.st;
const _nowTsk = window.nowTs;
const _isAdminK = window.isAdmin;
const _CUk      = window.CU;

const _KPI_AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

/** Geçerli ayın dönem stringini döndürür: "Nisan 2026" */
function _kpiCurrentPeriod() {
  const n = new Date();
  return _KPI_AY[n.getMonth()] + ' ' + n.getFullYear();
}

/** Dropdown için son 6 ay + gelecek 2 ay seçeneklerini üretir */
function _kpiBuildPeriodOptions() {
  const now = new Date();
  const opts = [];
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(_KPI_AY[d.getMonth()] + ' ' + d.getFullYear());
  }
  return opts;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 0 — OTOMATİK KPI SEED + ALARM
// ════════════════════════════════════════════════════════════════

const _KPI_SEED = [
  { sid:'kpi_satis',     title:'Aylık Satış',              unit:'₺',   target:500000, source:'satin_alma', auto:true },
  { sid:'kpi_ihracat',   title:'İhracat Dosyası Adedi',    unit:'Adet', target:4,     source:'ihracat',    auto:true },
  { sid:'kpi_tahsilat',  title:'Ortalama Tahsilat Süresi', unit:'Gün',  target:15,    source:'odemeler',   auto:true, dusukIyi:true },
  { sid:'kpi_musteri',   title:'Yeni Müşteri',             unit:'Adet', target:2,     source:'crm',        auto:true },
  { sid:'kpi_tedarik',   title:'Tedarik Süresi Ort.',      unit:'Gün',  target:14,    source:'satinalma',  auto:true, dusukIyi:true },
  { sid:'kpi_gecikme',   title:'Gecikmiş Teslimat Oranı',  unit:'%',    target:5,     source:'ihracat',    auto:true, dusukIyi:true },
];

/** Otomatik KPI'ların mevcut değerlerini hesapla */
function _kpiAutoCalc(sid) {
  try {
    if (sid === 'kpi_ihracat') {
      const d = typeof loadIhracatDosyalar === 'function' ? loadIhracatDosyalar() : (window.loadIhracatDosyalar?.() || []);
      return d.filter(function(x) { return !x.isDeleted; }).length;
    }
    if (sid === 'kpi_tedarik') {
      const d = typeof loadSatinalma === 'function' ? loadSatinalma() : (window.loadSatinalma?.() || []);
      return d.filter(function(x) { return !x.isDeleted; }).length;
    }
  } catch(e) { /* modül yüklenmemiş olabilir */ }
  return 0;
}

/** Mevcut dönem için otomatik KPI'ları ekle (yoksa) */
function _kpiEnsureAutoSeeds() {
  const d = loadKpi ? loadKpi() : [];
  const curP = _kpiCurrentPeriod();
  let changed = false;
  _KPI_SEED.forEach(function(seed) {
    const exists = d.some(function(k) { return k.sid === seed.sid && k.period === curP; });
    if (!exists) {
      d.unshift({
        id:       typeof generateNumericId === 'function' ? generateNumericId() : Date.now() + Math.random(),
        sid:      seed.sid,
        title:    seed.title,
        unit:     seed.unit,
        target:   seed.target,
        current:  _kpiAutoCalc(seed.sid),
        period:   curP,
        source:   seed.source,
        auto:     true,
        dusukIyi: seed.dusukIyi || false,
        alarm:    { warn: 50, critical: 30 },
        desc:     'Otomatik KPI — ' + seed.source,
        ts:       _nowTsk?.() || new Date().toISOString(),
        uid:      _CUk?.()?.id,
      });
      changed = true;
    }
  });
  if (changed) { storeKpi(d); }
  return d;
}

/** Alarm seviyesini hesapla */
function _kpiAlarmLevel(k) {
  if (!k.target || k.target <= 0) return 'ok';
  const pct = Math.round((k.current / k.target) * 100);
  const warn = k.alarm?.warn ?? 50;
  const crit = k.alarm?.critical ?? 30;
  if (k.dusukIyi) {
    // Düşük iyi: hedefin üstü kötü (örn: gecikme, süre)
    if (k.current > k.target * 1.5)  return 'critical';
    if (k.current > k.target)        return 'warn';
    return 'ok';
  }
  if (pct < crit) return 'critical';
  if (pct < warn) return 'warn';
  return 'ok';
}

function _kpiAlarmBadge(level) {
  if (level === 'critical') return '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FCEBEB;color:#DC2626;font-weight:700">🔴 Kritik</span>';
  if (level === 'warn')     return '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FAEEDA;color:#D97706;font-weight:700">🟠 Uyarı</span>';
  return '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#EAF3DE;color:#16A34A;font-weight:700">🟢 Hedefte</span>';
}

/** Önceki dönemin değerini bul */
function _kpiPrevValue(k, allItems) {
  if (!k.period) return null;
  const parts = k.period.split(' ');
  if (parts.length < 2) return null;
  const mIdx = _KPI_AY.indexOf(parts[0]);
  const yr   = parseInt(parts[1]);
  if (mIdx < 0 || isNaN(yr)) return null;
  const prev = mIdx === 0
    ? _KPI_AY[11] + ' ' + (yr - 1)
    : _KPI_AY[mIdx - 1] + ' ' + yr;
  const match = allItems.find(function(x) {
    return x.title === k.title && x.period === prev;
  });
  return match ? match.current : null;
}

function _kpiChangeBadge(current, prev) {
  if (prev === null || prev === undefined || prev === 0) return '';
  const chg = Math.round(((current - prev) / prev) * 100);
  if (chg === 0) return '<span style="font-size:10px;color:var(--t3)">→ 0%</span>';
  const up = chg > 0;
  return '<span style="font-size:10px;font-weight:700;color:' + (up ? '#16A34A' : '#DC2626') + '">' + (up ? '↑' : '↓') + Math.abs(chg) + '%</span>';
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML INJECT
// ════════════════════════════════════════════════════════════════

function _injectKpiPanel() {
  const panel = _gk('panel-kpi');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
      <div><div class="pht">📊 KPI & Performans</div><div class="phs">Temel performans göstergeleri ve hedef takibi</div></div>
      <div class="ur">
        <select class="si" id="kpi-period-f" onchange="renderKpiPanel()" style="max-width:160px">
          <option value="">Tüm Dönemler</option>
          ${_kpiBuildPeriodOptions().map(p => `<option value="${p}"${p === _kpiCurrentPeriod() ? ' selected' : ''}>${p}</option>`).join('')}
        </select>
        <input class="fi" id="kpi-ara" placeholder="KPI adı ara..." oninput="event.stopPropagation();window._kpiAra(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="max-width:160px;font-size:11px">
        <button class="btn btns" onclick="event.stopPropagation();window._kpiExport()" style="font-size:11px">XLSX</button>
        ${_isAdminK() ? `<button class="btn btns" onclick="_kpiDonemGuncelle()" style="font-size:11px" title="Eski dönem KPI'larını yeni döneme kopyala">🔄 Dönem Güncelle</button>` : ''}
        ${_isAdminK() ? `<button class="btn btnp" onclick="openKpiModal()">+ KPI Ekle</button>` : ''}
      </div>
    </div>

    <!-- Özet Kartlar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px;text-align:center">
        <div id="kpi-count"  style="font-size:22px;font-weight:700;color:var(--ac)">0</div>
        <div style="font-size:11px;color:var(--t3)">Toplam KPI</div>
      </div>
      <div class="card" style="padding:14px 16px;text-align:center">
        <div id="kpi-avg"    style="font-size:22px;font-weight:700;color:var(--grc)">%0</div>
        <div style="font-size:11px;color:var(--t3)">Ort. Gerçekleşme</div>
      </div>
      <div class="card" style="padding:14px 16px;text-align:center">
        <div id="kpi-green"  style="font-size:22px;font-weight:700;color:var(--grc)">0</div>
        <div style="font-size:11px;color:var(--t3)">Hedefin Üstünde</div>
      </div>
      <div class="card" style="padding:14px 16px;text-align:center">
        <div id="kpi-red"    style="font-size:22px;font-weight:700;color:var(--rdc)">0</div>
        <div style="font-size:11px;color:var(--t3)">Kritik Durum</div>
      </div>
    </div>

    <!-- KPI Kartları -->
    <div id="kpi-cards"></div>

    <!-- Personel Performans Tablosu (Admin) -->
    <div id="kpi-personnel-section" style="margin-top:16px"></div>

    <!-- ── MODAL: KPI Ekle/Düzenle ── -->
    <div class="mo" id="mo-kpi" role="dialog" aria-modal="true" aria-labelledby="mo-kpi-t">
      <div class="moc" style="max-width:480px">
        <div class="moh">
          <span class="mot" id="mo-kpi-t">+ KPI Ekle</span>
          <button class="mcl" onclick="closeMo('mo-kpi')" aria-label="Kapat">✕</button>
        </div>
        <div class="mob">
          <input type="hidden" id="kpi-eid">
          <div class="fg">
            <label class="fl">KPI Başlığı</label>
            <input class="fi" id="kpi-title" placeholder="Örn: Aylık Satış Hedefi" maxlength="100">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Mevcut Değer</label>
              <input class="fi" type="number" id="kpi-current" placeholder="0">
            </div>
            <div class="fg">
              <label class="fl">Hedef Değer</label>
              <input class="fi" type="number" id="kpi-target" placeholder="100">
            </div>
            <div class="fg">
              <label class="fl">Birim</label>
              <input class="fi" id="kpi-unit" placeholder="₺ / % / adet" maxlength="20">
            </div>
          </div>
          <div class="fg">
            <label class="fl">Dönem</label>
            <input class="fi" id="kpi-period" placeholder="Mart 2026" maxlength="40">
          </div>
          <div class="fg">
            <label class="fl">Açıklama</label>
            <textarea class="fi" id="kpi-desc" rows="2" style="resize:vertical" placeholder="İsteğe bağlı..."></textarea>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-kpi')">İptal</button>
          <button class="btn btnp" onclick="saveKpi()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════

function renderKpiPanel() {
  _injectKpiPanel();
  _kpiEnsureAutoSeeds();
  // Auto KPI'ların current değerlerini güncelle
  const _autoD = loadKpi ? loadKpi() : [];
  let _autoChanged = false;
  _autoD.forEach(function(k) {
    if (k.auto && k.sid && k.period === _kpiCurrentPeriod()) {
      const newVal = _kpiAutoCalc(k.sid);
      if (newVal > 0 && newVal !== k.current) { k.current = newVal; _autoChanged = true; }
    }
  });
  if (_autoChanged) storeKpi(_autoD);

  let items = loadKpi ? loadKpi() : [];
  const allItemsRef = items.slice(); // dönem karşılaştırma için
  const pf = _gk('kpi-period-f')?.value || '';
  if (pf) items = items.filter(k => k.period === pf);

  // Arama filtresi (STANDART-FIX-010)
  const _kpiAraVal = (_gk('kpi-ara')?.value || '').toLowerCase();
  if (_kpiAraVal) items = items.filter(k => (k.title || '').toLowerCase().indexOf(_kpiAraVal) !== -1);

  // ── Dönem uyarısı (ACİL-FIX-005) ────────────────────────
  const _curPeriod = _kpiCurrentPeriod();
  const allItems   = loadKpi ? loadKpi() : [];
  const hasCurrent = allItems.some(k => k.period === _curPeriod);
  let _staleEl     = _gk('kpi-stale-warn');
  if (!hasCurrent && allItems.length > 0 && _isAdminK()) {
    if (!_staleEl) {
      _staleEl = document.createElement('div');
      _staleEl.id = 'kpi-stale-warn';
      const cards = _gk('kpi-cards');
      cards?.parentNode?.insertBefore(_staleEl, cards);
    }
    _staleEl.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 16px;margin-bottom:12px;background:linear-gradient(90deg,#FFFBEB,#FEF3C7);border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E';
    _staleEl.innerHTML =
      '<span style="font-size:18px">📅</span>'
      + '<div><strong>' + _curPeriod + ' için KPI bulunamadı</strong>'
      + '<div style="font-size:11px;color:#B45309;margin-top:2px">Önceki dönem KPI\'larını yeni döneme kopyalamak için "Dönem Güncelle" butonunu kullanın.</div></div>';
  } else if (_staleEl) {
    _staleEl.style.display = 'none';
  }

  // Özet sayaçlar
  const total = items.length;
  const rates = items.map(k => k.target > 0 ? Math.round((k.current / k.target) * 100) : 0);
  const avg   = total ? Math.round(rates.reduce((a,b) => a+b, 0) / total) : 0;
  const green = rates.filter(r => r >= 100).length;
  const red   = rates.filter(r => r < 60).length;

  _stk('kpi-count', total);
  _stk('kpi-avg',   '%' + avg);
  _stk('kpi-green', green);
  _stk('kpi-red',   red);

  // KPI Kartları
  const cards = _gk('kpi-cards');
  if (!cards) return;

  if (!items.length) {
    cards.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <div style="font-size:15px;font-weight:500">KPI kaydı bulunamadı</div>
      ${_isAdminK() ? `<div style="margin-top:12px"><button class="btn btnp" onclick="openKpiModal()">+ İlk KPI'ı Ekle</button></div>` : ''}
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px';

  items.forEach(k => {
    const pct     = k.target > 0 ? Math.min(100, Math.round((k.current / k.target) * 100)) : 0;
    const color   = pct >= 100 ? 'var(--grc)' : pct >= 75 ? 'var(--amc)' : pct >= 50 ? 'var(--blc)' : 'var(--rdc)';
    const icon    = pct >= 100 ? '🏆' : pct >= 75 ? '📈' : pct >= 50 ? '📊' : '⚠️';
    const alarm   = _kpiAlarmLevel(k);
    const prevVal = _kpiPrevValue(k, allItemsRef);
    const chgBadge= _kpiChangeBadge(k.current, prevVal);
    const card    = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:18px;border-left:4px solid ' + color;
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--t);margin-bottom:3px">${icon} ${k.title}</div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${k.period ? `<span style="font-size:11px;color:var(--t3)">📅 ${k.period}</span>` : ''}
            ${_kpiAlarmBadge(alarm)}
            ${k.auto ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:var(--s2);color:var(--t3)">⚡ Oto</span>' : ''}
            ${k.source ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#EEEDFE;color:#6366F1">' + k.source + '</span>' : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:800;color:${color}">${pct}%</div>
          <div style="font-size:10px;color:var(--t3)">gerçekleşme</div>
          ${chgBadge ? '<div style="margin-top:2px">' + chgBadge + '</div>' : ''}
        </div>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
          <span style="color:var(--t2)">Mevcut: <strong>${(k.current||0).toLocaleString('tr-TR')} ${k.unit||''}</strong></span>
          <span style="color:var(--t3)">Hedef: ${(k.target||0).toLocaleString('tr-TR')} ${k.unit||''}</span>
        </div>
        <div style="height:8px;background:var(--s2);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width .5s"></div>
        </div>
        ${prevVal !== null ? '<div style="font-size:10px;color:var(--t3);margin-top:3px">Önceki dönem: ' + prevVal.toLocaleString('tr-TR') + ' ' + (k.unit||'') + '</div>' : ''}
      </div>
      ${k.desc ? `<div style="font-size:11px;color:var(--t3);margin-top:6px">${k.desc}</div>` : ''}
      ${_isAdminK() ? `
        <div style="display:flex;gap:6px;margin-top:12px">
          <button class="btn btns" onclick="openKpiModal(${k.id})" style="font-size:11px">✏️ Düzenle</button>
          <button class="btn btns" onclick="openKpiUpdateModal(${k.id})" style="font-size:11px">📝 Güncelle</button>
          <button class="btn btns btnd" onclick="delKpi(${k.id})" style="font-size:11px">🗑</button>
        </div>` : ''}
    `;
    grid.appendChild(card);
  });
  frag.appendChild(grid);
  cards.replaceChildren(frag);

  // Pirim Etkisi bölümü
  _renderKpiPirimEffect(items);

  // Personel performans (admin)
  _renderKpiPersonnel();
}

function _renderKpiPirimEffect(items) {
  let cont = _gk('kpi-pirim-effect');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'kpi-pirim-effect';
    cont.style.cssText = 'margin:16px 0';
    const cards = _gk('kpi-cards');
    if (cards) cards.parentNode.insertBefore(cont, cards.nextSibling);
    else return;
  }
  // Satış KPI'sını bul
  const satisKpi = items.find(function(k) { return k.sid === 'kpi_satis' || k.title.indexOf('Satış') !== -1; });
  if (!satisKpi) { cont.innerHTML = ''; return; }

  const pct = satisKpi.target > 0 ? Math.round((satisKpi.current / satisKpi.target) * 100) : 0;
  var oneriOran, oneriLabel;
  if (pct >= 100)     { oneriOran = 2.0; oneriLabel = '%2.0 + Bonus'; }
  else if (pct >= 80) { oneriOran = 1.5; oneriLabel = '%1.5'; }
  else if (pct >= 50) { oneriOran = 1.0; oneriLabel = '%1.0'; }
  else                { oneriOran = 0.5; oneriLabel = '%0.5'; }

  // Mevcut pirim oranı (loadPirimParams varsa)
  var mevcutOran = '—';
  try {
    var params = typeof loadPirimParams === 'function' ? loadPirimParams() : (window.loadPirimParams?.() || {});
    if (params.SATIS) mevcutOran = '%' + ((params.SATIS.rate || 0) * 100).toFixed(1);
    else if (params.rates?.SATIS) mevcutOran = '%' + ((params.rates.SATIS || 0) * 100).toFixed(1);
  } catch(e) {}

  var color = pct >= 100 ? '#16A34A' : pct >= 80 ? '#D97706' : pct >= 50 ? '#3B82F6' : '#DC2626';
  cont.innerHTML = '<div class="card" style="padding:16px;border-left:4px solid #8B5CF6">'
    + '<div style="font-weight:700;font-size:13px;color:var(--t);margin-bottom:10px">💰 Pirim Etkisi — Satış KPI</div>'
    + '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">'
    + '<div style="flex:1;min-width:160px">'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">KPI Gerçekleşme</div>'
    + '<div style="font-size:20px;font-weight:800;color:' + color + '">%' + pct + '</div>'
    + '</div>'
    + '<div style="flex:1;min-width:160px">'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Mevcut Pirim Oranı</div>'
    + '<div style="font-size:16px;font-weight:700;color:var(--t)">' + mevcutOran + '</div>'
    + '</div>'
    + '<div style="flex:1;min-width:160px">'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">KPI Bazlı Öneri</div>'
    + '<div style="font-size:16px;font-weight:700;color:#8B5CF6">' + oneriLabel + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="margin-top:10px;display:flex;gap:4px;flex-wrap:wrap">'
    + '<span style="font-size:9px;padding:3px 8px;border-radius:4px;' + (pct < 50 ? 'background:#FCEBEB;color:#791F1F' : 'background:var(--s2);color:var(--t3)') + '">%0-50: %0.5</span>'
    + '<span style="font-size:9px;padding:3px 8px;border-radius:4px;' + (pct >= 50 && pct < 80 ? 'background:#E6F1FB;color:#0C447C' : 'background:var(--s2);color:var(--t3)') + '">%50-80: %1.0</span>'
    + '<span style="font-size:9px;padding:3px 8px;border-radius:4px;' + (pct >= 80 && pct < 100 ? 'background:#FAEEDA;color:#633806' : 'background:var(--s2);color:var(--t3)') + '">%80-100: %1.5</span>'
    + '<span style="font-size:9px;padding:3px 8px;border-radius:4px;' + (pct >= 100 ? 'background:#EAF3DE;color:#15803D' : 'background:var(--s2);color:var(--t3)') + '">%100+: %2.0 + Bonus</span>'
    + '</div></div>';
}

function _renderKpiPersonnel() {
  const sec = _gk('kpi-personnel-section');
  if (!sec || !_isAdminK()) { if (sec) sec.innerHTML = ''; return; }
  const users  = loadUsers ? loadUsers() : [];
  const tasks  = loadTasks ? loadTasks() : [];
  const puan   = loadPuan  ? loadPuan()  : [];
  const today  = new Date().toISOString().slice(0,10);

  const rows = users.filter(u => u.status === 'active').map(u => {
    const myTasks    = tasks.filter(t => t.uid === u.id);
    const doneTasks  = myTasks.filter(t => t.done || t.status === 'done').length;
    const total      = myTasks.length || 1;
    const taskRate   = Math.round((doneTasks / total) * 100);
    const myPuan     = puan.filter(p => p.uid === u.id);
    const attendance = myPuan.length ? Math.round(myPuan.filter(p => p.aI).length / myPuan.length * 100) : 100;
    const score      = Math.round((taskRate * 0.6) + (attendance * 0.4));
    return { u, doneTasks, total, taskRate, attendance, score };
  }).sort((a,b) => b.score - a.score);

  if (!rows.length) { sec.innerHTML = ''; return; }

  const avColors = ['#6366F1','#8B5CF6','#EC4899','#0EA5E9','#10B981','#F59E0B','#EF4444'];
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.overflow = 'hidden';
  wrap.innerHTML = `
    <div class="ch"><span class="ct">👥 Personel Performans Skoru</span></div>`;
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>#</th><th>Personel</th><th>Görev Tamamlama</th>
    <th>Devam Oranı</th><th>Genel Skor</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');
  rows.forEach((r, i) => {
    const av = avColors[i % avColors.length];
    const initials = (r.u.name||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'?';
    const scoreColor = r.score >= 80 ? 'var(--grc)' : r.score >= 60 ? 'var(--amc)' : 'var(--rdc)';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:700;color:var(--t3);text-align:center;width:36px">${i+1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:30px;height:30px;border-radius:8px;background:${av};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>
          <div>
            <div style="font-weight:600;font-size:13px">${r.u.name}</div>
            <div style="font-size:10px;color:var(--t3)">${r.u.role || ''}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:12px;margin-bottom:3px">${r.doneTasks}/${r.total} görev · %${r.taskRate}</div>
        <div style="height:4px;background:var(--s2);border-radius:2px;width:80px">
          <div style="height:100%;background:var(--ac);width:${r.taskRate}%;border-radius:2px"></div>
        </div>
      </td>
      <td>
        <div style="font-size:12px;margin-bottom:3px">%${r.attendance}</div>
        <div style="height:4px;background:var(--s2);border-radius:2px;width:80px">
          <div style="height:100%;background:${r.attendance>=90?'#22C55E':r.attendance>=70?'#F59E0B':'#EF4444'};width:${r.attendance}%;border-radius:2px"></div>
        </div>
      </td>
      <td>
        <span style="font-size:20px;font-weight:800;color:${scoreColor}">${r.score}</span>
        <span style="font-size:10px;color:var(--t3)">/100</span>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  frag.appendChild(wrap);
  sec.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — CRUD
// ════════════════════════════════════════════════════════════════

function openKpiModal(id) {
  _injectKpiPanel();
  if (id) {
    const k = (loadKpi ? loadKpi() : []).find(x => x.id === id); if (!k) return;
    if (_gk('kpi-title'))   _gk('kpi-title').value   = k.title   || '';
    if (_gk('kpi-current')) _gk('kpi-current').value = k.current || 0;
    if (_gk('kpi-target'))  _gk('kpi-target').value  = k.target  || 0;
    if (_gk('kpi-unit'))    _gk('kpi-unit').value    = k.unit    || '';
    if (_gk('kpi-period'))  _gk('kpi-period').value  = k.period  || '';
    if (_gk('kpi-desc'))    _gk('kpi-desc').value    = k.desc    || '';
    if (_gk('kpi-eid'))     _gk('kpi-eid').value     = id;
    _stk('mo-kpi-t', '✏️ KPI Düzenle');
  } else {
    ['kpi-title','kpi-unit','kpi-desc'].forEach(i => { const el = _gk(i); if (el) el.value = ''; });
    if (_gk('kpi-current')) _gk('kpi-current').value = 0;
    if (_gk('kpi-target'))  _gk('kpi-target').value  = 100;
    if (_gk('kpi-period'))  { const n=new Date(); _gk('kpi-period').value = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][n.getMonth()] + ' ' + n.getFullYear(); }
    if (_gk('kpi-eid'))     _gk('kpi-eid').value = '';
    _stk('mo-kpi-t', '+ KPI Ekle');
  }
  window.openMo?.('mo-kpi');
}

function openKpiUpdateModal(id) {
  const val = prompt('Mevcut değeri güncelleyin:');
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num)) { window.toast?.('Geçerli bir sayı giriniz', 'err'); return; }
  const d = loadKpi();
  const k = d.find(x => x.id === id); if (!k) return;
  k.current = num;
  k.updatedTs = _nowTsk();
  k.updatedBy = _CUk()?.id;
  storeKpi(d);
  renderKpiPanel();
  window.toast?.('KPI güncellendi ✓', 'ok');
  window.logActivity?.('view', `"${k.title}" KPI değeri güncellendi → ${num}`);
}

function saveKpi() {
  const title = (_gk('kpi-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const d   = loadKpi ? loadKpi() : [];
  const eid = parseInt(_gk('kpi-eid')?.value || '0');
  const entry = {
    title,
    current: parseFloat(_gk('kpi-current')?.value) || 0,
    target:  parseFloat(_gk('kpi-target')?.value)  || 100,
    unit:    _gk('kpi-unit')?.value    || '',
    period:  _gk('kpi-period')?.value  || '',
    desc:    _gk('kpi-desc')?.value    || '',
    ts:      _nowTsk(),
    uid:     _CUk()?.id,
  };
  if (eid) { const k = d.find(x => x.id === eid); if (k) Object.assign(k, entry); }
  else d.unshift({ id: generateNumericId(), ...entry });
  storeKpi(d);
  window.closeMo?.('mo-kpi');
  renderKpiPanel();
  window.logActivity?.('view', `"${title}" KPI ${eid ? 'güncellendi' : 'eklendi'}`);
  window.toast?.(eid ? 'Güncellendi ✓' : 'KPI eklendi ✓', 'ok');
}

function delKpi(id) {
  if (!_isAdminK()) return;
  window.confirmModal('Bu KPI kaydını silmek istediğinizden emin misiniz?', {
    title: 'KPI Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      storeKpi((loadKpi ? loadKpi() : []).filter(x => x.id !== id));
      renderKpiPanel();
      window.toast?.('Silindi', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — DÖNEM GÜNCELLEME (ACİL-FIX-005)
// ════════════════════════════════════════════════════════════════

/**
 * Önceki dönem KPI'larını sıfırlanmış mevcut değerlerle yeni döneme kopyalar.
 * @description Admin butonu: "🔄 Dönem Güncelle"
 */
function _kpiDonemGuncelle() {
  if (!_isAdminK()) return;
  const curPeriod = _kpiCurrentPeriod();
  const allItems  = loadKpi ? loadKpi() : [];
  const hasItems  = allItems.some(k => k.period === curPeriod);
  if (hasItems) {
    window.toast?.(_curPeriodLabel() + ' dönemi zaten mevcut', 'err');
    return;
  }

  // Bir önceki ayın dönem adını bul
  const now   = new Date();
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevP = _KPI_AY[prev.getMonth()] + ' ' + prev.getFullYear();
  const src   = allItems.filter(k => k.period === prevP);

  if (!src.length) {
    window.toast?.('Kopyalanacak önceki dönem KPI bulunamadı (' + prevP + ')', 'err');
    return;
  }

  window.confirmModal(src.length + ' KPI kaydı "' + prevP + '" → "' + curPeriod + '" dönemine kopyalanacak. Mevcut değerler sıfırlanacak.', {
    title: 'Dönem Güncelle',
    confirmText: 'Kopyala ve Güncelle',
    onConfirm: function() {
      const d = loadKpi ? loadKpi() : [];
      src.forEach(function(k) {
        d.unshift({
          id:      generateNumericId(),
          title:   k.title,
          target:  k.target,
          current: 0,
          unit:    k.unit || '',
          period:  curPeriod,
          desc:    k.desc || '',
          ts:      _nowTsk(),
          uid:     _CUk()?.id,
          copiedFrom: k.id
        });
      });
      storeKpi(d);
      renderKpiPanel();
      window.toast?.(src.length + ' KPI "' + curPeriod + '" dönemine kopyalandı ✓', 'ok');
      window.logActivity?.('view', 'KPI dönem güncelleme: ' + prevP + ' → ' + curPeriod + ' (' + src.length + ' kayıt)');
    }
  });
}

function _curPeriodLabel() { return _kpiCurrentPeriod(); }

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Kpi = { render: renderKpiPanel, openModal: openKpiModal, save: saveKpi, del: delKpi, update: openKpiUpdateModal, donemGuncelle: _kpiDonemGuncelle };

if (typeof module !== 'undefined' && module.exports) { module.exports = Kpi; }
else {
  window.Kpi            = Kpi;
  window.KPI            = Kpi;
  window.renderKpiPanel = renderKpiPanel;
  window.openKpiModal   = openKpiModal;
  window.saveKpi        = saveKpi;
  window.delKpi         = delKpi;
  window.openKpiUpdateModal = openKpiUpdateModal;
  window._kpiDonemGuncelle  = _kpiDonemGuncelle;

  window._kpiAra = function(q) { renderKpiPanel(); };

  window._kpiExport = function() {
    var liste = loadKpi ? loadKpi() : [];
    if (!liste.length) { window.toast?.('Dışa aktarılacak KPI yok', 'warn'); return; }
    var baslik = ['ID','Başlık','Mevcut','Hedef','Birim','Dönem','Tamamlanma%'];
    var satirlar = liste.map(function(k) {
      return [k.id, k.title, k.current, k.target, k.unit, k.period,
        k.target > 0 ? Math.round(k.current / k.target * 100) + '%' : '—'];
    });
    var csv = [baslik].concat(satirlar)
      .map(function(r) { return r.map(function(c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(','); })
      .join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = 'kpi_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    window.toast?.('KPI export tamamlandı ✓', 'ok');
  };
}
