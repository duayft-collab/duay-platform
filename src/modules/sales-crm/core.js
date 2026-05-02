/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/core.js
 * V138.2 POPULATE — namespace + state + helpers + storage + toast
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  var STORAGE_KEY = 'crm_pro_v4';

  var D = {
    contacts: [], deals: [], meetings: [], tasks: [], activities: [],
    spinData: {}, interviewQ: [], actionPlan: [], evalList: [],
    mkCards: {}, paData: {}
  };

  var EID = { c: null, d: null, m: null, t: null, a: null };

  var FS = {
    pipe: 'all', contact: 'all', contactQ: '',
    meet: 'all', task: 'all', qcat: 'all'
  };

  var STATE = { CUR: 'dashboard', GK_CID: null };

  function loadLocal() {
    var s = localStorage.getItem(STORAGE_KEY);
    if (s) try { Object.assign(D, JSON.parse(s)); } catch (e) {}
  }

  function saveAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(D));
      toast('Kaydedildi', '✅');
    } catch (e) {
      toast('Kayıt başarısız', '❌');
    }
  }

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function fD(s) {
    if (!s) return '–';
    try { return new Date(s).toLocaleDateString('tr-TR'); }
    catch (e) { return s; }
  }

  function fDT(s) {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString('tr-TR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return s; }
  }

  function fM(v) {
    return new Intl.NumberFormat('tr-TR').format(Number(v) || 0) + '₺';
  }

  function ini(n) {
    return (n || '').split(' ').map(function(w) { return w[0] || ''; })
      .join('').slice(0, 2).toUpperCase();
  }

  function gC(id) {
    return D.contacts.find(function(c) { return c.id === id; })
      || { ad: '–', firma: '–' };
  }

  function dL(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function pb(p) {
    return { 'Yüksek': 'bbr', 'Orta': 'bba', 'Düşük': 'bbg' }[p] || 'bbgy';
  }

  function sb(s) {
    return {
      'Müşteri': 'bbg', 'Potansiyel': 'bbb',
      'Partner': 'bbp', 'Eski Müşteri': 'bbgy'
    }[s] || 'bbgy';
  }

  function potB(p) {
    return { 'A+': 'bbp', 'A': 'bbb', 'B': 'bbgy', 'C': 'bbr' }[p] || 'bbgy';
  }

  function adCls(t) {
    return {
      '📞': 'd-call', '📧': 'd-mail', '🤝': 'd-meet',
      '💬': 'd-meet', '📝': 'd-note', '✅': 'd-task'
    }[t] || 'd-note';
  }

  function toast(msg, ico) {
    var c = document.getElementById('scrm-tc');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>' + (ico || 'ℹ') + '</span>' + msg;
    c.appendChild(t);
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateX(110%)';
      t.style.transition = 'all .25s';
      setTimeout(function() { t.remove(); }, 250);
    }, 2800);
  }

  window.SalesCRM.core = {
    STORAGE_KEY: STORAGE_KEY,
    D: D, EID: EID, FS: FS, STATE: STATE,
    loadLocal: loadLocal, saveAll: saveAll,
    uid: uid, fD: fD, fDT: fDT, fM: fM, ini: ini, gC: gC, dL: dL,
    pb: pb, sb: sb, potB: potB, adCls: adCls, toast: toast
  };
})();
