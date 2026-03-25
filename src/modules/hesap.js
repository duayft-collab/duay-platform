/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/hesap.js  —  v8.1.0
 * Döviz & Altın Hesap Makinesi — V18'den adapte edildi
 * Alış/Satış hesaplama, yer karşılaştırma, geçmiş kayıt
 * ════════════════════════════════════════════════════════════════
 */
(function(){
'use strict';

const _ghs  = id => document.getElementById(id);
const _sths = (id,v) => { const el = _ghs(id); if (el) el.textContent = v; };
const _isAdminHs = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUhs      = () => window.Auth?.getCU?.();
const _nowTsHs   = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
};


// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL INJECT
// ════════════════════════════════════════════════════════════════

function _injectHesapPanel() {
  const p = _ghs('panel-hesap');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">🧮 Hesap Makinesi</div>
        <div class="phs">Döviz, altın alış/satış hesaplama ve karşılaştırma</div>
      </div>
      <div class="ur">
        <button class="btn btns" onclick="exportHesapXlsx()">⬇ Excel</button>
        <button class="btn btns" onclick="printHesapReport()">🖨 PDF</button>
      </div>
    </div>

    <!-- Hesaplama Formu -->
    <div class="card" style="margin-bottom:18px">
      <div class="ch"><span class="ct">📊 Döviz / Altın Hesaplama</span></div>
      <div style="padding:18px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <label class="fl">İŞLEM TÜRÜ</label>
            <select class="fi" id="hsp-tip" style="padding:8px 10px">
              <option value="doviz">💱 Döviz</option>
              <option value="altin">🥇 Altın</option>
              <option value="diger">📌 Diğer</option>
            </select>
          </div>
          <div>
            <label class="fl">CİNS</label>
            <select class="fi" id="hsp-cins" style="padding:8px 10px">
              <option>USD</option><option>EUR</option><option>GBP</option>
              <option>CHF</option><option>JPY</option><option>Gram Altın</option>
              <option>Çeyrek</option><option>Yarım</option><option>Tam</option>
            </select>
          </div>
          <div>
            <label class="fl">MİKTAR</label>
            <input type="number" class="fi" id="hsp-miktar" value="100" style="padding:8px 10px" oninput="calcHesap()">
          </div>
          <div>
            <label class="fl">ALIŞ YERİ</label>
            <input class="fi" id="hsp-yer" placeholder="Ziraat, Sarraf, Borsa…" style="padding:8px 10px">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <label class="fl">ALIŞ KURU / FİYATI</label>
            <input type="number" class="fi" id="hsp-alis" placeholder="32.50" style="padding:8px 10px" oninput="calcHesap()">
          </div>
          <div>
            <label class="fl">SATIŞ KURU / FİYATI</label>
            <input type="number" class="fi" id="hsp-satis" placeholder="32.70" style="padding:8px 10px" oninput="calcHesap()">
          </div>
          <div>
            <label class="fl">KOMİSYON (%)</label>
            <input type="number" class="fi" id="hsp-kom" placeholder="0" value="0" style="padding:8px 10px" oninput="calcHesap()">
          </div>
          <div>
            <label class="fl">KDV (%)</label>
            <input type="number" class="fi" id="hsp-kdv" placeholder="0" value="0" style="padding:8px 10px" oninput="calcHesap()">
          </div>
        </div>

        <!-- Sonuç Kutusu -->
        <div id="hsp-result" style="background:var(--al);border-radius:var(--rs);padding:16px;margin-bottom:14px;display:none">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            <div>
              <div style="font-size:11px;color:var(--at);font-weight:600;margin-bottom:4px">ALIŞ TUTARI</div>
              <div style="font-size:20px;font-weight:600;color:var(--at);font-family:'DM Mono',monospace" id="hsp-r-alis">—</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--at);font-weight:600;margin-bottom:4px">SATIŞ TUTARI</div>
              <div style="font-size:20px;font-weight:600;color:var(--at);font-family:'DM Mono',monospace" id="hsp-r-satis">—</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--at);font-weight:600;margin-bottom:4px">KÂR / ZARAR</div>
              <div style="font-size:20px;font-weight:600;font-family:'DM Mono',monospace" id="hsp-r-kar">—</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--at);font-weight:600;margin-bottom:4px">NET KÂR ORANI</div>
              <div style="font-size:20px;font-weight:600;font-family:'DM Mono',monospace" id="hsp-r-pct">—</div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btnp" onclick="saveHesap()">💾 Kaydet</button>
          <button class="btn" onclick="calcHesap()">= Hesapla</button>
          <button class="btn" onclick="clearHesap()">✕ Temizle</button>
        </div>
      </div>
    </div>

    <!-- Yer Karşılaştırma -->
    <div class="card" style="margin-bottom:18px">
      <div class="ch">
        <span class="ct">⚖️ Yer Karşılaştırma</span>
        <span style="font-size:11px;color:var(--t2)">Aynı işlem için farklı yerler</span>
      </div>
      <div style="padding:16px">
        <div id="hsp-compare-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:14px"></div>
        <button class="btn btns" onclick="addCompareRow()" style="border-style:dashed">+ Yer Ekle</button>
      </div>
    </div>

    <!-- Geçmiş -->
    <div class="card">
      <div class="ch">
        <span class="ct">📋 Hesap Geçmişi</span>
        <button class="btn btns btnd" onclick="clearHesapHistory()" style="font-size:11px">Temizle</button>
      </div>
      <div id="hesap-history" style="overflow-x:auto"></div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — HESAPLAMA
