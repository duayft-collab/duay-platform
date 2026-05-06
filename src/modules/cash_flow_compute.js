/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow_compute.js — v1.0.0 (V193 EDIT 4.1)
 * CASH-FLOW-COMPUTE-LAYER — Pure compute fn'leri (TRY hesap, running
 * balance, filter helpers, özet render)
 * ════════════════════════════════════════════════════════════════
 * Bağımsız: DOM erişimi yok, side-effect yok (sadece argüman → çıktı).
 * cash_flow.js, cash_flow_excel.js ve cash_flow_pdf.js bu fn'leri reuse eder.
 *
 * Public API: window.CashFlowCompute
 *   • tryEq(satir, fallbackRates)            → number (TRY karşılığı)
 *   • runningBalance(satirlar, acilis)       → satirIdToBalance (Map<id,number>)
 *   • applyFilter(satirlar, filter)          → filtered satirlar[]
 *   • paraToplamlari(satirlar)               → {TRY:{...}, USD:{...}, ...}
 *   • renderToplam(tablo, filteredSatirlar)  → HTML (özet kartları)
 *
 * V193 KARARLARI:
 *   • A: Running balance render-time computed, FILTER ÖNCESİ hesaplanır
 *        → 1 Şubat itibariyle birikmiş bakiye doğru görünür
 *   • Transfer: kasa mevcudu DEĞİŞMEZ (nötr)
 *   • Sıra no: filter öncesi orijinal sıra (compute layer'da değil, render'da)
 *   • Açılış kasa bakiyesi: TRY (tablo.acilisKasaBakiyesi || 0 fallback)
 *   • Filter: tarih aralığı + kategori (in-memory state)
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

