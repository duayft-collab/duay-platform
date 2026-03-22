/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/ceo.js  —  v8.1.0
 * CEO Paneli — KPI Takibi, Karar Günlüğü, SVG Grafikler
 * V18'den adapte edildi
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadTasks → window.loadTasks (database.js)
// closeMo → window.closeMo (app.js)

const _gceo  = id => document.getElementById(id);
const _stceo = (id,v) => { const el = _gceo(id); if (el) el.textContent = v; };
const _isAdminCeo = () => window.Auth?.getCU?.()?.role === 'admin';
const _isMgrCeo   = () => { const r = window.Auth?.getCU?.()?.role; return r === 'admin' || r === 'manager'; };
const _CUceo      = () => window.Auth?.getCU?.();
const _nowTsCeo   = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`; };

const KPI_CATS = { sales:'💰 Satış', ops:'⚙️ Operasyon', hr:'👥 İK', finance:'📊 Finans', customer:'🤝 Müşteri', other:'📌 Diğer' };

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL INJECT
// ════════════════════════════════════════════════════════════════

function _injectCeoPanel() {
  const p = _gceo('panel-ceo');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">👁️ CEO Paneli</div>
        <div class="phs">KPI takibi, karar günlüğü ve şirket özeti</div>
      </div>
      <div class="ur">
        <button class="btn btns" onclick="exportCeoXlsx()">⬇ Rapor</button>
        <button class="btn btnp" onclick="openKpiModal(null)">+ KPI Ekle</button>
      </div>
    </div>

    <!-- Özet KPI Kartları -->
    <div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px" id="ceo-stats"></div>

    <!-- SVG Grafikler -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
      <div class="card">
        <div class="ch"><span class="ct">📈 KPI Gerçekleşme</span></div>
        <div id="ceo-kpi-chart" style="padding:8px 0"></div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">📊 Görev Dağılımı</span></div>
        <div id="ceo-task-chart" style="padding:8px 16px"></div>
      </div>
    </div>

    <!-- KPI + Karar -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="card">
        <div class="ch">
          <span class="ct">📊 KPI Göstergeleri</span>
          <button class="btn btns" onclick="openKpiModal(null)" style="font-size:11px">+ KPI</button>
        </div>
        <div id="ceo-kpi-list"></div>
      </div>
      <div class="card">
        <div class="ch">
          <span class="ct">📝 Karar Günlüğü</span>
          <button class="btn btns" onclick="openKararModal()" style="font-size:11px">+ Karar</button>
        </div>
        <div id="ceo-karar-list"></div>
      </div>
    </div>

    <!-- Alarmlar + Özet -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px">
      <div class="card">
        <div class="ch"><span class="ct">⚡ Kritik Alarmlar</span></div>
        <div id="ceo-alarms"></div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">📅 Bu Ay Özet</span></div>
        <div id="ceo-summary"></div>
      </div>
    </div>

    <!-- ── MODAL: KPI ── -->
    <div class="mo" id="mo-kpi" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:480px">
        <div class="moh">
          <span class="mot" id="mo-kpi-t">+ KPI Ekle</span>
          <button class="mcl" onclick="closeMo('mo-kpi')">✕</button>
        </div>
        <div class="mob">
          <input type="hidden" id="kpi-eid">
          <div class="fg">
            <label class="fl">KPI Başlığı *</label>
            <input class="fi" id="kpi-title" placeholder="Aylık Satış Hedefi..." maxlength="80">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Kategori</label>
              <select class="fi" id="kpi-cat">
                ${Object.entries(KPI_CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
            <div class="fg">
              <label class="fl">Birim</label>
              <input class="fi" id="kpi-unit" placeholder="₺ / % / adet" maxlength="20">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Mevcut Değer</label>
              <input class="fi" type="number" id="kpi-current" placeholder="0">
            </div>
            <div class="fg">
              <label class="fl">Hedef Değer</label>
              <input class="fi" type="number" id="kpi-target" placeholder="100">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Dönem</label>
              <input class="fi" id="kpi-period" placeholder="Mart 2026" maxlength="30">
            </div>
            <div class="fg">
              <label class="fl">Trend</label>
              <select class="fi" id="kpi-trend">
                <option value="up">📈 Yükseliyor</option>
                <option value="stable">➡️ Stabil</option>
                <option value="down">📉 Düşüyor</option>
              </select>
            </div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-kpi')">İptal</button>
          <button class="btn btnp" onclick="saveKpiCeo()">Kaydet</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Karar ── -->
    <div class="mo" id="mo-karar" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:460px">
        <div class="moh">
          <span class="mot">📝 Karar Ekle</span>
          <button class="mcl" onclick="closeMo('mo-karar')">✕</button>
        </div>
        <div class="mob">
          <div class="fg">
            <label class="fl">Karar Başlığı *</label>
            <input class="fi" id="karar-title" placeholder="Kararın özeti..." maxlength="100">
          </div>
          <div class="fg">
            <label class="fl">Açıklama</label>
            <textarea class="fi" id="karar-desc" rows="3" style="resize:vertical" placeholder="Karar detayları..."></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Departman</label>
              <input class="fi" id="karar-dept" placeholder="IT, Satış..." maxlength="40">
            </div>
            <div class="fg">
              <label class="fl">Öncelik</label>
              <select class="fi" id="karar-pri">
                <option value="high">🔴 Yüksek</option>
                <option value="medium">🟠 Orta</option>
                <option value="low">🔵 Düşük</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">Tarih</label>
              <input class="fi" type="date" id="karar-date">
            </div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-karar')">İptal</button>
          <button class="btn btnp" onclick="saveKarar()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════

function renderCeo() {
  _injectCeoPanel();

  if (!_isMgrCeo()) {
    const p = _gceo('panel-ceo');
    if (p) p.innerHTML = `<div style="padding:60px;text-align:center;color:var(--t2)"><div style="font-size:40px;margin-bottom:12px">🔒</div><div>Bu panel sadece üst yönetim için erişilebilir.</div></div>`;
    return;
  }

  const kpis    = (typeof loadKpi    === 'function') ? loadKpi()    : [];
  const kararlar= (typeof loadKarar  === 'function') ? loadKarar()  : [];

  // Özet KPI Kartları (ilk 4)
  const stats = _gceo('ceo-stats');
  if (stats) {
    if (!kpis.length) {
      stats.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--t2)">Henüz KPI eklenmemiş. Sağ üstten "+ KPI Ekle" ile başlayın.</div>`;
    } else {
      const frag = document.createDocumentFragment();
      kpis.slice(0,4).forEach(k => {
        const pct = Math.min(100, Math.round((k.current / k.target) * 100));
        const onTrack = pct >= 70;
        const card = document.createElement('div');
        card.className = 'sc';
        card.style.cursor = 'pointer';
        card.onclick = () => openKpiModal(k.id);
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:11px;color:var(--t2)">${KPI_CATS[k.cat]||k.cat}</div>
            <div style="font-size:13px">${k.trend==='up'?'📈':k.trend==='down'?'📉':'➡️'}</div>
          </div>
          <div class="scv" style="color:${onTrack?'var(--gr)':'var(--rd)'};font-size:20px">${(k.current||0).toLocaleString('tr-TR')} <span style="font-size:12px;font-weight:400">${k.unit||''}</span></div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">${k.title}</div>
          <div style="height:4px;background:var(--s2);border-radius:99px;margin-top:8px;overflow:hidden">
            <div style="height:100%;background:${onTrack?'var(--gr)':'var(--am)'};width:${pct}%;border-radius:99px;transition:width .5s"></div>
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:3px">Hedef: ${(k.target||0).toLocaleString('tr-TR')} ${k.unit||''} (${pct}%)</div>`;
        frag.appendChild(card);
      });
      stats.replaceChildren(frag);
    }
  }

  // SVG KPI Bar Chart
  const kpiChart = _gceo('ceo-kpi-chart');
  if (kpiChart) {
    if (!kpis.length) {
      kpiChart.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t2);font-size:12px">KPI verisi yok</div>`;
    } else {
      const barH=28, gap=8, padL=120, padR=60, w=400;
      const total = kpis.length * (barH + gap);
      kpiChart.innerHTML = `<svg viewBox="0 0 ${padL+w+padR} ${total+20}" style="width:100%;font-family:'Plus Jakarta Sans',sans-serif">
        ${kpis.map((k,i) => {
          const pct = Math.min(100, Math.round((k.current||0)/(k.target||1)*100));
          const y = i*(barH+gap)+10;
          const barW = Math.round(w*pct/100);
          const color = pct>=80?'#22C55E':pct>=50?'#F59E0B':'#EF4444';
          return `
            <text x="${padL-8}" y="${y+barH/2+4}" text-anchor="end" font-size="11" fill="var(--t2)" font-weight="500">${k.title.slice(0,14)}</text>
            <rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="6" fill="var(--s2)"/>
            <rect x="${padL}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="${color}" opacity=".85"/>
            <text x="${padL+barW+6}" y="${y+barH/2+4}" font-size="11" font-weight="700" fill="${color}">${pct}%</text>`;
        }).join('')}
      </svg>`;
    }
  }

  // SVG Görev Pasta Grafiği
  const taskChart = _gceo('ceo-task-chart');
  if (taskChart) {
    const tasks  = (typeof loadTasks === 'function') ? loadTasks() : [];
    const done   = tasks.filter(t => t.done || t.status === 'done').length;
    const crit   = tasks.filter(t => !t.done && t.status !== 'done' && t.pri === 1).length;
    const normal = tasks.filter(t => !t.done && t.status !== 'done' && t.pri !== 1).length;
    const total2 = done + crit + normal || 1;
    const slices = [
      { label:'Tamamlandı', val:done,   color:'#22C55E' },
      { label:'Kritik',     val:crit,   color:'#EF4444' },
      { label:'Devam',      val:normal, color:'#6366F1' },
    ];
    const cx=80, cy=80, r=65;
    let startAngle = -Math.PI/2;
    const paths = slices.map(s => {
      if (s.val === 0) return '';
      const angle    = (s.val / total2) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
      startAngle = endAngle;
      return `<path d="${path}" fill="${s.color}" opacity=".88"/>`;
    }).join('');
    const legend = slices.map((s,i) => `
      <rect x="175" y="${20+i*22}" width="12" height="12" rx="3" fill="${s.color}"/>
      <text x="192" y="${31+i*22}" font-size="11" fill="var(--t2)">${s.label}: <tspan font-weight="700" fill="var(--t)">${s.val}</tspan></text>
    `).join('');
    taskChart.innerHTML = `<svg viewBox="0 0 300 165" style="width:100%;font-family:'Plus Jakarta Sans',sans-serif">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="32" fill="var(--sf)"/>
      <text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="20" font-weight="800" fill="var(--t)">${total2}</text>
      <text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="9" fill="var(--t3)" font-weight="600">GÖREV</text>
      ${legend}
    </svg>`;
  }

  // KPI Listesi
  const kl = _gceo('ceo-kpi-list');
  if (kl) {
    kl.innerHTML = !kpis.length
      ? `<div style="padding:22px;text-align:center;color:var(--t2)">KPI yok — "+ KPI Ekle" ile başlayın.</div>`
      : kpis.map(k => {
          const pct = Math.min(100, Math.round((k.current||0) / (k.target||1) * 100));
          return `<div style="padding:12px 16px;border-bottom:1px solid var(--b)">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <div style="font-size:13px;font-weight:500">${k.title} <span style="font-size:11px;color:var(--t2)">${k.period||''}</span></div>
              <div style="display:flex;gap:4px">
                <button class="btn btns" onclick="openKpiModal(${k.id})" style="font-size:11px">✏️</button>
                <button class="btn btns btnd" onclick="delKpiCeo(${k.id})" style="font-size:11px">🗑</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="flex:1;height:6px;background:var(--s2);border-radius:99px;overflow:hidden">
                <div style="height:100%;background:${pct>=70?'var(--gr)':'var(--am)'};width:${pct}%;border-radius:99px;transition:width .5s"></div>
              </div>
              <div style="font-size:12px;font-weight:600;min-width:80px;text-align:right">${(k.current||0).toLocaleString('tr-TR')} / ${(k.target||0).toLocaleString('tr-TR')} ${k.unit||''}</div>
            </div>
          </div>`;
        }).join('');
  }

  // Karar Günlüğü
  const kkl = _gceo('ceo-karar-list');
  const priColor = { high:'var(--rd)', medium:'var(--am)', low:'var(--bl)' };
  const priLabel = { high:'🔴 Yüksek', medium:'🟠 Orta', low:'🔵 Düşük' };
  if (kkl) {
    kkl.innerHTML = !kararlar.length
      ? `<div style="padding:22px;text-align:center;color:var(--t2)">Karar yok — "+ Karar" ile ekleyin.</div>`
      : kararlar.slice(0,5).map(k => `
          <div style="padding:12px 16px;border-bottom:1px solid var(--b)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${k.title}</div>
                <div style="font-size:11px;color:var(--t2);margin-top:2px">${k.dept?k.dept+' · ':''}${k.date||''}</div>
                <div style="font-size:12px;color:var(--t2);margin-top:4px">${k.desc||''}</div>
              </div>
              <span style="font-size:10px;font-weight:600;color:${priColor[k.pri]||'var(--t2)'};flex-shrink:0">${priLabel[k.pri]||k.pri}</span>
            </div>
          </div>`).join('');
  }

  // Kritik Alarmlar
  const alarms = _gceo('ceo-alarms');
  if (alarms) {
    const todayS    = new Date().toISOString().slice(0,10);
    const alarmsArr = [];
    if (typeof loadHdf   === 'function') loadHdf().filter(h=>h.to<todayS&&h.status!=='done').forEach(h=>alarmsArr.push({msg:`Hedef gecikmiş: ${h.title}`, color:'var(--rd)'}));
    if (typeof loadOdm   === 'function') loadOdm().filter(o=>!o.paid&&o.due&&o.due<todayS).forEach(o=>alarmsArr.push({msg:`Geciken ödeme: ${o.name}`, color:'var(--rd)'}));
    if (typeof loadKargo === 'function') loadKargo().filter(k=>k.status==='bekle').forEach(k=>alarmsArr.push({msg:`Bekleyen kargo: ${k.from}→${k.to}`, color:'var(--am)'}));
    alarms.innerHTML = !alarmsArr.length
      ? `<div style="padding:22px;text-align:center;color:var(--gr);font-size:14px">✅ Kritik alarm yok.</div>`
      : alarmsArr.map(a => `<div style="padding:10px 16px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:10px"><div style="width:6px;height:6px;border-radius:50%;background:${a.color};flex-shrink:0"></div><div style="font-size:13px">${a.msg}</div></div>`).join('');
  }

  // Ay Özeti
  const summary = _gceo('ceo-summary');
  if (summary) {
    const tasks  = (typeof loadTasks    === 'function') ? loadTasks()    : [];
    const ik     = (typeof loadIk       === 'function') ? loadIk()       : [];
    const crmD   = (typeof loadCrmData  === 'function') ? loadCrmData()  : [];
    const odmD   = (typeof loadOdm      === 'function') ? loadOdm()      : [];
    const doneT  = tasks.filter(t => t.done || t.status==='done').length;
    const critT  = tasks.filter(t => t.pri===1 && !t.done && t.status!=='done').length;
    summary.innerHTML = `<div style="padding:12px 16px;display:flex;flex-direction:column;gap:10px">
      <div class="dr"><span>Görevler</span><span>${doneT} tamamlandı / <span style="color:var(--rd)">${critT} kritik</span></span></div>
      <div class="dr"><span>Aktif Personel</span><span>${ik.filter(x=>x.status==='active').length} kişi</span></div>
      <div class="dr"><span>Aktif Müşteriler</span><span>${crmD.filter(c=>c.status==='aktif').length}</span></div>
      <div class="dr"><span>Bekleyen Ödemeler</span><span style="color:var(--am)">${odmD.filter(o=>!o.paid).length} adet</span></div>
      <div class="dr"><span>Toplam KPI</span><span>${kpis.length} gösterge</span></div>
    </div>`;
  }
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — KPI & KARAR CRUD
// ════════════════════════════════════════════════════════════════

