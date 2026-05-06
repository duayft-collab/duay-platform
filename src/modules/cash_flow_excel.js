/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_excel.js — v1.0.0 (V193 MUHASEBAT-001)
 * CASH-FLOW-EXCEL-MODULE-001 — XLSX export (SheetJS)
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.XLSX (SheetJS — index.html cdn.sheetjs.com xlsx.full.min.js)
 *   • window.CashFlow (cash_flow.js) — _cfLoad ile aktif tablo + kalkulasyon
 *   • window.calculateCashFlow (cash_flow.js) — toplam satır için
 *   • window.toast — kullanıcı uyarıları
 *
 * Sorumluluk:
 *   • Aktif çalışmanın satırlarını Excel'e dök
 *   • UTF-8 Türkçe karakter uyumu (SheetJS native — encoding ayrı işlem yok)
 *   • Kolonlar: Tarih · Tür · Açıklama · Tutar · Para Birimi · Kaynak · Kategori
 *   • Para birimi başına toplam blok + TRY genel toplam
 *   • Dosya adı: nakit-akis-{calismaAd-slug}-{YYYYMMDD}.xlsx
 *
 * Inline onclick: 0 (data-cf-action="export-xlsx" — cash_flow.js _cfBindEvents'e
 *   ek case eklenir, EDIT 4 cash_flow.js refactor kapsamı).
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  // ── 1. HELPER'LAR ─────────────────────────────────────────────────
  function _cfxToast(msg, level) {
    if (typeof window.toast === 'function') window.toast(msg, level || 'ok');
    else console.log('[CF-XLSX]', level || 'ok', msg);
  }

  function _cfxXlsxReady() {
    return !!(window.XLSX && window.XLSX.utils && typeof window.XLSX.writeFile === 'function');
  }

  /** Türkçe karakter slug — dosya adı güvenli */
  function _cfxSlug(s) {
    var trMap = { 'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U' };
    return String(s || 'calisma')
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, function(c) { return trMap[c] || c; })
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'calisma';
  }

  function _cfxDateStr() {
    var d = new Date();
    return d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
  }

  /** Sayı yuvarlama — 2 ondalık (Excel native sayı tipinde tutulur) */
  function _cfxRound2(n) {
    var v = Number(n) || 0;
    return Math.round(v * 100) / 100;
  }

  /** Kategori TR label: gelir/gider/transfer */
  function _cfxKategoriLabel(k) {
    if (k === 'gelir') return 'Gelir';
    if (k === 'gider') return 'Gider';
    if (k === 'transfer') return 'Transfer';
    return String(k || '—');
  }

  /** Tür kolonu: + / − / ↔ — kategori'den türetilir (raporda hızlı tarama) */
  function _cfxTurIsaret(k) {
    if (k === 'gelir') return '+';
    if (k === 'gider') return '−';
    if (k === 'transfer') return '↔';
    return '';
  }

  // ── 2. EXCEL EXPORT ──────────────────────────────────────────────
  /**
   * cash_flow.js _cfBindEvents → data-cf-action="export-xlsx" tetikler.
   * Aktif çalışmayı CashFlow.load() ile alır, satırları sheet'e döker,
   * para birimi gruplu toplam blok ekler ve dosyayı download eder.
   */
  function exportXlsx() {
    if (!_cfxXlsxReady()) {
      _cfxToast('Excel kütüphanesi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    if (!window.CashFlow || typeof window.CashFlow.load !== 'function') {
      _cfxToast('Nakit akışı modülü hazır değil.', 'err');
      return;
    }

    var state, tablo, calc;
    try {
      state = window.CashFlow.load();
      tablo = (state.tablolar || []).find(function(t) { return t.id === state.aktifTabloId; });
      if (!tablo) {
        _cfxToast('Aktif çalışma bulunamadı.', 'warn');
        return;
      }
      calc = (typeof window.calculateCashFlow === 'function')
        ? window.calculateCashFlow(tablo)
        : { byCurrency: {}, totalTRY: 0 };
    } catch (e) {
      console.error('[CF-XLSX] state load error:', e);
      _cfxToast('Veri okunamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
      return;
    }

    var satirlar = tablo.satirlar || [];
    if (!satirlar.length) {
      _cfxToast('İndirilecek satır yok.', 'warn');
      return;
    }

    /* ── Sheet 1: Satırlar ──
     * Kolonlar: Tarih, Tür, Açıklama, Tutar, Para Birimi, Kaynak, Kategori
     * SheetJS aoa_to_sheet ile array-of-arrays — sayılar Excel'de native sayı tipinde tutulur. */
    var aoa = [
      ['Tarih', 'Tür', 'Açıklama', 'Tutar', 'Para Birimi', 'Kaynak', 'Kategori']
    ];
    satirlar.forEach(function(s) {
      aoa.push([
        s.tarih || '',
        _cfxTurIsaret(s.kategori),
        s.aciklama || '',
        _cfxRound2(s.tutar),
        s.paraBirimi || 'TRY',
        s.kaynak || '',
        _cfxKategoriLabel(s.kategori)
      ]);
    });

    /* ── Toplam blok (sheet'in altına) ──
     * Boş satır → Para birimi başına Gelir/Gider/Net → Genel TRY toplam */
    aoa.push([]);
    aoa.push(['ÖZET']);
    aoa.push(['Para Birimi', 'Gelir', 'Gider', 'Net']);
    var byCur = (calc && calc.byCurrency) || {};
    var paraBirimleri = Object.keys(byCur);
    if (!paraBirimleri.length) {
      /* calculateCashFlow çıktısı boşsa satırlardan manuel hesapla */
      var manuel = {};
      satirlar.forEach(function(s) {
        var c = s.paraBirimi || 'TRY';
        if (!manuel[c]) manuel[c] = { gelir: 0, gider: 0 };
        if (s.kategori === 'gelir') manuel[c].gelir += Number(s.tutar) || 0;
        else if (s.kategori === 'gider') manuel[c].gider += Number(s.tutar) || 0;
      });
      Object.keys(manuel).forEach(function(c) {
        var net = manuel[c].gelir - manuel[c].gider;
        aoa.push([c, _cfxRound2(manuel[c].gelir), _cfxRound2(manuel[c].gider), _cfxRound2(net)]);
      });
    } else {
      paraBirimleri.forEach(function(c) {
        var b = byCur[c] || {};
        aoa.push([c, _cfxRound2(b.gelir || 0), _cfxRound2(b.gider || 0), _cfxRound2(b.net || 0)]);
      });
    }
    if (calc && typeof calc.totalTRY === 'number') {
      aoa.push([]);
      aoa.push(['Genel Toplam (TRY karşılığı)', _cfxRound2(calc.totalTRY)]);
    }

    var ws, wb;
    try {
      ws = window.XLSX.utils.aoa_to_sheet(aoa);

      /* Kolon genişlikleri — okunabilirlik için */
      ws['!cols'] = [
        { wch: 12 },   // Tarih
        { wch: 5  },   // Tür
        { wch: 32 },   // Açıklama
        { wch: 14 },   // Tutar
        { wch: 8  },   // Para Birimi
        { wch: 18 },   // Kaynak
        { wch: 12 }    // Kategori
      ];

      wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Nakit Akışı');
    } catch (e) {
      console.error('[CF-XLSX] sheet build error:', e);
      _cfxToast('Excel oluşturulamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
      return;
    }

    var fileName = 'nakit-akis-' + _cfxSlug(tablo.ad) + '-' + _cfxDateStr() + '.xlsx';
    try {
      /* SheetJS writeFile UTF-8 native — Türkçe karakterler bozulmaz.
       * bookType: xlsx (default) — Office 2007+ uyumlu. */
      window.XLSX.writeFile(wb, fileName);
      /* V193 EDIT 4 — audit log (varsa) */
      try {
        if (typeof window._auditLog === 'function') {
          window._auditLog('cf_export_xlsx', tablo.id || '',
            'rows=' + satirlar.length + ' file=' + fileName);
        }
      } catch (_) {}
      _cfxToast('Excel indirildi: ' + fileName, 'ok');
    } catch (e) {
      console.error('[CF-XLSX] writeFile error:', e);
      _cfxToast('Dosya indirilemedi: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
    }
  }

  // ── 3. PUBLIC API ─────────────────────────────────────────────────
  window.CashFlowExcel = {
    exportXlsx: exportXlsx
  };

})();
