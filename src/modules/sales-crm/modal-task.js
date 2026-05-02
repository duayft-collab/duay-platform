/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/modal-task.js
 * V138.2 POPULATE — görev CRUD modal (ov-t)
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

  function openTask(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.EID.t = id || null;
    var modal = window.SalesCRM.modal;
    if (modal && modal.fillContactSelects) modal.fillContactSelects();
    var ttl = _q('#scrm-mt-t');
    if (ttl) ttl.textContent = id ? 'Görev Düzenle' : 'Görev Ekle';
    var t = id ? core.D.tasks.find(function(x) { return x.id === id; }) : {};
    t = t || {};
    var setVal = function(sel, val) { var e = _q(sel); if (e) e.value = (val === undefined || val === null) ? '' : val; };
    setVal('#scrm-t-ti', t.baslik);
    setVal('#scrm-t-c', t.musteriId);
    setVal('#scrm-t-pr', t.oncelik || 'Orta');
    setVal('#scrm-t-dt', t.sonTarih || core.dL(7));
    setVal('#scrm-t-ty', t.tur || '📝 Diğer');
    setVal('#scrm-t-nt', t.not);
    _openOv('scrm-ov-t');
  }

  function openTaskFor(cId) {
    openTask();
    setTimeout(function() {
      var el = _q('#scrm-t-c');
      if (el) el.value = cId;
    }, 30);
  }

  function saveTask() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var ti = get('#scrm-t-ti').trim();
    if (!ti) { core.toast('Görev başlığı zorunludur', '⚠'); return; }
    var existing = core.EID.t ? core.D.tasks.find(function(x) { return x.id === core.EID.t; }) : null;
    var p = {
      id: core.EID.t || core.uid(),
      baslik: ti,
      musteriId: get('#scrm-t-c'),
      oncelik: get('#scrm-t-pr'),
      sonTarih: get('#scrm-t-dt'),
      tur: get('#scrm-t-ty'),
      not: get('#scrm-t-nt'),
      tamamlandi: existing ? !!existing.tamamlandi : false
    };
    var idx = core.D.tasks.findIndex(function(t) { return t.id === p.id; });
    if (idx > -1) Object.assign(core.D.tasks[idx], p);
    else core.D.tasks.push(p);
    core.saveAll();
    _closeOv('scrm-ov-t');
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdTasks) pages.rdTasks();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast(core.EID.t ? 'Güncellendi' : 'Eklendi', '✅');
  }

  function delTask(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.tasks = core.D.tasks.filter(function(t) { return t.id !== id; });
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdTasks) pages.rdTasks();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast('Silindi', '🗑');
  }

  function toggleTask(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    var t = core.D.tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    t.tamamlandi = !t.tamamlandi;
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdTasks) pages.rdTasks();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
  }

  Object.assign(window.SalesCRM.modal, {
    openTask: openTask,
    openTaskFor: openTaskFor,
    saveTask: saveTask,
    delTask: delTask,
    toggleTask: toggleTask
  });
})();
