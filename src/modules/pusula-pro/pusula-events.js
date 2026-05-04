/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-events.js — V170.3.15 POPULATE
   Sorumluluk: @mention autocomplete + emoji picker + bildirim notif gönderme
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-EVENTS-POPULATE-001
   Kaynak: pusula_pro.js bölgesi (KX8 birebir kopya):
       PP-GOREV-MENTION-001 bloğu L3311-3477 (167 satır)
       _ppGorevMentionDetect       L3314-3331  Caret pozisyon @query yakalama
       _ppGorevMentionDropdownAc   L3333-3372  Filtered user dropdown
       _ppGorevMentionInsert       L3374-3410  <span class="pp-mention"> insert
       _ppGorevMentionKapat        L3412-3414
       _ppEmojiSec                 L3417-3425  Emoji insert at caret
       _ppGorevMentionParse        L3428-3438  HTML → mention metadata extract
       _ppGorevMentionNotifGonder  L3440-3462  Firestore notifications batch
       window.openPusDetail        L3470-3476  database.js köprü (görev edit aç)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.events (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ DOM: ppf-aciklama (contenteditable), ppf-mention-dropdown
   ⚠ FIRESTORE: _ppGorevMentionNotifGonder → notifications/<uid> batch yazımı
                typeof firebase guard'lı orijinalde
   ⚠ DEFENSIVE: window.openPusDetail database.js _goToTask köprüsü için tanımlı
                _ppGorevDuzenle (modal-task ✓) ya da _ppGorevPeek (render-detail ✓)
                fallback'lı çağrı zinciri
   ⚠ Bağımlılık: window._ppEsc, _ppCu (core ✓)
                 window._ppGorevDuzenle (modal-task ✓ Cycle 3.2.10)
                 window._ppGorevPeek (render-detail ✓ Cycle 3.2.9)
                 firebase.firestore (global SDK)
                 loadUsers (global, eski Pusula çalışan listesi)
   ⚠ ATLANANLAR (önceki cycle'lara):
       window._ppAbonelikSil L3478-3484 → modal-payment ✓ (Cycle 3.2.11)
       _ppAltGorevToggleRow L3490-3498 → render-detail ✓ (Cycle 3.2.9)
══════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.events) window.PusulaPro.events = {};
  if (window._ppEventsLoaded) return;
  window._ppEventsLoaded = true;

// [PP-GOREV-MENTION-001 START] @Mention autocomplete (ppf-aciklama contenteditable için)
// Caret pozisyonunda son @<query> yakala, loadUsers() filter, click ile <span class="pp-mention"> insert.

window._ppGorevMentionDetect = function(ev) {
  try {
    var el = document.getElementById('ppf-aciklama');
    if (!el) return;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { window._ppGorevMentionKapat(); return; }
    var range = sel.getRangeAt(0);
    var textNode = range.startContainer;
    if (textNode.nodeType !== 3) { window._ppGorevMentionKapat(); return; }
    var text = textNode.textContent.slice(0, range.startOffset);
    var match = /@(\w*)$/.exec(text);
    if (match) {
      window._ppGorevMentionDropdownAc(match[1], el);
    } else {
      window._ppGorevMentionKapat();
    }
  } catch(e) { console.warn('[PP-MENTION]', e.message); }
};

window._ppGorevMentionDropdownAc = function(query, anchorEl) {
  var users = (typeof window.loadUsers === 'function' ? window.loadUsers() : [])
    .filter(function(u) { return !u.isDeleted; })
    .map(function(u) {
      return {
        key: u.uid || u.id || u.email || '',
        label: u.displayName || u.ad || u.name || u.email || '?',
        email: u.email || ''
      };
    });
  var q = (query || '').toLowerCase();
  var filtered = q
    ? users.filter(function(u) { return u.label.toLowerCase().indexOf(q) >= 0 || u.email.toLowerCase().indexOf(q) >= 0; })
    : users.slice(0, 8);
  filtered = filtered.slice(0, 8);

  var existing = document.getElementById('pp-mention-dropdown');
  if (existing) existing.remove();

  if (!filtered.length) return;

  var dropdown = document.createElement('div');
  dropdown.id = 'pp-mention-dropdown';
  dropdown.className = 'pp-mention-dropdown';
  var rect = anchorEl.getBoundingClientRect();
  dropdown.style.cssText = 'position:fixed;top:' + (rect.bottom + 4) + 'px;left:' + rect.left + 'px;width:240px;max-height:200px;overflow-y:auto;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;box-shadow:var(--pp-shadow-lg);z-index:10000;font-family:inherit';

  var esc = window._ppEsc || function(s){ return String(s||'').replace(/[<>&"']/g, function(m){ return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[m]; }); };
  var html = '';
  filtered.forEach(function(u) {
    html += '<div class="pp-mention-item" onmousedown="event.preventDefault();window._ppGorevMentionInsert(\'' + esc(u.label).replace(/'/g, '&#39;') + '\')" '
         + 'style="padding:7px 10px;cursor:pointer;font-size:var(--pp-body);color:var(--t);border-bottom:0.5px solid var(--b)" '
         + 'onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
         + '<div style="font-weight:500">' + esc(u.label) + '</div>'
         + (u.email ? '<div style="font-size:var(--pp-meta);color:var(--t3)">' + esc(u.email) + '</div>' : '')
         + '</div>';
  });
  dropdown.innerHTML = html;
  document.body.appendChild(dropdown);
};

window._ppGorevMentionInsert = function(label) {
  // PP-GOREV-MENTION-CLEANUP-001: parametre adı 'label' (callsite displayName/ad/name/email zincirinden string geçiyor)
  try {
    var el = document.getElementById('ppf-aciklama');
    if (!el) return;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var textNode = range.startContainer;
    if (textNode.nodeType !== 3) { window._ppGorevMentionKapat(); return; }
    var caret = range.startOffset;
    var text = textNode.textContent.slice(0, caret);
    var match = /@(\w*)$/.exec(text);
    if (!match) { window._ppGorevMentionKapat(); return; }
    var startOffset = caret - match[0].length;
    var deleteRange = document.createRange();
    deleteRange.setStart(textNode, startOffset);
    deleteRange.setEnd(textNode, caret);
    deleteRange.deleteContents();
    var mention = document.createElement('span');
    mention.className = 'pp-mention';
    mention.contentEditable = 'false';
    mention.style.cssText = 'background:#E6F1FB;color:#3B82F6;padding:1px 5px;border-radius:3px;font-weight:500';
    mention.textContent = '@' + label;
    deleteRange.insertNode(mention);
    var space = document.createTextNode(' ');
    if (mention.nextSibling) mention.parentNode.insertBefore(space, mention.nextSibling);
    else mention.parentNode.appendChild(space);
    var newRange = document.createRange();
    newRange.setStart(space, 1);
    newRange.setEnd(space, 1);
    sel.removeAllRanges();
    sel.addRange(newRange);
    el.focus();
    window._ppGorevMentionKapat();
  } catch(e) { console.warn('[PP-MENTION-INSERT]', e.message); window._ppGorevMentionKapat(); }
};

window._ppGorevMentionKapat = function() {
  document.getElementById('pp-mention-dropdown')?.remove();
};

/* PP-GOREV-VISUAL-001: emoji chip seçim toggle */
window._ppEmojiSec = function(emoji) {
  var hidden = document.getElementById('ppf-emoji');
  if (hidden) hidden.value = emoji;
  document.querySelectorAll('.pp-emoji-chip').forEach(function(btn) {
    var aktif = (btn.dataset.emoji === emoji);
    btn.style.background = aktif ? 'var(--sf)' : 'transparent';
    btn.style.borderColor = aktif ? 'var(--t)' : 'var(--b)';
  });
};

// PP-GOREV-NOTIF-001: aciklama HTML'inden mention parse + addNotif dispatch
window._ppGorevMentionParse = function(html) {
  if (!html || typeof html !== 'string') return [];
  var labels = [];
  var regex = /<span[^>]*class="[^"]*pp-mention[^"]*"[^>]*>@([^<]+)<\/span>/g;
  var m;
  while ((m = regex.exec(html)) !== null) {
    var label = m[1] && m[1].trim();
    if (label && labels.indexOf(label) < 0) labels.push(label);
  }
  return labels;
};

window._ppGorevMentionNotifGonder = function(taskId, taskBaslik, aciklamaHtml) {
  if (typeof window.addNotif !== 'function') return;
  var labels = window._ppGorevMentionParse(aciklamaHtml);
  if (!labels.length) return;
  var users = (typeof window.loadUsers === 'function' ? window.loadUsers() : [])
    .filter(function(u) { return !u.isDeleted; });
  var cu = (typeof window.CU === 'function' ? window.CU() : null) || {};
  var cuName = cu.displayName || cu.name || cu.email || 'Birisi';
  var cuId = cu.uid || cu.id || cu.email || '';
  labels.forEach(function(label) {
    var matched = users.find(function(u) {
      var ulabel = u.displayName || u.ad || u.name || u.email || '';
      return ulabel === label;
    });
    if (!matched) return;
    var targetUid = matched.uid || matched.id || matched.email;
    if (!targetUid || String(targetUid) === String(cuId)) return;
    var msg = cuName + ' sizi bir görevde bahsetti: ' + (taskBaslik || '');
    try {
      window.addNotif('💬', msg, 'info', 'pusula', targetUid, taskId);
    } catch(e) { console.warn('[PP-MENTION-NOTIF-FAIL]', e.message); }
  });
};

// PP-GOREV-NOTIF-LINK-001: bildirim paneli mention notif tıklama → görev edit modal
// _goToTask (database.js:2663) setInterval içinde window.openPusDetail çağırır.
// Bu fn'i biz tanımlayarak akışı tamamlıyoruz: panel aç → görev modal aç.
window.openPusDetail = function(taskId) {
  if (!taskId) return;
  if (typeof window._ppGorevDuzenle === 'function') {
    window._ppGorevDuzenle(taskId);
  } else if (typeof window._ppGorevPeek === 'function') {
    // Fallback: edit fn yoksa peek modal aç (görüntüleme)
    window._ppGorevPeek(taskId);
  }
};
// [PP-GOREV-MENTION-001 END]


  /* ── V170.3.15 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppGorevMentionDetect) {
    Object.assign(window, {
      _ppGorevMentionDetect: window._ppGorevMentionDetect,
      _ppGorevMentionDropdownAc: window._ppGorevMentionDropdownAc,
      _ppGorevMentionInsert: window._ppGorevMentionInsert,
      _ppGorevMentionKapat: window._ppGorevMentionKapat,
      _ppEmojiSec: window._ppEmojiSec,
      _ppGorevMentionParse: window._ppGorevMentionParse,
      _ppGorevMentionNotifGonder: window._ppGorevMentionNotifGonder,
      openPusDetail: window.openPusDetail
    });
  }

  /* ── V170.3.15 CANONICAL PusulaPro.events EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.events, {
    _ppGorevMentionDetect: window._ppGorevMentionDetect,
    _ppGorevMentionDropdownAc: window._ppGorevMentionDropdownAc,
    _ppGorevMentionInsert: window._ppGorevMentionInsert,
    _ppGorevMentionKapat: window._ppGorevMentionKapat,
    _ppEmojiSec: window._ppEmojiSec,
    _ppGorevMentionParse: window._ppGorevMentionParse,
    _ppGorevMentionNotifGonder: window._ppGorevMentionNotifGonder,
    openPusDetail: window.openPusDetail
  });
})();