(function() {

  // TODO[KX10]: V19x'da shared/config/rates.js'e taşınacak — burada SADECE
  // kurSnapshot eksikse devreye girer.
  var FALLBACK_RATES = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };

  // ── 1. TRY KARŞILIĞI ──────────────────────────────────────────────
  /**
   * Bir satırın TRY karşılığını hesapla.
   * Kur snapshot satırda saklı (kurSnapshot.USD = 44.55 demek 1 USD = 44.55 TRY).
   * Eksikse FALLBACK_RATES'e düşer.
   */
  function tryEq(satir) {
    if (!satir) return 0;
    var amt = Number(satir.tutar) || 0;
    var cur = satir.paraBirimi || 'TRY';
    var rate;
    if (satir.kurSnapshot && typeof satir.kurSnapshot[cur] === 'number') {
      rate = satir.kurSnapshot[cur];
    } else {
      rate = FALLBACK_RATES[cur] || 1;
    }
    return amt * rate;
  }

  // ── 2. RUNNING BALANCE ────────────────────────────────────────────
  /**
   * Sıralanmış satırlar üzerinden running balance hesabı.
   * Filter'dan ÖNCE çağrılır — biriken bakiye doğru olur.
   *
   * Sıralama: tarih ASC + createdAt ASC (deterministik).
   * Başlangıç: acilisKasaBakiyesi (TRY).
   * Gelir → +trEq, Gider → −trEq, Transfer → nötr (bakiye aynı kalır).
   *
   * Dönüş: { id1: bakiye1, id2: bakiye2, ... } — render-time map.
   *        Ek: { _initial: acilis, _final: sonBakiye } meta.
   */
  function runningBalance(satirlar, acilisKasaBakiyesi) {
    var acilis = Number(acilisKasaBakiyesi) || 0;
    var rows = (satirlar || []).slice();
    /* Tarih ASC + createdAt ASC sıralama (orijinal liste mutate edilmez) */
    rows.sort(function(a, b) {
      var ta = String(a.tarih || ''), tb = String(b.tarih || '');
      if (ta !== tb) return ta < tb ? -1 : 1;
      var ca = String(a.createdAt || ''), cb = String(b.createdAt || '');
      return ca < cb ? -1 : (ca > cb ? 1 : 0);
    });
    var bakiye = acilis;
    var map = {};
    rows.forEach(function(s) {
      if (s.kategori === 'gelir') {
        bakiye += tryEq(s);
      } else if (s.kategori === 'gider') {
        bakiye -= tryEq(s);
      }
      /* Transfer → bakiye aynı kalır (nötr) */
      map[s.id] = bakiye;
    });
    map._initial = acilis;
    map._final = bakiye;
    return map;
  }

  // ── 3. FILTER ─────────────────────────────────────────────────────
  /**
   * Filter state: { tarihBaslangic, tarihBitis, kategori }
   *   • tarihBaslangic / tarihBitis: 'YYYY-MM-DD' string veya null
   *   • kategori: 'gelir' / 'gider' / 'transfer' / '' (hepsi)
   * Boş alanlar fitlrelemez (geç-through).
   */
  function applyFilter(satirlar, filter) {
    if (!filter) return (satirlar || []).slice();
    var fb = filter.tarihBaslangic || '';
    var fe = filter.tarihBitis || '';
    var fk = filter.kategori || '';
    return (satirlar || []).filter(function(s) {
      var t = String(s.tarih || '');
      if (fb && t < fb) return false;
      if (fe && t > fe) return false;
      if (fk && s.kategori !== fk) return false;
      return true;
    });
  }

  // ── 4. PARA BAZI TOPLAMLAR ────────────────────────────────────────
  /**
   * Filtreli satırlar üzerinden para birimi başına gelir/gider/net.
   * Dönüş: { TRY: {gelir, gider, net}, USD: {...}, ... }
   * Sadece kullanılan para birimleri yer alır (boşları yok).
   * Transfer kategori: gelir/gider'e dahil edilmez.
   */
  function paraToplamlari(satirlar) {
    var out = {};
    (satirlar || []).forEach(function(s) {
      var c = s.paraBirimi || 'TRY';
      if (!out[c]) out[c] = { gelir: 0, gider: 0, net: 0 };
      var amt = Number(s.tutar) || 0;
      if (s.kategori === 'gelir') {
        out[c].gelir += amt;
        out[c].net += amt;
      } else if (s.kategori === 'gider') {
        out[c].gider += amt;
        out[c].net -= amt;
      }
    });
    return out;
  }

  // ── 5. ÖZET RENDER (HTML) ─────────────────────────────────────────
  /**
   * Özet bölümü: para birimi başına net + Genel Toplam (TRY karşılığı) +
   *              Açılış Kasa Bakiyesi + Son Kasa Mevcudu.
   * UI sade Apple tarzı, fazla border yok.
   *
   * tablo: { paraBirimiBaz, acilisKasaBakiyesi, satirlar }
   * filteredSatirlar: filter sonrası satırlar (özet de filter'a saygılı)
   * runningMap: runningBalance() çıktısı (filtersizden — _final için)
   */
  function renderToplam(tablo, filteredSatirlar, runningMap) {
    var pt = paraToplamlari(filteredSatirlar);
    var bazPara = (tablo && tablo.paraBirimiBaz) || 'TRY';
    var acilis = (runningMap && runningMap._initial) || 0;
    var sonBakiye = (runningMap && runningMap._final) || 0;
    var totalRenk = sonBakiye > 0 ? '#1A8D6F' : (sonBakiye < 0 ? '#E0574F' : '#444');

    /* Kart paleti: para birimi başına net (kullanılanlar) — 4'er sütun grid.
     * Boş para birimleri kart üretmez (sadece veri olan). */
    var paraSira = ['TRY', 'USD', 'EUR', 'GBP'];
    var cards = paraSira.filter(function(c) { return !!pt[c]; }).map(function(c) {
      var v = pt[c] || { net: 0 };
      var net = v.net;
      var renk = net > 0 ? '#1A8D6F' : (net < 0 ? '#E0574F' : '#444');
      var bazIsareti = (c === bazPara) ? ' <span style="color:#888;font-size:9px;font-weight:400;text-transform:none;letter-spacing:0;margin-left:2px">baz</span>' : '';
      return '<div style="flex:1;min-width:140px;padding:14px;background:#fafafa;border-radius:8px;border:0.5px solid #e8e8e8">'
        + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:6px">' + c + ' Net' + bazIsareti + '</div>'
        + '<div style="font-size:18px;font-weight:500;color:' + renk + ';font-variant-numeric:tabular-nums">' + _fmt(net) + '</div>'
        + '<div style="font-size:10px;color:#999;margin-top:4px">+' + _fmt(v.gelir || 0) + ' / −' + _fmt(v.gider || 0) + '</div>'
        + '</div>';
    }).join('');

    /* Kasa bloğu — açılış + son bakiye TRY karşılığı */
    var kasaBloku = '<div style="margin-top:14px;padding:14px 18px;background:#fafafa;border-radius:10px;border:0.5px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">'
      + '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em">'
        + '<div>Açılış Kasa Bakiyesi</div>'
        + '<div style="margin-top:2px;color:#444;font-size:14px;font-weight:500;text-transform:none;letter-spacing:0;font-variant-numeric:tabular-nums">' + _fmt(acilis) + ' ₺</div>'
      + '</div>'
      + '<div style="text-align:right">'
        + '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Son Kasa Mevcudu (TRY karşılığı)</div>'
        + '<div style="font-size:20px;font-weight:600;color:' + totalRenk + ';font-variant-numeric:tabular-nums;margin-top:2px">' + _fmt(sonBakiye) + ' ₺</div>'
      + '</div>'
    + '</div>';

    return (cards
      ? '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' + cards + '</div>'
      : '')
      + kasaBloku;
  }

  // ── HELPERS ──────────────────────────────────────────────────────
  function _fmt(n) {
    var v = Number(n) || 0;
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── 6. PUBLIC API ─────────────────────────────────────────────────
  window.CashFlowCompute = {
    tryEq:           tryEq,
    runningBalance:  runningBalance,
    applyFilter:     applyFilter,
    paraToplamlari:  paraToplamlari,
    renderToplam:    renderToplam,
    FALLBACK_RATES:  FALLBACK_RATES
  };

})();
