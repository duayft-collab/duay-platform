/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/pages-static.js
 * V138.2 POPULATE — kaynak + gurular + playbook (statik render)
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  function _root() { return document.getElementById('panel-sales-crm'); }
  function _q(sel) { var r = _root(); return r ? r.querySelector(sel) : null; }

  function rdKaynak() {
    var core = window.SalesCRM.core;
    var data = window.SalesCRM.data;
    if (!core || !data) return;
    var ks = _q('#scrm-kaynak-cid');
    if (ks) ks.innerHTML = '<option value="">Müşteri Seç (görüşmeye ekle)</option>' +
      core.D.contacts.map(function(c) {
        return '<option value="' + c.id + '">' + c.ad + ' — ' + c.firma + '</option>';
      }).join('');
    rdQBank();
    var kl = _q('#scrm-kb-list');
    if (kl) kl.innerHTML = data.TECHNIQUES.map(function(t) {
      return '<div class="kbc" style="border-left-color:' + t.color + '"><div class="kbt">' + t.title + '</div><div class="kbe">by ' + t.expert + '</div><div class="kbd">' + t.desc + '</div></div>';
    }).join('');
  }

  function rdQBank() {
    var core = window.SalesCRM.core;
    var data = window.SalesCRM.data;
    if (!core || !data) return;
    var grid = _q('#scrm-q-bank-grid');
    if (!grid) return;
    var FS = core.FS;
    var qs = data.QUESTIONS;
    if (FS.qcat !== 'all') qs = qs.filter(function(q) { return q.cat === FS.qcat; });
    grid.innerHTML = qs.map(function(q) {
      return '<div class="qcard"><div class="qcard-hd"><span class="qexpert">' + q.expert + '</span><span class="qcat">' + q.cat + '</span></div><div class="qtxt">' + q.q + '</div><button class="qadd scrm-q-add" data-qid="' + q.id + '">＋ Görüşmeye Ekle</button></div>';
    }).join('');
  }

  function addQToGK(qId) {
    var core = window.SalesCRM.core;
    var data = window.SalesCRM.data;
    if (!core || !data) return;
    var ks = _q('#scrm-kaynak-cid');
    var cId = ks ? ks.value : '';
    if (!cId) { core.toast('Önce müşteri seçin', '⚠'); return; }
    var q = data.QUESTIONS.find(function(x) { return x.id === qId; });
    if (!q) return;
    if (core.D.interviewQ.find(function(x) { return x.musteriId === cId && String(x.soruId) === String(qId); })) {
      core.toast('Zaten eklendi', 'ℹ');
      return;
    }
    core.D.interviewQ.push({
      id: core.uid(), musteriId: cId, soruId: String(qId),
      soruMetni: q.q, uzman: q.expert, kategori: q.cat, cevap: '',
      olusturma: new Date().toISOString()
    });
    core.saveAll();
    core.toast('Soru görüşmeye eklendi', '✅');
  }

  function fQCat(f) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.FS.qcat = f;
    rdQBank();
  }

  function rdGurular() {
    var data = window.SalesCRM.data;
    if (!data) return;
    var el = _q('#scrm-guru-grid');
    if (!el) return;
    el.innerHTML = data.GURUS.map(function(g) {
      var booksHtml = g.books ? '<div style="margin-top:9px">' + g.books.map(function(b) {
        return '<span class="badge bbgy" style="margin-right:3px;margin-top:3px;font-size:10px">' + b + '</span>';
      }).join('') + '</div>' : '';
      var urlHtml = g.url ? '<div style="margin-top:7px;font-size:10px;color:var(--blue)">🔗 ' + g.url + '</div>' : '';
      return '<div class="gc"><div class="gn">' + g.name + '</div><div class="gf">' + g.focus + '</div><div class="gb">"' + g.bio + '"</div>' + booksHtml + urlHtml + '</div>';
    }).join('');
  }

  function rdPlaybook() {
    function pbq(q, s) {
      return '<div class="pbq"><div class="pbqt">"' + q + '"</div><span class="pbsrc">' + s + '</span></div>';
    }
    function obj(t, r, c) {
      return '<div class="objc" style="border-color:' + c + '"><div class="ot">❌ "' + t + '"</div><div class="or">💬 ' + r + '</div></div>';
    }
    function tr2(e, t, q) {
      return '<div class="pbq"><div style="display:flex;gap:6px"><span>' + e + '</span><div><div style="font-size:12.5px;font-weight:500;color:var(--scrm-tx)">' + t + '</div><div style="font-size:12px;color:var(--scrm-tx3);font-style:italic">"' + q + '"</div></div></div></div>';
    }
    function cl(e, t, d) {
      return '<div class="clsc"><div class="ct">' + e + ' ' + t + '</div><div class="cd">' + d + '</div></div>';
    }
    var oe = _q('#scrm-pb-open');
    if (oe) oe.innerHTML = [
      pbq('Şirketinizin önümüzdeki 12 ayda en öncelikli hedefi nedir?', 'Sobel & Panas'),
      pbq('Bu projenin sizin için kişisel önemi nedir?', 'Gitomer · Power Questions'),
      pbq('İdeal tedarikçide aradığınız 3 özellik nedir? (fiyat hariç)', 'Gitomer · Fayda Satışı'),
      pbq('Eğer tek bir şeyi değiştirebilseydiniz, bu ne olurdu?', 'SPIN · Baran Şimşek')
    ].join('');
    var ve = _q('#scrm-pb-value');
    if (ve) ve.innerHTML = [
      pbq('Mevcut süreçteki en büyük zaman kaybını nerede görüyorsunuz?', 'SPIN-Problem · Baran Şimşek'),
      pbq('Bu sorun çözülmezse yıl sonunda tahmini maliyeti ne olur?', 'SPIN-Implication'),
      pbq('Başarıyı nasıl ölçersiniz?', 'Value Selling · Gitomer'),
      pbq('Sizden almanın makul olduğunu patronunuza izah edebileceğiniz somut fark nedir?', 'Baran Şimşek')
    ].join('');
    var oj = _q('#scrm-pb-obj');
    if (oj) oj.innerHTML = [
      obj('Fiyat çok yüksek', '"Pahalı derken neyle kıyaslıyorsunuz? ROI&apos;yi birlikte hesaplayalım."', 'var(--red)'),
      obj('Şu an ihtiyaç yok', '"Şu anki önceliğiniz ne? Bu çözülmeden oraya ulaşabilir misiniz?"', 'var(--amber)'),
      obj('Düşüneyim', '"Hangi bilgi eksik? Birlikte tamamlayalım."', 'var(--purple)'),
      obj('Başka tedarikçi var', '"Size şu an vermedikleri tek şey nedir?" — Baran Şimşek prensibi', 'var(--blue)')
    ].join('');
    var te = _q('#scrm-pb-trust');
    if (te) te.innerHTML = [
      tr2('🎯', 'Kariyer Hedefi', 'Bu karar kariyerinizde ne fark yaratır?'),
      tr2('💡', 'Ortak Değer', '(Gitomer) Önce ortak zevkleri bul, sonra ortak değerlere ulaş.'),
      tr2('🛡', 'Risk', 'Süreçte sizi en çok ne endişelendiriyor?'),
      tr2('🤝', 'Beklenti', 'Bizden en çok ne bekliyorsunuz?')
    ].join('');
    var ce = _q('#scrm-pb-close');
    if (ce) ce.innerHTML = [
      cl('🔒', 'Varsayımsal Kapanış', '"Çarşamba 14:00 sözleşme için uygun mu?" — Karar sürecini atlayın.'),
      cl('⏰', 'Deadline Yaratma', '"Bu ay karar verirseniz X avantajı alırsınız." — Gitomer: Gerçek ve somut olsun.'),
      cl('🔇', 'Sessizlik Gücü', 'Soru sorduktan sonra bekleyin. İlk konuşan kaybeder. — Gitomer & Baran Şimşek'),
      cl('📋', 'Sonraki Adım', '"Şimdi ne yapalım?" DEĞİL — "Teknik ekiple Salı mı Perşembe mi?"')
    ].join('');
  }

  function renderStatic() {
    rdKaynak(); rdGurular(); rdPlaybook();
  }

  Object.assign(window.SalesCRM.pages, {
    rdKaynak: rdKaynak, rdQBank: rdQBank, addQToGK: addQToGK, fQCat: fQCat,
    rdGurular: rdGurular,
    rdPlaybook: rdPlaybook,
    renderStatic: renderStatic
  });
})();
