/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_edit.js — v1.0.0 (V193 EDIT 4.2)
 * CASH-FLOW-EDIT-LAYER — Satır düzeltme modal + gerçek update
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.CashFlow (cash_flow.js) — load, saveImmediate
 *   • window.CashFlow.fetchRates — paraBirimi değişirse yeni kur
 *   • window.CashFlowWorks (varsa) — markDirty
 *   • window.confirmModal (kullanılmaz, modal kendi DOM'unu kurar)
 *   • window.toast — bilgi/hata mesajları
 *
 * Sorumluluk:
 *   • Mevcut satırı gerçek update (yeni satır oluşturma YOK)
 *   • satır.id, createdAt KORUNUR — updatedAt yenilenir
 *   • paraBirimi değiştiğinde kur snapshot YENİDEN fetch
 *   • paraBirimi aynıysa eski kurSnapshot KORUNUR
 *
 * Inline onclick: 0 (data-cfe-action delegation)
 * Native alert/confirm/prompt: 0 (Belge 3 §6)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  var MODAL_ID = 'cfe-edit-modal';
  var PARA_BIRIMLERI = ['TRY', 'USD', 'EUR', 'GBP'];

  // ── HELPER'LAR ────────────────────────────────────────────────────
  function _cfeEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _cfeToast(msg, level) {
    if (typeof window.toast === 'function') window.toast(msg, level || 'ok');
  }

  function _cfeRemoveModal() {
    var ex = document.getElementById(MODAL_ID);
    if (ex) ex.remove();
  }

  /** Aktif satırı state'ten bul. Bulunamazsa null. */
  function _cfeFindSatir(satirId) {
    if (!satirId || !window.CashFlow || typeof window.CashFlow.load !== 'function') return null;
    var state = window.CashFlow.load();
    var tablo = (state.tablolar || []).find(function(t) { return t.id === state.aktifTabloId; });
    if (!tablo) return null;
    var satir = (tablo.satirlar || []).find(function(s) { return s.id === satirId; });
    return satir ? { state: state, tablo: tablo, satir: satir } : null;
  }

  // ── 1. MODAL AÇMA ─────────────────────────────────────────────────
  /**
   * Düzelt butonundan tetiklenir. cash_flow.js _cfBindEvents → 'row-edit' aksiyonu.
   * Modal sade Apple tarzı — ekstra border/shadow yok.
   */
  function openEditModal(satirId) {
    var ctx = _cfeFindSatir(satirId);
    if (!ctx) {
      _cfeToast('Satır bulunamadı.', 'err');
      return;
    }
    var s = ctx.satir;
    _cfeRemoveModal();

    /* Kaynak datalist — CashFlowWorks.KAYNAK_ONERILER reuse (KX10 disiplin) */
    var kaynakOptions = (window.CashFlowWorks && window.CashFlowWorks.KAYNAK_ONERILER) || [];
    var datalistOpts = kaynakOptions.map(function(k) {
      return '<option value="' + _cfeEsc(k) + '"></option>';
    }).join('');

    var paraOpts = PARA_BIRIMLERI.map(function(c) {
      var sel = (s.paraBirimi === c) ? ' selected' : '';
      return '<option value="' + c + '"' + sel + '>' + c + '</option>';
    }).join('');

    var katOpts = [
      ['gelir', 'Gelir'],
      ['gider', 'Gider'],
      ['transfer', 'Transfer']
    ].map(function(p) {
      var sel = (s.kategori === p[0]) ? ' selected' : '';
      return '<option value="' + p[0] + '"' + sel + '>' + p[1] + '</option>';
    }).join('');

    var mo = document.createElement('div');
    mo.id = MODAL_ID;
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
    /* Outside click → close */
    mo.addEventListener('click', function(e) { if (e.target === mo) _cfeRemoveModal(); });

    mo.innerHTML = '<div data-cfe-stop="1" style="background:#fff;color:#222;width:560px;max-width:92vw;max-height:90vh;display:flex;flex-direction:column;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="padding:16px 20px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-size:14px;font-weight:600;color:#222">Satırı Düzenle</div>'
        + '<button data-cfe-action="close" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:#bbb;padding:0;line-height:1;font-family:inherit">✕</button>'
      + '</div>'
      + '<div style="padding:18px 20px;overflow-y:auto;flex:1">'
        + '<datalist id="cfe-kaynak-list">' + datalistOpts + '</datalist>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
          + '<label style="font-size:11px;color:#666">Tarih'
            + '<input id="cfe-i-tarih" type="date" value="' + _cfeEsc(s.tarih || '') + '" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-family:inherit;box-sizing:border-box">'
          + '</label>'
          + '<label style="font-size:11px;color:#666">Kategori'
            + '<select id="cfe-i-kategori" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-family:inherit;box-sizing:border-box">' + katOpts + '</select>'
          + '</label>'
          + '<label style="grid-column:1/3;font-size:11px;color:#666">Açıklama'
            + '<input id="cfe-i-aciklama" type="text" value="' + _cfeEsc(s.aciklama || '') + '" maxlength="200" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-family:inherit;box-sizing:border-box">'
          + '</label>'
          + '<label style="font-size:11px;color:#666">Tutar'
            + '<input id="cfe-i-tutar" type="number" step="0.01" value="' + _cfeEsc(String(s.tutar || 0)) + '" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-variant-numeric:tabular-nums;font-family:inherit;box-sizing:border-box">'
          + '</label>'
          + '<label style="font-size:11px;color:#666">Para Birimi'
            + '<select id="cfe-i-doviz" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-family:inherit;box-sizing:border-box">' + paraOpts + '</select>'
          + '</label>'
          + '<label style="grid-column:1/3;font-size:11px;color:#666">Kaynak / Banka'
            + '<input id="cfe-i-kaynak" type="text" list="cfe-kaynak-list" value="' + _cfeEsc(s.kaynak || '') + '" placeholder="Banka veya kaynak..." style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-family:inherit;box-sizing:border-box">'
          + '</label>'
        + '</div>'
        + '<div style="margin-top:14px;padding:10px 12px;background:#fafafa;border-radius:6px;font-size:11px;color:#666;line-height:1.5">'
          + 'Para birimi değişirse kur otomatik güncellenir. Aynı kalırsa kayıtlı kur korunur.'
        + '</div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:0.5px solid #eee;display:flex;justify-content:flex-end;gap:8px;background:#fafafa;border-radius:0 0 12px 12px">'
        + '<button data-cfe-action="cancel" style="padding:7px 14px;background:transparent;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#666;font-family:inherit">Vazgeç</button>'
        + '<button data-cfe-action="save" data-cfe-id="' + _cfeEsc(satirId) + '" style="padding:7px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500;font-family:inherit">Kaydet</button>'
      + '</div>'
    + '</div>';

    document.body.appendChild(mo);
    mo.addEventListener('click', _cfeModalClick);

    /* Auto-focus + Escape close */
    setTimeout(function() {
      var inp = document.getElementById('cfe-i-aciklama');
      if (inp) {
        inp.focus();
        inp.select();
      }
      document.addEventListener('keydown', _cfeKeyHandler);
    }, 50);
  }

  function _cfeKeyHandler(e) {
    if (e.key === 'Escape') {
      _cfeRemoveModal();
      document.removeEventListener('keydown', _cfeKeyHandler);
    }
  }

  function _cfeModalClick(e) {
    var btn = e.target.closest('[data-cfe-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-cfe-action');
    if (action === 'close' || action === 'cancel') {
      _cfeRemoveModal();
      document.removeEventListener('keydown', _cfeKeyHandler);
    } else if (action === 'save') {
      var id = btn.getAttribute('data-cfe-id');
      _cfeSubmit(id);
    }
  }

  // ── 2. UPDATE — gerçek mutate, yeni satır YOK ─────────────────────
  async function _cfeSubmit(satirId) {
    var ctx = _cfeFindSatir(satirId);
    if (!ctx) {
      _cfeToast('Satır kaybolmuş.', 'err');
      _cfeRemoveModal();
      return;
    }

    /* Form alanlarını topla */
    var tarih     = (document.getElementById('cfe-i-tarih')   || {}).value || '';
    var aciklama  = String((document.getElementById('cfe-i-aciklama') || {}).value || '').trim();
    var tutar     = Number((document.getElementById('cfe-i-tutar')    || {}).value) || 0;
    var paraBirim = (document.getElementById('cfe-i-doviz')    || {}).value || 'TRY';
    var kategori  = (document.getElementById('cfe-i-kategori') || {}).value || 'gelir';
    var kaynak    = String((document.getElementById('cfe-i-kaynak')   || {}).value || '').trim();

    /* Validasyon */
    if (!aciklama) { _cfeToast('Açıklama zorunlu.', 'warn'); return; }
    if (!tutar)    { _cfeToast('Tutar zorunlu.', 'warn');    return; }
    if (PARA_BIRIMLERI.indexOf(paraBirim) === -1) paraBirim = 'TRY';
    if (['gelir','gider','transfer'].indexOf(kategori) === -1) kategori = 'gelir';

    var s = ctx.satir;
    var oldPara = s.paraBirimi || 'TRY';

    /* Para birimi değiştiyse yeni kur fetch — aynıysa eski kurSnapshot KORUNUR.
     * kurSnapshot snapshot mantığında: satır oluşturulduğunda dondurulmuş kur,
     * para birimi DEĞİŞMEDİYSE eski snapshot satırın geçmiş ekonomik bağlamını yansıtır
     * ve değişmemelidir. Para birimi değiştiyse snapshot anlamsız, yenilenir. */
    var yeniKur = s.kurSnapshot;
    if (paraBirim !== oldPara) {
      try {
        if (window.CashFlow && typeof window.CashFlow.fetchRates === 'function') {
          var r = await window.CashFlow.fetchRates();
          if (r) {
            yeniKur = { TRY: r.TRY, USD: r.USD, EUR: r.EUR, GBP: r.GBP };
          }
        }
      } catch (e) {
        console.warn('[CF-EDIT] fetchRates error:', e && e.message);
        /* kurSnapshot eskisini kullan, render'da CashFlowCompute FALLBACK_RATES devreye girer */
      }
    }

    /* GERÇEK UPDATE — yeni satır oluşturma YOK, mevcut s mutate ediliyor.
     * id KORUNUR, createdAt KORUNUR, updatedAt YENİLENİR. */
    s.tarih      = tarih || s.tarih;
    s.aciklama   = aciklama;
    s.tutar      = tutar;
    s.paraBirimi = paraBirim;
    s.kategori   = kategori;
    s.kaynak     = kaynak;
    if (yeniKur) s.kurSnapshot = yeniKur;
    s.updatedAt  = new Date().toISOString();
    /* s.id, s.createdAt, s.status, s.source DOKUNULMADI */

    /* Persist + dirty mark + render */
    try {
      if (window.CashFlow && typeof window.CashFlow.saveImmediate === 'function') {
        window.CashFlow.saveImmediate(ctx.state);
      }
    } catch (e) {
      console.error('[CF-EDIT] saveImmediate error:', e);
      _cfeToast('Kaydedilemedi: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
      return;
    }

    if (window.CashFlowWorks && typeof window.CashFlowWorks.markDirty === 'function') {
      window.CashFlowWorks.markDirty();
    }

    _cfeRemoveModal();
    document.removeEventListener('keydown', _cfeKeyHandler);
    _cfeToast('Güncellendi.', 'ok');

    /* Running balance otomatik recompute — _cfRenderPanel her render'da
     * CashFlowCompute.runningBalance'ı yeniden çağırır (EDIT 4.3'te entegre edilecek). */
    if (typeof window._cfRenderPanel === 'function') window._cfRenderPanel();
  }

  // ── 3. PUBLIC API ─────────────────────────────────────────────────
  window.CashFlowEdit = {
    openEditModal: openEditModal
  };

})();
