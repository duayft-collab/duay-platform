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

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function confirmAction(msg, onConfirm, onCancel) {
    var existing = document.getElementById('scrm-confirm-modal');
    if (existing) existing.remove();
    var ov = document.createElement('div');
    ov.id = 'scrm-confirm-modal';
    ov.className = 'ov open';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div class="modal" style="background:#fff;border:1px solid #d1d1d6;border-radius:14px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.2);font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif">' +
      '<div style="padding:18px 20px 14px;border-bottom:1px solid #f2f2f7"><h2 style="font-size:15px;font-weight:600;color:#1d1d1f;margin:0">Onay</h2></div>' +
      '<div style="padding:18px 20px;font-size:13px;color:#3a3a3c;line-height:1.5">' + _esc(msg) + '</div>' +
      '<div style="padding:12px 20px;border-top:1px solid #f2f2f7;display:flex;justify-content:flex-end;gap:8px">' +
      '<button id="scrm-cf-no" style="padding:6px 13px;border-radius:20px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid #d1d1d6;background:#f2f2f7;color:#3a3a3c">İptal</button>' +
      '<button id="scrm-cf-yes" style="padding:6px 13px;border-radius:20px;font-size:12.5px;font-weight:500;cursor:pointer;border:none;background:#ff3b30;color:#fff">Evet, devam</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    var cleanup = function() { ov.remove(); };
    ov.querySelector('#scrm-cf-yes').addEventListener('click', function() {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    });
    ov.querySelector('#scrm-cf-no').addEventListener('click', function() {
      cleanup();
      if (typeof onCancel === 'function') onCancel();
    });
    ov.addEventListener('click', function(e) {
      if (e.target === ov) { cleanup(); if (typeof onCancel === 'function') onCancel(); }
    });
  }

  window.SalesCRM.core = {
    STORAGE_KEY: STORAGE_KEY,
    D: D, EID: EID, FS: FS, STATE: STATE,
    loadLocal: loadLocal, saveAll: saveAll,
    uid: uid, fD: fD, fDT: fDT, fM: fM, ini: ini, gC: gC, dL: dL,
    pb: pb, sb: sb, potB: potB, adCls: adCls, toast: toast,
    confirmAction: confirmAction
  };
})();
