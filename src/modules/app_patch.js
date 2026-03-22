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
  const sel = document.getElementById('ktn-uid');
  if (sel && sel.options.length <= 1) {
    const users = typeof loadUsers === 'function' ? loadUsers() : [];
    sel.innerHTML = '<option value="">Sorumlu seçin...</option>' +
      users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  }
  if (editId) {
    const k = (typeof loadKonteyn === 'function' ? loadKonteyn() : []).find(x => x.id === editId);
    if (k) {
      ['ktn-no','ktn-hat','ktn-etd','ktn-eta','ktn-url'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = k[id.replace('ktn-','')] || '';
      });
      if (sel) sel.value = String(k.uid || '');
      document.getElementById('mo-ktn-t') && (document.getElementById('mo-ktn-t').textContent = '✏️ Konteyner Düzenle');
    }
  } else {
    ['ktn-no','ktn-hat','ktn-etd','ktn-eta','ktn-url'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('mo-ktn-t') && (document.getElementById('mo-ktn-t').textContent = '+ Konteyner Ekle');
  }
  window.openMo?.('mo-konteyn');
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
window.migrateLocalToFirestore = window.migrateLocalToFirestore || function() {};
window.resetAll = window.resetAll || function() {
  if (confirm('Tüm veriyi sıfırlamak istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ.')) {
    window.App?.resetDemoData?.();
  }
};
window.exportAllXlsx = window.exportAllXlsx || function() {};

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
                         'rehber','numune','etkinlik','links'];
  if (window.ROLE_DEFAULT_MODULES?.manager) {
    managerExtras.forEach(id => {
      if (!window.ROLE_DEFAULT_MODULES.manager.includes(id)) {
        window.ROLE_DEFAULT_MODULES.manager.push(id);
      }
    });
  }

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
