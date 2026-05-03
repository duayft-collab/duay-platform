/**
 * SATIS-PDF-PREVIEW-PARITY-001 (V154)
 *
 * AMAC: Modal canli onizleme tasarimi = PDF cikti tasarimi (tek sistem).
 *
 * 4 ana degisiklik:
 *   1. PDF Format Sec modal (A/B/C) BYPASS — direkt PDF acilir
 *   2. Mevcut Format A/B/C tasarimlari KULLANILMAZ (kod yerinde, cagrilmaz)
 *   3. PDF tasarimi = onizleme HTML template (A4-optimize, scale up)
 *   4. Filename "PI-" prefix KALDIRILDI: {teklifId}_{slug}_{YYMMDD-HHMM}[_RevYYMMDD-RNN].pdf
 *
 * window._printSatisTeklif (app_patch.js:3228 wrapper) override edilir.
 * Modal acilmaz, _saV2OpenPdfV2 direkt cagrilir.
 *
 * V152, V153, app_patch.js, satin_alma_v2_satis.js DOKUNULMAZ.
 *
 * Anayasa uyumu:
 *   K01 ≤800 satir · KX3 yeni feature = yeni dosya
 *   KX5 saha test prod (V152/V153 deseni) · KX8 onizleme HTML birebir kopya
 *   KX9 app_patch.js DOKUNULMAZ (override pattern)
 */
