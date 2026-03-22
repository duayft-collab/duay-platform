/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/ik_panel.js  —  v8.1.0
 * İK Personel Paneli — HTML Inject + ik.js fonksiyonlarını bağlar
 * NOT: ik.js'den SONRA yüklenmeli.
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _gik2  = id => document.getElementById(id);
const _stik2 = (id,v) => { const el = _gik2(id); if (el) el.textContent = v; };
const _isAdminIk2 = () => window.Auth?.getCU?.()?.role === 'admin';

function _injectIkPanel() {
  const panel = _gik2('panel-ik');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">👥 İK Yönetimi</div><div class="phs">İşe giriş/çıkış, sözleşme ve özlük dosyaları.</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="exportIkXlsx()">⬇ Excel</button>
    <button class="btn btnp" id="btn-ik-add" onclick="openIkModal(null)">+ Personel Ekle</button>
  </div>
</div>
<!-- İstatistikler -->
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="ms"><div class="msv" id="ik-total">0</div><div class="msl">Toplam</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="ik-active">0</div><div class="msl">✅ Aktif</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="ik-probation">0</div><div class="msl">🔄 Deneme</div></div>
  <div class="ms"><div class="msv" style="color:var(--rd)" id="ik-left">0</div><div class="msl">🚪 Ayrılan</div></div>
  <div class="ms"><div class="msv" style="color:var(--bl)" id="ik-pending">0</div><div class="msl">📋 Bekleyen</div></div>
</div>
<!-- Yol Haritası Özeti -->
<div class="card" style="margin-bottom:18px">
  <div class="ch"><span class="ct">🗺️ İşe Alım Yol Haritası</span><span style="font-size:11px;color:var(--t2)">Aşamalar ve gerekli belgeler</span></div>
  <div style="display:flex;gap:0;overflow-x:auto;padding:16px 20px">
    <div id="ik-roadmap"></div>
  </div>
</div>
<!-- Personel Listesi -->
<div class="card">
  <div class="ch">
    <span class="ct">Personel Listesi</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select class="si" id="ik-status-f" style="width:150px;padding:5px 8px;font-size:12px" onchange="renderIk()">
        <option value="">Tüm Durumlar</option>
        <option value="active">Aktif</option>
        <option value="probation">Deneme</option>
        <option value="left">Ayrılan</option>
        <option value="pending">Bekleyen</option>
      </select>
      <input class="si" id="ik-search" style="width:180px;padding:5px 10px;font-size:12px" placeholder="🔍 Ara..." oninput="renderIk()">
    </div>
  </div>
  <div style="overflow-x:auto"><table class="tbl" id="ik-tbl"><thead><tr><th>Personel</th><th>Pozisyon</th><th>Başlangıç</th><th>Durum</th><th>Belgeler</th><th>Aşama</th><th></th></tr></thead><tbody id="ik-tbody"></tbody></table></div>
</div>

<!-- Personel Zimmet Takibi -->
<div class="card" style="margin-top:18px">
  <div class="ch">
    <span class="ct">🔑 Personel Zimmet Takibi</span>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="si" id="ik-zimmet-user-f" style="width:180px;padding:5px 8px;font-size:12px" onchange="renderIkZimmet()">
        <option value="0">Tüm Personel</option>
      </select>
      <button class="btn btnp" style="font-size:12px" onclick="openStokModal('giris')">+ Zimmet Ver</button>
    </div>
  </div>
  <div id="ik-zimmet-list">
    <div style="padding:24px;text-align:center;color:var(--t2);font-size:13px">Zimmet kaydı yükleniyor…</div>
  </div>
</div>
  `;
}

function renderIkPanel() {
  _injectIkPanel();
  if (typeof window.renderIk       === 'function') window.renderIk();
  if (typeof window.renderIkZimmet === 'function') window.renderIkZimmet();
}

const IkPanel = { render: renderIkPanel, inject: _injectIkPanel };

if (typeof module !== 'undefined' && module.exports) { module.exports = IkPanel; }
else {
  window.IkPanel = IkPanel;
  const _origRenderIk = window.renderIk;
  window.renderIk = function() {
    _injectIkPanel();
    if (_origRenderIk) _origRenderIk();
  };
}
