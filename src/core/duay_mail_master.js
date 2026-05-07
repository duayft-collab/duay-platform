'use strict';
/* ════════════════════════════════════════════════════════════
   src/core/duay_mail_master.js — Mail Template Master
   V194g-2a: 9 hardcoded mail template tek master'da toplandı.

   SAHİPLİK: Globally shared — purchase + ihracat + finans + ik
            modüllerinin tümü buradan okur.

   Template'ler:
     sigorta            (TR)  — kargo sigortası teklif
     navlun             (TR)  — navlun teklif
     ic_nakliye         (TR)  — iç nakliye teklif
     belge_gonder       (TR)  — belge gönderim
     gumrukcu           (TR)  — gümrükçü mail
     forwarder          (TR)  — forwarder mail
     odeme_hatirlatma   (TR)  — vadesi geçen ödeme
     ik_thanks          (EN+FR) — IK red mektubu

   Kullanım:
     window.DUAY_MAIL_GET(key, lang, vars)
     örn: DUAY_MAIL_GET('sigorta', 'tr', { yukl, varis, urun, kg, m3, ... })

   KX10: Ortak veri tek kaynak.
   KX11: Modül globally shared veri sahipleyemez.
   K13:  i18n disiplini (lang param zorunlu).
════════════════════════════════════════════════════════════ */
(function() {

  /* SIRKET_DATA fallback — V194d-2.1 ile centralize edildi */
  function _sirket(field, fallback) {
    var s = window.SIRKET_DATA;
    return (s && s[field]) || fallback;
  }
  function _unvanTr() { return _sirket('hesapSahibi', 'Duay Uluslararası Ticaret Ltd. Şti.'); }
  function _unvanEn() { return _sirket('unvan_en', 'Duay Global LLC'); }
  function _web()     { return _sirket('web', 'www.duaycor.com'); }
  function _tel()     { return _sirket('tel', '+90 212 625 5 444'); }

  /* MAIL_TEMPLATES — function-based, backtick template literal */
  var MAIL_TEMPLATES = {

    sigorta: {
      tr: function(v) {
        v = v || {};
        return `Sayın İlgili,

Aşağıdaki sevkiyat için kargo sigortası teklifi talep etmekteyiz.

SEVK BİLGİLERİ
Yükleme  : ${v.yukl || ''}
Varış    : ${v.varis || ''}
Ürün     : ${v.urun || ''}
Brüt KG  : ${v.kg || ''} kg | Hacim: ${v.m3 || ''} m³
Konteyner: ${v.kont || ''}

SİGORTA TALEBİ
Sigorta Değeri : ${v.deger || ''}
Sigorta Türü   : ${v.tur || ''}
Yükleme Tarihi : ${v.tarih || ''}

Teklifinizi bekliyoruz.
Saygılarımızla, ${_unvanTr()}`;
      }
    },

    navlun: {
      tr: function(v) {
        v = v || {};
        var armatorLine = v.armator ? `\nTercih  : ${v.armator}` : '';
        return `Sayın İlgili,

Aşağıdaki sevkiyat için navlun fiyatı talep etmekteyiz.

SEVK BİLGİLERİ
Yükleme : ${v.pol || ''}
Varış   : ${v.pod || ''}
Konteyner: ${v.adet || ''}x ${v.kont || ''}
Brüt KG : ${v.kg || ''} kg
Hacim   : ${v.m3 || ''} m³
Ürün    : ${v.urun || ''}
B/L     : ${v.bl || ''}
Navlun  : ${v.odeme || ''}
Yükleme : ${v.tarih || ''}${armatorLine}
Son Teklif: ${v.son || ''}

Saygılarımızla,
${_unvanTr()}`;
      }
    },

    ic_nakliye: {
      tr: function(v) {
        v = v || {};
        var notLine = v.not ? `\nÖzel Talimat : ${v.not}` : '';
        return `Sayın İlgili,

Aşağıdaki sevkiyat için iç nakliye teklifi talep etmekteyiz.

YÜKLEME DURAKLARI:${v.durakMet || ''}

TESLİM BİLGİLERİ
Teslim Yeri  : ${v.teslim || ''}
Teslim Tarihi: ${v.tarih || ''}
Konteyner    : ${v.kont || ''}
Toplam KG    : ${v.kgTop || ''} kg
Toplam m³    : ${v.m3Top || ''}${notLine}

Saygılarımızla,
${_unvanTr()}`;
      }
    },

    belge_gonder: {
      tr: function(v) {
        v = v || {};
        var notTxt = v.notTxt || '';
        var prefix = notTxt ? `${notTxt}\n\n---\n` : 'Sayın ilgili,\n\nEkte ' + (v.tur || 'belge') + ' belgesi gönderilmiştir.\n\nSaygılarımızla,\n';
        return `${prefix}${_unvanTr()}\nDosya: ${v.dosyaNo || ''}`;
      }
    },

    gumrukcu: {
      tr: function(v) {
        v = v || {};
        return `Sayın ${v.yetkiliAdi || 'İlgili'},

Dosya: ${v.dosyaNo || ''}
Müşteri: ${v.musteriAd || ''}
Teslim: ${v.teslimSekli || ''}
Liman: ${v.varisLimani || ''}

${v.gumrukcuNotu || ''}

Saygılarımızla,
${_unvanTr()}`;
      }
    },

    forwarder: {
      tr: function(v) {
        v = v || {};
        return `Sayın ${v.firmaAdi || 'İlgili'},

Dosya: ${v.dosyaNo || ''}
Teslim: ${v.teslimSekli || ''}
Liman: ${v.varisLimani || ''}

Navlun fiyatı ve uygun sefer önerisi beklenmektedir.

Saygılarımızla,
${_unvanTr()}`;
      }
    },

    odeme_hatirlatma: {
      tr: function(v) {
        v = v || {};
        return `Sayın ${v.cariName || 'İlgili Taraf'},

${v.due || ''} vade tarihli, ${v.sym || ''}${v.amount || ''} tutarındaki "${v.name || 'ödeme'}" kaydı ${v.diff || ''} gündür ödeme beklemektedir.

En kısa sürede ödeme yapmanızı rica ederiz.

Saygılarımızla,
${_unvanEn()}`;
      }
    },

    ik_thanks: {
      en: function(v) {
        v = v || {};
        return `Dear ${v.adayAdi || ''},

Thank you for coming in and meeting with me. I wanted to let you know how much I enjoyed speaking with you and appreciated your interest in the position.

While it was a difficult decision given the strength of our candidates, we are unable to offer you this position at this time. However, we will keep your resume on file for future openings over the next six months.

We wish you the best in your job search.

Sincerely,
${v.gorusmeci || ''}
${_unvanEn()}
${_web()} | ${_tel()}`;
      },
      fr: function(v) {
        v = v || {};
        return `Cher(e) ${v.adayAdi || ''},

Je vous remercie de vous être déplacé(e) et de m'avoir rencontré. Je souhaitais vous faire savoir combien j'ai apprécié notre échange et votre intérêt pour le poste.

Bien que la décision ait été difficile étant donné la qualité de nos candidats, nous ne sommes pas en mesure de vous proposer ce poste pour le moment. Cependant, nous conserverons votre candidature pour les prochaines opportunités au cours des six mois à venir.

Nous vous souhaitons beaucoup de succès dans votre recherche d'emploi.

Cordialement,
${v.gorusmeci || ''}
${_unvanEn()}
${_web()} | ${_tel()}`;
      }
    }

  };

  /* Accessor — KX11 + KX12 uyumlu */
  window.DUAY_MAIL_GET = function(key, lang, vars) {
    var tpl = MAIL_TEMPLATES[key];
    if (!tpl) {
      console.warn('[DUAY_MAIL] template bulunamadı:', key);
      return '';
    }
    lang = lang || 'tr';
    var fn = tpl[lang] || tpl.tr || tpl.en;
    if (typeof fn !== 'function') {
      console.warn('[DUAY_MAIL] dil bulunamadı:', key, lang);
      return '';
    }
    try {
      return fn(vars || {});
    } catch (e) {
      console.warn('[DUAY_MAIL] template render hatası:', key, lang, e.message);
      return '';
    }
  };

  /* Liste accessor (debug + admin UI gelecekte için) */
  window.DUAY_MAIL_LIST = function() {
    return Object.keys(MAIL_TEMPLATES).map(function(k) {
      return { key: k, langs: Object.keys(MAIL_TEMPLATES[k]) };
    });
  };

  console.log('[DUAY_MAIL_MASTER] V194g-2a yüklendi:', Object.keys(MAIL_TEMPLATES).length, 'template');
})();
