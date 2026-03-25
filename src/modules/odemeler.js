/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/odemeler.js  —  v10.0.0
 * Rutin Ödemeler — Tasarım 3 Bento+Tablo + 10 Yeni Özellik
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
  kira:     { l:'Kira',           ic:'🏢', c:'ba' },
  fatura:   { l:'Fatura',         ic:'💡', c:'bb' },
  abonelik: { l:'Abonelik',       ic:'🔄', c:'bp' },
  kredi_k:  { l:'Kredi Kartı',    ic:'💳', c:'bp' },
  vergi:    { l:'Vergi/SGK',      ic:'📋', c:'br' },
  sigorta:  { l:'Sigorta',        ic:'🛡️', c:'ba' },
  kredi:    { l:'Kredi',          ic:'🏦', c:'bb' },
  maas:     { l:'Maaş/Personel',  ic:'👥', c:'bg' },
  diger:    { l:'Diğer',          ic:'📌', c:'bg' },
};

const ODM_ABONE_TYPES = {
  su:       { l:'Su',       ic:'💧' },
  elektrik: { l:'Elektrik', ic:'⚡' },
  dogalgaz: { l:'Doğalgaz', ic:'🔥' },
  telefon:  { l:'Telefon',  ic:'📱' },
  internet: { l:'İnternet', ic:'🌐' },
  yazilim:  { l:'Yazılım',  ic:'💻' },
  diger:    { l:'Diğer',    ic:'🔄' },
};

const ODM_FREQ = {
  haftalik: 'Haftalık',
  aylik:    'Aylık',
  uc_aylik: '3 Aylık',
  yillik:   'Yıllık',
  teksefer: 'Tek Sefer',
};

const ODM_STATUS = {
  bekliyor: { l:'Bekliyor',   ic:'📅', cls:'bb' },
  odendi:   { l:'Ödendi',     ic:'✅', cls:'bg' },
  gecikti:  { l:'Gecikti',    ic:'🚨', cls:'br' },
  yaklasan: { l:'Yaklaşıyor', ic:'⚠️', cls:'ba' },
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — ALARM SİSTEMİ (Özellik 10: Belge süresi uyarısı dahil)
// ════════════════════════════════════════════════════════════════

function checkOdmAlarms() {
  const items  = window.loadOdm ? loadOdm() : [];
  const today  = _todayStr();
  const todayD = new Date(today);
  let alarmed  = 0;

  items.forEach(o => {
    if (!o.due || o.paid) {
      // Ödendi ama dekont eksik
      if (o.paid && !o.receipt) {
        const key = 'odm_alarm_receipt_' + o.id;
        if (!localStorage.getItem(key)) {
          window.addNotif?.('📎', `"${o.name}" ödemesi için dekont bekleniyor`, 'warn', 'odemeler');
          localStorage.setItem(key, '1');
        }
      }
      return;
    }

    const dueD = new Date(o.due);
    const diff = Math.ceil((dueD - todayD) / 86400000);
    const warn = o.alarmDays || 3;

    if (diff < 0) {
      const key = 'odm_alarm_late_' + o.id;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('🚨', `Gecikmiş ödeme: "${o.name}" — ${Math.abs(diff)} gün gecikmiş`, 'err', 'odemeler');
        localStorage.setItem(key, today);
      }
    } else if (diff <= warn) {
      const key = 'odm_alarm_soon_' + o.id + '_' + today;
      if (!localStorage.getItem(key)) {
        window.addNotif?.('⚠️', `"${o.name}" için ${diff} gün kaldı`, 'warn', 'odemeler');
        localStorage.setItem(key, '1');
        alarmed++;
      }
    }

    // Özellik 9: Belge/sözleşme süresi uyarısı
    if (o.sozlesmeBitis) {
      const sozD = new Date(o.sozlesmeBitis);
      const sozDiff = Math.ceil((sozD - todayD) / 86400000);
      if ([30, 15, 7].includes(sozDiff)) {
        const skey = 'odm_soz_' + o.id + '_' + sozDiff;
        if (!localStorage.getItem(skey)) {
          window.addNotif?.('📄', `"${o.name}" sözleşmesi ${sozDiff} gün sonra bitiyor`, 'warn', 'odemeler');
          localStorage.setItem(skey, '1');
        }
      }
    }
  });

  return alarmed;
}

