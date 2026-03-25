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
          <option value="Ocak 2026">Ocak 2026</option>
          <option value="Şubat 2026">Şubat 2026</option>
          <option value="Mart 2026">Mart 2026</option>
          <option value="Nisan 2026">Nisan 2026</option>
        </select>
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
  let items = loadKpi ? loadKpi() : [];
  const pf = _gk('kpi-period-f')?.value || '';
  if (pf) items = items.filter(k => k.period === pf);

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
    const barBg   = pct >= 100 ? 'var(--grb)' : pct >= 75 ? 'var(--amb)' : pct >= 50 ? 'var(--blb)' : 'var(--rdb)';
    const icon    = pct >= 100 ? '🏆' : pct >= 75 ? '📈' : pct >= 50 ? '📊' : '⚠️';
    const card    = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:18px;border-left:4px solid ' + color;
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--t);margin-bottom:3px">${icon} ${k.title}</div>
          ${k.period ? `<div style="font-size:11px;color:var(--t3)">📅 ${k.period}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:800;color:${color}">${pct}%</div>
          <div style="font-size:10px;color:var(--t3)">gerçekleşme</div>
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

  // Personel performans (admin)
  _renderKpiPersonnel();
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
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Kpi = { render: renderKpiPanel, openModal: openKpiModal, save: saveKpi, del: delKpi, update: openKpiUpdateModal };

if (typeof module !== 'undefined' && module.exports) { module.exports = Kpi; }
else {
  window.Kpi            = Kpi;
  window.KPI            = Kpi;
  window.renderKpiPanel = renderKpiPanel;
  window.openKpiModal   = openKpiModal;
  window.saveKpi        = saveKpi;
  window.delKpi         = delKpi;
  window.openKpiUpdateModal = openKpiUpdateModal;
}
