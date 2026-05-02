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
    nakliyeFatura: Object.freeze({ icon: '🚚', label: 'Nakliye faturası',     mimes: Object.freeze(['pdf','jpg','jpeg','png']),         multi: false, zorunlu: false }),
    saticiFatura:  Object.freeze({ icon: '🧾', label: 'Satıcı faturası',      mimes: Object.freeze(['pdf','jpg','jpeg','png']),         multi: false, zorunlu: false }),
    imoForm:       Object.freeze({ icon: '⚠️', label: 'IMO/DGD formu',        mimes: Object.freeze(['pdf']),                            multi: false, zorunlu: false }),
    ekBelgeler:    Object.freeze({ icon: '📎', label: 'Ek belgeler',          mimes: Object.freeze(['pdf','jpg','png','xlsx','docx']), multi: true,  zorunlu: false }),
    /* SHIPMENT-DOC-FIELDS-001 (V134): Alış faturası slot — alış belgesi (Duay'a kesilen fatura) */
    alisFatura:    Object.freeze({ icon: '💰', label: 'Alış faturası',        mimes: Object.freeze(['pdf','jpg','jpeg','png']),         multi: false, zorunlu: false })
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
        ekBelgeler: [],
        alisFatura: null
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

  /* SHIPMENT-DOC-AUDIT-001: action sözlüğü (Object.freeze — UI cycle'larında reuse) */
  const HISTORY_ACTIONS = Object.freeze([
    'CREATE', 'UPDATE', 'STATE_CHANGE', 'UPLOAD', 'DELETE',
    'REVIEW_OPEN', 'REVIEW_RESOLVE', 'APPROVE', 'REJECT', 'OVERRIDE', 'CLOSE'
  ]);

  const SEVERITY_LEVELS = Object.freeze(['INFO', 'WARN', 'CRIT']);

  /* SHIPMENT-DOC-AUDIT-001: action meta — UI render için (icon/label/color) */
  const AUDIT_TYPE_META = Object.freeze({
    CREATE:         Object.freeze({ icon: '🆕', label: 'Oluşturuldu',     color: 'TASLAK' }),
    UPDATE:         Object.freeze({ icon: '✏️', label: 'Güncellendi',     color: 'TASLAK' }),
    STATE_CHANGE:   Object.freeze({ icon: '🔄', label: 'Durum değişti',   color: 'HAZIR'  }),
    UPLOAD:         Object.freeze({ icon: '📎', label: 'Belge eklendi',   color: 'ONAYLI' }),
    DELETE:         Object.freeze({ icon: '🗑️', label: 'Belge silindi',   color: 'REVIEW' }),
    REVIEW_OPEN:    Object.freeze({ icon: '⚠️', label: 'İnceleme açıldı', color: 'REVIEW' }),
    REVIEW_RESOLVE: Object.freeze({ icon: '✅', label: 'İnceleme bitti',  color: 'ONAYLI' }),
    APPROVE:        Object.freeze({ icon: '👍', label: 'Onaylandı',       color: 'ONAYLI' }),
    REJECT:         Object.freeze({ icon: '👎', label: 'Reddedildi',      color: 'REVIEW' }),
    OVERRIDE:       Object.freeze({ icon: '🔓', label: 'Admin müdahale',  color: 'REVIEW' }),
    CLOSE:          Object.freeze({ icon: '🔒', label: 'Kapatıldı',       color: 'KAPALI' })
  });

  const HISTORY_MAX = 100;

  /**
   * Ad maskele — K14 PII koruması (render aşamasında non-admin için).
   * Storage'da ham tutulur; bu fn UI render'ında çağrılır.
   * @param {string} name
   * @returns {string} "Mehmet Kara" → "Me**** Ka"
   */
  function _maskName(name) {
    if (!name || typeof name !== 'string') return '???';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      const w = parts[0];
      if (w.length <= 4) return w[0] + '***';
      return w.slice(0, 2) + '****' + w.slice(-2);
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    const fp = first.length <= 2 ? first[0] + '*' : first.slice(0, 2) + '****';
    const lp = last.length <= 2 ? last : last.slice(0, 2);
    return fp + ' ' + lp;
  }

  /**
   * Audit kayıt id üret — kronolojik sort + dedup için unique.
   * @returns {string} "aud_<ms>_<rand4>"
   */
  function _auditId() {
    return 'aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  /**
   * shipmentDoc.history'ye kayıt ekler + window.logActivity'ye paslar (çift kayıt).
   * FIFO: HISTORY_MAX aşılırsa en eski silinir, archivedCount artırılır.
   * Dedup tuzağına karşı: window.logActivity'ye obje değil string detay verir.
   *
   * @param {Object} sd shipmentDoc objesi
   * @param {string} action HISTORY_ACTIONS'tan biri
   * @param {Object} [opts] { severity?, details?, before?, after?, reason? }
   * @returns {Object|null} eklenen entry veya null (sd geçersizse)
   */
  function _logHistory(sd, action, opts) {
    if (!sd || typeof sd !== 'object') return null;
    if (HISTORY_ACTIONS.indexOf(action) === -1) {
      console.warn('[SHIPMENT-DOC-AUDIT-001] geçersiz action:', action);
      return null;
    }
    opts = opts || {};
    const severity = SEVERITY_LEVELS.indexOf(opts.severity) !== -1 ? opts.severity : 'INFO';

    const entry = {
      id: _auditId(),
      ts: _now(),
      uid: _cuId(),
      uname: _cuName(),
      action: action,
      severity: severity,
      details: opts.details || null,
      before: typeof opts.before === 'undefined' ? null : opts.before,
      after: typeof opts.after === 'undefined' ? null : opts.after,
      reason: opts.reason || null
    };

    if (!Array.isArray(sd.history)) sd.history = [];
    if (typeof sd.archivedCount !== 'number') sd.archivedCount = 0;

    sd.history.push(entry);

    /* FIFO: 100 üstü en eski silinir, sayaç artar */
    while (sd.history.length > HISTORY_MAX) {
      sd.history.shift();
      sd.archivedCount += 1;
    }

    sd.updatedAt = _now();

    /* Çift kayıt: window.logActivity'ye string detay (dedup tuzağı önlendi) */
    try {
      if (typeof window.logActivity === 'function') {
        const shortDetail = 'ed=' + (sd._edId || '?') + ' act=' + action + ' sev=' + severity;
        window.logActivity('shipment_doc_' + action.toLowerCase(), shortDetail);
      }
    } catch (e) {
      console.warn('[SHIPMENT-DOC-AUDIT-001] logActivity wrap fail:', e && e.message);
    }

    return entry;
  }

  /**
   * Public audit log API — UI ve sonraki cycle'lar için.
   * @param {string} edId
   * @param {string} action HISTORY_ACTIONS'tan biri
   * @param {Object} [opts] _logHistory ile aynı
   * @returns {{success: boolean, entry?: Object, error?: string}}
   */
  window._shipmentDocLog = function(edId, action, opts) {
    if (!edId) return { success: false, error: 'edId_required' };
    const list = _edListRaw();
    const idx = _edFindIdx(list, edId);
    if (idx === -1) return { success: false, error: 'ed_not_found' };
    if (!list[idx].shipmentDoc) return { success: false, error: 'sd_not_found' };

    const entry = _logHistory(list[idx].shipmentDoc, action, opts);
    if (!entry) return { success: false, error: 'log_failed' };

    try {
      _edListStore(list);
    } catch (e) {
      console.warn('[SHIPMENT-DOC-AUDIT-001] store fail:', e && e.message);
      if (typeof window.toast === 'function') window.toast('Audit kaydı yazılamadı', 'err');
      return { success: false, error: 'store_failed' };
    }

    return { success: true, entry: entry };
  };

  /** PII maskeleme — UI render için (K14). @param {string} name @returns {string} */
  window._shipmentDocMaskName = function(name) { return _maskName(name); };

  /** Action meta getter (UI için). @param {string} action @returns {Object|null} */
  window._shipmentDocAuditMeta = function(action) { return AUDIT_TYPE_META[action] || null; };

  /* SHIPMENT-DOC-STATE-001: state transition matrix (unidirectional, Object.freeze) */
  const STATE_TRANSITIONS = Object.freeze({
    BOS:    Object.freeze(['TASLAK']),
    TASLAK: Object.freeze(['HAZIR', 'KAPALI']),
    HAZIR:  Object.freeze(['ONAYLI', 'REVIEW', 'TASLAK']),
    ONAYLI: Object.freeze(['REVIEW', 'KAPALI']),
    REVIEW: Object.freeze(['HAZIR', 'ONAYLI']),
    KAPALI: Object.freeze([])
  });

  /* SHIPMENT-DOC-STATE-001: transition sebepleri (UI tooltip için) */
  const STATE_TRANSITION_REASONS = Object.freeze({
    'BOS->TASLAK':    'İlk değişiklik yapıldı',
    'TASLAK->HAZIR':  'Zorunlu belgeler tamamlandı',
    'TASLAK->KAPALI': 'Taslak iptal edildi',
    'HAZIR->ONAYLI':  'Onay verildi',
    'HAZIR->REVIEW':  'Kritik alan değişti, inceleme bekliyor',
    'HAZIR->TASLAK':  'Belge silindi, taslağa düştü',
    'ONAYLI->REVIEW': 'Onaylı kayıtta kritik alan değişti',
    'ONAYLI->KAPALI': 'Sevkiyat tamamlandı',
    'REVIEW->HAZIR':  'İnceleme reddedildi, eski hâle döndü',
    'REVIEW->ONAYLI': 'İnceleme onaylandı'
  });

  /**
   * State geçişi izinli mi kontrol et (K10 null guard).
   * @param {string} fromState mevcut state
   * @param {string} toState hedef state
   * @returns {{allowed: boolean, reason?: string}}
   */
  function _canTransition(fromState, toState) {
    if (!fromState || !toState) {
      return { allowed: false, reason: 'state parametre eksik' };
    }
    if (fromState === toState) {
      return { allowed: false, reason: 'aynı state' };
    }
    const allowed = STATE_TRANSITIONS[fromState];
    if (!allowed) {
      return { allowed: false, reason: 'bilinmeyen mevcut state: ' + fromState };
    }
    if (allowed.indexOf(toState) === -1) {
      return { allowed: false, reason: fromState + ' state\'inden ' + toState + ' state\'ine geçilemez' };
    }
    return { allowed: true };
  }

  /**
   * Bir field path kritik mi (KRITIK_ALANLAR exact match veya parent match).
   * Örn: 'yuk.brutKg' kritik ise 'yuk' veya 'yuk.brutKg.x' da kritik sayılır.
   * @param {string} fieldPath
   * @returns {boolean}
   */
  function _isFieldKritik(fieldPath) {
    if (!fieldPath || typeof fieldPath !== 'string') return false;
    for (let i = 0; i < KRITIK_ALANLAR.length; i++) {
      const k = KRITIK_ALANLAR[i];
      if (fieldPath === k) return true;
      if (fieldPath.indexOf(k + '.') === 0) return true;
      if (k.indexOf(fieldPath + '.') === 0) return true;
    }
    return false;
  }

  /**
   * Mevcut sd durumuna göre olası sonraki state'i öner (UI CTA için).
   * @param {Object} sd shipmentDoc
   * @returns {string|null} sonraki state veya null
   */
  function _suggestNextState(sd) {
    if (!sd || !sd.state) return null;
    const cur = sd.state;
    if (cur === 'BOS') return 'TASLAK';
    if (cur === 'TASLAK') {
      const b = sd.belgeler || {};
      const hazir = ZORUNLU_BELGELER.every(function(slot) { return !!b[slot]; });
      return hazir ? 'HAZIR' : null;
    }
    if (cur === 'HAZIR') return 'ONAYLI';
    if (cur === 'REVIEW') return 'ONAYLI';
    return null;
  }

  /* SHIPMENT-DOC-STATE-001: Window expose */

  /** State geçişi izinli mi. @param {string} from @param {string} to @returns {Object} */
  window._shipmentDocCanTransition = function(from, to) { return _canTransition(from, to); };

  /** Field kritik mi (UI badge için). @param {string} fieldPath @returns {boolean} */
  window._shipmentDocIsFieldKritik = function(fieldPath) { return _isFieldKritik(fieldPath); };

  /** Önerilen sonraki state (UI CTA için). @param {string} edId @returns {string|null} */
  window._shipmentDocSuggestNextState = function(edId) {
    const sd = window._shipmentDocGet(edId);
    return sd ? _suggestNextState(sd) : null;
  };

  /** Transition sebep tooltip metni. @param {string} from @param {string} to @returns {string} */
  window._shipmentDocTransitionReason = function(from, to) {
    return STATE_TRANSITION_REASONS[from + '->' + to] || '';
  };

  /** İzinli sonraki state listesi (UI dropdown için). @param {string} state @returns {Array<string>} */
  window._shipmentDocAllowedNextStates = function(state) {
    const list = STATE_TRANSITIONS[state];
    return list ? list.slice() : [];
  };

  /* SHIPMENT-DOC-PROBE-001: probe fn'i expected_deliveries_docs_probe.js'e taşındı (V123 SHIPMENT-DOC-PROBE-EXTRACT-001) */

  /* SHIPMENT-DOC-UPDATE-001: ilk gerçek mutator — flat patch + diff + REVIEW state */

  /**
   * Schema'da tanınan dotted path mı kontrol et (bilinmeyen path warn için).
   * Kabul: belgeler.*, yuk.*, paket.*, yerlesim.*, paydaslar.*, ayrıca
   *        state, ownerId, reviewRequired üst-level alanlar.
   * @param {string} path
   * @returns {boolean}
   */
  function _isKnownPath(path) {
    if (!path || typeof path !== 'string') return false;
    const allowedRoots = ['belgeler', 'yuk', 'paket', 'yerlesim', 'paydaslar'];
    const root = path.split('.')[0];
    return allowedRoots.indexOf(root) !== -1;
  }

  /**
   * Tek alan veya çoklu flat patch ile shipmentDoc'u güncelle.
   * Storage'a yazar, audit log'a kaydeder, kritik alan değişiminde REVIEW
   * state'ine geçer.
   *
   * @param {string} edId hedef ED
   * @param {string|Object} pathOrPatch tek path string VEYA flat patch obj
   * @param {*} [valueIfPath] path verilmişse yeni değer
   * @param {Object} [opts] { reason?: string, severity?: string }
   * @returns {{success: boolean, sd?: Object, changed?: Array<string>,
   *            requiresReview?: boolean, error?: string}}
   *
   * Örnek kullanım:
   *   _shipmentDocUpdate(edId, 'yuk.m3', 3.6)
   *   _shipmentDocUpdate(edId, {'yuk.brutKg': 2400, 'paket.adet': 48}, null, {reason: 'kantar düzeltmesi'})
   */
  window._shipmentDocUpdate = function(edId, pathOrPatch, valueIfPath, opts) {
    /* 1. Guard: edId */
    if (!edId) return { success: false, error: 'edId_required' };

    /* 2. Patch normalize: tek path → obje */
    let patch;
    if (typeof pathOrPatch === 'string') {
      patch = {}; patch[pathOrPatch] = valueIfPath;
    } else if (pathOrPatch && typeof pathOrPatch === 'object') {
      patch = pathOrPatch;
    } else {
      return { success: false, error: 'invalid_patch' };
    }
    opts = opts || {};

    /* 3. ED + sd guard */
    const list = _edListRaw();
    const idx = _edFindIdx(list, edId);
    if (idx === -1) return { success: false, error: 'ed_not_found' };
    const ed = list[idx];
    const sd = ed.shipmentDoc;
    if (!sd) return { success: false, error: 'sd_not_found' };

    /* 4. KAPALI immutable (sahtecilik koruması — reopen V124+) */
    if (sd.state === 'KAPALI') {
      return { success: false, error: 'closed_immutable' };
    }

    /* 5. Diff hesapla */
    const changed = [];
    const beforeSnapshot = {};
    const afterSnapshot = {};
    let kritikDetected = false;
    const kritikPaths = [];
    const unknownPaths = [];

    for (const path in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, path)) continue;

      /* Mikro tasarım 1: bilinmeyen path warn + atla */
      if (!_isKnownPath(path)) {
        unknownPaths.push(path);
        continue;
      }

      const before = _getPath(sd, path);
      const after = patch[path];

      /* Strict equality + JSON deep compare (obje/array için) */
      let isEqual = (before === after);
      if (!isEqual && typeof before === 'object' && typeof after === 'object') {
        try { isEqual = JSON.stringify(before) === JSON.stringify(after); } catch (e) { isEqual = false; }
      }
      if (isEqual) continue;

      beforeSnapshot[path] = before;
      afterSnapshot[path] = after;
      changed.push(path);

      if (_isFieldKritik(path)) {
        kritikDetected = true;
        kritikPaths.push(path);
      }
    }

    /* Mikro tasarım 2: boş diff noop */
    if (changed.length === 0) {
      if (unknownPaths.length) {
        console.warn('[SHIPMENT-DOC-UPDATE-001] bilinmeyen path(lar) atlandı:', unknownPaths);
      }
      return {
        success: true,
        sd: sd,
        changed: [],
        requiresReview: false,
        noop: true,
        unknownPaths: unknownPaths.length ? unknownPaths : undefined
      };
    }

    /* 6. Kritik + HAZIR/ONAYLI ise reason zorunlu */
    const requiresReview = kritikDetected && (sd.state === 'HAZIR' || sd.state === 'ONAYLI');
    if (requiresReview && (!opts.reason || !opts.reason.trim())) {
      return { success: false, error: 'reason_required_for_critical_review', kritikPaths: kritikPaths };
    }

    /* 7. Patch uygula (storage'a değil, sd objesine) */
    for (let i = 0; i < changed.length; i++) {
      _setPath(sd, changed[i], afterSnapshot[changed[i]]);
    }
    sd.updatedAt = _now();

    /* 8. State transition (BOS → TASLAK otomatik, HAZIR/ONAYLI → REVIEW kritikse) */
    let stateChanged = false;
    const prevState = sd.state;

    if (sd.state === 'BOS') {
      const can = _canTransition('BOS', 'TASLAK');
      if (can.allowed) {
        sd.state = 'TASLAK';
        stateChanged = true;
      }
    } else if (requiresReview) {
      const can = _canTransition(sd.state, 'REVIEW');
      if (can.allowed) {
        sd.reviewRequired = true;
        if (!Array.isArray(sd.pendingApprovals)) sd.pendingApprovals = [];
        sd.pendingApprovals.push({
          id: 'pa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          requestedBy: _cuId(),
          requestedAt: _now(),
          paths: kritikPaths.slice(),
          reason: opts.reason,
          status: 'pending'
        });
        sd.state = 'REVIEW';
        stateChanged = true;
      }
    }

    /* 9. Audit: önce STATE_CHANGE (varsa), sonra UPDATE */
    if (stateChanged) {
      _logHistory(sd, 'STATE_CHANGE', {
        severity: requiresReview ? 'WARN' : 'INFO',
        before: prevState,
        after: sd.state,
        reason: opts.reason || null,
        details: requiresReview ? { kritikPaths: kritikPaths } : null
      });
    }

    _logHistory(sd, 'UPDATE', {
      severity: kritikDetected ? 'WARN' : (opts.severity || 'INFO'),
      before: beforeSnapshot,
      after: afterSnapshot,
      reason: opts.reason || null,
      details: { changedCount: changed.length, kritikDetected: kritikDetected }
    });

    /* 10. Storage'a yaz */
    list[idx] = ed;
    try {
      _edListStore(list);
    } catch (e) {
      console.warn('[SHIPMENT-DOC-UPDATE-001] store fail:', e && e.message);
      if (typeof window.toast === 'function') window.toast('Kayıt yazılamadı', 'err');
      return { success: false, error: 'store_failed' };
    }

    if (unknownPaths.length) {
      console.warn('[SHIPMENT-DOC-UPDATE-001] bilinmeyen path(lar) atlandı:', unknownPaths);
    }

    /* Mikro tasarım 3: zengin return */
    return {
      success: true,
      sd: sd,
      changed: changed,
      requiresReview: requiresReview,
      stateChanged: stateChanged,
      kritikDetected: kritikDetected,
      unknownPaths: unknownPaths.length ? unknownPaths : undefined
    };
  };

})();
