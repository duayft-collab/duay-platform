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
  window.DUAY_META = {
    sirket: {
      unvan_tr:    'DUAY ULUSLARARASI TICARET LTD. STI.',
      unvan_en:    'DUAY GLOBAL LLC',
      adres_kisa:  'Istanbul, Turkey',
      web:         'www.duaycor.com',
      tel:         '+90 212 625 5 444',
      whatsapp:    '+90 532 270 5 113'
    },
    /* Versiyon — V158 refactor sirasinda hangi dosya hangi versiyondan beslendi izlemek icin */
    _version: '157.0.0',
    _master_keys: {
      banka: 'ak_bankalar1',
      cari:  'ak_cari1',
      terms: 'ak_pi_sartlar',
      kur:   '_saKur (in-memory) + ak_kur_rates (cache)'
    }
  };

  /* ════════════════════════════════════════════════════════════
   * DUAY_BANKA — null-safe accessor
   * Mevcut master: window._loadBankalar (satin_alma_v2_satis.js:836)
   * localStorage key: ak_bankalar1
   *
   * Kullanim:
   *   window.DUAY_BANKA('USD')  -> { hesapSahibi, banka, sube, iban, swift }
   *   window.DUAY_BANKA()       -> { USD: {...}, EUR: {...} }
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_BANKA = function (cur) {
    try {
      if (typeof window._loadBankalar === 'function') {
        var b = window._loadBankalar() || {};
        if (cur) return b[cur] || b['USD'] || null;
        return b;
      }
    } catch (e) {
      console.warn('[V157 DUAY_BANKA] error:', e);
    }
    return null;
  };

  /* ════════════════════════════════════════════════════════════
   * DUAY_KUR_GET — null-safe kur accessor
   *
   * MEVCUT window.DUAY_KUR'a DOKUNMAZ (database.js:3293 set ediyor).
   * Yeni isim DUAY_KUR_GET ile kafa karisikligi yok.
   *
   * Kullanim:
   *   window.DUAY_KUR_GET('USD')  -> 44.55
   *   window.DUAY_KUR_GET()       -> { USD:44.55, EUR:51.70, ... }
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_KUR_GET = function (cur) {
    try {
      var k = window._saKur || window.DUAY_KUR || null;
      if (!k || typeof k !== 'object') return null;
      if (cur) {
        var v = k[cur];
        return (typeof v === 'number' && v > 0) ? v : null;
      }
      return k;
    } catch (e) {
      console.warn('[V157 DUAY_KUR_GET] error:', e);
    }
    return null;
  };

  /* ════════════════════════════════════════════════════════════
   * DUAY_TERMS — null-safe terms accessor
   * Mevcut master: window._saV2Sartlar (satin_alma_v2_satis.js:840)
   * localStorage key: ak_pi_sartlar
   *
   * Kullanim:
   *   window.DUAY_TERMS()  -> ['Payment: 30% deposit...', ...]
   * ════════════════════════════════════════════════════════════ */
  window.DUAY_TERMS = function () {
    try {
      if (typeof window._saV2Sartlar === 'function') {
        var arr = window._saV2Sartlar();
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {
      console.warn('[V157 DUAY_TERMS] error:', e);
    }
    return [];
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
