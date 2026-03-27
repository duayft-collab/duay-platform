/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/satin_alma.js  —  v1.0.0
 * Satın Alma Merkezi — PI Takip + Otomatik Hesaplama + Onay + Ödeme Entegrasyonu
 *
 * localStorage key: ak_satinalma1
 * Firestore sync:   duay_tenant_default/satinalma
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const SA_KEY = 'ak_satinalma1';
const SA_CURRENCIES = { USD: '$', EUR: '€', TRY: '₺' };
const SA_STATUS = {
  draft:    { l: 'Taslak',        c: '#6B7280', bg: 'rgba(107,114,128,.08)' },
  pending:  { l: 'Onay Bekliyor', c: '#D97706', bg: 'rgba(245,158,11,.08)' },
  approved: { l: 'Onaylandı',     c: '#16A34A', bg: 'rgba(34,197,94,.08)'  },
  rejected: { l: 'Reddedildi',    c: '#DC2626', bg: 'rgba(239,68,68,.08)'  },
  paid:     { l: 'Ödendi',        c: '#6366F1', bg: 'rgba(99,102,241,.08)' },
};

// ── Yardımcılar ─────────────────────────────────────────────────
const _gSA    = window.g;
const _isAdmSA = () => ['admin', 'manager'].includes(window.Auth?.getCU?.()?.role);
const _cuSA    = () => window.Auth?.getCU?.();
const _nowSA   = () => typeof nowTs === 'function' ? nowTs() : new Date().toISOString();
const _fmtSA   = (n, cur) => (SA_CURRENCIES[cur] || '') + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Veri ─────────────────────────────────────────────────────────
function _loadSA() { try { return JSON.parse(localStorage.getItem(SA_KEY) || '[]'); } catch (e) { return []; } }
function _storeSA(d) {
  localStorage.setItem(SA_KEY, JSON.stringify(d));
  // Firestore sync
  try {
    var FB_DB = window.Auth?.getFBDB?.();
    if (FB_DB) {
      var tid = (window.Auth?.getTenantId?.() || 'tenant_default').replace(/[^a-zA-Z0-9_]/g, '_');
      FB_DB.collection('duay_' + tid).doc('satinalma').set({ data: d, syncedAt: new Date().toISOString() }, { merge: true }).catch(function() {});
    }
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════
// PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectSAPanel() {
  var panel = document.getElementById('panel-satinalma');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = ''
    // TOPBAR
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">'
      + '<div>'
        + '<div style="font-size:14px;font-weight:700;color:var(--t)">🛒 Satın Alma Merkezi</div>'
        + '<div style="font-size:10px;color:var(--t3)" id="sa-sub">PI & Sipariş Takip</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;align-items:center">'
        + '<button class="btn btns" onclick="window._exportSAXlsx?.()" style="font-size:11px">⬇ Excel</button>'
        + '<button class="btn btnp" onclick="window._openSAModal?.(null)" style="font-size:12px;font-weight:600">+ Yeni Sipariş</button>'
      + '</div>'
    + '</div>'

    // BENTO METRİKLER
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--b)">'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Sipariş</div>'
        + '<div style="font-size:22px;font-weight:600;color:var(--t)" id="sa-stat-total">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">⏳ Onay Bekliyor</div>'
        + '<div style="font-size:22px;font-weight:600;color:#D97706" id="sa-stat-pending">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px;border-right:1px solid var(--b)">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">✅ Onaylanan</div>'
        + '<div style="font-size:22px;font-weight:600;color:#16A34A" id="sa-stat-approved">0</div>'
      + '</div>'
      + '<div style="padding:14px 18px">'
        + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Toplam Tutar</div>'
        + '<div style="font-size:22px;font-weight:600;color:var(--ac)" id="sa-stat-amount">$0</div>'
      + '</div>'
    + '</div>'

    // FİLTRE SATIRI
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--s2)">'
      + '<input class="fi" id="sa-search" placeholder="🔍 PI No, İş ID ara..." oninput="window.renderSatinAlma?.()" style="font-size:11px;flex:1;min-width:140px">'
      + '<select class="fi" id="sa-cur-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:90px">'
        + '<option value="">Tüm Döviz</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="TRY">₺ TRY</option>'
      + '</select>'
      + '<select class="fi" id="sa-status-f" onchange="window.renderSatinAlma?.()" style="font-size:11px;width:120px">'
        + '<option value="">Tüm Durum</option>'
        + '<option value="pending">⏳ Bekliyor</option><option value="approved">✅ Onaylı</option><option value="rejected">❌ Red</option><option value="paid">💸 Ödendi</option>'
      + '</select>'
    + '</div>'

    // TABLO BAŞLIK
    + '<div style="display:grid;grid-template-columns:80px 90px 90px 90px 100px 80px 90px 80px 80px 100px;gap:0;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b);overflow-x:auto">'
      + ['İş ID','PI No','PI Tarihi','Toplam','Avans','Avans %','Kalan','Döviz','Durum','İşlem'].map(function(h) {
          return '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">' + h + '</div>';
        }).join('')
    + '</div>'

    // LİSTE
    + '<div id="sa-list" style="overflow-x:auto"></div>';
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

