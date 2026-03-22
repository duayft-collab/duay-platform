/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/puantaj.js  —  v8.1.0
 * Puantaj Paneli — HTML Inject + ik.js fonksiyonlarını bağlar
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _gpt  = id => document.getElementById(id);
const _stpt = (id,v) => { const el = _gpt(id); if (el) el.textContent = v; };

function _injectPuantajPanel() {
  const panel = _gpt('panel-puantaj');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <!-- Header -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
  <div>
    <div class="pht" style="font-size:20px;font-weight:800;letter-spacing:-.4px">📋 <span id="ph-pt">Puantaj & Mesai</span></div>
    <div class="phs" style="margin-top:4px">Giriş-çıkış saatleri, gecikme ve fazla mesai takibi.</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn btns" onclick="puanExport()">⬇ Excel</button>
    <button class="btn btnp" onclick="openPuanModal()" id="btn-pnew">+ Kayıt Ekle</button>
  </div>
</div>

<!-- Stat Cards -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
  <div style="background:var(--sf);border:1.5px solid var(--b);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;background:rgba(99,102,241,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📋</div>
    <div><div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;color:var(--t)" id="pp-tot">0</div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Toplam Kayıt</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(245,158,11,.25);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;background:rgba(245,158,11,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⏳</div>
    <div><div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;color:#D97706" id="pp-pd">0</div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Onay Bekliyor</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(34,197,94,.25);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;background:rgba(34,197,94,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✅</div>
    <div><div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;color:#16A34A" id="pp-ok">0</div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Onaylı</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(239,68,68,.25);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;background:rgba(239,68,68,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔴</div>
    <div><div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;line-height:1;color:#DC2626" id="pp-ab">0</div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Devamsız</div></div>
  </div>
</div>

<!-- Filtre araçları -->
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--s2);padding:10px 14px;border-radius:14px;margin-bottom:16px">
  <select class="fi" id="pf-puser" style="width:180px;display:none;font-size:13px" onchange="renderPuantaj()"></select>
  <input type="month" class="fi" id="pf-month" style="width:160px;font-size:13px" onchange="renderPuantaj()">
  <div style="display:flex;gap:10px;margin-left:auto;align-items:center">
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
      <label class="psw"><input type="checkbox" id="p-ot" checked onchange="renderPuantaj()"><span class="psl"></span></label>
      Fazla Mesai
    </label>
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
      <label class="psw"><input type="checkbox" id="p-ut" checked onchange="renderPuantaj()"><span class="psl"></span></label>
      Eksik Süre
    </label>
  </div>
</div>

<!-- Tablo -->
<div style="border:1.5px solid var(--b);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)">
  <table style="width:100%;border-collapse:collapse">
    <thead><tr id="pt-head" style="background:var(--s2);border-bottom:2px solid var(--b)"></tr></thead>
    <tbody id="pt-body"></tbody>
  </table>
</div>

<!-- Personel özet (dinamik) -->
<div id="puan-summary-cont" style="margin-top:18px"></div>
  `;
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDER
// ════════════════════════════════════════════════════════════════

function renderPuantajPanel() {
  _injectPuantajPanel();
  if (typeof window.renderPuantaj === 'function') {
    window.renderPuantaj();
  }
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Puantaj = { render: renderPuantajPanel, inject: _injectPuantajPanel };

if (typeof module !== 'undefined' && module.exports) { module.exports = Puantaj; }
else {
  window.Puantaj = Puantaj;
  // renderPuantaj zaten ik.js'den geliyor; panel inject'ini wrap et
  const _origRenderPuantaj = window.renderPuantaj;
  window.renderPuantaj = function() {
    _injectPuantajPanel();
    if (_origRenderPuantaj) _origRenderPuantaj();
  };
}
