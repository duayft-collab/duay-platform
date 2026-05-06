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
     * Eski fallback `window.confirm()` kullanıyordu — anayasal uyumsuz. */
    var fn = window.confirmModal;
    if (typeof fn !== 'function') {
      if (window.toast) window.toast('Onay penceresi yüklenemedi. Sayfayı yenileyip tekrar dene.', 'err');
      return;
    }
    fn({
      title: 'Satır Sil',
      message: 'Bu satırı silmek istediğinizden emin misiniz?',
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
        /* V193 EDIT 2 — Kaynak/Banka kolonu */
        + '<td style="padding:10px 12px;text-align:center">' + _cfBadge(s.kaynak) + '</td>'
        + '<td style="padding:10px 12px;text-align:center"><button data-cf-action="row-delete" data-cf-row-id="' + _esc(s.id) + '" style="background:transparent;border:0;cursor:pointer;color:#bbb;font-size:14px" title="Sil">×</button></td>'
        + '</tr>';
    }).join('');
    return '<table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<thead><tr style="border-bottom:0.5px solid #ddd;text-transform:uppercase;letter-spacing:0.05em;font-size:11px;color:#888">'
      + '<th style="padding:10px 12px;text-align:left;font-weight:500">Tarih</th>'
      + '<th style="padding:10px 12px;text-align:left;font-weight:500">Açıklama</th>'
      + '<th style="padding:10px 12px;text-align:right;font-weight:500">Tutar</th>'
      + '<th style="padding:10px 12px;text-align:center;font-weight:500">Döviz</th>'
      + '<th style="padding:10px 12px;text-align:center;font-weight:500">Kategori</th>'
      /* V193 EDIT 2 — Kaynak başlığı */
      + '<th style="padding:10px 12px;text-align:center;font-weight:500">Kaynak</th>'
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
    const calc = window.calculateCashFlow(tablo);

    /* V193 EDIT 2 — Toolbar entegrasyonu:
     * Çalışma adı CashFlowWorks.getActiveWork()'tan gelir (varsa). Yüklü değilse fallback tablo.ad.
     * Dirty işareti CashFlowWorks.isDirty() — true ise başlık yanında kırmızı '*'.
     * UI sade: ekstra border/shadow yok, sade text-only.
     * V193 EDIT 3 — CashFlowWorksUI varsa toolbar'ı oraya delege et;
     * yoksa workTitle + dirty mark fallback (data layer açık ama UI yüklenmemişse). */
    var workTitle = (tablo && tablo.ad) || 'Manuel Kasa';
    var isDirty = !!(window.CashFlowWorks && typeof window.CashFlowWorks.isDirty === 'function' && window.CashFlowWorks.isDirty());
    var dirtyMark = isDirty ? '<span style="color:#E0574F;margin-left:4px" title="Kaydedilmemiş değişiklik">*</span>' : '';
    var hasUI = !!(window.CashFlowWorksUI && typeof window.CashFlowWorksUI.renderToolbar === 'function');
    /* hasUI=true → workTitle metni gizli, toolbar buton dolgusu var; aktif çalışma adı kart modal'da görünür.
     * hasUI=false → eski fallback gösterimi (geri uyumlu). */
    var toolbarHtml = hasUI
      ? '<div id="cf-toolbar"></div>'
      : '<span style="font-size:13px;color:#666">' + _esc(workTitle) + dirtyMark + '</span>';

    panel.innerHTML = '<div style="max-width:1200px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">'
      + '<div style="margin-bottom:18px">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;margin-bottom:4px">Finans › Nakit Akışı Manuel</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline">'
      + '<h2 style="margin:0;font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#222">Nakit Akışı — Manuel</h2>'
      + toolbarHtml
      + '</div></div>'
      + '<div style="background:#fff;border-radius:10px;border:0.5px solid #e8e8e8;box-shadow:0 1px 2px rgba(0,0,0,0.04);overflow:hidden">'
      + _cfRenderTablo(tablo)
      + '</div>'
      /* V193 EDIT 2 — Add Row buton: inline onclick yerine data-cf-action (event delegation) */
      + '<button data-cf-action="add-row-toggle" style="margin-top:14px;padding:12px;width:100%;background:transparent;border:1px dashed #bbb;border-radius:8px;cursor:pointer;font-size:13px;color:#666">+ Satır Ekle</button>'
      + _cfRenderSatirEkleForm()
      + _cfRenderToplam(calc)
      + '<div style="margin-top:18px;display:flex;justify-content:flex-end;gap:8px">'
      /* V193 EDIT 4 — Excel İndir butonu (CashFlowExcel modülü). Sade, JSON ile aynı stil. */
      + '<button data-cf-action="export-xlsx" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">Excel İndir</button>'
      + '<button data-cf-action="export-json" style="padding:9px 16px;background:#fff;border:0.5px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px;color:#444">JSON İndir</button>'
      + '</div>'
      + '</div>';

    /* V193 EDIT 2 — Event delegation: panel root'a tek listener, data-cf-action ile dispatch.
     * Yeni inline onclick YOK. Mevcut 5 inline onclick (V19x temizlik borç) bu cycle'da dokunulmadı. */
    _cfBindEvents(panel);

    /* V193 EDIT 3 — Toolbar render: CashFlowWorksUI varsa çalışma yönetimi butonlarını
     * #cf-toolbar div'ine enjekte eder. UI yüklenmemişse fallback span zaten gösterilmiştir. */
    if (window.CashFlowWorksUI && typeof window.CashFlowWorksUI.renderToolbar === 'function') {
      try { window.CashFlowWorksUI.renderToolbar('#cf-toolbar'); }
      catch (e) { console.warn('[CF] CashFlowWorksUI.renderToolbar error:', e && e.message); }
    }
  }

  /* V193 EDIT 2 — Event delegation bind (idempotent — panel her render'da yeniden bağlanır,
   * eski listener panel.innerHTML rewrite ile otomatik temizlenir). */
  function _cfBindEvents(panel) {
    if (!panel) return;
    panel.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-cf-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-cf-action');
      if (action === 'add-row-toggle') {
        var f = document.getElementById('cf-add-form');
        if (f) f.style.display = (f.style.display === 'none' ? 'block' : 'none');
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
      } else if (action === 'row-delete') {
        var rid = btn.getAttribute('data-cf-row-id');
        if (rid) _cfSatirSil(rid);
      }
    });
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
