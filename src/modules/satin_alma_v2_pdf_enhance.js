/**
 * SATIS-PDF-ENHANCE-001 (V153)
 *
 * 3 PDF formatı (A/B/C) için 3 enhancement:
 *   1. Banka bloğu — 5 alan, banking standardı sırada:
 *      Account Holder → Bank Name → Branch → IBAN → SWIFT/BIC
 *   2. Page-break — görseller, tablolar, banka bloğu sayfa arasında bölünmesin
 *   3. Filename — PI-{teklifId}_{slugMüşteri}_{YYMMDD-HHMM}[_RevYYMMDD-RNN].pdf
 *
 * window._printSatisTeklifA/B/C (app_patch.js:2887, 3092, 3154) override edilir.
 * app_patch.js orijinal kod DOKUNULMAZ (KX9 — 700+ satır yasağı).
 *
 * Strateji: window.open hijack pattern.
 *   - Override fn çağrıldığında window.open geçici intercept edilir
 *   - Orijinal print fn yeni pencere açar, HTML write eder
 *   - Pencere DOM hazır olunca: banka bloğu replace + page-break CSS inject + title set
 *
 * Persistence/Firestore/data shape sıfır değişiklik.
 *
 * Anayasa uyumu:
 *   K01 ≤800 satır · KX3 yeni feature = yeni dosya
 *   KX5 saha test öncesi commit yok · KX8 anchor view birebir kopya
 *   KX9 app_patch.js'e feature eklenmez (override pattern)
 */