function renderSatinAlma() {
  _injectSAPanel();
  var all   = _loadSA();
  var search = (document.getElementById('sa-search')?.value || '').toLowerCase();
  var curF   = document.getElementById('sa-cur-f')?.value || '';
  var statF  = document.getElementById('sa-status-f')?.value || '';

  // İstatistikler
  var el = function(id) { var e = document.getElementById(id); return e; };
  var totalAmt = all.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).reduce(function(a, s) { return a + (parseFloat(s.totalAmount) || 0); }, 0);
  if (el('sa-stat-total'))    el('sa-stat-total').textContent    = all.length;
  if (el('sa-stat-pending'))  el('sa-stat-pending').textContent  = all.filter(function(s) { return s.status === 'pending'; }).length;
  if (el('sa-stat-approved')) el('sa-stat-approved').textContent = all.filter(function(s) { return s.status === 'approved' || s.status === 'paid'; }).length;
  if (el('sa-stat-amount'))   el('sa-stat-amount').textContent   = '$' + Math.round(totalAmt).toLocaleString('tr-TR');

  // Filtrele
  var fl = all.filter(function(s) {
    if (curF && s.currency !== curF) return false;
    if (statF && s.status !== statF) return false;
    if (search && !((s.jobId || '').toLowerCase().includes(search) || (s.piNo || '').toLowerCase().includes(search) || (s.exportId || '').toLowerCase().includes(search))) return false;
    return true;
  }).sort(function(a, b) { return (b.id || 0) - (a.id || 0); });

  var cont = document.getElementById('sa-list');
  if (!cont) return;

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:48px;text-align:center;color:var(--t3)">'
      + '<div style="font-size:32px;margin-bottom:8px">🛒</div>'
      + '<div style="font-size:13px;margin-bottom:12px">Sipariş bulunamadı</div>'
      + '<button class="btn btnp" onclick="window._openSAModal?.(null)" style="font-size:12px">+ İlk Siparişi Ekle</button>'
    + '</div>';
    return;
  }

  var html = '';
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return s; };

  fl.forEach(function(s) {
    var st = SA_STATUS[s.status] || SA_STATUS.draft;
    var advAmt = (parseFloat(s.totalAmount) || 0) * (parseFloat(s.advanceRate) || 0) / 100;
    var remaining = (parseFloat(s.totalAmount) || 0) - advAmt;
    var sym = SA_CURRENCIES[s.currency] || '$';

    html += '<div style="display:grid;grid-template-columns:80px 90px 90px 90px 100px 80px 90px 80px 80px 100px;gap:0;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'" onclick="window._openSADetail?.(' + s.id + ')">'
      + '<div style="font-weight:600;font-family:\'DM Mono\',monospace;color:var(--ac)">' + esc(s.jobId || '—') + '</div>'
      + '<div style="font-family:monospace">' + esc(s.piNo || '—') + '</div>'
      + '<div style="color:var(--t3)">' + (s.piDate || '—') + '</div>'
      + '<div style="font-weight:700;color:var(--t)">' + sym + Number(s.totalAmount || 0).toLocaleString('tr-TR') + '</div>'
      + '<div style="color:#D97706;font-weight:600">' + sym + Math.round(advAmt).toLocaleString('tr-TR') + '</div>'
      + '<div style="color:var(--t3)">%' + (s.advanceRate || 0) + '</div>'
      + '<div style="color:#6366F1;font-weight:600">' + sym + Math.round(remaining).toLocaleString('tr-TR') + '</div>'
      + '<div>' + (s.currency || 'USD') + '</div>'
      + '<div><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span></div>'
      + '<div style="display:flex;gap:3px">'
        + (_isAdmSA() && s.status === 'pending' ? '<button onclick="event.stopPropagation();window._approveSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#16A34A">✓</button>' : '')
        + (_isAdmSA() && s.status === 'pending' ? '<button onclick="event.stopPropagation();window._rejectSA(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">✗</button>' : '')
        + '<button onclick="event.stopPropagation();window._openSAModal?.(' + s.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">✏️</button>'
      + '</div>'
    + '</div>';
  });
  cont.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// FORM MODAL
