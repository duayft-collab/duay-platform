/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-modal-payment.js — V170.3.12 POPULATE (FIX)
   Sorumluluk: Ödeme + Abonelik modal sistemi
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-MODAL-PAYMENT-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       _ppOdemeYeniAc        L2846-2849  Yeni ödeme trampoline
       _ppOdemeSil           L2851-2857  Silme onay + tombstone
       _ppOdmFld (helper)    L2920-2926  Form field HTML helper (file-scope)
       _ppOdmSel (helper)    L2927-2931  Select field HTML helper (file-scope)
       _ppOdemeModalAc       L2933-3112  Birleşik modal (180 satır, EN BÜYÜK)
       _ppOdemeTipSec        L3121-3149
       _ppOdemeYapiSec       L3152-3161
       _ppOdemeYillikHesap   L3164-3179
       _ppOdemeVadeOnizle    L3182-3191
       _ppOdemeModalKaydet   L3194-3291
       _ppOdemeModalKapat    L3294-3300
       _ppAbonelikModalAc    L3303-3305  Trampoline
       _ppAbonelikYeniAc     L3306-3308  Trampoline
       _ppAbonelikSil        L3478-3484  Silme onay
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.modalPayment (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok
   ⚠ FIX NOTU: İlk POPULATE'da _ppOdmFld + _ppOdmSel helper'ları eksikti
              Runtime test (Test6) "_ppOdmFld is not defined" yakaladı → eklendi
   ⚠ Helper'lar IIFE içinde file-scope → _ppOdemeModalAc bare reference ile çağırır
   ⚠ Bağımlılık: store, core, _ppModRender, confirmModal, toast
   ⚠ Tip mapping: kira/fatura/egitim/servis/sigorta/kredi (PP-MODAL-CONDITIONAL)
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.modalPayment) window.PusulaPro.modalPayment = {};
  if (window._ppModalPaymentLoaded) return;
  window._ppModalPaymentLoaded = true;

window._ppOdemeYeniAc = function() {
  // PP-MODAL-MERGE-001: prompt() yerine birleşik modal, default tip 'fatura'
  return window._ppOdemeModalAc(null, 'fatura');
};

