/**
 * DASHBOARD-IMPROVE-001 (V158)
 *
 * AMAC: Mevcut dashboard'i SIFIRDAN YAZMADAN gelistir. 4 is + 5 mikro tasarim fix.
 *
 * 4 IS:
 *   1. "Yeni dashboard yapimi devam ediyor" placeholder kaldir
 *   2. "Detay Gorunum" buton kaldir (routing bozuk, 2 sayfa -> 1 sayfa)
 *   3. Bos alert filtre — tutar 0, cari "—", "· 0" pattern gizle
 *   4. Greeting time-aware — 0-6 gece, 6-12 sabah, 12-18 ogle, 18+ aksam + emoji
 *
 * 5 MIKRO TASARIM FIX:
 *   1. Metric kart hover — border tone-up + shadow + 120ms transition
 *   2. Alert kart hover lift — translateY(-1px)
 *   3. tabular-nums — sayilar dikey hizali
 *   4. Greeting emoji
 *   5. Card subtle shadow
 *
 * KX9: dashboard.js DOKUNULMAZ (1009 satir).
 * KX8: Mevcut HTML kopyalanmadi, sadece DOM mutate.
 *
 * STRATEJI: window.renderDashboard wrap (en dis katman, hijack zincirini bozmaz).
 *           T2 keşfi: dashboard.js:1003 _dashYeniRender'i atadi → biz onu wrap ediyoruz.
 *           V155 MutationObserver modal'a bakiyor — cakisma yok.
 *
 * IDEMPOTENT: Her render'da _improve() guvenli — flag'lerle (data-v158-*) tekrar etmez.
 *
 * Anayasa:
 *   K01 ≤800 satir · KX3 yeni dosya · KX5 saha test prod (V152-V157 deseni)
 *   EK KRITIK KURAL — kopya YOK, mevcut DOM mutate
 */
