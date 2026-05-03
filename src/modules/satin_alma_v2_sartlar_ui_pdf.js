/**
 * SATIS-SARTLAR-UI-PDF-001 (V156)
 *
 * 2 ana is:
 *   1. MODAL SARTLAR UI: Mevcut sartlar listesi (L859 _saV2SartListeGuncelle) cirkin
 *      gorunum: numarali liste, cıplak metin. Yeni gorunum: bordered card, monospace
 *      numara, Düzenle ✎, Sil ×. Inline edit (tıkla -> input).
 *   2. PDF SARTLAR: V154 _saV2RenderPdfHtml fn'i sartlari render ETMIYORDU. V154'te
 *      banka blogundan ONCE "TERMS & CONDITIONS" section eklenecek (numarali liste).
 *
 * KX9: app_patch.js + satin_alma_v2_satis.js DOKUNULMAZ.
 *      _saV2SartListeGuncelle override edilir (yeni dosya).
 *      _saV2RenderPdfHtml override edilir (V154 fn'in icine sartlar inject).
 *
 * V152, V153, V154, V155 mevcut calismalar etkilenmez.
 *
 * Anayasa uyumu:
 *   K01 ≤800 satir · KX3 yeni feature = yeni dosya · KX5 saha test prod
 *   KX9 mevcut dosyalar dokunulmaz (override pattern)
 */