function startOdmAlarmTimer() {
  checkOdmAlarms();
  setInterval(checkOdmAlarms, 30 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — PANEL HTML (Tasarım 3: Bento + Tablo)
// ════════════════════════════════════════════════════════════════

function _injectOdmPanel() {
  const panel = _go('panel-odemeler');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  const monthLabel = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  panel.innerHTML = [

    // ── TOPBAR ──
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b);background:var(--sf);position:sticky;top:0;z-index:10">',
      '<div>',
        '<div style="font-size:14px;font-weight:600;color:var(--t)">💳 Rutin Ödemeler</div>',
        `<div style="font-size:11px;color:var(--t3);margin-top:1px">${monthLabel} · <span id="odm-month-summary">yükleniyor…</span></div>`,
      '</div>',
      '<div style="display:flex;gap:8px;align-items:center">',
        // Özellik 8: Toplu işlem butonu
        '<button class="btn btns" id="odm-bulk-btn" onclick="toggleOdmBulkMode()" style="border-radius:8px;font-size:11px;display:none">Toplu Seç</button>',
        '<button class="btn btns" onclick="exportOdmXlsx()" style="border-radius:8px;font-size:11px">Excel İndir</button>',
        '<button class="btn btns" onclick="_go(\'odm-import-file\').click()" style="border-radius:8px;font-size:11px">Excel Yükle</button>',
        '<input type="file" id="odm-import-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="processOdmImport(this)">',
        '<button class="btn btnp" onclick="openOdmModal(null)" style="border-radius:8px;font-size:12px;font-weight:600">+ Ödeme Ekle</button>',
      '</div>',
    '</div>',

    // ── BENTO ÖZET (4 metrik kutu) ──
    '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid var(--b)">',
      // Toplam
      '<div style="padding:14px 18px;border-right:1px solid var(--b)">',
        '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Toplam yükümlülük</div>',
        '<div style="font-size:22px;font-weight:500;color:var(--t)" id="odm-bento-total-amt">₺0</div>',
        '<div style="height:3px;background:var(--s2);border-radius:99px;margin-top:8px;overflow:hidden">',
          '<div id="odm-bento-bar" style="height:100%;width:0%;background:var(--ac);border-radius:99px;transition:width .6s"></div>',
        '</div>',
        '<div style="display:flex;justify-content:space-between;margin-top:4px">',
          '<span style="font-size:9px;color:var(--ac)" id="odm-bento-pct">0% ödendi</span>',
          '<span style="font-size:9px;color:var(--t3)" id="odm-bento-ratio">0/0</span>',
        '</div>',
      '</div>',
      // Gecikmiş
      '<div id="odm-bento-late-box" style="padding:14px 18px;border-right:1px solid var(--b);cursor:pointer" onclick="setOdmTab(\'gecikti\')">',
        '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Gecikmiş</div>',
        '<div style="font-size:22px;font-weight:500;color:var(--rdt)" id="odm-stat-late">0</div>',
        '<div style="font-size:10px;color:var(--rdt);margin-top:4px">Hemen öde</div>',
      '</div>',
      // Bu hafta
      '<div style="padding:14px 18px;border-right:1px solid var(--b);cursor:pointer" onclick="setOdmTab(\'bekliyor\')">',
        '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Bu hafta</div>',
        '<div style="font-size:22px;font-weight:500;color:var(--amt)" id="odm-stat-soon">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="odm-week-amt">—</div>',
      '</div>',
      // Bu ay ödendi
      '<div style="padding:14px 18px;cursor:pointer" onclick="setOdmTab(\'odendi\')">',
        '<div style="font-size:11px;color:var(--t3);margin-bottom:4px">Bu ay ödendi</div>',
        '<div style="font-size:22px;font-weight:500;color:var(--grt)" id="odm-stat-paid">0</div>',
        '<div style="font-size:10px;color:var(--t3);margin-top:4px" id="odm-paid-amt">—</div>',
      '</div>',
    '</div>',

    // ── SEKMELER ──
    '<div style="display:flex;border-bottom:1px solid var(--b);background:var(--sf);overflow-x:auto;scrollbar-width:none">',
      '<div id="odm-stab-all"      onclick="setOdmTab(\'all\')"      style="padding:9px 16px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid var(--ac);color:var(--ac)">Tümü <span id="odm-stat-total">0</span></div>',
      '<div id="odm-stab-gecikti"  onclick="setOdmTab(\'gecikti\')"  style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--rd)">Gecikmiş</div>',
      '<div id="odm-stab-bekliyor" onclick="setOdmTab(\'bekliyor\')" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Bu Hafta</div>',
      '<div id="odm-stab-ay"       onclick="setOdmTab(\'ay\')"       style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Bu Ay</div>',
      '<div id="odm-stab-odendi"   onclick="setOdmTab(\'odendi\')"   style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Ödendi</div>',
      '<div id="odm-stab-abonelik" onclick="setOdmTab(\'abonelik\')" style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Abonelikler</div>',
      '<div id="odm-stab-kredi_k"  onclick="setOdmTab(\'kredi_k\')"  style="padding:9px 16px;font-size:11px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;color:var(--t3)">Kredi Kartları</div>',
    '</div>',

    // ── ARAMA + FİLTRELER ──
    '<div style="padding:10px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--s2)">',
      '<div style="position:relative;flex:1;min-width:160px">',
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
      // Özellik 5: Para birimi seçimi
      '<select class="fi" id="odm-currency-f" onchange="renderOdemeler()" style="border-radius:8px;min-width:80px">',
        '<option value="TRY">₺ TRY</option>',
        '<option value="USD">$ USD</option>',
        '<option value="EUR">€ EUR</option>',
      '</select>',
    '</div>',

    // ── TABLO BAŞLIK ──
    '<div id="odm-thead" style="display:grid;grid-template-columns:28px 1fr 110px 100px 80px 120px;gap:0;padding:7px 16px;border-bottom:1px solid var(--b);background:var(--s2)">',
      '<div></div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Ödeme</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Tutar</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Son Tarih</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Durum</div>',
      '<div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">İşlem</div>',
    '</div>',

    // ── Toplu işlem toolbar (gizli) ──
    '<div id="odm-bulk-bar" style="display:none;padding:8px 16px;border-bottom:1px solid var(--b);background:rgba(99,102,241,.06);align-items:center;gap:10px">',
      '<span style="font-size:12px;font-weight:500;color:var(--ac)" id="odm-bulk-count">0 seçildi</span>',
      '<button class="btn btnp" onclick="bulkMarkOdmPaid()" style="font-size:11px;border-radius:7px">✓ Tümünü Ödendi İşaretle</button>',
      '<button class="btn btns" onclick="cancelOdmBulk()" style="font-size:11px;border-radius:7px">İptal</button>',
    '</div>',

    '<div id="odm-list"></div>',

  ].join('');

  // Sekme click event delegation
  const tabsRow = panel.querySelector('[id="odm-stab-all"]')?.parentElement;
  if (tabsRow) {
    tabsRow.addEventListener('click', e => {
      const el = e.target.closest('[id^="odm-stab-"]');
      if (el) setOdmTab(el.id.replace('odm-stab-', ''));
    });
  }

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
// SEKME YÖNETİMİ
// ════════════════════════════════════════════════════════════════
let _odmCurrentTab = 'all';

function setOdmTab(tab) {
  _odmCurrentTab = tab;
  const tabMap = { all:'odm-stab-all', gecikti:'odm-stab-gecikti', bekliyor:'odm-stab-bekliyor', ay:'odm-stab-ay', odendi:'odm-stab-odendi', abonelik:'odm-stab-abonelik', kredi_k:'odm-stab-kredi_k' };
  Object.entries(tabMap).forEach(([t, id]) => {
    const el = _go(id); if (!el) return;
    const on = t === tab;
    el.style.borderBottomColor = on ? (t==='gecikti'?'var(--rd)':'var(--ac)') : 'transparent';
    el.style.color = on ? (t==='gecikti'?'var(--rd)':'var(--ac)') : t==='gecikti' ? 'var(--rd)' : 'var(--t3)';
    el.style.fontWeight = on ? '600' : '400';
  });
  const thead = _go('odm-thead');
  if (thead) thead.style.display = (tab==='kredi_k'||tab==='abonelik') ? 'none' : 'grid';
  renderOdemeler();
}

// ════════════════════════════════════════════════════════════════
// KREDİ KARTI ÖZEL KART
// ════════════════════════════════════════════════════════════════
function _renderKrediKarti(o, users) {
  const today  = _todayStr();
  const todayD = new Date(today);
  const limit  = parseFloat(o.limit  || 0);
  const bakiye = parseFloat(o.bakiye || 0);
  const kul    = limit > 0 ? Math.round(bakiye / limit * 100) : 0;
  const kulColor = kul >= 80 ? '#EF4444' : kul >= 50 ? '#F97316' : '#10B981';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:14px;padding:0;margin:10px 16px;overflow:hidden;transition:box-shadow .15s';
  card.onmouseenter = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)';
  card.onmouseleave = () => card.style.boxShadow = '';

  const status = o.paid ? 'odendi' : (o.due && o.due < today ? 'gecikti' : 'bekliyor');

  card.innerHTML = `
    <div style="background:linear-gradient(135deg,#1e1b4b,#3730a3);padding:16px 20px;color:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:600;margin-bottom:2px">${o.name}</div>
          <div style="font-size:11px;opacity:.7">${o.banka||'Banka'} ${o.sonDortHane?'· **** '+o.sonDortHane:''}</div>
        </div>
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none"><rect width="32" height="24" rx="4" fill="rgba(255,255,255,.15)"/><circle cx="12" cy="12" r="8" fill="#EB001B" opacity=".8"/><circle cx="20" cy="12" r="8" fill="#F79E1B" opacity=".8"/></svg>
      </div>
      <div style="display:flex;gap:24px">
        <div><div style="font-size:10px;opacity:.6">Limit</div><div style="font-size:15px;font-weight:500">₺${limit.toLocaleString('tr-TR')}</div></div>
        <div><div style="font-size:10px;opacity:.6">Kullanılan</div><div style="font-size:15px;font-weight:500">₺${bakiye.toLocaleString('tr-TR')}</div></div>
        <div><div style="font-size:10px;opacity:.6">Kullanım</div><div style="font-size:15px;font-weight:500;color:${kul>=80?'#fca5a5':kul>=50?'#fed7aa':'#86efac'}">${kul}%</div></div>
      </div>
    </div>
    <div style="padding:12px 20px">
      <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${kul}%;background:${kulColor};border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">
        <div><div style="font-size:10px;color:var(--t3)">Hesap Kesim</div><div style="font-size:12px;font-weight:500;color:var(--t)">${o.kesiimTarihi?'Her ayın '+o.kesiimTarihi+'. günü':'—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Son Ödeme</div><div style="font-size:12px;font-weight:500;color:${o.due&&o.due<today?'#EF4444':'var(--t)'}">${o.due||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--t3)">Min. Ödeme</div><div style="font-size:12px;font-weight:500;color:var(--t)">₺${(parseFloat(o.minOdeme||0)).toLocaleString('tr-TR')}</div></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:8px;padding:5px 12px">✓ Ödendi</button>` : `<button onclick="toggleOdmPaid(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px">↩ Geri Al</button>`}
        ${o.paid && !o.receipt ? `<button onclick="uploadOdmReceipt(${o.id})" class="btn btns" style="font-size:11px;border-radius:8px;padding:5px 12px;color:#D97706">📎 Dekont</button>` : ''}
        <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:5px 10px;border-radius:8px">✏️ Düzenle</button>
        ${_isAdminO() ? `<button onclick="delOdm(${o.id})" class="btn btns" style="font-size:11px;padding:5px 10px;border-radius:8px;color:var(--rdt)">🗑</button>` : ''}
      </div>
    </div>`;
  return card;
}

// ════════════════════════════════════════════════════════════════
// ABONELİK ÖZEL KART
// ════════════════════════════════════════════════════════════════
function _renderAbonelikKart(o, users, today, todayD) {
  const status = o.paid ? 'odendi' : (o.due && o.due < today ? 'gecikti' : (o.due && Math.ceil((new Date(o.due)-todayD)/86400000) <= 7 ? 'yaklasan' : 'bekliyor'));
  const sta    = ODM_STATUS[status];
  const dueD   = o.due ? new Date(o.due) : null;
  const diff   = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
  const abone  = ODM_ABONE_TYPES[o.abonelikTipi] || ODM_ABONE_TYPES.diger;

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px 16px;margin:4px 16px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s';
  if (status === 'gecikti') card.style.borderColor = 'var(--rd)';
  if (status === 'yaklasan') card.style.borderColor = 'var(--am)';
  card.onmouseenter = () => card.style.boxShadow = '0 2px 10px rgba(0,0,0,.07)';
  card.onmouseleave = () => card.style.boxShadow = '';

  const sozBitisUyari = o.sozlesmeBitis && Math.ceil((new Date(o.sozlesmeBitis) - new Date(today)) / 86400000) <= 30
    ? `<span style="font-size:10px;color:var(--amt);margin-left:6px">📄 Sözleşme bitiş: ${o.sozlesmeBitis}</span>` : '';

  card.innerHTML = `
    <div style="width:42px;height:42px;border-radius:11px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${abone.ic}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:500;color:var(--t)">${o.name}</span>
        <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:rgba(99,102,241,.1);color:#4F46E5">${abone.l}</span>
        <span class="badge ${sta.cls}" style="font-size:10px">${sta.ic} ${sta.l}</span>
        ${o.sozlesme ? `<span style="font-size:10px;color:var(--ac);cursor:pointer" onclick="viewOdmSozlesme(${o.id})">📄 Sözleşme</span>` : ''}
        ${sozBitisUyari}
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:600;color:var(--t)">₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}<span style="font-size:10px;font-weight:400;color:var(--t3)">/${ODM_FREQ[o.freq]||'ay'}</span></span>
        <span style="font-size:11px;color:${status==='gecikti'?'var(--rdt)':status==='yaklasan'?'var(--amt)':'var(--t3)'}">📅 ${o.due||'—'} ${diff!==null?'('+(diff<0?Math.abs(diff)+' gün gecikti':diff===0?'Bugün!':diff+' gün kaldı')+')':''}</span>
      </div>
    </div>
    <div style="display:flex;gap:5px;flex-shrink:0">
      ${!o.paid ? `<button onclick="markOdmPaid(${o.id})" class="btn btnp" style="font-size:11px;border-radius:7px;padding:4px 10px">✓ Ödendi</button>` : `<button onclick="toggleOdmPaid(${o.id})" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 8px">↩</button>`}
      <button onclick="openOdmModal(${o.id})" class="btn btns" style="font-size:11px;padding:4px 8px;border-radius:7px">✏️</button>
      ${_isAdminO() ? `<button onclick="delOdm(${o.id})" class="btn btns" style="font-size:11px;padding:4px 7px;border-radius:7px;color:var(--rdt)">🗑</button>` : ''}
    </div>`;
  return card;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — RENDER
// ════════════════════════════════════════════════════════════════

function renderOdemeler() {
  _injectOdmPanel();
  const today      = _todayStr();
  const todayD     = new Date(today);
  const weekEnd    = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0,10);
  const thisMonth  = today.slice(0,7);

  const all = window.loadOdm ? loadOdm() : [];

  const q     = (_go('odm-search')?.value || '').toLowerCase();
  const catF  = _go('odm-cat-f')?.value   || '';
  const freqF = _go('odm-freq-f')?.value  || '';
  const statF = _go('odm-status-f')?.value || '';
  const userF = _go('odm-user-f')?.value  || '';

  function _getStatus(o) {
    if (o.paid) return 'odendi';
    if (o.due && o.due < today) return 'gecikti';
    if (o.due && o.due <= weekEndStr) return 'yaklasan';
    return 'bekliyor';
  }

  let items = all.filter(o => {
    if (_odmCurrentTab === 'abonelik' && o.cat !== 'abonelik') return false;
    if (_odmCurrentTab === 'kredi_k'  && o.cat !== 'kredi_k')  return false;
    if (_odmCurrentTab === 'bekliyor' && _getStatus(o) !== 'bekliyor' && _getStatus(o) !== 'yaklasan') return false;
    if (_odmCurrentTab === 'gecikti'  && _getStatus(o) !== 'gecikti')  return false;
    if (_odmCurrentTab === 'odendi'   && _getStatus(o) !== 'odendi')   return false;
    if (_odmCurrentTab === 'ay'       && !(o.due||'').startsWith(thisMonth) && !(o.paidTs||'').startsWith(thisMonth)) return false;
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

  // ── Bento istatistikleri ──
  const lateItems = all.filter(o => !o.paid && o.due && o.due < today);
  const weekItems = all.filter(o => !o.paid && o.due && o.due >= today && o.due <= weekEndStr);
  const paidItems = all.filter(o => o.paid && (o.paidTs||'').startsWith(thisMonth));
  const lateN = lateItems.length;
  const weekN = weekItems.length;
  const paidN = paidItems.length;
  const totalN = all.length;
  const paidAmt = paidItems.reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  const weekAmt = weekItems.reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  const totalAmt = all.reduce((s,o) => s + (parseFloat(o.amount)||0), 0);
  const pct = totalN > 0 ? Math.round(paidN / totalN * 100) : 0;

  _sto('odm-stat-total', totalN);
  _sto('odm-stat-late',  lateN);
  _sto('odm-stat-soon',  weekN);
  _sto('odm-stat-paid',  paidN);
  _sto('odm-bento-total-amt', '₺' + Math.round(totalAmt).toLocaleString('tr-TR'));
  _sto('odm-bento-pct',   pct + '% ödendi');
  _sto('odm-bento-ratio', paidN + '/' + totalN);
  _sto('odm-week-amt',  weekN  ? '₺' + Math.round(weekAmt).toLocaleString('tr-TR') : '—');
  _sto('odm-paid-amt',  paidN  ? '₺' + Math.round(paidAmt).toLocaleString('tr-TR') : '—');
  _sto('odm-month-summary', `${paidN}/${totalN} ödendi`);
  const bar = _go('odm-bento-bar'); if (bar) bar.style.width = pct + '%';

  // Gecikmiş kutu vurgula
  const lateBox = _go('odm-bento-late-box');
  if (lateBox) lateBox.style.background = lateN > 0 ? 'rgba(254,242,242,.5)' : 'transparent';

  const cont = _go('odm-list'); if (!cont) return;

  if (!items.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:36px;margin-bottom:12px">💳</div><div style="font-size:14px;font-weight:500">Kayıt bulunamadı</div><div style="margin-top:12px"><button class="btn btnp" onclick="openOdmModal()">+ İlk Ödemeyi Ekle</button></div></div>';
    return;
  }

  const users = window.loadUsers ? loadUsers() : [];
  items = items.sort((a,b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1; if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  const frag = document.createDocumentFragment();

  // Özellik 8: Toplu seçim checkbox container
  const bulkMode = _odmBulkMode || false;
  const bulkSel  = _odmBulkSelected || new Set();

  items.forEach(o => {
    if (o.cat === 'kredi_k') { frag.appendChild(_renderKrediKarti(o, users)); return; }
    if (o.cat === 'abonelik') { frag.appendChild(_renderAbonelikKart(o, users, today, todayD)); return; }

    const cat    = ODM_CATS[o.cat]  || ODM_CATS.diger;
    const freq   = ODM_FREQ[o.freq] || '—';
    const status = _getStatus(o);
    const sta    = ODM_STATUS[status];
    const assigned = users.find(u => u.id === o.assignedTo);

    const dueD   = o.due ? new Date(o.due) : null;
    const diff   = dueD ? Math.ceil((dueD - todayD) / 86400000) : null;
    const diffTxt = diff === null ? '—'
      : diff < 0  ? Math.abs(diff) + ' gün gecikti'
      : diff === 0 ? 'Bugün!'
      : diff === 1 ? 'Yarın'
      : diff + ' gün kaldı';

    const noReceipt = o.paid && !o.receipt;
    const rowBg = status==='gecikti' ? 'rgba(254,242,242,.5)' : status==='yaklasan' ? 'rgba(255,251,235,.4)' : 'var(--sf)';

    // Özellik 7: Ödeme notu göstergesi
    const hasNote = o.note && o.note.trim();

    const row = document.createElement('div');
    row.style.cssText = `display:grid;grid-template-columns:28px 1fr 110px 100px 80px 120px;gap:0;padding:9px 16px;border-bottom:1px solid var(--b);align-items:center;background:${rowBg};transition:background .12s;cursor:pointer`;
    row.onmouseenter = () => row.style.background = 'var(--s2)';
    row.onmouseleave = () => row.style.background = rowBg;
    row.onclick = (e) => { if (!e.target.closest('button') && !e.target.closest('input')) openOdmModal(o.id); };

    const dueColor = status==='gecikti' ? 'var(--rdt)' : status==='yaklasan' ? 'var(--amt)' : 'var(--t2)';

    row.innerHTML =
      // Checkbox (toplu seçim)
      `<div><input type="checkbox" class="odm-bulk-cb" data-id="${o.id}" style="display:${bulkMode?'block':'none'};cursor:pointer" onchange="onOdmBulkCheck(${o.id},this.checked)" onclick="event.stopPropagation()"></div>`
      // İkon + isim
      + `<div style="display:flex;align-items:center;gap:8px;min-width:0">`
          + `<div style="width:32px;height:32px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${cat.ic}</div>`
          + `<div style="min-width:0">`
            + `<div style="font-size:12px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name}${hasNote?' <span title="'+o.note+'" style="color:var(--t3);font-size:10px">💬</span>':''}</div>`
            + `<div style="font-size:10px;color:var(--t3);margin-top:1px">${cat.l} · ${freq}${assigned?' · '+assigned.name:''}${noReceipt?' · <span style="color:var(--amt)">📎</span>':''}</div>`
          + `</div>`
        + `</div>`
      // Tutar
      + `<div style="font-size:12px;font-weight:500;color:var(--t)">₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR')}</div>`
      // Tarih
      + `<div><div style="font-size:11px;font-weight:500;color:${dueColor}">${o.due||'—'}</div><div style="font-size:10px;color:var(--t3)">${diffTxt}</div></div>`
      // Durum
      + `<div><span class="badge ${sta.cls}" style="font-size:10px">${sta.ic} ${sta.l}</span></div>`
      // İşlemler
      + `<div style="display:flex;gap:3px;flex-shrink:0">`
          + (!o.paid
            ? `<button onclick="markOdmPaid(${o.id});event.stopPropagation()" class="btn btnp" style="font-size:10px;border-radius:6px;padding:3px 9px;white-space:nowrap">✓ Ödendi</button>`
            : `<button onclick="toggleOdmPaid(${o.id});event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 8px">↩</button>`)
          + (o.paid && !o.receipt ? `<button onclick="uploadOdmReceipt(${o.id});event.stopPropagation()" class="btn btns" style="font-size:10px;border-radius:6px;padding:3px 7px;color:var(--amt)">📎</button>` : '')
          + `<button onclick="openOdmModal(${o.id});event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 7px;border-radius:6px">✏️</button>`
          + (_isAdminO() ? `<button onclick="delOdm(${o.id});event.stopPropagation()" class="btn btns" style="font-size:10px;padding:3px 6px;border-radius:6px;color:var(--rdt)">🗑</button>` : '')
        + `</div>`;

    frag.appendChild(row);
  });

  cont.replaceChildren(frag);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — MODAL (Tasarım C + Yeni Alanlar)
