/**
 * ═══════════════════════════════════════════════════════════════
 * src/modules/kargo.js
 * Kargo & Konteyner takip modülü
 * render* fonksiyonları burada — veri için DB.loadKargo() kullan
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

// ── Sabitler ─────────────────────────────────────────────────────
const KARGO_STATUS = {
  bekle:   { l: '⏳ Beklemede', c: 'ba' },
  yolda:   { l: '🚛 Yolda',    c: 'bb' },
  teslim:  { l: '✅ Teslim',   c: 'bg' },
  iade:    { l: '↩️ İade',      c: 'br' },
};

// Konteyner takip URL'leri
const KTN_TRACKING_URLS = {
  'MSC':          'https://www.msc.com/en/track-a-shipment?trackingNumber=',
  'Maersk':       'https://www.maersk.com/tracking/',
  'CMA CGM':      'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=',
  'COSCO':        'https://elines.coscoshipping.com/ebtracking/visible?trNo=',
  'Hapag-Lloyd':  'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=',
  'ONE':          'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?cntrNo=',
  'Evergreen':    'https://www.evergreen-line.com/eservice/cargotracking/ct_input.do?searchType=CT&cntrNum=',
  'ZIM':          'https://www.zim.com/tools/track-a-shipment?container=',
};

let KRG_KONTEYN_TIMER = null;

// ── Yardımcılar ───────────────────────────────────────────────────
// ── V18 uyumluluk shim'leri ──────────────────────────────────────

// ── Kargo Render ─────────────────────────────────────────────────
/**
 * Kargo listesini render eder.
 */
