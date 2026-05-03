/**
 * DASHBOARD-TODAY-ACTION-001 (V159)
 *
 * AMAC: Dashboard'a "Bugun Yapilacaklar" paneli ekle. Sistem-uretilen + manuel gorevler.
 *
 * STRATEJI: window.renderDashboard wrap (V158 deseni). Render sonrasi DOM'a inject.
 *           Mevcut kod KOPYALANMAZ — data master fn'lerden delegate okunur.
 *
 * VERI KAYNAKLARI (master, KOPYALANMAZ):
 *   - loadSatisTeklifleri() — overdue offers (5+ gun cevap bekleyen)
 *   - loadAlisTeklifleri()  — pending approvals (7+ gun onay)
 *   - loadTahsilat()        — overdue payments (vadesi gecmis)
 *   - loadKonteyner / loadKargolar / loadLojistik (fallback chain) — bugun varis
 *   - loadOdemePlani        — vadesi gelen 7 gun
 *   - loadGorevler / _ppLoadGorevler — PusulaPro bugun gorevleri (max 5)
 *
 * KX9: dashboard.js + app_patch.js DOKUNULMAZ.
 * KX8: Mevcut HTML kopyalanmadi, yeni inject edilen panel.
 *
 * Idempotent: panel ID'si "v159-actions-panel" — varsa outerHTML guncelle, yoksa olustur.
 * Periyodik refresh: 60 sn (data guncellenince taze data).
 *
 * Anayasa:
 *   K01 ≤800 satir · KX3 yeni dosya · EK KRITIK KURAL — kopya YOK
 */
