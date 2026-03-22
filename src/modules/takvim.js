/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/takvim.js  —  v8.1.0
 * Takvim Panel — HTML Inject + helpers.js fonksiyonlarını bağlar
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _gt  = id  => document.getElementById(id);
const _p2t = n   => String(n).padStart(2,'0');

function _injectTakvimPanel() {
  const panel = _gt('panel-takvim');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <!-- Header -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
  <div>
    <div class="pht" style="font-size:20px;font-weight:700;letter-spacing:-.4px" id="cal-lbl"></div>
    <div style="font-size:12px;color:var(--t2);margin-top:2px" id="cal-sub-lbl"></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <!-- Görünüm toggle -->
    <div style="display:flex;background:var(--s2);border-radius:8px;padding:3px;gap:2px">
      <button class="cvb on" id="cal-v-month" onclick="setCalView('month',this)">
        <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="7" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="7" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
        Ay
      </button>
      <button class="cvb" id="cal-v-week" onclick="setCalView('week',this)">
        <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><rect x="1" y="1" width="11" height="2.5" rx=".8" fill="currentColor" opacity=".5"/><rect x="1" y="5.3" width="11" height="2.5" rx=".8" fill="currentColor" opacity=".7"/><rect x="1" y="9.5" width="11" height="2.5" rx=".8" fill="currentColor"/></svg>
        Hafta
      </button>
      <button class="cvb" id="cal-v-list" onclick="setCalView('agenda',this)">
        <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M1 3h11M1 6.5h11M1 10h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Ajanda
      </button>
    </div>
    <!-- Navigasyon -->
    <div style="display:flex;align-items:center;gap:4px">
      <button class="btn btns" onclick="calNav(-1)" style="width:32px;height:32px;padding:0;justify-content:center;border-radius:50%;font-size:16px">‹</button>
      <button class="btn btns" onclick="calNav(0,true)" style="font-size:12px;padding:6px 12px">Bugün</button>
      <button class="btn btns" onclick="calNav(1)" style="width:32px;height:32px;padding:0;justify-content:center;border-radius:50%;font-size:16px">›</button>
    </div>
    <button class="btn btnp" onclick="openEvModal()" id="btn-ev" style="gap:6px">
      <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Etkinlik Ekle
    </button>
  </div>
</div>

<!-- Hızlı filtre chips -->
<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap" id="cal-type-chips">
  <button class="chip on" onclick="setCalTypeFilter('all',this)">Tümü</button>
  <button class="chip" onclick="setCalTypeFilter('meeting',this)" style="--chip-color:#0C447C">🤝 Toplantı</button>
  <button class="chip" onclick="setCalTypeFilter('deadline',this)">⏰ Son Tarih</button>
  <button class="chip" onclick="setCalTypeFilter('holiday',this)">🎉 Etkinlik</button>
  <button class="chip" onclick="setCalTypeFilter('task',this)">📋 Görev</button>
</div>

<!-- Ana içerik -->
<div style="display:grid;grid-template-columns:1fr 290px;gap:20px;align-items:start" id="cal-main-grid">

  <!-- Sol: Takvim -->
  <div>
    <div class="cal-card" id="cal-month-card">
      <div class="cg" id="cal-wd"></div>
      <div class="cg" id="cal-days" style="margin-top:0"></div>
    </div>
    <div id="cal-week-view" style="display:none"></div>
    <div id="cal-agenda-view" style="display:none"></div>
  </div>

  <!-- Sağ panel -->
  <div style="display:flex;flex-direction:column;gap:14px">

    <!-- Seçili gün -->
    <div class="cal-side-card" id="cal-day-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--t)" id="cal-sel-l">—</div>
        <button class="btn btns" onclick="openEvModal()" style="font-size:11px;padding:4px 10px">+ Ekle</button>
      </div>
      <div id="cal-sel-ev"><div style="font-size:12px;color:var(--t2);padding:8px 0">Bir gün seçin.</div></div>
    </div>

    <!-- Ay istatistikleri -->
    <div class="cal-side-card">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <span style="width:16px;height:16px;background:var(--al);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:9px">📊</span>
        Bu Ay
      </div>
      <div id="cal-month-stats"></div>
    </div>

    <!-- Yaklaşanlar -->
    <div class="cal-side-card">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <span style="width:16px;height:16px;background:var(--al);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:9px">🗓</span>
        Yaklaşan
      </div>
      <div id="cal-upc"></div>
    </div>

    <!-- Renk efsanesi -->
    <div class="cal-side-card">
      <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Etkinlik Türleri</div>
      <div id="cal-legend"></div>
    </div>

  </div>
</div>
  `;
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDER — helpers.js'deki renderCal'ı çağırır
// ════════════════════════════════════════════════════════════════

function renderTakvimPanel() {
  _injectTakvimPanel();
  // helpers.js'in renderCal fonksiyonu tüm işi yapar
  if (typeof window.renderCal === 'function') {
    window.renderCal();
  }
  if (typeof window.checkYaklasanEtkinlikler === 'function') {
    setTimeout(window.checkYaklasanEtkinlikler, 100);
  }
}

// setCalView — helpers.js'den gelir, panel view butonlarını aktifler
function setCalView(view, btn) {
  document.querySelectorAll('#panel-takvim .btn').forEach(b => {
    if (['cal-v-month','cal-v-week','cal-v-agenda'].includes(b.id)) b.classList.remove('on');
  });
  if (btn) btn.classList.add('on');
  if (typeof window.CAL_VIEW !== 'undefined') window.CAL_VIEW = view;
  // helpers.js'deki set fonksiyonlarına yönlendir
  if (view === 'week')   { window.CAL_VIEW = 'week';   }
  if (view === 'agenda') { window.CAL_VIEW = 'agenda'; }
  if (view === 'month')  { window.CAL_VIEW = 'month';  }
  if (typeof window.renderCal === 'function') window.renderCal();
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Takvim = { render: renderTakvimPanel, inject: _injectTakvimPanel, setView: setCalView };

if (typeof module !== 'undefined' && module.exports) { module.exports = Takvim; }
else {
  window.Takvim = Takvim;
  window.setCalView = setCalView;

  // helpers.js renderCal'ı var — onu inject ile wrap et
  const _origRenderCal = window.renderCal;
  window.renderCal = function() {
    _injectTakvimPanel();
    if (_origRenderCal) _origRenderCal();
    else renderTakvimPanel();
  };
}
