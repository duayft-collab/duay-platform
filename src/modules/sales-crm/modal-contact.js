/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/modal-contact.js
 * V138.2 POPULATE — müşteri CRUD modal (ov-c)
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

  function _fillContactSelects() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var opts = '<option value="">—</option>' + core.D.contacts.map(function(c) {
      return '<option value="' + c.id + '">' + c.ad + ' — ' + c.firma + '</option>';
    }).join('');
    ['#scrm-d-c', '#scrm-m-c', '#scrm-t-c', '#scrm-a-c'].forEach(function(sel) {
      var el = _q(sel);
      if (el) {
        var pv = el.value;
        el.innerHTML = opts;
        if (pv) el.value = pv;
      }
    });
  }

  function openContact(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.EID.c = id || null;
    _fillContactSelects();
    var adEl = _q('#scrm-act-dt');
    if (adEl && !adEl.value) adEl.value = new Date().toISOString().slice(0, 16);
    var ttl = _q('#scrm-mc-t');
    if (ttl) ttl.textContent = id ? 'Müşteri Düzenle' : 'Yeni Müşteri';
    var c = id ? core.D.contacts.find(function(x) { return x.id === id; }) : {};
    c = c || {};
    var setVal = function(sel, val) { var e = _q(sel); if (e) e.value = val || ''; };
    setVal('#scrm-c-name', c.ad);
    setVal('#scrm-c-co', c.firma);
    setVal('#scrm-c-ti', c.unvan);
    setVal('#scrm-c-sec', c.sektor || 'Teknoloji');
    setVal('#scrm-c-em', c.email);
    setVal('#scrm-c-ph', c.telefon);
    setVal('#scrm-c-st', c.durum || 'Potansiyel');
    setVal('#scrm-c-pot', c.potansiyelSinifi || 'B');
    setVal('#scrm-c-src', c.kaynak || 'Diğer');
    setVal('#scrm-c-ci', c.sehir);
    setVal('#scrm-c-nt', c.notlar);
    var ne = _q('#scrm-note-ed');
    if (ne) ne.innerHTML = '';
    rdActList(id);
    rdSavedNotes(id);
    _openOv('scrm-ov-c');
    _resetTabs('scrm-ov-c');
  }

  function rdActList(cId) {
    var core = window.SalesCRM.core;
    var el = _q('#scrm-act-list');
    if (!el || !core) return;
    if (!cId) { el.innerHTML = ''; return; }
    var fDT = core.fDT;
    var acts = core.D.activities.filter(function(a) { return a.musteriId === cId; })
      .sort(function(a, b) { return new Date(b.tarih || b.olusturma || 0) - new Date(a.tarih || a.olusturma || 0); });
    el.innerHTML = acts.length ? acts.map(function(a) {
      return '<div class="tli"><div class="tld" style="background:var(--blue)"></div><div class="tlc"><div class="tlh"><div class="tlt">' + a.tur + ' ' + (a.aciklama || '') + '</div><div class="tldt">' + fDT(a.tarih || a.olusturma) + '</div></div></div></div>';
    }).join('') : '<div class="empty" style="padding:18px"><div class="ei">📋</div><div class="et">Aktivite yok</div></div>';
  }

  function rdSavedNotes(cId) {
    var core = window.SalesCRM.core;
    var el = _q('#scrm-saved-notes');
    if (!el || !core) return;
    if (!cId) { el.innerHTML = ''; return; }
    var fDT = core.fDT;
    var ns = core.D.activities.filter(function(a) { return a.musteriId === cId && a.tur === '📝'; })
      .sort(function(a, b) { return new Date(b.tarih || b.olusturma || 0) - new Date(a.tarih || a.olusturma || 0); });
    el.innerHTML = ns.length ? '<div style="font-size:10px;font-weight:600;color:var(--scrm-tx3);margin-bottom:7px;text-transform:uppercase;letter-spacing:.4px">Kayıtlı Notlar</div>' +
      ns.map(function(n) {
        return '<div class="tlc" style="margin-bottom:6px"><div class="tlh"><div class="tldt">' + fDT(n.tarih || n.olusturma) + '</div></div><div class="tlbd">' + n.aciklama + '</div></div>';
      }).join('') : '';
  }

  function saveContact() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var name = get('#scrm-c-name').trim();
    var co = get('#scrm-c-co').trim();
    if (!name || !co) { core.toast('Ad ve firma zorunludur', '⚠'); return; }
    var noteEl = _q('#scrm-note-ed');
    var noteText = noteEl ? (noteEl.innerText || '').trim() : '';
    var p = {
      id: core.EID.c || core.uid(),
      ad: name, firma: co,
      unvan: get('#scrm-c-ti'), sektor: get('#scrm-c-sec'),
      potansiyelSinifi: get('#scrm-c-pot'),
      email: get('#scrm-c-em'), telefon: get('#scrm-c-ph'),
      durum: get('#scrm-c-st'), kaynak: get('#scrm-c-src'),
      sehir: get('#scrm-c-ci'), notlar: get('#scrm-c-nt')
    };
    if (noteText) {
      core.D.activities.push({
        id: core.uid(), musteriId: p.id, tur: '📝',
        aciklama: noteText, tarih: new Date().toISOString(),
        olusturma: new Date().toISOString()
      });
      if (noteEl) noteEl.innerHTML = '';
    }
    var idx = core.D.contacts.findIndex(function(c) { return c.id === p.id; });
    if (idx > -1) Object.assign(core.D.contacts[idx], p);
    else core.D.contacts.push(p);
    core.saveAll();
    _closeOv('scrm-ov-c');
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdContacts) pages.rdContacts();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast(core.EID.c ? 'Güncellendi' : 'Eklendi', '✅');
  }

  function delContact(id) {
    var core = window.SalesCRM.core;
    if (!core) return;
    if (!confirm('Bu müşteriyi silmek istiyor musunuz?')) return;
    core.D.contacts = core.D.contacts.filter(function(c) { return c.id !== id; });
    core.D.deals = core.D.deals.filter(function(d) { return d.musteriId !== id; });
    core.D.activities = core.D.activities.filter(function(a) { return a.musteriId !== id; });
    core.D.interviewQ = core.D.interviewQ.filter(function(q) { return q.musteriId !== id; });
    core.D.actionPlan = core.D.actionPlan.filter(function(a) { return a.musteriId !== id; });
    core.saveAll();
    var pages = window.SalesCRM.pages;
    if (pages) {
      if (pages.rdContacts) pages.rdContacts();
      if (pages.rdDash) pages.rdDash();
      if (pages.updBadges) pages.updBadges();
    }
    core.toast('Silindi', '🗑');
  }

  function addActivity() {
    var core = window.SalesCRM.core;
    if (!core || !core.EID.c) { core && core.toast('Müşteri seçili değil', '⚠'); return; }
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    var desc = get('#scrm-act-dc').trim();
    if (!desc) { core.toast('Açıklama gerekli', '⚠'); return; }
    core.D.activities.push({
      id: core.uid(), musteriId: core.EID.c,
      tur: get('#scrm-act-tp'), aciklama: desc,
      tarih: get('#scrm-act-dt') || new Date().toISOString(),
      kullanici: 'Ben', olusturma: new Date().toISOString()
    });
    var dcEl = _q('#scrm-act-dc');
    if (dcEl) dcEl.value = '';
    core.saveAll();
    rdActList(core.EID.c);
    var pages = window.SalesCRM.pages;
    if (pages && pages.rdDash) pages.rdDash();
    core.toast('Aktivite eklendi', '✅');
  }

  Object.assign(window.SalesCRM.modal, {
    openContact: openContact,
    saveContact: saveContact,
    delContact: delContact,
    addActivity: addActivity,
    rdActList: rdActList,
    rdSavedNotes: rdSavedNotes,
    closeOv: _closeOv,
    fillContactSelects: _fillContactSelects
  });
})();
