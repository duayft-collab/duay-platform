/**
 * DUAY-META-CENTER-001 (V157)
 *
 * AMAC: Ortak veriler icin tek merkezi kaynak (single source of truth).
 *
 * Bu dosya HICBIR veriyi KOPYALAMAZ — mevcut master kaynaklara delegate eder:
 *   - Banka:  window._loadBankalar()    (satin_alma_v2_satis.js owner)
 *   - Kur:    window._saKur / DUAY_KUR  (satin_alma_v2.js + database.js owner)
 *   - Terms:  window._saV2Sartlar()     (satin_alma_v2_satis.js owner)
 *   - Adres:  window.PI_ADRES           (satin_alma_v2_pi.js owner)
 *
 * SADECE sirket meta bilgisi (unvan, tel, web vb.) burada TANIMLANIR — cunku
 * sistemde 12+ farkli yerde hardcoded ve tek bir master yer YOK.
 *
 * Naming dikkat:
 *   - window.DUAY_KUR — MEVCUT (database.js:3293 set ediyor) — DOKUNULMAZ
 *   - window.DUAY_KUR_GET — YENI (bizim accessor fn) — kafa karistirmaz
 *
 * Anayasa uyumu:
 *   K01 ≤800 satir · KX3 yeni feature = yeni dosya
 *   KX5 saha test prod (V152-V156 deseni)
 *   EK KRITIK KURAL — ORTAK VERI: kopyalama YOK, delegate pattern.
 *
 * Sonraki cycle (V158): hardcoded'lari topluca DUAY_META kullanacak sekilde refactor.
 * V157'de SADECE 2-3 yer ornek baglanti (pdf_v2.js minimal).
 */