(function () {
  'use strict';
  if (window._v159Applied) return;
  window._v159Applied = true;

  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  /* ════════════════════════════════════════════════════════════
   * DATA HELPER FN'LER — hepsi master kaynaklara delegate
   * ════════════════════════════════════════════════════════════ */
  function _getOverdueOffers() {
    if (typeof window.loadSatisTeklifleri !== 'function') return [];
    try {
      var list = window.loadSatisTeklifleri() || [];
      var now = Date.now();
      return list.filter(function (t) {
        if (!t || t.isDeleted) return false;
        if (t.durum !== 'gonderildi') return false;
        var sentRaw = t.gonderildi || t.gonderilenT || t.updatedAt || t.olusturmaT || t.ts;
        if (!sentRaw) return false;
        var sent = new Date(sentRaw).getTime();
        if (!sent || isNaN(sent)) return false;
        var days = (now - sent) / 86400000;
        return days > 5;
      });
    } catch (e) { return []; }
  }

  function _getPendingApprovals() {
    if (typeof window.loadAlisTeklifleri !== 'function') return [];
    try {
      var list = window.loadAlisTeklifleri() || [];
      var now = Date.now();
      return list.filter(function (t) {
        if (!t || t.isDeleted) return false;
        if (t.durum !== 'bekleyen') return false;
        var crRaw = t.createdAt || t.olusturmaT || t.ts;
        if (!crRaw) return false;
        var cr = new Date(crRaw).getTime();
        if (!cr || isNaN(cr)) return false;
        var days = (now - cr) / 86400000;
        return days > 7;
      });
    } catch (e) { return []; }
  }

  function _getOverduePayments() {
    if (typeof window.loadTahsilat !== 'function') return [];
    try {
      var list = window.loadTahsilat() || [];
      var today = _today0().getTime();
      return list.filter(function (t) {
        if (!t || t.isDeleted || t.collected) return false;
        if (!t.due) return false;
        var due = new Date(t.due).getTime();
        if (!due || isNaN(due)) return false;
        var tutar = parseFloat(t.tutar) || 0;
        return due < today && tutar > 0;
      });
    } catch (e) { return []; }
  }

  function _getArrivingShipments() {
    var fnNames = ['loadKonteyner', 'loadKargolar', 'loadLojistik', 'loadShipments'];
    for (var i = 0; i < fnNames.length; i++) {
      var fnName = fnNames[i];
      if (typeof window[fnName] !== 'function') continue;
      try {
        var list = window[fnName]() || [];
        var t0 = _today0().getTime();
        var t1 = t0 + 86400000;
        return list.filter(function (s) {
          if (!s || s.isDeleted) return false;
          var arrRaw = s.varisT || s.eta || s.arrivalDate || s.varisTarihi;
          if (!arrRaw) return false;
          var arr = new Date(arrRaw).getTime();
          return arr && !isNaN(arr) && arr >= t0 && arr < t1;
        });
      } catch (e) { continue; }
    }
    return [];
  }

  function _getDuePayments() {
    if (typeof window.loadOdemePlani !== 'function') return [];
    try {
      var list = window.loadOdemePlani() || [];
      var t0 = _today0().getTime();
      var t7 = t0 + 7 * 86400000;
      return list.filter(function (p) {
        if (!p || p.isDeleted || p.paid || p.odenmis) return false;
        var dueRaw = p.due || p.vade;
        if (!dueRaw) return false;
        var due = new Date(dueRaw).getTime();
        return due && !isNaN(due) && due >= t0 && due <= t7;
      });
    } catch (e) { return []; }
  }

  function _getPusulaTodayTasks() {
    var fn = (typeof window.loadGorevler === 'function') ? window.loadGorevler
           : (typeof window._ppLoadGorevler === 'function') ? window._ppLoadGorevler : null;
    if (!fn) return [];
    try {
      var list = fn() || [];
      var t0 = _today0().getTime();
      var t1 = t0 + 86400000;
      return list.filter(function (g) {
        if (!g || g.isDeleted || g.tamamlandi || g.completed || g.done) return false;
        var dueRaw = g.tarih || g.vade || g.due || g.dueDate;
        if (!dueRaw) return false;
        var due = new Date(dueRaw).getTime();
        return due && !isNaN(due) && due >= t0 && due < t1;
      }).slice(0, 5);
    } catch (e) { return []; }
  }

  function _getTodayActions() {
    return {
      overdueOffers:    _getOverdueOffers(),
      pendingApprovals: _getPendingApprovals(),
      overduePayments:  _getOverduePayments(),
      arriving:         _getArrivingShipments(),
      duePayments:      _getDuePayments(),
      pusulaTasks:      _getPusulaTodayTasks()
    };
  }

  /* ════════════════════════════════════════════════════════════
   * RENDER HTML
   * ════════════════════════════════════════════════════════════ */
  function _itemHTML(item, isLast) {
    var border = isLast ? '' : 'border-bottom:0.5px solid var(--b,#E2E8F0);';
    var h = '<div onclick="event.stopPropagation();window.App && window.App.nav && window.App.nav(\'' + item.link + '\')" ';
    h += 'style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:background-color .12s ease;' + border + '" ';
    h += 'onmouseover="this.style.background=\'var(--s2,#F0F3F8)\'" ';
    h += 'onmouseout="this.style.background=\'transparent\'">';
    h += '<span style="font-size:14px;width:18px;text-align:center;flex-shrink:0">' + item.icon + '</span>';
    h += '<span style="flex:1;font-size:12px;color:var(--t,#0F172A);line-height:1.4">' + _esc(item.text) + '</span>';
    if (item.count != null) {
      h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:#FAEEDA;color:#854F0B;font-variant-numeric:tabular-nums">' + item.count + '</span>';
    }
    h += '<span style="font-size:11px;color:var(--t3,#94A3B8);flex-shrink:0">→</span>';
    h += '</div>';
    return h;
  }

  function _renderActionsHTML() {
    var data = _getTodayActions();
    var items = [];

    if (data.overdueOffers.length) {
      items.push({ icon: '⏳', text: data.overdueOffers.length + ' satış teklifi 5+ gündür cevap bekliyor', count: data.overdueOffers.length, link: 'satis-teklifleri' });
    }
    if (data.pendingApprovals.length) {
      items.push({ icon: '📋', text: data.pendingApprovals.length + ' alış teklifi 7+ gündür onay bekliyor', count: data.pendingApprovals.length, link: 'satin-alma' });
    }
    if (data.overduePayments.length) {
      items.push({ icon: '💰', text: data.overduePayments.length + ' vadesi geçmiş tahsilat', count: data.overduePayments.length, link: 'muhasebe' });
    }
    if (data.arriving.length) {
      items.push({ icon: '🚢', text: data.arriving.length + ' konteyner bugün varış', count: data.arriving.length, link: 'lojistik' });
    }
    if (data.duePayments.length) {
      items.push({ icon: '📅', text: data.duePayments.length + ' yaklaşan ödeme (7 gün)', count: data.duePayments.length, link: 'muhasebe' });
    }
    data.pusulaTasks.forEach(function (task) {
      var t = task.baslik || task.title || task.gorev || task.aciklama || 'Görev';
      items.push({ icon: '✓', text: t, link: 'pusula' });
    });

    if (items.length === 0) {
      return '<div style="margin:0 0 20px 0;padding:18px 20px;background:#F0F8F4;border:0.5px solid #B5D9C6;border-radius:10px;color:#0F6E56;font-size:12px;text-align:center;font-style:italic">' +
             '✓ Bugün için kritik görev yok' +
             '</div>';
    }

    var html = '<div style="margin:0 0 20px 0;border:0.5px solid var(--b,#E2E8F0);border-radius:10px;background:var(--sf,#FFFFFF);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)">';
    html += '<div style="padding:12px 16px;background:var(--s2,#F0F3F8);border-bottom:0.5px solid var(--b,#E2E8F0);font-size:11px;font-weight:600;color:var(--t,#0F172A);letter-spacing:.02em;display:flex;align-items:center;justify-content:space-between">';
    html += '<span>Bugün Yapılacaklar</span>';
    html += '<span style="color:var(--t3,#94A3B8);font-weight:400;font-size:10px">' + items.length + ' madde</span>';
    html += '</div>';
    html += '<div>';
    items.forEach(function (item, idx) {
      html += _itemHTML(item, idx === items.length - 1);
    });
    html += '</div></div>';
    return html;
  }

  /* ════════════════════════════════════════════════════════════
   * INJECT — render sonrasi DOM'a panel ekle (idempotent)
   * ════════════════════════════════════════════════════════════ */
  function _inject() {
    var panel = document.getElementById('panel-dashboard');
    if (!panel) return;
    var wrapper = panel.firstElementChild;
    if (!wrapper) return;

    var existing = document.getElementById('v159-actions-wrap');
    var html = _renderActionsHTML();
    var freshWrap = '<div id="v159-actions-wrap">' + html + '</div>';

    if (existing) {
      existing.outerHTML = freshWrap;
      return;
    }

    /* Greeting+metric (section[0]) sonrasina, alert'lerden once */
    var firstSection = wrapper.children[0];
    var node = document.createElement('div');
    node.id = 'v159-actions-wrap';
    node.innerHTML = html;
    if (firstSection && firstSection.nextSibling) {
      wrapper.insertBefore(node, firstSection.nextSibling);
    } else if (firstSection) {
      wrapper.appendChild(node);
    } else {
      wrapper.insertBefore(node, wrapper.firstChild);
    }
  }

  /* ════════════════════════════════════════════════════════════
   * RENDER WRAP — V158 sonrasi en dis katman
   * ════════════════════════════════════════════════════════════ */
  function _wrap() {
    var orig = window.renderDashboard;
    if (typeof orig !== 'function') {
      console.warn('[V159] renderDashboard yok');
      return false;
    }
    if (window._origRenderDashboard_V159) return true;
    window._origRenderDashboard_V159 = orig;
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      setTimeout(_inject, 100);
      return r;
    };
    return true;
  }

  function _apply() {
    var ok = _wrap();
    if (document.getElementById('panel-dashboard')) {
      setTimeout(_inject, 150);
    }
    /* Periyodik refresh — 60 sn'de bir taze data */
    setInterval(function () {
      if (document.getElementById('panel-dashboard') && document.visibilityState === 'visible') {
        _inject();
      }
    }, 60000);

    /* Debug expose */
    window._getTodayActions = _getTodayActions;
    window._v159Status = { wrap: ok, applied: true };
    console.log('[V159 today actions] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 350); });
  } else {
    setTimeout(_apply, 350);
  }
  /* DASHBOARD-TODAY-ACTION-001 — V159 sonu */
})();
