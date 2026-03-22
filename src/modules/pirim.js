/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/pirim.js
 * Prim / Teşvik Yönetimi Modülü
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

// ── V18 uyumluluk shim'leri ──────────────────────────────────────
const softDelete = (m, item, label) => window.softDelete?.(m, item, label) ?? (confirm(`"${label}" silinsin mi?`) && true);


// ── Sabitler ─────────────────────────────────────────────────────
const PIRIM_TYPES = {
  YA:  { label: '📈 Yıllık Artan',        base: 'maas',    locked: true  },
  SC:  { label: '💰 Satış Cirosu',         base: 'ciro',    locked: true  },
  NY:  { label: '🤝 Yeni Müşteri',         base: 'sabit',   locked: true  },
  CA:  { label: '📊 Ciro Artış',           base: 'ciro',    locked: true  },
  DD:  { label: '🎯 Dönem Değerlendirme',  base: 'serbest', locked: false },
  RD:  { label: '🔄 Referans Dönüşüm',     base: 'serbest', locked: false },
  CE:  { label: '⭐ CEO Takdir',           base: 'serbest', locked: false },
};

const PIRIM_STATUS = {
  pending:  { l: '⏳ Onay Bekliyor', c: 'ba' },
  approved: { l: '✅ Onaylandı',     c: 'bg' },
  rejected: { l: '❌ Reddedildi',    c: 'br' },
  paid:     { l: '💸 Ödendi',        c: 'bb' },
};

// ── Yardımcılar ──────────────────────────────────────────────────

// ── Prim Oranı Çözümleme ─────────────────────────────────────────
function getPirimRateFromParams(typeCode) {
  const params = loadPirimParams();
  const p      = params.find(x => x.code === typeCode);
  return p ? p.rate : null;
}

/**
 * Pirim türü seçildiğinde oran alanını günceller.
 * @param {string} type  PIRIM_TYPES key
 */
function selectPirimType(type) {
  const inp = g('prm-type');
  if (inp) inp.value = type;

  document.querySelectorAll('.prm-type-card').forEach(card => {
    const sel = card.dataset.type === type;
    card.style.borderColor = sel ? '#6366F1' : 'var(--b)';
    card.style.background  = sel ? 'rgba(99,102,241,.08)' : 'var(--sf)';
    card.style.transform   = sel ? 'scale(1.02)' : 'scale(1)';
  });

  onPirimTypeChange();
  calcPirimAuto();
}

function onPirimTypeChange() {
  const type   = g('prm-type')?.value;
  const oranEl = g('prm-oran');
  if (!type || !oranEl) return;

  const serbestTipler = ['DD', 'RD', 'CE'];
  if (serbestTipler.includes(type)) {
    oranEl.readOnly       = false;
    oranEl.style.background = '';
    oranEl.style.color      = '';
    oranEl.title           = 'Bu tip için oranı manuel girin';
    oranEl.value           = '';
  } else {
    const params  = loadPirimParams();
    const param   = params.find(p => p.code === type);
    const rate    = param ? param.rate : null;
    oranEl.readOnly       = true;
    oranEl.style.background = 'var(--s2)';
    oranEl.style.color      = 'var(--t2)';
    oranEl.title           = 'Oran parametrelerden otomatik gelir';
    const defaults         = { YA: 0.50, SC: 0.15, NY: 0.50, CA: 0.25 };
    oranEl.value           = rate !== null && rate !== undefined ? rate : (defaults[type] || 0);
  }
  updatePirimRateHint();
  calcPirimAuto();
}

function updatePirimRateHint() {
  const type   = g('prm-type')?.value;
  const hint   = g('prm-rate-hint');
  if (!hint || !type) return;
  const def = PIRIM_TYPES[type];
  if (!def) { hint.textContent = ''; return; }
  hint.textContent = def.locked
    ? `Oran parametrelerden gelir (${def.base})`
    : 'Serbest oran — elle girilir';
}

/**
 * Pirim tutarını otomatik hesaplar ve ilgili alana yazar.
 */
