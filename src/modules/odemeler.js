/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v8.1.0
 * Rutin Ödemeler Paneli
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _go  = id  => document.getElementById(id);
const _sto = (id,v) => { const el = _go(id); if (el) el.textContent = v; };
const _p2o = n   => String(n).padStart(2,'0');
const _nowTso = () => { const n=new Date(); return `${n.getFullYear()}-${_p2o(n.getMonth()+1)}-${_p2o(n.getDate())} ${_p2o(n.getHours())}:${_p2o(n.getMinutes())}:${_p2o(n.getSeconds())}`; };
const _isAdminO = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUo      = () => window.Auth?.getCU?.();

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — SABİTLER
// ════════════════════════════════════════════════════════════════

const ODM_CATS = {
  kira:      { l:'🏢 Kira',            c:'ba' },
  fatura:    { l:'💡 Fatura',           c:'bb' },
  abonelik:  { l:'🔄 Abonelik',         c:'bp' },
  vergi:     { l:'📋 Vergi/SGK',        c:'br' },
  sigorta:   { l:'🛡️ Sigorta',          c:'ba' },
  kredi:     { l:'🏦 Kredi/Finansman',  c:'bb' },
  diger:     { l:'📌 Diğer',           c:'bg' },
};
const ODM_FREQ = {
  aylik:  '📅 Aylık',
  yillik: '📆 Yıllık',
  haftalik:'📅 Haftalık',
  teksefer:'1️⃣ Tek Sefer',
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — PANEL HTML INJECT
// ════════════════════════════════════════════════════════════════

function _injectOdmPanel() {
  const panel = _go('panel-odemeler');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">💳 Rutin Ödemeler</div><div class="phs">Sabit ve periyodik ödeme takibi.</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="exportOdmXlsx()">⬇ Excel</button>
    <button class="btn btns" onclick="importOdmFile()">↑ İçe Aktar</button>
    <input type="file" id="odm-import-file" accept=".xlsx,.xls" style="display:none" onchange="processOdmImport(this)">
    <button class="btn btnp" onclick="openOdmModal(null)">+ Ödeme Ekle</button>
  </div>
</div>
<div class="sg">
  <div class="ms"><div class="msv" id="odm-total">0</div><div class="msl">Toplam</div></div>
  <div class="ms"><div class="msv" style="color:var(--rd)" id="odm-overdue">0</div><div class="msl">⚠️ Geciken</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="odm-upcoming">0</div><div class="msl">📅 Bu Ay</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="odm-paid">0</div><div class="msl">✅ Ödendi</div></div>
</div>
<!-- Takvim görünümü toggle -->
<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center">
  <button class="chip on" id="odm-view-list-btn" onclick="setOdmView('list',this)">☰ Liste</button>
  <button class="chip" id="odm-view-cal-btn" onclick="setOdmView('cal',this)">📅 Takvim</button>
</div>
<div id="odm-list"></div>
<div id="odm-calendar-view" style="display:none"></div>
  `;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — RENDER
// ════════════════════════════════════════════════════════════════

function renderOdemeler() {
  _injectOdmPanel();
  let items = loadOdm ? loadOdm() : [];
  const catF  = _go('odm-cat-f')?.value  || '';
  const freqF = _go('odm-freq-f')?.value || '';
  if (catF)  items = items.filter(o => o.cat  === catF);
  if (freqF) items = items.filter(o => o.freq === freqF);

  // Sayaçlar
  const today   = new Date();
  const thisMonth = `${today.getFullYear()}-${_p2o(today.getMonth()+1)}`;
  const all     = loadOdm ? loadOdm() : [];
  const aylik   = all.filter(o => o.freq === 'aylik').reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  const yaklasan = all.filter(o => !o.paid && o.due && o.due.startsWith(thisMonth)).length;
  const gecikmiş = all.filter(o => !o.paid && o.due && o.due < today.toISOString().slice(0,10)).length;

  _sto('odm-total-count', all.length);
  _sto('odm-aylik-toplam', '₺' + aylik.toLocaleString('tr-TR', {maximumFractionDigits:2}));
  _sto('odm-yaklaşan',  yaklasan);
  _sto('odm-gecikmiş',  gecikmiş);

  const cont = _go('odm-list');
  if (!cont) return;

  if (!items.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">💳</div>
      <div style="font-size:15px;font-weight:500">Kayıt bulunamadı</div>
      <div style="margin-top:12px"><button class="btn btnp" onclick="openOdmModal()">+ İlk Ödemeyi Ekle</button></div>
    </div>`;
    return;
  }

  const frag  = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Kategori</th><th>Ödeme Adı</th><th>Tutar</th>
    <th>Sıklık</th><th>Son Tarih</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  items.sort((a,b) => (a.due||'').localeCompare(b.due||'')).forEach(o => {
    const cat  = ODM_CATS[o.cat]  || ODM_CATS.diger;
    const freq = ODM_FREQ[o.freq] || '—';
    const isLate  = !o.paid && o.due && o.due < today.toISOString().slice(0,10);
    const isSoon  = !o.paid && o.due && o.due.startsWith(thisMonth);
    const tr = document.createElement('tr');
    if (isLate) tr.style.background = 'rgba(239,68,68,.04)';
    tr.innerHTML = `
      <td><span class="badge ${cat.c}">${cat.l}</span></td>
      <td>
        <div style="font-weight:500;font-size:13px">${o.name}</div>
        ${o.note ? `<div style="font-size:10px;color:var(--t3)">${o.note}</div>` : ''}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--t)">
        ₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR', {minimumFractionDigits:2})}
      </td>
      <td style="font-size:12px">${freq}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:${isLate?'var(--rdc)':isSoon?'var(--amc)':'var(--t2)'}">
        ${o.due || '—'} ${isLate ? '🚨' : isSoon ? '⚠️' : ''}
      </td>
      <td>
        ${o.paid
          ? `<span class="badge bg">✅ Ödendi</span>`
          : isLate
            ? `<span class="badge br">🔴 Gecikmiş</span>`
            : isSoon
              ? `<span class="badge ba">⚠️ Yaklaşan</span>`
              : `<span class="badge bb">📅 Bekliyor</span>`
        }
      </td>
      <td>
        <div style="display:flex;gap:4px">
          ${!o.paid ? `<button class="btn btns btng" onclick="toggleOdmPaid(${o.id})" style="font-size:11px">✓ Ödendi</button>` : `<button class="btn btns" onclick="toggleOdmPaid(${o.id})" style="font-size:11px">↩ Geri Al</button>`}
          <button class="btn btns" onclick="openOdmModal(${o.id})">✏️</button>
          ${_isAdminO() ? `<button class="btn btns btnd" onclick="delOdm(${o.id})">🗑</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — CRUD
// ════════════════════════════════════════════════════════════════

function openOdmModal(id) {
  _injectOdmPanel();
  if (id) {
    const o = loadOdm().find(x => x.id === id); if (!o) return;
    if (_go('odm-name'))   _go('odm-name').value   = o.name   || '';
    if (_go('odm-cat'))    _go('odm-cat').value    = o.cat    || 'diger';
    if (_go('odm-freq'))   _go('odm-freq').value   = o.freq   || 'aylik';
    if (_go('odm-amount')) _go('odm-amount').value = o.amount || '';
    if (_go('odm-due'))    _go('odm-due').value    = o.due    || '';
    if (_go('odm-note'))   _go('odm-note').value   = o.note   || '';
    if (_go('odm-paid'))   _go('odm-paid').checked = !!o.paid;
    if (_go('odm-eid'))    _go('odm-eid').value    = id;
    _sto('mo-odm-t', '✏️ Ödeme Düzenle');
  } else {
    ['odm-name','odm-amount','odm-note'].forEach(i => { const el = _go(i); if (el) el.value = ''; });
    if (_go('odm-cat'))  _go('odm-cat').value  = 'fatura';
    if (_go('odm-freq')) _go('odm-freq').value = 'aylik';
    if (_go('odm-due'))  { const n=new Date(); n.setDate(n.getDate()+7); _go('odm-due').value = n.toISOString().slice(0,10); }
    if (_go('odm-paid')) _go('odm-paid').checked = false;
    if (_go('odm-eid'))  _go('odm-eid').value  = '';
    _sto('mo-odm-t', '+ Ödeme Ekle');
  }
  window.openMo?.('mo-odm');
}

function saveOdm() {
  const name = (_go('odm-name')?.value || '').trim();
  if (!name) { window.toast?.('Ödeme adı zorunludur', 'err'); return; }
  const d   = loadOdm();
  const eid = parseInt(_go('odm-eid')?.value || '0');
  const entry = {
    name,
    cat:    _go('odm-cat')?.value    || 'diger',
    freq:   _go('odm-freq')?.value   || 'aylik',
    amount: parseFloat(_go('odm-amount')?.value || '0') || 0,
    due:    _go('odm-due')?.value    || '',
    note:   _go('odm-note')?.value   || '',
    paid:   !!_go('odm-paid')?.checked,
    ts:     _nowTso(),
    uid:    _CUo()?.id,
  };
  if (eid) { const o = d.find(x => x.id === eid); if (o) Object.assign(o, entry); }
  else d.unshift({ id: Date.now(), ...entry });
  storeOdm(d);
  window.closeMo?.('mo-odm');
  renderOdemeler();
  window.logActivity?.('view', `"${name}" ödeme kaydedildi`);
  window.toast?.(eid ? 'Güncellendi ✓' : 'Ödeme eklendi ✓', 'ok');
}

function toggleOdmPaid(id) {
  const d = loadOdm();
  const o = d.find(x => x.id === id); if (!o) return;
  o.paid    = !o.paid;
  o.paidTs  = o.paid ? _nowTso() : null;
  o.paidBy  = o.paid ? _CUo()?.id : null;
  storeOdm(d);
  renderOdemeler();
  window.toast?.(o.paid ? '✅ Ödendi olarak işaretlendi' : '↩ Geri alındı', 'ok');
}

function delOdm(id) {
  if (!_isAdminO()) return;
  if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;
  storeOdm(loadOdm().filter(x => x.id !== id));
  renderOdemeler();
  window.toast?.('Silindi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Odemeler = { render: renderOdemeler, openModal: openOdmModal, save: saveOdm, del: delOdm, togglePaid: toggleOdmPaid, CATS: ODM_CATS, FREQ: ODM_FREQ };

if (typeof module !== 'undefined' && module.exports) { module.exports = Odemeler; }
else {
  window.Odemeler     = Odemeler;
  window.renderOdemeler = renderOdemeler;
  window.openOdmModal   = openOdmModal;
  window.saveOdm        = saveOdm;
  window.delOdm         = delOdm;
  window.toggleOdmPaid  = toggleOdmPaid;
  window.ODM_CATS       = ODM_CATS;
}
