/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/ik_hub.js  —  v8.1.0
 * İnsan Kaynakları Merkezi — 6 Alt Modül
 *
 * Sekmeler:
 *   1. 👥 Personel      — özlük, işe giriş/çıkış, sözleşme
 *   2. 🗓 Puantaj       — mesai, giriş/çıkış saatleri
 *   3. 📅 İzin          — talep, onay, yıllık bakiye
 *   4. 💰 Maaş & SGK   — bordro özeti, SGK bildirimi
 *   5. 📊 Performans    — değerlendirme, hedef takibi
 *   6. 📄 Sözleşmeler   — iş sözleşmesi, NDA, ek protokol
 *
 * Firebase: tenants/{tid}/data/ik/records
 * Anayasa : Soft delete, logActivity, DocumentFragment, error boundary
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)
console.log('[IK_HUB] Yükleniyor...');

// ── Yardımcılar ───────────────────────────────────────────────────
const _gik  = window.g;
const _stik = (id,v) => { const e=_gik(id); if(e) e.textContent=v; };
const _tsIk = window.nowTs;
const _CUik      = window.CU;
const _isAdminIk = window.isAdmin;
const _toastIk   = (m,t) => window.toast?.(m,t);
const _logIk     = (t,d) => window.logActivity?.(t,d);
const _openMoIk  = id => window.openMo?.(id);
const _closeMoIk = id => window.closeMo?.(id);

// ── Aktif sekme ───────────────────────────────────────────────────
let _IK_TAB = 'personel';

// ── Sabitler ──────────────────────────────────────────────────────
const IK_PERF_PUANLAR = {
  5: { l:'⭐⭐⭐⭐⭐ Mükemmel',  c:'bg', renk:'#22C55E' },
  4: { l:'⭐⭐⭐⭐ Çok İyi',    c:'bg', renk:'#4ADE80' },
  3: { l:'⭐⭐⭐ İyi',          c:'bb', renk:'#3B82F6' },
  2: { l:'⭐⭐ Gelişmeli',      c:'ba', renk:'#F59E0B' },
  1: { l:'⭐ Yetersiz',        c:'br', renk:'#EF4444' },
};

const IK_SOZLESME_TIPLERI = [
  'Belirsiz Süreli','Belirli Süreli','Deneme Süreli',
  'Part-Time','Proje Bazlı','NDA','Gizlilik Sözleşmesi',
  'Ek Protokol','Yönetici Sözleşmesi',
];

const IK_BOLGELER = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Diğer'];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL HTML INJECT
// ════════════════════════════════════════════════════════════════

function _injectIkHub() {
  const panel = _gik('panel-ik-hub');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = `
<!-- ── HEADER ── -->
<div class="ph" style="padding-bottom:0">
  <div>
    <div class="pht">👥 İnsan Kaynakları Merkezi</div>
    <div class="phs">Personel · Puantaj · İzin · Maaş · Performans · Sözleşmeler</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btns" onclick="IkHub.exportXlsx()">⬇ Excel</button>
    <button class="btn btnp" id="btn-ik-add" onclick="IkHub.openAddModal()">+ Yeni</button>
  </div>
</div>

<!-- ── SEKMELER ── -->
<div style="display:flex;gap:0;border-bottom:2px solid var(--b);margin:0 0 18px 0;padding:0 18px;overflow-x:auto">
  <button class="ikh-tab on" data-tab="personel"       onclick="IkHub.setTab('personel',this)">👥 Personel</button>
  <button class="ikh-tab"    data-tab="puantaj"        onclick="IkHub.setTab('puantaj',this)">🗓 Puantaj</button>
  <button class="ikh-tab"    data-tab="izin"           onclick="IkHub.setTab('izin',this)">📅 İzin</button>
  <button class="ikh-tab"    data-tab="maas"           onclick="IkHub.setTab('maas',this)">💰 Maaş & SGK</button>
  <button class="ikh-tab"    data-tab="performans"     onclick="IkHub.setTab('performans',this)">📊 Performans</button>
  <button class="ikh-tab"    data-tab="sozlesme"       onclick="IkHub.setTab('sozlesme',this)">📄 Sözleşmeler</button>
  <button class="ikh-tab"    data-tab="pipeline"       onclick="IkHub.setTab('pipeline',this)">🔄 Pipeline</button>
  <button class="ikh-tab"    data-tab="on_gorusme"     onclick="IkHub.setTab('on_gorusme',this)">📞 Ön Görüşme</button>
  <button class="ikh-tab"    data-tab="mulakat"        onclick="IkHub.setTab('mulakat',this)">📝 Mülakat</button>
  <button class="ikh-tab"    data-tab="test_drive"     onclick="IkHub.setTab('test_drive',this)">🧪 Test Drive</button>
  <button class="ikh-tab"    data-tab="degerlendirme"  onclick="IkHub.setTab('degerlendirme',this)">⭐ Değerlendirme</button>
  <button class="ikh-tab"    data-tab="ai_asistan"     onclick="IkHub.setTab('ai_asistan',this)">🤖 AI Asistan</button>
  <button class="ikh-tab"    data-tab="adaylar"        onclick="IkHub.setTab('adaylar',this)">📋 Adaylar</button>
  <button class="ikh-tab"    data-tab="raporlar"       onclick="IkHub.setTab('raporlar',this)">📊 Raporlar</button>
</div>

<!-- ── PERSONEL ── -->
<div id="ikh-tab-personel" class="ikh-tab-content">
  <div class="sg">
    <div class="ms"><div class="msv" id="ikp-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="ikp-aktif">0</div><div class="msl">✅ Aktif</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="ikp-deneme">0</div><div class="msl">🔄 Deneme</div></div>
    <div class="ms"><div class="msv" style="color:var(--rd)" id="ikp-cikis">0</div><div class="msl">🚪 Ayrılan</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="ikp-aday">0</div><div class="msl">📋 Aday</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <input class="si" id="ikp-search" placeholder="🔍 Personel ara..." oninput="IkHub.renderPersonel()" style="width:200px">
    <select class="si" id="ikp-dept" onchange="IkHub.renderPersonel()" style="width:150px">
      <option value="">Tüm Departmanlar</option>
      <option>İK</option><option>Finans</option><option>Operasyon</option>
      <option>IT</option><option>Satış</option><option>Lojistik</option><option>Yönetim</option>
    </select>
    <select class="si" id="ikp-status" onchange="IkHub.renderPersonel()" style="width:140px">
      <option value="">Tüm Durumlar</option>
      <option value="active">✅ Aktif</option>
      <option value="probation">🔄 Deneme</option>
      <option value="inactive">🚪 Ayrılan</option>
      <option value="pending">📋 Aday</option>
    </select>
  </div>
  <div id="ikh-personel-list"></div>
</div>

<!-- ── PUANTAJ ── -->
<div id="ikh-tab-puantaj" class="ikh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="ikpn-total">0</div><div class="msl">Toplam Kayıt</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="ikpn-ok">0</div><div class="msl">✅ Onaylı</div></div>
    <div class="ms"><div class="msv" style="color:var(--rd)" id="ikpn-gecikme">0</div><div class="msl">⏰ Gecikmeli</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="ikpn-devamsiz">0</div><div class="msl">❌ Devamsız</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <input class="si" type="month" id="ikpn-ay"
      value="${new Date().toISOString().slice(0,7)}"
      onchange="IkHub.renderPuantaj()" style="width:160px">
    <select class="si" id="ikpn-user" onchange="IkHub.renderPuantaj()" style="width:180px">
      <option value="">Tüm Personel</option>
    </select>
    <button class="btn btns" onclick="IkHub.exportPuantajPdf()">📄 PDF</button>
    <button class="btn btnp" onclick="IkHub.openPuanModal(null)" style="margin-left:auto">+ Kayıt Ekle</button>
  </div>
  <div id="ikh-puantaj-list"></div>
</div>

<!-- ── İZİN ── -->
<div id="ikh-tab-izin" class="ikh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="ikiz-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="ikiz-bekle">0</div><div class="msl">⏳ Bekliyor</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="ikiz-onay">0</div><div class="msl">✅ Onaylı</div></div>
    <div class="ms"><div class="msv" style="color:var(--rd)" id="ikiz-red">0</div><div class="msl">❌ Reddedildi</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="ikiz-gun">0</div><div class="msl">📆 Kalan Gün</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="IkHub.setIzinFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="IkHub.setIzinFilter('pending',this)">⏳ Bekliyor</button>
    <button class="chip"    onclick="IkHub.setIzinFilter('approved',this)">✅ Onaylı</button>
    <button class="chip"    onclick="IkHub.setIzinFilter('rejected',this)">❌ Reddedildi</button>
    <button class="btn btnp" onclick="IkHub.openIzinModal(null)" style="margin-left:auto">+ İzin Talep Et</button>
  </div>
  <div id="ikh-izin-list"></div>
</div>

<!-- ── MAAŞ & SGK ── -->
<div id="ikh-tab-maas" class="ikh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="ikm-personel">0</div><div class="msl">Personel</div></div>
    <div class="ms"><div class="msv" style="color:var(--ac)" id="ikm-toplam-brut">0 ₺</div><div class="msl">Brüt Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="ikm-toplam-net">0 ₺</div><div class="msl">Net Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="ikm-sgk">0 ₺</div><div class="msl">SGK İşveren</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <input class="si" type="month" id="ikm-ay"
      value="${new Date().toISOString().slice(0,7)}"
      onchange="IkHub.renderMaas()" style="width:160px">
    <select class="si" id="ikm-dept" onchange="IkHub.renderMaas()" style="width:160px">
      <option value="">Tüm Departmanlar</option>
      <option>Finans</option><option>Operasyon</option><option>IT</option><option>Satış</option>
    </select>
    ${_isAdminIk() ? `<button class="btn btns" onclick="IkHub.exportBordroXlsx()">⬇ Bordro Excel</button>` : ''}
    ${_isAdminIk() ? `<button class="btn btnp" onclick="IkHub.openMaasModal(null)" style="margin-left:auto">+ Bordro Gir</button>` : ''}
  </div>
  <div id="ikh-maas-list"></div>
</div>

<!-- ── PERFORMANS ── -->
<div id="ikh-tab-performans" class="ikh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="ikperf-toplam">0</div><div class="msl">Değerlendirme</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="ikperf-mukemmel">0</div><div class="msl">⭐⭐⭐⭐⭐ Mükemmel</div></div>
    <div class="ms"><div class="msv" style="color:var(--bl)" id="ikperf-iyi">0</div><div class="msl">⭐⭐⭐ İyi</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="ikperf-gelismeli">0</div><div class="msl">⭐ Gelişmeli</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <select class="si" id="ikperf-donem" onchange="IkHub.renderPerformans()" style="width:160px">
      <option value="">Tüm Dönemler</option>
      <option>2026-Q1</option><option>2025-Q4</option>
      <option>2025-Q3</option><option>2025-Q2</option>
    </select>
    <select class="si" id="ikperf-user" onchange="IkHub.renderPerformans()" style="width:180px">
      <option value="">Tüm Personel</option>
    </select>
    ${_isAdminIk() ? `<button class="btn btnp" onclick="IkHub.openPerfModal(null)" style="margin-left:auto">+ Değerlendirme Ekle</button>` : ''}
  </div>
  <div id="ikh-performans-list"></div>
</div>

<!-- ── SÖZLEŞMELER ── -->
<div id="ikh-tab-sozlesme" class="ikh-tab-content" style="display:none">
  <div class="sg">
    <div class="ms"><div class="msv" id="iksoz-total">0</div><div class="msl">Toplam</div></div>
    <div class="ms"><div class="msv" style="color:var(--gr)" id="iksoz-aktif">0</div><div class="msl">✅ Geçerli</div></div>
    <div class="ms"><div class="msv" style="color:var(--am)" id="iksoz-bitis">0</div><div class="msl">⏰ Yakında Bitiyor</div></div>
    <div class="ms"><div class="msv" style="color:var(--rd)" id="iksoz-surdu">0</div><div class="msl">❌ Süresi Geçmiş</div></div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="chip on" onclick="IkHub.setSozFilter('all',this)">Tümü</button>
    <button class="chip"    onclick="IkHub.setSozFilter('aktif',this)">✅ Geçerli</button>
    <button class="chip"    onclick="IkHub.setSozFilter('bitis',this)">⏰ Yakında Bitiyor</button>
    <button class="chip"    onclick="IkHub.setSozFilter('surdu',this)">❌ Süresi Geçmiş</button>
    ${_isAdminIk() ? `<button class="btn btnp" onclick="IkHub.openSozlesmeModal(null)" style="margin-left:auto">+ Sözleşme Ekle</button>` : ''}
  </div>
  <div id="ikh-sozlesme-list"></div>
</div>


<!-- ── PIPELINE ── -->
<div id="ikh-tab-pipeline" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--t)">İşe Alım Pipeline</div>
        <div style="font-size:12px;color:var(--t2)">Aday süreç takibi</div>
      </div>
      <button class="btn btnp" onclick="IkHub.addCandidate()">+ Aday Ekle</button>
    </div>
    <div id="ikh-pipe-board" class="ik-wrap" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px"></div>
  </div>
</div>
<!-- ── ÖN GÖRÜŞME ── -->
<div id="ikh-tab-on_gorusme" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap">
    <div class="ik-sec-head">
      <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      <div><div class="ik-sec-head-title">Telefon Ön Görüşme Rehberi</div><div class="ik-sec-head-sub">IKMG-0300-243</div></div>
    </div>
    <div id="ikh-telefon-content" style="max-width:820px"></div>
  </div>
</div>
<!-- ── MÜLAKAT ── -->
<div id="ikh-tab-mulakat" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap" style="max-width:800px">
    <div class="ik-tabs">
      <button class="ik-tab active" onclick="IkHub._ikSt('mul','kontrol',this)">Kontrol Listesi</button>
      <button class="ik-tab" onclick="IkHub._ikSt('mul','form',this)">Mülakat Formu</button>
      <button class="ik-tab" onclick="IkHub._ikSt('mul','sorubankasi',this)">Soru Bankası</button>
    </div>
    <div id="ikh-mul-kontrol" class="ik-tpanel active"><div id="ikh-kontrol-list"></div></div>
    <div id="ikh-mul-form" class="ik-tpanel" style="display:none">
      <div class="ik-card" style="margin-bottom:12px">
        <div class="ik-card-title">Aday Bilgileri</div>
        <div class="ik-frow">
          <div class="ik-field"><label class="ik-label">Adayın Adı Soyadı</label><input id="ikh-mf-aday" class="ik-input" placeholder="Ad Soyad"/></div>
          <div class="ik-field"><label class="ik-label">Pozisyon</label><input id="ikh-mf-pozisyon" class="ik-input" placeholder="ör. Yazılım Geliştirici"/></div>
          <div class="ik-field"><label class="ik-label">Görüşme Tarihi</label><input id="ikh-mf-tarih" type="date" class="ik-input"/></div>
          <div class="ik-field"><label class="ik-label">Saat</label><input id="ikh-mf-saat" type="time" class="ik-input" value="10:00"/></div>
          <div class="ik-field"><label class="ik-label">Görüşen Kişi</label><input id="ikh-mf-gorusen" class="ik-input" placeholder="İsim"/></div>
          <div class="ik-field"><label class="ik-label">Görüşme Türü</label><select id="ikh-mf-tur" class="ik-input"><option value="yuzyuze">Yüz Yüze</option><option value="online">Online</option></select></div>
          <div class="ik-field"><label class="ik-label">Online Link</label><input id="ikh-mf-link" class="ik-input" placeholder="https://meet.google.com/..."/></div>
        </div>
      </div>
      <div class="ik-card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="ik-card-title" style="margin:0">Sorular ve Yanıtlar</div>
          <div style="display:flex;gap:6px">
            <button class="ik-btn ik-btn-s ik-btn-sm" onclick="IkHub._addFromBank()">+ Bankadan</button>
            <button class="ik-btn ik-btn-p ik-btn-sm" onclick="IkHub._addIQ()">+ Soru Ekle</button>
          </div>
        </div>
        <div id="ikh-iq-list"></div>
      </div>
      <div class="ik-card" style="margin-bottom:12px">
        <div class="ik-field"><label class="ik-label">Görüşen Kişinin Notu</label><textarea id="ikh-mf-not" class="ik-textarea" placeholder="Genel izlenimler..."></textarea></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="ik-btn ik-btn-p ik-btn-full" onclick="IkHub._saveInterview()">💾 Görüşmeyi Kaydet</button>
        <button class="ik-btn ik-btn-s" onclick="IkHub._clearForm()">Temizle</button>
      </div>
      <div id="ikh-save-msg" style="margin-top:8px"></div>
    </div>
    <div id="ikh-mul-sorubankasi" class="ik-tpanel" style="display:none"><div id="ikh-soru-bankasi-list"></div></div>
  </div>
</div>
<!-- ── TEST DRIVE ── -->
<div id="ikh-tab-test_drive" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap" style="max-width:880px">
    <div class="ik-sec-head">
      <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div><div class="ik-sec-head-title">Test Sürüşü</div><div class="ik-sec-head-sub">IKTSD-0400</div></div>
    </div>
    <div id="ikh-test-content"></div>
  </div>
</div>
<!-- ── DEĞERLENDİRME ── -->
<div id="ikh-tab-degerlendirme" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap">
    <div class="ik-sec-head">
      <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <div><div class="ik-sec-head-title">Aday Değerlendirme</div><div class="ik-sec-head-sub">13 Kriter</div></div>
    </div>
    <div id="ikh-eval-content"></div>
  </div>
</div>
<!-- ── AI ASISTAN ── -->
<div id="ikh-tab-ai_asistan" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap">
    <div style="margin-bottom:18px">
      <div style="font-size:15px;font-weight:700;color:var(--t);margin-bottom:4px">🤖 AI İşe Alım Asistanı</div>
      <div style="font-size:12px;color:var(--t2)">Claude AI ile CV analizi, soru üretimi ve ilan oluşturma</div>
    </div>
    <div class="ik-card" style="margin-bottom:14px">
      <div class="ik-card-title">📄 CV Analizi</div>
      <textarea id="ikh-ai-cv" class="ik-textarea" rows="6" placeholder="CV metnini buraya yapıştırın..."></textarea>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="ik-btn ik-btn-p" onclick="IkHub._analyzeCV()">🔍 CV Analiz Et</button>
        <button class="ik-btn ik-btn-s" onclick="IkHub._aiAddToForm()">📋 Forma Aktar</button>
      </div>
      <div id="ikh-ai-cv-result" style="margin-top:12px"></div>
    </div>
    <div class="ik-card" style="margin-bottom:14px">
      <div class="ik-card-title">❓ Soru Üretimi</div>
      <div class="ik-frow">
        <div class="ik-field"><label class="ik-label">Pozisyon</label><input id="ikh-ai-pos" class="ik-input" placeholder="ör. Yazılım Geliştirici"/></div>
        <div class="ik-field"><label class="ik-label">Soru Sayısı</label><input id="ikh-ai-qcount" type="number" class="ik-input" value="5" min="3" max="15"/></div>
      </div>
      <button class="ik-btn ik-btn-p" onclick="IkHub._genSorular()" style="margin-top:8px">✨ Sorular Üret</button>
      <div id="ikh-ai-q-result" style="margin-top:12px"></div>
    </div>
    <div class="ik-card">
      <div class="ik-card-title">📢 İlan Oluşturma</div>
      <div class="ik-frow">
        <div class="ik-field"><label class="ik-label">Pozisyon</label><input id="ikh-ai-ilan-pos" class="ik-input" placeholder="Pozisyon adı"/></div>
        <div class="ik-field"><label class="ik-label">Departman</label><input id="ikh-ai-ilan-dept" class="ik-input" placeholder="Departman"/></div>
      </div>
      <button class="ik-btn ik-btn-p" onclick="IkHub._genIlan()" style="margin-top:8px">📝 İlan Oluştur</button>
      <div id="ikh-ai-ilan-result" style="margin-top:12px"></div>
    </div>
  </div>
</div>
<!-- ── ADAYLAR ── -->
<div id="ikh-tab-adaylar" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--t)">Mülakat Kayıtları</div>
        <div style="font-size:12px;color:var(--t2)">Tüm aday görüşmeleri</div>
      </div>
      <button class="btn btns" onclick="IkHub._exportKayitlar()">⬇ Excel</button>
    </div>
    <div id="ikh-kayit-listesi"></div>
  </div>
</div>

<div id="ikh-tab-raporlar" class="ikh-tab-content" style="display:none">
  <div class="ik-wrap"><div id="ikh-rapor-body"></div></div>
</div>

<!-- ── CSS ── -->
<style>
.ikh-tab {
  padding:10px 16px;font-size:12px;font-weight:600;border:none;
  background:none;cursor:pointer;color:var(--t2);
  border-bottom:2px solid transparent;margin-bottom:-2px;
  transition:all .2s;white-space:nowrap;
}
.ikh-tab.on { color:var(--ac);border-bottom-color:var(--ac); }
.ikh-tab:hover:not(.on){ color:var(--t);background:var(--s2); }

.ik-wrap { font-family: inherit; }
.ik-tpanel { display: none; }
.ik-tpanel.active { display: block; }
/* ════════════════════════════════════════════════════════════════
   İK HUB — İşe Alım Modülü Apple Design Language
   Font: system-ui  |  Radius: 8px / 12px  |  Renk: 6 var
   ════════════════════════════════════════════════════════════════ */

/* ── Değişkenler ───────────────────────────────────────── */
.ik-wrap {
  --ik-bg:       var(--bg,  #f5f5f7);
  --ik-sf:       var(--sf,  #ffffff);
  --ik-sf2:      var(--s2,  #f5f5f7);
  --ik-bd:       var(--b,   rgba(0,0,0,0.09));
  --ik-tx:       var(--t,   #1d1d1f);
  --ik-tx2:      var(--t2,  #6e6e73);
  --ik-tx3:      var(--t3,  #aeaeb2);
  --ik-ac:       var(--ac,  #0071e3);
  --ik-gr:       var(--gr,  #34c759);
  --ik-am:       var(--am,  #ff9500);
  --ik-rd:       var(--rd,  #ff3b30);
  --ik-r:        12px;
  --ik-r2:       8px;
  --ik-sh:       0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  --ik-tr:       all 0.18s ease;
}

/* ── Layout ────────────────────────────────────────────── */
.ik-wrap { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; }

/* ── Sekme navigasyonu ─────────────────────────────────── */
.ik-subtabs {
  display: flex; gap: 0; overflow-x: auto;
  border-bottom: 1px solid var(--ik-bd);
  margin-bottom: 18px;
  padding: 0;
}
.ik-subtab {
  padding: 9px 15px; font-size: 13px; font-weight: 500;
  color: var(--ik-tx2); border: none; background: none;
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -1px; transition: var(--ik-tr);
  white-space: nowrap; font-family: inherit;
  flex-shrink: 0;
}
.ik-subtab:hover:not(.on) { color: var(--ik-tx); }
.ik-subtab.on { color: var(--ik-ac); border-bottom-color: var(--ik-ac); }

/* ── Kart ──────────────────────────────────────────────── */
.ik-card {
  background: var(--ik-sf);
  border: 1px solid var(--ik-bd);
  border-radius: var(--ik-r);
  padding: 16px 18px;
  box-shadow: var(--ik-sh);
  margin-bottom: 12px;
}
.ik-card-title {
  font-size: 13px; font-weight: 600;
  color: var(--ik-tx); margin-bottom: 12px;
  letter-spacing: -0.1px;
}

/* ── Stat kartları ─────────────────────────────────────── */
.ik-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px; margin-bottom: 18px;
}
.ik-stat {
  background: var(--ik-sf); border: 1px solid var(--ik-bd);
  border-radius: var(--ik-r); padding: 14px;
  box-shadow: var(--ik-sh);
}
.ik-stat-val {
  font-size: 24px; font-weight: 700; color: var(--ik-tx);
  letter-spacing: -0.8px; line-height: 1; margin-bottom: 4px;
}
.ik-stat-lbl { font-size: 11px; color: var(--ik-tx2); }

/* ── Pipeline / Kanban ─────────────────────────────────── */
.ik-pipe {
  display: flex; gap: 10px; overflow-x: auto;
  padding-bottom: 8px;
}
.ik-pipe-col {
  flex: 0 0 200px; background: var(--ik-sf2);
  border-radius: var(--ik-r); padding: 10px;
  border: 1px solid var(--ik-bd);
  min-height: 200px;
}
.ik-pipe-col-title {
  font-size: 11px; font-weight: 700; color: var(--ik-tx2);
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 10px; padding: 0 2px;
  display: flex; align-items: center; justify-content: space-between;
}
.ik-pipe-card {
  background: var(--ik-sf); border: 1px solid var(--ik-bd);
  border-radius: var(--ik-r2); padding: 10px;
  margin-bottom: 7px; cursor: pointer;
  transition: var(--ik-tr); font-size: 12px;
}
.ik-pipe-card:hover { border-color: var(--ik-ac); box-shadow: var(--ik-sh); }
.ik-pipe-card-name { font-weight: 600; color: var(--ik-tx); margin-bottom: 3px; }
.ik-pipe-card-pos  { color: var(--ik-tx2); font-size: 11px; }
.ik-pipe-add {
  width: 100%; padding: 7px; border: 1px dashed var(--ik-bd);
  border-radius: var(--ik-r2); background: transparent;
  font-size: 12px; color: var(--ik-tx3); cursor: pointer;
  transition: var(--ik-tr); font-family: inherit;
  margin-top: 4px;
}
.ik-pipe-add:hover { border-color: var(--ik-ac); color: var(--ik-ac); }

/* ── Form alanları ─────────────────────────────────────── */
.ik-frow {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-bottom: 12px;
}
.ik-frow.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.ik-frow.cols-1 { grid-template-columns: 1fr; }
.ik-field { display: flex; flex-direction: column; gap: 4px; }
.ik-field.full { grid-column: 1/-1; }
.ik-label {
  font-size: 11px; font-weight: 600; color: var(--ik-tx2);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.ik-input, .ik-select, .ik-textarea {
  width: 100%; padding: 7px 11px;
  background: var(--ik-bg); border: 1px solid var(--ik-bd);
  border-radius: var(--ik-r2); font-size: 13px;
  font-family: inherit; color: var(--ik-tx);
  transition: border-color 0.15s ease; outline: none;
}
.ik-input:focus, .ik-select:focus, .ik-textarea:focus {
  border-color: var(--ik-ac);
  box-shadow: 0 0 0 3px rgba(0,113,227,0.1);
}
.ik-textarea { resize: vertical; min-height: 72px; }

/* ── Butonlar ──────────────────────────────────────────── */
.ik-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 13px; border-radius: var(--ik-r2);
  font-size: 13px; font-weight: 500; border: none;
  cursor: pointer; transition: var(--ik-tr);
  white-space: nowrap; font-family: inherit;
}
.ik-btn-p  { background: var(--ik-ac); color: #fff; }
.ik-btn-p:hover { opacity: 0.88; }
.ik-btn-s  { background: var(--ik-sf2); color: var(--ik-tx); border: 1px solid var(--ik-bd); }
.ik-btn-s:hover { background: var(--ik-bd); }
.ik-btn-d  { background: rgba(255,59,48,0.1); color: var(--ik-rd); }
.ik-btn-sm { padding: 4px 9px; font-size: 12px; }
.ik-btn-full { width: 100%; justify-content: center; }

/* ── Badge / chip ──────────────────────────────────────── */
.ik-badge {
  display: inline-flex; align-items: center;
  padding: 2px 7px; border-radius: 6px;
  font-size: 11px; font-weight: 500;
}
.ik-badge-g { background: rgba(52,199,89,0.12);  color: #248a3d; }
.ik-badge-a { background: rgba(255,149,0,0.12);  color: #b25000; }
.ik-badge-r { background: rgba(255,59,48,0.12);  color: #c0392b; }
.ik-badge-b { background: rgba(0,113,227,0.12);  color: var(--ik-ac); }
.ik-badge-x { background: rgba(0,0,0,0.06);      color: var(--ik-tx2); }

/* ── Tablo ─────────────────────────────────────────────── */
.ik-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ik-table th {
  text-align: left; padding: 8px 12px;
  font-size: 11px; font-weight: 600; color: var(--ik-tx2);
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--ik-bd);
  background: var(--ik-sf2);
}
.ik-table td {
  padding: 9px 12px; border-bottom: 1px solid var(--ik-bd);
  color: var(--ik-tx); vertical-align: middle;
}
.ik-table tr:last-child td { border: none; }
.ik-table tr:hover td { background: var(--ik-sf2); }

/* ── Soru kartı ────────────────────────────────────────── */
.ik-iq-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border: 1px solid var(--ik-bd);
  border-radius: var(--ik-r2); background: var(--ik-sf);
  margin-bottom: 8px; transition: var(--ik-tr);
}
.ik-iq-item:hover { border-color: var(--ik-ac); }
.ik-iq-num {
  min-width: 24px; height: 24px; border-radius: 6px;
  background: rgba(0,113,227,0.1); color: var(--ik-ac);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* ── Değerlendirme yıldız ──────────────────────────────── */
.ik-score-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--ik-bd);
}
.ik-score-row:last-child { border: none; }
.ik-score-label { flex: 1; font-size: 13px; color: var(--ik-tx); }
.ik-stars { display: flex; gap: 3px; }
.ik-star {
  width: 26px; height: 26px; border-radius: var(--ik-r2);
  border: 1px solid var(--ik-bd); background: var(--ik-sf2);
  font-size: 13px; cursor: pointer; transition: var(--ik-tr);
  display: flex; align-items: center; justify-content: center;
}
.ik-star.on { background: rgba(255,149,0,0.15); border-color: var(--ik-am); }

/* ── Sekme içi tab ─────────────────────────────────────── */
.ik-tabs {
  display: flex; gap: 0; border-bottom: 1px solid var(--ik-bd);
  margin-bottom: 14px;
}
.ik-tab {
  padding: 7px 13px; font-size: 12px; font-weight: 500;
  color: var(--ik-tx2); border: none; background: none;
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -1px; transition: var(--ik-tr); font-family: inherit;
}
.ik-tab.active { color: var(--ik-ac); border-bottom-color: var(--ik-ac); }

/* ── AI panel ──────────────────────────────────────────── */
.ik-ai-card {
  background: linear-gradient(135deg, rgba(0,113,227,0.05), rgba(52,199,89,0.05));
  border: 1px solid rgba(0,113,227,0.15);
  border-radius: var(--ik-r); padding: 16px 18px; margin-bottom: 12px;
}
.ik-ai-loading {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--ik-tx2); padding: 12px 0;
}
.ik-ai-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ik-ac); animation: ik-pulse 1s infinite;
}
.ik-ai-dot:nth-child(2) { animation-delay: 0.2s; }
.ik-ai-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes ik-pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }

/* ── Section başlık ────────────────────────────────────── */
.ik-sec-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; margin-bottom: 16px;
  background: var(--ik-ac); border-radius: var(--ik-r);
  color: #fff;
}
.ik-sec-head-title { font-size: 14px; font-weight: 700; letter-spacing: -0.2px; }
.ik-sec-head-sub   { font-size: 11px; opacity: 0.75; margin-top: 1px; }

/* ── Kontrol listesi ───────────────────────────────────── */
.ik-check-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--ik-bd);
}
.ik-check-item:last-child { border: none; }
.ik-check-item input[type=checkbox] { accent-color: var(--ik-ac); margin-top: 2px; flex-shrink: 0; }
.ik-check-label { font-size: 13px; color: var(--ik-tx); line-height: 1.4; }

/* ── Versiyon / öneri kartı ────────────────────────────── */
.ik-ver-card {
  border: 1px solid var(--ik-bd); border-radius: var(--ik-r);
  padding: 14px 16px; margin-bottom: 10px;
  background: var(--ik-sf);
}
.ik-ver-num { font-size: 14px; font-weight: 700; color: var(--ik-ac); }
.ik-ver-ts  { font-size: 11px; color: var(--ik-tx3); margin-top: 1px; }
.ik-ver-changes { list-style: none; margin-top: 8px; }
.ik-ver-changes li {
  font-size: 12px; color: var(--ik-tx2); padding: 2px 0 2px 12px; position: relative;
}
.ik-ver-changes li::before { content:'—'; position:absolute; left:0; color:var(--ik-tx3); }

/* ── Modal ─────────────────────────────────────────────── */
.ik-modal-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.4); z-index: 9999;
  align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.ik-modal-overlay.open { display: flex; animation: ik-fade 0.15s ease; }
.ik-modal {
  background: var(--ik-sf); border-radius: 16px;
  width: 90%; max-width: 680px; max-height: 85vh;
  overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  padding: 22px 24px; position: relative;
}
.ik-modal-title {
  font-size: 16px; font-weight: 700; color: var(--ik-tx);
  letter-spacing: -0.3px; margin-bottom: 16px;
}
.ik-modal-close {
  position: absolute; top: 14px; right: 14px;
  background: var(--ik-sf2); border: none; border-radius: 50%;
  width: 26px; height: 26px; cursor: pointer; color: var(--ik-tx2);
  font-size: 13px; display: flex; align-items: center; justify-content: center;
  transition: var(--ik-tr);
}
.ik-modal-close:hover { background: var(--ik-bd); color: var(--ik-tx); }
.ik-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--ik-bd);
}

@keyframes ik-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Scrollbar ─────────────────────────────────────────── */
.ik-pipe::-webkit-scrollbar,
.ik-modal::-webkit-scrollbar { height: 4px; width: 4px; }
.ik-pipe::-webkit-scrollbar-thumb,
.ik-modal::-webkit-scrollbar-thumb { background: var(--ik-bd); border-radius: 2px; }

/* ── Admin kullanıcı listesi ───────────────────────────── */
.ik-user-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-bottom: 1px solid var(--ik-bd);
  transition: background 0.1s;
}
.ik-user-row:last-child { border: none; }
.ik-user-row:hover { background: var(--ik-sf2); }
.ik-user-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(0,113,227,0.12); color: var(--ik-ac);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}


.ikh-card {
  background:var(--sf);border:1px solid var(--b);border-radius:12px;
  padding:14px 16px;margin-bottom:10px;transition:box-shadow .2s;
}
.ikh-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
.perf-star { font-size:18px; }
</style>
`;

  // Personel listesini doldur dropdown'lara
  _fillIkUserSelects();
}

