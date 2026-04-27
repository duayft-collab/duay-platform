/**
 * ════════════════════════════════════════════════════════════════
 * src/core/utils.js  —  v8.2.0 / 2026-03-24 00:00
 * Platform Utility Katmanı — Tüm modüller buradan içe aktarır
 *
 * Kapsam:
 *   • DOM kısayolları (g, st, qs, qsa)
 *   • Auth bağlantıları (CU, isAdmin, isManager)
 *   • Zaman yardımcıları (nowTs, formatDate, relativeTime)
 *   • Sayı/metin formatlama (formatMoney, initials, escapeHtml)
 *   • XSS Koruması (sanitize — DOMPurify wrapper) [YENİ v8.2.0]
 *   • Güvenli ID üretimi (generateId) [YENİ v8.2.0]
 *   • Güvenli veri erişimi (safeGet)
 *   • UI yardımcıları (toast, openMo, closeMo, addNotif)
 *   • Debounce / throttle
 *
 * Yükleme sırası: database.js ve auth.js'den SONRA, modüllerden ÖNCE
 *
 * Anayasa Kural 02 — XSS: kullanıcı verisi sanitize() ile sarılır
 * Anayasa Kural 03 — ID: Date.now() yerine generateId() kullanılır
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
/** @returns {boolean} */
window.isAdmin = () => window.Auth?.getCU?.()?.role === 'admin';
/** @returns {boolean} */
const isManager = () => ['admin','manager','asistan'].includes(window.Auth?.getCU?.()?.role);

// ── Zaman Yardımcıları ────────────────────────────────────────────
// CORE-NOWTS-ISO-001: ISO 8601 UTC format (Safari parse uyumlu)
// Eski boşluklu kayıtlar odemeler.js replace(' ','T') fix'i ile okunur.
const _p = n => String(n).padStart(2, '0');
/* SAAT-FIX-001: UTC → İstanbul (+3) merkezi fonksiyon */
const _istNow = () => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.getUTCFullYear() + '-' + _p(d.getUTCMonth()+1) + '-' + _p(d.getUTCDate())
    + ' ' + _p(d.getUTCHours()) + ':' + _p(d.getUTCMinutes()) + ':' + _p(d.getUTCSeconds());
};
const _nowTs = () => new Date().toISOString().slice(0, 19) + 'Z';
const nowTs = _nowTs;
window._istNow = _istNow;

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
 * Temel XSS önleme — innerHTML'e yazılacak kullanıcı girdisini temizle.
 * DOMPurify yüklüyse onu kullanır, yoksa manuel escape yapar.
 * Anayasa Kural 02 — kullanıcı verisi her zaman escapeHtml veya sanitize ile sarılır.
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

// XSS-ESC-001: window._esc kisayolu — modullerin innerHTML icine kullanici verisi yazarken kullanmasi icin
window._esc = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };

// ════════════════════════════════════════════════════════════════
// XSS KORUMA — DOMPurify Wrapper  [YENİ v8.2.0]
// Anayasa Kural 02 — Stored XSS önleme
//
// Kullanım:
//   // ESKİ (güvensiz):
//   el.innerHTML = `<b>${task.title}</b>`;
//
//   // YENİ (güvenli):
//   el.innerHTML = sanitize(`<b>${task.title}</b>`);
//   // veya sadece metin için:
//   el.innerHTML = `<b>${sanitizeText(task.title)}</b>`;
//
// DOMPurify CDN (index.html'e firebase.js'den ÖNCE ekleyin):
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.5/purify.min.js" integrity="sha512-..." crossorigin="anonymous"></script>
// ════════════════════════════════════════════════════════════════

/**
 * HTML string'ini XSS saldırılarına karşı temizler.
 * DOMPurify yüklüyse kullanır, değilse escapeHtml ile fallback yapar.
 *
 * @param {string} dirty     Temizlenecek HTML string
 * @param {Object} [opts]    DOMPurify config (opsiyonel)
 * @param {string[]} [opts.ALLOWED_TAGS]    İzin verilen HTML etiketleri
 * @param {string[]} [opts.ALLOWED_ATTR]    İzin verilen HTML nitelikleri
 * @returns {string}         Temizlenmiş güvenli HTML
 *
 * @example
 * // Kullanıcı girdisi içeren template literal
 * element.innerHTML = sanitize(`<b>${task.title}</b> — ${task.desc}`);
 *
 * // Sadece belirli etiketlere izin ver
 * element.innerHTML = sanitize(userHtml, { ALLOWED_TAGS: ['b','i','u','br'] });
 */
const sanitize = (dirty, opts = {}) => {
  if (dirty === null || dirty === undefined) return '';
  const str = String(dirty);

  // DOMPurify yüklüyse kullan (önerilen)
  if (typeof window !== 'undefined' && window.DOMPurify) {
    const defaultOpts = {
      ALLOWED_TAGS: [
        'b','strong','i','em','u','s','br','p','span','div',
        'ul','ol','li','h1','h2','h3','h4','h5','h6',
        'a','code','pre','blockquote','table','thead','tbody','tr','td','th',
      ],
      ALLOWED_ATTR: ['href','target','rel','class','style','title','data-*'],
      ALLOW_DATA_ATTR: true,
      FORCE_BODY: false,
    };
    return window.DOMPurify.sanitize(str, { ...defaultOpts, ...opts });
  }

  // DOMPurify yok — konsola uyarı ver, escapeHtml ile güvenli fallback
  if (!window._domPurifyWarned) {
    console.warn(
      '[Utils] DOMPurify yüklü değil — XSS koruması sınırlı!\n' +
      'index.html\'e şunu ekleyin:\n' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.5/purify.min.js" crossorigin="anonymous"></script>'
    );
    window._domPurifyWarned = true;
  }
  return escapeHtml(str);
};

