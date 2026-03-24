/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v9.0.0
 * Rutin Ödemeler — Kullanıcı Atama, Alarm, Dekont, Excel Import/Export
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

const _go    = id  => document.getElementById(id);
const _sto   = (id,v) => { const el = _go(id); if (el) el.textContent = v; };
const _p2o   = n   => String(n).padStart(2,'0');
const _nowTso = () => { const n=new Date(); return `${n.getFullYear()}-${_p2o(n.getMonth()+1)}-${_p2o(n.getDate())} ${_p2o(n.getHours())}:${_p2o(n.getMinutes())}:${_p2o(n.getSeconds())}`; };
const _isAdminO = () => window.Auth?.getCU?.()?.role === 'admin' || window.Auth?.getCU?.()?.role === 'manager';
const _CUo      = () => window.Auth?.getCU?.();
const _todayStr = () => new Date().toISOString().slice(0,10);

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — SABİTLER
// ════════════════════════════════════════════════════════════════

const ODM_CATS = {
  kira:      { l:'Kira',           ic:'🏢', c:'ba' },
  fatura:    { l:'Fatura',         ic:'💡', c:'bb' },
  abonelik:  { l:'Abonelik',       ic:'🔄', c:'bp' },
  kredi_k:   { l:'Kredi Kartı',    ic:'💳', c:'bp' },
  vergi:     { l:'Vergi/SGK',      ic:'📋', c:'br' },
  sigorta:   { l:'Sigorta',        ic:'🛡️', c:'ba' },
  kredi:     { l:'Kredi',          ic:'🏦', c:'bb' },
  maas:      { l:'Maaş/Personel',  ic:'👥', c:'bg' },
  diger:     { l:'Diğer',          ic:'📌', c:'bg' },
};

// Abonelik alt tipleri
const ODM_ABONE_TYPES = {
  su:        { l:'Su',        ic:'💧' },
  elektrik:  { l:'Elektrik',  ic:'⚡' },
  dogalgaz:  { l:'Doğalgaz',  ic:'🔥' },
  telefon:   { l:'Telefon',   ic:'📱' },
  internet:  { l:'İnternet',  ic:'🌐' },
  yazilim:   { l:'Yazılım',   ic:'💻' },
  diger:     { l:'Diğer',     ic:'🔄' },
};
const ODM_FREQ = {
  haftalik: 'Haftalık',
  aylik:    'Aylık',
  uc_aylik: '3 Aylık',
  yillik:   'Yıllık',
  teksefer: 'Tek Sefer',
};
const ODM_STATUS = {
  bekliyor: { l:'Bekliyor',  ic:'📅', cls:'bb' },
  odendi:   { l:'Ödendi',    ic:'✅', cls:'bg' },
  gecikti:  { l:'Gecikti',   ic:'🚨', cls:'br' },
  yaklasan: { l:'Yaklaşıyor',ic:'⚠️', cls:'ba' },
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — ALARM SİSTEMİ
// ════════════════════════════════════════════════════════════════

function checkOdmAlarms() {
  const items  = window.loadOdm ? loadOdm() : [];
  const today  = _todayStr();
  const todayD = new Date(today);
  let alarmed  = 0;

  items.forEach(o => {
    if (!o.due || o.paid) return;
    const dueD  = new Date(o.due);
    const diff  = Math.ceil((dueD - todayD) / 86400000);
    const warn  = o.alarmDays || 3; // varsayılan 3 gün önce uyar

    // Gecikmiş
    if (diff < 0) {
      const key = 'odm_alarm_late_' + o.id;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('🚨', `Gecikmiş ödeme: "${o.name}" — ${Math.abs(diff)} gün gecikmiş`, 'err', 'odemeler');
        localStorage.setItem(key, today);
      }
    }
    // Yaklaşıyor
    else if (diff <= warn) {
      const key = 'odm_alarm_soon_' + o.id + '_' + today;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('⚠️', `"${o.name}" için ödeme günü yaklaşıyor — ${diff} gün kaldı`, 'warn', 'odemeler');
        localStorage.setItem(key, '1');
        alarmed++;
      }
    }

    // Dekont eksik — ödendi ama dekont yüklenmemiş
    if (o.paid && !o.receipt) {
      const key = 'odm_alarm_receipt_' + o.id;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('📎', `"${o.name}" ödemesi için dekont bekleniyor`, 'warn', 'odemeler');
        localStorage.setItem(key, '1');
      }
    }
  });

  return alarmed;
}