(function () {
  'use strict';

  if (window._duayMetaApplied) return;
  window._duayMetaApplied = true;

  /* ════════════════════════════════════════════════════════════
   * SIRKET META — TEK KAYNAK
   * Sistemde 12+ farkli yerde hardcoded. V157 bu degerleri TEK
   * yere koyar. V158+ kademeli geçis yapilacak.
   * ════════════════════════════════════════════════════════════ */
  /* V194a: sirket alt-objesi Object.freeze + ust obje Object.freeze (K03 veri butunlugu).
     V194b+'da bu alanlara YAZAN bulunursa exception firlar — silent mutation engellenir. */
  /* V194d-1b: DUAY_META.sirket SIRKET_DATA'dan (platform_standartlari.js) okur — TEK MASTER */
  function _readSirket() {
    var s = window.SIRKET_DATA;
    if (s && typeof s === 'object') {
      return Object.freeze({
        unvan_tr:      s.unvan_tr,
        unvan_en:      s.unvan_en,
        hesapSahibi:   s.hesapSahibi,
        adres_tr:      s.adres_tr,
        adres_kisa:    s.adres_kisa,
        tel:           s.tel,
        whatsapp:      s.whatsapp,
        web:           s.web,
        email:         s.email,
        vergi_dairesi: s.vergi_dairesi,
        vergi_no:      s.vergi_no,
        mersis:        s.mersis,
        ticaret_sicil: s.ticaret_sicil
      });
    }
    /* Fallback (SIRKET_DATA yüklenmediyse) */
    return Object.freeze({
      unvan_tr:    'DUAY ULUSLARARASI TICARET LTD. STI.',
      unvan_en:    'DUAY GLOBAL LLC',
      hesapSahibi: 'Duay Uluslararası Ticaret Ltd. Şti.',
      adres_kisa:  'Istanbul, Turkey',
      web:         'www.duaycor.com',
      tel:         '+90 212 625 5 444',
      whatsapp:    '+90 532 270 5 113',
      email:       'brn.simsek@gmail.com'
    });
  }
  window.DUAY_META = Object.freeze({
    sirket: _readSirket(),
    /* Versiyon — V194a master-data-foundation tamamlandi */
    _version: '194.0.0',
    _master_keys: Object.freeze({
      banka: 'ak_bankalar1',
      cari:  'ak_cari1',
      terms: 'ak_pi_sartlar',
      kur:   '_saKur (in-memory) + ak_kur_rates (cache)'
    })
  });

  /* ════════════════════════════════════════════════════════════
   * DUAY_BANKA — null-safe accessor (V194a: frozen return)
   * Mevcut master: window._loadBankalar (satin_alma_v2_satis.js:836)
   * localStorage key: ak_bankalar1
   *
   * Kullanim:
   *   window.DUAY_BANKA('USD')  -> { hesapSahibi, banka, sube, iban, swift } (frozen)
   *   window.DUAY_BANKA()       -> { USD: {...}, EUR: {...} } (frozen, alt-objeler frozen)
   *
   * V194a: caller mutate edemez. Icerik V157 ile birebir ayni — sadece donus frozen.
   * Ihtiyac varsa caller Object.assign({}, DUAY_BANKA('USD')) ile yeni mutable kopya alir.
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_BANKA = function (cur) {
    try {
      /* V194d-1a: IBAN_DATA (platform_standartlari.js master) onceli */
      if (Array.isArray(window.IBAN_DATA) && window.IBAN_DATA.length > 0) {
        var bank0 = window.IBAN_DATA[0];
        var ibanKey = (cur === 'TRY' || cur === 'TL') ? 'TL' : cur;
        if (cur && bank0[ibanKey]) {
          return Object.freeze({
            banka: bank0.banka,
            sube: bank0.sube,
            iban: bank0[ibanKey],
            swift: bank0.swift || 'TGBATRIS',
            hesapSahibi: (window.SIRKET_DATA && window.SIRKET_DATA.hesapSahibi) || (window.DUAY_META && window.DUAY_META.sirket && window.DUAY_META.sirket.hesapSahibi)
          });
        }
        if (!cur) {
          var clone = {};
          ['USD', 'EUR', 'TRY'].forEach(function(c) {
            var k = c === 'TRY' ? 'TL' : c;
            if (bank0[k]) {
              clone[c] = Object.freeze({
                banka: bank0.banka,
                sube: bank0.sube,
                iban: bank0[k],
                swift: 'TGBATRIS',
                hesapSahibi: 'Duay Global Trade Company'
              });
            }
          });
          return Object.freeze(clone);
        }
      }
      /* Fallback: _loadBankalar (eski davranis) */
      if (typeof window._loadBankalar === 'function') {
        var b = window._loadBankalar() || {};
        if (cur) {
          var single = b[cur] || b['USD'] || null;
          return single ? Object.freeze(Object.assign({}, single)) : null;
        }
        var clone2 = {};
        Object.keys(b).forEach(function (k) {
          clone2[k] = Object.freeze(Object.assign({}, b[k]));
        });
        return Object.freeze(clone2);
      }
    } catch (e) {
      console.warn('[V194d-1a DUAY_BANKA] error:', e);
    }
    return null;
  };

  /* ════════════════════════════════════════════════════════════
   * V194a: DUAY_KUR_FALLBACK — kur master null ise donen sabit degerler.
   *
   * KAYNAK: satin_alma_v2.js:110 _saKur init degerleri (KX8 anchor view).
   * AMAC:  Hardcoded `||44.55` kalibini dosya genelinde kaldirmak icin
   *        TEK frozen referans. (V194c migration cycle'i kullanacak.)
   *
   * NE DEGIL:
   *   - Bu degerler "dogru kur" degildir, sadece guvenli fallback.
   *   - Gercek kur _saKur'dan gelir; bu obje yalniz master null iken devreye girer.
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_KUR_FALLBACK = Object.freeze({
    USD: 44.55,
    EUR: 51.70,
    GBP: 59.30,
    CNY: 6.20,
    TRY: 1
  });

  /* ════════════════════════════════════════════════════════════
   * DUAY_KUR_GET — null-safe kur accessor (V194a: fallback parametresi)
   *
   * MEVCUT window.DUAY_KUR'a DOKUNMAZ (database.js:3293 set ediyor).
   * Yeni isim DUAY_KUR_GET ile kafa karisikligi yok.
   *
   * Kullanim:
   *   window.DUAY_KUR_GET('USD')         -> 44.55  (master varsa)
   *   window.DUAY_KUR_GET('USD', true)   -> 44.55  (master null ise FALLBACK'ten)
   *   window.DUAY_KUR_GET()              -> { USD:44.55, EUR:51.70, ... }
   *   window.DUAY_KUR_GET(null, true)    -> DUAY_KUR_FALLBACK (master null ise)
   *
   * V157 davranisi korunur: 1 parametreli cagrilarda fallback YOK (geriye uyumlu).
   * Yeni 2. parametre opt-in.
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_KUR_GET = function (cur, useFallback) {
    try {
      var k = window._saKur || window.DUAY_KUR || null;
      if (k && typeof k === 'object') {
        if (cur) {
          var v = k[cur];
          if (typeof v === 'number' && v > 0) return v;
          /* master var ama bu para birimi yok -> fallback'e dus (opt-in) */
        } else {
          return k;
        }
      }
      /* master null ya da deger gecersiz */
      if (useFallback === true) {
        if (cur) return window.DUAY_KUR_FALLBACK[cur] || null;
        return window.DUAY_KUR_FALLBACK;
      }
    } catch (e) {
      console.warn('[V194a DUAY_KUR_GET] error:', e);
    }
    return null;
  };

  /* ════════════════════════════════════════════════════════════
   * DUAY_TERMS — null-safe terms accessor (V194a: frozen return)
   * Mevcut master: window._saV2Sartlar (satin_alma_v2_satis.js:840)
   * localStorage key: ak_pi_sartlar
   *
   * Kullanim:
   *   window.DUAY_TERMS()  -> ['Payment: 30% deposit...', ...] (frozen array)
   *
   * V194a: caller .push/.splice ile master'i bozamaz.
   * Master fn (_saV2Sartlar) zaten yeni array donuyor (JSON.parse), shallow freeze yeterli.
   * Ihtiyac varsa caller [...DUAY_TERMS()] ile yeni mutable kopya alir.
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_TERMS = function () {
    try {
      if (typeof window._saV2Sartlar === 'function') {
        var arr = window._saV2Sartlar();
        if (Array.isArray(arr)) return Object.freeze(arr.slice());
      }
    } catch (e) {
      console.warn('[V194a DUAY_TERMS] error:', e);
    }
    return Object.freeze([]);
  };

  /* ════════════════════════════════════════════════════════════
   * DUAY_PI_ADRES — null-safe adres accessor
   * Mevcut master: window.PI_ADRES (satin_alma_v2_pi.js:79)
   *
   * Fallback: DUAY_META.sirket'ten turetir (PI_ADRES yuklenmemisse).
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_PI_ADRES = function () {
    try {
      if (window.PI_ADRES && typeof window.PI_ADRES === 'object') {
        return window.PI_ADRES;
      }
    } catch (e) {}
    /* Fallback: DUAY_META'dan minimal adres uret */
    return {
      sirket:   window.DUAY_META.sirket.unvan_en,
      unvanTR:  window.DUAY_META.sirket.unvan_tr,
      unvanEN:  window.DUAY_META.sirket.unvan_en,
      adres1:   window.DUAY_META.sirket.adres_kisa,
      adres2:   '',
      tel:      window.DUAY_META.sirket.tel,
      mobil:    window.DUAY_META.sirket.whatsapp,
      mail:     '',
      web:      window.DUAY_META.sirket.web
    };
  };

  /* ════════════════════════════════════════════════════════════
   * V194a: DUAY_FOOTER — PDF/PI footer standart string accessor.
   *
   * Coklu yerde kullanilan "DUAY ULUSLARARASI TICARET LTD. STI. · www.duaycor.com"
   * pattern'i icin tek uretici.
   *
   * Kullanim:
   *   window.DUAY_FOOTER()         -> 'DUAY ULUSLARARASI TICARET LTD. STI. · www.duaycor.com'
   *   window.DUAY_FOOTER('en')     -> 'DUAY GLOBAL LLC · www.duaycor.com'
   *
   * KX10: Sirket bilgisi DUAY_META.sirket'ten okunur — hardcoded degil.
   * Default lang 'tr'. Gecersiz lang verilirse 'tr' fallback.
   *
   * NOT: Mevcut footer literal'leri (orn. pdf_v2.js:253) BU CYCLE'DA migrate
   *      EDILMEZ — yeni feature ekleme. V194d migration cycle'i kullanacak.
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_FOOTER = function (lang) {
    try {
      var s = window.DUAY_META && window.DUAY_META.sirket;
      if (!s) return '';
      var unvan = (lang === 'en') ? s.unvan_en : s.unvan_tr;
      var web = s.web || '';
      return unvan + (web ? ' · ' + web : '');
    } catch (e) {
      console.warn('[V194a DUAY_FOOTER] error:', e);
      return '';
    }
  };

  /* ════════════════════════════════════════════════════════════
   * V194a: DUAY_META_HEALTH — master kaynak saglik raporu (lightweight).
   *
   * Mevcut DUAY_META_STATUS object dondururken,
   * HEALTH boolean + missing[] verir — CI/console assertion icin.
   *
   * Kullanim:
   *   window.DUAY_META_HEALTH()  ->  { ok: true, missing: [] }
   *                                  { ok: false, missing: ['banka', 'kur'] }
   *
   * Sayfa yuklemede otomatik cagrilirsa, eksik master varsa console error
   * uretir (V194b cycle bu cagriyi ekleyecek — bu cycle SADECE fn tanimi).
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_META_HEALTH = function () {
    var missing = [];
    if (typeof window._loadBankalar !== 'function') missing.push('banka');
    if (!window._saKur && !window.DUAY_KUR) missing.push('kur');
    if (typeof window._saV2Sartlar !== 'function') missing.push('terms');
    if (!window.PI_ADRES && !window.DUAY_META) missing.push('adres');
    if (!window.DUAY_META) missing.push('sirket');
    return { ok: missing.length === 0, missing: missing };
  };

  /* ════════════════════════════════════════════════════════════
   * DEBUG — durum raporu (console'dan cagrilabilir)
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_META_STATUS = function () {
    var status = {
      meta_loaded: !!window.DUAY_META,
      banka: {
        loadFn: typeof window._loadBankalar,
        sample: null
      },
      kur: {
        saKur: typeof window._saKur,
        DUAY_KUR: typeof window.DUAY_KUR,
        sample: null
      },
      terms: {
        sartlarFn: typeof window._saV2Sartlar,
        count: 0
      },
      pi_adres: {
        loaded: typeof window.PI_ADRES,
        sirket: null
      }
    };
    try { status.banka.sample = window.DUAY_BANKA('USD'); } catch (e) {}
    try { status.kur.sample = window.DUAY_KUR_GET('USD'); } catch (e) {}
    try { status.terms.count = window.DUAY_TERMS().length; } catch (e) {}
    try {
      var a = window.DUAY_PI_ADRES();
      status.pi_adres.sirket = a && a.sirket;
    } catch (e) {}
    return status;
  };

  console.log('[V157 DUAY_META] yuklendi · v' + window.DUAY_META._version);

  /* DUAY-META-CENTER-001 — V157 sonu */
})();
