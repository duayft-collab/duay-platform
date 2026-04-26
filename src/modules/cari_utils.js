/* cari_utils.js — CARI-NORMALIZE-001
   Merkezi cari normalize helper — proje genelinde tutarlı alan isimleri */
(function() {
  'use strict';

  /**
   * Tek bir cari objesini normalize et — farklı kaynaklardan gelen
   * alan isimlerini standart bir şemaya dönüştürür.
   * @param {Object} c Ham cari objesi
   * @returns {Object|null} { id, name, type, email, tel, adres, isDeleted, raw }
   */
  window._cariNormalize = function(c) {
    if (!c) return null;
    return {
      id: c.id || c._id || '',
      name: c.name || c.ad || c.firmaAdi || c.title || c.unvan || c.companyName || '',
      type: c.type || c.tip || (c.cariType === 'onayli' ? 'musteri' : null) || null,
      email: c.email || c.eposta || '',
      tel: c.tel || c.phone || c.telefon || '',
      adres: c.adres || c.address || '',
      isDeleted: !!c.isDeleted,
      vkn: c['vkn'] || c['tckn'] || c['vergiNo'] || c['taxNo'] || '',
      country: c['country'] || c['ulke'] || '',
      city: c['city'] || c['sehir'] || '',
      kod: c['kod'] || '',
      contact: c['contact'] || c['yetkili'] || '',
      raw: c
    };
  };

  /**
   * Tüm müşteri cari kayıtlarını normalize edilmiş halde döndür.
   * Silinenleri filtreler, ismi olmayanları atar.
   * @returns {Array} Normalize edilmiş cari listesi
   */
  window._cariListeMusteri = function() {
    var tumCari = typeof window.loadCari === 'function' ? window.loadCari({ tumKullanicilar: true }) : [];
    return tumCari
      .filter(function(c) { return !c.isDeleted; })
      .map(window._cariNormalize)
      .filter(function(c) { return c && c.name; });
  };

})();