// ════════════════════════════════════════════════════════════════

function openOdmModal(id) {
  _injectOdmPanel();
  const existing = _go('mo-odm-v10');
  if (existing) existing.remove();

  const users = window.loadUsers ? loadUsers().filter(u => u.status === 'active') : [];
  const o     = id ? (loadOdm().find(x => x.id === id) || null) : null;

  const mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-odm-v10'; mo.style.zIndex = '2100';

  // Özellik 4: Onay akışı notu
  const approvalNote = _isAdminO() ? '' :
    '<div style="padding:8px 12px;background:rgba(99,102,241,.06);border-radius:8px;font-size:11px;color:var(--ac);margin-bottom:4px">ℹ️ Büyük ödemeler admin onayına gönderilir</div>';

  mo.innerHTML = '<div class="moc" style="max-width:540px;padding:0;overflow:hidden;border-radius:16px">'
    + '<div style="padding:14px 20px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<div class="mt" style="margin-bottom:0">' + (o ? '✏️ Ödeme Düzenle' : '+ Yeni Ödeme') + '</div>'
    + '<button onclick="document.getElementById(\'mo-odm-v10\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="padding:16px 20px;max-height:72vh;overflow-y:auto;display:flex;flex-direction:column;gap:11px">'

    + approvalNote

    // İsim
    + '<div class="fr"><div class="fl">ÖDEME ADI *</div>'
    + '<input class="fi" id="odm-f-name" placeholder="Örn: Ofis Kirası" style="border-radius:8px" value="' + (o?o.name||'':'') + '"></div>'

    // Kategori + Sıklık
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">KATEGORİ</div><select class="fi" id="odm-f-cat" style="border-radius:8px" onchange="_onOdmCatChange()">'
    + Object.entries(ODM_CATS).map(([k,v]) => `<option value="${k}"${o&&o.cat===k?' selected':''}>${v.ic} ${v.l}</option>`).join('')
    + '</select></div>'
    + '<div class="fr"><div class="fl">SIKLIK</div><select class="fi" id="odm-f-freq" style="border-radius:8px">'
    + Object.entries(ODM_FREQ).map(([k,v]) => `<option value="${k}"${o&&o.freq===k?' selected':''}>${v}</option>`).join('')
    + '</select></div>'
    + '</div>'

    // Tutar + Para birimi + Son Tarih
    + '<div style="display:grid;grid-template-columns:1fr 90px 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">TUTAR</div>'
    + '<input class="fi" type="number" id="odm-f-amount" placeholder="0.00" min="0" step="0.01" style="border-radius:8px" value="' + (o?o.amount||'':'') + '"></div>'
    // Özellik 5: Para birimi
    + '<div class="fr"><div class="fl">PARA</div><select class="fi" id="odm-f-currency" style="border-radius:8px">'
    + ['TRY','USD','EUR','GBP'].map(c => `<option value="${c}"${o&&o.currency===c?' selected':''}>${c}</option>`).join('')
    + '</select></div>'
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
    + '<span id="odm-f-alarm-val" style="font-size:13px;font-weight:600;color:var(--ac);min-width:24px;text-align:center">' + (o?o.alarmDays||3:3) + '</span>'
    + '<span style="font-size:12px;color:var(--t3)">gün</span>'
    + '</div></div>'
    + '</div>'

    // Özellik 6: IBAN + Banka bilgisi
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">BANKA</div><input class="fi" id="odm-f-bank-name" placeholder="Garanti, Akbank…" value="' + (o?o.bankName||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">IBAN</div><input class="fi" id="odm-f-iban" placeholder="TR00 0000 0000 0000 0000 0000 00" value="' + (o?o.iban||'':'') + '" style="border-radius:8px"></div>'
    + '</div>'

    // Not (Özellik 10: Ödeme notu)
    + '<div class="fr"><div class="fl">NOT / GEÇMIŞ</div>'
    + '<textarea class="fi" id="odm-f-note" rows="2" style="resize:none;border-radius:8px" placeholder="Açıklama, hatırlatma…">' + (o?o.note||'':'') + '</textarea></div>'

    // KREDİ KARTI ek alanlar
    + '<div id="odm-kredi-extra" style="display:' + (o&&o.cat==='kredi_k'?'flex':'none') + ';flex-direction:column;gap:10px;padding:12px;background:rgba(99,102,241,.05);border-radius:9px;border:1px solid rgba(99,102,241,.2)">'
    + '<div style="font-size:11px;font-weight:600;color:#4F46E5;margin-bottom:2px">💳 Kredi Kartı Detayları</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">BANKA / KART ADI</div><input class="fi" id="odm-f-banka" placeholder="Garanti…" value="' + (o?o.banka||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">SON 4 HANE</div><input class="fi" id="odm-f-son4" placeholder="1234" maxlength="4" value="' + (o?o.sonDortHane||'':'') + '" style="border-radius:8px"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">LİMİT (₺)</div><input class="fi" type="number" id="odm-f-limit" value="' + (o?o.limit||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">KULLANILAN (₺)</div><input class="fi" type="number" id="odm-f-bakiye" value="' + (o?o.bakiye||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">MİN. ÖDEME (₺)</div><input class="fi" type="number" id="odm-f-min" value="' + (o?o.minOdeme||'':'') + '" style="border-radius:8px"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">HESAP KESİM GÜNÜ</div><input class="fi" type="number" id="odm-f-kesim" min="1" max="31" placeholder="15" value="' + (o?o.kesiimTarihi||'':'') + '" style="border-radius:8px"></div>'
    + '<div class="fr"><div class="fl">ÖDEME GÜNÜ</div><input class="fi" type="number" id="odm-f-odgun" min="1" max="31" placeholder="28" value="' + (o?o.odemeGunu||'':'') + '" style="border-radius:8px"></div>'
    + '</div>'
    + '</div>'

    // ABONELİK ek alanlar
    + '<div id="odm-abone-extra" style="display:' + (o&&o.cat==='abonelik'?'flex':'none') + ';flex-direction:column;gap:10px;padding:12px;background:rgba(16,185,129,.05);border-radius:9px;border:1px solid rgba(16,185,129,.2)">'
    + '<div style="font-size:11px;font-weight:600;color:#065F46;margin-bottom:2px">🔄 Abonelik Detayları</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="fr"><div class="fl">ABONELİK TİPİ</div><select class="fi" id="odm-f-abtype" style="border-radius:8px">'
    + Object.entries(ODM_ABONE_TYPES).map(([k,v]) => `<option value="${k}"${o&&o.abonelikTipi===k?' selected':''}>${v.ic} ${v.l}</option>`).join('')
    + '</select></div>'
    // Özellik 9: Sözleşme bitiş tarihi
    + '<div class="fr"><div class="fl">SÖZLEŞME BİTİŞ</div><input type="date" class="fi" id="odm-f-sozbitis" value="' + (o?o.sozlesmeBitis||'':'') + '" style="border-radius:8px"></div>'
    + '</div>'
    + '<div class="fr"><div class="fl">SÖZLEŞME DÖKÜMAN</div>'
    + '<div style="display:flex;gap:8px;align-items:center">'
    + (o&&o.sozlesme ? '<span style="font-size:11px;color:var(--grt)">✅ Yüklendi — <button onclick="viewOdmSozlesme('+o.id+')" style="background:none;border:none;color:var(--ac);cursor:pointer;font-size:11px">Görüntüle</button></span>' : '')
    + '<button type="button" onclick="uploadOdmSozlesme()" class="btn btns" style="font-size:11px;border-radius:7px;padding:4px 10px">📄 Döküman Yükle</button>'
    + '</div>'
    + '<input type="hidden" id="odm-f-sozlesme-data"><input type="hidden" id="odm-f-sozlesme-name">'
    + '</div>'
    + '</div>'

    // Ödendi toggle
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--s2);border-radius:9px">'
    + '<span style="font-size:13px;font-weight:500">Ödendi olarak işaretle</span>'
    + '<label class="psw"><input type="checkbox" id="odm-f-paid"' + (o&&o.paid?' checked':'') + '><span class="psl"></span></label>'
    + '</div>'

    + '<input type="hidden" id="odm-f-eid" value="' + (o?o.id:'') + '">'
    + '</div>'

    + '<div style="padding:12px 20px 14px;border-top:1px solid var(--b);display:flex;justify-content:space-between;background:var(--s2)">'
    + '<button class="btn" onclick="document.getElementById(\'mo-odm-v10\').remove()">İptal</button>'
    // Özellik 6: PDF/talimat indirme
    + (o ? '<button class="btn btns" onclick="exportOdmPaymentPDF('+o.id+')" style="font-size:11px">📄 Ödeme Talimatı</button>' : '<span></span>')
    + '<button class="btn btnp" onclick="saveOdm()" style="padding:9px 22px;border-radius:9px">Kaydet</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(mo);
  mo.addEventListener('click', e => { if (e.target === mo) mo.remove(); });
  setTimeout(() => { mo.classList.add('open'); _go('odm-f-name')?.focus(); }, 10);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — MODAL YARDIMCI FONKSİYONLAR
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
    if (file.size > 10*1024*1024) { window.toast?.('Dosya 10MB den kucuk olmali', 'err'); return; }
    const r = new FileReader();
    r.onload = e => {
      const d = _go('odm-f-sozlesme-data'); if (d) d.value = e.target.result;
      const n = _go('odm-f-sozlesme-name'); if (n) n.value = file.name;
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
    + (o.sozlesme.startsWith('data:image') ? `<img src="${o.sozlesme}" style="max-width:100%">` : `<iframe src="${o.sozlesme}" style="width:100vw;height:100vh;border:none"></iframe>`)
    + '</body></html>');
}