/**
 * Düz metin olarak güvenli HTML çıktısı — tüm etiketleri kaçırır.
 * Kullanım: innerHTML'e sadece metin yazarken.
 *
 * @param {string} str
 * @returns {string}
 *
 * @example
 * element.innerHTML = `<span>${sanitizeText(user.name)}</span>`;
 */
const sanitizeText = (str) => escapeHtml(String(str ?? ''));

/**
 * URL'yi XSS'e karşı doğrular.
 * javascript:, data: gibi tehlikeli protokolleri engeller.
 *
 * @param {string} url
 * @returns {string} Güvenli URL veya '#'
 *
 * @example
 * linkEl.href = sanitizeUrl(task.link);
 */
const sanitizeUrl = (url) => {
  if (!url) return '#';
  const str = String(url).trim().toLowerCase();
  if (str.startsWith('javascript:') || str.startsWith('data:') || str.startsWith('vbscript:')) {
    console.warn('[Utils] Güvensiz URL engellendi:', url);
    return '#';
  }
  return url;
};

// ════════════════════════════════════════════════════════════════
// GÜVENLİ ID ÜRETİMİ  [YENİ v8.2.0]
// Anayasa Kural 02 — Date.now() eşzamanlı çakışma riski önleme
// ════════════════════════════════════════════════════════════════

/**
 * Çakışmaya dayanıklı benzersiz ID üretir.
 * crypto.randomUUID() → uuid v4 (modern tarayıcılar)
 * Fallback: Date.now() + Math.random() kombinasyonu
 *
 * @returns {string|number}
 *   - string: crypto.randomUUID() mevcut ise uuid v4 formatında
 *   - number: fallback durumunda sayısal ID
 *
 * @example
 * // ESKİ (çakışma riski):
 * const entry = { id: Date.now(), title: '...' };
 *
 * // YENİ (güvenli):
 * const entry = { id: generateId(), title: '...' };
 */
const generateId = () => {
  // crypto.randomUUID — modern tarayıcılar ve Node 14.17+
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // crypto.getRandomValues fallback — eski tarayıcılar
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return arr[0] * 0x100000000 + arr[1];
  }
  // Son çare: timestamp + random (test/SSR ortamı)
  return Date.now() + Math.floor(Math.random() * 1000000);
};

/**
 * Numerik ID üretir — localStorage şemalarıyla backward-compatible.
 * Yeni kayıtlar için generateId() tercih edilir.
 * @returns {number}
 */
