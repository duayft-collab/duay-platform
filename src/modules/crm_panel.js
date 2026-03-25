/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/crm_panel.js  —  v8.0.1
 * CRM + Stok + Numune panel HTML inject
 * crm.js ve stok.js ID'leri ile birebir uyumlu
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

const _gcp  = window.g;
const _stcp = (id,v) => { const el = _gcp(id); if (el) el.textContent = v; };
const _isAdminCp = window.isAdmin;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — CRM PANELİ INJECT
// crm.js'in aradığı ID'ler (birebir):
//   sayaçlar : crm-total, crm-active, crm-lead, crm-pipeline, crm-value
//   filtreler: crm-search, crm-status-f, crm-sehir-f
//   render   : crm-view-cont
//   modal    : mo-crm, mo-crm-t, crm-eid, crm-name, crm-contact,
//              crm-phone, crm-email, crm-city, crm-status, crm-value,
//              crm-note, crm-owner
// ════════════════════════════════════════════════════════════════

function _injectCrmPanel() {
  const panel = _gcp('panel-crm');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">🤝 CRM / Müşteriler</div><div class="phs">Müşteri kartları, fırsat takibi ve iletişim geçmişi.</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="exportCrmXlsx()">⬇ Excel</button>
    <button class="btn" onclick="setCrmView('list',null)">☰ Liste</button>
    <button class="btn" onclick="setCrmView('kanban',null)">⊞ Kanban</button>
    <button class="btn btnp" onclick="openCrmModal(null)">+ Müşteri Ekle</button>
  </div>
</div>
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="ms"><div class="msv" id="crm-total">0</div><div class="msl">Toplam</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="crm-active">0</div><div class="msl">✅ Aktif</div></div>
  <div class="ms"><div class="msv" style="color:var(--bl)" id="crm-lead">0</div><div class="msl">🎯 Aday</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="crm-pipeline">0</div><div class="msl">🔄 Süreçte</div></div>
  <div class="ms"><div class="msv" style="color:var(--ac);font-family:'DM Mono',monospace;font-size:16px" id="crm-value">0</div><div class="msl">💰 Potansiyel ₺</div></div>
</div>
<!-- Filtreler -->
<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
  <select class="si" id="crm-status-f" style="width:150px;padding:6px 10px;font-size:12px" onchange="renderCrm()">
    <option value="">Tüm Durumlar</option>
    <option value="lead">🎯 Aday</option>
    <option value="teklif">📄 Teklif Aşaması</option>
    <option value="muzakere">🤝 Müzakere</option>
    <option value="aktif">✅ Aktif Müşteri</option>
    <option value="pasif">😴 Pasif</option>
    <option value="kayip">❌ Kayıp</option>
  </select>
  <select class="si" id="crm-sehir-f" style="width:140px;padding:6px 10px;font-size:12px" onchange="renderCrm()">
    <option value="">Tüm Şehirler</option>
  </select>
  <input class="si" id="crm-search" style="flex:1;min-width:160px;padding:6px 12px" placeholder="🔍 Müşteri/firma ara..." oninput="renderCrm()">
</div>
<div id="crm-view-cont"></div>

    <div class="mo" id="mo-crm">
  <div class="moc" style="max-width:580px;width:95vw">
    <div class="mt" id="mo-crm-t">Müşteri Ekle</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">FİRMA / MÜŞTERI ADI <span style="color:var(--rd)">*</span></div><input class="fi" id="crm-name" placeholder="…"></div>
      <div class="fg"><div class="fl">YETKİLİ KİŞİ</div><input class="fi" id="crm-contact" placeholder="Ad Soyad"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">TELEFON</div><input class="fi" id="crm-phone" placeholder="0212…"></div>
      <div class="fg"><div class="fl">E-POSTA</div><input class="fi" id="crm-email" placeholder="…"></div>
      <div class="fg"><div class="fl">ŞEHİR</div><input class="fi" id="crm-city" placeholder="İstanbul…"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">DURUM</div>
        <select class="fi" id="crm-status"><option value="lead">🎯 Aday</option><option value="teklif">📄 Teklif</option><option value="muzakere">🤝 Müzakere</option><option value="aktif">✅ Aktif</option><option value="pasif">😴 Pasif</option><option value="kayip">❌ Kayıp</option></select>
      </div>
      <div class="fg"><div class="fl">POTANSİYEL (₺)</div><input type="number" class="fi" id="crm-value" placeholder="0"></div>
      <div class="fg"><div class="fl">SORUMLU</div><select class="fi" id="crm-owner"></select></div>
    </div>
    <div class="fg"><div class="fl">NOT / İLGİ ALANI</div><textarea class="fi" id="crm-note" rows="2" style="resize:vertical" placeholder="…"></textarea></div>
    <input type="hidden" id="crm-eid">
    <div class="mof"><button class="btn" onclick="closeMo('mo-crm')">İptal</button><button class="btn btnp" onclick="saveCrm()">Kaydet</button></div>
  </div>
</div>
  `;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — STOK PANELİ INJECT
// stok.js'in aradığı ID'ler (birebir):
//   sayaçlar : stk-total, stk-giris, stk-cikis, stk-bekle, stk-demirbaş
//   liste    : stok-list
//   demirbaş : demirbaslar-list, db-filter-user, db-filter-status,
//              db-total, db-active, db-bekle, db-iade
//   modal    : mo-stok, mo-stk-t, stk-eid, stk-tür, stk-dir, stk-name,
//              stk-qty, stk-date, stk-imei, stk-kod, stk-zimmet-user,
//              stk-zimmet-date, stk-iade-date, stk-user, stk-bilgi-notu,
//              stk-img, stk-img-preview, stk-foto-required, stk-foto-opt,
//              stk-doc, stk-note, stk-imei-row, stk-zimmet-row,
//              btn-stk-tutanak
// ════════════════════════════════════════════════════════════════

function _injectStokPanel() {
  const panel = _gcp('panel-stok');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = `
    <div class="ph">
  <div><div class="pht">📦 Ürün & Zimmet Yönetimi</div><div class="phs">Stok girişi, kişisel zimmet ve demirbaş takibi.</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="exportStokXlsx()">⬇ Excel</button>
    <button class="btn btns" onclick="importStokXlsx()">↑ İçe Aktar</button>
    <input type="file" id="stok-import-file" accept=".xlsx,.xls" style="display:none" onchange="processStokImport(this)">
    <button class="btn" onclick="openStokModalTur('stok')">📦 Ürün Girişi</button>
    <button class="btn" onclick="openStokModal('cikis')">📤 İade / Çıkış</button>
    <button class="btn btnp" onclick="openStokModalTur('zimmet')">🔑 Zimmet Ver</button>
  </div>
</div>
<!-- Hızlı tür seçim kartları -->
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
  <div style="background:var(--blb);border-radius:10px;padding:14px 16px;cursor:pointer;border:2px solid transparent;transition:all .15s" onclick="openStokModalTur('stok')">
    <div style="font-size:22px;margin-bottom:4px">📦</div>
    <div style="font-size:13px;font-weight:600;color:var(--blt)">Ürün Girişi</div>
    <div style="font-size:11px;color:var(--blt);opacity:.7;margin-top:2px">Stok sayımı, malzeme girişi</div>
  </div>
  <div style="background:var(--amb);border-radius:10px;padding:14px 16px;cursor:pointer;border:2px solid transparent;transition:all .15s" onclick="openStokModalTur('zimmet')">
    <div style="font-size:22px;margin-bottom:4px">🔑</div>
    <div style="font-size:13px;font-weight:600;color:var(--amt)">Zimmet Ver</div>
    <div style="font-size:11px;color:var(--amt);opacity:.7;margin-top:2px">Personele cihaz teslimi</div>
  </div>
  <div style="background:var(--s2);border-radius:10px;padding:14px 16px;cursor:pointer;border:2px solid transparent;transition:all .15s" onclick="openStokModalTur('demirbaş')">
    <div style="font-size:22px;margin-bottom:4px">🖥️</div>
    <div style="font-size:13px;font-weight:600;color:var(--t)">Demirbaş</div>
    <div style="font-size:11px;color:var(--t2);margin-top:2px">Sabit kıymet kaydı</div>
  </div>
</div>
<div class="sg" style="grid-template-columns:repeat(5,1fr)">
  <div class="ms"><div class="msv" id="stk-total">0</div><div class="msl">Toplam</div></div>
  <div class="ms"><div class="msv" style="color:var(--gr)" id="stk-giris">0</div><div class="msl">✅ Aktif Zimmet</div></div>
  <div class="ms"><div class="msv" style="color:var(--am)" id="stk-cikis">0</div><div class="msl">📤 İade</div></div>
  <div class="ms"><div class="msv" style="color:var(--ac)" id="stk-bekle">0</div><div class="msl">⏳ Bekliyor</div></div>
  <div class="ms"><div class="msv" style="color:var(--rd)" id="stk-demirbaş">0</div><div class="msl">🖥️ Demirbaş</div></div>
</div>
<div class="card" style="overflow-x:auto">
  <div class="ch">
    <span class="ct">Tüm Kayıtlar</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="chip on" onclick="setStokFilter('all',this)">Tümü</button>
      <button class="chip" onclick="setStokFilter('stok',this)">📦 Stok</button>
      <button class="chip" onclick="setStokFilter('giris',this)">🔑 Aktif Zimmet</button>
      <button class="chip" onclick="setStokFilter('demirbaş',this)">🖥️ Demirbaş</button>
      <button class="chip" onclick="setStokFilter('cikis',this)">📤 İade</button>
      <button class="chip" onclick="setStokFilter('bekle',this)">⏳ Bekliyor</button>
    </div>
  </div>
  <div id="stok-list"></div>
</div>

<!-- ── DEMİRBAŞLAR DETAY BÖLÜMÜ ── -->
<div class="card" style="margin-top:20px;border:2px solid rgba(99,102,241,.15)">
  <div class="ch">
    <span class="ct" style="display:flex;align-items:center;gap:7px">
      <span style="background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;border-radius:8px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px">🖥️</span>
      Şirket Demirbaş Envanteri
    </span>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="si" id="db-filter-user" style="width:160px;padding:5px 8px;font-size:12px" onchange="renderDemirbaslar()"><option value="0">Tüm Personel</option></select>
      <select class="si" id="db-filter-status" style="width:140px;padding:5px 8px;font-size:12px" onchange="renderDemirbaslar()">
        <option value="">Tüm Durumlar</option>
        <option value="giris">✅ Aktif Zimmet</option>
        <option value="bekle">⏳ Onay Bekliyor</option>
        <option value="cikis">📤 İade Edildi</option>
      </select>
      <button class="btn btnp" style="font-size:12px" onclick="openStokModalTur('demirbaş')">+ Demirbaş Ekle</button>
    </div>
  </div>
  <!-- Demirbaş istatistik -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px 16px 0">
    <div class="ms"><div class="msv" style="color:#4F46E5" id="db-total">0</div><div class="msl">Toplam Demirbaş</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="db-active">0</div><div class="msl">✅ Zimmetli</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="db-bekle">0</div><div class="msl">⏳ Onay Bekliyor</div></div>
    <div class="ms"><div class="msv" style="color:var(--t2)" id="db-iade">0</div><div class="msl">📤 İade Edilmiş</div></div>
  </div>
  <div id="demirbaslar-list" style="padding:0 0 8px"></div>
</div>
  `;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — NUMUNE PANELİ INJECT
// crm.js renderNumune()'nin aradığı ID'ler:
//   nm-search, nm-total, nm-giris, nm-cikis, nm-iade, nb-nm-b, numune-list
//   modal: mo-numune, mo-nm-t, nm-eid, nm-name, nm-code, nm-dir,
//          nm-qty, nm-date, nm-user, nm-iade-date, nm-note, nm-img
// ════════════════════════════════════════════════════════════════

function _injectNumunePanel() {
  const p = _gcp('panel-numune');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';

  const users = (typeof loadUsers === 'function') ? loadUsers() : [];

  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">🧪 Numune Arşivi</div>
        <div class="phs">Numune giriş/çıkış ve iade takibi</div>
      </div>
      <div class="ur">
        <button class="btn btns" onclick="openNumuneModal('giris')" style="font-size:12px">📥 Numune Giriş</button>
        <button class="btn btnp" onclick="openNumuneModal('cikis')">📤 Numune Çıkış</button>
        <button class="btn btns" onclick="exportNumuneXlsx()" style="font-size:11px">⬇ Excel</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      <div class="card" style="padding:13px;text-align:center">
        <div id="nm-total" style="font-size:22px;font-weight:700;color:var(--ac)">0</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">Toplam</div>
      </div>
      <div class="card" style="padding:13px;text-align:center">
        <div id="nm-giris" style="font-size:22px;font-weight:700;color:var(--gr)">0</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">Stokta</div>
      </div>
      <div class="card" style="padding:13px;text-align:center">
        <div id="nm-cikis" style="font-size:22px;font-weight:700;color:var(--am)">0</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">Dışarıda</div>
      </div>
      <div class="card" style="padding:13px;text-align:center">
        <div id="nm-iade" style="font-size:22px;font-weight:700;color:var(--rd)">0</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">Geciken İade</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <input class="si" id="nm-search" placeholder="Numune ara..." oninput="renderNumune()" style="max-width:200px">
      <button class="chip on" onclick="setNumuneFilter('all',this)">Tümü</button>
      <button class="chip"    onclick="setNumuneFilter('giris',this)">📥 Stokta</button>
      <button class="chip"    onclick="setNumuneFilter('cikis',this)">📤 Dışarıda</button>
      <button class="chip"    onclick="setNumuneFilter('iade',this)">⚠️ Geciken</button>
    </div>

    <div id="numune-list" style="overflow-x:auto"></div>

    <!-- MODAL: Numune -->
    <div class="mo" id="mo-numune">
  <div class="moc" style="max-width:480px">
    <div class="mt" id="mo-nm-t">Numune Girişi</div>
    <input type="hidden" id="nm-dir">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">ÜRÜN ADI <span style="color:var(--rd)">*</span></div><input class="fi" id="nm-name" placeholder="…"></div>
      <div class="fg"><div class="fl">KOD / REF</div><input class="fi" id="nm-code" placeholder="NM-001…"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">MİKTAR</div><input type="number" class="fi" id="nm-qty" value="1"></div>
      <div class="fg"><div class="fl">TARİH</div><input type="date" class="fi" id="nm-date"></div>
      <div class="fg"><div class="fl">ALAN KİŞİ</div><select class="fi" id="nm-user"></select></div>
    </div>
    <div class="fg"><div class="fl">İADE TARİHİ (opsiyonel)</div><input type="date" class="fi" id="nm-iade-date"></div>
    <div class="fg">
      <div class="fl">FOTOĞRAF (opsiyonel)</div>
      <input type="file" id="nm-img" accept="image/*" style="font-size:12px">
      <div id="nm-img-preview" style="margin-top:6px"></div>
    </div>
    <div class="fg"><div class="fl">NOT</div><input class="fi" id="nm-note" placeholder="…"></div>
    <input type="hidden" id="nm-eid">
    <div class="mof"><button class="btn" onclick="closeMo('mo-numune')">İptal</button><button class="btn btnp" onclick="saveNumune()">Kaydet</button></div>
  </div>
</div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — RENDER WRAP
// ════════════════════════════════════════════════════════════════

function _wrapCp(fnName, injectFn, beforeFn) {
  const orig = window[fnName];
  window[fnName] = function(...args) {
    injectFn();
    if (typeof beforeFn === 'function') beforeFn();
    if (typeof orig === 'function') return orig(...args);
  };
}

if (typeof window !== 'undefined') {
  // CRM
  _wrapCp('renderCrm', _injectCrmPanel, () => {
    const ownerSel = _gcp('crm-owner');
    if (ownerSel && ownerSel.options.length === 0) {
      const users = (typeof loadUsers === 'function') ? loadUsers() : [];
      ownerSel.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }
  });

  // Stok
  _wrapCp('renderStok',        _injectStokPanel, null);
  _wrapCp('renderDemirbaslar', _injectStokPanel, null);

  // Numune — her iki panel'i inject et
  _wrapCp('renderNumune', () => {
    _injectStokPanel();
    _injectNumunePanel();
  }, null);
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const CrmPanel = {
  injectCrm:    _injectCrmPanel,
  injectStok:   _injectStokPanel,
  injectNumune: _injectNumunePanel,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CrmPanel;
} else {
  window.CrmPanel = CrmPanel;
}

// ── Error boundary wrappers ─────────────────────────────────────
// error-boundary-wrap

(function() {
  const _orig_renderCrm = window.renderCrm || (typeof renderCrm === 'function' ? renderCrm : null);
  if (_orig_renderCrm) {
    window.renderCrm = function(...args) {
      try { return _orig_renderCrm(...args); }
      catch(err) {
        console.error('[renderCrm]', err);
        window.toast?.('Panel yüklenemedi: renderCrm', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderStok = window.renderStok || (typeof renderStok === 'function' ? renderStok : null);
  if (_orig_renderStok) {
    window.renderStok = function(...args) {
      try { return _orig_renderStok(...args); }
      catch(err) {
        console.error('[renderStok]', err);
        window.toast?.('Panel yüklenemedi: renderStok', 'err');
      }
    };
  }
})();
(function() {
  const _orig_renderNumune = window.renderNumune || (typeof renderNumune === 'function' ? renderNumune : null);
  if (_orig_renderNumune) {
    window.renderNumune = function(...args) {
      try { return _orig_renderNumune(...args); }
      catch(err) {
        console.error('[renderNumune]', err);
        window.toast?.('Panel yüklenemedi: renderNumune', 'err');
      }
    };
  }
})();