// ════════════════════════════════════════════════════════════════

function _openSAModal(id) {
  var old = document.getElementById('mo-satinalma'); if (old) old.remove();
  var s = id ? _loadSA().find(function(x) { return x.id === id; }) : null;

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-satinalma'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:720px;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">' + (s ? '✏️ Sipariş Düzenle' : '+ Yeni Sipariş') + '</div>'
      + '<button onclick="document.getElementById(\'mo-satinalma\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px">'

      // Satır 1: İhracat ID + İş ID + İş Başlama
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">İHRACAT ID</div><input class="fi" id="sa-export-id" placeholder="EXP-2026-..." value="' + (s?.exportId || '') + '"></div>'
        + '<div><div class="fl">İŞ ID <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-job-id" placeholder="JOB-001" value="' + (s?.jobId || '') + '"></div>'
        + '<div><div class="fl">İŞ BAŞLAMA TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-job-date" value="' + (s?.jobDate || '') + '"></div>'
      + '</div>'

      // Satır 2: PI No + PI Tarihi
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><div class="fl">PI NO <span style="color:var(--rd)">*</span></div><input class="fi" id="sa-pi-no" placeholder="PI-2026-001" value="' + (s?.piNo || '') + '"></div>'
        + '<div><div class="fl">PI TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-pi-date" value="' + (s?.piDate || '') + '"></div>'
      + '</div>'

      // Satır 3: KDV + Toplam + Para Birimi
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">KDV TUTARI <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-kdv" placeholder="0" min="0" step="0.01" value="' + (s?.kdv || '') + '"></div>'
        + '<div><div class="fl">TOPLAM TUTAR <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-total" placeholder="0" min="0" step="0.01" value="' + (s?.totalAmount || '') + '" oninput="window._saCalcAuto?.()"></div>'
        + '<div><div class="fl">PARA BİRİMİ <span style="color:var(--rd)">*</span></div><select class="fi" id="sa-currency"><option value="USD"' + (s?.currency === 'USD' ? ' selected' : '') + '>$ USD</option><option value="EUR"' + (s?.currency === 'EUR' ? ' selected' : '') + '>€ EUR</option><option value="TRY"' + (s?.currency === 'TRY' ? ' selected' : '') + '>₺ TRY</option></select></div>'
      + '</div>'

      // Satır 4: Teslimat + Avans % + Vade
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">TESLİMAT ZAMANI <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-delivery" value="' + (s?.deliveryDate || '') + '"></div>'
        + '<div><div class="fl">AVANS ORANI % <span style="color:var(--rd)">*</span></div><input class="fi" type="number" id="sa-advance" placeholder="30" min="0" max="100" value="' + (s?.advanceRate || '') + '" oninput="window._saCalcAuto?.()"></div>'
        + '<div><div class="fl">VADE TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="sa-vade" value="' + (s?.vadeDate || '') + '"></div>'
      + '</div>'

      // OTOMATİK HESAPLAMA KUTUSU
      + '<div style="background:linear-gradient(135deg,rgba(99,102,241,.05),rgba(99,102,241,.02));border:1px solid rgba(99,102,241,.15);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div>'
          + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">AVANS TUTARI</div>'
          + '<div style="font-size:18px;font-weight:700;color:#D97706" id="sa-calc-advance">—</div>'
        + '</div>'
        + '<div>'
          + '<div style="font-size:10px;color:var(--t3);margin-bottom:2px">KALAN ÖDEME</div>'
          + '<div style="font-size:18px;font-weight:700;color:#6366F1" id="sa-calc-remaining">—</div>'
        + '</div>'
      + '</div>'

      // Dosyalar
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl">PI DOSYASI <span style="color:var(--rd)">*</span></div><input type="file" id="sa-pi-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:11px">'
          + (s?.piFileName ? '<div style="font-size:10px;color:var(--ac);margin-top:3px">📎 ' + (typeof escapeHtml === 'function' ? escapeHtml(s.piFileName) : s.piFileName) + '</div>' : '') + '</div>'
        + '<div><div class="fl">DİĞER DOKÜMANLAR</div><input type="file" id="sa-doc-file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" multiple style="font-size:11px"></div>'
        + '<div><div class="fl">ÜRÜN GÖRSELLERİ</div><input type="file" id="sa-img-file" accept=".jpg,.jpeg,.png,.webp" multiple style="font-size:11px"></div>'
      + '</div>'

      + '<input type="hidden" id="sa-eid" value="' + (s?.id || '') + '">'
    + '</div>'

    // Footer
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-satinalma\').remove()">İptal</button>'
      + '<button class="btn btnp" onclick="window._saveSA?.()">Kaydet</button>'
    + '</div>'
  + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); window._saCalcAuto?.(); }, 10);
}

