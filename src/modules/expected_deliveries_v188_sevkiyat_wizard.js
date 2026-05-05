/* ════════════════════════════════════════════════════════════════
 * V188a — SEVKİYAT WIZARD (Tek-step modal)
 * ════════════════════════════════════════════════════════════════
 * Mimari ayrım: Konteyner/Armatör/Tracking/Varış Zamanı alanları
 * V186 wizard Step 2'den çıkarıldı, bu wizard'a taşındı.
 *
 * Trigger: ⋮ aksiyon menüsünde "🚛 Sevkiyat Bilgisi"
 * Save flow: V187d carrier auto-tracking korunur, K05 audit log,
 *            24h+ non-admin → _edRequestApproval (admin onayı kuyruğu).
 *
 * KX9: Hedef ≤ 700 satır (yeni dosya, başlangıç ~230 satır).
 * KX10: V187d `__buildTrackingUrl` (carrier_tracking_map.js) tek kaynak.
 * ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var LOG_PREFIX = '[V188-SEVKIYAT]';

  /* ─── i18n + toast helper'ları ─── */
  function _t(key) { return (typeof window.t === 'function') ? window.t(key) : key; }
  function _toast(msg, kind) { if (typeof window.toast === 'function') window.toast(msg, kind || 'ok'); }

  /* ─── State (modal açıkken doldurulur, kapanınca temizlenir) ─── */
  var state = {
    edId: null,
    formData: {}     // { konteynerNo, armator, trackingUrl, varisZamani }
  };

  /* ─── HTML escape (V186 wizard'ın esc() ile birebir aynı) ─── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _val(v) { return v == null ? '' : esc(v); }

  /* ─── Stil sabitleri (V186 wizard ile uyumlu) ─── */
  var INPUT_CSS = 'width:100%;padding:8px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t);font-size:13px;font-family:inherit;box-sizing:border-box';
  function lbl(text) {
    return '<div style="font-size:10px;font-weight:600;color:var(--t2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em">' + esc(text) + '</div>';
  }

  /* ─── Armatör listesi (V186 wizard ile aynı liste — KX10) ─── */
  var ARMATOR_LIST = ['', 'MSC', 'Maersk', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'Yang Ming', 'HMM', 'ZIM', 'PIL', 'OOCL', 'Diger'];

  /* ─── State setter ─── */
  window._v188SetField = function (key, value) { state.formData[key] = value; };

  /* ─── V187d auto-tracking URL (armatör + konteyner değişiminde) ─── */
  window._v188AutoTrackingUrl = function () {
    var armator = document.getElementById('v188-armator')?.value || state.formData.armator || '';
    var containerNo = document.getElementById('v188-konteynerNo')?.value || state.formData.konteynerNo || '';
    var input = document.getElementById('v188-trackingUrl');
    if (!input || !armator) return;
    var url = (typeof window.__buildTrackingUrl === 'function')
      ? window.__buildTrackingUrl(armator, containerNo)
      : '';
    if (url) {
      input.value = url;
      state.formData.trackingUrl = url;
    }
  };

  /* ─── Modal HTML ─── */
  function modalHtml(ed) {
    var ihrId = ed.ihracatId || ed.id || '';
    var d = state.formData;
    return '<div style="background:var(--sf);color:var(--t);width:520px;max-width:92vw;max-height:90vh;overflow-y:auto;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:inherit" onclick="event.stopPropagation()">'
      /* Başlık */
      + '<div style="padding:16px 20px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      +   '<div style="font-size:14px;font-weight:600">' + esc(_t('ed.sevkiyat.wizard.title')) + '<span style="font-weight:400;color:var(--t3);font-size:12px;margin-left:6px">— ' + esc(ihrId) + '</span></div>'
      +   '<button onclick="window._edSevkiyatWizardClose && window._edSevkiyatWizardClose()" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:var(--t3);padding:0 4px">✕</button>'
      + '</div>'
      /* Form (4 alan) */
      + '<div style="padding:20px;display:grid;grid-template-columns:1fr;gap:14px">'
      +   '<div>' + lbl(_t('ed.label.konteynerNo'))
      +     '<input type="text" id="v188-konteynerNo"'
      +       ' oninput="window._v188SetField(\'konteynerNo\', this.value); window._v188AutoTrackingUrl && window._v188AutoTrackingUrl()"'
      +       ' value="' + _val(d.konteynerNo) + '"'
      +       ' placeholder="MSCU1234567" style="' + INPUT_CSS + '">'
      +   '</div>'
      +   '<div>' + lbl(_t('ed.label.armator'))
      +     '<select id="v188-armator"'
      +       ' onchange="window._v188SetField(\'armator\', this.value); window._v188AutoTrackingUrl && window._v188AutoTrackingUrl()"'
      +       ' style="' + INPUT_CSS + '">'
      +     ARMATOR_LIST.map(function (c) {
              return '<option value="' + esc(c) + '"' + ((d.armator || '') === c ? ' selected' : '') + '>'
                + (c || _t('ed.armator.empty')) + '</option>';
            }).join('')
      +     '</select>'
      +   '</div>'
      +   '<div>' + lbl(_t('ed.label.trackingUrl'))
      +     '<div style="display:flex;gap:6px;align-items:stretch">'
      +       '<input type="url" id="v188-trackingUrl"'
      +         ' oninput="window._v188SetField(\'trackingUrl\', this.value)"'
      +         ' value="' + _val(d.trackingUrl) + '"'
      +         ' placeholder="https://..." style="' + INPUT_CSS + ';flex:1">'
      +       '<button type="button"'
      +         ' onclick="(function(){var u=document.getElementById(\'v188-trackingUrl\')?.value; if(u) window.open(u,\'_blank\',\'noopener,noreferrer\');})()"'
      +         ' style="padding:8px 14px;border:0.5px solid var(--b);background:var(--s2);color:var(--t2);border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap"'
      +         ' title="Yeni sekmede aç">🔗 Aç</button>'
      +     '</div>'
      +   '</div>'
      +   '<div>' + lbl(_t('ed.label.varisZamani'))
      +     '<input type="datetime-local"'
      +       ' oninput="window._v188SetField(\'varisZamani\', this.value)"'
      +       ' value="' + _val(d.varisZamani) + '" style="' + INPUT_CSS + '">'
      +   '</div>'
      + '</div>'
      /* Footer (İptal / Kaydet) */
      + '<div style="padding:14px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;gap:8px">'
      +   '<button onclick="window._edSevkiyatWizardClose && window._edSevkiyatWizardClose()" style="padding:8px 16px;border:0.5px solid var(--b);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;color:var(--t2);font-family:inherit">' + _t('ed.wizard.btn.cancel') + '</button>'
      +   '<button onclick="window._edSevkiyatWizardSave && window._edSevkiyatWizardSave()" style="padding:8px 22px;border:none;border-radius:8px;background:#16A34A;color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit">' + _t('ed.wizard.btn.save') + '</button>'
      + '</div>'
      + '</div>';
  }

  /* ─── Modal aç (⋮ menüden tetiklenir) ─── */
  window._edSevkiyatWizardAc = function (edId) {
    var list = (typeof window.loadExpectedDeliveries === 'function')
      ? (window.loadExpectedDeliveries({ raw: true }) || [])
      : [];
    var ed = list.find(function (e) { return String(e.id) === String(edId); });
    if (!ed) { _toast(_t('ed.toast.sevkiyatNotFound'), 'err'); return; }

    state.edId = edId;
    state.formData = {
      konteynerNo:  ed.konteynerNo || '',
      armator:      ed.armator || '',
      trackingUrl:  ed.trackingUrl || '',
      varisZamani:  ed.varisZamani || ''
    };

    var ex = document.getElementById('ed-sevkiyat-modal'); if (ex) ex.remove();
    var mo = document.createElement('div');
    mo.id = 'ed-sevkiyat-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function (e) { if (e.target === mo) window._edSevkiyatWizardClose(); };
    mo.innerHTML = modalHtml(ed);
    document.body.appendChild(mo);
  };

  /* ─── Modal kapat ─── */
  window._edSevkiyatWizardClose = function () {
    var m = document.getElementById('ed-sevkiyat-modal');
    if (m) m.remove();
    state.edId = null;
    state.formData = {};
  };

  /* ─── Save (V186 wizard ile aynı approval flow + K05 audit) ─── */
  window._edSevkiyatWizardSave = function () {
    if (!state.edId) { _toast(_t('ed.toast.sevkiyatNotFound'), 'err'); return; }
    if (typeof window.loadExpectedDeliveries !== 'function' || typeof window.storeExpectedDeliveries !== 'function') {
      _toast('Storage erişilemiyor', 'err');
      return;
    }

    var list = window.loadExpectedDeliveries({ raw: true }) || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(state.edId)) { idx = i; break; }
    }
    if (idx === -1) { _toast(_t('ed.toast.sevkiyatNotFound'), 'err'); return; }

    var ed = list[idx];
    var d = state.formData;
    var nowIso = new Date().toISOString();
    var cu = (typeof window.CU === 'function') ? (window.CU() || {}) : {};

    /* 24h+ + non-admin → admin onayı kuyruğuna gönder (V186/edit pattern) */
    var isAdmin = (typeof window._edIsAdmin === 'function') ? window._edIsAdmin() : false;
    var olderThan24h = (typeof window._edIsOlderThan24h === 'function') ? window._edIsOlderThan24h(ed) : false;
    if (!isAdmin && olderThan24h) {
      var payload = {
        konteynerNo:  d.konteynerNo || '',
        armator:      d.armator || '',
        trackingUrl:  d.trackingUrl || '',
        varisZamani:  d.varisZamani || ''
      };
      if (typeof window._edRequestApproval === 'function') {
        var r = window._edRequestApproval('update', state.edId, payload);
        if (r && r.success === false) return; // dedup → toast _edRequestApproval içinde
      }
      window._edSevkiyatWizardClose();
      _toast(_t('ed.toast.editRequestSent'), 'ok');
      return;
    }

    /* Direct save */
    list[idx].konteynerNo  = d.konteynerNo || '';
    list[idx].armator      = d.armator || '';
    list[idx].trackingUrl  = d.trackingUrl || '';
    list[idx].varisZamani  = d.varisZamani || '';
    list[idx].updatedAt    = nowIso;
    list[idx].updatedBy    = cu.id || cu.uid || null;
    list[idx].updatedByName = cu.name || cu.displayName || '—';

    window.storeExpectedDeliveries(list);

    /* K05: audit log */
    try {
      if (typeof window.logActivity === 'function') {
        window.logActivity('ed_sevkiyat_updated', 'edId=' + state.edId + ' konteynerNo=' + (d.konteynerNo || '-') + ' armator=' + (d.armator || '-'));
      }
    } catch (e) {}

    _toast(_t('ed.toast.sevkiyatSaved'), 'ok');
    window._edSevkiyatWizardClose();

    /* UI refresh */
    if (typeof window._edRefresh === 'function') {
      try { window._edRefresh(); } catch (e) {}
    } else if (typeof window.renderEdList === 'function') {
      try {
        var c = document.getElementById('ed-list-container');
        if (c) c.outerHTML = window.renderEdList();
      } catch (e) {}
    }
  };

  /* ─── Boot log (debug için, console.log değil _t kullanmıyor — modül yüklendi sinyali) ─── */
  if (typeof console !== 'undefined' && console.info) {
    try { console.info(LOG_PREFIX, 'loaded'); } catch (e) {}
  }
})();
