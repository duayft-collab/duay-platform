/**
 * Duay Global Trade Company — Operasyon Platformu
 * Dosya:        src/modules/expected_deliveries_docs_ui.js
 * Açıklama:     Shipment Doc UI minimal — read-only modal (state badge + belge grid + history)
 * Anayasa Ref:  K01 (modül split), K03 (BELGE_META reuse), K04 (try/catch),
 *               K08 ('use strict' + JSDoc), K10 (null guard), XSS-KURAL-001 (lokal _esc)
 * Tarih:        2026-05-01
 * Versiyon:     1.0.0 (V124 — SHIPMENT-DOC-UI-MINIMAL-001)
 *
 * V124'te eklendi: ED ⋯ menüsünde "📦 Belgeler" buton, tıklanınca modal açar.
 * KAPSAM: read-only — alan düzenleme V125+'da (modal mutation extension).
 *
 * Modal içinde:
 * - Başlık: state badge + ED id + kapat
 * - 9 belge slot grid (yüklü ✓ / eksik ○)
 * - Yük/Paket/Yerleşim özet (kritik alanlar vurgulu)
 * - History tail (son 5)
 * - Footer: 3 buton (Console'a yaz / Geçmişi göster / Kapat)
 *
 * Public API: window._shipmentDocUiOpen(edId)
 */
