/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/cash_flow.js — v1.0.0 (Faz 1 MVP)
 * CASH-FLOW-MODULE-001 — Nakit Akışı Manuel — bağımsız ledger
 * (sistem hesaplı nakit akışı ile bağı yok)
 * ════════════════════════════════════════════════════════════════
 * Tüm veri localStorage'da: ak_cash_flow1
 * FS/FB cloud sync YOK. Multi-cihaz sync YOK. Pure offline ledger.
 *
 * Faz 1: TEK tablo + CRUD + byCurrency + API zinciri + JSON export
 * Faz 2/3: çoklu tablo, filtre UI, XLSX/PDF, audit, auto-draft
 * ════════════════════════════════════════════════════════════════
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'ak_cash_flow1';
  const RATES_CACHE_KEY = 'ak_cf_rates_cache';
  const RATES_TTL_MS = 60 * 60 * 1000;
  const FALLBACK_RATES = (typeof DUAY_KUR_FALLBACK === "object" && DUAY_KUR_FALLBACK) ? DUAY_KUR_FALLBACK : { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };
  const PARA_BIRIMLERI = ['TRY','USD','EUR','GBP'];
  const KATEGORILER = ['gelir','gider','transfer'];
  const _DEFAULT_TABLO_AD = 'Manuel Kasa';

  let _busyButtons = new Set();

  function _cfId(prefix) {
    return (prefix || 'cf') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function _safeFileName(s) {
    return String(s || 'tablo').replace(/[^\wığüşöçĞÜŞÖÇ-]+/g, '_').slice(0, 40);
  }

  function _dateStr() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  function _fmtTutar(n) {
    return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _esc(s) {
    if (typeof window._esc === 'function') return window._esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function _cfLoad() {
    let state;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(e) { state = null; }
    if (!state || typeof state !== 'object') {
      state = { tablolar: [], aktifTabloId: null };
    }
    if (!Array.isArray(state.tablolar) || state.tablolar.length === 0) {
      const defId = _cfId('cf');
      state.tablolar = [{
        id: defId,
        ad: _DEFAULT_TABLO_AD,
        paraBirimiBaz: 'TRY',
        /* V193 EDIT 4.3 — Açılış kasa bakiyesi (TRY). Eski state'lerde fallback 0. */
        acilisKasaBakiyesi: 0,
        olusturulduTarih: new Date().toISOString(),
        guncellemeTarih: new Date().toISOString(),
        satirlar: []
      }];
      state.aktifTabloId = defId;
    }
    if (!state.aktifTabloId && state.tablolar[0]) state.aktifTabloId = state.tablolar[0].id;
    return state;
  }

  function _cfSaveImmediate(state) {
    try {
      const t = (state.tablolar || []).find(x => x.id === state.aktifTabloId);
      if (t) t.guncellemeTarih = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) { console.warn('[CF] save fail:', e && e.message); }
  }

  async function _cfFetchRates() {
    try {
      const cached = JSON.parse(localStorage.getItem(RATES_CACHE_KEY) || 'null');
      if (cached && cached.ts && (Date.now() - cached.ts) < RATES_TTL_MS && cached.rates) {
        return cached.rates;
      }
    } catch(e) {}

    const apis = [
      'https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP',
      'https://api.exchangerate-api.com/v4/latest/TRY',
      'https://open.er-api.com/v6/latest/TRY'
    ];
    for (const url of apis) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json();
        const r = json.rates || {};
        const rates = {
          TRY: 1,
          USD: r.USD ? (1 / r.USD) : FALLBACK_RATES.USD,
          EUR: r.EUR ? (1 / r.EUR) : FALLBACK_RATES.EUR,
          GBP: r.GBP ? (1 / r.GBP) : FALLBACK_RATES.GBP
        };
        try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, ts: Date.now() })); } catch(e) {}
        return rates;
      } catch(e) { continue; }
    }
    return FALLBACK_RATES;
  }

  function _cfConvert(amount, from, to, kurSnapshot) {
    if (from === to) return amount;
    const rates = (kurSnapshot && kurSnapshot[from] && kurSnapshot[to]) ? kurSnapshot : FALLBACK_RATES;
    const tryAmount = amount * (rates[from] || 1);
    return tryAmount / (rates[to] || 1);
  }

  window.calculateCashFlow = function(table) {
    const byCurrency = {};
    PARA_BIRIMLERI.forEach(c => { byCurrency[c] = { income: 0, expense: 0, net: 0 }; });
    let totalTRY = 0;

    (table.satirlar || []).forEach(satir => {
      const cur = satir.paraBirimi;
      const amount = Number(satir.tutar) || 0;
      if (!byCurrency[cur]) byCurrency[cur] = { income: 0, expense: 0, net: 0 };

      if (satir.kategori === 'gelir') {
        byCurrency[cur].income += amount;
        byCurrency[cur].net += amount;
      } else if (satir.kategori === 'gider') {
        byCurrency[cur].expense += amount;
        byCurrency[cur].net -= amount;
      }

      if (satir.kategori !== 'transfer') {
        const tryEq = _cfConvert(amount, cur, 'TRY', satir.kurSnapshot);
        totalTRY += (satir.kategori === 'gelir' ? tryEq : -tryEq);
      }
    });

    return { byCurrency, totalTRY, netFlowTRY: totalTRY };
  };

  async function _cfSatirEkle(formData) {
    if (_busyButtons.has('addRow')) return;
    _busyButtons.add('addRow');
    try {
      const state = _cfLoad();
      const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);
      if (!tablo) return;

      const rates = await _cfFetchRates();

      const newSatir = {
        id: _cfId('cfr'),
        tarih: formData.tarih || new Date().toISOString().slice(0,10),
        aciklama: String(formData.aciklama || '').trim(),
        tutar: Number(formData.tutar) || 0,
        paraBirimi: PARA_BIRIMLERI.indexOf(formData.paraBirimi) !== -1 ? formData.paraBirimi : 'TRY',
        kategori: KATEGORILER.indexOf(formData.kategori) !== -1 ? formData.kategori : 'gelir',
        /* V193 EDIT 2 — Kaynak/Banka alanı (opsiyonel, boş string default) */
        kaynak: String(formData.kaynak || '').trim(),
        kurSnapshot: { TRY: rates.TRY, USD: rates.USD, EUR: rates.EUR, GBP: rates.GBP },
        status: 'confirmed',
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tablo.satirlar = tablo.satirlar || [];
      tablo.satirlar.unshift(newSatir);
      _cfSaveImmediate(state);
      _cfRenderPanel();
    } finally {
      _busyButtons.delete('addRow');
    }
  }

  function _cfSatirSil(satirId) {
    /* V193 EDIT 2 — confirmModal yoksa native confirm yerine toast + iptal (Belge 3 §6).
     * V193 PATCH 1 — confirmModal SIGNATURE FIX: window.confirmModal(message, opts) — 2 argüman.
     * Eski yanlış kullanım: fn({title, message, onConfirm}) → message bir obje oluyordu, çalışmıyordu. */
    var fn = window.confirmModal;
    if (typeof fn !== 'function') {
      if (window.toast) window.toast('Onay penceresi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    fn('Bu satırı silmek istediğinizden emin misiniz?', {
      title: 'Satır Sil',
      danger: true,
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      onConfirm: function() {
        const state = _cfLoad();
        const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);
        if (!tablo) return;
        tablo.satirlar = (tablo.satirlar || []).filter(s => s.id !== satirId);
        _cfSaveImmediate(state);
        /* Dirty mark — kayıt henüz Firestore'a flush edilmedi */
        if (window.CashFlowWorks && typeof window.CashFlowWorks.markDirty === 'function') {
          window.CashFlowWorks.markDirty();
        }
        _cfRenderPanel();
      }
    });
  }

  function _cfExportJson() {
    if (_busyButtons.has('exportJson')) return;
    _busyButtons.add('exportJson');
    try {
      const state = _cfLoad();
      const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);
      if (!tablo) return;
      const calc = window.calculateCashFlow(tablo);
      const payload = { tablo, hesaplama: calc, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nakit-akis-manuel-' + _safeFileName(tablo.ad) + '-' + _dateStr() + '.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      _busyButtons.delete('exportJson');
    }
  }

  /* V193 EDIT 2 — Kaynak/Banka badge render (Apple-sade, kenarlık yok).
   * Banka isimleri (Ziraat/Vakıf/Kuveyt/İş) → açık mavi
   * "Kasa" → açık gri
   * "Wise/Western Union/Diğer" → açık yeşil
   * Boş → "—" şeffaf */
  function _cfBadge(kaynak) {
    var k = String(kaynak || '').trim();
    if (!k) return '<span style="color:#bbb;font-size:12px">—</span>';
    var kLow = k.toLowerCase();
    var bg = '#F2F2F2', fg = '#666';   // varsayılan gri
    if (/banka|ziraat|vak[ıi]f|kuveyt|i[şs]\s*bankas/i.test(kLow)) { bg = '#EEF3F8'; fg = '#1F4F84'; }
    else if (/^kasa\b/.test(kLow))                                  { bg = '#F2F2F2'; fg = '#555'; }
    else if (/wise|western|wallet|payoneer|di[ğg]er/i.test(kLow))   { bg = '#ECF3EE'; fg = '#1A6F4F'; }
    return '<span style="display:inline-block;padding:2px 8px;background:' + bg
      + ';color:' + fg + ';border-radius:10px;font-size:11px;font-weight:500">' + _esc(k) + '</span>';
  }

  /* V193 EDIT 4.3 — TRY karşılığı sade format (≈ 44.550 TRY) */
  function _cfTryEqSade(s) {
    var trEq;
    if (window.CashFlowCompute && typeof window.CashFlowCompute.tryEq === 'function') {
      trEq = window.CashFlowCompute.tryEq(s);
    } else {
      /* Fallback — compute layer yüklenmediyse FALLBACK_RATES kullan */
      var amt = Number(s.tutar) || 0;
      var cur = s.paraBirimi || 'TRY';
      var rate = (s.kurSnapshot && typeof s.kurSnapshot[cur] === 'number')
        ? s.kurSnapshot[cur]
        : (FALLBACK_RATES[cur] || 1);
      trEq = amt * rate;
    }
    return _fmtTutar(trEq);
  }

  /* V193 EDIT 4.3 — Kur snapshot label: '44.55' formatı, satırın paraBirimi için.
   * TRY paritesi 1.00 — gösterim anlamsız, '—' olarak. */
  function _cfKurLabel(s) {
    var cur = s.paraBirimi || 'TRY';
    if (cur === 'TRY') return '—';
    var rate;
    if (s.kurSnapshot && typeof s.kurSnapshot[cur] === 'number') {
      rate = s.kurSnapshot[cur];
    } else {
      rate = FALLBACK_RATES[cur] || null;
    }
    if (!rate) return '—';
    return Number(rate).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  /* V193 EDIT 4.3 — Tablo: filteredSatirlar render edilir, runningMap balance verir,
   * sıra no orijinal sıra (filter öncesi). */
  function _cfRenderTablo(tablo, filteredSatirlar, runningMap, originalIndex) {
    var satirlar = filteredSatirlar || [];
    if (!satirlar.length) {
      return '<div style="padding:40px;text-align:center;color:#888;font-size:13px">Henüz satır yok veya filtreyle eşleşen kayıt yok.</div>';
    }
    var rows = satirlar.map(function(s) {
      var renk = s.kategori === 'gelir' ? '#1A8D6F' : (s.kategori === 'gider' ? '#E0574F' : '#888');
      var isaret = s.kategori === 'gelir' ? '+' : (s.kategori === 'gider' ? '−' : '↔');
      var siraNo = (originalIndex && originalIndex[s.id] != null) ? originalIndex[s.id] : '—';
      var bakiye = (runningMap && typeof runningMap[s.id] === 'number') ? runningMap[s.id] : null;
      /* Kasa mevcudu — transfer'de hafif gri (yön hissi vermez), gelir/gider'de küçük yön ikonu */
      var bakiyeRenk = '#444';
      var yonIkon = '';
      if (s.kategori === 'gelir')      { bakiyeRenk = '#1A8D6F'; yonIkon = '<span style="color:#1A8D6F;font-size:9px;margin-right:3px">▲</span>'; }
      else if (s.kategori === 'gider') { bakiyeRenk = '#E0574F'; yonIkon = '<span style="color:#E0574F;font-size:9px;margin-right:3px">▼</span>'; }
      else                              { bakiyeRenk = '#888';   yonIkon = '<span style="color:#bbb;font-size:9px;margin-right:3px">·</span>'; }
      var bakiyeStr = (bakiye != null) ? (yonIkon + _fmtTutar(bakiye)) : '—';

      return '<tr style="border-bottom:0.5px solid #e8e8e8">'
        + '<td style="padding:10px 8px;text-align:center;color:#999;font-size:11px;font-variant-numeric:tabular-nums;width:36px">' + siraNo + '</td>'
        + '<td style="padding:10px 12px;font-variant-numeric:tabular-nums;color:#444;font-size:12px">' + _esc(s.tarih) + '</td>'
        + '<td style="padding:10px 12px;color:#222;font-size:13px">' + _esc(s.aciklama || '—') + '</td>'
        + '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums;color:' + renk + ';font-weight:500;font-size:13px">' + isaret + ' ' + _fmtTutar(s.tutar) + '</td>'
        /* Döviz + Kur 2. satır */
        + '<td style="padding:8px 10px;text-align:center;font-size:11px;line-height:1.3">'
          + '<div style="color:#444;font-weight:500">' + _esc(s.paraBirimi) + '</div>'
          + '<div style="color:#999;font-size:10px;margin-top:1px">Kur: ' + _cfKurLabel(s) + '</div>'
        + '</td>'
        /* TRY karşılığı sade */
        + '<td style="padding:10px 12px;text-align:right;color:#666;font-size:11px;font-variant-numeric:tabular-nums">≈ ' + _cfTryEqSade(s) + ' TRY</td>'
        + '<td style="padding:10px 12px;text-align:center">' + _cfBadge(s.kaynak) + '</td>'
        + '<td style="padding:10px 12px;text-align:center;color:' + renk + ';font-size:11px;text-transform:capitalize">' + _esc(s.kategori) + '</td>'
        /* Kasa mevcudu (TRY karşılığı, running balance) */
        + '<td style="padding:10px 12px;text-align:right;color:' + bakiyeRenk + ';font-size:12px;font-variant-numeric:tabular-nums">' + bakiyeStr + '</td>'
        /* İşlem: Düzelt + Sil */
        + '<td style="padding:10px 8px;text-align:center;white-space:nowrap">'
          + '<button data-cf-action="row-edit" data-cf-row-id="' + _esc(s.id) + '" style="background:transparent;border:0;cursor:pointer;color:#1A8D6F;font-size:13px;padding:2px 4px;font-family:inherit" title="Düzelt">✏</button>'
          + '<button data-cf-action="row-delete" data-cf-row-id="' + _esc(s.id) + '" style="background:transparent;border:0;cursor:pointer;color:#bbb;font-size:14px;padding:2px 4px;font-family:inherit;margin-left:2px" title="Sil">×</button>'
        + '</td>'
      + '</tr>';
    }).join('');

    return '<table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<thead><tr style="border-bottom:0.5px solid #ddd;text-transform:uppercase;letter-spacing:0.05em;font-size:10px;color:#888">'
        + '<th style="padding:10px 8px;text-align:center;font-weight:500;width:36px">#</th>'
        + '<th style="padding:10px 12px;text-align:left;font-weight:500">Tarih</th>'
        + '<th style="padding:10px 12px;text-align:left;font-weight:500">Açıklama</th>'
        + '<th style="padding:10px 12px;text-align:right;font-weight:500">Tutar</th>'
        + '<th style="padding:10px 10px;text-align:center;font-weight:500">Döviz</th>'
        + '<th style="padding:10px 12px;text-align:right;font-weight:500">TRY ≈</th>'
        + '<th style="padding:10px 12px;text-align:center;font-weight:500">Kaynak</th>'
        + '<th style="padding:10px 12px;text-align:center;font-weight:500">Kategori</th>'
        + '<th style="padding:10px 12px;text-align:right;font-weight:500">Kasa Mevcudu</th>'
        + '<th style="padding:10px 8px;text-align:center;font-weight:500;width:64px">İşlem</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* V193 EDIT 4.3 — CashFlowCompute.renderToplam delegate.
   * Compute layer yüklenmemişse minimal fallback (TRY net, açılış/son bakiye yok).
   * filteredSatirlar — kullanıcı filtresine saygılı toplamlar.
   * runningMap — full satırlardan, _initial + _final için. */
  function _cfRenderToplam(tablo, filteredSatirlar, runningMap) {
    if (window.CashFlowCompute && typeof window.CashFlowCompute.renderToplam === 'function') {
      try { return window.CashFlowCompute.renderToplam(tablo, filteredSatirlar, runningMap); }
      catch (e) { console.warn('[CF] CashFlowCompute.renderToplam error:', e && e.message); }
    }
    /* Fallback — basit TRY net özet */
    var totalTRY = 0;
    (filteredSatirlar || []).forEach(function(s) {
      var amt = Number(s.tutar) || 0;
      var cur = s.paraBirimi || 'TRY';
      var rate = (s.kurSnapshot && s.kurSnapshot[cur]) ? s.kurSnapshot[cur] : (FALLBACK_RATES[cur] || 1);
      var tr = amt * rate;
      if (s.kategori === 'gelir') totalTRY += tr;
      else if (s.kategori === 'gider') totalTRY -= tr;
    });
    var renk = totalTRY > 0 ? '#1A8D6F' : (totalTRY < 0 ? '#E0574F' : '#444');
    return '<div style="margin-top:14px;padding:16px 18px;background:#fafafa;border-radius:10px;border:0.5px solid #ddd;display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666">Net (TRY karşılığı)</span>'
      + '<span style="font-size:20px;font-weight:600;color:' + renk + ';font-variant-numeric:tabular-nums">' + _fmtTutar(totalTRY) + ' ₺</span>'
    + '</div>';
  }

  /* V193 EDIT 4.3 — In-memory filter state (persist edilmez, oturum içi).
   * cash_flow_compute.js applyFilter() ile uyumlu şema. */
  if (typeof window._cfFilter !== 'object' || !window._cfFilter) {
    window._cfFilter = { tarihBaslangic: '', tarihBitis: '', kategori: '' };
  }

  /* V193 EDIT 4.3 — Filtre bar — tek satır kompakt. Apple sade, dashboard görünümü yok. */
  function _cfRenderFilterBar() {
    var f = window._cfFilter || {};
    return '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:10px 0 12px;padding:10px 12px;background:#fafafa;border-radius:8px;border:0.5px solid #eee">'
      + '<label style="font-size:10px;color:#888;flex:0 0 auto">Başlangıç'
        + '<input id="cf-fb-baslangic" type="date" value="' + _esc(f.tarihBaslangic || '') + '" style="display:block;margin-top:3px;padding:5px 8px;border:0.5px solid #ddd;border-radius:5px;font-size:12px;font-family:inherit">'
      + '</label>'
      + '<label style="font-size:10px;color:#888;flex:0 0 auto">Bitiş'
        + '<input id="cf-fb-bitis" type="date" value="' + _esc(f.tarihBitis || '') + '" style="display:block;margin-top:3px;padding:5px 8px;border:0.5px solid #ddd;border-radius:5px;font-size:12px;font-family:inherit">'
      + '</label>'
      + '<label style="font-size:10px;color:#888;flex:0 0 auto">Tür'
        + '<select id="cf-fb-kategori" style="display:block;margin-top:3px;padding:5px 8px;border:0.5px solid #ddd;border-radius:5px;font-size:12px;font-family:inherit;min-width:110px">'
          + '<option value=""' + (f.kategori === '' ? ' selected' : '') + '>Hepsi</option>'
          + '<option value="gelir"' + (f.kategori === 'gelir' ? ' selected' : '') + '>Gelir</option>'
          + '<option value="gider"' + (f.kategori === 'gider' ? ' selected' : '') + '>Gider</option>'
          + '<option value="transfer"' + (f.kategori === 'transfer' ? ' selected' : '') + '>Transfer</option>'
        + '</select>'
      + '</label>'
      + '<button data-cf-action="filter-clear" style="margin-left:auto;padding:6px 12px;background:transparent;border:0.5px solid #ddd;border-radius:5px;cursor:pointer;font-size:11px;color:#666;font-family:inherit">Temizle</button>'
    + '</div>';
  }

  /* V193 EDIT 4.3 — Açılış kasa bakiyesi mini input (toolbar yanında küçük).
   * Çalışma bazlı persist (tablo.acilisKasaBakiyesi). */
  function _cfRenderAcilisInput(tablo) {
    var v = (tablo && Number(tablo.acilisKasaBakiyesi)) || 0;
    return '<label style="font-size:10px;color:#888;display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:8px">Açılış Kasa (₺)'
      + '<input id="cf-acilis-bakiye" type="number" step="0.01" value="' + _esc(String(v)) + '" style="margin-top:2px;padding:5px 8px;border:0.5px solid #ddd;border-radius:5px;font-size:12px;width:120px;font-variant-numeric:tabular-nums;font-family:inherit;text-align:right">'
    + '</label>';
  }

  function _cfRenderSatirEkleForm() {
    /* V193 EDIT 2 — Kaynak/Banka önerileri: cash_flow_works.js KAYNAK_ONERILER reuse (KX10 disiplin).
     * window.CashFlowWorks yüklenmemişse fallback boş array — datalist boş kalır, input serbest yazıma açık. */
    var kaynakOptions = (window.CashFlowWorks && window.CashFlowWorks.KAYNAK_ONERILER) || [];
    var datalistOpts = kaynakOptions.map(function(k) {
      return '<option value="' + _esc(k) + '"></option>';
    }).join('');
    return '<div id="cf-add-form" style="display:none;margin-top:14px;padding:16px;background:#fafafa;border-radius:8px;border:0.5px solid #e8e8e8">'
      + '<datalist id="cf-kaynak-list">' + datalistOpts + '</datalist>'
      + '<div style="display:grid;grid-template-columns:120px 1fr 140px 80px 110px 140px;gap:10px;align-items:end">'
      + '<label style="font-size:11px;color:#666">Tarih<input id="cf-i-tarih" type="date" value="' + new Date().toISOString().slice(0,10) + '" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"></label>'
      + '<label style="font-size:11px;color:#666">Açıklama<input id="cf-i-aciklama" type="text" placeholder="Açıklama..." style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"></label>'
      + '<label style="font-size:11px;color:#666">Tutar<input id="cf-i-tutar" type="number" step="0.01" placeholder="0.00" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-variant-numeric:tabular-nums"></label>'
      + '<label style="font-size:11px;color:#666">Döviz<select id="cf-i-doviz" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px">' + PARA_BIRIMLERI.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select></label>'
      + '<label style="font-size:11px;color:#666">Kategori<select id="cf-i-kategori" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"><option value="gelir">Gelir</option><option value="gider">Gider</option><option value="transfer">Transfer</option></select></label>'
      /* V193 EDIT 2 — Kaynak/Banka serbest yazımlı + listeden seçim (datalist) */
      + '<label style="font-size:11px;color:#666">Kaynak<input id="cf-i-kaynak" type="text" list="cf-kaynak-list" placeholder="Banka veya kaynak..." style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"></label>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
      + '<button data-cf-action="form-cancel" style="padding:8px 14px;background:transparent;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#666">Vazgeç</button>'
      + '<button data-cf-action="form-submit" style="padding:8px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500">Ekle</button>'
      + '</div></div>';
  }

  window._cfFormSubmit = function() {
    /* V193 EDIT 2 — kaynak field eklendi (opsiyonel, boş kabul edilir) + dirty mark */
    var kaynakEl = document.getElementById('cf-i-kaynak');
    const data = {
      tarih: document.getElementById('cf-i-tarih').value,
      aciklama: document.getElementById('cf-i-aciklama').value,
      tutar: document.getElementById('cf-i-tutar').value,
      paraBirimi: document.getElementById('cf-i-doviz').value,
      kategori: document.getElementById('cf-i-kategori').value,
      kaynak: kaynakEl ? String(kaynakEl.value || '').trim() : ''
    };
    if (!data.aciklama.trim() || !Number(data.tutar)) {
      if (window.toast) window.toast('Açıklama ve tutar zorunlu', 'warn');
      return;
    }
    /* Dirty mark — CashFlowWorks varsa kaydedilmemiş değişiklik durumunu bildir */
    if (window.CashFlowWorks && typeof window.CashFlowWorks.markDirty === 'function') {
      window.CashFlowWorks.markDirty();
    }
    _cfSatirEkle(data);
  };

  function _cfRenderPanel() {
    const panel = document.getElementById('panel-cash-flow-manuel');
    if (!panel) { console.warn('[CF] panel-cash-flow-manuel div yok'); return; }
    const state = _cfLoad();
    const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);

    /* V193 EDIT 4.3 — Compute pipeline:
     * 1) runningBalance: TÜM satırlar üzerinden, filter ÖNCESİ → birikmiş bakiye doğru
     * 2) applyFilter:    in-memory filter state'e göre satırları süz
     * 3) renderToplam:   filtered satırlardan para birimi başına net + Açılış/Son bakiye (runningMap'ten)
     * 4) originalIndex:  sıra no orijinal sıra (filter öncesi 1-bazlı index)
     * Compute layer yüklenmediyse her aşama fallback'e düşer. */
    var allSatirlar = (tablo && tablo.satirlar) || [];
    var acilis = (tablo && Number(tablo.acilisKasaBakiyesi)) || 0;
    var runningMap = {};
    var filteredSatirlar = allSatirlar;
    if (window.CashFlowCompute) {
      try {
        runningMap = window.CashFlowCompute.runningBalance(allSatirlar, acilis) || {};
        filteredSatirlar = window.CashFlowCompute.applyFilter(allSatirlar, window._cfFilter) || allSatirlar;
      } catch (e) { console.warn('[CF] compute error:', e && e.message); }
    } else {
      runningMap = { _initial: acilis, _final: acilis };
    }
    /* Sıra no — orijinal listeye göre 1-bazlı (createdAt ASC veya tarih ASC değil; user'ın eklediği sıra) */
    var originalIndex = {};
    allSatirlar.forEach(function(s, i) { originalIndex[s.id] = i + 1; });

    /* V193 EDIT 2 — Toolbar entegrasyonu:
     * V193 EDIT 3 — CashFlowWorksUI varsa toolbar'ı oraya delege et
     * V193 EDIT 4.3 — Toolbar yanında açılış kasa input'u küçük gösterilir */
    var workTitle = (tablo && tablo.ad) || 'Manuel Kasa';
    var isDirty = !!(window.CashFlowWorks && typeof window.CashFlowWorks.isDirty === 'function' && window.CashFlowWorks.isDirty());
    var dirtyMark = isDirty ? '<span style="color:#E0574F;margin-left:4px" title="Kaydedilmemiş değişiklik">*</span>' : '';
    var hasUI = !!(window.CashFlowWorksUI && typeof window.CashFlowWorksUI.renderToolbar === 'function');
    var toolbarHtml = hasUI
      ? '<div style="display:flex;gap:12px;align-items:flex-end">' + _cfRenderAcilisInput(tablo) + '<div id="cf-toolbar"></div></div>'
      : '<div style="display:flex;gap:12px;align-items:flex-end">' + _cfRenderAcilisInput(tablo) + '<span style="font-size:13px;color:#666">' + _esc(workTitle) + dirtyMark + '</span></div>';

    panel.innerHTML = '<div style="max-width:1280px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="margin-bottom:14px">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;margin-bottom:4px">Finans › Nakit Akışı Manuel</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">'
      + '<h2 style="margin:0;font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#222">Nakit Akışı — Manuel</h2>'
      + toolbarHtml
      + '</div></div>'
      /* V193 EDIT 4.3 — Filtre bar */
      + _cfRenderFilterBar()
      + '<div style="background:#fff;border-radius:10px;border:0.5px solid #e8e8e8;box-shadow:0 1px 2px rgba(0,0,0,0.04);overflow-x:auto">'
      + _cfRenderTablo(tablo, filteredSatirlar, runningMap, originalIndex)
      + '</div>'
      + '<button data-cf-action="add-row-toggle" style="margin-top:14px;padding:12px;width:100%;background:transparent;border:1px dashed #bbb;border-radius:8px;cursor:pointer;font-size:13px;color:#666">+ Satır Ekle</button>'
      + _cfRenderSatirEkleForm()
      /* V193 EDIT 4.3 — Compute renderToplam (filteredSatirlar + runningMap) */
      + _cfRenderToplam(tablo, filteredSatirlar, runningMap)
      + '<div style="margin-top:18px;display:flex;justify-content:flex-end;gap:8px">'
      + '<button data-cf-action="export-xlsx" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">Excel İndir</button>'
      /* V193 EDIT 5.3 — PDF İndir butonu (CashFlowPdf modülü) */
      + '<button data-cf-action="export-pdf" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">PDF İndir</button>'
      + '<button data-cf-action="export-json" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">JSON İndir</button>'
      + '</div>'
      + '</div>';

    _cfBindEvents(panel);

    if (window.CashFlowWorksUI && typeof window.CashFlowWorksUI.renderToolbar === 'function') {
      try { window.CashFlowWorksUI.renderToolbar('#cf-toolbar'); }
      catch (e) { console.warn('[CF] CashFlowWorksUI.renderToolbar error:', e && e.message); }
    }
  }

  /* V193 EDIT 2 — Event delegation bind (idempotent — panel her render'da yeniden bağlanır,
   * eski listener panel.innerHTML rewrite ile otomatik temizlenir).
   * V193 PATCH 1 — Listener accumulation FIX: panel aynı DOM node, innerHTML sadece
   * child'ları siler, panel'in kendi listener'ları kalır. Çözüm: named handler +
   * removeEventListener, panel.__cfHandler ile tek instance garantisi. */
  function _cfBindEvents(panel) {
    if (!panel) return;
    /* Eski listener varsa kaldır (idempotent) */
    if (panel.__cfHandler) {
      panel.removeEventListener('click', panel.__cfHandler);
    }
    var handler = function(e) {
      var btn = e.target.closest('[data-cf-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-cf-action');
      if (action === 'add-row-toggle') {
        var f = document.getElementById('cf-add-form');
        if (!f) return;
        /* V193 PATCH 1 — getComputedStyle ile gerçek display değeri.
         * Inline style.display ilk render'da boş string '' olabilir → eski mantık
         * '' === 'none' false → 'none' atadığı için form HİÇ AÇILMIYORDU. */
        var cur = f.style.display || window.getComputedStyle(f).display;
        f.style.display = (cur === 'none' || cur === '') ? 'block' : 'none';
      } else if (action === 'form-cancel') {
        var f2 = document.getElementById('cf-add-form');
        if (f2) f2.style.display = 'none';
      } else if (action === 'form-submit') {
        window._cfFormSubmit();
      } else if (action === 'export-json') {
        _cfExportJson();
      } else if (action === 'export-xlsx') {
        /* V193 EDIT 4 — Excel İndir: CashFlowExcel modülü. Yüklenmemişse toast uyarısı. */
        if (window.CashFlowExcel && typeof window.CashFlowExcel.exportXlsx === 'function') {
          window.CashFlowExcel.exportXlsx();
        } else if (window.toast) {
          window.toast('Excel modülü yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
        }
      } else if (action === 'export-pdf') {
        /* V193 EDIT 5.3 — PDF İndir: CashFlowPdf modülü. Yüklenmemişse toast. */
        if (window.CashFlowPdf && typeof window.CashFlowPdf.exportPdf === 'function') {
          window.CashFlowPdf.exportPdf();
        } else if (window.toast) {
          window.toast('PDF modülü yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
        }
      } else if (action === 'row-delete') {
        var rid = btn.getAttribute('data-cf-row-id');
        if (rid) _cfSatirSil(rid);
      } else if (action === 'row-edit') {
        /* V193 EDIT 4.3 — Düzelt: CashFlowEdit modülü modal açar. Yüklenmemişse toast. */
        var eid = btn.getAttribute('data-cf-row-id');
        if (!eid) return;
        if (window.CashFlowEdit && typeof window.CashFlowEdit.openEditModal === 'function') {
          window.CashFlowEdit.openEditModal(eid);
        } else if (window.toast) {
          window.toast('Düzenleme modülü yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
        }
      } else if (action === 'filter-clear') {
        /* V193 EDIT 4.3 — Filtreyi sıfırla, paneli yenile */
        window._cfFilter = { tarihBaslangic: '', tarihBitis: '', kategori: '' };
        _cfRenderPanel();
      }
    };
    panel.__cfHandler = handler;
    panel.addEventListener('click', handler);

    /* V193 EDIT 4.3 — Change/blur listener: filtre input'ları + açılış kasa bakiyesi.
     * Idempotent — her render'da yenisi bağlanır, eskisi removeEventListener ile kaldırılır. */
    if (panel.__cfChangeHandler) {
      panel.removeEventListener('change', panel.__cfChangeHandler);
    }
    var changeHandler = function(e) {
      var t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'cf-fb-baslangic') {
        window._cfFilter.tarihBaslangic = t.value || '';
        _cfRenderPanel();
      } else if (t.id === 'cf-fb-bitis') {
        window._cfFilter.tarihBitis = t.value || '';
        _cfRenderPanel();
      } else if (t.id === 'cf-fb-kategori') {
        window._cfFilter.kategori = t.value || '';
        _cfRenderPanel();
      } else if (t.id === 'cf-acilis-bakiye') {
        /* Açılış kasa bakiyesi — change'da persist (çalışma bazlı, tablo.acilisKasaBakiyesi). */
        var v = Number(t.value) || 0;
        var st = _cfLoad();
        var tb = (st.tablolar || []).find(function(x) { return x.id === st.aktifTabloId; });
        if (tb) {
          tb.acilisKasaBakiyesi = v;
          _cfSaveImmediate(st);
          if (window.CashFlowWorks && typeof window.CashFlowWorks.markDirty === 'function') {
            window.CashFlowWorks.markDirty();
          }
          _cfRenderPanel();
        }
      }
    };
    panel.__cfChangeHandler = changeHandler;
    panel.addEventListener('change', changeHandler);
  }

  window._cfRenderPanel = _cfRenderPanel;
  window.CashFlow = {
    load: _cfLoad,
    saveImmediate: _cfSaveImmediate,
    satirEkle: _cfSatirEkle,
    satirSil: _cfSatirSil,
    exportJson: _cfExportJson,
    fetchRates: _cfFetchRates
  };
})();