function openKpiModalCeoInternal(id) {
  _injectCeoPanel();
  if (id) {
    const k = (typeof loadKpi==='function'?loadKpi():[]).find(x => x.id === id); if (!k) return;
    if (_gceo('kpi-title'))   _gceo('kpi-title').value   = k.title   || '';
    if (_gceo('kpi-cat'))     _gceo('kpi-cat').value     = k.cat     || 'sales';
    if (_gceo('kpi-current')) _gceo('kpi-current').value = k.current || 0;
    if (_gceo('kpi-target'))  _gceo('kpi-target').value  = k.target  || 100;
    if (_gceo('kpi-unit'))    _gceo('kpi-unit').value    = k.unit    || '';
    if (_gceo('kpi-period'))  _gceo('kpi-period').value  = k.period  || '';
    if (_gceo('kpi-trend'))   _gceo('kpi-trend').value   = k.trend   || 'stable';
    if (_gceo('kpi-eid'))     _gceo('kpi-eid').value     = id;
    _stceo('mo-kpi-t', '✏️ KPI Düzenle');
  } else {
    ['kpi-title','kpi-unit','kpi-period'].forEach(i => { const el=_gceo(i); if(el) el.value=''; });
    if (_gceo('kpi-current')) _gceo('kpi-current').value = '0';
    if (_gceo('kpi-target'))  _gceo('kpi-target').value  = '100';
    if (_gceo('kpi-cat'))     _gceo('kpi-cat').value     = 'sales';
    if (_gceo('kpi-trend'))   _gceo('kpi-trend').value   = 'stable';
    if (_gceo('kpi-eid'))     _gceo('kpi-eid').value     = '';
    if (_gceo('kpi-period'))  { const n=new Date(); _gceo('kpi-period').value = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][n.getMonth()] + ' ' + n.getFullYear(); }
    _stceo('mo-kpi-t', '+ KPI Ekle');
  }
  window.openMo?.('mo-kpi');
}