// ════════════════════════════════════════════════════════════════

function calcHesap() {
  const miktar = parseFloat(_ghs('hsp-miktar')?.value) || 0;
  const alis   = parseFloat(_ghs('hsp-alis')?.value)   || 0;
  const satis  = parseFloat(_ghs('hsp-satis')?.value)  || 0;
  const kom    = parseFloat(_ghs('hsp-kom')?.value)    || 0;
  const kdv    = parseFloat(_ghs('hsp-kdv')?.value)    || 0;

  if (!miktar || !alis) return;

  const alisTutar  = miktar * alis * (1 + kom/100) * (1 + kdv/100);
  const satisTutar = satis ? miktar * satis : 0;
  const kar        = satisTutar - alisTutar;
  const karPct     = alisTutar ? ((kar / alisTutar) * 100).toFixed(2) : 0;

  const res = _ghs('hsp-result');
  if (res) res.style.display = 'block';

  _sths('hsp-r-alis', alisTutar.toLocaleString('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' ₺');
  _sths('hsp-r-satis', satisTutar
    ? satisTutar.toLocaleString('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' ₺'
    : '—');

  const karEl = _ghs('hsp-r-kar');
  if (karEl) {
    karEl.textContent = (kar >= 0 ? '+' : '') + kar.toLocaleString('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' ₺';
    karEl.style.color = kar >= 0 ? 'var(--gr)' : 'var(--rd)';
  }

  const pctEl = _ghs('hsp-r-pct');
  if (pctEl) {
    pctEl.textContent = (kar >= 0 ? '+' : '') + karPct + '%';
    pctEl.style.color = kar >= 0 ? 'var(--gr)' : 'var(--rd)';
  }
}

function saveHesap() {
  const miktar = parseFloat(_ghs('hsp-miktar')?.value) || 0;
  const alis   = parseFloat(_ghs('hsp-alis')?.value)   || 0;
  if (!miktar || !alis) { window.toast?.('Miktar ve alış kuru zorunludur', 'err'); return; }

  const satis     = parseFloat(_ghs('hsp-satis')?.value)  || 0;
  const kom       = parseFloat(_ghs('hsp-kom')?.value)    || 0;
  const kdv       = parseFloat(_ghs('hsp-kdv')?.value)    || 0;
  const alisTutar = miktar * alis * (1 + kom/100) * (1 + kdv/100);
  const satisTutar = satis ? miktar * satis : 0;
  const kar        = satisTutar - alisTutar;
  const cu         = _CUhs();

  const record = {
    id: generateNumericId(),
    tip:  _ghs('hsp-tip')?.value  || 'doviz',
    cins: _ghs('hsp-cins')?.value || 'USD',
    miktar, yer: _ghs('hsp-yer')?.value || '—',
    alis, satis: satis || null, kom, kdv,
    alisTutar, satisTutar: satisTutar || null,
    kar: satisTutar ? kar : null,
    ts: _nowTsHs(), uid: cu?.id, uname: cu?.name,
  };

  const d = (typeof loadHesapHistory === 'function') ? loadHesapHistory() : [];
  d.unshift(record);
  if (typeof storeHesapHistory === 'function') storeHesapHistory(d);
  renderHesapHistory();
  window.logActivity?.('view', `Hesap kaydedildi: ${miktar} ${_ghs('hsp-cins')?.value} @ ${alis}`);
  window.toast?.('Kayıt eklendi ✓', 'ok');
}

function clearHesap() {
  ['hsp-miktar','hsp-alis','hsp-satis','hsp-kom','hsp-kdv','hsp-yer'].forEach(id => {
    const el = _ghs(id);
    if (el) el.value = id === 'hsp-miktar' ? '100' : (id === 'hsp-kdv' || id === 'hsp-kom') ? '0' : '';
  });
  const res = _ghs('hsp-result');
  if (res) res.style.display = 'none';
}

function clearHesapHistory() {
  window.confirmModal('Hesap geçmişi temizlensin mi?', {
    title: 'Geçmişi Temizle',
    danger: true,
    confirmText: 'Evet, Temizle',
    onConfirm: () => {
      if (typeof storeHesapHistory === 'function') storeHesapHistory([]);
      renderHesapHistory();
      window.toast?.('Temizlendi', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — YER KARŞILAŞTIRMA
// ════════════════════════════════════════════════════════════════

function addCompareRow() {
  const id   = generateNumericId();
  HSP_COMPARE.push({ id, yer:'', alis:0, satis:0 });
  const cont = _ghs('hsp-compare-list');
  if (!cont) return;

  const div = document.createElement('div');
  div.id    = 'cmp-' + id;
  div.style.cssText = 'background:var(--s2);border-radius:var(--rs);padding:10px';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <input class="fi" placeholder="Yer…" style="flex:2;padding:5px 8px;font-size:12px"
             oninput="updateCompareHsp(${id},'yer',this.value)">
      <input type="number" class="fi" placeholder="Alış" style="flex:1;padding:5px 8px;font-size:12px"
             oninput="updateCompareHsp(${id},'alis',parseFloat(this.value)||0)">
      <input type="number" class="fi" placeholder="Satış" style="flex:1;padding:5px 8px;font-size:12px"
             oninput="updateCompareHsp(${id},'satis',parseFloat(this.value)||0)">
      <button onclick="removeCompareRow(${id})"
              style="background:var(--rdb);border:none;border-radius:4px;padding:4px 8px;cursor:pointer;color:var(--rdt);font-size:11px;flex-shrink:0">✕</button>
    </div>`;
  cont.appendChild(div);
}

function updateCompareHsp(id, field, val) {
  const item = HSP_COMPARE.find(x => x.id === id);
  if (item) item[field] = val;
}

function removeCompareRow(id) {
  HSP_COMPARE = HSP_COMPARE.filter(x => x.id !== id);
  const el = _ghs('cmp-' + id);
  if (el) el.remove();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — GEÇMİŞ RENDER
// ════════════════════════════════════════════════════════════════

function renderHesapHistory() {
  _injectHesapPanel();
  const d    = (typeof loadHesapHistory === 'function') ? loadHesapHistory() : [];
  const cont = _ghs('hesap-history');
  if (!cont) return;

  if (!d.length) {
    cont.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t2)">
      <div style="font-size:32px;margin-bottom:8px">🧮</div>
      Henüz kayıt yok. Hesaplama yapın ve "Kaydet" butonuna tıklayın.
    </div>`;
    return;
  }

  const frag  = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Tür</th><th>Cins</th><th>Miktar</th><th>Yer</th>
    <th>Alış</th><th>Satış</th><th>Alış Tutarı</th><th>Kâr/Zarar</th><th>Tarih</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  d.slice(0, 50).forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:11px">${r.tip}</td>
      <td style="font-weight:500">${r.cins}</td>
      <td style="font-family:'DM Mono',monospace">${r.miktar}</td>
      <td style="font-size:12px;color:var(--t2)">${r.yer || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${r.alis}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${r.satis || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;font-weight:500">
        ${r.alisTutar ? r.alisTutar.toLocaleString('tr-TR', { maximumFractionDigits:2 }) + ' ₺' : '—'}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:${r.kar != null ? (r.kar >= 0 ? 'var(--gr)' : 'var(--rd)') : 'var(--t2)'}">
        ${r.kar != null ? (r.kar >= 0 ? '+' : '') + r.kar.toLocaleString('tr-TR', { maximumFractionDigits:2 }) + ' ₺' : '—'}
      </td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--t3)">${r.ts}</td>`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — EXPORT
// ════════════════════════════════════════════════════════════════

function exportHesapXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const d = (typeof loadHesapHistory === 'function') ? loadHesapHistory() : [];
  const rows = d.map(r => ({
    Tür: r.tip, Cins: r.cins, Miktar: r.miktar, Yer: r.yer,
    Alış: r.alis, Satış: r.satis || '—',
    'Alış Tutarı': r.alisTutar?.toFixed(2) || '—',
    'Kâr/Zarar':  r.kar != null ? r.kar.toFixed(2) : '—',
    Tarih: r.ts,
  }));
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hesap');
  XLSX.writeFile(wb, `Hesap_${new Date().toISOString().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}

function printHesapReport() {
  const d  = (typeof loadHesapHistory === 'function') ? loadHesapHistory().slice(0,50) : [];
  const cu = _CUhs();
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { window.toast?.('Popup engellendi', 'err'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Hesap Raporu</title>
  <style>body{font-family:Arial,sans-serif;padding:30px}h2{font-size:18px;margin-bottom:4px}
  p{font-size:12px;color:#6B7280;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #ddd;padding:5px;text-align:left}th{background:#f5f5f5}</style>
  </head><body>
  <h2>🧮 Hesap Makinesi Raporu</h2>
  <p>${_nowTsHs()} · ${cu?.name || '—'}</p>
  <table><thead><tr><th>Tür</th><th>Cins</th><th>Miktar</th><th>Yer</th><th>Alış</th><th>Satış</th><th>Alış Tutarı</th><th>Kâr/Zarar</th><th>Tarih</th></tr></thead>
  <tbody>${d.map(r => `<tr>
    <td>${r.tip}</td><td>${r.cins}</td><td>${r.miktar}</td><td>${r.yer||'—'}</td>
    <td>${r.alis}</td><td>${r.satis||'—'}</td>
    <td>${r.alisTutar?.toFixed(2)||'—'} ₺</td>
    <td style="color:${r.kar>=0?'green':'red'}">${r.kar!=null?((r.kar>=0?'+':'')+r.kar.toFixed(2)+' ₺'):'—'}</td>
    <td>${r.ts}</td>
  </tr>`).join('')}</tbody></table>
  <script>window.print();<\/script></body></html>`);
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDER (app.js renderHesapHistory çağırır)
// ════════════════════════════════════════════════════════════════

function renderHesapPanel() {
  _injectHesapPanel();
  renderHesapHistory();
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Hesap = { render: renderHesapPanel, calc: calcHesap, save: saveHesap, clear: clearHesap, clearHistory: clearHesapHistory, renderHistory: renderHesapHistory, addCompare: addCompareRow, exportXlsx: exportHesapXlsx, printReport: printHesapReport };

if (typeof module !== 'undefined' && module.exports) { module.exports = Hesap; }
else {
  window.Hesap = Hesap;

  // app.js _renderPanel 'hesap' → renderHesapHistory çağırır — wrap et
  const _origRenderHesapHistory = window.renderHesapHistory;
  window.renderHesapHistory = function(...a) {
    _injectHesapPanel();
    if (_origRenderHesapHistory && _origRenderHesapHistory !== renderHesapHistory) {
      return _origRenderHesapHistory(...a);
    }
    return renderHesapHistory(...a);
  };

  window.calcHesap         = calcHesap;
  window.saveHesap         = saveHesap;
  window.clearHesap        = clearHesap;
  window.clearHesapHistory = clearHesapHistory;
  window.addCompareRow     = addCompareRow;
  window.updateCompareHsp  = updateCompareHsp;
  window.removeCompareRow  = removeCompareRow;
  window.exportHesapXlsx   = exportHesapXlsx;
  window.printHesapReport  = printHesapReport;
}

})();
