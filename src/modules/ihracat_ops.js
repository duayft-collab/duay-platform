/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/ihracat_ops.js  —  v1.0.0
 * İhracat Operasyon Merkezi
 * Her ihracat işleminin başladığı merkez tablo.
 * GÇB, B/L, akreditif, sigorta bu tabloya bağlanır.
 * localStorage: ak_ihracat_ops1
 * Firestore: duay_tenant_default/ihracatOps
 *
 * Anayasa: K01 ≤800, K04 try-catch, K06 soft-delete (iptal),
 *          K08 strict, D3 IIFE, D10 generateId
 * ════════════════════════════════════════════════════════════════
 */
(function IhracatOpsModule() {
'use strict';

/* ── Kısayollar ─────────────────────────────────────────────── */
const _g   = id => document.getElementById(id);
const _esc = s => typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _cu  = () => window.CU?.() || window.Auth?.getCU?.();
const _fmt = v => Math.round(Math.abs(v)).toLocaleString('tr-TR');
const _fmtD = d => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
const _genId = () => typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now();

/* ── Stiller ────────────────────────────────────────────────── */
const BG1='var(--sf)',BG2='var(--s2)',BD='var(--b)',BDM='var(--bm)',T1='var(--t)',T2='var(--t2)',T3='var(--t3)';
const BLUE='#185FA5',GREEN='#16A34A',RED='#DC2626',AMBER='#D97706',PURPLE='#7C3AED';

/* ── Sabitler ───────────────────────────────────────────────── */
const EXP_STATUS = {
  taslak:       { l:'Taslak',        c:'#6B7280', bg:'rgba(107,114,128,.08)' },
  hazirlaniyor: { l:'Hazırlanıyor',  c:'#D97706', bg:'rgba(245,158,11,.08)'  },
  yuklendi:     { l:'Yüklendi',      c:'#185FA5', bg:'rgba(24,95,165,.08)'   },
  yolda:        { l:'Yolda',         c:'#7C3AED', bg:'rgba(124,58,237,.08)'  },
  teslim:       { l:'Teslim Edildi', c:'#16A34A', bg:'rgba(34,197,94,.08)'   },
  iptal:        { l:'İptal',         c:'#DC2626', bg:'rgba(239,68,68,.08)'   },
};
const EXP_ODEME = ['TT','LC','DA','DP','OA'];
const EXP_INCOTERMS = ['EXW','FOB','CFR','CIF','DDP','FCA','CPT','CIP','DAP','DPU'];
const EXP_DOVIZ = ['USD','EUR','TRY'];
const EXP_BIRIM = ['PCS','KGS','MTR','SET','TON','M2','M3','LTR'];

/* ── Veri ────────────────────────────────────────────────────── */
const _load  = () => typeof window.loadIhracatOps === 'function' ? window.loadIhracatOps() : [];
const _store = d => { if (typeof window.storeIhracatOps === 'function') window.storeIhracatOps(d); };
const _loadU = () => typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
const _loadC = () => typeof window.loadCari === 'function' ? window.loadCari().filter(c => !c.isDeleted) : [];
const _loadUsers = () => typeof window.loadUsers === 'function' ? window.loadUsers() : [];

/* ── State ──────────────────────────────────────────────────── */
let _filter = 'all';
let _search = '';

/* ── EXP No Üretimi ─────────────────────────────────────────── */
function _nextExpNo() {
  const y = new Date().getFullYear();
  const all = _load();
  let max = 0;
  all.forEach(r => {
    if (!r.expNo) return;
    const m = r.expNo.match(/EXP-(\d{4})-(\d{4})/);
    if (m && parseInt(m[1]) === y && parseInt(m[2]) > max) max = parseInt(m[2]);
  });
  return 'EXP-' + y + '-' + String(max + 1).padStart(4, '0');
}

/* ── Badge ──────────────────────────────────────────────────── */
function _statusBadge(s) {
  const st = EXP_STATUS[s] || EXP_STATUS.taslak;
  return '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + st.bg + ';color:' + st.c + ';font-weight:500">' + _esc(st.l) + '</span>';
}

/* ── Form Yardımcıları ──────────────────────────────────────── */
function _lbl(t, req) { return '<div style="font-size:10px;margin-bottom:3px;color:' + (req ? '#DC2626' : T3) + '">' + _esc(t) + (req ? ' *' : '') + '</div>'; }
function _inp(id, label, o) {
  const opts = o || {};
  return '<div>' + _lbl(label, opts.req) + '<input class="fi" id="exp-' + id + '" type="' + (opts.type || 'text') + '" value="' + _esc(opts.val || '') + '"'
    + (opts.ro ? ' readonly' : '') + (opts.req ? ' data-req="1"' : '') + ' placeholder="' + _esc(opts.ph || '') + '"'
    + ' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid ' + BDM + ';' + (opts.ro ? 'background:#E6F1FB' : '') + '"></div>';
}
function _sel(id, label, options, o) {
  const opts = o || {};
  let h = '<div>' + _lbl(label, opts.req) + '<select class="fi" id="exp-' + id + '"' + (opts.req ? ' data-req="1"' : '') + ' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid ' + BDM + '"><option value="">— Seçin —</option>';
  options.forEach(v => {
    const val = typeof v === 'object' ? v.v : v, lbl = typeof v === 'object' ? v.l : v;
    h += '<option value="' + _esc(val) + '"' + (String(opts.sel) === String(val) ? ' selected' : '') + '>' + _esc(lbl) + '</option>';
  });
  return h + '</select></div>';
}
function _ta(id, label, o) {
  const opts = o || {};
  return '<div style="grid-column:span 2">' + _lbl(label, opts.req)
    + '<textarea class="fi" id="exp-' + id + '" rows="2" placeholder="' + _esc(opts.ph || '') + '" style="font-size:11px;padding:8px 10px;resize:none;min-height:56px;border-radius:8px;border:0.5px solid ' + BDM + '">' + _esc(opts.val || '') + '</textarea></div>';
}
function _grid(c, inner) { return '<div style="display:grid;grid-template-columns:repeat(' + c + ',minmax(0,1fr));gap:12px">' + inner + '</div>'; }

/* ════════════════════════════════════════════════════════════════
   ANA LİSTE — renderIhracatOps()
   ════════════════════════════════════════════════════════════════ */
function renderIhracatOps() {
  try {
    const panel = _g('panel-ihracat-ops');
    if (!panel) return;
    const all = _load();
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);

    // Metrikler
    const total = all.length;
    const yolda = all.filter(r => r.status === 'yolda').length;
    const ayTeslim = all.filter(r => r.status === 'teslim' && (r.gercekYukleme || r.updatedAt || '').startsWith(thisMonth)).length;
    const toplamCiro = all.filter(r => r.status !== 'iptal').reduce((s, r) => s + ((parseFloat(r.birimFiyat) || 0) * (parseFloat(r.miktar) || 0)), 0);

    const mk = (l, v, c) => '<div style="background:' + BG2 + ';border-radius:7px;padding:10px 14px"><div style="font-size:9px;color:' + T3 + ';text-transform:uppercase">' + l + '</div><div style="font-size:20px;font-weight:600;color:' + c + '">' + v + '</div></div>';

    let h = '<div style="padding:16px 24px;display:flex;flex-direction:column;gap:12px">';

    // Header
    h += '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-size:16px;font-weight:700;color:' + T1 + '">İhracat Operasyon Merkezi</div>'
      + '<div style="font-size:10px;color:' + T3 + '">EXP — GÇB, B/L, akreditif bu tabloya bağlanır</div></div>'
      + '<button onclick="window.openIhracatForm()" style="padding:7px 16px;border:none;border-radius:7px;background:#185FA5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">+ Yeni İhracat</button></div>';

    // Metrik kartlar
    h += _grid(4, mk('Toplam İşlem', total, T1) + mk('Yolda', yolda, PURPLE) + mk('Bu Ay Teslim', ayTeslim, GREEN) + mk('Toplam Ciro', '$' + _fmt(toplamCiro), BLUE));

    // Filtre bar
    const chips = [['all', 'Tümü'], ...Object.entries(EXP_STATUS).map(([k, v]) => [k, v.l])];
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
    chips.forEach(([f, l]) => {
      h += '<span onclick="window._expFilter(\'' + f + '\')" style="padding:4px 10px;border-radius:12px;font-size:10px;cursor:pointer;' + (_filter === f ? 'background:' + BLUE + ';color:#fff' : 'background:' + BG2 + ';color:' + T2) + '">' + l + '</span>';
    });
    h += '</div>';

    // Arama
    h += '<input class="fi" id="exp-search" placeholder="Ara (EXP no, alıcı, ürün...)" oninput="window._expSearch(this.value)" value="' + _esc(_search) + '" style="border:0.5px solid ' + BD + ';border-radius:8px;font-size:11px;padding:8px 12px">';

    // Filtreleme
    let filtered = all;
    if (_filter !== 'all') filtered = all.filter(r => r.status === _filter);
    if (_search) {
      const q = _search.toLowerCase();
      filtered = filtered.filter(r => (r.expNo || '').toLowerCase().includes(q) || (r.aliciAdi || '').toLowerCase().includes(q) || (r.urunAdi || '').toLowerCase().includes(q));
    }

    // Liste
    h += '<div style="background:' + BG1 + ';border:0.5px solid ' + BD + ';border-radius:8px;overflow:hidden">';
    // Başlık satırı
    h += '<div style="display:grid;grid-template-columns:100px 1.2fr 1fr 80px 100px 70px 100px 90px 90px 50px;padding:8px 12px;background:' + BG2 + ';font-size:9px;font-weight:500;color:' + T3 + ';text-transform:uppercase;gap:6px">'
      + '<span>EXP No</span><span>Ürün</span><span>Alıcı</span><span>Miktar</span><span>Fiyat</span><span>İnco</span><span>Liman</span><span>Tarih</span><span>Durum</span><span></span></div>';

    if (!filtered.length) {
      h += '<div style="padding:32px;text-align:center;font-size:12px;color:' + T3 + '">Henüz ihracat işlemi yok</div>';
    }
    filtered.forEach(r => {
      h += '<div style="display:grid;grid-template-columns:100px 1.2fr 1fr 80px 100px 70px 100px 90px 90px 50px;padding:8px 12px;border-top:0.5px solid ' + BD + ';font-size:11px;color:' + T1 + ';align-items:center;gap:6px;transition:background .1s" onmouseover="this.style.background=\'' + BG2 + '\'" onmouseout="this.style.background=\'\'">'
        + '<span style="font-weight:600;color:' + BLUE + '">' + _esc(r.expNo || '—') + '</span>'
        + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(r.urunAdi || '—') + '</span>'
        + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(r.aliciAdi || '—') + '</span>'
        + '<span>' + _esc(r.miktar || '') + ' ' + _esc(r.birim || '') + '</span>'
        + '<span style="font-weight:500">' + _fmt(parseFloat(r.birimFiyat) || 0) + ' ' + _esc(r.doviz || '') + '</span>'
        + '<span>' + _esc(r.incoterms || '') + '</span>'
        + '<span style="font-size:10px;color:' + T2 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(r.varisLimani || '') + '</span>'
        + '<span style="font-size:10px;color:' + T2 + '">' + _fmtD(r.planlananYukleme) + '</span>'
        + '<span>' + _statusBadge(r.status) + '</span>'
        + '<span><button onclick="window.openIhracatForm(\'' + r.id + '\')" style="padding:3px 8px;border:0.5px solid ' + BD + ';border-radius:5px;background:none;cursor:pointer;font-size:9px;color:' + T3 + ';font-family:inherit">✏️</button></span>'
        + '</div>';
    });
    h += '</div>';
    h += '</div>';

    panel.innerHTML = h;
  } catch (e) { console.error('[ihracat_ops] render hata:', e); }
}

/* ════════════════════════════════════════════════════════════════
   FORM — openIhracatForm(id)
   ════════════════════════════════════════════════════════════════ */
function openIhracatForm(id) {
  try {
    const panel = _g('panel-ihracat-ops');
    if (!panel) return;
    const r = id ? _load().find(x => String(x.id) === String(id)) || {} : {};
    const isEdit = !!id;
    const urunOpts = _loadU().map(u => ({ v: u.id || u.urunKodu, l: (u.urunAdi || u.duayAdi || '') + (u.urunKodu ? ' (' + u.urunKodu + ')' : '') }));
    const cariOpts = _loadC().map(c => ({ v: c.id || c.ad, l: c.ad || c.firma || '' }));
    const statusOpts = Object.entries(EXP_STATUS).map(([k, v]) => ({ v: k, l: v.l }));

    delete panel.dataset.injected;
    let h = '<div style="max-width:860px;margin:0 auto;padding:20px 32px;display:flex;flex-direction:column;gap:14px">';
    h += '<div><span onclick="window.renderIhracatOps()" style="font-size:10px;color:' + BLUE + ';cursor:pointer">← İhracat Listesi</span></div>';
    h += '<div style="font-size:15px;font-weight:600;color:' + T1 + '">' + (isEdit ? 'İhracat Düzenle — ' + _esc(r.expNo || '') : 'Yeni İhracat İşlemi') + '</div>';
    h += '<input type="hidden" id="exp-edit-id" value="' + _esc(id || '') + '">';

    // Ürün & Taraflar
    h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';margin-bottom:4px">Ürün & Taraflar</div>';
    h += _grid(3,
      _sel('urun', 'Ürün', urunOpts, { req: true, sel: r.urunId })
      + _sel('alici', 'Alıcı (Müşteri)', cariOpts, { req: true, sel: r.aliciId })
      + _sel('tedarikci', 'Tedarikçi', cariOpts, { sel: r.tedarikciId })
    );

    // Miktar & Fiyat
    h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';margin-top:8px;margin-bottom:4px">Miktar & Fiyat</div>';
    h += _grid(4,
      _inp('miktar', 'Miktar', { type: 'number', req: true, val: r.miktar })
      + _sel('birim', 'Birim', EXP_BIRIM, { sel: r.birim || 'PCS' })
      + _inp('fiyat', 'Birim Fiyat', { type: 'number', req: true, val: r.birimFiyat })
      + _sel('doviz', 'Döviz', EXP_DOVIZ, { req: true, sel: r.doviz || 'USD' })
    );

    // Ticari Koşullar
    h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';margin-top:8px;margin-bottom:4px">Ticari Koşullar</div>';
    h += _grid(4,
      _sel('incoterms', 'İncoterms', EXP_INCOTERMS, { req: true, sel: r.incoterms })
      + _sel('odeme', 'Ödeme Şekli', EXP_ODEME, { sel: r.odemeSekli })
      + _inp('yukleme-limani', 'Yükleme Limanı', { val: r.yuklemeLimani })
      + _inp('varis-limani', 'Varış Limanı', { val: r.varisLimani })
    );

    // Tarihler & Durum
    h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';margin-top:8px;margin-bottom:4px">Tarih & Durum</div>';
    h += _grid(3,
      _inp('plan-yukleme', 'Planlanan Yükleme', { type: 'date', val: r.planlananYukleme })
      + _inp('gercek-yukleme', 'Gerçek Yükleme', { type: 'date', val: r.gercekYukleme })
      + _sel('status', 'Durum', statusOpts, { sel: r.status || 'taslak' })
    );

    // Bağlantılar (readonly — sonraki modüllerde doldurulacak)
    if (isEdit) {
      h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:' + T3 + ';margin-top:8px;margin-bottom:4px">Bağlı Belgeler</div>';
      h += _grid(2,
        _inp('gcb', 'GÇB No', { val: r.gcbNo, ro: true, ph: 'GÇB modülünden bağlanacak' })
        + _inp('bl', 'B/L No', { val: r.blNo, ro: true, ph: 'B/L modülünden bağlanacak' })
      );
    }

    // Notlar
    h += _ta('notlar', 'Notlar', { val: r.notlar });

    // Kaydet
    h += '<div style="display:flex;gap:8px;margin-top:8px">'
      + '<button onclick="window.saveIhracatOps()" style="padding:8px 20px;border:none;border-radius:8px;background:' + BLUE + ';color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Kaydet</button>'
      + '<button onclick="window.renderIhracatOps()" style="padding:8px 20px;border:0.5px solid ' + BD + ';border-radius:8px;background:' + BG1 + ';color:' + T2 + ';font-size:12px;cursor:pointer;font-family:inherit">İptal</button></div>';
    h += '</div>';

    panel.innerHTML = h;
  } catch (e) { console.error('[ihracat_ops] form hata:', e); }
}

/* ════════════════════════════════════════════════════════════════
   KAYDET — saveIhracatOps()
   ════════════════════════════════════════════════════════════════ */
function saveIhracatOps() {
  try {
    const editId = _g('exp-edit-id')?.value;
    const cu = _cu();
    const data = _load();

    // Form değerleri
    const urunId = _g('exp-urun')?.value;
    const aliciId = _g('exp-alici')?.value;
    const miktar = _g('exp-miktar')?.value;
    const birimFiyat = _g('exp-fiyat')?.value;
    const doviz = _g('exp-doviz')?.value;
    const incoterms = _g('exp-incoterms')?.value;

    // Zorunlu alan kontrolü
    if (!urunId) { window.toast?.('Ürün seçiniz', 'error'); return; }
    if (!aliciId) { window.toast?.('Alıcı seçiniz', 'error'); return; }
    if (!miktar) { window.toast?.('Miktar giriniz', 'error'); return; }
    if (!birimFiyat) { window.toast?.('Birim fiyat giriniz', 'error'); return; }
    if (!doviz) { window.toast?.('Döviz seçiniz', 'error'); return; }
    if (!incoterms) { window.toast?.('İncoterms seçiniz', 'error'); return; }

    // Denormalize isimler
    const urunAdi = _loadU().find(u => String(u.id || u.urunKodu) === urunId)?.urunAdi || _loadU().find(u => String(u.id || u.urunKodu) === urunId)?.duayAdi || '';
    const aliciAdi = _loadC().find(c => String(c.id || c.ad) === aliciId)?.ad || '';
    const tedarikciId = _g('exp-tedarikci')?.value || '';
    const tedarikciAdi = tedarikciId ? (_loadC().find(c => String(c.id || c.ad) === tedarikciId)?.ad || '') : '';

    const vals = {
      urunId, urunAdi, aliciId, aliciAdi, tedarikciId, tedarikciAdi,
      miktar: parseFloat(miktar) || 0,
      birim: _g('exp-birim')?.value || 'PCS',
      birimFiyat: parseFloat(birimFiyat) || 0,
      doviz, incoterms,
      odemeSekli: _g('exp-odeme')?.value || '',
      yuklemeLimani: _g('exp-yukleme-limani')?.value || '',
      varisLimani: _g('exp-varis-limani')?.value || '',
      planlananYukleme: _g('exp-plan-yukleme')?.value || '',
      gercekYukleme: _g('exp-gercek-yukleme')?.value || '',
      status: _g('exp-status')?.value || 'taslak',
      notlar: _g('exp-notlar')?.value || '',
    };

    let existing = editId ? data.find(x => String(x.id) === editId) : null;
    if (existing) {
      Object.assign(existing, vals, { updatedAt: new Date().toISOString() });
    } else {
      existing = {
        id: _genId(),
        expNo: _nextExpNo(),
        createdAt: new Date().toISOString(),
        createdBy: cu?.id,
        gcbNo: '',
        blNo: '',
        ...vals,
      };
      data.push(existing);
    }

    _store(data);
    window.logActivity?.('ihracat', 'İhracat kaydedildi: ' + (existing.expNo || ''));
    window.toast?.('İhracat kaydedildi ✓', 'ok');
    renderIhracatOps();
  } catch (e) { console.error('[ihracat_ops] save hata:', e); }
}

/* ── Filtre & Arama ─────────────────────────────────────────── */
window._expFilter = f => { _filter = f; renderIhracatOps(); };
window._expSearch = q => { _search = q; renderIhracatOps(); };

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
window.renderIhracatOps = renderIhracatOps;
window.openIhracatForm  = openIhracatForm;
window.saveIhracatOps   = saveIhracatOps;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderIhracatOps, openIhracatForm, saveIhracatOps };
}

})();
