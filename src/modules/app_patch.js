/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/app_patch.js  —  v8.1.0
 * app.js'e dokunmadan V18 yeni panellerinin routing'ini ekler
 * index.html'de app.js'den HEMEN SONRA yüklenmeli
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)

(function patchAppNav() {
  // App.nav çağrıldığında yeni paneller için render tetikle
  // _renderPanel App içinde private olduğu için nav'ı wrap ediyoruz

  const _newPanels = {
    docs:    () => { window.renderDocs?.(); },
    formlar: () => { window.renderFormlar?.(); },
    gorusme: () => { window.renderGorusme?.(); window.updateGrtBadge?.(); },
    ceo:     () => { window.renderCeo?.(); },
    stok:    () => { window.Stok?.render?.(); window.renderDemirbaslar?.(); },
    satinalma: () => { window.renderSatinAlma?.(); },
    'urun-db': () => { window.renderUrunDB?.(); },
    'satis-teklif': () => { window.renderSatisTeklif?.(); },
    cari: () => { window.renderCari?.(); },
    lojistik:() => { window.Lojistik?.render?.(); },
    'ik-hub':() => { const p=document.getElementById('panel-ik-hub'); if(p && window.IkHub) { IkHub.inject(p); IkHub.render?.(); } },
    hesap:   () => { window.renderHesapHistory?.(); },
    notes:   () => { window.renderNotes?.(); },
    'finans': () => { window.renderFinans?.() || window.Finans?.render?.(); },
    'kpi-panel': () => { window.renderKpiPanel?.() || window.KPI?.render?.(); },
    'users': () => { window.renderUsers?.() || window.Admin?.renderUsers?.(); },
    'activity': () => { window.renderActivity?.(); },
    'trash': () => { window.renderTrashPanel?.(); },
    'links': () => { window.renderLinks?.(); },
    'numune': () => { window.renderNumune?.(); },
    'evrak': () => { window.renderEvrak?.(); },
    'arsiv': () => { window.renderArsiv?.(); },
    'etkinlik': () => { window.renderEtkinlik?.(); },
    'tebligat': () => { window.renderTebligat?.(); },
    'resmi': () => { window.renderResmi?.(); },
    'temizlik': () => { window.renderTemizlik?.(); },
    'rehber': () => { window.renderRehber?.(); },
  };

  // App.nav wrap — yeni paneller için ekstra render çağrısı
  const _origNav = window.App?.nav?.bind(window.App) || window.nav;

  function _patchedNav(id, btn) {
    // Önce orijinal nav çalışsın (panel show/hide + sidebar active)
    if (typeof _origNav === 'function') _origNav(id, btn);

    // Sonra yeni panel varsa render et
    const fn = _newPanels[id];
    if (fn) {
      try { fn(); } catch (e) { console.warn('[app_patch] render hatası:', id, e); }
    }
  }

  // App nesnesini patch et
  if (window.App) {
    window.App.nav = _patchedNav;
  }
  // Geriye uyumluluk için window.nav de patch et
  window.nav = _patchedNav;

  // goTo de çalışsın
  const _origGoTo = window.goTo;
  window.goTo = function(id) {
    const btn = document.querySelector(`.nb[onclick*="'${id}'"]`);
    _patchedNav(id, btn);
  };

  // updateGrtBadge yeni modüle devredildi — app.js updateAllBadges'e de ekle
  const _origUpdateAll = window.updateAllBadges;
  window.updateAllBadges = function() {
    if (typeof _origUpdateAll === 'function') _origUpdateAll();
    try { window.updateGrtBadge?.(); } catch(e) {}
  };

  console.log('[app_patch] V18 panel routing aktif: docs, formlar, gorusme, ceo, hesap');
})();


// ════════════════════════════════════════════════════════════════
// V18 UYUMLULUK FONKSİYONLARI — kargo.js'de olmayan ama HTML'de çağrılan
// ════════════════════════════════════════════════════════════════

