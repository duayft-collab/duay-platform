/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/modal-deal.js
 * V138.2 POPULATE — fırsat CRUD modal (ov-d)
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

  function _openOv(id) {
    var ov = _q('#' + id);
    if (ov) {
      ov.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function _closeOv(id) {
    var ov = _q('#' + id);
    if (ov) {
      ov.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function _resetTabs(ovId) {
    var ov = _q('#' + ovId);
    if (!ov) return;
    var tabs = ov.querySelectorAll('.tab');
    tabs.forEach(function(t, i) { t.classList.toggle('active', i === 0); });
    var panes = ov.querySelectorAll('.tp');
    panes.forEach(function(p, i) { p.classList.toggle('active', i === 0); });
  }

  function openDeal(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.EID.d = id || null;
    var modal = window.SalesCRM.modal;
    if (modal && modal.fillContactSelects) modal.fillContactSelects();
    var ttl = _q('#scrm-md-t');
    if (ttl) ttl.textContent = id ? 'Fırsat Düzenle' : 'Yeni Fırsat';
    var d = id ? core.D.deals.find(function(x) { return x.id === id; }) : {};
    d = d || {};
    var setVal = function(sel, val) { var e = _q(sel); if (e) e.value = (val === undefined || val === null) ? '' : val; };
    setVal('#scrm-d-n', d.ad);
    setVal('#scrm-d-c', d.musteriId);
    setVal('#scrm-d-s', d.asama || 'Prospecting');
    setVal('#scrm-d-v', d.deger);
    setVal('#scrm-d-pr', (d.olasilik !== undefined && d.olasilik !== null) ? d.olasilik : 50);
    setVal('#scrm-d-dt', d.kapanisTarihi || core.dL(30));
    setVal('#scrm-d-pri', d.oncelik || 'Orta');
    setVal('#scrm-d-desc', d.aciklama);
    setVal('#scrm-d-nt', d.gorusmeNotu);
    setVal('#scrm-d-nx', d.sonrakiAdim);
    _openOv('scrm-ov-d');
    _resetTabs('scrm-ov-d');
  }

  function openDealStage(stage) {
    openDeal();
    setTimeout(function() {
      var el = _q('#scrm-d-s');
      if (el) el.value = stage;
    }, 30);
  }

  function saveDeal() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var n = get('#scrm-d-n').trim();
    if (!n) { core.toast('Fırsat adı zorunludur', '⚠'); return; }
    var p = {
      id: core.EID.d || core.uid(),
      ad: n,
      musteriId: get('#scrm-d-c'),
      asama: get('#scrm-d-s'),
      deger: get('#scrm-d-v'),
      olasilik: get('#scrm-d-pr'),
      kapanisTarihi: get('#scrm-d-dt'),
      oncelik: get('#scrm-d-pri'),
      aciklama: get('#scrm-d-desc'),
      gorusmeNotu: get('#scrm-d-nt'),
      sonrakiAdim: get('#scrm-d-nx')
    };
    var idx = core.D.deals.findIndex(function(d) { return d.id === p.id; });
    if (idx > -1) Object.assign(core.D.deals[idx], p);
    else core.D.deals.push(p);
    core.saveAll();
    _closeOv('scrm-ov-d');
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdPipe) pages.rdPipe();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast(core.EID.d ? 'Güncellendi' : 'Eklendi', '✅');
  }

  Object.assign(window.SalesCRM.modal, {
    openDeal: openDeal,
    openDealStage: openDealStage,
    saveDeal: saveDeal
  });
})();
