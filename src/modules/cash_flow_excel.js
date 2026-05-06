/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_excel.js — v2.0.0 (V193 EDIT 5.1 REWRITE)
 * CASH-FLOW-EXCEL-MODULE — XLSX export (SheetJS), 12 kolon
 * ════════════════════════════════════════════════════════════════
 * Bağımlı:
 *   • window.XLSX (SheetJS — index.html cdn.sheetjs.com)
 *   • window.CashFlow (cash_flow.js) — load
 *   • window.CashFlowCompute (cash_flow_compute.js) — runningBalance, applyFilter, tryEq
 *   • window.toast — uyarılar
 *
 * V193 EDIT 5.1 — REWRITE kapsamı:
 *   • 12 kolon: Sıra · Tarih · Açıklama · Tür · Tutar · Para Birimi ·
 *               Kur · TRY Karşılığı · Kaynak · Kategori · Kasa Mevcudu · Notlar
 *   • Filtre uygulanmış liste export (window._cfFilter saygılı)
 *   • Sabit kolon düzeni — muhasebeci Excel filtresi açtığında bozulmaz
 *   • Running balance filter ÖNCESİ hesaplanır (TRY karşılığı tutarlı)
 *   • Sıra no orijinal (filter ÖNCESİ liste sırası)
 *   • Toplam blok: Açılış · Para birimi başına Gelir/Gider/Net · Son Bakiye
 *   • UTF-8 Türkçe native (SheetJS native, encoding ek işlem yok)
 *
 * Inline onclick: 0 · Native alert/prompt/confirm: 0
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  // TODO[KX10]: shared/config/rates.js'e taşınacak
  var FALLBACK_RATES = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };

  // ── HELPER'LAR ────────────────────────────────────────────────────
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

  function _cfxRound2(n) {
    var v = Number(n) || 0;
    return Math.round(v * 100) / 100;
  }

  function _cfxKategoriLabel(k) {
    if (k === 'gelir') return 'Gelir';
    if (k === 'gider') return 'Gider';
    if (k === 'transfer') return 'Transfer';
    return String(k || '—');
  }

  function _cfxTurIsaret(k) {
    if (k === 'gelir') return '+';
    if (k === 'gider') return '−';
    if (k === 'transfer') return '↔';
    return '';
  }

  /** Kur snapshot — satırın paraBirimi için. Yoksa fallback. */
  function _cfxKur(s) {
    var cur = s.paraBirimi || 'TRY';
    if (cur === 'TRY') return 1;
    if (s.kurSnapshot && typeof s.kurSnapshot[cur] === 'number') return s.kurSnapshot[cur];
    return FALLBACK_RATES[cur] || 1;
  }

  /** TRY karşılığı — CashFlowCompute reuse, yoksa fallback */
  function _cfxTryEq(s) {
    if (window.CashFlowCompute && typeof window.CashFlowCompute.tryEq === 'function') {
      try { return window.CashFlowCompute.tryEq(s); } catch (_) {}
    }
    var amt = Number(s.tutar) || 0;
    return amt * _cfxKur(s);
  }

  // ── ANA EXPORT FN ────────────────────────────────────────────────
  function exportXlsx() {
    if (!_cfxXlsxReady()) {
      _cfxToast('Excel kütüphanesi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    if (!window.CashFlow || typeof window.CashFlow.load !== 'function') {
      _cfxToast('Nakit akışı modülü hazır değil.', 'err');
      return;
    }

    var state, tablo;
    try {
      state = window.CashFlow.load();
      tablo = (state.tablolar || []).find(function(t) { return t.id === state.aktifTabloId; });
      if (!tablo) {
        _cfxToast('Aktif çalışma bulunamadı.', 'warn');
        return;
      }
    } catch (e) {
      console.error('[CF-XLSX] state load error:', e);
      _cfxToast('Veri okunamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
      return;
    }

    var allSatirlar = tablo.satirlar || [];
    if (!allSatirlar.length) {
      _cfxToast('İndirilecek satır yok.', 'warn');
      return;
    }

    /* Compute pipeline — _cfRenderPanel ile tutarlı:
     * 1) runningBalance: TÜM satırlar üzerinden, filter ÖNCESİ → birikmiş bakiye doğru
     * 2) applyFilter:    in-memory _cfFilter state'e göre satırları süz
     * 3) originalIndex:  sıra no orijinal (filter öncesi 1-bazlı) */
    var acilis = Number(tablo.acilisKasaBakiyesi) || 0;
    var runningMap = {};
    var filtered = allSatirlar;
    if (window.CashFlowCompute) {
      try {
        runningMap = window.CashFlowCompute.runningBalance(allSatirlar, acilis) || {};
        filtered = window.CashFlowCompute.applyFilter(allSatirlar, window._cfFilter) || allSatirlar;
      } catch (e) {
        console.warn('[CF-XLSX] compute error:', e && e.message);
        runningMap = { _initial: acilis, _final: acilis };
      }
    }
    var originalIndex = {};
    allSatirlar.forEach(function(s, i) { originalIndex[s.id] = i + 1; });

    if (!filtered.length) {
      _cfxToast('Filtreyle eşleşen satır yok. Excel için filtreyi temizle.', 'warn');
      return;
    }

    /* ── Sheet: 12 kolon (sabit düzen — muhasebeci filtre açınca bozulmaz) ── */
    var aoa = [
      ['Sıra', 'Tarih', 'Açıklama', 'Tür', 'Tutar', 'Para Birimi',
       'Kur', 'TRY Karşılığı', 'Kaynak', 'Kategori', 'Kasa Mevcudu (TRY)', 'Notlar']
    ];

    filtered.forEach(function(s) {
      var sira = (originalIndex[s.id] != null) ? originalIndex[s.id] : '';
      var kur = _cfxKur(s);
      var trEq = _cfxTryEq(s);
      var bakiye = (typeof runningMap[s.id] === 'number') ? runningMap[s.id] : null;
      /* Transfer satırında bakiye değişmez ama gösterilir (cumulative) */
      aoa.push([
        sira,
        s.tarih || '',
        s.aciklama || '',
        _cfxTurIsaret(s.kategori),
        _cfxRound2(s.tutar),
        s.paraBirimi || 'TRY',
        (s.paraBirimi === 'TRY') ? 1 : _cfxRound2(kur),
        _cfxRound2(trEq),
        s.kaynak || '',
        _cfxKategoriLabel(s.kategori),
        bakiye != null ? _cfxRound2(bakiye) : '',
        s.aciklamaNot || ''   // gelecek için yer ayrıldı, şu an boş
      ]);
    });

    /* ── Toplam blok ── */
    aoa.push([]);
    aoa.push(['ÖZET']);
    aoa.push(['Açılış Kasa Bakiyesi (TRY)', _cfxRound2(acilis)]);
    aoa.push([]);
    aoa.push(['Para Birimi', 'Gelir', 'Gider', 'Net']);

    /* Filtreli satırlardan para birimi başına gelir/gider/net */
    var byCur = {};
    filtered.forEach(function(s) {
      var c = s.paraBirimi || 'TRY';
      if (!byCur[c]) byCur[c] = { gelir: 0, gider: 0 };
      var amt = Number(s.tutar) || 0;
      if (s.kategori === 'gelir') byCur[c].gelir += amt;
      else if (s.kategori === 'gider') byCur[c].gider += amt;
    });
    var paraSira = ['TRY', 'USD', 'EUR', 'GBP'];
    paraSira.filter(function(c) { return !!byCur[c]; }).forEach(function(c) {
      var b = byCur[c];
      aoa.push([c, _cfxRound2(b.gelir), _cfxRound2(b.gider), _cfxRound2(b.gelir - b.gider)]);
    });

    aoa.push([]);
    aoa.push(['Son Kasa Mevcudu (TRY karşılığı)',
              _cfxRound2(runningMap._final != null ? runningMap._final : acilis)]);

    /* Filtre bilgisi (varsa) */
    var f = window._cfFilter || {};
    if (f.tarihBaslangic || f.tarihBitis || f.kategori) {
      aoa.push([]);
      aoa.push(['FİLTRE BİLGİSİ']);
      if (f.tarihBaslangic) aoa.push(['Başlangıç', f.tarihBaslangic]);
      if (f.tarihBitis)     aoa.push(['Bitiş', f.tarihBitis]);
      if (f.kategori)       aoa.push(['Tür', _cfxKategoriLabel(f.kategori)]);
    }

    var ws, wb;
    try {
      ws = window.XLSX.utils.aoa_to_sheet(aoa);
      /* Sabit kolon genişlikleri — muhasebeci AutoFilter açınca bozulmaz */
      ws['!cols'] = [
        { wch: 6  },   // Sıra
        { wch: 12 },   // Tarih
        { wch: 30 },   // Açıklama
        { wch: 5  },   // Tür
        { wch: 12 },   // Tutar
        { wch: 8  },   // Para Birimi
        { wch: 8  },   // Kur
        { wch: 14 },   // TRY Karşılığı
        { wch: 18 },   // Kaynak
        { wch: 12 },   // Kategori
        { wch: 16 },   // Kasa Mevcudu
        { wch: 20 }    // Notlar
      ];
      /* Header satırına dondur — muhasebeci scroll ederken header görünür kalsın */
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Nakit Akışı');
    } catch (e) {
      console.error('[CF-XLSX] sheet build error:', e);
      _cfxToast('Excel oluşturulamadı: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
      return;
    }

    var fileName = 'nakit-akis-' + _cfxSlug(tablo.ad) + '-' + _cfxDateStr() + '.xlsx';
    try {
      window.XLSX.writeFile(wb, fileName);
      try {
        if (typeof window._auditLog === 'function') {
          window._auditLog('cf_export_xlsx', tablo.id || '',
            'rows=' + filtered.length + '/' + allSatirlar.length + ' file=' + fileName);
        }
      } catch (_) {}
      _cfxToast('Excel indirildi: ' + fileName, 'ok');
    } catch (e) {
      console.error('[CF-XLSX] writeFile error:', e);
      _cfxToast('Dosya indirilemedi: ' + (e && e.message ? e.message : 'bilinmeyen hata'), 'err');
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────
  window.CashFlowExcel = {
    exportXlsx: exportXlsx
  };

})();
