/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/formlar.js  —  v8.1.0
 * Kurumsal Hazır Formlar — V18'den adapte edildi
 * 15 form: İK (5), Mali (3), Resmi (2), Operasyon (5)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _gfm  = window.g;
const _isAdminFm = window.isAdmin;
const _CUfm      = window.CU;

let FORMS_CAT_FILTER = 'all';
let ACTIVE_FORM      = null;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — 15 FORM VERİSİ
// ════════════════════════════════════════════════════════════════

const FORMS_DATA = [
  // ── İK Formları ──────────────────────────────────────────────
  { id:1, cat:'ik', title:'İzin Dilekçesi', icon:'📝', desc:'Yıllık/Mazeret/Sağlık izin talebi', color:'#EEF2FF', fields:[
    { l:'Ad Soyad', id:'izin_ad' }, { l:'Pozisyon / Departman', id:'izin_poz' },
    { l:'İzin Türü', id:'izin_tur', type:'select', opts:['Yıllık İzin','Mazeret İzni','Hastalık İzni','Doğum İzni','Evlilik İzni (3 gün)','Ölüm İzni (3 gün)','Ücretsiz İzin'] },
    { l:'Başlangıç Tarihi', id:'izin_bas', type:'date' }, { l:'Bitiş Tarihi', id:'izin_bit', type:'date' },
    { l:'Toplam Gün (İş Günü)', id:'izin_gun', type:'number' }, { l:'Vekâlet Edecek Kişi', id:'izin_vek' },
    { l:'Açıklama / Gerekçe', id:'izin_ac', type:'textarea' },
  ]},
  { id:2, cat:'ik', title:'İşe Giriş Formu', icon:'🚪', desc:'Yeni personel işe alım belgesi', color:'#F0FDF4', fields:[
    { l:'Ad Soyad', id:'ig_ad' }, { l:'TC Kimlik No', id:'ig_tc' }, { l:'Doğum Tarihi', id:'ig_dt', type:'date' },
    { l:'Görev/Pozisyon', id:'ig_poz' }, { l:'Departman', id:'ig_dep' }, { l:'İşe Başlama Tarihi', id:'ig_bas', type:'date' },
    { l:'Ücret (TL)', id:'ig_ucret', type:'number' }, { l:'Deneme Süresi', id:'ig_deneme', type:'select', opts:['2 Ay','3 Ay','Yok'] },
    { l:'IBAN', id:'ig_iban' }, { l:'SGK Sicil No', id:'ig_sgk' }, { l:'Acil İletişim Kişisi', id:'ig_acil' }, { l:'Not', id:'ig_not', type:'textarea' },
  ]},
  { id:3, cat:'ik', title:'İşten Çıkış Formu', icon:'🚶', desc:'Ayrılış bildirim ve zimmet iade', color:'#FFF1F2', fields:[
    { l:'Ad Soyad', id:'ic_ad' }, { l:'Pozisyon', id:'ic_poz' }, { l:'Ayrılış Tarihi', id:'ic_tarih', type:'date' },
    { l:'Ayrılış Nedeni', id:'ic_neden', type:'select', opts:['İstifa','Sözleşme Sona Erdi','Kıdem','İşveren Feshi','Emeklilik'] },
    { l:'İade Edilen Zimmet', id:'ic_zimmet', type:'textarea' }, { l:'İdari İzin Bakiyesi (gün)', id:'ic_izin', type:'number' },
    { l:'Kıdem Tazminatı (₺)', id:'ic_kidem', type:'number' }, { l:'Son Çalışma Günü', id:'ic_son', type:'date' }, { l:'Notlar', id:'ic_not', type:'textarea' },
  ]},
  { id:4, cat:'ik', title:'Masraf Beyanı', icon:'💰', desc:'Personel masraf bildirimi', color:'#FEFCE8', fields:[
    { l:'Ad Soyad', id:'mb_ad' }, { l:'Departman', id:'mb_dep' },
    { l:'Dönem', id:'mb_donem', type:'select', opts:['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'] },
    { l:'Masraf Kalemi 1 — Açıklama', id:'mb_k1' }, { l:'Masraf Kalemi 1 — Tutar (₺)', id:'mb_t1', type:'number' },
    { l:'Masraf Kalemi 2 — Açıklama', id:'mb_k2' }, { l:'Masraf Kalemi 2 — Tutar (₺)', id:'mb_t2', type:'number' },
    { l:'Masraf Kalemi 3 — Açıklama', id:'mb_k3' }, { l:'Masraf Kalemi 3 — Tutar (₺)', id:'mb_t3', type:'number' },
    { l:'Toplam Tutar (₺)', id:'mb_toplam', type:'number' },
    { l:'Belge Türü', id:'mb_belge', type:'select', opts:['Fatura','Fiş','EFT/Havale Dekontu','Diğer'] }, { l:'Notlar', id:'mb_not', type:'textarea' },
  ]},
  { id:5, cat:'ik', title:'Disiplin Tutanağı', icon:'⚖️', desc:'Disiplin soruşturma ve uyarı belgesi', color:'#FFF7ED', fields:[
    { l:'Hakkında Tutulan Personel', id:'ds_per' }, { l:'Olayın Tarihi', id:'ds_tarih', type:'date' },
    { l:'Disiplin Türü', id:'ds_tur', type:'select', opts:['Sözlü Uyarı','Yazılı Uyarı','Ücret Kesintisi','Görevden Uzaklaştırma','İhraç'] },
    { l:'Olayın Açıklaması', id:'ds_olay', type:'textarea' }, { l:'Tanık(lar)', id:'ds_tanik' },
    { l:'Alınan Karar', id:'ds_karar', type:'textarea' }, { l:'Uygulanan Yaptırım', id:'ds_yaptirim' }, { l:'Düzenleyen Yönetici', id:'ds_yonetici' },
  ]},
  // ── Mali Formlar ─────────────────────────────────────────────
  { id:6, cat:'mali', title:'Banka Ödeme Talimatı', icon:'🏦', desc:'Havale / EFT ödeme talimatı', color:'#F0F9FF', fields:[
    { l:'Gönderen Firma/Şahıs', id:'bk_gndr' }, { l:'Alıcı Ad/Unvan', id:'bk_alc' }, { l:'Banka Adı', id:'bk_banka' },
    { l:'Şube', id:'bk_sube' }, { l:'IBAN', id:'bk_iban' }, { l:'Tutar (₺)', id:'bk_tutar', type:'number' },
    { l:'Para Birimi', id:'bk_pb', type:'select', opts:['TRY (₺)','USD ($)','EUR (€)','GBP (£)'] },
    { l:'Ödeme Tarihi', id:'bk_tarih', type:'date' }, { l:'Açıklama / Referans', id:'bk_ac' }, { l:'Yetkili İmza', id:'bk_imza' },
  ]},
  { id:7, cat:'mali', title:'Proforma Fatura', icon:'📑', desc:'Ön fatura / teklif belgesi', color:'#F0FDF4', fields:[
    { l:'Satıcı Firma', id:'pf_satici' }, { l:'Alıcı Firma', id:'pf_alici' },
    { l:'Fatura Tarihi', id:'pf_tarih', type:'date' }, { l:'Vade Tarihi', id:'pf_vade', type:'date' },
    { l:'Ürün/Hizmet Açıklaması', id:'pf_urun', type:'textarea' }, { l:'Miktar', id:'pf_miktar', type:'number' },
    { l:'Birim Fiyat (₺)', id:'pf_birim', type:'number' },
    { l:'KDV Oranı (%)', id:'pf_kdv', type:'select', opts:['0','1','8','18','20'] },
    { l:'Toplam (₺)', id:'pf_toplam', type:'number' },
    { l:'Ödeme Şekli', id:'pf_odeme', type:'select', opts:['Peşin','30 Gün','60 Gün','90 Gün'] }, { l:'Notlar', id:'pf_not', type:'textarea' },
  ]},
  { id:8, cat:'mali', title:'Avans Talebi', icon:'💳', desc:'Personel avans talep formu', color:'#FFF7ED', fields:[
    { l:'Ad Soyad', id:'av_ad' }, { l:'Departman', id:'av_dep' }, { l:'Talep Tarihi', id:'av_tarih', type:'date' },
    { l:'Talep Edilen Tutar (₺)', id:'av_tutar', type:'number' },
    { l:'Avans Amacı', id:'av_amac', type:'select', opts:['İş Seyahati','Malzeme Alımı','Acil Gider','Diğer'] },
    { l:'Geri Ödeme Tarihi', id:'av_geri', type:'date' }, { l:'Açıklama', id:'av_ac', type:'textarea' },
  ]},
  // ── Resmi/Hukuki Formlar ─────────────────────────────────────
  { id:9, cat:'resmi', title:'Resmi Dilekçe', icon:'📜', desc:'Genel resmi dilekçe şablonu', color:'#F5F3FF', fields:[
    { l:'Dilekçeyi Yazan', id:'dl_yazar' }, { l:'Başvuru Tarihi', id:'dl_tarih', type:'date' },
    { l:'Muhatap Kurum/Kişi', id:'dl_kurum' }, { l:'Muhatap Makam', id:'dl_makam' }, { l:'Konu', id:'dl_konu' },
    { l:'Dilekçe İçeriği', id:'dl_icerik', type:'textarea' }, { l:'İstek/Talep', id:'dl_talep', type:'textarea' },
    { l:'TC Kimlik No', id:'dl_tc' }, { l:'İletişim Bilgisi', id:'dl_ilet' },
  ]},
  { id:10, cat:'resmi', title:'Vekaletname Talebi', icon:'🤝', desc:'Noterlik vekaletname bilgi formu', color:'#EFF6FF', fields:[
    { l:'Vekalet Eden', id:'vk_eden' }, { l:'Vekalet Edilen', id:'vk_edilen' },
    { l:'Vekaletin Konusu', id:'vk_konu', type:'textarea' }, { l:'Geçerlilik Süresi', id:'vk_sure' },
    { l:'Noterde İşlem Tarihi', id:'vk_tarih', type:'date' }, { l:'Not', id:'vk_not', type:'textarea' },
  ]},
  // ── Operasyonel Formlar ──────────────────────────────────────
  { id:11, cat:'operasyon', title:'Toplantı Tutanağı', icon:'📋', desc:'Şirket içi toplantı tutanağı', color:'#F0FDF4', fields:[
    { l:'Toplantı Adı', id:'tt_ad' }, { l:'Tarih', id:'tt_tarih', type:'date' }, { l:'Saat', id:'tt_saat' },
    { l:'Yer / Platform', id:'tt_yer' }, { l:'Toplantı Yöneticisi', id:'tt_yonetici' },
    { l:'Katılımcılar', id:'tt_katil', type:'textarea' }, { l:'Gündem Maddeleri', id:'tt_gundem', type:'textarea' },
    { l:'Alınan Kararlar', id:'tt_karar', type:'textarea' }, { l:'Aksiyon Kalemleri', id:'tt_aksiyon', type:'textarea' },
    { l:'Bir Sonraki Toplantı', id:'tt_sonraki', type:'date' },
  ]},
  { id:12, cat:'operasyon', title:'Kargo Gönderim Formu', icon:'📦', desc:'Kargo etiket ve takip formu', color:'#FFF7ED', fields:[
    { l:'Gönderici Firma', id:'kg_gndr' }, { l:'Gönderici Adres', id:'kg_gadr' }, { l:'Alıcı Ad/Firma', id:'kg_alc' },
    { l:'Alıcı Adres', id:'kg_adr', type:'textarea' }, { l:'Alıcı Telefon', id:'kg_tel' },
    { l:'Kargo Firması', id:'kg_firma', type:'select', opts:['Yurtiçi Kargo','Aras Kargo','MNG Kargo','PTT Kargo','UPS','DHL','FedEx','Diğer'] },
    { l:'İçerik Açıklaması', id:'kg_icerik' }, { l:'Desi (kg)', id:'kg_desi', type:'number' }, { l:'Adet', id:'kg_adet', type:'number' }, { l:'Takip No', id:'kg_takip' },
  ]},
  { id:13, cat:'operasyon', title:'İş Talep Formu (IT)', icon:'💻', desc:'Bilgi işlem destek talebi', color:'#F0F9FF', fields:[
    { l:'Talep Eden', id:'it_talep' }, { l:'Departman', id:'it_dep' }, { l:'Talep Tarihi', id:'it_tarih', type:'date' },
    { l:'Talep Türü', id:'it_tur', type:'select', opts:['Donanım Sorunu','Yazılım Sorunu','Yeni Hesap/Erişim','Ağ Sorunu','Yazıcı Sorunu','Diğer'] },
    { l:'Öncelik', id:'it_onc', type:'select', opts:['Düşük','Normal','Yüksek','Acil'] },
    { l:'Sorun Açıklaması', id:'it_sorun', type:'textarea' }, { l:'Beklenen Çözüm', id:'it_cozum', type:'textarea' },
  ]},
  { id:14, cat:'operasyon', title:'Ziyaretçi Giriş Formu', icon:'🏢', desc:'Misafir / ziyaretçi kayıt belgesi', color:'#FEFCE8', fields:[
    { l:'Ziyaretçi Adı Soyadı', id:'zv_ad' }, { l:'Firması / Kurumu', id:'zv_firma' }, { l:'TC / Pasaport No', id:'zv_tc' },
    { l:'Ziyaret Tarihi', id:'zv_tarih', type:'date' }, { l:'Giriş Saati', id:'zv_giris' }, { l:'Çıkış Saati', id:'zv_cikis' },
    { l:'Ziyaret Edilen Kişi', id:'zv_kisi' }, { l:'Ziyaret Amacı', id:'zv_amac' }, { l:'Emanet Edilen Malzeme', id:'zv_emanet' },
  ]},
  { id:15, cat:'operasyon', title:'Araç Kullanım Formu', icon:'🚗', desc:'Şirket aracı kullanım kaydı', color:'#F0FDF4', fields:[
    { l:'Kullanan Personel', id:'ak_per' }, { l:'Araç Plakası', id:'ak_plaka' }, { l:'Kullanım Tarihi', id:'ak_tarih', type:'date' },
    { l:'Çıkış Saati', id:'ak_cikis' }, { l:'Dönüş Saati', id:'ak_donus' },
    { l:'Çıkış KM', id:'ak_ckm', type:'number' }, { l:'Dönüş KM', id:'ak_dkm', type:'number' },
    { l:'Gidilen Yer / Amaç', id:'ak_yer' },
    { l:'Yakıt Alındı mı', id:'ak_yakit', type:'select', opts:['Evet','Hayır'] }, { l:'Hasar / Durum Notu', id:'ak_hasar', type:'textarea' },
  ]},
];

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — PANEL INJECT
// ════════════════════════════════════════════════════════════════

