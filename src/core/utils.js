/**
 * ════════════════════════════════════════════════════════════════
 * src/core/utils.js  —  v8.1.0
 * Platform Utility Katmanı — Tüm modüller buradan içe aktarır
 *
 * Kapsam:
 *   • DOM kısayolları (g, st, qs, qsa)
 *   • Auth bağlantıları (CU, isAdmin, isManager)
 *   • Zaman yardımcıları (nowTs, formatDate, relativeTime)
 *   • Sayı/metin formatlama (formatMoney, initials, escapeHtml)
 *   • Güvenli veri erişimi (safeGet)
 *   • UI yardımcıları (toast, openMo, closeMo, addNotif)
 *   • Debounce / throttle
 *
 * Yükleme sırası: database.js ve auth.js'den SONRA, modüllerden ÖNCE
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';

// ── DOM Kısayolları ───────────────────────────────────────────────
/** @param {string} id @returns {HTMLElement|null} */
const $ = id => document.getElementById(id);
/** @param {string} id @param {*} v */
const $t = (id, v) => { const el = $(id); if (el) el.textContent = v; };
/** @param {string} sel @param {Element} [ctx=document] */
const $q = (sel, ctx = document) => ctx.querySelector(sel);
/** @param {string} sel @param {Element} [ctx=document] */
const $qa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Auth Kısayolları ──────────────────────────────────────────────
/** @returns {Object|null} Oturumdaki kullanıcı */
/** @returns {boolean} */
window.isAdmin = () => window.Auth?.getCU?.()?.role === 'admin';
/** @returns {boolean} */
const isManager= () => ['admin','manager'].includes(window.Auth?.getCU?.()?.role);

// ── Zaman Yardımcıları ────────────────────────────────────────────
const _nowTs = () => { const n=new Date(),p=v=>String(v).padStart(2,'0'); return `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`; };
const nowTs = _nowTs;  // alias — modüller window.nowTs bekliyor
const _p = n => String(n).padStart(2, '0');

/**
 * @returns {string} 'YYYY-MM-DD HH:MM:SS'
 */

/**
 * @param {string} ts ISO / 'YYYY-MM-DD HH:MM:SS'
 * @returns {string} '2 saat önce' gibi relative zaman
 */
const relativeTime = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts.replace(' ','T')).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'az önce';
  if (mins < 60)  return `${mins} dakika önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} saat önce`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days} gün önce`;
  return ts.slice(0, 10);
};

/**
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {string} '15 Mart 2026 Pazar'
 */
const formatDate = (dateStr, opts = {}) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', ...opts
    });
  } catch { return dateStr; }
};

// ── Sayı / Metin Formatlama ───────────────────────────────────────
/**
 * @param {number} n
 * @returns {string} '1.234,56 ₺'
 */
const formatMoney = (n, decimals = 2) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' ₺';

/**
 * Ad Soyad → 'AS' baş harfleri
 * @param {string} name
 * @returns {string}
 */
const initials = name =>
  (name || '?').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';

/**
 * XSS önleme — innerHTML'e yazılacak kullanıcı girdisini temizle
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = str => {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ── UI Yardımcıları ───────────────────────────────────────────────
/** @param {string} msg @param {'ok'|'err'|'warn'|'info'} [type='ok'] */

/** @param {string} id */
/** @param {string} id */

/**
 * @param {string} icon
 * @param {string} msg
 * @param {'info'|'ok'|'warn'|'err'} [type='info']
 * @param {string} [link='']
 */

/** @param {string} type @param {string} detail */

// ── Performans Yardımcıları ───────────────────────────────────────
/**
 * Debounce — fn'i son çağrıdan ms sonra çalıştırır
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/**
 * Throttle — fn'i en fazla ms'de bir çalıştırır
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
const throttle = (fn, ms = 300) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
};

// ── Veri Yardımcıları ─────────────────────────────────────────────
/**
 * Nesne içinde güvenli derin erişim: safeGet(obj, 'a.b.c', fallback)
 * @param {*} obj
 * @param {string} path
 * @param {*} [fallback]
 */
const safeGet = (obj, path, fallback = null) => {
  try {
    return path.split('.').reduce((o, k) => o?.[k], obj) ?? fallback;
  } catch { return fallback; }
};

/**
 * Array'i belirli bir key'e göre gruplar
 * @param {Array} arr
 * @param {string|Function} key
 * @returns {Object}
 */
const groupBy = (arr, key) =>
  (arr || []).reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});

/**
 * Renk paleti — avatar, kart renkleri için
 * @type {string[]}
 */
const AV_COLORS = [
  '#6366F1','#8B5CF6','#EC4899','#0EA5E9',
  '#10B981','#F59E0B','#EF4444','#14B8A6',
  '#F97316','#06B6D4',
];

/** @param {number} idx @returns {string} */
const avatarColor = idx => AV_COLORS[Math.abs(idx) % AV_COLORS.length];

// ── Loading / Skeleton ────────────────────────────────────────────
/**
 * Bir container'a skeleton loader göster
 * @param {string|HTMLElement} target  ID veya element
 * @param {number} [rows=3]
 */
const showSkeleton = (target, rows = 3) => {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  el.innerHTML = Array.from({ length: rows }, (_, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--b)">
      <div style="width:36px;height:36px;border-radius:50%;background:var(--s3);animation:skeleton-pulse 1.5s infinite ${i*0.15}s"></div>
      <div style="flex:1">
        <div style="height:13px;background:var(--s3);border-radius:6px;width:${60+i*10}%;animation:skeleton-pulse 1.5s infinite ${i*0.2}s"></div>
        <div style="height:10px;background:var(--s3);border-radius:6px;width:${40+i*5}%;margin-top:6px;animation:skeleton-pulse 1.5s infinite ${i*0.25}s"></div>
      </div>
    </div>`).join('');
};