(function () {
  'use strict';

  if (window._saV2_pdfV2Applied) return;
  window._saV2_pdfV2Applied = true;

  /* CSS variables hardcoded (Chrome MCP ile canli sayfadan dogrulandi) */
  var CSS_VARS = {
    '--t':  '#0F172A',
    '--t2': '#475569',
    '--t3': '#94A3B8',
    '--b':  '#E2E8F0',
    '--bg': '#F7F9FC',
    '--bm': '#CBD5E1',
    '--s2': '#F0F3F8',
    '--sf': '#FFFFFF'
  };

  /* ════════════════════════════════════════════════════════════
   * HELPER 1 — Filename V154 (PI- prefix YOK)
   * ════════════════════════════════════════════════════════════ */
  window._saV2PdfFileNameV2 = function (t) {
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
    var slugFn = window._saV2Slugify || function (s) { return String(s || '').replace(/[^a-zA-Z0-9]+/g, '-'); };
    var musteriSlug = slugFn(musteriRaw) || 'Customer';

    /* PI- prefix YOK (V153 fn'inden FARK) */
    var name = teklifId + '_' + musteriSlug + '_' + datePart + '-' + timePart;

    var revN = parseInt(t.revNo) || 0;
    if (revN > 1) {
      var revStr = String(revN).padStart(2, '0');
      name += '_Rev' + datePart + '-R' + revStr;
    }

    return name + '.pdf';
  };

  /* ════════════════════════════════════════════════════════════
   * HELPER 2 — HTML escape
   * ════════════════════════════════════════════════════════════ */
  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    if (typeof window._saEsc === 'function') return window._saEsc(s);
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ════════════════════════════════════════════════════════════
   * HELPER 3 — Para format
   * ════════════════════════════════════════════════════════════ */
  function _fmt(n) {
    var v = parseFloat(n) || 0;
    return v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  }

  /* ════════════════════════════════════════════════════════════
   * HELPER 4 — Banka block (V153 helper'i kullan, fallback)
   * ════════════════════════════════════════════════════════════ */
  function _bankaBlock(cur) {
    /* V153 helper varsa kullan */
    if (typeof window._saV2PdfBankaHTML === 'function') {
      var bankaList = [];
      try {
        bankaList = window._pdfBankaListesi ? window._pdfBankaListesi(cur) : [];
      } catch (e) {}
      var banka = (bankaList && bankaList[0]) || {};
      return window._saV2PdfBankaHTML(banka, cur);
    }
    /* Fallback: tek satir metin */
    var metni = '';
    try { metni = window._saV2BankaMetni ? window._saV2BankaMetni(cur) : ''; } catch (e) {}
    return '<div style="margin-top:12px;padding:10px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;font-size:10px;color:#475569">' + _esc(metni) + '</div>';
  }

  /* ════════════════════════════════════════════════════════════
   * HELPER 5 — Page-break CSS (V153 helper'i kullan, fallback)
   * ════════════════════════════════════════════════════════════ */
  function _pageBreakCss() {
    if (typeof window._saV2PdfPageBreakCSS === 'function') {
      return window._saV2PdfPageBreakCSS();
    }
    return '@media print, screen { .bank, .terms, .sig, .footer, table, tr, img { page-break-inside: avoid !important; } }';
  }

  /* ════════════════════════════════════════════════════════════
   * CORE — PDF HTML render (onizleme template, A4-optimize)
   * ════════════════════════════════════════════════════════════
   * Onizleme HTML birebir kopya (KX8) + 3 fark:
   *   - <html>/<body> standalone wrap
   *   - CSS variables hardcoded (var(--t) -> #0F172A)
   *   - Font 8px -> 11px (A4 readable)
   *   - Aktif tasarim/dil badge KALDIRILDI (PDF'te gereksiz)
   *   - Banka tek satir -> V153 5 alan blok
   * ════════════════════════════════════════════════════════════ */
  window._saV2RenderPdfHtml = function (t) {
    if (!t) return '<html><body><p>Teklif bulunamadi</p></body></html>';

    var musteri = t.musteri || t.musteriAd || t.cariName || '—';
    var gecerlilik = t.gecerlilik || t.gecerlilikTarihi || '—';
    var incoterm = t.incoterm || 'EXW';
    var liman = t.liman || 'Turkey';
    var odeme = t.odeme || '—';
    var para = t.paraBirimi || t.cur || 'USD';
    var piNo = t.teklifId || t.teklifNo || t.id || '—';
    var urunler = t.urunler || [];
    var freight = parseFloat(t.freight || t.freightAmount) || 0;
    var insurance = parseFloat(t.insurance || t.insuranceAmount) || 0;
    var hasFreight = freight > 0 || insurance > 0;
    var isCFR = incoterm === 'CFR' || incoterm === 'CIF' || incoterm === 'CIP';

    var toplamSatis = urunler.reduce(function (s, u) {
      return s + (parseFloat(u.satisFiyat) || 0) * (parseFloat(u.miktar) || 0);
    }, 0);

    var fileName = window._saV2PdfFileNameV2(t).replace(/\.pdf$/, '');

    /* --- HEAD: standalone wrap + CSS reset + variables hardcoded --- */
    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
    html += '<title>' + _esc(fileName) + '</title>';
    html += '<style>';
    html += '*{box-sizing:border-box;margin:0;padding:0}';
    html += 'body{font-family:Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px;color:' + CSS_VARS['--t'] + ';background:#fff;padding:24px;line-height:1.5}';
    html += '.pdf-root{max-width:780px;margin:0 auto;background:#fff}';
    html += '.pdf-header{text-align:center;border-bottom:1px solid ' + CSS_VARS['--b'] + ';padding-bottom:12px;margin-bottom:14px}';
    html += '.pdf-co{font-size:14px;font-weight:600;color:' + CSS_VARS['--t'] + '}';
    html += '.pdf-co-sub{font-size:10px;color:' + CSS_VARS['--t3'] + ';margin-top:2px}';
    html += '.pdf-title{font-size:14px;font-weight:600;margin-top:10px;color:' + CSS_VARS['--t'] + '}';
    html += '.pdf-title-no{font-size:10px;color:' + CSS_VARS['--t3'] + ';margin-top:2px;font-family:monospace}';
    html += '.pdf-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:11px}';
    html += '.pdf-meta-lbl{color:' + CSS_VARS['--t3'] + ';font-weight:500}';
    html += '.pdf-meta-val{color:' + CSS_VARS['--t'] + ';font-weight:600}';
    html += '.pdf-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}';
    html += '.pdf-table th{padding:6px 8px;text-align:left;background:' + CSS_VARS['--s2'] + ';color:' + CSS_VARS['--t2'] + ';font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid ' + CSS_VARS['--b'] + '}';
    html += '.pdf-table td{padding:8px;border-bottom:0.5px solid ' + CSS_VARS['--b'] + ';vertical-align:middle}';
    html += '.pdf-table th.right,.pdf-table td.right{text-align:right}';
    html += '.pdf-img{width:42px;height:42px;border-radius:4px;object-fit:cover;border:0.5px solid ' + CSS_VARS['--b'] + '}';
    html += '.pdf-img-empty{width:42px;height:42px;border-radius:4px;background:' + CSS_VARS['--s2'] + ';border:0.5px solid ' + CSS_VARS['--b'] + '}';
    html += '.pdf-prod-name{font-weight:600;color:' + CSS_VARS['--t'] + '}';
    html += '.pdf-prod-eski{color:' + CSS_VARS['--t3'] + ';font-size:10px;margin-top:2px}';
    html += '.pdf-total-cell{color:#0F6E56;font-weight:600}';
    html += '.pdf-totals{text-align:right;font-size:11px;color:' + CSS_VARS['--t2'] + ';padding:8px 0;border-top:1px solid ' + CSS_VARS['--b'] + ';margin-top:4px}';
    html += '.pdf-totals .grand{font-size:13px;font-weight:700;color:#0F6E56;border-top:1px solid ' + CSS_VARS['--b'] + ';padding-top:6px;margin-top:6px}';
    html += '.pdf-disclaimer{margin-top:14px;padding-top:8px;border-top:0.5px solid ' + CSS_VARS['--b'] + ';font-size:9px;color:' + CSS_VARS['--t3'] + ';font-style:italic}';
    html += '.pdf-footer{margin-top:18px;padding-top:10px;border-top:0.5px solid ' + CSS_VARS['--b'] + ';text-align:center;font-size:10px;color:' + CSS_VARS['--t3'] + '}';
    html += '.pdf-print-btn{margin:16px auto 0;display:block;padding:10px 24px;border:1px solid ' + CSS_VARS['--t'] + ';border-radius:6px;background:#fff;color:' + CSS_VARS['--t'] + ';font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}';
    html += '@media print { .pdf-print-btn { display: none } body { padding: 0 } }';
    html += _pageBreakCss();
    html += '</style></head><body><div class="pdf-root">';

    /* --- HEADER --- */
    html += '<div class="pdf-header">';
    html += '<div class="pdf-co">DUAY ULUSLARARASI TICARET LTD. STI.</div>';
    html += '<div class="pdf-co-sub">www.duaycor.com &middot; +90 212 625 5 444 &middot; WhatsApp: +90 532 270 5 113</div>';
    html += '<div class="pdf-title">PROFORMA INVOICE</div>';
    html += '<div class="pdf-title-no">No: ' + _esc(piNo) + '</div>';
    html += '</div>';

    /* --- META 2x2 --- */
    html += '<div class="pdf-meta">';
    html += '<div><span class="pdf-meta-lbl">TO: </span><span class="pdf-meta-val">' + _esc(musteri) + '</span></div>';
    html += '<div><span class="pdf-meta-lbl">VALID: </span><span class="pdf-meta-val">' + _esc(gecerlilik) + '</span></div>';
    html += '<div><span class="pdf-meta-lbl">DELIVERY: </span><span class="pdf-meta-val">' + _esc(incoterm) + ' ' + _esc(liman) + '</span></div>';
    html += '<div><span class="pdf-meta-lbl">PAYMENT: </span><span class="pdf-meta-val">' + _esc(odeme) + '</span></div>';
    html += '</div>';

    /* --- ÜRÜN TABLOSU --- */
    if (urunler.length) {
      html += '<table class="pdf-table">';
      html += '<thead><tr><th style="width:60px">Img</th><th>Description</th><th class="right" style="width:100px">Qty</th><th class="right" style="width:120px">Total</th></tr></thead><tbody>';
      urunler.forEach(function (u) {
        var miktar = parseFloat(u.miktar) || 0;
        var fiyat = parseFloat(u.satisFiyat) || 0;
        var toplam = miktar * fiyat;
        html += '<tr class="pb-keep">';
        if (u.gorsel) {
          html += '<td><img class="pdf-img" src="' + _esc(u.gorsel) + '" alt=""></td>';
        } else {
          html += '<td><div class="pdf-img-empty"></div></td>';
        }
        html += '<td><div class="pdf-prod-name">' + _esc(u.duayKodu || '') + (u.duayKodu ? ' &mdash; ' : '') + _esc(u.urunAdi || '') + '</div>';
        if (u.eskiKod) html += '<div class="pdf-prod-eski">(' + _esc(u.eskiKod) + ')</div>';
        html += '</td>';
        html += '<td class="right">' + _esc(miktar) + ' ' + _esc(u.birim || 'pcs') + '</td>';
        html += '<td class="right pdf-total-cell">' + _fmt(toplam) + ' ' + _esc(para) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';

      /* --- TOTALS --- */
      html += '<div class="pdf-totals pb-keep">';
      if (hasFreight && isCFR) {
        var grandTotal = toplamSatis + freight + insurance;
        html += '<div>Subtotal: ' + _fmt(toplamSatis) + ' ' + _esc(para) + '</div>';
        html += '<div>Freight: ' + _fmt(freight) + ' ' + _esc(para) + '</div>';
        if (incoterm === 'CIF' || incoterm === 'CIP') {
          html += '<div>Insurance: ' + _fmt(insurance) + ' ' + _esc(para) + '</div>';
        }
        html += '<div class="grand">TOTAL: ' + _fmt(grandTotal) + ' ' + _esc(para) + '</div>';
      } else {
        html += '<div class="grand">TOTAL: ' + _fmt(toplamSatis) + ' ' + _esc(para) + '</div>';
      }
      html += '</div>';
    } else {
      html += '<div style="text-align:center;color:' + CSS_VARS['--t3'] + ';padding:24px;font-size:11px">No products listed.</div>';
    }

    /* --- DISCLAIMER --- */
    html += '<div class="pdf-disclaimer">Product images are for illustration purposes only.</div>';

    /* --- BANKA (V153 5 alan blok) --- */
    html += _bankaBlock(para);

    /* --- FOOTER --- */
    html += '<div class="pdf-footer">DUAY ULUSLARARASI TICARET LTD. STI. &middot; www.duaycor.com</div>';

    /* --- PRINT BUTTON (sadece ekranda) --- */
    html += '<button class="pdf-print-btn" onclick="window.print()">Print / Save as PDF</button>';

    html += '</div></body></html>';
    return html;
  };

  /* ════════════════════════════════════════════════════════════
   * CORE — PDF window opener (V154 ana entry)
   * ════════════════════════════════════════════════════════════ */
  window._saV2OpenPdfV2 = function (id) {
    var liste = [];
    try { liste = window.loadSatisTeklifleri ? window.loadSatisTeklifleri() : []; } catch (e) {}
    var teklif = liste.find(function (x) { return String(x.id) === String(id); });

    if (!teklif) {
      console.error('[V154] Teklif bulunamadi:', id);
      if (window.toast) window.toast('Teklif bulunamadi', 'error');
      return;
    }

    var html = window._saV2RenderPdfHtml(teklif);
    var fileName = window._saV2PdfFileNameV2(teklif).replace(/\.pdf$/, '');

    var w = window.open('', '_blank');
    if (!w) {
      console.error('[V154] window.open engellendi (popup blocker?)');
      if (window.toast) window.toast('Popup engellendi', 'warn');
      return;
    }

    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
      /* Title yedek (HTML icinde de var) */
      try { w.document.title = fileName; } catch (e) {}
    } catch (e) {
      console.error('[V154] PDF window write hata:', e);
    }
  };

  /* ════════════════════════════════════════════════════════════
   * OVERRIDE — _printSatisTeklif (modal AÇMA, direkt PDF aç)
   * ════════════════════════════════════════════════════════════ */
  function _applyOverride() {
    var orig = window._printSatisTeklif;
    if (typeof orig === 'function') {
      window._origPrintSatisTeklif_V154 = orig;
    }
    window._printSatisTeklif = function (id) {
      try {
        window._saV2OpenPdfV2(id);
      } catch (e) {
        console.error('[V154] _saV2OpenPdfV2 hata, V153 fallback:', e);
        if (window._origPrintSatisTeklif_V154) {
          try { window._origPrintSatisTeklif_V154(id); } catch (e2) {}
        }
      }
    };
    window._saV2_pdfV2OverrideStatus = true;
    console.log('[V154 PDF v2] override aktif — modal A/B/C BYPASS');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_applyOverride, 250);
    });
  } else {
    setTimeout(_applyOverride, 250);
  }

  /* SATIS-PDF-PREVIEW-PARITY-001 — V154 sonu */
})();
