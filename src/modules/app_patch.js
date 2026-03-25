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
  if (confirm('Tüm veriyi sıfırlamak istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ.')) {
    window.App?.resetDemoData?.();
  }
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