function _injectFormlarPanel() {
  const p = _gfm('panel-formlar');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">📋 Kurumsal Formlar</div>
        <div class="phs">15 hazır şirket formu — İK, Mali, Resmi, Operasyon</div>
      </div>
      <span style="font-size:12px;color:var(--t2)">${FORMS_DATA.length} form</span>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap" id="forms-cat-chips">
      <button class="chip on" onclick="setFormsCat('all',this)">🗂 Tümü (${FORMS_DATA.length})</button>
      <button class="chip"    onclick="setFormsCat('ik',this)">👥 İK (5)</button>
      <button class="chip"    onclick="setFormsCat('mali',this)">💰 Mali (3)</button>
      <button class="chip"    onclick="setFormsCat('resmi',this)">📜 Resmi (2)</button>
      <button class="chip"    onclick="setFormsCat('operasyon',this)">🏢 Operasyon (5)</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px" id="form-grid"></div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — RENDER & FORM AÇMA
// ════════════════════════════════════════════════════════════════

function renderFormlar() {
  _injectFormlarPanel();
  const grid = _gfm('form-grid'); if (!grid) return;
  const fd = FORMS_CAT_FILTER === 'all' ? FORMS_DATA : FORMS_DATA.filter(f => f.cat === FORMS_CAT_FILTER);

  const frag = document.createDocumentFragment();
  fd.forEach(f => {
    const card = document.createElement('div');
    card.style.cssText = `background:${f.color||'var(--sf)'};border:1.5px solid rgba(0,0,0,.06);border-radius:14px;padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden`;
    card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; };
    card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };
    card.onclick = () => openForm(f.id);
    card.innerHTML = `
      <div style="font-size:30px;margin-bottom:10px">${f.icon}</div>
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1D1D1F">${f.title}</div>
      <div style="font-size:12px;color:#6B7280;margin-bottom:16px;line-height:1.4">${f.desc}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">${{ik:'İK',mali:'Mali',resmi:'Resmi',operasyon:'Operasyon'}[f.cat]||f.cat}</span>
        <span style="background:#007AFF;color:#fff;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:600">Doldur →</span>
      </div>`;
    frag.appendChild(card);
  });
  grid.replaceChildren(frag);
}

