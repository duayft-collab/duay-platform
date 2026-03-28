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
    'docs': () => { window.renderDocs?.(); },
    'urunler': () => { window.renderUrunler?.(); },
    'alis-teklifleri': () => { window.renderAlisTeklifleri?.(); },
    'satis-teklifleri': () => { window.renderSatisTeklifleri?.(); },
    'formlar': () => { /* kurumsal formlar */ },
    'arsiv-hub': () => { window._renderArsivHub?.(); },
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
  mo.className = 'mo'; mo.id = 'mo-ktn-viewers'; 
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
  mo.className = 'mo'; mo.id = 'mo-ktn-detail'; 
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
    { id:'arsiv-hub', label:'Arşiv & Belgeler'     },
    { id:'tebligat',  label:'Tebligat'             },
    { id:'evrak',     label:'Personel Evrak'       },
    { id:'resmi',     label:'Resmi Evrak'          },
    { id:'temizlik',  label:'Temizlik Kontrol'     },
    { id:'rehber',    label:'Acil Rehber'          },
    { id:'numune',    label:'Numune Arşivi'        },
    { id:'etkinlik',  label:'Etkinlik / Fuar'      },
    { id:'links',     label:'Hızlı Linkler'        },
    { id:'satinalma', label:'Satın Alma'           },
    { id:'urunler',   label:'Ürün Kataloğu'        },
    { id:'alis-teklifleri', label:'Alış Teklifleri' },
    { id:'satis-teklifleri',label:'Satış Teklifleri'},
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

// ════════════════════════════════════════════════════════════════
// ÜRÜN KATALOĞU — döküman bazlı, zengin alan seti
// ════════════════════════════════════════════════════════════════
var URUN_BIRIMLER = ['Adet','Kg','Metre','Lt','Ton','M²','M³','Paket','Kutu','Palet'];
var URUN_ULKELER = ['Türkiye','Çin','Hindistan','Almanya','ABD','İtalya','Fransa','İngiltere','Japonya','Güney Kore','Brezilya','Mısır','Fas','İran','Pakistan','Diğer'];

window.renderUrunler = function() {
  var panel = document.getElementById('panel-urunler'); if (!panel) return;
  var d = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:100;background:var(--sf)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Ürün Kataloğu</div><div style="font-size:10px;color:var(--t3);margin-top:2px" id="urun-sub">Tedarikçi ürünleri</div></div>'
      + '<div style="display:flex;gap:6px">'
      + '<button onclick="window._exportUrunlerXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">⬇ Excel</button>'
      + '<button onclick="window._importUrunlerExcel?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📥 İçe Aktar</button>'
      + '<button onclick="window._downloadUrunTemplate?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📋 Şablon</button>'
      + (window.isAdmin?.() ? '<button onclick="window._insertDemoUrunler?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">🎲 Demo</button>' : '')
      + '<button onclick="window._openUrunModal?.()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Ürün Ekle</button></div>'
      + '</div>'
      + '<div id="urun-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + '</div>'
      + '<div style="padding:10px 20px;border-bottom:0.5px solid var(--b)"><input class="fi" id="urun-search" placeholder="Ürün ara..." oninput="window.renderUrunler?.()" style="border:0.5px solid var(--b);border-radius:7px"></div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="urun-list"></div></div>';
  }
  // Stats
  var statsEl = document.getElementById('urun-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">' + d.length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Aktif</div><div style="font-size:22px;font-weight:600;color:#16A34A">' + d.filter(function(u){return u.status!=='pasif';}).length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Tedarikçi</div><div style="font-size:22px;font-weight:600;color:var(--ac)">' + new Set(d.map(function(u){return u.tedarikci||'';})).size + '</div></div>'
    + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Kategori</div><div style="font-size:22px;font-weight:600">' + new Set(d.map(function(u){return u.kategori||'';})).size + '</div></div>';
  // List
  var q = (document.getElementById('urun-search')?.value || '').toLowerCase();
  var fl = q ? d.filter(function(u) { return (u.urunAdi||'').toLowerCase().includes(q) || (u.urunKodu||'').toLowerCase().includes(q); }) : d;
  var cont = document.getElementById('urun-list'); if (!cont) return;
  if (!fl.length) { cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">Ürün yok — yukarıdan ekleyin</div>'; return; }
  cont.innerHTML = fl.map(function(u) {
    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:0.5px solid var(--b);transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="width:40px;height:40px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + (u.gorsel ? '<img src="' + u.gorsel + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px">' : '📦') + '</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--t)">' + esc(u.urunAdi||'—') + '</div><div style="font-size:10px;color:var(--t3)">' + esc(u.urunKodu||'') + ' · ' + esc(u.tedarikci||'') + ' · ' + esc(u.kategori||'') + '</div></div>'
      + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + (u.sonFiyat ? u.sonFiyat.toLocaleString('tr-TR') + ' ' + (u.paraBirimi||'USD') : '—') + '</div>'
      + '<button onclick="window._openUrunModal?.(' + u.id + ')" style="padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:none;cursor:pointer;font-size:10px;color:var(--t3);font-family:inherit">✏️</button>'
    + '</div>';
  }).join('');
};

window._openUrunModal = function(editId) {
  var ex = document.getElementById('mo-urun'); if (ex) ex.remove();
  var u = editId ? (typeof loadUrunler === 'function' ? loadUrunler() : []).find(function(x){return x.id===editId;}) : null;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c){return !c.isDeleted;}) : [];
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-urun';
  mo.innerHTML = '<div class="moc" style="max-width:680px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">' + (u ? '✏️ Ürün Düzenle' : '+ Ürün Ekle') + (u?.duayKodu ? ' <span style="font-size:11px;color:var(--t3);font-weight:400;font-family:monospace">' + esc(u.duayKodu) + '</span>' : '') + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    // Zorunlu alanlar (siyah)
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl" style="color:#000">Orijinal Ürün Adı *</div><input class="fi" id="ur-ad" value="' + esc(u?.orijinalAdi||u?.urunAdi||'') + '"></div>'
    + '<div><div class="fl" style="color:#000">Satıcı / Tedarikçi *</div><select class="fi" id="ur-tedarikci"><option value="">— Seçin —</option>' + cariList.map(function(c){return '<option value="'+esc(c.name)+'"'+(u?.tedarikci===c.name||u?.saticiId===c.name?' selected':'')+'>'+esc(c.name)+'</option>';}).join('') + '</select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl" style="color:#000">Kategori *</div><input class="fi" id="ur-kat" value="' + esc(u?.kategori||'') + '" placeholder="Hammadde, Mamul..."></div>'
    + '<div><div class="fl">Satıcı Sınıfı</div><select class="fi" id="ur-sinif"><option value="satici"' + (u?.saticiSinifi==='satici'?' selected':'') + '>Satıcı</option><option value="uretici"' + (u?.saticiSinifi==='uretici'?' selected':'') + '>Üretici</option><option value="bayi"' + (u?.saticiSinifi==='bayi'?' selected':'') + '>Bayi</option></select></div>'
    + '<div><div class="fl">Marka</div><input class="fi" id="ur-marka" value="' + esc(u?.marka||'') + '"></div></div>'
    // İhracat zorunlu (kırmızı)
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl" style="color:#DC2626">Standart Adı (EN) *</div><input class="fi" id="ur-std" value="' + esc(u?.standartAdi||'') + '" placeholder="CI/PL/BL için İngilizce"></div>'
    + '<div><div class="fl" style="color:#DC2626">GTİP Kodu *</div><input class="fi" id="ur-gtip" value="' + esc(u?.gtip||'') + '" placeholder="8542.31.00.00"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl" style="color:#DC2626">Menşei *</div><select class="fi" id="ur-mensei"><option value="">— Seçin —</option>' + URUN_ULKELER.map(function(u2){return '<option value="'+u2+'"'+(u?.mensei===u2?' selected':'')+'>'+u2+'</option>';}).join('') + '</select></div>'
    + '<div><div class="fl" style="color:#DC2626">Birim *</div><select class="fi" id="ur-birim">' + URUN_BIRIMLER.map(function(b){return '<option value="'+b+'"'+(u?.birim===b?' selected':'')+'>'+b+'</option>';}).join('') + '</select></div>'
    + '<div><div class="fl">KDV %</div><input class="fi" type="number" id="ur-kdv" value="' + (u?.kdvOrani||20) + '"></div></div>'
    // Ağırlık + boyut
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:8px">'
    + '<div><div class="fl">Net Ağ.(kg)</div><input class="fi" type="number" id="ur-net" value="' + (u?.netAgirlik||'') + '" step="0.01"></div>'
    + '<div><div class="fl">Brüt Ağ.</div><input class="fi" type="number" id="ur-brut" value="' + (u?.brutAgirlik||'') + '" step="0.01"></div>'
    + '<div><div class="fl">En(cm)</div><input class="fi" type="number" id="ur-en" value="' + (u?.paketEn||'') + '"></div>'
    + '<div><div class="fl">Boy(cm)</div><input class="fi" type="number" id="ur-boy" value="' + (u?.paketBoy||'') + '"></div>'
    + '<div><div class="fl">Yük.(cm)</div><input class="fi" type="number" id="ur-yuk" value="' + (u?.paketYukseklik||'') + '"></div></div>'
    // Tehlikeli madde + ihracat kısıtı
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl" style="color:#F59E0B" title="IMO sınıflandırması">IMO\'lu mu?</div><select class="fi" id="ur-imo"><option value="H"' + (u?.imolu!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.imolu==='E'?' selected':'') + '>Evet</option></select></div>'
    + '<div><div class="fl" style="color:#F59E0B">DİB\'li mi?</div><select class="fi" id="ur-dib"><option value="H"' + (u?.dibli!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.dibli==='E'?' selected':'') + '>Evet</option></select></div>'
    + '<div><div class="fl" style="color:#F59E0B">İhracat Kısıtı</div><select class="fi" id="ur-kisit"><option value="H"' + (u?.ihracatKisiti!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.ihracatKisiti==='E'?' selected':'') + '>Evet</option></select></div></div>'
    // Açıklamalar
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Teknik Açıklama</div><textarea class="fi" id="ur-teknik" rows="2" style="resize:none">' + esc(u?.teknikAciklama||'') + '</textarea></div>'
    + '<div><div class="fl">Gümrük Açıklama</div><textarea class="fi" id="ur-gumruk" rows="2" style="resize:none">' + esc(u?.gumrukAciklama||'') + '</textarea></div></div>'
    + '<div><div class="fl">Renk</div><input class="fi" id="ur-renk" value="' + esc(u?.renk||'') + '"></div>'
    + '<div><div class="fl">Satıcı Kodu</div><input class="fi" id="ur-satici-kodu" value="' + esc(u?.saticiKodu||'') + '"></div>'
    + '<input type="hidden" id="ur-eid" value="' + (u?.id||'') + '">'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-urun\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveUrun()">Kaydet</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

