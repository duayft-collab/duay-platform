/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/pages-ops.js
 * V138.2 POPULATE — müşteri kartı + görüşme kartı + potansiyel analiz
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

  var MK_FIELDS = [
    'mk-firma', 'mk-tarih', 'mk-yetkili', 'mk-katilimci', 'mk-not-firma',
    'mk-sahip', 'mk-faaliyet', 'mk-diger', 'mk-not-sahip',
    'mk-buyume', 'mk-buyume-pct', 'mk-yatirim', 'mk-projeler', 'mk-hedef', 'mk-not-sektor',
    'mk-karar', 'mk-ref', 'mk-tedari', 'mk-kriter', 'mk-not-satin',
    'mk-vizyon', 'mk-misyon', 'mk-katalog', 'mk-isbirligi', 'mk-sekil'
  ];

  var PA_FIELDS = [
    'pa-bitmis', 'pa-devam', 'pa-baslayacak',
    'pa-dusuren', 'pa-gelistirme', 'pa-artirici', 'pa-destek',
    'pa-urun', 'pa-hizmet', 'pa-korku'
  ];

  function _contactOptions() {
    var core = window.SalesCRM.core;
    if (!core) return '';
    return '<option value="">Müşteri Seç...</option>' +
      core.D.contacts.map(function(c) {
        return '<option value="' + c.id + '">' + c.ad + ' — ' + c.firma + '</option>';
      }).join('');
  }

  function rdMK() {
    var sel = _q('#scrm-mk-sel');
    if (!sel) return;
    var prev = sel.value || '';
    sel.innerHTML = _contactOptions();
    if (prev) sel.value = prev;
  }

  function loadMK(cId) {
    var core = window.SalesCRM.core;
    if (!core || !cId) return;
    var mk = core.D.mkCards[cId] || {};
    MK_FIELDS.forEach(function(id) {
      var el = _q('#scrm-' + id);
      if (el) el.value = mk[id] || '';
    });
  }

  function saveMK() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var sel = _q('#scrm-mk-sel');
    var cId = sel ? sel.value : '';
    if (!cId) { core.toast('Müşteri seçin', '⚠'); return; }
    var mk = {};
    MK_FIELDS.forEach(function(id) {
      var el = _q('#scrm-' + id);
      if (el) mk[id] = el.value;
    });
    core.D.mkCards[cId] = mk;
    core.saveAll();
    core.toast('Müşteri kartı kaydedildi', '✅');
  }

  function clearMK() {
    MK_FIELDS.forEach(function(id) {
      var el = _q('#scrm-' + id);
      if (el && id !== 'mk-buyume' && id !== 'mk-sekil') el.value = '';
    });
  }

  function rdGorusme() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var sel = _q('#scrm-gk-cid');
    if (!sel) return;
    var prev = sel.value || core.STATE.GK_CID || '';
    sel.innerHTML = _contactOptions();
    if (prev) { sel.value = prev; loadGorusme(prev); }
    rdGkActions();
    var ks = _q('#scrm-kaynak-cid');
    if (ks) ks.innerHTML = '<option value="">Müşteri Seç (görüşmeye ekle)</option>' +
      core.D.contacts.map(function(c) {
        return '<option value="' + c.id + '">' + c.ad + ' — ' + c.firma + '</option>';
      }).join('');
  }

  function loadGorusme(cId) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.STATE.GK_CID = cId;
    var el = _q('#scrm-gk-sorular');
    if (!el) return;
    if (!cId) {
      el.innerHTML = '<div class="empty"><div class="ei">💬</div><div class="et">Müşteri seçin</div></div>';
      return;
    }
    var myQ = core.D.interviewQ.filter(function(q) { return q.musteriId === cId; });
    el.innerHTML = myQ.length ? myQ.map(function(q) {
      return '<div class="iq" data-soru-id="' + q.soruId + '"><div class="iq-hd"><span class="iq-meta">' + q.uzman + ' / ' + q.kategori + '</span><button class="iq-rm" data-rm="' + q.soruId + '">✕</button></div><div class="iq-q">' + q.soruMetni + '</div><textarea class="ft scrm-iq-ans" data-soru-id="' + q.soruId + '" style="min-height:52px;font-size:12.5px" placeholder="Cevabı not edin...">' + (q.cevap || '') + '</textarea></div>';
    }).join('') : '<div class="empty" style="padding:26px"><div class="ei">💬</div><div class="et">Henüz soru eklenmedi</div><div class="es">Kaynak Bankası&apos;ndan soru ekleyin</div></div>';
    rdGkActions();
  }

  function rdGkActions() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var el = _q('#scrm-gk-actions');
    if (!el) return;
    var GK_CID = core.STATE.GK_CID;
    var pb = core.pb, fD = core.fD;
    var acts = (GK_CID ? core.D.actionPlan.filter(function(a) { return a.musteriId === GK_CID; }) : core.D.actionPlan)
      .sort(function(a, b) { return new Date(a.tarih) - new Date(b.tarih); });
    el.innerHTML = acts.length ? acts.map(function(a) {
      var dn = a.tamamlandi;
      var ov = !dn && new Date(a.tarih) < new Date();
      return '<div style="display:flex;align-items:flex-start;gap:7px;padding:8px 0;border-bottom:1px solid var(--bg3)" data-aid="' + a.id + '"><div class="cb2 ' + (dn ? 'ck' : '') + '" style="margin-top:1px">' +
        (dn ? '<svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' : '') +
        '</div><div style="flex:1"><div style="font-size:12.5px;font-weight:500;color:var(--scrm-tx);' + (dn ? 'text-decoration:line-through' : '') + '">' + a.gorev + '</div><div style="font-size:10px;color:' + (ov ? 'var(--red)' : 'var(--scrm-tx3)') + '">' + fD(a.tarih) + ' · <span class="badge ' + pb(a.oncelik || 'Orta') + '" style="font-size:9px">' + (a.oncelik || 'Orta') + '</span></div></div></div>';
    }).join('') : '<div class="empty" style="padding:18px"><div class="ei">📋</div><div class="et">Aksiyon yok</div></div>';
  }

  function saveIQAns(cId, soruId, cevap) {
    var core = window.SalesCRM.core;
    var data = window.SalesCRM.data;
    if (!core || !data) return;
    var q = data.QUESTIONS.find(function(x) { return String(x.id) === String(soruId); });
    if (!q) return;
    var idx = core.D.interviewQ.findIndex(function(x) {
      return x.musteriId === cId && String(x.soruId) === String(soruId);
    });
    if (idx > -1) core.D.interviewQ[idx].cevap = cevap;
    else core.D.interviewQ.push({
      id: core.uid(), musteriId: cId, soruId: String(soruId),
      soruMetni: q.q, uzman: q.expert, kategori: q.cat, cevap: cevap,
      olusturma: new Date().toISOString()
    });
    core.saveAll();
  }

  function rmIQ(cId, soruId) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.interviewQ = core.D.interviewQ.filter(function(q) {
      return !(q.musteriId === cId && String(q.soruId) === String(soruId));
    });
    loadGorusme(cId);
  }

  function rdPA() {
    var sel = _q('#scrm-pa-sel');
    if (!sel) return;
    var prev = sel.value || '';
    sel.innerHTML = _contactOptions();
    if (prev) { sel.value = prev; loadPA(prev); }
  }

  function loadPA(cId) {
    var core = window.SalesCRM.core;
    if (!core || !cId) return;
    var pa = core.D.paData[cId] || {};
    PA_FIELDS.forEach(function(id) {
      var el = _q('#scrm-' + id);
      if (el) el.value = pa[id] || '';
    });
  }

  function savePA() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var sel = _q('#scrm-pa-sel');
    var cId = sel ? sel.value : '';
    if (!cId) { core.toast('Müşteri seçin', '⚠'); return; }
    var pa = {};
    PA_FIELDS.forEach(function(id) {
      var el = _q('#scrm-' + id);
      if (el) pa[id] = el.value;
    });
    core.D.paData[cId] = pa;
    core.saveAll();
    core.toast('Analiz kaydedildi', '✅');
  }

  function renderOps() {
    rdMK(); rdGorusme(); rdPA();
  }

  Object.assign(window.SalesCRM.pages, {
    rdMK: rdMK, loadMK: loadMK, saveMK: saveMK, clearMK: clearMK,
    rdGorusme: rdGorusme, loadGorusme: loadGorusme, rdGkActions: rdGkActions,
    saveIQAns: saveIQAns, rmIQ: rmIQ,
    rdPA: rdPA, loadPA: loadPA, savePA: savePA,
    renderOps: renderOps
  });
})();
