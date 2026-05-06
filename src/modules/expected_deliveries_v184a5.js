/* ============================================================================
 * V184a5 / LOJ-IHRACAT-DETAY-001
 * ----------------------------------------------------------------------------
 * 1) İhracat detay storage (loj_ihracat_detay_v1)
 *    - Manuel alanlar: konteynerNo, muhurNo, cutOffTarihi, ardiyesizGirisTarihi,
 *      hatLine, trackingUrl, gemiAdi, seferNo, limanTerminal, cikisLimani,
 *      varisLimani, tahminiVarisSuresi, notlar
 *
 * 2) Grup başlığını ZENGİNLEŞTİR (V184a3'ün renderGroupHeader'ını override eder):
 *    - Otomatik: KG/m³/firma sayısı/ETA range/konteyner önerisi
 *    - Manuel: detay strip (kayıt varsa)
 *    - "✏ Detay" butonu (admin/manager-only) → modal aç
 *    - ▼/▶ collapse butonu — alt satırlar gizlenir
 *
 * 3) Collapse state: localStorage 'v184a5_collapse_state'
 *
 * Co-Authored-By: Claude
 * ========================================================================== */
(function() {
  'use strict';

  var LOG_PREFIX = '[V184a5]';
  var DETAY_KEY = 'loj_ihracat_detay_v1';
  var COLLAPSE_KEY = 'v184a5_collapse_state';

  /* ─────────────── Yardımcılar ─────────────── */

  function isAdminOrManager() {
    var cu = (typeof window.CU === 'function') ? window.CU() : null;
    if (!cu) return false;
    var role = cu.role || cu.rol;
    return role === 'admin' || role === 'manager' || role === 'super_admin';
  }

  /* V184a6: İhracat Detay düzenleme — admin/manager + asistan (Yönetici Asistanı).
   * Talimat: 'İhracat ID, Sipariş Kodu, Sorumlu, Renk hariç tüm verileri Yönetici Asistanı girebilir.'
   * Bu modal İhracat ID/Sipariş/Renk/Sorumlu içermez → asistan açabilir. */
  function canEditDetay() {
    var cu = (typeof window.CU === 'function') ? window.CU() : null;
    if (!cu) return false;
    var role = cu.role || cu.rol;
    return role === 'admin' || role === 'manager' || role === 'super_admin' || role === 'asistan';
  }

  /* V185b3+: İhracat Detay GÖRÜNTÜLEME — admin/manager/asistan VEYA kayda atanmış user.
   * Atanan kullanıcı detayı görür ama düzenleyemez (input'lar disabled, save yok). */
  function canViewDetay(ed) {
    if (canEditDetay()) return true;
    var cu = (typeof window.CU === 'function') ? window.CU() : null;
    if (!cu || !ed) return false;
    var uid = cu.id || cu.uid;
    return uid && ed.responsibleUserId && String(ed.responsibleUserId) === String(uid);
  }

  /* V185b3+: Grup içinde herhangi bir kayda current user atanmış mı? */
  function canViewAnyInGroup(edList) {
    if (canEditDetay()) return true;
    if (!edList || !edList.length) return false;
    var cu = (typeof window.CU === 'function') ? window.CU() : null;
    if (!cu) return false;
    var uid = cu.id || cu.uid;
    if (!uid) return false;
    for (var i = 0; i < edList.length; i++) {
      if (edList[i] && String(edList[i].responsibleUserId) === String(uid)) return true;
    }
    return false;
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTr(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }); } catch(e) { return String(d); }
  }

  /* V184a5-r2: Tarih yaklaşma alarmı — Cut-off / Ardiye için. Eşikler:
   * geçmiş → koyu kırmızı (acil!) · 0-3g → kırmızı · 4-7g → turuncu · 8+g → uyarı yok */
  function getDateAlert(dateStr, label) {
    if (!dateStr) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    var diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { level: 'overdue', bg: '#991B1B', color: '#fff', text: '🚨 ' + label + ' ' + Math.abs(diff) + 'g geç' };
    if (diff <= 3) return { level: 'critical', bg: '#DC2626', color: '#fff', text: '⏰ ' + label + (diff === 0 ? ' bugün' : ' ' + diff + 'g') };
    if (diff <= 7) return { level: 'warn', bg: '#EA580C', color: '#fff', text: '⏰ ' + label + ' ' + diff + 'g' };
    return null;
  }

  /* ─────────────── İhracat Detay Storage ─────────────── */

  window.loadIhracatDetay = function() {
    try { return JSON.parse(localStorage.getItem(DETAY_KEY) || '{}') || {}; } catch(e) { return {}; }
  };

  window.storeIhracatDetay = function(map) {
    try { localStorage.setItem(DETAY_KEY, JSON.stringify(map || {})); return true; } catch(e) { return false; }
  };

  function getDetay(ihracatId) {
    if (!ihracatId) return null;
    var map = window.loadIhracatDetay();
    return map[ihracatId] || null;
  }

  function saveDetay(ihracatId, data) {
    if (!ihracatId) return false;
    var map = window.loadIhracatDetay();
    map[ihracatId] = Object.assign({}, map[ihracatId] || {}, data, { updatedAt: new Date().toISOString() });
    return window.storeIhracatDetay(map);
  }

  /* ─────────────── V191d — 15 gün alarm helper'ları ───────────────
   * Liman varış tarihi hesabı + alarm HTML üretici. Detayda evrakDurumu
   * MUSTERIYE_KARGOLANDI veya TESLIM_EDILDI ise alarm gösterme. */
  function _calcLimanVarisGunKaldi(detay) {
    if (!detay) return null;
    var sure = parseInt(detay.tahminiVarisSuresi, 10);
    if (!sure || isNaN(sure) || sure <= 0) return null;
    /* Fallback: cutOffTarihi varsa cutoff'tan, yoksa ardiyesizGirisTarihi'nden */
    var baseDateStr = detay.cutOffTarihi || detay.ardiyesizGirisTarihi;
    if (!baseDateStr) return null;
    var baseDate = new Date(baseDateStr);
    if (isNaN(baseDate.getTime())) return null;
    var limanVaris = new Date(baseDate.getTime() + sure * 86400000);
    var bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    var diff = Math.ceil((limanVaris.getTime() - bugun.getTime()) / 86400000);
    return diff;
  }

  function _renderEvrakAlarm(detay) {
    if (!detay) return '';
    var ed = detay.evrakDurumu || 'HAZIRLANIYOR';
    /* Kargolandı/teslim edildi → alarm yok */
    if (ed === 'MUSTERIYE_KARGOLANDI' || ed === 'TESLIM_EDILDI') return '';
    var gunKaldi = _calcLimanVarisGunKaldi(detay);
    if (gunKaldi === null || gunKaldi > 15) return '';
    var msg = (typeof window.t === 'function')
      ? window.t('ed.alarm.evrak15Gun').replace('{n}', gunKaldi)
      : '🔴 Liman varışına ' + gunKaldi + ' gün kaldı. Evrakların acilen kargolanması gerekir.';
    return '<div style="margin-top:6px;padding:6px 10px;background:var(--rdb);border-left:3px solid var(--rd);border-radius:4px;font-size:11px;color:var(--rdt);font-weight:500">' + msg + '</div>';
  }

  /* ─────────────── Collapse State ─────────────── */

  function loadCollapseState() {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') || {}; } catch(e) { return {}; }
  }

  function setCollapse(ihracatId, collapsed) {
    var s = loadCollapseState();
    if (collapsed) s[ihracatId] = true;
    else delete s[ihracatId];
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  function isCollapsed(ihracatId) {
    var s = loadCollapseState();
    return !!s[ihracatId];
  }

  /* ─────────────── Toplu hesaplar ─────────────── */

  function computeAggregates(edList) {
    var totalKg = 0, totalM3 = 0;
    var firmaSet = {}, etaList = [], geciktiCount = 0, yakinCount = 0;
    var requiredCount = 0; /* V190d — zorunlu öncelik sayısı */
    var today = new Date(); today.setHours(0,0,0,0);
    edList.forEach(function(ed) {
      totalKg += parseFloat(ed.weightKg) || 0;
      totalM3 += parseFloat(ed.volumeM3) || 0;
      if (ed.supplierId) firmaSet[ed.supplierId] = true;
      if (ed.loadingPriority === 'REQUIRED') requiredCount++;
      if (ed.estimatedDeliveryDate) {
        var t = new Date(ed.estimatedDeliveryDate).getTime();
        if (!isNaN(t)) {
          etaList.push(t);
          var diff = Math.floor((t - today.getTime()) / 86400000);
          if (diff < 0) geciktiCount++;
          else if (diff < 7) yakinCount++;
        }
      }
    });
    var firmaCount = Object.keys(firmaSet).length;
    var minEta = etaList.length ? Math.min.apply(null, etaList) : null;
    var maxEta = etaList.length ? Math.max.apply(null, etaList) : null;
    var calc = (typeof window._edCalculateContainers === 'function')
      ? window._edCalculateContainers({ weightKg: totalKg, volumeM3: totalM3 })
      : null;
    return {
      count: edList.length, totalKg: totalKg, totalM3: totalM3, firmaCount: firmaCount,
      minEta: minEta, maxEta: maxEta, geciktiCount: geciktiCount, yakinCount: yakinCount, calc: calc,
      requiredCount: requiredCount
    };
  }

  /* ─────────────── Grup Başlığı Render (zengin) ─────────────── */

  function renderRichGroupHeader(ihracatId, edList) {
    var isAtanmamis = !ihracatId;
    var agg = computeAggregates(edList);
    var bg, color, title;
    if (isAtanmamis) {
      bg = 'rgba(224,87,79,0.06)'; color = '#A32D2D';
      title = '⚠️ İhracat ID Atanmamış';
    } else {
      bg = 'rgba(24,95,165,0.06)'; color = '#185FA5';
      title = '📦 ' + escHtml(ihracatId);
    }

    var collapsed = ihracatId ? isCollapsed(ihracatId) : false;
    var arrow = collapsed ? '▶' : '▼';
    var detay = ihracatId ? getDetay(ihracatId) : null;

    /* Otomatik özet satırı */
    var ozet = agg.count + ' kalem';
    if (agg.firmaCount > 0) ozet += ' · ' + agg.firmaCount + ' firma';
    if (agg.totalKg > 0) ozet += ' · ' + Math.round(agg.totalKg).toLocaleString('tr-TR') + ' kg';
    if (agg.totalM3 > 0) ozet += ' · ' + agg.totalM3.toFixed(1) + ' m³';

    var etaStr = '';
    if (agg.minEta && agg.maxEta) {
      etaStr = 'ETA: ' + fmtTr(agg.minEta) + ' → ' + fmtTr(agg.maxEta);
      if (agg.geciktiCount > 0) etaStr += ' <span style="color:#DC2626;font-weight:500">(' + agg.geciktiCount + ' gecikmiş)</span>';
      else if (agg.yakinCount > 0) etaStr += ' <span style="color:#CA8A04;font-weight:500">(' + agg.yakinCount + ' yakın)</span>';
    }

    /* V190d — calc.text reuse: '1 × 40HC yeter (%41 hacim)' formatında doluluk dahil
     * + zorunlu öncelik inline badge (varsa) */
    var calcStr = '';
    if (agg.calc) {
      var calcText = agg.calc.text || ('→ ' + agg.calc.count + ' × ' + agg.calc.type + ' yeter');
      /* calc.text "✅" / "🔴" prefix ile geliyor — '→' prefix uyumu için kaldır */
      calcText = calcText.replace(/^[✅🔴]\s*/, '→ ');
      calcStr = '<span style="color:' + agg.calc.color + ';font-weight:500">' + calcText + '</span>';
      if (agg.requiredCount > 0) {
        calcStr += ' <span style="color:#854F0B;font-weight:500">· ⭐ ' + agg.requiredCount + ' zorunlu</span>';
      }
    } else if (agg.requiredCount > 0) {
      calcStr = '<span style="color:#854F0B;font-weight:500">⭐ ' + agg.requiredCount + ' zorunlu</span>';
    }

    /* Manuel detay strip — kayıt varsa */
    var detayStrip = '';
    if (detay && !isAtanmamis) {
      var parts = [];
      if (detay.konteynerNo) parts.push('🚛 ' + escHtml(detay.konteynerNo));
      if (detay.muhurNo) parts.push('🔒 ' + escHtml(detay.muhurNo));
      if (detay.cutOffTarihi) {
        var co = getDateAlert(detay.cutOffTarihi, 'Cut-off');
        var coColor = co ? co.bg : 'var(--t2)';
        parts.push('<span style="color:' + coColor + ';font-weight:' + (co ? '600' : '400') + '">⏱ Cut-off: ' + fmtTr(detay.cutOffTarihi) + '</span>');
      }
      if (detay.ardiyesizGirisTarihi) {
        var ar = getDateAlert(detay.ardiyesizGirisTarihi, 'Ardiye');
        var arColor = ar ? ar.bg : 'var(--t2)';
        parts.push('<span style="color:' + arColor + ';font-weight:' + (ar ? '600' : '400') + '">📦 Ardiye: ' + fmtTr(detay.ardiyesizGirisTarihi) + '</span>');
      }
      if (detay.hatLine) parts.push('🚢 ' + escHtml(detay.hatLine));
      if (detay.bookingNo) parts.push('🎫 Booking: ' + escHtml(detay.bookingNo));
      if (detay.forwarder) parts.push('🏢 ' + escHtml(detay.forwarder));
      if (detay.trackingUrl) parts.push('<a href="' + escHtml(detay.trackingUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#185FA5;text-decoration:none">🔗 Tracking</a>');
      if (detay.cikisLimani || detay.varisLimani) parts.push('🏭 ' + escHtml(detay.cikisLimani || '?') + ' → ' + escHtml(detay.varisLimani || '?'));
      if (detay.gemiAdi) parts.push('Gemi: ' + escHtml(detay.gemiAdi) + (detay.seferNo ? ' (' + escHtml(detay.seferNo) + ')' : ''));
      if (parts.length) {
        detayStrip = '<div style="font-size:11px;color:var(--t2);padding:6px 0 0 0;line-height:1.7">' + parts.join(' · ') + '</div>';
      }
    }

    var detayBtn = '';
    if (!isAtanmamis) {
      if (canEditDetay()) {
        detayBtn = '<button onclick="event.stopPropagation();window._lojIhracatDetayModal(\'' + escHtml(ihracatId) + '\')" style="padding:4px 10px;border:0.5px solid ' + color + '33;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:' + color + ';font-family:inherit">✏ Detay</button>';
      } else if (canViewAnyInGroup(edList)) {
        /* V185b3+: atanmış user → görüntüleme butonu (readonly modal) */
        detayBtn = '<button onclick="event.stopPropagation();window._lojIhracatDetayModal(\'' + escHtml(ihracatId) + '\')" style="padding:4px 10px;border:0.5px solid ' + color + '33;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:' + color + ';font-family:inherit" title="Salt okunur">👁 Detay</button>';
      }
    }

    var collapseBtn = ihracatId ? '<button onclick="event.stopPropagation();window._lojGrupToggle(\'' + escHtml(ihracatId) + '\')" style="padding:4px 8px;border:0.5px solid ' + color + '33;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;color:' + color + ';font-family:inherit;margin-left:6px" title="Aç/Kapat">' + arrow + '</button>' : '';

    /* V184a5-r2: Tarih alarmları — sağda parlak rozet (Cut-off / Ardiye) */
    var alerts = [];
    if (detay) {
      var coAlert = getDateAlert(detay.cutOffTarihi, 'Cut-off');
      if (coAlert) alerts.push(coAlert);
      var arAlert = getDateAlert(detay.ardiyesizGirisTarihi, 'Ardiye');
      if (arAlert) alerts.push(arAlert);
    }
    var alertHtml = alerts.map(function(a) {
      return '<span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:600;background:' + a.bg + ';color:' + a.color + ';white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15)">' + a.text + '</span>';
    }).join(' ');

    return '<div data-v184a3-group="1" data-grup-id="' + escHtml(ihracatId || '__atanmamis__') + '" style="padding:12px 16px;background:' + bg + ';border-bottom:0.5px solid var(--b);border-top:2px solid ' + color + '">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;color:' + color + ';font-family:DM Mono,monospace">' + title + '</div>'
      + '<div style="font-size:11px;color:var(--t2);margin-top:3px">' + ozet + '</div>'
      + (etaStr ? '<div style="font-size:11px;color:var(--t3);margin-top:2px">' + etaStr + '</div>' : '')
      + (calcStr ? '<div style="font-size:11px;margin-top:2px">' + calcStr + '</div>' : '')
      /* V191d — 15 gün liman varış alarmı (evrak hazırlanıyor/eksik durumda) */
      + _renderEvrakAlarm(detay)
      + detayStrip
      + '</div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">'
      + (alertHtml ? '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + alertHtml + '</div>' : '')
      + '<div style="display:flex;align-items:center;gap:6px">' + detayBtn + collapseBtn + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  /* ─────────────── renderEdList override (V184a3 yerine geçer) ─────────────── */

  var origRenderEdList = window.renderEdList;
  if (typeof origRenderEdList === 'function') {
    window.renderEdList = function() {
      try {
        var html = origRenderEdList.apply(this, arguments);
        return regroupWithRichHeaders(html);
      } catch (e) {
        console.warn(LOG_PREFIX, 'override hatası, orijinal döndürülüyor:', e);
        return origRenderEdList.apply(this, arguments);
      }
    };
  }

  /* Brace counting — V184a3'ten miras */
  function findRowEnd(html, startIdx) {
    var openTagEnd = html.indexOf('>', startIdx);
    if (openTagEnd === -1) return -1;
    var i = openTagEnd + 1;
    var depth = 1;
    var openRe = /<div\b/g;
    var closeRe = /<\/div>/g;
    while (depth > 0 && i < html.length) {
      openRe.lastIndex = i;
      closeRe.lastIndex = i;
      var openMatch = openRe.exec(html);
      var closeMatch = closeRe.exec(html);
      if (!closeMatch) return -1;
      if (openMatch && openMatch.index < closeMatch.index) {
        depth++;
        i = openMatch.index + 4;
      } else {
        depth--;
        i = closeMatch.index + 6;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function regroupWithRichHeaders(html) {
    if (!html || typeof html !== 'string') return html;

    /* Idempotent: V184a5 marker varsa skip */
    if (html.indexOf('data-v184a5-rich="1"') !== -1) return html;

    /* Row başlangıçlarını bul */
    var marker = /<div data-ed-id="([^"]*)" data-ihracat-id="([^"]*)"/g;
    var matches = [];
    var m;
    while ((m = marker.exec(html)) !== null) {
      matches.push({ index: m.index, edId: m[1], ihracatId: m[2] });
    }
    if (matches.length === 0) return html;

    /* Atomic boundaries */
    var rows = [];
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index;
      var end = findRowEnd(html, start);
      if (end === -1) return html;
      rows.push({ ihracatId: matches[i].ihracatId, edId: matches[i].edId, html: html.substring(start, end) });
    }

    var preface = html.substring(0, matches[0].index);
    var lastRowEnd = findRowEnd(html, matches[matches.length - 1].index);
    var postface = html.substring(lastRowEnd);

    /* ed verisini al — agregat hesabı için */
    var edAll = (typeof window.loadExpectedDeliveries === 'function')
      ? (window.loadExpectedDeliveries({ raw: true }) || []) : [];
    var edById = {};
    edAll.forEach(function(ed) { edById[String(ed.id)] = ed; });

    /* Gruplara böl */
    var groups = {};
    var groupOrder = [];
    rows.forEach(function(row) {
      var id = row.ihracatId || '__atanmamış__';
      if (!(id in groups)) {
        groups[id] = { rows: [], edList: [] };
        groupOrder.push(id);
      }
      groups[id].rows.push(row.html);
      var ed = edById[String(row.edId)];
      if (ed) groups[id].edList.push(ed);
    });

    /* Render: önce ATANMAMIŞ */
    var output = preface;
    var rich = ' data-v184a5-rich="1"'; // marker — header'a inject

    function renderGroup(id, isAtanmamis) {
      var grp = groups[id];
      var actualId = isAtanmamis ? null : id;
      var headerHtml = renderRichGroupHeader(actualId, grp.edList).replace('data-v184a3-group="1"', 'data-v184a3-group="1"' + rich);
      var collapsed = actualId ? isCollapsed(actualId) : false;
      var rowsWrap = '<div data-grup-icerik="' + escHtml(actualId || '__atanmamis__') + '"' + (collapsed ? ' style="display:none"' : '') + '>'
        + grp.rows.join('')
        + '</div>';
      return headerHtml + rowsWrap;
    }

    if (groups['__atanmamış__']) {
      output += renderGroup('__atanmamış__', true);
      delete groups['__atanmamış__'];
    }
    Object.keys(groups).sort().forEach(function(id) {
      output += renderGroup(id, false);
    });

    return output + postface;
  }

  /* ─────────────── Toggle helper (collapse) ─────────────── */

  window._lojGrupToggle = function(ihracatId) {
    if (!ihracatId) return;
    var current = isCollapsed(ihracatId);
    setCollapse(ihracatId, !current);
    /* Sadece o grubu DOM'da toggle et — full re-render gerekmez */
    var icerik = document.querySelector('[data-grup-icerik="' + ihracatId.replace(/"/g, '&quot;') + '"]');
    if (icerik) icerik.style.display = current ? '' : 'none';
    /* Header arrow güncelle */
    var btn = document.querySelector('[data-grup-id="' + ihracatId.replace(/"/g, '&quot;') + '"] button[onclick*="_lojGrupToggle"]');
    if (btn) btn.textContent = current ? '▼' : '▶';
  };

  /* ─────────────── İhracat Detay Modal ─────────────── */

  window._lojIhracatDetayModal = function(ihracatId) {
    if (!ihracatId) return;
    /* V185b3+: edList yükle → atanma kontrolü */
    var allEd = (typeof window.loadExpectedDeliveries === 'function' ? window.loadExpectedDeliveries({ raw: true }) : []) || [];
    var groupEd = allEd.filter(function(e) { return String(e.ihracatId) === String(ihracatId); });
    var canEdit = canEditDetay();
    var canView = canEdit || canViewAnyInGroup(groupEd);
    if (!canView) {
      window.toast && window.toast(t('ed.toast.permissionDenied'), 'warn');
      return;
    }

    var detay = getDetay(ihracatId) || {};
    var old = document.getElementById('mo-loj-ihracat-detay');
    if (old) old.remove();

    var mo = document.createElement('div');
    mo.className = 'mo'; mo.id = 'mo-loj-ihracat-detay';

    var labelStyle = 'font-size:10px;color:var(--t3);margin-bottom:3px;text-transform:uppercase;letter-spacing:.03em';
    var inputStyle = 'width:100%;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;font-size:12px;font-family:inherit';

    function fld(label, id, value, type) {
      type = type || 'text';
      return '<div style="margin-bottom:10px"><div style="' + labelStyle + '">' + label + '</div>'
        + '<input id="' + id + '" type="' + type + '" value="' + escHtml(value || '') + '" style="' + inputStyle + '"></div>';
    }
    function textarea(label, id, value) {
      return '<div style="margin-bottom:10px;grid-column:span 2"><div style="' + labelStyle + '">' + label + '</div>'
        + '<textarea id="' + id + '" rows="2" style="' + inputStyle + ';resize:vertical;font-family:inherit">' + escHtml(value || '') + '</textarea></div>';
    }

    mo.innerHTML = '<div class="moc" style="max-width:680px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
      + '<div data-modal-title style="padding:14px 20px;border-bottom:0.5px solid var(--b);font-size:14px;font-weight:600">📦 ' + (typeof window.t === 'function' ? window.t('ed.detay.title') : 'İhracat Detayı') + ' — ' + escHtml(ihracatId) + '</div>'
      + '<div style="padding:18px 20px;overflow-y:auto;flex:1">'
      + '<div style="font-size:10px;font-weight:600;color:#185FA5;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">📦 ' + (typeof window.t === 'function' ? window.t('ed.detay.section.konteyner') : 'Konteyner Bilgisi') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + fld('Konteyner No', 'lid-konteynerNo', detay.konteynerNo)
      + fld('Mühür No', 'lid-muhurNo', detay.muhurNo)
      + fld('Ardiyesiz Giriş Tarihi', 'lid-ardiyesizGirisTarihi', detay.ardiyesizGirisTarihi, 'date')
      + fld('Cut-off Tarihi', 'lid-cutOffTarihi', detay.cutOffTarihi, 'date')
      + '</div>'
      + '<div style="font-size:10px;font-weight:600;color:#185FA5;margin:12px 0 10px;text-transform:uppercase;letter-spacing:.05em">🚢 ' + (typeof window.t === 'function' ? window.t('ed.detay.section.tasiyici') : 'Taşıyıcı / Hat') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + fld('Booking No', 'lid-bookingNo', detay.bookingNo)
      + fld('Forwarder / Unvanı', 'lid-forwarder', detay.forwarder)
      + fld('Hat / Line (MSC, CMA, MAERSK)', 'lid-hatLine', detay.hatLine)
      + fld('Tracking URL', 'lid-trackingUrl', detay.trackingUrl, 'url')
      + fld('Gemi Adı', 'lid-gemiAdi', detay.gemiAdi)
      + fld('Sefer No', 'lid-seferNo', detay.seferNo)
      + '</div>'
      + '<div style="font-size:10px;font-weight:600;color:#185FA5;margin:12px 0 10px;text-transform:uppercase;letter-spacing:.05em">🏭 ' + (typeof window.t === 'function' ? window.t('ed.detay.section.liman') : 'Liman / Rota') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + fld('Liman / Terminal', 'lid-limanTerminal', detay.limanTerminal)
      + fld('Yükleme Noktası', 'lid-yuklemeNoktasi', detay.yuklemeNoktasi)
      + fld('Çıkış Limanı', 'lid-cikisLimani', detay.cikisLimani)
      + fld('Varış Limanı', 'lid-varisLimani', detay.varisLimani)
      + fld('Tahmini Varış Süresi (gün)', 'lid-tahminiVarisSuresi', detay.tahminiVarisSuresi, 'number')
      + '</div>'
      /* V191d — Section 4: Evrak Durumu + Müşteri Kargo (15 gün alarm tetiği) */
      + '<div style="font-size:10px;font-weight:600;color:#185FA5;margin:12px 0 10px;text-transform:uppercase;letter-spacing:.05em">📑 ' + (typeof window.t === 'function' ? window.t('ed.detay.section.evrak') : 'Evrak Durumu + Müşteri Kargo') + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + '<div style="margin-bottom:10px;grid-column:span 2"><div style="' + labelStyle + '">' + (typeof window.t === 'function' ? window.t('ed.detay.evrakDurumu') : 'Evrak Durumu') + '</div>'
        + '<select id="lid-evrakDurumu" style="' + inputStyle + '">'
        + '<option value="HAZIRLANIYOR"' + ((detay.evrakDurumu || 'HAZIRLANIYOR') === 'HAZIRLANIYOR' ? ' selected' : '') + '>' + (typeof window.t === 'function' ? window.t('ed.detay.evrakDurumu.HAZIRLANIYOR') : 'Hazırlanıyor') + '</option>'
        + '<option value="MUSTERIYE_KARGOLANDI"' + (detay.evrakDurumu === 'MUSTERIYE_KARGOLANDI' ? ' selected' : '') + '>' + (typeof window.t === 'function' ? window.t('ed.detay.evrakDurumu.MUSTERIYE_KARGOLANDI') : 'Müşteriye Kargolandı') + '</option>'
        + '<option value="TESLIM_EDILDI"' + (detay.evrakDurumu === 'TESLIM_EDILDI' ? ' selected' : '') + '>' + (typeof window.t === 'function' ? window.t('ed.detay.evrakDurumu.TESLIM_EDILDI') : 'Teslim Edildi') + '</option>'
        + '<option value="EKSIK_EVRAK"' + (detay.evrakDurumu === 'EKSIK_EVRAK' ? ' selected' : '') + '>' + (typeof window.t === 'function' ? window.t('ed.detay.evrakDurumu.EKSIK_EVRAK') : 'Eksik Evrak') + '</option>'
        + '</select></div>'
      + fld((typeof window.t === 'function' ? window.t('ed.detay.kargoFirmasi') : 'Kargo Firması') + ' *', 'lid-kargoFirmasi', detay.kargoFirmasi)
      + fld((typeof window.t === 'function' ? window.t('ed.detay.kargoTakipNo') : 'Kargo Takip No') + ' *', 'lid-kargoTakipNo', detay.kargoTakipNo)
      + '<div style="margin-bottom:10px;grid-column:span 2"><div style="' + labelStyle + '">' + (typeof window.t === 'function' ? window.t('ed.detay.kargoTakipLink') : 'Kargo Takip Linki') + '</div>'
        + '<input id="lid-kargoTakipLink" type="url" value="' + escHtml(detay.kargoTakipLink || '') + '" style="' + inputStyle + '"></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr;gap:10px;margin-top:8px">'
      + textarea('Notlar', 'lid-notlar', detay.notlar)
      + '</div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:0.5px solid var(--b);display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn btns" onclick="document.getElementById(\'mo-loj-ihracat-detay\')?.remove()">' + (canEdit ? 'İptal' : 'Kapat') + '</button>'
      + (canEdit ? '<button class="btn btnp" onclick="window._lojIhracatDetayKaydet(\'' + escHtml(ihracatId) + '\')">Kaydet</button>' : '')
      + '</div>'
      + '</div>';
    document.body.appendChild(mo);
    /* V185b3+: salt okunur → tüm input/textarea/select disable et */
    if (!canEdit) {
      mo.querySelectorAll('input, textarea, select').forEach(function(el) {
        el.readOnly = true;
        el.disabled = true;
        el.style.background = 'var(--s2,#f3f4f6)';
        el.style.color = 'var(--t3,#9CA3AF)';
        el.style.cursor = 'not-allowed';
      });
      var titleEl = mo.querySelector('[data-modal-title]');
      if (titleEl) titleEl.textContent = '🔒 ' + (typeof window.t === 'function' ? window.t('ed.detay.title.readonly') : 'İhracat Detayı (Salt Okunur)');
    }
    setTimeout(function() { mo.classList.add('open'); }, 10);
  };

  window._lojIhracatDetayKaydet = function(ihracatId) {
    if (!canEditDetay()) {
      window.toast && window.toast(t('ed.toast.permissionDenied'), 'warn');
      return;
    }
    var g = function(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; };
    var data = {
      konteynerNo: g('lid-konteynerNo').slice(0, 30),
      muhurNo: g('lid-muhurNo').slice(0, 30),
      ardiyesizGirisTarihi: g('lid-ardiyesizGirisTarihi'),
      cutOffTarihi: g('lid-cutOffTarihi'),
      bookingNo: g('lid-bookingNo').slice(0, 50),
      forwarder: g('lid-forwarder').slice(0, 100),
      hatLine: g('lid-hatLine').slice(0, 30),
      trackingUrl: g('lid-trackingUrl').slice(0, 500),
      gemiAdi: g('lid-gemiAdi').slice(0, 50),
      seferNo: g('lid-seferNo').slice(0, 30),
      limanTerminal: g('lid-limanTerminal').slice(0, 80),
      yuklemeNoktasi: g('lid-yuklemeNoktasi').slice(0, 80),
      cikisLimani: g('lid-cikisLimani').slice(0, 50),
      varisLimani: g('lid-varisLimani').slice(0, 50),
      tahminiVarisSuresi: g('lid-tahminiVarisSuresi'),
      /* V191d — Evrak + Müşteri Kargo (15 gün alarm tetiği) */
      evrakDurumu: g('lid-evrakDurumu') || 'HAZIRLANIYOR',
      kargoFirmasi: g('lid-kargoFirmasi').slice(0, 80),
      kargoTakipNo: g('lid-kargoTakipNo').slice(0, 80),
      kargoTakipLink: g('lid-kargoTakipLink').slice(0, 500),
      notlar: g('lid-notlar').slice(0, 500)
    };
    /* V191d — Form validation: MUSTERIYE_KARGOLANDI seçilirse kargoFirmasi + kargoTakipNo zorunlu */
    if (data.evrakDurumu === 'MUSTERIYE_KARGOLANDI') {
      if (!data.kargoFirmasi || !data.kargoTakipNo) {
        window.toast && window.toast(t('ed.toast.kargoZorunlu'), 'warn');
        return;
      }
    }
    var ok = saveDetay(ihracatId, data);
    if (ok) {
      window.toast && window.toast(t('ed.toast.detaySaved'), 'ok');
      /* V185 / B5: ihracat detay save audit log */
      try { if (typeof window.logActivity === 'function') window.logActivity('ihracat_detay_saved', 'ihracatId=' + ihracatId + ' fields=' + Object.keys(data).filter(function(k){return data[k];}).join(',')); } catch(e) {}
      document.getElementById('mo-loj-ihracat-detay')?.remove();
      if (typeof window._edRefresh === 'function') window._edRefresh();
    } else {
      window.toast && window.toast(t('ed.toast.deleteFailed'), 'err');
    }
  };

  console.log(LOG_PREFIX, 'V184a5 yüklendi: İhracat detay modal + zengin grup başlığı + collapse');
})();
