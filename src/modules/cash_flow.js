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
  const FALLBACK_RATES = { TRY: 1, USD: 44.55, EUR: 51.70, GBP: 59.30 };
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
    const fn = window.confirmModal || function(opts) {
      if (window.confirm(opts.message)) opts.onConfirm && opts.onConfirm();
    };
    fn({
      title: 'Satır Sil',
      message: 'Bu satırı silmek istediğinizden emin misiniz?',
      onConfirm: function() {
        const state = _cfLoad();
        const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);
        if (!tablo) return;
        tablo.satirlar = (tablo.satirlar || []).filter(s => s.id !== satirId);
        _cfSaveImmediate(state);
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

  function _cfRenderTablo(tablo) {
    const satirlar = tablo.satirlar || [];
    if (!satirlar.length) {
      return '<div style="padding:40px;text-align:center;color:#888;font-size:13px">Henüz satır yok. Aşağıdaki [+ Satır Ekle] butonu ile başlayın.</div>';
    }
    const rows = satirlar.map(function(s) {
      const renk = s.kategori === 'gelir' ? '#1A8D6F' : (s.kategori === 'gider' ? '#E0574F' : '#888');
      const isaret = s.kategori === 'gelir' ? '+' : (s.kategori === 'gider' ? '−' : '↔');
      return '<tr style="border-bottom:0.5px solid #e8e8e8">'
        + '<td style="padding:10px 12px;font-variant-numeric:tabular-nums;color:#444">' + _esc(s.tarih) + '</td>'
        + '<td style="padding:10px 12px;color:#222">' + _esc(s.aciklama || '—') + '</td>'
        + '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums;color:' + renk + ';font-weight:500">' + isaret + ' ' + _fmtTutar(s.tutar) + '</td>'
        + '<td style="padding:10px 12px;text-align:center;color:#666;font-size:12px">' + _esc(s.paraBirimi) + '</td>'
        + '<td style="padding:10px 12px;text-align:center;color:' + renk + ';font-size:12px;text-transform:capitalize">' + _esc(s.kategori) + '</td>'
        + '<td style="padding:10px 12px;text-align:center"><button onclick="window.CashFlow.satirSil(\'' + _esc(s.id) + '\')" style="background:transparent;border:0;cursor:pointer;color:#bbb;font-size:14px" title="Sil">×</button></td>'
        + '</tr>';
    }).join('');
    return '<table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<thead><tr style="border-bottom:0.5px solid #ddd;text-transform:uppercase;letter-spacing:0.05em;font-size:11px;color:#888">'
      + '<th style="padding:10px 12px;text-align:left;font-weight:500">Tarih</th>'
      + '<th style="padding:10px 12px;text-align:left;font-weight:500">Açıklama</th>'
      + '<th style="padding:10px 12px;text-align:right;font-weight:500">Tutar</th>'
      + '<th style="padding:10px 12px;text-align:center;font-weight:500">Döviz</th>'
      + '<th style="padding:10px 12px;text-align:center;font-weight:500">Kategori</th>'
      + '<th style="padding:10px 12px;text-align:center;font-weight:500;width:32px"></th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function _cfRenderToplam(calc) {
    const cards = PARA_BIRIMLERI.map(function(c) {
      const net = calc.byCurrency[c] && calc.byCurrency[c].net || 0;
      const renk = net > 0 ? '#1A8D6F' : (net < 0 ? '#E0574F' : '#444');
      return '<div style="flex:1;padding:14px;background:#fafafa;border-radius:8px;border:0.5px solid #e8e8e8">'
        + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:6px">' + c + ' Net</div>'
        + '<div style="font-size:18px;font-weight:500;color:' + renk + ';font-variant-numeric:tabular-nums">' + _fmtTutar(net) + '</div>'
        + '</div>';
    }).join('');
    const totalRenk = calc.totalTRY > 0 ? '#1A8D6F' : (calc.totalTRY < 0 ? '#E0574F' : '#444');
    return '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' + cards + '</div>'
      + '<div style="margin-top:14px;padding:16px 18px;background:linear-gradient(135deg,#fafafa,#f3f3f3);border-radius:10px;border:0.5px solid #ddd;display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666">Genel Toplam (TRY karşılığı)</span>'
      + '<span style="font-size:22px;font-weight:600;color:' + totalRenk + ';font-variant-numeric:tabular-nums">' + _fmtTutar(calc.totalTRY) + ' ₺</span>'
      + '</div>';
  }

  function _cfRenderSatirEkleForm() {
    return '<div id="cf-add-form" style="display:none;margin-top:14px;padding:16px;background:#fafafa;border-radius:8px;border:0.5px solid #e8e8e8">'
      + '<div style="display:grid;grid-template-columns:120px 1fr 140px 80px 110px;gap:10px;align-items:end">'
      + '<label style="font-size:11px;color:#666">Tarih<input id="cf-i-tarih" type="date" value="' + new Date().toISOString().slice(0,10) + '" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"></label>'
      + '<label style="font-size:11px;color:#666">Açıklama<input id="cf-i-aciklama" type="text" placeholder="Açıklama..." style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"></label>'
      + '<label style="font-size:11px;color:#666">Tutar<input id="cf-i-tutar" type="number" step="0.01" placeholder="0.00" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px;font-variant-numeric:tabular-nums"></label>'
      + '<label style="font-size:11px;color:#666">Döviz<select id="cf-i-doviz" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px">' + PARA_BIRIMLERI.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select></label>'
      + '<label style="font-size:11px;color:#666">Kategori<select id="cf-i-kategori" style="width:100%;padding:8px;border:0.5px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px"><option value="gelir">Gelir</option><option value="gider">Gider</option><option value="transfer">Transfer</option></select></label>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
      + '<button onclick="document.getElementById(\'cf-add-form\').style.display=\'none\'" style="padding:8px 14px;background:transparent;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#666">Vazgeç</button>'
      + '<button onclick="window._cfFormSubmit()" style="padding:8px 14px;background:#1A8D6F;border:0;border-radius:6px;cursor:pointer;font-size:12px;color:#fff;font-weight:500">Ekle</button>'
      + '</div></div>';
  }

  window._cfFormSubmit = function() {
    const data = {
      tarih: document.getElementById('cf-i-tarih').value,
      aciklama: document.getElementById('cf-i-aciklama').value,
      tutar: document.getElementById('cf-i-tutar').value,
      paraBirimi: document.getElementById('cf-i-doviz').value,
      kategori: document.getElementById('cf-i-kategori').value
    };
    if (!data.aciklama.trim() || !Number(data.tutar)) {
      if (window.toast) window.toast('Açıklama ve tutar zorunlu', 'warn');
      return;
    }
    _cfSatirEkle(data);
  };

  function _cfRenderPanel() {
    const panel = document.getElementById('panel-cash-flow-manuel');
    if (!panel) { console.warn('[CF] panel-cash-flow-manuel div yok'); return; }
    const state = _cfLoad();
    const tablo = state.tablolar.find(t => t.id === state.aktifTabloId);
    const calc = window.calculateCashFlow(tablo);

    panel.innerHTML = '<div style="max-width:1200px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="margin-bottom:18px">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;margin-bottom:4px">Finans › Nakit Akışı Manuel</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline">'
      + '<h2 style="margin:0;font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#222">Nakit Akışı — Manuel</h2>'
      + '<span style="font-size:13px;color:#666">' + _esc(tablo.ad) + '</span>'
      + '</div></div>'
      + '<div style="background:#fff;border-radius:10px;border:0.5px solid #e8e8e8;box-shadow:0 1px 2px rgba(0,0,0,0.04);overflow:hidden">'
      + _cfRenderTablo(tablo)
      + '</div>'
      + '<button onclick="document.getElementById(\'cf-add-form\').style.display=document.getElementById(\'cf-add-form\').style.display===\'none\'?\'block\':\'none\'" style="margin-top:14px;padding:12px;width:100%;background:transparent;border:1px dashed #bbb;border-radius:8px;cursor:pointer;font-size:13px;color:#666">+ Satır Ekle</button>'
      + _cfRenderSatirEkleForm()
      + _cfRenderToplam(calc)
      + '<div style="margin-top:18px;display:flex;justify-content:flex-end">'
      + '<button onclick="window.CashFlow.exportJson()" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">JSON İndir</button>'
      + '</div>'
      + '</div>';
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