window._ppOdemeSil = function(id) {
  window.confirmModal('Bu \u00f6demeyi silmek istedi\u011finizden emin misiniz?',{confirmText:'Sil',danger:true,onConfirm:function(){
  var liste=_ppOdemeLoad(); var i=liste.findIndex(function(x){return x.id===id;}); if(i===-1) return;
  liste[i].isDeleted=true; liste[i].deletedAt=_ppNow(); _ppOdemeStore(liste);
  window.toast?.('\u00d6deme silindi','ok'); window._ppModRender();
  }});
};
function _ppOdmFld(id, lbl, ph, val, tip) {
  var esc = window._ppEsc || function(s){ return String(s||'').replace(/[<>&"']/g, function(m){ return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[m]; }); };
  return '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
       + '<input id="' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" value="' + esc(val||'') + '" '
       + (id === 'ppodm-tutar' ? 'oninput="window._ppOdemeYillikHesap()" ' : '')
       + 'style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
}
function _ppOdmSel(id, lbl, opts, sel) {
  var optHtml = opts.map(function(o) { return '<option value="' + o + '"' + (o === sel ? ' selected' : '') + '>' + o + '</option>'; }).join('');
  return '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
       + '<select id="' + id + '"' + ((id === 'ppodm-periyot' || id === 'ppodm-para') ? ' onchange="window._ppOdemeYillikHesap()"' : '') + ' style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">' + optHtml + '</select></div>';
}

window._ppOdemeModalAc = function(id, defaultTip) {
  // Edit ise mevcut kayıttan tipi çek (tip değişimini engelle, kayıt iki LS'den birinde)
  var mevcut = null;
  if (id) {
    var aboneList = (typeof _ppAbonelikLoad === 'function') ? _ppAbonelikLoad() : [];
    var odmList = (typeof _ppOdemeLoad === 'function') ? _ppOdemeLoad() : [];
    mevcut = aboneList.find(function(x){ return x.id === id && !x.isDeleted; }) || odmList.find(function(x){ return x.id === id && !x.isDeleted; });
  }
  var v = mevcut || {
    id: '', baslik: '', tip: (defaultTip || 'abonelik'),
    saglayici: '', plan: '', faydalanan: '',
    kategori: 'SaaS', onem: 'onemli',
    tutarYapisi: 'sabit', tutar: '', para: 'USD',
    periyot: 'Aylik', odemeYontemi: 'kart', bankaTag: '',
    hatirlatmaGun: 14, yenileme: '', etiketler: '', not: ''
  };
  if (mevcut && !v.tip) v.tip = (id.indexOf('AB-') === 0) ? 'abonelik' : 'fatura';
  var isEdit = !!id;

  document.getElementById('ppodm-form-modal')?.remove();
  var modal = document.createElement('div');
  modal.id = 'ppodm-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto';
  modal.onclick = function(e) { if (e.target === modal) window._ppOdemeModalKapat(); };

  // ESC handler — modal kapanınca temizle
  window._ppOdmModalEscHandler = function(e) { if (e.key === 'Escape') window._ppOdemeModalKapat(); };
  document.addEventListener('keydown', window._ppOdmModalEscHandler);

  var esc = window._ppEsc || function(s){ return String(s||'').replace(/[<>&"']/g, function(m){ return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[m]; }); };
  var baslikUstu = isEdit ? 'Düzenle: ' + esc(v.baslik) : 'Yeni Ödeme';
  var saveTxt = isEdit ? 'Güncelle' : 'Kaydet';

  // 8 tip chip data
  var tipler = [
    { tip: 'abonelik', label: 'Abonelik' },
    { tip: 'fatura',   label: 'Fatura' },
    { tip: 'egitim',   label: 'Eğitim' },
    { tip: 'servis',   label: 'Servis' },
    { tip: 'kira',     label: 'Kira' },
    { tip: 'sigorta',  label: 'Sigorta' },
    { tip: 'kredi',    label: 'Kredi' },
    { tip: 'diger',    label: 'Diğer' }
  ];
  var chipBtnStyleNormal = 'padding:8px 4px;border:1.5px solid var(--b);border-radius:6px;background:var(--s2);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:400;color:var(--t2);transition:all .15s';
  var chipBtnStyleActive = 'padding:8px 4px;border:1.5px solid var(--t);border-radius:6px;background:var(--sf);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:600;color:var(--t);transition:all .15s';
  var chipDisabledExtra = isEdit ? ';opacity:.6;cursor:not-allowed;pointer-events:none' : '';
  var chipsHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
  tipler.forEach(function(t) {
    var aktif = (v.tip === t.tip);
    var stil = (aktif ? chipBtnStyleActive : chipBtnStyleNormal) + (isEdit && !aktif ? chipDisabledExtra : '');
    chipsHtml += '<button class="ppodm-tip-chip" data-tip="' + t.tip + '" '
              + (isEdit ? '' : 'onclick="event.stopPropagation();window._ppOdemeTipSec(\'' + t.tip + '\')" ')
              + 'style="' + stil + '">' + t.label + '</button>';
  });
  chipsHtml += '</div>';

  // Tutar yapısı 2 chip
  var yapiStilNormal = 'padding:5px 12px;border:1px solid var(--b);border-radius:4px;background:var(--s2);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);color:var(--t2)';
  var yapiStilActive = 'padding:5px 12px;border:1px solid var(--t);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:600;color:var(--t)';
  var yapiHtml = '<div style="display:flex;gap:6px;align-items:center">'
    + '<button class="ppodm-yapi-chip" data-yapi="sabit" onclick="event.stopPropagation();window._ppOdemeYapiSec(\'sabit\')" style="' + (v.tutarYapisi === 'sabit' ? yapiStilActive : yapiStilNormal) + '">Sabit</button>'
    + '<button class="ppodm-yapi-chip" data-yapi="degisken" onclick="event.stopPropagation();window._ppOdemeYapiSec(\'degisken\')" style="' + (v.tutarYapisi === 'degisken' ? yapiStilActive : yapiStilNormal) + '">Değişken</button>'
    + '<input type="hidden" id="ppodm-tutarYapisi" value="' + esc(v.tutarYapisi || 'sabit') + '">'
    + '</div>';

  var ic = '<div style="background:var(--sf);border-radius:var(--pp-r-md);border:0.5px solid var(--b);width:600px;max-height:90vh;overflow-y:auto;margin:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  ic += '<div style="font-size:14px;font-weight:500;color:var(--t)">' + baslikUstu + '</div>';
  ic += '<button onclick="event.stopPropagation();window._ppOdemeModalKapat()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>';
  ic += '</div>';
  ic += '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += '<input type="hidden" id="ppodm-id" value="' + esc(v.id || '') + '">';
  ic += '<input type="hidden" id="ppodm-tip" value="' + esc(v.tip) + '">';
  ic += '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:6px">TİP' + (isEdit ? ' (düzenleme sırasında değiştirilemez)' : '') + '</div>' + chipsHtml + '</div>';
  ic += _ppOdmFld('ppodm-baslik', 'BAŞLIK *', 'Google Workspace, Elektrik, Sigorta...', v.baslik);
  ic += '<div id="ppodm-abonelik-fields" style="display:' + (v.tip === 'abonelik' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-saglayici', 'SAĞLAYICI', 'Google, Anthropic...', v.saglayici);
  ic += _ppOdmFld('ppodm-plan', 'PLAN', 'Pro, Team, Enterprise', v.plan);
  ic += _ppOdmFld('ppodm-faydalanan', 'FAYDALANAN', 'Tüm ekip, Baran...', v.faydalanan);
  ic += '</div></div>';
  /* PP-MODAL-CONDITIONAL-001: kira tipine özel alanlar */
  ic += '<div id="ppodm-kira-fields" style="display:' + (v.tip === 'kira' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-kira-adres', 'MÜLK ADRESİ', 'Sokak/Daire bilgisi', v.kiraAdres);
  ic += _ppOdmFld('ppodm-kira-depozito', 'DEPOZİTO', '0.00', v.kiraDepozito, 'number');
  ic += '</div>';
  ic += _ppOdmFld('ppodm-kira-kontratbitis', 'KONTRAT BİTİŞ', '', v.kiraKontratBitis, 'date');
  ic += '</div>';
  /* PP-MODAL-CONDITIONAL-001: fatura tipine özel alanlar */
  ic += '<div id="ppodm-fatura-fields" style="display:' + (v.tip === 'fatura' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-fatura-no', 'FATURA NO', 'F-2026-00123', v.faturaNo);
  ic += _ppOdmFld('ppodm-fatura-donem', 'DÖNEM', 'Mart 2026', v.faturaDonem);
  ic += '</div>';
  ic += _ppOdmFld('ppodm-fatura-kurum', 'KURUM/ŞİRKET', 'BEDAŞ, Türk Telekom...', v.faturaKurum);
  ic += '</div>';
  /* PP-MODAL-CONDITIONAL-002: egitim tipine özel alanlar */
  ic += '<div id="ppodm-egitim-fields" style="display:' + (v.tip === 'egitim' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-egitim-kurum', 'EĞİTİM KURUMU', 'ABC Akademi, Coursera...', v.egitimKurum);
  ic += _ppOdmFld('ppodm-egitim-katilimci', 'KATILIMCI', 'Baran A., Tüm ekip', v.egitimKatilimci);
  ic += '</div>';
  ic += _ppOdmSel('ppodm-egitim-sertifika', 'SERTİFİKA TİPİ', ['online','sınıf','hibrit','sertifikasız'], v.egitimSertifika || 'online');
  ic += '</div>';
  /* PP-MODAL-CONDITIONAL-002: servis tipine özel alanlar */
  ic += '<div id="ppodm-servis-fields" style="display:' + (v.tip === 'servis' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-servis-ad', 'SERVİS ADI', 'Bakım, Danışmanlık...', v.servisAd);
  ic += _ppOdmFld('ppodm-servis-sorumlu', 'SORUMLU', 'Sorumlu kişi/ekip', v.servisSorumlu);
  ic += '</div>';
  ic += _ppOdmFld('ppodm-servis-kontrolgun', 'KONTROL GÜNÜ', 'Pazartesi, Her ayın 1.', v.servisKontrolGun);
  ic += '</div>';
  /* PP-MODAL-CONDITIONAL-002: sigorta tipine özel alanlar */
  ic += '<div id="ppodm-sigorta-fields" style="display:' + (v.tip === 'sigorta' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-sigorta-police', 'POLİÇE NO', 'Z-2026-12345', v.sigortaPolice);
  ic += _ppOdmSel('ppodm-sigorta-tipi', 'SİGORTA TİPİ', ['kasko','dask','saglik','konut','isyeri','diger'], v.sigortaTipi || 'kasko');
  ic += '</div>';
  ic += _ppOdmFld('ppodm-sigorta-sirket', 'SİGORTA ŞİRKETİ', 'Anadolu, Aksigorta...', v.sigortaSirket);
  ic += '</div>';
  /* PP-MODAL-CONDITIONAL-003: kredi tipine özel alanlar */
  ic += '<div id="ppodm-kredi-fields" style="display:' + (v.tip === 'kredi' ? 'block' : 'none') + ';flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-kredi-banka', 'BANKA / KURUM', 'Garanti, Akbank...', v.krediBanka);
  ic += _ppOdmFld('ppodm-kredi-kalantaksit', 'KALAN TAKSİT', '0', v.krediKalanTaksit, 'number');
  ic += _ppOdmFld('ppodm-kredi-faiz', 'FAİZ ORANI (%)', '0.00', v.krediFaiz, 'number');
  ic += '</div></div>';
  ic += '<div id="ppodm-other-placeholder" style="display:' + ((['abonelik','kira','fatura','egitim','servis','sigorta','kredi'].indexOf(v.tip) >= 0) ? 'none' : 'block') + ';padding:10px 12px;background:var(--s2);border:0.5px dashed var(--b);border-radius:5px;font-size:var(--pp-meta);color:var(--t3)">ⓘ Bu tipte özel alan yok, ortak bilgiler yeterli</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmSel('ppodm-kategori', 'KATEGORİ', ['SaaS','Altyapı','Lisans','Hizmet','Vergi','Diğer'], v.kategori || 'SaaS');
  ic += _ppOdmSel('ppodm-onem', 'ÖNEM', ['kritik','onemli','opsiyonel'], v.onem || 'onemli');
  ic += '</div>';
  ic += '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TUTAR YAPISI</div>' + yapiHtml + '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmFld('ppodm-tutar', 'TUTAR', '0.00', v.tutar, 'number');
  ic += _ppOdmSel('ppodm-para', 'PARA', ['TRY','USD','EUR','GBP'], v.para || 'USD');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmSel('ppodm-periyot', 'PERİYOT', ['Aylik','Yillik','Haftalik','3 Ayda 1','6 Ayda 1'], v.periyot || 'Aylik');
  ic += _ppOdmFld('ppodm-hatirlatmaGun', 'HATIRLATMA (gün)', '14', String(v.hatirlatmaGun || 14), 'number');
  ic += '</div>';
  ic += '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">YENİLEME / VADE TARİHİ</div>';
  ic += '<div style="display:flex;gap:8px;align-items:center">';
  ic += '<input id="ppodm-yenileme" type="date" value="' + esc(v.yenileme || '') + '" oninput="window._ppOdemeVadeOnizle()" style="flex:1;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">';
  ic += '<span id="ppodm-vade-onizle" style="font-size:var(--pp-meta);padding:4px 8px;border-radius:3px;font-weight:500"></span>';
  ic += '</div></div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _ppOdmSel('ppodm-odemeYontemi', 'ÖDEME YÖNTEMİ', ['otomatik','kart','eft','nakit'], v.odemeYontemi || 'kart');
  ic += _ppOdmFld('ppodm-bankaTag', 'BANKA / KART', 'Garanti Bonus, Akbank...', v.bankaTag);
  ic += '</div>';
  ic += _ppOdmFld('ppodm-etiketler', 'ETİKETLER (virgülle ayır)', 'kira, sigorta, ev', v.etiketler);
  ic += '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);margin-bottom:4px">NOT</div>';
  ic += '<textarea id="ppodm-not" rows="2" placeholder="Opsiyonel" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box;resize:vertical">' + esc(v.not || '') + '</textarea></div>';
  ic += '<div style="background:var(--s2);border:0.5px dashed var(--b);border-radius:5px;padding:12px;text-align:center">';
  ic += '<div style="font-size:var(--pp-meta);color:var(--t3)">⊕ Ek dosya alanı</div>';
  ic += '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:4px">PP-EK-001 ile yarın aktif olacak</div>';
  ic += '</div>';
  ic += '</div>';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  ic += '<div style="display:flex;flex-direction:column;gap:2px">';
  ic += '<div style="font-size:var(--pp-meta);color:var(--t3)">* Başlık zorunlu</div>';
  ic += '<div id="ppodm-yillik" style="font-size:var(--pp-meta);color:var(--t2);font-weight:500"></div>';
  ic += '</div>';
  ic += '<div style="display:flex;gap:8px">';
  if (isEdit) ic += '<button onclick="event.stopPropagation();window._ppOdemeModalKapat();window._ppOdmSilDelegate(\'' + esc(v.id) + '\', \'' + esc(v.tip) + '\')" style="font-size:var(--pp-body);padding:7px 14px;border:0.5px solid #DC2626;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#DC2626">Sil</button>';
  ic += '<button onclick="event.stopPropagation();window._ppOdemeModalKapat()" style="font-size:var(--pp-body);padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._ppOdemeModalKaydet()" style="font-size:var(--pp-body);padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">' + saveTxt + '</button>';
  ic += '</div></div></div>';

  /* XSS-RISK: _ppEsc() zorunlu — kullanici verisi esc() ile gecirildi */
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  setTimeout(function() {
    document.getElementById('ppodm-baslik')?.focus();
    window._ppOdemeVadeOnizle();
    window._ppOdemeYillikHesap();
  }, 100);
};
window._ppOdemeTipSec = function(tip) {
  var hidden = document.getElementById('ppodm-tip');
  if (hidden) hidden.value = tip;
  document.querySelectorAll('.ppodm-tip-chip').forEach(function(btn) {
    var aktif = (btn.dataset.tip === tip);
    btn.style.cssText = aktif
      ? 'padding:8px 4px;border:1.5px solid var(--t);border-radius:6px;background:var(--sf);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:600;color:var(--t);transition:all .15s'
      : 'padding:8px 4px;border:1.5px solid var(--b);border-radius:6px;background:var(--s2);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:400;color:var(--t2);transition:all .15s';
  });
  /* PP-MODAL-CONDITIONAL-001: tip-spesifik field toggle (abonelik/kira/fatura) */
  var aboneFields = document.getElementById('ppodm-abonelik-fields');
  var kiraFields = document.getElementById('ppodm-kira-fields');
  var faturaFields = document.getElementById('ppodm-fatura-fields');
  var otherPh = document.getElementById('ppodm-other-placeholder');
  if (aboneFields) aboneFields.style.display = (tip === 'abonelik') ? 'block' : 'none';
  if (kiraFields) kiraFields.style.display = (tip === 'kira') ? 'block' : 'none';
  if (faturaFields) faturaFields.style.display = (tip === 'fatura') ? 'block' : 'none';
  /* PP-MODAL-CONDITIONAL-002: egitim/servis/sigorta toggle */
  var egitimFields = document.getElementById('ppodm-egitim-fields');
  var servisFields = document.getElementById('ppodm-servis-fields');
  var sigortaFields = document.getElementById('ppodm-sigorta-fields');
  if (egitimFields) egitimFields.style.display = (tip === 'egitim') ? 'block' : 'none';
  if (servisFields) servisFields.style.display = (tip === 'servis') ? 'block' : 'none';
  if (sigortaFields) sigortaFields.style.display = (tip === 'sigorta') ? 'block' : 'none';
  /* PP-MODAL-CONDITIONAL-003: kredi toggle */
  var krediFields = document.getElementById('ppodm-kredi-fields');
  if (krediFields) krediFields.style.display = (tip === 'kredi') ? 'block' : 'none';
  if (otherPh) otherPh.style.display = ((['abonelik','kira','fatura','egitim','servis','sigorta','kredi'].indexOf(tip) >= 0) ? 'none' : 'block');
};

// Tutar yapısı seç (chip click handler)
window._ppOdemeYapiSec = function(yapi) {
  var hidden = document.getElementById('ppodm-tutarYapisi');
  if (hidden) hidden.value = yapi;
  document.querySelectorAll('.ppodm-yapi-chip').forEach(function(btn) {
    var aktif = (btn.dataset.yapi === yapi);
    btn.style.cssText = aktif
      ? 'padding:5px 12px;border:1px solid var(--t);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);font-weight:600;color:var(--t)'
      : 'padding:5px 12px;border:1px solid var(--b);border-radius:4px;background:var(--s2);cursor:pointer;font-family:inherit;font-size:var(--pp-meta);color:var(--t2)';
  });
};
window._ppOdemeYillikHesap = function() {
  var tutar = parseFloat(document.getElementById('ppodm-tutar')?.value) || 0;
  var periyot = document.getElementById('ppodm-periyot')?.value || 'Aylik';
  var para = document.getElementById('ppodm-para')?.value || 'USD';
  var katsayi = ({ 'Aylik':12, 'Yillik':1, 'Haftalik':52, '3 Ayda 1':4, '6 Ayda 1':2 })[periyot] || 1;
  var yillik = tutar * katsayi;
  var SEMBOL = { USD:'$', EUR:'€', TRY:'₺', GBP:'£' };
  var span = document.getElementById('ppodm-yillik');
  if (!span) return;
  if (yillik > 0) {
    var fmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
    span.textContent = 'Yıllık ~' + (SEMBOL[para] || '') + fmt.format(yillik) + ' ' + para;
  } else {
    span.textContent = '';
  }
};

// Vade renk önizleme (yenileme oninput)
window._ppOdemeVadeOnizle = function() {
  var yenileme = document.getElementById('ppodm-yenileme')?.value || '';
  var rd = window._ppVadeRenkHesapla(yenileme);
  var span = document.getElementById('ppodm-vade-onizle');
  if (span) {
    span.textContent = rd.label;
    span.style.background = rd.bg;
    span.style.color = rd.renk;
  }
};
window._ppOdemeModalKaydet = function() {
  var g = function(id) { return (document.getElementById(id)?.value || '').trim(); };
  var baslik = g('ppodm-baslik');
  if (!baslik) { window.toast?.('Başlık zorunlu', 'err'); return; }
  var id = g('ppodm-id');
  var tip = g('ppodm-tip') || 'abonelik';

  // Edit modunda tip mevcut kayıttan zorla okun (UI bypass koruma)
  if (id) {
    var aboneList = (typeof _ppAbonelikLoad === 'function') ? _ppAbonelikLoad() : [];
    var odmList = (typeof _ppOdemeLoad === 'function') ? _ppOdemeLoad() : [];
    var existing = aboneList.find(function(x){ return x.id === id; }) || odmList.find(function(x){ return x.id === id; });
    if (existing && existing.tip) tip = existing.tip;
    else if (existing) tip = (id.indexOf('AB-') === 0) ? 'abonelik' : 'fatura';
  }

  var entry = {
    tip: tip,
    baslik: baslik,
    saglayici: g('ppodm-saglayici'),
    plan: g('ppodm-plan'),
    faydalanan: g('ppodm-faydalanan'),
    /* PP-MODAL-CONDITIONAL-001: kira tipine özel field'lar */
    kiraAdres: g('ppodm-kira-adres'),
    kiraDepozito: g('ppodm-kira-depozito'),
    kiraKontratBitis: g('ppodm-kira-kontratbitis'),
    /* PP-MODAL-CONDITIONAL-001: fatura tipine özel field'lar */
    faturaNo: g('ppodm-fatura-no'),
    faturaDonem: g('ppodm-fatura-donem'),
    faturaKurum: g('ppodm-fatura-kurum'),
    /* PP-MODAL-CONDITIONAL-002: egitim tipine özel field'lar */
    egitimKurum: g('ppodm-egitim-kurum'),
    egitimKatilimci: g('ppodm-egitim-katilimci'),
    egitimSertifika: g('ppodm-egitim-sertifika') || 'online',
    /* PP-MODAL-CONDITIONAL-002: servis tipine özel field'lar */
    servisAd: g('ppodm-servis-ad'),
    servisSorumlu: g('ppodm-servis-sorumlu'),
    servisKontrolGun: g('ppodm-servis-kontrolgun'),
    /* PP-MODAL-CONDITIONAL-002: sigorta tipine özel field'lar */
    sigortaPolice: g('ppodm-sigorta-police'),
    sigortaTipi: g('ppodm-sigorta-tipi') || 'kasko',
    sigortaSirket: g('ppodm-sigorta-sirket'),
    /* PP-MODAL-CONDITIONAL-003: kredi tipine özel field'lar */
    krediBanka: g('ppodm-kredi-banka'),
    krediKalanTaksit: parseFloat(g('ppodm-kredi-kalantaksit')) || 0,
    krediFaiz: parseFloat(g('ppodm-kredi-faiz')) || 0,
    kategori: g('ppodm-kategori') || 'SaaS',
    onem: g('ppodm-onem') || 'onemli',
    tutarYapisi: g('ppodm-tutarYapisi') || 'sabit',
    tutar: g('ppodm-tutar'),
    para: g('ppodm-para') || 'USD',
    periyot: g('ppodm-periyot') || 'Aylik',
    odemeYontemi: g('ppodm-odemeYontemi') || 'kart',
    bankaTag: g('ppodm-bankaTag'),
    hatirlatmaGun: parseInt(g('ppodm-hatirlatmaGun')) || 14,
    yenileme: g('ppodm-yenileme'),
    etiketler: g('ppodm-etiketler'),
    not: g('ppodm-not'),
    durum: 'active'
  };

  if (tip === 'abonelik') {
    var liste = _ppAbonelikLoad();
    if (id) {
      var i = liste.findIndex(function(x){ return x.id === id; });
      if (i === -1) { window.toast?.('Kayıt bulunamadı', 'err'); return; }
      Object.assign(liste[i], entry, { updatedAt: _ppNow() });
      window.toast?.('Abonelik güncellendi', 'ok');
    } else {
      entry.id = 'AB-' + Date.now();
      entry.createdAt = _ppNow();
      liste.unshift(entry);
      window.toast?.('Abonelik eklendi', 'ok');
    }
    _ppAbonelikStore(liste);
  } else {
    var liste2 = _ppOdemeLoad();
    if (id) {
      var i2 = liste2.findIndex(function(x){ return x.id === id; });
      if (i2 === -1) { window.toast?.('Kayıt bulunamadı', 'err'); return; }
      Object.assign(liste2[i2], entry, { updatedAt: _ppNow() });
      window.toast?.('Ödeme güncellendi', 'ok');
    } else {
      entry.id = 'OD-' + Date.now();
      entry.createdAt = _ppNow();
      // Mevcut _ppOdeme şeması ile uyumlu defaults
      entry.sorumlu = '';
      entry.oncelik = 'Normal';
      entry.periyotDetay = '';
      liste2.unshift(entry);
      window.toast?.('Ödeme eklendi', 'ok');
    }
    _ppOdemeStore(liste2);
  }

  window._ppOdemeModalKapat();
  window._ppModRender();
};

// Modal kapat (ESC + cleanup)
window._ppOdemeModalKapat = function() {
  document.getElementById('ppodm-form-modal')?.remove();
  if (window._ppOdmModalEscHandler) {
    document.removeEventListener('keydown', window._ppOdmModalEscHandler);
    window._ppOdmModalEscHandler = null;
  }
};
window._ppAbonelikModalAc = function(id) {
  return window._ppOdemeModalAc(id, 'abonelik');
};
window._ppAbonelikYeniAc = function() {
  return window._ppOdemeModalAc(null, 'abonelik');
};
window._ppAbonelikSil = function(id) {
  window.confirmModal('Bu aboneli\u011fi silmek istedi\u011finizden emin misiniz?',{confirmText:'Sil',danger:true,onConfirm:function(){
  var liste=_ppAbonelikLoad(); var i=liste.findIndex(function(x){return x.id===id;}); if(i===-1) return;
  liste[i].isDeleted=true; liste[i].deletedAt=_ppNow(); _ppAbonelikStore(liste);
  window.toast?.('Abonelik silindi','ok'); window._ppModRender();
  }});
};

  /* ── V170.3.12 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppOdemeModalAc) {
    Object.assign(window, {
      _ppOdemeYeniAc: window._ppOdemeYeniAc,
      _ppOdemeSil: window._ppOdemeSil,
      _ppOdemeModalAc: window._ppOdemeModalAc,
      _ppOdemeTipSec: window._ppOdemeTipSec,
      _ppOdemeYapiSec: window._ppOdemeYapiSec,
      _ppOdemeYillikHesap: window._ppOdemeYillikHesap,
      _ppOdemeVadeOnizle: window._ppOdemeVadeOnizle,
      _ppOdemeModalKaydet: window._ppOdemeModalKaydet,
      _ppOdemeModalKapat: window._ppOdemeModalKapat,
      _ppAbonelikModalAc: window._ppAbonelikModalAc,
      _ppAbonelikYeniAc: window._ppAbonelikYeniAc,
      _ppAbonelikSil: window._ppAbonelikSil
    });
  }

  /* ── V170.3.12 CANONICAL PusulaPro.modalPayment EXPOSE ── */
  Object.assign(window.PusulaPro.modalPayment, {
    _ppOdemeYeniAc: window._ppOdemeYeniAc,
    _ppOdemeSil: window._ppOdemeSil,
    _ppOdemeModalAc: window._ppOdemeModalAc,
    _ppOdemeTipSec: window._ppOdemeTipSec,
    _ppOdemeYapiSec: window._ppOdemeYapiSec,
    _ppOdemeYillikHesap: window._ppOdemeYillikHesap,
    _ppOdemeVadeOnizle: window._ppOdemeVadeOnizle,
    _ppOdemeModalKaydet: window._ppOdemeModalKaydet,
    _ppOdemeModalKapat: window._ppOdemeModalKapat,
    _ppAbonelikModalAc: window._ppAbonelikModalAc,
    _ppAbonelikYeniAc: window._ppAbonelikYeniAc,
    _ppAbonelikSil: window._ppAbonelikSil
  });
})();