/**
 * Error boundary — render fonksiyonlarını sarar
 * @param {Function} renderFn
 * @param {string} panelName
 * @returns {Function}
 */
const withErrorBoundary = (renderFn, panelName) => {
  return (...args) => {
    try {
      return renderFn(...args);
    } catch (err) {
      console.error(`[${panelName}] render hatası:`, err);
      const panel = $(`panel-${panelName.toLowerCase()}`);
      if (panel) {
        panel.innerHTML = `
          <div style="padding:48px;text-align:center;color:var(--t2)">
            <div style="font-size:36px;margin-bottom:12px">⚠️</div>
            <div style="font-size:15px;font-weight:600;margin-bottom:8px">${panelName} paneli yüklenemedi</div>
            <div style="font-size:12px;color:var(--t3);margin-bottom:16px">${err?.message || 'Beklenmedik hata'}</div>
            <button class="btn btns" onclick="window.App?.nav?.('${panelName.toLowerCase()}')">
              🔄 Yeniden Dene
            </button>
          </div>`;
      }
      toast(`${panelName} yüklenemedi`, 'err');
    }
  };
};

// ── CSS Skeleton Animasyonu (bir kez enjekte edilir) ──────────────
(function injectSkeletonCSS() {
  if (document.getElementById('utils-skeleton-style')) return;
  const style = document.createElement('style');
  style.id = 'utils-skeleton-style';
  style.textContent = `
    @keyframes skeleton-pulse {
      0%,100% { opacity:1 }
      50%      { opacity:.4 }
    }
  `;
  document.head.appendChild(style);
})();

// ── Global Export ─────────────────────────────────────────────────
const Utils = {
  $, $t, $q, $qa,
  CU, isAdmin, isManager,
  nowTs, relativeTime, formatDate,
  formatMoney, initials, escapeHtml,
  toast, openMo, closeMo, addNotif, logActivity,
  debounce, throttle, safeGet, groupBy,
  AV_COLORS, avatarColor,
  showSkeleton, withErrorBoundary,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
  // Geriye uyumluluk — modüller window.* üzerinden erişebilir
  Object.assign(window, {
    $u: $, $tu: $t,
    initials, escapeHtml,
    relativeTime, formatDate, formatMoney,
    avatarColor, AV_COLORS,
    debounce, throttle, safeGet, groupBy,
    showSkeleton, withErrorBoundary,
    nowTsUtil: nowTs,
    nowTs: nowTs,              // global erişim için
  });
}

