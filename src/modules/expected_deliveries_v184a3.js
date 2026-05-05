/* ============================================================================
 * V184a3 / LOJ-IHRACAT-WIZARD-GROUP-001  (V184a4-fix iterasyonu)
 * ----------------------------------------------------------------------------
 * Wrap modülü: orijinal expected_deliveries.js INTACT kalır.
 *
 * 1) Wizard tepesine "İhracat Bilgileri" bölümü (admin/manager-only)
 *    - Yeni kayıt: editable manuel input (max 15 char)
 *    - Düzenleme: readonly (değişiklik için aksiyon menüsü → tahkim)
 *
 * 2) renderEdList wrap → liste İhracat ID'ye göre gruplandırılır
 *    - Atanmamış kayıtlar ÜSTTE
 *    - Sadece admin/manager grup görür; user/staff/lead düz liste
 *
 * 3) Boundary algoritması — DETERMINISTIC brace counting:
 *    - Her row için <div> open/close depth sayılır
 *    - Row sonu: depth=0'a düştüğü ilk </div>
 *    - Postface: son row sonu sonrasında kalan tüm HTML (footer + container kapanışı)
 *    - Container açılışı + header + filterBar + hdrRow = preface (ilk match öncesi)
 *    - Container kapanışı string slicing ile karışmaz
 *
 * 4) Idempotent guard: zaten gruplandırılmış HTML'i (marker varsa) tekrar gruplandırma
 *
 * Co-Authored-By: Claude
 * ========================================================================== */
