/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/app_patch.js  —  v8.1.0
 * app.js'e dokunmadan V18 yeni panellerinin routing'ini ekler
 * index.html'de app.js'den HEMEN SONRA yüklenmeli
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)

// ── Yetki Kontrol Helper (STANDART-FIX-002) ──────────────────
/**
 * Toplu silme/güncelleme gibi kritik işlemler için yetki kontrolü.
 * getPermLevel() string döner: 'full' | 'manage' | 'view' | 'count'
 * @param {string} islem - 'toplu_sil' | 'toplu_guncelle' | 'sil' | 'duzenle' | 'goruntule'
 * @returns {boolean}
 */
window._yetkiKontrol = function(islem) {
  var seviye = typeof window.getPermLevel === 'function' ? window.getPermLevel() : 'count';
  var izinliSeviyeler = {
    'toplu_sil':      ['full', 'manage'],
    'toplu_guncelle': ['full', 'manage'],
    'sil':            ['full', 'manage', 'view'],
    'duzenle':        ['full', 'manage', 'view'],
    'goruntule':      ['full', 'manage', 'view', 'count'],
  };
  var izinli = izinliSeviyeler[islem] || ['full'];
  if (izinli.indexOf(seviye) === -1) {
    window.toast?.('Bu işlem için yetkiniz yok', 'err');
    console.warn('[YETKİ] Reddedildi — seviye: ' + seviye + ', gerekli: ' + izinli.join('/'));
    return false;
  }
  return true;
};

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
    'hesap-ozeti': () => { window.renderHesapOzeti?.(); }, 'muavin': () => { window.renderMuavin?.(); },
    'gcb': () => { window.renderGcb?.(); },
    'alarm': () => { window.renderAlarm?.(); },
    'platform-rules': () => { window.renderPlatformKurallari?.(); },
    'kpi-panel': () => { window.renderKpiPanel?.() || window.KPI?.render?.(); },
    'users': () => { window.renderUsers?.() || window.Admin?.renderUsers?.(); },
    'activity': () => { window.renderActivity?.(); },
    'trash': () => { window.renderTrashPanel?.(); },
    'links': () => { window.renderLinks?.(); },
    'numune': () => { window.renderNumuneler?.(); },
    'satinalma-siparis': () => { window.renderSatinAlmaSiparis?.(); },
    'evrak': () => { window.renderEvrak?.(); },
    'arsiv': () => { window.renderArsiv?.(); },
    'docs': () => { window.renderDocs?.(); },
    'urunler': () => { window.renderUrunler?.(); },
    'urun-fiyat': () => { window._saUrunListeAc?.(); },
    'satin-alma': () => { window.renderSatinAlmaV2?.(); },
    'alindi-teklifler': () => { window.renderIhracatListesi?.(); },
    'alis-teklifleri': () => { window.renderAlisTeklifleri?.(); },
    'satis-teklifleri': () => { window.renderSatisTeklifleri?.(); },
    'formlar': () => { /* kurumsal formlar */ },
    'arsiv-hub': () => { window._renderArsivHub?.(); },
    'sistem-testler': () => { window._renderSistemTestler?.(); },
    'etkinlik': () => { window.renderEtkinlik?.(); },
    'tebligat': () => { window.renderTebligat?.(); },
    'resmi': () => { window.renderResmi?.(); },
    'temizlik': () => { window.renderTemizlik?.(); },
    'rehber': () => { window.renderRehber?.(); },
    'dashboard': () => { window.Dashboard?.render?.(); },
    'ihracat-ops': () => { window.renderIhracatOps?.(); },
    'ihracat-formlar': () => { window.renderIhracatFormlar?.(); },
    'talimatlar': () => { window.renderTalimatlar?.(); },
    'dashboardDetay': () => { window.DashboardDetay?.render?.(); },
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
    // FIX 5: Özlü söz banner — her panel geçişinde inject et
    var ozluModulMap = {odemeler:'nakit-akisi',satinalma:'satinalma',kargo:'kargo',pusula:'pusula-pro',admin:'dashboard'};
    var ozluKey = ozluModulMap[id];
    if (ozluKey && typeof window._renderOzluSozBanner === 'function') {
      setTimeout(function() {
        var panel = document.getElementById('panel-' + id);
        if (!panel) return;
        var existing = panel.querySelector('.ozlu-soz-injected');
        if (existing) return; // zaten var
        var div = document.createElement('div');
        div.className = 'ozlu-soz-injected';
        div.innerHTML = window._renderOzluSozBanner(ozluKey);
        var odmList = panel.querySelector('#odm-list');
        if (odmList && odmList.parentNode) {
          odmList.parentNode.insertBefore(div, odmList.nextSibling);
        } else {
          var sticky = panel.querySelector('[style*="position:sticky"]');
          if (sticky) sticky.parentNode.insertBefore(div, sticky.nextSibling);
        }
      }, 200);
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
  // İhracat bilgi kontrolü — bağlı satınalmadaki ürünler tam mı?
  var ihracatId = entry.ihracatId || '';
  if (ihracatId) {
    var saList = typeof loadSatinalma === 'function' ? loadSatinalma().filter(function(s){return s.containerNo === no || s.exportId === ihracatId;}) : [];
    var urunlerAll = typeof loadUrunler === 'function' ? loadUrunler() : [];
    var eksikler = [];
    var hasIMO = false;
    saList.forEach(function(s) {
      var urun = urunlerAll.find(function(u){return u.tedarikci===s.supplier || u.urunAdi===s.supplier;});
      if (urun) {
        if (!_calcIhracatTam(urun)) eksikler.push(urun.orijinalAdi || urun.urunAdi);
        if (urun.imolu === 'E') hasIMO = true;
      }
    });
    if (eksikler.length) {
      window.toast?.('İhracat bilgisi eksik ürünler var: ' + eksikler.join(', '), 'warn');
    }
    if (hasIMO) {
      window.toast?.('DG Cargo uyarısı: Bu sevkiyatta IMO sınıflı ürün var — MSDS belgesi zorunlu', 'warn');
    }
    // Konteynıra IMO flag ekle
    if (!eid) d[d.length - 1].hasIMO = hasIMO;
    else { var kk = d.find(function(x){return x.id===eid;}); if (kk) kk.hasIMO = hasIMO; }
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
window._firestoreAktarBaslat = async function() {
  var statusId = document.getElementById('firestore-aktar-status') ? 'firestore-aktar-status' : 'firestore-aktar-status2';
  var statusEl = document.getElementById(statusId);
  var btn = document.getElementById('btn-migrate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Aktarılıyor...'; }
  if (statusEl) statusEl.innerHTML = '<div style="color:var(--t2)">Başlatılıyor...</div>';
  try {
    if (window.DB && typeof window.DB.manualUploadToFirestore === 'function') {
      await window.DB.manualUploadToFirestore(statusId);
    } else {
      if (statusEl) statusEl.innerHTML = '<div style="color:var(--t2)">⏳ Eski yöntemle aktarılıyor...</div>';
      await window.migrateLocalToFirestore();
      if (statusEl) statusEl.innerHTML = '<div style="color:#16A34A">✓ Aktarım tamamlandı</div>';
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = '<div style="color:#DC2626">✗ Hata: ' + e.message + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '☁️ Yerel Veriyi Buluta Aktar'; }
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
  'pusula-pro': ['nb-pus'],
  'hedefler':   [],
  'ceo':        ['nb-ceo'],
  'kpi-panel':  ['nb-kpi-panel'],
  'admin':      ['nb-admin'],
  'users':      ['nb-admin'],
  'activity':   ['nb-activity'],
  'settings':   ['nb-settings'],
  'trash':      ['nb-trash'],
};

window.PANEL_MODULE_MAP = {
  'notes':'notes','links':'links','rehber':'rehber',
  'crm':'crm','gorusme':'gorusme','etkinlik':'etkinlik','numune':'numune',
  'lojistik':'lojistik','stok':'stok','kargo':'kargo',
  'finans':'finans','odemeler':'odemeler','pirim':'pirim','hesap':'hesap',
  'ik-hub':'ik','ik':'ik','evrak':'evrak','temizlik':'temizlik','puantaj':'puantaj',
  'docs':'docs','formlar':'formlar','arsiv':'arsiv','tebligat':'tebligat','resmi':'resmi',
  'pusula':'pusula-pro','hedefler':'hedefler',
  'ceo':'ceo','kpi-panel':'kpi-panel','admin':'users',
  'activity':'activity','settings':'settings','trash':'trash',
  'hesap-ozeti':'hesap-ozeti','gcb':'gcb','alarm':'alarm',
  'sistem-testler':'sistem-testler','platform-rules':'platform-rules',
};

function _applyRoleUI(user) {
  if (!user) return;
  const role    = user.role || 'staff';
  const isAdmin = role === 'admin';
  const modules = user.modules || window.ROLE_DEFAULT_MODULES?.[role] || [];

  // Admin — her şey görünür, ama accordion durumunu koru
  if (isAdmin) {
    document.querySelectorAll('.nsec-header, .nsec').forEach(h => h.style.display = '');
    // Collapsed section'daki butonları gizli tut, sadece açık section butonlarını göster
    var _nsecState = typeof loadNsecState === 'function' ? loadNsecState() : {};
    document.querySelectorAll('.nb').forEach(function(b) {
      // Bu butonun section'ını bul
      var prev = b.previousElementSibling;
      while (prev && !prev.classList.contains('nsec')) prev = prev.previousElementSibling;
      var sectionId = prev ? prev.id : '';
      // Section collapsed ise butonu gizli tut
      if (sectionId && _nsecState[sectionId] === true) {
        b.style.display = 'none';
      } else {
        b.style.display = '';
      }
    });
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
  // Accordion durumunu koru — collapsed section butonları gizli kalmalı
  var _nsecState2 = typeof loadNsecState === 'function' ? loadNsecState() : {};
  document.querySelectorAll('.nb').forEach(btn => {
    const panelId = _getPanelId(btn);
    if (!panelId) return;
    // Yetkisi yok → gizle
    if (!['dashboard', 'settings'].includes(panelId)) {
      const checkId = panelId === 'ik-hub' ? 'ik' : panelId;
      if (!allowed.has(checkId) && !allowed.has(panelId)) { btn.style.display = 'none'; return; }
    }
    // Yetkisi var ama section collapsed → gizli tut
    var prev = btn.previousElementSibling;
    while (prev && !prev.classList.contains('nsec')) prev = prev.previousElementSibling;
    var sId = prev ? prev.id : '';
    if (sId && _nsecState2[sId] === true) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  // 2. Bölüm başlıklarını — altında yetkili buton yoksa gizle
  // Collapsed section'ları gizleme — sadece hiç yetkili buton olmayanları gizle
  document.querySelectorAll('.nsec-header, .nsec').forEach(header => {
    var hId = header.id || '';
    var isCollapsed = _nsecState2[hId] === true;
    // Collapsed section: başlık görünür kalmalı (tekrar açılabilmesi için)
    if (isCollapsed) { header.style.display = ''; return; }
    // Açık section: altında yetkili buton var mı kontrol et
    let sib = header.nextElementSibling;
    let hasAllowed = false;
    while (sib && !sib.classList.contains('nsec-header') && !sib.classList.contains('nsec')) {
      if (sib.classList.contains('nb') && sib.style.display !== 'none') { hasAllowed = true; break; }
      sib = sib.nextElementSibling;
    }
    header.style.display = hasAllowed ? '' : 'none';
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
      // modules null = tüm erişim (admin gibi)
      if (cu.modules === null || cu.modules === undefined) return _baseNav(panelId, btn);
      // Modül kontrolü — canModule ile tutarlı
      const reqMod = panelId === 'ik-hub' ? 'ik' : (window.PANEL_MODULE_MAP?.[panelId] || panelId);
      if (typeof window.canModule === 'function' && window.canModule(reqMod)) return _baseNav(panelId, btn);
      // canModule yoksa doğrudan kontrol
      var mods = cu.modules || window.ROLE_DEFAULT_MODULES?.[cu.role] || [];
      if (mods.includes(reqMod)) return _baseNav(panelId, btn);
      window.toast?.('Bu bölüme erişim yetkiniz yok', 'err');
    };
    window.App.nav = _wrapped;
    window.nav     = _wrapped;
  }

  console.log('[UI] Role applied:', role, '| modüller:', modules.join(', ') || '—');

  // Accordion durumunu restore et — _applyRoleUI butonları gizleyip gösterdikten sonra
  setTimeout(function() {
    if (typeof window._initNsecState === 'function') window._initNsecState();
    else if (typeof loadNsecState === 'function') {
      // Fallback: _initNsecState yoksa manuel restore
      var st = loadNsecState();
      document.querySelectorAll('.nsec').forEach(function(nsEl) {
        if (!nsEl.id || st[nsEl.id] !== true) return;
        nsEl.classList.add('collapsed');
      });
    }
  }, 100);
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
var URUN_ULKELER = window.MENSEI || ['Türkiye','Çin','Hindistan','Almanya','ABD','İtalya','Fransa','İngiltere','Japonya','Güney Kore','Brezilya','Mısır','Fas','İran','Pakistan','Diğer'];

window.renderUrunler = function() {
  var panel = document.getElementById('panel-urunler'); if (!panel) return;
  var d = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Ürün Kataloğu</div><div style="font-size:10px;color:var(--t3);margin-top:2px" id="urun-sub">Tedarikçi ürünleri</div></div>'
      + '<div style="display:flex;gap:6px">'
      + '<button onclick="window._exportUrunlerXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">⬇ Excel</button>'
      + '<button onclick="window._importUrunlerExcel?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📥 İçe Aktar</button>'
      + '<button onclick="window._downloadUrunTemplate?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📋 Şablon</button>'
      + (window.isAdmin?.() ? '<button onclick="window._insertDemoUrunler?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">🎲 Demo</button>' : '')
      + '<button onclick="window.openUrunForm?.()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Ürün Ekle</button>'
      + '<button onclick="event.stopPropagation();window.App?.nav(\'satinalma\')" style="font-size:11px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">→ Satınalma</button>'
      + '<button onclick="event.stopPropagation();window.App?.nav(\'belgeyonetimi\')" style="font-size:11px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Evraklar →</button>'
      + (window.isAdmin?.() ? '<button onclick="event.stopPropagation();var p=document.getElementById(\'uf-kat-yonetim\');if(p){p.style.display=p.style.display===\'none\'?\'\':\'none\';}else{var d=document.createElement(\'div\');d.id=\'uf-kat-yonetim\';d.style.cssText=\'position:fixed;top:130px;right:20px;z-index:5000\';d.innerHTML=window._ufKatPanelHTML();document.body.appendChild(d);}" style="font-size:11px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">⚙ Kategoriler</button>' : '')
      + '</div>'
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
  var fl = q ? d.filter(function(u) { return (u.urunAdi||'').toLowerCase().includes(q) || (u.urunKodu||'').toLowerCase().includes(q) || (u.tedarikci||'').toLowerCase().includes(q) || (u.kategori||'').toLowerCase().includes(q) || (u.gtip||'').toLowerCase().includes(q); }) : d;
  /* URUN-LIST-001: Görsel/Tamamlanma filtreleri */
  if (window._urunFiltre === 'gorselli') fl = fl.filter(function(u) { return u.gorsel; });
  else if (window._urunFiltre === 'gorselsiz') fl = fl.filter(function(u) { return !u.gorsel; });
  else if (window._urunFiltre === 'tamamlandi') fl = fl.filter(function(u) { return u.urunAdi && u.tedarikci && u.kategori && u.gorsel; });
  else if (window._urunFiltre === 'eksik') fl = fl.filter(function(u) { return !u.urunAdi || !u.tedarikci || !u.kategori || !u.gorsel; });
  /* URUN-LIST-002: Tedarikçi filtresi */
  if (window._urunTedFiltre) fl = fl.filter(function(u) { return u.tedarikci === window._urunTedFiltre; });
  /* GIZLILIK-002: Seviye bazlı filtre */
  if (typeof window.canSee === 'function') fl = fl.filter(function(u) { return window.canSee(u.gizlilik || 1); });

  /* Sayfalama (STANDART-FIX-013) */
  if (!window._urunSayfa) window._urunSayfa = 1;
  if (q) window._urunSayfa = 1;
  var _URUN_SAYFA_BOY = 50;
  var _urunToplamS = Math.max(1, Math.ceil(fl.length / _URUN_SAYFA_BOY));
  if (window._urunSayfa > _urunToplamS) window._urunSayfa = _urunToplamS;
  var _urunBas = (window._urunSayfa - 1) * _URUN_SAYFA_BOY;
  var sayfaUrun = fl.slice(_urunBas, _urunBas + _URUN_SAYFA_BOY);

  var cont = document.getElementById('urun-list'); if (!cont) return;

  /* URUN-LIST-001: Filtre butonları */
  var _aktifFiltre = window._urunFiltre || 'tumu';
  var filtreH = '<div style="display:flex;gap:6px;padding:6px 16px;flex-wrap:wrap">';
  [['tumu','Tümü'],['gorselli','Görselli'],['gorselsiz','Görselsiz'],['tamamlandi','Tamamlandı'],['eksik','Eksik Bilgi']].forEach(function(f) {
    var ak = _aktifFiltre === f[0];
    filtreH += '<button onclick="event.stopPropagation();window._urunFiltre=\'' + f[0] + '\';window.renderUrunler()" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:20px;background:' + (ak ? 'var(--t)' : 'transparent') + ';color:' + (ak ? 'var(--sf)' : 'var(--t2)') + ';cursor:pointer;font-family:inherit">' + f[1] + '</button>';
  });
  /* URUN-AUDIT-002: Admin user filtre */
  var isAdmin = window.isAdmin?.();
  var kullanicilar = isAdmin ? [] : [];
  if (isAdmin) { var _uSet = {}; d.forEach(function(u){ var c = u.createdBy||''; if(c && !_uSet[c]){ _uSet[c]=true; kullanicilar.push(c); } }); kullanicilar.sort(); }
  var aktifUser = window._urunUserFiltre||'';
  if(isAdmin && kullanicilar.length > 1) {
    filtreH += '<select onchange="event.stopPropagation();window._urunUserFiltre=this.value;window.renderUrunler()" onclick="event.stopPropagation()" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit">';
    filtreH += '<option value="">Tüm Kullanıcılar</option>';
    kullanicilar.forEach(function(k){ filtreH += '<option value="'+esc(k)+'"'+(aktifUser===k?' selected':'')+'>'+esc(k)+'</option>'; });
    filtreH += '</select>';
  }
  if(isAdmin && aktifUser) fl = fl.filter(function(u){ return (u.createdBy||'')===aktifUser; });
  filtreH += '</div>';

  /* URUN-LIST-002: Tedarikçi pill butonları */
  var tedList = []; var _tedSet = {};
  fl.forEach(function(u) { var t = u.tedarikci || ''; if (t && !_tedSet[t]) { _tedSet[t] = true; tedList.push(t); } });
  tedList.sort();
  var aktifTed = window._urunTedFiltre || '';
  var tedH = '';
  if (tedList.length > 1) {
    tedH = '<div style="padding:4px 16px 6px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">';
    tedH += '<span style="font-size:9px;color:var(--t3);font-weight:500">TEDARİKÇİ:</span>';
    tedH += '<button onclick="event.stopPropagation();window._urunTedFiltre=\'\';window.renderUrunler()" style="font-size:10px;padding:2px 8px;border:0.5px solid var(--b);border-radius:20px;background:' + (aktifTed === '' ? 'var(--t)' : 'transparent') + ';color:' + (aktifTed === '' ? 'var(--sf)' : 'var(--t2)') + ';cursor:pointer;font-family:inherit">Tümü</button>';
    tedList.forEach(function(t) {
      var ak = aktifTed === t;
      tedH += '<button onclick="event.stopPropagation();window._urunTedFiltre=\'' + t.replace(/'/g, "\\'") + '\';window.renderUrunler()" style="font-size:10px;padding:2px 8px;border:0.5px solid var(--b);border-radius:20px;background:' + (ak ? 'var(--t)' : 'transparent') + ';color:' + (ak ? 'var(--sf)' : 'var(--t2)') + ';cursor:pointer;font-family:inherit;white-space:nowrap">' + t + '</button>';
    });
    tedH += '</div>';
  }

  /* Toplu islem bar */
  var bulkH = filtreH + tedH + '<div id="urun-bulk-bar" style="display:none;padding:6px 16px;background:#FCEBEB;border-bottom:0.5px solid #E24B4A;align-items:center;gap:8px;font-size:11px;color:#791F1F">'
    + '<span id="urun-bulk-cnt">0</span> urun secili '
    + '<button onclick="event.stopPropagation();window._urunTopluSil()" style="padding:3px 10px;border-radius:5px;border:0.5px solid #E24B4A;background:#FCEBEB;color:#791F1F;font-size:10px;cursor:pointer;font-family:inherit">Toplu Sil</button>'
    + '<button onclick="event.stopPropagation();window._urunTopluGuncelle()" style="padding:3px 10px;border-radius:5px;border:0.5px solid var(--ac);background:rgba(99,102,241,.06);color:var(--ac);font-size:10px;cursor:pointer;font-family:inherit">Toplu Guncelle</button>'
    + '<button onclick="event.stopPropagation();window._urunTumunuSec()" style="padding:3px 10px;border-radius:5px;border:0.5px solid var(--b);background:var(--sf);color:var(--t2);font-size:10px;cursor:pointer;font-family:inherit">Tumunu Sec</button>'
    + '</div>';

  if (!fl.length) { cont.innerHTML = bulkH + '<div style="padding:40px;text-align:center;color:var(--t3)">Ürün yok — yukarıdan ekleyin</div>'; return; }
  var html = bulkH;
  sayfaUrun.forEach(function(u) {
    html += '<div style="display:flex;align-items:center;gap:12px;padding:3px 10px;border-bottom:0.5px solid var(--b);transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<input type="checkbox" class="urun-bulk-chk" data-id="' + u.id + '" onclick="event.stopPropagation();window._urunBulkCheck()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac);flex-shrink:0">'
      + '<div style="position:relative;width:24px;height:24px;flex-shrink:0" onmouseenter="var z=this.querySelector(\'.uz\');if(z)z.style.display=\'block\'" onmouseleave="var z=this.querySelector(\'.uz\');if(z)z.style.display=\'none\'">'
      + (u.gorsel ? '<img src="' + u.gorsel + '" style="width:24px;height:24px;border-radius:3px;object-fit:cover;border:0.5px solid var(--b)">' : '<div style="width:24px;height:24px;border-radius:3px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:12px">📦</div>')
      + (u.gorsel ? '<div class="uz" style="display:none;position:fixed;z-index:9999;pointer-events:none"><img src="' + u.gorsel + '" style="width:140px;height:140px;object-fit:cover;border-radius:8px;border:0.5px solid var(--b);box-shadow:0 4px 12px rgba(0,0,0,.2)"></div>' : '')
      + '</div>'
      + '<div onclick="event.stopPropagation();window._urunPeekAc?.(\'' + u.id + '\')" style="flex:1;cursor:pointer;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--t)">' + esc(u.urunAdi||'—') + (u.imolu==='E'?' <span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#F59E0B22;color:#D97706;font-weight:700">IMO</span>':'') + (_calcIhracatTam(u)?' <span style="color:#16A34A;font-size:10px">✓</span>':' <span style="color:#DC2626;font-size:10px" title="İhracat bilgisi eksik">⚠</span>') + '</div><div style="font-size:10px;color:var(--t3)">' + esc(u.urunKodu||u.duayKodu||'') + ' · ' + esc(u.tedarikci||'') + ' · ' + esc(u.kategori||'') + (u.createdBy?' · <span style="color:var(--t3)">'+esc(u.createdBy)+'</span>':'') + (u.createdAt?' · <span style="color:var(--t3);font-size:9px">'+esc(String(u.createdAt).slice(0,10))+'</span>':'') + ' · %' + _calcIhracatPct(u) + '</div></div>'
      + '<div style="font-size:12px;font-weight:600;color:var(--t)">' + (u.sonFiyat ? u.sonFiyat.toLocaleString('tr-TR') + ' ' + (u.paraBirimi||'USD') : '—') + '</div>'
      + '<div style="display:flex;gap:4px;flex-shrink:0">'
      + '<button onclick="event.stopPropagation();window.openUrunForm?.(\'' + u.id + '\')" style="padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:none;cursor:pointer;font-size:10px;color:var(--t3);font-family:inherit">\u270f\ufe0f</button>'
      + '<button onclick="event.stopPropagation();window._urunTekSil?.(\'' + u.id + '\')" style="padding:4px 8px;border:0.5px solid #E24B4A;border-radius:5px;background:none;cursor:pointer;font-size:10px;color:#DC2626;font-family:inherit">\ud83d\uddd1</button>'
      + '</div>'
    + '</div>';
  });

  /* Sayfalama footer */
  if (fl.length > _URUN_SAYFA_BOY) {
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;font-size:10px;color:var(--t3);border-top:0.5px solid var(--b)">';
    html += '<span>' + (_urunBas + 1) + '–' + Math.min(_urunBas + _URUN_SAYFA_BOY, fl.length) + ' / ' + fl.length + ' ürün</span>';
    html += '<div style="display:flex;gap:4px">';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._urunSayfa=Math.max(1,window._urunSayfa-1);window.renderUrunler()" style="font-size:10px;padding:2px 8px"' + (window._urunSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._urunSayfa=Math.min(' + _urunToplamS + ',window._urunSayfa+1);window.renderUrunler()" style="font-size:10px;padding:2px 8px"' + (window._urunSayfa >= _urunToplamS ? ' disabled' : '') + '>\u2192</button>';
    html += '</div></div>';
  }
  cont.innerHTML = html;
};

window._urunBulkCheck = function() {
  var n = document.querySelectorAll('.urun-bulk-chk:checked').length;
  var bar = document.getElementById('urun-bulk-bar');
  var cnt = document.getElementById('urun-bulk-cnt');
  if (bar) bar.style.display = n ? 'flex' : 'none';
  if (cnt) cnt.textContent = n;
};

window._urunTopluSil = function() {
  var checked = document.querySelectorAll('.urun-bulk-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return cb.dataset.id; });
  if (!ids.length) { window.toast?.('Urun secin', 'err'); return; }
  window.confirmModal?.(ids.length + ' urun silinecek?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var raw = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true, _dahilSilinenler:true}) : [];
      var now = new Date().toISOString();
      var cuId = window.Auth?.getCU?.()?.id || '';
      var silinen = 0;
      ids.forEach(function(id) {
        var x = raw.find(function(u) { return String(u.id) === String(id); });
        if (x && !x.isDeleted) { x.isDeleted = true; x.deletedAt = now; x.deletedBy = cuId; silinen++; }
      });
      if (typeof window.storeUrunler === 'function') window.storeUrunler(raw);
      else if (typeof window.DB?.storeUrunler === 'function') window.DB.storeUrunler(raw);
      window.toast?.(silinen + ' urun silindi', 'ok');
      window.logActivity?.('urun', 'Toplu silme: ' + silinen + ' urun');
      window.renderUrunler?.();
    }
  });
};

/** Tek urun sil — Urun Katalogu */
window._urunTekSil = function(id) {
  window.confirmModal?.('Bu urunu silmek istediginizden emin misiniz?', {
    title: 'Urun Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var raw = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true, _dahilSilinenler:true}) : [];
      var item = raw.find(function(u) { return String(u.id) === String(id); });
      if (item) {
        item.isDeleted = true;
        item.deletedAt = new Date().toISOString();
        item.deletedBy = window.Auth?.getCU?.()?.id || '';
      }
      if (typeof window.storeUrunler === 'function') window.storeUrunler(raw);
      else if (typeof window.DB?.storeUrunler === 'function') window.DB.storeUrunler(raw);
      window.toast?.('Urun silindi', 'ok');
      window.logActivity?.('urun', 'Urun silindi: ' + (item?.urunAdi || id));
      window.renderUrunler?.();
    }
  });
};

/** Tumunu sec / kaldir */
window._urunTumunuSec = function() {
  var boxes = document.querySelectorAll('.urun-bulk-chk');
  var allChecked = Array.from(boxes).every(function(cb) { return cb.checked; });
  boxes.forEach(function(cb) { cb.checked = !allChecked; });
  window._urunBulkCheck();
};

window._urunTopluGuncelle = function() {
  if (!window._yetkiKontrol?.('toplu_guncelle')) return;
  var checked = document.querySelectorAll('.urun-bulk-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return cb.dataset.id; });
  if (!ids.length) { window.toast?.('Kayıt seçilmedi', 'warn'); return; }
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-urun-toplu';
  mo.innerHTML = '<div class="moc" style="max-width:380px"><div class="moh"><span class="mot">' + ids.length + ' Ürün — Toplu Güncelle</span><button class="mcl" onclick="this.closest(\'.mo\').remove()">✕</button></div>'
    + '<div class="mob" style="display:flex;flex-direction:column;gap:10px">'
    + '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Tedarikçi</label><input class="fi" id="urun-tg-ted" placeholder="— Değiştirme —" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Kategori</label><input class="fi" id="urun-tg-kat" placeholder="— Değiştirme —" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '</div><div class="mof"><button class="btn" onclick="this.closest(\'.mo\').remove()">İptal</button><button class="btn btnp" onclick="event.stopPropagation();window._urunTopluGuncelleKaydet()">Uygula</button></div></div>';
  document.body.appendChild(mo);
  window.openMo?.('mo-urun-toplu');
};

window._urunTopluGuncelleKaydet = function() {
  var checked = document.querySelectorAll('.urun-bulk-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return cb.dataset.id; });
  var ted = (document.getElementById('urun-tg-ted')?.value || '').trim();
  var kat = (document.getElementById('urun-tg-kat')?.value || '').trim();
  if (!ted && !kat) { window.toast?.('Güncellenecek alan seçilmedi', 'warn'); return; }
  var raw = JSON.parse(localStorage.getItem('ak_urunler1') || '[]');
  ids.forEach(function(id) {
    var x = raw.find(function(u) { return String(u.id) === String(id); });
    if (x) {
      if (ted) x.tedarikci = ted;
      if (kat) x.kategori = kat;
      x.updatedAt = new Date().toISOString();
    }
  });
  if (typeof storeUrunler === 'function') storeUrunler(raw);
  else localStorage.setItem('ak_urunler1', JSON.stringify(raw));
  document.getElementById('mo-urun-toplu')?.remove();
  window.toast?.(ids.length + ' ürün güncellendi ✓', 'ok');
  window.logActivity?.('urun', 'Toplu güncelleme: ' + ids.length + ' ürün');
  window.renderUrunler?.();
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
    + '<div><div class="fl" style="color:#F59E0B" title="IMO sınıflandırması">IMO\'lu mu?</div><select class="fi" id="ur-imo" onchange="var d=document.getElementById(\'ur-imo-detail\');if(d)d.style.display=this.value===\'E\'?\'grid\':\'none\'"><option value="H"' + (u?.imolu!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.imolu==='E'?' selected':'') + '>Evet</option></select></div>'
    + '<div><div class="fl" style="color:#F59E0B">DİB\'li mi?</div><select class="fi" id="ur-dib"><option value="H"' + (u?.dibli!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.dibli==='E'?' selected':'') + '>Evet</option></select></div>'
    + '<div><div class="fl" style="color:#F59E0B">İhracat Kısıtı</div><select class="fi" id="ur-kisit"><option value="H"' + (u?.ihracatKisiti!=='E'?' selected':'') + '>Hayır</option><option value="E"' + (u?.ihracatKisiti==='E'?' selected':'') + '>Evet</option></select></div></div>'
    // IMO detay (IMO=E ise görünür)
    + '<div id="ur-imo-detail" style="display:' + (u?.imolu==='E'?'grid':'none') + ';grid-template-columns:1fr 1fr 1fr;gap:10px;padding:10px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px">'
    + '<div style="grid-column:span 3;font-size:11px;font-weight:700;color:#991B1B">⚠ IMO/Tehlikeli Madde Bilgileri</div>'
    + '<div><div class="fl" style="color:#DC2626">IMO Sınıfı *</div><select class="fi" id="ur-imo-sinif"><option value="">— Seçin —</option>' + ['1-Patlayıcılar','2-Gazlar','3-Yanıcı Sıvılar','4-Yanıcı Katılar','5-Oksitleyiciler','6-Zehirli','7-Radyoaktif','8-Aşındırıcılar','9-Diğer Tehlikeli'].map(function(s){return '<option value="'+s+'"'+(u?.imoSinifi===s?' selected':'')+'>Class '+s+'</option>';}).join('') + '</select></div>'
    + '<div><div class="fl" style="color:#DC2626">UN Numarası *</div><input class="fi" id="ur-imo-un" value="' + esc(u?.imoTehlikeNo||'') + '" placeholder="UN1234"></div>'
    + '<div><div class="fl" style="color:#DC2626">MSDS</div><button onclick="window.toast?.(\'MSDS PDF yükleme — belgeler sekmesinden\',\'info\')" class="btn btns" style="font-size:10px">📎 MSDS Yükle</button></div></div>'
    // HSC/GTİP kodu
    + '<div><div class="fl" style="color:#DC2626">HSC/GTİP Kodu (12 hane)</div><input class="fi" id="ur-hsc" value="' + esc(u?.hscKodu||u?.gtip||'') + '" placeholder="8542.31.00.00.00" maxlength="17"></div>'
    + '<div><div class="fl">İhracat Kısıtı Detay</div><input class="fi" id="ur-kisit-detay" value="' + esc(u?.ihracatKisitiDetay||'') + '" placeholder="Lisans gerektiren..."></div>'
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
    imoSinifi: (document.getElementById('ur-imo-sinif')?.value||'').trim(),
    imoTehlikeNo: (document.getElementById('ur-imo-un')?.value||'').trim(),
    dibli: document.getElementById('ur-dib')?.value||'H',
    ihracatKisiti: document.getElementById('ur-kisit')?.value||'H',
    ihracatKisitiDetay: (document.getElementById('ur-kisit-detay')?.value||'').trim(),
    hscKodu: (document.getElementById('ur-hsc')?.value||'').trim(),
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
  // İhracat bilgileri tamamlanma hesabı
  var target = eid ? d.find(function(x){return x.id===eid;}) : entry;
  if (target) target.ihracatBilgileriTam = _calcIhracatTam(target);
  if (typeof storeUrunler === 'function') storeUrunler(d);
  document.getElementById('mo-urun')?.remove();
  window.toast?.(eid?'Güncellendi ✓':'Ürün eklendi: '+entry.duayKodu,'ok');
  window.renderUrunler?.();
};

// ════════════════════════════════════════════════════════════════
// ALIŞ TEKLİFLERİ — B tasarımı
// ════════════════════════════════════════════════════════════════
/** @description Alış Teklifleri paneli — 3 format: Liste/Kart/Detay */
window._alisViewFormat = window._alisViewFormat || 'liste';
window._setAlisFormat = function(fmt) {
  window._alisViewFormat = fmt;
  // Buton stillerini güncelle
  ['liste','kart','detay'].forEach(function(f) {
    var btn = document.getElementById('alis-fmt-'+f);
    if (btn) {
      btn.style.background = f===fmt ? 'var(--ac)' : 'var(--sf)';
      btn.style.color = f===fmt ? '#fff' : 'var(--t2)';
    }
  });
  // Sadece listeyi yeniden render et
  window._renderAlisContent();
};

window.renderAlisTeklifleri = function() {
  var panel = document.getElementById('panel-alis-teklifleri'); if (!panel) return;
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var today = new Date().toISOString().slice(0,10);
  var fmt = window._alisViewFormat || 'liste';
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    var fmtBtnS = 'padding:4px 10px;border:0.5px solid var(--b);font-size:10px;cursor:pointer;font-family:inherit;transition:all .15s';
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Alış Teklifleri</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Tedarikçi teklifleri</div></div>'
      + '<div style="display:flex;gap:6px;align-items:center">'
      // Format butonları
      + '<div style="display:flex;border:0.5px solid var(--b);border-radius:7px;overflow:hidden">'
      + '<button id="alis-fmt-liste" onclick="window._setAlisFormat(\'liste\')" style="'+fmtBtnS+';border-radius:7px 0 0 7px;background:'+(fmt==='liste'?'var(--ac)':'var(--sf)')+';color:'+(fmt==='liste'?'#fff':'var(--t2)')+'">Liste</button>'
      + '<button id="alis-fmt-kart" onclick="window._setAlisFormat(\'kart\')" style="'+fmtBtnS+';border-left:none;background:'+(fmt==='kart'?'var(--ac)':'var(--sf)')+';color:'+(fmt==='kart'?'#fff':'var(--t2)')+'">Kart</button>'
      + '<button id="alis-fmt-detay" onclick="window._setAlisFormat(\'detay\')" style="'+fmtBtnS+';border-left:none;border-radius:0 7px 7px 0;background:'+(fmt==='detay'?'var(--ac)':'var(--sf)')+';color:'+(fmt==='detay'?'#fff':'var(--t2)')+'">Detay</button>'
      + '</div>'
      + '<input class="fi" id="alis-search" placeholder="Ara..." style="width:120px;font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:7px" oninput="window._renderAlisContent?.()">'
      + '<select class="fi" id="alis-sort" style="font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:7px" onchange="window._renderAlisContent?.()"><option value="">Sırala</option><option value="tarih">Tarih</option><option value="tutar">Tutar</option><option value="tedarikci">Tedarikçi</option></select>'
      + '<button onclick="window._alisKarsilastir?.()" id="alis-karsilastir-btn" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t3);font-size:11px;cursor:pointer;font-family:inherit" disabled>Karşılaştır</button>'
      + '<button onclick="window._exportAlisTeklifXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button>'
      + '<button onclick="window._openAlisModal?.()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Alış Teklifi</button>'
      + '</div></div>'
      + '<div id="alis-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + (typeof window._renderOzluSozBanner === 'function' ? window._renderOzluSozBanner('satinalma') : '')
      + '</div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="alis-list"></div></div>';
  }
  // İstatistikler
  var gecerli = d.filter(function(t){return !t.gecerlilikTarihi||t.gecerlilikTarihi>=today;}).length;
  var sureDolmus = d.filter(function(t){return t.gecerlilikTarihi&&t.gecerlilikTarihi<today;}).length;
  var statsEl = document.getElementById('alis-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">' + d.length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Geçerli</div><div style="font-size:22px;font-weight:600;color:#16A34A">' + gecerli + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Süresi Dolmuş</div><div style="font-size:22px;font-weight:600;color:#DC2626">' + sureDolmus + '</div></div>'
    + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam Değer</div><div style="font-size:22px;font-weight:600;color:var(--ac)">$' + Math.round(d.reduce(function(s,t){return s+(parseFloat(t.toplamTutar)||0);},0)).toLocaleString('tr-TR') + '</div></div>';
  window._renderAlisContent();
};

/** @description Alış teklif listesini aktif formata göre render eder */
window._renderAlisContent = function() {
  var cont = document.getElementById('alis-list'); if (!cont) return;
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var today = new Date().toISOString().slice(0,10);
  var fmt = window._alisViewFormat || 'liste';
  // FIX 7.8: Arama filtresi
  var q = (document.getElementById('alis-search')?.value || '').toLowerCase();
  if (q) d = d.filter(function(t) { return (t.tedarikci||'').toLowerCase().includes(q) || (t.teklifNo||'').toLowerCase().includes(q) || (t.urunAdi||'').toLowerCase().includes(q) || (t.piNo||'').toLowerCase().includes(q); });
  // FIX 7.7: Sıralama
  var sort = document.getElementById('alis-sort')?.value || '';
  if (sort === 'tarih') d = d.slice().sort(function(a,b){return (b.ts||'').localeCompare(a.ts||'');});
  if (sort === 'tutar') d = d.slice().sort(function(a,b){return (b.toplamTutar||0)-(a.toplamTutar||0);});
  if (sort === 'tedarikci') d = d.slice().sort(function(a,b){return (a.tedarikci||'').localeCompare(b.tedarikci||'');});
  if (!d.length) { cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">Henüz teklif yok</div>'; return; }

  if (fmt === 'liste') {
    window._renderAlisListe(cont, d, esc, today);
  } else if (fmt === 'kart') {
    window._renderAlisKart(cont, d, esc, today);
  } else {
    window._renderAlisDetay(cont, d, esc, today);
  }
};

/** FORMAT A — Liste (yatay tablo) — FIX 7.1/7.5/7.9 */
window._renderAlisListe = function(cont, d, esc, today) {
  var thS = 'font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;padding:6px 8px;white-space:nowrap';
  cont.innerHTML = '<div style="display:grid;grid-template-columns:24px 90px 130px 140px 60px 80px 50px 90px 80px 70px 120px;gap:0;padding:0;background:var(--s2);border-bottom:0.5px solid var(--b);min-width:950px">'
    + '<div style="'+thS+'"></div><div style="'+thS+'">Teklif No</div><div style="'+thS+'">Tedarikçi</div><div style="'+thS+'">Ürün</div><div style="'+thS+'">Miktar</div><div style="'+thS+'">B.Fiyat</div><div style="'+thS+'">Döviz</div><div style="'+thS+'">Toplam</div><div style="'+thS+'">Geçerlilik</div><div style="'+thS+'">Durum</div><div style="'+thS+'">İşlem</div></div>'
    + '<div style="overflow-x:auto">' + d.map(function(t) {
      var expired = t.gecerlilikTarihi && t.gecerlilikTarihi < today;
      // FIX 7.1: Son 2 gün uyarı
      var yaklasan = false;
      if (t.gecerlilikTarihi && !expired) {
        var kalan = Math.ceil((new Date(t.gecerlilikTarihi) - new Date(today)) / 86400000);
        yaklasan = kalan <= 2;
      }
      var badge = expired ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#DC262622;color:#DC2626">Süresi Doldu</span>' : yaklasan ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#F59E0B22;color:#D97706">Son 2 gün!</span>' : '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#16A34A22;color:#16A34A">Geçerli</span>';
      // FIX 7.9: Süresi dolmuş kırmızı sol border
      var borderLeft = expired ? 'border-left:3px solid #DC2626;' : yaklasan ? 'border-left:3px solid #F59E0B;' : '';
      return '<div style="display:grid;grid-template-columns:24px 90px 130px 140px 60px 80px 50px 90px 80px 70px 120px;gap:0;padding:0;border-bottom:0.5px solid var(--b);min-width:950px;align-items:center;transition:background .1s;'+borderLeft+'" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
        + '<div style="padding:4px 6px"><input type="checkbox" class="alis-compare-cb" value="' + t.id + '" onchange="window._alisCompareCheck?.()" style="cursor:pointer"></div>'
        + '<div style="padding:6px 8px;font-size:11px;font-weight:600;color:var(--t);font-family:monospace">' + esc(t.teklifNo||'') + '</div>'
        + '<div style="padding:6px 8px;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.tedarikci||'') + '</div>'
        + '<div style="padding:6px 8px;font-size:11px;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.urunAdi||'') + '</div>'
        + '<div style="padding:6px 8px;font-size:11px;text-align:right">' + (t.miktar||0) + '</div>'
        + '<div style="padding:6px 8px;font-size:11px;text-align:right;font-weight:600">' + (t.birimFiyat||0).toLocaleString('tr-TR') + '</div>'
        + '<div style="padding:6px 8px;font-size:10px;color:var(--t3)">' + (t.paraBirimi||'USD') + '</div>'
        + '<div style="padding:6px 8px;font-size:11px;text-align:right;font-weight:600;color:var(--ac)">' + (t.toplamTutar||0).toLocaleString('tr-TR') + '</div>'
        + '<div style="padding:6px 8px;font-size:10px;color:var(--t3)">' + (t.gecerlilikTarihi||'—').slice(0,10) + '</div>'
        + '<div style="padding:6px 8px">' + badge + '</div>'
        + '<div style="padding:4px 6px;display:flex;gap:3px;flex-wrap:wrap">'
        + '<button onclick="window._convertToSatisTeklif?.(' + t.id + ')" style="padding:2px 5px;border:0.5px solid var(--ac);border-radius:3px;background:none;color:var(--ac);font-size:8px;cursor:pointer;font-family:inherit">Satış</button>'
        + '<button onclick="window._copyAlisTeklif?.(' + t.id + ')" style="padding:2px 5px;border:0.5px solid var(--b);border-radius:3px;background:none;color:var(--t3);font-size:8px;cursor:pointer;font-family:inherit" title="Kopyala">📋</button>'
        + '</div>'
      + '</div>';
    }).join('') + '</div>';
};

/** FIX 7.5: Teklif kopyala */
window._copyAlisTeklif = function(id) {
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var orig = d.find(function(t){return t.id===id;});
  if (!orig) return;
  var yeni = JSON.parse(JSON.stringify(orig));
  yeni.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
  var yr = new Date().getFullYear();
  yeni.teklifNo = 'TKL-' + yr + '-' + String(d.length+1).padStart(4,'0');
  yeni.ts = new Date().toISOString();
  yeni.createdBy = window.Auth?.getCU?.()?.id;
  d.unshift(yeni);
  if (typeof storeAlisTeklifleri === 'function') storeAlisTeklifleri(d);
  window.toast?.('Teklif kopyalandı: ' + yeni.teklifNo + ' ✓', 'ok');
  window.renderAlisTeklifleri?.();
};

/** FIX 4: Karşılaştırma — checkbox kontrol */
window._alisCompareCheck = function() {
  var checked = document.querySelectorAll('.alis-compare-cb:checked');
  var btn = document.getElementById('alis-karsilastir-btn');
  if (btn) {
    var n = checked.length;
    btn.disabled = n < 2 || n > 4;
    btn.style.color = (n >= 2 && n <= 4) ? 'var(--ac)' : 'var(--t3)';
    btn.textContent = n > 0 ? 'Karşılaştır (' + n + ')' : 'Karşılaştır';
  }
};

/** FIX 4: Karşılaştırma modal */
window._alisKarsilastir = function() {
  var checked = document.querySelectorAll('.alis-compare-cb:checked');
  if (checked.length < 2 || checked.length > 4) { window.toast?.('2-4 teklif seçin', 'warn'); return; }
  var ids = Array.from(checked).map(function(cb) { return parseInt(cb.value); });
  var all = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var teklifler = ids.map(function(id) { return all.find(function(t) { return t.id === id; }); }).filter(Boolean);
  if (teklifler.length < 2) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  // En düşük toplamı bul
  var minToplam = Math.min.apply(null, teklifler.map(function(t) { return t.toplamTutar || Infinity; }));
  var enIyi = teklifler.find(function(t) { return t.toplamTutar === minToplam; });
  var ex = document.getElementById('mo-alis-compare'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-alis-compare'; mo.style.zIndex = '2200';
  var colW = Math.floor(100 / teklifler.length);
  mo.innerHTML = '<div class="moc" style="max-width:' + (teklifler.length * 200 + 160) + 'px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:15px;font-weight:700">Teklif Karşılaştırma</div><button onclick="document.getElementById(\'mo-alis-compare\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + (enIyi ? '<div style="padding:8px 20px;background:#16A34A11;font-size:11px;color:#16A34A;font-weight:600;border-bottom:0.5px solid var(--b)">En İyi Teklif: ' + esc(enIyi.tedarikci || '') + ' — ' + (enIyi.toplamTutar || 0).toLocaleString('tr-TR') + ' ' + (enIyi.paraBirimi || 'USD') + '</div>' : '')
    + '<div style="padding:16px 20px;max-height:55vh;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:6px 8px;text-align:left;font-size:9px;color:var(--t3)">Alan</th>'
    + teklifler.map(function(t) { return '<th style="padding:6px 8px;text-align:center;font-size:9px;color:var(--t);font-weight:700">' + esc(t.teklifNo || '') + '</th>'; }).join('')
    + '</tr></thead><tbody>'
    + ['Tedarikçi','PI No','Ürün','Miktar','Birim Fiyat','KDV','Net Ödeme','Döviz','Geçerlilik'].map(function(label, ri) {
        var vals = teklifler.map(function(t) {
          if (ri === 0) return esc(t.tedarikci || '');
          if (ri === 1) return esc(t.piNo || '');
          if (ri === 2) return esc(t.urunAdi || (t.satirlar || [])[0]?.standartAdi || '');
          if (ri === 3) return String(t.miktar || (t.satirlar || [])[0]?.miktar || 0);
          if (ri === 4) return (t.birimFiyat || (t.satirlar || [])[0]?.birimFiyat || 0).toLocaleString('tr-TR');
          if (ri === 5) return (t.kdvOrani || 0) + '%' + (t.kdvOdenirMi === false ? ' (Ödenmez)' : '');
          if (ri === 6) return (t.toplamTutar || 0).toLocaleString('tr-TR');
          if (ri === 7) return t.paraBirimi || 'USD';
          if (ri === 8) return t.gecerlilikTarihi || '—';
          return '';
        });
        // En düşük fiyatı yeşil vurgula (satır 4 ve 6)
        var minVal = (ri === 4 || ri === 6) ? Math.min.apply(null, teklifler.map(function(t) { return ri === 4 ? (t.birimFiyat || (t.satirlar || [])[0]?.birimFiyat || Infinity) : (t.toplamTutar || Infinity); })) : null;
        return '<tr style="border-bottom:0.5px solid var(--b)"><td style="padding:5px 8px;font-weight:600;color:var(--t3)">' + label + '</td>'
          + vals.map(function(v, vi) {
              var isMin = false;
              if (ri === 4) isMin = parseFloat(String(teklifler[vi].birimFiyat || (teklifler[vi].satirlar || [])[0]?.birimFiyat || 0)) === minVal;
              if (ri === 6) isMin = parseFloat(String(teklifler[vi].toplamTutar || 0)) === minVal;
              return '<td style="padding:5px 8px;text-align:center;' + (isMin ? 'color:#16A34A;font-weight:700;background:#16A34A08' : '') + '">' + v + '</td>';
            }).join('')
          + '</tr>';
      }).join('')
    + '</tbody></table></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

/** FORMAT B — Kart görünümü */
window._renderAlisKart = function(cont, d, esc, today) {
  cont.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:16px">'
    + d.map(function(t) {
      var expired = t.gecerlilikTarihi && t.gecerlilikTarihi < today;
      var badgeColor = expired ? '#DC2626' : '#16A34A';
      var badgeBg = expired ? '#DC262611' : '#16A34A11';
      var badgeText = expired ? 'Süresi Dolmuş' : 'Geçerli';
      var satirSayisi = (t.satirlar||[]).length;
      var imoVar = (t.satirlar||[]).some(function(s){return s.imoMu;});
      return '<div style="border:0.5px solid var(--b);border-radius:10px;background:var(--sf);overflow:hidden;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'\'">'
        // Kart başlık
        + '<div style="padding:12px 14px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
        + '<div><div style="font-size:12px;font-weight:700;color:var(--t);font-family:monospace">' + esc(t.teklifNo||'') + '</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + esc(t.tedarikci||'') + '</div></div>'
        + '<span style="font-size:8px;padding:2px 6px;border-radius:4px;background:'+badgeBg+';color:'+badgeColor+';font-weight:600">' + badgeText + '</span></div>'
        // Kart içerik
        + '<div style="padding:12px 14px">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">'
        + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Ürün</div><div style="font-size:11px;color:var(--t);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.urunAdi||'—') + '</div></div>'
        + '<div style="text-align:right"><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Tutar</div><div style="font-size:14px;font-weight:700;color:var(--ac)">' + (t.toplamTutar||0).toLocaleString('tr-TR') + ' ' + (t.paraBirimi||'USD') + '</div></div>'
        + '</div>'
        + '<div style="display:flex;gap:12px;font-size:10px;color:var(--t3);margin-bottom:8px">'
        + '<span>Miktar: <b style="color:var(--t)">' + (t.miktar||0) + '</b></span>'
        + '<span>B.Fiyat: <b style="color:var(--t)">' + (t.birimFiyat||0).toLocaleString('tr-TR') + '</b></span>'
        + (satirSayisi > 1 ? '<span>' + satirSayisi + ' kalem</span>' : '')
        + (imoVar ? '<span style="color:#D97706;font-weight:700">IMO</span>' : '')
        + '</div>'
        + '<div style="display:flex;gap:6px;font-size:10px;color:var(--t3)">'
        + (t.piNo ? '<span>PI: ' + esc(t.piNo) + '</span>' : '')
        + (t.jobId ? '<span style="cursor:pointer;color:var(--ac)" onclick="window.openJobIdHub?.(\''+esc(t.jobId)+'\')">Job: ' + esc(t.jobId) + '</span>' : '')
        + '<span>Son: ' + (t.gecerlilikTarihi||'—').slice(0,10) + '</span>'
        + '</div></div>'
        // Kart alt
        + '<div style="padding:8px 14px;border-top:0.5px solid var(--b);background:var(--s2);display:flex;gap:6px;justify-content:flex-end">'
        + '<button onclick="window._convertToSatisTeklif?.(' + t.id + ')" style="padding:3px 8px;border:0.5px solid var(--ac);border-radius:4px;background:none;color:var(--ac);font-size:9px;cursor:pointer;font-family:inherit">Satışa Dönüştür</button>'
        + '<button onclick="window._openAlisDetayModal?.(' + t.id + ')" style="padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:none;color:var(--t2);font-size:9px;cursor:pointer;font-family:inherit">Detay</button>'
        + '</div></div>';
    }).join('') + '</div>';
};

/** FORMAT C — Detaylı Excel tarzı (tüm satirlar açık) */
window._renderAlisDetay = function(cont, d, esc, today) {
  var thS = 'font-size:8px;font-weight:700;color:var(--t3);text-transform:uppercase;padding:5px 8px;white-space:nowrap;background:var(--s2)';
  var html = '';
  d.forEach(function(t) {
    var expired = t.gecerlilikTarihi && t.gecerlilikTarihi < today;
    var badge = expired ? '<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#DC262622;color:#DC2626">Dolmuş</span>' : '<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#16A34A22;color:#16A34A">Geçerli</span>';
    var satirlar = t.satirlar || [];
    // Ana satır — teklif bilgisi
    html += '<div style="border-bottom:1.5px solid var(--b)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--s2)">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:12px;font-weight:700;font-family:monospace;color:var(--t)">' + esc(t.teklifNo||'') + '</span>'
      + '<span style="font-size:10px;color:var(--t2)">' + esc(t.tedarikci||'') + '</span>'
      + badge
      + (t.piNo ? '<span style="font-size:9px;color:var(--t3)">PI: ' + esc(t.piNo) + '</span>' : '')
      + (t.jobId ? '<span style="font-size:9px;color:var(--ac);cursor:pointer" onclick="window.openJobIdHub?.(\''+esc(t.jobId)+'\')">Job: ' + esc(t.jobId) + '</span>' : '')
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:10px;color:var(--t3)">Son: ' + (t.gecerlilikTarihi||'—').slice(0,10) + '</span>'
      + '<span style="font-size:13px;font-weight:700;color:var(--ac)">' + (t.toplamTutar||0).toLocaleString('tr-TR') + ' ' + (t.paraBirimi||'USD') + '</span>'
      + '<button onclick="window._convertToSatisTeklif?.(' + t.id + ')" style="padding:2px 6px;border:0.5px solid var(--ac);border-radius:4px;background:none;color:var(--ac);font-size:9px;cursor:pointer;font-family:inherit">Satış Teklifi Yap</button>'
      + '</div></div>';
    // Ürün detay satırları
    if (satirlar.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr>'
        + '<th style="'+thS+';width:30px">#</th>'
        + '<th style="'+thS+';text-align:left">Ürün Kodu</th>'
        + '<th style="'+thS+';text-align:left">Standart Ad</th>'
        + '<th style="'+thS+';text-align:center">Miktar</th>'
        + '<th style="'+thS+';text-align:center">Birim</th>'
        + '<th style="'+thS+';text-align:right">B.Fiyat</th>'
        + '<th style="'+thS+';text-align:right">Toplam</th>'
        + '<th style="'+thS+';text-align:center">Menşei</th>'
        + '<th style="'+thS+';text-align:center">IMO</th>'
        + '</tr></thead><tbody>';
      satirlar.forEach(function(s, idx) {
        html += '<tr style="border-bottom:0.5px solid var(--b)">'
          + '<td style="padding:4px 8px;color:var(--t3)">' + (idx+1) + '</td>'
          + '<td style="padding:4px 8px;font-family:monospace;font-weight:500">' + esc(s.urunKodu||'—') + '</td>'
          + '<td style="padding:4px 8px;color:var(--t)">' + esc(s.standartAdi||'—') + '</td>'
          + '<td style="padding:4px 8px;text-align:center">' + (s.miktar||0) + '</td>'
          + '<td style="padding:4px 8px;text-align:center;color:var(--t3)">' + esc(s.birim||'—') + '</td>'
          + '<td style="padding:4px 8px;text-align:right;font-weight:600">' + (s.birimFiyat||0).toLocaleString('tr-TR') + '</td>'
          + '<td style="padding:4px 8px;text-align:right;font-weight:600;color:var(--ac)">' + (s.toplamFiyat||0).toLocaleString('tr-TR') + '</td>'
          + '<td style="padding:4px 8px;text-align:center;font-size:9px;color:var(--t3)">' + esc(s.mensei||'—') + '</td>'
          + '<td style="padding:4px 8px;text-align:center">' + (s.imoMu ? '<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#F59E0B22;color:#D97706;font-weight:700">IMO</span>' : '—') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table>';
    } else {
      // Geriye uyumlu — satirlar dizisi yoksa tek satır göster
      html += '<div style="padding:6px 14px;font-size:10px;color:var(--t3)">' + esc(t.urunAdi||'—') + ' · Miktar: ' + (t.miktar||0) + ' · B.Fiyat: ' + (t.birimFiyat||0).toLocaleString('tr-TR') + '</div>';
    }
    html += '</div>';
  });
  cont.innerHTML = html;
};

/** @description Alış teklifi detay modalı (kart görünümden erişim) */
window._openAlisDetayModal = function(id) {
  var d = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var t = d.find(function(x){return x.id===id;});
  if (!t) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var satirlar = t.satirlar || [];
  var ex = document.getElementById('mo-alis-detay'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-alis-detay';
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:14px;font-weight:700;color:var(--t)">' + esc(t.teklifNo||'') + '</div><div style="font-size:10px;color:var(--t3)">' + esc(t.tedarikci||'') + '</div></div><button onclick="document.getElementById(\'mo-alis-detay\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    + '<div style="font-size:10px"><span style="color:var(--t3)">PI No:</span> <b>' + esc(t.piNo||'—') + '</b></div>'
    + '<div style="font-size:10px"><span style="color:var(--t3)">PI Tarihi:</span> <b>' + (t.piTarihi||'—') + '</b></div>'
    + '<div style="font-size:10px"><span style="color:var(--t3)">Geçerlilik:</span> <b>' + (t.gecerlilikTarihi||'—') + '</b></div>'
    + '<div style="font-size:10px"><span style="color:var(--t3)">Döviz:</span> <b>' + (t.paraBirimi||'USD') + '</b></div>'
    + '<div style="font-size:10px"><span style="color:var(--t3)">Job ID:</span> <b style="color:var(--ac);cursor:pointer" onclick="window.openJobIdHub?.(\''+esc(t.jobId||'')+'\')">' + esc(t.jobId||'—') + '</b></div>'
    + '<div style="font-size:10px"><span style="color:var(--t3)">Toplam:</span> <b style="color:var(--ac);font-size:14px">' + (t.toplamTutar||0).toLocaleString('tr-TR') + ' ' + (t.paraBirimi||'USD') + '</b></div>'
    + '</div>'
    + (satirlar.length ? '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:10px"><thead><tr style="background:var(--s2)"><th style="padding:4px 6px;text-align:left;font-size:8px;color:var(--t3);text-transform:uppercase">#</th><th style="padding:4px 6px;text-align:left;font-size:8px;color:var(--t3);text-transform:uppercase">Ürün</th><th style="padding:4px 6px;text-align:center;font-size:8px;color:var(--t3);text-transform:uppercase">Miktar</th><th style="padding:4px 6px;text-align:right;font-size:8px;color:var(--t3);text-transform:uppercase">B.Fiyat</th><th style="padding:4px 6px;text-align:right;font-size:8px;color:var(--t3);text-transform:uppercase">Toplam</th></tr></thead><tbody>'
    + satirlar.map(function(s, i){return '<tr style="border-bottom:0.5px solid var(--b)"><td style="padding:3px 6px">'+(i+1)+'</td><td style="padding:3px 6px">'+esc(s.urunKodu||s.standartAdi||'—')+'</td><td style="padding:3px 6px;text-align:center">'+(s.miktar||0)+'</td><td style="padding:3px 6px;text-align:right;font-weight:600">'+(s.birimFiyat||0).toLocaleString('tr-TR')+'</td><td style="padding:3px 6px;text-align:right;font-weight:600;color:var(--ac)">'+(s.toplamFiyat||0).toLocaleString('tr-TR')+'</td></tr>';}).join('')
    + '</tbody></table>' : '<div style="font-size:11px;color:var(--t3)">'+esc(t.urunAdi||'—')+' · Miktar: '+(t.miktar||0)+' · Fiyat: '+(t.birimFiyat||0)+'</div>')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;gap:6px;justify-content:flex-end">'
    + '<button onclick="window._convertToSatisTeklif?.('+t.id+');document.getElementById(\'mo-alis-detay\')?.remove()" style="padding:5px 12px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Satışa Dönüştür</button>'
    + '<button class="btn" onclick="document.getElementById(\'mo-alis-detay\')?.remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

/** FIX 1-5: Fatura türü + KDV + kur + satıcı filtre + tarih netleştirme */
var AT_FATURA_TURLERI = [
  { key: 'kdv20', label: 'KDV\'li Fatura (%20)', oran: 20, odenirMi: true },
  { key: 'kdv18', label: 'KDV\'li Fatura (%18)', oran: 18, odenirMi: true },
  { key: 'kdv10', label: 'KDV\'li Fatura (%10)', oran: 10, odenirMi: true },
  { key: 'kdv8',  label: 'KDV\'li Fatura (%8)',  oran: 8,  odenirMi: true },
  { key: 'kdv1',  label: 'KDV\'li Fatura (%1)',  oran: 1,  odenirMi: true },
  { key: 'ihrac', label: 'İhraç Kayıtlı', oran: 20, odenirMi: false },
  { key: 'istisna', label: 'KDV\'siz (İstisna)', oran: 0, odenirMi: false },
  { key: 'ihracat', label: 'İhracat (%0)', oran: 0, odenirMi: false },
];

window._openAlisModal = function() {
  var existingForm = document.getElementById('alis-inline-form');
  if (existingForm) { existingForm.remove(); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c){return !c.isDeleted && c.type==='tedarikci';}) : [];
  var taskList = typeof loadTasks === 'function' ? loadTasks().filter(function(t){return !t.done;}).slice(0,50) : [];
  var cont = document.getElementById('alis-list'); if (!cont) return;
  var form = document.createElement('div');
  form.id = 'alis-inline-form';
  form.style.cssText = 'border:2px solid var(--ac);border-radius:10px;margin:8px 0;background:var(--sf);overflow:hidden';
  var ftOpts = AT_FATURA_TURLERI.map(function(f){return '<option value="'+f.key+'">'+f.label+'</option>';}).join('');
  var tOpts = taskList.map(function(t){return '<option value="'+t.jobId+'">'+esc((t.jobId||'')+' — '+(t.title||'').slice(0,30))+'</option>';}).join('');
  var thS = 'padding:5px 6px;text-align:left;font-size:8px;color:var(--t3);text-transform:uppercase;font-weight:700';
  form.innerHTML = ''
    + '<div style="padding:10px 14px;background:var(--ac);color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:space-between"><span>+ Yeni Alış Teklifi</span><button onclick="document.getElementById(\'alis-inline-form\')?.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px">×</button></div>'
    // Üst satır 1: Job + Tedarikçi + PI + Fatura Türü
    + '<div style="padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + '<select class="fi" id="at-job" style="width:130px;font-size:11px"><option value="">Job ID</option>'+tOpts+'</select>'
    + '<select class="fi" id="at-tedarikci" style="width:150px;font-size:11px" onchange="window._atTedarikciChange?.()"><option value="">Tedarikçi *</option>'+cariList.map(function(c){return '<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>';}).join('')+'</select>'
    + '<input class="fi" id="at-pino" placeholder="PI No *" style="width:90px;font-size:11px">'
    + '<select class="fi" id="at-fatura" style="width:140px;font-size:11px" onchange="window._atCalcAll?.()">'+ftOpts+'</select>'
    + '<select class="fi" id="at-cur" style="width:70px;font-size:11px" onchange="window._atCalcAll?.()"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option></select>'
    + '</div>'
    // Üst satır 2: Tarihler + Kur bilgisi
    + '<div style="padding:8px 14px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:0.5px solid var(--b);align-items:center">'
    + '<div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:8px;color:var(--t3)" title="Tedarikçinin size gönderdiği PI tarihi">PI Tarihi (Fatura Tarihi)</span><input type="date" class="fi" id="at-pitarih" style="width:130px;font-size:11px" onchange="window._atCalcGunFarki?.()"></div>'
    + '<span id="at-gun-farki" style="font-size:10px;color:var(--t3);white-space:nowrap">→</span>'
    + '<div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:8px;color:var(--t3)" title="Bu fiyatın geçerli olduğu son tarih">Son Kabul Tarihi</span><input type="date" class="fi" id="at-gecerlilik" style="width:130px;font-size:11px" onchange="window._atCalcGunFarki?.()"></div>'
    + '<div style="flex:1"></div>'
    + '<div id="at-kur-info" style="font-size:10px;color:var(--t3);text-align:right"></div>'
    + '</div>'
    // Ürün satırları tablosu — KDV sütunları eklendi
    + '<div style="overflow-x:auto">'
    + '<table style="width:100%;border-collapse:collapse;font-size:11px;min-width:1100px"><thead><tr style="background:var(--s2);border-bottom:0.5px solid var(--b)">'
    + '<th style="'+thS+'">No</th>'
    + '<th style="'+thS+';width:180px">Ürün</th>'
    + '<th style="'+thS+'">Standart Ad</th>'
    + '<th style="'+thS+';text-align:center">Miktar</th>'
    + '<th style="'+thS+';text-align:center">Birim</th>'
    + '<th style="'+thS+';text-align:right">B.Fiyat</th>'
    + '<th style="'+thS+';text-align:right">Mal Bedeli</th>'
    + '<th style="'+thS+';text-align:center">KDV%</th>'
    + '<th style="'+thS+';text-align:right">KDV Tutarı</th>'
    + '<th style="'+thS+';text-align:right;color:var(--ac)">Net Ödeme</th>'
    + '<th style="'+thS+';text-align:center">Menşei</th>'
    + '<th style="'+thS+';text-align:center">IMO</th>'
    + '<th style="'+thS+';width:24px"></th>'
    + '</tr></thead><tbody id="at-rows"></tbody></table></div>'
    // Alt: Mal Bedeli + KDV + Net Ödeme + Kaydet
    + '<div style="padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-top:0.5px solid var(--b);background:var(--s2)">'
    + '<button onclick="window._atAddRow()" style="padding:4px 12px;border:0.5px solid var(--ac);border-radius:5px;background:none;color:var(--ac);font-size:11px;cursor:pointer;font-family:inherit">+ Satır Ekle</button>'
    + '<div style="display:flex;align-items:center;gap:12px;font-size:10px">'
    + '<span style="color:var(--t3)">Mal: <b id="at-mal-toplam">0</b></span>'
    + '<span style="color:var(--t3)">KDV: <b id="at-kdv-toplam">0</b></span>'
    + '<span style="font-size:14px;font-weight:700;color:var(--ac)" id="at-toplam">NET: 0</span>'
    + '<button onclick="window._saveAlisTeklif()" style="padding:5px 14px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Kaydet</button></div>'
    + '</div>';
  cont.insertBefore(form, cont.firstChild);
  window._atAddRow();
  window._atUpdateKurInfo();
  form.scrollIntoView({behavior:'smooth'});
};

/** FIX 2: Kur bilgisi göster */
window._atUpdateKurInfo = function() {
  var el = document.getElementById('at-kur-info'); if (!el) return;
  var cur = document.getElementById('at-cur')?.value || 'USD';
  if (cur === 'TRY') { el.innerHTML = ''; return; }
  // Mevcut kur al (satin_alma'dan veya localStorage'dan)
  var rate = 0;
  try { var c = JSON.parse(localStorage.getItem('ak_tcmb_cache') || '{}'); if (c.rates && c.rates[cur]) rate = c.rates[cur]; } catch(e) {}
  if (!rate && window._saLiveRates) rate = window._saLiveRates[cur] || 0;
  var ts = '';
  try { var c2 = JSON.parse(localStorage.getItem('ak_tcmb_cache') || '{}'); if (c2.ts) ts = new Date(c2.ts).toLocaleString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch(e) {}
  if (rate) {
    el.innerHTML = '<span style="cursor:pointer" onclick="window._atManuelKur?.()" title="Tıklayarak manuel kur girin">1 ' + cur + ' = ₺' + rate.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:4}) + '</span> <span style="font-size:8px;color:var(--t3)">(TCMB' + (ts ? ' • ' + ts : '') + ')</span>';
    window._atKurRate = rate;
    window._atKurManuel = false;
  } else {
    el.innerHTML = '<span style="color:var(--t3)">Kur bilgisi yok</span>';
  }
};

/** FIX 1: Tarihler arası gün sayısı */
window._atCalcGunFarki = function() {
  var el = document.getElementById('at-gun-farki'); if (!el) return;
  var pi = document.getElementById('at-pitarih')?.value || '';
  var gc = document.getElementById('at-gecerlilik')?.value || '';
  if (!pi || !gc) { el.innerHTML = '→'; return; }
  var gun = Math.ceil((new Date(gc) - new Date(pi)) / 86400000);
  if (gun <= 0) {
    el.innerHTML = '<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:#DC262618;color:#DC2626;font-weight:600">⚠️ Geçerlilik süresi hatalı</span>';
  } else {
    el.innerHTML = '<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:#16A34A18;color:#16A34A;font-weight:600">→ ' + gun + ' gün geçerli</span>';
  }
};

/** FIX 2: Manuel kur girişi */
window._atManuelKur = function() {
  var cur = document.getElementById('at-cur')?.value || 'USD';
  var el = document.getElementById('at-kur-info'); if (!el) return;
  el.innerHTML = '<div style="display:flex;align-items:center;gap:4px">1 ' + cur + ' = ₺<input type="number" id="at-kur-input" class="fi" style="width:80px;font-size:11px;padding:2px 6px" value="' + (window._atKurRate||0) + '" step="0.01"> <button onclick="window._atKurManuelOnayla()" style="padding:2px 6px;border:none;border-radius:4px;background:var(--ac);color:#fff;font-size:9px;cursor:pointer">Onayla</button></div>';
};
window._atKurManuelOnayla = function() {
  var v = parseFloat(document.getElementById('at-kur-input')?.value || '0');
  if (v > 0) { window._atKurRate = v; window._atKurManuel = true; }
  var el = document.getElementById('at-kur-info'); if (!el) return;
  var cur = document.getElementById('at-cur')?.value || 'USD';
  el.innerHTML = '<span>1 ' + cur + ' = ₺' + v.toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</span> <span style="font-size:8px;padding:1px 4px;background:#F59E0B22;color:#D97706;border-radius:3px;font-weight:600">Manuel Kur ✏️</span>';
  window._atCalcAll?.();
};

/** FIX 3: Tedarikçi seçilince ürün filtresi */
window._atTedarikciChange = function() {
  var ted = document.getElementById('at-tedarikci')?.value || '';
  // Mevcut satırları güncelle
  var tbody = document.getElementById('at-rows'); if (!tbody) return;
  tbody.querySelectorAll('.at-urun-sel').forEach(function(sel) {
    sel.value = ''; // Sıfırla
  });
  window._atCalcAll?.();
};

window._atRowCounter = 0;
window._atAddRow = function() {
  var tbody = document.getElementById('at-rows'); if (!tbody) return;
  var urunList = typeof loadUrunler==='function'?loadUrunler():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  // FIX 3: Tedarikçi seçiliyse filtrele
  var ted = document.getElementById('at-tedarikci')?.value || '';
  var filtered = ted ? urunList.filter(function(u){return (u.tedarikci||'')===ted || (u.saticiId||'')===ted;}) : urunList;
  if (ted && !filtered.length) filtered = urunList; // Fallback: tümünü göster
  var uOpts = filtered.map(function(u){return '<option value="'+u.id+'" data-kod="'+esc(u.duayKodu||u.urunKodu||'')+'" data-std="'+esc(u.standartAdi||'')+'" data-birim="'+(u.birim||'')+'" data-mensei="'+(u.mensei||'')+'" data-imo="'+(u.imolu||'H')+'" data-moq="'+(u.moq||0)+'">'+esc(u.duayKodu||'')+' — '+esc(u.orijinalAdi||u.urunAdi||'')+'</option>';}).join('');
  window._atRowCounter++;
  var n = window._atRowCounter;
  var tr = document.createElement('tr');
  tr.className = 'at-row';
  tr.style.borderBottom = '0.5px solid var(--b)';
  tr.innerHTML = '<td style="padding:4px 6px;color:var(--t3);font-size:10px">'+n+'</td>'
    + '<td style="padding:4px 6px"><select class="fi at-urun-sel" style="font-size:10px;padding:3px 4px" onchange="window._atRowUrunChange(this)"><option value="">— Seç —</option>'+uOpts+'</select></td>'
    + '<td style="padding:4px 6px;font-size:10px" class="at-std">—</td>'
    + '<td style="padding:4px 6px"><input type="number" class="fi at-miktar" style="width:55px;font-size:11px;padding:3px 4px;text-align:center" value="1" oninput="window._atCalcAll()"></td>'
    + '<td style="padding:4px 6px;text-align:center;font-size:10px" class="at-birim">—</td>'
    + '<td style="padding:4px 6px"><input type="number" class="fi at-fiyat" style="width:75px;font-size:11px;padding:3px 4px;text-align:right" oninput="window._atCalcAll()"></td>'
    + '<td style="padding:4px 6px;text-align:right;font-weight:600;font-size:10px" class="at-row-mal">0</td>'
    + '<td style="padding:4px 6px;text-align:center;font-size:9px;color:var(--t3)" class="at-row-kdv-oran">—</td>'
    + '<td style="padding:4px 6px;text-align:right;font-size:10px" class="at-row-kdv-tutar">0</td>'
    + '<td style="padding:4px 6px;text-align:right;font-weight:700;font-size:10px;color:var(--ac)" class="at-row-net">0</td>'
    + '<td style="padding:4px 6px;text-align:center;font-size:9px;color:var(--t3)" class="at-mensei">—</td>'
    + '<td style="padding:4px 6px;text-align:center" class="at-imo">—</td>'
    + '<td style="padding:4px 6px"><button onclick="this.closest(\'tr\').remove();window._atCalcAll()" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:12px">×</button></td>';
  tbody.appendChild(tr);
};

window._atRowUrunChange = function(sel) {
  var tr = sel.closest('tr'); if (!tr) return;
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  tr.querySelector('.at-std').textContent = opt.dataset.std || '—';
  tr.querySelector('.at-birim').textContent = opt.dataset.birim || '—';
  tr.querySelector('.at-mensei').textContent = opt.dataset.mensei || '—';
  tr.querySelector('.at-imo').innerHTML = opt.dataset.imo==='E' ? '<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#F59E0B22;color:#D97706;font-weight:700">IMO</span>' : '—';
  // FIX 2: Teknik açıklama otomatik
  var urunData = (typeof loadUrunler === 'function' ? loadUrunler() : []).find(function(u) { return u.id === parseInt(opt.value); });
  var stdEl = tr.querySelector('.at-std');
  if (stdEl && urunData?.teknikAciklama) {
    stdEl.innerHTML = (opt.dataset.std || '—') + '<div style="font-size:8px;color:var(--t3);margin-top:1px">' + (typeof escapeHtml === 'function' ? escapeHtml(urunData.teknikAciklama) : urunData.teknikAciklama) + '</div>';
  }
  // FIX 7.2: MOQ kontrolü
  var moq = parseInt(opt.dataset.moq || '0');
  if (moq > 0) {
    var miktarEl = tr.querySelector('.at-miktar');
    if (miktarEl && parseInt(miktarEl.value || '0') < moq) {
      miktarEl.value = moq;
      miktarEl.style.border = '1.5px solid #D97706';
      window.toast?.('MOQ: minimum ' + moq + ' adet', 'warn');
    }
  }
  // FIX 7.3: Fiyat alarm — önceki alış fiyatıyla karşılaştır
  var urunId = parseInt(sel.value);
  var oncekiAlis = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var oncekiFiyat = 0;
  oncekiAlis.forEach(function(a) { (a.satirlar || []).forEach(function(s) { if (s.urunId === urunId && s.birimFiyat) oncekiFiyat = s.birimFiyat; }); });
  if (oncekiFiyat > 0) {
    var fiyatEl = tr.querySelector('.at-fiyat');
    if (fiyatEl) fiyatEl.setAttribute('data-onceki', oncekiFiyat);
  }
  window._atCalcAll();
};

/** FIX 1: KDV hesaplamalı calc */
window._atCalcAll = function() {
  var faturaSel = document.getElementById('at-fatura')?.value || 'kdv20';
  var ft = AT_FATURA_TURLERI.find(function(f){return f.key===faturaSel;}) || AT_FATURA_TURLERI[0];
  var malToplam = 0, kdvToplam = 0, netToplam = 0;
  document.querySelectorAll('.at-row').forEach(function(tr) {
    var m = parseFloat(tr.querySelector('.at-miktar')?.value||'0');
    var f = parseFloat(tr.querySelector('.at-fiyat')?.value||'0');
    var mal = m * f;
    var kdvTutar = mal * ft.oran / 100;
    var net = ft.odenirMi ? mal + kdvTutar : mal;
    tr.querySelector('.at-row-mal').textContent = mal.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    tr.querySelector('.at-row-kdv-oran').textContent = ft.oran > 0 ? '%' + ft.oran : '—';
    tr.querySelector('.at-row-kdv-tutar').textContent = ft.oran > 0 ? kdvTutar.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) + (ft.odenirMi ? '' : ' ⛔') : '—';
    tr.querySelector('.at-row-net').textContent = net.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    malToplam += mal; kdvToplam += kdvTutar; netToplam += net;
    // FIX 7.3: Fiyat alarm
    var fiyatEl = tr.querySelector('.at-fiyat');
    var onceki = parseFloat(fiyatEl?.getAttribute('data-onceki') || '0');
    if (onceki > 0 && f > 0 && f > onceki * 1.10) {
      fiyatEl.style.border = '1.5px solid #D97706';
      fiyatEl.title = 'Önceki fiyat: ' + onceki + ' (%' + Math.round((f/onceki-1)*100) + ' artış)';
    } else if (fiyatEl) { fiyatEl.style.border = ''; fiyatEl.title = ''; }
  });
  var cur = document.getElementById('at-cur')?.value || 'USD';
  var malEl = document.getElementById('at-mal-toplam');
  var kdvEl = document.getElementById('at-kdv-toplam');
  var netEl = document.getElementById('at-toplam');
  if (malEl) malEl.textContent = malToplam.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ' + cur;
  if (kdvEl) kdvEl.textContent = (ft.oran > 0 ? kdvToplam.toLocaleString('tr-TR',{minimumFractionDigits:2}) + (ft.odenirMi ? '' : ' (Ödenmez)') : '—');
  if (netEl) netEl.textContent = 'NET: ' + netToplam.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ' + cur;
  window._atUpdateKurInfo?.();
};

window._saveAlisTeklif = function() {
  var ted = document.getElementById('at-tedarikci')?.value||'';
  var piNo = (document.getElementById('at-pino')?.value||'').trim();
  if (!ted) { window.toast?.('Tedarikçi zorunlu','err'); return; }
  // FIX 5: Job ID uyarı — opsiyonel ama bilgilendirme
  var jobVal = document.getElementById('at-job')?.value || '';
  if (!jobVal && !window._atJobIdSkipped) {
    window._atJobIdSkipped = true;
    window.toast?.('Job ID girilmedi — teklifi bir işe bağlamak için Job ID seçebilirsiniz', 'warn');
  }
  var faturaSel = document.getElementById('at-fatura')?.value || 'kdv20';
  var ft = AT_FATURA_TURLERI.find(function(f){return f.key===faturaSel;}) || AT_FATURA_TURLERI[0];
  var satirlar = [];
  document.querySelectorAll('.at-row').forEach(function(tr) {
    var sel = tr.querySelector('.at-urun-sel');
    var opt = sel?.options[sel.selectedIndex];
    if (!sel?.value) return;
    var m = parseFloat(tr.querySelector('.at-miktar')?.value||'0');
    var f = parseFloat(tr.querySelector('.at-fiyat')?.value||'0');
    var mal = m * f;
    var kdvTutar = mal * ft.oran / 100;
    satirlar.push({
      urunId: parseInt(sel.value), urunKodu: opt?.dataset.kod||'', standartAdi: opt?.dataset.std||'',
      miktar: m, birim: tr.querySelector('.at-birim')?.textContent||'',
      birimFiyat: f, toplamFiyat: mal,
      kdvOrani: ft.oran, kdvTutari: kdvTutar, kdvOdenirMi: ft.odenirMi,
      netOdeme: ft.odenirMi ? mal + kdvTutar : mal,
      mensei: tr.querySelector('.at-mensei')?.textContent||'',
      imoMu: tr.querySelector('.at-imo')?.textContent!=='—',
    });
  });
  if (!satirlar.length) { window.toast?.('En az bir ürün satırı gerekli','err'); return; }
  var malToplam = satirlar.reduce(function(s,r){return s+r.toplamFiyat;},0);
  var kdvToplam = satirlar.reduce(function(s,r){return s+r.kdvTutari;},0);
  var netToplam = satirlar.reduce(function(s,r){return s+r.netOdeme;},0);
  var d = typeof loadAlisTeklifleri==='function'?loadAlisTeklifleri():[];
  var yr = new Date().getFullYear(); var seq = String(d.length+1).padStart(4,'0');
  d.unshift({
    id: typeof generateNumericId==='function'?generateNumericId():Date.now(),
    teklifNo: 'TKL-'+yr+'-'+seq, tedarikci: ted,
    jobId: document.getElementById('at-job')?.value||'',
    piNo: piNo, piTarihi: document.getElementById('at-pitarih')?.value||'',
    paraBirimi: document.getElementById('at-cur')?.value||'USD',
    gecerlilikTarihi: document.getElementById('at-gecerlilik')?.value||'',
    faturaTuru: faturaSel, kdvOrani: ft.oran, kdvOdenirMi: ft.odenirMi,
    kurRate: window._atKurRate || 0, kurManuel: window._atKurManuel || false,
    satirlar: satirlar, malBedeliToplam: malToplam, kdvToplam: kdvToplam,
    toplamTutar: netToplam, netOdeme: netToplam,
    urunAdi: satirlar[0]?.standartAdi||ted,
    birimFiyat: satirlar[0]?.birimFiyat||0, miktar: satirlar[0]?.miktar||0,
    ts: new Date().toISOString(), createdBy: window.Auth?.getCU?.()?.id
  });
  if (typeof storeAlisTeklifleri==='function') storeAlisTeklifleri(d);
  document.getElementById('alis-inline-form')?.remove();
  window._atRowCounter = 0;
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
    panel.innerHTML = '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Satış Teklifleri</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Müşteri teklifleri</div></div>'
      + '<div style="display:flex;gap:6px"><button onclick="window._exportSatisTeklifXlsx?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button><button onclick="window._openSatisRapor?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">📊 Rapor</button><button onclick="window._openSatisModal?.()" style="padding:7px 16px;border:none;border-radius:7px;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Satış Teklifi</button></div>'
      + '</div>'
      + '<div id="satis-stats" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + (typeof window._renderOzluSozBanner === 'function' ? window._renderOzluSozBanner('satis-teklifleri') : '')
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-bottom:0.5px solid var(--b);overflow-x:auto">'
      + '<input id="st-srch" placeholder="Teklif no, m\u00fc\u015fteri, \u00fcr\u00fcn..." oninput="event.stopPropagation();window.renderSatisTeklifleri()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:10px;padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t);min-width:160px;font-family:inherit">'
      + '<select id="st-durum-filtre" onchange="event.stopPropagation();window.renderSatisTeklifleri()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t2);font-family:inherit"><option value="">T\u00fcm durumlar</option><option value="taslak">Taslak</option><option value="gonderildi">G\u00f6nderildi</option><option value="onay">Onay Bekliyor</option><option value="kabul">Kabul</option><option value="red">Reddedildi</option></select>'
      + '<select id="st-musteri-filtre" onchange="event.stopPropagation();window.renderSatisTeklifleri()" onclick="event.stopPropagation()" style="font-size:10px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t2);font-family:inherit"><option value="">T\u00fcm m\u00fc\u015fteriler</option></select>'
      + '</div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="satis-list"></div></div>';
  }
  var STAT = {taslak:'Taslak',gonderildi:'Gönderildi',onay:'Onay Bekliyor',kabul:'Kabul Edildi',red:'Reddedildi'};
  var statsEl = document.getElementById('satis-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">' + d.length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Onay Bekleyen</div><div style="font-size:22px;font-weight:600;color:#D97706">' + d.filter(function(t){return t.durum==='onay';}).length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Kabul Edilen</div><div style="font-size:22px;font-weight:600;color:#16A34A">' + d.filter(function(t){return t.durum==='kabul';}).length + '</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam Değer</div><div style="font-size:22px;font-weight:600;color:var(--ac)">$' + Math.round(d.reduce(function(s,t){return s+(parseFloat(t.genelToplam)||0);},0)).toLocaleString('tr-TR') + '</div></div>';
  var bugunTakip = d.filter(function(t) { if (!t.takipTarih) return false; var td = new Date(t.takipTarih); var now = new Date(); return td.toDateString() === now.toDateString() || td < now; }).length;
  if (statsEl) statsEl.innerHTML += '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Bugün Takip</div><div style="font-size:22px;font-weight:600;color:' + (bugunTakip > 0 ? '#A32D2D' : 'var(--t)') + '">' + bugunTakip + '</div></div>';
  /* Müşteri dropdown doldur */
  var _stMusFiltre = document.getElementById('st-musteri-filtre');
  if (_stMusFiltre && _stMusFiltre.options.length <= 1) {
    var _stMusSet = {};
    d.forEach(function(t) { if (t.musteri) _stMusSet[t.musteri] = true; });
    Object.keys(_stMusSet).sort().forEach(function(m) { var o = document.createElement('option'); o.value = m; o.textContent = m; _stMusFiltre.appendChild(o); });
  }
  /* Filtre uygula */
  var _stQ = (document.getElementById('st-srch')?.value || '').toLowerCase();
  var _stDur = document.getElementById('st-durum-filtre')?.value || '';
  var _stMus = document.getElementById('st-musteri-filtre')?.value || '';
  var filtreli = d.filter(function(t) {
    if (_stQ && !((t.teklifNo || '').toLowerCase().includes(_stQ) || (t.musteri || '').toLowerCase().includes(_stQ) || (t.jobId || '').toLowerCase().includes(_stQ))) return false;
    if (_stDur && t.durum !== _stDur) return false;
    if (_stMus && t.musteri !== _stMus) return false;
    return true;
  });
  var cont = document.getElementById('satis-list'); if (!cont) return;
  if (!filtreli.length) { cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">' + (d.length ? 'Filtre sonucu yok' : 'Hen\u00fcz teklif yok') + '</div>'; return; }
  var badgeColors = {taslak:'#9CA3AF',gonderildi:'#3B82F6',onay:'#D97706',kabul:'#16A34A',red:'#DC2626'};
  var pillS = 'font-size:8px;padding:1px 5px;border-radius:99px;cursor:pointer;font-family:inherit;border:none;font-weight:600;';
  cont.innerHTML = filtreli.map(function(t) {
    var bc = badgeColors[t.durum]||'#9CA3AF';
    return '<div onclick="event.stopPropagation();window._stPeekAc?.(' + t.id + ')" style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--b);transition:background .1s;cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      // Sol: Teklif No (bold, büyük) + müşteri + ürün sayısı
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:700;color:var(--t);font-family:monospace;letter-spacing:-.3px">' + esc(t.teklifNo||'—') + '</div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.musteri||'') + ' · ' + (t.urunler||[]).length + ' ürün' + (t.jobId ? ' · <span style="color:var(--ac)">' + esc(t.jobId) + '</span>' : '') + '</div>'
      + '<div style="font-size:9px;color:var(--t3);font-family:monospace">' + esc(t.teklifNo||(t.id?String(t.id).slice(-8):'—')) + '</div></div>'
      // Orta: Tutar (bold, sağa yasla)
      + '<div style="font-size:13px;font-weight:700;color:var(--t);white-space:nowrap">' + (t.genelToplam||0).toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' <span style="font-size:10px;font-weight:400;color:var(--t3)">' + (t.paraBirimi||'USD') + '</span></div>'
      // Durum badge
      + '<div><span style="font-size:8px;padding:2px 8px;border-radius:99px;background:' + bc + '18;color:' + bc + ';font-weight:700;white-space:nowrap">' + (STAT[t.durum]||'Taslak') + '</span>'
      + (t.gonderimTarih ? '<div style="font-size:9px;color:var(--t3);margin-top:2px">📤 ' + esc(t.gonderimTarih) + (t.gonderenAd ? ' · ' + esc(t.gonderenAd) : '') + '</div>' : '')
      + (t.takipTarih ? (function() { var gec = new Date(t.takipTarih) < new Date(); return '<div style="font-size:9px;color:' + (gec ? '#A32D2D' : 'var(--t3)') + ';margin-top:1px">📅 Takip: ' + esc(t.takipTarih) + (gec ? ' ⚠ Geçti' : '') + '</div>'; })() : '')
      + '</div>'
      + '<div style="flex-shrink:0;text-align:right">'
      + (t.createdAt ? '<div style="font-size:8px;color:var(--t3)">📝 ' + esc((t.createdAt || '').slice(0, 10)) + '</div>' : '')
      + '</div>'
      // İşlem butonları (pill boyutunda)
      + '<div style="display:flex;gap:3px;flex-shrink:0">'
      + '<button onclick="window._printSatisTeklif?.(' + t.id + ')" style="'+pillS+'background:var(--s2);color:var(--t3)">PDF</button>'
      + '<button onclick="event.stopPropagation();window._stPeekAc(\'' + t.id + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Detay</button>'
      + '<button onclick="event.stopPropagation();window._stPIGuncelle(\'' + t.id + '\')" style="font-size:9px;padding:2px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:#185FA5">PI ↻</button>'
      + (t.durum==='taslak'||t.durum==='gonderildi' ? '<button onclick="window._musteriOnayladi?.(' + t.id + ')" style="'+pillS+'background:#16A34A18;color:#16A34A">✓</button>' : '')
      + (t.durum==='taslak'||t.durum==='gonderildi' ? '<button onclick="window._musteriReddetti?.(' + t.id + ')" style="'+pillS+'background:#DC262618;color:#DC2626">✗</button>' : '')
      + (t.durum!=='taslak' ? '<button onclick="window._reviseSatisTeklif?.(' + t.id + ')" style="'+pillS+'background:var(--al);color:var(--ac)">Rev</button>' : '')
      + (t.durum==='kabul' ? '<button onclick="window._createPR?.(' + t.id + ')" style="'+pillS+'background:#D9770618;color:#D97706">PR</button>' : '')
      + '</div></div>';
  }).join('');
};

/* ── SATIS-LISTE-001: PI Güncelleme ─────────────────────────── */
window._stPIGuncelle = function(id) {
  var liste = typeof window.loadSatisTeklifleri==='function'?window.loadSatisTeklifleri():[];
  var t = liste.find(function(x){return String(x.id)===String(id);});
  if(!t){window.toast?.('Teklif bulunamadı','warn');return;}
  window._saV2TeklifOlustur?.(t.alisTeklifiId||id);
  window.toast?.('PI formu açıldı','ok');
};

/* ── Satış Teklif Peek Panel ────────────────────────────────── */
window._stPeekAc = function(id) {
  var mevcut = document.getElementById('st-peek-overlay');
  if (mevcut) mevcut.remove();
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var t = d.find(function(x) { return x.id === id; });
  if (!t) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var STAT = { taslak: 'Taslak', gonderildi: 'G\u00f6nderildi', onay: 'Onay Bekliyor', kabul: 'Kabul Edildi', red: 'Reddedildi' };
  var bc = { taslak: '#9CA3AF', gonderildi: '#3B82F6', onay: '#D97706', kabul: '#16A34A', red: '#DC2626' }[t.durum] || '#9CA3AF';
  var peek = document.createElement('div');
  peek.id = 'st-peek-overlay';
  peek.style.cssText = 'position:fixed;top:40px;right:0;width:340px;height:calc(100vh - 40px);background:var(--s2);border-left:0.5px solid var(--b);overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;z-index:8888;box-shadow:-4px 0 16px rgba(0,0,0,.08)';
  var h = '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;font-weight:500;color:var(--t)">Teklif Detay\u0131</span><button onclick="event.stopPropagation();document.getElementById(\'st-peek-overlay\')?.remove()" style="font-size:16px;border:none;background:none;cursor:pointer;color:var(--t3)">\u00d7</button></div>';
  h += '<div style="font-size:14px;font-weight:700;color:var(--t);font-family:monospace">' + esc(t.teklifNo || '\u2014') + '</div>';
  h += '<div style="display:flex;gap:4px;align-items:center"><span style="font-size:9px;padding:2px 8px;border-radius:99px;background:' + bc + '22;color:' + bc + ';font-weight:600">' + (STAT[t.durum] || 'Taslak') + '</span></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  h += '<div style="background:var(--sf);border-radius:6px;padding:8px;border:0.5px solid var(--b)"><div style="font-size:8px;color:var(--t3)">M\u00dc\u015eTER\u0130</div><div style="font-size:12px;font-weight:500;color:var(--t)">' + esc(t.musteri || '\u2014') + '</div></div>';
  h += '<div style="background:var(--sf);border-radius:6px;padding:8px;border:0.5px solid var(--b)"><div style="font-size:8px;color:var(--t3)">TOPLAM</div><div style="font-size:12px;font-weight:500;color:#0F6E56">' + (t.genelToplam || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + esc(t.paraBirimi || 'USD') + '</div></div>';
  h += '</div>';
  if (t.urunler && t.urunler.length) {
    h += '<div style="font-size:9px;font-weight:500;color:var(--t3);margin-top:4px">\u00dcR\u00dcNLER (' + t.urunler.length + ')</div>';
    t.urunler.forEach(function(u, i) {
      h += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:10px;border-bottom:0.5px solid var(--b)"><span style="color:var(--t)">' + (i + 1) + '. ' + esc(u.urunAdi || u.duayKodu || '\u2014') + '</span><span style="color:var(--t3)">' + (u.miktar || '') + ' \u00b7 ' + (u.satisFiyat || u.birimFiyat || '') + ' ' + esc(t.paraBirimi || '') + '</span></div>';
    });
  }
  h += '<div style="display:flex;flex-direction:column;gap:5px;margin-top:8px">';
  h += '<button onclick="event.stopPropagation();window._stDuzenle?.(' + t.id + ')" style="font-size:10px;padding:6px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\u270f D\u00fczenle</button>';
  h += '<button onclick="event.stopPropagation();window._printSatisTeklif?.(' + t.id + ')" style="font-size:10px;padding:6px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">PDF</button>';
  h += '</div>';
  peek.innerHTML = h;
  document.body.appendChild(peek);
};

window._stDuzenle = function(id) {
  document.getElementById('st-peek-overlay')?.remove();
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var t = d.find(function(x) { return x.id === id; });
  if (!t) return;
  window._openSatisModal(t);
};

window._convertToSatisTeklif = function(alisId) {
  var alis = (typeof loadAlisTeklifleri==='function'?loadAlisTeklifleri():[]).find(function(t){return t.id===alisId;});
  if (!alis) return;
  window._openSatisModal(alis);
};

window._openSatisModal = function(fromAlis) {
  var existingForm = document.getElementById('satis-inline-form');
  if (existingForm) { existingForm.remove(); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var musteriList = typeof loadCari === 'function' ? loadCari().filter(function(c){return !c.isDeleted && (c.type==='musteri'||c.type==='Müşteri'||c.tip==='musteri'||c.cariType==='onayli');}) : [];
  var cont = document.getElementById('satis-list'); if (!cont) return;
  var form = document.createElement('div');
  form.id = 'satis-inline-form';
  form.style.cssText = 'border:2px solid #0F6E56;border-radius:10px;margin:8px 0;background:var(--sf);overflow:hidden';
  var urunList = typeof loadUrunler==='function'?loadUrunler():[];
  form.innerHTML = ''
    + '<div style="padding:10px 14px;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:space-between"><span>+ Yeni Satış Teklifi</span><button onclick="document.getElementById(\'satis-inline-form\')?.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px">×</button></div>'
    + '<div style="padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + '<select class="fi" id="st-musteri" style="width:150px;font-size:11px"><option value="" data-cid="">Müşteri *</option>'+musteriList.map(function(c){return '<option value="'+esc(c.name)+'" data-cid="'+c.id+'">'+esc(c.name)+'</option>';}).join('')+'</select>'
    + '<select class="fi" id="st-job" style="width:140px;font-size:11px"><option value="">Job ID (opsiyonel)</option>'+(function(){var tl=typeof loadTasks==='function'?loadTasks().filter(function(t){return !t.done&&!t.isDeleted&&t.jobId;}):[];return tl.length?tl.slice(0,50).map(function(t){return '<option value="'+esc(t.jobId)+'">'+esc((t.jobId||'')+' — '+(t.title||'').slice(0,25))+'</option>';}).join(''):'<option disabled>Açık görev yok</option>';}())+'</select>'
    + '<select class="fi" id="st-cur" style="width:70px;font-size:11px" onchange="window._stBankaPreview?.()"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option></select>'
    + '<input type="date" class="fi" id="st-gecerlilik" style="width:120px;font-size:11px" title="Geçerlilik">'
    + '<select class="fi" id="st-teslim" style="width:80px;font-size:11px"><option>FOB</option><option>CFR</option><option>CIF</option><option>EXW</option><option>DDP</option></select>'
    + '<input class="fi" id="st-odeme" placeholder="Ödeme koşulu" style="width:160px;font-size:11px" value="35% deposit, 65% before dispatch">'
    + '<input type="hidden" id="st-alis-id" value="' + (fromAlis?.id||'') + '">'
    + '</div>'
    // Banka önizleme
    + '<div id="st-banka-preview" style="padding:6px 14px;font-size:9px;color:var(--t3);border-bottom:0.5px solid var(--b);display:none"></div>'
    // Ürün satırları
    + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:950px"><thead><tr style="background:var(--s2);border-bottom:0.5px solid var(--b)">'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:left">No</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:left;width:180px">Ürün</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:center">Miktar</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:center">Birim</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:right">Alış (RO)</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:center">Marj%</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:right">Satış</th>'
    + '<th style="padding:5px 6px;font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;text-align:right">Toplam</th>'
    + '<th style="padding:5px 6px;width:30px"></th>'
    + '</tr></thead><tbody id="st-rows"></tbody></table></div>'
    // Şartlar bölümü
    + '<div style="padding:8px 14px;border-top:0.5px solid var(--b)">'
    + '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Teklif Şartları</div>'
    + '<div id="st-sartlar-list" style="font-size:10px;color:var(--t2);margin-bottom:4px">'
    + (function(){var s=typeof loadTeklifSartlar==='function'?loadTeklifSartlar():[];return s.length?s.map(function(x,i){return '<div style="padding:1px 0">'+(i+1)+'. '+x.text+'</div>';}).join(''):'<div style="color:var(--t3)">Sabit şart tanımlı değil</div>';}())
    + '</div>'
    + '<input class="fi" id="st-ek-sart" placeholder="Ek şart ekle (opsiyonel)..." style="font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px">'
    + '</div>'
    // Satıcı Dikkat Formu
    + '<div style="padding:8px 14px;border-top:0.5px solid var(--b)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase">Satıcı Notları</span><label style="font-size:9px;color:var(--t3);display:flex;align-items:center;gap:3px;cursor:pointer"><input type="checkbox" id="st-not-pdf" checked style="accent-color:var(--ac)"> PDF\'e ekle</label></div>'
    + '<input class="fi" id="st-urun-karsilastir" placeholder="Ürün karşılaştırması: Bizim ürün vs rakip..." style="font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;margin-bottom:4px">'
    + '<textarea class="fi" id="st-ozel-husus" rows="2" placeholder="Özel hususlar / müşteri dikkat noktaları..." style="font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;resize:none"></textarea>'
    + '</div>'
    // Özet + kaydet
    + '<div style="padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-top:0.5px solid var(--b);background:var(--s2)">'
    + '<div style="display:flex;gap:6px"><button onclick="window._stAddRow()" style="padding:4px 12px;border:0.5px solid #0F6E56;border-radius:5px;background:none;color:#0F6E56;font-size:11px;cursor:pointer;font-family:inherit">+ Ürün Ekle</button>'
    + '<button onclick="window._stNavlunDagit?.()" style="padding:4px 12px;border:0.5px solid var(--b);border-radius:5px;background:none;color:var(--t3);font-size:11px;cursor:pointer;font-family:inherit">Navlun Dağıt</button></div>'
    + '<div style="display:flex;align-items:center;gap:16px">'
    + '<span style="font-size:10px;color:var(--t3)">Toplam: <b style="font-size:14px;color:var(--t)" id="st-toplam">0</b></span>'
    + '<span style="font-size:10px;color:var(--t3)">Kâr: <b style="font-size:14px;color:#16A34A" id="st-kar">0</b></span>'
    + '<button onclick="window._saveSatisTeklif()" style="padding:5px 14px;border:none;border-radius:6px;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Kaydet</button></div>'
    + '</div>';
  cont.insertBefore(form, cont.firstChild);
  // İlk satır ekle (alış teklifinden geliyorsa doldur)
  window._stAddRow(fromAlis);
  window._stBankaPreview?.();
  form.scrollIntoView({behavior:'smooth'});
};

window._stRowCounter = 0;
window._stAddRow = function(fromAlis) {
  var tbody = document.getElementById('st-rows'); if (!tbody) return;
  var urunList = typeof loadUrunler==='function'?loadUrunler():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  window._stRowCounter++;
  var n = window._stRowCounter;
  var alisFiyat = fromAlis?.birimFiyat||'';
  var alisMiktar = fromAlis?.miktar||'1';
  var alisUrun = fromAlis?.urunAdi||'';
  var tr = document.createElement('tr');
  tr.className = 'st-row';
  tr.style.borderBottom = '0.5px solid var(--b)';
  tr.innerHTML = '<td style="padding:4px 6px;color:var(--t3)">'+n+'</td>'
    + '<td style="padding:4px 6px"><select class="fi st-urun-sel" style="font-size:10px;padding:3px 4px" onchange="window._stRowUrunChange(this)"><option value="">— Seç —</option>'+urunList.map(function(u){return '<option value="'+u.id+'" data-birim="'+(u.birim||'')+'"'+(alisUrun&&(u.orijinalAdi===alisUrun||u.urunAdi===alisUrun)?' selected':'')+'>'+esc(u.duayKodu||'')+' — '+esc(u.orijinalAdi||u.urunAdi||'')+'</option>';}).join('')+'</select></td>'
    + '<td style="padding:4px 6px"><input type="number" class="fi st-miktar" style="width:55px;font-size:11px;padding:3px 4px;text-align:center" value="'+alisMiktar+'" oninput="window._stCalcAll()"></td>'
    + '<td style="padding:4px 6px;text-align:center;font-size:10px;color:var(--t3)" class="st-birim">—</td>'
    + '<td style="padding:4px 6px"><input type="number" class="fi st-alis" style="width:70px;font-size:11px;padding:3px 4px;text-align:right;background:#f5f5f5;color:var(--t3)" value="'+alisFiyat+'" readonly title="Alış fiyatı — değiştirilemez"></td>'
    + '<td style="padding:4px 6px"><input type="number" class="fi st-marj" style="width:50px;font-size:11px;padding:3px 4px;text-align:center" value="15" oninput="window._stCalcAll()"></td>'
    + '<td style="padding:4px 6px;text-align:right;font-weight:600;color:var(--ac)" class="st-satis">—</td>'
    + '<td style="padding:4px 6px;text-align:right;font-weight:600" class="st-row-toplam">—</td>'
    + '<td style="padding:4px 6px;display:flex;gap:2px">'
    + '<button onclick="var s=this.closest(\'tr\').querySelector(\'.st-urun-sel\');if(s&&s.value)window._showPriceHistory?.(parseInt(s.value))" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:10px" title="Geçmiş fiyat">📋</button>'
    + '<button onclick="this.closest(\'tr\').remove();window._stCalcAll()" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:12px">×</button></td>';
  tbody.appendChild(tr);
  window._stCalcAll();
};

window._stRowUrunChange = function(sel) {
  var tr = sel.closest('tr'); if (!tr) return;
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  // Birim otomatik
  tr.querySelector('.st-birim').textContent = opt.dataset.birim || '—';
  // FIX 5: Tedarikçi adı göster
  var urunData = (typeof loadUrunler === 'function' ? loadUrunler() : []).find(function(u) { return u.id === parseInt(opt.value); });
  var selTd = sel.closest('td');
  var tedSpan = selTd?.querySelector('.st-tedarikci-label');
  if (!tedSpan && selTd) { tedSpan = document.createElement('div'); tedSpan.className = 'st-tedarikci-label'; tedSpan.style.cssText = 'font-size:9px;color:var(--t3);margin-top:1px'; selTd.appendChild(tedSpan); }
  if (tedSpan) tedSpan.textContent = urunData?.tedarikci ? 'Tedarikçi: ' + urunData.tedarikci : '';
  // FIX 2: Alış fiyatı otomatik — son geçerli alış teklifinden
  var urunId = parseInt(opt.value);
  var alisTeklifler = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var sonFiyat = 0;
  // En son alış teklifini tara (ts'ye göre sıralı — unshift ile eklenir, ilk bulunan en yeni)
  for (var i = 0; i < alisTeklifler.length; i++) {
    var satirlar = alisTeklifler[i].satirlar || [];
    for (var j = 0; j < satirlar.length; j++) {
      if (satirlar[j].urunId === urunId && satirlar[j].birimFiyat > 0) {
        sonFiyat = satirlar[j].birimFiyat;
        break;
      }
    }
    if (sonFiyat > 0) break;
  }
  // Ürün kataloğundaki sonFiyat'a da bak (fallback)
  if (!sonFiyat) {
    var urunList = typeof loadUrunler === 'function' ? loadUrunler() : [];
    var urun = urunList.find(function(u) { return u.id === urunId; });
    if (urun && urun.sonFiyat) sonFiyat = urun.sonFiyat;
  }
  var alisEl = tr.querySelector('.st-alis');
  if (alisEl && sonFiyat > 0) {
    alisEl.value = sonFiyat;
    alisEl.title = 'Son alış fiyatı: ' + sonFiyat;
  }
  window._stCalcAll();
};

window._stCalcAll = function() {
  var toplamAll=0, karAll=0;
  document.querySelectorAll('.st-row').forEach(function(tr) {
    var alis = parseFloat(tr.querySelector('.st-alis')?.value||'0');
    var marj = parseFloat(tr.querySelector('.st-marj')?.value||'0');
    var miktar = parseFloat(tr.querySelector('.st-miktar')?.value||'0');
    var satis = alis * (1 + marj/100);
    var toplam = satis * miktar;
    var kar = (satis - alis) * miktar;
    tr.querySelector('.st-satis').textContent = satis.toFixed(2);
    tr.querySelector('.st-row-toplam').textContent = toplam.toFixed(2);
    toplamAll += toplam;
    karAll += kar;
  });
  var cur = document.getElementById('st-cur')?.value||'USD';
  var tEl = document.getElementById('st-toplam'); if (tEl) tEl.textContent = toplamAll.toFixed(2)+' '+cur;
  var kEl = document.getElementById('st-kar'); if (kEl) kEl.textContent = '+'+karAll.toFixed(2)+' '+cur;
};

/** FIX 4: Banka önizleme — döviz seçimine göre */
window._stBankaPreview = function() {
  var el = document.getElementById('st-banka-preview'); if (!el) return;
  var cur = document.getElementById('st-cur')?.value || 'USD';
  var bankalar = typeof loadBankalar === 'function' ? loadBankalar() : [];
  if (!bankalar.length) { el.style.display = 'none'; return; }
  var banka = bankalar[0];
  var iban = cur === 'EUR' ? (banka.ibanEur || banka.iban) : cur === 'TRY' ? (banka.ibanTry || banka.iban) : banka.iban;
  el.style.display = 'block';
  el.innerHTML = '<span style="font-weight:600">' + (banka.name || '') + '</span> · IBAN: ' + (iban || '—') + ' · SWIFT: ' + (banka.swift || '—') + ' · ' + (banka.hesapSahibi || '');
};

// Eski tek satır _stCalc uyumluluk
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
  var urunler = [];
  var genelToplam=0, tahminKar=0;
  document.querySelectorAll('.st-row').forEach(function(tr) {
    var sel = tr.querySelector('.st-urun-sel');
    if (!sel?.value) return;
    var alis = parseFloat(tr.querySelector('.st-alis')?.value||'0');
    var marj = parseFloat(tr.querySelector('.st-marj')?.value||'0');
    var miktar = parseFloat(tr.querySelector('.st-miktar')?.value||'0');
    var satis = alis * (1 + marj/100);
    urunler.push({urunId:parseInt(sel.value), urunAdi:sel.options[sel.selectedIndex]?.text||'', miktar:miktar, alisFiyat:alis, karMarji:marj, satisFiyat:satis});
    genelToplam += satis * miktar;
    tahminKar += (satis - alis) * miktar;
  });
  if (!urunler.length) { window.toast?.('En az bir ürün gerekli','err'); return; }
  var d = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  // Teklif No: [MüşteriID]-[YYMMDDHHMMM]
  var musteriSel = document.getElementById('st-musteri');
  var musteriCid = musteriSel?.options[musteriSel.selectedIndex]?.getAttribute('data-cid') || '';
  var cariKod = musteriCid ? String(musteriCid).slice(-4) : '1018';
  var n2 = new Date();
  var teklifNo = cariKod + '-' + String(n2.getFullYear()).slice(2) + String(n2.getMonth()+1).padStart(2,'0') + String(n2.getDate()).padStart(2,'0') + String(n2.getHours()).padStart(2,'0') + String(n2.getMinutes()).padStart(2,'0');
  var jobId = document.getElementById('st-job')?.value || '';
  d.unshift({
    id:typeof generateNumericId==='function'?generateNumericId():Date.now(),
    teklifNo:teklifNo, musteri:musteri, musteriId:musteriCid,
    jobId:jobId,
    alisTeklifiId:parseInt(document.getElementById('st-alis-id')?.value||'0')||null,
    urunler:urunler, paraBirimi:document.getElementById('st-cur')?.value||'USD',
    genelToplam:genelToplam, tahminKar:tahminKar,
    teslimSekli:document.getElementById('st-teslim')?.value||'FOB',
    odemeKosulu:(document.getElementById('st-odeme')?.value||'').trim(),
    gecerlilikTarihi:document.getElementById('st-gecerlilik')?.value||'',
    ekSart:(document.getElementById('st-ek-sart')?.value||'').trim(),
    sartlar:typeof loadTeklifSartlar==='function'?loadTeklifSartlar().map(function(s){return s.text;}):[],
    saticiNotu:{
      urunKarsilastir:(document.getElementById('st-urun-karsilastir')?.value||'').trim(),
      ozelHusus:(document.getElementById('st-ozel-husus')?.value||'').trim(),
      pdfEkle:document.getElementById('st-not-pdf')?.checked||false,
    },
    durum:'taslak', ts:new Date().toISOString(), createdBy:window.Auth?.getCU?.()?.id
  });
  var yeniId = d[0].id;
  if (typeof storeSatisTeklifleri === 'function') storeSatisTeklifleri(d);
  document.getElementById('satis-inline-form')?.remove();
  window._stRowCounter = 0;
  window.toast?.('Satış teklifi oluşturuldu ✓','ok');
  window.renderSatisTeklifleri?.();
  // FIX 1: Teslim şekli → alt görev otomatik
  if (d[0].teslimSekli && typeof window._checkIncotermsGorev === 'function') {
    window._checkIncotermsGorev(yeniId);
  }
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
  var banka = bankalar.length ? bankalar[0] : { name:'Albaraka Türk', sube:'Alibeyköy-117', iban:'TR650020300008895310000001', ibanEur:'TR380020300008895310000002', swift:'BTFHTRIS', hesapSahibi:'DUAY ULUSLARARASI TİCARET LTD. ŞTİ.' };
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
    + '<div class="header"><h1>DUAY GLOBAL</h1><h2>TRADE COMPANY &bull; ISTANBUL</h2><h3>PROFORMA INVOICE</h3></div>'
    // Meta
    + '<div class="meta"><div class="meta-box"><b>REF:</b> ' + esc(t.teklifNo) + '</div><div class="meta-box"><b>DATE:</b> ' + (t.ts||'').slice(0,10) + '</div><div class="meta-box"><b>VALIDITY:</b> ' + (t.gecerlilikTarihi ? t.gecerlilikTarihi : '5 working days') + '</div></div>'
    + '<div class="meta-box" style="margin-bottom:12px"><b>CUSTOMER:</b> ' + esc(t.musteri||'—') + '</div>'
    // IMO uyarısı
    + (function(){var hasIMO=(t.urunler||[]).some(function(u){return u.imoMu;});return hasIMO?'<div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:6px;padding:10px 14px;margin-bottom:12px;color:#991B1B;font-weight:700;font-size:12px">⚠ ATTENTION: THIS SHIPMENT CONTAINS HAZARDOUS MATERIALS (IMO/DG CARGO)<br><span style="font-weight:400;font-size:10px">MSDS documents available upon request</span></div>':'';})()
    // Tablo — fotoğraflı
    + '<table><thead><tr><th>NO</th><th style="width:50px">PHOTO</th><th>DESCRIPTION OF GOODS</th><th>QTY</th><th>UNIT PRICE (' + cur + ')</th><th>TOTAL PRICE (' + cur + ')</th></tr></thead><tbody>'
    + (t.urunler||[]).map(function(u,i){
        var urunData = (typeof loadUrunler==='function'?loadUrunler():[]).find(function(x){return x.id===u.urunId;});
        var foto = urunData?.gorsel ? '<img src="'+urunData.gorsel+'" style="width:40px;height:40px;object-fit:cover;border-radius:4px">' : '<div style="width:40px;height:40px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px">📦</div>';
        var imoTag = (u.imoMu||urunData?.imolu==='E') ? '<span style="color:#DC2626;font-weight:700;font-size:9px"> [IMO Class '+(urunData?.imoSinifi||'?')+']</span>' : '';
        return '<tr><td>' + (i+1) + '</td><td>'+foto+'</td><td><b>' + esc(u.urunAdi||'') + '</b>'+imoTag+'<br><span style="font-size:9px;color:#666">'+ esc(urunData?.teknikAciklama||urunData?.standartAdi||'') +'</span></td><td style="text-align:center">' + (u.miktar||0) + '</td><td style="text-align:right">' + curSym + (u.satisFiyat||0).toFixed(2) + '</td><td style="text-align:right">' + curSym + ((u.satisFiyat||0)*(u.miktar||0)).toFixed(2) + '</td></tr>';
      }).join('')
    + '<tr class="total-row"><td colspan="5" style="text-align:right">TOTAL AMOUNT</td><td style="text-align:right;font-size:15px">' + curSym + totalAmt + '</td></tr>'
    + '</tbody></table>'
    // Terms — genişletilmiş
    + '<div class="terms"><h4>TERMS & CONDITIONS</h4>'
    + '<div>• Payment: ' + (t.odemeKosulu || '35% advance payment, 65% before dispatch') + '</div>'
    + '<div>• Delivery: ' + (t.teslimSekli || 'FOB') + ' Istanbul · Lead time: ' + (t.teslimatSuresi || '30 working days') + '</div>'
    + '<div>• All banking charges outside Turkey are on buyer\'s account</div>'
    + '<div>• Prices are exclusive of local taxes and duties at destination</div>'
    + '<div>• Insurance: To be covered by buyer unless otherwise agreed</div>'
    + '<div>• Any dispute shall be settled under Istanbul Chamber of Commerce arbitration</div>'
    + '<div>• This offer is valid for ' + (t.gecerlilikTarihi ? 'until '+t.gecerlilikTarihi : '5 working days') + '</div></div>'
    // Bank
    + '<div class="bank"><h4>BANKING DETAILS</h4>'
    + '<div style="font-size:10px;margin-bottom:4px"><b>Account Holder:</b> ' + esc(banka.hesapSahibi||'DUAY ULUSLARARASI TİCARET LTD. ŞTİ.') + '</div>'
    + '<div><b>' + esc(banka.name||'Albaraka Türk') + '</b> — ' + esc(banka.sube||'') + '</div>'
    + (cur==='USD'||!cur||cur==='USD' ? '<div>USD IBAN: ' + esc(banka.iban||'') + '</div>' : '')
    + (cur==='EUR' ? '<div>EUR IBAN: ' + esc(banka.ibanEur||banka.iban||'') + '</div>' : '')
    + (cur!=='USD'&&cur!=='EUR' ? '<div>IBAN: ' + esc(banka.iban||'') + '</div>' + (banka.ibanEur?'<div>EUR IBAN: '+esc(banka.ibanEur)+'</div>':'') : '')
    + '<div>SWIFT: ' + esc(banka.swift||'') + '</div></div>'
    // Satıcı notu (opsiyonel)
    + (function(){var sn=t.saticiNotu;if(!sn||!sn.pdfEkle)return '';var html='<div style="margin-top:15px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;font-size:9px;color:#0c4a6e"><h4 style="color:#0c4a6e;font-size:10px;margin-bottom:6px">SELLER\'S NOTES</h4>';if(sn.urunKarsilastir)html+='<div style="margin-bottom:4px">'+esc(sn.urunKarsilastir)+'</div>';if(sn.ozelHusus)html+='<div>'+esc(sn.ozelHusus)+'</div>';return html+'</div>';})()
    // Signature
    + '<div class="sig"><div><div class="sig-line">DUAY GLOBAL TRADE</div></div><div><div class="sig-line">' + esc(t.musteri||'Customer') + '</div></div></div>'
    // Footer
    + '<div class="footer">Duay Int. Trade Company · www.duaycor.com · brn.simsek@gmail.com<br>Karadolap Mh. Neşeli Sk. 1-5 Eyüp İstanbul TÜRKİYE · +90 532 270 5 113 · +90 212 625 5 444</div>'
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
      var added=0, errors=[], yeniUrunler=[];
      rows.forEach(function(r,i) {
        var ad = r['Orijinal Adı']||r['orijinalAdi']||r['Ad']||'';
        var ted = r['Tedarikçi']||r['tedarikci']||'';
        if (!ad) {errors.push('Satır '+(i+2)+': Ürün adı boş');return;}
        if (ted && cariNames.indexOf(ted)===-1) {errors.push('Satır '+(i+2)+': Tedarikçi "'+ted+'" tanımsız');return;}
        var sat=(ted||'X').replace(/[^A-Za-z]/g,'').slice(0,4).toUpperCase();
        var yeni = {
          id:typeof generateNumericId==='function'?generateNumericId():Date.now()+i,
          duayKodu:'DUAY-'+sat+'-'+String(d.length+added+1).padStart(3,'0'),
          urunKodu:'DUAY-'+sat+'-'+String(d.length+added+1).padStart(3,'0'),
          orijinalAdi:ad, urunAdi:ad,
          standartAdi:r['Standart Adı']||r['standartAdi']||'',
          kategori:r['Kategori']||r['kategori']||'',
          birim:r['Birim']||r['birim']||'Adet',
          mensei:r['Menşei']||r['mensei']||'',
          gtip:r['GTİP']||r['gtip']||'',
          marka:r['Marka']||r['marka']||'',
          alisF:r['Alış Fiyatı']||r['alisF']||'',
          para:r['Döviz']||r['para']||'USD',
          tedarikci:ted, saticiId:ted,
          kdvOrani:parseInt(r['KDV%']||r['kdvOrani']||'20'),
          status:'aktif', ts:new Date().toISOString(), createdBy:window.Auth?.getCU?.()?.id,
          changeLog:[{ts:new Date().toISOString(),by:window.Auth?.getCU?.()?.id,action:'Excel import'}]
        };
        yeniUrunler.push(yeni);
        d.unshift(yeni);
        added++;
      });
      window._importOnizlemeGoster(yeniUrunler, errors, d);
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

// ════════════════════════════════════════════════════════════════
// İHRACAT EKOSİSTEMİ — ihracatBilgileriTam + 7 Gün Kuralı + IMO Zinciri + Job ID Hub
// ════════════════════════════════════════════════════════════════

/** İhracat bilgileri tamamlanma hesabı */
function _calcIhracatTam(u) {
  if (!u) return false;
  var base = !!(u.hscKodu||u.gtip) && !!u.mensei && !!(u.netAgirlik||u.brutAgirlik) && !!(u.paketEn||u.paketBoy);
  if (u.imolu === 'E') return base && !!u.imoSinifi && !!u.imoTehlikeNo;
  return base;
}

/** İhracat tamamlanma yüzdesi */
function _calcIhracatPct(u) {
  if (!u) return 0;
  var fields = [u.hscKodu||u.gtip, u.mensei, u.netAgirlik, u.brutAgirlik, u.paketEn, u.paketBoy, u.paketYukseklik, u.gorsel];
  if (u.imolu==='E') fields.push(u.imoSinifi, u.imoTehlikeNo);
  var filled = fields.filter(Boolean).length;
  return Math.round(filled / fields.length * 100);
}

/** 7 Gün Kuralı — günlük kontrol */
function _check7GunKurali() {
  var konts = typeof loadKonteyn==='function'?loadKonteyn().filter(function(k){return !k.closed;}):[];
  var urunler = typeof loadUrunler==='function'?loadUrunler():[];
  var today = new Date();
  var alerts = [];
  konts.forEach(function(k) {
    if (!k.etd) return;
    var etd = new Date(k.etd);
    var diff = Math.ceil((etd - today) / 86400000);
    if (diff > 7 || diff < 0) return;
    // Konteynırdaki ürünleri kontrol (purchaseId üzerinden satınalmadan)
    var sa = typeof loadSatinalma==='function'?loadSatinalma().filter(function(s){return s.containerNo===k.no;}):[];
    sa.forEach(function(s) {
      // Satınalmadaki ürünleri kontrol
      var urun = urunler.find(function(u){return u.tedarikci===s.supplier||u.urunAdi===s.supplier;});
      if (urun && !_calcIhracatTam(urun)) {
        alerts.push({konteyner:k.no, urun:urun.orijinalAdi||urun.urunAdi, gun:diff, urunId:urun.id});
      }
      // IMO ürün MSDS eksik kontrolü
      if (urun && urun.imolu === 'E' && (!urun.imoSinifi || !urun.imoTehlikeNo)) {
        alerts.push({konteyner:k.no, urun:'IMO EVRAK EKSİK: '+(urun.orijinalAdi||urun.urunAdi), gun:diff, urunId:urun.id});
      }
    });
  });
  if (!alerts.length) return;
  // Uyarıları gönder
  alerts.forEach(function(a) {
    var severity = a.gun <= 3 ? 'err' : 'warn';
    var icon = a.gun <= 3 ? '🚨' : '⚠️';
    window.addNotif?.(icon, 'İhracat bilgisi eksik: ' + a.urun + ' — ' + a.konteyner + ' (' + a.gun + ' gün kaldı)', severity, 'urunler');
  });
  console.info('[7GünKuralı]', alerts.length, 'uyarı');
}
// Sayfa açılışında kontrol
setTimeout(_check7GunKurali, 8000);
setInterval(_check7GunKurali, 30 * 60 * 1000);

/** Job ID Hub — merkezi görünüm */
window.openJobIdHub = function(jobId) {
  if (!jobId) return;
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var tasks = typeof loadTasks==='function'?loadTasks():[];
  var task = tasks.find(function(t){return t.jobId===jobId||String(t.id)===String(jobId);});
  var sa = typeof loadSatinalma==='function'?loadSatinalma().filter(function(s){return s.jobId===jobId||s.jobId===String(jobId);}):[];
  var sIds = sa.map(function(s){return s.id;});
  var odmAll = typeof loadOdm==='function'?loadOdm():[];
  var odmFiltered = odmAll.filter(function(o){return (o.jobId&&o.jobId===jobId)||(o.purchaseId&&sIds.indexOf(o.purchaseId)!==-1);});
  var kargo = typeof loadKargo==='function'?loadKargo().filter(function(k){return k.purchaseId&&sa.some(function(s){return s.id===k.purchaseId;});}):[];
  var alis = typeof loadAlisTeklifleri==='function'?loadAlisTeklifleri().filter(function(t){return t.jobId===jobId;}):[];
  var satis = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri().filter(function(t){return t.jobId===jobId;}):[];
  var ihracat = typeof loadIhracatOps==='function'?loadIhracatOps().filter(function(e){return e.jobId===jobId||e.expNo===jobId;}):[];
  var navlun = typeof loadNavlun==='function'?loadNavlun().filter(function(n){return n.jobId===jobId;}):[];
  var numune = typeof loadNumune==='function'?loadNumune().filter(function(n){return n.jobId===jobId;}):[];
  var toplamMaliyet = sa.reduce(function(s,x){return s+(parseFloat(x.totalAmount)||0);},0);
  var toplamSatis = satis.reduce(function(s,x){return s+(parseFloat(x.genelToplam)||0);},0);
  ihracat.forEach(function(e){toplamSatis+=(parseFloat(e.birimFiyat)||0)*(parseFloat(e.miktar)||0);});
  var kar = toplamSatis - toplamMaliyet;

  var ex = document.getElementById('mo-jobhub'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-jobhub';
  mo.innerHTML = '<div class="moc" style="max-width:640px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:15px;font-weight:700;color:var(--t)">' + esc(jobId) + '</div><div style="font-size:10px;color:var(--t3)">' + esc(task?.title||'—') + '</div></div><button onclick="document.getElementById(\'mo-jobhub\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:16px 20px;max-height:60vh;overflow-y:auto">'
    // Özet kartlar
    + '<div style="display:grid;grid-template-columns:'+(ihracat.length?'1fr 1fr 1fr 1fr':'1fr 1fr 1fr')+';gap:8px;margin-bottom:16px">'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Maliyet</div><div style="font-size:16px;font-weight:700;color:#DC2626">$'+Math.round(toplamMaliyet).toLocaleString('tr-TR')+'</div></div>'
    + '<div style="padding:10px;background:var(--s2);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Satış</div><div style="font-size:16px;font-weight:700;color:#16A34A">$'+Math.round(toplamSatis).toLocaleString('tr-TR')+'</div></div>'
    + '<div style="padding:10px;background:'+(kar>=0?'#16A34A11':'#DC262611')+';border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Kâr</div><div style="font-size:16px;font-weight:700;color:'+(kar>=0?'#16A34A':'#DC2626')+'">'+(kar>=0?'+':'')+'$'+Math.round(Math.abs(kar)).toLocaleString('tr-TR')+'</div></div>'
    + (ihracat.length?'<div style="padding:10px;background:var(--s2);border-radius:8px;text-align:center"><div style="font-size:9px;color:var(--t3)">Durum</div><div style="font-size:14px;font-weight:700;color:var(--t)">'+esc(ihracat[0].status||'—')+'</div></div>':'')
    + '</div>'
    // Bölümler
    + (task ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Görev</div><div style="padding:8px 12px;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;font-size:12px">'+esc(task.title)+' · '+(task.done?'✅ Tamamlandı':'⏳ '+task.status)+' · '+(task.due||'—')+'</div></div>' : '')
    + (alis.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Alış Teklifleri ('+alis.length+')</div>'+alis.map(function(a){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(a.teklifNo||'')+' · '+esc(a.tedarikci||'')+' · '+(a.toplamTutar||0)+' '+(a.paraBirimi||'USD')+'</div>';}).join('')+'</div>' : '')
    + (sa.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Satınalma ('+sa.length+')</div>'+sa.map(function(s){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(s.supplier||s.piNo||'')+' · '+(s.totalAmount||0)+' '+(s.currency||'USD')+' · '+s.status+'</div>';}).join('')+'</div>' : '')
    + (odmFiltered.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Ödemeler ('+odmFiltered.length+')</div>'+odmFiltered.map(function(o){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(o.name||'')+' · '+(o.amount||0)+' '+(o.currency||'TRY')+' · '+(o.paid?'✅':'⏳')+'</div>';}).join('')+'</div>' : '')
    + (kargo.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Kargo ('+kargo.length+')</div>'+kargo.map(function(k){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(k.name||'')+' · '+k.status+'</div>';}).join('')+'</div>' : '')
    + (ihracat.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">İHRACAT OPS ('+ihracat.length+')</div>'+ihracat.map(function(e){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(e.expNo||'')+' · '+esc(e.aliciAdi||'')+' · <span style="padding:1px 6px;border-radius:4px;background:var(--s2);font-size:9px">'+esc(e.status||'')+'</span> · '+((parseFloat(e.birimFiyat)||0)*(parseFloat(e.miktar)||0)).toLocaleString('tr-TR')+' '+(e.doviz||'USD')+'</div>';}).join('')+'</div>' : '')
    + (navlun.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">NAVLUN ('+navlun.length+')</div>'+navlun.map(function(n){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(n.from||'')+' → '+esc(n.to||'')+' · '+(n.birimFiyat||0)+' '+(n.para||'USD')+' · '+esc(n.durum||'')+'</div>';}).join('')+'</div>' : '')
    + (satis.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Satış Teklifleri ('+satis.length+')</div>'+satis.map(function(s){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(s.teklifNo||'')+' · '+esc(s.musteri||'')+' · '+(s.genelToplam||0)+' '+(s.paraBirimi||'USD')+'</div>';}).join('')+'</div>' : '')
    + (numune.length ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">NUMUNE ('+numune.length+')</div>'+numune.map(function(n){return '<div style="padding:6px 12px;border-bottom:0.5px solid var(--b);font-size:11px">'+esc(n.nmsId||'')+' · '+esc(n.tip||'')+' · '+esc(n.durum||'')+'</div>';}).join('')+'</div>' : '')
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

/** Sevkiyat sonrası evrak zamanlayıcı */
function _checkEvrakZamanlayici() {
  var konts = typeof loadKonteyn==='function'?loadKonteyn().filter(function(k){return !k.closed && k.etd;}):[];
  var today = new Date();
  konts.forEach(function(k) {
    var etd = new Date(k.etd);
    if (etd > today) return; // henüz hareket etmedi
    var daysSince = Math.ceil((today - etd) / 86400000);
    if (daysSince > 7) return; // 7 gün geçti
    if (k.evrakGonderildi) return;
    var icon = daysSince >= 5 ? '🚨' : '⚠️';
    window.addNotif?.(icon, 'Evrak gönderilmedi: ' + (k.no||'?') + ' — ' + daysSince + '. gün', daysSince>=5?'err':'warn', 'kargo');
  });
  // ETA uyarıları
  konts.forEach(function(k) {
    if (!k.eta || k.closed) return;
    var eta = new Date(k.eta);
    var daysToEta = Math.ceil((eta - today) / 86400000);
    if (daysToEta === 10) window.addNotif?.('📦', 'Varışa 10 gün: ' + (k.no||''), 'info', 'kargo');
    else if (daysToEta === 6) window.addNotif?.('📦', 'Varışa 6 gün: ' + (k.no||'') + ' — müşteri hazırlıklı olsun', 'warn', 'kargo');
    else if (daysToEta === 0) window.addNotif?.('✅', 'Konteynır limana ulaştı: ' + (k.no||''), 'ok', 'kargo');
  });
}
setTimeout(_checkEvrakZamanlayici, 10000);

// ════════════════════════════════════════════════════════════════
// SATIŞ TEKLİFİ — KAPSAMLI YENİLEME
// ════════════════════════════════════════════════════════════════

// FIX 3: Demo banka bilgileri
(function _ensureDemoBanka() {
  var bankalar = typeof loadBankalar==='function'?loadBankalar():[];
  if (bankalar.some(function(b){return b.name==='Albaraka Türk';})) return;
  bankalar.unshift({
    id: typeof generateNumericId==='function'?generateNumericId():Date.now(),
    name: 'Albaraka Türk', sube: 'Alibeyköy Şubesi - 117',
    hesapTur: 'USD', iban: 'TR650020300008895310000001', swift: 'BTFHTRIS',
    ibanEur: 'TR380020300008895310000002', ibanTry: 'TR120020300008895310000003',
    hesapSahibi: 'DUAY ULUSLARARASI TİCARET LTD. ŞTİ.',
    createdAt: new Date().toISOString()
  });
  if (typeof storeBankalar==='function') storeBankalar(bankalar);
})();

// FIX 1: Revizyon sistemi
window._reviseSatisTeklif = function(id) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var orig = d.find(function(t){return t.id===id;});
  if (!orig) return;
  // Orijinali arşivle
  orig.durum = 'arsivedildi';
  orig.arsivedildiAt = new Date().toISOString();
  // Yeni rev oluştur
  var revNo = (orig.revizyon || 0) + 1;
  var yeniId = typeof generateNumericId==='function'?generateNumericId():Date.now();
  var yeni = JSON.parse(JSON.stringify(orig));
  yeni.id = yeniId;
  yeni.teklifNo = orig.teklifNo + '/Rev' + revNo;
  yeni.revizyon = revNo;
  yeni.orijinalId = orig.orijinalId || orig.id;
  yeni.durum = 'taslak';
  yeni.ts = new Date().toISOString();
  d.unshift(yeni);
  if (typeof storeSatisTeklifleri==='function') storeSatisTeklifleri(d);
  window.toast?.('Rev'+revNo+' oluşturuldu ✓','ok');
  window.renderSatisTeklifleri?.();
};

// FIX 5: Purchase Requisition (PR) — iç belge
window._createPR = function(teklifId) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===teklifId;});
  if (!t) return;
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var yr = new Date().getFullYear();
  var prSeq = typeof generateNumericId==='function'?String(generateNumericId()).slice(-4):String(Math.floor(Math.random()*9000)+1000);
  var prNo = 'PR-'+yr+'-'+prSeq;
  var w = window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>PR '+prNo+'</title><style>body{font-family:system-ui;padding:30px;max-width:700px;margin:0 auto;font-size:12px}h1{text-align:center;color:#1a365d;font-size:16px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:6px 8px;border:1px solid #ddd;font-size:11px}th{background:#f5f5f5}@media print{button{display:none!important}}</style></head><body>'
    +'<h1>PURCHASE REQUISITION</h1><div style="text-align:center;color:#666;font-size:11px;margin-bottom:16px">DUAY GLOBAL TRADE — İÇ BELGE</div>'
    +'<table><tr><td><b>PR No:</b> '+prNo+'</td><td><b>Tarih:</b> '+new Date().toISOString().slice(0,10)+'</td></tr>'
    +'<tr><td><b>Satış Teklif Ref:</b> '+esc(t.teklifNo)+'</td><td><b>Müşteri:</b> '+esc(t.musteri||'')+'</td></tr>'
    +'<tr><td colspan="2"><b>Job ID:</b> '+(t.jobId||'—')+'</td></tr></table>'
    +'<table><thead><tr><th>Ürün</th><th>Miktar</th><th>Birim</th><th>Hedef Alış Fiyatı</th><th>Satış Fiyatı</th><th>Marj%</th></tr></thead><tbody>'
    +(t.urunler||[]).map(function(u){return '<tr><td>'+esc(u.urunAdi||'')+'</td><td>'+(u.miktar||0)+'</td><td>—</td><td style="color:#DC2626;font-weight:600">'+(u.alisFiyat||0).toFixed(2)+' '+(t.paraBirimi||'USD')+'</td><td>'+(u.satisFiyat||0).toFixed(2)+'</td><td>'+Math.round(u.karMarji||0)+'%</td></tr>';}).join('')
    +'</tbody></table>'
    +'<div style="margin-top:20px;padding:10px;background:#FEF3C7;border-radius:4px;font-size:10px;color:#92400E"><b>NOT:</b> Bu belge iç kullanım içindir. Müşteriye gönderilemez. Alış fiyatları ve kar marjları gizlidir.</div>'
    +'<div style="display:flex;justify-content:space-between;margin-top:40px"><div style="width:40%;text-align:center;border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">Talep Eden</div><div style="width:40%;text-align:center;border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">Yönetici Onayı</div></div>'
    +'<button onclick="window.print()" style="margin-top:16px;padding:6px 16px;cursor:pointer">Yazdır</button></body></html>');
  w.document.close();
};

// FIX 6: Müşteri onay akışı
window._musteriOnayladi = function(id) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===id;});
  if (!t) return;
  t.durum = 'kabul';
  t.kabulTarihi = new Date().toISOString();
  if (typeof storeSatisTeklifleri==='function') storeSatisTeklifleri(d);
  window.toast?.('Müşteri onayı kaydedildi — PR oluşturuluyor...','ok');
  // Otomatik PR
  window._createPR(id);
  // Yöneticiye bildirim
  var mgrs = (typeof loadUsers==='function'?loadUsers():[]).filter(function(u){return (u.role==='admin'||u.role==='manager')&&u.status==='active';});
  mgrs.forEach(function(m){window.addNotif?.('✅','Müşteri onayladı: '+t.teklifNo+' — '+t.musteri,'ok','satis-teklifleri',m.id);});
  window.renderSatisTeklifleri?.();
};

window._musteriReddetti = function(id) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===id;});
  if (!t) return;
  t.durum = 'red';
  t.redTarihi = new Date().toISOString();
  if (typeof storeSatisTeklifleri==='function') storeSatisTeklifleri(d);
  window.toast?.('Müşteri reddi kaydedildi — revizyon önerilir','warn');
  window.renderSatisTeklifleri?.();
};

// FIX 10: Navlun dağıtımı
window._stNavlunDagit = function() {
  var navlun = parseFloat(prompt('Navlun tutarı girin:')||'0');
  if (!navlun) return;
  var rows = document.querySelectorAll('.st-row');
  if (!rows.length) return;
  var paylasim = navlun / rows.length;
  rows.forEach(function(tr) {
    var fiyatEl = tr.querySelector('.st-alis');
    if (fiyatEl && !fiyatEl.readOnly) {
      fiyatEl.value = (parseFloat(fiyatEl.value||'0') + paylasim).toFixed(2);
    }
  });
  window._stCalcAll?.();
  window.toast?.('Navlun ₺'+navlun+' → '+rows.length+' satıra dağıtıldı','ok');
};

// ════════════════════════════════════════════════════════════════
// FIX 1 — ŞARTLAR YÖNETİMİ
// ════════════════════════════════════════════════════════════════

// Varsayılan sabit şartlar
(function _ensureDefaultSartlar() {
  var d = typeof loadTeklifSartlar==='function'?loadTeklifSartlar():[];
  if (d.length) return;
  var defaults = [
    'Payment: 35% deposit, 65% before dispatch/shipment',
    'Tax Note: 20% VAT applicable for domestic shipments only',
    'Bank Charges: All transfer fees outside Türkiye belong to buyer',
    'Disputes: İstanbul Courts shall have jurisdiction',
    'Insurance: Buyer\'s responsibility unless CIF terms',
    'Attention: Goods must be inspected within 14 days from delivery',
  ];
  defaults.forEach(function(s,i){d.push({id:Date.now()+i,text:s,sabit:true,ts:new Date().toISOString()});});
  if (typeof storeTeklifSartlar==='function') storeTeklifSartlar(d);
})();

window.openTeklifSartlarPanel = function() {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli','err'); return; }
  var d = typeof loadTeklifSartlar==='function'?loadTeklifSartlar():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var ex = document.getElementById('mo-sartlar'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-sartlar';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">Teklif Şartları Yönetimi</div>'
    + '<div style="padding:16px 20px;max-height:50vh;overflow-y:auto">'
    + d.map(function(s){return '<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:0.5px solid var(--b)">'
      + '<span style="flex:1;font-size:11px;color:var(--t)" id="sart-text-'+s.id+'">'+esc(s.text)+'</span>'
      + '<span style="font-size:8px;padding:1px 4px;border-radius:99px;background:'+(s.sabit?'var(--s2)':'#D9770618')+';color:'+(s.sabit?'var(--t3)':'#D97706')+'">'+(s.sabit?'Sabit':'Dğşkn')+'</span>'
      + '<button onclick="window._editSart('+s.id+')" style="background:none;border:none;color:var(--ac);cursor:pointer;font-size:10px" title="Düzenle">✏</button>'
      + '<button onclick="window._delSart('+s.id+')" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:12px" title="Sil">×</button></div>';}).join('')
    + '<div style="display:flex;gap:6px;margin-top:10px">'
    + '<input class="fi" id="sart-yeni" placeholder="Yeni şart ekle..." style="flex:1;font-size:11px">'
    + '<button onclick="window._addSart()" style="padding:4px 12px;border:none;border-radius:5px;background:var(--ac);color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Ekle</button></div>'
    + '</div><div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right"><button class="btn" onclick="document.getElementById(\'mo-sartlar\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};
window._addSart = function() {
  var text = (document.getElementById('sart-yeni')?.value||'').trim();
  if (!text) return;
  var d = typeof loadTeklifSartlar==='function'?loadTeklifSartlar():[];
  d.push({id:Date.now(),text:text,sabit:true,ts:new Date().toISOString()});
  if (typeof storeTeklifSartlar==='function') storeTeklifSartlar(d);
  window.openTeklifSartlarPanel();
};
window._delSart = function(id) {
  var d = typeof loadTeklifSartlar==='function'?loadTeklifSartlar():[];
  d = d.filter(function(s){return s.id!==id;});
  if (typeof storeTeklifSartlar==='function') storeTeklifSartlar(d);
  window.openTeklifSartlarPanel();
};
/** FIX 7: Şart inline düzenleme */
window._editSart = function(id) {
  var el = document.getElementById('sart-text-' + id); if (!el) return;
  var current = el.textContent;
  el.innerHTML = '<div style="display:flex;gap:4px"><input class="fi" id="sart-edit-'+id+'" value="'+current.replace(/"/g,'&quot;')+'" style="flex:1;font-size:11px;padding:3px 6px"><button onclick="window._saveSartEdit('+id+')" style="padding:2px 8px;border:none;border-radius:4px;background:var(--ac);color:#fff;font-size:9px;cursor:pointer">OK</button></div>';
  document.getElementById('sart-edit-' + id)?.focus();
};
window._saveSartEdit = function(id) {
  var input = document.getElementById('sart-edit-' + id);
  var text = (input?.value || '').trim();
  if (!text) return;
  var d = typeof loadTeklifSartlar === 'function' ? loadTeklifSartlar() : [];
  var s = d.find(function(x) { return x.id === id; });
  if (s) { s.text = text; s.ts = new Date().toISOString(); }
  if (typeof storeTeklifSartlar === 'function') storeTeklifSartlar(d);
  window.openTeklifSartlarPanel();
};

// ════════════════════════════════════════════════════════════════
// FIX 2 — GEÇMİŞ SATIŞ FİYATI
// ════════════════════════════════════════════════════════════════
window._showPriceHistory = function(urunId) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  var matches = [];
  d.forEach(function(t){
    (t.urunler||[]).forEach(function(u){
      if (u.urunId===urunId||u.urunAdi===String(urunId)) {
        matches.push({tarih:(t.ts||'').slice(0,10),teklifNo:t.teklifNo,musteri:t.musteri,fiyat:u.satisFiyat,doviz:t.paraBirimi||'USD'});
      }
    });
  });
  matches.sort(function(a,b){return (b.tarih||'').localeCompare(a.tarih||'');});
  if (!matches.length) { window.toast?.('Bu ürün için geçmiş satış yok','info'); return; }
  var ex = document.getElementById('mo-price-hist'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-price-hist';
  mo.innerHTML = '<div class="moc" style="max-width:400px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:12px 20px;border-bottom:1px solid var(--b);font-size:13px;font-weight:700">Geçmiş Satış Fiyatları</div>'
    + '<div style="padding:12px 20px">'
    + matches.slice(0,5).map(function(m){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--b);font-size:11px"><span>'+esc(m.tarih)+' · '+esc(m.teklifNo||'')+'</span><span style="color:var(--t3)">'+esc(m.musteri||'')+'</span><span style="font-weight:600">'+m.fiyat?.toFixed(2)+' '+m.doviz+'</span></div>';}).join('')
    + '</div><div style="padding:8px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right"><button class="btn" onclick="document.getElementById(\'mo-price-hist\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

// ════════════════════════════════════════════════════════════════
// FIX 3 — TESLİM ŞEKLİ → OTOMATİK ALT GÖREV
// ════════════════════════════════════════════════════════════════
window._checkIncotermsGorev = function(teklifId) {
  var d = typeof loadSatisTeklifleri==='function'?loadSatisTeklifleri():[];
  var t = d.find(function(x){return x.id===teklifId;});
  if (!t) return;
  var tasks = typeof loadTasks==='function'?loadTasks():[];
  var teslim = t.teslimSekli||'';
  var jobId = t.jobId||t.teklifNo;
  // Mükerrer kontrol
  var exists = tasks.some(function(tk){return tk.title && tk.title.indexOf(t.teklifNo)!==-1 && !tk.done;});
  if (exists) return;
  var now = new Date().toISOString();
  var deadline = t.gecerlilikTarihi || new Date(Date.now()+14*86400000).toISOString().slice(0,10);
  var cu = window.Auth?.getCU?.();
  if (teslim==='CFR'||teslim==='CIF'||teslim==='CIP') {
    tasks.push({id:typeof generateNumericId==='function'?generateNumericId():Date.now(),title:'Forwarder\'dan navlun fiyatı iste — '+t.teklifNo,jobId:jobId,pri:2,due:deadline,uid:cu?.id,status:'todo',done:false,createdAt:now,createdBy:cu?.id,source:'incoterms'});
    window.addNotif?.('📋','Yeni görev: Navlun fiyatı iste — '+t.teklifNo,'info','pusula-pro',cu?.id);
  }
  if (teslim==='CIF'||teslim==='CIP') {
    tasks.push({id:(typeof generateNumericId==='function'?generateNumericId():Date.now())+1,title:'Sigortacıdan fiyat iste — '+t.teklifNo,jobId:jobId,pri:2,due:deadline,uid:cu?.id,status:'todo',done:false,createdAt:now,createdBy:cu?.id,source:'incoterms'});
    window.addNotif?.('📋','Yeni görev: Sigorta fiyatı iste — '+t.teklifNo,'info','pusula-pro',cu?.id);
  }
  if (typeof saveTasks==='function') saveTasks(tasks);
};

// ════════════════════════════════════════════════════════════════
// FIX 4 — SİSTEM AYARLARI PANELİ
// ════════════════════════════════════════════════════════════════
window.openSistemBilgileri = function() {
  if (!window.isAdmin?.()) { window.toast?.('Admin yetkisi gerekli','err'); return; }
  var esc = typeof escapeHtml==='function'?escapeHtml:function(s){return s;};
  // Depolama hesapla
  var totalLS = 0;
  try { for (var k in localStorage) { if (localStorage.hasOwnProperty(k)) totalLS += (localStorage[k]||'').length; } } catch(e){}
  var lsMB = (totalLS / 1024 / 1024).toFixed(2);
  // Koleksiyon sayıları
  var kolSayilari = [
    {ad:'users',sayi:(typeof loadUsers==='function'?loadUsers():[]).length},
    {ad:'tasks',sayi:(typeof loadTasks==='function'?loadTasks():[]).length},
    {ad:'odemeler',sayi:(typeof loadOdm==='function'?loadOdm():[]).length},
    {ad:'tahsilat',sayi:(typeof loadTahsilat==='function'?loadTahsilat():[]).length},
    {ad:'satinalma',sayi:(typeof loadSatinalma==='function'?loadSatinalma():[]).length},
    {ad:'cari',sayi:(typeof loadCari==='function'?loadCari():[]).length},
    {ad:'urunler',sayi:(typeof loadUrunler==='function'?loadUrunler():[]).length},
    {ad:'kargo',sayi:(typeof loadKargo==='function'?loadKargo():[]).length},
    {ad:'konteyner',sayi:(typeof loadKonteyn==='function'?loadKonteyn():[]).length},
  ];
  var toplamKayit = kolSayilari.reduce(function(s,k){return s+k.sayi;},0);
  var ex = document.getElementById('mo-sistem'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className='mo'; mo.id='mo-sistem';
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">Sistem Bilgileri</div>'
    + '<div style="padding:16px 20px;max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px">'
    // A: Veri Tabanı
    + '<div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Veri Tabanı</div>'
    + '<div style="font-size:12px;color:var(--t)">Firebase: '+(window.Auth?.getFBDB?.()?'<span style="color:#16A34A">Bağlı</span>':'<span style="color:#DC2626">Bağlı değil</span>')+'</div>'
    + '<div style="font-size:12px;color:var(--t)">Toplam Kayıt: <b>'+toplamKayit+'</b></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">'+kolSayilari.map(function(k){return '<span style="font-size:10px;padding:2px 6px;background:var(--s2);border-radius:4px">'+k.ad+': '+k.sayi+'</span>';}).join('')+'</div></div>'
    // B: Depolama
    + '<div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Depolama Durumu</div>'
    + '<div style="font-size:12px">localStorage: <b>'+lsMB+' MB</b> / ~5 MB</div>'
    + '<div style="height:4px;background:var(--s2);border-radius:2px;margin:4px 0;overflow:hidden"><div style="height:100%;width:'+Math.min(100,parseFloat(lsMB)/5*100)+'%;background:'+(parseFloat(lsMB)>4?'#DC2626':parseFloat(lsMB)>2.5?'#D97706':'#16A34A')+'"></div></div>'
    + '<div style="display:flex;gap:8px;margin-top:6px;font-size:11px">'
    + '<div style="padding:4px 8px;background:#16A34A11;border-radius:4px;color:#16A34A">Firestore: ✅ İyi</div>'
    + '<div style="padding:4px 8px;background:#D9770611;border-radius:4px;color:#D97706">Görseller: ⚠️ Vasat</div>'
    + '<div style="padding:4px 8px;background:#DC262611;border-radius:4px;color:#DC2626">Yedekleme: ❌ Zayıf</div></div></div>'
    // C: Yedekleme
    + '<div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Yedekleme</div>'
    + '<div style="display:flex;gap:6px"><button onclick="window._exportAllData()" style="padding:5px 12px;border:0.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);font-size:11px;cursor:pointer;font-family:inherit">Tüm Veriyi İndir (JSON)</button></div>'
    + '<div style="margin-top:6px;font-size:10px;color:var(--t3);padding:6px;background:var(--s2);border-radius:4px">Öneri: Firebase Blaze planına geçerek otomatik yedek aktif edin.</div></div>'
    // D: Google Drive
    + '<div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Google Drive</div>'
    + (function(){var st=typeof window.GDrive==='object'?window.GDrive.status():{enabled:false,ready:false};
      return '<div style="font-size:12px;color:var(--t)">Durum: '+(st.ready?'<span style="color:#16A34A">Bağlı</span>':st.enabled?'<span style="color:#D97706">Yapılandırılmış (bağlantı bekliyor)</span>':'<span style="color:var(--t3)">Devre dışı</span>')+'</div>'
        +'<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">'
        +'<button onclick="window._openGDriveSettings?.()" style="padding:5px 12px;border:0.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);font-size:11px;cursor:pointer;font-family:inherit">'+(st.enabled?'Ayarları Düzenle':'Drive\'a Bağlan')+'</button>'
        +(st.ready?'<button onclick="window.GDrive?.migrateBase64?.()" style="padding:5px 12px;border:0.5px solid #D97706;border-radius:6px;background:none;color:#D97706;font-size:11px;cursor:pointer;font-family:inherit">Base64 → Drive Taşı</button>':'')
        +'</div>';
    }())
    + '</div>'
    // E: Güncelleme Geçmişi
    + '<div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Son Güncellemeler</div>'
    + '<div style="font-size:10px;color:var(--t2);max-height:120px;overflow-y:auto">'
    + ['Dashboard kontrol merkezi — 9 bölüm','İhracat ekosistemi — IMO+7gün+JobID','Inline Excel form — satış+alış','3 format PDF — A/B/C','Satış teklifi — PI+PR+revizyon','Demo veri — 20 ürün+5 müşteri','Topbar profesyonel SVG ikonlar','Nakit akışı B tasarımı','Cari 3 aşamalı sistem+VKN','Firestore merge stratejisi'].map(function(g,i){return '<div style="padding:3px 0;border-bottom:0.5px solid var(--b)">'+g+'</div>';}).join('')
    + '</div></div>'
    + '</div><div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right"><button class="btn" onclick="document.getElementById(\'mo-sistem\')?.remove()">Kapat</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click',function(e){if(e.target===mo)mo.remove();});
  setTimeout(function(){mo.classList.add('open');},10);
};

/** Google Drive ayarları modalı */
window._openGDriveSettings = function() {
  var ex = document.getElementById('mo-gdrive'); if (ex) ex.remove();
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ak_gdrive_config') || '{}'); } catch(e) {}
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-gdrive'; mo.style.zIndex = '2300';
  mo.innerHTML = '<div class="moc" style="max-width:420px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">Google Drive Ayarları</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer"><input type="checkbox" id="gd-enabled" ' + (cfg.enabled ? 'checked' : '') + ' style="accent-color:var(--ac)"> Drive entegrasyonunu etkinleştir</label>'
    + '<div><div class="fl" style="font-size:10px">Google API Key</div><input class="fi" id="gd-apikey" value="' + (cfg.apiKey || '') + '" placeholder="AIzaSy..." style="font-size:11px"></div>'
    + '<div><div class="fl" style="font-size:10px">OAuth Client ID</div><input class="fi" id="gd-clientid" value="' + (cfg.clientId || '') + '" placeholder="xxx.apps.googleusercontent.com" style="font-size:11px"></div>'
    + '<div style="font-size:10px;color:var(--t3);padding:8px;background:var(--s2);border-radius:6px">Google Cloud Console\'dan Drive API etkinleştirin ve OAuth 2.0 Client ID oluşturun.</div>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:6px">'
    + '<button class="btn" onclick="document.getElementById(\'mo-gdrive\')?.remove()">İptal</button>'
    + '<button class="btn btnp" onclick="window._saveGDriveSettings()">Kaydet</button></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};
window._saveGDriveSettings = function() {
  var cfg = {
    enabled: document.getElementById('gd-enabled')?.checked || false,
    apiKey: (document.getElementById('gd-apikey')?.value || '').trim(),
    clientId: (document.getElementById('gd-clientid')?.value || '').trim(),
  };
  if (typeof window.GDrive?.updateSettings === 'function') window.GDrive.updateSettings(cfg);
  else localStorage.setItem('ak_gdrive_config', JSON.stringify(cfg));
  document.getElementById('mo-gdrive')?.remove();
  window.toast?.('Drive ayarları kaydedildi' + (cfg.enabled ? ' — bağlanıyor...' : ''), 'ok');
};

/** Tüm veriyi JSON export */
window._exportAllData = function() {
  var data = {};
  var keys = ['ak_u3','ak_tk2','ak_odm1','ak_tahsilat1','ak_satinalma1','ak_cari1','ak_urunler1','ak_alis_teklif1','ak_satis_teklif1','ak_krg1','ak_konteyn1','ak_bankalar1','ak_navlun1','ak_notif1','ak_act1'];
  keys.forEach(function(k) { try { data[k] = JSON.parse(localStorage.getItem(k)||'[]'); } catch(e) { data[k] = []; } });
  var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'duay-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); URL.revokeObjectURL(url);
  window.toast?.('Yedek indirildi ✓','ok');
};

// ════════════════════════════════════════════════════════════════
// ANLIK FİKİR PAYLAŞIMI
// ════════════════════════════════════════════════════════════════

window._openFikirForm = function() {
  var ex = document.getElementById('fikir-popup'); if (ex) { ex.remove(); return; }
  var div = document.createElement('div');
  div.id = 'fikir-popup';
  div.style.cssText = 'position:fixed;bottom:80px;right:24px;width:300px;background:var(--sf);border:0.5px solid var(--b);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:9001;overflow:hidden';
  div.innerHTML = '<div style="padding:12px 16px;background:#1a365d;color:#fff;display:flex;align-items:center;justify-content:space-between">'
    + '<span style="font-size:13px;font-weight:600">Fikir & Iddia</span>'
    + '<button onclick="document.getElementById(\'fikir-popup\')?.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px">×</button></div>'
    + '<div style="display:flex;border-bottom:0.5px solid var(--b)">'
      + '<div class="fikir-sec-tab on" onclick="window._fikirSecTab(\'fikir\',this)" style="flex:1;padding:8px;text-align:center;font-size:11px;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);font-weight:600">Fikirler</div>'
      + '<div class="fikir-sec-tab" onclick="window._fikirSecTab(\'iddia\',this)" style="flex:1;padding:8px;text-align:center;font-size:11px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Iddia</div>'
      + '<div class="fikir-sec-tab" onclick="window._fikirSecTab(\'sozler\',this)" style="flex:1;padding:8px;text-align:center;font-size:11px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t3)">Sozler</div>'
    + '</div>'
    + '<div id="fikir-tab-content">'
    + '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">'
    + '<input class="fi" id="fikir-baslik" placeholder="Başlık (opsiyonel)" style="font-size:12px;border-radius:7px">'
    + '<textarea class="fi" id="fikir-mesaj" rows="3" maxlength="280" placeholder="Fikrinizi paylaşın... (max 280 karakter)" style="font-size:12px;resize:none;border-radius:7px"></textarea>'
    + '<div style="display:flex;gap:4px">'
    + '<button class="fikir-kat" onclick="window._setFikirKat(this,\'fikir\')" data-kat="fikir" style="padding:3px 8px;border:0.5px solid var(--ac);border-radius:5px;background:var(--ac);color:#fff;font-size:10px;cursor:pointer;font-family:inherit">Fikir</button>'
    + '<button class="fikir-kat" onclick="window._setFikirKat(this,\'sorun\')" data-kat="sorun" style="padding:3px 8px;border:0.5px solid #DC2626;border-radius:5px;background:none;color:#DC2626;font-size:10px;cursor:pointer;font-family:inherit">Sorun</button>'
    + '<button class="fikir-kat" onclick="window._setFikirKat(this,\'oneri\')" data-kat="oneri" style="padding:3px 8px;border:0.5px solid #D97706;border-radius:5px;background:none;color:#D97706;font-size:10px;cursor:pointer;font-family:inherit">Öneri</button>'
    + '<button class="fikir-kat" onclick="window._setFikirKat(this,\'motivasyon\')" data-kat="motivasyon" style="padding:3px 8px;border:0.5px solid #16A34A;border-radius:5px;background:none;color:#16A34A;font-size:10px;cursor:pointer;font-family:inherit">Motivasyon</button>'
    + '</div>'
    + '<input type="hidden" id="fikir-kat-val" value="fikir">'
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + '<span id="fikir-char" style="font-size:10px;color:var(--t3)">0/280</span>'
    + '<button onclick="window._paylasFikir()" style="padding:6px 16px;border:none;border-radius:7px;background:#1a365d;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Paylaş</button>'
    + '</div></div></div>'; // fikir-tab-content close
  document.body.appendChild(div);
  document.getElementById('fikir-mesaj')?.addEventListener('input', function() {
    var el = document.getElementById('fikir-char');
    if (el) el.textContent = this.value.length + '/280';
  });
  document.getElementById('fikir-mesaj')?.focus();
};

/** Fikir/İddia sekme geçişi */
window._fikirSecTab = function(tab, el) {
  document.querySelectorAll('.fikir-sec-tab').forEach(function(t) { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--t3)'; t.style.fontWeight = '400'; t.classList.remove('on'); });
  if (el) { el.style.borderBottomColor = 'var(--ac)'; el.style.color = 'var(--ac)'; el.style.fontWeight = '600'; el.classList.add('on'); }
  var cont = document.getElementById('fikir-tab-content');
  if (!cont) return;
  if (tab === 'iddia') {
    cont.innerHTML = '<div style="padding:14px 16px">'
      + '<div style="display:flex;gap:6px;margin-bottom:10px">'
        + '<button onclick="window._openIddiaModal?.(\'oz\')" style="flex:1;padding:8px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">+ Oz Iddia</button>'
        + '<button onclick="window._openIddiaModal?.(\'challenge\')" style="flex:1;padding:8px;border:none;border-radius:7px;background:#D97706;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Challenge</button>'
      + '</div>'
      + '<div id="fikir-iddia-mini"></div>'
    + '</div>';
    // Mini iddia listesi render
    setTimeout(function() {
      var miniCont = document.getElementById('fikir-iddia-mini');
      if (!miniCont) return;
      var all = typeof loadIddialar === 'function' ? loadIddialar() : [];
      var aktif = all.filter(function(i) { return !i.isDeleted && (i.status === 'aktif' || i.status === 'accepted' || i.status === 'pending' || i.status === 'challenge_pending'); }).slice(0, 5);
      if (!aktif.length) { miniCont.innerHTML = '<div style="text-align:center;padding:12px;color:var(--t3);font-size:11px">Aktif iddia yok</div>'; return; }
      miniCont.innerHTML = aktif.map(function(i) {
        var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
        return '<div style="padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px">'
          + '<div style="font-weight:500;color:var(--t)">' + (i.tip === 'challenge' ? '⚔️ ' : '🎯 ') + esc(i.baslik) + '</div>'
          + '<div style="font-size:9px;color:var(--t3);margin-top:2px">' + i.status + ' · ' + (i.deadline || '—') + '</div>'
        + '</div>';
      }).join('');
      miniCont.innerHTML += '<div style="margin-top:8px;text-align:center"><button onclick="App.nav(\'iddia\')" style="font-size:10px;color:var(--ac);background:none;border:none;cursor:pointer;font-family:inherit">Tumunu Gor →</button></div>';
    }, 50);
  } else if (tab === 'sozler') {
    window._fikirSozTab?.();
  } else {
    // Fikir formunu geri yükle
    document.getElementById('fikir-popup')?.remove();
    window._openFikirForm?.();
  }
};

window._fikirKat = 'fikir';
window._setFikirKat = function(btn, kat) {
  window._fikirKat = kat;
  document.getElementById('fikir-kat-val').value = kat;
  document.querySelectorAll('.fikir-kat').forEach(function(b) {
    var k = b.dataset.kat;
    var colors = {fikir:'var(--ac)',sorun:'#DC2626',oneri:'#D97706',motivasyon:'#16A34A'};
    b.style.background = k === kat ? colors[k] : 'none';
    b.style.color = k === kat ? '#fff' : colors[k];
  });
};

window._paylasFikir = function() {
  var mesaj = (document.getElementById('fikir-mesaj')?.value || '').trim();
  if (!mesaj) { window.toast?.('Mesaj zorunlu', 'err'); return; }
  var cu = window.Auth?.getCU?.();
  var d = typeof loadFikirler === 'function' ? loadFikirler() : [];
  var kat = document.getElementById('fikir-kat-val')?.value || 'fikir';
  var entry = {
    id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(),
    baslik: (document.getElementById('fikir-baslik')?.value || '').trim(),
    mesaj: mesaj, kategori: kat,
    uid: cu?.id, uname: cu?.name || '',
    ts: new Date().toISOString(), yorumlar: []
  };
  d.unshift(entry);
  if (d.length > 50) d = d.slice(0, 50);
  if (typeof storeFikirler === 'function') storeFikirler(d);
  document.getElementById('fikir-popup')?.remove();
  // Tüm kullanıcılara bildirim
  var katIcons = {fikir:'💡',sorun:'⚠️',oneri:'📝',motivasyon:'🌟'};
  var katLabels = {fikir:'Fikir',sorun:'Sorun',oneri:'Öneri',motivasyon:'Motivasyon'};
  window.addNotif?.(katIcons[kat]||'💡', (cu?.name||'') + ': ' + mesaj.slice(0, 60) + (mesaj.length>60?'...':''), 'info', 'fikirler');
  window.toast?.('Fikir paylaşıldı ✓', 'ok');
};

/** Fikirler realtime güncelleme callback */
window._onFikirUpdate = function() {
  // Yeni fikir gelince toast göster
  var d = typeof loadFikirler === 'function' ? loadFikirler() : [];
  if (d.length && d[0].uid !== window.Auth?.getCU?.()?.id) {
    var son = d[0];
    var katIcons = {fikir:'💡',sorun:'⚠️',oneri:'📝',motivasyon:'🌟'};
    window.toast?.((katIcons[son.kategori]||'💡') + ' ' + (son.uname||'') + ': ' + (son.mesaj||'').slice(0,40), 'info');
  }
};

/** Fikirler paneli */
window.openFikirlerPanel = function() {
  var d = typeof loadFikirler === 'function' ? loadFikirler() : [];
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var katColors = {fikir:'var(--ac)',sorun:'#DC2626',oneri:'#D97706',motivasyon:'#16A34A'};
  var katIcons = {fikir:'💡',sorun:'⚠️',oneri:'📝',motivasyon:'🌟'};
  var ex = document.getElementById('mo-fikirler'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-fikirler';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:700">Fikir & Öneriler</div><button onclick="document.getElementById(\'mo-fikirler\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="max-height:60vh;overflow-y:auto;padding:12px 20px">'
    + (d.length ? d.slice(0, 20).map(function(f) {
        var c = katColors[f.kategori] || 'var(--t3)';
        return '<div style="padding:10px;border-left:3px solid '+c+';background:var(--s2);border-radius:0 8px 8px 0;margin-bottom:8px">'
          + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;font-weight:600;color:var(--t)">'+(katIcons[f.kategori]||'')+' '+esc(f.uname||'')+'</span><span style="font-size:9px;color:var(--t3)">'+(f.ts||'').slice(0,16)+'</span></div>'
          + (f.baslik ? '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:2px">'+esc(f.baslik)+'</div>' : '')
          + '<div style="font-size:11px;color:var(--t2)">'+esc(f.mesaj||'')+'</div>'
          + '</div>';
      }).join('') : '<div style="padding:24px;text-align:center;color:var(--t3)">Henüz fikir yok — ilk siz paylaşın!</div>')
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

console.log('[app_patch] Tüm sistemler aktif');

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
      + '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
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

// ════════════════════════════════════════════════════════════════
// TEDARİKÇİ PERFORMANS RAPORU
// ════════════════════════════════════════════════════════════════

/**
 * Tedarikçi performans verisi oluşturur.
 * @param {string} [from] Başlangıç tarihi
 * @param {string} [to]   Bitiş tarihi
 * @returns {Array<Object>} Tedarikçi performans dizisi
 */
window._buildTedarikciPerformans = function(from, to) {
  var alis = typeof loadAlisTeklifleri === 'function' ? loadAlisTeklifleri() : [];
  var sa = typeof loadSatinalma === 'function' ? loadSatinalma() : [];
  var kargo = typeof loadKargo === 'function' ? loadKargo() : [];
  // Tarih filtresi
  if (from) { alis = alis.filter(function(a) { return (a.ts || '').slice(0, 10) >= from; }); sa = sa.filter(function(s) { return (s.piDate || s.ts || '').slice(0, 10) >= from; }); }
  if (to) { alis = alis.filter(function(a) { return (a.ts || '').slice(0, 10) <= to; }); sa = sa.filter(function(s) { return (s.piDate || s.ts || '').slice(0, 10) <= to; }); }
  // Tedarikçi bazlı gruplama
  var tedMap = {};
  alis.forEach(function(a) {
    var key = a.tedarikci || '—';
    if (!tedMap[key]) tedMap[key] = { ad: key, alisToplam: 0, alisSayisi: 0, urunMap: {}, sonTeklifler: [], fiyatlar: [], teslimatGunleri: [], zamaninda: 0, gecikmi: 0, iptal: 0 };
    var t = tedMap[key];
    t.alisToplam += parseFloat(a.toplamTutar) || 0;
    t.alisSayisi++;
    t.sonTeklifler.push({ no: a.teklifNo, tarih: (a.ts || '').slice(0, 10), tutar: a.toplamTutar || 0, doviz: a.paraBirimi || 'USD' });
    // Ürün top 5
    (a.satirlar || []).forEach(function(s) {
      var uKey = s.urunKodu || s.standartAdi || 'Bilinmeyen';
      if (!t.urunMap[uKey]) t.urunMap[uKey] = { ad: uKey, miktar: 0, tutar: 0 };
      t.urunMap[uKey].miktar += parseFloat(s.miktar) || 0;
      t.urunMap[uKey].tutar += parseFloat(s.toplamFiyat) || 0;
    });
    // Fiyat tutarlılığı
    if (a.birimFiyat) t.fiyatlar.push(parseFloat(a.birimFiyat) || 0);
  });
  // Satınalma verileri ile zenginleştir
  sa.forEach(function(s) {
    var key = s.supplier || '—';
    if (!tedMap[key]) tedMap[key] = { ad: key, alisToplam: 0, alisSayisi: 0, urunMap: {}, sonTeklifler: [], fiyatlar: [], teslimatGunleri: [], zamaninda: 0, gecikmi: 0, iptal: 0 };
    var t = tedMap[key];
    t.alisToplam += parseFloat(s.totalAmount) || 0;
    // Teslimat süresi hesapla
    if (s.piDate && s.deliveryDate) {
      var gun = Math.ceil((new Date(s.deliveryDate) - new Date(s.piDate)) / 86400000);
      if (gun > 0) t.teslimatGunleri.push(gun);
    }
    // Teslim durumu
    if (s.status === 'paid' || s.status === 'approved') {
      // Kargo teslimat kontrolü
      var kargoKayit = kargo.find(function(k) { return k.purchaseId === s.id; });
      if (kargoKayit && kargoKayit.eta && s.deliveryDate) {
        var fark = Math.ceil((new Date(kargoKayit.eta) - new Date(s.deliveryDate)) / 86400000);
        if (fark <= 3) t.zamaninda++; else t.gecikmi++;
      } else {
        t.zamaninda++; // Varsayılan: zamanında
      }
    }
    if (s.status === 'cancelled' || s.status === 'rejected') t.iptal++;
  });
  // Skorlama ve top5
  var result = Object.values(tedMap).map(function(t) {
    // Ort teslimat süresi
    var ortTeslimat = t.teslimatGunleri.length ? Math.round(t.teslimatGunleri.reduce(function(a, b) { return a + b; }, 0) / t.teslimatGunleri.length) : 0;
    // Zamanında oran
    var toplamTeslimat = t.zamaninda + t.gecikmi;
    var zamanindaOran = toplamTeslimat > 0 ? Math.round(t.zamaninda / toplamTeslimat * 100) : 100;
    // Fiyat tutarlılığı (standart sapma / ortalama * 100)
    var fiyatDegisim = 0;
    if (t.fiyatlar.length >= 2) {
      var ort = t.fiyatlar.reduce(function(a, b) { return a + b; }, 0) / t.fiyatlar.length;
      var stdDev = Math.sqrt(t.fiyatlar.reduce(function(a, v) { return a + Math.pow(v - ort, 2); }, 0) / t.fiyatlar.length);
      fiyatDegisim = ort > 0 ? Math.round(stdDev / ort * 100) : 0;
    }
    // Top 5 ürün
    var top5Urun = Object.values(t.urunMap).sort(function(a, b) { return b.tutar - a.tutar; }).slice(0, 5);
    // Son 3 teklif
    var son3 = t.sonTeklifler.sort(function(a, b) { return (b.tarih || '').localeCompare(a.tarih || ''); }).slice(0, 3);
    // Risk skoru: 0-100 (düşük = iyi)
    var riskSkor = 0;
    riskSkor += Math.max(0, 100 - zamanindaOran); // Gecikme
    riskSkor += Math.min(30, fiyatDegisim); // Fiyat artışı
    riskSkor += t.iptal * 15; // İptal
    riskSkor = Math.min(100, Math.round(riskSkor));

    return {
      ad: t.ad, alisToplam: t.alisToplam, alisSayisi: t.alisSayisi,
      ortTeslimat: ortTeslimat, zamanindaOran: zamanindaOran,
      fiyatDegisim: fiyatDegisim, top5Urun: top5Urun, son3: son3,
      riskSkor: riskSkor, iptal: t.iptal, gecikmi: t.gecikmi
    };
  });
  result.sort(function(a, b) { return a.riskSkor - b.riskSkor; }); // En düşük risk en üstte
  return result;
};

/** @description Tedarikçi performans raporu modalı */
window._openTedarikciPerformans = function() {
  document.getElementById('mo-reports')?.remove();
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var ex = document.getElementById('mo-ted-perf'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-ted-perf'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:720px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:15px;font-weight:700;color:var(--t)">Tedarikçi Performans Raporu</div><button onclick="document.getElementById(\'mo-ted-perf\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    // Filtre
    + '<div style="padding:10px 20px;background:var(--s2);border-bottom:0.5px solid var(--b);display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<input type="date" class="fi" id="ted-from" style="font-size:11px;width:130px">'
    + '<span style="font-size:10px;color:var(--t3)">—</span>'
    + '<input type="date" class="fi" id="ted-to" style="font-size:11px;width:130px">'
    + '<button onclick="window._renderTedPerf()" style="padding:5px 12px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Filtrele</button>'
    + '<button onclick="window._exportTedPerfXlsx()" style="padding:5px 12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button>'
    + '<button onclick="window._printTedPerf()" style="padding:5px 12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">PDF</button>'
    + '</div>'
    + '<div id="ted-perf-content" style="padding:16px 20px;max-height:55vh;overflow-y:auto"></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); window._renderTedPerf(); }, 10);
};

/** @description Tedarikçi performans listesini render et */
window._renderTedPerf = function() {
  var cont = document.getElementById('ted-perf-content'); if (!cont) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var from = document.getElementById('ted-from')?.value || '';
  var to = document.getElementById('ted-to')?.value || '';
  var data = window._buildTedarikciPerformans(from, to);
  if (!data.length) { cont.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3)">Tedarikçi verisi bulunamadı</div>'; return; }
  // En iyi / en kötü vurgusu
  var enIyi = data[0]; var enKotu = data[data.length - 1];
  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<div style="padding:10px;background:#16A34A11;border:0.5px solid #16A34A44;border-radius:8px"><div style="font-size:9px;color:#16A34A;text-transform:uppercase;font-weight:700">En iyi tedarikçi</div><div style="font-size:13px;font-weight:700;color:#16A34A;margin-top:2px">' + esc(enIyi.ad) + '</div><div style="font-size:10px;color:var(--t3)">Risk: ' + enIyi.riskSkor + '/100 · Zamanında: %' + enIyi.zamanindaOran + '</div></div>'
    + '<div style="padding:10px;background:#DC262611;border:0.5px solid #DC262644;border-radius:8px"><div style="font-size:9px;color:#DC2626;text-transform:uppercase;font-weight:700">En riskli tedarikçi</div><div style="font-size:13px;font-weight:700;color:#DC2626;margin-top:2px">' + esc(enKotu.ad) + '</div><div style="font-size:10px;color:var(--t3)">Risk: ' + enKotu.riskSkor + '/100 · Gecikme: ' + enKotu.gecikmi + '</div></div></div>';
  // Tedarikçi kartları
  data.forEach(function(t) {
    var riskColor = t.riskSkor <= 20 ? '#16A34A' : t.riskSkor <= 50 ? '#D97706' : '#DC2626';
    var riskBg = t.riskSkor <= 20 ? '#16A34A11' : t.riskSkor <= 50 ? '#D9770611' : '#DC262611';
    html += '<div style="border:0.5px solid var(--b);border-radius:8px;margin-bottom:8px;overflow:hidden">'
      + '<div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">'
      + '<div style="font-size:12px;font-weight:700;color:var(--t)">' + esc(t.ad) + '</div>'
      + '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + riskBg + ';color:' + riskColor + ';font-weight:700">Risk: ' + t.riskSkor + '/100</span></div>'
      + '<div style="padding:10px 14px">'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Toplam Alış</div><div style="font-size:13px;font-weight:700;color:var(--ac)">$' + Math.round(t.alisToplam).toLocaleString('tr-TR') + '</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Ort. Teslimat</div><div style="font-size:13px;font-weight:700">' + (t.ortTeslimat || '—') + ' gün</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Zamanında</div><div style="font-size:13px;font-weight:700;color:' + (t.zamanindaOran >= 80 ? '#16A34A' : '#DC2626') + '">%' + t.zamanindaOran + '</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Fiyat Sapma</div><div style="font-size:13px;font-weight:700;color:' + (t.fiyatDegisim <= 10 ? '#16A34A' : '#D97706') + '">%' + t.fiyatDegisim + '</div></div></div>';
    // Top 5 ürün
    if (t.top5Urun.length) {
      html += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">En çok alınan</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">';
      t.top5Urun.forEach(function(u) {
        html += '<span style="font-size:9px;padding:2px 6px;background:var(--al);color:var(--ac);border-radius:3px">' + esc(u.ad) + ' (' + u.miktar + ')</span>';
      });
      html += '</div>';
    }
    // Son 3 teklif
    if (t.son3.length) {
      html += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">Son teklifler</div>';
      t.son3.forEach(function(s) {
        html += '<div style="font-size:10px;color:var(--t2);padding:1px 0">' + esc(s.no || '') + ' · ' + s.tarih + ' · $' + Math.round(s.tutar).toLocaleString('tr-TR') + '</div>';
      });
    }
    html += '</div></div>';
  });
  cont.innerHTML = html;
};

/** @description Tedarikçi performans Excel export */
window._exportTedPerfXlsx = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var from = document.getElementById('ted-from')?.value || '';
  var to = document.getElementById('ted-to')?.value || '';
  var data = window._buildTedarikciPerformans(from, to);
  var rows = [['Tedarikçi', 'Toplam Alış ($)', 'Alış Sayısı', 'Ort. Teslimat (gün)', 'Zamanında %', 'Fiyat Sapma %', 'İptal', 'Gecikme', 'Risk Skoru', 'Top 5 Ürün']];
  data.forEach(function(t) {
    rows.push([t.ad, Math.round(t.alisToplam), t.alisSayisi, t.ortTeslimat, t.zamanindaOran, t.fiyatDegisim, t.iptal, t.gecikmi, t.riskSkor, t.top5Urun.map(function(u) { return u.ad; }).join(', ')]);
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Tedarikçi Performans');
  XLSX.writeFile(wb, 'tedarikci-performans-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Tedarikçi performans raporu indirildi ✓', 'ok');
};

/** @description Tedarikçi performans PDF (yazdır) */
window._printTedPerf = function() {
  var from = document.getElementById('ted-from')?.value || '';
  var to = document.getElementById('ted-to')?.value || '';
  var data = window._buildTedarikciPerformans(from, to);
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Tedarikçi Performans</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px;max-width:800px;margin:0 auto}h1{text-align:center;color:#1a365d;font-size:16px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#1a365d;color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #ddd;font-size:10px}.good{color:#16A34A;font-weight:700}.bad{color:#DC2626;font-weight:700}@media print{button{display:none!important}}</style></head><body>'
    + '<h1>TEDARİKÇİ PERFORMANS RAPORU</h1><div style="text-align:center;color:#666;font-size:10px;margin-bottom:12px">DUAY GLOBAL TRADE' + (from || to ? ' · ' + (from || '...') + ' — ' + (to || '...') : '') + ' · ' + new Date().toISOString().slice(0, 10) + '</div>'
    + '<table><thead><tr><th>Tedarikçi</th><th>Toplam ($)</th><th>Sayı</th><th>Ort. Teslimat</th><th>Zamanında %</th><th>Fiyat Sapma %</th><th>Risk</th></tr></thead><tbody>'
    + data.map(function(t) {
        var cls = t.riskSkor <= 20 ? 'good' : t.riskSkor > 50 ? 'bad' : '';
        return '<tr><td><b>' + esc(t.ad) + '</b></td><td style="text-align:right">$' + Math.round(t.alisToplam).toLocaleString('tr-TR') + '</td><td style="text-align:center">' + t.alisSayisi + '</td><td style="text-align:center">' + (t.ortTeslimat || '—') + ' gün</td><td style="text-align:center" class="' + (t.zamanindaOran >= 80 ? 'good' : 'bad') + '">%' + t.zamanindaOran + '</td><td style="text-align:center">%' + t.fiyatDegisim + '</td><td style="text-align:center" class="' + cls + '">' + t.riskSkor + '</td></tr>';
      }).join('')
    + '</tbody></table>'
    + '<button onclick="window.print()" style="margin-top:12px;padding:6px 16px;cursor:pointer">Yazdır</button></body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// MÜŞTERİ ANALİZİ RAPORU
// ════════════════════════════════════════════════════════════════

/**
 * Müşteri analiz verisi oluşturur.
 * @param {string} [from] Başlangıç tarihi
 * @param {string} [to]   Bitiş tarihi
 * @returns {Array<Object>} Müşteri analiz dizisi
 */
window._buildMusteriAnalizi = function(from, to) {
  var satisTek = typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : [];
  var odm = typeof loadOdm === 'function' ? loadOdm().filter(function(o) { return !o.isDeleted; }) : [];
  var tah = typeof loadTahsilat === 'function' ? loadTahsilat().filter(function(t) { return !t.isDeleted; }) : [];
  // Tarih filtresi
  if (from) { satisTek = satisTek.filter(function(s) { return (s.ts || '').slice(0, 10) >= from; }); }
  if (to) { satisTek = satisTek.filter(function(s) { return (s.ts || '').slice(0, 10) <= to; }); }
  // Müşteri bazlı gruplama
  var mustMap = {};
  satisTek.forEach(function(st) {
    var key = st.musteri || '—';
    if (!mustMap[key]) mustMap[key] = { ad: key, satisToplam: 0, karToplam: 0, teklifSayisi: 0, kabul: 0, red: 0, urunMap: {}, sonTeklifler: [], marjlar: [] };
    var m = mustMap[key];
    m.satisToplam += parseFloat(st.genelToplam) || 0;
    m.karToplam += parseFloat(st.tahminKar) || 0;
    m.teklifSayisi++;
    if (st.durum === 'kabul') m.kabul++;
    if (st.durum === 'red') m.red++;
    m.sonTeklifler.push({ no: st.teklifNo, tarih: (st.ts || '').slice(0, 10), tutar: st.genelToplam || 0, doviz: st.paraBirimi || 'USD', durum: st.durum || 'taslak' });
    // Ürünler
    (st.urunler || []).forEach(function(u) {
      var uKey = u.urunAdi || 'Bilinmeyen';
      if (!m.urunMap[uKey]) m.urunMap[uKey] = { ad: uKey, miktar: 0, tutar: 0 };
      m.urunMap[uKey].miktar += parseFloat(u.miktar) || 0;
      m.urunMap[uKey].tutar += (parseFloat(u.satisFiyat) || 0) * (parseFloat(u.miktar) || 0);
    });
    // Marj hesapla
    if (st.genelToplam && st.tahminKar) {
      m.marjlar.push(Math.round((st.tahminKar / st.genelToplam) * 100));
    }
  });
  // Ödeme/tahsilat verileri ile zenginleştir
  Object.keys(mustMap).forEach(function(key) {
    var m = mustMap[key];
    // Müşteriye ait tahsilatlar
    var mustTah = tah.filter(function(t) { return t.cariName === key; });
    var mustOdm = odm.filter(function(o) { return o.cariName === key; });
    // Ortalama ödeme süresi
    var odemeSureleri = [];
    mustTah.forEach(function(t) {
      if (t.collected && t.collectedAt && t.due) {
        var gun = Math.ceil((new Date(t.collectedAt) - new Date(t.due)) / 86400000);
        odemeSureleri.push(gun);
      }
    });
    m.ortOdemeSuresi = odemeSureleri.length ? Math.round(odemeSureleri.reduce(function(a, b) { return a + b; }, 0) / odemeSureleri.length) : 0;
    // Gecikmiş ödeme geçmişi
    var today = new Date().toISOString().slice(0, 10);
    m.gecikmisSayisi = mustOdm.filter(function(o) { return !o.paid && o.due && o.due < today; }).length
      + mustTah.filter(function(t) { return !t.collected && t.due && t.due < today; }).length;
  });
  // Skorlama
  var result = Object.values(mustMap).map(function(m) {
    var ortMarj = m.marjlar.length ? Math.round(m.marjlar.reduce(function(a, b) { return a + b; }, 0) / m.marjlar.length) : 0;
    var kabulOran = m.teklifSayisi > 0 ? Math.round(m.kabul / m.teklifSayisi * 100) : 0;
    var top5Urun = Object.values(m.urunMap).sort(function(a, b) { return b.tutar - a.tutar; }).slice(0, 5);
    var son3 = m.sonTeklifler.sort(function(a, b) { return (b.tarih || '').localeCompare(a.tarih || ''); }).slice(0, 3);
    // Müşteri değer skoru (CLV benzeri): 0-100
    var degerSkor = 0;
    degerSkor += Math.min(30, Math.round(m.satisToplam / 10000)); // Ciro
    degerSkor += Math.min(25, ortMarj); // Marj
    degerSkor += Math.min(20, kabulOran / 5); // Kabul oranı
    degerSkor += Math.min(15, Math.max(0, 15 - m.gecikmisSayisi * 5)); // Ödeme disiplini
    degerSkor += Math.min(10, m.teklifSayisi * 2); // İşlem sıklığı
    degerSkor = Math.min(100, Math.round(degerSkor));

    return {
      ad: m.ad, satisToplam: m.satisToplam, karToplam: m.karToplam,
      teklifSayisi: m.teklifSayisi, kabul: m.kabul, red: m.red,
      ortMarj: ortMarj, kabulOran: kabulOran,
      ortOdemeSuresi: m.ortOdemeSuresi, gecikmisSayisi: m.gecikmisSayisi,
      top5Urun: top5Urun, son3: son3, degerSkor: degerSkor
    };
  });
  result.sort(function(a, b) { return b.degerSkor - a.degerSkor; }); // En değerli en üstte
  return result;
};

/** @description Müşteri analiz raporu modalı */
window._openMusteriAnalizi = function() {
  document.getElementById('mo-reports')?.remove();
  var ex = document.getElementById('mo-must-analiz'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-must-analiz'; mo.style.zIndex = '2200';
  mo.innerHTML = '<div class="moc" style="max-width:720px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:15px;font-weight:700;color:var(--t)">Müşteri Analiz Raporu</div><button onclick="document.getElementById(\'mo-must-analiz\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button></div>'
    + '<div style="padding:10px 20px;background:var(--s2);border-bottom:0.5px solid var(--b);display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<input type="date" class="fi" id="must-from" style="font-size:11px;width:130px">'
    + '<span style="font-size:10px;color:var(--t3)">—</span>'
    + '<input type="date" class="fi" id="must-to" style="font-size:11px;width:130px">'
    + '<button onclick="window._renderMustAnaliz()" style="padding:5px 12px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Filtrele</button>'
    + '<button onclick="window._exportMustAnalizXlsx()" style="padding:5px 12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Excel</button>'
    + '<button onclick="window._printMustAnaliz()" style="padding:5px 12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">PDF</button>'
    + '</div>'
    + '<div id="must-analiz-content" style="padding:16px 20px;max-height:55vh;overflow-y:auto"></div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); window._renderMustAnaliz(); }, 10);
};

/** @description Müşteri analiz listesini render et */
window._renderMustAnaliz = function() {
  var cont = document.getElementById('must-analiz-content'); if (!cont) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var from = document.getElementById('must-from')?.value || '';
  var to = document.getElementById('must-to')?.value || '';
  var data = window._buildMusteriAnalizi(from, to);
  if (!data.length) { cont.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3)">Müşteri verisi bulunamadı</div>'; return; }
  var enDegerli = data[0]; var enRiskli = data[data.length - 1];
  var DURUM_MAP = { taslak: 'Taslak', gonderildi: 'Gönderildi', kabul: 'Kabul', red: 'Red', onay: 'Onay' };
  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<div style="padding:10px;background:#16A34A11;border:0.5px solid #16A34A44;border-radius:8px"><div style="font-size:9px;color:#16A34A;text-transform:uppercase;font-weight:700">En değerli müşteri</div><div style="font-size:13px;font-weight:700;color:#16A34A;margin-top:2px">' + esc(enDegerli.ad) + '</div><div style="font-size:10px;color:var(--t3)">Skor: ' + enDegerli.degerSkor + '/100 · Satış: $' + Math.round(enDegerli.satisToplam).toLocaleString('tr-TR') + '</div></div>'
    + '<div style="padding:10px;background:#DC262611;border:0.5px solid #DC262644;border-radius:8px"><div style="font-size:9px;color:#DC2626;text-transform:uppercase;font-weight:700">En riskli müşteri</div><div style="font-size:13px;font-weight:700;color:#DC2626;margin-top:2px">' + esc(enRiskli.ad) + '</div><div style="font-size:10px;color:var(--t3)">Skor: ' + enRiskli.degerSkor + '/100 · Gecikmiş: ' + enRiskli.gecikmisSayisi + '</div></div></div>';
  // Müşteri kartları
  data.forEach(function(m) {
    var skorColor = m.degerSkor >= 60 ? '#16A34A' : m.degerSkor >= 30 ? '#D97706' : '#DC2626';
    var skorBg = m.degerSkor >= 60 ? '#16A34A11' : m.degerSkor >= 30 ? '#D9770611' : '#DC262611';
    html += '<div style="border:0.5px solid var(--b);border-radius:8px;margin-bottom:8px;overflow:hidden">'
      + '<div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--s2)">'
      + '<div style="font-size:12px;font-weight:700;color:var(--t)">' + esc(m.ad) + '</div>'
      + '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + skorBg + ';color:' + skorColor + ';font-weight:700">CLV: ' + m.degerSkor + '/100</span></div>'
      + '<div style="padding:10px 14px">'
      + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px">'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Toplam Satış</div><div style="font-size:12px;font-weight:700;color:var(--ac)">$' + Math.round(m.satisToplam).toLocaleString('tr-TR') + '</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Ort. Marj</div><div style="font-size:12px;font-weight:700;color:' + (m.ortMarj >= 15 ? '#16A34A' : '#D97706') + '">%' + m.ortMarj + '</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Kabul Oranı</div><div style="font-size:12px;font-weight:700">%' + m.kabulOran + '</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Ödeme Süresi</div><div style="font-size:12px;font-weight:700;color:' + (m.ortOdemeSuresi <= 0 ? '#16A34A' : m.ortOdemeSuresi <= 7 ? '#D97706' : '#DC2626') + '">' + (m.ortOdemeSuresi > 0 ? '+' + m.ortOdemeSuresi : m.ortOdemeSuresi) + ' gün</div></div>'
      + '<div><div style="font-size:8px;color:var(--t3);text-transform:uppercase">Gecikmiş</div><div style="font-size:12px;font-weight:700;color:' + (m.gecikmisSayisi === 0 ? '#16A34A' : '#DC2626') + '">' + m.gecikmisSayisi + '</div></div></div>';
    // Top 5 ürün
    if (m.top5Urun.length) {
      html += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">En çok aldığı</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">';
      m.top5Urun.forEach(function(u) {
        html += '<span style="font-size:9px;padding:2px 6px;background:var(--al);color:var(--ac);border-radius:3px">' + esc(u.ad) + ' (' + u.miktar + ')</span>';
      });
      html += '</div>';
    }
    // Son 3 teklif
    if (m.son3.length) {
      html += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:3px">Son teklifler</div>';
      m.son3.forEach(function(s) {
        html += '<div style="font-size:10px;color:var(--t2);padding:1px 0">' + esc(s.no || '') + ' · ' + s.tarih + ' · $' + Math.round(s.tutar).toLocaleString('tr-TR') + ' · ' + (DURUM_MAP[s.durum] || s.durum) + '</div>';
      });
    }
    html += '</div></div>';
  });
  cont.innerHTML = html;
};

/** @description Müşteri analiz Excel export */
window._exportMustAnalizXlsx = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  var from = document.getElementById('must-from')?.value || '';
  var to = document.getElementById('must-to')?.value || '';
  var data = window._buildMusteriAnalizi(from, to);
  var rows = [['Müşteri', 'Toplam Satış ($)', 'Kâr ($)', 'Teklif Sayısı', 'Kabul', 'Red', 'Kabul Oranı %', 'Ort. Marj %', 'Ort. Ödeme Süresi (gün)', 'Gecikmiş', 'CLV Skoru', 'Top 5 Ürün']];
  data.forEach(function(m) {
    rows.push([m.ad, Math.round(m.satisToplam), Math.round(m.karToplam), m.teklifSayisi, m.kabul, m.red, m.kabulOran, m.ortMarj, m.ortOdemeSuresi, m.gecikmisSayisi, m.degerSkor, m.top5Urun.map(function(u) { return u.ad; }).join(', ')]);
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Müşteri Analizi');
  XLSX.writeFile(wb, 'musteri-analizi-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Müşteri analiz raporu indirildi ✓', 'ok');
};

/** @description Müşteri analiz PDF (yazdır) */
window._printMustAnaliz = function() {
  var from = document.getElementById('must-from')?.value || '';
  var to = document.getElementById('must-to')?.value || '';
  var data = window._buildMusteriAnalizi(from, to);
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Müşteri Analizi</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px;max-width:800px;margin:0 auto}h1{text-align:center;color:#1a365d;font-size:16px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#1a365d;color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #ddd;font-size:10px}.good{color:#16A34A;font-weight:700}.bad{color:#DC2626;font-weight:700}@media print{button{display:none!important}}</style></head><body>'
    + '<h1>MÜŞTERİ ANALİZ RAPORU</h1><div style="text-align:center;color:#666;font-size:10px;margin-bottom:12px">DUAY GLOBAL TRADE' + (from || to ? ' · ' + (from || '...') + ' — ' + (to || '...') : '') + ' · ' + new Date().toISOString().slice(0, 10) + '</div>'
    + '<table><thead><tr><th>Müşteri</th><th>Satış ($)</th><th>Kâr ($)</th><th>Marj %</th><th>Kabul %</th><th>Ödeme</th><th>Gecikmiş</th><th>CLV</th></tr></thead><tbody>'
    + data.map(function(m) {
        var cls = m.degerSkor >= 60 ? 'good' : m.degerSkor < 30 ? 'bad' : '';
        return '<tr><td><b>' + esc(m.ad) + '</b></td><td style="text-align:right">$' + Math.round(m.satisToplam).toLocaleString('tr-TR') + '</td><td style="text-align:right">$' + Math.round(m.karToplam).toLocaleString('tr-TR') + '</td><td style="text-align:center" class="' + (m.ortMarj >= 15 ? 'good' : '') + '">%' + m.ortMarj + '</td><td style="text-align:center">%' + m.kabulOran + '</td><td style="text-align:center">' + (m.ortOdemeSuresi > 0 ? '+' + m.ortOdemeSuresi + 'g' : 'zamanında') + '</td><td style="text-align:center" class="' + (m.gecikmisSayisi > 0 ? 'bad' : 'good') + '">' + m.gecikmisSayisi + '</td><td style="text-align:center" class="' + cls + '">' + m.degerSkor + '</td></tr>';
      }).join('')
    + '</tbody></table>'
    + '<button onclick="window.print()" style="margin-top:12px;padding:6px 16px;cursor:pointer">Yazdır</button></body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// FIX 6 — İŞ TAKİP BELGESİ (İTB) — Satınalma onay PDF
// ════════════════════════════════════════════════════════════════
window._createIsTakipBelgesi = function(s) {
  if (!s) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var sorumlu = users.find(function(u) { return u.id === s.responsibleId; }) || users.find(function(u) { return u.id === s.createdBy; });
  var onaylayan = users.find(function(u) { return u.id === s.approvedBy; });
  var yr = new Date().getFullYear();
  var itbNo = 'ITB-' + yr + '-' + (typeof generateNumericId === 'function' ? String(generateNumericId()).slice(-4) : String(Date.now()).slice(-4));
  var urunRows = (s.items || []).map(function(u, i) {
    return '<tr><td>'+(i+1)+'</td><td>'+esc(u.code||u.urunKodu||'')+'</td><td>'+esc(u.name||u.standartAdi||'')+'</td><td style="text-align:center">'+(u.qty||u.miktar||0)+'</td><td style="text-align:center">'+(u.unit||u.birim||'—')+'</td><td style="text-align:right">'+(u.unitPrice||u.birimFiyat||0)+'</td><td>'+(s.faturaType||'—')+'</td><td style="text-align:right">'+(u.kdvTutari||0)+(u.kdvOdenirMi===false?' (Ödenmez)':'')+'</td><td style="text-align:right;font-weight:700">'+(u.netOdeme||u.toplamFiyat||0)+'</td></tr>';
  }).join('');
  if (!urunRows) urunRows = '<tr><td>1</td><td>—</td><td>'+esc(s.supplier||'')+'</td><td>1</td><td>—</td><td style="text-align:right">'+(s.totalAmount||0)+'</td><td>—</td><td>—</td><td style="text-align:right;font-weight:700">'+(s.totalAmount||0)+'</td></tr>';
  var avans = s.advanceAmount || Math.round((parseFloat(s.totalAmount)||0) * (parseFloat(s.advanceRate)||0) / 100);
  var kalan = (parseFloat(s.totalAmount)||0) - avans;
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>ITB '+itbNo+'</title><style>body{font-family:Arial,sans-serif;padding:25px;max-width:700px;margin:0 auto;font-size:11px}h1{text-align:center;color:#1a365d;font-size:16px;margin-bottom:2px}h2{text-align:center;font-size:10px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#1a365d;color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #ddd;font-size:10px}.sec{font-size:12px;font-weight:700;color:#1a365d;margin-top:14px;margin-bottom:6px;border-bottom:2px solid #1a365d;padding-bottom:3px}.warn{background:#FEF3C7;border:1px solid #F59E0B;border-radius:4px;padding:8px;font-size:10px;color:#92400E;margin:8px 0}@media print{button{display:none!important}}</style></head><body>'
    +'<h1>İŞ TAKİP BELGESİ — SATIN ALMA</h1><h2>DUAY GLOBAL TRADE</h2>'
    +'<table><tr><td><b>Belge No:</b> '+itbNo+'</td><td><b>Tarih:</b> '+(s.approvedAt||new Date().toISOString()).slice(0,10)+'</td></tr><tr><td><b>Job ID:</b> '+esc(s.jobId||'—')+'</td><td><b>PI No:</b> '+esc(s.piNo||'—')+'</td></tr></table>'
    +'<div class="warn"><b>SORUMLU:</b> '+esc(sorumlu?.name||'—')+'<br>Bu siparişi takip etmekle yükümlüsünüz.</div>'
    +'<div class="sec">TEDARİKÇİ BİLGİLERİ</div><table><tr><td><b>Ad:</b> '+esc(s.supplier||'')+'</td><td><b>İletişim:</b> '+esc(s.supplierContact||'—')+'</td></tr></table>'
    +'<div class="sec">ÜRÜN LİSTESİ</div><table><thead><tr><th>No</th><th>Kodu</th><th>Adı</th><th>Miktar</th><th>Birim</th><th>B.Fiyat</th><th>Fatura</th><th>KDV</th><th>Net</th></tr></thead><tbody>'+urunRows+'</tbody></table>'
    +'<div class="sec">ÖDEME PLANI</div><table><tr><td>Avans</td><td style="text-align:right;font-weight:600">'+avans+' '+(s.currency||'USD')+'</td><td>Vade: Onay + 3 iş günü</td></tr><tr><td>Kalan</td><td style="text-align:right;font-weight:600">'+kalan.toFixed(2)+' '+(s.currency||'USD')+'</td><td>Vade: Teslimat + 7 gün</td></tr><tr style="background:#f0f0f0;font-weight:700"><td>TOPLAM</td><td style="text-align:right">'+(s.totalAmount||0)+' '+(s.currency||'USD')+'</td><td></td></tr></table>'
    +'<div class="sec">KRİTİK TARİHLER</div><table><tr><td>Avans ödeme</td><td>'+new Date(Date.now()+3*86400000).toISOString().slice(0,10)+' ⚠️</td></tr><tr><td>Beklenen teslimat</td><td>'+(s.deliveryDate||'—')+'</td></tr>'+(s.deliveryDate?'<tr><td>7 gün kuralı</td><td>'+new Date(new Date(s.deliveryDate).getTime()+7*86400000).toISOString().slice(0,10)+'</td></tr>':'')+'</table>'
    +'<div style="display:flex;justify-content:space-between;margin-top:40px"><div style="width:40%;text-align:center;border-top:1px solid #333;padding-top:4px;margin-top:30px;font-size:10px">Satınalmacı<br>'+esc(sorumlu?.name||'')+'</div><div style="width:40%;text-align:center;border-top:1px solid #333;padding-top:4px;margin-top:30px;font-size:10px">Yönetici Onayı<br>'+esc(onaylayan?.name||'')+'</div></div>'
    +'<button onclick="window.print()" style="margin-top:16px;padding:6px 16px;cursor:pointer">Yazdır</button></body></html>');
  w.document.close();
};

// ════════════════════════════════════════════════════════════════
// FIX 8 — ÖZLÜ SÖZ SİSTEMİ — Tüm Modüller
// ════════════════════════════════════════════════════════════════
var OZLU_SOZLER = {
  dashboard: ['Ölçemediğini yönetemezsin. — Peter Drucker','Başarının sırrı, başlamaktır. — Mark Twain','Bugünün işini yarına bırakma.','Strateji olmadan, icra amaçsızdır. — Morris Chang','Veriye dayalı karar, sezgiden güçlüdür.','Küçük adımlar, büyük değişimler yaratır.','Planlama, geleceğin bugünkü tasarımıdır.','Düzen, başarının ilk adımıdır.','Detaylar fark yaratır.','İyi liderlik, iyi dinlemekle başlar.'],
  'nakit-akisi': ['Para bir araçtır, amaç değil. — Henry Ford','Nakit akışı, işin oksijenidir.','Geliri değil, kârı takip et.','Bütçe, paranıza plan vermektir.','Tasarruf, gelecekteki özgürlüktür.','Finansal disiplin, başarının temelidir.','Borç, geçmişin geleceğe faturasıdır.','Her kuruş hesap ister.','Nakit kraldır.','Kazanmak değil, tutabilmek önemlidir.'],
  satinalma: ['Ucuz alan iki kez alır.','İyi satınalma, kârlılığın yarısıdır.','Doğru tedarikçi, doğru iş demektir.','Kalite asla tesadüf değildir. — John Ruskin','Fiyat unutulur, kalite kalır.','Her zincir en zayıf halkası kadar güçlüdür.','Güven, ticaretin temelidir.','İyi anlaşma, iki tarafı da memnun eder.','Zamanında teslimat, söz tutmaktır.','Tedarik zinciri, rekabet avantajıdır.'],
  kargo: ['İyi planlama, yarı zaferdir.','Lojistik, savaşı kazandırır. — Eisenhower','Doğru ürün, doğru yerde, doğru zamanda.','Her konteyner bir hikaye taşır.','Denizcilik, sabır ve hassasiyet işidir.','Geciken kargo, kaybedilen müşteridir.','Detay, lojistiğin kalbidir.','Güvenli sevkiyat, güvenilir ortaktır.','Takip etmediğin yük kayıptır.','Dünya ticaretinin %90ı deniz yoluyla taşınır.'],
  'pusula-pro': ['Yapılacaklar listesi, hayallerinin haritasıdır.','Bugün yapabileceğini yarına bırakma.','Küçük görevler, büyük başarılar inşa eder.','Odaklanmak, hayır demeyi bilmektir. — Steve Jobs','Disiplin, motivasyonun yerini alır.','Bitirilen iş, başlatılan işten değerlidir.','Zaman yönetimi, hayat yönetimidir.','Her büyük proje, tek bir adımla başlar.','Öncelikleri belirle, gerisini unut.','Verimlilik, doğru işi doğru zamanda yapmaktır.'],
  'satis-teklifleri': ['Müşteri satın almaz, satın almasına izin verilir.','İyi teklif, müşterinin sorununu çözer.','Fiyat değil, değer sat. — Warren Buffett','Her hayır, bir evete daha yakındır.','Güven olmadan satış olmaz.','Müşterini dinle, çözümü o söyler.','Satış, ilişki kurma sanatıdır.','Takip etmeyen satıcı, kaybeden satıcıdır.','Zamanında teklif, kazanılan iştir.','En iyi reklam, memnun müşteridir.'],
};
window._getOzluSoz = function(modul) {
  var sozler = OZLU_SOZLER[modul] || OZLU_SOZLER.dashboard;
  var today = new Date().toISOString().slice(0, 10);
  var key = 'ak_ozlu_' + modul;
  try { var c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && c.date === today) return c.soz; } catch(e) {}
  var hash = 0; for (var i = 0; i < today.length; i++) hash = ((hash << 5) - hash) + today.charCodeAt(i);
  var soz = sozler[Math.abs(hash) % sozler.length];
  try { localStorage.setItem(key, JSON.stringify({ date: today, soz: soz })); } catch(e) {}
  return soz;
};
window._renderOzluSozBanner = function(modul) {
  var soz = window._getOzluSoz(modul);
  return '<div style="background:var(--sf);padding:6px 20px;font-size:11px;font-style:italic;color:var(--t3);display:flex;align-items:center;gap:6px"><span style="flex:1">\u201C'+soz+'\u201D</span><button onclick="navigator.clipboard?.writeText(\''+soz.replace(/'/g,'\\&#39;')+'\');window.toast?.(\'Kopyalandı!\',\'ok\')" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--t3)" title="Kopyala">📋</button></div>';
};

// ════════════════════════════════════════════════════════════════
// ÜRÜN KATALOĞU — 4 AŞAMALI SİSTEM + KULLANICI DOSTU FORM
// ════════════════════════════════════════════════════════════════

/** @constant Ürün menşei ülke listesi */
var URUN_MENSEI_LIST = window.MENSEI || ['Türkiye','Çin','Almanya','İtalya','Fransa','İspanya','Polonya','Hindistan','Japonya','Güney Kore','ABD','İngiltere','Hollanda','Belçika','Diğer'];
/** @constant Paket tipi seçenekleri */
var URUN_PAKET_TIPI = ['Koli','Palet','BigBag','Varil','Çuval','Ambalajsız','Diğer'];
/** @constant Ürün yapı seçenekleri */
var URUN_YAPI = ['Katı','Sıvı','Akışkan','Gaz','Toz'];
/** @constant İstifleme uyarıları */
var URUN_ISTIFLEME = ['Kırılır','Üste konulamaz','Dik tutulmalı','Nemden korunmalı','Soğuk zincir'];
/** @constant Liman listesi */
var URUN_LIMAN = ['İstanbul','Mersin','İzmir','Diğer'];
/** @constant Incoterms listesi */
var URUN_INCOTERMS = ['EXW','FOB','CFR','CIF','DDP','CPT','CIP'];
/** @constant Ödeme koşulları */
var URUN_ODEME = ['L/C','CAD','T/T','Cash','D/P','D/A'];
/** @constant Satıcı kategori seçenekleri */
var UF_SATICI_KAT = ['Üretici','Satıcı','Bayi','Distribütör','İthalatçı'];
/** @constant KDV oranları */
var UF_KDV_ORANLARI = [0, 1, 8, 10, 18, 20];
/** @constant Birim listesi */
var UF_BIRIMLER = ['Adet','Kg','Set','Metre','Litre','Kutu','Palet','Ton','M²','M³'];
/** @constant IMO sınıfları */
var UF_IMO_SINIFLAR = ['1-Patlayıcılar','2-Gazlar','3-Yanıcı Sıvılar','4-Yanıcı Katılar','5-Oksitleyiciler','6-Zehirli','7-Radyoaktif','8-Aşındırıcılar','9-Diğer Tehlikeli'];
/** Ürün kategori listesi — dinamik (localStorage + admin yönetimi) */
var UF_KAT_KEY = 'ak_urun_kategori_v1';
function _ufKatYukle() {
  try { var r=localStorage.getItem(UF_KAT_KEY); return r?JSON.parse(r):['Mobilya','Tekstil','Elektronik','Kimyasal','Gıda','Metal','Makine','Plastik','İnşaat','Otomotiv','Tarım','Diğer']; } catch(e) { return ['Mobilya','Tekstil','Elektronik','Kimyasal','Gıda','Metal','Makine','Plastik','İnşaat','Otomotiv','Tarım','Diğer']; }
}
function _ufKatKaydet(liste) { try { localStorage.setItem(UF_KAT_KEY,JSON.stringify(liste)); } catch(e){} }
var UF_KATEGORILER = _ufKatYukle();
window.UF_KATEGORILER = UF_KATEGORILER;
window._ufKatYukle = _ufKatYukle;

window._ufKatEkle = function(ad) {
  if(!ad||!ad.trim()){window.toast?.('Kategori adı boş olamaz','warn');return;}
  var liste=_ufKatYukle();
  if(liste.indexOf(ad.trim())!==-1){window.toast?.('Bu kategori zaten var','warn');return;}
  liste.push(ad.trim()); _ufKatKaydet(liste);
  window.UF_KATEGORILER=liste;
  window.toast?.('Kategori eklendi: '+ad,'ok');
  window._ufKatPanelGuncelle?.();
};

window._ufKatSil = function(ad) {
  if(!window.isAdmin?.()){window.toast?.('Sadece admin silebilir','warn');return;}
  var liste=_ufKatYukle().filter(function(k){return k!==ad;});
  _ufKatKaydet(liste); window.UF_KATEGORILER=liste;
  window.toast?.(ad+' silindi','ok');
  window._ufKatPanelGuncelle?.();
};

window._ufKatPanelHTML = function() {
  var liste=_ufKatYukle();
  var h='<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:16px;max-width:600px">';
  h+='<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:12px">Ürün Kategori Yönetimi</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:12px">';
  h+='<input id="uf-kat-yeni" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._ufKatEkle(this.value.trim())" placeholder="Yeni kategori adı..." style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  h+='<button onclick="event.stopPropagation();var inp=document.getElementById(\'uf-kat-yeni\');window._ufKatEkle(inp?.value);if(inp)inp.value=\'\'" style="font-size:10px;padding:6px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>';
  h+='</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
  liste.forEach(function(k){
    h+='<div style="display:flex;align-items:center;gap:4px;padding:4px 10px;border:0.5px solid var(--b);border-radius:20px;background:var(--s2)">';
    h+='<span style="font-size:11px;color:var(--t)">'+k+'</span>';
    if(window.isAdmin?.()) h+='<button onclick="event.stopPropagation();window._ufKatSil(\''+k+'\')" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:12px;padding:0 2px;line-height:1">×</button>';
    h+='</div>';
  });
  h+='</div></div>';
  return h;
};

window._ufKatPanelGuncelle = function() {
  var p=document.getElementById('uf-kat-yonetim');
  if(p) p.innerHTML=window._ufKatPanelHTML();
};


// ── YARDIMCI: Tooltip destekli form alanı üreteci ──
/** @description Tooltip ikonlu label üretir */
function _ufLabel(text, tooltip, required) {
  var cls = required ? 'color:#DC2626' : 'color:var(--t3)';
  var tip = tooltip ? ' <span class="uf-tip" title="' + tooltip.replace(/"/g, '&quot;') + '" style="cursor:help;opacity:.5;font-size:9px">&#9432;</span>' : '';
  return '<div class="fl" style="font-size:8px;margin-bottom:2px;' + cls + '">' + text + (required ? ' *' : '') + tip + '</div>';
}
/** @description Tek satir input uretir */
function _ufInput(id, label, tooltip, opts) {
  var o = opts || {};
  var req = o.required ? ' data-uf-req="1"' : '';
  var ph = o.placeholder ? ' placeholder="' + o.placeholder.replace(/"/g, '&quot;') + '"' : '';
  var val = o.value !== undefined && o.value !== null ? ' value="' + String(o.value).replace(/"/g, '&quot;') + '"' : '';
  var tp = o.type || 'text';
  var extra = o.readonly ? ' readonly style="font-size:11px;padding:4px 6px;background:var(--s2)"' : ' style="font-size:11px;padding:4px 6px"';
  var max = o.maxlength ? ' maxlength="' + o.maxlength + '"' : '';
  var step = o.step ? ' step="' + o.step + '"' : '';
  var cls = o.gridSpan ? 'style="grid-column:span ' + o.gridSpan + '"' : '';
  return '<div ' + cls + '>' + _ufLabel(label, tooltip, o.required) + '<input class="fi" type="' + tp + '" id="' + id + '"' + val + ph + req + max + step + extra + ' oninput="window._ufRecalc?.()"></div>';
}
/** @description Select dropdown uretir */
function _ufSelect(id, label, tooltip, options, opts) {
  var o = opts || {};
  var req = o.required ? ' data-uf-req="1"' : '';
  var sel = o.selected || '';
  var html = '<div>' + _ufLabel(label, tooltip, o.required) + '<select class="fi" id="' + id + '"' + req + ' style="font-size:11px;padding:4px 6px" onchange="window._ufRecalc?.()">';
  if (o.emptyLabel !== false) html += '<option value="">' + (o.emptyLabel || '\u2014 Se\u00e7in \u2014') + '</option>';
  options.forEach(function(v) {
    var val = typeof v === 'object' ? v.value : v;
    var lbl = typeof v === 'object' ? v.label : v;
    html += '<option value="' + val + '"' + (String(sel) === String(val) ? ' selected' : '') + '>' + lbl + '</option>';
  });
  html += '</select></div>';
  return html;
}
/** @description Textarea uretir */
function _ufTextarea(id, label, tooltip, opts) {
  var o = opts || {};
  var req = o.required ? ' data-uf-req="1"' : '';
  var val = o.value || '';
  var ph = o.placeholder ? ' placeholder="' + o.placeholder.replace(/"/g, '&quot;') + '"' : '';
  var cls = o.gridSpan ? 'style="grid-column:span ' + o.gridSpan + '"' : '';
  var badge = o.badge ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FEE2E2;color:#991B1B;margin-left:4px">' + o.badge + '</span>' : '';
  return '<div ' + cls + '>' + _ufLabel(label, tooltip, o.required) + badge + '<textarea class="fi" id="' + id + '" rows="' + (o.rows || 2) + '"' + req + ph + ' style="font-size:11px;padding:4px 6px;resize:none" oninput="window._ufRecalc?.()">' + val + '</textarea>'
    + (o.counter ? '<div id="' + id + '-cnt" style="font-size:8px;color:var(--t3);text-align:right;margin-top:1px">' + val.length + '/' + o.counter + '</div>' : '')
    + '</div>';
}
/** @description Toggle (Evet/Hayir) uretir */
function _ufToggle(id, label, tooltip, opts) {
  var o = opts || {};
  var sel = o.selected || 'H';
  var options = o.options || [{ value: 'H', label: 'Hay\u0131r' }, { value: 'E', label: 'Evet' }];
  return _ufSelect(id, label, tooltip, options, { required: o.required, selected: sel, emptyLabel: false });
}
/** @description Gorsel yukleme alani uretir */
function _ufImageDrop(id, label, tooltip, opts) {
  var o = opts || {};
  var req = o.required ? ' data-uf-req="1"' : '';
  var existing = o.value ? '<img src="' + o.value + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:6px">' : '';
  var cls = o.gridSpan ? 'style="grid-column:span ' + o.gridSpan + '"' : '';
  return '<div ' + cls + '>' + _ufLabel(label, tooltip, o.required)
    + '<div id="' + id + '-zone"' + req + ' style="border:1.5px dashed var(--b);border-radius:8px;padding:12px;text-align:center;cursor:pointer;transition:border-color .15s;min-height:60px;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap" onclick="document.getElementById(\'' + id + '\').click()" ondragover="event.preventDefault();this.style.borderColor=\'var(--ac)\'" ondragleave="this.style.borderColor=\'var(--b)\'" ondrop="event.preventDefault();this.style.borderColor=\'var(--b)\';window._ufHandleDrop?.(\'' + id + '\',event)">'
    + existing
    + '<div id="' + id + '-preview"></div>'
    + '<div style="font-size:10px;color:var(--t3)">' + (o.hint || 'G\u00f6rsel s\u00fcr\u00fckleyin veya t\u0131klay\u0131n') + '</div>'
    + '</div>'
    + '<input type="file" id="' + id + '" accept="image/*" style="display:none" onchange="window._ufHandleFile?.(\'' + id + '\',this)">'
    + '<input type="hidden" id="' + id + '-url" value="' + (o.value || '') + '">'
    + '</div>';
}

// ── ASAMA DOGRULAMA ──
var UF_STAGES = [
  { key: 1, icon: '\ud83d\udccb', name: 'Teklif Alma', badge: 'Sat\u0131\u015f teklifi i\u00e7in minimum bilgiler',
    required: ['uf-tedarikci','uf-gorsel-url','uf-duay-adi','uf-standart-adi','uf-kdv','uf-birim','uf-teknik'] },
  { key: 2, icon: '\ud83d\udd0d', name: 'Teklif Onay', badge: '\u015eirket onay\u0131 i\u00e7in gerekli bilgiler',
    required: ['uf-kategori','uf-marka','uf-uretici','uf-mensei','uf-imo','uf-dib','uf-ihracat-kisit','uf-ihracat-yasak','uf-net','uf-brut'] },
  { key: 3, icon: '\ud83d\udce6', name: 'Y\u00fckleme Haz\u0131rl\u0131k', badge: 'Nakliye ve konteyner hesab\u0131',
    required: ['uf-pkt-en','uf-pkt-boy','uf-pkt-yuk','uf-pkt-adet','uf-palet-gorsel-url'] },
  { key: 4, icon: '\ud83d\udea2', name: '\u0130hracat \u00d6n Haz\u0131rl\u0131k', badge: 'G\u00fcmr\u00fck ve ihracat belgeleri',
    required: ['uf-turkce-ad','uf-gtip','uf-dib-asama'] },
];

/** @description Belirli bir asama tamamlanma yuzdesi */
function _ufStagePct(stageKey) {
  var stage = UF_STAGES.find(function(s) { return s.key === stageKey; });
  if (!stage) return 0;
  var filled = 0;
  stage.required.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && (el.value || '').trim()) filled++;
  });
  return stage.required.length > 0 ? Math.round(filled / stage.required.length * 100) : 0;
}

/** @description Tum asamalarin genel ilerleme durumu */
function _ufTotalPct() {
  var total = 0; var filled = 0;
  UF_STAGES.forEach(function(s) {
    total += s.required.length;
    s.required.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && (el.value || '').trim()) filled++;
    });
  });
  return total > 0 ? Math.round(filled / total * 100) : 0;
}

/** @description Aktif asama (ilk tamamlanmamis) */
function _ufActiveStage() {
  for (var i = 0; i < UF_STAGES.length; i++) {
    if (_ufStagePct(UF_STAGES[i].key) < 100) return UF_STAGES[i].key;
  }
  return 4;
}

/** @description Asama kilit kontrolu */
function _ufIsLocked(stageKey) {
  if (stageKey <= 1) return false;
  return _ufStagePct(stageKey - 1) < 100;
}

/** @description Konteyner kapasite hesabi */
window._urunCalcKonteyner = function() {
  var en = parseFloat(document.getElementById('uf-pkt-en')?.value || '0');
  var boy = parseFloat(document.getElementById('uf-pkt-boy')?.value || '0');
  var yuk = parseFloat(document.getElementById('uf-pkt-yuk')?.value || '0');
  var el = document.getElementById('uf-konteyner-info'); if (!el) return;
  if (!en || !boy || !yuk) { el.innerHTML = ''; return; }
  var hacim = (en * boy * yuk) / 1000000;
  var adet20 = Math.floor(33.2 / hacim);
  var adet40 = Math.floor(76.4 / hacim);
  el.innerHTML = '<div style="padding:8px;background:#16A34A11;border:0.5px solid #16A34A44;border-radius:6px;font-size:10px;color:#16A34A">'
    + '<b>1x20DC:</b> ' + adet20 + ' adet \u2014 <b>1x40HC:</b> ' + adet40 + ' adet'
    + '<div style="margin-top:2px;color:#065F46">Birim hacim: ' + hacim.toFixed(4) + ' m\u00b3 \u00b7 M\u00fc\u015fteriye +' + Math.max(1, Math.floor(adet20 * 0.1)) + ' adet daha \u00f6nerilebilir</div></div>';
};

/** @description KPI veri kalite skoru hesapla */
function _ufCalcKPI() {
  var zorunluTotal = 0; var zorunluFilled = 0;
  var bonusTotal = 3; var bonusFilled = 0;
  UF_STAGES.forEach(function(s) {
    s.required.forEach(function(id) {
      zorunluTotal++;
      var el = document.getElementById(id);
      if (el && (el.value || '').trim()) zorunluFilled++;
    });
  });
  if ((document.getElementById('uf-koli-gorsel-url')?.value || '').trim()) bonusFilled++;
  if ((document.getElementById('uf-koli-ici-gorsel-url')?.value || '').trim()) bonusFilled++;
  if ((document.getElementById('uf-renk')?.value || '').trim()) bonusFilled++;
  var zorunluPct = zorunluTotal > 0 ? Math.round(zorunluFilled / zorunluTotal * 70) : 0;
  var bonusPct = Math.round(bonusFilled / bonusTotal * 30);
  return { pct: zorunluPct + bonusPct, filled: zorunluFilled + bonusFilled, total: zorunluTotal + bonusTotal };
}

/** @description Tum form UI yeniden hesaplar */
window._ufRecalc = function() {
  var pct = _ufTotalPct();
  var bar = document.getElementById('uf-progress-bar');
  if (bar) { bar.style.width = pct + '%'; bar.style.background = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : 'var(--ac)'; }
  var lbl = document.getElementById('uf-progress-lbl');
  var active = _ufActiveStage();
  if (lbl) lbl.textContent = 'A\u015fama ' + active + '/4 \u2014 %' + pct + ' tamamland\u0131';
  UF_STAGES.forEach(function(s) {
    var hdr = document.getElementById('uf-stage-hdr-' + s.key);
    if (!hdr) return;
    var sp = _ufStagePct(s.key);
    var locked = _ufIsLocked(s.key);
    var badge = hdr.querySelector('.uf-stage-badge');
    if (badge) {
      badge.textContent = locked ? '\ud83d\udd12 Kilitli' : sp === 100 ? '\u2705 Tamamland\u0131' : '%' + sp;
      badge.style.background = locked ? 'var(--s2)' : sp === 100 ? '#DCFCE7' : sp > 0 ? '#FEF9C3' : 'var(--s2)';
      badge.style.color = locked ? 'var(--t3)' : sp === 100 ? '#166534' : sp > 0 ? '#854D0E' : 'var(--t3)';
    }
  });
  UF_STAGES.forEach(function(s) {
    var dot = document.getElementById('uf-mini-dot-' + s.key);
    if (!dot) return;
    var sp = _ufStagePct(s.key);
    dot.style.background = sp === 100 ? '#16A34A' : sp > 0 ? '#D97706' : 'var(--s3)';
    var pctEl = document.getElementById('uf-mini-pct-' + s.key);
    if (pctEl) pctEl.textContent = '%' + sp;
  });
  var kpi = _ufCalcKPI();
  var kpiEl = document.getElementById('uf-kpi-badge');
  if (kpiEl) {
    kpiEl.textContent = kpi.pct === 100 ? '\ud83c\udfc6 KPI+ Tam Puan' : '\ud83d\udcca Veri Kalite: %' + kpi.pct;
    kpiEl.style.background = kpi.pct === 100 ? '#DCFCE7' : kpi.pct >= 70 ? '#FEF9C3' : '#FEE2E2';
    kpiEl.style.color = kpi.pct === 100 ? '#166534' : kpi.pct >= 70 ? '#854D0E' : '#991B1B';
  }
  document.querySelectorAll('[data-uf-req]').forEach(function(el) {
    var val = (el.value || '').trim();
    el.style.borderColor = val ? '#16A34A' : '#DC2626';
  });
  var teknik = document.getElementById('uf-teknik');
  var cnt = document.getElementById('uf-teknik-cnt');
  if (teknik && cnt) cnt.textContent = teknik.value.length + '/30 min';
  var duayAdi = document.getElementById('uf-duay-adi');
  var cnt2 = document.getElementById('uf-duay-adi-cnt');
  if (duayAdi && cnt2) cnt2.textContent = duayAdi.value.length + '/80';
  var duayAdiVal = (duayAdi?.value || '');
  var saticiKodu = (document.getElementById('uf-satici-kodu')?.value || '').trim();
  var warn = document.getElementById('uf-duay-adi-warn');
  if (warn) warn.style.display = (saticiKodu && duayAdiVal.indexOf(saticiKodu) !== -1) ? 'block' : 'none';
  var netVal = parseFloat(document.getElementById('uf-net')?.value || '0');
  var brutVal = parseFloat(document.getElementById('uf-brut')?.value || '0');
  var bwarn = document.getElementById('uf-brut-warn');
  if (bwarn) bwarn.style.display = (brutVal > 0 && netVal > brutVal) ? 'block' : 'none';
  window._urunCalcKonteyner?.();
  UF_STAGES.forEach(function(s) {
    var sp = _ufStagePct(s.key);
    var confetti = document.getElementById('uf-confetti-' + s.key);
    if (confetti && sp === 100 && !confetti.dataset.shown) {
      confetti.style.display = 'block'; confetti.dataset.shown = '1';
      setTimeout(function() { confetti.style.display = 'none'; }, 1500);
    }
  });
  var saveBtn = document.getElementById('uf-save-btn');
  if (saveBtn) {
    var canSave = _ufStagePct(1) > 0;
    saveBtn.disabled = !canSave; saveBtn.style.opacity = canSave ? '1' : '.4';
  }
};

/** @description Asama accordion ac/kapa */
window._ufToggleStage = function(stageKey) {
  if (_ufIsLocked(stageKey)) {
    window.toast?.('\u00d6nceki a\u015famay\u0131 tamamlay\u0131n \u2014 A\u015fama ' + (stageKey - 1) + ' hen\u00fcz eksik', 'err');
    return;
  }
  var el = document.getElementById('uf-stage-body-' + stageKey);
  if (!el) return;
  var isOpen = el.style.display !== 'none';
  for (var i = 1; i <= 4; i++) {
    var body = document.getElementById('uf-stage-body-' + i);
    if (body) body.style.display = 'none';
    var arrow = document.getElementById('uf-stage-arrow-' + i);
    if (arrow) arrow.textContent = '\u25b8';
  }
  if (!isOpen) {
    el.style.display = 'block';
    var arrow2 = document.getElementById('uf-stage-arrow-' + stageKey);
    if (arrow2) arrow2.textContent = '\u25be';
  }
};

/** @description Gorsel dosya isle */
window._ufHandleFile = function(id, input) {
  var file = input.files?.[0]; if (!file) return;
  _ufProcessImage(id, file);
};
window._ufHandleDrop = function(id, event) {
  var file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  _ufProcessImage(id, file);
};
function _ufProcessImage(id, file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById(id + '-preview');
    if (preview) preview.innerHTML = '<img src="' + e.target.result + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px">';
    var urlInput = document.getElementById(id + '-url');
    if (urlInput) { urlInput.value = e.target.result; window._ufRecalc?.(); }
    if (typeof window.gdriveUpload === 'function') {
      window.gdriveUpload(file).then(function(url) {
        if (urlInput) urlInput.value = url;
        window.toast?.('G\u00f6rsel y\u00fcklendi \u2713', 'ok');
      }).catch(function() { window.toast?.('Drive y\u00fckleme ba\u015far\u0131s\u0131z', 'err'); });
    }
  };
  reader.readAsDataURL(file);
}

/** @description Duay urun kodunu otomatik uretir */
function _ufGenerateDuayKodu(tedarikci, existingCount) {
  var tedKod = (tedarikci || 'X').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
  var sira = String((existingCount || 0) + 1).padStart(5, '0');
  return 'DU' + sira + '.' + tedKod;
}

// ════════════════════════════════════════════════════════════════
// ANA FORM — 4 ASAMALI INLINE FORM
// ════════════════════════════════════════════════════════════════

/** @description 4 asamali urun formunu acar */
window._openUrunInline = function(editId) {
  var ex = document.getElementById('urun-inline-form'); if (ex) { ex.remove(); return; }
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };
  var u = editId ? (typeof loadUrunler === 'function' ? loadUrunler() : []).find(function(x) { return x.id === editId; }) : null;
  var cariList = typeof loadCari === 'function' ? loadCari().filter(function(c) { return !c.isDeleted && c.type === 'tedarikci'; }) : [];
  var cont = document.getElementById('urun-list'); if (!cont) return;
  var isLocked = u?.salesLocked || false;
  var allUrunler = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var siraNo = u ? (allUrunler.indexOf(u) + 1) : (allUrunler.length + 1);

  var form = document.createElement('div');
  form.id = 'urun-inline-form';
  form.style.cssText = 'border:2px solid var(--ac);border-radius:12px;margin:8px 0;background:var(--sf);overflow:hidden';

  var confettiCSS = '<style>.uf-confetti{display:none;position:absolute;top:0;left:0;right:0;height:40px;overflow:hidden;pointer-events:none;z-index:5}.uf-confetti span{position:absolute;width:6px;height:6px;border-radius:50%;animation:uf-fall .8s ease-out forwards}@keyframes uf-fall{0%{transform:translateY(-10px) rotate(0);opacity:1}100%{transform:translateY(40px) rotate(360deg);opacity:0}}.uf-tip{cursor:help;opacity:.5;font-size:9px;transition:opacity .15s}.uf-tip:hover{opacity:1}</style>';
  var confettiDots = function(id) {
    var colors = ['#16A34A','#D97706','#4F46E5','#DC2626','#10B981'];
    var dots = '';
    for (var ci = 0; ci < 12; ci++) dots += '<span style="left:' + (ci * 8 + 4) + '%;background:' + colors[ci % 5] + ';animation-delay:' + (ci * 0.05) + 's"></span>';
    return '<div class="uf-confetti" id="uf-confetti-' + id + '" style="position:relative">' + dots + '</div>';
  };

  function stageHeader(s, isFirst) {
    return '<div id="uf-stage-hdr-' + s.key + '" style="cursor:pointer;padding:10px 14px;background:var(--s2);border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;gap:8px;user-select:none" onclick="window._ufToggleStage(' + s.key + ')">'
      + '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">' + s.icon + '</span><div><div style="font-size:11px;font-weight:700;color:var(--t)">A\u015fama ' + s.key + ' \u2014 ' + s.name + '</div><div style="font-size:9px;color:var(--t3)">' + s.badge + '</div></div></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span class="uf-stage-badge" style="font-size:9px;padding:2px 8px;border-radius:4px;background:var(--s2);color:var(--t3);font-weight:600">%0</span><span id="uf-stage-arrow-' + s.key + '" style="font-size:14px;color:var(--t3)">' + (isFirst ? '\u25be' : '\u25b8') + '</span></div></div>';
  }

  var html = confettiCSS;
  // BASLIK
  html += '<div style="padding:10px 16px;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">\ud83d\udce6</span><div><div style="font-size:13px;font-weight:700">' + (u ? '\u270f\ufe0f \u00dcr\u00fcn D\u00fczenle' : '+ Yeni \u00dcr\u00fcn Kayd\u0131') + '</div><div style="font-size:10px;opacity:.8">' + (u ? esc(u.duayKodu || '') : '4 a\u015famal\u0131 form \u2014 ad\u0131m ad\u0131m tamamlay\u0131n') + '</div></div></div><div style="display:flex;align-items:center;gap:8px"><span id="uf-kpi-badge" style="font-size:9px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,.2);color:#fff;font-weight:600">\ud83d\udcca Veri Kalite: %0</span><button onclick="document.getElementById(\'urun-inline-form\')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:14px">\u2715</button></div></div>';
  // ILERLEME
  html += '<div style="padding:8px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;gap:10px"><div style="flex:1;height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div id="uf-progress-bar" style="height:100%;width:0%;background:var(--ac);border-radius:3px;transition:width .3s ease"></div></div><span id="uf-progress-lbl" style="font-size:10px;color:var(--t3);white-space:nowrap;font-weight:600">A\u015fama 1/4 \u2014 %0 tamamland\u0131</span></div>';
  // SATIS KILIDI
  if (isLocked) {
    html += '<div style="padding:8px 16px;background:#FEF2F2;border-bottom:1px solid #FECACA;font-size:11px;color:#991B1B;display:flex;align-items:center;gap:6px"><span style="font-size:14px">\ud83d\udd12</span><span>Bu \u00fcr\u00fcn i\u00e7in sat\u0131\u015f teklifi verilmi\u015f \u2014 kritik alanlar kilitli. <button onclick="window._ufRequestChange?.()" style="background:none;border:none;color:#991B1B;text-decoration:underline;cursor:pointer;font-size:11px">De\u011fi\u015fiklik Talebi Olu\u015ftur</button></span></div>';
  }
  // IKI SUTUN
  html += '<div style="display:flex;gap:0">';
  html += '<div style="flex:1;min-width:0">';
  html += '<input type="hidden" id="uf-eid" value="' + (u?.id || '') + '"><input type="hidden" id="uf-asama" value="' + (u?.asama || 1) + '">';

  // ══════ ASAMA 1 — TEKLIF ALMA ══════
  html += stageHeader(UF_STAGES[0], true) + confettiDots(1);
  html += '<div id="uf-stage-body-1" style="padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">';
  html += _ufInput('uf-sira', 'S\u0131ra No', 'Sistem otomatik atar', { value: siraNo, readonly: true });
  html += _ufSelect('uf-tedarikci', 'Tedarik\u00e7i / Sat\u0131c\u0131', '\u00dcr\u00fcn\u00fc sat\u0131n ald\u0131\u011f\u0131n\u0131z firma', cariList.map(function(c) { return { value: c.name, label: c.name }; }), { required: true, selected: u?.tedarikci || '' });
  html += _ufSelect('uf-satici-kat', 'Sat\u0131c\u0131 Kategorisi', 'Bu firma \u00fcr\u00fcn\u00fc \u00fcretiyor mu, arac\u0131 m\u0131?', UF_SATICI_KAT, { selected: u?.saticiKategori || '' });
  html += _ufSelect('uf-kdv', 'KDV Oran\u0131', '\u00dcr\u00fcne uygulanan KDV oran\u0131', UF_KDV_ORANLARI.map(function(k) { return { value: String(k), label: '%' + k }; }), { required: true, selected: String(u?.kdvOrani ?? 20), emptyLabel: false });
  html += '</div>';
  html += '<div style="margin-top:8px">' + _ufImageDrop('uf-gorsel', '\u00dcr\u00fcn G\u00f6rseli', 'Min 1 g\u00f6rsel zorunlu', { required: true, value: u?.gorselUrl || u?.gorsel || '', hint: '\u00dcr\u00fcn foto\u011fraf\u0131n\u0131 buraya s\u00fcr\u00fckleyin veya t\u0131klay\u0131n' }) + '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
  html += '<div>' + _ufLabel('Sat\u0131c\u0131 \u00dcr\u00fcn Kodu', 'Sat\u0131c\u0131n\u0131n bu \u00fcr\u00fcne verdi\u011fi kod', false) + '<div style="display:flex;gap:4px;align-items:center"><input class="fi" id="uf-satici-kodu" style="font-size:11px;padding:4px 6px;flex:1" placeholder="Sat\u0131c\u0131n\u0131n katalog/model numaras\u0131" value="' + esc(u?.saticiKodu || '') + '" oninput="window._ufRecalc?.()"><label style="font-size:9px;color:var(--t3);white-space:nowrap;display:flex;align-items:center;gap:2px"><input type="checkbox" id="uf-satici-kodu-yok" style="width:12px;height:12px" onchange="if(this.checked)document.getElementById(\'uf-satici-kodu\').value=\'Bilgi yok\'"> Yok</label></div></div>';
  html += _ufInput('uf-duay-kodu', 'Duay \u00dcr\u00fcn Kodu', 'Format: DU[XXXXX].[TEDAR\u0130KC\u0130_KOD]', { value: u?.duayKodu || 'Otomatik', readonly: true });
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
  html += '<div>' + _ufLabel('Duay \u00dcr\u00fcn Ad\u0131', '\u26a0\ufe0f D\u0130KKAT: Bu isim internette arat\u0131ld\u0131\u011f\u0131nda sat\u0131c\u0131ya y\u00f6nlendirmemeli', true) + '<input class="fi" id="uf-duay-adi" data-uf-req="1" style="font-size:11px;padding:4px 6px" placeholder="\u00dcr\u00fcn\u00fcn genel, markas\u0131z ad\u0131" maxlength="80" value="' + esc(u?.duayAdi || u?.urunAdi || '') + '" oninput="window._ufRecalc?.()"><div id="uf-duay-adi-cnt" style="font-size:8px;color:var(--t3);text-align:right;margin-top:1px">' + (u?.duayAdi || u?.urunAdi || '').length + '/80</div><div id="uf-duay-adi-warn" style="display:none;font-size:9px;color:#DC2626;margin-top:2px">\u26a0 Bu isim sat\u0131c\u0131ya \u00f6zg\u00fc g\u00f6r\u00fcn\u00fcyor</div></div>';
  html += _ufInput('uf-standart-adi', 'Standart \u0130ngilizce \u00dcr\u00fcn Ad\u0131', 'T\u00fcm ihracat belgelerinde (PI, CI, PL, BL) g\u00f6r\u00fcn\u00fcr', { required: true, placeholder: 'Full Height Turnstile, Stainless Steel, 3-Arm', value: u?.standartAdi || '' });
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
  html += _ufSelect('uf-birim', 'Miktar T\u00fcr\u00fc / Birim', '\u00dcr\u00fcn\u00fcn \u00f6l\u00e7\u00fc birimi', UF_BIRIMLER, { required: true, selected: u?.birim || 'Adet', emptyLabel: false });
  html += _ufInput('uf-renk', 'Renk', '\u00dcr\u00fcn rengi', { placeholder: 'RAL 9016, Silver, Natural', value: u?.renk || '' });
  html += '</div>';
  html += '<div style="margin-top:8px">' + _ufTextarea('uf-teknik', 'Teknik A\u00e7\u0131klama', 'Ayn\u0131 isimli \u00fcr\u00fcnlerden ay\u0131rt edecek t\u00fcm teknik \u00f6zellikleri yaz\u0131n', { required: true, placeholder: '\u00dcr\u00fcn\u00fcn \u00f6l\u00e7\u00fcs\u00fc, ebad\u0131, hammaddesi, kal\u0131nl\u0131\u011f\u0131, rengi...', value: u?.teknikAciklama || '', rows: 3, counter: '30 min' }) + '</div>';
  html += '<div style="margin-top:8px">' + _ufTextarea('uf-satici-notu', 'Sat\u0131c\u0131 \u00d6zel Notu', 'Kritik hususlar, dikkat edilmesi gerekenler', { placeholder: 'Sat\u0131c\u0131 s\u0131rlar\u0131, kritik kontrol noktalar\u0131', value: u?.saticiOzelNotu || '', rows: 2, badge: '\ud83d\udd12 G\u0130ZL\u0130 \u2014 Sadece sat\u0131c\u0131 ve admin g\u00f6r\u00fcr' }) + '</div>';
  html += '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between"><div id="uf-stage1-ok" style="font-size:10px;color:#16A34A;display:none">\u2705 A\u015fama 1 Tamamland\u0131</div><button onclick="window._ufCompleteStage(1)" style="padding:5px 14px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:auto">Bu a\u015famay\u0131 tamamla \u2192</button></div>';
  html += '</div>';

  // ══════ ASAMA 2 — TEKLIF ONAY ══════
  html += stageHeader(UF_STAGES[1], false) + confettiDots(2);
  html += '<div id="uf-stage-body-2" style="display:none;padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">';
  html += _ufSelect('uf-kategori', '\u00dcr\u00fcn Kategorisi', 'Ana kategori \u2014 raporlama i\u00e7in', UF_KATEGORILER, { required: true, selected: u?.kategori || '' });
  html += _ufInput('uf-marka', 'Marka', 'Bilinmiyorsa "Markas\u0131z" yaz\u0131n', { required: true, placeholder: '\u00dcr\u00fcn\u00fcn markas\u0131', value: u?.marka || '' });
  html += '<div>' + _ufLabel('Ger\u00e7ek \u00dcretici', 'Sat\u0131c\u0131 ile \u00fcretici farkl\u0131 olabilir', true) + '<input class="fi" id="uf-uretici" data-uf-req="1" style="font-size:11px;padding:4px 6px" placeholder="Ger\u00e7ek \u00fcretici firma" value="' + esc(u?.gercekUretici || '') + '" oninput="window._ufRecalc?.()"><label style="font-size:8px;color:var(--t3);display:flex;align-items:center;gap:2px;margin-top:2px"><input type="checkbox" id="uf-uretici-ayni" style="width:10px;height:10px" onchange="if(this.checked){document.getElementById(\'uf-uretici\').value=document.getElementById(\'uf-tedarikci\')?.value||\'\';}window._ufRecalc?.()"> Sat\u0131c\u0131 ile ayn\u0131</label></div>';
  html += _ufSelect('uf-mensei', 'Men\u015fei \u00dclke', '\u00dcretim \u00fclkesi \u2014 ihracat belgelerinde zorunlu', URUN_MENSEI_LIST, { required: true, selected: u?.mensei || '' });
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div>' + _ufLabel('Muadil \u00dcr\u00fcn', 'Alternatif \u00fcr\u00fcn var m\u0131?', false) + '<div style="display:flex;gap:4px;align-items:center"><input class="fi" id="uf-muadil" style="font-size:11px;padding:4px 6px;flex:1" placeholder="Benzer \u00fcr\u00fcn ad\u0131 veya kodu" value="' + esc(u?.muadilUrun || '') + '" oninput="window._ufRecalc?.()"><label style="font-size:9px;color:var(--t3);white-space:nowrap;display:flex;align-items:center;gap:2px"><input type="checkbox" id="uf-muadil-yok" style="width:12px;height:12px" onchange="if(this.checked)document.getElementById(\'uf-muadil\').value=\'Muadil yok\'"> Yok</label></div></div><div></div></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:8px">';
  html += _ufToggle('uf-imo', 'IMO\'lu mu?', 'Tehlikeli madde mi?', { required: true, selected: u?.imolu || 'H' });
  html += _ufSelect('uf-dib', 'D\u0130B\'li mi?', 'Dahilde \u0130\u015fleme Belgesi', [{ value: 'H', label: 'Hay\u0131r' }, { value: 'E', label: 'Evet' }, { value: 'B', label: 'Bilmiyorum' }], { required: true, selected: u?.dibli || 'H', emptyLabel: false });
  html += _ufToggle('uf-ihracat-kisit', '\u0130hracat K\u0131s\u0131t\u0131', 'K\u0131s\u0131tlamaya tabi mi?', { required: true, selected: u?.ihracatKisiti || 'H' });
  html += _ufToggle('uf-ihracat-yasak', '\u0130hracat Yasa\u011f\u0131', '\u0130hracat\u0131 yasakl\u0131 m\u0131?', { required: true, selected: u?.ihracatYasagi || 'H' });
  html += '</div>';
  html += '<div id="uf-imo-detail" style="display:' + (u?.imolu === 'E' ? 'block' : 'none') + ';margin-top:8px;padding:10px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px"><div style="font-size:10px;font-weight:700;color:#991B1B;margin-bottom:6px">\u26a0 IMO \u2014 Forwarder\'a bildirilmeli</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' + _ufSelect('uf-imo-sinif', 'IMO S\u0131n\u0131f\u0131', '', UF_IMO_SINIFLAR, { selected: u?.imoSinifi || '' }) + _ufInput('uf-imo-un', 'UN Tehlike No', '', { placeholder: 'UN1234', value: u?.imoTehlikeNo || '' }) + '<div>' + _ufLabel('MSDS Belgesi', 'PDF y\u00fckleyin', false) + '<button onclick="window.toast?.(\'MSDS PDF y\u00fckleme \u2014 belgeler sekmesinden\',\'info\')" class="btn btns" style="font-size:10px;width:100%">\ud83d\udcce MSDS Y\u00fckle</button></div></div></div>';
  html += '<div id="uf-kisit-detay-wrap" style="display:' + (u?.ihracatKisiti === 'E' ? 'block' : 'none') + ';margin-top:6px">' + _ufTextarea('uf-kisit-detay', 'K\u0131s\u0131t Detay\u0131', '', { placeholder: 'Hangi \u00fclkelere k\u0131s\u0131tl\u0131...', value: u?.ihracatKisitiDetay || '' }) + '</div>';
  html += '<div id="uf-yasak-detay-wrap" style="display:' + (u?.ihracatYasagi === 'E' ? 'block' : 'none') + ';margin-top:6px"><div style="padding:6px 10px;background:#FEE2E2;border-radius:6px;font-size:10px;color:#991B1B;font-weight:600">\ud83d\udeab \u0130hracat\u0131 yasakl\u0131 \u00fcr\u00fcn</div>' + _ufTextarea('uf-yasak-detay', 'Yasak Detay\u0131', '', { placeholder: 'Yasak gerek\u00e7esi...', value: u?.ihracatYasakDetay || '' }) + '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
  html += _ufInput('uf-net', 'Net A\u011f\u0131rl\u0131k (kg/birim)', 'Ambalaj\u0131z a\u011f\u0131rl\u0131k', { required: true, type: 'number', step: '0.01', value: u?.netAgirlik || '', placeholder: '0.00' });
  html += '<div>' + _ufLabel('Br\u00fct A\u011f\u0131rl\u0131k (kg/birim)', 'Ambalajl\u0131 a\u011f\u0131rl\u0131k', true) + '<input class="fi" id="uf-brut" data-uf-req="1" type="number" step="0.01" style="font-size:11px;padding:4px 6px" placeholder="0.00" value="' + (u?.brutAgirlik || '') + '" oninput="window._ufRecalc?.()"><div id="uf-brut-warn" style="display:none;font-size:9px;color:#DC2626;margin-top:2px">\u26a0 Br\u00fct \u2265 Net olmal\u0131!</div></div>';
  html += '</div>';
  html += '<details style="margin-top:8px;border:0.5px solid var(--b);border-radius:6px;overflow:hidden"><summary style="padding:8px 12px;background:var(--s2);cursor:pointer;font-size:10px;font-weight:700;color:var(--t)">\ud83d\udccb S\u00f6zle\u015fme Maddeleri</summary><div style="padding:8px 12px;font-size:10px;color:var(--t2)"><label style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px"><input type="checkbox" class="uf-hile-cb" value="kalite" style="margin-top:2px"> Kalite kontrol\u00fc zorunlu</label><label style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px"><input type="checkbox" class="uf-hile-cb" value="teslimat" style="margin-top:2px"> Teslimat gecikmesi cezai \u015fart</label><label style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px"><input type="checkbox" class="uf-hile-cb" value="ambalaj" style="margin-top:2px"> Ambalaj standard\u0131</label><label style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px"><input type="checkbox" class="uf-hile-cb" value="belge" style="margin-top:2px"> Belge teslimi zorunlu</label><label style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px"><input type="checkbox" class="uf-hile-cb" value="iade" style="margin-top:2px"> Hatal\u0131 \u00fcr\u00fcnde tam iade</label></div></details>';
  html += '<div style="margin-top:10px;display:flex;align-items:center;justify-content:flex-end"><button onclick="window._ufCompleteStage(2)" style="padding:5px 14px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Bu a\u015famay\u0131 tamamla \u2192</button></div>';
  html += '</div>';

  // ══════ ASAMA 3 — YUKLEME HAZIRLIK ══════
  html += stageHeader(UF_STAGES[2], false) + confettiDots(3);
  html += '<div id="uf-stage-body-3" style="display:none;padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
  html += _ufInput('uf-pkt-en', 'Paket En (cm)', 'Genislik', { required: true, type: 'number', value: u?.paketEn || '' });
  html += _ufInput('uf-pkt-boy', 'Paket Boy (cm)', 'Uzunluk', { required: true, type: 'number', value: u?.paketBoy || '' });
  html += _ufInput('uf-pkt-yuk', 'Paket Y\u00fckseklik (cm)', 'Y\u00fckseklik', { required: true, type: 'number', value: u?.paketYukseklik || '' });
  html += '</div><div id="uf-konteyner-info" style="margin-top:6px"></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' + _ufInput('uf-pkt-adet', 'Paket \u0130\u00e7i Adet', 'Bir kolide ka\u00e7 birim?', { required: true, type: 'number', value: u?.paketAdet || '' }) + '<div></div></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">';
  html += _ufImageDrop('uf-koli-gorsel', 'Koli G\u00f6rseli', 'KPI+', { value: u?.koliGorselUrl || '', hint: 'Koli foto (KPI+)' });
  html += _ufImageDrop('uf-palet-gorsel', 'Palet G\u00f6rseli', 'Zorunlu', { required: true, value: u?.paletGorselUrl || '', hint: 'Palet foto (zorunlu)' });
  html += _ufImageDrop('uf-koli-ici-gorsel', 'Koli \u0130\u00e7i', 'KPI+', { value: u?.koliIciGorselUrl || '', hint: '\u0130\u00e7 g\u00f6rsel (KPI+)' });
  html += '</div>';
  html += '<div style="margin-top:10px;display:flex;align-items:center;justify-content:flex-end"><button onclick="window._ufCompleteStage(3)" style="padding:5px 14px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Bu a\u015famay\u0131 tamamla \u2192</button></div>';
  html += '</div>';

  // ══════ ASAMA 4 — IHRACAT ON HAZIRLIK ══════
  html += stageHeader(UF_STAGES[3], false) + confettiDots(4);
  html += '<div id="uf-stage-body-4" style="display:none;padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  html += _ufInput('uf-turkce-ad', 'T\u00fcrk\u00e7e Fatura \u00dcr\u00fcn Ad\u0131', 'G\u00fcmr\u00fck beyannamesi i\u00e7in', { required: true, placeholder: 'T\u00fcrk\u00e7e fatura ad\u0131', value: u?.turkceAd || u?.orijinalAdi || '' });
  html += _ufInput('uf-gtip', 'GT\u0130P Kodu', 'G\u00fcmr\u00fck Tarife \u0130statistik Pozisyonu', { required: true, placeholder: 'XXXX.XX.XX.XX.XX', maxlength: 17, value: u?.gtip || '' });
  html += '</div>';
  html += '<div style="margin-top:8px">' + _ufTextarea('uf-gumruk-tanim', 'G\u00fcmr\u00fck\u00e7\u00fc Yard\u0131mc\u0131 Tan\u0131m\u0131', 'GT\u0130P do\u011frulama i\u00e7in', { placeholder: '\u00dcr\u00fcn\u00fcn i\u015flevi, kullan\u0131m amac\u0131...', value: u?.gumrukTanim || u?.gumrukAciklama || '' }) + '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
  html += _ufToggle('uf-dib-asama', 'D\u0130B Var m\u0131?', 'G\u00fcmr\u00fck\u00e7\u00fcye bildirilmeli', { required: true, selected: u?.dibAsamaVar || u?.dibli || 'H' });
  html += '<div id="uf-dib-warn" style="display:none;padding:6px 10px;background:#FEF2F2;border-radius:6px;font-size:10px;color:#991B1B;font-weight:600;align-self:end">\u26a0 G\u00fcmr\u00fck\u00e7\u00fcye bildirilmeli</div>';
  html += '</div>';
  html += '<div style="margin-top:10px;display:flex;align-items:center;justify-content:flex-end"><button onclick="window._ufCompleteStage(4)" style="padding:5px 14px;border:none;border-radius:6px;background:#16A34A;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u2705 T\u00fcm a\u015famalar\u0131 tamamla</button></div>';
  html += '</div>';
  html += '</div>'; // sol

  // SAG MINI OZET
  html += '<div style="width:180px;flex-shrink:0;border-left:0.5px solid var(--b);padding:12px;background:var(--s2);position:sticky;top:0;align-self:flex-start">';
  UF_STAGES.forEach(function(s) {
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;cursor:pointer" onclick="window._ufToggleStage(' + s.key + ')"><div id="uf-mini-dot-' + s.key + '" style="width:8px;height:8px;border-radius:50%;background:var(--s3);flex-shrink:0"></div><div style="flex:1;min-width:0"><div style="font-size:9px;font-weight:600;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + s.icon + ' ' + s.name + '</div></div><span id="uf-mini-pct-' + s.key + '" style="font-size:9px;color:var(--t3);font-weight:600">%0</span></div>';
  });
  html += '<div style="border-top:0.5px solid var(--b);margin:8px 0;padding-top:8px">';
  if (u) {
    var users = typeof loadUsers === 'function' ? loadUsers() : [];
    var creator = u.createdBy ? users.find(function(x) { return x.id === u.createdBy; }) : null;
    html += '<div style="font-size:8px;color:var(--t3);margin-bottom:4px">Olu\u015fturan: ' + esc(creator?.name || '') + '</div><div style="font-size:8px;color:var(--t3);margin-bottom:6px">Tarih: ' + (u.createdAt || '').slice(0, 10) + '</div>';
  }
  html += '<button onclick="window._ufAddDiscovery?.()" style="width:100%;padding:5px;border:0.5px solid var(--b);border-radius:5px;background:var(--sf);color:var(--t2);font-size:9px;cursor:pointer;font-family:inherit;margin-bottom:6px">\ud83d\udca1 Yeni Ke\u015fif Ekle</button>';
  html += '<button id="uf-save-btn" onclick="window._saveUrunInline()" style="width:100%;padding:7px;border:none;border-radius:6px;background:var(--ac);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\ud83d\udcbe Kaydet</button>';
  html += '</div></div>';
  html += '</div>'; // iki sutun

  form.innerHTML = html;
  cont.insertBefore(form, cont.firstChild);
  form.scrollIntoView({ behavior: 'smooth' });

  // Toggle dinleyicileri
  var imoSel = document.getElementById('uf-imo');
  if (imoSel) imoSel.addEventListener('change', function() { var d2 = document.getElementById('uf-imo-detail'); if (d2) d2.style.display = this.value === 'E' ? 'block' : 'none'; });
  var kisitSel = document.getElementById('uf-ihracat-kisit');
  if (kisitSel) kisitSel.addEventListener('change', function() { var w = document.getElementById('uf-kisit-detay-wrap'); if (w) w.style.display = this.value === 'E' ? 'block' : 'none'; });
  var yasakSel = document.getElementById('uf-ihracat-yasak');
  if (yasakSel) yasakSel.addEventListener('change', function() { var w = document.getElementById('uf-yasak-detay-wrap'); if (w) w.style.display = this.value === 'E' ? 'block' : 'none'; });
  var dibSel = document.getElementById('uf-dib-asama');
  if (dibSel) dibSel.addEventListener('change', function() { var w = document.getElementById('uf-dib-warn'); if (w) w.style.display = this.value === 'E' ? 'block' : 'none'; });
  var tedSel = document.getElementById('uf-tedarikci');
  if (tedSel) tedSel.addEventListener('change', function() { var kodEl = document.getElementById('uf-duay-kodu'); if (kodEl && !parseInt(document.getElementById('uf-eid')?.value || '0')) kodEl.value = _ufGenerateDuayKodu(this.value, allUrunler.length); });
  if (u?.gizliHileTesti && Array.isArray(u.gizliHileTesti)) u.gizliHileTesti.forEach(function(val) { var cb = form.querySelector('.uf-hile-cb[value="' + val + '"]'); if (cb) cb.checked = true; });
  setTimeout(function() { window._ufRecalc?.(); }, 50);
};

/** @description Asama tamamlama butonu */
window._ufCompleteStage = function(stageKey) {
  var stage = UF_STAGES.find(function(s) { return s.key === stageKey; });
  if (!stage) return;
  var missing = [];
  stage.required.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el || !(el.value || '').trim()) {
      var lbl = el?.closest('div')?.querySelector('.fl')?.textContent?.replace(' *', '').replace('\u24d8', '').trim() || id;
      missing.push(lbl);
    }
  });
  if (missing.length > 0) {
    window.toast?.('L\u00fctfen ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? ' ve ' + (missing.length - 3) + ' alan daha' : '') + ' tamamlay\u0131n', 'err');
    stage.required.forEach(function(id) { var el = document.getElementById(id); if (el && !(el.value || '').trim()) el.style.borderColor = '#DC2626'; });
    return;
  }
  if (stageKey === 1) {
    var teknik = (document.getElementById('uf-teknik')?.value || '');
    if (teknik.length < 30) { window.toast?.('Teknik a\u00e7\u0131klama en az 30 karakter olmal\u0131 (\u015fu an ' + teknik.length + ')', 'err'); return; }
    var stdAd = (document.getElementById('uf-standart-adi')?.value || '').trim();
    if (stdAd && !/^[a-zA-Z0-9\s\-\/\(\)\.,%&:;]+$/.test(stdAd)) { window.toast?.('Standart Ad: Sadece \u0130ngilizce karakter kullan\u0131n', 'err'); return; }
  }
  if (stageKey === 2) {
    var netV = parseFloat(document.getElementById('uf-net')?.value || '0');
    var brutV = parseFloat(document.getElementById('uf-brut')?.value || '0');
    if (brutV > 0 && netV > brutV) { window.toast?.('Br\u00fct a\u011f\u0131rl\u0131k net a\u011f\u0131rl\u0131ktan k\u00fc\u00e7\u00fck olamaz!', 'err'); return; }
  }
  window.toast?.('\u2705 Harika! A\u015fama ' + stageKey + ' tamamland\u0131' + (stageKey < 4 ? ' \u2014 A\u015fama ' + (stageKey + 1) + ' a\u00e7\u0131ld\u0131' : ' \u2014 T\u00fcm a\u015famalar tamam!'), 'ok');
  if (stageKey < 4) window._ufToggleStage(stageKey + 1);
  window._ufRecalc?.();
};

window._ufRequestChange = function() { window.toast?.('De\u011fi\u015fiklik talebi \u2014 y\u00f6neticinize bildirin', 'info'); };
window._ufAddDiscovery = function() {
  var eid = parseInt(document.getElementById('uf-eid')?.value || '0');
  if (!eid) { window.toast?.('\u00d6nce \u00fcr\u00fcn\u00fc kaydedin', 'err'); return; }
  var content = prompt('Ke\u015fif i\u00e7eri\u011fi:');
  if (!content) return;
  var d = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var item = d.find(function(x) { return x.id === eid; });
  if (!item) return;
  if (!item.kesfedilen) item.kesfedilen = [];
  var cu = window.Auth?.getCU?.();
  item.kesfedilen.push({ by: cu?.id, name: cu?.name, ts: new Date().toISOString(), content: content });
  if (typeof storeUrunler === 'function') storeUrunler(d);
  window.toast?.('\ud83d\udca1 Ke\u015fif kaydedildi \u2713', 'ok');
};

// ════════════════════════════════════════════════════════════════
// KAYDET — 4 ASAMALI VERI
// ════════════════════════════════════════════════════════════════

/** @description Urun kaydet — 4 asamali form */
window._saveUrunInline = function() {
  var g = function(id) { return document.getElementById(id); };
  var v = function(id) { return (g(id)?.value || '').trim(); };
  var errors = [];
  if (!v('uf-tedarikci')) errors.push('Tedarik\u00e7i');
  if (!v('uf-duay-adi')) errors.push('Duay \u00dcr\u00fcn Ad\u0131');
  if (!v('uf-standart-adi')) errors.push('Standart \u0130ngilizce Ad');
  if (!v('uf-kdv')) errors.push('KDV Oran\u0131');
  if (!v('uf-birim')) errors.push('Birim');
  var teknikVal = v('uf-teknik');
  if (!teknikVal || teknikVal.length < 30) errors.push('Teknik A\u00e7\u0131klama (min 30 karakter)');
  if (errors.length) { window.toast?.('A\u015fama 1 eksik \u2014 ' + errors.slice(0, 3).join(', ') + (errors.length > 3 ? ' ...' : ''), 'err'); return; }
  var stdAd = v('uf-standart-adi');
  if (stdAd && !/^[a-zA-Z0-9\s\-\/\(\)\.,%&:;]+$/.test(stdAd)) { window.toast?.('Standart Ad: Sadece \u0130ngilizce karakter', 'err'); return; }
  var net = parseFloat(v('uf-net') || '0');
  var brut = parseFloat(v('uf-brut') || '0');
  if (brut > 0 && net > brut) { window.toast?.('Br\u00fct \u2265 Net olmal\u0131!', 'err'); return; }

  var ted = v('uf-tedarikci');
  var eid = parseInt(v('uf-eid') || '0');
  var d = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var now = new Date().toISOString();
  var cu = window.Auth?.getCU?.();
  var hileTesti = [];
  document.querySelectorAll('.uf-hile-cb:checked').forEach(function(cb) { hileTesti.push(cb.value); });

  var asama = 1;
  if (_ufStagePct(1) === 100) asama = 2;
  if (_ufStagePct(2) === 100) asama = 3;
  if (_ufStagePct(3) === 100) asama = 4;

  var entry = {
    tedarikci: ted, saticiId: ted,
    saticiKategori: v('uf-satici-kat'), gorselUrl: v('uf-gorsel-url'),
    saticiKodu: v('uf-satici-kodu'),
    duayAdi: v('uf-duay-adi'), urunAdi: v('uf-duay-adi'),
    standartAdi: stdAd, kdvOrani: parseInt(v('uf-kdv') || '20'),
    birim: v('uf-birim') || 'Adet', teknikAciklama: teknikVal,
    renk: v('uf-renk'), saticiOzelNotu: v('uf-satici-notu'),
    kategori: v('uf-kategori'), marka: v('uf-marka'),
    gercekUretici: v('uf-uretici'), muadilUrun: v('uf-muadil'),
    mensei: v('uf-mensei'), imolu: v('uf-imo') || 'H',
    imoSinifi: v('uf-imo-sinif'), imoTehlikeNo: v('uf-imo-un'),
    dibli: v('uf-dib') || 'H',
    ihracatKisiti: v('uf-ihracat-kisit') || 'H', ihracatKisitiDetay: v('uf-kisit-detay'),
    ihracatYasagi: v('uf-ihracat-yasak') || 'H', ihracatYasakDetay: v('uf-yasak-detay'),
    netAgirlik: net || null, brutAgirlik: brut || null,
    gizliHileTesti: hileTesti,
    paketEn: parseFloat(v('uf-pkt-en')) || null, paketBoy: parseFloat(v('uf-pkt-boy')) || null,
    paketYukseklik: parseFloat(v('uf-pkt-yuk')) || null, paketAdet: parseInt(v('uf-pkt-adet')) || null,
    koliGorselUrl: v('uf-koli-gorsel-url'), paletGorselUrl: v('uf-palet-gorsel-url'),
    koliIciGorselUrl: v('uf-koli-ici-gorsel-url'),
    turkceAd: v('uf-turkce-ad'), orijinalAdi: v('uf-turkce-ad') || v('uf-duay-adi'),
    gumrukTanim: v('uf-gumruk-tanim'), gumrukAciklama: v('uf-gumruk-tanim'),
    gtip: v('uf-gtip'), dibAsamaVar: v('uf-dib-asama') || 'H',
    asama: asama, kpiSkoru: _ufCalcKPI().pct,
    status: 'aktif', ts: now, updatedAt: now,
  };

  entry.ihracatBilgileriTam = typeof _calcIhracatTam === 'function' ? _calcIhracatTam(entry) : false;
  entry.tamamlanmaPct = typeof _calcIhracatPct === 'function' ? _calcIhracatPct(entry) : 0;

  if (eid) {
    var it = d.find(function(x) { return x.id === eid; });
    if (it) {
      if (it.salesLocked && !window.isAdmin?.()) {
        var criticalFields = ['duayAdi', 'standartAdi', 'tedarikci', 'mensei'];
        var changed = criticalFields.filter(function(f) { return entry[f] && entry[f] !== it[f]; });
        if (changed.length) { window.toast?.('\ud83d\udd12 Sat\u0131\u015f teklifi verilmi\u015f \u2014 ' + changed.join(', ') + ' de\u011fi\u015ftirilemez', 'err'); return; }
      }
      if (!it.changeLog) it.changeLog = [];
      var changes = [];
      Object.keys(entry).forEach(function(k) { if (entry[k] !== undefined && entry[k] !== it[k] && k !== 'ts' && k !== 'updatedAt' && k !== 'kpiSkoru' && k !== 'asama') changes.push(k); });
      it.changeLog.push({ ts: now, by: cu?.id, name: cu?.name, action: 'g\u00fcncelleme', fields: changes });
      Object.assign(it, entry);
    }
  } else {
    entry.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
    entry.duayKodu = v('uf-duay-kodu') !== 'Otomatik' ? v('uf-duay-kodu') : _ufGenerateDuayKodu(ted, d.length);
    entry.urunKodu = entry.duayKodu;
    entry.createdBy = cu?.id; entry.createdAt = now;
    entry.changeLog = [{ ts: now, by: cu?.id, name: cu?.name, action: 'olu\u015fturma' }];
    d.unshift(entry);
    if (typeof window.logActivity === 'function') window.logActivity('urun', '"' + entry.duayAdi + '" eklendi \u2014 ' + entry.duayKodu);
  }

  if (typeof storeUrunler === 'function') storeUrunler(d);
  document.getElementById('urun-inline-form')?.remove();
  window.toast?.(eid ? 'G\u00fcncellendi \u2713 \u2014 KPI: %' + entry.kpiSkoru : '\u00dcr\u00fcn eklendi: ' + entry.duayKodu + ' \u2014 KPI: %' + entry.kpiSkoru, 'ok');
  window.renderUrunler?.();
};

// ── Sistem menusune Talimatlar ekle (app.js dokunulmazligi) ──
(function() {
  if (typeof _TN2_GROUPS === 'undefined') return;
  // Talimatlar → Sistem
  if (_TN2_GROUPS.sistem && Array.isArray(_TN2_GROUPS.sistem.mods)) {
    if (!_TN2_GROUPS.sistem.mods.some(function(m) { return m.id === 'talimatlar'; }))
      _TN2_GROUPS.sistem.mods.push({ id: 'talimatlar', label: 'Talimatlar' });
  }
  // NAV-001: ihracat-ops → Satinalma'dan cikar, Operasyon'a tasi
  if (_TN2_GROUPS.satinalma && Array.isArray(_TN2_GROUPS.satinalma.mods)) {
    _TN2_GROUPS.satinalma.mods = _TN2_GROUPS.satinalma.mods.filter(function(m) { return m.id !== 'ihracat-ops'; });
  }
  if (_TN2_GROUPS.operasyon && Array.isArray(_TN2_GROUPS.operasyon.mods)) {
    if (!_TN2_GROUPS.operasyon.mods.some(function(m) { return m.id === 'ihracat-ops'; }))
      _TN2_GROUPS.operasyon.mods.unshift({ id: 'ihracat-ops', label: 'İhracat Ops' });
  }
  // NAV-001: Dashboard → logo tiklaninca acilir
  if (_TN2_GROUPS.dashboard && Array.isArray(_TN2_GROUPS.dashboard.mods)) {
    _TN2_GROUPS.dashboard.mods = _TN2_GROUPS.dashboard.mods.filter(function(m) { return m.id !== 'dashboard'; });
    if (_TN2_GROUPS.dashboard.mods.length === 0) delete _TN2_GROUPS.dashboard;
  }
})();

// NAV-001: Logo tiklaninca dashboard
(function() {
  setTimeout(function() {
    var logo = document.querySelector('.tn2-logo,.nav-logo,[data-nav-logo]');
    if (logo && !logo.dataset.dashLinked) {
      logo.dataset.dashLinked = '1';
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', function(e) { e.stopPropagation(); window.App?.nav?.('dashboard'); });
    }
  }, 1000);
})();

// ══ API-KEY-001: Ayarlar Entegrasyonlar ══════════════════════
window._saveAnthropicKey = function() {
  var val = document.getElementById('set-anthropic-key')?.value?.trim();
  if (!val || val.indexOf('\u25cf') !== -1) { window.toast?.('Gecersiz key', 'err'); return; }
  if (val.indexOf('sk-ant-') !== 0) { window.toast?.('sk-ant- ile baslamali', 'err'); return; }
  try { localStorage.setItem('ak_anthropic_key', btoa(val)); } catch(e) { window.toast?.('Kayit hatasi', 'err'); return; }
  window.toast?.('API key kaydedildi', 'ok');
  window._renderEntegrasyonlar?.();
};
window._clearAnthropicKey = function() {
  window.confirmModal?.('API key silinecek. Devam?', { danger:true, confirmText:'Sil', onConfirm:function() {
    localStorage.removeItem('ak_anthropic_key');
    window.toast?.('API key silindi', 'ok');
    window._renderEntegrasyonlar?.();
  }});
};
window._renderEntegrasyonlar = function() {
  var panel = document.getElementById('panel-settings');
  if (!panel) return;
  var storedKey = localStorage.getItem('ak_anthropic_key');
  var hasKey = !!storedKey;
  var h = '<div style="max-width:600px;margin:0 auto;padding:24px">';
  h += '<div style="font-size:18px;font-weight:500;color:var(--t);margin-bottom:16px">Entegrasyonlar</div>';
  h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:16px;margin-bottom:16px">';
  h += '<div style="font-size:13px;font-weight:500;margin-bottom:4px">Anthropic API Key</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">OCR belge okuma ve Smart Evrak analizi icin gereklidir.</div>';
  h += '<input type="password" class="fi" id="set-anthropic-key" placeholder="sk-ant-..." value="' + (hasKey ? '\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf' : '') + '" style="width:100%;font-family:monospace;margin-bottom:8px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()">';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._saveAnthropicKey()" style="font-size:11px">Kaydet</button>';
  if (hasKey) h += '<button class="btn btns btnd" onclick="event.stopPropagation();window._clearAnthropicKey()" style="font-size:11px">Temizle</button>';
  h += '<span style="font-size:11px;color:' + (hasKey ? '#16A34A' : '#D97706') + ';font-weight:500">' + (hasKey ? 'Kayitli \u2713' : 'Girilmedi') + '</span>';
  h += '</div></div>';
  // EmailJS ayarlari
  var ejPub = localStorage.getItem('ak_emailjs_public');
  var ejSvc = localStorage.getItem('ak_emailjs_service');
  var hasEj = !!ejPub && !!ejSvc;
  h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:16px;margin-bottom:16px">';
  h += '<div style="font-size:13px;font-weight:500;margin-bottom:4px">EmailJS (Dis Taraf Mail)</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">Dis taraf belge yukleme portali icin e-posta bildirimi.</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
  h += '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">Public Key</div><input class="fi" id="set-ej-pub" placeholder="..." style="font-size:11px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">Service ID</div><input class="fi" id="set-ej-svc" placeholder="service_..." style="font-size:11px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">Template (Yukleyene)</div><input class="fi" id="set-ej-tpl-up" placeholder="template_..." style="font-size:11px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '<div><div style="font-size:10px;color:var(--t3);margin-bottom:2px">Template (Bize)</div><input class="fi" id="set-ej-tpl-adm" placeholder="template_..." style="font-size:11px" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window._saveEmailJSKeys()" style="font-size:11px">Kaydet</button>';
  h += '<span style="font-size:11px;color:' + (hasEj ? '#16A34A' : '#D97706') + ';font-weight:500">' + (hasEj ? 'Kayitli \u2713' : 'Girilmedi') + '</span>';
  h += '</div></div>';
  h += '</div>';
  panel.innerHTML = h;
};

window._saveEmailJSKeys = function() {
  var pub = (document.getElementById('set-ej-pub')?.value || '').trim();
  var svc = (document.getElementById('set-ej-svc')?.value || '').trim();
  var tplUp = (document.getElementById('set-ej-tpl-up')?.value || '').trim();
  var tplAdm = (document.getElementById('set-ej-tpl-adm')?.value || '').trim();
  if (!pub || !svc) { window.toast?.('Public Key ve Service ID zorunlu', 'err'); return; }
  localStorage.setItem('ak_emailjs_public', btoa(pub));
  localStorage.setItem('ak_emailjs_service', btoa(svc));
  if (tplUp) localStorage.setItem('ak_emailjs_template_up', btoa(tplUp));
  if (tplAdm) localStorage.setItem('ak_emailjs_template_admin', btoa(tplAdm));
  window.toast?.('EmailJS ayarlari kaydedildi', 'ok');
  window._renderEntegrasyonlar?.();
};

// Settings navigasyonu — app_patch render map'e ekle
(function() {
  if (typeof _TN2_GROUPS !== 'undefined' && _TN2_GROUPS.sistem && Array.isArray(_TN2_GROUPS.sistem.mods)) {
    // Settings zaten var, render'i override et
  }
  // settings paneli acilinca entegrasyonlar render
  var origRenders = window._patchedRenders;
  if (origRenders && !origRenders.settings) {
    origRenders.settings = function() { window._renderEntegrasyonlar?.(); };
  }
})();

// ══ TOPBAR-LINK-001: Hizli erisim kisayollari ════════════════
var _QL_KEY = 'ak_quicklinks';
function _loadQL() { try { return JSON.parse(localStorage.getItem(_QL_KEY) || '[]'); } catch(e) { return []; } }
function _storeQL(d) { localStorage.setItem(_QL_KEY, JSON.stringify(d.slice(0, 10))); }

(function() {
  setTimeout(function() {
    var topRight = document.querySelector('.tn2-right,.nav-right,.topbar-right,[data-topbar-right]');
    if (!topRight) topRight = document.querySelector('.tn2-bar > div:last-child,.topbar > div:last-child');
    if (!topRight || topRight.querySelector('[data-quicklink-btn]')) return;
    var btn = document.createElement('div');
    btn.dataset.quicklinkBtn = '1';
    btn.style.cssText = 'position:relative;cursor:pointer;display:flex;align-items:center';
    btn.innerHTML = '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--s2);color:var(--t2)" title="Hizli Erisim">\u2606</div>';
    btn.onclick = function(e) {
      e.stopPropagation();
      var dd = btn.querySelector('.ql-dropdown');
      if (dd) { dd.remove(); return; }
      var links = _loadQL();
      var dropdown = document.createElement('div');
      dropdown.className = 'ql-dropdown';
      dropdown.style.cssText = 'position:absolute;top:100%;right:0;width:220px;background:var(--sf);border:1px solid var(--b);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;padding:8px 0;margin-top:4px';
      var dh = '<div style="padding:4px 12px;font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase">Kisayollar</div>';
      if (!links.length) dh += '<div style="padding:12px;font-size:11px;color:var(--t3);text-align:center">Henuz kisayol yok</div>';
      links.forEach(function(l, i) {
        dh += '<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
        dh += '<span onclick="event.stopPropagation();' + (l.tip === 'dis' ? 'window.open(\'' + l.url.replace(/'/g, "\\'") + '\')' : 'window.App?.nav?.(\'' + l.url + '\')') + '" style="flex:1;font-size:11px;color:var(--t)">' + (typeof escapeHtml === 'function' ? escapeHtml(l.ad) : l.ad) + '</span>';
        dh += '<span onclick="event.stopPropagation();window._qlSil(' + i + ')" style="font-size:10px;color:var(--t3);cursor:pointer">\u2717</span>';
        dh += '</div>';
      });
      dh += '<div style="border-top:1px solid var(--b);padding:6px 12px;margin-top:4px"><button onclick="event.stopPropagation();window._qlEkle()" style="width:100%;padding:6px;border:1px dashed var(--b);border-radius:6px;background:none;font-size:10px;color:var(--t3);cursor:pointer;font-family:inherit">+ Kisayol Ekle</button></div>';
      dropdown.innerHTML = dh;
      btn.appendChild(dropdown);
      setTimeout(function() { document.addEventListener('click', function _qlClose() { dropdown.remove(); document.removeEventListener('click', _qlClose); }); }, 10);
    };
    topRight.insertBefore(btn, topRight.firstChild);
  }, 1500);
})();

window._qlEkle = function() {
  var ad = prompt('Kisayol adi:'); if (!ad) return;
  var url = prompt('Hedef (modul adi veya URL):', 'dashboard'); if (!url) return;
  var tip = url.indexOf('http') === 0 ? 'dis' : 'ic';
  var links = _loadQL();
  links.push({ ad: ad.trim(), url: url.trim(), tip: tip });
  _storeQL(links);
  window.toast?.('Kisayol eklendi', 'ok');
};
window._qlSil = function(idx) {
  var links = _loadQL();
  links.splice(idx, 1);
  _storeQL(links);
  window.toast?.('Kisayol silindi', 'ok');
  // Dropdown'u yenile
  var btn = document.querySelector('[data-quicklink-btn]');
  if (btn) { var dd = btn.querySelector('.ql-dropdown'); if (dd) dd.remove(); btn.click(); }
};

// ══ KPI-FIRMA-001: Tedarikci/Firma KPI Paneli ════════════════
window._renderFirmaKpi = function() {
  var panel = document.getElementById('panel-firma-kpi');
  if (!panel) { panel = document.getElementById('ihr-detay-content'); }
  if (!panel) return;
  var teklifler = []; try { teklifler = JSON.parse(localStorage.getItem('ak_ihr_teklifler') || '[]'); } catch(e) {}
  var uploads = []; try { uploads = JSON.parse(localStorage.getItem('ak_ihr_uploads') || '[]'); } catch(e) {}
  var fwList = typeof window.loadIhracatForwarder === 'function' ? window.loadIhracatForwarder() : [];
  if (!fwList.length) { try { fwList = JSON.parse(localStorage.getItem('ak_forwarder1') || '[]'); } catch(e) {} }
  var gmList = typeof window.loadIhracatGumrukcu === 'function' ? window.loadIhracatGumrukcu() : [];
  if (!gmList.length) { try { gmList = JSON.parse(localStorage.getItem('ak_gumrukcu1') || '[]'); } catch(e) {} }
  var tumFirmalar = fwList.map(function(f) { return { id: f.id, ad: f.firma_adi, tip: 'FW' }; }).concat(gmList.map(function(g) { return { id: g.id, ad: g.firma_adi, tip: 'GM' }; }));

  var h = '<div style="max-width:800px;margin:0 auto;padding:16px">';
  h += '<div style="font-size:16px;font-weight:600;margin-bottom:16px">Tedarikci / Firma KPI</div>';
  if (!tumFirmalar.length) { h += '<div style="text-align:center;padding:32px;color:var(--t3)">Kayitli firma yok</div>'; }
  tumFirmalar.forEach(function(firma) {
    var firmaTeklifler = teklifler.filter(function(t) { return String(t.firma_id) === String(firma.id); });
    var firmaUploads = uploads.filter(function(u) { return String(u.muhatap_ad).indexOf(firma.ad) !== -1; });
    // Hesaplamalar
    var toplamTeklif = firmaTeklifler.length;
    var ortHiz = 0;
    if (toplamTeklif > 0) { var toplam = firmaTeklifler.reduce(function(s, t) { return s + (t.transit_gun || 0); }, 0); ortHiz = Math.round(toplam / toplamTeklif); }
    var belgeSayisi = firmaUploads.length;
    var skorPuan = Math.min(100, (toplamTeklif * 20) + (belgeSayisi * 15) + (ortHiz < 10 ? 30 : ortHiz < 20 ? 15 : 0));
    var skorHarf = skorPuan >= 80 ? 'A' : skorPuan >= 60 ? 'B' : skorPuan >= 40 ? 'C' : 'D';
    var skorRenk = skorPuan >= 80 ? '#16A34A' : skorPuan >= 60 ? '#D97706' : '#DC2626';
    h += '<div style="border:0.5px solid var(--b);border-radius:10px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:16px">';
    h += '<div style="width:40px;height:40px;border-radius:50%;background:' + skorRenk + '18;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:' + skorRenk + ';flex-shrink:0">' + skorHarf + '</div>';
    h += '<div style="flex:1"><div style="font-size:13px;font-weight:500">' + (typeof escapeHtml === 'function' ? escapeHtml(firma.ad) : firma.ad) + ' <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--s2);color:var(--t3)">' + firma.tip + '</span></div>';
    h += '<div style="font-size:10px;color:var(--t3);display:flex;gap:12px;margin-top:2px">';
    h += '<span>Teklif: ' + toplamTeklif + '</span>';
    h += '<span>Belge: ' + belgeSayisi + '</span>';
    h += '<span>Ort. Transit: ' + (ortHiz || '—') + 'g</span>';
    h += '<span>Skor: %' + skorPuan + '</span>';
    h += '</div></div>';
    h += '<div style="font-size:24px;font-weight:700;color:' + skorRenk + '">' + skorPuan + '</div>';
    h += '</div>';
  });
  h += '</div>';
  panel.innerHTML = h;
};

/* ── MENU-GRUP-001: Kargo → Lojistik, SA-V2 → Satınalma ───── */
(function _menuGrupDuzenle() {
  if (!window._TN2_GROUPS) return;
  var G = window._TN2_GROUPS;
  /* Kargo: Satınalma'dan çıkar, Lojistik'e taşı */
  if (G.satinalma && Array.isArray(G.satinalma.mods)) {
    G.satinalma.mods = G.satinalma.mods.filter(function(m) { return m.id !== 'kargo'; });
  }
  if (G.lojistik && Array.isArray(G.lojistik.mods)) {
    if (!G.lojistik.mods.some(function(m) { return m.id === 'kargo'; })) {
      G.lojistik.mods.unshift({ id: 'kargo', label: 'Kargo Takibi' });
    }
  }
  /* Satınalma menüsü — tam yeniden yapılandır */
  if (G.satinalma) {
    G.satinalma.mods = [
      { id: 'satin-alma',        label: 'Al\u0131\u015f Teklifleri V2' },
      { id: 'urunler',           label: '\u00dcr\u00fcn Katalo\u011fu' },
      { id: 'satinalma-siparis', label: 'Sipari\u015fler' },
      { id: 'numune',            label: 'Numune Ar\u015fivi' },
    ];
  }
})();

/* ── URUN-IMPORT-001: Import Önizleme Modalı ──────────────── */
window._importOnizlemeGoster = function(yeniUrunler, hatalar, mevcutListe) {
  var mevcut=document.getElementById('import-onizleme-modal');
  if(mevcut) mevcut.remove();
  var mo=document.createElement('div');
  mo.id='import-onizleme-modal';
  mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:30px 0;overflow-y:auto';
  var h='<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:900px;overflow:hidden">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  h+='<div><div style="font-size:14px;font-weight:500;color:var(--t)">Excel Import Önizleme</div>';
  h+='<div style="font-size:10px;color:var(--t3);margin-top:1px">'+yeniUrunler.length+' ürün yüklenecek'+(hatalar.length?' · '+hatalar.length+' hata var':'')+'</div></div>';
  h+='<button onclick="event.stopPropagation();document.getElementById(\'import-onizleme-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3)">×</button></div>';
  if(hatalar.length){
    h+='<div style="background:#FCEBEB;padding:10px 20px;border-bottom:0.5px solid var(--b)">';
    h+='<div style="font-size:10px;font-weight:500;color:#A32D2D;margin-bottom:4px">⚠ Hatalı Satırlar (atlanacak)</div>';
    hatalar.slice(0,5).forEach(function(e){ h+='<div style="font-size:10px;color:#A32D2D">• '+e+'</div>'; });
    if(hatalar.length>5) h+='<div style="font-size:10px;color:#A32D2D">...ve '+(hatalar.length-5)+' hata daha</div>';
    h+='</div>';
  }
  h+='<div style="overflow-x:auto;max-height:400px">';
  h+='<table style="width:100%;border-collapse:collapse;font-size:10px">';
  h+='<thead><tr style="background:var(--s2);position:sticky;top:0">';
  ['#','DUAY KODU','ÜRÜN ADI','TEDARİKÇİ','KATEGORİ','BİRİM','ALIŞ F','DÖVİZ'].forEach(function(k){
    h+='<th style="padding:6px 8px;text-align:left;border-bottom:0.5px solid var(--b);font-size:9px;white-space:nowrap">'+k+'</th>';
  });
  h+='</tr></thead><tbody>';
  yeniUrunler.forEach(function(u,i){
    h+='<tr style="border-bottom:0.5px solid var(--b)'+(i%2===0?';background:var(--s2)':'')+'">';
    h+='<td style="padding:5px 8px;color:var(--t3)">'+(i+1)+'</td>';
    h+='<td style="padding:5px 8px;font-family:monospace;font-size:9px">'+(u.duayKodu||'—')+'</td>';
    h+='<td style="padding:5px 8px;font-weight:500;color:var(--t)">'+(u.urunAdi||u.orijinalAdi||'—')+'</td>';
    h+='<td style="padding:5px 8px;color:var(--t2)">'+(u.tedarikci||'—')+'</td>';
    h+='<td style="padding:5px 8px;color:var(--t3)">'+(u.kategori||'—')+'</td>';
    h+='<td style="padding:5px 8px;color:var(--t3)">'+(u.birim||'—')+'</td>';
    h+='<td style="padding:5px 8px;text-align:right">'+(u.alisF||'—')+'</td>';
    h+='<td style="padding:5px 8px;color:var(--t3)">'+(u.para||'USD')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  h+='<div style="font-size:11px;color:var(--t3)">Bu işlem geri alınamaz. Mevcut ürünler etkilenmez, sadece yeni ürünler eklenir.</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button onclick="event.stopPropagation();document.getElementById(\'import-onizleme-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  h+='<button onclick="event.stopPropagation();window._importOnizlemeOnayla()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">'+yeniUrunler.length+' Ürünü Kaydet</button>';
  h+='</div></div>';
  h+='</div>';
  mo.innerHTML=h;
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  document.body.appendChild(mo);
  window._importOnayListe = mevcutListe;
};

window._importOnizlemeOnayla = function() {
  if(!window._importOnayListe){window.toast?.('Veri bulunamadı','err');return;}
  if(typeof storeUrunler==='function') storeUrunler(window._importOnayListe);
  document.getElementById('import-onizleme-modal')?.remove();
  window.toast?.('Import tamamlandı: '+window._importOnayListe.length+' ürün','ok');
  window.renderUrunler?.();
  window._importOnayListe=null;
};

/* ── URUN-LIST-001: Peek Panel ─────────────────────────────── */
window._urunPeekAc = function(id) {
  var mevcut = document.getElementById('urun-peek-panel');
  if (mevcut && mevcut.dataset.id === String(id)) { mevcut.remove(); return; }
  if (mevcut) mevcut.remove();
  var esc = typeof window.escapeHtml === 'function' ? window.escapeHtml : function(s) { return String(s || '').replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var u = (typeof window.loadUrunler === 'function' ? window.loadUrunler() : []).find(function(x) { return String(x.id) === String(id); });
  if (!u) return;
  var p = document.createElement('div');
  p.id = 'urun-peek-panel';
  p.dataset.id = String(id);
  p.style.cssText = 'position:fixed;top:118px;right:0;width:300px;height:calc(100vh - 118px);background:var(--sf);border-left:0.5px solid var(--b);z-index:4000;overflow-y:auto;display:flex;flex-direction:column';
  var h = '<div style="padding:14px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  h += '<div style="font-size:12px;font-weight:500;color:var(--t)">Ürün Detayı</div>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'urun-peek-panel\')?.remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:16px">×</button></div>';
  if (u.gorsel) h += '<img src="' + u.gorsel + '" style="width:100%;height:180px;object-fit:cover">';
  h += '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">';
  h += '<div style="font-size:14px;font-weight:500;color:var(--t)">' + esc(u.urunAdi || u.orijinalAdi || '—') + '</div>';
  h += '<div style="font-size:11px;color:var(--t3)">' + esc(u.ingAd || u.standartAdi || '') + '</div>';
  var rows = [
    ['Duay Kodu', u.duayKodu], ['Tedarikçi', u.tedarikci], ['Kategori', u.kategori],
    ['Menşei', u.mensei], ['Adet Türü', u.birim], ['Eski Kod', u.eskiKod],
    ['Tüketim Süresi', u.tuketimSuresi ? (u.tuketimSuresi + ' gün') : null],
    ['Kaydeden', u.createdBy], ['Kayıt Tarihi', u.createdAt]
  ];
  rows.forEach(function(r) {
    if (!r[1]) return;
    h += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--b)">';
    h += '<span style="font-size:10px;color:var(--t3)">' + r[0] + '</span>';
    h += '<span style="font-size:10px;color:var(--t);font-weight:500;text-align:right;max-width:180px">' + esc(String(r[1])) + '</span>';
    h += '</div>';
  });
  if (u.teknikAciklama) { h += '<div style="font-size:10px;color:var(--t2);margin-top:4px;line-height:1.5">' + esc(u.teknikAciklama) + '</div>'; }
  h += '</div>';
  h += '<div style="padding:12px 16px;border-top:0.5px solid var(--b);margin-top:auto;display:flex;gap:6px">';
  h += '<button onclick="event.stopPropagation();window.openUrunForm(\'' + id + '\');document.getElementById(\'urun-peek-panel\')?.remove()" style="flex:1;font-size:11px;padding:7px 0;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Düzenle</button>';
  h += '</div>';
  p.innerHTML = h;
  document.body.appendChild(p);
  document.addEventListener('click', function rm(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', rm); } });
};

/* ── PLATFORM-KURAL-001: Platform Kuralları Paneli ─────────── */
window.renderPlatformKurallari = function() {
  var panel = document.getElementById('panel-platform-rules');
  if(!panel) return;
  var kurallar = [
    {id:'K09',kat:'Veri',baslik:'Rollback Zorunluluğu',aciklama:'Tüm işlemler geri alınabilir olmalı. Silme işlemlerinde soft-delete kullanılır.',durum:'aktif'},
    {id:'K10',kat:'Mimari',baslik:'Merkezi State',aciklama:'Modüller arası doğrudan erişim yasaktır. Tüm veri merkezi store üzerinden okunur.',durum:'aktif'},
    {id:'K11',kat:'Performans',baslik:'10K Kayıt 2s Altı',aciklama:'10.000 kayıt 2 saniyenin altında yüklenmeli. UI etkileşimleri 100ms altı.',durum:'aktif'},
    {id:'K12',kat:'UX',baslik:'Double-Click Önleme',aciklama:'Tüm butonlarda double-click önleme, loading state ve disabled state zorunludur.',durum:'aktif'},
    {id:'K13',kat:'Güvenlik',baslik:'Bağımsız Validasyon',aciklama:'Frontend ve backend validasyonu birbirinden bağımsız çalışmalıdır.',durum:'aktif'},
    {id:'K14',kat:'Mimari',baslik:'Modül İzolasyonu',aciklama:'Modüller birbirine doğrudan erişemez. Sadece window.* API üzerinden iletişim.',durum:'aktif'},
    {id:'K16',kat:'Hata',baslik:'Sessiz Hata Yasağı',aciklama:'Hiçbir hata sessizce yutulmaz. Tüm hatalar loglanır veya kullanıcıya gösterilir.',durum:'aktif'},
    {id:'K17',kat:'Veri',baslik:'Zorunlu Alan Import',aciklama:'Zorunlu alanlar eksik kayıtlar import edilemez.',durum:'aktif'},
    {id:'D10',kat:'UI',baslik:'Tek Render',aciklama:'Aynı element üzerinde çift render yasaktır.',durum:'aktif'},
    {id:'D13',kat:'Mimari',baslik:'Modül State İzolasyonu',aciklama:'Her modül kendi state\'ini yönetir, başka modülün state\'ine dokunmaz.',durum:'aktif'},
    {id:'GK-01',kat:'Güvenlik',baslik:'XSS Koruması',aciklama:'Tüm kullanıcı girdileri _esc() ile sanitize edilir.',durum:'aktif'},
    {id:'GK-08',kat:'RBAC',baslik:'Yetkisiz Menü Gizleme',aciklama:'Kullanıcı yetkisi olmayan menü grupları sidebar\'da görünmez.',durum:'aktif'},
    {id:'GK-19',kat:'UX',baslik:'Dropdown Hover',aciklama:'Sidebar grup hover davranışı tutarlı çalışmalı.',durum:'aktif'},
    {id:'GK-19-ALL',kat:'Açık',baslik:'Bekleyen Görevler',aciklama:'Oturum dokümanı template hazırlanacak.',durum:'bekliyor'}
  ];
  /* --- localStorage'dan durum override --- */
  var durumKey = 'ak_platform_kural_durum_v1';
  var durumlar = JSON.parse(localStorage.getItem(durumKey)||'{}');
  kurallar.forEach(function(k){ if(durumlar[k.id]) k.durum = durumlar[k.id]; });

  var aktifKatTab = window._pkAktifTab||'genel';
  var h = '<div style="padding:20px;max-width:900px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">';
  h += '<div><div style="font-size:16px;font-weight:500;color:var(--t)">Platform Kuralları</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-top:2px">ANAYASA v4.0 — Duay Platform temel kuralları</div></div>';
  h += '<div style="font-size:11px;color:var(--t3)">'+kurallar.filter(function(k){return k.durum==='aktif';}).length+' aktif · '+kurallar.filter(function(k){return k.durum!=='aktif';}).length+' diğer</div>';
  h += '</div>';
  /* --- 6 sekme tab bar --- */
  h += '<div style="display:flex;border-bottom:0.5px solid var(--b);margin-bottom:16px;gap:0">';
  [{id:'genel',lbl:'Genel'},{id:'ui',lbl:'UI'},{id:'veri',lbl:'Veri'},{id:'guvenlik',lbl:'Güvenlik'},{id:'rbac',lbl:'RBAC'},{id:'acik',lbl:'Açık Görevler'}].forEach(function(t){
    var ak=aktifKatTab===t.id;
    h += '<div onclick="event.stopPropagation();window._pkAktifTab=\''+t.id+'\';window.renderPlatformKurallari()" style="padding:8px 16px;font-size:11px;cursor:pointer;border-bottom:'+(ak?'2px solid var(--t)':'2px solid transparent')+';font-weight:'+(ak?'500':'400')+';color:'+(ak?'var(--t)':'var(--t3)')+'">'+t.lbl+'</div>';
  });
  h += '</div>';
  /* --- sekmeye göre filtre --- */
  var katMap = {genel:['Mimari','Performans','Hata'],ui:['UX','UI'],veri:['Veri'],guvenlik:['Güvenlik'],rbac:['RBAC'],acik:['Açık']};
  var gosteKatlar = katMap[aktifKatTab]||['Mimari'];
  var gosterKurallar = kurallar.filter(function(k){return gosteKatlar.indexOf(k.kat)!==-1;});
  /* --- kural kartları --- */
  var isAdmin = window.isAdmin?.();
  if(gosterKurallar.length===0){
    h += '<div style="text-align:center;padding:40px;color:var(--t3);font-size:12px">Bu kategoride kural yok</div>';
  }
  gosterKurallar.forEach(function(k){
    var renk = k.durum==='aktif'?'#0F6E56': k.durum==='donduruldu'?'#6B7280':'#854F0B';
    var bg = k.durum==='aktif'?'#E1F5EE': k.durum==='donduruldu'?'#F3F4F6':'#FAEEDA';
    h += '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;background:var(--sf)">';
    h += '<div style="font-size:10px;font-family:monospace;font-weight:500;color:var(--t);min-width:50px">'+k.id+'</div>';
    h += '<div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:3px">'+k.baslik+'</div>';
    h += '<div style="font-size:10px;color:var(--t2);line-height:1.5">'+k.aciklama+'</div></div>';
    h += '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:'+bg+';color:'+renk+';white-space:nowrap">'+k.durum+'</span>';
    if(isAdmin) {
      h += '<button onclick="event.stopPropagation();window._pkDurumDegistir(\''+k.id+'\')" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);margin-left:6px">'+(k.durum==='aktif'?'Dondur':'Aktifleştir')+'</button>';
    }
    h += '</div>';
  });
  h += '</div>';
  panel.innerHTML = h;
};

/** @description Platform kuralı durum değiştir (admin only) */
window._pkDurumDegistir = function(kuralId) {
  if(!window.isAdmin?.()) return;
  var key = 'ak_platform_kural_durum_v1';
  var durumlar = JSON.parse(localStorage.getItem(key)||'{}');
  durumlar[kuralId] = durumlar[kuralId]==='donduruldu'?'aktif':'donduruldu';
  localStorage.setItem(key, JSON.stringify(durumlar));
  window.toast?.('Kural durumu güncellendi: '+kuralId,'ok');
  window.renderPlatformKurallari?.();
};

/* ── PUSULA-REDIRECT: eski 'pusula' → 'pusula-pro' ─────────── */
(function() {
  var _origNav = window.App && window.App.nav;
  if(!_origNav) return;
  window.App.nav = function(mod, sub, opts) {
    if(mod === 'pusula') mod = 'pusula-pro';
    return _origNav.call(this, mod, sub, opts);
  };
})();

/* ── SIDEBAR: Pusula Pro'yu operasyon grubuna ekle ──────────── */
(function() {
  var g = window._TN2_GROUPS;
  if(!g) return;
  if(g.operasyon && g.operasyon.mods) {
    var zatenVar = g.operasyon.mods.some(function(m){ return m.id === 'pusula-pro'; });
    if(!zatenVar) g.operasyon.mods.unshift({ id:'pusula-pro', label:'Pusula Pro' });
  }
})();

/* SYNC-008: window.Pusula alias — app.js compat */
(function() {
  'use strict';
  if (!window.Pusula && window.PusulaPro) {
    window.Pusula = {
      render: function() { window.renderPusulaPro?.(); },
      updateBadge: function() { window.PusulaPro?.updateBadge?.(); },
      visTasks: function() { return window.PusulaPro?.visTasks?.(); },
      openDetail: function(id) { window.PusulaPro?.openDetail?.(id); },
      setView: function(v, btn) { window.PusulaPro?.setView?.(v, btn); },
      exportXlsx: function() { window.PusulaPro?.exportXlsx?.(); }
    };
  }
  setTimeout(function() {
    if (!window.Pusula && window.PusulaPro) {
      window.Pusula = window.PusulaPro;
    }
  }, 2000);
})();

/* ── MENU-SATINALMA-001: Siparişler Paneli ─────────────────── */
window.renderSatinAlmaSiparis = function() {
  var panel = document.getElementById('panel-satinalma-siparis');
  if (!panel) return;
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  var siparisler = liste.filter(function(t) { return !t.isDeleted && (t.durum === 'onaylandi' || t.durum === 'kabul'); });
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return String(s || ''); };
  var h = '<div style="padding:16px">';
  h += '<div style="font-size:18px;font-weight:500;color:var(--t);margin-bottom:4px">Sipari\u015fler</div>';
  h += '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">Onayl\u0131 al\u0131\u015f tekliflerinden olu\u015fan sipari\u015fler</div>';
  if (!siparisler.length) {
    h += '<div style="text-align:center;padding:60px;color:var(--t3)">Hen\u00fcz onayland\u0131 sipari\u015f yok<br><span style="font-size:11px">Al\u0131\u015f Teklifleri V2\'den teklif onayland\u0131\u011f\u0131nda burada g\u00f6r\u00fcn\u00fcr</span></div>';
  } else {
    h += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
    h += '<thead><tr style="border-bottom:1px solid var(--b)">';
    h += '<th style="padding:8px;text-align:left;color:var(--t3);font-weight:500">Teklif ID</th>';
    h += '<th style="padding:8px;text-align:left;color:var(--t3);font-weight:500">Tedarik\u00e7i</th>';
    h += '<th style="padding:8px;text-align:left;color:var(--t3);font-weight:500">\u00dcr\u00fcn</th>';
    h += '<th style="padding:8px;text-align:right;color:var(--t3);font-weight:500">Toplam</th>';
    h += '<th style="padding:8px;text-align:left;color:var(--t3);font-weight:500">Onay Tarihi</th>';
    h += '<th style="padding:8px;text-align:left;color:var(--t3);font-weight:500">\u0130\u015flemler</th>';
    h += '</tr></thead><tbody>';
    siparisler.forEach(function(t) {
      var urunAdi = typeof window._saV2UrunAdi === 'function' ? window._saV2UrunAdi(t) : (t.urunAdi || '\u2014');
      var toplam = t.toplamTutar || (typeof window._saV2AlisF === 'function' ? window._saV2AlisF(t) : '') || '\u2014';
      var para = t.toplamPara || (typeof window._saV2Para === 'function' ? window._saV2Para(t) : 'USD');
      var tarih = (t.onayTarih || t.updatedAt || '').slice(0, 10);
      h += '<tr style="border-bottom:0.5px solid var(--b);cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
      h += '<td style="padding:8px;font-family:monospace;color:var(--t3);font-size:10px">' + esc(String(t.id || '').slice(-8)) + '</td>';
      h += '<td style="padding:8px;font-weight:500;color:var(--t)">' + esc(t.tedarikci || '\u2014') + '</td>';
      h += '<td style="padding:8px;color:var(--t2)">' + esc(urunAdi) + (t.urunSayisi > 1 ? ' +' + (t.urunSayisi - 1) + ' \u00fcr\u00fcn' : '') + '</td>';
      h += '<td style="padding:8px;text-align:right;color:#0F6E56;font-weight:500">' + esc(toplam) + ' ' + esc(para) + '</td>';
      h += '<td style="padding:8px;color:var(--t3)">' + esc(tarih) + '</td>';
      h += '<td style="padding:8px"><button onclick="event.stopPropagation();window.App?.nav(\'satin-alma\')" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Detay \u2192</button></td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
  }
  h += '</div>';
  panel.innerHTML = h;
};

/* ── LIST-STANDART-001: Global List Helper ──────────────────── */
window._listHelper = {
  sayfalama: function(toplam, sayfa, boyut, renderFn, containerId) {
    var toplamS = Math.ceil(toplam/boyut);
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:0.5px solid var(--b);font-size:10px">';
    h += '<span style="color:var(--t3)">'+((sayfa-1)*boyut+1)+'-'+Math.min(sayfa*boyut,toplam)+' / '+toplam+' kay\u0131t</span>';
    h += '<div style="display:flex;gap:3px">';
    h += '<button onclick="event.stopPropagation();window._lhSayfa(\''+containerId+'\','+(sayfa-1)+','+boyut+',\''+renderFn+'\')" '+(sayfa<=1?'disabled':'')+' style="padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-size:10px">\u2190</button>';
    for(var i=Math.max(1,sayfa-1);i<=Math.min(toplamS,sayfa+1);i++){
      h += '<button onclick="event.stopPropagation();window._lhSayfa(\''+containerId+'\','+i+','+boyut+',\''+renderFn+'\')" style="padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:'+(i===sayfa?'var(--t)':'transparent')+';color:'+(i===sayfa?'var(--sf)':'var(--t2)')+';cursor:pointer;font-size:10px">'+i+'</button>';
    }
    h += '<button onclick="event.stopPropagation();window._lhSayfa(\''+containerId+'\','+(sayfa+1)+','+boyut+',\''+renderFn+'\')" '+(sayfa>=toplamS?'disabled':'')+' style="padding:2px 7px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-size:10px">\u2192</button>';
    h += '</div></div>';
    return h;
  },
  topluBar: function(seciliSay, islemler) {
    if(!seciliSay) return '';
    var h = '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#FAEEDA;border-bottom:0.5px solid #854F0B">';
    h += '<span style="font-size:10px;color:#633806;font-weight:500">'+seciliSay+' kay\u0131t se\u00e7ildi</span>';
    islemler.forEach(function(i){
      h += '<button onclick="event.stopPropagation();'+i.fn+'()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2)">'+i.label+'</button>';
    });
    h += '</div>';
    return h;
  },
  siralaOku: function(key, aktif, yon) {
    if(aktif!==key) return key;
    return yon==='asc'?'desc':'asc';
  },
  renkBadge: function(durum) {
    var renkler = {
      bekleyen:'background:#FAEEDA;color:#633806',
      onaylandi:'background:#E1F5EE;color:#085041',
      kabul:'background:#E1F5EE;color:#085041',
      reddedildi:'background:#FCEBEB;color:#791F1F',
      taslak:'background:#F1EFE8;color:#444441',
      gonderildi:'background:#E6F1FB;color:#0C447C',
      inceliyor:'background:#EEEDFE;color:#3C3489',
      aktif:'background:#E1F5EE;color:#085041',
      pasif:'background:#F1EFE8;color:#444441'
    };
    var stil = renkler[durum]||'background:#F1EFE8;color:#444441';
    return '<span style="font-size:8px;padding:2px 6px;border-radius:8px;'+stil+'">'+durum+'</span>';
  },
  exportCSV: function(basliklar, satirlar, dosyaAdi) {
    var csv = [basliklar].concat(satirlar).map(function(r){
      return r.map(function(c){var s=String(c||'').replace(/"/g,'""');return s.includes(',')||s.includes('"')?'"'+s+'"':s;}).join(',');
    }).join('\n');
    var blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href=url;a.download=(dosyaAdi||'export')+'_'+(new Date().toISOString().slice(0,10))+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast?.('Export tamamland\u0131','ok');
  },
  aksiyon: function(ikonlar) {
    return '<div style="display:flex;gap:2px;justify-content:flex-end">'+ikonlar.map(function(i){
      return '<button onclick="event.stopPropagation();'+i.fn+'" title="'+i.title+'" style="width:22px;height:22px;border:0.5px solid '+(i.renk||'var(--b)')+';border-radius:3px;background:transparent;cursor:pointer;font-size:11px;color:'+(i.renk||'var(--t2)')+'">'+i.ikon+'</button>';
    }).join('')+'</div>';
  }
};

window._lhSayfa = function(containerId, sayfa, boyut, renderFn) {
  if(sayfa<1) return;
  window['_'+containerId+'Sayfa'] = sayfa;
  if(typeof window[renderFn]==='function') window[renderFn]();
};
