/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/nakit_akis.js  —  v1.0.0 / 2026-04-12
 * Nakit Akışı Modülü — Bağımsız Cash Flow Paneli
 *
 * Özellikler:
 *   • 4 özet kart: Net Pozisyon TRY, Bu Ay Giren, Bu Ay Çıkan, Gecikmiş Tahsilat
 *   • Bugün vadesi gelen ödemeler ve tahsilatlar (2 kolon)
 *   • 30-60-90 gün NET projeksiyon (3 bucket)
 *
 * Veri kaynakları:
 *   • window.loadOdm()       — ödemeler
 *   • window.loadTahsilat()  — tahsilatlar
 *   • window._saKur          — kur tablosu (satin_alma_v2.js, API'den taze)
 *
 * Routing: App.nav('nakit-akis') → app_patch.js _newPanels['nakit-akis']
 * Panel id: panel-nakit-akisi
 * ════════════════════════════════════════════════════════════════
 */
(function() {
  'use strict';

  // ── Sabitler ─────────────────────────────────────────────────────
  /** Fallback kur tablosu (window._saKur yoksa kullanılır — satin_alma_v2.js L82 ile uyumlu). */
  var NA_FALLBACK_RATES = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30, JPY: 0.30, CNY: 6.20, AED: 12.10, XAU: 3500, BTC: 2900000 };

  /** Projeksiyon bucket'ları — başlangıç ve bitiş gün sayıları. */
  var NA_BUCKETS = [
    { from: 0,  to: 30, label: '0-30 GÜN' },
    { from: 30, to: 60, label: '30-60 GÜN' },
    { from: 60, to: 90, label: '60-90 GÜN' }
  ];

  /** i18n — TR (varsayılan) + EN. */
  var NA_I18N = {
    tr: {
      title: 'Nakit Akışı', subtitle: 'Özet, vade ve projeksiyon',
      refresh: 'Yenile',
      net_position: 'NET POZİSYON', month_in: 'BU AY GİREN', month_out: 'BU AY ÇIKAN', overdue: 'GECİKMİŞ TAHSİLAT',
      net_sub: 'Toplam giren − çıkan', month_in_sub: 'işlem', month_out_sub: 'işlem', overdue_sub: 'kayıt',
      today_due: 'BUGÜN VADESİ GELENLER', payments: 'Ödemeler', collections: 'Tahsilatlar',
      no_today_payments: 'Bugün ödenecek bir şey yok', no_today_collections: 'Bugün tahsil edilecek bir şey yok',
      projection: '30-60-90 GÜN PROJEKSİYON', records: 'kayıt', no_data: 'Veri yok'
    },
    en: {
      title: 'Cash Flow', subtitle: 'Summary, due and projection',
      refresh: 'Refresh',
      net_position: 'NET POSITION', month_in: 'MONTH INCOMING', month_out: 'MONTH OUTGOING', overdue: 'OVERDUE',
      net_sub: 'Total in − out', month_in_sub: 'transactions', month_out_sub: 'transactions', overdue_sub: 'records',
      today_due: 'DUE TODAY', payments: 'Payments', collections: 'Collections',
      no_today_payments: 'Nothing to pay today', no_today_collections: 'Nothing to collect today',
      projection: '30-60-90 DAY PROJECTION', records: 'records', no_data: 'No data'
    }
  };

  /** @returns {string} Aktif dilin lookup objesi. */
  function _naT() {
    var lang = (typeof window.I18n === 'object' && window.I18n.lang) || 'tr';
    return NA_I18N[lang] || NA_I18N.tr;
  }

  // ── Yardımcı fonksiyonlar ────────────────────────────────────────

  /**
   * Tutarı TRY'ye çevirir. Önce window._saKur (satin_alma_v2.js global,
   * API'den taze çekilir) denenir, yoksa NA_FALLBACK_RATES kullanılır.
   * @param {number} amount Tutar
   * @param {string} currency Para birimi kodu (TRY, USD, EUR vb.)
   * @returns {number} TRY karşılığı
   */
  function _naToTRY(amount, currency) {
    var amt = parseFloat(amount) || 0;
    var cur = currency || 'TRY';
    if (cur === 'TRY') return amt;
    var rates = (typeof window._saKur === 'object' && window._saKur) ? window._saKur : null;
    var rate = (rates && rates[cur]) || NA_FALLBACK_RATES[cur] || 1;
    return amt * rate;
  }

  /**
   * TRY tutarı kısaltarak biçimlendirir (₺245.0K, ₺1.2M).
   * @param {number} val
   * @returns {string}
   */
  function _naFmtTRY(val) {
    var v = Math.round(val || 0);
    var sign = v < 0 ? '-' : '';
    var abs = Math.abs(v);
    if (abs >= 1000000) return sign + '₺' + (abs / 1000000).toFixed(1) + 'M';
    if (abs >= 1000)    return sign + '₺' + (abs / 1000).toFixed(1) + 'K';
    return sign + '₺' + abs.toLocaleString('tr-TR');
  }

  /** @returns {string} Bugünün YYYY-MM-DD formatı (LOCAL timezone — toISOString UTC olduğu için kullanılmaz). */
  function _naToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** @returns {string} Bu ayın YYYY-MM prefix'i (LOCAL timezone). */
  function _naThisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /**
   * Bir kaydın "ne zaman gerçekleşti" tarihini döner. paidAt/collectedAt
   * varsa onu, yoksa due'yu kullanır.
   * @param {Object} o Ödeme veya tahsilat kaydı
   * @returns {string} ISO date stringi (YYYY-MM-DD) veya boş
   */
  function _naActualDate(o) {
    var d = o.paidAt || o.collectedAt || o.due || '';
    return (d || '').slice(0, 10);
  }

  /**
   * Bir kaydın "tamamlanmış" sayılıp sayılmadığını döner.
   * @param {Object} o
   * @returns {boolean}
   */
  function _naIsDone(o) { return !!(o.paid || o.collected || o.paidAt || o.collectedAt); }

  /** @param {*} v @returns {string} */
  function _naEsc(v) { return (typeof window._esc === 'function') ? window._esc(v) : String(v == null ? '' : v); }

  // ── Hesaplamalar ─────────────────────────────────────────────────

  /**
   * Tüm metrikleri tek geçişte hesaplar.
   * @returns {Object} { netTRY, monthIn, monthInCount, monthOut, monthOutCount,
   *                     overdueTRY, overdueCount, todayPay, todayCol,
   *                     buckets: [{label, net, count}, ...] }
   */
  function _naCompute() {
    var odm = (typeof window.loadOdm === 'function') ? window.loadOdm() : [];
    var tah = (typeof window.loadTahsilat === 'function') ? window.loadTahsilat() : [];
    if (!Array.isArray(odm)) odm = [];
    if (!Array.isArray(tah)) tah = [];
    var today = _naToday();
    var thisMonth = _naThisMonth();
    var todayMs = new Date(today).getTime();

    // Bu ay giren — tahsil edilen, paidAt/collectedAt veya due bu ay
    var monthIn = 0, monthInCount = 0;
    tah.forEach(function(t) {
      if (!_naIsDone(t)) return;
      var d = _naActualDate(t);
      if (d.slice(0, 7) === thisMonth) {
        monthIn += _naToTRY(t.amount, t.currency || 'TRY');
        monthInCount++;
      }
    });

    // Bu ay çıkan — ödenen ödemeler
    var monthOut = 0, monthOutCount = 0;
    odm.forEach(function(o) {
      if (!_naIsDone(o)) return;
      var d = _naActualDate(o);
      if (d.slice(0, 7) === thisMonth) {
        monthOut += _naToTRY(o.amount, o.currency || 'TRY');
        monthOutCount++;
      }
    });

    // Gecikmiş tahsilat — due < today AND !collected
    var overdueTRY = 0, overdueCount = 0;
    tah.forEach(function(t) {
      if (_naIsDone(t)) return;
      if (t.due && t.due < today) {
        overdueTRY += _naToTRY(t.amount, t.currency || 'TRY');
        overdueCount++;
      }
    });

    // Net pozisyon TRY = (toplam tahsil edilmiş) - (toplam ödenmiş)
    var totalIn = 0, totalOut = 0;
    tah.forEach(function(t) { if (_naIsDone(t)) totalIn  += _naToTRY(t.amount, t.currency || 'TRY'); });
    odm.forEach(function(o) { if (_naIsDone(o)) totalOut += _naToTRY(o.amount, o.currency || 'TRY'); });
    var netTRY = totalIn - totalOut;

    // Bugün vadesi gelenler
    var todayPay = odm.filter(function(o) { return !_naIsDone(o) && o.due === today; });
    var todayCol = tah.filter(function(t) { return !_naIsDone(t) && t.due === today; });

    // 30-60-90 projeksiyon — tamamlanmamış kayıtlar, due bucket aralığında
    var buckets = NA_BUCKETS.map(function(b) {
      var fromMs = todayMs + b.from * 86400000;
      var toMs   = todayMs + b.to   * 86400000;
      var inAmt = 0, outAmt = 0, count = 0;
      tah.forEach(function(t) {
        if (_naIsDone(t) || !t.due) return;
        var dueMs = new Date(t.due).getTime();
        if (dueMs >= fromMs && dueMs < toMs) {
          inAmt += _naToTRY(t.amount, t.currency || 'TRY');
          count++;
        }
      });
      odm.forEach(function(o) {
        if (_naIsDone(o) || !o.due) return;
        var dueMs = new Date(o.due).getTime();
        if (dueMs >= fromMs && dueMs < toMs) {
          outAmt += _naToTRY(o.amount, o.currency || 'TRY');
          count++;
        }
      });
      return { label: b.label, net: inAmt - outAmt, count: count };
    });

    return {
      netTRY: netTRY,
      monthIn: monthIn, monthInCount: monthInCount,
      monthOut: monthOut, monthOutCount: monthOutCount,
      overdueTRY: overdueTRY, overdueCount: overdueCount,
      todayPay: todayPay, todayCol: todayCol,
      buckets: buckets
    };
  }

  // ── Render Bölümleri ─────────────────────────────────────────────

  /**
   * @param {Object} m Metrik objesi
   * @returns {string} HTML — 4 özet kart. NET POZİSYON ve GECİKMİŞ TAHSİLAT
   *   tıklanabilir, hover'da accent border + cursor:pointer.
   */
  function _naRenderSummary(m) {
    var t = _naT();
    var netColor = m.netTRY >= 0 ? 'var(--gr,#16A34A)' : 'var(--rd,#DC2626)';
    /**
     * @param {string} label
     * @param {string} value
     * @param {string} sub
     * @param {string} color
     * @param {string} [onclickAction] Tıklama JS (varsa kart clickable olur)
     */
    var card = function(label, value, sub, color, onclickAction) {
      var clickable = !!onclickAction;
      var clickStyle = clickable ? ';cursor:pointer;transition:border-color .15s,box-shadow .15s' : '';
      var clickAttrs = clickable
        ? ' onclick="' + onclickAction + '"'
          + ' onmouseenter="this.style.borderColor=\'var(--ac,#6366F1)\';this.style.boxShadow=\'0 2px 8px rgba(99,102,241,.12)\'"'
          + ' onmouseleave="this.style.borderColor=\'\';this.style.boxShadow=\'\'"'
        : '';
      return '<div style="background:var(--sf,#fff);border:1px solid var(--b,#e5e7eb);border-radius:12px;padding:14px 16px' + clickStyle + '"' + clickAttrs + '>'
        + '<div style="font-size:9px;font-weight:700;color:var(--t3,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">' + _naEsc(label) + '</div>'
        + '<div style="font-size:20px;font-weight:800;color:' + color + ';font-family:\'DM Mono\',monospace">' + _naEsc(value) + '</div>'
        + '<div style="font-size:10px;color:var(--t3,#6b7280);margin-top:4px">' + _naEsc(sub) + '</div>'
      + '</div>';
    };
    // Tıklama aksiyonları — tek-tırnak escape ile inline onclick
    var actNet = 'nav(\'odemeler\',this)';
    var actOverdue = 'nav(\'odemeler\',this);setTimeout(function(){window.setOdmTab&&window.setOdmTab(\'tahsilat\')},120)';
    return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 16px">'
      + card(t.net_position, _naFmtTRY(m.netTRY),     t.net_sub, netColor, actNet)
      + card(t.month_in,     _naFmtTRY(m.monthIn),    m.monthInCount  + ' ' + t.month_in_sub,  'var(--gr,#16A34A)')
      + card(t.month_out,    _naFmtTRY(m.monthOut),   m.monthOutCount + ' ' + t.month_out_sub, 'var(--rd,#DC2626)')
      + card(t.overdue,      _naFmtTRY(m.overdueTRY), m.overdueCount  + ' ' + t.overdue_sub,   'var(--am,#D97706)', actOverdue)
    + '</div>';
  }

  /** @param {Object} m @returns {string} HTML */
  function _naRenderToday(m) {
    var t = _naT();
    var rowOdm = function(o) {
      var amt = _naToTRY(o.amount, o.currency || 'TRY');
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:0.5px solid var(--b,#e5e7eb);font-size:11px">'
        + '<div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _naEsc(o.cariName || o.name || '—') + '</div>'
        + '<div style="font-weight:700;color:var(--rd,#DC2626);font-family:\'DM Mono\',monospace">' + _naFmtTRY(amt) + '</div>'
      + '</div>';
    };
    var rowTah = function(o) {
      var amt = _naToTRY(o.amount, o.currency || 'TRY');
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:0.5px solid var(--b,#e5e7eb);font-size:11px">'
        + '<div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _naEsc(o.cariName || o.name || '—') + '</div>'
        + '<div style="font-weight:700;color:var(--gr,#16A34A);font-family:\'DM Mono\',monospace">' + _naFmtTRY(amt) + '</div>'
      + '</div>';
    };
    var emptyMsg = function(msg) {
      return '<div style="padding:18px;text-align:center;color:var(--t3,#6b7280);font-size:11px">' + _naEsc(msg) + '</div>';
    };
    return '<div style="padding:0 16px 16px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t3,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📅 ' + _naEsc(t.today_due) + ' (' + _naToday() + ')</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div style="background:var(--sf,#fff);border:1px solid var(--b,#e5e7eb);border-radius:10px;overflow:hidden">'
          + '<div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--rd,#DC2626);background:var(--s2,#f9fafb);border-bottom:1px solid var(--b,#e5e7eb)">' + _naEsc(t.payments) + ' (' + m.todayPay.length + ')</div>'
          + (m.todayPay.length ? m.todayPay.map(rowOdm).join('') : emptyMsg(t.no_today_payments))
        + '</div>'
        + '<div style="background:var(--sf,#fff);border:1px solid var(--b,#e5e7eb);border-radius:10px;overflow:hidden">'
          + '<div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--gr,#16A34A);background:var(--s2,#f9fafb);border-bottom:1px solid var(--b,#e5e7eb)">' + _naEsc(t.collections) + ' (' + m.todayCol.length + ')</div>'
          + (m.todayCol.length ? m.todayCol.map(rowTah).join('') : emptyMsg(t.no_today_collections))
        + '</div>'
      + '</div>'
    + '</div>';
  }

  /** @param {Object} m @returns {string} HTML */
  function _naRenderProjection(m) {
    var t = _naT();
    var bucketCard = function(b) {
      var color = b.net >= 0 ? 'var(--gr,#16A34A)' : 'var(--rd,#DC2626)';
      var sign  = b.net >= 0 ? '+' : '';
      return '<div style="background:var(--sf,#fff);border:1px solid var(--b,#e5e7eb);border-radius:10px;padding:14px 16px;text-align:center">'
        + '<div style="font-size:9px;font-weight:700;color:var(--t3,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">' + _naEsc(b.label) + '</div>'
        + '<div style="font-size:18px;font-weight:800;color:' + color + ';font-family:\'DM Mono\',monospace">' + sign + _naFmtTRY(b.net) + '</div>'
        + '<div style="font-size:10px;color:var(--t3,#6b7280);margin-top:4px">' + b.count + ' ' + _naEsc(t.records) + '</div>'
      + '</div>';
    };
    return '<div style="padding:0 16px 20px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--t3,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📈 ' + _naEsc(t.projection) + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'
        + m.buckets.map(bucketCard).join('')
      + '</div>'
    + '</div>';
  }

  /**
   * Ana render fonksiyonu — panel-nakit-akisi div'ine içerik basar.
   */
  function renderNakitAkis() {
    var panel = document.getElementById('panel-nakit-akisi');
    if (!panel) {
      console.warn('[nakit_akis] panel-nakit-akisi div bulunamadi — index.html kontrol et, render iptal');
      return;
    }
    var t = _naT();
    var m = _naCompute();
    panel.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b,#e5e7eb);background:var(--sf,#fff);position:sticky;top:0;z-index:200">'
        + '<div>'
          + '<div style="font-size:14px;font-weight:700;color:var(--t,#1a1a2e)">💰 ' + _naEsc(t.title) + '</div>'
          + '<div style="font-size:10px;color:var(--t3,#6b7280)">' + _naEsc(t.subtitle) + '</div>'
        + '</div>'
        + '<button class="btn btns" onclick="window.renderNakitAkis?.()" style="font-size:11px">↻ ' + _naEsc(t.refresh) + '</button>'
      + '</div>'
      + _naRenderSummary(m)
      + _naRenderToday(m)
      + _naRenderProjection(m);
  }

  // ── Export ───────────────────────────────────────────────────────
  window.renderNakitAkis = renderNakitAkis;
})();
