/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/izin.js  —  v8.1.0
 * İzin Yönetimi Paneli — HTML Inject + ik.js fonksiyonlarını bağlar
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _giz  = window.g;
const _stiz = (id,v) => { const el = _giz(id); if (el) el.textContent = v; };
const _isAdminIz = window.isAdmin;

function _injectIzinPanel() {
  const panel = _giz('panel-izin');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">📅 İzin Yönetimi</div><div class="phs">Yıllık izin, mazeret, hastalık ve tüm izin türleri — raporlama ve onay sistemi.</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="exportIzinXlsx()">⬇ Excel</button>
    <button class="btn btns" onclick="printIzinReport()">🖨 PDF</button>
    <button class="btn btnp" onclick="openIzinModal(null)">+ İzin Talebi</button>
  </div>
</div>
<!-- İstatistikler -->
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="ms"><div class="msv" id="izin-total">0</div><div class="msl">Toplam Talep</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="izin-approved">0</div><div class="msl">✅ Onaylı</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="izin-pending">0</div><div class="msl">⏳ Bekliyor</div></div>
  <div class="ms"><div class="msv" style="color:var(--bl)" id="izin-used">0</div><div class="msl">📆 Kullanılan Gün</div></div>
  <div class="ms"><div class="msv" style="color:var(--ac)" id="izin-remaining">0</div><div class="msl">🎯 Kalan Hak</div></div>
</div>
<!-- Filtreler -->
<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
  <select class="si" id="izin-user-f" style="width:180px;padding:6px 10px;font-size:12px" onchange="renderIzin()">
    <option value="0">Tüm Personel</option>
  </select>
  <select class="si" id="izin-type-f" style="width:180px;padding:6px 10px;font-size:12px" onchange="renderIzin()">
    <option value="">Tüm İzin Türleri</option>
    <option value="yillik">📆 Yıllık İzin</option>
    <option value="mazeret">🙏 Mazeret İzni</option>
    <option value="hastalik">🏥 Hastalık İzni</option>
    <option value="ucretsiz">💸 Ücretsiz İzin</option>
    <option value="dogum">👶 Doğum/Ebeveyn</option>
    <option value="olum">🕊️ Ölüm İzni</option>
    <option value="evlilik">💍 Evlilik İzni</option>
    <option value="mazeretsiz">❌ Mazeretsiz Devamsızlık</option>
    <option value="egitim">📚 Eğitim İzni</option>
    <option value="diger">📌 Diğer</option>
  </select>
  <select class="si" id="izin-status-f" style="width:140px;padding:6px 10px;font-size:12px" onchange="renderIzin()">
    <option value="">Tüm Durumlar</option>
    <option value="pending">⏳ Bekliyor</option>
    <option value="approved">✅ Onaylı</option>
    <option value="rejected">❌ Reddedildi</option>
  </select>
  <input type="date" class="si" id="izin-year-f" style="width:140px;padding:6px 10px;font-size:12px" onchange="renderIzin()" title="Yıl filtresi">
</div>
<!-- Personel Özet Kartları -->
<div id="izin-summary-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:18px"></div>
<!-- İzin Listesi -->
<div class="card"><div id="izin-list"></div></div>
  `;
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDER
// ════════════════════════════════════════════════════════════════

function renderIzinPanel() {
  _injectIzinPanel();
  if (typeof window.renderIzin === 'function') {
    window.renderIzin();
  }
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Izin = { render: renderIzinPanel, inject: _injectIzinPanel };

if (typeof module !== 'undefined' && module.exports) { module.exports = Izin; }
else {
  window.Izin = Izin;
  const _origRenderIzin = window.renderIzin;
  window.renderIzin = function() {
    _injectIzinPanel();
    if (_origRenderIzin) _origRenderIzin();
  };
}