window._saveUrun = function() {
  var ad = (document.getElementById('ur-ad')?.value||'').trim();
  var tedarikci = document.getElementById('ur-tedarikci')?.value||'';
  var kategori = (document.getElementById('ur-kat')?.value||'').trim();
  if (!ad) { window.toast?.('Orijinal ürün adı zorunlu','err'); return; }
  if (!tedarikci) { window.toast?.('Satıcı/Tedarikçi zorunlu','err'); return; }
  if (!kategori) { window.toast?.('Kategori zorunlu','err'); return; }
  var eid = parseInt(document.getElementById('ur-eid')?.value||'0');
  var d = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var entry = {
    orijinalAdi: ad, urunAdi: ad, tedarikci: tedarikci, saticiId: tedarikci,
    saticiSinifi: document.getElementById('ur-sinif')?.value||'satici',
    standartAdi: (document.getElementById('ur-std')?.value||'').trim(),
    kategori: kategori, marka: (document.getElementById('ur-marka')?.value||'').trim(),
    mensei: document.getElementById('ur-mensei')?.value||'',
    gtip: (document.getElementById('ur-gtip')?.value||'').trim(),
    birim: document.getElementById('ur-birim')?.value||'Adet',
    kdvOrani: parseInt(document.getElementById('ur-kdv')?.value||'20'),
    renk: (document.getElementById('ur-renk')?.value||'').trim(),
    saticiKodu: (document.getElementById('ur-satici-kodu')?.value||'').trim(),
    netAgirlik: parseFloat(document.getElementById('ur-net')?.value||'0')||null,
    brutAgirlik: parseFloat(document.getElementById('ur-brut')?.value||'0')||null,
    paketEn: parseFloat(document.getElementById('ur-en')?.value||'0')||null,
    paketBoy: parseFloat(document.getElementById('ur-boy')?.value||'0')||null,
    paketYukseklik: parseFloat(document.getElementById('ur-yuk')?.value||'0')||null,
    imolu: document.getElementById('ur-imo')?.value||'H',
    dibli: document.getElementById('ur-dib')?.value||'H',
    ihracatKisiti: document.getElementById('ur-kisit')?.value||'H',
    teknikAciklama: (document.getElementById('ur-teknik')?.value||'').trim(),
    gumrukAciklama: (document.getElementById('ur-gumruk')?.value||'').trim(),
    status: 'aktif', ts: new Date().toISOString(),
  };
  if (eid) {
    var it = d.find(function(x){return x.id===eid;});
    if (it) { if (!it.changeLog) it.changeLog=[]; it.changeLog.push({ts:entry.ts,by:window.Auth?.getCU?.()?.id,action:'güncelleme'}); Object.assign(it, entry); }
  } else {
    entry.id = typeof generateNumericId==='function'?generateNumericId():Date.now();
    entry.duayKodu = 'DUAY-' + (tedarikci||'X').replace(/[^A-Za-z]/g,'').slice(0,4).toUpperCase() + '-' + String(d.length+1).padStart(3,'0');
    entry.urunKodu = entry.duayKodu;
    entry.createdBy = window.Auth?.getCU?.()?.id;
    entry.createdAt = entry.ts;
    entry.changeLog = [{ts:entry.ts,by:entry.createdBy,action:'oluşturma'}];
    d.unshift(entry);
  }
  if (typeof storeUrunler === 'function') storeUrunler(d);
  document.getElementById('mo-urun')?.remove();
  window.toast?.(eid?'Güncellendi ✓':'Ürün eklendi: '+entry.duayKodu,'ok');
  window.renderUrunler?.();
};

// ════════════════════════════════════════════════════════════════
// ALIŞ TEKLİFLERİ — B tasarımı
// ════════════════════════════════════════════════════════════════
window.renderAlisTeklifleri = function() {
  var panel = document.getElementById('panel-alis-teklifleri'); if (!panel) return;
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var today = new Date().toISOString().slice(0,10);
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:100;background:var(--sf)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Alış Teklifleri</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Tedarikçi teklifleri</div></div>'
      + '<div style="display:flex;gap:6px"><button onclick="window._exportAlisTeklifXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button><button onclick="window._openAlisModal?.()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Alış Teklifi</button></div>'
      + '</div>'
      + '<div id="alis-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + '</div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="alis-list"></div></div>';
  }
  var gecerli = d.filter(function(t){return !t.gecerlilikTarihi||t.gecerlilikTarihi>=today;}).length;
  var sureDolmus = d.filter(function(t){return t.gecerlilikTarihi&&t.gecerlilikTarihi<today;}).length;
  var statsEl = document.getElementById('alis-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">' + d.length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Geçerli</div><div style="font-size:22px;font-weight:600;color:#16A34A">' + gecerli + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Süresi Dolmuş</div><div style="font-size:22px;font-weight:600;color:#DC2626">' + sureDolmus + '</div></div>'
    + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam Değer</div><div style="font-size:22px;font-weight:600;color:var(--ac)">$' + Math.round(d.reduce(function(s,t){return s+(parseFloat(t.toplamTutar)||0);},0)).toLocaleString('tr-TR') + '</div></div>';
  var cont = document.getElementById('alis-list'); if (!cont) return;
  if (!d.length) { cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">Henüz teklif yok</div>'; return; }
  // Excel tarzı tablo başlık
  var thS = 'font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;padding:6px 10px;white-space:nowrap';
  cont.innerHTML = '<div style="display:grid;grid-template-columns:100px 140px 150px 70px 90px 60px 90px 90px 80px 80px;gap:0;padding:0;background:var(--s2);border-bottom:0.5px solid var(--b);min-width:1000px">'
    + '<div style="'+thS+'">Teklif No</div><div style="'+thS+'">Tedarikçi</div><div style="'+thS+'">Ürün</div><div style="'+thS+'">Miktar</div><div style="'+thS+'">B.Fiyat</div><div style="'+thS+'">Döviz</div><div style="'+thS+'">Toplam</div><div style="'+thS+'">Geçerlilik</div><div style="'+thS+'">Durum</div><div style="'+thS+'">İşlem</div></div>'
    + '<div style="overflow-x:auto">' + d.map(function(t) {
      var expired = t.gecerlilikTarihi && t.gecerlilikTarihi < today;
      var badge = expired ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#DC262622;color:#DC2626">Dolmuş</span>' : '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#16A34A22;color:#16A34A">Geçerli</span>';
      return '<div style="display:grid;grid-template-columns:100px 140px 150px 70px 90px 60px 90px 90px 80px 80px;gap:0;padding:0;border-bottom:0.5px solid var(--b);min-width:1000px;align-items:center;transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
        + '<div style="padding:6px 10px;font-size:11px;font-weight:600;color:var(--t);font-family:monospace">' + esc(t.teklifNo||'') + '</div>'
        + '<div style="padding:6px 10px;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.tedarikci||'') + '</div>'
        + '<div style="padding:6px 10px;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.urunAdi||'') + '</div>'
        + '<div style="padding:6px 10px;font-size:11px;text-align:right">' + (t.miktar||0) + '</div>'
        + '<div style="padding:6px 10px;font-size:11px;text-align:right;font-weight:600">' + (t.birimFiyat||0).toLocaleString('tr-TR') + '</div>'
        + '<div style="padding:6px 10px;font-size:10px;color:var(--t3)">' + (t.paraBirimi||'USD') + '</div>'
        + '<div style="padding:6px 10px;font-size:11px;text-align:right;font-weight:600;color:var(--ac)">' + (t.toplamTutar||0).toLocaleString('tr-TR') + '</div>'
        + '<div style="padding:6px 10px;font-size:10px;color:var(--t3)">' + (t.gecerlilikTarihi||'—').slice(0,10) + '</div>'
        + '<div style="padding:6px 10px">' + badge + '</div>'
        + '<div style="padding:6px 10px"><button onclick="window._convertToSatisTeklif?.(' + t.id + ')" style="padding:2px 6px;border:0.5px solid var(--ac);border-radius:4px;background:none;color:var(--ac);font-size:9px;cursor:pointer;font-family:inherit">Satış</button></div>'
      + '</div>';
    }).join('') + '</div>';
};

window._openAlisModal = function() {
  var ex = document.getElementById('mo-alis'); if (ex) ex.remove();
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c){return !c.isDeleted && c.type==='tedarikci';}) : [];
  var urunList = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-alis';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">+ Alış Teklifi</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Tedarikçi *</div><select class="fi" id="at-tedarikci"><option value="">— Seçin —</option>' + cariList.map(function(c){return '<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>';}).join('') + '</select></div>'
    + '<div><div class="fl">Ürün * (tanımlı)</div><select class="fi" id="at-urun" onchange="window._atUrunSelected?.()"><option value="">— Ürün seçin —</option>' + urunList.map(function(u){return '<option value="'+u.id+'" data-kod="'+esc(u.duayKodu||u.urunKodu||'')+'" data-birim="'+(u.birim||'')+'" data-mensei="'+(u.mensei||'')+'" data-marka="'+(u.marka||'')+'">'+esc(u.duayKodu||'')+' — '+esc(u.orijinalAdi||u.urunAdi||'')+'</option>';}).join('') + '</select></div></div>'
    + '<div id="at-urun-info" style="display:none;padding:6px 10px;background:var(--s2);border-radius:6px;font-size:10px;color:var(--t3)"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl">Birim Fiyat *</div><input class="fi" type="number" id="at-fiyat" oninput="window._atCalc?.()"></div>'
    + '<div><div class="fl">Miktar *</div><input class="fi" type="number" id="at-miktar" oninput="window._atCalc?.()"></div>'
    + '<div><div class="fl">Para Birimi</div><select class="fi" id="at-cur"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Geçerlilik Tarihi</div><input type="date" class="fi" id="at-gecerlilik"></div>'
    + '<div><div class="fl">Toplam</div><div style="font-size:18px;font-weight:700;color:var(--ac)" id="at-toplam">—</div></div></div>'
    + '<div><div class="fl">Not</div><textarea class="fi" id="at-not" rows="2" style="resize:none"></textarea></div>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-alis\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveAlisTeklif()">Kaydet</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};