// Özellik 6: Ödeme talimatı PDF
function exportOdmPaymentPDF(id) {
  const o = (window.loadOdm ? loadOdm() : []).find(x => x.id === id);
  if (!o) return;
  const users = window.loadUsers ? loadUsers() : [];
  const assigned = users.find(u => u.id === o.assignedTo);
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Ödeme Talimatı</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px 14px;border-bottom:1px solid #eee}td:first-child{font-weight:600;color:#666;width:160px}.footer{margin-top:40px;font-size:12px;color:#999}</style>
  </head><body>
  <h1>Ödeme Talimatı</h1><p style="color:#888;font-size:13px">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
  <table>
  <tr><td>Ödeme Adı</td><td>${o.name}</td></tr>
  <tr><td>Kategori</td><td>${ODM_CATS[o.cat]?.l||o.cat}</td></tr>
  <tr><td>Tutar</td><td>₺${(parseFloat(o.amount)||0).toLocaleString('tr-TR',{minimumFractionDigits:2})} ${o.currency||'TRY'}</td></tr>
  <tr><td>Son Ödeme</td><td>${o.due||'—'}</td></tr>
  <tr><td>Sorumlu</td><td>${assigned?.name||'—'}</td></tr>
  <tr><td>Banka</td><td>${o.bankName||o.banka||'—'}</td></tr>
  <tr><td>IBAN</td><td>${o.iban||'—'}</td></tr>
  <tr><td>Not</td><td>${o.note||'—'}</td></tr>
  </table>
  <div class="footer">Duay Global Trade · Operasyon Platformu</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — CRUD
// ════════════════════════════════════════════════════════════════

function saveOdm() {
  const name = (_go('odm-f-name')?.value || '').trim();
  if (!name) { window.toast?.('Ödeme adı zorunludur', 'err'); return; }

  const eid  = parseInt(_go('odm-f-eid')?.value || '0');
  const d    = window.loadOdm ? loadOdm() : [];
  const cat  = _go('odm-f-cat')?.value || 'diger';

  const entry = {
    name,
    cat,
    freq:       _go('odm-f-freq')?.value     || 'aylik',
    amount:     parseFloat(_go('odm-f-amount')?.value || '0') || 0,
    currency:   _go('odm-f-currency')?.value || 'TRY',
    due:        _go('odm-f-due')?.value      || '',
    note:       _go('odm-f-note')?.value     || '',
    paid:       !!_go('odm-f-paid')?.checked,
    alarmDays:  parseInt(_go('odm-f-alarm')?.value || '3'),
    assignedTo: parseInt(_go('odm-f-assigned')?.value || '0') || null,
    // Özellik 6: Banka / IBAN
    bankName:   _go('odm-f-bank-name')?.value || '',
    iban:       _go('odm-f-iban')?.value      || '',
    ts:         _nowTso(),
    updatedBy:  _CUo()?.id,
    // Kredi kartı alanları
    ...(cat === 'kredi_k' ? {
      banka:        _go('odm-f-banka')?.value   || '',
      sonDortHane:  _go('odm-f-son4')?.value    || '',
      limit:        parseFloat(_go('odm-f-limit')?.value  || '0') || 0,
      bakiye:       parseFloat(_go('odm-f-bakiye')?.value || '0') || 0,
      minOdeme:     parseFloat(_go('odm-f-min')?.value    || '0') || 0,
      kesiimTarihi: _go('odm-f-kesim')?.value   || '',
      odemeGunu:    _go('odm-f-odgun')?.value   || '',
    } : {}),
    // Abonelik alanları
    ...(cat === 'abonelik' ? {
      abonelikTipi:  _go('odm-f-abtype')?.value   || 'diger',
      sozlesmeBitis: _go('odm-f-sozbitis')?.value || '',
      ...(_go('odm-f-sozlesme-data')?.value ? {
        sozlesme:    _go('odm-f-sozlesme-data')?.value,
        sozlesmeName:_go('odm-f-sozlesme-name')?.value,
      } : {}),
    } : {}),
  };

  // Özellik 4: Büyük ödeme onay akışı
  if (!_isAdminO() && entry.amount > 10000 && !eid) {
    if (!confirm(`₺${entry.amount.toLocaleString('tr-TR')} tutarındaki ödeme admin onayına gönderilecek. Devam edilsin mi?`)) return;
    entry.pendingApproval = true;
  }

  if (eid) {
    const o = d.find(x => x.id === eid);
    if (o) {
      if (!o.paid && entry.paid) { entry.paidTs = _nowTso(); entry.paidBy = _CUo()?.id; }
      // Özellik 10: Geçmiş log
      if (!o.history) o.history = [];
      o.history.push({ ts: _nowTso(), by: _CUo()?.id, note: 'Güncellendi' });
      Object.assign(o, entry);
    }
  } else {
    d.unshift({ id: Date.now(), ...entry, createdBy: _CUo()?.id, history: [] });
  }

  window.storeOdm ? storeOdm(d) : null;
  _go('mo-odm-v10')?.remove();
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
  if (!o.history) o.history = [];
  o.history.push({ ts: o.paidTs, by: o.paidBy, note: 'Ödendi işaretlendi' });
  window.storeOdm ? storeOdm(d) : null;
  renderOdemeler();
  localStorage.removeItem('odm_alarm_late_' + id);
  window.toast?.('✅ Ödendi olarak işaretlendi', 'ok');
  setTimeout(() => {
    window.toast?.('📎 Dekontu yüklemeyi unutmayın', 'warn');
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
// BÖLÜM 8 — DEKONT
// ════════════════════════════════════════════════════════════════

function uploadOdmReceipt(id) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*,.pdf';
  inp.onchange = function() {
    const file = this.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { window.toast?.('Dosya 5MB den kucuk olmali', 'err'); return; }
    const r = new FileReader();
    r.onload = function(e) {
      const d = window.loadOdm ? loadOdm() : [];
      const o = d.find(x => x.id === id); if (!o) return;
      o.receipt     = e.target.result;
      o.receiptName = file.name;
      o.receiptTs   = _nowTso();
      window.storeOdm ? storeOdm(d) : null;
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
    + (o.receipt.startsWith('data:image') ? `<img src="${o.receipt}" style="max-width:100%;max-height:100vh;object-fit:contain">` : `<iframe src="${o.receipt}" style="width:100vw;height:100vh;border:none"></iframe>`)
    + '</body></html>');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — TOPLU İŞLEM (Özellik 8)
// ════════════════════════════════════════════════════════════════

let _odmBulkMode     = false;
let _odmBulkSelected = new Set();

function toggleOdmBulkMode() {
  _odmBulkMode = !_odmBulkMode;
  _odmBulkSelected.clear();
  const bar = _go('odm-bulk-bar');
  const btn = _go('odm-bulk-btn');
  if (bar) bar.style.display = _odmBulkMode ? 'flex' : 'none';
  if (btn) btn.textContent = _odmBulkMode ? 'Toplu Mod Kapat' : 'Toplu Seç';
  renderOdemeler();
}

function onOdmBulkCheck(id, checked) {
  if (checked) _odmBulkSelected.add(id);
  else _odmBulkSelected.delete(id);
  _sto('odm-bulk-count', _odmBulkSelected.size + ' seçildi');
}

function bulkMarkOdmPaid() {
  if (!_odmBulkSelected.size) { window.toast?.('Hiç ödeme seçilmedi', 'warn'); return; }
  if (!confirm(_odmBulkSelected.size + ' ödeme ödendi işaretlensin mi?')) return;
  const d = window.loadOdm ? loadOdm() : [];
  _odmBulkSelected.forEach(id => {
    const o = d.find(x => x.id === id);
    if (o) { o.paid = true; o.paidTs = _nowTso(); o.paidBy = _CUo()?.id; }
  });
  window.storeOdm ? storeOdm(d) : null;
  _odmBulkSelected.clear();
  _odmBulkMode = false;
  const bar = _go('odm-bulk-bar');
  if (bar) bar.style.display = 'none';
  renderOdemeler();
  window.toast?.('✅ Toplu ödeme işaretlendi', 'ok');
}

function cancelOdmBulk() {
  _odmBulkMode = false;
  _odmBulkSelected.clear();
  const bar = _go('odm-bulk-bar');
  if (bar) bar.style.display = 'none';
  renderOdemeler();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 10 — EXCEL İMPORT / EXPORT
// ════════════════════════════════════════════════════════════════

function exportOdmXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const items = window.loadOdm ? loadOdm() : [];
  const users = window.loadUsers ? loadUsers() : [];

  const rows = [['ID','Ödeme Adı','Kategori','Sıklık','Tutar','Para','Son Tarih','Durum','Sorumlu','Banka','IBAN','Alarm (gün)','Not','Ödeme Tarihi','Dekont']];
  items.forEach(o => {
    const cat   = ODM_CATS[o.cat]?.l || o.cat;
    const freq  = ODM_FREQ[o.freq]   || o.freq;
    const user  = users.find(u => u.id === o.assignedTo);
    const today = _todayStr();
    const status = o.paid ? 'Ödendi' : (o.due && o.due < today ? 'Gecikti' : 'Bekliyor');
    rows.push([o.id, o.name, cat, freq, parseFloat(o.amount)||0, o.currency||'TRY', o.due||'', status, user?.name||'—', o.bankName||o.banka||'', o.iban||'', o.alarmDays||3, o.note||'', o.paidTs||'', o.receipt?'Var':'Yok']);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [8,24,14,12,12,8,12,10,16,16,26,12,24,18,8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Rutin Ödemeler');
  XLSX.writeFile(wb, 'rutin-odemeler-' + _todayStr() + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
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
      const header  = rows[0].map(h => String(h||'').toLowerCase().trim());
      const col     = key => header.findIndex(h => h.includes(key));
      const nameCol = col('ad') > -1 ? col('ad') : col('name');
      const catCol  = col('kategori') > -1 ? col('kategori') : col('cat');
      const amtCol  = col('tutar') > -1 ? col('tutar') : col('amount');
      const dueCol  = col('tarih') > -1 ? col('tarih') : col('due');
      const freqCol = col('sıklık') > -1 ? col('sıklık') : col('freq');
      const noteCol = col('not') > -1 ? col('not') : col('note');
      if (nameCol < 0) { window.toast?.('Başlık satırında "Ödeme Adı" kolonu bulunamadı', 'err'); return; }
      const catKeys = Object.keys(ODM_CATS);
      const freqKeys = Object.keys(ODM_FREQ);
      const existing = window.loadOdm ? loadOdm() : [];
      let added = 0;
      rows.slice(1).forEach(row => {
        if (!row || !row[nameCol]) return;
        const name = String(row[nameCol]||'').trim(); if (!name) return;
        let cat = 'diger';
        if (catCol > -1) { const cv = String(row[catCol]||'').toLowerCase(); const f = catKeys.find(k => cv.includes(k) || cv.includes(ODM_CATS[k].l.toLowerCase())); if (f) cat = f; }
        let freq = 'aylik';
        if (freqCol > -1) { const fv = String(row[freqCol]||'').toLowerCase(); const f = freqKeys.find(k => fv.includes(k) || fv.includes(ODM_FREQ[k].toLowerCase())); if (f) freq = f; }
        let due = '';
        if (dueCol > -1 && row[dueCol]) { const dv = row[dueCol]; if (typeof dv === 'number') { const d = new Date(Math.round((dv-25569)*86400*1000)); due = d.toISOString().slice(0,10); } else { const p = new Date(String(dv)); if (!isNaN(p)) due = p.toISOString().slice(0,10); } }
        existing.unshift({ id: Date.now()+added, name, cat, freq, amount: amtCol > -1 ? (parseFloat(row[amtCol])||0) : 0, due, note: noteCol > -1 ? (row[noteCol]||'') : '', paid: false, alarmDays: 3, ts: _nowTso(), createdBy: _CUo()?.id });
        added++;
      });
      window.storeOdm ? storeOdm(existing) : null;
      renderOdemeler();
      window.toast?.(`${added} ödeme içe aktarıldı ✓`, 'ok');
    } catch (err) {
      window.toast?.('Import hatası: ' + err.message, 'err');
    }
    inp.value = '';
  };
  r.readAsBinaryString(file);
}

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
  window.Odemeler           = Odemeler;
  window.renderOdemeler     = renderOdemeler;
  window.openOdmModal       = openOdmModal;
  window.saveOdm            = saveOdm;
  window.delOdm             = delOdm;
  window.toggleOdmPaid      = toggleOdmPaid;
  window.markOdmPaid        = markOdmPaid;
  window.exportOdmXlsx      = exportOdmXlsx;
  window.processOdmImport   = processOdmImport;
  window.importOdmFile      = importOdmFile;
  window.uploadOdmReceipt   = uploadOdmReceipt;
  window.viewOdmReceipt     = viewOdmReceipt;
  window.checkOdmAlarms     = checkOdmAlarms;
  window.setOdmTab          = setOdmTab;
  window.toggleOdmBulkMode  = toggleOdmBulkMode;
  window.bulkMarkOdmPaid    = bulkMarkOdmPaid;
  window.cancelOdmBulk      = cancelOdmBulk;
  window.onOdmBulkCheck     = onOdmBulkCheck;
  window.exportOdmPaymentPDF= exportOdmPaymentPDF;
  window.viewOdmSozlesme    = viewOdmSozlesme;
  window.uploadOdmSozlesme  = uploadOdmSozlesme;
  window._onOdmCatChange    = _onOdmCatChange;
  window.ODM_CATS           = ODM_CATS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOdmAlarmTimer);
  } else {
    setTimeout(startOdmAlarmTimer, 2000);
  }
}