/**
 * Avans ve kalan tutarı otomatik hesapla.
 */
window._saCalcAuto = function() {
  var total   = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var advRate = parseFloat(document.getElementById('sa-advance')?.value || '0') || 0;
  var advAmt  = Math.round(total * advRate / 100 * 100) / 100;
  var remaining = Math.round((total - advAmt) * 100) / 100;
  var cur = document.getElementById('sa-currency')?.value || 'USD';
  var sym = SA_CURRENCIES[cur] || '$';

  var advEl = document.getElementById('sa-calc-advance');
  var remEl = document.getElementById('sa-calc-remaining');
  if (advEl) advEl.textContent = sym + advAmt.toLocaleString('tr-TR');
  if (remEl) remEl.textContent = sym + remaining.toLocaleString('tr-TR');
};

// ════════════════════════════════════════════════════════════════
// KAYDET
// ════════════════════════════════════════════════════════════════

window._saveSA = function() {
  var jobId    = (document.getElementById('sa-job-id')?.value || '').trim();
  var piNo     = (document.getElementById('sa-pi-no')?.value || '').trim();
  var piDate   = document.getElementById('sa-pi-date')?.value || '';
  var kdv      = parseFloat(document.getElementById('sa-kdv')?.value || '0') || 0;
  var total    = parseFloat(document.getElementById('sa-total')?.value || '0') || 0;
  var delivery = document.getElementById('sa-delivery')?.value || '';
  var advRate  = parseFloat(document.getElementById('sa-advance')?.value || '0') || 0;
  var vade     = document.getElementById('sa-vade')?.value || '';
  var eid      = parseInt(document.getElementById('sa-eid')?.value || '0');
  var jobDate  = document.getElementById('sa-job-date')?.value || '';

  // Doğrulama
  var errs = [];
  if (!jobId)    errs.push('İş ID');
  if (!piNo)     errs.push('PI No');
  if (!piDate)   errs.push('PI Tarihi');
  if (!kdv)      errs.push('KDV Tutarı');
  if (!total)    errs.push('Toplam Tutar');
  if (!delivery) errs.push('Teslimat Zamanı');
  if (!advRate)  errs.push('Avans Oranı');
  if (!vade)     errs.push('Vade Tarihi');
  if (!jobDate)  errs.push('İş Başlama Tarihi');

  // PI Dosyası kontrolü (yeni kayıtta zorunlu)
  var piFile = document.getElementById('sa-pi-file');
  if (!eid && (!piFile || !piFile.files || !piFile.files.length)) {
    errs.push('PI Dosyası');
  }

  if (errs.length) {
    window.toast?.('Zorunlu alanlar eksik: ' + errs.join(', '), 'err');
    return;
  }

  var advAmt    = Math.round(total * advRate / 100 * 100) / 100;
  var remaining = Math.round((total - advAmt) * 100) / 100;
  var currency  = document.getElementById('sa-currency')?.value || 'USD';

  var entry = {
    exportId:     (document.getElementById('sa-export-id')?.value || '').trim(),
    jobId:        jobId,
    jobDate:      jobDate,
    piNo:         piNo,
    piDate:       piDate,
    kdv:          kdv,
    totalAmount:  total,
    currency:     currency,
    deliveryDate: delivery,
    advanceRate:  advRate,
    advanceAmount: advAmt,
    remainingAmount: remaining,
    vadeDate:     vade,
    updatedAt:    _nowSA(),
    updatedBy:    _cuSA()?.id,
  };

  // Dosya okuma (base64)
  var _afterFiles = function(piData, piName) {
    if (piData) { entry.piFileData = piData; entry.piFileName = piName; }

    var d = _loadSA();
    var isNew = !eid;

    if (eid) {
      var item = d.find(function(x) { return x.id === eid; });
      if (item) {
        // Mevcut dosyaları koru
        if (!entry.piFileData && item.piFileData) { entry.piFileData = item.piFileData; entry.piFileName = item.piFileName; }
        Object.assign(item, entry);
      }
    } else {
      entry.id        = generateNumericId();
      entry.status    = _isAdmSA() ? 'approved' : 'pending';
      entry.createdAt = _nowSA();
      entry.createdBy = _cuSA()?.id;
      d.unshift(entry);
    }

    _storeSA(d);
    document.getElementById('mo-satinalma')?.remove();
    renderSatinAlma();
    window.logActivity?.('view', 'Satınalma ' + (isNew ? 'eklendi' : 'güncellendi') + ': ' + piNo);
    window.toast?.((isNew ? 'Sipariş eklendi' : 'Güncellendi') + ' ✓', 'ok');

    // Yeni kayıt — Ödemeler listesine otomatik düşür
    if (isNew) {
      var saEntry = eid ? d.find(function(x) { return x.id === eid; }) : d[0];
      _saCreatePayments(saEntry);

      // Admin değilse yöneticilere bildirim
      if (!_isAdmSA()) {
        window.addNotif?.('🛒', 'Yeni satınalma onay bekliyor: ' + piNo + ' — ' + _fmtSA(total, currency), 'warn', 'satinalma');
      }
    }
  };

  // PI dosyası varsa oku
  if (piFile?.files?.[0]) {
    var reader = new FileReader();
    reader.onload = function(e) { _afterFiles(e.target.result, piFile.files[0].name); };
    reader.readAsDataURL(piFile.files[0]);
  } else {
    _afterFiles(null, null);
  }
};

