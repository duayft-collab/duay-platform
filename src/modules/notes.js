/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/notes.js  —  v8.1.0
 * Notlar Paneli — HTML Inject + helpers.js fonksiyonlarını bağlar
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';

const _gn  = id => document.getElementById(id);
const _stn = (id,v) => { const el = _gn(id); if (el) el.textContent = v; };

function _injectNotesPanel() {
  const panel = _gn('panel-notes');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';
  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">📝 <span id="ph-nt">Notlar</span></div><div class="phs">Kişisel notlarınız ve fikirleriniz.</div></div>
  <button class="btn btnp" onclick="openNoteModal(null)">+ Not Ekle</button>
</div>
<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
  <input class="si" id="nt-search" style="flex:1;min-width:160px;padding:7px 12px" placeholder="🔍 Ara..." oninput="renderNotes()">
  <select class="si" id="nt-cat-f" style="width:150px;padding:7px 10px;font-size:12px" onchange="renderNotes()">
    <option value="">Tüm Kategoriler</option>
    <option value="genel">📌 Genel</option><option value="fikir">💡 Fikir</option>
    <option value="toplanti">🤝 Toplantı</option><option value="gorev">✅ Görev Notu</option><option value="ozel">🔒 Özel</option>
  </select>
  <select class="si" id="nt-sort" style="width:140px;padding:7px 10px;font-size:12px" onchange="renderNotes()">
    <option value="newest">En yeni</option><option value="oldest">En eski</option><option value="az">A→Z</option><option value="pinned">Pinliler önce</option>
  </select>
  <div style="display:flex;gap:4px">
    <button class="btn btns on" id="nt-v-grid" onclick="setNoteView('grid',this)" title="Grid">⊞</button>
    <button class="btn btns" id="nt-v-list" onclick="setNoteView('list',this)" title="Liste">☰</button>
  </div>
</div>
<div id="notes-cont"></div>
  `;
}

// ════════════════════════════════════════════════════════════════
// NOT GÖRÜNÜM GEÇİŞİ
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// PANEL RENDER
// ════════════════════════════════════════════════════════════════

function renderNotesPanel() {
  _injectNotesPanel();
  if (typeof window.renderNotes === 'function') {
    window.renderNotes();
  }
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Notes = { render: renderNotesPanel, inject: _injectNotesPanel };

if (typeof module !== 'undefined' && module.exports) { module.exports = Notes; }
else {
  window.Notes       = Notes;
  
  // renderNotes zaten helpers.js'den geliyor, sadece inject'i sağla
  const _origRenderNotes = window.renderNotes;
  window.renderNotes = function() {
    _injectNotesPanel();
    // Not sayacı
    const notes  = (typeof loadNotes === 'function') ? loadNotes() : [];
    const cu     = window.Auth?.getCU?.();
    const myNotes = notes.filter(n => n.uid === cu?.id || window.Auth?.isAdmin?.());
    _stn('nt-total',  myNotes.length);
    _stn('nt-pinned', myNotes.filter(n => n.pinned).length);
    if (_origRenderNotes) _origRenderNotes();
  };
}

})();
