/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_pdf.js — v1.0.0 (V193 EDIT 5.2)
 * CASH-FLOW-PDF-MODULE — PDF export (html2pdf.js)
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.html2pdf (cdn.jsdelivr.net/npm/html2pdf.js — index.html'de mevcut)
 *   • window.CashFlow (cash_flow.js) — load
 *   • window.CashFlowCompute — runningBalance, applyFilter, tryEq, paraToplamlari
 *   • window.toast — uyarılar
 *
 * V193 EDIT 5.2 — Yapı:
 *   • Off-screen render container (#cf-pdf-render, position:fixed, top:-99999px)
 *   • 12 kolon tablo (Excel ile aynı) + toplam özet + filtre bilgisi
 *   • Sade kurumsal görünüm — açık gri border, zebra row hafif
 *   • Apple tarzı boşluk — padding cömert, font 10px tablo, 14px başlık
 *   • Render sonrası temp DOM .remove() — memory leak yok
 *   • Filename: nakit-akis-{slug}-{YYYYMMDD}.pdf
 *   • A4 landscape (12 kolon → portrait taşar)
 *
 * Inline onclick: 0 · Native alert/prompt/confirm: 0
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  var TEMP_ID = 'cf-pdf-render';

  // TODO[KX10]: shared/config/rates.js
  var FALLBACK_RATES = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };

  // ── HELPER'LAR ────────────────────────────────────────────────────
  function _cfpToast(msg, level) {
    if (typeof window.toast === 'function') window.toast(msg, level || 'ok');
    else console.log('[CF-PDF]', level || 'ok', msg);
  }

  function _cfpReady() {
    return typeof window.html2pdf !== 'undefined';
  }

  function _cfpEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _cfpFmt(n) {
    var v = Number(n) || 0;
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _cfpSlug(s) {
    var trMap = { 'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U' };
    return String(s || 'calisma')
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, function(c) { return trMap[c] || c; })
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'calisma';
  }

  function _cfpDateStr() {
    var d = new Date();
    return d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
  }

  function _cfpDateLabelTR() {
    var d = new Date();
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function _cfpKategoriLabel(k) {
    if (k === 'gelir') return 'Gelir';
    if (k === 'gider') return 'Gider';
    if (k === 'transfer') return 'Transfer';
    return String(k || '—');
  }

  function _cfpTurIsaret(k) {
    if (k === 'gelir') return '+';
    if (k === 'gider') return '−';
    if (k === 'transfer') return '↔';
    return '';
  }

  function _cfpKur(s) {
    var cur = s.paraBirimi || 'TRY';
    if (cur === 'TRY') return 1;
    if (s.kurSnapshot && typeof s.kurSnapshot[cur] === 'number') return s.kurSnapshot[cur];
    return FALLBACK_RATES[cur] || 1;
  }

  function _cfpTryEq(s) {
    if (window.CashFlowCompute && typeof window.CashFlowCompute.tryEq === 'function') {
      try { return window.CashFlowCompute.tryEq(s); } catch (_) {}
    }
    return (Number(s.tutar) || 0) * _cfpKur(s);
  }

  function _cfpRemoveTemp() {
    var ex = document.getElementById(TEMP_ID);
    if (ex) ex.remove();
  }

  // ── RENDER HELPERS ────────────────────────────────────────────────
  /**
   * Filtre bilgisi etiketi — başlık altında küçük gri text.
   * Hiç filtre yoksa boş string döner.
   */
  function _cfpFilterLabel() {
    var f = window._cfFilter || {};
    var parts = [];
    if (f.tarihBaslangic) parts.push('Başlangıç: ' + f.tarihBaslangic);
    if (f.tarihBitis)     parts.push('Bitiş: ' + f.tarihBitis);
    if (f.kategori)       parts.push('Tür: ' + _cfpKategoriLabel(f.kategori));
    return parts.length ? parts.join('  ·  ') : '';
  }

  /**
   * Tablo satırı render — zebra row hafif, kategori renk küçük dozda.
   * Taşma için font 9px (12 kolon landscape).
   */
  function _cfpRenderRow(s, sira, runningMap, isAlt) {
    var renk = s.kategori === 'gelir' ? '#1A8D6F' : (s.kategori === 'gider' ? '#E0574F' : '#888');
    var bg = isAlt ? '#FAFAFA' : '#FFFFFF';
    var bakiye = (typeof runningMap[s.id] === 'number') ? runningMap[s.id] : null;
    var bakiyeStr = (bakiye != null) ? _cfpFmt(bakiye) : '—';
    var kurStr = (s.paraBirimi === 'TRY') ? '—' : _cfpFmt(_cfpKur(s));
    var trEqStr = _cfpFmt(_cfpTryEq(s));

    return '<tr style="background:' + bg + ';page-break-inside:avoid">'
      + '<td style="padding:5px 6px;text-align:center;color:#999;font-size:8px;border-bottom:0.5px solid #EEE">' + sira + '</td>'
      + '<td style="padding:5px 6px;color:#444;font-size:9px;border-bottom:0.5px solid #EEE">' + _cfpEsc(s.tarih || '') + '</td>'
      + '<td style="padding:5px 8px;color:#222;font-size:9px;border-bottom:0.5px solid #EEE">' + _cfpEsc(s.aciklama || '—') + '</td>'
      + '<td style="padding:5px 6px;text-align:center;color:' + renk + ';font-size:10px;font-weight:600;border-bottom:0.5px solid #EEE">' + _cfpTurIsaret(s.kategori) + '</td>'
      + '<td style="padding:5px 6px;text-align:right;color:' + renk + ';font-size:9px;font-weight:500;border-bottom:0.5px solid #EEE">' + _cfpFmt(s.tutar) + '</td>'
      + '<td style="padding:5px 6px;text-align:center;color:#444;font-size:9px;border-bottom:0.5px solid #EEE">' + _cfpEsc(s.paraBirimi || 'TRY') + '</td>'
      + '<td style="padding:5px 6px;text-align:right;color:#888;font-size:8px;border-bottom:0.5px solid #EEE">' + kurStr + '</td>'
      + '<td style="padding:5px 6px;text-align:right;color:#666;font-size:9px;border-bottom:0.5px solid #EEE">' + trEqStr + '</td>'
      + '<td style="padding:5px 6px;color:#444;font-size:9px;border-bottom:0.5px solid #EEE">' + _cfpEsc(s.kaynak || '—') + '</td>'
      + '<td style="padding:5px 6px;text-align:center;color:' + renk + ';font-size:9px;text-transform:capitalize;border-bottom:0.5px solid #EEE">' + _cfpEsc(s.kategori || '') + '</td>'
      + '<td style="padding:5px 6px;text-align:right;color:#222;font-size:9px;font-weight:500;border-bottom:0.5px solid #EEE">' + bakiyeStr + '</td>'
      + '</tr>';
  }

  /**
   * Toplam özet bloğu — sade kart, açık gri arka plan, fazla border yok.
   */
  function _cfpRenderOzet(tablo, filtered, runningMap) {
    var acilis = (runningMap && runningMap._initial) || 0;
    var sonBakiye = (runningMap && runningMap._final) || 0;
    var sonRenk = sonBakiye > 0 ? '#1A8D6F' : (sonBakiye < 0 ? '#E0574F' : '#444');

    /* Filtreli satırlardan para birimi başına gelir/gider/net */
    var byCur = {};
    (filtered || []).forEach(function(s) {
      var c = s.paraBirimi || 'TRY';
      if (!byCur[c]) byCur[c] = { gelir: 0, gider: 0 };
      var amt = Number(s.tutar) || 0;
      if (s.kategori === 'gelir') byCur[c].gelir += amt;
      else if (s.kategori === 'gider') byCur[c].gider += amt;
    });
    var paraSira = ['TRY', 'USD', 'EUR', 'GBP'];
    var paraRows = paraSira.filter(function(c) { return !!byCur[c]; }).map(function(c) {
      var b = byCur[c];
      var net = b.gelir - b.gider;
      var netRenk = net > 0 ? '#1A8D6F' : (net < 0 ? '#E0574F' : '#444');
      return '<tr>'
        + '<td style="padding:4px 8px;font-size:9px;color:#444;font-weight:500">' + c + '</td>'
        + '<td style="padding:4px 8px;font-size:9px;color:#1A8D6F;text-align:right">' + _cfpFmt(b.gelir) + '</td>'
        + '<td style="padding:4px 8px;font-size:9px;color:#E0574F;text-align:right">' + _cfpFmt(b.gider) + '</td>'
        + '<td style="padding:4px 8px;font-size:9px;color:' + netRenk + ';text-align:right;font-weight:600">' + _cfpFmt(net) + '</td>'
      + '</tr>';
    }).join('');

    return '<div style="margin-top:14px;display:flex;gap:14px;flex-wrap:wrap">'
      /* Para birimi tablosu */
      + (paraRows
        ? '<div style="flex:1;min-width:280px;background:#FAFAFA;border-radius:8px;padding:10px 12px">'
          + '<div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Para Birimi Toplamları</div>'
          + '<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums">'
            + '<thead><tr style="border-bottom:0.5px solid #DDD">'
              + '<th style="padding:4px 8px;font-size:8px;color:#888;text-align:left;font-weight:500">Para</th>'
              + '<th style="padding:4px 8px;font-size:8px;color:#888;text-align:right;font-weight:500">Gelir</th>'
              + '<th style="padding:4px 8px;font-size:8px;color:#888;text-align:right;font-weight:500">Gider</th>'
              + '<th style="padding:4px 8px;font-size:8px;color:#888;text-align:right;font-weight:500">Net</th>'
            + '</tr></thead><tbody>' + paraRows + '</tbody>'
          + '</table>'
        + '</div>'
        : '')
      /* Kasa bloğu */
      + '<div style="flex:1;min-width:240px;background:#FAFAFA;border-radius:8px;padding:10px 12px">'
        + '<div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Kasa Durumu</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:10px;color:#444;margin-top:4px">'
          + '<span>Açılış Kasa</span>'
          + '<span style="font-variant-numeric:tabular-nums">' + _cfpFmt(acilis) + ' ₺</span>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;margin-top:8px;padding-top:6px;border-top:0.5px solid #DDD">'
          + '<span style="color:#444">Son Kasa Mevcudu</span>'
          + '<span style="color:' + sonRenk + ';font-variant-numeric:tabular-nums">' + _cfpFmt(sonBakiye) + ' ₺</span>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  // ── ANA EXPORT FN ────────────────────────────────────────────────
  function exportPdf() {
    if (!_cfpReady()) {
      _cfpToast('PDF kütüphanesi (html2pdf) yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    if (!window.CashFlow || typeof window.CashFlow.load !== 'function') {
      _cfpToast('Nakit akışı modülü hazır değil.', 'err');
      return;
    }

    var state, tablo;
    try {
      state = window.CashFlow.load();
      tablo = (state.tablolar || []).find(function(t) { return t.id === state.aktifTabloId; });
      if (!tablo) {
        _cfpToast('Aktif çalışma bulunamadı.', 'warn');
        return;
      }
    } catch (e) {
      console.error('[CF-PDF] state load error:', e);
      _cfpToast('Veri okunamadı.', 'err');
      return;
    }

    var allSatirlar = tablo.satirlar || [];
    if (!allSatirlar.length) {
      _cfpToast('İndirilecek satır yok.', 'warn');
      return;
    }

    /* Compute pipeline — Excel ile birebir aynı */
    var acilis = Number(tablo.acilisKasaBakiyesi) || 0;
    var runningMap = {};
    var filtered = allSatirlar;
    if (window.CashFlowCompute) {
      try {
        runningMap = window.CashFlowCompute.runningBalance(allSatirlar, acilis) || {};
        filtered = window.CashFlowCompute.applyFilter(allSatirlar, window._cfFilter) || allSatirlar;
      } catch (e) {
        console.warn('[CF-PDF] compute error:', e && e.message);
        runningMap = { _initial: acilis, _final: acilis };
      }
    }
    var originalIndex = {};
    allSatirlar.forEach(function(s, i) { originalIndex[s.id] = i + 1; });

    if (!filtered.length) {
      _cfpToast('Filtreyle eşleşen satır yok. PDF için filtreyi temizle.', 'warn');
      return;
    }

    /* Off-screen render container — mevcut paneli etkilemeden html2pdf'in
     * kullanacağı geçici DOM. position:fixed top:-99999px → kullanıcıya görünmez. */
    _cfpRemoveTemp();
    var container = document.createElement('div');
    container.id = TEMP_ID;
    container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1100px;background:#FFF;color:#222;font-family:-apple-system,BlinkMacSystemFont,system-ui,Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box';

    /* Satırları sırala (compute ile tutarlı) — tarih ASC + createdAt ASC.
     * Görsel olarak da bu sırayla görünür ki kasa mevcudu monoton ilerlesin. */
    var sortedRows = filtered.slice().sort(function(a, b) {
      var ta = String(a.tarih || ''), tb = String(b.tarih || '');
      if (ta !== tb) return ta < tb ? -1 : 1;
      var ca = String(a.createdAt || ''), cb = String(b.createdAt || '');
      return ca < cb ? -1 : (ca > cb ? 1 : 0);
    });

    var rowsHtml = sortedRows.map(function(s, i) {
      var sira = (originalIndex[s.id] != null) ? originalIndex[s.id] : '';
      return _cfpRenderRow(s, sira, runningMap, i % 2 === 1);
    }).join('');

    var filterLabel = _cfpFilterLabel();
    var filterRow = filterLabel
      ? '<div style="margin-top:4px;font-size:10px;color:#888">Filtre: ' + _cfpEsc(filterLabel) + '</div>'
      : '';

    container.innerHTML = ''
      /* Başlık bloğu — sade kurumsal */
      + '<div style="border-bottom:1px solid #DDD;padding-bottom:12px;margin-bottom:14px">'
        + '<div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:0.1em">Duay · Nakit Akışı Manuel</div>'
        + '<div style="font-size:18px;color:#222;font-weight:600;margin-top:4px">' + _cfpEsc(tablo.ad || 'Manuel Kasa') + '</div>'
        + '<div style="margin-top:6px;font-size:10px;color:#666">Çıktı tarihi: ' + _cfpEsc(_cfpDateLabelTR()) + '  ·  ' + sortedRows.length + ' satır</div>'
        + filterRow
      + '</div>'
      /* Tablo */
      + '<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:9px">'
        + '<thead><tr style="background:#F5F5F5">'
          + '<th style="padding:7px 6px;text-align:center;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">#</th>'
          + '<th style="padding:7px 6px;text-align:left;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Tarih</th>'
          + '<th style="padding:7px 8px;text-align:left;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Açıklama</th>'
          + '<th style="padding:7px 6px;text-align:center;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Tür</th>'
          + '<th style="padding:7px 6px;text-align:right;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Tutar</th>'
          + '<th style="padding:7px 6px;text-align:center;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Para</th>'
          + '<th style="padding:7px 6px;text-align:right;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Kur</th>'
          + '<th style="padding:7px 6px;text-align:right;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">TRY ≈</th>'
          + '<th style="padding:7px 6px;text-align:left;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Kaynak</th>'
          + '<th style="padding:7px 6px;text-align:center;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Kategori</th>'
          + '<th style="padding:7px 6px;text-align:right;color:#666;font-size:8px;font-weight:600;border-bottom:0.5px solid #CCC">Kasa Mevcudu</th>'
        + '</tr></thead>'
        + '<tbody>' + rowsHtml + '</tbody>'
      + '</table>'
      /* Toplam özet */
      + _cfpRenderOzet(tablo, filtered, runningMap)
      /* Footer */
      + '<div style="margin-top:18px;padding-top:8px;border-top:0.5px solid #EEE;font-size:8px;color:#999;text-align:center">Duay Global Trade Company  ·  ' + _cfpEsc(_cfpDateLabelTR()) + '</div>';

    document.body.appendChild(container);

    var fileName = 'nakit-akis-' + _cfpSlug(tablo.ad) + '-' + _cfpDateStr() + '.pdf';
    _cfpToast('PDF hazırlanıyor...', 'ok');

    /* html2pdf — A4 landscape (12 kolon → portrait taşar).
     * margin 8mm, scale 1.5 (Türkçe karakter düzgün), pagebreak avoid (zebra row koru). */
    try {
      window.html2pdf()
        .set({
          margin: 8,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 1.5, logging: false, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .from(container)
        .save()
        .then(function() {
          _cfpRemoveTemp();
          _cfpToast('PDF indirildi: ' + fileName, 'ok');
          try {
            if (typeof window._auditLog === 'function') {
              window._auditLog('cf_export_pdf', tablo.id || '',
                'rows=' + filtered.length + '/' + allSatirlar.length + ' file=' + fileName);
            }
          } catch (_) {}
        })
        .catch(function(e) {
          console.error('[CF-PDF] generation error:', e);
          _cfpRemoveTemp();
          _cfpToast('PDF oluşturulamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
        });
    } catch (e) {
      console.error('[CF-PDF] init error:', e);
      _cfpRemoveTemp();
      _cfpToast('PDF başlatılamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────
  window.CashFlowPdf = {
    exportPdf: exportPdf
  };

})();