function renderKargo() {
    // skeleton-renderKargo
  const _skCont = document.getElementById('kargo-list');
  if (_skCont && typeof showSkeleton === 'function') showSkeleton(_skCont, 3);

  const kargo   = loadKargo();
  const users   = loadUsers();
  const dirF    = g('krg-dir-f')?.value   || '';
  const statusF = g('krg-status-f')?.value || '';
  const search  = (g('krg-search')?.value  || '').toLowerCase();

  let fl = kargo;
  if (dirF)    fl = fl.filter(k => k.dir    === dirF);
  if (statusF) fl = fl.filter(k => k.status === statusF);
  if (search)  fl = fl.filter(k =>
    (k.firm || '').toLowerCase().includes(search) ||
    (k.from || '').toLowerCase().includes(search) ||
    (k.to   || '').toLowerCase().includes(search)
  );

  // İstatistikler
  st('krg-total',  kargo.length);
  st('krg-bekle',  kargo.filter(k => k.status === 'bekle').length);
  st('krg-teslim', kargo.filter(k => k.status === 'teslim').length);
  st('krg-gelen',  kargo.filter(k => k.dir    === 'gelen').length);
  st('krg-giden',  kargo.filter(k => k.dir    === 'giden').length);

  const nb = g('nb-krg-b');
  if (nb) {
    const n = kargo.filter(k => k.status === 'bekle').length;
    nb.textContent  = n;
    nb.style.display = n > 0 ? 'inline' : 'none';
  }

  const cont = g('kargo-list');
  if (!cont) return;
  if (!fl.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:36px;margin-bottom:12px">📦</div>
      <div>Kargo kaydı bulunamadı.</div>
    </div>`;
    return;
  }

  cont.innerHTML = `<table class="tbl"><thead><tr>
    <th>Yön</th><th>Gönderici</th><th>Alıcı</th><th>Firma</th>
    <th>Tarih</th><th>Durum</th><th>Personel</th><th>İşlem</th>
  </tr></thead><tbody>
  ${fl.map(k => {
    const u   = users.find(x => x.id === k.uid) || { name: '—' };
    const st2 = KARGO_STATUS[k.status] || KARGO_STATUS.bekle;
    return `<tr>
      <td><span class="badge ${k.dir === 'gelen' ? 'bb' : 'ba'}">${k.dir === 'gelen' ? '📥 Gelen' : '📤 Giden'}</span></td>
      <td>${k.from}</td><td>${k.to}</td>
      <td style="font-weight:500">${k.firm || '—'}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--t2)">${k.date}</td>
      <td><span class="badge ${st2.c}">${st2.l}</span></td>
      <td>${u.name}</td>
      <td style="display:flex;gap:4px">
        ${k.status !== 'teslim' ? `<button class="btn btns btng" onclick="Kargo.markTeslim(${k.id})">✓ Teslim</button>` : ''}
        <button class="btn btns" onclick="Kargo.openModal(${k.id})">✏️</button>
        ${isAdmin() ? `<button class="btn btns btnd" onclick="Kargo.del(${k.id})">🗑</button>` : ''}
      </td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

function markKargoTeslim(id) {
  const d = loadKargo();
  const k = d.find(x => x.id === id);
  if (!k) return;
  k.status = 'teslim';
  k.teslimAt = nowTs();
  storeKargo(d);
  renderKargo();
  window.toast?.('Kargo teslim alındı ✓', 'ok');
  logActivity('kargo', `Kargo teslim: ${k.firm} — ${k.to}`);
}

function openKargoModal(id) {
  // ... modal HTML injection (mevcut HTML'deki openKargoModal mantığı)
  window.openMo?.('mo-kargo');
}

function saveKargo() {
  const dir    = g('krg-dir')?.value    || 'gelen';
  const from   = (g('krg-from')?.value  || '').trim();
  const to     = (g('krg-to')?.value    || '').trim();
  const firm   = (g('krg-firm')?.value  || '').trim();
  const date   = g('krg-date')?.value   || '';
  const status = g('krg-status')?.value || 'bekle';
  const eid    = parseInt(g('krg-eid')?.value || '0');

  if (!from || !to) { window.toast?.('Gönderici ve alıcı zorunludur', 'err'); return; }

  const d     = loadKargo();
  const entry = { dir, from, to, firm, date, status, uid: CU()?.id };

  if (eid) {
    const item = d.find(x => x.id === eid);
    if (item) Object.assign(item, entry);
  } else {
    d.push({ id: Date.now(), ...entry });
  }

  storeKargo(d);
  window.closeMo?.('mo-kargo');
  renderKargo();
  logActivity('kargo', `Kargo kaydedildi: ${firm} — ${from} → ${to}`);
  window.toast?.('Kargo kaydedildi ✓', 'ok');
}

function delKargo(id) {
  if (!isAdmin()) { window.toast?.('Yetki yok', 'err'); return; }
  if (!confirm('Bu kargo kaydını silmek istediğinizden emin misiniz?')) return;
  storeKargo(loadKargo().filter(x => x.id !== id));
  renderKargo();
  window.toast?.('Silindi', 'ok');
}

// ── Konteyner Render ─────────────────────────────────────────────
function renderKonteyn() {
  const konts = loadKonteyn();
  const users = loadUsers();
  const cont  = g('konteyn-list');
  if (!cont) return;

  const today   = new Date();
  const todayS  = today.toISOString().slice(0, 10);
  let changed   = false;

  // Tüm adımlar tamam ise otomatik kapat
  konts.forEach(k => {
    if (!k.closed && k.evrakGon && k.evrakUlasti && k.inspectionBitti && k.malTeslim) {
      k.closed    = true;
      k.closedAt  = nowTs();
      changed     = true;
    }
  });
  if (changed) storeKonteyn(konts);

  const active   = konts.filter(k => !k.closed);
  const archived = konts.filter(k => k.closed);

  // Alarm banner
  _renderKonteynAlarms(active, today, g('konteyn-alarm-bar'));

  if (!active.length && !archived.length) {
    cont.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">🚢</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">Aktif konteyner yok</div>
    </div>`;
    return;
  }

  const buildTrackUrl = (hat, no) => {
    const enc = encodeURIComponent(no);
    return (KTN_TRACKING_URLS[hat] || '') + enc;
  };

  const renderStep = (id, key, label, icon, ts) => {
    const done = !!ts;
    return `<div onclick="Kargo.toggleKonteynStep(${id},'${key}')"
      style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;
             cursor:pointer;border:1.5px solid ${done ? 'rgba(34,197,94,.4)' : 'var(--b)'};
             background:${done ? 'rgba(34,197,94,.07)' : 'var(--sf)'};transition:all .18s;min-width:160px;flex:1">
      <div style="width:20px;height:20px;border-radius:50%;
           border:2px solid ${done ? '#22C55E' : '#CBD5E1'};
           background:${done ? '#22C55E' : 'transparent'};
           display:flex;align-items:center;justify-content:center;
           flex-shrink:0;font-size:10px;color:#fff;font-weight:900">${done ? '✓' : ''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:${done ? '#16A34A' : 'var(--t2)'}">${icon} ${label}</div>
        ${ts ? `<div style="font-size:9px;color:#22C55E;font-family:'DM Mono',monospace">${ts.slice(0, 10)}</div>`
             : `<div style="font-size:9px;color:var(--t3)">Bekliyor</div>`}
      </div>
    </div>`;
  };

  const renderCard = (k, isArchived = false) => {
    const u        = users.find(x => x.id === k.uid) || { name: '?' };
    const etaDate  = k.eta ? new Date(k.eta) : null;
    const daysLeft = etaDate ? Math.ceil((etaDate - today) / 86400000) : null;
    const urgent   = !isArchived && daysLeft !== null && daysLeft <= 5  && daysLeft > 0;
    const near     = !isArchived && daysLeft !== null && daysLeft <= 10 && daysLeft > 0;
    const overdue  = !isArchived && daysLeft !== null && daysLeft <= 0;
    const trackUrl = k.url || buildTrackUrl(k.hat, k.no);
    const stepsDone = [k.evrakGon, k.evrakUlasti, k.inspectionBitti, k.malTeslim, k.closed].filter(Boolean).length;
    const pct       = Math.round(stepsDone / 5 * 100);
    const borderColor = isArchived ? 'var(--b)' : urgent || overdue ? '#EF4444' : near ? '#F59E0B' : 'var(--b)';

    return `<div style="border:2px solid ${borderColor};border-radius:16px;padding:18px;
                         box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:800;font-family:'DM Mono',monospace">🚢 ${k.no}</div>
          ${k.hat ? `<span style="font-size:10px;font-weight:700;background:rgba(99,102,241,.1);color:#6366F1;padding:2px 9px;border-radius:6px">${k.hat}</span>` : ''}
          ${urgent  ? `<span style="font-size:10px;font-weight:700;background:rgba(239,68,68,.12);color:#DC2626;padding:2px 9px;border-radius:6px">🚨 ${daysLeft} Gün!</span>` : ''}
          ${near && !urgent ? `<span style="font-size:10px;font-weight:700;background:rgba(245,158,11,.12);color:#D97706;padding:2px 9px;border-radius:6px">⏰ ${daysLeft} Gün</span>` : ''}
          ${overdue ? `<span style="font-size:10px;font-weight:700;background:rgba(239,68,68,.12);color:#DC2626;padding:2px 9px;border-radius:6px">⚠️ ETA Geçti</span>` : ''}
          <div style="font-size:11px;color:var(--t3);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            ${k.etd ? `<span>ETD: <strong>${k.etd}</strong></span>` : ''}
            ${k.eta ? `<span>ETA: <strong style="color:${overdue ? '#DC2626' : urgent ? '#DC2626' : 'var(--t)'}">${k.eta}</strong></span>` : ''}
            <span>👤 ${u.name}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div style="font-size:18px;font-weight:800;color:${pct === 100 ? '#22C55E' : 'var(--ac)'}">
            ${pct}% <span style="font-size:10px;color:var(--t3)">${stepsDone}/5</span>
          </div>
          <div style="display:flex;gap:5px">
            ${trackUrl ? `<a href="${trackUrl}" target="_blank" rel="noopener" class="btn" style="text-decoration:none;font-size:11px;background:#6366F1;color:#fff;border-color:#6366F1;padding:5px 11px">🔗 Takip</a>` : ''}
            ${!isArchived ? `<button class="btn btns" onclick="Kargo.openKonteynModal(${k.id})">✏️</button>` : ''}
            ${isAdmin() && !isArchived ? `<button class="btn btns btnd" onclick="Kargo.delKonteyn(${k.id})">🗑</button>` : ''}
          </div>
        </div>
      </div>
      <div style="height:4px;background:var(--s2);border-radius:99px;margin-bottom:14px;overflow:hidden">
        <div style="height:100%;background:${pct === 100 ? '#22C55E' : 'linear-gradient(90deg,#6366F1,#8B5CF6)'};width:${pct}%;border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${renderStep(k.id, 'evrakGon',      'Evrak Gönderildi',          '📄', k.evrakTarih)}
        ${renderStep(k.id, 'evrakUlasti',   'Müşteri Evrak Teslim Aldı', '📬', k.evrakUlastiTarih)}
        ${renderStep(k.id, 'inspectionBitti','Inspection Bitti',          '🔍', k.inspectionTarih)}
        ${renderStep(k.id, 'malTeslim',     'Müşteri Malları Teslim Aldı','📦', k.malTeslimTarih)}
      </div>
    </div>`;
  };

  let html = '';
  if (active.length) {
    html += `<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">
      🚢 Aktif — ${active.length} konteyner</div>`;
    html += active.map(k => renderCard(k, false)).join('');
  }
  if (archived.length) {
    html += `<details style="margin-top:16px">
      <summary style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;cursor:pointer;padding:8px 0">
        ✅ Tamamlananlar — ${archived.length} konteyner
      </summary>
      <div style="margin-top:8px;opacity:.7">${archived.map(k => renderCard(k, true)).join('')}</div>
    </details>`;
  }
  cont.innerHTML = html;
}

function _renderKonteynAlarms(active, today, alarmEl) {
  if (!alarmEl) return;
  const alarmlar = [];
  active.forEach(k => {
    const etaDate  = k.eta ? new Date(k.eta) : null;
    const daysLeft = etaDate ? Math.ceil((etaDate - today) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 10 && daysLeft > 0) {
      if (!k.evrakGon) alarmlar.push(`📄 <strong>${k.no}</strong>: Orijinal evrak gönderilmedi — <strong>${daysLeft} gün</strong> kaldı`);
    }
    if (daysLeft !== null && daysLeft <= 0) alarmlar.push(`⚠️ <strong>${k.no}</strong>: ETA geçti! Durumu güncelleyin`);
  });
  alarmEl.innerHTML = alarmlar.length
    ? `<div style="background:var(--rdb);border-left:4px solid var(--rd);border-radius:10px;padding:10px 16px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;color:var(--rdt);margin-bottom:6px">🚨 ${alarmlar.length} Dikkat Gerektiren Konteyner</div>
        ${alarmlar.map(a => `<div style="font-size:11px;color:var(--rdt);margin-top:3px">• ${a}</div>`).join('')}
       </div>`
    : '';
}

function toggleKonteynStep(id, key) {
  const d    = loadKonteyn();
  const k    = d.find(x => x.id === id);
  if (!k) return;
  const tsKey = { evrakGon: 'evrakTarih', evrakUlasti: 'evrakUlastiTarih', inspectionBitti: 'inspectionTarih', malTeslim: 'malTeslimTarih' };
  const today = new Date().toISOString().slice(0, 10);
  if (k[key]) {
    k[key] = false; k[tsKey[key]] = '';
    if (k.closed) { k.closed = false; k.closedAt = ''; }
  } else {
    k[key] = true;
    if (tsKey[key]) k[tsKey[key]] = today;
    if (k.evrakGon && k.evrakUlasti && k.inspectionBitti && k.malTeslim) {
      k.closed    = true;
      k.closedAt  = today;
      window.toast?.(`✅ ${k.no} — tüm adımlar tamamlandı`, 'ok');
    }
  }
  storeKonteyn(d);
  renderKonteyn();
  logActivity('kargo', `Konteyner ${k.no}: ${key} güncellendi`);
}

function delKonteyn(id) {
  if (!isAdmin()) return;
  if (!confirm('Konteyner silinsin mi?')) return;
  storeKonteyn(loadKonteyn().filter(x => x.id !== id));
  renderKonteyn();
}

function checkAllKonteyn() {
  const konts = loadKonteyn().filter(k => !k.closed);
  if (!konts.length) { window.toast?.('Aktif konteyner yok', 'ok'); return; }
  const now     = nowTs();
  const today   = new Date();
  let alertCount = 0;
  konts.forEach(k => {
    k.lastCheck = now;
    if (!k.eta) return;
    const daysLeft = Math.ceil((new Date(k.eta) - today) / 86400000);
    const prev     = k.lastAlert || 999;
    if (daysLeft === 10 && prev > 10) { k.lastAlert = 10; window.addNotif?.('🚢', `${k.no}: 10 gün kaldı`, 'warn', 'kargo'); alertCount++; }
    if (daysLeft <= 0 && prev > 0)    { k.lastAlert = 0; k.status = 'Teslim'; window.addNotif?.('✅', `${k.no}: ETA geçti!`, 'ok', 'kargo'); alertCount++; }
  });
  storeKonteyn(konts);
  renderKonteyn();
  if (alertCount) window.toast?.(alertCount + ' konteyner uyarısı!', 'ok');
  else window.toast?.('Konteynerler kontrol edildi ✓', 'ok');
}

function startKonteynPolling() {
  clearInterval(KRG_KONTEYN_TIMER);
  KRG_KONTEYN_TIMER = setInterval(checkAllKonteyn, 3 * 60 * 60 * 1000);
}

// ── Excel Export ──────────────────────────────────────────────────
function exportKargoXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const rows  = loadKargo().map(k => ({
    Yön:      k.dir === 'gelen' ? 'Gelen' : 'Giden',
    Gönderici: k.from, Alıcı: k.to, Firma: k.firm,
    Tarih:    k.date,  Durum: KARGO_STATUS[k.status]?.l || k.status,
    Personel: (users.find(x => x.id === k.uid) || { name: '?' }).name,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kargo');
  XLSX.writeFile(wb, `Kargo_${nowTs().slice(0, 10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}

// ── Dışa Aktarım ─────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// V18 EKSİK FONKSİYONLAR — KARGO
// ════════════════════════════════════════════════════════════════

function setKargoFilter(f,btn){KARGO_FILTER=f;document.querySelectorAll('#panel-kargo .chip').forEach(b=>b.classList.remove('on'));if(btn)btn.classList.add('on');renderKargo();}

function openKargoFirmaModal(){
  renderKargoFirmaList();g('krg-firma-add-row').style.display='none';g('krg-firma-new-name').value='';openMo('mo-krg-firma');
}

function renderKargoFirmaList(){
  const firms=loadKargoFirmalar();const cont=g('krg-firma-list');if(!cont)return;
  cont.innerHTML=firms.map(f=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--b)"><span style="font-size:13px">🚚 ${f}</span>${isAdmin()?`<button class="btn btns btnd" onclick="delKargoFirma('${f}')">🗑</button>`:''}</div>`).join('');
  // Also update kargo modal select
  const sel=g('krg-firm');if(sel)sel.innerHTML=firms.map(f=>`<option>${f}</option>`).join('');
}

function addKargoFirma(){
  const name=(g('krg-firma-new-name').value||'').trim();if(!name){toast('Firma adı zorunludur','err');return;}
  const firms=loadKargoFirmalar();if(firms.includes(name)){toast('Bu firma zaten mevcut','err');return;}
  if(!isAdmin()){toast('Ekleme talebi yöneticiye iletildi','ok');closeMo('mo-krg-firma');logActivity('view',`"${name}" kargo firması ekleme talebi oluşturdu`);return;}
  firms.push(name);storeKargoFirmalar(firms);renderKargoFirmaList();g('krg-firma-add-row').style.display='none';toast(name+' eklendi ✓','ok');logActivity('view',`"${name}" kargo firması ekledi`);
}

function delKargoFirma(name){
  if(!isAdmin()){toast('Yetki yok','err');return;}
  if(!confirm(`"${name}" kargo firmasını silmek istediğinizden emin misiniz?\n\nBu işlem yönetici onayı ile gerçekleşir.`))return;
  const firms=loadKargoFirmalar().filter(f=>f!==name);storeKargoFirmalar(firms);renderKargoFirmaList();toast(name+' silindi','ok');logActivity('view',`"${name}" kargo firmasını sildi`);
}

function printKargoLabel(){
  const from=g('krg-from').value||'—',to=g('krg-to').value||'—',addr=g('krg-addr').value||'—',firm=g('krg-firm').value,note=g('krg-note').value;
  const fromTel2=g('krg-from-tel')?.value||'',fromGsm2=g('krg-from-gsm')?.value||'',toTel2=g('krg-to-tel')?.value||'',toGsm2=g('krg-to-gsm')?.value||'';
  const win=window.open('','_blank','width=420,height=420');
  win.document.write(`<!DOCTYPE html><html><head><title>Kargo Etiketi</title><style>body{font-family:sans-serif;padding:20px;border:2px solid #000;max-width:380px}h2{text-align:center;margin-bottom:16px;font-size:16px}.row{margin-bottom:10px;font-size:13px}.lbl{font-weight:700;font-size:10px;text-transform:uppercase;color:#666}hr{margin:12px 0;border-color:#000}</style></head><body><h2>📦 ${firm} KARGO ETİKETİ</h2><hr><div class="row"><div class="lbl">GÖNDERİCİ</div>${from}</div><hr><div class="row"><div class="lbl">ALICI</div>${to}</div><div class="row"><div class="lbl">ADRES</div>${addr}</div><hr><div class="row" style="font-size:11px;color:#666">Tarih: ${nowTs().slice(0,10)} · ${note||''}</div><script>window.print();<\/script></body></html>`);
}

function openKargoTeslimModal(id){
  const users=loadUsers();const sel=g('krg-teslim-user');
  if(sel)sel.innerHTML=users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  g('krg-teslim-id').value=id;
  g('krg-teslim-date').valueAsDate=new Date();
  g('krg-teslim-note').value='';
  const preview=g('krg-teslim-preview');if(preview)preview.innerHTML='';
  openMo('mo-krg-teslim');
}

function saveKargoTeslim(){
  const id=parseInt(g('krg-teslim-id').value||'0');if(!id)return;
  const date=g('krg-teslim-date').value;if(!date){toast('Teslim tarihi zorunludur','err');return;}
  const d=loadKargo();const k=d.find(x=>x.id===id);if(!k)return;
  const uid=parseInt(g('krg-teslim-user').value||'0');
  const note=g('krg-teslim-note').value.trim();
  const fileInput=g('krg-teslim-file');
  const processUpdate=(fileData)=>{
    k.status='teslim';k.teslimDate=date;k.teslimUid=uid;k.teslimNote=note;
    if(fileData)k.teslimFile=fileData;
    storeKargo(d);closeMo('mo-krg-teslim');renderKargo();renderDashboard();
    const u=loadUsers().find(x=>x.id===uid);
    logActivity('view',`Kargo teslim belgesi ekledi (${k.from}→${k.to}, ${date}, ${u?.name||'?'})`);
    toast('Teslim kaydı tamamlandı ✓','ok');
  };
  if(fileInput&&fileInput.files&&fileInput.files[0]){
    const file=fileInput.files[0];if(file.size>2097152){toast('Dosya 2MB\'dan küçük olmalıdır','err');return;}
    const reader=new FileReader();
    reader.onload=e=>processUpdate({name:file.name,type:file.type,data:e.target.result});
    reader.readAsDataURL(file);
  }else{processUpdate(null);}
}

function checkAllKargoStatus(){
  const kargos=loadKargo().filter(k=>k.status!=='teslim'&&k.note); // takip numarası olanlar
  if(!kargos.length)return;
  const now=nowTs();const checks=loadKargoChecks();
  kargos.forEach(k=>{
    // Gerçek API yoksa demo mode: takip no varsa simüle et
    if(k.note&&k.note.length>5){
      checks[k.id]=checks[k.id]||{};
      checks[k.id].lastCheck=now;
      // Demo: 3 gün sonra yolda, 7 gün sonra teslim
      const daysSince=Math.floor((Date.now()-k.id)/86400000);
      const prevStatus=k.status;
      if(daysSince>=7&&k.status!=='teslim'){
        k.status='teslim';checks[k.id].status='teslim';
        addNotif('📦','Kargo TESLIM EDILDI: '+k.from+' > '+k.to+' ('+k.firm+' '+k.note+')','ok','kargo');
        // Visible alert
        if(document.getElementById('panel-kargo').classList.contains('on')||true){
          showKargoAlert('Kargo Teslim Edildi!',k.from+' > '+k.to,'teslim');
        }
      }else if(daysSince>=3&&k.status==='bekle'){
        k.status='yolda';checks[k.id].status='yolda';
        addNotif('🚚','Kargo yola cikti: '+k.note+' ('+k.firm+'): Yolda','info','kargo');
      }
    }
  });
  storeKargoChecks(checks);storeKargo(loadKargo().map(k=>{const upd=checks[k.id];return upd&&upd.status?{...k,status:upd.status,lastCheck:upd.lastCheck}:k;}));
  st('krg-last-check','Son kontrol: '+now.slice(11,16));renderKargo();
}

function saveKonteyn(){
  const no=g('ktn-no').value.trim();if(!no){toast('Konteyner no zorunludur','err');return;}
  const d=loadKonteyn();const eid=parseInt(g('ktn-eid').value||'0');
  const hat=g('ktn-hat')?.value||'';
  const noEncoded=encodeURIComponent(no.trim());
  const deepLinks={
    'MSC':'https://www.msc.com/en/track-a-shipment?trackingNumber='+noEncoded,
    'Maersk':'https://www.maersk.com/tracking/'+noEncoded,
    'CMA CGM':'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference='+noEncoded,
    'COSCO':'https://elines.coscoshipping.com/ebtracking/visible?trNo='+noEncoded,
    'Hapag-Lloyd':'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container='+noEncoded,
    'ONE':'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?cntrNo='+noEncoded,
    'Evergreen':'https://www.evergreen-line.com/eservice/cargotracking/ct_input.do?searchType=CT&cntrNum='+noEncoded,
    'Yang Ming':'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?SearchType=3&CNTNO='+noEncoded,
    'ZIM':'https://www.zim.com/tools/track-a-shipment?container='+noEncoded,
  };
  const userUrl=g('ktn-url').value.trim();
  const autoUrl=deepLinks[hat]||KTN_TRACKING_URLS[hat]||'';
  const finalUrl=userUrl||autoUrl;
  const today=new Date().toISOString().slice(0,10);
  const evrakGon=g('ktn-evrak-gon')?.checked||false;
  const evrakUlasti=g('ktn-evrak-ulasti')?.checked||false;
  const inspectionBitti=g('ktn-inspection')?.checked||false;
  const malTeslim=g('ktn-mal-teslim')?.checked||false;

  const entry={no,hat,fromPort:g('ktn-from-port').value,toPort:g('ktn-to-port').value,
    etd:g('ktn-etd').value,eta:g('ktn-eta').value,desc:g('ktn-desc').value,
    url:finalUrl,uid:parseInt(g('ktn-user').value||CU?.id),ihracatId:g('ktn-ihracat-id')?.value||'',musteri:g('ktn-musteri')?.value||'',
    evrakGon,evrakTarih:evrakGon?(g('ktn-evrak-tarih')?.value||today):'',
    evrakUlasti,evrakUlastiTarih:evrakUlasti?today:'',
    inspectionBitti,inspectionTarih:inspectionBitti?today:'',
    malTeslim,malTeslimTarih:malTeslim?today:'',
    status:'Aktif',lastCheck:'',createdAt:nowTs()};

  // Tüm adımlar tamam mı?
  if(evrakGon&&evrakUlasti&&inspectionBitti&&malTeslim){
    entry.closed=true;entry.closedAt=today;
    toast('Tüm adımlar tamamlandı — konteyner kapatıldı ✓','ok');
  }else{
    entry.closed=false;entry.closedAt='';
  }

  if(eid){
    const e=d.find(x=>x.id===eid);
    if(e){
      // Tarih bilgilerini koru (daha önce girilmiş ise)
      if(!entry.evrakTarih&&e.evrakTarih)entry.evrakTarih=e.evrakTarih;
      if(!entry.evrakUlastiTarih&&e.evrakUlastiTarih)entry.evrakUlastiTarih=e.evrakUlastiTarih;
      if(!entry.inspectionTarih&&e.inspectionTarih)entry.inspectionTarih=e.inspectionTarih;
      if(!entry.malTeslimTarih&&e.malTeslimTarih)entry.malTeslimTarih=e.malTeslimTarih;
      Object.assign(e,entry);
    }
  }else{
    d.push({id:Date.now(),...entry});
  }
  storeKonteyn(d);closeMo('mo-konteyn');renderKonteyn();
  logActivity('view','Konteyner kaydedildi: '+no);
  if(!entry.closed)toast('Konteyner kaydedildi ✓','ok');
}

function closeKonteyn(id){const d=loadKonteyn();const k=d.find(x=>x.id===id);if(!k)return;k.closed=true;k.closedAt=nowTs();storeKonteyn(d);renderKonteyn();toast('Konteyner kapatildi','ok');}

function updKargoSt(id){const d=loadKargo();const k=d.find(x=>x.id===id);if(!k)return;const cycle=['bekle','yolda','teslim'];k.status=cycle[(cycle.indexOf(k.status)+1)%cycle.length];storeKargo(d);renderKargo();toast('Durum güncellendi ✓','ok');}

function permDeleteKonteyn(id){
  if(!isAdmin())return;
  if(!confirm('Arşivlenen konteyner kalıcı silinsin mi?'))return;
  storeKonteyn(loadKonteyn().filter(x=>x.id!==id));
  renderKonteyn();toast('Silindi','ok');
}


const Kargo = {
  render:             renderKargo,
  renderKonteyn,
  openModal:          openKargoModal,
  save:               saveKargo,
  del:                delKargo,
  markTeslim:         markKargoTeslim,
  toggleKonteynStep,
  delKonteyn,
  openKonteynModal:   () => window.openMo?.('mo-konteyn'),
  checkAll:           checkAllKonteyn,
  startPolling:       startKonteynPolling,
  exportXlsx:         exportKargoXlsx,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Kargo;
} else {
  window.Kargo = Kargo;
  // V18 eklenen fonksiyonlar
  window.setKargoFilter      = setKargoFilter;
  window.openKargoFirmaModal = openKargoFirmaModal;
  window.renderKargoFirmaList= renderKargoFirmaList;
  window.addKargoFirma       = addKargoFirma;
  window.delKargoFirma       = delKargoFirma;
  window.printKargoLabel     = printKargoLabel;
  window.openKargoTeslimModal= openKargoTeslimModal;
  window.saveKargoTeslim     = saveKargoTeslim;
  window.checkAllKargoStatus = checkAllKargoStatus;
  window.saveKonteyn         = saveKonteyn;
  window.closeKonteyn        = closeKonteyn;
  window.updKargoSt          = updKargoSt;
  window.permDeleteKonteyn   = permDeleteKonteyn;
  // Geriye uyumluluk
  window.renderKargo = function(...args) {
  try {
    return renderKargo(...args);
  } catch(err) {
    console.error('[renderKargo]', err);
    const el = document.getElementById('kargo-list') ||
               document.querySelector('[id*="kargo"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.renderKonteyn = function(...args) {
  try {
    return renderKonteyn(...args);
  } catch(err) {
    console.error('[renderKonteyn]', err);
    const el = document.getElementById('konteyn-list') ||
               document.querySelector('[id*="konteyn"]');
    if (el) el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t2)">⚠️ Yüklenemedi. Sayfayı yenileyin.</div>';
    window.toast?.('Panel yüklenemedi', 'err');
  }
};
  window.toggleKonteynStep = toggleKonteynStep;
  window.checkAllKonteyn  = checkAllKonteyn;
  window.exportKargoXlsx  = exportKargoXlsx;
}