window._atCalc = function() { var f=parseFloat(document.getElementById('at-fiyat')?.value||'0'); var m=parseFloat(document.getElementById('at-miktar')?.value||'0'); var el=document.getElementById('at-toplam'); if(el) el.textContent=(f*m).toLocaleString('tr-TR')+' '+(document.getElementById('at-cur')?.value||'USD'); };
window._atUrunSelected = function() {
  var sel = document.getElementById('at-urun'); if (!sel) return;
  var opt = sel.options[sel.selectedIndex];
  var info = document.getElementById('at-urun-info');
  if (!opt || !opt.value) { if (info) info.style.display='none'; return; }
  if (info) { info.style.display='block'; info.innerHTML='📦 Kod: '+opt.dataset.kod+' · Birim: '+opt.dataset.birim+' · Menşei: '+opt.dataset.mensei+' · Marka: '+opt.dataset.marka; }
};
window._saveAlisTeklif = function() {
  var ted = document.getElementById('at-tedarikci')?.value||''; var urun = document.getElementById('at-urun')?.value||'';
  if (!ted||!urun) { window.toast?.('Tedarikçi ve ürün zorunlu','err'); return; }
  var fiyat = parseFloat(document.getElementById('at-fiyat')?.value||'0'); var miktar = parseFloat(document.getElementById('at-miktar')?.value||'0');
  if (!fiyat||!miktar) { window.toast?.('Fiyat ve miktar zorunlu','err'); return; }
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var yr = new Date().getFullYear(); var seq = String(d.length+1).padStart(4,'0');
  d.unshift({ id:typeof generateNumericId==='function'?generateNumericId():Date.now(), teklifNo:'TKL-'+yr+'-'+seq, tedarikci:ted, urunAdi:urun, birimFiyat:fiyat, miktar:miktar, paraBirimi:document.getElementById('at-cur')?.value||'USD', toplamTutar:fiyat*miktar, gecerlilikTarihi:document.getElementById('at-gecerlilik')?.value||'', not:(document.getElementById('at-not')?.value||'').trim(), ts:new Date().toISOString(), createdBy:window.Auth?.getCU?.()?.id });
  if (typeof storeAlisTeklifleri === 'function') storeAlisTeklifleri(d);
  document.getElementById('mo-alis')?.remove();
  window.toast?.('Alış teklifi eklendi ✓','ok');
  window.renderAlisTeklifleri?.();
};