// Periyodik alarm kontrolü — her 30 dakika
function startOdmAlarmTimer() {
  checkOdmAlarms();
  setInterval(checkOdmAlarms, 30 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — PANEL HTML
// ════════════════════════════════════════════════════════════════

function _injectOdmPanel() {
  const panel = _go('panel-odemeler');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = [

    // ── YENİ TOPBAR ──
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">',
      '<div style="display:flex;align-items:center;gap:10px">',
        '<div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--t)">',
          '<svg width="18" height="18" fill="none" viewBox="0 0 18 18"><rect x="1" y="3" width="16" height="12" rx="2.5" stroke="var(--ac)" stroke-width="1.5"/><path d="M1 7h16" stroke="var(--ac)" stroke-width="1.5"/><circle cx="5" cy="11" r="1.2" fill="var(--ac)"/></svg>',
          'Rutin Ödemeler',
        '</div>',
        // Sekme filtreleri
        '<div style="display:flex;background:var(--s2);border-radius:8px;padding:2px;gap:1px;margin-left:16px">',
          '<button id="odm-tab-all" onclick="setOdmTab(\'all\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;background:var(--ac);color:#fff;font-family:inherit;font-weight:500">Tümü</button>',
          '<button id="odm-tab-abonelik" onclick="setOdmTab(\'abonelik\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;background:none;color:var(--t2);font-family:inherit">Abonelikler</button>',
          '<button id="odm-tab-kredi_k" onclick="setOdmTab(\'kredi_k\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;background:none;color:var(--t2);font-family:inherit">Kredi Kartları</button>',
          '<button id="odm-tab-bekliyor" onclick="setOdmTab(\'bekliyor\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;background:none;color:var(--t2);font-family:inherit">Bekleyen</button>',
          '<button id="odm-tab-gecikti" onclick="setOdmTab(\'gecikti\')" style="font-size:11px;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;background:none;color:#EF4444;font-family:inherit">Gecikmiş</button>',
        '</div>',
      '</div>',
      '<div style="display:flex;gap:8px;align-items:center">',
        '<button class="btn btns" onclick="exportOdmXlsx()" style="border-radius:8px;font-size:11px">Excel İndir</button>',
        '<button class="btn btns" onclick="_go(\'odm-import-file\').click()" style="border-radius:8px;font-size:11px">Excel Yükle</button>',
        '<input type="file" id="odm-import-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="processOdmImport(this)">',
        '<button class="btn btnp" onclick="openOdmModal(null)" style="border-radius:8px;font-size:12px;font-weight:600;gap:6px">',
          '<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
          '+ Ödeme Ekle',
        '</button>',
      '</div>',
    '</div>',

    // İstatistik kartları
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">',
      '<div style="background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:14px 16px">',
        '<div style="font-size:22px;font-weight:700;color:var(--t)" id="odm-stat-total">0</div>',
        '<div style="font-size:11px;color:var(--t3);margin-top:2px">Toplam Kayıt</div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--rd);border-radius:12px;padding:14px 16px">',
        '<div style="font-size:22px;font-weight:700;color:var(--rdt)" id="odm-stat-late">0</div>',
        '<div style="font-size:11px;color:var(--t3);margin-top:2px">🚨 Gecikmiş</div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--am);border-radius:12px;padding:14px 16px">',
        '<div style="font-size:22px;font-weight:700;color:var(--amt)" id="odm-stat-soon">0</div>',
        '<div style="font-size:11px;color:var(--t3);margin-top:2px">⚠️ Bu Hafta</div>',
      '</div>',
      '<div style="background:var(--sf);border:1px solid var(--gr);border-radius:12px;padding:14px 16px">',
        '<div style="font-size:22px;font-weight:700;color:var(--grt)" id="odm-stat-paid">0</div>',
        '<div style="font-size:11px;color:var(--t3);margin-top:2px">✅ Bu Ay Ödendi</div>',
      '</div>',
    '</div>',

    // Filtreler
    '<div style="background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:12px 16px;margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">',
      '<div style="position:relative;flex:1;min-width:180px">',
        '<svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%)" width="12" height="12" fill="none" viewBox="0 0 13 13"><circle cx="6" cy="6" r="4.5" stroke="var(--t3)" stroke-width="1.3"/><path d="M10 10l2 2" stroke="var(--t3)" stroke-width="1.3" stroke-linecap="round"/></svg>',
        '<input class="fi" type="search" id="odm-search" placeholder="Ödeme ara…" oninput="renderOdemeler()" style="padding-left:28px;border-radius:8px">',
      '</div>',
      '<select class="fi" id="odm-cat-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:130px">',
        '<option value="">Tüm Kategoriler</option>',
        Object.entries(ODM_CATS).map(([k,v]) => `<option value="${k}">${v.ic} ${v.l}</option>`).join(''),
      '</select>',
      '<select class="fi" id="odm-freq-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:120px">',
        '<option value="">Tüm Sıklıklar</option>',
        Object.entries(ODM_FREQ).map(([k,v]) => `<option value="${k}">${v}</option>`).join(''),
      '</select>',
      '<select class="fi" id="odm-status-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:120px">',
        '<option value="">Tüm Durumlar</option>',
        '<option value="bekliyor">📅 Bekliyor</option>',
        '<option value="gecikti">🚨 Gecikmiş</option>',
        '<option value="odendi">✅ Ödendi</option>',
        '<option value="no-receipt">📎 Dekont Eksik</option>',
      '</select>',
      '<select class="fi" id="odm-user-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:140px">',
        '<option value="">Tüm Sorumlular</option>',
      '</select>',
    '</div>',

    // Liste
    '<div id="odm-list"></div>',

  ].join('');

  // Kullanıcı filtresi doldur
  _fillOdmUserFilter();
}

function _fillOdmUserFilter() {
  const sel = _go('odm-user-f'); if (!sel) return;
  const users = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const cur   = sel.value;
  sel.innerHTML = '<option value="">Tüm Sorumlular</option>'
    + users.map(u => `<option value="${u.id}"${cur==u.id?' selected':''}>${u.name}</option>`).join('');
}


// ════════════════════════════════════════════════════════════════
// SEKME YÖNETİMİ  [v2.0]
// ════════════════════════════════════════════════════════════════
let _odmCurrentTab = 'all';

function setOdmTab(tab) {
  _odmCurrentTab = tab;
  // Buton stillerini güncelle
  ['all','abonelik','kredi_k','bekliyor','gecikti'].forEach(t => {
    const btn = _go('odm-tab-' + t);
    if (!btn) return;
    if (t === tab) {
      btn.style.background = t === 'gecikti' ? '#EF4444' : 'var(--ac)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'none';
      btn.style.color = t === 'gecikti' ? '#EF4444' : 'var(--t2)';
    }
  });
  renderOdemeler();
}

// ════════════════════════════════════════════════════════════════
// KREDİ KARTI ÖZEL KART  [v2.0]
// ════════════════════════════════════════════════════════════════
function _renderKrediKarti(o, users) {
  const today   = _todayStr();
  const todayD  = new Date(today);
  const kd      = o.kesiimTarihi || '';  // hesap kesim günü
  const od      = o.odemeGunu    || '';  // ödeme günü
  const limit   = parseFloat(o.limit  || 0);
  const bakiye  = parseFloat(o.bakiye || 0);
  const kul     = limit > 0 ? Math.round(bakiye / limit * 100) : 0;
  const kulColor = kul >= 80 ? '#EF4444' : kul >= 50 ? '#F97316' : '#10B981';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:0;margin-bottom:10px;overflow:hidden;transition:box-shadow .15s';
  card.onmouseenter = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)';
  card.onmouseleave = () => card.style.boxShadow = '';

  card.innerHTML = `
    <div style="background:linear-gradient(135deg,#1e1b4b,#3730a3);padding:16px 20px;color:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${o.name}</div>
          <div style="font-size:11px;opacity:.7">${o.banka||'Banka'} • ${o.sonDortHane?'**** '+o.sonDortHane:''}</div>
        </div>
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none"><rect width="32" height="24" rx="4" fill="rgba(255,255,255,.15)"/><circle cx="12" cy="12" r="8" fill="#EB001B" opacity=".8"/><circle cx="20" cy="12" r="8" fill="#F79E1B" opacity=".8"/></svg>
      </div>
      <div style="display:flex;gap:24px">
        <div>
          <div style="font-size:10px;opacity:.6">Limit</div>
          <div style="font-size:15px;font-weight:600">₺${limit.toLocaleString('tr-TR')}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:.6">Kullanılan</div>
          <div style="font-size:15px;font-weight:600">₺${bakiye.toLocaleString('tr-TR')}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:.6">Kullanım</div>
          <div style="font-size:15px;font-weight:600;color:${kulColor === '#EF4444'?'#fca5a5':kulColor==='#F97316'?'#fed7aa':'#86efac'}">${kul}%</div>
        </div>
      </div>
    </div>
    <div style="padding:12px 20px">
      <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${kul}%;background:${kulColor};border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">
        <div><div style="font-size:10px;color:var(--t3)">Hesap Kesim</div><div style="font-size:12px;font-weight:600;color:var(--t)">${kd ? 'Her ayın '+kd+'. günü' : '—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Son Ödeme</div><div style="font-size:12px;font-weight:600;color:${o.due&&o.due<today?'#EF4444':'var(--t)'};">${o.due||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Minimum Ödeme</div><div style="font-size:12px;font-weight:600;color:var(--t)">₺${(parseFloat(o.minOdeme||0)).toLocaleString('tr-TR')}</div></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:8px;padding:5px 12px">✓ Ödendi</button>` : `<button onclick="toggleOdmPaid(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px">↩ Geri Al</button>`}
        ${o.paid && !o.receipt ? `<button onclick="uploadOdmReceipt(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px;color:#D97706">📎 Dekont</button>` : ''}
        <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:5px 10px;border-radius:8px">✏️ Düzenle</button>
      </div>
    </div>`;

  return card;
}

// ════════════════════════════════════════════════════════════════
// ABONELİK ÖZEL KART  [v2.0]
// ════════════════════════════════════════════════════════════════
function _renderAbonelikKart(o, users, today, todayD) {
  const status  = o.paid ? 'odendi' : (o.due && o.due < today ? 'gecikti' : (o.due && Math.ceil((new Date(o.due)-todayD)/86400000) <= 7 ? 'yaklasan' : 'bekliyor'));
  const sta     = ODM_STATUS[status];
  const dueD    = o.due ? new Date(o.due) : null;
  const diff    = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
  const abone   = ODM_ABONE_TYPES[o.abonelikTipi] || ODM_ABONE_TYPES.diger;

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s';
  if (status === 'gecikti') card.style.borderColor = 'var(--rd)';
  if (status === 'yaklasan') card.style.borderColor = 'var(--am)';
  card.onmouseenter = () => card.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)';
  card.onmouseleave = () => card.style.boxShadow = '';

  card.innerHTML = `
    <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${abone.ic}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:600;color:var(--t)">${o.name}</span>
        <span style="font-size:10px;padding:1px 7px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5">${abone.l}</span>
        <span class="badge ${sta.cls}" style="font-size:10px">${sta.ic} ${sta.l}</span>
        ${o.sozlesme ? '<span style="font-size:10px;color:var(--ac);cursor:pointer" onclick="viewOdmReceipt('+o.id+')">📄 Sözleşme</span>' : ''}
      </div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:700;color:var(--t)">₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}<span style="font-size:10px;font-weight:400;color:var(--t3)">/${ODM_FREQ[o.freq]||'ay'}</span></span>
        <span style="font-size:11px;color:${status==='gecikti'?'var(--rdt)':status==='yaklasan'?'var(--amt)':'var(--t3)'}">📅 ${o.due||'—'} ${diff!==null?'('+( diff<0?Math.abs(diff)+' gün gecikti':diff===0?'Bugün!':diff+' gün kaldı')+')'  :''}</span>
        ${o.sozlesmeBitis ? '<span style="font-size:10px;color:var(--t3)">Sözleşme bitiş: '+o.sozlesmeBitis+'</span>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:5px;flex-shrink:0">
      ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:7px;padding:4px 10px">✓ Ödendi</button>` : ''}
      <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:4px 8px;border-radius:7px">✏️</button>
    </div>`;

  return card;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — RENDER
// ════════════════════════════════════════════════════════════════

function renderOdemeler() {
  _injectOdmPanel();
  const today   = _todayStr();
  const todayD  = new Date(today);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0,10);
  const thisMonth  = today.slice(0,7);

  const all = window.loadOdm ? loadOdm() : [];

  // Filtreler
  const q      = (_go('odm-search')?.value || '').toLowerCase();
  const catF   = _go('odm-cat-f')?.value   || '';
  const freqF  = _go('odm-freq-f')?.value  || '';
  const statF  = _go('odm-status-f')?.value || '';
  const userF  = _go('odm-user-f')?.value  || '';

  function _getStatus(o) {
    if (o.paid) return 'odendi';
    if (o.due && o.due < today) return 'gecikti';
    if (o.due && o.due <= weekEndStr) return 'yaklasan';
    return 'bekliyor';
  }

  // Tab filtresi
  const today2 = _todayStr();
  let items = all.filter(o => {
    // Tab filtresi
    if (_odmCurrentTab === 'abonelik' && o.cat !== 'abonelik') return false;
    if (_odmCurrentTab === 'kredi_k'  && o.cat !== 'kredi_k')  return false;
    if (_odmCurrentTab === 'bekliyor' && (_getStatus(o) !== 'bekliyor' && _getStatus(o) !== 'yaklasan')) return false;
    if (_odmCurrentTab === 'gecikti'  && _getStatus(o) !== 'gecikti')  return false;

    if (q && !o.name.toLowerCase().includes(q) && !(o.note||'').toLowerCase().includes(q)) return false;
    if (catF  && o.cat  !== catF)  return false;
    if (freqF && o.freq !== freqF) return false;
    if (userF && String(o.assignedTo) !== userF) return false;
    if (statF) {
      if (statF === 'no-receipt' && !(o.paid && !o.receipt)) return false;
      else if (statF !== 'no-receipt' && _getStatus(o) !== statF) return false;
    }
    return true;
  });

  // Stats
  _sto('odm-stat-total', all.length);
  _sto('odm-stat-late',  all.filter(o => !o.paid && o.due && o.due < today).length);
  _sto('odm-stat-soon',  all.filter(o => !o.paid && o.due && o.due >= today && o.due <= weekEndStr).length);
  _sto('odm-stat-paid',  all.filter(o => o.paid && (o.paidTs||'').startsWith(thisMonth)).length);

  const cont = _go('odm-list'); if (!cont) return;

  if (!items.length) {
    cont.innerHTML = '<div style="text-align:center;padding:56px;color:var(--t2)">'
      + '<div style="font-size:40px;margin-bottom:12px">💳</div>'
      + '<div style="font-size:15px;font-weight:500">Kayıt bulunamadı</div>'
      + '<div style="margin-top:12px"><button class="btn btnp" onclick="openOdmModal()">+ İlk Ödemeyi Ekle</button></div>'
      + '</div>';
    return;
  }

  const users = window.loadUsers ? loadUsers() : [];
  items = items.sort((a,b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1; if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  const frag = document.createDocumentFragment();

  items.forEach(o => {
    // Kredi kartı özel render
    if (o.cat === 'kredi_k') {
      frag.appendChild(_renderKrediKarti(o, users));
      return;
    }
    // Abonelik özel render
    if (o.cat === 'abonelik') {
      frag.appendChild(_renderAbonelikKart(o, users, today, todayD));
      return;
    }

    const cat    = ODM_CATS[o.cat]  || ODM_CATS.diger;
    const freq   = ODM_FREQ[o.freq] || '—';
    const status = _getStatus(o);
    const sta    = ODM_STATUS[status];
    const assigned = users.find(u => u.id === o.assignedTo);
    const avc  = typeof AVC !== 'undefined' ? AVC : [['#EEEDFE','#26215C']];
    const aidx = users.indexOf(assigned);
    const aColor = assigned ? avc[Math.max(aidx,0) % avc.length] : null;
    const aIni  = assigned ? (assigned.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : null;

    const dueD   = o.due ? new Date(o.due) : null;
    const diff   = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
    const diffTxt = diff === null ? '—'
      : diff < 0  ? `${Math.abs(diff)} gün gecikti`
      : diff === 0 ? 'Bugün!'
      : diff === 1 ? 'Yarın'
      : `${diff} gün kaldı`;

    const noReceipt = o.paid && !o.receipt;

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:16px 18px;margin-bottom:10px;transition:box-shadow .15s';
    if (status === 'gecikti') card.style.borderColor = 'var(--rd)';
    if (status === 'yaklasan') card.style.borderColor = 'var(--am)';
    card.onmouseenter = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)';
    card.onmouseleave = () => card.style.boxShadow = '';

    card.innerHTML = '<div style="display:flex;align-items:flex-start;gap:14px">'

      // Sol renk şeridi + kategori ikonu
      + '<div style="width:42px;height:42px;border-radius:11px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">'
      + cat.ic + '</div>'

      // Ana içerik
      + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">'
          + '<span style="font-size:14px;font-weight:700;color:var(--t)">' + o.name + '</span>'
          + '<span style="background:var(--s2);color:var(--t2);font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px">'
          + cat.ic + ' ' + cat.l + '</span>'
          + '<span style="font-size:10px;color:var(--t3);background:var(--s2);padding:2px 7px;border-radius:6px">' + freq + '</span>'
          + '<span class="badge ' + sta.cls + '" style="font-size:10px">' + sta.ic + ' ' + sta.l + '</span>'
          + (noReceipt ? '<span style="background:rgba(245,158,11,.1);color:#D97706;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;border:1px solid rgba(245,158,11,.3)">📎 Dekont Eksik</span>' : '')
        + '</div>'

        + '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
          // Tutar
          + '<div><span style="font-size:11px;color:var(--t3)">Tutar</span><br>'
          + '<span style="font-size:15px;font-weight:700;color:var(--t);font-family:\'DM Mono\',monospace">₺' + (parseFloat(o.amount)||0).toLocaleString('tr-TR',{minimumFractionDigits:2}) + '</span></div>'
          // Son tarih
          + '<div><span style="font-size:11px;color:var(--t3)">Son Tarih</span><br>'
          + '<span style="font-size:13px;font-weight:600;color:' + (status==='gecikti'?'var(--rdt)':status==='yaklasan'?'var(--amt)':'var(--t)') + '">'
          + (o.due||'—') + ' <span style="font-size:10px;font-weight:400;color:var(--t3)">(' + diffTxt + ')</span></span></div>'
          // Alarm günü
          + '<div><span style="font-size:11px;color:var(--t3)">Alarm</span><br>'
          + '<span style="font-size:12px;color:var(--t2)">' + (o.alarmDays||3) + ' gün önce</span></div>'
          // Sorumlu
          + '<div><span style="font-size:11px;color:var(--t3)">Sorumlu</span><br>'
          + (assigned
            ? '<div style="display:flex;align-items:center;gap:5px;margin-top:2px">'
              + '<div style="width:22px;height:22px;border-radius:6px;background:' + aColor[0] + ';color:' + aColor[1] + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800">' + aIni + '</div>'
              + '<span style="font-size:12px;font-weight:500">' + assigned.name + '</span></div>'
            : '<span style="font-size:12px;color:var(--t3)">Atanmamış</span>')
          + '</div>'
        + '</div>'

        + (o.note ? '<div style="font-size:12px;color:var(--t3);margin-top:6px">' + o.note + '</div>' : '')

        // Dekont göster
        + (o.receipt
          ? '<div style="margin-top:8px;display:flex;align-items:center;gap:6px">'
            + '<span style="font-size:11px;color:var(--grt);background:var(--grb);padding:3px 10px;border-radius:6px">✅ Dekont yüklendi — ' + (o.receiptName||'dosya') + '</span>'
            + '<button onclick="viewOdmReceipt(' + o.id + ')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--ac)">Görüntüle</button>'
            + '</div>'
          : '')
      + '</div>'

      // Sağ aksiyonlar
      + '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        + (!o.paid
          ? '<button onclick="markOdmPaid(' + o.id + ')" class="btn btnp" style="font-size:12px;border-radius:9px;padding:6px 14px">✓ Ödendi</button>'
          : '<button onclick="toggleOdmPaid(' + o.id + ')" class="btn btns" style="font-size:12px;border-radius:9px;padding:6px 14px">↩ Geri Al</button>')
        + (o.paid && !o.receipt
          ? '<button onclick="uploadOdmReceipt(' + o.id + ')" class="btn btns" style="font-size:12px;border-radius:9px;padding:6px 14px;color:#D97706">📎 Dekont Ekle</button>'
          : '')
        + '<div style="display:flex;gap:4px">'
          + '<button onclick="openOdmModal(' + o.id + ')" class="btn btns" style="font-size:12px;padding:5px 10px;border-radius:8px">✏️</button>'
          + (_isAdminO() ? '<button onclick="delOdm(' + o.id + ')" class="btn btns" style="font-size:12px;padding:5px 10px;border-radius:8px;color:var(--rdt)">🗑</button>' : '')
        + '</div>'
      + '</div>'

    + '</div>';

    frag.appendChild(card);
  });

  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — MODAL
// ════════════════════════════════════════════════════════════════

function openOdmModal(id) {
  _injectOdmPanel();

  // Modal oluştur
  const existing = _go('mo-odm-v9');
  if (existing) existing.remove();

  const users   = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const o       = id ? (loadOdm().find(x => x.id === id) || null) : null;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-v9'; mo.style.zIndex = '2100';

  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;overflow:hidden;border-radius:16px">'
    + '<div style="padding:16px 22px 14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">' + (o ? '✏️ Ödeme Düzenle' : '+ Yeni Ödeme') + '</div>'
    + '<button onclick="document.getElementById(\'mo-odm-v9\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:18px 22px;max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px">'

    // İsim
    + '<div class="fr"><div class="fl">ÖDEME ADI *</div>'
    + '<input class="fi" id="odm-f-name" placeholder="Örn: Ofis Kirası" style="border-radius:8px" value="' + (o?o.name||'':'') + '"></div>'

    // Kategori + Sıklık
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">KATEGORİ</div><select class="fi" id="odm-f-cat" style="border-radius:8px">'
    + Object.entries(ODM_CATS).map(([k,v]) => `<option value="${k}"${o&&o.cat===k?' selected':''}>${v.ic} ${v.l}</option>`).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">SIKLIK</div><select class="fi" id="odm-f-freq" style="border-radius:8px">'
    + Object.entries(ODM_FREQ).map(([k,v]) => `<option value="${k}"${o&&o.freq===k?' selected':''}>${v}</option>`).join('')
    + '</select></div>'
    + '</div>'

    // Tutar + Son Tarih
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">TUTAR (₺)</div>'
    + '<input class="fi" type="number" id="odm-f-amount" placeholder="0.00" min="0" step="0.01" style="border-radius:8px" value="' + (o?o.amount||'':'') + '"></div>'
    + '<div class="fr"><div class="fl">SON ÖDEME TARİHİ</div>'
    + '<input type="date" class="fi" id="odm-f-due" style="border-radius:8px" value="' + (o?o.due||'':'') + '"></div>'
    + '</div>'

    // Sorumlu + Alarm
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">SORUMLU KİŞİ</div><select class="fi" id="odm-f-assigned" style="border-radius:8px">'
    + '<option value="">— Seç —</option>'
    + users.map(u => `<option value="${u.id}"${o&&o.assignedTo===u.id?' selected':''}>${u.name}</option>`).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">ALARM <span style="font-weight:400;color:var(--t3)">(kaç gün önce)</span></div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<input type="range" id="odm-f-alarm" min="1" max="30" value="' + (o?o.alarmDays||3:3) + '" style="flex:1" oninput="document.getElementById(\'odm-f-alarm-val\').textContent=this.value">'
    + '<span id="odm-f-alarm-val" style="font-size:13px;font-weight:700;color:var(--ac);min-width:24px;text-align:center">' + (o?o.alarmDays||3:3) + '</span>'
    + '<span style="font-size:12px;color:var(--t3)">gün</span>'
    + '</div></div>'
    + '</div>'

    // Not
    + '<div class="fr"><div class="fl">NOT</div>'
    + '<textarea class="fi" id="odm-f-note" rows="2" style="resize:none;border-radius:8px" placeholder="Açıklama…">' + (o?o.note||'':'') + '</textarea></div>'

    // Ödendi toggle
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--s2);border-radius:9px">'
    + '<span style="font-size:13px;font-weight:500">Ödendi olarak işaretle</span>'
    + '<label class="psw"><input type="checkbox" id="odm-f-paid"' + (o&&o.paid?' checked':'') + '><span class="psl"></span></label>'
    + '</div>'

    + '<input type="hidden" id="odm-f-eid" value="' + (o?o.id:'') + '">'
    + '</div>'

    + '<div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-v9\').remove()">İptal</button>'
    + '<button class="btn btnp" onclick="saveOdm()" style="padding:9px 22px;border-radius:9px">Kaydet</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _go('odm-f-name')?.focus(); }, 10);
}



// ════════════════════════════════════════════════════════════════
// MODAL KATEGORI DEĞİŞİKLİĞİ  [v2.0]
// ════════════════════════════════════════════════════════════════
function _onOdmCatChange() {
  const cat = _go('odm-f-cat')?.value;
  const kEl = _go('odm-kredi-extra');
  const aEl = _go('odm-abone-extra');
  if (kEl) kEl.style.display = cat === 'kredi_k'  ? 'flex' : 'none';
  if (aEl) aEl.style.display = cat === 'abonelik' ? 'flex' : 'none';
}

function uploadOdmSozlesme() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,image/*';
  inp.onchange = function() {
    const file = this.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { window.toast?.('Dosya 10MB den kucuk olmali', 'err'); return; }
    const r = new FileReader();
    r.onload = e => {
      const dataEl = _go('odm-f-sozlesme-data');
      const nameEl = _go('odm-f-sozlesme-name');
      if (dataEl) dataEl.value = e.target.result;
      if (nameEl) nameEl.value = file.name;
      window.toast?.('Döküman hazır — kaydetmeyi unutmayın', 'ok');
    };
    r.readAsDataURL(file);
  };
  inp.click();
}

function viewOdmSozlesme(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o || !o.sozlesme) return;
  const win = window.open('', '_blank');
  win.document.write('<html><body style="margin:0">'
    + (o.sozlesme.startsWith('data:image')
      ? '<img src="' + o.sozlesme + '" style="max-width:100%">'
      : '<iframe src="' + o.sozlesme + '" style="width:100vw;height:100vh;border:none"></iframe>')
    + '</body></html>');
}
window.viewOdmSozlesme   = viewOdmSozlesme;
window.uploadOdmSozlesme = uploadOdmSozlesme;
window._onOdmCatChange   = _onOdmCatChange;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — CRUD
// ════════════════════════════════════════════════════════════════

function saveOdm() {
  const name = (_go('odm-f-name')?.value || '').trim();
  if (!name) { window.toast?.('Ödeme adı zorunludur', 'err'); return; }
  const eid  = parseInt(_go('odm-f-eid')?.value || '0');
  const d    = window.loadOdm ? loadOdm() : [];
  const cat = _go('odm-f-cat')?.value || 'diger';
  const entry = {
    name,
    cat,
    freq:       _go('odm-f-freq')?.value     || 'aylik',
    amount:     parseFloat(_go('odm-f-amount')?.value || '0') || 0,
    due:        _go('odm-f-due')?.value      || '',
    note:       _go('odm-f-note')?.value     || '',
    paid:       !!_go('odm-f-paid')?.checked,
    alarmDays:  parseInt(_go('odm-f-alarm')?.value || '3'),
    assignedTo: parseInt(_go('odm-f-assigned')?.value || '0') || null,
    ts:         _nowTso(),
    updatedBy:  _CUo()?.id,
    // Kredi kartı alanları
    ...(cat === 'kredi_k' ? {
      banka:        _go('odm-f-banka')?.value   || '',
      sonDortHane:  _go('odm-f-son4')?.value    || '',
      limit:        parseFloat(_go('odm-f-limit')?.value  || '0') || 0,
      bakiye:       parseFloat(_go('odm-f-bakiye')?.value || '0') || 0,
      minOdeme:     parseFloat(_go('odm-f-min')?.value    || '0') || 0,
      kesiimTarihi: _go('odm-f-kesim')?.value  || '',
      odemeGunu:    _go('odm-f-odgun')?.value   || '',
    } : {}),
    // Abonelik alanları
    ...(cat === 'abonelik' ? {
      abonelikTipi:  _go('odm-f-abtype')?.value || 'diger',
      sozlesmeBitis: _go('odm-f-sozbitis')?.value || '',
      sozlesme:      _go('odm-f-sozlesme-data')?.value || undefined,
      sozlesmeName:  _go('odm-f-sozlesme-name')?.value || undefined,
    } : {}),
  };
  // sozlesme undefined ise sil
  if (entry.sozlesme === undefined) delete entry.sozlesme;
  if (entry.sozlesmeName === undefined) delete entry.sozlesmeName;
  if (eid) {
    const o = d.find(x => x.id === eid);
    if (o) {
      if (!o.paid && entry.paid) { entry.paidTs = _nowTso(); entry.paidBy = _CUo()?.id; }
      Object.assign(o, entry);
    }
  } else {
    d.unshift({ id: Date.now(), ...entry, createdBy: _CUo()?.id });
  }
  window.storeOdm ? storeOdm(d) : null;
  _go('mo-odm-v9')?.remove();
  renderOdemeler();
  window.logActivity?.('view', `"${name}" ödeme ${eid?'güncellendi':'eklendi'}`);
  window.toast?.(eid ? 'Güncellendi ✓' : 'Ödeme eklendi ✓', 'ok');
}

function markOdmPaid(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.paid   = true;
  o.paidTs = _nowTso();
  o.paidBy = _CUo()?.id;
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  // Alarm key temizle
  localStorage.removeItem('odm_alarm_late_' + id);
  window.toast?.('✅ Ödendi olarak işaretlendi', 'ok');

  // Dekont uyarısı
  setTimeout(() => {
    window.toast?.('📎 Lütfen dekontu yüklemeyi unutmayın', 'warn');
    window.addNotif?.('📎', `"${o.name}" için dekont yüklenmedi`, 'warn', 'odemeler');
  }, 1500);
}

function toggleOdmPaid(id) {
  const d = window.loadOdm ? loadOdm() : [];
  const o = d.find(x => x.id === id); if (!o) return;
  o.paid   = !o.paid;
  o.paidTs = o.paid ? _nowTso() : null;
  o.paidBy = o.paid ? _CUo()?.id : null;
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  window.toast?.(o.paid ? '✅ Ödendi' : '↩ Geri alındı', 'ok');
}

function delOdm(id) {
  if (!_isAdminO()) return;
  if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;
  window.storeOdm ? storeOdm(loadOdm().filter(x => x.id !== id)) : null;
  renderOdemeler();
  window.toast?.('Silindi', 'ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — DEKONT
// ════════════════════════════════════════════════════════════════

function uploadOdmReceipt(id) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*,.pdf';
  inp.onchange = function() {
    const file = this.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { window.toast?.('Dosya 5MB\'dan küçük olmalı', 'err'); return; }
    const r = new FileReader();
    r.onload = function(e) {
      const d = window.loadOdm ? loadOdm() : [];
      const o = d.find(x => x.id === id); if (!o) return;
      o.receipt     = e.target.result;
      o.receiptName = file.name;
      o.receiptTs   = _nowTso();
      window.storeOdm ? storeOdm(d) : null;
      // Alarm key temizle
      localStorage.removeItem('odm_alarm_receipt_' + id);
      renderOdemeler();
      window.toast?.('📎 Dekont yüklendi ✓', 'ok');
      window.logActivity?.('view', `"${o.name}" için dekont yüklendi`);
    };
    r.readAsDataURL(file);
  };
  inp.click();
}

function viewOdmReceipt(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o || !o.receipt) return;
  const win = window.open('', '_blank');
  win.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh">'
    + (o.receipt.startsWith('data:image')
      ? `<img src="${o.receipt}" style="max-width:100%;max-height:100vh;object-fit:contain">`
      : `<iframe src="${o.receipt}" style="width:100vw;height:100vh;border:none"></iframe>`)
    + '</body></html>');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — EXCEL İMPORT / EXPORT
// ════════════════════════════════════════════════════════════════

function exportOdmXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const items = window.loadOdm ? loadOdm() : [];
  const users = window.loadUsers ? loadUsers() : [];

  const rows = [['ID','Ödeme Adı','Kategori','Sıklık','Tutar (₺)','Son Tarih','Durum','Sorumlu','Alarm (gün)','Not','Ödeme Tarihi','Dekont']];
  items.forEach(o => {
    const cat   = ODM_CATS[o.cat]?.l || o.cat;
    const freq  = ODM_FREQ[o.freq]   || o.freq;
    const user  = users.find(u => u.id === o.assignedTo);
    const today = _todayStr();
    const status = o.paid ? 'Ödendi' : (o.due && o.due < today ? 'Gecikti' : 'Bekliyor');
    rows.push([
      o.id, o.name, cat, freq,
      parseFloat(o.amount)||0,
      o.due||'',
      status,
      user?.name || '—',
      o.alarmDays||3,
      o.note||'',
      o.paidTs||'',
      o.receipt ? 'Var' : 'Yok',
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Sütun genişlikleri
  ws['!cols'] = [8,24,14,12,12,12,10,16,12,24,18,8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Rutin Ödemeler');
  XLSX.writeFile(wb, 'rutin-odemeler-' + _todayStr() + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
  window.logActivity?.('view', 'Rutin ödemeler Excel olarak indirildi');
}

function processOdmImport(inp) {
  const file = inp?.files?.[0]; if (!file) return;
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }

  const r = new FileReader();
  r.onload = function(e) {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) { window.toast?.('Dosyada veri bulunamadı', 'err'); return; }

      // Başlık satırını bul
      const header = rows[0].map(h => String(h||'').toLowerCase().trim());
      const col    = key => header.findIndex(h => h.includes(key));

      const nameCol   = col('ad') > -1 ? col('ad') : col('name');
      const catCol    = col('kategori') > -1 ? col('kategori') : col('cat');
      const amountCol = col('tutar') > -1 ? col('tutar') : col('amount');
      const dueCol    = col('tarih') > -1 ? col('tarih') : col('due');
      const freqCol   = col('sıklık') > -1 ? col('sıklık') : col('freq');
      const noteCol   = col('not') > -1 ? col('not') : col('note');

      if (nameCol < 0) { window.toast?.('Başlık satırında "Ödeme Adı" kolonu bulunamadı', 'err'); return; }

      const catKeys = Object.keys(ODM_CATS);
      const freqKeys = Object.keys(ODM_FREQ);

      const existing = window.loadOdm ? loadOdm() : [];
      let added = 0;

      rows.slice(1).forEach(row => {
        if (!row || !row[nameCol]) return;
        const name = String(row[nameCol]||'').trim();
        if (!name) return;

        // Kategori eşleştir
        let cat = 'diger';
        if (catCol > -1) {
          const catVal = String(row[catCol]||'').toLowerCase();
          const found  = catKeys.find(k => catVal.includes(k) || catVal.includes(ODM_CATS[k].l.toLowerCase()));
          if (found) cat = found;
        }

        // Sıklık eşleştir
        let freq = 'aylik';
        if (freqCol > -1) {
          const freqVal = String(row[freqCol]||'').toLowerCase();
          const found   = freqKeys.find(k => freqVal.includes(k) || freqVal.includes(ODM_FREQ[k].toLowerCase()));
          if (found) freq = found;
        }

        // Tarih format
        let due = '';
        if (dueCol > -1 && row[dueCol]) {
          const dv = row[dueCol];
          if (typeof dv === 'number') {
            // Excel serial date
            const d = new Date(Math.round((dv - 25569) * 86400 * 1000));
            due = d.toISOString().slice(0,10);
          } else {
            const parsed = new Date(String(dv));
            if (!isNaN(parsed)) due = parsed.toISOString().slice(0,10);
          }
        }

        existing.unshift({
          id:        Date.now() + added,
          name,
          cat,
          freq,
          amount:    amountCol > -1 ? (parseFloat(row[amountCol])||0) : 0,
          due,
          note:      noteCol > -1 ? (row[noteCol]||'') : '',
          paid:      false,
          alarmDays: 3,
          ts:        _nowTso(),
          createdBy: _CUo()?.id,
        });
        added++;
      });

      window.storeOdm ? storeOdm(existing) : null;
      renderOdemeler();
      window.toast?.(`${added} ödeme içe aktarıldı ✓`, 'ok');
      window.logActivity?.('view', `Excel'den ${added} ödeme aktarıldı`);
    } catch (err) {
      window.toast?.('Import hatası: ' + err.message, 'err');
    }
    inp.value = '';
  };
  r.readAsBinaryString(file);
}