/**
 * Satınalma kaydından ödemelere avans + kalan ödeme oluşturur.
 */
function _saCreatePayments(sa) {
  if (!sa || !window.createOdmFromPurchase) return;
  window.createOdmFromPurchase({
    id:            sa.id,
    name:          'Satınalma PI: ' + (sa.piNo || sa.jobId),
    totalAmount:   sa.totalAmount,
    advanceAmount: sa.advanceAmount,
    advanceDate:   sa.piDate,
    balanceDate:   sa.vadeDate,
    assignedTo:    sa.createdBy,
  });
}

// ════════════════════════════════════════════════════════════════
// ONAY / RED
// ════════════════════════════════════════════════════════════════

window._approveSA = function(id) {
  if (!_isAdmSA()) { window.toast?.('Yetki yok', 'err'); return; }
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  s.status     = 'approved';
  s.approvedBy = _cuSA()?.id;
  s.approvedAt = _nowSA();
  _storeSA(d);
  renderSatinAlma();
  window.toast?.('Sipariş onaylandı ✓', 'ok');
  window.logActivity?.('view', 'Satınalma onaylandı: ' + (s.piNo || s.jobId));
  window.addNotif?.('✅', 'Satınalma onaylandı: ' + (s.piNo || '') + ' — ' + _fmtSA(s.totalAmount, s.currency), 'ok', 'satinalma', s.createdBy);
  // Onay sonrası ödeme oluştur
  _saCreatePayments(s);
};

window._rejectSA = function(id) {
  if (!_isAdmSA()) { window.toast?.('Yetki yok', 'err'); return; }
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  s.status     = 'rejected';
  s.rejectedBy = _cuSA()?.id;
  s.rejectedAt = _nowSA();
  _storeSA(d);
  renderSatinAlma();
  window.toast?.('Sipariş reddedildi', 'ok');
  window.logActivity?.('view', 'Satınalma reddedildi: ' + (s.piNo || s.jobId));
  window.addNotif?.('❌', 'Satınalma reddedildi: ' + (s.piNo || ''), 'err', 'satinalma', s.createdBy);
};

// ════════════════════════════════════════════════════════════════
// DETAY MODAL
// ════════════════════════════════════════════════════════════════