(function() {
  'use strict';

  var LOG_PREFIX = '[V184a3]';
  var GROUP_MARKER = 'data-v184a3-group="1"'; // idempotent kontrol marker

  /* ─────────────── Yardımcılar ─────────────── */

  function isAdminOrManager() {
    var cu = (typeof window.CU === 'function') ? window.CU() : null;
    if (!cu) return false;
    var role = cu.role || cu.rol;
    return role === 'admin' || role === 'manager' || role === 'super_admin';
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ihracatBolumHtml(currentValue, isReadonly) {
    if (!isAdminOrManager()) return '';
    var val = (currentValue || '').toString().slice(0, 15);
    var inputStyle = isReadonly
      ? 'flex:1;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;font-size:12px;font-family:DM Mono,monospace;background:var(--s2);color:var(--t3);cursor:not-allowed'
      : 'flex:1;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;font-size:12px;font-family:DM Mono,monospace';
    var readonlyAttr = isReadonly ? 'readonly title="Değişiklik için aksiyon menüsünü kullanın"' : '';
    return '<div id="__v184a3-ihracat-bolum" style="grid-column:span 2;padding:10px 12px;background:rgba(24,95,165,0.04);border:0.5px solid rgba(24,95,165,0.2);border-radius:8px;margin-bottom:8px">'
      + '<div style="font-size:10px;font-weight:600;color:#185FA5;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">📋 İhracat Bilgileri</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<label for="__v184a3-ihracatId" style="font-size:11px;color:var(--t2);min-width:80px">İhracat ID</label>'
      + '<input id="__v184a3-ihracatId" maxlength="15" placeholder="EXP-2026-0042" '
      + readonlyAttr + ' style="' + inputStyle + '" value="' + escHtml(val) + '">'
      + '</div>'
      + (isReadonly ? '<div style="font-size:10px;color:var(--t3);margin-top:4px">⚠ Sonradan değişiklik için aksiyon menüsünü kullanın (tahkim onayı gerekebilir)</div>' : '')
      + '</div>';
  }

  /* ─────────────── 1. Düzenleme modal'ı (ede-) wrap ─────────────── */

  var origEdEditModal = window._edEditModal;
  if (typeof origEdEditModal === 'function') {
    window._edEditModal = function(edId) {
      origEdEditModal.apply(this, arguments);
      try {
        if (!isAdminOrManager()) return;
        var modal = document.getElementById('mo-ed-edit') || document.querySelector('.mo .moc');
        if (!modal) return;
        var list = (typeof window.loadExpectedDeliveries === 'function')
          ? (window.loadExpectedDeliveries({ raw: true }) || []) : [];
        var ed = list.find(function(x) { return String(x.id) === String(edId); });
        var ihracatId = ed ? (ed.ihracatId || '') : '';
        if (modal.querySelector('#__v184a3-ihracat-bolum')) return;
        var form = modal.querySelector('div[style*="grid-template-columns"]');
        if (form) {
          form.insertAdjacentHTML('afterbegin', ihracatBolumHtml(ihracatId, true));
        }
      } catch (e) { console.warn(LOG_PREFIX, 'düzenleme modal hook hatası:', e); }
    };
  }

  /* ─────────────── 2. Yeni kayıt wizard (edw-) wrap ─────────────── */

  var origEdWizardRender = window._edWizardRender;
  if (typeof origEdWizardRender === 'function') {
    window._edWizardRender = function() {
      origEdWizardRender.apply(this, arguments);
      try {
        if (!isAdminOrManager()) return;
        if (!window._edWizardState || window._edWizardState.step !== 1) return;
        var modal = document.getElementById('ed-wizard-modal');
        if (!modal) return;
        if (modal.querySelector('#__v184a3-ihracat-bolum')) return;
        var ihracatId = window._edWizardState.data.ihracatId || '';
        var form = modal.querySelector('div[style*="grid-template-columns"]');
        if (!form) return;
        form.insertAdjacentHTML('afterbegin', ihracatBolumHtml(ihracatId, false));
        var inp = document.getElementById('__v184a3-ihracatId');
        if (inp) {
          inp.addEventListener('input', function() {
            if (window._edWizardState && window._edWizardState.data) {
              window._edWizardState.data.ihracatId = (this.value || '').slice(0, 15);
            }
          });
        }
      } catch (e) { console.warn(LOG_PREFIX, 'wizard render hook hatası:', e); }
    };
  }

  /* ─────────────── 3. renderEdList wrap (gruplama) ─────────────── */

  var origRenderEdList = window.renderEdList;
  if (typeof origRenderEdList === 'function') {
    window.renderEdList = function() {
      var html = origRenderEdList.apply(this, arguments);
      try {
        return groupRowsByIhracatId(html);
      } catch (e) {
        console.warn(LOG_PREFIX, 'gruplama hatası, orijinal döndürülüyor:', e);
        return html;
      }
    };
  }

  /* DETERMINISTIC brace counting: row başından kapanış </div>'ine doğru atomic boundary bul */
  function findRowEnd(html, startIdx) {
    /* startIdx = '<div data-ed-id="..."'in başlangıcı.
     * Önce o div'in '>' kapanışını bul, sonra depth-counting ile atomic kapanış. */
    var openTagEnd = html.indexOf('>', startIdx);
    if (openTagEnd === -1) return -1;
    var i = openTagEnd + 1;
    var depth = 1; // başta 1 (outer div açık)
    var openRe = /<div\b/g;
    var closeRe = /<\/div>/g;
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    while (depth > 0 && i < html.length) {
      openRe.lastIndex = i;
      closeRe.lastIndex = i;
      var openMatch = openRe.exec(html);
      var closeMatch = closeRe.exec(html);
      if (!closeMatch) return -1; // malformed HTML
      if (openMatch && openMatch.index < closeMatch.index) {
        depth++;
        i = openMatch.index + 4;
      } else {
        depth--;
        i = closeMatch.index + 6;
        if (depth === 0) return i; // atomic row sonu
      }
    }
    return -1;
  }

  function groupRowsByIhracatId(html) {
    if (!html || typeof html !== 'string') return html;

    /* Idempotent guard: zaten gruplanmış HTML'i tekrar gruplandırma */
    if (html.indexOf(GROUP_MARKER) !== -1) {
      console.warn(LOG_PREFIX, 'idempotent skip — HTML zaten gruplandırılmış');
      return html;
    }

    /* Tüm row başlangıçlarını bul */
    var marker = /<div data-ed-id="[^"]*" data-ihracat-id="([^"]*)"/g;
    var matches = [];
    var m;
    while ((m = marker.exec(html)) !== null) {
      matches.push({ index: m.index, ihracatId: m[1] });
    }
    if (matches.length === 0) return html;

    /* Her row için atomic boundary (brace counting) */
    var rows = [];
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index;
      var end = findRowEnd(html, start);
      if (end === -1) {
        console.warn(LOG_PREFIX, 'malformed row HTML — gruplama iptal');
        return html;
      }
      rows.push({ ihracatId: matches[i].ihracatId, html: html.substring(start, end) });
    }

    /* Preface: ilk row öncesi (container açılışı + header + filterBar + hdrRow) */
    var preface = html.substring(0, matches[0].index);

    /* Postface: son row sonrası (footer + container kapanışı) — atomic boundary'den geri kalan */
    var lastRowEnd = findRowEnd(html, matches[matches.length - 1].index);
    var postface = html.substring(lastRowEnd);

    /* Gruplama */
    var groups = {}; // ihracatId → [rowHtml]
    rows.forEach(function(row) {
      var id = row.ihracatId || '__atanmamış__';
      if (!(id in groups)) groups[id] = [];
      groups[id].push(row.html);
    });

    /* Render: önce ATANMAMIŞ, sonra alfabetik */
    var output = preface;
    if (groups['__atanmamış__']) {
      output += renderGroupHeader(null, groups['__atanmamış__'].length);
      output += groups['__atanmamış__'].join('');
      delete groups['__atanmamış__'];
    }
    Object.keys(groups).sort().forEach(function(id) {
      output += renderGroupHeader(id, groups[id].length);
      output += groups[id].join('');
    });

    return output + postface;
  }

  /* Grup başlığı — idempotent marker içerir */
  function renderGroupHeader(ihracatId, count) {
    var bg, color, title, subtitle;
    if (ihracatId === null || !ihracatId) {
      bg = 'rgba(224,87,79,0.06)';
      color = '#A32D2D';
      title = '⚠️ İhracat ID Atanmamış';
      subtitle = count + ' kayıt — atama bekleniyor';
    } else {
      bg = 'rgba(24,95,165,0.06)';
      color = '#185FA5';
      title = '📦 ' + escHtml(ihracatId);
      subtitle = count + ' kalem';
    }
    return '<div ' + GROUP_MARKER + ' style="padding:10px 16px;background:' + bg + ';border-bottom:0.5px solid var(--b);border-top:2px solid ' + color + ';display:flex;align-items:center;justify-content:space-between">'
      + '<div>'
      + '<div style="font-size:13px;font-weight:600;color:' + color + ';font-family:DM Mono,monospace">' + title + '</div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + subtitle + '</div>'
      + '</div>'
      + '</div>';
  }

  console.log(LOG_PREFIX, 'V184a3 yüklendi (Wizard İhracat ID + Gruplama, brace counting)');
})();
