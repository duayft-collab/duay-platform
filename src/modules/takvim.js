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
  var panel = _gt('panel-takvim');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  // Helper: single quotes içinde güvenli onclick — data-* attribute ile
  panel.innerHTML = '<div id="cal-header-row" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">'
    + '<div><div style="font-size:22px;font-weight:700;letter-spacing:-.5px;color:var(--t)" id="cal-lbl"></div>'
    + '<div style="font-size:12px;color:var(--t3);margin-top:2px" id="cal-sub-lbl"></div></div>'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'

    // Görünüm toggle
    + '<div class="cal-view-toggle">'
    + '<button class="cvb on" id="cal-v-month" data-view="month" style="display:flex;align-items:center;gap:5px"><svg width="13" height="13" fill="none" viewBox="0 0 13 13"><rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="1" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="7" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="7" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.3"/></svg><span>Ay</span></button>'
    + '<button class="cvb" id="cal-v-week" data-view="week" style="display:flex;align-items:center;gap:5px"><svg width="13" height="13" fill="none" viewBox="0 0 13 13"><rect x="1" y="1" width="11" height="2.5" rx=".8" fill="currentColor" opacity=".4"/><rect x="1" y="5.2" width="11" height="2.5" rx=".8" fill="currentColor" opacity=".7"/><rect x="1" y="9.5" width="11" height="2.5" rx=".8" fill="currentColor"/></svg><span>Hafta</span></button>'
    + '<button class="cvb" id="cal-v-list" data-view="agenda" style="display:flex;align-items:center;gap:5px"><svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M1 3h11M1 6.5h11M1 10h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg><span>Ajanda</span></button>'
    + '</div>'

    // Nav
    + '<div style="display:flex;align-items:center;gap:2px;background:var(--s2);border-radius:9px;padding:3px">'
    + '<button class="cvb cal-nav-btn" data-dir="-1" style="padding:5px 10px;font-size:17px;line-height:1;font-weight:300">&#8249;</button>'
    + '<button class="cvb cal-today-btn" style="font-size:12px;padding:5px 12px">Bugün</button>'
    + '<button class="cvb cal-nav-btn" data-dir="1"  style="padding:5px 10px;font-size:17px;line-height:1;font-weight:300">&#8250;</button>'
    + '</div>'
    + '<button class="btn btnp cal-add-btn" style="border-radius:9px;display:inline-flex;align-items:center;gap:6px">'
    + '<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Etkinlik Ekle</button>'
    + '</div></div>'

    // Chips
    + '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap" id="cal-type-chips">'
    + '<button class="cal-chip on" data-filter="all">Tümü</button>'
    + '<button class="cal-chip" data-filter="meeting">🤝 Toplantı</button>'
    + '<button class="cal-chip" data-filter="deadline">&#9200; Son Tarih</button>'
    + '<button class="cal-chip" data-filter="holiday">🎉 Tatil</button>'
    + '<button class="cal-chip" data-filter="task">&#128203; Görev</button>'
    + '</div>'

    // Grid
    + '<div style="display:grid;grid-template-columns:1fr 272px;gap:16px;align-items:start" id="cal-main-grid">'
    + '<div>'
    + '<div class="cal-card" id="cal-month-card"><div class="cg" id="cal-wd"></div><div class="cg" id="cal-days"></div></div>'
    + '<div id="cal-week-view" style="display:none"></div>'
    + '<div id="cal-agenda-view" style="display:none"></div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:12px">'
    + '<div class="cal-side-card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div style="font-size:12px;font-weight:600;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="cal-sel-l">Bir gün seçin.</div>'
    + '<button class="btn btns cal-add-btn" style="font-size:11px;padding:3px 10px;flex-shrink:0">+ Ekle</button>'
    + '</div><div id="cal-sel-ev"></div></div>'
    + '<div class="cal-side-card"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:11px">&#128202; Bu Ay</div><div id="cal-month-stats"></div></div>'
    + '<div class="cal-side-card"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:11px">&#128197; Yaklaşan</div><div id="cal-upc"></div></div>'
    + '<div class="cal-side-card"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Türler</div><div id="cal-legend"></div></div>'
    + '</div></div>';

  // Event delegation — onclick yerine addEventListener
  panel.addEventListener('click', function(e) {
    // Görünüm butonları
    var viewBtn = e.target.closest('[data-view]');
    if (viewBtn) { setCalView(viewBtn.dataset.view, viewBtn); return; }
    // Nav butonları
    var navBtn = e.target.closest('.cal-nav-btn');
    if (navBtn) { calNav(parseInt(navBtn.dataset.dir)); return; }
    // Bugün butonu
    if (e.target.closest('.cal-today-btn')) { calNav(0, true); return; }
    // Etkinlik ekle
    if (e.target.closest('.cal-add-btn')) { openEvModal(); return; }
    // Chip filtreler
    var chip = e.target.closest('.cal-chip');
    if (chip) { setCalTypeFilter(chip.dataset.filter, chip); return; }
  });
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
  // Buton toggle
  document.querySelectorAll('.cvb[id^="cal-v-"]').forEach(function(b){ b.classList.remove('on','active'); });
  if (btn) btn.classList.add('on');

  // CAL_VIEW güncelle — Object.defineProperty setter tetikler
  try { window.CAL_VIEW = view; } catch(e) {}

  // Cache temizle
  if (typeof window.invalidateCalCache === 'function') window.invalidateCalCache();

  // Görünüm divlerini anında ayarla (renderCal beklenmeden)
  var mc  = document.getElementById('cal-month-card');
  var wkv = document.getElementById('cal-week-view');
  var agv = document.getElementById('cal-agenda-view');
  if (mc)  mc.style.display  = (view === 'month')  ? '' : 'none';
  if (wkv) wkv.style.display = (view === 'week')   ? 'block' : 'none';
  if (agv) agv.style.display = (view === 'agenda') ? 'block' : 'none';

  // renderCal çağır
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