function calcPirimAuto() {
  const oranEl  = g('prm-oran');
  const baseEl  = g('prm-base-amount');
  const totalEl = g('prm-total');
  if (!oranEl || !baseEl || !totalEl) return;

  const rate  = parseFloat(oranEl.value)  || 0;
  const base  = parseFloat(baseEl.value)  || 0;
  const total = Math.round(base * rate);
  totalEl.value = total;
}

/**
 * Pirim ödeme tarihini hesaplar.
 * Kural: mal müşteriye ulaştıktan 30 gün sonra.
 */
function calcPirimExpiry(dateStr) {
  try {
    const d = new Date(dateStr || new Date());
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}

// ── Render ───────────────────────────────────────────────────────
function renderPirim() {
  // ── Virtual scroll: 100+ kayıt için otomatik devreye girer ──────
  // VirtualList window.VirtualList olarak utils.js'den gelir

    // skeleton-renderPirim
  const _skCont = document.getElementById('pirim-list');
  if (_skCont && typeof showSkeleton === 'function') showSkeleton(_skCont, 3);

  const cu    = CU();
  const pirim = isAdmin()
    ? loadPirim()
    : loadPirim().filter(p => p.uid === cu?.id);

  const users   = loadUsers();
  const statusF = g('prm-status-f')?.value || '';
  const typeF   = g('prm-type-f')?.value   || '';
  const userF   = parseInt(g('prm-user-f')?.value || '0');
  const search  = (g('prm-search')?.value  || '').toLowerCase();

  let fl = pirim;
  if (statusF)       fl = fl.filter(p => p.status === statusF);
  if (typeF)         fl = fl.filter(p => p.type   === typeF);
  if (userF)         fl = fl.filter(p => p.uid    === userF);
  if (search)        fl = fl.filter(p => (p.title || '').toLowerCase().includes(search));

  // İstatistikler
  const pending  = pirim.filter(p => p.status === 'pending');
  const approved = pirim.filter(p => p.status === 'approved');
  const paid     = pirim.filter(p => p.status === 'paid');
  const total    = approved.reduce((a, p) => a + (p.amount || 0), 0);

  st('prm-total',    pirim.length);
  st('prm-pending',  pending.length);
  st('prm-approved', approved.length);
  st('prm-paid',     paid.length);
  st('prm-total-amount', total.toLocaleString('tr-TR') + ' ₺');

  const nb = g('nb-pirim-b');
  if (nb) {
    const n = pending.length;
    nb.textContent   = n;
    nb.style.display = n > 0 ? 'inline' : 'none';
  }

  // Filtre dropdown — kullanıcı listesi doldur
  const uSel = g('prm-user-f');
  if (uSel && uSel.options.length <= 1) {
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.name;
      uSel.appendChild(o);
    });
  }

  const cont = g('pirim-list');
  if (!cont) return;
  if (!fl.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">⭐</div>
      Prim kaydı bulunamadı.</div>`;
    return;
  }

  cont.innerHTML = `<table class="tbl"><thead><tr>
    <th>Personel</th><th>Tür</th><th>Başlık</th><th>Tutar</th>
    <th>Tarih</th><th>Ödeme Tarihi</th><th>Durum</th><th>İşlem</th>
  </tr></thead><tbody>
  ${fl.map(p => {
    const u   = users.find(x => x.id === p.uid) || { name: '?' };
    const st2 = PIRIM_STATUS[p.status] || PIRIM_STATUS.pending;
    const td  = PIRIM_TYPES[p.type];
    const payDate = p.payDate || calcPirimExpiry(p.date);
    const overdue = payDate < new Date().toISOString().slice(0, 10) && p.status !== 'paid';
    return `<tr>
      <td style="font-weight:500">${u.name}</td>
      <td><span class="badge bp" style="font-size:10px">${td?.label || p.type}</span></td>
      <td>${p.title || '—'}</td>
      <td style="font-weight:600;font-family:'DM Mono',monospace">
        ${(p.amount || 0).toLocaleString('tr-TR')} ₺
      </td>
      <td style="font-family:'DM Mono',monospace;color:var(--t2)">${p.date || '—'}</td>
      <td style="font-family:'DM Mono',monospace;color:${overdue ? 'var(--rd)' : 'var(--t2)'}">
        ${payDate}${overdue ? ' ⚠' : ''}
      </td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td style="display:flex;gap:4px">
        ${isAdmin() && p.status === 'pending' ? `
          <button class="btn btns btng" onclick="Pirim.approve(${p.id})">✓ Onayla</button>
          <button class="btn btns btnd"  onclick="Pirim.reject(${p.id})">✕</button>` : ''}
        ${isAdmin() && p.status === 'approved' ? `
          <button class="btn btns bb" onclick="Pirim.markPaid(${p.id})">💸 Ödendi</button>` : ''}
        <button class="btn btns" onclick="Pirim.openModal(${p.id})">✏️</button>
        ${isAdmin() ? `<button class="btn btns btnd" onclick="Pirim.del(${p.id})">🗑</button>` : ''}
      </td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

// ── Modal Açma ───────────────────────────────────────────────────
function openPirimModal(id) {
  const users = loadUsers();
  const usel  = g('prm-user');
  if (usel) usel.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

  if (id) {
    const p = loadPirim().find(x => x.id === id);
    if (!p) return;
    if (g('prm-title'))  g('prm-title').value  = p.title  || '';
    if (g('prm-type'))   g('prm-type').value   = p.type   || '';
    if (g('prm-oran'))   g('prm-oran').value   = p.rate   || '';
    if (g('prm-base-amount')) g('prm-base-amount').value = p.baseAmount || '';
    if (g('prm-total'))  g('prm-total').value  = p.amount || '';
    if (g('prm-date'))   g('prm-date').value   = p.date   || '';
    if (g('prm-user'))   g('prm-user').value   = p.uid    || CU()?.id;
    if (g('prm-eid'))    g('prm-eid').value    = id;
    if (g('mo-prm-t'))   g('mo-prm-t').textContent = '✏️ Prim Düzenle';
    selectPirimType(p.type);
  } else {
    ['prm-title', 'prm-oran', 'prm-base-amount', 'prm-total'].forEach(x => { const el = g(x); if (el) el.value = ''; });
    if (g('prm-date'))  g('prm-date').valueAsDate = new Date();
    if (g('prm-user'))  g('prm-user').value = CU()?.id;
    if (g('prm-eid'))   g('prm-eid').value  = '';
    if (g('mo-prm-t'))  g('mo-prm-t').textContent = '+ Prim Ekle';
    document.querySelectorAll('.prm-type-card').forEach(c => {
      c.style.borderColor = 'var(--b)'; c.style.background = 'var(--sf)'; c.style.transform = '';
    });
    if (g('prm-type')) g('prm-type').value = '';
  }
  window.openMo?.('mo-pirim');
}

// ── Kaydet ───────────────────────────────────────────────────────
function savePirim() {
  const type   = g('prm-type')?.value;
  const title  = (g('prm-title')?.value || '').trim();
  const amount = parseFloat(g('prm-total')?.value || '0');
  const date   = g('prm-date')?.value || '';
  const uid    = parseInt(g('prm-user')?.value || CU()?.id);
  const eid    = parseInt(g('prm-eid')?.value  || '0');

  if (!type)   { window.toast?.('Prim türü seçin', 'err');        return; }
  if (!title)  { window.toast?.('Başlık zorunludur', 'err');       return; }
  if (!amount) { window.toast?.('Tutar sıfır olamaz', 'err');     return; }
  if (!date)   { window.toast?.('Tarih zorunludur', 'err');        return; }

  const d     = loadPirim();
  const entry = {
    type, title, amount, date,
    uid, rate: parseFloat(g('prm-oran')?.value || '0'),
    baseAmount: parseFloat(g('prm-base-amount')?.value || '0'),
    payDate: calcPirimExpiry(date),
    status: isAdmin() ? 'approved' : 'pending',
    createdBy: CU()?.id, createdAt: nowTs(),
  };

  if (eid) {
    const item = d.find(x => x.id === eid);
    if (item) Object.assign(item, entry);
  } else {
    d.push({ id: Date.now(), ...entry });
  }

  storePirim(d);
  window.closeMo?.('mo-pirim');
  renderPirim();
  logActivity('view', `Prim kaydedildi: "${title}" — ${amount.toLocaleString('tr-TR')} ₺`);
  window.toast?.('Prim kaydedildi ✓', 'ok');

  if (!isAdmin()) {
    window.addNotif?.('⭐', `Yeni prim talebi onay bekliyor: "${title}"`, 'warn', 'pirim');
  }
}

// ── Onaylama / Reddetme / Ödeme ──────────────────────────────────
function approvePirim(id) {
  if (!isAdmin()) return;
  const d = loadPirim();
  const p = d.find(x => x.id === id);
  if (!p) return;
  p.status     = 'approved';
  p.approvedBy = CU()?.id;
  p.approvedAt = nowTs();
  storePirim(d);
  renderPirim();
  window.toast?.('Prim onaylandı ✓', 'ok');
  logActivity('view', `Prim onaylandı: "${p.title}"`);
}

function rejectPirim(id) {
  if (!isAdmin()) return;
  const d = loadPirim();
  const p = d.find(x => x.id === id);
  if (!p) return;
  p.status     = 'rejected';
  p.rejectedBy = CU()?.id;
  p.rejectedAt = nowTs();
  storePirim(d);
  renderPirim();
  window.toast?.('Prim reddedildi', 'ok');
}

function markPirimPaid(id) {
  if (!isAdmin()) return;
  const d = loadPirim();
  const p = d.find(x => x.id === id);
  if (!p) return;
  p.status  = 'paid';
  p.paidAt  = nowTs();
  p.paidBy  = CU()?.id;
  storePirim(d);
  renderPirim();
  window.toast?.('Prim ödendi olarak işaretlendi ✓', 'ok');
  logActivity('view', `Prim ödendi: "${p.title}"`);
}

function delPirim(id) {
  if (!isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  if (!confirm('Bu prim kaydını silmek istediğinizden emin misiniz?')) return;
  storePirim(loadPirim().filter(x => x.id !== id));
  renderPirim();
  window.toast?.('Silindi', 'ok');
}

// ── Pirim Parametreler Paneli ─────────────────────────────────────
function renderPirimParams() {
  const cont   = g('pirim-params-list');
  if (!cont) return;
  const params = loadPirimParams();
  cont.innerHTML = params.map(p => `
    <div class="dr">
      <div>
        <div style="font-weight:600">${PIRIM_TYPES[p.code]?.label || p.code}</div>
        <div style="font-size:11px;color:var(--t3)">Kod: ${p.code} · Baz: ${p.base}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${p.rate !== null ? `<span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600">%${(p.rate * 100).toFixed(0)}</span>` : '<span style="color:var(--t3)">Serbest</span>'}
        ${isAdmin() ? `<button class="btn btns" onclick="Pirim.openParamModal('${p.code}')">✏️</button>` : ''}
      </div>
    </div>`).join('');
}

// ── Excel Export ─────────────────────────────────────────────────
function exportPirimXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const rows  = loadPirim().map(p => {
    const u = users.find(x => x.id === p.uid) || { name: '?' };
    return {
      Personel: u.name,
      Tür:      PIRIM_TYPES[p.type]?.label || p.type,
      Başlık:   p.title   || '',
      Tutar:    p.amount  || 0,
      Tarih:    p.date    || '',
      'Ödeme T.': p.payDate || '',
      Durum:    PIRIM_STATUS[p.status]?.l || p.status,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prim');
  XLSX.writeFile(wb, `Pirim_${nowTs().slice(0, 10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}

// ── Dışa Aktarım ─────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — PİRİM
// ════════════════════════════════════════════════════════════════

function renderPirimTrend(){
  const chart=g('pirim-trend-chart');if(!chart)return;
  const d=loadPirim();const users=loadUsers();
  const trendUid=parseInt(g('prm-trend-user')?.value||'0');
  const now=new Date();
  // Son 6 ay
  const months=[];
  for(let i=5;i>=0;i--){
    const dt=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({label:(MONTHS.tr)[dt.getMonth()].slice(0,3),key:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`});
  }
  const data=months.map(mo=>{
    let recs=d.filter(p=>p.status==='approved'&&p.date?.startsWith(mo.key));
    if(trendUid)recs=recs.filter(p=>p.uid===trendUid);
    return{...mo,amt:recs.reduce((a,p)=>a+(p.amount||0),0),cnt:recs.length};
  });
  const maxAmt=Math.max(...data.map(x=>x.amt),1);
  chart.innerHTML=`
    <div style="display:flex;align-items:flex-end;gap:8px;height:100px;padding:0 4px">
      ${data.map(mo=>{
        const h=Math.max(Math.round((mo.amt/maxAmt)*88),mo.amt>0?4:2);
        return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:9px;color:var(--ac);font-weight:600;font-family:'DM Mono',monospace;min-height:14px">${mo.amt>0?mo.amt.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺':''}</div>
          <div style="width:100%;background:${mo.amt>0?'var(--ac)':'var(--s2)'};border-radius:6px 6px 0 0;height:${h}px;transition:height .4s;cursor:pointer;opacity:.85" title="${mo.label}: ${mo.amt.toFixed(2)} ₺ (${mo.cnt} işlem)"></div>
          <div style="font-size:10px;color:var(--t2);text-align:center">${mo.label}</div>
          ${mo.cnt>0?`<div style="font-size:9px;color:var(--t3)">${mo.cnt}</div>`:'<div style="font-size:9px;color:transparent">0</div>'}
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;padding:0 4px">
      <span style="font-size:10px;color:var(--t3)">Son 6 ay · Onaylı pirimler</span>
      <span style="font-size:10px;color:var(--t3)">Bar: ₺ tutarı · Alt: işlem sayısı</span>
    </div>`;
}

function openPirimApproval(id){
  const d=loadPirim();const p=d.find(x=>x.id===id);if(!p)return;
  const users=loadUsers();const u=users.find(x=>x.id===p.uid)||{name:'?'};
  openApprovalModal('pirim',id,'Pirim Talebi Onayı',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Personel</span><div style="font-weight:700">${u.name}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">İşlem Türü</span><div>${PRM_TYPES?.[p.type]||p.type||'—'}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Tanım</span><div>${p.title}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Fatura</span><div>${(p.fatura||0).toLocaleString('tr-TR')} ₺ · %${p.rate||0}</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Brüt Pirim</span><div>${(p.grossAmount||0).toFixed(2)} ₺</div></div>
      <div><span style="font-size:10px;color:var(--t3);text-transform:uppercase">Net Pirim</span><div style="font-weight:800;color:var(--ac)">${(p.amount||0).toFixed(2)} ₺</div></div>
      ${p.totalPenalty?`<div style="grid-column:1/-1;background:var(--rdb);padding:8px;border-radius:6px"><span style="font-size:10px;color:var(--rdt);font-weight:700">Kesintiler: %${((p.totalPenalty||0)*100).toFixed(0)}</span></div>`:''}
    </div>`
  );
}

function delPirimRecord(id){
  if(!isAdmin())return;const d=loadPirim();const p=d.find(x=>x.id===id);if(!p)return;
  if(!softDelete('pirim',p,p.title))return;storePirim(d.filter(x=>x.id!==id));renderPirim();
}

function printPirimSlip(id){
  const p=loadPirim().find(x=>x.id===id);if(!p)return;
  const users=loadUsers();const u=users.find(x=>x.id===p.uid)||{name:'?'};
  const win=window.open('','_blank','width=600,height=800');
  win.document.write(`<!DOCTYPE html><html><head><title>Pirim Fişi</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:500px;margin:0 auto}h2{text-align:center;font-size:16px;margin-bottom:4px}h3{text-align:center;font-size:12px;font-weight:normal;color:#666;margin-bottom:20px}table{width:100%;border-collapse:collapse}td{padding:6px 10px;border-bottom:1px solid #eee;font-size:12px}.lbl{color:#666;width:40%}.val{font-weight:600}.pen{color:red}.tot{font-size:16px;font-weight:bold;color:#3C3489}.sign{margin-top:40px;display:flex;justify-content:space-between}.sign div{text-align:center;width:45%;border-top:1px solid #333;padding-top:8px;font-size:11px}</style></head><body>
  <h2>AkademiHub — Pirim Fişi</h2><h3>2025 Performans ve Prim Sistemi Yönetmeliği</h3>
  <table>
    <tr><td class="lbl">Personel</td><td class="val">${u.name}</td></tr>
    <tr><td class="lbl">İşlem</td><td class="val">${p.title}</td></tr>
    <tr><td class="lbl">İşlem Kodu</td><td class="val">${p.code||'—'}</td></tr>
    <tr><td class="lbl">İşlem Türü</td><td class="val">${PRM_TYPES[p.type]||p.type||'—'}</td></tr>
    <tr><td class="lbl">Tarih</td><td class="val">${p.date}</td></tr>
    <tr><td class="lbl">Fatura Tutarı</td><td class="val">${p.fatura?p.fatura.toLocaleString('tr-TR')+' ₺':'—'}</td></tr>
    <tr><td class="lbl">Prim Oranı</td><td class="val">%${p.rate||0}</td></tr>
    <tr><td class="lbl">Brüt Prim</td><td class="val">${(p.grossAmount||p.amount||0).toFixed(2)} ₺</td></tr>
    ${(p.penalties||[]).map(pen=>`<tr><td class="lbl pen">Kesinti: ${pen.rule}</td><td class="val pen">-%${(pen.pct*100).toFixed(0)}</td></tr>`).join('')}
    <tr><td class="lbl" style="font-weight:bold">NET PRİM</td><td class="tot">${(p.amount||0).toFixed(2)} ₺</td></tr>
    <tr><td class="lbl">Durum</td><td class="val">${{pending:'⏳ Onay Bekliyor',approved:'✅ Onaylı',rejected:'❌ Reddedildi'}[p.status]||p.status}</td></tr>
    ${p.approvedByName?`<tr><td class="lbl">Onaylayan</td><td class="val">${p.approvedByName} — ${p.approveTs||''}</td></tr>`:''}
    <tr><td class="lbl">Son Onay Tarihi</td><td class="val ${!p.expiry||p.expiry<new Date().toISOString().slice(0,10)?'pen':''}">${p.expiry||'—'}</td></tr>
    <tr><td class="lbl">Not</td><td>${p.note||'—'}</td></tr>
  </table>
  <div class="sign"><div>Hazırlayan<br><br>${p.reqByName||u.name}</div><div>Onaylayan<br><br>${p.approvedByName||'…………………'}</div></div>
  <p style="margin-top:20px;font-size:9px;color:#999;text-align:center">AkademiHub v${APP_VER} · ${nowTs()} · SOP 2025 Performans ve Prim Yönetmeliği</p>
  <script>window.print();<\/script></body></html>`);
}

function openPirimParams(){PRM_PARAMS_TEMP=JSON.parse(JSON.stringify(loadPirimParams()));renderPirimParamsList();openMo('mo-pirim-params');}

function renderPirimParamsList(){
  const cont=g('pirim-params-list');if(!cont)return;
  cont.innerHTML=PRM_PARAMS_TEMP.map((p,i)=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap"><input class="fi" value="${p.name}" style="flex:3;min-width:120px;padding:5px 8px;font-size:12px" oninput="PRM_PARAMS_TEMP[${i}].name=this.value" placeholder="Parametre adı"><input class="fi" value="${p.code}" style="flex:1;min-width:60px;padding:5px 8px;font-size:12px" oninput="PRM_PARAMS_TEMP[${i}].code=this.value" placeholder="KOD"><input type="number" class="fi" value="${p.rate}" style="flex:1;min-width:60px;padding:5px 8px;font-size:12px" oninput="PRM_PARAMS_TEMP[${i}].rate=parseFloat(this.value)||0" placeholder="%"><input class="fi" value="${p.desc||''}" style="flex:4;min-width:160px;padding:5px 8px;font-size:11px" oninput="PRM_PARAMS_TEMP[${i}].desc=this.value" placeholder="Açıklama…"><button onclick="PRM_PARAMS_TEMP.splice(${i},1);renderPirimParamsList()" style="background:var(--rdb);border:none;border-radius:4px;padding:3px 7px;cursor:pointer;color:var(--rdt);font-size:11px">✕</button></div>`).join('');
}

function addPirimParam(){PRM_PARAMS_TEMP.push({id:Date.now(),name:'',code:'',rate:0,desc:''});renderPirimParamsList();}

function savePirimParams(){
  if(!isAdmin()){toast('Sadece yönetici pirim parametrelerini güncelleyebilir','err');return;}
  const filtered=PRM_PARAMS_TEMP.filter(p=>p.name.trim());
  storePirimParams(filtered);
  closeMo('mo-pirim-params');
  renderPirim();
  // Ekranda kısa özet uyarı göster
  const summary=filtered.map(p=>`${p.name}: %${p.rate}`).join(' · ');
  const alertEl=document.createElement('div');
  alertEl.style.cssText='position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1E1B4B,#4338CA);color:#fff;padding:14px 24px;border-radius:14px;z-index:9999;font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(67,56,202,.4);max-width:90vw;text-align:center;animation:pus-card-in .3s ease';
  alertEl.innerHTML=`✅ Pirim Parametreleri Güncellendi<br><span style="font-size:11px;opacity:.8;font-weight:400">${summary||'Parametre yok'}</span>`;
  document.body.appendChild(alertEl);
  setTimeout(()=>{alertEl.style.opacity='0';alertEl.style.transition='opacity .4s';setTimeout(()=>alertEl.remove(),400);},3500);
  logActivity('view','Pirim parametreleri güncellendi');
  toast('Parametreler kaydedildi ✓','ok');
}

function getPirimVisible(){try{return localStorage.getItem('ak_pirim_vis_'+(window.Auth?.getCU?.()?.id||0))!=='0';}catch(e){return true;}}

function setPirimVisible(v){
  try{localStorage.setItem('ak_pirim_vis_'+(window.Auth?.getCU?.()?.id||0),v?'1':'0');}catch(e){}
  const btn=document.querySelector('.nb[onclick*="\'pirim\'"]');
  if(btn)btn.style.display=v?'flex':'none';
  const tog=g('pirim-vis-toggle');if(tog)tog.checked=v;
  if(!v&&g('panel-pirim')?.classList.contains('on'))nav('dashboard',document.querySelector('.nb[onclick*="\'dashboard\'"]'));
}


const Pirim = {
  render:          renderPirim,
  renderParams:    renderPirimParams,
  openModal:       openPirimModal,
  save:            savePirim,
  approve:         approvePirim,
  reject:          rejectPirim,
  markPaid:        markPirimPaid,
  del:             delPirim,
  selectType:      selectPirimType,
  onTypeChange:    onPirimTypeChange,
  calcAuto:        calcPirimAuto,
  calcExpiry:      calcPirimExpiry,
  getRate:         getPirimRateFromParams,
  updateRateHint:  updatePirimRateHint,
  exportXlsx:      exportPirimXlsx,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pirim;
} else {
  window.Pirim = Pirim;
  // V18 eklenen fonksiyonlar
  window.renderPirimTrend    = renderPirimTrend;
  window.openPirimApproval   = openPirimApproval;
  window.delPirimRecord      = delPirimRecord;
  window.printPirimSlip      = printPirimSlip;
  window.openPirimParams     = openPirimParams;
  window.renderPirimParamsList = renderPirimParamsList;
  window.addPirimParam       = addPirimParam;
  window.savePirimParams     = savePirimParams;
  window.getPirimVisible     = getPirimVisible;
  window.setPirimVisible     = setPirimVisible;
  // Geriye uyumluluk
  window.renderPirim = function(...args) {
  try {
    return renderPirim(...args);
  } catch(err) {
    console.error('[renderPirim]', err);
    const el = document.getElementById('pirim-list') ||
               document.querySelector('[id*="pirim"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.selectPirimType    = selectPirimType;
  window.onPirimTypeChange  = onPirimTypeChange;
  window.calcPirimAuto      = calcPirimAuto;
  window.calcPirimExpiry    = calcPirimExpiry;
  window.getPirimRateFromParams = getPirimRateFromParams;
  window.updatePirimRateHint = updatePirimRateHint;
  window.savePirim          = savePirim;
  window.approvePirim       = approvePirim;
  window.rejectPirim        = rejectPirim;
  window.exportPirimXlsx    = exportPirimXlsx;
}
