/**
 * Duay Global Trade Company — Operasyon Platformu
 * Dosya:        src/modules/expected_deliveries_docs.js
 * Açıklama:     Shipment Documentation alt-modülü — şema + util (K01)
 * Anayasa Ref:  K01, K02, K03, K06, K08
 * Tarih:        2026-04-30
 * Versiyon:     1.0.0 (V117 — SHIPMENT-DOC-SCHEMA-001)
 *
 * Bu cycle: Sadece sabitler + util'ler. CRUD/state machine/hook YOK.
 * Sonraki cycle: V118 SHIPMENT-DOC-CREATE-001
 */
(function() {
  'use strict';

  /* SHIPMENT-DOC-SCHEMA-001: state listesi (K03 — Object.freeze) */
  const STATES = Object.freeze(['BOS', 'TASLAK', 'HAZIR', 'ONAYLI', 'REVIEW', 'KAPALI']);

  const STATE_LABELS = Object.freeze({
    BOS: 'Boş', TASLAK: 'Taslak', HAZIR: 'Hazır',
    ONAYLI: 'Onaylı', REVIEW: 'Review', KAPALI: 'Kapalı'
  });

  /* SHIPMENT-DOC-SCHEMA-001: 4 katmanlı renk token (bg/fg badge + border hover + icon kenar şeridi) */
  const STATE_COLORS = Object.freeze({
    BOS:    Object.freeze({ bg: '#F1EFE8', fg: '#5F5E5A', border: 'rgba(95,94,90,0.4)',  icon: '#888780' }),
    TASLAK: Object.freeze({ bg: '#E6F1FB', fg: '#0C447C', border: 'rgba(12,68,124,0.4)', icon: '#185FA5' }),
    HAZIR:  Object.freeze({ bg: '#FAEEDA', fg: '#854F0B', border: 'rgba(133,79,11,0.4)', icon: '#BA7517' }),
    ONAYLI: Object.freeze({ bg: '#EAF3DE', fg: '#27500A', border: 'rgba(39,80,10,0.4)',  icon: '#3B6D11' }),
    REVIEW: Object.freeze({ bg: '#FCEBEB', fg: '#A32D2D', border: 'rgba(163,45,45,0.4)', icon: '#A32D2D' }),
    KAPALI: Object.freeze({ bg: '#F1EFE8', fg: '#2C2C2A', border: 'rgba(44,44,42,0.4)',  icon: '#2C2C2A' })
  });

  /* SHIPMENT-DOC-SCHEMA-001: kritik alanlar — değişince REVIEW state (sonraki cycle) */
  const KRITIK_ALANLAR = Object.freeze([
    'yuk.brutKg',
    'yuk.netKg',
    'yuk.imo',
    'yuk.unNo',
    'paket.tip',
    'paket.adet',
    'yerlesim.konteynerNo'
  ]);

  /* SHIPMENT-DOC-SCHEMA-001: zorunlu belgeler — eksikse HAZIR state'ine geçemez */
  const ZORUNLU_BELGELER = Object.freeze(['irsaliye', 'kantar']);

  /* SHIPMENT-DOC-SCHEMA-001: çoklu dosya slot'ları (push/array, diğerleri tekil) */
  const MULTI_SLOTS = Object.freeze(['soforFotos', 'yuklemeFotos', 'ekBelgeler']);

  /* SHIPMENT-DOC-SCHEMA-001: belge slot meta — UI cycle'larında ikon/etiket/MIME (Object.freeze nested) */
  const BELGE_META = Object.freeze({
    irsaliye:      Object.freeze({ icon: '📋', label: 'İrsaliye',             mimes: Object.freeze(['pdf','jpg','png']),                multi: false, zorunlu: true  }),
    kantar:        Object.freeze({ icon: '⚖️', label: 'Kantar fişi',          mimes: Object.freeze(['pdf','jpg','png']),                multi: false, zorunlu: true  }),
    teslimImza:    Object.freeze({ icon: '✍️', label: 'Teslim imzası',        mimes: Object.freeze(['pdf','jpg','png']),                multi: false, zorunlu: false }),
    soforFotos:    Object.freeze({ icon: '📷', label: 'Şoför fotoğrafları',   mimes: Object.freeze(['jpg','png']),                      multi: true,  zorunlu: false }),
    yuklemeFotos:  Object.freeze({ icon: '📦', label: 'Yükleme fotoğrafları', mimes: Object.freeze(['jpg','png']),                      multi: true,  zorunlu: false }),
    nakliyeFatura: Object.freeze({ icon: '🚚', label: 'Nakliye faturası',     mimes: Object.freeze(['pdf']),                            multi: false, zorunlu: false }),
    saticiFatura:  Object.freeze({ icon: '🧾', label: 'Satıcı faturası',      mimes: Object.freeze(['pdf']),                            multi: false, zorunlu: false }),
    imoForm:       Object.freeze({ icon: '⚠️', label: 'IMO/DGD formu',        mimes: Object.freeze(['pdf']),                            multi: false, zorunlu: false }),
    ekBelgeler:    Object.freeze({ icon: '📎', label: 'Ek belgeler',          mimes: Object.freeze(['pdf','jpg','png','xlsx','docx']), multi: true,  zorunlu: false })
  });

  /**
   * Mevcut zaman ISO string olarak döner.
   * @returns {string} ISO 8601 timestamp
   */
  function _now() { return new Date().toISOString(); }

  /**
   * Mevcut kullanıcı objesi (CU) — Auth.getCU() reuse.
   * @returns {Object} cu objesi veya boş obje
   */
  function _cu() { return (typeof window.CU === 'function' ? window.CU() : null) || {}; }

  /**
   * Mevcut kullanıcı id'si.
   * @returns {string} uid veya 'bilinmiyor'
   */
  function _cuId() { const u = _cu(); return u.id || u.uid || 'bilinmiyor'; }

  /**
   * Mevcut kullanıcı adı (audit log için, sonraki cycle).
   * @returns {string} ad veya 'Bilinmiyor'
   */
  function _cuName() { const u = _cu(); return u.name || u.displayName || 'Bilinmiyor'; }

  /**
   * Admin yetki kontrolü (K02 — RBAC: super_admin / admin).
   * @returns {boolean}
   */
  function _isAdmin() {
    if (typeof window.isAdmin === 'function') return !!window.isAdmin();
    const r = _cu().role || _cu().rol;
    return r === 'admin' || r === 'super_admin';
  }

  /**
   * Manager+ yetki kontrolü (K02 — admin / super_admin / manager).
   * @returns {boolean}
   */
  function _isManager() {
    const r = _cu().role || _cu().rol;
    return r === 'admin' || r === 'super_admin' || r === 'manager';
  }

  /**
   * Nested path get — "yuk.brutKg" gibi dotted path ile değer okur.
   * @param {Object} obj kök obje
   * @param {string} path "a.b.c" formatı
   * @returns {*} değer veya undefined
   */
  function _getPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /**
   * Nested path set — yoksa ara obje'leri oluşturur.
   * @param {Object} obj kök obje
   * @param {string} path "a.b.c" formatı
   * @param {*} value yeni değer
   */
  function _setPath(obj, path, value) {
    if (!obj || !path) return;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  /* SHIPMENT-DOC-SCHEMA-001: Window expose — read-only getter'lar (UI cycle'ları kullanacak) */

  /** UI için state label döner. @param {string} state @returns {string} */
  window._shipmentDocStateLabel = function(state) { return STATE_LABELS[state] || state || '—'; };

  /** UI için state rengi döner (bg/fg/border/icon). @param {string} state @returns {Object} */
  window._shipmentDocStateColor = function(state) { return STATE_COLORS[state] || STATE_COLORS.BOS; };

  /** Kritik alan listesi (kopya, mutate edilemez). @returns {Array<string>} */
  window._shipmentDocKritikAlanlar = function() { return KRITIK_ALANLAR.slice(); };

  /** Zorunlu belge listesi (kopya). @returns {Array<string>} */
  window._shipmentDocZorunluBelgeler = function() { return ZORUNLU_BELGELER.slice(); };

  /** Belge slot meta (icon/label/mimes/multi/zorunlu). @param {string} slot @returns {Object|null} */
  window._shipmentDocBelgeMeta = function(slot) { return BELGE_META[slot] || null; };

  /* SHIPMENT-DOC-SCHEMA-001: Internal util'leri _shipmentDocUtil namespace'e koy (sonraki cycle'lar reuse) */
  window._shipmentDocUtil = Object.freeze({
    now: _now,
    cuId: _cuId,
    cuName: _cuName,
    isAdmin: _isAdmin,
    isManager: _isManager,
    getPath: _getPath,
    setPath: _setPath,
    STATES: STATES,
    KRITIK_ALANLAR: KRITIK_ALANLAR,
    ZORUNLU_BELGELER: ZORUNLU_BELGELER,
    MULTI_SLOTS: MULTI_SLOTS,
    BELGE_META: BELGE_META
  });

  /* SHIPMENT-DOC-CREATE-001: ED list erişimi — mevcut DB API reuse (database.js L2335-2336) */
  function _edListRaw() {
    return (typeof window.loadExpectedDeliveries === 'function'
      ? window.loadExpectedDeliveries({ raw: true })
      : []) || [];
  }

  function _edListStore(list) {
    if (typeof window.storeExpectedDeliveries === 'function') {
      window.storeExpectedDeliveries(list);
    }
  }

  function _edFindIdx(list, edId) {
    if (!Array.isArray(list) || !edId) return -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === edId) return i;
    }
    return -1;
  }

  /* SHIPMENT-DOC-CREATE-001: boş shipmentDoc şablon builder (K03 — şema tek kaynak) */
  function _createEmptyDoc(ownerId) {
    return {
      state: 'BOS',
      ownerId: ownerId || _cuId(),
      createdAt: _now(),
      updatedAt: _now(),
      closedAt: null,
      belgeler: {
        irsaliye: null, kantar: null, teslimImza: null,
        soforFotos: [], yuklemeFotos: [],
        nakliyeFatura: null, saticiFatura: null, imoForm: null,
        ekBelgeler: []
      },
      yuk: { brutKg: 0, netKg: 0, m3: 0, tip: 'kati', imo: false, unNo: '', imdgSinif: '' },
      paket: {
        tip: 'palet', adet: 0, olcuModu: '3d',
        en: 0, boy: 0, yukseklik: 0, uzunluk: 0, cap: 0,
        agirlikDagilimi: ''
      },
      yerlesim: { konteynerNo: '', sira: 0, katman: 0, not: '' },
      paydaslar: { sofor: null, satici: null, alici: null, forwarder: null },
      history: [],
      pendingApprovals: [],
      reviewRequired: false
    };
  }

  /**
   * ED için yeni shipmentDoc oluştur (idempotent — zaten varsa fail döner).
   * @param {string} edId hedef ED kayıt id'si
   * @param {string} [ownerId] sahip uid (yoksa ED.responsibleUserId veya CU)
   * @returns {{success: boolean, sd?: Object, error?: string}}
   */
  window._shipmentDocCreate = function(edId, ownerId) {
    if (!edId) return { success: false, error: 'edId_required' };
    const list = _edListRaw();
    const idx = _edFindIdx(list, edId);
    if (idx === -1) return { success: false, error: 'ed_not_found' };
    if (list[idx].shipmentDoc) return { success: false, error: 'already_exists' };

    const finalOwner = ownerId || list[idx].responsibleUserId || _cuId();
    list[idx].shipmentDoc = _createEmptyDoc(finalOwner);
    list[idx].shipmentDoc._edId = edId;
    list[idx].updatedAt = _now();

    try {
      _edListStore(list);
    } catch (e) {
      console.warn('[SHIPMENT-DOC-CREATE-001] store fail:', e && e.message);
      if (typeof window.toast === 'function') window.toast('Kayıt yazılamadı', 'err');
      return { success: false, error: 'store_failed' };
    }

    return { success: true, sd: list[idx].shipmentDoc };
  };

  /**
   * ED'ye bağlı shipmentDoc'u oku (UI için _edId enjekte edilir).
   * @param {string} edId
   * @returns {Object|null} shipmentDoc objesi veya null
   */
  window._shipmentDocGet = function(edId) {
    if (!edId) return null;
    const list = _edListRaw();
    const idx = _edFindIdx(list, edId);
    if (idx === -1) return null;
    const sd = list[idx].shipmentDoc;
    if (!sd) return null;
    sd._edId = edId;
    return sd;
  };

})();