// ════════════════════════════════════════════════════════════════
// SATIŞ TEKLİFLERİ — B tasarımı
// ════════════════════════════════════════════════════════════════
window.renderSatisTeklifleri = function() {
  var panel = document.getElementById('panel-satis-teklifleri'); if (!panel) return;
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:100;background:var(--sf)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Satış Teklifleri</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Müşteri teklifleri</div></div>'
      + '<div style="display:flex;gap:6px"><button onclick="window._exportSatisTeklifXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button><button onclick="window._openSatisRapor?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📊 Rapor</button><button onclick="window._openSatisModal?.()" style="padding:7px 16px;border:none;border-radius:7px;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Satış Teklifi</button></div>'
      + '</div>'
      + '<div id="satis-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + '</div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="satis-list"></div></div>';
  }
  var STAT = {taslak:'Taslak',gonderildi:'Gönderildi',onay:'Onay Bekliyor',kabul:'Kabul Edildi',red:'Reddedildi'};
  var statsEl = document.getElementById('satis-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">' + d.length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Onay Bekleyen</div><div style="font-size:22px;font-weight:600;color:#D97706">' + d.filter(function(t){return t.durum==='onay';}).length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Kabul Edilen</div><div style="font-size:22px;font-weight:600;color:#16A34A">' + d.filter(function(t){return t.durum==='kabul';}).length + '</div></div>'
    + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam Değer</div><div style="font-size:22px;font-weight:600;color:var(--ac)">$' + Math.round(d.reduce(function(s,t){return s+(parseFloat(t.genelToplam)||0);},0)).toLocaleString('tr-TR') + '</div></div>';
  var cont = document.getElementById('satis-list'); if (!cont) return;
  if (!d.length) { cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">Henüz teklif yok</div>'; return; }
  var badgeColors = {taslak:'#9CA3AF',gonderildi:'#3B82F6',onay:'#D97706',kabul:'#16A34A',red:'#DC2626'};
  cont.innerHTML = d.map(function(t) {
    var bc = badgeColors[t.durum]||'#9CA3AF';
    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:0.5px solid var(--b);transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:var(--t)">' + esc(t.teklifNo||'—') + '</div><div style="font-size:10px;color:var(--t3)">' + esc(t.musteri||'') + ' · ' + (t.urunler||[]).length + ' ürün</div></div>'
      + '<div style="font-size:12px;font-weight:600">' + (t.genelToplam||0).toLocaleString('tr-TR') + ' ' + (t.paraBirimi||'USD') + '</div>'
      + '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + bc + '22;color:' + bc + ';font-weight:600">' + (STAT[t.durum]||'Taslak') + '</span>'
      + '<button onclick="window._printSatisTeklif?.(' + t.id + ')" style="padding:3px 8px;border:0.5px solid var(--b);border-radius:5px;background:none;cursor:pointer;font-size:9px;color:var(--t3);font-family:inherit">📄 PDF</button>'
    + '</div>';
  }).join('');
};

window._convertToSatisTeklif = function(alisId) {
  var alis = (typeof loadAlisTeklifleri==='function'?loadAlisTeklifleri():[]).find(function(t){return t.id===alisId;});
  if (!alis) return;
  window._openSatisModal(alis);
};

window._openSatisModal = function(fromAlis) {
  var ex = document.getElementById('mo-satis2'); if (ex) ex.remove();
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var musteriList = typeof loadCari === 'function' ? loadCari().filter(function(c){return !c.isDeleted && (c.type==='musteri'||c.cariType==='onayli');}) : [];
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-satis2';
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">+ Satış Teklifi</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Müşteri *</div><select class="fi" id="st-musteri"><option value="">— Seçin —</option>' + musteriList.map(function(c){return '<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>';}).join('') + '</select></div>'
    + '<div><div class="fl">Para Birimi</div><select class="fi" id="st-cur"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl">Ürün Adı</div><input class="fi" id="st-urun" value="' + esc(fromAlis?.urunAdi||'') + '"></div>'
    + '<div><div class="fl">Alış Fiyatı</div><input class="fi" type="number" id="st-alis" value="' + (fromAlis?.birimFiyat||'') + '" oninput="window._stCalc?.()"></div>'
    + '<div><div class="fl">Kâr Marjı %</div><input class="fi" type="number" id="st-marj" value="15" oninput="window._stCalc?.()"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Miktar</div><input class="fi" type="number" id="st-miktar" value="' + (fromAlis?.miktar||'1') + '" oninput="window._stCalc?.()"></div>'
    + '<div><div class="fl">Teslimat</div><select class="fi" id="st-teslim"><option>FOB</option><option>CFR</option><option>CIF</option><option>EXW</option><option>DDP</option></select></div></div>'
    + '<div style="background:var(--s2);border-radius:8px;padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">'
    + '<div><div style="font-size:10px;color:var(--t3)">Satış Fiyatı</div><div style="font-size:18px;font-weight:700;color:var(--ac)" id="st-satis-fiyat">—</div></div>'
    + '<div><div style="font-size:10px;color:var(--t3)">Toplam</div><div style="font-size:18px;font-weight:700;color:var(--t)" id="st-toplam">—</div></div>'
    + '<div><div style="font-size:10px;color:var(--t3)">Tahmini Kâr</div><div style="font-size:18px;font-weight:700;color:#16A34A" id="st-kar">—</div></div></div>'
    + '<div><div class="fl">Geçerlilik</div><input type="date" class="fi" id="st-gecerlilik"></div>'
    + '<input type="hidden" id="st-alis-id" value="' + (fromAlis?.id||'') + '">'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-satis2\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveSatisTeklif()">Kaydet</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open'); window._stCalc?.();},10);
};

window._stCalc = function() {
  var alis = parseFloat(document.getElementById('st-alis')?.value||'0');
  var marj = parseFloat(document.getElementById('st-marj')?.value||'0');
  var miktar = parseFloat(document.getElementById('st-miktar')?.value||'0');
  var satis = alis * (1 + marj/100);
  var toplam = satis * miktar;
  var kar = (satis - alis) * miktar;
  var cur = document.getElementById('st-cur')?.value||'USD';
  var sfEl = document.getElementById('st-satis-fiyat'); if(sfEl) sfEl.textContent = satis.toFixed(2) + ' ' + cur;
  var tEl = document.getElementById('st-toplam'); if(tEl) tEl.textContent = toplam.toLocaleString('tr-TR') + ' ' + cur;
  var kEl = document.getElementById('st-kar'); if(kEl) kEl.textContent = '+' + kar.toLocaleString('tr-TR') + ' ' + cur;
};

window._saveSatisTeklif = function() {
  var musteri = document.getElementById('st-musteri')?.value||'';
  if (!musteri) { window.toast?.('Müşteri zorunlu','err'); return; }
  var alis = parseFloat(document.getElementById('st-alis')?.value||'0');
  var marj = parseFloat(document.getElementById('st-marj')?.value||'0');
  var miktar = parseFloat(document.getElementById('st-miktar')?.value||'0');
  var satis = alis * (1 + marj/100);
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var yr = new Date().getFullYear(); var seq = String(d.length+1).padStart(4,'0');
  d.unshift({ id:typeof generateNumericId==='function'?generateNumericId():Date.now(), teklifNo:'STK-'+yr+'-'+seq, musteri:musteri, alisTeklifiId:parseInt(document.getElementById('st-alis-id')?.value||'0')||null, urunler:[{urunAdi:document.getElementById('st-urun')?.value||'', miktar:miktar, alisFiyat:alis, karMarji:marj, satisFiyat:satis}], paraBirimi:document.getElementById('st-cur')?.value||'USD', genelToplam:satis*miktar, tahminKar:(satis-alis)*miktar, teslimSekli:document.getElementById('st-teslim')?.value||'FOB', gecerlilikTarihi:document.getElementById('st-gecerlilik')?.value||'', durum:'taslak', ts:new Date().toISOString(), createdBy:window.Auth?.getCU?.()?.id });
  if (typeof storeSatisTeklifleri === 'function') storeSatisTeklifleri(d);
  document.getElementById('mo-satis2')?.remove();
  window.toast?.('Satış teklifi oluşturuldu ✓','ok');
  window.renderSatisTeklifleri?.();
};

window._printSatisTeklif = function(id) {
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var t = d.find(function(x){return x.id===id;}); if (!t) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cur = t.paraBirimi || 'USD';
  var curSym = cur==='USD'?'$':cur==='EUR'?'€':cur==='TRY'?'₺':cur;
  var totalAmt = (t.genelToplam||0).toFixed(2);
  // Banka bilgileri
  var bankalar = typeof loadBankalar === 'function' ? loadBankalar() : [];
  var banka = bankalar.length ? bankalar[0] : { name:'Albaraka Türk', iban:'TR00 0000 0000 0000 0000 0000 00', swift:'TKLFTRIS' };
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>PI ' + esc(t.teklifNo) + '</title>'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:11px;line-height:1.4;max-width:210mm;margin:0 auto;padding:15mm}'
    + '.header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1a365d;padding-bottom:15px}'
    + '.header h1{font-size:22px;color:#1a365d;letter-spacing:3px;margin-bottom:2px}'
    + '.header h2{font-size:10px;color:#666;letter-spacing:5px;margin-bottom:8px}'
    + '.header h3{font-size:14px;color:#1a365d;letter-spacing:2px;margin-top:10px}'
    + '.meta{display:flex;justify-content:space-between;margin-bottom:15px;font-size:11px}'
    + '.meta-box{padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px}'
    + 'table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#1a365d;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}'
    + 'td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top}'
    + 'tr:nth-child(even){background:#f8fafc}'
    + '.total-row{background:#1a365d!important;color:#fff;font-weight:700;font-size:13px}'
    + '.total-row td{border:none;padding:10px}'
    + '.terms{margin-top:20px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-size:9px;color:#555}'
    + '.terms h4{color:#1a365d;font-size:10px;margin-bottom:6px}'
    + '.bank{margin-top:15px;padding:12px;border:1px solid #1a365d;border-radius:4px}'
    + '.bank h4{color:#1a365d;font-size:11px;margin-bottom:6px}'
    + '.footer{margin-top:20px;text-align:center;font-size:8px;color:#999;border-top:1px solid #e2e8f0;padding-top:10px}'
    + '.sig{display:flex;justify-content:space-between;margin-top:30px}'
    + '.sig div{width:40%;text-align:center}'
    + '.sig-line{border-top:1px solid #333;margin-top:40px;padding-top:4px;font-size:10px}'
    + '@media print{button{display:none!important}body{padding:10mm}}</style></head><body>'
    // Header
    + '<div class="header"><h1>DUAY GLOBAL</h1><h2>TRADE COMPANY · ISTANBUL</h2><h3>PROFORMA INVOICE</h3></div>'
    // Meta
    + '<div class="meta"><div class="meta-box"><b>REF:</b> ' + esc(t.teklifNo) + '</div><div class="meta-box"><b>DATE:</b> ' + (t.ts||'').slice(0,10) + '</div><div class="meta-box"><b>VALIDITY:</b> ' + (t.gecerlilikTarihi || '30 days') + '</div></div>'
    + '<div class="meta-box" style="margin-bottom:12px"><b>CUSTOMER:</b> ' + esc(t.musteri||'—') + '</div>'
    // Tablo
    + '<table><thead><tr><th>NO</th><th>DESCRIPTION OF GOODS</th><th>QTY</th><th>UNIT PRICE (' + cur + ')</th><th>TOTAL PRICE (' + cur + ')</th></tr></thead><tbody>'
    + (t.urunler||[]).map(function(u,i){
        return '<tr><td>' + (i+1) + '</td><td><b>' + esc(u.urunAdi||'') + '</b></td><td style="text-align:center">' + (u.miktar||0) + '</td><td style="text-align:right">' + curSym + (u.satisFiyat||0).toFixed(2) + '</td><td style="text-align:right">' + curSym + ((u.satisFiyat||0)*(u.miktar||0)).toFixed(2) + '</td></tr>';
      }).join('')
    + '<tr class="total-row"><td colspan="4" style="text-align:right">TOTAL AMOUNT</td><td style="text-align:right;font-size:15px">' + curSym + totalAmt + '</td></tr>'
    + '</tbody></table>'
    // Terms
    + '<div class="terms"><h4>TERMS & CONDITIONS</h4>'
    + '<div>• Payment: ' + (t.odemeKosulu || '35% advance, 65% before dispatch') + '</div>'
    + '<div>• Delivery: ' + (t.teslimSekli || 'FOB') + ' · ETA: ' + (t.teslimatSuresi || '30 days') + '</div>'
    + '<div>• All banking charges outside Turkey are on buyer\'s account</div>'
    + '<div>• Any dispute shall be settled in Istanbul courts</div></div>'
    // Bank
    + '<div class="bank"><h4>BANKING DETAILS</h4>'
    + '<div><b>' + esc(banka.name||'') + '</b></div>'
    + '<div>IBAN: ' + esc(banka.iban||'') + '</div>'
    + '<div>SWIFT: ' + esc(banka.swift||'') + '</div></div>'
    // Signature
    + '<div class="sig"><div><div class="sig-line">DUAY GLOBAL TRADE</div></div><div><div class="sig-line">' + esc(t.musteri||'Customer') + '</div></div></div>'
    // Footer
    + '<div class="footer">DUAY GLOBAL TRADE COMPANY · Istanbul, Turkey · info@duaycor.com</div>'
    + '<button onclick="window.print()" style="margin-top:15px;padding:8px 20px;cursor:pointer;border:1px solid #1a365d;border-radius:4px;background:#fff;color:#1a365d;font-weight:600">🖨 Print / PDF</button>'
    + '</body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// DEMO VERİ — 20 ürün + 5 müşteri
// ════════════════════════════════════════════════════════════════
window._insertDemoUrunler = function() {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli','err'); return; }
  var urunler = typeof loadUrunler === 'function' ? loadUrunler() : [];
  if (urunler.some(function(u){return u.duayKodu && u.duayKodu.indexOf('DUAY-')===0;})) { window.toast?.('Demo ürünler zaten var','warn'); return; }
  var now = new Date().toISOString();
  var cuId = window.Auth?.getCU?.()?.id;
  var demoUrunler = [
    {orijinalAdi:'Paslanmaz Turnike SS304',standartAdi:'Stainless Steel Turnstile SS304',kategori:'Güvenlik',birim:'Adet',mensei:'Türkiye',gtip:'7326.90',marka:'DuayTech',tedarikci:'Doğsan Branda San. A.Ş.',saticiSinifi:'uretici',renk:'Gri',netAgirlik:45,gorsel:'https://picsum.photos/seed/turnike/200'},
    {orijinalAdi:'Elektronik Kontrol Kartı v3',standartAdi:'Electronic Control Board v3',kategori:'Elektronik',birim:'Adet',mensei:'Çin',gtip:'8542.31',marka:'ShenTech',tedarikci:'INNOCAP Trading Ltd',saticiSinifi:'satici',netAgirlik:0.2,gorsel:'https://picsum.photos/seed/pcb/200'},
    {orijinalAdi:'PVC Branda Kumaş 650g',standartAdi:'PVC Tarpaulin Fabric 650gsm',kategori:'Tekstil',birim:'Metre',mensei:'Türkiye',gtip:'3926.90',marka:'Doğsan',tedarikci:'Doğsan Branda San. A.Ş.',saticiSinifi:'uretici',renk:'Beyaz',gorsel:'https://picsum.photos/seed/tarpaulin/200'},
    {orijinalAdi:'HDPE Plastik Şişe 1L',standartAdi:'HDPE Plastic Bottle 1L',kategori:'Ambalaj',birim:'Adet',mensei:'Türkiye',gtip:'3923.30',tedarikci:'Elips End. Malz. San. A.Ş.',saticiSinifi:'uretici',gorsel:'https://picsum.photos/seed/bottle/200'},
    {orijinalAdi:'Sodyum Hidroksit %50',standartAdi:'Sodium Hydroxide 50%',kategori:'Kimya',birim:'Kg',mensei:'Türkiye',gtip:'2815.11',imolu:'E',tedarikci:'Elips End. Malz. San. A.Ş.',gorsel:'https://picsum.photos/seed/chemical/200'},
    {orijinalAdi:'Pamuklu Dokuma Kumaş',standartAdi:'Cotton Woven Fabric',kategori:'Tekstil',birim:'Metre',mensei:'Türkiye',gtip:'5208.12',tedarikci:'Doğsan Branda San. A.Ş.',renk:'Ham',gorsel:'https://picsum.photos/seed/cotton/200'},
    {orijinalAdi:'Galvaniz Çelik Profil 40x40',standartAdi:'Galvanized Steel Profile 40x40mm',kategori:'Metal',birim:'Metre',mensei:'Türkiye',gtip:'7216.61',tedarikci:'Elips End. Malz. San. A.Ş.',gorsel:'https://picsum.photos/seed/steel/200'},
    {orijinalAdi:'Kuru Kayısı 1.Sınıf',standartAdi:'Dried Apricot Grade A',kategori:'Gıda',birim:'Kg',mensei:'Türkiye',gtip:'0813.10',tedarikci:'Merden Lojistik',gorsel:'https://picsum.photos/seed/apricot/200'},
    {orijinalAdi:'LED Panel Aydınlatma 60x60',standartAdi:'LED Panel Light 60x60cm 48W',kategori:'Aydınlatma',birim:'Adet',mensei:'Çin',gtip:'9405.42',tedarikci:'INNOCAP Trading Ltd',gorsel:'https://picsum.photos/seed/ledpanel/200'},
    {orijinalAdi:'Endüstriyel Boya RAL7035',standartAdi:'Industrial Paint RAL7035',kategori:'Kimya',birim:'Lt',mensei:'Türkiye',gtip:'3208.10',tedarikci:'Elips End. Malz. San. A.Ş.',renk:'RAL7035',gorsel:'https://picsum.photos/seed/paint/200'},
    {orijinalAdi:'Karton Kutu 40x30x20',standartAdi:'Corrugated Box 40x30x20cm',kategori:'Ambalaj',birim:'Adet',mensei:'Türkiye',gtip:'4819.10',tedarikci:'Hava Kargo Batı Loj.',gorsel:'https://picsum.photos/seed/box/200'},
    {orijinalAdi:'Polipropilen Granül',standartAdi:'Polypropylene Granule',kategori:'Plastik',birim:'Kg',mensei:'Güney Kore',gtip:'3902.10',tedarikci:'INNOCAP Trading Ltd',gorsel:'https://picsum.photos/seed/granule/200'},
    {orijinalAdi:'Paslanmaz Cıvata M10',standartAdi:'Stainless Steel Bolt M10',kategori:'Bağlantı',birim:'Adet',mensei:'Türkiye',gtip:'7318.15',tedarikci:'Elips End. Malz. San. A.Ş.',gorsel:'https://picsum.photos/seed/bolt/200'},
    {orijinalAdi:'Suni Deri PU Kumaş',standartAdi:'PU Leather Fabric',kategori:'Tekstil',birim:'Metre',mensei:'Çin',gtip:'3921.13',tedarikci:'INNOCAP Trading Ltd',renk:'Siyah',gorsel:'https://picsum.photos/seed/leather/200'},
    {orijinalAdi:'Çimento CEM I 42.5R',standartAdi:'Cement CEM I 42.5R',kategori:'İnşaat',birim:'Ton',mensei:'Türkiye',gtip:'2523.29',tedarikci:'Merden Lojistik',gorsel:'https://picsum.photos/seed/cement/200'},
    {orijinalAdi:'Zeytinyağı Sızma 5L',standartAdi:'Extra Virgin Olive Oil 5L',kategori:'Gıda',birim:'Lt',mensei:'Türkiye',gtip:'1509.10',tedarikci:'Merden Lojistik',gorsel:'https://picsum.photos/seed/oliveoil/200'},
    {orijinalAdi:'Alüminyum Folyo 30mic',standartAdi:'Aluminium Foil 30 micron',kategori:'Ambalaj',birim:'Kg',mensei:'Türkiye',gtip:'7607.11',tedarikci:'Elips End. Malz. San. A.Ş.',gorsel:'https://picsum.photos/seed/foil/200'},
    {orijinalAdi:'Güneş Paneli 550W Mono',standartAdi:'Solar Panel 550W Monocrystalline',kategori:'Enerji',birim:'Adet',mensei:'Çin',gtip:'8541.40',tedarikci:'INNOCAP Trading Ltd',gorsel:'https://picsum.photos/seed/solar/200'},
    {orijinalAdi:'Mermer Traverten 2cm',standartAdi:'Travertine Marble Tile 2cm',kategori:'İnşaat',birim:'M²',mensei:'Türkiye',gtip:'6802.91',tedarikci:'Doğsan Branda San. A.Ş.',renk:'Bej',gorsel:'https://picsum.photos/seed/marble/200'},
    {orijinalAdi:'Endüstriyel Filtre Torbası',standartAdi:'Industrial Filter Bag',kategori:'Endüstriyel',birim:'Adet',mensei:'Türkiye',gtip:'5911.40',tedarikci:'Hava Kargo Batı Loj.',gorsel:'https://picsum.photos/seed/filter/200'},
  ];
  demoUrunler.forEach(function(u,i) {
    var sat = (u.tedarikci||'X').replace(/[^A-Za-z]/g,'').slice(0,4).toUpperCase();
    u.id = typeof generateNumericId==='function'?generateNumericId():Date.now()+i;
    u.duayKodu = 'DUAY-'+sat+'-'+String(i+1).padStart(3,'0');
    u.urunKodu = u.duayKodu;
    u.kdvOrani = 20; u.status = 'aktif'; u.ts = now; u.createdBy = cuId; u.createdAt = now;
    u.changeLog = [{ts:now,by:cuId,action:'demo oluşturma'}];
  });
  if (typeof storeUrunler === 'function') storeUrunler(urunler.concat(demoUrunler));
  // 5 Demo müşteri
  var cariList = typeof loadCari === 'function' ? loadCari() : [];
  var demoMusteriler = [
    {name:'Abidjan Trading Co.',type:'musteri',cariType:'onayli',status:'active',country:'Fildişi Sahili',currency:'XOF',email:'info@abidjantrading.ci',phone:'+225 27 20 00 00'},
    {name:'West Africa Imports',type:'musteri',cariType:'onayli',status:'active',country:'Gana',currency:'USD',email:'buy@westafricaimports.gh',phone:'+233 30 200 0000'},
    {name:'Dakar Group Ltd',type:'musteri',cariType:'onayli',status:'active',country:'Senegal',currency:'XOF',email:'orders@dakargroup.sn',phone:'+221 33 800 0000'},
    {name:'Ivory Coast Traders',type:'musteri',cariType:'onayli',status:'active',country:'Fildişi Sahili',currency:'EUR',email:'trade@ivorycoasttraders.ci'},
    {name:'Lomé Distribution SA',type:'musteri',cariType:'onayli',status:'active',country:'Togo',currency:'XOF',email:'info@lomedist.tg'},
  ];
  var existingNames = cariList.map(function(c){return c.name;});
  demoMusteriler.forEach(function(m) {
    if (existingNames.indexOf(m.name) !== -1) return;
    m.id = typeof generateNumericId==='function'?generateNumericId():Date.now();
    m.createdAt = now; m.createdBy = cuId; m.approvedBy = cuId; m.approvedAt = now;
    m.contacts = []; m.documents = []; m.changeHistory = [{ts:now,by:cuId,changes:['Demo oluşturma']}];
    cariList.push(m);
  });
  if (typeof storeCari === 'function') storeCari(cariList);
  window.toast?.('Demo: 20 ürün + 5 müşteri yüklendi ✓','ok');
  window.renderUrunler?.();
  if (typeof renderCari === 'function') renderCari();
};

// ════════════════════════════════════════════════════════════════
// EXCEL EXPORT/IMPORT — Ürün + Alış + Satış
// ════════════════════════════════════════════════════════════════

/** Ürün Excel export */
window._exportUrunlerXlsx = function() {
  if (typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  var d = typeof loadUrunler==='function'?loadUrunler():[];
  var rows=[['Duay Kodu','Orijinal Adı','Standart Adı (EN)','Kategori','Birim','Menşei','GTİP','Marka','Tedarikçi','Renk','KDV%','Net Ağ.','Brüt Ağ.','IMO','DİB','İhr.Kısıtı']];
  d.forEach(function(u){rows.push([u.duayKodu||'',u.orijinalAdi||u.urunAdi||'',u.standartAdi||'',u.kategori||'',u.birim||'',u.mensei||'',u.gtip||'',u.marka||'',u.tedarikci||'',u.renk||'',u.kdvOrani||20,u.netAgirlik||'',u.brutAgirlik||'',u.imolu||'H',u.dibli||'H',u.ihracatKisiti||'H']);});
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Ürünler');
  XLSX.writeFile(wb,'urun-katalog-'+new Date().toISOString().slice(0,10)+'.xlsx');
  window.toast?.('Excel indirildi ✓','ok');
};

/** Alış teklif Excel export */
window._exportAlisTeklifXlsx = function() {
  if (typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  var d = typeof loadAlisTeklifleri==='function'?loadAlisTeklifleri():[];
  var rows=[['Teklif No','Tedarikçi','Ürün','Miktar','Birim Fiyat','Döviz','Toplam','Geçerlilik','Tarih']];
  d.forEach(function(t){rows.push([t.teklifNo||'',t.tedarikci||'',t.urunAdi||'',t.miktar||0,t.birimFiyat||0,t.paraBirimi||'USD',t.toplamTutar||0,t.gecerlilikTarihi||'',t.ts?.slice(0,10)||'']);});
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Alış Teklifleri');
  XLSX.writeFile(wb,'alis-teklifleri-'+new Date().toISOString().slice(0,10)+'.xlsx');
  window.toast?.('Excel indirildi ✓','ok');
};

/** Satış teklif Excel export + kar analizi */
window._exportSatisTeklifXlsx = function() {
  if (typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var rows=[['Teklif No','Müşteri','Ürün Sayısı','Genel Toplam','Döviz','Tahmini Kâr','Durum','Tarih','Geçerlilik','Teslimat']];
  d.forEach(function(t){rows.push([t.teklifNo||'',t.musteri||'',(t.urunler||[]).length,t.genelToplam||0,t.paraBirimi||'USD',t.tahminKar||0,t.durum||'taslak',t.ts?.slice(0,10)||'',t.gecerlilikTarihi||'',t.teslimSekli||'FOB']);});
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Satış Teklifleri');
  XLSX.writeFile(wb,'satis-teklifleri-'+new Date().toISOString().slice(0,10)+'.xlsx');
  window.toast?.('Excel indirildi ✓','ok');
};

/** Satış raporu */
window._openSatisRapor = function() {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var toplamSatis=0,toplamAlis=0,toplamKar=0;
  var urunSatis={};
  d.forEach(function(t){
    toplamSatis+=(t.genelToplam||0);toplamKar+=(t.tahminKar||0);
    (t.urunler||[]).forEach(function(u){
      var key=u.urunAdi||'?';
      if(!urunSatis[key])urunSatis[key]={ad:key,adet:0,satis:0,alis:0};
      urunSatis[key].adet+=u.miktar||0;
      urunSatis[key].satis+=(u.satisFiyat||0)*(u.miktar||0);
      urunSatis[key].alis+=(u.alisFiyat||0)*(u.miktar||0);
      toplamAlis+=(u.alisFiyat||0)*(u.miktar||0);
    });
  });
  var sorted=Object.values(urunSatis).sort(function(a,b){return b.satis-a.satis;});
  var ex=document.getElementById('mo-satis-rapor');if(ex)ex.remove();
  var mo=document.createElement('div');mo.className='mo';mo.id='mo-satis-rapor';
  mo.innerHTML='<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">'
    +'<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:700">📊 Satış Raporu</div><button onclick="document.getElementById(\'mo-satis-rapor\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:0.5px solid var(--b)">'
    +'<div style="padding:12px 14px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Toplam Satış</div><div style="font-size:18px;font-weight:700;color:var(--ac)">$'+Math.round(toplamSatis).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="padding:12px 14px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Toplam Alış</div><div style="font-size:18px;font-weight:700;color:#DC2626">$'+Math.round(toplamAlis).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="padding:12px 14px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Toplam Kâr</div><div style="font-size:18px;font-weight:700;color:#16A34A">$'+Math.round(toplamKar).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="padding:12px 14px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Ort. Marj</div><div style="font-size:18px;font-weight:700">'+(toplamSatis>0?Math.round(toplamKar/toplamSatis*100):0)+'%</div></div></div>'
    +'<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    +'<div style="font-size:11px;font-weight:700;color:var(--t3);margin-bottom:8px">En Çok Satan 5 Ürün</div>'
    +sorted.slice(0,5).map(function(u){var kar=u.satis-u.alis;return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid var(--b);font-size:12px"><span>'+esc(u.ad)+' <span style="color:var(--t3)">('+u.adet+' adet)</span></span><span style="font-weight:600;color:#16A34A">+$'+Math.round(kar).toLocaleString('tr-TR')+'</span></div>';}).join('')
    +'<div style="display:flex;gap:6px;margin-top:12px"><button onclick="window._printSatisRapor?.()" style="padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">🖨 PDF</button><button onclick="window._exportSatisTeklifXlsx?.()" style="padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">⬇ Excel</button></div>'
    +'</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

// ════════════════════════════════════════════════════════════════
// SATIŞ TEKLİFİ 3 FORMAT SEÇİCİ
// ════════════════════════════════════════════════════════════════

/** Format B — Modern minimalist PDF */
window._printSatisTeklifB = function(id) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===id;}); if (!t) return;
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var cur = t.paraBirimi||'USD';
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>'+esc(t.teklifNo)+'</title><style>*{margin:0;box-sizing:border-box}body{font-family:system-ui;color:#1a1a1a;font-size:12px;padding:30px;max-width:800px;margin:0 auto}'
    +'table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#6366F1;color:#fff;padding:8px;font-size:10px;text-transform:uppercase}td{padding:8px;border-bottom:1px solid #eee}'
    +'.total{background:#f8fafc;font-weight:700;font-size:14px}@media print{button{display:none!important}}</style></head><body>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><div style="font-size:20px;font-weight:800;color:#6366F1">DUAY GLOBAL</div><div style="font-size:10px;color:#999">Istanbul, Turkey</div></div>'
    +'<div style="text-align:right"><div style="font-size:14px;font-weight:700">PROFORMA INVOICE</div><div style="font-size:11px;color:#666">'+esc(t.teklifNo)+'</div><div style="font-size:11px;color:#666">'+(t.ts||'').slice(0,10)+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px"><div style="padding:12px;background:#f8fafc;border-radius:8px"><div style="font-size:9px;color:#999;text-transform:uppercase;margin-bottom:4px">From</div><div style="font-weight:600">DUAY GLOBAL TRADE</div><div style="font-size:11px;color:#666">Istanbul, Turkey</div></div>'
    +'<div style="padding:12px;background:#f8fafc;border-radius:8px"><div style="font-size:9px;color:#999;text-transform:uppercase;margin-bottom:4px">To</div><div style="font-weight:600">'+esc(t.musteri||'')+'</div></div></div>'
    +'<table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>'
    +(t.urunler||[]).map(function(u,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(u.urunAdi||'')+'</td><td style="text-align:center">'+(u.miktar||0)+'</td><td style="text-align:right">'+(u.satisFiyat||0).toFixed(2)+' '+cur+'</td><td style="text-align:right">'+((u.satisFiyat||0)*(u.miktar||0)).toFixed(2)+' '+cur+'</td></tr>';}).join('')
    +'<tr class="total"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right;font-size:16px">'+(t.genelToplam||0).toFixed(2)+' '+cur+'</td></tr></tbody></table>'
    +'<div style="font-size:10px;color:#666;margin-top:16px">Terms: '+(t.teslimSekli||'FOB')+' · Payment: '+(t.odemeKosulu||'Advance')+' · Valid: '+(t.gecerlilikTarihi||'30 days')+'</div>'
    +'<button onclick="window.print()" style="margin-top:20px;padding:8px 20px;cursor:pointer;border:1px solid #6366F1;border-radius:6px;background:#fff;color:#6366F1;font-weight:600">Print</button></body></html>');
  w.document.close();
};

/** Format C — Detaylı teknik (multi-page) */
window._printSatisTeklifC = function(id) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===id;}); if (!t) return;
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var cur = t.paraBirimi||'USD';
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>'+esc(t.teklifNo)+'</title><style>*{margin:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1a1a1a;font-size:12px;padding:40px;max-width:700px;margin:0 auto}'
    +'h1{font-size:24px;color:#1a365d;text-align:center;margin-bottom:4px}h2{font-size:14px;color:#666;text-align:center;margin-bottom:24px}'
    +'.page-break{page-break-before:always;margin-top:40px}'
    +'table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f0f0f0;padding:8px;font-size:10px;border:1px solid #ddd}td{padding:8px;border:1px solid #ddd}'
    +'@media print{button{display:none!important}}</style></head><body>'
    // Kapak
    +'<div style="text-align:center;padding:60px 0"><h1>DUAY GLOBAL TRADE</h1><h2>Commercial Proposal</h2><div style="margin:30px 0;font-size:16px;color:#1a365d">'+esc(t.teklifNo)+'</div>'
    +'<div style="font-size:14px">Prepared for: <b>'+esc(t.musteri||'')+'</b></div><div style="font-size:12px;color:#666;margin-top:8px">Date: '+(t.ts||'').slice(0,10)+'</div></div>'
    // Sayfa 2: Ürünler
    +'<div class="page-break"><h2 style="text-align:left;color:#1a365d">Product Details</h2>'
    +'<table><thead><tr><th>No</th><th>Product</th><th>Technical Specs</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>'
    +(t.urunler||[]).map(function(u,i){return '<tr><td>'+(i+1)+'</td><td><b>'+esc(u.urunAdi||'')+'</b></td><td style="font-size:10px;color:#666">'+esc(u.teknikDetay||'—')+'</td><td style="text-align:center">'+(u.miktar||0)+'</td><td style="text-align:right">'+(u.satisFiyat||0).toFixed(2)+' '+cur+'</td><td style="text-align:right;font-weight:600">'+((u.satisFiyat||0)*(u.miktar||0)).toFixed(2)+' '+cur+'</td></tr>';}).join('')
    +'<tr style="background:#1a365d;color:#fff;font-weight:700"><td colspan="5" style="text-align:right;border:none">GRAND TOTAL</td><td style="text-align:right;border:none;font-size:14px">'+(t.genelToplam||0).toFixed(2)+' '+cur+'</td></tr></tbody></table></div>'
    // Sayfa 3: Koşullar + İmza
    +'<div class="page-break"><h2 style="text-align:left;color:#1a365d">Terms & Conditions</h2>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0">'
    +'<div style="padding:12px;border:1px solid #ddd;border-radius:4px"><b>Delivery:</b> '+(t.teslimSekli||'FOB')+'</div>'
    +'<div style="padding:12px;border:1px solid #ddd;border-radius:4px"><b>Payment:</b> '+(t.odemeKosulu||'Advance')+'</div>'
    +'<div style="padding:12px;border:1px solid #ddd;border-radius:4px"><b>Validity:</b> '+(t.gecerlilikTarihi||'30 days')+'</div>'
    +'<div style="padding:12px;border:1px solid #ddd;border-radius:4px"><b>Origin:</b> Turkey</div></div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:60px"><div style="width:40%;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;margin-top:60px">DUAY GLOBAL TRADE</div></div><div style="width:40%;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;margin-top:60px">'+esc(t.musteri||'Customer')+'</div></div></div></div>'
    +'<button onclick="window.print()" style="margin-top:20px;padding:8px 20px;cursor:pointer">Print</button></body></html>');
  w.document.close();
};

/** Format seçici butonlarını satış listesine ekle */
var _origPrintSatis = window._printSatisTeklif;
window._printSatisTeklif = function(id) {
  // Format seçici mini popup
  var ex = document.getElementById('mo-pdf-format'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-pdf-format';
  mo.innerHTML = '<div class="moc" style="max-width:320px;padding:20px;border-radius:14px;text-align:center">'
    + '<div style="font-size:14px;font-weight:700;margin-bottom:12px">PDF Format Seçin</div>'
    + '<div style="display:flex;gap:8px;justify-content:center">'
    + '<button onclick="document.getElementById(\'mo-pdf-format\')?.remove();window._printSatisTeklifA?.('+id+')" style="padding:12px 20px;border:1px solid #1a365d;border-radius:8px;background:#1a365d;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">A<div style="font-size:9px;font-weight:400;margin-top:2px">Klasik</div></button>'
    + '<button onclick="document.getElementById(\'mo-pdf-format\')?.remove();window._printSatisTeklifB?.('+id+')" style="padding:12px 20px;border:1px solid #6366F1;border-radius:8px;background:#6366F1;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">B<div style="font-size:9px;font-weight:400;margin-top:2px">Modern</div></button>'
    + '<button onclick="document.getElementById(\'mo-pdf-format\')?.remove();window._printSatisTeklifC?.('+id+')" style="padding:12px 20px;border:1px solid #059669;border-radius:8px;background:#059669;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">C<div style="font-size:9px;font-weight:400;margin-top:2px">Detaylı</div></button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};
window._printSatisTeklifA = _origPrintSatis;

// ════════════════════════════════════════════════════════════════
// SATINALMA → LOJİSTİK OTOMATİK ENTEGRASYON
// ════════════════════════════════════════════════════════════════
(function _patchSAtoKargo() {
  var _origApproveSA = window._approveSA;
  if (!_origApproveSA) return;
  window._approveSA = function(id) {
    _origApproveSA(id);
    // Onay sonrası: Kargo takibine "Bekleyen Sevkiyat" ekle
    setTimeout(function() {
      var sa = (typeof loadSatinalma==='function'?loadSatinalma():[]).find(function(s){return s.id===id;});
      if (!sa || sa.status !== 'approved') return;
      var kargo = typeof loadKargo==='function'?loadKargo():[];
      // Zaten eklenmişse atla
      if (kargo.some(function(k){return k.purchaseId===id;})) return;
      kargo.unshift({
        id: typeof generateNumericId==='function'?generateNumericId():Date.now(),
        purchaseId: id,
        name: 'SA: ' + (sa.supplier||sa.piNo||sa.jobId),
        hat: sa.vendor?.name || sa.supplier || '',
        status: 'bekle',
        eta: sa.deliveryDate || '',
        note: 'Satınalmadan otomatik — #' + id,
        source: 'satinalma',
        createdAt: new Date().toISOString(),
      });
      if (typeof storeKargo==='function') storeKargo(kargo);
      console.info('[SA→Kargo] Bekleyen sevkiyat eklendi:', id);
    }, 500);
  };
})();

// ════════════════════════════════════════════════════════════════
// SATINALMA SÖZLEŞME ŞablonU
// ════════════════════════════════════════════════════════════════
window._openSAContract = function(id) {
  var sa = (typeof loadSatinalma==='function'?loadSatinalma():[]).find(function(s){return s.id===id;});
  if (!sa) return;
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var cur = sa.currency||'USD';
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Sözleşme #'+id+'</title><style>body{font-family:system-ui;padding:40px;max-width:700px;margin:0 auto;font-size:12px;line-height:1.6}h1{text-align:center;color:#1a365d;font-size:18px}h2{font-size:14px;color:#1a365d;margin-top:20px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:8px;border:1px solid #ddd;font-size:11px}th{background:#f5f5f5}.sig{display:flex;justify-content:space-between;margin-top:40px}.sig div{width:40%;text-align:center}@media print{button{display:none!important}}</style></head><body>'
    +'<h1>SATIN ALMA SÖZLEŞMESİ</h1><div style="text-align:center;color:#666;margin-bottom:20px">DUAY GLOBAL TRADE LLC — '+esc(sa.supplier||sa.piNo||'')+'</div>'
    +'<h2>1. Taraflar</h2><p><b>Alıcı:</b> DUAY GLOBAL TRADE LLC<br><b>Satıcı:</b> '+esc(sa.vendor?.name||sa.supplier||'')+'</p>'
    +'<h2>2. Ürün Bilgileri</h2><table><tr><th>Açıklama</th><th>Toplam</th><th>KDV</th><th>Döviz</th></tr>'
    +'<tr><td>'+esc(sa.supplier||sa.piNo||'Ürün')+'</td><td>'+(sa.totalAmount||0)+' '+cur+'</td><td>'+(sa.kdv||0)+' '+cur+'</td><td>'+cur+'</td></tr></table>'
    +'<h2>3. Ödeme Koşulları</h2><p>Avans: %'+(sa.advanceRate||0)+' ('+(sa.advanceAmount||0)+' '+cur+')<br>Kalan: '+(sa.remainingAmount||0)+' '+cur+' — Vade: '+(sa.vadeDate||'—')+'</p>'
    +'<h2>4. Teslimat</h2><p>Teslimat Tarihi: '+(sa.deliveryDate||'—')+'<br>Teslimat Yeri: '+(sa.deliveryPlace||'—')+'</p>'
    +'<h2>5. Özel Şartlar</h2><p>'+(sa.notes||'—')+'</p>'
    +'<div class="sig"><div><div style="border-top:1px solid #333;margin-top:60px;padding-top:4px">ALICI<br>DUAY GLOBAL TRADE LLC</div></div><div><div style="border-top:1px solid #333;margin-top:60px;padding-top:4px">SATICI<br>'+esc(sa.vendor?.name||sa.supplier||'')+'</div></div></div>'
    +'<button onclick="window.print()" style="margin-top:20px;padding:8px 20px;cursor:pointer">🖨 Yazdır / PDF</button></body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// EXCEL İMPORT VALİDASYON — Ürün + Alış Teklifi
// ════════════════════════════════════════════════════════════════

/** Ürün Excel import — validasyonlu */
window._importUrunlerExcel = function() {
  var inp = document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.csv';
  inp.onchange = function() {
    if (!this.files?.[0]) return;
    if (typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
    var reader = new FileReader();
    reader.onload = function(e) {
      var wb = XLSX.read(e.target.result, {type:'binary'});
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) {window.toast?.('Excel boş','err');return;}
      var d = typeof loadUrunler==='function'?loadUrunler():[];
      var cariList = typeof loadCari==='function'?loadCari():[];
      var cariNames = cariList.map(function(c){return c.name;});
      var added=0, errors=[];
      rows.forEach(function(r,i) {
        var ad = r['Orijinal Adı']||r['orijinalAdi']||r['Ad']||'';
        var ted = r['Tedarikçi']||r['tedarikci']||'';
        if (!ad) {errors.push('Satır '+(i+2)+': Ürün adı boş');return;}
        if (ted && cariNames.indexOf(ted)===-1) {errors.push('Satır '+(i+2)+': Tedarikçi "'+ted+'" tanımsız');return;}
        var sat=(ted||'X').replace(/[^A-Za-z]/g,'').slice(0,4).toUpperCase();
        d.unshift({
          id:typeof generateNumericId==='function'?generateNumericId():Date.now()+i,
          duayKodu:'DUAY-'+sat+'-'+String(d.length+1).padStart(3,'0'),
          urunKodu:'DUAY-'+sat+'-'+String(d.length+1).padStart(3,'0'),
          orijinalAdi:ad, urunAdi:ad,
          standartAdi:r['Standart Adı']||r['standartAdi']||'',
          kategori:r['Kategori']||r['kategori']||'',
          birim:r['Birim']||r['birim']||'Adet',
          mensei:r['Menşei']||r['mensei']||'',
          gtip:r['GTİP']||r['gtip']||'',
          marka:r['Marka']||r['marka']||'',
          tedarikci:ted, saticiId:ted,
          kdvOrani:parseInt(r['KDV%']||r['kdvOrani']||'20'),
          status:'aktif', ts:new Date().toISOString(), createdBy:window.Auth?.getCU?.()?.id,
          changeLog:[{ts:new Date().toISOString(),by:window.Auth?.getCU?.()?.id,action:'Excel import'}]
        });
        added++;
      });
      if (typeof storeUrunler==='function') storeUrunler(d);
      window.renderUrunler?.();
      var msg = added+' ürün eklendi';
      if (errors.length) msg += ', '+errors.length+' hata:\n'+errors.slice(0,5).join('\n');
      window.toast?.(errors.length?msg:'✓ '+msg, errors.length?'warn':'ok');
      if (errors.length) console.warn('[Import]', errors);
    };
    reader.readAsBinaryString(this.files[0]);
  };
  inp.click();
};

/** Ürün Excel şablon indir */
window._downloadUrunTemplate = function() {
  if (typeof XLSX==='undefined'){window.toast?.('XLSX yüklenmedi','err');return;}
  var rows=[['Orijinal Adı','Standart Adı','Kategori','Birim','Menşei','GTİP','Marka','Tedarikçi','KDV%'],['Örnek Ürün','Sample Product','Hammadde','Kg','Türkiye','1234.56','Marka','Tedarikçi Adı','20']];
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Şablon');
  XLSX.writeFile(wb,'urun-sablon.xlsx');
};

// ════════════════════════════════════════════════════════════════
// SATIŞ RAPORU PDF + EXCEL
// ════════════════════════════════════════════════════════════════

/** Satış raporu PDF çıktı */
window._printSatisRapor = function() {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var toplamSatis=0,toplamAlis=0,toplamKar=0;
  var urunSatis={};
  d.forEach(function(t){
    toplamSatis+=(t.genelToplam||0);toplamKar+=(t.tahminKar||0);
    (t.urunler||[]).forEach(function(u){
      var key=u.urunAdi||'?';
      if(!urunSatis[key])urunSatis[key]={ad:key,adet:0,satis:0,alis:0};
      urunSatis[key].adet+=u.miktar||0;
      urunSatis[key].satis+=(u.satisFiyat||0)*(u.miktar||0);
      urunSatis[key].alis+=(u.alisFiyat||0)*(u.miktar||0);
      toplamAlis+=(u.alisFiyat||0)*(u.miktar||0);
    });
  });
  var sorted=Object.values(urunSatis).sort(function(a,b){return b.satis-a.satis;});
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Satış Raporu</title><style>body{font-family:system-ui;padding:30px;max-width:700px;margin:0 auto;font-size:12px}h1{text-align:center;color:#1a365d}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#1a365d;color:#fff;padding:8px;font-size:10px}td{padding:6px 8px;border-bottom:1px solid #eee}.summary{display:flex;gap:16px;margin:16px 0}.summary div{flex:1;padding:12px;border-radius:8px;text-align:center}@media print{button{display:none!important}}</style></head><body>'
    +'<h1>DUAY GLOBAL — Satış Raporu</h1><div style="text-align:center;color:#666;margin-bottom:16px">'+new Date().toLocaleDateString('tr-TR')+'</div>'
    +'<div class="summary"><div style="background:#6366F122"><div style="font-size:9px;color:#666">Toplam Satış</div><div style="font-size:20px;font-weight:700;color:#6366F1">$'+Math.round(toplamSatis).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="background:#DC262622"><div style="font-size:9px;color:#666">Toplam Maliyet</div><div style="font-size:20px;font-weight:700;color:#DC2626">$'+Math.round(toplamAlis).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="background:#16A34A22"><div style="font-size:9px;color:#666">Toplam Kâr</div><div style="font-size:20px;font-weight:700;color:#16A34A">$'+Math.round(toplamKar).toLocaleString('tr-TR')+'</div></div>'
    +'<div style="background:#F59E0B22"><div style="font-size:9px;color:#666">Ort. Marj</div><div style="font-size:20px;font-weight:700;color:#D97706">'+(toplamSatis>0?Math.round(toplamKar/toplamSatis*100):0)+'%</div></div></div>'
    +'<table><thead><tr><th>Ürün</th><th>Adet</th><th>Satış</th><th>Maliyet</th><th>Kâr</th><th>Marj%</th></tr></thead><tbody>'
    +sorted.map(function(u){var kar=u.satis-u.alis;var marj=u.satis>0?Math.round(kar/u.satis*100):0;return '<tr><td>'+esc(u.ad)+'</td><td style="text-align:center">'+u.adet+'</td><td style="text-align:right">$'+Math.round(u.satis).toLocaleString('tr-TR')+'</td><td style="text-align:right">$'+Math.round(u.alis).toLocaleString('tr-TR')+'</td><td style="text-align:right;color:#16A34A;font-weight:600">$'+Math.round(kar).toLocaleString('tr-TR')+'</td><td style="text-align:center">'+marj+'%</td></tr>';}).join('')
    +'</tbody></table>'
    +'<button onclick="window.print()" style="margin-top:16px;padding:8px 20px;cursor:pointer;border:1px solid #1a365d;border-radius:6px;background:#fff;color:#1a365d;font-weight:600">🖨 Yazdır</button></body></html>');
  w.document.close();
};

console.log('[app_patch] G8 şifre güç göstergesi + patch tamamlandı');

// ════════════════════════════════════════════════════════════════
// ARŞİV & BELGELER HUB — birleşik panel
// ════════════════════════════════════════════════════════════════
var _arsivHubTab = 'docs';
window._renderArsivHub = function() {
  var panel = document.getElementById('panel-arsiv-hub');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = ''
      + '<div style="position:sticky;top:0;z-index:100;background:var(--sf)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
        + '<div><div style="font-size:15px;font-weight:700;color:var(--t);letter-spacing:-.01em">Arşiv & Belgeler</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Tüm dökümanlar tek panelde</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:0.5px solid var(--b)">'
        + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Toplam Belge</div><div style="font-size:22px;font-weight:600;color:var(--t)" id="arsiv-hub-total">—</div></div>'
        + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Tebligat Bekleyen</div><div style="font-size:22px;font-weight:600;color:#DC2626" id="arsiv-hub-teb">—</div></div>'
        + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Arşiv Dolap</div><div style="font-size:22px;font-weight:600;color:var(--ac)" id="arsiv-hub-dolap">—</div></div>'
      + '</div>'
      + '<div style="display:flex;border-bottom:0.5px solid var(--b);padding:0 16px">'
        + '<div class="arsiv-tab" data-at="docs" onclick="window._setArsivTab(\'docs\')" style="padding:11px 16px;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);transition:all .12s">Dökümanlar</div>'
        + '<div class="arsiv-tab" data-at="arsiv" onclick="window._setArsivTab(\'arsiv\')" style="padding:11px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Şirket Arşivi</div>'
        + '<div class="arsiv-tab" data-at="tebligat" onclick="window._setArsivTab(\'tebligat\')" style="padding:11px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Tebligat</div>'
        + '<div class="arsiv-tab" data-at="resmi" onclick="window._setArsivTab(\'resmi\')" style="padding:11px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Resmi Evrak</div>'
        + '<div class="arsiv-tab" data-at="formlar" onclick="window._setArsivTab(\'formlar\')" style="padding:11px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);transition:all .12s">Kurumsal Formlar</div>'
      + '</div>'
      + '</div>'
      + '<div id="arsiv-hub-content" style="padding:12px 20px"></div>';
  }
  // İstatistikleri güncelle
  var docs = typeof window.loadLocalDocs === 'function' ? window.loadLocalDocs() : [];
  var teb = typeof window.loadTebligat === 'function' ? window.loadTebligat() : [];
  var dolap = typeof window.loadDolaplar === 'function' ? window.loadDolaplar() : [];
  var totalEl = document.getElementById('arsiv-hub-total'); if (totalEl) totalEl.textContent = docs.length;
  var tebEl = document.getElementById('arsiv-hub-teb'); if (tebEl) tebEl.textContent = teb.filter(function(t) { return !t.read; }).length;
  var dolapEl = document.getElementById('arsiv-hub-dolap'); if (dolapEl) dolapEl.textContent = dolap.length;
  window._setArsivTab(_arsivHubTab);
};

window._setArsivTab = function(tab) {
  _arsivHubTab = tab;
  document.querySelectorAll('.arsiv-tab').forEach(function(t) {
    var active = t.dataset.at === tab;
    t.style.borderBottomColor = active ? 'var(--ac)' : 'transparent';
    t.style.color = active ? 'var(--ac)' : 'var(--t2)';
    t.style.fontWeight = active ? '600' : '400';
  });
  var cont = document.getElementById('arsiv-hub-content');
  if (!cont) return;
  // Alt modül render
  var renderMap = {
    docs: function() { if (typeof window.renderNotes === 'function') { cont.innerHTML = '<div id="panel-docs-inner"></div>'; } else { cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3)">Döküman modülü yükleniyor...</div>'; } },
    arsiv: function() { if (typeof window.renderArsiv === 'function') window.renderArsiv(); },
    tebligat: function() { if (typeof window.renderTebligat === 'function') window.renderTebligat(); },
    resmi: function() { if (typeof window.renderResmi === 'function') window.renderResmi(); },
    formlar: function() { cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3)">Kurumsal formlar yükleniyor...</div>'; },
  };
  if (renderMap[tab]) renderMap[tab]();
};