(function () {
  'use strict';

  if (window._v158Applied) return;
  window._v158Applied = true;

  /* ════════════════════════════════════════════════════════════
   * IS 1 — Placeholder kaldir
   * ════════════════════════════════════════════════════════════ */
  function _removePlaceholder(panel) {
    var divs = panel.querySelectorAll('div');
    var removed = 0;
    for (var i = 0; i < divs.length; i++) {
      var d = divs[i];
      var t = (d.textContent || '').trim();
      if (t.indexOf('Yeni dashboard yapımı devam ediyor') === 0 && d.children.length === 0) {
        d.remove();
        removed++;
      }
    }
    return removed;
  }

  /* ════════════════════════════════════════════════════════════
   * IS 2 — "Detay Gorunum" buton kaldir (yanlis sayfaya gidiyor)
   * ════════════════════════════════════════════════════════════ */
  function _removeDetayBtn(panel) {
    var btns = panel.querySelectorAll('button');
    var removed = 0;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var t = (b.textContent || '').trim();
      if (t.indexOf('Detay Görünüm') === 0) {
        var wrapper = b.parentElement;
        if (wrapper && wrapper.children.length === 1 && wrapper !== panel) {
          wrapper.remove();
        } else {
          b.remove();
        }
        removed++;
      }
    }
    return removed;
  }

  /* ════════════════════════════════════════════════════════════
   * IS 3 — Bos alert filtre
   *   Tespit kurallari:
   *     - "— · 0" pattern (cari yok + tutar 0)
   *     - ":  · 0" pattern
   *     - "· 0" sonu (tutar 0)
   *   Idempotent: data-v158-hidden="1" flag
   * ════════════════════════════════════════════════════════════ */
  function _cleanEmptyAlerts(panel) {
    var divs = panel.querySelectorAll('div[onclick]');
    var hidden = 0;
    for (var i = 0; i < divs.length; i++) {
      var d = divs[i];
      if (d.dataset.v158Hidden === '1') continue;
      var t = (d.textContent || '').trim();
      if (!t) continue;

      var isAlert = (
        t.indexOf('Gecikmiş tahsilat') >= 0 ||
        t.indexOf('Onay bekliyor') >= 0 ||
        t.indexOf('🚨') >= 0 ||
        t.indexOf('⏳') >= 0
      );
      if (!isAlert) continue;

      var isEmpty = (
        /—\s*·\s*0(\s|$)/.test(t) ||
        /:\s*—\s*·/.test(t) ||
        /·\s*0\s*$/.test(t) ||
        /·\s*0\s+→/.test(t)
      );
      if (isEmpty) {
        d.style.display = 'none';
        d.dataset.v158Hidden = '1';
        hidden++;
      }
    }
    return hidden;
  }

  /* ════════════════════════════════════════════════════════════
   * IS 4 — Time-aware greeting
   *   Dashboard "İyi günler, X" basliyor — saate gore degistir.
   *   Idempotent: data-v158-greeting flag (saatlik fresh — saat gecince yeniler)
   * ════════════════════════════════════════════════════════════ */
  function _updateGreeting(panel) {
    var h = new Date().getHours();
    var prefix, emoji, slot;
    if (h < 6)        { prefix = 'İyi geceler';  emoji = '🌙'; slot = 'g'; }
    else if (h < 12)  { prefix = 'Günaydın';     emoji = '🌅'; slot = 's'; }
    else if (h < 18)  { prefix = 'İyi öğleden';  emoji = '☀️'; slot = 'o'; }
    else              { prefix = 'İyi akşamlar'; emoji = '🌆'; slot = 'a'; }

    /* Greeting'i bul — direkt panel children, ilk seviye */
    var els = panel.querySelectorAll('div, h1, h2, h3');
    var updated = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      /* Aynı saatte tekrar gun guncellemesin */
      if (el.dataset.v158Greeting === slot) continue;
      /* Sadece text-leaf veya emoji+text leaf'e dokun */
      if (el.children.length > 1) continue;

      var inner = el.innerHTML;
      if (!inner) continue;
      var rxStart = /^(?:🌅|☀️|🌆|🌙)?\s*(İyi günler|Günaydın|İyi öğleden|İyi akşamlar|İyi geceler),/;
      if (!rxStart.test(inner)) continue;

      var newInner = inner.replace(rxStart, emoji + ' ' + prefix + ',');
      if (newInner !== inner) {
        el.innerHTML = newInner;
        el.dataset.v158Greeting = slot;
        updated++;
      }
    }
    return updated;
  }

  /* ════════════════════════════════════════════════════════════
   * MIKRO TASARIM FIX — CSS inject (idempotent, tek sefer)
   *   - Metric kart hover (kart selector: panel-dashboard direkt onclick'li div)
   *   - Alert hover lift
   *   - tabular-nums tum dashboard'a
   *   - Subtle shadow
   *   CSS vars sistemine dokunmadan, fallback hex/rgba kullaniyor.
   * ════════════════════════════════════════════════════════════ */
  function _injectStyles() {
    if (document.getElementById('v158-dash-styles')) return;
    var css = [
      '#panel-dashboard { font-variant-numeric: tabular-nums; }',
      '#panel-dashboard div[onclick] { transition: background-color .12s ease, border-color .12s ease, box-shadow .12s ease, transform .12s ease; }',
      '#panel-dashboard div[onclick]:hover { box-shadow: 0 1px 4px rgba(0,0,0,.06); transform: translateY(-1px); }',
      '#panel-dashboard [data-v158-hidden="1"] { display: none !important; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'v158-dash-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ════════════════════════════════════════════════════════════
   * IMPROVE — render sonrasi DOM mutate
   * ════════════════════════════════════════════════════════════ */
  function _improve() {
    var panel = document.getElementById('panel-dashboard');
    if (!panel) return;
    _injectStyles();
    var r1 = _removePlaceholder(panel);
    var r2 = _removeDetayBtn(panel);
    var r3 = _cleanEmptyAlerts(panel);
    var r4 = _updateGreeting(panel);
    if (window._v158Debug) {
      console.log('[V158] improve:', { placeholder: r1, detay: r2, empty_alerts: r3, greeting: r4 });
    }
  }

  /* ════════════════════════════════════════════════════════════
   * RENDER WRAP — window.renderDashboard
   *   T2 keşfi: dashboard.js:1003'te window.renderDashboard = _dashYeniRender atanmis.
   *   Biz onu wrap ediyoruz — hijack chain'in en disinda.
   * ════════════════════════════════════════════════════════════ */
  function _wrap() {
    var orig = window.renderDashboard;
    if (typeof orig !== 'function') {
      console.warn('[V158] renderDashboard yok, wrap atlandi');
      return false;
    }
    if (window._origRenderDashboard_V158) return true;
    window._origRenderDashboard_V158 = orig;
    window.renderDashboard = function () {
      var result = orig.apply(this, arguments);
      setTimeout(_improve, 80);
      return result;
    };
    return true;
  }

  /* ════════════════════════════════════════════════════════════
   * APPLY — ilk yukleme + observer fallback
   * ════════════════════════════════════════════════════════════ */
  function _apply() {
    var ok = _wrap();

    /* Eger dashboard zaten render edilmis ise hemen improve et */
    if (document.getElementById('panel-dashboard')) {
      setTimeout(_improve, 100);
    }

    /* MutationObserver fallback — dashboard sonradan visible olursa.
     * V155 observer modal'a baktigi icin cakisma yok.
     * Sadece panel-dashboard child mutation'larini izliyoruz. */
    try {
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n.nodeType !== 1) continue;
            if (n.id === 'panel-dashboard' || (n.querySelector && n.querySelector('#panel-dashboard'))) {
              setTimeout(_improve, 100);
              return;
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      console.warn('[V158] observer kurulamadi:', e);
    }

    window._v158Status = { wrap: ok, applied: true };
    console.log('[V158 dashboard improve] aktif');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_apply, 250); });
  } else {
    setTimeout(_apply, 250);
  }

  /* DASHBOARD-IMPROVE-001 — V158 sonu */
})();