function saveKpiCeo() {
  const title = (_gceo('kpi-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const d   = (typeof loadKpi  === 'function') ? loadKpi()  : [];
  const eid = parseInt(_gceo('kpi-eid')?.value || '0');
  const entry = {
    title, cat: _gceo('kpi-cat')?.value || 'sales',
    current: parseFloat(_gceo('kpi-current')?.value) || 0,
    target:  parseFloat(_gceo('kpi-target')?.value)  || 100,
    unit:    _gceo('kpi-unit')?.value    || '',
    period:  _gceo('kpi-period')?.value  || '',
    trend:   _gceo('kpi-trend')?.value   || 'stable',
  };
  if (eid) { const k = d.find(x => x.id === eid); if (k) Object.assign(k, entry); }
  else d.push({ id: Date.now(), ...entry });
  if (typeof storeKpi === 'function') storeKpi(d);
  window.closeMo?.('mo-kpi');
  renderCeo();
  window.logActivity?.('view', `"${title}" KPI güncellendi`);
  window.toast?.(title + ' kaydedildi ✓', 'ok');
}

function delKpiCeo(id) {
  if (!_isAdminCeo()) return;
  if (!confirm('Bu KPI kaydını silmek istediğinizden emin misiniz?')) return;
  if (typeof storeKpi === 'function') storeKpi((typeof loadKpi==='function'?loadKpi():[]).filter(x => x.id !== id));
  renderCeo();
  window.toast?.('KPI silindi', 'ok');
}

function openKararModal() {
  _injectCeoPanel();
  if (_gceo('karar-title'))  _gceo('karar-title').value  = '';
  if (_gceo('karar-desc'))   _gceo('karar-desc').value   = '';
  if (_gceo('karar-dept'))   _gceo('karar-dept').value   = '';
  if (_gceo('karar-pri'))    _gceo('karar-pri').value    = 'high';
  if (_gceo('karar-date'))   _gceo('karar-date').valueAsDate = new Date();
  window.openMo?.('mo-karar');
}

function saveKarar() {
  const title = (_gceo('karar-title')?.value || '').trim();
  if (!title) { window.toast?.('Başlık zorunludur', 'err'); return; }
  const d = (typeof loadKarar === 'function') ? loadKarar() : [];
  d.unshift({
    id: Date.now(), title,
    desc: _gceo('karar-desc')?.value || '',
    date: _gceo('karar-date')?.value || '',
    pri:  _gceo('karar-pri')?.value  || 'high',
    dept: _gceo('karar-dept')?.value || '',
    ts:   _nowTsCeo(),
  });
  if (typeof storeKarar === 'function') storeKarar(d);
  window.closeMo?.('mo-karar');
  renderCeo();
  window.logActivity?.('view', `"${title}" kararı kaydedildi`);
  window.toast?.('Karar kaydedildi ✓', 'ok');
}

function exportCeoXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX yüklenmedi', 'err'); return; }
  const kpis = (typeof loadKpi === 'function') ? loadKpi() : [];
  const rows = kpis.map(k => ({ KPI: k.title, 'Mevcut': k.current, 'Hedef': k.target, 'Birim': k.unit, '%': Math.round((k.current||0)/(k.target||1)*100), 'Dönem': k.period }));
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KPI');
  XLSX.writeFile(wb, `CEO_Rapor_${new Date().toISOString().slice(0,10)}.xlsx`);
  window.toast?.('Excel ✓', 'ok');
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Ceo = { render: renderCeo, openKpiModal, saveKpi: saveKpiCeo, delKpi: delKpiCeo, openKararModal, saveKarar, exportXlsx: exportCeoXlsx, KPI_CATS };

if (typeof module !== 'undefined' && module.exports) { module.exports = Ceo; }
else {
  window.Ceo            = Ceo;
  window.renderCeo      = renderCeo;
  window.openKpiModal   = window.openKpiModal || openKpiModal;   // panel_stubs.js ile çakışmasın
  window.openKpiModalCeo= openKpiModal;
  window.saveKpiCeo     = saveKpiCeo;
  window.delKpiCeo      = delKpiCeo;
  window.openKararModal = openKararModal;
  window.saveKarar      = saveKarar;
  window.exportCeoXlsx  = exportCeoXlsx;
  window.KPI_CATS       = KPI_CATS;
}
