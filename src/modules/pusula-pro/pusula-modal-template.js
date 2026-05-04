/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-modal-template.js — V170.3.13 POPULATE
   Sorumluluk: Takvim etkinlik form modalı (yeni/düzenle/kaydet)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-MODAL-TEMPLATE-POPULATE-001
   Kaynak: pusula_pro.js bölgesi (KX8 birebir kopya):
       _ppTakvimYeniAc       L2556-2596  Takvim etkinlik form modalı (41 satır)
                                         pptak-form-modal toggle aç/kapat
                                         Kategori: TOPLANTI/DEADLINE/TATIL/GOREV/KISISEL
                                         Periyot: Tek Seferlik/Aylık/Yıllık/Haftalık
       _ppTakvimFormKaydet   L2598-2629  Form kaydet (32 satır)
                                         _ppTakvimSonrakiHesapla → next-date hesap
                                         _ppTakvimStore → localStorage persist
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.modalTemplate (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ ATLANANLAR (diğer cycle'lara):
       _ppTakvimTamamla L2532-2542 → actions.js (Cycle 3.2.13)
       _ppTakvimSil     L2543-2554 → actions.js
       _ppTakvimDuzenle: yok (form modalı içinde editId mantığı)
   ⚠ Bağımlılık: window._ppTakvimLoad/Store (store ✓ Cycle 3.2.4)
                 window._ppEsc, _ppNow, _ppId (core ✓)
                 window._ppTakvimSonrakiHesapla (render-board ✓ Cycle 3.2.8)
                 window._ppModRender (render-list ✓)
                 window.toast
   ⚠ DOM: pptak-form-modal, pptak-* form elementleri
   ⚠ V175+ NOT: takvim modalı `_ppOdemeModalAc` paterniyle
                _ppOdmFld helper'ları gibi field helper'lara sadeleştirilebilir
                Bu cycle SADECE BÖLME, refactor yok
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.modalTemplate) window.PusulaPro.modalTemplate = {};
  if (window._ppModalTemplateLoaded) return;
  window._ppModalTemplateLoaded = true;

window._ppTakvimYeniAc = function() {
  var mevcut = document.getElementById('pptak-form-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'pptak-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var _f = function(id, lbl, ph, tip) { return '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><input id="pptak-' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  var _s = function(id, lbl, opts) { return '<div><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><select id="pptak-' + id + '" onclick="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">' + opts + '</select></div>'; };
  var ic = '<div style="background:var(--sf);border-radius:var(--pp-r-md);border:0.5px solid var(--b);width:600px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Takvim Etkinliği</div><button onclick="event.stopPropagation();document.getElementById(\'pptak-form-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button></div>';
  ic += '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += _f('baslik', 'ETKİNLİK ADI *', 'Etkinlik başlığı');
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _s('kategori', 'KATEGORİ', '<option value="">Seç</option><option>İK</option><option>Muhasebe</option><option>Operasyon</option><option>Satış</option><option>Satınalma</option><option>Lojistik</option><option>Yönetim</option><option>Diğer</option>');
  ic += _f('altKategori', 'ALT KATEGORİ', 'Alt kategori');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _s('periyot', 'PERİYOT', '<option value="Tek Sefer">Tek Sefer</option><option value="Günlük">Günlük</option><option value="Haftalık">Haftalık</option><option value="Aylık">Aylık</option><option value="Yıllık">Yıllık</option><option value="Her 3 Ayda 1">Her 3 Ayda 1</option><option value="Her 6 Ayda 1">Her 6 Ayda 1</option>');
  ic += _f('periyotDetay', 'PERİYOT DETAYI', 'Her ayın 1. Pazartesi');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('basTarih', 'BAŞLANGIÇ TARİHİ', '', 'date');
  ic += _f('sorumlu', 'SORUMLU KİŞİ / EKİP', 'Ad veya departman');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('atananGorevli', 'ATANAN GÖREVLİ', 'Atanan kişi');
  ic += _f('kaynak', 'KAYNAK', 'Yasal zorunluluk, iç prosedür vb.');
  ic += '</div>';
  ic += _f('ilgiliDokuman', 'İLGİLİ DÖKÜMAN (URL)', 'https://...');
  ic += _f('detay', 'ETKİNLİK DETAYI', 'Açıklama');
  ic += '</div>';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  ic += '<div style="font-size:var(--pp-meta);color:var(--t3)">* Etkinlik adı zorunlu</div>';
  ic += '<div style="display:flex;gap:8px"><button onclick="event.stopPropagation();document.getElementById(\'pptak-form-modal\')?.remove()" style="font-size:var(--pp-body);padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._ppTakvimFormKaydet()" style="font-size:var(--pp-body);padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button></div>';
  ic += '</div></div>';
  /* XSS-RISK: _esc() zorunlu */
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  setTimeout(function() { document.getElementById('pptak-baslik')?.focus(); }, 100);
};

window._ppTakvimFormKaydet = function() {
  var _v = function(id) { return document.getElementById('pptak-' + id)?.value?.trim() || ''; };
  var baslik = _v('baslik');
  if (!baslik) { window.toast?.('Etkinlik adı zorunlu', 'warn'); return; }
  var yeni = {
    id: window._ppId?.() || ('TAK-' + Date.now()),
    name: baslik, baslik: baslik,
    category: _v('kategori'), kategori: _v('kategori'),
    altKategori: _v('altKategori'),
    period: _v('periyot'), periyot: _v('periyot'),
    periodDetail: _v('periyotDetay'), periyotDetay: _v('periyotDetay'),
    startDate: _v('basTarih'),
    resp: _v('sorumlu'), sorumlu: _v('sorumlu'), sorumluUnvan: _v('sorumlu'),
    atananGorevli: _v('atananGorevli'),
    kaynak: _v('kaynak'),
    ilgiliDokuman: _v('ilgiliDokuman'),
    detail: _v('detay'), detay: _v('detay'),
    takvimeEkle: 'Evet',
    oncelik: 'Normal',
    hatirlatmaGun: 3,
    durum: 'active',
    createdAt: _ppNow(),
    updatedAt: _ppNow()
  };
  yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
  var liste = window._ppTakvimLoad?.() || [];
  liste.unshift(yeni);
  window._ppTakvimStore?.(liste);
  document.getElementById('pptak-form-modal')?.remove();
  window.toast?.('Etkinlik kaydedildi', 'ok');
  window._ppModRender?.();
};

  /* ── V170.3.13 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppTakvimYeniAc) {
    Object.assign(window, {
      _ppTakvimYeniAc: window._ppTakvimYeniAc,
      _ppTakvimFormKaydet: window._ppTakvimFormKaydet
    });
  }

  /* ── V170.3.13 CANONICAL PusulaPro.modalTemplate EXPOSE ── */
  Object.assign(window.PusulaPro.modalTemplate, {
    _ppTakvimYeniAc: window._ppTakvimYeniAc,
    _ppTakvimFormKaydet: window._ppTakvimFormKaydet
  });
})();