(function() {
  'use strict';

  /* XSS-KURAL-001: 5-char HTML escape (lokal, dependency-free) */
  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  /* Belge slot ikon — yüklü mü? */
  function _belgeSlotIcon(value) {
    if (Array.isArray(value)) return value.length ? '✓' : '○';
    return value ? '✓' : '○';
  }

  /**
   * Modal HTML üret — read-only render.
   * @param {string} edId
   * @param {Object} sd shipmentDoc
   * @returns {string} HTML
   */
  function _renderModal(edId, sd) {
    const stateColor = window._shipmentDocStateColor(sd.state);
    const stateLabel = window._shipmentDocStateLabel(sd.state);
    const belgeMeta = window._shipmentDocBelgeMeta;
    const kritikAlanlar = window._shipmentDocKritikAlanlar;

    /* 9 belge slot grid */
    const belgeSlots = Object.keys(belgeMeta).map(function(slot) {
      const meta = belgeMeta[slot];
      const value = sd.belgeler[slot];
      const filled = (Array.isArray(value) ? value.length > 0 : !!value);
      const icon = filled ? '✓' : '○';
      const color = filled ? '#1A8D6F' : '#999';
      return '<div style="padding:8px 10px;border:1px solid #e5e5e5;border-radius:6px;background:' +
        (filled ? '#F0F9F5' : '#FAFAFA') + '">' +
        '<div style="font-size:18px;color:' + color + ';font-weight:600">' + icon + ' ' + _esc(meta.icon || '📄') + '</div>' +
        '<div style="font-size:11px;color:#666;margin-top:4px">' + _esc(meta.label || slot) + '</div>' +
        '</div>';
    }).join('');

    /* Yük özet — kritik alanlar vurgulu */
    function _row(label, path, value, unit) {
      const isKritik = kritikAlanlar.indexOf(path) !== -1;
      const borderLeft = isKritik ? 'border-left:3px solid #A32D2D;padding-left:8px;' : 'padding-left:11px;';
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;' + borderLeft + '">' +
        '<span style="color:#666;font-size:12px">' + _esc(label) + (isKritik ? ' ⚠' : '') + '</span>' +
        '<span style="font-weight:500">' + _esc(value === null || value === undefined || value === '' ? '—' : value) + (unit && value ? ' ' + _esc(unit) : '') + '</span>' +
        '</div>';
    }

    const yukRows = _row('Brüt kg', 'yuk.brutKg', sd.yuk.brutKg, 'kg') +
      _row('Net kg', 'yuk.netKg', sd.yuk.netKg, 'kg') +
      _row('Hacim', 'yuk.m3', sd.yuk.m3, 'm³') +
      _row('Yük tipi', 'yuk.tip', sd.yuk.tip) +
      _row('IMO', 'yuk.imo', sd.yuk.imo ? 'EVET' : 'HAYIR') +
      (sd.yuk.imo ? _row('UN No', 'yuk.unNo', sd.yuk.unNo) : '');

    const paketRows = _row('Paket tipi', 'paket.tip', sd.paket.tip) +
      _row('Adet', 'paket.adet', sd.paket.adet);

    const yerlRows = _row('Konteyner No', 'yerlesim.konteynerNo', sd.yerlesim.konteynerNo) +
      _row('Sıra', 'yerlesim.sira', sd.yerlesim.sira) +
      _row('Katman', 'yerlesim.katman', sd.yerlesim.katman);

    /* History tail (son 5) */
    const historyHtml = sd.history.length === 0
      ? '<div style="padding:12px;color:#999;text-align:center;font-size:12px">Henüz kayıt yok</div>'
      : sd.history.slice(-5).reverse().map(function(h) {
          const meta = window._shipmentDocAuditMeta(h.action) || { icon: '?', label: h.action };
          const sevColor = h.severity === 'CRIT' ? '#A32D2D' : (h.severity === 'WARN' ? '#C77B0F' : '#1A8D6F');
          return '<div style="padding:8px;border-bottom:1px solid #f0f0f0;font-size:12px">' +
            '<span style="color:' + sevColor + ';font-weight:600">' + _esc(meta.icon) + '</span> ' +
            '<span style="color:#333">' + _esc(meta.label) + '</span> ' +
            '<span style="color:#999;font-size:11px">— ' + _esc(window._shipmentDocMaskName(h.uname || '?')) + ', ' + _esc((h.ts || '').slice(0, 19).replace('T', ' ')) + '</span>' +
            (h.reason ? '<div style="margin-top:4px;color:#666;padding-left:18px">📝 ' + _esc(h.reason) + '</div>' : '') +
            '</div>';
        }).join('');

    /* Sayılar */
    const filledBelgeler = Object.keys(belgeMeta).filter(function(slot) {
      const v = sd.belgeler[slot];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    const totalBelgeler = Object.keys(belgeMeta).length;

    return '<div id="sd-ui-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this) window._shipmentDocUiClose()">' +
      '<div style="background:#fff;border-radius:12px;max-width:760px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 12px 48px rgba(0,0,0,0.2)">' +
        /* HEADER */
        '<div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="font-size:22px">📦</span>' +
            '<div>' +
              '<div style="font-size:14px;font-weight:600">Sevkiyat Belgeleri</div>' +
              '<div style="font-size:11px;color:#999;font-family:monospace">ED #' + _esc(edId) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span style="background:' + stateColor.bg + ';color:' + stateColor.fg + ';border:1px solid ' + stateColor.border + ';padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600">' + _esc(stateLabel) + '</span>' +
            '<button type="button" onclick="window._shipmentDocUiClose()" style="background:transparent;border:none;font-size:22px;color:#666;cursor:pointer;padding:0 4px" title="Kapat">×</button>' +
          '</div>' +
        '</div>' +
        /* BODY */
        '<div style="padding:20px">' +
          /* Belge grid */
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<div style="font-weight:600;font-size:13px">📎 Belgeler</div>' +
            '<div style="font-size:12px;color:#666">' + filledBelgeler + ' / ' + totalBelgeler + ' yüklü</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">' + belgeSlots + '</div>' +
          /* 3 sütun: Yük / Paket / Yerleşim */
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">' +
            '<div><div style="font-weight:600;font-size:13px;margin-bottom:6px">📊 Yük</div>' + yukRows + '</div>' +
            '<div><div style="font-weight:600;font-size:13px;margin-bottom:6px">📦 Paket</div>' + paketRows + '</div>' +
            '<div><div style="font-weight:600;font-size:13px;margin-bottom:6px">🚛 Yerleşim</div>' + yerlRows + '</div>' +
          '</div>' +
          /* History (toggle) */
          '<div id="sd-ui-history" style="display:none">' +
            '<div style="font-weight:600;font-size:13px;margin-bottom:6px">📜 Geçmiş (son 5)</div>' +
            '<div style="border:1px solid #f0f0f0;border-radius:6px;background:#fafafa">' + historyHtml + '</div>' +
          '</div>' +
        '</div>' +
        /* FOOTER */
        '<div style="padding:14px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end">' +
          '<button type="button" onclick="window._shipmentDocProbe(\'' + _esc(edId) + '\')" style="padding:8px 14px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:12px" title="Ayrıntıları DevTools console\'a yazar">🧪 Console</button>' +
          '<button type="button" onclick="document.getElementById(\'sd-ui-history\').style.display=document.getElementById(\'sd-ui-history\').style.display===\'none\'?\'block\':\'none\'" style="padding:8px 14px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:12px">📜 Geçmişi göster/gizle</button>' +
          '<button type="button" onclick="window._shipmentDocUiClose()" style="padding:8px 14px;border:none;background:#222;color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500">Kapat</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /**
   * Modal'ı kapat (DOM'dan kaldır).
   */
  window._shipmentDocUiClose = function() {
    const el = document.getElementById('sd-ui-backdrop');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  /**
   * Shipment Doc modal'ını aç (read-only).
   * Doc yoksa otomatik oluştur (idempotent).
   * @param {string} edId
   */
  window._shipmentDocUiOpen = function(edId) {
    if (!edId) return;

    /* Önceki açık modal varsa kapat */
    window._shipmentDocUiClose();

    /* Sd erişimi public API üzerinden */
    let sd = window._shipmentDocGet(edId);

    /* Doc yoksa idempotent auto-create */
    if (!sd) {
      const r = window._shipmentDocCreate(edId);
      if (!r.success) {
        const msg = r.error === 'ed_not_found' ? 'ED bulunamadı' : 'Doc oluşturulamadı';
        if (typeof window.toast === 'function') window.toast(msg, 'err');
        return;
      }
      sd = r.sd;
    }

    /* HTML oluştur ve DOM'a ekle */
    let html;
    try {
      html = _renderModal(edId, sd);
    } catch (e) {
      console.error('[SHIPMENT-DOC-UI] render fail:', e && e.message);
      if (typeof window.toast === 'function') window.toast('Modal açılamadı', 'err');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

    /* Esc tuşu ile kapatma */
    const escHandler = function(e) {
      if (e.key === 'Escape') {
        window._shipmentDocUiClose();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };

})();