// Eski API uyumluluğu
function importOdmFile() { _go('odm-import-file')?.click(); }

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Odemeler = {
  render:      renderOdemeler,
  openModal:   openOdmModal,
  save:        saveOdm,
  del:         delOdm,
  togglePaid:  toggleOdmPaid,
  markPaid:    markOdmPaid,
  checkAlarms: checkOdmAlarms,
  startAlarms: startOdmAlarmTimer,
  exportXlsx:  exportOdmXlsx,
  importFile:  processOdmImport,
  CATS:        ODM_CATS,
  FREQ:        ODM_FREQ,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Odemeler;
} else {
  window.Odemeler       = Odemeler;
  window.renderOdemeler = renderOdemeler;
  window.openOdmModal   = openOdmModal;
  window.saveOdm        = saveOdm;
  window.delOdm         = delOdm;
  window.toggleOdmPaid  = toggleOdmPaid;
  window.markOdmPaid    = markOdmPaid;
  window.exportOdmXlsx  = exportOdmXlsx;
  window.processOdmImport = processOdmImport;
  window.importOdmFile  = importOdmFile;
  window.uploadOdmReceipt = uploadOdmReceipt;
  window.viewOdmReceipt = viewOdmReceipt;
  window.checkOdmAlarms = checkOdmAlarms;
  window.ODM_CATS       = ODM_CATS;

  // Alarm timer — sayfa yüklenince başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOdmAlarmTimer);
  } else {
    setTimeout(startOdmAlarmTimer, 2000);
  }
}