function _fillIkUserSelects() {
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  ['ikpn-user','ikperf-user'].forEach(id => {
    const sel = _gik(id);
    if (!sel || sel.options.length > 1) return;
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.name;
      sel.appendChild(o);
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — SEKME YÖNETİMİ
// ════════════════════════════════════════════════════════════════

function setIkTab(tab, btn) {
  _IK_TAB = tab;
  document.querySelectorAll('#panel-ik-hub .ikh-tab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  ['personel','puantaj','izin','maas','performans','sozlesme','pipeline','on_gorusme','mulakat','test_drive','degerlendirme','ai_asistan','adaylar','raporlar'].forEach(t => {
    const el = _gik('ikh-tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  if (tab === 'personel')       renderIkPersonel();
  if (tab === 'puantaj')        renderIkPuantaj();
  if (tab === 'izin')           renderIkIzin();
  if (tab === 'maas')           renderIkMaas();
  if (tab === 'performans')     renderIkPerformans();
  if (tab === 'sozlesme')       renderIkSozlesme();
  if (tab === 'pipeline')       _ikRenderPipeline();
  if (tab === 'on_gorusme')     _ikRenderTelefon();
  if (tab === 'mulakat')        _ikRenderMulakat();
  if (tab === 'test_drive')     _ikRenderTests();
  if (tab === 'degerlendirme')  _ikRenderEval();
  if (tab === 'ai_asistan')     _ikRenderAI();
  if (tab === 'adaylar')        _ikRenderKayitlar();
  if (tab === 'raporlar')       renderIkRaporlar();
}

function openIkAddModal() {
  if (_IK_TAB === 'personel')   window.openIkModal?.(null);
  if (_IK_TAB === 'puantaj')    window.openPuanModal?.(null);
  if (_IK_TAB === 'izin')       window.openIzinModal?.(null);
  if (_IK_TAB === 'maas')       openIkMaasModal(null);
  if (_IK_TAB === 'performans') openIkPerfModal(null);
  if (_IK_TAB === 'sozlesme')   openIkSozlesmeModal(null);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — PERSONEL RENDER
// ════════════════════════════════════════════════════════════════

function renderIkPersonel() {
  const cont = _gik('ikh-personel-list');
  if (!cont) return;
  if (typeof window.showSkeleton === 'function') window.showSkeleton(cont, 4);

  const data   = typeof loadIk==='function' ? loadIk() : [];
  const search = (_gik('ikp-search')?.value || '').toLowerCase();
  const dept   = _gik('ikp-dept')?.value   || '';
  const status = _gik('ikp-status')?.value || '';

  const _cuPer = _CUik();
  const all = data.filter(p => !p.isDeleted);
  // Non-admin: sadece kendi kaydını görsün
  if (!_isAdminIk()) {
    const myRecord = all.filter(p => p.email === _cuPer?.email || p.id === _cuPer?.id);
    if (myRecord.length) {
      _stik('ikp-total', 1); _stik('ikp-aktif', myRecord[0].status==='active'?1:0);
      _stik('ikp-deneme', myRecord[0].status==='probation'?1:0);
      _stik('ikp-cikis', 0); _stik('ikp-aday', 0);
      const frag = document.createDocumentFragment();
      // Tek kart render — kendi kaydı
      myRecord.forEach(p => {
        const card = document.createElement('div');
        card.style.cssText = 'padding:16px;background:var(--s2);border-radius:10px;border:1px solid var(--b)';
        card.innerHTML = `<div style="font-weight:600;font-size:14px;color:var(--t)">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:var(--t2);margin-top:4px">${escapeHtml(p.pos||'')} — ${escapeHtml(p.dept||'')}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:4px">Başlangıç: ${p.start||'—'} / Durum: ${p.status||'—'}</div>`;
        frag.appendChild(card);
      });
      cont.replaceChildren(frag);
      return;
    }
  }
  _stik('ikp-total',  all.length);
  _stik('ikp-aktif',  all.filter(p=>p.status==='active').length);
  _stik('ikp-deneme', all.filter(p=>p.status==='probation').length);
  _stik('ikp-cikis',  all.filter(p=>p.status==='inactive').length);
  _stik('ikp-aday',   all.filter(p=>p.status==='pending').length);

  let items = all;
  if (search) items = items.filter(p =>
    (p.name||'').toLowerCase().includes(search) ||
    (p.pos||'').toLowerCase().includes(search) ||
    (p.email||'').toLowerCase().includes(search)
  );
  if (dept)   items = items.filter(p => p.dept === dept);
  if (status) items = items.filter(p => p.status === status);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">👥</div>
      <div style="font-weight:600;margin-bottom:6px">Personel bulunamadı</div>
      ${_isAdminIk()?`<button class="btn btnp" onclick="IkHub.openAddModal()">+ Personel Ekle</button>`:''}
    </div>`;
    return;
  }

  const STATUS_MAP = {
    active:    { l:'✅ Aktif',    c:'bg' },
    probation: { l:'🔄 Deneme',   c:'bb' },
    inactive:  { l:'🚪 Ayrıldı', c:'ba' },
    pending:   { l:'📋 Aday',     c:'bp' },
    suspended: { l:'🔒 Askıda',  c:'br' },
  };

  const STAGE_LABELS = ['','Aday','Mülakat','Teklif','Sözleşme','Onboarding','Aktif'];

  const frag = document.createDocumentFragment();
  items.forEach(p => {
    const st    = STATUS_MAP[p.status] || STATUS_MAP.pending;
    const stage = p.stage || 1;
    const isAyrilan = p.status === 'inactive';
    const card  = document.createElement('div');
    card.className = 'ikh-card';
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="width:44px;height:44px;border-radius:14px;background:var(--al);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;font-weight:800;color:var(--ac);flex-shrink:0">
          ${window._esc((p.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2))}
        </div>
        <div style="flex:1;min-width:180px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:14px">${window._esc(p.name||'')}</span>
            <span class="badge ${st.c}">${st.l}</span>
            ${p.dept ? `<span style="font-size:11px;color:var(--t3);background:var(--s2);padding:1px 7px;border-radius:99px">${window._esc(p.dept)}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--t2);margin-bottom:6px">${window._esc(p.pos || '—')}</div>
          ${p.email ? `<div style="font-size:11px;color:var(--ac)">✉ ${p.email}</div>` : ''}
          ${p.phone ? `<div style="font-size:11px;color:var(--t3)">📞 ${p.phone}</div>` : ''}
          ${p.start ? `<div style="font-size:11px;color:var(--t3)">📅 Giriş: ${p.start}</div>` : ''}
          ${!isAyrilan ? `
          <div style="margin-top:8px">
            <div style="font-size:10px;color:var(--t3);margin-bottom:3px">İşe Alım Süreci — ${STAGE_LABELS[stage]||''}</div>
            <div style="display:flex;gap:3px">
              ${[1,2,3,4,5,6].map(i=>`
                <div style="height:4px;flex:1;border-radius:99px;background:${i<=stage?'var(--ac)':'var(--s2)'}"></div>
              `).join('')}
            </div>
          </div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${_isAdminIk() ? `
            <button class="btn btns" onclick="IkHub.openPersonelEdit(${p.id})">✏️</button>
            <button class="btn btns btnd" onclick="IkHub.delPersonel(${p.id})">🗑</button>` : ''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — PUANTAJ RENDER (mevcut ik.js'i wrap eder)
// ════════════════════════════════════════════════════════════════

function renderIkPuantaj() {
  const cont = _gik('ikh-puantaj-list');
  if (!cont) return;

  const ay   = _gik('ikpn-ay')?.value   || new Date().toISOString().slice(0,7);
  const uid  = parseInt(_gik('ikpn-user')?.value || '0');
  const data = typeof loadPuan==='function' ? loadPuan() : [];
  const users= typeof loadUsers==='function' ? loadUsers() : [];

  let items = data.filter(r => r.date?.startsWith(ay));
  if (uid) items = items.filter(r => r.uid === uid);

  _stik('ikpn-total',    items.length);
  _stik('ikpn-ok',       items.filter(r=>r.ok).length);
  _stik('ikpn-gecikme',  items.filter(r=>!r.ok&&r.aI).length);
  _stik('ikpn-devamsiz', items.filter(r=>!r.aI).length);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:10px">🗓</div>
      <div>${ay} için puantaj kaydı yok</div>
      <button class="btn btns" onclick="IkHub.openPuanModal(null)" style="margin-top:12px">+ Kayıt Ekle</button>
    </div>`;
    return;
  }

  // DocumentFragment ile tablo
  const frag = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Personel</th><th>Tarih</th><th>Planlanan</th><th>Gerçekleşen</th>
    <th>Gecikme</th><th>Fazla</th><th>Durum</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  items.sort((a,b) => b.date.localeCompare(a.date)).forEach(r => {
    const u = users.find(x=>x.id===r.uid)||{name:'?'};
    // Gecikme hesabı
    const gecikme = r.aI && r.pI && r.aI > r.pI ?
      _diffMin(r.pI, r.aI) + ' dk' : '—';
    const fazla = r.aO && r.pO && r.aO > r.pO ?
      _diffMin(r.pO, r.aO) + ' dk' : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:500">${window._esc(u.name||'')}</td>
      <td style="font-family:'DM Mono',monospace">${r.date}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--t2)">${r.pI||'—'} – ${r.pO||'—'}</td>
      <td style="font-family:'DM Mono',monospace">${r.aI||'<span style="color:var(--rd)">—</span>'} – ${r.aO||'—'}</td>
      <td style="font-size:12px;color:${gecikme!=='—'?'var(--am)':'var(--t3)'}">${gecikme}</td>
      <td style="font-size:12px;color:${fazla!=='—'?'var(--gr)':'var(--t3)'}">${fazla}</td>
      <td><span class="badge ${r.ok?'bg':'br'}">${r.ok?'✅ Onaylı':'❌ Sorunlu'}</span></td>
      <td>
        ${_isAdminIk()?`<button class="btn btns" onclick="IkHub.togglePuan(${r.id})">${r.ok?'↩ Geri Al':'✓ Onayla'}</button>`:''}
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

function _diffMin(t1, t2) {
  const [h1,m1]=[...t1.split(':').map(Number)];
  const [h2,m2]=[...t2.split(':').map(Number)];
  return (h2*60+m2)-(h1*60+m1);
}

function toggleIkPuan(id) {
  if (!_isAdminIk()) return;
  const d = typeof loadPuan==='function' ? loadPuan() : [];
  const r = d.find(x=>x.id===id);
  if (!r) return;
  r.ok = !r.ok;
  if (typeof savePuan==='function') savePuan(d);
  renderIkPuantaj();
  _logIk('puan', `Puantaj ${r.ok?'onaylandı':'geri alındı'}: ${r.date}`);
  _toastIk('Puantaj güncellendi ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — İZİN RENDER
// ════════════════════════════════════════════════════════════════

let _IZ_FILTER = 'all';
function setIkIzinFilter(f, btn) {
  _IZ_FILTER = f;
  document.querySelectorAll('#ikh-tab-izin .chip').forEach(b=>b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderIkIzin();
}

function renderIkIzin() {
  const cont = _gik('ikh-izin-list');
  if (!cont) return;

  const data  = typeof loadIzin==='function' ? loadIzin() : [];
  const cu    = _CUik();
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  let items   = _isAdminIk() ? data : data.filter(iz=>iz.uid===cu?.id);
  items = items.filter(iz => !iz.isDeleted);

  const bugun = new Date().toISOString().slice(0,10);
  const kalan = _isAdminIk() ? 0 :
    14 - items.filter(iz=>iz.status==='approved'&&iz.tip==='yillik').reduce((a,iz)=>a+(iz.gun||0),0);

  _stik('ikiz-total', items.length);
  _stik('ikiz-bekle', items.filter(iz=>iz.status==='pending').length);
  _stik('ikiz-onay',  items.filter(iz=>iz.status==='approved').length);
  _stik('ikiz-red',   items.filter(iz=>iz.status==='rejected').length);
  _stik('ikiz-gun',   Math.max(0, kalan));

  if (_IZ_FILTER !== 'all') items = items.filter(iz=>iz.status===_IZ_FILTER);

  if (!items.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:10px">📅</div>
      <div>İzin kaydı bulunamadı</div>
      <button class="btn btnp" onclick="IkHub.openIzinModal(null)" style="margin-top:12px">+ İzin Talep Et</button>
    </div>`;
    return;
  }

  const ST = {
    pending:  { l:'⏳ Bekliyor',    c:'ba' },
    approved: { l:'✅ Onaylı',      c:'bg' },
    rejected: { l:'❌ Reddedildi',  c:'br' },
  };

  const frag = document.createDocumentFragment();
  items.sort((a,b)=>b.ts?.localeCompare(a.ts||'')||0).forEach(iz => {
    const u  = users.find(x=>x.id===iz.uid)||{name:'?'};
    const st = ST[iz.status]||ST.pending;
    const card = document.createElement('div');
    card.className = 'ikh-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span class="badge ${st.c}">${st.l}</span>
            <span style="font-size:12px;font-weight:600;background:var(--s2);padding:2px 8px;border-radius:6px">${iz.tip||'Yıllık İzin'}</span>
            ${_isAdminIk() ? `<span style="font-size:12px;font-weight:600">${window._esc(u.name||'')}</span>` : ''}
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">
            ${iz.bas||'—'} → ${iz.bitis||'—'}
            <span style="font-size:12px;font-weight:500;color:var(--ac);margin-left:8px">${iz.gun||0} gün</span>
          </div>
          ${iz.sebep ? `<div style="font-size:12px;color:var(--t2)">💬 ${iz.sebep}</div>` : ''}
          ${iz.rejectReason ? `<div style="font-size:12px;color:var(--rd)">❌ ${iz.rejectReason}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${_isAdminIk()&&iz.status==='pending' ? `
            <button class="btn btns btng" onclick="IkHub.approveIzin(${iz.id})">✓ Onayla</button>
            <button class="btn btns btnd"  onclick="IkHub.rejectIzin(${iz.id})">✕</button>` : ''}
          <button class="btn btns" onclick="IkHub.printIzin(${iz.id})">🖨</button>
          ${_isAdminIk() ? `<button class="btn btns btnd" onclick="IkHub.delIzin(${iz.id})">🗑</button>` : ''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

// İzin işlemleri - mevcut ik.js'e delegate et
function approveIkIzin(id) { window.approveIzin?.(id); setTimeout(renderIkIzin,200); }
function rejectIkIzin(id) {
  const reason = prompt('Red sebebi (opsiyonel):');
  const d = typeof loadIzin==='function' ? loadIzin() : [];
  const iz = d.find(x=>x.id===id);
  if (!iz) return;
  iz.status='rejected'; iz.rejectReason=reason||''; iz.rejectTs=_tsIk();
  if (typeof storeIzin==='function') storeIzin(d);
  _syncIkFirestore('izin', d);
  renderIkIzin();
  _logIk('izin',`İzin reddedildi: ${iz.bas}-${iz.bitis}`);
  _toastIk('İzin reddedildi','ok');
}
function openIkIzinModal(id) { window.openIzinModal?.(id); }
function printIkIzin(id) { window.printIzinDilekce?.(id); }
function delIkIzin(id) {
  if (!_isAdminIk()) return;
  const d = typeof loadIzin==='function' ? loadIzin() : [];
  const iz = d.find(x=>x.id===id);
  if (!iz) return;
  window.confirmModal('İzin kaydı silinsin mi?', {
    title: 'İzin Kaydı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      iz.isDeleted=true; iz.deletedAt=_tsIk(); iz.deletedBy=_CUik()?.id;
      if (typeof storeIzin==='function') storeIzin(d);
      _syncIkFirestore('izin', d);
      renderIkIzin();
      _toastIk('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — MAAŞ & SGK
// ════════════════════════════════════════════════════════════════

function _loadMaas() {
  try { return JSON.parse(localStorage.getItem('ak_ik_maas1')||'[]'); } catch { return []; }
}
function _storeMaas(d) { localStorage.setItem('ak_ik_maas1', JSON.stringify(d)); }

function renderIkMaas() {
  const cont = _gik('ikh-maas-list');
  if (!cont) return;
  if (!_isAdminIk()) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">🔒</div>
      <div>Maaş bilgileri yalnızca yöneticiler tarafından görülebilir.</div>
    </div>`;
    return;
  }

  const ay    = _gik('ikm-ay')?.value || new Date().toISOString().slice(0,7);
  const dept  = _gik('ikm-dept')?.value || '';
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  const maaslar = _loadMaas().filter(m => m.ay === ay && !m.isDeleted);

  let items = maaslar;
  if (dept) items = items.filter(m => {
    const u = users.find(x=>x.id===m.uid);
    return u?.dept === dept;
  });

  const toplamBrut = items.reduce((a,m)=>a+(m.brut||0),0);
  const toplamNet  = items.reduce((a,m)=>a+(m.net||0),0);
  const sgkIsveren = toplamBrut * 0.2075; // %20.75 işveren SGK payı

  _stik('ikm-personel',   items.length);
  _stik('ikm-toplam-brut', toplamBrut.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺');
  _stik('ikm-toplam-net',  toplamNet.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺');
  _stik('ikm-sgk',         sgkIsveren.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺');

  if (!items.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:10px">💰</div>
      <div>${ay} için bordro girişi yok</div>
      <button class="btn btnp" onclick="IkHub.openMaasModal(null)" style="margin-top:12px">+ Bordro Gir</button>
    </div>`;
    return;
  }

  const frag  = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Personel</th><th>Departman</th><th>Brüt</th><th>SGK İşçi</th>
    <th>Gelir Vergisi</th><th>Net</th><th>Ödeme Durumu</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  items.forEach(m => {
    const u    = users.find(x=>x.id===m.uid)||{name:'?',dept:'—'};
    const sgk  = (m.brut||0)*0.14;         // %14 işçi SGK
    const gv   = ((m.brut||0)-sgk)*0.15;   // Basit gelir vergisi
    const net  = m.net || ((m.brut||0)-sgk-gv);
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:500">${window._esc(u.name||'')}</td>
      <td style="font-size:12px;color:var(--t2)">${window._esc(u.dept||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600">${(m.brut||0).toLocaleString('tr-TR')} ₺</td>
      <td style="font-family:'DM Mono',monospace;color:var(--t2)">${sgk.toFixed(0)} ₺</td>
      <td style="font-family:'DM Mono',monospace;color:var(--t2)">${gv.toFixed(0)} ₺</td>
      <td style="font-family:'DM Mono',monospace;font-weight:700;color:var(--ac)">${net.toFixed(0)} ₺</td>
      <td><span class="badge ${m.odendi?'bg':'ba'}">${m.odendi?'✅ Ödendi':'⏳ Bekliyor'}</span></td>
      <td style="display:flex;gap:4px">
        ${!m.odendi?`<button class="btn btns btng" onclick="IkHub.markMaasOdendi(${m.id})">💸 Ödendi</button>`:''}
        <button class="btn btns" onclick="IkHub.openMaasModal(${m.id})">✏️</button>
        <button class="btn btns btnd" onclick="IkHub.delMaas(${m.id})">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

function openIkMaasModal(id) {
  let mo = _gik('mo-ik-maas');
  if (!mo) { mo=document.createElement('div'); mo.className='mo'; mo.id='mo-ik-maas'; document.body.appendChild(mo); }
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  const data  = _loadMaas();
  const entry = id ? data.find(m=>m.id===id) : null;
  const ay    = _gik('ikm-ay')?.value || new Date().toISOString().slice(0,7);

  mo.innerHTML = `
    <div class="moc" style="max-width:480px">
      <div class="mt">${entry?'✏️ Bordro Düzenle':'💰 Bordro Girişi'}</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:16px">
        <!-- Bölüm 1: Personel -->
        <div style="background:var(--s2);border-radius:10px;padding:14px">
          <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">PERSONEL BILGISI</div>
          <select class="fi" id="ikm-uid" required style="font-size:14px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'">
            ${users.map(u=>`<option value="${u.id}" ${entry?.uid===u.id?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
          <input class="fi" type="month" id="ikm-ay-modal" value="${entry?.ay||ay}" required style="font-size:14px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);margin-top:8px;transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'">
        </div>
        <!-- Bölüm 2: Ücret -->
        <div style="background:var(--s2);border-radius:10px;padding:14px">
          <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">UCRET DETAYLARI</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div><div class="fl" style="margin-bottom:4px">Brut Maas * <span style="color:var(--rd)">₺</span></div>
              <input class="fi" type="number" id="ikm-brut" value="${entry?.brut||''}" placeholder="0.00" min="0" step="0.01" required oninput="IkHub.calcNetMaas()" style="font-size:15px;font-weight:600;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'"></div>
            <div><div class="fl" style="margin-bottom:4px">Net Maas <span style="color:var(--grt)">₺</span></div>
              <input class="fi" type="number" id="ikm-net" value="${entry?.net||''}" placeholder="Otomatik" readonly style="font-size:15px;font-weight:600;padding:10px 12px;border-radius:8px;background:var(--sf);color:var(--grt);border:1.5px solid var(--b)"></div>
            <div><div class="fl" style="margin-bottom:4px">Ikramiye ₺</div>
              <input class="fi" type="number" id="ikm-ikramiye" value="${entry?.ikramiye||0}" placeholder="0" min="0" step="0.01" style="font-size:14px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'"></div>
            <div><div class="fl" style="margin-bottom:4px">Kesinti ₺</div>
              <input class="fi" type="number" id="ikm-kesinti" value="${entry?.kesinti||0}" placeholder="0" min="0" step="0.01" style="font-size:14px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'"></div>
          </div>
        </div>
        <!-- Bölüm 3: Not -->
        <div><div class="fl" style="margin-bottom:4px">Not</div>
          <input class="fi" id="ikm-not" value="${entry?.not||''}" placeholder="Ek bilgi..." style="font-size:14px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--b);transition:border-color .15s" onfocus="this.style.borderColor='var(--ac)'" onblur="this.style.borderColor='var(--b)'"></div>
      </div>
      <input type="hidden" id="ikm-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-ik-maas')">İptal</button>
        <button class="btn btnp" onclick="IkHub.saveMaas()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoIk('mo-ik-maas');
}

function calcIkNetMaas() {
  const brut = parseFloat(_gik('ikm-brut')?.value)||0;
  if (!brut) return;
  const sgk = brut * 0.14;
  const gv  = (brut - sgk) * 0.15;
  const net = brut - sgk - gv;
  if (_gik('ikm-net')) _gik('ikm-net').value = net.toFixed(2);
}

function saveIkMaas() {
  const uid = parseInt(_gik('ikm-uid')?.value||'0');
  const brut= parseFloat(_gik('ikm-brut')?.value)||0;
  if (!uid || !brut) { _toastIk('Personel ve brüt maaş zorunludur','err'); return; }
  const data = _loadMaas();
  const eid  = parseInt(_gik('ikm-eid')?.value||'0');
  const entry= {
    uid, brut, ay:_gik('ikm-ay-modal')?.value||'',
    net:parseFloat(_gik('ikm-net')?.value)||0,
    ikramiye:parseFloat(_gik('ikm-ikramiye')?.value)||0,
    kesinti:parseFloat(_gik('ikm-kesinti')?.value)||0,
    not:_gik('ikm-not')?.value||'',
    odendi:false, uid_kayit:_CUik()?.id, ts:_tsIk(),
  };
  if (eid) { const idx=data.findIndex(m=>m.id===eid); if(idx!==-1) data[idx]={...data[idx],...entry}; }
  else data.unshift({id:generateNumericId(),...entry});
  _storeMaas(data);
  _syncIkFirestore('maas',data);
  _closeMoIk('mo-ik-maas');
  renderIkMaas();
  _logIk('ik',`Bordro girildi: uid=${uid}, brüt=${brut}₺`);
  _toastIk('Bordro kaydedildi ✓','ok');
}

function markIkMaasOdendi(id) {
  const data=_loadMaas(); const m=data.find(x=>x.id===id); if(!m) return;
  m.odendi=true; m.odendiAt=_tsIk(); m.odendiBy=_CUik()?.id;
  _storeMaas(data); _syncIkFirestore('maas',data);
  renderIkMaas(); _toastIk('Ödeme işaretlendi ✓','ok');
}

function delIkMaas(id) {
  const data=_loadMaas(); const m=data.find(x=>x.id===id); if(!m) return;
  window.confirmModal('Bu bordro kaydı silinsin mi?', {
    title: 'Bordro Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      m.isDeleted=true; m.deletedAt=_tsIk(); m.deletedBy=_CUik()?.id;
      _storeMaas(data); _syncIkFirestore('maas',data);
      renderIkMaas(); _toastIk('Silindi','ok');
    }
  });
}

function exportIkBordroXlsx() {
  if(typeof XLSX==='undefined'){_toastIk('XLSX yüklenmedi','err');return;}
  const ay=_gik('ikm-ay')?.value||'';
  const users=typeof loadUsers==='function'?loadUsers():[];
  const rows=_loadMaas().filter(m=>m.ay===ay&&!m.isDeleted).map(m=>{
    const u=users.find(x=>x.id===m.uid)||{name:'?'};
    const sgk=(m.brut||0)*0.14; const gv=((m.brut||0)-sgk)*0.15;
    return{Personel:u.name,Dönem:m.ay,'Brüt(₺)':m.brut||0,
      'SGK İşçi(₺)':sgk.toFixed(2),'Gelir Vergisi(₺)':gv.toFixed(2),
      'Net(₺)':m.net||0,'İkramiye(₺)':m.ikramiye||0,
      'Kesinti(₺)':m.kesinti||0,'Durum':m.odendi?'Ödendi':'Bekliyor'};
  });
  if(!rows.length){_toastIk('Veri yok','warn');return;}
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Bordro');
  XLSX.writeFile(wb,`Bordro_${ay}.xlsx`);
  _toastIk('Bordro Excel oluşturuldu ✓','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — PERFORMANS
// ════════════════════════════════════════════════════════════════

function _loadPerf() {
  try { return JSON.parse(localStorage.getItem('ak_ik_perf1')||'[]'); } catch { return []; }
}
function _storePerf(d) { localStorage.setItem('ak_ik_perf1', JSON.stringify(d)); }

function renderIkPerformans() {
  const cont = _gik('ikh-performans-list');
  if (!cont) return;

  const donem = _gik('ikperf-donem')?.value || '';
  const uid   = parseInt(_gik('ikperf-user')?.value||'0');
  const cu    = _CUik();
  const users = typeof loadUsers==='function' ? loadUsers() : [];
  let data    = _loadPerf().filter(p=>!p.isDeleted);
  if (!_isAdminIk()) data = data.filter(p=>p.uid===cu?.id);
  if (donem) data = data.filter(p=>p.donem===donem);
  if (uid)   data = data.filter(p=>p.uid===uid);

  _stik('ikperf-toplam',    data.length);
  _stik('ikperf-mukemmel',  data.filter(p=>p.puan>=5).length);
  _stik('ikperf-iyi',       data.filter(p=>p.puan===3||p.puan===4).length);
  _stik('ikperf-gelismeli', data.filter(p=>p.puan<=2).length);

  if (!data.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:10px">📊</div>
      <div>Performans değerlendirmesi yok</div>
      ${_isAdminIk()?`<button class="btn btnp" onclick="IkHub.openPerfModal(null)" style="margin-top:12px">+ Değerlendirme Ekle</button>`:''}
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  data.sort((a,b)=>b.ts?.localeCompare(a.ts||'')||0).forEach(p => {
    const u   = users.find(x=>x.id===p.uid)||{name:'?'};
    const def = IK_PERF_PUANLAR[p.puan] || IK_PERF_PUANLAR[3];
    const card = document.createElement('div');
    card.className = 'ikh-card';
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="width:52px;height:52px;border-radius:16px;background:${def.renk}22;
          display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
          ${p.puan>=5?'🌟':p.puan>=4?'⭐':p.puan>=3?'✨':'💡'}
        </div>
        <div style="flex:1;min-width:180px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:14px">${window._esc(u.name||'')}</span>
            <span class="badge ${def.c}">${def.l}</span>
            ${p.donem?`<span style="font-size:11px;color:var(--t3)">${p.donem}</span>`:''}
          </div>
          ${p.guclu?`<div style="font-size:12px;color:var(--t2);margin-bottom:2px">💪 <strong>Güçlü:</strong> ${p.guclu}</div>`:''}
          ${p.gelisim?`<div style="font-size:12px;color:var(--t2);margin-bottom:2px">📈 <strong>Gelişim:</strong> ${p.gelisim}</div>`:''}
          ${p.hedef?`<div style="font-size:12px;color:var(--t2)">🎯 <strong>Hedef:</strong> ${p.hedef}</div>`:''}
          <div style="font-size:10px;color:var(--t3);margin-top:6px">
            Değerlendiren: ${window._esc(users.find(x=>x.id===p.degUid)?.name||'—')} · ${p.ts?.slice(0,10)||''}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${_isAdminIk()?`
            <button class="btn btns" onclick="IkHub.openPerfModal(${p.id})">✏️</button>
            <button class="btn btns btnd" onclick="IkHub.delPerf(${p.id})">🗑</button>`:''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function openIkPerfModal(id) {
  let mo=_gik('mo-ik-perf');
  if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='mo-ik-perf';document.body.appendChild(mo);}
  const users=typeof loadUsers==='function'?loadUsers():[];
  const data=_loadPerf();
  const entry=id?data.find(p=>p.id===id):null;
  mo.innerHTML=`
    <div class="moc" style="max-width:500px">
      <div class="mt">${entry?'✏️ Performans Düzenle':'📊 Performans Değerlendirmesi'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="grid-column:1/-1"><label class="fl">Personel *</label>
          <select class="fi" id="ikperf-uid-modal">
            ${users.map(u=>`<option value="${u.id}" ${entry?.uid===u.id?'selected':''}>${window._esc(u.name||'')}</option>`).join('')}
          </select></div>
        <div><label class="fl">Değerlendirme Dönemi</label>
          <select class="fi" id="ikperf-donem-modal">
            <option ${entry?.donem==='2026-Q1'?'selected':''}>2026-Q1</option>
            <option ${entry?.donem==='2025-Q4'?'selected':''}>2025-Q4</option>
            <option ${entry?.donem==='2025-Q3'?'selected':''}>2025-Q3</option>
          </select></div>
        <div><label class="fl">Puan (1-5) *</label>
          <select class="fi" id="ikperf-puan">
            ${[5,4,3,2,1].map(n=>`<option value="${n}" ${entry?.puan===n?'selected':''}>${IK_PERF_PUANLAR[n].l}</option>`).join('')}
          </select></div>
        <div style="grid-column:1/-1"><label class="fl">Güçlü Yönler</label>
          <textarea class="fi" id="ikperf-guclu" rows="2" placeholder="İletişim, takım çalışması...">${entry?.guclu||''}</textarea></div>
        <div style="grid-column:1/-1"><label class="fl">Gelişim Alanları</label>
          <textarea class="fi" id="ikperf-gelisim" rows="2" placeholder="Teknik beceriler, zaman yönetimi...">${entry?.gelisim||''}</textarea></div>
        <div style="grid-column:1/-1"><label class="fl">Sonraki Dönem Hedefi</label>
          <input class="fi" id="ikperf-hedef" value="${entry?.hedef||''}" placeholder="Örn: Satış hedefini %120 gerçekleştir"></div>
      </div>
      <input type="hidden" id="ikperf-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-ik-perf')">İptal</button>
        <button class="btn btnp" onclick="IkHub.savePerf()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoIk('mo-ik-perf');
}

function saveIkPerf() {
  const uid=parseInt(_gik('ikperf-uid-modal')?.value||'0');
  const puan=parseInt(_gik('ikperf-puan')?.value||'3');
  if(!uid){_toastIk('Personel seçiniz','err');return;}
  const data=_loadPerf();
  const eid=parseInt(_gik('ikperf-eid')?.value||'0');
  const entry={uid,puan,donem:_gik('ikperf-donem-modal')?.value||'',
    guclu:_gik('ikperf-guclu')?.value||'',
    gelisim:_gik('ikperf-gelisim')?.value||'',
    hedef:_gik('ikperf-hedef')?.value||'',
    degUid:_CUik()?.id, ts:_tsIk()};
  if(eid){const idx=data.findIndex(p=>p.id===eid);if(idx!==-1)data[idx]={...data[idx],...entry};}
  else data.unshift({id:generateNumericId(),...entry});
  _storePerf(data); _syncIkFirestore('performans',data);
  _closeMoIk('mo-ik-perf'); renderIkPerformans();
  _logIk('ik',`Performans değerlendirmesi girildi: uid=${uid}, puan=${puan}`);
  _toastIk('Değerlendirme kaydedildi ✓','ok');
}

function delIkPerf(id) {
  const data=_loadPerf();const p=data.find(x=>x.id===id);
  if(!p) return;
  window.confirmModal('Bu değerlendirme silinsin mi?', {
    title: 'Değerlendirme Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      p.isDeleted=true;p.deletedAt=_tsIk();p.deletedBy=_CUik()?.id;
      _storePerf(data);_syncIkFirestore('performans',data);
      renderIkPerformans();_toastIk('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — SÖZLEŞMELER
// ════════════════════════════════════════════════════════════════

function _loadSoz() {
  try { return JSON.parse(localStorage.getItem('ak_ik_soz1')||'[]'); } catch { return []; }
}
function _storeSoz(d) { localStorage.setItem('ak_ik_soz1', JSON.stringify(d)); }

let _SOZ_FILTER='all';
function setIkSozFilter(f,btn) {
  _SOZ_FILTER=f;
  document.querySelectorAll('#ikh-tab-sozlesme .chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  renderIkSozlesme();
}

function renderIkSozlesme() {
  const cont=_gik('ikh-sozlesme-list');
  if(!cont) return;
  const today=new Date().toISOString().slice(0,10);
  const soon=new Date(Date.now()+30*864e5).toISOString().slice(0,10);
  const users=typeof loadUsers==='function'?loadUsers():[];
  const _cuSoz=_CUik();
  let data=_loadSoz().filter(s=>!s.isDeleted);
  if(!_isAdminIk()) data=data.filter(s=>s.uid===_cuSoz?.id);

  _stik('iksoz-total', data.length);
  _stik('iksoz-aktif', data.filter(s=>!s.bitis||s.bitis>=today).length);
  _stik('iksoz-bitis', data.filter(s=>s.bitis&&s.bitis>=today&&s.bitis<=soon).length);
  _stik('iksoz-surdu', data.filter(s=>s.bitis&&s.bitis<today).length);

  if(_SOZ_FILTER==='aktif') data=data.filter(s=>!s.bitis||s.bitis>=today);
  if(_SOZ_FILTER==='bitis') data=data.filter(s=>s.bitis&&s.bitis>=today&&s.bitis<=soon);
  if(_SOZ_FILTER==='surdu') data=data.filter(s=>s.bitis&&s.bitis<today);

  if(!data.length){
    cont.innerHTML=`<div style="padding:40px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:10px">📄</div>
      <div>Sözleşme kaydı yok</div>
      ${_isAdminIk()?`<button class="btn btnp" onclick="IkHub.openSozlesmeModal(null)" style="margin-top:12px">+ Sözleşme Ekle</button>`:''}
    </div>`;
    return;
  }

  const frag=document.createDocumentFragment();
  data.forEach(s=>{
    const u=users.find(x=>x.id===s.uid)||{name:'?'};
    const expired=s.bitis&&s.bitis<today;
    const nearEnd=s.bitis&&s.bitis>=today&&s.bitis<=soon;
    const card=document.createElement('div');
    card.className='ikh-card';
    card.style.borderLeft=`3px solid ${expired?'var(--rd)':nearEnd?'var(--am)':'var(--gr)'}`;
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:20px">📄</span>
            <span style="font-weight:700;font-size:14px">${window._esc(u.name||'')}</span>
            <span style="font-size:11px;font-weight:700;background:var(--s2);padding:2px 8px;border-radius:6px">${s.tip||'Belirsiz Süreli'}</span>
            <span class="badge ${expired?'br':nearEnd?'ba':'bg'}">${expired?'❌ Süresi Geçmiş':nearEnd?'⏰ Yakında Bitiyor':'✅ Geçerli'}</span>
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;gap:16px;flex-wrap:wrap">
            ${s.bas?`<span>📅 Başlangıç: ${s.bas}</span>`:''}
            ${s.bitis?`<span>🗓 Bitiş: <strong style="color:${expired?'var(--rd)':nearEnd?'var(--am)':'inherit'}">${s.bitis}</strong></span>`:''}
          </div>
          ${s.not?`<div style="font-size:11px;color:var(--t3);margin-top:4px">💬 ${s.not}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${s.dosya?`<button class="btn btns" onclick="window.open('${s.dosya}')">📎 Dosya</button>`:''}
          ${_isAdminIk()?`
            <button class="btn btns" onclick="IkHub.openSozlesmeModal(${s.id})">✏️</button>
            <button class="btn btns btnd" onclick="IkHub.delSozlesme(${s.id})">🗑</button>`:''}
        </div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function openIkSozlesmeModal(id) {
  let mo=_gik('mo-ik-soz');
  if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='mo-ik-soz';document.body.appendChild(mo);}
  const users=typeof loadUsers==='function'?loadUsers():[];
  const data=_loadSoz();
  const entry=id?data.find(s=>s.id===id):null;
  mo.innerHTML=`
    <div class="moc" style="max-width:480px">
      <div class="mt">${entry?'✏️ Sözleşme Düzenle':'📄 Yeni Sözleşme'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="grid-column:1/-1"><label class="fl">Personel *</label>
          <select class="fi" id="iksoz-uid">
            ${users.map(u=>`<option value="${u.id}" ${entry?.uid===u.id?'selected':''}>${window._esc(u.name||'')}</option>`).join('')}
          </select></div>
        <div style="grid-column:1/-1"><label class="fl">Sözleşme Tipi</label>
          <select class="fi" id="iksoz-tip">
            ${IK_SOZLESME_TIPLERI.map(t=>`<option ${entry?.tip===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
        <div><label class="fl">Başlangıç Tarihi</label>
          <input class="fi" type="date" id="iksoz-bas" value="${entry?.bas||new Date().toISOString().slice(0,10)}"></div>
        <div><label class="fl">Bitiş Tarihi (opsiyonel)</label>
          <input class="fi" type="date" id="iksoz-bitis" value="${entry?.bitis||''}"></div>
        <div style="grid-column:1/-1"><label class="fl">Dosya Linki (Drive, vb.)</label>
          <input class="fi" id="iksoz-dosya" value="${entry?.dosya||''}" placeholder="https://drive.google.com/..."></div>
        <div style="grid-column:1/-1"><label class="fl">Not</label>
          <textarea class="fi" id="iksoz-not" rows="2" placeholder="Ek bilgi...">${entry?.not||''}</textarea></div>
      </div>
      <input type="hidden" id="iksoz-eid" value="${id||''}">
      <div class="mf">
        <button class="btn" onclick="closeMo('mo-ik-soz')">İptal</button>
        <button class="btn btnp" onclick="IkHub.saveSozlesme()">💾 Kaydet</button>
      </div>
    </div>`;
  _openMoIk('mo-ik-soz');
}

function saveIkSozlesme() {
  const uid=parseInt(_gik('iksoz-uid')?.value||'0');
  if(!uid){_toastIk('Personel seçiniz','err');return;}
  const data=_loadSoz();
  const eid=parseInt(_gik('iksoz-eid')?.value||'0');
  const entry={uid,tip:_gik('iksoz-tip')?.value||'Belirsiz Süreli',
    bas:_gik('iksoz-bas')?.value||'',bitis:_gik('iksoz-bitis')?.value||'',
    dosya:_gik('iksoz-dosya')?.value||'',not:_gik('iksoz-not')?.value||'',
    uid_kayit:_CUik()?.id,ts:_tsIk()};
  if(eid){const idx=data.findIndex(s=>s.id===eid);if(idx!==-1)data[idx]={...data[idx],...entry};}
  else data.unshift({id:generateNumericId(),...entry});
  _storeSoz(data);_syncIkFirestore('sozlesme',data);
  _closeMoIk('mo-ik-soz');renderIkSozlesme();
  _logIk('ik',`Sözleşme kaydedildi: uid=${uid}`);
  _toastIk('Sözleşme kaydedildi ✓','ok');
}

function delIkSozlesme(id) {
  const data=_loadSoz();const s=data.find(x=>x.id===id);
  if(!s) return;
  window.confirmModal('Bu sözleşme silinsin mi?', {
    title: 'Sözleşme Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      s.isDeleted=true;s.deletedAt=_tsIk();s.deletedBy=_CUik()?.id;
      _storeSoz(data);_syncIkFirestore('sozlesme',data);
      renderIkSozlesme();_toastIk('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — PERSONEL CRUD (mevcut ik.js delegate)
// ════════════════════════════════════════════════════════════════

function openIkPersonelEdit(id) { window.openIkModal?.(id); }
function delIkPersonel(id) {
  if(!_isAdminIk()) return;
  const d=typeof loadIk==='function'?loadIk():[];
  const p=d.find(x=>x.id===id);
  if(!p) return;
  window.confirmModal(`"${p.name}" kaydı silinsin mi?`, {
    title: 'Personel Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      p.isDeleted=true;p.deletedAt=_tsIk();p.deletedBy=_CUik()?.id;
      if(typeof storeIk==='function') storeIk(d);
      _syncIkFirestore('ik',d);
      renderIkPersonel();
      _logIk('ik',`Personel silindi: ${p.name}`);
      _toastIk('Silindi','ok');
    }
  });
}

function exportIkHubXlsx() {
  if(typeof XLSX==='undefined'){_toastIk('XLSX yüklenmedi','err');return;}
  const tab=_IK_TAB;
  if(tab==='personel') { window.exportIkXlsx?.(); return; }
  if(tab==='maas')     { exportIkBordroXlsx(); return; }
  _toastIk('Bu sekme için Excel henüz hazırlanmadı','warn');
}

function exportIkPuantajPdf() { window.puanExportPdf?.(); }

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — FIREBASE SYNC
// ════════════════════════════════════════════════════════════════

function _syncIkFirestore(col, data) {
  try {
    const FB_DB=window.Auth?.getFBDB?.(); if(!FB_DB) return;
    const tid=window.Auth?.getTenantId?.()||'tenant_default';
    const paths=window.FirebaseConfig?.paths; if(!paths) return;
    FB_DB.collection(paths.tenant(tid)).doc(`ik_${col}`)
      .set({data,syncedAt:new Date().toISOString()},{merge:true})
      .catch(e=>console.warn(`[IkHub] Firestore sync hatası (${col}):`,e));
  } catch(e){console.warn('[IkHub] sync:',e);}
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 11 — ANA RENDER & EXPORT
// ════════════════════════════════════════════════════════════════

function renderIkHub() {
  _injectIkHub();
  setIkTab(_IK_TAB, document.querySelector(`#panel-ik-hub [data-tab="${_IK_TAB}"]`));
}


const IK_TRANSLATIONS={
  tr:{
    app_sub:'İŞE ALIM SİSTEMİ',username:'Kullanıcı Adı',password:'Şifre',login_as:'Giriş Rolü',
    role_admin:'Yönetici (Admin)',role_hr:'IK Uzmanı',role_viewer:'Görüntüleyici',
    login_btn:'Giriş Yap',login_err:'Kullanıcı adı veya şifre hatalı.',
    pipeline:'Aday Havuzu',phone_screen:'Telefon Ön Eleme',interview_form_nav:'Mülakat Formu',
    records:'Mülakat Kayıtları',test_drive_nav:'Test Sürüşü',evaluation:'Değerlendirme',
    reference:'Referans Kontrol',thanks:'Teşekkür Mektubu',ai_tools:'YZ Araçları',
    comparison:'Aday Karşılaştırma',resources:'IK Kaynakları',version_history:'Sürüm Geçmişi',
    suggest:'Güncelleme Öner',
    admin_panel:'Kullanıcı Yönetimi',
    phone_title:'Telefon Ön Görüşme Rehberi',
    interview_form:'Mülakat Formu',interview_form_sub:'Soru ekle · Yanıt yaz · Kaydet',
    checklist_tab:'Kontrol Listesi',form_tab:'Mülakat Formu',bank_tab:'Soru Bankası',
    interview_info:'Görüşme Bilgileri',candidate_name:'Adayın Adı Soyadı',position:'Pozisyon',
    interview_datetime:'Görüşme Tarihi & Saati',interviewer:'Görüşen Kişi',
    qa_title:'Sorular ve Yanıtlar',from_bank:'+ Bankadan',add_question:'+ Soru Ekle',
    interviewer_note:'Görüşen Kişinin Notu',save_interview:'Görüşmeyi Kaydet',clear_form:'Temizle',
    records_title:'Mülakat Kayıtları',records_sub:'Kaydedilen tüm görüşmeler',
    test_title:'Test Sürüşü — Adım 8',first2months:'İlk 2 Ay',last_interview:'Son Mülakat',aspects:'Test Edilen Yönler',
    ref_title:'Referans Kontrol Formu',ref_name:'Referans Adı',company:'Firma',phone:'Telefon',
    ref_title_lbl:'Referansın Unvanı',app_date:'Başvuru Tarihi',interview_date:'Görüşme Tarihi',
    work_dates:'Çalışma Tarihleri',sep_reason:'Ayrılış Sebebi',work_quality:'Çalışma Kalitesi',
    training_needed:'Eğitim Gereken Alanlar',general_comments:'Genel Yorumlar',
    save_form:'Formu Kaydet',ref_saved:'Referans formu kaydedildi!',
    thanks_title:'Teşekkür Mektubu',sender:'Gönderen Adı & Unvanı',preview:'Önizleme',copy_text:'Metni Kopyala',
    ai_title:'Yapay Zeka IK Araçları',cv_analysis:'CV Analizi',gen_questions:'Mülakat Soruları',gen_posting:'İş İlanı',
    cv_text:'CV Metni',desired_skills:'Aranan Özellikler (isteğe bağlı)',analyze_cv:"CV'yi Analiz Et",
    question_type:'Soru Türü',level:'Seviye',focus_skills:'Odak Yetkinlikler',generate_questions:'Soru Üret',
    position_name:'Pozisyon Adı',department:'Departman',work_model:'Çalışma Modeli',
    requirements:'Temel Gereksinimler',generate_posting:'İş İlanı Oluştur',
    technical:'Teknik',behavioral:'Davranışsal',situational:'Durum Bazlı',mixed:'Karma',manager:'Yönetici',
    office:'Ofis',hybrid:'Hibrit',
    comparison_title:'Aday Karşılaştırma',add_candidate:'+ Aday Ekle',
    interview1:'1. Görüşme',test_drive:'Test Sürüşü',interview2:'2. Görüşme',total_score:'Toplam Puan',
    resources_title:'IK Kaynakları',resources_sub:'Kitaplar · Web Siteleri · Araçlar · Yöntemler',
    version_sub:'Tüm güncellemeler ve değişiklik notları',
    suggest_title:'Güncelleme Önerileri',suggest_sub:'Yeni özellik veya iyileştirme önerin',
    new_suggestion:'Yeni Öneri Gönder',your_name:'Adınız',category:'Kategori',
    suggestion_title:'Başlık',description:'Açıklama',submit_suggestion:'Öneriyi Gönder',
    all_suggestions:'Tüm Öneriler',cat_feature:'Yeni Özellik',cat_improvement:'İyileştirme',
    cat_bug:'Hata Bildirimi',cat_design:'Tasarım',cat_other:'Diğer',
    select_from_bank:'Soru Bankasından Seç',
    view:'Görüntüle',delete:'Sil',add_to_form:'Forma Ekle',
    no_records:'Henüz kaydedilmiş mülakat yok.',
    suggestion_saved:'Öneriniz kaydedildi, teşekkürler!',suggestion_err:'Lütfen başlık ve açıklama alanlarını doldurun.',
    logout_confirm:'Çıkış yapmak istediğinize emin misiniz?',
    select_candidate:'Aday Havuzu\'ndan bir aday seçin.',
    thanks_letter:(a,g)=>`Sayın ${a},\n\nGeldiğiniz ve benimle tanıştığınız için teşekkür ederim. Sizinle görüşmekten memnunluk duyduğumu ve ilginize teşekkür ettiğimi belirtmek isterim.\n\nÇok sayıda nitelikli aday arasından bir karar vermek oldukça güç oldu. Pozisyonu size teklif edemediğimizden dolayı üzüntü duymaktayım; ancak önümüzdeki altı aylık süre içerisinde boşalan diğer pozisyonlar için özgeçmişinizi saklayacağımızı bildirmek isterim.\n\nİş arayışınızda başarılar dilerim.\n\nSaygılarımla,\n${g}\nDUAY Uluslararası Tic. Ltd. Şti.\nwww.duaycor.com | +90 212 625 5 444`,
  },
  en:{
    app_sub:'RECRUITMENT SYSTEM',username:'Username',password:'Password',login_as:'Login Role',
    role_admin:'Administrator (Admin)',role_hr:'HR Specialist',role_viewer:'Viewer',
    login_btn:'Log In',login_err:'Invalid username or password.',
    pipeline:'Candidate Pool',phone_screen:'Phone Screening',interview_form_nav:'Interview Form',
    records:'Interview Records',test_drive_nav:'Test Drive',evaluation:'Evaluation',
    reference:'Reference Check',thanks:'Thank You Letter',ai_tools:'AI Tools',
    comparison:'Candidate Comparison',resources:'HR Resources',version_history:'Version History',
    suggest:'Suggest Update',
    admin_panel:'User Management',
    phone_title:'Phone Screening Guide',
    interview_form:'Interview Form',interview_form_sub:'Add questions · Write answers · Save',
    checklist_tab:'Checklist',form_tab:'Interview Form',bank_tab:'Question Bank',
    interview_info:'Interview Details',candidate_name:'Candidate Name',position:'Position',
    interview_datetime:'Interview Date & Time',interviewer:'Interviewer',
    qa_title:'Questions & Answers',from_bank:'+ From Bank',add_question:'+ Add Question',
    interviewer_note:'Interviewer Note',save_interview:'Save Interview',clear_form:'Clear',
    records_title:'Interview Records',records_sub:'All saved interviews',
    test_title:'Test Drive — Step 8',first2months:'First 2 Months',last_interview:'Final Interview',aspects:'Tested Aspects',
    ref_title:'Reference Check Form',ref_name:'Reference Name',company:'Company',phone:'Phone',
    ref_title_lbl:'Reference Title',app_date:'Application Date',interview_date:'Interview Date',
    work_dates:'Employment Dates',sep_reason:'Reason for Leaving',work_quality:'Work Quality',
    training_needed:'Areas Needing Training',general_comments:'General Comments',
    save_form:'Save Form',ref_saved:'Reference form saved!',
    thanks_title:'Thank You Letter',sender:'Sender Name & Title',preview:'Preview',copy_text:'Copy Text',
    ai_title:'AI HR Tools',cv_analysis:'CV Analysis',gen_questions:'Interview Questions',gen_posting:'Job Posting',
    cv_text:'CV Text',desired_skills:'Desired Skills (optional)',analyze_cv:'Analyze CV',
    question_type:'Question Type',level:'Level',focus_skills:'Focus Skills',generate_questions:'Generate Questions',
    position_name:'Position Name',department:'Department',work_model:'Work Model',
    requirements:'Key Requirements',generate_posting:'Generate Job Posting',
    technical:'Technical',behavioral:'Behavioral',situational:'Situational',mixed:'Mixed',manager:'Manager',
    office:'Office',hybrid:'Hybrid',
    comparison_title:'Candidate Comparison',add_candidate:'+ Add Candidate',
    interview1:'Interview 1',test_drive:'Test Drive',interview2:'Interview 2',total_score:'Total Score',
    resources_title:'HR Resources',resources_sub:'Books · Websites · Tools · Methods',
    version_sub:'All updates and change notes',
    suggest_title:'Update Suggestions',suggest_sub:'Suggest a new feature or improvement',
    new_suggestion:'Submit New Suggestion',your_name:'Your Name',category:'Category',
    suggestion_title:'Title',description:'Description',submit_suggestion:'Submit Suggestion',
    all_suggestions:'All Suggestions',cat_feature:'New Feature',cat_improvement:'Improvement',
    cat_bug:'Bug Report',cat_design:'Design',cat_other:'Other',
    select_from_bank:'Select from Question Bank',
    view:'View',delete:'Delete',add_to_form:'Add to Form',
    no_records:'No saved interviews yet.',
    suggestion_saved:'Your suggestion was submitted, thank you!',suggestion_err:'Please fill in the title and description fields.',
    logout_confirm:'Are you sure you want to log out?',
    select_candidate:'Select a candidate from the Pipeline.',
    thanks_letter:(a,g)=>`Dear ${a},\n\nThank you for coming in and meeting with me. I wanted to let you know how much I enjoyed speaking with you and appreciated your interest in the position.\n\nWhile it was a difficult decision given the strength of our candidates, we are unable to offer you this position at this time. However, we will keep your resume on file for future openings over the next six months.\n\nWe wish you the best in your job search.\n\nSincerely,\n${g}\nDUAY International Trading Ltd.\nwww.duaycor.com | +90 212 625 5 444`,
  },
  fr:{
    app_sub:'SYSTÈME DE RECRUTEMENT',username:'Nom d\'utilisateur',password:'Mot de passe',login_as:'Rôle de connexion',
    role_admin:'Administrateur (Admin)',role_hr:'Spécialiste RH',role_viewer:'Observateur',
    login_btn:'Se connecter',login_err:'Nom d\'utilisateur ou mot de passe incorrect.',
    pipeline:'Vivier de candidats',phone_screen:'Présélection téléphonique',interview_form_nav:'Formulaire d\'entretien',
    records:'Enregistrements d\'entretiens',test_drive_nav:'Test pratique',evaluation:'Évaluation',
    reference:'Vérification des références',thanks:'Lettre de remerciement',ai_tools:'Outils IA',
    comparison:'Comparaison des candidats',resources:'Ressources RH',version_history:'Historique des versions',
    suggest:'Suggérer une mise à jour',
    admin_panel:'Gestion des utilisateurs',
    phone_title:'Guide d\'entretien téléphonique',
    interview_form:'Formulaire d\'entretien',interview_form_sub:'Ajouter des questions · Écrire des réponses · Sauvegarder',
    checklist_tab:'Liste de contrôle',form_tab:'Formulaire',bank_tab:'Banque de questions',
    interview_info:'Détails de l\'entretien',candidate_name:'Nom du candidat',position:'Poste',
    interview_datetime:'Date et heure de l\'entretien',interviewer:'Intervieweur',
    qa_title:'Questions et réponses',from_bank:'+ De la banque',add_question:'+ Ajouter une question',
    interviewer_note:'Note de l\'intervieweur',save_interview:'Sauvegarder l\'entretien',clear_form:'Effacer',
    records_title:'Enregistrements d\'entretiens',records_sub:'Tous les entretiens enregistrés',
    test_title:'Test pratique — Étape 8',first2months:'2 premiers mois',last_interview:'Dernier entretien',aspects:'Aspects testés',
    ref_title:'Formulaire de vérification des références',ref_name:'Nom de la référence',company:'Entreprise',phone:'Téléphone',
    ref_title_lbl:'Titre de la référence',app_date:'Date de candidature',interview_date:'Date d\'entretien',
    work_dates:'Dates d\'emploi',sep_reason:'Raison du départ',work_quality:'Qualité du travail',
    training_needed:'Domaines nécessitant une formation',general_comments:'Commentaires généraux',
    save_form:'Sauvegarder le formulaire',ref_saved:'Formulaire de référence sauvegardé!',
    thanks_title:'Lettre de remerciement',sender:'Nom et titre de l\'expéditeur',preview:'Aperçu',copy_text:'Copier le texte',
    ai_title:'Outils RH IA',cv_analysis:'Analyse CV',gen_questions:'Questions d\'entretien',gen_posting:'Offre d\'emploi',
    cv_text:'Texte du CV',desired_skills:'Compétences souhaitées (optionnel)',analyze_cv:'Analyser le CV',
    question_type:'Type de question',level:'Niveau',focus_skills:'Compétences clés',generate_questions:'Générer des questions',
    position_name:'Nom du poste',department:'Département',work_model:'Modèle de travail',
    requirements:'Exigences principales',generate_posting:'Créer l\'offre d\'emploi',
    technical:'Technique',behavioral:'Comportemental',situational:'Situationnel',mixed:'Mixte',manager:'Manager',
    office:'Bureau',hybrid:'Hybride',
    comparison_title:'Comparaison des candidats',add_candidate:'+ Ajouter un candidat',
    interview1:'Entretien 1',test_drive:'Test pratique',interview2:'Entretien 2',total_score:'Score total',
    resources_title:'Ressources RH',resources_sub:'Livres · Sites web · Outils · Méthodes',
    version_sub:'Toutes les mises à jour et notes de changement',
    suggest_title:'Suggestions de mise à jour',suggest_sub:'Suggérer une nouvelle fonctionnalité ou amélioration',
    new_suggestion:'Soumettre une nouvelle suggestion',your_name:'Votre nom',category:'Catégorie',
    suggestion_title:'Titre',description:'Description',submit_suggestion:'Soumettre la suggestion',
    all_suggestions:'Toutes les suggestions',cat_feature:'Nouvelle fonctionnalité',cat_improvement:'Amélioration',
    cat_bug:'Rapport de bug',cat_design:'Design',cat_other:'Autre',
    select_from_bank:'Sélectionner dans la banque de questions',
    view:'Voir',delete:'Supprimer',add_to_form:'Ajouter au formulaire',
    no_records:'Aucun entretien enregistré.',
    suggestion_saved:'Votre suggestion a été soumise, merci!',suggestion_err:'Veuillez remplir les champs titre et description.',
    logout_confirm:'Êtes-vous sûr de vouloir vous déconnecter?',
    select_candidate:'Sélectionnez un candidat dans le Pipeline.',
    thanks_letter:(a,g)=>`Cher(e) ${a},\n\nJe vous remercie de vous être déplacé(e) et de m'avoir rencontré. Je souhaitais vous faire savoir combien j'ai apprécié notre échange et votre intérêt pour le poste.\n\nBien que la décision ait été difficile étant donné la qualité de nos candidats, nous ne sommes pas en mesure de vous proposer ce poste pour le moment. Cependant, nous conserverons votre candidature pour les prochaines opportunités au cours des six mois à venir.\n\nNous vous souhaitons beaucoup de succès dans votre recherche d'emploi.\n\nCordialement,\n${g}\nDUAY International Trading Ltd.\nwww.duaycor.com | +90 212 625 5 444`,
  },
};
// ════════════════════════════════════════════════════════════════
// İK İŞE ALIM ENTEGRASYONU — ik_hub.js genişlemesi
// Kaynak: DUAY IK (index.html) → Platform'a entegre edildi
// ════════════════════════════════════════════════════════════════




// ══════════════════════════════════════════════════════════════
// DUAY İK HUB — Platform Entegrasyon Köprüsü  v8.1.0
// ══════════════════════════════════════════════════════════════

// usrKey: kullanıcı bazlı storage key
function usrKey(k){ 
  const cu = window.Auth?.getCU?.();
  return (cu ? cu.id + '_' : '') + k; 
}
function usrGet(k, def){ 
  try{ return JSON.parse(localStorage.getItem(usrKey(k))) ?? def; }
  catch(e){ return def; } 
}
function usrSet(k, v){ 
  localStorage.setItem(usrKey(k), JSON.stringify(v)); 
}

// getUsers / saveUsers - platform delegasyonu (duay-ik-users kaldırıldı)
function getUsers(){
  if (typeof window.loadUsers === 'function') return window.loadUsers();
  return DEFAULT_USERS;
}
function _ikSaveUsers(u){
  if (typeof window.saveUsers === 'function') window.saveUsers(u);
}

// hasPerm - platform kullanıcısıyla çalış
function hasPerm(panel){
  const cu = window.Auth?.getCU?.();
  if(!cu) return false;
  if(cu.role === 'admin') return true;
  const u = getUsers().find(x => x.user === cu.email || x.id === cu.id || x.user === cu.name);
  if(u) return u.role==='admin' || (u.permissions||[]).includes(panel);
  return cu.role !== 'viewer'; // Platform kullanıcısı - izin ver
}

// _ikT - i18n helper (platform I18n yoksa kendi TRANSLATIONS'ı kullan)
function _ikT(key, lang){
  const l = lang || localStorage.getItem('ak_lang') || 'tr';
  // Önce kendi TRANSLATIONS, sonra platform i18n
  if (typeof IK_TRANSLATIONS !== 'undefined' && IK_TRANSLATIONS[l]?.[key]) 
    return IK_TRANSLATIONS[l][key];
  return window.I18n?.t?.(key) || key;
}

// Toast köprüsü
function _ikToast(msg, type){ 
  window.toast?.(msg, type); 
}

// logActivity köprüsü
function _ikLog(action, detail){ 
  window.logActivity?.('ik', action + (detail ? ': ' + detail : '')); 
}

// fmtTs - zaman formatlama
function fmtTs(ts){ 
  if(!ts) return '';
  try{ return new Date(ts).toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'}); }
  catch(e){ return String(ts).slice(0,10); }
}


// doLogin - İK hub içinde kullanılmıyor (platform auth yönetiyor)
// Ama bağımsız çalışması için localStorage fallback
function doLogin(){
  const user = document.getElementById('l-user')?.value?.trim();
  const pass  = document.getElementById('l-pass')?.value;
  if(!user || !pass){ 
    const errEl = document.getElementById('login-err');
    if(errEl) errEl.textContent = _ikT('login_error') || 'Kullanıcı adı ve şifre zorunludur';
    return; 
  }
  const users = getUsers();
  const found = users.find(u => u.user === user && u.pass === pass && u.active !== false);
  if(found){
    // ik_cu kaldırıldı — platform Auth kullanılır
    // localStorage.setItem('ik_cu', JSON.stringify(found));
    const ls = document.getElementById('login-screen');
    const app = document.getElementById('app');
    if(ls) ls.style.display = 'none';
    if(app) app.style.display = '';
    renderNavItems();
    go('pipeline', null, _ikT('pipeline') || 'Pipeline');
    renderPipe();
  } else {
    const errEl = document.getElementById('login-err');
    if(errEl){ errEl.textContent = _ikT('login_error') || 'Hatalı kullanıcı adı veya şifre'; errEl.style.color='var(--ik-rd)'; }
  }
}

function _ikLogoutLocal(){ 
  localStorage.removeItem('ik_cu');
  location.reload(); 
}

// ══════════════════════════════════════════════════
// VERSION & APP META
// ══════════════════════════════════════════════════
var APP_VERSION = '1.3.0';
var APP_VERSIONS = [
  {
    ver:'1.3.0',
    ts:'2026-03-16T18:45:00',
    changes:['Çok dil desteği eklendi (TR / EN / FR)','Login ekranı ve kullanıcı rolleri (Admin, IK Uzmanı, Görüntüleyici)','Gece / Gündüz modu','Sürüm geçmişi paneli','Güncelleme öneri sistemi (oy verme, kategori, durum)','Login ekranında canlı saat ve versiyon bilgisi','Her sayfada versiyon chip\'i','Soru bankasından forma tek tıkla ekleme','YZ sorularını forma aktar butonu','Kaydedilmiş mülakatları görüntüle / yazdır / sil']
  },
  {
    ver:'1.2.0',
    ts:'2026-03-15T16:04:00',
    changes:['GitHub Pages\'e HTML tek dosya olarak yayınlandı','IK Kaynakları modülü (18 kaynak: kitap, araç, yöntem, Türkçe kaynaklar)','Mülakat formu — soru ekle/çıkar, yanıt kutusu','LocalStorage ile görüşme kaydetme veritabanı','Kayıt görüntüleme ve PDF yazdırma','Aday Karşılaştırma tablosu']
  },
  {
    ver:'1.1.0',
    ts:'2026-03-15T14:00:00',
    changes:['PDF dökümanlarından tüm içerik programa entegre edildi','Telefon ön eleme rehberi (IKMG-0300-243)','Mülakat kontrol listesi (tık kutularıyla)','Test sürüşü modülü (ilk 2 ay + son mülakat testleri)','Değerlendirme cetveli (13 faktör, 1-5 puanlama)','Referans kontrol formu','Teşekkür mektubu önizleme ve kopyalama','DISC profil rehberi']
  },
  {
    ver:'1.0.0',
    ts:'2026-03-15T10:30:00',
    changes:['İlk sürüm yayınlandı','Aday havuzu Kanban pipeline (5 aşama)','YZ araçları: CV analizi, mülakat sorusu üretme, iş ilanı oluşturma','Claude API entegrasyonu']
  },
];



// ══════════════════════════════════════════════════
// I18N
// ══════════════════════════════════════════════════
let LANG='tr';



function _ikSetLang(lang,btn){
  LANG=lang;
  if(btn){document.querySelectorAll('.lang-sel button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  applyI18n();
  updateTsk();
  renderNavItems();
  renderLoginVersion();
}
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k=el.getAttribute('data-i18n');
    const v=T(k);
    if(typeof v==='string') el.textContent=v;
  });
}

// ══════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════
// KULLANICI YÖNETİM SİSTEMİ
// ══════════════════════════════════════════════════

// Tüm izin tanımları
var ALL_PERMISSIONS = [
  {key:'pipeline',    label:'Aday Havuzu'},
  {key:'telefon',     label:'Telefon Ön Eleme'},
  {key:'mulakat',     label:'Mülakat Formu'},
  {key:'kayitlar',    label:'Mülakat Kayıtları'},
  {key:'test',        label:'Test Sürüşü'},
  {key:'evaluation',  label:'Değerlendirme'},
  {key:'referans',    label:'Referans Kontrol'},
  {key:'tesekkur',    label:'Teşekkür Mektubu'},
  {key:'ai',          label:'YZ Araçları'},
  {key:'ozet',        label:'Aday Karşılaştırma'},
  {key:'kaynaklar',   label:'IK Kaynakları'},
  {key:'versions',    label:'Sürüm Geçmişi'},
  {key:'suggest',     label:'Güncelleme Öner'},
  {key:'admin',       label:'Kullanıcı Yönetimi'},
];


let currentUser = null;

// ── localStorage yardımcıları (her kullanıcı izole) ──




// ── Kullanıcı listesi yönetimi ── (satır 1824'teki delegasyon kullanılır)



function _ikLogoutFn(){ window.App?.logout?.(); }

// ── Yetki kontrolü ──


// ══════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════
let darkMode=false;
function _ikToggleTheme(){ window.App?.toggleTheme?.(); }

// ══════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════
function updateClock(){
  const now=new Date();
  const s=now.toLocaleDateString('tr-TR')+' '+now.toLocaleTimeString('tr-TR');
  const el=document.getElementById('live-clock');
  if(el) el.textContent=s;
}
setInterval(updateClock,1000);updateClock();

function renderLoginVersion(){
  const el = document.getElementById('login-version-info');
  if (!el) return; // Platform içinde login ekranı yok
  const v = APP_VERSIONS?.[0];
  if (v) el.innerHTML = `<strong>v${v.ver}</strong> · ${v.ts}`;
}


// ══════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════
function renderNavItems(){
  const navDefs=[
    {page:'pipeline',   i18n:'pipeline',          icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'},
    {page:'telefon',    i18n:'phone_screen',       icon:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'},
    {page:'mulakat',    i18n:'interview_form_nav', icon:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'},
    {page:'kayitlar',   i18n:'records',            icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',badge:'kayit-badge-sb'},
    {page:'test',       i18n:'test_drive_nav',     icon:'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'},
    {page:'evaluation', i18n:'evaluation',         icon:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'},
    {page:'referans',   i18n:'reference',          icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'},
    {page:'tesekkur',   i18n:'thanks',             icon:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'},
    {page:'ai',         i18n:'ai_tools',           icon:'<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>',badge:'yz-badge',badgeTxt:'YZ'},
    {page:'ozet',       i18n:'comparison',         icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'},
    {page:'kaynaklar',  i18n:'resources',          icon:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'},
    {page:'versions',   i18n:'version_history',    icon:'<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/>'},
    {page:'suggest',    i18n:'suggest',            icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'},
    {page:'admin',      i18n:'admin_panel',        icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/><line x1="19" y1="8" x2="19" y2="14"/>',adminOnly:true},
  ];
  const nav = document.getElementById('nav-items');
  nav.innerHTML = navDefs
    .filter(item => {
      if(item.adminOnly) return currentUser?.role==='admin';
      return hasPerm(item.page);
    })
    .map(item=>`
      <button class="nb" data-page="${item.page}" onclick="go('${item.page}',this,'')">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${item.icon}</svg>
        <span>${T(item.i18n)||item.i18n}</span>
        ${item.badge?`<span class="nb-badge" id="${item.badge}">${item.badgeTxt||'0'}</span>`:''}
      </button>`).join('');
  updateBadge();
}

let sbCol=false;
function toggleSB(){sbCol=!sbCol;document.getElementById('sidebar').classList.toggle('collapsed',sbCol);}

function go(id,btn,title){
  // Yetki kontrolü
  if(id!=='admin' && !hasPerm(id) && id!=='pipeline'){
    // yetkisiz sayfaya yönlendirmeyi engelle
    return;
  }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('panel-'+id);
  if(panel) panel.classList.add('active');
  if(btn) btn.classList.add('active');
  else{const found=document.querySelector(`.nb[data-page="${id}"]`);if(found) found.classList.add('active');}
  document.getElementById('page-title').textContent = title || T(id) || '';
  if(id==='evaluation')  renderEval();
  if(id==='kayitlar')    renderKayitlar();
  if(id==='telefon')     renderTelefon();
  if(id==='versions')    renderVersions();
  if(id==='suggest')     _ikRenderSuggestions();
  if(id==='admin')       renderAdminPanel();
}
function _ikSt(pre,id,btn){
  document.querySelectorAll(`[id^="${pre}-"].tpanel`).forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(pre+'-'+id);if(el) el.classList.add('active');
  const parentPanel=el?.closest('.panel');
  if(parentPanel) parentPanel.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

// ══════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════
var STAGES=[
  {id:'phone-screening',i18n:'phone_screen'},
  {id:'interview',i18n:'interview_form_nav'},
  {id:'test-drive',i18n:'test_drive_nav'},
  {id:'evaluation',i18n:'evaluation'},
  {id:'onboarding',i18n:'thanks'},
];
// Adaylar — localStorage persistansı
const CAND_KEY = 'ak_ik_candidates';
function _loadCandidates() {
  try { const d = JSON.parse(localStorage.getItem(CAND_KEY)||'null'); if(Array.isArray(d)) return d; } catch(e) { console.warn('[ik_hub] hata:', e); }
  return [
    {id:1,name:'Ahmet Yilmaz',position:'Satinalma Asistani',stage:'test-drive',score:4.2,notes:'Web sitesini incelemis, istekli.',disc:'D',loc:'Eyupsultan',phone:'',email:'',status:'mulakat',createdAt:'2026-03-20'},
    {id:2,name:'Ayse Kaya',position:'IK Yoneticisi',stage:'interview',score:3.8,notes:'Sertifikalari tam.',disc:'S',loc:'Besiktas',phone:'',email:'',status:'yeni',createdAt:'2026-03-22'},
  ];
}
function _storeCandidates(d) { localStorage.setItem(CAND_KEY, JSON.stringify(d)); }
let candidates = _loadCandidates();
let selCand=null;
var FACTORS=['Dış görünüş','Dikkat','Deneyim (miktar)','Deneyim (kalite)','Merak','Hırs','Kararlılık','Yenilikçilik','Kendini yönetme','Analitik yetenek','Karar alma','Öğrenci Zihniyeti','Referanslar'];
let evalSc = (function(){ try { var s = JSON.parse(localStorage.getItem('ak_ik_eval_scores')); if(s && typeof s === 'object') return s; } catch(e){ console.warn('[ik_hub] hata:', e); } return Object.fromEntries(FACTORS.map(f=>[f,3])); })();
// DEFAULT_SORULAR — SORU_BANKASI yüklendikten sonra buildBankFlat() ile zenginleştirilir
// Başlangıç değeri: basit string listesi (SORU_BANKASI henüz tanımlanmadı)
var DEFAULT_SORU_METINLERI = [
  'Web sitemizi incelediniz mi? En çok neler dikkatinizi çekti?',
  'Bu pozisyonu kariyer olarak mı görüyorsunuz, yoksa geçici mi?',
  'Daha önce çalıştığınız işlerde en iyi ve en kötü performansı hangi koşullarda sergilediniz?',
  'Bir hedefe ulaşamadığınızda ne yaparsınız? Somut bir örnek verir misiniz?',
  'Hayatınızdaki en zor karar neydi? Neden o kararı aldınız?',
  'Son 12 ayda kendinizi hangi konuda geliştirdiniz? Nasıl öğrendiniz?',
  'Bir yöneticiyle aynı fikirde olmadığınız bir durumu anlatın. Ne yaptınız?',
  'Bu pozisyon için başvurmanıza neden olan şey tam olarak neydi?',
  'Şimdiye kadar yaptığınız en iyi pazarlık veya indirim aldığınız anı anlatır mısınız?',
  'Bir sonraki 3 yılda kendinizi nerede görüyorsunuz?',
];
// iqItems SORU_BANKASI yüklendikten sonra initDefaultIQ() ile doldurulacak
let iqItems = DEFAULT_SORU_METINLERI.map((s,i) => ({id:'iq_def_'+i, soru:s, yanit:'', amac:'', ideal:'', kirmizi:''}));

// ══════════════════════════════════════════════════
// SORU BANKASI — Zenginleştirilmiş (soru + amaç + ideal yanıt + kırmızı bayrak)
// ══════════════════════════════════════════════════
var SORU_BANKASI = [
  {
    cat:'Telefon Ön Eleme', color:'#7c3aed',
    sorular:[
      {soru:'Web sitemizi incelediniz mi? En çok neler dikkatinizi çekti?',amac:'Araştırmacılık, proaktiflik ve şirkete gerçek ilgiyi ölçer.',ideal:'Siteyi gezmiş, bir ürün/hizmet/değer önerisini somutlaştırabilmiş. "Özellikle X bölümünüzdeki Y dikkatimi çekti çünkü…" — içerik spesifik olmalı.',kirmizi:'Siteyi açmamış ya da "genel olarak güzel görünüyor" gibi yüzeysel yanıt.'},
      {soru:'Bu pozisyonu kariyer olarak mı görüyorsunuz, yoksa geçici mi?',amac:'Bağlılık niyetini ve uzun vadeli motivasyonu anlamak.',ideal:'"Bu alanda uzmanlaşmak istiyorum çünkü…" şeklinde gerekçeli ve pozisyonla bağlantılı.',kirmizi:'Tereddütlü, "şimdilik bakarım" tarzı veya maaş odaklı cevap.'},
      {soru:'Satınalma/IK alanında aldığınız eğitim veya sertifikalar var mı?',amac:'Alana yatırım yapıp yapmadığını ve öğrenme disiplinini ölçer.',ideal:'Spesifik sertifika adları ya da aldığı eğitimler. Yoksa neden almadığını ve planını açıklayabilmeli.',kirmizi:'Hiç eğitim almamış ve önemsiz görmüş.'},
      {soru:'Şimdiye kadar yaptığınız en iyi pazarlık veya indirim aldığınız anı anlatır mısınız?',amac:'İkna kabiliyeti, müzakere becerisi ve somut başarı geçmişini test eder.',ideal:'Rakamlar içeren, bağlamı net, süreci adım adım anlatan bir örnek. STAR formatında: "Durumda X vardı, %Y indirim aldım çünkü Z adımlarını izledim."',kirmizi:'Soyuk, belirsiz ya da örnek verememe. "İyi pazarlık yaparım" ama kanıt yok.'},
      {soru:'DISC analizinizi yaptırdınız mı? Profilinizden haberdar mısınız?',amac:'Öz farkındalık ve kişisel gelişime yatırım yapıp yapmadığını anlamak.',ideal:'Profilini biliyor ve nasıl kullandığını açıklayabiliyor. "D profiliyim, hızlı karar alırım ama detayı atlayabilirim, bunu telafi etmek için şunu yapıyorum."',kirmizi:'Hiç duymamış veya "önemli bulmuyorum" tavrı.'},
    ]
  },
  {
    cat:'Karakter & Adaptasyon', color:'#0ea5e9',
    sorular:[
      {soru:'Daha önce çalıştığınız işlerde en iyi ve en kötü performansı hangi koşullarda sergilediniz?',amac:'Öz farkındalık ve dürüstlük. Kendi güçlü/zayıf yanlarını biliyor mu?',ideal:'Hem iyi hem kötü performansı somut örneklerle anlatabilmeli. "Kötü performanstan şunu öğrendim…" — ders çıkardığını göstermeli.',kirmizi:'Sadece iyi örnek verir, kötüyü gizler ya da dışsal faktörlere yükler.'},
      {soru:'Bir hedefe ulaşamadığınızda ne yaparsınız? Somut bir örnek verir misiniz?',amac:'Dayanıklılık, problem çözme ve sorumluluk alma kapasitesini ölçer.',ideal:'"Hedefe ulaşamadım çünkü X oldu. Şunu değiştirdim ve Y sonucu aldım." Analiz eder, alternatif yol arar.',kirmizi:'Başkasını suçlama, pes etme, ya da "böyle bir durum olmadı" yanıtı.'},
      {soru:'Akşamları veya hafta sonları çalışmanız gereken durumlar oldu mu? Nasıl karşıladınız?',amac:'Esneklik ve işe adanmışlık düzeyini anlamak.',ideal:'Gerektiğinde yapabildiğini ve bunu sürdürülebilir kılan kişisel dengeyi de anlattığını görmek.',kirmizi:'"Asla yapmam" ya da "her zaman yaparım" şeklinde aşırı uçlar.'},
      {soru:'Görev tanımınızın dışına çıkmanız gereken bir durumla karşılaştınız mı? Ne yaptınız?',amac:'İş zekasını ve "bu benim işim değil" zihniyetinin olup olmadığını test eder.',ideal:'Görevi üstlenmiş, öğrenmiş ve fırsata çevirmiş. "Bilmiyordum ama araştırdım, hallettim."',kirmizi:'"Görev tanımımda yoktu, yapmadım" — kesin kırmızı bayrak.'},
      {soru:'Bir işi bırakmanıza sebep olan şeyler nelerdir?',amac:'Değerleri, sınırları ve iş kültürü uyumunu anlamak.',ideal:'Dürüst ama profesyonel. "Büyüme fırsatı kalmadı" veya "değerlerimle çelişen karar alındı" gibi meşru nedenler. Eski işverenini yermez.',kirmizi:'Eski iş yerine sürekli şikayet, maaş dışında motivasyon belirtememek.'},
    ]
  },
  {
    cat:'Zihin Yapısı & Büyüme', color:'#10b981',
    sorular:[
      {soru:'İş dışında en gurur duyduğunuz başarınız nedir?',amac:'Karakteri, değerleri ve motivasyon kaynaklarını anlamak. İş dışında da hedef koyuyor mu?',ideal:'Spesifik, anlamlı, kendine özgü bir başarı. Önemli olan "bu beni zorladı ama bitirdim" mesajı.',kirmizi:'"Aklıma gelmiyor" veya çok yüzeysel bir yanıt.'},
      {soru:'Hayatınızdaki en zor karar neydi? Neden o kararı aldınız?',amac:'Karar alma sürecini, değerleri ve baskı altında nasıl düşündüğünü anlamak.',ideal:'"X mi Y mi" ikilemini yaşadım, şu kriterleri kullandım, şu kararı aldım, şu sonucu gördüm. Süreç ve gerekçe önemli.',kirmizi:'Küçük bir karar anlatmak ya da hiç zorlanmamış gibi göstermek.'},
      {soru:'Son 12 ayda kendinizi hangi konuda geliştirdiniz? Nasıl öğrendiniz?',amac:'Öğrenci zihniyetini ve sürekli gelişime olan bağlılığı ölçer.',ideal:'Spesifik konu, spesifik kaynak (kitap, kurs, mentor, deneyim). "X\'i öğrendim çünkü Y eksikliğimi fark ettim."',kirmizi:'Genel yanıt veya "öğrenecek bir şey kalmadı" tavrı.'},
      {soru:'Potansiyelinizi zorlayan, "bittim ama boyumu uzattı" diyebileceğiniz bir deneyim anlatır mısınız?',amac:'Dayanıklılık, büyüme zihniyeti ve zorluklara yaklaşımını anlamak.',ideal:'Gerçekten zorlandığı, neredeyse pes ettiği ama geçtiği bir an. Öğrendiği somut şeyi söyleyebilmeli.',kirmizi:'Hafif bir zorluk anlatmak ya da abartılı dramatize etmek.'},
      {soru:'Bir konuda yanıldığınızı fark ettiğinizde ne yaparsınız? Örnek verir misiniz?',amac:'Ego yönetimi, hesap verebilirlik ve öğrenme kapasitesi.',ideal:'Hızla kabul eder, özür diler, düzeltir ve öğrenir. "Yanıldım, şunu fark ettim, şöyle düzelttim."',kirmizi:'Savunmacı tutum, mazeret üretmek, hatayı başkasına yüklemek.'},
    ]
  },
  {
    cat:'İlişkiler & Liderlik', color:'#f59e0b',
    sorular:[
      {soru:'Bir yöneticiyle aynı fikirde olmadığınız bir durumu anlatın. Ne yaptınız?',amac:'Cesaret, iletişim kalitesi ve hiyerarşiyle başa çıkma becerisi.',ideal:'Görüşünü açık, saygılı ve verilerle dile getirmiş. Sonuçta kabul etmiş ya da ikna etmiş — ama kaçınmamış.',kirmizi:'Ya hiç itiraz etmemiş ("üstüme uydum") ya da agresif tartışmış.'},
      {soru:'C kalite bir çalışanla çalışmak zorunda kaldınız mı? Nasıl yönettiniz?',amac:'Liderlik olgunluğunu, empatiyi ve sonuç odaklılığı ölçer.',ideal:'Önce durumu anlamaya çalışmış, geri bildirim vermiş, gelişim için fırsat tanımış. Sonuç alamazsa eskalasyon etmiş.',kirmizi:'"Direkt kovdurmaya çalıştım" ya da "görmezden geldim."'},
      {soru:'Birini ikna etmek için çok uğraşmak zorunda kaldığınız bir durumu anlatın.',amac:'İkna kabiliyeti, ısrar kapasitesi ve iletişim stratejisi.',ideal:'Hangi argümanları kullandığını, itirazları nasıl karşıladığını somut anlatabilmeli. "Şu yaklaşım işe yaramadı, şuna geçtim…"',kirmizi:'"İkna edemedim, bıraktım" — kolayca vazgeçmek.'},
      {soru:'Takımınızda çatışma çıktığında nasıl bir rol üstlenirsiniz?',amac:'Çatışma yönetimi stilini ve takım dinamiğine katkısını anlamak.',ideal:'Arabulucu veya yapıcı taraf. "Tarafları dinledim, ortak zemin aradım, çözüme yönlendirdim."',kirmizi:'Çatışmadan kaçmak, taraf tutmak, "benim sorunum değil" tutumu.'},
    ]
  },
  {
    cat:'Motivasyon & Değerler', color:'#ec4899',
    sorular:[
      {soru:'Sabah işe gelmek için ne sizi motive eder? Enerji aldığınız şey nedir?',amac:'İç motivasyon kaynaklarını anlamak. Para dışında ne var?',ideal:'Anlam, büyüme, etki, takım, başarı — içsel motivatörler. "X yaptığımda tatmin oluyorum çünkü…" özgün ve spesifik.',kirmizi:'Sadece maaş ve güvence. Dışsal motivasyona tamamen bağlı.'},
      {soru:'İdeal çalışma ortamınız nasıl olmalı? Neyle performansınız artar?',amac:'Kültür uyumunu test eder. Şirkete uygun mu?',ideal:'Kendi çalışma tarzını biliyor. "Özerklik + net hedefler + öğrenme kültürü" gibi spesifik.',kirmizi:'"Her ortamda çalışırım" — öz farkındalık eksikliği işareti.'},
      {soru:'Bu pozisyon için başvurmanıza neden olan şey tam olarak neydi?',amac:'Araştırmış mı? Gerçekten bu şirketi mi istiyor yoksa rastgele başvuru mu?',ideal:'Şirkete özel neden. "İlanınızda X gördüm, sizin Y değeriniz benim Z hedefimle örtüşüyor."',kirmizi:'Genel cevap: "İyi şirket gibi göründü." Araştırma yapmamış.'},
      {soru:'Bir sonraki 3 yılda kendinizi nerede görüyorsunuz?',amac:'Uzun vadeli planını ve bağlılık potansiyelini anlamak.',ideal:'Gerçekçi, bu pozisyonla bağlantılı büyüme planı. "Bu rolde ustalaşıp X\'e doğru gelişmek istiyorum."',kirmizi:'"Bilmiyorum" veya tamamen farklı bir kariyer hedefi.'},
    ]
  },
  {
    cat:'Durum & Problem Çözme', color:'#8b1a4a',
    sorular:[
      {soru:'Çok az bilgiyle hızlı karar almanız gereken bir durumu anlatın.',amac:'Baskı altında karar alma kapasitesi ve risk toleransı.',ideal:'"Elimde sadece X vardı, Y kararını aldım çünkü Z." Hangi bilgiyle, hangi riski göze alarak karar aldığını somut anlatabiliyor.',kirmizi:'Karar vermekten kaçınmış ya da tüm bilgiyi beklemek için ertelemiş.'},
      {soru:'Bir müşteri veya tedarikçi çok zor davrandığında nasıl tepki verirsiniz?',amac:'Soğukkanlılık, profesyonellik ve zor insanlarla başa çıkma kapasitesi.',ideal:'Empati kurmuş, durumu anlamaya çalışmış, çözüm odaklı ilerlemiş. Kişisel almamış.',kirmizi:'Karşılıklı sertleşmek, şikayet etmek ya da tamamen çekilmek.'},
      {soru:'Aynı anda birden fazla acil görevi olduğunda nasıl önceliklendirirsiniz?',amac:'Zaman yönetimi, organizasyon ve stres altında performans.',ideal:'Net bir önceliklendirme çerçevesi (etki × aciliyet), paydaşlarla iletişim, şeffaf yönetim.',kirmizi:'"Her şeyi yaparım" — gerçekçi değil. Ya da tamamen çaresiz kalma.'},
      {soru:'Daha önce hiç yapmadığınız bir görevi son derece kısa sürede teslim etmeniz istenseydi ne yapardınız?',amac:'Öğrenme hızı, kaynak kullanımı ve teslim etme kararlılığı.',ideal:'Hızlıca araştırır, uzman bulur, sorar, minimum viable ürünü çıkarır. "Önce şunu yapardım, şu kaynağa bakardım."',kirmizi:'"Yapamam" demek veya aşırı yavaş planlama.'},
    ]
  },
  {
    cat:'IK & Satınalma Özel', color:'#6366f1',
    sorular:[
      {soru:'Bir tedarikçiyle fiyat müzakeresinde nasıl hazırlık yaparsınız?',amac:'Müzakere metodolojisi ve profesyonel hazırlık sürecini anlamak.',ideal:'Piyasa araştırması yapmış, alternatif tedarikçi belirlemiş, BATNA hazırlamış, hedef fiyat koymuş. Sistematik yaklaşım.',kirmizi:'Hazırlıksız gitme ya da sadece "sert oldum" demek.'},
      {soru:'Bir aday için teknik yetkinlik mi, kültürel uyum mu daha önemli? Neden?',amac:'IK felsefesini ve insan değerlendirme olgunluğunu anlamak.',ideal:'"İkisi birlikte önemli ama dengesi role göre değişir" — nüanslı düşünce. Neden öyle düşündüğünü örnekle desteklemeli.',kirmizi:'Sert ikili "ya biri ya diğeri" yanıtı, gerekçesiz.'},
      {soru:'Bir çalışanın performansının düştüğünü fark ettiğinizde ilk adımınız ne olur?',amac:'Empati, süreç bilgisi ve insan yönetimi yaklaşımını ölçer.',ideal:'Önce birebir görüşme, durumu anlamak (kişisel mi, iş mi?), geri bildirim, destek planı. Hemen disiplin değil.',kirmizi:'Direkt disiplin ya da "HR\'a bildiririm ve gönderirler" tutumu.'},
      {soru:'Sizi en çok zorlayan bir işe alım sürecini anlatın. Ne öğrendiniz?',amac:'Gerçek saha deneyimini ve öğrenme kapasitesini test eder.',ideal:'Spesifik bir süreç, yaşanan güçlük, alınan ders. "Bu süreçten şunu öğrendim ve artık şöyle yapıyorum."',kirmizi:'Zorluk yaşamamış gibi göstermek ya da öğrenme yok.'},
    ]
  },
];

// initDefaultIQ — SORU_BANKASI'ndan amaç/ideal/kırmızı eşleştirerek iqItems doldur
function initDefaultIQ(){
  buildBankFlat();
  iqItems = DEFAULT_SORU_METINLERI.map((sMetin,i) => {
    const found = _bankFlat.find(x => x.soru === sMetin);
    return {
      id: 'iq_def_'+i,
      soru: sMetin,
      yanit: '',
      amac: found ? found.amac : '',
      ideal: found ? found.ideal : '',
      kirmizi: found ? found.kirmizi : '',
    };
  });
}

var KONTROL_ITEMS=['Mülakat takımını seçin (diğer personel üyeleri katılacaksa).','Görüşme için sessiz bir ortam hazırlayın.','Adayın özgeçmişini, telefon görüşmesi notlarını ve DISC profil sonuçlarını inceleyin.','Aday için firmanız ve pozisyonla ilgili bir bilgi paketi hazırlayın.','Adayı selamlayın ve tesisinizde kısa gezintiye çıkarın. İçecek bir şeyler teklif edin.','Görüşmenin amacını açıklayın.','Pozisyonla ilgili açık bir genel bakış sunun.','Adayın özgeçmişi ve çalışma hayatıyla ilgili soruları sorun.','Deneyimler, eğitim ve becerilerle ilgili hazırladığınız soruları sorun.','Mülakatı bitirin. Sürecin bundan sonraki kısmını açıklayın.','Adaya başka bir sorusu olup olmadığını sorun ve teşekkür ettikten sonra kapıya kadar eşlik edin.'];

// ══════════════════════════════════════════════════
// PIPELINE
// ══════════════════════════════════════════════════
function renderPipe(){
  const board=document.getElementById('pipe-board');
  if(!board) return;
  board.innerHTML='';
  STAGES.forEach(stage=>{
    const cards=candidates.filter(c=>c.stage===stage.id);
    const col=document.createElement('div');col.className='stage-col';
    col.innerHTML=`<div class="stage-hdr"><span class="stage-lbl">${T(stage.i18n)}</span><span class="stage-cnt">${cards.length}</span></div>
    <div class="stage-body">${cards.map(c=>`<div class="pcard" onclick="openModal(${c.id})">
      <div class="pcard-pos">${window._esc(c.position||'')}</div><div class="pcard-name">${window._esc(c.name||'')}</div>
      <div class="pcard-meta">3 gün önce · ${c.loc}</div>
      <div class="pcard-foot"><div style="display:flex;gap:3px">
        <button onclick="event.stopPropagation();openAiAnalysis(${c.id})" style="background:none;border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:9px;padding:2px 5px;color:var(--text3)">AI</button>
        <button onclick="event.stopPropagation();toggleCompare(${c.id})" style="background:none;border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:9px;padding:2px 5px;color:var(--text3)">VS</button>
        <button onclick="event.stopPropagation();startFocusInterview(${c.id})" style="background:none;border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:9px;padding:2px 5px;color:var(--text3)">📝</button>
      </div>${(function(){var s=_calcCandScore(c);return s.total>0?'<div style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:'+s.color+'14;color:'+s.color+'">'+s.total+'/100</div>':'';})()}</div></div>`).join('')}
    <button class="add-btn" onclick="addCand('${stage.id}')">+ ${_ikT('add_candidate')}</button></div>`;
    board.appendChild(col);
  });
}
function addCand(sid){
  const old = document.getElementById('mo-cand-form'); if(old) old.remove();
  const mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-cand-form'; mo.style.zIndex='2200';
  mo.innerHTML = '<div class="moc" style="max-width:500px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)"><div style="font-size:15px;font-weight:700;color:var(--t)">Yeni Aday Ekle</div></div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px;max-height:65vh;overflow-y:auto">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="fg"><div class="fl">AD SOYAD *</div><input class="fi" id="cf-name" placeholder="Ad Soyad"></div>'
        + '<div class="fg"><div class="fl">POZISYON *</div><input class="fi" id="cf-pos" placeholder="Satin Alma Asistani"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="fg"><div class="fl">TELEFON</div><input class="fi" id="cf-phone" placeholder="0555 123 4567"></div>'
        + '<div class="fg"><div class="fl">E-POSTA</div><input class="fi" id="cf-email" type="email" placeholder="ali@email.com"></div>'
      + '</div>'
      + '<div class="fg"><div class="fl">CV YUKLE (PDF)</div><input type="file" id="cf-cv" accept=".pdf,.doc,.docx" style="font-size:12px"></div>'
      + '<div class="fg"><div class="fl">ON GORUSME NOTU</div><textarea class="fi" id="cf-notes" rows="3" style="resize:vertical" placeholder="Ilk izlenim, motivasyon, beklentiler..."></textarea></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div class="fg"><div class="fl">RANDEVU TARIH+SAAT</div><input type="datetime-local" class="fi" id="cf-date"></div>'
        + '<div class="fg"><div class="fl">GORUSME TIPI</div><select class="fi" id="cf-type"><option value="yuzyuze">Yuz yuze</option><option value="online">Online</option></select></div>'
      + '</div>'
      + '<div class="fg"><div class="fl">TOPLANTI LINKI (online ise)</div><input class="fi" id="cf-link" placeholder="https://meet.google.com/..."></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-cand-form\').remove()">Iptal</button>'
      + '<button class="btn btnp" onclick="window._saveCandForm(\'' + (sid||'phone-screening') + '\')">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if(e.target===mo) mo.remove(); });
  setTimeout(() => mo.classList.add('open'), 10);
}
window._saveCandForm = function(stageId) {
  var name = (document.getElementById('cf-name')?.value||'').trim();
  var pos = (document.getElementById('cf-pos')?.value||'').trim();
  if (!name) { window.toast?.('Ad Soyad zorunlu', 'err'); return; }
  if (!pos) { window.toast?.('Pozisyon zorunlu', 'err'); return; }

  var entry = {
    id: generateNumericId(), name: name, position: pos, stage: stageId,
    phone: (document.getElementById('cf-phone')?.value||'').trim(),
    email: (document.getElementById('cf-email')?.value||'').trim(),
    notes: (document.getElementById('cf-notes')?.value||'').trim(),
    meetDate: document.getElementById('cf-date')?.value || '',
    meetType: document.getElementById('cf-type')?.value || 'yuzyuze',
    meetLink: (document.getElementById('cf-link')?.value||'').trim(),
    score: 0, disc: 'N/A', loc: '',
    status: 'yeni', createdAt: new Date().toISOString().slice(0,10),
    createdBy: window.CU?.()?.id,
    approvalStatus: null,
    timeline: [{ ts: window.nowTs?.() || new Date().toISOString(), action: 'Basvuru olusturuldu', by: window.CU?.()?.name || 'Sistem' }],
  };

  // CV upload
  var fileEl = document.getElementById('cf-cv');
  if (fileEl?.files?.[0]) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      entry.cv = { name: fileEl.files[0].name, data: ev.target.result };
      _finishSaveCand(entry);
    };
    reader.readAsDataURL(fileEl.files[0]);
  } else {
    _finishSaveCand(entry);
  }
};

function _finishSaveCand(entry) {
  candidates.push(entry);
  _storeCandidates(candidates);
  document.getElementById('mo-cand-form')?.remove();
  renderPipe();
  window.toast?.('Aday eklendi: ' + entry.name, 'ok');
  window.logActivity?.('ik', 'Yeni aday: ' + entry.name + ' (' + entry.position + ')');
}

// Adayı yöneticiye gönder (onay akışı)
function sendCandForApproval(candId) {
  var c = candidates.find(function(x){ return x.id === candId; }); if(!c) return;
  c.approvalStatus = 'pending';
  c.timeline = c.timeline || [];
  c.timeline.push({ ts: window.nowTs?.() || new Date().toISOString(), action: 'Yoneticiye gonderildi', by: window.CU?.()?.name || '' });
  _storeCandidates(candidates);

  // Admin/manager'lara bildirim
  var users = typeof window.loadUsers === 'function' ? window.loadUsers() : [];
  users.filter(function(u){ return (u.role==='admin'||u.role==='manager') && u.status==='active'; }).forEach(function(m){
    window.addNotif?.('👤', 'Yeni aday onay bekliyor: ' + c.name + ' — ' + c.position, 'warn', 'ik', m.id);
  });
  window.toast?.('Aday yoneticiye gonderildi', 'ok');
  renderPipe();
}

// Aday onayla + takvime ekle
function approveCand(candId) {
  if (!_isAdminIk()) { window.toast?.('Yetki gerekli', 'err'); return; }
  var c = candidates.find(function(x){ return x.id === candId; }); if(!c) return;
  c.approvalStatus = 'approved';
  c.status = 'mulakat';
  c.timeline = c.timeline || [];
  c.timeline.push({ ts: window.nowTs?.() || new Date().toISOString(), action: 'Yonetici onayladi', by: window.CU?.()?.name || '' });
  _storeCandidates(candidates);

  // Takvime otomatik ekle
  if (c.meetDate && typeof window.saveCal === 'function') {
    var cal = typeof window.loadCal === 'function' ? window.loadCal() : [];
    cal.push({
      id: generateNumericId(), own: 0, title: 'Mulakat: ' + c.name + ' — ' + c.position,
      date: c.meetDate.slice(0,10), time: c.meetDate.slice(11,16) || '10:00',
      type: 'meeting', status: 'approved', desc: 'Aday mulakati. ' + (c.meetType==='online'?'Online: '+c.meetLink:'Yuz yuze'),
    });
    window.saveCal(cal);
    window.toast?.('Mulakat takvime eklendi', 'ok');
  }
  window.toast?.('Aday onaylandi: ' + c.name, 'ok');
  renderPipe();
}
window.sendCandForApproval = sendCandForApproval;
window.approveCand = approveCand;
function moveC(id,dir){
  const ids=STAGES.map(s=>s.id);const c=candidates.find(c=>c.id===id);if(!c) return;
  const idx=ids.indexOf(c.stage);const next=idx+(dir==='next'?1:-1);
  if(next>=0&&next<ids.length) {
    c.stage=ids[next];
    c.timeline = c.timeline || [];
    c.timeline.push({ ts: window.nowTs?.() || new Date().toISOString(), action: 'Asama degisti: ' + ids[next], by: window.CU?.()?.name || '' });
    _storeCandidates(candidates);
  }
  renderPipe();document.getElementById('mo').classList.remove('open');
}

// ══════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════
function openModal(id){
  const c=candidates.find(c=>c.id===id);if(!c) return;
  selCand=c;
  document.getElementById('m-av').textContent=c.name.split(' ').map(n=>n[0]).join('').slice(0,2);
  document.getElementById('m-name').textContent=c.name;
  document.getElementById('m-pos').textContent=c.position;
  const ids=STAGES.map(s=>s.id);const ci=ids.indexOf(c.stage);
  document.getElementById('m-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
      <div style="background:var(--bg3);padding:8px 10px;border-radius:8px;border:1px solid var(--border)"><div style="font-size:8px;font-weight:700;color:var(--text3);letter-spacing:.1em;margin-bottom:2px">KONUM</div><div style="font-size:11px;font-weight:600;color:var(--text)">${c.loc}</div></div>
      <div style="background:var(--bg3);padding:8px 10px;border-radius:8px;border:1px solid var(--border)"><div style="font-size:8px;font-weight:700;color:var(--text3);letter-spacing:.1em;margin-bottom:2px">DISC</div><div style="font-size:11px;font-weight:600;color:var(--text)">${c.disc}</div></div>
    </div>
    <div><div style="font-weight:700;font-size:11px;color:var(--text);margin-bottom:5px">📞 Telefon Notları</div><div style="background:var(--bg3);border-radius:8px;padding:8px 11px;font-size:11px;color:var(--text2);line-height:1.7;font-style:italic;border:1px solid var(--border)">"${c.notes||'—'}"</div></div>
    <div><div style="font-weight:700;font-size:11px;color:var(--text);margin-bottom:5px">🔄 Süreç</div><div>${STAGES.map((s,i)=>`<div style="display:flex;align-items:center;gap:7px;padding:5px 7px;border-radius:6px;border:1px solid ${s.id===c.stage?'var(--accent)':'transparent'};background:${s.id===c.stage?'var(--bg3)':'transparent'};margin-bottom:3px">
      <div style="width:18px;height:18px;border-radius:50%;background:${i<ci?'#10b981':s.id===c.stage?'var(--accent)':'var(--bg3)'};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:${i<ci||s.id===c.stage?'#fff':'var(--text3)'}">${i<ci?'✓':i+1}</div>
      <span style="font-size:11px;font-weight:${s.id===c.stage?'600':'400'};color:${s.id===c.stage?'var(--accent)':'var(--text2)'}">${T(s.i18n)}</span></div>`).join('')}</div></div>`;
  // Timeline + Onay butonları
  var tlHtml = '';
  if (c.timeline && c.timeline.length) {
    tlHtml = '<div style="margin-top:8px"><div style="font-weight:700;font-size:11px;color:var(--text);margin-bottom:5px">Surec Timeline</div>';
    c.timeline.forEach(function(t,i){
      tlHtml += '<div style="display:flex;gap:8px;padding:4px 0;'+(i<c.timeline.length-1?'border-left:2px solid var(--border);margin-left:5px;padding-left:12px':'margin-left:5px;padding-left:12px')+'">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:3px;margin-left:-16px"></div>'
        + '<div><div style="font-size:10px;color:var(--text)">' + (t.action||'') + '</div>'
        + '<div style="font-size:9px;color:var(--text3)">' + (t.ts||'').slice(0,16) + ' — ' + (t.by||'') + '</div></div></div>';
    });
    tlHtml += '</div>';
  }

  document.getElementById('m-foot').innerHTML=`
    ${c.approvalStatus!=='approved'?'<button style="flex:1;padding:8px;background:#F59E0B;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer" onclick="sendCandForApproval('+c.id+')">Yoneticiye Gonder</button>':''}
    ${_isAdminIk()&&c.approvalStatus==='pending'?'<button style="flex:1;padding:8px;background:#10B981;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer" onclick="approveCand('+c.id+')">Onayla + Takvime Ekle</button>':''}
    ${ci<STAGES.length-1?'<button style="flex:1;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer" onclick="moveC('+c.id+',\'next\')">Sonraki Asama</button>':''}
    <button style="padding:8px;background:#EF4444;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer" onclick="openRejectionLetter('+c.id+')">Reddet</button>
    <button style="padding:8px 12px;background:transparent;color:#9a7ab0;border:1px solid var(--sidebar2);border-radius:8px;font-weight:700;font-size:11px;cursor:pointer" onclick="document.getElementById('mo').classList.remove('open')">Kapat</button>`;

  // Timeline'ı body'ye ekle
  document.getElementById('m-body').innerHTML += tlHtml;
  document.getElementById('mo').classList.add('open');
}
function closeMO(e){if(e.target===document.getElementById('mo')) document.getElementById('mo').classList.remove('open');}

// ══════════════════════════════════════════════════
// TELEFON
// ══════════════════════════════════════════════════
function renderTelefon(){
  document.getElementById('telefon-content').innerHTML=`
  <div class="tip">💡 %10 siz konuşun, %90 adayı konuşturun. Aday kaçamak yanıt veriyorsa görüşmeye çağırmayın.</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px">
    <div class="ik-card">
      <div style="font-weight:700;font-size:12px;color:var(--accent);margin-bottom:9px">📋 Sorulacak Sorular</div>
      ${[{n:1,q:'Web sitemizi incelediniz mi? En çok neler dikkatinizi çekti?'},{n:2,q:'Bu pozisyonu kariyer olarak görüyor musunuz?',sub:['Satınalma sertifikanız var mı?','İlham aldığınız biri var mı?','Bu pozisyon hangi yönlerinizle örtüşüyor?']},{n:3,q:'İlanı okudunuz — başvurunuza en çok ne sebep oldu?'},{n:4,q:'DISC analiz raporunuzu iletebilir misiniz?'},{n:5,q:'En başarılı indirim aldığınız pazarlığı anlatır mısınız?'}].map(i=>`<div style="margin-bottom:7px"><div style="display:flex;gap:7px;font-size:11px;color:var(--text)"><span style="width:16px;height:16px;border-radius:5px;background:var(--bg3);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${i.n}</span><span>${i.q}</span></div>${(i.sub||[]).map(s=>`<div style="font-size:10px;color:var(--text3);padding-left:23px;margin-top:2px">↳ ${s}</div>`).join('')}</div>`).join('')}
    </div>
    <div class="ik-card">
      <div style="font-weight:700;font-size:12px;color:var(--accent);margin-bottom:9px">💬 Gelen Sorulara Yanıtlar</div>
      ${[{s:'İş ne?',c:'Satınalma asistanlığı.'},{s:'Online görüşebilir miyiz?',c:'Evet — ilk görüşme online, olumlu geçerse ikincisi yüz yüze.'},{s:'Maaş nedir?',c:'Görüşmede konuşuluyor.'},{s:'Diğer sorular',c:'Görüşmede sormanız durumunda iletilecek.'}].map(r=>`<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:var(--text)">${r.s}</div><div style="font-size:11px;color:#10b981;padding-left:8px;margin-top:2px">→ ${r.c}</div></div>`).join('')}
    </div>
  </div>
  <div class="ik-card">
    <div style="font-weight:700;font-size:12px;color:var(--accent);margin-bottom:8px">📍 Ulaşım Kontrolü</div>
    <div style="font-size:11px;color:var(--text);line-height:1.9">
      <div>✅ Ofise maksimum <strong>5–6 km</strong> uzaklıkta olmalı.</div>
      <div>✅ Metro ile <strong>aktarmasız</strong> gelebiliyorsa 10 km de kabul edilebilir.</div>
      <div style="font-size:10px;color:var(--text3);font-style:italic;margin-top:6px">Bir gün konaklayacağın otele özenmezsin, ama içinde yaşayacağın evi seçerken çok daha dikkatli olursun.</div>
    </div>
  </div>
  <div class="ik-card" style="margin-top:10px">
    <div style="font-weight:700;font-size:12px;color:var(--accent);margin-bottom:8px">Gorusme Notlari</div>
    <textarea id="ik-on-gorusme-not" style="width:100%;min-height:80px;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;color:var(--text);background:var(--bg2);resize:vertical;font-family:inherit" placeholder="On gorusme notlarini yazin...">${(function(){try{return JSON.parse(localStorage.getItem('ak_ik_on_gorusme')||'{}').notes||'';}catch(e){return '';}}())}</textarea>
    <button onclick="localStorage.setItem('ak_ik_on_gorusme',JSON.stringify({notes:document.getElementById('ik-on-gorusme-not').value,ts:new Date().toISOString()}));window.toast?.('Kaydedildi','ok')" style="margin-top:6px;padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:11px;cursor:pointer;font-family:inherit">Kaydet</button>
  </div>`;
}

// ══════════════════════════════════════════════════
// KONTROL LİSTESİ
// ══════════════════════════════════════════════════
function renderKontrolList(){
  document.getElementById('kontrol-list').innerHTML=KONTROL_ITEMS.map(item=>`
    <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text);margin-bottom:5px;background:var(--bg2);line-height:1.5">
      <input type="checkbox" style="flex-shrink:0;accent-color:var(--accent);width:13px;height:13px;margin-top:2px">
      <span>${item}</span>
    </div>`).join('');
}

// ══════════════════════════════════════════════════
// MÜLAKAT FORMU
// ══════════════════════════════════════════════════
function renderIQList(){
  const el=document.getElementById('iq-list');
  if(iqItems.length===0){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:14px 0;text-align:center">Soru eklemek için "+ Soru Ekle" veya "Bankadan" butonunu kullanın.</div>';return;}
  el.innerHTML=iqItems.map((item,i)=>`
    <div class="iq-row" style="position:relative">
      <div class="iq-top"><div class="iq-num">${i+1}</div>
        <textarea class="iq-q" id="iq-q-${item.id}" rows="2" onchange="iqItems[${i}].soru=this.value">${item.soru}</textarea>
        <button class="iq-del" onclick="removeIQ('${item.id}')"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div>
      ${item.amac||item.ideal||item.kirmizi ? `<div style="display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap">
        ${item.amac?`<button class="iq-hint-btn" onclick="toggleHint('hint-amac-${item.id}')" style="font-size:9px;padding:2px 7px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:20px;cursor:pointer;font-weight:600">🎯 Amaç</button>`:''}
        ${item.ideal?`<button class="iq-hint-btn" onclick="toggleHint('hint-ideal-${item.id}')" style="font-size:9px;padding:2px 7px;border:1px solid #a7f3d0;background:#f0fdf4;color:#065f46;border-radius:20px;cursor:pointer;font-weight:600">✅ İdeal Yanıt</button>`:''}
        ${item.kirmizi?`<button class="iq-hint-btn" onclick="toggleHint('hint-kirmizi-${item.id}')" style="font-size:9px;padding:2px 7px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:20px;cursor:pointer;font-weight:600">🚩 Kırmızı Bayrak</button>`:''}
      </div>
      <div id="hint-amac-${item.id}" style="display:none;font-size:10px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:6px 10px;margin-bottom:5px;line-height:1.6">${item.amac||''}</div>
      <div id="hint-ideal-${item.id}" style="display:none;font-size:10px;color:#065f46;background:#f0fdf4;border-radius:6px;padding:6px 10px;margin-bottom:5px;line-height:1.6">${item.ideal||''}</div>
      <div id="hint-kirmizi-${item.id}" style="display:none;font-size:10px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:5px;line-height:1.6">${item.kirmizi||''}</div>`:''}
      <div class="iq-ans-lbl">✍️ Adayın Yanıtı</div>
      <textarea class="iq-ans" id="iq-a-${item.id}" rows="3" placeholder="Adayın verdiği yanıtı buraya not alın…" onchange="iqItems[${i}].yanit=this.value">${item.yanit||''}</textarea>
    </div>`).join('');
}
function toggleHint(id){ const el=document.getElementById(id); if(el) el.style.display=el.style.display==='none'?'block':'none'; }

function addIQ(soruText){
  const id='iq_'+generateNumericId();
  iqItems.push({id,soru:soruText||'',yanit:''});
  renderIQList();
  if(!soruText){setTimeout(()=>{const el=document.getElementById('iq-q-'+id);if(el){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}},60);}
}
function removeIQ(id){iqItems=iqItems.filter(i=>i.id!==id);renderIQList();}
function syncIQ(){iqItems.forEach(item=>{const q=document.getElementById('iq-q-'+item.id);const a=document.getElementById('iq-a-'+item.id);if(q) item.soru=q.value;if(a) item.yanit=a.value;});}

// Bank sorularını data-idx ile eşle, tırnak sorununu önle
// Bank flat array — soru nesneleri (obje formatı)
let _bankFlat = [];
function buildBankFlat(){
  _bankFlat = [];
  SORU_BANKASI.forEach(cat => cat.sorular.forEach(s => {
    _bankFlat.push({cat:cat.cat, color:cat.color, soru:s.soru||s, amac:s.amac||'', ideal:s.ideal||'', kirmizi:s.kirmizi||''});
  }));
}
function getSoruText(s){ return typeof s === 'string' ? s : s.soru; }

function addFromBank(){
  buildBankFlat();
  document.getElementById('bank-mo-list').innerHTML = SORU_BANKASI.map(cat => {
    const rows = cat.sorular.map(s => {
      const soruTxt = getSoruText(s);
      const idx = _bankFlat.findIndex(x => x.soru === soruTxt);
      const already = iqItems.some(i => i.soru === soruTxt);
      return `<div style="margin-bottom:8px;border:1px solid ${already?'#a7f3d0':'var(--border)'};border-radius:9px;padding:10px 12px;background:${already?'#f0fdf4':'var(--bg2)'}">
        <div style="display:flex;align-items:flex-start;gap:8px;cursor:pointer" onclick="bankAddItem(${idx})">
          <div style="width:18px;height:18px;border-radius:5px;background:${already?'#10b981':'var(--bg3)'};border:1px solid ${already?'#10b981':'var(--border)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
            ${already?'<svg width="10" height="10" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>':'<svg width="10" height="10" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text);line-height:1.5;flex:1">${soruTxt}</span>
          <span style="font-size:10px;font-weight:600;color:${already?'#10b981':'var(--accent)'};flex-shrink:0;margin-top:2px">${already?'✓ Eklendi':'+ Ekle'}</span>
        </div>
        ${s.amac?`<div style="margin-top:6px;font-size:10px;color:#1d4ed8;background:#eff6ff;border-radius:5px;padding:4px 8px"><strong>🎯 Amaç:</strong> ${s.amac}</div>`:''}
        ${s.ideal?`<div style="margin-top:3px;font-size:10px;color:#065f46;background:#f0fdf4;border-radius:5px;padding:4px 8px"><strong>✅ İdeal Yanıt:</strong> ${s.ideal}</div>`:''}
        ${s.kirmizi?`<div style="margin-top:3px;font-size:10px;color:#991b1b;background:#fef2f2;border-radius:5px;padding:4px 8px"><strong>🚩 Kırmızı Bayrak:</strong> ${s.kirmizi}</div>`:''}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:16px">
      <div style="font-weight:700;font-size:11px;color:${cat.color};margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${cat.color};display:inline-block"></span>${cat.cat}
      </div>${rows}</div>`;
  }).join('');
  document.getElementById('bank-mo').style.display='flex';
}
function bankAddItem(idx){
  syncIQ();
  const item = _bankFlat[idx];
  if(!item) return;
  const exists = iqItems.findIndex(i => i.soru === item.soru);
  if(exists !== -1){ iqItems.splice(exists,1); }
  else { iqItems.push({id:'iq_'+generateNumericId(), soru:item.soru, yanit:'', amac:item.amac, ideal:item.ideal, kirmizi:item.kirmizi}); }
  renderIQList();
  addFromBank();
}
function renderSoruBankasi(){
  buildBankFlat();
  window._bankFlatStatic = _bankFlat;
  document.getElementById('soru-bankasi-list').innerHTML = SORU_BANKASI.map(cat => `
    <div class="ik-card" style="margin-bottom:12px;border-left:3px solid ${cat.color}">
      <div style="font-weight:700;font-size:13px;color:${cat.color};margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${cat.color};display:inline-block"></span>
        ${cat.cat}
        <span style="font-size:10px;font-weight:500;color:var(--text3);margin-left:auto">${cat.sorular.length} soru</span>
      </div>
      ${cat.sorular.map((s,qi) => {
        const soruTxt = getSoruText(s);
        const idx = _bankFlat.findIndex(x => x.soru === soruTxt);
        const already = iqItems.some(i => i.soru === soruTxt);
        return `<div style="border:1px solid ${already?'#a7f3d0':'var(--border)'};border-radius:10px;padding:12px;margin-bottom:8px;background:${already?'#f0fdf4':'var(--bg3)'}">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:${s.amac?'8px':'0'}">
            <span style="width:20px;height:20px;border-radius:6px;background:${cat.color}20;color:${cat.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">${qi+1}</span>
            <span style="flex:1;font-size:12px;font-weight:600;color:var(--text);line-height:1.5">${soruTxt}</span>
            <button class="btn btn-sm" style="flex-shrink:0;background:${already?'#10b981':'var(--accent)'};color:#fff;font-size:10px;padding:4px 10px" onclick="bankStaticAdd(${idx})">${already?'✓':'+'} ${already?'Eklendi':_ikT('add_to_form')}</button>
          </div>
          ${s.amac?`<div style="font-size:10px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:5px 9px;margin-bottom:4px"><span style="font-weight:700">🎯 Amaç:</span> ${s.amac}</div>`:''}
          ${s.ideal?`<div style="font-size:10px;color:#065f46;background:#f0fdf4;border-radius:6px;padding:5px 9px;margin-bottom:4px"><span style="font-weight:700">✅ İdeal Yanıt:</span> ${s.ideal}</div>`:''}
          ${s.kirmizi?`<div style="font-size:10px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:5px 9px"><span style="font-weight:700">🚩 Kırmızı Bayrak:</span> ${s.kirmizi}</div>`:''}
        </div>`;
      }).join('')}
    </div>`).join('');
}
function bankStaticAdd(idx){
  syncIQ();
  const item = (window._bankFlatStatic||[])[idx];
  if(!item) return;
  if(!iqItems.some(i => i.soru === item.soru)){
    iqItems.push({id:'iq_'+generateNumericId(), soru:item.soru, yanit:'', amac:item.amac||'', ideal:item.ideal||'', kirmizi:item.kirmizi||''});
  }
  renderIQList();
  const formTab = document.querySelectorAll('#panel-mulakat .tab')[1];
  if(formTab){ _ikSt('mul','form',formTab); }
  renderSoruBankasi();
}
async function saveInterview(){
  syncIQ();
  const aday=document.getElementById('mf-aday').value.trim();
  const poz=document.getElementById('mf-pozisyon').value.trim();
  if(!aday){document.getElementById('save-msg').innerHTML='<div class="err-box">⚠ Adayın adı zorunludur.</div>';return;}

  // Yanıtı olan sorular var mı kontrol et
  const answeredCount = iqItems.filter(i=>i.yanit&&i.yanit.trim().length>10).length;

  // Kaydet
  const kayit={id:generateNumericId(),aday,poz,
    tarih:document.getElementById('mf-tarih').value?new Date(document.getElementById('mf-tarih').value).toLocaleString('tr-TR'):'—',
    gorusen:document.getElementById('mf-gorusen').value.trim()||'—',
    not:document.getElementById('mf-not').value.trim(),
    sorular:[...iqItems.map(i=>({soru:i.soru,yanit:i.yanit,amac:i.amac||'',ideal:i.ideal||'',kirmizi:i.kirmizi||''}))],
    savedAt:new Date().toLocaleString('tr-TR'),lang:LANG};
  const mevcut = usrGet('kayitlar') || [];
  mevcut.unshift(kayit); usrSet('kayitlar', mevcut);
  updateBadge();

  const msgEl = document.getElementById('save-msg');
  msgEl.innerHTML='<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:7px 11px;font-size:11px;color:#065f46">✅ Görüşme kayıt edildi.</div>';

  // YZ DEĞERLENDİRMESİ — yanıtlı sorular yeterliyse
  if(answeredCount >= 2){
    msgEl.innerHTML='<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;font-size:11px;color:#1d4ed8">⏳ Yapay zeka yanıtları değerlendiriyor<span class="dot-load"></span></div>';
    try{
      const soruYanitBlok = iqItems
        .filter(i=>i.yanit&&i.yanit.trim())
        .map((i,n)=>`Soru ${n+1}: ${i.soru}\nAdayın Yanıtı: ${i.yanit}${i.ideal?'\nİdeal Yanıt: '+i.ideal:''}${i.kirmizi?'\nKırmızı Bayrak: '+i.kirmizi:''}`)
        .join('\n\n');

      const sys = `Sen çok deneyimli bir IK uzmanısın. Aşağıdaki mülakat yanıtlarını ideal yanıtlarla karşılaştırarak değerlendir.
JSON formatında döndür — başka hiçbir şey yazma:
{
  "genel_puan": 1-10 arası sayı,
  "genel_yorum": "2-3 cümle genel değerlendirme",
  "guclu_yanlar": ["yanıt bazlı güçlü nokta 1", "..."],
  "gelistirilmeli": ["yanıt bazlı zayıf/eksik nokta 1", "..."],
  "kirmizi_bayraklar": ["varsa kırmızı bayrak 1 - yoksa boş dizi"],
  "tavsiye": "kesinlikle davet et / görüşmeye çağır / değerlendirilebilir / dikkatli ol / uygun değil",
  "sonraki_adim": "IK için önerilen somut sonraki adım"
}`;

      const prompt = `Aday: ${aday}\nPozisyon: ${poz||'Belirtilmemiş'}\n\n${soruYanitBlok}`;
      const raw = await callClaude(prompt, sys, 1200);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());

      // Değerlendirmeyi kayda ekle
      mevcut[0].ai_degerlendirme = d;
      usrSet('kayitlar', mevcut);

      // Skora göre renk
      const puan = d.genel_puan || 5;
      const [bg,border,fg] = puan>=7 ? ['#ecfdf5','#a7f3d0','#065f46'] : puan>=5 ? ['#fffbeb','#fde68a','#92400e'] : ['#fef2f2','#fecaca','#991b1b'];
      const tavsiyeColors = {'kesinlikle davet et':'#10b981','görüşmeye çağır':'#2563eb','değerlendirilebilir':'#f59e0b','dikkatli ol':'#f97316','uygun değil':'#ef4444'};
      const tc = tavsiyeColors[d.tavsiye] || '#64748b';

      msgEl.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:700;font-size:13px;color:var(--text)">🤖 YZ Değerlendirmesi — ${aday}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px;font-weight:800;color:${fg}">${puan}<span style="font-size:13px;color:var(--text3)">/10</span></span>
            <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${tc}20;color:${tc};border:1px solid ${tc}40">${d.tavsiye}</span>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:12px;padding:10px;background:var(--bg3);border-radius:8px">${d.genel_yorum}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div style="background:#f0fdf4;border-radius:8px;padding:10px;border:1px solid #a7f3d0">
            <div style="font-size:10px;font-weight:700;color:#065f46;margin-bottom:6px">✅ Güçlü Yanlar</div>
            ${(d.guclu_yanlar||[]).map(g=>`<div style="font-size:11px;color:#334155;padding:2px 0;display:flex;gap:5px"><span style="color:#10b981">+</span>${g}</div>`).join('')}
          </div>
          <div style="background:#fffbeb;border-radius:8px;padding:10px;border:1px solid #fde68a">
            <div style="font-size:10px;font-weight:700;color:#92400e;margin-bottom:6px">⚠️ Geliştirilmeli</div>
            ${(d.gelistirilmeli||[]).map(g=>`<div style="font-size:11px;color:#334155;padding:2px 0;display:flex;gap:5px"><span style="color:#f59e0b">△</span>${g}</div>`).join('')}
          </div>
        </div>
        ${d.kirmizi_bayraklar&&d.kirmizi_bayraklar.length?`<div style="background:#fef2f2;border-radius:8px;padding:10px;border:1px solid #fecaca;margin-bottom:10px">
          <div style="font-size:10px;font-weight:700;color:#991b1b;margin-bottom:6px">🚩 Dikkat Edilecek Noktalar</div>
          ${d.kirmizi_bayraklar.map(k=>`<div style="font-size:11px;color:#7f1d1d;padding:2px 0">${k}</div>`).join('')}
        </div>`:''}
        <div style="background:#eff6ff;border-radius:8px;padding:10px;border:1px solid #bfdbfe">
          <div style="font-size:10px;font-weight:700;color:#1d4ed8;margin-bottom:4px">👉 Sonraki Adım</div>
          <div style="font-size:11px;color:#1e40af">${d.sonraki_adim}</div>
        </div>
      </div>`;
    } catch(e){
      msgEl.innerHTML='<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:7px 11px;font-size:11px;color:#065f46">✅ Görüşme kayıt edildi. (YZ değerlendirmesi alınamadı)</div>';
    }
  } else {
    setTimeout(()=>msgEl.innerHTML='',5000);
  }
}
function clearForm(){
  ['mf-aday','mf-pozisyon','mf-gorusen','mf-not'].forEach(id=>document.getElementById(id).value='');
  try { const mfT=document.getElementById('mf-tarih'); if(mfT) mfT.value=new Date().toISOString().slice(0,16); } catch(e) { console.warn('[ik_hub] hata:', e); }
  initDefaultIQ(); iqItems.forEach((item,i)=>{ item.id='iq_def_reset_'+i+'_'+generateNumericId(); });
  renderIQList();document.getElementById('save-msg').innerHTML='';
}
function updateBadge(){
  const k = usrGet('kayitlar') || [];
  const b=document.getElementById('kayit-badge-sb');if(b) b.textContent=k.length;
}
function renderKayitlar(){
  const k = usrGet('kayitlar') || [];
  const el=document.getElementById('kayit-listesi');
  if(!k.length){el.innerHTML='<div class="empty">'+_ikT('no_records')+'</div>';return;}
  el.innerHTML=k.map((r,ri)=>`
    <div class="db-row">
      <div class="db-av">${window._esc(r.aday.split(' ').map(n=>n[0]).join('').slice(0,2))}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:var(--text)">${window._esc(r.aday||'')}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${window._esc(r.poz||'—')} · ${r.tarih} · ${window._esc(r.gorusen||'')}</div>
        ${r.not?`<div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">${r.not.slice(0,120)}${r.not.length>120?'…':''}</div>`:''}
        <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
          ${r.ai_degerlendirme ? `<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:${r.ai_degerlendirme.genel_puan>=7?'#ecfdf5':r.ai_degerlendirme.genel_puan>=5?'#fffbeb':'#fef2f2'};color:${r.ai_degerlendirme.genel_puan>=7?'#065f46':r.ai_degerlendirme.genel_puan>=5?'#92400e':'#991b1b'};border:1px solid ${r.ai_degerlendirme.genel_puan>=7?'#a7f3d0':r.ai_degerlendirme.genel_puan>=5?'#fde68a':'#fecaca'}">🤖 ${r.ai_degerlendirme.genel_puan}/10 · ${r.ai_degerlendirme.tavsiye}</span>` : ''}
          ${(r.sorular||[]).slice(0,2).map(s=>`<span style="background:var(--bg3);color:var(--text3);font-size:10px;padding:2px 7px;border-radius:20px">${s.soru.slice(0,30)}…</span>`).join('')}${r.sorular?.length>2?`<span style="font-size:10px;color:var(--text3)">+${r.sorular.length-2} soru</span>`:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="ik-btn ik-btn-s ik-btn-sm" onclick="viewKayit(${ri})">${_ikT('view')}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteKayit(${ri})">${_ikT('delete')}</button>
      </div>
    </div>`).join('');
}
function viewKayit(idx){
  const k = usrGet('kayitlar') || []; const r=k[idx];if(!r) return;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Mülakat — ${r.aday}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1a1a2e}h1{color:#8b1a4a;margin-bottom:3px}h2{font-size:14px;color:#4a1a6a;margin:18px 0 7px;border-bottom:1px solid #e8dff5;padding-bottom:4px}.meta{font-size:12px;color:#6a4a7a;margin-bottom:18px}.qitem{margin-bottom:13px;border:1px solid #e8dff5;border-radius:8px;padding:11px}.qsoru{font-weight:600;font-size:13px;color:#1a0a2e;margin-bottom:5px}.qyanit{font-size:12px;color:#334155;line-height:1.6;background:#f0faf6;padding:7px;border-radius:6px}.not-box{background:#f0e8f8;border-radius:8px;padding:11px;font-size:12px;color:#4a1a6a;line-height:1.6}</style></head><body>
  <h1>${r.aday}</h1><div class="meta">${r.poz||''} · ${r.tarih} · Görüşen: ${r.gorusen} · Kaydedildi: ${r.savedAt}</div>
  ${r.not?`<h2>Görüşen Notu</h2><div class="not-box">${r.not}</div>`:''}
  <h2>Sorular & Yanıtlar (${(r.sorular||[]).length})</h2>
  ${(r.sorular||[]).map((s,i)=>`<div class="qitem">
    <div class="qsoru">${i+1}. ${s.soru}</div>
    <div class="qyanit">${s.yanit||'<em style="color:#aaa">—</em>'}</div>
    ${s.ideal?`<div style="font-size:11px;color:#065f46;background:#f0faf6;padding:5px 8px;border-radius:5px;margin-top:4px"><strong>✅ İdeal:</strong> ${s.ideal}</div>`:''}
  </div>`).join('')}
  ${r.ai_degerlendirme ? `<h2>🤖 YZ Değerlendirmesi</h2>
  <div style="border:1px solid #e8dff5;border-radius:10px;padding:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <strong style="font-size:16px">${r.ai_degerlendirme.genel_puan}/10</strong>
      <span style="padding:3px 10px;border-radius:20px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700">${r.ai_degerlendirme.tavsiye}</span>
    </div>
    <p style="font-size:12px;color:#334155;margin-bottom:10px">${r.ai_degerlendirme.genel_yorum}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:#f0fdf4;padding:9px;border-radius:7px"><strong style="font-size:11px;color:#065f46">✅ Güçlü Yanlar</strong><br>${(r.ai_degerlendirme.guclu_yanlar||[]).map(g=>`<div style="font-size:11px">+ ${g}</div>`).join('')}</div>
      <div style="background:#fffbeb;padding:9px;border-radius:7px"><strong style="font-size:11px;color:#92400e">⚠️ Geliştirilmeli</strong><br>${(r.ai_degerlendirme.gelistirilmeli||[]).map(g=>`<div style="font-size:11px">△ ${g}</div>`).join('')}</div>
    </div>
    ${r.ai_degerlendirme.kirmizi_bayraklar&&r.ai_degerlendirme.kirmizi_bayraklar.length?`<div style="background:#fef2f2;padding:9px;border-radius:7px;margin-bottom:10px"><strong style="font-size:11px;color:#991b1b">🚩 Dikkat</strong><br>${r.ai_degerlendirme.kirmizi_bayraklar.map(k=>`<div style="font-size:11px">${k}</div>`).join('')}</div>`:''}
    <div style="background:#eff6ff;padding:9px;border-radius:7px"><strong style="font-size:11px;color:#1d4ed8">👉 Sonraki Adım:</strong> ${r.ai_degerlendirme.sonraki_adim}</div>
  </div>`: ''}
  <div style="margin-top:20px"><button onclick="window.print()" style="padding:8px 16px;background:#8b1a4a;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨 Yazdır / PDF</button></div>
  </body></html>`);w.document.close();
}
function deleteKayit(idx){
  window.confirmModal(_ikT('delete')+'?', {
    title: _ikT('delete'),
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      const k = usrGet('kayitlar') || []; k.splice(idx,1);
      usrSet('kayitlar', k); updateBadge(); renderKayitlar();
    }
  });
}

// ══════════════════════════════════════════════════
// TEST SÜRÜŞÜ
// ══════════════════════════════════════════════════
function renderTests(){
  const mkC=t=>`<div style="background:var(--bg2);padding:14px;border-radius:10px;border:1px solid var(--border);display:flex;flex-direction:column;gap:9px">
    <div style="width:34px;height:34px;border-radius:9px;background:${t.c}18;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" fill="none" stroke="${t.c}" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
    <div><div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:4px">${t.title}</div><div style="font-size:11px;color:var(--text2);line-height:1.6">${t.desc}</div></div>
    <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;align-self:flex-start;background:${t.c}15;color:${t.c}">${t.badge}</span></div>`;
  document.getElementById('tg1').innerHTML=[
    {title:'Kahraman Bey Testi',desc:'Zor tedarikçiden ayrıcalık almak, özel indirim alma.',c:'#7c3aed',badge:'İkna'},
    {title:'Ofis Temizliği',desc:'Her hafta düzenli ofis temizliği yaptırıp ne yapacağını görme.',c:'#10b981',badge:'Detaycılık'},
    {title:'Zamansız Arama',desc:'Zamansız arama/mesaj — dönüş hızı ve profesyonellik.',c:'#f97316',badge:'Hız'},
    {title:'Uzak Yere Yollama',desc:'Aniden uzak bir yerden bir şey alıp gelmesini isteme.',c:'#0ea5e9',badge:'Sabır'},
    {title:'Fikir Üretkenliği',desc:'Yeni müşteri kazanma konusunda fikirlerini alma.',c:'#ec4899',badge:'Zeka'},
    {title:'Ürün Araştırması',desc:'Detaylı ve eksik bilgi verilen ürünü bulmasını isteme.',c:'#8b1a4a',badge:'Araştırma'},
  ].map(mkC).join('');
  document.getElementById('tg2').innerHTML=[
    {title:'İknacılık — Satış Eğitimi',desc:'Adaydan bir satış eğitimi satmasını isteyin.',c:'#7c3aed',badge:'İkna'},
    {title:'Yüksek İndirim',desc:'Çok yüksek fiyat indirimi almasını isteyin ve izleyin.',c:'#ef4444',badge:'Pazarlık'},
    {title:'Eksik Bilgi ile İş',desc:'Detayları tam ve eksik verilen ürünü bulmasını isteyin.',c:'#0ea5e9',badge:'Pratiklik'},
    {title:'Döküman Geliştirme',desc:'Kısa sürede çelişki ve yazım hatası bulmasını isteyin.',c:'#10b981',badge:'Dikkat'},
    {title:'Fuar Testi',desc:'Hedef net ama nasıl yapacağı bilgisi az verilecek.',c:'#ec4899',badge:'Üretkenlik'},
    {title:'Uygulama Testi (30+30)',desc:'3-4 iş zorluğu yaz → 30 dk düşünsün → birlikte çalış.',c:'#6366f1',badge:'Kapasite'},
  ].map(mkC).join('');
  document.getElementById('yonler-wrap').innerHTML=['Pratiklik','Kararlılık','Sabırlılık','Kıvrak Zeka','Dış Görünüş','Kendini Yönetme','Coşku','Dinamizm','Araştırmacılık','Detaycılık','Dikkat','Analitik Yetenek','Yenilikçilik','Hırs','Dakiklik','Pazarlık / İkna','Soğuk Kanlılık','Karar Alma','Merak','Hızlı İş Yapma','Fedakarlık','İşi Küçük Görmeme','Öğrenci Zihniyeti','Öz Güven','İletişim','Çalışkanlık'].map(y=>`<span style="background:var(--bg3);color:var(--text2);font-size:11px;padding:3px 9px;border-radius:20px;font-weight:500">${y}</span>`).join('');
  // Test sonucu kaydetme formu
  var tdWrap = document.getElementById('tg2')?.parentElement;
  if (tdWrap) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('ak_ik_test_drive')||'{}'); } catch(e) { console.warn('[ik_hub] hata:', e); }
    tdWrap.insertAdjacentHTML('beforeend', '<div style="margin-top:14px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">'
      + '<div style="font-weight:700;font-size:12px;color:var(--accent);margin-bottom:8px">Test Sonucu Kaydet</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        + '<select id="td-aday" style="padding:8px;border:1px solid var(--border);border-radius:7px;font-size:12px;font-family:inherit;background:var(--bg2);color:var(--text)">'
          + candidates.map(function(c){return '<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>';}).join('')
        + '</select>'
        + '<select id="td-puan" style="padding:8px;border:1px solid var(--border);border-radius:7px;font-size:12px;font-family:inherit;background:var(--bg2);color:var(--text)">'
          + '<option value="1">1 — Zayif</option><option value="2">2 — Orta</option><option value="3" selected>3 — Iyi</option><option value="4">4 — Cok Iyi</option><option value="5">5 — Mukemmel</option>'
        + '</select>'
      + '</div>'
      + '<textarea id="td-not" style="width:100%;margin-top:8px;min-height:50px;padding:8px;border:1px solid var(--border);border-radius:7px;font-size:12px;font-family:inherit;background:var(--bg2);color:var(--text);resize:vertical" placeholder="Test gozlemleri...">' + (saved.notes||'') + '</textarea>'
      + '<button onclick="var d={};try{d=JSON.parse(localStorage.getItem(\'ak_ik_test_drive\')||\'{}\')}catch(e){console.warn(\'[ik_hub] hata:\',e)};d[document.getElementById(\'td-aday\').value]={puan:document.getElementById(\'td-puan\').value,notes:document.getElementById(\'td-not\').value,ts:new Date().toISOString()};localStorage.setItem(\'ak_ik_test_drive\',JSON.stringify(d));window.toast?.(\'Kaydedildi\',\'ok\')" style="margin-top:8px;padding:7px 16px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:11px;cursor:pointer;font-family:inherit">Kaydet</button>'
    + '</div>');
  }
}

// ══════════════════════════════════════════════════
// DEĞERLENDİRME
// ══════════════════════════════════════════════════
function renderEval(){
  const el=document.getElementById('eval-content');
  if(!selCand){el.innerHTML=`<div class="empty">${_ikT('select_candidate')}</div>`;return;}
  const avg=(Object.values(evalSc).reduce((a,b)=>a+b,0)/FACTORS.length).toFixed(1);
  el.innerHTML=`<div class="eval-wrap">
    <div class="eval-hd">
      <div><div style="font-weight:700;font-size:14px;color:var(--text)">${window._esc(selCand.name||'')}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${window._esc(selCand.position||'')} · 1–5</div></div>
      <div style="text-align:right"><div style="font-size:9px;font-weight:700;color:var(--text3);letter-spacing:.1em;margin-bottom:2px">TOPLAM</div><div style="font-size:26px;font-weight:800;color:var(--accent)">${avg}</div></div>
    </div>
    <div class="eval-grid">${FACTORS.map(f=>`<div><div class="fac-hd"><span class="fac-lbl">${f}</span><span class="fac-sc">${evalSc[f]}</span></div><div class="fac-bars">${[1,2,3,4,5].map(v=>`<button class="fbar" style="background:${v<=evalSc[f]?'var(--accent)':'var(--bg3)'}" onclick="setSc('${f}',${v})"></button>`).join('')}</div></div>`).join('')}</div>
    <div style="padding:13px 18px;background:var(--bg3);border-top:1px solid var(--border)">
      <div class="flabel" style="margin-bottom:5px">Gözlemler</div>
      <textarea style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text);background:var(--bg2);min-height:70px;resize:vertical;font-family:DM Sans,sans-serif" placeholder="Kanaat notu..."></textarea>
      <div style="display:flex;gap:8px;margin-top:9px">
        <button class="ik-btn ik-btn-full" style="flex:1;background:#10b981;color:#fff" onclick="window.toast?.('İşe alım onaylandı!','ok')">✓ Onayla</button>
        <button class="ik-btn ik-btn-s" style="flex:1" onclick="go('tesekkur',null,'Teşekkür Mektubu')">✉ Teşekkür</button>
      </div>
    </div>
  </div>`;
}
function setSc(f,v){evalSc[f]=v;try{localStorage.setItem('ak_ik_eval_scores',JSON.stringify(evalSc));}catch(e){ console.warn('[ik_hub] hata:', e); } renderEval();}

// ══════════════════════════════════════════════════
// TEŞEKKÜR
// ══════════════════════════════════════════════════
function updateTsk(){
  const a=document.getElementById('tsk-aday')?.value||'[Ad Soyad]';
  const g=document.getElementById('tsk-gonderen')?.value||'İsim Soyisim\nUnvan';
  const el=document.getElementById('tsk-preview');
  if(el){const fn=_ikT('thanks_letter');if(typeof fn==='function') el.textContent=fn(a,g);}
}
function copyTsk(){
  navigator.clipboard.writeText(document.getElementById('tsk-preview').textContent)
    .then(()=>window.toast?.(_ikT('copy_text')+' ✓','ok'))
    .catch(()=>window.toast?.('Manuel olarak seçip kopyalayın.','warn'));
}

// ══════════════════════════════════════════════════
// ÖZET
// ══════════════════════════════════════════════════
function addOzetRow(){
  const tr=document.createElement('tr');
  tr.innerHTML='<td><input placeholder="Ad Soyad" style="border:none;background:transparent;font-size:11px;color:var(--text);width:120px;font-family:DM Sans,sans-serif"></td>'
    +['—','—','—','—'].map(v=>`<td><input placeholder="${v}" style="border:none;background:transparent;font-size:11px;color:var(--text);width:65px;font-family:DM Sans,sans-serif"></td>`).join('')
    +'<td><button onclick="this.closest(\'tr\').remove()" style="border:none;background:transparent;color:#ef4444;cursor:pointer">✕</button></td>';
  document.getElementById('ozet-body').appendChild(tr);
}

// ══════════════════════════════════════════════════
// KAYNAKLAR
// ══════════════════════════════════════════════════
function renderKaynaklar(){
  const resources=[
    {cat:'Kitap',cc:'#eff6ff',ct:'#1d4ed8',title:'Who: The A Method for Hiring',desc:'Geoff Smart & Randy Street. Doğru insanı işe almanın sistematik yöntemi.',link:'https://whothebook.com/'},
    {cat:'Kitap',cc:'#eff6ff',ct:'#1d4ed8',title:'Topgrading (Brad Smart)',desc:'A/B/C kalite çalışan modeli. CIDS görüşme yöntemi ile gerçeği nasıl öğrenirsiniz?',link:'https://topgrading.com/'},
    {cat:'Kitap',cc:'#eff6ff',ct:'#1d4ed8',title:'Work Rules! (Laszlo Bock)',desc:'Google\'ın IK yaklaşımı. Yapısal mülakat, veri bazlı işe alım.',link:'https://www.amazon.com/Work-Rules-Insights-Inside-Transform/dp/1455554790'},
    {cat:'Web',cc:'#f0fdf4',ct:'#166534',title:'SHRM — shrm.org',desc:'Dünya\'nın en büyük IK derneği. Ücretsiz şablonlar ve mülakat soruları.',link:'https://www.shrm.org'},
    {cat:'Web',cc:'#f0fdf4',ct:'#166534',title:'Harvard Business Review',desc:'İşe alım araştırmaları ve yapısal mülakat makaleleri.',link:'https://hbr.org/topic/subject/hiring'},
    {cat:'Web',cc:'#f0fdf4',ct:'#166534',title:'LinkedIn Talent Solutions',desc:'İşe alım trendleri, yetenek raporları, mülakat soruları bankası.',link:'https://business.linkedin.com/talent-solutions'},
    {cat:'Araç',cc:'#fdf4ff',ct:'#7e22ce',title:'Crystal Knows (DISC)',desc:'LinkedIn\'den otomatik DISC profili. Görüşme öncesi adayı tanımak için.',link:'https://www.crystalknows.com'},
    {cat:'Araç',cc:'#fdf4ff',ct:'#7e22ce',title:'TestGorilla',desc:'150+ yetenek testi. Test sürüşü öncesi eleme için ideal.',link:'https://www.testgorilla.com'},
    {cat:'Araç',cc:'#fdf4ff',ct:'#7e22ce',title:'Workable',desc:'Başvuru takibi (ATS), iş ilanı yayınlama ve mülakat planlama.',link:'https://www.workable.com'},
    {cat:'Yöntem',cc:'#fff7ed',ct:'#c2410c',title:'STAR Mülakat Yöntemi',desc:'Situation → Task → Action → Result. Davranışsal mülakat için standart.',link:'https://www.themuse.com/advice/star-interview-method'},
    {cat:'Yöntem',cc:'#fff7ed',ct:'#c2410c',title:'Yapısal Mülakat',desc:'Tüm adaylara aynı soruları sormak ve standart puanlama. Önyargıyı minimize eder.',link:'https://hbr.org/2016/04/a-refresher-on-structured-vs-unstructured-interviews'},
    {cat:'Türkçe',cc:'#fef2f2',ct:'#b91c1c',title:'HR Dergi — hrdergi.com',desc:'Türkiye\'nin önde gelen IK dergisi. Araştırmalar ve vaka çalışmaları.',link:'https://www.hrdergi.com'},
    {cat:'Türkçe',cc:'#fef2f2',ct:'#b91c1c',title:'Peryön — peryon.org.tr',desc:'Personel Yönetimi Derneği. Türkiye IK sertifika programları.',link:'https://www.peryon.org.tr'},
    {cat:'Türkçe',cc:'#fef2f2',ct:'#b91c1c',title:'Kariyer.net IK Rehberi',desc:'Türkiye\'ye özel iş ilanı, maaş araştırması ve IK içerikleri.',link:'https://www.kariyer.net'},
  ];
  document.getElementById('kaynak-grid').innerHTML=resources.map(r=>`
    <div class="res-card">
      <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${r.cc};color:${r.ct};align-self:flex-start">${r.cat}</span>
      <div style="font-weight:700;font-size:12px;color:var(--text);line-height:1.4">${r.title}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5;flex:1">${r.desc}</div>
      <a href="${r.link}" target="_blank" rel="noopener" style="font-size:11px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:4px">Ziyaret Et <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
    </div>`).join('');
}

// ══════════════════════════════════════════════════
// VERSİYON GEÇMİŞİ
// ══════════════════════════════════════════════════
function renderVersions(){
  document.getElementById('version-list').innerHTML=APP_VERSIONS.map((v,i)=>`
    <div class="ver-entry">
      <span class="ver-badge">v${v.ver}</span>${i===0?` <span style="font-size:9px;font-weight:700;background:#ecfdf5;color:#065f46;padding:1px 8px;border-radius:20px;margin-left:5px">Güncel</span>`:''}
      <div class="ver-time">${fmtTs(v.ts)}</div>
      <div class="ver-list">${v.changes.map(c=>`<div>• ${c}</div>`).join('')}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════
// ÖNERİLER
// ══════════════════════════════════════════════════
function _ikSubmitSuggestion(){
  const name=document.getElementById('sg-name').value.trim();
  const cat=document.getElementById('sg-cat').value;
  const title=document.getElementById('sg-title').value.trim();
  const desc=document.getElementById('sg-desc').value.trim();
  const msgEl=document.getElementById('sg-msg');
  if(!title||!desc){msgEl.innerHTML='<div class="err-box">'+_ikT('suggestion_err')+'</div>';return;}
  const sug={id:generateNumericId(),name:name||'Anonim',cat,title,desc,votes:0,status:'beklemede',date:new Date().toLocaleString('tr-TR')};
  const list = usrGet('suggestions') || [];
  list.unshift(sug); usrSet('suggestions', list);
  msgEl.innerHTML='<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:7px 11px;font-size:11px;color:#065f46">'+_ikT('suggestion_saved')+'</div>';
  document.getElementById('sg-title').value='';document.getElementById('sg-desc').value='';
  setTimeout(()=>{msgEl.innerHTML='';_ikRenderSuggestions();},2000);
}
function voteSuggestion(idx,dir){
  const list = usrGet('suggestions') || [];
  if(list[idx]) list[idx].votes+=dir;
  usrSet('suggestions', list); _ikRenderSuggestions();
}
function _ikRenderSuggestions(){
  const list = usrGet('suggestions') || [];
  const el=document.getElementById('suggest-list');if(!el) return;
  if(!list.length){el.innerHTML='<div class="empty" style="height:120px">Henüz öneri yok.</div>';return;}
  const catColors={Özellik:'#eff6ff:#1d4ed8',İyileştirme:'#f0fdf4:#166534',Hata:'#fef2f2:#b91c1c',Tasarım:'#fdf4ff:#7e22ce',Diğer:'#f8fafc:#334155'};
  el.innerHTML=list.map((s,i)=>{
    const [cc,ct]=(catColors[s.cat]||'#f8fafc:#334155').split(':');
    return `<div class="sug-row">
      <div class="sug-vote">
        <button onclick="voteSuggestion(${i},1)">▲</button>
        <span>${s.votes}</span>
        <button onclick="voteSuggestion(${i},-1)">▼</button>
      </div>
      <div style="flex:1;min-width:0">
        <span class="sug-cat" style="background:${cc};color:${ct}">${s.cat}</span>
        <span class="sug-status" style="background:#f0fdf4;color:#166534">${s.status}</span>
        <div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:3px;margin-top:4px">${s.title}</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.5">${s.desc}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">${window._esc(s.name||'')} · ${s.date}</div>
      </div>
    </div>`;}).join('');
}

// ══════════════════════════════════════════════════
// AI TOOLS
// ══════════════════════════════════════════════════
async function callClaude(prompt,sys,max){
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:max||1024,system:sys,messages:[{role:'user',content:prompt}]})
  });
  const d=await res.json();return d.content?.[0]?.text||'';
}
async function analyzeCV(){
  const pos=document.getElementById('cv-pos').value.trim();
  const txt=document.getElementById('cv-text').value.trim();
  const krit=document.getElementById('cv-krit').value.trim();
  const er=document.getElementById('cv-err'),re=document.getElementById('cv-result'),btn=document.getElementById('cv-btn');
  if(!pos||!txt){er.innerHTML='<div class="err-box">⚠ '+_ikT('position')+' ve '+_ikT('cv_text')+' zorunludur.</div>';return;}
  er.innerHTML='';btn.disabled=true;btn.textContent='...';
  re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Analiz ediliyor<span class="dot-load"></span></div>';
  try{
    const raw=await callClaude('Pozisyon: '+pos+'\n'+(krit?'Kriterler: '+krit+'\n':'')+'CV:\n'+txt,'Deneyimli IK uzmanısın. Sadece JSON döndür:\n{"uyum_skoru":0-100,"guclu_yonler":["..."],"eksik_yonler":["..."],"genel_yorum":"2-3 cümle","tavsiye":"işe al / değerlendirilebilir / uygun değil"}');
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const s=d.uyum_skoru||0;
    const bc=s>=70?'#10b981':s>=45?'#f59e0b':'#ef4444';
    const [bb,bf]=s>=70?['#ecfdf5','#065f46']:s>=45?['#fffbeb','#92400e']:['#fef2f2','#991b1b'];
    re.innerHTML='<div class="res-box"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><span style="font-weight:600;font-size:13px">Uyum Skoru</span><span style="font-size:10px;font-weight:700;background:'+bb+';color:'+bf+';padding:2px 10px;border-radius:20px">'+d.tavsiye+'</span></div>'
      +'<div class="ik-score-row"><span style="font-size:22px;font-weight:800;color:var(--text);min-width:36px">'+s+'</span><div class="sbar-wrap"><div class="sbar-fill" style="width:'+s+'%;background:'+bc+'"></div></div><span style="font-size:11px;color:var(--text3)">/100</span></div>'
      +(d.guclu_yonler||[]).map(g=>'<div style="font-size:12px;color:var(--text);padding:2px 0"><span style="color:#10b981;font-weight:700">+ </span>'+g+'</div>').join('')
      +((d.eksik_yonler||[]).length?'<div style="margin-top:7px">'+(d.eksik_yonler||[]).map(e=>'<div style="font-size:12px;color:var(--text);padding:2px 0"><span style="color:#ef4444;font-weight:700">- </span>'+e+'</div>').join('')+'</div>':'')
      +(d.genel_yorum?'<div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--border);font-size:11px;color:var(--text2);line-height:1.7">'+d.genel_yorum+'</div>':'')
      +'</div>';
  }catch(e){re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Sonuç alınamadı.</div>';}
  btn.disabled=false;btn.textContent=_ikT('analyze_cv');
}
async function genSorular(){
  const pos=document.getElementById('s-pos').value.trim();
  const er=document.getElementById('s-err'),re=document.getElementById('s-result'),btn=document.getElementById('s-btn');
  if(!pos){er.innerHTML='<div class="err-box">⚠ '+_ikT('position')+' zorunludur.</div>';return;}
  er.innerHTML='';btn.disabled=true;btn.textContent='...';
  re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Üretiliyor<span class="dot-load"></span></div>';
  try{
    const raw=await callClaude('Pozisyon: '+pos+'\nSeviye: '+document.getElementById('s-sev').value+'\nTür: '+document.getElementById('s-tur').value+(document.getElementById('s-yet').value?'\nYetkinlikler: '+document.getElementById('s-yet').value:''),'IK mülakatçısısın. 7 soru üret. Sadece JSON:\n{"sorular":[{"soru":"...","amac":"kısa","ipucu":"kısa"}]}');
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    re.innerHTML='<div style="display:flex;flex-direction:column;gap:7px;margin-top:7px">'
      +(d.sorular||[]).map((s,i)=>{
        const safeIdx = i;
        window._aiSorular = d.sorular;
        return `<div class="res-box" style="padding:10px 12px"><div style="font-size:9px;color:var(--text3);font-weight:600;margin-bottom:2px">Soru ${i+1}</div>
        <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:5px;line-height:1.5">${s.soru}</div>
        <div style="font-size:11px;color:var(--text2)"><strong>Amaç:</strong> ${s.amac}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px"><strong>İpucu:</strong> ${s.ipucu}</div>
        <button class="ik-btn ik-btn-s ik-btn-sm" style="margin-top:7px;font-size:10px" onclick="aiAddToForm(${safeIdx})">${_ikT('add_to_form')} →</button>
        </div>`;
      }).join('')+'</div>';
  }catch(e){re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Sonuç alınamadı.</div>';}
  btn.disabled=false;btn.textContent=_ikT('generate_questions');
}
async function genIlan(){
  const pos=document.getElementById('i-pos').value.trim();
  const er=document.getElementById('i-err'),re=document.getElementById('i-result'),btn=document.getElementById('i-btn');
  if(!pos){er.innerHTML='<div class="err-box">⚠ '+_ikT('position_name')+' zorunludur.</div>';return;}
  er.innerHTML='';btn.disabled=true;btn.textContent='...';
  re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Oluşturuluyor<span class="dot-load"></span></div>';
  try{
    const txt=await callClaude('Pozisyon: '+pos+'\n'+(document.getElementById('i-dep').value?'Departman: '+document.getElementById('i-dep').value+'\n':'')+'Çalışma: '+document.getElementById('i-mod').value+'\n'+(document.getElementById('i-ger').value?'Gereksinimler:\n'+document.getElementById('i-ger').value:''),'Profesyonel IK yazarısın. DUAY Uluslararası için Türkçe iş ilanı yaz. Format: başlık, hakkımızda, görev tanımı, nitelikler, imkânlar. Düz metin.',1200);
    re.innerHTML='<div class="res-box"><div style="font-size:12px;color:var(--text);line-height:1.8;white-space:pre-wrap">'+txt+'</div></div>';
  }catch(e){re.innerHTML='<div class="res-box" style="color:var(--text3);font-size:12px">Sonuç alınamadı.</div>';}
  btn.disabled=false;btn.textContent=_ikT('generate_posting');
}

// ══════════════════════════════════════════════════
// ADMİN PANELİ
// ══════════════════════════════════════════════════

// Role göre default izinler
var ROLE_PRESETS = {
  admin:   ALL_PERMISSIONS.map(p=>p.key),
  hr:      ['pipeline','telefon','mulakat','kayitlar','test','evaluation','referans','tesekkur','ai','ozet','kaynaklar','versions','suggest'],
  viewer:  ['pipeline','kayitlar','evaluation','kaynaklar','versions'],
};

function renderAdminPanel(){
  renderAdminUserList();
  renderPermCheckboxes('nu', ROLE_PRESETS.hr); // default yeni kullanıcı için hr preset
}

function renderAdminUserList(){
  const users = getUsers();
  const el = document.getElementById('admin-user-list');
  if(!el) return;
  el.innerHTML = users.map((u,i) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:13px 15px;margin-bottom:9px;display:flex;align-items:center;gap:13px">
      <div style="width:38px;height:38px;border-radius:50%;background:${u.role==='admin'?'#f8e8f0':'var(--bg3)'};color:${u.role==='admin'?'var(--accent)':'var(--text2)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${u.display.slice(0,2).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span style="font-weight:700;font-size:13px;color:var(--text)">${u.display}</span>
          <span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:20px;background:${u.role==='admin'?'#f8e8f0':u.role==='hr'?'#eff6ff':'#f0fdf4'};color:${u.role==='admin'?'var(--accent)':u.role==='hr'?'#1d4ed8':'#166534'}">${u.role==='admin'?'Admin':u.role==='hr'?'IK Uzmanı':'Görüntüleyici'}</span>
          <span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:20px;background:${u.active?'#ecfdf5':'#fef2f2'};color:${u.active?'#065f46':'#991b1b'}">${u.active?'Aktif':'Pasif'}</span>
          ${u.id==='usr_admin'?'<span style="font-size:9px;color:var(--text3);padding:1px 6px;border-radius:20px;border:1px solid var(--border)">Sistem Admin</span>':''}
        </div>
        <div style="font-size:11px;color:var(--text3)">@${u.user} · ${u.permissions?.length||0} izin · Oluşturuldu: ${u.createdAt||'—'}</div>
        <div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">
          ${(u.permissions||[]).map(p=>{
            const def = ALL_PERMISSIONS.find(x=>x.key===p);
            return `<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:20px">${def?.label||p}</span>`;
          }).join('')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="ik-btn ik-btn-s ik-btn-sm" onclick="openEditUser('${u.id}')">✏️ Düzenle</button>
        ${u.id!=='usr_admin'?`<button class="btn btn-danger btn-sm" onclick="toggleUserActive('${u.id}')">${u.active?'Pasif Yap':'Aktif Yap'}</button>`:''}
        ${u.id!=='usr_admin'?`<button class="btn btn-danger btn-sm" onclick="_ikDeleteUser('${u.id}')">🗑 Sil</button>`:''}
      </div>
    </div>`).join('');
}

function renderPermCheckboxes(prefix, selectedPerms){
  const el = document.getElementById(prefix+'-perms');
  if(!el) return;
  el.innerHTML = ALL_PERMISSIONS.map(p=>`
    <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text);cursor:pointer;padding:5px 8px;border-radius:7px;border:1px solid var(--border);background:var(--bg3)">
      <input type="checkbox" id="${prefix}-perm-${p.key}" ${selectedPerms.includes(p.key)?'checked':''} style="accent-color:var(--accent);width:13px;height:13px"/>
      ${p.label}
    </label>`).join('');
}

function getCheckedPerms(prefix){
  return ALL_PERMISSIONS.filter(p => document.getElementById(prefix+'-perm-'+p.key)?.checked).map(p=>p.key);
}

function setAllPerms(prefix, val){
  ALL_PERMISSIONS.forEach(p=>{
    const el = document.getElementById(prefix+'-perm-'+p.key);
    if(el) el.checked = val;
  });
}

function setRolePreset(prefix){
  const roleEl = document.getElementById(prefix+'-role') || document.getElementById(prefix.replace('eu','eu')+'-role');
  const role = document.getElementById(prefix+'-role')?.value || 'hr';
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.hr;
  ALL_PERMISSIONS.forEach(p=>{
    const el = document.getElementById(prefix+'-perm-'+p.key);
    if(el) el.checked = preset.includes(p.key);
  });
}

function createUser(){
  const uname   = document.getElementById('nu-user').value.trim().toLowerCase();
  const display = document.getElementById('nu-display').value.trim();
  const pass    = document.getElementById('nu-pass').value;
  const role    = document.getElementById('nu-role').value;
  const perms   = getCheckedPerms('nu');
  const errEl   = document.getElementById('nu-err');

  if(!uname||!display||!pass){ errEl.innerHTML='<div class="err-box">Kullanıcı adı, görünen ad ve şifre zorunludur.</div>'; return; }
  if(pass.length < 4){ errEl.innerHTML='<div class="err-box">Şifre en az 4 karakter olmalıdır.</div>'; return; }

  const users = getUsers();
  if(users.find(u=>u.user===uname)){ errEl.innerHTML='<div class="err-box">Bu kullanıcı adı zaten kullanılıyor.</div>'; return; }

  const newUser = {
    id: 'usr_'+generateNumericId(),
    user: uname,
    pass,
    display,
    role,
    active: true,
    permissions: perms,
    createdAt: new Date().toLocaleString('tr-TR'),
  };
  users.push(newUser);
  _ikSaveUsers(users);

  errEl.innerHTML='<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:7px 11px;font-size:11px;color:#065f46">✅ Kullanıcı oluşturuldu: <strong>'+display+'</strong></div>';
  document.getElementById('nu-user').value='';
  document.getElementById('nu-display').value='';
  document.getElementById('nu-pass').value='';
  renderAdminUserList();
  setTimeout(()=>{ errEl.innerHTML=''; _ikSt('admin','list',document.querySelectorAll('#panel-admin .tab')[0]); },1800);
}

function openEditUser(uid){
  const users = getUsers();
  const u = users.find(x=>x.id===uid);
  if(!u) return;
  document.getElementById('eu-id').value      = u.id;
  document.getElementById('eu-user').value    = u.user;
  document.getElementById('eu-display').value = u.display;
  document.getElementById('eu-pass').value    = '';
  document.getElementById('eu-role').value    = u.role;
  document.getElementById('eu-active').checked = u.active;
  document.getElementById('edit-mo-title').textContent = u.display + ' — Düzenle';
  renderPermCheckboxes('eu', u.permissions||[]);
  // Admin kendi yetkilerini kısıtlayamasın
  if(u.id==='usr_admin'){
    ALL_PERMISSIONS.forEach(p=>{
      const el=document.getElementById('eu-perm-'+p.key);
      if(el) el.disabled=true;
    });
  }
  document.getElementById('edit-mo').style.display='flex';
}

function saveEditUser(){
  const uid = document.getElementById('eu-id').value;
  const users = getUsers();
  const idx = users.findIndex(u=>u.id===uid);
  if(idx===-1) return;

  const uname   = document.getElementById('eu-user').value.trim().toLowerCase();
  const display = document.getElementById('eu-display').value.trim();
  const pass    = document.getElementById('eu-pass').value;
  const role    = document.getElementById('eu-role').value;
  const active  = document.getElementById('eu-active').checked;
  const perms   = uid==='usr_admin' ? ALL_PERMISSIONS.map(p=>p.key) : getCheckedPerms('eu');

  if(!uname||!display){ window.toast?.('Kullanıcı adı ve görünen ad zorunludur.','err'); return; }

  // Kullanıcı adı başkasıyla çakışıyor mu?
  if(users.find((u,i)=>u.user===uname && i!==idx)){ window.toast?.('Bu kullanıcı adı başka bir kullanıcıya ait.','err'); return; }

  users[idx] = {
    ...users[idx],
    user: uname,
    display,
    role,
    active,
    permissions: perms,
    ...(pass ? {pass} : {}), // şifre boş ise değiştirme
  };
  _ikSaveUsers(users);

  // Eğer kendini düzenliyorsa currentUser'ı güncelle
  if(currentUser && currentUser.id===uid){
    currentUser = {...users[idx]};
    document.getElementById('user-name').textContent = users[idx].display;
    document.getElementById('user-av').textContent   = users[idx].display.slice(0,2).toUpperCase();
    renderNavItems();
  }

  document.getElementById('edit-mo').style.display='none';
  renderAdminUserList();
}

function toggleUserActive(uid){
  if(uid==='usr_admin'){ window.toast?.('Sistem admin pasif yapılamaz.','err'); return; }
  const users = getUsers();
  const u = users.find(x=>x.id===uid);
  if(!u) return;
  u.active = !u.active;
  _ikSaveUsers(users);
  renderAdminUserList();
}

function _ikDeleteUser(uid){
  if(uid==='usr_admin'){ window.toast?.('Sistem admin silinemez.', 'err'); return; }
  const users = getUsers();
  const u = users.find(x=>x.id===uid);
  if(!u) return;
  window.confirmModal(u.display+' adlı kullanıcıyı silmek istediğinize emin misiniz?\nBu kullanıcıya ait tüm kayıtlar da silinecektir.', {
    title: 'Kullanıcı Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      Object.keys(localStorage).filter(k=>k.includes(uid)).forEach(k=>localStorage.removeItem(k));
      _ikSaveUsers(users.filter(x=>x.id!==uid));
      renderAdminUserList();
    }
  });
}

function aiAddToForm(idx){
  syncIQ();
  const s = (window._aiSorular||[])[idx];
  if(!s) return;
  if(!iqItems.some(i=>i.soru===s.soru)){
    iqItems.push({id:'iq_'+generateNumericId(), soru:s.soru, yanit:''});
  }
  renderIQList();
  go('mulakat',null,_ikT('interview_form_nav'));
  setTimeout(()=>{ const t=document.querySelectorAll('#panel-mulakat .tab')[1]; if(t) _ikSt('mul','form',t); },50);
}

// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════
// INIT — Platform entegrasyonunda render'lar sekme tıklanınca çalışır
// ══════════════════════════════════════════════════
try { getUsers(); } catch(e) { console.warn('[ik_hub] hata:', e); }  // Kullanıcı DB'sini başlat
try { const mfT=document.getElementById('mf-tarih'); if(mfT) mfT.value=new Date().toISOString().slice(0,16); } catch(e) { console.warn('[ik_hub] hata:', e); }

// App başlangıçta gizli, login ekranı görünür
window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('app').classList.remove('visible');
  // Admin panel perm checkboxes başlangıç değeri
  renderPermCheckboxes('nu', ROLE_PRESETS.hr);
});
// Role seçimi değişince new-user perm preset güncelle
document.addEventListener('change', e => {
  if(e.target.id==='nu-role') setRolePreset('nu');
  if(e.target.id==='eu-role') setRolePreset('eu');
});


// ── İK Hub render bridge fonksiyonları ──────────────────────────
function _ikRenderPipeline() {
  const board = document.getElementById('ikh-pipe-board');
  if (!board) return;
  // pipe-board ID'sini geçici olarak değiştir
  board.id = 'pipe-board';
  try {
    if (typeof renderPipe === 'function') renderPipe();
  } catch(e) {
    board.innerHTML = '<div style="padding:20px;color:var(--t2)">Pipeline yükleniyor...</div>';
    console.warn('[IK_HUB] renderPipe hatası:', e);
  } finally {
    board.id = 'ikh-pipe-board';
  }
}

function _ikRenderTelefon() {
  const cont = document.getElementById('ikh-telefon-content');
  if (!cont) return;
  // telefon-content → ikh-telefon-content
  const orig = document.getElementById('telefon-content');
  if (orig) {
    orig.id = 'ikh-telefon-content-orig';
    cont.id = 'telefon-content';
    try { if(typeof renderTelefon === 'function') renderTelefon(); }
    finally { cont.id = 'ikh-telefon-content'; if(orig) orig.id = 'telefon-content'; }
  } else {
    cont.id = 'telefon-content';
    try { if(typeof renderTelefon === 'function') renderTelefon(); }
    finally { cont.id = 'ikh-telefon-content'; }
  }
}

function _ikRenderMulakat() {
  // Kontrol listesi ve soru bankasını render et
  _ikRenderWithIdSwap('kontrol-list', 'ikh-kontrol-list', renderKontrolList);
  _ikRenderWithIdSwap('soru-bankasi-list', 'ikh-soru-bankasi-list', renderSoruBankasi);
  _ikRenderWithIdSwap('iq-list', 'ikh-iq-list', renderIQList);
}

function _ikRenderTests() {
  _ikRenderWithIdSwap('ikh-test-content', 'ikh-test-content', () => {
    const c = document.getElementById('ikh-test-content');
    if (c) c.innerHTML = '<div class="ik-wrap">' + _ikBuildTestHTML() + '</div>';
  });
}

function _ikRenderEval() {
  _ikRenderWithIdSwap('eval-content', 'ikh-eval-content', renderEval);
}

function _ikRenderAI() {
  // AI panel zaten HTML'de hazır, sadece API key kontrolü
  const apiNote = document.getElementById('ikh-ai-note');
  if (!apiNote) return;
}

function _ikRenderKayitlar() {
  _ikRenderWithIdSwap('kayit-listesi', 'ikh-kayit-listesi', renderKayitlar);
}

// Yardımcı: ID swap ile render
function _ikRenderWithIdSwap(origId, hubId, renderFn) {
  const hubEl = document.getElementById(hubId);
  if (!hubEl) return;
  const origEl = document.getElementById(origId);
  if (origEl && origEl !== hubEl) origEl.id = origId + '_hidden';
  hubEl.id = origId;
  try { if(typeof renderFn === 'function') renderFn(); }
  catch(e) { console.warn('[IkHub]', e); }
  finally {
    hubEl.id = hubId;
    const hidden = document.getElementById(origId + '_hidden');
    if (hidden) hidden.id = origId;
  }
}

// Test HTML oluştur
function _ikBuildTestHTML() {
  const fns = window._ikTestContent || '';
  if (typeof renderTests === 'function') {
    const tmp = document.createElement('div');
    tmp.id = 'test-content-tmp';
    document.body.appendChild(tmp);
    const origPanel = document.getElementById('panel-test');
    if (origPanel) {
      const content = origPanel.querySelector('.panel > div:last-child') || origPanel;
      return content.innerHTML;
    }
    tmp.remove();
  }
  return '<div style="padding:20px;color:var(--t2)">Test Drive içeriği yükleniyor...</div>';
}

// Bridge wrappers - IkHub export'u için
function _ikSaveInterview() { 
  // ID'leri platform versiyonuna çevir
  ['mf-aday','mf-pozisyon','mf-tarih','mf-gorusen','mf-not'].forEach(id => {
    const ikh = document.getElementById('ikh-' + id);
    const orig = document.getElementById(id);
    if (ikh && !orig) ikh.id = id;
  });
  const iqList = document.getElementById('ikh-iq-list');
  if (iqList) iqList.id = 'iq-list';
  // Randevu tarihi ve saati topla
  var _interviewDate = document.getElementById('mf-tarih')?.value || document.getElementById('ikh-mf-tarih')?.value || '';
  var _interviewTime = document.getElementById('ikh-mf-saat')?.value || '10:00';
  var _interviewType = document.getElementById('ikh-mf-tur')?.value || 'yuzyuze';
  var _interviewLink = document.getElementById('ikh-mf-link')?.value || '';
  var _candidateName = document.getElementById('mf-aday')?.value || document.getElementById('ikh-mf-aday')?.value || '';

  try { if(typeof saveInterview === 'function') saveInterview(); } catch(e) { console.warn(e); }
  finally {
    ['mf-aday','mf-pozisyon','mf-tarih','mf-gorusen','mf-not'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !document.getElementById('ikh-' + id)) el.id = 'ikh-' + id;
    });
    const iq = document.getElementById('iq-list');
    if (iq) iq.id = 'ikh-iq-list';
  }
  // Yöneticiye bildirim + takvime ekle
  if (_candidateName && _interviewDate) {
    var mgrs = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return (u.role === 'admin' || u.role === 'manager') && u.status === 'active'; });
    var cuName = (typeof window.CU === 'function' ? window.CU()?.name : '') || '';
    mgrs.forEach(function(m) {
      window.addNotif?.('📝', 'Mülakat randevusu: ' + _candidateName + ' — ' + _interviewDate + ' ' + _interviewTime + ' (' + cuName + ')', 'info', 'ik-hub', m.id);
    });
    if (typeof loadCal === 'function' && typeof saveCal === 'function') {
      var cal = loadCal();
      cal.push({
        id: (typeof generateNumericId === 'function' ? generateNumericId() : Date.now()),
        title: 'Mülakat: ' + _candidateName,
        date: _interviewDate, time: _interviewTime, type: 'toplanti',
        desc: (_interviewType === 'online' ? 'Online — ' + _interviewLink : 'Yüz yüze'),
        own: 0, status: 'approved',
        createdBy: (typeof window.CU === 'function' ? window.CU()?.id : null),
      });
      saveCal(cal);
    }
    window.toast?.('Mülakat randevusu + takvime eklendi ✓', 'ok');
  }
}

function _ikClearForm() { if(typeof clearForm==='function') clearForm(); }
function _ikAddIQ() { if(typeof addIQ==='function') addIQ(); }
function _ikAddFromBank() { if(typeof addFromBank==='function') addFromBank(); }

function _ikAnalyzeCV() {
  const cvText = document.getElementById('ikh-ai-cv')?.value?.trim();
  if (!cvText) { window.toast?.('CV metni girin', 'err'); return; }
  const result = document.getElementById('ikh-ai-cv-result');
  if (result) result.innerHTML = '<div class="ik-ai-loading"><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><span>Analiz ediliyor...</span></div>';
  // analyzeCV'yi geçici olarak cv-text ID'siyle çalıştır
  const tmp = document.createElement('textarea');
  tmp.id = 'cv-text'; tmp.value = cvText; tmp.style.display = 'none';
  document.body.appendChild(tmp);
  const origResult = document.getElementById('ai-cv-result');
  if (result) result.id = 'ai-cv-result';
  if(typeof analyzeCV === 'function') analyzeCV();
  setTimeout(() => {
    tmp.remove();
    if (result) result.id = 'ikh-ai-cv-result';
  }, 100);
}

function _ikGenSorular() {
  const pos = document.getElementById('ikh-ai-pos')?.value?.trim();
  const count = parseInt(document.getElementById('ikh-ai-qcount')?.value) || 5;
  if (!pos) { window.toast?.('Pozisyon girin', 'err'); return; }
  const result = document.getElementById('ikh-ai-q-result');
  if (result) {
    result.innerHTML = '<div class="ik-ai-loading"><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><span>Sorular üretiliyor...</span></div>';
    result.id = 'ai-q-result';
  }
  // Geçici input
  const tmp = document.createElement('input');
  tmp.id = 'gen-pos'; tmp.value = pos; tmp.style.display = 'none';
  document.body.appendChild(tmp);
  const tmpN = document.createElement('input');
  tmpN.id = 'gen-count'; tmpN.value = count; tmpN.style.display = 'none';
  document.body.appendChild(tmpN);
  if(typeof genSorular === 'function') genSorular();
  setTimeout(() => {
    tmp.remove(); tmpN.remove();
    if (result) result.id = 'ikh-ai-q-result';
  }, 100);
}

function _ikGenIlan() {
  const pos  = document.getElementById('ikh-ai-ilan-pos')?.value?.trim();
  const dept = document.getElementById('ikh-ai-ilan-dept')?.value?.trim();
  if (!pos) { window.toast?.('Pozisyon girin', 'err'); return; }
  const result = document.getElementById('ikh-ai-ilan-result');
  if (result) {
    result.innerHTML = '<div class="ik-ai-loading"><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><div class="ik-ai-dot"></div><span>İlan oluşturuluyor...</span></div>';
    result.id = 'ai-ilan-result';
  }
  const tmpP = document.createElement('input');
  tmpP.id='ilan-pos'; tmpP.value=pos; tmpP.style.display='none';
  document.body.appendChild(tmpP);
  const tmpD = document.createElement('input');
  tmpD.id='ilan-dept'; tmpD.value=dept||''; tmpD.style.display='none';
  document.body.appendChild(tmpD);
  if(typeof genIlan === 'function') genIlan();
  setTimeout(() => {
    tmpP.remove(); tmpD.remove();
    if (result) result.id = 'ikh-ai-ilan-result';
  }, 100);
}

function _ikAddCand() {
  addCand('phone-screening');
  _ikRenderPipeline();
}

function _ikExportKayitlar() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const kayitlar = usrGet('kayitlar', []);
  if (!kayitlar.length) { window.toast?.('Kayıt yok', 'warn'); return; }
  const rows = kayitlar.map(k => ({
    'Aday': k.aday||'', 'Pozisyon': k.pozisyon||'', 'Tarih': k.tarih||'',
    'Görüşen': k.gorusen||'', 'Not': k.not||'', 'Puan': k.puan||''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mülakat Kayıtları');
  XLSX.writeFile(wb, 'IK_Mulakat_Kayitlari.xlsx');
  window.toast?.('Excel oluşturuldu ✓', 'ok');
}

function _ikStTab(group, tab, btn) {
  if (typeof st === 'function') {
    // st fonksiyonu 'mul' gibi group id kullanıyor
    // hub'daki ID'ler ikh- prefix'li, geçici swap yap
    const groupEl = document.getElementById('ikh-' + group + '-' + tab);
    _ikSt(group, tab, btn);
  }
}

// ════════════════════════════════════════════════════════════════
// 1. AI ADAY ÖZETİ
// ════════════════════════════════════════════════════════════════

function openAiAnalysis(candId) {
  var c = candidates.find(function(x){ return x.id === candId; }); if(!c) return;
  var old = document.getElementById('mo-ai-cand'); if(old) old.remove();
  var mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-ai-cand'; mo.style.zIndex='2300';
  mo.innerHTML = '<div class="moc" style="max-width:480px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">AI Aday Analizi</div>'
      + '<div style="font-size:11px;color:var(--t3)">' + escapeHtml(c.name) + ' — ' + escapeHtml(c.position) + '</div>'
    + '</div>'
    + '<div id="ai-cand-body" style="padding:20px;min-height:120px;display:flex;align-items:center;justify-content:center">'
      + '<div style="text-align:center;color:var(--t3)"><div class="spinner" style="width:24px;height:24px;border:3px solid var(--b);border-top-color:var(--ac);border-radius:50%;animation:spin .6s linear infinite;margin:0 auto 8px"></div><div style="font-size:12px">AI analiz yapiliyor...</div></div>'
    + '</div>'
    + '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn" onclick="document.getElementById(\'mo-ai-cand\').remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e){ if(e.target===mo) mo.remove(); });
  setTimeout(function(){ mo.classList.add('open'); }, 10);

  // API çağrısı
  var cvText = c.cv ? '(CV yuklu: ' + c.cv.name + ')' : '(CV yok)';
  var prompt = 'Aday: ' + c.name + '\nPozisyon: ' + c.position + '\nNotlar: ' + (c.notes||'Yok') + '\nTelefon gorusme notu: ' + (c.disc||'N/A') + '\n' + cvText + '\n\nBu adayi 3 bolumde analiz et: 1) Guclu Yonler 2) Zayif Yonler 3) Genel Profil Degerlendirmesi. Kisa ve net yaz.';

  var apiKey = window.__ENV__?.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    // API key yoksa mock yanıt
    setTimeout(function(){
      var body = document.getElementById('ai-cand-body');
      if(body) body.innerHTML = '<div style="font-size:12px;color:var(--t);line-height:1.7">'
        + '<div style="font-weight:700;color:#10B981;margin-bottom:6px">Guclu Yonler</div>'
        + '<div style="margin-bottom:12px;color:var(--t2)">' + escapeHtml(c.position) + ' pozisyonu icin basvurmus. ' + (c.notes ? escapeHtml(c.notes) : 'On gorusme notu mevcut degil.') + '</div>'
        + '<div style="font-weight:700;color:#F59E0B;margin-bottom:6px">Zayif Yonler</div>'
        + '<div style="margin-bottom:12px;color:var(--t2)">Detayli degerlendirme icin mulakat sonuclari beklenmeli.</div>'
        + '<div style="font-weight:700;color:#6366F1;margin-bottom:6px">Genel Profil</div>'
        + '<div style="color:var(--t2)">AI analizi icin Anthropic API anahtari gerekli (window.__ENV__.ANTHROPIC_API_KEY). Simdilik on gorusme notlarina dayanilarak degerlendirme yapildi.</div>'
        + '</div>';
    }, 1200);
    return;
  }

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'Sen deneyimli bir Turkce IK uzmanisin. Aday degerlendirmelerini kisa, net ve profesyonel yap.',
      messages: [{ role: 'user', content: prompt }]
    })
  }).then(function(r){ return r.json(); }).then(function(data){
    var text = data.content?.[0]?.text || 'Yanit alinamadi';
    var body = document.getElementById('ai-cand-body');
    if(body) body.innerHTML = '<div style="font-size:12px;color:var(--t);line-height:1.7;white-space:pre-line">' + escapeHtml(text) + '</div>';
  }).catch(function(e){
    var body = document.getElementById('ai-cand-body');
    if(body) body.innerHTML = '<div style="color:var(--rdt);font-size:12px">API hatasi: ' + escapeHtml(e.message) + '</div>';
  });
}
window.openAiAnalysis = openAiAnalysis;

// ════════════════════════════════════════════════════════════════
// 2. ADAY KARŞILAŞTIRMA
// ════════════════════════════════════════════════════════════════

var _compareIds = [];
function toggleCompare(candId) {
  var idx = _compareIds.indexOf(candId);
  if (idx >= 0) _compareIds.splice(idx, 1);
  else if (_compareIds.length < 2) _compareIds.push(candId);
  else { window.toast?.('En fazla 2 aday secilebilir', 'err'); return; }
  if (_compareIds.length === 2) openCompareModal();
}
function openCompareModal() {
  var a = candidates.find(function(x){ return x.id === _compareIds[0]; });
  var b = candidates.find(function(x){ return x.id === _compareIds[1]; });
  if (!a || !b) return;
  var old = document.getElementById('mo-cand-compare'); if(old) old.remove();
  var mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-cand-compare'; mo.style.zIndex='2300';

  var rows = FACTORS.map(function(f){
    var sa = (evalSc[f]||3); var sb = (evalSc[f]||3); // Mock — gerçek skorda aday bazlı olmalı
    var winner = sa > sb ? 'a' : sb > sa ? 'b' : '';
    return '<tr><td style="padding:6px 10px;font-size:11px;border:1px solid var(--b)">' + escapeHtml(f) + '</td>'
      + '<td style="padding:6px 10px;text-align:center;font-weight:600;border:1px solid var(--b);background:' + (winner==='a'?'rgba(34,197,94,.08)':'') + '">' + sa + '/5</td>'
      + '<td style="padding:6px 10px;text-align:center;font-weight:600;border:1px solid var(--b);background:' + (winner==='b'?'rgba(34,197,94,.08)':'') + '">' + sb + '/5</td></tr>';
  }).join('');

  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)"><div style="font-size:15px;font-weight:700;color:var(--t)">Aday Karsilastirma</div></div>'
    + '<div style="padding:16px 20px;max-height:60vh;overflow-y:auto">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'
        + '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:10px">'
          + '<div style="width:48px;height:48px;border-radius:14px;background:var(--al);color:var(--ac);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;margin:0 auto 8px">' + (a.name||'?')[0] + '</div>'
          + '<div style="font-size:14px;font-weight:600;color:var(--t)">' + escapeHtml(a.name) + '</div>'
          + '<div style="font-size:11px;color:var(--t3)">' + escapeHtml(a.position) + '</div>'
          + '<div style="font-size:18px;font-weight:800;color:var(--ac);margin-top:4px">' + (a.score||0) + '</div>'
        + '</div>'
        + '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:10px">'
          + '<div style="width:48px;height:48px;border-radius:14px;background:rgba(245,158,11,.1);color:#F59E0B;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;margin:0 auto 8px">' + (b.name||'?')[0] + '</div>'
          + '<div style="font-size:14px;font-weight:600;color:var(--t)">' + escapeHtml(b.name) + '</div>'
          + '<div style="font-size:11px;color:var(--t3)">' + escapeHtml(b.position) + '</div>'
          + '<div style="font-size:18px;font-weight:800;color:#F59E0B;margin-top:4px">' + (b.score||0) + '</div>'
        + '</div>'
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse"><tr style="background:var(--s2)"><th style="padding:6px 10px;text-align:left;font-size:10px;border:1px solid var(--b)">Kriter</th><th style="padding:6px 10px;text-align:center;font-size:10px;border:1px solid var(--b)">' + escapeHtml(a.name.split(' ')[0]) + '</th><th style="padding:6px 10px;text-align:center;font-size:10px;border:1px solid var(--b)">' + escapeHtml(b.name.split(' ')[0]) + '</th></tr>' + rows + '</table>'
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);text-align:right">'
      + '<button class="btn" onclick="_compareIds=[];document.getElementById(\'mo-cand-compare\').remove()">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e){ if(e.target===mo) mo.remove(); });
  setTimeout(function(){ mo.classList.add('open'); }, 10);
  _compareIds = [];
}
window.toggleCompare = toggleCompare;

// ════════════════════════════════════════════════════════════════
// 3. FOCUS MODE (Mülakat)
// ════════════════════════════════════════════════════════════════

function startFocusInterview(candId) {
  var c = candidates.find(function(x){ return x.id === candId; });
  if (!c) { c = { name: 'Aday', position: '' }; }
  var overlay = document.createElement('div');
  overlay.id = 'ik-focus-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px';

  var qIdx = 0;
  var scores = {};
  var notes = {};
  var questions = DEFAULT_SORU_METINLERI.slice(0, 10);

  function renderQ() {
    var q = questions[qIdx] || '';
    var pct = Math.round((qIdx+1)/questions.length*100);
    overlay.innerHTML = '<div style="max-width:600px;width:100%;max-height:90vh;overflow-y:auto;background:var(--sf);border-radius:16px;padding:0">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
        + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">Mulakat — ' + escapeHtml(c.name) + '</div>'
          + '<div style="font-size:11px;color:var(--t3)">Soru ' + (qIdx+1) + '/' + questions.length + '</div></div>'
        + '<button onclick="document.getElementById(\'ik-focus-overlay\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">ESC</button>'
      + '</div>'
      + '<div style="height:3px;background:var(--s2)"><div style="height:100%;width:' + pct + '%;background:var(--ac);transition:width .3s"></div></div>'
      + '<div style="padding:24px 20px">'
        + '<div style="font-size:16px;font-weight:600;color:var(--t);line-height:1.5;margin-bottom:20px">' + escapeHtml(q) + '</div>'
        + '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:6px">PUAN (1-5)</div>'
          + '<div style="display:flex;gap:6px">' + [1,2,3,4,5].map(function(n){ return '<button onclick="window._fmScore(' + qIdx + ',' + n + ')" style="width:40px;height:40px;border-radius:10px;border:2px solid ' + ((scores[qIdx]===n)?'var(--ac)':'var(--b)') + ';background:' + ((scores[qIdx]===n)?'var(--al)':'var(--sf)') + ';cursor:pointer;font-size:14px;font-weight:700;color:' + ((scores[qIdx]===n)?'var(--ac)':'var(--t3)') + ';font-family:inherit">' + n + '</button>'; }).join('') + '</div>'
        + '</div>'
        + '<div><div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:6px">NOT</div>'
          + '<textarea id="fm-note" style="width:100%;padding:10px;border:1.5px solid var(--b);border-radius:8px;font-size:13px;color:var(--t);background:var(--s);resize:vertical;min-height:60px;font-family:inherit;outline:none" placeholder="Gozlemler...">' + (notes[qIdx]||'') + '</textarea>'
        + '</div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:space-between">'
        + (qIdx > 0 ? '<button class="btn btns" onclick="window._fmPrev()">Onceki</button>' : '<div></div>')
        + (qIdx < questions.length - 1
          ? '<button class="btn btnp" onclick="window._fmNext()">Sonraki</button>'
          : '<button class="btn btnp" onclick="window._fmFinish(' + (candId||0) + ')" style="background:#10B981;border-color:#10B981">Mulakati Bitir</button>')
      + '</div></div>';
  }

  window._fmScore = function(qi, val) { scores[qi] = val; renderQ(); };
  window._fmPrev = function() { notes[qIdx] = document.getElementById('fm-note')?.value||''; if(qIdx>0) qIdx--; renderQ(); };
  window._fmNext = function() { notes[qIdx] = document.getElementById('fm-note')?.value||''; qIdx++; renderQ(); };
  window._fmFinish = function(cid) {
    notes[qIdx] = document.getElementById('fm-note')?.value||'';
    var total = 0; var count = 0;
    Object.values(scores).forEach(function(v){ total += v; count++; });
    var avg = count ? (total / count).toFixed(1) : 0;
    // Adaya skoru kaydet
    var cand = candidates.find(function(x){ return x.id === cid; });
    if (cand) {
      cand.score = parseFloat(avg);
      cand.interviewScores = scores;
      cand.interviewNotes = notes;
      cand.timeline = cand.timeline || [];
      cand.timeline.push({ ts: window.nowTs?.() || new Date().toISOString(), action: 'Mulakat tamamlandi — Skor: ' + avg, by: window.CU?.()?.name || '' });
      _storeCandidates(candidates);
    }
    document.getElementById('ik-focus-overlay')?.remove();
    window.toast?.('Mulakat tamamlandi — Ortalama: ' + avg + '/5', 'ok');
    renderPipe();
  };

  document.body.appendChild(overlay);
  document.addEventListener('keydown', function _escHandler(e) {
    if (e.key === 'Escape') { document.getElementById('ik-focus-overlay')?.remove(); document.removeEventListener('keydown', _escHandler); }
  });
  renderQ();
}
window.startFocusInterview = startFocusInterview;

// ════════════════════════════════════════════════════════════════
// 4. OTOMATİK RED MEKTUBU
// ════════════════════════════════════════════════════════════════

function openRejectionLetter(candId) {
  var c = candidates.find(function(x){ return x.id === candId; }); if(!c) return;
  var tarih = new Date().toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' });
  var letter = 'Sayın ' + c.name + ',\n\n'
    + c.position + ' pozisyonu icin yapmis oldugunuz basvuru icin tesekkur ederiz.\n\n'
    + 'Basvurunuzu dikkatle inceledik. Ancak, su an icin ihtiyaclarimiza daha uygun adaylarla ilerleme karari aldik.\n\n'
    + 'Bu karar sizin yetkinliklerinizle ilgili degil, tamamen pozisyon gereksinimleriyle ilgilidir. Gelecekte uygun pozisyonlar icin sizi tekrar degerlendirmekten memnuniyet duyariz.\n\n'
    + 'Kariyer yolculugunuzda basarilar dileriz.\n\n'
    + 'Saygilarimizla,\n'
    + (window.CU?.()?.name || 'IK Departmani') + '\n'
    + 'Duay Global LLC\n'
    + tarih;

  var old = document.getElementById('mo-reject-letter'); if(old) old.remove();
  var mo = document.createElement('div');
  mo.className='mo'; mo.id='mo-reject-letter'; mo.style.zIndex='2300';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b)">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">Red Mektubu</div>'
      + '<div style="font-size:11px;color:var(--t3)">' + escapeHtml(c.name) + ' — ' + escapeHtml(c.position) + '</div>'
    + '</div>'
    + '<div style="padding:16px 20px">'
      + '<textarea id="reject-letter-text" style="width:100%;min-height:250px;padding:14px;border:1.5px solid var(--b);border-radius:10px;font-size:13px;color:var(--t);background:var(--s);line-height:1.7;font-family:inherit;resize:vertical">' + escapeHtml(letter) + '</textarea>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-reject-letter\').remove()">Kapat</button>'
      + '<button class="btn btnp" onclick="navigator.clipboard?.writeText(document.getElementById(\'reject-letter-text\').value).then(function(){window.toast?.(\'Kopyalandi\',\'ok\')})">Kopyala</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e){ if(e.target===mo) mo.remove(); });
  setTimeout(function(){ mo.classList.add('open'); }, 10);

  // Adayı reddet
  c.status = 'reddedildi';
  c.timeline = c.timeline || [];
  c.timeline.push({ ts: window.nowTs?.() || new Date().toISOString(), action: 'Aday reddedildi', by: window.CU?.()?.name || '' });
  _storeCandidates(candidates);
}
window.openRejectionLetter = openRejectionLetter;

function _calcCandScore(c) {
  var interviewAvg = 0;
  if (c.interviewScores) {
    var vals = Object.values(c.interviewScores);
    if (vals.length) interviewAvg = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  } else if (c.score) {
    interviewAvg = c.score;
  }
  var interviewPct = (interviewAvg / 5) * 100;
  var tdPuan = 0;
  try { var td = JSON.parse(localStorage.getItem('ak_ik_test_drive') || '{}'); if (td[c.id]) tdPuan = parseInt(td[c.id].puan || 0); } catch (e) { /* ignore */ }
  var tdPct = (tdPuan / 5) * 100;
  var evalAvg = 0;
  try { var ev = JSON.parse(localStorage.getItem('ak_ik_eval_scores') || '{}'); var evVals = Object.values(ev); if (evVals.length) evalAvg = evVals.reduce(function(a, b) { return a + b; }, 0) / evVals.length; } catch (e) { /* ignore */ }
  var evalPct = (evalAvg / 5) * 100;
  var total = Math.round(interviewPct * 0.4 + tdPct * 0.3 + evalPct * 0.3);
  var color = total >= 70 ? '#10B981' : total >= 40 ? '#F59E0B' : '#EF4444';
  return { total: total, color: color };
}
window._calcCandScore = _calcCandScore;

function renderIkRaporlar() {
  var body = document.getElementById('ikh-rapor-body');
  if (!body) return;
  var all = _loadCandidates();
  var thisMonth = new Date().toISOString().slice(0, 7);
  var thisMonthN = all.filter(function(c) { return (c.createdAt || '').startsWith(thisMonth); }).length;
  var kabul = all.filter(function(c) { return c.stage === 'kabul'; }).length;
  var red = all.filter(function(c) { return c.stage === 'red'; }).length;
  var bekleyen = all.length - kabul - red;
  var total = all.length || 1;
  var posCounts = {};
  all.forEach(function(c) { var p = c.position || 'Belirtilmedi'; posCounts[p] = (posCounts[p] || 0) + 1; });
  var maxPos = Math.max.apply(null, Object.values(posCounts).concat([1]));
  body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px">'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--ac)">' + thisMonthN + '</div><div style="font-size:10px;color:var(--t3)">Bu Ay</div></div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#10B981">' + kabul + '</div><div style="font-size:10px;color:var(--t3)">Kabul</div></div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#EF4444">' + red + '</div><div style="font-size:10px;color:var(--t3)">Red</div></div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700;color:#F59E0B">' + bekleyen + '</div><div style="font-size:10px;color:var(--t3)">Bekleyen</div></div>'
    + '</div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:16px;margin-bottom:16px">'
      + '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:10px">Oran: Kabul %' + Math.round(kabul / total * 100) + ' · Red %' + Math.round(red / total * 100) + ' · Bekleyen %' + Math.round(bekleyen / total * 100) + '</div>'
      + '<div style="height:10px;background:var(--s2);border-radius:5px;overflow:hidden;display:flex">'
        + '<div style="width:' + Math.round(kabul / total * 100) + '%;background:#10B981"></div>'
        + '<div style="width:' + Math.round(red / total * 100) + '%;background:#EF4444"></div>'
        + '<div style="width:' + Math.round(bekleyen / total * 100) + '%;background:#F59E0B"></div>'
      + '</div>'
    + '</div>'
    + '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:16px">'
      + '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:10px">Pozisyon Dagilimi</div>'
      + Object.entries(posCounts).sort(function(a, b) { return b[1] - a[1]; }).map(function(e) {
          return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="color:var(--t2)">' + escapeHtml(e[0]) + '</span><span style="font-weight:600;color:var(--ac)">' + e[1] + '</span></div>'
            + '<div style="height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.round(e[1] / maxPos * 100) + '%;background:var(--ac);border-radius:3px"></div></div></div>';
        }).join('')
    + '</div>';
}
window.renderIkRaporlar = renderIkRaporlar;

const IkHub = {
  render:          renderIkHub,
  setTab:          setIkTab,
  openAddModal:    openIkAddModal,
  renderPersonel:  renderIkPersonel,
  openPersonelEdit:openIkPersonelEdit,
  delPersonel:     delIkPersonel,
  renderPuantaj:   renderIkPuantaj,
  togglePuan:      toggleIkPuan,
  openPuanModal:   id => window.openPuanModal?.(id),
  exportPuantajPdf:exportIkPuantajPdf,
  setIzinFilter:   setIkIzinFilter,
  renderIzin:      renderIkIzin,
  openIzinModal:   openIkIzinModal,
  approveIzin:     approveIkIzin,
  rejectIzin:      rejectIkIzin,
  printIzin:       printIkIzin,
  delIzin:         delIkIzin,
  renderMaas:      renderIkMaas,
  openMaasModal:   openIkMaasModal,
  calcNetMaas:     calcIkNetMaas,
  saveMaas:        saveIkMaas,
  markMaasOdendi:  markIkMaasOdendi,
  delMaas:         delIkMaas,
  exportBordroXlsx:exportIkBordroXlsx,
  renderPerformans:renderIkPerformans,
  openPerfModal:   openIkPerfModal,
  savePerf:        saveIkPerf,
  delPerf:         delIkPerf,
  setSozFilter:    setIkSozFilter,
  renderSozlesme:  renderIkSozlesme,
  openSozlesmeModal:openIkSozlesmeModal,
  saveSozlesme:    saveIkSozlesme,
  delSozlesme:     delIkSozlesme,
  exportXlsx:      exportIkHubXlsx,
  inject:          _injectIkHub,
  // İşe Alım bridge'leri
  addCandidate:    _ikAddCand,
  aiAnalysis:      openAiAnalysis,
  compareCandidate: toggleCompare,
  focusInterview:  startFocusInterview,
  rejectLetter:    openRejectionLetter,
  renderRaporlar:  renderIkRaporlar,
  calcCandScore:   _calcCandScore,
  _ikSt:           _ikStTab,
  _saveInterview:  _ikSaveInterview,
  _clearForm:      _ikClearForm,
  _addIQ:          _ikAddIQ,
  _addFromBank:    _ikAddFromBank,
  _analyzeCV:      _ikAnalyzeCV,
  _genSorular:     _ikGenSorular,
  _genIlan:        _ikGenIlan,
  _exportKayitlar: _ikExportKayitlar,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IkHub;
} else {
  window.IkHub     = IkHub;
  window.renderIkHub = renderIkHub;
}
console.log('[IK_HUB] Yüklendi, IkHub:', typeof IkHub);
