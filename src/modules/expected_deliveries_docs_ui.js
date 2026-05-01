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

  /* SHIPMENT-DOC-UI-EDIT-001: type registry — alan tipini belirler (V126) */
  const FIELD_TYPES = Object.freeze({
    'yuk.brutKg': 'number', 'yuk.netKg': 'number', 'yuk.m3': 'number',
    'yuk.tip': 'select:kati,sivi,gaz,toz,karisik',
    'yuk.imo': 'boolean', 'yuk.unNo': 'string',
    'paket.tip': 'select:palet,karton,koli,bigbag,fici,kasa',
    'paket.adet': 'number',
    'yerlesim.konteynerNo': 'string', 'yerlesim.sira': 'number', 'yerlesim.katman': 'number'
  });

  /* SHIPMENT-DOC-UI-EXTRACT-001: TIR-share helper'ları expected_deliveries_docs_ui_apply.js'e taşındı (V130). window._sdApply ile erişim. */

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
    const belgeMeta = window._shipmentDocUtil.BELGE_META;
    const kritikAlanlar = window._shipmentDocUtil.KRITIK_ALANLAR;

    /* 9 belge slot grid (V127: tıklanabilir, filename + indir + zorunlu *) */
    const belgeSlots = Object.keys(belgeMeta).map(function(slot) {
      const meta = belgeMeta[slot];
      const value = sd.belgeler[slot];
      const filled = (Array.isArray(value) ? value.length > 0 : !!value);
      const icon = filled ? '✓' : '○';
      const color = filled ? '#1A8D6F' : '#999';
      /* SHIPMENT-DOC-UPLOAD-001: filled state'te filename, multi'de count (V127) */
      let displayName = meta.label || slot;
      let downloadUrl = '';
      if (filled && !meta.multi && value && value.filename) {
        /* Single-file: filename kısalt (max 22 char, uzun ise ortadan …) */
        displayName = value.filename.length > 22
          ? value.filename.substring(0, 10) + '…' + value.filename.substring(value.filename.length - 10)
          : value.filename;
        downloadUrl = value.url || '';
      } else if (filled && meta.multi && Array.isArray(value)) {
        displayName = value.length + ' dosya';
      }
      /* SHIPMENT-DOC-UPLOAD-001: zorunlu * indicator (V127) */
      const zorunluPrefix = meta.zorunlu ? '<span style="color:#A32D2D;font-weight:700">* </span>' : '';
      /* SHIPMENT-DOC-UPLOAD-001: KAPALI guard + click handler (V127) */
      const isKapali = sd.state === 'KAPALI';
      const slotOnclick = isKapali ? '' : ' onclick="event.stopPropagation();window.' + (filled ? '_shipmentDocUiSlotView' : '_shipmentDocUiUploadFile') + '(\'' + _esc(edId) + '\',\'' + _esc(slot) + '\')"';
      const slotCursor = isKapali ? 'cursor:not-allowed;opacity:0.6' : 'cursor:pointer';
      const slotTitle = isKapali ? ' title="KAPALI — değiştirilemez"' : (filled ? ' title="Tıkla: değiştir"' : ' title="Tıkla: dosya yükle"');
      /* İndir link (filled + url varsa, slot click'e propagate olmaz) */
      const downloadLink = downloadUrl
        ? '<a href="' + _esc(downloadUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="position:absolute;bottom:4px;right:6px;font-size:11px;color:#1976D2;text-decoration:none" title="İndir">↓</a>'
        : '';
      /* SHIPMENT-DOC-TIR-SHARE-BADGE-001: paylaşımlı belge badge (V131, sağ üst, count >= 2) */
      let sharedBadge = '';
      if (filled && window._sdApply && typeof window._sdApply.countSharedEds === 'function') {
        try {
          const sharedCount = window._sdApply.countSharedEds(slot, value);
          if (sharedCount >= 2) {
            sharedBadge = '<div title="Bu belge ' + sharedCount + ' ED\'de paylaşılıyor" style="position:absolute;top:4px;right:6px;font-size:10px;color:#1976D2;background:#E3F2FD;padding:2px 5px;border-radius:8px;font-weight:600;pointer-events:none">🔗 ' + sharedCount + '</div>';
          }
        } catch (e) { /* defensive: badge ekleme başarısızsa skip */ }
      }
      /* SHIPMENT-DOC-DELETE-001: silme butonu (V132, sol alt köşe, KAPALI guard) */
      let deleteBtn = '';
      if (filled && !isKapali) {
        deleteBtn = '<a href="javascript:void(0)" onclick="event.stopPropagation();window._shipmentDocUiDeleteSlot(\'' + _esc(edId) + '\',\'' + _esc(slot) + '\')" style="position:absolute;bottom:4px;left:6px;font-size:11px;color:#C62828;text-decoration:none;font-weight:600" title="Belgeyi sil (30sn undo)">🗑</a>';
      }
      return '<div' + slotOnclick + slotTitle + ' style="position:relative;padding:8px 10px;border:1px solid #e5e5e5;border-radius:6px;background:' +
        (filled ? '#F0F9F5' : '#FAFAFA') + ';' + slotCursor + '">' +
        '<div style="font-size:18px;color:' + color + ';font-weight:600">' + icon + ' ' + _esc(meta.icon || '📄') + '</div>' +
        '<div style="font-size:11px;color:#666;margin-top:4px;word-break:break-all">' + zorunluPrefix + _esc(displayName) + '</div>' +
        downloadLink +
        sharedBadge +
        deleteBtn +
        '</div>';
    }).join('');

    /* Yük özet — kritik alanlar vurgulu */
    function _row(label, path, value, unit) {
      const isKritik = kritikAlanlar.indexOf(path) !== -1;
      const borderLeft = isKritik ? 'border-left:3px solid #A32D2D;padding-left:8px;' : 'padding-left:11px;';
      /* SHIPMENT-DOC-UI-EDIT-001: KAPALI ise non-editable, diğer state'lerde click-to-edit (V126) */
      const isKapali = sd.state === 'KAPALI';
      const fieldType = FIELD_TYPES[path] || 'string';
      const onclickAttr = isKapali ? '' : ' onclick="event.stopPropagation();window._shipmentDocUiEditField(\'' + _esc(edId) + '\',\'' + _esc(path) + '\',\'' + _esc(fieldType) + '\',this)"';
      const cursorStyle = isKapali ? 'cursor:not-allowed;opacity:0.6' : 'cursor:pointer';
      const titleAttr = isKapali ? ' title="KAPALI — değiştirilemez"' : ' title="Düzenlemek için tıkla"';
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;' + borderLeft + '">' +
        '<span style="color:#666;font-size:12px">' + _esc(label) + (isKritik ? ' ⚠' : '') + '</span>' +
        '<span data-sd-path="' + _esc(path) + '"' + onclickAttr + titleAttr + ' style="font-weight:500;' + cursorStyle + ';padding:2px 6px;border-radius:3px">' + _esc(value === null || value === undefined || value === '' ? '—' : value) + (unit && value ? ' ' + _esc(unit) : '') + '</span>' +
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

  /* SHIPMENT-DOC-UI-EDIT-001: alan tıklandığında inline edit modu (V126) */

  /* Aktif edit input'unu takip et — tek seferde tek alan editable */
  let _activeEditInput = null;

  /**
   * Field span'ına tıklandığında çağrılır.
   * Span'ı input'a dönüştürür, blur/Enter ile save tetikler, Esc ile cancel.
   * @param {string} edId expected delivery id
   * @param {string} path dotted path (ör. 'yuk.brutKg')
   * @param {string} fieldType FIELD_TYPES değeri ('number', 'string', 'boolean', 'select:opt1,opt2')
   * @param {HTMLElement} spanEl tıklanan span (this)
   */
  window._shipmentDocUiEditField = function(edId, path, fieldType, spanEl) {
    /* Önceki edit varsa cancel et (tek seferde tek input) */
    if (_activeEditInput && _activeEditInput.parentNode) {
      _activeEditInput._cancel && _activeEditInput._cancel();
    }

    const sd = window._shipmentDocGet(edId);
    if (!sd || sd.state === 'KAPALI') {
      window.toast && window.toast('Bu alan düzenlenemez', 'err');
      return;
    }

    /* Mevcut değeri sd objesinden al (ham, formatlı değil) */
    const parts = path.split('.');
    let currentVal = sd;
    for (let i = 0; i < parts.length; i++) currentVal = currentVal && currentVal[parts[i]];
    if (currentVal === null || currentVal === undefined) currentVal = '';

    /* Span'ın orijinal HTML'ini sakla (cancel için) */
    const originalHtml = spanEl.innerHTML;

    /* Type'a göre input oluştur */
    let inputEl;
    if (fieldType.indexOf('select:') === 0) {
      const opts = fieldType.substring(7).split(',');
      inputEl = document.createElement('select');
      inputEl.innerHTML = '<option value="">—</option>' +
        opts.map(function(o) {
          return '<option value="' + _esc(o) + '"' + (String(currentVal) === o ? ' selected' : '') + '>' + _esc(o) + '</option>';
        }).join('');
    } else if (fieldType === 'boolean') {
      inputEl = document.createElement('select');
      inputEl.innerHTML = '<option value="">—</option><option value="true"' + (currentVal === true ? ' selected' : '') + '>EVET</option><option value="false"' + (currentVal === false ? ' selected' : '') + '>HAYIR</option>';
    } else {
      inputEl = document.createElement('input');
      inputEl.type = fieldType === 'number' ? 'number' : 'text';
      inputEl.value = String(currentVal);
    }
    inputEl.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #1976D2;border-radius:3px;width:120px;text-align:right;font-family:inherit';

    /* Cancel handler */
    inputEl._cancel = function() {
      spanEl.style.display = '';
      if (inputEl.parentNode) inputEl.parentNode.removeChild(inputEl);
      _activeEditInput = null;
    };

    /* Save handler */
    inputEl._save = function() {
      let newVal = inputEl.value;
      if (fieldType === 'number') newVal = newVal === '' ? null : Number(newVal);
      else if (fieldType === 'boolean') newVal = newVal === '' ? null : (newVal === 'true');
      else if (newVal === '') newVal = null;

      if (newVal === currentVal) { inputEl._cancel(); return; }

      /* Kritik alan + HAZIR/ONAYLI state → REVIEW prompt */
      const kritikAlanlar = window._shipmentDocUtil.KRITIK_ALANLAR;
      const isKritik = kritikAlanlar.indexOf(path) !== -1;
      const needsReason = isKritik && (sd.state === 'HAZIR' || sd.state === 'ONAYLI');

      const doSave = function(reason) {
        const opts = reason ? { reason: reason } : {};
        const result = window._shipmentDocUpdate(edId, path, newVal, opts);
        if (result && result.success !== false) {
          window.toast && window.toast('Kaydedildi: ' + path, 'ok');
          /* Modal'ı yeniden render et (idempotent — V124 _shipmentDocUiOpen önce kapatır sonra açar) */
          window._shipmentDocUiOpen(edId);
        } else {
          window.toast && window.toast('Kaydedilemedi: ' + (result && result.error || 'bilinmeyen'), 'err');
          inputEl._cancel();
        }
      };

      if (needsReason) {
        const reason = prompt('⚠ Kritik alan değişiyor (' + path + '). Sebep:');
        if (reason && reason.trim()) doSave(reason.trim());
        else inputEl._cancel();
      } else {
        doSave();
      }
    };

    /* Event handlers */
    inputEl.addEventListener('blur', inputEl._save);
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); inputEl._save(); }
      else if (e.key === 'Escape') { e.preventDefault(); inputEl._cancel(); }
    });

    /* Span'ı gizle, input'u inject et */
    spanEl.style.display = 'none';
    spanEl.parentNode.insertBefore(inputEl, spanEl.nextSibling);
    _activeEditInput = inputEl;
    inputEl.focus();
    if (inputEl.select) inputEl.select();
  };

  /* SHIPMENT-DOC-UPLOAD-001: belge slot dosya yükleme (V127) */

  /**
   * Belge slot tıklandığında çağrılır. Hidden file input açar, base64
   * dönüştürür, _uploadBase64ToStorage ile Firebase'e yükler, sd.belgeler
   * objesini günceller.
   * @param {string} edId expected delivery id
   * @param {string} slot slot key (ör. 'irsaliye', 'kantar')
   */
  /**
   * Belge slot tıklandığında çağrılır. Hidden file input açar (multi ise multiple),
   * her dosya için base64 + _uploadBase64ToStorage, sd.belgeler güncellenir.
   * Single: replace confirm + tek slotMeta. Multi: append, confirm yok, batch.
   * @param {string} edId expected delivery id
   * @param {string} slot slot key (ör. 'irsaliye', 'soforFotos')
   */
  window._shipmentDocUiUploadFile = function(edId, slot) {
    /* Auto-create defensive (sd null ise yarat — fn no-arg, kendi fallback'ini kullanır) */
    let sd = window._shipmentDocGet(edId);
    if (!sd) {
      window._shipmentDocCreate(edId);
      sd = window._shipmentDocGet(edId);
    }
    if (!sd) { window.toast && window.toast('Belge takip dosyası açılamadı', 'err'); return; }
    if (sd.state === 'KAPALI') { window.toast && window.toast('Bu ED kapalı, dosya yüklenemez', 'err'); return; }

    const meta = window._shipmentDocUtil.BELGE_META[slot];
    if (!meta) { window.toast && window.toast('Bilinmeyen slot: ' + slot, 'err'); return; }

    /* SHIPMENT-DOC-MULTI-FILE-001: replace confirm SADECE single'da (V128) */
    if (!meta.multi) {
      const existingValue = sd.belgeler[slot];
      if (existingValue && !confirm('Bu slotta zaten dosya var: ' + (existingValue.filename || 'dosya') + '\n\nDeğiştirmek istiyor musunuz?')) {
        return;
      }
    }

    /* Hidden file input yarat (multi ise multiple attr) */
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = (meta.mimes || []).map(function(m) { return '.' + m; }).join(',');
    if (meta.multi) inp.multiple = true;
    inp.style.display = 'none';
    document.body.appendChild(inp);

    inp.onchange = async function() {
      const files = inp.files ? Array.from(inp.files) : [];
      if (inp.parentNode) document.body.removeChild(inp);
      if (files.length === 0) return;

      /* SHIPMENT-DOC-MULTI-FILE-001: sıralı upload, per-file try/catch (V128) */
      const successList = [];
      const failList = [];
      const newSlotMetas = [];

      window.toast && window.toast(files.length === 1 ? 'Yükleniyor: ' + files[0].name : files.length + ' dosya yükleniyor...', '');

      for (const file of files) {
        try {
          /* Per-file MIME validation */
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          if (meta.mimes && meta.mimes.indexOf(ext) === -1) {
            failList.push(file.name + ' (geçersiz tip)');
            continue;
          }
          /* Per-file boyut kontrolü 10MB */
          const MAX_SIZE = 10 * 1024 * 1024;
          if (file.size > MAX_SIZE) {
            failList.push(file.name + ' (>10MB)');
            continue;
          }
          /* Base64 dönüşüm */
          const base64 = await new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { reject(new Error('FileReader hatası')); };
            reader.readAsDataURL(file);
          });
          /* Storage upload */
          if (typeof window._uploadBase64ToStorage !== 'function') {
            throw new Error('Storage API yok');
          }
          const downloadUrl = await window._uploadBase64ToStorage(base64, file.name, 'shipment-docs/' + edId);
          /* SlotMeta */
          newSlotMetas.push({
            url: downloadUrl,
            filename: file.name,
            size: file.size,
            mime: ext,
            uploadedAt: new Date().toISOString(),
            uploadedBy: (window._shipmentDocUtil && window._shipmentDocUtil.cuId && window._shipmentDocUtil.cuId()) || 'system'
          });
          successList.push(file.name);
        } catch (e) {
          failList.push(file.name + ' (' + (e.message || 'hata') + ')');
        }
      }

      /* SHIPMENT-DOC-TIR-SHARE-001: uploadGroupId enjekte + SHARED slot check (V129, V130'da _sdApply'a delege) */
      if (newSlotMetas.length > 0) {
        /* uploadGroupId enjekte (her batch unique) */
        const uploadGroupId = (window._sdApply && typeof window._sdApply.genUploadGroupId === 'function') ? window._sdApply.genUploadGroupId() : null;
        if (uploadGroupId) {
          for (let i = 0; i < newSlotMetas.length; i++) {
            newSlotMetas[i].uploadGroupId = uploadGroupId;
          }
        }
        /* SHARED slot + grup detect */
        const isSharedSlot = !!(window._sdApply && window._sdApply.SHARED_SLOTS && window._sdApply.SHARED_SLOTS.indexOf(slot) >= 0);
        let ed = null, konteynerNo = null, groupedEds = [];
        if (isSharedSlot && typeof window.loadExpectedDeliveries === 'function') {
          try {
            const allEds = window.loadExpectedDeliveries({raw: true}) || [];
            for (let i = 0; i < allEds.length; i++) {
              if (allEds[i] && allEds[i].id === edId) { ed = allEds[i]; break; }
            }
            konteynerNo = ed && ed.konteynerNo;
            groupedEds = (window._sdApply && typeof window._sdApply.findGroupedEds === 'function') ? window._sdApply.findGroupedEds(edId, konteynerNo) : [];
          } catch (e) { /* defensive: SHARED check başarısızsa V128 davranış */ }
        }
        /* Branch: multi-ED vs single-ED */
        if (groupedEds.length > 0 && window._sdApply) {
          /* Apply-modal göster, callback'te multi-ED save */
          window._sdApply.showApplyModal(edId, (ed && ed.productName) || '—', groupedEds, slot, successList, function(selectedEdIds) {
            const r = window._sdApply.saveToMultipleEds(selectedEdIds, slot, newSlotMetas, meta);
            if (r.failEdIds.length === 0) {
              window.toast && window.toast(successList.length + ' dosya × ' + r.successEdIds.length + ' ED\'ye yüklendi', 'ok');
            } else {
              window.toast && window.toast(r.successEdIds.length + ' ED OK, ' + r.failEdIds.length + ' fail: ' + r.failEdIds.join(', '), 'err');
            }
            window._shipmentDocUiOpen(edId);
          });
        } else {
          /* V128 davranış: tek ED save */
          const r = (window._sdApply && typeof window._sdApply.saveToSingleEd === 'function')
            ? window._sdApply.saveToSingleEd(edId, slot, newSlotMetas, meta)
            : { success: false, error: '_sdApply yok' };
          if (r && r.success !== false) {
            if (failList.length === 0) {
              window.toast && window.toast(successList.length === 1 ? 'Yüklendi: ' + successList[0] : successList.length + ' dosya yüklendi', 'ok');
            } else {
              window.toast && window.toast(successList.length + ' başarılı, ' + failList.length + ' başarısız: ' + failList.join(', '), 'err');
            }
            window._shipmentDocUiOpen(edId);
          } else {
            window.toast && window.toast('Kayıt başarısız: ' + (r && r.error || 'bilinmeyen'), 'err');
          }
        }
      } else {
        /* Hiçbir dosya başarılı değil */
        window.toast && window.toast('Tüm dosyalar başarısız: ' + failList.join(', '), 'err');
      }
    };

    /* File picker'ı tetikle */
    inp.click();
  };

  /* SHIPMENT-DOC-UI-VIEW-EXTRACT-001 (V133.2.refactor): _shipmentDocUiSlotView fn ui_view.js'e taşındı (K01 borç kapatma). */

  /* SHIPMENT-DOC-LIST-PROGRESS-001: card badge HTML üretici (V125) */

  /**
   * ED card top-right için kompakt belge progress badge HTML üret.
   * Doc yoksa boş string döner (gürültü yok).
   * Tıklanınca _shipmentDocUiOpen çağrılır.
   * @param {Object} ed expected delivery objesi
   * @returns {string} HTML veya boş string
   */
  window._shipmentDocCardBadgeHtml = function(ed) {
    if (!ed || !ed.shipmentDoc) return '';
    const sd = ed.shipmentDoc;
    const stateColor = window._shipmentDocStateColor(sd.state);
    const stateLabel = window._shipmentDocStateLabel(sd.state);

    /* Belge sayısı (BELGE_META frozen ref reuse) */
    const belgeMeta = window._shipmentDocUtil.BELGE_META;
    const belgeKeys = Object.keys(belgeMeta);
    const total = belgeKeys.length;
    const filled = belgeKeys.filter(function(slot) {
      const v = sd.belgeler[slot];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;

    /* State'e göre içerik (mikro tasarım 1) */
    let inner;
    if (sd.state === 'KAPALI') {
      inner = '🔒';
    } else if (sd.state === 'REVIEW') {
      inner = '⚠';
    } else if (sd.state === 'ONAYLI') {
      inner = '✓';
    } else if (filled === total && total > 0) {
      inner = filled + '/' + total;
    } else {
      inner = filled + '/' + total;
    }

    const tooltip = 'Belge: ' + filled + '/' + total + ' · ' + _esc(stateLabel) + ' (tıkla)';
    const edIdSafe = _esc(ed.id);

    return '<span ' +
      'onclick="event.stopPropagation();window._shipmentDocUiOpen && window._shipmentDocUiOpen(\'' + edIdSafe + '\')" ' +
      'title="' + _esc(tooltip) + '" ' +
      'style="display:inline-flex;align-items:center;gap:4px;background:' + stateColor.bg + ';color:' + stateColor.fg +
      ';border:1px solid ' + stateColor.border + ';padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;' +
      'cursor:pointer;transition:transform 0.1s ease;line-height:1.4" ' +
      'onmouseover="this.style.transform=\'scale(1.05)\'" ' +
      'onmouseout="this.style.transform=\'scale(1)\'">' +
      '📦 ' + _esc(inner) +
      '</span>';
  };

  /**
   * SHIPMENT-DOC-DELETE-001 + V132.1 CASCADE: Slot belgesini sil + 30sn undo toast.
   * V132.1: Paylaşımlı belge ise cascade modal göster (Sadece bu / Hepsi).
   * confirmModal (K06) → _sdApply.deleteFromSingleEd VEYA _showDeleteCascadeModal → _deleteFromMultipleEds
   * @param {string} edId hedef ED
   * @param {string} slot belge slot key (ör. 'soforFotos')
   */
  window._shipmentDocUiDeleteSlot = function(edId, slot) {
    if (!window._sdApply || typeof window._sdApply.deleteFromSingleEd !== 'function') {
      window.toast && window.toast('Silme API yüklenmedi', 'err');
      return;
    }
    /* Pending undo toast varsa önce temizle (tek seferde tek toast) */
    if (window.__sdDeletePending) {
      try { clearTimeout(window.__sdDeletePending.timer); } catch (e) {}
      try { clearInterval(window.__sdDeletePending.interval); } catch (e) {}
      try { window.__sdDeletePending.element.remove(); } catch (e) {}
      window.__sdDeletePending = null;
    }
    /* V132.1: uploadGroupId tespit et + cascade detect */
    let cascadeEds = [];
    let cascadeAvailable = false;
    try {
      const sd = window._shipmentDocGet(edId);
      const slotValue = sd && sd.belgeler && sd.belgeler[slot];
      let uploadGroupId = null;
      if (Array.isArray(slotValue) && slotValue[0]) uploadGroupId = slotValue[0].uploadGroupId;
      else if (slotValue && slotValue.uploadGroupId) uploadGroupId = slotValue.uploadGroupId;
      if (uploadGroupId && typeof window._sdApply.findEdsWithSameGroupId === 'function') {
        cascadeEds = window._sdApply.findEdsWithSameGroupId(edId, slot, uploadGroupId);
        cascadeAvailable = cascadeEds.length > 0;
      }
    } catch (e) { /* defensive: cascade detect başarısızsa V132 davranış */ }
    /* Branch: cascade modal vs tek ED confirm */
    if (cascadeAvailable && typeof window._sdApply.showDeleteCascadeModal === 'function') {
      /* V132.1 cascade flow */
      const sd = window._shipmentDocGet(edId);
      const currentProductName = (sd && sd.productName) || '—';
      window._sdApply.showDeleteCascadeModal(edId, currentProductName, cascadeEds, slot, function(selectedEdIds) {
        const r = window._sdApply.deleteFromMultipleEds(selectedEdIds, slot);
        if (!r || r.failEdIds.length === selectedEdIds.length) {
          window.toast && window.toast('Silme başarısız', 'err');
          return;
        }
        window._shipmentDocUiOpen(edId);
        _shipmentDocUiShowUndoToast(slot, r.snapshots, r.successEdIds.length, edId);
      });
      return;
    }
    /* V132 davranış: tek ED confirm + delete */
    const confirmFn = window.confirmModal || window.confirm;
    Promise.resolve(confirmFn('Bu belgeyi silmek istediğine emin misin?\n\n30 saniye içinde geri alabilirsin.')).then(function(ok) {
      if (!ok) return;
      const r = window._sdApply.deleteFromSingleEd(edId, slot);
      if (!r || !r.success) {
        window.toast && window.toast('Silme başarısız: ' + (r && r.error || 'bilinmeyen'), 'err');
        return;
      }
      window._shipmentDocUiOpen(edId);
      _shipmentDocUiShowUndoToast(slot, [{edId: edId, snapshot: r.snapshot}], 1, edId);
    });
  };

  /**
   * V132.1: Custom undo toast (single + cascade ortak).
   * snapshots array — tek ED için 1 elemanlı, cascade için N elemanlı.
   * @param {string} slot belge slot key
   * @param {Array} snapshots [{edId, snapshot}] undo için
   * @param {number} count başarılı ED sayısı (toast text için)
   * @param {string} reRenderEdId modal re-render hedef ED
   */
  function _shipmentDocUiShowUndoToast(slot, snapshots, count, reRenderEdId) {
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#323232;color:#fff;padding:12px 16px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:10003;font-size:13px;display:flex;align-items:center;gap:12px';
    let remaining = 30;
    const countdownSpan = document.createElement('span');
    const baseText = count > 1 ? (count + ' ED\'de belge silindi') : 'Belge silindi';
    countdownSpan.textContent = baseText + ' (' + remaining + 's)';
    const undoBtn = document.createElement('button');
    undoBtn.textContent = '↶ Geri al';
    undoBtn.style.cssText = 'background:#FFB300;color:#000;border:0;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px';
    toastEl.appendChild(countdownSpan);
    toastEl.appendChild(undoBtn);
    document.body.appendChild(toastEl);
    const interval = setInterval(function() {
      remaining--;
      countdownSpan.textContent = baseText + ' (' + remaining + 's)';
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    const timer = setTimeout(function() {
      clearInterval(interval);
      try { toastEl.remove(); } catch (e) {}
      window.__sdDeletePending = null;
    }, 30000);
    undoBtn.onclick = function() {
      clearTimeout(timer);
      clearInterval(interval);
      let restoreSuccess = 0;
      for (let i = 0; i < snapshots.length; i++) {
        const s = snapshots[i];
        const ur = window._sdApply.undoDelete(s.edId, slot, s.snapshot);
        if (ur && ur.success) restoreSuccess++;
      }
      if (restoreSuccess === snapshots.length) {
        window.toast && window.toast(restoreSuccess > 1 ? (restoreSuccess + ' ED\'de geri alındı') : 'Geri alındı', 'ok');
      } else {
        window.toast && window.toast(restoreSuccess + '/' + snapshots.length + ' ED restore', 'err');
      }
      window._shipmentDocUiOpen(reRenderEdId);
      try { toastEl.remove(); } catch (e) {}
      window.__sdDeletePending = null;
    };
    window.__sdDeletePending = { element: toastEl, timer: timer, interval: interval };
  }

})();