// Kargo filtre
let KARGO_FILTER = 'all';
window.setKargoFilter = function(f, btn) {
  KARGO_FILTER = f;
  document.querySelectorAll('#panel-kargo .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  window.Kargo?.render?.();
};

// Kargo firma modal
window.openKargoFirmaModal = function() {
  if (typeof renderKargoFirmaList === 'function') renderKargoFirmaList();
  const addRow = document.getElementById('krg-firma-add-row');
  if (addRow) addRow.style.display = 'none';
  const nameInp = document.getElementById('krg-firma-new-name');
  if (nameInp) nameInp.value = '';
  window.openMo?.('mo-krg-firma');
};

// openKonteynModal - modals.js'deki saveKonteyn ile çalışır
window.openKonteynModal = window.openKonteynModal || function(editId) {
  const eidEl = document.getElementById('ktn-eid');
  if (eidEl) eidEl.value = editId || '';
  // Personel select'i doldur
  const sel = document.getElementById('ktn-user');
  if (sel && sel.options.length <= 1) {
    const users = typeof loadUsers === 'function' ? loadUsers() : [];
    sel.innerHTML = '<option value="">Sorumlu seçin...</option>' +
      users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
  }
  if (editId) {
    const k = (typeof loadKonteyn === 'function' ? loadKonteyn() : []).find(x => x.id === editId);
    if (k) {
      ['ktn-no','ktn-seal','ktn-hat','ktn-etd','ktn-eta','ktn-url','ktn-desc','ktn-ihracat-id','ktn-musteri'].forEach(id => {
        const el = document.getElementById(id);
        const key = id.replace('ktn-','').replace('-','_');
        if (el) el.value = k[key] || k[id.replace('ktn-','')] || '';
      });
      const sealEl = document.getElementById('ktn-seal');
      if (sealEl) sealEl.value = k.seal || '';
      if (sel) sel.value = String(k.uid || '');
      // Süreç checkbox'ları
      ['ktn-evrak-gon','ktn-evrak-ulasti','ktn-inspection','ktn-mal-teslim'].forEach(id => {
        const el = document.getElementById(id);
        const key = id.replace('ktn-','').replace(/-/g,'').replace('evrakgon','evrakGon').replace('evrakulasti','evrakUlasti').replace('inspection','inspectionBitti').replace('malteslim','malTeslim');
        if (el) el.checked = !!k[key];
      });
      document.getElementById('mo-ktn-t') && (document.getElementById('mo-ktn-t').textContent = '✏️ Konteyner Düzenle');
    }
  } else {
    ['ktn-no','ktn-seal','ktn-hat','ktn-etd','ktn-eta','ktn-url','ktn-desc','ktn-ihracat-id','ktn-musteri'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['ktn-evrak-gon','ktn-evrak-ulasti','ktn-inspection','ktn-mal-teslim'].forEach(id => {
      const el = document.getElementById(id); if (el) el.checked = false;
    });
    document.getElementById('mo-ktn-t') && (document.getElementById('mo-ktn-t').textContent = '+ Konteyner Ekle');
  }
  window.openMo?.('mo-konteyn');
};

// saveKonteyn — Konteyner kaydetme (yeni/güncelleme)
window.saveKonteyn = window.saveKonteyn || function() {
  const no   = (document.getElementById('ktn-no')?.value || '').trim();
  const seal = (document.getElementById('ktn-seal')?.value || '').trim();
  if (!no)   { window.toast?.('Konteyner numarası zorunludur', 'err'); return; }
  if (!seal) { window.toast?.('Mühür numarası zorunludur', 'err'); return; }

  const eid = parseInt(document.getElementById('ktn-eid')?.value || '0');
  const d   = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const entry = {
    no, seal,
    hat:            document.getElementById('ktn-hat')?.value || '',
    'from-port':    document.getElementById('ktn-from-port')?.value || '',
    'to-port':      document.getElementById('ktn-to-port')?.value || '',
    etd:            document.getElementById('ktn-etd')?.value || '',
    eta:            document.getElementById('ktn-eta')?.value || '',
    desc:           document.getElementById('ktn-desc')?.value || '',
    uid:            parseInt(document.getElementById('ktn-user')?.value || '0') || null,
    url:            document.getElementById('ktn-url')?.value || '',
    ihracatId:      document.getElementById('ktn-ihracat-id')?.value || '',
    musteri:        document.getElementById('ktn-musteri')?.value || '',
    evrakGon:       document.getElementById('ktn-evrak-gon')?.checked || false,
    evrakUlasti:    document.getElementById('ktn-evrak-ulasti')?.checked || false,
    inspectionBitti:document.getElementById('ktn-inspection')?.checked || false,
    malTeslim:      document.getElementById('ktn-mal-teslim')?.checked || false,
  };

  if (eid) {
    const k = d.find(x => x.id === eid);
    if (k) Object.assign(k, entry);
  } else {
    d.push({ id: generateNumericId(), closed: false, viewers: [], ...entry, createdAt: window.nowTs?.() || new Date().toISOString() });
  }
  if (typeof storeKonteyn === 'function') storeKonteyn(d);
  window.closeMo?.('mo-konteyn');
  window.toast?.(eid ? 'Konteyner güncellendi ✓' : 'Konteyner eklendi ✓', 'ok');
  window.logActivity?.('kargo', (eid ? 'Konteyner güncellendi: ' : 'Konteyner eklendi: ') + no);
  // Render tetikle
  if (typeof window._renderNavlunList === 'function') window._renderNavlunList();
  if (typeof window.renderKargo === 'function') window.renderKargo();
  if (typeof window.Lojistik?.render === 'function') window.Lojistik.render();
};

/** Konteynır izleme izni yönetimi (admin only) */
window.manageKonteynViewers = function(id) {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === id; });
  if (!k) return;
  var users = typeof loadUsers === 'function' ? loadUsers().filter(function(u) { return u.status === 'active'; }) : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var viewers = k.viewers || [];
  var ex = document.getElementById('mo-ktn-viewers'); if (ex) ex.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-ktn-viewers'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">👁 Konteyner İzleme İzni — ' + esc(k.no) + '</div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    + users.map(function(u) {
        var isViewer = viewers.includes(u.id);
        return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);cursor:pointer;font-size:12px">'
          + '<input type="checkbox" class="ktn-viewer-cb" value="' + u.id + '"' + (isViewer ? ' checked' : '') + ' style="accent-color:var(--ac)">'
          + esc(u.name) + ' <span style="color:var(--t3);font-size:10px">(' + u.role + ')</span></label>';
      }).join('')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-ktn-viewers\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveKtnViewers(' + id + ')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._saveKtnViewers = function(id) {
  var konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  var k = konts.find(function(x) { return x.id === id; });
  if (!k) return;
  var newViewers = [];
  document.querySelectorAll('.ktn-viewer-cb:checked').forEach(function(cb) { newViewers.push(parseInt(cb.value)); });
  k.viewers = newViewers;
  if (typeof storeKonteyn === 'function') storeKonteyn(konts);
  document.getElementById('mo-ktn-viewers')?.remove();
  window.toast?.('İzleme izinleri güncellendi ✓', 'ok');
};

