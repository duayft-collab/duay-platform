/* ============================================================================
 * V184a3 / LOJ-IHRACAT-WIZARD-GROUP-001
 * ----------------------------------------------------------------------------
 * Wrap modülü: orijinal expected_deliveries.js INTACT kalır, davranış genişler.
 *
 * 1) Wizard tepesine "İhracat Bilgileri" bölümü (admin/manager-only)
 *    - Yeni kayıt: editable (max 15 char, manuel input)
 *    - Düzenleme: readonly (değişiklik için aksiyon menüsü → tahkim)
 *
 * 2) renderEdList wrap → liste İhracat ID'ye göre gruplandırılır
 *    - Her grup: başlık + alt satırlar (mevcut row HTML'i intact)
 *    - Atanmamış kayıtlar ÜSTTE ayrı grup (Q2 onayı)
 *    - Sadece admin/manager grup görür; user/staff/lead düz liste görür
 *
 * 3) Gruplama mekanizması: row'da data-ihracat-id attribute'ı (EDIT 1 ile eklendi)
 *
 * Rollback: bu dosyayı sil + index.html script tag kaldır.
 * Co-Authored-By: Claude
 * ========================================================================== */
(function() {
  'use strict';

  var LOG_PREFIX = '[V184a3]';

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
        if (modal.querySelector('#__v184a3-ihracat-bolum')) return; // çift enjeksiyon engeli
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
        if (modal.querySelector('#__v184a3-ihracat-bolum')) return; // step rerender'da duplicate engeli
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
      if (!isAdminOrManager()) return html; // user/staff/lead düz liste görür
      try {
        return groupRowsByIhracatId(html);
      } catch (e) {
        console.warn(LOG_PREFIX, 'gruplama hatası, orijinal döndürülüyor:', e);
        return html;
      }
    };
  }

  /* HTML string içindeki row'ları (data-ed-id'li div'leri) ihracatId'ye göre grupla */
  function groupRowsByIhracatId(html) {
    if (!html || typeof html !== 'string') return html;
    /* Tüm row'ları regex ile bul: <div data-ed-id="..." data-ihracat-id="..."...>...</div> (top-level)
     * NOT: nested div'ler için bracket counting gerekir. Bunun yerine row başlangıçlarını bul,
     * ardından bir sonraki row başlangıcına kadar olan kısmı grupla. */
    var marker = /<div data-ed-id="[^"]*" data-ihracat-id="([^"]*)"/g;
    var matches = [];
    var m;
    while ((m = marker.exec(html)) !== null) {
      matches.push({ index: m.index, ihracatId: m[1] });
    }
    if (matches.length === 0) return html; // row bulunamadı, orijinal döndür

    /* Her match'in başladığı yer + sonraki match'in başına kadar = bir row */
    var rows = [];
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index;
      var end = (i + 1 < matches.length) ? matches[i + 1].index : html.length;
      rows.push({ ihracatId: matches[i].ihracatId, html: html.substring(start, end) });
    }

    /* Match'lerden öncesi (header vs.) ve sonrası (footer vs.) — burada yok ama her ihtimale karşı koru */
    var preface = html.substring(0, matches[0].index);
    var postface = ''; // tüm satırlar match arasında bittiği için son row'un sonu html.length

    /* Gruplara böl */
    var groups = {}; // ihracatId → [rows]
    var groupOrder = []; // ID'lerin listede ilk göründüğü sıra
    rows.forEach(function(row) {
      var id = row.ihracatId || '__atanmamış__';
      if (!(id in groups)) {
        groups[id] = [];
        groupOrder.push(id);
      }
      groups[id].push(row.html);
    });

    /* Render: önce ATANMAMIŞ (Q2), sonra diğerleri */
    var output = preface;
    if (groups['__atanmamış__']) {
      output += renderGroupHeader(null, groups['__atanmamış__'].length);
      output += groups['__atanmamış__'].join('');
      delete groups['__atanmamış__'];
    }
    /* Diğer gruplar — ihracat ID alfabetik sıraya göre (yeni ID'ler genelde tarih içerir, doğal sırada gelir) */
    var idList = Object.keys(groups).sort();
    idList.forEach(function(id) {
      output += renderGroupHeader(id, groups[id].length);
      output += groups[id].join('');
    });

    return output + postface;
  }

  /* Grup başlığı HTML'i — her ed listesini topluca özetler */
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
    return '<div style="padding:10px 16px;background:' + bg + ';border-bottom:0.5px solid var(--b);border-top:2px solid ' + color + ';display:flex;align-items:center;justify-content:space-between">'
      + '<div>'
      + '<div style="font-size:13px;font-weight:600;color:' + color + ';font-family:DM Mono,monospace">' + title + '</div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + subtitle + '</div>'
      + '</div>'
      + '</div>';
  }

  /* ─────────────── Boot log ─────────────── */
  console.log(LOG_PREFIX, 'V184a3 yüklendi: Wizard İhracat ID + Liste gruplama');
})();