(function () {
  'use strict';

  if (window._saV2_pdfEnhanceApplied) return;
  window._saV2_pdfEnhanceApplied = true;

  /* ════════════════════════════════════════════════════════════
   * HELPER 1 — Banka HTML (5 alan, banking standardı sırası)
   * ════════════════════════════════════════════════════════════ */
  window._saV2PdfBankaHTML = function (banka, cur) {
    if (!banka) banka = {};
    var ah = _esc(banka.hesapSahibi || 'DUAY GLOBAL LLC');
    var bn = _esc(banka.banka || banka.name || '');
    var br = _esc(banka.sube || banka.branch || '');
    var ib = _esc(banka.iban || '');
    var sw = _esc(banka.swift || '');
    var c = _esc(cur || 'USD');

    return '<div class="bank pb-keep" style="page-break-inside:avoid;break-inside:avoid;margin-top:12px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc">'
      + '<h4 style="font-size:11px;font-weight:700;color:#1a365d;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px">Banking Details</h4>'
      + '<table style="width:100%;border-collapse:collapse;font-size:10px;line-height:1.6">'
      + '<tr><td style="width:35%;padding:2px 0;color:#475569;font-weight:600">Account Holder</td><td style="padding:2px 0;color:#0f172a">' + ah + '</td></tr>'
      + '<tr><td style="padding:2px 0;color:#475569;font-weight:600">Bank Name</td><td style="padding:2px 0;color:#0f172a">' + bn + '</td></tr>'
      + '<tr><td style="padding:2px 0;color:#475569;font-weight:600">Branch</td><td style="padding:2px 0;color:#0f172a">' + br + '</td></tr>'
      + '<tr><td style="padding:2px 0;color:#475569;font-weight:600">' + c + ' IBAN</td><td style="padding:2px 0;color:#0f172a;font-family:monospace;font-weight:600">' + ib + '</td></tr>'
      + '<tr><td style="padding:2px 0;color:#475569;font-weight:600">SWIFT / BIC</td><td style="padding:2px 0;color:#0f172a;font-family:monospace;font-weight:600">' + sw + '</td></tr>'
      + '</table>'
      + '</div>';
  };

  /* ════════════════════════════════════════════════════════════
   * HELPER 2 — Page-break CSS
   * Tablolar, banka, terms, signature blok arasında bölünmesin.
   * Görseller (img) sayfa arasında bölünmesin.
   * ════════════════════════════════════════════════════════════ */
  window._saV2PdfPageBreakCSS = function () {
    return '@media print, screen {\n'
      + '  .bank, .terms, .sig, .footer, .seller-notes, .pb-keep {\n'
      + '    page-break-inside: avoid !important;\n'
      + '    break-inside: avoid !important;\n'
      + '  }\n'
      + '  table, tr, thead, tfoot {\n'
      + '    page-break-inside: avoid !important;\n'
      + '    break-inside: avoid !important;\n'
      + '  }\n'
      + '  img, figure, svg {\n'
      + '    page-break-inside: avoid !important;\n'
      + '    break-inside: avoid !important;\n'
      + '    max-width: 100%;\n'
      + '  }\n'
      + '  h1, h2, h3, h4, h5 {\n'
      + '    page-break-after: avoid !important;\n'
      + '    break-after: avoid !important;\n'
      + '  }\n'
      + '  .page-break {\n'
      + '    page-break-before: always !important;\n'
      + '    break-before: always !important;\n'
      + '  }\n'
      + '}\n';
  };

  /* ════════════════════════════════════════════════════════════
   * HELPER 3 — Filename
   *   PI-{teklifId}_{slugMüşteri}_{YYMMDD-HHMM}.pdf
   *   PI-{teklifId}_{slugMüşteri}_{YYMMDD-HHMM}_Rev{YYMMDD}-R{NN}.pdf
   * ════════════════════════════════════════════════════════════ */
  window._saV2PdfFileName = function (t) {
    if (!t) t = {};
    var d = new Date();
    var YY = String(d.getFullYear()).slice(2);
    var MM = String(d.getMonth() + 1).padStart(2, '0');
    var DD = String(d.getDate()).padStart(2, '0');
    var HH = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var datePart = YY + MM + DD;
    var timePart = HH + mm;

    var teklifId = t.teklifId || t.teklifNo || t.id || 'UNKNOWN';
    var musteriRaw = t.musteri || t.musteriAd || t.cariName || '';
    var musteriSlug = _saV2Slugify(musteriRaw) || 'Customer';

    var name = 'PI-' + teklifId + '_' + musteriSlug + '_' + datePart + '-' + timePart;

    var revN = parseInt(t.revNo) || 0;
    if (revN > 1) {
      var revStr = String(revN).padStart(2, '0');
      name += '_Rev' + datePart + '-R' + revStr;
    }

    return name + '.pdf';
  };

  /* ════════════════════════════════════════════════════════════
   * HELPER 4 — Türkçe Slugify
   *   Şahin İnş. A.Ş. → Sahin-Ins-AS
   * ════════════════════════════════════════════════════════════ */
  function _saV2Slugify(s) {
    if (!s) return '';
    return String(s)
      .replace(/Ş/g, 'S').replace(/ş/g, 's')
      .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'U').replace(/ü/g, 'u')
      .replace(/Ö/g, 'O').replace(/ö/g, 'o')
      .replace(/Ç/g, 'C').replace(/ç/g, 'c')
      .replace(/İ/g, 'I').replace(/ı/g, 'i')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }
  window._saV2Slugify = _saV2Slugify;

  /* ════════════════════════════════════════════════════════════
   * HELPER 5 — HTML escape (window._esc fallback)
   * ════════════════════════════════════════════════════════════ */
  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ════════════════════════════════════════════════════════════
   * HELPER 6 — Para birimi tespiti (PDF DOM'undan)
   * ════════════════════════════════════════════════════════════ */
  function _detectCurrency(doc) {
    if (!doc || !doc.body) return 'USD';
    var text = doc.body.textContent || '';
    if (text.match(/\bEUR\b/)) return 'EUR';
    if (text.match(/\bGBP\b/)) return 'GBP';
    if (text.match(/\bTRY\b/)) return 'TRY';
    return 'USD';
  }

  /* ════════════════════════════════════════════════════════════
   * CORE — PDF window enhance
   * Banka bloğu replace + page-break CSS + title set
   * ════════════════════════════════════════════════════════════ */
  function _saV2EnhancePdfWindow(w, teklif) {
    if (!w || !w.document) return;

    var doc = w.document;
    var cur = (teklif && teklif.paraBirimi) || _detectCurrency(doc) || 'USD';

    /* 1. Banka data'yı _pdfBankaListesi helper'dan al */
    var banka = {};
    try {
      var bankaList = window._pdfBankaListesi ? window._pdfBankaListesi(cur) : [];
      if (bankaList && bankaList.length > 0) banka = bankaList[0];
    } catch (e) {
      console.warn('[V153] _pdfBankaListesi hata:', e);
    }

    /* 2. Mevcut banka bloğunu yeni HTML ile replace */
    var bankDiv = doc.querySelector('.bank');
    if (bankDiv) {
      try {
        bankDiv.outerHTML = window._saV2PdfBankaHTML(banka, cur);
      } catch (e) {
        console.error('[V153] banka replace hata:', e);
      }
    }

    /* 3. Page-break CSS inject */
    if (doc.head) {
      try {
        var styleEl = doc.createElement('style');
        styleEl.id = 'saV2-pdf-pagebreak';
        styleEl.textContent = window._saV2PdfPageBreakCSS();
        if (!doc.getElementById('saV2-pdf-pagebreak')) {
          doc.head.appendChild(styleEl);
        }
      } catch (e) {
        console.error('[V153] page-break CSS inject hata:', e);
      }
    }

    /* 4. Title — browser print dialog için filename hint */
    if (teklif) {
      try {
        var fn = window._saV2PdfFileName(teklif).replace(/\.pdf$/, '');
        doc.title = fn;
      } catch (e) {
        console.error('[V153] title set hata:', e);
      }
    }
  }

  /* ════════════════════════════════════════════════════════════
   * PRINT FN OVERRIDE — window.open hijack pattern
   * ════════════════════════════════════════════════════════════ */
  function _saV2WrapPrintFn(originalFnName) {
    var orig = window[originalFnName];
    if (typeof orig !== 'function') {
      console.warn('[V153] ' + originalFnName + ' bulunamadı, override atlandı');
      return false;
    }

    /* Orijinali yedekle (debug + fallback için) */
    window['_origPrintBackup_' + originalFnName] = orig;

    window[originalFnName] = function (id) {
      var teklif = null;
      try {
        var liste = window.loadSatisTeklifleri ? window.loadSatisTeklifleri() : [];
        teklif = liste.find(function (x) { return String(x.id) === String(id); });
      } catch (e) {
        console.warn('[V153] teklif lookup hata:', e);
      }

      /* window.open'ı geçici intercept et */
      var origOpen = window.open;
      var enhanced = false;

      window.open = function () {
        var w = origOpen.apply(window, arguments);
        if (!w) return w;

        /* Polling: DOM hazır olduğunda enhance */
        var attempts = 0;
        var poll = setInterval(function () {
          attempts++;
          var ready = false;
          try {
            ready = w.document
                 && w.document.body
                 && w.document.querySelector('.bank, .footer, [class*="bank"]');
          } catch (e) { /* cross-origin koruma */ }

          if (ready && !enhanced) {
            enhanced = true;
            clearInterval(poll);
            try {
              _saV2EnhancePdfWindow(w, teklif);
            } catch (e) {
              console.error('[V153] enhance hata:', e);
            }
          } else if (attempts > 100) {
            clearInterval(poll);
            console.warn('[V153] DOM hazır olmadı (5 sn), enhance yapılamadı');
          }
        }, 50);

        return w;
      };

      /* Orijinal fn'i çağır */
      try {
        orig.call(window, id);
      } catch (e) {
        console.error('[V153] orijinal print fn hata:', e);
      } finally {
        /* window.open'ı geri ver (gecikme — orijinal çağrı tamamlansın) */
        setTimeout(function () {
          window.open = origOpen;
        }, 200);
      }
    };

    return true;
  }

  /* ════════════════════════════════════════════════════════════
   * APPLY — DOM ready sonrası override'ları kur
   * ════════════════════════════════════════════════════════════ */
  function _applyOverrides() {
    var success = {
      A: _saV2WrapPrintFn('_printSatisTeklifA'),
      B: _saV2WrapPrintFn('_printSatisTeklifB'),
      C: _saV2WrapPrintFn('_printSatisTeklifC')
    };
    window._saV2_pdfEnhanceStatus = success;
    console.log('[V153 PDF enhance] override durumu:', success);
  }

  /* app_patch.js i=90 (en son script), ama print fn'ler hemen tanımlanır.
   * DOM ready güvenli zaman — burada zaten queue'da. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_applyOverrides, 200);
    });
  } else {
    setTimeout(_applyOverrides, 200);
  }

  /* SATIS-PDF-ENHANCE-001 — V153 sonu */
})();