// openKonteynDetail — Konteyner detay modalı (accordion yapıda)
window.openKonteynDetail = window.openKonteynDetail || function(id) {
  const konts = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const k = konts.find(x => x.id === id);
  if (!k) return;
  const users = typeof loadUsers === 'function' ? loadUsers() : [];
  const u = users.find(x => x.id === k.uid) || { name: '—' };
  const steps = [
    { key:'evrakGon',       l:'Evrak Gönderildi',           v:k.evrakGon },
    { key:'evrakUlasti',    l:'Müşteri Evrakları Teslim Aldı', v:k.evrakUlasti },
    { key:'inspectionBitti',l:'Inspection Tamamlandı',        v:k.inspectionBitti },
    { key:'malTeslim',      l:'Müşteri Malları Teslim Aldı',  v:k.malTeslim },
  ];
  const pct = Math.round(steps.filter(s => s.v).length / steps.length * 100);
  const isAdmin = window.isAdmin?.();

  // Viewers/izin listesi
  const viewerNames = (k.viewers || []).map(vid => {
    const vu = users.find(x => x.id === vid);
    return vu ? escapeHtml(vu.name) : '?';
  });

  const old = document.getElementById('mo-ktn-detail');
  if (old) old.remove();
  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-ktn-detail'; mo.style.zIndex = '2100';
  mo.innerHTML = `<div class="moc" style="max-width:520px;padding:0;border-radius:12px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:15px;font-weight:700;color:var(--t)">🚢 ${escapeHtml(k.no || '—')}</span>
      <button onclick="document.getElementById('mo-ktn-detail').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>
    </div>
    <div style="padding:16px 20px;max-height:75vh;overflow-y:auto">
      <!-- Mühür + Hat -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase">Mühür No</div><div style="font-size:13px;font-weight:600;color:var(--t);font-family:'DM Mono',monospace">${escapeHtml(k.seal || '—')}</div></div>
        <div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase">Hat / Armatör</div><div style="font-size:13px;color:var(--t)">${escapeHtml(k.hat || '—')}</div></div>
      </div>
      <!-- Progress -->
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;font-weight:600;color:var(--t3)">İLERLEME</span><span style="font-size:11px;font-weight:700;color:var(--ac)">${pct}%</span></div>
        <div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct===100?'#22C55E':'var(--ac)'};border-radius:3px;transition:width .3s"></div></div>
      </div>
      <!-- Accordion: Süreç Adımları -->
      <div class="ktn-acc" style="border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:10px">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('._arr').classList.toggle('_open')" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">
          <span style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase">Süreç Adımları</span>
          <span class="_arr" style="font-size:10px;color:var(--t3);transition:transform .2s">▼</span>
        </div>
        <div style="display:none">${steps.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--b)"><span style="font-size:14px">${s.v ? '✅' : '⬜'}</span><span style="font-size:12px;color:var(--t)">${s.l}</span></div>`).join('')}</div>
      </div>
      <!-- Accordion: Rota & Tarihler -->
      <div class="ktn-acc" style="border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:10px">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('._arr').classList.toggle('_open')" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">
          <span style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase">Rota & Tarihler</span>
          <span class="_arr" style="font-size:10px;color:var(--t3);transition:transform .2s">▼</span>
        </div>
        <div style="display:none;padding:10px 14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div><span style="color:var(--t3)">Yükleme:</span> ${escapeHtml(k['from-port'] || '—')}</div>
            <div><span style="color:var(--t3)">Varış:</span> ${escapeHtml(k['to-port'] || '—')}</div>
            <div><span style="color:var(--t3)">ETD:</span> ${k.etd || '—'}</div>
            <div><span style="color:var(--t3)">ETA:</span> ${k.eta || '—'}</div>
          </div>
          <div style="margin-top:8px;font-size:12px"><span style="color:var(--t3)">Sorumlu:</span> ${escapeHtml(u.name)}</div>
          ${k.desc ? `<div style="margin-top:6px;font-size:12px;color:var(--t2)">${escapeHtml(k.desc)}</div>` : ''}
        </div>
      </div>
      <!-- Accordion: Takip İzinleri (admin) -->
      ${isAdmin ? `<div class="ktn-acc" style="border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:10px">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('._arr').classList.toggle('_open')" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">
          <span style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase">Takip İzinleri (${(k.viewers||[]).length} kişi)</span>
          <span class="_arr" style="font-size:10px;color:var(--t3);transition:transform .2s">▼</span>
        </div>
        <div style="display:none;padding:10px 14px">
          <div id="ktn-viewers-${id}" style="margin-bottom:8px">${viewerNames.length ? viewerNames.map(n => `<span style="display:inline-block;font-size:11px;background:var(--s2);padding:2px 8px;border-radius:5px;margin:2px">${n}</span>`).join('') : '<span style="font-size:11px;color:var(--t3)">Henüz izin verilmemiş</span>'}</div>
          <div style="display:flex;gap:6px">
            <select id="ktn-add-viewer-${id}" class="fi" style="flex:1;font-size:12px">
              <option value="">Kullanıcı seçin…</option>
              ${users.filter(ux => ux.id !== k.uid && !(k.viewers||[]).includes(ux.id)).map(ux => `<option value="${ux.id}">${escapeHtml(ux.name)}</option>`).join('')}
            </select>
            <button class="btn btnp" style="font-size:11px;padding:4px 12px" onclick="window._addKtnViewer(${id})">+ İzin Ver</button>
          </div>
        </div>
      </div>` : ''}
    </div>
  </div>`;
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
};

// Konteyner takip izni ekle/kaldır
window._addKtnViewer = function(ktnId) {
  const sel = document.getElementById('ktn-add-viewer-' + ktnId);
  const uid = parseInt(sel?.value || '0');
  if (!uid) { window.toast?.('Kullanıcı seçin', 'err'); return; }
  const d = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const k = d.find(x => x.id === ktnId);
  if (!k) return;
  if (!k.viewers) k.viewers = [];
  if (!k.viewers.includes(uid)) k.viewers.push(uid);
  if (typeof storeKonteyn === 'function') storeKonteyn(d);
  window.toast?.('Takip izni verildi ✓', 'ok');
  // Detay modalını yeniden aç
  document.getElementById('mo-ktn-detail')?.remove();
  window.openKonteynDetail(ktnId);
};
window._removeKtnViewer = function(ktnId, uid) {
  const d = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const k = d.find(x => x.id === ktnId);
  if (!k) return;
  k.viewers = (k.viewers || []).filter(v => v !== uid);
  if (typeof storeKonteyn === 'function') storeKonteyn(d);
  window.toast?.('Takip izni kaldırıldı', 'ok');
  document.getElementById('mo-ktn-detail')?.remove();
  window.openKonteynDetail(ktnId);
};

// exportTasksXlsx — Pusula'dan alias
window.exportTasksXlsx = window.exportTasksXlsx || function() {
  window.Pusula?.exportXlsx?.();
};

// openEvModal — Takvim etkinlik modal
window.openEvModal = window.openEvModal || function() {
  window.openMo?.('mo-cal');
};

// calNav — Takvim navigasyon
window.calNav = window.calNav || function(dir, goToday) {
  if (typeof window.calNav_orig === 'function') window.calNav_orig(dir, goToday);
};

// setCalView
window.setCalView = window.setCalView || function(v, btn) {
  if (typeof window.setCalView_orig === 'function') window.setCalView_orig(v, btn);
};

// setCalTypeFilter
window.setCalTypeFilter = window.setCalTypeFilter || function(f, btn) {
  if (typeof window.setCalTypeFilter_orig === 'function') window.setCalTypeFilter_orig(f, btn);
};

// puanExport
window.puanExport = window.puanExport || function() {
  window.renderPuantaj && window.renderPuantaj();
};

// openPuanModal
window.openPuanModal = window.openPuanModal || function() {
  window.openMo?.('mo-puan');
};

// setNoteView
window.setNoteView = window.setNoteView || function(v, btn) {
  document.querySelectorAll('#nt-v-grid, #nt-v-list').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  window.renderNotes?.();
};

// openNoteModal
window.openNoteModal = window.openNoteModal || function(id) {
  window.openMo?.('mo-note');
};

// exportHdfXlsx, openHdfModal
window.exportHdfXlsx = window.exportHdfXlsx || function() {};
window.openHdfModal   = window.openHdfModal   || function() { window.openMo?.('mo-hdf'); };

// setOdmView
window.setOdmView = window.setOdmView || function(v, btn) {
  const listEl = document.getElementById('odm-list');
  const calEl  = document.getElementById('odm-calendar-view');
  const lBtn   = document.getElementById('odm-view-list-btn');
  const cBtn   = document.getElementById('odm-view-cal-btn');
  if (v === 'list') {
    if (listEl) listEl.style.display = '';
    if (calEl)  calEl.style.display  = 'none';
    if (lBtn) lBtn.classList.add('on'); if (cBtn) cBtn.classList.remove('on');
  } else {
    if (listEl) listEl.style.display = 'none';
    if (calEl)  calEl.style.display  = '';
    if (lBtn) lBtn.classList.remove('on'); if (cBtn) cBtn.classList.add('on');
    window.renderOdmCalendar?.();
  }
};

// exportOdmXlsx, openOdmModal
window.exportOdmXlsx = window.exportOdmXlsx || function() {};
window.openOdmModal  = window.openOdmModal  || function() { window.openMo?.('mo-odm'); };

// importOdmFile
window.importOdmFile = window.importOdmFile || function() {
  document.getElementById('odm-import-file')?.click();
};
window.processOdmImport = window.processOdmImport || function() {};

// exportIkXlsx, openIkModal
window.exportIkXlsx = window.exportIkXlsx || function() {};

// checkFirebaseStatus
window.checkFirebaseStatus = window.checkFirebaseStatus || function() {
  window.Auth?.checkFirebaseStatus?.();
};

// migrateLocalToFirestore, resetAll, exportAllXlsx
window.migrateLocalToFirestore = function() {
  const fn = window.DB?.migrateToFirestore || window.migrateToFirestore;
  if (typeof fn === 'function') {
    fn().catch(e => {
      console.error('[migrate]', e);
      window.toast?.('Aktarım başarısız: ' + e.message, 'err');
    });
  } else {
    window.toast?.('Firebase bağlantısı kurulamadı', 'err');
  }
};
window.resetAll = window.resetAll || function() {
  window.confirmModal('Tüm veriyi sıfırlamak istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ.', {
    title: 'Tüm Veriyi Sıfırla',
    danger: true,
    confirmText: 'Evet, Sıfırla',
    onConfirm: () => { window.App?.resetDemoData?.(); }
  });
};
window.exportAllXlsx = window.exportAllXlsx || function() {
  // Her modülün export fonksiyonunu çağır
  const fns = [
    window.exportTasksXlsx,
    window.Kargo?.exportXlsx,
    window.exportCalXlsx,
  ];
  let ran = 0;
  fns.forEach(fn => { if (typeof fn === 'function') { try { fn(); ran++; } catch(e) {} } });
  if (!ran) window.toast?.('Export fonksiyonu bulunamadı', 'err');
  else window.toast?.(`${ran} modül export edildi ✓`, 'ok');
};

// installPWA
window.installPWA = window.installPWA || function() {};

// setPusView v8 → setPusView alias
window.setPusView = window.setPusView || function(v, btn) {
  window.Pusula?.setView?.(v, btn);
};

console.log('[app_patch] V18 uyumluluk fonksiyonları yüklendi');

// ════════════════════════════════════════════════════════════════
// ALL_MODULES GÜNCELLEMESİ — V18 yeni paneller
// ════════════════════════════════════════════════════════════════
(function _extendAllModules() {
  if (typeof window.ALL_MODULES === 'undefined') return;

  const _new = [
    { id:'lojistik', label:'Lojistik Merkezi' },
    { id:'ik-hub',   label:'İnsan Kaynakları Merkezi' },
    { id:'docs',      label:'Döküman Yönetimi'    },
    { id:'formlar',   label:'Kurumsal Formlar'     },
    { id:'gorusme',   label:'Görüşme / Randevu'    },
    { id:'ceo',       label:'CEO Paneli'           },
    { id:'hesap',     label:'Hesap Makinesi'       },
    { id:'finans',    label:'Finans Paneli'        },
    { id:'activity',  label:'Aktivite Logu'        },
    { id:'trash',     label:'Çöp Kutusu'           },
    { id:'users',     label:'Kullanıcılar'         },
    { id:'kpi-panel', label:'KPI Özet'             },
    { id:'arsiv',     label:'Şirket Arşivi'        },
    { id:'tebligat',  label:'Tebligat'             },
    { id:'evrak',     label:'Personel Evrak'       },
    { id:'resmi',     label:'Resmi Evrak'          },
    { id:'temizlik',  label:'Temizlik Kontrol'     },
    { id:'rehber',    label:'Acil Rehber'          },
    { id:'numune',    label:'Numune Arşivi'        },
    { id:'etkinlik',  label:'Etkinlik / Fuar'      },
    { id:'links',     label:'Hızlı Linkler'        },
    { id:'satinalma', label:'Satın Alma'           },
    { id:'cari',      label:'Cari Yönetimi'        },
  ];

  const existing = new Set(window.ALL_MODULES.map(m => m.id));
  _new.forEach(m => {
    if (!existing.has(m.id)) {
      window.ALL_MODULES.push(m);
    }
  });

  // Admin rolüne tüm yeni modülleri ekle
  if (window.ROLE_DEFAULT_MODULES?.admin) {
    _new.forEach(m => {
      if (!window.ROLE_DEFAULT_MODULES.admin.includes(m.id)) {
        window.ROLE_DEFAULT_MODULES.admin.push(m.id);
      }
    });
  }

  // Manager rolüne uygun olanları ekle
  const managerExtras = ['docs','formlar','gorusme','hesap','finans',
                         'arsiv','tebligat','evrak','resmi','temizlik',
                         'rehber','numune','etkinlik','links',
                         'satinalma','cari'];
  if (window.ROLE_DEFAULT_MODULES?.manager) {
    managerExtras.forEach(id => {
      if (!window.ROLE_DEFAULT_MODULES.manager.includes(id)) {
        window.ROLE_DEFAULT_MODULES.manager.push(id);
      }
    });
  }

  // Lead ve Staff rollerine satinalma + hesap ekle
  const leadStaffExtras = ['satinalma','hesap'];
  ['lead','staff'].forEach(role => {
    if (window.ROLE_DEFAULT_MODULES?.[role]) {
      leadStaffExtras.forEach(id => {
        if (!window.ROLE_DEFAULT_MODULES[role].includes(id)) {
          window.ROLE_DEFAULT_MODULES[role].push(id);
        }
      });
    }
  });

  console.info('[app_patch] ALL_MODULES genişletildi:', window.ALL_MODULES.length, 'modül');
})();

// ── CRM routing override ─────────────────────────────────────────
// panel-crm artık CrmHub tarafından yönetiliyor
(function _overrideCrmRouting() {
  const _origRenderCrm = window.renderCrm;
  window.renderCrm = function() {
    if (window.CrmHub) {
      window.CrmHub.render();
    } else if (_origRenderCrm) {
      _origRenderCrm();
    }
  };
  // app.js'deki RENDERS objesine de ekle (geç bağlama)
  if (window.App && window.App._addRender) {
    window.App._addRender('crm', () => window.renderCrm());
  }
})();

// ════════════════════════════════════════════════════════════════
// MODÜL YETKİ SİSTEMİ — _applyRoleUI  [v2]
// Kullanıcının modules listesine göre sidebar gizle/göster
// App.nav wrap ile yetkisiz panel erişimini engelle
// ════════════════════════════════════════════════════════════════

window.MODULE_NAV_MAP = {
  'dashboard':  [],
  'announce':   ['nb-ann'],
  'takvim':     ['nb-tak'],
  'notes':      ['nb-nt'],
  'links':      ['nb-lnk'],
  'rehber':     [],
  'crm':        [],
  'gorusme':    [],
  'etkinlik':   [],
  'numune':     [],
  'lojistik':   ['nb-lojistik'],
  'stok':       [],
  'kargo':      [],
  'finans':     [],
  'odemeler':   [],
  'pirim':      [],
  'hesap':      [],
  'ik':         ['nb-ik-hub'],
  'ik-hub':     ['nb-ik-hub'],
  'evrak':      [],
  'temizlik':   [],
  'puantaj':    [],
  'docs':       ['nb-doc'],
  'formlar':    [],
  'arsiv':      [],
  'tebligat':   [],
  'resmi':      [],
  'pusula':     ['nb-pus'],
  'hedefler':   [],
  'ceo':        ['nb-ceo'],
  'kpi-panel':  ['nb-kpi-panel'],
  'admin':      ['nb-admin'],
  'activity':   ['nb-activity'],
  'settings':   ['nb-settings'],
  'trash':      ['nb-trash'],
};

window.PANEL_MODULE_MAP = {
  'dashboard':'dashboard','announce':'announce','takvim':'takvim',
  'notes':'notes','links':'links','rehber':'rehber',
  'crm':'crm','gorusme':'gorusme','etkinlik':'etkinlik','numune':'numune',
  'lojistik':'lojistik','stok':'stok','kargo':'kargo',
  'finans':'finans','odemeler':'odemeler','pirim':'pirim','hesap':'hesap',
  'ik-hub':'ik','ik':'ik','evrak':'evrak','temizlik':'temizlik','puantaj':'puantaj',
  'docs':'docs','formlar':'formlar','arsiv':'arsiv','tebligat':'tebligat','resmi':'resmi',
  'pusula':'pusula','hedefler':'hedefler',
  'ceo':'ceo','kpi-panel':'kpi-panel','admin':'admin',
  'activity':'activity','settings':'settings','trash':'trash',
};

function _applyRoleUI(user) {
  if (!user) return;
  const role    = user.role || 'staff';
  const isAdmin = role === 'admin';
  const modules = user.modules || window.ROLE_DEFAULT_MODULES?.[role] || [];

  // Admin — her şey görünür
  if (isAdmin) {
    document.querySelectorAll('.nb').forEach(b => b.style.display = '');
    document.querySelectorAll('.nsec-header, .nsec').forEach(h => h.style.display = '');
    return;
  }

  const allowed = new Set([...modules, 'dashboard', 'settings']);

  // Yardımcı: butondan panel ID çıkar
  // Önce onclick içeriğini okur (id olmayan butonlar için de çalışır)
  function _getPanelId(btn) {
    if (btn.dataset.panel) return btn.dataset.panel;
    const oc = btn.getAttribute('onclick') || '';
    const m  = oc.match(/nav\s*\(\s*['"]([^'"]+)['"]/);
    if (m) return m[1];
    if (btn.id && btn.id.startsWith('nb-')) return btn.id.replace('nb-', '');
    return null;
  }

  // 1. TÜM sidebar butonlarını tara — id'si olan da olmayan da
  document.querySelectorAll('.nb').forEach(btn => {
    const panelId = _getPanelId(btn);
    if (!panelId) return;
    if (['dashboard', 'settings'].includes(panelId)) { btn.style.display = ''; return; }
    // ik-hub → ik modülü
    const checkId = panelId === 'ik-hub' ? 'ik' : panelId;
    btn.style.display = (allowed.has(checkId) || allowed.has(panelId)) ? '' : 'none';
  });

  // 2. Bölüm başlıklarını — altında görünür buton yoksa gizle
  document.querySelectorAll('.nsec-header, .nsec').forEach(header => {
    let sib = header.nextElementSibling;
    let visible = false;
    while (sib && !sib.classList.contains('nsec-header') && !sib.classList.contains('nsec')) {
      if (sib.classList.contains('nb') && sib.style.display !== 'none') { visible = true; break; }
      sib = sib.nextElementSibling;
    }
    header.style.display = visible ? '' : 'none';
  });

  // 3. App.nav wrap — sadece bir kez wrap et
  const _baseNav = window.App?._origNav || window.App?.nav;
  if (_baseNav && !window.App?._navRoleWrapped) {
    window.App._navRoleWrapped = true;
    window.App._origNav        = _baseNav;
    const _wrapped = function(panelId, btn) {
      const cu = window.Auth?.getCU?.() || {};
      // Admin her zaman geçer
      if (cu.role === 'admin') return _baseNav(panelId, btn);
      // dashboard ve settings her zaman erişilebilir
      if (['dashboard','settings'].includes(panelId)) return _baseNav(panelId, btn);
      // Modül kontrolü — manager dahil herkes
      const reqMod = panelId === 'ik-hub' ? 'ik' : (window.PANEL_MODULE_MAP[panelId] || panelId);
      const mods   = cu.modules || window.ROLE_DEFAULT_MODULES?.[cu.role] || [];
      if (!mods.includes(reqMod)) {
        window.toast?.('Bu bölüme erişim yetkiniz yok', 'err');
        return;
      }
      return _baseNav(panelId, btn);
    };
    window.App.nav = _wrapped;
    window.nav     = _wrapped;
  }

  console.log('[UI] Role applied:', role, '| modüller:', modules.join(', ') || '—');
}

window._applyRoleUI = _applyRoleUI;

// Auth hazır olunca ve auth değişince uygula
(function() {
  const run = () => {
    const cu = window.Auth?.getCU?.();
    if (cu) { _applyRoleUI(cu); return; }
    let n = 0;
    const t = setInterval(() => {
      const u = window.Auth?.getCU?.();
      if (u || ++n > 30) { clearInterval(t); if (u) _applyRoleUI(u); }
    }, 300);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 700));
  else setTimeout(run, 700);
  window.addEventListener('auth-changed', () => setTimeout(() => _applyRoleUI(window.Auth?.getCU?.()), 200));
})();

console.log('[app_patch] Yetki sistemi yüklendi');

// ════════════════════════════════════════════════════════════════
// G8: ŞİFRE GÜÇ GÖSTERGESİ — modals.js'e dokunmadan inject
// mo-admin-user modal açıldığında f-pw alanına strength bar ekler
// ════════════════════════════════════════════════════════════════
(function _patchPwStrength() {
  // openMo wrap — mo-admin-user açıldığında strength placeholder ekle
  const _origOpenMo = window.openMo?.bind(window);
  if (!_origOpenMo) {
    // openMo henüz yüklenmemiş olabilir — DOMContentLoaded'da dene
    window.addEventListener('_openMo_ready', _inject, { once: true });
  }

  function _inject() {
    const _base = window.openMo;
    if (!_base || window._pwStrengthPatched) return;
    window._pwStrengthPatched = true;
    window.openMo = function(id, ...args) {
      _base(id, ...args);
      if (id === 'mo-admin-user') {
        setTimeout(() => {
          const pwEl = document.getElementById('f-pw');
          if (!pwEl) return;
          // Zaten eklenmiş mi?
          if (document.getElementById('f-pw-strength')) return;
          const bar = document.createElement('div');
          bar.id = 'f-pw-strength';
          pwEl.parentNode.insertBefore(bar, pwEl.nextSibling);
          pwEl.addEventListener('input', function() {
            window._onPwInput?.(this.value);
          });
        }, 80);
      }
    };
  }

  // openMo zaten yüklüyse hemen patch et, değilse 1s bekle
  if (typeof window.openMo === 'function') {
    setTimeout(_inject, 200);
  } else {
    setTimeout(_inject, 1000);
  }
})();

// ════════════════════════════════════════════════════════════════
// KULLANICI YÖNETİMİ — Panel header'a Excel butonu ekle (G4 destek)
// Kullanıcılar paneli açıldığında export butonunun varlığını garantile
// ════════════════════════════════════════════════════════════════
(function _ensureExportBtn() {
  const _origRenderUsers = window.renderUsers;
  window.renderUsers = function(...args) {
    const result = _origRenderUsers?.(...args);
    // Export butonu inject edildi mi kontrol et (panel header'da zaten var)
    return result;
  };
})();

console.log('[app_patch] G8 şifre güç göstergesi + patch tamamlandı');
