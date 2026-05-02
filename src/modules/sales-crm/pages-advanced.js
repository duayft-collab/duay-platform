/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/pages-advanced.js
 * V138.2 POPULATE — SPIN + analiz raporu + eval
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

  function _contactOptions() {
    var core = window.SalesCRM.core;
    if (!core) return '';
    return '<option value="">Müşteri Seç...</option>' +
      core.D.contacts.map(function(c) {
        return '<option value="' + c.id + '">' + c.ad + ' — ' + c.firma + '</option>';
      }).join('');
  }

  function rdSpin() {
    var sel = _q('#scrm-spin-sel');
    if (!sel) return;
    sel.innerHTML = _contactOptions();
    var tips = _q('#scrm-spin-tips');
    if (tips) tips.innerHTML =
      '<span style="font-weight:600;color:var(--blue)">S</span> — Sistemleri, ekibi, süreçleri keşfedin.<br><br>' +
      '<span style="font-weight:600;color:var(--amber)">P</span> — "En çok neyi zor buluyorsunuz?" Sorunu müşteri söylesin.<br><br>' +
      '<span style="font-weight:600;color:var(--red)">I</span> — "Bu çözülmezse yıllık maliyeti ne olur?" — Baran Şimşek: Aciliyeti hissettirin.<br><br>' +
      '<span style="font-weight:600;color:var(--green)">N</span> — "Bu çözülseydi ne değişirdi?" Değeri müşteriye tanıtlatın.<br><br>' +
      '<span style="font-size:10.5px;color:var(--scrm-tx3)">Gitomer: Acıyla başlama — önce ortak zevkleri bul, sonra ortak değerlere ulaş.</span>';
    updSpinScore();
  }

  function updSpinScore() {
    var el = _q('#scrm-spin-scores');
    if (!el) return;
    var lbs = ['Situation', 'Problem', 'Implication', 'Need'];
    var cls = ['var(--blue)', 'var(--amber)', 'var(--red)', 'var(--green)'];
    el.innerHTML = ['scrm-sp-s', 'scrm-sp-p', 'scrm-sp-i', 'scrm-sp-n'].map(function(id, i) {
      var elx = _q('#' + id);
      var v = elx ? elx.value : '';
      var p = Math.min(Math.round((v || '').length / 200 * 100), 100);
      return '<div class="sri"><div class="srl">' + lbs[i] + '</div><div class="srbar"><div class="srfill" style="width:' + p + '%;background:' + cls[i] + '"></div></div><div class="srpct">' + p + '%</div></div>';
    }).join('');
  }

  function loadSpin(id) {
    var core = window.SalesCRM.core;
    if (!core || !id) return;
    var sd = core.D.spinData[id] || {};
    [['scrm-sp-s', 's'], ['scrm-sp-p', 'p'], ['scrm-sp-i', 'i'], ['scrm-sp-n', 'n']].forEach(function(p) {
      var el = _q('#' + p[0]);
      if (el) el.value = sd[p[1]] || '';
    });
    updSpinScore();
  }

  function clearSpin() {
    ['scrm-sp-s', 'scrm-sp-p', 'scrm-sp-i', 'scrm-sp-n'].forEach(function(id) {
      var el = _q('#' + id);
      if (el) el.value = '';
    });
    updSpinScore();
  }

  function saveSpin() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var sel = _q('#scrm-spin-sel');
    var id = sel ? sel.value : '';
    if (!id) { core.toast('Müşteri seçin', '⚠'); return; }
    var get = function(sel) { var e = _q(sel); return e ? e.value : ''; };
    core.D.spinData[id] = {
      s: get('#scrm-sp-s'), p: get('#scrm-sp-p'),
      i: get('#scrm-sp-i'), n: get('#scrm-sp-n')
    };
    core.saveAll();
    core.toast('SPIN kaydedildi', '✅');
  }

  function tSpin(hd) {
    if (hd && hd.nextElementSibling) hd.nextElementSibling.classList.toggle('open');
  }

  function runAnalysis() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var gkSel = _q('#scrm-gk-cid');
    var cId = gkSel ? gkSel.value : '';
    var c = cId ? core.gC(cId) : { ad: 'Müşteri' };
    var sinifEl = _q('#scrm-anl-sinif');
    var sektorEl = _q('#scrm-anl-sektor');
    var sinif = sinifEl ? sinifEl.value : 'B';
    var sektor = sektorEl ? sektorEl.value : 'Diğer';
    var potMap = {
      'A+': '<strong>' + c.ad + '</strong> için üst düzey stratejik konumlanma mümkün. ' + sektor + ' sektöründe A+ sınıf — hızlı karar alma ve yüksek değer işbirliği potansiyeli yüksek.',
      'A': '<strong>' + c.ad + '</strong> yüksek potansiyelli hedef. Öncelikli yaklaşım önerilir; kişiselleştirilmiş Fayda Check-Up yapın.',
      'B': '<strong>' + c.ad + '</strong> standart potansiyel. Somut ROI odaklı teklif ve fayda kanıtı hazırlayın.',
      'C': '<strong>' + c.ad + '</strong> düşük öncelik. Pasif takip ve otomasyon önerilir.'
    };
    var riskMap = {
      'A+': 'Karar verici değişimi ve rakip fiyat baskısı en büyük riskler. Şampiyon belirleyin ve erken dahil edin.',
      'A': 'Bütçe onay süreci gecikme yaratabilir. Ekonomik alıcıyı erkenden sürece katın.',
      'B': 'Fiyat duyarlılığı yüksek. Baran Şimşek prensibi: alıcıya "patronuna izah edebileceği bir kanıt" verin.',
      'C': 'Bütçe ve öncelik yok. Deadline yaratmadan ilerleme zor. Grant Cardone: 10X urgency yaratın.'
    };
    var guruMap = {
      'A+': '<strong>Neil Rackham:</strong> Implication sorularına geçin — sorunun maliyetini hissettirin.<br><strong>Baran Şimşek:</strong> Fayda Check-Up yapın; farkı somut rakamlarla gösterin.',
      'A': '<strong>Matthew Dixon:</strong> Statükoyu sarsın — müşterinin bilmediği bir riski ortaya koyun.<br><strong>Jack Daly:</strong> Somut metrikler ve referanslarla güven inşa edin.',
      'B': '<strong>Gitomer:</strong> Pitch değil fikir getirin. "Son 10 müşterimiz neden aldı?" sorusunu kullanın.<br><strong>Baran Şimşek:</strong> Alıcıya patronuna izah edebileceği somut bir fark sunun.',
      'C': '<strong>Grant Cardone:</strong> Ertelemenin gerçek yıllık maliyetini birlikte hesaplayın.<br><strong>Gitomer:</strong> İlişki kurun — ortak değerlere ulaşın, acıyla değil zevkle başlayın.'
    };
    var out = _q('#scrm-anl-out');
    if (out) out.style.display = 'block';
    var pot = _q('#scrm-anl-pot');
    var risk = _q('#scrm-anl-risk');
    var guru = _q('#scrm-anl-guru');
    if (pot) pot.innerHTML = potMap[sinif] || potMap['B'];
    if (risk) risk.innerHTML = riskMap[sinif] || riskMap['B'];
    if (guru) guru.innerHTML = guruMap[sinif] || guruMap['B'];
  }

  function rdEval() {
    var core = window.SalesCRM.core;
    if (!core) return;
    var el = _q('#scrm-eval-list');
    if (!el) return;
    el.innerHTML = core.D.evalList.length ? core.D.evalList.map(function(e, i) {
      return '<div class="todo-row" data-eval-i="' + i + '"><input class="fi scrm-eval-tarih" data-i="' + i + '" style="padding:5px 8px;font-size:12px;border-radius:20px" value="' + (e.tarih || '') + '" placeholder="GG.AA.YYYY"><select class="pill-sel scrm-eval-durum" data-i="' + i + '"><option ' + (e.durum === 'Olumlu' ? 'selected' : '') + '>Olumlu</option><option ' + (e.durum === 'Nötr' ? 'selected' : '') + '>Nötr</option><option ' + (e.durum === 'Olumsuz' ? 'selected' : '') + '>Olumsuz</option></select><input class="fi scrm-eval-not" data-i="' + i + '" style="padding:5px 8px;font-size:12px;border-radius:20px" value="' + (e.not || '') + '" placeholder="Değerlendirme notu..."><button class="btn br bxs scrm-eval-del" data-i="' + i + '">🗑</button></div>';
    }).join('') : '<div class="empty" style="padding:28px"><div class="ei">⭐</div><div class="et">Değerlendirme yok</div></div>';
  }

  function addEval() {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.evalList.push({ tarih: '', durum: 'Olumlu', not: '' });
    rdEval();
  }

  function updEval(i, k, v) {
    var core = window.SalesCRM.core;
    if (!core) return;
    if (core.D.evalList[i]) core.D.evalList[i][k] = v;
    core.saveAll();
  }

  function delEval(i) {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.D.evalList.splice(i, 1);
    rdEval();
    core.saveAll();
  }

  function renderAdvanced() {
    rdSpin(); rdEval();
  }

  Object.assign(window.SalesCRM.pages, {
    rdSpin: rdSpin, updSpinScore: updSpinScore, loadSpin: loadSpin,
    clearSpin: clearSpin, saveSpin: saveSpin, tSpin: tSpin,
    runAnalysis: runAnalysis,
    rdEval: rdEval, addEval: addEval, updEval: updEval, delEval: delEval,
    renderAdvanced: renderAdvanced
  });
})();