// ── Virtual Scroll ────────────────────────────────────────────────
/**
 * Büyük listeler için virtual scroll.
 * Sadece görünür satırları DOM'a yazar — 1000+ kayıtta performans.
 *
 * Kullanım:
 *   const vl = new VirtualList(container, items, renderRow, { rowHeight: 52 });
 *   vl.render();
 *
 * @param {HTMLElement} container  — scroll container
 * @param {Array}       items      — tüm veri dizisi
 * @param {Function}    renderRow  — (item, index) → HTMLElement
 * @param {Object}      [opts]
 * @param {number}      [opts.rowHeight=52]   — piksel cinsinden satır yüksekliği
 * @param {number}      [opts.buffer=5]       — görünür alan dışı ek satır
 * @param {number}      [opts.threshold=100]  — bu sayının altında virtual scroll devre dışı
 */
class VirtualList {
  constructor(container, items, renderRow, opts = {}) {
    this.container  = container;
    this.items      = items;
    this.renderRow  = renderRow;
    this.rowHeight  = opts.rowHeight  || 52;
    this.buffer     = opts.buffer     || 5;
    this.threshold  = opts.threshold  || 100;
    this._scrollFn  = null;
  }

  render() {
    const { container, items, rowHeight, buffer, threshold } = this;
    if (!container) return;

    // Az kayıt varsa normal render — virtual scroll gereksiz
    if (items.length < threshold) {
      const frag = document.createDocumentFragment();
      items.forEach((item, i) => frag.appendChild(this.renderRow(item, i)));
      container.replaceChildren(frag);
      return;
    }

    const totalH = items.length * rowHeight;

    // Outer: tam yükseklik — scrollbar oluşturur
    container.style.position   = 'relative';
    container.style.overflow   = 'auto';
    container.style.height     = Math.min(totalH, window.innerHeight * 0.7) + 'px';

    // Inner: gerçek yükseklik (scroll alanı)
    let inner = container.querySelector('._vl_inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = '_vl_inner';
      inner.style.position = 'relative';
      container.appendChild(inner);
    }
    inner.style.height = totalH + 'px';

    // Viewport: görünür satırları tutar
    let viewport = container.querySelector('._vl_viewport');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.className = '_vl_viewport';
      viewport.style.position = 'absolute';
      viewport.style.left     = '0';
      viewport.style.right    = '0';
      inner.appendChild(viewport);
    }

    const _paint = () => {
      const scrollTop  = container.scrollTop;
      const clientH    = container.clientHeight;
      const startIdx   = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
      const endIdx     = Math.min(items.length - 1,
                           Math.ceil((scrollTop + clientH) / rowHeight) + buffer);

      viewport.style.top = (startIdx * rowHeight) + 'px';

      const frag = document.createDocumentFragment();
      for (let i = startIdx; i <= endIdx; i++) {
        const el = this.renderRow(items[i], i);
        el.style.height    = rowHeight + 'px';
        el.style.overflow  = 'hidden';
        frag.appendChild(el);
      }
      viewport.replaceChildren(frag);
    };

    // Scroll listener — eski varsa kaldır
    if (this._scrollFn) container.removeEventListener('scroll', this._scrollFn);
    this._scrollFn = debounce(_paint, 16);
    container.addEventListener('scroll', this._scrollFn, { passive: true });

    _paint(); // ilk render
  }

  /** Veriyi güncelle ve yeniden render et */
  update(newItems) {
    this.items = newItems;
    this.render();
  }

  /** Listener'ı temizle */
  destroy() {
    if (this._scrollFn && this.container) {
      this.container.removeEventListener('scroll', this._scrollFn);
    }
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.VirtualList = VirtualList;
  window.Utils = window.Utils || {};
  window.Utils.VirtualList = VirtualList;
}

})();

// ── Global Kısayollar (modül uyumluluğu için) ─────────────────
window.g  = window.g  || (id => document.getElementById(id));
window.st = window.st || ((id, show) => {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
});
window.qs  = window.qs  || ((sel, ctx) => (ctx||document).querySelector(sel));
window.qsa = window.qsa || ((sel, ctx) => [...(ctx||document).querySelectorAll(sel)]);