function setFormsCat(cat, btn) {
  FORMS_CAT_FILTER = cat;
  document.querySelectorAll('#forms-cat-chips .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderFormlar();
}

function openForm(id) {
  ACTIVE_FORM = FORMS_DATA.find(f => f.id === id);
  if (!ACTIVE_FORM) return;

  // Varsa eski modalı kaldır
  const existing = _gfm('mo-form'); if (existing) existing.remove();

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-form';

  const fields = ACTIVE_FORM.fields.map(f => {
    let inp = '';
    if      (f.type === 'textarea') inp = `<textarea class="fi" id="${f.id}" rows="3" style="resize:vertical" placeholder="…"></textarea>`;
    else if (f.type === 'date')     inp = `<input type="date" class="fi" id="${f.id}">`;
    else if (f.type === 'number')   inp = `<input type="number" class="fi" id="${f.id}" placeholder="0">`;
    else if (f.type === 'select')   inp = `<select class="fi" id="${f.id}">${(f.opts||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
    else inp = `<input class="fi" id="${f.id}" placeholder="…">`;
    return `<div class="fg"><label class="fl">${f.l}${f.required?'<span style="color:var(--rd)"> *</span>':''}</label>${inp}</div>`;
  }).join('');

  mo.innerHTML = `
    <div style="background:var(--sf);border-radius:16px;max-width:640px;width:96vw;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.2)">
      <div style="background:${ACTIVE_FORM.color||'#F2F2F7'};padding:24px 28px 20px;border-bottom:1px solid rgba(0,0,0,.06);flex-shrink:0">
        <div style="font-size:32px;margin-bottom:6px">${ACTIVE_FORM.icon}</div>
        <div style="font-size:18px;font-weight:700;color:#1D1D1F">${ACTIVE_FORM.title}</div>
        <div style="font-size:13px;color:#6B7280;margin-top:3px">${ACTIVE_FORM.desc}</div>
      </div>
      <div style="padding:20px 28px;overflow-y:auto;flex:1">${fields}</div>
      <div style="padding:16px 28px 20px;border-top:1px solid rgba(0,0,0,.06);display:flex;gap:8px;justify-content:flex-end;background:var(--sf);flex-shrink:0">
        <button class="btn" onclick="this.closest('.mo').classList.remove('open')">İptal</button>
        <button class="btn btns" onclick="printForm()">🖨️ Yazdır</button>
        <button class="btn btnp" onclick="saveFormRecord()">✓ Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(mo);
  mo.classList.add('open');
  mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });

  // Ad ve tarih alanlarını otomatik doldur
  const cu = _CUfm();
  const adField = ACTIVE_FORM.fields.find(f => f.id.endsWith('_ad'));
  if (adField) { const el = _gfm(adField.id); if (el) el.value = cu?.name || ''; }
  const trField = ACTIVE_FORM.fields.find(f => f.id.endsWith('_tarih'));
  if (trField) { const el = _gfm(trField.id); if (el) el.valueAsDate = new Date(); }
}

function printForm() {
  if (!ACTIVE_FORM) return;
  const values = ACTIVE_FORM.fields.map(f => { const el = _gfm(f.id); return { label: f.l, value: el ? el.value : '—' }; });
  const cu = _CUfm();
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) { window.toast?.('Popup engellendi', 'err'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>${ACTIVE_FORM.title}</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:40px;max-width:620px;margin:0 auto;color:#1D1D1F;font-size:13px}
    h1{font-size:20px;text-align:center;margin-bottom:4px;font-weight:700}
    .sub{text-align:center;color:#6B7280;font-size:12px;margin-bottom:28px}
    table{width:100%;border-collapse:collapse;margin-bottom:32px}
    th{background:#F2F2F7;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;border:1px solid #E5E7EB}
    td{padding:10px 14px;border:1px solid #E5E7EB;vertical-align:top}
    .lbl{background:#F9FAFB;font-weight:600;width:35%;color:#374151}
    .val{color:#1D1D1F}
    .footer{display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:16px}
    .sig{margin-top:40px;display:flex;justify-content:space-between}
    .sig-box{text-align:center;width:180px;border-top:1px solid #374151;padding-top:8px;font-size:11px;color:#6B7280}
  </style></head><body>
    <h1>${ACTIVE_FORM.icon} ${ACTIVE_FORM.title}</h1>
    <div class="sub">${ACTIVE_FORM.desc}</div>
    <table><thead><tr><th>Alan</th><th>Değer</th></tr></thead>
    <tbody>${values.map(v=>`<tr><td class="lbl">${v.label}</td><td class="val">${v.value||'—'}</td></tr>`).join('')}</tbody></table>
    <div class="sig">
      <div class="sig-box">Hazırlayan: ${cu?.name||'—'}<br><br></div>
      <div class="sig-box">Onaylayan<br><br></div>
    </div>
    <div class="footer">
      <span>Operasyon Platformu v8.0.0</span>
      <span>Tarih: ${new Date().toLocaleDateString('tr-TR')}</span>
      <span>Oluşturan: ${cu?.name||'—'}</span>
    </div>
  <script>window.print();<\/script></body></html>`);
  window.logActivity?.('view', `"${ACTIVE_FORM.title}" formunu yazdırdı`);
}

function saveFormRecord() {
  if (!ACTIVE_FORM) return;
  const values = ACTIVE_FORM.fields.map(f => { const el = _gfm(f.id); return { label: f.l, value: el ? el.value : '—' }; });
  const cu = _CUfm();
  const recs = JSON.parse((()=>{try{return JSON.parse(localStorage.getItem('ak_form_recs'))||[];}catch{return [];}})() || '[]');
  recs.unshift({ id: generateNumericId(), formId: ACTIVE_FORM.id, formTitle: ACTIVE_FORM.title, uid: cu?.id, uname: cu?.name, ts: window.DB?.nowTs?.() || new Date().toISOString().slice(0,19).replace('T',' '), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false, yukleyen_id: cu?.id || null, values });
  /* LS-SYNC-006: 90 gün TTL (mevcut 500 FIFO korundu) */
  try {
    const _ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const filtered = recs.filter(r => {
      try {
        const t = new Date(String(r.createdAt || r.ts || '').replace(' ', 'T')).getTime();
        return isNaN(t) || t >= _ninetyDaysAgo;
      } catch(_e) { return true; }
    });
    localStorage.setItem('ak_form_recs', JSON.stringify(filtered.slice(0, 500)));
  } catch(_ae) {
    localStorage.setItem('ak_form_recs', JSON.stringify(recs.slice(0, 500)));
  }
  window.toast?.(ACTIVE_FORM.title + ' kaydedildi ✓', 'ok');
  window.logActivity?.('view', `"${ACTIVE_FORM.title}" formunu doldurdu`);
  const mo = _gfm('mo-form'); if (mo) mo.classList.remove('open');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Formlar = { render: renderFormlar, openForm, printForm, saveRecord: saveFormRecord, setFilter: setFormsCat, FORMS_DATA };

if (typeof module !== 'undefined' && module.exports) { module.exports = Formlar; }
else {
  window.Formlar         = Formlar;
  window.renderFormlar   = renderFormlar;
  window.openForm        = openForm;
  window.printForm       = printForm;
  window.saveFormRecord  = saveFormRecord;
  window.setFormsCat     = setFormsCat;
  window.FORMS_DATA      = FORMS_DATA;
}