(function () {
  'use strict';

  if (window._saV2_sartlarUIPdfApplied) return;
  window._saV2_sartlarUIPdfApplied = true;

  /* ════════════════════════════════════════════════════════════
   * BOLUM 1 — MODAL SARTLAR UI YENILEME
   * ════════════════════════════════════════════════════════════ */

  /* HTML escape — global fallback */
  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    if (typeof window._saEsc === 'function') return window._saEsc(s);
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Inline edit state */
  var EDITING_INDEX = null;

  /* Render fn — orijinal _saV2SartListeGuncelle'in yerine gecer */
  function _renderSartlarListe() {
    var el = document.getElementById('st-sartlar-liste');
    if (!el) return;
    var list = window._stSartlar || [];

    if (!list.length) {
      el.innerHTML = '<div style="font-size:11px;color:var(--t3);padding:14px 8px;text-align:center;font-style:italic">Henüz şart eklenmedi · sağdaki "Hazır Şart" veya "Manuel Şart" alanlarından ekleyin</div>';
      _updateCounter(0);
      return;
    }

    var html = '';
    list.forEach(function (s, i) {
      var isEditing = EDITING_INDEX === i;
      var num = String(i + 1).padStart(2, '0');

      if (isEditing) {
        /* Inline edit modu */
        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#FEF3C7;border:0.5px solid #FAC775;border-radius:6px;margin-bottom:6px">';
        html += '<span style="font-size:11px;color:#854F0B;font-family:monospace;min-width:20px;padding-top:5px">' + num + '</span>';
        html += '<input type="text" id="st-sart-edit-' + i + '" value="' + _esc(s) + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){window._saV2SartEditKaydet(' + i + ')}else if(event.key===\'Escape\'){window._saV2SartEditIptal()}" style="flex:1;font-size:12px;color:var(--t);border:none;background:transparent;outline:none;font-family:inherit;padding:3px 0">';
        html += '<button onclick="event.stopPropagation();window._saV2SartEditKaydet(' + i + ')" style="font-size:10px;padding:3px 8px;border:0.5px solid #854F0B;border-radius:4px;background:#854F0B;color:#fff;cursor:pointer;font-family:inherit">Kaydet</button>';
        html += '<button onclick="event.stopPropagation();window._saV2SartEditIptal()" style="font-size:10px;padding:3px 6px;border:none;background:transparent;cursor:pointer;color:#854F0B;font-family:inherit">İptal</button>';
        html += '</div>';
      } else {
        /* Normal görünüm — bordered card */
        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;transition:background .12s,border-color .12s" onmouseover="this.style.background=\'var(--s2)\';this.style.borderColor=\'var(--bm)\'" onmouseout="this.style.background=\'var(--sf)\';this.style.borderColor=\'var(--b)\'">';
        html += '<span style="font-size:11px;color:var(--t3);font-family:monospace;min-width:20px;padding-top:2px">' + num + '</span>';
        html += '<span style="flex:1;font-size:12px;color:var(--t);line-height:1.5">' + _esc(s) + '</span>';
        html += '<button title="Düzenle" onclick="event.stopPropagation();window._saV2SartEditAc(' + i + ')" style="font-size:11px;background:none;border:none;cursor:pointer;color:var(--t3);padding:2px 4px;font-family:inherit" onmouseover="this.style.color=\'var(--t)\'" onmouseout="this.style.color=\'var(--t3)\'">✎</button>';
        html += '<button title="Sil" onclick="event.stopPropagation();window._stSartlar.splice(' + i + ',1);window._saV2SartListeGuncelle()" style="font-size:13px;background:none;border:none;cursor:pointer;color:#A32D2D;padding:0 4px;line-height:1;font-family:inherit">×</button>';
        html += '</div>';
      }
    });
    el.innerHTML = html;
    _updateCounter(list.length);
  }

  /* Sayac update — başlık yanına "X/10 kullanıldı" */
  function _updateCounter(n) {
    var counter = document.getElementById('st-sartlar-counter');
    if (counter) {
      counter.textContent = n + '/10 kullanıldı';
      counter.style.color = n >= 10 ? '#A32D2D' : 'var(--t3)';
      return;
    }
    /* Yoksa olustur — başlık alanına inject */
    var headers = document.querySelectorAll('#sav2-satis-modal div');
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].textContent && headers[i].textContent.indexOf('TEKLİF ŞARTLARI') === 0) {
        var span = document.createElement('span');
        span.id = 'st-sartlar-counter';
        span.style.cssText = 'font-size:9px;color:var(--t3);margin-left:8px;font-weight:400';
        span.textContent = n + '/10 kullanıldı';
        headers[i].appendChild(span);
        break;
      }
    }
  }

  /* Edit fn'leri — global */
  window._saV2SartEditAc = function (i) {
    EDITING_INDEX = i;
    _renderSartlarListe();
    setTimeout(function () {
      var inp = document.getElementById('st-sart-edit-' + i);
      if (inp) { inp.focus(); inp.select(); }
    }, 30);
  };
  window._saV2SartEditKaydet = function (i) {
    var inp = document.getElementById('st-sart-edit-' + i);
    if (!inp) return;
    var val = inp.value.trim();
    if (!val) { window.toast?.('Şart boş olamaz', 'warn'); return; }
    if (!Array.isArray(window._stSartlar)) window._stSartlar = [];
    window._stSartlar[i] = val;
    EDITING_INDEX = null;
    _renderSartlarListe();
  };
  window._saV2SartEditIptal = function () {
    EDITING_INDEX = null;
    _renderSartlarListe();
  };

  /* Override: window._saV2SartListeGuncelle — orijinal var ama biz override ediyoruz */
  function _wrapSartListGuncelle() {
    var orig = window._saV2SartListeGuncelle;
    if (typeof orig === 'function') {
      window._origSartListGuncelle_V156 = orig;
    }
    window._saV2SartListeGuncelle = function () {
      try { _renderSartlarListe(); }
      catch (e) {
        console.warn('[V156] sartlar render fallback:', e);
        if (window._origSartListGuncelle_V156) {
          try { window._origSartListGuncelle_V156.apply(this, arguments); } catch (e2) {}
        }
      }
    };
  }

  /* ════════════════════════════════════════════════════════════
   * BOLUM 2 — PDF SARTLAR SECTION (V154 OVERRIDE)
   * ════════════════════════════════════════════════════════════ */

  /* PDF terms HTML — V154 _saV2RenderPdfHtml icin section */
  function _pdfSartlarHTML(sartlar) {
    if (!sartlar || !sartlar.length) return '';
    var html = '<div class="terms pb-keep" style="margin-top:14px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;page-break-inside:avoid;break-inside:avoid">';
    html += '<h4 style="font-size:11px;font-weight:700;color:#1a365d;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px">Terms &amp; Conditions</h4>';
    html += '<ol style="margin:0;padding:0 0 0 18px;list-style-type:decimal;font-size:10px;line-height:1.6;color:#0F172A">';
    sartlar.forEach(function (s) {
      html += '<li style="margin-bottom:3px">' + _esc(s) + '</li>';
    });
    html += '</ol>';
    html += '</div>';
    return html;
  }

  /* Override _saV2RenderPdfHtml — banka blogundan ONCE terms inject */
  function _wrapRenderPdfHtml() {
    var orig = window._saV2RenderPdfHtml;
    if (typeof orig !== 'function') {
      console.warn('[V156] _saV2RenderPdfHtml yok (V154 yuklenmemis?)');
      return;
    }
    window._origRenderPdfHtml_V156 = orig;

    window._saV2RenderPdfHtml = function (t) {
      var html = orig.call(this, t);
      if (!html || !t) return html;
      var sartlar = t.sartlar || [];
      if (!sartlar.length) return html;

      var termsHtml = _pdfSartlarHTML(sartlar);
      if (!termsHtml) return html;

      /* Banka blogundan ONCE inject — banka div'i `<div class="bank` ile basliyor.
       * V153 _saV2PdfBankaHTML output: '<div class="bank pb-keep" ...>'
       */
      var bankIdx = html.indexOf('<div class="bank');
      if (bankIdx === -1) {
        /* Banka yok? Footer'dan once dene */
        var footerIdx = html.indexOf('<div class="pdf-footer"');
        if (footerIdx === -1) {
          /* Son care: print btn'den once */
          var printIdx = html.indexOf('<button class="pdf-print-btn"');
          if (printIdx === -1) {
            /* Body kapama oncesi */
            return html.replace('</div></body>', termsHtml + '</div></body>');
          }
          return html.slice(0, printIdx) + termsHtml + html.slice(printIdx);
        }
        return html.slice(0, footerIdx) + termsHtml + html.slice(footerIdx);
      }
      return html.slice(0, bankIdx) + termsHtml + html.slice(bankIdx);
    };
  }

  /* ════════════════════════════════════════════════════════════
   * APPLY
   * ════════════════════════════════════════════════════════════ */
  function _apply() {
    _wrapSartListGuncelle();
    _wrapRenderPdfHtml();
    /* Modal acik ise listeyi hemen yeni gorunume cevir */
    if (document.getElementById('st-sartlar-liste')) {
      try { _renderSartlarListe(); } catch (e) {}
    }
    window._saV2_sartlarUIPdfStatus = true;
    console.log('[V156 sartlar UI + PDF] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_apply, 350);
    });
  } else {
    setTimeout(_apply, 350);
  }

  /* SATIS-SARTLAR-UI-PDF-001 — V156 sonu */
})();
