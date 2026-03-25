/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/hedefler.js  —  v8.1.0
 * Hedefler Paneli — HTML Inject + helpers.js fonksiyonlarını bağlar
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _ghf  = window.g;
const _sthf = window.st;

function _injectHedeflerPanel() {
  const panel = _ghf('panel-hedefler');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
  <div>
    <div class="pht">🎯 Çeyrek Hedefler</div>
    <div class="phs">SMART hedef yönetimi — Spesifik · Ölçülebilir · Ulaşılabilir · Gerçekçi · Zamanlı</div>
  </div>
  <div style="display:flex;gap:8px">
    <button class="btn btns" onclick="exportHdfXlsx()">⬇ Excel</button>
    <button class="btn btnp" onclick="openHdfModal(null)">+ Hedef Ekle</button>
  </div>
</div>
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="ms"><div class="msv" id="hdf-total">0</div><div class="msl">Toplam</div></div>
  <div class="ms"><div class="msv" style="color:var(--bl)" id="hdf-planned">0</div><div class="msl">📋 Planlandı</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="hdf-progress">0</div><div class="msl">🔄 Devam</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="hdf-done">0</div><div class="msl">✅ Tamamlandı</div></div>
  <div class="ms"><div class="msv" style="color:var(--rd)" id="hdf-late">0</div><div class="msl">⚠️ Gecikmiş</div></div>
</div>
<!-- Filtreler -->
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
  <select class="si" id="hdf-filter-st" style="width:160px;padding:6px 10px;font-size:12px" onchange="renderHedefler()">
    <option value="">Tüm Durumlar</option>
    <option value="planned">📋 Planlandı</option>
    <option value="progress">🔄 Devam Ediyor</option>
    <option value="done">✅ Tamamlandı</option>
  </select>
  <select class="si" id="hdf-filter-usr" style="width:180px;padding:6px 10px;font-size:12px" onchange="renderHedefler()">
    <option value="0">Tüm Personel</option>
  </select>
  <input class="si" id="hdf-search" style="flex:1;min-width:160px;padding:6px 12px" placeholder="🔍 Hedef ara..." oninput="renderHedefler()">
</div>
<div id="hdf-list"></div>
  `;
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDER
// ════════════════════════════════════════════════════════════════

function renderHedeflerPanel() {
  _injectHedeflerPanel();
  if (typeof window.renderHedefler === 'function') {
    window.renderHedefler();
  }
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Hedefler = { render: renderHedeflerPanel, inject: _injectHedeflerPanel };

if (typeof module !== 'undefined' && module.exports) { module.exports = Hedefler; }
else {
  window.Hedefler = Hedefler;
  // renderHedefler zaten helpers.js'den geliyor, inject wrap et
  const _origRenderHedefler = window.renderHedefler;
  window.renderHedefler = function() {
    _injectHedeflerPanel();
    // Sayaçları güncelle
    const all = (typeof loadHdf === 'function') ? loadHdf() : [];
    _sthf('hdf-total',    all.length);
    _sthf('hdf-progress', all.filter(h => h.status === 'progress').length);
    _sthf('hdf-done',     all.filter(h => h.status === 'done').length);
    if (_origRenderHedefler) _origRenderHedefler();
  };
}
