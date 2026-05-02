/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/modal-action.js
 * V138.2 POPULATE — aksiyon plan CRUD modal (ov-a)
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

  function openAction() {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.EID.a = null;
    var modal = window.SalesCRM.modal;
    if (modal && modal.fillContactSelects) modal.fillContactSelects();
    var setVal = function(sel, val) { var e = _q(sel); if (e) e.value = (val === undefined || val === null) ? '' : val; };
    setVal('#scrm-a-g', '');
    setVal('#scrm-a-dt', core.dL(7));
    setVal('#scrm-a-pr', 'Orta');
    var GK_CID = core.STATE.GK_CID;
    if (GK_CID) {
      setTimeout(function() {
        var el = _q('#scrm-a-c');
        if (el) el.value = GK_CID;
      }, 30);
    }
    _openOv('scrm-ov-a');
  }

  function saveAction() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var g = get('#scrm-a-g').trim();
    if (!g) { core.toast('Görev zorunludur', '⚠'); return; }
    var p = {
      id: core.EID.a || core.uid(),
      musteriId: get('#scrm-a-c'),
      gorev: g,
      tarih: get('#scrm-a-dt'),
      oncelik: get('#scrm-a-pr'),
      tamamlandi: false
    };
    var idx = core.D.actionPlan.findIndex(function(a) { return a.id === p.id; });
    if (idx > -1) Object.assign(core.D.actionPlan[idx], p);
    else core.D.actionPlan.push(p);
    core.saveAll();
    _closeOv('scrm-ov-a');
    var pages = window.SalesCRM.pages;
    if (pages && pages.rdGkActions) pages.rdGkActions();
    core.toast('Aksiyon eklendi', '✅');
  }

  function toggleAction(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    var a = core.D.actionPlan.find(function(x) { return x.id === id; });
    if (!a) return;
    a.tamamlandi = !a.tamamlandi;
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages && pages.rdGkActions) pages.rdGkActions();
  }

  function delAction(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.actionPlan = core.D.actionPlan.filter(function(a) { return a.id !== id; });
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages && pages.rdGkActions) pages.rdGkActions();
    core.toast('Silindi', '🗑');
  }

  Object.assign(window.SalesCRM.modal, {
    openAction: openAction,
    saveAction: saveAction,
    toggleAction: toggleAction,
    delAction: delAction
  });
})();
