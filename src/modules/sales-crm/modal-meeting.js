/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/modal-meeting.js
 * V138.2 POPULATE — toplantı CRUD modal (ov-m)
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

  function openMeeting(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.EID.m = id || null;
    var modal = window.SalesCRM.modal;
    if (modal && modal.fillContactSelects) modal.fillContactSelects();
    var ttl = _q('#scrm-mm-t');
    if (ttl) ttl.textContent = id ? 'Toplantı Düzenle' : 'Toplantı Ekle';
    var m = id ? core.D.meetings.find(function(x) { return x.id === id; }) : {};
    m = m || {};
    var setVal = function(sel, val) { var e = _q(sel); if (e) e.value = (val === undefined || val === null) ? '' : val; };
    setVal('#scrm-m-ti', m.baslik);
    setVal('#scrm-m-c', m.musteriId);
    setVal('#scrm-m-ty', m.tur || 'Yüz Yüze');
    setVal('#scrm-m-dt', m.tarih || new Date().toISOString().slice(0, 16));
    setVal('#scrm-m-dur', m.sure || 60);
    setVal('#scrm-m-loc', m.konum);
    setVal('#scrm-m-ag', m.gundem);
    setVal('#scrm-m-prep', m.hazirlik);
    setVal('#scrm-m-res', m.sonuc);
    _openOv('scrm-ov-m');
  }

  function openMeetingFor(cId) {
    openMeeting();
    setTimeout(function() {
      var el = _q('#scrm-m-c');
      if (el) el.value = cId;
    }, 30);
  }

  function saveMeeting() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var ti = get('#scrm-m-ti').trim();
    var dt = get('#scrm-m-dt');
    if (!ti || !dt) { core.toast('Başlık ve tarih zorunludur', '⚠'); return; }
    var p = {
      id: core.EID.m || core.uid(),
      baslik: ti,
      musteriId: get('#scrm-m-c'),
      tur: get('#scrm-m-ty'),
      tarih: dt,
      sure: get('#scrm-m-dur'),
      konum: get('#scrm-m-loc'),
      gundem: get('#scrm-m-ag'),
      hazirlik: get('#scrm-m-prep'),
      sonuc: get('#scrm-m-res')
    };
    if (p.musteriId && !core.EID.m) {
      core.D.activities.push({
        id: core.uid(), musteriId: p.musteriId, tur: '🤝',
        aciklama: 'Toplantı: ' + ti,
        tarih: p.tarih, olusturma: new Date().toISOString()
      });
    }
    var idx = core.D.meetings.findIndex(function(m) { return m.id === p.id; });
    if (idx > -1) Object.assign(core.D.meetings[idx], p);
    else core.D.meetings.push(p);
    core.saveAll();
    _closeOv('scrm-ov-m');
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdMeetings) pages.rdMeetings();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast(core.EID.m ? 'Güncellendi' : 'Eklendi', '✅');
  }

  function delMeeting(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.meetings = core.D.meetings.filter(function(m) { return m.id !== id; });
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdMeetings) pages.rdMeetings();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast('Silindi', '🗑');
  }

  Object.assign(window.SalesCRM.modal, {
    openMeeting: openMeeting,
    openMeetingFor: openMeetingFor,
    saveMeeting: saveMeeting,
    delMeeting: delMeeting
  });
})();