const generateNumericId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    // 32-bit pozitif tam sayı — mevcut id: number şemalarıyla uyumlu
    return arr[0];
  }
  return Date.now() + Math.floor(Math.random() * 9999);
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
            <div style="font-size:15px;font-weight:600;margin-bottom:8px">${sanitizeText(panelName)} paneli yüklenemedi</div>
            <div style="font-size:12px;color:var(--t3);margin-bottom:16px">${sanitizeText(err?.message || 'Beklenmedik hata')}</div>
            <button class="btn btns" onclick="window.App?.nav?.('${sanitizeText(panelName.toLowerCase())}')">
              🔄 Yeniden Dene
            </button>
          </div>`;
      }
      if (typeof window.toast === 'function') window.toast(`${panelName} yüklenemedi`, 'err');
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
  isAdmin, isManager,
  nowTs, relativeTime, formatDate,
  formatMoney, initials,
  // XSS Koruma [v8.2.0]
  escapeHtml, sanitize, sanitizeText, sanitizeUrl,
  // ID Üretimi [v8.2.0]
  generateId, generateNumericId,
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
    // YENİ v8.2.0
    sanitize, sanitizeText, sanitizeUrl,
    generateId, generateNumericId,
    // Mevcut
    relativeTime, formatDate, formatMoney,
    avatarColor, AV_COLORS,
    debounce, throttle, safeGet, groupBy,
    showSkeleton, withErrorBoundary,
    nowTsUtil: nowTs,
    nowTs: nowTs,
  });
}

// ── Virtual Scroll ────────────────────────────────────────────────
/**
 * Büyük listeler için virtual scroll.
 * Sadece görünür satırları DOM'a yazar — 1000+ kayıtta performans.
 *
 * @param {HTMLElement} container
 * @param {Array}       items
 * @param {Function}    renderRow  — (item, index) → HTMLElement
 * @param {Object}      [opts]
 * @param {number}      [opts.rowHeight=52]
 * @param {number}      [opts.buffer=5]
 * @param {number}      [opts.threshold=100]
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

    if (items.length < threshold) {
      const frag = document.createDocumentFragment();
      items.forEach((item, i) => frag.appendChild(this.renderRow(item, i)));
      container.replaceChildren(frag);
      return;
    }

    const totalH = items.length * rowHeight;

    container.style.position   = 'relative';
    container.style.overflow   = 'auto';
    container.style.height     = Math.min(totalH, window.innerHeight * 0.7) + 'px';

    let inner = container.querySelector('._vl_inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = '_vl_inner';
      inner.style.position = 'relative';
      container.appendChild(inner);
    }
    inner.style.height = totalH + 'px';

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

    if (this._scrollFn) container.removeEventListener('scroll', this._scrollFn);
    this._scrollFn = debounce(_paint, 16);
    container.addEventListener('scroll', this._scrollFn, { passive: true });

    _paint();
  }

  update(newItems) {
    this.items = newItems;
    this.render();
  }

  destroy() {
    if (this._scrollFn && this.container) {
      this.container.removeEventListener('scroll', this._scrollFn);
    }
  }
}

if (typeof window !== 'undefined') {
  window.VirtualList = VirtualList;
  window.Utils = window.Utils || {};
  window.Utils.VirtualList = VirtualList;
}

})();

// ── Global Kısayollar (modül uyumluluğu için) ─────────────────────
window.g  = window.g  || (id => document.getElementById(id));
window.st = window.st || ((id, show) => {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
});
window.qs  = window.qs  || ((sel, ctx) => (ctx||document).querySelector(sel));
window.qsa = window.qsa || ((sel, ctx) => [...(ctx||document).querySelectorAll(sel)]);

// ════════════════════════════════════════════════════════════════
// KULLANICI YETKİ SİSTEMİ — TEK MERKEZ v2.0
// PERM-UNIFY-001
//
// Öncelik: USER OVERRIDE > ROLE
//   1. Kullanıcıya özel yetki varsa → o kullanılır (rol yok sayılır)
//   2. Kullanıcıya özel yetki yoksa → rol varsayılanı kullanılır
//
// Seviyeler:
//   'full'   — Tam yetki (admin varsayılanı)
//   'manage' — Düzenleyebilir ama silme onaya düşer
//   'view'   — Sadece okuma, hiçbir değişiklik yapamaz
//   'count'  — Sadece kayıt sayısını görür, içeriği göremez
//   'none'   — Erişim yok → 'count' olarak işlenir
//
// Güvenlik kuralları:
//   - Double permission uygulanamaz (tek karar noktası)
//   - Undefined/null permission execution engellenir
//   - Geçersiz değer → role default'a düşer + console.warn
//   - Her kontrol loglanır: userId / permission / source
//
// 12 Saat Kuralı:
//   Kayıt oluşturulduktan 12 saat sonra güncelleme onay gerektirir.
//   Admin'ler muaf. user.rule12h = true ile etkinleştirilir.
// ════════════════════════════════════════════════════════════════

const PERM_LEVELS = { full: 4, manage: 3, view: 2, count: 1 };
const ROLE_PERM_DEFAULTS = {
  admin:   'full',
  manager: 'manage',
  lead:    'view',
  staff:   'view',
};
const _VALID_PERM_VALUES = new Set(['full', 'manage', 'view', 'count', 'none']);

/** @private — yetki kontrol log kuyruğu (max 200 kayıt, bellek-güvenli) */
const _PERM_LOG = [];

/**
 * @private — Her yetki kontrolünü loglar.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} resolvedLevel — Sonuç seviyesi
 * @param {'USER'|'ROLE'} source — Kararın kaynağı
 */
function _logPermCheck(userId, moduleId, resolvedLevel, source) {
  _PERM_LOG.push({
    ts:         new Date().toISOString(),
    userId:     userId,
    permission: moduleId,
    level:      resolvedLevel,
    source:     source,
  });
  if (_PERM_LOG.length > 200) _PERM_LOG.shift();
}

/**
 * TEK YETKİ KONTROL MERKEZİ — Öncelik: USER OVERRIDE > ROLE
 *
 * Tüm modüller bu fonksiyonu kullanır; başka yerden yetki kararı alınamaz.
 *
 * @param {string} moduleId — Modül adı (pusula, odemeler, crm vb.)
 * @returns {'full'|'manage'|'view'|'count'}
 */
function getPermLevel(moduleId) {
  // GUARD: moduleId zorunlu ve string olmalı
  if (!moduleId || typeof moduleId !== 'string') {
    console.warn('[Perm] getPermLevel: geçersiz moduleId →', moduleId);
    return 'count';
  }

  const cu = window.Auth?.getCU?.();

  // GUARD: oturum yok → en kısıtlı seviye
  if (!cu || !cu.id) return 'count';

  // Admin her zaman full (role check'e gerek yok)
  if (cu.role === 'admin') {
    _logPermCheck(cu.id, moduleId, 'full', 'ROLE');
    return 'full';
  }

  // ── USER OVERRIDE ────────────────────────────────────────────
  // Kullanıcıya özel yetki varsa → rol YOK SAYILIR
  const userPerms = cu.permissions;
  if (userPerms !== null && userPerms !== undefined && typeof userPerms === 'object') {
    const rawLevel = userPerms[moduleId];
    if (rawLevel !== undefined && rawLevel !== null) {
      // GUARD: geçerli bir değer mi?
      if (!_VALID_PERM_VALUES.has(rawLevel)) {
        console.warn('[Perm] Geçersiz user permission değeri "' + rawLevel + '" (modül: ' + moduleId + ') — role default kullanılıyor');
      } else {
        // 'none' → erişim yok → 'count' olarak döndür
        const resolved = rawLevel === 'none' ? 'count' : rawLevel;
        _logPermCheck(cu.id, moduleId, resolved, 'USER');
        return resolved;
      }
    }
  }

  // ── ROLE DEFAULT ─────────────────────────────────────────────
  // Kullanıcıya özel yetki yok → rol varsayılanı
  const roleLevel = ROLE_PERM_DEFAULTS[cu.role] || 'view';
  // GUARD: role seviyesi PERM_LEVELS'de tanımlı olmalı
  const safeLevel = PERM_LEVELS[roleLevel] ? roleLevel : 'view';
  _logPermCheck(cu.id, moduleId, safeLevel, 'ROLE');
  return safeLevel;
}

/**
 * Kullanıcının belirli modülde belirli bir aksiyona yetkisi var mı kontrol eder.
 * @param {string} moduleId — Modül adı
 * @param {'read'|'edit'|'delete'|'count'} action — İstenen aksiyon
 * @returns {boolean}
 */
function canAction(moduleId, action) {
  // GUARD: action zorunlu
  if (!action) return false;
  const level = getPermLevel(moduleId);
  const lvl   = PERM_LEVELS[level] || 0;
  switch (action) {
    case 'count':  return lvl >= 1;
    case 'read':   return lvl >= 2;
    case 'edit':   return lvl >= 3;
    case 'delete': return lvl >= 4;
    default:       return lvl >= 2;
  }
}

/**
 * 12 saat kuralını kontrol eder.
 * Kayıt oluşturulduktan 12 saat geçtiyse güncelleme onay gerektirir.
 * @param {Object} record — Kontrol edilecek kayıt ({ createdAt })
 * @returns {{needsApproval:boolean, hoursAgo:number}}
 */
function check12hRule(record) {
  const cu = window.Auth?.getCU?.();
  if (!cu || cu.role === 'admin') return { needsApproval: false, hoursAgo: 0 };
  if (!cu.rule12h) return { needsApproval: false, hoursAgo: 0 };
  const created = record?.createdAt;
  if (!created) return { needsApproval: false, hoursAgo: 0 };
  const createdMs = new Date(created.replace(' ', 'T')).getTime();
  if (isNaN(createdMs)) return { needsApproval: false, hoursAgo: 0 };
  const hoursAgo = (Date.now() - createdMs) / 3600000;
  return { needsApproval: hoursAgo >= 12, hoursAgo: Math.floor(hoursAgo) };
}

/**
 * Yetki yetersizliğinde toast gösterir, false döndürür.
 * @param {string} moduleId
 * @param {'read'|'edit'|'delete'|'count'} action
 * @returns {boolean} — true: izin var, false: izin yok
 */
function requireAction(moduleId, action) {
  if (canAction(moduleId, action)) return true;
  const msgs = {
    count:  'Bu modüle erişim izniniz yok',
    read:   'Bu bölümü görüntüleme yetkiniz yok — sadece kayıt sayısı gösterilir',
    edit:   'Bu bölümde düzenleme yetkiniz yok — sadece görüntüleyebilirsiniz',
    delete: 'Silme işlemi için yönetici onayı gerekiyor',
  };
  window.toast?.(msgs[action] || 'Yetki yetersiz', 'err');
  return false;
}

/**
 * Yetki kontrol log geçmişini döndürür (Sistem → Sağlık Monitörü / debug).
 * @returns {Array<{ts, userId, permission, level, source}>}
 */
function getPermLog() { return _PERM_LOG.slice(); }

window.PERM_LEVELS        = PERM_LEVELS;
window.ROLE_PERM_DEFAULTS = ROLE_PERM_DEFAULTS;
window.getPermLevel       = getPermLevel;
window.canAction          = canAction;
window.check12hRule       = check12hRule;
window.requireAction      = requireAction;
window.getPermLog         = getPermLog;

window._skeletonRows = function(n, kolonSayisi) {
  var cols = kolonSayisi || 4;
  var satir = '<tr style="border-bottom:0.5px solid var(--b)">';
  for (var c = 0; c < cols; c++) {
    var genislik = (c === 0 ? 120 : c === 1 ? 80 : 60) + Math.floor(Math.random() * 40);
    satir += '<td style="padding:6px 8px"><div style="height:10px;width:' + genislik + 'px;background:linear-gradient(90deg,var(--s2) 25%,var(--b) 50%,var(--s2) 75%);background-size:200% 100%;animation:skeleton-pulse 1.2s ease-in-out infinite;border-radius:3px"></div></td>';
  }
  satir += '</tr>';
  var html = '';
  for (var i = 0; i < (n || 5); i++) html += satir;
  return html;
};

window._loadingOverlay = function(el, goster) {
  if (!el) return;
  if (goster) {
    if (el.querySelector('[data-loading-overlay]')) return;
    var overlay = document.createElement('div');
    overlay.setAttribute('data-loading-overlay', '1');
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;z-index:10;border-radius:inherit';
    overlay.innerHTML = '<div style="width:18px;height:18px;border:2px solid var(--b);border-top-color:var(--t);border-radius:50%;animation:skeleton-pulse 0.7s linear infinite"></div>';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(overlay);
  } else {
    var existing = el.querySelector('[data-loading-overlay]');
    if (existing) existing.remove();
  }
};

/* ── UX-09: Silme sonrası Geri Al toast ── */
window._undoToast = function(mesaj, geriAlFn, sure) {
  sure = sure || 5000;
  var toastId = 'undo-toast-' + Date.now();
  var div = document.createElement('div');
  div.id = toastId;
  div.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
  div.innerHTML = '<span>' + mesaj + '</span>'
    + '<button onclick="document.getElementById(\'' + toastId + '\').remove();window._undoToastCallbacks[\'' + toastId + '\'] && window._undoToastCallbacks[\'' + toastId + '\']()" '
    + 'style="background:#fff;color:#111;border:none;border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-weight:500">Geri Al</button>';
  window._undoToastCallbacks = window._undoToastCallbacks || {};
  window._undoToastCallbacks[toastId] = geriAlFn;
  document.body.appendChild(div);
  setTimeout(function() {
    var el = document.getElementById(toastId);
    if (el) el.remove();
    delete window._undoToastCallbacks[toastId];
  }, sure);
};

/* ── UX-12: Toast süre standardı ── */
window._toastSure = { ok: 3000, info: 3000, warn: 5000, err: 8000 };

/* ── UX-14: Boş durum ekranı ── */
window._emptyState = function(mesaj, aksiyon, aksiyonFn) {
  var btn = aksiyon && aksiyonFn
    ? '<button onclick="event.stopPropagation();(' + aksiyonFn.toString() + ')()" style="margin-top:12px;font-size:11px;padding:6px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t);font-family:inherit">' + aksiyon + '</button>'
    : '';
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;color:var(--t3)">'
    + '<div style="font-size:28px;margin-bottom:8px">📭</div>'
    + '<div style="font-size:12px;font-weight:500;color:var(--t2)">' + mesaj + '</div>'
    + btn
    + '</div>';
};

window._btnGuard = function(btn, fn, ms) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  var orig = btn.innerHTML;
  btn.innerHTML = '<span style="opacity:.6">' + orig + '</span>';
  var done = false;
  function _restore() {
    if (done) return; done = true;
    btn.disabled = false;
    btn.innerHTML = orig;
  }
  try {
    var result = fn();
    if (result && typeof result.then === 'function') {
      result.then(_restore).catch(function(e){ _restore(); throw e; });
    } else {
      setTimeout(_restore, ms || 1500);
    }
  } catch(e) { _restore(); throw e; }
};

/* PDF-HARMONIZE-001: Tek truth source — V2 form (gecerlilik/teslim/odeme)
   + inline form (gecerlilikTarihi/teslimSekli/odemeKosulu) şema fallback
   + cari lookup. Paylaşımlı: app_patch.js + satin_alma_v2_pi.js kullanır. */
window._pdfTeklifNormalize = function(t) {
  if (!t) return null;
  var cari = {};
  if (window.loadCari) {
    var cariler = window.loadCari() || [];
    var key_kod = String(t.musteriKod || t.musteriCid || '').trim();
    var key_id = String(t.musteriId || '').trim();
    var key_ad = String(t.musteri || t.musteriAd || '').trim();
    cari = cariler.find(function(c){
      return key_id && String(c.id || '') === key_id;
    }) || cariler.find(function(c){
      return key_kod && String(c.kod || '').trim() === key_kod;
    }) || cariler.find(function(c){
      return key_ad && (String(c.unvan || '').trim() === key_ad || String(c.name || '').trim() === key_ad);
    }) || {};
  }
  return {
    teklifNo: t.teklifNo || t.teklifId || t.id || '',
    revNo: String(t.revNo || '01').padStart(2, '0'),
    teklifTarih: t.createdAt || t.tarih || t.ts || '',
    musteri: cari.unvan || cari.name || t.musteri || t.musteriAd || '',
    musteriKod: t.musteriKod || cari.kod || '',
    musteriAdres: cari.adres || cari.address || cari.adres1 || cari.address1 || '',
    musteriVergiNo: cari.vergiNo || cari.taxNo || cari.vkn || '',
    musteriTelefon: cari.telefon || cari.phone || cari.tel || cari.gsm || '',
    gecerlilik: (function(){
      if (t.gecerlilik) return t.gecerlilik;
      if (t.gecerlilikTarihi) return t.gecerlilikTarihi;
      var d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0,10);
    })(),
    teslim:     t.teslim     || t.teslimSekli     || 'FOB Istanbul',
    odeme:      t.odeme      || t.odemeKosulu     || '35% advance, 65% before shipment',
    sartlar: Array.isArray(t.sartlar) ? t.sartlar : [],
    genelToplam: t.genelToplam || t.toplamSatis || 0,
    paraBirimi:  t.paraBirimi  || 'USD',
    urunler: t.urunler || [],
    saticiNotu: t.saticiNotu || ''
  };
};

/* FEAT-07e: Kripto sipariş numarası (ORD-XXXXXXXX) */
window._ordKodUret = function() {
  var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // I, O, 0, 1 yok (görsel karışıklık)
  var len = 8;
  var attempts = 0;

  while (attempts < 10) {
    var buf = new Uint8Array(len);
    crypto.getRandomValues(buf);
    var code = '';
    for (var i = 0; i < len; i++) {
      code += chars[buf[i] % chars.length];
    }
    var ord = 'ORD-' + code;

    /* Collision check (1 trilyon olasılık ama yine de) */
    var teklifler = (window.loadSatisTeklifleri && window.loadSatisTeklifleri()) || [];
    var collision = teklifler.some(function(t) { return t.ordNo === ord; });
    if (!collision) return ord;
    attempts++;
  }

  /* Fallback (asla buraya gelmez ama defensive) */
  return 'ORD-' + Date.now().toString(36).toUpperCase().slice(-8);
};

/* FEAT-07e: Yönetici mi (admin + manager)? */
window._ordYoneticiMi = function() {
  var role = (window.Auth && window.Auth.getCU && window.Auth.getCU() || {}).role
          || (window.CU && window.CU() || {}).role;
  return role === 'admin' || role === 'manager';
};

/* PI-BANKA-001: Para birimi → banka listesi
   Source: window.IBAN_DATA (platform_standartlari.js).
   Yapı: [{ banka, sube, TL, USD, EUR }] → flat [{ banka, sube, iban, swift, hesapSahibi, paraBirimi }] */
window._pdfBankaListesi = function(paraBirimi) {
  var pb = String(paraBirimi || 'USD').toUpperCase();
  if (pb === 'TRY') pb = 'TL';
  if (pb === 'GBP' || pb === 'CNY') pb = 'USD'; /* fallback */
  var IBAN_DATA = window.IBAN_DATA || [];
  var fallback = {
    banka: 'Albaraka Türk',
    sube: 'Alibeyköy/117',
    iban: pb === 'TL'  ? 'TR54 0020 3000 0889 5310 0000 05'
        : pb === 'EUR' ? 'TR97 0020 3000 0889 5310 0000 07'
        :                'TR27 0020 3000 0889 5310 0000 06',
    swift: 'BTFHTRIS',
    hesapSahibi: (window.PI_ADRES?.unvanTR || 'Duay Uluslararası Ticaret Ltd. Şti.'),
    paraBirimi: pb
  };
  if (!IBAN_DATA.length) return [fallback];
  var sonuc = IBAN_DATA.map(function(item) {
    return {
      banka: item.banka || '',
      sube: item.sube || '',
      iban: item[pb] || item.USD || '',
      swift: item.swift || 'BTFHTRIS',
      hesapSahibi: item.hesapSahibi || (window.PI_ADRES?.unvanTR || 'Duay Uluslararası Ticaret Ltd. Şti.'),
      paraBirimi: pb
    };
  }).filter(function(b){ return b.iban; });
  return sonuc.length ? sonuc : [fallback];
};

/* PI-BANKA-001: HTML üretici — Format D D1+D2 için
   CLAUDE-KURAL-PI-001 madde 2: Tek banka (sadece para birimine ait) — çoklu banka liste YASAK */
window._pdfBankaHtmlListe = function(paraBirimi) {
  var bankalar = window._pdfBankaListesi(paraBirimi);
  if (!bankalar.length) return '<div style="font-size:10px;color:#86868b">Banking details unavailable</div>';
  var b = bankalar[0]; /* Sadece ilk (ana) banka */
  var esc = window._esc || function(s){ return String(s||''); };
  var pb = String(paraBirimi || 'USD').toUpperCase();
  if (pb === 'TRY') pb = 'TL';
  var html = '<div style="font-size:10px;color:#4a4a4f;line-height:1.6">';
  html += '<div style="font-weight:600;color:#1d1d1f;margin-bottom:3px">'
    + esc(b.banka) + (b.sube ? ' — ' + esc(b.sube) : '') + '</div>';
  html += '<div>Account Holder: ' + esc(b.hesapSahibi || '') + '</div>';
  html += '<div>IBAN (' + esc(pb) + '): ' + esc(b.iban || '') + '</div>';
  if (b.swift) html += '<div>SWIFT: ' + esc(b.swift) + '</div>';
  html += '</div>';
  return html;
};

/* PI-BANKA-001: Tek banka tek satır (Format A/B/C eski pattern uyumlu) */
window._pdfBankaTekSatir = function(paraBirimi) {
  var bankalar = window._pdfBankaListesi(paraBirimi);
  if (!bankalar.length) return '';
  var b = bankalar[0];
  return b.banka + (b.sube ? ' (' + b.sube + ')' : '')
    + ' · IBAN: ' + b.iban
    + (b.swift ? ' · SWIFT: ' + b.swift : '');
};

/* CLAUDE-KURAL-PI-001 madde 5: PDF ortak footer (kurumsal bilgi) — tüm formatlarda tek truth source */
window._pdfOrtakFooter = function(stil) {
  /* stil: 'kompakt' (Format B), 'tam' (Format A), 'sade' (Format C, D) */
  var p = window.PI_ADRES || {};
  var sirket = p.sirket || 'Duay Global LLC';
  var adres = p.adres || ((p.adres1 || '') + (p.adres2 ? ', ' + p.adres2 : ''));
  var tel = p.tel || '';
  var mail = p.mail || '';
  var web = p.web || 'www.duaycor.com';
  if (stil === 'kompakt') {
    return sirket + ' · ' + adres + ' · ' + tel + ' · ' + mail + ' · ' + web;
  }
  if (stil === 'sade') {
    return '<div style="font-size:9px;color:#86868b;text-align:center;line-height:1.5">'
      + sirket + ' · ' + adres + '<br/>'
      + tel + ' · ' + mail + ' · ' + web
      + '</div>';
  }
  /* tam (Format A varsayılan) */
  return '<div style="font-size:10px;color:#666;text-align:center;line-height:1.6;padding:12px;border-top:1px solid #e5e5e7;margin-top:20px">'
    + '<div style="font-weight:600;color:#1d1d1f">' + sirket + '</div>'
    + '<div>' + adres + '</div>'
    + '<div>Tel: ' + tel + ' · Email: ' + mail + '</div>'
    + '<div>Web: ' + web + '</div>'
    + '<div style="margin-top:8px;font-size:8px;color:#86868b;font-style:italic">This is a Proforma Invoice only — not a tax invoice.</div>'
    + '</div>';
};

/* CLAUDE-KURAL-PI-001 madde 1: Tarih DD MMM YYYY (en short) — tüm PDF formatlarında zorunlu */
window._pdfTarihFormat = function(d) {
  if (!d) return '';
  var date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    /* Geçersiz tarih → ilk 10 karakter ISO fallback */
    return String(d).slice(0, 10);
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  /* Çıktı: "25 Apr 2026" */
};

// [ALIS-001 START]
/**
 * ALIS-001: Tek seferlik migration — duayCode → duayKodu hizala.
 * urun_db.js eski form'undan duayCode olarak kaydedilen ürünleri duayKodu'ya kopyalar.
 * Diğer modüller (urunler.js, render.js, satis.js, app_patch.js) sadece duayKodu okuduğu
 * için bu kayıtlar listelerinde boş görünüyordu.
 *
 * Idempotent — localStorage flag (ak_migration_alis_001_done) ile bir kez çalışır.
 * @returns {{migrated:number, skipped:number, skippedReason?:string}}
 */
window._migrateDuayCodeToDuayKodu = function() {
  var migrationKey = 'ak_migration_alis_001_done';
  if (localStorage.getItem(migrationKey) === '1') {
    console.log('[ALIS-001] Migration zaten tamamlanmış');
    return { migrated: 0, skipped: 0, skippedReason: 'already-done' };
  }

  /* Auth user ready değilse Firestore yazısı yapamayız — flag SET ETME, tekrar tetiklenecek */
  var _cu = (typeof window.CU === 'function') ? window.CU() : null;
  if (!_cu || !_cu.id) {
    console.log('[ALIS-001] Auth user henüz yok, migration ertelendi');
    return { migrated: 0, skipped: 0, skippedReason: 'no-auth' };
  }

  var urunler = (typeof window.loadUrunler === 'function')
    ? window.loadUrunler({ tumKullanicilar: true, _dahilSilinenler: true })
    : [];

  if (!urunler || !urunler.length) {
    console.log('[ALIS-001] Hiç ürün yok, migration atlanıyor');
    localStorage.setItem(migrationKey, '1');
    return { migrated: 0, skipped: 0, skippedReason: 'empty' };
  }

  var migrated = 0;
  var skipped = 0;

  urunler.forEach(function(u) {
    if (u && u.duayCode && !u.duayKodu) {
      u.duayKodu = u.duayCode;
      migrated++;
    } else {
      skipped++;
    }
  });

  if (migrated > 0 && typeof window.storeUrunler === 'function') {
    window.storeUrunler(urunler);
  }

  localStorage.setItem(migrationKey, '1');

  console.log('[ALIS-001] Migration tamam: ' + migrated + ' kayıt güncellendi, ' + skipped + ' atlandı');

  if (typeof window.logActivity === 'function') {
    window.logActivity('migration', 'ALIS-001 duayCode → duayKodu: ' + migrated + ' kayıt');
  }

  return { migrated: migrated, skipped: skipped };
};
// [ALIS-001 END]

// [ALIS-002 START]
/**
 * ALIS-002: Tek seferlik migration — urunler.createdBy displayName → uid standardize.
 * Eski kayıtlarda createdBy = displayName olarak yazılmıştı (P1 cari + P3 ürün).
 * loadUsers() lookup ile displayName/email → uid eşleştirir, kayda createdById/createdByName/createdBy
 * 3'lü standart pattern uygular.
 *
 * Idempotent — localStorage flag (ak_migration_alis_002_done) ile bir kez çalışır.
 * Auth-guard — user yoksa flag SET ETMEZ, ertelenir.
 * @returns {{migrated:number, skipped:number, skippedReason?:string}}
 */
window._migrateUrunlerCreatedBy = function() {
  var migrationKey = 'ak_migration_alis_002_done';
  if (localStorage.getItem(migrationKey) === '1') {
    console.log('[ALIS-002] Migration zaten tamamlanmış');
    return { migrated: 0, skipped: 0, skippedReason: 'already-done' };
  }

  var _cu = (typeof window.CU === 'function') ? window.CU() : null;
  if (!_cu || !_cu.id) {
    console.log('[ALIS-002] Auth user henüz yok, migration ertelendi');
    return { migrated: 0, skipped: 0, skippedReason: 'no-auth' };
  }

  /* loadUsers lookup tablosu — displayName/email → uid */
  var users = (typeof window.loadUsers === 'function') ? (window.loadUsers() || []) : [];
  var nameToUid = {};
  users.forEach(function(u) {
    var uid = u.uid || u.id || '';
    if (!uid) return;
    if (u.displayName) nameToUid[u.displayName] = uid;
    if (u.name) nameToUid[u.name] = uid;
    if (u.email) nameToUid[u.email] = uid;
  });

  var urunler = (typeof window.loadUrunler === 'function')
    ? window.loadUrunler({ tumKullanicilar: true, _dahilSilinenler: true })
    : [];

  if (!urunler || !urunler.length) {
    console.log('[ALIS-002] Hiç ürün yok, migration atlanıyor');
    localStorage.setItem(migrationKey, '1');
    return { migrated: 0, skipped: 0, skippedReason: 'empty' };
  }

  var migrated = 0;
  var skipped = 0;

  urunler.forEach(function(u) {
    if (!u) { skipped++; return; }
    /* createdById zaten varsa standart yapıda — atla */
    if (u.createdById) { skipped++; return; }
    /* createdBy yoksa — eski/anonim kayıt, atla */
    if (!u.createdBy) { skipped++; return; }
    /* createdBy displayName/email görünüyorsa lookup ile uid'a çevir */
    var uidMaybe = nameToUid[u.createdBy];
    if (uidMaybe) {
      u.createdByName = u.createdBy;
      u.createdById = uidMaybe;
      u.createdBy = uidMaybe;
      migrated++;
    } else {
      /* lookup başarısız — uid olabilir veya silinmiş user. Dokunma */
      skipped++;
    }
  });

  if (migrated > 0 && typeof window.storeUrunler === 'function') {
    window.storeUrunler(urunler);
  }

  localStorage.setItem(migrationKey, '1');

  console.log('[ALIS-002] Migration tamam: ' + migrated + ' kayıt güncellendi, ' + skipped + ' atlandı');

  if (typeof window.logActivity === 'function') {
    window.logActivity('migration', 'ALIS-002 createdBy standardize: ' + migrated + ' kayıt');
  }

  return { migrated: migrated, skipped: skipped };
};
// [ALIS-002 END]

/* CLAUDE-KURAL-PI-001 madde 7: PI ön kontrol — hata önleme sistemi
   PI üretiminden önce 4 kontrol: eksik bilgi / yanlış para / Türkçe / Arapça */
window._piOnKontrol = function(t) {
  if (!t) return 'PI üretilemedi: teklif verisi yok';

  /* 1. Eksik bilgi */
  var musteri = t.musteri || t.musteriAd || '';
  if (!musteri) return 'PI üretilemedi: müşteri eksik';
  if (!t.urunler || !t.urunler.length) return 'PI üretilemedi: ürün eksik';
  if (!t.gecerlilik && !t.gecerlilikTarihi) return 'PI üretilemedi: geçerlilik tarihi eksik';

  /* 2. Para birimi */
  var gecerli = ['USD','EUR','GBP','TRY','CNY'];
  if (gecerli.indexOf(String(t.paraBirimi || '').toUpperCase()) === -1) {
    return 'Para birimi geçersiz — USD/EUR/GBP/TRY/CNY olmalı';
  }

  /* 3+4. Test edilecek alanlar */
  var alanlar = [
    { ad: 'Müşteri adı', val: musteri },
    { ad: 'Müşteri adresi', val: t.musteriAdres || '' },
    { ad: 'Teslim', val: t.teslim || '' },
    { ad: 'Ödeme', val: t.odeme || '' }
  ];
  (t.urunler || []).forEach(function(u, i) {
    alanlar.push({ ad: 'Ürün #' + (i+1) + ' adı', val: u.urunAdi || u.ad || '' });
    alanlar.push({ ad: 'Ürün #' + (i+1) + ' açıklama', val: u.aciklama || '' });
  });
  (t.sartlar || []).forEach(function(s, i) {
    alanlar.push({ ad: 'Şart #' + (i+1), val: typeof s === 'string' ? s : (s.metin || '') });
  });

  /* 3. Türkçe karakter tespiti */
  var trRegex = /[ğüşıöçĞÜŞİÖÇ]/;
  for (var i = 0; i < alanlar.length; i++) {
    if (trRegex.test(alanlar[i].val)) {
      return 'PI %100 İngilizce olmalı — Türkçe karakter: ' + alanlar[i].ad;
    }
  }

  /* 4. Arapça karakter tespiti (Unicode block U+0600-U+06FF) */
  var arRegex = /[؀-ۿ]/;
  for (var j = 0; j < alanlar.length; j++) {
    if (arRegex.test(alanlar[j].val)) {
      return 'PI %100 İngilizce olmalı — Arapça metin: ' + alanlar[j].ad;
    }
  }

  return null; /* Geçti */
};
