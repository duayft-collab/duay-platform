/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/pages-main.js
 * V138.2 POPULATE — nav + dashboard + contacts + pipeline + meetings + tasks
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  function _root() { return document.getElementById('panel-sales-crm'); }
  function _q(sel) { var r = _root(); return r ? r.querySelector(sel) : null; }
  function _qa(sel) { var r = _root(); return r ? r.querySelectorAll(sel) : []; }

  function go(page) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.STATE.CUR = page;
    _qa('.scrm-page').forEach(function(p) { p.classList.remove('active'); });
    var el = _q('#scrm-page-' + page);
    if (el) el.classList.add('active');
    _qa('.scrm-ni').forEach(function(n) {
      n.classList.toggle('active', n.getAttribute('data-p') === page);
    });
    var T = {
      dashboard: 'Dashboard', musteriler: 'Müşteriler',
      pipeline: 'Satış Pipeline', meetings: 'Toplantılar',
      'musteri-kart': 'Müşteri Kartı', gorusme: 'Görüşme Kartı',
      spin: 'SPIN Analiz', 'musteri-analiz': 'Potansiyel Analiz',
      tasks: 'Görevler', eval: 'Satış Değerlendirme',
      kaynak: 'Kaynak & Soru Bankası', gurular: 'Gurular & Yazarlar',
      playbook: 'Playbook', baran: 'Baran & Gitomer Rehberi'
    };
    var pt = _q('#scrm-ptitle');
    if (pt) pt.textContent = T[page] || page;
    var R = {
      dashboard: rdDash, musteriler: rdContacts,
      pipeline: rdPipe, meetings: rdMeetings, tasks: rdTasks
    };
    if (R[page]) R[page]();
    var pages = window.SalesCRM.pages;
    if (pages && pages.renderRoute) pages.renderRoute(page);
  }

  function updBadges() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D;
    var nb = function(id, val) {
      var el = _q('#' + id);
      if (el) el.textContent = val;
    };
    nb('scrm-nb-c', D.contacts.length);
    nb('scrm-nb-p', D.deals.filter(function(d) { return d.asama !== 'Kapanış'; }).length);
    nb('scrm-nb-m', D.meetings.filter(function(m) { return new Date(m.tarih) > new Date(); }).length);
    nb('scrm-nb-t', D.tasks.filter(function(t) { return !t.tamamlandi; }).length);
  }

  function rdDash() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D, fM = core.fM, fDT = core.fDT, fD = core.fD, gC = core.gC, ini = core.ini, pb = core.pb, adCls = core.adCls;
    var tp = D.deals.reduce(function(s, d) { return s + Number(d.deger || 0); }, 0);
    var op = D.deals.filter(function(d) { return d.asama !== 'Kapanış'; });
    var cl = D.deals.filter(function(d) { return d.asama === 'Kapanış'; });
    var ot = D.tasks.filter(function(t) { return !t.tamamlandi; }).length;
    var el = _q('#scrm-dash-stats');
    if (!el) return;
    function sc(lb, val, ch, dir, col, pct) {
      return '<div class="sc"><div class="sl">' + lb + '</div><div class="sv">' + val + '</div><div class="sn ' + dir + '">' + ch + '</div><div class="sbar"><div class="sbf" style="width:' + pct + '%;background:' + col + '"></div></div></div>';
    }
    el.innerHTML =
      sc('Toplam Pipeline', fM(tp), '↑ ' + D.deals.length + ' fırsat', 'up', 'var(--blue)', 72) +
      sc('Aktif Fırsatlar', op.length, D.deals.length + ' toplam', '', 'var(--purple)', Math.round(op.length / Math.max(D.deals.length, 1) * 100)) +
      sc('Kapanış Aşaması', fM(cl.reduce(function(s, d) { return s + Number(d.deger || 0); }, 0)), cl.length + ' hazır', 'up', 'var(--green)', 88) +
      sc('Açık Görevler', ot, D.meetings.filter(function(m) { return new Date(m.tarih) > new Date(); }).length + ' toplantı', '', 'var(--amber)', Math.min(ot * 10, 100));
    var stgs = ['Prospecting', 'Nitelikli', 'Teklif', 'Müzakere', 'Kapanış'];
    var cols = ['#aeaeb2', '#0071e3', '#ff9f0a', '#af52de', '#34c759'];
    var vals = stgs.map(function(s) { return D.deals.filter(function(d) { return d.asama === s; }).reduce(function(r, d) { return r + Number(d.deger || 0); }, 0); });
    var mx = Math.max.apply(null, vals.concat([1]));
    var ch = _q('#scrm-pipe-chart');
    if (ch) ch.innerHTML = vals.map(function(v, i) {
      var h = Math.max(Math.round(v / mx * 55), 3);
      return '<div class="mcb" title="' + stgs[i] + ': ' + fM(v) + '" style="height:' + h + 'px;background:' + cols[i] + '"></div>';
    }).join('');
    var ss = _q('#scrm-stage-sum');
    if (ss) ss.innerHTML = stgs.map(function(s, i) {
      var d = D.deals.filter(function(x) { return x.asama === s; });
      var v = d.reduce(function(r, x) { return r + Number(x.deger || 0); }, 0);
      return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px"><div style="width:7px;height:7px;border-radius:50%;background:' + cols[i] + ';flex-shrink:0"></div><span style="font-size:12px;color:var(--scrm-tx3);flex:1">' + s + '</span><span style="font-size:11px;color:var(--scrm-tx3)">' + d.length + '</span><span style="font-size:12px;font-weight:600;color:var(--scrm-tx)">' + fM(v) + '</span></div>';
    }).join('');
  }

  function rdContacts() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D, FS = core.FS, gC = core.gC, fDT = core.fDT, fM = core.fM, ini = core.ini, sb = core.sb, potB = core.potB;
    var tb = _q('#scrm-c-tbody');
    if (!tb) return;
    var cs = D.contacts;
    if (FS.contact !== 'all') cs = cs.filter(function(c) { return c.durum === FS.contact; });
    if (FS.contactQ) {
      var q = FS.contactQ.toLowerCase();
      cs = cs.filter(function(c) { return ((c.ad || '') + (c.firma || '') + (c.email || '')).toLowerCase().indexOf(q) > -1; });
    }
    tb.innerHTML = cs.length ? cs.map(function(c) {
      var ds = D.deals.filter(function(d) { return d.musteriId === c.id; });
      var tv = ds.reduce(function(r, d) { return r + Number(d.deger || 0); }, 0);
      var la = D.activities.filter(function(a) { return a.musteriId === c.id; }).sort(function(a, b) { return new Date(b.tarih || b.olusturma || 0) - new Date(a.tarih || a.olusturma || 0); })[0];
      return '<tr data-cid="' + c.id + '"><td><div style="display:flex;align-items:center;gap:9px"><div class="av-sm" style="width:28px;height:28px;font-size:10px;border-radius:8px">' + ini(c.ad) + '</div><div><div class="tdn">' + c.ad + '</div><div style="font-size:10px;color:var(--scrm-tx3)">' + c.firma + (c.unvan ? ' · ' + c.unvan : '') + '</div></div></div></td>' +
        '<td><span class="badge bbgy">' + (c.sektor || '') + '</span></td>' +
        '<td><span class="badge ' + potB(c.potansiyelSinifi || 'B') + '">' + (c.potansiyelSinifi || 'B') + '</span></td>' +
        '<td><span class="badge ' + sb(c.durum) + '">' + (c.durum || '') + '</span></td>' +
        '<td style="font-size:11px;color:var(--scrm-tx3)">' + (la ? fDT(la.tarih || la.olusturma) : '–') + '</td>' +
        '<td style="font-size:12px;font-weight:600;color:var(--green)">' + (tv ? fM(tv) : '–') + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="ei">👥</div><div class="et">Müşteri bulunamadı</div></div></td></tr>';
  }

  function rdPipe() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D, FS = core.FS, gC = core.gC, fM = core.fM, ini = core.ini;
    var b = _q('#scrm-pipe-board');
    if (!b) return;
    var stgs = [
      { k: 'Prospecting', c: '#aeaeb2', e: '🔍' },
      { k: 'Nitelikli', c: '#0071e3', e: '⭐' },
      { k: 'Teklif', c: '#ff9f0a', e: '📄' },
      { k: 'Müzakere', c: '#af52de', e: '💬' },
      { k: 'Kapanış', c: '#34c759', e: '🏆' }
    ];
    var deals = D.deals;
    if (FS.pipe !== 'all') deals = deals.filter(function(d) { return d.asama === FS.pipe; });
    b.innerHTML = stgs.map(function(s) {
      var sd = deals.filter(function(d) { return d.asama === s.k; });
      var tot = sd.reduce(function(r, d) { return r + Number(d.deger || 0); }, 0);
      return '<div class="pcol"><div class="pch"><div class="pct"><span style="width:7px;height:7px;border-radius:50%;background:' + s.c + ';display:inline-block"></span>' + s.e + ' ' + s.k + ' <span class="pcnt">' + sd.length + '</span></div></div><div class="pctot">' + fM(tot) + '</div><div class="pcards">' +
        (sd.length === 0 ? '<div style="text-align:center;padding:14px 6px;color:var(--scrm-tx4);font-size:11px">Fırsat yok</div>' : '') +
        sd.map(function(d) {
          var c = gC(d.musteriId);
          var dl = Math.ceil((new Date(d.kapanisTarihi) - new Date()) / 86400000);
          return '<div class="pc" data-did="' + d.id + '"><div class="pc-t">' + d.ad + '</div><div class="pc-c">' + c.firma + '</div><div style="display:flex;align-items:flex-end;justify-content:space-between"><div><div class="pc-v">' + fM(d.deger) + '</div><div class="pc-p">%' + d.olasilik + '</div></div><div style="text-align:right"><div class="av-sm">' + ini(c.ad) + '</div><div style="font-size:9px;color:' + (dl < 7 ? 'var(--red)' : 'var(--scrm-tx3)') + ';margin-top:2px">' + (dl > 0 ? dl + 'g' : 'Geçti') + '</div></div></div></div>';
        }).join('') +
        '</div></div>';
    }).join('');
  }

  function rdMeetings() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D, FS = core.FS, gC = core.gC, fDT = core.fDT;
    var el = _q('#scrm-m-grid');
    if (!el) return;
    var now = new Date();
    var ms = [].concat(D.meetings).sort(function(a, b) { return new Date(a.tarih) - new Date(b.tarih); });
    if (FS.meet === 'up') ms = ms.filter(function(m) { return new Date(m.tarih) >= now; });
    else if (FS.meet === 'past') ms = ms.filter(function(m) { return new Date(m.tarih) < now; });
    el.innerHTML = ms.length ? ms.map(function(m) {
      var c = gC(m.musteriId);
      var ip = new Date(m.tarih) < now;
      var it = new Date(m.tarih).toDateString() === now.toDateString();
      return '<div class="mcard" data-mid="' + m.id + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7px"><div><div style="font-size:13px;font-weight:600;color:var(--scrm-tx)">' + m.baslik + '</div><div style="font-size:11px;color:var(--scrm-tx3)">' + c.ad + ' · ' + c.firma + '</div></div><span class="badge ' + (ip ? 'bbgy' : it ? 'bbr' : 'bbb') + '">' + (ip ? 'Geçmiş' : it ? 'Bugün' : 'Yaklaşan') + '</span></div>' +
        '<div style="display:flex;gap:10px;margin-bottom:7px"><span style="font-size:11px;color:var(--scrm-tx3)">📅 ' + fDT(m.tarih) + '</span><span style="font-size:11px;color:var(--scrm-tx3)">⏱ ' + (m.sure || 60) + ' dk</span></div>' +
        '<span class="badge bbgy">' + m.tur + '</span>' +
        (m.sonuc ? '<div style="margin-top:7px;padding:5px 8px;background:var(--gnbg);border-radius:6px;font-size:11px;color:var(--green)">✅ ' + m.sonuc + '</div>' : '') +
        '</div>';
    }).join('') : '<div class="empty" style="grid-column:1/-1"><div class="ei">📅</div><div class="et">Toplantı bulunamadı</div></div>';
  }

  function rdTasks() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var D = core.D, FS = core.FS, gC = core.gC, fD = core.fD, pb = core.pb;
    var tb = _q('#scrm-t-tbody');
    if (!tb) return;
    var ts = [].concat(D.tasks).sort(function(a, b) { return new Date(a.sonTarih) - new Date(b.sonTarih); });
    if (FS.task === 'open') ts = ts.filter(function(t) { return !t.tamamlandi; });
    else if (FS.task === 'done') ts = ts.filter(function(t) { return t.tamamlandi; });
    else if (FS.task === 'high') ts = ts.filter(function(t) { return t.oncelik === 'Yüksek' && !t.tamamlandi; });
    tb.innerHTML = ts.length ? ts.map(function(t) {
      var c = gC(t.musteriId);
      var dn = t.tamamlandi;
      var ov = !dn && new Date(t.sonTarih) < new Date();
      return '<tr data-tid="' + t.id + '" style="' + (dn ? 'opacity:.5' : '') + '"><td><div class="cb2 ' + (dn ? 'ck' : '') + '">' +
        (dn ? '<svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' : '') +
        '</div></td><td><div class="tdn" style="' + (dn ? 'text-decoration:line-through' : '') + '">' + t.tur + ' ' + t.baslik + '</div>' + (t.not ? '<div style="font-size:10px;color:var(--scrm-tx3)">' + t.not + '</div>' : '') + '</td>' +
        '<td>' + c.ad + '</td><td><span class="badge ' + pb(t.oncelik) + '">' + t.oncelik + '</span></td>' +
        '<td style="font-size:11px;color:' + (ov ? 'var(--red)' : 'var(--scrm-tx3)') + '">' + fD(t.sonTarih) + (ov ? ' ⚠' : '') + '</td>' +
        '<td><span class="badge ' + (dn ? 'bbg' : 'bba') + '">' + (dn ? 'Bitti' : 'Açık') + '</span></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="ei">✅</div><div class="et">Görev bulunamadı</div></div></td></tr>';
  }

  function renderAll() {
    rdDash(); rdContacts(); rdPipe(); rdMeetings(); rdTasks();
    updBadges();
    var pages = window.SalesCRM.pages;
    if (pages && pages.renderOps) pages.renderOps();
    if (pages && pages.renderAdvanced) pages.renderAdvanced();
    if (pages && pages.renderStatic) pages.renderStatic();
  }

  Object.assign(window.SalesCRM.pages, {
    go: go,
    updBadges: updBadges,
    rdDash: rdDash,
    rdContacts: rdContacts,
    rdPipe: rdPipe,
    rdMeetings: rdMeetings,
    rdTasks: rdTasks,
    renderAll: renderAll
  });
})();