window._openSADetail = function(id) {
  var d = _loadSA();
  var s = d.find(function(x) { return x.id === id; });
  if (!s) return;
  var esc = typeof escapeHtml === 'function' ? escapeHtml : function(v) { return v; };
  var st = SA_STATUS[s.status] || SA_STATUS.draft;
  var sym = SA_CURRENCIES[s.currency] || '$';
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var creator = users.find(function(u) { return u.id === s.createdBy; });
  var approver = users.find(function(u) { return u.id === s.approvedBy; });

  var old = document.getElementById('mo-sa-detail'); if (old) old.remove();
  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-sa-detail'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:560px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--t)">🛒 ' + esc(s.piNo || s.jobId) + '</div>'
        + '<div style="font-size:11px;color:var(--t3)">İş ID: ' + esc(s.jobId || '—') + (s.exportId ? ' · İhracat: ' + esc(s.exportId) : '') + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
        + '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:' + st.bg + ';color:' + st.c + ';font-weight:600">' + st.l + '</span>'
        + '<button onclick="document.getElementById(\'mo-sa-detail\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
      + '</div>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px">'
      // Finansal özet
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">'
        + '<div style="background:var(--s2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Toplam</div><div style="font-size:18px;font-weight:700;color:var(--t)">' + sym + Number(s.totalAmount || 0).toLocaleString('tr-TR') + '</div></div>'
        + '<div style="background:rgba(217,119,6,.06);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Avans (%' + (s.advanceRate || 0) + ')</div><div style="font-size:18px;font-weight:700;color:#D97706">' + sym + Math.round(s.advanceAmount || 0).toLocaleString('tr-TR') + '</div></div>'
        + '<div style="background:rgba(99,102,241,.06);border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;color:var(--t3)">Kalan</div><div style="font-size:18px;font-weight:700;color:#6366F1">' + sym + Math.round(s.remainingAmount || 0).toLocaleString('tr-TR') + '</div></div>'
      + '</div>'
      // Detaylar
      + '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:12px">'
        + [
            ['PI Tarihi', s.piDate || '—'],
            ['İş Başlama', s.jobDate || '—'],
            ['Teslimat', s.deliveryDate || '—'],
            ['Vade Tarihi', s.vadeDate || '—'],
            ['KDV', sym + Number(s.kdv || 0).toLocaleString('tr-TR')],
            ['Para Birimi', s.currency || 'USD'],
            ['Oluşturan', creator ? esc(creator.name) : '—'],
            ['Onaylayan', approver ? esc(approver.name) : '—'],
            ['Oluşturma', s.createdAt || '—'],
          ].map(function(r, i) {
            return '<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--b);background:' + (i % 2 === 0 ? 'var(--sf)' : 'var(--s2)') + '">'
              + '<span style="font-size:11px;color:var(--t3)">' + r[0] + '</span>'
              + '<span style="font-size:11px;font-weight:600;color:var(--t)">' + r[1] + '</span>'
            + '</div>';
          }).join('')
      + '</div>'
      // PI Dosyası
      + (s.piFileName ? '<div style="padding:8px 14px;background:var(--s2);border-radius:8px;margin-bottom:12px;font-size:11px"><span style="color:var(--t3)">📎 PI Dosyası:</span> <span style="color:var(--ac);font-weight:600">' + esc(s.piFileName) + '</span></div>' : '')
    + '</div>'
    + '<div style="padding:10px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn btns" onclick="window._openSAModal?.(' + s.id + ');document.getElementById(\'mo-sa-detail\')?.remove()" style="font-size:12px">✏️ Düzenle</button>'
      + '<button class="btn" onclick="document.getElementById(\'mo-sa-detail\').remove()">Kapat</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

// ════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ════════════════════════════════════════════════════════════════

window._exportSAXlsx = function() {
  var items = _loadSA();
  if (!items.length) { window.toast?.('Dışa aktarılacak kayıt yok', 'err'); return; }
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  var rows = [['İhracat ID', 'İş ID', 'İş Başlama', 'PI No', 'PI Tarihi', 'KDV', 'Toplam Tutar', 'Döviz', 'Avans %', 'Avans Tutarı', 'Kalan', 'Teslimat', 'Vade', 'Durum']];
  items.forEach(function(s) {
    var st = SA_STATUS[s.status] || SA_STATUS.draft;
    rows.push([
      s.exportId || '', s.jobId || '', s.jobDate || '',
      s.piNo || '', s.piDate || '', s.kdv || 0,
      s.totalAmount || 0, s.currency || 'USD',
      s.advanceRate || 0, s.advanceAmount || 0, s.remainingAmount || 0,
      s.deliveryDate || '', s.vadeDate || '', st.l,
    ]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map(function() { return { wch: 16 }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Satin Alma');
  XLSX.writeFile(wb, 'SatinAlma_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

var SatinAlma = {
  render:     renderSatinAlma,
  openModal:  _openSAModal,
  loadData:   _loadSA,
  storeData:  _storeSA,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SatinAlma;
} else {
  window.SatinAlma      = SatinAlma;
  window.renderSatinAlma = renderSatinAlma;
  window._openSAModal    = _openSAModal;
  window._loadSA         = _loadSA;
  window._storeSA        = _storeSA;
}
