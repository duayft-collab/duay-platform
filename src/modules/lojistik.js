/**
 * src/modules/lojistik.js  —  v3.0.0
 * Lojistik Merkezi — Sade & Profesyonel
 */
'use strict';

function renderLojistik() {
  const panel = document.getElementById('panel-lojistik');
  if (!panel) return;

  const kargo  = typeof loadKargo   === 'function' ? loadKargo()   : [];
  const konts  = typeof loadKonteyn === 'function' ? loadKonteyn() : [];
  const users  = typeof loadUsers   === 'function' ? loadUsers()   : [];
  const today  = new Date();
  const todayS = today.toISOString().slice(0, 10);

  // İstatistikler
  const stats = {
    kargoToplam:  kargo.length,
    kargoBekle:   kargo.filter(k => k.status === 'bekle').length,
    kargoYolda:   kargo.filter(k => k.status === 'yolda').length,
    kargoTeslim:  kargo.filter(k => k.status === 'teslim').length,
    kontsAktif:   konts.filter(k => !k.closed).length,
    kontsAlarm:   konts.filter(k => {
      if (k.closed || !k.eta) return false;
      return Math.ceil((new Date(k.eta) - today) / 86400000) <= 7;
    }).length,
  };

  // Yaklaşan ETA (7 gün)
  const etaList = konts
    .filter(k => !k.closed && k.eta)
    .map(k => ({ ...k, dl: Math.ceil((new Date(k.eta) - today) / 86400000) }))
    .filter(k => k.dl <= 14)
    .sort((a, b) => a.dl - b.dl)
    .slice(0, 4);

  // Son 4 kargo
  const recentKargo = [...kargo]
    .sort((a, b) => (b.id||0) - (a.id||0))
    .slice(0, 4);

  // Alarm konteynerleri
  const alarmKonts = konts.filter(k => {
    if (k.closed || !k.eta) return false;
    const dl = Math.ceil((new Date(k.eta) - today) / 86400000);
    return dl <= 10 && (!k.evrakGon || !k.evrakUlasti || !k.inspectionBitti || !k.malTeslim);
  }).slice(0, 3);

  panel.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">🚢 Lojistik Merkezi</div>
        <div class="phs">Kargo ve konteyner operasyonlarına genel bakış</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btns" onclick="nav('kargo',document.querySelector('.nb[onclick*=kargo]'))" style="font-size:12px;border-radius:9px">📦 Kargo Yönetimi</button>
        <button class="btn btnp" onclick="window.openKonteynModal(null)" style="font-size:12px;border-radius:9px">+ Konteyner Ekle</button>
      </div>
    </div>

    <!-- İstatistikler -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="14" r="1" fill="currentColor"/><circle cx="14" cy="14" r="1" fill="currentColor"/></svg>', stats.kargoToplam, 'Toplam Kargo', '#6366F1')}
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', stats.kargoYolda, 'Yolda', '#3B82F6')}
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', stats.kargoTeslim, 'Teslim', '#22C55E')}
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="2" y="7" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 7V5a4 4 0 018 0v2" stroke="currentColor" stroke-width="1.5"/></svg>', stats.kargoBekle, 'Beklemede', '#F59E0B')}
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 2L3 7v11h14V7L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 18v-6h6v6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>', stats.kontsAktif, 'Aktif Konteyner', '#8B5CF6')}
      ${_ls('<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 6v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/></svg>', stats.kontsAlarm, 'ETA Alarmı', '#EF4444')}
    </div>

    <!-- Alarm Banner -->
    ${alarmKonts.length ? `
    <div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:14px 16px;margin-bottom:18px">
      <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:8px">
        <svg width="14" height="14" fill="none" viewBox="0 0 14 14" style="vertical-align:middle;margin-right:4px"><path d="M7 1L1 12h12L7 1z" stroke="#DC2626" stroke-width="1.3" stroke-linejoin="round"/><path d="M7 5v3M7 10v.5" stroke="#DC2626" stroke-width="1.3" stroke-linecap="round"/></svg>
        ${alarmKonts.length} konteyner dikkat gerektiriyor
      </div>
      ${alarmKonts.map(k => {
        const dl = Math.ceil((new Date(k.eta) - today) / 86400000);
        const eksik = !k.evrakGon ? 'Evrak gönderilmedi' : !k.evrakUlasti ? 'Müşteri evrak almadı' : !k.inspectionBitti ? 'Inspection bekleniyor' : 'Mal teslimi bekleniyor';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid rgba(239,68,68,.1)">
          <div style="font-size:12px;color:#7F1D1D"><span style="font-family:monospace;font-weight:700">${k.no}</span> — ${eksik}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:700;color:${dl<=3?'#DC2626':'#D97706'}">${dl<=0?'ETA Geçti':dl+' gün'}</span>
            <button onclick="window.openKonteynDetail(${k.id})" class="btn btns" style="font-size:11px;padding:3px 10px;border-radius:7px">Detay</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- İki Kolon Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- Yaklaşan ETA -->
      <div class="card">
        <div class="ch">
          <span class="ct">Yaklaşan ETA</span>
          <button class="btn btns" onclick="nav('kargo',null)" style="font-size:11px">Tümü →</button>
        </div>
        <div style="padding:0 2px">
          ${etaList.length ? etaList.map(k => {
            const u = users.find(x => x.id === k.uid) || { name: '?' };
            const isU = k.dl <= 0, isA = !isU && k.dl <= 5;
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--b)">
              <div>
                <div style="font-size:13px;font-weight:700;font-family:monospace">${k.no}</div>
                <div style="font-size:10px;color:var(--t3);margin-top:1px">${k.hat||'—'} · ${u.name}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:13px;font-weight:700;color:${isU?'#DC2626':isA?'#D97706':'var(--ac)'}">${isU?'Geçti':k.dl+' gün'}</div>
                <div style="font-size:10px;color:var(--t3);font-family:monospace">${k.eta||''}</div>
              </div>
            </div>`;
          }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Yaklaşan ETA yok</div>'}
        </div>
      </div>

      <!-- Son Kargolar -->
      <div class="card">
        <div class="ch">
          <span class="ct">Son Hareketler</span>
          <button class="btn btns" onclick="nav('kargo',null)" style="font-size:11px">Tümü →</button>
        </div>
        <div style="padding:0 2px">
          ${recentKargo.length ? recentKargo.map(k => {
            const ST = { bekle:{c:'#D97706',ic:'⏳'}, yolda:{c:'#3B82F6',ic:'🚛'}, teslim:{c:'#16A34A',ic:'✅'}, iade:{c:'#EF4444',ic:'↩'} };
            const s = ST[k.status] || ST.bekle;
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--b)">
              <div style="font-size:18px;flex-shrink:0">${k.dir==='gelen'?'📥':'📤'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k.from||'—'} → ${k.to||'—'}</div>
                <div style="font-size:10px;color:var(--t3)">${k.firm||'—'} · ${k.date||''}</div>
              </div>
              <span style="font-size:11px;font-weight:600;color:${s.c};white-space:nowrap">${s.ic}</span>
            </div>`;
          }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Kargo kaydı yok</div>'}
        </div>
      </div>

    </div>

    <!-- Hızlı İşlemler -->
    <div class="card">
      <div class="ch"><span class="ct">Hızlı İşlemler</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--b);border-radius:0 0 10px 10px;overflow:hidden">
        ${[
          { ic:'📥', l:'Gelen Kargo',    fn:"openKargoModal('gelen')" },
          { ic:'📤', l:'Giden Kargo',    fn:"openKargoModal('giden')" },
          { ic:'🚢', l:'Konteyner Ekle', fn:'window.openKonteynModal(null)' },
          { ic:'↻',  l:'Kontrol Et',     fn:'checkAllKonteyn()' },
          { ic:'⬇',  l:'Excel İndir',   fn:'exportKargoXlsx()' },
          { ic:'⬆',  l:'Excel Yükle',   fn:'importKargoFile()' },
          { ic:'🖨',  l:'PDF Rapor',     fn:'printKargoRapor()' },
          { ic:'📦',  l:'Tüm Kargolar',  fn:"nav('kargo',null)" },
        ].map(b => `<button onclick="${b.fn}" style="background:var(--sf);border:none;cursor:pointer;padding:16px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;transition:background .15s;font-family:inherit" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background='var(--sf)'">
          <span style="font-size:22px">${b.ic}</span>
          <span style="font-size:11px;color:var(--t2);font-weight:500">${b.l}</span>
        </button>`).join('')}
      </div>
    </div>
  `;
}

function _ls(iconSvg, val, label, color) {
  return `<div style="background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;border-radius:10px;background:${color}18;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${iconSvg}</div>
    <div>
      <div style="font-size:22px;font-weight:700;color:var(--t);line-height:1">${val}</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${label}</div>
    </div>
  </div>`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLojistik };
} else {
  window.renderLojistik = renderLojistik;
}
